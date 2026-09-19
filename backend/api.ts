import { Elysia, t } from "elysia";
import { encodeFunctionData, getAddress, isAddress, type Address, type Hex } from "viem";
import { CHAIN_ID, inspectToken } from "./chain";
import { BinanceWeb3Client, attachRwaContext, binanceHealth } from "./binance";
import { ErrorCodes, HoroiError, httpStatusFor } from "./errors";
import { SUITE_HASH, SUITE_ID, SUITE_VERSION, computeReportId } from "./engine";
import {
  finalizeRun,
  getRun,
  getSimulation,
  insertRun,
  listRuns,
  openDb,
  recoverInterruptedRuns,
  updateRunProgress,
  upsertSimulation,
} from "./db";
import { publishPayload, runConformance } from "./runner";

const db = openDb(process.env.DATABASE_PATH ?? "./horoi.db");
recoverInterruptedRuns(db);

const registryAddress = process.env.REGISTRY_ADDRESS ? getAddress(process.env.REGISTRY_ADDRESS) : null;
const maxConcurrentRuns = Math.max(1, Number(process.env.MAX_CONCURRENT_RUNS ?? 2));
const activeRuns = new Set<string>();

const registryAbi = [{
  type: "function",
  name: "publish",
  stateMutability: "nonpayable",
  inputs: [
    { name: "asset", type: "address" },
    { name: "target", type: "address" },
    { name: "suiteHash", type: "bytes32" },
    { name: "resultHash", type: "bytes32" },
    { name: "blockNumber", type: "uint64" },
    { name: "status", type: "uint8" },
  ],
  outputs: [{ name: "reportId", type: "bytes32" }],
}] as const;

type HoroiPublishReport = {
  status: string;
  chainId: number;
  asset: string;
  target: string;
  blockNumber: number;
  resultHash: string;
  suiteHash: string;
};

const asAddress = (value: string): Address => {
  if (!isAddress(value, { strict: false })) {
    throw new HoroiError(ErrorCodes.ADDRESS_INVALID, `invalid address: ${value}`);
  }
  return getAddress(value);
};

const bad = (error: unknown) => {
  if (error instanceof HoroiError) {
    return new Response(JSON.stringify({ error: error.code, message: error.message }), {
      status: httpStatusFor(error.code),
      headers: { "content-type": "application/json" },
    });
  }
  return new Response(
    JSON.stringify({ error: ErrorCodes.INTERNAL_ERROR, message: "internal error" }),
    { status: 500, headers: { "content-type": "application/json" } },
  );
};

function reportIdFor(report: HoroiPublishReport): Hex {
  return computeReportId({
    chainId: report.chainId,
    asset: asAddress(report.asset),
    target: asAddress(report.target),
    suiteHash: report.suiteHash as Hex,
    resultHash: report.resultHash as Hex,
    blockNumber: report.blockNumber,
  });
}

function statusForRegistry(status: string): 1 | 2 | 3 {
  if (status === "PASS") return 1;
  if (status === "FAIL") return 2;
  if (status === "INCOMPLETE") return 3;
  throw new HoroiError(ErrorCodes.INPUT_INVALID, "ERROR reports cannot be published");
}

function publicationCall(report: HoroiPublishReport, from: Address, registry: Address) {
  const args = {
    asset: asAddress(report.asset),
    target: asAddress(report.target),
    suiteHash: report.suiteHash as Hex,
    resultHash: report.resultHash as Hex,
    blockNumber: BigInt(report.blockNumber),
    status: statusForRegistry(report.status),
  } as const;
  const data = encodeFunctionData({ abi: registryAbi, functionName: "publish", args: [
    args.asset,
    args.target,
    args.suiteHash,
    args.resultHash,
    args.blockNumber,
    args.status,
  ] });
  return { from, to: registry, value: "0", data };
}

async function executeRun(args: {
  runId: string;
  asset: Address;
  target: Address | null;
  profile: "custody" | "erc4626" | "custom";
  blockNumber: bigint;
  holder?: Address;
  updater?: Address;
}) {
  activeRuns.add(args.runId);
  try {
    const result = await runConformance({
      runId: args.runId,
      asset: args.asset,
      target: args.target,
      profile: args.profile,
      blockNumber: args.blockNumber,
      holder: args.holder,
      updater: args.updater,
      onProgress: (completed, total) => updateRunProgress(db, args.runId, completed, "RUNNING"),
    });
    const context = await new BinanceWeb3Client().getRwaContext(args.asset);
    const report = attachRwaContext(result.report, context);
    finalizeRun(db, args.runId, report.status, JSON.stringify(report));
  } catch (error) {
    const code = error instanceof HoroiError ? error.code : ErrorCodes.INTERNAL_ERROR;
    finalizeRun(db, args.runId, "ERROR", null, code);
  } finally {
    activeRuns.delete(args.runId);
  }
}

export const app = new Elysia({ prefix: "/api" })
  .get("/health", () => ({
    ok: true,
    chainId: CHAIN_ID,
    suite: SUITE_ID,
    version: SUITE_VERSION,
    binanceWeb3: binanceHealth(),
    activeRuns: activeRuns.size,
    maxConcurrentRuns,
  }))
  .get(
    "/assets/search",
    async ({ query, set }) => {
      try {
        if (!query.q.trim() || query.q.length > 128) throw new HoroiError(ErrorCodes.INPUT_INVALID, "q must be 1-128 characters");
        const client = new BinanceWeb3Client();
        if (!client.configured) throw new HoroiError(ErrorCodes.BINANCE_API_NOT_CONFIGURED, "Binance Web3 credentials are not configured");
        const result = await client.searchRwa(query.q);
        return { query: query.q, source: "Binance Web3 RWA Data", calls: [result.call], items: result.items };
      } catch (error) {
        const response = bad(error);
        set.status = response.status;
        return response as unknown as Response;
      }
    },
    { query: t.Object({ q: t.String() }) },
  )
  .get(
    "/assets/:asset/context",
    async ({ params, set }) => {
      try {
        const asset = asAddress(params.asset);
        const context = await new BinanceWeb3Client().getRwaContext(asset);
        return {
          asset,
          source: "Binance Web3 RWA Data",
          context,
          note: "Context only. It does not determine Horoi conformance status.",
        };
      } catch (error) {
        const response = bad(error);
        set.status = response.status;
        return response as unknown as Response;
      }
    },
    { params: t.Object({ asset: t.String() }) },
  )
  .post(
    "/assets/inspect",
    async ({ body, set }) => {
      try {
        const asset = asAddress(body.asset);
        const token = await inspectToken(asset, {
          blockNumber: body.blockNumber === null || body.blockNumber === undefined
            ? undefined
            : BigInt(body.blockNumber),
        });
        return {
          asset,
          chainId: token.chainId,
          name: token.name,
          symbol: token.symbol,
          decimals: token.decimals,
          interfaces: token.interfaces,
          supportedInterfaces: Object.entries(token.interfaces)
            .filter(([, supported]) => supported)
            .map(([name]) => name),
          uiMultiplier: token.uiMultiplier.toString(),
          newUIMultiplier: token.newUIMultiplier.toString(),
          effectiveAt: token.effectiveAt.toString(),
          blockNumber: token.blockNumber.toString(),
          blockHash: token.blockHash,
          blockTimestamp: token.blockTimestamp.toString(),
        };
      } catch (error) {
        const response = bad(error);
        set.status = response.status;
        return response as unknown as Response;
      }
    },
    {
      body: t.Object({
        asset: t.String(),
        blockNumber: t.Optional(t.Nullable(t.Integer())),
      }),
    },
  )
  .post(
    "/runs",
    async ({ body, set }) => {
      try {
        if (activeRuns.size >= maxConcurrentRuns) {
          throw new HoroiError(
            ErrorCodes.RUN_BUSY,
            `Horoi is already running ${activeRuns.size}/${maxConcurrentRuns} jobs`,
          );
        }

        const asset = asAddress(body.asset);
        const target = body.target ? asAddress(body.target) : null;
        const holder = body.holder ? asAddress(body.holder) : undefined;
        const updater = body.updater ? asAddress(body.updater) : undefined;
        const profile = body.profile as "custody" | "erc4626" | "custom";
        if (!( ["custody", "erc4626", "custom"] as const).includes(profile)) {
          throw new HoroiError(ErrorCodes.ADAPTER_INVALID, `unsupported profile: ${body.profile}`);
        }
        if (profile === "custom") {
          throw new HoroiError(
            ErrorCodes.ADAPTER_INVALID,
            "custom adapters are supported through the CLI/programmatic API, not the public HTTP endpoint",
          );
        }

        const inspected = await inspectToken(asset, {
          blockNumber: body.blockNumber === null || body.blockNumber === undefined
            ? undefined
            : BigInt(body.blockNumber),
        });
        const runId = crypto.randomUUID();
        insertRun(db, {
          id: runId,
          asset,
          target,
          profile,
          chain_id: CHAIN_ID,
          block_number: Number(inspected.blockNumber),
          block_hash: inspected.blockHash,
          status: "RUNNING",
          started_at: Date.now(),
          progress_total: 8,
        });

        void executeRun({
          runId,
          asset,
          target,
          profile,
          blockNumber: inspected.blockNumber,
          holder,
          updater,
        });

        set.status = 202;
        return { runId, status: "RUNNING", blockNumber: inspected.blockNumber.toString() };
      } catch (error) {
        const response = bad(error);
        set.status = response.status;
        return response as unknown as Response;
      }
    },
    {
      body: t.Object({
        asset: t.String(),
        target: t.Nullable(t.String()),
        profile: t.String(),
        blockNumber: t.Optional(t.Nullable(t.Integer())),
        holder: t.Optional(t.Nullable(t.String())),
        updater: t.Optional(t.Nullable(t.String())),
      }),
    },
  )
  .get("/runs/:id", ({ params }) => {
    const row = getRun(db, params.id);
    if (!row) return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
    let report: unknown = null;
    if (row.report_json) {
      try {
        report = JSON.parse(row.report_json);
      } catch {
        report = null;
      }
    }
    return {
      runId: row.id,
      status: row.status,
      progress: { completed: row.progress_completed, total: row.progress_total },
      asset: row.asset,
      target: row.target,
      profile: row.profile,
      blockNumber: row.block_number,
      errorCode: row.error_code,
      report,
    };
  })
  .get("/reports/:id", ({ params }) => {
    const row = getRun(db, params.id);
    if (!row?.report_json) {
      return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
    }
    return JSON.parse(row.report_json);
  })
  .get("/reports", ({ query }) => {
    const rows = listRuns(db, {
      asset: query.asset,
      target: query.target,
      status: query.status,
      limit: query.limit ? Math.min(100, Math.max(1, Number(query.limit))) : 50,
    });
    return {
      items: rows.map((row) => {
        let resultHash: string | undefined;
        if (row.report_json) {
          try {
            resultHash = (JSON.parse(row.report_json) as { resultHash?: string }).resultHash;
          } catch {
            resultHash = undefined;
          }
        }
        return {
          runId: row.id,
          asset: row.asset,
          target: row.target,
          profile: row.profile,
          status: row.status,
          blockNumber: row.block_number,
          startedAt: row.started_at,
          resultHash,
        };
      }),
    };
  })
  .get("/reports/:id/publish", ({ params }) => {
    const row = getRun(db, params.id);
    if (!row?.report_json) {
      return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
    }
    const report = JSON.parse(row.report_json) as HoroiPublishReport;
    if (!["PASS", "FAIL", "INCOMPLETE"].includes(report.status)) {
      return new Response(JSON.stringify({ error: "report is not publishable" }), { status: 409 });
    }
    const reportId = reportIdFor(report);
    const savedSimulation = getSimulation(db, reportId);
    return {
      registry: registryAddress,
      args: publishPayload(report as never, registryAddress).args,
      reportId,
      simulation: savedSimulation ? JSON.parse(savedSimulation.result_json) : null,
      note: "This endpoint never broadcasts. Sign from a wallet holding PUBLISHER_ROLE.",
    };
  })
  .post(
    "/reports/:id/simulate-publication",
    async ({ params, body, set }) => {
      try {
        if (!registryAddress) throw new HoroiError(ErrorCodes.REGISTRY_NOT_CONFIGURED, "REGISTRY_ADDRESS is not configured");
        const row = getRun(db, params.id);
        if (!row?.report_json) throw new HoroiError(ErrorCodes.INPUT_INVALID, "report not found or not terminal");
        const report = JSON.parse(row.report_json) as HoroiPublishReport;
        const tx = publicationCall(report, asAddress(body.from), registryAddress);
        const simulation = await new BinanceWeb3Client().simulatePublication(tx);
        const reportId = reportIdFor(report);
        upsertSimulation(db, {
          report_id: reportId,
          payload_hash: simulation.payloadHash,
          payload_json: JSON.stringify(tx),
          result_json: JSON.stringify(simulation),
          captured_at: Date.now(),
        });
        if (!simulation.attempted) throw new HoroiError(ErrorCodes.BINANCE_API_NOT_CONFIGURED, "Binance Transaction API is not configured");
        set.status = simulation.success ? 200 : 424;
        return { reportId, transaction: tx, simulation };
      } catch (error) {
        const response = bad(error);
        set.status = response.status;
        return response as unknown as Response;
      }
    },
    { body: t.Object({ from: t.String() }), params: t.Object({ id: t.String() }) },
  );

export type App = typeof app;

export function startServer(port = Number(process.env.PORT ?? 3000)) {
  app.listen(port);
  console.log(`Horoi API http://127.0.0.1:${port}`);
  return app;
}

if (import.meta.main) startServer();

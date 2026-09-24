import { Elysia, t } from "elysia";
import { getAddress, isAddress, type Address, type Hex } from "viem";
import { CHAIN_ID, inspectToken } from "./chain";
import { BinanceWeb3Client, attachRwaContext, binanceHealth, publicationPayloadHash, type PublicationTransaction } from "./binance";
import { ErrorCodes, HoroiError, httpStatusFor } from "./errors";
import { SUITE_HASH, SUITE_ID, SUITE_VERSION, computeReportId } from "./engine";
import {
  finalizeRunAsync,
  getRunAsync,
  getSimulationAsync,
  insertRunAsync,
  listRunsAsync,
  openAppDb,
  recoverInterruptedRunsAsync,
  updateRunProgressAsync,
  upsertSimulationAsync,
  type AppDatabase,
} from "./db";
import { publishPayload, runConformance } from "./runner";
import { buildPublicationTransaction } from "./publication";
import { runConformanceInSandbox } from "./sandbox";

const dbReady = openAppDb().then(async (db) => {
  await recoverInterruptedRunsAsync(db);
  return db;
});

const getDb = (): Promise<AppDatabase> => dbReady;

const registryAddress = (() => {
  const configured = process.env.REGISTRY_ADDRESS?.trim();
  if (!configured) return null;
  return isAddress(configured, { strict: false }) ? getAddress(configured) : null;
})();
const maxConcurrentRuns = Math.max(1, Number(process.env.MAX_CONCURRENT_RUNS ?? 2));
const activeRuns = new Set<string>();

type HoroiPublishReport = {
  status: string;
  chainId: number;
  asset: string;
  target: string;
  profile: string;
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

function registryForSimulation(): Address {
  if (process.env.REGISTRY_ADDRESS && !registryAddress) {
    throw new HoroiError(ErrorCodes.ADDRESS_INVALID, "REGISTRY_ADDRESS is invalid");
  }
  if (!registryAddress) throw new HoroiError(ErrorCodes.REGISTRY_NOT_CONFIGURED, "REGISTRY_ADDRESS is not configured");
  return registryAddress;
}

function assertReportBinding(row: { id: string; asset: string; target: string | null; profile: string; chain_id: number }, report: HoroiPublishReport): void {
  if (report.chainId !== row.chain_id || report.asset.toLowerCase() !== row.asset.toLowerCase()
    || (report.target === "0x0000000000000000000000000000000000000000" ? null : report.target.toLowerCase()) !== row.target?.toLowerCase()
    || report.profile !== row.profile) {
    throw new HoroiError(ErrorCodes.PUBLICATION_MISMATCH, "report JSON does not match persisted run identity");
  }
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
  let db: AppDatabase | undefined;
  try {
    const activeDb = await getDb();
    db = activeDb;
    const runInput = {
      runId: args.runId,
      asset: args.asset,
      target: args.target,
      profile: args.profile,
      blockNumber: args.blockNumber,
      holder: args.holder,
      updater: args.updater,
      onProgress: (completed: number) => updateRunProgressAsync(activeDb, args.runId, completed, "RUNNING"),
    };
    const result = process.env.HOROI_SANDBOX_EXECUTION === "1"
      ? await runConformanceInSandbox({ ...runInput, profile: args.profile as "custody" | "erc4626" })
      : await runConformance({ ...runInput, onProgress: runInput.onProgress });
    const context = await new BinanceWeb3Client().getRwaContext(args.asset);
    const report = attachRwaContext(result.report, context);
    await finalizeRunAsync(activeDb, args.runId, report.status, JSON.stringify(report));
  } catch (error) {
    const code = error instanceof HoroiError ? error.code : ErrorCodes.INTERNAL_ERROR;
    if (!db) {
      db = await getDb().catch(() => undefined);
    }
    if (db) await finalizeRunAsync(db, args.runId, "ERROR", null, code);
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
        const db = await getDb();
        await insertRunAsync(db, {
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

        await executeRun({
          runId,
          asset,
          target,
          profile,
          blockNumber: inspected.blockNumber,
          holder,
          updater,
        });

        set.status = 200;
        const completed = await getRunAsync(db, runId);
        return { runId, status: completed?.status ?? "ERROR", blockNumber: inspected.blockNumber.toString() };
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
  .get("/runs/:id", async ({ params }) => {
    const db = await getDb();
    const row = await getRunAsync(db, params.id);
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
  .get("/reports/:id", async ({ params }) => {
    const db = await getDb();
    const row = await getRunAsync(db, params.id);
    if (!row?.report_json) {
      return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
    }
    return JSON.parse(row.report_json);
  })
  .get("/reports", async ({ query }) => {
    const db = await getDb();
    const rows = await listRunsAsync(db, {
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
  .get("/reports/:id/publish", async ({ params }) => {
    const db = await getDb();
    const row = await getRunAsync(db, params.id);
    if (!row?.report_json) {
      return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
    }
    const report = JSON.parse(row.report_json) as HoroiPublishReport;
    if (!["PASS", "FAIL", "INCOMPLETE"].includes(report.status)) {
      return new Response(JSON.stringify({ error: "report is not publishable" }), { status: 409 });
    }
    const reportId = reportIdFor(report);
    const savedSimulation = await getSimulationAsync(db, reportId);
    let simulation: unknown = null;
    let simulationStale = false;
    if (savedSimulation) {
      try {
        const savedPayload = JSON.parse(savedSimulation.payload_json) as PublicationTransaction;
        const currentRegistry = registryAddress;
        if (currentRegistry && publicationPayloadHash({ ...savedPayload, to: currentRegistry }) === savedSimulation.payload_hash) {
          simulation = JSON.parse(savedSimulation.result_json);
        } else {
          simulationStale = true;
        }
      } catch {
        simulationStale = true;
      }
    }
    return {
      registry: registryAddress,
      publicationStatus: registryAddress ? "READY_FOR_SIMULATION" : "BLOCKED_REGISTRY_NOT_DEPLOYED",
      args: publishPayload(report as never, registryAddress).args,
      reportId,
      simulation,
      simulationStale,
      publicationPayloadHash: savedSimulation?.payload_hash ?? null,
      note: "This endpoint never broadcasts. Sign from a wallet holding PUBLISHER_ROLE.",
    };
  })
  .post(
    "/reports/:id/simulate-publication",
    async ({ params, body, set }) => {
      try {
        const registry = registryForSimulation();
        const db = await getDb();
        const row = await getRunAsync(db, params.id);
        if (!row?.report_json) throw new HoroiError(ErrorCodes.INPUT_INVALID, "report not found or not terminal");
        const report = JSON.parse(row.report_json) as HoroiPublishReport;
        if (report.status === "ERROR") throw new HoroiError(ErrorCodes.INPUT_INVALID, "ERROR reports cannot be simulated");
        assertReportBinding(row, report);
        const tx = buildPublicationTransaction(report, body.from, registry);
        const previous = await getSimulationAsync(db, reportIdFor(report));
        const simulation = await new BinanceWeb3Client().simulatePublication(tx);
        const reportId = reportIdFor(report);
        await upsertSimulationAsync(db, {
          report_id: reportId,
          run_id: row.id,
          payload_hash: simulation.payloadHash,
          payload_json: JSON.stringify(tx),
          result_json: JSON.stringify(simulation),
          attempted: simulation.attempted ? 1 : 0,
          success: simulation.success ? 1 : 0,
          upstream_code: simulation.upstreamCode ?? null,
          latency_ms: simulation.latencyMs ?? null,
          evidence_hash: simulation.evidenceHash,
          error_code: simulation.errorCode ?? null,
          simulated_at: simulation.simulatedAt,
          captured_at: Date.now(),
        });
        if (!simulation.attempted) throw new HoroiError(ErrorCodes.BINANCE_API_NOT_CONFIGURED, "Binance Transaction API is not configured");
        set.status = simulation.success ? 200 : 424;
        return { reportId, transaction: tx, publicationPayloadHash: simulation.payloadHash, previousSimulationStale: Boolean(previous && previous.payload_hash !== simulation.payloadHash), simulation };
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

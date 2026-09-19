#!/usr/bin/env bun
import { getAddress, isAddress } from "viem";

const parseAddr = (v: string | undefined): `0x${string}` | null => {
  if (!v) return null;
  if (!isAddress(v, { strict: false })) return null;
  return getAddress(v);
};
import { inspectToken } from "./chain";
import { ErrorCodes } from "./errors";
import { runConformance, publishPayload } from "./runner";
import { openDb, getRun } from "./db";
import { computeReportId, SUITE_HASH } from "./engine";
import { BinanceWeb3Client, attachRwaContext } from "./binance";
import { isRwaContextSufficient } from "./rwa-context";

const usage = () => {
  console.log(`horoi discover <ticker-or-address> [--json]
horoi inspect <asset>
horoi context <asset> [--json]
horoi test <asset> <target|-> --profile erc4626|custody [--block <n>] [--holder <address>] [--updater <address>]
horoi report <runId> [--json]
horoi publish <runId>
`);
};

const exitCode = (status: string): number => {
  if (status === "PASS") return 0;
  if (status === "FAIL") return 1;
  if (status === "INCOMPLETE") return 2;
  return 3;
};

const argv = process.argv.slice(2);
const cmd = argv[0];
const rest = argv.slice(1);
const asJson = rest.includes("--json");
const profileIdx = rest.findIndex((a: string) => a === "--profile");
const blockIdx = rest.findIndex((a: string) => a === "--block");
const holderIdx = rest.findIndex((a: string) => a === "--holder");
const updaterIdx = rest.findIndex((a: string) => a === "--updater");
const profile = profileIdx >= 0 ? rest[profileIdx + 1] : undefined;
const blockNumber = blockIdx >= 0 ? rest[blockIdx + 1] : undefined;
const holderArg = holderIdx >= 0 ? rest[holderIdx + 1] : undefined;
const updaterArg = updaterIdx >= 0 ? rest[updaterIdx + 1] : undefined;
const skip = new Set<number>();
if (profileIdx >= 0) skip.add(profileIdx + 1);
if (blockIdx >= 0) skip.add(blockIdx + 1);
if (holderIdx >= 0) skip.add(holderIdx + 1);
if (updaterIdx >= 0) skip.add(updaterIdx + 1);
const positional = rest.filter((a: string, i: number) => !a.startsWith("--") && !skip.has(i));

async function main() {
  if (!cmd || cmd === "help" || cmd === "--help") {
    usage();
    process.exit(4);
  }

  if (cmd === "discover") {
    const query = positional[0];
    if (!query) process.exit(4);
    const client = new BinanceWeb3Client();
    if (!client.configured) {
      console.error(ErrorCodes.BINANCE_API_NOT_CONFIGURED);
      process.exit(5);
    }
    const result = await client.searchRwa(query);
    console.log(JSON.stringify({ query, source: "Binance Web3 RWA Data", ...result }, null, 2));
    process.exit(result.call.success ? 0 : 5);
  }

  if (cmd === "context") {
    const asset = positional[0];
    if (!asset) process.exit(4);
    const parsed = parseAddr(asset);
    if (!parsed) {
      console.error("ADDRESS_INVALID");
      process.exit(4);
    }
    const context = await new BinanceWeb3Client().getRwaContext(parsed);
    console.log(JSON.stringify(context, null, 2));
    process.exit(isRwaContextSufficient(context, parsed) ? 0 : 5);
  }

  if (cmd === "inspect") {
    const asset = parseAddr(positional[0]);
    if (!asset) {
      console.error("ADDRESS_INVALID");
      process.exit(4);
    }
    try {
      const token = await inspectToken(asset);
      const out = {
        asset,
        chainId: token.chainId,
        symbol: token.symbol,
        name: token.name,
        decimals: token.decimals,
        uiMultiplier: token.uiMultiplier.toString(),
        newUIMultiplier: token.newUIMultiplier.toString(),
        effectiveAt: token.effectiveAt.toString(),
        blockNumber: token.blockNumber.toString(),
        interfaces: token.interfaces,
      };
      if (asJson) {
        console.log(JSON.stringify(out, null, 2));
      } else {
        console.log(`asset ${out.asset}`);
        console.log(`chain ${out.chainId}`);
        console.log(`symbol ${out.symbol ?? "-"}`);
        console.log(`decimals ${out.decimals}`);
        console.log(`uiMultiplier ${out.uiMultiplier}`);
        console.log(`newUIMultiplier ${out.newUIMultiplier}`);
        console.log(`effectiveAt ${out.effectiveAt}`);
        console.log(`block ${out.blockNumber}`);
        console.log(
          `interfaces ${Object.entries(out.interfaces)
            .filter(([, v]) => v)
            .map(([k]) => k)
            .join(", ")}`,
        );
      }
      process.exit(0);
    } catch (err) {
      console.error(err instanceof Error ? err.message : ErrorCodes.INTERNAL_ERROR);
      process.exit(3);
    }
  }

  if (cmd === "test") {
    const asset = parseAddr(positional[0]);
    const targetRaw = positional[1];
    if (!asset || !targetRaw) {
      console.error("invalid usage");
      process.exit(4);
    }
    const target = targetRaw === "-" ? null : parseAddr(targetRaw);
    if (targetRaw !== "-" && !target) {
      console.error("ADDRESS_INVALID");
      process.exit(4);
    }
    const prof = (profile as "custody" | "erc4626") ?? "erc4626";
    if (!["custody", "erc4626"].includes(prof)) {
      console.error("ADAPTER_INVALID");
      process.exit(4);
    }
    const holder = holderArg ? parseAddr(holderArg) : undefined;
    if (holderArg && !holder) {
      console.error("ADDRESS_INVALID");
      process.exit(4);
    }
    const updater = updaterArg ? parseAddr(updaterArg) : undefined;
    if (updaterArg && !updater) {
      console.error("ADDRESS_INVALID");
      process.exit(4);
    }
    const runId = crypto.randomUUID();
    const result = await runConformance({
      runId,
      asset,
      target,
      profile: prof,
      blockNumber: blockNumber ? BigInt(blockNumber) : null,
      holder: holder ?? undefined,
      updater: updater ?? undefined,
    });
    const report = attachRwaContext(
      result.report,
      await new BinanceWeb3Client().getRwaContext(asset),
    );
    if (asJson) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      console.log(`run ${report.runId}`);
      console.log(`status ${report.status}`);
      console.log(`block ${report.blockNumber}`);
      console.log(`suite ${report.suiteId}@${report.suiteVersion}`);
      console.log(`hash ${report.resultHash}`);
      console.log("");
      console.log("ID Status Required Name");
      for (const c of report.checks) {
        console.log(`${c.id} ${c.status} ${c.required} ${c.name}`);
      }
    }
    process.exit(exitCode(report.status));
  }

  if (cmd === "report") {
    const runId = positional[0];
    if (!runId) process.exit(4);
    const db = openDb(process.env.DATABASE_PATH ?? "./horoi.db");
    const row = getRun(db, runId);
    if (!row?.report_json) {
      console.error("not found");
      process.exit(3);
    }
    console.log(row.report_json);
    process.exit(0);
  }

  if (cmd === "publish") {
    const runId = positional[0];
    if (!runId) process.exit(4);
    const db = openDb(process.env.DATABASE_PATH ?? "./horoi.db");
    const row = getRun(db, runId);
    if (!row?.report_json) {
      console.error("not found");
      process.exit(3);
    }
    const report = JSON.parse(row.report_json);
    const registry = process.env.REGISTRY_ADDRESS || null;
    const payload = publishPayload(report, registry);
    const reportId = computeReportId({
      chainId: report.chainId,
      asset: report.asset,
      target: report.target,
      suiteHash: SUITE_HASH,
      resultHash: report.resultHash,
      blockNumber: report.blockNumber,
    });
    console.log(JSON.stringify({ ...payload, reportId, broadcast: false }, null, 2));
    if (!registry) {
      console.error("REGISTRY_NOT_CONFIGURED");
      process.exit(3);
    }
    process.exit(0);
  }

  usage();
  process.exit(4);
}

main().catch((err) => {
  console.error(err);
  process.exit(3);
});

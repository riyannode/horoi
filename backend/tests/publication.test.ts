import { describe, expect, test } from "bun:test";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getAddress } from "viem";
import { BinanceWeb3Client, publicationPayloadHash, type PublicationTransaction } from "../binance";
import { buildPublicationTransaction } from "../publication";
import { getSimulation, openDb, upsertSimulation } from "../db";

const ASSET = getAddress("0x00000000000000000000000000000000000000a1");
const TARGET = getAddress("0x00000000000000000000000000000000000000b1");
const REGISTRY = getAddress("0x00000000000000000000000000000000000000c1");
const FROM = getAddress("0x00000000000000000000000000000000000000d1");
const originalFetch = globalThis.fetch;


function report() {
  return {
    status: "INCOMPLETE",
    chainId: 56,
    asset: ASSET,
    target: TARGET,
    suiteHash: `0x${"11".repeat(32)}`,
    resultHash: `0x${"22".repeat(32)}`,
    blockNumber: 123,
  };
}

function transaction(): PublicationTransaction {
  return buildPublicationTransaction(report(), FROM, REGISTRY);
}

describe("HoroiRegistry publication payload", () => {
  test("builds exact chain/from/to/value/data identity", () => {
    const tx = transaction();
    expect(tx.chainId).toBe(56);
    expect(tx.from).toBe(FROM);
    expect(tx.to).toBe(REGISTRY);
    expect(tx.value).toBe("0");
    expect(tx.data.startsWith("0x")).toBe(true);
    expect(/^0x[0-9a-f]{64}$/.test(publicationPayloadHash(tx))).toBe(true);
  });

  test("any publication identity change invalidates the payload hash", () => {
    const tx = transaction();
    const hash = publicationPayloadHash(tx);
    expect(publicationPayloadHash({ ...tx, chainId: 1 })).not.toBe(hash);
    expect(publicationPayloadHash({ ...tx, from: ASSET })).not.toBe(hash);
    expect(publicationPayloadHash({ ...tx, to: TARGET })).not.toBe(hash);
    expect(publicationPayloadHash({ ...tx, value: "1" })).not.toBe(hash);
    expect(publicationPayloadHash({ ...tx, data: `${tx.data}00` })).not.toBe(hash);
  });

  test("official simulation request shape is chain plus EVM transaction", async () => {
    process.env.BINANCE_API_KEY = "test-api-key";
    process.env.BINANCE_API_SECRET = "test-api-secret";
    process.env.BINANCE_WEB3_BASE_URL = "https://example.test/build";
    let request: { url: string; init: RequestInit } | undefined;
    globalThis.fetch = (async (url, init) => {
      request = { url: String(url), init: init ?? {} };
      return new Response(JSON.stringify({ code: 0, msg: "success", data: { status: "SUCCESS" } }), { status: 200 });
    }) as typeof fetch;

    const simulation = await new BinanceWeb3Client().simulatePublication(transaction());
    const body = JSON.parse(String(request?.init.body));
    expect(request?.url).toBe("https://example.test/build/api/v1/dex/pre-transaction/simulate");
    expect(body).toEqual({
      binanceChainId: "56",
      evmTx: { from: FROM, to: REGISTRY, value: "0", data: transaction().data },
    });
    expect(simulation.success).toBe(true);
    expect(/^0x[0-9a-f]{64}$/.test(simulation.evidenceHash)).toBe(true);
    expect(JSON.stringify(request?.init.headers).includes("test-api-secret")).toBe(false);
    globalThis.fetch = originalFetch;
  });

  test("business failure is surfaced and not treated as HTTP-only success", async () => {
    process.env.BINANCE_API_KEY = "test-api-key";
    process.env.BINANCE_API_SECRET = "test-api-secret";
    globalThis.fetch = (async () => new Response(JSON.stringify({ code: 40001, msg: "Parameter error", data: null }), { status: 200 })) as typeof fetch;
    const simulation = await new BinanceWeb3Client().simulatePublication(transaction());
    expect(simulation.attempted).toBe(true);
    expect(simulation.success).toBe(false);
    expect(simulation.upstreamCode).toBe("40001");
    expect(simulation.errorCode).toBe("BINANCE_UPSTREAM_40001");
    globalThis.fetch = originalFetch;
  });
});

describe("publication simulation persistence", () => {
  test("persists required evidence but never credentials", () => {
    const path = join(tmpdir(), `horoi-publication-${crypto.randomUUID()}.db`);
    mkdirSync(tmpdir(), { recursive: true });
    const db = openDb(path);
    const tx = transaction();
    const hash = publicationPayloadHash(tx);
    upsertSimulation(db, {
      report_id: `0x${"33".repeat(32)}`,
      run_id: "run-1",
      payload_hash: hash,
      payload_json: JSON.stringify(tx),
      result_json: JSON.stringify({ attempted: true, success: false, errorCode: "TX_SIMULATION_FAILED" }),
      attempted: 1,
      success: 0,
      upstream_code: "40001",
      latency_ms: 12,
      evidence_hash: `0x${"44".repeat(32)}`,
      error_code: "TX_SIMULATION_FAILED",
      simulated_at: 1,
      captured_at: 1,
    });
    const saved = getSimulation(db, `0x${"33".repeat(32)}`);
    expect(saved?.run_id).toBe("run-1");
    expect(saved?.payload_hash).toBe(hash);
    expect(saved?.attempted).toBe(1);
    expect(saved?.success).toBe(0);
    expect(/^0x/.test(saved?.evidence_hash ?? "")).toBe(true);
    expect(`${saved?.payload_json}${saved?.result_json}`.includes("test-api-secret")).toBe(false);
    rmSync(path, { force: true });
    rmSync(`${path}-wal`, { force: true });
    rmSync(`${path}-shm`, { force: true });
  });
});

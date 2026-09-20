import { describe, expect, test } from "bun:test";
import { createPublicClient, custom, encodeFunctionResult } from "viem";
import { bsc } from "viem/chains";
import { bstockAbi, findFundedHolder, parseForkRpcTimeoutMs } from "../chain";

const asset = "0x02Fca66C1D1aFB4E2A7884261eB00F63598a7436" as const;
const preferred = "0x00000000000000000000000000000000000000a1" as const;

function holderClient(balance: bigint, failLogs = false) {
  const logRanges: number[] = [];
  const client = createPublicClient({
    chain: bsc,
    transport: custom({
      async request({ method, params }) {
        if (method === "eth_call") {
          return encodeFunctionResult({
            abi: bstockAbi,
            functionName: "balanceOf",
            result: balance,
          });
        }
        if (method === "eth_blockNumber") return "0x1000";
        if (method === "eth_getLogs") {
          if (failLogs) throw new Error("provider rejected log range");
          const filter = params?.[0];
          if (typeof filter !== "object" || filter === null) throw new Error("missing log filter");
          const fromBlock = Reflect.get(filter, "fromBlock");
          const toBlock = Reflect.get(filter, "toBlock");
          if (typeof fromBlock !== "string" || typeof toBlock !== "string") {
            throw new Error("log range is invalid");
          }
          logRanges.push(Number(BigInt(toBlock) - BigInt(fromBlock) + 1n));
          return [];
        }
        throw new Error(`unexpected RPC method ${method}`);
      },
    }),
  });
  return { client, logRanges };
}

describe("funded holder discovery", () => {
  test("uses a preferred funded holder without log discovery", async () => {
    const { client, logRanges } = holderClient(10n);
    expect(await findFundedHolder(client, asset, 1n, { preferred })).toBe(preferred);
    expect(logRanges).toEqual([]);
  });

  test("does not fall back to logs when a preferred holder is unfunded", async () => {
    const { client, logRanges } = holderClient(0n);
    expect(await findFundedHolder(client, asset, 1n, { preferred })).toBe(null);
    expect(logRanges).toEqual([]);
  });

  test("scans provider-safe log windows no larger than 1000 blocks", async () => {
    const { client, logRanges } = holderClient(0n);
    expect(await findFundedHolder(client, asset, 1n)).toBe(null);
    expect(logRanges.length > 1).toBe(true);
    expect(logRanges.every((range) => range > 0 && range <= 1_000)).toBe(true);
  });

  test("surfaces provider log range errors instead of skipping them", async () => {
    const { client } = holderClient(0n, true);
    let error = "";
    try {
      await findFundedHolder(client, asset, 1n);
    } catch (caught) {
      error = String(caught);
    }
    expect(error.includes("provider rejected log range")).toBe(true);
  });
});

describe("fork RPC timeout configuration", () => {
  test("defaults to 120 seconds and accepts values within the bound", () => {
    expect(parseForkRpcTimeoutMs(undefined)).toBe(120_000);
    expect(parseForkRpcTimeoutMs("1")).toBe(1);
    expect(parseForkRpcTimeoutMs("300000")).toBe(300_000);
  });

  for (const value of ["", "0", "-1", "NaN", "Infinity", "300001"]) {
    test(`rejects invalid timeout ${value}`, () => {
      let rejected = false;
      try {
        parseForkRpcTimeoutMs(value);
      } catch (error) {
        rejected = String(error).includes("HOROI_FORK_RPC_TIMEOUT_MS");
      }
      expect(rejected).toBe(true);
    });
  }
});

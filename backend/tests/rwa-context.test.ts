import { describe, expect, test } from "bun:test";
import { computeRwaContextHash, type RwaContext } from "../binance";
import { isRwaContextSufficient } from "../rwa-context";

const ASSET = "0x02Fca66C1D1aFB4E2A7884261eB00F63598a7436";

function context(overrides: Partial<RwaContext> = {}): RwaContext {
  return {
    capturedAt: 1,
    contextHash: "0xcontext",
    configured: true,
    assetQuery: ASSET,
    selectedAsset: {
      ticker: "NVDA",
      companyName: "Nvidia Corp",
      platformId: "bstock",
      binanceChainId: "56",
      tokenContractAddress: ASSET.toLowerCase(),
      tokenSymbol: "NVDAB",
    },
    tokenPrice: "222.17",
    referencePrice: "222.00",
    underlying: { underlyingTicker: "NVDA" },
    market: { statusInfo: { openState: true } },
    calls: [
      { module: "RWA_DATA", operation: "searchRwaToken", endpointId: "GET search", success: true, latencyMs: 1 },
      { module: "RWA_DATA", operation: "getRwaTokenPrice", endpointId: "GET price", success: true, latencyMs: 1 },
      { module: "RWA_DATA", operation: "getRwaTokenList", endpointId: "GET tokens", success: true, latencyMs: 1 },
    ],
    ...overrides,
  };
}

describe("RWA context sufficiency", () => {
  test("identity + price + token context succeeds", () => {
    expect(isRwaContextSufficient(context(), ASSET)).toBe(true);
  });

  test("identity only fails", () => {
    expect(isRwaContextSufficient(context({
      tokenPrice: undefined,
      referencePrice: undefined,
      underlying: undefined,
      market: undefined,
      calls: [context().calls[0]!],
    }), ASSET)).toBe(false);
  });

  test("identity + price without market/token context fails", () => {
    expect(isRwaContextSufficient(context({
      underlying: undefined,
      market: undefined,
      calls: context().calls.slice(0, 2),
    }), ASSET)).toBe(false);
  });

  test("optional underlying endpoint failures do not fail token fallback", () => {
    expect(isRwaContextSufficient(context({
      underlying: { underlyingTicker: "NVDA" },
      market: { statusInfo: { openState: true } },
      calls: [
        ...context().calls,
        { module: "RWA_DATA", operation: "getRwaUnderlyingInfo", endpointId: "GET profile", success: false, upstreamCode: "40001", latencyMs: 1 },
        { module: "RWA_DATA", operation: "getRwaUnderlyingMarket", endpointId: "GET market", success: false, upstreamCode: "40001", latencyMs: 1 },
      ],
    }), ASSET)).toBe(true);
  });

  test("normalized Binance context changes contextHash without touching resultHash", () => {
    const original = context();
    const hash = computeRwaContextHash(original);
    expect(computeRwaContextHash({ ...original, tokenPrice: "223.17" })).not.toBe(hash);
    expect(computeRwaContextHash({ ...original, market: { statusInfo: { openState: false } } })).not.toBe(hash);
    expect(computeRwaContextHash({ ...original, capturedAt: 2 })).not.toBe(hash);
    expect(computeRwaContextHash({ ...original, calls: [{ ...original.calls[0]!, latencyMs: 2 }, ...original.calls.slice(1) ] })).not.toBe(hash);
  });
});

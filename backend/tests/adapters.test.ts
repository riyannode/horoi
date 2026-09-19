import { describe, expect, test } from "bun:test";
import { builtinAdapter, effectiveOf } from "../adapters";
import { ErrorCodes, httpStatusFor } from "../errors";

describe("adapter effective claim", () => {
  test("applies multiplier once", () => {
    const mult = 2n * 10n ** 18n;
    expect(effectiveOf(10n, mult)).toBe(20n);
    expect(effectiveOf(10n, 10n ** 18n)).toBe(10n);
  });
});

describe("builtin adapters", () => {
  test("custody is intentionally not redeemable", () => {
    expect(builtinAdapter("custody").kind).toBe("custody");
    expect(builtinAdapter("custody").redeemable).toBe(false);
  });

  test("erc4626 has real redemption path", () => {
    expect(builtinAdapter("erc4626").kind).toBe("erc4626");
    expect(builtinAdapter("erc4626").redeemable).toBe(true);
  });
});

describe("error http mapping", () => {
  test("maps known codes", () => {
    expect(httpStatusFor(ErrorCodes.ADDRESS_INVALID)).toBe(400);
    expect(httpStatusFor(ErrorCodes.CORE_INTERFACE_MISSING)).toBe(422);
    expect(httpStatusFor(ErrorCodes.RPC_RATE_LIMITED)).toBe(429);
    expect(httpStatusFor(ErrorCodes.RUN_BUSY)).toBe(429);
    expect(httpStatusFor(ErrorCodes.REGISTRY_ALREADY_PUBLISHED)).toBe(409);
    expect(httpStatusFor(ErrorCodes.INTERNAL_ERROR)).toBe(500);
  });
});

import { describe, expect, test } from "bun:test";
import { buildReport, evaluateIntegrationChecks, evaluateStatus, type EvaluationInput } from "../engine";

const ONE = 10n ** 18n;

function harnessInput(incompatible = false): EvaluationInput {
  const scenario = (label: "forwardSplit" | "reverseSplit" | "dividend", multiplier: bigint) => ({
    label,
    requestedMultiplier: multiplier,
    activeMultiplier: multiplier,
    rawBefore: 1_000n,
    rawAfter: 1_000n,
    effectiveBefore: 1_000n,
    effectiveAfter: incompatible && label === "forwardSplit" ? 1_000n : (1_000n * multiplier) / ONE,
    expectedEffectiveAfter: (1_000n * multiplier) / ONE,
    returnedRaw: 1_000n,
    sharesBefore: 1_000n,
  });

  return {
    interfaces: {},
    uiMultiplier: ONE,
    newUIMultiplier: ONE,
    effectiveAt: 0n,
    forkTimestamp: 1n,
    forkAvailable: true,
    adapterAvailable: true,
    adapterRedeemable: true,
    baseline: { deposited: true, rawClaim: 1_000n, shares: 1_000n, returnedRaw: 1_000n, expectedRaw: 1_000n },
    scheduled: {
      reproduced: true,
      effectiveAt: 10n,
      preActiveMultiplier: ONE,
      postActiveMultiplier: 2n * ONE,
      expectedPre: ONE,
      expectedPost: 2n * ONE,
    },
    scenarios: {
      forwardSplit: scenario("forwardSplit", 2n * ONE),
      reverseSplit: scenario("reverseSplit", ONE / 10n),
      dividend: scenario("dividend", (1008n * ONE) / 1000n),
      multiUser: { beforeA: 1_000n, beforeB: 2_000n, afterA: 1_000n, afterB: 2_000n },
      fractional: { attemptedRaw: 1n, deposited: true, rawClaim: 1n, returnedRaw: 1n },
    },
  };
}

describe("integration check engine unit tests", () => {
  test("synthetic compatible input evaluates H101-H110 as passing", () => {
    const checks = evaluateIntegrationChecks(harnessInput());
    expect(checks.filter((item) => item.id.startsWith("H1")).length).toBe(10);
    expect(checks.filter((item) => item.id.startsWith("H1")).every((item) => item.status === "PASS")).toBe(true);
    expect(evaluateStatus(checks)).toBe("PASS");
  });

  test("synthetic incompatible input fails H103 on stale effective claim", () => {
    const checks = evaluateIntegrationChecks(harnessInput(true));
    const forward = checks.find((item) => item.id === "H103");
    expect(forward?.status).toBe("FAIL");
    expect(forward?.errorCode).toBe("INVARIANT_MULTIPLIER_IGNORED");
    expect(evaluateStatus(checks)).toBe("FAIL");
  });

  test("successful integration evidence without optional errors builds a report", () => {
    const input = harnessInput();
    let built = false;
    try {
      const report = buildReport({
        runId: "serialization-regression",
        chainId: 56,
        blockNumber: 122_846_004,
        blockHash: "0x01",
        testedAt: 1,
        asset: "0x00000000000000000000000000000000000000a1",
        target: "0x00000000000000000000000000000000000000b1",
        profile: "custom",
        token: {
          decimals: 18,
          uiMultiplier: ONE.toString(),
          newUIMultiplier: ONE.toString(),
          effectiveAt: 0,
          supportedInterfaces: [],
        },
        checks: evaluateIntegrationChecks(input),
      });
      built = report.resultHash.startsWith("0x");
    } catch {
      built = false;
    }
    expect(built).toBe(true);
  });
});

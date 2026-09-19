import { describe, expect, test } from "bun:test";
import {
  MULTIPLIER_ONE,
  SUITE_CHECKS,
  SUITE_HASH,
  SUITE_ID,
  SUITE_VERSION,
  absDiff,
  buildReport,
  canonicalJson,
  check,
  computeResultHash,
  effectiveAmount,
  evaluateStatus,
  summarize,
  withinRawTolerance,
} from "../engine";

describe("multiplier math", () => {
  test("effective = raw * multiplier / 1e18", () => {
    expect(effectiveAmount(10n, MULTIPLIER_ONE)).toBe(10n);
    expect(effectiveAmount(10n, 2n * MULTIPLIER_ONE)).toBe(20n);
    expect(effectiveAmount(10n, MULTIPLIER_ONE / 10n)).toBe(1n);
    expect(effectiveAmount(1000n, (1008n * MULTIPLIER_ONE) / 1000n)).toBe(1008n);
  });

  test("bigint tolerance never converts to Number", () => {
    const huge = 10n ** 30n;
    expect(absDiff(huge + 1n, huge)).toBe(1n);
    expect(withinRawTolerance(huge + 1n, huge)).toBe(true);
    expect(withinRawTolerance(huge + 2n, huge)).toBe(false);
  });
});

describe("status aggregation", () => {
  const required = (statusFor: (id: string) => "PASS" | "FAIL" | "INCOMPLETE" | "SKIP") =>
    SUITE_CHECKS.filter((item) => item.required).map((item) => check(item.id, statusFor(item.id)));

  test("all required pass => PASS", () => {
    expect(evaluateStatus(required(() => "PASS"))).toBe("PASS");
  });

  test("required fail => FAIL", () => {
    expect(evaluateStatus(required((id) => id === "H003" ? "FAIL" : "PASS"))).toBe("FAIL");
  });

  test("required incomplete => INCOMPLETE", () => {
    expect(evaluateStatus(required((id) => id === "H006" ? "INCOMPLETE" : "PASS"))).toBe("INCOMPLETE");
  });

  test("required skip cannot yield PASS", () => {
    expect(evaluateStatus(required((id) => id === "H006" ? "SKIP" : "PASS"))).toBe("INCOMPLETE");
  });
});

describe("report hashing", () => {
  const base = {
    runId: "run-1",
    chainId: 56,
    blockNumber: 100,
    blockHash: "0xabc",
    testedAt: 1_700_000_000_000,
    asset: "0x00000000000000000000000000000000000000a1",
    target: "0x00000000000000000000000000000000000000b1",
    profile: "erc4626" as const,
    token: {
      decimals: 18,
      uiMultiplier: MULTIPLIER_ONE.toString(),
      newUIMultiplier: MULTIPLIER_ONE.toString(),
      effectiveAt: 0,
      supportedInterfaces: ["IScaledUIAmount"],
    },
  };

  test("suite hash is versioned", () => {
    expect(SUITE_HASH.startsWith("0x")).toBe(true);
    expect(SUITE_ID).toBe("HOROI-BSTOCK-1");
    expect(SUITE_VERSION).toBe("1.1.0");
  });

  test("check order does not change result hash", () => {
    const checks = [
      check("H001", "PASS", { expected: true, observed: true }),
      check("H002", "PASS", { expected: true, observed: true }),
    ];
    const first = buildReport({ ...base, checks });
    const second = buildReport({ ...base, checks: [...checks].reverse() });
    expect(first.resultHash).toBe(second.resultHash);
  });

  test("evidence is bound into result hash", () => {
    const first = buildReport({
      ...base,
      checks: [check("H001", "PASS", { evidence: { txHash: "0x01" } })],
    });
    const second = buildReport({
      ...base,
      checks: [check("H001", "PASS", { evidence: { txHash: "0x02" } })],
    });
    expect(first.resultHash).not.toBe(second.resultHash);
  });

  test("runId is runtime metadata and does not change semantic hash", () => {
    const checks = [check("H001", "PASS", { expected: true, observed: true })];
    const first = buildReport({ ...base, runId: "a", checks });
    const second = buildReport({ ...base, runId: "b", checks });
    expect(first.resultHash).toBe(second.resultHash);
  });

  test("computeResultHash ignores check order", () => {
    const checks = [
      check("H002", "PASS", { expected: 1, observed: 1 }),
      check("H001", "PASS", { expected: 1, observed: 1 }),
    ];
    const report = buildReport({ ...base, checks });
    const { resultHash: _, ...draft } = report;
    const reordered = { ...draft, checks: [...draft.checks].reverse() };
    expect(computeResultHash(draft)).toBe(computeResultHash(reordered));
  });
});

describe("canonical json", () => {
  test("bigint serialized as string, keys sorted", () => {
    expect(canonicalJson({ b: 1n, a: 2n })).toBe('{"a":"2","b":"1"}');
  });
});

describe("summary counts", () => {
  test("counts required incomplete", () => {
    const summary = summarize([
      check("H001", "PASS"),
      check("H002", "FAIL"),
      check("H006", "INCOMPLETE"),
      check("H201", "SKIP"),
    ]);
    expect(summary.requiredPassed).toBe(1);
    expect(summary.requiredFailed).toBe(1);
    expect(summary.requiredIncomplete).toBe(1);
    expect(summary.optionalSkipped).toBe(1);
  });
});

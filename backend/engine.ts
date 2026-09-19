import {
  encodeAbiParameters,
  keccak256,
  parseAbiParameters,
  toHex,
  type Address,
  type Hex,
} from "viem";
import { ErrorCodes, type ErrorCode } from "./errors";

export const MULTIPLIER_ONE = 10n ** 18n;
export const SUITE_ID = "HOROI-BSTOCK-1";
export const SUITE_VERSION = "1.2.0";
export const REPORT_VERSION = "1.2.0";

export type ProfileKind = "custody" | "erc4626" | "custom";
export type CheckStatus = "PASS" | "FAIL" | "INCOMPLETE" | "SKIP" | "ERROR";
export type RunStatus = "PASS" | "FAIL" | "INCOMPLETE" | "ERROR";

export const SUITE_CHECKS = [
  { id: "H001", name: "CORE_INTERFACE", required: true, rule: "ERC165 core interface 0xa60bf13d" },
  { id: "H002", name: "REQUIRED_PENDING_INTERFACE", required: true, rule: "ERC165 pending interface 0x4bd27648" },
  { id: "H003", name: "ACTIVE_MULTIPLIER", required: true, rule: "uiMultiplier > 0" },
  { id: "H004", name: "PENDING_STATE", required: true, rule: "pending state matches BEP-677 semantics at pinned block timestamp" },
  { id: "H005", name: "TRANSFER_UI_EVENT", required: true, rule: "real fork transfer emits TransferWithUIAmount matching raw*multiplier/1e18" },
  { id: "H006", name: "SCHEDULED_TRANSITION", required: true, rule: "authorized setter path schedules and activates multiplier on isolated fork" },
  { id: "H007", name: "CONVERSION_CONSISTENCY", required: false, rule: "optional conversion interface matches integer multiplier math" },
  { id: "H008", name: "UI_BALANCE_CONSISTENCY", required: false, rule: "optional balanceOfUI matches raw balance and active multiplier" },
  { id: "H101", name: "BASELINE_DEPOSIT", required: true, rule: "target accepts nonzero raw bStock and exposes nonzero claim" },
  { id: "H102", name: "BASELINE_REDEEM", required: true, rule: "redeem returns expected raw claim within one raw unit" },
  { id: "H103", name: "FORWARD_SPLIT", required: true, rule: "2x multiplier preserves raw claim and adjusts effective claim exactly" },
  { id: "H104", name: "REVERSE_SPLIT", required: true, rule: "0.1x multiplier preserves raw claim and adjusts effective claim exactly" },
  { id: "H105", name: "DIVIDEND_REINVESTMENT", required: true, rule: "1.008x multiplier preserves raw claim and increases effective claim once" },
  { id: "H106", name: "PRE_EFFECTIVE_STATE", required: true, rule: "old multiplier remains active immediately before effectiveAt" },
  { id: "H107", name: "POST_EFFECTIVE_STATE", required: true, rule: "new multiplier is active immediately after effectiveAt" },
  { id: "H108", name: "REDEMPTION_AFTER_CHANGE", required: true, rule: "post-transition redemption returns pre-transition proportional raw claim" },
  { id: "H109", name: "MULTI_USER_PROPORTION", required: true, rule: "relative raw ownership ratio is preserved across multiplier transition" },
  { id: "H110", name: "FRACTIONAL_BOUNDARY", required: true, rule: "small successful position remains nonzero and redeemable within one raw unit" },
  { id: "H201", name: "BINANCE_REFERENCE_CONTEXT", required: false, rule: "optional context only" },
  { id: "H202", name: "COUNTRY_RESTRICTION_CONTEXT", required: false, rule: "optional informational context only" },
  { id: "H203", name: "CUSTOM_PROTOCOL_INVARIANT", required: false, rule: "optional developer-defined invariant" },
] as const;

const SUITE_MANIFEST = {
  suiteId: SUITE_ID,
  version: SUITE_VERSION,
  accounting: "raw BEP-20 amounts are canonical; UI/effective amount = raw*multiplier/1e18",
  roundingToleranceRawUnits: "1",
  checks: [...SUITE_CHECKS].sort((a, b) => a.id.localeCompare(b.id)),
};

function canonicalize(value: unknown, path: string = "$"): unknown {
  if (value === undefined) throw new Error(`undefined value at ${path}`);
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`non-finite number at ${path}`);
    return Object.is(value, -0) ? 0 : value;
  }
  if (value === null || typeof value === "string" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map((item, index) => canonicalize(item, `${path}[${index}]`));
  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(object).sort()) {
      sorted[key] = canonicalize(object[key], `${path}.${key}`);
    }
    return sorted;
  }
  throw new Error(`unsupported value at ${path}`);
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

export const SUITE_HASH: Hex = keccak256(toHex(canonicalJson(SUITE_MANIFEST)));

export function effectiveAmount(raw: bigint, multiplier: bigint): bigint {
  return (raw * multiplier) / MULTIPLIER_ONE;
}

export function absDiff(a: bigint, b: bigint): bigint {
  return a >= b ? a - b : b - a;
}

export function withinRawTolerance(a: bigint, b: bigint, tolerance = 1n): boolean {
  return absDiff(a, b) <= tolerance;
}

export type CheckEvidence = Record<string, unknown>;

export type CheckResult = {
  id: string;
  name: string;
  required: boolean;
  status: CheckStatus;
  expected?: unknown;
  observed?: unknown;
  evidence?: CheckEvidence;
  durationMs: number;
  errorCode?: ErrorCode;
};

export type EconomicSnapshot = {
  rawClaim: string;
  multiplier: string;
  effectiveClaim: string;
  economicNotional: string | null;
};

export type HoroiReport = {
  reportVersion: string;
  suiteId: string;
  suiteVersion: string;
  suiteHash: string;
  runId: string;
  status: RunStatus;
  chainId: number;
  blockNumber: number;
  blockHash: string;
  testedAt: number;
  asset: string;
  target: string;
  profile: ProfileKind;
  token: {
    decimals: number;
    uiMultiplier: string;
    newUIMultiplier: string;
    effectiveAt: number;
    supportedInterfaces: string[];
  };
  checks: CheckResult[];
  economics?: {
    before?: EconomicSnapshot;
    after?: EconomicSnapshot;
  };
  summary: {
    requiredPassed: number;
    requiredFailed: number;
    requiredIncomplete: number;
    optionalPassed: number;
    optionalFailed: number;
    optionalSkipped: number;
  };
  resultHash: string;
  binanceWeb3?: {
    capturedAt: number;
    contextHash: string;
    configured: boolean;
    assetQuery: string;
    selectedAsset?: Record<string, unknown>;
    tokenPrice?: string;
    referencePrice?: string;
    underlying?: Record<string, unknown>;
    market?: Record<string, unknown>;
    calls: Array<{
      module: string;
      operation: string;
      endpointId: string;
      success: boolean;
      sourceTimestamp?: number;
      latencyMs: number;
      upstreamCode?: string;
      errorCode?: string;
    }>;
  };
  registry?: {
    reportId?: string;
    txHash?: string;
    contract?: string;
    publisher?: string;
  };
};

export type ScenarioEvidence = {
  label: "forwardSplit" | "reverseSplit" | "dividend";
  requestedMultiplier: bigint;
  activeMultiplier: bigint;
  rawBefore: bigint;
  rawAfter: bigint;
  effectiveBefore: bigint;
  effectiveAfter: bigint;
  expectedEffectiveAfter: bigint;
  returnedRaw?: bigint;
  sharesBefore?: bigint;
  txHash?: Hex;
};

export type EvaluationInput = {
  interfaces: Record<string, boolean>;
  uiMultiplier: bigint;
  newUIMultiplier: bigint;
  effectiveAt: bigint;
  forkTimestamp: bigint;
  forkAvailable: boolean;
  adapterAvailable: boolean;
  adapterRedeemable?: boolean;
  transferUiEvents?: Array<{ txHash?: Hex; rawAmount: bigint; uiAmount: bigint; expectedUi: bigint }>;
  scheduled?: {
    reproduced: boolean;
    updater?: Address;
    txHash?: Hex;
    effectiveAt?: bigint;
    preActiveMultiplier?: bigint;
    postActiveMultiplier?: bigint;
    expectedPre?: bigint;
    expectedPost?: bigint;
    error?: string;
  };
  conversion?: {
    raw: bigint;
    observedUi?: bigint;
    expectedUi: bigint;
    observedBackRaw?: bigint;
  };
  balanceUi?: {
    account: Address;
    rawBalance: bigint;
    observedUi?: bigint;
    expectedUi: bigint;
  };
  baseline?: {
    deposited: boolean;
    rawClaim?: bigint;
    shares?: bigint;
    returnedRaw?: bigint;
    expectedRaw?: bigint;
    error?: string;
  };
  scenarios?: {
    forwardSplit?: ScenarioEvidence;
    reverseSplit?: ScenarioEvidence;
    dividend?: ScenarioEvidence;
    multiUser?: {
      beforeA: bigint;
      beforeB: bigint;
      afterA: bigint;
      afterB: bigint;
    };
    fractional?: {
      attemptedRaw: bigint;
      deposited: boolean;
      rawClaim?: bigint;
      returnedRaw?: bigint;
      error?: string;
    };
  };
};

export function check(
  id: string,
  status: CheckStatus,
  opts: {
    expected?: unknown;
    observed?: unknown;
    evidence?: CheckEvidence;
    durationMs?: number;
    errorCode?: ErrorCode;
  } = {},
): CheckResult {
  const spec = SUITE_CHECKS.find((item) => item.id === id);
  return {
    id,
    name: spec?.name ?? id,
    required: spec?.required ?? false,
    status,
    expected: opts.expected,
    observed: opts.observed,
    evidence: opts.evidence,
    durationMs: opts.durationMs ?? 0,
    errorCode: opts.errorCode,
  };
}

export function evaluateStatus(checks: CheckResult[]): RunStatus {
  const required = checks.filter((item) => item.required);
  if (required.some((item) => item.status === "FAIL")) return "FAIL";
  if (required.some((item) => item.status !== "PASS")) return "INCOMPLETE";
  return required.length > 0 ? "PASS" : "INCOMPLETE";
}

export function summarize(checks: CheckResult[]): HoroiReport["summary"] {
  const required = checks.filter((item) => item.required);
  const optional = checks.filter((item) => !item.required);
  return {
    requiredPassed: required.filter((item) => item.status === "PASS").length,
    requiredFailed: required.filter((item) => item.status === "FAIL").length,
    requiredIncomplete: required.filter((item) => item.status !== "PASS" && item.status !== "FAIL").length,
    optionalPassed: optional.filter((item) => item.status === "PASS").length,
    optionalFailed: optional.filter((item) => item.status === "FAIL").length,
    optionalSkipped: optional.filter((item) => item.status !== "PASS" && item.status !== "FAIL").length,
  };
}

export function computeResultHash(report: Omit<HoroiReport, "resultHash">): Hex {
  const checks = [...report.checks].sort((a, b) => a.id.localeCompare(b.id));
  const payload = {
    reportVersion: report.reportVersion,
    suiteId: report.suiteId,
    suiteVersion: report.suiteVersion,
    suiteHash: report.suiteHash,
    status: report.status,
    chainId: report.chainId,
    blockNumber: report.blockNumber,
    blockHash: report.blockHash,
    asset: report.asset,
    target: report.target,
    profile: report.profile,
    token: {
      decimals: report.token.decimals,
      uiMultiplier: report.token.uiMultiplier,
      newUIMultiplier: report.token.newUIMultiplier,
      effectiveAt: report.token.effectiveAt,
      supportedInterfaces: [...report.token.supportedInterfaces].sort(),
    },
    checks: checks.map((item) => ({
      id: item.id,
      required: item.required,
      status: item.status,
      expected: item.expected ?? null,
      observed: item.observed ?? null,
      evidence: item.evidence ?? null,
      errorCode: item.errorCode ?? null,
    })),
    summary: {
      requiredPassed: report.summary.requiredPassed,
      requiredFailed: report.summary.requiredFailed,
      requiredIncomplete: report.summary.requiredIncomplete,
      optionalPassed: report.summary.optionalPassed,
      optionalFailed: report.summary.optionalFailed,
      optionalSkipped: report.summary.optionalSkipped,
    },
    economics: report.economics
      ? {
          before: report.economics.before ?? null,
          after: report.economics.after ?? null,
        }
      : null,
  };
  return keccak256(toHex(canonicalJson(payload)));
}

export function buildReport(input: {
  runId: string;
  chainId: number;
  blockNumber: number;
  blockHash: string;
  testedAt: number;
  asset: string;
  target: string;
  profile: ProfileKind;
  token: HoroiReport["token"];
  checks: CheckResult[];
  economics?: HoroiReport["economics"];
}): HoroiReport {
  const checks = [...input.checks].sort((a, b) => a.id.localeCompare(b.id));
  const status = evaluateStatus(checks);
  const summary = summarize(checks);
  const draft: Omit<HoroiReport, "resultHash"> = {
    reportVersion: REPORT_VERSION,
    suiteId: SUITE_ID,
    suiteVersion: SUITE_VERSION,
    suiteHash: SUITE_HASH,
    runId: input.runId,
    status,
    chainId: input.chainId,
    blockNumber: input.blockNumber,
    blockHash: input.blockHash,
    testedAt: input.testedAt,
    asset: input.asset,
    target: input.target,
    profile: input.profile,
    token: input.token,
    checks,
    economics: input.economics,
    summary,
  };
  return { ...draft, resultHash: computeResultHash(draft) };
}

export function evaluateTokenChecks(input: EvaluationInput): CheckResult[] {
  const results: CheckResult[] = [];
  results.push(check("H001", input.interfaces.IScaledUIAmount ? "PASS" : "FAIL", {
    expected: "supportsInterface(0xa60bf13d) == true",
    observed: input.interfaces.IScaledUIAmount === true,
    errorCode: input.interfaces.IScaledUIAmount ? undefined : ErrorCodes.CORE_INTERFACE_MISSING,
  }));
  results.push(check("H002", input.interfaces.IScaledUIAmountNewUIMultiplier ? "PASS" : "FAIL", {
    expected: "supportsInterface(0x4bd27648) == true",
    observed: input.interfaces.IScaledUIAmountNewUIMultiplier === true,
    errorCode: input.interfaces.IScaledUIAmountNewUIMultiplier ? undefined : ErrorCodes.PENDING_INTERFACE_MISSING,
  }));
  results.push(check("H003", input.uiMultiplier > 0n ? "PASS" : "FAIL", {
    expected: "uiMultiplier > 0",
    observed: input.uiMultiplier.toString(),
    errorCode: input.uiMultiplier > 0n ? undefined : ErrorCodes.MULTIPLIER_INVALID,
  }));

  const noPending = input.newUIMultiplier === input.uiMultiplier && input.effectiveAt === 0n;
  const validPending = input.effectiveAt > input.forkTimestamp && input.newUIMultiplier !== input.uiMultiplier;
  results.push(check("H004", noPending || validPending ? "PASS" : "FAIL", {
    expected: "no pending: new==active/effectiveAt=0; pending: effectiveAt > pinned block timestamp",
    observed: {
      uiMultiplier: input.uiMultiplier.toString(),
      newUIMultiplier: input.newUIMultiplier.toString(),
      effectiveAt: input.effectiveAt.toString(),
      blockTimestamp: input.forkTimestamp.toString(),
    },
    errorCode: noPending || validPending ? undefined : ErrorCodes.PENDING_STATE_INVALID,
  }));

  if (!input.forkAvailable) {
    results.push(check("H005", "INCOMPLETE", {
      expected: "real fork transfer with TransferWithUIAmount",
      observed: "fork unavailable",
      errorCode: ErrorCodes.FORK_START_FAILED,
    }));
    results.push(check("H006", "INCOMPLETE", {
      expected: "authorized scheduled transition on isolated fork",
      observed: "fork unavailable",
      errorCode: ErrorCodes.FORK_START_FAILED,
    }));
  } else {
    const events = input.transferUiEvents ?? [];
    const eventOk = events.length > 0 && events.every((event) => event.uiAmount === event.expectedUi);
    results.push(check("H005", events.length === 0 ? "INCOMPLETE" : eventOk ? "PASS" : "FAIL", {
      expected: "TransferWithUIAmount.uiAmount == rawAmount * activeMultiplier / 1e18",
      observed: events.map((event) => ({
        txHash: event.txHash,
        rawAmount: event.rawAmount.toString(),
        uiAmount: event.uiAmount.toString(),
        expectedUi: event.expectedUi.toString(),
      })),
      errorCode: events.length === 0
        ? ErrorCodes.FORK_TRANSACTION_FAILED
        : eventOk ? undefined : ErrorCodes.INVARIANT_EVENT_MISMATCH,
    }));

    const scheduled = input.scheduled;
    results.push(check("H006", scheduled?.reproduced ? "PASS" : "INCOMPLETE", {
      expected: "setUIMultiplier through discovered authorized updater and observe activation",
      observed: scheduled ?? { reproduced: false },
      errorCode: scheduled?.reproduced ? undefined : ErrorCodes.FORK_MUTATION_UNAVAILABLE,
    }));
  }

  if (!input.interfaces.IScaledUIAmountConversion) {
    results.push(check("H007", "SKIP", {
      expected: "optional IScaledUIAmountConversion",
      observed: "interface not supported",
    }));
  } else if (!input.conversion || input.conversion.observedUi === undefined || input.conversion.observedBackRaw === undefined) {
    results.push(check("H007", "INCOMPLETE", {
      expected: "toUIAmount/fromUIAmount calls execute",
      observed: input.conversion ?? null,
      errorCode: ErrorCodes.OPTIONAL_INTERFACE_UNAVAILABLE,
    }));
  } else {
    const toOk = input.conversion.observedUi === input.conversion.expectedUi;
    // EIP-8056 explicitly allows truncation: fromUIAmount(toUIAmount(x)) <= x.
    const backOk = input.conversion.observedBackRaw <= input.conversion.raw;
    results.push(check("H007", toOk && backOk ? "PASS" : "FAIL", {
      expected: {
        ui: input.conversion.expectedUi.toString(),
        backRawUpperBound: input.conversion.raw.toString(),
      },
      observed: {
        ui: input.conversion.observedUi.toString(),
        backRaw: input.conversion.observedBackRaw.toString(),
      },
      errorCode: toOk && backOk ? undefined : ErrorCodes.INVARIANT_ROUNDING_EXCEEDED,
    }));
  }

  if (!input.interfaces.IScaledUIAmountBalances) {
    results.push(check("H008", "SKIP", {
      expected: "optional IScaledUIAmountBalances",
      observed: "interface not supported",
    }));
  } else if (!input.balanceUi || input.balanceUi.observedUi === undefined) {
    results.push(check("H008", "INCOMPLETE", {
      expected: "balanceOfUI call executes",
      observed: input.balanceUi ?? null,
      errorCode: ErrorCodes.OPTIONAL_INTERFACE_UNAVAILABLE,
    }));
  } else {
    const ok = input.balanceUi.observedUi === input.balanceUi.expectedUi;
    results.push(check("H008", ok ? "PASS" : "FAIL", {
      expected: input.balanceUi.expectedUi.toString(),
      observed: input.balanceUi.observedUi.toString(),
      evidence: {
        account: input.balanceUi.account,
        rawBalance: input.balanceUi.rawBalance.toString(),
      },
      errorCode: ok ? undefined : ErrorCodes.INVARIANT_EVENT_MISMATCH,
    }));
  }

  return results;
}

function scenarioCheck(
  id: "H103" | "H104" | "H105",
  scenario: ScenarioEvidence | undefined,
): CheckResult {
  if (!scenario) {
    return check(id, "INCOMPLETE", {
      expected: "scenario executed on isolated fork",
      observed: "scenario unavailable",
      errorCode: ErrorCodes.FORK_MUTATION_UNAVAILABLE,
    });
  }
  const rawPreserved = withinRawTolerance(scenario.rawBefore, scenario.rawAfter);
  const effectiveCorrect = scenario.effectiveAfter === scenario.expectedEffectiveAfter;
  const redeemed = scenario.returnedRaw === undefined || withinRawTolerance(scenario.returnedRaw, scenario.rawBefore);
  const ok = rawPreserved && effectiveCorrect && redeemed;
  return check(id, ok ? "PASS" : "FAIL", {
    expected: {
      rawAfter: scenario.rawBefore.toString(),
      effectiveAfter: scenario.expectedEffectiveAfter.toString(),
      returnedRaw: scenario.returnedRaw === undefined ? null : scenario.rawBefore.toString(),
    },
    observed: {
      requestedMultiplier: scenario.requestedMultiplier.toString(),
      activeMultiplier: scenario.activeMultiplier.toString(),
      rawBefore: scenario.rawBefore.toString(),
      rawAfter: scenario.rawAfter.toString(),
      effectiveBefore: scenario.effectiveBefore.toString(),
      effectiveAfter: scenario.effectiveAfter.toString(),
      returnedRaw: scenario.returnedRaw?.toString(),
    },
    evidence: { txHash: scenario.txHash, sharesBefore: scenario.sharesBefore?.toString() },
    errorCode: ok
      ? undefined
      : !rawPreserved
        ? ErrorCodes.INVARIANT_VALUE_NOT_CONSERVED
        : !effectiveCorrect
          ? ErrorCodes.INVARIANT_MULTIPLIER_IGNORED
          : ErrorCodes.INVARIANT_REDEMPTION_DRIFT,
  });
}

export function evaluateIntegrationChecks(input: EvaluationInput): CheckResult[] {
  const results: CheckResult[] = [];
  if (!input.forkAvailable || !input.adapterAvailable) {
    const reason = !input.forkAvailable ? "fork unavailable" : "protocol adapter unavailable";
    for (const id of ["H101", "H102", "H103", "H104", "H105", "H106", "H107", "H108", "H109", "H110"] as const) {
      results.push(check(id, "INCOMPLETE", {
        expected: "required integration scenario executed",
        observed: reason,
        errorCode: !input.forkAvailable ? ErrorCodes.FORK_START_FAILED : ErrorCodes.TARGET_UNSUPPORTED,
      }));
    }
  } else {
    const baseline = input.baseline;
    const depositOk = baseline?.deposited === true && (baseline.rawClaim ?? 0n) > 0n;
    results.push(check("H101", depositOk ? "PASS" : baseline?.deposited === false ? "FAIL" : "INCOMPLETE", {
      expected: "deposit succeeds and exposes nonzero raw claim",
      observed: baseline ? {
        deposited: baseline.deposited,
        rawClaim: baseline.rawClaim?.toString(),
        shares: baseline.shares?.toString(),
        error: baseline.error,
      } : null,
      errorCode: depositOk ? undefined : baseline?.deposited === false ? ErrorCodes.DEPOSIT_FAILED : ErrorCodes.TARGET_UNSUPPORTED,
    }));

    if (!input.adapterRedeemable) {
      results.push(check("H102", "INCOMPLETE", {
        expected: "standardized redeem/withdraw operation",
        observed: "selected adapter intentionally has no standardized redemption",
        errorCode: ErrorCodes.TARGET_UNSUPPORTED,
      }));
    } else {
      const redeemObserved = baseline?.returnedRaw;
      const redeemExpected = baseline?.expectedRaw;
      const redeemOk = redeemObserved !== undefined && redeemExpected !== undefined && withinRawTolerance(redeemObserved, redeemExpected);
      results.push(check("H102", redeemObserved === undefined || redeemExpected === undefined ? "INCOMPLETE" : redeemOk ? "PASS" : "FAIL", {
        expected: redeemExpected?.toString(),
        observed: redeemObserved?.toString(),
        errorCode: redeemObserved === undefined || redeemExpected === undefined
          ? ErrorCodes.REDEEM_FAILED
          : redeemOk ? undefined : ErrorCodes.INVARIANT_REDEMPTION_DRIFT,
      }));
    }

    results.push(scenarioCheck("H103", input.scenarios?.forwardSplit));
    results.push(scenarioCheck("H104", input.scenarios?.reverseSplit));
    results.push(scenarioCheck("H105", input.scenarios?.dividend));

    const scheduled = input.scheduled;
    if (!scheduled?.reproduced || scheduled.preActiveMultiplier === undefined || scheduled.postActiveMultiplier === undefined) {
      results.push(check("H106", "INCOMPLETE", {
        expected: "old multiplier active before effectiveAt",
        observed: scheduled ?? null,
        errorCode: ErrorCodes.FORK_MUTATION_UNAVAILABLE,
      }));
      results.push(check("H107", "INCOMPLETE", {
        expected: "new multiplier active after effectiveAt",
        observed: scheduled ?? null,
        errorCode: ErrorCodes.FORK_MUTATION_UNAVAILABLE,
      }));
    } else {
      const preOk = scheduled.preActiveMultiplier === scheduled.expectedPre;
      const postOk = scheduled.postActiveMultiplier === scheduled.expectedPost;
      results.push(check("H106", preOk ? "PASS" : "FAIL", {
        expected: scheduled.expectedPre?.toString(),
        observed: scheduled.preActiveMultiplier.toString(),
        evidence: { effectiveAt: scheduled.effectiveAt?.toString(), txHash: scheduled.txHash },
        errorCode: preOk ? undefined : ErrorCodes.INVARIANT_APPLIED_EARLY,
      }));
      results.push(check("H107", postOk ? "PASS" : "FAIL", {
        expected: scheduled.expectedPost?.toString(),
        observed: scheduled.postActiveMultiplier.toString(),
        evidence: { effectiveAt: scheduled.effectiveAt?.toString(), txHash: scheduled.txHash },
        errorCode: postOk ? undefined : ErrorCodes.INVARIANT_APPLIED_LATE,
      }));
    }

    const redemptionScenario = input.scenarios?.forwardSplit ?? input.scenarios?.dividend ?? input.scenarios?.reverseSplit;
    if (!input.adapterRedeemable || redemptionScenario?.returnedRaw === undefined) {
      results.push(check("H108", "INCOMPLETE", {
        expected: "post-transition redemption returns proportional raw claim",
        observed: redemptionScenario ? { returnedRaw: redemptionScenario.returnedRaw?.toString() } : null,
        errorCode: ErrorCodes.REDEEM_FAILED,
      }));
    } else {
      const ok = withinRawTolerance(redemptionScenario.returnedRaw, redemptionScenario.rawBefore);
      results.push(check("H108", ok ? "PASS" : "FAIL", {
        expected: redemptionScenario.rawBefore.toString(),
        observed: redemptionScenario.returnedRaw.toString(),
        errorCode: ok ? undefined : ErrorCodes.INVARIANT_REDEMPTION_DRIFT,
      }));
    }

    const multi = input.scenarios?.multiUser;
    if (!multi || multi.beforeA === 0n || multi.beforeB === 0n || multi.afterA === 0n || multi.afterB === 0n) {
      results.push(check("H109", "INCOMPLETE", {
        expected: "two nonzero user claims before and after transition",
        observed: multi ? {
          beforeA: multi.beforeA.toString(), beforeB: multi.beforeB.toString(),
          afterA: multi.afterA.toString(), afterB: multi.afterB.toString(),
        } : null,
        errorCode: ErrorCodes.FORK_MUTATION_UNAVAILABLE,
      }));
    } else {
      const beforeCross = multi.beforeA * multi.afterB;
      const afterCross = multi.beforeB * multi.afterA;
      const tolerance = beforeCross / 10n ** 12n + 1n;
      const ok = absDiff(beforeCross, afterCross) <= tolerance;
      results.push(check("H109", ok ? "PASS" : "FAIL", {
        expected: "beforeA/beforeB == afterA/afterB within integer tolerance",
        observed: {
          beforeA: multi.beforeA.toString(), beforeB: multi.beforeB.toString(),
          afterA: multi.afterA.toString(), afterB: multi.afterB.toString(),
        },
        errorCode: ok ? undefined : ErrorCodes.INVARIANT_VALUE_NOT_CONSERVED,
      }));
    }

    const fractional = input.scenarios?.fractional;
    if (!fractional || !fractional.deposited || fractional.rawClaim === undefined) {
      results.push(check("H110", "INCOMPLETE", {
        expected: "small nonzero position accepted and observed",
        observed: fractional ?? null,
        errorCode: ErrorCodes.TARGET_UNSUPPORTED,
      }));
    } else {
      const nonzero = fractional.rawClaim > 0n;
      const redeemOk = !input.adapterRedeemable || (
        fractional.returnedRaw !== undefined && withinRawTolerance(fractional.returnedRaw, fractional.rawClaim)
      );
      const ok = nonzero && redeemOk;
      results.push(check("H110", ok ? "PASS" : "FAIL", {
        expected: "nonzero fractional claim and redemption drift <= 1 raw unit",
        observed: {
          attemptedRaw: fractional.attemptedRaw.toString(),
          rawClaim: fractional.rawClaim.toString(),
          returnedRaw: fractional.returnedRaw?.toString(),
          error: fractional.error,
        },
        errorCode: ok ? undefined : ErrorCodes.INVARIANT_ROUNDING_EXCEEDED,
      }));
    }
  }

  results.push(check("H201", "SKIP", {
    expected: "optional Binance reference context",
    observed: "not required for deterministic conformance",
  }));
  results.push(check("H202", "SKIP", {
    expected: "optional restriction context",
    observed: "not included in v1.1 core result",
  }));
  results.push(check("H203", "SKIP", {
    expected: "optional custom invariant",
    observed: "no custom invariant supplied",
  }));
  return results;
}

export function registryStatusEncode(status: RunStatus): number {
  if (status === "PASS") return 1;
  if (status === "FAIL") return 2;
  if (status === "INCOMPLETE") return 3;
  return 0;
}

export function computeReportId(args: {
  chainId: number;
  asset: Address;
  target: Address;
  suiteHash: Hex;
  resultHash: Hex;
  blockNumber: bigint | number;
}): Hex {
  return keccak256(
    encodeAbiParameters(
      parseAbiParameters("uint256, address, address, bytes32, bytes32, uint64"),
      [
        BigInt(args.chainId),
        args.asset,
        args.target,
        args.suiteHash,
        args.resultHash,
        BigInt(args.blockNumber),
      ],
    ),
  );
}

import { getAddress, type Address, type Hex } from "viem";
import {
  DEFAULT_RPC,
  bstockAbi,
  findFundedHolder,
  findMultiplierUpdater,
  forkPublicClient,
  forkRevert,
  forkSnapshot,
  forkWarp,
  inspectToken,
  readTransferUiEvidence,
  scheduleMultiplierOnFork,
  startAnvilFork,
  transferFromImpersonated,
  tryRead,
} from "./chain";
import { ErrorCodes, HoroiError } from "./errors";
import {
  buildReport,
  check,
  effectiveAmount,
  evaluateIntegrationChecks,
  evaluateTokenChecks,
  type EconomicSnapshot,
  type EvaluationInput,
  type HoroiReport,
  type ProfileKind,
  type ScenarioEvidence,
} from "./engine";
import { builtinAdapter, type AdapterContext, type ProtocolAdapter } from "./adapters";

export type RunInput = {
  runId: string;
  asset: Address;
  target: Address | null;
  profile: ProfileKind;
  blockNumber?: bigint | null;
  rpcUrl?: string;
  adapter?: ProtocolAdapter;
  holder?: Address;
  updater?: Address;
  prepareForkTarget?: (args: { rpcUrl: string; asset: Address; blockNumber: bigint }) => Promise<Address>;
  dryRunTokenOnly?: boolean;
  onProgress?: (completed: number, total: number, stage: string) => void | Promise<void>;
  onDiagnostic?: (stage: string, error?: unknown) => void;
};

export type RunResult = {
  report: HoroiReport;
  progress: { completed: number; total: number };
};

const USER_A = "0x00000000000000000000000000000000000000a1" as Address;
const USER_B = "0x00000000000000000000000000000000000000b2" as Address;
const ZERO = "0x0000000000000000000000000000000000000000" as Address;

function pow10(decimals: number): bigint {
  return 10n ** BigInt(Math.max(0, decimals));
}

function chooseBaseAmount(decimals: number, holderBalance: bigint): bigint {
  const configured = process.env.HOROI_TEST_RAW_AMOUNT;
  if (configured && /^\d+$/.test(configured)) {
    const value = BigInt(configured);
    if (value > 0n && value * 8n <= holderBalance) return value;
  }
  const desired = pow10(decimals) / 1_000n || 1n; // ~0.001 displayed token before scaling
  const affordable = holderBalance / 20n;
  const amount = desired < affordable ? desired : affordable;
  return amount > 0n ? amount : 1n;
}

async function readBalance(rpcUrl: string, asset: Address, account: Address): Promise<bigint> {
  const client = forkPublicClient(rpcUrl);
  return (await tryRead<bigint>(client, {
    address: asset,
    abi: bstockAbi,
    functionName: "balanceOf",
    functionArgs: [account],
  })) ?? 0n;
}

async function readMultiplier(rpcUrl: string, asset: Address): Promise<bigint> {
  const client = forkPublicClient(rpcUrl);
  const value = await tryRead<bigint>(client, {
    address: asset,
    abi: bstockAbi,
    functionName: "uiMultiplier",
  });
  if (value === undefined || value <= 0n) {
    throw new HoroiError(ErrorCodes.MULTIPLIER_INVALID, "fork uiMultiplier unavailable");
  }
  return value;
}

async function probeOptionalInterfaces(args: {
  rpcUrl: string;
  asset: Address;
  account: Address;
  raw: bigint;
  multiplier: bigint;
  conversion: boolean;
  balances: boolean;
}): Promise<Pick<EvaluationInput, "conversion" | "balanceUi">> {
  const client = forkPublicClient(args.rpcUrl);
  const output: Pick<EvaluationInput, "conversion" | "balanceUi"> = {};

  if (args.conversion) {
    const observedUi = await tryRead<bigint>(client, {
      address: args.asset,
      abi: bstockAbi,
      functionName: "toUIAmount",
      functionArgs: [args.raw],
    });
    const observedBackRaw = observedUi === undefined
      ? undefined
      : await tryRead<bigint>(client, {
          address: args.asset,
          abi: bstockAbi,
          functionName: "fromUIAmount",
          functionArgs: [observedUi],
        });
    output.conversion = {
      raw: args.raw,
      observedUi,
      expectedUi: effectiveAmount(args.raw, args.multiplier),
      observedBackRaw,
    };
  }

  if (args.balances) {
    const rawBalance = await readBalance(args.rpcUrl, args.asset, args.account);
    const observedUi = await tryRead<bigint>(client, {
      address: args.asset,
      abi: bstockAbi,
      functionName: "balanceOfUI",
      functionArgs: [args.account],
    });
    output.balanceUi = {
      account: args.account,
      rawBalance,
      observedUi,
      expectedUi: effectiveAmount(rawBalance, args.multiplier),
    };
  }

  return output;
}

async function baselineRun(args: {
  rpcUrl: string;
  asset: Address;
  target: Address;
  adapter: ProtocolAdapter;
  amount: bigint;
  multiplier: bigint;
}): Promise<NonNullable<EvaluationInput["baseline"]>> {
  const snapshot = await forkSnapshot(args.rpcUrl);
  const ctx: AdapterContext = {
    asset: args.asset,
    target: args.target,
    forkRpc: args.rpcUrl,
    user: USER_A,
    rawAmount: args.amount,
    uiMultiplier: args.multiplier,
  };
  try {
    await args.adapter.setup(ctx);
    await args.adapter.deposit(ctx, args.amount);
    const position = await args.adapter.position(ctx, USER_A);
    const expected = await args.adapter.expectedClaim(ctx, USER_A);
    let returnedRaw: bigint | undefined;
    if (args.adapter.redeemable && (position.shareBalance ?? 0n) > 0n) {
      returnedRaw = (await args.adapter.redeem(ctx, position.shareBalance as bigint)).returnedRaw;
    }
    return {
      deposited: true,
      rawClaim: position.rawClaim,
      shares: position.shareBalance,
      returnedRaw,
      expectedRaw: expected.rawClaim,
    };
  } catch (error) {
    return { deposited: false, error: String(error) };
  } finally {
    await forkRevert(args.rpcUrl, snapshot).catch(() => undefined);
  }
}

async function scenarioRun(args: {
  rpcUrl: string;
  asset: Address;
  target: Address;
  adapter: ProtocolAdapter;
  amount: bigint;
  oldMultiplier: bigint;
  newMultiplier: bigint;
  updater: Address;
  label: ScenarioEvidence["label"];
  twoUsers?: boolean;
  onStage?: (stage: string) => void;
}): Promise<{
  scenario?: ScenarioEvidence;
  scheduled?: NonNullable<EvaluationInput["scheduled"]>;
  multiUser?: NonNullable<NonNullable<EvaluationInput["scenarios"]>["multiUser"]>;
  error?: string;
}> {
  let snapshot: string | undefined;
  const ctxA: AdapterContext = {
    asset: args.asset,
    target: args.target,
    forkRpc: args.rpcUrl,
    user: USER_A,
    rawAmount: args.amount,
    uiMultiplier: args.oldMultiplier,
  };
  const ctxB: AdapterContext = { ...ctxA, user: USER_B, rawAmount: args.amount * 2n };

  try {
    args.onStage?.("SNAPSHOT");
    snapshot = await forkSnapshot(args.rpcUrl);
    const client = forkPublicClient(args.rpcUrl);
    args.onStage?.("SETUP");
    await args.adapter.setup(ctxA);
    args.onStage?.("DEPOSIT_USER_A");
    await args.adapter.deposit(ctxA, args.amount);
    if (args.twoUsers) {
      args.onStage?.("DEPOSIT_USER_B");
      await args.adapter.deposit(ctxB, args.amount * 2n);
    }

    args.onStage?.("POSITION_BEFORE");
    const beforeA = await args.adapter.position(ctxA, USER_A);
    const expectedBeforeA = await args.adapter.expectedClaim(ctxA, USER_A);
    const beforeB = args.twoUsers ? await args.adapter.position(ctxB, USER_B) : undefined;
    if (beforeA.rawClaim <= 0n) throw new Error("zero raw claim after deposit");

    const currentBlock = await client.getBlock({ blockTag: "latest" });
    const effectiveAt = currentBlock.timestamp + 60n;
    args.onStage?.("SCHEDULE_MULTIPLIER");
    const txHash = await scheduleMultiplierOnFork({
      rpcUrl: args.rpcUrl,
      asset: args.asset,
      updater: args.updater,
      newMultiplier: args.newMultiplier,
      effectiveAt,
    });

    args.onStage?.("PRE_EFFECTIVE_WARP");
    await forkWarp(args.rpcUrl, effectiveAt - 1n);
    args.onStage?.("PRE_EFFECTIVE_READ");
    const preActiveMultiplier = await readMultiplier(args.rpcUrl, args.asset);
    args.onStage?.("POST_EFFECTIVE_WARP");
    await forkWarp(args.rpcUrl, effectiveAt + 1n);
    args.onStage?.("POST_EFFECTIVE_READ");
    const postActiveMultiplier = await readMultiplier(args.rpcUrl, args.asset);

    const afterCtxA = { ...ctxA, uiMultiplier: postActiveMultiplier };
    const afterCtxB = { ...ctxB, uiMultiplier: postActiveMultiplier };
    args.onStage?.("POSITION_AFTER");
    const afterA = await args.adapter.position(afterCtxA, USER_A);
    const expectedAfterA = await args.adapter.expectedClaim(afterCtxA, USER_A);
    const afterB = args.twoUsers ? await args.adapter.position(afterCtxB, USER_B) : undefined;

    let returnedRaw: bigint | undefined;
    if (args.adapter.redeemable && (afterA.shareBalance ?? 0n) > 0n) {
      args.onStage?.("REDEEM");
      returnedRaw = (await args.adapter.redeem(afterCtxA, afterA.shareBalance as bigint)).returnedRaw;
    }

    const scenario: ScenarioEvidence = {
      label: args.label,
      requestedMultiplier: args.newMultiplier,
      activeMultiplier: postActiveMultiplier,
      rawBefore: expectedBeforeA.rawClaim,
      rawAfter: afterA.rawClaim,
      effectiveBefore: beforeA.effectiveClaim,
      effectiveAfter: afterA.effectiveClaim,
      expectedEffectiveAfter: expectedAfterA.effectiveClaim,
      returnedRaw,
      sharesBefore: beforeA.shareBalance,
      txHash,
    };

    return {
      scenario,
      scheduled: {
        reproduced: true,
        updater: args.updater,
        txHash,
        effectiveAt,
        preActiveMultiplier,
        postActiveMultiplier,
        expectedPre: args.oldMultiplier,
        expectedPost: args.newMultiplier,
      },
      multiUser: beforeB && afterB ? {
        beforeA: beforeA.rawClaim,
        beforeB: beforeB.rawClaim,
        afterA: afterA.rawClaim,
        afterB: afterB.rawClaim,
      } : undefined,
    };
  } catch (error) {
    return {
      scheduled: { reproduced: false, updater: args.updater, error: String(error) },
      error: String(error),
    };
  } finally {
    if (snapshot) {
      args.onStage?.("REVERT");
      await forkRevert(args.rpcUrl, snapshot).catch(() => undefined);
    }
  }
}

async function fractionalRun(args: {
  rpcUrl: string;
  asset: Address;
  target: Address;
  adapter: ProtocolAdapter;
  baseAmount: bigint;
  multiplier: bigint;
}): Promise<NonNullable<NonNullable<EvaluationInput["scenarios"]>["fractional"]>> {
  const candidates = [
    args.baseAmount / 10_000n,
    args.baseAmount / 1_000n,
    args.baseAmount / 100n,
    args.baseAmount / 10n,
    1n,
  ].filter((value, index, all) => value > 0n && all.indexOf(value) === index);

  let lastError = "no fractional candidate executed";
  for (const amount of candidates) {
    const snapshot = await forkSnapshot(args.rpcUrl);
    const ctx: AdapterContext = {
      asset: args.asset,
      target: args.target,
      forkRpc: args.rpcUrl,
      user: USER_A,
      rawAmount: amount,
      uiMultiplier: args.multiplier,
    };
    try {
      await args.adapter.setup(ctx);
      await args.adapter.deposit(ctx, amount);
      const position = await args.adapter.position(ctx, USER_A);
      let returnedRaw: bigint | undefined;
      if (args.adapter.redeemable && (position.shareBalance ?? 0n) > 0n) {
        returnedRaw = (await args.adapter.redeem(ctx, position.shareBalance as bigint)).returnedRaw;
      }
      return {
        attemptedRaw: amount,
        deposited: true,
        rawClaim: position.rawClaim,
        returnedRaw,
      };
    } catch (error) {
      lastError = String(error);
    } finally {
      await forkRevert(args.rpcUrl, snapshot).catch(() => undefined);
    }
  }
  return { attemptedRaw: candidates[0] ?? 1n, deposited: false, error: lastError };
}

export async function runConformance(input: RunInput): Promise<RunResult> {
  const rpcUrl = input.rpcUrl ?? DEFAULT_RPC;
  const total = 8;
  let completed = 0;
  const startedAt = Date.now();
  let fork: Awaited<ReturnType<typeof startAnvilFork>> | null = null;
  let target = input.target;

  const progress = async (stage: string) => {
    completed = Math.min(total, completed + 1);
    await input.onProgress?.(completed, total, stage);
  };
  const diagnostic = (stage: string, error?: unknown) => input.onDiagnostic?.(stage, error);

  try {
    diagnostic("ARCHIVE_INSPECTION");
    const token = await inspectToken(input.asset, {
      rpcUrl,
      blockNumber: input.blockNumber ?? undefined,
    });
    await progress("inspect");

    const base: EvaluationInput = {
      interfaces: token.interfaces,
      uiMultiplier: token.uiMultiplier,
      newUIMultiplier: token.newUIMultiplier,
      effectiveAt: token.effectiveAt,
      forkTimestamp: token.blockTimestamp,
      forkAvailable: false,
      adapterAvailable: false,
    };

    if (!input.dryRunTokenOnly) {
      diagnostic("FORK_START");
      try {
        fork = await startAnvilFork({ rpcUrl, blockNumber: token.blockNumber });
        base.forkAvailable = true;
        base.forkTimestamp = fork.blockTimestamp;
        diagnostic("FORK_STARTED");
      } catch (error) {
        fork = null;
        diagnostic("FORK_START_FAILED", error);
      }
    }
    if (fork && input.prepareForkTarget) {
      diagnostic("TARGET_DEPLOYMENT");
      target = await input.prepareForkTarget({
        rpcUrl: fork.rpcUrl,
        asset: input.asset,
        blockNumber: fork.blockNumber,
      });
      diagnostic("TARGET_DEPLOYED");
    }
    await progress("fork");

    let adapter: ProtocolAdapter | null = null;
    if (target && input.profile !== "custody") {
      adapter = input.adapter ?? builtinAdapter(input.profile);
      base.adapterAvailable = true;
      base.adapterRedeemable = adapter.redeemable;
    } else if (target && input.profile === "custody") {
      // Generic custody has no standardized redemption ABI. Keep token-level checks
      // available but do not allow a full conformance PASS from a synthetic redeem.
      adapter = builtinAdapter("custody");
      base.adapterAvailable = false;
      base.adapterRedeemable = false;
    }

    let economics: HoroiReport["economics"];
    let holder: Address | null = null;
    let baseAmount = 0n;
    let updater: Address | null = null;

    if (fork) {
      const forkClient = forkPublicClient(fork.rpcUrl);
      const preferredHolder = input.holder ?? (
        process.env.HOROI_HOLDER_ADDRESS as Address | undefined
      );
      diagnostic(preferredHolder ? "HOLDER_VERIFICATION" : "HOLDER_DISCOVERY");
      holder = await findFundedHolder(forkClient, input.asset, 1n, { preferred: preferredHolder });
      diagnostic(holder ? "HOLDER_VERIFIED" : "HOLDER_NOT_FOUND");
      if (holder) {
        const holderBalance = await readBalance(fork.rpcUrl, input.asset, holder);
        baseAmount = chooseBaseAmount(token.decimals, holderBalance);
        if (baseAmount * 8n <= holderBalance) {
          diagnostic("HOLDER_FUNDING");
          const fundAHash = await transferFromImpersonated(
            fork.rpcUrl,
            input.asset,
            holder,
            USER_A,
            baseAmount * 4n,
          );
          await transferFromImpersonated(
            fork.rpcUrl,
            input.asset,
            holder,
            USER_B,
            baseAmount * 3n,
          );
          const transferEvidence = await readTransferUiEvidence(forkClient, input.asset, fundAHash);
          base.transferUiEvents = transferEvidence.map((event) => ({
            ...event,
            expectedUi: effectiveAmount(event.rawAmount, token.uiMultiplier),
          }));

          Object.assign(base, await probeOptionalInterfaces({
            rpcUrl: fork.rpcUrl,
            asset: input.asset,
            account: USER_A,
            raw: baseAmount,
            multiplier: token.uiMultiplier,
            conversion: token.interfaces.IScaledUIAmountConversion === true,
            balances: token.interfaces.IScaledUIAmountBalances === true,
          }));
        }
      }
      const configuredUpdater = input.updater ?? (process.env.HOROI_MULTIPLIER_UPDATER as Address | undefined);
      if (configuredUpdater) {
        updater = configuredUpdater;
        diagnostic("UPDATER_CONFIGURED");
      } else {
        diagnostic("UPDATER_DISCOVERY");
        updater = await findMultiplierUpdater(forkClient, input.asset);
        diagnostic(updater ? "UPDATER_DISCOVERED" : "UPDATER_NOT_FOUND");
      }
    }
    await progress("funding-and-probes");

    if (fork && adapter && target && base.adapterAvailable && holder && baseAmount > 0n) {
      diagnostic("BASELINE");
      base.baseline = await baselineRun({
        rpcUrl: fork.rpcUrl,
        asset: input.asset,
        target,
        adapter,
        amount: baseAmount,
        multiplier: token.uiMultiplier,
      });
      diagnostic(base.baseline.deposited ? "BASELINE_COMPLETE" : "BASELINE_FAILED", base.baseline.error);

      if (base.baseline.rawClaim !== undefined) {
        const before: EconomicSnapshot = {
          rawClaim: base.baseline.rawClaim.toString(),
          multiplier: token.uiMultiplier.toString(),
          effectiveClaim: effectiveAmount(base.baseline.rawClaim, token.uiMultiplier).toString(),
          economicNotional: null,
        };
        economics = { before };
      }
    }
    await progress("baseline");

    if (fork && adapter && target && base.adapterAvailable && holder && baseAmount > 0n && updater) {
      const scenarios: NonNullable<EvaluationInput["scenarios"]> = {};
      diagnostic("FORWARD_SPLIT");
      const forward = await scenarioRun({
        rpcUrl: fork.rpcUrl,
        asset: input.asset,
        target,
        adapter,
        amount: baseAmount,
        oldMultiplier: token.uiMultiplier,
        newMultiplier: token.uiMultiplier * 2n,
        updater,
        label: "forwardSplit",
        twoUsers: true,
        onStage: (stage) => diagnostic(`SCENARIO_FORWARD_SPLIT_${stage}`),
      });
      diagnostic(forward.error ? "FORWARD_SPLIT_FAILED" : "FORWARD_SPLIT_COMPLETE", forward.error);
      diagnostic(forward.multiUser ? "MULTI_USER_COMPLETE" : "MULTI_USER_INCOMPLETE", forward.error);
      scenarios.forwardSplit = forward.scenario;
      scenarios.multiUser = forward.multiUser;
      base.scheduled = forward.scheduled;

      diagnostic("REVERSE_SPLIT");
      const reverse = await scenarioRun({
        rpcUrl: fork.rpcUrl,
        asset: input.asset,
        target,
        adapter,
        amount: baseAmount,
        oldMultiplier: token.uiMultiplier,
        newMultiplier: token.uiMultiplier / 10n,
        updater,
        label: "reverseSplit",
        onStage: (stage) => diagnostic(`SCENARIO_REVERSE_SPLIT_${stage}`),
      });
      diagnostic(reverse.error ? "REVERSE_SPLIT_FAILED" : "REVERSE_SPLIT_COMPLETE", reverse.error);
      scenarios.reverseSplit = reverse.scenario;

      diagnostic("DIVIDEND");
      const dividend = await scenarioRun({
        rpcUrl: fork.rpcUrl,
        asset: input.asset,
        target,
        adapter,
        amount: baseAmount,
        oldMultiplier: token.uiMultiplier,
        newMultiplier: (token.uiMultiplier * 1008n) / 1000n,
        updater,
        label: "dividend",
        onStage: (stage) => diagnostic(`SCENARIO_DIVIDEND_${stage}`),
      });
      diagnostic(dividend.error ? "DIVIDEND_FAILED" : "DIVIDEND_COMPLETE", dividend.error);
      scenarios.dividend = dividend.scenario;

      diagnostic("FRACTIONAL");
      scenarios.fractional = await fractionalRun({
        rpcUrl: fork.rpcUrl,
        asset: input.asset,
        target,
        adapter,
        baseAmount,
        multiplier: token.uiMultiplier,
      });
      diagnostic(scenarios.fractional.deposited ? "FRACTIONAL_COMPLETE" : "FRACTIONAL_FAILED", scenarios.fractional.error);
      base.scenarios = scenarios;

      if (forward.scenario && economics?.before) {
        economics.after = {
          rawClaim: forward.scenario.rawAfter.toString(),
          multiplier: forward.scenario.activeMultiplier.toString(),
          effectiveClaim: forward.scenario.effectiveAfter.toString(),
          economicNotional: null,
        };
      }
    } else if (fork && !updater) {
      base.scheduled = {
        reproduced: false,
        error: "No authorized multiplier updater could be discovered from owner() or recent UIMultiplierUpdated transactions.",
      };
    }
    await progress("corporate-actions");

    const checks = [
      ...evaluateTokenChecks(base),
      ...evaluateIntegrationChecks(base),
    ];
    await progress("evaluate");

    diagnostic("REPORT_BUILD");
    const report = buildReport({
      runId: input.runId,
      chainId: token.chainId,
      blockNumber: Number(token.blockNumber),
      blockHash: token.blockHash,
      testedAt: startedAt,
      asset: getAddress(input.asset),
      target: target ? getAddress(target) : ZERO,
      profile: input.profile,
      token: {
        decimals: token.decimals,
        uiMultiplier: token.uiMultiplier.toString(),
        newUIMultiplier: token.newUIMultiplier.toString(),
        effectiveAt: Number(token.effectiveAt),
        supportedInterfaces: Object.entries(token.interfaces)
          .filter(([, supported]) => supported)
          .map(([name]) => name),
      },
      checks,
      economics,
    });
    diagnostic("REPORT_BUILT");
    await progress("report");
    completed = total;
    await input.onProgress?.(completed, total, "complete");
    return { report, progress: { completed, total } };
  } catch (error) {
    if (error instanceof HoroiError) {
      const report = buildReport({
        runId: input.runId,
        chainId: 56,
        blockNumber: 0,
        blockHash: "0x",
        testedAt: startedAt,
        asset: input.asset,
        target: target ?? ZERO,
        profile: input.profile,
        token: {
          decimals: 18,
          uiMultiplier: "0",
          newUIMultiplier: "0",
          effectiveAt: 0,
          supportedInterfaces: [],
        },
        checks: [check("H001", "ERROR", {
          expected: "inspectable BEP-677 asset",
          observed: error.message,
          errorCode: error.code,
        })],
      });
      diagnostic("ERROR_REPORT_BUILT", error);
      return {
        report: { ...report, status: "ERROR" },
        progress: { completed, total },
      };
    }
    throw error;
  } finally {
    if (fork) await fork.stop();
  }
}

export function publishPayload(report: HoroiReport, registry: string | null) {
  return {
    registry,
    args: {
      asset: report.asset as Address,
      target: report.target as Address,
      suiteHash: report.suiteHash as Hex,
      resultHash: report.resultHash as Hex,
      blockNumber: BigInt(report.blockNumber),
      status: report.status === "PASS" ? 1 : report.status === "FAIL" ? 2 : report.status === "INCOMPLETE" ? 3 : 0,
    },
  };
}

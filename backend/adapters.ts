import {
  createPublicClient,
  createWalletClient,
  http,
  type Address,
  type PublicClient,
  type Abi,
} from "viem";
import { bsc } from "viem/chains";
import { bstockAbi, erc4626Abi, impersonate, stopImpersonating } from "./chain";
import { ErrorCodes, HoroiError } from "./errors";

export type AdapterKind = "custody" | "erc4626" | "custom";

export type AdapterContext = {
  asset: Address;
  target: Address;
  forkRpc: string;
  user: Address;
  rawAmount: bigint;
  uiMultiplier: bigint;
};

export type PositionSnapshot = {
  rawClaim: bigint;
  shareBalance?: bigint;
  targetAssetBalance?: bigint;
  effectiveClaim: bigint;
  notes?: string;
};

export type ProtocolAdapter = {
  kind: AdapterKind;
  redeemable: boolean;
  setup(ctx: AdapterContext): Promise<void>;
  deposit(ctx: AdapterContext, amount: bigint): Promise<void>;
  position(ctx: AdapterContext, user: Address): Promise<PositionSnapshot>;
  expectedClaim(ctx: AdapterContext, user: Address): Promise<PositionSnapshot>;
  redeem(ctx: AdapterContext, amountOrShares: bigint): Promise<{ returnedRaw: bigint }>;
};

export function effectiveOf(raw: bigint, multiplier: bigint): bigint {
  return (raw * multiplier) / 10n ** 18n;
}

function clients(rpcUrl: string) {
  const chain = { ...bsc, id: 56 };
  const publicClient = createPublicClient({ chain, transport: http(rpcUrl) }) as PublicClient;
  return { chain, publicClient };
}

function walletFor(rpcUrl: string, user: Address) {
  const chain = { ...bsc, id: 56 };
  return createWalletClient({ account: user, chain, transport: http(rpcUrl) });
}

async function asUser<T>(ctx: AdapterContext, fn: () => Promise<T>): Promise<T> {
  await impersonate(ctx.forkRpc, ctx.user);
  try {
    return await fn();
  } finally {
    await stopImpersonating(ctx.forkRpc, ctx.user);
  }
}

export const custodyAdapter: ProtocolAdapter = {
  kind: "custody",
  redeemable: false,
  async setup() {
    // The generic custody profile can prove receipt/accounting only. A generic address
    // has no standardized withdrawal ABI, so Horoi never pretends redemption occurred.
  },
  async deposit(ctx, amount) {
    await asUser(ctx, async () => {
      const { publicClient, chain } = clients(ctx.forkRpc);
      const wallet = walletFor(ctx.forkRpc, ctx.user);
      try {
        const hash = await wallet.writeContract({
          address: ctx.asset,
          abi: bstockAbi,
          functionName: "transfer",
          args: [ctx.target, amount],
          account: ctx.user,
          chain,
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") throw new Error("transfer reverted");
      } catch (err) {
        throw new HoroiError(ErrorCodes.DEPOSIT_FAILED, String(err));
      }
    });
  },
  async position(ctx) {
    const { publicClient } = clients(ctx.forkRpc);
    const raw = ((await publicClient.readContract({
      address: ctx.asset,
      abi: bstockAbi,
      functionName: "balanceOf",
      args: [ctx.target],
    }).catch(() => 0n)) ?? 0n) as bigint;
    return {
      rawClaim: raw,
      targetAssetBalance: raw,
      effectiveClaim: effectiveOf(raw, ctx.uiMultiplier),
      notes: "Generic custody profile tracks target-held raw balance; withdrawal is not standardized.",
    };
  },
  async expectedClaim(ctx, user) {
    return custodyAdapter.position(ctx, user);
  },
  async redeem() {
    throw new HoroiError(
      ErrorCodes.TARGET_UNSUPPORTED,
      "generic custody target has no standardized redeem/withdraw operation",
    );
  },
};

export const erc4626Adapter: ProtocolAdapter = {
  kind: "erc4626",
  redeemable: true,
  async setup(ctx) {
    const { publicClient } = clients(ctx.forkRpc);
    try {
      const asset = (await publicClient.readContract({
        address: ctx.target,
        abi: erc4626Abi,
        functionName: "asset",
      })) as Address;
      if (asset.toLowerCase() !== ctx.asset.toLowerCase()) {
        throw new HoroiError(
          ErrorCodes.TARGET_UNSUPPORTED,
          `vault asset ${asset} != tested bStock ${ctx.asset}`,
        );
      }
    } catch (err) {
      if (err instanceof HoroiError) throw err;
      throw new HoroiError(ErrorCodes.TARGET_UNSUPPORTED, String(err));
    }
  },
  async deposit(ctx, amount) {
    await asUser(ctx, async () => {
      const { publicClient, chain } = clients(ctx.forkRpc);
      const wallet = walletFor(ctx.forkRpc, ctx.user);
      try {
        const approveHash = await wallet.writeContract({
          address: ctx.asset,
          abi: bstockAbi,
          functionName: "approve",
          args: [ctx.target, amount],
          account: ctx.user,
          chain,
        });
        const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveHash });
        if (approveReceipt.status !== "success") throw new Error("approve reverted");

        const hash = await wallet.writeContract({
          address: ctx.target,
          abi: erc4626Abi,
          functionName: "deposit",
          args: [amount, ctx.user],
          account: ctx.user,
          chain,
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") throw new Error("deposit reverted");
      } catch (err) {
        throw new HoroiError(ErrorCodes.DEPOSIT_FAILED, String(err));
      }
    });
  },
  async position(ctx, user) {
    const { publicClient } = clients(ctx.forkRpc);
    const shares = ((await publicClient.readContract({
      address: ctx.target,
      abi: erc4626Abi,
      functionName: "balanceOf",
      args: [user],
    }).catch(() => 0n)) ?? 0n) as bigint;

    const preview = ((await publicClient.readContract({
      address: ctx.target,
      abi: erc4626Abi,
      functionName: "previewRedeem",
      args: [shares],
    }).catch(async () => publicClient.readContract({
      address: ctx.target,
      abi: erc4626Abi,
      functionName: "convertToAssets",
      args: [shares],
    }).catch(() => 0n))) ?? 0n) as bigint;

    const targetAsset = ((await publicClient.readContract({
      address: ctx.asset,
      abi: bstockAbi,
      functionName: "balanceOf",
      args: [ctx.target],
    }).catch(() => 0n)) ?? 0n) as bigint;

    return {
      rawClaim: preview,
      shareBalance: shares,
      targetAssetBalance: targetAsset,
      effectiveClaim: effectiveOf(preview, ctx.uiMultiplier),
    };
  },
  async expectedClaim(ctx, user) {
    return erc4626Adapter.position(ctx, user);
  },
  async redeem(ctx, shares) {
    return asUser(ctx, async () => {
      const { publicClient, chain } = clients(ctx.forkRpc);
      const before = ((await publicClient.readContract({
        address: ctx.asset,
        abi: bstockAbi,
        functionName: "balanceOf",
        args: [ctx.user],
      }).catch(() => 0n)) ?? 0n) as bigint;
      const wallet = walletFor(ctx.forkRpc, ctx.user);
      try {
        const hash = await wallet.writeContract({
          address: ctx.target,
          abi: erc4626Abi,
          functionName: "redeem",
          args: [shares, ctx.user, ctx.user],
          account: ctx.user,
          chain,
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") throw new Error("redeem reverted");
      } catch (err) {
        throw new HoroiError(ErrorCodes.REDEEM_FAILED, String(err));
      }
      const after = ((await publicClient.readContract({
        address: ctx.asset,
        abi: bstockAbi,
        functionName: "balanceOf",
        args: [ctx.user],
      }).catch(() => 0n)) ?? 0n) as bigint;
      return { returnedRaw: after - before };
    });
  },
};

const naiveEffectiveClaimAbi = [{
  type: "function",
  name: "effectiveClaimOf",
  stateMutability: "view",
  inputs: [{ name: "owner", type: "address" }],
  outputs: [{ type: "uint256" }],
}] as const satisfies Abi;

function vaultAdapter(naive: boolean): ProtocolAdapter {
  const adapter: ProtocolAdapter = {
    kind: "custom",
    redeemable: true,
    async setup(ctx) {
      const { publicClient } = clients(ctx.forkRpc);
      try {
        const asset = (await publicClient.readContract({
          address: ctx.target,
          abi: erc4626Abi,
          functionName: "asset",
        })) as Address;
        if (asset.toLowerCase() !== ctx.asset.toLowerCase()) {
          throw new HoroiError(ErrorCodes.TARGET_UNSUPPORTED, `vault asset ${asset} != tested bStock ${ctx.asset}`);
        }
      } catch (err) {
        if (err instanceof HoroiError) throw err;
        throw new HoroiError(ErrorCodes.TARGET_UNSUPPORTED, String(err));
      }
    },
    async deposit(ctx, amount) {
      await asUser(ctx, async () => {
        const { publicClient, chain } = clients(ctx.forkRpc);
        const wallet = walletFor(ctx.forkRpc, ctx.user);
        const approveHash = await wallet.writeContract({
          address: ctx.asset,
          abi: bstockAbi,
          functionName: "approve",
          args: [ctx.target, amount],
          account: ctx.user,
          chain,
        });
        const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveHash });
        if (approveReceipt.status !== "success") throw new HoroiError(ErrorCodes.DEPOSIT_FAILED, "approve reverted");
        const hash = await wallet.writeContract({
          address: ctx.target,
          abi: erc4626Abi,
          functionName: "deposit",
          args: [amount, ctx.user],
          account: ctx.user,
          chain,
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") throw new HoroiError(ErrorCodes.DEPOSIT_FAILED, "deposit reverted");
      });
    },
    async position(ctx, user) {
      const { publicClient } = clients(ctx.forkRpc);
      const shares = ((await publicClient.readContract({
        address: ctx.target,
        abi: erc4626Abi,
        functionName: "balanceOf",
        args: [user],
      })) ?? 0n) as bigint;
      const rawClaim = ((await publicClient.readContract({
        address: ctx.target,
        abi: erc4626Abi,
        functionName: "previewRedeem",
        args: [shares],
      })) ?? 0n) as bigint;
      const targetAssetBalance = ((await publicClient.readContract({
        address: ctx.asset,
        abi: bstockAbi,
        functionName: "balanceOf",
        args: [ctx.target],
      })) ?? 0n) as bigint;
      const effectiveClaim = naive
        ? ((await publicClient.readContract({
            address: ctx.target,
            abi: naiveEffectiveClaimAbi,
            functionName: "effectiveClaimOf",
            args: [user],
          })) ?? 0n) as bigint
        : effectiveOf(rawClaim, ctx.uiMultiplier);
      return { rawClaim, shareBalance: shares, targetAssetBalance, effectiveClaim };
    },
    async expectedClaim(ctx, user) {
      const observed = await adapter.position(ctx, user);
      return { ...observed, effectiveClaim: effectiveOf(observed.rawClaim, ctx.uiMultiplier) };
    },
    async redeem(ctx, shares) {
      return asUser(ctx, async () => {
        const { publicClient, chain } = clients(ctx.forkRpc);
        const before = ((await publicClient.readContract({
          address: ctx.asset,
          abi: bstockAbi,
          functionName: "balanceOf",
          args: [ctx.user],
        })) ?? 0n) as bigint;
        const wallet = walletFor(ctx.forkRpc, ctx.user);
        const hash = await wallet.writeContract({
          address: ctx.target,
          abi: erc4626Abi,
          functionName: "redeem",
          args: [shares, ctx.user, ctx.user],
          account: ctx.user,
          chain,
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status !== "success") throw new HoroiError(ErrorCodes.REDEEM_FAILED, "redeem reverted");
        const after = ((await publicClient.readContract({
          address: ctx.asset,
          abi: bstockAbi,
          functionName: "balanceOf",
          args: [ctx.user],
        })) ?? 0n) as bigint;
        return { returnedRaw: after - before };
      });
    },
  };
  return adapter;
}

/** Transparent production-neutral test harness adapter. */
export const horoiVaultAdapter = vaultAdapter(false);

/** TEST/INCOMPATIBLE only: detects a stale effective-unit snapshot. */
export const incompatibleHoroiVaultAdapter = vaultAdapter(true);

export function validateAdapter(adapter: ProtocolAdapter): void {
  for (const key of ["setup", "deposit", "position", "expectedClaim", "redeem"] as const) {
    if (typeof adapter[key] !== "function") {
      throw new HoroiError(ErrorCodes.ADAPTER_INVALID, `missing ${key}`);
    }
  }
  if (typeof adapter.redeemable !== "boolean") {
    throw new HoroiError(ErrorCodes.ADAPTER_INVALID, "missing redeemable capability flag");
  }
}

export function builtinAdapter(kind: AdapterKind): ProtocolAdapter {
  if (kind === "custody") return custodyAdapter;
  if (kind === "erc4626") return erc4626Adapter;
  throw new HoroiError(ErrorCodes.ADAPTER_INVALID, "custom profile requires adapter module");
}

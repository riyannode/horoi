import {
  createPublicClient,
  createTestClient,
  createWalletClient,
  decodeEventLog,
  http,
  parseAbiItem,
  type Abi,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { bsc } from "viem/chains";
import { ErrorCodes, HoroiError } from "./errors";

export const CHAIN_ID = 56;
export const DEFAULT_RPC = process.env.BSC_RPC_URL ?? "https://bsc-dataseed.bnbchain.org";

export const INTERFACE_IDS = {
  IERC165: "0x01ffc9a7",
  IScaledUIAmount: "0xa60bf13d",
  IScaledUIAmountNewUIMultiplier: "0x4bd27648",
  IScaledUIAmountConversion: "0x57854fc3",
  IScaledUIAmountBalances: "0xd890fd71",
  IERC8056Scheduled: "0xeb0093dd",
} as const;

export const bstockAbi = [
  {
    type: "function",
    name: "supportsInterface",
    stateMutability: "view",
    inputs: [{ name: "interfaceId", type: "bytes4" }],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "name",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "uiMultiplier",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "newUIMultiplier",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "effectiveAt",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "pendingMultiplier",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "multiplier", type: "uint256" },
      { name: "effectiveAt", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "hasPendingMultiplier",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "toUIAmount",
    stateMutability: "view",
    inputs: [{ name: "rawAmount", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "fromUIAmount",
    stateMutability: "view",
    inputs: [{ name: "uiAmount", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOfUI",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "totalSupplyUI",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "DEFAULT_ADMIN_ROLE",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "bytes32" }],
  },
  {
    type: "function",
    name: "getRoleMemberCount",
    stateMutability: "view",
    inputs: [{ name: "role", type: "bytes32" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "getRoleMember",
    stateMutability: "view",
    inputs: [
      { name: "role", type: "bytes32" },
      { name: "index", type: "uint256" },
    ],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "hasRole",
    stateMutability: "view",
    inputs: [
      { name: "role", type: "bytes32" },
      { name: "account", type: "address" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "setUIMultiplier",
    stateMutability: "nonpayable",
    inputs: [
      { name: "newMultiplier", type: "uint256" },
      { name: "effectiveAtTimestamp", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "event",
    name: "Transfer",
    inputs: [
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: false, name: "value", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "TransferWithUIAmount",
    inputs: [
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "uiAmount", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "UIMultiplierUpdated",
    inputs: [
      { indexed: false, name: "oldMultiplier", type: "uint256" },
      { indexed: false, name: "newMultiplier", type: "uint256" },
      { indexed: false, name: "effectiveAtTimestamp", type: "uint256" },
    ],
  },
] as const satisfies Abi;

export const erc4626Abi = [
  {
    type: "function",
    name: "asset",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "deposit",
    stateMutability: "nonpayable",
    inputs: [
      { name: "assets", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [
      { name: "assets", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "owner", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "redeem",
    stateMutability: "nonpayable",
    inputs: [
      { name: "shares", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "owner", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "convertToAssets",
    stateMutability: "view",
    inputs: [{ name: "shares", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "previewRedeem",
    stateMutability: "view",
    inputs: [{ name: "shares", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
] as const satisfies Abi;

export type InspectedToken = {
  asset: Address;
  chainId: number;
  name?: string;
  symbol?: string;
  decimals: number;
  uiMultiplier: bigint;
  newUIMultiplier: bigint;
  effectiveAt: bigint;
  blockNumber: bigint;
  blockHash: Hex;
  blockTimestamp: bigint;
  interfaces: Record<string, boolean>;
  rpcClass: string;
};

export type ForkHandle = {
  port: number;
  pid: number;
  rpcUrl: string;
  blockNumber: bigint;
  blockTimestamp: bigint;
  stop: () => Promise<void>;
};

export type TransferUiEvidence = {
  txHash: Hex;
  rawAmount: bigint;
  uiAmount: bigint;
};

const transferEvent = parseAbiItem(
  "event Transfer(address indexed from, address indexed to, uint256 value)",
);
const multiplierEvent = parseAbiItem(
  "event UIMultiplierUpdated(uint256 oldMultiplier, uint256 newMultiplier, uint256 effectiveAtTimestamp)",
);

const rpcClassFrom = (url: string): string => {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "invalid-rpc";
  }
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function publicClient(rpcUrl = DEFAULT_RPC): PublicClient {
  return createPublicClient({ chain: bsc, transport: http(rpcUrl, { timeout: 20_000 }) });
}

export async function inspectToken(
  asset: Address,
  opts: { rpcUrl?: string; blockNumber?: bigint } = {},
): Promise<InspectedToken> {
  const rpcUrl = opts.rpcUrl ?? DEFAULT_RPC;
  const client = publicClient(rpcUrl);
  let code: Hex;
  let blockNumber = opts.blockNumber ?? 0n;
  let blockHash: Hex = "0x" as Hex;
  let blockTimestamp = 0n;
  let observedChainId = CHAIN_ID;

  try {
    observedChainId = await client.getChainId();
    if (observedChainId !== CHAIN_ID) {
      throw new HoroiError(
        ErrorCodes.CHAIN_MISMATCH,
        `expected BSC ${CHAIN_ID}, got ${observedChainId}`,
      );
    }
    const block = opts.blockNumber
      ? await client.getBlock({ blockNumber: opts.blockNumber })
      : await client.getBlock({ blockTag: "latest" });
    blockNumber = block.number;
    blockHash = block.hash as Hex;
    blockTimestamp = block.timestamp;
    code = (await client.getBytecode({ address: asset, blockNumber })) ?? "0x";
  } catch (err) {
    if (err instanceof HoroiError) throw err;
    throw new HoroiError(
      ErrorCodes.RPC_UNAVAILABLE,
      `BSC RPC unavailable or block missing: ${String(err)}`,
    );
  }

  if (code === "0x") {
    throw new HoroiError(ErrorCodes.ASSET_NOT_CONTRACT, "asset has no code");
  }

  const at = { blockNumber } as const;
  const safe = async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
    try {
      return await fn();
    } catch {
      return undefined;
    }
  };
  const supports = (id: Hex) =>
    safe(() =>
      client.readContract({
        address: asset,
        abi: bstockAbi,
        functionName: "supportsInterface",
        args: [id],
        ...at,
      }),
    );

  const [
    supportsIERC165,
    supportsCore,
    supportsPending,
    supportsConversion,
    supportsBalances,
    supportsScheduled,
    decimals,
    symbol,
    name,
    uiMultiplier,
    newUIMultiplier,
    effectiveAt,
  ] = await Promise.all([
    supports(INTERFACE_IDS.IERC165),
    supports(INTERFACE_IDS.IScaledUIAmount),
    supports(INTERFACE_IDS.IScaledUIAmountNewUIMultiplier),
    supports(INTERFACE_IDS.IScaledUIAmountConversion),
    supports(INTERFACE_IDS.IScaledUIAmountBalances),
    supports(INTERFACE_IDS.IERC8056Scheduled),
    safe(() => client.readContract({ address: asset, abi: bstockAbi, functionName: "decimals", ...at })),
    safe(() => client.readContract({ address: asset, abi: bstockAbi, functionName: "symbol", ...at })),
    safe(() => client.readContract({ address: asset, abi: bstockAbi, functionName: "name", ...at })),
    safe(() => client.readContract({ address: asset, abi: bstockAbi, functionName: "uiMultiplier", ...at })),
    safe(() => client.readContract({ address: asset, abi: bstockAbi, functionName: "newUIMultiplier", ...at })),
    safe(() => client.readContract({ address: asset, abi: bstockAbi, functionName: "effectiveAt", ...at })),
  ]);

  if (!supportsCore) {
    throw new HoroiError(
      ErrorCodes.CORE_INTERFACE_MISSING,
      "token does not report IScaledUIAmount support",
    );
  }
  if (!supportsPending) {
    throw new HoroiError(
      ErrorCodes.PENDING_INTERFACE_MISSING,
      "token does not report IScaledUIAmountNewUIMultiplier support",
    );
  }
  const activeMultiplier = uiMultiplier as bigint | undefined;
  const pendingMultiplier = newUIMultiplier as bigint | undefined;
  const pendingAt = effectiveAt as bigint | undefined;
  if (activeMultiplier === undefined || activeMultiplier <= 0n) {
    throw new HoroiError(ErrorCodes.MULTIPLIER_INVALID, "uiMultiplier missing or zero");
  }

  return {
    asset,
    chainId: observedChainId,
    name: name as string | undefined,
    symbol: symbol as string | undefined,
    decimals: Number((decimals as number | bigint | undefined) ?? 18),
    uiMultiplier: activeMultiplier,
    newUIMultiplier: pendingMultiplier ?? activeMultiplier,
    effectiveAt: pendingAt ?? 0n,
    blockNumber,
    blockHash,
    blockTimestamp,
    interfaces: {
      IERC165: supportsIERC165 === true,
      IScaledUIAmount: supportsCore === true,
      IScaledUIAmountNewUIMultiplier: supportsPending === true,
      IScaledUIAmountConversion: supportsConversion === true,
      IScaledUIAmountBalances: supportsBalances === true,
      IERC8056Scheduled: supportsScheduled === true,
    },
    rpcClass: rpcClassFrom(rpcUrl),
  };
}

export async function startAnvilFork(opts: {
  rpcUrl?: string;
  blockNumber?: bigint;
}): Promise<ForkHandle> {
  const rpcUrl = opts.rpcUrl ?? DEFAULT_RPC;
  const { spawn } = await import("node:child_process");
  const anvilBin = process.env.ANVIL_BIN ?? "anvil";
  const port = 8545 + Math.floor(Math.random() * 200);
  const args = [
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
    "--fork-url",
    rpcUrl,
    "--silent",
  ];
  if (opts.blockNumber !== undefined) {
    args.push("--fork-block-number", opts.blockNumber.toString());
  }

  const child = spawn(anvilBin, args, { stdio: ["ignore", "pipe", "pipe"] });
  let stderr = "";
  child.stderr?.on("data", (data: unknown) => {
    stderr += String(data);
  });

  const rpc = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 30_000;
  let ready = false;
  while (Date.now() < deadline) {
    try {
      const result = await rpcRequest<string>(rpc, "eth_blockNumber", []);
      if (result) {
        ready = true;
        break;
      }
    } catch {
      // retry until deadline
    }
    await sleep(200);
  }

  if (!ready) {
    child.kill("SIGTERM");
    throw new HoroiError(
      ErrorCodes.FORK_START_FAILED,
      `anvil failed to start: ${stderr.slice(0, 400)}`,
    );
  }

  const forkClient = forkPublicClient(rpc);
  const chainId = await forkClient.getChainId();
  if (chainId !== CHAIN_ID) {
    child.kill("SIGTERM");
    throw new HoroiError(ErrorCodes.CHAIN_MISMATCH, `fork chainId=${chainId}`);
  }
  const block = await forkClient.getBlock({ blockTag: "latest" });

  return {
    port,
    pid: child.pid ?? 0,
    rpcUrl: rpc,
    blockNumber: block.number,
    blockTimestamp: block.timestamp,
    stop: async () => {
      if (!child.pid) return;
      try {
        process.kill(child.pid, "SIGTERM");
      } catch {
        // already exited
      }
    },
  };
}

export function anvilTestClient(rpcUrl: string) {
  return createTestClient({
    chain: { ...bsc, id: CHAIN_ID },
    mode: "anvil",
    transport: http(rpcUrl),
  });
}

export function forkPublicClient(rpcUrl: string): PublicClient {
  return createPublicClient({
    chain: { ...bsc, id: CHAIN_ID },
    transport: http(rpcUrl),
  });
}

export function forkWalletClient(rpcUrl: string, account: Address) {
  return createWalletClient({
    account,
    chain: { ...bsc, id: CHAIN_ID },
    transport: http(rpcUrl),
  });
}

export async function rpcRequest<T>(rpcUrl: string, method: string, params: unknown[]): Promise<T> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!response.ok) throw new Error(`RPC ${method} HTTP ${response.status}`);
  const payload = (await response.json()) as { result?: T; error?: { message?: string } };
  if (payload.error) throw new Error(payload.error.message ?? `RPC ${method} failed`);
  return payload.result as T;
}

export async function forkSnapshot(rpcUrl: string): Promise<string> {
  return rpcRequest<string>(rpcUrl, "evm_snapshot", []);
}

export async function forkRevert(rpcUrl: string, snapshotId: string): Promise<void> {
  const ok = await rpcRequest<boolean>(rpcUrl, "evm_revert", [snapshotId]);
  if (!ok) throw new Error(`evm_revert failed for ${snapshotId}`);
}

export async function forkWarp(rpcUrl: string, timestamp: bigint): Promise<void> {
  await rpcRequest(rpcUrl, "evm_setNextBlockTimestamp", [`0x${timestamp.toString(16)}`]);
  await rpcRequest(rpcUrl, "evm_mine", []);
}

export async function impersonate(rpcUrl: string, address: Address): Promise<void> {
  await rpcRequest(rpcUrl, "anvil_impersonateAccount", [address]);
  await rpcRequest(rpcUrl, "anvil_setBalance", [address, "0x3635c9adc5dea00000"]); // 1000 BNB
}

export async function stopImpersonating(rpcUrl: string, address: Address): Promise<void> {
  await rpcRequest(rpcUrl, "anvil_stopImpersonatingAccount", [address]).catch(() => undefined);
}

export async function findFundedHolder(
  client: PublicClient,
  asset: Address,
  minBalance: bigint,
  opts: { preferred?: Address; lookbackBlocks?: bigint } = {},
): Promise<Address | null> {
  if (opts.preferred) {
    const balance = await tryRead<bigint>(client, {
      address: asset,
      abi: bstockAbi,
      functionName: "balanceOf",
      functionArgs: [opts.preferred],
    });
    if ((balance ?? 0n) >= minBalance) return opts.preferred;
  }

  const latest = await client.getBlockNumber();
  const lookback = opts.lookbackBlocks ?? 250_000n;
  const floor = latest > lookback ? latest - lookback : 0n;
  const chunk = 10_000n;
  let toBlock = latest;

  while (toBlock >= floor) {
    const fromBlock = toBlock > chunk ? toBlock - chunk + 1n : 0n;
    try {
      const logs = await client.getLogs({
        address: asset,
        event: transferEvent,
        fromBlock: fromBlock < floor ? floor : fromBlock,
        toBlock,
      });
      for (let i = logs.length - 1; i >= 0; i -= 1) {
        const candidate = logs[i]?.args?.to as Address | undefined;
        if (!candidate || /^0x0{40}$/i.test(candidate)) continue;
        const balance = await tryRead<bigint>(client, {
          address: asset,
          abi: bstockAbi,
          functionName: "balanceOf",
          functionArgs: [candidate],
        });
        if ((balance ?? 0n) >= minBalance) return candidate;
      }
    } catch {
      // Public RPCs often cap getLogs ranges. Continue with smaller historical windows.
    }
    if (fromBlock <= floor || fromBlock === 0n) break;
    toBlock = fromBlock - 1n;
  }
  return null;
}

export async function transferFromImpersonated(
  rpcUrl: string,
  asset: Address,
  from: Address,
  to: Address,
  amount: bigint,
): Promise<Hex> {
  await impersonate(rpcUrl, from);
  try {
    const client = forkPublicClient(rpcUrl);
    const wallet = forkWalletClient(rpcUrl, from);
    const hash = await wallet.writeContract({
      address: asset,
      abi: bstockAbi,
      functionName: "transfer",
      args: [to, amount],
      account: from,
      chain: { ...bsc, id: CHAIN_ID },
    });
    const receipt = await client.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error("transfer reverted");
    return hash;
  } finally {
    await stopImpersonating(rpcUrl, from);
  }
}

export async function readTransferUiEvidence(
  client: PublicClient,
  asset: Address,
  txHash: Hex,
): Promise<TransferUiEvidence[]> {
  const receipt = await client.getTransactionReceipt({ hash: txHash });
  const out: TransferUiEvidence[] = [];
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== asset.toLowerCase()) continue;
    try {
      const decoded = decodeEventLog({ abi: bstockAbi, data: log.data, topics: log.topics });
      if (decoded.eventName !== "TransferWithUIAmount") continue;
      const args = decoded.args as unknown as { amount: bigint; uiAmount: bigint };
      out.push({ txHash, rawAmount: args.amount, uiAmount: args.uiAmount });
    } catch {
      // unrelated event
    }
  }
  return out;
}

export async function findMultiplierUpdater(
  client: PublicClient,
  asset: Address,
): Promise<Address | null> {
  const owner = await tryRead<Address>(client, {
    address: asset,
    abi: bstockAbi,
    functionName: "owner",
  });
  if (owner && !/^0x0{40}$/i.test(owner)) return owner;

  // NVDAB uses an enumerable AccessControl-style admin role rather than owner().
  // Discover members from the live contract; never assume or fabricate a role holder.
  const defaultAdminRole = await tryRead<Hex>(client, {
    address: asset,
    abi: bstockAbi,
    functionName: "DEFAULT_ADMIN_ROLE",
  });
  if (defaultAdminRole) {
    const memberCount = await tryRead<bigint>(client, {
      address: asset,
      abi: bstockAbi,
      functionName: "getRoleMemberCount",
      functionArgs: [defaultAdminRole],
    });
    const boundedCount = Number(memberCount ?? 0n);
    for (let index = 0; index < Math.min(boundedCount, 32); index += 1) {
      const member = await tryRead<Address>(client, {
        address: asset,
        abi: bstockAbi,
        functionName: "getRoleMember",
        functionArgs: [defaultAdminRole, BigInt(index)],
      });
      if (member && !/^0x0{40}$/i.test(member)) return member;
    }
  }

  const latest = await client.getBlockNumber();
  const lookback = 500_000n;
  const floor = latest > lookback ? latest - lookback : 0n;
  const chunk = 20_000n;
  let toBlock = latest;
  while (toBlock >= floor) {
    const fromBlock = toBlock > chunk ? toBlock - chunk + 1n : 0n;
    try {
      const logs = await client.getLogs({
        address: asset,
        event: multiplierEvent,
        fromBlock: fromBlock < floor ? floor : fromBlock,
        toBlock,
      });
      const last = logs.at(-1);
      if (last?.transactionHash) {
        const tx = await client.getTransaction({ hash: last.transactionHash });
        return tx.from;
      }
    } catch {
      // continue scanning
    }
    if (fromBlock <= floor || fromBlock === 0n) break;
    toBlock = fromBlock - 1n;
  }
  return null;
}

export async function scheduleMultiplierOnFork(args: {
  rpcUrl: string;
  asset: Address;
  updater: Address;
  newMultiplier: bigint;
  effectiveAt: bigint;
}): Promise<Hex> {
  await impersonate(args.rpcUrl, args.updater);
  try {
    const client = forkPublicClient(args.rpcUrl);
    const wallet = forkWalletClient(args.rpcUrl, args.updater);
    const hash = await wallet.writeContract({
      address: args.asset,
      abi: bstockAbi,
      functionName: "setUIMultiplier",
      args: [args.newMultiplier, args.effectiveAt],
      account: args.updater,
      chain: { ...bsc, id: CHAIN_ID },
    });
    const receipt = await client.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error("setUIMultiplier reverted");
    return hash;
  } finally {
    await stopImpersonating(args.rpcUrl, args.updater);
  }
}

export async function tryRead<T>(
  client: PublicClient,
  args: {
    address: Address;
    abi: Abi;
    functionName: string;
    functionArgs?: readonly unknown[];
  },
): Promise<T | undefined> {
  try {
    return (await client.readContract({
      address: args.address,
      abi: args.abi,
      functionName: args.functionName,
      ...(args.functionArgs ? { args: args.functionArgs as never } : {}),
    })) as T;
  } catch {
    return undefined;
  }
}

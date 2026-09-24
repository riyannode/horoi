import { getAddress, isAddress, type Address } from "viem";
import { runConformance } from "../runner";
import type { ProfileKind } from "../engine";

type SandboxInput = {
  runId: string;
  asset: string;
  target: string | null;
  profile: "custody" | "erc4626";
  blockNumber: string;
  holder?: string;
  updater?: string;
};

function address(value: string | null | undefined): Address | undefined {
  if (!value) return undefined;
  if (!isAddress(value, { strict: false })) throw new Error("invalid address");
  return getAddress(value);
}

async function main(): Promise<void> {
  const raw = process.env.HOROI_RUN_INPUT;
  const rpcUrl = process.env.BSC_RPC_URL;
  if (!raw || !rpcUrl) throw new Error("sandbox input or RPC is not configured");
  const input = JSON.parse(raw) as SandboxInput;
  if (!isAddress(input.asset, { strict: false }) || !["custody", "erc4626"].includes(input.profile)) {
    throw new Error("invalid sandbox input");
  }
  const result = await runConformance({
    runId: input.runId,
    asset: getAddress(input.asset),
    target: input.target ? getAddress(input.target) : null,
    profile: input.profile as ProfileKind,
    blockNumber: BigInt(input.blockNumber),
    rpcUrl,
    holder: address(input.holder),
    updater: address(input.updater),
  });
  process.stdout.write(`${JSON.stringify(result.report)}\n`);
}

main().catch(() => {
  process.stderr.write("SANDBOX_RUN_FAILED\n");
  process.exitCode = 1;
});

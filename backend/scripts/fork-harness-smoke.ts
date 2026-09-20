import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  encodeAbiParameters,
  type Address,
  type Hex,
} from "viem";
import { bsc } from "viem/chains";
import {
  DEFAULT_RPC,
  forkPublicClient,
  forkWalletClient,
  impersonate,
  parseForkRpcTimeoutMs,
  stopImpersonating,
} from "../chain";
import {
  horoiVaultAdapter,
  incompatibleHoroiVaultAdapter,
} from "../adapters";
import { runConformance } from "../runner";
import type { HoroiReport } from "../engine";

const NVDAB = "0x02Fca66C1D1aFB4E2A7884261eB00F63598a7436" as Address;
const PINNED_BLOCK = 122_846_004n;
const ANVIL_DEPLOYER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as Address;
const ONE = 10n ** 18n;

type Fixture = "compatible" | "incompatible";
type Deployment = { address: Address; transactionHash: Hex };

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

async function readBytecode(fixture: Fixture): Promise<Hex> {
  const artifactName = fixture === "compatible"
    ? "HoroiVault.sol/HoroiVault.json"
    : "NaiveHoroiVault.sol/NaiveHoroiVault.json";
  const root = new URL("../../", import.meta.url);
  const artifactPath = join(root.pathname, "out", artifactName);
  const artifact: unknown = JSON.parse(await readFile(artifactPath, "utf8"));
  if (!isRecord(artifact) || !isRecord(artifact.bytecode) || typeof artifact.bytecode.object !== "string") {
    throw new Error(`Foundry bytecode artifact is invalid: ${artifactName}`);
  }
  const object = artifact.bytecode.object.replace(/^0x/, "");
  const bytecode = `0x${object}`;
  if (!/^0x(?:[a-fA-F0-9]{2})+$/.test(bytecode)) {
    throw new Error(`Foundry bytecode is unresolved: ${artifactName}`);
  }
  return bytecode as Hex;
}

async function deployTarget(rpcUrl: string, asset: Address, fixture: Fixture): Promise<Deployment> {
  const bytecode = await readBytecode(fixture);
  const constructorArgs = fixture === "compatible"
    ? encodeAbiParameters([{ type: "address" }], [asset])
    : encodeAbiParameters([{ type: "address" }, { type: "uint256" }], [asset, ONE]);
  const data = `${bytecode}${constructorArgs.slice(2)}` as Hex;
  const chain = { ...bsc, id: 56 };

  await impersonate(rpcUrl, ANVIL_DEPLOYER);
  try {
    const publicClient = forkPublicClient(rpcUrl);
    const wallet = forkWalletClient(rpcUrl, ANVIL_DEPLOYER);
    const hash = await wallet.sendTransaction({
      account: ANVIL_DEPLOYER,
      chain,
      data,
      gas: 5_000_000n,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: parseForkRpcTimeoutMs() });
    if (receipt.status !== "success" || !receipt.contractAddress) {
      throw new Error(`${fixture} deployment did not succeed on the pinned fork`);
    }
    return { address: receipt.contractAddress, transactionHash: receipt.transactionHash };
  } finally {
    await stopImpersonating(rpcUrl, ANVIL_DEPLOYER);
  }
}

function reportEvidence(report: HoroiReport) {
  return {
    status: report.status,
    chainId: report.chainId,
    blockNumber: report.blockNumber,
    blockHash: report.blockHash,
    asset: report.asset,
    target: report.target,
    profile: report.profile,
    suiteId: report.suiteId,
    suiteVersion: report.suiteVersion,
    suiteHash: report.suiteHash,
    resultHash: report.resultHash,
    checks: report.checks
      .filter((item) => item.id === "H001" || item.id === "H006" || item.id.startsWith("H1"))
      .map(({ id, name, status, expected, observed, evidence, errorCode }) => ({
        id,
        name,
        status,
        expected,
        observed,
        evidence,
        errorCode,
      })),
  };
}

function redactString(value: string): string {
  let result = value;
  const configuredRpcs = [process.env.BSC_RPC_URL, process.env.BSC_ARCHIVE_RPC_URL]
    .filter((rpc): rpc is string => Boolean(rpc));
  for (const rpc of configuredRpcs) {
    result = result.replaceAll(rpc, "[redacted RPC URL]");
    try {
      const parsed = new URL(rpc);
      const pathAfterBsc = parsed.pathname.split("/bsc/")[1];
      const sensitiveParts = [
        parsed.pathname,
        decodeURIComponent(parsed.pathname),
        pathAfterBsc,
        pathAfterBsc ? decodeURIComponent(pathAfterBsc) : undefined,
        ...[...parsed.searchParams.values()],
      ].filter((part): part is string => Boolean(part));
      for (const part of sensitiveParts) result = result.replaceAll(part, "[redacted]");
    } catch {
      // The configured endpoint itself is still redacted by exact replacement.
    }
  }
  return result.replace(/https?:\/\/[^\s"'<>]+/gi, (raw) => {
    try {
      const url = new URL(raw);
      return `${url.protocol}//${url.host}/[redacted]`;
    } catch {
      return "[redacted URL]";
    }
  });
}

function redactUrls(value: unknown): unknown {
  if (typeof value === "string") {
    return redactString(value);
  }
  if (Array.isArray(value)) return value.map(redactUrls);
  if (isRecord(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redactUrls(item)]));
  }
  return value;
}

function emitStage(fixture: Fixture | "configuration", stage: string, error?: unknown): void {
  const payload = { fixture, stage, ...(error === undefined ? {} : { error: redactString(String(error)) }) };
  process.stderr.write(`${JSON.stringify(payload)}\n`);
}

async function runFixture(fixture: Fixture): Promise<{ report: HoroiReport; deployment: Deployment | null }> {
  const adapter = fixture === "compatible" ? horoiVaultAdapter : incompatibleHoroiVaultAdapter;
  let deployment: Deployment | undefined;
  let currentStage = "ARCHIVE_INSPECTION";
  try {
    const { report } = await runConformance({
      runId: `pinned-nvdab-${fixture}`,
      asset: NVDAB,
      target: null,
      profile: "custom",
      blockNumber: PINNED_BLOCK,
      rpcUrl: DEFAULT_RPC,
      adapter,
      onDiagnostic: (stage, error) => {
        currentStage = stage;
        emitStage(fixture, stage, error);
      },
      prepareForkTarget: async ({ rpcUrl, asset }) => {
        deployment = await deployTarget(rpcUrl, asset, fixture);
        return deployment.address;
      },
    });
    const run = { report, deployment: deployment ?? null };
    process.stdout.write(`${JSON.stringify(redactUrls({
      nvdab: { asset: NVDAB, chainId: 56, pinnedBlock: PINNED_BLOCK.toString() },
      [fixture]: { deployment: run.deployment, report: reportEvidence(report) },
    }), (_key, value: unknown) => typeof value === "bigint" ? value.toString() : value, 2)}\n`);
    currentStage = "REPORT_VALIDATION";
    verifyReport(run, fixture);
    return run;
  } catch (error) {
    emitStage(fixture, currentStage, error);
    throw error;
  }
}

function verifyReport(run: { report: HoroiReport; deployment: Deployment | null }, fixture: Fixture): void {
  const { report, deployment } = run;
  const integrationChecks = report.checks.filter((item) => item.id.startsWith("H1"));
  if (report.profile !== "custom") {
    throw new Error(`${fixture} report profile must be custom`);
  }
  if (report.chainId !== 56 || report.blockNumber !== Number(PINNED_BLOCK) || report.blockHash === "0x") {
    throw new Error(`${fixture} report did not use the pinned BSC block`);
  }
  if (!deployment || report.target.toLowerCase() !== deployment.address.toLowerCase()) {
    throw new Error(`${fixture} report target does not match a fork deployment`);
  }
  if (integrationChecks.length !== 10 || !report.resultHash.startsWith("0x")) {
    throw new Error(`${fixture} report is missing H101-H110 evidence or resultHash`);
  }

  if (fixture === "compatible" && integrationChecks.some((item) => item.status !== "PASS")) {
    throw new Error("Compatible HoroiVault run did not pass every H101-H110 check");
  }
  if (fixture === "incompatible") {
    const h103 = integrationChecks.find((item) => item.id === "H103");
    if (h103?.status !== "FAIL" || h103.errorCode !== "INVARIANT_MULTIPLIER_IGNORED") {
      throw new Error("NaiveHoroiVault did not fail H103 / INVARIANT_MULTIPLIER_IGNORED");
    }
  }
}

async function main(): Promise<void> {
  if (process.env.HOROI_MULTIPLIER_UPDATER) {
    emitStage("configuration", "UPDATER_CONFIGURATION", "Unset HOROI_MULTIPLIER_UPDATER so the smoke discovers the updater from fork state");
    process.exitCode = 1;
    return;
  }
  const selection = process.env.HOROI_SMOKE_FIXTURE ?? "both";
  const fixtures: Fixture[] = selection === "both"
    ? ["compatible", "incompatible"]
    : selection === "compatible" || selection === "incompatible"
      ? [selection]
      : [];
  if (fixtures.length === 0) {
    emitStage("configuration", "FIXTURE_SELECTION", "HOROI_SMOKE_FIXTURE must be compatible, incompatible, or both");
    process.exitCode = 1;
    return;
  }
  for (const fixture of fixtures) await runFixture(fixture);
}

main().catch(() => {
  process.exitCode = 1;
});

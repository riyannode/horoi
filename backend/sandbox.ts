import { Sandbox } from "@vercel/sandbox";
import type { HoroiReport, ProfileKind } from "./engine";
import type { RunResult } from "./runner";

const REPOSITORY_URL = process.env.HOROI_REPOSITORY_URL ?? "https://github.com/riyannode/horoi.git";
const SANDBOX_TIMEOUT_MS = Math.min(45 * 60 * 1000, Math.max(5 * 60 * 1000, Number(process.env.HOROI_SANDBOX_TIMEOUT_MS ?? 20 * 60 * 1000)));

type SandboxInput = {
  runId: string;
  asset: string;
  target: string | null;
  profile: "custody" | "erc4626";
  blockNumber: bigint;
  holder?: string;
  updater?: string;
};

function sourceRevision(): string {
  const revision = process.env.HOROI_SOURCE_REVISION ?? process.env.VERCEL_GIT_COMMIT_SHA;
  if (!revision) throw new Error("HOROI_SOURCE_REVISION is required for Sandbox execution");
  return revision;
}

function reportFromOutput(stdout: string): HoroiReport {
  const lines = stdout.trim().split("\n").map((line) => line.trim()).filter(Boolean);
  const raw = lines.at(-1);
  if (!raw) throw new Error("sandbox returned no report");
  const report = JSON.parse(raw) as HoroiReport;
  if (!report || typeof report.resultHash !== "string" || !Array.isArray(report.checks)) {
    throw new Error("sandbox returned an invalid report");
  }
  return report;
}

export async function runConformanceInSandbox(input: SandboxInput): Promise<RunResult> {
  const rpcUrl = process.env.BSC_ARCHIVE_RPC_URL ?? process.env.BSC_RPC_URL;
  if (!rpcUrl) throw new Error("BSC_ARCHIVE_RPC_URL is required for Sandbox execution");

  let sandbox: Sandbox | undefined;
  try {
    sandbox = await Sandbox.create({
      source: { type: "git", url: REPOSITORY_URL, revision: sourceRevision(), depth: 1 },
      timeout: SANDBOX_TIMEOUT_MS,
      resources: { vcpus: 2 },
      env: { BSC_RPC_URL: rpcUrl },
      tags: { app: "horoi", purpose: "conformance" },
    });
    const command = await sandbox.runCommand({
      cmd: "bun",
      args: ["backend/scripts/sandbox-run.ts"],
      env: {
        HOROI_RUN_INPUT: JSON.stringify({ ...input, blockNumber: input.blockNumber.toString() }),
      },
      timeoutMs: SANDBOX_TIMEOUT_MS - 30_000,
    });
    const stdout = await command.stdout();
    if (command.exitCode !== 0) throw new Error("sandbox conformance command failed");
    return { report: reportFromOutput(stdout), progress: { completed: 8, total: 8 } };
  } finally {
    if (sandbox) await sandbox.stop().catch(() => undefined);
  }
}

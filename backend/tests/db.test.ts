import { describe, expect, test } from "bun:test";
import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  claimNextRun,
  finalizeRunAsync,
  getRunAsync,
  insertRunAsync,
  listRunsAsync,
  openDb,
  updateRunProgressAsync,
} from "../db";

describe("database persistence boundary", () => {
  test("async persistence facade preserves run lifecycle on local SQLite", async () => {
    const path = join(tmpdir(), `horoi-run-${crypto.randomUUID()}.db`);
    const db = openDb(path);
    await insertRunAsync(db, {
      id: "run-1",
      asset: "0x00000000000000000000000000000000000000a1",
      target: null,
      profile: "erc4626",
      chain_id: 56,
      block_number: 122846004,
      block_hash: "0xabc",
      status: "RUNNING",
      started_at: 1,
      progress_total: 8,
    });
    await updateRunProgressAsync(db, "run-1", 4, "FORKING");
    expect((await getRunAsync(db, "run-1"))?.progress_completed).toBe(4);
    await finalizeRunAsync(db, "run-1", "PASS", JSON.stringify({ resultHash: "0x123" }));
    const saved = await getRunAsync(db, "run-1");
    expect(saved?.status).toBe("PASS");
    expect(saved?.report_json).toContain("0x123");
    expect((await listRunsAsync(db, { status: "PASS" })).map((row) => row.id)).toEqual(["run-1"]);
    db.close();
    rmSync(path, { force: true });
    rmSync(`${path}-wal`, { force: true });
    rmSync(`${path}-shm`, { force: true });
  });

  test("claims queued runs atomically for the durable worker", async () => {
    const path = join(tmpdir(), `horoi-queue-${crypto.randomUUID()}.db`);
    const db = openDb(path);
    await insertRunAsync(db, {
      id: "queued-1",
      asset: "0x00000000000000000000000000000000000000a1",
      target: null,
      profile: "erc4626",
      chain_id: 56,
      block_number: 122846004,
      block_hash: "0xabc",
      status: "QUEUED",
      started_at: 1,
      progress_total: 8,
      holder: "0x00000000000000000000000000000000000000b1",
      updater: null,
    });
    const claimed = claimNextRun(db);
    expect(claimed?.id).toBe("queued-1");
    expect(claimed?.status).toBe("RUNNING");
    expect(claimed?.holder).toBe("0x00000000000000000000000000000000000000b1");
    expect(claimNextRun(db)).toBe(null);
    db.close();
    rmSync(path, { force: true });
    rmSync(`${path}-wal`, { force: true });
    rmSync(`${path}-shm`, { force: true });
  });
});

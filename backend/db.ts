import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

export type RunRow = {
  id: string;
  asset: string;
  target: string | null;
  profile: string;
  chain_id: number;
  block_number: number;
  block_hash: string;
  status: string;
  started_at: number;
  finished_at: number | null;
  progress_completed: number;
  progress_total: number;
  report_json: string | null;
  error_code: string | null;
};

export type PublicationRow = {
  report_id: string;
  run_id: string;
  registry: string;
  tx_hash: string;
  publisher: string;
  published_at: number;
  revoked: number;
};

export type SimulationRow = {
  report_id: string;
  payload_hash: string;
  payload_json: string;
  result_json: string;
  captured_at: number;
};

export function openDb(path = process.env.DATABASE_PATH ?? "./horoi.db"): Database {
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      asset TEXT NOT NULL,
      target TEXT,
      profile TEXT NOT NULL,
      chain_id INTEGER NOT NULL,
      block_number INTEGER NOT NULL,
      block_hash TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      finished_at INTEGER,
      progress_completed INTEGER NOT NULL DEFAULT 0,
      progress_total INTEGER NOT NULL,
      report_json TEXT,
      error_code TEXT
    );
    CREATE TABLE IF NOT EXISTS publications (
      report_id TEXT PRIMARY KEY,
      run_id TEXT NOT NULL,
      registry TEXT NOT NULL,
      tx_hash TEXT NOT NULL,
      publisher TEXT NOT NULL,
      published_at INTEGER NOT NULL,
      revoked INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS publication_simulations (
      report_id TEXT PRIMARY KEY,
      payload_hash TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      result_json TEXT NOT NULL,
      captured_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS runs_asset_target_started ON runs(asset, target, started_at);
    CREATE INDEX IF NOT EXISTS runs_status_started ON runs(status, started_at);
    CREATE INDEX IF NOT EXISTS publications_run ON publications(run_id);
  `);
  return db;
}

export function insertRun(db: Database, row: Omit<RunRow, "finished_at" | "report_json" | "error_code" | "progress_completed">): void {
  db.query(
    `INSERT INTO runs (id, asset, target, profile, chain_id, block_number, block_hash, status, started_at, progress_completed, progress_total)
     VALUES ($id, $asset, $target, $profile, $chainId, $blockNumber, $blockHash, $status, $startedAt, 0, $progressTotal)`,
  ).run({
    $id: row.id,
    $asset: row.asset,
    $target: row.target,
    $profile: row.profile,
    $chainId: row.chain_id,
    $blockNumber: row.block_number,
    $blockHash: row.block_hash,
    $status: row.status,
    $startedAt: row.started_at,
    $progressTotal: row.progress_total,
  });
}

export function updateRunProgress(db: Database, id: string, completed: number, status = "RUNNING"): void {
  db.query(
    `UPDATE runs SET progress_completed = $c, status = $s WHERE id = $id`,
  ).run({ $c: completed, $s: status, $id: id });
}

export function finalizeRun(
  db: Database,
  id: string,
  status: string,
  reportJson: string | null,
  errorCode: string | null = null,
): void {
  db.transaction(() => {
    db.query(
      `UPDATE runs SET status = $s, finished_at = $f, report_json = $r, error_code = $e WHERE id = $id`,
    ).run({
      $s: status,
      $f: Date.now(),
      $r: reportJson,
      $e: errorCode,
      $id: id,
    });
  })();
}

export function getRun(db: Database, id: string): RunRow | null {
  return db.query(`SELECT * FROM runs WHERE id = ?`).get(id) as RunRow | null;
}

export function listRuns(
  db: Database,
  opts: { asset?: string; target?: string; status?: string; limit?: number } = {},
): RunRow[] {
  const clauses: string[] = [];
  const params: Record<string, unknown> = {};
  if (opts.asset) {
    clauses.push("asset = $asset");
    params.$asset = opts.asset;
  }
  if (opts.target) {
    clauses.push("target = $target");
    params.$target = opts.target;
  }
  if (opts.status) {
    clauses.push("status = $status");
    params.$status = opts.status;
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = opts.limit ?? 50;
  return db
    .query(`SELECT * FROM runs ${where} ORDER BY started_at DESC LIMIT ${Number(limit)}`)
    .all(params) as RunRow[];
}

export function insertPublication(db: Database, row: PublicationRow): void {
  db.query(
    `INSERT INTO publications (report_id, run_id, registry, tx_hash, publisher, published_at, revoked)
     VALUES ($report_id, $run_id, $registry, $tx_hash, $publisher, $published_at, $revoked)`,
  ).run({
    $report_id: row.report_id,
    $run_id: row.run_id,
    $registry: row.registry,
    $tx_hash: row.tx_hash,
    $publisher: row.publisher,
    $published_at: row.published_at,
    $revoked: row.revoked,
  });
}

export function getPublication(db: Database, reportId: string): PublicationRow | null {
  return db.query(`SELECT * FROM publications WHERE report_id = ?`).get(reportId) as PublicationRow | null;
}

export function upsertSimulation(db: Database, row: SimulationRow): void {
  db.query(
    `INSERT INTO publication_simulations (report_id, payload_hash, payload_json, result_json, captured_at)
     VALUES ($report_id, $payload_hash, $payload_json, $result_json, $captured_at)
     ON CONFLICT(report_id) DO UPDATE SET
       payload_hash = excluded.payload_hash,
       payload_json = excluded.payload_json,
       result_json = excluded.result_json,
       captured_at = excluded.captured_at`,
  ).run({
    $report_id: row.report_id,
    $payload_hash: row.payload_hash,
    $payload_json: row.payload_json,
    $result_json: row.result_json,
    $captured_at: row.captured_at,
  });
}

export function getSimulation(db: Database, reportId: string): SimulationRow | null {
  return db.query(`SELECT * FROM publication_simulations WHERE report_id = ?`).get(reportId) as SimulationRow | null;
}

export function recoverInterruptedRuns(db: Database): number {
  const result = db.query(
    `UPDATE runs
     SET status = 'ERROR', finished_at = $now, error_code = 'INTERNAL_ERROR'
     WHERE status IN ('RUNNING', 'CREATED', 'INSPECTING', 'FORKING', 'BASELINE', 'SCENARIOS', 'EVALUATING', 'HASHING')`,
  ).run({ $now: Date.now() }) as { changes?: number };
  return result.changes ?? 0;
}

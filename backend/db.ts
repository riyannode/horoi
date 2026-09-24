import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import postgres, { type Sql } from "postgres";

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
  holder?: string | null;
  updater?: string | null;
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
  run_id: string;
  payload_hash: string;
  payload_json: string;
  result_json: string;
  attempted: number;
  success: number;
  upstream_code: string | null;
  latency_ms: number | null;
  evidence_hash: string | null;
  error_code: string | null;
  simulated_at: number;
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
      error_code TEXT,
      holder TEXT,
      updater TEXT
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
      run_id TEXT NOT NULL DEFAULT '',
      payload_hash TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      result_json TEXT NOT NULL,
      attempted INTEGER NOT NULL DEFAULT 0,
      success INTEGER NOT NULL DEFAULT 0,
      upstream_code TEXT,
      latency_ms INTEGER,
      evidence_hash TEXT,
      error_code TEXT,
      simulated_at INTEGER NOT NULL DEFAULT 0,
      captured_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS runs_asset_target_started ON runs(asset, target, started_at);
    CREATE INDEX IF NOT EXISTS runs_status_started ON runs(status, started_at);
    CREATE INDEX IF NOT EXISTS publications_run ON publications(run_id);
  `);
  for (const column of [
    "run_id TEXT NOT NULL DEFAULT ''",
    "attempted INTEGER NOT NULL DEFAULT 0",
    "success INTEGER NOT NULL DEFAULT 0",
    "upstream_code TEXT",
    "latency_ms INTEGER",
    "evidence_hash TEXT",
    "error_code TEXT",
    "simulated_at INTEGER NOT NULL DEFAULT 0",
  ]) {
    try {
      db.exec(`ALTER TABLE publication_simulations ADD COLUMN ${column}`);
    } catch {
      // Column already exists on current databases.
    }
  }
  for (const column of ["holder TEXT", "updater TEXT"]) {
    try {
      db.exec(`ALTER TABLE runs ADD COLUMN ${column}`);
    } catch {
      // Column already exists on current databases.
    }
  }
  return db;
}

export function insertRun(db: Database, row: Omit<RunRow, "finished_at" | "report_json" | "error_code" | "progress_completed">): void {
  db.query(
    `INSERT INTO runs (id, asset, target, profile, chain_id, block_number, block_hash, status, started_at, progress_completed, progress_total, holder, updater)
     VALUES ($id, $asset, $target, $profile, $chainId, $blockNumber, $blockHash, $status, $startedAt, 0, $progressTotal, $holder, $updater)`,
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
    $holder: row.holder ?? null,
    $updater: row.updater ?? null,
  });
}

export function claimNextRun(db: Database): RunRow | null {
  return db.transaction(() => {
    const row = db.query(`SELECT * FROM runs WHERE status = 'QUEUED' ORDER BY started_at ASC LIMIT 1`).get() as RunRow | null;
    if (!row) return null;
    db.query(`UPDATE runs SET status = 'RUNNING' WHERE id = $id AND status = 'QUEUED'`).run({ $id: row.id });
    return getRun(db, row.id);
  })();
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
    `INSERT INTO publication_simulations (report_id, run_id, payload_hash, payload_json, result_json, attempted, success, upstream_code, latency_ms, evidence_hash, error_code, simulated_at, captured_at)
     VALUES ($report_id, $run_id, $payload_hash, $payload_json, $result_json, $attempted, $success, $upstream_code, $latency_ms, $evidence_hash, $error_code, $simulated_at, $captured_at)
     ON CONFLICT(report_id) DO UPDATE SET
       run_id = excluded.run_id,
       payload_hash = excluded.payload_hash,
       payload_json = excluded.payload_json,
       result_json = excluded.result_json,
       attempted = excluded.attempted,
       success = excluded.success,
       upstream_code = excluded.upstream_code,
       latency_ms = excluded.latency_ms,
       evidence_hash = excluded.evidence_hash,
       error_code = excluded.error_code,
       simulated_at = excluded.simulated_at,
       captured_at = excluded.captured_at`,
  ).run({
    $report_id: row.report_id,
    $run_id: row.run_id,
    $payload_hash: row.payload_hash,
    $payload_json: row.payload_json,
    $result_json: row.result_json,
    $attempted: row.attempted,
    $success: row.success,
    $upstream_code: row.upstream_code,
    $latency_ms: row.latency_ms,
    $evidence_hash: row.evidence_hash,
    $error_code: row.error_code,
    $simulated_at: row.simulated_at,
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

const POSTGRES_SCHEMA = `
  CREATE TABLE IF NOT EXISTS runs (
    id TEXT PRIMARY KEY,
    asset TEXT NOT NULL,
    target TEXT,
    profile TEXT NOT NULL,
    chain_id INTEGER NOT NULL,
    block_number BIGINT NOT NULL,
    block_hash TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at BIGINT NOT NULL,
    finished_at BIGINT,
    progress_completed INTEGER NOT NULL DEFAULT 0,
    progress_total INTEGER NOT NULL,
    report_json TEXT,
    error_code TEXT,
    holder TEXT,
    updater TEXT
  );
  CREATE TABLE IF NOT EXISTS publications (
    report_id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL,
    registry TEXT NOT NULL,
    tx_hash TEXT NOT NULL,
    publisher TEXT NOT NULL,
    published_at BIGINT NOT NULL,
    revoked INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS publication_simulations (
    report_id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL DEFAULT '',
    payload_hash TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    result_json TEXT NOT NULL,
    attempted INTEGER NOT NULL DEFAULT 0,
    success INTEGER NOT NULL DEFAULT 0,
    upstream_code TEXT,
    latency_ms INTEGER,
    evidence_hash TEXT,
    error_code TEXT,
    simulated_at BIGINT NOT NULL DEFAULT 0,
    captured_at BIGINT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS runs_asset_target_started ON runs(asset, target, started_at);
  CREATE INDEX IF NOT EXISTS runs_status_started ON runs(status, started_at);
  CREATE INDEX IF NOT EXISTS publications_run ON publications(run_id);
`;

type PostgresRun = Record<string, unknown>;

function toRunRow(row: PostgresRun): RunRow {
  return {
    id: String(row.id),
    asset: String(row.asset),
    target: row.target === null || row.target === undefined ? null : String(row.target),
    profile: String(row.profile),
    chain_id: Number(row.chain_id),
    block_number: Number(row.block_number),
    block_hash: String(row.block_hash),
    status: String(row.status),
    started_at: Number(row.started_at),
    finished_at: row.finished_at === null || row.finished_at === undefined ? null : Number(row.finished_at),
    progress_completed: Number(row.progress_completed),
    progress_total: Number(row.progress_total),
    report_json: row.report_json === null || row.report_json === undefined ? null : String(row.report_json),
    error_code: row.error_code === null || row.error_code === undefined ? null : String(row.error_code),
    holder: row.holder === null || row.holder === undefined ? null : String(row.holder),
    updater: row.updater === null || row.updater === undefined ? null : String(row.updater),
  };
}

function toPublicationRow(row: PostgresRun): PublicationRow {
  return {
    report_id: String(row.report_id),
    run_id: String(row.run_id),
    registry: String(row.registry),
    tx_hash: String(row.tx_hash),
    publisher: String(row.publisher),
    published_at: Number(row.published_at),
    revoked: Number(row.revoked),
  };
}

function toSimulationRow(row: PostgresRun): SimulationRow {
  return {
    report_id: String(row.report_id),
    run_id: String(row.run_id),
    payload_hash: String(row.payload_hash),
    payload_json: String(row.payload_json),
    result_json: String(row.result_json),
    attempted: Number(row.attempted),
    success: Number(row.success),
    upstream_code: row.upstream_code === null || row.upstream_code === undefined ? null : String(row.upstream_code),
    latency_ms: row.latency_ms === null || row.latency_ms === undefined ? null : Number(row.latency_ms),
    evidence_hash: row.evidence_hash === null || row.evidence_hash === undefined ? null : String(row.evidence_hash),
    error_code: row.error_code === null || row.error_code === undefined ? null : String(row.error_code),
    simulated_at: Number(row.simulated_at),
    captured_at: Number(row.captured_at),
  };
}

export class PostgresDatabase {
  readonly kind = "postgres" as const;
  private readonly client: Sql;

  constructor(url: string) {
    this.client = postgres(url, { max: 5, prepare: false });
  }

  async migrate(): Promise<void> {
    if (process.env.DATABASE_AUTO_MIGRATE !== "1") return;
    await this.client.unsafe(POSTGRES_SCHEMA);
  }

  async close(): Promise<void> {
    await this.client.end({ timeout: 5 });
  }

  async insertRun(row: Omit<RunRow, "finished_at" | "report_json" | "error_code" | "progress_completed">): Promise<void> {
    await this.client.unsafe(
      `INSERT INTO runs (id, asset, target, profile, chain_id, block_number, block_hash, status, started_at, progress_completed, progress_total, holder, updater)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, $10, $11, $12)`,
      [row.id, row.asset, row.target, row.profile, row.chain_id, row.block_number, row.block_hash, row.status, row.started_at, row.progress_total, row.holder ?? null, row.updater ?? null],
    );
  }

  async claimNextRun(): Promise<RunRow | null> {
    const rows = await this.client.unsafe<PostgresRun[]>(
      `WITH next_run AS (
         SELECT id FROM runs WHERE status = 'QUEUED' ORDER BY started_at ASC FOR UPDATE SKIP LOCKED LIMIT 1
       )
       UPDATE runs SET status = 'RUNNING'
       WHERE id = (SELECT id FROM next_run)
       RETURNING *`,
    );
    return rows[0] ? toRunRow(rows[0]) : null;
  }

  async updateRunProgress(id: string, completed: number, status = "RUNNING"): Promise<void> {
    await this.client.unsafe("UPDATE runs SET progress_completed = $1, status = $2 WHERE id = $3", [completed, status, id]);
  }

  async finalizeRun(id: string, status: string, reportJson: string | null, errorCode: string | null = null): Promise<void> {
    await this.client.unsafe(
      "UPDATE runs SET status = $1, finished_at = $2, report_json = $3, error_code = $4 WHERE id = $5",
      [status, Date.now(), reportJson, errorCode, id],
    );
  }

  async getRun(id: string): Promise<RunRow | null> {
    const rows = await this.client.unsafe<PostgresRun[]>("SELECT * FROM runs WHERE id = $1", [id]);
    return rows[0] ? toRunRow(rows[0]) : null;
  }

  async listRuns(opts: { asset?: string; target?: string; status?: string; limit?: number } = {}): Promise<RunRow[]> {
    const clauses: string[] = [];
    const values: postgres.ParameterOrJSON<never>[] = [];
    if (opts.asset) { values.push(opts.asset); clauses.push(`asset = $${values.length}`); }
    if (opts.target) { values.push(opts.target); clauses.push(`target = $${values.length}`); }
    if (opts.status) { values.push(opts.status); clauses.push(`status = $${values.length}`); }
    const limit = Math.min(100, Math.max(1, Math.floor(opts.limit ?? 50)));
    values.push(limit);
    return (await this.client.unsafe<PostgresRun[]>(
      `SELECT * FROM runs ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""} ORDER BY started_at DESC LIMIT $${values.length}`,
      values,
    )).map(toRunRow);
  }

  async insertPublication(row: PublicationRow): Promise<void> {
    await this.client.unsafe(
      `INSERT INTO publications (report_id, run_id, registry, tx_hash, publisher, published_at, revoked)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [row.report_id, row.run_id, row.registry, row.tx_hash, row.publisher, row.published_at, row.revoked],
    );
  }

  async getPublication(reportId: string): Promise<PublicationRow | null> {
    const rows = await this.client.unsafe<PostgresRun[]>("SELECT * FROM publications WHERE report_id = $1", [reportId]);
    return rows[0] ? toPublicationRow(rows[0]) : null;
  }

  async upsertSimulation(row: SimulationRow): Promise<void> {
    await this.client.unsafe(
      `INSERT INTO publication_simulations (report_id, run_id, payload_hash, payload_json, result_json, attempted, success, upstream_code, latency_ms, evidence_hash, error_code, simulated_at, captured_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       ON CONFLICT(report_id) DO UPDATE SET
         run_id = EXCLUDED.run_id, payload_hash = EXCLUDED.payload_hash, payload_json = EXCLUDED.payload_json,
         result_json = EXCLUDED.result_json, attempted = EXCLUDED.attempted, success = EXCLUDED.success,
         upstream_code = EXCLUDED.upstream_code, latency_ms = EXCLUDED.latency_ms, evidence_hash = EXCLUDED.evidence_hash,
         error_code = EXCLUDED.error_code, simulated_at = EXCLUDED.simulated_at, captured_at = EXCLUDED.captured_at`,
      [row.report_id, row.run_id, row.payload_hash, row.payload_json, row.result_json, row.attempted, row.success, row.upstream_code, row.latency_ms, row.evidence_hash, row.error_code, row.simulated_at, row.captured_at],
    );
  }

  async getSimulation(reportId: string): Promise<SimulationRow | null> {
    const rows = await this.client.unsafe<PostgresRun[]>("SELECT * FROM publication_simulations WHERE report_id = $1", [reportId]);
    return rows[0] ? toSimulationRow(rows[0]) : null;
  }

  async recoverInterruptedRuns(): Promise<number> {
    const cutoff = Date.now() - 15 * 60 * 1000;
    const result = await this.client.unsafe<{ count: number }[]>(
      `WITH changed AS (
         UPDATE runs SET status = 'ERROR', finished_at = $1, error_code = 'INTERNAL_ERROR'
         WHERE status IN ('RUNNING', 'CREATED', 'INSPECTING', 'FORKING', 'BASELINE', 'SCENARIOS', 'EVALUATING', 'HASHING')
           AND started_at < $2
         RETURNING id
       ) SELECT count(*)::int AS count FROM changed`,
      [Date.now(), cutoff],
    );
    return Number(result[0]?.count ?? 0);
  }
}

export type AppDatabase = Database | PostgresDatabase;

export async function openAppDb(): Promise<AppDatabase> {
  const url = process.env.DATABASE_URL?.trim();
  if (url) {
    const db = new PostgresDatabase(url);
    await db.migrate();
    return db;
  }
  if (process.env.VERCEL) throw new Error("DATABASE_URL is required on Vercel");
  return openDb();
}

export async function recoverInterruptedRunsAsync(db: AppDatabase): Promise<number> {
  return db instanceof PostgresDatabase ? db.recoverInterruptedRuns() : recoverInterruptedRuns(db);
}

export async function claimNextRunAsync(db: AppDatabase): Promise<RunRow | null> {
  return db instanceof PostgresDatabase ? db.claimNextRun() : claimNextRun(db);
}

export async function insertRunAsync(db: AppDatabase, row: Omit<RunRow, "finished_at" | "report_json" | "error_code" | "progress_completed">): Promise<void> {
  return db instanceof PostgresDatabase ? db.insertRun(row) : insertRun(db, row);
}

export async function updateRunProgressAsync(db: AppDatabase, id: string, completed: number, status = "RUNNING"): Promise<void> {
  return db instanceof PostgresDatabase ? db.updateRunProgress(id, completed, status) : updateRunProgress(db, id, completed, status);
}

export async function finalizeRunAsync(db: AppDatabase, id: string, status: string, reportJson: string | null, errorCode: string | null = null): Promise<void> {
  return db instanceof PostgresDatabase ? db.finalizeRun(id, status, reportJson, errorCode) : finalizeRun(db, id, status, reportJson, errorCode);
}

export async function getRunAsync(db: AppDatabase, id: string): Promise<RunRow | null> {
  return db instanceof PostgresDatabase ? db.getRun(id) : getRun(db, id);
}

export async function listRunsAsync(db: AppDatabase, opts: { asset?: string; target?: string; status?: string; limit?: number } = {}): Promise<RunRow[]> {
  return db instanceof PostgresDatabase ? db.listRuns(opts) : listRuns(db, opts);
}

export async function upsertSimulationAsync(db: AppDatabase, row: SimulationRow): Promise<void> {
  return db instanceof PostgresDatabase ? db.upsertSimulation(row) : upsertSimulation(db, row);
}

export async function getSimulationAsync(db: AppDatabase, reportId: string): Promise<SimulationRow | null> {
  return db instanceof PostgresDatabase ? db.getSimulation(reportId) : getSimulation(db, reportId);
}

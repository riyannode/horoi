-- The runtime applies this idempotently through backend/db.ts.
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
  error_code TEXT
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

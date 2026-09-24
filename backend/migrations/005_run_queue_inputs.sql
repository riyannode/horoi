-- Persist the complete execution input so a worker can resume after the API
-- request that created the run has ended.
ALTER TABLE runs ADD COLUMN IF NOT EXISTS holder TEXT;
ALTER TABLE runs ADD COLUMN IF NOT EXISTS updater TEXT;
CREATE INDEX IF NOT EXISTS runs_queue_started ON runs(status, started_at);

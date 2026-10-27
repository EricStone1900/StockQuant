CREATE TABLE IF NOT EXISTS market_monitor_quote_quality_snapshots (
    evaluation_id TEXT PRIMARY KEY,
    scope_key TEXT NOT NULL,
    scope_json JSONB NOT NULL,
    task_id TEXT NOT NULL,
    input_hash TEXT NOT NULL CHECK (input_hash ~ '^[a-f0-9]{64}$'),
    result_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(scope_key, task_id)
);
CREATE INDEX IF NOT EXISTS market_monitor_quality_scope_idx
    ON market_monitor_quote_quality_snapshots(scope_key, created_at DESC);

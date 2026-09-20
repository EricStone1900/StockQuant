CREATE TABLE IF NOT EXISTS research_experiments (
  experiment_id UUID PRIMARY KEY,
  fixture_id TEXT NOT NULL,
  model_profile TEXT NOT NULL,
  rounds INTEGER NOT NULL CHECK (rounds BETWEEN 1 AND 3),
  budget_cents INTEGER NOT NULL CHECK (budget_cents > 0),
  environment_mode TEXT NOT NULL CHECK (environment_mode = 'RESEARCH'),
  broker_mode TEXT NOT NULL CHECK (broker_mode = 'FAKE'),
  idempotency_key TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING_PREREQUISITES', 'CANCELLED')),
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  cancelled_at TIMESTAMPTZ NULL
);

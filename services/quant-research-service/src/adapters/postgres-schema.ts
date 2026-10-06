import type { Pool } from "pg";

const statements = [
  `CREATE TABLE IF NOT EXISTS research_candidates (
    candidate_id TEXT PRIMARY KEY, qlib_version TEXT NOT NULL, algorithm TEXT NOT NULL,
    artifact_hash CHAR(64) NOT NULL, approved_by TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('CANDIDATE_APPROVED')),
    activation TEXT NOT NULL CHECK (activation = 'DISABLED_UNTIL_MANDATE'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS research_backtest_runs (
    backtest_run_id UUID PRIMARY KEY,
    stage_id TEXT NOT NULL CHECK (stage_id = 'V1.4'),
    scenario_id TEXT NOT NULL CHECK (scenario_id IN ('normal','rejection','recovery','market-restrictions','historical-fees')),
    seed INTEGER NOT NULL CHECK (seed >= 0),
    status TEXT NOT NULL CHECK (status IN ('COMPLETED','FAILED')),
    result_payload JSONB NOT NULL,
    result_sha256 CHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `DO $$ BEGIN
    ALTER TABLE research_backtest_runs DROP CONSTRAINT IF EXISTS research_backtest_runs_scenario_id_check;
    ALTER TABLE research_backtest_runs ADD CONSTRAINT research_backtest_runs_scenario_id_check CHECK (scenario_id IN ('normal','rejection','recovery','market-restrictions','historical-fees'));
  END $$`,
  `CREATE TABLE IF NOT EXISTS research_backtest_manifests (
    backtest_run_id UUID PRIMARY KEY REFERENCES research_backtest_runs(backtest_run_id) ON DELETE RESTRICT,
    manifest_payload JSONB NOT NULL,
    manifest_sha256 CHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS promotion_requests (
    promotion_request_id UUID PRIMARY KEY,
    idempotency_key TEXT NOT NULL UNIQUE,
    request_fingerprint CHAR(64) NOT NULL,
    request_payload JSONB NOT NULL,
    status TEXT NOT NULL CHECK (status = 'AWAITING_INDEPENDENT_VALIDATION'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS promotion_validation_reports (
    promotion_request_id UUID PRIMARY KEY REFERENCES promotion_requests(promotion_request_id) ON DELETE RESTRICT,
    report_fingerprint CHAR(64) NOT NULL,
    report_payload JSONB NOT NULL,
    evidence_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS promotion_decisions (
    promotion_request_id UUID PRIMARY KEY REFERENCES promotion_requests(promotion_request_id) ON DELETE RESTRICT,
    decision TEXT NOT NULL CHECK (decision IN ('APPROVE','REJECT')),
    report_fingerprint CHAR(64) NOT NULL,
    version_fingerprint CHAR(64) NOT NULL,
    actor_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS promotion_registry_versions (
    promotion_request_id UUID PRIMARY KEY REFERENCES promotion_decisions(promotion_request_id) ON DELETE RESTRICT,
    version_fingerprint CHAR(64) NOT NULL UNIQUE,
    candidate_source TEXT NOT NULL CHECK (candidate_source IN ('RD_AGENT','FIXTURE')),
    candidate_artifact_id TEXT NOT NULL,
    candidate_namespace TEXT NOT NULL,
    candidate_sha256 CHAR(64) NOT NULL,
    code_sha256 CHAR(64) NOT NULL,
    data_manifest_sha256 CHAR(64) NOT NULL,
    metrics_manifest_sha256 CHAR(64) NOT NULL,
    validation_plan_sha256 CHAR(64) NOT NULL,
    approved_by TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status = 'CANDIDATE_APPROVED'),
    activation TEXT NOT NULL CHECK (activation = 'DISABLED_UNTIL_MANDATE'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
] as const;

export async function initializeQuantResearchSchema(pool: Pick<Pool, "query">): Promise<void> {
  for (const statement of statements) await pool.query(statement);
}

import { Pool } from "pg";
import type { Experiment } from "../domain/experiment.js";
import type { ExperimentRepository } from "../ports/experiment-repository.js";

type Row = {
  experiment_id: string; fixture_id: string; model_profile: string; rounds: number; budget_currency: "USD"; budget_cents: number;
  environment_mode: "RESEARCH"; broker_mode: "FAKE"; idempotency_key: string; status: Experiment["status"];
  reason: string; created_at: Date; cancelled_at: Date | null;
};

const mapRow = (row: Row): Experiment => ({
  experimentId: row.experiment_id, fixtureId: row.fixture_id, modelProfile: row.model_profile,
  rounds: row.rounds, budgetCurrency: row.budget_currency, budgetCents: row.budget_cents, environmentMode: row.environment_mode,
  brokerMode: row.broker_mode, idempotencyKey: row.idempotency_key, status: row.status,
  reason: row.reason, createdAt: row.created_at.toISOString(), cancelledAt: row.cancelled_at?.toISOString() ?? null,
});

export class PgExperimentRepository implements ExperimentRepository {
  constructor(private readonly pool: Pool) {}
  async initialize(): Promise<void> {
    await this.pool.query(`CREATE TABLE IF NOT EXISTS research_experiments (
      experiment_id UUID PRIMARY KEY, fixture_id TEXT NOT NULL, model_profile TEXT NOT NULL,
      rounds INTEGER NOT NULL CHECK (rounds BETWEEN 1 AND 3), budget_currency TEXT NOT NULL DEFAULT 'USD' CHECK (budget_currency = 'USD'), budget_cents INTEGER NOT NULL CHECK (budget_cents BETWEEN 1 AND 1000),
      environment_mode TEXT NOT NULL CHECK (environment_mode = 'RESEARCH'), broker_mode TEXT NOT NULL CHECK (broker_mode = 'FAKE'),
      idempotency_key TEXT UNIQUE NOT NULL, status TEXT NOT NULL CHECK (status IN ('PENDING_PREREQUISITES','CANCELLED')),
      reason TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL, cancelled_at TIMESTAMPTZ NULL
    );
    ALTER TABLE research_experiments ADD COLUMN IF NOT EXISTS budget_currency TEXT NOT NULL DEFAULT 'USD' CHECK (budget_currency = 'USD')`);
  }
  async save(experiment: Experiment): Promise<Experiment> {
    const result = await this.pool.query<Row>(`INSERT INTO research_experiments(experiment_id,fixture_id,model_profile,rounds,budget_currency,budget_cents,environment_mode,broker_mode,idempotency_key,status,reason,created_at,cancelled_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      ON CONFLICT(experiment_id) DO UPDATE SET status=EXCLUDED.status, reason=EXCLUDED.reason, cancelled_at=EXCLUDED.cancelled_at
      RETURNING *`, [experiment.experimentId, experiment.fixtureId, experiment.modelProfile, experiment.rounds, experiment.budgetCurrency, experiment.budgetCents, experiment.environmentMode, experiment.brokerMode, experiment.idempotencyKey, experiment.status, experiment.reason, experiment.createdAt, experiment.cancelledAt]);
    return mapRow(result.rows[0]);
  }
  async findById(experimentId: string): Promise<Experiment | null> {
    const result = await this.pool.query<Row>("SELECT * FROM research_experiments WHERE experiment_id=$1", [experimentId]);
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }
  async findByIdempotencyKey(idempotencyKey: string): Promise<Experiment | null> {
    const result = await this.pool.query<Row>("SELECT * FROM research_experiments WHERE idempotency_key=$1", [idempotencyKey]);
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }
}

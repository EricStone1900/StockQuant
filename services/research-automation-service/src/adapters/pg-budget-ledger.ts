import { Pool, type PoolClient } from "pg";
import type { BudgetReservation, BudgetSnapshotRow, ModelCallBudgetReservation, ModelCallReservationResult } from "../application/v31-runtime-guards.js";

type BudgetRow = {
  experiment_id: string;
  requested_cents: number;
  reserved_cents: number;
  spent_cents: number;
  status: BudgetReservation["status"];
};

type ModelCallRow = {
  experiment_id: string;
  model_run_id: string;
  request_fingerprint: string;
  requested_cents: number;
  reserved_cents: number;
  spent_cents: number;
  status: ModelCallBudgetReservation["status"];
};

const mapRow = (row: BudgetRow): BudgetReservation => ({
  experimentId: row.experiment_id,
  requestedCents: Number(row.requested_cents),
  reservedCents: Number(row.reserved_cents),
  spentCents: Number(row.spent_cents),
  status: row.status,
});

const mapModelCallRow = (row: ModelCallRow): ModelCallBudgetReservation => ({
  experimentId: row.experiment_id,
  modelRunId: row.model_run_id,
  requestFingerprint: row.request_fingerprint,
  requestedCents: Number(row.requested_cents),
  reservedCents: Number(row.reserved_cents),
  spentCents: Number(row.spent_cents),
  status: row.status,
});

/** Persistent V3.1 budget ledger. UNKNOWN amounts remain reserved until reconciled. */
export class PgBudgetLedger {
  constructor(
    private readonly pool: Pool,
    private readonly stageBudgetCents: number,
    private readonly maxExperimentBudgetCents: number,
    private readonly warningPercent = 80,
    private readonly stageId = "V3.1",
  ) {
    if (!Number.isInteger(stageBudgetCents) || stageBudgetCents < 1 || !Number.isInteger(maxExperimentBudgetCents) || maxExperimentBudgetCents < 1 || maxExperimentBudgetCents > stageBudgetCents) throw new Error("budget ledger limits are invalid");
    if (!Number.isInteger(warningPercent) || warningPercent < 1 || warningPercent > 100) throw new Error("budget warning percent must be between 1 and 100");
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(stageId)) throw new Error("stageId is invalid");
  }

  async initialize(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS research_budget_stage_limits (
        stage_id TEXT PRIMARY KEY,
        stage_budget_cents INTEGER NOT NULL CHECK (stage_budget_cents > 0),
        max_experiment_budget_cents INTEGER NOT NULL CHECK (max_experiment_budget_cents > 0),
        warning_percent INTEGER NOT NULL CHECK (warning_percent BETWEEN 1 AND 100),
        CHECK (max_experiment_budget_cents <= stage_budget_cents)
      )`);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS research_budget_allocations (
        stage_id TEXT NOT NULL REFERENCES research_budget_stage_limits(stage_id),
        experiment_id TEXT NOT NULL,
        requested_cents INTEGER NOT NULL CHECK (requested_cents > 0),
        reserved_cents INTEGER NOT NULL CHECK (reserved_cents > 0),
        spent_cents INTEGER NOT NULL DEFAULT 0 CHECK (spent_cents >= 0),
        status TEXT NOT NULL CHECK (status IN ('RESERVED','SETTLED','UNKNOWN','REJECTED')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (stage_id, experiment_id),
        CHECK (spent_cents <= reserved_cents)
      )`);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS research_model_call_budgets (
        stage_id TEXT NOT NULL,
        experiment_id TEXT NOT NULL,
        model_run_id TEXT NOT NULL,
        request_fingerprint CHAR(64) NOT NULL CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'),
        requested_cents INTEGER NOT NULL CHECK (requested_cents > 0),
        reserved_cents INTEGER NOT NULL CHECK (reserved_cents > 0),
        spent_cents INTEGER NOT NULL DEFAULT 0 CHECK (spent_cents >= 0),
        status TEXT NOT NULL CHECK (status IN ('RESERVED','DISPATCHED','UNKNOWN','SETTLED','REJECTED')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (stage_id, experiment_id, model_run_id),
        FOREIGN KEY (stage_id, experiment_id) REFERENCES research_budget_allocations(stage_id, experiment_id) ON DELETE CASCADE,
        CHECK (spent_cents <= reserved_cents)
      )`);
    await this.pool.query(`INSERT INTO research_budget_stage_limits(stage_id, stage_budget_cents, max_experiment_budget_cents, warning_percent)
      VALUES ($1,$2,$3,$4) ON CONFLICT (stage_id) DO NOTHING`, [this.stageId, this.stageBudgetCents, this.maxExperimentBudgetCents, this.warningPercent]);
    await this.assertLimits(this.pool);
  }

  async reserve(experimentId: string, requestedCents: number): Promise<BudgetReservation> {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(experimentId) || !Number.isInteger(requestedCents) || requestedCents < 1 || requestedCents > this.maxExperimentBudgetCents) throw new Error("experiment budget exceeds the configured hard limit or experimentId is invalid");
    return this.transaction(async (client) => {
      await this.lockStage(client);
      const existing = await client.query<BudgetRow>("SELECT * FROM research_budget_allocations WHERE stage_id=$1 AND experiment_id=$2 FOR UPDATE", [this.stageId, experimentId]);
      if (existing.rows[0]) {
        const current = mapRow(existing.rows[0]);
        if (current.requestedCents !== requestedCents) throw new Error("experiment already has a different budget reservation");
        if (current.status === "UNKNOWN") throw new Error("budget status is UNKNOWN; reconcile the original experiment before retrying");
        if (current.status === "REJECTED") throw new Error("rejected budget cannot be reserved again");
        return current;
      }
      const usage = await client.query<{ used_cents: string }>(`SELECT COALESCE(SUM(CASE
        WHEN status IN ('RESERVED','UNKNOWN') THEN reserved_cents
        WHEN status='SETTLED' THEN spent_cents
        ELSE 0 END),0)::text AS used_cents
        FROM research_budget_allocations WHERE stage_id=$1`, [this.stageId]);
      if (Number(usage.rows[0]?.used_cents ?? 0) + requestedCents > this.stageBudgetCents) throw new Error("stage budget exhausted");
      const inserted = await client.query<BudgetRow>(`INSERT INTO research_budget_allocations(stage_id,experiment_id,requested_cents,reserved_cents,spent_cents,status)
        VALUES($1,$2,$3,$3,0,'RESERVED') RETURNING *`, [this.stageId, experimentId, requestedCents]);
      return mapRow(inserted.rows[0]);
    });
  }

  async settle(experimentId: string, spentCents: number | "UNKNOWN"): Promise<BudgetReservation> {
    return this.transaction(async (client) => {
      await this.lockStage(client);
      const selected = await client.query<BudgetRow>("SELECT * FROM research_budget_allocations WHERE stage_id=$1 AND experiment_id=$2 FOR UPDATE", [this.stageId, experimentId]);
      if (!selected.rows[0]) throw new Error("budget reservation not found");
      const current = mapRow(selected.rows[0]);
      if (spentCents === "UNKNOWN") {
        if (current.status === "UNKNOWN") return current;
        if (current.status !== "RESERVED") throw new Error("only a reserved budget can become UNKNOWN");
        return this.update(client, experimentId, current.reservedCents, 0, "UNKNOWN");
      }
      if (!Number.isInteger(spentCents) || spentCents < 0 || spentCents > current.reservedCents) throw new Error("settled cost is outside the reserved budget");
      if (current.status === "SETTLED") {
        if (current.spentCents !== spentCents) throw new Error("settled budget cannot be changed");
        return current;
      }
      if (current.status === "REJECTED") throw new Error("rejected budget cannot be settled");
      const calls = await client.query<{ unresolved_count: string; settled_cents: string }>(`SELECT
        COUNT(*) FILTER (WHERE status IN ('RESERVED','DISPATCHED','UNKNOWN'))::text AS unresolved_count,
        COALESCE(SUM(CASE WHEN status='SETTLED' THEN spent_cents ELSE 0 END),0)::text AS settled_cents
        FROM research_model_call_budgets WHERE stage_id=$1 AND experiment_id=$2`, [this.stageId, experimentId]);
      if (Number(calls.rows[0]?.unresolved_count ?? 0) > 0) throw new Error("model call budget remains unresolved");
      if (spentCents < Number(calls.rows[0]?.settled_cents ?? 0)) throw new Error("experiment settlement is below its settled model call costs");
      return this.update(client, experimentId, current.reservedCents, spentCents, "SETTLED");
    });
  }

  async get(experimentId: string): Promise<BudgetReservation | null> {
    const result = await this.pool.query<BudgetRow>("SELECT * FROM research_budget_allocations WHERE stage_id=$1 AND experiment_id=$2", [this.stageId, experimentId]);
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async snapshot(experimentIds: string[]): Promise<BudgetSnapshotRow[]> {
    const ids = [...new Set(experimentIds)];
    if (ids.length === 0) return [];
    const result = await this.pool.query<BudgetRow & { model_call_settled_cents: string; model_call_unknown_reserved_cents: string }>(`SELECT b.*,
      COALESCE(SUM(c.spent_cents) FILTER (WHERE c.status='SETTLED'),0)::text AS model_call_settled_cents,
      COALESCE(SUM(c.reserved_cents) FILTER (WHERE c.status IN ('DISPATCHED','UNKNOWN')),0)::text AS model_call_unknown_reserved_cents
      FROM research_budget_allocations b LEFT JOIN research_model_call_budgets c
        ON c.stage_id=b.stage_id AND c.experiment_id=b.experiment_id
      WHERE b.stage_id=$1 AND b.experiment_id=ANY($2::text[])
      GROUP BY b.stage_id,b.experiment_id,b.requested_cents,b.reserved_cents,b.spent_cents,b.status,b.created_at,b.updated_at
      ORDER BY b.experiment_id`, [this.stageId, ids]);
    return result.rows.map((row) => ({ ...mapRow(row), modelCallSettledCents: Number(row.model_call_settled_cents), modelCallUnknownReservedCents: Number(row.model_call_unknown_reserved_cents) }));
  }

  async reserveModelCall(experimentId: string, modelRunId: string, requestFingerprint: string, requestedCents: number): Promise<ModelCallReservationResult> {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(experimentId) || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(modelRunId) || !/^[0-9a-f]{64}$/.test(requestFingerprint) || !Number.isInteger(requestedCents) || requestedCents < 1) throw new Error("model call identity, fingerprint, or reservation is invalid");
    return this.transaction(async (client) => {
      await this.lockStage(client);
      const experiment = await client.query<BudgetRow>("SELECT * FROM research_budget_allocations WHERE stage_id=$1 AND experiment_id=$2 FOR UPDATE", [this.stageId, experimentId]);
      if (!experiment.rows[0] || experiment.rows[0].status !== "RESERVED") throw new Error("experiment budget is unavailable for a model call");
      const existing = await client.query<ModelCallRow>("SELECT * FROM research_model_call_budgets WHERE stage_id=$1 AND experiment_id=$2 AND model_run_id=$3 FOR UPDATE", [this.stageId, experimentId, modelRunId]);
      if (existing.rows[0]) {
        const current = mapModelCallRow(existing.rows[0]);
        if (current.requestFingerprint !== requestFingerprint || current.requestedCents !== requestedCents) throw new Error("modelRunId was reused with different request or budget");
        return { reservation: current, created: false };
      }
      const usage = await client.query<{ used_cents: string }>(`SELECT COALESCE(SUM(CASE
        WHEN status IN ('RESERVED','DISPATCHED','UNKNOWN') THEN reserved_cents
        WHEN status='SETTLED' THEN spent_cents
        ELSE 0 END),0)::text AS used_cents
        FROM research_model_call_budgets WHERE stage_id=$1 AND experiment_id=$2`, [this.stageId, experimentId]);
      if (Number(usage.rows[0]?.used_cents ?? 0) + requestedCents > Number(experiment.rows[0].requested_cents)) throw new Error("experiment model-call budget exhausted");
      const inserted = await client.query<ModelCallRow>(`INSERT INTO research_model_call_budgets(stage_id,experiment_id,model_run_id,request_fingerprint,requested_cents,reserved_cents,spent_cents,status)
        VALUES($1,$2,$3,$4,$5,$5,0,'RESERVED') RETURNING *`, [this.stageId, experimentId, modelRunId, requestFingerprint, requestedCents]);
      return { reservation: mapModelCallRow(inserted.rows[0]), created: true };
    });
  }

  async dispatchModelCall(experimentId: string, modelRunId: string): Promise<ModelCallBudgetReservation> {
    return this.updateModelCall(experimentId, modelRunId, (current) => {
      if (current.status !== "RESERVED") throw new Error("model call can only be dispatched from RESERVED state");
      return { ...current, status: "DISPATCHED" };
    });
  }

  async markModelCallUnknown(experimentId: string, modelRunId: string): Promise<ModelCallBudgetReservation> {
    return this.updateModelCall(experimentId, modelRunId, (current) => {
      if (current.status === "UNKNOWN") return current;
      if (current.status !== "DISPATCHED") throw new Error("only a dispatched model call can become UNKNOWN");
      return { ...current, status: "UNKNOWN" };
    });
  }

  async settleModelCall(experimentId: string, modelRunId: string, spentCents: number): Promise<ModelCallBudgetReservation> {
    return this.updateModelCall(experimentId, modelRunId, (current) => {
      if (!Number.isInteger(spentCents) || spentCents < 0 || spentCents > current.reservedCents) throw new Error("settled model call cost is outside the reservation");
      if (current.status === "SETTLED") {
        if (current.spentCents !== spentCents) throw new Error("settled model call cost cannot be changed");
        return current;
      }
      if (current.status !== "DISPATCHED" && current.status !== "UNKNOWN") throw new Error("only a dispatched or UNKNOWN model call can be settled");
      return { ...current, spentCents, status: "SETTLED" };
    });
  }

  async rejectModelCall(experimentId: string, modelRunId: string): Promise<ModelCallBudgetReservation> {
    return this.updateModelCall(experimentId, modelRunId, (current) => {
      if (current.status !== "RESERVED") throw new Error("only an undispatched model call reservation can be rejected");
      return { ...current, status: "REJECTED" };
    });
  }

  async getModelCall(experimentId: string, modelRunId: string): Promise<ModelCallBudgetReservation | null> {
    const result = await this.pool.query<ModelCallRow>("SELECT * FROM research_model_call_budgets WHERE stage_id=$1 AND experiment_id=$2 AND model_run_id=$3", [this.stageId, experimentId, modelRunId]);
    return result.rows[0] ? mapModelCallRow(result.rows[0]) : null;
  }

  async reject(experimentId: string): Promise<BudgetReservation> {
    return this.transaction(async (client) => {
      await this.lockStage(client);
      const selected = await client.query<BudgetRow>("SELECT * FROM research_budget_allocations WHERE stage_id=$1 AND experiment_id=$2 FOR UPDATE", [this.stageId, experimentId]);
      if (!selected.rows[0]) throw new Error("budget reservation not found");
      const current = mapRow(selected.rows[0]);
      if (current.status !== "RESERVED") throw new Error("only a reserved budget can be rejected");
      const calls = await client.query<{ call_count: string }>("SELECT COUNT(*)::text AS call_count FROM research_model_call_budgets WHERE stage_id=$1 AND experiment_id=$2 AND status<>'REJECTED'", [this.stageId, experimentId]);
      if (Number(calls.rows[0]?.call_count ?? 0) > 0) throw new Error("experiment with model call reservations cannot be rejected");
      return this.update(client, experimentId, current.reservedCents, current.spentCents, "REJECTED");
    });
  }

  warningThresholdCents(): number { return Math.ceil(this.stageBudgetCents * this.warningPercent / 100); }

  private async update(client: PoolClient, experimentId: string, reserved: number, spent: number, status: BudgetReservation["status"]): Promise<BudgetReservation> {
    const result = await client.query<BudgetRow>(`UPDATE research_budget_allocations SET reserved_cents=$3,spent_cents=$4,status=$5,updated_at=now()
      WHERE stage_id=$1 AND experiment_id=$2 RETURNING *`, [this.stageId, experimentId, reserved, spent, status]);
    return mapRow(result.rows[0]);
  }

  private async updateModelCall(experimentId: string, modelRunId: string, change: (current: ModelCallBudgetReservation) => ModelCallBudgetReservation): Promise<ModelCallBudgetReservation> {
    return this.transaction(async (client) => {
      await this.lockStage(client);
      await client.query("SELECT 1 FROM research_budget_allocations WHERE stage_id=$1 AND experiment_id=$2 FOR UPDATE", [this.stageId, experimentId]);
      const selected = await client.query<ModelCallRow>("SELECT * FROM research_model_call_budgets WHERE stage_id=$1 AND experiment_id=$2 AND model_run_id=$3 FOR UPDATE", [this.stageId, experimentId, modelRunId]);
      if (!selected.rows[0]) throw new Error("model call reservation not found");
      const current = mapModelCallRow(selected.rows[0]);
      const next = change(current);
      if (next === current) return current;
      const updated = await client.query<ModelCallRow>(`UPDATE research_model_call_budgets SET reserved_cents=$4,spent_cents=$5,status=$6,updated_at=now()
        WHERE stage_id=$1 AND experiment_id=$2 AND model_run_id=$3 RETURNING *`, [this.stageId, experimentId, modelRunId, next.reservedCents, next.spentCents, next.status]);
      return mapModelCallRow(updated.rows[0]);
    });
  }

  private async lockStage(client: PoolClient): Promise<void> {
    const result = await client.query<{ stage_budget_cents: number; max_experiment_budget_cents: number; warning_percent: number }>("SELECT stage_budget_cents,max_experiment_budget_cents,warning_percent FROM research_budget_stage_limits WHERE stage_id=$1 FOR UPDATE", [this.stageId]);
    const limits = result.rows[0];
    if (!limits || Number(limits.stage_budget_cents) !== this.stageBudgetCents || Number(limits.max_experiment_budget_cents) !== this.maxExperimentBudgetCents || Number(limits.warning_percent) !== this.warningPercent) throw new Error("persisted budget limits differ from configured limits");
  }

  private async assertLimits(pool: Pool | PoolClient): Promise<void> {
    const result = await pool.query<{ stage_budget_cents: number; max_experiment_budget_cents: number; warning_percent: number }>("SELECT stage_budget_cents,max_experiment_budget_cents,warning_percent FROM research_budget_stage_limits WHERE stage_id=$1", [this.stageId]);
    const limits = result.rows[0];
    if (!limits || Number(limits.stage_budget_cents) !== this.stageBudgetCents || Number(limits.max_experiment_budget_cents) !== this.maxExperimentBudgetCents || Number(limits.warning_percent) !== this.warningPercent) throw new Error("persisted budget limits differ from configured limits");
  }

  private async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }
}

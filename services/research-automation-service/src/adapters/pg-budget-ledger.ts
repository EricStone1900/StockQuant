import { Pool, type PoolClient } from "pg";
import type { BudgetReservation } from "../application/v31-runtime-guards.js";

type BudgetRow = {
  experiment_id: string;
  requested_cents: number;
  reserved_cents: number;
  spent_cents: number;
  status: BudgetReservation["status"];
};

const mapRow = (row: BudgetRow): BudgetReservation => ({
  experimentId: row.experiment_id,
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
      return this.update(client, experimentId, current.reservedCents, spentCents, "SETTLED");
    });
  }

  async get(experimentId: string): Promise<BudgetReservation | null> {
    const result = await this.pool.query<BudgetRow>("SELECT * FROM research_budget_allocations WHERE stage_id=$1 AND experiment_id=$2", [this.stageId, experimentId]);
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async reject(experimentId: string): Promise<BudgetReservation> {
    return this.transaction(async (client) => {
      await this.lockStage(client);
      const selected = await client.query<BudgetRow>("SELECT * FROM research_budget_allocations WHERE stage_id=$1 AND experiment_id=$2 FOR UPDATE", [this.stageId, experimentId]);
      if (!selected.rows[0]) throw new Error("budget reservation not found");
      const current = mapRow(selected.rows[0]);
      if (current.status !== "RESERVED") throw new Error("only a reserved budget can be rejected");
      return this.update(client, experimentId, current.reservedCents, current.spentCents, "REJECTED");
    });
  }

  warningThresholdCents(): number { return Math.ceil(this.stageBudgetCents * this.warningPercent / 100); }

  private async update(client: PoolClient, experimentId: string, reserved: number, spent: number, status: BudgetReservation["status"]): Promise<BudgetReservation> {
    const result = await client.query<BudgetRow>(`UPDATE research_budget_allocations SET reserved_cents=$3,spent_cents=$4,status=$5,updated_at=now()
      WHERE stage_id=$1 AND experiment_id=$2 RETURNING *`, [this.stageId, experimentId, reserved, spent, status]);
    return mapRow(result.rows[0]);
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

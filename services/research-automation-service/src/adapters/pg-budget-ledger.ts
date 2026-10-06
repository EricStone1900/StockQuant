import { Pool, type PoolClient } from "pg";
import { sameProviderCallEvidence, validateProviderCallEvidence, V31_MAX_MODEL_CALLS_PER_EXPERIMENT, type BudgetReservation, type BudgetSnapshotRow, type ModelCallBudgetReservation, type ModelCallReservationResult, type ProviderCallEvidence } from "../application/v31-runtime-guards.js";

type BudgetRow = {
  experiment_id: string;
  test_run_id: string | null;
  rounds: number;
  requested_cents: number;
  reserved_cents: number;
  spent_cents: number;
  status: BudgetReservation["status"];
};

type ModelCallRow = {
  experiment_id: string;
  model_run_id: string;
  round_index: number;
  request_fingerprint: string;
  requested_cents: number;
  reserved_cents: number;
  spent_cents: number;
  status: ModelCallBudgetReservation["status"];
  provider_evidence: ProviderCallEvidence | null;
};

const mapRow = (row: BudgetRow): BudgetReservation => ({
  experimentId: row.experiment_id,
  ...(row.test_run_id ? { testRunId: row.test_run_id } : {}),
  rounds: row.rounds,
  requestedCents: Number(row.requested_cents),
  reservedCents: Number(row.reserved_cents),
  spentCents: Number(row.spent_cents),
  status: row.status,
});

const mapModelCallRow = (row: ModelCallRow): ModelCallBudgetReservation => ({
  experimentId: row.experiment_id,
  modelRunId: row.model_run_id,
  roundIndex: row.round_index,
  requestFingerprint: row.request_fingerprint,
  requestedCents: Number(row.requested_cents),
  reservedCents: Number(row.reserved_cents),
  spentCents: Number(row.spent_cents),
  status: row.status,
  providerEvidence: row.provider_evidence,
});

/** Persistent V3.1 budget ledger. UNKNOWN amounts remain reserved until reconciled. */
export class PgBudgetLedger {
  constructor(
    private readonly pool: Pool,
    private readonly stageBudgetCents: number,
    private readonly maxExperimentBudgetCents: number,
    private readonly warningPercent = 80,
    private readonly stageId = "V3.1",
    private readonly maxModelCallsPerExperiment = V31_MAX_MODEL_CALLS_PER_EXPERIMENT,
    private readonly maxTestRunBudgetCents = maxExperimentBudgetCents,
  ) {
    if (!Number.isInteger(stageBudgetCents) || stageBudgetCents < 1 || !Number.isInteger(maxExperimentBudgetCents) || maxExperimentBudgetCents < 1 || maxExperimentBudgetCents > stageBudgetCents) throw new Error("budget ledger limits are invalid");
    if (!Number.isInteger(warningPercent) || warningPercent < 1 || warningPercent > 100) throw new Error("budget warning percent must be between 1 and 100");
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(stageId)) throw new Error("stageId is invalid");
    if (!Number.isInteger(maxModelCallsPerExperiment) || maxModelCallsPerExperiment < 1 || maxModelCallsPerExperiment > 64) throw new Error("maxModelCallsPerExperiment must be between 1 and 64");
    if (!Number.isInteger(maxTestRunBudgetCents) || maxTestRunBudgetCents < 1 || maxTestRunBudgetCents > stageBudgetCents) throw new Error("maxTestRunBudgetCents is invalid");
  }

  async initialize(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS research_budget_stage_limits (
        stage_id TEXT PRIMARY KEY,
        stage_budget_cents INTEGER NOT NULL CHECK (stage_budget_cents > 0),
        max_experiment_budget_cents INTEGER NOT NULL CHECK (max_experiment_budget_cents > 0),
        max_test_run_budget_cents INTEGER NOT NULL CHECK (max_test_run_budget_cents > 0),
        warning_percent INTEGER NOT NULL CHECK (warning_percent BETWEEN 1 AND 100),
        max_model_calls_per_experiment INTEGER NOT NULL DEFAULT 12 CHECK (max_model_calls_per_experiment BETWEEN 1 AND 64),
        CHECK (max_experiment_budget_cents <= stage_budget_cents)
      )`);
    await this.pool.query("ALTER TABLE research_budget_stage_limits ADD COLUMN IF NOT EXISTS max_model_calls_per_experiment INTEGER NOT NULL DEFAULT 12 CHECK (max_model_calls_per_experiment BETWEEN 1 AND 64)");
    await this.pool.query("ALTER TABLE research_budget_stage_limits ADD COLUMN IF NOT EXISTS max_test_run_budget_cents INTEGER NULL CHECK (max_test_run_budget_cents > 0)");
    await this.pool.query("UPDATE research_budget_stage_limits SET max_test_run_budget_cents=max_experiment_budget_cents WHERE max_test_run_budget_cents IS NULL");
    await this.pool.query("ALTER TABLE research_budget_stage_limits ALTER COLUMN max_test_run_budget_cents SET NOT NULL");
    await this.pool.query(`CREATE TABLE IF NOT EXISTS research_budget_test_run_limits (
      stage_id TEXT NOT NULL REFERENCES research_budget_stage_limits(stage_id),
      test_run_id UUID NOT NULL,
      budget_cents INTEGER NOT NULL CHECK (budget_cents > 0),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY(stage_id,test_run_id)
    )`);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS research_budget_allocations (
        stage_id TEXT NOT NULL REFERENCES research_budget_stage_limits(stage_id),
        experiment_id TEXT NOT NULL,
        test_run_id UUID NULL,
        rounds INTEGER NOT NULL DEFAULT 1 CHECK (rounds BETWEEN 1 AND 3),
        requested_cents INTEGER NOT NULL CHECK (requested_cents > 0),
        reserved_cents INTEGER NOT NULL CHECK (reserved_cents > 0),
        spent_cents INTEGER NOT NULL DEFAULT 0 CHECK (spent_cents >= 0),
        status TEXT NOT NULL CHECK (status IN ('RESERVED','SETTLED','UNKNOWN','REJECTED')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (stage_id, experiment_id),
        CHECK (spent_cents <= reserved_cents)
      )`);
    await this.pool.query("ALTER TABLE research_budget_allocations ADD COLUMN IF NOT EXISTS test_run_id UUID NULL");
    await this.pool.query("ALTER TABLE research_budget_allocations ADD COLUMN IF NOT EXISTS rounds INTEGER NULL CHECK (rounds BETWEEN 1 AND 3)");
    await this.pool.query("UPDATE research_budget_allocations SET rounds=1 WHERE rounds IS NULL");
    await this.pool.query("ALTER TABLE research_budget_allocations ALTER COLUMN rounds SET NOT NULL");
    await this.pool.query(`DO $$ BEGIN
      IF to_regclass('research_experiments') IS NOT NULL THEN
        UPDATE research_budget_allocations a SET test_run_id=COALESCE(a.test_run_id,e.test_run_id),rounds=e.rounds
        FROM research_experiments e WHERE a.experiment_id=e.experiment_id::text
          AND ((a.test_run_id IS NULL AND e.test_run_id IS NOT NULL) OR a.rounds<>e.rounds);
      END IF;
    END $$`);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS research_model_call_budgets (
        stage_id TEXT NOT NULL,
        experiment_id TEXT NOT NULL,
        model_run_id TEXT NOT NULL,
        round_index INTEGER NOT NULL DEFAULT 1 CHECK (round_index BETWEEN 1 AND 3),
        request_fingerprint CHAR(64) NOT NULL CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'),
        requested_cents INTEGER NOT NULL CHECK (requested_cents > 0),
        reserved_cents INTEGER NOT NULL CHECK (reserved_cents > 0),
        spent_cents INTEGER NOT NULL DEFAULT 0 CHECK (spent_cents >= 0),
        status TEXT NOT NULL CHECK (status IN ('RESERVED','DISPATCHED','UNKNOWN','SETTLED','REJECTED')),
        provider_evidence JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (stage_id, experiment_id, model_run_id),
        FOREIGN KEY (stage_id, experiment_id) REFERENCES research_budget_allocations(stage_id, experiment_id) ON DELETE CASCADE,
        CHECK (spent_cents <= reserved_cents)
      )`);
    // Additive migration for databases created before usage evidence was tracked.
    await this.pool.query("ALTER TABLE research_model_call_budgets ADD COLUMN IF NOT EXISTS provider_evidence JSONB");
    await this.pool.query("ALTER TABLE research_model_call_budgets ADD COLUMN IF NOT EXISTS round_index INTEGER NOT NULL DEFAULT 1 CHECK (round_index BETWEEN 1 AND 3)");
    await this.pool.query(`INSERT INTO research_budget_stage_limits(stage_id, stage_budget_cents, max_experiment_budget_cents, max_test_run_budget_cents, warning_percent, max_model_calls_per_experiment)
      VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (stage_id) DO NOTHING`, [this.stageId, this.stageBudgetCents, this.maxExperimentBudgetCents, this.maxTestRunBudgetCents, this.warningPercent, this.maxModelCallsPerExperiment]);
    await this.assertLimits(this.pool);
  }

  async reserve(experimentId: string, requestedCents: number, testRunId?: string, rounds = 1): Promise<BudgetReservation> {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(experimentId) || !Number.isInteger(requestedCents) || requestedCents < 1 || requestedCents > this.maxExperimentBudgetCents) throw new Error("experiment budget exceeds the configured hard limit or experimentId is invalid");
    if (!Number.isInteger(rounds) || rounds < 1 || rounds > 3 || requestedCents < rounds) throw new Error("experiment rounds must each receive at least one cent of budget");
    return this.transaction(async (client) => {
      await this.lockStage(client);
      const existing = await client.query<BudgetRow>("SELECT * FROM research_budget_allocations WHERE stage_id=$1 AND experiment_id=$2 FOR UPDATE", [this.stageId, experimentId]);
      if (existing.rows[0]) {
        const current = mapRow(existing.rows[0]);
        if (current.requestedCents !== requestedCents || current.testRunId !== testRunId || current.rounds !== rounds) throw new Error("experiment already has a different budget reservation");
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
      if (testRunId) {
        const runUsage = await client.query<{ used_cents: string }>(`SELECT COALESCE(SUM(CASE
          WHEN status IN ('RESERVED','UNKNOWN') THEN reserved_cents
          WHEN status='SETTLED' THEN spent_cents
          ELSE 0 END),0)::text AS used_cents
          FROM research_budget_allocations WHERE stage_id=$1 AND test_run_id=$2`, [this.stageId, testRunId]);
        const runLimit = await client.query<{ budget_cents: number }>("SELECT budget_cents FROM research_budget_test_run_limits WHERE stage_id=$1 AND test_run_id=$2", [this.stageId, testRunId]);
        if (Number(runUsage.rows[0]?.used_cents ?? 0) + requestedCents > Number(runLimit.rows[0]?.budget_cents ?? this.maxTestRunBudgetCents)) throw new Error("TestRun budget exhausted");
      }
      const inserted = await client.query<BudgetRow>(`INSERT INTO research_budget_allocations(stage_id,experiment_id,test_run_id,rounds,requested_cents,reserved_cents,spent_cents,status)
        VALUES($1,$2,$3,$4,$5,$5,0,'RESERVED') RETURNING *`, [this.stageId, experimentId, testRunId ?? null, rounds, requestedCents]);
      return mapRow(inserted.rows[0]);
    });
  }

  async configureTestRunBudget(testRunId: string, budgetCents: number): Promise<number> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(testRunId)
      || !Number.isInteger(budgetCents) || budgetCents < 1 || budgetCents > this.maxTestRunBudgetCents) {
      throw new Error("TestRun budget limit is invalid");
    }
    return this.transaction(async (client) => {
      await this.lockStage(client);
      const current = await client.query<{ budget_cents: number }>("SELECT budget_cents FROM research_budget_test_run_limits WHERE stage_id=$1 AND test_run_id=$2 FOR UPDATE", [this.stageId, testRunId]);
      if (current.rows[0]) {
        if (Number(current.rows[0].budget_cents) !== budgetCents) throw new Error("TestRun budget limit is immutable once configured");
        return budgetCents;
      }
      const usage = await client.query<{ used_cents: string }>(`SELECT COALESCE(SUM(CASE
        WHEN status IN ('RESERVED','UNKNOWN') THEN reserved_cents
        WHEN status='SETTLED' THEN spent_cents
        ELSE 0 END),0)::text AS used_cents
        FROM research_budget_allocations WHERE stage_id=$1 AND test_run_id=$2`, [this.stageId, testRunId]);
      if (Number(usage.rows[0]?.used_cents ?? 0) > budgetCents) throw new Error("TestRun budget limit is below its existing commitment");
      await client.query("INSERT INTO research_budget_test_run_limits(stage_id,test_run_id,budget_cents) VALUES($1,$2,$3)", [this.stageId, testRunId, budgetCents]);
      return budgetCents;
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

  async settleFromModelCalls(experimentId: string, testRunId: string, expectedRounds: number): Promise<{
    experimentId: string; testRunId: string; requestedCents: number; reservedCents: number; spentCents: number;
    status: "SETTLED"; modelCallCount: number; rounds: Array<{ roundIndex: number; settledCents: number }>;
  }> {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(testRunId)
      || !Number.isSafeInteger(expectedRounds) || expectedRounds < 1 || expectedRounds > 3) throw new Error("TestRun UUID and bounded expected round count are required");
    return this.transaction(async (client) => {
      await this.lockStage(client);
      const selected = await client.query<BudgetRow>("SELECT * FROM research_budget_allocations WHERE stage_id=$1 AND experiment_id=$2 FOR UPDATE", [this.stageId, experimentId]);
      if (!selected.rows[0]) throw new Error("experiment budget reservation not found");
      const current = mapRow(selected.rows[0]);
      if (current.testRunId !== testRunId || current.rounds !== expectedRounds) throw new Error("Experiment does not match the requested TestRun and rounds");
      const calls = await client.query<{ round_index: number; settled_count: string; unresolved_count: string; attempt_count: string; settled_cents: string }>(`SELECT round_index,
        COUNT(*) FILTER (WHERE status='SETTLED')::text AS settled_count,
        COUNT(*) FILTER (WHERE status IN ('RESERVED','DISPATCHED','UNKNOWN'))::text AS unresolved_count,
        COUNT(*) FILTER (WHERE status<>'REJECTED')::text AS attempt_count,
        COALESCE(SUM(spent_cents) FILTER (WHERE status='SETTLED'),0)::text AS settled_cents
        FROM research_model_call_budgets WHERE stage_id=$1 AND experiment_id=$2 GROUP BY round_index ORDER BY round_index`, [this.stageId, experimentId]);
      if (calls.rows.length !== expectedRounds || calls.rows.some((row, index) => Number(row.round_index) !== index + 1
        || Number(row.settled_count) !== 1 || Number(row.unresolved_count) !== 0 || Number(row.attempt_count) !== 1)) {
        throw new Error("each allocated round must contain exactly one settled model call and no unresolved attempts");
      }
      const rounds = calls.rows.map((row) => ({ roundIndex: Number(row.round_index), settledCents: Number(row.settled_cents) }));
      const spentCents = rounds.reduce((sum, row) => sum + row.settledCents, 0);
      if (spentCents > current.reservedCents) throw new Error("settled model-call cost exceeds the Experiment reservation");
      if (current.status === "SETTLED") {
        if (current.spentCents !== spentCents) throw new Error("settled Experiment budget does not match its immutable model-call ledger");
      } else {
        if (current.status !== "RESERVED") throw new Error("only a reserved Experiment can settle from its model-call ledger");
        await this.update(client, experimentId, current.reservedCents, spentCents, "SETTLED");
      }
      return { experimentId, testRunId, requestedCents: current.requestedCents, reservedCents: current.reservedCents, spentCents, status: "SETTLED", modelCallCount: calls.rows.length, rounds };
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

  /** A deduplicated, owner-scoped-by-caller view of every experiment bound to one TestRun. */
  async snapshotForTestRun(testRunId: string, offset: number, limit: number, afterCursor: string | null = null): Promise<{
    rows: Array<{ experimentId: string; rounds: number; requestedCents: number; reservedCents: number; roundBudget: Array<{ roundIndex: number; allocatedCents: number; usedCents: number; unknownReservedCents: number }>; status: BudgetReservation["status"]; settledCents: number; unknownReservedCents: number; modelCallCount: number }>;
    totals: { experiments: number; requestedCents: number; reservedCents: number; settledCents: number; unknownReservedCents: number; modelCallCount: number } | null;
    offset: number; limit: number; hasMore: boolean; afterCursor: string | null; nextAfterCursor: string | null;
  }> {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
    if (!uuid.test(testRunId) || !Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error("testRunId UUID and bounded offset/limit are required");
    if (afterCursor !== null && (offset !== 0 || afterCursor.length > 512 || !/^[A-Za-z0-9_-]+$/u.test(afterCursor))) throw new Error("cursor pagination requires offset 0 and a bounded cursor");
    let cursor: { createdAt: string; experimentId: string } | null = null;
    if (afterCursor !== null) {
      try {
        const decoded = JSON.parse(Buffer.from(afterCursor, "base64url").toString("utf8")) as Record<string, unknown>;
        const parsedDate = typeof decoded.createdAt === "string" ? new Date(decoded.createdAt) : null;
        if (Object.keys(decoded).sort().join(",") !== "createdAt,experimentId" || typeof decoded.createdAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/u.test(decoded.createdAt) || !parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 19) !== decoded.createdAt.slice(0, 19) || parsedDate.toISOString().slice(20, 23) !== decoded.createdAt.slice(20, 23) || typeof decoded.experimentId !== "string" || !uuid.test(decoded.experimentId)) throw new Error();
        cursor = { createdAt: decoded.createdAt, experimentId: decoded.experimentId };
      } catch { throw new Error("afterCursor is invalid"); }
    }
    const totalsResult = cursor === null ? await this.pool.query<{ experiments: string; requested_cents: string; reserved_cents: string; settled_cents: string; unknown_reserved_cents: string; model_call_count: string }>(`SELECT COUNT(*)::text AS experiments,
      COALESCE(SUM(b.requested_cents),0)::text AS requested_cents,
      COALESCE(SUM(CASE WHEN b.status IN ('RESERVED','UNKNOWN') THEN b.reserved_cents ELSE 0 END),0)::text AS reserved_cents,
      COALESCE(SUM(CASE WHEN b.status='SETTLED' THEN b.spent_cents ELSE calls.settled_cents END),0)::text AS settled_cents,
      COALESCE(SUM(GREATEST(CASE WHEN b.status='UNKNOWN' THEN b.reserved_cents ELSE 0 END,calls.unknown_reserved_cents)),0)::text AS unknown_reserved_cents,
      COALESCE(SUM(calls.model_call_count),0)::text AS model_call_count
      FROM research_experiments e JOIN research_budget_allocations b ON b.experiment_id=e.experiment_id::text AND b.stage_id=$1
      LEFT JOIN LATERAL (SELECT COALESCE(SUM(c.spent_cents) FILTER (WHERE c.status='SETTLED'),0) AS settled_cents,
        COALESCE(SUM(c.reserved_cents) FILTER (WHERE c.status IN ('DISPATCHED','UNKNOWN')),0) AS unknown_reserved_cents,
        COUNT(*) FILTER (WHERE c.status<>'REJECTED') AS model_call_count
        FROM research_model_call_budgets c WHERE c.stage_id=b.stage_id AND c.experiment_id=b.experiment_id) calls ON true
      WHERE e.test_run_id=$2`, [this.stageId, testRunId]) : null;
    const rowsResult = cursor
      ? await this.pool.query<{ experiment_id: string; created_at_cursor: string; rounds: number; requested_cents: number; reserved_cents: number; round_budget: Array<{ roundIndex: number; allocatedCents: number; usedCents: number; unknownReservedCents: number }>; status: BudgetReservation["status"]; spent_cents: number; model_call_settled_cents: string; model_call_unknown_reserved_cents: string; model_call_count: string }>(`WITH page AS MATERIALIZED (
        SELECT experiment_id,rounds,created_at,to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS created_at_cursor FROM research_experiments
        WHERE test_run_id=$2 AND (created_at,experiment_id)>($3::timestamptz,$4::uuid)
        ORDER BY created_at,experiment_id LIMIT $5
      )
      SELECT e.experiment_id,e.created_at_cursor,e.rounds,b.requested_cents,
      CASE WHEN b.status IN ('RESERVED','UNKNOWN') THEN b.reserved_cents ELSE 0 END AS reserved_cents,b.status,b.spent_cents,
      COALESCE(calls.settled_cents,0)::text AS model_call_settled_cents,
      COALESCE(calls.unknown_reserved_cents,0)::text AS model_call_unknown_reserved_cents,
      COALESCE(calls.model_call_count,0)::text AS model_call_count,
      COALESCE(rounds.round_budget,'[]'::jsonb) AS round_budget
      FROM page e JOIN research_budget_allocations b ON b.experiment_id=e.experiment_id::text AND b.stage_id=$1
      LEFT JOIN LATERAL (SELECT COALESCE(SUM(c.spent_cents) FILTER (WHERE c.status='SETTLED'),0) AS settled_cents,
        COALESCE(SUM(c.reserved_cents) FILTER (WHERE c.status IN ('DISPATCHED','UNKNOWN')),0) AS unknown_reserved_cents,
        COUNT(*) FILTER (WHERE c.status<>'REJECTED') AS model_call_count
        FROM research_model_call_budgets c WHERE c.stage_id=b.stage_id AND c.experiment_id=b.experiment_id) calls ON true
      LEFT JOIN LATERAL (SELECT jsonb_agg(jsonb_build_object(
        'roundIndex',r.round_index,
        'allocatedCents',floor(b.requested_cents/e.rounds)::integer + CASE WHEN r.round_index <= mod(b.requested_cents,e.rounds) THEN 1 ELSE 0 END,
        'usedCents',COALESCE(c.used_cents,0),
        'unknownReservedCents',COALESCE(c.unknown_reserved_cents,0)
      ) ORDER BY r.round_index) AS round_budget FROM generate_series(1,e.rounds) AS r(round_index)
        LEFT JOIN LATERAL (SELECT SUM(CASE WHEN status IN ('RESERVED','DISPATCHED','UNKNOWN') THEN reserved_cents WHEN status='SETTLED' THEN spent_cents ELSE 0 END) AS used_cents,
          SUM(reserved_cents) FILTER (WHERE status IN ('DISPATCHED','UNKNOWN')) AS unknown_reserved_cents
          FROM research_model_call_budgets WHERE stage_id=b.stage_id AND experiment_id=b.experiment_id AND round_index=r.round_index) c ON true) rounds ON true
      ORDER BY e.created_at,e.experiment_id`, [this.stageId, testRunId, cursor.createdAt, cursor.experimentId, limit + 1])
      : await this.pool.query<{ experiment_id: string; created_at_cursor: string; rounds: number; requested_cents: number; reserved_cents: number; round_budget: Array<{ roundIndex: number; allocatedCents: number; usedCents: number; unknownReservedCents: number }>; status: BudgetReservation["status"]; spent_cents: number; model_call_settled_cents: string; model_call_unknown_reserved_cents: string; model_call_count: string }>(`SELECT e.experiment_id,to_char(e.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS created_at_cursor,e.rounds,b.requested_cents,
      CASE WHEN b.status IN ('RESERVED','UNKNOWN') THEN b.reserved_cents ELSE 0 END AS reserved_cents,b.status,b.spent_cents,
      COALESCE(calls.settled_cents,0)::text AS model_call_settled_cents,
      COALESCE(calls.unknown_reserved_cents,0)::text AS model_call_unknown_reserved_cents,
      COALESCE(calls.model_call_count,0)::text AS model_call_count,
      COALESCE(rounds.round_budget,'[]'::jsonb) AS round_budget
      FROM research_experiments e JOIN research_budget_allocations b ON b.experiment_id=e.experiment_id::text AND b.stage_id=$1
      LEFT JOIN LATERAL (SELECT COALESCE(SUM(c.spent_cents) FILTER (WHERE c.status='SETTLED'),0) AS settled_cents,
        COALESCE(SUM(c.reserved_cents) FILTER (WHERE c.status IN ('DISPATCHED','UNKNOWN')),0) AS unknown_reserved_cents,
        COUNT(*) FILTER (WHERE c.status<>'REJECTED') AS model_call_count
        FROM research_model_call_budgets c WHERE c.stage_id=b.stage_id AND c.experiment_id=b.experiment_id) calls ON true
      LEFT JOIN LATERAL (SELECT jsonb_agg(jsonb_build_object(
        'roundIndex',r.round_index,
        'allocatedCents',floor(b.requested_cents/e.rounds)::integer + CASE WHEN r.round_index <= mod(b.requested_cents,e.rounds) THEN 1 ELSE 0 END,
        'usedCents',COALESCE(c.used_cents,0),
        'unknownReservedCents',COALESCE(c.unknown_reserved_cents,0)
      ) ORDER BY r.round_index) AS round_budget FROM generate_series(1,e.rounds) AS r(round_index)
        LEFT JOIN LATERAL (SELECT SUM(CASE WHEN status IN ('RESERVED','DISPATCHED','UNKNOWN') THEN reserved_cents WHEN status='SETTLED' THEN spent_cents ELSE 0 END) AS used_cents,
          SUM(reserved_cents) FILTER (WHERE status IN ('DISPATCHED','UNKNOWN')) AS unknown_reserved_cents
          FROM research_model_call_budgets WHERE stage_id=b.stage_id AND experiment_id=b.experiment_id AND round_index=r.round_index) c ON true) rounds ON true
      WHERE e.test_run_id=$2 ORDER BY e.created_at,e.experiment_id OFFSET $3 LIMIT $4`, [this.stageId, testRunId, offset, limit + 1]);
    const totals = totalsResult?.rows[0] ?? null;
    const rawRows = rowsResult.rows;
    const hasMore = rawRows.length > limit;
    const pageRows = rawRows.slice(0, limit);
    const lastRow = pageRows.at(-1);
    const nextAfterCursor = hasMore && lastRow ? Buffer.from(JSON.stringify({ createdAt: lastRow.created_at_cursor, experimentId: lastRow.experiment_id }), "utf8").toString("base64url") : null;
    return {
      offset, limit, hasMore, afterCursor, nextAfterCursor,
      rows: pageRows.map((row) => ({ experimentId: row.experiment_id, rounds: row.rounds, requestedCents: Number(row.requested_cents), reservedCents: Number(row.reserved_cents), roundBudget: row.round_budget, status: row.status, settledCents: row.status === "SETTLED" ? Number(row.spent_cents) : Number(row.model_call_settled_cents), unknownReservedCents: Math.max(row.status === "UNKNOWN" ? Number(row.reserved_cents) : 0, Number(row.model_call_unknown_reserved_cents)), modelCallCount: Number(row.model_call_count) })),
      totals: totals ? { experiments: Number(totals.experiments), requestedCents: Number(totals.requested_cents), reservedCents: Number(totals.reserved_cents), settledCents: Number(totals.settled_cents), unknownReservedCents: Number(totals.unknown_reserved_cents), modelCallCount: Number(totals.model_call_count) } : null,
    };
  }

  async reserveModelCall(experimentId: string, modelRunId: string, requestFingerprint: string, requestedCents: number, requestedRoundIndex?: number): Promise<ModelCallReservationResult> {
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(experimentId) || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(modelRunId) || !/^[0-9a-f]{64}$/.test(requestFingerprint) || !Number.isInteger(requestedCents) || requestedCents < 1) throw new Error("model call identity, fingerprint, or reservation is invalid");
    return this.transaction(async (client) => {
      await this.lockStage(client);
      const experiment = await client.query<BudgetRow>("SELECT * FROM research_budget_allocations WHERE stage_id=$1 AND experiment_id=$2 FOR UPDATE", [this.stageId, experimentId]);
      if (!experiment.rows[0] || experiment.rows[0].status !== "RESERVED") throw new Error("experiment budget is unavailable for a model call");
      const rounds = Number(experiment.rows[0].rounds);
      if (rounds > 1 && requestedRoundIndex === undefined) throw new Error("roundIndex is required for a multi-round experiment");
      const roundIndex = requestedRoundIndex ?? 1;
      if (!Number.isInteger(roundIndex) || roundIndex < 1 || roundIndex > rounds) throw new Error("roundIndex is outside the experiment round range");
      const existing = await client.query<ModelCallRow>("SELECT * FROM research_model_call_budgets WHERE stage_id=$1 AND experiment_id=$2 AND model_run_id=$3 FOR UPDATE", [this.stageId, experimentId, modelRunId]);
      if (existing.rows[0]) {
        const current = mapModelCallRow(existing.rows[0]);
        if (current.requestFingerprint !== requestFingerprint || current.requestedCents !== requestedCents || current.roundIndex !== roundIndex) throw new Error("modelRunId was reused with different request, budget, or round");
        return { reservation: current, created: false };
      }
      const calls = await client.query<{ call_count: string }>("SELECT COUNT(*)::text AS call_count FROM research_model_call_budgets WHERE stage_id=$1 AND experiment_id=$2 AND status<>'REJECTED'", [this.stageId, experimentId]);
      if (Number(calls.rows[0]?.call_count ?? 0) >= this.maxModelCallsPerExperiment) throw new Error("experiment model-call count limit exhausted");
      const usage = await client.query<{ used_cents: string }>(`SELECT COALESCE(SUM(CASE
        WHEN status IN ('RESERVED','DISPATCHED','UNKNOWN') THEN reserved_cents
        WHEN status='SETTLED' THEN spent_cents
        ELSE 0 END),0)::text AS used_cents
        FROM research_model_call_budgets WHERE stage_id=$1 AND experiment_id=$2`, [this.stageId, experimentId]);
      if (Number(usage.rows[0]?.used_cents ?? 0) + requestedCents > Number(experiment.rows[0].requested_cents)) throw new Error("experiment model-call budget exhausted");
      const roundUsage = await client.query<{ used_cents: string }>(`SELECT COALESCE(SUM(CASE
        WHEN status IN ('RESERVED','DISPATCHED','UNKNOWN') THEN reserved_cents
        WHEN status='SETTLED' THEN spent_cents
        ELSE 0 END),0)::text AS used_cents
        FROM research_model_call_budgets WHERE stage_id=$1 AND experiment_id=$2 AND round_index=$3`, [this.stageId, experimentId, roundIndex]);
      const experimentBudget = Number(experiment.rows[0].requested_cents);
      const roundCap = Math.floor(experimentBudget / rounds) + (roundIndex <= experimentBudget % rounds ? 1 : 0);
      if (Number(roundUsage.rows[0]?.used_cents ?? 0) + requestedCents > roundCap) throw new Error("experiment round model-call budget exhausted");
      const inserted = await client.query<ModelCallRow>(`INSERT INTO research_model_call_budgets(stage_id,experiment_id,model_run_id,round_index,request_fingerprint,requested_cents,reserved_cents,spent_cents,status)
        VALUES($1,$2,$3,$4,$5,$6,$6,0,'RESERVED') RETURNING *`, [this.stageId, experimentId, modelRunId, roundIndex, requestFingerprint, requestedCents]);
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

  async recordModelCallEvidence(experimentId: string, modelRunId: string, evidence: ProviderCallEvidence): Promise<ModelCallBudgetReservation> {
    validateProviderCallEvidence(evidence);
    return this.updateModelCall(experimentId, modelRunId, (current) => {
      if (current.status !== "DISPATCHED" && current.status !== "UNKNOWN") throw new Error("provider evidence requires a dispatched model call");
      if (current.providerEvidence && !sameProviderCallEvidence(current.providerEvidence, evidence)) throw new Error("provider evidence cannot be changed");
      return { ...current, providerEvidence: evidence };
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
      const updated = await client.query<ModelCallRow>(`UPDATE research_model_call_budgets SET reserved_cents=$4,spent_cents=$5,status=$6,provider_evidence=$7::jsonb,updated_at=now()
        WHERE stage_id=$1 AND experiment_id=$2 AND model_run_id=$3 RETURNING *`, [this.stageId, experimentId, modelRunId, next.reservedCents, next.spentCents, next.status, JSON.stringify(next.providerEvidence)]);
      return mapModelCallRow(updated.rows[0]);
    });
  }

  private async lockStage(client: PoolClient): Promise<void> {
    const result = await client.query<{ stage_budget_cents: number; max_experiment_budget_cents: number; max_test_run_budget_cents: number; warning_percent: number; max_model_calls_per_experiment: number }>("SELECT stage_budget_cents,max_experiment_budget_cents,max_test_run_budget_cents,warning_percent,max_model_calls_per_experiment FROM research_budget_stage_limits WHERE stage_id=$1 FOR UPDATE", [this.stageId]);
    const limits = result.rows[0];
    if (!limits || Number(limits.stage_budget_cents) !== this.stageBudgetCents || Number(limits.max_experiment_budget_cents) !== this.maxExperimentBudgetCents || Number(limits.max_test_run_budget_cents) !== this.maxTestRunBudgetCents || Number(limits.warning_percent) !== this.warningPercent || Number(limits.max_model_calls_per_experiment) !== this.maxModelCallsPerExperiment) throw new Error("persisted budget limits differ from configured limits");
  }

  private async assertLimits(pool: Pool | PoolClient): Promise<void> {
    const result = await pool.query<{ stage_budget_cents: number; max_experiment_budget_cents: number; max_test_run_budget_cents: number; warning_percent: number; max_model_calls_per_experiment: number }>("SELECT stage_budget_cents,max_experiment_budget_cents,max_test_run_budget_cents,warning_percent,max_model_calls_per_experiment FROM research_budget_stage_limits WHERE stage_id=$1", [this.stageId]);
    const limits = result.rows[0];
    if (!limits || Number(limits.stage_budget_cents) !== this.stageBudgetCents || Number(limits.max_experiment_budget_cents) !== this.maxExperimentBudgetCents || Number(limits.max_test_run_budget_cents) !== this.maxTestRunBudgetCents || Number(limits.warning_percent) !== this.warningPercent || Number(limits.max_model_calls_per_experiment) !== this.maxModelCallsPerExperiment) throw new Error("persisted budget limits differ from configured limits");
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

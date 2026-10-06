import { randomUUID } from "node:crypto";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { Pool } from "pg";
import { isDeepStrictEqual } from "node:util";
import { evaluateV31PromotionGate } from "../application/v31-acceptance-gate.js";
import type { NewStageRun, StageRunRepository, StoredStageRun, V33WorkflowStatus } from "../ports/stage-run-repository.js";
import { assertV33CompletionEvidence, isV33WorkflowTerminal, isV33WorkflowTransitionAllowed } from "../application/v33-run-state.js";
export type { StoredStageRun } from "../ports/stage-run-repository.js";

export class PostgresStageRunRepository implements StageRunRepository {
  constructor(private readonly pool: Pool) {}

  async migrate(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      // Several stage repositories share these tables and may initialize concurrently.
      // Serialize first creation so PostgreSQL cannot race on its implicit row types.
      await client.query("SELECT pg_advisory_xact_lock(735401, 1)");
      await client.query(`
      CREATE TABLE IF NOT EXISTS acceptance_stage_runs (
        test_run_id UUID PRIMARY KEY, stage_id TEXT NOT NULL, scenario_id TEXT NOT NULL,
        scenario_version TEXT NOT NULL, owner_id TEXT NOT NULL, namespace TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL CHECK (status IN ('QUEUED','RUNNING','WAITING','COMPLETED','FAILED','CANCELLED')),
        seed INTEGER NOT NULL, assertions JSONB NOT NULL, evidence JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(), completed_at TIMESTAMPTZ NULL
      );
      CREATE INDEX IF NOT EXISTS acceptance_stage_runs_owner_idx ON acceptance_stage_runs(owner_id, test_run_id);
      CREATE TABLE IF NOT EXISTS acceptance_stage_run_history (
        revision_id BIGSERIAL PRIMARY KEY, test_run_id UUID NOT NULL REFERENCES acceptance_stage_runs(test_run_id) ON DELETE RESTRICT,
        owner_id TEXT NOT NULL, stage_id TEXT NOT NULL, scenario_id TEXT NOT NULL, status TEXT NOT NULL,
        assertions JSONB NOT NULL, evidence JSONB NOT NULL, recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS acceptance_stage_run_history_owner_idx ON acceptance_stage_run_history(test_run_id, owner_id, revision_id);
      CREATE TABLE IF NOT EXISTS v31_acceptance_records (
        test_run_id UUID PRIMARY KEY REFERENCES acceptance_stage_runs(test_run_id) ON DELETE RESTRICT,
        owner_id TEXT NOT NULL, accepted_by TEXT NOT NULL, note TEXT NOT NULL,
        evidence_sha256 CHAR(64) NOT NULL CHECK (evidence_sha256 ~ '^[a-f0-9]{64}$'),
        accepted_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      `);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async save(run: NewStageRun): Promise<StoredStageRun> {
    if (run.stageId === "V3.3" && run.status !== "WAITING") {
      throw new ConflictException("V3.3 TestRuns must use transitionV33Workflow for every state change");
    }
    const namespace = run.namespace ?? `${run.stageId.toLowerCase().replace(".", "-")}-${run.scenarioId}-${run.testRunId}`;
    let result;
    try {
      result = await this.pool.query(`
        INSERT INTO acceptance_stage_runs (test_run_id, stage_id, scenario_id, scenario_version, owner_id, namespace, status, seed, assertions, evidence, completed_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,CASE WHEN $7 IN ('COMPLETED','FAILED','CANCELLED') THEN now() END)
        ON CONFLICT (test_run_id) DO UPDATE SET
          status=EXCLUDED.status,
          assertions=EXCLUDED.assertions,
          evidence=EXCLUDED.evidence,
          completed_at=CASE WHEN acceptance_stage_runs.completed_at IS NULL AND EXCLUDED.status IN ('COMPLETED','FAILED','CANCELLED')
            THEN now() ELSE acceptance_stage_runs.completed_at END
        WHERE acceptance_stage_runs.stage_id=EXCLUDED.stage_id
          AND acceptance_stage_runs.scenario_id=EXCLUDED.scenario_id
          AND acceptance_stage_runs.scenario_version=EXCLUDED.scenario_version
          AND acceptance_stage_runs.owner_id=EXCLUDED.owner_id
          AND acceptance_stage_runs.namespace=EXCLUDED.namespace
          AND acceptance_stage_runs.seed=EXCLUDED.seed
          AND (NOT $11::boolean OR (acceptance_stage_runs.status=EXCLUDED.status
            AND acceptance_stage_runs.assertions=EXCLUDED.assertions
            AND acceptance_stage_runs.evidence=EXCLUDED.evidence))
          AND (acceptance_stage_runs.status NOT IN ('COMPLETED','FAILED','CANCELLED')
            OR (acceptance_stage_runs.status=EXCLUDED.status
              AND acceptance_stage_runs.assertions=EXCLUDED.assertions
              AND acceptance_stage_runs.evidence=EXCLUDED.evidence))
        RETURNING *`, [run.testRunId, run.stageId, run.scenarioId, run.scenarioVersion, run.ownerId, namespace, run.status, run.seed, JSON.stringify(run.assertions), JSON.stringify(run.evidence), run.stageId === "V3.3"]);
    } catch (error) {
      if ((error as { code?: string }).code === "23505") throw new ConflictException("stage run ID or namespace is already in use");
      throw error;
    }
    if (result.rowCount !== 1) throw new ConflictException("stage run identity or terminal evidence conflicts with the stored run");
    return this.row(result.rows[0]);
  }

  async find(testRunId: string, ownerId: string): Promise<StoredStageRun | null> {
    const result = await this.pool.query("SELECT * FROM acceptance_stage_runs WHERE test_run_id=$1 AND owner_id=$2", [testRunId, ownerId]);
    return result.rowCount === 1 ? this.row(result.rows[0]) : null;
  }

  async transitionV33Workflow(input: {
    testRunId: string;
    ownerId: string;
    expectedStatus: V33WorkflowStatus;
    status: V33WorkflowStatus;
    assertions: unknown[];
    evidence: Record<string, unknown>;
  }): Promise<StoredStageRun> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query("SELECT * FROM acceptance_stage_runs WHERE test_run_id=$1 AND owner_id=$2 FOR UPDATE", [input.testRunId, input.ownerId]);
      if (result.rowCount !== 1 || result.rows[0].stage_id !== "V3.3") throw new NotFoundException("V3.3 TestRun was not found in user scope");
      const previous = this.row(result.rows[0]);
      const assertions = JSON.stringify(input.assertions);
      const evidence = JSON.stringify(input.evidence);
      if (previous.status === input.status
        && isDeepStrictEqual(previous.assertions, input.assertions)
        && isDeepStrictEqual(previous.evidence, input.evidence)) {
        await client.query("COMMIT");
        return previous;
      }
      if (previous.status !== input.expectedStatus) throw new ConflictException("V3.3 TestRun status changed before the requested transition");
      if (!isV33WorkflowTransitionAllowed(input.expectedStatus, input.status)) throw new ConflictException("V3.3 TestRun status transition is not allowed");
      if (input.status === "COMPLETED") {
        try { assertV33CompletionEvidence(input.assertions, input.evidence); }
        catch (error) { throw new ConflictException(error instanceof Error ? error.message : "V3.3 completion evidence is incomplete"); }
      }
      await client.query(`INSERT INTO acceptance_stage_run_history(test_run_id,owner_id,stage_id,scenario_id,status,assertions,evidence)
        VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)`, [input.testRunId, input.ownerId, previous.stageId, previous.scenarioId, previous.status, JSON.stringify(previous.assertions), JSON.stringify(previous.evidence)]);
      const updated = await client.query(`UPDATE acceptance_stage_runs SET status=$3,assertions=$4::jsonb,evidence=$5::jsonb,
        completed_at=CASE WHEN $6::boolean THEN COALESCE(completed_at,now()) ELSE NULL END
        WHERE test_run_id=$1 AND owner_id=$2 RETURNING *`, [input.testRunId, input.ownerId, input.status, assertions, evidence, isV33WorkflowTerminal(input.status)]);
      await client.query("COMMIT");
      return this.row(updated.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async reviseFailedV24Run(testRunId: string, ownerId: string, status: "FAILED" | "COMPLETED", assertions: unknown[], evidence: Record<string, unknown>): Promise<StoredStageRun> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const current = await client.query("SELECT * FROM acceptance_stage_runs WHERE test_run_id=$1 AND owner_id=$2 FOR UPDATE", [testRunId, ownerId]);
      if (current.rowCount !== 1) throw new NotFoundException("V2.4 TestRun was not found in user scope");
      const previous = current.rows[0];
      if (previous.stage_id !== "V2.4" || previous.scenario_id !== "recovery" || previous.status !== "FAILED") throw new ConflictException("only a failed V2.4 recovery TestRun can be resumed");
      await client.query(`INSERT INTO acceptance_stage_run_history(test_run_id,owner_id,stage_id,scenario_id,status,assertions,evidence)
        VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)`, [testRunId, ownerId, previous.stage_id, previous.scenario_id, previous.status, JSON.stringify(previous.assertions), JSON.stringify(previous.evidence)]);
      const updated = await client.query(`UPDATE acceptance_stage_runs SET status=$3,assertions=$4::jsonb,evidence=$5::jsonb,completed_at=now()
        WHERE test_run_id=$1 AND owner_id=$2 RETURNING *`, [testRunId, ownerId, status, JSON.stringify(assertions), JSON.stringify(evidence)]);
      await client.query("COMMIT");
      return this.row(updated.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }

  async listRunHistory(testRunId: string, ownerId: string): Promise<Array<Record<string, unknown>>> {
    const result = await this.pool.query(`SELECT revision_id,status,assertions,evidence,recorded_at FROM acceptance_stage_run_history WHERE test_run_id=$1 AND owner_id=$2 ORDER BY revision_id`, [testRunId, ownerId]);
    return result.rows.map((row) => ({ revisionId: row.revision_id, status: row.status, assertions: row.assertions, evidence: row.evidence, recordedAt: row.recorded_at.toISOString() }));
  }

  async getV31PromotionGate(testRunId: string): Promise<Record<string, unknown> | null> {
    const result = await this.pool.query(`
      SELECT r.*, a.owner_id AS accepted_owner_id, a.accepted_by, a.note AS acceptance_note,
        a.evidence_sha256 AS accepted_evidence_sha256, a.accepted_at
      FROM acceptance_stage_runs r LEFT JOIN v31_acceptance_records a USING (test_run_id)
      WHERE r.test_run_id=$1 AND r.stage_id='V3.1'`, [testRunId]);
    if (result.rowCount !== 1) return null;
    const row = result.rows[0];
    const run = this.row(row);
    const gate = evaluateV31PromotionGate(run);
    const accepted = gate.stageStatus === "PASS" && row.accepted_owner_id === run.ownerId
      && row.accepted_by === run.ownerId && row.accepted_evidence_sha256?.trim() === gate.evidenceSha256;
    return {
      schemaVersion: "v3.1-promotion-gate-v1", testRunId, stageStatus: gate.stageStatus,
      humanAcceptance: accepted ? "ACCEPTED" : "NOT_RUN", evidenceSha256: gate.evidenceSha256,
      ...(accepted ? { acceptedBy: row.accepted_by, acceptedAt: row.accepted_at.toISOString(), note: row.acceptance_note } : {}),
    };
  }

  async acceptV31Run(testRunId: string, ownerId: string, note: string): Promise<{ acceptedAt: string; evidenceSha256: string }> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query("SELECT * FROM acceptance_stage_runs WHERE test_run_id=$1 AND stage_id='V3.1' AND owner_id=$2 FOR UPDATE", [testRunId, ownerId]);
      if (result.rowCount !== 1) throw new NotFoundException("V3.1 run was not found in user scope");
      const run = this.row(result.rows[0]);
      const gate = evaluateV31PromotionGate(run);
      if (gate.stageStatus !== "PASS") throw new ConflictException("V3.1 run does not meet the exact-run acceptance gate");
      const inserted = await client.query(`INSERT INTO v31_acceptance_records(test_run_id,owner_id,accepted_by,note,evidence_sha256)
        VALUES($1,$2,$2,$3,$4) ON CONFLICT(test_run_id) DO NOTHING RETURNING accepted_at`, [testRunId, ownerId, note, gate.evidenceSha256]);
      if (inserted.rowCount === 1) {
        await client.query("COMMIT");
        return { acceptedAt: inserted.rows[0].accepted_at.toISOString(), evidenceSha256: gate.evidenceSha256 };
      }
      const existing = await client.query("SELECT owner_id,accepted_by,note,evidence_sha256,accepted_at FROM v31_acceptance_records WHERE test_run_id=$1", [testRunId]);
      const row = existing.rows[0];
      if (row.owner_id !== ownerId || row.accepted_by !== ownerId || row.note !== note || row.evidence_sha256.trim() !== gate.evidenceSha256) throw new ConflictException("V3.1 acceptance record already exists with different content");
      await client.query("COMMIT");
      return { acceptedAt: row.accepted_at.toISOString(), evidenceSha256: gate.evidenceSha256 };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }

  newId() { return randomUUID(); }
  private row(row: Record<string, any>): StoredStageRun { return { testRunId: row.test_run_id, stageId: row.stage_id, scenarioId: row.scenario_id, scenarioVersion: row.scenario_version, ownerId: row.owner_id, namespace: row.namespace, status: row.status, seed: row.seed, assertions: row.assertions, evidence: row.evidence, createdAt: row.created_at.toISOString(), completedAt: row.completed_at?.toISOString() ?? null }; }
}

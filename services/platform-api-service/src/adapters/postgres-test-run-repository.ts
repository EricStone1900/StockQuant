import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import type { ScenarioId, TestAssertion, TestRun, TestRunStatus } from "../domain/test-run.js";
import { assertLegacyTestRunShadowParity } from "./postgres-legacy-test-run-migration.js";
import type { TestRunRepository } from "../ports/test-run-repository.js";

export type V11RunStorageMode = "legacy" | "stage";

export function configuredV11RunStorageMode(value = process.env.STOCKQUANT_V11_RUN_STORAGE): V11RunStorageMode {
  if (value === undefined || value === "legacy") return "legacy";
  if (value === "stage") return "stage";
  throw new Error("STOCKQUANT_V11_RUN_STORAGE must be either legacy or stage");
}

interface RunRow {
  test_run_id: string;
  stage_id: "V1.1";
  scenario_id: ScenarioId;
  scenario_version: "1.0.0";
  namespace: string;
  owner_id: string;
  status: TestRunStatus;
  seed: number;
  account_id: string | null;
  created_at: Date;
  completed_at: Date | null;
  error: string | null;
}

interface StageRunRow {
  test_run_id: string;
  stage_id: string;
  scenario_id: string;
  scenario_version: string;
  namespace: string;
  owner_id: string;
  status: string;
  seed: number;
  assertions: Array<Record<string, unknown>>;
  evidence: Record<string, unknown>;
  created_at: Date;
  completed_at: Date | null;
}

export class PostgresTestRunRepository implements TestRunRepository {
  constructor(private readonly pool: Pool, readonly storageMode: V11RunStorageMode = configuredV11RunStorageMode()) {}

  async assertStorageReady(): Promise<void> {
    if (this.storageMode === "stage") await assertLegacyTestRunShadowParity(this.pool);
  }

  async migrate(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS test_runs (
        test_run_id UUID PRIMARY KEY,
        stage_id TEXT NOT NULL CHECK (stage_id = 'V1.1'),
        scenario_id TEXT NOT NULL CHECK (scenario_id IN ('normal', 'rejection', 'recovery')),
        scenario_version TEXT NOT NULL,
        namespace TEXT NOT NULL UNIQUE,
        owner_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('QUEUED', 'RUNNING', 'WAITING', 'COMPLETED', 'FAILED')),
        seed INTEGER NOT NULL,
        account_id UUID NULL,
        error TEXT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        completed_at TIMESTAMPTZ NULL
      );
      CREATE TABLE IF NOT EXISTS test_assertions (
        test_assertion_id UUID PRIMARY KEY,
        test_run_id UUID NOT NULL REFERENCES test_runs(test_run_id),
        assertion_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('PASS', 'FAIL', 'WAITING')),
        expected JSONB NOT NULL,
        actual JSONB NOT NULL,
        evidence JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(test_run_id, assertion_id)
      );
      CREATE TABLE IF NOT EXISTS acceptance_records (
        acceptance_record_id UUID PRIMARY KEY,
        test_run_id UUID NOT NULL REFERENCES test_runs(test_run_id),
        owner_id TEXT NOT NULL,
        conclusion TEXT NOT NULL CHECK (conclusion IN ('PASS', 'FAIL', 'NOT_RUN')),
        note TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);
  }

  async create(ownerId: string, scenarioId: ScenarioId, seed: number): Promise<TestRun> {
    const testRunId = randomUUID();
    const namespace = `v1-1-${scenarioId}-${testRunId}`;
    if (this.storageMode === "stage") {
      const client = await this.pool.connect();
      try {
        await client.query("BEGIN");
        const result = await client.query<RunRow>(
      `INSERT INTO test_runs (test_run_id, stage_id, scenario_id, scenario_version, namespace, owner_id, status, seed)
       VALUES ($1, 'V1.1', $2, '1.0.0', $3, $4, 'QUEUED', $5) RETURNING *`,
      [testRunId, scenarioId, namespace, ownerId, seed]
        );
        await client.query(`INSERT INTO acceptance_stage_runs
          (test_run_id,stage_id,scenario_id,scenario_version,owner_id,namespace,status,seed,assertions,evidence,created_at,completed_at)
          SELECT test_run_id,'V1.1',scenario_id,'1.0.0',owner_id,namespace,status,seed,'[]'::jsonb,
            jsonb_build_object('legacySourceTable','test_runs','legacyAccountId',NULL,'legacyError',NULL,'legacyAcceptanceRecords','[]'::jsonb),created_at,NULL
          FROM test_runs WHERE test_run_id=$1`, [testRunId]);
        await client.query("COMMIT");
        return this.toRun(result.rows[0]);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
    const result = await this.pool.query<RunRow>(
      `INSERT INTO test_runs (test_run_id, stage_id, scenario_id, scenario_version, namespace, owner_id, status, seed)
       VALUES ($1, 'V1.1', $2, '1.0.0', $3, $4, 'QUEUED', $5) RETURNING *`,
      [testRunId, scenarioId, namespace, ownerId, seed]
    );
    return this.toRun(result.rows[0]);
  }

  async find(testRunId: string, ownerId: string): Promise<TestRun | null> {
    if (this.storageMode === "stage") {
      const result = await this.pool.query<StageRunRow>("SELECT * FROM acceptance_stage_runs WHERE test_run_id=$1 AND owner_id=$2 AND stage_id='V1.1'", [testRunId, ownerId]);
      return result.rowCount === 1 ? this.fromStageRun(result.rows[0]) : null;
    }
    const result = await this.pool.query<RunRow>("SELECT * FROM test_runs WHERE test_run_id = $1 AND owner_id = $2", [testRunId, ownerId]);
    return result.rowCount === 1 ? this.toRun(result.rows[0]) : null;
  }

  async updateStatus(testRunId: string, status: TestRunStatus, accountId: string | null = null, error: string | null = null): Promise<void> {
    if (this.storageMode === "stage") {
      const client = await this.pool.connect();
      try {
        await client.query("BEGIN");
        const legacy = await client.query(
          `UPDATE test_runs SET status=$2, account_id=COALESCE($3,account_id), error=$4,
             completed_at=CASE WHEN $2 IN ('COMPLETED','FAILED') THEN now() ELSE NULL END
           WHERE test_run_id=$1 RETURNING account_id,created_at,completed_at`,
          [testRunId, status, accountId, error]
        );
        if (legacy.rowCount !== 1) throw new Error("legacy V1.1 TestRun disappeared during dual write");
        const stage = await client.query(
          `UPDATE acceptance_stage_runs SET status=$2,
             evidence=evidence || jsonb_build_object('legacyAccountId',$3::text,'legacyError',$4::text),
             completed_at=CASE WHEN $2 IN ('COMPLETED','FAILED') THEN now() ELSE NULL END
           WHERE test_run_id=$1 AND stage_id='V1.1' RETURNING test_run_id`,
          [testRunId, status, legacy.rows[0].account_id, error]
        );
        if (stage.rowCount !== 1) throw new Error("unified V1.1 TestRun is missing during dual write");
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
      return;
    }
    await this.pool.query(
      `UPDATE test_runs
       SET status = $2, account_id = COALESCE($3, account_id), error = $4,
           completed_at = CASE WHEN $2 IN ('COMPLETED', 'FAILED') THEN now() ELSE NULL END
       WHERE test_run_id = $1`,
      [testRunId, status, accountId, error]
    );
  }

  async transitionStatus(testRunId: string, from: TestRunStatus, to: TestRunStatus, accountId: string | null = null, error: string | null = null): Promise<boolean> {
    if (this.storageMode === "stage") {
      const client = await this.pool.connect();
      try {
        await client.query("BEGIN");
        const legacy = await client.query(
          `UPDATE test_runs SET status=$3, account_id=COALESCE($4,account_id), error=$5,
             completed_at=CASE WHEN $3 IN ('COMPLETED','FAILED') THEN now() ELSE NULL END
           WHERE test_run_id=$1 AND status=$2 RETURNING account_id`,
          [testRunId, from, to, accountId, error]
        );
        if (legacy.rowCount === 0) {
          await client.query("COMMIT");
          return false;
        }
        const stage = await client.query(
          `UPDATE acceptance_stage_runs SET status=$3,
             evidence=evidence || jsonb_build_object('legacyAccountId',$4::text,'legacyError',$5::text),
             completed_at=CASE WHEN $3 IN ('COMPLETED','FAILED') THEN now() ELSE NULL END
           WHERE test_run_id=$1 AND stage_id='V1.1' AND status=$2 RETURNING test_run_id`,
          [testRunId, from, to, legacy.rows[0].account_id, error]
        );
        if (stage.rowCount !== 1) throw new Error("unified V1.1 TestRun status diverged during atomic transition");
        await client.query("COMMIT");
        return true;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
    const result = await this.pool.query(
      `UPDATE test_runs SET status=$3, account_id=COALESCE($4,account_id), error=$5,
         completed_at=CASE WHEN $3 IN ('COMPLETED','FAILED') THEN now() ELSE NULL END
       WHERE test_run_id=$1 AND status=$2`,
      [testRunId, from, to, accountId, error]
    );
    return result.rowCount === 1;
  }

  async replaceAssertions(testRunId: string, assertions: TestAssertion[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM test_assertions WHERE test_run_id = $1", [testRunId]);
      for (const assertion of assertions) {
        await client.query(
          `INSERT INTO test_assertions (test_assertion_id, test_run_id, assertion_id, status, expected, actual, evidence)
           VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb)`,
          [randomUUID(), testRunId, assertion.assertionId, assertion.status, JSON.stringify(assertion.expected), JSON.stringify(assertion.actual), JSON.stringify(assertion.evidence)]
        );
      }
      if (this.storageMode === "stage") {
        const persisted = await client.query<{ assertions: unknown }>(`SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'assertionId',assertion_id,'status',status,'expected',expected,'actual',actual,'evidence',evidence,'createdAt',created_at
        ) ORDER BY assertion_id),'[]'::jsonb) AS assertions FROM test_assertions WHERE test_run_id=$1`, [testRunId]);
        const stage = await client.query("UPDATE acceptance_stage_runs SET assertions=$2::jsonb WHERE test_run_id=$1 AND stage_id='V1.1' RETURNING test_run_id", [testRunId, JSON.stringify(persisted.rows[0].assertions)]);
        if (stage.rowCount !== 1) throw new Error("unified V1.1 TestRun is missing during assertion dual write");
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async assertions(testRunId: string): Promise<TestAssertion[]> {
    if (this.storageMode === "stage") {
      const result = await this.pool.query<{ assertions: Array<Record<string, unknown>> }>("SELECT assertions FROM acceptance_stage_runs WHERE test_run_id=$1 AND stage_id='V1.1'", [testRunId]);
      if (result.rowCount !== 1) throw new Error("unified V1.1 TestRun is missing while reading assertions");
      return result.rows[0].assertions.map((assertion) => ({
        assertionId: String(assertion.assertionId),
        status: assertion.status as TestAssertion["status"],
        expected: assertion.expected,
        actual: assertion.actual,
        evidence: (assertion.evidence ?? {}) as Record<string, unknown>
      }));
    }
    const result = await this.pool.query<{
      assertion_id: string;
      status: "PASS" | "FAIL" | "WAITING";
      expected: unknown;
      actual: unknown;
      evidence: Record<string, unknown>;
    }>("SELECT assertion_id, status, expected, actual, evidence FROM test_assertions WHERE test_run_id = $1 ORDER BY assertion_id", [testRunId]);
    return result.rows.map((row) => ({
      assertionId: row.assertion_id,
      status: row.status,
      expected: row.expected,
      actual: row.actual,
      evidence: row.evidence
    }));
  }

  private toRun(row: RunRow): TestRun {
    return {
      testRunId: row.test_run_id,
      stageId: row.stage_id,
      scenarioId: row.scenario_id,
      scenarioVersion: row.scenario_version,
      namespace: row.namespace,
      ownerId: row.owner_id,
      status: row.status,
      seed: row.seed,
      accountId: row.account_id,
      createdAt: row.created_at.toISOString(),
      completedAt: row.completed_at?.toISOString() ?? null,
      error: row.error
    };
  }

  private fromStageRun(row: StageRunRow): TestRun {
    const evidence = row.evidence;
    return {
      testRunId: row.test_run_id,
      stageId: "V1.1",
      scenarioId: row.scenario_id as ScenarioId,
      scenarioVersion: "1.0.0",
      namespace: row.namespace,
      ownerId: row.owner_id,
      status: row.status as TestRunStatus,
      seed: row.seed,
      accountId: evidence.legacyAccountId ? String(evidence.legacyAccountId) : null,
      createdAt: row.created_at.toISOString(),
      completedAt: row.completed_at?.toISOString() ?? null,
      error: evidence.legacyError ? String(evidence.legacyError) : null
    };
  }
}

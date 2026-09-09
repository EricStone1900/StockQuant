import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import type { ScenarioId, TestAssertion, TestRun, TestRunStatus } from "../domain/test-run.js";

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

export class PostgresTestRunRepository {
  constructor(private readonly pool: Pool) {}

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
    const result = await this.pool.query<RunRow>(
      `INSERT INTO test_runs (test_run_id, stage_id, scenario_id, scenario_version, namespace, owner_id, status, seed)
       VALUES ($1, 'V1.1', $2, '1.0.0', $3, $4, 'QUEUED', $5) RETURNING *`,
      [testRunId, scenarioId, namespace, ownerId, seed]
    );
    return this.toRun(result.rows[0]);
  }

  async find(testRunId: string, ownerId: string): Promise<TestRun | null> {
    const result = await this.pool.query<RunRow>("SELECT * FROM test_runs WHERE test_run_id = $1 AND owner_id = $2", [testRunId, ownerId]);
    return result.rowCount === 1 ? this.toRun(result.rows[0]) : null;
  }

  async updateStatus(testRunId: string, status: TestRunStatus, accountId: string | null = null, error: string | null = null): Promise<void> {
    await this.pool.query(
      `UPDATE test_runs
       SET status = $2, account_id = COALESCE($3, account_id), error = $4,
           completed_at = CASE WHEN $2 IN ('COMPLETED', 'FAILED') THEN now() ELSE NULL END
       WHERE test_run_id = $1`,
      [testRunId, status, accountId, error]
    );
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
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async assertions(testRunId: string): Promise<TestAssertion[]> {
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
}

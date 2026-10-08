import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresStageRunRepository } from "../../src/adapters/postgres-stage-run-repository.js";

const connectionString = process.env.PLATFORM_API_TEST_DATABASE_URL;
if (connectionString && decodeURIComponent(new URL(connectionString).pathname.slice(1)) !== "platform_api_test") throw new Error("PLATFORM_API_TEST_DATABASE_URL must target platform_api_test");
const run = connectionString ? describe : describe.skip;

run("PostgreSQL V1.5 TestRun and dispatch Outbox atomicity", () => {
  const pool = new Pool({ connectionString });
  const repository = new PostgresStageRunRepository(pool);
  const ownerId = `v15-outbox-${randomUUID()}`;
  const rollbackOwnerId = `v15-outbox-rollback-${randomUUID()}`;
  const successfulRunId = randomUUID();
  const rollbackRunId = randomUUID();
  let rejectionConstraint = "";

  beforeAll(async () => { await repository.migrate(); });
  afterAll(async () => {
    if (rejectionConstraint) await pool.query(`ALTER TABLE v15_workflow_dispatch_outbox DROP CONSTRAINT IF EXISTS ${rejectionConstraint}`);
    await pool.query("DELETE FROM v15_workflow_dispatch_outbox WHERE event_id = ANY($1::uuid[])", [[successfulRunId, rollbackRunId]]);
    await pool.query("DELETE FROM acceptance_stage_runs WHERE test_run_id = ANY($1::uuid[])", [[successfulRunId, rollbackRunId]]);
    await pool.end();
  });

  const runInput = (testRunId: string, scopedOwnerId = ownerId) => ({
    testRunId, stageId: "V1.5" as const, scenarioId: "normal", scenarioVersion: "1.1.0",
    ownerId: scopedOwnerId, namespace: `v1-5-normal-${testRunId}`, status: "WAITING" as const,
    seed: 20260907, assertions: [{ assertionId: "V1.5-HOLD-002", status: "WAITING" as const, actual: "NOT_RUN" }],
    evidence: { workflow: "NATS_OUTBOX_QUEUED", businessExecution: "QUEUED" },
  });
  const payload = (testRunId: string, scopedOwnerId = ownerId) => ({ testRunId, ownerId: scopedOwnerId, namespace: `v1-5-normal-${testRunId}`, seed: 20260907, scenarioId: "normal", fixtureVersion: "v1.5-no-trade-calendar-1", fixtureSha256: "a".repeat(64), sessions: [] });

  it("commits the WAITING TestRun and its stable Outbox event together", async () => {
    await repository.enqueueV15NoTrade(runInput(successfulRunId), payload(successfulRunId));
    const rows = await pool.query(`SELECT r.status, o.event_id, o.owner_id, o.payload->>'testRunId' AS payload_run_id
      FROM acceptance_stage_runs r JOIN v15_workflow_dispatch_outbox o ON o.event_id=r.test_run_id
      WHERE r.test_run_id=$1 AND r.owner_id=$2`, [successfulRunId, ownerId]);
    expect(rows.rows).toEqual([{ status: "WAITING", event_id: successfulRunId, owner_id: ownerId, payload_run_id: successfulRunId }]);
  });

  it("rolls back the TestRun when inserting its Outbox event fails", async () => {
    rejectionConstraint = `v15_test_reject_${randomUUID().replaceAll("-", "")}`;
    await pool.query(`ALTER TABLE v15_workflow_dispatch_outbox ADD CONSTRAINT ${rejectionConstraint} CHECK (owner_id <> '${rollbackOwnerId}')`);
    await expect(repository.enqueueV15NoTrade(runInput(rollbackRunId, rollbackOwnerId), payload(rollbackRunId, rollbackOwnerId))).rejects.toThrow();
    const rows = await pool.query(`SELECT
      (SELECT count(*)::int FROM acceptance_stage_runs WHERE test_run_id=$1) AS runs,
      (SELECT count(*)::int FROM v15_workflow_dispatch_outbox WHERE event_id=$1) AS outbox`, [rollbackRunId]);
    expect(rows.rows[0]).toEqual({ runs: 0, outbox: 0 });
    await pool.query(`ALTER TABLE v15_workflow_dispatch_outbox DROP CONSTRAINT ${rejectionConstraint}`);
    rejectionConstraint = "";
  });
});

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
  const autoTradeRunId = randomUUID();
  const rejectionRunId = randomUUID();
  const rollbackRunId = randomUUID();
  const foreignRunId = randomUUID();
  const foreignOwnerId = `v15-history-foreign-${randomUUID()}`;
  let rejectionConstraint = "";

  beforeAll(async () => { await repository.migrate(); });
  afterAll(async () => {
    if (rejectionConstraint) await pool.query(`ALTER TABLE v15_workflow_dispatch_outbox DROP CONSTRAINT IF EXISTS ${rejectionConstraint}`);
    await pool.query("DELETE FROM v15_workflow_dispatch_outbox WHERE event_id = ANY($1::uuid[])", [[successfulRunId, autoTradeRunId, rejectionRunId, rollbackRunId, foreignRunId]]);
    await pool.query("DELETE FROM acceptance_stage_run_history WHERE test_run_id = ANY($1::uuid[])", [[successfulRunId, autoTradeRunId, rejectionRunId, rollbackRunId, foreignRunId]]);
    await pool.query("DELETE FROM acceptance_stage_runs WHERE test_run_id = ANY($1::uuid[])", [[successfulRunId, autoTradeRunId, rejectionRunId, rollbackRunId, foreignRunId]]);
    await pool.end();
  });

  const runInput = (testRunId: string, scopedOwnerId = ownerId, scenarioId: "normal" | "auto-trade" | "rejection" = "normal") => ({
    testRunId, stageId: "V1.5" as const, scenarioId, scenarioVersion: scenarioId === "normal" ? "1.1.0" : "1.2.0",
    ownerId: scopedOwnerId, namespace: `v1-5-${scenarioId}-${testRunId}`, status: "WAITING" as const,
    seed: 20260907, assertions: [{ assertionId: "V1.5-HOLD-002", status: "WAITING" as const, actual: "NOT_RUN" }],
    evidence: { workflow: "NATS_OUTBOX_QUEUED", businessExecution: "QUEUED" },
  });
  const payload = (testRunId: string, scopedOwnerId = ownerId, scenarioId: "normal" | "auto-trade" | "rejection" = "normal") => ({ testRunId, ownerId: scopedOwnerId, namespace: `v1-5-${scenarioId}-${testRunId}`, seed: 20260907, scenarioId, fixtureVersion: "v1.5-no-trade-calendar-1", fixtureSha256: "a".repeat(64), sessions: [] });

  it("commits the WAITING TestRun and its stable Outbox event together", async () => {
    await repository.enqueueV15NoTrade(runInput(successfulRunId), payload(successfulRunId));
    const rows = await pool.query(`SELECT r.status, o.event_id, o.owner_id, o.payload->>'testRunId' AS payload_run_id
      FROM acceptance_stage_runs r JOIN v15_workflow_dispatch_outbox o ON o.event_id=r.test_run_id
      WHERE r.test_run_id=$1 AND r.owner_id=$2`, [successfulRunId, ownerId]);
    expect(rows.rows).toEqual([{ status: "WAITING", event_id: successfulRunId, owner_id: ownerId, payload_run_id: successfulRunId }]);
  });

  it("persists the isolated AUTO scenario identity in the same atomic Outbox transaction", async () => {
    await repository.enqueueV15NoTrade(runInput(autoTradeRunId, ownerId, "auto-trade"), payload(autoTradeRunId, ownerId, "auto-trade"));
    await repository.enqueueV15NoTrade(runInput(rejectionRunId, ownerId, "rejection"), payload(rejectionRunId, ownerId, "rejection"));
    const rows = await pool.query(`SELECT r.scenario_id, r.namespace, o.payload->>'scenarioId' AS payload_scenario
      FROM acceptance_stage_runs r JOIN v15_workflow_dispatch_outbox o ON o.event_id=r.test_run_id
      WHERE r.test_run_id = ANY($1::uuid[]) AND r.owner_id=$2 ORDER BY r.scenario_id`, [[autoTradeRunId, rejectionRunId], ownerId]);
    expect(rows.rows).toEqual(expect.arrayContaining([
      { scenario_id: "auto-trade", namespace: `v1-5-auto-trade-${autoTradeRunId}`, payload_scenario: "auto-trade" },
      { scenario_id: "rejection", namespace: `v1-5-rejection-${rejectionRunId}`, payload_scenario: "rejection" },
    ]));
  });

  it("persists owner-scoped AUTO cancellation and keeps the request idempotent", async () => {
    const requestedAt = "2026-10-09T01:00:00.000Z";
    const cancelled = await repository.requestV15AutoTradeCancellation(autoTradeRunId, ownerId, requestedAt);
    expect(cancelled.evidence.autoTradeCancellation).toEqual({ status: "REQUESTED", requestedAt });
    await expect(repository.requestV15AutoTradeCancellation(autoTradeRunId, "another-owner", requestedAt)).rejects.toThrow();
    const replay = await repository.requestV15AutoTradeCancellation(autoTradeRunId, ownerId, "2026-10-09T01:01:00.000Z");
    expect(replay.evidence.autoTradeCancellation).toEqual({ status: "REQUESTED", requestedAt });
    const history = await pool.query("SELECT evidence->'autoTradeCancellation' AS cancellation FROM acceptance_stage_run_history WHERE test_run_id=$1 AND owner_id=$2 ORDER BY revision_id DESC LIMIT 1", [autoTradeRunId, ownerId]);
    expect(history.rows[0]?.cancellation).toEqual({ status: "REQUESTED", requestedAt });
    await pool.query(`UPDATE acceptance_stage_runs SET status='COMPLETED', completed_at=now(),
      evidence=jsonb_set(evidence, '{temporal}', '"COMPLETED"'::jsonb, true)
      WHERE test_run_id=$1 AND owner_id=$2`, [autoTradeRunId, ownerId]);
    const retries = await repository.requestV15AutoTradeCancellation(autoTradeRunId, ownerId, "2026-10-09T01:02:00.000Z");
    expect(retries.status).toBe("COMPLETED");
    expect(retries.evidence.autoTradeCancellation).toEqual({ status: "REQUESTED", requestedAt });
    const historyCount = await pool.query("SELECT count(*)::int AS count FROM acceptance_stage_run_history WHERE test_run_id=$1 AND owner_id=$2", [autoTradeRunId, ownerId]);
    expect(historyCount.rows[0]?.count).toBe(1);
  });

  it("lists only the authenticated owner's bounded V1.5 run summaries", async () => {
    await repository.save({
      testRunId: foreignRunId, stageId: "V1.5", scenarioId: "normal", scenarioVersion: "1.1.0",
      ownerId: foreignOwnerId, status: "COMPLETED", seed: 20260907, assertions: [], evidence: {},
    });
    const rows = await repository.listV15Runs(ownerId, 2);
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.stageId === "V1.5")).toBe(true);
    expect(rows.every((row) => [successfulRunId, autoTradeRunId, rejectionRunId].includes(row.testRunId))).toBe(true);
    expect(rows.some((row) => row.testRunId === foreignRunId)).toBe(false);
    expect(Object.keys(rows[0] ?? {}).sort()).toEqual(["completedAt", "createdAt", "scenarioId", "scenarioVersion", "seed", "stageId", "status", "testRunId"].sort());
    expect(await repository.listV15Runs(foreignOwnerId, 20)).toMatchObject([{ testRunId: foreignRunId, stageId: "V1.5" }]);
    await expect(repository.listV15Runs(ownerId, 51)).rejects.toThrow(/limit/u);
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

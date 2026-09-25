import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { PostgresV24ObservationRepository } from "../dist/adapters/postgres-v24-observation-repository.js";

const connectionString = process.env.PLATFORM_API_TEST_DATABASE_URL ?? "postgresql://platform_api_test:platform_api_test@127.0.0.1:5433/platform_api_test";
const parsed = new URL(connectionString);
if (parsed.pathname.replace(/^\//, "") === "platform_api" || parsed.username === "platform_api") {
  console.error("refusing to run V2.4 observation persistence test against the formal platform_api database; set PLATFORM_API_TEST_DATABASE_URL to an isolated database");
  process.exit(2);
}

const pool = new Pool({ connectionString });
const testRunIds = [];
const firstObservationDay = (Number.parseInt(randomUUID().slice(0, 8), 16) % 364) + 1;
const firstObservationDate = new Date(Date.UTC(2099, 0, firstObservationDay)).toISOString().slice(0, 10);
const nextObservationDate = new Date(Date.UTC(2099, 0, firstObservationDay + 1)).toISOString().slice(0, 10);
const observationDates = [firstObservationDate, nextObservationDate];
const ownerId = "p3-v24-observation-integrity-owner";
const invalidatedRunId = randomUUID();
testRunIds.push(invalidatedRunId);

try {
  const repository = new PostgresV24ObservationRepository(pool);
  await repository.migrate();
  const priorAssertions = [{ assertionId: "V2.4-OBSERVATION-DAY", status: "PASS", expected: "old result", actual: "old result" }];
  const priorEvidence = { observationDate: observationDates[0], observationCounted: true, preservedMarker: "original-completion" };
  await pool.query(`
    INSERT INTO acceptance_stage_runs
      (test_run_id,stage_id,scenario_id,scenario_version,owner_id,namespace,status,seed,assertions,evidence,completed_at)
    VALUES ($1,'V2.4','observation','1.0.0',$2,$3,'COMPLETED',0,$4::jsonb,$5::jsonb,now())
  `, [invalidatedRunId, ownerId, `v24-observation-${observationDates[0]}`, JSON.stringify(priorAssertions), JSON.stringify(priorEvidence)]);
  await pool.query(`
    INSERT INTO v24_observation_days (observation_date,signal_status,simulated_order_status,fill_status,reconciliation_status,outage_status,errors,evidence)
    VALUES ($1,'HOLD','NONE','NONE','PASS','NONE','["late quality error"]'::jsonb,'{"observationCounted":true}'::jsonb)
    ON CONFLICT (observation_date) DO UPDATE SET errors=EXCLUDED.errors,evidence=EXCLUDED.evidence
  `, [observationDates[0]]);
  await pool.query("UPDATE v24_observation_days SET test_run_id=$2 WHERE observation_date=$1", [observationDates[0], invalidatedRunId]);

  await repository.migrate();
  const revised = await pool.query(`
    SELECT s.status,s.evidence,r.prior_status,r.prior_assertions,r.prior_evidence,r.reason
    FROM acceptance_stage_runs s
    JOIN acceptance_stage_run_revisions r USING (test_run_id)
    WHERE s.test_run_id=$1
  `, [invalidatedRunId]);
  assert.equal(revised.rowCount, 1);
  assert.equal(revised.rows[0].status, "FAILED");
  assert.equal(revised.rows[0].evidence.observationCounted, false);
  assert.equal(revised.rows[0].prior_status, "COMPLETED");
  assert.deepEqual(revised.rows[0].prior_assertions, priorAssertions);
  assert.deepEqual(revised.rows[0].prior_evidence, priorEvidence);
  assert.equal(revised.rows[0].reason, "OBSERVATION_EVENT_ERRORS");
  const visibleRevisions = await repository.listRunRevisions(invalidatedRunId, ownerId);
  assert.equal(visibleRevisions.length, 1);
  assert.deepEqual(visibleRevisions[0].priorAssertions, priorAssertions);
  assert.deepEqual(visibleRevisions[0].priorEvidence, priorEvidence);
  assert.deepEqual(await repository.listRunRevisions(invalidatedRunId, randomUUID()), []);
  assert.equal((await repository.listObservationsForOwner(ownerId)).some((item) => item.testRunId === invalidatedRunId), true);
  assert.equal((await repository.listObservationsForOwner(randomUUID())).some((item) => item.testRunId === invalidatedRunId), false);
  await repository.migrate();
  const revisionCount = await pool.query("SELECT count(*)::int AS count FROM acceptance_stage_run_revisions WHERE test_run_id=$1", [invalidatedRunId]);
  assert.equal(revisionCount.rows[0].count, 1);

  const dailyRunId = await repository.ensureDailyTestRun(observationDates[1]);
  testRunIds.push(dailyRunId);
  assert.equal(dailyRunId, await repository.ensureDailyTestRun(observationDates[1]));
  const completionEvidence = { observationCounted: true, reconciliation: { unresolvedOrders: 0 }, observationQuality: { samplingEvents: 10 } };
  await repository.completeDailyTestRun(observationDates[1], dailyRunId, completionEvidence);
  const completed = await pool.query("SELECT status,assertions,evidence,completed_at FROM acceptance_stage_runs WHERE test_run_id=$1", [dailyRunId]);
  assert.equal(completed.rows[0].status, "COMPLETED");
  assert.ok(completed.rows[0].completed_at);
  await repository.completeDailyTestRun(observationDates[1], dailyRunId, completionEvidence);
  await assert.rejects(repository.completeDailyTestRun(observationDates[1], dailyRunId, { ...completionEvidence, observationCounted: false }), (error) => error.getStatus?.() === 409);
  await assert.rejects(repository.completeDailyTestRun(observationDates[1], dailyRunId, { ...completionEvidence, reconciliation: { unresolvedOrders: 1 } }), (error) => error.getStatus?.() === 409);
  const afterRetry = await pool.query("SELECT status,assertions,evidence,completed_at FROM acceptance_stage_runs WHERE test_run_id=$1", [dailyRunId]);
  assert.deepEqual(afterRetry.rows[0], completed.rows[0]);

  console.log(JSON.stringify({
    invalidatedRun: { status: revised.rows[0].status, priorStatusRetained: revised.rows[0].prior_status, revisionCount: revisionCount.rows[0].count, ownerScopedRead: true },
    dailyCompletion: { idempotentRetry: true, conflictingTerminalRewrite: "409", timestampsAndEvidencePreserved: true }
  }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
} finally {
  try {
    for (const testRunId of new Set(testRunIds)) {
      await pool.query("DELETE FROM acceptance_stage_run_revisions WHERE test_run_id=$1", [testRunId]);
      await pool.query("DELETE FROM acceptance_stage_runs WHERE test_run_id=$1", [testRunId]);
    }
    await pool.query("DELETE FROM v24_observation_day_finalizations WHERE observation_date=ANY($1::date[])", [observationDates]);
    await pool.query("DELETE FROM v24_observation_events WHERE observation_date=ANY($1::date[])", [observationDates]);
    await pool.query("DELETE FROM v24_observation_days WHERE observation_date=ANY($1::date[])", [observationDates]);
    await pool.query("DELETE FROM v24_daily_test_runs WHERE observation_date=ANY($1::date[])", [observationDates]);
  } catch (error) {
    console.error("isolated V2.4 test row cleanup failed", error);
    process.exitCode = 1;
  }
  await pool.end().catch((error) => {
    console.error("isolated test database connection close failed", error);
    process.exitCode = 1;
  });
}

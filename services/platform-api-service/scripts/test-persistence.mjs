import assert from "node:assert/strict";
import { Pool } from "pg";
import { PostgresStageRunRepository } from "../dist/adapters/postgres-stage-run-repository.js";

const connectionString = process.env.PLATFORM_API_TEST_DATABASE_URL ?? "postgresql://platform_api_test:platform_api_test@127.0.0.1:5433/platform_api_test";
const parsed = new URL(connectionString);
if (parsed.pathname.replace(/^\//, "") === "platform_api" || parsed.username === "platform_api") {
  console.error("refusing to run platform persistence test against the formal platform_api database; set PLATFORM_API_TEST_DATABASE_URL to an isolated database");
  process.exit(2);
}

let pool = new Pool({ connectionString });
const createdIds = [];

try {
  const repository = new PostgresStageRunRepository(pool);
  await repository.migrate();
  const checks = [];
  for (const stageId of ["V1.2", "V1.3", "V1.4", "V1.5"]) {
    const testRunId = repository.newId();
    createdIds.push(testRunId);
    const base = {
      testRunId,
      stageId,
      scenarioId: "normal",
      scenarioVersion: "1.0.0",
      ownerId: "p3-persistence-owner",
      namespace: `p3-persistence-${stageId.toLowerCase().replace(".", "-")}-${testRunId}`,
      status: "RUNNING",
      seed: 42,
      assertions: [],
      evidence: { environmentMode: "BACKTEST", dataMode: "FIXTURE", brokerMode: "FAKE" }
    };
    const running = await repository.save(base);
    assert.equal(running.completedAt, null);
    const completedInput = {
      ...base,
      status: "COMPLETED",
      assertions: [{ assertionId: `P3-${stageId}-001`, status: "PASS", expected: true, actual: true, evidence: {} }],
      evidence: { ...base.evidence, persisted: true }
    };
    const completed = await repository.save(completedInput);
    assert.ok(completed.completedAt);
    if (stageId === "V1.2") {
      const repeated = await repository.save(completedInput);
      assert.equal(repeated.completedAt, completed.completedAt);
      assert.equal(repeated.createdAt, completed.createdAt);
      const conflicts = [
        { ...completedInput, stageId: "V1.3" },
        { ...completedInput, scenarioId: "recovery" },
        { ...completedInput, scenarioVersion: "2.0.0" },
        { ...completedInput, ownerId: "p3-other-owner" },
        { ...completedInput, namespace: `${base.namespace}-other` },
        { ...completedInput, seed: 43 },
        { ...completedInput, status: "FAILED" },
        { ...completedInput, assertions: [] },
        { ...completedInput, evidence: { ...completedInput.evidence, persisted: false } },
        { ...base, status: "RUNNING" }
      ];
      for (const conflict of conflicts) {
        await assert.rejects(repository.save(conflict), (error) => error.getStatus?.() === 409);
      }
      const duplicateNamespace = { ...base, testRunId: repository.newId() };
      await assert.rejects(repository.save(duplicateNamespace), (error) => error.getStatus?.() === 409);
      assert.deepEqual(await repository.find(testRunId, base.ownerId), completed);
    }
    checks.push({ stageId, testRunId });
  }
  await pool.end();

  pool = new Pool({ connectionString });
  const reopenedRepository = new PostgresStageRunRepository(pool);
  const reloaded = await Promise.all(checks.map(async ({ stageId, testRunId }) => ({ stageId, run: await reopenedRepository.find(testRunId, "p3-persistence-owner"), foreign: await reopenedRepository.find(testRunId, "p3-other-owner") })));
  for (const { run, foreign } of reloaded) {
    assert.equal(run?.status, "COMPLETED");
    assert.equal(run?.assertions.length, 1);
    assert.equal(run?.evidence.persisted, true);
    assert.equal(foreign, null);
  }
  console.log(JSON.stringify({ stages: reloaded.map(({ stageId, run }) => ({ stageId, status: run.status, assertionCount: run.assertions.length, ownerIsolation: true })), conflictChecks: 11, terminalRetryPreservesTimestamps: true }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
} finally {
  try {
    for (const testRunId of createdIds) await pool.query("DELETE FROM acceptance_stage_runs WHERE test_run_id = $1", [testRunId]);
  } catch (error) {
    console.error("isolated test row cleanup failed", error);
    process.exitCode = 1;
  }
  await pool.end().catch((error) => {
    console.error("isolated test database connection close failed", error);
    process.exitCode = 1;
  });
}

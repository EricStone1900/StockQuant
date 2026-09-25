import { Pool } from "pg";
import { PostgresStageRunRepository } from "../dist/adapters/postgres-stage-run-repository.js";

const connectionString = process.env.PLATFORM_API_TEST_DATABASE_URL ?? "postgresql://platform_api_test:platform_api_test@127.0.0.1:5433/platform_api_test";
const parsed = new URL(connectionString);
if (parsed.pathname.replace(/^\//, "") === "platform_api" || parsed.username === "platform_api") {
  console.error("refusing to run platform persistence test against the formal platform_api database; set PLATFORM_API_TEST_DATABASE_URL to an isolated database");
  process.exit(2);
}

const pool = new Pool({ connectionString });
const repository = new PostgresStageRunRepository(pool);

try {
  await repository.migrate();
  const checks = [];
  for (const stageId of ["V1.2", "V1.3", "V1.4", "V1.5"]) {
    const testRunId = repository.newId();
    const base = {
      testRunId,
      stageId,
      scenarioId: "normal",
      scenarioVersion: "1.0.0",
      ownerId: "p3-2-owner",
      namespace: `p3-2-${stageId.toLowerCase().replace(".", "-")}-${testRunId}`,
      status: "RUNNING",
      seed: 42,
      assertions: [],
      evidence: { environmentMode: "BACKTEST", dataMode: "FIXTURE", brokerMode: "FAKE" }
    };
    await repository.save(base);
    await repository.save({ ...base, status: "COMPLETED", assertions: [{ assertionId: `P3-2-${stageId}-001`, status: "PASS", expected: true, actual: true, evidence: {} }], evidence: { ...base.evidence, persisted: true } });
    checks.push({ stageId, testRunId });
  }
  await pool.end();

  const reopenedPool = new Pool({ connectionString });
  const reopenedRepository = new PostgresStageRunRepository(reopenedPool);
  const reloaded = await Promise.all(checks.map(async ({ stageId, testRunId }) => ({ stageId, run: await reopenedRepository.find(testRunId, "p3-2-owner"), foreign: await reopenedRepository.find(testRunId, "p3-2-other-owner") })));
  console.log(JSON.stringify({ stages: reloaded.map(({ stageId, run, foreign }) => ({ stageId, status: run?.status, assertionCount: run?.assertions?.length ?? null, ownerIsolation: foreign === null })) }, null, 2));
  for (const { testRunId } of checks) await reopenedPool.query("DELETE FROM acceptance_stage_runs WHERE test_run_id = $1", [testRunId]);
  await reopenedPool.end();
  process.exit(reloaded.every(({ run, foreign }) => run?.status === "COMPLETED" && foreign === null) ? 0 : 1);
} catch (error) {
  await pool.end().catch(() => undefined);
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
}

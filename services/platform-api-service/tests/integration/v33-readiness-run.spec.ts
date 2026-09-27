import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresStageRunRepository } from "../../src/adapters/postgres-stage-run-repository.js";

const connectionString = process.env.PLATFORM_API_TEST_DATABASE_URL;
if (connectionString && decodeURIComponent(new URL(connectionString).pathname.slice(1)) !== "platform_api_test") throw new Error("PLATFORM_API_TEST_DATABASE_URL must target platform_api_test");
const run = connectionString ? describe : describe.skip;

run("PostgreSQL V3.3 readiness TestRun persistence", () => {
  const pool = new Pool({ connectionString });
  const repository = new PostgresStageRunRepository(pool);
  const testRunId = randomUUID();
  const ownerId = "v33-readiness-integration-owner";

  beforeAll(() => repository.migrate());
  afterAll(async () => {
    await pool.query("DELETE FROM acceptance_stage_runs WHERE test_run_id=$1 AND stage_id='V3.3' AND owner_id=$2", [testRunId, ownerId]);
    await pool.end();
  });

  it("persists WAITING and NOT_RUN evidence under one owner with an idempotent read", async () => {
    const initial = await repository.save({
      testRunId, stageId: "V3.3", scenarioId: "recovery", scenarioVersion: "v3.3-readiness-v1", ownerId,
      status: "WAITING", seed: 20260907,
      assertions: [{ id: "V3.1_ACCEPTANCE", status: "NOT_RUN", reason: "not verified" }],
      evidence: { readiness: "WAITING", runnerDispatch: "NOT_PERFORMED", runnerJobsCreated: 0, externalModelCalls: 0 },
    });
    expect(initial).toMatchObject({ testRunId, stageId: "V3.3", status: "WAITING", seed: 20260907 });
    await expect(repository.find(testRunId, ownerId)).resolves.toMatchObject({ status: "WAITING", evidence: { runnerJobsCreated: 0 } });
    await expect(repository.find(testRunId, "different-owner")).resolves.toBeNull();
    await expect(repository.save(initial)).resolves.toMatchObject({ status: "WAITING", evidence: { runnerJobsCreated: 0 } });
    await expect(repository.find(testRunId, ownerId)).resolves.toMatchObject({ status: "WAITING", assertions: [{ status: "NOT_RUN" }] });
  });
});

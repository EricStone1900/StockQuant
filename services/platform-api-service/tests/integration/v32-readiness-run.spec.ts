import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresStageRunRepository } from "../../src/adapters/postgres-stage-run-repository.js";

const connectionString = process.env.PLATFORM_API_TEST_DATABASE_URL;
if (connectionString && decodeURIComponent(new URL(connectionString).pathname.slice(1)) !== "platform_api_test") throw new Error("PLATFORM_API_TEST_DATABASE_URL must target platform_api_test");
const run = connectionString ? describe : describe.skip;

run("PostgreSQL V3.2 readiness TestRun persistence", () => {
  const pool = new Pool({ connectionString });
  const repository = new PostgresStageRunRepository(pool);
  const testRunId = randomUUID();
  const ownerId = "v32-readiness-integration-owner";

  beforeAll(() => repository.migrate());
  afterAll(async () => {
    await pool.query("DELETE FROM acceptance_stage_runs WHERE test_run_id=$1 AND stage_id='V3.2' AND owner_id=$2", [testRunId, ownerId]);
    await pool.end();
  });

  it("persists readiness-only state and returns it only to the owning user", async () => {
    const initial = await repository.save({
      testRunId, stageId: "V3.2", scenarioId: "recovery", scenarioVersion: "v3.2-readiness-v1", ownerId,
      namespace: `v3-2-recovery-${testRunId}`, status: "WAITING", seed: 20260907,
      assertions: [{ id: "V3.2_BUSINESS_WORKFLOW", status: "NOT_RUN", reason: "business workflow is not implemented" }],
      evidence: { readiness: "WAITING", sourceMode: "READINESS_ONLY", candidateExecution: "NOT_PERFORMED", registryMutation: "NOT_PERFORMED", paperCalls: 0, businessValidation: "NOT_RUN", humanAcceptance: "NOT_RUN" },
    });
    expect(initial).toMatchObject({ testRunId, stageId: "V3.2", scenarioVersion: "v3.2-readiness-v1", status: "WAITING", seed: 20260907 });
    await expect(repository.find(testRunId, ownerId)).resolves.toMatchObject({ status: "WAITING", evidence: { candidateExecution: "NOT_PERFORMED", paperCalls: 0 } });
    await expect(repository.find(testRunId, "different-owner")).resolves.toBeNull();
    await expect(repository.save(initial)).resolves.toMatchObject({ status: "WAITING", evidence: { sourceMode: "READINESS_ONLY" } });
  });
});

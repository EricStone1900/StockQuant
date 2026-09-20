import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createExperiment, validateRequest } from "../../src/domain/experiment.js";
import { PgExperimentRepository } from "../../src/adapters/pg-experiment-repository.js";

const connectionString = process.env.RESEARCH_AUTOMATION_DATABASE_URL;
const run = connectionString ? describe : describe.skip;
const request = { fixtureId: "v3.1-research-small-sample-1", modelProfile: "UNSET", rounds: 1, budgetCents: 100, environmentMode: "RESEARCH", brokerMode: "FAKE", idempotencyKey: `integration-${randomUUID()}` };

run("PostgreSQL experiment repository", () => {
  const pool = new Pool({ connectionString });
  const repository = new PgExperimentRepository(pool);
  const experiment = createExperiment(validateRequest(request));

  beforeAll(async () => repository.initialize());
  afterAll(async () => {
    await pool.query("DELETE FROM research_experiments WHERE experiment_id=$1", [experiment.experimentId]);
    await pool.end();
  });

  it("persists and retrieves an idempotent experiment", async () => {
    await repository.save(experiment);
    await expect(repository.findById(experiment.experimentId)).resolves.toMatchObject({ experimentId: experiment.experimentId, status: "PENDING_PREREQUISITES" });
    await expect(repository.findByIdempotencyKey(experiment.idempotencyKey)).resolves.toMatchObject({ experimentId: experiment.experimentId });
  });
});

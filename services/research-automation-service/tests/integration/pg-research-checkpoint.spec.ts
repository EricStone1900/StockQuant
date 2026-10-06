import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PgExperimentRepository } from "../../src/adapters/pg-experiment-repository.js";
import { PgResearchCheckpointRepository } from "../../src/adapters/pg-research-checkpoint-repository.js";
import { createExperiment } from "../../src/domain/experiment.js";
import { createResearchCheckpoint, ResearchCheckpointConflict } from "../../src/domain/research-checkpoint.js";

const connectionString = process.env.RESEARCH_AUTOMATION_DATABASE_URL;
if (connectionString && new URL(connectionString).pathname.replace(/^\//u, "") !== "research_automation_test") {
  throw new Error("RESEARCH_AUTOMATION_DATABASE_URL must target the isolated research_automation_test database");
}
const run = connectionString ? describe : describe.skip;

run("PostgreSQL research checkpoint persistence", () => {
  const pool = new Pool({ connectionString });
  const experimentId = randomUUID();
  const testRunId = randomUUID();
  const experiments = new PgExperimentRepository(pool);
  const checkpoints = new PgResearchCheckpointRepository(pool);

  beforeAll(async () => {
    await experiments.initialize();
    await checkpoints.initialize();
    await experiments.save(createExperiment({ testRunId, fixtureId: "fixture-checkpoint", modelProfile: "fixture", rounds: 2, budgetCurrency: "USD", budgetCents: 10, environmentMode: "RESEARCH", brokerMode: "FAKE", idempotencyKey: `checkpoint-${experimentId}` }, new Date(), experimentId));
  });
  afterAll(async () => {
    await pool.query("DELETE FROM research_checkpoints WHERE experiment_id=$1", [experimentId]);
    await pool.query("DELETE FROM research_experiments WHERE experiment_id=$1", [experimentId]);
    await pool.end();
  });

  it("persists ordered round-bound state and permits only identical sequence replay", async () => {
    const first = createResearchCheckpoint(experimentId, { schemaVersion: "v3.3-research-checkpoint-v1", testRunId, roundIndex: 2, sequence: 1, state: { cursor: 10 } }, new Date("2026-10-03T00:00:00.000Z"));
    await expect(checkpoints.append(first)).resolves.toMatchObject({ existing: false, checkpoint: { sequence: 1, state: { cursor: 10 } } });
    const replay = createResearchCheckpoint(experimentId, { schemaVersion: "v3.3-research-checkpoint-v1", testRunId, roundIndex: 2, sequence: 1, state: { cursor: 10 } }, new Date());
    await expect(checkpoints.append(replay)).resolves.toMatchObject({ existing: true, checkpoint: { sequence: 1, createdAt: first.createdAt } });
    const second = createResearchCheckpoint(experimentId, { schemaVersion: "v3.3-research-checkpoint-v1", testRunId, roundIndex: 2, sequence: 2, state: { cursor: 20 } }, new Date());
    await checkpoints.append(second);
    await expect(checkpoints.latest(testRunId, experimentId, 2)).resolves.toMatchObject({ sequence: 2, state: { cursor: 20 } });
    await expect(checkpoints.list(testRunId, experimentId, 2)).resolves.toMatchObject([
      { sequence: 1, state: { cursor: 10 } },
      { sequence: 2, state: { cursor: 20 } },
    ]);
    await expect(checkpoints.list(randomUUID(), experimentId, 2)).resolves.toEqual([]);
    const conflicting = createResearchCheckpoint(experimentId, { schemaVersion: "v3.3-research-checkpoint-v1", testRunId, roundIndex: 2, sequence: 1, state: { cursor: 11 } }, new Date());
    await expect(checkpoints.append(conflicting)).rejects.toBeInstanceOf(ResearchCheckpointConflict);
    const skipped = createResearchCheckpoint(experimentId, { schemaVersion: "v3.3-research-checkpoint-v1", testRunId, roundIndex: 2, sequence: 4, state: { cursor: 40 } }, new Date());
    await expect(checkpoints.append(skipped)).rejects.toThrow(/sequence must be 3/u);
  });
});

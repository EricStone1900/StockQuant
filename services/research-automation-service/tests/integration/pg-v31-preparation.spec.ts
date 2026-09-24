import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PgArtifactRefRepository } from "../../src/adapters/pg-artifact-ref-repository.js";
import { PgRunnerJobStore } from "../../src/adapters/pg-runner-job-store.js";
import type { RunnerJobRecord } from "../../src/application/v31-runner-jobs.js";
import type { ArtifactRef } from "../../src/application/v31-runtime-guards.js";

const connectionString = process.env.RESEARCH_AUTOMATION_DATABASE_URL;
const run = connectionString ? describe : describe.skip;

run("PostgreSQL V3.1 preparation persistence", () => {
  const pool = new Pool({ connectionString });
  const suffix = randomUUID().replaceAll("-", "");
  const jobId = `pg-${suffix}:exp-1`;
  const namespace = `research/pg-${suffix}/exp-1/outputs`;
  const job: RunnerJobRecord["job"] = {
    schemaVersion: "v3.1-runner-job-v1",
    testRunId: `pg-${suffix}`,
    experimentId: "exp-1",
    imageDigest: `sha256:${"a".repeat(64)}`,
    inputArtifact: `research/pg-${suffix}/exp-1/inputs/${"b".repeat(64)}`,
    outputNamespace: namespace,
    resources: { cpuMilli: 500, memoryMiB: 512, timeoutSeconds: 10, pidsLimit: 32 },
    networkPolicy: { mode: "DENY", allowlist: [] },
  };
  const record: RunnerJobRecord = { jobId, job, status: "QUEUED", submittedAt: new Date().toISOString(), startedAt: null, completedAt: null, execution: null, artifacts: [], attempt: 1, retryOf: null };
  const ref: ArtifactRef = { schemaVersion: "v3.1-artifact-ref-v1", artifactId: "run-log", kind: "RUN_LOG", namespace, sha256: "c".repeat(64), status: "PUBLISHED", sourceRef: `runner:${jobId}` };
  const jobs = new PgRunnerJobStore(pool);
  const artifacts = new PgArtifactRefRepository(pool);

  beforeAll(async () => { await jobs.initialize(); await artifacts.initialize(); });
  afterAll(async () => {
    await pool.query("DELETE FROM research_runner_jobs WHERE job_id=$1", [jobId]);
    await pool.query("DELETE FROM research_artifact_refs WHERE namespace=$1 AND artifact_id=$2", [namespace, ref.artifactId]);
    await pool.end();
  });

  it("persists runner status and artifact refs for later process reads", async () => {
    await jobs.save(record);
    await artifacts.save(ref);
    await expect(jobs.get(jobId)).resolves.toMatchObject({ jobId, status: "QUEUED", job: { testRunId: job.testRunId } });
    await expect(artifacts.get(namespace, ref.artifactId)).resolves.toMatchObject({ artifactId: ref.artifactId, status: "PUBLISHED", sha256: ref.sha256 });
  });
});

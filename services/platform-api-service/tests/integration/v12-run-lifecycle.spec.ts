import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresQlibFixtureArtifactRepository } from "../../src/adapters/postgres-qlib-fixture-artifact-repository.js";
import { QlibArtifactContentStore } from "../../src/adapters/qlib-artifact-content-store.js";
import { PostgresStageRunRepository } from "../../src/adapters/postgres-stage-run-repository.js";

const connectionString = process.env.PLATFORM_API_TEST_DATABASE_URL;
if (connectionString && decodeURIComponent(new URL(connectionString).pathname.slice(1)) !== "platform_api_test") throw new Error("PLATFORM_API_TEST_DATABASE_URL must target platform_api_test");
const run = connectionString ? describe : describe.skip;

run("PostgreSQL V1.2 Qlib TestRun task lifecycle", () => {
  const pool = new Pool({ connectionString });
  const repository = new PostgresStageRunRepository(pool);
  const competingRepository = new PostgresStageRunRepository(pool);
  const ownerId = `v12-task-${randomUUID()}`;
  const runIds = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
  let artifactRoot = "";
  let artifactRepository: PostgresQlibFixtureArtifactRepository;

  beforeAll(async () => {
    await repository.migrate();
    artifactRoot = await mkdtemp(join(tmpdir(), "stockquant-v12-artifact-integration-"));
    artifactRepository = new PostgresQlibFixtureArtifactRepository(pool, new QlibArtifactContentStore(artifactRoot));
    await artifactRepository.migrate();
  });
  afterAll(async () => {
    for (const testRunId of runIds) await pool.query("DELETE FROM qlib_fixture_artifacts WHERE test_run_id=$1 AND owner_id=$2", [testRunId, ownerId]);
    for (const testRunId of runIds) {
      await pool.query("DELETE FROM acceptance_stage_run_history WHERE test_run_id=$1 AND owner_id=$2", [testRunId, ownerId]);
      await pool.query("DELETE FROM acceptance_stage_runs WHERE test_run_id=$1 AND owner_id=$2", [testRunId, ownerId]);
    }
    await pool.end();
    if (artifactRoot) await rm(artifactRoot, { recursive: true, force: true });
  });

  it("persists worker progress, serializes duplicate workers, and recovers a stranded run", async () => {
    const testRunId = runIds[0];
    await repository.save({ testRunId, stageId: "V1.2", scenarioId: "normal", scenarioVersion: "v12-task-v1", ownerId, status: "RUNNING", seed: 7, assertions: [], evidence: { qlibTask: { phase: "FITTING_CN_A", resumeCount: 0 } } });
    expect((await repository.listRunnableV12Runs()).some((item) => item.testRunId === testRunId)).toBe(true);
    let acquired!: () => void;
    let release!: () => void;
    const acquiredSignal = new Promise<void>((resolve) => { acquired = resolve; });
    const hold = new Promise<void>((resolve) => { release = resolve; });
    const firstWorker = repository.withV12RunLock(testRunId, async () => { acquired(); await hold; });
    await acquiredSignal;
    await expect(competingRepository.withV12RunLock(testRunId, async () => "duplicate")).resolves.toBeUndefined();
    release();
    await firstWorker;
    await expect(competingRepository.withV12RunLock(testRunId, async () => "recovered-after-process-exit")).resolves.toBe("recovered-after-process-exit");
    expect(await repository.updateV12Progress(testRunId, ownerId, { phase: "RESUMING_AFTER_PLATFORM_RESTART", resumeCount: 1 })).toBe(true);
    expect((await repository.find(testRunId, ownerId))?.evidence.qlibTask).toMatchObject({ phase: "RESUMING_AFTER_PLATFORM_RESTART", resumeCount: 1 });
  });

  it("fences cancellation against publication and records cancellation before Artifact publication", async () => {
    const cancelledRunId = runIds[1];
    await repository.save({ testRunId: cancelledRunId, stageId: "V1.2", scenarioId: "normal", scenarioVersion: "v12-task-v1", ownerId, status: "RUNNING", seed: 7, assertions: [], evidence: { qlibTask: { phase: "FITTING_US_EQUITY", cancelRequested: false, artifactPublished: false } } });
    const cancellation = await repository.requestV12Cancellation(cancelledRunId, ownerId);
    expect(cancellation.evidence.qlibTask).toMatchObject({ cancelRequested: true });
    await expect(repository.updateV12Progress(cancelledRunId, ownerId, { phase: "PUBLISHING_ARTIFACT" })).resolves.toBe(false);
    const cancelled = await repository.finishV12Run(cancelledRunId, ownerId, "CANCELLED", [{ assertionId: "V1.2-QLIB-CANCEL-001", status: "PASS" }], { ...cancellation.evidence, qlibTask: { ...(cancellation.evidence.qlibTask as object), phase: "CANCELLED", artifactPublished: false } });
    expect(cancelled.status).toBe("CANCELLED");
    await expect(repository.finishV12Run(cancelledRunId, ownerId, "COMPLETED", [], {})).rejects.toThrow("no longer running");

    const publishingId = randomUUID();
    runIds.push(publishingId);
    await repository.save({ testRunId: publishingId, stageId: "V1.2", scenarioId: "normal", scenarioVersion: "v12-task-v1", ownerId, status: "RUNNING", seed: 7, assertions: [], evidence: { qlibTask: { phase: "PUBLISHING_ARTIFACT", cancelRequested: false } } });
    await expect(repository.requestV12Cancellation(publishingId, ownerId)).rejects.toThrow("fenced finalization");
    const completed = await repository.finishV12Run(publishingId, ownerId, "COMPLETED", [], { qlibTask: { phase: "COMPLETED", artifactPublished: true } });
    expect(completed.status).toBe("COMPLETED");
  });

  it("scopes identical immutable Artifact hashes to separate TestRuns and keeps per-run retries idempotent", async () => {
    await pool.query("ALTER TABLE qlib_fixture_artifacts DROP CONSTRAINT qlib_fixture_artifacts_pkey, ADD CONSTRAINT qlib_fixture_artifacts_pkey PRIMARY KEY(artifact_id)");
    await artifactRepository.migrate();
    const firstRunId = runIds[2];
    const secondRunId = runIds[3];
    for (const testRunId of [firstRunId, secondRunId]) {
      await repository.save({ testRunId, stageId: "V1.2", scenarioId: "normal", scenarioVersion: "v12-task-v1", ownerId, status: "RUNNING", seed: 7, assertions: [], evidence: { qlibTask: { phase: "PUBLISHING_ARTIFACT" } } });
    }
    const input = { ownerId, mediaType: "application/vnd.stockquant.qlib-fixture-model+json", payload: { schemaVersion: "v1.2-qlib-strategy-artifact-v1", fixtureVersion: "v1.2-market-data-4", predictions: [0.1, 0.2] } } as const;
    const first = await artifactRepository.save({ ...input, testRunId: firstRunId });
    const retry = await artifactRepository.save({ ...input, testRunId: firstRunId });
    const second = await artifactRepository.save({ ...input, testRunId: secondRunId });
    expect(retry.artifactId).toBe(first.artifactId);
    expect(second.artifactId).toBe(first.artifactId);
    expect(second.sha256).toBe(first.sha256);
    await expect(artifactRepository.find(firstRunId, first.artifactId, ownerId)).resolves.toMatchObject({ artifactId: first.artifactId, sha256: first.sha256 });
    await expect(artifactRepository.find(secondRunId, second.artifactId, ownerId)).resolves.toMatchObject({ artifactId: second.artifactId, sha256: second.sha256 });
    await expect(artifactRepository.find(firstRunId, first.artifactId, "another-owner")).rejects.toThrow("not found in user scope");
    await expect(artifactRepository.find(randomUUID(), first.artifactId, ownerId)).rejects.toThrow("not found in user scope");
    await expect(artifactRepository.findLifecycle(firstRunId, first.artifactId, ownerId)).resolves.toEqual({ status: "PUBLISHED" });
    await expect(artifactRepository.findLifecycle(firstRunId, first.artifactId, "another-owner")).rejects.toThrow("not found in user scope");
  });

  it("keeps V1.2 artifacts unreadable while pending and exposes them only after explicit publish", async () => {
    const testRunId = randomUUID();
    await repository.save({ testRunId, stageId: "V1.2", scenarioId: "normal", scenarioVersion: "v12-task-v1", ownerId, status: "RUNNING", seed: 7, assertions: [], evidence: { qlibTask: { phase: "PUBLISHING_ARTIFACT" } } });
    const input = { testRunId, ownerId, mediaType: "application/vnd.stockquant.qlib-fixture-model+json", payload: { schemaVersion: "v1.2-qlib-strategy-artifact-v1", fixtureVersion: "v1.2-market-data-4", predictions: [0.3] } } as const;
    const staged = await artifactRepository.savePending(input);
    await expect(artifactRepository.find(testRunId, staged.artifactId, ownerId)).rejects.toThrow("not found in user scope");
    await expect(artifactRepository.findLifecycle(testRunId, staged.artifactId, ownerId)).resolves.toEqual({ status: "PENDING" });
    const published = await artifactRepository.publishPending(testRunId, staged.artifactId, ownerId);
    await expect(artifactRepository.find(testRunId, staged.artifactId, ownerId)).resolves.toMatchObject({ status: "PUBLISHED", artifactId: staged.artifactId });
    await expect(artifactRepository.publishPending(testRunId, staged.artifactId, ownerId)).resolves.toMatchObject({ status: "PUBLISHED" });
    expect(published.status).toBe("PUBLISHED");
    await artifactRepository.setExpiry(testRunId, staged.artifactId, ownerId, new Date(Date.now() - 60_000).toISOString());
    await artifactRepository.transition(testRunId, staged.artifactId, ownerId, "EXPIRED");
    await expect(artifactRepository.savePending(input)).rejects.toThrow("expired immutable Qlib artifact cannot be reused or republished");
    await expect(artifactRepository.find(testRunId, staged.artifactId, ownerId)).rejects.toThrow("not found in user scope");
  });
});

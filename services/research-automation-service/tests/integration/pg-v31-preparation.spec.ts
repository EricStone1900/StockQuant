import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PgArtifactRefRepository } from "../../src/adapters/pg-artifact-ref-repository.js";
import { PgBudgetLedger } from "../../src/adapters/pg-budget-ledger.js";
import { PgExperimentRepository } from "../../src/adapters/pg-experiment-repository.js";
import { PgRunnerJobStore } from "../../src/adapters/pg-runner-job-store.js";
import { ExperimentService } from "../../src/application/experiment-service.js";
import { FileArtifactStore } from "../../src/adapters/file-artifact-content-store.js";
import { inspectArtifactOrphans, quarantineArtifactOrphans } from "../../src/application/v31-artifact-reconcile.js";
import { RunnerJobCoordinator, type RunnerJobRecord } from "../../src/application/v31-runner-jobs.js";
import { sha256, type ArtifactRef } from "../../src/application/v31-runtime-guards.js";

const connectionString = process.env.RESEARCH_AUTOMATION_DATABASE_URL;
if (connectionString) {
  const databaseName = new URL(connectionString).pathname.replace(/^\//, "");
  if (databaseName !== "research_automation_test") throw new Error("RESEARCH_AUTOMATION_DATABASE_URL must target the isolated research_automation_test database");
}
const run = connectionString ? describe : describe.skip;

run("PostgreSQL V3.1 preparation persistence", () => {
  const pool = new Pool({ connectionString });
  const suffix = randomUUID().replaceAll("-", "");
  const jobId = `pg-${suffix}:exp-1`;
  const otherRunJobId = `pg-${suffix}:other-run`;
  const cancelJobId = `pg-${suffix}:cancel`;
  const cancelRaceJobId = `pg-${suffix}:cancel-race`;
  const submissionRaceJobId = `pg-${suffix}-submission-race:exp-1:round-2`;
  const attemptsJobId = `pg-${suffix}:fenced-attempts`;
  const capacityJobIds = [`pg-${suffix}:capacity-a`, `pg-${suffix}:capacity-b`, `pg-${suffix}:legacy-no-lease`];
  const cursorRunId = `cursor-${suffix}`;
  const cursorJobIds = [`${cursorRunId}:a`, `${cursorRunId}:b`, `${cursorRunId}:c`, `cursor-other-${suffix}:x`, `${cursorRunId}:late`];
  const namespace = `research/pg-${suffix}/exp-1/outputs`;
  const raceTestRunId = `pg-${suffix}-publish-race`;
  const raceNamespace = `research/${raceTestRunId}/exp-1/outputs`;
  const attemptsNamespace = `research/${raceTestRunId}/attempts/outputs`;
  const lateReferencedArtifactId = `late-reference-${suffix}`;
  const stageId = `cancel-${suffix}`;
  const cancelledExperimentIds: string[] = [];
  const job: RunnerJobRecord["job"] = {
    schemaVersion: "v3.1-runner-job-v1",
    testRunId: `pg-${suffix}`,
    experimentId: "exp-1",
    roundIndex: 2,
    imageDigest: `sha256:${"a".repeat(64)}`,
    inputArtifact: `research/pg-${suffix}/exp-1/inputs/${"b".repeat(64)}`,
    outputNamespace: namespace,
    resources: { cpuMilli: 500, memoryMiB: 512, timeoutSeconds: 10, pidsLimit: 32 },
    networkPolicy: { mode: "DENY", allowlist: [] },
  };
  const record: RunnerJobRecord = { jobId, job, status: "QUEUED", submittedAt: new Date().toISOString(), startedAt: null, completedAt: null, execution: null, artifacts: [], attempt: 1, retryOf: null, lease: null };
  const ref: ArtifactRef = { schemaVersion: "v3.1-artifact-ref-v1", artifactId: "run-log", kind: "RUN_LOG", namespace, sha256: "c".repeat(64), status: "PUBLISHED", sourceRef: `runner:${jobId}` };
  const lifecycleRef: ArtifactRef = { ...ref, artifactId: "lifecycle-log", expiresAt: "2026-09-01T00:00:00.000Z" };
  const futureExpiryRef: ArtifactRef = { ...ref, artifactId: "future-expiry-log", expiresAt: "2099-01-01T00:00:00.000Z" };
  const jobs = new PgRunnerJobStore(pool);
  const artifacts = new PgArtifactRefRepository(pool);
  const experiments = new PgExperimentRepository(pool);
  const budget = new PgBudgetLedger(pool, 1000, 1000, 80, stageId);
  const experimentService = new ExperimentService(experiments, { now: () => new Date("2026-10-03T00:00:00.000Z") }, 1000, budget);

  beforeAll(async () => { await jobs.initialize(); await artifacts.initialize(); await experiments.initialize(); await budget.initialize(); });
  afterAll(async () => {
    await pool.query("DELETE FROM research_runner_jobs WHERE job_id = ANY($1::text[])", [[jobId, otherRunJobId, cancelJobId, cancelRaceJobId, submissionRaceJobId, attemptsJobId, `${attemptsJobId}:retry-2`, `${jobId}:lease`, ...capacityJobIds, ...cursorJobIds]]);
    await pool.query("DELETE FROM research_artifact_refs WHERE (namespace=$1 AND artifact_id=ANY($2::text[])) OR namespace=ANY($3::text[])", [namespace, [ref.artifactId, lifecycleRef.artifactId, futureExpiryRef.artifactId, lateReferencedArtifactId], [raceNamespace, attemptsNamespace]]);
    await pool.query("DELETE FROM research_experiments WHERE experiment_id = ANY($1::uuid[])", [cancelledExperimentIds]);
    await pool.query("DELETE FROM research_budget_allocations WHERE stage_id=$1", [stageId]);
    await pool.query("DELETE FROM research_budget_stage_limits WHERE stage_id=$1", [stageId]);
    await pool.end();
  });

  it("persists runner status and artifact refs for later process reads", async () => {
    await jobs.save(record);
    await artifacts.save(ref);
    await expect(jobs.get(jobId)).resolves.toMatchObject({ jobId, status: "QUEUED", job: { testRunId: job.testRunId, roundIndex: 2 } });
    await expect(artifacts.get(namespace, ref.artifactId)).resolves.toMatchObject({ artifactId: ref.artifactId, status: "PUBLISHED", sha256: ref.sha256 });
    await expect(artifacts.listAll()).resolves.toEqual(expect.arrayContaining([expect.objectContaining({ namespace, artifactId: ref.artifactId, sha256: ref.sha256 })]));
  });

  it("persists separate round-bound Jobs for the same TestRun and Experiment", async () => {
    const testRunId = `pg-${suffix}-rounds`;
    const experimentId = "exp-rounds";
    const coordinator = new RunnerJobCoordinator(jobs);
    const makeRound = (roundIndex: number): RunnerJobRecord["job"] => ({
      ...job,
      testRunId,
      experimentId,
      roundIndex,
      inputArtifact: `research/${testRunId}/${experimentId}/inputs/${"b".repeat(64)}`,
      outputNamespace: `research/${testRunId}/${experimentId}/outputs`,
    });
    const roundOne = await coordinator.submit(makeRound(1));
    const roundTwo = await coordinator.submit(makeRound(2));
    try {
      expect(roundOne.jobId).toBe(`${testRunId}:${experimentId}:round-1`);
      expect(roundTwo.jobId).toBe(`${testRunId}:${experimentId}:round-2`);
      await expect(coordinator.submit(makeRound(1))).resolves.toEqual(roundOne);
      await expect(jobs.listForTestRun(testRunId, 0, 10)).resolves.toMatchObject([
        { jobId: roundOne.jobId, job: { roundIndex: 1 } },
        { jobId: roundTwo.jobId, job: { roundIndex: 2 } },
      ]);
    } finally {
      await pool.query("DELETE FROM research_runner_jobs WHERE job_id = ANY($1::text[])", [[roundOne.jobId, roundTwo.jobId]]);
    }
  });

  it("atomically preserves the first Runner payload and conflicts concurrent changed submissions", async () => {
    const coordinator = new RunnerJobCoordinator(jobs);
    const runId = `${job.testRunId}-submission-race`;
    const original = { ...job, testRunId: runId, inputArtifact: `research/${runId}/exp-1/inputs/${"f".repeat(64)}`, outputNamespace: `research/${runId}/exp-1/outputs` };
    const changed = { ...original, imageDigest: `sha256:${"d".repeat(64)}` };
    const results = await Promise.allSettled([coordinator.submit(original), coordinator.submit(changed)]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    const stored = await jobs.get(submissionRaceJobId);
    expect(stored?.job.imageDigest).toBe((results.find((result) => result.status === "fulfilled") as PromiseFulfilledResult<RunnerJobRecord>).value.job.imageDigest);
    await expect(coordinator.submit(stored!.job)).resolves.toMatchObject({ status: "QUEUED", job: { imageDigest: stored!.job.imageDigest } });
    await expect(coordinator.submit({ ...stored!.job, imageDigest: `sha256:${"e".repeat(64)}` })).rejects.toThrow("runner job identity was reused");
  });

  it("lists only the requested TestRun queue page in deterministic order", async () => {
    const otherRunJob = { ...record, jobId: otherRunJobId, job: { ...job, testRunId: `${job.testRunId}-other`, experimentId: "other" }, submittedAt: new Date(Date.now() + 1).toISOString() };
    await jobs.save(record);
    await jobs.save(otherRunJob);
    await expect(jobs.listForTestRun(job.testRunId, 0, 10)).resolves.toEqual([expect.objectContaining({ jobId, job: expect.objectContaining({ testRunId: job.testRunId }) })]);
    await expect(jobs.listForTestRun(job.testRunId, 1, 10)).resolves.toEqual([]);
    const index = await pool.query("SELECT indexdef FROM pg_indexes WHERE schemaname=current_schema() AND indexname='research_runner_jobs_test_run_submitted_idx'");
    expect(index.rows[0]?.indexdef).toContain("job ->> 'testRunId'");
  });

  it("continues keyset pages by exact ordering key while later jobs arrive", async () => {
    const baseTime = Date.parse("2026-09-27T00:00:00Z");
    const makeRecord = (id: string, index: number, testRunId = cursorRunId): RunnerJobRecord => ({ ...record, jobId: id, job: { ...job, testRunId, experimentId: `cursor-${index}` }, submittedAt: new Date(baseTime + index).toISOString() });
    const initialRecords = [makeRecord(cursorJobIds[0], 0), makeRecord(cursorJobIds[1], 1), makeRecord(cursorJobIds[2], 2), makeRecord(cursorJobIds[3], 3, `cursor-other-${suffix}`)];
    await Promise.all(initialRecords.map((value) => jobs.save(value)));
    const first = await jobs.listAfterTestRun(cursorRunId, null, 1);
    expect(first.map((value) => value.jobId)).toEqual([cursorJobIds[0]]);

    await jobs.save(makeRecord(cursorJobIds[4], 4));
    const seen = [...first.map((value) => value.jobId)];
    let after = { submittedAt: first[0].submittedAt, jobId: first[0].jobId };
    while (true) {
      const page = await jobs.listAfterTestRun(cursorRunId, after, 1);
      if (page.length === 0) break;
      seen.push(page[0].jobId);
      after = { submittedAt: page[0].submittedAt, jobId: page[0].jobId };
    }
    expect(seen).toEqual(cursorJobIds.slice(0, 3).concat(cursorJobIds[4]));
  });

  it("detects a filesystem artifact left by a crash before its PostgreSQL reference commit", async () => {
    const root = mkdtempSync(join(tmpdir(), "stockquant-artifact-crash-window-"));
    try {
      const bytes = new TextEncoder().encode(`orphan-${suffix}`);
      const orphanRef: ArtifactRef = { schemaVersion: "v3.1-artifact-ref-v1", artifactId: `crash-${suffix}`, kind: "OUTPUT", namespace, sha256: sha256(bytes), status: "PENDING", sourceRef: `runner:crash:${suffix}` };
      await new FileArtifactStore(root).publish(orphanRef, bytes);
      expect(await artifacts.get(namespace, orphanRef.artifactId)).toBeNull();
      const report = await inspectArtifactOrphans(root, await artifacts.listAll(), { minAgeMs: 0, now: new Date(Date.now() + 2_000) });
      expect(report.orphans).toContainEqual(expect.objectContaining({ namespace, artifactId: orphanRef.artifactId, sha256: orphanRef.sha256, sizeBytes: bytes.byteLength }));
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("refuses stale orphan reports when a PostgreSQL ArtifactRef appears before quarantine", async () => {
    const root = mkdtempSync(join(tmpdir(), "stockquant-artifact-stale-report-"));
    const quarantine = mkdtempSync(join(tmpdir(), "stockquant-artifact-stale-quarantine-"));
    try {
      const bytes = new TextEncoder().encode(`late-reference-${suffix}`);
      const candidate: ArtifactRef = { schemaVersion: "v3.1-artifact-ref-v1", artifactId: lateReferencedArtifactId, kind: "OUTPUT", namespace, sha256: sha256(bytes), status: "PUBLISHED", sourceRef: `runner:late-reference:${suffix}` };
      await new FileArtifactStore(root).publish(candidate, bytes);
      const staleReport = await inspectArtifactOrphans(root, await artifacts.listAll(), { minAgeMs: 0, now: new Date(Date.now() + 2_000) });
      expect(staleReport.orphans).toContainEqual(expect.objectContaining({ namespace, artifactId: lateReferencedArtifactId }));
      await artifacts.save(candidate);
      await expect(quarantineArtifactOrphans(staleReport, root, quarantine, await artifacts.listAll())).rejects.toThrow("gained an ArtifactRef after check-only");
      expect(await new FileArtifactStore(root).read(candidate)).toEqual(Buffer.from(bytes));
    } finally {
      rmSync(root, { recursive: true, force: true });
      rmSync(quarantine, { recursive: true, force: true });
    }
  });

  it("atomically claims jobs and fences stale workers after lease takeover", async () => {
    const leaseTestRunId = `${job.testRunId}-lease`;
    await jobs.save({ ...record, jobId: `${jobId}:lease`, job: { ...job, testRunId: leaseTestRunId, experimentId: "lease" } });
    const leaseJobId = `${jobId}:lease`;
    // Use an epoch at least as new as pre-existing test leases; the dedicated test
    // database may contain expired rows from earlier runs.
    const t0 = new Date();
    const claims = await Promise.all([jobs.claim("pg-worker-a", t0, 1000, leaseTestRunId), jobs.claim("pg-worker-b", t0, 1000, leaseTestRunId)]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    const first = claims.find(Boolean)!;
    expect(first.lease?.fencingToken).toBe(1);
    expect(await jobs.claim("pg-worker-b", new Date(t0.getTime() + 1001), 1000, leaseTestRunId)).toMatchObject({ jobId: leaseJobId, lease: { fencingToken: 2 } });
    await expect(jobs.heartbeat(leaseJobId, first.lease!.workerId, 1, new Date(t0.getTime() + 1100), 1000)).resolves.toBeNull();
    await expect(jobs.complete(leaseJobId, first.lease!.workerId, 1, new Date(t0.getTime() + 1100), { status: "COMPLETED", exitCode: 0, signal: null, stdout: "stale", stderr: "", durationMs: 1 }, [])).resolves.toBeNull();
    const current = await jobs.get(leaseJobId);
    await expect(jobs.complete(leaseJobId, current!.lease!.workerId, 2, new Date(t0.getTime() + 1200), { status: "COMPLETED", exitCode: 0, signal: null, stdout: "current", stderr: "", durationMs: 1 }, [])).resolves.toMatchObject({ status: "COMPLETED", lease: null });
  });

  it("persists Runner cancellation and rejects late heartbeat or completion", async () => {
    const cancelTestRunId = `${job.testRunId}-cancel`;
    await jobs.save({ ...record, jobId: cancelJobId, job: { ...job, testRunId: cancelTestRunId, experimentId: "cancel" } });
    const now = new Date();
    const lease = await jobs.claim("cancel-worker", now, 30_000, cancelTestRunId);
    expect(lease).toMatchObject({ jobId: cancelJobId, status: "RUNNING", lease: { workerId: "cancel-worker", fencingToken: 1 } });
    const cancelled = await jobs.cancel(cancelJobId, new Date(now.getTime() + 1));
    expect(cancelled).toMatchObject({ status: "CANCELLED", completedAt: new Date(now.getTime() + 1).toISOString(), execution: null, artifacts: [], lease: null });
    await expect(jobs.cancel(cancelJobId, new Date(now.getTime() + 2))).resolves.toEqual(cancelled);
    await expect(jobs.heartbeat(cancelJobId, "cancel-worker", 1, new Date(now.getTime() + 3), 30_000)).resolves.toBeNull();
    await expect(jobs.complete(cancelJobId, "cancel-worker", 1, new Date(now.getTime() + 4), { status: "COMPLETED", exitCode: 0, signal: null, stdout: "late", stderr: "", durationMs: 1 }, [ref])).resolves.toBeNull();
  });

  it("serializes output Artifact publication against cancellation with the job-row lock", async () => {
    const cancellationWinsRun = `${job.testRunId}-cancel-wins`;
    const cancelWinsJobId = `${jobId}:cancel-wins`;
    await jobs.save({ ...record, jobId: cancelWinsJobId, job: { ...job, testRunId: cancellationWinsRun, experimentId: "cancel-wins", outputNamespace: `research/${cancellationWinsRun}/exp-1/outputs` } });
    const cancelWinsLease = await jobs.claim("cancel-wins-worker", new Date(), 30_000, cancellationWinsRun);
    await jobs.cancel(cancelWinsJobId, new Date());
    let latePersistCalled = false;
    const lateRef: ArtifactRef = { ...ref, artifactId: `late-${suffix}`, namespace: `research/${cancellationWinsRun}/exp-1/outputs`, sourceRef: `runner:${cancelWinsJobId}:fence:${cancelWinsLease!.lease!.fencingToken}` };
    await expect(jobs.publishOutputArtifact({ jobId: cancelWinsJobId, workerId: "cancel-wins-worker", fencingToken: cancelWinsLease!.lease!.fencingToken, now: new Date(), artifact: { ...lateRef, kind: "OUTPUT", status: "PENDING" }, persist: async () => { latePersistCalled = true; return lateRef; } })).resolves.toEqual({ published: false });
    expect(latePersistCalled).toBe(false);

    await jobs.save({ ...record, jobId: cancelRaceJobId, job: { ...job, testRunId: raceTestRunId, experimentId: "exp-1", outputNamespace: raceNamespace } });
    const raceLease = await jobs.claim("publication-worker", new Date(), 30_000, raceTestRunId);
    const raceRef: ArtifactRef = { ...ref, artifactId: `race-${suffix}`, namespace: raceNamespace, kind: "OUTPUT", status: "PENDING", sourceRef: `runner:${cancelRaceJobId}:fence:${raceLease!.lease!.fencingToken}` };
    let beginPersist!: () => void;
    let releasePersist!: () => void;
    const persistStarted = new Promise<void>((resolve) => { beginPersist = resolve; });
    const persistGate = new Promise<void>((resolve) => { releasePersist = resolve; });
    const publish = jobs.publishOutputArtifact({ jobId: cancelRaceJobId, workerId: "publication-worker", fencingToken: raceLease!.lease!.fencingToken, now: new Date(), artifact: raceRef, persist: async (client) => {
      beginPersist();
      await persistGate;
      return artifacts.saveWithinTransaction(client, { ...raceRef, status: "PUBLISHED" });
    } });
    await persistStarted;
    let cancelSettled = false;
    const cancel = jobs.cancel(cancelRaceJobId, new Date()).finally(() => { cancelSettled = true; });
    await new Promise((resolve) => setTimeout(resolve, 25));
    expect(cancelSettled).toBe(false);
    releasePersist();
    await expect(publish).resolves.toMatchObject({ published: true, value: { status: "PUBLISHED", artifactId: raceRef.artifactId } });
    await expect(cancel).resolves.toMatchObject({ status: "CANCELLED", artifacts: [expect.objectContaining({ artifactId: raceRef.artifactId, status: "PUBLISHED" })] });
    await expect(artifacts.get(raceNamespace, raceRef.artifactId)).resolves.toMatchObject({ status: "PUBLISHED", sha256: raceRef.sha256 });
  });

  it("retains output Artifact references across a fenced Runner takeover", async () => {
    const attemptsTestRunId = `${job.testRunId}-attempt-history`;
    await jobs.save({ ...record, jobId: attemptsJobId, job: { ...job, testRunId: attemptsTestRunId, experimentId: "attempts", outputNamespace: attemptsNamespace } });
    const now = new Date();
    const first = await jobs.claim("attempt-one", now, 1000, attemptsTestRunId);
    const firstRef: ArtifactRef = { ...ref, artifactId: `attempt-one-${suffix}`, namespace: attemptsNamespace, kind: "OUTPUT", status: "PENDING", sourceRef: `runner:${attemptsJobId}:fence:1` };
    const firstPublication = await jobs.publishOutputArtifact({ jobId: attemptsJobId, workerId: "attempt-one", fencingToken: first!.lease!.fencingToken, now, artifact: firstRef, persist: (client) => artifacts.saveWithinTransaction(client, { ...firstRef, status: "PUBLISHED" }) });
    expect(firstPublication.published).toBe(true);

    const secondNow = new Date(now.getTime() + 1001);
    await expect(jobs.heartbeat(attemptsJobId, "attempt-one", 1, secondNow, 1000)).resolves.toBeNull();
    const second = await jobs.claim("attempt-two", secondNow, 30_000, attemptsTestRunId);
    expect(second).toMatchObject({ lease: { fencingToken: 2 }, status: "RUNNING" });
    const secondRef: ArtifactRef = { ...firstRef, artifactId: `attempt-two-${suffix}`, status: "PENDING", sourceRef: `runner:${attemptsJobId}:fence:2` };
    await jobs.publishOutputArtifact({ jobId: attemptsJobId, workerId: "attempt-two", fencingToken: second!.lease!.fencingToken, now: secondNow, artifact: secondRef, persist: (client) => artifacts.saveWithinTransaction(client, { ...secondRef, status: "PUBLISHED" }) });
    const completed = await jobs.complete(attemptsJobId, "attempt-two", 2, new Date(secondNow.getTime() + 1), { status: "COMPLETED", exitCode: 0, signal: null, stdout: "recovered", stderr: "", durationMs: 1 }, [{ ...secondRef, status: "PUBLISHED" }]);
    expect(completed?.artifacts).toEqual([{ ...firstRef, status: "PUBLISHED" }, { ...secondRef, status: "PUBLISHED" }]);

    const coordinator = new RunnerJobCoordinator(jobs);
    const retryResults = await Promise.all([coordinator.retry(attemptsJobId), coordinator.retry(attemptsJobId)]);
    const retry = retryResults[0];
    expect(retryResults[1]).toEqual(retry);
    expect(retry).toMatchObject({ jobId: `${attemptsJobId}:retry-2`, attempt: 2, retryOf: attemptsJobId, status: "QUEUED", artifacts: [] });
    await expect(coordinator.retry(attemptsJobId)).resolves.toEqual(retry);
    const retryLease = await jobs.claim("attempt-three", new Date(secondNow.getTime() + 2), 30_000, attemptsTestRunId);
    expect(retryLease).toMatchObject({ jobId: retry.jobId, attempt: 2, retryOf: attemptsJobId });
    const retryCompleted = await jobs.complete(retry.jobId, "attempt-three", retryLease!.lease!.fencingToken, new Date(secondNow.getTime() + 3), { status: "COMPLETED", exitCode: 0, signal: null, stdout: "retry-complete", stderr: "", durationMs: 1 }, []);
    expect(retryCompleted).toMatchObject({ status: "COMPLETED", attempt: 2, retryOf: attemptsJobId });
    await expect(jobs.get(attemptsJobId)).resolves.toMatchObject({ attempt: 1, artifacts: [{ artifactId: firstRef.artifactId }, { artifactId: secondRef.artifactId }] });
    await expect(jobs.get(retry.jobId)).resolves.toMatchObject({ attempt: 2, retryOf: attemptsJobId, execution: { stdout: "retry-complete" } });
  });

  it("enforces the single active Runner slot across workers and TestRun scopes", async () => {
    const testRunIds = [`${job.testRunId}-capacity-a`, `${job.testRunId}-capacity-b`];
    await Promise.all(capacityJobIds.map((id, index) => jobs.save({ ...record, jobId: id, job: { ...job, testRunId: testRunIds[index], experimentId: `capacity-${index}` } })));
    const now = new Date();
    const claims = await Promise.all([
      jobs.claim("capacity-worker-a", now, 30_000, testRunIds[0]),
      jobs.claim("capacity-worker-b", now, 30_000, testRunIds[1]),
    ]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    const activeCount = await pool.query<{ count: string }>("SELECT count(*)::text AS count FROM research_runner_jobs WHERE status='RUNNING' AND lease_expires_at>now() AND job_id=ANY($1::text[])", [capacityJobIds]);
    expect(Number(activeCount.rows[0].count)).toBe(1);
    const active = claims.find(Boolean)!;
    await expect(jobs.complete(active.jobId, active.lease!.workerId, active.lease!.fencingToken, new Date(), { status: "COMPLETED", exitCode: 0, signal: null, stdout: "capacity-released", stderr: "", durationMs: 1 }, [])).resolves.toMatchObject({ status: "COMPLETED" });
    const nextIndex = active.jobId === capacityJobIds[0] ? 1 : 0;
    const next = await jobs.claim("capacity-worker-b", new Date(), 30_000, testRunIds[nextIndex]);
    expect(next).toMatchObject({ jobId: capacityJobIds[nextIndex], lease: { fencingToken: 1 } });
    await expect(jobs.complete(next!.jobId, next!.lease!.workerId, next!.lease!.fencingToken, new Date(), { status: "COMPLETED", exitCode: 0, signal: null, stdout: "capacity-released", stderr: "", durationMs: 1 }, [])).resolves.toMatchObject({ status: "COMPLETED" });
  });

  it("takes over legacy RUNNING rows without a lease and advances their fence", async () => {
    const legacyTestRunId = `${job.testRunId}-legacy`;
    const legacyJobId = capacityJobIds[2];
    await jobs.save({ ...record, jobId: legacyJobId, status: "RUNNING", job: { ...job, testRunId: legacyTestRunId, experimentId: "legacy-no-lease" }, startedAt: record.submittedAt });
    const claim = await jobs.claim("legacy-recovery-worker", new Date(), 30_000, legacyTestRunId);
    expect(claim).toMatchObject({ jobId: legacyJobId, status: "RUNNING", lease: { workerId: "legacy-recovery-worker", fencingToken: 1 } });
  });

  it("rejects changing the hash or source behind an existing artifact identity", async () => {
    await artifacts.save(ref);
    await expect(artifacts.save({ ...ref, sha256: "d".repeat(64) })).rejects.toThrow("artifact reference identity is immutable");
    await expect(artifacts.save({ ...ref, sourceRef: "runner:other-job" })).rejects.toThrow("artifact reference identity is immutable");
    await expect(artifacts.get(namespace, ref.artifactId)).resolves.toMatchObject({ sha256: ref.sha256, sourceRef: ref.sourceRef });
  });

  it("persists EXPIRED as a terminal lifecycle status without allowing resurrection", async () => {
    await artifacts.save(lifecycleRef);
    await artifacts.save({ ...lifecycleRef, status: "EXPIRED" });
    await expect(artifacts.get(namespace, lifecycleRef.artifactId)).resolves.toMatchObject({ artifactId: lifecycleRef.artifactId, status: "EXPIRED", sha256: lifecycleRef.sha256 });
    await expect(artifacts.save(lifecycleRef)).rejects.toThrow("EXPIRED -> PUBLISHED is not allowed");
  });

  it("does not persist EXPIRED before the immutable retention timestamp", async () => {
    await artifacts.save(futureExpiryRef);
    await expect(artifacts.save({ ...futureExpiryRef, status: "EXPIRED" })).rejects.toThrow("artifact reference identity is immutable");
    await expect(artifacts.get(namespace, futureExpiryRef.artifactId)).resolves.toMatchObject({ status: "PUBLISHED", expiresAt: futureExpiryRef.expiresAt });
  });

  it("settles cancelled, never-started experiments at zero and keeps UNKNOWN reservations", async () => {
    const request = { fixtureId: "test-fixture", modelProfile: "UNSET", rounds: 1, budgetCurrency: "USD" as const, budgetCents: 300, environmentMode: "RESEARCH" as const, brokerMode: "FAKE" as const, idempotencyKey: `cancel-${suffix}` };
    const unused = await experimentService.create(request);
    cancelledExperimentIds.push(unused.experiment.experimentId);
    await experimentService.cancel(unused.experiment.experimentId);
    await experimentService.cancel(unused.experiment.experimentId);
    await expect(budget.get(unused.experiment.experimentId)).resolves.toMatchObject({ status: "SETTLED", spentCents: 0 });

    const uncertain = await experimentService.create({ ...request, idempotencyKey: `unknown-${suffix}` });
    cancelledExperimentIds.push(uncertain.experiment.experimentId);
    await budget.settle(uncertain.experiment.experimentId, "UNKNOWN");
    await experimentService.cancel(uncertain.experiment.experimentId);
    await expect(budget.get(uncertain.experiment.experimentId)).resolves.toMatchObject({ status: "UNKNOWN", reservedCents: 300 });
  });
});

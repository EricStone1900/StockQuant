import { randomUUID } from "node:crypto";
import type { RunnerExecutionResult } from "./v31-runner-executor.js";
import type { ArtifactRef, RunnerJob } from "./v31-runtime-guards.js";
import { validateRunnerJob } from "./v31-runtime-guards.js";

export type RunnerJobStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "TIMED_OUT" | "OUTPUT_LIMIT" | "SPAWN_FAILED";
export type RunnerJobRecord = { jobId: string; job: RunnerJob; status: RunnerJobStatus; submittedAt: string; startedAt: string | null; completedAt: string | null; execution: RunnerExecutionResult | null; artifacts: ArtifactRef[]; attempt: number; retryOf: string | null };

export interface RunnerJobStore {
  save(record: RunnerJobRecord): Promise<RunnerJobRecord> | RunnerJobRecord;
  get(jobId: string): Promise<RunnerJobRecord | null> | RunnerJobRecord | null;
}

export class InMemoryRunnerJobStore implements RunnerJobStore {
  private readonly jobs = new Map<string, RunnerJobRecord>();
  save(record: RunnerJobRecord): RunnerJobRecord { this.jobs.set(record.jobId, record); return record; }
  get(jobId: string): RunnerJobRecord | null { return this.jobs.get(jobId) ?? null; }
}

export class RunnerJobCoordinator {
  constructor(private readonly store: RunnerJobStore) {}

  async submit(job: RunnerJob): Promise<RunnerJobRecord> {
    validateRunnerJob(job);
    const jobId = `${job.testRunId}:${job.experimentId}`;
    const existing = await this.store.get(jobId);
    if (existing) return existing;
    return this.store.save({ jobId, job, status: "QUEUED", submittedAt: new Date().toISOString(), startedAt: null, completedAt: null, execution: null, artifacts: [], attempt: 1, retryOf: null });
  }

  async markStarted(jobId: string): Promise<RunnerJobRecord> {
    const record = await this.require(jobId);
    if (record.status !== "QUEUED") throw new Error("runner job is not queued");
    return this.store.save({ ...record, status: "RUNNING", startedAt: new Date().toISOString() });
  }

  async markCompleted(jobId: string, execution: RunnerExecutionResult, artifacts: ArtifactRef[] = []): Promise<RunnerJobRecord> {
    const record = await this.require(jobId);
    if (record.status !== "RUNNING") throw new Error("runner job is not running");
    return this.store.save({ ...record, status: execution.status, completedAt: new Date().toISOString(), execution, artifacts });
  }

  async retry(jobId: string): Promise<RunnerJobRecord> {
    const record = await this.require(jobId);
    if (!["COMPLETED", "FAILED", "TIMED_OUT", "OUTPUT_LIMIT", "SPAWN_FAILED"].includes(record.status)) throw new Error("only a terminal runner job can be retried");
    const attempt = record.attempt + 1;
    const retryJobId = `${record.jobId}:retry-${attempt}`;
    const existing = await this.store.get(retryJobId);
    if (existing) return existing;
    return this.store.save({ jobId: retryJobId, job: record.job, status: "QUEUED", submittedAt: new Date().toISOString(), startedAt: null, completedAt: null, execution: null, artifacts: [], attempt, retryOf: record.jobId });
  }

  async get(jobId: string): Promise<RunnerJobRecord | null> { return this.store.get(jobId); }
  private async require(jobId: string): Promise<RunnerJobRecord> { const record = await this.store.get(jobId); if (!record) throw new Error("runner job not found"); return record; }
}

export function newRunnerJobId(job: RunnerJob): string { return `${job.testRunId}:${job.experimentId}:${randomUUID()}`; }

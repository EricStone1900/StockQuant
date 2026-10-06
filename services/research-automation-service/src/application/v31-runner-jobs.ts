import { randomUUID } from "node:crypto";
import type { RunnerExecutionResult } from "./v31-runner-executor.js";
import type { ArtifactRef, RunnerJob } from "./v31-runtime-guards.js";
import { validateRunnerJob } from "./v31-runtime-guards.js";

export type RunnerJobStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "TIMED_OUT" | "OUTPUT_LIMIT" | "SPAWN_FAILED" | "CANCELLED";
export type RunnerJobLease = { workerId: string; fencingToken: number; expiresAt: string };
export type RunnerJobRecord = { jobId: string; job: RunnerJob; status: RunnerJobStatus; submittedAt: string; startedAt: string | null; completedAt: string | null; execution: RunnerExecutionResult | null; artifacts: ArtifactRef[]; attempt: number; retryOf: string | null; lease: RunnerJobLease | null };
export type RunnerJobCursor = { submittedAt: string; jobId: string };

export interface RunnerClock { now(): Date }
export class SystemRunnerClock implements RunnerClock { now(): Date { return new Date(); } }

export interface RunnerJobStore {
  save(record: RunnerJobRecord): Promise<RunnerJobRecord> | RunnerJobRecord;
  createIfAbsent(record: RunnerJobRecord): Promise<RunnerJobRecord> | RunnerJobRecord;
  get(jobId: string): Promise<RunnerJobRecord | null> | RunnerJobRecord | null;
  listForTestRun(testRunId: string, offset: number, limit: number): Promise<RunnerJobRecord[]> | RunnerJobRecord[];
  listAfterTestRun(testRunId: string, after: RunnerJobCursor | null, limit: number): Promise<RunnerJobRecord[]> | RunnerJobRecord[];
  claim(workerId: string, now: Date, leaseMs: number, testRunId?: string): Promise<RunnerJobRecord | null> | RunnerJobRecord | null;
  heartbeat(jobId: string, workerId: string, fencingToken: number, now: Date, leaseMs: number): Promise<RunnerJobRecord | null> | RunnerJobRecord | null;
  complete(jobId: string, workerId: string, fencingToken: number, now: Date, execution: RunnerExecutionResult, artifacts: ArtifactRef[]): Promise<RunnerJobRecord | null> | RunnerJobRecord | null;
  cancel(jobId: string, now: Date): Promise<RunnerJobRecord | null> | RunnerJobRecord | null;
}

export class InMemoryRunnerJobStore implements RunnerJobStore {
  private readonly jobs = new Map<string, RunnerJobRecord>();
  save(record: RunnerJobRecord): RunnerJobRecord { this.jobs.set(record.jobId, record); return record; }
  createIfAbsent(record: RunnerJobRecord): RunnerJobRecord {
    const existing = this.jobs.get(record.jobId);
    if (existing) return existing;
    this.jobs.set(record.jobId, record);
    return record;
  }
  get(jobId: string): RunnerJobRecord | null { return this.jobs.get(jobId) ?? null; }
  listForTestRun(testRunId: string, offset: number, limit: number): RunnerJobRecord[] {
    return [...this.jobs.values()].filter((record) => record.job.testRunId === testRunId)
      .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt) || a.jobId.localeCompare(b.jobId))
      .slice(offset, offset + limit);
  }
  listAfterTestRun(testRunId: string, after: RunnerJobCursor | null, limit: number): RunnerJobRecord[] {
    const ordered = [...this.jobs.values()].filter((record) => record.job.testRunId === testRunId)
      .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt) || a.jobId.localeCompare(b.jobId));
    const start = after ? ordered.findIndex((record) => record.submittedAt === after.submittedAt && record.jobId === after.jobId) + 1 : 0;
    if (after && start === 0) return [];
    return ordered.slice(start, start + limit);
  }
  claim(workerId: string, now: Date, leaseMs: number, testRunId?: string): RunnerJobRecord | null {
    // Keep the in-memory adapter faithful to PgRunnerJobStore: V3.1 capacity
    // is one across all TestRuns, and claims use the same stable FIFO key.
    const active = [...this.jobs.values()].filter((job) => job.status === "RUNNING" && Date.parse(job.lease?.expiresAt ?? "") > now.getTime());
    if (active.length >= 1) return null;
    const record = [...this.jobs.values()]
      .filter((job) => (!testRunId || job.job.testRunId === testRunId) && (job.status === "QUEUED" || (job.status === "RUNNING" && Date.parse(job.lease?.expiresAt ?? "") <= now.getTime())))
      .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt) || a.jobId.localeCompare(b.jobId))[0];
    if (!record) return null;
    const fencingToken = (record.lease?.fencingToken ?? 0) + 1;
    const claimed = { ...record, status: "RUNNING" as const, startedAt: record.startedAt ?? now.toISOString(), lease: { workerId, fencingToken, expiresAt: new Date(now.getTime() + leaseMs).toISOString() } };
    this.jobs.set(record.jobId, claimed); return claimed;
  }
  heartbeat(jobId: string, workerId: string, fencingToken: number, now: Date, leaseMs: number): RunnerJobRecord | null {
    const record = this.jobs.get(jobId);
    if (!record || record.status !== "RUNNING" || record.lease?.workerId !== workerId || record.lease.fencingToken !== fencingToken || Date.parse(record.lease.expiresAt) <= now.getTime()) return null;
    const updated = { ...record, lease: { ...record.lease, expiresAt: new Date(now.getTime() + leaseMs).toISOString() } }; this.jobs.set(jobId, updated); return updated;
  }
  complete(jobId: string, workerId: string, fencingToken: number, now: Date, execution: RunnerExecutionResult, artifacts: ArtifactRef[]): RunnerJobRecord | null {
    const record = this.jobs.get(jobId);
    if (!record || record.status !== "RUNNING" || record.lease?.workerId !== workerId || record.lease.fencingToken !== fencingToken || Date.parse(record.lease.expiresAt) <= now.getTime()) return null;
    const mergedArtifacts = [...record.artifacts];
    for (const artifact of artifacts) if (!mergedArtifacts.some((existing) => existing.namespace === artifact.namespace && existing.artifactId === artifact.artifactId)) mergedArtifacts.push(artifact);
    const updated = { ...record, status: execution.status, completedAt: now.toISOString(), execution, artifacts: mergedArtifacts, lease: null }; this.jobs.set(jobId, updated); return updated;
  }
  cancel(jobId: string, now: Date): RunnerJobRecord | null {
    const record = this.jobs.get(jobId);
    if (!record) return null;
    if (record.status === "CANCELLED") return record;
    if (record.status !== "QUEUED" && record.status !== "RUNNING") return null;
    const cancelled = { ...record, status: "CANCELLED" as const, completedAt: now.toISOString(), execution: null, artifacts: [], lease: null };
    this.jobs.set(jobId, cancelled); return cancelled;
  }
}

export class RunnerJobCoordinator {
  constructor(private readonly store: RunnerJobStore, private readonly clock: RunnerClock = new SystemRunnerClock()) {}

  async submit(job: RunnerJob, now?: Date): Promise<RunnerJobRecord> {
    validateRunnerJob(job);
    const jobId = runnerJobIdentity(job);
    const submitted = { jobId, job, status: "QUEUED" as const, submittedAt: this.validNow(now).toISOString(), startedAt: null, completedAt: null, execution: null, artifacts: [], attempt: 1, retryOf: null, lease: null };
    const stored = await this.store.createIfAbsent(submitted);
    if (canonicalJob(stored.job) !== canonicalJob(job)) throw new RunnerJobIdempotencyConflict();
    return stored;
  }

  async markStarted(jobId: string, now?: Date): Promise<RunnerJobRecord> {
    const record = await this.require(jobId);
    if (record.status !== "QUEUED") throw new Error("runner job is not queued");
    return this.store.save({ ...record, status: "RUNNING", startedAt: this.validNow(now).toISOString() });
  }

  async markCompleted(jobId: string, execution: RunnerExecutionResult, artifacts: ArtifactRef[] = [], now?: Date): Promise<RunnerJobRecord> {
    const record = await this.require(jobId);
    if (record.status !== "RUNNING") throw new Error("runner job is not running");
    return this.store.save({ ...record, status: execution.status, completedAt: this.validNow(now).toISOString(), execution, artifacts });
  }

  async retry(jobId: string, now?: Date): Promise<RunnerJobRecord> {
    const record = await this.require(jobId);
    if (!["COMPLETED", "FAILED", "TIMED_OUT", "OUTPUT_LIMIT", "SPAWN_FAILED"].includes(record.status)) throw new Error("only a terminal runner job can be retried");
    const attempt = record.attempt + 1;
    const retryJobId = `${record.jobId}:retry-${attempt}`;
    const submitted = { jobId: retryJobId, job: record.job, status: "QUEUED" as const, submittedAt: this.validNow(now).toISOString(), startedAt: null, completedAt: null, execution: null, artifacts: [], attempt, retryOf: record.jobId, lease: null };
    const stored = await this.store.createIfAbsent(submitted);
    if (stored.retryOf !== record.jobId || stored.attempt !== attempt || canonicalJob(stored.job) !== canonicalJob(record.job)) {
      throw new RunnerJobIdempotencyConflict();
    }
    return stored;
  }

  async get(jobId: string): Promise<RunnerJobRecord | null> { return this.store.get(jobId); }
  async listForTestRun(testRunId: string, offset = 0, limit = 50): Promise<RunnerJobRecord[]> { return this.store.listForTestRun(testRunId, offset, limit); }
  async listAfterTestRun(testRunId: string, after: RunnerJobCursor | null, limit = 50): Promise<RunnerJobRecord[]> { return this.store.listAfterTestRun(testRunId, after, limit); }
  async claim(workerId: string, now?: Date, leaseMs = 30_000, testRunId?: string): Promise<RunnerJobRecord | null> {
    const at = now ?? this.clock.now();
    if (!workerId.trim() || !Number.isSafeInteger(leaseMs) || leaseMs < 1 || !(at instanceof Date) || !Number.isFinite(at.getTime())) throw new Error("runner claim worker, lease, or time is invalid");
    return this.store.claim(workerId, at, leaseMs, testRunId);
  }
  async heartbeat(jobId: string, workerId: string, fencingToken: number, now?: Date, leaseMs = 30_000): Promise<RunnerJobRecord | null> { return this.store.heartbeat(jobId, workerId, fencingToken, this.validNow(now), leaseMs); }
  async complete(jobId: string, workerId: string, fencingToken: number, execution: RunnerExecutionResult, artifacts: ArtifactRef[] = [], now?: Date): Promise<RunnerJobRecord | null> { return this.store.complete(jobId, workerId, fencingToken, this.validNow(now), execution, artifacts); }
  async cancel(jobId: string, now?: Date): Promise<RunnerJobRecord | null> { return this.store.cancel(jobId, this.validNow(now)); }
  private async require(jobId: string): Promise<RunnerJobRecord> { const record = await this.store.get(jobId); if (!record) throw new Error("runner job not found"); return record; }
  private validNow(now?: Date): Date {
    const value = now ?? this.clock.now();
    if (!(value instanceof Date) || !Number.isFinite(value.getTime())) throw new Error("runner clock returned an invalid time");
    return value;
  }
}

/** Preserve the historical one-job-per-experiment key when no tranche is named;
 * a round-bound submission receives a distinct durable identity for each tranche. */
export function runnerJobIdentity(job: RunnerJob): string {
  return job.roundIndex === undefined
    ? `${job.testRunId}:${job.experimentId}`
    : `${job.testRunId}:${job.experimentId}:round-${job.roundIndex}`;
}

export class RunnerJobIdempotencyConflict extends Error {
  constructor() { super("runner job identity was reused with a different immutable payload"); this.name = "RunnerJobIdempotencyConflict"; }
}

function canonicalJob(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJob).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJob(record[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function newRunnerJobId(job: RunnerJob): string { return `${job.testRunId}:${job.experimentId}:${randomUUID()}`; }

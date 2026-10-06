import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { mkdir, open, rename, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { RunnerExecutionResult } from "./v31-runner-executor.js";
import { collectRunnerOutputArtifacts } from "./v31-runner-output.js";
import { materializeRunnerInputBundle, parseRunnerInputBundle } from "./v31-runner-input-bundle.js";
import type { RunnerClaimResult, RunnerInputResult, V31RunnerHostApiClient } from "./v31-runner-host-api-client.js";
import { RunnerLeaseLostError } from "./v31-runner-host-api-client.js";
import type { RunnerJobRecord } from "./v31-runner-jobs.js";
import { buildRunnerLaunchPlan } from "./v31-runner-launch.js";
import { executeRunnerContainer } from "./v31-runner-container-executor.js";
import { hashResearchCheckpointState } from "../domain/research-checkpoint.js";
import type { V33RunnerCheckpointCommand } from "../contracts/generated-types.js";

type HostApi = Pick<V31RunnerHostApiClient, "claim" | "readInput" | "heartbeat" | "complete" | "publishArtifact">
  & Partial<Pick<V31RunnerHostApiClient, "readCheckpoint" | "persistCheckpoint">>;
type LeaseRecord = Extract<RunnerClaimResult, { claimStatus: "LEASED" }>;

export type RunnerHostLoopConfig = {
  workerId: string;
  managedRoot: string;
  imageRef: string;
  heartbeatIntervalMs: number;
  execute?: (plan: ReturnType<typeof buildRunnerLaunchPlan>, signal: AbortSignal) => Promise<RunnerExecutionResult>;
};

export type RunnerHostLoopResult = { status: "NO_WORK" } | { status: "COMPLETED"; record: RunnerJobRecord };

type CheckpointFile = Omit<V33RunnerCheckpointCommand, "workerId" | "fencingToken">;
const MAX_CHECKPOINT_FILE_BYTES = 256 * 1024;

async function readCheckpointFile(path: string): Promise<CheckpointFile | null> {
  let handle;
  try { handle = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0)); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  try {
    const before = await handle.stat();
    if (!before.isFile() || before.nlink !== 1 || before.size > MAX_CHECKPOINT_FILE_BYTES) throw new Error("checkpoint file must be a regular file no larger than 256 KiB");
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (after.size !== before.size || bytes.byteLength !== before.size || after.mtimeMs !== before.mtimeMs) throw new Error("checkpoint file changed while it was being read");
    let value: unknown;
    try { value = JSON.parse(bytes.toString("utf8")); }
    catch { throw new Error("checkpoint.json must contain complete JSON; write to a temporary file then rename it"); }
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("checkpoint.json must contain an object");
    const record = value as Record<string, unknown>;
    if (Object.keys(record).sort().join(",") !== "roundIndex,schemaVersion,sequence,state,testRunId"
      || record.schemaVersion !== "v3.3-research-checkpoint-v1" || typeof record.testRunId !== "string"
      || !Number.isSafeInteger(record.roundIndex) || !Number.isSafeInteger(record.sequence)
      || !record.state || typeof record.state !== "object" || Array.isArray(record.state)) throw new Error("checkpoint.json does not match the V3.3 checkpoint envelope");
    return record as unknown as CheckpointFile;
  } finally { await handle.close(); }
}

/** Run one claimed task. Lease loss aborts execution and prevents artifact/result callbacks. */
export async function runRunnerHostOnce(api: HostApi, config: RunnerHostLoopConfig, testRunId?: string): Promise<RunnerHostLoopResult> {
  if (!Number.isInteger(config.heartbeatIntervalMs) || config.heartbeatIntervalMs < 1000) throw new Error("runner heartbeat interval must be at least one second");
  const claim = await api.claim(config.workerId, testRunId);
  if (claim.status === "NO_WORK") return { status: "NO_WORK" };
  const job = claim.job;
  const jobId = claim.jobId;
  const lease = claim.lease;
  if (!lease || lease.workerId !== config.workerId) throw new Error("runner claim did not include this worker's lease");

  const controller = new AbortController();
  let lost = false;
  let heartbeatBusy = false;
  let heartbeatError: unknown;
  const heartbeat = async () => {
    if (heartbeatBusy || lost) return;
    heartbeatBusy = true;
    try {
      await api.heartbeat(jobId, lease);
      if (api.persistCheckpoint) {
        const outputRoot = join(config.managedRoot, "outputs", job.testRunId, job.experimentId, `round-${job.roundIndex ?? 1}`, `fence-${lease.fencingToken}`);
        const checkpoint = await readCheckpointFile(join(outputRoot, "checkpoint.json"));
        if (checkpoint) {
          if (checkpoint.testRunId !== job.testRunId || checkpoint.roundIndex !== (job.roundIndex ?? 1)) throw new Error("checkpoint TestRun or round does not match the leased job");
          await api.persistCheckpoint(jobId, lease, checkpoint);
        }
      }
    }
    catch (error) { lost = true; heartbeatError = error; controller.abort(error); }
    finally { heartbeatBusy = false; }
  };
  const timer = setInterval(() => { void heartbeat(); }, config.heartbeatIntervalMs);
  timer.unref?.();

  const ensureLease = () => {
    if (lost || controller.signal.aborted) throw heartbeatError instanceof Error ? heartbeatError : new RunnerLeaseLostError();
  };
  try {
    const input: RunnerInputResult = await api.readInput(jobId, lease);
    ensureLease();
    const bytes = Buffer.from(input.contentBase64, "base64");
    if (bytes.toString("base64") !== input.contentBase64) throw new Error("runner input contentBase64 is invalid");
    const bundle = parseRunnerInputBundle(bytes, job);
    const roundDirectory = `round-${job.roundIndex ?? 1}`;
    const fenced = `fence-${lease.fencingToken}`;
    const inputRoot = join(config.managedRoot, "inputs", job.testRunId, job.experimentId, roundDirectory, fenced);
    const outputRoot = join(config.managedRoot, "outputs", job.testRunId, job.experimentId, roundDirectory, fenced);
    await mkdir(join(config.managedRoot, "inputs", job.testRunId, job.experimentId, roundDirectory), { recursive: true, mode: 0o700 });
    await mkdir(join(config.managedRoot, "outputs", job.testRunId, job.experimentId, roundDirectory), { recursive: true, mode: 0o700 });
    await materializeRunnerInputBundle(bundle, inputRoot);
    if (api.readCheckpoint) {
      const result = await api.readCheckpoint(jobId, lease);
      if (result.status === "FOUND") {
        const checkpoint = result.checkpoint as unknown as CheckpointFile & { experimentId?: string; stateSha256?: string };
        if (!checkpoint || checkpoint.testRunId !== job.testRunId || checkpoint.experimentId !== job.experimentId
          || checkpoint.roundIndex !== (job.roundIndex ?? 1) || !checkpoint.state || hashResearchCheckpointState(checkpoint.state) !== checkpoint.stateSha256) {
          throw new Error("persisted checkpoint identity or SHA-256 does not match the claimed Runner Job");
        }
        await writeFile(join(inputRoot, "checkpoint.json"), JSON.stringify(checkpoint), { flag: "wx", mode: 0o444 });
      }
    }
    await mkdir(outputRoot, { recursive: false, mode: 0o700 });
    ensureLease();

    const plan = buildRunnerLaunchPlan(job, { imageRef: config.imageRef, jobId, managedRoot: config.managedRoot, fencingToken: lease.fencingToken, inputRoot, outputRoot });
    const execute = config.execute ?? ((launchPlan: ReturnType<typeof buildRunnerLaunchPlan>, signal: AbortSignal) => executeRunnerContainer(launchPlan, {
      signal,
      onCheckpoint: async (content) => {
        const checkpointPath = join(outputRoot, "checkpoint.json");
        const temporaryPath = join(outputRoot, `.checkpoint-${randomUUID()}.tmp`);
        const handle = await open(temporaryPath, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0), 0o600);
        try {
          await handle.writeFile(content);
          await handle.sync();
        } finally { await handle.close(); }
        try {
          const checkpoint = await readCheckpointFile(temporaryPath);
          if (!checkpoint || checkpoint.testRunId !== job.testRunId || checkpoint.roundIndex !== (job.roundIndex ?? 1)) throw new Error("Runner checkpoint TestRun or round does not match the leased job");
          await rename(temporaryPath, checkpointPath);
        } catch (error) {
          await rm(temporaryPath, { force: true });
          throw error;
        }
      },
    }));
    const execution = await execute(plan, controller.signal);
    ensureLease();
    const outputs = execution.status === "COMPLETED"
      ? await collectRunnerOutputArtifacts({ jobId, job, fencingToken: lease.fencingToken, outputRoot })
      : [];
    ensureLease();
    for (const output of outputs) {
      await api.publishArtifact(jobId, lease, output.ref, output.content);
      ensureLease();
    }
    const record = await api.complete(jobId, lease, execution, outputs.map(({ ref }) => ref));
    return { status: "COMPLETED", record };
  } catch (error) {
    if (lost || error instanceof RunnerLeaseLostError) throw error;
    throw error;
  } finally {
    clearInterval(timer);
    if (heartbeatBusy) {
      while (heartbeatBusy) await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }
}

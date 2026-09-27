import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { RunnerExecutionResult } from "./v31-runner-executor.js";
import { collectRunnerOutputArtifacts } from "./v31-runner-output.js";
import { materializeRunnerInputBundle, parseRunnerInputBundle } from "./v31-runner-input-bundle.js";
import type { RunnerClaimResult, RunnerInputResult, V31RunnerHostApiClient } from "./v31-runner-host-api-client.js";
import { RunnerLeaseLostError } from "./v31-runner-host-api-client.js";
import type { RunnerJobRecord } from "./v31-runner-jobs.js";
import { buildRunnerLaunchPlan } from "./v31-runner-launch.js";
import { executeRunnerContainer } from "./v31-runner-container-executor.js";

type HostApi = Pick<V31RunnerHostApiClient, "claim" | "readInput" | "heartbeat" | "complete" | "publishArtifact">;
type LeaseRecord = Extract<RunnerClaimResult, { claimStatus: "LEASED" }>;

export type RunnerHostLoopConfig = {
  workerId: string;
  managedRoot: string;
  imageRef: string;
  heartbeatIntervalMs: number;
  execute?: (plan: ReturnType<typeof buildRunnerLaunchPlan>, signal: AbortSignal) => Promise<RunnerExecutionResult>;
};

export type RunnerHostLoopResult = { status: "NO_WORK" } | { status: "COMPLETED"; record: RunnerJobRecord };

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
    try { await api.heartbeat(jobId, lease); }
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
    const fenced = `fence-${lease.fencingToken}`;
    const inputRoot = join(config.managedRoot, "inputs", job.testRunId, job.experimentId, fenced);
    const outputRoot = join(config.managedRoot, "outputs", job.testRunId, job.experimentId, fenced);
    await mkdir(join(config.managedRoot, "inputs", job.testRunId, job.experimentId), { recursive: true, mode: 0o700 });
    await mkdir(join(config.managedRoot, "outputs", job.testRunId, job.experimentId), { recursive: true, mode: 0o700 });
    await materializeRunnerInputBundle(bundle, inputRoot);
    await mkdir(outputRoot, { recursive: false, mode: 0o700 });
    ensureLease();

    const plan = buildRunnerLaunchPlan(job, { imageRef: config.imageRef, jobId, managedRoot: config.managedRoot, fencingToken: lease.fencingToken, inputRoot, outputRoot });
    const execution = await (config.execute ?? ((launchPlan, signal) => executeRunnerContainer(launchPlan, { signal })))(plan, controller.signal);
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

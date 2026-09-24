import type { RunnerExecutionResult } from "./v31-runner-executor.js";
import { executeRunnerPlan } from "./v31-runner-executor.js";
import { buildRunnerLaunchPlan, type RunnerLaunchConfig, type RunnerLaunchPlan } from "./v31-runner-launch.js";
import type { ArtifactRef, RunnerJob } from "./v31-runtime-guards.js";

export type RunnerLifecycleSink = {
  markStarted(jobId: string): Promise<unknown> | unknown;
  markCompleted(jobId: string, execution: RunnerExecutionResult, artifacts: ArtifactRef[]): Promise<unknown> | unknown;
};

export type RunnerHostAdapterDependencies = {
  buildPlan?: (job: RunnerJob, config: RunnerLaunchConfig) => RunnerLaunchPlan;
  executePlan?: (plan: RunnerLaunchPlan) => Promise<RunnerExecutionResult>;
  publishArtifacts?: (job: RunnerJob, execution: RunnerExecutionResult) => Promise<ArtifactRef[]>;
};

const spawnFailure = (error: unknown): RunnerExecutionResult => ({
  status: "SPAWN_FAILED",
  exitCode: null,
  signal: null,
  stdout: "",
  stderr: error instanceof Error ? error.message : String(error),
  durationMs: 0,
});

/**
 * Trusted-host boundary for the isolated Runner.
 *
 * This adapter is intentionally separate from the HTTP service: it receives a
 * validated job, starts the lifecycle callback, executes the already restricted
 * Docker plan, publishes output references, and writes one terminal callback.
 * The caller must provide the host-only lifecycle sink; no Docker socket or
 * inherited credentials are available to the research API container.
 */
export async function runRunnerJob(
  jobId: string,
  job: RunnerJob,
  config: RunnerLaunchConfig,
  sink: RunnerLifecycleSink,
  dependencies: RunnerHostAdapterDependencies = {},
): Promise<RunnerExecutionResult> {
  const buildPlan = dependencies.buildPlan ?? buildRunnerLaunchPlan;
  const executePlan = dependencies.executePlan ?? ((plan: RunnerLaunchPlan) => executeRunnerPlan(plan));
  const plan = buildPlan(job, config);
  await sink.markStarted(jobId);
  let execution: RunnerExecutionResult;
  try {
    execution = await executePlan(plan);
  } catch (error) {
    execution = spawnFailure(error);
  }
  const artifacts = dependencies.publishArtifacts ? await dependencies.publishArtifacts(job, execution) : [];
  await sink.markCompleted(jobId, execution, artifacts);
  return execution;
}

import { validateRunnerJob, type RunnerJob } from "./v31-runtime-guards.js";
import { realpathSync, statSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";

export type RunnerLaunchConfig = {
  imageRef: string;
  managedRoot: string;
  inputRoot: string;
  outputRoot: string;
};

export type RunnerLaunchPlan = {
  command: "docker";
  argv: string[];
  environment: Record<string, string>;
  timeoutSeconds: number;
  execution: "NOT_STARTED";
};

const IMAGE_REF = /^.+@sha256:[a-f0-9]{64}$/;

/**
 * Build the only supported local Docker invocation for a V3.1 Runner.
 * This function is deliberately side-effect free; a trusted host adapter must
 * execute the returned argv. The research API container never receives a
 * Docker socket, and the plan carries no inherited environment.
 */
export function buildRunnerLaunchPlan(job: RunnerJob, config: RunnerLaunchConfig): RunnerLaunchPlan {
  validateRunnerJob(job);
  if (!IMAGE_REF.test(config.imageRef)) throw new Error("runner imageRef must be an immutable image@sha256 digest");
  if (!config.imageRef.endsWith(`@${job.imageDigest}`)) throw new Error("runner imageRef digest does not match the job");
  for (const candidate of [config.managedRoot, config.inputRoot, config.outputRoot]) {
    if (!isAbsolute(candidate) || candidate.includes(",") || candidate.includes("\0") || candidate.split(/[\\/]+/).includes("..")) throw new Error("runner managed and bind paths must be absolute, mount-safe, and cannot traverse parent directories");
  }
  const lexicalRoot = resolve(config.managedRoot);
  if (resolve(config.inputRoot) !== join(lexicalRoot, "inputs", job.testRunId, job.experimentId) || resolve(config.outputRoot) !== join(lexicalRoot, "outputs", job.testRunId, job.experimentId)) throw new Error("runner bind paths must use this job's exact managed directory layout");
  const managedRoot = realpathSync(config.managedRoot);
  if (!statSync(managedRoot).isDirectory()) throw new Error("runner managed root must be a directory");
  const expectedInput = join(managedRoot, "inputs", job.testRunId, job.experimentId);
  const expectedOutput = join(managedRoot, "outputs", job.testRunId, job.experimentId);
  const actualInput = realpathSync(config.inputRoot);
  const actualOutput = realpathSync(config.outputRoot);
  if (actualInput !== expectedInput || actualOutput !== expectedOutput) throw new Error("runner bind paths must resolve to this job's managed input and output directories");
  if (!statSync(actualInput).isDirectory() || !statSync(actualOutput).isDirectory()) throw new Error("runner input and output bind paths must be directories");
  if (job.networkPolicy.mode !== "DENY") throw new Error("local Docker Runner supports DENY network policy only");

  const argv = [
    "run", "--rm", "--platform", "linux/amd64",
    "--network", "none", "--read-only", "--cap-drop", "ALL",
    "--security-opt", "no-new-privileges", "--pids-limit", String(job.resources.pidsLimit),
    "--cpus", String(job.resources.cpuMilli / 1000), "--memory", `${job.resources.memoryMiB}m`,
    "--user", "10001:10001", "--tmpfs", "/tmp:rw,noexec,nosuid,size=64m",
    "--mount", `type=bind,src=${config.inputRoot},dst=/run/input,readonly=true`,
    "--mount", `type=bind,src=${config.outputRoot},dst=/run/output,readonly=false`,
    "--env", "STOCKQUANT_RUNNER_JOB=/run/input/job.json",
    config.imageRef,
  ];
  return {
    command: "docker",
    argv,
    environment: { STOCKQUANT_RUNNER_JOB: "/run/input/job.json" },
    timeoutSeconds: job.resources.timeoutSeconds,
    execution: "NOT_STARTED",
  };
}

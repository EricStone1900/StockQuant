import { validateRunnerJob, type RunnerJob } from "./v31-runtime-guards.js";

export type RunnerLaunchConfig = {
  imageRef: string;
  inputRoot: string;
  outputRoot: string;
};

export type RunnerLaunchPlan = {
  command: "docker";
  argv: string[];
  environment: Record<string, string>;
  execution: "NOT_STARTED";
};

const IMAGE_REF = /^.+@sha256:[a-f0-9]{64}$/;
const ABSOLUTE_SAFE_PATH = /^\/[\w./-]+$/;

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
  if (!ABSOLUTE_SAFE_PATH.test(config.inputRoot) || !ABSOLUTE_SAFE_PATH.test(config.outputRoot)) {
    throw new Error("runner bind paths must be absolute, simple paths");
  }
  if (job.networkPolicy.mode !== "DENY") throw new Error("local Docker Runner supports DENY network policy only");

  const argv = [
    "run", "--rm", "--platform", "linux/amd64",
    "--network", "none", "--read-only", "--cap-drop", "ALL",
    "--security-opt", "no-new-privileges", "--pids-limit", String(job.resources.pidsLimit),
    "--cpus", String(job.resources.cpuMilli / 1000), "--memory", `${job.resources.memoryMiB}m`,
    "--user", "10001:10001", "--tmpfs", "/tmp:rw,noexec,nosuid,size=64m",
    "--mount", `type=bind,src=${config.inputRoot},dst=/run/input,readonly`,
    "--mount", `type=bind,src=${config.outputRoot},dst=/run/output,rw`,
    "--env", "STOCKQUANT_RUNNER_JOB=/run/input/job.json",
    config.imageRef,
  ];
  return {
    command: "docker",
    argv,
    environment: { STOCKQUANT_RUNNER_JOB: "/run/input/job.json" },
    execution: "NOT_STARTED",
  };
}

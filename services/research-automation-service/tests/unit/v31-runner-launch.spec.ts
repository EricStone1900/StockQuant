import { describe, expect, it } from "vitest";
import { buildRunnerLaunchPlan } from "../../src/application/v31-runner-launch.js";

const digest = `sha256:${"a".repeat(64)}`;
const job = {
  schemaVersion: "v3.1-runner-job-v1" as const,
  testRunId: "run-1",
  experimentId: "exp-1",
  imageDigest: digest,
  inputArtifact: `research/run-1/exp-1/inputs/${"b".repeat(64)}`,
  outputNamespace: "research/run-1/exp-1/outputs",
  resources: { cpuMilli: 500, memoryMiB: 1024, timeoutSeconds: 120, pidsLimit: 64 },
  networkPolicy: { mode: "DENY" as const, allowlist: [] },
};

describe("V3.1 Runner launch plan", () => {
  it("builds a fixed amd64, no-network, no-secret Docker command", () => {
    const plan = buildRunnerLaunchPlan(job, {
      imageRef: `stockquant-v31-runner@${digest}`,
      inputRoot: "/var/lib/stockquant/runner-input",
      outputRoot: "/var/lib/stockquant/runner-output",
    });
    expect(plan.command).toBe("docker");
    expect(plan.argv).toEqual(expect.arrayContaining([
      "--platform", "linux/amd64", "--network", "none", "--read-only",
      "--cap-drop", "ALL", "--security-opt", "no-new-privileges",
      "--pids-limit", "64", "--cpus", "0.5", "--memory", "1024m",
      "--user", "10001:10001",
    ]));
    expect(plan.argv.join(" ")).not.toMatch(/API_KEY|DOCKER_HOST|socket/i);
    expect(plan.environment).toEqual({ STOCKQUANT_RUNNER_JOB: "/run/input/job.json" });
    expect(plan.execution).toBe("NOT_STARTED");
  });

  it("rejects mutable or mismatched images, allowlists and unsafe paths", () => {
    expect(() => buildRunnerLaunchPlan(job, { imageRef: "stockquant-v31-runner:latest", inputRoot: "/a", outputRoot: "/b" })).toThrow("immutable");
    expect(() => buildRunnerLaunchPlan(job, { imageRef: `stockquant-v31-runner@sha256:${"c".repeat(64)}`, inputRoot: "/a", outputRoot: "/b" })).toThrow("does not match");
    expect(() => buildRunnerLaunchPlan({ ...job, networkPolicy: { mode: "ALLOWLIST", allowlist: ["api.example"] } }, { imageRef: `stockquant-v31-runner@${digest}`, inputRoot: "/a", outputRoot: "/b" })).toThrow("DENY");
    expect(() => buildRunnerLaunchPlan(job, { imageRef: `stockquant-v31-runner@${digest}`, inputRoot: "relative", outputRoot: "/b" })).toThrow("absolute");
  });
});

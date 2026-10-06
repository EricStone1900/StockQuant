import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { buildRunnerLaunchPlan } from "../../src/application/v31-runner-launch.js";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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
    const root = mkdtempSync(join(tmpdir(), "stockquant-runner-"));
    const managedRoot = join(root, "managed");
    const inputRoot = join(managedRoot, "inputs", "run-1", "exp-1", "round-1", "fence-5");
    const outputRoot = join(managedRoot, "outputs", "run-1", "exp-1", "round-1", "fence-5");
    mkdirSync(inputRoot, { recursive: true });
    mkdirSync(outputRoot, { recursive: true });
    let plan;
    try {
      plan = buildRunnerLaunchPlan(job, {
        imageRef: `stockquant-v31-runner@${digest}`,
        jobId: "run-1:exp-1",
        managedRoot,
        fencingToken: 5,
        inputRoot,
        outputRoot,
      });
    } finally { rmSync(root, { recursive: true, force: true }); }
    expect(plan.command).toBe("docker");
    expect(plan.argv).toEqual(expect.arrayContaining([
      "--platform", "linux/amd64", "--network", "none", "--pull", "never", "--read-only",
      "--cap-drop", "ALL", "--security-opt", "no-new-privileges",
      "--pids-limit", "64", "--cpus", "0.5", "--memory", "1024m",
      "--user", "10001:10001", "--detach", "--name", plan.containerName, "--tmpfs", "/run/output:rw,noexec,nosuid,size=32m",
    ]));
    expect(plan.argv.join(" ")).not.toMatch(/API_KEY|DOCKER_HOST|socket/i);
    expect(plan.environment).toEqual({ STOCKQUANT_RUNNER_JOB: "/run/input/job.json" });
    expect(plan.argv.join(" ")).not.toContain("--rm");
    expect(plan.argv.join(" ")).not.toContain(`${outputRoot},dst=/run/output`);
    expect(plan.argv).toContain("/bin/sh");
    expect(plan.argv.join(" ")).toContain("sleep 120");
    expect(plan.timeoutSeconds).toBe(150);
    expect(plan.execution).toBe("NOT_STARTED");
  });

  it("rejects host paths, traversal, symlinks, mismatched job directories, and unsafe policy", () => {
    const root = mkdtempSync(join(tmpdir(), "stockquant-runner-reject-"));
    const managedRoot = join(root, "managed");
    const inputRoot = join(managedRoot, "inputs", "run-1", "exp-1", "round-1", "fence-5");
    const outputRoot = join(managedRoot, "outputs", "run-1", "exp-1", "round-1", "fence-5");
    mkdirSync(inputRoot, { recursive: true });
    mkdirSync(outputRoot, { recursive: true });
    const config = { imageRef: `stockquant-v31-runner@${digest}`, jobId: "run-1:exp-1", managedRoot, fencingToken: 5, inputRoot, outputRoot };
    try {
    expect(() => buildRunnerLaunchPlan(job, { ...config, imageRef: "stockquant-v31-runner:latest" })).toThrow("immutable");
    expect(() => buildRunnerLaunchPlan(job, { ...config, imageRef: `stockquant-v31-runner@sha256:${"c".repeat(64)}` })).toThrow("does not match");
    expect(buildRunnerLaunchPlan(job, { ...config, imageRef: digest }).argv).toContain(digest);
    expect(() => buildRunnerLaunchPlan({ ...job, networkPolicy: { mode: "ALLOWLIST", allowlist: ["api.example.com"] } }, config)).toThrow("DENY");
    expect(() => buildRunnerLaunchPlan(job, { ...config, inputRoot: "/etc" })).toThrow("exact round-scoped fenced managed directory layout");
    expect(() => buildRunnerLaunchPlan(job, { ...config, outputRoot: `${managedRoot}/outputs/run-1/../exp-1` })).toThrow("cannot traverse");
    const linkRoot = join(root, "link");
    symlinkSync(inputRoot, linkRoot);
    expect(() => buildRunnerLaunchPlan(job, { ...config, inputRoot: linkRoot })).toThrow("exact round-scoped fenced managed directory layout");
    expect(() => buildRunnerLaunchPlan({ ...job, testRunId: "run-2" }, config)).toThrow("namespace does not match");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("binds each lease fencing token to a separate immutable workspace", () => {
    const root = mkdtempSync(join(tmpdir(), "stockquant-runner-fence-"));
    const managedRoot = join(root, "managed");
    const inputRoot = join(managedRoot, "inputs", "run-1", "exp-1", "round-1", "fence-5");
    const outputRoot = join(managedRoot, "outputs", "run-1", "exp-1", "round-1", "fence-5");
    mkdirSync(inputRoot, { recursive: true });
    mkdirSync(outputRoot, { recursive: true });
    try {
      const base = { imageRef: `stockquant-v31-runner@${digest}`, jobId: "run-1:exp-1", managedRoot, inputRoot, outputRoot };
      expect(() => buildRunnerLaunchPlan(job, { ...base, fencingToken: 0 })).toThrow("positive safe integer");
      expect(() => buildRunnerLaunchPlan(job, { ...base, fencingToken: 6 })).toThrow("exact round-scoped fenced managed directory layout");
      const plan = buildRunnerLaunchPlan(job, { ...base, fencingToken: 5 });
      expect(plan.previousContainerName).toBe(`sqrunner-${createHash("sha256").update("run-1:exp-1\0" + "4").digest("hex").slice(0, 32)}`);
      expect(plan.containerName).not.toBe(buildRunnerLaunchPlan(job, { ...base, jobId: "run-1:exp-1:retry-2", fencingToken: 5 }).containerName);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("keeps round workspaces separate inside the same TestRun and Experiment", () => {
    const root = mkdtempSync(join(tmpdir(), "stockquant-runner-rounds-"));
    const managedRoot = join(root, "managed");
    const makePlan = (roundIndex: number) => {
      const inputRoot = join(managedRoot, "inputs", "run-1", "exp-1", `round-${roundIndex}`, "fence-1");
      const outputRoot = join(managedRoot, "outputs", "run-1", "exp-1", `round-${roundIndex}`, "fence-1");
      mkdirSync(inputRoot, { recursive: true });
      mkdirSync(outputRoot, { recursive: true });
      return buildRunnerLaunchPlan({ ...job, roundIndex }, { imageRef: `stockquant-v31-runner@${digest}`, jobId: `run-1:exp-1:round-${roundIndex}`, managedRoot, fencingToken: 1, inputRoot, outputRoot });
    };
    try {
      const roundOne = makePlan(1);
      const roundTwo = makePlan(2);
      expect(roundOne.outputRoot).not.toBe(roundTwo.outputRoot);
      expect(roundOne.containerName).not.toBe(roundTwo.containerName);
      expect(roundOne.outputRoot).toContain("/round-1/fence-1");
      expect(roundTwo.outputRoot).toContain("/round-2/fence-1");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});

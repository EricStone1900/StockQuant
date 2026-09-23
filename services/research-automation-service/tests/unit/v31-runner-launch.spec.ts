import { describe, expect, it } from "vitest";
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
    const inputRoot = join(managedRoot, "inputs", "run-1", "exp-1");
    const outputRoot = join(managedRoot, "outputs", "run-1", "exp-1");
    mkdirSync(inputRoot, { recursive: true });
    mkdirSync(outputRoot, { recursive: true });
    let plan;
    try {
      plan = buildRunnerLaunchPlan(job, {
        imageRef: `stockquant-v31-runner@${digest}`,
        managedRoot,
        inputRoot,
        outputRoot,
      });
    } finally { rmSync(root, { recursive: true, force: true }); }
    expect(plan.command).toBe("docker");
    expect(plan.argv).toEqual(expect.arrayContaining([
      "--platform", "linux/amd64", "--network", "none", "--read-only",
      "--cap-drop", "ALL", "--security-opt", "no-new-privileges",
      "--pids-limit", "64", "--cpus", "0.5", "--memory", "1024m",
      "--user", "10001:10001",
    ]));
    expect(plan.argv.join(" ")).not.toMatch(/API_KEY|DOCKER_HOST|socket/i);
    expect(plan.environment).toEqual({ STOCKQUANT_RUNNER_JOB: "/run/input/job.json" });
    expect(plan.timeoutSeconds).toBe(120);
    expect(plan.execution).toBe("NOT_STARTED");
  });

  it("rejects host paths, traversal, symlinks, mismatched job directories, and unsafe policy", () => {
    const root = mkdtempSync(join(tmpdir(), "stockquant-runner-reject-"));
    const managedRoot = join(root, "managed");
    const inputRoot = join(managedRoot, "inputs", "run-1", "exp-1");
    const outputRoot = join(managedRoot, "outputs", "run-1", "exp-1");
    mkdirSync(inputRoot, { recursive: true });
    mkdirSync(outputRoot, { recursive: true });
    const config = { imageRef: `stockquant-v31-runner@${digest}`, managedRoot, inputRoot, outputRoot };
    try {
    expect(() => buildRunnerLaunchPlan(job, { ...config, imageRef: "stockquant-v31-runner:latest" })).toThrow("immutable");
    expect(() => buildRunnerLaunchPlan(job, { ...config, imageRef: `stockquant-v31-runner@sha256:${"c".repeat(64)}` })).toThrow("does not match");
    expect(() => buildRunnerLaunchPlan({ ...job, networkPolicy: { mode: "ALLOWLIST", allowlist: ["api.example.com"] } }, config)).toThrow("DENY");
    expect(() => buildRunnerLaunchPlan(job, { ...config, inputRoot: "/etc" })).toThrow("exact managed directory layout");
    expect(() => buildRunnerLaunchPlan(job, { ...config, outputRoot: `${managedRoot}/outputs/run-1/../exp-1` })).toThrow("cannot traverse");
    const linkRoot = join(root, "link");
    symlinkSync(inputRoot, linkRoot);
    expect(() => buildRunnerLaunchPlan(job, { ...config, inputRoot: linkRoot })).toThrow("exact managed directory layout");
    expect(() => buildRunnerLaunchPlan({ ...job, testRunId: "run-2" }, config)).toThrow("namespace does not match");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});

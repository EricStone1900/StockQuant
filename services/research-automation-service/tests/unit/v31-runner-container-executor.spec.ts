import { describe, expect, it, vi } from "vitest";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { executeRunnerContainer } from "../../src/application/v31-runner-container-executor.js";
import type { RunnerLaunchPlan } from "../../src/application/v31-runner-launch.js";

const marker = "__STOCKQUANT_RUNNER_RESULT__:";
const plan: RunnerLaunchPlan = { command: "docker", argv: ["run", "--detach", "--name", "sqrunner-test"], environment: {}, timeoutSeconds: 30, execution: "NOT_STARTED", containerName: "sqrunner-test", previousContainerName: null, outputRoot: "/tmp/isolated-output", completionMarker: marker };
const finished = { status: "COMPLETED" as const, exitCode: null, signal: "SIGKILL" as const, stdout: `{"status":"COMPLETED","exit_code":0}\n${marker}0\n`, stderr: "", durationMs: 5 };

describe("V3.1 Runner container supervisor", () => {
  it("copies bounded tmpfs output while the container is held open, then removes the named container", async () => {
    const root = mkdtempSync(join(tmpdir(), "stockquant-runner-extract-"));
    const outputRoot = join(root, "output"); mkdirSync(outputRoot);
    const calls: string[][] = [];
    const dockerCommand = vi.fn(async (args: string[]) => { calls.push(args); return { exitCode: 0, stderr: "", stdout: args[0] === "exec" ? JSON.stringify({ files: [{ path: "nested/metrics.json", contentBase64: Buffer.from("metrics-output").toString("base64") }] }) : "" }; });
    try {
      const result = await executeRunnerContainer({ ...plan, outputRoot }, { executePlan: async (_plan, options) => options.completionMarker ? finished : { ...finished, exitCode: 0, stdout: "container-id\n" }, dockerCommand });
      expect(result).toMatchObject({ status: "COMPLETED", exitCode: 0, stdout: "" });
      expect(calls.map((args) => args[0])).toEqual(["exec", "rm"]);
      expect(calls[0].slice(0, 4)).toEqual(["exec", "sqrunner-test", "python", "-c"]);
      expect(readFileSync(join(outputRoot, "nested/metrics.json"), "utf8")).toBe("metrics-output");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("streams the bounded checkpoint through the host callback while the container is running", async () => {
    const root = mkdtempSync(join(tmpdir(), "stockquant-runner-checkpoint-transfer-"));
    const outputRoot = join(root, "output"); mkdirSync(outputRoot);
    const checkpoint = Buffer.from(JSON.stringify({ schemaVersion: "v3.3-research-checkpoint-v1", testRunId: "22222222-2222-4222-8222-222222222222", roundIndex: 1, sequence: 1, state: { cursor: 4 } }));
    const readCheckpoint = vi.fn(async () => checkpoint);
    const onCheckpoint = vi.fn(async () => undefined);
    const dockerCommand = vi.fn(async (args: string[]) => ({ exitCode: 0, stderr: "", stdout: args[0] === "exec" ? JSON.stringify({ files: [] }) : "" }));
    const executePlan = async (_plan: RunnerLaunchPlan, options: { completionMarker?: string }) => {
      if (!options.completionMarker) return { ...finished, exitCode: 0, stdout: "container-id\n" };
      await new Promise((resolve) => setTimeout(resolve, 15));
      return finished;
    };
    try {
      await executeRunnerContainer({ ...plan, outputRoot }, { executePlan, dockerCommand, readCheckpoint, onCheckpoint, checkpointPollIntervalMs: 1 });
      expect(readCheckpoint).toHaveBeenCalledWith("sqrunner-test", undefined);
      expect(onCheckpoint).toHaveBeenCalledOnce();
      expect(onCheckpoint).toHaveBeenCalledWith(checkpoint);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("rejects traversal in the container output transfer", async () => {
    const root = mkdtempSync(join(tmpdir(), "stockquant-runner-traversal-"));
    const outputRoot = join(root, "output"); mkdirSync(outputRoot);
    const dockerCommand = vi.fn(async (args: string[]) => ({ exitCode: 0, stderr: "", stdout: args[0] === "exec" ? JSON.stringify({ files: [{ path: "../escape", contentBase64: "eA==" }] }) : "" }));
    try {
      const result = await executeRunnerContainer({ ...plan, outputRoot }, { executePlan: async (_plan, options) => options.completionMarker ? finished : { ...finished, exitCode: 0, stdout: "container-id\n" }, dockerCommand });
      expect(result.status).toBe("FAILED");
      expect(existsSync(join(root, "escape"))).toBe(false);
      expect(dockerCommand).toHaveBeenLastCalledWith(["rm", "--force", "sqrunner-test"]);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("removes containers for failed or timed-out executions without copying output", async () => {
    const calls: string[][] = [];
    const dockerCommand = vi.fn(async (args: string[]) => { calls.push(args); return { exitCode: 0, stderr: "", stdout: "" }; });
    const failed = { ...finished, stdout: `{"status":"REJECTED","reason":"runner timeout"}\n${marker}2\n` };
    await expect(executeRunnerContainer(plan, { executePlan: async (_plan, options) => options.completionMarker ? failed : { ...finished, exitCode: 0, stdout: "container-id\n" }, dockerCommand })).resolves.toMatchObject({ status: "TIMED_OUT", exitCode: 2 });
    expect(calls).toEqual([["rm", "--force", "sqrunner-test"]]);
  });

  it("cleans the previous fence before start and refuses launch if that cleanup fails", async () => {
    const current = { ...plan, previousContainerName: "sqrunner-prior-fence" };
    const commands: string[][] = [];
    const dockerCommand = vi.fn(async (args: string[]) => {
      commands.push(args);
      return { exitCode: 0, stderr: "", stdout: args[0] === "exec" ? JSON.stringify({ files: [] }) : "" };
    });
    const executePlan = vi.fn(async (_plan: RunnerLaunchPlan, options: { completionMarker?: string }) => options.completionMarker ? finished : { ...finished, exitCode: 0, stdout: "container-id\n" });
    await executeRunnerContainer(current, { executePlan, dockerCommand });
    expect(commands[0]).toEqual(["rm", "--force", "sqrunner-prior-fence"]);
    expect(executePlan).toHaveBeenCalledTimes(2);

    const fail = vi.fn(async () => ({ exitCode: 1, stderr: "daemon unavailable", stdout: "" }));
    const shouldNotStart = vi.fn();
    await expect(executeRunnerContainer(current, { executePlan: shouldNotStart as never, dockerCommand: fail })).rejects.toThrow("refusing new execution");
    expect(shouldNotStart).not.toHaveBeenCalled();
  });

  it("refuses completion if force-removal fails and propagates lease-loss abort", async () => {
    const cleanupFailure = vi.fn(async () => ({ exitCode: 1, stderr: "daemon unavailable", stdout: "" }));
    await expect(executeRunnerContainer(plan, { executePlan: async (_plan, options) => options.completionMarker ? { ...finished, stdout: "" } : { ...finished, exitCode: 0, stdout: "container-id\n" }, dockerCommand: cleanupFailure })).rejects.toThrow("refusing job completion");
    const controller = new AbortController(); controller.abort(new Error("lease lost"));
    const cleanup = vi.fn(async () => ({ exitCode: 0, stderr: "", stdout: "" }));
    await expect(executeRunnerContainer(plan, { signal: controller.signal, executePlan: async () => ({ ...finished, status: "FAILED" }), dockerCommand: cleanup })).rejects.toThrow("lease lost");
    expect(cleanup).toHaveBeenCalledWith(["rm", "--force", "sqrunner-test"]);
  });
});

import { describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import { executeRunnerPlan, parseRunnerExecution } from "../../src/application/v31-runner-executor.js";

const plan = (argv: string[], timeoutSeconds = 1) => ({ command: "docker" as const, argv, environment: {}, timeoutSeconds, execution: "NOT_STARTED" as const });
const shellSpawn = ((_: string, args: readonly string[], options: Parameters<typeof spawn>[2]) => spawn("/bin/sh", args, options)) as unknown as typeof spawn;

describe("V3.1 runner executor", () => {
  it("completes and captures bounded output", async () => {
    const result = await executeRunnerPlan(plan(["-c", "printf runner-ok"]), { spawnProcess: shellSpawn });
    expect(result).toMatchObject({ status: "COMPLETED", exitCode: 0, stdout: "runner-ok" });
  });

  it("terminates a child that exceeds the hard timeout", async () => {
    const result = await executeRunnerPlan(plan(["-c", "sleep 5"], 1), { spawnProcess: shellSpawn });
    expect(result.status).toBe("TIMED_OUT");
  });

  it("terminates a child that exceeds the output quota", async () => {
    const result = await executeRunnerPlan(plan(["-c", "printf 1234567890"], 1), { spawnProcess: shellSpawn, maxOutputBytes: 5 });
    expect(result.status).toBe("OUTPUT_LIMIT");
    expect(result.stdout).toBe("");
  });

  it("accepts bounded terminal callbacks and rejects oversized or malformed results", () => {
    expect(parseRunnerExecution({ status: "TIMED_OUT", exitCode: null, signal: "SIGKILL", stdout: "", stderr: "timeout", durationMs: 1000 })).toMatchObject({ status: "TIMED_OUT", signal: "SIGKILL" });
    expect(() => parseRunnerExecution({ status: "RUNNING", exitCode: null, signal: null, stdout: "", stderr: "", durationMs: 1 })).toThrow("status");
    expect(() => parseRunnerExecution({ status: "FAILED", exitCode: 1, signal: null, stdout: "x".repeat(8 * 1024 * 1024), stderr: "x", durationMs: 1 })).toThrow("8 MiB");
    expect(() => parseRunnerExecution({ status: "FAILED", exitCode: 999, signal: null, stdout: "", stderr: "", durationMs: 1 })).toThrow("exitCode");
  });
});

import { spawn, type ChildProcess } from "node:child_process";
import type { RunnerLaunchPlan } from "./v31-runner-launch.js";

export type RunnerExecutionResult = {
  status: "COMPLETED" | "FAILED" | "TIMED_OUT" | "OUTPUT_LIMIT" | "SPAWN_FAILED";
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  durationMs: number;
};

export type RunnerExecutionOptions = {
  maxOutputBytes?: number;
  spawnProcess?: typeof spawn;
};

const EXECUTION_STATUSES = ["COMPLETED", "FAILED", "TIMED_OUT", "OUTPUT_LIMIT", "SPAWN_FAILED"] as const;
const SIGNALS = new Set<NodeJS.Signals>(["SIGABRT", "SIGALRM", "SIGBUS", "SIGCHLD", "SIGCONT", "SIGFPE", "SIGHUP", "SIGILL", "SIGINT", "SIGIO", "SIGIOT", "SIGKILL", "SIGPIPE", "SIGPOLL", "SIGPROF", "SIGPWR", "SIGQUIT", "SIGSEGV", "SIGSTKFLT", "SIGSTOP", "SIGSYS", "SIGTERM", "SIGTRAP", "SIGTSTP", "SIGTTIN", "SIGTTOU", "SIGURG", "SIGUSR1", "SIGUSR2", "SIGVTALRM", "SIGWINCH", "SIGXCPU", "SIGXFSZ"]);
const MAX_RECORDED_OUTPUT_BYTES = 8 * 1024 * 1024;

/** Validate an untrusted lifecycle callback before it is persisted with a Runner Job. */
export function parseRunnerExecution(input: unknown): RunnerExecutionResult {
  if (!input || typeof input !== "object") throw new Error("runner execution must be an object");
  const body = input as Record<string, unknown>;
  if (!EXECUTION_STATUSES.includes(body.status as typeof EXECUTION_STATUSES[number])) throw new Error("runner execution status is invalid");
  if (body.exitCode !== null && (!Number.isInteger(body.exitCode) || Number(body.exitCode) < -255 || Number(body.exitCode) > 255)) throw new Error("runner execution exitCode is invalid");
  if (body.signal !== null && (typeof body.signal !== "string" || !SIGNALS.has(body.signal as NodeJS.Signals))) throw new Error("runner execution signal is invalid");
  if (typeof body.stdout !== "string" || typeof body.stderr !== "string") throw new Error("runner execution stdout/stderr are required strings");
  if (Buffer.byteLength(body.stdout) + Buffer.byteLength(body.stderr) > MAX_RECORDED_OUTPUT_BYTES) throw new Error("runner execution output exceeds 8 MiB");
  if (!Number.isInteger(body.durationMs) || Number(body.durationMs) < 0 || Number(body.durationMs) > 86_400_000) throw new Error("runner execution durationMs is invalid");
  return { status: body.status as RunnerExecutionResult["status"], exitCode: body.exitCode as number | null, signal: body.signal as NodeJS.Signals | null, stdout: body.stdout, stderr: body.stderr, durationMs: Number(body.durationMs) };
}

function terminate(child: ChildProcess): void {
  if (child.pid) {
    try { process.kill(-child.pid, "SIGKILL"); return; } catch { /* process groups are unavailable on some hosts */ }
  }
  try { child.kill("SIGKILL"); } catch { /* the child may already have exited */ }
}

/** Execute a validated launch plan with a hard wall-clock and output bound. */
export function executeRunnerPlan(plan: RunnerLaunchPlan, options: RunnerExecutionOptions = {}): Promise<RunnerExecutionResult> {
  const maxOutputBytes = options.maxOutputBytes ?? 8 * 1024 * 1024;
  if (!Number.isInteger(maxOutputBytes) || maxOutputBytes < 1) throw new Error("maxOutputBytes must be a positive integer");
  const spawnProcess = options.spawnProcess ?? spawn;
  const startedAt = Date.now();
  return new Promise((resolve) => {
    let child: ChildProcess;
    try {
      child = spawnProcess(plan.command, plan.argv, { env: { ...plan.environment }, detached: true, stdio: ["ignore", "pipe", "pipe"] });
    } catch (error) {
      resolve({ status: "SPAWN_FAILED", exitCode: null, signal: null, stdout: "", stderr: String(error), durationMs: Date.now() - startedAt });
      return;
    }
    let stdout = "";
    let stderr = "";
    let outputBytes = 0;
    let timedOut = false;
    let outputLimit = false;
    let settled = false;
    const finish = (result: RunnerExecutionResult) => { if (!settled) { settled = true; resolve(result); } };
    const append = (target: "stdout" | "stderr", chunk: Buffer | string) => {
      const value = chunk.toString();
      outputBytes += Buffer.byteLength(value);
      if (outputBytes > maxOutputBytes) {
        outputLimit = true;
        terminate(child);
        return;
      }
      if (target === "stdout") stdout += value; else stderr += value;
    };
    child.stdout?.on("data", (chunk) => append("stdout", chunk));
    child.stderr?.on("data", (chunk) => append("stderr", chunk));
    const timer = setTimeout(() => { timedOut = true; terminate(child); }, plan.timeoutSeconds * 1000);
    child.once("error", (error) => {
      clearTimeout(timer);
      finish({ status: "SPAWN_FAILED", exitCode: null, signal: null, stdout, stderr: `${stderr}${String(error)}`, durationMs: Date.now() - startedAt });
    });
    child.once("close", (exitCode, signal) => {
      clearTimeout(timer);
      const status = outputLimit ? "OUTPUT_LIMIT" : timedOut ? "TIMED_OUT" : exitCode === 0 ? "COMPLETED" : "FAILED";
      finish({ status, exitCode, signal, stdout, stderr, durationMs: Date.now() - startedAt });
    });
  });
}

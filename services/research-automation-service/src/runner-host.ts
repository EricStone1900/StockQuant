import { mkdirSync, statSync } from "node:fs";
import { isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";
import { V31RunnerHostApiClient } from "./application/v31-runner-host-api-client.js";
import { runRunnerHostOnce } from "./application/v31-runner-host-loop.js";

const IMAGE_REF_PATTERN = /^(?:.+@)?sha256:[a-f0-9]{64}$/u;
const TEST_RUN_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

function abortableSleep(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    let timer: NodeJS.Timeout;
    const finish = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", finish);
      resolve();
    };
    if (signal?.aborted) { resolve(); return; }
    timer = setTimeout(finish, milliseconds);
    signal?.addEventListener("abort", finish, { once: true });
  });
}

export type RunnerHostSettings = {
  mode: "NOT_CONFIGURED" | "ISOLATED";
  apiUrl: string;
  token: string;
  workerId: string;
  testRunId: string;
  imageRef: string;
  managedRoot: string;
};

export function loadRunnerHostSettings(env: NodeJS.ProcessEnv): RunnerHostSettings {
  const mode = env.STOCKQUANT_RUNNER_HOST_MODE ?? "NOT_CONFIGURED";
  if (mode !== "NOT_CONFIGURED" && mode !== "ISOLATED") throw new Error("STOCKQUANT_RUNNER_HOST_MODE must be NOT_CONFIGURED or ISOLATED");
  const apiUrl = env.STOCKQUANT_RUNNER_HOST_API_URL ?? "http://127.0.0.1:3008";
  const token = env.STOCKQUANT_SERVICE_TOKEN_RUNNER_HOST ?? "";
  const workerId = env.STOCKQUANT_RUNNER_HOST_WORKER_ID ?? "";
  const testRunId = env.STOCKQUANT_RUNNER_HOST_TEST_RUN_ID ?? "";
  const imageRef = env.STOCKQUANT_RUNNER_IMAGE_REF ?? "";
  const managedRoot = env.STOCKQUANT_RUNNER_MANAGED_ROOT ?? "";
  if (mode === "ISOLATED") {
    if (!/^https?:\/\//u.test(apiUrl)) throw new Error("Runner Host API URL must be HTTP(S)");
    if (!/^[A-Za-z0-9_-]{32,}$/u.test(token)) throw new Error("Runner Host bearer credential is not configured");
    if (!/^[A-Za-z0-9._-]{1,128}$/u.test(workerId)) throw new Error("Runner Host worker ID is invalid");
    if (!TEST_RUN_ID_PATTERN.test(testRunId)) throw new Error("Runner Host requires an explicit valid TestRun scope");
    if (!IMAGE_REF_PATTERN.test(imageRef)) throw new Error("Runner Host image ref must be an immutable digest");
    if (!isAbsolute(managedRoot) || managedRoot.split(/[\\/]+/u).includes("..")) throw new Error("Runner Host managed root must be an absolute traversal-free path");
  }
  return { mode, apiUrl, token, workerId, testRunId, imageRef, managedRoot };
}

export async function runRunnerHostService(input: {
  env?: NodeJS.ProcessEnv;
  signal?: AbortSignal;
  onEvent?: (event: string) => void;
  sleep?: (milliseconds: number, signal?: AbortSignal) => Promise<void>;
} = {}): Promise<void> {
  const settings = loadRunnerHostSettings(input.env ?? process.env);
  if (settings.mode === "NOT_CONFIGURED") {
    input.onEvent?.("Runner Host remains NOT_CONFIGURED; no job was claimed.");
    return;
  }
  mkdirSync(settings.managedRoot, { recursive: true, mode: 0o700 });
  if (!statSync(settings.managedRoot).isDirectory()) throw new Error("Runner Host managed root is not a directory");
  const api = new V31RunnerHostApiClient(settings.apiUrl, settings.token);
  const sleep = input.sleep ?? abortableSleep;

  while (!input.signal?.aborted) {
    try {
      const result = await runRunnerHostOnce(api, {
        workerId: settings.workerId,
        managedRoot: settings.managedRoot,
        imageRef: settings.imageRef,
        heartbeatIntervalMs: 10_000,
      }, settings.testRunId);
      if (result.status === "NO_WORK") await sleep(1000, input.signal);
      else input.onEvent?.(`Runner Job ${result.record.jobId} finished with ${result.record.status}.`);
    } catch (error) {
      if (input.signal?.aborted) break;
      const message = error instanceof Error ? error.message : "unknown host error";
      input.onEvent?.(`Runner Host attempt failed: ${message}`);
      await sleep(5000, input.signal);
    }
  }
}

async function main(): Promise<void> {
  const controller = new AbortController();
  const stop = () => controller.abort(new Error("Runner Host is shutting down"));
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
  try { await runRunnerHostService({ signal: controller.signal, onEvent: (event) => process.stdout.write(`${event}\n`) }); }
  finally { process.removeListener("SIGINT", stop); process.removeListener("SIGTERM", stop); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Runner Host failed to start";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}

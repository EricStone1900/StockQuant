import { describe, expect, it, vi } from "vitest";
import { loadRunnerHostSettings, runRunnerHostService } from "../../src/runner-host.js";

const validIsolatedEnv: NodeJS.ProcessEnv = {
  STOCKQUANT_RUNNER_HOST_MODE: "ISOLATED",
  STOCKQUANT_RUNNER_HOST_API_URL: "http://127.0.0.1:3008",
  STOCKQUANT_SERVICE_TOKEN_RUNNER_HOST: "r".repeat(43),
  STOCKQUANT_RUNNER_HOST_WORKER_ID: "local-runner-1",
  STOCKQUANT_RUNNER_HOST_TEST_RUN_ID: "test-run-1",
  STOCKQUANT_RUNNER_IMAGE_REF: `runner@sha256:${"a".repeat(64)}`,
  STOCKQUANT_RUNNER_MANAGED_ROOT: "/private/tmp/stockquant-runner-host",
};

describe("V3.1 separate Runner Host process", () => {
  it("defaults disabled and makes no claim", async () => {
    const onEvent = vi.fn();
    await runRunnerHostService({ env: {}, onEvent });
    expect(onEvent).toHaveBeenCalledWith("Runner Host remains NOT_CONFIGURED; no job was claimed.");
  });

  it("requires an explicit TestRun scope, independent service token, immutable image and absolute root", () => {
    expect(loadRunnerHostSettings(validIsolatedEnv)).toMatchObject({ mode: "ISOLATED", workerId: "local-runner-1", testRunId: "test-run-1" });
    for (const [name, value, message] of [
      ["STOCKQUANT_RUNNER_HOST_TEST_RUN_ID", "", "explicit valid TestRun scope"],
      ["STOCKQUANT_SERVICE_TOKEN_RUNNER_HOST", "short", "bearer credential"],
      ["STOCKQUANT_RUNNER_IMAGE_REF", "runner:latest", "immutable digest"],
      ["STOCKQUANT_RUNNER_MANAGED_ROOT", "relative/path", "absolute traversal-free"],
    ] as const) {
      expect(() => loadRunnerHostSettings({ ...validIsolatedEnv, [name]: value })).toThrow(message);
    }
  });
});

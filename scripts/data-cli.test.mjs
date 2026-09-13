import test from "node:test";
import assert from "node:assert/strict";
import { argsOf, waitForRun } from "./data-cli.mjs";

test("CLI argument parser ignores pnpm separator", () => {
  assert.deepEqual(argsOf(["--", "--subscription", "sub", "--wait-seconds", "2"]), { subscription: "sub", "wait-seconds": "2" });
});

test("bounded wait returns terminal run", async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => ({ ok: true, text: async () => JSON.stringify({ runId: "run-1", status: calls++ ? "COMPLETED" : "RUNNING" }) });
  try {
    const result = await waitForRun("run-1", 2);
    assert.equal(result.status, "COMPLETED");
    assert.equal(calls, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("bounded wait returns nonterminal run at deadline", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true, text: async () => JSON.stringify({ runId: "run-2", status: "WAITING_RETRY" }) });
  try {
    const result = await waitForRun("run-2", 0);
    assert.equal(result.status, "WAITING_RETRY");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

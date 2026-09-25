import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

async function runCheckOnly(run) {
  const directory = await mkdtemp(join(tmpdir(), "stockquant-verify-stage-"));
  const mock = join(directory, "mock-fetch.mjs");
  await writeFile(mock, `globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => (${JSON.stringify(run)}) });\n`);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["--import", mock, "scripts/verify-stage.mjs", "--stage", "V2.4", "--run", "test-run", "--check-only"], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk; });
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    child.once("close", (code) => resolve({ code, stdout, stderr }));
  });
}

test("check-only rejects a completed run with no assertions", async () => {
  const result = await runCheckOnly({ status: "COMPLETED", assertions: [] });
  assert.equal(result.code, 2);
});

test("check-only preserves the failure exit code for a failed run", async () => {
  const result = await runCheckOnly({ status: "FAILED", assertions: [{ status: "FAIL" }] });
  assert.equal(result.code, 1);
});

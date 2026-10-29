import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

async function runCheckOnly(run, stage = "V2.4", scenario = undefined) {
  const directory = await mkdtemp(join(tmpdir(), "stockquant-verify-stage-"));
  const mock = join(directory, "mock-fetch.mjs");
  await writeFile(mock, `globalThis.fetch = async (url) => { process.stderr.write("FETCHURL:" + String(url) + "\\n"); return { ok: true, status: 200, json: async () => (${JSON.stringify(run)}) }; };\n`);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["--import", mock, "scripts/verify-stage.mjs", "--stage", stage, ...(scenario ? ["--scenario", scenario] : []), "--run", "test-run", "--check-only"], { stdio: ["ignore", "pipe", "pipe"] });
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

test("V1.1 check-only accepts the generated owner-scoped run contract", async () => {
  const result = await runCheckOnly({
    testRunId: "00000000-0000-4000-8000-000000000001",
    stageId: "V1.1",
    scenarioId: "normal",
    scenarioVersion: "1.0.0",
    namespace: "v11-test",
    ownerId: "acceptance-owner-1",
    status: "COMPLETED",
    seed: 20260907,
    accountId: null,
    createdAt: "2026-10-11T00:00:00.000Z",
    completedAt: "2026-10-11T00:00:01.000Z",
    error: null,
    assertions: [{ assertionId: "V1.1-TEST-001", status: "PASS", expected: true, actual: true, evidence: {} }],
  }, "V1.1");
  assert.equal(result.code, 0);
});

test("V1.1 check-only rejects responses that drift from the generated run contract", async () => {
  const result = await runCheckOnly({ status: "COMPLETED", assertions: [{ status: "PASS" }] }, "V1.1");
  assert.equal(result.code, 1);
  assert.match(result.stderr, /violates V11AcceptanceRun/);
});

test("V2.4 C5 check-only reads the persisted local-engineering run and accepts only complete passing evidence", async () => {
  const result = await runCheckOnly({ status: "COMPLETED", assertions: [{ assertionId: "C5", status: "PASS" }] }, "V2.4", "c5-local-engineering");
  assert.equal(result.code, 0);
  assert.match(result.stderr, /\/api\/v1\/acceptance\/v2\/v2\.4\/local-engineering\/runs\/test-run/);
});

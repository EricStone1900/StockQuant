import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { test } from "node:test";
import assert from "node:assert/strict";

test("V3.3 scenario CLI persists WAITING TestRuns and check-only reads the same run", async (t) => {
  const runs = new Map();
  const calls = [];
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : null;
    calls.push({ method: req.method, url: req.url, body, cookie: req.headers.cookie });
    const prefix = "/api/v1/acceptance/v3/v3.3/runs";
    if (req.method === "POST" && req.url === prefix) {
      const testRunId = `123e4567-e89b-42d3-a456-${String(runs.size + 1).padStart(12, "0")}`;
      const run = { testRunId, stageId: "V3.3", scenarioId: body.scenarioId, scenarioVersion: "v3.3-readiness-v1", status: "WAITING", seed: body.seed, assertions: [{ id: "V3.3_EXECUTOR", status: "NOT_RUN" }], evidence: { readiness: "WAITING", blockers: [{ id: "V3.3_EXECUTOR", status: "NOT_IMPLEMENTED" }], runnerDispatch: "NOT_PERFORMED", runnerJobsCreated: 0, externalModelCalls: 0, paperContinuity: "NOT_CHECKED" } };
      runs.set(testRunId, run);
      res.writeHead(202, { "content-type": "application/json" }).end(JSON.stringify({ accepted: true, ...run }));
      return;
    }
    const match = req.url?.match(new RegExp(`^${prefix}/([0-9a-f-]+)$`, "iu"));
    if (req.method === "GET" && match && runs.has(match[1])) {
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(runs.get(match[1])));
      return;
    }
    res.writeHead(404, { "content-type": "application/json" }).end(JSON.stringify({ message: "not found" }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const script = new URL("./verify-stage.mjs", import.meta.url).pathname;
  const runCli = (args) => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, "--", ...args], { env: { ...process.env, STOCKQUANT_PLATFORM_API_URL: baseUrl, STOCKQUANT_SESSION_COOKIE: "sq_session=acceptance-owner-1" }, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = ""; let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (part) => { stdout += part; });
    child.stderr.setEncoding("utf8").on("data", (part) => { stderr += part; });
    child.once("error", reject);
    child.once("close", (code) => resolve({ code, stdout, stderr }));
  });
  for (const scenario of ["normal", "rejection", "recovery"]) {
    const result = await runCli(["--stage", "V3.3", "--scenario", scenario, "--seed", "20260907"]);
    assert.equal(result.code, 2, result.stderr);
    const run = JSON.parse(result.stdout);
    assert.equal(run.stageId, "V3.3");
    assert.equal(run.scenarioId, scenario);
    assert.equal(run.status, "WAITING");
    assert.equal(run.evidence.runnerJobsCreated, 0);
    assert.equal(run.evidence.externalModelCalls, 0);
  }
  const testRunId = [...runs.keys()][0];
  const check = await runCli(["--stage", "V3.3", "--run", testRunId, "--check-only"]);
  assert.equal(check.code, 2, check.stderr);
  assert.equal(JSON.parse(check.stdout).testRunId, testRunId);
  assert.equal(calls.filter((call) => call.method === "POST").length, 3);
  assert.equal(calls.filter((call) => call.method === "GET").length, 4);
  assert.ok(calls.every((call) => call.cookie === "sq_session=acceptance-owner-1"));
});

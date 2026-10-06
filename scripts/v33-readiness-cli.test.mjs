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
    if (req.method === "POST" && req.url === "/v1/runner/budgets/test-run/limit") {
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ schemaVersion: "v3.3-test-run-budget-limit-v1", testRunId: body.testRunId, budgetCents: body.budgetCents, status: "CONFIGURED" }));
      return;
    }
    const experimentMatch = req.url?.match(new RegExp(`^${prefix}/([0-9a-f-]+)/experiment$`, "iu"));
    if (req.method === "POST" && experimentMatch && runs.has(experimentMatch[1])) {
      const run = runs.get(experimentMatch[1]);
      assert.deepEqual(body, { schemaVersion: "v3.3-scenario-experiment-command-v1", confirmation: "CREATE_V33_FIXTURE_EXPERIMENT" });
      const experiment = { experimentId: "e1205560-6ca0-4d6c-b3d5-d292dae4a8dd", rounds: 2, budgetCents: 80, budget: { status: "RESERVED", reservedCents: 80 } };
      run.evidence.workflowStep = "EXPERIMENT_RESERVED";
      run.evidence.experiment = experiment;
      res.writeHead(201, { "content-type": "application/json" }).end(JSON.stringify({ schemaVersion: "v3.3-scenario-experiment-result-v1", testRunId: run.testRunId, status: "WAITING", idempotent: false, experiment }));
      return;
    }
    const dispatchMatch = req.url?.match(new RegExp(`^${prefix}/([0-9a-f-]+)/dispatch$`, "iu"));
    if (req.method === "POST" && dispatchMatch && runs.has(dispatchMatch[1])) {
      const run = runs.get(dispatchMatch[1]);
      assert.deepEqual(body, { schemaVersion: "v3.3-scenario-dispatch-command-v1", confirmation: "DISPATCH_V33_FIXTURE_RUNNER" });
      run.status = "RUNNING";
      run.evidence.workflowStep = "RUNNER_JOBS_QUEUED";
      run.evidence.runnerDispatch = "QUEUED";
      run.evidence.runnerJobsCreated = 2;
      run.evidence.runnerJobIds = [`${run.testRunId}:round-1`, `${run.testRunId}:round-2`];
      res.writeHead(201, { "content-type": "application/json" }).end(JSON.stringify({ schemaVersion: "v3.3-scenario-dispatch-result-v1", testRunId: run.testRunId, status: "RUNNING", workflowStep: "RUNNER_JOBS_QUEUED", idempotent: false, runnerJobsCreated: 2, runnerJobIds: run.evidence.runnerJobIds, rounds: [{ roundIndex: 1 }, { roundIndex: 2 }], externalModelCalls: 0 }));
      return;
    }
    const reconcileMatch = req.url?.match(new RegExp(`^${prefix}/([0-9a-f-]+)/reconcile$`, "iu"));
    if (req.method === "POST" && reconcileMatch && runs.has(reconcileMatch[1])) {
      const run = runs.get(reconcileMatch[1]);
      assert.deepEqual(body, { schemaVersion: "v3.3-scenario-reconcile-command-v1", confirmation: "RECONCILE_V33_FIXTURE_RESULTS" });
      run.evidence.workflowStep = "EXPERIMENT_SETTLED_AND_RESULTS_RECONCILED";
      run.evidence.runnerDispatch = "COMPLETED";
      run.evidence.runnerExecution = "COMPLETED";
      run.evidence.completedRounds = [{ roundIndex: 1 }, { roundIndex: 2 }];
      run.evidence.businessWorkflow = "EXPERIMENT_SETTLED_AND_RESULTS_RECONCILED";
      run.evidence.experimentSettlement = "VERIFIED_FIXTURE_LEDGER";
      run.evidence.businessValidation = "NOT_RUN";
      run.evidence.humanAcceptance = "NOT_RUN";
      res.writeHead(201, { "content-type": "application/json" }).end(JSON.stringify({ schemaVersion: "v3.3-scenario-reconcile-result-v1", testRunId: run.testRunId, status: "RUNNING", workflowStep: "EXPERIMENT_SETTLED_AND_RESULTS_RECONCILED", completedRounds: 2, rounds: run.evidence.completedRounds, experimentSettlement: "VERIFIED_FIXTURE_LEDGER", settlement: { experimentId: run.evidence.experiment.experimentId, requestedCents: 80, settledCents: 46, modelCallCount: 2, rounds: [{ roundIndex: 1, allocatedCents: 40, settledCents: 23 }, { roundIndex: 2, allocatedCents: 40, settledCents: 23 }] }, businessValidation: "NOT_RUN", humanAcceptance: "NOT_RUN" }));
      return;
    }
    const rejectionMatch = req.url?.match(new RegExp(`^${prefix}/([0-9a-f-]+)/verify-rejection$`, "iu"));
    if (req.method === "POST" && rejectionMatch && runs.has(rejectionMatch[1])) {
      const run = runs.get(rejectionMatch[1]);
      assert.deepEqual(body, { schemaVersion: "v3.3-rejection-verify-command-v1", confirmation: "VERIFY_V33_BUDGET_REJECTION" });
      run.status = "RUNNING";
      run.assertions.push({ id: "V3.3_REJECTION_NO_SIDE_EFFECTS", status: "PASS" });
      run.evidence.workflowStep = "REJECTION_ASSERTION_VERIFIED";
      run.evidence.businessValidation = "PASS";
      run.evidence.rejectionAssertion = { result: "PASS", noExperiment: true, noModelCalls: true, noRunnerJobs: true };
      res.writeHead(201, { "content-type": "application/json" }).end(JSON.stringify({ schemaVersion: "v3.3-rejection-verify-result-v1", testRunId: run.testRunId, status: "RUNNING", idempotent: false, assertion: run.assertions.at(-1), evidence: run.evidence.rejectionAssertion }));
      return;
    }
    const recoveryMatch = req.url?.match(new RegExp(`^${prefix}/([0-9a-f-]+)/verify-recovery$`, "iu"));
    if (req.method === "POST" && recoveryMatch && runs.has(recoveryMatch[1])) {
      const run = runs.get(recoveryMatch[1]);
      assert.deepEqual(body, { schemaVersion: "v3.3-recovery-verify-command-v1", confirmation: "VERIFY_V33_CHECKPOINT_RECOVERY" });
      run.assertions.push({ id: "V3.3_CHECKPOINT_RECOVERY_001", status: "PASS" });
      run.evidence.workflowStep = "RECOVERY_ASSERTION_VERIFIED";
      run.evidence.businessValidation = "PASS";
      run.evidence.recoveryAssertion = { result: "PASS", roundIndex: 1 };
      res.writeHead(201, { "content-type": "application/json" }).end(JSON.stringify({ schemaVersion: "v3.3-recovery-verify-result-v1", testRunId: run.testRunId, status: "RUNNING", idempotent: false, assertion: run.assertions.at(-1), evidence: run.evidence.recoveryAssertion }));
      return;
    }
    if (req.method === "POST" && req.url === prefix) {
      const testRunId = `123e4567-e89b-42d3-a456-${String(runs.size + 1).padStart(12, "0")}`;
      const cap = body.scenarioId === "rejection" ? 50 : 100;
      const configured = await fetch(`${baseUrl}/v1/runner/budgets/test-run/limit`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ schemaVersion: "v3.3-test-run-budget-limit-command-v1", testRunId, budgetCents: cap }) });
      assert.equal(configured.status, 200);
      const testRunBudget = await configured.json();
      const run = { testRunId, stageId: "V3.3", scenarioId: body.scenarioId, scenarioVersion: "v3.3-readiness-v1", status: "WAITING", seed: body.seed, assertions: [{ id: "V3.3_EXECUTOR", status: "NOT_RUN" }], evidence: { readiness: "WAITING", testRunBudget, blockers: [{ id: "V3.3_EXECUTOR", status: "NOT_IMPLEMENTED" }], runnerDispatch: "NOT_PERFORMED", runnerJobsCreated: 0, externalModelCalls: 0, paperContinuity: "NOT_CHECKED" } };
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
    const child = spawn(process.execPath, [script, "--", ...args], { env: { ...process.env, STOCKQUANT_PLATFORM_API_URL: baseUrl, STOCKQUANT_RESEARCH_AUTOMATION_URL: baseUrl, STOCKQUANT_SERVICE_TOKEN_PLATFORM_API: "p".repeat(40), STOCKQUANT_SESSION_COOKIE: "sq_session=acceptance-owner-1" }, stdio: ["ignore", "pipe", "pipe"] });
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
    assert.equal(run.evidence.testRunBudget.budgetCents, scenario === "rejection" ? 50 : 100);
  }
  const testRunId = [...runs.keys()][0];
  const check = await runCli(["--stage", "V3.3", "--run", testRunId, "--check-only"]);
  assert.equal(check.code, 2, check.stderr);
  assert.equal(JSON.parse(check.stdout).testRunId, testRunId);
  assert.equal(JSON.parse(check.stdout).evidence.testRunBudget.budgetCents, 100);
  const rejectionRun = [...runs.values()].find((run) => run.scenarioId === "rejection");
  const rejection = await runCli(["--stage", "V3.3", "--run", rejectionRun.testRunId, "--verify-rejection"]);
  assert.equal(rejection.code, 2, rejection.stderr); // scenario assertion passes, but unrelated stage gates remain open
  assert.equal(JSON.parse(rejection.stdout).evidence.workflowStep, "REJECTION_ASSERTION_VERIFIED");
  assert.equal(calls.find((call) => call.url === `/api/v1/acceptance/v3/v3.3/runs/${rejectionRun.testRunId}/verify-rejection`)?.body.confirmation, "VERIFY_V33_BUDGET_REJECTION");
  const capCalls = calls.filter((call) => call.url === "/v1/runner/budgets/test-run/limit");
  assert.deepEqual(capCalls.map((call) => call.body.budgetCents), [100, 50, 100]);
  assert.ok(capCalls.every((call) => call.body.testRunId && call.body.schemaVersion === "v3.3-test-run-budget-limit-command-v1"));
  assert.equal(calls.filter((call) => call.method === "POST" && call.url === "/api/v1/acceptance/v3/v3.3/runs").length, 3);
  assert.equal(calls.filter((call) => call.method === "GET").length, 5);
  assert.ok(calls.filter((call) => call.url.startsWith("/api/")).every((call) => call.cookie === "sq_session=acceptance-owner-1"));

  const reserve = await runCli(["--stage", "V3.3", "--scenario", "normal", "--seed", "20260907", "--reserve-experiment"]);
  assert.equal(reserve.code, 2, reserve.stderr);
  const reservedRun = JSON.parse(reserve.stdout);
  assert.equal(reservedRun.status, "WAITING");
  assert.equal(reservedRun.evidence.workflowStep, "EXPERIMENT_RESERVED");
  assert.equal(reservedRun.evidence.experiment.budget.reservedCents, 80);
  const reserveCall = calls.find((call) => call.url === `/api/v1/acceptance/v3/v3.3/runs/${reservedRun.testRunId}/experiment`);
  assert.equal(reserveCall?.body.confirmation, "CREATE_V33_FIXTURE_EXPERIMENT");
  const checkReserved = await runCli(["--stage", "V3.3", "--run", reservedRun.testRunId, "--check-only"]);
  assert.equal(checkReserved.code, 2, checkReserved.stderr);
  assert.equal(JSON.parse(checkReserved.stdout).evidence.experiment.experimentId, reservedRun.evidence.experiment.experimentId);
  const dispatched = await runCli(["--stage", "V3.3", "--scenario", "recovery", "--seed", "20260907", "--reserve-experiment", "--dispatch-runner"]);
  assert.equal(dispatched.code, 2, dispatched.stderr);
  const dispatchedRun = JSON.parse(dispatched.stdout);
  assert.equal(dispatchedRun.status, "RUNNING");
  assert.equal(dispatchedRun.evidence.workflowStep, "RUNNER_JOBS_QUEUED");
  assert.equal(dispatchedRun.evidence.runnerJobsCreated, 2);
  assert.equal(dispatchedRun.evidence.externalModelCalls, 0);
  assert.equal(calls.find((call) => call.url === `/api/v1/acceptance/v3/v3.3/runs/${dispatchedRun.testRunId}/dispatch`)?.body.confirmation, "DISPATCH_V33_FIXTURE_RUNNER");
  const reconciled = await runCli(["--stage", "V3.3", "--run", dispatchedRun.testRunId, "--reconcile-runner-results"]);
  assert.equal(reconciled.code, 2, reconciled.stderr);
  assert.equal(JSON.parse(reconciled.stdout).testRunId, dispatchedRun.testRunId);
  assert.equal(JSON.parse(reconciled.stdout).evidence.workflowStep, "EXPERIMENT_SETTLED_AND_RESULTS_RECONCILED");
  assert.equal(JSON.parse(reconciled.stdout).evidence.experimentSettlement, "VERIFIED_FIXTURE_LEDGER");
  assert.equal(calls.find((call) => call.url === `/api/v1/acceptance/v3/v3.3/runs/${dispatchedRun.testRunId}/reconcile`)?.body.confirmation, "RECONCILE_V33_FIXTURE_RESULTS");
  const verifiedRecovery = await runCli(["--stage", "V3.3", "--run", dispatchedRun.testRunId, "--verify-recovery"]);
  assert.equal(verifiedRecovery.code, 2, verifiedRecovery.stderr);
  assert.equal(JSON.parse(verifiedRecovery.stdout).evidence.workflowStep, "RECOVERY_ASSERTION_VERIFIED");
  assert.equal(calls.find((call) => call.url === `/api/v1/acceptance/v3/v3.3/runs/${dispatchedRun.testRunId}/verify-recovery`)?.body.confirmation, "VERIFY_V33_CHECKPOINT_RECOVERY");
});

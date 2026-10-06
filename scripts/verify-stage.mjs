import { spawnSync } from "node:child_process";
import { codeSuiteCommands } from "./code-suite-plan.mjs";
import { platformMarketDataHeaders } from "./market-data-service-identity.mjs";

const args = process.argv.slice(2);
const value = (name) => args[args.indexOf(name) + 1];
const has = (name) => args.includes(name);
const stage = value("--stage");
const scenario = value("--scenario");
const runId = value("--run");
const baseUrl = process.env.STOCKQUANT_PLATFORM_API_URL ?? "http://127.0.0.1:3000";
const headers = { "content-type": "application/json", "x-stockquant-user": "acceptance-owner-1", ...(process.env.STOCKQUANT_SESSION_COOKIE ? { cookie: process.env.STOCKQUANT_SESSION_COOKIE } : {}) };

const implementedStages = ['V1.1', 'V1.2', 'V1.3', 'V1.4', 'V1.5', 'V2.1', 'V2.2', 'V2.3', 'V2.4', 'V2.5', 'V3.1', 'V3.2', 'V3.3', 'V3.4'];
if (!implementedStages.includes(stage)) {
    console.error("implemented stages: V1.1 through V1.5, V2.1 through V2.5, V3.1 through V3.3 preparation slices, V3.4 local code preflight");
  process.exit(2);
}

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers: { ...headers, ...(init.headers ?? {}) } });
  const body = await response.json().catch(() => ({ message: "non-JSON response" }));
  if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(body)}`);
  return body;
}

function runV34Preflight() {
  if (value("--suite") === "code") {
    const commands = [["pnpm", ["baseline:check"]], ["pnpm", ["build"]], ["pnpm", ["lint"]], ["pnpm", ["typecheck"]], ["pnpm", ["test"]], [process.execPath, ["--test", "scripts/verify-v34-preflight.test.mjs"]], [process.execPath, ["--test", "scripts/w8-ubuntu-host-preflight.test.mjs"]]];
    for (const [command, commandArgs] of commands) {
      console.log(`\n[V3.4 local code preflight] ${command} ${commandArgs.join(" ")}`);
      const code = runCommand(command, commandArgs);
      if (code !== 0) process.exit(code);
    }
    console.log(JSON.stringify({ stageId: "V3.4", suite: "code", status: "PASS", scope: "local-repository-build-lint-typecheck-tests-and-contract-baseline", ubuntuHostPreflightRules: "UNIT_TESTED", ubuntuHostValidation: "NOT_RUN", v34BusinessWorkflow: "NOT_IMPLEMENTED", ubuntuValidation: "NOT_RUN", fullStageE2E: "NOT_IMPLEMENTED", paperObservation: "NOT_RUN", humanAcceptance: "NOT_RUN" }, null, 2));
    return;
  }
  const acceptedScenarios = ["normal", "rejection", "recovery"];
  if (!acceptedScenarios.includes(scenario)) {
    console.error("V3.4 currently supports --suite code or --scenario normal|rejection|recovery for a prerequisite-only readiness report; no business TestRun/check-only API exists");
    process.exit(2);
  }
  const versionChecks = ["V1", "V2", "V3"].map((version) => {
    const result = spawnSync(process.execPath, ["scripts/verify-version.mjs", "--version", version], { encoding: "utf8" });
    let report = null;
    try { report = JSON.parse(result.stdout); } catch { /* preserve an explicit unavailable blocker below */ }
    return { id: `VERSION_${version}`, status: result.status === 0 && report?.status === "PASS" ? "VERIFIED" : "NOT_VERIFIED", versionStatus: report?.status ?? "UNAVAILABLE", exitCode: result.status };
  });
  const blockers = [
    ...versionChecks,
    { id: "UBUNTU_TARGET", status: "NOT_VERIFIED", reason: "real target host, distribution, x86_64 resources and network evidence are not recorded" },
    { id: "V34_WORKFLOW", status: "NOT_IMPLEMENTED", reason: "no V3.4 business TestRun, migration/restore orchestration or stage Web route exists" },
    { id: "PAPER_OBSERVATION", status: "NOT_RUN", reason: "actual Ubuntu observation days remain a separate evidence gate" },
    { id: "HUMAN_ACCEPTANCE", status: "NOT_RUN", reason: "requires the user's review of executable evidence" },
  ];
  const report = { stageId: "V3.4", scenarioId: scenario, status: "WAITING", testRunId: null, sideEffects: "NONE", blockers, businessValidation: "NOT_RUN", humanAcceptance: "NOT_RUN" };
  console.log(JSON.stringify(report, null, 2));
  process.exit(2);
}

async function waitForRun(id) {
  for (let attempt = 0; attempt < 240; attempt += 1) {
    const run = await request(`/api/v1/acceptance/runs/${id}`, { signal: AbortSignal.timeout(5000) });
    if (["COMPLETED", "FAILED", "WAITING"].includes(run.status)) return run;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`timed out waiting 120s for ${id}`);
}

function runCommand(command, commandArgs, extraEnv = {}) {
  const result = spawnSync(command, commandArgs, { stdio: "inherit", env: { ...process.env, ...extraEnv } });
  return result.status ?? 1;
}

function hasPassingAssertions(run) {
  return run?.status === "COMPLETED"
    && Array.isArray(run.assertions)
    && run.assertions.length > 0
    && run.assertions.every((item) => item?.status === "PASS");
}

function runExitCode(run) {
  if (hasPassingAssertions(run)) return 0;
  if (run?.status === "FAILED") return 1;
  return 2;
}

function runCodeSuite(stage) {
  for (const [command, commandArgs, commandEnv] of codeSuiteCommands(stage)) {
    const resolvedEnv = commandEnv ? Object.fromEntries(Object.entries(commandEnv).map(([key, value]) => [key, process.env[key] ?? value])) : {};
    const exitCode = runCommand(command, commandArgs, resolvedEnv);
    if (exitCode !== 0) process.exit(exitCode);
  }
}

async function runV2Stage() {
  const routes = {
    "V2.1": "/api/v1/acceptance/v2/v2.1/runs",
    "V2.2": "/api/v1/acceptance/v2/v2.2/runs",
    "V2.3": "/api/v1/acceptance/v2/v2.3/runs",
    "V2.4": "/api/v1/acceptance/v2/v2.4/runs"
    ,"V2.5": "/api/v1/acceptance/v2/v2.5/runs"
  };
  const route = routes[stage];
  if (value("--suite") === "code") {
    runCodeSuite(stage);
    return;
  }
  if (runId && has("--check-only")) {
    const run = await request(`${route}/${runId}`);
    console.log(JSON.stringify({ checkOnly: true, stageId: stage, testRunId: runId, status: run.status, assertions: run.assertions }, null, 2));
    process.exit(runExitCode(run));
  }
  const allowedScenarios = stage === "V2.2" ? ["normal", "rejection", "recovery", "uploaded-csv"] : stage === "V2.4" ? ["normal", "rejection", "recovery", "external-reconciliation"] : ["normal", "rejection", "recovery"];
  if (!allowedScenarios.includes(scenario)) {
    console.error(stage === "V2.2" ? "specify --scenario normal|rejection|recovery|uploaded-csv [--upload-id UUID], --suite code, or --run RUN_ID --check-only" : stage === "V2.4" ? "specify --scenario normal|rejection|recovery|external-reconciliation, --suite code, or --run RUN_ID --check-only" : "specify --scenario normal|rejection|recovery, --suite code, or --run RUN_ID --check-only");
    process.exit(2);
  }
  if (scenario === "uploaded-csv" && (!has("--upload-id") || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value("--upload-id") ?? ""))) { console.error("uploaded-csv requires --upload-id UUID"); process.exit(2); }
  const fileFormat = value("--file-format") ?? "CSV";
  if (stage === "V2.2" && !["CSV", "PARQUET"].includes(fileFormat)) { console.error("--file-format must be CSV or PARQUET"); process.exit(2); }
  const accepted = await request(route, { method: "POST", body: JSON.stringify({ scenarioId: scenario, seed: Number(value("--seed") ?? 20260907), ...(scenario === "uploaded-csv" ? { uploadId: value("--upload-id"), fileFormat } : {}) }) });
  if (!accepted.testRunId) throw new Error("run creation returned no testRunId");
  const run = await request(`${route}/${accepted.testRunId}`);
  console.log(JSON.stringify(run, null, 2));
  process.exit(runExitCode(run));
}

async function runV31Stage() {
  const route = "/api/v1/acceptance/v3/v3.1/runs";
  if (value("--suite") === "code") {
    for (const [command, commandArgs, commandEnv] of [
      [process.execPath, ["--test", "scripts/evidence-export.test.mjs"]],
      [process.execPath, ["scripts/evidence-export-http-smoke.mjs"]],
      ["pnpm", ["contracts:check"]],
      ["pnpm", ["--filter", "@stockquant/research-automation-service", "lint"]],
      ["pnpm", ["--filter", "@stockquant/research-automation-service", "test"]],
      ["pnpm", ["--filter", "@stockquant/research-automation-service", "test:integration"], { RESEARCH_AUTOMATION_DATABASE_URL: process.env.RESEARCH_AUTOMATION_DATABASE_URL ?? "postgresql://research_automation@127.0.0.1:5433/research_automation_test" }],
      ["pnpm", ["--filter", "@stockquant/research-automation-service", "v33:queue-capacity-probe"], { RESEARCH_AUTOMATION_DATABASE_URL: process.env.RESEARCH_AUTOMATION_DATABASE_URL ?? "postgresql://research_automation@127.0.0.1:5433/research_automation_test" }],
      ["pnpm", ["--filter", "@stockquant/research-automation-service", "model-gateway:fixture-http-smoke"]],
      ["pnpm", ["--filter", "@stockquant/research-automation-service", "budget:settlement-production-http-smoke"]],
      ["pnpm", ["v31:litellm-model-gateway-internal-smoke"]],
      ["pnpm", ["--filter", "@stockquant/platform-api-service", "typecheck"]],
      ["pnpm", ["--filter", "@stockquant/platform-api-service", "test"]],
      ["pnpm", ["--filter", "@stockquant/platform-api-service", "v31:artifact-owner-scope-http-smoke"], {
        PLATFORM_API_TEST_DATABASE_URL: process.env.PLATFORM_API_TEST_DATABASE_URL ?? "postgresql://platform_api_test@127.0.0.1:5433/platform_api_test",
        RESEARCH_AUTOMATION_DATABASE_URL: process.env.RESEARCH_AUTOMATION_DATABASE_URL ?? "postgresql://research_automation@127.0.0.1:5433/research_automation_test",
      }],
      ["pnpm", ["--filter", "@stockquant/web", "typecheck"]]
    ]) {
      const exitCode = runCommand(command, commandArgs, commandEnv);
      if (exitCode !== 0) process.exit(exitCode);
    }
    return;
  }
  if (runId && has("--check-only")) {
    const run = await request(`${route}/${runId}`);
    console.log(JSON.stringify({ checkOnly: true, stageId: stage, testRunId: runId, status: run.status, assertions: run.assertions }, null, 2));
    process.exit(runExitCode(run));
  }
  if (!["normal", "rejection", "recovery"].includes(scenario)) {
    console.error("specify --scenario normal|rejection|recovery, --suite code, or --run RUN_ID --check-only");
    process.exit(2);
  }
  const accepted = await request(route, { method: "POST", body: JSON.stringify({ scenarioId: scenario, seed: Number(value("--seed") ?? 20260907) }) });
  const run = await request(`${route}/${accepted.testRunId}`);
  console.log(JSON.stringify(run, null, 2));
  process.exit(runExitCode(run));
}

async function runV32PreparationStage() {
  if (value("--suite") === "code") {
    const commands = [
      ["pnpm", ["baseline:check"]],
      [process.execPath, ["--test", "scripts/evidence-export.test.mjs"]],
      [process.execPath, ["scripts/evidence-export-http-smoke.mjs"]],
      [process.execPath, ["scripts/v32-preparation-check.mjs"]],
      [process.execPath, ["--test", "scripts/v32-stage-preparation.test.mjs"]],
      [process.execPath, ["--test", "scripts/v32-readiness-cli.test.mjs"]],
      ["pnpm", ["--filter", "@stockquant/quant-research-service", "typecheck"]],
      ["pnpm", ["--filter", "@stockquant/quant-research-service", "test"]],
      ["pnpm", ["--filter", "@stockquant/quant-research-service", "v32:fixture-recompute"]],
      ["pnpm", ["--filter", "@stockquant/decision-governance-service", "build"]],
      ["pnpm", ["--filter", "@stockquant/decision-governance-service", "test"]],
      ["pnpm", ["--filter", "@stockquant/quant-research-service", "test:integration"]],
      ["pnpm", ["--filter", "@stockquant/research-automation-service", "build"]],
      ["pnpm", ["--filter", "@stockquant/research-automation-service", "test"]],
      ["pnpm", ["--filter", "@stockquant/research-automation-service", "v32:promotion-prepare-http-smoke"]],
      ["pnpm", ["--filter", "@stockquant/platform-api-service", "build"]],
      ["pnpm", ["--filter", "@stockquant/platform-api-service", "test"]],
      ["pnpm", ["--filter", "@stockquant/platform-api-service", "test:integration"], { PLATFORM_API_TEST_DATABASE_URL: process.env.PLATFORM_API_TEST_DATABASE_URL ?? "postgresql://platform_api_test@127.0.0.1:5433/platform_api_test" }],
      ["pnpm", ["verify:w8:v32-readiness"]],
      ["pnpm", ["--filter", "@stockquant/web", "typecheck"]],
      ["pnpm", ["--filter", "@stockquant/web", "build"]],
      ["pnpm", ["--filter", "@stockquant/web", "test"]]
    ];
    for (const [command, commandArgs, commandEnv] of commands) {
      console.log(`\n[V3.2 code] ${command} ${commandArgs.join(" ")}`);
      const exitCode = runCommand(command, commandArgs, commandEnv);
      if (exitCode !== 0) process.exit(exitCode);
    }
    console.log(JSON.stringify({ stageId: "V3.2", suite: "code", status: "PASS", scope: "contracts-fixtures-independent-synthetic-recomputation-persisted-evidence-guarded-submit-exact-version-decision-disabled-registry-governance-exact-mandate-binding-owner-scoped-readiness-TestRun-metadata-and-preparation-evidence-snapshot", businessValidation: "NOT_RUN", activeRegistryMutation: "NOT_PERFORMED", isolatedSyntheticRegistryMutation: "PERFORMED_IN_DISPOSABLE_TEST_DATABASE", humanAcceptance: "NOT_RUN" }, null, 2));
    return;
  }
  if (runId && has("--check-only")) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(runId)) { console.error("--run must be a TestRun UUID"); process.exit(2); }
    const run = await request(`/api/v1/acceptance/v3/v3.2/runs/${encodeURIComponent(runId)}`);
    console.log(JSON.stringify({ checkOnly: true, stageId: "V3.2", ...run }, null, 2));
    process.exit(runExitCode(run));
  }
  if (["normal", "rejection", "recovery"].includes(scenario)) {
    const created = await request("/api/v1/acceptance/v3/v3.2/runs", { method: "POST", body: JSON.stringify({ scenarioId: scenario, seed: Number(value("--seed") ?? 20260907), ...(value("--source-v31-run") ? { sourceV31TestRunId: value("--source-v31-run") } : {}) }) });
    if (typeof created.testRunId !== "string") throw new Error("V3.2 readiness run creation returned no testRunId");
    const run = await request(`/api/v1/acceptance/v3/v3.2/runs/${encodeURIComponent(created.testRunId)}`);
    console.log(JSON.stringify(run, null, 2));
    process.exit(2);
  }
  console.error("V3.2 preparation supports --suite code or owner-scoped persisted readiness TestRuns; business assertions remain WAITING until V3.1 is accepted, persisted candidate code is independently recomputed, downstream Mandate/Paper enforces the exact version, and the business workflow is implemented");
  process.exit(2);
}

async function runV33PreparationStage() {
  if (value("--suite") === "code") {
    const commands = [
      ["pnpm", ["baseline:check"]],
      ["pnpm", ["contracts:check"]],
      ["pnpm", ["--filter", "@stockquant/research-automation-service", "lint"]],
      ["pnpm", ["--filter", "@stockquant/research-automation-service", "test"]],
      ["pnpm", ["--filter", "@stockquant/research-automation-service", "v33:experiment-binding-http-smoke"]],
      ["pnpm", ["--filter", "@stockquant/research-automation-service", "test:integration"], { RESEARCH_AUTOMATION_DATABASE_URL: process.env.RESEARCH_AUTOMATION_DATABASE_URL ?? "postgresql://research_automation@127.0.0.1:5433/research_automation_test" }],
      ["pnpm", ["--filter", "@stockquant/research-automation-service", "v33:research-queue-http-smoke"]],
      ["pnpm", ["--filter", "@stockquant/research-automation-service", "v33:test-run-budget-summary-http-smoke"], { RESEARCH_AUTOMATION_DATABASE_URL: process.env.RESEARCH_AUTOMATION_DATABASE_URL ?? "postgresql://research_automation@127.0.0.1:5433/research_automation_test" }],
      ["pnpm", ["--filter", "@stockquant/research-automation-service", "v33:test-run-budget-summary-capacity-probe"], { RESEARCH_AUTOMATION_DATABASE_URL: process.env.RESEARCH_AUTOMATION_DATABASE_URL ?? "postgresql://research_automation@127.0.0.1:5433/research_automation_test" }],
      ["pnpm", ["--filter", "@stockquant/research-automation-service", "v33:runner-host-rounds-recovery-http-smoke"], { RESEARCH_AUTOMATION_DATABASE_URL: process.env.RESEARCH_AUTOMATION_DATABASE_URL ?? "postgresql://research_automation@127.0.0.1:5433/research_automation_test" }],
      [process.execPath, ["--test", "scripts/v33-readiness-cli.test.mjs"]],
      ["pnpm", ["--filter", "@stockquant/platform-api-service", "typecheck"]],
      ["pnpm", ["--filter", "@stockquant/platform-api-service", "test"]],
      ["pnpm", ["--filter", "@stockquant/platform-api-service", "test:integration"], { PLATFORM_API_TEST_DATABASE_URL: process.env.PLATFORM_API_TEST_DATABASE_URL ?? "postgresql://platform_api_test@127.0.0.1:5433/platform_api_test" }],
      [process.execPath, ["scripts/run-isolated-postgres-command.mjs", "--admin-env", "V33_DISPATCH_SMOKE_ADMIN_DATABASE_URL", "--", "pnpm", "v33:platform-dispatch-cross-service-smoke"]],
      ["pnpm", ["--filter", "@stockquant/web", "typecheck"]],
      ["pnpm", ["test:e2e", "--", "--stage", "V3.3"]],
    ];
    for (const [command, commandArgs, commandEnv] of commands) {
      console.log(`\n[V3.3 code] ${command} ${commandArgs.join(" ")}`);
      const exitCode = runCommand(command, commandArgs, commandEnv);
      if (exitCode !== 0) process.exit(exitCode);
    }
    console.log(JSON.stringify({ stageId: "V3.3", suite: "code", status: "PASS", scope: "owner-scoped-queue-and-budget-summary-pagination-plus-50k-postgres-probe-plus-runner-host-checkpoint-recovery-plus-test-run-and-round-budget-caps-plus-cross-service-80-cent-rejection-with-zero-side-effects-plus-confirmed-two-round-fixture-dispatch-plus-same-test-run-isolated-container-execution-plus-output-artifact-hash-metrics-and-experiment-ledger-settlement-plus-owner-scoped-normal-and-recovery-business-assertions", readinessTestRunCreation: "PERSISTED_WAITING_WITH_IMMUTABLE_TEST_RUN_CAP", workflowProgress: "CROSS_SERVICE_TWO_ROUND_RUNNER_RESULTS_SETTLED_RECONCILED_NORMAL_RECOVERY_AND_REJECTION_ASSERTED", businessWorkflow: "FIXTURE_RUNNER_SETTLEMENT_NORMAL_RECOVERY_AND_REJECTION_ASSERTIONS", rejectionAssertion: "CROSS_SERVICE_50_CENT_CAP_REJECTED_80_CENT_EXPERIMENT; NO_ALLOCATION_MODEL_CALL_OR_RUNNER_JOB", dispatch: "PLATFORM_RESEARCH_HTTP_PG_VERIFIED; SAME_TEST_RUN_TWO_JOB_CONTAINER_COMPLETION_OUTPUT_HASH_METRICS_AND_46_CENT_LEDGER_SETTLEMENT_VERIFIED", sameRunRunnerExecution: "PINNED_NO_NETWORK_ISOLATED_CONTAINER", experimentSettlement: "VERIFIED_FIXTURE_LEDGER; NOT_PROVIDER_INVOICE_RECONCILIATION", modelProviderCalls: 0, rounds: 2, settledCents: 46, queueReadCapacity: "SYNTHETIC_ROWS_100_TO_50000; CURSOR_PAGINATION_PREFERRED_FOR_DEEP_PAGES", budgetSummaryPagination: "KEYSET_CURSOR; EXACT_TOTALS_ON_FIRST_PAGE_ONLY; CONTINUATION_TOTALS_NULL", budgetEnforcement: "PER_TEST_RUN_AND_FIXED_PER_ROUND_CAPS; RESERVED_AND_UNKNOWN_FULL; SETTLED_ACTUAL; NO_CROSS_ROUND_TRANSFER", stageBudgetControl: "TEST_RUN_AND_ROUND_CAP_ENFORCED", paperContinuity: "NOT_CHECKED", businessValidation: "NORMAL_OUTPUT_SHA_FIXTURE_METRICS_AND_SETTLED_LEDGER_VERIFIED; RECOVERY_CHECKPOINT_SEQUENCE_AND_RESUME_VERIFIED; REJECTION_BUDGET_CAP_AND_ZERO_SIDE_EFFECTS_VERIFIED", humanAcceptance: "NOT_RUN" }, null, 2));
    return;
  }
  if (has("--check-only") && (has("--reconcile-runner-results") || has("--verify-rejection") || has("--verify-recovery") || has("--verify-normal"))) throw new Error("mutating V3.3 assertions cannot be combined with --check-only");
  if (runId && has("--check-only")) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(runId)) { console.error("--run must be a TestRun UUID"); process.exit(2); }
    const run = await request(`/api/v1/acceptance/v3/v3.3/runs/${encodeURIComponent(runId)}`);
    console.log(JSON.stringify({ checkOnly: true, stageId: "V3.3", ...run }, null, 2));
    process.exit(runExitCode(run));
  }
  if (runId && has("--reconcile-runner-results")) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(runId)) { console.error("--run must be a TestRun UUID"); process.exit(2); }
    const reconciled = await request(`/api/v1/acceptance/v3/v3.3/runs/${encodeURIComponent(runId)}/reconcile`, { method: "POST", body: JSON.stringify({ schemaVersion: "v3.3-scenario-reconcile-command-v1", confirmation: "RECONCILE_V33_FIXTURE_RESULTS" }) });
    const run = await request(`/api/v1/acceptance/v3/v3.3/runs/${encodeURIComponent(runId)}`);
    if (reconciled.testRunId !== runId || reconciled.completedRounds !== 2 || reconciled.experimentSettlement !== "VERIFIED_FIXTURE_LEDGER" || run.testRunId !== runId || run.status !== "RUNNING" || run.evidence?.workflowStep !== "EXPERIMENT_SETTLED_AND_RESULTS_RECONCILED" || run.evidence?.experimentSettlement !== "VERIFIED_FIXTURE_LEDGER") throw new Error("V3.3 Runner results and Fixture Experiment settlement were not verified on the same TestRun");
    console.log(JSON.stringify({ reconciliation: reconciled, ...run }, null, 2));
    process.exitCode = runExitCode(run);
    return;
  }
  if (runId && has("--verify-rejection")) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(runId)) { console.error("--run must be a TestRun UUID"); process.exit(2); }
    const verified = await request(`/api/v1/acceptance/v3/v3.3/runs/${encodeURIComponent(runId)}/verify-rejection`, { method: "POST", body: JSON.stringify({ schemaVersion: "v3.3-rejection-verify-command-v1", confirmation: "VERIFY_V33_BUDGET_REJECTION" }) });
    const run = await request(`/api/v1/acceptance/v3/v3.3/runs/${encodeURIComponent(runId)}`);
    if (verified.testRunId !== runId || verified.assertion?.id !== "V3.3_REJECTION_NO_SIDE_EFFECTS" || run.testRunId !== runId || run.status !== "RUNNING" || run.evidence?.workflowStep !== "REJECTION_ASSERTION_VERIFIED") throw new Error("V3.3 budget rejection assertion was not persisted on the same TestRun");
    console.log(JSON.stringify({ rejectionVerification: verified, ...run }, null, 2));
    process.exitCode = runExitCode(run);
    return;
  }
  if (runId && has("--verify-recovery")) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(runId)) { console.error("--run must be a TestRun UUID"); process.exit(2); }
    const verified = await request(`/api/v1/acceptance/v3/v3.3/runs/${encodeURIComponent(runId)}/verify-recovery`, { method: "POST", body: JSON.stringify({ schemaVersion: "v3.3-recovery-verify-command-v1", confirmation: "VERIFY_V33_CHECKPOINT_RECOVERY" }) });
    const run = await request(`/api/v1/acceptance/v3/v3.3/runs/${encodeURIComponent(runId)}`);
    if (verified.testRunId !== runId || verified.assertion?.id !== "V3.3_CHECKPOINT_RECOVERY_001" || run.testRunId !== runId || run.status !== "RUNNING" || run.evidence?.workflowStep !== "RECOVERY_ASSERTION_VERIFIED") throw new Error("V3.3 checkpoint recovery assertion was not persisted on the same TestRun");
    console.log(JSON.stringify({ recoveryVerification: verified, ...run }, null, 2));
    process.exitCode = runExitCode(run);
    return;
  }
  if (runId && has("--verify-normal")) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(runId)) { console.error("--run must be a TestRun UUID"); process.exit(2); }
    const verified = await request(`/api/v1/acceptance/v3/v3.3/runs/${encodeURIComponent(runId)}/verify-normal`, { method: "POST", body: JSON.stringify({ schemaVersion: "v3.3-normal-verify-command-v1", confirmation: "VERIFY_V33_NORMAL_RESULTS" }) });
    const run = await request(`/api/v1/acceptance/v3/v3.3/runs/${encodeURIComponent(runId)}`);
    if (verified.testRunId !== runId || verified.assertion?.id !== "V3.3_NORMAL_RESULTS_001" || run.testRunId !== runId || run.status !== "RUNNING" || run.evidence?.workflowStep !== "NORMAL_ASSERTION_VERIFIED") throw new Error("V3.3 normal results assertion was not persisted on the same TestRun");
    console.log(JSON.stringify({ normalVerification: verified, ...run }, null, 2));
    process.exitCode = runExitCode(run);
    return;
  }
  if (["normal", "rejection", "recovery"].includes(scenario)) {
    const created = await request("/api/v1/acceptance/v3/v3.3/runs", { method: "POST", body: JSON.stringify({ scenarioId: scenario, seed: Number(value("--seed") ?? 20260907), ...(value("--source-v31-run") ? { sourceV31TestRunId: value("--source-v31-run") } : {}), ...(value("--promotion-request") ? { promotionRequestId: value("--promotion-request") } : {}) }) });
    if (typeof created.testRunId !== "string") throw new Error("V3.3 readiness run creation returned no testRunId");
    if (has("--reserve-experiment")) await request(`/api/v1/acceptance/v3/v3.3/runs/${encodeURIComponent(created.testRunId)}/experiment`, { method: "POST", body: JSON.stringify({ schemaVersion: "v3.3-scenario-experiment-command-v1", confirmation: "CREATE_V33_FIXTURE_EXPERIMENT" }) });
    if (has("--dispatch-runner")) {
      if (!has("--reserve-experiment")) throw new Error("--dispatch-runner requires --reserve-experiment in the same command");
      await request(`/api/v1/acceptance/v3/v3.3/runs/${encodeURIComponent(created.testRunId)}/dispatch`, { method: "POST", body: JSON.stringify({ schemaVersion: "v3.3-scenario-dispatch-command-v1", confirmation: "DISPATCH_V33_FIXTURE_RUNNER" }) });
    }
    const run = await request(`/api/v1/acceptance/v3/v3.3/runs/${encodeURIComponent(created.testRunId)}`);
    console.log(JSON.stringify(run, null, 2));
    process.exit(runExitCode(run));
  }
  console.error("V3.3 supports --suite code, --scenario normal|rejection|recovery, --run RUN_ID --verify-rejection, --run RUN_ID --verify-recovery or --verify-normal after reconciliation, optional --reserve-experiment and --dispatch-runner for normal/recovery, --run RUN_ID --reconcile-runner-results after both jobs complete, or --run RUN_ID --check-only; these assertions do not complete human acceptance");
  process.exit(2);
}

async function main() {
  if (stage === "V3.4") return runV34Preflight();
  if (stage === "V3.1") return runV31Stage();
  if (stage === "V3.2") return runV32PreparationStage();
  if (stage === "V3.3") return runV33PreparationStage();
  if (stage.startsWith("V2.")) return runV2Stage();
  if (stage === 'V1.5') {
    if (value('--suite') === 'code') { for (const [command, commandArgs] of [["pnpm",["baseline:check"]],["pnpm",["build"]],["pnpm",["typecheck"]],["pnpm",["test"]]]) { const exitCode = runCommand(command, commandArgs); if (exitCode !== 0) process.exit(exitCode); } return; }
    if (runId && has('--check-only')) { const run = await request(`/api/v1/acceptance/v1/v1.5/runs/${runId}`); console.log(JSON.stringify(run,null,2)); process.exit(runExitCode(run)); }
    if (!['normal','rejection','recovery'].includes(scenario)) { console.error('specify --scenario normal|rejection|recovery, --suite code, or --run RUN_ID --check-only'); process.exit(2); }
    const accepted = await request('/api/v1/acceptance/v1/v1.5/runs', { method:'POST', body: JSON.stringify({ scenarioId: scenario, seed: Number(value('--seed') ?? 20260907) }) }); const run = await request(`/api/v1/acceptance/v1/v1.5/runs/${accepted.testRunId}`); console.log(JSON.stringify(run,null,2)); process.exit(runExitCode(run));
  }
  if (stage === 'V1.4') {
    if (value('--suite') === 'code') { for (const [command, commandArgs] of [["pnpm",["baseline:check"]],["pnpm",["build"]],["pnpm",["typecheck"]],["pnpm",["test"]]]) { const exitCode = runCommand(command, commandArgs); if (exitCode !== 0) process.exit(exitCode); } return; }
    if (runId && has('--check-only')) { const run = await request(`/api/v1/acceptance/v1/v1.4/runs/${runId}`); console.log(JSON.stringify(run,null,2)); process.exit(runExitCode(run)); }
    if (!['normal','rejection','recovery','market-restrictions','historical-fees'].includes(scenario)) { console.error('specify --scenario normal|rejection|recovery|market-restrictions|historical-fees, --suite code, or --run RUN_ID --check-only'); process.exit(2); }
    const policy = scenario === 'historical-fees' ? { initialCashCents: 1_000_000, targetQuantity: 100, participationRateBasisPoints: 100, slippageBasisPoints: 0, fixedFeeCents: 500, marketFeeSchedule: { scheduleId: 'CN_A_CASH_EQUITY_2022_04_29_TO_2023_08_27', commissionRatePartsPerBillion: 2_000_000, minimumCommissionCents: 500 }, sellOrder: { signalDate: '2023-08-24', executionDate: '2023-08-25', quantity: 100 } } : undefined;
    const accepted = await request('/api/v1/acceptance/v1/v1.4/runs', { method:'POST', body: JSON.stringify({ scenarioId: scenario, seed: Number(value('--seed') ?? 20260907), ...(policy ? { policy } : {}) }) }); const run = await request(`/api/v1/acceptance/v1/v1.4/runs/${accepted.testRunId}`); console.log(JSON.stringify(run,null,2)); process.exit(runExitCode(run));
  }
  if (stage === 'V1.3') {
    if (value('--suite') === 'code') {
      for (const [command, commandArgs] of [["pnpm",["baseline:check"]],["pnpm",["build"]],["pnpm",["typecheck"]],["pnpm",["test"]]]) { const exitCode = runCommand(command, commandArgs); if (exitCode !== 0) process.exit(exitCode); }
      return;
    }
    if (runId && has('--check-only')) { const run = await request(`/api/v1/acceptance/v1/v1.3/runs/${runId}`); console.log(JSON.stringify(run,null,2)); process.exit(runExitCode(run)); }
    if (!['normal','rejection','recovery'].includes(scenario)) { console.error('specify --scenario normal|rejection|recovery, --suite code, or --run RUN_ID --check-only'); process.exit(2); }
    const accepted = await request('/api/v1/acceptance/v1/v1.3/runs', { method:'POST', body: JSON.stringify({ scenarioId: scenario, seed: Number(value('--seed') ?? 20260907) }) });
    const run = await request(`/api/v1/acceptance/v1/v1.3/runs/${accepted.testRunId}`); console.log(JSON.stringify(run,null,2)); process.exit(runExitCode(run));
  }
  if (stage === 'V1.2') {
    if (value('--suite') === 'code') {
      for (const [command, commandArgs, commandEnv] of codeSuiteCommands(stage)) {
        console.log(`\n[V1.2 code suite] ${command} ${commandArgs.join(" ")}`);
        const exitCode = runCommand(command, commandArgs, commandEnv); if (exitCode !== 0) process.exit(exitCode);
      }
      return;
    }
    const marketUrl = process.env.STOCKQUANT_MARKET_DATA_URL ?? 'http://127.0.0.1:3002';
    const quantUrl = process.env.STOCKQUANT_QUANT_RESEARCH_URL ?? 'http://127.0.0.1:3003';
    if (runId && has('--check-only')) { const run = await request(`/api/v1/acceptance/v1/v1.2/runs/${runId}`); console.log(JSON.stringify({ checkOnly: true, stageId: stage, testRunId: runId, status: run.status, assertions: run.assertions }, null, 2)); process.exit(runExitCode(run)); }
    if (!['normal','rejection','recovery'].includes(scenario)) { console.error('specify --scenario normal|rejection|recovery, --suite code, or --run RUN_ID --check-only'); process.exit(2); }
    const serviceHeaders = platformMarketDataHeaders();
    const normal = await (await fetch(`${marketUrl}/v1/fixtures/normal/preview`, { headers: serviceHeaders })).json();
    const bad = await (await fetch(`${marketUrl}/v1/fixtures/bad-future/preview`, { headers: serviceHeaders })).json();
    const probe = await (await fetch(`${quantUrl}/v1/qlib/probe`, { headers: serviceHeaders })).json();
    const factor = await (await fetch(`${quantUrl}/v1/factors/preview`, { headers: serviceHeaders })).json();
    const assertions = scenario === 'normal'
      ? [{id:'V1.2-DATA-NORMAL-001',pass:normal.barCount===6&&normal.securityCount===2&&normal.quality.status==='READY'},{id:'V1.2-FACTOR-PREVIEW-001',pass:Array.isArray(factor.ranking)&&factor.ranking.length===2}]
      : scenario === 'rejection'
        ? [{id:'V1.2-DATA-PIT-001',pass:bad.quality.status==='REJECTED'&&bad.quality.errors.some((e)=>e.code==='FUTURE_DATA')}]
        : [{id:'V1.2-QLIB-PROBE-001',pass:probe.probe?.status==='READY'}];
    const result = {stageId:'V1.2',scenarioId:scenario,seed:Number(value('--seed')??20260907),status:assertions.every((a)=>a.pass)?'COMPLETED':'FAILED',dataVersion:'v1.2-market-data-1',qlib:probe.probe,artifacts:{normal, bad, factor}, assertions};
    console.log(JSON.stringify(result,null,2)); process.exit(result.status === 'COMPLETED' && assertions.length > 0 ? 0 : result.status === 'FAILED' ? 1 : 2);
  }
  if (value("--suite") === "code") {
    const commands = [
      ["pnpm", ["baseline:check"]],
      ["pnpm", ["build"]],
      ["pnpm", ["lint"]],
      ["pnpm", ["test"]],
      ["pnpm", ["test:contract"]]
    ];
    for (const [command, commandArgs] of commands) {
      const exitCode = runCommand(command, commandArgs);
      if (exitCode !== 0) process.exit(exitCode);
    }
    return;
  }
  if (runId && has("--check-only")) {
    const run = await request(`/api/v1/acceptance/runs/${runId}`);
    console.log(JSON.stringify({ checkOnly: true, testRunId: runId, status: run.status, assertions: run.assertions }, null, 2));
    process.exit(runExitCode(run));
  }
  if (!["normal", "rejection", "recovery"].includes(scenario)) {
    console.error("specify --scenario normal|rejection|recovery, --suite code, or --run RUN_ID --check-only");
    process.exit(2);
  }
  if (!process.env.STOCKQUANT_PLATFORM_API_URL) {
    console.error("V1.1 scenarios require an explicit STOCKQUANT_PLATFORM_API_URL; use pnpm test:integration:v11-stage-storage for an isolated end-to-end run");
    process.exit(2);
  }
  const accepted = await request("/api/v1/acceptance/v1/v1.1/runs", { method: "POST", body: JSON.stringify({ scenarioId: scenario, seed: Number(value("--seed") ?? 20260907) }) });
  let run = await waitForRun(accepted.testRunId);
  if (scenario === "recovery" && run.status === "WAITING") {
    const restarted = runCommand("docker", ["compose", "--env-file", ".env.local", "-f", "infra/compose/docker-compose.yml", "restart", "portfolio-risk-service"]);
    if (restarted !== 0) process.exit(restarted);
    for (let attempt = 0; attempt < 40; attempt += 1) {
      try {
        const ready = await fetch(`${baseUrl}/ready`);
        if (ready.ok) break;
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    await request(`/api/v1/acceptance/runs/${run.testRunId}/continue-recovery`, { method: "POST", body: "{}" });
    run = await waitForRun(run.testRunId);
  }
  console.log(JSON.stringify(run, null, 2));
  process.exit(runExitCode(run));
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});

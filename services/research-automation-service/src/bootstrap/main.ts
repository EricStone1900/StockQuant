import { createServer } from "node:http";
import { createHash, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { InMemoryExperimentRepository } from "../adapters/in-memory-experiment-repository.js";
import { PgExperimentRepository } from "../adapters/pg-experiment-repository.js";
import { PgBudgetLedger } from "../adapters/pg-budget-ledger.js";
import { PgArtifactRefRepository } from "../adapters/pg-artifact-ref-repository.js";
import { PgRunnerJobStore } from "../adapters/pg-runner-job-store.js";
import { decodeRunnerJobCursor, encodeRunnerJobCursor } from "../application/v33-queue-cursor.js";
import { BudgetLedger } from "../application/v31-runtime-guards.js";
import { ExperimentIdempotencyConflict, ExperimentService } from "../application/experiment-service.js";
import { sha256, validateArtifactRef, validateRunnerJob } from "../application/v31-runtime-guards.js";
import { evaluateModelGatewayPreflight } from "../application/v31-model-gateway-preflight.js";
import { ModelGatewayCoordinator } from "../application/v31-model-gateway.js";
import { FileArtifactStore } from "../adapters/file-artifact-content-store.js";
import { InMemoryRunnerJobStore, RunnerJobCoordinator, RunnerJobIdempotencyConflict, SystemRunnerClock } from "../application/v31-runner-jobs.js";
import { parseRunnerExecution } from "../application/v31-runner-executor.js";
import { loadResearchAutomationConfig } from "./config.js";
import { authorizeResearchServiceRequest, identifyResearchService } from "../application/v31-service-auth.js";
import { readLeasedRunnerInput } from "../application/v31-runner-input.js";
import { validateLeasedRunnerOutputPublication } from "../application/v31-runner-output.js";
import { rollbackUnreferencedArtifact } from "../application/v31-artifact-publication-cleanup.js";
import { V32PromotionRequestPreparer } from "../application/v32-promotion-preparation.js";
import { V32PromotionSubmissionService, createQuantPromotionSubmitter } from "../application/v32-promotion-submission.js";
import { createV31PromotionGateReader, V31GateUnavailableError } from "../application/v31-promotion-gate-client.js";
import { PgV32PromotionSubmissionJournal } from "../adapters/pg-v32-promotion-submission-journal.js";
import { validateExperimentDispatchBinding } from "../application/v33-experiment-dispatch-binding.js";
import { fixtureBudgetSettlementEnabled } from "../application/v31-fixture-budget-settlement.js";
import { PgResearchCheckpointRepository } from "../adapters/pg-research-checkpoint-repository.js";
import { ResearchCheckpointConflict } from "../domain/research-checkpoint.js";
import { ResearchCheckpointService } from "../application/research-checkpoint-service.js";
import { RunnerInputPreflightError, verifyRunnerInputBeforeDispatch } from "../application/v33-runner-input-preflight.js";

const port = Number(process.env.STOCKQUANT_PORT ?? 3008);
const config = loadResearchAutomationConfig();
const databasePool = process.env.STOCKQUANT_DATABASE_URL ? new Pool({ connectionString: process.env.STOCKQUANT_DATABASE_URL }) : null;
const repository = databasePool ? new PgExperimentRepository(databasePool) : new InMemoryExperimentRepository();
const budgetLedger = databasePool ? new PgBudgetLedger(databasePool, config.stageBudgetCents, config.maxExperimentBudgetCents, config.budgetWarningPercent, "V3.1", undefined, config.maxTestRunBudgetCents) : new BudgetLedger(config.stageBudgetCents, config.maxExperimentBudgetCents, config.budgetWarningPercent, undefined, config.maxTestRunBudgetCents);
if (repository instanceof PgExperimentRepository) await repository.initialize();
if (budgetLedger instanceof PgBudgetLedger) await budgetLedger.initialize();
const systemClock = new SystemRunnerClock();
const service = new ExperimentService(repository, systemClock, config.maxExperimentBudgetCents, budgetLedger);
const runnerJobStore = databasePool ? new PgRunnerJobStore(databasePool) : new InMemoryRunnerJobStore();
if (runnerJobStore instanceof PgRunnerJobStore) await runnerJobStore.initialize();
const runnerJobs = new RunnerJobCoordinator(runnerJobStore, systemClock);
const checkpointRepository = databasePool ? new PgResearchCheckpointRepository(databasePool) : null;
if (checkpointRepository) await checkpointRepository.initialize();
const checkpointService = checkpointRepository ? new ResearchCheckpointService(repository, checkpointRepository, systemClock) : null;
const artifactStore = new FileArtifactStore(process.env.STOCKQUANT_RESEARCH_ARTIFACT_ROOT ?? "/tmp/stockquant-research-artifacts");
const artifactRefs = databasePool ? new PgArtifactRefRepository(databasePool) : null;
if (artifactRefs) await artifactRefs.initialize();
const promotionPreparer = artifactRefs ? new V32PromotionRequestPreparer({
  experiment: { get: (experimentId) => service.get(experimentId) },
  runnerJob: { get: (jobId) => runnerJobs.get(jobId) },
  budget: { get: async (experimentId) => await budgetLedger.get(experimentId) as Awaited<ReturnType<PgBudgetLedger["get"]>> },
  artifactRefs: { get: (namespace, artifactId) => artifactRefs.get(namespace, artifactId) },
  artifactContent: { read: (ref) => artifactStore.read(ref) },
}) : null;
const promotionSubmissionJournal = databasePool ? new PgV32PromotionSubmissionJournal(databasePool) : null;
if (promotionSubmissionJournal) await promotionSubmissionJournal.initialize();
const modelGatewayPreflight = () => evaluateModelGatewayPreflight(config, {
  [config.chatCredentialRef]: process.env[config.chatCredentialRef],
  [config.embeddingCredentialRef]: process.env[config.embeddingCredentialRef],
});
const fixedFixtureGeneratedCode = `import json\nimport qlib\nfrom pathlib import Path\n\nmetrics = {"bars": 6, "fixtureId": "v3.1-research-small-sample-1", "qlibVersion": qlib.__version__, "return": 0.12}\nPath("/run/output/metrics.json").write_text(json.dumps(metrics, sort_keys=True))\nprint("fixed-fixture-research-complete")\n`;
const fixedFixtureRecoveryGeneratedCode = (testRunId: string) => `import json\nimport time\nimport qlib\nfrom pathlib import Path\n\ncheckpoint_path = Path("/run/input/checkpoint.json")\nprevious = json.loads(checkpoint_path.read_text()) if checkpoint_path.exists() else None\nsequence = int(previous["sequence"]) + 1 if previous else 1\ncursor = int(previous["state"]["cursor"]) if previous else 0\ncheckpoint = {"schemaVersion":"v3.3-research-checkpoint-v1","testRunId":${JSON.stringify(testRunId)},"roundIndex":1,"sequence":sequence,"state":{"cursor":cursor + 1}}\ntemporary = Path("/run/output/checkpoint.json.tmp")\ntemporary.write_text(json.dumps(checkpoint, sort_keys=True))\ntemporary.replace("/run/output/checkpoint.json")\ntime.sleep(45 if sequence == 1 else 12)\nmetrics = {"bars":6,"fixtureId":"v3.1-research-small-sample-1","qlibVersion":qlib.__version__,"return":0.12,"recovery":{"resumedFromSequence":sequence - 1,"checkpointSequence":sequence,"cursor":cursor + 1}}\nPath("/run/output/metrics.json").write_text(json.dumps(metrics, sort_keys=True))\nprint("fixed-fixture-checkpoint-recovery-complete")\n`;
const fixtureUsageEvidence = { provider: "FIXTURE", model: "v3.1-model-response-fixed-v1", requestId: "fixture-request-1", inputTokens: 12, outputTokens: 8, tariffVersion: null, costBasis: "FIXTURE" as const, invoiceReconciliation: "NOT_PERFORMED" as const };
const fixtureEmbeddingUsageEvidence = { provider: "FIXTURE", model: "stockquant-fixture-embedding-v1", requestId: "fixture-embedding-request-1", inputTokens: 4, outputTokens: 0, tariffVersion: null, costBasis: "FIXTURE" as const, invoiceReconciliation: "NOT_PERFORMED" as const };
const modelGatewayFixtureEnabled = fixtureBudgetSettlementEnabled(process.env);
  const modelGatewayFixture = modelGatewayFixtureEnabled ? new ModelGatewayCoordinator(budgetLedger, {
  async complete(payload) {
    const input = payload as { scenario: "COMPLETED" | "TIMEOUT" | "OVER_BUDGET"; requestedCents: number; operation?: string; inputTokens?: number; runnerScenario?: "NORMAL" | "CHECKPOINT_RECOVERY"; testRunId?: string };
    const generatedCode = input.runnerScenario === "CHECKPOINT_RECOVERY" && input.testRunId ? fixedFixtureRecoveryGeneratedCode(input.testRunId) : fixedFixtureGeneratedCode;
    if (input.scenario === "TIMEOUT") throw new Error("fixed fixture simulates an uncertain provider timeout");
    if (input.scenario === "OVER_BUDGET") return { response: { fixtureId: "v3.1-model-response-fixed-v1", content: "deterministic fixture response", generatedCode }, costCents: input.requestedCents + 1, evidence: fixtureUsageEvidence };
    if (input.operation === "EMBEDDING") return { response: { fixtureId: "stockquant-fixture-embedding-v1" }, costCents: 23, evidence: { ...fixtureEmbeddingUsageEvidence, inputTokens: input.inputTokens ?? 4 } };
    return { response: { fixtureId: "v3.1-model-response-fixed-v1", content: "deterministic fixture response", generatedCode }, costCents: 23, evidence: fixtureUsageEvidence };
  },
}, () => ({ ready: true })) : null;
const json = (res: import("node:http").ServerResponse, status: number, body: unknown) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };

const server = createServer(async (req, res) => {
  if (req.url === "/live") return json(res, 200, { status: "live", service: "research-automation-service" });
  if (req.url === "/ready") return json(res, 200, {
    status: "ready",
    service: "research-automation-service",
    environmentMode: config.environmentMode,
    brokerMode: config.brokerMode,
    runner: config.runnerMode,
    modelGateway: config.modelGatewayMode,
    model: { provider: config.chatProvider, name: config.chatModel, baseUrl: config.chatBaseUrl, credentialRef: config.chatCredentialRef },
    embedding: { provider: config.embeddingProvider, name: config.embeddingModel, dimensions: config.embeddingDimensions, baseUrl: config.embeddingBaseUrl, credentialRef: config.embeddingCredentialRef },
    outboundPolicy: config.outboundPolicy,
    execution: { budgetCurrency: config.budgetCurrency, defaultRounds: config.defaultRounds, maxRounds: config.maxRounds, defaultBudgetCents: config.defaultBudgetCents, maxExperimentBudgetCents: config.maxExperimentBudgetCents, maxTestRunBudgetCents: config.maxTestRunBudgetCents, stageBudgetCents: config.stageBudgetCents, budgetWarningPercent: config.budgetWarningPercent, workerConcurrency: config.workerConcurrency },
    prerequisiteStatus: config.prerequisiteStatus,
    budgetPersistence: databasePool ? "POSTGRES" : "MEMORY",
    modelGatewayPreflight: modelGatewayPreflight(),
    authenticatedServiceIdentities: Object.keys(config.trustedServiceTokens)
  });
    if (req.url?.startsWith("/v1/")) {
    const result = authorizeResearchServiceRequest({
      method: req.method ?? "GET",
      url: req.url,
      serviceId: Array.isArray(req.headers["x-stockquant-service-id"]) ? undefined : req.headers["x-stockquant-service-id"],
      authorization: Array.isArray(req.headers.authorization) ? undefined : req.headers.authorization,
      credentials: config.trustedServiceTokens,
    });
    if (result !== "AUTHORIZED") return json(res, result === "NOT_CONFIGURED" ? 503 : result === "FORBIDDEN" ? 403 : 401, { error: result.toLowerCase() });
  }
  let raw = "";
  let requestBytes = 0;
  for await (const chunk of req) {
    requestBytes += Buffer.byteLength(chunk);
    if (requestBytes > 12 * 1024 * 1024) return json(res, 413, { error: "request body exceeds 12 MiB preparation limit" });
    raw += chunk;
  }
  try {
    if (req.method === "POST" && req.url === "/v1/runner/budgets/test-run/limit") {
      if (!(budgetLedger instanceof PgBudgetLedger)) return json(res, 503, { error: "per-TestRun budget limits require persistent PostgreSQL storage" });
      const body = JSON.parse(raw) as { schemaVersion?: unknown; testRunId?: unknown; budgetCents?: unknown };
      const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
      if (!body || typeof body !== "object" || Array.isArray(body)
        || Object.keys(body).some((key) => !["schemaVersion", "testRunId", "budgetCents"].includes(key))
        || body.schemaVersion !== "v3.3-test-run-budget-limit-command-v1"
        || typeof body.testRunId !== "string" || !uuid.test(body.testRunId)
        || !Number.isSafeInteger(body.budgetCents) || Number(body.budgetCents) < 1) {
        return json(res, 422, { error: "only schemaVersion, a valid testRunId UUID, and a positive integer budgetCents are accepted" });
      }
      try {
        const budgetCents = await budgetLedger.configureTestRunBudget(body.testRunId, Number(body.budgetCents));
        return json(res, 200, { schemaVersion: "v3.3-test-run-budget-limit-v1", testRunId: body.testRunId, budgetCents, status: "CONFIGURED" });
      } catch (error) {
        const message = error instanceof Error ? error.message : "TestRun budget limit could not be configured";
        const status = message.includes("invalid") ? 422 : 409;
        return json(res, status, { error: message });
      }
    }
    if (req.method === "POST" && req.url === "/v1/experiments") {
      const result = await service.create(JSON.parse(raw));
      const budget = await budgetLedger.get(result.experiment.experimentId);
      return json(res, result.existing ? 200 : 202, { ...result.experiment, budget });
    }
    if (req.method === "POST" && req.url === "/v1/promotions/prepare") {
      if (!promotionPreparer) return json(res, 503, { status: "WAITING", error: "PromotionRequest preparation requires PostgreSQL-backed research records and ArtifactRefs" });
      const body = JSON.parse(raw) as { testRunId?: unknown; experimentId?: unknown };
      const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
      if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => !["testRunId", "experimentId"].includes(key))
        || typeof body.testRunId !== "string" || !uuid.test(body.testRunId) || typeof body.experimentId !== "string" || !uuid.test(body.experimentId)) {
        return json(res, 422, { error: "only valid testRunId and experimentId UUIDs are accepted" });
      }
      const result = await promotionPreparer.prepare(body.testRunId, body.experimentId);
      return json(res, result.status === "WAITING" ? 202 : 200, result);
    }
    if (req.method === "POST" && req.url === "/v1/promotions/submit") {
      if (!promotionPreparer || !promotionSubmissionJournal) return json(res, 503, { status: "WAITING", error: "PromotionRequest submission requires PostgreSQL-backed preparation and journal" });
      const body = JSON.parse(raw) as { testRunId?: unknown; experimentId?: unknown };
      const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
      if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => !["testRunId", "experimentId"].includes(key))
        || typeof body.testRunId !== "string" || !uuid.test(body.testRunId) || typeof body.experimentId !== "string" || !uuid.test(body.experimentId)) return json(res, 422, { error: "only valid testRunId and experimentId UUIDs are accepted" });
      const token = process.env.STOCKQUANT_SERVICE_TOKEN_RESEARCH_AUTOMATION ?? "";
      const submitter = createQuantPromotionSubmitter({ baseUrl: process.env.STOCKQUANT_QUANT_RESEARCH_URL ?? "http://quant-research-service:3003", bearerToken: token });
      const gateReader = createV31PromotionGateReader({ platformBaseUrl: process.env.STOCKQUANT_PLATFORM_API_URL ?? "http://platform-api-service:3000", bearerToken: token });
      const submission = new V32PromotionSubmissionService({
        prepare: (testRunId, experimentId) => promotionPreparer.prepare(testRunId, experimentId),
        getV31Gate: gateReader,
        journal: promotionSubmissionJournal,
        submitToQuant: submitter,
      });
      const result = await submission.submit(body.testRunId, body.experimentId);
      const statusCode = result.status === "SUBMITTED" ? 201 : result.status === "SUBMISSION_UNKNOWN" ? 202 : 200;
      return json(res, statusCode, result);
    }
    if (req.method === "POST" && req.url === "/v1/runner/jobs/validate") {
      validateRunnerJob(JSON.parse(raw));
      return json(res, 200, { status: "VALID", execution: "NOT_STARTED", runner: config.runnerMode });
    }
    if (req.method === "POST" && req.url === "/v1/runner/jobs") {
      const job = JSON.parse(raw) as import("../application/v31-runtime-guards.js").RunnerJob;
      validateRunnerJob(job);
      const body = job;
      const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
      if (!body || typeof body !== "object" || Array.isArray(body) || typeof body.testRunId !== "string" || !uuid.test(body.testRunId) || typeof body.experimentId !== "string" || !uuid.test(body.experimentId)) return json(res, 422, { error: "Runner dispatch requires UUID testRunId and experimentId values" });
      const experiment = await service.get(body.experimentId);
      const reservation = experiment ? await budgetLedger.get?.(experiment.experimentId) as { status?: string } | null : null;
      const binding = validateExperimentDispatchBinding(body.testRunId, experiment, reservation?.status ?? null, job.roundIndex);
      if (binding.status === "EXPERIMENT_NOT_FOUND") return json(res, 404, { error: "experiment not found" });
      if (binding.status === "TEST_RUN_MISMATCH") return json(res, 409, { error: "Runner testRunId does not match the experiment's durable TestRun binding" });
      if (binding.status === "ROUND_REQUIRED") return json(res, 422, { error: "Runner dispatch requires an explicit roundIndex for a multi-round experiment" });
      if (binding.status === "ROUND_MISMATCH") return json(res, 409, { error: "Runner roundIndex does not match an allocated Experiment budget tranche" });
      if (binding.status === "BUDGET_NOT_RESERVED") return json(res, 409, { error: "Runner dispatch requires a RESERVED experiment budget" });
      if (artifactRefs) await verifyRunnerInputBeforeDispatch(job, artifactRefs, artifactStore);
      const record = await runnerJobs.submit(job);
      return json(res, 202, { ...record, execution: "NOT_STARTED", prerequisiteStatus: config.prerequisiteStatus });
    }
    if (req.method === "GET" && req.url?.startsWith("/v1/runner/jobs/cursor?")) {
      const url = new URL(req.url, "http://research-automation.local");
      const testRunId = url.searchParams.get("testRunId") ?? "";
      const rawCursor = url.searchParams.get("afterCursor");
      const limit = Number(url.searchParams.get("limit") ?? "50");
      const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
      const after = rawCursor === null ? null : decodeRunnerJobCursor(rawCursor);
      if ([...url.searchParams.keys()].some((key) => !["testRunId", "afterCursor", "limit"].includes(key))
        || url.searchParams.getAll("testRunId").length !== 1 || url.searchParams.getAll("afterCursor").length > 1 || url.searchParams.getAll("limit").length > 1
        || !uuid.test(testRunId) || (rawCursor !== null && !after) || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) return json(res, 422, { error: "testRunId UUID, valid optional afterCursor, and bounded limit are required" });
      const jobs = await runnerJobs.listAfterTestRun(testRunId, after, limit + 1);
      const page = jobs.slice(0, limit);
      return json(res, 200, {
        schemaVersion: "v3.3-runner-cursor-queue-v1", testRunId, afterCursor: rawCursor, limit,
        jobs: page, hasMore: jobs.length > limit,
        nextAfterCursor: jobs.length > limit && page.length ? encodeRunnerJobCursor({ submittedAt: page[page.length - 1].submittedAt, jobId: page[page.length - 1].jobId }) : null,
      });
    }
    if (req.method === "GET" && req.url?.startsWith("/v1/runner/jobs?")) {
      const url = new URL(req.url, "http://research-automation.local");
      const testRunId = url.searchParams.get("testRunId") ?? "";
      const offset = Number(url.searchParams.get("offset") ?? "0");
      const limit = Number(url.searchParams.get("limit") ?? "50");
      const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
      if ([...url.searchParams.keys()].some((key) => !["testRunId", "offset", "limit"].includes(key))
        || url.searchParams.getAll("testRunId").length !== 1 || url.searchParams.getAll("offset").length > 1 || url.searchParams.getAll("limit").length > 1 || !uuid.test(testRunId)
        || !Number.isSafeInteger(offset) || offset < 0
        || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) return json(res, 422, { error: "testRunId UUID and bounded offset/limit are required" });
      const jobs = await runnerJobs.listForTestRun(testRunId, offset, limit + 1);
      return json(res, 200, { schemaVersion: "v3.3-runner-queue-v1", testRunId, offset, limit, jobs: jobs.slice(0, limit), hasMore: jobs.length > limit });
    }
    if (req.method === "GET" && req.url?.startsWith("/v1/runner/budgets/test-run?")) {
      if (!(budgetLedger instanceof PgBudgetLedger)) return json(res, 503, { error: "complete TestRun budget summary requires PostgreSQL persistence" });
      const url = new URL(req.url, "http://research-automation.local");
      const testRunId = url.searchParams.get("testRunId") ?? "";
      const offset = url.searchParams.has("offset") ? Number(url.searchParams.get("offset")) : 0;
      const limit = url.searchParams.has("limit") ? Number(url.searchParams.get("limit")) : 50;
      const afterCursor = url.searchParams.get("afterCursor");
      const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
      if ([...url.searchParams.keys()].some((key) => !["testRunId", "offset", "limit", "afterCursor"].includes(key)) || [...url.searchParams.keys()].some((key) => url.searchParams.getAll(key).length !== 1)
        || !uuid.test(testRunId) || !Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100 || (afterCursor !== null && offset !== 0) || (afterCursor !== null && afterCursor.length > 512)) return json(res, 422, { error: "testRunId UUID and bounded pagination are required" });
      const summary = await budgetLedger.snapshotForTestRun(testRunId, offset, limit, afterCursor);
      return json(res, 200, { schemaVersion: "v3.3-test-run-budget-summary-v1", testRunId, ...summary,
        accountingScope: "unique experiments bound to this TestRun; model-call attempts are counted once; no provider invoice reconciliation",
        stageBudgetControl: "TEST_RUN_AND_ROUND_CAP_ENFORCED",
      });
    }
    if (req.method === "GET" && req.url?.startsWith("/v1/runner/budgets?")) {
      const url = new URL(req.url, "http://research-automation.local");
      const allowed = new Set(["testRunId", "offset", "limit"]);
      const testRunId = url.searchParams.get("testRunId") ?? "";
      const offset = url.searchParams.has("offset") ? Number(url.searchParams.get("offset")) : 0;
      const limit = url.searchParams.has("limit") ? Number(url.searchParams.get("limit")) : 50;
      const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
      if ([...url.searchParams.keys()].some((key) => !allowed.has(key)) || [...allowed].some((key) => url.searchParams.getAll(key).length > 1)
        || !uuid.test(testRunId) || !Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) return json(res, 422, { error: "testRunId UUID and bounded offset/limit are required" });
      const jobs = await runnerJobs.listForTestRun(testRunId, offset, limit + 1);
      const page = jobs.slice(0, limit);
      const experimentIds = [...new Set(page.map((record) => record.job.experimentId))];
      const snapshots = await budgetLedger.snapshot(experimentIds);
      const byExperiment = new Map(snapshots.map((snapshot) => [snapshot.experimentId, snapshot]));
      const rows = page.map(({ job, jobId }) => {
        const snapshot = byExperiment.get(job.experimentId);
        return snapshot ? {
          jobId,
          experimentId: job.experimentId,
          requestedCents: snapshot.requestedCents,
          reservedCents: snapshot.reservedCents,
          settledCents: snapshot.status === "SETTLED" ? snapshot.spentCents : snapshot.modelCallSettledCents,
          unknownReservedCents: Math.max(snapshot.status === "UNKNOWN" ? snapshot.reservedCents : 0, snapshot.modelCallUnknownReservedCents),
          status: snapshot.status,
          source: databasePool ? "POSTGRES_LEDGER" : "IN_MEMORY_LEDGER",
        } : { jobId, experimentId: job.experimentId, status: "NOT_FOUND" as const, source: "LEDGER" as const };
      });
      return json(res, 200, {
        schemaVersion: "v3.3-runner-budget-v1", testRunId, offset, limit, rows, hasMore: jobs.length > limit,
        coverage: { jobsOnPage: page.length, experimentsOnPage: experimentIds.length, budgetsFound: snapshots.length, budgetsMissing: experimentIds.length - snapshots.length },
        note: "Per-page job-linked ledger facts for this TestRun; retries may repeat an experiment and rows must not be summed. This is not a provider invoice or complete stage-wide budget.",
      });
    }
    if (req.method === "POST" && req.url === "/v1/runner/jobs/claim") {
      const body = JSON.parse(raw) as { workerId?: unknown; testRunId?: unknown };
      if (typeof body.workerId !== "string" || !/^[A-Za-z0-9._-]{1,128}$/.test(body.workerId)) return json(res, 422, { error: "valid workerId is required" });
      if (body.testRunId !== undefined && (typeof body.testRunId !== "string" || body.testRunId.length < 1 || body.testRunId.length > 128)) return json(res, 422, { error: "testRunId must be a non-empty string up to 128 characters" });
      const record = await runnerJobs.claim(body.workerId, undefined, 30_000, body.testRunId as string | undefined);
      return json(res, 200, record ? { ...record, claimStatus: "LEASED" } : { status: "NO_WORK" });
    }
    if (req.method === "GET" && req.url?.startsWith("/v1/runner/checkpoints?")) {
      const url = new URL(req.url, "http://research-automation.local");
      const testRunId = url.searchParams.get("testRunId") ?? "";
      const experimentId = url.searchParams.get("experimentId") ?? "";
      const roundIndex = Number(url.searchParams.get("roundIndex"));
      const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
      if ([...url.searchParams.keys()].some((key) => !["testRunId", "experimentId", "roundIndex"].includes(key))
        || url.searchParams.getAll("testRunId").length !== 1 || url.searchParams.getAll("experimentId").length !== 1 || url.searchParams.getAll("roundIndex").length !== 1
        || !uuid.test(testRunId) || !uuid.test(experimentId) || !Number.isSafeInteger(roundIndex) || roundIndex < 1 || roundIndex > 3) return json(res, 422, { error: "TestRun UUID, Experiment UUID, and roundIndex 1..3 are required" });
      if (!checkpointService) return json(res, 503, { error: "persistent checkpoint store is not configured" });
      try {
        const checkpoints = await checkpointService.list(testRunId, experimentId, roundIndex);
        return json(res, 200, { schemaVersion: "v3.3-runner-checkpoint-history-v1", testRunId, experimentId, roundIndex, checkpoints });
      } catch (error) {
        if (error instanceof ResearchCheckpointConflict) return json(res, error.statusCode, { error: error.message });
        throw error;
      }
    }
    const checkpointAction = req.url?.match(/^\/v1\/runner\/jobs\/([^/]+)\/checkpoint(?:\/(read))?$/);
    if (checkpointAction && req.method === "POST") {
      const jobId = decodeURIComponent(checkpointAction[1]);
      const body = JSON.parse(raw) as { workerId?: unknown; fencingToken?: unknown; schemaVersion?: unknown; testRunId?: unknown; roundIndex?: unknown; sequence?: unknown; state?: unknown };
      if (typeof body.workerId !== "string" || !/^[A-Za-z0-9._-]{1,128}$/u.test(body.workerId)
        || !Number.isSafeInteger(body.fencingToken) || Number(body.fencingToken) < 1) {
        return json(res, 422, { error: "workerId and positive integer fencingToken are required" });
      }
      if (!checkpointService) return json(res, 503, { error: "persistent checkpoint store is not configured" });
      const current = await runnerJobs.get(jobId);
      const lease = current?.lease;
      const activeLease = current?.status === "RUNNING" && lease?.workerId === body.workerId
        && lease.fencingToken === body.fencingToken && Date.parse(lease.expiresAt) > systemClock.now().getTime();
      if (!current || !activeLease) return json(res, 409, { error: "lease lost, expired, or cancelled" });
      if (checkpointAction[2] === "read") {
        const latest = await checkpointService.latest(current.job.testRunId, current.job.experimentId, current.job.roundIndex ?? 1);
        return json(res, 200, { status: latest ? "FOUND" : "EMPTY", checkpoint: latest });
      }
      if (body.testRunId !== current.job.testRunId || body.roundIndex !== (current.job.roundIndex ?? 1)) {
        return json(res, 409, { error: "checkpoint TestRun or round does not match the leased Runner Job" });
      }
      const input = {
        schemaVersion: body.schemaVersion,
        testRunId: body.testRunId,
        roundIndex: body.roundIndex,
        sequence: body.sequence,
        state: body.state,
      };
      const result = await checkpointService.append(current.job.experimentId, input);
      return json(res, 200, { status: "PERSISTED", checkpoint: result.checkpoint, stateSha256: result.checkpoint.stateSha256, sequence: result.checkpoint.sequence, existing: result.existing, createdAt: result.checkpoint.createdAt });
    }
    const inputAction = req.url?.match(/^\/v1\/runner\/jobs\/([^/]+)\/input$/);
    if (inputAction && req.method === "POST") {
      const body = JSON.parse(raw) as { workerId?: unknown; fencingToken?: unknown };
      if (typeof body.workerId !== "string" || !Number.isSafeInteger(body.fencingToken)) return json(res, 422, { error: "workerId and integer fencingToken are required" });
      if (!artifactRefs) return json(res, 404, { error: "published runner input artifact not found" });
      const result = await readLeasedRunnerInput({
        record: await runnerJobs.get(decodeURIComponent(inputAction[1])),
        workerId: body.workerId,
        fencingToken: body.fencingToken as number,
        now: new Date(),
        store: {
          get: (namespace, artifactId) => artifactRefs.get(namespace, artifactId),
          size: (ref) => artifactStore.size(ref),
          read: (ref) => artifactStore.read(ref),
        },
      });
      return result ? json(res, 200, { ref: result.ref, contentBase64: Buffer.from(result.content).toString("base64") }) : json(res, 409, { error: "lease lost, input unavailable, or input identity invalid" });
    }
    const heartbeatAction = req.url?.match(/^\/v1\/runner\/jobs\/([^/]+)\/heartbeat$/);
    if (heartbeatAction && req.method === "POST") {
      const body = JSON.parse(raw) as { workerId?: unknown; fencingToken?: unknown };
      if (typeof body.workerId !== "string" || !Number.isSafeInteger(body.fencingToken)) return json(res, 422, { error: "workerId and integer fencingToken are required" });
      const record = await runnerJobs.heartbeat(decodeURIComponent(heartbeatAction[1]), body.workerId, body.fencingToken as number);
      return record ? json(res, 200, { ...record, claimStatus: "LEASED" }) : json(res, 409, { error: "lease lost or expired" });
    }
    const runnerAction = req.url?.match(/^\/v1\/runner\/jobs\/([^/]+)\/(start|complete|retry|cancel)$/);
    if (runnerAction && req.method === "POST") {
      const jobId = decodeURIComponent(runnerAction[1]);
      const current = await runnerJobs.get(jobId);
      if (!current) return json(res, 404, { error: "runner job not found" });
      let record;
      if (runnerAction[2] === "start") {
        return json(res, 410, { error: "start is replaced by atomic claim" });
      } else if (runnerAction[2] === "cancel") {
        if (current.status === "CANCELLED") return json(res, 200, { ...current, execution: current.execution ?? "NOT_STARTED", prerequisiteStatus: config.prerequisiteStatus });
        record = await runnerJobs.cancel(jobId);
        if (!record) return json(res, 409, { error: "runner job is already terminal or cannot be cancelled" });
      } else if (runnerAction[2] === "retry") {
        record = await runnerJobs.retry(jobId);
      } else {
        const body = JSON.parse(raw) as { execution?: unknown; artifacts?: unknown; workerId?: unknown; fencingToken?: unknown };
        if (typeof body.workerId !== "string" || !Number.isSafeInteger(body.fencingToken)) return json(res, 422, { error: "workerId and integer fencingToken are required" });
        if (body.artifacts !== undefined && !Array.isArray(body.artifacts)) throw new Error("runner artifacts must be an array");
        const artifactRequests = (body.artifacts ?? []).map((ref) => {
          const typedRef = ref as Parameters<typeof validateArtifactRef>[0];
          validateArtifactRef(typedRef);
          if (typedRef.namespace !== current.job.outputNamespace) throw new Error("runner artifact namespace must match the job output namespace");
          return typedRef;
        });
        const artifacts = [];
        for (const ref of artifactRequests) {
          validateLeasedRunnerOutputPublication({ record: current, jobId, workerId: body.workerId, fencingToken: body.fencingToken as number, now: new Date(), ref });
          if (artifactRefs) {
            const persisted = await artifactRefs.get(ref.namespace, ref.artifactId);
            if (!persisted || persisted.status !== "PUBLISHED" || persisted.kind !== ref.kind || persisted.sha256 !== ref.sha256 || persisted.sourceRef !== ref.sourceRef) throw new Error("runner output artifact must match its published immutable reference");
            artifacts.push(persisted);
          } else artifacts.push({ ...ref, status: "PUBLISHED" as const });
        }
        record = await runnerJobs.complete(jobId, body.workerId, body.fencingToken as number, parseRunnerExecution(body.execution), artifacts);
        if (!record) return json(res, 409, { error: "lease lost or expired" });
      }
      return json(res, 200, { ...record, execution: record.execution ?? "NOT_STARTED", prerequisiteStatus: config.prerequisiteStatus });
    }
    const runnerMatch = req.url?.match(/^\/v1\/runner\/jobs\/([^/]+)$/);
    if (runnerMatch && req.method === "GET") {
      const record = await runnerJobs.get(decodeURIComponent(runnerMatch[1]));
      return record ? json(res, 200, record) : json(res, 404, { error: "runner job not found" });
    }
    if (req.method === "POST" && req.url === "/v1/artifacts/validate") {
      validateArtifactRef(JSON.parse(raw));
      return json(res, 200, { status: "VALID", persisted: false, reason: "validation-only boundary" });
    }
    if (req.method === "POST" && req.url === "/v1/artifacts/publish") {
      const body = JSON.parse(raw) as { ref?: unknown; contentBase64?: unknown; jobId?: unknown; workerId?: unknown; fencingToken?: unknown };
      if (!body.ref || typeof body.contentBase64 !== "string") return json(res, 422, { error: "ref and contentBase64 are required" });
      const content = Buffer.from(body.contentBase64, "base64");
      if (content.byteLength > 8 * 1024 * 1024) return json(res, 422, { error: "artifact exceeds 8 MiB preparation limit" });
      const caller = identifyResearchService(Array.isArray(req.headers.authorization) ? undefined : req.headers.authorization, config.trustedServiceTokens);
      if (caller === "runner-host") {
        if (typeof body.jobId !== "string" || typeof body.workerId !== "string" || !Number.isSafeInteger(body.fencingToken)) return json(res, 422, { error: "Runner output publication requires jobId, workerId, and fencingToken" });
        const ref = body.ref as Parameters<typeof validateArtifactRef>[0];
        validateArtifactRef(ref);
        if (!(runnerJobStore instanceof PgRunnerJobStore) || !artifactRefs) return json(res, 503, { error: "Runner output publication requires the persistent lease store" });
        const publicationNow = new Date();
        const currentJob = await runnerJobs.get(body.jobId);
        const currentLease = currentJob?.lease;
        if (!currentJob || currentJob.status !== "RUNNING" || !currentLease || currentLease.workerId !== body.workerId || currentLease.fencingToken !== body.fencingToken || Date.parse(currentLease.expiresAt) <= publicationNow.getTime()) {
          return json(res, 409, { error: "runner lease lost, expired, or cancelled" });
        }
        try { validateLeasedRunnerOutputPublication({ record: currentJob, jobId: body.jobId, workerId: body.workerId, fencingToken: body.fencingToken as number, now: publicationNow, ref }); }
        catch (error) { return json(res, 422, { error: error instanceof Error ? error.message : "Runner output reference is invalid" }); }
        let stagedRef: Awaited<ReturnType<FileArtifactStore["publish"]>> | undefined;
        try {
          const result = await runnerJobStore.publishOutputArtifact({
            jobId: body.jobId,
            workerId: body.workerId,
            fencingToken: body.fencingToken as number,
            now: publicationNow,
            artifact: ref,
            persist: async (client) => {
              stagedRef = await artifactStore.publish(ref, content);
              return artifactRefs.saveWithinTransaction(client, stagedRef);
            },
          });
          if (!result.published) return json(res, 409, { error: "runner lease lost, expired, or cancelled" });
          return json(res, 201, { status: "PUBLISHED", persisted: true, ref: result.value });
        } catch (error) {
          if (stagedRef) {
            const rollbackStatus = await rollbackUnreferencedArtifact({
              ref: stagedRef,
              readPersistedRef: (ref) => artifactRefs.get(ref.namespace, ref.artifactId),
              removeBytes: (ref) => artifactStore.remove(ref),
            });
            if (rollbackStatus !== "REMOVED_UNREFERENCED") {
              console.warn(JSON.stringify({ event: "runner_artifact_rollback_preserved", namespace: stagedRef.namespace, artifactId: stagedRef.artifactId, status: rollbackStatus }));
            }
          }
          throw error;
        }
      }
      const ref = await artifactStore.publish(body.ref as Parameters<typeof validateArtifactRef>[0], content);
      await artifactRefs?.save(ref);
      return json(res, 201, { status: "PUBLISHED", persisted: true, ref });
    }
    if (req.method === "POST" && req.url === "/v1/artifacts/read") {
      const body = JSON.parse(raw) as { namespace?: unknown; artifactId?: unknown };
      if (typeof body.namespace !== "string" || typeof body.artifactId !== "string") return json(res, 422, { error: "namespace and artifactId are required" });
      const ref = await artifactRefs?.get(body.namespace, body.artifactId);
      if (!ref || ref.status !== "PUBLISHED") return json(res, 404, { error: "published artifact not found" });
      if (await artifactStore.size(ref) > 8 * 1024 * 1024) return json(res, 413, { error: "artifact exceeds 8 MiB read limit" });
      const content = await artifactStore.read(ref);
      if (sha256(content) !== ref.sha256) return json(res, 409, { error: "stored artifact hash does not match its immutable reference" });
      return json(res, 200, { ref, contentBase64: Buffer.from(content).toString("base64") });
    }
    const candidateArtifactMatch = req.url?.match(/^\/v1\/promotions\/([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/candidate-artifact$/iu);
    if (req.method === "GET" && candidateArtifactMatch) {
      if (!promotionSubmissionJournal || !artifactRefs) return json(res, 503, { error: "candidate retrieval requires persistent submission and artifact records" });
      const promotionRequestId = candidateArtifactMatch[1];
      const request = await promotionSubmissionJournal.getSubmittedRequest(promotionRequestId);
      if (!request) return json(res, 404, { error: "submitted PromotionRequest not found" });
      const ref = await artifactRefs.get(request.candidateArtifact.namespace, request.candidateArtifact.artifactId);
      const expectedNamespace = `research/${request.testRunId}/${request.experimentId}/outputs`;
      if (!ref || ref.status !== "PUBLISHED" || ref.kind !== "OUTPUT" || ref.namespace !== expectedNamespace || ref.sha256 !== request.candidateArtifact.sha256
        || !new RegExp(`^runner:${request.testRunId}:${request.experimentId}:fence:[1-9][0-9]*$`, "u").test((ref as { sourceRef: string }).sourceRef)) return json(res, 409, { error: "candidate artifact does not match its submitted immutable request" });
      if (await artifactStore.size(ref) > 8 * 1024 * 1024) return json(res, 413, { error: "candidate artifact exceeds 8 MiB validation limit" });
      const content = await artifactStore.read(ref);
      if (sha256(content) !== ref.sha256) return json(res, 409, { error: "stored candidate hash does not match its immutable reference" });
      return json(res, 200, { schemaVersion: "v3.2-candidate-artifact-result-v1", promotionRequestId, ref, contentBase64: Buffer.from(content).toString("base64") });
    }
    if (req.method === "GET" && req.url === "/v1/model-gateway/preflight") {
      return json(res, 200, modelGatewayPreflight());
    }
    if (req.method === "POST" && req.url === "/v1/model-gateway/fixture-call") {
      if (!modelGatewayFixture) return json(res, 404, { error: "model gateway fixture is available only in explicit test mode" });
      const body = JSON.parse(raw) as { experimentId?: unknown; modelRunId?: unknown; requestedCents?: unknown; roundIndex?: unknown; scenario?: unknown; runnerScenario?: unknown };
      if (typeof body.experimentId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(body.experimentId)
        || typeof body.modelRunId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(body.modelRunId)
        || !Number.isSafeInteger(body.requestedCents) || Number(body.requestedCents) < 1 || Number(body.requestedCents) > config.maxExperimentBudgetCents
        || (body.roundIndex !== undefined && (!Number.isInteger(body.roundIndex) || Number(body.roundIndex) < 1 || Number(body.roundIndex) > config.maxRounds))
        || !["COMPLETED", "TIMEOUT", "OVER_BUDGET"].includes(String(body.scenario))
        || (body.runnerScenario !== undefined && !["NORMAL", "CHECKPOINT_RECOVERY"].includes(String(body.runnerScenario)))) {
        return json(res, 422, { error: "fixture model call request is invalid" });
      }
      const scenario = body.scenario as "COMPLETED" | "TIMEOUT" | "OVER_BUDGET";
      const runnerScenario = (body.runnerScenario ?? "NORMAL") as "NORMAL" | "CHECKPOINT_RECOVERY";
      if (runnerScenario === "CHECKPOINT_RECOVERY" && scenario !== "COMPLETED") return json(res, 422, { error: "checkpoint recovery Fixture requires a completed deterministic model response" });
      const testRunId = runnerScenario === "CHECKPOINT_RECOVERY" && typeof body.modelRunId === "string" && body.modelRunId.endsWith(".round-1") ? body.modelRunId.slice(0, -".round-1".length) : undefined;
      if (runnerScenario === "CHECKPOINT_RECOVERY" && (!testRunId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(testRunId))) return json(res, 422, { error: "checkpoint recovery Fixture is valid only for round 1 of a UUID-bound TestRun" });
      const requestedCents = Number(body.requestedCents);
      if (runnerScenario === "CHECKPOINT_RECOVERY" && body.roundIndex !== 1) return json(res, 422, { error: "checkpoint recovery Fixture is restricted to round 1" });
      const requestFingerprint = createHash("sha256").update(JSON.stringify({ fixtureId: "v3.1-model-response-fixed-v1", experimentId: body.experimentId, modelRunId: body.modelRunId, requestedCents, roundIndex: body.roundIndex ?? null, scenario, runnerScenario })).digest("hex");
      const result = await modelGatewayFixture.complete({
        experimentId: body.experimentId,
        modelRunId: body.modelRunId,
        requestFingerprint,
        requestedCents,
        ...(body.roundIndex === undefined ? {} : { roundIndex: Number(body.roundIndex) }),
        payload: { scenario, requestedCents, runnerScenario, ...(testRunId ? { testRunId } : {}) },
      });
      // Recover a lost Platform acknowledgement from the immutable Fixture response,
      // but only when the exact request fingerprint is already settled. An uncertain
      // or merely dispatched call remains fail-closed and is never reissued.
      if (result.status === "ALREADY_EXISTS" && result.budgetStatus === "SETTLED") {
        const settled = await budgetLedger.getModelCall(body.experimentId, body.modelRunId);
        if (!settled || settled.status !== "SETTLED" || settled.requestFingerprint !== requestFingerprint
          || settled.requestedCents !== requestedCents || settled.roundIndex !== (body.roundIndex ?? 1)) {
          return json(res, 409, { providerMode: "FIXTURE", modelCalls: "NO_EXTERNAL_CALL", status: "ALREADY_EXISTS", modelRunId: body.modelRunId, budgetStatus: result.budgetStatus });
        }
        return json(res, 200, {
          providerMode: "FIXTURE", modelCalls: "NO_EXTERNAL_CALL", status: "COMPLETED",
          modelRunId: body.modelRunId, budgetStatus: "SETTLED", actualCostCents: settled.spentCents,
          response: { fixtureId: "v3.1-model-response-fixed-v1", content: "deterministic fixture response", generatedCode: runnerScenario === "CHECKPOINT_RECOVERY" && testRunId ? fixedFixtureRecoveryGeneratedCode(testRunId) : fixedFixtureGeneratedCode },
        });
      }
      const status = result.status === "BLOCKED" ? 503 : result.status === "UNKNOWN" ? 202 : 200;
      const response = result.status === "COMPLETED"
        ? { status: result.status, modelRunId: result.modelRunId, response: result.response, actualCostCents: result.settledCostCents, budgetStatus: result.budgetStatus }
        : result;
      return json(res, status, { providerMode: "FIXTURE", modelCalls: "NO_EXTERNAL_CALL", ...response });
    }
    if (req.method === "POST" && req.url === "/v1/model-gateway/fixture/openai/v1/chat/completions") {
      if (!modelGatewayFixture) return json(res, 404, { error: { message: "fixture gateway is disabled", type: "not_found_error" } });
      const body = JSON.parse(raw) as { model?: unknown; messages?: unknown; stream?: unknown };
      const experimentId = Array.isArray(req.headers["x-stockquant-experiment-id"]) ? undefined : req.headers["x-stockquant-experiment-id"];
      const modelRunId = Array.isArray(req.headers["x-stockquant-model-run-id"]) ? undefined : req.headers["x-stockquant-model-run-id"];
      const roundIndexHeader = Array.isArray(req.headers["x-stockquant-round-index"]) ? undefined : req.headers["x-stockquant-round-index"];
      const roundIndex = typeof roundIndexHeader === "string" && /^[1-3]$/u.test(roundIndexHeader) ? Number(roundIndexHeader) : undefined;
      const reservedHeader = Array.isArray(req.headers["x-stockquant-reserved-cents"]) ? undefined : req.headers["x-stockquant-reserved-cents"];
      const reservedCents = typeof reservedHeader === "string" && /^[1-9][0-9]{0,3}$/u.test(reservedHeader) ? Number(reservedHeader) : NaN;
      const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
      const safeMessages = Array.isArray(body?.messages) && body.messages.length > 0 && body.messages.length <= 256
        && body.messages.every((message) => message && typeof message === "object" && !Array.isArray(message)
          && ["system", "user", "assistant", "tool"].includes(String((message as { role?: unknown }).role))
          && (typeof (message as { content?: unknown }).content === "string" || Array.isArray((message as { content?: unknown }).content)));
      if (!body || typeof body !== "object" || Array.isArray(body) || body.model !== "stockquant-fixture" || body.stream === true
        || !safeMessages || typeof experimentId !== "string" || !uuid.test(experimentId)
        || (roundIndexHeader !== undefined && roundIndex === undefined)
        || typeof modelRunId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(modelRunId)
        || !Number.isSafeInteger(reservedCents) || reservedCents > config.maxExperimentBudgetCents) {
        return json(res, 422, { error: { message: "invalid fixture chat request or budget binding", type: "invalid_request_error" } });
      }
      const requestFingerprint = createHash("sha256").update(JSON.stringify({ body, roundIndex: roundIndex ?? null })).digest("hex");
      const result = await modelGatewayFixture.complete({
        experimentId, modelRunId, requestFingerprint, requestedCents: reservedCents,
        ...(roundIndex === undefined ? {} : { roundIndex }),
        payload: { scenario: "COMPLETED", requestedCents: reservedCents },
      });
      if (result.status === "COMPLETED") {
        return json(res, 200, {
          id: `chatcmpl-${createHash("sha256").update(modelRunId).digest("hex").slice(0, 24)}`,
          object: "chat.completion", created: 0, model: "stockquant-fixture",
          choices: [{ index: 0, message: { role: "assistant", content: "deterministic fixture response" }, finish_reason: "stop" }],
          usage: { prompt_tokens: fixtureUsageEvidence.inputTokens, completion_tokens: fixtureUsageEvidence.outputTokens, total_tokens: fixtureUsageEvidence.inputTokens + fixtureUsageEvidence.outputTokens },
        });
      }
      const status = result.status === "ALREADY_EXISTS" ? 409 : result.status === "BLOCKED" ? 503 : 202;
      return json(res, status, { error: { message: "fixture model call was not completed", type: "server_error", code: result.status } });
    }
    if (req.method === "POST" && req.url === "/v1/model-gateway/fixture/openai/v1/embeddings") {
      if (!modelGatewayFixture) return json(res, 404, { error: { message: "fixture gateway is disabled", type: "not_found_error" } });
      const body = JSON.parse(raw) as { model?: unknown; input?: unknown; encoding_format?: unknown; dimensions?: unknown };
      const inputs = typeof body?.input === "string" ? [body.input] : body?.input;
      const experimentId = Array.isArray(req.headers["x-stockquant-experiment-id"]) ? undefined : req.headers["x-stockquant-experiment-id"];
      const modelRunId = Array.isArray(req.headers["x-stockquant-model-run-id"]) ? undefined : req.headers["x-stockquant-model-run-id"];
      const roundIndexHeader = Array.isArray(req.headers["x-stockquant-round-index"]) ? undefined : req.headers["x-stockquant-round-index"];
      const roundIndex = typeof roundIndexHeader === "string" && /^[1-3]$/u.test(roundIndexHeader) ? Number(roundIndexHeader) : undefined;
      const reservedHeader = Array.isArray(req.headers["x-stockquant-reserved-cents"]) ? undefined : req.headers["x-stockquant-reserved-cents"];
      const reservedCents = typeof reservedHeader === "string" && /^[1-9][0-9]{0,3}$/u.test(reservedHeader) ? Number(reservedHeader) : NaN;
      const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
      const validInputs = Array.isArray(inputs) && inputs.length > 0 && inputs.length <= 256 && inputs.every((item) => typeof item === "string" && item.length <= 4096);
      if (!body || typeof body !== "object" || Array.isArray(body) || body.model !== "stockquant-fixture" || !validInputs
        || (body.encoding_format !== undefined && body.encoding_format !== null && body.encoding_format !== "float" && body.encoding_format !== "base64") || (body.dimensions !== undefined && body.dimensions !== 3)
        || typeof experimentId !== "string" || !uuid.test(experimentId)
        || (roundIndexHeader !== undefined && roundIndex === undefined)
        || typeof modelRunId !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(modelRunId)
        || !Number.isSafeInteger(reservedCents) || reservedCents > config.maxExperimentBudgetCents) {
        return json(res, 422, { error: { message: "invalid fixture embedding request or budget binding", type: "invalid_request_error", validation: {
          modelValid: body?.model === "stockquant-fixture", inputValid: validInputs, encodingFormatValid: body?.encoding_format === undefined || body.encoding_format === null || body.encoding_format === "float" || body.encoding_format === "base64",
          dimensionsValid: body?.dimensions === undefined || body.dimensions === 3, experimentIdentityValid: typeof experimentId === "string" && uuid.test(experimentId),
          runIdentityValid: typeof modelRunId === "string" && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(modelRunId), reservedBudgetValid: Number.isSafeInteger(reservedCents) && reservedCents <= config.maxExperimentBudgetCents,
        } } });
      }
      const requestFingerprint = createHash("sha256").update(JSON.stringify({ body, roundIndex: roundIndex ?? null })).digest("hex");
      const inputTokens = inputs.length * 4;
      const result = await modelGatewayFixture.complete({
        experimentId, modelRunId, requestFingerprint, requestedCents: reservedCents,
        ...(roundIndex === undefined ? {} : { roundIndex }),
        payload: { scenario: "COMPLETED", requestedCents: reservedCents, operation: "EMBEDDING", inputTokens },
      });
      if (result.status === "COMPLETED") {
        const vector = [0.125, -0.25, 0.5];
        const encodedVector = Buffer.allocUnsafe(12);
        vector.forEach((value, index) => encodedVector.writeFloatLE(value, index * 4));
        const embeddingValue = body.encoding_format === "base64" ? encodedVector.toString("base64") : vector;
        return json(res, 200, {
          object: "list", model: "stockquant-fixture", data: inputs.map((_, index) => ({ object: "embedding", index, embedding: embeddingValue })),
          usage: { prompt_tokens: inputTokens, total_tokens: inputTokens },
        });
      }
      const status = result.status === "ALREADY_EXISTS" ? 409 : result.status === "BLOCKED" ? 503 : 202;
      return json(res, status, { error: { message: "fixture embedding call was not completed", type: "server_error", code: result.status } });
    }
    const match = req.url?.match(/^\/v1\/experiments\/([^/]+)(\/cancel)?$/);
    if (match && req.method === "GET" && !match[2]) {
      const experiment = await service.get(match[1]);
      return experiment ? json(res, 200, experiment) : json(res, 404, { error: "experiment not found" });
    }
    if (match && req.method === "POST" && match[2]) {
      const experiment = await service.cancel(match[1]);
      return experiment ? json(res, 200, experiment) : json(res, 404, { error: "experiment not found" });
    }
    const budgetMatch = req.url?.match(/^\/v1\/experiments\/([^/]+)\/budget(?:\/settle)?$/);
    if (budgetMatch && req.method === "GET" && !req.url?.endsWith("/settle")) {
      const budget = await budgetLedger.get(budgetMatch[1]);
      return budget ? json(res, 200, budget) : json(res, 404, { error: "budget reservation not found" });
    }
    if (budgetMatch && req.method === "POST" && req.url?.endsWith("/settle")) {
      if (!fixtureBudgetSettlementEnabled(process.env)) return json(res, 404, { error: "direct budget settlement is available only in explicit Fixture test mode" });
      const body = JSON.parse(raw) as { spentCents?: number | "UNKNOWN" };
      if (body.spentCents !== "UNKNOWN" && !Number.isInteger(body.spentCents)) return json(res, 422, { error: "spentCents must be an integer or UNKNOWN" });
      return json(res, 200, await budgetLedger.settle(budgetMatch[1], body.spentCents as number | "UNKNOWN"));
    }
    const ledgerSettlementMatch = req.url?.match(/^\/v1\/experiments\/([^/]+)\/budget\/settle-from-model-calls$/);
    if (ledgerSettlementMatch && req.method === "POST") {
      if (!(budgetLedger instanceof PgBudgetLedger)) return json(res, 503, { error: "model-call ledger settlement requires PostgreSQL persistence" });
      const caller = identifyResearchService(Array.isArray(req.headers.authorization) ? undefined : req.headers.authorization, config.trustedServiceTokens);
      if (caller !== "platform-api-service") return json(res, 403, { error: "model-call ledger settlement is restricted to Platform API" });
      const body = JSON.parse(raw) as { testRunId?: unknown; expectedRounds?: unknown };
      const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
      if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => !["testRunId", "expectedRounds"].includes(key))
        || typeof body.testRunId !== "string" || !uuid.test(body.testRunId) || !Number.isSafeInteger(body.expectedRounds) || Number(body.expectedRounds) < 1 || Number(body.expectedRounds) > 3) {
        return json(res, 422, { error: "only a valid TestRun UUID and bounded expectedRounds are accepted" });
      }
      try {
        return json(res, 200, await budgetLedger.settleFromModelCalls(ledgerSettlementMatch[1], body.testRunId, Number(body.expectedRounds)));
      } catch (error) {
        return json(res, 409, { error: error instanceof Error ? error.message : "Experiment model-call ledger is not settleable" });
      }
    }
    return json(res, 404, { error: "not found" });
  } catch (error) {
    if (error instanceof V31GateUnavailableError) return json(res, 503, { error: error.message, traceId: randomUUID() });
    if (error instanceof RunnerInputPreflightError) return json(res, error.statusCode, { error: error.message, traceId: randomUUID() });
    if (error instanceof ResearchCheckpointConflict) return json(res, error.statusCode, { error: error.message, traceId: randomUUID() });
    const status = error instanceof ExperimentIdempotencyConflict || error instanceof RunnerJobIdempotencyConflict ? 409 : 422;
    return json(res, status, { error: error instanceof Error ? error.message : "invalid request", traceId: randomUUID() });
  }
});

server.listen(port, process.env.STOCKQUANT_BIND_HOST ?? "127.0.0.1");

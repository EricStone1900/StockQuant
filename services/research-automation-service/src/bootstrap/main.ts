import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { InMemoryExperimentRepository } from "../adapters/in-memory-experiment-repository.js";
import { PgExperimentRepository } from "../adapters/pg-experiment-repository.js";
import { PgBudgetLedger } from "../adapters/pg-budget-ledger.js";
import { PgArtifactRefRepository } from "../adapters/pg-artifact-ref-repository.js";
import { PgRunnerJobStore } from "../adapters/pg-runner-job-store.js";
import { BudgetLedger } from "../application/v31-runtime-guards.js";
import { ExperimentIdempotencyConflict, ExperimentService } from "../application/experiment-service.js";
import { validateArtifactRef, validateRunnerJob } from "../application/v31-runtime-guards.js";
import { evaluateModelGatewayPreflight } from "../application/v31-model-gateway-preflight.js";
import { FileArtifactStore } from "../application/v31-artifact-store.js";
import { InMemoryRunnerJobStore, RunnerJobCoordinator } from "../application/v31-runner-jobs.js";
import { parseRunnerExecution } from "../application/v31-runner-executor.js";
import { loadResearchAutomationConfig } from "./config.js";

const port = Number(process.env.STOCKQUANT_PORT ?? 3008);
const config = loadResearchAutomationConfig();
const databasePool = process.env.STOCKQUANT_DATABASE_URL ? new Pool({ connectionString: process.env.STOCKQUANT_DATABASE_URL }) : null;
const repository = databasePool ? new PgExperimentRepository(databasePool) : new InMemoryExperimentRepository();
const budgetLedger = databasePool ? new PgBudgetLedger(databasePool, config.stageBudgetCents, config.maxExperimentBudgetCents, config.budgetWarningPercent) : new BudgetLedger(config.stageBudgetCents, config.maxExperimentBudgetCents, config.budgetWarningPercent);
if (repository instanceof PgExperimentRepository) await repository.initialize();
if (budgetLedger instanceof PgBudgetLedger) await budgetLedger.initialize();
const service = new ExperimentService(repository, config.maxExperimentBudgetCents, budgetLedger);
const runnerJobStore = databasePool ? new PgRunnerJobStore(databasePool) : new InMemoryRunnerJobStore();
if (runnerJobStore instanceof PgRunnerJobStore) await runnerJobStore.initialize();
const runnerJobs = new RunnerJobCoordinator(runnerJobStore);
const artifactStore = new FileArtifactStore(process.env.STOCKQUANT_RESEARCH_ARTIFACT_ROOT ?? "/tmp/stockquant-research-artifacts");
const artifactRefs = databasePool ? new PgArtifactRefRepository(databasePool) : null;
if (artifactRefs) await artifactRefs.initialize();
const modelGatewayPreflight = () => evaluateModelGatewayPreflight(config, {
  [config.chatCredentialRef]: process.env[config.chatCredentialRef],
  [config.embeddingCredentialRef]: process.env[config.embeddingCredentialRef],
});
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
    execution: { budgetCurrency: config.budgetCurrency, defaultRounds: config.defaultRounds, maxRounds: config.maxRounds, defaultBudgetCents: config.defaultBudgetCents, maxExperimentBudgetCents: config.maxExperimentBudgetCents, stageBudgetCents: config.stageBudgetCents, budgetWarningPercent: config.budgetWarningPercent, workerConcurrency: config.workerConcurrency },
    prerequisiteStatus: config.prerequisiteStatus,
    budgetPersistence: databasePool ? "POSTGRES" : "MEMORY",
    modelGatewayPreflight: modelGatewayPreflight()
  });
  let raw = "";
  for await (const chunk of req) raw += chunk;
  try {
    if (req.method === "POST" && req.url === "/v1/experiments") {
      const result = await service.create(JSON.parse(raw));
      const budget = await budgetLedger.get(result.experiment.experimentId);
      return json(res, result.existing ? 200 : 202, { ...result.experiment, budget });
    }
    if (req.method === "POST" && req.url === "/v1/runner/jobs/validate") {
      validateRunnerJob(JSON.parse(raw));
      return json(res, 200, { status: "VALID", execution: "NOT_STARTED", runner: config.runnerMode });
    }
    if (req.method === "POST" && req.url === "/v1/runner/jobs") {
      const record = await runnerJobs.submit(JSON.parse(raw));
      return json(res, 202, { ...record, execution: "NOT_STARTED", prerequisiteStatus: config.prerequisiteStatus });
    }
    const runnerAction = req.url?.match(/^\/v1\/runner\/jobs\/([^/]+)\/(start|complete|retry)$/);
    if (runnerAction && req.method === "POST") {
      const jobId = decodeURIComponent(runnerAction[1]);
      const current = await runnerJobs.get(jobId);
      if (!current) return json(res, 404, { error: "runner job not found" });
      let record;
      if (runnerAction[2] === "start") {
        record = await runnerJobs.markStarted(jobId);
      } else if (runnerAction[2] === "retry") {
        record = await runnerJobs.retry(jobId);
      } else {
        const body = JSON.parse(raw) as { execution?: unknown; artifacts?: unknown };
        if (body.artifacts !== undefined && !Array.isArray(body.artifacts)) throw new Error("runner artifacts must be an array");
        const artifacts = (body.artifacts ?? []).map((ref) => {
          const typedRef = ref as Parameters<typeof validateArtifactRef>[0];
          validateArtifactRef(typedRef);
          if (typedRef.namespace !== current.job.outputNamespace) throw new Error("runner artifact namespace must match the job output namespace");
          return typedRef;
        });
        for (const ref of artifacts) if (artifactRefs && !(await artifactRefs.get(ref.namespace, ref.artifactId))) throw new Error("runner artifact must be published before completion");
        record = await runnerJobs.markCompleted(jobId, parseRunnerExecution(body.execution), artifacts);
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
      const body = JSON.parse(raw) as { ref?: unknown; contentBase64?: unknown };
      if (!body.ref || typeof body.contentBase64 !== "string") return json(res, 422, { error: "ref and contentBase64 are required" });
      const content = Buffer.from(body.contentBase64, "base64");
      if (content.byteLength > 8 * 1024 * 1024) return json(res, 422, { error: "artifact exceeds 8 MiB preparation limit" });
      const ref = await artifactStore.publish(body.ref as Parameters<typeof validateArtifactRef>[0], content);
      await artifactRefs?.save(ref);
      return json(res, 201, { status: "PUBLISHED", persisted: true, ref });
    }
    if (req.method === "GET" && req.url === "/v1/model-gateway/preflight") {
      return json(res, 200, modelGatewayPreflight());
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
      const body = JSON.parse(raw) as { spentCents?: number | "UNKNOWN" };
      if (body.spentCents !== "UNKNOWN" && !Number.isInteger(body.spentCents)) return json(res, 422, { error: "spentCents must be an integer or UNKNOWN" });
      return json(res, 200, await budgetLedger.settle(budgetMatch[1], body.spentCents as number | "UNKNOWN"));
    }
    return json(res, 404, { error: "not found" });
  } catch (error) {
    const status = error instanceof ExperimentIdempotencyConflict ? 409 : 422;
    return json(res, status, { error: error instanceof Error ? error.message : "invalid request", traceId: randomUUID() });
  }
});

server.listen(port, process.env.STOCKQUANT_BIND_HOST ?? "127.0.0.1");

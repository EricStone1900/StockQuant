import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { InMemoryExperimentRepository } from "../adapters/in-memory-experiment-repository.js";
import { PgExperimentRepository } from "../adapters/pg-experiment-repository.js";
import { ExperimentIdempotencyConflict, ExperimentService } from "../application/experiment-service.js";
import { validateArtifactRef, validateRunnerJob } from "../application/v31-runtime-guards.js";
import { evaluateModelGatewayPreflight } from "../application/v31-model-gateway-preflight.js";
import { loadResearchAutomationConfig } from "./config.js";

const port = Number(process.env.STOCKQUANT_PORT ?? 3008);
const config = loadResearchAutomationConfig();
const repository = process.env.STOCKQUANT_DATABASE_URL ? new PgExperimentRepository(new Pool({ connectionString: process.env.STOCKQUANT_DATABASE_URL })) : new InMemoryExperimentRepository();
if (repository instanceof PgExperimentRepository) await repository.initialize();
const service = new ExperimentService(repository, config.maxExperimentBudgetCents);
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
    modelGatewayPreflight: modelGatewayPreflight()
  });
  let raw = "";
  for await (const chunk of req) raw += chunk;
  try {
    if (req.method === "POST" && req.url === "/v1/experiments") {
      const result = await service.create(JSON.parse(raw));
      return json(res, result.existing ? 200 : 202, result.experiment);
    }
    if (req.method === "POST" && req.url === "/v1/runner/jobs/validate") {
      validateRunnerJob(JSON.parse(raw));
      return json(res, 200, { status: "VALID", execution: "NOT_STARTED", runner: config.runnerMode });
    }
    if (req.method === "POST" && req.url === "/v1/artifacts/validate") {
      validateArtifactRef(JSON.parse(raw));
      return json(res, 200, { status: "VALID", persisted: false, reason: "validation-only boundary" });
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
    return json(res, 404, { error: "not found" });
  } catch (error) {
    const status = error instanceof ExperimentIdempotencyConflict ? 409 : 422;
    return json(res, status, { error: error instanceof Error ? error.message : "invalid request", traceId: randomUUID() });
  }
});

server.listen(port, process.env.STOCKQUANT_BIND_HOST ?? "127.0.0.1");

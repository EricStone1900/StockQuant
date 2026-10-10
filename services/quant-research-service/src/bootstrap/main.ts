import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { Pool } from "pg";
import { authorizeQuantResearchRequest, loadQuantResearchTokens } from "../service-auth.js";
import { GeneratedQlibWorkerClient } from "../contracts/generated-qlib-worker-client.js";
import { GeneratedQlibWorkerAdapter } from "../adapters/generated-qlib-worker-adapter.js";
import { QlibResearchService } from "../application/qlib-research-service.js";
import { CandidateRegistrationService } from "../application/candidate-registration-service.js";
import { PostgresCandidateRegistrationRepository } from "../adapters/postgres-candidate-registration-repository.js";
import { migrateQuantResearchSchema } from "../adapters/postgres-schema-migrations.js";
import { PostgresPromotionRequestRepository } from "../adapters/postgres-promotion-request-repository.js";
import { PromotionRequestService } from "../application/promotion-request-service.js";
import { PostgresValidationReportRepository } from "../adapters/postgres-validation-report-repository.js";
import { ValidationReportService } from "../application/validation-report-service.js";
import { PostgresPromotionReadRepository } from "../adapters/postgres-promotion-read-repository.js";
import { PromotionReadService } from "../application/promotion-read-service.js";
import { PostgresPromotionDecisionRepository } from "../adapters/postgres-promotion-decision-repository.js";
import { PromotionDecisionService } from "../application/promotion-decision-service.js";
import type { QlibFitFixtureRequest } from "../contracts/generated-types.js";
import { V14DailyBacktestService } from "../application/v14-daily-backtest-service.js";
import { V14DailyBacktestFixtureAdapter } from "../adapters/v14-daily-backtest-fixture.js";
import { PostgresV14BacktestRepository } from "../adapters/postgres-v14-backtest-repository.js";

const port = Number(process.env.STOCKQUANT_PORT ?? 3003);
const qlibWorkerUrl = process.env.QLIB_WORKER_URL ?? "http://127.0.0.1:3004";
const qlibWorkerCallerToken = process.env.STOCKQUANT_SERVICE_TOKEN_QUANT_RESEARCH_SERVICE?.trim() ?? "";
const qlibWorkerClient = qlibWorkerCallerToken.length >= 32 ? new GeneratedQlibWorkerAdapter(new GeneratedQlibWorkerClient(qlibWorkerUrl, qlibWorkerCallerToken)) : undefined;
const qlibResearch = new QlibResearchService(qlibWorkerClient);
const pool = new Pool({ connectionString: process.env.STOCKQUANT_DATABASE_URL });
pool.on("error", (error: Error & { code?: string }) => {
  console.warn(`STOCKQUANT_QUANT_DATABASE_IDLE_CLIENT_ERROR name=${error.name} code=${error.code ?? "none"}`);
});
const v14DailyBacktest = new V14DailyBacktestService(new V14DailyBacktestFixtureAdapter());
const v14BacktestRuns = new PostgresV14BacktestRepository(pool);
const canonicalJson = (value: unknown): string => value === null || typeof value !== "object" ? JSON.stringify(value) : Array.isArray(value) ? `[${value.map(canonicalJson).join(",")}]` : `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
const candidateRegistration = new CandidateRegistrationService(new PostgresCandidateRegistrationRepository(pool));
const promotionRequests = new PromotionRequestService(new PostgresPromotionRequestRepository(pool));
const validationReports = new ValidationReportService(new PostgresValidationReportRepository(pool));
const promotionReads = new PromotionReadService(new PostgresPromotionReadRepository(pool));
const promotionDecisions = new PromotionDecisionService(new PostgresPromotionDecisionRepository(pool));
const callerTokens = loadQuantResearchTokens(process.env);
async function json(res: import("node:http").ServerResponse, body: unknown, status=200) { res.writeHead(status,{"content-type":"application/json"}); res.end(JSON.stringify(body)); }
await migrateQuantResearchSchema(pool);
const server = createServer(async (req,res) => {
  if (req.url === "/live") return json(res,{status:"live",service:"quant-research-service"});
  if (req.url === "/ready") return json(res,{status:"ready",service:"quant-research-service",qlib:(await qlibResearch.probe()).status});
  const serviceId = req.headers["x-stockquant-service-id"];
  const authorization = req.headers.authorization;
  if (!authorizeQuantResearchRequest({ method: req.method ?? "", pathname: new URL(req.url ?? "/", "http://localhost").pathname, serviceId: typeof serviceId === "string" ? serviceId : undefined, authorization: typeof authorization === "string" ? authorization : undefined, tokens: callerTokens })) return json(res,{status:"FORBIDDEN",reason:"service identity or route scope is not allowed"},403);
  if (req.method === "POST" && req.url === "/v1/research/qlib/fit-fixture") {
    if (qlibWorkerCallerToken.length < 32) return json(res, { status: "NOT_RUN", reason: "quant-research-service Qlib worker identity is not configured" }, 503);
    let raw = "";
    for await (const chunk of req) {
      raw += chunk;
      if (Buffer.byteLength(raw, "utf8") > 1_048_576) return json(res, { status: "REJECTED", reason: "Qlib fixture request exceeds 1 MiB" }, 413);
    }
    try {
      const result = await qlibResearch.fitFixture(JSON.parse(raw) as QlibFitFixtureRequest);
      return json(res, result.body, result.status);
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "TimeoutError";
      return json(res, { status: "NOT_RUN", reason: timedOut ? "Qlib fixture fit timed out after 120 seconds" : error instanceof Error ? error.message : "Qlib worker unavailable" }, timedOut ? 504 : 503);
    }
  }
  if (req.method === "POST" && req.url === "/v1/research/backtests/daily-fixture") {
    let raw = "";
    for await (const chunk of req) {
      raw += chunk;
      if (Buffer.byteLength(raw, "utf8") > 16_384) return json(res, { status: "REJECTED", reason: "V1.4 request exceeds 16 KiB" }, 413);
    }
    try {
      const body = JSON.parse(raw) as Record<string, unknown>;
      const policy = body?.policy;
      const allowedRequestKeys = ["scenarioId", "seed", "policy", "testRunId"];
      const requiredPolicyKeys = ["initialCashCents", "targetQuantity", "participationRateBasisPoints", "slippageBasisPoints", "fixedFeeCents"];
      const allowedPolicyKeys = [...requiredPolicyKeys, "sellOrder", "marketFeeSchedule"];
      if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).sort().join(",") !== [...allowedRequestKeys].sort().join(",")
        || !policy || typeof policy !== "object" || Array.isArray(policy) || requiredPolicyKeys.some((key) => !Object.hasOwn(policy, key)) || Object.keys(policy).some((key) => !allowedPolicyKeys.includes(key))) return json(res, { status: "REJECTED", reason: "V1.4 request contains missing or unknown fields" }, 422);
      if (body.testRunId !== undefined && (typeof body.testRunId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(body.testRunId))) return json(res, { status: "REJECTED", reason: "V1.4 testRunId must be a UUID" }, 422);
      if (typeof body.testRunId === "string") {
        const existing = await v14BacktestRuns.get(body.testRunId);
        if (existing) {
          const runPolicy = existing.run.evidence.executionPolicy;
          if (existing.run.scenarioId !== body.scenarioId || existing.run.seed !== body.seed || canonicalJson(runPolicy) !== canonicalJson(policy)) return json(res, { status: "CONFLICT", reason: "V1.4 TestRun ID already exists with different inputs" }, 409);
          return json(res, { ...existing.run, testRunId: body.testRunId, durableReport: { resultSha256: existing.resultSha256, manifestSha256: existing.manifestSha256 } });
        }
      }
      const result = v14DailyBacktest.run(body as unknown as import("../application/v14-daily-backtest-service.js").V14DailyBacktestRequest);
      let durableReport: { resultSha256: string; manifestSha256: string };
      try { durableReport = await v14BacktestRuns.save(result.testRunId, result); }
      catch { return json(res, { status: "NOT_RUN", reason: "Quant could not durably persist the V1.4 BacktestRun and Manifest" }, 503); }
      return json(res, { ...result, durableReport });
    } catch (error) {
      return json(res, { status: "REJECTED", reason: error instanceof Error ? error.message : "invalid V1.4 backtest request" }, 422);
    }
  }
  if (req.url === "/v1/qlib/probe") return json(res,{adapter:"qlib",sourceCommit:process.env.QLIB_SOURCE_COMMIT??"UNSET",dependencyImage:process.env.QLIB_IMAGE??"UNSET",probe:await qlibResearch.probe(),executionModel:"CPU",modelCalls:"NOT_RUN"});
  if (req.url === "/v1/rdagent/probe") {
    const workerProbe = await qlibResearch.probe();
    return json(res, {
      adapter: "rdagent",
      executionBoundary: workerProbe.codeProbe ? "isolated-qlib-worker-container" : "UNAVAILABLE",
      dockerSocketMounted: workerProbe.dockerSocketMounted ?? true,
      codeProbe: workerProbe.codeProbe ?? { status: "NOT_RUN", reason: workerProbe.detail ?? "isolated worker probe unavailable" },
      modelCalls: "NOT_RUN",
      reason: "The fixed Python compatibility snippet runs in the isolated worker; model execution is disabled for V1.2.",
    });
  }
  if (req.method === "GET" && /^\/v1\/promotions\/[^/]+\/validation-input$/.test(req.url ?? "")) {
    const id = /^\/v1\/promotions\/([^/]+)\/validation-input$/.exec(req.url ?? "")?.[1] ?? "";
    const result = await validationReports.getInput(id);
    return json(res, result.body, result.status);
  }
  if (req.method === "POST" && /^\/v1\/promotions\/[^/]+\/validation-report$/.test(req.url ?? "")) {
    const id = /^\/v1\/promotions\/([^/]+)\/validation-report$/.exec(req.url ?? "")?.[1] ?? "";
    let raw = "";
    for await (const chunk of req) {
      raw += chunk;
      if (Buffer.byteLength(raw, "utf8") > 1_048_576) return json(res, { status: "REJECTED", reason: "validation submission exceeds 1 MiB" }, 413);
    }
    try {
      const result = await validationReports.submit(id, JSON.parse(raw) as unknown);
      return json(res, result.body, result.status);
    } catch (error) {
      return json(res, { status: "REJECTED", reason: error instanceof Error ? error.message : "invalid validation submission" }, 422);
    }
  }
  if (req.method === "POST" && /^\/v1\/promotions\/[^/]+\/decision$/.test(req.url ?? "")) {
    const id = /^\/v1\/promotions\/([^/]+)\/decision$/.exec(req.url ?? "")?.[1] ?? "";
    let raw = "";
    for await (const chunk of req) {
      raw += chunk;
      if (Buffer.byteLength(raw, "utf8") > 16_384) return json(res, { status: "REJECTED", reason: "decision command exceeds 16 KiB" }, 413);
    }
    let input: unknown;
    try { input = JSON.parse(raw) as unknown; }
    catch { return json(res, { status: "REJECTED", reason: "decision command is not valid JSON" }, 422); }
    const result = await promotionDecisions.decide(id, input);
    return json(res, result.body, result.status);
  }
  if (req.method === "GET" && /^\/v1\/promotions\/[^/]+\/validation-report$/.test(req.url ?? "")) {
    const id = /^\/v1\/promotions\/([^/]+)\/validation-report$/.exec(req.url ?? "")?.[1] ?? "";
    const result = await validationReports.getReport(id);
    return json(res, result.body, result.status);
  }
  if (req.method === "GET" && /^\/v1\/registry\/versions\/[a-f0-9]{64}$/i.test(req.url ?? "")) {
    const fingerprint = req.url!.slice("/v1/registry/versions/".length);
    const result = await promotionReads.registryVersion(fingerprint);
    return json(res, result.body, result.status);
  }
  if (req.method === "POST" && req.url === "/v1/promotions") {
    let raw = "";
    for await (const chunk of req) {
      raw += chunk;
      if (Buffer.byteLength(raw, "utf8") > 65536) return json(res, { status: "REJECTED", reason: "PromotionRequest exceeds 64 KiB" }, 413);
    }
    try {
      const result = await promotionRequests.submit(JSON.parse(raw) as unknown);
      return json(res, result.body, result.status);
    } catch (error) {
      return json(res, { status: "REJECTED", reason: error instanceof Error ? error.message : "invalid PromotionRequest" }, 422);
    }
  }
  if (req.method === "GET" && req.url?.startsWith("/v1/promotions/")) {
    const detailRoute = /^\/v1\/promotions\/([^/?]+)\/detail$/.exec(req.url);
    if (detailRoute) {
      const result = await promotionReads.detail(detailRoute[1]);
      return json(res, result.body, result.status);
    }
    const route = /^\/v1\/promotions\/([^/?]+)$/.exec(req.url);
    if (!route) return json(res, { status: "NOT_FOUND" }, 404);
    const result = await promotionRequests.get(route[1]);
    return json(res, result.body, result.status);
  }
  if (req.url === "/v1/factors/preview") return json(res,{status:"NOT_RUN",reason:"V1.2 factor output is not yet computed from the versioned daily-bar Fixture through the Qlib worker",factorVersion:"v1.2-sma-factor-1",dataVersion:"v1.2-market-data-1",asOf:"2024-01-04",qlibStatus:(await qlibResearch.probe()).status,ranking:[],noTrade:true,lookbackBars:0});
  if (req.method === "POST" && req.url === "/v1/research/multi-bar") {
    let raw = ""; for await (const chunk of req) raw += chunk;
    try {
      const body = JSON.parse(raw) as { bars?: Array<{ timestamp: string; open: string; volume: number }>; executions?: unknown[]; runId?: string };
      const probe = await qlibResearch.probe();
      if (probe.status !== "READY") return json(res, { status:"NOT_RUN", reason:"Qlib probe is not READY", probe }, 503);
      const bars = body.bars ?? [];
      if (bars.length === 0) return json(res, { status:"REJECTED", reason:"bars are required" }, 422);
      const trainingResult = bars.length >= 3 && qlibWorkerClient ? await qlibResearch.trainSummary({ bars }) : null;
      if (trainingResult && trainingResult.status !== 200) throw new Error("Qlib fixture summary training failed");
      const training: { status?: string; adapter?: string; reason?: string; artifact?: { artifactHash?: string } } = trainingResult ? trainingResult.body as { status?: string; adapter?: string; reason?: string; artifact?: { artifactHash?: string } } : { status:"NOT_RUN", reason:bars.length < 3 ? "at least 3 bars required for train/validation/test splits" : "Qlib worker service identity is not configured" };
      const artifact = training.artifact;
      const validationResult = artifact?.artifactHash && qlibWorkerClient ? await qlibResearch.validateSummary({ bars, artifactHash: artifact.artifactHash }) : null;
      if (validationResult && validationResult.status !== 200) throw new Error("Qlib fixture summary validation failed");
      const validation = (validationResult?.body as { status?: string } | undefined) ?? { status:"NOT_RUN", independent:true };
      if (validation.status === "HASH_MISMATCH") return json(res, { status:"REJECTED", reason:"fixture summary hash did not reproduce", validation }, 422);
      const artifactHash = createHash("sha256").update(JSON.stringify({ bars, executions: body.executions ?? [] })).digest("hex");
      const validationApplicable = bars.length >= 3;
      return json(res, { status:"COMPLETED", adapter:"fixture-summary", runId:body.runId ?? null, dataMode:"FIXTURE", environmentMode:"BACKTEST", modelTraining:"NOT_RUN", independentModelValidation:"NOT_RUN", modelCalls:"NOT_RUN", barCount:bars.length, filledBarCount:(body.executions ?? []).length, artifactHash, training, validation, assertions:[{ assertionId:"V2.3-FIXTURE-SUMMARY-001", status:training.status === "FIXTURE_ONLY" ? "PASS" : "FAIL", expected:"fixture-only open-price summary is explicitly labelled and no model training is claimed", actual:{ trainingStatus:training.status, adapter:training.adapter, barCount:bars.length, filledBarCount:(body.executions ?? []).length } }, { assertionId:"V2.3-FIXTURE-SUMMARY-HASH-001", status:validationApplicable ? (validation.status === "HASH_MATCH" ? "PASS" : "FAIL") : "NOT_APPLICABLE", expected:validationApplicable ? "deterministic fixture summary hash is reproduced; independent model validation remains NOT_RUN" : "at least 3 bars required before fixture hash recomputation", actual:validation }] });
    } catch (error) { return json(res, { status:"REJECTED", reason:error instanceof Error ? error.message : "invalid research request" }, 422); }
  }
  if (req.method === "POST" && req.url === "/v1/research/train") {
    let raw = ""; for await (const chunk of req) raw += chunk;
    try {
      const result = await qlibResearch.trainSummary(JSON.parse(raw) as { bars: Array<{ timestamp?: string; open: string; volume?: number }> });
      return json(res, result.body, result.status);
    } catch (error) { return json(res, { status:"NOT_RUN", reason:error instanceof Error ? error.message : "qlib worker unavailable" }, 503); }
  }
  if (req.method === "POST" && req.url === "/v1/research/validate") {
    let raw = ""; for await (const chunk of req) raw += chunk;
    try { const body = JSON.parse(raw) as { bars: Array<{ timestamp?: string; open: string; volume?: number }>; artifactHash: string }; const result = await qlibResearch.validateSummary(body); return json(res, result.body, result.status); }
    catch (error) { return json(res, { status:"NOT_RUN", reason:error instanceof Error ? error.message : "qlib worker unavailable" }, 503); }
  }
  if (req.method === "POST" && req.url === "/v1/research/candidates") {
    let raw = ""; for await (const chunk of req) raw += chunk;
    try {
      const requester = req.headers["x-stockquant-user"];
      const result = await candidateRegistration.register(JSON.parse(raw) as unknown, typeof requester === "string" ? requester : undefined);
      return json(res, result.body, result.status);
    } catch (error) { return json(res, { status:"REJECTED", reason:error instanceof Error ? error.message : "invalid candidate" }, 422); }
  }
  if (req.method === "GET" && req.url?.startsWith("/v1/research/candidates/")) {
    const result = await candidateRegistration.get(req.url.split("/").pop() ?? "");
    if (!result) return json(res, { status:"NOT_FOUND" }, 404);
    return json(res, result);
  }
  return json(res,{code:"NOT_FOUND",message:"route not found"},404);
});
server.listen(port,process.env.STOCKQUANT_BIND_HOST??"127.0.0.1");

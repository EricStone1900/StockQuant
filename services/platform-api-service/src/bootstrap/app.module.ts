import { Body, ConflictException, Controller, ForbiddenException, Get, Headers, HttpCode, HttpException, Injectable, Module, NotFoundException, Param, Post, Put, Query, Res, ServiceUnavailableException, UnauthorizedException, UnprocessableEntityException } from "@nestjs/common";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { Pool } from "pg";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PostgresTestRunRepository } from "../adapters/postgres-test-run-repository.js";
import { PostgresStageRunRepository } from "../adapters/postgres-stage-run-repository.js";
import { ScenarioRunner } from "../application/scenario-runner.js";
import { isV11Scenario, V11_SCENARIOS } from "../application/v11-scenarios.js";
import type { ScenarioId } from "../domain/test-run.js";
import { V13_SCENARIOS, V13TradingEngine, type V13Scenario } from "../application/v13-trading.js";
import { V14_SCENARIOS, V14BacktestEngine, type V14Scenario } from "../application/v14-backtest.js";
import { V15_SCENARIOS, V15OrchestrationEngine, type V15Scenario } from "../application/v15-orchestration.js";
import { runRealNatsProbe } from "../integration/real-nats-probe.js";
import { runTemporalProbe } from "../integration/temporal-runtime.js";
import { V23_SCENARIOS, V23ReplayEngine, parseReplayBars, type V23Scenario } from "../application/v23-replay.js";
import { V24_SCENARIOS, V24ContinuousPaperEngine, type V24Scenario } from "../application/v24-continuous-paper.js";
import { ContinuousPaperScheduler } from "../application/v24-scheduler.js";
import { SystemClock } from "../application/v24-scheduler.js";
import { V24LiveObservationHandler } from "../application/v24-live-observation.js";
import { PostgresV24ObservationRepository } from "../adapters/postgres-v24-observation-repository.js";
import { V25_SCENARIOS, V25DataScaleEngine, type V25Scenario } from "../application/v25-data-scale.js";
import { findV31RunArtifactRef } from "../application/v31-run-artifact-access.js";
import { V12AcceptanceService, V12_SCENARIOS, type V12Scenario } from "../application/v12-acceptance.js";
import { PersistentStageRunService } from "../application/persistent-stage-run.js";
import type { AccountSnapshot, InitializeAccountCommand, V24PaperReadiness, V31ExperimentRequest, V31ResearchArtifactRef } from "../contracts/generated-types.js";
import { GeneratedHistoricalReplayClient, HistoricalReplayHttpError } from "../contracts/generated-historical-replay-client.js";
import { GeneratedResearchQueueClient, ResearchQueueHttpError } from "../contracts/generated-research-queue-client.js";
import { GeneratedResearchPromotionClient, ResearchPromotionHttpError } from "../contracts/generated-research-promotion-client.js";

const localUser = process.env.STOCKQUANT_LOCAL_DEVELOPMENT_USER ?? "acceptance-owner-1";

function identity(cookie: string | undefined, testHeader: string | undefined): string {
  const cookieUser = cookie?.split(";").map((value) => value.trim()).find((value) => value.startsWith("sq_session="))?.slice("sq_session=".length);
  const headerAllowed = process.env.STOCKQUANT_TEST_IDENTITY_HEADER_ENABLED === "true";
  const user = cookieUser ?? (headerAllowed ? testHeader : undefined);
  if (!user) throw new UnauthorizedException("local session is required");
  if (user !== localUser) throw new ForbiddenException("user is not authorized for the local acceptance scope");
  return user;
}

@Injectable()
export class PlatformContainer {
  readonly pool = new Pool({ connectionString: process.env.STOCKQUANT_DATABASE_URL });
  readonly portfolioApiUrl = process.env.STOCKQUANT_PORTFOLIO_API_URL ?? "http://127.0.0.1:3001";
  readonly governanceUrl = process.env.STOCKQUANT_GOVERNANCE_URL ?? "http://127.0.0.1:3007";
  readonly portfolioToken = process.env.STOCKQUANT_SERVICE_TOKEN_PLATFORM_API ?? "";
  readonly researchAutomationServiceToken = process.env.STOCKQUANT_SERVICE_TOKEN_RESEARCH_AUTOMATION ?? "";
  authorizeResearchAutomationService(authorization: string | undefined, serviceId: string | undefined): void {
    if (serviceId !== "research-automation-service" || !authorization?.startsWith("Bearer ")) throw new UnauthorizedException("research automation service identity is required");
    const supplied = Buffer.from(authorization.slice(7));
    const expected = Buffer.from(this.researchAutomationServiceToken);
    if (expected.length < 32 || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new ForbiddenException("research automation service credential is invalid");
  }
  readonly repository = new PostgresTestRunRepository(this.pool);
  readonly stageRuns = new PostgresStageRunRepository(this.pool);
  readonly runner = new ScenarioRunner(this.repository, this.portfolioApiUrl, this.portfolioToken);
  readonly executionUrl = process.env.STOCKQUANT_TRADE_EXECUTION_URL ?? "http://127.0.0.1:3005";
  readonly replayWorkerUrl = process.env.STOCKQUANT_HISTORICAL_REPLAY_WORKER_URL ?? "http://127.0.0.1:3006";
  readonly marketDataUrl = process.env.STOCKQUANT_MARKET_DATA_URL ?? "http://127.0.0.1:3002";
  marketDataHeaders(extra: Record<string, string> = {}) {
    return { ...extra, "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${this.portfolioToken}` };
  }
  readonly researchAutomationUrl = process.env.STOCKQUANT_RESEARCH_AUTOMATION_URL ?? "http://127.0.0.1:3008";
  researchAutomationHeaders(extra: Record<string, string> = {}) {
    return {
      ...extra,
      "x-stockquant-service-id": "platform-api-service",
      authorization: `Bearer ${this.portfolioToken}`,
    };
  }
  portfolioHeaders(extra: Record<string, string> = {}) {
    return { ...extra, "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${this.portfolioToken}` };
  }
  replayWorkerHeaders(extra: Record<string, string> = {}) {
    return { ...extra, "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${this.portfolioToken}` };
  }
  quantResearchHeaders(extra: Record<string, string> = {}) {
    return { ...extra, "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${this.portfolioToken}` };
  }
  readonly v24Observation = new PostgresV24ObservationRepository(this.pool);
  readonly scheduler = new ContinuousPaperScheduler(new SystemClock(), this.v24Observation, new V24LiveObservationHandler(this.v24Observation, this.marketDataUrl, this.executionUrl, this.portfolioToken));

  async ready(): Promise<void> {
    if (this.portfolioToken.length < 32) throw new Error("portfolio API bearer credential is not configured");
    await this.pool.query("SELECT 1");
    const response = await fetch(`${this.portfolioApiUrl}/ready`, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) throw new Error("portfolio dependency is unavailable");
    const execution = await fetch(`${this.executionUrl}/ready`, { signal: AbortSignal.timeout(3000) });
    if (!execution.ok) throw new Error("execution dependency is unavailable");
    const replayWorker = await fetch(`${this.replayWorkerUrl}/ready`, { signal: AbortSignal.timeout(3000) });
    if (!replayWorker.ok) throw new Error("replay worker dependency is unavailable");
    if (process.env.STOCKQUANT_V24_AUTO_START === "true" && this.scheduler.status().status !== "RUNNING") {
      throw new Error("V2.4 continuous Paper scheduler is not running");
    }
  }

  async migrateV24(): Promise<void> {
    await this.v24Observation.migrate();
  }
}

@Controller()
export class HealthController {
  constructor(private readonly container: PlatformContainer) {}

  @Get("live")
  live() {
    return { status: "live", service: "platform-api-service" };
  }

  @Get("ready")
  async ready() {
    try {
      await this.container.ready();
      return { status: "ready", service: "platform-api-service", brokerMode: "FAKE" };
    } catch {
      throw new ServiceUnavailableException("required dependency is unavailable");
    }
  }
}

@Controller("api/v1")
export class PlatformController {
  constructor(private readonly container: PlatformContainer) {}

  @Get("session")
  session(@Res({ passthrough: true }) response: { setHeader: (name: string, value: string) => void }) {
    response.setHeader("Set-Cookie", `sq_session=${localUser}; HttpOnly; SameSite=Lax; Path=/`);
    return { userId: localUser, mode: "LOCAL_DEVELOPMENT" };
  }

  @Get("capabilities")
  capabilities() {
    return {
      environmentModes: ["BACKTEST", "PAPER", "SHADOW"],
      brokerMode: "FAKE",
      liveTradingEnabled: false,
      stage: "V1.1"
    };
  }

  @Get("accounts/:accountId")
  async account(
    @Headers("cookie") cookie: string | undefined,
    @Headers("x-stockquant-user") testHeader: string | undefined,
    @Param("accountId") accountId: string
  ) {
    const ownerId = identity(cookie, testHeader);
    const response = await fetch(`${this.container.portfolioApiUrl}/internal/v1/accounts/${encodeURIComponent(accountId)}/snapshot`, {
      headers: this.container.portfolioHeaders({ "x-stockquant-owner-id": ownerId })
    });
    const body = await response.json().catch(() => ({ error: "portfolio returned invalid JSON" })) as AccountSnapshot & { error?: string };
    if (response.status === 403) throw new ForbiddenException("account is outside owner scope");
    if (response.status === 404) throw new NotFoundException("account was not found");
    if (!response.ok) throw new ServiceUnavailableException(body.error ?? "portfolio account query failed");
    return {
      evidenceVersion: "v1-account-detail-1",
      ownerId,
      mode: { environmentMode: body.environmentMode, brokerMode: body.brokerMode },
      account: body
    };
  }

  @Post("acceptance/runs/:testRunId/accounts/us")
  @HttpCode(201)
  async initializeUsAccount(
    @Headers("cookie") cookie: string | undefined,
    @Headers("x-stockquant-user") testHeader: string | undefined,
    @Param("testRunId") testRunId: string
  ) {
    const ownerId = identity(cookie, testHeader);
    const run = await this.container.repository.find(testRunId, ownerId);
    if (!run) throw new NotFoundException("V1.1 run was not found in user scope");
    const command: InitializeAccountCommand = {
      fixtureAccountRef: "us-paper-empty-10000-usd",
      ownerId,
      market: "US_EQUITY",
      environmentMode: "PAPER",
      brokerMode: "FAKE",
      initialCash: { amount: "10000.00", currency: "USD" },
      namespace: `${run.namespace}-us-equity`,
      testRunId: run.testRunId,
      idempotencyKey: "v1.1-us-account-initialization"
    };
    const response = await fetch(`${this.container.portfolioApiUrl}/internal/v1/accounts/initialize`, {
      method: "POST",
      headers: this.container.portfolioHeaders({ "content-type": "application/json" }),
      body: JSON.stringify(command)
    });
    const body = await response.json().catch(() => ({ error: "portfolio returned invalid JSON" })) as { snapshot?: AccountSnapshot; replayed?: boolean; error?: string };
    if (response.status === 409) throw new UnprocessableEntityException("US account initialization conflicts with an existing payload");
    if (!response.ok) throw new ServiceUnavailableException(body.error ?? "US account initialization failed");
    return { evidenceVersion: "v1-dual-account-1", linkedTestRunId: run.testRunId, ownerId, account: body.snapshot, replayed: body.replayed };
  }

  @Get("acceptance/v1/v1.1/scenarios")
  scenarios(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) {
    identity(cookie, testHeader);
    return V11_SCENARIOS;
  }

  @Post("acceptance/v1/v1.1/runs")
  @HttpCode(202)
  async createRun(
    @Headers("cookie") cookie: string | undefined,
    @Headers("x-stockquant-user") testHeader: string | undefined,
    @Body() body: { scenarioId?: ScenarioId; seed?: number }
  ) {
    const ownerId = identity(cookie, testHeader);
    const scenarioId = body.scenarioId;
    if (!isV11Scenario(scenarioId)) {
      throw new ForbiddenException("scenario is not available for V1.1");
    }
    const run = await this.container.repository.create(ownerId, scenarioId, body.seed ?? 20260907);
    await this.container.runner.start(run.testRunId, ownerId);
    const completed = await this.container.repository.find(run.testRunId, ownerId);
    return { accepted: true, testRunId: run.testRunId, status: completed?.status ?? run.status };
  }

  @Get("acceptance/runs/:testRunId")
  async run(
    @Headers("cookie") cookie: string | undefined,
    @Headers("x-stockquant-user") testHeader: string | undefined,
    @Param("testRunId") testRunId: string
  ) {
    const run = await this.container.repository.find(testRunId, identity(cookie, testHeader));
    if (!run) throw new NotFoundException("test run was not found in user scope");
    return { ...run, assertions: await this.container.repository.assertions(testRunId) };
  }

  @Post("acceptance/runs/:testRunId/continue-recovery")
  @HttpCode(202)
  async continueRecovery(
    @Headers("cookie") cookie: string | undefined,
    @Headers("x-stockquant-user") testHeader: string | undefined,
    @Param("testRunId") testRunId: string
  ) {
    const ownerId = identity(cookie, testHeader);
    const run = await this.container.repository.find(testRunId, ownerId);
    if (!run) throw new NotFoundException("test run was not found in user scope");
    queueMicrotask(() => void this.container.runner.continueRecovery(testRunId, ownerId));
    return { accepted: true, testRunId };
  }

  @Get("acceptance/runs/:testRunId/evidence")
  async evidence(
    @Headers("cookie") cookie: string | undefined,
    @Headers("x-stockquant-user") testHeader: string | undefined,
    @Param("testRunId") testRunId: string
  ) {
    const ownerId = identity(cookie, testHeader);
    const run = await this.container.repository.find(testRunId, ownerId);
    const stageRun = run ? null : await this.container.stageRuns.find(testRunId, ownerId);
    if (!run && !stageRun) throw new NotFoundException("test run was not found in user scope");
    if (stageRun) return { evidenceVersion: "v2-stage-run-1", mode: { environmentMode: (stageRun.evidence as any).environmentMode, dataMode: (stageRun.evidence as any).dataMode, brokerMode: (stageRun.evidence as any).brokerMode }, run: stageRun, assertions: stageRun.assertions, manualConclusion: "NOT_RUN" };
    return {
      evidenceVersion: "v1.1-1",
      mode: { environmentMode: "PAPER", dataMode: "FIXTURE", brokerMode: "FAKE" },
      run,
      assertions: await this.container.repository.assertions(testRunId),
      manualConclusion: "NOT_RUN"
    };
  }
}

@Controller("api/v1/acceptance/v1/v1.2")
export class V12AcceptanceController {
  private readonly marketUrl = process.env.STOCKQUANT_MARKET_DATA_URL ?? "http://127.0.0.1:3002";
  private readonly quantUrl = process.env.STOCKQUANT_QUANT_RESEARCH_URL ?? "http://127.0.0.1:3003";
  private readonly service: V12AcceptanceService;
  constructor(private readonly container: PlatformContainer) { this.service = new V12AcceptanceService(container.stageRuns, this.marketUrl, this.quantUrl, container.portfolioToken, container.portfolioToken); }
  @Get("scenarios") scenarios(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return V12_SCENARIOS; }
  @Get("data/normal") normal(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return fetch(`${this.marketUrl}/v1/fixtures/normal/preview`, { headers: this.container.marketDataHeaders() }).then((r)=>r.json()); }
  @Get("data/bad-future") bad(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return fetch(`${this.marketUrl}/v1/fixtures/bad-future/preview`, { headers: this.container.marketDataHeaders() }).then((r)=>r.json()); }
  @Get("quant/probe") probe() { return fetch(`${this.quantUrl}/v1/qlib/probe`, { headers: this.container.quantResearchHeaders() }).then((r)=>r.json()); }
  @Get("quant/factors") factors() { return fetch(`${this.quantUrl}/v1/factors/preview`, { headers: this.container.quantResearchHeaders() }).then((r)=>r.json()); }
  @Get("quant/rdagent-probe") rdagent() { return fetch(`${this.quantUrl}/v1/rdagent/probe`, { headers: this.container.quantResearchHeaders() }).then((r)=>r.json()); }
  @Post("runs") @HttpCode(202) async create(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: { scenarioId?: V12Scenario; seed?: number }) { const ownerId = identity(cookie, testHeader); const scenarioId = body.scenarioId; if (!V12_SCENARIOS.some((item) => item.scenarioId === scenarioId)) throw new ForbiddenException("scenario is not available for V1.2"); return this.service.create(ownerId, scenarioId as V12Scenario, body.seed ?? 20260907); }
  @Get("runs/:testRunId") async get(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") id: string) { const run = await this.service.find(id, identity(cookie, testHeader)); if (!run || run.stageId !== "V1.2") throw new NotFoundException("V1.2 run was not found in user scope"); return run; }
}

@Controller("api/v1/acceptance/v1/v1.3")
export class V13AcceptanceController {
  private readonly engine = new V13TradingEngine();
  private readonly service: PersistentStageRunService;
  constructor(private readonly container: PlatformContainer) { this.service = new PersistentStageRunService(container.stageRuns, "V1.3", (scenarioId, seed) => this.engine.run(scenarioId as V13Scenario, seed)); }
  @Get("scenarios") scenarios(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return V13_SCENARIOS; }
  @Post("runs") @HttpCode(202) async create(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: { scenarioId?: V13Scenario; seed?: number }) {
    const ownerId = identity(cookie, testHeader);
    const scenarioId = body.scenarioId;
    if (!V13_SCENARIOS.some((item) => item.scenarioId === scenarioId)) throw new ForbiddenException("scenario is not available for V1.3");
    return this.service.create(ownerId, scenarioId as V13Scenario, body.seed ?? 20260907);
  }
  @Get("runs/:testRunId") async get(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") id: string) { const run = await this.service.find(id, identity(cookie, testHeader)); if (!run || run.stageId !== "V1.3") throw new NotFoundException("V1.3 run was not found in user scope"); return run; }
}

@Controller("api/v1/acceptance/v1/v1.4")
export class V14AcceptanceController {
  private readonly engine = new V14BacktestEngine();
  private readonly service: PersistentStageRunService;
  constructor(private readonly container: PlatformContainer) { this.service = new PersistentStageRunService(container.stageRuns, "V1.4", (scenarioId, seed) => this.engine.run(scenarioId as V14Scenario, seed)); }
  @Get("scenarios") scenarios(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return V14_SCENARIOS; }
  @Post("runs") @HttpCode(202) async create(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: { scenarioId?: V14Scenario; seed?: number }) { const ownerId = identity(cookie, testHeader); if (!V14_SCENARIOS.some((s) => s.scenarioId === body.scenarioId)) throw new ForbiddenException("scenario is not available for V1.4"); return this.service.create(ownerId, body.scenarioId as V14Scenario, body.seed ?? 20260907); }
  @Get("runs/:testRunId") async get(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") id: string) { const run = await this.service.find(id, identity(cookie, testHeader)); if (!run || run.stageId !== "V1.4") throw new NotFoundException("V1.4 run was not found in user scope"); return run; }
}

@Controller("api/v1/acceptance/v1/v1.5")
export class V15AcceptanceController {
  private readonly engine = new V15OrchestrationEngine();
  private readonly service: PersistentStageRunService;
  constructor(private readonly container: PlatformContainer) { this.service = new PersistentStageRunService(container.stageRuns, "V1.5", (scenarioId, seed) => this.engine.run(scenarioId as V15Scenario, seed)); }
  @Get("scenarios") scenarios(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return V15_SCENARIOS; }
  @Post("runs") @HttpCode(202) async create(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: { scenarioId?: V15Scenario; seed?: number }) { const ownerId = identity(cookie, testHeader); if (!V15_SCENARIOS.some((s) => s.scenarioId === body.scenarioId)) throw new ForbiddenException("scenario is not available for V1.5"); return this.service.create(ownerId, body.scenarioId as V15Scenario, body.seed ?? 20260907); }
  @Get("runs/:testRunId") async get(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") id: string) { const run = await this.service.find(id, identity(cookie, testHeader)); if (!run || run.stageId !== "V1.5") throw new NotFoundException("V1.5 run was not found in user scope"); return run; }
}

@Controller("api/v1/acceptance/v2/v2.4")
export class V24AcceptanceController {
  private readonly engine = new V24ContinuousPaperEngine();
  private readonly scheduler: ContinuousPaperScheduler;
  @Get("scenarios") scenarios(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return V24_SCENARIOS; }
  @Get("preview") preview(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return { stageId: "V2.4", environmentMode: "PAPER", dataMode: "NOT_CONNECTED", brokerMode: "FAKE", executionPolicyStatus: "PREPARATION_ONLY", mandateStatus: "PREPARATION_ONLY", samplingIntervalMinutes: 30, executionWindow: "09:31-09:35", observationDays: 0, executionGate: "BLOCKED", liveTradingEnabled: false }; }
  @Get("paper-readiness") async paperReadiness(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Query("market") market?: string): Promise<V24PaperReadiness> {
    identity(cookie, testHeader);
    if (market !== "CN_A" && market !== "US_EQUITY") throw new UnprocessableEntityException("market must be CN_A or US_EQUITY");
    try {
      const response = await fetch(`${this.container.executionUrl}/internal/v1/v24/paper-readiness?market=${encodeURIComponent(market)}`, {
        headers: this.container.portfolioHeaders(), signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw new ServiceUnavailableException(`Trade Execution readiness returned ${response.status}`);
      return await response.json() as V24PaperReadiness;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException("Trade Execution readiness is unavailable");
    }
  }
  @Get("scheduler/status") schedulerStatus(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return this.scheduler.status(); }
  @Get("observations") observations(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { return this.container.v24Observation.listObservationsForOwner(identity(cookie, testHeader)); }
  @Get("observation-summary") observationSummary(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return this.container.v24Observation.observationSummary(20); }
  @Get("observation-events") observationEvents(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Query("limit") limit?: string) { identity(cookie, testHeader); const parsed = Number(limit); return this.container.v24Observation.listEvents(Number.isFinite(parsed) && parsed > 0 ? Math.min(5000, Math.floor(parsed)) : 1000); }
  @Post("scheduler/start") @HttpCode(202) async schedulerStart(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return { accepted: true, scheduler: await this.scheduler.start() }; }
  @Post("scheduler/stop") async schedulerStop(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return this.scheduler.stop(); }
  @Post("scheduler/tick") async schedulerTick(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return this.scheduler.tick(); }
  @Post("runs") @HttpCode(202) async create(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: { scenarioId?: V24Scenario; seed?: number }) { const ownerId = identity(cookie, testHeader); const scenarioId = body.scenarioId; if (!V24_SCENARIOS.some((item) => item.scenarioId === scenarioId)) throw new ForbiddenException("scenario is not available for V2.4"); const run = this.engine.run(scenarioId as V24Scenario, body.seed ?? 20260907); const namespace = `v2-4-${scenarioId}-${run.testRunId}`; await this.container.stageRuns.save({ ...run, ownerId, stageId: "V2.4", scenarioVersion: "1.0.0", namespace, evidence: run }); return { accepted: true, testRunId: run.testRunId, status: run.status }; }
  constructor(private readonly container: PlatformContainer) { this.scheduler = container.scheduler; }
  @Get("runs/:testRunId") async get(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") id: string) { const run = await this.container.stageRuns.find(id, identity(cookie, testHeader)); if (!run || run.stageId !== "V2.4") throw new NotFoundException("V2.4 run was not found"); return run; }
  @Get("runs/:testRunId/revisions") async revisions(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") id: string) {
    const ownerId = identity(cookie, testHeader);
    const run = await this.container.stageRuns.find(id, ownerId);
    if (!run || run.stageId !== "V2.4" || run.scenarioId !== "observation") throw new NotFoundException("V2.4 observation run was not found");
    return { testRunId: id, revisions: await this.container.v24Observation.listRunRevisions(id, ownerId) };
  }
}

@Controller("api/v1/acceptance/v2/v2.5")
export class V25AcceptanceController {
  private readonly engine = new V25DataScaleEngine();
  constructor(private readonly container: PlatformContainer) {}
  @Get("scenarios") scenarios() { return V25_SCENARIOS; }
  @Get("preview") preview() { return { stageId: "V2.5", profile: "S2", securities: 20, sessions: 60, rows: 1200, dataVersion: "v2.5-cn-minute-20x60-v1", environmentMode: "BACKTEST", dataMode: "FIXTURE", brokerMode: "FAKE", observationGate: "V2.4_20_TRADING_DAYS_PENDING" }; }
  @Post("runs") @HttpCode(202) async create(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: { scenarioId?: V25Scenario; seed?: number }) {
    const ownerId = identity(cookie, testHeader);
    const scenarioId = body.scenarioId ?? "normal";
    if (!V25_SCENARIOS.some((item) => item.scenarioId === scenarioId)) throw new ForbiddenException("scenario is not available for V2.5");
    const result = this.engine.run(scenarioId, body.seed ?? 20260907);
    await this.container.stageRuns.save({ ...result, ownerId });
    return { accepted: true, testRunId: result.testRunId, status: result.status };
  }
  @Get("runs/:testRunId") async get(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") id: string) {
    const run = await this.container.stageRuns.find(id, identity(cookie, testHeader));
    if (!run || run.stageId !== "V2.5") throw new NotFoundException("V2.5 run was not found");
    return run;
  }
}

@Controller("api/v1/acceptance/v2/dc06")
export class Dc06AcceptanceController {
  private readonly runs = new Map<string, any>();
  private readonly projectId = process.env.STOCKQUANT_DC06_PROJECT_ID ?? "dc06-web";
  private readonly projectToken = process.env.STOCKQUANT_DC06_PROJECT_TOKEN;
  constructor(private readonly container: PlatformContainer) {}
  @Get("scenarios") scenarios() { return [{ scenarioId: "normal", title: "项目分页与导出脱敏", expected: "同项目读取成功、敏感字段不出现在导出结果" }, { scenarioId: "rejection", title: "跨项目访问拒绝", expected: "资源项目不匹配返回403" }, { scenarioId: "recovery", title: "令牌错误后恢复", expected: "错误令牌拒绝，正确令牌可继续读取" }]; }
  @Get("preview") preview() { return { stageId: "DC-06", projectId: this.projectId, dataVersion: "dc06-web-v1", environmentMode: "PAPER", brokerMode: "FAKE", tokenConfigured: Boolean(this.projectToken), artifactMode: Boolean(process.env.STOCKQUANT_DC06_ARTIFACT_ID) }; }
  private headers(token = this.projectToken): Record<string, string> {
    const headers: Record<string, string> = { "content-type": "application/json", "x-stockquant-project-id": this.projectId };
    if (token) headers["x-stockquant-project-token"] = token;
    else headers["x-stockquant-scopes"] = "DATA_READ,DATA_EXPORT";
    return headers;
  }
  private async call(path: string, body: Record<string, unknown>, token = this.projectToken): Promise<{ status: number; body: any }> {
    const response = await fetch(`${this.container.marketDataUrl}${path}`, { method: "POST", headers: this.headers(token), body: JSON.stringify(body) });
    const text = await response.text();
    let parsed: any; try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }
    return { status: response.status, body: parsed };
  }
  @Post("runs") @HttpCode(202) async create(@Body() body: { scenarioId?: "normal" | "rejection" | "recovery"; seed?: number }) {
    const scenarioId = body.scenarioId ?? "normal"; const testRunId = randomUUID();
    if (!["normal", "rejection", "recovery"].includes(scenarioId)) throw new ForbiddenException("scenario is not available for DC-06");
    const items = [{ symbol: "600000.SH", close: 10.2, token: "must-be-redacted" }, { symbol: "000001.SZ", close: 11.3 }];
    const assertions: any[] = [];
    if (scenarioId === "normal") {
      const page = await this.call("/v2/data/page", { projectId: this.projectId, dataVersion: "dc06-web-v1", items, pageSize: 1 });
      const exported = await this.call("/v2/data/export", { projectId: this.projectId, dataVersion: "dc06-web-v1", items });
      assertions.push({ assertionId: "DC06-WEB-PAGE-001", status: page.status === 200 && page.body.items?.length === 1 ? "PASS" : "FAIL", expected: "200 and one paged row", actual: page.body });
      assertions.push({ assertionId: "DC06-WEB-REDACTION-001", status: exported.status === 200 && !JSON.stringify(exported.body.items).includes("must-be-redacted") ? "PASS" : "FAIL", expected: "token absent from export", actual: exported.body });
    } else if (scenarioId === "rejection") {
      const rejected = await this.call("/v2/data/page", { projectId: "other-project", dataVersion: "dc06-web-v1", items });
      assertions.push({ assertionId: "DC06-WEB-AUTH-001", status: rejected.status === 403 ? "PASS" : "FAIL", expected: 403, actual: rejected.status });
    } else {
      const denied = await this.call("/v2/data/page", { projectId: this.projectId, dataVersion: "dc06-web-v1", items }, "wrong-token");
      const recovered = await this.call("/v2/data/page", { projectId: this.projectId, dataVersion: "dc06-web-v1", items }, this.projectToken);
      assertions.push({ assertionId: "DC06-WEB-RECOVERY-001", status: denied.status === 403 && recovered.status === 200 ? "PASS" : "FAIL", expected: "wrong token 403 then correct token 200", actual: { denied: denied.status, recovered: recovered.status } });
    }
    const result = { testRunId, stageId: "DC-06", scenarioId, status: assertions.every((item) => item.status === "PASS") ? "COMPLETED" : "FAILED", seed: body.seed ?? 20260907, assertions };
    this.runs.set(testRunId, result); return { accepted: true, testRunId, status: result.status };
  }
  @Get("runs/:testRunId") get(@Param("testRunId") id: string) { const run = this.runs.get(id); if (!run) throw new NotFoundException("DC-06 run was not found"); return run; }
}

@Controller("api/v1/acceptance/v2/dc08")
export class Dc08AcceptanceController {
  constructor(private readonly container: PlatformContainer) {}
  @Get("preview")
  async preview(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) {
    identity(cookie, testHeader);
    const subscriptionId = process.env.STOCKQUANT_DC08A_SUBSCRIPTION_ID ?? "dc08a-20260914-short-v1";
    const [ready, schedule, gaps] = await Promise.all([
      fetch(`${this.container.marketDataUrl}/ready`).then((response) => response.json()),
      fetch(`${this.container.marketDataUrl}/v2/collection-schedules/${subscriptionId}`, { headers: this.container.marketDataHeaders() }).then((response) => response.json()),
      fetch(`${this.container.marketDataUrl}/v2/minute/gaps/${subscriptionId}`, { headers: this.container.marketDataHeaders() }).then((response) => response.json()),
    ]);
    return { stageId: "DC-08A", subscriptionId, ready, schedule, gaps, webMode: "READ_ONLY", note: "页面只读；正式启用由受保护的定时脚本执行" };
  }
}

@Controller("api/v1/acceptance/v2/v2.1")
export class V21AcceptanceController {
  private readonly marketUrl = process.env.STOCKQUANT_MARKET_DATA_URL ?? "http://127.0.0.1:3002";
  constructor(private readonly container: PlatformContainer) {}
  @Get("scenarios") scenarios(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return [
    { scenarioId: "normal", version: "1.0.0", title: "来源能力与小股票池", expected: "4 sources configured、≤100 securities" },
    { scenarioId: "capacity", version: "1.0.0", title: "101只容量拒绝", expected: "WATCHLIST_LIMIT" },
    { scenarioId: "stale", version: "1.0.0", title: "陈旧快照与新闻去重", expected: "陈旧提示、重复新闻只保留一条" }
  ]; }
  @Get("sources") sources(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return fetch(`${this.marketUrl}/v2/sources`, { headers: this.container.marketDataHeaders() }).then((r) => r.json()); }
  @Get("sources/smoke") sourceSmoke(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return fetch(`${this.marketUrl}/v2/sources/smoke`, { headers: this.container.marketDataHeaders() }).then((r) => r.json()); }
  @Get("watchlist") watchlist(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return fetch(`${this.marketUrl}/v2/watchlist`, { headers: this.container.marketDataHeaders() }).then((r) => r.json()); }
  @Get("quotes") quotes(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return fetch(`${this.marketUrl}/v2/quote/preview`, { headers: this.container.marketDataHeaders() }).then((r) => r.json()); }
  @Get("news") news(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return fetch(`${this.marketUrl}/v2/news/preview`, { headers: this.container.marketDataHeaders() }).then((r) => r.json()); }
  @Get("news/live") liveNews(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return fetch(`${this.marketUrl}/v2/news/live`, { headers: this.container.marketDataHeaders() }).then((r) => r.json()); }
  @Get("sampling") sampling(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return fetch(`${this.marketUrl}/v2/sampling`, { headers: this.container.marketDataHeaders() }).then((r) => r.json()); }
  @Put("sampling") samplingUpdate(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: { intervalMinutes?: number }) { identity(cookie, testHeader); return fetch(`${this.marketUrl}/v2/sampling`, { method: "PUT", headers: this.container.marketDataHeaders({ "content-type": "application/json" }), body: JSON.stringify(body) }).then(async (r) => { if (!r.ok) throw new UnprocessableEntityException(await r.text()); return r.json(); }); }
  @Post("runs") @HttpCode(202) async createRun(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: { scenarioId?: string; seed?: number }) { const ownerId = identity(cookie, testHeader); const testRunId = this.container.stageRuns.newId(); const scenarioId = body.scenarioId ?? "normal"; if (!["normal", "capacity", "stale", "rejection", "recovery"].includes(scenarioId)) throw new ForbiddenException("scenario is not available for V2.1"); const run: any = { testRunId, stageId: "V2.1", scenarioId, status: "COMPLETED", seed: body.seed ?? 20260907, assertions: [] }; if (scenarioId === "normal") { const [sources, sampling, news] = await Promise.all([this.sources(cookie, testHeader), this.sampling(cookie, testHeader), this.liveNews(cookie, testHeader)]); run.assertions = [{ assertionId: "V2.1-SOURCE-001", status: sources.sources?.filter((s: any) => s.kind === "QUOTE").some((s: any) => s.circuit === "HEALTHY") && sources.sources?.filter((s: any) => s.kind === "NEWS").length >= 2 ? "PASS" : "FAIL", expected: "1 quote + 2 news sources", actual: sources.sources }, { assertionId: "V2.1-SAMPLING-001", status: [20, 30].includes(sampling.intervalMinutes) ? "PASS" : "FAIL", expected: [20, 30], actual: sampling.intervalMinutes }, { assertionId: "V2.1-NEWS-001", status: news.status === "PASS" ? "PASS" : "FAIL", expected: "PASS", actual: news.status }]; } else if (scenarioId === "rejection" || scenarioId === "capacity") { const response = await fetch(`${this.marketUrl}/v2/watchlist`, { method: "PUT", headers: this.container.marketDataHeaders({ "content-type": "application/json" }), body: JSON.stringify({ securities: Array.from({ length: 101 }, (_, i) => `${String(600000 + i).padStart(6, "0")}.SH`) }) }); run.assertions = [{ assertionId: "V2.1-WATCHLIST-001", status: response.status === 422 ? "PASS" : "FAIL", expected: 422, actual: response.status }]; } else { await fetch(`${this.marketUrl}/v2/sources/tencent-quote/fail`, { method: "POST", headers: this.container.marketDataHeaders() }); const failed = await this.sources(cookie, testHeader); await fetch(`${this.marketUrl}/v2/sources/tencent-quote/recover`, { method: "POST", headers: this.container.marketDataHeaders() }); const recovered = await this.sources(cookie, testHeader); run.assertions = [{ assertionId: "V2.1-BREAKER-001", status: failed.sources?.find((s: any) => s.sourceId === "tencent-quote")?.circuit === "OPEN" && recovered.sources?.find((s: any) => s.sourceId === "tencent-quote")?.circuit === "HEALTHY" ? "PASS" : "FAIL", expected: "OPEN then HEALTHY", actual: { failed, recovered } }]; } await this.container.stageRuns.save({ testRunId, stageId: "V2.1", scenarioId, scenarioVersion: "1.0.0", ownerId, status: run.status, seed: run.seed, assertions: run.assertions, evidence: { environmentMode: "PAPER", dataMode: "REAL", brokerMode: "FAKE" } }); return { accepted: true, testRunId, status: run.status }; }
  @Get("runs/:testRunId") async getRun(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") id: string) { const run = await this.container.stageRuns.find(id, identity(cookie, testHeader)); if (!run || run.stageId !== "V2.1") throw new NotFoundException("V2.1 run was not found"); return run; }
  @Put("watchlist") @HttpCode(200) update(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: { securities?: string[] }) { identity(cookie, testHeader); return fetch(`${this.marketUrl}/v2/watchlist`, { method: "PUT", headers: this.container.marketDataHeaders({ "content-type": "application/json" }), body: JSON.stringify(body) }).then(async (r) => { if (!r.ok) throw new UnprocessableEntityException(await r.text()); return r.json(); }); }
}

@Controller("api/v1/acceptance/v2/v2.2")
export class V22AcceptanceController {
  private readonly marketUrl = process.env.STOCKQUANT_MARKET_DATA_URL ?? "http://127.0.0.1:3002";
  constructor(private readonly container: PlatformContainer) {}
  @Get("scenarios") scenarios(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return [{ scenarioId: "normal", title: "分钟文件导入", expected: "6 valid bars、2 securities、PUBLISHED" }, { scenarioId: "rejection", title: "坏行质量拒绝", expected: "OHLC_INVALID、DUPLICATE_CONFLICT、NON_TRADING_SESSION" }, { scenarioId: "recovery", title: "重复导入幂等", expected: "same SHA returns idempotent=true" }, { scenarioId: "uploaded-csv", title: "验证已发布分钟文件导入", expected: "TestRun记录已完成上传的格式、importId、DataVersion、SHA-256与行数" }]; }
  @Get("preview") preview(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return fetch(`${this.marketUrl}/v2/minute/preview`, { headers: this.container.marketDataHeaders() }).then(async (response) => { const result = await response.json(); if (!response.ok) throw new ServiceUnavailableException(`Market Data preview failed: ${response.status}`); return result; }); }
  @Post("import") import(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: { fixture?: string }) { identity(cookie, testHeader); return fetch(`${this.marketUrl}/v2/minute/import`, { method: "POST", headers: this.container.marketDataHeaders({ "content-type": "application/json" }), body: JSON.stringify(body) }).then((r) => r.json()); }
  @Post("csv/preview") @HttpCode(200) csvPreview(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: Record<string, unknown>) { identity(cookie, testHeader); return fetch(`${this.marketUrl}/v2/minute/csv/preview`, { method: "POST", headers: this.container.marketDataHeaders({ "content-type": "application/json" }), body: JSON.stringify(body) }).then(async (response) => { const result = await response.json(); if (!response.ok) throw new UnprocessableEntityException(result); return result; }); }
  @Post("csv/import") @HttpCode(200) csvImport(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: Record<string, unknown>) { identity(cookie, testHeader); return fetch(`${this.marketUrl}/v2/minute/csv/import`, { method: "POST", headers: this.container.marketDataHeaders({ "content-type": "application/json" }), body: JSON.stringify(body) }).then(async (response) => { const result = await response.json(); if (!response.ok) throw new UnprocessableEntityException(result); return result; }); }
  @Post(":format/uploads") @HttpCode(200) async createCsvUpload(@Param("format") format: string, @Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: { uploadId?: string; expectedSha256?: string; expectedBytes?: number; metadata?: Record<string, unknown> }) { const ownerId = identity(cookie, testHeader); if (!["csv", "parquet"].includes(format)) throw new NotFoundException("minute file format is not supported"); if (body.uploadId !== undefined && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(body.uploadId)) throw new UnprocessableEntityException("uploadId must be a UUID"); const uploadId = body.uploadId ?? randomUUID(); const response = await fetch(`${this.marketUrl}/v2/minute/${format}/uploads`, { method: "POST", headers: this.container.marketDataHeaders({ "content-type": "application/json", "x-stockquant-owner-id": ownerId }), body: JSON.stringify({ ...body, uploadId }) }); const result = await response.json(); if (!response.ok) throw new HttpException(result, response.status); return result; }
  @Put(":format/uploads/:uploadId/chunks/:index") @HttpCode(200) async putCsvUploadChunk(@Param("format") format: string, @Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("uploadId") uploadId: string, @Param("index") index: string, @Body() body: { contentBase64?: string; sha256?: string }) { const ownerId = identity(cookie, testHeader); if (!["csv", "parquet"].includes(format)) throw new NotFoundException("minute file format is not supported"); const response = await fetch(`${this.marketUrl}/v2/minute/${format}/uploads/${encodeURIComponent(uploadId)}/chunks/${encodeURIComponent(index)}`, { method: "PUT", headers: this.container.marketDataHeaders({ "content-type": "application/json", "x-stockquant-owner-id": ownerId }), body: JSON.stringify(body) }); const result = await response.json(); if (!response.ok) throw new HttpException(result, response.status); return result; }
  @Get(":format/uploads/:uploadId") async csvUploadProgress(@Param("format") format: string, @Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("uploadId") uploadId: string) { const ownerId = identity(cookie, testHeader); if (!["csv", "parquet"].includes(format)) throw new NotFoundException("minute file format is not supported"); const response = await fetch(`${this.marketUrl}/v2/minute/${format}/uploads/${encodeURIComponent(uploadId)}`, { headers: this.container.marketDataHeaders({ "x-stockquant-owner-id": ownerId }) }); const result = await response.json(); if (!response.ok) throw new NotFoundException(result.code ?? "minute upload not found"); return result; }
  @Post(":format/uploads/:uploadId/:action") @HttpCode(200) async csvUploadAction(@Param("format") format: string, @Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("uploadId") uploadId: string, @Param("action") action: string) { const ownerId = identity(cookie, testHeader); if (!["csv", "parquet"].includes(format)) throw new NotFoundException("minute file format is not supported"); if (!["preview", "finalize", "cancel"].includes(action)) throw new NotFoundException("minute upload action not found"); const response = await fetch(`${this.marketUrl}/v2/minute/${format}/uploads/${encodeURIComponent(uploadId)}/${action}`, { method: "POST", headers: this.container.marketDataHeaders({ "content-type": "application/json", "x-stockquant-owner-id": ownerId }), body: "{}" }); const result = await response.json(); if (!response.ok) throw new HttpException(result, response.status); return result; }
  @Get("imports/:version") importDetails(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("version") version: string) { identity(cookie, testHeader); return fetch(`${this.marketUrl}/v2/minute/imports/${encodeURIComponent(version)}`, { headers: this.container.marketDataHeaders() }).then(async (response) => { const result = await response.json(); if (!response.ok) throw new NotFoundException(result.code ?? "minute import not found"); return result; }); }
  @Get("imports/:version/bars") importBars(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("version") version: string, @Query("cursor") cursor = "0", @Query("pageSize") pageSize = "100", @Query("securityId") securityId?: string) { identity(cookie, testHeader); const query = new URLSearchParams({ cursor, pageSize, ...(securityId ? { securityId } : {}) }); return fetch(`${this.marketUrl}/v2/minute/imports/${encodeURIComponent(version)}/bars?${query}`, { headers: this.container.marketDataHeaders() }).then(async (response) => { const result = await response.json(); if (!response.ok) throw new UnprocessableEntityException(result.code ?? "minute import page failed"); return result; }); }
  @Post("runs") @HttpCode(202) async run(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: { scenarioId?: string; seed?: number; uploadId?: string; fileFormat?: "CSV" | "PARQUET" }) {
    const ownerId = identity(cookie, testHeader); const testRunId = this.container.stageRuns.newId(); const scenarioId = body.scenarioId ?? "normal";
    const run: any = { testRunId, stageId: "V2.2", scenarioId, status: "COMPLETED", seed: body.seed ?? 20260907, assertions: [] };
    let evidence: Record<string, unknown> = { environmentMode: "BACKTEST", dataMode: "FIXTURE", brokerMode: "FAKE" };
    if (scenarioId === "uploaded-csv") {
      const fileFormat = body.fileFormat ?? "CSV";
      if (fileFormat !== "CSV" && fileFormat !== "PARQUET") throw new UnprocessableEntityException("unsupported minute file format");
      if (!body.uploadId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(body.uploadId)) throw new UnprocessableEntityException("uploaded-csv scenario requires a valid uploadId");
      const response = await fetch(`${this.marketUrl}/v2/minute/${fileFormat.toLowerCase()}/uploads/${encodeURIComponent(body.uploadId)}`, { headers: this.container.marketDataHeaders({ "x-stockquant-owner-id": ownerId }) });
      if (!response.ok) throw new NotFoundException("completed minute file upload was not found in the current user scope");
      const progress: any = await response.json(); const imported = progress.result;
      const valid = progress.status === "COMPLETED" && imported?.status === "PUBLISHED" && typeof imported.importId === "string" && typeof imported.version === "string" && /^[0-9a-f]{64}$/iu.test(imported.sha256 ?? "") && Number.isSafeInteger(imported.accepted) && imported.accepted > 0;
      run.assertions = [{ assertionId: "V2.2-CSV-UPLOAD-001", status: valid ? "PASS" : "FAIL", expected: "owner-scoped completed upload with PUBLISHED import, DataVersion, SHA-256 and positive accepted row count", actual: { uploadId: body.uploadId, fileFormat, status: progress.status, importId: imported?.importId ?? null, version: imported?.version ?? null, sha256: imported?.sha256 ?? null, accepted: imported?.accepted ?? null, researchUseAllowed: imported?.manifest?.researchUseAllowed ?? false } }];
      if (!valid) run.status = "FAILED";
      evidence = { environmentMode: "BACKTEST", dataMode: "RECORDED", brokerMode: "FAKE", upload: { uploadId: body.uploadId, fileFormat, importId: imported?.importId ?? null, version: imported?.version ?? null, sha256: imported?.sha256 ?? null, accepted: imported?.accepted ?? null, researchUseAllowed: imported?.manifest?.researchUseAllowed ?? false } };
    } else {
      if (!["normal", "rejection", "recovery"].includes(scenarioId)) throw new ForbiddenException("scenario is not available for V2.2");
      if (scenarioId === "normal") { const result: any = await this.import(cookie, testHeader, { fixture: "normal" }); run.assertions = [{ assertionId: "V2.2-MINUTE-NORMAL-001", status: result.status === "PUBLISHED" && result.accepted === 6 ? "PASS" : "FAIL", expected: { accepted: 6, status: "PUBLISHED" }, actual: result }]; }
      else if (scenarioId === "rejection") { const result: any = await this.import(cookie, testHeader, { fixture: "bad" }); run.assertions = [{ assertionId: "V2.2-MINUTE-QUALITY-001", status: result.status === "REJECTED" && result.errors?.length >= 3 ? "PASS" : "FAIL", expected: "three quality errors", actual: result }]; }
      else { const first: any = await this.import(cookie, testHeader, { fixture: "normal" }); const second: any = await this.import(cookie, testHeader, { fixture: "normal" }); run.assertions = [{ assertionId: "V2.2-MINUTE-IDEMPOTENCY-001", status: second.idempotent === true && second.sha256 === first.sha256 ? "PASS" : "FAIL", expected: "idempotent duplicate", actual: { first, second } }]; }
    }
    await this.container.stageRuns.save({ testRunId, stageId: "V2.2", scenarioId, scenarioVersion: "1.0.0", ownerId, status: run.status, seed: run.seed, assertions: run.assertions, evidence });
    return { accepted: true, testRunId, status: run.status };
  }
  @Get("runs/:testRunId") async get(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") id: string) { const run = await this.container.stageRuns.find(id, identity(cookie, testHeader)); if (!run || run.stageId !== "V2.2") throw new NotFoundException("V2.2 run was not found"); return run; }
}

@Controller("api/v1/acceptance/v2/v2.3")
export class V23AcceptanceController {
  private readonly engine = new V23ReplayEngine();
  constructor(private readonly container: PlatformContainer) {}
  @Get("scenarios") scenarios() { return V23_SCENARIOS; }
  @Get("preview") preview() { return { fixtureVersion: "v2.3-replay-bars-1", barType: "MINUTE_BAR", barCount: 4, securities: ["600000.SH", "000001.SZ"], dates: ["2024-01-02", "2024-01-03"], mode: "BACKTEST" }; }
  @Post("runs") @HttpCode(202) async run(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: { scenarioId?: V23Scenario; seed?: number; defer?: boolean }) {
    const ownerId = identity(cookie, testHeader); const scenarioId = body.scenarioId ?? "normal";
    if (!V23_SCENARIOS.some((s) => s.scenarioId === scenarioId)) throw new ForbiddenException("scenario is not available for V2.3");
    const root = resolve(process.env.STOCKQUANT_PROJECT_ROOT ?? process.cwd());
    const csv = await readFile(resolve(root, "fixtures/v2/v2.3/replay_bars.csv"), "utf8");
    const bars = parseReplayBars(csv); const testRunId = this.container.stageRuns.newId();
    const result = this.engine.run(scenarioId, body.seed ?? 20260907, bars, testRunId);
    if (scenarioId !== "rejection") {
      const namespace = `v2-3-${scenarioId}-${testRunId}`;
      const baseReplayBars = bars.filter((bar) => bar.security === "600000.SH").map((bar) => ({ timestamp: bar.timestamp, open: bar.open.toFixed(4), volume: bar.volume }));
      const replayBars = body.defer ? Array.from({ length: 40 }, (_, index) => ({ ...baseReplayBars[index % baseReplayBars.length], timestamp: new Date(Date.parse(baseReplayBars[index % baseReplayBars.length].timestamp) + index * 60_000).toISOString() })) : baseReplayBars;
      if (replayBars.length < 2) throw new ServiceUnavailableException("replay fixture lacks multi-bar execution inputs");
      const workerResponse = await this.replayClient().startHistoricalMultiBarReplay({ testRunId, namespace, ownerId, scenarioId, seed: body.seed ?? 20260907, bars: replayBars }, body.defer === true).catch((error: unknown) => {
        if (error instanceof HistoricalReplayHttpError) throw new ServiceUnavailableException(`historical replay worker failed: ${error.status}`);
        throw error;
      });
      if (body.defer) {
        result.status = "RUNNING";
        (result.evidence as any).crossService = { namespace, worker: "historical-replay-worker", deferred: true, bars: replayBars.length };
        await this.container.stageRuns.save({ ...result, ownerId });
        return { accepted: true, testRunId: result.testRunId, status: result.status };
      }
      const worker = workerResponse as any;
      const executions = Array.isArray(worker.executions) ? worker.executions : [];
      const barriers = Array.isArray(worker.eventLog) ? worker.eventLog : [];
      const consistent = executions.length === replayBars.length && barriers.length === replayBars.length && barriers.every((events: string[]) => events.at(-1) === "LEDGER_COMMITTED") && worker.checkpoint?.cursor === replayBars.length && worker.checkpoint?.eventSequence === replayBars.length * 5 && worker.snapshot?.ledgerVersion === 1 + replayBars.length && worker.ledgerVersion === worker.snapshot?.ledgerVersion && worker.research?.status === "COMPLETED" && worker.research?.adapter === "fixture-summary" && worker.research?.dataMode === "FIXTURE" && worker.research?.environmentMode === "BACKTEST" && worker.research?.modelTraining === "NOT_RUN" && worker.research?.independentModelValidation === "NOT_RUN" && worker.research?.modelCalls === "NOT_RUN" && worker.research?.assertions?.every((item: any) => item.status === "PASS" || item.status === "NOT_APPLICABLE");
      result.assertions.push({ assertionId: "V2.3-CROSS-SERVICE-004", status: consistent ? "PASS" : "FAIL", expected: "multi-bar FakeBroker fills commit an ordered portfolio ledger barrier", actual: worker });
      result.status = result.assertions.every((item) => item.status === "PASS") ? "COMPLETED" : "FAILED";
      (result.evidence as any).crossService = { ...worker, namespace, worker: "historical-replay-worker" };
    }
    await this.container.stageRuns.save({ ...result, ownerId });
    return { accepted: true, testRunId: result.testRunId, status: result.status };
  }
  @Get("runs/:testRunId") async get(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") id: string) { const run = await this.container.stageRuns.find(id, identity(cookie, testHeader)); if (!run || run.stageId !== "V2.3") throw new NotFoundException("V2.3 run was not found"); return run; }
  @Get("runs/:testRunId/worker") async workerStatus(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") id: string) { identity(cookie, testHeader); return this.workerRequest(id); }
  @Post("runs/:testRunId/worker/:action") async workerAction(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") id: string, @Param("action") action: "pause" | "resume" | "cancel") { identity(cookie, testHeader); if (!["pause", "resume", "cancel"].includes(action)) throw new UnprocessableEntityException("unsupported replay worker action"); return this.workerRequest(id, action); }
  private replayClient() { return new GeneratedHistoricalReplayClient(this.container.replayWorkerUrl, this.container.portfolioToken); }
  private async workerRequest(testRunId: string, action?: "pause" | "resume" | "cancel") {
    const client = this.replayClient();
    try {
      if (action) return await client.controlHistoricalReplayRun(testRunId, action);
      return await client.readHistoricalReplayRun(testRunId);
    } catch (error) {
      if (!(error instanceof HistoricalReplayHttpError)) throw error;
      if (error.status === 404) throw new NotFoundException("replay worker run was not found");
      throw new UnprocessableEntityException(`replay worker request failed: ${error.status}`);
    }
  }
}

@Controller("api/v1/integration")
export class RealIntegrationController {
  @Get("nats/probe")
  async natsProbe() { return runRealNatsProbe(); }
  @Get("temporal/probe")
  async temporalProbe() { return runTemporalProbe(); }
}

type V31Scenario = "normal" | "rejection" | "recovery" | "fixed-pipeline";
const fixedPipelineFixtureEnabled = process.env.NODE_ENV === "test" && process.env.STOCKQUANT_V31_FIXED_PIPELINE_TEST === "true";
const V31_SCENARIOS = [
  { scenarioId: "normal", version: "1.0.0", title: "研究实验前置检查", expected: "缺少真实模型/Runner时保持 PENDING_PREREQUISITES" },
  { scenarioId: "rejection", version: "1.0.0", title: "LIVE 与非法参数拒绝", expected: "RESEARCH + FAKE 边界拒绝 LIVE" },
  { scenarioId: "recovery", version: "1.0.0", title: "取消与幂等恢复", expected: "重复请求不重复创建，取消状态保留" },
] as const;

@Controller("api/v1/acceptance/v3/v3.1")
export class V31AcceptanceController {
  constructor(private readonly container: PlatformContainer) {}

  @Get("runs/:testRunId/promotion-gate")
  async promotionGate(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") testRunId: string) {
    const ownerId = identity(cookie, testHeader);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(testRunId)) throw new UnprocessableEntityException("testRunId must be a UUID");
    const run = await this.container.stageRuns.find(testRunId, ownerId);
    if (!run || run.stageId !== "V3.1") throw new NotFoundException("V3.1 run was not found in user scope");
    return this.container.stageRuns.getV31PromotionGate(testRunId);
  }

  @Post("runs/:testRunId/acceptance")
  @HttpCode(201)
  async acceptExactRun(
    @Headers("cookie") cookie: string | undefined,
    @Headers("x-stockquant-user") testHeader: string | undefined,
    @Param("testRunId") testRunId: string,
    @Body() body: { confirmation?: string; note?: string },
  ) {
    const ownerId = identity(cookie, testHeader);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(testRunId)) throw new UnprocessableEntityException("testRunId must be a UUID");
    if (body?.confirmation !== "ACCEPT_EXACT_V31_RUN" || typeof body.note !== "string" || body.note.trim().length < 8 || body.note.length > 500) throw new UnprocessableEntityException("explicit exact-run confirmation and an 8-500 character note are required");
    try {
      const accepted = await this.container.stageRuns.acceptV31Run(testRunId, ownerId, body.note.trim());
      return { schemaVersion: "v3.1-human-acceptance-v1", testRunId, ownerId, status: "ACCEPTED", ...accepted };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw error;
    }
  }

  private async fixedPipeline(testRunId: string, experimentId: string): Promise<Record<string, unknown>> {
    const modelRunId = `fixed-${testRunId}`;
    const modelCall = await this.researchQueueClient().callV31ModelGatewayFixture({ experimentId, modelRunId, requestedCents: 60, scenario: "COMPLETED" });
    const fixtureResponse = modelCall.response as Record<string, unknown> | undefined;
    if (modelCall.status !== "COMPLETED" || modelCall.providerMode !== "FIXTURE" || typeof fixtureResponse?.generatedCode !== "string") {
      throw new UnprocessableEntityException(`V3.1 fixed model Fixture failed: ${JSON.stringify(modelCall)}`);
    }
    const bundle = Buffer.from(JSON.stringify({
      schemaVersion: "v3.1-runner-input-bundle-v1",
      script: "code/main.py",
      files: [{ path: "code/main.py", contentBase64: Buffer.from(fixtureResponse.generatedCode).toString("base64") }],
    }));
    const sha256 = createHash("sha256").update(bundle).digest("hex");
    const inputNamespace = `research/${testRunId}/${experimentId}/inputs`;
    const inputRef: V31ResearchArtifactRef = {
      schemaVersion: "v3.1-artifact-ref-v1", artifactId: sha256, kind: "INPUT", namespace: inputNamespace,
      sha256, status: "PENDING", sourceRef: "v3.1-model-response-fixed-v1",
    };
    const published = await this.researchQueueClient().publishV31Artifact({ ref: inputRef, contentBase64: bundle.toString("base64") });
    let runnerJob;
    try {
      runnerJob = await this.researchQueueClient().submitV31RunnerJob({
        schemaVersion: "v3.1-runner-job-v1", testRunId, experimentId,
        imageDigest: "sha256:8cd6db4ae88cab7a1fb485613a67fb15a4d4e08460c28deb81510c1fa1861dfb",
        inputArtifact: `${inputNamespace}/${sha256}`, outputNamespace: `research/${testRunId}/${experimentId}/outputs`,
        resources: { cpuMilli: 500, memoryMiB: 512, timeoutSeconds: 30, pidsLimit: 32 },
        networkPolicy: { mode: "DENY", allowlist: [] },
      });
    } catch (error) {
      throw new UnprocessableEntityException(`V3.1 fixed Runner submission failed: ${error instanceof Error ? error.message : "request failed"}`);
    }
    if (!runnerJob.jobId) throw new UnprocessableEntityException("V3.1 fixed Runner submission returned no jobId");
    const budget = await this.researchQueueClient().settleV31ExperimentBudget(experimentId, { spentCents: modelCall.actualCostCents ?? -1 });
    if (budget.status !== "SETTLED") throw new UnprocessableEntityException(`V3.1 fixed model budget settlement failed: ${JSON.stringify(budget)}`);
    return {
      inputRef: published.ref,
      inputArtifact: `${inputNamespace}/${sha256}`,
      runnerJob,
      chainStatus: runnerJob.status === "QUEUED" && runnerJob.execution === "NOT_STARTED" ? "WAITING_FOR_RUNNER" : "RUNNER_SUBMITTED",
      modelCall: { providerMode: modelCall.providerMode, modelCalls: modelCall.modelCalls, fixtureId: fixtureResponse.fixtureId, modelRunId, actualCostCents: modelCall.actualCostCents },
      budget,
    };
  }

  private async prepareRunnerChain(testRunId: string, experimentId: string, scenarioId: V31Scenario): Promise<Record<string, unknown>> {
    const inputContent = Buffer.from(`stockquant:v3.1:${scenarioId}:fixture:v3.1-research-small-sample-1`);
    const inputSha256 = createHash("sha256").update(inputContent).digest("hex");
    const inputNamespace = `research/${testRunId}/${experimentId}/inputs`;
    const inputRef: V31ResearchArtifactRef = {
      schemaVersion: "v3.1-artifact-ref-v1",
      artifactId: inputSha256,
      kind: "INPUT",
      namespace: inputNamespace,
      sha256: inputSha256,
      status: "PENDING",
      sourceRef: "fixture:v3.1-research-small-sample-1",
    };
    const artifact = await this.researchQueueClient().publishV31Artifact({ ref: inputRef, contentBase64: inputContent.toString("base64") });
    const inputArtifact = `${inputNamespace}/${inputSha256}`;
    let runnerJob;
    try {
      runnerJob = await this.researchQueueClient().submitV31RunnerJob({
        schemaVersion: "v3.1-runner-job-v1",
        testRunId,
        experimentId,
        imageDigest: "sha256:8cd6db4ae88cab7a1fb485613a67fb15a4d4e08460c28deb81510c1fa1861dfb",
        inputArtifact,
        outputNamespace: `research/${testRunId}/${experimentId}/outputs`,
        resources: { cpuMilli: 500, memoryMiB: 512, timeoutSeconds: 300, pidsLimit: 32 },
        networkPolicy: { mode: "DENY", allowlist: [] },
      });
    } catch (error) {
      throw new UnprocessableEntityException(`V3.1 Runner submission failed: ${error instanceof Error ? error.message : "request failed"}`);
    }
    if (!runnerJob.jobId) throw new UnprocessableEntityException("V3.1 Runner submission returned no jobId");
    return { inputRef: artifact.ref, inputArtifact, runnerJob, chainStatus: runnerJob.status === "QUEUED" && runnerJob.execution === "NOT_STARTED" ? "PENDING_PREREQUISITES" : "UNEXPECTED" };
  }

  @Get("scenarios") scenarios() { return fixedPipelineFixtureEnabled ? [...V31_SCENARIOS, { scenarioId: "fixed-pipeline", version: "1.0.0", title: "固定Fixture代码全链路", expected: "Fixture → 离线Runner → Artifact/指标 → 预算结算；无外部模型调用" }] : V31_SCENARIOS; }

  private researchQueueClient() { return new GeneratedResearchQueueClient(this.container.researchAutomationUrl, this.container.portfolioToken); }

  @Get("preview")
  async preview() {
    const response = await fetch(`${this.container.researchAutomationUrl}/ready`, { signal: AbortSignal.timeout(3000) });
    const service = await response.json().catch(() => ({ status: "UNAVAILABLE" }));
    return { stageId: "V3.1", fixtureId: "v3.1-research-small-sample-1", dataMode: "FIXTURE", environmentMode: "RESEARCH", brokerMode: "FAKE", modelCalls: "NOT_RUN", fixedPipelineAvailable: fixedPipelineFixtureEnabled, service };
  }

  @Post("runs")
  @HttpCode(202)
  async run(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: { scenarioId?: V31Scenario; seed?: number }) {
    const ownerId = identity(cookie, testHeader);
    const scenarioId = body.scenarioId ?? "normal";
    if ((!V31_SCENARIOS.some((item) => item.scenarioId === scenarioId) && scenarioId !== "fixed-pipeline") || (scenarioId === "fixed-pipeline" && !fixedPipelineFixtureEnabled)) throw new ForbiddenException("scenario is not available for V3.1");
    const testRunId = randomUUID();
    const base = { testRunId, stageId: "V3.1", scenarioId, ownerId, seed: body.seed ?? 20260907, status: "COMPLETED", assertions: [] as any[], evidence: { dataMode: "FIXTURE", environmentMode: "RESEARCH", brokerMode: "FAKE", modelCalls: "NOT_RUN" } as Record<string, unknown> };
    const request: V31ExperimentRequest = { testRunId, fixtureId: "v3.1-research-small-sample-1", modelProfile: "UNSET", rounds: 1, budgetCurrency: "USD", budgetCents: scenarioId === "fixed-pipeline" ? 100 : 300, environmentMode: "RESEARCH", brokerMode: "FAKE", idempotencyKey: `v31-${scenarioId}-${testRunId}` };
    if (scenarioId === "normal") {
      const experiment = await this.researchQueueClient().createV31Experiment(request);
      if (!experiment.experimentId) throw new UnprocessableEntityException("V3.1 experiment creation returned no experimentId");
      base.assertions.push({ assertionId: "V3.1-PREP-NORMAL-001", status: experiment.status === "PENDING_PREREQUISITES" ? "PASS" : "FAIL", expected: "PENDING_PREREQUISITES without model or Runner", actual: experiment });
      base.evidence.experiment = experiment;
      const chain = await this.prepareRunnerChain(testRunId, experiment.experimentId, scenarioId);
      base.assertions.push({ assertionId: "V3.1-PREP-CHAIN-001", status: chain.chainStatus === "PENDING_PREREQUISITES" ? "PASS" : "FAIL", expected: "TestRun -> Experiment -> published input ArtifactRef -> queued Runner Job", actual: chain });
      base.evidence.orchestration = chain;
    } else if (scenarioId === "fixed-pipeline") {
      const experiment = await this.researchQueueClient().createV31Experiment(request);
      if (!experiment.experimentId) throw new UnprocessableEntityException("V3.1 fixed experiment creation returned no experimentId");
      base.evidence.experiment = experiment;
      const chain = await this.fixedPipeline(testRunId, experiment.experimentId);
      base.evidence.orchestration = chain;
      base.assertions.push({ assertionId: "V3.1-FIXED-PIPELINE-001", status: chain.chainStatus === "WAITING_FOR_RUNNER" ? "PASS" : "FAIL", expected: "Fixture model code is published as an INPUT Artifact and queued with network DENY", actual: chain });
      base.assertions.push({ assertionId: "V3.1-FIXED-MODEL-001", status: (chain.modelCall as any)?.providerMode === "FIXTURE" && (chain.modelCall as any)?.modelCalls === "NO_EXTERNAL_CALL" ? "PASS" : "FAIL", expected: "fixed model response and zero external calls", actual: chain.modelCall });
      base.status = "WAITING";
    } else if (scenarioId === "rejection") {
      let rejection: { status?: number; message?: string } = {};
      try { await this.researchQueueClient().createV31Experiment({ ...request, brokerMode: "LIVE" } as unknown as V31ExperimentRequest); }
      catch (error) { if (error instanceof ResearchQueueHttpError) rejection = { status: error.status, message: error.message }; else throw error; }
      base.assertions.push({ assertionId: "V3.1-PREP-REJECTION-001", status: rejection.status === 422 && String(rejection.message).includes("brokerMode") ? "PASS" : "FAIL", expected: "LIVE rejected with 422", actual: rejection });
    } else {
      const first = await this.researchQueueClient().createV31Experiment(request);
      if (!first.experimentId) throw new UnprocessableEntityException("V3.1 experiment creation returned no experimentId");
      const chain = await this.prepareRunnerChain(testRunId, first.experimentId, scenarioId);
      const second = await this.researchQueueClient().createV31Experiment(request);
      const cancelled = await this.researchQueueClient().cancelV31Experiment(first.experimentId);
      base.assertions.push({ assertionId: "V3.1-PREP-RECOVERY-001", status: first.experimentId === second.experimentId && cancelled.status === "CANCELLED" ? "PASS" : "FAIL", expected: "idempotent create followed by cancellation", actual: { first, second, cancelled } });
      base.assertions.push({ assertionId: "V3.1-PREP-CHAIN-001", status: chain.chainStatus === "PENDING_PREREQUISITES" ? "PASS" : "FAIL", expected: "same TestRun keeps its input ArtifactRef and queued Runner Job during recovery", actual: chain });
      base.evidence.experiment = { first, second, cancelled };
      base.evidence.orchestration = chain;
    }
    if (scenarioId !== "fixed-pipeline") base.status = base.assertions.every((item) => item.status === "PASS") ? "COMPLETED" : "FAILED";
    await this.container.stageRuns.save({
      testRunId,
      stageId: "V3.1",
      scenarioId,
      scenarioVersion: "1.0.0",
      ownerId,
      status: base.status,
      seed: base.seed,
      assertions: base.assertions,
      evidence: base.evidence,
      namespace: `v3-1-${scenarioId}-${testRunId}`,
    });
    return { accepted: true, testRunId, status: base.status };
  }

  @Get("runs/:testRunId")
  async get(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") id: string) {
    const ownerId = identity(cookie, testHeader); const run = await this.container.stageRuns.find(id, ownerId);
    if (!run || run.stageId !== "V3.1") throw new NotFoundException("V3.1 run was not found");
    if (run.scenarioId === "fixed-pipeline" && fixedPipelineFixtureEnabled) {
      const evidence = structuredClone(run.evidence) as any;
      const runnerJobId = evidence.orchestration?.runnerJob?.jobId;
      const experimentId = evidence.experiment?.experimentId;
      if (typeof runnerJobId === "string" && typeof experimentId === "string") {
        const [runnerResult, budgetResult] = await Promise.allSettled([
          this.researchQueueClient().readV31RunnerJob(runnerJobId),
          this.researchQueueClient().readV31ExperimentBudget(experimentId),
        ]);
        if (runnerResult.status === "fulfilled") evidence.orchestration.runnerJob = runnerResult.value;
        if (budgetResult.status === "fulfilled") evidence.orchestration.budget = budgetResult.value;
        const latestStatus = evidence.orchestration.runnerJob?.status;
        const status = latestStatus === "COMPLETED" ? "COMPLETED" : ["FAILED", "TIMED_OUT", "OUTPUT_LIMIT", "SPAWN_FAILED"].includes(latestStatus) ? "FAILED" : "WAITING";
        const assertions = [...run.assertions];
        const executionAssertion = { assertionId: "V3.1-FIXED-RUNNER-001", status: status === "WAITING" ? "PENDING" : status === "COMPLETED" ? "PASS" : "FAIL", expected: "Runner completion and published output metrics", actual: evidence.orchestration.runnerJob };
        const existingIndex = assertions.findIndex((item: any) => item.assertionId === executionAssertion.assertionId);
        if (existingIndex >= 0) assertions[existingIndex] = executionAssertion; else assertions.push(executionAssertion);
        if (status !== run.status || status !== "WAITING") await this.container.stageRuns.save({ ...run, status, assertions, evidence });
        return { ...run, status, assertions, evidence };
      }
    }
    return run;
  }

  @Get("runs/:testRunId/artifacts/:artifactId")
  async artifact(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") testRunId: string, @Param("artifactId") artifactId: string) {
    const ownerId = identity(cookie, testHeader);
    const run = await this.container.stageRuns.find(testRunId, ownerId);
    if (!run || run.stageId !== "V3.1") throw new NotFoundException("V3.1 run was not found");
    const orchestration = (run.evidence as any)?.orchestration;
    const jobId = orchestration?.runnerJob?.jobId;
    if (typeof jobId !== "string" || !jobId) throw new NotFoundException("Artifact is not associated with this V3.1 run");

    let runnerRecord;
    try { runnerRecord = await this.researchQueueClient().readV31RunnerJob(jobId); }
    catch (error) {
      if (error instanceof ResearchQueueHttpError && error.status === 404) throw new NotFoundException("Artifact is not associated with this V3.1 run");
      throw new ServiceUnavailableException("research Artifact metadata is unavailable");
    }
    const ref = findV31RunArtifactRef({ run, requestedArtifactId: artifactId, runnerRecord });
    if (!ref) throw new NotFoundException("Artifact is not associated with this V3.1 run");

    try { return await this.researchQueueClient().readV31Artifact({ namespace: ref.namespace, artifactId: ref.artifactId }); }
    catch (error) {
      if (error instanceof ResearchQueueHttpError && error.status === 404) throw new NotFoundException("published Artifact was not found");
      throw new ServiceUnavailableException("published Artifact content is unavailable");
    }
  }
}

@Controller("internal/v1/acceptance/v3/v3.1")
export class V31PromotionGateController {
  constructor(private readonly container: PlatformContainer) {}

  @Get("gate/:testRunId")
  async gate(@Headers("authorization") authorization: string | undefined, @Headers("x-stockquant-service-id") serviceId: string | undefined, @Param("testRunId") testRunId: string) {
    this.container.authorizeResearchAutomationService(authorization, serviceId);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(testRunId)) throw new UnprocessableEntityException("testRunId must be a UUID");
    const gate = await this.container.stageRuns.getV31PromotionGate(testRunId);
    if (!gate) throw new NotFoundException("V3.1 run was not found");
    return gate;
  }
}

@Controller("api/v1/acceptance/v3/v3.2")
export class V32AcceptanceController {
  private readonly quantUrl = process.env.STOCKQUANT_QUANT_RESEARCH_URL ?? "http://127.0.0.1:3003";
  private readonly governanceUrl = process.env.STOCKQUANT_GOVERNANCE_URL ?? "http://127.0.0.1:3007";
  constructor(private readonly container: PlatformContainer) {}

  @Post("candidate-mandate-binding")
  @HttpCode(200)
  async assessCandidateMandateBinding(
    @Headers("cookie") cookie: string | undefined,
    @Headers("x-stockquant-user") testHeader: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    const ownerId = identity(cookie, testHeader);
    if (body.ownerId !== ownerId) throw new ForbiddenException("candidate Mandate binding owner must match the authenticated local session");
    if (typeof body.testRunId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.testRunId)) throw new UnprocessableEntityException("testRunId must be a UUID");
    const run = await this.container.stageRuns.find(body.testRunId, ownerId);
    if (!run || run.testRunId !== body.testRunId || run.stageId !== "V3.1" || run.scenarioId !== "normal") throw new NotFoundException("owned normal V3.1 source run was not found");
    const gate = await this.container.stageRuns.getV31PromotionGate(body.testRunId);
    if (gate?.stageStatus !== "PASS" || gate.humanAcceptance !== "ACCEPTED") throw new ConflictException("the exact source V3.1 TestRun must be accepted before candidate Mandate binding");
    const response = await fetch(`${this.governanceUrl}/internal/v1/candidate-mandates/readiness`, {
      method: "POST",
      headers: this.container.portfolioHeaders({ "content-type": "application/json" }),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    }).catch(() => { throw new ServiceUnavailableException("Governance candidate Mandate readiness service is unavailable"); });
    const result = await response.json().catch(() => ({ status: "INVALID_RESPONSE" })) as Record<string, unknown>;
    if (response.status === 403) throw new ForbiddenException("Platform identity is not authorized for Governance readiness lookup");
    if (response.status === 422) throw new UnprocessableEntityException(result);
    if (response.status === 503) throw new ServiceUnavailableException(result);
    if (!response.ok) throw new ServiceUnavailableException(`Governance readiness lookup failed: ${response.status}`);
    return result;
  }

  @Post("runs/:testRunId/promotion-submission")
  @HttpCode(202)
  async submitPromotionForOwnedRun(
    @Headers("cookie") cookie: string | undefined,
    @Headers("x-stockquant-user") testHeader: string | undefined,
    @Param("testRunId") testRunId: string,
    @Body() body: { confirmation?: string },
  ) {
    const ownerId = identity(cookie, testHeader);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(testRunId)) throw new UnprocessableEntityException("testRunId must be a UUID");
    if (body?.confirmation !== "SUBMIT_V32_PROMOTION_REQUEST" || Object.keys(body).some((key) => key !== "confirmation")) throw new UnprocessableEntityException("explicit V3.2 PromotionRequest submission confirmation is required");
    const run = await this.container.stageRuns.find(testRunId, ownerId);
    if (!run || run.stageId !== "V3.1" || run.scenarioId !== "normal") throw new NotFoundException("owned normal V3.1 run was not found");
    const experimentId = (run.evidence as any)?.experiment?.experimentId;
    if (typeof experimentId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(experimentId)) throw new ConflictException("V3.1 run has no persisted experiment identity");
    let result;
    try { result = await new GeneratedResearchPromotionClient(this.container.researchAutomationUrl, this.container.portfolioToken).submitPromotionAfterV31Acceptance({ testRunId, experimentId }); }
    catch (error) {
      if (error instanceof ResearchPromotionHttpError && error.status === 403) throw new ForbiddenException("Platform service identity is not authorized for PromotionRequest submission");
      if (error instanceof ResearchPromotionHttpError && error.status === 503) throw new ServiceUnavailableException(error.message);
      throw new ServiceUnavailableException(error instanceof Error ? error.message : "Research Automation submit coordinator is unavailable");
    }
    if (typeof result.status !== "string") throw new ServiceUnavailableException("PromotionRequest submission returned an invalid result");
    if (result.status === "SUBMITTED" && result.testRunId !== testRunId) throw new ServiceUnavailableException("PromotionRequest response is scoped to a different TestRun");
    return { ...result, testRunId, ownerId, humanAcceptance: "NOT_CHANGED" };
  }

  @Post("promotions/:promotionRequestId/decision")
  @HttpCode(200)
  async decidePromotionVersion(
    @Headers("cookie") cookie: string | undefined,
    @Headers("x-stockquant-user") testHeader: string | undefined,
    @Param("promotionRequestId") promotionRequestId: string,
    @Body() body: { decision?: string; confirmation?: string; [key: string]: unknown },
  ) {
    const ownerId = identity(cookie, testHeader);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(promotionRequestId)) throw new UnprocessableEntityException("promotionRequestId must be a UUID");
    if (!body || Object.keys(body).length !== 2 || Object.keys(body).some((key) => !["decision", "confirmation"].includes(key)) || !["APPROVE", "REJECT"].includes(String(body.decision)) || body.confirmation !== "REVIEW_EXACT_PROMOTION_VERSION") {
      throw new UnprocessableEntityException("explicit exact-version APPROVE or REJECT confirmation is required");
    }
    const headers = this.container.quantResearchHeaders();
    const detailResponse = await fetch(`${this.quantUrl}/v1/promotions/${encodeURIComponent(promotionRequestId)}/detail`, { headers, signal: AbortSignal.timeout(5000) }).catch(() => { throw new ServiceUnavailableException("Quant PromotionRequest service is unavailable"); });
    if (detailResponse.status === 404) throw new NotFoundException("PromotionRequest was not found");
    if (!detailResponse.ok) throw new ServiceUnavailableException(`Quant PromotionRequest read failed: ${detailResponse.status}`);
    const detail = await detailResponse.json() as { request?: { testRunId?: string } };
    const testRunId = detail.request?.testRunId;
    if (typeof testRunId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(testRunId)) throw new ConflictException("PromotionRequest has no valid source TestRun");
    const run = await this.container.stageRuns.find(testRunId, ownerId);
    if (!run || run.stageId !== "V3.1" || run.scenarioId !== "normal") throw new NotFoundException("owned normal V3.1 source run was not found");
    const gate = await this.container.stageRuns.getV31PromotionGate(testRunId);
    if (gate?.stageStatus !== "PASS" || gate.humanAcceptance !== "ACCEPTED") throw new ConflictException("the exact source V3.1 TestRun must be accepted by its owner first");
    const reportResponse = await fetch(`${this.quantUrl}/v1/promotions/${encodeURIComponent(promotionRequestId)}/validation-report`, { headers, signal: AbortSignal.timeout(5000) }).catch(() => { throw new ServiceUnavailableException("Quant validation report service is unavailable"); });
    if (reportResponse.status === 404) throw new ConflictException("an immutable independent validation report is required before a decision");
    if (!reportResponse.ok) throw new ServiceUnavailableException(`Quant validation report read failed: ${reportResponse.status}`);
    const persisted = await reportResponse.json() as { promotionRequestId?: string; reportFingerprint?: string; report?: { testRunId?: string } };
    if (persisted.promotionRequestId !== promotionRequestId || persisted.report?.testRunId !== testRunId || typeof persisted.reportFingerprint !== "string" || !/^[a-f0-9]{64}$/u.test(persisted.reportFingerprint)) throw new ConflictException("validation report is not bound to the owned source TestRun");
    const response = await fetch(`${this.quantUrl}/v1/promotions/${encodeURIComponent(promotionRequestId)}/decision`, {
      method: "POST", headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ schemaVersion: "v3.2-promotion-decision-command-v1", decision: body.decision, confirmation: body.confirmation, reportFingerprint: persisted.reportFingerprint, actorId: ownerId }),
      signal: AbortSignal.timeout(5000),
    }).catch(() => { throw new ServiceUnavailableException("Quant promotion decision service is unavailable"); });
    const result = await response.json().catch(() => ({ status: "INVALID_RESPONSE" })) as Record<string, unknown>;
    if (response.status === 403) throw new ForbiddenException("Platform identity is not authorized to record a promotion decision");
    if (response.status === 404) throw new NotFoundException("PromotionRequest or validation report was not found");
    if (response.status === 409) throw new ConflictException(typeof result.reason === "string" ? result.reason : "promotion decision conflicts with the persisted version");
    if (response.status === 422) throw new UnprocessableEntityException(typeof result.reason === "string" ? result.reason : "promotion decision is invalid");
    if (!response.ok) throw new ServiceUnavailableException(`Quant promotion decision failed: ${response.status}`);
    return { schemaVersion: "v3.2-user-promotion-decision-result-v1", testRunId, decision: result };
  }

  @Get("promotions/:promotionRequestId")
  async promotion(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("promotionRequestId") id: string) {
    const ownerId = identity(cookie, testHeader);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new UnprocessableEntityException("promotionRequestId must be a UUID");
    const headers = this.container.quantResearchHeaders();
    const requestResponse = await fetch(`${this.quantUrl}/v1/promotions/${encodeURIComponent(id)}/detail`, { headers, signal: AbortSignal.timeout(5000) });
    if (requestResponse.status === 404) throw new NotFoundException("V3.2 PromotionRequest was not found");
    if (!requestResponse.ok) throw new ServiceUnavailableException(`Quant PromotionRequest read failed: ${requestResponse.status}`);
    const request = await requestResponse.json() as { request?: { testRunId?: string } };
    const testRunId = request.request?.testRunId;
    if (typeof testRunId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(testRunId)) throw new ConflictException("PromotionRequest has no valid source TestRun");
    const ownedRun = await this.container.stageRuns.find(testRunId, ownerId);
    if (!ownedRun || ownedRun.stageId !== "V3.1" || ownedRun.scenarioId !== "normal") throw new NotFoundException("owned normal V3.1 source run was not found");
    const reportResponse = await fetch(`${this.quantUrl}/v1/promotions/${encodeURIComponent(id)}/validation-report`, { headers, signal: AbortSignal.timeout(5000) });
    if (reportResponse.status !== 404 && !reportResponse.ok) throw new ServiceUnavailableException(`Quant validation report read failed: ${reportResponse.status}`);
    const validationReport = reportResponse.status === 404 ? null : await reportResponse.json();
    const detail = request as { decision?: { registryStatus?: string; activation?: string } | null };
    return { request, validationReport, registryMutation: detail.decision?.registryStatus ?? "NOT_PERFORMED", activation: detail.decision?.activation ?? "DISABLED_UNTIL_MANDATE", testRunId };
  }
}

@Controller("api/v1/acceptance/v3/v3.3")
export class V33AcceptanceController {
  constructor(private readonly container: PlatformContainer) {}

  @Post("runs")
  @HttpCode(202)
  async createReadinessRun(
    @Headers("cookie") cookie: string | undefined,
    @Headers("x-stockquant-user") testHeader: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    const ownerId = identity(cookie, testHeader);
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => !["scenarioId", "seed", "sourceV31TestRunId", "promotionRequestId"].includes(key))) throw new UnprocessableEntityException("only scenarioId, seed, sourceV31TestRunId, and promotionRequestId are accepted");
    const scenarioId = body.scenarioId;
    const seed = body.seed === undefined ? 20260907 : body.seed;
    if (!["normal", "rejection", "recovery"].includes(String(scenarioId))) throw new UnprocessableEntityException("scenarioId must be normal, rejection, or recovery");
    if (!Number.isSafeInteger(seed) || Number(seed) < 0 || Number(seed) > 2147483647) throw new UnprocessableEntityException("seed must be an integer from 0 through 2147483647");
    const sourceV31TestRunId = body.sourceV31TestRunId;
    const promotionRequestId = body.promotionRequestId;
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
    if (sourceV31TestRunId !== undefined && (typeof sourceV31TestRunId !== "string" || !uuidPattern.test(sourceV31TestRunId))) throw new UnprocessableEntityException("sourceV31TestRunId must be a UUID");
    if (promotionRequestId !== undefined && (typeof promotionRequestId !== "string" || !uuidPattern.test(promotionRequestId))) throw new UnprocessableEntityException("promotionRequestId must be a UUID");
    let v31Gate: Record<string, unknown> | null = null;
    if (sourceV31TestRunId) {
      const source = await this.container.stageRuns.find(sourceV31TestRunId, ownerId);
      if (!source || source.stageId !== "V3.1" || source.scenarioId !== "normal") throw new NotFoundException("owned normal V3.1 source run was not found");
      v31Gate = await this.container.stageRuns.getV31PromotionGate(sourceV31TestRunId);
    }
    let promotionDetail: Record<string, unknown> | null = null;
    if (promotionRequestId) {
      const quantUrl = process.env.STOCKQUANT_QUANT_RESEARCH_URL ?? "http://127.0.0.1:3003";
      const response = await fetch(`${quantUrl}/v1/promotions/${encodeURIComponent(promotionRequestId)}/detail`, { headers: this.container.quantResearchHeaders(), signal: AbortSignal.timeout(5000) }).catch(() => { throw new ServiceUnavailableException("Quant PromotionRequest service is unavailable"); });
      if (response.status === 404) promotionDetail = null;
      else if (!response.ok) throw new ServiceUnavailableException(`Quant PromotionRequest read failed: ${response.status}`);
      else {
        const value: unknown = await response.json().catch(() => null);
        if (!value || typeof value !== "object" || Array.isArray(value)) throw new ServiceUnavailableException("Quant PromotionRequest detail is invalid");
        const detail = value as Record<string, unknown>;
        if (detail.schemaVersion !== "v3.2-promotion-request-detail-v1" || detail.promotionRequestId !== promotionRequestId || !detail.request || typeof detail.request !== "object" || Array.isArray(detail.request)) throw new ServiceUnavailableException("Quant PromotionRequest detail does not match the scoped request");
        promotionDetail = detail;
      }
    }
    const v31Accepted = v31Gate?.stageStatus === "PASS" && v31Gate?.humanAcceptance === "ACCEPTED";
    const promotionRequest = promotionDetail?.request as Record<string, unknown> | undefined;
    if (promotionRequest && sourceV31TestRunId && promotionRequest.testRunId !== sourceV31TestRunId) throw new ConflictException("PromotionRequest is bound to a different V3.1 source run");
    const decision = promotionDetail?.decision as Record<string, unknown> | null | undefined;
    const exactCandidateApproved = Boolean(sourceV31TestRunId && promotionRequest?.testRunId === sourceV31TestRunId && promotionDetail?.status === "CANDIDATE_APPROVED" && decision?.decision === "APPROVE" && decision?.registryStatus === "CANDIDATE_APPROVED" && decision?.activation === "DISABLED_UNTIL_MANDATE");
    const testRunId = this.container.stageRuns.newId();
    const blockers = [
      { id: "V3.1_ACCEPTANCE", status: v31Accepted ? "VERIFIED" : sourceV31TestRunId ? "NOT_VERIFIED" : "NOT_PROVIDED", reason: v31Accepted ? `exact accepted source run ${sourceV31TestRunId}; evidence ${String(v31Gate?.evidenceSha256 ?? "")}` : sourceV31TestRunId ? `exact source run ${sourceV31TestRunId} is not accepted` : "supply the owner's exact accepted V3.1 source run" },
      { id: "V3.2_EXACT_VERSION", status: exactCandidateApproved ? "VERIFIED" : promotionRequestId ? "NOT_VERIFIED" : "NOT_PROVIDED", reason: exactCandidateApproved ? `exact approved PromotionRequest ${promotionRequestId}; version ${String(decision?.versionFingerprint ?? "")}` : promotionRequestId ? promotionDetail ? `PromotionRequest ${promotionRequestId} is not approved as an exact candidate version` : `PromotionRequest ${promotionRequestId} was not found` : "supply the exact owner-approved PromotionRequest ID" },
      { id: "PAPER_CONTINUITY", status: "NOT_VERIFIED", reason: "isolated research load must not impair the authorized Paper workflow" },
      { id: "V3.3_EXECUTOR", status: "NOT_IMPLEMENTED", reason: "budget-controlled scenario dispatch, checkpoints, and recovery orchestration are not implemented" },
    ];
    const assertions = blockers.map((blocker) => ({ id: blocker.id, status: "NOT_RUN", reason: blocker.reason }));
    const run = await this.container.stageRuns.save({
      testRunId, stageId: "V3.3", scenarioId: String(scenarioId), scenarioVersion: "v3.3-readiness-v1", ownerId,
      status: "WAITING", seed: Number(seed), assertions,
      evidence: { readiness: "WAITING", sourceV31TestRunId: sourceV31TestRunId ?? null, v31Gate, promotionRequestId: promotionRequestId ?? null, promotionSummary: promotionDetail ? { status: promotionDetail.status, decision: decision?.decision ?? null, registryStatus: decision?.registryStatus ?? null, versionFingerprint: decision?.versionFingerprint ?? null } : null, blockers, runnerDispatch: "NOT_PERFORMED", runnerJobsCreated: 0, externalModelCalls: 0, paperContinuity: "NOT_CHECKED" },
    });
    return { accepted: true, testRunId: run.testRunId, stageId: run.stageId, scenarioId: run.scenarioId, status: run.status, seed: run.seed, assertions: run.assertions, evidence: run.evidence };
  }

  @Get("runs/:testRunId")
  async getReadinessRun(
    @Headers("cookie") cookie: string | undefined,
    @Headers("x-stockquant-user") testHeader: string | undefined,
    @Param("testRunId") testRunId: string,
  ) {
    const ownerId = identity(cookie, testHeader);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(testRunId)) throw new UnprocessableEntityException("testRunId must be a UUID");
    const run = await this.container.stageRuns.find(testRunId, ownerId);
    if (!run || run.stageId !== "V3.3") throw new NotFoundException("V3.3 run was not found in user scope");
    const { testRunId: id, stageId, scenarioId, scenarioVersion, status, seed, assertions, evidence, createdAt, completedAt } = run;
    return { testRunId: id, stageId, scenarioId, scenarioVersion, status, seed, assertions, evidence, createdAt, completedAt };
  }

  @Get("runs/:testRunId/research/queue")
  async runnerQueue(
    @Headers("cookie") cookie: string | undefined,
    @Headers("x-stockquant-user") testHeader: string | undefined,
    @Param("testRunId") testRunId: string,
    @Query("offset") offsetValue?: string,
    @Query("limit") limitValue?: string,
  ) {
    const ownerId = identity(cookie, testHeader);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(testRunId)) throw new UnprocessableEntityException("testRunId must be a UUID");
    const offset = offsetValue === undefined ? 0 : Number(offsetValue);
    const limit = limitValue === undefined ? 50 : Number(limitValue);
    if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new UnprocessableEntityException("offset must be non-negative and limit must be between 1 and 100");
    const run = await this.container.stageRuns.find(testRunId, ownerId);
    if (!run || run.stageId !== "V3.3") throw new NotFoundException("V3.3 run was not found in user scope");
    try { return await this.queueClient().listRunnerJobsForTestRun(testRunId, offset, limit); }
    catch (error) {
      if (error instanceof ResearchQueueHttpError && error.status === 404) throw new NotFoundException("research queue run was not found");
      throw new ServiceUnavailableException(`Research Automation queue read failed${error instanceof ResearchQueueHttpError ? `: ${error.status}` : ""}`);
    }
  }

  @Get("runs/:testRunId/research/queue/cursor")
  async runnerQueueCursor(
    @Headers("cookie") cookie: string | undefined,
    @Headers("x-stockquant-user") testHeader: string | undefined,
    @Param("testRunId") testRunId: string,
    @Query("afterCursor") afterCursor?: string,
    @Query("limit") limitValue?: string,
  ) {
    const ownerId = identity(cookie, testHeader);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(testRunId)) throw new UnprocessableEntityException("testRunId must be a UUID");
    const limit = limitValue === undefined ? 50 : Number(limitValue);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100 || (afterCursor !== undefined && afterCursor.length > 2048)) throw new UnprocessableEntityException("limit must be between 1 and 100 and cursor bounded");
    const run = await this.container.stageRuns.find(testRunId, ownerId);
    if (!run || run.stageId !== "V3.3") throw new NotFoundException("V3.3 run was not found in user scope");
    const body = await this.queueClient().listRunnerJobsForTestRunAfterCursor(testRunId, afterCursor, limit).catch((error: unknown) => {
      throw new ServiceUnavailableException(`Research Automation cursor queue read failed${error instanceof ResearchQueueHttpError ? `: ${error.status}` : ""}`);
    });
    if (!body || typeof body !== "object" || Array.isArray(body)
      || (body as { schemaVersion?: unknown }).schemaVersion !== "v3.3-runner-cursor-queue-v1"
      || (body as { testRunId?: unknown }).testRunId !== testRunId
      || (body as { afterCursor?: unknown }).afterCursor !== (afterCursor ?? null)
      || (body as { limit?: unknown }).limit !== limit
      || !Array.isArray((body as { jobs?: unknown }).jobs)
      || typeof (body as { hasMore?: unknown }).hasMore !== "boolean"
      || !((body as { nextAfterCursor?: unknown }).nextAfterCursor === null || typeof (body as { nextAfterCursor?: unknown }).nextAfterCursor === "string")) throw new ServiceUnavailableException("Research Automation cursor queue response does not match the scoped request");
    return body;
  }

  @Get("runs/:testRunId/research/budget")
  async runnerBudget(
    @Headers("cookie") cookie: string | undefined,
    @Headers("x-stockquant-user") testHeader: string | undefined,
    @Param("testRunId") testRunId: string,
    @Query("offset") offsetValue?: string,
    @Query("limit") limitValue?: string,
  ) {
    const ownerId = identity(cookie, testHeader);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(testRunId)) throw new UnprocessableEntityException("testRunId must be a UUID");
    const offset = offsetValue === undefined ? 0 : Number(offsetValue);
    const limit = limitValue === undefined ? 50 : Number(limitValue);
    if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new UnprocessableEntityException("offset must be non-negative and limit must be between 1 and 100");
    const run = await this.container.stageRuns.find(testRunId, ownerId);
    if (!run || run.stageId !== "V3.3") throw new NotFoundException("V3.3 run was not found in user scope");
    const body = await this.queueClient().readRunnerBudgetForTestRun(testRunId, offset, limit).catch((error: unknown) => {
      throw new ServiceUnavailableException(`Research Automation budget read failed${error instanceof ResearchQueueHttpError ? `: ${error.status}` : ""}`);
    });
    if (!body || typeof body !== "object" || Array.isArray(body)
      || (body as { schemaVersion?: unknown }).schemaVersion !== "v3.3-runner-budget-v1"
      || (body as { testRunId?: unknown }).testRunId !== testRunId
      || (body as { offset?: unknown }).offset !== offset
      || (body as { limit?: unknown }).limit !== limit) throw new ServiceUnavailableException("Research Automation budget response does not match the scoped request");
    return body;
  }

  private queueClient() { return new GeneratedResearchQueueClient(this.container.researchAutomationUrl, this.container.portfolioToken); }
}

@Module({ controllers: [HealthController, PlatformController, V12AcceptanceController, V13AcceptanceController, V14AcceptanceController, V15AcceptanceController, V21AcceptanceController, V22AcceptanceController, V23AcceptanceController, V24AcceptanceController, V25AcceptanceController, V31AcceptanceController, V31PromotionGateController, V32AcceptanceController, V33AcceptanceController, Dc06AcceptanceController, Dc08AcceptanceController, RealIntegrationController], providers: [PlatformContainer] })
export class AppModule {}

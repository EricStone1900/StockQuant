import { Body, Controller, ForbiddenException, Get, Headers, HttpCode, Injectable, Module, NotFoundException, Param, Post, Put, Query, Res, ServiceUnavailableException, UnauthorizedException, UnprocessableEntityException } from "@nestjs/common";
import { createHash, randomUUID } from "node:crypto";
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
import { V12AcceptanceService, V12_SCENARIOS, type V12Scenario } from "../application/v12-acceptance.js";
import { PersistentStageRunService } from "../application/persistent-stage-run.js";
import type { AccountSnapshot, InitializeAccountCommand } from "../contracts/generated-types.js";

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
  readonly repository = new PostgresTestRunRepository(this.pool);
  readonly stageRuns = new PostgresStageRunRepository(this.pool);
  readonly runner = new ScenarioRunner(this.repository, this.portfolioApiUrl);
  readonly executionUrl = process.env.STOCKQUANT_TRADE_EXECUTION_URL ?? "http://127.0.0.1:3005";
  readonly replayWorkerUrl = process.env.STOCKQUANT_HISTORICAL_REPLAY_WORKER_URL ?? "http://127.0.0.1:3006";
  readonly marketDataUrl = process.env.STOCKQUANT_MARKET_DATA_URL ?? "http://127.0.0.1:3002";
  readonly researchAutomationUrl = process.env.STOCKQUANT_RESEARCH_AUTOMATION_URL ?? "http://127.0.0.1:3008";
  readonly v24Observation = new PostgresV24ObservationRepository(this.pool);
  readonly scheduler = new ContinuousPaperScheduler(new SystemClock(), this.v24Observation, new V24LiveObservationHandler(this.v24Observation, this.marketDataUrl, this.executionUrl));

  async ready(): Promise<void> {
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
      headers: { "x-stockquant-service-id": "platform-api-service", "x-stockquant-owner-id": ownerId }
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
      headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service" },
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
  constructor(private readonly container: PlatformContainer) { this.service = new V12AcceptanceService(container.stageRuns, this.marketUrl, this.quantUrl); }
  @Get("scenarios") scenarios(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return V12_SCENARIOS; }
  @Get("data/normal") normal() { return fetch(`${this.marketUrl}/v1/fixtures/normal/preview`).then((r)=>r.json()); }
  @Get("data/bad-future") bad() { return fetch(`${this.marketUrl}/v1/fixtures/bad-future/preview`).then((r)=>r.json()); }
  @Get("quant/probe") probe() { return fetch(`${this.quantUrl}/v1/qlib/probe`).then((r)=>r.json()); }
  @Get("quant/factors") factors() { return fetch(`${this.quantUrl}/v1/factors/preview`).then((r)=>r.json()); }
  @Get("quant/rdagent-probe") rdagent() { return fetch(`${this.quantUrl}/v1/rdagent/probe`).then((r)=>r.json()); }
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
  private readonly marketUrl = process.env.STOCKQUANT_MARKET_DATA_URL ?? "http://127.0.0.1:3002";
  @Get("scenarios") scenarios() { return V24_SCENARIOS; }
  @Get("preview") preview() { return { stageId: "V2.4", environmentMode: "PAPER", dataMode: "LIVE_SOURCE_SMOKE", brokerMode: "FAKE", samplingIntervalMinutes: 30, executionWindow: "09:31-09:35", observationDays: 0, liveTradingEnabled: false }; }
  @Get("scheduler/status") schedulerStatus() { return this.scheduler.status(); }
  @Get("observations") observations() { return this.container.v24Observation.listObservations(); }
  @Get("observation-summary") observationSummary() { return this.container.v24Observation.observationSummary(20); }
  @Get("observation-events") observationEvents(@Query("limit") limit?: string) { const parsed = Number(limit); return this.container.v24Observation.listEvents(Number.isFinite(parsed) && parsed > 0 ? Math.min(5000, Math.floor(parsed)) : 1000); }
  @Post("scheduler/start") @HttpCode(202) async schedulerStart() { return { accepted: true, scheduler: await this.scheduler.start() }; }
  @Post("scheduler/stop") async schedulerStop() { return this.scheduler.stop(); }
  @Post("scheduler/tick") async schedulerTick() { return this.scheduler.tick(); }
  @Post("runs") @HttpCode(202) async create(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: { scenarioId?: V24Scenario; seed?: number }) { const ownerId = identity(cookie, testHeader); const scenarioId = body.scenarioId; if (!V24_SCENARIOS.some((item) => item.scenarioId === scenarioId)) throw new ForbiddenException("scenario is not available for V2.4"); const run = this.engine.run(scenarioId as V24Scenario, body.seed ?? 20260907); const source = scenarioId === "normal" ? await fetch(`${this.marketUrl}/v2/quote/preview`).then((response) => response.json()).catch(() => ({ status: "STALE" })) : null; const evidence = { ...run, source: source ? { ...(run.source ?? {}), liveProbe: source.sourceId ?? "tencent-quote", probeStatus: source.status ?? "LIVE_SOURCE_SMOKE" } : run.source }; const namespace = `v2-4-${scenarioId}-${run.testRunId}`; await this.container.stageRuns.save({ ...run, ownerId, stageId: "V2.4", scenarioVersion: "1.0.0", namespace, evidence }); return { accepted: true, testRunId: run.testRunId, status: run.status }; }
  constructor(private readonly container: PlatformContainer) { this.scheduler = container.scheduler; }
  @Get("runs/:testRunId") async get(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") id: string) { const run = await this.container.stageRuns.find(id, identity(cookie, testHeader)); if (!run || run.stageId !== "V2.4") throw new NotFoundException("V2.4 run was not found"); return run; }
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
  async preview() {
    const subscriptionId = process.env.STOCKQUANT_DC08A_SUBSCRIPTION_ID ?? "dc08a-20260914-short-v1";
    const [ready, schedule, gaps] = await Promise.all([
      fetch(`${this.container.marketDataUrl}/ready`).then((response) => response.json()),
      fetch(`${this.container.marketDataUrl}/v2/collection-schedules/${subscriptionId}`).then((response) => response.json()),
      fetch(`${this.container.marketDataUrl}/v2/minute/gaps/${subscriptionId}`).then((response) => response.json()),
    ]);
    return { stageId: "DC-08A", subscriptionId, ready, schedule, gaps, webMode: "READ_ONLY", note: "页面只读；正式启用由受保护的定时脚本执行" };
  }
}

@Controller("api/v1/acceptance/v2/v2.1")
export class V21AcceptanceController {
  private readonly marketUrl = process.env.STOCKQUANT_MARKET_DATA_URL ?? "http://127.0.0.1:3002";
  constructor(private readonly container: PlatformContainer) {}
  @Get("scenarios") scenarios() { return [
    { scenarioId: "normal", version: "1.0.0", title: "来源能力与小股票池", expected: "4 sources configured、≤100 securities" },
    { scenarioId: "capacity", version: "1.0.0", title: "101只容量拒绝", expected: "WATCHLIST_LIMIT" },
    { scenarioId: "stale", version: "1.0.0", title: "陈旧快照与新闻去重", expected: "陈旧提示、重复新闻只保留一条" }
  ]; }
  @Get("sources") sources() { return fetch(`${this.marketUrl}/v2/sources`).then((r) => r.json()); }
  @Get("sources/smoke") sourceSmoke() { return fetch(`${this.marketUrl}/v2/sources/smoke`).then((r) => r.json()); }
  @Get("watchlist") watchlist() { return fetch(`${this.marketUrl}/v2/watchlist`).then((r) => r.json()); }
  @Get("quotes") quotes() { return fetch(`${this.marketUrl}/v2/quote/preview`).then((r) => r.json()); }
  @Get("news") news() { return fetch(`${this.marketUrl}/v2/news/preview`).then((r) => r.json()); }
  @Get("news/live") liveNews() { return fetch(`${this.marketUrl}/v2/news/live`).then((r) => r.json()); }
  @Get("sampling") sampling() { return fetch(`${this.marketUrl}/v2/sampling`).then((r) => r.json()); }
  @Put("sampling") samplingUpdate(@Body() body: { intervalMinutes?: number }) { return fetch(`${this.marketUrl}/v2/sampling`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(async (r) => { if (!r.ok) throw new UnprocessableEntityException(await r.text()); return r.json(); }); }
  @Post("runs") @HttpCode(202) async createRun(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: { scenarioId?: string; seed?: number }) { const ownerId = identity(cookie, testHeader); const testRunId = this.container.stageRuns.newId(); const scenarioId = body.scenarioId ?? "normal"; if (!["normal", "capacity", "stale", "rejection", "recovery"].includes(scenarioId)) throw new ForbiddenException("scenario is not available for V2.1"); const run: any = { testRunId, stageId: "V2.1", scenarioId, status: "COMPLETED", seed: body.seed ?? 20260907, assertions: [] }; if (scenarioId === "normal") { const [sources, sampling, news] = await Promise.all([this.sources(), this.sampling(), this.liveNews()]); run.assertions = [{ assertionId: "V2.1-SOURCE-001", status: sources.sources?.filter((s: any) => s.kind === "QUOTE").some((s: any) => s.circuit === "HEALTHY") && sources.sources?.filter((s: any) => s.kind === "NEWS").length >= 2 ? "PASS" : "FAIL", expected: "1 quote + 2 news sources", actual: sources.sources }, { assertionId: "V2.1-SAMPLING-001", status: [20, 30].includes(sampling.intervalMinutes) ? "PASS" : "FAIL", expected: [20, 30], actual: sampling.intervalMinutes }, { assertionId: "V2.1-NEWS-001", status: news.status === "PASS" ? "PASS" : "FAIL", expected: "PASS", actual: news.status }]; } else if (scenarioId === "rejection" || scenarioId === "capacity") { const response = await fetch(`${this.marketUrl}/v2/watchlist`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ securities: Array.from({ length: 101 }, (_, i) => `${String(600000 + i).padStart(6, "0")}.SH`) }) }); run.assertions = [{ assertionId: "V2.1-WATCHLIST-001", status: response.status === 422 ? "PASS" : "FAIL", expected: 422, actual: response.status }]; } else { await fetch(`${this.marketUrl}/v2/sources/tencent-quote/fail`, { method: "POST" }); const failed = await this.sources(); await fetch(`${this.marketUrl}/v2/sources/tencent-quote/recover`, { method: "POST" }); const recovered = await this.sources(); run.assertions = [{ assertionId: "V2.1-BREAKER-001", status: failed.sources?.find((s: any) => s.sourceId === "tencent-quote")?.circuit === "OPEN" && recovered.sources?.find((s: any) => s.sourceId === "tencent-quote")?.circuit === "HEALTHY" ? "PASS" : "FAIL", expected: "OPEN then HEALTHY", actual: { failed, recovered } }]; } await this.container.stageRuns.save({ testRunId, stageId: "V2.1", scenarioId, scenarioVersion: "1.0.0", ownerId, status: run.status, seed: run.seed, assertions: run.assertions, evidence: { environmentMode: "PAPER", dataMode: "REAL", brokerMode: "FAKE" } }); return { accepted: true, testRunId, status: run.status }; }
  @Get("runs/:testRunId") async getRun(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") id: string) { const run = await this.container.stageRuns.find(id, identity(cookie, testHeader)); if (!run || run.stageId !== "V2.1") throw new NotFoundException("V2.1 run was not found"); return run; }
  @Put("watchlist") @HttpCode(200) update(@Body() body: { securities?: string[] }) { return fetch(`${this.marketUrl}/v2/watchlist`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(async (r) => { if (!r.ok) throw new UnprocessableEntityException(await r.text()); return r.json(); }); }
}

@Controller("api/v1/acceptance/v2/v2.2")
export class V22AcceptanceController {
  private readonly marketUrl = process.env.STOCKQUANT_MARKET_DATA_URL ?? "http://127.0.0.1:3002";
  constructor(private readonly container: PlatformContainer) {}
  @Get("scenarios") scenarios() { return [{ scenarioId: "normal", title: "分钟文件导入", expected: "6 valid bars、2 securities、PUBLISHED" }, { scenarioId: "rejection", title: "坏行质量拒绝", expected: "OHLC_INVALID、DUPLICATE_CONFLICT、NON_TRADING_SESSION" }, { scenarioId: "recovery", title: "重复导入幂等", expected: "same SHA returns idempotent=true" }]; }
  @Get("preview") preview() { return fetch(`${this.marketUrl}/v2/minute/preview`).then((r) => r.json()); }
  @Post("import") import(@Body() body: { fixture?: string }) { return fetch(`${this.marketUrl}/v2/minute/import`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()); }
  @Post("runs") @HttpCode(202) async run(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: { scenarioId?: string; seed?: number }) { const ownerId = identity(cookie, testHeader); const testRunId = this.container.stageRuns.newId(); const scenarioId = body.scenarioId ?? "normal"; if (!["normal", "rejection", "recovery"].includes(scenarioId)) throw new ForbiddenException("scenario is not available for V2.2"); const run: any = { testRunId, stageId: "V2.2", scenarioId, status: "COMPLETED", seed: body.seed ?? 20260907, assertions: [] }; if (scenarioId === "normal") { const result: any = await this.import({ fixture: "normal" }); run.assertions = [{ assertionId: "V2.2-MINUTE-NORMAL-001", status: result.status === "PUBLISHED" && result.accepted === 6 ? "PASS" : "FAIL", expected: { accepted: 6, status: "PUBLISHED" }, actual: result }]; } else if (scenarioId === "rejection") { const result: any = await this.import({ fixture: "bad" }); run.assertions = [{ assertionId: "V2.2-MINUTE-QUALITY-001", status: result.status === "REJECTED" && result.errors?.length >= 3 ? "PASS" : "FAIL", expected: "three quality errors", actual: result }]; } else { const first: any = await this.import({ fixture: "normal" }); const second: any = await this.import({ fixture: "normal" }); run.assertions = [{ assertionId: "V2.2-MINUTE-IDEMPOTENCY-001", status: second.idempotent === true && second.sha256 === first.sha256 ? "PASS" : "FAIL", expected: "idempotent duplicate", actual: { first, second } }]; } await this.container.stageRuns.save({ testRunId, stageId: "V2.2", scenarioId, scenarioVersion: "1.0.0", ownerId, status: run.status, seed: run.seed, assertions: run.assertions, evidence: { environmentMode: "BACKTEST", dataMode: "FIXTURE", brokerMode: "FAKE" } }); return { accepted: true, testRunId, status: run.status }; }
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
      const workerPath = body.defer ? "/internal/v1/replays/multi?async=true" : "/internal/v1/replays/multi";
      const workerResponse = await fetch(`${this.container.replayWorkerUrl}${workerPath}`, { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service" }, body: JSON.stringify({ testRunId, namespace, ownerId, scenarioId, seed: body.seed ?? 20260907, bars: replayBars }) });
      if (!workerResponse.ok) throw new ServiceUnavailableException(`historical replay worker failed: ${workerResponse.status}`);
      if (body.defer) {
        result.status = "RUNNING";
        (result.evidence as any).crossService = { namespace, worker: "historical-replay-worker", deferred: true, bars: replayBars.length };
        await this.container.stageRuns.save({ ...result, ownerId });
        return { accepted: true, testRunId: result.testRunId, status: result.status };
      }
      const worker = await workerResponse.json() as any;
      const executions = Array.isArray(worker.executions) ? worker.executions : [];
      const barriers = Array.isArray(worker.eventLog) ? worker.eventLog : [];
      const consistent = executions.length === replayBars.length && barriers.length === replayBars.length && barriers.every((events: string[]) => events.at(-1) === "LEDGER_COMMITTED") && worker.checkpoint?.cursor === replayBars.length && worker.checkpoint?.eventSequence === replayBars.length * 5 && worker.snapshot?.ledgerVersion === 1 + replayBars.length && worker.ledgerVersion === worker.snapshot?.ledgerVersion && worker.research?.status === "COMPLETED" && worker.research?.adapter === "qlib" && worker.research?.dataMode === "FIXTURE" && worker.research?.environmentMode === "BACKTEST" && worker.research?.modelCalls === "NOT_RUN" && worker.research?.assertions?.every((item: any) => item.status === "PASS" || item.status === "NOT_APPLICABLE");
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
  private async workerRequest(testRunId: string, action?: "pause" | "resume" | "cancel") { const path = action ? `/internal/v1/replays/${encodeURIComponent(testRunId)}/${action}` : `/internal/v1/replays/${encodeURIComponent(testRunId)}`; const response = await fetch(`${this.container.replayWorkerUrl}${path}`, { method: action ? "POST" : "GET", headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service" } }); const body = await response.json().catch(() => ({ error: "replay worker returned invalid JSON" })); if (response.status === 404) throw new NotFoundException(body.error ?? "replay worker run was not found"); if (!response.ok) throw new UnprocessableEntityException(body.error ?? `replay worker request failed: ${response.status}`); return body; }
}

@Controller("api/v1/integration")
export class RealIntegrationController {
  @Get("nats/probe")
  async natsProbe() { return runRealNatsProbe(); }
  @Get("temporal/probe")
  async temporalProbe() { return runTemporalProbe(); }
}

type V31Scenario = "normal" | "rejection" | "recovery";
const V31_SCENARIOS = [
  { scenarioId: "normal", version: "1.0.0", title: "研究实验前置检查", expected: "缺少真实模型/Runner时保持 PENDING_PREREQUISITES" },
  { scenarioId: "rejection", version: "1.0.0", title: "LIVE 与非法参数拒绝", expected: "RESEARCH + FAKE 边界拒绝 LIVE" },
  { scenarioId: "recovery", version: "1.0.0", title: "取消与幂等恢复", expected: "重复请求不重复创建，取消状态保留" },
] as const;

@Controller("api/v1/acceptance/v3/v3.1")
export class V31AcceptanceController {
  constructor(private readonly container: PlatformContainer) {}

  private async prepareRunnerChain(testRunId: string, experimentId: string, scenarioId: V31Scenario): Promise<Record<string, unknown>> {
    const inputContent = Buffer.from(`stockquant:v3.1:${scenarioId}:fixture:v3.1-research-small-sample-1`);
    const inputSha256 = createHash("sha256").update(inputContent).digest("hex");
    const inputNamespace = `research/${testRunId}/${experimentId}/inputs`;
    const inputRef = {
      schemaVersion: "v3.1-artifact-ref-v1",
      artifactId: inputSha256,
      kind: "INPUT",
      namespace: inputNamespace,
      sha256: inputSha256,
      status: "PENDING",
      sourceRef: "fixture:v3.1-research-small-sample-1",
    };
    const artifactResponse = await fetch(`${this.container.researchAutomationUrl}/v1/artifacts/publish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ref: inputRef, contentBase64: inputContent.toString("base64") }),
    });
    const artifact = await artifactResponse.json().catch(() => ({ error: "artifact publish returned invalid JSON" }));
    if (!artifactResponse.ok) throw new UnprocessableEntityException(`V3.1 input Artifact publish failed: ${JSON.stringify(artifact)}`);
    const inputArtifact = `${inputNamespace}/${inputSha256}`;
    const runnerResponse = await fetch(`${this.container.researchAutomationUrl}/v1/runner/jobs`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        schemaVersion: "v3.1-runner-job-v1",
        testRunId,
        experimentId,
        imageDigest: "sha256:8cd6db4ae88cab7a1fb485613a67fb15a4d4e08460c28deb81510c1fa1861dfb",
        inputArtifact,
        outputNamespace: `research/${testRunId}/${experimentId}/outputs`,
        resources: { cpuMilli: 500, memoryMiB: 512, timeoutSeconds: 300, pidsLimit: 32 },
        networkPolicy: { mode: "DENY", allowlist: [] },
      }),
    });
    const runnerJob = await runnerResponse.json().catch(() => ({ error: "runner submission returned invalid JSON" }));
    if (!runnerResponse.ok) throw new UnprocessableEntityException(`V3.1 Runner submission failed: ${JSON.stringify(runnerJob)}`);
    return { inputRef: artifact.ref, inputArtifact, runnerJob, chainStatus: runnerJob.status === "QUEUED" && runnerJob.execution === "NOT_STARTED" ? "PENDING_PREREQUISITES" : "UNEXPECTED" };
  }

  @Get("scenarios") scenarios() { return V31_SCENARIOS; }

  @Get("preview")
  async preview() {
    const response = await fetch(`${this.container.researchAutomationUrl}/ready`, { signal: AbortSignal.timeout(3000) });
    const service = await response.json().catch(() => ({ status: "UNAVAILABLE" }));
    return { stageId: "V3.1", fixtureId: "v3.1-research-small-sample-1", dataMode: "FIXTURE", environmentMode: "RESEARCH", brokerMode: "FAKE", modelCalls: "NOT_RUN", service };
  }

  @Post("runs")
  @HttpCode(202)
  async run(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: { scenarioId?: V31Scenario; seed?: number }) {
    const ownerId = identity(cookie, testHeader);
    const scenarioId = body.scenarioId ?? "normal";
    if (!V31_SCENARIOS.some((item) => item.scenarioId === scenarioId)) throw new ForbiddenException("scenario is not available for V3.1");
    const testRunId = randomUUID();
    const base = { testRunId, stageId: "V3.1", scenarioId, ownerId, seed: body.seed ?? 20260907, status: "COMPLETED", assertions: [] as any[], evidence: { dataMode: "FIXTURE", environmentMode: "RESEARCH", brokerMode: "FAKE", modelCalls: "NOT_RUN" } as Record<string, unknown> };
    const request = { fixtureId: "v3.1-research-small-sample-1", modelProfile: "UNSET", rounds: 1, budgetCurrency: "USD", budgetCents: 300, environmentMode: "RESEARCH", brokerMode: "FAKE", idempotencyKey: `v31-${scenarioId}-${testRunId}` };
    if (scenarioId === "normal") {
      const response = await fetch(`${this.container.researchAutomationUrl}/v1/experiments`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(request) });
      const experiment = await response.json();
      if (!response.ok || !experiment.experimentId) throw new UnprocessableEntityException(`V3.1 experiment creation failed: ${JSON.stringify(experiment)}`);
      base.assertions.push({ assertionId: "V3.1-PREP-NORMAL-001", status: response.status === 202 && experiment.status === "PENDING_PREREQUISITES" ? "PASS" : "FAIL", expected: "PENDING_PREREQUISITES without model or Runner", actual: experiment });
      base.evidence.experiment = experiment;
      const chain = await this.prepareRunnerChain(testRunId, experiment.experimentId, scenarioId);
      base.assertions.push({ assertionId: "V3.1-PREP-CHAIN-001", status: chain.chainStatus === "PENDING_PREREQUISITES" ? "PASS" : "FAIL", expected: "TestRun -> Experiment -> published input ArtifactRef -> queued Runner Job", actual: chain });
      base.evidence.orchestration = chain;
    } else if (scenarioId === "rejection") {
      const response = await fetch(`${this.container.researchAutomationUrl}/v1/experiments`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...request, brokerMode: "LIVE" }) });
      const bodyResult = await response.json();
      base.assertions.push({ assertionId: "V3.1-PREP-REJECTION-001", status: response.status === 422 && String(bodyResult.error).includes("brokerMode") ? "PASS" : "FAIL", expected: "LIVE rejected with 422", actual: { status: response.status, body: bodyResult } });
    } else {
      const firstResponse = await fetch(`${this.container.researchAutomationUrl}/v1/experiments`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(request) });
      const first = await firstResponse.json();
      if (!firstResponse.ok || !first.experimentId) throw new UnprocessableEntityException(`V3.1 experiment creation failed: ${JSON.stringify(first)}`);
      const chain = await this.prepareRunnerChain(testRunId, first.experimentId, scenarioId);
      const secondResponse = await fetch(`${this.container.researchAutomationUrl}/v1/experiments`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(request) });
      const second = await secondResponse.json();
      const cancelResponse = await fetch(`${this.container.researchAutomationUrl}/v1/experiments/${encodeURIComponent(first.experimentId)}/cancel`, { method: "POST" });
      const cancelled = await cancelResponse.json();
      base.assertions.push({ assertionId: "V3.1-PREP-RECOVERY-001", status: first.experimentId === second.experimentId && secondResponse.status === 200 && cancelled.status === "CANCELLED" ? "PASS" : "FAIL", expected: "idempotent create followed by cancellation", actual: { first, second, cancelled } });
      base.assertions.push({ assertionId: "V3.1-PREP-CHAIN-001", status: chain.chainStatus === "PENDING_PREREQUISITES" ? "PASS" : "FAIL", expected: "same TestRun keeps its input ArtifactRef and queued Runner Job during recovery", actual: chain });
      base.evidence.experiment = { first, second, cancelled };
      base.evidence.orchestration = chain;
    }
    base.status = base.assertions.every((item) => item.status === "PASS") ? "COMPLETED" : "FAILED";
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
    return run;
  }
}

@Module({ controllers: [HealthController, PlatformController, V12AcceptanceController, V13AcceptanceController, V14AcceptanceController, V15AcceptanceController, V21AcceptanceController, V22AcceptanceController, V23AcceptanceController, V24AcceptanceController, V25AcceptanceController, V31AcceptanceController, Dc06AcceptanceController, Dc08AcceptanceController, RealIntegrationController], providers: [PlatformContainer] })
export class AppModule {}

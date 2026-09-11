import { Body, Controller, ForbiddenException, Get, Headers, HttpCode, Injectable, Module, NotFoundException, Param, Post, Put, Query, Res, ServiceUnavailableException, UnauthorizedException, UnprocessableEntityException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
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
  readonly repository = new PostgresTestRunRepository(this.pool);
  readonly stageRuns = new PostgresStageRunRepository(this.pool);
  readonly runner = new ScenarioRunner(this.repository, process.env.STOCKQUANT_PORTFOLIO_API_URL ?? "http://127.0.0.1:3001");
  readonly executionUrl = process.env.STOCKQUANT_TRADE_EXECUTION_URL ?? "http://127.0.0.1:3005";
  readonly replayWorkerUrl = process.env.STOCKQUANT_HISTORICAL_REPLAY_WORKER_URL ?? "http://127.0.0.1:3006";
  readonly marketDataUrl = process.env.STOCKQUANT_MARKET_DATA_URL ?? "http://127.0.0.1:3002";
  readonly v24Observation = new PostgresV24ObservationRepository(this.pool);
  readonly scheduler = new ContinuousPaperScheduler(new SystemClock(), this.v24Observation, new V24LiveObservationHandler(this.v24Observation, this.marketDataUrl, this.executionUrl));

  async ready(): Promise<void> {
    await this.pool.query("SELECT 1");
    const response = await fetch(`${process.env.STOCKQUANT_PORTFOLIO_API_URL ?? "http://127.0.0.1:3001"}/ready`);
    if (!response.ok) throw new Error("portfolio dependency is unavailable");
    const execution = await fetch(`${this.executionUrl}/ready`);
    if (!execution.ok) throw new Error("execution dependency is unavailable");
    const replayWorker = await fetch(`${this.replayWorkerUrl}/ready`);
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
    queueMicrotask(() => void this.container.runner.start(run.testRunId, ownerId));
    return { accepted: true, testRunId: run.testRunId, status: run.status };
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
  private readonly runs = new Map<string, any>();
  private readonly marketUrl = process.env.STOCKQUANT_MARKET_DATA_URL ?? "http://127.0.0.1:3002";
  private readonly quantUrl = process.env.STOCKQUANT_QUANT_RESEARCH_URL ?? "http://127.0.0.1:3003";
  @Get("scenarios") scenarios() { return [{ scenarioId:"normal", version:"1.0.0", title:"正常数据与 Qlib 因子", expected:"6 bars、2 securities、Qlib READY" }, { scenarioId:"rejection", version:"1.0.0", title:"未来数据拒绝", expected:"FUTURE_DATA 质量错误" }, { scenarioId:"recovery", version:"1.0.0", title:"取消与探针恢复", expected:"取消任务不发布半份 Artifact" }]; }
  @Get("data/normal") normal() { return fetch(`${this.marketUrl}/v1/fixtures/normal/preview`).then((r)=>r.json()); }
  @Get("data/bad-future") bad() { return fetch(`${this.marketUrl}/v1/fixtures/bad-future/preview`).then((r)=>r.json()); }
  @Get("quant/probe") probe() { return fetch(`${this.quantUrl}/v1/qlib/probe`).then((r)=>r.json()); }
  @Get("quant/factors") factors() { return fetch(`${this.quantUrl}/v1/factors/preview`).then((r)=>r.json()); }
  @Get("quant/rdagent-probe") rdagent() { return fetch(`${this.quantUrl}/v1/rdagent/probe`).then((r)=>r.json()); }
  @Post("runs") @HttpCode(202) async create(@Body() body:{scenarioId?:string;seed?:number}) { const testRunId=randomUUID(); const scenarioId=body.scenarioId??"normal"; const run:any={testRunId,stageId:"V1.2",scenarioId,status:"RUNNING",seed:body.seed??20260907,assertions:[] as any[]}; this.runs.set(testRunId,run); queueMicrotask(async()=>{ try { const [normal,bad,probe,factor]=await Promise.all([fetch(`${this.marketUrl}/v1/fixtures/normal/preview`).then(r=>r.json()),fetch(`${this.marketUrl}/v1/fixtures/bad-future/preview`).then(r=>r.json()),fetch(`${this.quantUrl}/v1/qlib/probe`).then(r=>r.json()),fetch(`${this.quantUrl}/v1/factors/preview`).then(r=>r.json())]); run.assertions=scenarioId==='normal'?[{assertionId:"V1.2-DATA-NORMAL-001",status:normal.quality.status==='READY'&&normal.barCount===6?"PASS":"FAIL",expected:{barCount:6},actual:{barCount:normal.barCount}},{assertionId:"V1.2-QLIB-001",status:probe.probe?.status==='READY'?"PASS":"FAIL",expected:"READY",actual:probe.probe?.status}]:scenarioId==='rejection'?[{assertionId:"V1.2-DATA-PIT-001",status:bad.quality.status==='REJECTED'?"PASS":"FAIL",expected:"REJECTED",actual:bad.quality.status}]:[{assertionId:"V1.2-QLIB-001",status:probe.probe?.status==='READY'?"PASS":"FAIL",expected:"READY",actual:probe.probe?.status},{assertionId:"V1.2-FACTOR-001",status:Array.isArray(factor.ranking)?"PASS":"FAIL",expected:"ranking",actual:factor.ranking}]; run.status=run.assertions.every((a:any)=>a.status==='PASS')?"COMPLETED":"FAILED"; } catch(error) { run.status="FAILED"; run.error=error instanceof Error?error.message:"unknown"; } }); return {accepted:true,testRunId,status:run.status}; }
  @Get("runs/:testRunId") get(@Param("testRunId") id:string) { const run=this.runs.get(id); if(!run) throw new NotFoundException("test run was not found"); return run; }
}

@Controller("api/v1/acceptance/v1/v1.3")
export class V13AcceptanceController {
  private readonly runs = new Map<string, ReturnType<V13TradingEngine["run"]>>();
  private readonly engine = new V13TradingEngine();
  @Get("scenarios") scenarios() { return V13_SCENARIOS; }
  @Post("runs") @HttpCode(202) create(@Body() body: { scenarioId?: V13Scenario; seed?: number }) {
    const scenarioId = body.scenarioId;
    if (!V13_SCENARIOS.some((item) => item.scenarioId === scenarioId)) throw new ForbiddenException("scenario is not available for V1.3");
    const run = this.engine.run(scenarioId as V13Scenario, body.seed ?? 20260907);
    this.runs.set(run.testRunId, run);
    return { accepted: true, testRunId: run.testRunId, status: run.status };
  }
  @Get("runs/:testRunId") get(@Param("testRunId") id: string) { const run = this.runs.get(id); if (!run) throw new NotFoundException("test run was not found"); return run; }
}

@Controller("api/v1/acceptance/v1/v1.4")
export class V14AcceptanceController {
  private readonly runs = new Map<string, ReturnType<V14BacktestEngine["run"]>>(); private readonly engine = new V14BacktestEngine();
  @Get("scenarios") scenarios() { return V14_SCENARIOS; }
  @Post("runs") @HttpCode(202) create(@Body() body: { scenarioId?: V14Scenario; seed?: number }) { if (!V14_SCENARIOS.some((s) => s.scenarioId === body.scenarioId)) throw new ForbiddenException("scenario is not available for V1.4"); const run = this.engine.run(body.scenarioId as V14Scenario, body.seed ?? 20260907); this.runs.set(run.testRunId, run); return { accepted: true, testRunId: run.testRunId, status: run.status }; }
  @Get("runs/:testRunId") get(@Param("testRunId") id: string) { const run = this.runs.get(id); if (!run) throw new NotFoundException("backtest run was not found"); return run; }
}

@Controller("api/v1/acceptance/v1/v1.5")
export class V15AcceptanceController { private readonly runs = new Map<string, ReturnType<V15OrchestrationEngine["run"]>>(); private readonly engine = new V15OrchestrationEngine(); @Get("scenarios") scenarios() { return V15_SCENARIOS; } @Post("runs") @HttpCode(202) create(@Body() body: { scenarioId?: V15Scenario; seed?: number }) { if (!V15_SCENARIOS.some((s) => s.scenarioId === body.scenarioId)) throw new ForbiddenException("scenario is not available for V1.5"); const run = this.engine.run(body.scenarioId as V15Scenario, body.seed ?? 20260907); this.runs.set(run.testRunId, run); return { accepted: true, testRunId: run.testRunId, status: run.status }; } @Get("runs/:testRunId") get(@Param("testRunId") id: string) { const run = this.runs.get(id); if (!run) throw new NotFoundException("orchestration run was not found"); return run; } }

@Controller("api/v1/acceptance/v2/v2.4")
export class V24AcceptanceController {
  private readonly engine = new V24ContinuousPaperEngine();
  private readonly scheduler: ContinuousPaperScheduler;
  private readonly marketUrl = process.env.STOCKQUANT_MARKET_DATA_URL ?? "http://127.0.0.1:3002";
  @Get("scenarios") scenarios() { return V24_SCENARIOS; }
  @Get("preview") preview() { return { stageId: "V2.4", environmentMode: "PAPER", dataMode: "LIVE_SOURCE_SMOKE", brokerMode: "FAKE", samplingIntervalMinutes: 30, executionWindow: "09:31-09:35", observationDays: 0, liveTradingEnabled: false }; }
  @Get("scheduler/status") schedulerStatus() { return this.scheduler.status(); }
  @Get("observations") observations() { return this.container.v24Observation.listObservations(); }
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

@Controller("api/v1/acceptance/v2/v2.1")
export class V21AcceptanceController {
  private readonly marketUrl = process.env.STOCKQUANT_MARKET_DATA_URL ?? "http://127.0.0.1:3002";
  private readonly runs = new Map<string, any>();
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
  @Post("runs") @HttpCode(202) async createRun(@Body() body: { scenarioId?: string; seed?: number }) { const testRunId = randomUUID(); const scenarioId = body.scenarioId ?? "normal"; const run: any = { testRunId, stageId: "V2.1", scenarioId, status: "COMPLETED", seed: body.seed ?? 20260907, assertions: [] }; if (scenarioId === "normal") { const [sources, sampling, news] = await Promise.all([this.sources(), this.sampling(), this.liveNews()]); run.assertions = [{ assertionId: "V2.1-SOURCE-001", status: sources.sources?.filter((s: any) => s.kind === "QUOTE").some((s: any) => s.circuit === "HEALTHY") && sources.sources?.filter((s: any) => s.kind === "NEWS").length >= 2 ? "PASS" : "FAIL", expected: "1 quote + 2 news sources", actual: sources.sources }, { assertionId: "V2.1-SAMPLING-001", status: [20, 30].includes(sampling.intervalMinutes) ? "PASS" : "FAIL", expected: [20, 30], actual: sampling.intervalMinutes }, { assertionId: "V2.1-NEWS-001", status: news.status === "PASS" ? "PASS" : "FAIL", expected: "PASS", actual: news.status }]; } else if (scenarioId === "rejection") { const response = await fetch(`${this.marketUrl}/v2/watchlist`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ securities: Array.from({ length: 101 }, (_, i) => `${String(600000 + i).padStart(6, "0")}.SH`) }) }); run.assertions = [{ assertionId: "V2.1-WATCHLIST-001", status: response.status === 422 ? "PASS" : "FAIL", expected: 422, actual: response.status }]; } else { await fetch(`${this.marketUrl}/v2/sources/tencent-quote/fail`, { method: "POST" }); const failed = await this.sources(); await fetch(`${this.marketUrl}/v2/sources/tencent-quote/recover`, { method: "POST" }); const recovered = await this.sources(); run.assertions = [{ assertionId: "V2.1-BREAKER-001", status: failed.sources?.find((s: any) => s.sourceId === "tencent-quote")?.circuit === "OPEN" && recovered.sources?.find((s: any) => s.sourceId === "tencent-quote")?.circuit === "HEALTHY" ? "PASS" : "FAIL", expected: "OPEN then HEALTHY", actual: { failed, recovered } }]; } this.runs.set(testRunId, run); return { accepted: true, testRunId, status: run.status }; }
  @Get("runs/:testRunId") getRun(@Param("testRunId") id: string) { const run = this.runs.get(id); if (!run) throw new NotFoundException("V2.1 run was not found"); return run; }
  @Put("watchlist") @HttpCode(200) update(@Body() body: { securities?: string[] }) { return fetch(`${this.marketUrl}/v2/watchlist`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(async (r) => { if (!r.ok) throw new UnprocessableEntityException(await r.text()); return r.json(); }); }
}

@Controller("api/v1/acceptance/v2/v2.2")
export class V22AcceptanceController {
  private readonly marketUrl = process.env.STOCKQUANT_MARKET_DATA_URL ?? "http://127.0.0.1:3002";
  private readonly runs = new Map<string, any>();
  @Get("scenarios") scenarios() { return [{ scenarioId: "normal", title: "分钟文件导入", expected: "6 valid bars、2 securities、PUBLISHED" }, { scenarioId: "rejection", title: "坏行质量拒绝", expected: "OHLC_INVALID、DUPLICATE_CONFLICT、NON_TRADING_SESSION" }, { scenarioId: "recovery", title: "重复导入幂等", expected: "same SHA returns idempotent=true" }]; }
  @Get("preview") preview() { return fetch(`${this.marketUrl}/v2/minute/preview`).then((r) => r.json()); }
  @Post("import") import(@Body() body: { fixture?: string }) { return fetch(`${this.marketUrl}/v2/minute/import`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json()); }
  @Post("runs") @HttpCode(202) async run(@Body() body: { scenarioId?: string; seed?: number }) { const testRunId = randomUUID(); const scenarioId = body.scenarioId ?? "normal"; const run: any = { testRunId, stageId: "V2.2", scenarioId, status: "COMPLETED", seed: body.seed ?? 20260907, assertions: [] }; if (scenarioId === "normal") { const result: any = await this.import({ fixture: "normal" }); run.assertions = [{ assertionId: "V2.2-MINUTE-NORMAL-001", status: result.status === "PUBLISHED" && result.accepted === 6 ? "PASS" : "FAIL", expected: { accepted: 6, status: "PUBLISHED" }, actual: result }]; } else if (scenarioId === "rejection") { const result: any = await this.import({ fixture: "bad" }); run.assertions = [{ assertionId: "V2.2-MINUTE-QUALITY-001", status: result.status === "REJECTED" && result.errors?.length >= 3 ? "PASS" : "FAIL", expected: "three quality errors", actual: result }]; } else { const first: any = await this.import({ fixture: "normal" }); const second: any = await this.import({ fixture: "normal" }); run.assertions = [{ assertionId: "V2.2-MINUTE-IDEMPOTENCY-001", status: second.idempotent === true && second.sha256 === first.sha256 ? "PASS" : "FAIL", expected: "idempotent duplicate", actual: { first, second } }]; } this.runs.set(testRunId, run); return { accepted: true, testRunId, status: run.status }; }
  @Get("runs/:testRunId") get(@Param("testRunId") id: string) { const run = this.runs.get(id); if (!run) throw new NotFoundException("V2.2 run was not found"); return run; }
}

@Controller("api/v1/acceptance/v2/v2.3")
export class V23AcceptanceController {
  private readonly engine = new V23ReplayEngine();
  constructor(private readonly container: PlatformContainer) {}
  @Get("scenarios") scenarios() { return V23_SCENARIOS; }
  @Get("preview") preview() { return { fixtureVersion: "v2.3-replay-bars-1", barType: "MINUTE_BAR", barCount: 4, securities: ["600000.SH", "000001.SZ"], dates: ["2024-01-02", "2024-01-03"], mode: "BACKTEST" }; }
  @Post("runs") @HttpCode(202) async run(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: { scenarioId?: V23Scenario; seed?: number }) {
    const ownerId = identity(cookie, testHeader); const scenarioId = body.scenarioId ?? "normal";
    if (!V23_SCENARIOS.some((s) => s.scenarioId === scenarioId)) throw new ForbiddenException("scenario is not available for V2.3");
    const root = resolve(process.env.STOCKQUANT_PROJECT_ROOT ?? process.cwd());
    const csv = await readFile(resolve(root, "fixtures/v2/v2.3/replay_bars.csv"), "utf8");
    const bars = parseReplayBars(csv); const testRunId = this.container.stageRuns.newId();
    const result = this.engine.run(scenarioId, body.seed ?? 20260907, bars, testRunId);
    if (scenarioId !== "rejection") {
      const namespace = `v2-3-${scenarioId}-${testRunId}`;
      const target = bars.find((bar) => bar.security === "600000.SH" && bar.timestamp.startsWith("2024-01-03"));
      if (!target) throw new ServiceUnavailableException("replay fixture lacks next-bar execution input");
      const workerResponse = await fetch(`${this.container.replayWorkerUrl}/internal/v1/replays`, { method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service" }, body: JSON.stringify({ testRunId, namespace, ownerId, scenarioId, seed: body.seed ?? 20260907, bar: { timestamp: target.timestamp, open: target.open.toFixed(4), volume: target.volume } }) });
      if (!workerResponse.ok) throw new ServiceUnavailableException(`historical replay worker failed: ${workerResponse.status}`);
      const worker = await workerResponse.json() as any;
      const consistent = worker.execution?.result?.fill?.quantity === 50 && worker.execution?.result?.fill?.price === "10.2102" && worker.execution?.result?.fill?.fee === "0.5105" && worker.snapshot?.cash?.amount === "9488.9795" && worker.research?.status === "COMPLETED" && worker.research?.adapter === "qlib" && worker.research?.dataMode === "FIXTURE" && worker.research?.environmentMode === "BACKTEST" && worker.research?.modelCalls === "NOT_RUN" && worker.research?.assertions?.every((item: any) => item.status === "PASS" || item.status === "NOT_APPLICABLE") && (!worker.recovery || worker.recovery.replayed === true);
      result.assertions.push({ assertionId: "V2.3-CROSS-SERVICE-004", status: consistent ? "PASS" : "FAIL", expected: "isolated FakeBroker fill and idempotent portfolio ledger", actual: worker });
      result.status = result.assertions.every((item) => item.status === "PASS") ? "COMPLETED" : "FAILED";
      (result.evidence as any).crossService = { ...worker, namespace, worker: "historical-replay-worker" };
    }
    await this.container.stageRuns.save({ ...result, ownerId });
    return { accepted: true, testRunId: result.testRunId, status: result.status };
  }
  @Get("runs/:testRunId") async get(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") id: string) { const run = await this.container.stageRuns.find(id, identity(cookie, testHeader)); if (!run || run.stageId !== "V2.3") throw new NotFoundException("V2.3 run was not found"); return run; }
}

@Controller("api/v1/integration")
export class RealIntegrationController {
  @Get("nats/probe")
  async natsProbe() { return runRealNatsProbe(); }
  @Get("temporal/probe")
  async temporalProbe() { return runTemporalProbe(); }
}

@Module({ controllers: [HealthController, PlatformController, V12AcceptanceController, V13AcceptanceController, V14AcceptanceController, V15AcceptanceController, V21AcceptanceController, V22AcceptanceController, V23AcceptanceController, V24AcceptanceController, V25AcceptanceController, RealIntegrationController], providers: [PlatformContainer] })
export class AppModule {}

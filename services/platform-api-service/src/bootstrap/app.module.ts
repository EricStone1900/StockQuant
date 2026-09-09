import { Body, Controller, ForbiddenException, Get, Headers, HttpCode, Injectable, Module, NotFoundException, Param, Post, Put, Res, ServiceUnavailableException, UnauthorizedException, UnprocessableEntityException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { PostgresTestRunRepository } from "../adapters/postgres-test-run-repository.js";
import { ScenarioRunner } from "../application/scenario-runner.js";
import { isV11Scenario, V11_SCENARIOS } from "../application/v11-scenarios.js";
import type { ScenarioId } from "../domain/test-run.js";
import { V13_SCENARIOS, V13TradingEngine, type V13Scenario } from "../application/v13-trading.js";
import { V14_SCENARIOS, V14BacktestEngine, type V14Scenario } from "../application/v14-backtest.js";
import { V15_SCENARIOS, V15OrchestrationEngine, type V15Scenario } from "../application/v15-orchestration.js";
import { runRealNatsProbe } from "../integration/real-nats-probe.js";
import { runTemporalProbe } from "../integration/temporal-runtime.js";

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
  readonly runner = new ScenarioRunner(this.repository, process.env.STOCKQUANT_PORTFOLIO_API_URL ?? "http://127.0.0.1:3001");

  async ready(): Promise<void> {
    await this.pool.query("SELECT 1");
    const response = await fetch(`${process.env.STOCKQUANT_PORTFOLIO_API_URL ?? "http://127.0.0.1:3001"}/ready`);
    if (!response.ok) throw new Error("portfolio dependency is unavailable");
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
    const run = await this.container.repository.find(testRunId, identity(cookie, testHeader));
    if (!run) throw new NotFoundException("test run was not found in user scope");
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

@Controller("api/v1/integration")
export class RealIntegrationController {
  @Get("nats/probe")
  async natsProbe() { return runRealNatsProbe(); }
  @Get("temporal/probe")
  async temporalProbe() { return runTemporalProbe(); }
}

@Module({ controllers: [HealthController, PlatformController, V12AcceptanceController, V13AcceptanceController, V14AcceptanceController, V15AcceptanceController, V21AcceptanceController, RealIntegrationController], providers: [PlatformContainer] })
export class AppModule {}

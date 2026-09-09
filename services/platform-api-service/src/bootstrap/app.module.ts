import { Body, Controller, ForbiddenException, Get, Headers, HttpCode, Injectable, Module, NotFoundException, Param, Post, Res, ServiceUnavailableException, UnauthorizedException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { PostgresTestRunRepository } from "../adapters/postgres-test-run-repository.js";
import { ScenarioRunner } from "../application/scenario-runner.js";
import { isV11Scenario, V11_SCENARIOS } from "../application/v11-scenarios.js";
import type { ScenarioId } from "../domain/test-run.js";

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

@Module({ controllers: [HealthController, PlatformController, V12AcceptanceController], providers: [PlatformContainer] })
export class AppModule {}

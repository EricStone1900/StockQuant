import { Body, ConflictException, Controller, ForbiddenException, Get, Headers, HttpCode, HttpException, Injectable, Module, NotFoundException, Param, Post, Put, Query, Res, ServiceUnavailableException, UnauthorizedException, UnprocessableEntityException } from "@nestjs/common";
import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { Pool } from "pg";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PostgresTestRunRepository } from "../adapters/postgres-test-run-repository.js";
import type { V11AcceptanceRun } from "../contracts/generated-types.js";
import { PostgresStageRunRepository } from "../adapters/postgres-stage-run-repository.js";
import { V14QuantBacktestAdapter } from "../adapters/v14-quant-backtest-adapter.js";
import { GeneratedQuantV14BacktestClient } from "../contracts/generated-quant-v14-backtest-client.js";
import { PostgresQlibFixtureArtifactRepository } from "../adapters/postgres-qlib-fixture-artifact-repository.js";
import { QlibArtifactContentStore } from "../adapters/qlib-artifact-content-store.js";
import { probeServiceReadiness, requireServiceReadiness } from "../adapters/service-readiness-probe.js";
import type { QlibFixtureArtifactRepository } from "../ports/qlib-fixture-artifact-repository.js";
import { ScenarioRunner } from "../application/scenario-runner.js";
import { isV11Scenario, V11_SCENARIOS } from "../application/v11-scenarios.js";
import type { ScenarioId } from "../domain/test-run.js";
import { isV13PaperStageRunRequest, V13_SCENARIOS, V13TradingEngine, type V13Scenario } from "../application/v13-trading.js";
import { validateV14ExecutionPolicy, V14_CORPORATE_ACTION_POLICY, V14_DEFAULT_EXECUTION_POLICY, V14_SCENARIOS, type V14Scenario } from "../application/v14-backtest.js";
import { V15_SCENARIOS, V15OrchestrationEngine, type V15Scenario } from "../application/v15-orchestration.js";
import { loadV15NoTradeCalendar } from "../application/v15-no-trade-calendar.js";
import { loadV15AutoTradeCalendar } from "../application/v15-auto-trade-calendar.js";
import { runRealNatsProbe } from "../integration/real-nats-probe.js";
import { runTemporalProbe } from "../integration/temporal-runtime.js";
import { V23_SCENARIOS, V23ReplayEngine, parseReplayBars, type V23Scenario } from "../application/v23-replay.js";
import { V24_SCENARIOS, V24ContinuousPaperEngine, type V24Scenario } from "../application/v24-continuous-paper.js";
import { ContinuousPaperScheduler } from "../application/v24-scheduler.js";
import { SystemClock } from "../application/v24-scheduler.js";
import { V15AutoTradeCancellationService } from "../application/v15-auto-trade-cancellation.js";
import { parseV24SamplingInterval } from "../application/v24-scheduler.js";
import { isV24QuoteSourceUseConfigured, V24LiveObservationHandler } from "../application/v24-live-observation.js";
import { isV24PaperApprovalConfigured } from "../application/v24-paper-approval.js";
import { prepareV24FixtureDailyTarget, V24_DAILY_DIRECTION_SHA256 } from "../application/v24-daily-target.js";
import { V24FixtureDailyTargetWorker } from "../application/v24-fixture-daily-target-worker.js";
import { evaluateV24DailyDirection } from "../application/v24-daily-direction.js";
import { initializeV24CandidateRiskState } from "../application/v24-candidate-risk-state.js";
import { admitV24CandidateExecution } from "../application/v24-candidate-execution-gate.js";
import { projectV24CandidateRiskFacts } from "../application/v24-candidate-risk-facts.js";
import { PostgresV24CandidateRiskStateRepository } from "../adapters/postgres-v24-candidate-risk-state-repository.js";
import { PostgresV24DailyTargetRepository } from "../adapters/postgres-v24-daily-target-repository.js";
import { loadV24DailyDirectionFixture } from "../adapters/v24-daily-direction-fixture.js";
import { PostgresV24ObservationRepository } from "../adapters/postgres-v24-observation-repository.js";
import { PostgresLocalSessionRepository } from "../adapters/postgres-local-session-repository.js";
import { V25_SCENARIOS, V25DataScaleEngine, type V25Scenario } from "../application/v25-data-scale.js";
import { findV31RunArtifactRef } from "../application/v31-run-artifact-access.js";
import { projectV31ArtifactRefs } from "../application/v31-common-artifact-refs.js";
import { V12AcceptanceService, V12_SCENARIOS, type V12Scenario } from "../application/v12-acceptance.js";
import { PersistentStageRunService } from "../application/persistent-stage-run.js";
import { V14BacktestRunService } from "../application/v14-backtest-run.js";
import { V13SessionAdvanceError, V13SessionAdvanceService } from "../application/v13-session-advance.js";
import { readV13UsSyntheticCalendarDay, resolveFirstV13UsSession } from "../application/v13-session-clock.js";
import { executeV13AutoProposal, V13AutoExecutionError } from "../application/v13-auto-execution.js";
import { executeV13ManualProposal, V13ManualExecutionError } from "../application/v13-manual-execution.js";
import { decideV13Proposal, V13ProposalDecisionError } from "../application/v13-proposal-decision.js";
import { reviseV13Proposal, V13ProposalRevisionError } from "../application/v13-proposal-revision.js";
import { recordV13SequencedProposalFill, V13SequencedFillError, type V13SequencedFillProposal } from "../application/v13-sequenced-fill.js";
import { cancelV13L08PartialFill, requestV13L07SequencedCancel, resolveV13L07SequencedCancel, V13OrderCancelError, type V13CancelPorts } from "../application/v13-sequenced-fill.js";
import type { AccountSnapshot, InitializeAccountCommand, MinuteCsvImportRequest, V13PaperStageRunRequest, V13ProposalCommand, V13ProposalResult, V24PaperReadiness, V31ExperimentRequest, V31ResearchArtifactRef, V32CandidateMandateBindingCommand } from "../contracts/generated-types.js";
import { GeneratedHistoricalReplayClient, HistoricalReplayHttpError } from "../contracts/generated-historical-replay-client.js";
import { GeneratedMarketDataMinuteClient, MarketDataMinuteHttpError } from "../contracts/generated-market-data-minute-client.js";
import { GeneratedMarketDataProjectDeliveryClient, MarketDataProjectDeliveryHttpError } from "../contracts/generated-market-data-project-delivery-client.js";
import { GeneratedV21MarketDataClient, MarketDataV21HttpError } from "../contracts/generated-v21-market-data-client.js";
import { GeneratedMarketMonitorClient, MarketMonitorClientError } from "../contracts/generated-market-monitor-client.js";
import { GeneratedV24MarketObservationClient } from "../contracts/generated-v24-market-observation-client.js";
import { GeneratedQuantQlibClient, QuantQlibHttpError } from "../contracts/generated-quant-qlib-client.js";
import { GeneratedQuantV12PreviewClient } from "../contracts/generated-quant-v12-preview-client.js";
import { GeneratedQuantPromotionClient, QuantPromotionHttpError } from "../contracts/generated-quant-promotion-client.js";
import { GeneratedResearchQueueClient, ResearchQueueHttpError } from "../contracts/generated-research-queue-client.js";
import { GeneratedResearchPromotionClient, ResearchPromotionHttpError } from "../contracts/generated-research-promotion-client.js";
import { GeneratedCandidateMandateClient } from "../contracts/generated-candidate-mandate-client.js";
import { GeneratedPlatformPaperAuthorizationClient } from "../contracts/generated-platform-paper-authorization-client.js";
import { cancelV33ReadinessRun, V33_READINESS_CANCEL_COMMAND } from "../application/v33-readiness-cancellation.js";
import { GeneratedPortfolioAccountClient, PortfolioAccountClientError } from "../contracts/generated-portfolio-account-client.js";
import { GeneratedPlatformPaperReadinessClient } from "../contracts/generated-platform-paper-readiness-client.js";
import { GeneratedPlatformPaperExecutionClient } from "../contracts/generated-platform-paper-execution-client.js";
import { GeneratedV13ProposalClient } from "../contracts/generated-v13-proposal-client.js";
import { HttpV12StrategyGovernanceClient } from "../adapters/v12-strategy-governance-client.js";
import { GeneratedPlatformV13AutoMandateClient } from "../contracts/generated-v13-auto-mandate-client.js";
import { GeneratedPlatformV13ManualTradeClient } from "../contracts/generated-v13-manual-trade-client.js";
import { assertV23QlibFixtureResult, buildV23QlibFixtureRequest, v23QlibFixtureInputSha256 } from "../application/v23-qlib-fixture.js";
import { projectV23QlibArtifactRef } from "../application/v23-qlib-common-artifact-ref.js";
import { projectV12QlibArtifactRef } from "../application/v12-qlib-artifact-ref.js";
import { projectV14RunArtifactRefs, verifyV14ReportPayload } from "../application/v14-report-artifact-ref.js";
import { assessV33PaperContinuityPreflight } from "../application/v33-paper-continuity.js";

const localUser = process.env.STOCKQUANT_LOCAL_DEVELOPMENT_USER ?? "acceptance-owner-1";

function canonicalCheckpointState(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalCheckpointState).join(",")}]`;
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalCheckpointState(item)}`).join(",")}}`;
  }
  throw new Error("checkpoint state is not canonical JSON");
}

function identity(cookie: string | undefined, testHeader: string | undefined): string {
  const cookieUser = cookie?.split(";").map((value) => value.trim()).find((value) => value.startsWith("sq_session="))?.slice("sq_session=".length);
  const headerAllowed = process.env.STOCKQUANT_TEST_IDENTITY_HEADER_ENABLED === "true";
  const user = cookieUser ?? (headerAllowed ? testHeader : undefined);
  if (!user) throw new UnauthorizedException("local session is required");
  if (user !== localUser) throw new ForbiddenException("user is not authorized for the local acceptance scope");
  return user;
}

function rejectClientTradingMode(body: unknown): void {
  if (!body || typeof body !== "object" || Array.isArray(body)) return;
  const record = body as Record<string, unknown>;
  if (Object.hasOwn(record, "environmentMode") || Object.hasOwn(record, "brokerMode")) {
    throw new UnprocessableEntityException("trading mode is fixed by the server and cannot be supplied by a client");
  }
}

function rejectClientOwnedV13Facts(body: unknown): void {
  if (!body || typeof body !== "object" || Array.isArray(body)) return;
  const record = body as Record<string, unknown>;
  const forbidden = ["status", "cash", "balance", "positions", "ledger", "ledgerVersion", "orders", "fills"];
  const injected = forbidden.find((key) => Object.hasOwn(record, key));
  if (injected) {
    throw new UnprocessableEntityException(`${injected} is a server-owned V1.3 business fact and cannot be supplied by a client`);
  }
}

function rejectUnexpectedFields(body: unknown, allowed: readonly string[], operation: string): void {
  if (!body || typeof body !== "object" || Array.isArray(body)) return;
  const allowedFields = new Set(allowed);
  const unexpected = Object.keys(body as Record<string, unknown>).find((key) => !allowedFields.has(key));
  if (unexpected) throw new UnprocessableEntityException(`${operation} contains unsupported client field: ${unexpected}`);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

function rejectUnexpectedBody(body: unknown, operation: string): void {
  if (body === undefined || body === null) return;
  if (typeof body === "object" && !Array.isArray(body) && Object.keys(body as Record<string, unknown>).length === 0) return;
  throw new UnprocessableEntityException(`${operation} does not accept client-supplied fields`);
}

@Injectable()
export class PlatformContainer {
  readonly pool = new Pool({ connectionString: process.env.STOCKQUANT_DATABASE_URL });
  constructor() {
    this.pool.on("error", (error: Error & { code?: string }) => {
      // Idle client failures are emitted by pg-pool independently of a query promise.
      // Keep a transient backend disconnect from becoming an unhandled process error.
      console.warn(`STOCKQUANT_PLATFORM_DATABASE_IDLE_CLIENT_ERROR name=${error.name} code=${error.code ?? "none"}`);
    });
  }
  readonly portfolioApiUrl = process.env.STOCKQUANT_PORTFOLIO_API_URL ?? "http://127.0.0.1:3001";
  readonly governanceUrl = process.env.STOCKQUANT_GOVERNANCE_URL ?? "http://127.0.0.1:3007";
  readonly tradeExecutionUrl = process.env.STOCKQUANT_TRADE_EXECUTION_URL ?? "http://127.0.0.1:3005";
  readonly portfolioToken = process.env.STOCKQUANT_SERVICE_TOKEN_PLATFORM_API ?? "";
  readonly researchAutomationServiceToken = process.env.STOCKQUANT_SERVICE_TOKEN_RESEARCH_AUTOMATION ?? "";
  authorizeResearchAutomationService(authorization: string | undefined, serviceId: string | undefined): void {
    if (serviceId !== "research-automation-service" || !authorization?.startsWith("Bearer ")) throw new UnauthorizedException("research automation service identity is required");
    const supplied = Buffer.from(authorization.slice(7));
    const expected = Buffer.from(this.researchAutomationServiceToken);
    if (expected.length < 32 || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new ForbiddenException("research automation service credential is invalid");
  }
  readonly repository = new PostgresTestRunRepository(this.pool);
  readonly localSessions = new PostgresLocalSessionRepository(this.pool, localUser);
  readonly stageRuns = new PostgresStageRunRepository(this.pool);
  readonly qlibFixtureArtifacts: QlibFixtureArtifactRepository = new PostgresQlibFixtureArtifactRepository(
    this.pool,
    new QlibArtifactContentStore(process.env.STOCKQUANT_ARTIFACT_CONTENT_ROOT ?? "/var/lib/stockquant/research-artifacts"),
  );
  readonly runner = new ScenarioRunner(this.repository, this.portfolioApiUrl, this.portfolioToken);
  readonly executionUrl = process.env.STOCKQUANT_TRADE_EXECUTION_URL ?? "http://127.0.0.1:3005";
  readonly replayWorkerUrl = process.env.STOCKQUANT_HISTORICAL_REPLAY_WORKER_URL ?? "http://127.0.0.1:3006";
  readonly marketDataUrl = process.env.STOCKQUANT_MARKET_DATA_URL ?? "http://127.0.0.1:3002";
  readonly marketMonitorUrl = process.env.STOCKQUANT_MARKET_MONITOR_URL ?? "http://127.0.0.1:3009";
  readonly marketMonitorToken = process.env.STOCKQUANT_SERVICE_TOKEN_MARKET_MONITOR ?? "";
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
  readonly v24DailyTargets = new PostgresV24DailyTargetRepository(this.pool);
  readonly v24CandidateRiskStates = new PostgresV24CandidateRiskStateRepository(this.pool);
  readonly schedulerClock = new SystemClock();
  readonly scheduler = new ContinuousPaperScheduler(this.schedulerClock, this.v24Observation, new V24LiveObservationHandler(
    this.v24Observation,
    this.marketDataUrl,
    this.executionUrl,
    this.portfolioToken,
    process.env.STOCKQUANT_V24_QUOTE_SOURCE_USE_APPROVED === "true",
    process.env.STOCKQUANT_V24_QUOTE_SOURCE_AUTHORIZATION_REF ?? "",
    process.env.STOCKQUANT_V24_QUOTE_DATA_VERSION ?? "",
  ), parseV24SamplingInterval(process.env.STOCKQUANT_V24_SAMPLING_INTERVAL_MINUTES));

  isV24QuoteSourceUseConfigured(): boolean {
    return isV24QuoteSourceUseConfigured({
      approved: process.env.STOCKQUANT_V24_QUOTE_SOURCE_USE_APPROVED === "true",
      authorizationRef: process.env.STOCKQUANT_V24_QUOTE_SOURCE_AUTHORIZATION_REF ?? "",
      dataVersion: process.env.STOCKQUANT_V24_QUOTE_DATA_VERSION ?? "",
    });
  }

  /**
   * A quote-source approval is deliberately insufficient to start the real-time
   * Paper scheduler.  The scheduler observes a live source, so it must remain
   * closed until the owner has recorded the exact OD-007 decision that binds a
   * mandate, strategy, account, risk/cost policy and expiry together.
   */
  isV24ContinuousPaperUseConfigured(): boolean {
    return isV24PaperApprovalConfigured(process.env, this.schedulerClock.now());
  }

  async ready(): Promise<void> {
    if (this.portfolioToken.length < 32) throw new Error("portfolio API bearer credential is not configured");
    await this.pool.query("SELECT 1");
    await requireServiceReadiness(`${this.portfolioApiUrl}/ready`, "portfolio API");
    await requireServiceReadiness(`${this.executionUrl}/ready`, "execution");
    await requireServiceReadiness(`${this.replayWorkerUrl}/ready`, "replay worker");
    if (process.env.STOCKQUANT_V24_AUTO_START === "true" && this.scheduler.status().status !== "RUNNING") {
      throw new Error("V2.4 continuous Paper scheduler is not running");
    }
  }

  async migrateV24(): Promise<void> {
    await this.v24Observation.migrate();
    await this.v24DailyTargets.migrate();
    await this.v24CandidateRiskStates.migrate();
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
  async session(@Res({ passthrough: true }) response: { setHeader: (name: string, value: string) => void }) {
    const issued = await this.container.localSessions.issue();
    response.setHeader("Set-Cookie", `sq_session=${issued.token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${issued.maxAgeSeconds}`);
    return { userId: localUser, mode: "LOCAL_DEVELOPMENT" };
  }

  @Post("session/logout")
  @HttpCode(204)
  async logout(@Headers("cookie") cookie: string | undefined, @Res({ passthrough: true }) response: { setHeader: (name: string, value: string) => void }) {
    const token = cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith("sq_session="))?.slice("sq_session=".length);
    if (token) await this.container.localSessions.revoke(token);
    response.setHeader("Set-Cookie", "sq_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
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
    let body: AccountSnapshot;
    try { body = await new GeneratedPortfolioAccountClient(this.container.portfolioApiUrl, "platform-api-service", this.container.portfolioToken).getAccountSnapshot(accountId, ownerId); }
    catch (error) {
      if (error instanceof PortfolioAccountClientError && error.status === 403) throw new ForbiddenException("account is outside owner scope");
      if (error instanceof PortfolioAccountClientError && error.status === 404) throw new NotFoundException("account was not found");
      throw new ServiceUnavailableException(error instanceof PortfolioAccountClientError ? (error.body as { error?: string } | null)?.error ?? "portfolio account query failed" : "portfolio account query failed");
    }
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
    @Param("testRunId") testRunId: string,
    @Body() body: unknown
  ) {
    rejectClientTradingMode(body);
    rejectUnexpectedBody(body, "V1.1 US account initialization");
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
    let initialized: { snapshot: AccountSnapshot; replayed: boolean };
    try { initialized = await new GeneratedPortfolioAccountClient(this.container.portfolioApiUrl, "platform-api-service", this.container.portfolioToken).initializeAccount(command); }
    catch (error) {
      if (error instanceof PortfolioAccountClientError && error.status === 409) throw new UnprocessableEntityException("US account initialization conflicts with an existing payload");
      throw new ServiceUnavailableException(error instanceof PortfolioAccountClientError ? (error.body as { error?: string } | null)?.error ?? "US account initialization failed" : "US account initialization failed");
    }
    return { evidenceVersion: "v1-dual-account-1", linkedTestRunId: run.testRunId, ownerId, account: initialized.snapshot, replayed: initialized.replayed };
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
    @Body() body: { scenarioId?: ScenarioId; seed?: number; environmentMode?: string; brokerMode?: string }
  ) {
    rejectClientTradingMode(body);
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => !["scenarioId", "seed"].includes(key))) {
      throw new UnprocessableEntityException("V1.1 run request contains unsupported fields");
    }
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
  ): Promise<V11AcceptanceRun> {
    const run = await this.container.repository.find(testRunId, identity(cookie, testHeader));
    if (!run) throw new NotFoundException("test run was not found in user scope");
    return { ...run, assertions: await this.container.repository.assertions(testRunId) };
  }

  @Post("acceptance/runs/:testRunId/continue-recovery")
  @HttpCode(202)
  async continueRecovery(
    @Headers("cookie") cookie: string | undefined,
    @Headers("x-stockquant-user") testHeader: string | undefined,
    @Param("testRunId") testRunId: string,
    @Body() body?: unknown
  ) {
    rejectUnexpectedBody(body, "V1.1 recovery continuation");
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
  private readonly marketDataClient: GeneratedV21MarketDataClient;
  private readonly quantPreviewClient: GeneratedQuantV12PreviewClient;
  constructor(private readonly container: PlatformContainer) {
    this.marketDataClient = new GeneratedV21MarketDataClient(this.marketUrl, () => this.container.marketDataHeaders());
    this.quantPreviewClient = new GeneratedQuantV12PreviewClient(this.quantUrl, () => this.container.quantResearchHeaders());
    this.service = new V12AcceptanceService(container.stageRuns, this.marketDataClient, {
      getV12QlibProbe: () => this.quantPreviewClient.getV12QlibProbe(),
      getV12FactorPreview: () => this.quantPreviewClient.getV12FactorPreview(),
      fitQlibFixtureModel: (request) => this.quantQlibClient().fitQlibFixtureModel(request)
    }, container.qlibFixtureArtifacts, new HttpV12StrategyGovernanceClient(container.governanceUrl, container.portfolioToken));
  }
  resumePending() { return this.service.resumePending(); }
  @Get("scenarios") scenarios(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return V12_SCENARIOS; }
  @Get("data/normal") normal(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return this.marketDataClient.getV12NormalFixturePreview(); }
  @Get("data/bad-future") bad(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return this.marketDataClient.getV12FutureFixturePreview(); }
  @Get("data/research") researchFixture(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return this.marketDataClient.getV12ResearchFixturePreview(); }
  @Get("quant/probe") probe(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return this.quantPreviewClient.getV12QlibProbe(); }
  @Get("quant/factors") factors(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return this.quantPreviewClient.getV12FactorPreview(); }
  @Get("quant/rdagent-probe") rdagent(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return this.quantPreviewClient.getV12RDagentProbe(); }
  @Post("runs") @HttpCode(202) async create(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: { scenarioId?: V12Scenario; seed?: number }) { const ownerId = identity(cookie, testHeader); if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => !["scenarioId", "seed"].includes(key))) throw new UnprocessableEntityException("V1.2 run request contains unsupported fields"); const scenarioId = body.scenarioId; if (!V12_SCENARIOS.some((item) => item.scenarioId === scenarioId)) throw new ForbiddenException("scenario is not available for V1.2"); return this.service.create(ownerId, scenarioId as V12Scenario, body.seed ?? 20260907); }
  @Post("runs/:testRunId/cancel") @HttpCode(202) async cancel(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") testRunId: string, @Body() body?: unknown) {
    rejectUnexpectedBody(body, "V1.2 cancellation");
    const run = await this.service.cancel(testRunId, identity(cookie, testHeader));
    return { accepted: true, testRunId, status: run.status, cancelRequested: (run.evidence.qlibTask as Record<string, unknown> | undefined)?.cancelRequested === true };
  }
  @Get("runs/:testRunId") async get(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") id: string) { const run = await this.service.find(id, identity(cookie, testHeader)); if (!run || run.stageId !== "V1.2") throw new NotFoundException("V1.2 run was not found in user scope"); return run; }
  @Get("runs/:testRunId/artifacts/:artifactId") async artifact(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") testRunId: string, @Param("artifactId") artifactId: string) {
    const ownerId = identity(cookie, testHeader);
    const run = await this.service.find(testRunId, ownerId);
    if (!run || run.stageId !== "V1.2" || run.scenarioId !== "normal") throw new NotFoundException("owned V1.2 normal TestRun was not found");
    const artifact = await this.container.qlibFixtureArtifacts.find(testRunId, artifactId, ownerId);
    return { ...artifact, artifactRef: projectV12QlibArtifactRef(artifact) };
  }
  private quantQlibClient() { return new GeneratedQuantQlibClient(this.quantUrl, () => this.container.quantResearchHeaders()); }
}

@Controller("api/v1/acceptance/v1/v1.3")
export class V13AcceptanceController {
  private readonly engine = new V13TradingEngine();
  private readonly service: PersistentStageRunService;
  private readonly fixtureCalendar: GeneratedV24MarketObservationClient;
  private readonly sessionAdvance: V13SessionAdvanceService;
  constructor(private readonly container: PlatformContainer) {
    this.service = new PersistentStageRunService(container.stageRuns, "V1.3", (scenarioId, seed) => this.engine.run(scenarioId as V13Scenario, seed));
    this.fixtureCalendar = new GeneratedV24MarketObservationClient(container.marketDataUrl, container.portfolioToken);
    this.sessionAdvance = new V13SessionAdvanceService({
      runs: container.stageRuns,
      readAccount: async (accountId, ownerId) => {
        try { return await this.portfolioAccountClient().getAccountSnapshot(accountId, ownerId); }
        catch (error) {
          if (error instanceof PortfolioAccountClientError && error.status === 404) throw new V13SessionAdvanceError(404, "V1.3 Portfolio account was not found in user scope");
          throw error;
        }
      },
      readReconciliation: async (namespace) => {
        const response = await new GeneratedPlatformPaperExecutionClient(container.executionUrl, container.portfolioToken).readV24PaperReconciliationSummary(namespace);
        if (!response.ok) throw new Error(`FakeBroker reconciliation read failed (${response.status})`);
        return await response.json() as { unresolved_order_count?: number; pending_outbox_count?: number; externalOnlyOrderCount?: number };
      },
      readIndependentAssets: async (namespace, accountId) => {
        const response = await new GeneratedPlatformV13ManualTradeClient(container.tradeExecutionUrl, container.portfolioToken).readIndependentAssets(namespace, accountId);
        if (response.status !== 200 || !response.body || typeof response.body !== "object") throw new Error(`FakeBroker asset ledger read failed (${response.status})`);
        return response.body as { owner_id?: string; test_run_id?: string; currency?: string; current_cash?: string; positions?: Array<{ security: string; quantity: number }>; unsettledReceivables?: Array<{ fillId: string; amount: string; currency: string; tradeDate: string; settlementDate: string | null; calendarVersion: string; settlementErrorCode: "SETTLEMENT_CALENDAR_UNAVAILABLE" | null; status: "PENDING" | "SETTLED" }> };
      },
      readCalendarDay: (date) => this.fixtureCalendar.getCnAShareCalendarSession(date),
      settleDue: async (namespace, accountId, asOf, ownerId, testRunId) => {
        const response = await new GeneratedPlatformV13ManualTradeClient(container.tradeExecutionUrl, container.portfolioToken).settleForSession({ namespace, accountId, asOf, ownerId, testRunId });
        if (response.status !== 200) throw new Error(`V1.3 settlement failed (${response.status})`);
      },
    });
  }
  @Get("scenarios") scenarios(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return V13_SCENARIOS; }
  @Post("runs") @HttpCode(202) async create(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: V13PaperStageRunRequest) {
    const ownerId = identity(cookie, testHeader);
    if (!isV13PaperStageRunRequest(body)) throw new UnprocessableEntityException("request must match the frozen V1.3 scenario and seed contract");
    return this.service.create(ownerId, body.scenarioId, body.seed);
  }
  @Post("runs/:testRunId/accounts") @HttpCode(201)
  async initializeAccount(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") testRunId: string, @Body() body: { market?: string }) {
    rejectClientTradingMode(body);
    rejectClientOwnedV13Facts(body);
    const ownerId = identity(cookie, testHeader);
    const run = await this.container.stageRuns.find(testRunId, ownerId);
    if (!run || run.stageId !== "V1.3") throw new NotFoundException("V1.3 TestRun was not found in user scope");
    if (body.market !== "CN_A" && body.market !== "US_EQUITY") throw new UnprocessableEntityException("market must be CN_A or US_EQUITY");
    const currency = body.market === "CN_A" ? "CNY" : "USD";
    const account = await this.portfolioAccountClient().initializeAccount({
      fixtureAccountRef: `v13-${body.market}-${testRunId}`, ownerId, market: body.market,
      environmentMode: "PAPER", brokerMode: "FAKE", initialCash: { amount: "10000.00", currency },
      namespace: run.namespace, testRunId, idempotencyKey: `v13-account-${body.market}-${testRunId}`,
    }).catch((error: unknown) => {
      if (error instanceof PortfolioAccountClientError && error.status === 409) throw new ConflictException("V1.3 account initialization conflicts with an existing command");
      throw new ServiceUnavailableException("V1.3 isolated Portfolio account initialization failed");
    });
    let initializedRun = run;
    let initializationAdvance: import("../ports/stage-run-repository.js").V13SessionAdvance | null = null;
    if (body.market === "US_EQUITY" && run.evidence.calendarVersion !== "v1.3-us-synthetic-session-1") {
      const clock = String(run.evidence.runClockNow);
      const firstSession = await resolveFirstV13UsSession(clock, readV13UsSyntheticCalendarDay);
      const advanced = await this.container.stageRuns.advanceV13Session({ testRunId, ownerId, expectedClock: clock, nextClock: firstSession.clock, calendarVersion: firstSession.calendarVersion });
      initializedRun = advanced.run;
      initializationAdvance = advanced.event;
    }
    return { linkedTestRunId: testRunId, ownerId, replayed: account.replayed, account: account.snapshot, run: initializedRun, initializationAdvance, brokerMode: "FAKE", environmentMode: "PAPER" };
  }
  @Get("runs/:testRunId/clock")
  async readV13SessionClock(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") testRunId: string) {
    const ownerId = identity(cookie, testHeader);
    const run = await this.container.stageRuns.find(testRunId, ownerId);
    if (!run || run.stageId !== "V1.3") throw new NotFoundException("V1.3 TestRun was not found in user scope");
    return { testRunId, clockNow: run.evidence.runClockNow, calendarVersion: run.evidence.calendarVersion ?? null, advances: await this.container.stageRuns.listV13SessionAdvances(testRunId, ownerId) };
  }
  @Post("runs/:testRunId/clock/advance-session") @HttpCode(200)
  async advanceV13Session(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") testRunId: string, @Body() body: { expectedClock?: string; accountId?: string }) {
    rejectClientTradingMode(body);
    rejectClientOwnedV13Facts(body);
    const ownerId = identity(cookie, testHeader);
    try {
      return await this.sessionAdvance.advance({ testRunId, ownerId, accountId: body.accountId ?? "", expectedClock: body.expectedClock ?? "" });
    } catch (error) {
      if (!(error instanceof V13SessionAdvanceError)) throw error;
      if (error.status === 403) throw new ForbiddenException(error.message);
      if (error.status === 404) throw new NotFoundException(error.message);
      if (error.status === 409) throw new ConflictException(error.message);
      if (error.status === 422) throw new UnprocessableEntityException({ code: error.code ?? "INVALID_SESSION_ADVANCE", message: error.message });
      throw new ServiceUnavailableException(error.message);
    }
  }
  @Post("runs/:testRunId/external-orders/observe") @HttpCode(201)
  async observeV13ExternalOrder(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") testRunId: string, @Body() body?: unknown) {
    rejectUnexpectedBody(body, "external-order observation");
    const ownerId = identity(cookie, testHeader);
    const run = await this.container.stageRuns.find(testRunId, ownerId);
    if (!run || run.stageId !== "V1.3" || typeof run.evidence.runClockNow !== "string") throw new NotFoundException("V1.3 TestRun was not found in user scope");
    const observation = await new GeneratedPlatformPaperExecutionClient(this.container.executionUrl, this.container.portfolioToken).recordSimulatedFakeBrokerExternalOrder({
      namespace: run.namespace,
      externalOrderId: `v13-external-${testRunId}`,
      security: "600000.SH",
      requestedQuantity: 100,
      status: "NEW",
      evidenceRef: `fixture:${testRunId}:independent-external-order`,
      observedAt: run.evidence.runClockNow,
    });
    if (![200, 201].includes(observation.status)) throw new ServiceUnavailableException(`V1.3 FakeBroker external-order observation failed (${observation.status})`);
    const summary = await new GeneratedPlatformPaperExecutionClient(this.container.executionUrl, this.container.portfolioToken).readV24PaperReconciliationSummary(run.namespace);
    if (!summary.ok) throw new ServiceUnavailableException(`V1.3 FakeBroker reconciliation read failed (${summary.status})`);
    return { observation: await observation.json().catch(() => ({})), reconciliation: await summary.json() };
  }
  @Get("runs/:testRunId/reconciliation")
  async readV13Reconciliation(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") testRunId: string) {
    const ownerId = identity(cookie, testHeader);
    const run = await this.container.stageRuns.find(testRunId, ownerId);
    if (!run || run.stageId !== "V1.3") throw new NotFoundException("V1.3 TestRun was not found in user scope");
    const response = await new GeneratedPlatformPaperExecutionClient(this.container.executionUrl, this.container.portfolioToken).readV24PaperReconciliationSummary(run.namespace);
    if (!response.ok) throw new ServiceUnavailableException(`V1.3 FakeBroker reconciliation read failed (${response.status})`);
    return response.json();
  }
  @Post("runs/:testRunId/proposals") @HttpCode(201)
  async createProposal(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") testRunId: string, @Body() body: Omit<V13ProposalCommand, "ownerId" | "testRunId">) {
    const ownerId = identity(cookie, testHeader);
    rejectClientTradingMode(body);
    rejectClientOwnedV13Facts(body);
    rejectUnexpectedFields(body, ["idempotencyKey", "accountId", "strategyVersion", "approvalMode", "market", "currency", "operation", "expiresAt", "legs"], "V1.3 proposal creation");
    const run = await this.container.stageRuns.find(testRunId, ownerId);
    if (!run || run.stageId !== "V1.3") throw new NotFoundException("V1.3 TestRun was not found in user scope");
    const approvalMode = body.approvalMode ?? "MANUAL_APPROVAL";
    if ((approvalMode === "MANUAL_APPROVAL" && body.strategyVersion !== "fixture-manual-test-v1") || (approvalMode === "AUTO_POLICY" && body.strategyVersion !== "fixture-auto-policy-test-v1")) throw new ForbiddenException("only the isolated manual or AUTO_POLICY V1.3 Fixture strategy is available");
    let verifiedAccount: { market: string; cash: { currency: string } };
    try {
      const account = await this.portfolioAccountClient().getAccountSnapshot(body.accountId, ownerId);
      if (account.testRunId !== testRunId || account.namespace !== run.namespace || account.environmentMode !== "PAPER" || account.brokerMode !== "FAKE" || !["CN_A","US_EQUITY"].includes(account.market) || !["CNY","USD"].includes(account.cash.currency) || (account.market === "CN_A") !== (account.cash.currency === "CNY")) throw new ForbiddenException("Portfolio account is outside this PAPER/FAKE TestRun scope");
      if ((body.market && body.market !== account.market) || (body.currency && body.currency !== account.cash.currency)) throw new ForbiddenException("proposal market/currency does not match its isolated account");
      verifiedAccount = account;
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      if (error instanceof PortfolioAccountClientError && error.status === 404) throw new NotFoundException("isolated Portfolio account was not found");
      throw new ServiceUnavailableException("could not verify isolated Portfolio account ownership and TestRun scope");
    }
    const response = await this.v13ProposalClient().createProposal({ ...body, market: verifiedAccount.market as "CN_A" | "US_EQUITY", currency: verifiedAccount.cash.currency as "CNY" | "USD", environmentMode: "PAPER", brokerMode: "FAKE", ownerId, testRunId });
    if (response.status === 201 && response.body && "proposalId" in response.body) return response.body;
    if (response.status === 409) throw new ConflictException(response.body);
    if (response.status === 422) throw new UnprocessableEntityException(response.body);
    throw new ServiceUnavailableException(`Decision Governance proposal persistence failed (${response.status})`);
  }
  @Post("runs/:testRunId/auto-mandates") @HttpCode(201)
  async createAutoMandate(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") testRunId: string, @Body() body: { mandateId: string; accountId: string; strategyVersion: string; market: "CN_A" | "US_EQUITY"; currency: "CNY" | "USD"; securityScope: string[]; maxOrderAmount: string; maxTotalAmount: string; maxOrderCount: number; validFrom: string; expiresAt: string; reason: string }) {
    const ownerId = identity(cookie, testHeader);
    rejectClientTradingMode(body);
    rejectClientOwnedV13Facts(body);
    rejectUnexpectedFields(body, ["mandateId", "accountId", "strategyVersion", "market", "currency", "securityScope", "maxOrderAmount", "maxTotalAmount", "maxOrderCount", "validFrom", "expiresAt", "reason"], "V1.3 AUTO_POLICY Mandate creation");
    const run = await this.container.stageRuns.find(testRunId, ownerId);
    if (!run || run.stageId !== "V1.3" || typeof run.evidence.runClockNow !== "string") throw new NotFoundException("V1.3 TestRun or its injected clock was not found");
    if (body.strategyVersion !== "fixture-auto-policy-test-v1") throw new ForbiddenException("only the isolated AUTO_POLICY Fixture strategy can receive a V1.3 test Mandate");
    const now = Date.parse(run.evidence.runClockNow); const validFrom = Date.parse(body.validFrom); const expiresAt = Date.parse(body.expiresAt);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(body.mandateId) || ![now, validFrom, expiresAt].every(Number.isFinite) || validFrom < now || expiresAt <= validFrom || expiresAt > now + 24 * 60 * 60 * 1000 || !Number.isSafeInteger(body.maxOrderCount) || body.maxOrderCount < 1 || body.maxOrderCount > 100 || !Array.isArray(body.securityScope) || body.securityScope.length === 0 || !body.reason?.trim()) throw new UnprocessableEntityException("AUTO_POLICY Mandate identity, limits, scope and bounded TestRun-clock validity are required");
    try {
      const account = await this.portfolioAccountClient().getAccountSnapshot(body.accountId, ownerId);
      if (account.testRunId !== testRunId || account.namespace !== run.namespace || account.market !== body.market || account.cash.currency !== body.currency || account.environmentMode !== "PAPER" || account.brokerMode !== "FAKE") throw new ForbiddenException("AUTO_POLICY Mandate account is outside this PAPER/FAKE TestRun scope");
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      if (error instanceof PortfolioAccountClientError && error.status === 404) throw new NotFoundException("isolated Portfolio account was not found");
      throw new ServiceUnavailableException("could not verify AUTO_POLICY Mandate account ownership and TestRun scope");
    }
    const response = await this.autoMandateClient().create({ mandateId: body.mandateId, mandateVersion: 1, testRunId, accountId: body.accountId, strategyVersion: body.strategyVersion, market: body.market, currency: body.currency, securityScope: body.securityScope, maxOrderAmount: body.maxOrderAmount, maxTotalAmount: body.maxTotalAmount, maxOrderCount: body.maxOrderCount, validFrom: body.validFrom, expiresAt: body.expiresAt, reason: body.reason.trim(), now: run.evidence.runClockNow }, ownerId, ownerId);
    if (response.status === 201 || response.status === 200) {
      const created = response.body as { status?: string; contentHash?: string; replayed?: boolean } | undefined;
      if (!created?.status || !created.contentHash) throw new ServiceUnavailableException("Decision Governance AUTO_POLICY Mandate create response omitted its persisted identity");
      return {
        mandateId: body.mandateId, mandateVersion: 1, testRunId, accountId: body.accountId, ownerId,
        strategyVersion: body.strategyVersion, market: body.market, currency: body.currency,
        securityScope: body.securityScope, maxOrderAmount: body.maxOrderAmount, maxTotalAmount: body.maxTotalAmount,
        maxOrderCount: body.maxOrderCount, validFrom: body.validFrom, expiresAt: body.expiresAt,
        status: created.status, contentHash: created.contentHash, replayed: created.replayed === true,
      };
    }
    if (response.status === 409) throw new ConflictException(response.body);
    if (response.status === 422) throw new UnprocessableEntityException(response.body);
    throw new ServiceUnavailableException(`Decision Governance AUTO_POLICY Mandate create failed (${response.status})`);
  }
  @Get("runs/:testRunId/auto-mandates/:mandateId")
  async readAutoMandate(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") testRunId: string, @Param("mandateId") mandateId: string) {
    const ownerId = identity(cookie, testHeader);
    const run = await this.container.stageRuns.find(testRunId, ownerId);
    if (!run || run.stageId !== "V1.3") throw new NotFoundException("V1.3 TestRun was not found in user scope");
    if (!/^[0-9a-f-]{36}$/iu.test(mandateId)) throw new UnprocessableEntityException("valid Mandate UUID is required");
    const response = await this.autoMandateClient().read(mandateId, testRunId, ownerId);
    if (response.status === 200 && typeof response.body === "object" && response.body !== null && "mandateId" in response.body) return response.body;
    if (response.status === 404) throw new NotFoundException("Mandate was not found in this owner/TestRun scope");
    throw new ServiceUnavailableException(`Decision Governance AUTO_POLICY Mandate read failed (${response.status})`);
  }
  @Get("runs/:testRunId/auto-mandates/:mandateId/versions/:mandateVersion/budget")
  async readAutoMandateBudget(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") testRunId: string, @Param("mandateId") mandateId: string, @Param("mandateVersion") versionText: string) {
    const ownerId = identity(cookie, testHeader);
    const run = await this.container.stageRuns.find(testRunId, ownerId);
    const mandateVersion = Number(versionText);
    if (!run || run.stageId !== "V1.3") throw new NotFoundException("V1.3 TestRun was not found in user scope");
    if (!/^[0-9a-f-]{36}$/iu.test(mandateId) || !Number.isSafeInteger(mandateVersion) || mandateVersion < 1) throw new UnprocessableEntityException("valid Mandate UUID and version are required");
    const mandateResponse = await this.autoMandateClient().read(mandateId, testRunId, ownerId);
    if (mandateResponse.status === 404) throw new NotFoundException("Mandate was not found in this owner/TestRun scope");
    const mandate = mandateResponse.body as Record<string, unknown> | undefined;
    if (mandateResponse.status !== 200 || !mandate || mandate.mandateId !== mandateId || mandate.ownerId !== ownerId || mandate.testRunId !== testRunId || mandate.mandateVersion !== mandateVersion) throw new ServiceUnavailableException(`Decision Governance Mandate scope read failed (${mandateResponse.status})`);
    const response = await this.autoMandateClient().readBudget(mandateId, testRunId, mandateVersion, ownerId);
    if (response.status === 404) throw new NotFoundException("Mandate budget was not found in this owner/TestRun scope");
    if (response.status !== 200 || !response.body || typeof response.body !== "object") throw new ServiceUnavailableException(`Decision Governance Mandate budget read failed (${response.status})`);
    const budget = response.body as Record<string, unknown>;
    const verified = budget.ownerId === ownerId && budget.testRunId === testRunId && budget.mandateId === mandateId && budget.mandateVersion === mandateVersion
      && budget.reservedAmount === "0.00" && budget.consumedAmount !== undefined && budget.releasedAmount === "0.00"
      && budget.reservationCount === 1 && budget.consumedCount === 1 && budget.releasedCount === 0;
    return { status: verified ? "VERIFIED" : "NOT_VERIFIED", readStatus: response.status, snapshot: budget };
  }
  @Post("runs/:testRunId/auto-mandates/:mandateId/activate")
  async activateAutoMandate(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") testRunId: string, @Param("mandateId") mandateId: string, @Body() body: { mandateVersion?: number; contentHash?: string; reason?: string }) {
    const ownerId = identity(cookie, testHeader);
    rejectClientTradingMode(body);
    rejectClientOwnedV13Facts(body);
    rejectUnexpectedFields(body, ["mandateVersion", "contentHash", "reason"], "V1.3 AUTO_POLICY Mandate activation");
    const run = await this.container.stageRuns.find(testRunId, ownerId);
    if (!run || run.stageId !== "V1.3" || typeof run.evidence.runClockNow !== "string") throw new NotFoundException("V1.3 TestRun or its injected clock was not found");
    if (!Number.isSafeInteger(body.mandateVersion) || !/^[a-f0-9]{64}$/u.test(body.contentHash ?? "") || !body.reason?.trim()) throw new UnprocessableEntityException("exact Mandate version/hash and activation reason are required");
    const response = await this.autoMandateClient().activate(mandateId, { mandateVersion: body.mandateVersion!, testRunId, contentHash: body.contentHash!, reason: body.reason.trim(), now: run.evidence.runClockNow }, ownerId, ownerId);
    if (response.status === 200) return response.body;
    if (response.status === 409) throw new ConflictException(response.body);
    if (response.status === 422) throw new UnprocessableEntityException(response.body);
    throw new ServiceUnavailableException(`Decision Governance AUTO_POLICY Mandate activation failed (${response.status})`);
  }
  @Post("runs/:testRunId/auto-mandates/:mandateId/pause")
  async pauseAutoMandate(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") testRunId: string, @Param("mandateId") mandateId: string, @Body() body: { mandateVersion?: number; reason?: string }) {
    const ownerId = identity(cookie, testHeader);
    rejectClientTradingMode(body);
    rejectClientOwnedV13Facts(body);
    rejectUnexpectedFields(body, ["mandateVersion", "reason"], "V1.3 AUTO_POLICY Mandate pause");
    const run = await this.container.stageRuns.find(testRunId, ownerId);
    if (!run || run.stageId !== "V1.3" || typeof run.evidence.runClockNow !== "string") throw new NotFoundException("V1.3 TestRun or its injected clock was not found");
    if (!Number.isSafeInteger(body.mandateVersion) || !body.reason?.trim()) throw new UnprocessableEntityException("exact Mandate version and pause reason are required");
    const response = await this.autoMandateClient().pause(mandateId, { mandateVersion: body.mandateVersion!, testRunId, reason: body.reason.trim(), now: run.evidence.runClockNow }, ownerId, ownerId);
    if (response.status === 200) return response.body;
    if (response.status === 409) throw new ConflictException(response.body);
    if (response.status === 422) throw new UnprocessableEntityException(response.body);
    throw new ServiceUnavailableException(`Decision Governance AUTO_POLICY Mandate pause failed (${response.status})`);
  }
  @Get("runs/:testRunId/proposals/:proposalId")
  async readProposal(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") testRunId: string, @Param("proposalId") proposalId: string) {
    const ownerId = identity(cookie, testHeader);
    const run = await this.container.stageRuns.find(testRunId, ownerId);
    if (!run || run.stageId !== "V1.3") throw new NotFoundException("V1.3 TestRun was not found in user scope");
    const response = await this.v13ProposalClient().readProposal(proposalId, ownerId);
    if (response.status === 404) throw new NotFoundException("proposal was not found in user scope");
    if (response.status !== 200 || !response.body || !("proposalId" in response.body)) throw new ServiceUnavailableException(`Decision Governance proposal read failed (${response.status})`);
    const proposal = response.body as V13ProposalResult;
    if (proposal.ownerId !== ownerId || proposal.testRunId !== testRunId) throw new NotFoundException("proposal was not found in this TestRun scope");
    return proposal;
  }
  @Post("runs/:testRunId/proposals/:proposalId/revisions/append")
  async reviseProposal(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") testRunId: string, @Param("proposalId") proposalId: string, @Body() body: { expectedVersion?: number; expectedContentHash?: string; operation?: "HOLD" | "REBALANCE"; expiresAt?: string; legs?: V13ProposalCommand["legs"]; reason?: string }) {
    const actorId = identity(cookie, testHeader);
    rejectClientTradingMode(body);
    rejectClientOwnedV13Facts(body);
    rejectUnexpectedFields(body, ["expectedVersion", "expectedContentHash", "operation", "expiresAt", "legs", "reason"], "V1.3 proposal revision");
    try {
      return await reviseV13Proposal({ ownerId: actorId, testRunId, proposalId, expectedVersion: body.expectedVersion ?? 0, expectedContentHash: body.expectedContentHash ?? "", operation: body.operation ?? "", expiresAt: body.expiresAt ?? "", legs: body.legs ?? [], reason: body.reason ?? "" }, {
        findRun: (runId, ownerId) => this.container.stageRuns.find(runId, ownerId),
        readProposal: async (id, ownerId) => {
          const current = await this.v13ProposalClient().readProposal(id, ownerId);
          return { status: current.status, ...(current.body && "proposalId" in current.body ? { body: current.body as V13ProposalResult } : {}) };
        },
        reviseProposal: async (id, ownerId, input) => {
          const response = await this.v13ProposalClient().reviseProposal(id, ownerId, ownerId, input);
          return { status: response.status, ...(response.body !== undefined ? { body: response.body } : {}) };
        },
      });
    } catch (error) {
      if (!(error instanceof V13ProposalRevisionError)) throw error;
      if (error.status === 404) throw new NotFoundException(error.body ?? error.message);
      if (error.status === 409) throw new ConflictException(error.body ?? error.message);
      if (error.status === 422) throw new UnprocessableEntityException(error.body ?? error.message);
      throw new ServiceUnavailableException(error.message);
    }
  }
  @Post("runs/:testRunId/proposals/:proposalId/:action")
  async decideProposal(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") testRunId: string, @Param("proposalId") proposalId: string, @Param("action") action: string, @Body() body: { expectedVersion?: number; expectedContentHash?: string; reason?: string }) {
    const actorId = identity(cookie, testHeader);
    rejectClientTradingMode(body);
    rejectClientOwnedV13Facts(body);
    rejectUnexpectedFields(body, ["expectedVersion", "expectedContentHash", "reason"], "V1.3 proposal decision");
    try {
      return await decideV13Proposal({ ownerId: actorId, testRunId, proposalId, action, expectedVersion: body.expectedVersion ?? 0, expectedContentHash: body.expectedContentHash ?? "", reason: body.reason ?? "" }, {
        findRun: (runId, ownerId) => this.container.stageRuns.find(runId, ownerId),
        readProposal: async (id, ownerId) => {
          const response = await this.v13ProposalClient().readProposal(id, ownerId);
          return { status: response.status, ...(response.body && "proposalId" in response.body ? { body: response.body as V13ProposalResult } : {}) };
        },
        decideProposal: async (id, decision, ownerId, input) => {
          const response = await this.v13ProposalClient().decideProposal(id, decision, ownerId, input);
          return { status: response.status, ...(response.body && "proposalId" in response.body ? { body: response.body } : {}) };
        },
      });
    } catch (error) {
      if (!(error instanceof V13ProposalDecisionError)) throw error;
      if (error.status === 404) throw new NotFoundException(error.message);
      if (error.status === 409) throw new ConflictException(error.body ?? error.message);
      if (error.status === 422) throw new UnprocessableEntityException(error.body ?? error.message);
      throw new ServiceUnavailableException(error.message);
    }
  }
  @Post("runs/:testRunId/proposals/:proposalId/execution/submit") @HttpCode(202)
  async executeProposal(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") testRunId: string, @Param("proposalId") proposalId: string, @Body() body: { clientOrderId?: string }) {
    rejectClientTradingMode(body);
    rejectClientOwnedV13Facts(body);
    const ownerId = identity(cookie, testHeader);
    try {
      return await executeV13ManualProposal({ ownerId, testRunId, proposalId, clientOrderId: body.clientOrderId ?? "" }, {
        findRun: (runId, actor) => this.container.stageRuns.find(runId, actor),
        readProposal: async (id, actor) => {
          const response = await this.v13ProposalClient().readProposal(id, actor);
          return { status: response.status, ...(response.body && "proposalId" in response.body ? { body: response.body as V13ProposalResult } : {}) };
        },
        readAccount: async (accountId, actor) => {
          try { return await this.portfolioAccountClient().getAccountSnapshot(accountId, actor); }
          catch (error) {
            if (error instanceof PortfolioAccountClientError && error.status === 404) return null;
            throw error;
          }
        },
        executeTrade: (command) => new GeneratedPlatformV13ManualTradeClient(this.container.tradeExecutionUrl, this.container.portfolioToken).executeApprovedManualProposal(command),
      });
    } catch (error) {
      if (!(error instanceof V13ManualExecutionError)) throw error;
      if (error.status === 404) throw new NotFoundException(error.message);
      if (error.status === 403) throw new ForbiddenException(error.body ?? error.message);
      if (error.status === 409) throw new ConflictException(error.body ?? error.message);
      if (error.status === 422) throw new UnprocessableEntityException(error.body ?? error.message);
      throw new ServiceUnavailableException(error.message);
    }
  }
  @Post("runs/:testRunId/proposals/:proposalId/sequenced-execution/submit") @HttpCode(202)
  async executeSequencedProposal(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") testRunId: string, @Param("proposalId") proposalId: string, @Body() body: { clientOrderId?: string }) {
    rejectClientTradingMode(body);
    rejectClientOwnedV13Facts(body);
    const ownerId = identity(cookie, testHeader);
    const run = await this.container.stageRuns.find(testRunId, ownerId);
    if (!run || run.stageId !== "V1.3" || typeof run.evidence.runClockNow !== "string") throw new NotFoundException("V1.3 TestRun or its injected clock was not found");
    if (!body.clientOrderId?.trim() || body.clientOrderId.length > 128) throw new UnprocessableEntityException("a bounded clientOrderId is required for idempotent execution");
    const response = await this.v13ProposalClient().readProposal(proposalId, ownerId);
    if (response.status !== 200 || !response.body || !("proposalId" in response.body)) throw new NotFoundException("proposal was not found in user scope");
    const proposal = response.body as V13ProposalResult;
    if (proposal.ownerId !== ownerId || proposal.testRunId !== testRunId) throw new NotFoundException("proposal was not found in this TestRun scope");
    try {
      const account = await this.portfolioAccountClient().getAccountSnapshot(proposal.accountId, ownerId);
      if (account.testRunId !== testRunId || account.namespace !== run.namespace || account.environmentMode !== "PAPER" || account.brokerMode !== "FAKE") throw new ForbiddenException("Portfolio account is outside this PAPER/FAKE TestRun scope");
    } catch (error) {
      if (error instanceof ForbiddenException) throw error;
      if (error instanceof PortfolioAccountClientError && error.status === 404) throw new NotFoundException("isolated Portfolio account was not found");
      throw new ServiceUnavailableException("could not verify isolated Portfolio account ownership and TestRun scope");
    }
    const trade = new GeneratedPlatformV13ManualTradeClient(this.container.tradeExecutionUrl, this.container.portfolioToken);
    const result = await trade.executeSequencedManualProposal({ proposalId, ownerId, testRunId, accountId: proposal.accountId, namespace: run.namespace, clientOrderId: body.clientOrderId, now: run.evidence.runClockNow });
    if ((result.status === 200 || result.status === 201 || result.status === 202) && result.body) return result.body;
    if (result.status === 403) throw new ForbiddenException(result.body);
    if (result.status === 409) throw new ConflictException(result.body);
    if (result.status === 422) throw new UnprocessableEntityException(result.body);
    throw new ServiceUnavailableException(`V1.3 sequenced Trade Execution failed (${result.status})`);
  }
  @Post("runs/:testRunId/proposals/:proposalId/orders/:clientOrderId/sequenced-reports/:sequence") @HttpCode(200)
  async recordSequencedProposalFill(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") testRunId: string, @Param("proposalId") proposalId: string, @Param("clientOrderId") clientOrderId: string, @Param("sequence") sequenceText: string, @Body() body?: unknown) {
    rejectUnexpectedBody(body, "sequenced fill report");
    const ownerId = identity(cookie, testHeader);
    const container = this.container;
    try {
      return await recordV13SequencedProposalFill({ ownerId, testRunId, proposalId, clientOrderId, sequence: Number(sequenceText) }, {
        findRun: (runId, actor) => container.stageRuns.find(runId, actor),
        async readProposal(id, actor) {
          const response = await new GeneratedV13ProposalClient(container.governanceUrl, container.portfolioToken).readProposal(id, actor);
          return { status: response.status, ...(response.body && "proposalId" in response.body ? { body: response.body as V13SequencedFillProposal } : {}) };
        },
        readOrder: (namespace, id) => new GeneratedPlatformV13ManualTradeClient(container.tradeExecutionUrl, container.portfolioToken).readOrderByClientId(namespace, id),
        recordFill: (orderId, report) => new GeneratedPlatformV13ManualTradeClient(container.tradeExecutionUrl, container.portfolioToken).recordSequencedFillReport(orderId, report),
        readOrderProjection: ({ testRunId: runId, proposalId: proposal, clientOrderId: orderId }) => this.readProposalOrder(cookie, testHeader, runId, proposal, orderId),
      });
    } catch (error) {
      if (!(error instanceof V13SequencedFillError)) throw error;
      if (error.status === 403) throw new ForbiddenException(error.body ?? error.message);
      if (error.status === 404) throw new NotFoundException(error.message);
      if (error.status === 409) throw new ConflictException(error.body ?? error.message);
      if (error.status === 422) throw new UnprocessableEntityException(error.body ?? error.message);
      throw new ServiceUnavailableException(error.message);
    }
  }
  private v13CancelPorts(cookie: string | undefined, testHeader: string | undefined): V13CancelPorts {
    const container = this.container;
    return {
      findRun: (runId, actor) => container.stageRuns.find(runId, actor),
      async readProposal(id, actor) {
        const response = await new GeneratedV13ProposalClient(container.governanceUrl, container.portfolioToken).readProposal(id, actor);
        return { status: response.status, ...(response.body && "proposalId" in response.body ? { body: response.body as V13SequencedFillProposal } : {}) };
      },
      readOrder: (namespace, clientOrderId) => new GeneratedPlatformV13ManualTradeClient(container.tradeExecutionUrl, container.portfolioToken).readOrderByClientId(namespace, clientOrderId),
      async readAccount(accountId, actor) {
        return await new GeneratedPortfolioAccountClient(container.portfolioApiUrl, "platform-api-service", container.portfolioToken).getAccountSnapshot(accountId, actor);
      },
      requestCancel: (orderId) => new GeneratedPlatformV13ManualTradeClient(container.tradeExecutionUrl, container.portfolioToken).requestFakeBrokerCancel(orderId),
      resolveCancel: (orderId, command) => new GeneratedPlatformV13ManualTradeClient(container.tradeExecutionUrl, container.portfolioToken).resolveFakeBrokerCancel(orderId, command),
      readOrderProjection: (input) => this.readProposalOrder(cookie, testHeader, input.testRunId, input.proposalId, input.clientOrderId),
    };
  }
  private mapV13OrderCancelError(error: unknown): never {
    if (!(error instanceof V13OrderCancelError)) throw error;
    if (error.status === 403) throw new ForbiddenException(error.body ?? error.message);
    if (error.status === 404) throw new NotFoundException(error.message);
    if (error.status === 409) throw new ConflictException(error.body ?? error.message);
    if (error.status === 422) throw new UnprocessableEntityException(error.body ?? error.message);
    throw new ServiceUnavailableException(error.message);
  }
  @Post("runs/:testRunId/proposals/:proposalId/orders/:clientOrderId/cancel-request") @HttpCode(202)
  async requestL07SequencedCancel(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") testRunId: string, @Param("proposalId") proposalId: string, @Param("clientOrderId") clientOrderId: string, @Body() body?: unknown) {
    rejectUnexpectedBody(body, "sequenced cancel request");
    const ownerId = identity(cookie, testHeader);
    try { return await requestV13L07SequencedCancel({ ownerId, testRunId, proposalId, clientOrderId }, this.v13CancelPorts(cookie, testHeader)); }
    catch (error) { this.mapV13OrderCancelError(error); }
  }
  @Post("runs/:testRunId/proposals/:proposalId/orders/:clientOrderId/cancel-results/:sequence") @HttpCode(200)
  async resolveL07SequencedCancel(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") testRunId: string, @Param("proposalId") proposalId: string, @Param("clientOrderId") clientOrderId: string, @Param("sequence") sequenceText: string, @Body() body?: unknown) {
    const ownerId = identity(cookie, testHeader);
    if (body !== undefined && (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length !== 1)) rejectUnexpectedBody(body, "sequenced cancel result");
    if (body !== undefined && !["ACCEPTED", "REJECTED"].includes((body as { outcome?: string }).outcome ?? "")) throw new UnprocessableEntityException("sequenced cancel result outcome must be ACCEPTED or REJECTED");
    try { return await resolveV13L07SequencedCancel({ ownerId, testRunId, proposalId, clientOrderId, sequence: Number(sequenceText), outcome: (body as { outcome?: "ACCEPTED" | "REJECTED" } | undefined)?.outcome }, this.v13CancelPorts(cookie, testHeader)); }
    catch (error) { this.mapV13OrderCancelError(error); }
  }
  @Post("runs/:testRunId/proposals/:proposalId/orders/:clientOrderId/cancel-partial-fill") @HttpCode(200)
  async cancelPartialFillProposal(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") testRunId: string, @Param("proposalId") proposalId: string, @Param("clientOrderId") clientOrderId: string, @Body() body: { cancelSequence?: number }) {
    const ownerId = identity(cookie, testHeader);
    if (Object.keys(body ?? {}).some((key) => key !== "cancelSequence")) throw new UnprocessableEntityException("L08 cancel body contains an unknown field");
    try { return await cancelV13L08PartialFill({ ownerId, testRunId, proposalId, clientOrderId, cancelSequence: body.cancelSequence === undefined ? 2 : body.cancelSequence }, this.v13CancelPorts(cookie, testHeader)); }
    catch (error) { this.mapV13OrderCancelError(error); }
  }
  @Post("runs/:testRunId/proposals/:proposalId/auto-execution/submit") @HttpCode(202)
  async executeAutoProposal(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") testRunId: string, @Param("proposalId") proposalId: string, @Body() body: { mandateId?: string; mandateVersion?: number; clientOrderId?: string }) {
    rejectClientTradingMode(body);
    rejectClientOwnedV13Facts(body);
    const ownerId = identity(cookie, testHeader);
    const container = this.container;
    try {
      return await executeV13AutoProposal({ ownerId, testRunId, proposalId, mandateId: body.mandateId ?? "", mandateVersion: body.mandateVersion ?? 0, clientOrderId: body.clientOrderId ?? "" }, {
        findRun: (runId, actor) => container.stageRuns.find(runId, actor),
        async readProposal(id, actor) {
          const response = await new GeneratedV13ProposalClient(container.governanceUrl, container.portfolioToken).readProposal(id, actor);
          return { status: response.status, ...(response.body && "proposalId" in response.body ? { body: response.body as V13ProposalResult } : {}) };
        },
        readAccount: async (accountId, actor) => {
          try { return await new GeneratedPortfolioAccountClient(container.portfolioApiUrl, "platform-api-service", container.portfolioToken).getAccountSnapshot(accountId, actor); }
          catch (error) {
            if (error instanceof PortfolioAccountClientError && error.status === 404) return null;
            throw error;
          }
        },
        executeTrade: (command) => new GeneratedPlatformV13ManualTradeClient(container.tradeExecutionUrl, container.portfolioToken).executeAutoPolicyProposal(command),
        readMandateBudget: async (mandateId, runId, version, actor) => {
          const response = await new GeneratedPlatformV13AutoMandateClient(container.governanceUrl, container.portfolioToken).readBudget(mandateId, runId, version, actor);
          return { status: response.status, ...(response.body && typeof response.body === "object" ? { body: response.body as Record<string, unknown> } : {}) };
        },
      });
    } catch (error) {
      if (!(error instanceof V13AutoExecutionError)) throw error;
      if (error.status === 404) throw new NotFoundException(error.message);
      if (error.status === 403) throw new ForbiddenException(error.body ?? error.message);
      if (error.status === 409) throw new ConflictException(error.body ?? error.message);
      if (error.status === 422) throw new UnprocessableEntityException(error.message);
      throw new ServiceUnavailableException(error.message);
    }
  }
  @Get("runs/:testRunId/proposals/:proposalId/orders/:clientOrderId")
  async readProposalOrder(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") testRunId: string, @Param("proposalId") proposalId: string, @Param("clientOrderId") clientOrderId: string): Promise<Record<string, any>> {
    const ownerId = identity(cookie, testHeader);
    const run = await this.container.stageRuns.find(testRunId, ownerId);
    if (!run || run.stageId !== "V1.3") throw new NotFoundException("V1.3 TestRun was not found in user scope");
    const proposalResponse = await this.v13ProposalClient().readProposal(proposalId, ownerId);
    if (proposalResponse.status !== 200 || !proposalResponse.body || !("proposalId" in proposalResponse.body)) throw new NotFoundException("proposal was not found in user scope");
    const proposal = proposalResponse.body as V13ProposalResult;
    if (proposal.ownerId !== ownerId || proposal.testRunId !== testRunId) throw new NotFoundException("proposal was not found in this TestRun scope");
    const trade = new GeneratedPlatformV13ManualTradeClient(this.container.tradeExecutionUrl, this.container.portfolioToken);
    const childClientOrderIds = proposal.legs.length > 1
      ? proposal.legs.map((_leg, index) => `${clientOrderId}:leg:${String(index + 1).padStart(2, "0")}`)
      : [clientOrderId];
    const childResults: Array<Record<string, any>> = [];
    for (const childClientOrderId of childClientOrderIds) {
      const child = await trade.readOrderByClientId(run.namespace, childClientOrderId);
      if (child.status === 404) throw new NotFoundException("FakeBroker order was not found in this TestRun namespace");
      if (child.status !== 200 || !child.body || typeof child.body !== "object") throw new ServiceUnavailableException(`V1.3 FakeBroker original-order read failed (${child.status})`);
      const childFacts = child.body as Record<string, any>;
      if (childFacts.authorization?.proposalId !== proposalId || childFacts.authorization.ownerId !== ownerId || childFacts.authorization.testRunId !== testRunId) throw new NotFoundException("FakeBroker order was not created from this exact owner/TestRun Proposal");
      childResults.push(childFacts);
    }
    const facts = childResults[0];
    const assetsResponse = await new GeneratedPlatformV13ManualTradeClient(this.container.tradeExecutionUrl, this.container.portfolioToken).readIndependentAssets(run.namespace, proposal.accountId);
    if (assetsResponse.status === 404) throw new NotFoundException("independent FakeBroker asset ledger was not found");
    if (assetsResponse.status !== 200 || !assetsResponse.body || typeof assetsResponse.body !== "object") throw new ServiceUnavailableException(`V1.3 independent FakeBroker asset read failed (${assetsResponse.status})`);
    const assets = assetsResponse.body as { owner_id?: string; test_run_id?: string; currency?: string; current_cash?: string; positions?: Array<{ security: string; quantity: number }> };
    if (assets.owner_id !== ownerId || assets.test_run_id !== testRunId) throw new NotFoundException("FakeBroker asset ledger is outside this owner/TestRun scope");
    let portfolio: AccountSnapshot;
    try { portfolio = await this.portfolioAccountClient().getAccountSnapshot(proposal.accountId, ownerId); }
    catch { throw new ServiceUnavailableException("Portfolio snapshot is unavailable for independent FakeBroker reconciliation"); }
    const normalizeMoney = (value: string) => { const [whole, fraction = ""] = value.split("."); return `${BigInt(whole)}:${fraction.padEnd(4, "0").slice(0, 4)}`; };
    const portfolioPositions = [...(portfolio.positions ?? [])].sort((left, right) => left.security.localeCompare(right.security));
    const brokerPositions = [...(assets.positions ?? [])].sort((left, right) => left.security.localeCompare(right.security));
    const positionsMatch = JSON.stringify(portfolioPositions) === JSON.stringify(brokerPositions);
    const cashMatch = assets.currency === portfolio.cash.currency && typeof assets.current_cash === "string" && normalizeMoney(assets.current_cash) === normalizeMoney(portfolio.cash.amount);
    const runReservation = (portfolio.reservations ?? []).filter((item) => childClientOrderIds.includes(item.clientOrderId));
    let mandateBudgetVerification: Record<string, unknown> | undefined;
    const mandateId = facts.authorization?.mandateId;
    const mandateVersion = facts.authorization?.mandateVersion;
    if (typeof mandateId === "string" && Number.isSafeInteger(mandateVersion)) {
      try {
        const budgetResponse = await this.autoMandateClient().readBudget(mandateId, testRunId, Number(mandateVersion), ownerId);
        const budget = budgetResponse.body as Record<string, unknown> | undefined;
        const verified = budgetResponse.status === 200 && budget !== undefined
          && budget.ownerId === ownerId && budget.testRunId === testRunId && budget.mandateId === mandateId
          && budget.mandateVersion === mandateVersion && budget.reservedAmount === "0.00"
          && budget.consumedAmount !== undefined && budget.releasedAmount === "0.00"
          && budget.reservationCount === 1 && budget.consumedCount === 1 && budget.releasedCount === 0;
        mandateBudgetVerification = { status: verified ? "VERIFIED" : "NOT_VERIFIED", readStatus: budgetResponse.status, snapshot: budget ?? null };
      } catch {
        mandateBudgetVerification = { status: "NOT_VERIFIED", readStatus: "UNAVAILABLE", snapshot: null };
      }
    }
    const reconciliation = { status: cashMatch && positionsMatch ? "MATCH" : "DISCREPANCY", portfolio: { cash: portfolio.cash, positions: portfolioPositions, reservations: runReservation }, fakeBroker: { currency: assets.currency, currentCash: assets.current_cash, positions: brokerPositions }, discrepancies: [...(!cashMatch ? ["CASH_MISMATCH"] : []), ...(!positionsMatch ? ["POSITION_MISMATCH"] : [])] };
    if (childResults.length > 1) return {
      replayed: childResults.every((item) => item.replayed === true),
      orders: childResults.map((item) => ({ ...item, clientOrderId: item.order?.clientOrderId })),
      fills: childResults.map((item) => item.fill).filter(Boolean),
      outboxes: childResults.map((item) => item.outbox),
      order: childResults[0].order,
      fill: childResults[0].fill,
      outbox: childResults[0].outbox,
      authorization: facts.authorization,
      ...(mandateBudgetVerification ? { mandateBudgetVerification } : {}), independentAssets: assets, reconciliation,
    };
    return { ...(childResults[0] as Record<string, unknown>), ...(mandateBudgetVerification ? { mandateBudgetVerification } : {}), independentAssets: assets, reconciliation };
  }
  @Post("runs/:testRunId/proposals/:proposalId/orders/:clientOrderId/fills/:externalFillId/fee-corrections")
  @HttpCode(202)
  async correctV13FillFee(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") testRunId: string, @Param("proposalId") proposalId: string, @Param("clientOrderId") clientOrderId: string, @Param("externalFillId") externalFillId: string, @Body() body: { revision?: number; previousFee?: string; correctedFee?: string }) {
    const ownerId = identity(cookie, testHeader);
    const run = await this.container.stageRuns.find(testRunId, ownerId);
    if (!run || run.stageId !== "V1.3" || typeof run.evidence.runClockNow !== "string") throw new NotFoundException("V1.3 TestRun or its injected clock was not found in user scope");
    if (!Number.isSafeInteger(body.revision) || Number(body.revision) < 1 || !/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,4})?$/u.test(body.previousFee ?? "") || !/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,4})?$/u.test(body.correctedFee ?? "") || Object.keys(body).some((key) => !["revision", "previousFee", "correctedFee"].includes(key))) throw new UnprocessableEntityException("revision and bounded previous/corrected fees are required; effective time and evidence are server-owned");
    const proposalResponse = await this.v13ProposalClient().readProposal(proposalId, ownerId);
    if (proposalResponse.status !== 200 || !proposalResponse.body || !("proposalId" in proposalResponse.body)) throw new NotFoundException("proposal was not found in user scope");
    const proposal = proposalResponse.body as V13ProposalResult;
    if (proposal.ownerId !== ownerId || proposal.testRunId !== testRunId) throw new NotFoundException("proposal was not found in this owner/TestRun scope");
    const trade = new GeneratedPlatformV13ManualTradeClient(this.container.tradeExecutionUrl, this.container.portfolioToken);
    const order = await trade.readOrderByClientId(run.namespace, clientOrderId);
    if (order.status === 404) throw new NotFoundException("FakeBroker order was not found in this TestRun namespace");
    if (order.status !== 200 || !order.body || typeof order.body !== "object") throw new ServiceUnavailableException(`V1.3 FakeBroker order read failed (${order.status})`);
    const facts = order.body as { order?: { order_id?: string }; authorization?: Record<string, unknown>; fill?: { externalFillId?: string; fee?: string } };
    if (!facts.order?.order_id || facts.authorization?.proposalId !== proposalId || facts.authorization.ownerId !== ownerId || facts.authorization.testRunId !== testRunId || facts.fill?.externalFillId !== externalFillId) throw new NotFoundException("fill was not created by this exact owner/TestRun Proposal");
    const correction = await trade.correctFillFee(facts.order.order_id, externalFillId, { revision: Number(body.revision), previousFee: body.previousFee!, correctedFee: body.correctedFee!, effectiveAt: run.evidence.runClockNow, evidenceRef: `v13-fee-correction:${testRunId}:${proposalId}:${externalFillId}:${body.revision}` });
    if ([200, 202].includes(correction.status) && correction.body) return correction.body;
    if (correction.status === 404) throw new NotFoundException(correction.body);
    if (correction.status === 409) throw new ConflictException(correction.body);
    if (correction.status === 422) throw new UnprocessableEntityException(correction.body);
    throw new ServiceUnavailableException(`V1.3 FakeBroker fee correction failed (${correction.status})`);
  }
  private v13ProposalClient() { return new GeneratedV13ProposalClient(this.container.governanceUrl, this.container.portfolioToken); }
  private autoMandateClient() { return new GeneratedPlatformV13AutoMandateClient(this.container.governanceUrl, this.container.portfolioToken); }
  private portfolioAccountClient() { return new GeneratedPortfolioAccountClient(this.container.portfolioApiUrl, "platform-api-service", this.container.portfolioToken); }
  @Get("runs/:testRunId") async get(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") id: string) { const run = await this.service.find(id, identity(cookie, testHeader)); if (!run || run.stageId !== "V1.3") throw new NotFoundException("V1.3 run was not found in user scope"); return run; }

  @Post("runs/:testRunId/verify-normal") @HttpCode(200)
  async verifyNormalRun(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") testRunId: string, @Body() body: { proposalId?: string; clientOrderId?: string }) {
    rejectClientTradingMode(body);
    rejectClientOwnedV13Facts(body);
    rejectUnexpectedFields(body, ["proposalId", "clientOrderId"], "V1.3 normal scenario verification");
    if (typeof body.proposalId !== "string" || typeof body.clientOrderId !== "string" || body.proposalId.length > 100 || body.clientOrderId.length > 200) throw new UnprocessableEntityException("proposalId and bounded clientOrderId are required");
    const ownerId = identity(cookie, testHeader);
    const run = await this.container.stageRuns.find(testRunId, ownerId);
    if (!run || run.stageId !== "V1.3" || run.scenarioId !== "normal") throw new NotFoundException("V1.3 normal TestRun was not found in user scope");
    if (run.status !== "WAITING") {
      if (run.status === "COMPLETED" && run.evidence.businessExecution === "MANUAL_FILL_VERIFIED" && run.evidence.verifiedProposalId === body.proposalId && run.evidence.verifiedClientOrderId === body.clientOrderId) return run;
      throw new ConflictException("only a WAITING V1.3 normal TestRun can be completed by business verification");
    }
    const proposalResponse = await this.v13ProposalClient().readProposal(body.proposalId, ownerId);
    if (proposalResponse.status !== 200 || !proposalResponse.body || !("proposalId" in proposalResponse.body)) throw new NotFoundException("proposal was not found in user scope");
    const proposal = proposalResponse.body as V13ProposalResult;
    if (proposal.ownerId !== ownerId || proposal.testRunId !== testRunId || proposal.status !== "APPROVED_MANUAL" || proposal.market !== "CN_A" || proposal.currency !== "CNY") throw new ConflictException("normal verification requires this TestRun's manually approved CN_A Fixture proposal");
    const facts = await this.readProposalOrder(cookie, testHeader, testRunId, body.proposalId, body.clientOrderId);
    const filledQuantity = Number(facts.fill?.quantity);
    const positions = facts.reconciliation?.portfolio?.positions ?? [];
    const expectedPosition = positions.length === 1 && positions[0]?.security === "600000.SH" && positions[0]?.quantity === 100;
    const moneyMatches = (value: unknown, expected: string) => typeof value === "string" && (() => {
      const [whole, fraction = ""] = value.split(".");
      try { return `${BigInt(whole)}:${fraction.padEnd(4, "0").slice(0, 4)}` === `${BigInt(expected.split(".")[0]!)}:${(expected.split(".")[1] ?? "").padEnd(4, "0").slice(0, 4)}`; }
      catch { return false; }
    })();
    if (facts.order?.status !== "FILLED" || filledQuantity !== 100 || facts.reconciliation?.status !== "MATCH" || facts.independentAssets?.currency !== "CNY" || !moneyMatches(facts.independentAssets?.current_cash, "8995.00") || !moneyMatches(facts.reconciliation?.portfolio?.cash?.amount, "8995.00") || !expectedPosition || facts.authorization?.proposalId !== proposal.proposalId || facts.authorization?.ownerId !== ownerId || facts.authorization?.testRunId !== testRunId) {
      throw new ConflictException("authoritative Governance, FakeBroker Fill, Portfolio and cash reconciliation facts do not satisfy the frozen normal Fixture");
    }
    const assertions = [
      { assertionId: "V1.3-EXE-FULL-FILL-001", status: "PASS", expected: { filledQuantity: 100, settledCash: "8995.00 CNY", position: { security: "600000.SH", quantity: 100 } }, actual: { order: facts.order, fill: facts.fill, portfolio: facts.reconciliation.portfolio, fakeBroker: facts.independentAssets, reconciliation: facts.reconciliation } },
      { assertionId: "V1.3-GOV-AUTH-001", status: "PASS", expected: "The exact owner/TestRun Governance Proposal was manually approved before its FakeBroker order", actual: { proposalId: proposal.proposalId, proposalVersion: proposal.proposalVersion, proposalStatus: proposal.status, ownerId, testRunId, authorization: facts.authorization } },
    ];
    return this.container.stageRuns.save({ ...run, status: "COMPLETED", assertions, evidence: { ...run.evidence, evidenceScope: "OWNER_SCOPED_GOVERNANCE_PORTFOLIO_AND_FAKEBROKER_READS", businessExecution: "MANUAL_FILL_VERIFIED", businessServicesCalled: ["decision-governance-service", "trade-execution-service", "portfolio-risk-service", "FakeBroker"], verifiedProposalId: proposal.proposalId, verifiedClientOrderId: body.clientOrderId, orderFacts: facts.order, fillFacts: facts.fill, portfolioLedgerFacts: facts.reconciliation.portfolio, reconciliation: facts.reconciliation } });
  }
}

@Controller("api/v1/acceptance/v1/v1.4")
export class V14AcceptanceController {
  private readonly service: V14BacktestRunService;
  constructor(private readonly container: PlatformContainer) {
    const quantUrl = process.env.STOCKQUANT_QUANT_RESEARCH_URL ?? "http://127.0.0.1:3003";
    const quantClient = new GeneratedQuantV14BacktestClient(quantUrl, () => container.quantResearchHeaders());
    const runner = new V14QuantBacktestAdapter(quantClient, { ...V14_DEFAULT_EXECUTION_POLICY });
    this.service = new V14BacktestRunService(container.stageRuns, (scenarioId, seed, policy, testRunId) => runner.run(scenarioId, seed, policy as typeof V14_DEFAULT_EXECUTION_POLICY, testRunId), (scenarioId) => scenarioId === "market-restrictions" ? "1.2.0" : scenarioId === "historical-fees" ? "1.3.0" : scenarioId === "corporate-actions" ? "1.4.0" : "1.1.0");
  }
  @Get("scenarios") scenarios(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return V14_SCENARIOS; }
  @Post("runs") @HttpCode(202) async create(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: { scenarioId?: V14Scenario; seed?: number; policy?: unknown }) {
    const ownerId = identity(cookie, testHeader);
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => !["scenarioId", "seed", "policy"].includes(key))) throw new UnprocessableEntityException("V1.4 run request contains unsupported fields");
    if (!V14_SCENARIOS.some((s) => s.scenarioId === body.scenarioId)) throw new ForbiddenException("scenario is not available for V1.4");
    let policy: typeof V14_DEFAULT_EXECUTION_POLICY;
    try {
      if (body.scenarioId === "corporate-actions") {
        if (body.policy !== undefined) throw new Error("corporate-actions uses a frozen Fixture policy; omit policy");
        policy = { ...V14_CORPORATE_ACTION_POLICY };
      } else policy = body.policy === undefined ? { ...V14_DEFAULT_EXECUTION_POLICY } : validateV14ExecutionPolicy(body.policy);
    }
    catch (error) { throw new UnprocessableEntityException(error instanceof Error ? error.message : "invalid V1.4 execution policy"); }
    try { return await this.service.create(ownerId, body.scenarioId as V14Scenario, body.seed ?? 20260907, policy); }
    catch (error) { throw new UnprocessableEntityException(error instanceof Error ? error.message : "invalid V1.4 backtest request"); }
  }
  @Get("runs/:testRunId") async get(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") id: string) { const run = await this.service.find(id, identity(cookie, testHeader)); if (!run || run.stageId !== "V1.4") throw new NotFoundException("V1.4 run was not found in user scope"); return { ...run, artifactRefs: projectV14RunArtifactRefs(run) }; }
  @Get("runs/:testRunId/artifacts/:artifactId") async report(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") id: string, @Param("artifactId") artifactId: string) {
    const run = await this.service.find(id, identity(cookie, testHeader));
    if (!run || run.stageId !== "V1.4") throw new NotFoundException("V1.4 report was not found in user scope");
    const verified = verifyV14ReportPayload(run, artifactId);
    if (!verified) throw new NotFoundException("V1.4 report does not belong to this owner/TestRun or failed its immutable hash check");
    return { artifactRef: verified.ref, content: verified.payload };
  }
  @Post("runs/:testRunId/cancel") @HttpCode(202) async cancel(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") id: string, @Body() body?: unknown) { rejectUnexpectedBody(body, "V1.4 cancellation"); const run = await this.service.cancel(id, identity(cookie, testHeader)); return { accepted: true, testRunId: run.testRunId, status: run.status, cancelRequested: true }; }
  resumePending() { return this.service.resumePending(); }
}

@Controller("api/v1/acceptance/v1/v1.5")
export class V15AcceptanceController {
  private readonly engine = new V15OrchestrationEngine();
  private readonly service: PersistentStageRunService;
  private readonly cancellation: V15AutoTradeCancellationService;
  constructor(private readonly container: PlatformContainer) {
    this.service = new PersistentStageRunService(container.stageRuns, "V1.5", (scenarioId, seed) => this.engine.run(scenarioId as V15Scenario, seed), () => "1.1.0");
    this.cancellation = new V15AutoTradeCancellationService(container.stageRuns, container.schedulerClock);
  }
  @Get("scenarios") scenarios(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return V15_SCENARIOS; }
  @Get("runs") async listRuns(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Query("limit") limit?: string) {
    const ownerId = identity(cookie, testHeader);
    const parsedLimit = limit === undefined ? 20 : Number(limit);
    if (!Number.isSafeInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) throw new UnprocessableEntityException("limit must be an integer from 1 to 50");
    return this.container.stageRuns.listV15Runs(ownerId, parsedLimit);
  }
  @Get("fills/:externalFillId/trace") async fillTrace(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("externalFillId") externalFillId: string) {
    const run = await this.container.stageRuns.findV15RunByFillId(identity(cookie, testHeader), externalFillId);
    if (!run) throw new NotFoundException("Fill was not found in the authenticated user's V1.5 runs");
    return run;
  }
  @Post("runs") @HttpCode(202) async create(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: { scenarioId?: V15Scenario; seed?: number }) {
    const ownerId = identity(cookie, testHeader);
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => !["scenarioId", "seed"].includes(key))) throw new UnprocessableEntityException("V1.5 run request contains unsupported fields");
    if (!V15_SCENARIOS.some((s) => s.scenarioId === body.scenarioId)) throw new ForbiddenException("scenario is not available for V1.5");
    const scenarioId = body.scenarioId as V15Scenario;
    if (!["normal", "auto-trade", "rejection", "recovery"].includes(scenarioId) || !process.env.STOCKQUANT_TEMPORAL_ADDRESS || !process.env.STOCKQUANT_NATS_URL) {
      return { ...(await this.service.create(ownerId, scenarioId, body.seed ?? 20260907)), workflowDispatch: "NOT_CONNECTED" };
    }
    const run = this.engine.run(scenarioId, body.seed ?? 20260907);
    const namespace = `v1-5-${scenarioId}-${run.testRunId}`;
    const fixture = scenarioId === "auto-trade" ? loadV15AutoTradeCalendar() : loadV15NoTradeCalendar();
    await this.container.stageRuns.enqueueV15NoTrade(
      { ...run, ownerId, namespace, evidence: { ...run.evidence, workflow: "NATS_OUTBOX_QUEUED", nats: "OUTBOX_PENDING", temporal: "WAITING", businessExecution: "QUEUED" } },
      { testRunId: run.testRunId, ownerId, namespace, seed: run.seed, scenarioId, ...fixture }
    );
    return { accepted: true, testRunId: run.testRunId, status: run.status, workflowDispatch: "NATS_OUTBOX_QUEUED" };
  }
  @Get("runs/:testRunId") async get(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") id: string) { const run = await this.service.find(id, identity(cookie, testHeader)); if (!run || run.stageId !== "V1.5") throw new NotFoundException("V1.5 run was not found in user scope"); return run; }
  @Get("runs/:testRunId/incidents") async incidents(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") id: string) {
    const ownerId = identity(cookie, testHeader);
    return this.container.stageRuns.projectV15RunIncidents(id, ownerId);
  }
  @Post("runs/:testRunId/incidents/:incidentId/acknowledge") @HttpCode(200)
  async acknowledgeIncident(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") testRunId: string, @Param("incidentId") incidentId: string, @Body() body?: unknown) {
    rejectUnexpectedBody(body, "V1.5 incident acknowledgement");
    const actorId = identity(cookie, testHeader);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(incidentId)) throw new NotFoundException("V1.5 incident was not found");
    await this.container.stageRuns.projectV15RunIncidents(testRunId, actorId);
    return this.container.stageRuns.acknowledgeV15RunIncident(testRunId, actorId, incidentId, actorId);
  }
  @Post("runs/:testRunId/cancel") @HttpCode(202) async cancelAutoTrade(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") id: string, @Body() body?: unknown) {
    rejectUnexpectedBody(body, "V1.5 cancellation");
    const ownerId = identity(cookie, testHeader);
    const run = await this.cancellation.request(id, ownerId);
    return { accepted: true, testRunId: run.testRunId, cancellation: run.evidence.autoTradeCancellation };
  }
}

@Controller("api/v1/acceptance/v2/v2.4")
export class V24AcceptanceController {
  private readonly engine = new V24ContinuousPaperEngine();
  private readonly scheduler: ContinuousPaperScheduler;
  private marketReadClient() { return new GeneratedV21MarketDataClient(this.container.marketDataUrl, () => this.container.marketDataHeaders()); }
  private marketDataAlertClient() { return new GeneratedV21MarketDataClient(this.container.marketDataUrl, () => this.container.marketDataHeaders()); }
  private alertError(error: unknown): never {
    if (error instanceof MarketDataV21HttpError) throw new HttpException(error.body as string | Record<string, any>, error.status);
    throw new ServiceUnavailableException("Market Data alert service is unavailable");
  }
  private governanceAuthorizationClient() { return new GeneratedPlatformPaperAuthorizationClient(this.container.governanceUrl, this.container.portfolioToken); }
  private autoMandateClient() { return new GeneratedPlatformV13AutoMandateClient(this.container.governanceUrl, this.container.portfolioToken); }
  private portfolioAccountClient() { return new GeneratedPortfolioAccountClient(this.container.portfolioApiUrl, "platform-api-service", this.container.portfolioToken); }
  private executionReadinessClient() { return new GeneratedPlatformPaperReadinessClient(this.container.executionUrl, this.container.portfolioToken); }
  private paperExecutionClient() { return new GeneratedPlatformPaperExecutionClient(this.container.executionUrl, this.container.portfolioToken); }
  @Get("scenarios") scenarios(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return V24_SCENARIOS; }
  @Get("alerts") alerts(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) {
    identity(cookie, testHeader);
    return this.marketDataAlertClient().getMarketDataAlertIncidents().catch((error) => this.alertError(error));
  }
  @Post("alerts/:incidentId/acknowledge") @HttpCode(200)
  acknowledgeAlert(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("incidentId") incidentId: string) {
    const actorId = identity(cookie, testHeader);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(incidentId)) throw new NotFoundException("alert incident was not found");
    return this.marketDataAlertClient().acknowledgeMarketDataAlertIncident(incidentId, { actorId }).catch((error) => this.alertError(error));
  }
  @Get("preview") preview(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return { stageId: "V2.4", environmentMode: "PAPER", dataMode: "NOT_CONNECTED", brokerMode: "FAKE", executionPolicyStatus: "PREPARATION_ONLY", mandateStatus: "PREPARATION_ONLY", samplingIntervalMinutes: 30, executionWindow: "09:31-09:35", observationDays: 0, executionGate: "BLOCKED", liveTradingEnabled: false }; }
  @Get("paper-readiness") async paperReadiness(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Query("market") market?: string): Promise<V24PaperReadiness> {
    identity(cookie, testHeader);
    if (market !== "CN_A" && market !== "US_EQUITY") throw new UnprocessableEntityException("market must be CN_A or US_EQUITY");
    try {
      const response = await this.executionReadinessClient().getV24PaperExecutionReadiness(market);
      if (response.status < 200 || response.status >= 300 || !response.body) throw new ServiceUnavailableException(`Trade Execution readiness returned ${response.status}`);
      return response.body as V24PaperReadiness;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException("Trade Execution readiness is unavailable");
    }
  }
  @Get("scheduler/status") schedulerStatus(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return this.scheduler.status(); }
  @Get("observations") observations(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { return this.container.v24Observation.listObservationsForOwner(identity(cookie, testHeader)); }
  @Get("observation-summary") observationSummary(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return this.container.v24Observation.observationSummary(20); }
  @Get("observation-events") observationEvents(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Query("limit") limit?: string) { identity(cookie, testHeader); const parsed = Number(limit); return this.container.v24Observation.listEvents(Number.isFinite(parsed) && parsed > 0 ? Math.min(5000, Math.floor(parsed)) : 1000); }
  @Post("scheduler/start") @HttpCode(202) async schedulerStart(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); if (!this.container.isV24QuoteSourceUseConfigured()) throw new ForbiddenException("V2.4 scheduler cannot start without explicit quote-source approval, authorization reference, and data version"); if (!this.container.isV24ContinuousPaperUseConfigured()) throw new ForbiddenException("V2.4 scheduler cannot start without an approved OD-007 mandate, strategy, account, risk/cost policy, and effective-until reference"); return { accepted: true, scheduler: await this.scheduler.start() }; }
  @Post("scheduler/stop") async schedulerStop(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return this.scheduler.stop(); }
  @Post("scheduler/tick") async schedulerTick(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); if (!this.container.isV24QuoteSourceUseConfigured()) throw new ForbiddenException("V2.4 scheduler tick cannot run without explicit quote-source approval, authorization reference, and data version"); if (!this.container.isV24ContinuousPaperUseConfigured()) throw new ForbiddenException("V2.4 scheduler tick cannot run without an approved OD-007 mandate, strategy, account, risk/cost policy, and effective-until reference"); return this.scheduler.tick(); }
  @Post("runs") @HttpCode(202) async create(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: { scenarioId?: V24Scenario; seed?: number }) {
    const ownerId = identity(cookie, testHeader);
    const scenarioId = body.scenarioId;
    if (!scenarioId || !V24_SCENARIOS.some((item) => item.scenarioId === scenarioId)) throw new ForbiddenException("scenario is not available for V2.4");
    const testRunId = this.container.stageRuns.newId();
    const namespace = `v24-paper-v2-${testRunId}`;
    const seed = body.seed ?? 20260907;
    const assertion = (assertionId: string, pass: boolean, expected: unknown, actual: unknown) => ({ assertionId, status: pass ? "PASS" : "FAIL", expected, actual });
    const scenarioVersion = scenarioId === "candidate-binding" ? "2.5.0" : "2.2.0";
    const baseEvidence: Record<string, unknown> = { schemaVersion: "v24-paper-execution-evidence-v2", testRunId, scenarioId, scenarioVersion, environmentMode: "PAPER", dataMode: "FIXTURE", brokerMode: "FAKE", namespace, executionPolicy: { status: "ISOLATED_FIXTURE_ONLY", productionPolicyRemains: "PREPARATION_ONLY", liveTradingEnabled: false }, orders: [], fills: [], reconciliation: { status: "NOT_RUN" }, observationDays: 0, humanAcceptance: "NOT_RUN" };
    await this.container.stageRuns.save({ testRunId, stageId: "V2.4", scenarioId, scenarioVersion, ownerId, status: "RUNNING", seed, assertions: [{ assertionId: `V2.4-${scenarioId.toUpperCase()}-IN_PROGRESS`, status: "WAITING", expected: "Run survives browser close and records backend evidence", actual: "RUNNING" }], evidence: baseEvidence, namespace });
    let accountId: string | undefined;
    let grant: Record<string, any> | undefined;
    let recoveryContext: Record<string, any> | undefined;
    let currentStep = "load-frozen-fixture";
    try {
      const fixturePath = resolve(process.cwd(), "fixtures/v2/v2.4/paper-execution-v2/v24-paper-execution-scenario-v2.json");
      const fixtureBytes = await readFile(fixturePath).catch(() => readFile(resolve(process.cwd(), "../../fixtures/v2/v2.4/paper-execution-v2/v24-paper-execution-scenario-v2.json")));
      const fixture = JSON.parse(fixtureBytes.toString("utf8")) as Record<string, any>;
      const fixtureSha256 = createHash("sha256").update(fixtureBytes).digest("hex");
      const accountFixture = scenarioId === "crossday-settlement"
        ? JSON.parse((await readFile(resolve(process.cwd(), "fixtures/v2/v2.4/crossday-settlement-v1/input.json")).catch(() => readFile(resolve(process.cwd(), "../../fixtures/v2/v2.4/crossday-settlement-v1/input.json")))).toString("utf8")) as Record<string, any>
        : scenarioId === "candidate-binding"
          ? JSON.parse((await readFile(resolve(process.cwd(), "fixtures/v2/v2.4/candidate-a-binding-v1/input.json")).catch(() => readFile(resolve(process.cwd(), "../../fixtures/v2/v2.4/candidate-a-binding-v1/input.json")))).toString("utf8")) as Record<string, any>
        : fixture;
      currentStep = "initialize-isolated-portfolio-account";
      const initialized = await this.portfolioAccountClient().initializeAccount({ fixtureAccountRef: accountFixture.account.fixtureAccountRef, ownerId, market: "CN_A", environmentMode: "PAPER", brokerMode: "FAKE", initialCash: { amount: accountFixture.account.initialCash, currency: "CNY" }, namespace, testRunId, idempotencyKey: `v24-paper-init-${testRunId}` });
      if (!initialized.snapshot?.accountId) throw new Error("Portfolio account initialization returned an invalid response");
      accountId = initialized.snapshot.accountId;
      if (scenarioId === "crossday-settlement") {
        return await this.runV24CrossdaySettlement({ testRunId, namespace, seed, ownerId, accountId, baseEvidence, assertion });
      }
      if (scenarioId === "candidate-binding") {
        return await this.runV24CandidateBinding({ testRunId, namespace, seed, ownerId, accountId, baseEvidence, assertion });
      }
      currentStep = "load-sampled-paper-composition-fixture";
      const compositionPath = resolve(process.cwd(), "fixtures/v2/v2.4/paper-execution-v2/v24-sampled-paper-composition-v1.json");
      const compositionBytes = await readFile(compositionPath).catch(() => readFile(resolve(process.cwd(), "../../fixtures/v2/v2.4/paper-execution-v2/v24-sampled-paper-composition-v1.json")));
      const composition = JSON.parse(compositionBytes.toString("utf8")) as Record<string, any>;
      const compositionSha256 = createHash("sha256").update(compositionBytes).digest("hex");
      const compositionManifestPath = resolve(process.cwd(), "fixtures/v2/v2.4/paper-execution-v2/manifest.json");
      const compositionManifestBytes = await readFile(compositionManifestPath).catch(() => readFile(resolve(process.cwd(), "../../fixtures/v2/v2.4/paper-execution-v2/manifest.json")));
      const compositionManifest = JSON.parse(compositionManifestBytes.toString("utf8")) as { fixtureId?: string; fixtureVersion?: string; status?: string; files?: Array<{ path: string; sha256: string }> };
      const compositionManifestSha256 = createHash("sha256").update(compositionManifestBytes).digest("hex");
      const manifestEntry = compositionManifest.files?.find((item) => item.path === "fixtures/v2/v2.4/paper-execution-v2/v24-sampled-paper-composition-v1.json");
      if (compositionManifest.status !== "FROZEN" || compositionManifest.fixtureId !== composition.fixtureId || compositionManifest.fixtureVersion !== composition.fixtureVersion || manifestEntry?.sha256 !== compositionSha256) throw new Error("C5 sampled-paper Fixture manifest or content hash is invalid");
      const scope = { market: "CN_A" as const, ownerId, accountId, namespace, testRunId };
      currentStep = "initialize-run-scoped-sampling-watchlist";
      const scopedWatchlist = await this.marketReadClient().updateV21ScopedWatchlist({ ownerId, accountId, namespace, testRunId, holdings: [composition.sampling.security], inFlightOrders: [], candidates: composition.sampling.watchlistSecurities.filter((security: string) => security !== composition.sampling.security) });
      currentStep = "enqueue-persistent-snapshot-fixture-task";
      const samplingRequest = {
        scheduledAt: new Date(composition.sampling.scheduledAt).toISOString(), scope,
        acceptanceIntervalMinutes: composition.sampling.acceptanceIntervalMinutes as 20 | 30,
        fixtureVariant: scenarioId === "rejection" ? "stale" as const : "fresh" as const
      };
      const samplingFirst = await this.marketReadClient().evaluateV21SnapshotSamplingFixtureTick(samplingRequest) as any;
      if (!samplingFirst?.task?.taskId) throw new Error(`C5 Fixture sampling tick was not eligible: ${JSON.stringify(samplingFirst?.decision ?? samplingFirst)}`);
      const samplingReplay = await this.marketReadClient().evaluateV21SnapshotSamplingFixtureTick(samplingRequest) as any;
      const samplingCompleted = await this.waitForV24Sampling(scope, samplingFirst.task.taskId);
      const sampledTask = samplingCompleted?.task;
      const sampledObservation = sampledTask?.observations?.find((item: any) => item.securityId === composition.sampling.security);
      if (sampledTask?.status !== "COMPLETED_FIXTURE" || !sampledObservation) throw new Error("C5 Fixture sampling task did not persist the expected security observation");
      const samplingEvidence = {
        fixtureId: composition.fixtureId, fixtureVersion: composition.fixtureVersion, compositionSha256, compositionManifestSha256,
        sourceFixtureVersion: sampledTask.fixtureVersion, sourceFixtureSha256: sampledTask.fixtureSha256,
        testRunId, namespace, accountId, watchlist: scopedWatchlist,
        scheduledAt: sampledTask.scheduledAt, taskId: sampledTask.taskId, taskStatus: sampledTask.status,
        intervalMinutes: sampledTask.intervalMinutes, securityIds: sampledTask.securityIds,
        observation: sampledObservation, duplicateTaskId: samplingReplay?.task?.taskId ?? null,
        duplicateCreated: samplingReplay?.task?.created ?? null, externalRequests: samplingFirst?.externalRequests ?? null
      };
      // Persist the exact frozen end-of-day plan before any downstream call can
      // fail.  Recovery must not silently turn a successfully recovered order
      // into a completed C5 run without its independent DAILY_BAR evidence.
      const dailyBarPlan = {
        fixtureVersion: composition.dailyBar.sourceFixtureVersion,
        sessionDate: composition.dailyBar.sessionDate,
        expectedSecurityIds: composition.dailyBar.expectedSecurityIds
      };
      const samplingAssertions = [
        assertion("V2.4-C5-SAMPLING-001", sampledTask.scope?.testRunId === testRunId && sampledTask.scope?.accountId === accountId && sampledTask.scope?.namespace === namespace && sampledTask.dataMode === "FIXTURE" && sampledTask.status === "COMPLETED_FIXTURE" && sampledObservation.securityId === composition.sampling.security && sampledObservation.price === composition.sampling.expectedPrice && scopedWatchlist.testRunId === testRunId, "Persisted scoped sampling output is consumed inside this same Paper TestRun", samplingEvidence),
        assertion("V2.4-C5-IDEMPOTENCY-001", samplingReplay?.task?.taskId === sampledTask.taskId && samplingReplay?.task?.created === false && sampledObservation.status === (scenarioId === "rejection" ? "STALE" : "READY") && samplingFirst?.externalRequests === 0, "Repeated scoped tick returns the original durable task with no external requests", { firstTaskId: samplingFirst.task.taskId, replayTaskId: samplingReplay?.task?.taskId, replayCreated: samplingReplay?.task?.created, observationStatus: sampledObservation.status, externalRequests: samplingFirst?.externalRequests })
      ];
      baseEvidence.sampling = samplingEvidence;
      baseEvidence.samplingAssertions = samplingAssertions;
      baseEvidence.dailyBarPlan = dailyBarPlan;
      const sampledSnapshot = {
        snapshotId: sampledObservation.snapshotId, security: sampledObservation.securityId, market: "CN_A", sourceMode: "FIXTURE",
        status: sampledObservation.status, observedAt: sampledObservation.observedAt, ingestedAt: sampledObservation.ingestedAt, price: sampledObservation.price
      };
      const clientOrderId = `${fixture.order.clientOrderIdPrefix}-${testRunId}`;
      grant = {
        scenarioId: "v24-isolated-snapshot-paper-normal", scenarioVersion: "2.0.0", testRunId, ownerId, namespace, accountId,
        clockNow: sampledSnapshot.ingestedAt, dataMode: fixture.dataMode, environmentMode: fixture.environmentMode, brokerMode: fixture.brokerMode,
        liveTradingEnabled: fixture.liveTradingEnabled, market: fixture.market, currency: fixture.currency,
        policy: { ...fixture.policy, executionWindowStart: composition.execution.windowStart, executionWindowEnd: composition.execution.windowEnd },
        mandate: { ...fixture.mandate, maxOrderNotional: composition.execution.maxOrderNotional },
        signal: composition.signal,
        order: { clientOrderId, security: composition.sampling.security, acceptedAt: composition.execution.acceptedAt, requestedQuantity: composition.signal.quantity },
        snapshot: sampledSnapshot, fee: composition.execution.fee
      };

      if (scenarioId === "rejection") {
        currentStep = "governance-rejection-check";
        const rejected = await this.governanceAuthorizationClient().authorizeV24PaperFixtureRun({ grant } as never);
        const account = await this.readPaperAccount(accountId, ownerId);
        const reconciliation = await this.readPaperReconciliation(namespace);
        const assertions = [
          ...samplingAssertions,
          assertion("V2.4-REJECTION-001", rejected.status === 422, "Governance rejects a stale or pre-acceptance snapshot", { status: rejected.status }),
          assertion("V2.4-REJECTION-002", account.ledgerEntryCount === 1 && account.cash.amount === fixture.account.initialCash && (account.positions?.length ?? 0) === 0, "Only the isolated initial cash entry exists", { ledgerEntryCount: account.ledgerEntryCount, cash: account.cash, positions: account.positions }),
          assertion("V2.4-REJECTION-003", reconciliation.order_count === 0 && reconciliation.fill_count === 0 && reconciliation.pending_outbox_count === 0, "No FakeBroker order, Fill or pending Outbox was created", reconciliation)
        ];
        const status = assertions.every((item) => item.status === "PASS") ? "COMPLETED" : "FAILED";
        const evidence = { ...baseEvidence, fixture: { fixtureId: fixture.scenarioId, fixtureVersion: fixture.scenarioVersion, manifestSha256: fixtureSha256, compositionFixtureId: composition.fixtureId, compositionFixtureVersion: composition.fixtureVersion, compositionSha256, compositionManifestSha256 }, accountId, account, source: { status: "FIXTURE_REJECTED", snapshotId: grant.snapshot.snapshotId, observedAt: grant.snapshot.observedAt, sampledTaskId: sampledTask.taskId }, governance: { status: "REJECTED", httpStatus: rejected.status }, reconciliation, orders: [], fills: [], assertions, status };
        await this.container.stageRuns.save({ testRunId, stageId: "V2.4", scenarioId, scenarioVersion, ownerId, status, seed, assertions, evidence, namespace });
        return { accepted: true, testRunId, status };
      }

      currentStep = "persist-daily-direction-target-before-authorization";
      const dailyDirection = await loadV24DailyDirectionFixture();
      const candidateRiskFixtureBytes = await readFile(resolve(process.cwd(), "fixtures/v2/v2.4/candidate-a-binding-v1/input.json")).catch(() => readFile(resolve(process.cwd(), "../../fixtures/v2/v2.4/candidate-a-binding-v1/input.json")));
      const candidateRiskFixture = JSON.parse(candidateRiskFixtureBytes.toString("utf8")) as Record<string, any>;
      const accountBeforeExecution = await this.readPaperAccount(accountId, ownerId);
      if (accountBeforeExecution.cash?.amount !== dailyDirection.input.account.settledCash || (accountBeforeExecution.positions?.length ?? 0) !== 0) throw new Error("C5 Fixture account does not match the frozen initial strategy input");
      const targetInput = { ...dailyDirection.input, clock: { now: () => new Date(composition.execution.acceptedAt) }, account: { heldQuantity: 0, sellableQuantity: 0, settledCash: accountBeforeExecution.cash.amount } };
      const targetFirst = await prepareV24FixtureDailyTarget(this.container.v24DailyTargets, scope, targetInput, dailyDirection.sha256);
      const targetReplay = await prepareV24FixtureDailyTarget(this.container.v24DailyTargets, scope, targetInput, dailyDirection.sha256);
      const persistedTarget = await this.container.v24DailyTargets.find(scope, targetFirst.target.targetId);
      if (!persistedTarget || persistedTarget.decision.action !== "BUY" || persistedTarget.decision.quantity !== 100 || persistedTarget.clientOrderId !== clientOrderId) throw new Error("C5 Fixture strategy did not produce the expected independently persisted BUY target");
      baseEvidence.dailyTarget = persistedTarget;
      baseEvidence.dailyTargetReplayCreated = targetReplay.created;
      samplingAssertions.push(
        assertion("V2.4-C5-DAILY-TARGET-001", persistedTarget.strategySha256 === V24_DAILY_DIRECTION_SHA256 && persistedTarget.targetQuantity === 100 && persistedTarget.decision.action === "BUY" && persistedTarget.accountId === accountId && persistedTarget.testRunId === testRunId, "Two frozen completed daily closes and actual isolated cash produce the persisted candidate A target", persistedTarget),
        assertion("V2.4-C5-DAILY-TARGET-IDEMPOTENCY-001", targetReplay.created === false && targetReplay.target.targetId === persistedTarget.targetId && targetReplay.target.clientOrderId === clientOrderId, "Repeated evaluation reuses the immutable daily target and original order identity", { targetId: persistedTarget.targetId, replayCreated: targetReplay.created, clientOrderId })
      );
      grant.mandate.strategyVersion = persistedTarget.strategySha256;
      grant.signal = { ...grant.signal, signalId: persistedTarget.targetId, asOf: persistedTarget.evaluationAt, action: persistedTarget.decision.action, quantity: persistedTarget.decision.quantity, referencePrice: persistedTarget.input.referencePrice };
      grant.order.requestedQuantity = persistedTarget.decision.quantity;
      currentStep = "request-governance-authorization";
      const authorizationResponse = await this.governanceAuthorizationClient().authorizeV24PaperFixtureRun({ grant } as never);
      const authorization = authorizationResponse.body as { authorizationId?: string; status?: string; error?: string } | undefined;
      if (authorizationResponse.status < 200 || authorizationResponse.status >= 300 || !authorization?.authorizationId) throw new Error(`Governance did not authorize this Fixture TestRun: ${authorizationResponse.status} ${authorization?.error ?? "invalid response"}`);
      recoveryContext = { authorizationId: authorization.authorizationId, namespace, clientOrderId, accountId, grant, initialAccountCash: fixture.account.initialCash, expectedCashAfterFill: composition.execution.expectedCashAfterFill, expectedReservation: composition.execution.expectedReservation };
      let executeResponse: Response | undefined;
      let execution: Record<string, any> = {};
      try {
        currentStep = `execute-or-recover-original-order:${this.container.executionUrl}`;
        executeResponse = await this.paperExecutionClient().executeV24FixtureSnapshotOrder({ authorizationId: authorization.authorizationId, grant, initialAccountCash: fixture.account.initialCash } as never);
        execution = await executeResponse.json().catch(() => ({})) as Record<string, any>;
      } catch {
        // A lost acceptance response is UNKNOWN until the original client order identity is queried.
      }
      if (!executeResponse || (!executeResponse.ok && executeResponse.status !== 202)) {
        const lookup = await this.readPaperOrder(namespace, clientOrderId);
        if (!lookup) throw new Error(`Trade Execution response was unavailable and no durable original order exists${executeResponse ? `: ${executeResponse.status} ${JSON.stringify(execution)}` : ""}`);
        execution = lookup;
      } else if (scenarioId === "recovery") {
        // Deliberately discard the acceptance response and recover only from the original client order identity.
        execution = await this.readPaperOrder(namespace, clientOrderId) ?? {};
      }
      if (!execution.order?.order_id) throw new Error("Trade Execution did not return or recover the original order");
      let outbox = execution.outbox;
      for (let attempt = 0; outbox?.status !== "DELIVERED" && attempt < 30; attempt += 1) {
        await new Promise((resolveDelay) => setTimeout(resolveDelay, 200));
        const recovered = await this.readPaperOrder(namespace, clientOrderId);
        if (recovered) { execution = recovered; outbox = recovered.outbox; }
      }
      currentStep = "read-ledger-and-reconciliation-evidence";
      const account = await this.readPaperAccount(accountId, ownerId);
      const independentAssetsResponse = await new GeneratedPlatformV13ManualTradeClient(this.container.executionUrl, this.container.portfolioToken).readIndependentAssets(namespace, accountId);
      if (independentAssetsResponse.status !== 200 || !independentAssetsResponse.body || typeof independentAssetsResponse.body !== "object") throw new Error(`FakeBroker independent asset read failed: ${independentAssetsResponse.status}`);
      const independentAssets = independentAssetsResponse.body as Record<string, any>;
      const riskProjection = projectV24CandidateRiskFacts({ initialCash: candidateRiskFixture.account.initialCash, referencePrice: execution.fill?.price, portfolio: account, independentAssets });
      if (riskProjection.reconciliation.status !== "MATCH" || !execution.fill?.externalFillId) throw new Error("C5 Candidate A Fill risk facts require a matching independent FakeBroker ledger");
      const riskScope = { testRunId, ownerId, accountId, namespace };
      const riskState = await this.container.v24CandidateRiskStates.saveInitial(initializeV24CandidateRiskState({ ...riskScope, sessionDate: composition.dailyBar.sessionDate, initialCash: candidateRiskFixture.account.initialCash, maxGrossExposure: candidateRiskFixture.risk.maxGrossExposure, maxDailyTurnover: candidateRiskFixture.risk.maxDailyTurnover, cumulativeLossLimit: candidateRiskFixture.risk.cumulativeLossPause, mandateStatus: "ACTIVE" }));
      const persistedRiskState = await this.container.v24CandidateRiskStates.applyFill(riskScope, { externalFillId: execution.fill.externalFillId, security: fixture.order.security, quantity: execution.fill.quantity, price: execution.fill.price, currency: fixture.currency, tradeDate: composition.dailyBar.sessionDate, grossExposure: riskProjection.grossExposure, cumulativeLoss: riskProjection.cumulativeLoss, reconciliation: "MATCH" });
      let externalOrderObservation: Record<string, unknown> | undefined;
      if (scenarioId === "external-reconciliation") {
        const response = await this.paperExecutionClient().recordSimulatedFakeBrokerExternalOrder({
          namespace, externalOrderId: `fixture-external-${testRunId}`, clientOrderId: `fixture-external-client-${testRunId}`,
          security: fixture.order.security, requestedQuantity: fixture.signal.quantity, status: "UNKNOWN",
          evidenceRef: `fixture:${testRunId}:independent-external-order`, observedAt: grant.snapshot.observedAt
        } as never);
        externalOrderObservation = { status: response.status, ...(await response.json().catch(() => ({})) as Record<string, unknown>) };
        if (response.status !== 201) throw new Error(`FakeBroker external-order Fixture observation was rejected: ${response.status}`);
      }
      let reconciliation = await this.readPaperReconciliation(namespace);
      currentStep = "complete-independent-daily-bar-and-reconcile";
      const dailyFirst = await this.marketReadClient().completeV21DailyBarFixture(scope, composition.dailyBar.sourceFixtureVersion) as any;
      const dailyReplay = await this.marketReadClient().completeV21DailyBarFixture(scope, composition.dailyBar.sourceFixtureVersion) as any;
      if (!dailyFirst?.task?.taskId) throw new Error("C5 DAILY_BAR Fixture task was not accepted");
      const daily = await this.waitForV24DailyBar(scope, dailyFirst.task.taskId);
      reconciliation = await this.readPaperReconciliation(namespace);
      const reconciliationHasDiscrepancy = reconciliation.externalOnlyOrderCount > 0 || reconciliation.unresolved_order_count > 0 || reconciliation.pending_outbox_count > 0 || (Array.isArray(reconciliation.discrepancies) && reconciliation.discrepancies.length > 0);
      const reconciliationAlertRequest = { ownerId, testRunId, status: reconciliationHasDiscrepancy ? "DISCREPANCY" as const : "MATCH" as const, discrepancies: reconciliation.discrepancies ?? [] };
      const reconciliationAlertFirst = await this.marketReadClient().recordPaperReconciliationAlert(reconciliationAlertRequest);
      const reconciliationAlertReplay = await this.marketReadClient().recordPaperReconciliationAlert(reconciliationAlertRequest);
      if (reconciliationAlertFirst.status !== reconciliationAlertRequest.status || reconciliationAlertReplay.status !== reconciliationAlertRequest.status || reconciliationAlertReplay.created !== false) throw new Error("C5 daily reconciliation alert state or idempotent replay is invalid");
      const reservation = account.reservations?.find((item: any) => item.clientOrderId === clientOrderId);
      const assertions = [
        ...samplingAssertions,
        assertion("V2.4-C5-SNAPSHOT-CONSUMPTION-001", execution.eligibility?.snapshotId === sampledTask.observations.find((item: any) => item.securityId === composition.sampling.security)?.snapshotId && execution.fill?.price === sampledObservation.price, "Trade Execution consumed the exact persisted snapshot and executed at its persisted price", { eligibility: execution.eligibility, fillPrice: execution.fill?.price, sampledTaskId: sampledTask.taskId, sampledSnapshotId: sampledObservation.snapshotId, sampledPrice: sampledObservation.price }),
        assertion("V2.4-PAPER-001", execution.authorization?.status === "AUTHORIZED" || authorization.status === "ACTIVE", "Run-scoped Governance authorization bound to exact owner/account/TestRun/strategy", { authorization, executionAuthorization: execution.authorization }),
        assertion("V2.4-PAPER-002", execution.riskEvaluation?.status === "PASS_RISK_CHECK" || execution.order?.status === "FILLED", "Risk and quote deviation check passes under the frozen Fixture policy", execution.riskEvaluation ?? execution.order),
        assertion("V2.4-PAPER-003", execution.eligibility?.status === "ELIGIBLE" && execution.eligibility.executionModel === "SNAPSHOT" && execution.eligibility.dataMode === "FIXTURE", "The first qualifying post-acceptance Fixture SNAPSHOT is the execution input", execution.eligibility),
        assertion("V2.4-PAPER-004", execution.order?.status === "FILLED", "FakeBroker persists the accepted order as filled after ledger confirmation", execution.order),
        assertion("V2.4-PAPER-005", execution.fill?.quantity === fixture.expectedQuantity || execution.fill?.quantity === fixture.signal.quantity, "FakeBroker persists one 100-share fill at the frozen price and fee", execution.fill),
        assertion("V2.4-PAPER-006", account.cash.amount === composition.execution.expectedCashAfterFill && account.positionCount === 1 && account.positions?.some((position: any) => position.security === fixture.order.security && position.quantity === fixture.signal.quantity) && account.ledgerEntryCount === 2, "Portfolio records exact cash, holdings and two ledger entries", { cash: account.cash, positions: account.positions, ledgerEntryCount: account.ledgerEntryCount }),
        assertion("V2.4-PAPER-007", reservation?.status === "CAPTURED" && reservation.capturedCashAmount === composition.execution.expectedReservation, "Portfolio captures the exact held cash reservation after the Fill", reservation),
        assertion("V2.4-PAPER-008", outbox?.status === "DELIVERED" && reconciliation.order_count === 1 && reconciliation.fill_count === 1 && reconciliation.unresolved_order_count === 0 && reconciliation.pending_outbox_count === 0, "Local FakeBroker Outbox, Fill and Portfolio ledger are complete", { outbox, reconciliation }),
        assertion("V2.4-PAPER-009", independentAssets.owner_id === ownerId && independentAssets.test_run_id === testRunId && independentAssets.currency === account.cash.currency && independentAssets.current_cash === account.cash.amount && JSON.stringify(independentAssets.positions ?? []) === JSON.stringify(account.positions ?? []), "Independent FakeBroker cash and holdings match the scoped Portfolio ledger after the Fixture Fill", { independentAssets, portfolio: { cash: account.cash, positions: account.positions } }),
        assertion("V2.4-C5-RISK-001", riskState.state.status === "ACTIVE" && riskProjection.reconciliation.status === "MATCH" && persistedRiskState.dailyTurnover === "1025.0000" && persistedRiskState.grossExposure === "1025.0000" && persistedRiskState.cumulativeLoss === "5.0000" && persistedRiskState.appliedFills.length === 1 && persistedRiskState.appliedFills[0]?.externalFillId === execution.fill.externalFillId, "The matched independent Fill updates Candidate A's TestRun-scoped risk state once with exact daily turnover, exposure, and loss", { riskProjection, persistedRiskState }),
        assertion("V2.4-C5-DAILY-BAR-001", daily?.task?.state === "COMPLETED" && daily?.completion?.dataMode === "FIXTURE" && daily?.completion?.fixtureVersion === composition.dailyBar.sourceFixtureVersion && daily?.completion?.sessionDate === composition.dailyBar.sessionDate && JSON.stringify(daily?.completion?.bars?.map((bar: any) => bar.securityId).sort()) === JSON.stringify([...composition.dailyBar.expectedSecurityIds].sort()), "The independent DAILY_BAR completion covers this exact C5 scoped watchlist after close", daily),
        assertion("V2.4-C5-DAILY-BAR-IDEMPOTENCY-001", dailyReplay?.task?.taskId === dailyFirst.task.taskId && dailyReplay?.created === false && daily?.task?.completionId === daily?.completion?.completionId, "Repeated daily-bar completion request returns the original durable task and reconciliation input", { firstTaskId: dailyFirst.task.taskId, replayTaskId: dailyReplay?.task?.taskId, replayCreated: dailyReplay?.created, completionId: daily?.completion?.completionId }),
        assertion("V2.4-C5-DAILY-RECONCILIATION-ALERT-001", reconciliationAlertFirst.status === reconciliationAlertRequest.status && reconciliationAlertReplay.created === false && (reconciliationHasDiscrepancy ? reconciliationAlertFirst.incident?.state === "OPEN" && reconciliationAlertFirst.incident.code === "V24_PAPER_RECONCILIATION_DISCREPANCY" : reconciliationAlertFirst.incident === null), "Daily Paper reconciliation opens one deduplicated incident for discrepancies and resolves the same TestRun incident when books match", { reconciliationStatus: reconciliationAlertRequest.status, first: reconciliationAlertFirst, replay: reconciliationAlertReplay }),
        ...(scenarioId === "external-reconciliation" ? [assertion("V2.4-PF05-001", externalOrderObservation?.status === 201 && reconciliation.externalOnlyOrderCount === 1 && reconciliation.discrepancies?.some((item: any) => item.kind === "EXTERNAL_ORDER_MISSING_LOCALLY" && item.evidenceRef === `fixture:${testRunId}:independent-external-order`), "Independent FakeBroker external order is visible as a traceable local-missing discrepancy", { externalOrderObservation, reconciliation })] : [])
      ];
      const status = assertions.every((item) => item.status === "PASS") ? "COMPLETED" : "FAILED";
      const evidence = {
        ...baseEvidence, fixture: { fixtureId: fixture.scenarioId, fixtureVersion: fixture.scenarioVersion, manifestSha256: fixtureSha256, compositionFixtureId: composition.fixtureId, compositionFixtureVersion: composition.fixtureVersion, compositionSha256, compositionManifestSha256, dataMode: "FIXTURE" },
        accountId, authorization: { ...authorization, status: "AUTHORIZED", grant: { mandateId: fixture.mandate.mandateId, mandateVersion: fixture.mandate.mandateVersion, strategyVersion: fixture.mandate.strategyVersion, policyId: fixture.policy.policyId, policyVersion: fixture.policy.policyVersion } },
        signal: grant.signal, riskEvaluation: execution.riskEvaluation, eligibility: execution.eligibility,
        source: { status: "FIXTURE", snapshotId: grant.snapshot.snapshotId, observedAt: grant.snapshot.observedAt, ingestedAt: grant.snapshot.ingestedAt, sampledTaskId: sampledTask.taskId, sampledFixtureVersion: sampledTask.fixtureVersion },
        dailyBar: { taskId: daily?.task?.taskId ?? null, completionId: daily?.completion?.completionId ?? null, fixtureVersion: daily?.completion?.fixtureVersion ?? null, sessionDate: daily?.completion?.sessionDate ?? null, replayCreated: dailyReplay?.created ?? null },
        policy: { ...fixture.policy, executionModel: "SNAPSHOT", liquidityParticipation: "NOT_VERIFIED" }, order: execution.order, fills: execution.fill ? [execution.fill] : [],
        resourceReservation: reservation, account, independentAssets, candidateRisk: { projection: riskProjection, state: persistedRiskState }, outbox, reconciliation, dailyClose: { status: reconciliationAlertRequest.status, recordedAt: new Date().toISOString(), alert: reconciliationAlertFirst, idempotentReplay: reconciliationAlertReplay }, externalOrderObservation, assertions, status, businessValidation: status, humanAcceptance: "NOT_RUN"
      };
      await this.container.stageRuns.save({ testRunId, stageId: "V2.4", scenarioId, scenarioVersion, ownerId, status, seed, assertions, evidence, namespace });
      return { accepted: true, testRunId, status };
    } catch (error) {
      const assertions = [{ assertionId: `V2.4-${scenarioId.toUpperCase()}-EXECUTION-ERROR`, status: "FAIL", expected: "All required domain services return independently persisted facts", actual: error instanceof Error ? error.message : "unknown error", step: currentStep }];
      await this.container.stageRuns.save({ testRunId, stageId: "V2.4", scenarioId, scenarioVersion, ownerId, status: "FAILED", seed, assertions, evidence: { ...baseEvidence, accountId: accountId ?? null, authorizationGrantCreated: Boolean(grant), ...(recoveryContext ? { recovery: { ...recoveryContext, status: "UNKNOWN", lastError: error instanceof Error ? error.message : "unknown error", lastStep: currentStep } } : {}), error: error instanceof Error ? error.message : "unknown error", step: currentStep, assertions }, namespace });
      return { accepted: true, testRunId, status: "FAILED" };
    }
  }
  @Post("runs/:testRunId/recover") @HttpCode(202) async recover(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") testRunId: string) {
    const ownerId = identity(cookie, testHeader);
    const run = await this.container.stageRuns.find(testRunId, ownerId);
    if (!run || run.stageId !== "V2.4") throw new NotFoundException("V2.4 TestRun was not found");
    if (run.status !== "FAILED" || run.scenarioId !== "recovery") throw new ConflictException("only a failed V2.4 recovery TestRun can be resumed");
    const recovery = run.evidence.recovery as { authorizationId?: string; namespace?: string; clientOrderId?: string; accountId?: string; grant?: Record<string, any>; initialAccountCash?: string; expectedCashAfterFill?: string; expectedReservation?: string } | undefined;
    if (!recovery?.authorizationId || !recovery.namespace || !recovery.clientOrderId || !recovery.accountId || !recovery.grant) throw new ConflictException("the original authorization and command were not persisted for safe recovery");
    if (run.evidence.dailyTarget) {
      const targetId = (run.evidence.dailyTarget as { targetId?: string }).targetId;
      const savedTarget = targetId ? await this.container.v24DailyTargets.find({ ownerId, accountId: recovery.accountId, namespace: recovery.namespace, testRunId }, targetId) : null;
      if (!savedTarget || savedTarget.clientOrderId !== recovery.clientOrderId || savedTarget.strategySha256 !== recovery.grant.mandate?.strategyVersion || savedTarget.decision.action !== recovery.grant.signal?.action || savedTarget.decision.quantity !== recovery.grant.order?.requestedQuantity) throw new ConflictException("the original durable daily target does not match the recovery command");
    }
    let existing: Record<string, any> | null;
    try { existing = await this.readPaperOrder(recovery.namespace, recovery.clientOrderId); }
    catch (error) {
      const evidence = { ...run.evidence, recovery: { ...recovery, status: "UNKNOWN", executionResent: false, lastAttemptAt: new Date().toISOString(), lastError: error instanceof Error ? error.message : "original-order query unavailable" } };
      const assertions = [{ assertionId: "V2.4-RECOVERY-QUERY-001", status: "WAITING", expected: "Keep the original reservation and order identity while authoritative order lookup is unavailable", actual: "UNKNOWN" }];
      await this.container.stageRuns.reviseFailedV24Run(testRunId, ownerId, "FAILED", assertions, evidence);
      return { accepted: true, testRunId, status: "UNKNOWN", executionResent: false, resourceReservation: "UNCHANGED_UNTIL_AUTHORITATIVE_QUERY" };
    }
    let execution: Record<string, any> = existing ?? {};
    let executionResent = false;
    try {
      // Reusing the exact command is allowed only after the original identity has
      // returned an authoritative 404. A durable order is read-only recovery;
      // its Outbox worker owns any pending delivery.
      if (!existing) {
      const response = await this.paperExecutionClient().executeV24FixtureSnapshotOrder({ authorizationId: recovery.authorizationId, grant: recovery.grant, initialAccountCash: recovery.initialAccountCash } as never);
      executionResent = true;
      const responseBody = await response.json().catch(() => ({})) as Record<string, any>;
      if (response.ok || response.status === 202) execution = responseBody;
      else throw new Error(`exact-command retry failed after authoritative no-order result: ${response.status}`);
      }
    } catch (error) {
      try { existing = await this.readPaperOrder(recovery.namespace, recovery.clientOrderId); }
      catch (lookupError) {
        const evidence = { ...run.evidence, recovery: { ...recovery, status: "UNKNOWN", executionResent, lastAttemptAt: new Date().toISOString(), lastError: lookupError instanceof Error ? lookupError.message : "original-order query unavailable after retry" } };
        const assertions = [{ assertionId: "V2.4-RECOVERY-QUERY-001", status: "WAITING", expected: "Keep the original reservation and order identity while authoritative order lookup is unavailable", actual: "UNKNOWN" }];
        await this.container.stageRuns.reviseFailedV24Run(testRunId, ownerId, "FAILED", assertions, evidence);
        return { accepted: true, testRunId, status: "UNKNOWN", executionResent, resourceReservation: "UNCHANGED_UNTIL_AUTHORITATIVE_QUERY" };
      }
      if (!existing) {
        const evidence = { ...run.evidence, recovery: { ...recovery, status: "UNKNOWN", executionResent, lastAttemptAt: new Date().toISOString(), lastError: error instanceof Error ? error.message : "exact-command recovery unavailable" } };
        const assertions = [{ assertionId: "V2.4-RECOVERY-QUERY-001", status: "WAITING", expected: "Keep the original reservation and order identity while authoritative recovery is unresolved", actual: "UNKNOWN" }];
        await this.container.stageRuns.reviseFailedV24Run(testRunId, ownerId, "FAILED", assertions, evidence);
        return { accepted: true, testRunId, status: "UNKNOWN", executionResent, resourceReservation: "UNCHANGED_UNTIL_AUTHORITATIVE_QUERY" };
      }
      execution = existing;
    }
    if (!execution.order?.order_id) execution = await this.readPaperOrder(recovery.namespace, recovery.clientOrderId) ?? {};
    if (!execution.order?.order_id) throw new ServiceUnavailableException("original FakeBroker order is still not visible after a confirmed query");
    let outbox = execution.outbox;
    for (let attempt = 0; outbox?.status !== "DELIVERED" && attempt < 30; attempt += 1) {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 200));
      const refreshed = await this.readPaperOrder(recovery.namespace, recovery.clientOrderId);
      if (refreshed) { execution = refreshed; outbox = refreshed.outbox; }
    }
    const account = await this.readPaperAccount(recovery.accountId, ownerId);
    let reconciliation = await this.readPaperReconciliation(recovery.namespace);
    const reservation = account.reservations?.find((item: any) => item.clientOrderId === recovery.clientOrderId);
    const expectedCashAfterFill = recovery.expectedCashAfterFill ?? (run.evidence.sampling ? "8970.0000" : "8995.0000");
    const expectedReservation = recovery.expectedReservation ?? (run.evidence.sampling ? "1030.0000" : "1005.0000");
    const dailyBarPlan = run.evidence.dailyBarPlan as { fixtureVersion?: "v2.1-daily-bars-1" | "v24-c5-daily-bars-1"; sessionDate?: string; expectedSecurityIds?: string[] } | undefined;
    let daily: Record<string, any> | null = null;
    let dailyReplay: Record<string, any> | null = null;
    let dailyFirst: Record<string, any> | null = null;
    if (run.evidence.sampling && dailyBarPlan?.fixtureVersion && dailyBarPlan.sessionDate && Array.isArray(dailyBarPlan.expectedSecurityIds)) {
      const scope = { market: "CN_A" as const, ownerId, accountId: recovery.accountId, namespace: recovery.namespace, testRunId };
      dailyFirst = await this.marketReadClient().completeV21DailyBarFixture(scope, dailyBarPlan.fixtureVersion) as Record<string, any>;
      if (!dailyFirst.task?.taskId) throw new ServiceUnavailableException("C5 DAILY_BAR Fixture task was not accepted during recovery");
      dailyReplay = await this.marketReadClient().completeV21DailyBarFixture(scope, dailyBarPlan.fixtureVersion) as Record<string, any>;
      daily = await this.waitForV24DailyBar(scope, dailyFirst.task.taskId) as Record<string, any>;
    }
    let candidateRisk: Record<string, any> | undefined;
    if (run.evidence.sampling && dailyBarPlan?.sessionDate && execution.fill?.externalFillId) {
      const independentAssetsResponse = await new GeneratedPlatformV13ManualTradeClient(this.container.executionUrl, this.container.portfolioToken).readIndependentAssets(recovery.namespace, recovery.accountId);
      if (independentAssetsResponse.status !== 200 || !independentAssetsResponse.body || typeof independentAssetsResponse.body !== "object") throw new ServiceUnavailableException(`FakeBroker independent asset read failed during C5 recovery: ${independentAssetsResponse.status}`);
      const independentAssets = independentAssetsResponse.body as Record<string, any>;
      const candidateRiskFixtureBytes = await readFile(resolve(process.cwd(), "fixtures/v2/v2.4/candidate-a-binding-v1/input.json")).catch(() => readFile(resolve(process.cwd(), "../../fixtures/v2/v2.4/candidate-a-binding-v1/input.json")));
      const candidateRiskFixture = JSON.parse(candidateRiskFixtureBytes.toString("utf8")) as Record<string, any>;
      const riskProjection = projectV24CandidateRiskFacts({ initialCash: candidateRiskFixture.account.initialCash, referencePrice: execution.fill.price, portfolio: account, independentAssets });
      if (riskProjection.reconciliation.status !== "MATCH") throw new ConflictException("C5 Candidate A recovery risk facts require matching independent FakeBroker assets");
      const riskScope = { testRunId, ownerId, accountId: recovery.accountId, namespace: recovery.namespace };
      let riskState = await this.container.v24CandidateRiskStates.find(testRunId, ownerId, recovery.accountId, recovery.namespace);
      if (!riskState) {
        const initialized = initializeV24CandidateRiskState({ ...riskScope, sessionDate: dailyBarPlan.sessionDate, initialCash: candidateRiskFixture.account.initialCash, maxGrossExposure: candidateRiskFixture.risk.maxGrossExposure, maxDailyTurnover: candidateRiskFixture.risk.maxDailyTurnover, cumulativeLossLimit: candidateRiskFixture.risk.cumulativeLossPause, mandateStatus: "ACTIVE" });
        riskState = (await this.container.v24CandidateRiskStates.saveInitial(initialized)).state;
      }
      const persistedRiskState = await this.container.v24CandidateRiskStates.applyFill(riskScope, { externalFillId: execution.fill.externalFillId, security: recovery.grant.order.security, quantity: execution.fill.quantity, price: execution.fill.price, currency: execution.fill.currency ?? "CNY", tradeDate: dailyBarPlan.sessionDate, grossExposure: riskProjection.grossExposure, cumulativeLoss: riskProjection.cumulativeLoss, reconciliation: "MATCH" });
      candidateRisk = { projection: riskProjection, state: persistedRiskState };
    }
    let dailyClose: Record<string, any> | undefined;
    if (run.evidence.sampling && dailyBarPlan?.fixtureVersion && dailyBarPlan.sessionDate && daily && dailyReplay) {
      reconciliation = await this.readPaperReconciliation(recovery.namespace);
      const hasDiscrepancy = reconciliation.externalOnlyOrderCount > 0 || reconciliation.unresolved_order_count > 0 || reconciliation.pending_outbox_count > 0 || (Array.isArray(reconciliation.discrepancies) && reconciliation.discrepancies.length > 0);
      const alertRequest = { ownerId, testRunId, status: hasDiscrepancy ? "DISCREPANCY" as const : "MATCH" as const, discrepancies: reconciliation.discrepancies ?? [] };
      const alert = await this.marketReadClient().recordPaperReconciliationAlert(alertRequest);
      const alertReplay = await this.marketReadClient().recordPaperReconciliationAlert(alertRequest);
      if (alert.status !== alertRequest.status || alertReplay.status !== alertRequest.status || alertReplay.created !== false) throw new ConflictException("C5 recovery reconciliation alert state or idempotent replay is invalid");
      dailyClose = { status: alertRequest.status, recordedAt: new Date().toISOString(), alert, idempotentReplay: alertReplay };
    }
    const assertions = [
      ...(Array.isArray(run.evidence.samplingAssertions) ? run.evidence.samplingAssertions as Array<Record<string, any>> : []),
      ...(run.evidence.sampling ? [{ assertionId: "V2.4-C5-SNAPSHOT-CONSUMPTION-001", status: execution.eligibility?.snapshotId === (run.evidence.sampling as any).observation?.snapshotId && execution.fill?.price === (run.evidence.sampling as any).observation?.price ? "PASS" : "FAIL", expected: { snapshotId: (run.evidence.sampling as any).observation?.snapshotId, price: (run.evidence.sampling as any).observation?.price }, actual: { eligibility: execution.eligibility, fillPrice: execution.fill?.price } }] : []),
      { assertionId: "V2.4-PAPER-001", status: execution.authorization?.status === "AUTHORIZED" ? "PASS" : "FAIL", expected: "Original order carries its persisted run-scoped authorization", actual: execution.authorization },
      { assertionId: "V2.4-PAPER-002", status: execution.riskEvaluation?.status === "PASS_RISK_CHECK" ? "PASS" : "FAIL", expected: "Original order carries its persisted passing snapshot risk evaluation", actual: execution.riskEvaluation },
      { assertionId: "V2.4-PAPER-003", status: execution.eligibility?.status === "ELIGIBLE" && execution.eligibility.executionModel === "SNAPSHOT" && execution.eligibility.dataMode === "FIXTURE" ? "PASS" : "FAIL", expected: "Original order carries its persisted eligible Fixture snapshot", actual: execution.eligibility },
      { assertionId: "V2.4-PAPER-004", status: execution.order?.status === "FILLED" ? "PASS" : "FAIL", expected: "Original accepted order is durably FILLED", actual: execution.order?.status },
      { assertionId: "V2.4-PAPER-005", status: execution.fill && Number(execution.fill.quantity) === Number(recovery.grant.order.requestedQuantity) ? "PASS" : "FAIL", expected: recovery.grant.order.requestedQuantity, actual: execution.fill?.quantity },
      { assertionId: "V2.4-PAPER-006", status: account.cash?.amount === expectedCashAfterFill && account.ledgerEntryCount === 2 ? "PASS" : "FAIL", expected: { cash: expectedCashAfterFill, ledgerEntryCount: 2 }, actual: { cash: account.cash?.amount, ledgerEntryCount: account.ledgerEntryCount } },
      { assertionId: "V2.4-PAPER-007", status: reservation?.status === "CAPTURED" && reservation.capturedCashAmount === expectedReservation ? "PASS" : "FAIL", expected: { status: "CAPTURED", capturedCashAmount: expectedReservation }, actual: reservation },
      { assertionId: "V2.4-PAPER-008", status: outbox?.status === "DELIVERED" && reconciliation.fill_count === 1 && reconciliation.pending_outbox_count === 0 ? "PASS" : "FAIL", expected: { outbox: "DELIVERED", fill_count: 1, pending_outbox_count: 0 }, actual: { outbox, reconciliation } },
      ...(candidateRisk ? [{ assertionId: "V2.4-C5-RISK-001", status: candidateRisk.state.status === "ACTIVE" && candidateRisk.projection.reconciliation.status === "MATCH" && candidateRisk.state.dailyTurnover === "1025.0000" && candidateRisk.state.grossExposure === "1025.0000" && candidateRisk.state.cumulativeLoss === "5.0000" && candidateRisk.state.appliedFills.length === 1 && candidateRisk.state.appliedFills[0]?.externalFillId === execution.fill.externalFillId ? "PASS" : "FAIL", expected: "Recovered matched Fill updates Candidate A's scoped risk state exactly once", actual: candidateRisk }] : []),
      ...(run.evidence.sampling ? [{ assertionId: "V2.4-C5-DAILY-BAR-001", status: daily?.task?.state === "COMPLETED" && daily?.completion?.dataMode === "FIXTURE" && daily?.completion?.fixtureVersion === dailyBarPlan?.fixtureVersion && daily?.completion?.sessionDate === dailyBarPlan?.sessionDate && JSON.stringify(daily?.completion?.bars?.map((bar: any) => bar.securityId).sort()) === JSON.stringify([...(dailyBarPlan?.expectedSecurityIds ?? [])].sort()) ? "PASS" : "FAIL", expected: "Recovered C5 run includes its frozen independent DAILY_BAR completion", actual: daily },
      { assertionId: "V2.4-C5-DAILY-BAR-IDEMPOTENCY-001", status: Boolean(dailyFirst?.task?.taskId) && dailyReplay?.task?.taskId === dailyFirst?.task?.taskId && dailyReplay?.created === false && daily?.task?.completionId === daily?.completion?.completionId ? "PASS" : "FAIL", expected: "Recovery reuses the durable DAILY_BAR task on repeat request", actual: { firstTaskId: dailyFirst?.task?.taskId, replayTaskId: dailyReplay?.task?.taskId, replayCreated: dailyReplay?.created, completionId: daily?.completion?.completionId } },
      ...(dailyClose ? [{ assertionId: "V2.4-C5-DAILY-RECONCILIATION-ALERT-001", status: dailyClose.alert.status === dailyClose.status && dailyClose.idempotentReplay.created === false && (dailyClose.status === "DISCREPANCY" ? dailyClose.alert.incident?.state === "OPEN" && dailyClose.alert.incident.code === "V24_PAPER_RECONCILIATION_DISCREPANCY" : dailyClose.alert.incident === null) ? "PASS" : "FAIL", expected: "Recovered C5 run records the deduplicated daily reconciliation alert state", actual: dailyClose }] : [])] : [])
    ];
    const status = assertions.every((item) => item.status === "PASS") ? "COMPLETED" : "FAILED";
    const evidence = { ...run.evidence, authorization: execution.authorization ?? { authorizationId: recovery.authorizationId, status: "AUTHORIZED" }, riskEvaluation: execution.riskEvaluation, eligibility: execution.eligibility, order: execution.order, fills: execution.fill ? [execution.fill] : [], account, resourceReservation: reservation, outbox, reconciliation, ...(candidateRisk ? { candidateRisk } : {}), ...(daily ? { dailyBar: { taskId: daily.task?.taskId ?? null, completionId: daily.completion?.completionId ?? null, fixtureVersion: daily.completion?.fixtureVersion ?? null, sessionDate: daily.completion?.sessionDate ?? null, replayCreated: dailyReplay?.created ?? null } } : {}), ...(dailyClose ? { dailyClose } : {}), assertions, status, recovery: { ...recovery, status: status === "COMPLETED" ? "RECOVERED" : "UNKNOWN", executionResent, lastAttemptAt: new Date().toISOString(), recoveredOrderId: execution.order.order_id } };
    const updated = await this.container.stageRuns.reviseFailedV24Run(testRunId, ownerId, status, assertions, evidence);
    return { accepted: true, testRunId, status: updated.status, executionResent, recoveredOrderId: execution.order.order_id, historyCount: (await this.container.stageRuns.listRunHistory(testRunId, ownerId)).length };
  }
  @Get("runs/:testRunId/history") async history(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") testRunId: string) {
    const ownerId = identity(cookie, testHeader);
    const run = await this.container.stageRuns.find(testRunId, ownerId);
    if (!run || run.stageId !== "V2.4" || run.scenarioId !== "recovery") throw new NotFoundException("V2.4 recovery TestRun was not found");
    return { testRunId, revisions: await this.container.stageRuns.listRunHistory(testRunId, ownerId) };
  }
  private async runV24CrossdaySettlement(input: { testRunId: string; namespace: string; seed: number; ownerId: string; accountId: string; baseEvidence: Record<string, unknown>; assertion: (assertionId: string, pass: boolean, expected: unknown, actual: unknown) => Record<string, unknown> }) {
    const { testRunId, namespace, seed, ownerId, accountId, baseEvidence, assertion } = input;
    const fixturePath = resolve(process.cwd(), "fixtures/v2/v2.4/crossday-settlement-v1/input.json");
    const fixtureBytes = await readFile(fixturePath).catch(() => readFile(resolve(process.cwd(), "../../fixtures/v2/v2.4/crossday-settlement-v1/input.json")));
    const fixture = JSON.parse(fixtureBytes.toString("utf8")) as Record<string, any>;
    const fixtureSha256 = createHash("sha256").update(fixtureBytes).digest("hex");
    const candidateRiskFixtureBytes = await readFile(resolve(process.cwd(), "fixtures/v2/v2.4/candidate-a-binding-v1/input.json")).catch(() => readFile(resolve(process.cwd(), "../../fixtures/v2/v2.4/candidate-a-binding-v1/input.json")));
    const candidateRiskFixture = JSON.parse(candidateRiskFixtureBytes.toString("utf8")) as Record<string, any>;
    const buildGrant = (side: "BUY" | "SELL", values: Record<string, any>) => ({
      scenarioId: "v24-isolated-snapshot-paper-normal", scenarioVersion: "2.0.0", testRunId, ownerId, namespace, accountId,
      clockNow: values.ingestedAt, dataMode: fixture.dataMode, environmentMode: fixture.environmentMode, brokerMode: fixture.brokerMode,
      liveTradingEnabled: false, market: fixture.market, currency: fixture.currency,
      policy: { ...fixture.policy, executionWindowStart: values.acceptedAt, executionWindowEnd: new Date(Date.parse(values.acceptedAt) + 4 * 60 * 1000).toISOString() },
      mandate: fixture.mandate,
      signal: { signalId: `v24-crossday-${side.toLowerCase()}-${testRunId}`, asOf: values.asOf, action: side, quantity: values.quantity, referencePrice: values.price },
      order: { clientOrderId: `v24-fixture-v2-${testRunId}-${side.toLowerCase()}`, security: "600000.SH", acceptedAt: values.acceptedAt, requestedQuantity: values.quantity },
      snapshot: { snapshotId: `v24-crossday-${side.toLowerCase()}-snapshot-${testRunId}`, security: "600000.SH", market: "CN_A", sourceMode: "FIXTURE", status: "READY", observedAt: values.observedAt, ingestedAt: values.ingestedAt, price: values.price },
      fee: values.fee
    });
    const execute = async (grant: Record<string, any>) => {
      const authorized = await this.governanceAuthorizationClient().authorizeV24PaperFixtureRun({ grant } as never);
      const authorization = authorized.body as { authorizationId?: string } | undefined;
      if (authorized.status !== 200 || !authorization?.authorizationId) throw new Error(`cross-day Fixture authorization failed: ${authorized.status} ${JSON.stringify(authorized.body)}`);
      const response = await this.paperExecutionClient().executeV24FixtureSnapshotOrder({ authorizationId: authorization.authorizationId, grant, initialAccountCash: fixture.account.initialCash } as never);
      let result = await response.json().catch(() => ({})) as Record<string, any>;
      if (!response.ok && response.status !== 202) throw new Error(`cross-day Fixture execution failed: ${response.status}`);
      for (let attempt = 0; (!result.outbox || result.outbox.status !== "DELIVERED") && attempt < 30; attempt += 1) {
        await new Promise((done) => setTimeout(done, 100));
        result = (await this.readPaperOrder(namespace, grant.order.clientOrderId)) ?? result;
      }
      if (result.order?.status !== "FILLED" || result.outbox?.status !== "DELIVERED") throw new Error("cross-day Fixture order or outbox did not become durable");
      return { authorization, result };
    };
    const buyGrant = buildGrant("BUY", fixture.buy);
    const buy = await execute(buyGrant);
    const accountAfterBuy = await this.readPaperAccount(accountId, ownerId);
    const assetsAfterBuyResponse = await new GeneratedPlatformV13ManualTradeClient(this.container.executionUrl, this.container.portfolioToken).readIndependentAssets(namespace, accountId);
    if (assetsAfterBuyResponse.status !== 200 || !assetsAfterBuyResponse.body || typeof assetsAfterBuyResponse.body !== "object") throw new Error("cross-day FakeBroker assets are unavailable after buy");
    const independentAssetsAfterBuy = assetsAfterBuyResponse.body as Record<string, any>;
    const riskScope = { testRunId, ownerId, accountId, namespace };
    const riskState = await this.container.v24CandidateRiskStates.saveInitial(initializeV24CandidateRiskState({ ...riskScope, sessionDate: "2024-01-04", initialCash: candidateRiskFixture.account.initialCash, maxGrossExposure: candidateRiskFixture.risk.maxGrossExposure, maxDailyTurnover: candidateRiskFixture.risk.maxDailyTurnover, cumulativeLossLimit: candidateRiskFixture.risk.cumulativeLossPause, mandateStatus: "ACTIVE" }));
    const buyProjection = projectV24CandidateRiskFacts({ initialCash: candidateRiskFixture.account.initialCash, referencePrice: fixture.buy.price, portfolio: accountAfterBuy, independentAssets: independentAssetsAfterBuy });
    if (buyProjection.reconciliation.status !== "MATCH" || !buy.result.fill?.externalFillId) throw new Error("cross-day BUY risk facts require matching independent assets");
    const riskAfterBuy = await this.container.v24CandidateRiskStates.applyFill(riskScope, { externalFillId: buy.result.fill.externalFillId, security: "600000.SH", quantity: buy.result.fill.quantity, price: buy.result.fill.price, currency: fixture.currency, tradeDate: "2024-01-04", grossExposure: buyProjection.grossExposure, cumulativeLoss: buyProjection.cumulativeLoss, reconciliation: "MATCH" });
    const sellGrant = buildGrant("SELL", fixture.sell);
    const sell = await execute(sellGrant);
    const beforeSettlement = await this.readPaperAccount(accountId, ownerId);
    const assetsBeforeResponse = await new GeneratedPlatformV13ManualTradeClient(this.container.executionUrl, this.container.portfolioToken).readIndependentAssets(namespace, accountId);
    if (assetsBeforeResponse.status !== 200 || !assetsBeforeResponse.body || typeof assetsBeforeResponse.body !== "object") throw new Error("cross-day FakeBroker assets are unavailable before settlement");
    const independentAssetsBefore = assetsBeforeResponse.body as Record<string, any>;
    const sellProjection = projectV24CandidateRiskFacts({ initialCash: candidateRiskFixture.account.initialCash, referencePrice: fixture.sell.price, portfolio: beforeSettlement, independentAssets: independentAssetsBefore });
    if (sellProjection.reconciliation.status !== "MATCH" || !sell.result.fill?.externalFillId) throw new Error("cross-day SELL risk facts require matching independent assets");
    const riskAfterRoll = await this.container.v24CandidateRiskStates.advanceSession(riskScope, { nextSessionDate: "2024-01-05", grossExposure: sellProjection.grossExposure, cumulativeLoss: sellProjection.cumulativeLoss, reconciliation: "MATCH" });
    const riskAfterSell = await this.container.v24CandidateRiskStates.applyFill(riskScope, { externalFillId: sell.result.fill.externalFillId, security: "600000.SH", quantity: sell.result.fill.quantity, price: sell.result.fill.price, currency: fixture.currency, tradeDate: "2024-01-05", grossExposure: sellProjection.grossExposure, cumulativeLoss: sellProjection.cumulativeLoss, reconciliation: "MATCH" });
    const preSettlementResponse = await fetch(`${this.container.executionUrl}/internal/v1/v24/paper-orders/probe-reservation`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${this.container.portfolioToken}` },
      body: JSON.stringify({ accountId, namespace, testRunId, ownerId, idempotencyKey: `v24-crossday-pre-settlement-${testRunId}`, clientOrderId: `v24-crossday-pre-settlement-${testRunId}`, currency: "CNY", cashAmount: "9500.0000" }),
      signal: AbortSignal.timeout(5000),
    });
    const preSettlementReservation = { status: preSettlementResponse.status, body: await preSettlementResponse.json().catch(() => null) };
    const settlement = await new GeneratedPlatformV13ManualTradeClient(this.container.executionUrl, this.container.portfolioToken).settleForSession({ namespace, accountId, ownerId, testRunId, asOf: fixture.settlement.asOf });
    if (settlement.status !== 200) throw new Error(`cross-day settlement failed: ${settlement.status}`);
    const account = await this.readPaperAccount(accountId, ownerId);
    const assetsResponse = await new GeneratedPlatformV13ManualTradeClient(this.container.executionUrl, this.container.portfolioToken).readIndependentAssets(namespace, accountId);
    if (assetsResponse.status !== 200 || !assetsResponse.body || typeof assetsResponse.body !== "object") throw new Error("cross-day FakeBroker assets are unavailable after settlement");
    const independentAssets = assetsResponse.body as Record<string, any>;
    const settlementProjection = projectV24CandidateRiskFacts({ initialCash: candidateRiskFixture.account.initialCash, referencePrice: fixture.sell.price, portfolio: account, independentAssets });
    if (settlementProjection.reconciliation.status !== "MATCH") throw new Error("cross-day settlement risk facts require matching independent assets");
    const riskAfterSettlement = await this.container.v24CandidateRiskStates.applyFacts(riskScope, { dailyTurnover: riskAfterSell.dailyTurnover, grossExposure: settlementProjection.grossExposure, cumulativeLoss: settlementProjection.cumulativeLoss });
    const reconciliation = await this.readPaperReconciliation(namespace);
    const assertions = [
      assertion("V2.4-CROSSDAY-001", buy.result.order?.status === "FILLED" && buy.result.fill?.quantity === 100 && buy.result.fill?.price === "10.0000", "Previous trading day BUY is durably filled at the frozen price", buy.result),
      assertion("V2.4-CROSSDAY-002", sell.result.order?.status === "FILLED" && sell.result.fill?.quantity === 100 && sell.result.fill?.price === "10.2500" && sell.result.outbox?.status === "DELIVERED", "Next trading day SELL is durably filled and delivered", sell.result),
      assertion("V2.4-CROSSDAY-003", beforeSettlement.cash?.amount === "8995.0000" && (beforeSettlement.positions?.length ?? 0) === 0 && preSettlementReservation.status === 409 && (preSettlementReservation.body as { detail?: { message?: unknown } } | null)?.detail?.message === "INSUFFICIENT_AVAILABLE_CASH" && independentAssetsBefore.current_cash === "8995.0000", "SELL proceeds remain unsettled before the settlement-day release and cannot reserve unavailable cash", { beforeSettlement, independentAssetsBefore, preSettlementReservation }),
      assertion("V2.4-CROSSDAY-004", account.cash?.amount === fixture.settlement.expectedCash && (account.positions?.length ?? 0) === 0 && account.unsettledReceivables?.every((item: any) => item.status === "SETTLED"), "Settlement date releases the exact SELL receivable into Portfolio cash", account),
      assertion("V2.4-CROSSDAY-005", independentAssets.current_cash === account.cash?.amount && JSON.stringify(independentAssets.positions ?? []) === JSON.stringify(account.positions ?? []) && independentAssets.unsettledReceivables?.every((item: any) => item.status === "SETTLED") && reconciliation.order_count === 2 && reconciliation.fill_count === 2 && reconciliation.pending_outbox_count === 0, "Independent FakeBroker and Portfolio reconcile after settlement", { independentAssets, account: { cash: account.cash, positions: account.positions }, reconciliation }),
      assertion("V2.4-C5-RISK-CROSSDAY-001", riskAfterBuy.sessionDate === "2024-01-04" && riskAfterBuy.dailyTurnover === "1000.0000" && riskAfterBuy.grossExposure === "1000.0000" && riskAfterRoll.sessionDate === "2024-01-05" && riskAfterRoll.dailyTurnover === "0.0000" && riskAfterSell.dailyTurnover === "1025.0000" && riskAfterSell.appliedFills.length === 1 && riskAfterSettlement.grossExposure === "0.0000" && riskAfterSettlement.cumulativeLoss === "0.0000" && riskAfterSettlement.sessionTransitions.length === 1, "A later trading session resets only daily turnover and Fill identity after MATCH reconciliation; settlement preserves the new-session risk facts", { riskAfterBuy, riskAfterRoll, riskAfterSell, riskAfterSettlement, buyProjection, sellProjection, settlementProjection })
    ];
    const status = assertions.every((item) => item.status === "PASS") ? "COMPLETED" : "FAILED";
    const evidence = { ...baseEvidence, fixture: { fixtureId: fixture.fixtureId, fixtureVersion: fixture.fixtureVersion, manifestSha256: fixtureSha256 }, accountId, crossday: { buy: { grant: buyGrant, authorization: buy.authorization, execution: buy.result }, sell: { grant: sellGrant, authorization: sell.authorization, execution: sell.result }, beforeSettlement: { account: beforeSettlement, independentAssets: independentAssetsBefore, reservation: preSettlementReservation }, settlement, independentAssets }, candidateRisk: { projection: settlementProjection, state: riskAfterSettlement, buyProjection, sellProjection, settlementProjection }, orders: [buy.result.order, sell.result.order], fills: [buy.result.fill, sell.result.fill], account, independentAssets, reconciliation, assertions, status, businessValidation: status, humanAcceptance: "NOT_RUN" };
    await this.container.stageRuns.save({ testRunId, stageId: "V2.4", scenarioId: "crossday-settlement", scenarioVersion: "2.2.0", ownerId, status, seed, assertions, evidence, namespace });
    return { accepted: true, testRunId, status };
  }
  private async runV24CandidateBinding(input: { testRunId: string; namespace: string; seed: number; ownerId: string; accountId: string; baseEvidence: Record<string, unknown>; assertion: (assertionId: string, pass: boolean, expected: unknown, actual: unknown) => Record<string, unknown> }) {
    const { testRunId, namespace, seed, ownerId, accountId, baseEvidence, assertion } = input;
    const fixturePath = resolve(process.cwd(), "fixtures/v2/v2.4/candidate-a-binding-v1/input.json");
    const fixtureBytes = await readFile(fixturePath).catch(() => readFile(resolve(process.cwd(), "../../fixtures/v2/v2.4/candidate-a-binding-v1/input.json")));
    const fixture = JSON.parse(fixtureBytes.toString("utf8")) as Record<string, any>;
    const fixtureSha256 = createHash("sha256").update(fixtureBytes).digest("hex");
    const manifestBytes = await readFile(resolve(process.cwd(), "fixtures/v2/v2.4/candidate-a-binding-v1/manifest.json")).catch(() => readFile(resolve(process.cwd(), "../../fixtures/v2/v2.4/candidate-a-binding-v1/manifest.json")));
    const manifest = JSON.parse(manifestBytes.toString("utf8")) as { status?: string; files?: Array<{ path: string; sha256: string }> };
    const manifestEntry = manifest.files?.find((item) => item.path === "fixtures/v2/v2.4/candidate-a-binding-v1/input.json");
    if (manifest.status !== "FROZEN" || manifestEntry?.sha256 !== fixtureSha256) throw new Error("Candidate A binding Fixture manifest or hash is invalid");
    const mandateId = randomUUID();
    const mandate = { mandateId, mandateVersion: 1 as const, testRunId, accountId, strategyVersion: fixture.strategy.sha256, market: "CN_A" as const, currency: "CNY" as const, securityScope: fixture.universe.securityScope, maxOrderAmount: fixture.risk.maxOrderNotional, maxTotalAmount: fixture.risk.maxDailyTurnover, maxOrderCount: fixture.risk.maxDailyOrderCount, validFrom: fixture.isolatedMandate.validFrom, expiresAt: fixture.isolatedMandate.expiresAt, reason: "C5 Candidate A isolated binding validation only; inactive and non-executable", now: fixture.isolatedMandate.now };
    const created = await this.autoMandateClient().create(mandate, ownerId, ownerId);
    if (created.status !== 201 || !created.body || typeof created.body !== "object") throw new Error(`Candidate A Mandate persistence failed: ${created.status}`);
    const persisted = await this.autoMandateClient().read(mandateId, testRunId, ownerId);
    const budget = await this.autoMandateClient().readBudget(mandateId, testRunId, 1, ownerId);
    const account = await this.readPaperAccount(accountId, ownerId);
    const targetWorker = new V24FixtureDailyTargetWorker(this.container.v24DailyTargets, (id, owner) => this.readPaperAccount(id, owner), loadV24DailyDirectionFixture);
    const dailyTarget = await targetWorker.materialize({ scope: { testRunId, ownerId, accountId, namespace }, evaluatedAt: "2026-10-16T09:31:00+08:00", mandateStatus: "PENDING" });
    const riskProjection = projectV24CandidateRiskFacts({ initialCash: fixture.account.initialCash, referencePrice: dailyTarget.target.input.referencePrice, portfolio: account });
    const riskState = await this.container.v24CandidateRiskStates.saveInitial(initializeV24CandidateRiskState({ testRunId, ownerId, accountId, namespace, sessionDate: dailyTarget.target.evaluationAt.slice(0, 10), initialCash: fixture.account.initialCash, maxGrossExposure: fixture.risk.maxGrossExposure, maxDailyTurnover: fixture.risk.maxDailyTurnover, cumulativeLossLimit: fixture.risk.cumulativeLossPause, mandateStatus: "PENDING" }));
    const persistedRiskFacts = await this.container.v24CandidateRiskStates.applyFacts({ testRunId, ownerId, accountId, namespace }, { dailyTurnover: "0.0000", grossExposure: "0.0000", cumulativeLoss: "0.0000" });
    const scheduler = this.scheduler.status();
    const expiredMandateAdmission = evaluateV24DailyDirection({ ...dailyTarget.target.input, clock: { now: () => new Date(dailyTarget.target.input.mandate.expiresAt) } });
    const executionAdmission = admitV24CandidateExecution({ acceptedAt: "2026-10-16T09:31:00+08:00", evaluatedAt: "2026-10-16T09:31:50+08:00", referencePrice: dailyTarget.target.input.referencePrice, snapshot: { security: "600000.SH", market: "CN_A", status: "READY", observedAt: "2026-10-16T09:31:10+08:00", ingestedAt: "2026-10-16T09:31:11+08:00", price: dailyTarget.target.input.referencePrice } });
    const staleAdmission = admitV24CandidateExecution({ acceptedAt: "2026-10-16T09:31:00+08:00", evaluatedAt: "2026-10-16T09:32:11+08:00", referencePrice: dailyTarget.target.input.referencePrice, snapshot: { security: "600000.SH", market: "CN_A", status: "READY", observedAt: "2026-10-16T09:31:10+08:00", ingestedAt: "2026-10-16T09:31:11+08:00", price: dailyTarget.target.input.referencePrice } });
    const unknownAdmission = admitV24CandidateExecution({ acceptedAt: "2026-10-16T09:31:00+08:00", evaluatedAt: "2026-10-16T09:31:20+08:00", referencePrice: dailyTarget.target.input.referencePrice, snapshot: { security: "600000.SH", market: "CN_A", status: "UNKNOWN", observedAt: "2026-10-16T09:31:10+08:00", ingestedAt: "2026-10-16T09:31:11+08:00", price: dailyTarget.target.input.referencePrice } });
    const missedWindowAdmission = admitV24CandidateExecution({ acceptedAt: "2026-10-16T09:35:00+08:00", evaluatedAt: "2026-10-16T09:35:01+08:00", referencePrice: dailyTarget.target.input.referencePrice, snapshot: { security: "600000.SH", market: "CN_A", status: "READY", observedAt: "2026-10-16T09:35:01+08:00", ingestedAt: "2026-10-16T09:35:01+08:00", price: dailyTarget.target.input.referencePrice } });
    const assertions = [
      assertion("V2.4-C5-BINDING-001", account.testRunId === testRunId && account.namespace === namespace && account.market === "CN_A" && account.cash?.amount === fixture.account.initialCash, "Candidate A binds a new isolated PAPER/FAKE account with exactly 10000 CNY", { accountId, account }),
      assertion("V2.4-C5-BINDING-002", persisted.status === 200 && (persisted.body as any).status === "PENDING" && (persisted.body as any).strategyVersion === fixture.strategy.sha256 && (persisted.body as any).accountId === accountId && (persisted.body as any).maxOrderAmount === fixture.risk.maxOrderNotional && (persisted.body as any).maxTotalAmount === fixture.risk.maxDailyTurnover, "Governance persists the exact frozen candidate scope as an inactive Mandate", { mandate, persisted: persisted.body }),
      assertion("V2.4-C5-BINDING-003", dailyTarget.target?.decision.action === "PAUSED" && dailyTarget.target?.decision.reason === "MANDATE_INACTIVE" && dailyTarget.target?.clientOrderId === null && riskState.state.status === "PAUSED" && riskState.state.reason === "MANDATE_INACTIVE" && persistedRiskFacts.status === "PAUSED" && persistedRiskFacts.dailyTurnover === "0.0000" && persistedRiskFacts.grossExposure === "0.0000" && persistedRiskFacts.cumulativeLoss === "0.0000" && riskProjection.grossExposure === "0.0000" && riskProjection.cumulativeLoss === "0.0000" && riskProjection.reconciliation.status === "NOT_AVAILABLE" && riskProjection.eligibleForRiskUpdate === false && budget.status === 200 && (budget.body as any).reservationCount === 0 && (budget.body as any).consumedCount === 0 && scheduler.status !== "RUNNING", "The target materializer and persistent candidate risk state remain PAUSED; read-only account facts cannot update risk without independent assets and fills", { dailyTarget, riskState, persistedRiskFacts, riskProjection, budget: budget.body, scheduler })
      ,assertion("V2.4-C5-MANDATE-EXPIRY-001", expiredMandateAdmission.action === "PAUSED" && expiredMandateAdmission.reason === "MANDATE_INACTIVE" && expiredMandateAdmission.quantity === 0, "At the exact mandate expiry boundary, the account-bound candidate target is paused with no order quantity", expiredMandateAdmission)
      ,assertion("V2.4-C5-CANDIDATE-EXECUTION-001", executionAdmission.status === "ELIGIBLE" && executionAdmission.quoteAgeSeconds === 40 && staleAdmission.status === "PAUSED" && staleAdmission.reason === "SNAPSHOT_STALE" && unknownAdmission.status === "PAUSED" && unknownAdmission.reason === "SNAPSHOT_STATUS_UNKNOWN" && missedWindowAdmission.status === "PAUSED" && missedWindowAdmission.reason === "EXECUTION_WINDOW_CLOSED", "Candidate A accepts only 09:31–09:35 post-acceptance snapshots no older than 60 seconds; stale, unknown, or missed-window inputs fail closed with distinct reasons and never activate the PENDING Mandate", { executionAdmission, staleAdmission, unknownAdmission, missedWindowAdmission })
    ];
    const status = assertions.every((item) => item.status === "PASS") ? "COMPLETED" : "FAILED";
    const evidence = { ...baseEvidence, fixture: { fixtureId: fixture.fixtureId, fixtureVersion: fixture.fixtureVersion, manifestSha256: createHash("sha256").update(manifestBytes).digest("hex"), inputSha256: fixtureSha256 }, accountId, candidateBinding: { strategy: fixture.strategy, risk: fixture.risk, cost: fixture.cost, approval: fixture.approval, mandate: { mandateId, mandateVersion: 1, status: (persisted.body as any)?.status ?? null, contentHash: (created.body as any).contentHash ?? null, isolatedValidity: fixture.isolatedMandate }, dailyTarget, riskState, persistedRiskFacts, riskProjection, expiredMandateAdmission, executionAdmission: { eligible: executionAdmission, stale: staleAdmission, unknown: unknownAdmission, missedWindow: missedWindowAdmission }, scheduler, budget: budget.body }, account, orders: [], fills: [], assertions, status, businessValidation: status, humanAcceptance: "NOT_RUN" };
    await this.container.stageRuns.save({ testRunId, stageId: "V2.4", scenarioId: "candidate-binding", scenarioVersion: "2.5.0", ownerId, status, seed, assertions, evidence, namespace });
    return { accepted: true, testRunId, status };
  }
  private async readPaperAccount(accountId: string, ownerId: string): Promise<any> {
    return this.portfolioAccountClient().getAccountSnapshot(accountId, ownerId);
  }
  private async waitForV24Sampling(scope: { ownerId: string; accountId: string; namespace: string; testRunId: string }, taskId: string): Promise<any> {
    let latest: any = null;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      latest = await this.marketReadClient().getV21LatestSnapshotSamplingTask(scope) as any;
      if (latest?.task?.taskId === taskId && ["COMPLETED_FIXTURE", "FAILED"].includes(latest.task.status)) return latest;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
    }
    throw new ServiceUnavailableException(`V2.4 scoped snapshot Fixture task did not reach a terminal state within 8 seconds: ${JSON.stringify(latest)}`);
  }
  private async waitForV24DailyBar(scope: { market: "CN_A"; ownerId: string; accountId: string; namespace: string; testRunId: string }, taskId: string): Promise<any> {
    let latest: any = null;
    for (let attempt = 0; attempt < 80; attempt += 1) {
      latest = await this.marketReadClient().getV21LatestDailyBarCompletion(scope) as any;
      if (latest?.task?.taskId === taskId && ["COMPLETED", "FAILED"].includes(latest.task.state)) return latest;
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
    }
    throw new ServiceUnavailableException(`V2.4 scoped DAILY_BAR Fixture task did not reach a terminal state within 8 seconds: ${JSON.stringify(latest)}`);
  }
  private async readPaperOrder(namespace: string, clientOrderId: string): Promise<Record<string, any> | null> {
    const response = await this.paperExecutionClient().readV24FakeOrderByClientIdentity(namespace, clientOrderId);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`FakeBroker order recovery query failed: ${response.status}`);
    return response.json();
  }
  private async readPaperReconciliation(namespace: string): Promise<Record<string, any>> {
    const response = await this.paperExecutionClient().readV24PaperReconciliationSummary(namespace);
    if (!response.ok) throw new Error(`FakeBroker reconciliation failed: ${response.status}`);
    return response.json();
  }
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
  @Get("preview") preview() { return { stageId: "V2.5", profile: "S2", securities: 20, sessions: 60, rows: 1200, dataVersion: "v2.5-acceptance-synthetic-fixture-v2", environmentMode: "BACKTEST", dataMode: "FIXTURE", brokerMode: "FAKE", observationGate: "V2.4_20_TRADING_DAYS_PENDING" }; }
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
  private projectDeliveryClient(token = this.projectToken) {
    return new GeneratedMarketDataProjectDeliveryClient(this.container.marketDataUrl, this.projectId, token);
  }
  private async call<T>(operation: () => Promise<T>): Promise<{ status: number; body: any }> {
    try { return { status: 200, body: await operation() }; }
    catch (error) {
      if (error instanceof MarketDataProjectDeliveryHttpError) return { status: error.status, body: error.body };
      throw error;
    }
  }
  @Post("runs") @HttpCode(202) async create(@Body() body: { scenarioId?: "normal" | "rejection" | "recovery"; seed?: number }) {
    const scenarioId = body.scenarioId ?? "normal"; const testRunId = randomUUID();
    if (!["normal", "rejection", "recovery"].includes(scenarioId)) throw new ForbiddenException("scenario is not available for DC-06");
    const items = [{ symbol: "600000.SH", close: 10.2, token: "must-be-redacted" }, { symbol: "000001.SZ", close: 11.3 }];
    const assertions: any[] = [];
    if (scenarioId === "normal") {
      const page = await this.call(() => this.projectDeliveryClient().pageProjectData({ projectId: this.projectId, dataVersion: "dc06-web-v1", items, pageSize: 1 }));
      const exported = await this.call(() => this.projectDeliveryClient().exportProjectData({ projectId: this.projectId, dataVersion: "dc06-web-v1", items }));
      assertions.push({ assertionId: "DC06-WEB-PAGE-001", status: page.status === 200 && page.body.items?.length === 1 ? "PASS" : "FAIL", expected: "200 and one paged row", actual: page.body });
      assertions.push({ assertionId: "DC06-WEB-REDACTION-001", status: exported.status === 200 && !JSON.stringify(exported.body.items).includes("must-be-redacted") ? "PASS" : "FAIL", expected: "token absent from export", actual: exported.body });
    } else if (scenarioId === "rejection") {
      const rejected = await this.call(() => this.projectDeliveryClient().pageProjectData({ projectId: "other-project", dataVersion: "dc06-web-v1", items }));
      assertions.push({ assertionId: "DC06-WEB-AUTH-001", status: rejected.status === 403 ? "PASS" : "FAIL", expected: 403, actual: rejected.status });
    } else {
      const denied = await this.call(() => this.projectDeliveryClient("wrong-token").pageProjectData({ projectId: this.projectId, dataVersion: "dc06-web-v1", items }));
      const recovered = await this.call(() => this.projectDeliveryClient().pageProjectData({ projectId: this.projectId, dataVersion: "dc06-web-v1", items }));
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
  private marketDataClient() { return new GeneratedV21MarketDataClient(this.container.marketDataUrl, () => this.container.marketDataHeaders()); }
  private mapMarketDataError(error: unknown): never { if (error instanceof MarketDataV21HttpError) throw new HttpException(error.body as string | Record<string, any>, error.status); throw error; }
  @Get("preview")
  async preview(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) {
    identity(cookie, testHeader);
    const subscriptionId = process.env.STOCKQUANT_DC08A_SUBSCRIPTION_ID ?? "dc08a-20260914-short-v1";
    const [ready, schedule, gaps] = await Promise.all([
      probeServiceReadiness(`${this.container.marketDataUrl}/ready`).then((result) => result.status === "READY" ? result.body : { status: "UNAVAILABLE" }),
      this.marketDataClient().getCollectionScheduleForPlatform(subscriptionId),
      this.marketDataClient().getMinuteGapsForPlatform(subscriptionId),
    ]).catch((error) => this.mapMarketDataError(error));
    return { stageId: "DC-08A", subscriptionId, ready, schedule, gaps, webMode: "READ_ONLY", note: "页面只读；正式启用由受保护的定时脚本执行" };
  }
}

@Controller("api/v1/acceptance/v2/v2.1")
export class V21AcceptanceController {
  private readonly marketUrl = process.env.STOCKQUANT_MARKET_DATA_URL ?? "http://127.0.0.1:3002";
  constructor(private readonly container: PlatformContainer) {}
  private marketReadClient() { return new GeneratedV21MarketDataClient(this.marketUrl, () => this.container.marketDataHeaders()); }
  private monitorClient() { return new GeneratedMarketMonitorClient(this.container.marketMonitorUrl, this.container.marketMonitorToken); }
  private throwMonitorError(error: unknown): never { if (error instanceof MarketMonitorClientError) throw new HttpException(typeof error.body === "string" ? error.body : error.body as Record<string, any>, error.status); throw error; }
  private throwMarketDataError(error: unknown): never { if (error instanceof MarketDataV21HttpError) throw new HttpException(typeof error.body === "string" ? error.body : error.body as Record<string, any>, error.status); throw error; }
  private samplingScope(ownerId: string, body: { scope?: { accountId?: string; namespace?: string; testRunId?: string } }) {
    const scope = body?.scope;
    if (!scope || typeof scope.accountId !== "string" || !isUuid(scope.accountId) || typeof scope.namespace !== "string" || !scope.namespace.trim() || scope.namespace.length > 128 || typeof scope.testRunId !== "string" || !isUuid(scope.testRunId)) throw new UnprocessableEntityException("sampling requires the current accountId, namespace, and testRunId scope");
    return { market: "CN_A" as const, ownerId, accountId: scope.accountId, namespace: scope.namespace, testRunId: scope.testRunId };
  }
  @Get("scenarios") scenarios(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return [
    { scenarioId: "normal", version: "1.2.0-fixture", title: "Fixture在线池、行情质量、日线与新闻", expected: "同一TestRun完成两证券新鲜Fixture观察/质量投影、日线与新闻修订；不请求真实来源" },
    { scenarioId: "rejection", version: "1.2.0-fixture", title: "101只必需证券拒绝", expected: "REQUIRED_SECURITIES_EXCEED_LIMIT，拒绝不写入部分在线池" },
    { scenarioId: "recovery", version: "1.2.0-fixture", title: "日线任务幂等恢复", expected: "重复提交返回同一持久任务和完成记录" },
    { scenarioId: "stale", version: "1.2.0-fixture", title: "陈旧观测拒绝", expected: "独立迟到31分钟Fixture的两条观测均为STALE，质量UNAVAILABLE且新鲜覆盖为零" }
  ]; }
  @Get("sources") sources(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return this.marketReadClient().getV21SourceInventory().catch((error) => this.throwMarketDataError(error)); }
  @Get("sources/smoke") sourceSmoke(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return this.marketReadClient().getV21SourceSmoke().catch((error) => this.throwMarketDataError(error)); }
  @Get("watchlist") watchlist(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return this.marketReadClient().getV21Watchlist(); }
  @Get("watchlist/scoped") async scopedWatchlist(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Query("accountId") accountId = "", @Query("namespace") namespace = "", @Query("testRunId") testRunId = "") {
    const ownerId = identity(cookie, testHeader);
    if (!accountId || !namespace || !isUuid(testRunId)) throw new UnprocessableEntityException("accountId, namespace, and testRunId are required");
    return this.marketReadClient().getV21ScopedWatchlist({ ownerId, accountId, namespace, testRunId }).catch((error) => this.throwMarketDataError(error));
  }
  @Get("quotes") quotes(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return this.marketReadClient().getV21QuotePreview().catch((error) => this.throwMarketDataError(error)); }
  @Get("news") news(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return this.marketReadClient().getV21NewsPreview().catch((error) => this.throwMarketDataError(error)); }
  @Get("news/live") liveNews(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return this.marketReadClient().getV21LiveNews().catch((error) => this.throwMarketDataError(error)); }
  @Post("news/fixture/ingest") @HttpCode(200) ingestNewsFixture(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return this.marketReadClient().ingestV21NewsFixture().catch((error) => this.throwMarketDataError(error)); }
  @Get("news/fixture/history") newsFixtureHistory(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return this.marketReadClient().getV21NewsFixtureHistory().catch((error) => this.throwMarketDataError(error)); }
  @Get("sampling") sampling(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return this.marketReadClient().getV21SamplingConfig(); }
  @Put("sampling") samplingUpdate(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: { intervalMinutes?: number }) { identity(cookie, testHeader); return this.marketReadClient().updateV21SamplingConfig(body as import("../contracts/generated-types.js").MarketDataSamplingUpdate).catch((error) => this.throwMarketDataError(error)); }
  @Put("sampling/monitor-policy") async monitorPolicyUpdate(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: { enabled?: boolean }) {
    identity(cookie, testHeader);
    if (typeof body.enabled !== "boolean") throw new UnprocessableEntityException("enabled must be a boolean");
    return this.marketReadClient().updateV21MonitorEvaluationPolicy({ enabled: body.enabled }).catch((error) => this.throwMarketDataError(error));
  }
  @Post("sampling/tasks/tick") @HttpCode(200) samplingTick(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: { scheduledAt?: string; sourceId?: "tencent-quote" | "sina-quote"; scope?: { accountId?: string; namespace?: string; testRunId?: string } }) { const ownerId = identity(cookie, testHeader); if (typeof body.scheduledAt !== "string") throw new UnprocessableEntityException("scheduledAt is required"); if (body.sourceId !== "tencent-quote" && body.sourceId !== "sina-quote") throw new UnprocessableEntityException("sourceId must select a supported quote source"); const scope = this.samplingScope(ownerId, body); return this.marketReadClient().evaluateV21SnapshotSamplingTick({ scheduledAt: body.scheduledAt, sourceId: body.sourceId, scope }).catch((error) => this.throwMarketDataError(error)); }
  @Post("sampling/tasks/tick-fixture") @HttpCode(200) samplingFixtureTick(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: { scheduledAt?: string; scope?: { accountId?: string; namespace?: string; testRunId?: string } }) { const ownerId = identity(cookie, testHeader); if (typeof body.scheduledAt !== "string") throw new UnprocessableEntityException("scheduledAt is required"); const scope = this.samplingScope(ownerId, body); return this.marketReadClient().evaluateV21SnapshotSamplingFixtureTick({ scheduledAt: body.scheduledAt, scope }).catch((error) => this.throwMarketDataError(error)); }
  @Get("sampling/tasks/latest") latestSamplingTask(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Query("accountId") accountId = "", @Query("namespace") namespace = "", @Query("testRunId") testRunId = "") { const ownerId = identity(cookie, testHeader); const scope = this.samplingScope(ownerId, { scope: { accountId, namespace, testRunId } }); return this.marketReadClient().getV21LatestSnapshotSamplingTask(scope).catch((error) => this.throwMarketDataError(error)); }
  @Post("quote-quality/evaluate") async evaluateQuoteQuality(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: { scope?: { accountId?: string; namespace?: string; testRunId?: string } }) {
    const ownerId = identity(cookie, testHeader);
    const scope = this.samplingScope(ownerId, body);
    const latest = await this.marketReadClient().getV21LatestSnapshotSamplingTask(scope).catch((error) => this.throwMarketDataError(error)) as any;
    const task = latest?.task;
    if (!task || !["COMPLETED_FIXTURE", "COMPLETED_REAL"].includes(task.status) || !Array.isArray(task.observations)) throw new ConflictException("a completed scoped quote sampling task is required");
    if (task.scope && (task.scope.ownerId !== scope.ownerId || task.scope.accountId !== scope.accountId || task.scope.namespace !== scope.namespace || task.scope.testRunId !== scope.testRunId)) throw new ForbiddenException("Market Data returned a sampling task outside the requested scope");
    const observations = task.observations.map((item: any) => ({ securityId: item.securityId, snapshotId: item.snapshotId, sourceId: item.sourceId, dataMode: item.dataMode, observedAt: item.observedAt ?? null, ingestedAt: item.ingestedAt ?? null, availableAt: item.availableAt ?? null, ageSeconds: item.ageSeconds ?? null, freshness: item.freshness, status: item.status }));
    const request = { scope, taskId: task.taskId, expectedSecurityIds: task.securityIds ?? observations.map((item: any) => item.securityId), observations };
    return this.monitorClient().evaluateQuoteQuality(request).catch((error) => this.throwMonitorError(error));
  }
  @Post("daily-bars/real/complete") @HttpCode(200) completeRealDailyBar(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: { scope?: { accountId?: string; namespace?: string; testRunId?: string } }) {
    const scope = this.samplingScope(identity(cookie, testHeader), body);
    return this.marketReadClient().completeV21RealDailyBar(scope).catch((error) => this.throwMarketDataError(error));
  }
  @Put("sampling/schedules") snapshotSchedule(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: { scope?: { accountId?: string; namespace?: string; testRunId?: string }; sourceId?: "tencent-quote" | "sina-quote"; enabled?: boolean }) {
    const scope = this.samplingScope(identity(cookie, testHeader), body);
    if (typeof body.enabled !== "boolean" || !["tencent-quote", "sina-quote"].includes(body.sourceId ?? "")) throw new UnprocessableEntityException("sourceId and enabled are required");
    return this.marketReadClient().updateV21SnapshotSchedule({ scope, sourceId: body.sourceId!, enabled: body.enabled }).catch((error) => this.throwMarketDataError(error));
  }
  @Get("quote-quality/latest") latestQuoteQuality(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Query("accountId") accountId = "", @Query("namespace") namespace = "", @Query("testRunId") testRunId = "") {
    const ownerId = identity(cookie, testHeader);
    return this.monitorClient().getLatestQuoteQuality(this.samplingScope(ownerId, { scope: { accountId, namespace, testRunId } })).catch((error) => this.throwMonitorError(error));
  }
  @Put("daily-bars/schedules") async dailyBarSchedule(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: { enabled?: boolean; scope?: { accountId?: string; namespace?: string; testRunId?: string } }) { const ownerId = identity(cookie, testHeader); if (typeof body.enabled !== "boolean") throw new UnprocessableEntityException("enabled must be boolean"); const scope = this.samplingScope(ownerId, body); return this.marketReadClient().updateV21DailyBarSchedule({ enabled: body.enabled, scope }).catch((error) => this.throwMarketDataError(error)); }
  @Post("daily-bars/fixture/complete") @HttpCode(200) completeDailyBarFixture(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: { scope?: { accountId?: string; namespace?: string; testRunId?: string } }) { const ownerId = identity(cookie, testHeader); const scope = this.samplingScope(ownerId, body); return this.marketReadClient().completeV21DailyBarFixture(scope).catch((error) => this.throwMarketDataError(error)); }
  @Get("daily-bars/completions/latest") latestDailyBarCompletion(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Query("accountId") accountId = "", @Query("namespace") namespace = "", @Query("testRunId") testRunId = "") { const ownerId = identity(cookie, testHeader); const scope = this.samplingScope(ownerId, { scope: { accountId, namespace, testRunId } }); return this.marketReadClient().getV21LatestDailyBarCompletion(scope).catch((error) => this.throwMarketDataError(error)); }
  private async waitForSampling(scope: { ownerId: string; accountId: string; namespace: string; testRunId: string }, taskId: string): Promise<any> {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const latest = await this.marketReadClient().getV21LatestSnapshotSamplingTask(scope) as any;
      if (latest?.task?.taskId === taskId && ["COMPLETED_FIXTURE", "FAILED"].includes(latest.task.status)) return latest;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new ServiceUnavailableException("V2.1 snapshot Fixture task did not reach a terminal state within 8 seconds");
  }
  private async waitForDailyBar(scope: { market: "CN_A"; ownerId: string; accountId: string; namespace: string; testRunId: string }, taskId: string): Promise<any> {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const latest = await this.marketReadClient().getV21LatestDailyBarCompletion(scope);
      if (latest?.task?.taskId === taskId && ["COMPLETED", "FAILED"].includes(latest.task.state)) return latest;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new ServiceUnavailableException("V2.1 DAILY_BAR Fixture task did not reach a terminal state within 8 seconds");
  }
  @Post("runs") @HttpCode(202) async createRun(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: { scenarioId?: string; seed?: number }) {
    const ownerId = identity(cookie, testHeader);
    const testRunId = this.container.stageRuns.newId();
    const scenarioId = body.scenarioId ?? "normal";
    if (!["normal", "capacity", "stale", "rejection", "recovery"].includes(scenarioId)) throw new ForbiddenException("scenario is not available for V2.1");
    const seed = body.seed ?? 20260907;
    const accountId = randomUUID();
    const namespace = `v2-1-${scenarioId}-${testRunId}`;
    const scope = { market: "CN_A" as const, ownerId, accountId, namespace, testRunId };
    const run: any = { testRunId, stageId: "V2.1", scenarioId, status: "WAITING", seed, assertions: [], evidence: { environmentMode: "PAPER", dataMode: "FIXTURE", brokerMode: "FAKE", scope, humanAcceptance: "NOT_RUN", businessValidation: "IN_PROGRESS" } };
    await this.container.stageRuns.save({ testRunId, stageId: "V2.1", scenarioId, scenarioVersion: "1.2.0-fixture", ownerId, status: "WAITING", seed, assertions: [], evidence: run.evidence });

    try {
    if (scenarioId === "normal" || scenarioId === "stale") {
      const watchlist = await this.marketReadClient().updateV21ScopedWatchlist({ ownerId, accountId, namespace, testRunId, holdings: ["600000.SH"], inFlightOrders: [], candidates: ["000001.SZ"] });
      const samplingConfig = await this.sampling(cookie, testHeader) as any;
      const intervalRuns: Array<{ intervalMinutes: 20 | 30; sampled: any; result: any }> = [];
      for (const item of [
        { intervalMinutes: 20 as const, scheduledAt: "2026-10-16T01:50:00.000Z" },
        { intervalMinutes: 30 as const, scheduledAt: "2026-10-16T01:50:00.000Z" },
      ]) {
        const sampled = await this.marketReadClient().evaluateV21SnapshotSamplingFixtureTick({ scheduledAt: item.scheduledAt, scope, acceptanceIntervalMinutes: item.intervalMinutes, fixtureVariant: scenarioId === "stale" ? "stale" : "fresh" }) as any;
        const taskId = sampled?.task?.taskId;
        const result = taskId ? await this.waitForSampling(scope, taskId) : null;
        intervalRuns.push({ intervalMinutes: item.intervalMinutes, sampled, result });
      }
      const snapshot = (intervalRuns.find((item) => item.intervalMinutes === 20)?.result ?? null) as any;
      const interval20 = intervalRuns.find((item) => item.intervalMinutes === 20);
      const interval30 = intervalRuns.find((item) => item.intervalMinutes === 30);
      const intervalMatrixPassed = interval20?.sampled?.decision?.status === "ELIGIBLE" && interval20.sampled?.intervalMinutes === 20 && interval20.sampled?.task?.intervalMinutes === 20 && interval20.result?.task?.status === "COMPLETED_FIXTURE" && interval30?.sampled?.decision?.status === "NOT_SAMPLING_TICK" && interval30.sampled?.intervalMinutes === 30 && interval30.sampled?.task === null;
      let quality: any = null;
      if (snapshot?.task?.status === "COMPLETED_FIXTURE") {
        const observations = snapshot.task.observations.map((item: any) => ({ securityId: item.securityId, snapshotId: item.snapshotId, sourceId: item.sourceId, dataMode: item.dataMode, observedAt: item.observedAt ?? null, ingestedAt: item.ingestedAt ?? null, availableAt: item.availableAt ?? null, ageSeconds: item.ageSeconds ?? null, freshness: item.freshness, status: item.status }));
        quality = await this.monitorClient().evaluateQuoteQuality({ scope, taskId: snapshot.task.taskId, expectedSecurityIds: snapshot.task.securityIds, observations });
      }
      const dailyQueued = await this.marketReadClient().completeV21DailyBarFixture(scope);
      const daily = await this.waitForDailyBar(scope, dailyQueued.task.taskId);
      const newsIngest = await this.marketReadClient().ingestV21NewsFixture() as any;
      const newsHistory = await this.marketReadClient().getV21NewsFixtureHistory() as any;
      const newsRecords = Array.isArray(newsHistory?.histories) ? newsHistory.histories : [];
      const revisedNotice = newsRecords.filter((item: any) => item.sourceId === "fixture-news-a" && item.sourceItemId === "notice-001");
      const copiedNotice = newsRecords.filter((item: any) => item.sourceId === "fixture-news-b" && item.sourceItemId === "notice-copy-017");
      const newsFixturePassed = newsIngest?.fixtureVersion === "v2.1-news-revisions-1"
        && revisedNotice.length === 2
        && revisedNotice[0]?.revision === 1 && revisedNotice[0]?.supersedesRevision == null && revisedNotice[0]?.publishedAt === "2026-10-14T01:00:00.000Z" && revisedNotice[0]?.entityMatchStatus === "LINKED"
        && revisedNotice[1]?.revision === 2 && revisedNotice[1]?.supersedesRevision === 1 && revisedNotice[1]?.publishedAt === "2026-10-14T01:00:00.000Z" && revisedNotice[1]?.entityMatchStatus === "LINKED"
        && copiedNotice.length === 1 && copiedNotice[0]?.revision === 1 && copiedNotice[0]?.supersedesRevision == null && copiedNotice[0]?.publishedAt == null && copiedNotice[0]?.entityMatchStatus === "AMBIGUOUS";
      const freshCount = quality?.freshCount ?? 0;
      const expectedQuality = scenarioId === "stale"
        ? quality?.expectedCount === 2 && freshCount === 0 && quality?.coverageRatio === 0 && quality?.status === "UNAVAILABLE"
        : quality?.expectedCount === 2 && freshCount === 2 && quality?.coverageRatio === 1 && quality?.status === "READY" && Array.isArray(quality?.anomalies) && quality.anomalies.length === 0;
      const strategyPolicy = samplingConfig.policies?.find((policy: any) => policy.policyId === "strategyEvaluation");
      const orderPolicy = samplingConfig.policies?.find((policy: any) => policy.policyId === "orderExecution");
      run.assertions = [
        { assertionId: "V2.1-WATCHLIST-001", status: watchlist.count === 2 && watchlist.securities.join(",") === "600000.SH,000001.SZ" ? "PASS" : "FAIL", expected: ["600000.SH", "000001.SZ"], actual: watchlist.securities },
        { assertionId: "V2.1-SAMPLING-INTERVAL-MATRIX-001", status: intervalMatrixPassed ? "PASS" : "FAIL", expected: "the fixed 09:50 Fixture tick is admitted and persisted with 20-minute policy, then rejected with 30-minute policy without creating a task", actual: intervalRuns.map((item) => ({ intervalMinutes: item.intervalMinutes, decision: item.sampled?.decision, configuredIntervalMinutes: item.sampled?.intervalMinutes, taskIntervalMinutes: item.sampled?.task?.intervalMinutes ?? null, taskStatus: item.result?.task?.status ?? null, taskId: item.sampled?.task?.taskId ?? null })) },
        { assertionId: "V2.1-SNAPSHOT-FIXTURE-001", status: snapshot?.task?.status === "COMPLETED_FIXTURE" && snapshot.task.dataMode === "FIXTURE" ? "PASS" : "FAIL", expected: "COMPLETED_FIXTURE scoped to this TestRun", actual: snapshot?.task ?? intervalRuns.find((item) => item.intervalMinutes === 20)?.sampled },
        { assertionId: "V2.1-QUALITY-001", status: expectedQuality ? "PASS" : "FAIL", expected: scenarioId === "stale" ? "2 expected securities, zero fresh observations, zero coverage, and UNAVAILABLE" : "2/2 FRESH Fixture observations, 100% coverage, READY, and no anomalies", actual: quality },
        { assertionId: "V2.1-DAILY-BAR-001", status: daily?.task?.state === "COMPLETED" && daily.completion?.bars?.length === 2 ? "PASS" : "FAIL", expected: "2 completed DAILY_BAR Fixture bars", actual: daily },
        { assertionId: "V2.1-NEWS-FIXTURE-001", status: newsFixturePassed ? "PASS" : "FAIL", expected: "Fixture news-a notice-001 revisions 1→2 with supersession and linked entity; Fixture news-b copy revision 1 with unknown publication time and ambiguous entities", actual: { fixtureVersion: newsIngest?.fixtureVersion, revisedNotice, copiedNotice } },
        { assertionId: "V2.1-CONSUMER-GATES-001", status: strategyPolicy?.enabled === false && strategyPolicy?.activationGate === "OD007_APPROVAL" && strategyPolicy?.executor === "NOT_IMPLEMENTED" && orderPolicy?.enabled === false && orderPolicy?.activationGate === "C5_APPROVAL" && orderPolicy?.executor === "NOT_IMPLEMENTED" && samplingConfig.placeOrders === false ? "PASS" : "FAIL", expected: "strategy/order remain independently disabled behind OD-007/C5; placeOrders=false", actual: { strategyPolicy, orderPolicy, placeOrders: samplingConfig.placeOrders } },
      ];
      run.evidence = { ...run.evidence, fixtureVersions: { snapshot: snapshot?.task?.fixtureVersion ?? null, dailyBar: daily.completion?.fixtureVersion ?? null, news: newsIngest?.fixtureVersion ?? null }, businessIds: { watchlistVersion: watchlist.updatedAt ?? null, snapshotTaskId: snapshot?.task?.taskId ?? null, samplingTaskIds: intervalRuns.map((item) => item.sampled?.task?.taskId).filter(Boolean), quoteQualityEvaluationId: quality?.evaluationId ?? null, dailyBarTaskId: daily?.task?.taskId ?? null, dailyBarCompletionId: daily?.completion?.completionId ?? null }, quoteFreshCount: freshCount, samplingIntervalsTested: intervalRuns.map((item) => item.intervalMinutes), externalRequests: 0, authorizedRealSources: "NOT_RUN_IN_THIS_FIXTURE_SCENARIO" };
    } else if (scenarioId === "rejection" || scenarioId === "capacity") {
      const calendarGates = [];
      for (const [scheduledAt, expected] of [["2026-10-16T04:00:00.000Z", "CLOSED"], ["2026-10-17T01:30:00.000Z", "CLOSED"], ["2027-01-04T01:30:00.000Z", "UNKNOWN_CALENDAR"]]) {
        const result = await this.marketReadClient().evaluateV21SnapshotSamplingFixtureTick({ scheduledAt: scheduledAt!, scope, acceptanceIntervalMinutes: 30 }) as any;
        calendarGates.push({ scheduledAt, expected, decision: result.decision?.status, task: result.task });
      }
      const candidates = Array.from({ length: 101 }, (_, index) => `${String(600000 + index).padStart(6, "0")}.SH`);
      let status = 200; let errorCode: string | null = null;
      try { await this.marketReadClient().updateV21ScopedWatchlist({ ownerId, accountId, namespace, testRunId, holdings: candidates, inFlightOrders: [], candidates: [] }); }
      catch (error) { if (error instanceof MarketDataV21HttpError) { status = error.status; errorCode = (error.body as any)?.code ?? null; } else throw error; }
      const unchanged = await this.marketReadClient().getV21ScopedWatchlist({ ownerId, accountId, namespace, testRunId });
      run.assertions = [
        { assertionId: "V2.1-CALENDAR-REJECTION-001", status: calendarGates.every((item) => item.decision === item.expected && item.task === null) ? "PASS" : "FAIL", expected: "lunch, closed day and unknown calendar create no task", actual: calendarGates },
        { assertionId: "V2.1-WATCHLIST-REJECTION-001", status: status === 422 && errorCode === "REQUIRED_SECURITIES_EXCEED_LIMIT" ? "PASS" : "FAIL", expected: { status: 422, code: "REQUIRED_SECURITIES_EXCEED_LIMIT" }, actual: { status, errorCode } },
        { assertionId: "V2.1-WATCHLIST-ATOMICITY-001", status: unchanged.count === 0 && unchanged.updatedAt == null ? "PASS" : "FAIL", expected: "rejected candidates do not create or replace a watchlist", actual: unchanged },
      ];
      run.evidence = { ...run.evidence, rejectedRequiredSecurityCount: candidates.length, rejectionStatus: status, rejectionCode: errorCode };
    } else {
      await this.marketReadClient().updateV21ScopedWatchlist({ ownerId, accountId, namespace, testRunId, holdings: ["600000.SH"], inFlightOrders: [], candidates: ["000001.SZ"] });
      const first = await this.marketReadClient().completeV21DailyBarFixture(scope);
      const replay = await this.marketReadClient().completeV21DailyBarFixture(scope);
      const latest = await this.waitForDailyBar(scope, first.task.taskId);
      const replayAfterCompletion = await this.marketReadClient().completeV21DailyBarFixture(scope);
      run.assertions = [
        { assertionId: "V2.1-DAILY-BAR-IDEMPOTENCY-001", status: first.task.taskId === replay.task.taskId && replay.task.taskId === replayAfterCompletion.task.taskId ? "PASS" : "FAIL", expected: "same scoped Fixture task on duplicate submissions", actual: [first.task.taskId, replay.task.taskId, replayAfterCompletion.task.taskId] },
        { assertionId: "V2.1-DAILY-BAR-RECOVERY-001", status: latest.task.state === "COMPLETED" && latest.completion?.bars?.length === 2 ? "PASS" : "FAIL", expected: "same task completes and remains readable after retry", actual: latest },
      ];
      run.evidence = { ...run.evidence, businessIds: { dailyBarTaskId: latest.task.taskId, dailyBarCompletionId: latest.completion?.completionId ?? null }, fixtureVersions: { dailyBar: latest.completion?.fixtureVersion ?? null }, externalRequests: 0, authorizedRealSources: "NOT_RUN_IN_THIS_FIXTURE_SCENARIO" };
    }
    run.status = run.assertions.every((item: any) => item.status === "PASS") ? "COMPLETED" : "FAILED";
    run.evidence = { ...run.evidence, businessValidation: run.status === "COMPLETED" ? "PASS" : "FAIL" };
    await this.container.stageRuns.save({ testRunId, stageId: "V2.1", scenarioId, scenarioVersion: "1.2.0-fixture", ownerId, status: run.status, seed, assertions: run.assertions, evidence: run.evidence });
    return { accepted: true, testRunId, status: run.status };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      run.status = "FAILED";
      run.assertions = [...run.assertions, { assertionId: "V2.1-RUN-EXECUTION-001", status: "FAIL", expected: "scenario reaches a durable terminal result", actual: { error: message } }];
      run.evidence = { ...run.evidence, businessValidation: "FAIL", failure: { code: "V21_ACCEPTANCE_EXECUTION_FAILED", message, partialBusinessIds: run.evidence.businessIds ?? null } };
      await this.container.stageRuns.save({ testRunId, stageId: "V2.1", scenarioId, scenarioVersion: "1.2.0-fixture", ownerId, status: "FAILED", seed, assertions: run.assertions, evidence: run.evidence });
      return { accepted: true, testRunId, status: "FAILED" };
    }
  }
  @Get("runs/:testRunId") async getRun(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") id: string) { const run = await this.container.stageRuns.find(id, identity(cookie, testHeader)); if (!run || run.stageId !== "V2.1") throw new NotFoundException("V2.1 run was not found"); return run; }
  @Put("watchlist") @HttpCode(200) update(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: { securities?: string[] }) { identity(cookie, testHeader); return this.marketReadClient().updateV21Watchlist(body as import("../contracts/generated-types.js").MarketDataWatchlistUpdate).catch((error) => this.throwMarketDataError(error)); }
  @Put("watchlist/:accountId") @HttpCode(200) async updateScopedWatchlist(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("accountId") accountId: string, @Body() body: { namespace?: string; testRunId?: string; securities?: string[] }) {
    const ownerId = identity(cookie, testHeader);
    rejectUnexpectedFields(body, ["namespace", "testRunId", "securities"], "V2.1 watchlist update");
    if (!isUuid(accountId) || typeof body.namespace !== "string" || !body.namespace.trim() || body.namespace.length > 128 || !isUuid(body.testRunId ?? "") || !Array.isArray(body.securities) || body.securities.length > 5000 || body.securities.some((security) => typeof security !== "string" || !security.trim() || security.length > 64)) throw new UnprocessableEntityException("invalid account, TestRun, namespace, or candidate securities");

    let portfolio: AccountSnapshot;
    try { portfolio = await new GeneratedPortfolioAccountClient(this.container.portfolioApiUrl, "platform-api-service", this.container.portfolioToken).getAccountSnapshot(accountId, ownerId); }
    catch (error) {
      if (error instanceof PortfolioAccountClientError) throw new HttpException(error.body as string | Record<string, any>, error.status);
      throw new ServiceUnavailableException("Portfolio snapshot could not be read");
    }
    if (portfolio.ownerId !== ownerId || portfolio.accountId !== accountId || portfolio.namespace !== body.namespace || portfolio.testRunId !== body.testRunId) throw new ForbiddenException("Portfolio account does not match the requested owner/account/namespace/TestRun scope");
    if (portfolio.environmentMode !== "PAPER" || portfolio.brokerMode !== "FAKE") throw new ForbiddenException("online watchlists require a PAPER account using FakeBroker");

    const trade = new GeneratedPlatformV13ManualTradeClient(this.container.tradeExecutionUrl, this.container.portfolioToken);
    const orderFacts = await trade.readInFlightOrders(accountId, { namespace: body.namespace, ownerId, testRunId: body.testRunId });
    if (orderFacts.status !== 200 || !orderFacts.body || typeof orderFacts.body !== "object") throw new ServiceUnavailableException("Trade in-flight order facts could not be read");
    const facts = orderFacts.body as { accountId?: string; namespace?: string; ownerId?: string; testRunId?: string; orders?: Array<{ security?: string; status?: string }> };
    if (facts.accountId !== accountId || facts.namespace !== body.namespace || facts.ownerId !== ownerId || facts.testRunId !== body.testRunId || !Array.isArray(facts.orders) || facts.orders.some((order) => typeof order.security !== "string")) throw new ServiceUnavailableException("Trade returned in-flight order facts outside the requested scope");
    const candidates = body.securities;
    return this.marketReadClient().updateV21ScopedWatchlist({
      ownerId, accountId, namespace: body.namespace, testRunId: body.testRunId,
      holdings: (portfolio.positions ?? []).filter((position) => position.quantity > 0).map((position) => position.security),
      inFlightOrders: facts.orders.map((order) => order.security!), candidates,
    }).catch((error) => this.throwMarketDataError(error));
  }
}

@Controller("api/v1/acceptance/v2/v2.2")
export class V22AcceptanceController {
  private readonly marketUrl = process.env.STOCKQUANT_MARKET_DATA_URL ?? "http://127.0.0.1:3002";
  constructor(private readonly container: PlatformContainer) {}
  private minuteClient() { return new GeneratedMarketDataMinuteClient(this.marketUrl, () => this.container.marketDataHeaders()); }
  private async minuteCall<T>(run: () => Promise<T>): Promise<T> { try { return await run(); } catch (error) { if (error instanceof MarketDataMinuteHttpError) throw new HttpException(error.body as string | Record<string, any>, error.status); throw error; } }
  @Get("scenarios") scenarios(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return [{ scenarioId: "normal", title: "分钟文件导入", expected: "6 valid bars、2 securities、PUBLISHED" }, { scenarioId: "rejection", title: "坏行质量拒绝", expected: "OHLC_INVALID、DUPLICATE_CONFLICT、NON_TRADING_SESSION" }, { scenarioId: "recovery", title: "重复导入幂等", expected: "same SHA returns idempotent=true" }, { scenarioId: "uploaded-csv", title: "验证已发布分钟文件导入", expected: "TestRun记录已完成上传的格式、importId、DataVersion、SHA-256与行数" }]; }
  @Get("preview") preview(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) { identity(cookie, testHeader); return this.minuteClient().previewMarketDataMinuteFixture().catch((error) => { if (error instanceof MarketDataMinuteHttpError) throw new ServiceUnavailableException(`Market Data preview failed: ${error.status}`); throw error; }); }
  @Post("import") import(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: { fixture?: string }) { identity(cookie, testHeader); return this.minuteClient().importMarketDataMinuteFixture(body as import("../contracts/generated-types.js").MinuteFixtureImportRequest).catch((error) => { if (error instanceof MarketDataMinuteHttpError) throw new HttpException(error.body as string | Record<string, any>, error.status); throw error; }); }
  @Post("csv/preview") @HttpCode(200) csvPreview(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: MinuteCsvImportRequest) { identity(cookie, testHeader); return this.minuteCall(() => this.minuteClient().previewMarketDataMinuteCsv(body)); }
  @Post("csv/import") @HttpCode(200) csvImport(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: MinuteCsvImportRequest) { identity(cookie, testHeader); const client = new GeneratedMarketDataMinuteClient(this.marketUrl, () => this.container.marketDataHeaders()); return client.importMarketDataMinuteCsv(body).catch((error) => { if (error instanceof MarketDataMinuteHttpError) throw new UnprocessableEntityException(error.body); throw error; }); }
  @Post(":format/uploads") @HttpCode(200) async createCsvUpload(@Param("format") format: string, @Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: { uploadId?: string; expectedSha256?: string; expectedBytes?: number; metadata?: Record<string, unknown> }) { const ownerId = identity(cookie, testHeader); if (!["csv", "parquet"].includes(format)) throw new NotFoundException("minute file format is not supported"); if (body.uploadId !== undefined && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(body.uploadId)) throw new UnprocessableEntityException("uploadId must be a UUID"); const uploadId = body.uploadId ?? randomUUID(); const request = { ...body, uploadId } as import("../contracts/generated-types.js").MinuteCsvUploadCreateRequest; return this.minuteCall(() => this.minuteClient().createMarketDataMinuteUpload(format as "csv" | "parquet", request, ownerId)); }
  @Put(":format/uploads/:uploadId/chunks/:index") @HttpCode(200) async putCsvUploadChunk(@Param("format") format: string, @Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("uploadId") uploadId: string, @Param("index") index: string, @Body() body: { contentBase64?: string; sha256?: string }) { const ownerId = identity(cookie, testHeader); if (!["csv", "parquet"].includes(format)) throw new NotFoundException("minute file format is not supported"); return this.minuteCall(() => this.minuteClient().putMarketDataMinuteUploadChunk(format as "csv" | "parquet", uploadId, Number(index), body as import("../contracts/generated-types.js").MinuteCsvUploadChunkRequest, ownerId)); }
  @Get(":format/uploads/:uploadId") async csvUploadProgress(@Param("format") format: string, @Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("uploadId") uploadId: string) { const ownerId = identity(cookie, testHeader); if (!["csv", "parquet"].includes(format)) throw new NotFoundException("minute file format is not supported"); return this.minuteCall(() => this.minuteClient().getMarketDataMinuteUpload(format as "csv" | "parquet", uploadId, ownerId)); }
  @Post(":format/uploads/:uploadId/:action") @HttpCode(200) async csvUploadAction(@Param("format") format: string, @Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("uploadId") uploadId: string, @Param("action") action: string) { const ownerId = identity(cookie, testHeader); if (!["csv", "parquet"].includes(format)) throw new NotFoundException("minute file format is not supported"); if (!["preview", "finalize", "cancel"].includes(action)) throw new NotFoundException("minute upload action not found"); return this.minuteCall(() => this.minuteClient().actOnMarketDataMinuteUpload(format as "csv" | "parquet", uploadId, action as "preview" | "finalize" | "cancel", ownerId)); }
  @Get("imports/:version") importDetails(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("version") version: string) { identity(cookie, testHeader); return this.minuteCall(() => this.minuteClient().getMarketDataMinuteImport(version)); }
  @Get("imports/:version/bars") importBars(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("version") version: string, @Query("cursor") cursor = "0", @Query("pageSize") pageSize = "100", @Query("securityId") securityId?: string, @Query("fromBarStart") fromBarStart?: string, @Query("toBarStart") toBarStart?: string) { identity(cookie, testHeader); return this.minuteCall(() => this.minuteClient().pageMarketDataMinuteImportBars(version, { cursor, pageSize, ...(securityId ? { securityId } : {}), ...(fromBarStart ? { fromBarStart } : {}), ...(toBarStart ? { toBarStart } : {}) })); }
  @Post("imports/:version/coverage") @HttpCode(200) async importCoverage(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("version") version: string, @Body() body: { securityId?: string; fromDate?: string; toDate?: string; windowMinutes?: 1 | 5 }) {
    identity(cookie, testHeader);
    if (!body.securityId || body.securityId.length > 64 || !/^\d{4}-\d{2}-\d{2}$/u.test(body.fromDate ?? "") || !/^\d{4}-\d{2}-\d{2}$/u.test(body.toDate ?? "") || ![1, 5].includes(body.windowMinutes ?? 0)) throw new UnprocessableEntityException("securityId, valid date range and 1m/5m window are required");
    const validDate = (value: string) => { const timestamp = Date.parse(`${value}T00:00:00Z`); return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value; };
    if (!body.securityId.trim() || !validDate(body.fromDate!) || !validDate(body.toDate!)) throw new UnprocessableEntityException("coverage dates and securityId must be valid");
    const from = Date.parse(`${body.fromDate}T00:00:00Z`); const to = Date.parse(`${body.toDate}T00:00:00Z`);
    if (!Number.isFinite(from) || !Number.isFinite(to) || from > to || (to - from) / 86_400_000 > 30) throw new UnprocessableEntityException("coverage range must be valid and no longer than 31 calendar days");
    const imported = await this.minuteCall(() => this.minuteClient().getMarketDataMinuteImport(version));
    const importFrequency = imported.manifest?.semantics?.frequency;
    if (importFrequency !== `${body.windowMinutes}m`) throw new UnprocessableEntityException("coverage window must match the imported DataVersion frequency");
    const nextDate = new Date(to + 86_400_000).toISOString().slice(0, 10);
    const fromBarStart = `${body.fromDate}T00:00:00+08:00`; const toBarStart = `${nextDate}T00:00:00+08:00`;
    const bars: Array<{ securityId: string; barStart: string; barEnd: string; open: number; high: number; low: number; close: number; volume: number; amount: number | null }> = [];
    let cursor = "0";
    do {
      const page = await this.minuteCall(() => this.minuteClient().pageMarketDataMinuteImportBars(version, { cursor, pageSize: "1000", securityId: body.securityId, fromBarStart, toBarStart })) as { items?: typeof bars; nextCursor?: string | null };
      if (!Array.isArray(page.items)) throw new ServiceUnavailableException("Market Data returned an invalid minute bar page");
      bars.push(...page.items);
      if (bars.length > 5000) throw new UnprocessableEntityException("coverage query is limited to 5000 minute bars; narrow the date range");
      cursor = page.nextCursor ?? "";
    } while (cursor);
    return this.minuteCall(() => this.minuteClient().calculateMarketDataMinuteCoverage({ securityIds: [body.securityId!], fromDate: body.fromDate!, toDate: body.toDate!, windowMinutes: body.windowMinutes!, bars }));
  }
  @Post("imports/:version/daily-aggregate-check") @HttpCode(200) async checkDailyAggregate(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("version") version: string, @Body() body: { securityId?: string; tradingDate?: string; frequency?: "1m" | "5m"; reference?: { open?: number; high?: number; low?: number; close?: number; volume?: number; amount?: number }; referenceSource?: string; sourceReference?: string }) {
    identity(cookie, testHeader);
    const validDate = (value: string) => { const timestamp = Date.parse(`${value}T00:00:00Z`); return /^\d{4}-\d{2}-\d{2}$/u.test(value) && Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value; };
    if (!body.securityId?.trim() || body.securityId.length > 64 || !body.tradingDate || !validDate(body.tradingDate) || !["1m", "5m"].includes(body.frequency ?? "") || !body.reference || ![body.reference.open, body.reference.high, body.reference.low, body.reference.close, body.reference.volume, body.reference.amount].every((value) => typeof value === "number" && Number.isFinite(value) && value >= 0) || !body.referenceSource?.trim() || !body.sourceReference?.trim()) throw new UnprocessableEntityException("securityId, valid date, frequency, six non-negative daily values and reference provenance are required");
    return this.minuteCall(() => this.minuteClient().checkMarketDataMinuteDailyAggregate(version, { securityId: body.securityId!.trim(), tradingDate: body.tradingDate!, frequency: body.frequency!, reference: body.reference as { open: number; high: number; low: number; close: number; volume: number; amount: number }, referenceSource: body.referenceSource!.trim(), sourceReference: body.sourceReference!.trim() }));
  }
  @Post("runs") @HttpCode(202) async run(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: { scenarioId?: string; seed?: number; uploadId?: string; fileFormat?: "CSV" | "PARQUET"; candidateValidation?: { dataVersion: string; comparisonVersion: string; securityId: string; fromDate: string; toDate: string; windowMinutes: 1 | 5; reference: { open: number; high: number; low: number; close: number; volume: number; amount: number }; referenceSource: string; sourceReference: string } }) {
    const ownerId = identity(cookie, testHeader); const testRunId = this.container.stageRuns.newId(); const scenarioId = body.scenarioId ?? "normal";
    const run: any = { testRunId, stageId: "V2.2", scenarioId, status: "COMPLETED", seed: body.seed ?? 20260907, assertions: [] };
    let evidence: Record<string, unknown> = { environmentMode: "BACKTEST", dataMode: "FIXTURE", brokerMode: "FAKE" };
    if (scenarioId === "uploaded-csv") {
      const fileFormat = body.fileFormat ?? "CSV";
      if (fileFormat !== "CSV" && fileFormat !== "PARQUET") throw new UnprocessableEntityException("unsupported minute file format");
      if (!body.uploadId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(body.uploadId)) throw new UnprocessableEntityException("uploaded-csv scenario requires a valid uploadId");
      let progress: import("../contracts/generated-types.js").MinuteCsvUploadProgress;
      try { progress = await this.minuteClient().getMarketDataMinuteUpload(fileFormat.toLowerCase() as "csv" | "parquet", body.uploadId, ownerId); }
      catch (error) { if (error instanceof MarketDataMinuteHttpError) throw new NotFoundException("completed minute file upload was not found in the current user scope"); throw error; }
      const imported = progress.result;
      const importId = typeof imported?.importId === "string" ? imported.importId : null;
      const version = typeof imported?.version === "string" ? imported.version : null;
      const sha256 = typeof imported?.sha256 === "string" ? imported.sha256 : null;
      const accepted = typeof imported?.accepted === "number" ? imported.accepted : null;
      const manifest = imported?.manifest;
      const researchUseAllowed = manifest && typeof manifest === "object" && "researchUseAllowed" in manifest ? manifest.researchUseAllowed : false;
      const valid = progress.status === "COMPLETED" && imported?.status === "PUBLISHED" && importId !== null && version !== null && sha256 !== null && /^[0-9a-f]{64}$/iu.test(sha256) && accepted !== null && Number.isSafeInteger(accepted) && accepted > 0;
      run.assertions = [{ assertionId: "V2.2-CSV-UPLOAD-001", status: valid ? "PASS" : "FAIL", expected: "owner-scoped completed upload with PUBLISHED import, DataVersion, SHA-256 and positive accepted row count", actual: { uploadId: body.uploadId, fileFormat, status: progress.status, importId, version, sha256, accepted, researchUseAllowed } }];
      if (!valid) run.status = "FAILED";
      evidence = { environmentMode: "BACKTEST", dataMode: "RECORDED", brokerMode: "FAKE", upload: { uploadId: body.uploadId, fileFormat, importId, version, sha256, accepted, researchUseAllowed } };
      if (body.candidateValidation) {
        const input = body.candidateValidation;
        if (!version || input.dataVersion !== version || !input.comparisonVersion || !input.securityId?.trim() || !/^\d{4}-\d{2}-\d{2}$/u.test(input.fromDate) || !/^\d{4}-\d{2}-\d{2}$/u.test(input.toDate) || ![1, 5].includes(input.windowMinutes) || !input.referenceSource?.trim() || !input.sourceReference?.trim()) throw new UnprocessableEntityException("candidate validation must match the uploaded DataVersion and include bounded query, coverage, comparison and daily reference inputs");
        const fromBarStart = `${input.fromDate}T00:00:00+08:00`;
        const toBarStart = `${new Date(Date.parse(`${input.toDate}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10)}T00:00:00+08:00`;
        const page = await this.minuteCall(() => this.minuteClient().pageMarketDataMinuteImportBars(version, { pageSize: "1000", securityId: input.securityId.trim(), fromBarStart, toBarStart })) as { items?: Array<Record<string, unknown>>; nextCursor?: string | null };
        const coverage: any = await this.importCoverage(cookie, testHeader, version, { securityId: input.securityId, fromDate: input.fromDate, toDate: input.toDate, windowMinutes: input.windowMinutes });
        const aggregate: any = await this.checkDailyAggregate(cookie, testHeader, version, { securityId: input.securityId, tradingDate: input.fromDate, frequency: `${input.windowMinutes}m` as "1m" | "5m", reference: input.reference, referenceSource: input.referenceSource, sourceReference: input.sourceReference });
        const [leftImport, rightImport, leftBars, rightBars] = await Promise.all([
          this.minuteCall(() => this.minuteClient().getMarketDataMinuteImport(version)),
          this.minuteCall(() => this.minuteClient().getMarketDataMinuteImport(input.comparisonVersion)),
          this.minuteCall(() => this.minuteClient().pageMarketDataMinuteImportBars(version, { pageSize: "1000", securityId: input.securityId, fromBarStart, toBarStart })),
          this.minuteCall(() => this.minuteClient().pageMarketDataMinuteImportBars(input.comparisonVersion, { pageSize: "1000", securityId: input.securityId, fromBarStart, toBarStart })),
        ]) as [any, any, any, any];
        const semanticKeys = ["market", "frequency", "adjustment", "timezone", "volumeUnit", "amountUnit"];
        const compatible = semanticKeys.every((key) => typeof leftImport.manifest?.semantics?.[key] === "string" && leftImport.manifest.semantics[key] === rightImport.manifest?.semantics?.[key]);
        const barKey = (bar: Record<string, unknown>) => `${bar.securityId}|${bar.barStart}`;
        const leftMap = new Map<string, Record<string, unknown>>((leftBars.items ?? []).map((bar: Record<string, unknown>) => [barKey(bar), bar] as const));
        const rightMap = new Map<string, Record<string, unknown>>((rightBars.items ?? []).map((bar: Record<string, unknown>) => [barKey(bar), bar] as const));
        const comparisonKeys = new Set([...leftMap.keys(), ...rightMap.keys()]);
        const differences = [...comparisonKeys].filter((key) => {
          const a = leftMap.get(key); const b = rightMap.get(key);
          return !a || !b || ["open", "high", "low", "close", "volume", "amount"].some((field) => a[field] !== b[field]);
        }).length;
        const checks = [
          { assertionId: "V2.2-CANDIDATE-QUERY-001", status: (page.items?.length ?? 0) > 0 && !page.nextCursor ? "PASS" : "FAIL", expected: "bounded security/date query returns its full page", actual: { dataVersion: version, securityId: input.securityId, fromDate: input.fromDate, toDate: input.toDate, bars: page.items?.length ?? 0, hasNextPage: Boolean(page.nextCursor) } },
          { assertionId: "V2.2-CANDIDATE-COVERAGE-001", status: coverage && Number.isSafeInteger(coverage.expectedBars) && Number.isSafeInteger(coverage.validBars) && Number.isSafeInteger(coverage.unknownBars) ? "PASS" : "FAIL", expected: "coverage report classifies the requested security/date range", actual: coverage },
          { assertionId: "V2.2-CANDIDATE-COMPARE-001", status: compatible && comparisonKeys.size > 0 ? "PASS" : "FAIL", expected: "two semantically compatible DataVersions compared over the requested security/date range", actual: { leftVersion: version, rightVersion: input.comparisonVersion, compatible, comparedBars: comparisonKeys.size, differingKeys: differences } },
          { assertionId: "V2.2-CANDIDATE-AGGREGATE-001", status: aggregate?.status === "MATCH" ? "PASS" : "FAIL", expected: "RAW minute aggregate matches the explicitly supplied daily reference", actual: aggregate },
        ];
        run.assertions.push(...checks);
        if (checks.some((item) => item.status !== "PASS")) run.status = "FAILED";
        evidence = { ...evidence, candidateValidation: { dataVersion: version, importSha256: sha256, query: { items: page.items, nextCursor: page.nextCursor ?? null }, coverage, versionComparison: { leftVersion: version, rightVersion: input.comparisonVersion, compatible, comparedBars: comparisonKeys.size, differingKeys: differences }, dailyAggregate: aggregate } };
      }
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
  @Post("research/qlib-fixture/runs") @HttpCode(201) async qlibFixtureRun(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined) {
    const ownerId = identity(cookie, testHeader);
    const testRunId = this.container.stageRuns.newId();
    const seed = 20260907;
    const request = buildV23QlibFixtureRequest();
    const inputSha256 = v23QlibFixtureInputSha256(request);
    const evidence: Record<string, unknown> = { codeVersion: process.env.STOCKQUANT_CODE_VERSION ?? "UNSET", environmentMode: "BACKTEST", dataMode: "FIXTURE", brokerMode: "FAKE", qlibFixture: { inputSha256, rows: request.featureRows.length, splits: request.splits, sourceMode: "FIXTURE", modelValidation: "NOT_RUN", durableArtifactStatus: "NOT_IMPLEMENTED" } };
    const run = { testRunId, stageId: "V2.3", scenarioId: "qlib-fixture", scenarioVersion: "1.0.0", ownerId, status: "RUNNING", seed, assertions: [] as Array<Record<string, unknown>>, evidence };
    await this.container.stageRuns.save(run);
    try {
      const result = await this.quantQlibClient().fitQlibFixtureModel(request);
      const errors = assertV23QlibFixtureResult(result);
      if (errors.length === 0) {
        const model = Buffer.from(result.modelArtifactBase64, "base64");
        const modelSha256 = createHash("sha256").update(model).digest("hex");
        let canonicalPredictions: unknown;
        try { canonicalPredictions = JSON.parse(result.testPredictionsCanonicalJson); } catch { canonicalPredictions = null; }
        const predictionSha256 = createHash("sha256").update(result.testPredictionsCanonicalJson).digest("hex");
        if (model.toString("base64") !== result.modelArtifactBase64 || modelSha256 !== result.modelSha256 || result.testPredictions.length !== result.testPredictionCount || result.testPredictions.some((value) => !Number.isFinite(value)) || JSON.stringify(canonicalPredictions) !== JSON.stringify(result.testPredictions) || predictionSha256 !== result.testPredictionsSha256) errors.push("Qlib durable artifact payload failed its model/prediction hash, count, or finiteness checks");
      }
      const artifact = errors.length === 0 ? await this.container.qlibFixtureArtifacts.save({
        testRunId, ownerId, mediaType: "application/vnd.stockquant.qlib-fixture-model+json",
        payload: { schemaVersion: "v2.3-qlib-fixture-artifact-v1", modelBase64: result.modelArtifactBase64, predictions: result.testPredictions },
      }) : null;
      run.assertions = [{ assertionId: "V2.3-QLIB-FIXTURE-001", status: errors.length === 0 ? "PASS" : "FAIL", expected: "real locked Qlib fit/predict, 24 finite test predictions, temporal leakage guard PASS; independent validation NOT_RUN", actual: { errors, modelTraining: result.modelTraining, temporalValidation: result.temporalValidation, modelValidation: result.modelValidation, predictionCount: result.testPredictionCount, finite: result.testPredictionsFinite, modelSha256: result.modelSha256, testPredictionsSha256: result.testPredictionsSha256, qlibVersion: result.qlibVersion, lightgbmVersion: result.lightgbmVersion } }];
      run.status = errors.length === 0 ? "COMPLETED" : "FAILED";
      run.evidence = { ...evidence, qlibFixture: { ...evidence.qlibFixture as object, durableArtifactStatus: artifact ? "PERSISTED" : "FAILED" }, crossService: { research: { status: result.status, adapter: "qlib", dataMode: "FIXTURE", modelCalls: "NOT_RUN", inputSha256, modelTraining: result.modelTraining, modelValidation: result.modelValidation, temporalValidation: result.temporalValidation, candidateSourceExecution: result.candidateSourceExecution, testPredictionCount: result.testPredictionCount, testPredictionsFinite: result.testPredictionsFinite, modelSha256: result.modelSha256, testPredictionsSha256: result.testPredictionsSha256, qlibVersion: result.qlibVersion, lightgbmVersion: result.lightgbmVersion, profitabilityClaim: result.profitabilityClaim, durableArtifactStatus: artifact ? "PERSISTED" : "FAILED", ...(artifact ? { artifactRef: { artifactId: artifact.artifactId, sha256: artifact.sha256, mediaType: artifact.mediaType, url: `/api/v1/acceptance/v2/v2.3/runs/${testRunId}/artifacts/${artifact.artifactId}` } } : {}) } } };
    } catch (error) {
      const status = error instanceof QuantQlibHttpError ? error.status : 503;
      run.status = "FAILED";
      run.assertions = [{ assertionId: "V2.3-QLIB-FIXTURE-001", status: "FAIL", expected: "Qlib fixture fit completes with temporal validation", actual: { status, body: error instanceof QuantQlibHttpError ? error.body : "Quant Research Qlib endpoint unavailable" } }];
      run.evidence = { ...evidence, crossService: { research: { status: "FAILED", adapter: "qlib", dataMode: "FIXTURE", modelCalls: "NOT_RUN", inputSha256, errorStatus: status, durableArtifactStatus: "NOT_CREATED" } } };
    }
    await this.container.stageRuns.save(run);
    return { accepted: true, testRunId, status: run.status };
  }
  @Get("runs/:testRunId/artifacts/:artifactId") async qlibArtifact(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") testRunId: string, @Param("artifactId") artifactId: string) {
    const ownerId = identity(cookie, testHeader);
    const run = await this.container.stageRuns.find(testRunId, ownerId);
    if (!run || run.stageId !== "V2.3" || run.scenarioId !== "qlib-fixture") throw new NotFoundException("Qlib Fixture TestRun was not found in user scope");
    return this.container.qlibFixtureArtifacts.find(testRunId, artifactId, ownerId);
  }
  @Post("historical-context/versions") @HttpCode(201) async registerHistoricalContextVersion(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: { kind?: string; version?: string; content?: Record<string, unknown>; validFrom?: string; validTo?: string; sourceReference?: string }) {
    const ownerId = identity(cookie, testHeader);
    if (!body || !["SECURITY_UNIVERSE", "MARKET_RULE_SET", "CORPORATE_ACTIONS"].includes(body.kind ?? "") || typeof body.version !== "string" || !body.content || Array.isArray(body.content) || typeof body.validFrom !== "string" || typeof body.validTo !== "string" || typeof body.sourceReference !== "string") throw new UnprocessableEntityException("historical context version requires kind, version, content, validity range, and source reference");
    const client = this.minuteClient();
    try {
      const sha256 = createHash("sha256").update(canonicalCheckpointState(body.content)).digest("hex");
      return await client.registerMarketDataHistoricalContextVersion({ kind: body.kind as "SECURITY_UNIVERSE" | "MARKET_RULE_SET" | "CORPORATE_ACTIONS", version: body.version, content: body.content, sha256, validFrom: body.validFrom, validTo: body.validTo, sourceReference: body.sourceReference, attestedBy: ownerId });
    }
    catch (error) {
      if (error instanceof MarketDataMinuteHttpError) throw new HttpException(error.body as string | Record<string, any>, error.status);
      throw error;
    }
  }
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
  @Post("runs/from-minute-import") @HttpCode(202) async runImportedMinutes(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Body() body: { dataVersion?: string; seed?: number }) {
    const ownerId = identity(cookie, testHeader);
    if (typeof body?.dataVersion !== "string" || !/^v2\.2-import-[0-9a-f]{12}$/u.test(body.dataVersion)) throw new UnprocessableEntityException("dataVersion must identify a published V2.2 minute import");
    const client = new GeneratedMarketDataMinuteClient(this.container.marketDataUrl, () => this.container.marketDataHeaders());
    let readiness: any;
    try { readiness = await client.checkMarketDataMinuteImportReplayReadiness(body.dataVersion); }
    catch (error) {
      if (error instanceof MarketDataMinuteHttpError) {
        if (error.status === 404) throw new NotFoundException("minute import was not found");
        if (error.status === 409) throw new UnprocessableEntityException({ code: "HISTORICAL_CONTEXT_BLOCKED", dataVersion: body.dataVersion, readiness: error.body });
      }
      throw error;
    }
    if (readiness.status !== "READY") throw new UnprocessableEntityException({ code: "HISTORICAL_CONTEXT_BLOCKED", dataVersion: body.dataVersion, readiness });
    const imported = await client.getMarketDataMinuteImport(body.dataVersion);
    if (imported.status !== "PUBLISHED" || imported.manifest.researchUseAllowed !== true) throw new UnprocessableEntityException({ code: "MINUTE_IMPORT_NOT_AUTHORIZED_FOR_RESEARCH", dataVersion: body.dataVersion });
    const bars: import("../application/v23-replay.js").ReplayBar[] = [];
    const replaySampleLimit = 120;
    let cursor: string | undefined = "0";
    while (cursor !== undefined && bars.length < replaySampleLimit) {
      const page = await client.pageMarketDataMinuteImportBars(body.dataVersion, { cursor, pageSize: "1000" }) as { items?: Array<{ securityId: string; barStart: string; open: number; high: number; low: number; close: number; volume: number }>; nextCursor?: string | null };
      for (const bar of page.items ?? []) {
        if (bar.securityId === "600000.SH") bars.push({ security: bar.securityId, timestamp: bar.barStart, open: bar.open, high: bar.high, low: bar.low, close: bar.close, volume: bar.volume });
        if (bars.length >= replaySampleLimit) break;
      }
      cursor = page.nextCursor ?? undefined;
    }
    if (bars.length < 2) throw new UnprocessableEntityException({ code: "REPLAY_SECURITY_HAS_INSUFFICIENT_BARS", securityId: "600000.SH", dataVersion: body.dataVersion });
    bars.sort((left, right) => left.timestamp.localeCompare(right.timestamp));
    const testRunId = this.container.stageRuns.newId();
    const seed = body.seed ?? 20260907;
    const result = this.engine.run("normal", seed, bars, testRunId, { focusSecurity: "600000.SH", decisionTimestamp: bars[0]!.timestamp, multiWindow: true });
    const namespace = `v2-3-import-${testRunId}`;
    const replayBars = bars.map((bar) => ({ timestamp: bar.timestamp, open: bar.open.toFixed(4), volume: bar.volume }));
    const worker = await this.replayClient().startHistoricalMultiBarReplay({ testRunId, namespace, ownerId, scenarioId: "normal", seed, bars: replayBars });
    const workerData = worker as any;
    if (workerData.research) workerData.research.dataMode = "USER_ARCHIVE";
    const executions = Array.isArray(workerData.executions) ? workerData.executions : [];
    const barriers = Array.isArray(workerData.eventLog) ? workerData.eventLog : [];
    const consistent = executions.length === replayBars.length && barriers.length === replayBars.length && barriers.every((events: string[]) => events.at(-1) === "LEDGER_COMMITTED") && workerData.checkpoint?.cursor === replayBars.length && workerData.snapshot?.ledgerVersion === 1 + replayBars.length && workerData.ledgerVersion === workerData.snapshot?.ledgerVersion;
    result.assertions.push({ assertionId: "V2.3-IMPORTED-MINUTE-001", status: consistent ? "PASS" : "FAIL", expected: "authorized imported bars replay through FakeBroker with an ordered ledger barrier", actual: { dataVersion: body.dataVersion, bars: replayBars.length, worker: workerData } });
    result.status = result.assertions.every((assertion) => assertion.status === "PASS") ? "COMPLETED" : "FAILED";
    (result.evidence as any).dataMode = "USER_ARCHIVE";
    (result.evidence as any).dataVersion = body.dataVersion;
    (result.evidence as any).historicalContext = readiness;
    (result.evidence as any).replaySample = { securityId: "600000.SH", limit: replaySampleLimit, consumedBars: replayBars.length, windowStart: replayBars[0]?.timestamp, windowEnd: replayBars.at(-1)?.timestamp, bounded: true };
    (result.evidence as any).crossService = { ...workerData, namespace, worker: "historical-replay-worker" };
    await this.container.stageRuns.save({ ...result, ownerId });
    return { accepted: true, testRunId, status: result.status };
  }
  @Get("runs/:testRunId") async get(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") id: string) { const ownerId = identity(cookie, testHeader); const run = await this.container.stageRuns.find(id, ownerId); if (!run || run.stageId !== "V2.3") throw new NotFoundException("V2.3 run was not found"); const projected = projectV23QlibArtifactRef(run.testRunId, ownerId, run.evidence); const ref = projected[0]; const lifecycle = ref ? await this.container.qlibFixtureArtifacts.findLifecycle(run.testRunId, ref.artifactId, ownerId) : undefined; return { ...run, artifactRefs: projectV23QlibArtifactRef(run.testRunId, ownerId, run.evidence, lifecycle) }; }
  @Get("runs/:testRunId/worker") async workerStatus(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") id: string) { identity(cookie, testHeader); return this.workerRequest(id); }
  @Post("runs/:testRunId/worker/:action") async workerAction(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("testRunId") id: string, @Param("action") action: "pause" | "resume" | "cancel") { identity(cookie, testHeader); if (!["pause", "resume", "cancel"].includes(action)) throw new UnprocessableEntityException("unsupported replay worker action"); return this.workerRequest(id, action); }
  private replayClient() { return new GeneratedHistoricalReplayClient(this.container.replayWorkerUrl, this.container.portfolioToken); }
  private minuteClient() { return new GeneratedMarketDataMinuteClient(this.container.marketDataUrl, () => this.container.marketDataHeaders()); }
  private quantQlibClient() { return new GeneratedQuantQlibClient(process.env.STOCKQUANT_QUANT_RESEARCH_URL ?? "http://127.0.0.1:3003", () => this.container.quantResearchHeaders()); }
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
    const result = await probeServiceReadiness(`${this.container.researchAutomationUrl}/ready`);
    const service = result.status === "READY" ? result.body : { status: "UNAVAILABLE" };
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
        return { ...run, status, assertions, evidence, artifactRefs: projectV31ArtifactRefs(run.testRunId, ownerId, evidence) };
      }
    }
    return { ...run, artifactRefs: projectV31ArtifactRefs(run.testRunId, ownerId, run.evidence) };
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
  private quantPromotionClient() { return new GeneratedQuantPromotionClient(this.quantUrl, () => this.container.quantResearchHeaders()); }

  @Post("runs")
  @HttpCode(202)
  async createReadinessRun(
    @Headers("cookie") cookie: string | undefined,
    @Headers("x-stockquant-user") testHeader: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    const ownerId = identity(cookie, testHeader);
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => !["scenarioId", "seed", "sourceV31TestRunId"].includes(key))) throw new UnprocessableEntityException("only scenarioId, seed, and sourceV31TestRunId are accepted");
    const scenarioId = body.scenarioId;
    const seed = body.seed === undefined ? 20260907 : body.seed;
    if (!["normal", "rejection", "recovery"].includes(String(scenarioId))) throw new UnprocessableEntityException("scenarioId must be normal, rejection, or recovery");
    if (!Number.isSafeInteger(seed) || Number(seed) < 0 || Number(seed) > 2147483647) throw new UnprocessableEntityException("seed must be an integer from 0 through 2147483647");
    const sourceV31TestRunId = body.sourceV31TestRunId;
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
    if (sourceV31TestRunId !== undefined && (typeof sourceV31TestRunId !== "string" || !uuidPattern.test(sourceV31TestRunId))) throw new UnprocessableEntityException("sourceV31TestRunId must be a UUID");
    let sourceRun: Awaited<ReturnType<PlatformContainer["stageRuns"]["find"]>> = null;
    let sourceGate: Record<string, unknown> | null = null;
    if (sourceV31TestRunId) {
      sourceRun = await this.container.stageRuns.find(sourceV31TestRunId, ownerId);
      if (!sourceRun || sourceRun.stageId !== "V3.1" || sourceRun.scenarioId !== "normal") throw new NotFoundException("owned normal V3.1 source run was not found");
      sourceGate = await this.container.stageRuns.getV31PromotionGate(sourceV31TestRunId);
    }
    const acceptedSource = sourceGate?.stageStatus === "PASS" && sourceGate.humanAcceptance === "ACCEPTED";
    const blockers = [
      { id: "V3.1_ACCEPTANCE", status: acceptedSource ? "VERIFIED" : sourceV31TestRunId ? "NOT_VERIFIED" : "NOT_PROVIDED", reason: acceptedSource ? `exact owner-accepted source run ${sourceV31TestRunId}` : sourceV31TestRunId ? `source run ${sourceV31TestRunId} is not accepted` : "provide the exact owner-accepted V3.1 TestRun" },
      { id: "V3.2_CANDIDATE_REPORT", status: "NOT_PROVIDED", reason: "eligible persisted candidate execution and immutable independent report are not bound to this readiness run" },
      { id: "V3.2_BUSINESS_WORKFLOW", status: "NOT_IMPLEMENTED", reason: "candidate execution, independent recomputation, and recoverable V3.2 business orchestration are not implemented" },
      { id: "EXACT_VERSION_PAPER_CONSUMER", status: "NOT_IMPLEMENTED", reason: "downstream Paper consumption of the exact approved candidate fingerprint is not available" },
    ];
    const testRunId = this.container.stageRuns.newId();
    const run = await this.container.stageRuns.save({
      testRunId, stageId: "V3.2", scenarioId: String(scenarioId), scenarioVersion: "v3.2-readiness-v1", ownerId,
      namespace: `v3-2-${scenarioId}-${testRunId}`, status: "WAITING", seed: Number(seed), assertions: blockers.map((blocker) => ({ id: blocker.id, status: "NOT_RUN", reason: blocker.reason })),
      evidence: { readiness: "WAITING", sourceMode: "READINESS_ONLY", sourceV31TestRunId: sourceV31TestRunId ?? null, sourceV31Gate: sourceGate, blockers, candidateExecution: "NOT_PERFORMED", registryMutation: "NOT_PERFORMED", paperCalls: 0, businessValidation: "NOT_RUN", humanAcceptance: "NOT_RUN" },
    });
    return { accepted: true, testRunId: run.testRunId, stageId: run.stageId, scenarioId: run.scenarioId, scenarioVersion: run.scenarioVersion, status: run.status, seed: run.seed, assertions: run.assertions, evidence: run.evidence };
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
    if (!run || run.stageId !== "V3.2") throw new NotFoundException("V3.2 run was not found in user scope");
    const { testRunId: id, stageId, scenarioId, scenarioVersion, status, seed, assertions, evidence, createdAt, completedAt } = run;
    return { testRunId: id, stageId, scenarioId, scenarioVersion, status, seed, assertions, evidence, createdAt, completedAt };
  }

  @Post("candidate-mandate-binding")
  @HttpCode(200)
  async assessCandidateMandateBinding(
    @Headers("cookie") cookie: string | undefined,
    @Headers("x-stockquant-user") testHeader: string | undefined,
    @Body() body: V32CandidateMandateBindingCommand,
  ) {
    const ownerId = identity(cookie, testHeader);
    if (body.ownerId !== ownerId) throw new ForbiddenException("candidate Mandate binding owner must match the authenticated local session");
    if (typeof body.testRunId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.testRunId)) throw new UnprocessableEntityException("testRunId must be a UUID");
    const run = await this.container.stageRuns.find(body.testRunId, ownerId);
    if (!run || run.testRunId !== body.testRunId || run.stageId !== "V3.1" || run.scenarioId !== "normal") throw new NotFoundException("owned normal V3.1 source run was not found");
    const gate = await this.container.stageRuns.getV31PromotionGate(body.testRunId);
    if (gate?.stageStatus !== "PASS" || gate.humanAcceptance !== "ACCEPTED") throw new ConflictException("the exact source V3.1 TestRun must be accepted before candidate Mandate binding");
    let response;
    try { response = await new GeneratedCandidateMandateClient(this.governanceUrl, this.container.portfolioToken).assessApprovedCandidateMandateBinding(body); }
    catch { throw new ServiceUnavailableException("Governance candidate Mandate readiness service is unavailable"); }
    const result = response.body ?? { status: "INVALID_RESPONSE" };
    if (response.status === 403) throw new ForbiddenException("Platform identity is not authorized for Governance readiness lookup");
    if (response.status === 422) throw new UnprocessableEntityException(result);
    if (response.status === 503) throw new ServiceUnavailableException(result);
    if (response.status < 200 || response.status >= 300) throw new ServiceUnavailableException(`Governance readiness lookup failed: ${response.status}`);
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
    let detail: import("../contracts/generated-types.js").V32PromotionRequestDetail;
    try { detail = await this.quantPromotionClient().getPromotionRequestDetail(promotionRequestId); }
    catch (error) { if (error instanceof QuantPromotionHttpError && error.status === 404) throw new NotFoundException("PromotionRequest was not found"); throw new ServiceUnavailableException("Quant PromotionRequest service is unavailable"); }
    const testRunId = detail.request?.testRunId;
    if (typeof testRunId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(testRunId)) throw new ConflictException("PromotionRequest has no valid source TestRun");
    const run = await this.container.stageRuns.find(testRunId, ownerId);
    if (!run || run.stageId !== "V3.1" || run.scenarioId !== "normal") throw new NotFoundException("owned normal V3.1 source run was not found");
    const gate = await this.container.stageRuns.getV31PromotionGate(testRunId);
    if (gate?.stageStatus !== "PASS" || gate.humanAcceptance !== "ACCEPTED") throw new ConflictException("the exact source V3.1 TestRun must be accepted by its owner first");
    let persisted: import("../contracts/generated-types.js").V32IndependentValidationResult;
    try { persisted = await this.quantPromotionClient().getIndependentValidationReport(promotionRequestId); }
    catch (error) { if (error instanceof QuantPromotionHttpError && error.status === 404) throw new ConflictException("an immutable independent validation report is required before a decision"); throw new ServiceUnavailableException("Quant validation report service is unavailable"); }
    if (persisted.promotionRequestId !== promotionRequestId || persisted.report?.testRunId !== testRunId || typeof persisted.reportFingerprint !== "string" || !/^[a-f0-9]{64}$/u.test(persisted.reportFingerprint)) throw new ConflictException("validation report is not bound to the owned source TestRun");
    let result: import("../contracts/generated-types.js").V32PromotionDecisionResult;
    try { result = await this.quantPromotionClient().recordExactPromotionVersionDecision(promotionRequestId, { schemaVersion: "v3.2-promotion-decision-command-v1", decision: body.decision as "APPROVE" | "REJECT", confirmation: "REVIEW_EXACT_PROMOTION_VERSION", reportFingerprint: persisted.reportFingerprint, actorId: ownerId }); }
    catch (error) {
      if (error instanceof QuantPromotionHttpError) {
        const result = error.body && typeof error.body === "object" ? error.body as Record<string, unknown> : {};
        if (error.status === 403) throw new ForbiddenException("Platform identity is not authorized to record a promotion decision");
        if (error.status === 404) throw new NotFoundException("PromotionRequest or validation report was not found");
        if (error.status === 409) throw new ConflictException(typeof result.reason === "string" ? result.reason : "promotion decision conflicts with the persisted version");
        if (error.status === 422) throw new UnprocessableEntityException(typeof result.reason === "string" ? result.reason : "promotion decision is invalid");
      }
      throw new ServiceUnavailableException("Quant promotion decision service is unavailable");
    }
    return { schemaVersion: "v3.2-user-promotion-decision-result-v1", testRunId, decision: result };
  }

  @Get("promotions/:promotionRequestId")
  async promotion(@Headers("cookie") cookie: string | undefined, @Headers("x-stockquant-user") testHeader: string | undefined, @Param("promotionRequestId") id: string) {
    const ownerId = identity(cookie, testHeader);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw new UnprocessableEntityException("promotionRequestId must be a UUID");
    let request: import("../contracts/generated-types.js").V32PromotionRequestDetail;
    try { request = await this.quantPromotionClient().getPromotionRequestDetail(id); }
    catch (error) { if (error instanceof QuantPromotionHttpError && error.status === 404) throw new NotFoundException("V3.2 PromotionRequest was not found"); throw new ServiceUnavailableException("Quant PromotionRequest service is unavailable"); }
    const testRunId = request.request?.testRunId;
    if (typeof testRunId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(testRunId)) throw new ConflictException("PromotionRequest has no valid source TestRun");
    const ownedRun = await this.container.stageRuns.find(testRunId, ownerId);
    if (!ownedRun || ownedRun.stageId !== "V3.1" || ownedRun.scenarioId !== "normal") throw new NotFoundException("owned normal V3.1 source run was not found");
    let validationReport: import("../contracts/generated-types.js").V32IndependentValidationResult | null;
    try { validationReport = await this.quantPromotionClient().getIndependentValidationReport(id); }
    catch (error) { if (error instanceof QuantPromotionHttpError && error.status === 404) validationReport = null; else throw new ServiceUnavailableException("Quant validation report service is unavailable"); }
    const detail = request;
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
      let detail: import("../contracts/generated-types.js").V32PromotionRequestDetail | null = null;
      try { detail = await new GeneratedQuantPromotionClient(process.env.STOCKQUANT_QUANT_RESEARCH_URL ?? "http://127.0.0.1:3003", () => this.container.quantResearchHeaders()).getPromotionRequestDetail(promotionRequestId); }
      catch (error) { if (!(error instanceof QuantPromotionHttpError && error.status === 404)) throw new ServiceUnavailableException("Quant PromotionRequest service is unavailable"); }
      if (detail) {
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
    const scenarioBudgetCents = scenarioId === "rejection" ? 50 : 100;
    let budgetLimit: import("../contracts/generated-types.js").V33TestRunBudgetLimitResult;
    try {
      budgetLimit = await this.queueClient().configureV33TestRunBudgetLimit({
        schemaVersion: "v3.3-test-run-budget-limit-command-v1",
        testRunId,
        budgetCents: scenarioBudgetCents,
      });
    } catch (error) {
      throw new ServiceUnavailableException(`Research Automation TestRun budget binding failed${error instanceof ResearchQueueHttpError ? `: ${error.status}` : ""}`);
    }
    if (!budgetLimit || budgetLimit.schemaVersion !== "v3.3-test-run-budget-limit-v1"
      || budgetLimit.testRunId !== testRunId || budgetLimit.budgetCents !== scenarioBudgetCents
      || budgetLimit.status !== "CONFIGURED") {
      throw new ServiceUnavailableException("Research Automation TestRun budget binding response does not match the frozen scenario");
    }
    const paperContinuityPreflight = assessV33PaperContinuityPreflight({
      capturedAt: this.container.schedulerClock.now().toISOString(),
      scheduler: this.container.scheduler.status(),
      observation: await this.container.v24Observation.observationSummary(20),
    });
    const blockers = [
      { id: "V3.1_ACCEPTANCE", status: v31Accepted ? "VERIFIED" : sourceV31TestRunId ? "NOT_VERIFIED" : "NOT_PROVIDED", reason: v31Accepted ? `exact accepted source run ${sourceV31TestRunId}; evidence ${String(v31Gate?.evidenceSha256 ?? "")}` : sourceV31TestRunId ? `exact source run ${sourceV31TestRunId} is not accepted` : "supply the owner's exact accepted V3.1 source run" },
      { id: "V3.2_EXACT_VERSION", status: exactCandidateApproved ? "VERIFIED" : promotionRequestId ? "NOT_VERIFIED" : "NOT_PROVIDED", reason: exactCandidateApproved ? `exact approved PromotionRequest ${promotionRequestId}; version ${String(decision?.versionFingerprint ?? "")}` : promotionRequestId ? promotionDetail ? `PromotionRequest ${promotionRequestId} is not approved as an exact candidate version` : `PromotionRequest ${promotionRequestId} was not found` : "supply the exact owner-approved PromotionRequest ID" },
      { id: "PAPER_CONTINUITY", status: "NOT_VERIFIED", reason: paperContinuityPreflight.preflightStatus === "READY_FOR_CONCURRENT_TEST" ? "Paper scheduler and O2 observation prerequisites appear ready; concurrent research-load continuity remains untested" : `Paper continuity preflight is blocked: ${(paperContinuityPreflight.blockers as string[]).join(", ")}` },
      { id: "V3.3_EXECUTOR", status: "NOT_RUN", reason: "budget-controlled Fixture dispatch, result reconciliation, and scenario-specific independent assertion have not yet been verified for this TestRun" },
    ];
    const assertions = blockers.map((blocker) => ({ id: blocker.id, status: "NOT_RUN", reason: blocker.reason }));
    const run = await this.container.stageRuns.save({
      testRunId, stageId: "V3.3", scenarioId: String(scenarioId), scenarioVersion: "v3.3-readiness-v1", ownerId,
      status: "WAITING", seed: Number(seed), assertions,
      evidence: { readiness: "WAITING", workflowStep: "TEST_RUN_BUDGET_BOUND", testRunBudget: budgetLimit, sourceV31TestRunId: sourceV31TestRunId ?? null, v31Gate, promotionRequestId: promotionRequestId ?? null, promotionSummary: promotionDetail ? { status: promotionDetail.status, decision: decision?.decision ?? null, registryStatus: decision?.registryStatus ?? null, versionFingerprint: decision?.versionFingerprint ?? null } : null, blockers, runnerDispatch: "NOT_PERFORMED", runnerJobsCreated: 0, externalModelCalls: 0, paperContinuity: "NOT_CHECKED", paperContinuityPreflight },
    });
    return { accepted: true, testRunId: run.testRunId, stageId: run.stageId, scenarioId: run.scenarioId, status: run.status, seed: run.seed, assertions: run.assertions, evidence: run.evidence };
  }

  @Post("runs/:testRunId/experiment")
  async reserveScenarioExperiment(
    @Headers("cookie") cookie: string | undefined,
    @Headers("x-stockquant-user") testHeader: string | undefined,
    @Param("testRunId") testRunId: string,
    @Body() body: { schemaVersion?: unknown; confirmation?: unknown },
  ) {
    const ownerId = identity(cookie, testHeader);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(testRunId)) throw new UnprocessableEntityException("testRunId must be a UUID");
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => !["schemaVersion", "confirmation"].includes(key))
      || body.schemaVersion !== "v3.3-scenario-experiment-command-v1" || body.confirmation !== "CREATE_V33_FIXTURE_EXPERIMENT") throw new UnprocessableEntityException("versioned V3.3 Fixture Experiment confirmation is required");
    let run = await this.container.stageRuns.find(testRunId, ownerId);
    if (!run || run.stageId !== "V3.3") throw new NotFoundException("V3.3 run was not found in user scope");
    const evidence = run.evidence;
    const workflowStep = evidence.workflowStep;
    if (workflowStep === "EXPERIMENT_RESERVED" && run.status === "WAITING") return { schemaVersion: "v3.3-scenario-experiment-result-v1", testRunId, status: "WAITING", idempotent: true, experiment: evidence.experiment };
    if (!["normal", "recovery"].includes(run.scenarioId)) throw new ConflictException("this step currently reserves Experiments only for normal and recovery scenarios");
    if (run.status === "WAITING" && workflowStep === "TEST_RUN_BUDGET_BOUND") {
      run = await this.container.stageRuns.transitionV33Workflow({
        testRunId, ownerId, expectedStatus: "WAITING", status: "RUNNING",
        assertions: run.assertions,
        evidence: { ...evidence, workflowStep: "EXPERIMENT_RESERVATION_PENDING", experimentRequestIdempotencyKey: `v33-${run.scenarioId}-${testRunId}` },
      });
    } else if (run.status !== "RUNNING" || workflowStep !== "EXPERIMENT_RESERVATION_PENDING") {
      throw new ConflictException("V3.3 TestRun is not at the Experiment reservation step");
    }
    const experimentIdempotencyKey = `v33-${run.scenarioId}-${testRunId}`;
    let experiment: import("../contracts/generated-types.js").V31ExperimentResult;
    try {
      experiment = await this.queueClient().createV31Experiment({
        testRunId, fixtureId: "v3.3-research-orchestration-1", modelProfile: "FIXTURE",
        rounds: 2, budgetCurrency: "USD", budgetCents: 80, environmentMode: "RESEARCH", brokerMode: "FAKE",
        idempotencyKey: experimentIdempotencyKey,
      });
    } catch (error) {
      throw new ServiceUnavailableException(`Research Automation Experiment reservation failed${error instanceof ResearchQueueHttpError ? `: ${error.status}` : ""}`);
    }
    if (!experiment || experiment.testRunId !== testRunId || experiment.fixtureId !== "v3.3-research-orchestration-1"
      || experiment.modelProfile !== "FIXTURE" || experiment.rounds !== 2 || experiment.budgetCurrency !== "USD"
      || experiment.budgetCents !== 80 || experiment.brokerMode !== "FAKE" || experiment.status !== "PENDING_PREREQUISITES"
      || experiment.environmentMode !== "RESEARCH" || experiment.idempotencyKey !== experimentIdempotencyKey
      || !experiment.reason || !experiment.createdAt
      || !experiment.experimentId || experiment.budget?.experimentId !== experiment.experimentId
      || experiment.budget.requestedCents !== 80 || experiment.budget.status !== "RESERVED"
      || experiment.budget.reservedCents !== 80 || experiment.budget.spentCents !== 0) {
      throw new ServiceUnavailableException("Research Automation Experiment response does not match the frozen V3.3 Fixture request");
    }
    const stored = await this.container.stageRuns.transitionV33Workflow({
      testRunId, ownerId, expectedStatus: "RUNNING", status: "WAITING",
      assertions: run.assertions,
      evidence: { ...run.evidence, workflowStep: "EXPERIMENT_RESERVED", experimentId: experiment.experimentId, experiment },
    });
    return { schemaVersion: "v3.3-scenario-experiment-result-v1", testRunId, status: "WAITING", idempotent: false, experiment: stored.evidence.experiment };
  }

  @Post("runs/:testRunId/cancel")
  async cancelReadinessRun(
    @Headers("cookie") cookie: string | undefined,
    @Headers("x-stockquant-user") testHeader: string | undefined,
    @Param("testRunId") testRunId: string,
    @Body() body: { confirmation?: unknown },
  ) {
    const ownerId = identity(cookie, testHeader);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(testRunId)) throw new UnprocessableEntityException("testRunId must be a UUID");
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => key !== "confirmation")) throw new UnprocessableEntityException("only explicit readiness cancellation confirmation is accepted");
    const run = await this.container.stageRuns.find(testRunId, ownerId);
    if (!run || run.stageId !== "V3.3") throw new NotFoundException("V3.3 run was not found in user scope");
    const result = cancelV33ReadinessRun(run, body.confirmation, this.container.schedulerClock.now().toISOString());
    if ("error" in result) {
      if (result.error === "INVALID_CONFIRMATION") throw new UnprocessableEntityException(`confirmation must equal ${V33_READINESS_CANCEL_COMMAND}`);
      if (result.error === "NOT_V33_RUN") throw new NotFoundException("V3.3 run was not found in user scope");
      if (result.error === "EXECUTION_ALREADY_STARTED") throw new ConflictException("readiness-only cancellation is refused after Runner dispatch begins");
      throw new ConflictException("only a WAITING V3.3 readiness run can be cancelled");
    }
    const updated = result.idempotent ? run : await this.container.stageRuns.transitionV33Workflow({
      testRunId, ownerId, expectedStatus: "WAITING", status: "CANCELLED",
      assertions: result.assertions, evidence: result.evidence,
    });
    return { testRunId: updated.testRunId, stageId: updated.stageId, status: updated.status, idempotent: result.idempotent, evidence: updated.evidence };
  }

  @Post("runs/:testRunId/verify-rejection")
  async verifyBudgetRejection(
    @Headers("cookie") cookie: string | undefined,
    @Headers("x-stockquant-user") testHeader: string | undefined,
    @Param("testRunId") testRunId: string,
    @Body() body: { schemaVersion?: unknown; confirmation?: unknown },
  ) {
    const ownerId = identity(cookie, testHeader);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(testRunId)) throw new UnprocessableEntityException("testRunId must be a UUID");
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => !["schemaVersion", "confirmation"].includes(key))
      || body.schemaVersion !== "v3.3-rejection-verify-command-v1" || body.confirmation !== "VERIFY_V33_BUDGET_REJECTION") throw new UnprocessableEntityException("versioned V3.3 budget rejection confirmation is required");
    let run = await this.container.stageRuns.find(testRunId, ownerId);
    if (!run || run.stageId !== "V3.3") throw new NotFoundException("V3.3 run was not found in user scope");
    const key = `v33-rejection-budget-${testRunId}`;
    if (run.scenarioId !== "rejection") throw new ConflictException("only a rejection scenario can run the budget rejection assertion");
    if (run.evidence.workflowStep === "REJECTION_ASSERTION_VERIFIED") return { schemaVersion: "v3.3-rejection-verify-result-v1", testRunId, status: run.status, idempotent: true, assertion: run.assertions.find((item: any) => item.id === "V3.3_REJECTION_NO_SIDE_EFFECTS") ?? null, evidence: run.evidence.rejectionAssertion };
    if (run.status === "WAITING" && run.evidence.workflowStep === "TEST_RUN_BUDGET_BOUND") {
      const budget = run.evidence.testRunBudget as Record<string, unknown> | undefined;
      if (budget?.budgetCents !== 50 || budget.testRunId !== testRunId || budget.status !== "CONFIGURED") throw new ConflictException("rejection TestRun must have the frozen 50-cent cap bound");
      run = await this.container.stageRuns.transitionV33Workflow({
        testRunId, ownerId, expectedStatus: "WAITING", status: "RUNNING", assertions: run.assertions,
        evidence: { ...run.evidence, workflowStep: "REJECTION_ASSERTION_PENDING", rejectionRequestIdempotencyKey: key },
      });
    } else if (run.status !== "RUNNING" || run.evidence.workflowStep !== "REJECTION_ASSERTION_PENDING" || run.evidence.rejectionRequestIdempotencyKey !== key) {
      throw new ConflictException("V3.3 rejection TestRun is not at the budget rejection assertion step");
    }
    let rejection: Record<string, unknown>;
    try {
      await this.queueClient().createV31Experiment({ testRunId, fixtureId: "v3.3-research-orchestration-1", modelProfile: "FIXTURE", rounds: 2, budgetCurrency: "USD", budgetCents: 80, environmentMode: "RESEARCH", brokerMode: "FAKE", idempotencyKey: key });
      rejection = { status: "UNEXPECTEDLY_ACCEPTED", expectedHttpStatus: 422 };
    } catch (error) {
      if (error instanceof ResearchQueueHttpError && error.status === 422 && error.message.includes("TestRun budget exhausted")) rejection = { status: "REJECTED_AS_EXPECTED", httpStatus: 422, reason: "TestRun budget exhausted" };
      else throw new ServiceUnavailableException(`Research Automation budget rejection request failed${error instanceof ResearchQueueHttpError ? `: ${error.status}` : ""}`);
    }
    let budgetSummary: Record<string, any>;
    let queue: import("../contracts/generated-types.js").V33RunnerQueue;
    try {
      const [summaryResponse, queueResponse] = await Promise.all([
        this.queueClient().readCompleteTestRunBudgetSummary(testRunId, 0, 100),
        this.queueClient().listRunnerJobsForTestRun(testRunId, 0, 100),
      ]);
      budgetSummary = summaryResponse as Record<string, any>;
      queue = queueResponse;
    } catch (error) { throw new ServiceUnavailableException(`Research Automation rejection side-effect verification failed${error instanceof ResearchQueueHttpError ? `: ${error.status}` : ""}`); }
    const emptyLedger = budgetSummary.schemaVersion === "v3.3-test-run-budget-summary-v1" && budgetSummary.testRunId === testRunId && budgetSummary.offset === 0
      && budgetSummary.afterCursor === null && !budgetSummary.hasMore && Array.isArray(budgetSummary.rows) && budgetSummary.rows.length === 0
      && budgetSummary.totals?.experiments === 0 && budgetSummary.totals.requestedCents === 0 && budgetSummary.totals.reservedCents === 0
      && budgetSummary.totals.settledCents === 0 && budgetSummary.totals.unknownReservedCents === 0 && budgetSummary.totals.modelCallCount === 0
      && budgetSummary.stageBudgetControl === "TEST_RUN_AND_ROUND_CAP_ENFORCED";
    const emptyQueue = queue.schemaVersion === "v3.3-runner-queue-v1" && queue.testRunId === testRunId && queue.offset === 0 && !queue.hasMore && Array.isArray(queue.jobs) && queue.jobs.length === 0;
    const passed = rejection.status === "REJECTED_AS_EXPECTED" && emptyLedger && emptyQueue;
    const assertion = { id: "V3.3_REJECTION_NO_SIDE_EFFECTS", status: passed ? "PASS" : "FAIL", reason: passed ? "80-cent two-round Fixture Experiment was rejected by the 50-cent TestRun cap before any Experiment, model call, or Runner Job was created" : "budget rejection or zero-side-effect assertions did not match" };
    const executorAssertion = { id: "V3.3_EXECUTOR", status: passed ? "PASS" : "FAIL", reason: passed ? "same-TestRun budget cap rejected the oversized Experiment and independent reads proved zero allocation, model-call, or Runner-job side effects" : "budget rejection or zero-side-effect executor assertions did not match" };
    const assertions = [...run.assertions.filter((item: any) => item.id !== assertion.id && item.id !== executorAssertion.id), executorAssertion, assertion];
    const rejectionAssertion = { idempotencyKey: key, attemptedExperiment: { fixtureId: "v3.3-research-orchestration-1", modelProfile: "FIXTURE", rounds: 2, budgetCents: 80, environmentMode: "RESEARCH", brokerMode: "FAKE" }, rejection, budgetSummary, runnerQueue: queue, noExperiment: emptyLedger, noModelCalls: budgetSummary.totals?.modelCallCount === 0, noRunnerJobs: emptyQueue, result: passed ? "PASS" : "FAIL" };
    const updated = await this.container.stageRuns.transitionV33Workflow({ testRunId, ownerId, expectedStatus: "RUNNING", status: "RUNNING", assertions, evidence: { ...run.evidence, workflowStep: "REJECTION_ASSERTION_VERIFIED", businessWorkflow: "REJECTION_ASSERTION_VERIFIED", businessValidation: passed ? "PASS" : "FAIL", rejectionAssertion, externalModelCalls: 0, runnerJobsCreated: Array.isArray(queue.jobs) ? queue.jobs.length : null, humanAcceptance: "NOT_RUN" } });
    return { schemaVersion: "v3.3-rejection-verify-result-v1", testRunId, status: updated.status, idempotent: false, assertion, evidence: rejectionAssertion };
  }

  @Post("runs/:testRunId/verify-recovery")
  async verifyCheckpointRecovery(
    @Headers("cookie") cookie: string | undefined,
    @Headers("x-stockquant-user") testHeader: string | undefined,
    @Param("testRunId") testRunId: string,
    @Body() body: { schemaVersion?: unknown; confirmation?: unknown },
  ) {
    const ownerId = identity(cookie, testHeader);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(testRunId)) throw new UnprocessableEntityException("testRunId must be a UUID");
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => !["schemaVersion", "confirmation"].includes(key))
      || body.schemaVersion !== "v3.3-recovery-verify-command-v1" || body.confirmation !== "VERIFY_V33_CHECKPOINT_RECOVERY") throw new UnprocessableEntityException("versioned V3.3 checkpoint recovery confirmation is required");
    const run = await this.container.stageRuns.find(testRunId, ownerId);
    if (!run || run.stageId !== "V3.3") throw new NotFoundException("V3.3 run was not found in user scope");
    if (run.scenarioId !== "recovery") throw new ConflictException("only a recovery scenario can run the checkpoint recovery assertion");
    const assertionId = "V3.3_CHECKPOINT_RECOVERY_001";
    const existing = run.assertions.find((item: any) => item.id === assertionId);
    if (run.evidence.workflowStep === "RECOVERY_ASSERTION_VERIFIED" && existing) return { schemaVersion: "v3.3-recovery-verify-result-v1", testRunId, status: run.status, idempotent: true, assertion: existing, evidence: run.evidence.recoveryAssertion ?? null };
    if (run.status !== "RUNNING" || run.evidence.workflowStep !== "EXPERIMENT_SETTLED_AND_RESULTS_RECONCILED") throw new ConflictException("recovery TestRun must finish reconciliation and ledger settlement first");
    const experiment = run.evidence.experiment as import("../contracts/generated-types.js").V31ExperimentResult | undefined;
    const rounds = Array.isArray(run.evidence.dispatchedRounds) ? run.evidence.dispatchedRounds as Record<string, unknown>[] : [];
    const firstRound = rounds.find((row) => row.roundIndex === 1);
    if (!experiment?.experimentId || experiment.testRunId !== testRunId || !firstRound?.jobId) throw new ConflictException("recovery TestRun lacks its exact round-1 Runner Job binding");
    let checkpointHistory: import("../contracts/generated-types.js").V33RunnerCheckpointHistory;
    try { checkpointHistory = await this.queueClient().listV33RunnerCheckpoints(testRunId, experiment.experimentId, 1); }
    catch (error) { throw new ServiceUnavailableException(`Research Automation checkpoint history is unavailable${error instanceof ResearchQueueHttpError ? `: ${error.status}` : ""}`); }
    const completed = Array.isArray(run.evidence.completedRounds) ? run.evidence.completedRounds as Record<string, any>[] : [];
    const completedRound = completed.find((row) => row.roundIndex === 1);
    const metrics = completedRound?.artifacts?.length === 1 ? completedRound.artifacts[0]?.metrics as Record<string, any> | undefined : undefined;
    const checkpoints = checkpointHistory.checkpoints;
    const historyValid = checkpointHistory.schemaVersion === "v3.3-runner-checkpoint-history-v1" && checkpointHistory.testRunId === testRunId
      && checkpointHistory.experimentId === experiment.experimentId && checkpointHistory.roundIndex === 1 && checkpoints.length === 2
      && checkpoints.every((checkpoint, index) => checkpoint.schemaVersion === "v3.3-research-checkpoint-v1" && checkpoint.testRunId === testRunId
        && checkpoint.experimentId === experiment.experimentId && checkpoint.roundIndex === 1 && checkpoint.sequence === index + 1
        && checkpoint.state.cursor === index + 1 && /^[a-f0-9]{64}$/u.test(checkpoint.stateSha256)
        && createHash("sha256").update(canonicalCheckpointState(checkpoint.state)).digest("hex") === checkpoint.stateSha256);
    const resumeValid = metrics?.fixtureId === "v3.1-research-small-sample-1" && metrics?.bars === 6 && metrics?.qlibVersion === "0.9.6.99"
      && metrics?.recovery?.resumedFromSequence === 1 && metrics?.recovery?.checkpointSequence === 2 && metrics?.recovery?.cursor === 2
      && checkpoints.length === 2 && metrics?.recovery?.checkpointSequence === checkpoints[1]?.sequence;
    const passed = historyValid && resumeValid;
    const assertion = { id: assertionId, status: passed ? "PASS" : "FAIL", reason: passed ? "same TestRun round 1 durably committed checkpoint sequence 1 then 2 and the published deterministic output reports resuming from sequence 1" : "checkpoint history or resumed output does not prove the frozen two-checkpoint recovery invariant" };
    const recoveryAssertion = { testRunId, experimentId: experiment.experimentId, roundIndex: 1, checkpointHistory, resumedOutput: metrics ?? null, durableSequence: checkpoints.map((checkpoint) => ({ sequence: checkpoint.sequence, state: checkpoint.state, stateSha256: checkpoint.stateSha256, createdAt: checkpoint.createdAt })), result: passed ? "PASS" : "FAIL" };
    const executorAssertion = { id: "V3.3_EXECUTOR", status: passed ? "PASS" : "FAIL", reason: passed ? "same-TestRun two-round execution settled against the verified ledger and persisted checkpoint history proves deterministic recovery" : "same-TestRun checkpoint recovery or completed output evidence did not satisfy the frozen invariant" };
    const assertions = [...run.assertions.filter((item: any) => item.id !== assertionId && item.id !== executorAssertion.id), executorAssertion, assertion];
    const updated = await this.container.stageRuns.transitionV33Workflow({ testRunId, ownerId, expectedStatus: "RUNNING", status: "RUNNING", assertions, evidence: { ...run.evidence, workflowStep: "RECOVERY_ASSERTION_VERIFIED", businessWorkflow: "RECOVERY_ASSERTION_VERIFIED", businessValidation: passed ? "PASS" : "FAIL", recoveryAssertion, humanAcceptance: "NOT_RUN" } });
    return { schemaVersion: "v3.3-recovery-verify-result-v1", testRunId, status: updated.status, idempotent: false, assertion, evidence: recoveryAssertion };
  }

  @Post("runs/:testRunId/verify-normal")
  async verifyNormalScenario(
    @Headers("cookie") cookie: string | undefined,
    @Headers("x-stockquant-user") testHeader: string | undefined,
    @Param("testRunId") testRunId: string,
    @Body() body: { schemaVersion?: unknown; confirmation?: unknown },
  ) {
    const ownerId = identity(cookie, testHeader);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(testRunId)) throw new UnprocessableEntityException("testRunId must be a UUID");
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => !["schemaVersion", "confirmation"].includes(key))
      || body.schemaVersion !== "v3.3-normal-verify-command-v1" || body.confirmation !== "VERIFY_V33_NORMAL_RESULTS") throw new UnprocessableEntityException("versioned V3.3 normal scenario confirmation is required");
    const run = await this.container.stageRuns.find(testRunId, ownerId);
    if (!run || run.stageId !== "V3.3") throw new NotFoundException("V3.3 run was not found in user scope");
    if (run.scenarioId !== "normal") throw new ConflictException("only a normal scenario can run the normal results assertion");
    const assertionId = "V3.3_NORMAL_RESULTS_001";
    const existing = run.assertions.find((item: any) => item.id === assertionId);
    if (run.evidence.workflowStep === "NORMAL_ASSERTION_VERIFIED" && existing) return { schemaVersion: "v3.3-normal-verify-result-v1", testRunId, status: run.status, idempotent: true, assertion: existing, evidence: run.evidence.normalAssertion ?? null };
    if (run.status !== "RUNNING" || run.evidence.workflowStep !== "EXPERIMENT_SETTLED_AND_RESULTS_RECONCILED") throw new ConflictException("normal TestRun must finish reconciliation and ledger settlement first");
    const experiment = run.evidence.experiment as import("../contracts/generated-types.js").V31ExperimentResult | undefined;
    if (!experiment?.experimentId || experiment.testRunId !== testRunId) throw new ConflictException("normal TestRun lacks its exact Experiment binding");
    const rounds = Array.isArray(run.evidence.completedRounds) ? run.evidence.completedRounds as Record<string, any>[] : [];
    const jobs = await this.queueClient().listRunnerJobsForTestRun(testRunId, 0, 100).catch((error: unknown) => { throw new ServiceUnavailableException(`Research Automation Runner queue read failed${error instanceof ResearchQueueHttpError ? `: ${error.status}` : ""}`); });
    const summary = await this.queueClient().readCompleteTestRunBudgetSummary(testRunId, 0, 100).catch((error: unknown) => { throw new ServiceUnavailableException(`Research Automation budget summary read failed${error instanceof ResearchQueueHttpError ? `: ${error.status}` : ""}`); });
    const expectedJobs = Array.isArray(run.evidence.runnerJobIds) ? run.evidence.runnerJobIds : [];
    let outputsValid = jobs.schemaVersion === "v3.3-runner-queue-v1" && jobs.testRunId === testRunId && !jobs.hasMore && jobs.jobs.length === 2 && expectedJobs.length === 2 && rounds.length === 2;
    const verifiedOutputs: Record<string, unknown>[] = [];
    for (const row of rounds) {
      const job = jobs.jobs.find((candidate) => candidate.jobId === row.jobId);
      if (!job || !expectedJobs.includes(job.jobId) || job.job.testRunId !== testRunId || job.job.experimentId !== experiment.experimentId || job.job.roundIndex !== row.roundIndex || job.status !== "COMPLETED" || job.execution?.status !== "COMPLETED" || job.execution.exitCode !== 0 || job.artifacts.length !== 1) { outputsValid = false; continue; }
      const ref = job.artifacts[0];
      const stored = row.artifacts?.length === 1 ? row.artifacts[0] : null;
      let artifact: import("../contracts/generated-types.js").V31RunnerInputResponse;
      try {
        artifact = await this.queueClient().readV31Artifact({ namespace: ref.namespace, artifactId: ref.artifactId });
      } catch (error) {
        throw new ServiceUnavailableException(`Research Automation output Artifact is unavailable${error instanceof ResearchQueueHttpError ? `: ${error.status}` : ""}`);
      }
      let metrics: Record<string, unknown> | null = null;
      try {
        const bytes = Buffer.from(artifact.contentBase64, "base64");
        metrics = JSON.parse(bytes.toString("utf8")) as Record<string, unknown>;
        const hash = createHash("sha256").update(bytes).digest("hex");
        const valid = ref.kind === "OUTPUT" && ref.status === "PUBLISHED" && ref.namespace === row.artifacts?.[0]?.namespace && stored?.artifactId === ref.artifactId && stored.sha256 === ref.sha256 && artifact.ref.artifactId === ref.artifactId && artifact.ref.namespace === ref.namespace && artifact.ref.sha256 === ref.sha256 && artifact.ref.status === "PUBLISHED" && hash === ref.sha256 && bytes.toString("base64") === artifact.contentBase64 && metrics.fixtureId === "v3.1-research-small-sample-1" && metrics.bars === 6 && metrics.qlibVersion === "0.9.6.99" && metrics.return === 0.12;
        outputsValid = outputsValid && valid;
        verifiedOutputs.push({ roundIndex: row.roundIndex, jobId: job.jobId, artifactId: ref.artifactId, sha256: hash, byteLength: bytes.byteLength, metrics, valid });
      } catch { outputsValid = false; }
    }
    const budget = summary as Record<string, any>;
    const ledger = budget.schemaVersion === "v3.3-test-run-budget-summary-v1" && budget.testRunId === testRunId && budget.offset === 0 && budget.afterCursor === null && budget.hasMore === false && budget.accountingScope === "unique experiments bound to this TestRun; model-call attempts are counted once; no provider invoice reconciliation" && budget.stageBudgetControl === "TEST_RUN_AND_ROUND_CAP_ENFORCED" && budget.totals?.experiments === 1 && budget.totals?.requestedCents === 80 && budget.totals?.reservedCents === 0 && budget.totals?.settledCents === 46 && budget.totals?.unknownReservedCents === 0 && budget.totals?.modelCallCount === 2 && budget.rows?.length === 1 && budget.rows[0].experimentId === experiment.experimentId && budget.rows[0].rounds === 2 && budget.rows[0].requestedCents === 80 && budget.rows[0].reservedCents === 0 && budget.rows[0].settledCents === 46 && budget.rows[0].unknownReservedCents === 0 && budget.rows[0].modelCallCount === 2 && budget.rows[0].status === "SETTLED" && budget.rows[0].roundBudget?.length === 2 && budget.rows[0].roundBudget.every((item: any, index: number) => item.roundIndex === index + 1 && item.allocatedCents === 40 && item.usedCents === 23 && item.unknownReservedCents === 0);
    const passed = outputsValid && ledger;
    const assertion = { id: assertionId, status: passed ? "PASS" : "FAIL", reason: passed ? "both same-TestRun Runner outputs independently match the frozen Fixture and the persisted two-round ledger is settled exactly" : "same-TestRun output artifact or settled budget ledger did not match the frozen normal scenario" };
    const normalAssertion = { testRunId, experimentId: experiment.experimentId, outputs: verifiedOutputs, budgetSummary: summary, result: passed ? "PASS" : "FAIL" };
    const executorAssertion = { id: "V3.3_EXECUTOR", status: passed ? "PASS" : "FAIL", reason: passed ? "same-TestRun two-round execution, immutable output Artifacts, and the authoritative settled budget ledger passed independent verification" : "same-TestRun output Artifact or settled budget ledger did not satisfy the frozen normal-scenario invariant" };
    const assertions = [...run.assertions.filter((item: any) => item.id !== assertionId && item.id !== executorAssertion.id), executorAssertion, assertion];
    const updated = await this.container.stageRuns.transitionV33Workflow({ testRunId, ownerId, expectedStatus: "RUNNING", status: "RUNNING", assertions, evidence: { ...run.evidence, workflowStep: "NORMAL_ASSERTION_VERIFIED", businessWorkflow: "NORMAL_ASSERTION_VERIFIED", businessValidation: passed ? "PASS" : "FAIL", normalAssertion, humanAcceptance: "NOT_RUN" } });
    return { schemaVersion: "v3.3-normal-verify-result-v1", testRunId, status: updated.status, idempotent: false, assertion, evidence: normalAssertion };
  }

  @Get("runs/:testRunId/artifacts/:artifactId")
  async readV33RunArtifact(
    @Headers("cookie") cookie: string | undefined,
    @Headers("x-stockquant-user") testHeader: string | undefined,
    @Param("testRunId") testRunId: string,
    @Param("artifactId") artifactId: string,
  ) {
    const ownerId = identity(cookie, testHeader);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(testRunId)) throw new UnprocessableEntityException("testRunId must be a UUID");
    const run = await this.container.stageRuns.find(testRunId, ownerId);
    if (!run || run.stageId !== "V3.3") throw new NotFoundException("V3.3 run was not found in user scope");
    const completed = Array.isArray(run.evidence.completedRounds) ? run.evidence.completedRounds as Record<string, any>[] : [];
    const matches = completed.flatMap((round) => Array.isArray(round.artifacts) ? round.artifacts.map((artifact: any) => ({ round, artifact })) : [])
      .filter(({ artifact }) => artifact.artifactId === artifactId && artifact.kind === "OUTPUT" && artifact.status === "PUBLISHED");
    if (matches.length !== 1) throw new NotFoundException("published Artifact is not associated with this V3.3 TestRun");
    const { round, artifact: evidenceRef } = matches[0]!;
    if (![1, 2].includes(Number(round.roundIndex)) || typeof evidenceRef.artifactId !== "string" || evidenceRef.artifactId.length < 1 || evidenceRef.artifactId.length > 256 || !/^[a-f0-9]{64}$/u.test(String(evidenceRef.sha256))
      || evidenceRef.namespace !== `research/${testRunId}/${(run.evidence.experiment as any)?.experimentId}/outputs`) throw new NotFoundException("Artifact reference is invalid for this V3.3 TestRun");
    try {
      const artifact = await this.queueClient().readV31Artifact({ namespace: evidenceRef.namespace, artifactId: evidenceRef.artifactId });
      const bytes = Buffer.from(artifact.contentBase64, "base64");
      if (bytes.toString("base64") !== artifact.contentBase64 || artifact.ref.artifactId !== evidenceRef.artifactId || artifact.ref.namespace !== evidenceRef.namespace
        || artifact.ref.sha256 !== evidenceRef.sha256 || artifact.ref.status !== "PUBLISHED" || createHash("sha256").update(bytes).digest("hex") !== evidenceRef.sha256) throw new ConflictException("Research Artifact bytes do not match the persisted V3.3 TestRun reference");
      return artifact;
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      if (error instanceof ResearchQueueHttpError && error.status === 404) throw new NotFoundException("published V3.3 Artifact content was not found");
      throw new ServiceUnavailableException("Research Automation V3.3 Artifact content is unavailable");
    }
  }

  @Post("runs/:testRunId/dispatch")
  async dispatchScenarioExperiment(
    @Headers("cookie") cookie: string | undefined,
    @Headers("x-stockquant-user") testHeader: string | undefined,
    @Param("testRunId") testRunId: string,
    @Body() body: { schemaVersion?: unknown; confirmation?: unknown },
  ) {
    const ownerId = identity(cookie, testHeader);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(testRunId)) throw new UnprocessableEntityException("testRunId must be a UUID");
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => !["schemaVersion", "confirmation"].includes(key))
      || body.schemaVersion !== "v3.3-scenario-dispatch-command-v1" || body.confirmation !== "DISPATCH_V33_FIXTURE_RUNNER") throw new UnprocessableEntityException("versioned V3.3 Fixture Runner dispatch confirmation is required");
    let run = await this.container.stageRuns.find(testRunId, ownerId);
    if (!run || run.stageId !== "V3.3") throw new NotFoundException("V3.3 run was not found in user scope");
    if (!(["normal", "recovery"].includes(run.scenarioId))) throw new ConflictException("only normal and recovery scenarios can dispatch Runner jobs");
    const imageDigest = process.env.STOCKQUANT_V33_FIXTURE_RUNNER_IMAGE_DIGEST;
    if (!imageDigest || !/^sha256:[a-f0-9]{64}$/u.test(imageDigest)) throw new ServiceUnavailableException("an immutable STOCKQUANT_V33_FIXTURE_RUNNER_IMAGE_DIGEST is required");
    const experiment = run.evidence.experiment as import("../contracts/generated-types.js").V31ExperimentResult | undefined;
    const experimentId = experiment?.experimentId;
    if (!experimentId || experiment?.testRunId !== testRunId || experiment?.status !== "PENDING_PREREQUISITES"
      || experiment.budget?.status !== "RESERVED" || experiment.rounds !== 2 || experiment.budgetCents !== 80) throw new ConflictException("a matching two-round RESERVED Fixture Experiment is required");
    let dispatchedRounds = Array.isArray(run.evidence.dispatchedRounds) ? run.evidence.dispatchedRounds as Record<string, unknown>[] : [];
    if (run.status === "WAITING" && run.evidence.workflowStep === "EXPERIMENT_RESERVED") {
      run = await this.container.stageRuns.transitionV33Workflow({
        testRunId, ownerId, expectedStatus: "WAITING", status: "RUNNING", assertions: run.assertions,
        evidence: { ...run.evidence, workflowStep: "RUNNER_DISPATCH_PENDING", runnerDispatch: "IN_PROGRESS", runnerJobsCreated: 0, runnerJobIds: [], dispatchedRounds: [] },
      });
      dispatchedRounds = [];
    } else if (run.status !== "RUNNING" || !["RUNNER_DISPATCH_PENDING", "RUNNER_JOBS_QUEUED"].includes(String(run.evidence.workflowStep))) {
      throw new ConflictException("V3.3 TestRun is not at the Fixture Runner dispatch step");
    }
    const priorByRound = new Map(dispatchedRounds.map((row) => [Number(row.roundIndex), row]));
    const completedRounds: Record<string, unknown>[] = [];
    for (const roundIndex of [1, 2]) {
      const existing = priorByRound.get(roundIndex);
      if (existing?.jobId) { completedRounds.push(existing); continue; }
      const modelRunId = `${testRunId}.round-${roundIndex}`;
      let modelCall: import("../contracts/generated-types.js").V31ModelGatewayFixtureResult;
      try {
        modelCall = await this.queueClient().callV31ModelGatewayFixture({ experimentId, modelRunId, requestedCents: 40, roundIndex, scenario: "COMPLETED", ...(run.scenarioId === "recovery" && roundIndex === 1 ? { runnerScenario: "CHECKPOINT_RECOVERY" } : {}) });
      } catch (error) {
        throw new ServiceUnavailableException(`Fixture model call failed for round ${roundIndex}${error instanceof ResearchQueueHttpError ? `: ${error.status}` : ""}`);
      }
      const generatedCode = modelCall.response?.generatedCode;
      if (modelCall.status !== "COMPLETED" || modelCall.providerMode !== "FIXTURE" || modelCall.modelCalls !== "NO_EXTERNAL_CALL"
        || modelCall.actualCostCents !== 23 || modelCall.budgetStatus !== "SETTLED" || typeof generatedCode !== "string" || generatedCode.length < 1 || generatedCode.length > 256_000) {
        throw new ServiceUnavailableException(`Fixture model response or 23-cent settlement did not match round ${roundIndex}`);
      }
      const inputBundle = Buffer.from(JSON.stringify({ schemaVersion: "v3.1-runner-input-bundle-v1", script: "code/main.py", files: [{ path: "code/main.py", contentBase64: Buffer.from(generatedCode).toString("base64") }] }));
      const inputHash = createHash("sha256").update(inputBundle).digest("hex");
      const inputNamespace = `research/${testRunId}/${experimentId}/inputs`;
      const outputNamespace = `research/${testRunId}/${experimentId}/outputs`;
      try {
        await this.queueClient().publishV31Artifact({ ref: { schemaVersion: "v3.1-artifact-ref-v1", artifactId: inputHash, kind: "INPUT", namespace: inputNamespace, sha256: inputHash, status: "PENDING", sourceRef: `v3.3-fixture:${experiment.fixtureId}:generated-code:${inputHash}` }, contentBase64: inputBundle.toString("base64") });
      } catch (error) {
        throw new ServiceUnavailableException(`Fixture Runner input publication failed for round ${roundIndex}${error instanceof ResearchQueueHttpError ? `: ${error.status}` : ""}`);
      }
      let job: import("../contracts/generated-types.js").V31RunnerJobDispatchResult;
      try {
        job = await this.queueClient().submitV31RunnerJob({
          schemaVersion: "v3.1-runner-job-v1", testRunId, experimentId, roundIndex, imageDigest,
          inputArtifact: `${inputNamespace}/${inputHash}`, outputNamespace,
          resources: { cpuMilli: 500, memoryMiB: 512, timeoutSeconds: 300, pidsLimit: 32 },
          networkPolicy: { mode: "DENY", allowlist: [] },
        });
      } catch (error) {
        throw new ServiceUnavailableException(`Fixture Runner dispatch failed for round ${roundIndex}${error instanceof ResearchQueueHttpError ? `: ${error.status}` : ""}`);
      }
      if (!job.jobId || job.job?.testRunId !== testRunId || job.job?.experimentId !== experimentId || job.job?.roundIndex !== roundIndex || job.status !== "QUEUED") throw new ServiceUnavailableException(`Runner queue response did not match round ${roundIndex}`);
      const roundEvidence = { roundIndex, modelRunId, modelCostCents: 23, inputArtifact: `${inputNamespace}/${inputHash}`, inputSha256: inputHash, jobId: job.jobId, status: job.status, outputNamespace };
      completedRounds.push(roundEvidence);
      const evidence = { ...run.evidence, workflowStep: "RUNNER_DISPATCH_PENDING", runnerDispatch: "IN_PROGRESS", runnerJobsCreated: completedRounds.length, runnerJobIds: completedRounds.map((row) => row.jobId), dispatchedRounds: completedRounds, externalModelCalls: 0 };
      run = await this.container.stageRuns.transitionV33Workflow({ testRunId, ownerId, expectedStatus: "RUNNING", status: "RUNNING", assertions: run.assertions, evidence });
    }
    const evidence = { ...run.evidence, workflowStep: "RUNNER_JOBS_QUEUED", runnerDispatch: "QUEUED", runnerJobsCreated: 2, runnerJobIds: completedRounds.map((row) => row.jobId), dispatchedRounds: completedRounds, roundSettledCents: [23, 23], experimentSpentCents: 46, releasedReservationCents: 34, externalModelCalls: 0 };
    run = await this.container.stageRuns.transitionV33Workflow({ testRunId, ownerId, expectedStatus: "RUNNING", status: "RUNNING", assertions: run.assertions, evidence });
    return { schemaVersion: "v3.3-scenario-dispatch-result-v1", testRunId, status: run.status, workflowStep: run.evidence.workflowStep, idempotent: priorByRound.size === 2, runnerJobsCreated: 2, runnerJobIds: run.evidence.runnerJobIds, rounds: run.evidence.dispatchedRounds, externalModelCalls: 0 };
  }

  @Post("runs/:testRunId/reconcile")
  async reconcileScenarioResults(
    @Headers("cookie") cookie: string | undefined,
    @Headers("x-stockquant-user") testHeader: string | undefined,
    @Param("testRunId") testRunId: string,
    @Body() body: { schemaVersion?: unknown; confirmation?: unknown },
  ) {
    const ownerId = identity(cookie, testHeader);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(testRunId)) throw new UnprocessableEntityException("testRunId must be a UUID");
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some((key) => !["schemaVersion", "confirmation"].includes(key))
      || body.schemaVersion !== "v3.3-scenario-reconcile-command-v1" || body.confirmation !== "RECONCILE_V33_FIXTURE_RESULTS") throw new UnprocessableEntityException("versioned V3.3 Fixture result reconciliation confirmation is required");
    const run = await this.container.stageRuns.find(testRunId, ownerId);
    if (!run || run.stageId !== "V3.3") throw new NotFoundException("V3.3 run was not found in user scope");
    if (!["normal", "recovery"].includes(run.scenarioId)) throw new ConflictException("only normal and recovery scenarios can reconcile Runner results");
    if (run.status !== "RUNNING" || !["RUNNER_JOBS_QUEUED", "RUNNER_RESULTS_RECONCILED"].includes(String(run.evidence.workflowStep))) throw new ConflictException("V3.3 TestRun is not at the Runner result reconciliation step");
    const experiment = run.evidence.experiment as import("../contracts/generated-types.js").V31ExperimentResult | undefined;
    const experimentId = experiment?.experimentId;
    const rounds = Array.isArray(run.evidence.dispatchedRounds) ? run.evidence.dispatchedRounds as Record<string, unknown>[] : [];
    const expectedIds = Array.isArray(run.evidence.runnerJobIds) ? run.evidence.runnerJobIds : [];
    if (!experimentId || experiment?.testRunId !== testRunId || experiment.rounds !== 2 || rounds.length !== 2 || expectedIds.length !== 2) throw new ConflictException("a matching dispatched two-round Fixture Experiment is required");
    let queue: import("../contracts/generated-types.js").V33RunnerQueue;
    try { queue = await this.queueClient().listRunnerJobsForTestRun(testRunId, 0, 100); }
    catch (error) { throw new ServiceUnavailableException(`Research Automation Runner queue read failed${error instanceof ResearchQueueHttpError ? `: ${error.status}` : ""}`); }
    if (queue.schemaVersion !== "v3.3-runner-queue-v1" || queue.testRunId !== testRunId || queue.hasMore) throw new ServiceUnavailableException("Research Automation queue response is incomplete or mismatched");
    const jobsById = new Map(queue.jobs.map((job) => [job.jobId, job]));
    if (queue.jobs.length !== 2 || expectedIds.some((id) => typeof id !== "string" || !jobsById.has(id)) || expectedIds.some((id) => !queue.jobs.some((job) => job.jobId === id))) throw new ConflictException("Research Automation queue does not contain exactly the two dispatched Runner Jobs");
    const completedRounds: Record<string, unknown>[] = [];
    for (const dispatched of rounds) {
      const roundIndex = Number(dispatched.roundIndex);
      const jobId = String(dispatched.jobId ?? "");
      const job = jobsById.get(jobId);
      if (![1, 2].includes(roundIndex) || !expectedIds.includes(jobId) || !job || job.job.testRunId !== testRunId
        || job.job.experimentId !== experimentId || job.job.roundIndex !== roundIndex
        || job.job.outputNamespace !== dispatched.outputNamespace) throw new ConflictException(`Runner Job identity does not match the dispatched Experiment round ${roundIndex}`);
      if (job.status !== "COMPLETED" || job.execution?.status !== "COMPLETED" || job.execution.exitCode !== 0) throw new ConflictException(`Runner round ${roundIndex} has not completed successfully`);
      if (job.artifacts.length !== 1 || job.artifacts.some((ref) => ref.kind !== "OUTPUT" || ref.status !== "PUBLISHED" || ref.namespace !== dispatched.outputNamespace || !/^[a-f0-9]{64}$/u.test(ref.sha256))) throw new ConflictException(`Runner round ${roundIndex} must have exactly one valid published output Artifact`);
      const verifiedArtifacts: Record<string, unknown>[] = [];
      for (const ref of job.artifacts) {
        let artifact: import("../contracts/generated-types.js").V31RunnerInputResponse;
        try { artifact = await this.queueClient().readV31Artifact({ namespace: ref.namespace, artifactId: ref.artifactId }); }
        catch (error) { throw new ServiceUnavailableException(`Runner output Artifact read failed${error instanceof ResearchQueueHttpError ? `: ${error.status}` : ""}`); }
        const content = Buffer.from(artifact.contentBase64, "base64");
        if (content.toString("base64") !== artifact.contentBase64 || artifact.ref.namespace !== ref.namespace || artifact.ref.artifactId !== ref.artifactId
          || artifact.ref.sha256 !== ref.sha256 || artifact.ref.status !== "PUBLISHED" || createHash("sha256").update(content).digest("hex") !== ref.sha256) {
          throw new ConflictException(`Runner output Artifact bytes or identity failed verification for round ${roundIndex}`);
        }
        let metrics: unknown;
        try { metrics = JSON.parse(content.toString("utf8")); }
        catch { throw new ConflictException(`Runner output Artifact is not valid JSON for round ${roundIndex}`); }
        if (!metrics || typeof metrics !== "object" || Array.isArray(metrics)
          || (metrics as Record<string, unknown>).bars !== 6
          || (metrics as Record<string, unknown>).fixtureId !== "v3.1-research-small-sample-1"
          || (metrics as Record<string, unknown>).qlibVersion !== "0.9.6.99"
          || (metrics as Record<string, unknown>).return !== 0.12) throw new ConflictException(`Runner round ${roundIndex} metrics do not match the frozen deterministic Fixture`);
        verifiedArtifacts.push({ artifactId: ref.artifactId, kind: ref.kind, namespace: ref.namespace, sha256: ref.sha256, status: ref.status, byteLength: content.byteLength, metrics });
      }
      completedRounds.push({ roundIndex, jobId, status: job.status, execution: job.execution, artifacts: verifiedArtifacts, completedAt: job.completedAt });
    }
    if (completedRounds.length !== 2 || new Set(completedRounds.map((row) => row.roundIndex)).size !== 2) throw new ConflictException("both distinct Runner rounds are required before reconciliation");
    const validateBudgetSummary = (summary: import("../contracts/generated-types.js").V33TestRunExperimentBudgetSummary, expectedStatus: "RESERVED" | "SETTLED") => {
      const value = summary as Record<string, any>;
      const row = Array.isArray(value.rows) && value.rows.length === 1 ? value.rows[0] : null;
      const totals = value.totals;
      const expectedReservedCents = expectedStatus === "RESERVED" ? 80 : 0;
      if (value.schemaVersion !== "v3.3-test-run-budget-summary-v1" || value.testRunId !== testRunId || value.offset !== 0 || value.afterCursor !== null || value.hasMore !== false
        || value.accountingScope !== "unique experiments bound to this TestRun; model-call attempts are counted once; no provider invoice reconciliation"
        || value.stageBudgetControl !== "TEST_RUN_AND_ROUND_CAP_ENFORCED" || !row || row.experimentId !== experimentId || row.rounds !== 2
        || row.requestedCents !== 80 || row.reservedCents !== expectedReservedCents || row.status !== expectedStatus || row.settledCents !== 46
        || row.unknownReservedCents !== 0 || row.modelCallCount !== 2 || !Array.isArray(row.roundBudget) || row.roundBudget.length !== 2
        || row.roundBudget.some((round: any, index: number) => round.roundIndex !== index + 1 || round.allocatedCents !== 40 || round.usedCents !== 23 || round.unknownReservedCents !== 0)
        || !totals || totals.experiments !== 1 || totals.requestedCents !== 80 || totals.reservedCents !== expectedReservedCents
        || totals.settledCents !== 46 || totals.unknownReservedCents !== 0 || totals.modelCallCount !== 2) {
        throw new ConflictException("Research Automation TestRun budget ledger does not prove exact two-round Fixture settlement");
      }
      return { experimentId, requestedCents: 80, settledCents: 46, modelCallCount: 2, rounds: [{ roundIndex: 1, allocatedCents: 40, settledCents: 23 }, { roundIndex: 2, allocatedCents: 40, settledCents: 23 }] };
    };
    let settlementEvidence: ReturnType<typeof validateBudgetSummary>;
    try {
      const summary = await this.queueClient().readCompleteTestRunBudgetSummary(testRunId, 0, 100);
      const currentRow = Array.isArray((summary as any).rows) ? (summary as any).rows[0] : null;
      if (!currentRow || !["RESERVED", "SETTLED"].includes(currentRow.status)) throw new ConflictException("Experiment budget is not settleable from its ledger state");
      settlementEvidence = validateBudgetSummary(summary, currentRow.status);
      if (currentRow.status === "RESERVED") {
        const settled = await this.queueClient().settleV31ExperimentBudgetFromModelCalls(experimentId, { testRunId, expectedRounds: 2 });
        if (settled.experimentId !== experimentId || settled.testRunId !== testRunId || settled.requestedCents !== 80 || settled.reservedCents !== 80 || settled.spentCents !== 46 || settled.status !== "SETTLED" || settled.modelCallCount !== 2
          || settled.rounds.length !== 2 || settled.rounds.some((round, index) => round.roundIndex !== index + 1 || round.settledCents !== 23)) throw new ConflictException("Research Automation did not confirm the exact Fixture model-call ledger settlement");
      }
      const confirmed = await this.queueClient().readV31ExperimentBudget(experimentId);
      if (confirmed.experimentId !== experimentId || confirmed.requestedCents !== 80 || confirmed.reservedCents !== 80 || confirmed.spentCents !== 46 || confirmed.status !== "SETTLED") throw new ConflictException("Research Automation Experiment budget is not settled to the verified Fixture ledger amount");
      const finalSummary = await this.queueClient().readCompleteTestRunBudgetSummary(testRunId, 0, 100);
      settlementEvidence = validateBudgetSummary(finalSummary, "SETTLED");
    } catch (error) {
      if (error instanceof ConflictException) throw error;
      throw new ServiceUnavailableException(`Research Automation Fixture Experiment settlement verification failed${error instanceof ResearchQueueHttpError ? `: ${error.status}` : ""}`);
    }
    const workflowStep = "EXPERIMENT_SETTLED_AND_RESULTS_RECONCILED";
    const evidence = { ...run.evidence, workflowStep, runnerDispatch: "COMPLETED", runnerExecution: "COMPLETED", completedRounds, businessWorkflow: workflowStep, businessValidation: "NOT_RUN", experimentSettlement: "VERIFIED_FIXTURE_LEDGER", experimentSettlementEvidence: settlementEvidence, humanAcceptance: "NOT_RUN", externalModelCalls: 0 };
    const updated = await this.container.stageRuns.transitionV33Workflow({ testRunId, ownerId, expectedStatus: "RUNNING", status: "RUNNING", assertions: run.assertions, evidence });
    return { schemaVersion: "v3.3-scenario-reconcile-result-v1", testRunId, status: updated.status, workflowStep: updated.evidence.workflowStep, completedRounds: completedRounds.length, rounds: completedRounds, experimentSettlement: "VERIFIED_FIXTURE_LEDGER", settlement: settlementEvidence, businessValidation: "NOT_RUN", humanAcceptance: "NOT_RUN" };
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

  @Get("runs/:testRunId/research/budget/summary")
  async runnerBudgetSummary(
    @Headers("cookie") cookie: string | undefined,
    @Headers("x-stockquant-user") testHeader: string | undefined,
    @Param("testRunId") testRunId: string,
    @Query("offset") offsetValue?: string,
    @Query("limit") limitValue?: string,
    @Query("afterCursor") afterCursor?: string,
  ) {
    const ownerId = identity(cookie, testHeader);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(testRunId)) throw new UnprocessableEntityException("testRunId must be a UUID");
    const offset = offsetValue === undefined ? 0 : Number(offsetValue);
    const limit = limitValue === undefined ? 50 : Number(limitValue);
    if (!Number.isSafeInteger(offset) || offset < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new UnprocessableEntityException("offset must be non-negative and limit must be between 1 and 100");
    if (afterCursor !== undefined && (typeof afterCursor !== "string" || afterCursor.length > 512)) throw new UnprocessableEntityException("afterCursor must be a bounded string");
    const run = await this.container.stageRuns.find(testRunId, ownerId);
    if (!run || run.stageId !== "V3.3") throw new NotFoundException("V3.3 run was not found in user scope");
    if (afterCursor !== undefined && offset !== 0) throw new UnprocessableEntityException("afterCursor pagination requires offset 0");
    const body = await this.queueClient().readCompleteTestRunBudgetSummary(testRunId, offset, limit, afterCursor).catch((error: unknown) => {
      throw new ServiceUnavailableException(`Research Automation complete TestRun budget read failed${error instanceof ResearchQueueHttpError ? `: ${error.status}` : ""}`);
    });
    if (!body || typeof body !== "object" || Array.isArray(body)
      || (body as { schemaVersion?: unknown }).schemaVersion !== "v3.3-test-run-budget-summary-v1"
      || (body as { testRunId?: unknown }).testRunId !== testRunId
      || (body as { offset?: unknown }).offset !== offset
      || (body as { limit?: unknown }).limit !== limit
      || (body as { afterCursor?: unknown }).afterCursor !== (afterCursor ?? null)
      || !Array.isArray((body as { rows?: unknown }).rows)
      || typeof (body as { hasMore?: unknown }).hasMore !== "boolean"
      || (afterCursor === undefined && (!(body as { totals?: unknown }).totals || typeof (body as { totals?: { experiments?: unknown } }).totals?.experiments !== "number"))
      || (afterCursor !== undefined && (body as { totals?: unknown }).totals !== null)
      || !["NOT_IMPLEMENTED", "TEST_RUN_CAP_ENFORCED_ROUND_CAP_NOT_IMPLEMENTED", "TEST_RUN_AND_ROUND_CAP_ENFORCED"].includes(String((body as { stageBudgetControl?: unknown }).stageBudgetControl))) throw new ServiceUnavailableException("Research Automation TestRun budget summary does not match the scoped request");
    return body;
  }

  private queueClient() { return new GeneratedResearchQueueClient(this.container.researchAutomationUrl, this.container.portfolioToken); }
}

@Module({ controllers: [HealthController, PlatformController, V12AcceptanceController, V13AcceptanceController, V14AcceptanceController, V15AcceptanceController, V21AcceptanceController, V22AcceptanceController, V23AcceptanceController, V24AcceptanceController, V25AcceptanceController, V31AcceptanceController, V31PromotionGateController, V32AcceptanceController, V33AcceptanceController, Dc06AcceptanceController, Dc08AcceptanceController, RealIntegrationController], providers: [PlatformContainer] })
export class AppModule {}

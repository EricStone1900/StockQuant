import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule, PlatformContainer, V12AcceptanceController, V14AcceptanceController } from "./bootstrap/app.module.js";
import { GeneratedPlatformPaperExecutionClient } from "./contracts/generated-platform-paper-execution-client.js";
import { GeneratedPortfolioAccountClient } from "./contracts/generated-portfolio-account-client.js";
import { GeneratedV13ProposalClient } from "./contracts/generated-v13-proposal-client.js";
import { GeneratedPlatformV13AutoMandateClient } from "./contracts/generated-v13-auto-mandate-client.js";
import { GeneratedPlatformV13ManualTradeClient } from "./contracts/generated-v13-manual-trade-client.js";
import { completeV15AutoTrade, completeV15AutoTradeCancelled, completeV15PausedRejection, completeV15Recovery, executeV15AutoTrade, rejectV15PausedAutoTrade, v15SessionCloseClock, v15SessionOpenClock } from "./application/v15-auto-trade.js";
import { completeV15NoTrade, prepareV15NoTrade, verifyV15NoTradeSession } from "./application/v15-no-trade.js";
import { startTemporalRuntime } from "./integration/temporal-runtime.js";
import { startV15NatsDispatch } from "./integration/v15-nats-dispatch.js";
import { isV24QuoteSourceUseConfigured } from "./application/v24-live-observation.js";
import { isV24PaperApprovalConfigured } from "./application/v24-paper-approval.js";
import { SystemClock } from "./application/v24-scheduler.js";

async function bootstrap() {
  if (process.env.STOCKQUANT_LIVE_TRADING_ENABLED !== "false" || process.env.STOCKQUANT_BROKER_MODE !== "FAKE") {
    throw new Error("V1.1 refuses LIVE trading or non-FAKE broker mode");
  }
  if (process.env.STOCKQUANT_V24_AUTO_START === "true" && !isV24QuoteSourceUseConfigured({
    approved: process.env.STOCKQUANT_V24_QUOTE_SOURCE_USE_APPROVED === "true",
    authorizationRef: process.env.STOCKQUANT_V24_QUOTE_SOURCE_AUTHORIZATION_REF ?? "",
    dataVersion: process.env.STOCKQUANT_V24_QUOTE_DATA_VERSION ?? "",
  })) {
    throw new Error("V2.4 scheduler auto-start requires explicit quote-source approval, authorization reference, and data version");
  }
  if (process.env.STOCKQUANT_V24_AUTO_START === "true" && !isV24PaperApprovalConfigured(process.env, new SystemClock().now())) {
    throw new Error("V2.4 scheduler auto-start requires complete OD-007 references and a future effective-until timestamp");
  }
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { logger: ["error", "warn", "log"], bodyParser: false });
  app.useBodyParser("json", { limit: "1mb" });
  app.enableCors({ origin: ["http://127.0.0.1:5173", "http://127.0.0.1:8080"], credentials: true });
  const container = app.get(PlatformContainer);
  await container.localSessions.migrate();
  await container.repository.migrate();
  await container.stageRuns.migrate();
  await container.qlibFixtureArtifacts.migrate();
  await container.repository.assertStorageReady();
  await container.migrateV24();
  await app.get(V12AcceptanceController).resumePending();
  await app.get(V14AcceptanceController).resumePending();
  if (process.env.STOCKQUANT_TEMPORAL_ADDRESS) {
    const portfolio = new GeneratedPortfolioAccountClient(container.portfolioApiUrl, "platform-api-service", container.portfolioToken);
    const fakeBroker = new GeneratedPlatformPaperExecutionClient(container.executionUrl, container.portfolioToken);
    const proposalClient = new GeneratedV13ProposalClient(container.governanceUrl, container.portfolioToken);
    const autoMandates = new GeneratedPlatformV13AutoMandateClient(container.governanceUrl, container.portfolioToken);
    const autoTrade = new GeneratedPlatformV13ManualTradeClient(container.tradeExecutionUrl, container.portfolioToken);
    const ports = {
      async initializeAccount(input: { testRunId: string; ownerId: string; namespace: string; market: "CN_A" | "US_EQUITY" }) {
        const currency = input.market === "CN_A" ? "CNY" : "USD";
        const result = await portfolio.initializeAccount({
          fixtureAccountRef: `v15-no-trade-${input.market}-${input.testRunId}`, ownerId: input.ownerId, market: input.market,
          environmentMode: "PAPER", brokerMode: "FAKE", initialCash: { amount: "10000.00", currency },
          namespace: input.namespace, testRunId: input.testRunId, idempotencyKey: `v15-no-trade-account-${input.market}-${input.testRunId}`,
        });
        return result.snapshot;
      },
      readAccount: (accountId: string, ownerId: string) => portfolio.getAccountSnapshot(accountId, ownerId),
      async readBrokerSummary(namespace: string) {
        const response = await fakeBroker.readV24PaperReconciliationSummary(namespace);
        if (!response.ok) throw new Error(`V1.5 FakeBroker reconciliation returned HTTP ${response.status}`);
        return await response.json() as import("./application/v15-no-trade.js").V15BrokerSummary;
      },
      saveRun: (run: Parameters<typeof container.stageRuns.save>[0]) => container.stageRuns.save(run),
    };
    await startTemporalRuntime({
      async prepareNoTrade(input) { return prepareV15NoTrade(input, ports); },
      async verifyNoTradeSessions(input, sessions, baseline) {
        const testActivityDelay = Number(process.env.STOCKQUANT_V15_TEST_ACTIVITY_DELAY_MS ?? "0");
        if (!Number.isSafeInteger(testActivityDelay) || testActivityDelay < 0 || testActivityDelay > 1_000) throw new Error("V1.5 test activity delay must be an integer from 0 to 1000 milliseconds");
        if (testActivityDelay > 0 && (process.env.STOCKQUANT_LIVE_TRADING_ENABLED !== "false" || process.env.STOCKQUANT_BROKER_MODE !== "FAKE")) throw new Error("V1.5 test activity delay is permitted only with LIVE disabled and FakeBroker selected");
        const observations = [];
        for (let offset = 0; offset < sessions.length; offset += 8) {
          if (testActivityDelay > 0) console.info(`STOCKQUANT_V15_TEST_ACTIVITY_STARTED testRunId=${input.testRunId} market=${sessions[offset]?.market ?? "unknown"}`);
          observations.push(...await Promise.all(sessions.slice(offset, offset + 8).map(async (session) => {
            if (testActivityDelay > 0) await new Promise((resolve) => setTimeout(resolve, testActivityDelay));
            return verifyV15NoTradeSession(input, session, baseline, ports);
          })));
          if (testActivityDelay > 0) console.info(`STOCKQUANT_V15_TEST_ACTIVITY_BATCH_COMPLETED testRunId=${input.testRunId} count=${observations.length}`);
        }
        return observations;
      },
      async completeNoTrade(input, accounts, observations) { return completeV15NoTrade(input, accounts, observations as Awaited<ReturnType<typeof verifyV15NoTradeSession>>[], ports); },
      async executeAutoTrade(input, accounts) {
        if (input.scenarioId !== "auto-trade" && input.scenarioId !== "recovery") throw new Error("V1.5 AUTO execution activity received an unexpected scenario");
        const results = [];
        let cancelRequestedAt: string | undefined;
        for (const market of ["CN_A", "US_EQUITY"] as const) {
          const sequences = input.scenarioId === "auto-trade" ? [2, 3] : [1];
          const missedSession = input.scenarioId === "auto-trade" ? input.sessions.find((item) => item.market === market && item.sequence === 1) : undefined;
          if (input.scenarioId === "auto-trade" && (!missedSession || !input.sessions.some((item) => item.market === market && item.sequence === 3))) throw new Error(`V1.5 frozen Fixture is missing the required ${market} multi-session windows`);
          for (const sequence of sequences) {
            const currentRun = await container.stageRuns.find(input.testRunId, input.ownerId);
            const cancellation = currentRun?.evidence.autoTradeCancellation as { status?: unknown; requestedAt?: unknown } | undefined;
            if (input.scenarioId === "auto-trade" && cancellation?.status === "REQUESTED" && typeof cancellation.requestedAt === "string") {
              cancelRequestedAt = cancellation.requestedAt;
              return { orders: results, cancelled: true, cancelRequestedAt };
            }
            const session = input.sessions.find((item) => item.market === market && item.sequence === sequence);
            if (!session) throw new Error(`V1.5 frozen Fixture is missing ${market} session ${sequence}`);
            const testActivityDelay = Number(process.env.STOCKQUANT_V15_TEST_ACTIVITY_DELAY_MS ?? "0");
            if (!Number.isSafeInteger(testActivityDelay) || testActivityDelay < 0 || testActivityDelay > 1_000) throw new Error("V1.5 test activity delay must be an integer from 0 to 1000 milliseconds");
            if (testActivityDelay > 0 && (process.env.STOCKQUANT_LIVE_TRADING_ENABLED !== "false" || process.env.STOCKQUANT_BROKER_MODE !== "FAKE")) throw new Error("V1.5 test activity delay is permitted only with LIVE disabled and FakeBroker selected");
            if (testActivityDelay > 0) {
              console.info(`STOCKQUANT_V15_TEST_AUTO_ACTIVITY_STARTED testRunId=${input.testRunId} market=${market} session=${sequence}`);
              await new Promise((resolve) => setTimeout(resolve, testActivityDelay));
            }
            const beforeSendRun = await container.stageRuns.find(input.testRunId, input.ownerId);
            const beforeSendCancellation = beforeSendRun?.evidence.autoTradeCancellation as { status?: unknown; requestedAt?: unknown } | undefined;
            if (input.scenarioId === "auto-trade" && beforeSendCancellation?.status === "REQUESTED" && typeof beforeSendCancellation.requestedAt === "string") {
              return { orders: results, cancelled: true, cancelRequestedAt: beforeSendCancellation.requestedAt };
            }
            results.push(await executeV15AutoTrade({ testRunId: input.testRunId, ownerId: input.ownerId, namespace: input.namespace, market, accountId: accounts[market].accountId, runClockNow: v15SessionOpenClock(session), sessionSequence: input.scenarioId === "auto-trade" ? sequence : undefined, orderQuantity: input.scenarioId === "auto-trade" ? session.orderQuantity : undefined, recoveryMode: input.scenarioId === "recovery" && market === "CN_A", windowDecision: missedSession && sequence === 2 ? { missedSession: 1, missedAt: v15SessionCloseClock(missedSession), staleOrderCreated: false, reevaluatedSession: 2 } : undefined }, {
            createProposal: (body) => proposalClient.createProposal(body),
            async createMandate(body) { const response = await autoMandates.create(body, input.ownerId, input.ownerId); return { status: response.status, body: response.body as Record<string, unknown> | undefined }; },
            async readMandate(mandateId, testRunId, ownerId) { const response = await autoMandates.read(mandateId, testRunId, ownerId); return { status: response.status, body: response.body as Record<string, unknown> | undefined }; },
            async readMandateBudget(mandateId, testRunId, mandateVersion, ownerId) { const response = await autoMandates.readBudget(mandateId, testRunId, mandateVersion, ownerId); return { status: response.status, body: response.body as Record<string, unknown> | undefined }; },
            async activateMandate(mandateId, body) { const response = await autoMandates.activate(mandateId, body, input.ownerId, input.ownerId); return { status: response.status, body: response.body as Record<string, unknown> | undefined }; },
            async pauseMandate(mandateId, body) { const response = await autoMandates.pause(mandateId, body, input.ownerId, input.ownerId); return { status: response.status, body: response.body as Record<string, unknown> | undefined }; },
            execute: (body) => autoTrade.executeAutoPolicyProposal(body),
            async readCancellationRequest(testRunId, ownerId) {
              const current = await container.stageRuns.find(testRunId, ownerId);
              const cancellation = current?.evidence.autoTradeCancellation as { status?: unknown; requestedAt?: unknown } | undefined;
              return cancellation?.status === "REQUESTED" && typeof cancellation.requestedAt === "string" ? cancellation.requestedAt : undefined;
            },
            readOrder: (namespace, clientOrderId) => autoTrade.readOrderByClientId(namespace, clientOrderId),
            recordSequencedFill: (orderId, report) => autoTrade.recordSequencedFillReport(orderId, report),
            requestOrderCancel: (orderId) => autoTrade.requestFakeBrokerCancel(orderId),
            resolveOrderCancel: (orderId, command) => autoTrade.resolveFakeBrokerCancel(orderId, command),
            readPortfolio: (accountId, ownerId) => portfolio.getAccountSnapshot(accountId, ownerId),
            async readFakeBrokerAssets(namespace, accountId) { const response = await autoTrade.readIndependentAssets(namespace, accountId); return { status: response.status, body: response.body as import("./application/v15-auto-trade.js").V15AutoBrokerAssets | Record<string, unknown> | undefined }; },
            async readBrokerSummary(namespace) {
              const response = await fakeBroker.readV24PaperReconciliationSummary(namespace);
              if (!response.ok) throw new Error(`V1.5 FakeBroker reconciliation returned HTTP ${response.status}`);
              return await response.json() as import("./application/v15-auto-trade.js").V15AutoBrokerSummary;
            }
            }));
            const afterOrder = await container.stageRuns.find(input.testRunId, input.ownerId);
            const afterCancellation = afterOrder?.evidence.autoTradeCancellation as { status?: unknown; requestedAt?: unknown } | undefined;
            if (input.scenarioId === "auto-trade" && afterCancellation?.status === "REQUESTED" && typeof afterCancellation.requestedAt === "string") {
              cancelRequestedAt = afterCancellation.requestedAt;
              return { orders: results, cancelled: true, cancelRequestedAt };
            }
          }
        }
        return { orders: results, cancelled: false };
      },
      async rejectPausedMandate(input, accounts) {
        if (input.scenarioId !== "rejection") throw new Error("V1.5 rejection activity received an unexpected scenario");
        const results = [];
        for (const market of ["CN_A", "US_EQUITY"] as const) {
          const session = input.sessions.find((item) => item.market === market && item.sequence === 1);
          if (!session) throw new Error(`V1.5 frozen Fixture is missing the first ${market} rejection session`);
          results.push(await rejectV15PausedAutoTrade({ testRunId: input.testRunId, ownerId: input.ownerId, namespace: input.namespace, market, accountId: accounts[market].accountId, runClockNow: v15SessionOpenClock(session), expectedLedgerEntryCount: accounts[market].ledgerEntryCount, expectedLedgerVersion: accounts[market].ledgerVersion }, {
            createProposal: (body) => proposalClient.createProposal(body),
            async createMandate(body) { const response = await autoMandates.create(body, input.ownerId, input.ownerId); return { status: response.status, body: response.body as Record<string, unknown> | undefined }; },
            async readMandate(mandateId, testRunId, ownerId) { const response = await autoMandates.read(mandateId, testRunId, ownerId); return { status: response.status, body: response.body as Record<string, unknown> | undefined }; },
            async readMandateBudget(mandateId, testRunId, mandateVersion, ownerId) { const response = await autoMandates.readBudget(mandateId, testRunId, mandateVersion, ownerId); return { status: response.status, body: response.body as Record<string, unknown> | undefined }; },
            async activateMandate(mandateId, body) { const response = await autoMandates.activate(mandateId, body, input.ownerId, input.ownerId); return { status: response.status, body: response.body as Record<string, unknown> | undefined }; },
            async pauseMandate(mandateId, body) { const response = await autoMandates.pause(mandateId, body, input.ownerId, input.ownerId); return { status: response.status, body: response.body as Record<string, unknown> | undefined }; },
            execute: (body) => autoTrade.executeAutoPolicyProposal(body),
            readPortfolio: (accountId, ownerId) => portfolio.getAccountSnapshot(accountId, ownerId),
            async readFakeBrokerAssets(namespace, accountId) { const response = await autoTrade.readIndependentAssets(namespace, accountId); return { status: response.status, body: response.body as import("./application/v15-auto-trade.js").V15AutoBrokerAssets | Record<string, unknown> | undefined }; },
            async readBrokerSummary(namespace) {
              const response = await fakeBroker.readV24PaperReconciliationSummary(namespace);
              if (!response.ok) throw new Error(`V1.5 FakeBroker reconciliation returned HTTP ${response.status}`);
              return await response.json() as import("./application/v15-auto-trade.js").V15AutoBrokerSummary;
            }
          }));
        }
        return results;
      },
      async completeAutoTrade(input, accounts, orders) { return completeV15AutoTrade(input, accounts, orders, {
        readBrokerSummary: ports.readBrokerSummary,
        readPortfolio: (accountId, ownerId) => portfolio.getAccountSnapshot(accountId, ownerId),
        async readFakeBrokerAssets(namespace, accountId) {
          const response = await autoTrade.readIndependentAssets(namespace, accountId);
          return { status: response.status, body: response.body as import("./application/v15-auto-trade.js").V15AutoBrokerAssets | Record<string, unknown> | undefined };
        },
        saveRun: ports.saveRun,
        findRun: (testRunId, ownerId) => container.stageRuns.find(testRunId, ownerId)
      }); },
      async completeCancelledAutoTrade(input, accounts, result) { return completeV15AutoTradeCancelled(input, accounts, result, { readBrokerSummary: ports.readBrokerSummary, saveRun: ports.saveRun }); },
      async completeRecovery(input, accounts, orders) { return completeV15Recovery(input, accounts, orders, { readBrokerSummary: ports.readBrokerSummary, saveRun: ports.saveRun }); },
      async completePausedRejection(input, results) { return completeV15PausedRejection(input, results as Awaited<ReturnType<typeof rejectV15PausedAutoTrade>>[], ports.saveRun); },
      async failNoTrade(input, message) {
        const run = await container.stageRuns.find(input.testRunId, input.ownerId);
        if (!run || run.stageId !== "V1.5" || run.status !== "WAITING") return;
        const assertions = run.assertions.map((value) => {
          const assertion = value as { assertionId?: string; status?: string; actual?: unknown };
          const targetAssertion = input.scenarioId === "auto-trade" ? "V1.5-AUTO-ORDER-001" : input.scenarioId === "recovery" ? "V1.5-RECOVERY-001" : input.scenarioId === "rejection" ? "V1.5-OPS-PAUSE-001" : "V1.5-HOLD-002";
          return assertion.assertionId === targetAssertion ? { ...assertion, status: "FAIL", actual: { workflowError: message } } : assertion;
        });
        await container.stageRuns.save({ testRunId: run.testRunId, stageId: run.stageId, scenarioId: run.scenarioId, scenarioVersion: run.scenarioVersion, ownerId: run.ownerId, namespace: run.namespace, status: "WAITING", seed: run.seed, assertions, evidence: { ...run.evidence, workflow: "TEMPORAL_FAILED", businessExecution: "FAILED", workflowError: message } });
      },
    });
    await startV15NatsDispatch(container.stageRuns);
  }
  app.use(async (request: { path?: string; headers: Record<string, string | string[] | undefined> }, response: { status: (code: number) => { json: (body: unknown) => void } }, next: () => void) => {
    const path = request.path ?? "";
    if (path === "/api/v1/session" || path === "/api/v1/session/logout") { next(); return; }
    const rawCookie = request.headers.cookie;
    const cookie = Array.isArray(rawCookie) ? rawCookie[0] : rawCookie;
    const token = cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith("sq_session="))?.slice("sq_session=".length);
    if (!token) { next(); return; }
    try {
      const ownerId = await container.localSessions.authenticate(token);
      if (ownerId) {
        request.headers.cookie = cookie!.replace(/sq_session=[^;]*/u, `sq_session=${ownerId}`);
        next();
        return;
      }
      if (process.env.STOCKQUANT_TEST_IDENTITY_HEADER_ENABLED === "true" && !/^[a-f0-9]{64}$/u.test(token)) { next(); return; }
      response.status(401).json({ statusCode: 401, error: "Unauthorized", message: "local session is invalid or expired" });
    } catch {
      response.status(503).json({ statusCode: 503, error: "Service Unavailable", message: "local session validation is unavailable" });
    }
  });
  if (process.env.STOCKQUANT_V24_AUTO_START === "true") {
    await container.scheduler.start();
  }
  await app.listen(Number(process.env.STOCKQUANT_PORT ?? 3000), process.env.STOCKQUANT_BIND_HOST ?? "127.0.0.1");
}

void bootstrap();

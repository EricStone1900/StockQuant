import { expect, test, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
const v13FixtureRoot = resolve(process.cwd(), "../../fixtures/v1/v1.3");
const v13TradeFixture = JSON.parse(readFileSync(resolve(v13FixtureRoot, "trading-loop-scenarios.json"), "utf8"));
const v13TradeFixtureManifest = JSON.parse(readFileSync(resolve(v13FixtureRoot, "manifest.json"), "utf8"));
const v13UsOrderedRoot = resolve(process.cwd(), "../../fixtures/v1/v1.3-us-ordered-fills-v1.0.0");
const v13UsOrderedFixture = JSON.parse(readFileSync(resolve(v13UsOrderedRoot, "aapl-out-of-order-restart.json"), "utf8"));
const v13UsOrderedManifest = JSON.parse(readFileSync(resolve(v13UsOrderedRoot, "manifest.json"), "utf8"));
const v13MultiLegRoot = resolve(process.cwd(), "../../fixtures/v1/v1.3-multileg-v1.0.4");
const v13MultiLegFixture = JSON.parse(readFileSync(resolve(v13MultiLegRoot, "trading-loop-scenarios.json"), "utf8"));
const v13MultiLegManifest = JSON.parse(readFileSync(resolve(v13MultiLegRoot, "manifest.json"), "utf8"));
const canonicalMoney = (value: string) => value.replace(/(\.\d*?[1-9])0+$|\.0+$/u, "$1");
const v11ClientModeInjectionCases = [
  { environmentMode: "PAPER", brokerMode: "FAKE" },
  { environmentMode: "LIVE", brokerMode: "FAKE" },
  { environmentMode: "PAPER", brokerMode: "REAL" },
  { environmentMode: "BACKTEST", brokerMode: "FAKE" },
  { environmentMode: "BACKTEST", brokerMode: "REAL" },
  { environmentMode: "LIVE", brokerMode: "REAL" },
] as const;

test.beforeAll(() => {
  const fixturePath = resolve(v13FixtureRoot, "trading-loop-scenarios.json");
  const fixtureHash = createHash("sha256").update(readFileSync(fixturePath)).digest("hex");
  expect(fixtureHash).toBe(v13TradeFixtureManifest.files[0].sha256);
  expect(v13TradeFixture.fixtureId).toBe(v13TradeFixtureManifest.fixtureId);
  const usOrderedFile = resolve(v13UsOrderedRoot, "aapl-out-of-order-restart.json");
  expect(createHash("sha256").update(readFileSync(usOrderedFile)).digest("hex")).toBe(v13UsOrderedManifest.files[0].sha256);
  expect(v13UsOrderedFixture.fixtureVersion).toBe(v13UsOrderedManifest.fixtureVersion);
  expect(v13UsOrderedFixture.expected).toMatchObject({ cash: "6249.9500", reservedCash: "5000.0500", position: 150, reconciliation: "MATCH" });
  const multiLegFile = resolve(v13MultiLegRoot, "trading-loop-scenarios.json");
  expect(createHash("sha256").update(readFileSync(multiLegFile)).digest("hex")).toBe(v13MultiLegManifest.files[0].sha256);
  expect(v13MultiLegFixture.fixtureVersion).toBe(v13MultiLegManifest.fixtureVersion);
});

test.beforeEach(async ({ page }, testInfo) => {
  if (testInfo.title.includes("V1.3") || testInfo.title.includes("V1.4")) await page.context().tracing.start({ screenshots: true, snapshots: true, sources: true });
  if (testInfo.title.includes("V1.2 normal, rejection, and recovery-probe") && process.env.STOCKQUANT_V12_CAPTURE_EVIDENCE === "1") await page.context().tracing.start({ screenshots: true, snapshots: true, sources: true });
});

test.afterEach(async ({ page }, testInfo) => {
  const isV11 = testInfo.title.includes("V1.1");
  const isV13 = testInfo.title.includes("V1.3");
  const isV14 = testInfo.title.includes("V1.4");
  const isV12Capture = testInfo.title.includes("V1.2 normal, rejection, and recovery-probe") && process.env.STOCKQUANT_V12_CAPTURE_EVIDENCE === "1";
  if (!isV11 && !isV13 && !isV14 && !isV12Capture) return;
  const root = resolve(process.cwd(), "../..");
  if (isV12Capture) {
    const project = (process.env.STOCKQUANT_ISOLATED_V12_PROJECT ?? `local-${process.pid}`).replace(/[^a-zA-Z0-9-]+/gu, "-");
    const captureDirectory = resolve(root, `evidence/audits/${new Date().toISOString().slice(0, 10)}-v12-browser-captures-${project}`);
    mkdirSync(captureDirectory, { recursive: true });
    await page.context().tracing.stop({ path: resolve(captureDirectory, `v12-scenario-matrix-${testInfo.testId}.trace.zip`) });
    console.info(`[V1.2 browser traces] ${captureDirectory}`);
    return;
  }
  if (isV11) {
    if (testInfo.title.includes("normal scenario")) return;
    const project = (process.env.STOCKQUANT_ISOLATED_V11_PROJECT ?? `local-${process.pid}`).replace(/[^a-zA-Z0-9-]+/gu, "-");
    const captureDirectory = resolve(root, `evidence/audits/${new Date().toISOString().slice(0, 10)}-v11-browser-captures-${project}`);
    mkdirSync(captureDirectory, { recursive: true });
    const safeTitle = testInfo.title.replace(/[^a-zA-Z0-9-]+/gu, "-").replace(/^-|-$/gu, "").slice(0, 90);
    if (page.isClosed()) {
      console.warn(`[V1.1 browser capture skipped] ${JSON.stringify({ reason: "Playwright closed the page before afterEach capture" })}`);
      return;
    }
    const testRunId = (await page.getByTestId("test-run-id").textContent().catch(() => null))?.trim() || "no-run";
    const screenshotPath = resolve(captureDirectory, `${safeTitle}-${testRunId}.png`);
    let screenshot: Buffer;
    try {
      screenshot = await page.screenshot({ path: screenshotPath, fullPage: true, animations: "disabled", timeout: 10_000 });
    } catch (error) {
      console.warn(`[V1.1 browser capture skipped] ${JSON.stringify({ testRunId, reason: error instanceof Error ? error.message : String(error) })}`);
      return;
    }
    const screenshotSha256 = createHash("sha256").update(screenshot).digest("hex");
    console.info(`[V1.1 browser capture] ${JSON.stringify({ testRunId, screenshotPath, screenshotSha256 })}`);
    return;
  }
  if (isV14) {
    const project = (process.env.COMPOSE_PROJECT_NAME ?? `local-${process.pid}`).replace(/[^a-zA-Z0-9-]+/gu, "-");
    const captureDirectory = resolve(root, `evidence/audits/2026-10-09-v14-browser-captures-${project}`);
    mkdirSync(captureDirectory, { recursive: true });
    const safeTitle = testInfo.title.replace(/[^a-zA-Z0-9-]+/gu, "-").replace(/^-|-$/gu, "").slice(0, 90);
    await page.screenshot({ path: resolve(captureDirectory, `${safeTitle}-${testInfo.testId}.png`), fullPage: true, animations: "disabled" });
    await page.context().tracing.stop({ path: resolve(captureDirectory, `${safeTitle}-${testInfo.testId}.trace.zip`) });
    console.info(`[V1.4 browser captures] ${captureDirectory}`);
    return;
  }
  const captureRunId = process.env.STOCKQUANT_V13_CAPTURE_RUN_ID
    ?? (new URL(process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:0").port || `local-${process.pid}`);
  const captureDirectory = resolve(root, `evidence/audits/2026-10-08-v13-browser-captures-${captureRunId}`);
  mkdirSync(captureDirectory, { recursive: true });
  const safeTitle = testInfo.title.replace(/[^a-zA-Z0-9-]+/gu, "-").replace(/^-|-$/gu, "").slice(0, 90);
  await page.screenshot({ path: resolve(captureDirectory, `${safeTitle}-${testInfo.testId}.png`), fullPage: true, animations: "disabled" });
  await page.context().tracing.stop({ path: resolve(captureDirectory, `${safeTitle}-${testInfo.testId}.trace.zip`) });
  const runId = new URL(page.url()).searchParams.get("runId");
  if (!runId) {
    if (testInfo.status === testInfo.expectedStatus) return;
    throw new Error("V1.3 browser test completed without a persisted TestRun URL");
  }
  const exported = spawnSync(process.execPath, ["scripts/evidence-export.mjs", "--stage", "V1.3", "--run", runId], {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  });
  expect(exported.status, exported.stderr).toBe(0);
  const result = JSON.parse(exported.stdout) as { outputDirectory?: string; stageId?: string; kind?: string };
  expect(result.stageId).toBe("V1.3");
  expect(result.kind).toBe("TEST_RUN_EVIDENCE");
  expect(result.outputDirectory).toContain(`evidence/local/V1.3/${runId}`);
  console.info(`[V1.3 evidence export] testRunId=${runId} ${exported.stdout.trim()}`);
  const sessionCookie = process.env.STOCKQUANT_EVIDENCE_SESSION_COOKIE;
  expect(sessionCookie, "the isolated V1.3 owner session must be available for shared evidence reads").toMatch(/^sq_session=[^;\s]+$/u);
  const sharedEvidenceResponse = await fetch(`${process.env.STOCKQUANT_PLATFORM_API_URL}/api/v1/acceptance/runs/${runId}/evidence`, {
    headers: { cookie: sessionCookie! },
    signal: AbortSignal.timeout(10_000),
  });
  expect(sharedEvidenceResponse.status, await sharedEvidenceResponse.clone().text()).toBe(200);
  const sharedEvidence = await sharedEvidenceResponse.json() as {
    evidenceVersion?: string;
    mode?: { environmentMode?: string; dataMode?: string; brokerMode?: string };
    run?: { testRunId?: string; stageId?: string; ownerId?: string; assertions?: unknown[] };
    assertions?: unknown[];
    manualConclusion?: string;
  };
  expect(sharedEvidence.evidenceVersion).toBe("v2-stage-run-1");
  expect(sharedEvidence.run?.testRunId).toBe(runId);
  expect(sharedEvidence.run?.stageId).toBe("V1.3");
  expect(sharedEvidence.run?.ownerId).toBeTruthy();
  expect(sharedEvidence.mode).toEqual({ environmentMode: "PAPER", dataMode: "FIXTURE", brokerMode: "FAKE" });
  expect(sharedEvidence.assertions).toEqual(sharedEvidence.run?.assertions);
  expect(sharedEvidence.manualConclusion).toBe("NOT_RUN");
  console.info(`[V1.3 shared StageRun evidence] ${JSON.stringify({ testRunId: runId, ownerId: sharedEvidence.run?.ownerId, stageId: sharedEvidence.run?.stageId, evidenceVersion: sharedEvidence.evidenceVersion, mode: sharedEvidence.mode, assertionCount: sharedEvidence.assertions?.length, manualConclusion: sharedEvidence.manualConclusion, responseStatus: sharedEvidenceResponse.status })}`);
});

function verifyV11RunWithCli(testRunId: string, sessionCookie: string) {
  console.info(`[V1.1 Web/CLI same-run] testRunId=${testRunId}`);
  const root = resolve(process.cwd(), "../..");
  const env = { ...process.env, STOCKQUANT_SESSION_COOKIE: sessionCookie };
  const cli = spawnSync(process.execPath, ["scripts/verify-stage.mjs", "--stage", "V1.1", "--run", testRunId, "--check-only"], {
    cwd: root,
    encoding: "utf8",
    env,
    timeout: 30_000,
  });
  expect(cli.status, cli.stderr).toBe(0);
  expect(cli.stdout).toContain(`"testRunId": "${testRunId}"`);
  expect(cli.stdout).toContain('"status": "COMPLETED"');

  const exported = spawnSync(process.execPath, ["scripts/evidence-export.mjs", "--stage", "V1.1", "--run", testRunId], {
    cwd: root,
    encoding: "utf8",
    env: { ...env, STOCKQUANT_PLATFORM_API_URL: process.env.STOCKQUANT_PLATFORM_API_URL, STOCKQUANT_EVIDENCE_SESSION_COOKIE: sessionCookie },
    timeout: 30_000,
  });
  expect(exported.status, exported.stderr).toBe(0);
  const result = JSON.parse(exported.stdout) as { outputDirectory?: string; manifestHash?: string; stageId?: string; testRunId?: string; kind?: string; attachments?: Array<{ filename: string; sizeBytes: number }> };
  expect(result).toMatchObject({ stageId: "V1.1", testRunId, kind: "TEST_RUN_EVIDENCE" });
  expect(result.outputDirectory).toContain(`evidence/local/V1.1/${testRunId}`);
  expect(result.manifestHash).toMatch(/^[a-f0-9]{64}$/u);
  const exportDirectory = resolve(root, result.outputDirectory!);
  const evidenceBytes = readFileSync(resolve(exportDirectory, "evidence.json"));
  const files = [{ filename: "evidence.json", bytes: evidenceBytes }, ...(result.attachments ?? []).map(({ filename }) => ({ filename, bytes: readFileSync(resolve(exportDirectory, filename)) }))];
  const expectedManifest = files.map(({ filename, bytes }) => `${createHash("sha256").update(bytes).digest("hex")}  ${filename}\n`).join("");
  const manifest = readFileSync(resolve(exportDirectory, "manifest.sha256"), "utf8");
  expect(manifest).toBe(expectedManifest);
  const actualExportHash = files.length === 1 ? createHash("sha256").update(evidenceBytes).digest("hex") : createHash("sha256").update(manifest).digest("hex");
  expect(actualExportHash).toBe(result.manifestHash);
  console.info(`[V1.1 same-run evidence export] testRunId=${testRunId} outputDirectory=${result.outputDirectory} manifestHash=${result.manifestHash}`);
}

async function verifyV11RunAgainstIsolatedLedgers(testRunId: string, page: import("@playwright/test").Page) {
  const project = process.env.STOCKQUANT_ISOLATED_V11_PROJECT;
  expect(project, "direct ledger verification requires the disposable V1.1 stage harness").toMatch(/^sq-v11-stage-[a-f0-9]{20}$/u);
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  const runResponse = await page.request.get(`/api/v1/acceptance/runs/${testRunId}`);
  expect(runResponse.status()).toBe(200);
  const run = await runResponse.json() as { testRunId?: string; ownerId?: string; status?: string; assertions?: Array<{ evidence?: { accountId?: string } }> };
  expect(run.testRunId).toBe(testRunId);
  expect(run.status).toBe("COMPLETED");
  expect(run.ownerId).toMatch(/^[a-zA-Z0-9_-]+$/u);
  const accountId = run.assertions?.map((assertion) => assertion.evidence?.accountId).find((value) => typeof value === "string");
  expect(accountId, "completed V1.1 run must expose the account ID in backend assertion evidence").toMatch(/^[0-9a-f-]{36}$/iu);
  const root = resolve(process.cwd(), "../..");
  const composeArgs = ["compose", "-p", project!, "-f", "infra/compose/docker-compose.v11-integration.yml", "exec", "-T", "postgres"];
  const platformQuery = spawnSync("docker", [...composeArgs, "psql", "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "platform_api", "-c", `SELECT json_build_object('testRunId',test_run_id,'ownerId',owner_id,'status',status,'accountId',account_id)::text FROM test_runs WHERE test_run_id='${testRunId}'::uuid`], { cwd: root, encoding: "utf8", timeout: 10_000 });
  expect(platformQuery.status, platformQuery.stderr).toBe(0);
  const platformRun = JSON.parse(platformQuery.stdout.trim()) as { testRunId: string; ownerId: string; status: string; accountId: string };
  expect(platformRun).toEqual({ testRunId, ownerId: run.ownerId, status: "COMPLETED", accountId });
  const portfolioQuery = spawnSync("docker", [...composeArgs, "psql", "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "portfolio_risk", "-c", `SELECT json_build_object('accountId',a.account_id,'testRunId',a.test_run_id,'ownerId',a.owner_id,'market',a.market,'environmentMode',a.environment_mode,'brokerMode',a.broker_mode,'cash',a.cash_amount::text,'currency',a.currency,'ledgerCount',(SELECT count(*) FROM ledger_entries l WHERE l.account_id=a.account_id),'initialCashCount',(SELECT count(*) FROM ledger_entries l WHERE l.account_id=a.account_id AND l.entry_type='INITIAL_CASH' AND l.amount=10000 AND l.currency='CNY'),'positionCount',(SELECT count(*) FROM account_positions p WHERE p.account_id=a.account_id))::text FROM accounts a WHERE a.account_id='${accountId}'::uuid AND a.test_run_id='${testRunId}'::uuid AND a.owner_id='${run.ownerId}'`], { cwd: root, encoding: "utf8", timeout: 10_000 });
  expect(portfolioQuery.status, portfolioQuery.stderr).toBe(0);
  const ledger = JSON.parse(portfolioQuery.stdout.trim()) as { accountId: string; testRunId: string; ownerId: string; market: string; environmentMode: string; brokerMode: string; cash: string; currency: string; ledgerCount: number; initialCashCount: number; positionCount: number };
  expect(ledger).toEqual({ accountId, testRunId, ownerId: run.ownerId, market: "CN_A", environmentMode: "PAPER", brokerMode: "FAKE", cash: "10000.0000", currency: "CNY", ledgerCount: 1, initialCashCount: 1, positionCount: 0 });
  const accountCountQuery = spawnSync("docker", [...composeArgs, "psql", "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "portfolio_risk", "-c", `SELECT json_build_object('cn',count(*) FILTER (WHERE market='CN_A'),'us',count(*) FILTER (WHERE market='US_EQUITY'))::text FROM accounts WHERE test_run_id='${testRunId}'::uuid`], { cwd: root, encoding: "utf8", timeout: 10_000 });
  expect(accountCountQuery.status, accountCountQuery.stderr).toBe(0);
  expect(JSON.parse(accountCountQuery.stdout.trim())).toEqual({ cn: 1, us: 0 });
  console.info(`[V1.1 same-run domain ledger cross-check] ${JSON.stringify({ testRunId, accountId, ownerId: run.ownerId, platformRun: "COMPLETED", portfolio: "MATCH", cash: ledger.cash, currency: ledger.currency, initialCashLedgerCount: ledger.initialCashCount, positions: ledger.positionCount, queryMode: "read-only isolated PostgreSQL" })}`);
}

function readV11PersistedRunCount(project: string): number {
  const root = resolve(process.cwd(), "../..");
  const result = spawnSync("docker", ["compose", "-p", project, "-f", "infra/compose/docker-compose.v11-integration.yml", "exec", "-T", "postgres", "psql", "-X", "-q", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "platform_api", "-c", "SELECT count(*) FROM test_runs WHERE stage_id='V1.1'"], { cwd: root, encoding: "utf8", timeout: 10_000 });
  expect(result.status, result.stderr).toBe(0);
  return Number(result.stdout.trim());
}

async function currentSessionCookie(page: import("@playwright/test").Page): Promise<string> {
  const cookie = (await page.context().cookies()).find((item) => item.name === "sq_session");
  expect(cookie?.value, "the V1.1 Web run must use its current local session").toBeTruthy();
  return `sq_session=${cookie!.value}`;
}

function verifyV12RunWithCli(testRunId: string, expectedStatus: "COMPLETED" | "WAITING") {
  console.info(`[V1.2 Web/CLI same-run] testRunId=${testRunId}`);
  const cli = spawnSync(process.execPath, ["scripts/verify-stage.mjs", "--stage", "V1.2", "--run", testRunId, "--check-only"], {
    cwd: resolve(process.cwd(), "../.."),
    encoding: "utf8",
    env: process.env
  });
  expect(cli.status, cli.stderr).toBe(expectedStatus === "COMPLETED" ? 0 : 2);
  expect(cli.stdout).toContain(`"testRunId": "${testRunId}"`);
  expect(cli.stdout).toContain(`"status": "${expectedStatus}"`);
}

function verifyV13RunWithCli(testRunId: string, proposalId?: string, clientOrderId?: string, expectedCash = "8995.0000", expectedReservation = "1005.0000", expectedOrderStatus = "FILLED", expectedReservationStatus = "CAPTURED", expectedCapturedCash = expectedReservation, expectedRunStatus: "WAITING" | "COMPLETED" = "WAITING") {
  console.info(`[V1.3 Web/CLI same-run] testRunId=${testRunId}`);
  const cli = spawnSync(process.execPath, ["scripts/verify-stage.mjs", "--stage", "V1.3", "--run", testRunId, ...(proposalId ? ["--proposal", proposalId] : []), ...(clientOrderId ? ["--client-order", clientOrderId] : []), "--check-only"], {
    cwd: resolve(process.cwd(), "../.."),
    encoding: "utf8",
    env: process.env
  });
  expect(cli.status, cli.stderr).toBe(expectedRunStatus === "COMPLETED" ? 0 : 2);
  expect(cli.stdout).toContain(`"testRunId": "${testRunId}"`);
  expect(cli.stdout).toContain(`"status": "${expectedRunStatus}"`);
  if (proposalId) expect(cli.stdout).toContain(`"proposalId": "${proposalId}"`);
  if (clientOrderId) { expect(cli.stdout).toContain('"clientOrderId":'); expect(cli.stdout).toContain(`"status": "${expectedOrderStatus}"`); expect(cli.stdout).toContain('"status": "MATCH"'); expect(cli.stdout).toContain(`"current_cash": "${expectedCash}"`); expect(cli.stdout).toContain(`"status": "${expectedReservationStatus}"`); expect(cli.stdout).toContain(`"capturedCashAmount": "${expectedCapturedCash}"`); }
}

async function runV13L07SeededCancelScenario(page: Page, seed: number, arrivalOrder: "seq2-first" | "seq1-then-seq2") {
  await page.goto("/acceptance/v1/v1.3");
  await page.evaluate(async () => {
    const response = await fetch("/api/v1/session", { credentials: "include" });
    if (!response.ok) throw new Error(`acceptance session failed (${response.status})`);
  });
  const created = await page.request.post("/api/v1/acceptance/v1/v1.3/runs", { data: { scenarioId: "normal", seed } });
  expect(created.status()).toBe(202);
  const { testRunId } = await created.json();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.goto(`/acceptance/v1/v1.3?runId=${encodeURIComponent(testRunId)}`);
  await expect(page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" })).toBeVisible();
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  await page.getByTestId("v13-create-sequenced-proposal").click();
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  expect(proposalId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "人工批准", exact: true }).click();
  await page.getByTestId("v13-execute-sequenced-proposal").click();
  await expect(page.getByTestId("v13-order")).toContainText("ACCEPTED");

  if (arrivalOrder === "seq2-first") {
    await page.getByTestId("v13-sequence-2-replay").click();
    await expect(page.getByTestId("v13-sequenced-report")).toContainText('"buffered":true');
    await page.getByTestId("v13-sequence-1").click();
    await expect(page.getByTestId("v13-sequenced-report")).toContainText('"lastAppliedSequence":2');
  } else {
    await page.getByTestId("v13-sequence-1").click();
    await expect(page.getByTestId("v13-order")).toContainText("PARTIALLY_FILLED");
    await page.getByTestId("v13-sequence-2-replay").click();
    await expect(page.getByTestId("v13-sequenced-report")).toContainText('"lastAppliedSequence":2');
  }

  const clientOrderId = `v13-${proposalId}`;
  const cancelRequest = await page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${clientOrderId}/cancel-request`);
  expect(cancelRequest.status()).toBe(202);
  expect(await cancelRequest.json()).toMatchObject({ status: "CANCEL_REQUESTED", reservation: { status: "HELD" } });
  const cancelResult = await page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${clientOrderId}/cancel-results/3`);
  expect(cancelResult.status()).toBe(200);
  expect((await cancelResult.json()).order.order.status).toBe("CANCELLED");

  await expect(page.getByTestId("v13-reconciliation")).toHaveText("MATCH");
  const facts = await page.request.get(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${clientOrderId}`).then((response) => response.json());
  expect(facts.fills.map((fill: { brokerSequence: number; quantity: number }) => [fill.brokerSequence, fill.quantity])).toEqual([[1, 100], [2, 50]]);
  expect(facts.order.status).toBe("CANCELLED");
  expect(facts.independentAssets.current_cash).toBe("8495.0000");
  expect(facts.independentAssets.positions).toEqual([{ security: "600000.SH", quantity: 150 }]);
  const accountId = new URL(page.url()).searchParams.get("accountId");
  const account = await page.request.get(`/api/v1/accounts/${accountId}`).then((response) => response.json());
  expect(account.account.reservations).toContainEqual(expect.objectContaining({ clientOrderId, status: "RELEASED", capturedCashAmount: "1505.0000" }));
  verifyV13RunWithCli(testRunId, proposalId!, clientOrderId, "8495.0000", "2005.0000", "CANCELLED", "RELEASED", "1505.0000");
  console.info(`[V1.3 L07 seeded Web/API/CLI cancellation recovery] ${JSON.stringify({ testRunId, seed, arrivalOrder, proposalId, clientOrderId, fills: facts.fills.map((fill: { brokerSequence: number }) => fill.brokerSequence), cash: facts.independentAssets.current_cash, reconciliation: facts.reconciliation.status, reservation: account.account.reservations.find((item: { clientOrderId: string }) => item.clientOrderId === clientOrderId)?.status })}`);
}

async function runV13L16CancelPreconditionRecovery(page: Page, seed: number) {
  await page.goto("/acceptance/v1/v1.3");
  await page.evaluate(async () => {
    const response = await fetch("/api/v1/session", { credentials: "include" });
    if (!response.ok) throw new Error(`acceptance session failed (${response.status})`);
  });
  const created = await page.request.post("/api/v1/acceptance/v1/v1.3/runs", { data: { scenarioId: "normal", seed } });
  expect(created.status()).toBe(202);
  const { testRunId } = await created.json();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.goto(`/acceptance/v1/v1.3?runId=${encodeURIComponent(testRunId)}`);
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  await page.getByTestId("v13-create-sequenced-proposal").click();
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  expect(proposalId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "人工批准", exact: true }).click();
  await page.getByTestId("v13-execute-sequenced-proposal").click();
  await expect(page.getByTestId("v13-order")).toContainText("ACCEPTED");

  const clientOrderId = `v13-${proposalId}`;
  const orderPath = `/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${clientOrderId}`;
  const rejectedEarlyCancel = await page.request.post(`${orderPath}/cancel-request`);
  expect(rejectedEarlyCancel.status()).toBe(409);
  const beforeFillFacts = await page.request.get(orderPath).then((response) => response.json());
  expect(beforeFillFacts.order.status).toBe("ACCEPTED");
  expect(beforeFillFacts.fills).toEqual([]);
  expect(beforeFillFacts.independentAssets.current_cash).toBe("10000.0000");
  const accountId = new URL(page.url()).searchParams.get("accountId");
  const beforeFillAccount = await page.request.get(`/api/v1/accounts/${accountId}`).then((response) => response.json());
  expect(beforeFillAccount.account.reservations).toContainEqual(expect.objectContaining({ clientOrderId, status: "HELD" }));
  verifyV13RunWithCli(testRunId, proposalId!, clientOrderId, "10000.0000", "2005.0000", "ACCEPTED", "HELD", "0.0000");

  await page.getByTestId("v13-sequence-2-replay").click();
  await expect(page.getByTestId("v13-sequenced-report")).toContainText('"buffered":true');
  const bufferedCancelRequest = await page.request.post(`${orderPath}/cancel-request`);
  expect(bufferedCancelRequest.status()).toBe(409);
  const stillHeld = await page.request.get(`/api/v1/accounts/${accountId}`).then((response) => response.json());
  expect(stillHeld.account.reservations).toContainEqual(expect.objectContaining({ clientOrderId, status: "HELD" }));

  await page.getByTestId("v13-sequence-1").click();
  await expect(page.getByTestId("v13-sequenced-report")).toContainText('"lastAppliedSequence":2');
  const cancelRequest = await page.request.post(`${orderPath}/cancel-request`);
  expect(cancelRequest.status()).toBe(202);
  expect(await cancelRequest.json()).toMatchObject({ status: "CANCEL_REQUESTED", reservation: { status: "HELD" } });
  const cancelResult = await page.request.post(`${orderPath}/cancel-results/3`);
  expect(cancelResult.status()).toBe(200);
  expect((await cancelResult.json()).order.order.status).toBe("CANCELLED");

  const facts = await page.request.get(orderPath).then((response) => response.json());
  expect(facts.order.status).toBe("CANCELLED");
  expect(facts.fills.map((fill: { brokerSequence: number; quantity: number }) => [fill.brokerSequence, fill.quantity])).toEqual([[1, 100], [2, 50]]);
  expect(facts.independentAssets.current_cash).toBe("8495.0000");
  expect(facts.independentAssets.positions).toEqual([{ security: "600000.SH", quantity: 150 }]);
  expect(facts.reconciliation.status).toBe("MATCH");
  const account = await page.request.get(`/api/v1/accounts/${accountId}`).then((response) => response.json());
  expect(account.account.reservations).toContainEqual(expect.objectContaining({ clientOrderId, status: "RELEASED", capturedCashAmount: "1505.0000" }));
  verifyV13RunWithCli(testRunId, proposalId!, clientOrderId, "8495.0000", "2005.0000", "CANCELLED", "RELEASED", "1505.0000");
  console.info(`[V1.3 L16 Web/API/CLI cancel precondition recovery] ${JSON.stringify({ testRunId, seed, rejectedWithoutFill: rejectedEarlyCancel.status(), rejectedWithBufferedFill: bufferedCancelRequest.status(), appliedArrivalSequence: [2, 1, 3], proposalId, clientOrderId, fills: facts.fills.map((fill: { brokerSequence: number }) => fill.brokerSequence), cash: facts.independentAssets.current_cash, reconciliation: facts.reconciliation.status, reservation: account.account.reservations.find((item: { clientOrderId: string }) => item.clientOrderId === clientOrderId)?.status })}`);
}

test("V1.3 L16 rejects premature cancel without side effects and recovers after an out-of-order Fill", async ({ page }) => {
  test.setTimeout(90_000);
  await runV13L16CancelPreconditionRecovery(page, 20261015);
});

function verifyV13MultiLegRunWithCli(testRunId: string, proposalId: string, clientOrderId: string, expectedCash: string, expectedReservations: string[]) {
  const cli = spawnSync(process.execPath, ["scripts/verify-stage.mjs", "--stage", "V1.3", "--run", testRunId, "--proposal", proposalId, "--client-order", clientOrderId, "--check-only"], {
    cwd: resolve(process.cwd(), "../.."), encoding: "utf8", env: process.env,
  });
  expect(cli.status, cli.stderr).toBe(2);
  const output = JSON.parse(cli.stdout);
  expect(output.run.testRunId).toBe(testRunId);
  expect(output.order.authorization).toMatchObject({ proposalId, testRunId });
  expect(output.order.orders).toHaveLength(2);
  expect(output.order.fills).toHaveLength(2);
  expect(output.order.reconciliation.status).toBe("MATCH");
  expect(output.order.independentAssets.current_cash).toBe(expectedCash);
  expect(output.order.reconciliation.portfolio.reservations.map((item: any) => item.capturedCashAmount).sort()).toEqual(expectedReservations.sort());
}

function verifyV13StrictMixedRunWithCli(testRunId: string, proposalId: string, clientOrderId: string, expectedCash: string, expectedReceivable: string) {
  console.info(`[V1.3 strict-cash MANUAL Web/CLI same-run] testRunId=${testRunId}`);
  const cli = spawnSync(process.execPath, ["scripts/verify-stage.mjs", "--stage", "V1.3", "--run", testRunId, "--proposal", proposalId, "--client-order", clientOrderId, "--check-only"], {
    cwd: resolve(process.cwd(), "../.."), encoding: "utf8", env: process.env,
  });
  expect(cli.status, cli.stderr).toBe(2);
  const output = JSON.parse(cli.stdout);
  expect(output.run.testRunId).toBe(testRunId);
  expect(output.order.authorization).toMatchObject({ proposalId, testRunId });
  expect(output.order.orders).toHaveLength(2);
  expect(output.order.fills).toHaveLength(2);
  expect(output.order.reconciliation.status).toBe("MATCH");
  expect(output.order.independentAssets.current_cash).toBe(expectedCash);
  expect(output.order.independentAssets.unsettledReceivables).toEqual([expect.objectContaining({ amount: expectedReceivable, status: "PENDING", currency: "CNY" })]);
}

function verifyV14RunWithCli(testRunId: string) {
  console.info(`[V1.4 Web/CLI same-run] testRunId=${testRunId}`);
  const cli = spawnSync(process.execPath, ["scripts/verify-stage.mjs", "--stage", "V1.4", "--run", testRunId, "--check-only"], {
    cwd: resolve(process.cwd(), "../.."),
    encoding: "utf8",
    env: process.env
  });
  expect(cli.status, cli.stderr).toBe(0);
  expect(cli.stdout).toContain(`"testRunId": "${testRunId}"`);
  expect(cli.stdout).toContain('"status": "COMPLETED"');
}

async function verifyV15RunWithCli(testRunId: string, sessionCookie: string, expectedRunStatus: "WAITING" | "COMPLETED" = "WAITING") {
  const root = resolve(process.cwd(), "../..");
  const env = { ...process.env, STOCKQUANT_SESSION_COOKIE: sessionCookie };
  const cli = spawnSync(process.execPath, ["scripts/verify-stage.mjs", "--stage", "V1.5", "--run", testRunId, "--check-only"], { cwd: root, encoding: "utf8", env, timeout: 30_000 });
  expect(cli.status, cli.stderr).toBe(expectedRunStatus === "COMPLETED" ? 0 : 2);
  expect(cli.stdout).toContain(`"testRunId": "${testRunId}"`);
  expect(cli.stdout).toContain(`"status": "${expectedRunStatus}"`);

  const exported = spawnSync(process.execPath, [resolve(root, "scripts/evidence-export.mjs"), "--stage", "V1.5", "--run", testRunId], {
    cwd: process.env.STOCKQUANT_EVIDENCE_EXPORT_CWD ?? root,
    encoding: "utf8",
    env: { ...env, STOCKQUANT_PLATFORM_API_URL: process.env.STOCKQUANT_PLATFORM_API_URL, STOCKQUANT_EVIDENCE_SESSION_COOKIE: sessionCookie },
    timeout: 30_000,
  });
  expect(exported.status, exported.stderr).toBe(0);
  const result = JSON.parse(exported.stdout) as { outputDirectory?: string; stageId?: string; kind?: string };
  expect(result.stageId).toBe("V1.5");
  expect(result.kind).toBe("TEST_RUN_EVIDENCE");
  expect(result.outputDirectory).toContain(`evidence/local/V1.5/${testRunId}`);
  const sharedEvidenceResponse = await fetch(`${process.env.STOCKQUANT_PLATFORM_API_URL}/api/v1/acceptance/runs/${testRunId}/evidence`, {
    headers: { cookie: sessionCookie },
    signal: AbortSignal.timeout(10_000),
  });
  expect(sharedEvidenceResponse.status, await sharedEvidenceResponse.clone().text()).toBe(200);
  const sharedEvidence = await sharedEvidenceResponse.json() as {
    evidenceVersion?: string;
    mode?: { environmentMode?: string; dataMode?: string; brokerMode?: string };
    run?: { testRunId?: string; stageId?: string; ownerId?: string; assertions?: unknown[] };
    assertions?: unknown[];
    manualConclusion?: string;
  };
  expect(sharedEvidence.evidenceVersion).toBe("v2-stage-run-1");
  expect(sharedEvidence.run?.testRunId).toBe(testRunId);
  expect(sharedEvidence.run?.stageId).toBe("V1.5");
  expect(sharedEvidence.run?.ownerId).toBeTruthy();
  expect(sharedEvidence.mode).toEqual({ environmentMode: "PAPER", dataMode: "FIXTURE", brokerMode: "FAKE" });
  expect(sharedEvidence.assertions).toEqual(sharedEvidence.run?.assertions);
  expect(sharedEvidence.manualConclusion).toBe("NOT_RUN");
  console.info(`[V1.5 shared StageRun evidence] ${JSON.stringify({ testRunId, ownerId: sharedEvidence.run?.ownerId, stageId: sharedEvidence.run?.stageId, evidenceVersion: sharedEvidence.evidenceVersion, mode: sharedEvidence.mode, assertionCount: sharedEvidence.assertions?.length, manualConclusion: sharedEvidence.manualConclusion, responseStatus: sharedEvidenceResponse.status })}`);
}

test("V1.1 normal scenario creates an isolated run with backend assertions", async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto("/acceptance/v1/v1.1");
  await expect(page.getByRole("heading", { name: "V1.1 环境、账户初始化与 Web 验收中心" })).toBeVisible();
  await page.getByRole("button", { name: "准备隔离运行：normal" }).click();
  await expect(page.getByTestId("test-run-id")).not.toHaveText("", { timeout: 10_000 });
  await expect(page.getByTestId("run-status")).toHaveText("COMPLETED", { timeout: 10_000 });
  await expect(page.getByText("V1.1-ACCOUNT-INIT-001")).toBeVisible();
  await expect(page.getByText("PASS").first()).toBeVisible();
  const captureProject = (process.env.STOCKQUANT_ISOLATED_V11_PROJECT ?? `local-${process.pid}`).replace(/[^a-zA-Z0-9-]+/gu, "-");
  const captureDirectory = resolve(process.cwd(), "../..", `evidence/audits/${new Date().toISOString().slice(0, 10)}-v11-browser-captures-${captureProject}`);
  mkdirSync(captureDirectory, { recursive: true });
  const normalScreenshot = await page.screenshot({ path: resolve(captureDirectory, "V1-1-normal-scenario.png"), fullPage: false, animations: "disabled", timeout: 10_000 });
  console.info(`[V1.1 browser capture] ${JSON.stringify({ screenshotPath: resolve(captureDirectory, "V1-1-normal-scenario.png"), screenshotSha256: createHash("sha256").update(normalScreenshot).digest("hex") })}`);
  const testRunId = (await page.getByTestId("test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  const isolatedProject = process.env.STOCKQUANT_ISOLATED_V11_PROJECT;
  expect(isolatedProject, "mode injection must be checked against the disposable V1.1 database").toMatch(/^sq-v11-stage-[a-f0-9]{20}$/u);
  const persistedRunCountBeforeInjection = readV11PersistedRunCount(isolatedProject!);
  for (const modes of v11ClientModeInjectionCases) {
    const accountMode = await page.request.post(`/api/v1/acceptance/runs/${testRunId}/accounts/us`, { data: modes });
    expect(accountMode.status(), `V1.1 account mode ${JSON.stringify(modes)}: ${await accountMode.text()}`).toBe(422);
    const runMode = await page.request.post("/api/v1/acceptance/v1/v1.1/runs", { data: { scenarioId: "normal", seed: 20260907, ...modes } });
    expect(runMode.status(), `V1.1 run mode ${JSON.stringify(modes)}: ${await runMode.text()}`).toBe(422);
  }
  expect(readV11PersistedRunCount(isolatedProject!)).toBe(persistedRunCountBeforeInjection);
  const injectedRunFacts = await page.request.post("/api/v1/acceptance/v1/v1.1/runs", { data: { scenarioId: "normal", seed: 20260907, status: "COMPLETED", cash: { amount: "999999.00", currency: "CNY" } } });
  expect(injectedRunFacts.status(), await injectedRunFacts.text()).toBe(422);
  expect(await injectedRunFacts.text()).toContain("unsupported fields");
  const injectedAccountFacts = await page.request.post(`/api/v1/acceptance/runs/${testRunId}/accounts/us`, { data: { status: "READY", cash: { amount: "999999.00", currency: "USD" }, positions: [] } });
  expect(injectedAccountFacts.status(), await injectedAccountFacts.text()).toBe(422);
  const unchangedRun = await (await page.request.get(`/api/v1/acceptance/runs/${testRunId}`)).json();
  expect(unchangedRun.status).toBe("COMPLETED");
  await verifyV11RunWithCli(testRunId!, await currentSessionCookie(page));
  await verifyV11RunAgainstIsolatedLedgers(testRunId!, page);

  await page.route(`**/api/v1/acceptance/runs/${testRunId}`, (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ ...unchangedRun, unrecognizedField: "must be rejected by the browser contract" })
  }));
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("Invalid V1.1 acceptance run response");
  await expect(page.getByRole("alert")).toContainText("must NOT have additional properties");
});

test("V1.1 rejection scenario persists denial assertions visible to the same-run CLI", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.1");
  await page.getByRole("button", { name: "准备隔离运行：rejection" }).click();
  await expect(page.getByTestId("run-status")).toHaveText("COMPLETED", { timeout: 10_000 });
  await expect(page.getByText("V1.1-ACCOUNT-AUTHORIZATION-001")).toBeVisible();
  await expect(page.getByText("V1.1-ACCOUNT-CONFLICT-001")).toBeVisible();
  const testRunId = (await page.getByTestId("test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  await verifyV11RunWithCli(testRunId!, await currentSessionCookie(page));
  await verifyV11RunAgainstIsolatedLedgers(testRunId!, page);
});

test("V1.1 recovery resumes the same run after restarting only the verified isolated Portfolio container", async ({ page }) => {
  const project = process.env.STOCKQUANT_ISOLATED_V11_PROJECT;
  expect(project, "recovery E2E requires the isolated V1.1 harness").toMatch(/^sq-v11-stage-(?:[a-f0-9]{20}|web)$/u);
  await page.goto("/acceptance/v1/v1.1");
  await page.getByRole("button", { name: "准备隔离运行：recovery" }).click();
  await expect(page.getByTestId("run-status")).toHaveText("WAITING", { timeout: 10_000 });
  const testRunId = (await page.getByTestId("test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);

  for (const modes of v11ClientModeInjectionCases) {
    const response = await page.request.post(`/api/v1/acceptance/runs/${testRunId}/continue-recovery`, { data: modes });
    expect(response.status(), `V1.1 recovery mode ${JSON.stringify(modes)}: ${await response.text()}`).toBe(422);
    const unchanged = await (await page.request.get(`/api/v1/acceptance/runs/${testRunId}`)).json();
    expect(unchanged.status).toBe("WAITING");
  }

  const expected = spawnSync("docker", ["compose", "-p", project!, "-f", "infra/compose/docker-compose.v11-integration.yml", "ps", "-q", "portfolio-risk-service"], { encoding: "utf8" });
  expect(expected.status, expected.stderr).toBe(0);
  expect(expected.stdout.trim()).not.toBe("");
  const actual = spawnSync("docker", ["compose", "-p", project!, "--env-file", ".env.local", "-f", "infra/compose/docker-compose.yml", "ps", "-q", "portfolio-risk-service"], { encoding: "utf8" });
  expect(actual.status, actual.stderr).toBe(0);
  expect(actual.stdout.trim()).toBe(expected.stdout.trim());
  const restart = spawnSync("docker", ["compose", "-p", project!, "--env-file", ".env.local", "-f", "infra/compose/docker-compose.yml", "restart", "portfolio-risk-service"], { encoding: "utf8" });
  expect(restart.status, restart.stderr).toBe(0);
  await expect.poll(() => {
    const health = spawnSync("docker", ["inspect", "--format", "{{.State.Health.Status}}", expected.stdout.trim()], { encoding: "utf8" });
    return health.status === 0 ? health.stdout.trim() : `inspect failed: ${health.stderr}`;
  }, { timeout: 30_000, message: "isolated Portfolio Risk must pass its ready healthcheck before recovery continues" }).toBe("healthy");

  await page.getByRole("button", { name: "重启后继续核对" }).click();
  await expect(page.getByTestId("run-status")).toHaveText("COMPLETED", { timeout: 15_000 });
  await expect(page.getByText("V1.1-RECOVERY-001")).toBeVisible();
  await verifyV11RunWithCli(testRunId!, await currentSessionCookie(page));
  await verifyV11RunAgainstIsolatedLedgers(testRunId!, page);
});

test("V1.2 normal, rejection, and recovery-probe runs are persisted and verified by the same-run CLI", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/acceptance/v1/v1.2");
  await page.getByRole("button", { name: "预览正常 Fixture" }).click();
  await expect(page.getByTestId("normal-preview")).toContainText("v1.2-market-data-1");
  const normalPreview = JSON.parse((await page.getByTestId("normal-preview").textContent()) ?? "{}");
  expect(normalPreview).toMatchObject({ dataMode: "FIXTURE", barCount: 6, securityCount: 2, quality: { status: "READY", errors: [] } });
  expect(normalPreview.bars.every((bar: any) => bar.adjustment === "raw" && bar.securityId && bar.ticker)).toBe(true);
  await page.getByRole("button", { name: "预览未来数据拒绝样本" }).click();
  await expect(page.getByTestId("bad-preview")).toContainText("FUTURE_DATA");
  const badPreview = JSON.parse((await page.getByTestId("bad-preview").textContent()) ?? "{}");
  expect(badPreview.quality.status).toBe("REJECTED");
  expect(badPreview.quality.errors.map((error: any) => error.code)).toContain("FUTURE_DATA");
  await page.getByRole("button", { name: "读取双市场研究 Fixture" }).click();
  await expect(page.getByTestId("research-fixture-preview")).toContainText("v1.2-market-data-5");
  await expect(page.getByTestId("research-fixture-preview")).toContainText("774");
  await expect(page.getByTestId("research-fixture-preview")).toContainText("13");
  await page.getByRole("button", { name: "运行 Qlib CPU 探针" }).click();
  await expect(page.getByTestId("qlib-probe")).toContainText("READY");
  await page.getByRole("button", { name: "运行 RD-Agent 兼容探针" }).click();
  await expect(page.getByTestId("rdagent-probe")).toContainText("fixed-probe-ok");
  const rdagentProbe = JSON.parse((await page.getByTestId("rdagent-probe").textContent()) ?? "{}");
  expect(rdagentProbe).toMatchObject({ adapter: "rdagent", executionBoundary: "isolated-qlib-worker-container", dockerSocketMounted: false, codeProbe: { status: "READY", result: "fixed-probe-ok", value: 42 }, modelCalls: "NOT_RUN" });
  expect(rdagentProbe.codeProbe.sourceSha256).toMatch(/^[a-f0-9]{64}$/u);

  for (const scenario of ["normal", "rejection", "recovery"] as const) {
    await page.getByLabel("V1.2 验收场景").selectOption(scenario);
    await page.getByRole("button", { name: "运行 V1.2 场景" }).click();
    const expectedStatus = "COMPLETED";
    await expect(page.getByTestId("v12-run-status")).toHaveText(expectedStatus, { timeout: 150_000 });
    const runEvidence = page.getByTestId("v12-run-evidence");
    if (scenario === "normal") {
      await expect(runEvidence).toContainText("v1.2-market-data-1");
      await expect(page.getByText("V1.2-DATA-NORMAL-001")).toBeVisible();
      await expect(page.getByText("V1.2-FACTOR-PREVIEW-001")).toBeVisible();
      await expect(runEvidence).toContainText("v1.2-qlib-strategy-artifact-v1");
      await expect(runEvidence).toContainText("temporalValidation");
      const evidence = JSON.parse((await runEvidence.textContent()) ?? "{}");
      const artifact = await page.evaluate(async (url) => {
        const response = await fetch(url);
        const body = await response.json();
        return { ok: response.ok, schemaVersion: body.payload?.schemaVersion, sha256: body.sha256, artifactRef: body.artifactRef, strategyCount: body.payload?.strategies?.length, strategiesHaveReasons: body.payload?.strategies?.every((item: any) => typeof item.reason === "string" && item.reason.length > 0), targetsHaveReasons: body.payload?.strategies?.filter((item: any) => item.mode === "TOPK").every((item: any) => item.targets.every((target: any) => typeof target.reason === "string" && target.reason.length > 0)), predictionCount: body.payload?.predictions?.length, distinctPredictionCount: new Set(body.payload?.predictions?.map((item: any) => item.prediction)).size, markets: [...new Set(body.payload?.predictions?.map((item: any) => item.market))] };
      }, evidence.qlibFit.artifactUrl);
      expect(artifact).toMatchObject({ ok: true, schemaVersion: "v1.2-qlib-strategy-artifact-v1", sha256: evidence.qlibFit.artifactSha256, artifactRef: evidence.qlibFit.artifactRef, strategyCount: 2 });
      expect(artifact.artifactRef).toMatchObject({ schemaVersion: "artifact-ref.v1", artifactId: evidence.qlibFit.artifactId, testRunId: await page.getByTestId("v12-test-run-id").textContent(), kind: "MODEL_PREDICTIONS", sha256: evidence.qlibFit.artifactSha256, status: "PUBLISHED", sourceRef: expect.stringContaining(":v1.2:") });
      expect(artifact.strategiesHaveReasons).toBe(true);
      expect(artifact.targetsHaveReasons).toBe(true);
      expect(artifact.predictionCount).toBe(evidence.qlibFit.testPredictionCount);
      expect(artifact.distinctPredictionCount).toBeGreaterThan(1);
      expect(new Set(artifact.markets)).toEqual(new Set(["CN_A", "US_EQUITY"]));
      const normalRunId = await page.getByTestId("v12-test-run-id").textContent();
      await expect(page).toHaveURL(new RegExp(`[?&]runId=${normalRunId}`));
      await page.reload();
      await expect(page.getByTestId("v12-test-run-id")).toHaveText(normalRunId ?? "");
      await expect(page.getByTestId("v12-run-status")).toHaveText("COMPLETED");
    } else if (scenario === "rejection") {
      await expect(page.getByText("V1.2-DATA-PIT-001")).toBeVisible();
      await expect(runEvidence).toContainText("FUTURE_DATA");
    } else {
      await expect(page.getByText("V1.2-QLIB-PROBE-001")).toBeVisible();
      await expect(runEvidence).toContainText("READY");
    }
    const testRunId = (await page.getByTestId("v12-test-run-id").textContent())?.trim();
    expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
    verifyV12RunWithCli(testRunId!, expectedStatus);
    const persistedRun = await page.evaluate(async (id) => {
      const response = await fetch(`/api/v1/acceptance/v1/v1.2/runs/${id}`);
      return { ok: response.ok, run: await response.json() };
    }, testRunId!);
    expect(persistedRun.ok).toBe(true);
    console.log(`[V1.2 persisted readback] ${JSON.stringify(persistedRun.run)}`);
    if (process.env.STOCKQUANT_V12_CAPTURE_EVIDENCE === "1") {
      const root = resolve(process.cwd(), "../..");
      const project = (process.env.STOCKQUANT_ISOLATED_V12_PROJECT ?? `local-${process.pid}`).replace(/[^a-zA-Z0-9-]+/gu, "-");
      const captureDirectory = resolve(root, `evidence/audits/${new Date().toISOString().slice(0, 10)}-v12-browser-captures-${project}`);
      mkdirSync(captureDirectory, { recursive: true });
      const screenshotPath = resolve(captureDirectory, `v12-${scenario}-${testRunId}.png`);
      const screenshot = await page.screenshot({ path: screenshotPath, fullPage: true, animations: "disabled" });
      const screenshotSha256 = createHash("sha256").update(screenshot).digest("hex");
      console.log(`[V1.2 browser screenshot] ${JSON.stringify({ scenario, testRunId, path: screenshotPath.replace(`${root}/`, ""), sha256: screenshotSha256 })}`);
    }
  }

  await page.getByLabel("V1.2 验收场景").selectOption("normal");
  await page.getByRole("button", { name: "运行 V1.2 场景" }).click();
  await expect(page.getByTestId("cancel-v12-run")).toBeVisible({ timeout: 20_000 });
  const cancellationRunId = (await page.getByTestId("v12-test-run-id").textContent())?.trim();
  expect(cancellationRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  const v12BeforeInjectedCancellation = await (await page.request.get(`/api/v1/acceptance/v1/v1.2/runs/${cancellationRunId}`)).json();
  for (const modes of [
    { environmentMode: "PAPER", brokerMode: "FAKE" },
    { environmentMode: "PAPER", brokerMode: "REAL" },
    { environmentMode: "LIVE", brokerMode: "FAKE" },
    { environmentMode: "BACKTEST", brokerMode: "FAKE" },
    { environmentMode: "BACKTEST", brokerMode: "REAL" },
    { environmentMode: "LIVE", brokerMode: "REAL" },
  ]) {
    const modeCancellation = await page.request.post(`/api/v1/acceptance/v1/v1.2/runs/${cancellationRunId}/cancel`, { data: modes });
    expect(modeCancellation.status(), `V1.2 cancellation mode ${JSON.stringify(modes)}: ${await modeCancellation.text()}`).toBe(422);
    const unchanged = await (await page.request.get(`/api/v1/acceptance/v1/v1.2/runs/${cancellationRunId}`)).json();
    expect(unchanged.status).toBe(v12BeforeInjectedCancellation.status);
    expect(unchanged.evidence.qlibTask.cancelRequested).toBe(false);
  }
  const injectedCancellation = await page.request.post(`/api/v1/acceptance/v1/v1.2/runs/${cancellationRunId}/cancel`, { data: { status: "CANCELLED", cash: { amount: "999999.00", currency: "CNY" } } });
  expect(injectedCancellation.status()).toBe(422);
  const v12AfterInjectedCancellation = await (await page.request.get(`/api/v1/acceptance/v1/v1.2/runs/${cancellationRunId}`)).json();
  expect(v12AfterInjectedCancellation.status).toBe(v12BeforeInjectedCancellation.status);
  expect(v12AfterInjectedCancellation.evidence.qlibTask.cancelRequested).toBe(false);
  await page.getByTestId("cancel-v12-run").click();
  await expect(page.getByTestId("v12-run-status")).toHaveText("CANCELLED", { timeout: 30_000 });
  const cancelledEvidence = JSON.parse((await page.getByTestId("v12-run-evidence").textContent()) ?? "{}");
  expect(cancelledEvidence.qlibTask).toMatchObject({ cancelRequested: true, phase: "CANCELLED", artifactPublished: false });
  expect(cancelledEvidence.qlibFit?.artifactId).toBeUndefined();
  await expect(page.getByText("V1.2-QLIB-CANCEL-001")).toBeVisible();
  const cancelCli = spawnSync(process.execPath, ["scripts/verify-stage.mjs", "--stage", "V1.2", "--run", cancellationRunId!, "--check-only"], { cwd: resolve(process.cwd(), "../.."), encoding: "utf8", env: process.env });
  expect(cancelCli.status, cancelCli.stderr).toBe(2);
  expect(cancelCli.stdout).toContain(`"testRunId": "${cancellationRunId}"`);
  expect(cancelCli.stdout).toContain('"status": "CANCELLED"');
  const persistedCancelledRun = await page.evaluate(async (id) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.2/runs/${id}`);
    return { ok: response.ok, run: await response.json() };
  }, cancellationRunId!);
  expect(persistedCancelledRun.ok).toBe(true);
  console.log(`[V1.2 cancellation readback] ${JSON.stringify(persistedCancelledRun.run)}`);
  if (process.env.STOCKQUANT_V12_CAPTURE_EVIDENCE === "1") {
    const root = resolve(process.cwd(), "../..");
    const project = (process.env.STOCKQUANT_ISOLATED_V12_PROJECT ?? `local-${process.pid}`).replace(/[^a-zA-Z0-9-]+/gu, "-");
    const captureDirectory = resolve(root, `evidence/audits/${new Date().toISOString().slice(0, 10)}-v12-browser-captures-${project}`);
    mkdirSync(captureDirectory, { recursive: true });
    const screenshotPath = resolve(captureDirectory, `v12-cancelled-${cancellationRunId}.png`);
    const screenshot = await page.screenshot({ path: screenshotPath, fullPage: true, animations: "disabled" });
    console.log(`[V1.2 browser screenshot] ${JSON.stringify({ scenario: "cancelled", testRunId: cancellationRunId, path: screenshotPath.replace(`${root}/`, ""), sha256: createHash("sha256").update(screenshot).digest("hex") })}`);
  }

  const isolatedProject = process.env.STOCKQUANT_ISOLATED_V12_PROJECT;
  expect(isolatedProject, "Platform restart recovery requires the isolated V1.2 harness").toMatch(/^sq-v12-e2e-[a-f0-9]{20}$/u);
  await page.getByRole("button", { name: "运行 V1.2 场景" }).click();
  await expect(page.getByTestId("cancel-v12-run")).toBeVisible({ timeout: 20_000 });
  const restartRunId = (await page.getByTestId("v12-test-run-id").textContent())?.trim();
  expect(restartRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  await expect(page.getByTestId("v12-run-evidence")).toContainText("FITTING_CN_A", { timeout: 20_000 });
  const platform = spawnSync("docker", ["compose", "-p", isolatedProject!, "-f", "infra/compose/docker-compose.v12-integration.yml", "ps", "-q", "platform-api-service"], { cwd: resolve(process.cwd(), "../.."), encoding: "utf8" });
  expect(platform.status, platform.stderr).toBe(0);
  const platformContainer = platform.stdout.trim();
  expect(platformContainer).not.toBe("");
  const restart = spawnSync("docker", ["compose", "-p", isolatedProject!, "-f", "infra/compose/docker-compose.v12-integration.yml", "restart", "platform-api-service"], { cwd: resolve(process.cwd(), "../.."), encoding: "utf8", timeout: 30_000 });
  expect(restart.status, restart.stderr).toBe(0);
  await expect.poll(() => {
    const health = spawnSync("docker", ["inspect", "--format", "{{.State.Health.Status}}", platformContainer], { encoding: "utf8" });
    return health.status === 0 ? health.stdout.trim() : `inspect failed: ${health.stderr}`;
  }, { timeout: 45_000, message: "isolated Platform API must return healthy before its pending TestRun resumes" }).toBe("healthy");
  await page.reload();
  await expect(page.getByTestId("v12-test-run-id")).toHaveText(restartRunId ?? "");
  await expect(page.getByTestId("v12-run-status")).toHaveText("COMPLETED", { timeout: 150_000 });
  const resumedRun = await page.evaluate(async (id) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.2/runs/${id}`);
    return { ok: response.ok, run: await response.json() };
  }, restartRunId!);
  expect(resumedRun.ok).toBe(true);
  expect(resumedRun.run.status).toBe("COMPLETED");
  expect(resumedRun.run.evidence.qlibTask.resumeCount).toBeGreaterThanOrEqual(1);
  expect(resumedRun.run.evidence.qlibTask.phase).toBe("COMPLETED");
  expect(resumedRun.run.evidence.qlibFit.artifactId).toBeTruthy();
  verifyV12RunWithCli(restartRunId!, "COMPLETED");
  console.log(`[V1.2 Platform restart recovery] ${JSON.stringify({ testRunId: restartRunId, status: resumedRun.run.status, qlibTask: resumedRun.run.evidence.qlibTask, artifactId: resumedRun.run.evidence.qlibFit.artifactId })}`);
  if (process.env.STOCKQUANT_V12_CAPTURE_EVIDENCE === "1") {
    const root = resolve(process.cwd(), "../..");
    const project = (process.env.STOCKQUANT_ISOLATED_V12_PROJECT ?? `local-${process.pid}`).replace(/[^a-zA-Z0-9-]+/gu, "-");
    const captureDirectory = resolve(root, `evidence/audits/${new Date().toISOString().slice(0, 10)}-v12-browser-captures-${project}`);
    mkdirSync(captureDirectory, { recursive: true });
    const screenshotPath = resolve(captureDirectory, `v12-platform-restart-${restartRunId}.png`);
    const screenshot = await page.screenshot({ path: screenshotPath, fullPage: true, animations: "disabled" });
    console.log(`[V1.2 browser screenshot] ${JSON.stringify({ scenario: "platform-restart-recovery", testRunId: restartRunId, path: screenshotPath.replace(`${root}/`, ""), sha256: createHash("sha256").update(screenshot).digest("hex") })}`);
  }
});

for (const scenario of ["normal", "rejection", "recovery"] as const) {
  test(`V1.3 ${scenario} persists an owner-scoped proposal and same-run CLI remains truthful`, async ({ page }) => {
    await page.goto("/acceptance/v1/v1.3");
    await expect(page.getByRole("heading", { name: "V1.3 治理、风控与模拟券商交易链路" })).toBeVisible();
    await expect(page.getByTestId("v13-fixture-version")).toContainText(`${v13TradeFixture.fixtureId} · ${v13TradeFixture.fixtureVersion}`);
    await expect(page.getByTestId("v13-business-boundary")).toContainText("AUTO_POLICY须先人工激活");
    await page.selectOption("[aria-label='验收场景']", scenario);
    await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
    await expect(page.getByTestId("v13-test-run-id")).not.toHaveText("");
    await expect(page.getByTestId("v13-run-status")).toHaveText("WAITING");
    const evidence = page.getByTestId("v13-evidence");
    await expect(evidence).toContainText('"evidenceScope": "PLATFORM_WAITING_DECLARATION"');
    await expect(evidence).toContainText('"businessExecution": "NOT_RUN"');
    const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
    expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
    let cliSeededCnAccountId: string | undefined;
    if (scenario === "normal") {
      const session = (await page.context().cookies()).find((cookie) => cookie.name === "sq_session")?.value;
      expect(session, "formal V1.3 Web session must be available to the owner-scoped seed command").toBeTruthy();
      const seedPaper = () => spawnSync(process.execPath, [resolve(process.cwd(), "../../scripts/seed-paper.mjs"), "--stage", "V1.3", "--run", testRunId!], {
        cwd: process.cwd(), encoding: "utf8", env: { ...process.env, STOCKQUANT_SESSION_COOKIE: `sq_session=${session}` },
      });
      const firstSeed = seedPaper();
      expect(firstSeed.status, firstSeed.stderr || firstSeed.stdout).toBe(0);
      const seeded = JSON.parse(firstSeed.stdout);
      expect(seeded).toMatchObject({ testRunId, environmentMode: "PAPER", brokerMode: "FAKE", businessOrdersCreated: 0, businessFillsCreated: 0 });
      expect(seeded.markets.map((item: { market: string }) => item.market)).toEqual(["CN_A", "US_EQUITY"]);
      expect(seeded.markets.every((item: { replayed: boolean }) => item.replayed === false)).toBe(true);
      const replaySeed = seedPaper();
      expect(replaySeed.status, replaySeed.stderr || replaySeed.stdout).toBe(0);
      const replayed = JSON.parse(replaySeed.stdout);
      expect(replayed.markets.every((item: { replayed: boolean }) => item.replayed === true)).toBe(true);
      expect(replayed.markets.map((item: { accountId: string }) => item.accountId)).toEqual(seeded.markets.map((item: { accountId: string }) => item.accountId));
      cliSeededCnAccountId = seeded.markets.find((item: { market: string }) => item.market === "CN_A")?.accountId;
      console.info(`[V1.3 seed:paper CLI] ${JSON.stringify({ testRunId, firstMarkets: seeded.markets.map((item: { market: string; accountId: string; replayed: boolean }) => ({ market: item.market, accountId: item.accountId, replayed: item.replayed })), replayMarkets: replayed.markets.map((item: { market: string; accountId: string; replayed: boolean }) => ({ market: item.market, accountId: item.accountId, replayed: item.replayed })), businessOrdersCreated: 0, businessFillsCreated: 0 })}`);
    }
    await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
    await expect(page.getByTestId("v13-account-id")).toContainText(scenario === "normal" || scenario === "rejection" || scenario === "recovery" ? "CNY" : "USD");
    if (cliSeededCnAccountId) await expect(page.getByTestId("v13-account-id")).toContainText(cliSeededCnAccountId);
    await page.getByRole("button", { name: "创建MANUAL固定Fixture调仓提案" }).click();
    await expect(page.getByTestId("v13-proposal-status")).toHaveText("MANUAL_APPROVAL_PENDING");
    const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
    expect(proposalId).toMatch(/^[0-9a-f-]{36}$/iu);
    if (scenario === "normal") {
      await page.getByRole("button", { name: "人工批准", exact: true }).click();
      await expect(page.getByTestId("v13-proposal-status")).toHaveText("APPROVED_MANUAL");
      await page.getByTestId("v13-execute-proposal").click();
      await expect(page.getByTestId("v13-order")).toContainText("FILLED");
      await expect(page.getByTestId("v13-order")).toContainText(`${v13TradeFixture.markets.CN_A.order.quantity} × ${v13TradeFixture.markets.CN_A.order.price} · fee ${v13TradeFixture.markets.CN_A.order.fee}`);
      await expect(page.getByTestId("v13-account-id")).toContainText("8995");
      await expect(page.getByTestId("v13-positions")).toContainText("600000.SH");
      await expect(page.getByTestId("v13-positions")).toContainText("100");
      await expect(page.getByTestId("v13-reconciliation")).toHaveText("MATCH");
      await expect(page.getByTestId("v13-order")).toContainText(`${v13TradeFixture.markets.CN_A.order.expectedCash} ${v13TradeFixture.markets.CN_A.currency}`);
    } else if (scenario === "rejection") {
      await page.getByRole("button", { name: "人工拒绝" }).click();
      await expect(page.getByTestId("v13-proposal-status")).toHaveText("REJECTED_MANUAL");
    } else {
      const proposal = await page.request.get(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}`);
      const stored = await proposal.json();
      await page.getByRole("button", { name: "追加提案修订版本" }).click();
      await expect(page.getByTestId("v13-proposal-version")).toContainText("2 /");
      const revised = await page.request.get(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}`);
      const revisedProposal = await revised.json();
      expect(revisedProposal.proposalVersion).toBe(2);
      expect(revisedProposal.contentHash).not.toBe(stored.contentHash);
      expect(revisedProposal.status).toBe("MANUAL_APPROVAL_PENDING");
      const stale = await page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/approve`, { data: { expectedVersion: stored.proposalVersion, expectedContentHash: stored.contentHash, reason: "stale version recovery" } });
      expect(stale.status()).toBe(409);
      await expect(page.getByTestId("v13-proposal-status")).toHaveText("MANUAL_APPROVAL_PENDING");
    }
    verifyV13RunWithCli(testRunId!, proposalId!, scenario === "normal" ? `v13-${proposalId}` : undefined);
    if (scenario === "normal") {
      await page.getByTestId("v13-verify-normal-run").click();
      await expect(page.getByTestId("v13-run-status")).toHaveText("COMPLETED");
      await expect(page.getByTestId("v13-evidence")).toContainText('"businessExecution": "MANUAL_FILL_VERIFIED"');
      verifyV13RunWithCli(testRunId!, proposalId!, `v13-${proposalId}`, "8995.0000", "1005.0000", "FILLED", "CAPTURED", "1005.0000", "COMPLETED");
    }
    await page.reload();
    await expect(page.getByTestId("v13-test-run-id")).toHaveText(testRunId!);
    await expect(page.getByTestId("v13-run-status")).toHaveText(scenario === "normal" ? "COMPLETED" : "WAITING");
    await expect(page.getByTestId("v13-proposal-id")).toHaveText(proposalId!);
    await expect(page.getByTestId("v13-proposal-status")).toHaveText(scenario === "normal" ? "APPROVED_MANUAL" : scenario === "rejection" ? "REJECTED_MANUAL" : "MANUAL_APPROVAL_PENDING");
    if (scenario === "normal") {
      await expect(page.getByTestId("v13-account-id")).toContainText("8995");
      await expect(page.getByTestId("v13-positions")).toContainText("600000.SH");
      await expect(page.getByTestId("v13-order")).toContainText("FILLED");
      await expect(page.getByTestId("v13-order")).toContainText(`${v13TradeFixture.markets.CN_A.order.expectedCash} ${v13TradeFixture.markets.CN_A.currency}`);
      await expect(page.getByTestId("v13-reconciliation")).toHaveText("MATCH");
      verifyV13RunWithCli(testRunId!, proposalId!, `v13-${proposalId}`, "8995.0000", "1005.0000", "FILLED", "CAPTURED", "1005.0000", "COMPLETED");
    }
  });
}

test("V1.3 Platform proposal route rejects LIVE and REAL mode injection without trading side effects", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.3");
  const sessionResponse = await page.request.get("/api/v1/session");
  expect(sessionResponse.status()).toBe(200);
  const sessionCookie = await currentSessionCookie(page);
  const rejectedModes = [...v11ClientModeInjectionCases];
  const runCreationStatuses: number[] = [];
  for (const modes of rejectedModes) {
    const rejected = await page.request.post("/api/v1/acceptance/v1/v1.3/runs", { headers: { cookie: sessionCookie }, data: { scenarioId: "normal", seed: 20260907, ...modes } });
    runCreationStatuses.push(rejected.status());
    expect(rejected.status(), `V1.3 run creation ${JSON.stringify(modes)}: ${await rejected.text()}`).toBe(422);
  }
  await page.selectOption("[aria-label='验收场景']", "normal");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  const runClockNow = (await page.getByTestId("v13-run-clock").textContent())?.trim();
  expect(Date.parse(runClockNow ?? "")).not.toBeNaN();
  const accountInitPath = `/api/v1/acceptance/v1/v1.3/runs/${testRunId}/accounts`;
  for (const modes of rejectedModes) {
    const rejected = await page.request.post(accountInitPath, { data: { market: "CN_A", ...modes } });
    expect(rejected.status(), `account initialization ${JSON.stringify(modes)}: ${await rejected.text()}`).toBe(422);
  }
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  const accountText = (await page.getByTestId("v13-account-id").textContent()) ?? "";
  const accountId = accountText.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/iu)?.[0];
  expect(accountId).toBeTruthy();
  const initialAccountResponse = await page.request.get(`/api/v1/accounts/${accountId}`);
  expect(initialAccountResponse.status()).toBe(200);
  const initialAccount = (await initialAccountResponse.json()).account;
  const injectedAccountFacts = await page.request.post(accountInitPath, { data: { market: "CN_A", cash: { amount: "999999.00", currency: "CNY" }, positions: [{ securityId: "600000.SH", quantity: 99999 }], ledgerVersion: 999 } });
  expect(injectedAccountFacts.status()).toBe(422);
  expect(await injectedAccountFacts.text()).toContain("server-owned V1.3 business fact");
  const proposalPath = `/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals`;
  const idempotencyKey = `v13-mode-injection-${testRunId}`;
  const proposal = {
    idempotencyKey,
    accountId,
    strategyVersion: "fixture-manual-test-v1",
    approvalMode: "MANUAL_APPROVAL",
    market: "CN_A",
    currency: "CNY",
    operation: "REBALANCE",
    expiresAt: new Date(Date.parse(runClockNow!) + 4 * 60 * 60 * 1000).toISOString(),
    legs: [{ legId: "leg-1", securityId: "600000.SH", side: "BUY", quantity: 100 }],
  };
  for (const fact of [
    { status: "APPROVED_MANUAL" },
    { cash: { amount: "999999.00", currency: "CNY" } },
    { balance: "999999.00" },
    { positions: [{ securityId: "600000.SH", quantity: 99999 }] },
    { ledger: [{ type: "CLIENT_INJECTED" }] },
    { ledgerVersion: 999 },
    { orders: [{ orderId: "client-injected" }] },
    { fills: [{ fillId: "client-injected" }] },
  ]) {
    const rejected = await page.request.post(proposalPath, { data: { ...proposal, ...fact } });
    const rejectionBody = await rejected.text();
    expect(rejected.status(), `${JSON.stringify(fact)}: ${rejectionBody}`).toBe(422);
    expect(rejectionBody).toContain("server-owned V1.3 business fact");
  }
  for (const modes of rejectedModes) {
    const rejected = await page.request.post(proposalPath, { data: { ...proposal, ...modes } });
    expect(rejected.status(), JSON.stringify({ modes, body: await rejected.text() })).toBe(422);
  }

  const extraClientField = await page.request.post(proposalPath, { data: { ...proposal, clientApproved: true } });
  expect(extraClientField.status()).toBe(422);
  expect(await extraClientField.text()).toContain("unsupported client field: clientApproved");

  const accepted = await page.request.post(proposalPath, { data: proposal });
  expect(accepted.status()).toBe(201);
  const savedProposal = await accepted.json();
  expect(savedProposal).toMatchObject({ testRunId, ownerId: "acceptance-owner-1", environmentMode: "PAPER", brokerMode: "FAKE" });

  const proposalReadPath = `${proposalPath}/${savedProposal.proposalId}`;
  const bodylessRoutes = [
    [`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/external-orders/observe`, { status: "FILLED", cash: { amount: "999999.00", currency: "CNY" } }],
    [`${proposalReadPath}/orders/client-injected/sequenced-reports/1`, { fills: [{ fillId: "client-injected" }], ledgerVersion: 999 }],
    [`${proposalReadPath}/orders/client-injected/cancel-request`, { status: "CANCELLED", positions: [{ securityId: "600000.SH", quantity: 99999 }] }],
    [`${proposalReadPath}/orders/client-injected/cancel-results/1`, { status: "FILLED", fills: [{ fillId: "client-injected" }] }],
  ] as const;
  for (const [path, injectedBody] of bodylessRoutes) {
    const rejected = await page.request.post(path, { data: injectedBody });
    expect(rejected.status(), `${path}: ${await rejected.text()}`).toBe(422);
    expect(await rejected.text()).toContain("does not accept client-supplied fields");
  }
  const bodylessModeRoutes = bodylessRoutes.slice(1).map(([path]) => path);
  const bodylessModeStatuses: number[] = [];
  for (const path of bodylessModeRoutes) {
    for (const modes of rejectedModes) {
      const rejected = await page.request.post(path, { data: modes });
      bodylessModeStatuses.push(rejected.status());
      expect(rejected.status(), `${path} ${JSON.stringify(modes)}: ${await rejected.text()}`).toBe(422);
      expect(await rejected.text()).toContain("does not accept client-supplied fields");
    }
  }
  const partialFillCancelPath = `/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${savedProposal.proposalId}/orders/v13-${savedProposal.proposalId}/cancel-partial-fill`;
  const feeCorrectionPath = `/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${savedProposal.proposalId}/orders/v13-${savedProposal.proposalId}/fills/client-injected/fee-corrections`;
  const mutationModeStatuses: Record<string, number[]> = { partialFillCancel: [], feeCorrection: [] };
  for (const modes of rejectedModes) {
    const partialFillCancel = await page.request.post(partialFillCancelPath, { data: { cancelSequence: 2, ...modes } });
    mutationModeStatuses.partialFillCancel.push(partialFillCancel.status());
    expect(partialFillCancel.status(), `partial-fill cancel ${JSON.stringify(modes)}: ${await partialFillCancel.text()}`).toBe(422);

    const feeCorrection = await page.request.post(feeCorrectionPath, { data: { revision: 1, previousFee: "5.0000", correctedFee: "6.0000", ...modes } });
    mutationModeStatuses.feeCorrection.push(feeCorrection.status());
    expect(feeCorrection.status(), `fee correction ${JSON.stringify(modes)}: ${await feeCorrection.text()}`).toBe(422);
  }
  const externalOrderObservationPath = `/api/v1/acceptance/v1/v1.3/runs/${testRunId}/external-orders/observe`;
  const beforeExternalModeInjection = await page.request.get(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/reconciliation`);
  expect(beforeExternalModeInjection.status()).toBe(200);
  const externalOrderReconciliationBefore = await beforeExternalModeInjection.json();
  for (const modes of rejectedModes) {
    const rejected = await page.request.post(externalOrderObservationPath, { data: modes });
    expect(rejected.status(), `external-order observation ${JSON.stringify(modes)}: ${await rejected.text()}`).toBe(422);
    expect(await rejected.text()).toContain("does not accept client-supplied fields");
  }
  const afterExternalModeInjection = await page.request.get(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/reconciliation`);
  expect(afterExternalModeInjection.status()).toBe(200);
  expect(await afterExternalModeInjection.json()).toEqual(externalOrderReconciliationBefore);
  const proposalStateBefore = await (await page.request.get(proposalReadPath)).json();
  const revisionPath = `${proposalReadPath}/revisions/append`;
  const revisionBody = {
    expectedVersion: savedProposal.proposalVersion,
    expectedContentHash: savedProposal.contentHash,
    operation: proposal.operation,
    expiresAt: proposal.expiresAt,
    legs: proposal.legs,
    reason: "mode injection rejection test",
  };
  const injectedProposalState = await page.request.post(revisionPath, { data: { ...revisionBody, status: "APPROVED_MANUAL", ledgerVersion: 999 } });
  expect(injectedProposalState.status()).toBe(422);
  for (const modes of rejectedModes) {
    const rejected = await page.request.post(revisionPath, { data: { ...revisionBody, ...modes } });
    expect(rejected.status()).toBe(422);
    expect(await rejected.text()).toContain("trading mode is fixed by the server");
  }
  const extraRevisionField = await page.request.post(revisionPath, { data: { ...revisionBody, clientApproved: true } });
  expect(extraRevisionField.status()).toBe(422);
  expect(await extraRevisionField.text()).toContain("unsupported client field: clientApproved");
  const decisionPath = `${proposalReadPath}/approve`;
  const decisionBody = {
    expectedVersion: savedProposal.proposalVersion,
    expectedContentHash: savedProposal.contentHash,
    reason: "mode injection rejection test",
  };
  const decisionModeStatuses: Record<string, number[]> = { approve: [], reject: [] };
  for (const modes of rejectedModes) {
    const rejected = await page.request.post(decisionPath, { data: { ...decisionBody, ...modes } });
    decisionModeStatuses.approve.push(rejected.status());
    expect(rejected.status()).toBe(422);
    expect(await rejected.text()).toContain("trading mode is fixed by the server");

    const rejectedDecision = await page.request.post(`${proposalReadPath}/reject`, { data: { ...decisionBody, ...modes } });
    decisionModeStatuses.reject.push(rejectedDecision.status());
    expect(rejectedDecision.status(), `proposal reject ${JSON.stringify(modes)}: ${await rejectedDecision.text()}`).toBe(422);
    expect(await rejectedDecision.text()).toContain("trading mode is fixed by the server");
  }
  const extraDecisionField = await page.request.post(decisionPath, { data: { ...decisionBody, clientApproved: true } });
  expect(extraDecisionField.status()).toBe(422);
  expect(await extraDecisionField.text()).toContain("unsupported client field: clientApproved");
  const proposalStateAfter = await (await page.request.get(proposalReadPath)).json();
  expect(proposalStateAfter).toMatchObject({
    status: proposalStateBefore.status,
    proposalVersion: proposalStateBefore.proposalVersion,
    contentHash: proposalStateBefore.contentHash,
  });
  const sessionAdvancePath = `/api/v1/acceptance/v1/v1.3/runs/${testRunId}/clock/advance-session`;
  const injectedRunState = await page.request.post(sessionAdvancePath, { data: { accountId, expectedClock: runClockNow, status: "COMPLETED", cash: { amount: "999999.00", currency: "CNY" } } });
  expect(injectedRunState.status()).toBe(422);
  for (const modes of rejectedModes) {
    const rejected = await page.request.post(sessionAdvancePath, { data: { accountId, expectedClock: runClockNow, ...modes } });
    expect(rejected.status()).toBe(422);
    expect(await rejected.text()).toContain("trading mode is fixed by the server");
  }
  const clockAfterRejectedAdvances = await (await page.request.get(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/clock`)).json();
  expect(clockAfterRejectedAdvances.clockNow).toBe(runClockNow);

  const mandateId = "00000000-0000-4000-8000-000000000901";
  const mandatePath = `/api/v1/acceptance/v1/v1.3/runs/${testRunId}/auto-mandates`;
  const mandateCommand = {
    mandateId,
    accountId,
    strategyVersion: "fixture-auto-policy-test-v1",
    market: "CN_A",
    currency: "CNY",
    securityScope: ["600000.SH"],
    maxOrderAmount: "1000.00",
    maxTotalAmount: "1000.00",
    maxOrderCount: 1,
    validFrom: runClockNow,
    expiresAt: new Date(Date.parse(runClockNow!) + 60 * 60 * 1000).toISOString(),
    reason: "mode injection rejection test",
  };
  for (const modes of rejectedModes) {
    const rejected = await page.request.post(mandatePath, { data: { ...mandateCommand, ...modes } });
    expect(rejected.status(), `AUTO Mandate ${JSON.stringify(modes)}: ${await rejected.text()}`).toBe(422);
  }
  const extraMandateField = await page.request.post(mandatePath, { data: { ...mandateCommand, clientApproved: true } });
  expect(extraMandateField.status()).toBe(422);
  expect(await extraMandateField.text()).toContain("unsupported client field: clientApproved");
  const absentMandate = await page.request.get(`${mandatePath}/${mandateId}`);
  expect(absentMandate.status()).toBe(404);
  const createdMandateResponse = await page.request.post(mandatePath, { data: mandateCommand });
  expect(createdMandateResponse.status(), await createdMandateResponse.text()).toBe(201);
  const createdMandate = await createdMandateResponse.json();
  const activatePath = `${mandatePath}/${mandateId}/activate`;
  const activateBody = { mandateVersion: createdMandate.mandateVersion, contentHash: createdMandate.contentHash, reason: "activate after mode boundary checks" };
  for (const modes of rejectedModes) {
    const rejected = await page.request.post(activatePath, { data: { ...activateBody, ...modes } });
    expect(rejected.status(), `AUTO Mandate activation ${JSON.stringify(modes)}: ${await rejected.text()}`).toBe(422);
  }
  const extraActivationField = await page.request.post(activatePath, { data: { ...activateBody, clientApproved: true } });
  expect(extraActivationField.status()).toBe(422);
  expect(await extraActivationField.text()).toContain("unsupported client field: clientApproved");
  const pendingMandateResponse = await page.request.get(`${mandatePath}/${mandateId}`);
  expect(pendingMandateResponse.status()).toBe(200);
  expect(await pendingMandateResponse.json()).toMatchObject({ status: "PENDING" });
  const activatedMandateResponse = await page.request.post(activatePath, { data: activateBody });
  expect(activatedMandateResponse.status(), await activatedMandateResponse.text()).toBe(201);
  const pausePath = `${mandatePath}/${mandateId}/pause`;
  const pauseBody = { mandateVersion: createdMandate.mandateVersion, reason: "pause after mode boundary checks" };
  for (const modes of rejectedModes) {
    const rejected = await page.request.post(pausePath, { data: { ...pauseBody, ...modes } });
    expect(rejected.status(), `AUTO Mandate pause ${JSON.stringify(modes)}: ${await rejected.text()}`).toBe(422);
  }
  const extraPauseField = await page.request.post(pausePath, { data: { ...pauseBody, clientApproved: true } });
  expect(extraPauseField.status()).toBe(422);
  expect(await extraPauseField.text()).toContain("unsupported client field: clientApproved");
  const activeMandateResponse = await page.request.get(`${mandatePath}/${mandateId}`);
  expect(activeMandateResponse.status()).toBe(200);
  expect(await activeMandateResponse.json()).toMatchObject({ status: "ACTIVE" });
  const pausedMandateResponse = await page.request.post(pausePath, { data: pauseBody });
  expect(pausedMandateResponse.status(), await pausedMandateResponse.text()).toBe(201);
  expect(await (await page.request.get(`${mandatePath}/${mandateId}`)).json()).toMatchObject({ status: "PAUSED" });

  const executionRoutes = [
    { path: `/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${savedProposal.proposalId}/execution/submit`, body: { clientOrderId: `v13-mode-manual-${testRunId}` } },
    { path: `/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${savedProposal.proposalId}/sequenced-execution/submit`, body: { clientOrderId: `v13-mode-sequenced-${testRunId}` } },
    { path: `/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${savedProposal.proposalId}/auto-execution/submit`, body: { mandateId, mandateVersion: 1, clientOrderId: `v13-mode-auto-${testRunId}` } },
  ];
  for (const route of executionRoutes) {
    for (const modes of rejectedModes) {
      const rejected = await page.request.post(route.path, { data: { ...route.body, ...modes } });
      expect(rejected.status(), `${route.path} ${JSON.stringify(modes)}: ${await rejected.text()}`).toBe(422);
    }
  }

  const accountResponse = await page.request.get(`/api/v1/accounts/${accountId}`);
  expect(accountResponse.status()).toBe(200);
  const finalAccount = (await accountResponse.json()).account;
  expect(finalAccount).toMatchObject({ environmentMode: "PAPER", brokerMode: "FAKE", cash: { amount: "10000.0000", currency: "CNY" } });
  expect({ cash: finalAccount.cash, ledgerEntryCount: finalAccount.ledgerEntryCount, ledgerVersion: finalAccount.ledgerVersion, positions: finalAccount.positions }).toEqual({ cash: initialAccount.cash, ledgerEntryCount: initialAccount.ledgerEntryCount, ledgerVersion: initialAccount.ledgerVersion, positions: initialAccount.positions });
  const reconciliationResponse = await page.request.get(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/reconciliation`);
  expect(reconciliationResponse.status()).toBe(200);
  expect(await reconciliationResponse.json()).toMatchObject({ order_count: 0, fill_count: 0 });
  verifyV13RunWithCli(testRunId!, savedProposal.proposalId);
  const modeInjectionRouteCount = 11 + executionRoutes.length + bodylessModeRoutes.length + Object.keys(mutationModeStatuses).length;
  console.info(`[V1.3 Platform mode boundary] ${JSON.stringify({ testRunId, proposalId: savedProposal.proposalId, mandateId, rejectedModes, runCreationStatuses, accountInitializationStatuses: rejectedModes.map(() => 422), proposalCreateStatuses: rejectedModes.map(() => 422), mandateCreateStatuses: rejectedModes.map(() => 422), mandateActivationStatuses: rejectedModes.map(() => 422), mandatePauseStatuses: rejectedModes.map(() => 422), externalOrderObservationStatuses: rejectedModes.map(() => 422), decisionModeStatuses, bodylessModeRoutes: bodylessModeRoutes.map((path) => path.split("/").slice(-2).join("/")), bodylessModeStatuses, mutationModeStatuses, externalOrderReconciliationUnchanged: true, executionRoutes: executionRoutes.map(({ path }) => path.split("/").at(-2)), modeInjectionRouteCount, rejectedModeAttemptCount: rejectedModes.length * modeInjectionRouteCount, acceptedMode: "PAPER/FAKE", brokerOrders: 0, brokerFills: 0, initialLedgerEntryCount: initialAccount.ledgerEntryCount, finalLedgerEntryCount: finalAccount.ledgerEntryCount, ledgerVersionUnchanged: initialAccount.ledgerVersion === finalAccount.ledgerVersion })}`);
});

test("V1.3 L02 independent USD account executes and reconciles its frozen US Fixture", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.3");
  await page.selectOption("[aria-label='验收场景']", "normal");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByLabel("市场").selectOption("US_EQUITY");
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  await expect(page.getByTestId("v13-account-id")).toContainText("USD");
  await page.getByRole("button", { name: "创建MANUAL固定Fixture调仓提案" }).click();
  await expect(page.getByTestId("v13-proposal-status")).toHaveText("MANUAL_APPROVAL_PENDING");
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  expect(proposalId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "人工批准", exact: true }).click();
  await expect(page.getByTestId("v13-proposal-status")).toHaveText("APPROVED_MANUAL");
  await page.getByTestId("v13-execute-proposal").click();
  await expect(page.getByTestId("v13-order")).toContainText("FILLED");
  await expect(page.getByTestId("v13-order")).toContainText(`${v13TradeFixture.markets.US_EQUITY.order.quantity} × ${v13TradeFixture.markets.US_EQUITY.order.price} · fee ${v13TradeFixture.markets.US_EQUITY.order.fee}`);
  await expect(page.getByTestId("v13-order")).toContainText(`${v13TradeFixture.markets.US_EQUITY.order.expectedCash} ${v13TradeFixture.markets.US_EQUITY.currency}`);
  await expect(page.getByTestId("v13-reconciliation")).toHaveText("MATCH");
  await expect(page.getByTestId("v13-account-id")).toContainText("9749.95");
  await expect(page.getByTestId("v13-positions")).toContainText("AAPL");
  await expect(page.getByTestId("v13-positions")).toContainText("10");
  verifyV13RunWithCli(testRunId!, proposalId!, `v13-${proposalId}`, "9749.9500", "250.0500");
});

test("V1.3 MANUAL two-leg BUY batch reserves both legs, persists child orders and reconciles through same-Run CLI", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.3");
  await expect(page.getByTestId("v13-multileg-fixture")).toContainText(v13MultiLegFixture.fixtureVersion);
  await page.selectOption("[aria-label='验收场景']", "normal");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  await page.getByTestId("v13-create-multileg-proposal").click();
  await expect(page.getByTestId("v13-proposal-status")).toHaveText("MANUAL_APPROVAL_PENDING");
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  expect(proposalId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "人工批准", exact: true }).click();
  await expect(page.getByTestId("v13-proposal-status")).toHaveText("APPROVED_MANUAL");
  await page.getByTestId("v13-execute-proposal").click();
  await expect(page.getByTestId("v13-order")).toContainText(":leg:01");
  await expect(page.getByTestId("v13-order")).toContainText(":leg:02");
  await expect(page.getByTestId("v13-order")).toContainText("MATCH");
  const fixture = v13MultiLegFixture.scenarios.normal.CN_A;
  await expect(page.getByTestId("v13-account-id")).toContainText(fixture.expectedCash);
  await expect(page.getByTestId("v13-positions")).toContainText("600000.SH");
  await expect(page.getByTestId("v13-positions")).toContainText("000001.SZ");
  const clientOrderId = `v13-${proposalId}`;
  verifyV13MultiLegRunWithCli(testRunId!, proposalId!, clientOrderId, fixture.expectedCash, fixture.legs.map((leg: any) => leg.reservedCash));
  await page.reload();
  await expect(page.getByTestId("v13-order")).toContainText(":leg:01");
  await expect(page.getByTestId("v13-order")).toContainText(":leg:02");
  console.info(`[V1.3 MANUAL multi-leg] ${JSON.stringify({ testRunId, proposalId, childClientOrderIds: [`${clientOrderId}:leg:01`, `${clientOrderId}:leg:02`], expectedOrders: 2, expectedFills: 2, fixtureVersion: v13MultiLegFixture.fixtureVersion, cash: fixture.expectedCash, cliSameRunCheck: true })}`);
});

test("V1.3 MANUAL US two-leg BUY batch uses frozen USD Fixture and reconciles through same-Run CLI", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.3");
  await expect(page.getByTestId("v13-multileg-fixture")).toContainText(v13MultiLegFixture.fixtureVersion);
  await page.selectOption("[aria-label='验收场景']", "normal");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByLabel("市场").selectOption("US_EQUITY");
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  await page.getByTestId("v13-create-multileg-proposal").click();
  await expect(page.getByTestId("v13-proposal-status")).toHaveText("MANUAL_APPROVAL_PENDING");
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  expect(proposalId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "人工批准", exact: true }).click();
  await expect(page.getByTestId("v13-proposal-status")).toHaveText("APPROVED_MANUAL");
  await page.getByTestId("v13-execute-proposal").click();
  await expect(page.getByTestId("v13-order")).toContainText(":leg:01");
  await expect(page.getByTestId("v13-order")).toContainText(":leg:02");
  await expect(page.getByTestId("v13-order")).toContainText("MATCH");
  const fixture = v13MultiLegFixture.scenarios.normal.US_EQUITY;
  await expect(page.getByTestId("v13-account-id")).toContainText(fixture.expectedCash);
  await expect(page.getByTestId("v13-positions")).toContainText("AAPL");
  await expect(page.getByTestId("v13-positions")).toContainText("MSFT");
  const clientOrderId = `v13-${proposalId}`;
  verifyV13MultiLegRunWithCli(testRunId!, proposalId!, clientOrderId, fixture.expectedCash, fixture.legs.map((leg: any) => leg.reservedCash));
  await page.reload();
  await expect(page.getByTestId("v13-order")).toContainText(":leg:01");
  await expect(page.getByTestId("v13-order")).toContainText(":leg:02");
  console.info(`[V1.3 MANUAL multi-leg US] ${JSON.stringify({ testRunId, proposalId, childClientOrderIds: [`${clientOrderId}:leg:01`, `${clientOrderId}:leg:02`], expectedOrders: 2, expectedFills: 2, fixtureVersion: v13MultiLegFixture.fixtureVersion, cash: fixture.expectedCash, currency: "USD", cliSameRunCheck: true })}`);
});

test("V1.3 MANUAL mixed SELL/BUY leaves proceeds pending and uses only settled cash", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.3");
  await expect(page.getByTestId("v13-multileg-fixture")).toContainText("1.0.4");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  const accountId = (await page.getByTestId("v13-account-id").textContent())?.match(/[0-9a-f-]{36}/iu)?.[0];
  expect(accountId).toBeTruthy();
  await page.getByRole("button", { name: "创建MANUAL固定Fixture调仓提案" }).click();
  await page.getByRole("button", { name: "人工批准", exact: true }).click();
  await page.getByTestId("v13-execute-proposal").click();
  await expect(page.getByTestId("v13-order")).toContainText("FILLED");
  await expect(page.getByTestId("v13-positions")).toContainText("600000.SH");
  const setupAccount = await page.request.get(`/api/v1/accounts/${accountId}`).then((response) => response.json());
  expect(setupAccount.account).toMatchObject({ cash: { amount: "8995.0000" }, positions: [{ security: "600000.SH", quantity: 100 }] });
  const advanceResponse = page.waitForResponse((response) => response.url().includes(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/clock/advance-session`));
  await page.getByTestId("v13-advance-session").click();
  expect((await advanceResponse).status()).toBe(200);

  await page.goto(`/acceptance/v1/v1.3?runId=${testRunId}&accountId=${accountId}`);
  await expect(page.getByTestId("v13-account-id")).toContainText("8995.00");
  await page.getByTestId("v13-create-multileg-strict-manual-proposal").click();
  await expect(page.getByTestId("v13-proposal-status")).toHaveText("MANUAL_APPROVAL_PENDING");
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  expect(proposalId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "人工批准", exact: true }).click();
  await page.getByTestId("v13-execute-proposal").click();
  await expect(page.getByTestId("v13-order")).toContainText(":leg:01");
  await expect(page.getByTestId("v13-order")).toContainText(":leg:02");
  await expect(page.getByTestId("v13-order")).toContainText("MATCH");

  const result = await page.request.get(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${encodeURIComponent(`v13-${proposalId}`)}`).then((response) => response.json());
  expect(result.orders).toHaveLength(2);
  expect(result.orders.map((item: any) => item.orderSide)).toEqual(["SELL", "BUY"]);
  expect(result.independentAssets.current_cash).toBe("7790.0000");
  expect(result.independentAssets.unsettledReceivables).toEqual([expect.objectContaining({ amount: "995.0000", currency: "CNY", status: "PENDING" })]);
  const after = await page.request.get(`/api/v1/accounts/${accountId}`).then((response) => response.json());
  expect(after.account).toMatchObject({ cash: { amount: "7790.0000" }, positions: [{ security: "000001.SZ", quantity: 100 }] });
  expect(after.account.unsettledReceivables).toEqual([expect.objectContaining({ amount: "995.0000", currency: "CNY", status: "PENDING" })]);
  const sellReservation = after.account.reservations.find((item: any) => item.clientOrderId === `v13-${proposalId}:leg:01`);
  const buyReservation = after.account.reservations.find((item: any) => item.clientOrderId === `v13-${proposalId}:leg:02`);
  expect(sellReservation).toMatchObject({ side: "SELL", status: "CAPTURED", capturedQuantity: 100 });
  expect(buyReservation).toMatchObject({ side: "BUY", cashAmount: "1205.0000", status: "CAPTURED", capturedCashAmount: "1205.0000" });
  verifyV13StrictMixedRunWithCli(testRunId!, proposalId!, `v13-${proposalId}`, "7790.0000", "995.0000");
  console.info(`[V1.3 OD-014 MANUAL mixed multi-leg] ${JSON.stringify({ testRunId, proposalId, fixtureVersion: v13MultiLegFixture.fixtureVersion, settledCash: after.account.cash.amount, pendingReceivable: after.account.unsettledReceivables[0].amount, reservations: [sellReservation.status, buyReservation.status], cliSameRunCheck: true })}`);
});

test("V1.3 AUTO mixed SELL/BUY rejects a later BUY funded only by pending proceeds and releases the batch", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/acceptance/v1/v1.3");
  await page.selectOption("[aria-label='验收场景']", "normal");
  await expect(page.getByTestId("v13-multileg-fixture")).toContainText("1.0.4");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  const runEvidence = JSON.parse((await page.getByTestId("v13-evidence").textContent()) ?? "{}");
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  const accountId = (await page.getByTestId("v13-account-id").textContent())?.match(/[0-9a-f-]{36}/iu)?.[0];
  expect(accountId).toBeTruthy();
  const runPath = `/api/v1/acceptance/v1/v1.3/runs/${testRunId}`;
  const post = async (path: string, body: unknown) => page.evaluate(async ({ path, body }) => {
    const response = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  }, { path, body });
  const input = v13MultiLegFixture.scenarios.strictSettledCash.insufficientCash;
  for (let index = 0; index < input.buyCountBeforeSell; index += 1) {
    const proposal = await post(`${runPath}/proposals`, { idempotencyKey: `od014-spend-down-${index}-${testRunId}`, accountId, approvalMode: "MANUAL_APPROVAL", market: "CN_A", currency: "CNY", strategyVersion: "fixture-manual-test-v1", operation: "REBALANCE", expiresAt: new Date(Date.parse(runEvidence.runClockNow) + 4 * 60 * 60 * 1000).toISOString(), legs: [{ legId: input.setupBuy.legId, securityId: input.setupBuy.security, side: input.setupBuy.side, quantity: input.setupBuy.quantity }] });
    expect(proposal.status, JSON.stringify(proposal.body)).toBe(201);
    expect((await post(`${runPath}/proposals/${proposal.body.proposalId}/approve`, { expectedVersion: proposal.body.proposalVersion, expectedContentHash: proposal.body.contentHash, reason: "OD-014 fixture settled-cash rejection setup" })).status).toBe(201);
    const execution = await post(`${runPath}/proposals/${proposal.body.proposalId}/execution/submit`, { clientOrderId: `od014-spend-down-${index}-${proposal.body.proposalId}` });
    expect(execution.status, JSON.stringify(execution.body)).toBe(202);
    expect(execution.body.order.status).toBe("FILLED");
  }
  const depleted = await page.request.get(`/api/v1/accounts/${accountId}`).then((response) => response.json());
  expect(depleted.account).toMatchObject({ cash: { amount: input.settledCashBeforeSell }, positions: [{ security: "600000.SH", quantity: 800 }] });
  await page.goto(`/acceptance/v1/v1.3?runId=${testRunId}&accountId=${accountId}`);
  await expect(page.getByTestId("v13-positions")).toContainText('"quantity":800');
  const advancePromise = page.waitForResponse((response) => response.url().includes(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/clock/advance-session`));
  await page.getByTestId("v13-advance-session").click();
  expect((await advancePromise).status()).toBe(200);
  const currentRun = await page.request.get(runPath).then((response) => response.json());
  const sellProposal = await post(`${runPath}/proposals`, { idempotencyKey: `od014-pending-sell-${testRunId}`, accountId, approvalMode: "MANUAL_APPROVAL", market: "CN_A", currency: "CNY", strategyVersion: "fixture-manual-test-v1", operation: "REBALANCE", expiresAt: new Date(Date.parse(currentRun.evidence.runClockNow) + 4 * 60 * 60 * 1000).toISOString(), legs: [{ legId: input.setupSell.legId, securityId: input.setupSell.security, side: input.setupSell.side, quantity: input.setupSell.quantity }] });
  expect(sellProposal.status).toBe(201);
  expect((await post(`${runPath}/proposals/${sellProposal.body.proposalId}/approve`, { expectedVersion: sellProposal.body.proposalVersion, expectedContentHash: sellProposal.body.contentHash, reason: "Create the manifested pending sell receivable" })).status).toBe(201);
  const sell = await post(`${runPath}/proposals/${sellProposal.body.proposalId}/execution/submit`, { clientOrderId: `od014-pending-sell-${sellProposal.body.proposalId}` });
  expect(sell.status, JSON.stringify(sell.body)).toBe(202);
  const beforeBatch = await page.request.get(`/api/v1/accounts/${accountId}`).then((response) => response.json());
  expect(beforeBatch.account).toMatchObject({ cash: { amount: input.settledCashBeforeSell }, unsettledReceivables: [expect.objectContaining({ amount: input.expectedPendingReceivable, status: "PENDING" })] });
  const beforeReconciliation = await page.request.get(`${runPath}/reconciliation`).then((response) => response.json());

  await page.goto(`/acceptance/v1/v1.3?runId=${testRunId}&accountId=${accountId}`);
  await expect(page.getByTestId("v13-account-id")).toContainText(input.settledCashBeforeSell);
  await page.getByTestId("v13-create-auto-strict-mandate").click();
  await expect(page.getByTestId("v13-auto-mandate-state")).toContainText("PENDING");
  await page.getByTestId("v13-activate-auto-mandate").click();
  await expect(page.getByTestId("v13-auto-mandate-state")).toContainText("ACTIVE");
  const mandateId = (await page.getByTestId("v13-auto-mandate-state").textContent())?.match(/[0-9a-f-]{36}/iu)?.[0];
  expect(mandateId).toBeTruthy();
  await page.getByTestId("v13-create-auto-strict-proposal").click();
  await expect(page.getByTestId("v13-proposal-status")).toHaveText("AUTO_POLICY_PENDING");
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  expect(proposalId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByTestId("v13-execute-auto-proposal").click();
  await expect(page.getByRole("alert")).toContainText("multi-leg Portfolio resource reservation failed");

  const rootClientOrderId = `v13-auto-${proposalId}`;
  const after = await page.request.get(`/api/v1/accounts/${accountId}`).then((response) => response.json());
  expect(after.account).toMatchObject({ cash: { amount: input.settledCashBeforeSell }, positions: [{ security: "600000.SH", quantity: 700 }], unsettledReceivables: [expect.objectContaining({ amount: input.expectedPendingReceivable, status: "PENDING" })] });
  const failedReservations = after.account.reservations.filter((item: any) => item.clientOrderId.startsWith(rootClientOrderId));
  expect(failedReservations).toHaveLength(input.expectedReleasedReservations);
  expect(failedReservations[0]).toMatchObject({ side: "SELL", status: "RELEASED", capturedQuantity: 0 });
  expect(failedReservations[1]).toMatchObject({ side: "BUY", status: "RELEASED", cashAmount: "1005.0000", capturedCashAmount: "0.0000" });
  for (const suffix of ["leg:01", "leg:02", "leg:03"]) expect((await page.request.get(`${runPath}/proposals/${proposalId}/orders/${encodeURIComponent(`${rootClientOrderId}:${suffix}`)}`)).status()).toBe(404);
  expect(await page.request.get(`${runPath}/reconciliation`).then((response) => response.json())).toEqual(beforeReconciliation);
  const mandateBudget = await page.request.get(`${runPath}/auto-mandates/${mandateId}/versions/1/budget`).then((response) => response.json());
  expect(mandateBudget.snapshot).toMatchObject({ reservedAmount: "0.00", consumedAmount: "0.00", reservationCount: 1, consumedCount: 0, releasedCount: 1 });
  verifyV13RunWithCli(testRunId!, proposalId!);
  console.info(`[V1.3 OD-014 AUTO pending-cash rejection] ${JSON.stringify({ testRunId, proposalId, mandateId, settledCash: after.account.cash.amount, pendingReceivable: input.expectedPendingReceivable, releasedReservations: failedReservations.length, batchOrders: 0, reconciliation: "UNCHANGED", cliSameRunCheck: true })}`);
});

test("V1.3 MANUAL multi-leg retry recovers the committed first child after Trade Execution restarts", async ({ page }) => {
  test.setTimeout(60_000);
  const project = process.env.STOCKQUANT_V13_TEST_COMPOSE_PROJECT;
  const tradeUrl = process.env.STOCKQUANT_V13_TRADE_URL;
  expect(project).toBeTruthy();
  expect(tradeUrl).toBeTruthy();
  await page.goto("/acceptance/v1/v1.3");
  await page.selectOption("[aria-label='验收场景']", "normal");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  await page.getByTestId("v13-create-multileg-proposal").click();
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  expect(proposalId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "人工批准", exact: true }).click();
  const namespace = `v1-3-normal-${testRunId}`;
  const clientOrderId = `v13-fault-multileg-restart-${proposalId}`;
  const executionPath = `/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/execution/submit`;
  const firstAttempt = page.request.post(executionPath, { data: { clientOrderId }, timeout: 50_000 }).then(async (response) => ({ status: response.status(), body: await response.json().catch(() => null) })).catch((error: unknown) => ({ error: String(error) }));
  const firstChildClientOrderId = `${clientOrderId}:leg:01`;
  let firstChild: Record<string, unknown> | null = null;
  let lastLookup: { status: number; body: string } = { status: 0, body: "not attempted" };
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const response = await page.request.get(`${tradeUrl}/internal/v1/orders/by-client-id?namespace=${encodeURIComponent(namespace)}&clientOrderId=${encodeURIComponent(firstChildClientOrderId)}`, { headers: { authorization: `Bearer ${process.env.STOCKQUANT_SERVICE_TOKEN_PLATFORM_API}`, "x-stockquant-service-id": "platform-api-service" } });
    lastLookup = { status: response.status(), body: await response.text() };
    if (response.ok()) { firstChild = JSON.parse(lastLookup.body); break; }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  expect(firstChild, JSON.stringify(lastLookup)).toBeTruthy();
  expect(firstChild?.order).toMatchObject({ clientOrderId: firstChildClientOrderId });
  expect(["LEDGER_PENDING", "FILLED"]).toContain((firstChild as any).order.status);
  const secondChild = await page.request.get(`${tradeUrl}/internal/v1/orders/by-client-id?namespace=${encodeURIComponent(namespace)}&clientOrderId=${encodeURIComponent(`${clientOrderId}:leg:02`)}`, { headers: { authorization: `Bearer ${process.env.STOCKQUANT_SERVICE_TOKEN_PLATFORM_API}`, "x-stockquant-service-id": "platform-api-service" } });
  expect(secondChild.status()).toBe(404);
  const root = resolve(process.cwd(), "../..");
  const restarted = spawnSync("docker", ["compose", "-p", project!, "-f", "infra/compose/docker-compose.v13-integration.yml", "restart", "trade-execution-service"], { cwd: root, encoding: "utf8", env: process.env });
  expect(restarted.status, restarted.stderr).toBe(0);
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { const response = await fetch(`${tradeUrl}/ready`); if (response.ok) { ready = true; break; } } catch { /* wait for this isolated Trade process */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  expect(ready).toBe(true);
  await firstAttempt;
  const recovered = await page.request.post(executionPath, { data: { clientOrderId }, timeout: 30_000 });
  const recoveredBody = await recovered.text();
  expect(recovered.status(), recoveredBody).toBe(202);
  const result = JSON.parse(recoveredBody);
  expect(result.orders).toHaveLength(2);
  expect(result.fills).toHaveLength(2);
  expect(result.outboxes.map((item: any) => item.status)).toEqual(["DELIVERED", "DELIVERED"]);
  const aggregateResponse = await page.request.get(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${encodeURIComponent(clientOrderId)}`);
  expect(aggregateResponse.status()).toBe(200);
  const aggregate = await aggregateResponse.json();
  expect(aggregate.reconciliation.status).toBe("MATCH");
  expect(aggregate.orders).toHaveLength(2);
  expect(aggregate.fills).toHaveLength(2);
  expect(aggregate.independentAssets.current_cash).toBe(v13MultiLegFixture.scenarios.normal.CN_A.expectedCash);
  verifyV13MultiLegRunWithCli(testRunId!, proposalId!, clientOrderId, v13MultiLegFixture.scenarios.normal.CN_A.expectedCash, v13MultiLegFixture.scenarios.normal.CN_A.legs.map((leg: any) => leg.reservedCash));
  console.info(`[V1.3 MANUAL multi-leg restart recovery] ${JSON.stringify({ testRunId, proposalId, clientOrderId, injectedEvents: ["first child order/fill committed", "Trade response held", "Trade Execution container restarted", "same root clientOrderId queried and missing leg submitted"], recoveredOrders: aggregate.orders.map((item: any) => item.clientOrderId), recoveredFills: aggregate.fills.length, reconciliation: aggregate.reconciliation.status })}`);
});

test("V1.3 L08 corrects a fill fee through the formal Web route and posts the ledger adjustment idempotently", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  await page.getByRole("button", { name: "创建MANUAL固定Fixture调仓提案" }).click();
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  expect(proposalId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "人工批准", exact: true }).click();
  await page.getByTestId("v13-execute-proposal").click();
  await expect(page.getByTestId("v13-order")).toContainText("100 × 10.0000 · fee 5.0000");
  const order = await page.evaluate(async ({ id, proposal }) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${id}/proposals/${proposal}/orders/v13-${proposal}`);
    return response.json();
  }, { id: testRunId!, proposal: proposalId! });
  const fillId = order.fill.externalFillId as string;
  expect(fillId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByTestId("v13-correct-fill-fee").click();
  await expect(page.getByTestId("v13-fee-correction")).toContainText('"replayed": false');
  const correction = await page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/v13-${proposalId}/fills/${fillId}/fee-corrections`, { data: { revision: 1, previousFee: "5.0000", correctedFee: "6.0000" } });
  expect(correction.status()).toBe(202);
  expect((await correction.json()).replayed).toBe(true);
  await expect.poll(async () => {
    const response = await page.request.get(`/api/v1/accounts/${new URL(page.url()).searchParams.get("accountId")}`);
    return (await response.json()).account.cash.amount;
  }, { timeout: 15_000 }).toBe("8994.0000");
  await expect(page.getByTestId("v13-positions")).toContainText("600000.SH");
  const finalOrder = await page.evaluate(async ({ id, proposal }) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${id}/proposals/${proposal}/orders/v13-${proposal}`);
    return response.json();
  }, { id: testRunId!, proposal: proposalId! });
  expect(finalOrder.fill.fee).toBe("6.0000");
  expect(finalOrder.reconciliation.status).toBe("MATCH");
  verifyV13RunWithCli(testRunId!, proposalId!, `v13-${proposalId}`, "8994.0000", "1006.0000");
  await page.reload();
  await expect(page.getByTestId("v13-test-run-id")).toHaveText(testRunId!);
  await expect(page.getByTestId("v13-account-id")).toContainText("8994");
  console.info(`[V1.3 L08 fee correction] ${JSON.stringify({ testRunId, proposalId, externalFillId: fillId, originalFee: "5.0000", correctedFee: finalOrder.fill.fee, portfolioCash: "8994.0000", replayStatus: correction.status() })}`);
});

test("V1.3 L08 retries a fee-correction Outbox after one injected Portfolio delivery failure", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  await page.getByRole("button", { name: "创建MANUAL固定Fixture调仓提案" }).click();
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  expect(proposalId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "人工批准", exact: true }).click();
  await page.getByTestId("v13-execute-proposal").click();
  await expect(page.getByTestId("v13-order")).toContainText("FILLED");
  await page.getByTestId("v13-correct-fill-fee").click();
  const clientOrderId = `v13-${proposalId}`;
  const readOrder = async () => page.request.get(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${clientOrderId}`).then((response) => response.json());
  await expect.poll(async () => {
    const order = await readOrder();
    return { fee: order.fill.fee, outboxStatus: order.feeCorrectionOutbox?.status, attempts: order.feeCorrectionOutbox?.attempts, reconciliation: order.reconciliation.status };
  }, { timeout: 20_000, intervals: [250, 500, 1000] }).toEqual({ fee: "6.0000", outboxStatus: "DELIVERED", attempts: 2, reconciliation: "MATCH" });
  const finalOrder = await readOrder();
  expect(finalOrder.independentAssets.current_cash).toBe("8994.0000");
  const accountId = new URL(page.url()).searchParams.get("accountId");
  const account = await page.request.get(`/api/v1/accounts/${accountId}`).then((response) => response.json());
  expect(account.account.cash.amount).toBe("8994.0000");
  verifyV13RunWithCli(testRunId!, proposalId!, clientOrderId, "8994.0000", "1005.0000", "FILLED", "CAPTURED", "1006.0000");
  console.info(`[V1.3 L08 fee-correction recovery] ${JSON.stringify({ testRunId, proposalId, clientOrderId, injectedEvents: ["Portfolio fee-correction delivery rejected once", "persistent Outbox retried and delivered"], attempts: finalOrder.feeCorrectionOutbox.attempts, outboxStatus: finalOrder.feeCorrectionOutbox.status, reconciliation: finalOrder.reconciliation.status })}`);
});

test("V1.3 L08 applies a partial fill, accepted cancellation and fee correction through Web and same-Run CLI", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  await page.getByTestId("v13-create-l08-proposal").click();
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  expect(proposalId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "人工批准", exact: true }).click();
  await page.getByTestId("v13-execute-sequenced-proposal").click();
  await page.getByTestId("v13-sequence-1").click();
  await expect(page.getByTestId("v13-order")).toContainText("40 × 10.0000 · fee 1.0000");
  await expect(page.getByTestId("v13-order")).toContainText("PARTIALLY_FILLED");
  const injectedL08Cancel = await page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/v13-${proposalId}/cancel-partial-fill`, {
    data: { cancelSequence: 2, status: "FILLED", cash: "999999.00", ledgerVersion: 999 },
  });
  expect(injectedL08Cancel.status()).toBe(422);
  const afterInjectedL08Cancel = await page.request.get(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/v13-${proposalId}`).then((response) => response.json());
  expect(afterInjectedL08Cancel.order.status).toBe("PARTIALLY_FILLED");
  expect(afterInjectedL08Cancel.fill.quantity).toBe(40);
  expect(afterInjectedL08Cancel.independentAssets.current_cash).toBe("9599.0000");
  expect(afterInjectedL08Cancel.reconciliation.status).toBe("MATCH");
  await page.getByTestId("v13-l08-cancel-partial-fill").click();
  await expect(page.getByTestId("v13-sequenced-report")).toContainText('"status":"HELD"');
  await expect(page.getByTestId("v13-order")).toContainText("CANCELLED");
  await page.getByTestId("v13-correct-fill-fee").click();
  await expect(page.getByTestId("v13-fee-correction")).toContainText('"replayed": false');
  const fillId = await page.evaluate(async ({ id, proposal }) => (await (await fetch(`/api/v1/acceptance/v1/v1.3/runs/${id}/proposals/${proposal}/orders/v13-${proposal}`)).json()).fill.externalFillId, { id: testRunId!, proposal: proposalId! });
  const correctionReplay = await page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/v13-${proposalId}/fills/${fillId}/fee-corrections`, { data: { revision: 1, previousFee: "1.0000", correctedFee: "6.0000" } });
  expect(correctionReplay.status()).toBe(202);
  expect((await correctionReplay.json()).replayed).toBe(true);
  await expect.poll(async () => {
    const response = await page.request.get(`/api/v1/accounts/${new URL(page.url()).searchParams.get("accountId")}`);
    return (await response.json()).account.cash.amount;
  }, { timeout: 15_000 }).toBe("9594.0000");
  const finalOrder = await page.evaluate(async ({ id, proposal }) => (await (await fetch(`/api/v1/acceptance/v1/v1.3/runs/${id}/proposals/${proposal}/orders/v13-${proposal}`)).json()), { id: testRunId!, proposal: proposalId! });
  expect(finalOrder.order.status).toBe("CANCELLED");
  expect(finalOrder.fill.quantity).toBe(40);
  expect(finalOrder.fill.fee).toBe("6.0000");
  expect(finalOrder.reconciliation.status).toBe("MATCH");
  expect(finalOrder.independentAssets.current_cash).toBe("9594.0000");
  verifyV13RunWithCli(testRunId!, proposalId!, `v13-${proposalId}`, "9594.0000", "406.0000", "CANCELLED", "RELEASED", "406.0000");
  await page.reload();
  await expect(page.getByTestId("v13-test-run-id")).toHaveText(testRunId!);
  console.info(`[V1.3 L08 partial-fill cancellation] ${JSON.stringify({ testRunId, proposalId, quantity: 40, cancelledRemainder: 60, correctedFee: "6.0000", fakeBrokerCash: finalOrder.independentAssets.current_cash })}`);
});

test("V1.3 L07 keeps a cancel reservation through Trade restart until the sequenced result arrives", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  await page.getByTestId("v13-create-sequenced-proposal").click();
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  expect(proposalId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "人工批准", exact: true }).click();
  await page.getByTestId("v13-execute-sequenced-proposal").click();
  await page.getByTestId("v13-sequence-2-replay").click();
  await page.getByTestId("v13-sequence-1").click();
  await expect(page.getByTestId("v13-order")).toContainText("PARTIALLY_FILLED");
  const clientOrderId = `v13-${proposalId}`;
  const project = process.env.STOCKQUANT_V13_TEST_COMPOSE_PROJECT;
  const tradeUrl = process.env.STOCKQUANT_V13_TRADE_URL;
  expect(project).toMatch(/^sq-v13-web-[a-f0-9]{20}$/u);
  expect(tradeUrl).toBeTruthy();
  const cancelRequest = await page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${clientOrderId}/cancel-request`);
  expect(cancelRequest.status()).toBe(202);
  const pendingCancel = await cancelRequest.json();
  expect(pendingCancel.status).toBe("CANCEL_REQUESTED");
  expect(pendingCancel.reservation.status).toBe("HELD");
  const restart = spawnSync("docker", ["compose", "-p", project!, "-f", "infra/compose/docker-compose.v13-integration.yml", "restart", "trade-execution-service"], { cwd: resolve(process.cwd(), "../.."), encoding: "utf8", env: process.env, timeout: 20_000 });
  expect(restart.status, restart.stderr).toBe(0);
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { if ((await fetch(`${tradeUrl}/ready`)).ok) { ready = true; break; } } catch { /* wait for isolated Trade Execution restart */ }
    await new Promise((resolveReady) => setTimeout(resolveReady, 250));
  }
  expect(ready, "Trade Execution must become ready with the cancellation still unresolved").toBe(true);
  const afterRestart = await page.request.get(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${clientOrderId}`).then((response) => response.json());
  expect(afterRestart.order.status).toBe("CANCEL_REQUESTED");
  const pendingAccount = await page.request.get(`/api/v1/accounts/${new URL(page.url()).searchParams.get("accountId")}`).then((response) => response.json());
  expect(pendingAccount.account.reservations).toContainEqual(expect.objectContaining({ clientOrderId, status: "HELD", capturedCashAmount: "1505.0000" }));
  const cancelResult = await page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${clientOrderId}/cancel-results/3`);
  expect(cancelResult.status()).toBe(200);
  expect((await cancelResult.json()).order.order.status).toBe("CANCELLED");
  const facts = await page.request.get(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${clientOrderId}`).then((response) => response.json());
  expect(facts.fills.map((fill: { brokerSequence: number }) => fill.brokerSequence)).toEqual([1, 2]);
  expect(facts.fills.reduce((sum: number, fill: { quantity: number }) => sum + fill.quantity, 0)).toBe(150);
  expect(facts.order.status).toBe("CANCELLED");
  expect(facts.reconciliation.status).toBe("MATCH");
  expect(facts.independentAssets.current_cash).toBe("8495.0000");
  expect(facts.independentAssets.positions).toEqual([{ security: "600000.SH", quantity: 150 }]);
  const accountId = new URL(page.url()).searchParams.get("accountId");
  const account = await page.request.get(`/api/v1/accounts/${accountId}`).then((response) => response.json());
  expect(account.account.reservations).toContainEqual(expect.objectContaining({ clientOrderId, status: "RELEASED", capturedCashAmount: "1505.0000" }));
  verifyV13RunWithCli(testRunId!, proposalId!, clientOrderId, "8495.0000", "2005.0000", "CANCELLED", "RELEASED", "1505.0000");
  console.info(`[V1.3 L07 cancellation restart recovery] ${JSON.stringify({ testRunId, proposalId, clientOrderId, injectedEvents: ["seq=2 buffered and seq=1 applied", "cancel request persisted", "Trade Execution restarted with reservation HELD", "seq=3 accepted cancel result applied"], deliveredFillSequences: facts.fills.map((fill: { brokerSequence: number }) => fill.brokerSequence), filledQuantity: 150, releasedRemainder: 50, reservation: account.account.reservations.find((item: { clientOrderId: string }) => item.clientOrderId === clientOrderId)?.status })}`);
});

test("V1.3 L16 rejected cancel restores the working order and keeps the reservation until retry succeeds", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  await page.getByTestId("v13-create-sequenced-proposal").click();
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  expect(proposalId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "人工批准", exact: true }).click();
  await page.getByTestId("v13-execute-sequenced-proposal").click();
  await page.getByTestId("v13-sequence-1").click();
  await page.getByTestId("v13-sequence-2-replay").click();
  await expect(page.getByTestId("v13-order")).toContainText("PARTIALLY_FILLED");
  const clientOrderId = `v13-${proposalId}`;
  const orderPath = `/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${clientOrderId}`;
  const cancelPath = `/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${clientOrderId}/cancel-request`;
  const resultPath = `/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${clientOrderId}/cancel-results`;
  expect((await page.request.post(cancelPath)).status()).toBe(202);
  const rejected = await page.request.post(`${resultPath}/3`, { data: { outcome: "REJECTED" } });
  expect(rejected.status()).toBe(200);
  const rejectedFacts = await page.request.get(orderPath).then((response) => response.json());
  expect(rejectedFacts.order.status).toBe("PARTIALLY_FILLED");
  expect(rejectedFacts.fills.map((fill: { brokerSequence: number }) => fill.brokerSequence)).toEqual([1, 2]);
  expect(rejectedFacts.reconciliation.status).toBe("MATCH");
  const accountId = new URL(page.url()).searchParams.get("accountId");
  let account = await page.request.get(`/api/v1/accounts/${accountId}`).then((response) => response.json());
  expect(account.account.reservations).toContainEqual(expect.objectContaining({ clientOrderId, status: "HELD", capturedCashAmount: "1505.0000" }));
  const cli = spawnSync(process.execPath, ["scripts/verify-stage.mjs", "--stage", "V1.3", "--run", testRunId!, "--proposal", proposalId!, "--client-order", clientOrderId, "--check-only"], { cwd: resolve(process.cwd(), "../.."), encoding: "utf8", env: process.env });
  expect(cli.status, cli.stderr).toBe(2);
  expect(cli.stdout).toContain(`"testRunId": "${testRunId}"`);
  expect(cli.stdout).toContain('"status": "PARTIALLY_FILLED"');
  expect(cli.stdout).toContain('"status": "HELD"');
  expect((await page.request.post(cancelPath)).status()).toBe(202);
  const accepted = await page.request.post(`${resultPath}/4`);
  expect(accepted.status()).toBe(200);
  const finalFacts = await page.request.get(orderPath).then((response) => response.json());
  expect(finalFacts.order.status).toBe("CANCELLED");
  expect(finalFacts.reconciliation.status).toBe("MATCH");
  account = await page.request.get(`/api/v1/accounts/${accountId}`).then((response) => response.json());
  expect(account.account.reservations).toContainEqual(expect.objectContaining({ clientOrderId, status: "RELEASED", capturedCashAmount: "1505.0000" }));
  console.info(`[V1.3 L16 rejected cancellation retry] ${JSON.stringify({ testRunId, proposalId, clientOrderId, rejectedSequence: 3, retryAcceptedSequence: 4, rejectedOrderStatus: rejectedFacts.order.status, retainedReservation: "HELD", finalOrderStatus: finalFacts.order.status, finalReservation: "RELEASED" })}`);
});

test("V1.3 L16 buffers an early rejected cancel behind a missing Fill and preserves the reservation through retry", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  await page.getByTestId("v13-create-sequenced-proposal").click();
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  expect(proposalId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "人工批准", exact: true }).click();
  await page.getByTestId("v13-execute-sequenced-proposal").click();
  await page.getByTestId("v13-sequence-1").click();
  await expect(page.getByTestId("v13-order")).toContainText("PARTIALLY_FILLED");

  const clientOrderId = `v13-${proposalId}`;
  const orderPath = `/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${clientOrderId}`;
  const cancelPath = `${orderPath}/cancel-request`;
  const resultPath = `${orderPath}/cancel-results`;
  expect((await page.request.post(cancelPath)).status()).toBe(202);
  const earlyRejection = await page.request.post(`${resultPath}/3`, { data: { outcome: "REJECTED" } });
  expect(earlyRejection.status()).toBe(200);
  expect(await earlyRejection.json()).toMatchObject({ resolution: { buffered: true }, order: { order: { status: "CANCEL_REQUESTED" } } });

  await page.getByTestId("v13-sequence-2-replay").click();
  await expect(page.getByTestId("v13-order")).toContainText("PARTIALLY_FILLED");
  await expect(page.getByTestId("v13-sequenced-report")).toContainText('"lastAppliedSequence":3');
  const rejectedFacts = await page.request.get(orderPath).then((response) => response.json());
  expect(rejectedFacts.order.status).toBe("PARTIALLY_FILLED");
  expect(rejectedFacts.fills.map((fill: { brokerSequence: number }) => fill.brokerSequence)).toEqual([1, 2]);
  expect(rejectedFacts.reconciliation.status).toBe("MATCH");
  const accountId = new URL(page.url()).searchParams.get("accountId");
  let account = await page.request.get(`/api/v1/accounts/${accountId}`).then((response) => response.json());
  expect(account.account.reservations).toContainEqual(expect.objectContaining({ clientOrderId, status: "HELD", capturedCashAmount: "1505.0000" }));

  const cli = spawnSync(process.execPath, ["scripts/verify-stage.mjs", "--stage", "V1.3", "--run", testRunId!, "--proposal", proposalId!, "--client-order", clientOrderId, "--check-only"], { cwd: resolve(process.cwd(), "../.."), encoding: "utf8", env: process.env });
  expect(cli.status, cli.stderr).toBe(2);
  expect(cli.stdout).toContain(`"testRunId": "${testRunId}"`);
  expect(cli.stdout).toContain('"status": "PARTIALLY_FILLED"');
  expect(cli.stdout).toContain('"status": "HELD"');

  expect((await page.request.post(cancelPath)).status()).toBe(202);
  expect((await page.request.post(`${resultPath}/4`, { data: { outcome: "ACCEPTED" } })).status()).toBe(200);
  const finalFacts = await page.request.get(orderPath).then((response) => response.json());
  expect(finalFacts.order.status).toBe("CANCELLED");
  expect(finalFacts.reconciliation.status).toBe("MATCH");
  account = await page.request.get(`/api/v1/accounts/${accountId}`).then((response) => response.json());
  expect(account.account.reservations).toContainEqual(expect.objectContaining({ clientOrderId, status: "RELEASED", capturedCashAmount: "1505.0000" }));
  console.info(`[V1.3 L16 early rejected cancellation recovery] ${JSON.stringify({ testRunId, proposalId, clientOrderId, injectedEvents: ["seq=1 Fill", "seq=3 REJECTED cancel buffered", "seq=2 Fill drains rejection"], rejectedOrderStatus: rejectedFacts.order.status, retainedReservation: "HELD", retryAcceptedSequence: 4, finalOrderStatus: finalFacts.order.status, finalReservation: "RELEASED", reconciliation: finalFacts.reconciliation.status })}`);
});

test("V1.3 US_EQUITY L16 rejected cancel keeps the AAPL reservation and allows same-order retry", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByLabel("市场").selectOption("US_EQUITY");
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  await page.getByTestId("v13-create-sequenced-proposal").click();
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  expect(proposalId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "人工批准", exact: true }).click();
  await page.getByTestId("v13-execute-sequenced-proposal").click();
  await page.getByTestId("v13-sequence-1").click();
  await page.getByTestId("v13-sequence-2-replay").click();
  await expect(page.getByTestId("v13-order")).toContainText("6249.9500 USD");
  const clientOrderId = `v13-${proposalId}`;
  const orderPath = `/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${clientOrderId}`;
  const cancelPath = `/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${clientOrderId}/cancel-request`;
  const resultPath = `/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${clientOrderId}/cancel-results`;
  expect((await page.request.post(cancelPath)).status()).toBe(202);
  const rejected = await page.request.post(`${resultPath}/3`, { data: { outcome: "REJECTED" } });
  expect(rejected.status()).toBe(200);
  const replayedRejection = await page.request.post(`${resultPath}/3`, { data: { outcome: "REJECTED" } });
  expect(replayedRejection.status()).toBe(200);
  expect((await replayedRejection.json()).resolution.replayed).toBe(true);
  const conflictingResult = await page.request.post(`${resultPath}/3`, { data: { outcome: "ACCEPTED" } });
  expect(conflictingResult.status()).toBe(409);
  const rejectedFacts = await page.request.get(orderPath).then((response) => response.json());
  expect(rejectedFacts.order.status).toBe("PARTIALLY_FILLED");
  expect(rejectedFacts.fills.map((fill: { brokerSequence: number; quantity: number }) => [fill.brokerSequence, fill.quantity])).toEqual([[1, 100], [2, 50]]);
  expect(rejectedFacts.independentAssets).toMatchObject({ current_cash: "6249.9500", currency: "USD", positions: [{ security: "AAPL", quantity: 150 }] });
  expect(rejectedFacts.reconciliation.status).toBe("MATCH");
  const accountId = new URL(page.url()).searchParams.get("accountId");
  let account = await page.request.get(`/api/v1/accounts/${accountId}`).then((response) => response.json());
  expect(account.account.reservations).toContainEqual(expect.objectContaining({ clientOrderId, status: "HELD", capturedCashAmount: "3750.0500" }));
  verifyV13RunWithCli(testRunId!, proposalId!, clientOrderId, "6249.9500", "5000.0500", "PARTIALLY_FILLED", "HELD", "3750.0500");
  expect((await page.request.post(cancelPath)).status()).toBe(202);
  const accepted = await page.request.post(`${resultPath}/4`);
  expect(accepted.status()).toBe(200);
  const finalFacts = await page.request.get(orderPath).then((response) => response.json());
  expect(finalFacts.order.status).toBe("CANCELLED");
  expect(finalFacts.independentAssets).toMatchObject({ current_cash: "6249.9500", currency: "USD", positions: [{ security: "AAPL", quantity: 150 }] });
  expect(finalFacts.reconciliation.status).toBe("MATCH");
  account = await page.request.get(`/api/v1/accounts/${accountId}`).then((response) => response.json());
  expect(account.account.reservations).toContainEqual(expect.objectContaining({ clientOrderId, status: "RELEASED", capturedCashAmount: "3750.0500" }));
  verifyV13RunWithCli(testRunId!, proposalId!, clientOrderId, "6249.9500", "5000.0500", "CANCELLED", "RELEASED", "3750.0500");
  console.info(`[V1.3 US_EQUITY L16 rejected cancellation retry] ${JSON.stringify({ testRunId, market: "US_EQUITY", security: "AAPL", proposalId, clientOrderId, rejectedSequence: 3, retryAcceptedSequence: 4, cash: finalFacts.independentAssets.current_cash, filledQuantity: 150, rejectedOrderStatus: rejectedFacts.order.status, retainedReservation: "HELD", finalOrderStatus: finalFacts.order.status, finalReservation: "RELEASED", reconciliation: finalFacts.reconciliation.status })}`);
});

test("V1.3 L07 Web buffers seq=3 cancellation until the missing seq=2 Fill arrives", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  await page.getByTestId("v13-create-sequenced-proposal").click();
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  expect(proposalId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "人工批准", exact: true }).click();
  await page.getByTestId("v13-execute-sequenced-proposal").click();
  await expect(page.getByTestId("v13-order")).toContainText("ACCEPTED");

  // Apply seq=1, request cancellation while a 100-share partial Fill is the
  // only accepted event, then deliver seq=3 before the missing seq=2 Fill.
  await page.getByTestId("v13-sequence-1").click();
  await expect(page.getByTestId("v13-order")).toContainText("PARTIALLY_FILLED");
  const clientOrderId = `v13-${proposalId}`;
  const cancelRequest = await page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${clientOrderId}/cancel-request`);
  expect(cancelRequest.status()).toBe(202);
  expect(await cancelRequest.json()).toMatchObject({ status: "CANCEL_REQUESTED", reservation: { status: "HELD" } });
  const earlyCancel = await page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${clientOrderId}/cancel-results/3`);
  expect(earlyCancel.status()).toBe(200);
  const bufferedCancel = await earlyCancel.json();
  expect(bufferedCancel.resolution).toMatchObject({ status: "CANCEL_REQUESTED", buffered: true, lastAppliedSequence: 1 });
  expect(bufferedCancel.order.order.status).toBe("CANCEL_REQUESTED");

  await page.getByTestId("v13-sequence-2-replay").click();
  await expect(page.getByTestId("v13-sequenced-report")).toContainText('"lastAppliedSequence":3');
  await expect(page.getByTestId("v13-order")).toContainText("CANCELLED");
  await expect(page.getByTestId("v13-reconciliation")).toHaveText("MATCH");
  await expect(page.getByTestId("v13-order")).toContainText("8495.0000 CNY");
  await expect(page.getByTestId("v13-positions")).toContainText("150");

  const facts = await page.request.get(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${clientOrderId}`).then((response) => response.json());
  expect(facts.fills.map((fill: { brokerSequence: number; quantity: number }) => [fill.brokerSequence, fill.quantity])).toEqual([[1, 100], [2, 50]]);
  expect(facts.order.status).toBe("CANCELLED");
  expect(facts.reconciliation.status).toBe("MATCH");
  expect(facts.independentAssets.current_cash).toBe("8495.0000");
  const accountId = new URL(page.url()).searchParams.get("accountId");
  const account = await page.request.get(`/api/v1/accounts/${accountId}`).then((response) => response.json());
  expect(account.account.reservations).toContainEqual(expect.objectContaining({ clientOrderId, status: "RELEASED", capturedCashAmount: "1505.0000" }));
  verifyV13RunWithCli(testRunId!, proposalId!, clientOrderId, "8495.0000", "2005.0000", "CANCELLED", "RELEASED", "1505.0000");
  console.info(`[V1.3 L07 Web/CLI mixed event recovery] ${JSON.stringify({ testRunId, proposalId, clientOrderId, injectedEvents: ["seq=1 Fill applied: 100 shares", "cancel request persisted with reservation HELD", "seq=3 accepted cancellation arrived and buffered", "seq=2 Fill arrived and drained seq=3"], deliveredFills: facts.fills.map((fill: { brokerSequence: number; quantity: number }) => ({ sequence: fill.brokerSequence, quantity: fill.quantity })), cash: facts.independentAssets.current_cash, orderStatus: facts.order.status, reconciliation: facts.reconciliation.status, reservation: account.account.reservations.find((item: { clientOrderId: string }) => item.clientOrderId === clientOrderId)?.status })}`);
});

test("V1.3 L07 seed 20261013 applies a buffered seq=2 Fill before the cancel request", async ({ page }) => {
  test.setTimeout(60_000);
  await runV13L07SeededCancelScenario(page, 20261013, "seq2-first");
});

test("V1.3 L07 seed 20261014 accepts cancellation after both partial Fills", async ({ page }) => {
  test.setTimeout(60_000);
  await runV13L07SeededCancelScenario(page, 20261014, "seq1-then-seq2");
});

test("V1.4 daily backtest page shows report evidence", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.4");
  await expect(page.getByRole("heading", { name: "V1.4 日线历史回测与可核对报告" })).toBeVisible();
  await page.getByRole("button", { name: "运行回测" }).click();
  await expect(page.getByTestId("v14-run-status")).toHaveText("COMPLETED");
  await expect(page.getByTestId("v14-execution-model")).toHaveText("QUANT_BACKTEST_ENGINE / DAILY_BAR_CLOSE_NEXT_SESSION_PARTICIPATION_V1");
  await expect(page.getByTestId("v14-evidence")).toContainText("DAILY_BAR");
  await expect(page.getByTestId("v14-benchmark-return")).toHaveText("150 bp");
  await expect(page.getByTestId("v14-excess-return")).toHaveText("-150 bp");
  await expect(page.getByRole("cell", { name: "V1.4-BT-NEXT-BAR-001", exact: true })).toBeVisible();
  const sellabilityRows = page.getByTestId("v14-position-availability").locator("tbody tr");
  await expect(sellabilityRows).toHaveCount(3);
  await expect(sellabilityRows.nth(0)).toContainText("2024-01-03");
  await expect(sellabilityRows.nth(0)).toContainText("0");
  await expect(sellabilityRows.nth(1)).toContainText("2024-01-04");
  await expect(sellabilityRows.nth(1)).toContainText("100");
  const testRunId = (await page.getByTestId("v14-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  const exported = await page.evaluate(async (id) => {
    const runResponse = await fetch(`/api/v1/acceptance/v1/v1.4/runs/${id}`);
    const run = await runResponse.json();
    const ref = run.artifactRefs?.[0];
    if (!ref) return { runOk: runResponse.ok, ref };
    const reportResponse = await fetch(`/api/v1/acceptance/v1/v1.4/runs/${id}/artifacts/${ref.artifactId}`);
    const report = await reportResponse.json();
    const foreignResponse = await fetch(`/api/v1/acceptance/v1/v1.4/runs/${id}/artifacts/${ref.artifactId}`, { credentials: "omit", headers: { "x-stockquant-user": "other-owner" } });
    return { runOk: runResponse.ok, reportOk: reportResponse.ok, foreignStatus: foreignResponse.status, ref, returnedRef: report.artifactRef, reportRunId: report.content?.testRunId, reportStatus: report.content?.status, assertionCount: report.content?.assertions?.length };
  }, testRunId!);
  expect(exported).toMatchObject({ runOk: true, reportOk: true, foreignStatus: 403, ref: { schemaVersion: "artifact-ref.v1", testRunId, ownerId: "acceptance-owner-1", kind: "BACKTEST_REPORT", sha256: exported.ref.sha256, status: "PUBLISHED" }, returnedRef: exported.ref, reportRunId: testRunId, reportStatus: "COMPLETED" });
  expect(exported.ref.artifactId).toBe(exported.ref.sha256);
  expect(exported.assertionCount).toBeGreaterThan(0);
  verifyV14RunWithCli(testRunId!);

  await page.getByLabel("目标股数").fill("100000");
  await page.getByRole("button", { name: "运行回测" }).click();
  await expect(page.getByTestId("v14-run-status")).toHaveText("COMPLETED");
  const buyOutcome = page.getByTestId("v14-order-outcomes").locator("tbody tr").filter({ hasText: "BUY" });
  await expect(buyOutcome).toHaveCount(1);
  await expect(buyOutcome).toContainText("100000");
  await expect(buyOutcome).toContainText("989");
  await expect(buyOutcome).toContainText("PARTIALLY_FILLED");
  await expect(buyOutcome).toContainText("INSUFFICIENT_CASH");
  await expect(page.getByRole("row", { name: /部分成交订单/u })).toContainText("1");
  const partialTestRunId = (await page.getByTestId("v14-test-run-id").textContent())?.trim();
  expect(partialTestRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  verifyV14RunWithCli(partialTestRunId!);
});

test("V1.4 rejection page proves future signal and same-session SELL have no published report", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.4");
  await page.getByLabel("回测场景").selectOption("rejection");
  await page.getByRole("button", { name: "运行回测" }).click();
  await expect(page.getByTestId("v14-run-status")).toHaveText("COMPLETED");
  const evidence = page.getByTestId("v14-evidence");
  await expect(evidence).toContainText("FUTURE_SIGNAL_SAME_DAY");
  await expect(evidence).toContainText("T_PLUS_1_UNAVAILABLE");
  await expect(evidence).toContainText('"reportPublished": false');
  await expect(page.getByText("V1.4-BT-PIT-001", { exact: true })).toBeVisible();
  await expect(page.getByText("V1.4-BT-REPORT-002", { exact: true })).toBeVisible();
  await expect(page.getByText("V1.4-BT-TPLUS1-REJECT-009", { exact: true })).toBeVisible();
  const testRunId = (await page.getByTestId("v14-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  verifyV14RunWithCli(testRunId!);
  console.info(`[V1.4 Web/CLI rejection] testRunId=${testRunId}`);
});

test("V1.4 restores the same running TestRun after a browser refresh", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.4");
  await page.getByLabel("回测场景").selectOption("recovery");
  await page.getByRole("button", { name: "运行回测" }).click();
  await expect(page.getByTestId("v14-run-status")).toHaveText("RUNNING");
  const testRunId = (await page.getByTestId("v14-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("stockquant:v14:lastTestRunId"))).toBe(testRunId);

  await page.reload();
  await expect(page.getByTestId("v14-test-run-id")).toHaveText(testRunId!);
  await expect(page.getByTestId("v14-run-status")).toHaveText("COMPLETED", { timeout: 30_000 });
  await expect(page.getByTestId("v14-evidence")).toContainText(testRunId!);
  verifyV14RunWithCli(testRunId!);
  console.info(`[V1.4 refresh recovery] ${JSON.stringify({ testRunId, result: "same-run-restored-and-completed" })}`);
});

test("V1.4 synthetic suspension and locked-limit scenario is readable and same-run CLI verifiable", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.4");
  await page.getByLabel("回测场景").selectOption("market-restrictions");
  await page.getByRole("button", { name: "运行回测" }).click();
  await expect(page.getByTestId("v14-run-status")).toHaveText("COMPLETED");
  await expect(page.getByTestId("v14-evidence")).toContainText("SYNTHETIC_FIXTURE_BOUNDARIES_ONLY");
  await expect(page.getByTestId("v14-evidence")).toContainText("LOCKED_AT_UPPER_LIMIT");
  await expect(page.getByTestId("v14-evidence")).toContainText("LOCKED_AT_LOWER_LIMIT");
  const testRunId = (await page.getByTestId("v14-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  verifyV14RunWithCli(testRunId!);
});

test("V1.4 historical fee fixture uses the pre-cut date schedule", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.4");
  await page.getByLabel("回测场景").selectOption("historical-fees");
  await page.getByRole("button", { name: "运行回测" }).click();
  await expect(page.getByTestId("v14-run-status")).toHaveText("COMPLETED");
  await expect(page.getByTestId("v14-evidence")).toContainText("v1.4-historical-fees-2");
  await expect(page.getByTestId("v14-benchmark-return")).toHaveText("80 bp");
  await expect(page.getByTestId("v14-evidence")).toContainText("2023-08-25");
  await expect(page.getByTestId("v14-evidence")).toContainText("stampDutyCents");
  await expect(page.getByRole("cell", { name: "V1.4-BT-HISTORICAL-FEE-001", exact: true })).toBeVisible();
  const testRunId = (await page.getByTestId("v14-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  verifyV14RunWithCli(testRunId!);
});

test("V1.4 RAW corporate actions preserve hand-checked NAV and ignore duplicate event delivery", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.4");
  await page.getByLabel("回测场景").selectOption("corporate-actions");
  await page.getByRole("button", { name: "运行回测" }).click();
  await expect(page.getByTestId("v14-run-status")).toHaveText("COMPLETED");
  const testRunId = await page.getByTestId("v14-test-run-id").textContent();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  await expect(page.getByTestId("v14-evidence")).toContainText("v1.4-corporate-actions-1");
  await expect(page.getByTestId("v14-execution-model")).toHaveText("QUANT_BACKTEST_ENGINE / RAW_DAILY_BAR_CORPORATE_ACTION_LEDGER_V1");
  await expect(page.getByRole("cell", { name: "V1.4-BT-CORPORATE-ACTION-RAW-001", exact: true })).toBeVisible();
  await expect(page.getByTestId("v14-corporate-actions")).toContainText("CA-SPLIT-2-FOR-1");
  await expect(page.getByTestId("v14-corporate-actions")).toContainText("CA-DIVIDEND-10-CENTS");
  await expect(page.getByTestId("v14-corporate-action-replays")).toContainText("忽略：1 次");
  await expect(page.getByTestId("v14-nav")).toContainText("200000");
  await verifyV14RunWithCli(testRunId!);
});

test("V1.4 web accepts a bounded policy and compares persisted runs", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.4");
  await page.getByLabel("初始现金（分）").fill("102000");
  await page.getByLabel("目标股数").fill("100");
  await page.getByLabel("参与率（基点）").fill("100");
  await page.getByLabel("不利滑点（基点）").fill("100");
  await page.getByLabel("固定费用（分）").fill("500");
  await page.getByLabel("卖出信号日").fill("2024-01-03");
  await page.getByLabel("卖出执行日").fill("2024-01-04");
  await page.getByLabel("卖出数量").fill("99");
  await page.getByRole("button", { name: "运行回测" }).click();
  await expect(page.getByTestId("v14-run-status")).toHaveText("COMPLETED");
  await expect(page.getByTestId("v14-trades")).toContainText("99");
  await expect(page.getByTestId("v14-final-cash")).toHaveText("99812 分");
  await expect(page.getByTestId("v14-trades")).toContainText("SELL");
  await expect(page.getByTestId("v14-settlements")).toContainText("2024-01-05");
  await expect(page.getByTestId("v14-cash-ledger")).toContainText("99391");
  await expect(page.getByTestId("v14-evidence")).toContainText('"initialCashCents": 102000');
  await expect(page.getByTestId("v14-evidence")).toContainText('"slippageBasisPoints": 100');
  const firstRunId = (await page.getByTestId("v14-test-run-id").textContent())?.trim();
  expect(firstRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  verifyV14RunWithCli(firstRunId!);

  await page.getByLabel("目标股数").fill("50");
  await page.getByLabel("卖出数量").fill("50");
  await page.getByRole("button", { name: "运行回测" }).click();
  await expect(page.getByTestId("v14-comparison-title")).toBeVisible();
  await expect(page.getByTestId("v14-comparison")).toContainText("99");
  await expect(page.getByTestId("v14-comparison")).toContainText("50");
  const secondRunId = (await page.getByTestId("v14-test-run-id").textContent())?.trim();
  expect(secondRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  verifyV14RunWithCli(secondRunId!);

  await page.getByLabel("初始现金（分）").fill("1000000");
  await page.getByLabel("目标股数").fill("100");
  await page.getByLabel("参与率（基点）").fill("100");
  await page.getByLabel("不利滑点（基点）").fill("0");
  await page.getByLabel("费用模型").selectOption("cn-a");
  await page.getByLabel("卖出数量").fill("100");
  await page.getByRole("button", { name: "运行回测" }).click();
  await expect(page.getByTestId("v14-run-status")).toHaveText("COMPLETED");
  await expect(page.getByTestId("v14-trades")).toContainText("511");
  await expect(page.getByTestId("v14-trades")).toContainText("562");
  await expect(page.getByTestId("v14-trades")).toContainText("51");
  const feeRunId = (await page.getByTestId("v14-test-run-id").textContent())?.trim();
  expect(feeRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  verifyV14RunWithCli(feeRunId!);
});

test("V1.5 Run creation rejects all client trading mode combinations without dispatch", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.5");
  await expect(page.getByRole("heading", { name: "V1.5 无人调度、故障恢复与 V1 验收" })).toBeVisible();
  const sessionResponse = await page.request.get("/api/v1/session");
  expect(sessionResponse.status()).toBe(200);
  const runsPath = "/api/v1/acceptance/v1/v1.5/runs?limit=50";
  const beforeResponse = await page.request.get(runsPath);
  expect(beforeResponse.status()).toBe(200);
  const before = await beforeResponse.json() as Array<{ testRunId: string }>;
  const cases = [
    { environmentMode: "PAPER", brokerMode: "FAKE" },
    { environmentMode: "PAPER", brokerMode: "REAL" },
    { environmentMode: "BACKTEST", brokerMode: "FAKE" },
    { environmentMode: "BACKTEST", brokerMode: "REAL" },
    { environmentMode: "LIVE", brokerMode: "FAKE" },
    { environmentMode: "LIVE", brokerMode: "REAL" },
  ] as const;
  const statuses = [];
  for (const mode of cases) {
    const response = await page.request.post("/api/v1/acceptance/v1/v1.5/runs", {
      data: { scenarioId: "normal", seed: 20261012, ...mode },
    });
    statuses.push(response.status());
    expect(response.status(), JSON.stringify(mode)).toBe(422);
  }
  const afterResponse = await page.request.get(runsPath);
  expect(afterResponse.status()).toBe(200);
  const after = await afterResponse.json() as Array<{ testRunId: string }>;
  expect(after.map((run) => run.testRunId)).toEqual(before.map((run) => run.testRunId));
  console.info(`[V1.5 L17 mode injection] ${JSON.stringify({ rejectedModes: cases, statuses, persistedRunCountBefore: before.length, persistedRunCountAfter: after.length, dispatches: 0 })}`);
});

test("V1.5 normal, isolated AUTO trade and paused-mandate rejection use durable workflows", async ({ page: initialPage }) => {
  test.setTimeout(600_000);
  const autoCancelMode = process.env.STOCKQUANT_V15_E2E_AUTO_CANCEL === "true";
  let page = initialPage;
  await page.goto("/acceptance/v1/v1.5");
  await expect(page.getByRole("heading", { name: "V1.5 无人调度、故障恢复与 V1 验收" })).toBeVisible();
  let previousRunId: string | null = null;
  let autoTradeRunId: string | null = null;
  const runIds = new Set<string>();
  for (const scenario of ["normal", "auto-trade", "rejection", "recovery"]) {
    const startedAt = Date.now();
    console.info(`[V1.5 E2E] scenario=${scenario} begin`);
    await expect(page.getByLabel("调度场景")).toBeVisible({ timeout: 10_000 });
    console.info(`[V1.5 E2E] scenario=${scenario} selector visible`);
    const priorRunLocator = page.getByTestId("v15-test-run-id");
    if (await priorRunLocator.count()) previousRunId = (await priorRunLocator.textContent())?.trim() ?? previousRunId;
    const comparisonCandidateRunId = previousRunId;
    console.info(`[V1.5 E2E] scenario=${scenario} priorRun=${previousRunId ?? "none"}`);
    await page.selectOption("[aria-label='调度场景']", scenario, { timeout: 10_000 });
    console.info(`[V1.5 E2E] scenario=${scenario} selected`);
    await page.getByRole("button", { name: "准备 V1.5 场景" }).click({ timeout: 10_000 });
    console.info(`[V1.5 E2E] scenario=${scenario} submit dispatched`);
    await expect.poll(async () => (await page.getByTestId("v15-test-run-id").textContent())?.trim() ?? "", { timeout: 15_000 }).not.toBe(previousRunId);
    await expect(page.getByTestId("v15-run-status")).toHaveText("WAITING");
    const runId = (await page.getByTestId("v15-test-run-id").textContent())?.trim();
    console.info(`[V1.5 E2E] scenario=${scenario} created testRunId=${runId} elapsedMs=${Date.now() - startedAt}`);
    expect(runId).toMatch(/^[0-9a-f-]{36}$/iu);
    expect(runIds.has(runId!)).toBe(false);
    runIds.add(runId!);
    previousRunId = runId!;
    if (scenario === "auto-trade") autoTradeRunId = runId!;
    if (scenario === "normal") {
      const browserContext = page.context();
      await page.close();
      page = await browserContext.newPage();
      await page.goto("/acceptance/v1/v1.5");
      try {
        await expect(page.getByTestId("v15-test-run-id")).toHaveText(runId!, { timeout: 15_000 });
      } catch (error) {
        const refreshDiagnostics = await page.evaluate(async (expectedRunId) => {
          const response = await fetch(`/api/v1/acceptance/v1/v1.5/runs/${expectedRunId}`, { credentials: "include" });
          return {
            storedRunId: window.localStorage.getItem("stockquant:v15:testRunId"),
            directReadStatus: response.status,
            directReadBody: await response.text(),
          };
        }, runId!);
        const pageError = await page.getByRole("alert").allTextContents().catch(() => []);
        throw new Error(`V1.5 refresh did not restore the accepted TestRun; pageError=${JSON.stringify(pageError)} diagnostics=${JSON.stringify(refreshDiagnostics)} cause=${String(error)}`);
      }
      await expect(page.getByTestId("v15-run-status")).toHaveText("WAITING");
    } else if (scenario === "auto-trade") {
      const browserContext = page.context();
      const acceptanceUrl = new URL(page.url());
      if (autoCancelMode) {
        let commitPendingMarker = "";
        await expect.poll(() => {
          const project = process.env.STOCKQUANT_V15_E2E_PROJECT;
          if (!project) return "missing-isolated-project";
          const composeFile = resolve(process.cwd(), "../../infra/compose/docker-compose.v15-integration.yml");
          const logs = spawnSync("docker", ["compose", "-p", project, "-f", composeFile, "logs", "--no-color", "trade-execution-service"], { encoding: "utf8", timeout: 10_000 });
          if (logs.status !== 0) return "";
          commitPendingMarker = logs.stdout.split(/\r?\n/u).find((line) => line.includes("V15_AUTO_RESPONSE_PENDING_BEFORE_TRADE_RESTART") && line.includes(`\"testRunId\":\"${runId}\"`)) ?? "";
          return commitPendingMarker;
        }, { timeout: 60_000 }).not.toBe("");
        expect(JSON.parse(commitPendingMarker.slice(commitPendingMarker.indexOf("{"))).clientOrderId).toMatch(/-session-2$/u);
        await expect(page.getByTestId("v15-auto-cancel")).toBeVisible();
        await page.getByTestId("v15-auto-cancel").click();
        await expect.poll(async () => {
          const response = await browserContext.request.get(new URL(`/api/v1/acceptance/v1/v1.5/runs/${runId}`, acceptanceUrl).toString(), { timeout: 10_000 });
          if (!response.ok()) return "";
          return (await response.json()).evidence?.autoTradeCancellation?.status ?? "";
        }, { timeout: 10_000 }).toBe("REQUESTED");
        const cancellationResponse = await browserContext.request.get(new URL(`/api/v1/acceptance/v1/v1.5/runs/${runId}`, acceptanceUrl).toString(), { timeout: 10_000 });
        const cancellationRun = await cancellationResponse.json();
        console.info(`STOCKQUANT_V15_AUTO_CANCEL_UI_CONFIRMED ${JSON.stringify({ event: "web_cancel_after_fakebroker_commit_before_trade_response", testRunId: runId, commitPending: JSON.parse(commitPendingMarker.slice(commitPendingMarker.indexOf("{"))), cancellation: cancellationRun.evidence?.autoTradeCancellation })}`);
      } else {
        await page.close();
        await expect.poll(async () => {
          const response = await browserContext.request.get(new URL(`/api/v1/acceptance/v1/v1.5/runs/${runId}`, acceptanceUrl).toString(), { timeout: 10_000 });
          if (!response.ok()) return `HTTP_${response.status()}`;
          const value = await response.json();
          if (value.status === "FAILED") console.info(`[V1.5 E2E] workflow failed testRunId=${runId} evidence=${JSON.stringify(value.evidence ?? null)}`);
          return value.evidence?.businessExecution ?? (value.status === "FAILED" ? `FAILED: ${JSON.stringify(value.evidence?.workflowError ?? null)}` : "RUNNING");
        }, { timeout: 60_000 }).toBe("AUTO_TRADE_EXECUTED");
      }
      page = await browserContext.newPage();
      await page.goto("/acceptance/v1/v1.5");
      await expect(page.getByTestId("v15-test-run-id")).toHaveText(runId!);
      await expect(page.getByTestId("v15-run-status")).toHaveText(scenario === "auto-trade" ? "COMPLETED" : "WAITING");
      if (comparisonCandidateRunId) {
        const comparisonPicker = page.getByTestId("v15-compare-run-select");
        await expect(comparisonPicker).toBeVisible({ timeout: 15_000 });
        await comparisonPicker.selectOption(comparisonCandidateRunId);
        await expect(page.getByTestId("v15-run-comparison")).toContainText(runId!);
        await expect(page.getByTestId("v15-run-comparison")).toContainText(comparisonCandidateRunId);
        console.info(`[V1.5 E2E] owner-scoped run comparison current=${runId} previous=${comparisonCandidateRunId}`);
      }
    }
    const cookie = (await page.context().cookies()).find((item) => item.name === "sq_session")?.value;
    expect(cookie).toMatch(/^[a-f0-9]{64}$/u);
    if (scenario === "normal") {
      await expect.poll(async () => page.evaluate(async (id) => {
        try {
          const response = await fetch("/api/v1/acceptance/v1/v1.5/runs/" + id, { signal: AbortSignal.timeout(10_000) });
          if (!response.ok) return 0;
          const value = await response.json();
          return value.evidence?.localSessions?.authoritativeObservations ?? 0;
        } catch {
          return 0;
        }
      }, runId!), { timeout: 300_000 }).toBe(120);
      console.info(`[V1.5 E2E] scenario=normal 120 observations complete elapsedMs=${Date.now() - startedAt}`);
      await expect(page.getByTestId("v15-temporal-status")).toHaveText("COMPLETED");
      const evidence = JSON.parse((await page.getByTestId("v15-evidence").textContent()) ?? "{}");
      expect(evidence).toMatchObject({ workflow: "TEMPORAL_COMPLETED", temporal: "COMPLETED", localSessions: { CN_A: 60, US_EQUITY: 60, authoritativeObservations: 120 }, orders: "ZERO_AUTHORITATIVE_FAKEBROKER_ORDERS", fills: "ZERO_AUTHORITATIVE_FAKEBROKER_FILLS", automaticTrading: "NOT_RUN", backupRestore: "NOT_RUN" });
      const rows = (await page.getByTestId("v15-assertions").getByRole("row").allTextContents()).slice(1);
      expect(rows).toHaveLength(2);
      expect(rows.find((row) => row.includes("V1.5-HOLD-002"))).toContain("PASS");
      expect(rows.find((row) => row.includes("V1.5-SYS-SCHEDULE-001"))).toContain("WAITING");
      expect(JSON.stringify(evidence)).not.toContain("BACKUP_RESTORE");
    } else if (scenario === "auto-trade") {
      await expect.poll(async () => page.evaluate(async (id) => {
        try {
          const response = await fetch("/api/v1/acceptance/v1/v1.5/runs/" + id, { signal: AbortSignal.timeout(10_000) });
          if (!response.ok) return "";
          const value = await response.json();
          return value.evidence?.businessExecution ?? (value.status === "FAILED" ? `FAILED: ${JSON.stringify(value.evidence?.workflowError ?? null)}` : "");
        } catch { return ""; }
      }, runId!), { timeout: 60_000 }).toBe(autoCancelMode ? "AUTO_TRADE_CANCELLED" : "AUTO_TRADE_EXECUTED");
      const completedRun = await page.evaluate(async (id) => {
        const response = await fetch("/api/v1/acceptance/v1/v1.5/runs/" + id, { signal: AbortSignal.timeout(10_000) });
        if (!response.ok) throw new Error(`V1.5 completed Run refresh failed (${response.status})`);
        return await response.json();
      }, runId!);
      const evidence = completedRun.evidence;
      if (autoCancelMode) {
        expect(evidence).toMatchObject({ workflow: "TEMPORAL_COMPLETED", temporal: "COMPLETED", businessExecution: "AUTO_TRADE_CANCELLED", autoTradeCancellation: { status: "CURRENT_ORDER_PARTIALLY_FILLED_THEN_CANCELLED", partialFillQuantity: 25, remainingQuantityCancelled: 25, reservationStatus: "RELEASED", completedOrderCount: 1, laterSessionOrdersCreated: 0 }, orders: [{ market: "CN_A", order: { status: "CANCELLED" }, fill: { quantity: 25 }, cancellation: { result: "CANCELLED", reservationStatus: "RELEASED" } }], reconciliation: { status: "MATCH", fakeBroker: { order_count: 1, fill_count: 1, unresolved_order_count: 0, pending_outbox_count: 0 } } });
        expect(completedRun.assertions).toEqual(expect.arrayContaining([
          expect.objectContaining({ assertionId: "V1.5-AUTO-CANCEL-001", status: "PASS" }),
          expect.objectContaining({ assertionId: "V1.5-AUTO-ORDER-001", status: "WAITING" }),
          expect.objectContaining({ assertionId: "V1.5-AUTO-RECON-001", status: "PASS" })
        ]));
        const cancelUrl = new URL(`/api/v1/acceptance/v1/v1.5/runs/${runId}/cancel`, page.url()).toString();
        for (const modes of [
          { environmentMode: "PAPER", brokerMode: "FAKE" },
          { environmentMode: "PAPER", brokerMode: "REAL" },
          { environmentMode: "LIVE", brokerMode: "FAKE" },
          { environmentMode: "BACKTEST", brokerMode: "FAKE" },
          { environmentMode: "BACKTEST", brokerMode: "REAL" },
          { environmentMode: "LIVE", brokerMode: "REAL" },
        ]) {
          const modeCancelResponse = await page.context().request.post(cancelUrl, { data: modes, timeout: 10_000 });
          expect(modeCancelResponse.status(), `V1.5 cancellation mode ${JSON.stringify(modes)}: ${await modeCancelResponse.text()}`).toBe(422);
          const unchanged = await page.context().request.get(new URL(`/api/v1/acceptance/v1/v1.5/runs/${runId}`, page.url()).toString(), { timeout: 10_000 }).then((response) => response.json());
          expect(unchanged.evidence.autoTradeCancellation).toEqual(evidence.autoTradeCancellation);
        }
        const injectedCancelResponse = await page.context().request.post(cancelUrl, { data: { status: "CANCELLED", cash: { amount: "999999.00", currency: "CNY" } }, timeout: 10_000 });
        expect(injectedCancelResponse.status()).toBe(422);
        const afterRejectedCancel = await page.context().request.get(new URL(`/api/v1/acceptance/v1/v1.5/runs/${runId}`, page.url()).toString(), { timeout: 10_000 }).then((response) => response.json());
        expect(afterRejectedCancel.status).toBe(completedRun.status);
        expect(afterRejectedCancel.evidence.autoTradeCancellation).toEqual(evidence.autoTradeCancellation);
        const repeatedCancelResponse = await page.context().request.post(cancelUrl, { timeout: 10_000 });
        expect(repeatedCancelResponse.status()).toBe(202);
        const repeatedCancelBody = await repeatedCancelResponse.json();
        expect(repeatedCancelBody).toMatchObject({ accepted: true, testRunId: runId, cancellation: evidence.autoTradeCancellation });
        console.info(`STOCKQUANT_V15_AUTO_CANCEL_REPLAY_CONFIRMED ${JSON.stringify({ event: "completed_run_cancel_retry_returns_original_request", testRunId: runId, httpStatus: repeatedCancelResponse.status(), cancellation: repeatedCancelBody.cancellation })}`);
        await expect(page.getByTestId("v15-temporal-status")).toHaveText("COMPLETED");
        console.info(`STOCKQUANT_V15_AUTO_CANCEL_COMPLETED ${JSON.stringify({ event: "partial_fill_authoritatively_cancelled_no_later_orders", testRunId: runId, businessExecution: evidence.businessExecution, order: evidence.orders[0]?.order, fill: evidence.orders[0]?.fill, cancellation: evidence.autoTradeCancellation, reconciliation: evidence.reconciliation, assertionStatuses: completedRun.assertions.filter((item: any) => ["V1.5-AUTO-CANCEL-001", "V1.5-AUTO-ORDER-001", "V1.5-AUTO-RECON-001"].includes(item.assertionId)).map((item: any) => ({ assertionId: item.assertionId, status: item.status })) })}`);
      } else {
      await expect(page.getByTestId("v15-auto-eod-status")).toHaveText("MATCH");
      await expect(page.getByTestId("v15-missed-window-status")).toHaveText("RECOVERED");
      await expect(page.getByTestId("v15-missed-window-CN_A")).toContainText("staleOrderCreated false");
      await expect(page.getByTestId("v15-missed-window-US_EQUITY")).toContainText("staleOrderCreated false");
      await expect(page.getByTestId("v15-auto-eod-CN_A-2")).toContainText("2026-01-06T07:00:00.000Z");
      await expect(page.getByTestId("v15-auto-eod-CN_A-3")).toContainText("2026-01-07T07:00:00.000Z");
      await expect(page.getByTestId("v15-auto-eod-US_EQUITY-2")).toContainText("2026-01-06T21:00:00.000Z");
      await expect(page.getByTestId("v15-auto-eod-US_EQUITY-3")).toContainText("2026-01-07T21:00:00.000Z");
      expect(evidence).toMatchObject({ workflow: "TEMPORAL_COMPLETED", nats: "JETSTREAM_ACKED", temporal: "COMPLETED", businessExecution: "AUTO_TRADE_EXECUTED", brokerMode: "FAKE", liveTradingEnabled: false, reconciliation: { status: "MATCH", fakeBroker: { order_count: 4, fill_count: 4, unresolved_order_count: 0, pending_outbox_count: 0, externalOnlyOrderCount: 0 } }, workflowCompletionReconciliation: { status: "MATCH", source: "FRESH_OWNER_AND_TESTRUN_SCOPED_PORTFOLIO_AND_FAKEBROKER_READS" }, dailyEndOfDay: { status: "MATCH", clockSource: "VERSIONED_AUTO_TRADE_FIXTURE_SESSION_CLOSE", sessionsPerMarket: 3, executedSessionsPerMarket: 2 }, missedWindowRecovery: { status: "RECOVERED", policy: "MISSED_WINDOW_REEVALUATE_NEXT_SESSION" }, multiSessionObservation: "NOT_RUN", humanAcceptance: "NOT_RUN" });
      expect(completedRun.assertions.find((item: { assertionId: string }) => item.assertionId === "V1.5-AUTO-EOD-RECON-001")?.status).toBe("PASS");
      expect(evidence.missedWindowRecovery).toMatchObject({ status: "RECOVERED", policy: "MISSED_WINDOW_REEVALUATE_NEXT_SESSION", byMarket: { CN_A: { missedSession: 1, staleOrderCreated: false, reevaluatedSession: 2 }, US_EQUITY: { missedSession: 1, staleOrderCreated: false, reevaluatedSession: 2 } } });
      expect(completedRun.assertions.find((item: { assertionId: string }) => item.assertionId === "V1.5-AUTO-MISSED-WINDOW-001")?.status).toBe("PASS");
      expect(evidence.dailyEndOfDay.byMarket.CN_A).toMatchObject([
        { sequence: 2, localDate: "2026-01-06", closeAt: "2026-01-06T07:00:00.000Z", fillAt: "2026-01-06T01:31:01.000Z", orderAndFillBeforeClose: true, reconciliation: { portfolio: { cash: { currency: "CNY" } }, fakeBroker: { currency: "CNY" } } },
        { sequence: 3, localDate: "2026-01-07", closeAt: "2026-01-07T07:00:00.000Z", fillAt: "2026-01-07T01:31:01.000Z", orderAndFillBeforeClose: true, reconciliation: { portfolio: { cash: { currency: "CNY" } }, fakeBroker: { currency: "CNY" } } }
      ]);
      expect(evidence.dailyEndOfDay.byMarket.US_EQUITY).toMatchObject([
        { sequence: 2, localDate: "2026-01-06", closeAt: "2026-01-06T21:00:00.000Z", fillAt: "2026-01-06T14:31:01.000Z", orderAndFillBeforeClose: true, reconciliation: { portfolio: { cash: { currency: "USD" } }, fakeBroker: { currency: "USD" } } },
        { sequence: 3, localDate: "2026-01-07", closeAt: "2026-01-07T21:00:00.000Z", fillAt: "2026-01-07T14:31:01.000Z", orderAndFillBeforeClose: true, reconciliation: { portfolio: { cash: { currency: "USD" } }, fakeBroker: { currency: "USD" } } }
      ]);
      expect(evidence.workflowCompletionReconciliation.byMarket).toMatchObject({
        CN_A: { portfolio: { cash: { currency: "CNY" }, positions: [{ security: "600000.SH", quantity: 100 }] }, fakeBroker: { currency: "CNY", positions: [{ security: "600000.SH", quantity: 100 }] } },
        US_EQUITY: { portfolio: { cash: { currency: "USD" }, positions: [{ security: "AAPL", quantity: 10 }] }, fakeBroker: { currency: "USD", positions: [{ security: "AAPL", quantity: 10 }] } }
      });
      expect(canonicalMoney(evidence.workflowCompletionReconciliation.byMarket.CN_A.portfolio.cash.amount)).toBe(canonicalMoney("8990.00"));
      expect(canonicalMoney(evidence.workflowCompletionReconciliation.byMarket.CN_A.fakeBroker.current_cash)).toBe(canonicalMoney("8990.00"));
      expect(canonicalMoney(evidence.workflowCompletionReconciliation.byMarket.US_EQUITY.portfolio.cash.amount)).toBe(canonicalMoney("9749.90"));
      expect(canonicalMoney(evidence.workflowCompletionReconciliation.byMarket.US_EQUITY.fakeBroker.current_cash)).toBe(canonicalMoney("9749.90"));
      expect(evidence.orders.map((item: { market: string; sessionSequence: number }) => `${item.market}-${item.sessionSequence}`).sort()).toEqual(["CN_A-2", "CN_A-3", "US_EQUITY-2", "US_EQUITY-3"]);
      const budgetByMarket = Object.fromEntries(evidence.orders.map((item: any) => [`${item.market}-${item.sessionSequence}`, item.mandate?.independentlyReadReservation]));
      expect(budgetByMarket).toMatchObject({
        "CN_A-2": { ownerId: "acceptance-owner-1", testRunId: runId, mandateVersion: 1, mandateId: expect.stringMatching(/^[0-9a-f-]{36}$/iu), reservedAmount: "0.00", consumedAmount: "505.00", releasedAmount: "0.00", reservationCount: 1, consumedCount: 1, releasedCount: 0 },
        "CN_A-3": { ownerId: "acceptance-owner-1", testRunId: runId, mandateVersion: 1, mandateId: expect.stringMatching(/^[0-9a-f-]{36}$/iu), reservedAmount: "0.00", consumedAmount: "505.00", releasedAmount: "0.00", reservationCount: 1, consumedCount: 1, releasedCount: 0 },
        "US_EQUITY-2": { ownerId: "acceptance-owner-1", testRunId: runId, mandateVersion: 1, mandateId: expect.stringMatching(/^[0-9a-f-]{36}$/iu), reservedAmount: "0.00", consumedAmount: "125.05", releasedAmount: "0.00", reservationCount: 1, consumedCount: 1, releasedCount: 0 },
        "US_EQUITY-3": { ownerId: "acceptance-owner-1", testRunId: runId, mandateVersion: 1, mandateId: expect.stringMatching(/^[0-9a-f-]{36}$/iu), reservedAmount: "0.00", consumedAmount: "125.05", releasedAmount: "0.00", reservationCount: 1, consumedCount: 1, releasedCount: 0 }
      });
      expect(completedRun.assertions).toEqual(expect.arrayContaining([
        expect.objectContaining({ assertionId: "V1.5-AUTO-ORDER-001", status: "PASS" }),
        expect.objectContaining({ assertionId: "V1.5-AUTO-RECON-001", status: "PASS" }),
        expect.objectContaining({ assertionId: "V1.5-AUTO-TERMINAL-RECON-001", status: "PASS" }),
        expect.objectContaining({ assertionId: "V1.5-AUTO-EOD-RECON-001", status: "PASS" })
      ]));
      for (const item of evidence.orders) {
        const trace = page.getByTestId(`v15-order-trace-${item.market}-${item.sessionSequence}`);
        await expect(trace).toBeVisible();
        await expect(page.getByTestId(`v15-trace-proposal-${item.market}-${item.sessionSequence}`)).toHaveText(item.proposalId);
        await expect(page.getByTestId(`v15-trace-mandate-${item.market}-${item.sessionSequence}`)).toContainText(item.mandate.mandateId);
        await expect(page.getByTestId(`v15-trace-order-${item.market}-${item.sessionSequence}`)).toHaveText(item.order.order_id);
        await expect(page.getByTestId(`v15-trace-fill-${item.market}-${item.sessionSequence}`)).toContainText(item.fill.externalFillId);
        await expect(trace).toContainText(item.outbox.status);
        await expect(trace).toContainText(item.reconciliation.portfolio.cash.amount);
        await expect(trace).toContainText(item.reconciliation.fakeBroker.current_cash);
        await expect(trace).toContainText(item.mandate.independentlyReadReservation.consumedAmount);
      }
      const fillTraceSelector = page.getByTestId("v15-fill-trace-select");
      await expect(fillTraceSelector.locator("option")).toHaveCount(evidence.orders.length);
      for (const selectedTraceTarget of evidence.orders) {
        await fillTraceSelector.selectOption(selectedTraceTarget.fill.externalFillId);
        const selectedTrace = page.getByTestId("v15-selected-fill-trace");
        await expect(selectedTrace).toContainText(selectedTraceTarget.fill.externalFillId);
        await expect(selectedTrace).toContainText(selectedTraceTarget.proposalId);
        await expect(selectedTrace).toContainText(selectedTraceTarget.mandate.mandateId);
        await expect(selectedTrace).toContainText(selectedTraceTarget.order.order_id);
        await expect(selectedTrace).toContainText(selectedTraceTarget.reconciliation.portfolio.cash.amount);
        await expect(selectedTrace).toContainText(selectedTraceTarget.reconciliation.fakeBroker.current_cash);
      }
      }
    } else if (scenario === "rejection") {
      await expect.poll(async () => page.evaluate(async (id) => {
        try {
          const response = await fetch("/api/v1/acceptance/v1/v1.5/runs/" + id, { signal: AbortSignal.timeout(10_000) });
          if (!response.ok) return "";
          const value = await response.json();
          return value.evidence?.businessExecution ?? (value.status === "FAILED" ? `FAILED: ${JSON.stringify(value.evidence?.workflowError ?? null)}` : "");
        } catch { return ""; }
      }, runId!), { timeout: 60_000 }).toBe("PAUSED_MANDATE_REJECTED");
      const rejectedRun = await page.evaluate(async (id) => {
        const response = await fetch("/api/v1/acceptance/v1/v1.5/runs/" + id, { signal: AbortSignal.timeout(10_000) });
        if (!response.ok) throw new Error(`V1.5 rejection Run refresh failed (${response.status})`);
        return await response.json();
      }, runId!);
      expect(rejectedRun.evidence).toMatchObject({ workflow: "TEMPORAL_COMPLETED", nats: "JETSTREAM_ACKED", temporal: "COMPLETED", businessExecution: "PAUSED_MANDATE_REJECTED", brokerMode: "FAKE", liveTradingEnabled: false, orders: "NONE", fills: "NONE", budgetReservations: "NONE" });
      expect(rejectedRun.assertions).toEqual(expect.arrayContaining([
        expect.objectContaining({ assertionId: "V1.5-OPS-PAUSE-001", status: "PASS" }),
        expect.objectContaining({ assertionId: "V1.5-XMK-CURRENCY-002", status: "PASS" }),
        expect.objectContaining({ assertionId: "V1.5-REJECTION-ZERO-SIDE-EFFECTS-001", status: "PASS" })
      ]));
      const pauseAssertion = rejectedRun.assertions.find((assertion: { assertionId: string }) => assertion.assertionId === "V1.5-OPS-PAUSE-001");
      expect(pauseAssertion.actual).toEqual(expect.arrayContaining([
        expect.objectContaining({ market: "CN_A", mandateStatus: "PAUSED", executionStatus: 403, rejectionReasonCode: "MANDATE_INACTIVE" }),
        expect.objectContaining({ market: "US_EQUITY", mandateStatus: "PAUSED", executionStatus: 403, rejectionReasonCode: "MANDATE_INACTIVE" })
      ]));
    } else {
      await expect.poll(async () => page.evaluate(async (id) => {
        try {
          const response = await fetch("/api/v1/acceptance/v1/v1.5/runs/" + id, { signal: AbortSignal.timeout(10_000) });
          if (!response.ok) return "";
          const value = await response.json();
          return value.evidence?.businessExecution ?? (value.status === "FAILED" ? `FAILED: ${JSON.stringify(value.evidence?.workflowError ?? null)}` : "");
        } catch { return ""; }
      }, runId!), { timeout: 120_000 }).toBe("AUTO_TRADE_RECOVERED");
      const recoveredRun = await page.evaluate(async (id) => {
        const response = await fetch("/api/v1/acceptance/v1/v1.5/runs/" + id, { signal: AbortSignal.timeout(10_000) });
        if (!response.ok) throw new Error(`V1.5 recovery Run refresh failed (${response.status})`);
        return await response.json();
      }, runId!);
      expect(recoveredRun.evidence).toMatchObject({ workflow: "TEMPORAL_COMPLETED", nats: "JETSTREAM_ACKED", temporal: "COMPLETED", businessExecution: "AUTO_TRADE_RECOVERED", brokerMode: "FAKE", liveTradingEnabled: false, recovery: { responseLostAfterFakeBrokerCommit: true, originalOrderQueried: true, replayedOriginalPerMarket: [{ market: "CN_A", replayed: true }, { market: "US_EQUITY", replayed: false }] }, reconciliation: { status: "MATCH", fakeBroker: { order_count: 2, fill_count: 2, unresolved_order_count: 0, pending_outbox_count: 0, externalOnlyOrderCount: 0 } }, dailyEndOfDay: "NOT_RUN", backupRestore: "NOT_RUN", humanAcceptance: "NOT_RUN" });
      expect(recoveredRun.assertions).toEqual(expect.arrayContaining([
        expect.objectContaining({ assertionId: "V1.5-RECOVERY-001", status: "PASS" }),
        expect.objectContaining({ assertionId: "V1.5-RECOVERY-002", status: "PASS" })
      ]));
    }
    console.info(`[V1.5 E2E] scenario=${scenario} starting same-run CLI/export elapsedMs=${Date.now() - startedAt}`);
    await verifyV15RunWithCli(runId!, "sq_session=" + cookie, scenario === "normal" ? "WAITING" : "COMPLETED");
    console.info(`[V1.5 E2E] scenario=${scenario} CLI/export complete elapsedMs=${Date.now() - startedAt}`);
  }
  expect(autoTradeRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  const historicalRunResponse = await page.context().request.get(new URL(`/api/v1/acceptance/v1/v1.5/runs/${autoTradeRunId}`, page.url()).toString(), { timeout: 10_000 });
  expect(historicalRunResponse.ok()).toBe(true);
  const historicalRun = await historicalRunResponse.json();
  expect(historicalRun.testRunId).toBe(autoTradeRunId);
  expect(historicalRun.evidence?.businessExecution).toBe(autoCancelMode ? "AUTO_TRADE_CANCELLED" : "AUTO_TRADE_EXECUTED");
  const historicalFills = historicalRun.evidence.orders.filter((item: any) => item.fill?.externalFillId);
  expect(historicalFills).toHaveLength(autoCancelMode ? 1 : 4);
  await page.getByTestId("v15-open-run-select").selectOption(autoTradeRunId!);
  await expect(page.getByTestId("v15-test-run-id")).toHaveText(autoTradeRunId!);
  await expect(page.getByTestId("v15-fill-trace-select").locator("option")).toHaveCount(historicalFills.length);
  for (const item of historicalFills) {
    await page.getByTestId("v15-fill-trace-select").selectOption(item.fill.externalFillId);
    const trace = page.getByTestId("v15-selected-fill-trace");
    await expect(trace).toContainText(item.fill.externalFillId);
    await expect(trace).toContainText(item.proposalId);
    await expect(trace).toContainText(item.mandate.mandateId);
    await expect(trace).toContainText(item.order.order_id);
    await expect(trace).toContainText(item.reconciliation.portfolio.cash.amount);
    await expect(trace).toContainText(item.reconciliation.fakeBroker.current_cash);
  }
  const lookupFill = historicalFills[0];
  await page.getByTestId("v15-fill-lookup").fill(lookupFill.fill.externalFillId);
  await page.getByTestId("v15-find-fill").click();
  await expect(page.getByTestId("v15-test-run-id")).toHaveText(autoTradeRunId!);
  const lookedUpTrace = page.getByTestId("v15-selected-fill-trace");
  await expect(lookedUpTrace).toContainText(lookupFill.fill.externalFillId);
  await expect(lookedUpTrace).toContainText(lookupFill.proposalId);
  await expect(lookedUpTrace).toContainText(lookupFill.order.order_id);
  await expect(lookedUpTrace).toContainText(lookupFill.reconciliation.portfolio.cash.amount);
  console.info(`[V1.5 E2E] reopened owner-scoped historical AUTO Run ${autoTradeRunId}; traced ${historicalFills.length} fills`);
});

test("V2.1 source, live news and 101-security rejection are visible in Web acceptance", async ({ page }) => {
  await page.goto("/acceptance/v2/v2.1");
  await expect(page.getByRole("heading", { name: "V2.1 免费行情、新闻聚合与在线股票池" })).toBeVisible();
  await page.getByRole("button", { name: "检查来源能力" }).click();
  await expect(page.getByTestId("v21-evidence")).toContainText("tencent-quote");
  await page.getByRole("button", { name: "抓取实时新闻" }).click();
  await expect(page.getByTestId("v21-evidence")).toContainText("eastmoney-news");
  await page.getByRole("button", { name: "提交101只并验证旧接口拒绝" }).click();
  await expect(page.getByRole("alert")).toContainText("WATCHLIST_LIMIT");
});

test("V2.2 minute import page shows preview and quality rejection", async ({ page }) => {
  await page.goto("/acceptance/v2/v2.2");
  await expect(page.getByRole("heading", { name: "V2.2 历史分钟数据导入与校验" })).toBeVisible();
  await page.getByRole("button", { name: "预览分钟数据" }).click();
  await expect(page.getByTestId("v22-evidence")).toContainText("v2.2-minute-bars-1");
  await page.getByRole("button", { name: "运行质量拒绝" }).click();
  await expect(page.getByTestId("v22-evidence")).toContainText("OHLC_INVALID");
});

test("V2.3 replay page shows deterministic matching and recovery evidence", async ({ page }) => {
  await page.goto("/acceptance/v2/v2.3");
  await expect(page.getByRole("heading", { name: "V2.3 日频决策、分钟撮合与历史事件回放" })).toBeVisible();
  await page.getByRole("button", { name: "预览回放数据" }).click();
  await expect(page.getByTestId("v23-evidence")).toContainText("v2.3-replay-bars-1");
  await page.getByRole("button", { name: "运行检查点恢复" }).click();
  await expect(page.getByTestId("v23-evidence")).toContainText("V2.3-RECOVERY-001");
  await expect(page.getByTestId("v23-evidence")).toContainText('"status": "PASS"');
  await page.getByRole("button", { name: "查询状态" }).click();
  await expect(page.getByTestId("v23-worker-status")).toContainText("COMPLETED");
  // Lifecycle controls are wired to the real platform/worker endpoints. A completed
  // run must reject every non-terminal transition instead of silently mutating state.
  for (const action of ["暂停", "恢复", "取消"]) {
    await page.getByRole("button", { name: action, exact: true }).click();
    await expect(page.getByRole("alert")).toContainText("invalid replay status transition");
  }
});

test("V2.3 long replay pauses and resumes from a committed checkpoint", async ({ page }) => {
  await page.goto("/acceptance/v2/v2.3");
  await page.getByRole("button", { name: "启动可暂停长回放", exact: true }).click();
  await expect(page.getByTestId("v23-evidence")).toContainText('"status": "RUNNING"', { timeout: 10_000 });
  await page.getByRole("button", { name: "暂停", exact: true }).click();
  await expect(page.getByTestId("v23-worker-status")).toContainText('"status": "PAUSED"', { timeout: 10_000 });
  await page.getByRole("button", { name: "恢复", exact: true }).click();
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await page.getByRole("button", { name: "查询状态", exact: true }).click();
    if (await page.getByTestId("v23-worker-status").textContent().then((text) => text?.includes('"status": "COMPLETED"'))) break;
    await page.waitForTimeout(250);
  }
  await expect(page.getByTestId("v23-worker-status")).toContainText('"status": "COMPLETED"', { timeout: 10_000 });
});

test("V2.4 continuous paper page reports strict observation qualification as WAITING", async ({ page }) => {
  const testRunId = "123e4567-e89b-42d3-a456-426614174099";
  await page.route("**/api/v1/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ownerId: "acceptance-owner-1" }) }));
  await page.route("**/api/v1/acceptance/v2/v2.4/observation-summary", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ countedDays: 0, recordedCountedDays: 10, unverifiedCountedDays: 10, targetDays: 20, remainingDays: 20, status: "WAITING" }) }));
  const evidence = { testRunId, stageId: "V2.4", scenarioId: "rejection", status: "WAITING", dataMode: "NOT_CONNECTED", executionPolicy: "PREPARATION_ONLY", executionGate: { status: "BLOCKED" }, mandate: { status: "PREPARATION_ONLY" }, source: { status: "NOT_RUN" }, orders: [], fills: [], reconciliation: { status: "NOT_RUN" }, assertions: [{ assertionId: "V2.4-REJECTION-CHAIN-001", status: "WAITING", expected: "real isolated execution chain", actual: "NOT_RUN" }] };
  await page.route("**/api/v1/acceptance/v2/v2.4/runs", async (route) => {
    if (route.request().method() === "POST") await route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ accepted: true, testRunId, status: "WAITING" }) });
    else await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(evidence) });
  });
  await page.route(`**/api/v1/acceptance/v2/v2.4/runs/${testRunId}`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(evidence) }));
  await page.goto("/acceptance/v2/v2.4");
  await expect(page.getByRole("heading", { name: "V2.4 真实时钟下持续模拟交易" })).toBeVisible();
  await expect(page.getByTestId("v24-mode")).toContainText("NOT_CONNECTED");
  await page.getByRole("button", { name: "查看日终观察进度" }).click();
  const observedDaysText = await page.getByTestId("v24-observed-days").textContent();
  expect(observedDaysText).toMatch(/^\d+\/20$/u);
  const countedDays = Number(observedDaysText?.split("/")[0]);
  await expect(page.getByTestId("v24-remaining-days")).toHaveText(String(Math.max(0, 20 - countedDays)));
  await expect(page.getByTestId("v24-recorded-observed-days")).toHaveText("10/20");
  await expect(page.getByTestId("v24-unverified-observed-days")).toHaveText("10");
  await expect(page.getByTestId("v24-observation-status")).toHaveText(countedDays >= 20 ? "PASS" : "WAITING");
  await expect(page.getByTestId("v24-mode")).toContainText("LIVE关闭");
});

test("V2.4 observation history displays preserved prior evidence revisions", async ({ page }) => {
  const testRunId = "123e4567-e89b-42d3-a456-426614174000";
  await page.route("**/api/v1/session", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ownerId: "acceptance-owner-1" }) }));
  await page.route("**/api/v1/acceptance/v2/v2.4/observations", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify([{ observationDate: "2026-09-24", testRunId, reconciliationStatus: "PASS", errors: ["late quality error"] }])
  }));
  await page.route(`**/api/v1/acceptance/v2/v2.4/runs/${testRunId}/revisions`, (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      testRunId,
      revisions: [{ revisionId: "1", testRunId, stageId: "V2.4", priorStatus: "COMPLETED", priorAssertions: [{ assertionId: "V2.4-OBSERVATION-DAY", status: "PASS" }], priorEvidence: { observationCounted: true, marker: "original-completion" }, priorCreatedAt: "2026-09-24T16:00:00.000Z", priorCompletedAt: "2026-09-24T16:01:00.000Z", reason: "OBSERVATION_EVENT_ERRORS", recordedAt: "2026-09-25T00:00:00.000Z" }]
    })
  }));

  await page.goto("/acceptance/v2/v2.4");
  await page.getByRole("button", { name: "查看观察记录" }).click();
  await page.getByRole("button", { name: "查看 2026-09-24 修订历史" }).click();
  await expect(page.getByRole("region", { name: "观察证据修订历史" })).toContainText("COMPLETED");
  await expect(page.getByRole("region", { name: "观察证据修订历史" })).toContainText("original-completion");
});

test("V2.5 data scale page shows regression and recovery evidence", async ({ page }) => {
  await page.goto("/acceptance/v2/v2.5");
  await expect(page.getByRole("heading", { name: "V2.5 历史数据扩容与 V2 验收" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "已持久化分钟数据验证" })).toBeVisible();
  await page.getByRole("button", { name: "运行合成扩容场景" }).click();
  await expect(page.getByTestId("v25-evidence")).toContainText("V2.5-REGRESSION-002");
  await page.getByRole("button", { name: "运行合成任务恢复场景" }).click();
  await expect(page.getByTestId("v25-evidence")).toContainText("V2.5-RECOVERY-001");
});

test("V2.5 links a persisted Market Data import query to the same durable TestRun", async ({ page }) => {
  const testRunId = "a49b8f39-a6d5-4ca4-b8a1-9464bad93a39";
  await page.route("**/api/v1/acceptance/v2/v2.5/runs/from-minute-import", async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataJSON()).toEqual({ dataVersion: "minute-v1", seed: 20260907 });
    await route.fulfill({ status: 202, contentType: "application/json", body: JSON.stringify({ accepted: true, testRunId, status: "COMPLETED" }) });
  });
  await page.route(`**/api/v1/acceptance/v2/v2.5/runs/${testRunId}`, async (route) => route.fulfill({
    status: 200, contentType: "application/json", body: JSON.stringify({
      testRunId, stageId: "V2.5", scenarioId: "minute-import-query", status: "COMPLETED",
      evidence: { evidenceMode: "PERSISTED_MARKET_DATA_IMPORT_QUERY", import: { dataVersion: "minute-v1", accepted: 120, sha256: "a".repeat(64) }, persistedQuery: { rows: 100, nextCursor: "100" } },
    }),
  }));
  await page.goto("/acceptance/v2/v2.5");
  await page.getByRole("textbox", { name: "V2.5分钟导入版本" }).fill("minute-v1");
  await page.getByRole("button", { name: "核验持久导入并创建TestRun" }).click();
  await expect(page.getByTestId("v25-evidence")).toContainText("PERSISTED_MARKET_DATA_IMPORT_QUERY");
  await expect(page.getByTestId("v25-evidence")).toContainText(testRunId);
});

test("V1.3 L04 AUTO_POLICY activates an exact Mandate, executes one FakeBroker order and survives refresh", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  await page.getByTestId("v13-create-auto-mandate").click();
  await expect(page.getByTestId("v13-auto-mandate-state")).toContainText("PENDING");
  const mandateId = (await page.getByTestId("v13-auto-mandate-state").textContent())?.match(/[0-9a-f-]{36}/iu)?.[0];
  expect(mandateId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByTestId("v13-activate-auto-mandate").click();
  await expect(page.getByTestId("v13-auto-mandate-state")).toContainText("ACTIVE");
  await page.getByRole("button", { name: "创建AUTO_POLICY固定调仓建议" }).click();
  await expect(page.getByTestId("v13-proposal-status")).toHaveText("AUTO_POLICY_PENDING");
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  expect(proposalId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByTestId("v13-execute-auto-proposal").click();
  await expect(page.getByTestId("v13-order")).toContainText("FILLED");
  await expect(page.getByTestId("v13-order")).toContainText("100 × 10.0000 · fee 5.0000");
  await expect(page.getByTestId("v13-order")).toContainText("8995.0000 CNY");
  await expect(page.getByTestId("v13-reconciliation")).toHaveText("MATCH");
  await expect(page.getByTestId("v13-mandate-budget")).toContainText("VERIFIED");
  await expect(page.getByTestId("v13-mandate-budget")).toContainText('"reservedAmount":"0.00"');
  await expect(page.getByTestId("v13-mandate-budget")).toContainText('"consumedAmount":"1005.00"');
  await expect(page.getByTestId("v13-mandate-budget")).toContainText('"consumedCount":1');
  await expect(page.getByTestId("v13-account-id")).toContainText("8995");
  await expect(page.getByTestId("v13-positions")).toContainText("100");
  const clientOrderId = `v13-auto-${proposalId}`;
  verifyV13RunWithCli(testRunId!, proposalId!, clientOrderId);
  const orderPath = `/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${encodeURIComponent(clientOrderId)}`;
  const outsider = await page.context().browser()!.newContext({ baseURL: new URL(page.url()).origin });
  const wrongOwner = await outsider.request.get(orderPath, { headers: { "x-stockquant-user": "v13-unrelated-owner" } });
  await outsider.close();
  const wrongRun = await page.evaluate(async ({ proposalId, clientOrderId }) => (await fetch(`/api/v1/acceptance/v1/v1.3/runs/${crypto.randomUUID()}/proposals/${proposalId}/orders/${encodeURIComponent(clientOrderId)}`)).status, { proposalId: proposalId!, clientOrderId });
  const forbiddenReads = { wrongOwner: wrongOwner.status(), wrongRun };
  expect(forbiddenReads).toEqual({ wrongOwner: 403, wrongRun: 404 });
  await page.reload();
  await expect(page.getByTestId("v13-test-run-id")).toHaveText(testRunId!);
  await expect(page.getByTestId("v13-auto-mandate-state")).toContainText("ACTIVE");
  await expect(page.getByTestId("v13-proposal-status")).toHaveText("AUTO_POLICY_PENDING");
  await expect(page.getByTestId("v13-account-id")).toContainText("8995");
  await expect(page.getByTestId("v13-order")).toContainText("FILLED");
  await expect(page.getByTestId("v13-order")).toContainText("100 × 10.0000 · fee 5.0000");
  await expect(page.getByTestId("v13-order")).toContainText("8995.0000 CNY");
  await expect(page.getByTestId("v13-reconciliation")).toHaveText("MATCH");
  verifyV13RunWithCli(testRunId!, proposalId!, clientOrderId);
  await page.getByTestId("v13-pause-auto-mandate").click();
  await expect(page.getByTestId("v13-auto-mandate-state")).toContainText("PAUSED");
  console.info(`[V1.3 AUTO_POLICY FakeBroker loop] ${JSON.stringify({ testRunId, mandateId, proposalId, clientOrderId, cash: "8995.0000 CNY", reservation: "1005.0000", status: "MATCH", crossOwnerOrderRead: forbiddenReads.wrongOwner, crossRunOrderRead: forbiddenReads.wrongRun })}`);
});

test("V1.3 AUTO_POLICY reserves one aggregate Mandate budget and executes/reloads each fixed BUY child", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  await page.getByTestId("v13-create-auto-multileg-mandate").click();
  await expect(page.getByTestId("v13-auto-mandate-state")).toContainText("2210.00");
  await page.getByTestId("v13-activate-auto-mandate").click();
  await expect(page.getByTestId("v13-auto-mandate-state")).toContainText("ACTIVE");
  await page.getByTestId("v13-create-auto-multileg-proposal").click();
  await expect(page.getByTestId("v13-proposal-status")).toHaveText("AUTO_POLICY_PENDING");
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  expect(proposalId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByTestId("v13-execute-auto-proposal").click();
  await expect(page.getByTestId("v13-order")).toContainText(":leg:01");
  await expect(page.getByTestId("v13-order")).toContainText(":leg:02");
  await expect(page.getByTestId("v13-order")).toContainText("MATCH");
  await expect(page.getByTestId("v13-mandate-budget")).toContainText("VERIFIED");
  await expect(page.getByTestId("v13-mandate-budget")).toContainText('"reservationCount":1');
  await expect(page.getByTestId("v13-mandate-budget")).toContainText('"consumedCount":1');
  await expect(page.getByTestId("v13-mandate-budget")).toContainText('"consumedAmount":"2210.00"');
  await expect(page.getByTestId("v13-account-id")).toContainText("7790.0000");
  await expect(page.getByTestId("v13-positions")).toContainText("600000.SH");
  await expect(page.getByTestId("v13-positions")).toContainText("000001.SZ");
  const clientOrderId = `v13-auto-${proposalId}`;
  verifyV13MultiLegRunWithCli(testRunId!, proposalId!, clientOrderId, "7790.0000", ["1005.0000", "1205.0000"]);
  await page.reload();
  await expect(page.getByTestId("v13-order")).toContainText(":leg:01");
  await expect(page.getByTestId("v13-order")).toContainText(":leg:02");
  await expect(page.getByTestId("v13-order")).toContainText("MATCH");
  await expect(page.getByTestId("v13-mandate-budget")).toContainText("VERIFIED");
  verifyV13MultiLegRunWithCli(testRunId!, proposalId!, clientOrderId, "7790.0000", ["1005.0000", "1205.0000"]);
  console.info(`[V1.3 AUTO_POLICY multi-leg] ${JSON.stringify({ testRunId, proposalId, clientOrderId, childClientOrderIds: [`${clientOrderId}:leg:01`, `${clientOrderId}:leg:02`], mandateReservations: 1, consumedAmount: "2210.00", cash: "7790.0000", cliSameRunCheck: true })}`);
});

test("V1.3 AUTO_POLICY executes the fixed US_EQUITY multi-leg BUY batch", async ({ page }) => {
  const fixture = v13MultiLegFixture.scenarios.normal.US_EQUITY;
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByLabel("市场").selectOption("US_EQUITY");
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  await expect(page.getByTestId("v13-account-id")).toContainText("USD");
  await page.getByTestId("v13-create-auto-multileg-mandate").click();
  await expect(page.getByTestId("v13-auto-mandate-state")).toContainText(fixture.totalReservedCash.replace(".1000", ".10"));
  await page.getByTestId("v13-activate-auto-mandate").click();
  await expect(page.getByTestId("v13-auto-mandate-state")).toContainText("ACTIVE");
  await page.getByTestId("v13-create-auto-multileg-proposal").click();
  await expect(page.getByTestId("v13-proposal-status")).toHaveText("AUTO_POLICY_PENDING");
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  expect(proposalId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByTestId("v13-execute-auto-proposal").click();
  await expect(page.getByTestId("v13-order")).toContainText(":leg:01");
  await expect(page.getByTestId("v13-order")).toContainText(":leg:02");
  await expect(page.getByTestId("v13-order")).toContainText("MATCH");
  await expect(page.getByTestId("v13-mandate-budget")).toContainText("VERIFIED");
  await expect(page.getByTestId("v13-mandate-budget")).toContainText('"reservationCount":1');
  await expect(page.getByTestId("v13-mandate-budget")).toContainText('"consumedCount":1');
  await expect(page.getByTestId("v13-mandate-budget")).toContainText('"consumedAmount":"450.10"');
  await expect(page.getByTestId("v13-account-id")).toContainText(fixture.expectedCash);
  for (const security of Object.keys(fixture.expectedPositions)) await expect(page.getByTestId("v13-positions")).toContainText(security);
  const clientOrderId = `v13-auto-${proposalId}`;
  verifyV13MultiLegRunWithCli(testRunId!, proposalId!, clientOrderId, fixture.expectedCash, fixture.legs.map((leg: any) => leg.reservedCash));
  await page.reload();
  await expect(page.getByTestId("v13-order")).toContainText(":leg:01");
  await expect(page.getByTestId("v13-order")).toContainText(":leg:02");
  await expect(page.getByTestId("v13-order")).toContainText("MATCH");
  await expect(page.getByTestId("v13-mandate-budget")).toContainText("VERIFIED");
  verifyV13MultiLegRunWithCli(testRunId!, proposalId!, clientOrderId, fixture.expectedCash, fixture.legs.map((leg: any) => leg.reservedCash));
  console.info(`[V1.3 AUTO_POLICY US multi-leg] ${JSON.stringify({ testRunId, proposalId, clientOrderId, childClientOrderIds: [`${clientOrderId}:leg:01`, `${clientOrderId}:leg:02`], mandateReservations: 1, consumedAmount: "450.10", cash: fixture.expectedCash, positions: fixture.expectedPositions })}`);
});

test("V1.3 L04 AUTO_POLICY HOLD leaves FakeBroker, Portfolio cash and order count unchanged", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  await expect(page.getByTestId("v13-test-run-id")).toBeVisible();
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  await expect(page.getByTestId("v13-account-id")).toContainText("10000");
  await page.getByTestId("v13-create-auto-mandate").click();
  await page.getByTestId("v13-activate-auto-mandate").click();
  await expect(page.getByTestId("v13-auto-mandate-state")).toContainText("ACTIVE");
  await page.getByRole("button", { name: "创建AUTO_POLICY HOLD建议" }).click();
  await expect(page.getByTestId("v13-proposal-status")).toHaveText("AUTO_POLICY_PENDING");
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  expect(proposalId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByTestId("v13-execute-auto-proposal").click();
  await expect(page.getByTestId("v13-auto-decision")).toHaveText("HOLD");
  await expect(page.getByTestId("v13-order")).toContainText("NONE");
  await expect(page.getByTestId("v13-account-id")).toContainText("10000");
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  verifyV13RunWithCli(testRunId!, proposalId!);
});

test("V1.3 L04 AUTO_POLICY rejects the third fee-inclusive order without another FakeBroker order", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  const runEvidence = JSON.parse((await page.getByTestId("v13-evidence").textContent()) ?? "{}");
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  const accountId = (await page.getByTestId("v13-account-id").textContent())?.match(/[0-9a-f-]{36}/iu)?.[0];
  await page.getByTestId("v13-create-auto-mandate").click();
  await page.getByTestId("v13-activate-auto-mandate").click();
  const mandateId = (await page.getByTestId("v13-auto-mandate-state").textContent())?.match(/[0-9a-f-]{36}/iu)?.[0];
  await page.getByRole("button", { name: "创建AUTO_POLICY固定调仓建议" }).click();
  await page.getByTestId("v13-execute-auto-proposal").click();
  await expect(page.getByTestId("v13-reconciliation")).toHaveText("MATCH");
  const additional = await page.evaluate(async ({ testRunId, accountId, runClockNow }) => {
    const create = async () => {
      const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idempotencyKey: `v13-third-order-${crypto.randomUUID()}`, accountId, approvalMode: "AUTO_POLICY", market: "CN_A", currency: "CNY", strategyVersion: "fixture-auto-policy-test-v1", operation: "REBALANCE", expiresAt: new Date(Date.parse(runClockNow) + 4 * 60 * 60 * 1000).toISOString(), legs: [{ legId: "leg-1", securityId: "600000.SH", side: "BUY", quantity: 100 }] }) });
      return { status: response.status, body: await response.json() };
    };
    return [await create(), await create()];
  }, { testRunId: testRunId!, accountId: accountId!, runClockNow: runEvidence.runClockNow });
  expect(additional.map((item) => item.status)).toEqual([201, 201]);
  const second = await page.evaluate(async ({ testRunId, proposalId, mandateId }) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/auto-execution/submit`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mandateId, mandateVersion: 1, clientOrderId: `v13-auto-${proposalId}` }) });
    return { status: response.status, body: await response.json() };
  }, { testRunId: testRunId!, proposalId: additional[0].body.proposalId, mandateId: mandateId! });
  expect(second.status).toBe(202);
  const rejected = await page.evaluate(async ({ testRunId, proposalId, mandateId }) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/auto-execution/submit`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mandateId, mandateVersion: 1, clientOrderId: `v13-auto-${proposalId}` }) });
    return { status: response.status, body: await response.json() };
  }, { testRunId: testRunId!, proposalId: additional[1].body.proposalId, mandateId: mandateId! });
  expect(rejected.status).toBe(409);
  const account = await page.evaluate(async (accountId) => { const response = await fetch(`/api/v1/accounts/${accountId}`); return response.json(); }, accountId!);
  expect(account.account.cash.amount).toBe("7990.0000");
  const missingOrderStatus = await page.evaluate(async ({ testRunId, proposalId }) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${encodeURIComponent(`v13-auto-${proposalId}`)}`);
    return response.status;
  }, { testRunId: testRunId!, proposalId: additional[1].body.proposalId });
  expect(missingOrderStatus).toBe(404);
  console.info(`[V1.3 AUTO_POLICY order cap] ${JSON.stringify({ testRunId, mandateId, acceptedOrders: 2, rejectedStatus: rejected.status, rejectedOrderLookup: missingOrderStatus, cash: account.account.cash.amount })}`);
});

test("V1.3 L04 paused Mandate rejects a new AUTO_POLICY order without side effects", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  const accountId = (await page.getByTestId("v13-account-id").textContent())?.match(/[0-9a-f-]{36}/iu)?.[0];
  await page.getByTestId("v13-create-auto-mandate").click();
  await page.getByTestId("v13-activate-auto-mandate").click();
  await page.getByTestId("v13-pause-auto-mandate").click();
  await expect(page.getByTestId("v13-auto-mandate-state")).toContainText("PAUSED");
  await page.getByRole("button", { name: "创建AUTO_POLICY固定调仓建议" }).click();
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  const mandateId = (await page.getByTestId("v13-auto-mandate-state").textContent())?.match(/[0-9a-f-]{36}/iu)?.[0];
  const rejected = await page.evaluate(async ({ testRunId, proposalId, mandateId }) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/auto-execution/submit`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mandateId, mandateVersion: 1, clientOrderId: `v13-auto-${proposalId}` }) });
    return response.status;
  }, { testRunId: testRunId!, proposalId: proposalId!, mandateId: mandateId! });
  expect(rejected).toBe(403);
  const account = await page.evaluate(async (accountId) => { const response = await fetch(`/api/v1/accounts/${accountId}`); return response.json(); }, accountId!);
  expect(account.account.cash.amount).toBe("10000.0000");
  const missingOrderStatus = await page.evaluate(async ({ testRunId, proposalId }) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${encodeURIComponent(`v13-auto-${proposalId}`)}`);
    return response.status;
  }, { testRunId: testRunId!, proposalId: proposalId! });
  expect(missingOrderStatus).toBe(404);
});

test("V1.3 L05 rejects cross-currency and out-of-scope AUTO_POLICY commands without creating orders or Portfolio resources", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  const evidence = JSON.parse((await page.getByTestId("v13-evidence").textContent()) ?? "{}");
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  const accountId = (await page.getByTestId("v13-account-id").textContent())?.match(/[0-9a-f-]{36}/iu)?.[0];
  const currencyMismatch = await page.evaluate(async ({ testRunId, accountId, runClockNow }) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idempotencyKey: `v13-cross-currency-${crypto.randomUUID()}`, accountId, approvalMode: "AUTO_POLICY", market: "US_EQUITY", currency: "USD", strategyVersion: "fixture-auto-policy-test-v1", operation: "REBALANCE", expiresAt: new Date(Date.parse(runClockNow) + 4 * 60 * 60 * 1000).toISOString(), legs: [{ legId: "leg-1", securityId: "AAPL", side: "BUY", quantity: 10 }] }) });
    return { status: response.status, body: await response.json() };
  }, { testRunId: testRunId!, accountId: accountId!, runClockNow: evidence.runClockNow });
  expect(currencyMismatch.status).toBe(403);
  const mandate = await page.evaluate(async ({ testRunId, accountId, now }) => {
    const mandateId = crypto.randomUUID();
    const create = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/auto-mandates`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mandateId, accountId, strategyVersion: "fixture-auto-policy-test-v1", market: "CN_A", currency: "CNY", securityScope: ["000001.SZ"], maxOrderAmount: "1005.00", maxTotalAmount: "2010.00", maxOrderCount: 2, validFrom: now, expiresAt: new Date(Date.parse(now) + 4 * 60 * 60 * 1000).toISOString(), reason: "L04 out-of-scope security rejection" }) });
    const body = await create.json();
    if (!create.ok) return { createStatus: create.status, createBody: body };
    const activate = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/auto-mandates/${mandateId}/activate`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mandateVersion: body.mandateVersion, contentHash: body.contentHash, reason: "activate exact out-of-scope test mandate" }) });
    return { createStatus: create.status, createBody: body, activateStatus: activate.status, activateBody: await activate.json(), mandateId };
  }, { testRunId: testRunId!, accountId: accountId!, now: evidence.runClockNow });
  expect(mandate.createStatus).toBe(201);
  expect(mandate.activateStatus).toBe(201);
  await page.getByRole("button", { name: "创建AUTO_POLICY固定调仓建议" }).click();
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  const rejected = await page.evaluate(async ({ testRunId, proposalId, mandateId }) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/auto-execution/submit`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mandateId, mandateVersion: 1, clientOrderId: `v13-auto-out-of-scope-${proposalId}` }) });
    return { status: response.status, body: await response.json() };
  }, { testRunId: testRunId!, proposalId: proposalId!, mandateId: mandate.mandateId! });
  expect(rejected.status).toBe(403);
  verifyV13RunWithCli(testRunId!, proposalId!);
  const account = await page.evaluate(async (accountId) => { const response = await fetch(`/api/v1/accounts/${accountId}`); return response.json(); }, accountId!);
  expect(account.account.cash.amount).toBe("10000.0000");
  expect(account.account.reservations).toEqual([]);
  const missingOrderStatus = await page.evaluate(async ({ testRunId, proposalId }) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${encodeURIComponent(`v13-auto-out-of-scope-${proposalId}`)}`);
    return response.status;
  }, { testRunId: testRunId!, proposalId: proposalId! });
  expect(missingOrderStatus).toBe(404);
  console.info(`[V1.3 L05 currency and mandate scope] ${JSON.stringify({ testRunId, currencyMismatchStatus: currencyMismatch.status, mandateId: mandate.mandateId, proposalId, scopeRejectionStatus: rejected.status, mandateScope: mandate.createBody.securityScope, proposalSecurity: "600000.SH", accountCash: account.account.cash.amount, reservations: account.account.reservations.length, orderLookup: missingOrderStatus })}`);
});

test("V1.3 L05 rejects a same-day CN sale of shares bought in this TestRun before FakeBroker submission", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  const evidence = JSON.parse((await page.getByTestId("v13-evidence").textContent()) ?? "{}");
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  const accountId = (await page.getByTestId("v13-account-id").textContent())?.match(/[0-9a-f-]{36}/iu)?.[0];
  await page.getByRole("button", { name: "创建MANUAL固定Fixture调仓提案" }).click();
  await page.getByRole("button", { name: "人工批准", exact: true }).click();
  const buyProposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  await page.getByTestId("v13-execute-proposal").click();
  await expect(page.getByTestId("v13-order")).toContainText("FILLED");
  const sellCreated = await page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals`, { data: { idempotencyKey: `v13-l05-same-day-sell-${testRunId}`, accountId, approvalMode: "MANUAL_APPROVAL", market: "CN_A", currency: "CNY", strategyVersion: "fixture-manual-test-v1", operation: "REBALANCE", expiresAt: new Date(Date.parse(evidence.runClockNow) + 4 * 60 * 60 * 1000).toISOString(), legs: [{ legId: "sell-leg", securityId: "600000.SH", side: "SELL", quantity: 100 }] } });
  expect(sellCreated.status()).toBe(201);
  const sellProposal = await sellCreated.json();
  const approved = await page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${sellProposal.proposalId}/approve`, { data: { expectedVersion: sellProposal.proposalVersion, expectedContentHash: sellProposal.contentHash, reason: "exercise same-day CN sell settlement rejection" } });
  expect(approved.status()).toBe(201);
  const clientOrderId = `v13-l05-sell-${sellProposal.proposalId}`;
  const submitted = await page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${sellProposal.proposalId}/execution/submit`, { data: { clientOrderId } });
  expect(submitted.status()).toBe(409);
  expect(JSON.stringify(await submitted.json())).toContain("T_PLUS_ONE_UNSETTLED_QUANTITY");
  const account = await page.request.get(`/api/v1/accounts/${accountId}`).then((response) => response.json());
  expect(account.account.cash.amount).toBe("8995.0000");
  expect(account.account.positions).toEqual([{ security: "600000.SH", quantity: 100 }]);
  expect(account.account.reservations).toHaveLength(1);
  expect(account.account.reservations[0].status).toBe("CAPTURED");
  const missingOrder = await page.request.get(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${sellProposal.proposalId}/orders/${encodeURIComponent(clientOrderId)}`);
  expect(missingOrder.status()).toBe(404);
  verifyV13RunWithCli(testRunId!, sellProposal.proposalId);
  console.info(`[V1.3 L05 CN T+1] ${JSON.stringify({ testRunId, buyProposalId, rejectedSellProposalId: sellProposal.proposalId, decision: "T_PLUS_ONE_UNSETTLED_QUANTITY", cash: account.account.cash.amount, position: account.account.positions[0], reservations: account.account.reservations.length, fakeBrokerOrderLookup: missingOrder.status() })}`);
});

test("V1.3 L05 rejects an otherwise authorized order when Portfolio cash is insufficient and preserves zero-side-effect facts", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  const evidence = JSON.parse((await page.getByTestId("v13-evidence").textContent()) ?? "{}");
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  const accountId = (await page.getByTestId("v13-account-id").textContent())?.match(/[0-9a-f-]{36}/iu)?.[0];
  const runPath = `/api/v1/acceptance/v1/v1.3/runs/${testRunId}`;
  const post = async (path: string, body: unknown) => page.evaluate(async ({ path, body }) => {
    const response = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json() };
  }, { path, body });
  let finalProposalId = "";
  let finalClientOrderId = "";
  const successfulOrderIds: string[] = [];
  let failedMultiLegProposalId = "";
  let partialReservationRollbackVerified = false;
  for (let mandateIndex = 0; mandateIndex < 5; mandateIndex += 1) {
    const mandateId = crypto.randomUUID();
    const created = await post(`${runPath}/auto-mandates`, { mandateId, accountId, strategyVersion: "fixture-auto-policy-test-v1", market: "CN_A", currency: "CNY", securityScope: ["600000.SH"], maxOrderAmount: "1005.00", maxTotalAmount: "2010.00", maxOrderCount: 2, validFrom: evidence.runClockNow, expiresAt: new Date(Date.parse(evidence.runClockNow) + 4 * 60 * 60 * 1000).toISOString(), reason: `L05 cash-depletion Mandate ${mandateIndex + 1}` });
    expect(created.status).toBe(201);
    const activated = await post(`${runPath}/auto-mandates/${mandateId}/activate`, { mandateVersion: 1, contentHash: created.body.contentHash, reason: "activate exact bounded two-order Mandate" });
    expect(activated.status).toBe(201);
    if (mandateIndex === 4) {
      const partialReservationBefore = await page.request.get(`/api/v1/accounts/${accountId}`);
      expect(partialReservationBefore.status()).toBe(200);
      const beforeAccount = (await partialReservationBefore.json()).account;
      expect(beforeAccount.cash.amount).toBe("1960.0000");
      const beforeReconciliationResponse = await page.request.get(`${runPath}/reconciliation`);
      expect(beforeReconciliationResponse.status()).toBe(200);
      const beforeReconciliation = await beforeReconciliationResponse.json();
      await page.getByTestId("v13-create-multileg-proposal").click();
      await expect(page.getByTestId("v13-proposal-status")).toHaveText("MANUAL_APPROVAL_PENDING");
      const partialReservationProposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
      expect(partialReservationProposalId).toMatch(/^[0-9a-f-]{36}$/iu);
      await page.getByRole("button", { name: "人工批准", exact: true }).click();
      await expect(page.getByTestId("v13-proposal-status")).toHaveText("APPROVED_MANUAL");
      failedMultiLegProposalId = partialReservationProposalId!;
      const partialReservationClientOrderId = `v13-${partialReservationProposalId}`;
      const partialReservationSubmit = await page.request.post(`${runPath}/proposals/${partialReservationProposalId}/execution/submit`, { data: { clientOrderId: partialReservationClientOrderId } });
      const partialReservationStatus = partialReservationSubmit.status();
      const partialReservationBody = await partialReservationSubmit.text();
      console.info(`[V1.3 L05 multi-leg low-cash reservation] ${JSON.stringify({ testRunId, accountId, beforeReservationCount: beforeAccount.reservations.length, beforeCash: beforeAccount.cash.amount, status: partialReservationStatus, response: partialReservationBody })}`);
      expect(partialReservationStatus).toBe(409);
      expect(partialReservationBody).toMatch(/INSUFFICIENT_AVAILABLE_CASH/u);
      for (const legId of ["leg:01", "leg:02"]) {
        const childOrder = await page.request.get(`${runPath}/proposals/${partialReservationProposalId}/orders/${encodeURIComponent(`${partialReservationClientOrderId}:${legId}`)}`);
        expect(childOrder.status()).toBe(404);
      }
      const afterAccountResponse = await page.request.get(`/api/v1/accounts/${accountId}`);
      const afterAccount = (await afterAccountResponse.json()).account;
      expect(afterAccount).toMatchObject({ cash: beforeAccount.cash, ledgerEntryCount: beforeAccount.ledgerEntryCount, ledgerVersion: beforeAccount.ledgerVersion, positions: beforeAccount.positions });
      expect(afterAccount.reservations).toHaveLength(beforeAccount.reservations.length + 1);
      const releasedFirstLegReservation = afterAccount.reservations.find((reservation: any) => reservation.clientOrderId === `${partialReservationClientOrderId}:leg:01`);
      expect(releasedFirstLegReservation).toMatchObject({ cashAmount: "1005.0000", capturedCashAmount: "0.0000", capturedQuantity: 0, status: "RELEASED" });
      expect(afterAccount.reservations.some((reservation: any) => reservation.clientOrderId === `${partialReservationClientOrderId}:leg:02`)).toBe(false);
      expect(await (await page.request.get(`${runPath}/reconciliation`)).json()).toEqual(beforeReconciliation);
      partialReservationRollbackVerified = true;
    }
    for (let orderIndex = 0; orderIndex < 2; orderIndex += 1) {
      const proposal = await post(`${runPath}/proposals`, { idempotencyKey: `v13-l05-cash-${mandateIndex}-${orderIndex}-${crypto.randomUUID()}`, accountId, approvalMode: "AUTO_POLICY", market: "CN_A", currency: "CNY", strategyVersion: "fixture-auto-policy-test-v1", operation: "REBALANCE", expiresAt: new Date(Date.parse(evidence.runClockNow) + 4 * 60 * 60 * 1000).toISOString(), legs: [{ legId: "leg-1", securityId: "600000.SH", side: "BUY", quantity: 100 }] });
      expect(proposal.status).toBe(201);
      const proposalId = proposal.body.proposalId as string;
      const clientOrderId = `v13-l05-cash-${mandateIndex}-${orderIndex}-${proposalId}`;
      const execution = await post(`${runPath}/proposals/${proposalId}/auto-execution/submit`, { mandateId, mandateVersion: 1, clientOrderId });
      finalProposalId = proposalId;
      finalClientOrderId = clientOrderId;
      if (mandateIndex === 4 && orderIndex === 1) {
        expect(execution.status).toBe(409);
        expect(JSON.stringify(execution.body)).toContain("Portfolio resource reservation failed");
        const replay = await post(`${runPath}/proposals/${proposalId}/auto-execution/submit`, { mandateId, mandateVersion: 1, clientOrderId });
        expect(replay.status).toBe(403);
        expect(JSON.stringify(replay.body)).toContain("AUTO_POLICY Mandate rejected this Proposal");
      } else {
        expect(execution.status).toBe(202);
        expect(execution.body.order.status).toBe("FILLED");
        successfulOrderIds.push(execution.body.order.order_id);
      }
    }
    const paused = await post(`${runPath}/auto-mandates/${mandateId}/pause`, { mandateVersion: 1, reason: "close bounded L05 depletion Mandate" });
    expect(paused.status).toBe(201);
  }
  expect(successfulOrderIds).toHaveLength(9);
  expect(new Set(successfulOrderIds).size).toBe(9);
  const account = await page.evaluate(async (accountId) => { const response = await fetch(`/api/v1/accounts/${accountId}`); return response.json(); }, accountId!);
  expect(account.account.cash.amount).toBe("955.0000");
  expect(account.account.reservations).toHaveLength(10);
  expect(account.account.reservations.filter((reservation: any) => reservation.status === "CAPTURED")).toHaveLength(9);
  expect(account.account.reservations.filter((reservation: any) => reservation.status === "RELEASED")).toHaveLength(1);
  const missingOrder = await page.evaluate(async ({ testRunId, proposalId, clientOrderId }) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${encodeURIComponent(clientOrderId)}`);
    return response.status;
  }, { testRunId: testRunId!, proposalId: finalProposalId, clientOrderId: finalClientOrderId });
  expect(missingOrder).toBe(404);
  expect(partialReservationRollbackVerified).toBe(true);
  verifyV13RunWithCli(testRunId!, failedMultiLegProposalId);
  console.info(`[V1.3 L05 insufficient cash] ${JSON.stringify({ testRunId, successfulFakeBrokerOrders: successfulOrderIds.length, rejectedProposalId: finalProposalId, rejectedClientOrderId: finalClientOrderId, finalCash: account.account.cash.amount, capturedReservations: account.account.reservations.length, rejectedOrderLookup: missingOrder, rejectedMultiLegProposalId: failedMultiLegProposalId, partialReservationRollbackVerified, firstLegReservationStatus: "RELEASED", cashBeforeMultiLeg: "1960.0000" })}`);
});

test("V1.3 L09 persists and displays an independent external-order discrepancy without mutating the Portfolio ledger", async ({ page }) => {
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  await expect(page.getByTestId("v13-test-run-id")).not.toHaveText("");
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  await expect(page.getByTestId("v13-account-id")).toContainText("10000.0000");
  await page.getByRole("button", { name: "创建MANUAL固定Fixture调仓提案" }).click();
  await expect(page.getByTestId("v13-proposal-status")).toHaveText("MANUAL_APPROVAL_PENDING");
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  expect(proposalId).toMatch(/^[0-9a-f-]{36}$/iu);
  await expect(page.getByTestId("v13-external-order-count")).toHaveText("外部未匹配订单：0");
  await page.getByTestId("v13-observe-external-order").click();
  await expect(page.getByTestId("v13-external-order-count")).toHaveText("外部未匹配订单：1");
  await expect(page.getByTestId("v13-reconciliation-discrepancies")).toContainText("EXTERNAL_ORDER_MISSING_LOCALLY");
  await expect(page.getByTestId("v13-reconciliation-discrepancies")).toContainText(`fixture:${testRunId}:independent-external-order`);
  const reconciliation = await page.evaluate(async (id) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${id}/reconciliation`);
    return { status: response.status, body: await response.json() };
  }, testRunId!);
  expect(reconciliation.status).toBe(200);
  expect(reconciliation.body.order_count).toBe(0);
  expect(reconciliation.body.fill_count).toBe(0);
  expect(reconciliation.body.pending_outbox_count).toBe(0);
  expect(reconciliation.body.externalOnlyOrderCount).toBe(1);
  const replay = await page.evaluate(async (id) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${id}/external-orders/observe`, { method: "POST", body: "{}" });
    return { status: response.status, body: await response.json() };
  }, testRunId!);
  expect(replay.status).toBe(201);
  expect(replay.body.observation.replayed).toBe(true);
  expect(replay.body.reconciliation.externalOnlyOrderCount).toBe(1);
  const account = await page.evaluate(async (id) => {
    const accountId = new URL(window.location.href).searchParams.get("accountId");
    const response = await fetch(`/api/v1/accounts/${accountId}`);
    return (await response.json()).account;
  }, testRunId!);
  expect(account.cash.amount).toBe("10000.0000");
  expect(account.positions).toEqual([]);
  expect(account.reservations).toEqual([]);
  await page.reload();
  await expect(page.getByTestId("v13-test-run-id")).toHaveText(testRunId!);
  await expect(page.getByTestId("v13-external-order-count")).toHaveText("外部未匹配订单：1");
  await expect(page.getByTestId("v13-reconciliation-discrepancies")).toContainText(`fixture:${testRunId}:independent-external-order`);
  verifyV13RunWithCli(testRunId!, proposalId!);
  console.info(`[V1.3 L09 external FakeBroker discrepancy] ${JSON.stringify({ testRunId, externalOnlyOrderCount: reconciliation.body.externalOnlyOrderCount, orderCount: reconciliation.body.order_count, fillCount: reconciliation.body.fill_count, cash: account.cash.amount, discrepancy: reconciliation.body.discrepancies[0] })}`);
});

test("V1.3 L10 revokes the server session and rejects both the browser cookie and a replayed token", async ({ page, context, request }) => {
  test.setTimeout(45_000);
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);

  const beforeInvalidation = await page.evaluate(async (id) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${id}`);
    return response.status;
  }, testRunId!);
  expect(beforeInvalidation).toBe(200);

  const sessionToken = (await context.cookies()).find((cookie) => cookie.name === "sq_session")?.value;
  expect(sessionToken).toMatch(/^[a-f0-9]{64}$/u);
  const logout = await page.evaluate(async () => {
    const response = await fetch("/api/v1/session/logout", { method: "POST" });
    return response.status;
  });
  expect(logout).toBe(204);
  const project = process.env.STOCKQUANT_V13_TEST_COMPOSE_PROJECT;
  expect(project).toMatch(/^sq-v13-web-[a-f0-9]{20}$/u);
  const restarted = spawnSync("docker", ["compose", "-p", project!, "-f", "infra/compose/docker-compose.v13-integration.yml", "restart", "platform-api-service"], {
    cwd: resolve(process.cwd(), "../.."), encoding: "utf8", env: process.env, timeout: 20_000,
  });
  expect(restarted.status, restarted.stderr).toBe(0);
  const apiUrl = process.env.STOCKQUANT_PLATFORM_API_URL;
  expect(apiUrl).toBeTruthy();
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { if ((await fetch(`${apiUrl}/live`)).ok) { ready = true; break; } } catch { /* wait for isolated Platform restart */ }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  expect(ready).toBe(true);
  const replayedToken = await request.get(`${process.env.STOCKQUANT_PLATFORM_API_URL}/api/v1/acceptance/v1/v1.3/runs/${testRunId}`, {
    headers: { cookie: `sq_session=${sessionToken}` },
  });
  expect(replayedToken.status()).toBe(401);

  const afterInvalidation = await page.evaluate(async (id) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${id}`);
    return { status: response.status, body: await response.json() };
  }, testRunId!);
  expect(afterInvalidation.status).toBe(401);
  expect(afterInvalidation.body.message).toContain("local session");
  console.info(`[V1.3 L10 browser session invalidation] ${JSON.stringify({ testRunId, beforeInvalidation, logout, platformRestarted: ready, replayedToken: replayedToken.status(), afterInvalidation: afterInvalidation.status })}`);
});

test("V1.3 L06 recovers an AUTO_POLICY order after committed response loss and a temporary original-order query failure", async ({ page }) => {
  test.setTimeout(30_000);
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  const accountId = (await page.getByTestId("v13-account-id").textContent())?.match(/[0-9a-f-]{36}/iu)?.[0];
  await page.getByTestId("v13-create-auto-mandate").click();
  await page.getByTestId("v13-activate-auto-mandate").click();
  const mandateId = (await page.getByTestId("v13-auto-mandate-state").textContent())?.match(/[0-9a-f-]{36}/iu)?.[0];
  await page.getByRole("button", { name: "创建AUTO_POLICY固定调仓建议" }).click();
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  const clientOrderId = `v13-fault-unknown-${proposalId}`;
  const submit = async () => page.evaluate(async ({ testRunId, proposalId, mandateId, clientOrderId }) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/auto-execution/submit`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mandateId, mandateVersion: 1, clientOrderId }) });
    return { status: response.status, body: await response.json() };
  }, { testRunId: testRunId!, proposalId: proposalId!, mandateId: mandateId!, clientOrderId });
  const lostResponse = await submit();
  console.info(`[V1.3 L06 first attempt] ${JSON.stringify(lostResponse)}`);
  expect(lostResponse.status).toBe(503);
  expect(JSON.stringify(lostResponse.body)).toContain("V1.3 AUTO Trade Execution failed (503)");
  const firstPending = await page.evaluate(async (accountId) => { const response = await fetch(`/api/v1/accounts/${accountId}`); return response.json(); }, accountId!);
  expect(firstPending.account.reservations).toContainEqual(expect.objectContaining({ clientOrderId, status: "HELD", cashAmount: "1005.0000" }));
  const unavailableRead = await submit();
  console.info(`[V1.3 L06 second attempt] ${JSON.stringify(unavailableRead)}`);
  expect(unavailableRead.status).toBe(503);
  const secondPending = await page.evaluate(async (accountId) => { const response = await fetch(`/api/v1/accounts/${accountId}`); return response.json(); }, accountId!);
  const secondReservation = secondPending.account.reservations.find((item: { clientOrderId: string }) => item.clientOrderId === clientOrderId);
  expect(secondReservation, "the original order must retain a reservation or a captured Fill").toMatchObject({ cashAmount: "1005.0000" });
  expect(["HELD", "CAPTURED"]).toContain(secondReservation.status);
  if (secondReservation.status === "CAPTURED") {
    expect(secondPending.account.cash).toMatchObject({ amount: "8995.0000", currency: "CNY" });
    expect(secondPending.account.positions).toContainEqual(expect.objectContaining({ security: "600000.SH", quantity: 100 }));
  }
  const recovered = await submit();
  console.info(`[V1.3 L06 recovery attempt] ${JSON.stringify(recovered)}`);
  expect([200, 202]).toContain(recovered.status);
  expect(recovered.body.order.status).toBe("FILLED");
  expect(recovered.body.outbox.status).toBe("DELIVERED");
  expect(recovered.body.reconciliation.unresolved_order_count).toBe(0);
  expect(recovered.body.reconciliation.pending_outbox_count).toBe(0);
  expect(recovered.body.reconciliation.discrepancies).toEqual([]);
  const order = await page.evaluate(async ({ testRunId, proposalId, clientOrderId }) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${encodeURIComponent(clientOrderId)}`);
    return { status: response.status, body: await response.json() };
  }, { testRunId: testRunId!, proposalId: proposalId!, clientOrderId });
  expect(order.status).toBe(200);
  expect(order.body.order.status).toBe("FILLED");
  expect(order.body.fill.quantity).toBe(100);
  expect(order.body.reconciliation.status).toBe("MATCH");
  expect(order.body.reconciliation.discrepancies).toEqual([]);
  expect(order.body.independentAssets.current_cash).toBe("8995.0000");
  const settled = await page.evaluate(async (accountId) => { const response = await fetch(`/api/v1/accounts/${accountId}`); return response.json(); }, accountId!);
  expect(settled.account.reservations).toContainEqual(expect.objectContaining({ clientOrderId, status: "CAPTURED", capturedCashAmount: "1005.0000" }));
  verifyV13RunWithCli(testRunId!, proposalId!, clientOrderId);
  console.info(`[V1.3 L06 UNKNOWN recovery] ${JSON.stringify({ testRunId, mandateId, proposalId, clientOrderId, injectedEvents: ["response lost after FakeBroker commit", "original order read unavailable once"], observedStatuses: [lostResponse.status, unavailableRead.status, recovered.status], orderId: order.body.order.order_id, fillId: order.body.fill.externalFillId, reconciliation: order.body.reconciliation })}`);
});

test("V1.3 US_EQUITY L06 recovers AAPL after committed response loss and original-order query failure", async ({ page }) => {
  test.setTimeout(30_000);
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByLabel("市场").selectOption("US_EQUITY");
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  const accountId = (await page.getByTestId("v13-account-id").textContent())?.match(/[0-9a-f-]{36}/iu)?.[0];
  expect(accountId).toBeTruthy();
  await page.getByTestId("v13-create-auto-mandate").click();
  await page.getByTestId("v13-activate-auto-mandate").click();
  const mandateId = (await page.getByTestId("v13-auto-mandate-state").textContent())?.match(/[0-9a-f-]{36}/iu)?.[0];
  expect(mandateId).toBeTruthy();
  await page.getByRole("button", { name: "创建AUTO_POLICY固定调仓建议" }).click();
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  expect(proposalId).toMatch(/^[0-9a-f-]{36}$/iu);
  const clientOrderId = `v13-fault-unknown-us-${proposalId}`;
  const submit = async () => page.evaluate(async ({ testRunId, proposalId, mandateId, clientOrderId }) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/auto-execution/submit`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mandateId, mandateVersion: 1, clientOrderId }) });
    return { status: response.status, body: await response.json() };
  }, { testRunId: testRunId!, proposalId: proposalId!, mandateId: mandateId!, clientOrderId });
  const lostResponse = await submit();
  expect(lostResponse.status).toBe(503);
  const afterCommit = await page.evaluate(async (accountId) => fetch(`/api/v1/accounts/${accountId}`).then((response) => response.json()), accountId!);
  expect(afterCommit.account.reservations).toContainEqual(expect.objectContaining({ clientOrderId, status: "HELD", cashAmount: "250.0500" }));
  const unavailableRead = await submit();
  expect(unavailableRead.status).toBe(503);
  const recovered = await submit();
  expect([200, 202]).toContain(recovered.status);
  expect(recovered.body.order.status).toBe("FILLED");
  expect(recovered.body.fill.quantity).toBe(10);
  expect(recovered.body.fill.price).toBe("25.0000");
  expect(recovered.body.fill.fee).toBe("0.0500");
  expect(recovered.body.outbox.status).toBe("DELIVERED");
  expect(recovered.body.reconciliation).toMatchObject({ unresolved_order_count: 0, pending_outbox_count: 0, discrepancies: [] });
  const order = await page.request.get(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${encodeURIComponent(clientOrderId)}`).then(async (response) => ({ status: response.status(), body: await response.json() }));
  expect(order.status).toBe(200);
  expect(order.body.order.status).toBe("FILLED");
  expect(order.body.independentAssets).toMatchObject({ current_cash: "9749.9500", currency: "USD" });
  expect(order.body.reconciliation.status).toBe("MATCH");
  const settled = await page.request.get(`/api/v1/accounts/${accountId}`).then((response) => response.json());
  expect(settled.account.cash).toMatchObject({ amount: "9749.9500", currency: "USD" });
  expect(settled.account.positions).toContainEqual(expect.objectContaining({ security: "AAPL", quantity: 10 }));
  expect(settled.account.reservations).toContainEqual(expect.objectContaining({ clientOrderId, status: "CAPTURED", capturedCashAmount: "250.0500" }));
  verifyV13RunWithCli(testRunId!, proposalId!, clientOrderId, "9749.9500", "250.0500", "FILLED", "CAPTURED", "250.0500");
  console.info(`[V1.3 US_EQUITY L06 UNKNOWN recovery] ${JSON.stringify({ testRunId, market: "US_EQUITY", security: "AAPL", mandateId, proposalId, clientOrderId, injectedEvents: ["FakeBroker committed original order; response lost", "original-order read unavailable once", "retry queried original clientOrderId and recovered without resending"], observedStatuses: [lostResponse.status, unavailableRead.status, recovered.status], orderId: order.body.order.order_id, fill: order.body.fill, cash: order.body.independentAssets.current_cash, reconciliation: order.body.reconciliation.status })}`);
});

test("V1.3 US_EQUITY L06 resumes the same AAPL AUTO_POLICY order after Trade Execution restarts", async ({ page }) => {
  test.setTimeout(60_000);
  const project = process.env.STOCKQUANT_V13_TEST_COMPOSE_PROJECT;
  const tradeUrl = process.env.STOCKQUANT_V13_TRADE_URL;
  expect(project, "the isolated V1.3 Compose project must be provided by its runner").toBeTruthy();
  expect(tradeUrl, "the isolated Trade loopback URL must be provided by its runner").toBeTruthy();
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByLabel("市场").selectOption("US_EQUITY");
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  const accountId = (await page.getByTestId("v13-account-id").textContent())?.match(/[0-9a-f-]{36}/iu)?.[0];
  await page.getByTestId("v13-create-auto-mandate").click();
  await page.getByTestId("v13-activate-auto-mandate").click();
  const mandateId = (await page.getByTestId("v13-auto-mandate-state").textContent())?.match(/[0-9a-f-]{36}/iu)?.[0];
  await page.getByRole("button", { name: "创建AUTO_POLICY固定调仓建议" }).click();
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  const clientOrderId = `v13-fault-restart-us-${proposalId}`;
  const submit = async () => page.evaluate(async ({ testRunId, proposalId, mandateId, clientOrderId }) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/auto-execution/submit`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mandateId, mandateVersion: 1, clientOrderId }) });
    return { status: response.status, body: await response.json() };
  }, { testRunId: testRunId!, proposalId: proposalId!, mandateId: mandateId!, clientOrderId });
  const lostResponse = await submit();
  expect(lostResponse.status).toBe(503);
  const pending = await page.request.get(`/api/v1/accounts/${accountId}`).then((response) => response.json());
  expect(pending.account.reservations).toContainEqual(expect.objectContaining({ clientOrderId, status: "HELD", cashAmount: "250.0500" }));

  const root = resolve(process.cwd(), "../..");
  const restarted = spawnSync("docker", ["compose", "-p", project!, "-f", "infra/compose/docker-compose.v13-integration.yml", "restart", "trade-execution-service"], { cwd: root, encoding: "utf8", env: process.env, timeout: 20_000 });
  expect(restarted.status, restarted.stderr).toBe(0);
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { if ((await fetch(`${tradeUrl}/ready`)).ok) { ready = true; break; } } catch { /* wait for the exact isolated Trade container */ }
    await new Promise((resolveReady) => setTimeout(resolveReady, 250));
  }
  expect(ready, "Trade Execution must become ready after the isolated restart").toBe(true);
  const recovered = await submit();
  expect(recovered.status).toBe(202);
  expect(recovered.body.order.status).toBe("FILLED");
  expect(recovered.body.fill).toMatchObject({ quantity: 10, price: "25.0000", fee: "0.0500" });
  expect(recovered.body.outbox.status).toBe("DELIVERED");
  expect(recovered.body.reconciliation).toMatchObject({ unresolved_order_count: 0, pending_outbox_count: 0, discrepancies: [] });

  const order = await page.request.get(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${encodeURIComponent(clientOrderId)}`).then(async (response) => ({ status: response.status(), body: await response.json() }));
  expect(order.status).toBe(200);
  expect(order.body.order.status).toBe("FILLED");
  expect(order.body.independentAssets).toMatchObject({ current_cash: "9749.9500", currency: "USD" });
  expect(order.body.reconciliation.status).toBe("MATCH");
  const settled = await page.request.get(`/api/v1/accounts/${accountId}`).then((response) => response.json());
  expect(settled.account.cash).toMatchObject({ amount: "9749.9500", currency: "USD" });
  expect(settled.account.positions).toContainEqual(expect.objectContaining({ security: "AAPL", quantity: 10 }));
  expect(settled.account.reservations).toContainEqual(expect.objectContaining({ clientOrderId, status: "CAPTURED", capturedCashAmount: "250.0500" }));
  verifyV13RunWithCli(testRunId!, proposalId!, clientOrderId, "9749.9500", "250.0500", "FILLED", "CAPTURED", "250.0500");
  console.info(`[V1.3 US_EQUITY L06 Trade restart recovery] ${JSON.stringify({ testRunId, market: "US_EQUITY", security: "AAPL", mandateId, proposalId, clientOrderId, injectedEvents: ["FakeBroker committed order/fill", "HTTP response lost", "Trade Execution container restarted", "same clientOrderId queried and recovered without resending"], orderId: order.body.order.order_id, fill: order.body.fill, cash: order.body.independentAssets.current_cash, reconciliation: order.body.reconciliation.status })}`);
});

test("V1.3 L06 recovers the same AUTO_POLICY order after Trade Execution restarts", async ({ page }) => {
  test.setTimeout(60_000);
  const project = process.env.STOCKQUANT_V13_TEST_COMPOSE_PROJECT;
  const tradeUrl = process.env.STOCKQUANT_V13_TRADE_URL;
  expect(project, "the isolated V1.3 Compose project must be provided by its runner").toBeTruthy();
  expect(tradeUrl, "the isolated Trade loopback URL must be provided by its runner").toBeTruthy();
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  const accountId = (await page.getByTestId("v13-account-id").textContent())?.match(/[0-9a-f-]{36}/iu)?.[0];
  await page.getByTestId("v13-create-auto-mandate").click();
  await page.getByTestId("v13-activate-auto-mandate").click();
  const mandateId = (await page.getByTestId("v13-auto-mandate-state").textContent())?.match(/[0-9a-f-]{36}/iu)?.[0];
  await page.getByRole("button", { name: "创建AUTO_POLICY固定调仓建议" }).click();
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  const clientOrderId = `v13-fault-restart-${proposalId}`;
  const submit = async () => page.evaluate(async ({ testRunId, proposalId, mandateId, clientOrderId }) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/auto-execution/submit`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mandateId, mandateVersion: 1, clientOrderId }) });
    return { status: response.status, body: await response.json() };
  }, { testRunId: testRunId!, proposalId: proposalId!, mandateId: mandateId!, clientOrderId });
  const lostResponse = await submit();
  expect(lostResponse.status).toBe(503);
  const pending = await page.evaluate(async (accountId) => { const response = await fetch(`/api/v1/accounts/${accountId}`); return response.json(); }, accountId!);
  expect(pending.account.reservations).toContainEqual(expect.objectContaining({ clientOrderId, status: "HELD", cashAmount: "1005.0000" }));

  const root = resolve(process.cwd(), "../..");
  const restarted = spawnSync("docker", ["compose", "-p", project!, "-f", "infra/compose/docker-compose.v13-integration.yml", "restart", "trade-execution-service"], { cwd: root, encoding: "utf8", env: process.env });
  expect(restarted.status, restarted.stderr).toBe(0);
  let ready = false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { const response = await fetch(`${tradeUrl}/ready`); if (response.ok) { ready = true; break; } } catch { /* wait for the exact isolated Trade container */ }
    await new Promise((resolveReady) => setTimeout(resolveReady, 250));
  }
  expect(ready, "Trade Execution must become ready after the isolated restart").toBe(true);
  const recovered = await submit();
  expect(recovered.status).toBe(202);
  expect(recovered.body.order.status).toBe("FILLED");
  expect(recovered.body.outbox.status).toBe("DELIVERED");
  expect(recovered.body.reconciliation.unresolved_order_count).toBe(0);
  expect(recovered.body.reconciliation.pending_outbox_count).toBe(0);
  expect(recovered.body.reconciliation.discrepancies).toEqual([]);

  const order = await page.evaluate(async ({ testRunId, proposalId, clientOrderId }) => {
    const response = await fetch(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${encodeURIComponent(clientOrderId)}`);
    return { status: response.status, body: await response.json() };
  }, { testRunId: testRunId!, proposalId: proposalId!, clientOrderId });
  expect(order.status).toBe(200);
  expect(order.body.order.status).toBe("FILLED");
  expect(order.body.fill.quantity).toBe(100);
  expect(order.body.reconciliation.status).toBe("MATCH");
  expect(order.body.independentAssets.current_cash).toBe("8995.0000");
  const settled = await page.evaluate(async (accountId) => { const response = await fetch(`/api/v1/accounts/${accountId}`); return response.json(); }, accountId!);
  expect(settled.account.reservations).toContainEqual(expect.objectContaining({ clientOrderId, status: "CAPTURED", capturedCashAmount: "1005.0000" }));
  verifyV13RunWithCli(testRunId!, proposalId!, clientOrderId);
  console.info(`[V1.3 L06 Trade restart recovery] ${JSON.stringify({ testRunId, mandateId, proposalId, clientOrderId, injectedEvents: ["FakeBroker committed order/fill", "HTTP response lost", "Trade Execution container restarted", "same clientOrderId queried and settled"], orderId: order.body.order.order_id, fillId: order.body.fill.externalFillId, reconciliation: order.body.reconciliation })}`);
});

test("V1.3 L07 Web resumes a buffered out-of-order Fill after Trade Execution restarts", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  await page.getByTestId("v13-create-sequenced-proposal").click();
  await expect(page.getByTestId("v13-proposal-status")).toHaveText("MANUAL_APPROVAL_PENDING");
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  expect(proposalId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "人工批准", exact: true }).click();
  await page.getByTestId("v13-execute-sequenced-proposal").click();
  await expect(page.getByTestId("v13-order")).toContainText("ACCEPTED");
  await page.getByTestId("v13-sequence-2-replay").click();
  await expect(page.getByTestId("v13-sequenced-report")).toContainText('"buffered":true');
  await page.getByTestId("v13-sequence-2-replay-10").click();
  await expect(page.getByTestId("v13-sequenced-report")).toContainText('"replayed":true');
  await expect(page.getByTestId("v13-order")).toContainText("ACCEPTED");
  const isolatedProject = process.env.STOCKQUANT_V13_TEST_COMPOSE_PROJECT;
  expect(isolatedProject).toMatch(/^sq-v13-web-[a-f0-9]{20}$/u);
  const restart = spawnSync("docker", ["compose", "-p", isolatedProject!, "-f", "infra/compose/docker-compose.v13-integration.yml", "restart", "trade-execution-service"], {
    cwd: resolve(process.cwd(), "../.."), encoding: "utf8", env: process.env, timeout: 20_000,
  });
  expect(restart.status, restart.stderr).toBe(0);
  const tradeUrl = process.env.STOCKQUANT_V13_TRADE_URL;
  expect(tradeUrl).toBeTruthy();
  let tradeReady = false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { if ((await fetch(`${tradeUrl}/ready`)).ok) { tradeReady = true; break; } } catch { /* wait for isolated Trade Execution restart */ }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  expect(tradeReady, "isolated Trade Execution must become ready after restart").toBe(true);
  await page.getByTestId("v13-sequence-1").click();
  await expect(page.getByTestId("v13-sequenced-report")).toContainText('"lastAppliedSequence":2');
  await expect(page.getByTestId("v13-reconciliation")).toHaveText("MATCH");
  await expect(page.getByTestId("v13-order")).toContainText("8495.0000 CNY");
  await expect(page.getByTestId("v13-positions")).toContainText("150");
  const clientOrderId = `v13-${proposalId}`;
  const order = await page.request.get(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${encodeURIComponent(clientOrderId)}`);
  const result = await order.json();
  expect(order.status()).toBe(200);
  expect(result.order.status).toBe("PARTIALLY_FILLED");
  expect(result.fills.map((fill: { quantity: number; brokerSequence: number }) => [fill.brokerSequence, fill.quantity])).toEqual(v13UsOrderedFixture.expected.fills.map((fill: { sequence: number; quantity: number }) => [fill.sequence, fill.quantity]));
  expect(result.independentAssets.current_cash).toBe("8495.0000");
  expect(result.reconciliation.status).toBe("MATCH");
  verifyV13RunWithCli(testRunId!, proposalId!, clientOrderId, "8495.0000", "500.0000", "PARTIALLY_FILLED", "HELD", "1505.0000");
  console.info(`[V1.3 L07 Web/CLI restart recovery] ${JSON.stringify({ testRunId, proposalId, clientOrderId, injectedEvents: ["seq=2 cumulative 150 buffered", "duplicate seq=2 replayed 10 times", "Trade Execution restarted", "seq=1 cumulative 100 delivered and buffered seq=2 causally applied"], fills: result.fills, cash: result.independentAssets.current_cash, reconciliation: result.reconciliation.status })}`);
});

test("V1.3 US_EQUITY L07 applies a buffered out-of-order AAPL Fill after Trade Execution restarts", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByLabel("市场").selectOption("US_EQUITY");
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  await page.getByTestId("v13-create-sequenced-proposal").click();
  await expect(page.getByTestId("v13-proposal-status")).toHaveText("MANUAL_APPROVAL_PENDING");
  const proposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  expect(proposalId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByRole("button", { name: "人工批准", exact: true }).click();
  await page.getByTestId("v13-execute-sequenced-proposal").click();
  await expect(page.getByTestId("v13-order")).toContainText("ACCEPTED");
  await page.getByTestId("v13-sequence-2-replay").click();
  await expect(page.getByTestId("v13-sequenced-report")).toContainText('"buffered":true');
  await page.getByTestId("v13-sequence-2-replay-10").click();
  await expect(page.getByTestId("v13-sequenced-report")).toContainText('"replayed":true');
  await expect(page.getByTestId("v13-order")).toContainText("ACCEPTED");

  const isolatedProject = process.env.STOCKQUANT_V13_TEST_COMPOSE_PROJECT;
  expect(isolatedProject).toMatch(/^sq-v13-web-[a-f0-9]{20}$/u);
  const restart = spawnSync("docker", ["compose", "-p", isolatedProject!, "-f", "infra/compose/docker-compose.v13-integration.yml", "restart", "trade-execution-service"], {
    cwd: resolve(process.cwd(), "../.."), encoding: "utf8", env: process.env, timeout: 20_000,
  });
  expect(restart.status, restart.stderr).toBe(0);
  const tradeUrl = process.env.STOCKQUANT_V13_TRADE_URL;
  expect(tradeUrl).toBeTruthy();
  let tradeReady = false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { if ((await fetch(`${tradeUrl}/ready`)).ok) { tradeReady = true; break; } } catch { /* wait for isolated Trade Execution restart */ }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  expect(tradeReady, "isolated Trade Execution must become ready after restart").toBe(true);
  await page.getByTestId("v13-sequence-1").click();
  await expect(page.getByTestId("v13-sequenced-report")).toContainText('"lastAppliedSequence":2');
  await expect(page.getByTestId("v13-reconciliation")).toHaveText("MATCH");
  await expect(page.getByTestId("v13-order")).toContainText("6249.9500 USD");
  await expect(page.getByTestId("v13-positions")).toContainText("150");
  const clientOrderId = `v13-${proposalId}`;
  const order = await page.request.get(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${proposalId}/orders/${encodeURIComponent(clientOrderId)}`);
  const result = await order.json();
  expect(order.status()).toBe(200);
  expect(result.order.status).toBe("PARTIALLY_FILLED");
  expect(result.fills.map((fill: { quantity: number; brokerSequence: number }) => [fill.brokerSequence, fill.quantity])).toEqual(v13UsOrderedFixture.expected.fills.map((fill: { sequence: number; quantity: number }) => [fill.sequence, fill.quantity]));
  expect(result.independentAssets).toMatchObject({ current_cash: "6249.9500", currency: "USD" });
  expect(result.reconciliation.status).toBe("MATCH");
  verifyV13RunWithCli(testRunId!, proposalId!, clientOrderId, "6249.9500", "5000.0500", "PARTIALLY_FILLED", "HELD", "3750.0500");
  console.info(`[V1.3 US_EQUITY L07 Web/CLI restart recovery] ${JSON.stringify({ testRunId, market: "US_EQUITY", security: "AAPL", proposalId, clientOrderId, injectedEvents: ["seq=2 cumulative 150 buffered", "duplicate seq=2 replayed 10 times", "Trade Execution restarted", "seq=1 cumulative 100 delivered and buffered seq=2 causally applied"], fills: result.fills, cash: result.independentAssets.current_cash, reconciliation: result.reconciliation.status })}`);
});

test("V1.3 calendar advancement settles T+1 proceeds across both books and unlocks the next BUY", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  const initialEvidence = JSON.parse((await page.getByTestId("v13-evidence").textContent()) ?? "{}");
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  const accountId = (await page.getByTestId("v13-account-id").textContent())?.match(/[0-9a-f-]{36}/iu)?.[0];
  await page.getByRole("button", { name: "创建MANUAL固定Fixture调仓提案" }).click();
  const buyProposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  await page.getByRole("button", { name: "人工批准", exact: true }).click();
  await page.getByTestId("v13-execute-proposal").click();
  await expect(page.getByTestId("v13-order")).toContainText("FILLED");
  await expect(page.getByTestId("v13-reconciliation")).toHaveText("MATCH");
  const afterBuy = await page.request.get(`/api/v1/accounts/${accountId}`).then((response) => response.json());
  expect(afterBuy.account.cash.amount).toBe("8995.0000");
  expect(afterBuy.account.positions).toEqual([{ security: "600000.SH", quantity: 100 }]);

  const makeSell = async (key: string, expectedClock: string) => page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals`, { data: {
    idempotencyKey: key, accountId, approvalMode: "MANUAL_APPROVAL", market: "CN_A", currency: "CNY", strategyVersion: "fixture-manual-test-v1",
    operation: "REBALANCE", expiresAt: new Date(Date.parse(expectedClock) + 4 * 60 * 60 * 1000).toISOString(),
    legs: [{ legId: "sell-leg", securityId: "600000.SH", side: "SELL", quantity: 100 }]
  } });
  const sameDayResponse = await makeSell(`v13-tplus1-same-day-${testRunId}`, initialEvidence.runClockNow);
  expect(sameDayResponse.status()).toBe(201);
  const sameDayProposal = await sameDayResponse.json();
  const approveSameDay = await page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${sameDayProposal.proposalId}/approve`, { data: { expectedVersion: sameDayProposal.proposalVersion, expectedContentHash: sameDayProposal.contentHash, reason: "verify same-session T+1 rule" } });
  expect(approveSameDay.status()).toBe(201);
  const sameDayOrderId = `v13-tplus1-${sameDayProposal.proposalId}`;
  const sameDayResult = await page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${sameDayProposal.proposalId}/execution/submit`, { data: { clientOrderId: sameDayOrderId } });
  expect(sameDayResult.status()).toBe(409);
  expect(JSON.stringify(await sameDayResult.json())).toContain("T_PLUS_ONE_UNSETTLED_QUANTITY");
  expect((await page.request.get(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${sameDayProposal.proposalId}/orders/${encodeURIComponent(sameDayOrderId)}`)).status()).toBe(404);

  const advanceResponsePromise = page.waitForResponse((response) => response.url().includes(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/clock/advance-session`));
  await page.getByTestId("v13-advance-session").click();
  const advanceResponse = await advanceResponsePromise;
  expect(advanceResponse.status()).toBe(200);
  const advanceBody = await advanceResponse.json();
  expect(advanceBody.run.evidence.runClockNow).toBe("2026-09-29T09:31:00+08:00");
  console.info(`[V1.3 clock advance response] ${JSON.stringify({ testRunId, status: advanceResponse.status(), runClockNow: advanceBody.run.evidence.runClockNow, event: advanceBody.event })}`);
  await expect(page.getByTestId("v13-run-clock")).toHaveText("2026-09-29T01:31:00.000Z");
  await expect(page.getByTestId("v13-calendar-version")).toHaveText("sse-cn-a-share-2026-1");
  await expect(page.getByTestId("v13-session-advance-count")).toHaveText("1");
  const advances = JSON.parse((await page.getByTestId("v13-session-advance-history").textContent()) ?? "[]");
  expect(advances).toHaveLength(1);
  expect(advances[0]).toMatchObject({ sequence: 1, calendarVersion: "sse-cn-a-share-2026-1", fromClock: "2026-09-28T01:31:00.000Z", toClock: "2026-09-29T01:31:00.000Z" });
  const replay = await page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/clock/advance-session`, { data: { accountId, expectedClock: initialEvidence.runClockNow } });
  expect(replay.status()).toBe(200);
  expect((await replay.json()).replayed).toBe(true);

  const sellResponse = await makeSell(`v13-tplus1-next-session-${testRunId}`, "2026-09-29T09:31:00+08:00");
  expect(sellResponse.status()).toBe(201);
  const sellProposal = await sellResponse.json();
  const approveSell = await page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${sellProposal.proposalId}/approve`, { data: { expectedVersion: sellProposal.proposalVersion, expectedContentHash: sellProposal.contentHash, reason: "approve next-session T+1 sell" } });
  expect(approveSell.status()).toBe(201);
  const clientOrderId = `v13-next-session-sell-${sellProposal.proposalId}`;
  const submitted = await page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${sellProposal.proposalId}/execution/submit`, { data: { clientOrderId } });
  expect(submitted.status()).toBe(202);
  const executed = await submitted.json();
  if (executed.order.status !== "FILLED") {
    const diagnostic = await page.request.get(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${sellProposal.proposalId}/orders/${encodeURIComponent(clientOrderId)}`).then((response) => response.json());
    throw new Error(`V1.3 T+1 SELL did not post its Portfolio outbox: ${JSON.stringify({ executed, diagnostic })}`);
  }
  expect(executed.fill).toMatchObject({ quantity: 100, price: "10.00", fee: "5.00" });
  expect(Date.parse(executed.fill.effectiveAt)).toBe(Date.parse("2026-09-29T01:31:00.000Z"));
  expect(executed.reconciliation.discrepancies).toEqual([]);
  expect(executed.reconciliation.unresolved_order_count).toBe(0);
  expect(executed.reconciliation.pending_outbox_count).toBe(0);
  expect(executed.reconciliation.externalOnlyOrderCount).toBe(0);
  const afterSell = await page.request.get(`/api/v1/accounts/${accountId}`).then((response) => response.json());
  expect(afterSell.account.cash.amount).toBe("8995.0000");
  expect(afterSell.account.unsettledReceivables).toEqual([expect.objectContaining({ fillId: executed.fill.externalFillId, amount: "995.0000", currency: "CNY", tradeDate: "2026-09-29", settlementDate: "2026-09-30", calendarVersion: "v1.4-synthetic-settlement-3", status: "PENDING" })]);
  expect(afterSell.account.positions).toEqual([]);
  expect(afterSell.account.reservations.at(-1).status).toBe("CAPTURED");
  const persistedOrder = await page.request.get(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${sellProposal.proposalId}/orders/${encodeURIComponent(clientOrderId)}`).then((response) => response.json());
  expect(persistedOrder.orderSide).toBe("SELL");
  expect(persistedOrder.independentAssets.current_cash).toBe("8995.0000");
  expect(persistedOrder.independentAssets.unsettledReceivables).toEqual([expect.objectContaining({ fillId: executed.fill.externalFillId, amount: "995.0000", currency: "CNY", tradeDate: "2026-09-29", settlementDate: "2026-09-30", calendarVersion: "v1.4-synthetic-settlement-3", status: "PENDING" })]);
  expect(persistedOrder.independentAssets.positions).toEqual([]);
  expect(persistedOrder.reconciliation.discrepancies).toEqual([]);
  expect(persistedOrder.reconciliation.portfolio.cash.amount).toBe("8995.0000");
  expect(persistedOrder.reconciliation.portfolio.positions).toEqual([]);
  expect(persistedOrder.reconciliation.fakeBroker.currentCash).toBe("8995.0000");
  expect(persistedOrder.reconciliation.fakeBroker.positions).toEqual([]);
  expect(persistedOrder.independentAssets.current_cash).toBe(afterSell.account.cash.amount);
  expect(persistedOrder.independentAssets.positions).toEqual(afterSell.account.positions.map((position: { security: string; quantity: number }) => ({ security: position.security, quantity: position.quantity })));
  verifyV13RunWithCli(testRunId!, sellProposal.proposalId, clientOrderId, "8995.0000", "0.0000", "FILLED", "CAPTURED", "0.0000");

  const settleAdvance = await page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/clock/advance-session`, { data: { accountId, expectedClock: "2026-09-29T09:31:00+08:00" } });
  expect(settleAdvance.status()).toBe(200);
  expect((await settleAdvance.json()).run.evidence.runClockNow).toBe("2026-09-30T09:31:00+08:00");
  const afterSettlement = await page.request.get(`/api/v1/accounts/${accountId}`).then((response) => response.json());
  expect(afterSettlement.account.cash.amount).toBe("9990.0000");
  expect(afterSettlement.account.unsettledReceivables).toEqual([expect.objectContaining({ amount: "995.0000", status: "SETTLED", settlementDate: "2026-09-30" })]);
  const settledOrder = await page.request.get(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${sellProposal.proposalId}/orders/${encodeURIComponent(clientOrderId)}`).then((response) => response.json());
  expect(settledOrder.independentAssets.current_cash).toBe("9990.0000");
  expect(settledOrder.independentAssets.unsettledReceivables[0].status).toBe("SETTLED");
  expect(settledOrder.reconciliation.discrepancies).toEqual([]);

  const buyResponse = await page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals`, { data: {
    idempotencyKey: `v13-tplus1-settled-buy-${testRunId}`, accountId, approvalMode: "MANUAL_APPROVAL", market: "CN_A", currency: "CNY", strategyVersion: "fixture-manual-test-v1",
    operation: "REBALANCE", expiresAt: "2026-09-30T13:31:00+08:00", legs: [{ legId: "settled-buy-leg", securityId: "600000.SH", side: "BUY", quantity: 100 }]
  } });
  expect(buyResponse.status()).toBe(201);
  const settledBuyProposal = await buyResponse.json();
  expect((await page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${settledBuyProposal.proposalId}/approve`, { data: { expectedVersion: settledBuyProposal.proposalVersion, expectedContentHash: settledBuyProposal.contentHash, reason: "use only settled T+1 proceeds" } })).status()).toBe(201);
  const settledBuyClientOrderId = `v13-tplus1-settled-buy-${settledBuyProposal.proposalId}`;
  const settledBuySubmit = await page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${settledBuyProposal.proposalId}/execution/submit`, { data: { clientOrderId: settledBuyClientOrderId } });
  const settledBuyResult = await settledBuySubmit.json();
  expect(settledBuySubmit.status(), JSON.stringify(settledBuyResult)).toBe(202);
  expect(settledBuyResult.order.status).toBe("FILLED");
  const afterSettledBuy = await page.request.get(`/api/v1/accounts/${accountId}`).then((response) => response.json());
  expect(afterSettledBuy.account.cash.amount).toBe("8985.0000");
  expect(afterSettledBuy.account.positions).toEqual([{ security: "600000.SH", quantity: 100 }]);
  expect(afterSettledBuy.account.unsettledReceivables[0].status).toBe("SETTLED");
  verifyV13RunWithCli(testRunId!, settledBuyProposal.proposalId, settledBuyClientOrderId, "8985.0000", "1005.0000", "FILLED", "CAPTURED", "1005.0000");
  console.info(`[V1.3 T+1 settlement loop] ${JSON.stringify({ testRunId, buyProposalId, sellProposalId: sellProposal.proposalId, settledBuyProposalId: settledBuyProposal.proposalId, settledCash: afterSettlement.account.cash.amount, finalCash: afterSettledBuy.account.cash.amount, calendarVersion: advances[0].calendarVersion, toClock: "2026-09-30T09:31:00+08:00" })}`);
});


test("V1.3 US_EQUITY uses the frozen New York session Fixture for strict settled-cash Paper SELL", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/acceptance/v1/v1.3");
  await page.getByRole("button", { name: "创建隔离 V1.3 TestRun" }).click();
  const testRunId = (await page.getByTestId("v13-test-run-id").textContent())?.trim();
  expect(testRunId).toMatch(/^[0-9a-f-]{36}$/iu);
  await page.getByLabel("市场").selectOption("US_EQUITY");
  await page.getByRole("button", { name: "初始化本 Run 模拟账户（10000）" }).click();
  await expect(page.getByTestId("v13-account-id")).toContainText("US_EQUITY");
  await expect(page.getByTestId("v13-run-clock")).toHaveText("2026-09-28T13:31:00.000Z");
  await expect(page.getByTestId("v13-calendar-version")).toHaveText("v1.3-us-synthetic-session-1");
  const accountId = (await page.getByTestId("v13-account-id").textContent())?.match(/[0-9a-f-]{36}/iu)?.[0];
  expect(accountId).toMatch(/^[0-9a-f-]{36}$/iu);
  const clock = await page.request.get(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/clock`).then((response) => response.json());
  expect(clock.advances).toHaveLength(1);
  expect(clock.advances[0]).toMatchObject({ fromClock: "2026-09-28T01:31:00.000Z", toClock: "2026-09-28T13:31:00.000Z", calendarVersion: "v1.3-us-synthetic-session-1" });

  await page.getByRole("button", { name: "创建MANUAL固定Fixture调仓提案" }).click();
  const buyProposalId = (await page.getByTestId("v13-proposal-id").textContent())?.trim();
  await page.getByRole("button", { name: "人工批准", exact: true }).click();
  await page.getByTestId("v13-execute-proposal").click();
  await expect(page.getByTestId("v13-order")).toContainText("FILLED");
  const makeSell = async (key: string) => page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals`, { data: {
    idempotencyKey: key, accountId, approvalMode: "MANUAL_APPROVAL", market: "US_EQUITY", currency: "USD", strategyVersion: "fixture-manual-test-v1",
    operation: "REBALANCE", expiresAt: "2026-09-29T18:00:00.000Z", legs: [{ legId: "sell-leg", securityId: "AAPL", side: "SELL", quantity: 10 }],
  } });
  const nextClock = "2026-09-29T13:31:00.000Z";
  const advance = await page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/clock/advance-session`, { data: { accountId, expectedClock: "2026-09-28T13:31:00.000Z" } });
  expect(advance.status()).toBe(200);
  expect((await advance.json()).run.evidence.runClockNow).toBe(nextClock);
  const sellCreate = await makeSell(`us-next-session-sell-${testRunId}`);
  expect(sellCreate.status()).toBe(201);
  const sellProposal = await sellCreate.json();
  expect((await page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${sellProposal.proposalId}/approve`, { data: { expectedVersion: sellProposal.proposalVersion, expectedContentHash: sellProposal.contentHash, reason: "approve next synthetic NY session sale" } })).status()).toBe(201);
  const sellClientOrderId = `us-sell-${sellProposal.proposalId}`;
  const sellSubmit = await page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${sellProposal.proposalId}/execution/submit`, { data: { clientOrderId: sellClientOrderId } });
  const sellExecution = await sellSubmit.json();
  expect(sellSubmit.status(), JSON.stringify(sellExecution)).toBe(202);
  expect(sellExecution.order.status).toBe("FILLED");
  const pending = await page.request.get(`/api/v1/accounts/${accountId}`).then((response) => response.json());
  expect(pending.account.cash.amount).toBe("9749.9500");
  expect(pending.account.unsettledReceivables).toEqual([expect.objectContaining({ amount: "249.9500", currency: "USD", tradeDate: "2026-09-29", settlementDate: "2026-09-30", status: "PENDING" })]);
  const settleAdvance = await page.request.post(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/clock/advance-session`, { data: { accountId, expectedClock: nextClock } });
  expect(settleAdvance.status()).toBe(200);
  expect((await settleAdvance.json()).run.evidence.runClockNow).toBe("2026-09-30T13:31:00.000Z");
  const settled = await page.request.get(`/api/v1/accounts/${accountId}`).then((response) => response.json());
  expect(settled.account.cash.amount).toBe("9999.9000");
  expect(settled.account.unsettledReceivables[0].status).toBe("SETTLED");
  const settledOrder = await page.request.get(`/api/v1/acceptance/v1/v1.3/runs/${testRunId}/proposals/${sellProposal.proposalId}/orders/${encodeURIComponent(sellClientOrderId)}`).then((response) => response.json());
  expect(settledOrder.independentAssets.current_cash).toBe("9999.9000");
  expect(settledOrder.reconciliation.discrepancies).toEqual([]);
  verifyV13RunWithCli(testRunId!, sellProposal.proposalId, sellClientOrderId, "9999.9000", "0.0000", "FILLED", "CAPTURED", "0.0000");
  console.info(`[V1.3 US strict settled-cash loop] ${JSON.stringify({ testRunId, buyProposalId, sellProposalId: sellProposal.proposalId, clockAdvances: clock.advances.length + 2, pendingCash: pending.account.cash.amount, settledCash: settled.account.cash.amount, syntheticCalendar: "v1.3-us-synthetic-session-1", calendarNotExchangeClaim: true })}`);
});


test("V1.5 displays explicit capability blockers without converting NOT_RUN into failure", async ({ page }) => {
  const testRunId = "d4c437bd-a1ba-4e67-b9bc-7c5fdf1d008c";
  await page.addInitScript((id) => window.localStorage.setItem("stockquant:v15:testRunId", id), testRunId);
  await page.route("**/api/v1/acceptance/v1/v1.5/runs?limit=20", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route(`**/api/v1/acceptance/v1/v1.5/runs/${testRunId}`, (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      testRunId, stageId: "V1.5", scenarioId: "normal", status: "WAITING", seed: 20260907,
      assertions: [{ assertionId: "V1.5-SYS-SCHEDULE-001", status: "WAITING", actual: "NOT_RUN" }],
      evidence: { workflow: "NOT_CONNECTED", nats: "NOT_RUN", temporal: "NOT_RUN", businessExecution: "NOT_RUN", liveTradingEnabled: false, brokerMode: "FAKE" },
    }),
  }));
  await page.route(`**/api/v1/acceptance/v1/v1.5/runs/${testRunId}/incidents`, (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.goto("/acceptance/v1/v1.5");
  const status = page.getByTestId("v15-capability-status");
  await expect(status).toBeVisible();
  await expect(page.getByTestId("v15-capability-blockers")).toContainText("Durable workflow dispatch：NOT_CONNECTED");
  await expect(status).toContainText("NOT_RUN");
  await expect(status).toContainText("Domain execution");
  await expect(status).not.toContainText("业务失败");
  await expect(status.getByRole("link", { name: "打开系统告警与 Paper 能力概览（V2.4）" })).toHaveAttribute("href", "/paper#paper-alerts");
  await expect(page.getByTestId("v15-no-incidents")).toContainText("没有由持久化证据生成的告警");
});

test("V1.5 Run incidents are acknowledged by the authenticated session and stay visible", async ({ page }) => {
  const testRunId = "d4c437bd-a1ba-4e67-b9bc-7c5fdf1d008d";
  const incidentId = "d4c437bd-a1ba-4e67-b9bc-7c5fdf1d008e";
  let acknowledged = false;
  await page.addInitScript((id) => window.localStorage.setItem("stockquant:v15:testRunId", id), testRunId);
  await page.route("**/api/v1/acceptance/v1/v1.5/runs?limit=20", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
  await page.route(`**/api/v1/acceptance/v1/v1.5/runs/${testRunId}`, (route) => route.fulfill({
    status: 200, contentType: "application/json", body: JSON.stringify({
      testRunId, stageId: "V1.5", scenarioId: "normal", status: "WAITING", seed: 20260907,
      assertions: [{ assertionId: "V15-SYS-001", status: "WAITING", actual: "NOT_RUN" }],
      evidence: { workflow: "NOT_CONNECTED", nats: "NOT_RUN", temporal: "NOT_RUN", businessExecution: "NOT_RUN", liveTradingEnabled: false, brokerMode: "FAKE" },
    }),
  }));
  await page.route(`**/api/v1/acceptance/v1/v1.5/runs/${testRunId}/incidents`, (route) => route.fulfill({
    status: 200, contentType: "application/json", body: JSON.stringify([{
      incidentId, testRunId, alertKey: "capability:workflow", code: "V15_WORKFLOW_BLOCKED", severity: "BLOCKER",
      title: "Durable workflow dispatch is blocked", detail: { capability: "workflow", status: "NOT_CONNECTED" },
      state: acknowledged ? "ACKNOWLEDGED" : "OPEN", firstSeenAt: "2026-10-09T00:00:00.000Z", lastSeenAt: "2026-10-09T00:00:00.000Z",
      acknowledgedBy: acknowledged ? "acceptance-owner-1" : null, acknowledgedAt: acknowledged ? "2026-10-09T00:01:00.000Z" : null, resolvedAt: null,
    }]),
  }));
  await page.route(`**/api/v1/acceptance/v1/v1.5/runs/${testRunId}/incidents/${incidentId}/acknowledge`, async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataJSON()).toEqual({});
    acknowledged = true;
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ incidentId, state: "ACKNOWLEDGED", acknowledgedBy: "acceptance-owner-1" }) });
  });
  await page.goto("/acceptance/v1/v1.5");
  const incidents = page.getByTestId("v15-run-incidents");
  await expect(incidents).toContainText("V15_WORKFLOW_BLOCKED");
  await incidents.getByRole("button", { name: "确认告警" }).click();
  await expect(incidents).toContainText("已由 acceptance-owner-1 确认");
  await expect(incidents.getByRole("button", { name: "确认告警" })).toHaveCount(0);
});

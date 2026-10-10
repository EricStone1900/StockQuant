import { createHash } from "node:crypto";
import type { StageRunRepository, StoredStageRun } from "../ports/stage-run-repository.js";
import type { V12FixturePreview } from "../contracts/generated-types.js";
import type { QlibFitFixtureRequest, QlibFitFixtureResult, V12ResearchFixturePreview } from "../contracts/generated-types.js";
import type { QlibFixtureArtifactRepository } from "../ports/qlib-fixture-artifact-repository.js";
import { projectV12QlibArtifactRef } from "./v12-qlib-artifact-ref.js";
import type { V12StrategyGovernanceClient } from "../ports/v12-strategy-governance-client.js";
import type { V12StrategySnapshotCommand } from "../contracts/generated-types.js";

export const V12_SCENARIOS = [
  { scenarioId: "normal", version: "1.0.0", title: "正常数据与 Qlib 因子", expected: "6 bars、2 securities、Qlib READY" },
  { scenarioId: "rejection", version: "1.0.0", title: "未来数据拒绝", expected: "FUTURE_DATA 质量错误" },
  { scenarioId: "recovery", version: "1.0.0", title: "取消与探针恢复", expected: "取消任务不发布半份 Artifact" }
] as const;

export type V12Scenario = (typeof V12_SCENARIOS)[number]["scenarioId"];

type Assertion = {
  assertionId: string;
  status: "PASS" | "FAIL" | "WAITING";
  expected: unknown;
  actual: unknown;
  evidence: Record<string, unknown>;
};

export interface V12FixtureReader {
  getV12NormalFixturePreview(): Promise<V12FixturePreview>;
  getV12FutureFixturePreview(): Promise<V12FixturePreview>;
  getV12ResearchFixturePreview(): Promise<V12ResearchFixturePreview>;
}
export interface V12ResearchReader {
  getV12QlibProbe(): Promise<{ probe?: { status?: string } }>;
  getV12FactorPreview(): Promise<{ ranking?: unknown[] }>;
  fitQlibFixtureModel(request: QlibFitFixtureRequest): Promise<QlibFitFixtureResult>;
}

export function buildV12QlibFixtureRequest(fixture: V12ResearchFixturePreview, market?: "CN_A" | "US_EQUITY"): {
  request: QlibFitFixtureRequest;
  rowKeys: Array<{ ticker: string; market: string; currency: string; date: string }>;
  factorRows: Array<{ ticker: string; market: string; currency: string; date: string; momentum20: number; volumeRatio20: number; rangeRatio: number; label: number }>;
} {
  if (!(fixture.fixtureVersion === "v1.2-market-data-4" || fixture.fixtureVersion === "v1.2-market-data-5") || fixture.dataMode !== "FIXTURE") throw new Error("unsupported V1.2 research Fixture version or mode");
  const rows: Array<{ key: { ticker: string; market: string; currency: string; date: string }; features: number[]; label: number; metadata: { decisionAt: string; featureAvailableAt: string; labelAvailableAt: string } }> = [];
  const selectedSecurities = fixture.securities.filter((item) => market === undefined || item.market === market);
  const securitiesById = new Map(selectedSecurities.map((item) => [item.securityId, item]));
  const barsBySecurity = new Map<string, Map<string, (typeof fixture.bars)[number]>>();
  for (const bar of fixture.bars.filter((item) => market === undefined || item.market === market)) {
    const security = securitiesById.get(bar.securityId);
    if (!security) throw new Error(`V1.2 Fixture bar references an unknown security ${bar.securityId}`);
    if (bar.ticker !== security.ticker || bar.market !== security.market || bar.currency !== security.currency || bar.timezone !== security.timezone) throw new Error(`V1.2 Fixture bar identity does not match security master for ${bar.securityId}`);
    if (bar.date < security.listedAt || (security.delistedAt !== null && bar.date > security.delistedAt)) throw new Error(`V1.2 Fixture bar is outside the security listing interval for ${bar.ticker} ${bar.date}`);
    const series = barsBySecurity.get(bar.securityId) ?? new Map<string, (typeof fixture.bars)[number]>();
    if (series.has(bar.date)) throw new Error(`duplicate V1.2 Fixture bar for ${bar.ticker} ${bar.date}`);
    series.set(bar.date, bar);
    barsBySecurity.set(bar.securityId, series);
  }
  const sessionsByMarket = new Map<string, string[]>();
  for (const row of fixture.marketSessions.filter((item) => market === undefined || item.market === market)) {
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(row.sessionDate) || Number.isNaN(Date.parse(`${row.sessionDate}T00:00:00Z`))) throw new Error(`invalid V1.2 expected market session ${row.market} ${row.sessionDate}`);
    const sessions = sessionsByMarket.get(row.market) ?? [];
    if (sessions.includes(row.sessionDate)) throw new Error(`duplicate V1.2 expected market session ${row.market} ${row.sessionDate}`);
    sessions.push(row.sessionDate);
    sessionsByMarket.set(row.market, sessions);
  }
  for (const sessions of sessionsByMarket.values()) sessions.sort((a, b) => a.localeCompare(b));
  for (const security of selectedSecurities) {
    const series = barsBySecurity.get(security.securityId) ?? new Map<string, (typeof fixture.bars)[number]>();
    const sessions = sessionsByMarket.get(security.market) ?? [];
    for (let index = 20; index < sessions.length - 1; index += 1) {
      const requiredDates = sessions.slice(index - 20, index + 1);
      const window = requiredDates.map((date) => series.get(date));
      const next = series.get(sessions[index + 1]);
      // A missing session invalidates the affected lookback and next-session
      // label. Do not compress the series and silently turn a two-session
      // change into a one-session target.
      if (window.some((bar) => !bar) || !next) continue;
      const current = window.at(-1)!;
      const previous = window[0]!;
      const close = Number(current.close);
      const oldClose = Number(previous.close);
      const volumes = window.slice(1).map((bar) => bar!.volume);
      const meanVolume = volumes.reduce((sum, value) => sum + value, 0) / volumes.length;
      const volumeRatio20 = current.volume / meanVolume - 1;
      const rangeRatio = (Number(current.high) - Number(current.low)) / close;
      const nextCloseReturn = Number(next.close) / close - 1;
      const nextCloseAvailableAt = next.availableAt;
      const features = [close / oldClose - 1, volumeRatio20, rangeRatio];
      if (features.some((value) => !Number.isFinite(value)) || !Number.isFinite(nextCloseReturn) || Date.parse(current.availableAt) >= Date.parse(nextCloseAvailableAt)) throw new Error(`invalid temporal feature/label row for ${current.ticker} ${current.date}`);
      rows.push({ key: { ticker: current.ticker, market: current.market, currency: current.currency, date: current.date }, features, label: nextCloseReturn, metadata: { decisionAt: current.availableAt, featureAvailableAt: current.availableAt, labelAvailableAt: nextCloseAvailableAt } });
    }
  }
  rows.sort((a, b) => a.key.date.localeCompare(b.key.date) || a.key.ticker.localeCompare(b.key.ticker));
  const dates = [...new Set(rows.map((row) => row.key.date))];
  if (dates.length < 30) throw new Error("V1.2 Fixture has fewer than 30 usable decision dates after lookback and label windows");
  const trainDateCount = Math.floor(dates.length * 0.55);
  const validDateCount = Math.floor(dates.length * 0.2);
  const validStartDate = dates[trainDateCount + 1];
  const validEndDate = dates[trainDateCount + 1 + validDateCount];
  const testStartDate = dates[trainDateCount + 2 + validDateCount];
  if (!validStartDate || !validEndDate || !testStartDate) throw new Error("V1.2 Fixture cannot reserve purged boundaries for validation and test windows");
  const allValidRows = rows.filter((row) => row.key.date >= validStartDate && row.key.date < validEndDate);
  const allTestRows = rows.filter((row) => row.key.date >= testStartDate);
  const validationDecision = Date.parse(allValidRows[0]?.metadata.decisionAt ?? "");
  const testDecision = Date.parse(allTestRows[0]?.metadata.decisionAt ?? "");
  const trainRows = rows.filter((row) => row.key.date < dates[trainDateCount] && Date.parse(row.metadata.labelAvailableAt) < validationDecision);
  const validRows = allValidRows.filter((row) => Date.parse(row.metadata.labelAvailableAt) < testDecision);
  const selectedRows = [...trainRows, ...validRows, ...allTestRows];
  const trainEnd = trainRows.length;
  const validEnd = trainEnd + validRows.length;
  if (trainEnd < 20 || validRows.length < 5 || allTestRows.length < 5) throw new Error("V1.2 Fixture split has insufficient rows after temporal label purging");
  const request: QlibFitFixtureRequest = {
    schemaVersion: "qlib-fit-fixture-v1", sourceMode: "FIXTURE",
    featureRows: selectedRows.map((row) => row.features), labels: selectedRows.map((row) => row.label),
    temporalMetadata: selectedRows.map((row) => row.metadata),
    splits: { train: [0, trainEnd], valid: [trainEnd, validEnd], test: [validEnd, selectedRows.length] }
  };
  return { request, rowKeys: selectedRows.map((row) => row.key), factorRows: selectedRows.map((row) => ({ ...row.key, momentum20: row.features[0], volumeRatio20: row.features[1], rangeRatio: row.features[2], label: row.label })) };
}

export class V12AcceptanceService {
  constructor(
    private readonly repository: StageRunRepository,
    private readonly marketData: V12FixtureReader,
    private readonly quantResearch: V12ResearchReader,
    private readonly artifacts: QlibFixtureArtifactRepository,
    private readonly governance?: V12StrategyGovernanceClient
  ) {}

  async create(ownerId: string, scenarioId: V12Scenario, seed: number) {
    const testRunId = this.repository.newId();
    const run: Omit<StoredStageRun, "createdAt" | "completedAt" | "namespace"> & { namespace: string } = {
      testRunId,
      stageId: "V1.2",
      scenarioId,
      scenarioVersion: "1.0.0",
      ownerId,
      namespace: `v1-2-${scenarioId}-${testRunId}`,
      status: "RUNNING",
      seed,
      assertions: [],
      evidence: { environmentMode: "BACKTEST", dataMode: "FIXTURE", brokerMode: "FAKE", dataVersion: "v1.2-market-data-5", qlibTask: { phase: "QUEUED", cancelRequested: false, artifactPublished: false } }
    };
    await this.repository.save(run);
    queueMicrotask(() => void this.execute(run));
    return { accepted: true, testRunId, status: run.status };
  }

  async resumePending(): Promise<number> {
    const pending = await this.repository.listRunnableV12Runs();
    for (const run of pending) queueMicrotask(() => void this.execute(run));
    return pending.length;
  }

  cancel(testRunId: string, ownerId: string) {
    return this.repository.requestV12Cancellation(testRunId, ownerId);
  }

  find(testRunId: string, ownerId: string) {
    return this.repository.find(testRunId, ownerId);
  }

  async execute(run: Omit<StoredStageRun, "createdAt" | "completedAt" | "namespace"> & { namespace: string }): Promise<void> {
    await this.repository.withV12RunLock(run.testRunId, () => this.executeLocked(run));
  }

  private async executeLocked(run: Omit<StoredStageRun, "createdAt" | "completedAt" | "namespace"> & { namespace: string }): Promise<void> {
    const progress = (phase: string, detail: Record<string, unknown> = {}) => this.repository.updateV12Progress(run.testRunId, run.ownerId, { phase, ...detail });
    const cancelled = async () => {
      const latest = await this.repository.find(run.testRunId, run.ownerId);
      return !latest || latest.status !== "RUNNING" || (latest.evidence.qlibTask as Record<string, unknown> | undefined)?.cancelRequested === true;
    };
    const finishCancelled = async () => {
      const latest = await this.repository.find(run.testRunId, run.ownerId);
      if (!latest || latest.status !== "RUNNING") return;
      const task = latest.evidence.qlibTask as Record<string, unknown> | undefined;
      if (task?.cancelRequested !== true) return;
      const assertions = [...latest.assertions.filter((item) => (item as { assertionId?: string }).assertionId !== "V1.2-QLIB-CANCEL-001"), { assertionId: "V1.2-QLIB-CANCEL-001", status: "PASS", expected: "Cancellation is acknowledged at a safe worker checkpoint before immutable Artifact publication", actual: { phase: "CANCELLED", artifactPublished: false } }];
      await this.repository.finishV12Run(run.testRunId, run.ownerId, "CANCELLED", assertions, { ...latest.evidence, qlibTask: { ...task, phase: "CANCELLED", completedAt: new Date().toISOString(), artifactPublished: false } });
    };
    try {
      const startingTask = run.evidence.qlibTask as Record<string, unknown> | undefined;
      if (startingTask?.phase && startingTask.phase !== "QUEUED") {
        const resumed = Number(startingTask.resumeCount ?? 0) + 1;
        if (!(await progress("RESUMING_AFTER_PLATFORM_RESTART", { resumeCount: resumed, previousPhase: startingTask.phase, resumedAt: new Date().toISOString() }))) { await finishCancelled(); return; }
      }
      if (!(await progress("LOADING_SCENARIO_INPUTS"))) { await finishCancelled(); return; }
      const [normal, bad, probe, factor] = await Promise.all([
        this.marketData.getV12NormalFixturePreview(),
        this.marketData.getV12FutureFixturePreview(),
        this.quantResearch.getV12QlibProbe(),
        this.quantResearch.getV12FactorPreview()
      ]);
      if (await cancelled()) { await finishCancelled(); return; }
      const previousProbe = startingTask?.qlibProbe as Record<string, unknown> | undefined;
      const effectiveProbe = probe.probe?.status === "READY" || previousProbe?.status !== "READY" ? probe : { ...probe, probe: previousProbe };
      if (!(await progress("LOADING_SCENARIO_INPUTS", { qlibProbe: effectiveProbe.probe ?? { status: "NOT_RUN" } }))) { await finishCancelled(); return; }
      let assertions = this.assertions(run.scenarioId as V12Scenario, normal, bad, effectiveProbe, factor);
      let qlibEvidence: Record<string, unknown> = { status: "NOT_RUN" };
      let artifact: Awaited<ReturnType<QlibFixtureArtifactRepository["savePending"]>> | null = null;
      if (run.scenarioId === "normal") {
        if (!(await progress("LOADING_RESEARCH_FIXTURE"))) { await finishCancelled(); return; }
        const researchFixture = await this.marketData.getV12ResearchFixturePreview();
        const markets: Array<"CN_A" | "US_EQUITY"> = ["CN_A", "US_EQUITY"];
        const fits: Array<{ market: "CN_A" | "US_EQUITY"; inputSha256: string; built: ReturnType<typeof buildV12QlibFixtureRequest>; qlib: QlibFitFixtureResult }> = [];
        const errors: string[] = [];
        const predictions: Array<{ ticker: string; market: string; currency: string; date: string; momentum20: number; volumeRatio20: number; rangeRatio: number; label: number; prediction: number }> = [];
        const ranking: Array<{ ticker: string; market: string; currency: string; factor: number; rank: number; signal: string; reason: string }> = [];
        // Preflight every market's frozen history and temporal splits before
        // invoking any model worker. A deficient later market must not leave a
        // partial cross-market fit or publish a one-market strategy Artifact.
        const inputs = markets.map((market) => ({ market, built: buildV12QlibFixtureRequest(researchFixture, market) }));
        for (const { market, built } of inputs) {
          if (await cancelled()) { await finishCancelled(); return; }
          if (!(await progress(market === "CN_A" ? "FITTING_CN_A" : "FITTING_US_EQUITY", { currentMarket: market, completedMarkets: fits.map((fit) => fit.market) }))) { await finishCancelled(); return; }
          const inputSha256 = createHash("sha256").update(JSON.stringify(built.request)).digest("hex");
          const qlib = await this.quantResearch.fitQlibFixtureModel(built.request);
          fits.push({ market, inputSha256, built, qlib });
          if (await cancelled()) { await finishCancelled(); return; }
          if (qlib.status !== "COMPLETED" || qlib.sourceMode !== "FIXTURE" || qlib.modelTraining !== "PASS" || qlib.temporalValidation !== "PASS" || qlib.modelValidation !== "NOT_RUN" || qlib.candidateSourceExecution !== "NOT_PERFORMED" || qlib.profitabilityClaim !== "NOT_MADE") errors.push(`${market}: Qlib did not return an actual bounded FIXTURE fit with the required safety statuses`);
          if (qlib.testPredictionCount !== qlib.testPredictions.length || !qlib.testPredictionsFinite || qlib.testPredictions.some((value) => !Number.isFinite(value))) errors.push(`${market}: Qlib prediction count/finiteness check failed`);
          const testStart = built.request.splits.test[0] as number;
          const testRows = built.factorRows.slice(testStart);
          if (testRows.length !== qlib.testPredictions.length) errors.push(`${market}: Qlib test predictions do not align to test segment rows`);
          const marketPredictions = qlib.testPredictions.map((prediction, index) => ({ ...testRows[index], prediction }));
          predictions.push(...marketPredictions);
          const asOf = testRows.at(-1)?.date ?? "";
          const candidates = marketPredictions.filter((row) => row.date === asOf).sort((a, b) => b.prediction - a.prediction || a.ticker.localeCompare(b.ticker));
          ranking.push(...candidates.map((row, index) => ({ ticker: row.ticker, market, currency: row.currency, factor: row.prediction, rank: index + 1, signal: index === 0 ? "TOPK_TARGET" : "NO_TRADE", reason: index === 0 ? "highest predicted next-session close return in this market's fixed Top-1 cross-section" : "rank is outside the fixed per-market Top-1 target cutoff" })));
        }
        if (new Set(predictions.map((row) => row.prediction)).size < markets.length) errors.push("Qlib test predictions collapsed to fewer than two distinct values across the frozen markets");
        const asOf = ranking.length ? fits.map((fit) => fit.built.factorRows.at(-1)?.date ?? "").sort().at(-1) ?? "" : "";
        const strategies: Array<Pick<V12StrategySnapshotCommand, "strategyId" | "strategyHash" | "mode" | "asOf" | "targets"> & { reason: string }> = [
          { strategyId: "v1.2-qlib-topk-1", strategyHash: "", mode: "TOPK", asOf, reason: "select the highest Qlib predicted next-session close return independently within each market", targets: ranking.filter((row) => row.signal === "TOPK_TARGET").map(({ ticker, market, currency, reason }) => ({ ticker, market: market as "CN_A" | "US_EQUITY", currency: currency as "CNY" | "USD", reason })) },
          { strategyId: "v1.2-no-trade-1", strategyHash: "", mode: "NO_TRADE", asOf, reason: "explicit empty-target baseline; no order intent is emitted", targets: [] }
        ];
        const inputSha256 = createHash("sha256").update(JSON.stringify(fits.map((fit) => ({ market: fit.market, inputSha256: fit.inputSha256 })))).digest("hex");
        const payloadBase = { schemaVersion: "v1.2-qlib-strategy-artifact-v1", fixtureVersion: researchFixture.fixtureVersion, dailyBarsSha256: researchFixture.dailyBarsSha256, inputSha256, factorVersion: "v1.2-momentum-volume-1", dataVersion: researchFixture.fixtureVersion, asOf, qlibModels: fits.map((fit) => ({ market: fit.market, version: fit.qlib.qlibVersion, lightgbmVersion: fit.qlib.lightgbmVersion, model: fit.qlib.model, modelSha256: fit.qlib.modelSha256, modelArtifactBase64: fit.qlib.modelArtifactBase64, testPredictionsSha256: fit.qlib.testPredictionsSha256 })), predictions, strategies };
        for (const strategy of strategies) strategy.strategyHash = createHash("sha256").update(JSON.stringify({ ...strategy, strategyHash: undefined, fixtureVersion: researchFixture.fixtureVersion, dailyBarsSha256: researchFixture.dailyBarsSha256, modelHashes: fits.map((fit) => fit.qlib.modelSha256) })).digest("hex");
        if (errors.length === 0) {
          if (await cancelled()) { await finishCancelled(); return; }
          if (!(await progress("PUBLISHING_ARTIFACT", { modelFitCount: fits.length, predictionCount: predictions.length }))) { await finishCancelled(); return; }
          artifact = await this.artifacts.savePending({ testRunId: run.testRunId, ownerId: run.ownerId, mediaType: "application/vnd.stockquant.qlib-fixture-model+json", payload: payloadBase as never });
        }
        const computed = errors.length === 0 && ranking.filter((item) => item.signal === "TOPK_TARGET").length === markets.length && strategies[1].targets.length === 0;
        const governanceReceipts: Array<{ strategyId: string; snapshotId: string; status: string; replayed: boolean }> = [];
        if (computed && artifact && this.governance) {
          for (const strategy of strategies) {
            const command: V12StrategySnapshotCommand = {
              ownerId: run.ownerId, testRunId: run.testRunId, artifactId: artifact.artifactId, artifactSha256: artifact.sha256,
              fixtureVersion: researchFixture.fixtureVersion, dataVersion: researchFixture.fixtureVersion, factorVersion: "v1.2-momentum-volume-1",
              strategyId: strategy.strategyId, strategyHash: strategy.strategyHash, mode: strategy.mode, asOf: strategy.asOf,
              targets: strategy.targets
            };
            const receipt = await this.governance.receiveStrategySnapshot(command);
            if ((receipt.status !== 201 && receipt.status !== 200) || !receipt.body || receipt.body.status !== "RECEIVED") throw new Error(`Governance strategy snapshot handoff failed (${receipt.status}) for ${strategy.strategyId}`);
            governanceReceipts.push({ strategyId: strategy.strategyId, snapshotId: receipt.body.snapshotId, status: receipt.body.status, replayed: receipt.body.replayed });
          }
        }
        assertions.push({ assertionId: "V1.2-GOVERNANCE-001", status: governanceReceipts.length === strategies.length ? "PASS" : this.governance ? "FAIL" : "WAITING", expected: "Governance durably receives both exact strategy snapshots without execution side effects", actual: { status: governanceReceipts.length === strategies.length ? "RECEIVED" : this.governance ? "FAILED" : "NOT_CONFIGURED", receipts: governanceReceipts }, evidence: { artifactId: artifact?.artifactId ?? null } });
        const modelTraining = fits.every((fit) => fit.qlib.modelTraining === "PASS") ? "PASS" : "NOT_RUN";
        const temporalValidation = fits.every((fit) => fit.qlib.temporalValidation === "PASS") ? "PASS" : "FAIL";
        assertions = assertions.map((item) => item.assertionId === "V1.2-FACTOR-PREVIEW-001" ? { ...item, status: computed ? "PASS" : "FAIL", expected: "locked Qlib fits, per-market test-segment TOPK targets, and explicit NO_TRADE output", actual: { status: computed ? "COMPLETED" : "FAILED", modelTraining, temporalValidation, marketFits: fits.map(({ market, qlib }) => ({ market, version: qlib.qlibVersion, modelTraining: qlib.modelTraining, temporalValidation: qlib.temporalValidation, inputRows: qlib.segments.train.rows + qlib.segments.valid.rows + qlib.segments.test.rows, testPredictionCount: qlib.testPredictionCount, modelSha256: qlib.modelSha256, testPredictionsSha256: qlib.testPredictionsSha256 })), predictionCount: predictions.length, marketTargets: ranking.filter((row) => row.signal === "TOPK_TARGET").map(({ ticker, market, currency }) => ({ ticker, market, currency })), strategies, artifactId: artifact?.artifactId ?? null, artifactSha256: artifact?.sha256 ?? null, errors }, evidence: { source: "locked Qlib workers over separate CN_A/US_EQUITY time axes in v1.2-market-data-5", fixtureVersion: researchFixture.fixtureVersion, dailyBarsSha256: researchFixture.dailyBarsSha256 } } : item);
        qlibEvidence = { marketFits: fits.map(({ market, inputSha256: marketInputSha256, built, qlib }) => ({ market, qlibVersion: qlib.qlibVersion, lightgbmVersion: qlib.lightgbmVersion, model: qlib.model, modelTraining: qlib.modelTraining, modelValidation: qlib.modelValidation, temporalValidation: qlib.temporalValidation, inputRows: built.request.featureRows.length, featureCount: built.request.featureRows[0]?.length ?? 0, splits: qlib.segments, testPredictionCount: qlib.testPredictionCount, modelSha256: qlib.modelSha256, testPredictionsSha256: qlib.testPredictionsSha256, inputSha256: marketInputSha256 })), qlibVersion: fits[0]?.qlib.qlibVersion, lightgbmVersion: fits[0]?.qlib.lightgbmVersion, modelTraining, temporalValidation, inputRows: fits.reduce((sum, fit) => sum + fit.built.request.featureRows.length, 0), testPredictionCount: predictions.length, inputSha256, fixtureVersion: researchFixture.fixtureVersion, dailyBarsSha256: researchFixture.dailyBarsSha256, strategies, governanceReceipts, governanceHandoff: governanceReceipts.length === strategies.length ? "RECEIVED" : this.governance ? "FAILED" : "NOT_CONFIGURED", artifactSchemaVersion: artifact ? "v1.2-qlib-strategy-artifact-v1" : null, artifactId: artifact?.artifactId ?? null, artifactSha256: artifact?.sha256 ?? null, artifactUrl: artifact ? `/api/v1/acceptance/v1/v1.2/runs/${run.testRunId}/artifacts/${artifact.artifactId}` : null, ...(artifact ? { artifactRef: projectV12QlibArtifactRef(artifact) } : {}), errors };
      }
      const status = assertions.some((item) => item.status === "WAITING") ? "WAITING" : assertions.every((item) => item.status === "PASS") ? "COMPLETED" : "FAILED";
      const latest = await this.repository.find(run.testRunId, run.ownerId);
      if (latest?.status !== "RUNNING" || (latest?.evidence.qlibTask as Record<string, unknown> | undefined)?.cancelRequested === true) { await finishCancelled(); return; }
      if (status === "FAILED" && (qlibEvidence as Record<string, unknown>).artifactId) {
        qlibEvidence = { ...qlibEvidence, artifactSchemaVersion: null, artifactId: null, artifactSha256: null, artifactUrl: null, artifactRef: undefined };
      } else if (artifact && artifact.status === "PENDING") {
        artifact = await this.artifacts.publishPending(run.testRunId, artifact.artifactId, run.ownerId);
        qlibEvidence = { ...qlibEvidence, artifactSchemaVersion: "v1.2-qlib-strategy-artifact-v1", artifactId: artifact.artifactId, artifactSha256: artifact.sha256, artifactUrl: `/api/v1/acceptance/v1/v1.2/runs/${run.testRunId}/artifacts/${artifact.artifactId}`, artifactRef: projectV12QlibArtifactRef(artifact) };
      }
      const evidence = { ...latest.evidence, artifacts: { normal, bad, factor }, qlib: effectiveProbe.probe, qlibFit: qlibEvidence, qlibTask: { ...((latest.evidence.qlibTask as Record<string, unknown> | undefined) ?? {}), phase: status, completedAt: new Date().toISOString(), artifactPublished: Boolean((qlibEvidence as Record<string, unknown>).artifactId) } };
      await this.repository.finishV12Run(run.testRunId, run.ownerId, status, assertions, evidence);
    } catch (error) {
      const latest = await this.repository.find(run.testRunId, run.ownerId);
      if (!latest || latest.status !== "RUNNING") return;
      const task = latest.evidence.qlibTask as Record<string, unknown> | undefined;
      if (task?.cancelRequested === true) { await finishCancelled(); return; }
      await this.repository.finishV12Run(run.testRunId, run.ownerId, "FAILED", [], { ...latest.evidence, error: error instanceof Error ? error.message : "unknown failure", qlibTask: { ...task, phase: "FAILED", completedAt: new Date().toISOString() } });
    }
  }

  private assertions(scenarioId: V12Scenario, normal: V12FixturePreview, bad: V12FixturePreview, probe: { probe?: { status?: string } }, factor: { status?: string; reason?: string; ranking?: unknown[] }): Assertion[] {
    if (scenarioId === "normal") {
      return [
        this.assertion("V1.2-DATA-NORMAL-001", { barCount: 6, securityCount: 2, quality: "READY" }, { barCount: normal.barCount, securityCount: normal.securityCount, quality: normal.quality?.status }, { source: "normal fixture" }),
        this.assertion("V1.2-QLIB-001", "READY", probe.probe?.status, { source: "qlib probe" }),
        {
          assertionId: "V1.2-FACTOR-PREVIEW-001",
          status: factor.status === "NOT_RUN" ? "WAITING" as const : factor.status === "COMPLETED" && Array.isArray(factor.ranking) && factor.ranking.length > 0 ? "PASS" as const : "FAIL" as const,
          expected: "computed versioned strategy output with at least one ranked security",
          actual: factor.status === "NOT_RUN" ? "NOT_RUN" : { status: factor.status, rankingCount: Array.isArray(factor.ranking) ? factor.ranking.length : null },
          evidence: { source: "Quant Research", ...(factor.reason ? { reason: factor.reason } : {}) }
        }
      ];
    }
    if (scenarioId === "rejection") {
      const futureData = bad.quality?.errors?.some((error) => error.code === "FUTURE_DATA") ?? false;
      return [this.assertion("V1.2-DATA-PIT-001", "REJECTED with FUTURE_DATA", { status: bad.quality?.status, futureData }, { source: "bad-future fixture" })];
    }
    return [this.assertion("V1.2-QLIB-PROBE-001", "READY", probe.probe?.status, { source: "qlib probe after recovery preparation" })];
  }

  private assertion(assertionId: string, expected: unknown, actual: unknown, evidence: Record<string, unknown>): Assertion {
    const pass = assertionId === "V1.2-DATA-NORMAL-001"
      ? JSON.stringify(expected) === JSON.stringify(actual)
      : assertionId === "V1.2-DATA-PIT-001"
        ? (actual as { status?: string; futureData?: boolean }).status === "REJECTED" && (actual as { futureData?: boolean }).futureData === true
        : actual === expected;
    return { assertionId, status: pass ? "PASS" : "FAIL", expected, actual, evidence };
  }

}

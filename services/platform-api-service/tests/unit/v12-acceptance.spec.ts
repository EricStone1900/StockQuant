import { afterEach, describe, expect, it, vi } from "vitest";
import { V12AcceptanceService, buildV12QlibFixtureRequest } from "../../src/application/v12-acceptance.js";
import { projectV12QlibArtifactRef } from "../../src/application/v12-qlib-artifact-ref.js";

describe("V1.2 common Qlib ArtifactRef", () => {
  it("projects stable owner/run identity and immutable hash onto the shared contract", () => {
    const ref = projectV12QlibArtifactRef({ artifactId: "a".repeat(64), testRunId: "00000000-0000-4000-8000-000000000001", ownerId: "owner-a", mediaType: "application/vnd.stockquant.qlib-fixture-model+json", sha256: "a".repeat(64), status: "RETAINED", expiresAt: null, payload: { schemaVersion: "v1.2-qlib-strategy-artifact-v1" } });
    expect(ref).toEqual({ schemaVersion: "artifact-ref.v1", artifactId: "a".repeat(64), testRunId: "00000000-0000-4000-8000-000000000001", ownerId: "owner-a", kind: "MODEL_PREDICTIONS", namespace: "research/00000000-0000-4000-8000-000000000001/qlib-fixture", mediaType: "application/vnd.stockquant.qlib-fixture-model+json", sha256: "a".repeat(64), status: "RETAINED", sourceRef: "platform-api-service:v1.2:00000000-0000-4000-8000-000000000001", expiresAt: null });
  });
});

function researchFixture() {
  const securities = ["AAA", "BBB"].map((ticker, index) => ({ securityId: `sec-${index}`, ticker, market: index ? "US_EQUITY" as const : "CN_A" as const, currency: index ? "USD" as const : "CNY" as const, timezone: "UTC", listedAt: "2020-01-01", delistedAt: null }));
  const bars = securities.flatMap((security, securityIndex) => Array.from({ length: 60 }, (_, index) => {
    const day = new Date(Date.UTC(2024, 0, 1 + index));
    const date = day.toISOString().slice(0, 10);
    const close = 10 + index * (securityIndex ? 0.08 : 0.1);
    return { ...security, date, availableAt: `${date}T16:05:00Z`, open: String(close - 0.02), high: String(close + 0.2), low: String(close - 0.2), close: String(close), volume: 1000 + index * 10, adjustment: "raw" as const };
  }));
  return { fixtureVersion: "v1.2-market-data-5" as const, dataMode: "FIXTURE" as const, dailyBarsSha256: "a".repeat(64), securities, marketSessions: [...new Set(bars.map((bar) => `${bar.market}:${bar.date}`))].map((value) => { const [market, sessionDate] = value.split(":"); return { market, sessionDate }; }), bars };
}

const qlibResult = (count: number) => ({
  schemaVersion: "qlib-fit-fixture-result-v1" as const, status: "COMPLETED" as const, sourceMode: "FIXTURE" as const, modelTraining: "PASS" as const,
  modelValidation: "NOT_RUN" as const, temporalValidation: "PASS" as const, candidateSourceExecution: "NOT_PERFORMED" as const,
  qlibVersion: "0.9.6", lightgbmVersion: "4.7.0", model: "qlib.contrib.model.gbdt.LGBModel" as const,
  segments: { train: { start: 0, end: 50, rows: 50 }, valid: { start: 50, end: 60, rows: 10 }, test: { start: 60, end: 70, rows: 10 } },
  testPredictionCount: count, testPredictionsFinite: true, testPredictionsSha256: "b".repeat(64), modelSha256: "c".repeat(64),
  modelArtifactBase64: "bW9kZWw=", testPredictionsCanonicalJson: JSON.stringify(Array.from({ length: count }, (_, index) => index)), testPredictions: Array.from({ length: count }, (_, index) => index),
  evaluationMetrics: {}, tracking: "temporary SQLite under /tmp; removed with the worker container", profitabilityClaim: "NOT_MADE" as const
});

describe("V1.2 persistent acceptance runs", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("runs real Qlib fixture contract through strategy targets and a durable owner-scoped Artifact", async () => {
    const saved: any[] = [];
    let currentRun: any;
    const repository = {
      newId: () => "00000000-0000-4000-8000-000000000012",
      save: vi.fn(async (run: any) => { currentRun = { ...run, namespace: run.namespace ?? "unit", createdAt: new Date().toISOString(), completedAt: null }; saved.push(currentRun); return currentRun; }),
      find: vi.fn(async (id: string, owner: string) => currentRun?.testRunId === id && currentRun?.ownerId === owner ? currentRun : null),
      listRunnableV12Runs: vi.fn(async () => currentRun?.status === "RUNNING" ? [currentRun] : []),
      withV12RunLock: vi.fn(async (_id: string, work: () => Promise<void>) => work()),
      updateV12Progress: vi.fn(async (_id: string, _owner: string, progress: any) => { currentRun = { ...currentRun, evidence: { ...currentRun.evidence, qlibTask: { ...currentRun.evidence.qlibTask, ...progress } } }; return true; }),
      requestV12Cancellation: vi.fn(async () => currentRun),
      finishV12Run: vi.fn(async (_id: string, _owner: string, status: string, assertions: any[], evidence: any) => { currentRun = { ...currentRun, status, assertions, evidence }; saved.push(currentRun); return currentRun; })
    } as any;
    const fixture = researchFixture();
    const marketData = {
      getV12NormalFixturePreview: vi.fn(async () => ({ barCount: 6, securityCount: 2, quality: { status: "READY", errors: [] }, bars: [], fixtureVersion: "v1.2-market-data-1", dataMode: "FIXTURE" } as any)),
      getV12FutureFixturePreview: vi.fn(async () => ({ quality: { status: "REJECTED", errors: [{ code: "FUTURE_DATA" }] }, bars: [], fixtureVersion: "v1.2-market-data-1", dataMode: "FIXTURE" } as any)),
      getV12ResearchFixturePreview: vi.fn(async () => fixture)
    };
    const quantResearch = {
      getV12QlibProbe: vi.fn(async () => ({ probe: { status: "READY" } })),
      getV12FactorPreview: vi.fn(async () => ({ status: "NOT_RUN", reason: "unscoped preview does not calculate strategy output", ranking: [] })),
      fitQlibFixtureModel: vi.fn(async (request: any) => qlibResult(request.featureRows.length - request.splits.test[0]))
    };
    let stagedArtifact: any;
    const artifactRepository = {
      savePending: vi.fn(async (input: any) => (stagedArtifact = { ...input, artifactId: "d".repeat(64), sha256: "d".repeat(64), status: "PENDING" })),
      publishPending: vi.fn(async (_runId: string, _artifactId: string, _ownerId: string) => ({ ...stagedArtifact, status: "PUBLISHED" }))
    } as any;
    const acceptedId = "00000000-0000-4000-8000-000000000012";

    const governance = { receiveStrategySnapshot: vi.fn(async (_command: any) => ({ status: 201, body: { snapshotId: "00000000-0000-4000-8000-000000000019", status: "RECEIVED" as const, replayed: false } })) };
    const service = new V12AcceptanceService(repository, marketData, quantResearch, artifactRepository, governance);
    const accepted = await service.create("owner-a", "normal", 7);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(accepted).toMatchObject({ accepted: true, testRunId: "00000000-0000-4000-8000-000000000012", status: "RUNNING" });
    expect(saved.at(-1)).toMatchObject({ status: "COMPLETED" });
    expect(saved.at(-1).assertions).toEqual(expect.arrayContaining([
      expect.objectContaining({ assertionId: "V1.2-DATA-NORMAL-001", status: "PASS" }),
      expect.objectContaining({ assertionId: "V1.2-FACTOR-PREVIEW-001", status: "PASS" }),
      expect.objectContaining({ assertionId: "V1.2-GOVERNANCE-001", status: "PASS" })
    ]));
    expect(quantResearch.fitQlibFixtureModel).toHaveBeenCalledTimes(2);
    expect(artifactRepository.savePending).toHaveBeenCalledWith(expect.objectContaining({ testRunId: accepted.testRunId, ownerId: "owner-a", payload: expect.objectContaining({ schemaVersion: "v1.2-qlib-strategy-artifact-v1", qlibModels: expect.arrayContaining([expect.objectContaining({ market: "CN_A", modelSha256: "c".repeat(64) }), expect.objectContaining({ market: "US_EQUITY", modelSha256: "c".repeat(64) })]), strategies: expect.arrayContaining([expect.objectContaining({ mode: "NO_TRADE", reason: expect.any(String), targets: [] }), expect.objectContaining({ mode: "TOPK", reason: expect.any(String), targets: expect.arrayContaining([expect.objectContaining({ reason: expect.any(String) })]) })]) }) }));
    expect(artifactRepository.publishPending).toHaveBeenCalledWith(accepted.testRunId, "d".repeat(64), "owner-a");
    expect(saved.at(-1).evidence.qlibFit).toMatchObject({ fixtureVersion: "v1.2-market-data-5", temporalValidation: "PASS", artifactId: "d".repeat(64) });
    expect(governance.receiveStrategySnapshot).toHaveBeenCalledTimes(2);
    const staged = await artifactRepository.savePending.mock.results[0].value;
    const published = { ...staged, status: "PUBLISHED" };
    const submittedSnapshots = governance.receiveStrategySnapshot.mock.calls.map(([command]: [any]) => command);
    expect(submittedSnapshots).toHaveLength(published.payload.strategies.length);
    for (const snapshot of submittedSnapshots) {
      const strategy = published.payload.strategies.find((item: any) => item.strategyId === snapshot.strategyId);
      expect(strategy).toBeDefined();
      expect(snapshot).toMatchObject({
        ownerId: "owner-a",
        testRunId: accepted.testRunId,
        artifactId: published.artifactId,
        artifactSha256: published.sha256,
        fixtureVersion: published.payload.fixtureVersion,
        dataVersion: published.payload.dataVersion,
        factorVersion: published.payload.factorVersion,
        strategyId: strategy.strategyId,
        strategyHash: strategy.strategyHash,
        mode: strategy.mode,
        asOf: strategy.asOf,
        targets: strategy.targets
      });
    }
    expect(submittedSnapshots.find((item: any) => item.mode === "TOPK")?.targets).toHaveLength(2);
    expect(submittedSnapshots.find((item: any) => item.mode === "NO_TRADE")?.targets).toEqual([]);
  });

  it("does not publish a staged Qlib Artifact when a later Governance handoff fails", async () => {
    const testRunId = "00000000-0000-4000-8000-000000000031";
    let currentRun: any = { testRunId, stageId: "V1.2", scenarioId: "normal", scenarioVersion: "1.0.0", ownerId: "owner-failure", namespace: "v12-failure", status: "RUNNING", seed: 13, assertions: [], evidence: { qlibTask: { phase: "QUEUED", cancelRequested: false, artifactPublished: false } } };
    const repository = {
      newId: () => testRunId,
      find: vi.fn(async () => currentRun),
      withV12RunLock: vi.fn(async (_id: string, work: () => Promise<void>) => work()),
      updateV12Progress: vi.fn(async (_id: string, _owner: string, progress: any) => { currentRun = { ...currentRun, evidence: { ...currentRun.evidence, qlibTask: { ...currentRun.evidence.qlibTask, ...progress } } }; return true; }),
      finishV12Run: vi.fn(async (_id: string, _owner: string, status: string, assertions: any[], evidence: any) => { currentRun = { ...currentRun, status, assertions, evidence }; return currentRun; })
    } as any;
    const fixture = researchFixture();
    const marketData = {
      getV12NormalFixturePreview: vi.fn(async () => ({ barCount: 6, securityCount: 2, quality: { status: "READY", errors: [] }, bars: [], fixtureVersion: "v1.2-market-data-1", dataMode: "FIXTURE" } as any)),
      getV12FutureFixturePreview: vi.fn(async () => ({ quality: { status: "REJECTED", errors: [{ code: "FUTURE_DATA" }] }, bars: [], fixtureVersion: "v1.2-market-data-1", dataMode: "FIXTURE" } as any)),
      getV12ResearchFixturePreview: vi.fn(async () => fixture)
    };
    const quantResearch = {
      getV12QlibProbe: vi.fn(async () => ({ probe: { status: "READY" } })),
      getV12FactorPreview: vi.fn(async () => ({ status: "NOT_RUN", ranking: [] })),
      fitQlibFixtureModel: vi.fn(async (request: any) => qlibResult(request.featureRows.length - request.splits.test[0]))
    };
    const artifactRepository = {
      savePending: vi.fn(async (input: any) => ({ ...input, artifactId: "f".repeat(64), sha256: "f".repeat(64), status: "PENDING" })),
      publishPending: vi.fn()
    } as any;
    const governance = { receiveStrategySnapshot: vi.fn(async () => { throw new Error("injected Governance write failure"); }) };
    const service = new V12AcceptanceService(repository, marketData, quantResearch, artifactRepository, governance);

    await service.execute(currentRun);

    expect(currentRun.status).toBe("FAILED");
    expect(artifactRepository.savePending).toHaveBeenCalledTimes(1);
    expect(governance.receiveStrategySnapshot).toHaveBeenCalledTimes(1);
    expect(artifactRepository.publishPending).not.toHaveBeenCalled();
    expect(currentRun.evidence.qlibTask.artifactPublished).toBe(false);
    expect(currentRun.evidence.qlibFit).toBeUndefined();
  });

  it("acknowledges cancellation at the active-fit checkpoint and does not publish a partial Artifact", async () => {
    let currentRun: any;
    const repository = {
      newId: () => "00000000-0000-4000-8000-000000000013",
      save: vi.fn(async (run: any) => { currentRun = { ...run, namespace: run.namespace ?? "unit", createdAt: new Date().toISOString(), completedAt: null }; return currentRun; }),
      find: vi.fn(async (id: string, owner: string) => currentRun?.testRunId === id && currentRun?.ownerId === owner ? currentRun : null),
      listRunnableV12Runs: vi.fn(async () => currentRun?.status === "RUNNING" ? [currentRun] : []),
      withV12RunLock: vi.fn(async (_id: string, work: () => Promise<void>) => work()),
      updateV12Progress: vi.fn(async (_id: string, _owner: string, progress: any) => {
        if (currentRun.evidence.qlibTask.cancelRequested) return false;
        currentRun = { ...currentRun, evidence: { ...currentRun.evidence, qlibTask: { ...currentRun.evidence.qlibTask, ...progress } } };
        return true;
      }),
      requestV12Cancellation: vi.fn(async () => { currentRun = { ...currentRun, evidence: { ...currentRun.evidence, qlibTask: { ...currentRun.evidence.qlibTask, cancelRequested: true } } }; return currentRun; }),
      finishV12Run: vi.fn(async (_id: string, _owner: string, status: string, assertions: any[], evidence: any) => { currentRun = { ...currentRun, status, assertions, evidence }; return currentRun; })
    } as any;
    const fixture = researchFixture();
    let fitStarted!: () => void;
    let releaseFit!: () => void;
    const started = new Promise<void>((resolve) => { fitStarted = resolve; });
    const pausedFit = new Promise<void>((resolve) => { releaseFit = resolve; });
    const quantResearch = {
      getV12QlibProbe: vi.fn(async () => ({ probe: { status: "READY" } })),
      getV12FactorPreview: vi.fn(async () => ({ status: "NOT_RUN", ranking: [] })),
      fitQlibFixtureModel: vi.fn(async (request: any) => { fitStarted(); await pausedFit; return qlibResult(request.featureRows.length - request.splits.test[0]); })
    };
    const artifacts = { savePending: vi.fn(), publishPending: vi.fn() } as any;
    const service = new V12AcceptanceService(repository, {
      getV12NormalFixturePreview: vi.fn(async () => ({ barCount: 6, securityCount: 2, quality: { status: "READY", errors: [] }, bars: [], fixtureVersion: "v1.2-market-data-1", dataMode: "FIXTURE" } as any)),
      getV12FutureFixturePreview: vi.fn(async () => ({ quality: { status: "REJECTED", errors: [{ code: "FUTURE_DATA" }] }, bars: [], fixtureVersion: "v1.2-market-data-1", dataMode: "FIXTURE" } as any)),
      getV12ResearchFixturePreview: vi.fn(async () => fixture)
    }, quantResearch, artifacts, { receiveStrategySnapshot: vi.fn(async () => ({ status: 201, body: { snapshotId: "00000000-0000-4000-8000-000000000019", status: "RECEIVED" as const, replayed: false } })) });

    const accepted = await service.create("owner-cancel", "normal", 9);
    await started;
    expect(await service.cancel(accepted.testRunId, "owner-cancel")).toMatchObject({ evidence: { qlibTask: { cancelRequested: true } } });
    releaseFit();
    await vi.waitFor(() => expect(currentRun.status).toBe("CANCELLED"));
    expect(quantResearch.fitQlibFixtureModel).toHaveBeenCalledTimes(1);
    expect(artifacts.savePending).not.toHaveBeenCalled();
    expect(currentRun.evidence.qlibTask).toMatchObject({ phase: "CANCELLED", artifactPublished: false });
    expect(currentRun.assertions).toContainEqual(expect.objectContaining({ assertionId: "V1.2-QLIB-CANCEL-001", status: "PASS" }));
  });

  it("resumes a persisted RUNNING Qlib TestRun from its last phase after Platform startup", async () => {
    const fixture = researchFixture();
    let currentRun: any = { testRunId: "00000000-0000-4000-8000-000000000014", stageId: "V1.2", scenarioId: "normal", scenarioVersion: "1.0.0", ownerId: "owner-resume", namespace: "v12-resume", status: "RUNNING", seed: 10, assertions: [], evidence: { environmentMode: "BACKTEST", dataMode: "FIXTURE", brokerMode: "FAKE", qlibTask: { phase: "FITTING_CN_A", resumeCount: 0, cancelRequested: false } } };
    const repository = {
      listRunnableV12Runs: vi.fn(async () => [currentRun]),
      withV12RunLock: vi.fn(async (_id: string, work: () => Promise<void>) => work()),
      find: vi.fn(async () => currentRun),
      updateV12Progress: vi.fn(async (_id: string, _owner: string, progress: any) => { currentRun = { ...currentRun, evidence: { ...currentRun.evidence, qlibTask: { ...currentRun.evidence.qlibTask, ...progress } } }; return true; }),
      finishV12Run: vi.fn(async (_id: string, _owner: string, status: string, assertions: any[], evidence: any) => { currentRun = { ...currentRun, status, assertions, evidence }; return currentRun; })
    } as any;
    const quantResearch = {
      getV12QlibProbe: vi.fn(async () => ({ probe: { status: "READY" } })),
      getV12FactorPreview: vi.fn(async () => ({ status: "NOT_RUN", ranking: [] })),
      fitQlibFixtureModel: vi.fn(async (request: any) => qlibResult(request.featureRows.length - request.splits.test[0]))
    };
    const staged = { artifactId: "e".repeat(64), sha256: "e".repeat(64), status: "PENDING", testRunId: currentRun.testRunId, ownerId: currentRun.ownerId, mediaType: "application/vnd.stockquant.qlib-fixture-model+json", payload: {} };
    const artifacts = { savePending: vi.fn(async () => staged), publishPending: vi.fn(async () => ({ ...staged, status: "PUBLISHED" })) } as any;
    const service = new V12AcceptanceService(repository, {
      getV12NormalFixturePreview: vi.fn(async () => ({ barCount: 6, securityCount: 2, quality: { status: "READY", errors: [] }, bars: [], fixtureVersion: "v1.2-market-data-1", dataMode: "FIXTURE" } as any)),
      getV12FutureFixturePreview: vi.fn(async () => ({ quality: { status: "REJECTED", errors: [{ code: "FUTURE_DATA" }] }, bars: [], fixtureVersion: "v1.2-market-data-1", dataMode: "FIXTURE" } as any)),
      getV12ResearchFixturePreview: vi.fn(async () => fixture)
    }, quantResearch, artifacts, { receiveStrategySnapshot: vi.fn(async () => ({ status: 201, body: { snapshotId: "00000000-0000-4000-8000-000000000019", status: "RECEIVED" as const, replayed: false } })) });

    await expect(service.resumePending()).resolves.toBe(1);
    await vi.waitFor(() => expect(currentRun.status).toBe("COMPLETED"));
    expect(quantResearch.fitQlibFixtureModel).toHaveBeenCalledTimes(2);
    expect(currentRun.evidence.qlibTask).toMatchObject({ phase: "COMPLETED", resumeCount: 1, previousPhase: "FITTING_CN_A", artifactPublished: true });
  });

  it("builds date-grouped, temporal-safe cross-market Qlib rows", () => {
    const built = buildV12QlibFixtureRequest(researchFixture());
    expect(built.request.featureRows.length).toBeGreaterThan(30);
    expect(built.request.featureRows.every((row) => row.length === 3)).toBe(true);
    expect(built.request.temporalMetadata?.[0].decisionAt).toBe(built.request.temporalMetadata?.[1].decisionAt);
    expect(built.request.splits.train[1]).toBe(built.request.splits.valid[0]);
    expect(built.request.splits.valid[1]).toBe(built.request.splits.test[0]);
    expect(new Set(built.factorRows.map((row) => row.market))).toEqual(new Set(["CN_A", "US_EQUITY"]));
    for (const market of ["CN_A", "US_EQUITY"] as const) {
      const marketRequest = buildV12QlibFixtureRequest(researchFixture(), market).request;
      const decisions = marketRequest.temporalMetadata!.map((row) => Date.parse(row.decisionAt));
      expect(decisions.every((value, index) => index === 0 || value >= decisions[index - 1])).toBe(true);
      const fixture = researchFixture();
      const sessions = [...new Set(fixture.bars.filter((bar) => bar.market === market).map((bar) => bar.date))].sort();
      expect(marketRequest.temporalMetadata!.every((row) => row.labelAvailableAt.slice(0, 10) === sessions[sessions.indexOf(row.decisionAt.slice(0, 10)) + 1])).toBe(true);
    }
  });

  it("does not bridge missing market sessions in lookbacks or next-session labels", () => {
    const fixture = researchFixture();
    const missingDate = fixture.bars.find((bar) => bar.securityId === "sec-0" && bar.date === "2024-01-26")!.date;
    const peerSecurity = { ...fixture.securities[0], securityId: "sec-peer", ticker: "CCC" };
    fixture.securities.push(peerSecurity);
    fixture.bars.push(...Array.from({ length: 60 }, (_, index) => {
      const date = new Date(Date.UTC(2024, 0, 1 + index)).toISOString().slice(0, 10);
      const close = 15 + index * 0.1;
      return { ...peerSecurity, date, availableAt: `${date}T16:05:00Z`, open: String(close - 0.02), high: String(close + 0.2), low: String(close - 0.2), close: String(close), volume: 1000 + index * 10, adjustment: "raw" as const };
    }));
    fixture.bars = fixture.bars.filter((bar) => !(bar.securityId === "sec-0" && bar.date === missingDate));
    const built = buildV12QlibFixtureRequest(fixture, "CN_A");
    const tickerRows = built.factorRows.filter((row) => row.ticker === "AAA");
    const sessions = [...new Set(researchFixture().bars.filter((bar) => bar.market === "CN_A").map((bar) => bar.date))].sort();
    const missingIndex = sessions.indexOf(missingDate);
    const invalidDecisionDates = new Set(sessions.slice(missingIndex - 1, missingIndex + 21));
    expect(tickerRows.filter((row) => invalidDecisionDates.has(row.date)).map((row) => row.date)).toEqual([]);
    expect(tickerRows.some((row) => row.date === sessions[missingIndex + 21])).toBe(true);
    expect(built.factorRows.some((row) => row.ticker === "CCC" && row.date === missingDate)).toBe(true);
    expect(built.request.temporalMetadata!.every((row, index) => row.labelAvailableAt.slice(0, 10) === sessions[sessions.indexOf(built.rowKeys[index].date) + 1])).toBe(true);
  });

  it("fails closed for every security when an explicitly expected market-wide session has no bars", () => {
    const fixture = researchFixture();
    const missingDate = fixture.marketSessions.find((row) => row.market === "CN_A" && row.sessionDate === "2024-01-26")!.sessionDate;
    fixture.bars = fixture.bars.filter((bar) => !(bar.market === "CN_A" && bar.date === missingDate));
    expect(fixture.marketSessions.some((row) => row.market === "CN_A" && row.sessionDate === missingDate)).toBe(true);
    expect(() => buildV12QlibFixtureRequest(fixture, "CN_A")).toThrow("fewer than 30 usable decision dates after lookback and label windows");
  });

  it("rejects bars outside the security listing interval", () => {
    const fixture = researchFixture();
    fixture.securities[0].delistedAt = "2024-02-20";
    fixture.bars.push({ ...fixture.bars.find((bar) => bar.securityId === "sec-0")!, date: "2024-02-21", availableAt: "2024-02-21T16:05:00Z" });
    expect(() => buildV12QlibFixtureRequest(fixture, "CN_A")).toThrow("outside the security listing interval");
  });

  it("fails closed before fitting when frozen history cannot support lookback and train/validation/test windows", () => {
    expect(() => buildV12QlibFixtureRequest({ ...researchFixture(), bars: researchFixture().bars.slice(0, 20) })).toThrow("fewer than 30 usable decision dates");
  });

  it("preflights both markets before Qlib when one market has insufficient history", async () => {
    let currentRun: any;
    const repository = {
      newId: () => "00000000-0000-4000-8000-000000000015",
      save: vi.fn(async (run: any) => { currentRun = { ...run, namespace: run.namespace ?? "unit", createdAt: new Date().toISOString(), completedAt: null }; return currentRun; }),
      find: vi.fn(async (id: string, owner: string) => currentRun?.testRunId === id && currentRun?.ownerId === owner ? currentRun : null),
      listRunnableV12Runs: vi.fn(async () => []),
      withV12RunLock: vi.fn(async (_id: string, work: () => Promise<void>) => work()),
      updateV12Progress: vi.fn(async (_id: string, _owner: string, progress: any) => { currentRun = { ...currentRun, evidence: { ...currentRun.evidence, qlibTask: { ...currentRun.evidence.qlibTask, ...progress } } }; return true; }),
      finishV12Run: vi.fn(async (_id: string, _owner: string, status: string, assertions: any[], evidence: any) => { currentRun = { ...currentRun, status, assertions, evidence }; return currentRun; })
    } as any;
    const fixture = researchFixture();
    fixture.bars = fixture.bars.filter((bar) => bar.market !== "US_EQUITY" || bar.date <= "2024-01-20");
    const quantResearch = {
      getV12QlibProbe: vi.fn(async () => ({ probe: { status: "READY" } })),
      getV12FactorPreview: vi.fn(async () => ({ status: "NOT_RUN", ranking: [] })),
      fitQlibFixtureModel: vi.fn(async (request: any) => qlibResult(request.featureRows.length - request.splits.test[0]))
    };
    const artifactRepository = { savePending: vi.fn(), publishPending: vi.fn() } as any;
    const governance = { receiveStrategySnapshot: vi.fn() };
    const service = new V12AcceptanceService(repository, {
      getV12NormalFixturePreview: vi.fn(async () => ({ barCount: 6, securityCount: 2, quality: { status: "READY", errors: [] }, bars: [], fixtureVersion: "v1.2-market-data-1", dataMode: "FIXTURE" } as any)),
      getV12FutureFixturePreview: vi.fn(async () => ({ quality: { status: "REJECTED", errors: [{ code: "FUTURE_DATA" }] }, bars: [], fixtureVersion: "v1.2-market-data-1", dataMode: "FIXTURE" } as any)),
      getV12ResearchFixturePreview: vi.fn(async () => fixture)
    }, quantResearch, artifactRepository, governance as any);

    await service.create("owner-insufficient-us", "normal", 11);
    await vi.waitFor(() => expect(currentRun.status).toBe("FAILED"));
    expect(currentRun.evidence.error).toContain("fewer than 30 usable decision dates");
    expect(quantResearch.fitQlibFixtureModel).not.toHaveBeenCalled();
    expect(artifactRepository.savePending).not.toHaveBeenCalled();
    expect(artifactRepository.publishPending).not.toHaveBeenCalled();
    expect(governance.receiveStrategySnapshot).not.toHaveBeenCalled();
  });

  it("passes owner scope through to persistent lookup", async () => {
    const repository = { find: vi.fn(async (id: string, owner: string) => ({ testRunId: id, ownerId: owner, stageId: "V1.2" })) } as any;
    const service = new V12AcceptanceService(repository, {} as any, {} as any, {} as any);
    await service.find("run-1", "owner-b");
    expect(repository.find).toHaveBeenCalledWith("run-1", "owner-b");
  });
});

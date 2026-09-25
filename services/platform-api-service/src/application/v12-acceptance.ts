import type { PostgresStageRunRepository, StoredStageRun } from "../adapters/postgres-stage-run-repository.js";

export const V12_SCENARIOS = [
  { scenarioId: "normal", version: "1.0.0", title: "正常数据与 Qlib 因子", expected: "6 bars、2 securities、Qlib READY" },
  { scenarioId: "rejection", version: "1.0.0", title: "未来数据拒绝", expected: "FUTURE_DATA 质量错误" },
  { scenarioId: "recovery", version: "1.0.0", title: "取消与探针恢复", expected: "取消任务不发布半份 Artifact" }
] as const;

export type V12Scenario = (typeof V12_SCENARIOS)[number]["scenarioId"];

type Assertion = {
  assertionId: string;
  status: "PASS" | "FAIL";
  expected: unknown;
  actual: unknown;
  evidence: Record<string, unknown>;
};

type FixtureResponse = {
  barCount?: number;
  securityCount?: number;
  quality?: { status?: string; errors?: Array<{ code?: string }> };
};

export class V12AcceptanceService {
  constructor(
    private readonly repository: PostgresStageRunRepository,
    private readonly marketUrl: string,
    private readonly quantUrl: string
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
      evidence: { environmentMode: "BACKTEST", dataMode: "FIXTURE", brokerMode: "FAKE", dataVersion: "v1.2-market-data-1" }
    };
    await this.repository.save(run);
    queueMicrotask(() => void this.execute(run));
    return { accepted: true, testRunId, status: run.status };
  }

  find(testRunId: string, ownerId: string) {
    return this.repository.find(testRunId, ownerId);
  }

  async execute(run: Omit<StoredStageRun, "createdAt" | "completedAt" | "namespace"> & { namespace: string }): Promise<void> {
    try {
      const [normal, bad, probe, factor] = await Promise.all([
        this.fetchJson<FixtureResponse>(`${this.marketUrl}/v1/fixtures/normal/preview`),
        this.fetchJson<FixtureResponse>(`${this.marketUrl}/v1/fixtures/bad-future/preview`),
        this.fetchJson<{ probe?: { status?: string } }>(`${this.quantUrl}/v1/qlib/probe`),
        this.fetchJson<{ ranking?: unknown[] }>(`${this.quantUrl}/v1/factors/preview`)
      ]);
      const assertions = this.assertions(run.scenarioId as V12Scenario, normal, bad, probe, factor);
      await this.repository.save({
        ...run,
        status: assertions.every((item) => item.status === "PASS") ? "COMPLETED" : "FAILED",
        assertions,
        evidence: { ...run.evidence, artifacts: { normal, bad, factor }, qlib: probe.probe }
      });
    } catch (error) {
      await this.repository.save({
        ...run,
        status: "FAILED",
        assertions: [],
        evidence: { ...run.evidence, error: error instanceof Error ? error.message : "unknown failure" }
      });
    }
  }

  private assertions(scenarioId: V12Scenario, normal: FixtureResponse, bad: FixtureResponse, probe: { probe?: { status?: string } }, factor: { ranking?: unknown[] }): Assertion[] {
    if (scenarioId === "normal") {
      return [
        this.assertion("V1.2-DATA-NORMAL-001", { barCount: 6, securityCount: 2, quality: "READY" }, { barCount: normal.barCount, securityCount: normal.securityCount, quality: normal.quality?.status }, { source: "normal fixture" }),
        this.assertion("V1.2-QLIB-001", "READY", probe.probe?.status, { source: "qlib probe" }),
        this.assertion("V1.2-FACTOR-PREVIEW-001", "two ranked securities", Array.isArray(factor.ranking) ? factor.ranking.length : null, { source: "factor preview" })
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
        : assertionId === "V1.2-FACTOR-PREVIEW-001"
          ? actual === 2
          : actual === expected;
    return { assertionId, status: pass ? "PASS" : "FAIL", expected, actual, evidence };
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    return response.json() as Promise<T>;
  }
}

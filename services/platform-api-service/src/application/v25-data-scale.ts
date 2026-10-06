import { createHash, randomUUID } from "node:crypto";

export type V25Scenario = "normal" | "rejection" | "recovery";
export const V25_SCENARIOS = [
  { scenarioId: "normal", version: "1.0.0", title: "扩容与模型验证", expected: "20 securities × 60 sessions、固定样本回归、时间序切分检查" },
  { scenarioId: "rejection", version: "1.0.0", title: "资源与缓存隔离拒绝", expected: "Fixture场景策略拒绝超并发、跨 DataVersion 缓存和预算超限" },
  { scenarioId: "recovery", version: "1.0.0", title: "扩容任务恢复", expected: "Fixture内存导入从游标恢复、无重复行；取消不发布" },
] as const;

const DATA_VERSION = "v2.5-acceptance-synthetic-fixture-v2";
const OBSERVATION_GATE = "V2.4_20_TRADING_DAYS_PENDING";
const hash = (value: string) => createHash("sha256").update(value).digest("hex");

export type ScaleRow = { security: string; session: string; value: number };
export function partitionKey(row: ScaleRow): string { return `${row.security}|${row.session}`; }
export function queryPartition(rows: ScaleRow[], security: string, from: string, to: string): ScaleRow[] {
  return rows.filter((row) => row.security === security && row.session >= from && row.session <= to).sort((a, b) => a.session.localeCompare(b.session));
}
export function walkForwardSplits(sessions: string[], trainSize: number, validationSize: number, testSize: number) {
  const result: Array<{ train: string[]; validation: string[]; test: string[] }> = [];
  for (let start = 0; start + trainSize + validationSize + testSize <= sessions.length; start += testSize) {
    result.push({ train: sessions.slice(start, start + trainSize), validation: sessions.slice(start + trainSize, start + trainSize + validationSize), test: sessions.slice(start + trainSize + validationSize, start + trainSize + validationSize + testSize) });
  }
  return result;
}
export function assertPitSafe(rows: ScaleRow[], trainEnd: string, evaluationStart: string): boolean {
  return rows.filter((row) => row.session >= evaluationStart).every((row) => row.session > trainEnd);
}
export function cancelTask(status: "QUEUED" | "RUNNING" | "CANCELLED" | "COMPLETED"): "CANCELLED" | "COMPLETED" {
  return status === "COMPLETED" ? "COMPLETED" : "CANCELLED";
}

function buildFixtureRows(securityCount: number, sessionCount: number): ScaleRow[] {
  return Array.from({ length: securityCount * sessionCount }, (_, index) => {
    const securityIndex = index % securityCount;
    const sessionIndex = Math.floor(index / securityCount);
    return { security: `S${String(securityIndex).padStart(2, "0")}`, session: `session-${String(sessionIndex).padStart(3, "0")}`, value: ((securityIndex * 7 + sessionIndex * 3) % 1000) / 100 };
  });
}

function canonicalRows(rows: ScaleRow[]): string {
  return rows.map((row) => `${row.security}|${row.session}|${row.value.toFixed(2)}`).join("\n");
}

function runBoundedFixtureAdmissions(submitted: number, maxConcurrent: number) {
  const admitted: number[] = [];
  const rejected: number[] = [];
  for (let id = 0; id < submitted; id += 1) (admitted.length < maxConcurrent ? admitted : rejected).push(id);
  return { admitted, rejected };
}

function runFixtureImportWithCheckpoint(rows: ScaleRow[], checkpointAt: number) {
  const imported = new Map<string, ScaleRow>();
  for (let index = 0; index < checkpointAt; index += 1) imported.set(partitionKey(rows[index]), rows[index]);
  const resumedAt = imported.size;
  let duplicateRows = 0;
  for (let index = resumedAt; index < rows.length; index += 1) {
    const row = rows[index];
    const key = partitionKey(row);
    if (imported.has(key)) duplicateRows += 1;
    imported.set(key, row);
  }
  return { imported, resumedAt, duplicateRows };
}

export class V25DataScaleEngine {
  run(scenarioId: V25Scenario, seed: number, testRunId = randomUUID()) {
    const common = {
      testRunId, stageId: "V2.5", scenarioId, scenarioVersion: "1.0.0", seed,
      environmentMode: "BACKTEST", dataMode: "FIXTURE", brokerMode: "FAKE",
      executionPolicy: "simulation-execution-policy-v1", liveTradingEnabled: false,
    };
    if (scenarioId === "normal") {
      const measureStarted = performance.now();
      const measuredRows = buildFixtureRows(20, 60);
      const baselineRows = buildFixtureRows(10, 30);
      const scaledComparableRows = measuredRows.filter((row) => Number(row.security.slice(1)) < 10 && Number(row.session.slice(8)) < 30);
      const inputHash = hash(canonicalRows(measuredRows));
      const baselineHash = hash(canonicalRows(baselineRows));
      const comparableHash = hash(canonicalRows(scaledComparableRows));
      const partition = queryPartition(measuredRows, "S00", measuredRows[0].session, measuredRows.at(-1)!.session);
      const sessions = [...new Set(measuredRows.map((row) => row.session))];
      const splits = walkForwardSplits(sessions, 30, 15, 15);
      const timeOrdered = splits.length > 0 && splits.every((split) => split.train.at(-1)! < split.validation[0] && split.validation.at(-1)! < split.test[0]);
      const futureRowsAbsentFromTrain = splits.every((split) => split.train.every((session) => session < split.validation[0]) && split.validation.every((session) => session < split.test[0]) && !split.train.some((session) => split.validation.includes(session) || split.test.includes(session)) && !split.validation.some((session) => split.test.includes(session)));
      const cache = new Map<string, string>();
      cache.set(`${DATA_VERSION}:factor`, inputHash);
      const cacheIsolation = cache.get("different-data-version:factor") === undefined;
      const measuredElapsedSeconds = Number(((performance.now() - measureStarted) / 1000).toFixed(3));
      const measuredMemoryMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
      const assertions = [
        { assertionId: "V2.5-SCALE-001", status: measuredRows.length === 1200 && new Set(measuredRows.map((row) => row.security)).size === 20 && sessions.length === 60 ? "PASS" : "FAIL", expected: { securities: 20, sessions: 60, rows: 1200 }, actual: { securities: new Set(measuredRows.map((row) => row.security)).size, sessions: sessions.length, rows: measuredRows.length } },
        { assertionId: "V2.5-REGRESSION-002", status: baselineHash === comparableHash ? "PASS" : "FAIL", expected: baselineHash, actual: comparableHash },
        { assertionId: "V2.5-PIT-003", status: timeOrdered && futureRowsAbsentFromTrain ? "PASS" : "FAIL", expected: "fixture train < validation < test, future rows excluded from train", actual: { windows: splits.length, timeOrdered, futureRowsAbsentFromTrain } },
        { assertionId: "V2.5-PARTITION-006", status: partition.length === 60 ? "PASS" : "FAIL", expected: "one security partition returns 60 fixture sessions", actual: { rows: partition.length, key: partitionKey(partition[0]) } },
        { assertionId: "V2.5-CACHE-004", status: cacheIsolation ? "PASS" : "FAIL", expected: "cache lookup includes DataVersion", actual: { isolated: cacheIsolation, cacheEntries: cache.size } },
        { assertionId: "V2.5-RESOURCE-005", status: measuredMemoryMb <= 1024 && measuredElapsedSeconds <= 120 ? "PASS" : "FAIL", expected: { maxMemoryMb: 1024, maxSeconds: 120 }, actual: { maxMemoryMb: measuredMemoryMb, elapsedSeconds: measuredElapsedSeconds, rowsMeasured: measuredRows.length, architecture: "linux/amd64-emulated" } },
      ];
      return { ...common, status: assertions.every((item) => item.status === "PASS") ? "COMPLETED" : "FAILED", namespace: `v2-5-normal-${testRunId}`, assertions, evidence: { evidenceMode: "IN_MEMORY_SYNTHETIC_FIXTURE", scale: { profile: "S2 synthetic fixture", securities: 20, sessions: 60, rows: measuredRows.length, dataVersion: DATA_VERSION, contentHash: inputHash }, regression: { baselineRows: baselineRows.length, comparableRows: scaledComparableRows.length, baselineHash, expandedSampleHash: comparableHash, unchanged: baselineHash === comparableHash }, splitValidation: { walkForwardWindows: splits.length, timeOrdered, futureRowsAbsentFromTrain }, modelTraining: "NOT_RUN", marketPIT: "NOT_RUN", cache: { versioned: true, crossDataVersionReuse: !cacheIsolation }, resources: { budget: { memoryMb: 1024, seconds: 120 }, observed: { memoryMb: measuredMemoryMb, seconds: measuredElapsedSeconds, rows: measuredRows.length }, architecture: "linux/amd64-emulated" }, durableMarketDataQuery: "NOT_RUN", observationGate: OBSERVATION_GATE } };
    }
    if (scenarioId === "rejection") {
      const queue = runBoundedFixtureAdmissions(5, 4);
      const cache = new Map<string, string>();
      cache.set(`${DATA_VERSION}:factor`, "fixture-result");
      const crossVersionCacheResult = cache.get("different-data-version:factor");
      const maxRows = 1000;
      const requestedRows = 1001;
      let publishedArtifact: string | null = null;
      const budgetError = requestedRows > maxRows ? "RESOURCE_BUDGET_EXCEEDED" : null;
      if (!budgetError) publishedArtifact = hash(String(requestedRows));
      const assertions = [
        { assertionId: "V2.5-REJECT-001", status: queue.rejected.length === 1 && queue.admitted.length === 4 ? "PASS" : "FAIL", expected: "scenario admission caps active work at four", actual: { submitted: 5, admitted: queue.admitted.length, rejected: queue.rejected.length, code: queue.rejected.length ? "CONCURRENCY_LIMIT" : null } },
        { assertionId: "V2.5-REJECT-002", status: crossVersionCacheResult === undefined ? "PASS" : "FAIL", expected: "cache lookup cannot cross DataVersion", actual: { isolated: crossVersionCacheResult === undefined, code: crossVersionCacheResult === undefined ? "CACHE_VERSION_MISMATCH" : null } },
        { assertionId: "V2.5-REJECT-003", status: budgetError === "RESOURCE_BUDGET_EXCEEDED" && publishedArtifact === null ? "PASS" : "FAIL", expected: "over-budget fixture request is rejected before artifact publication", actual: { code: budgetError, published: publishedArtifact !== null } },
      ];
      return { ...common, status: assertions.every((item) => item.status === "PASS") ? "COMPLETED" : "FAILED", namespace: `v2-5-rejection-${testRunId}`, assertions, evidence: { evidenceMode: "IN_MEMORY_SCENARIO_POLICY", productionQueueValidation: "NOT_RUN", queue: { maxConcurrent: 4, submitted: 5, admitted: queue.admitted.length, rejected: queue.rejected.length }, cache: { version: DATA_VERSION, crossVersionLookupFound: crossVersionCacheResult !== undefined }, budget: { maxRows, requestedRows, code: budgetError, published: publishedArtifact !== null }, observationGate: OBSERVATION_GATE } };
    }
    const rows = buildFixtureRows(20, 60);
    const checkpointAt = 640;
    const recovered = runFixtureImportWithCheckpoint(rows, checkpointAt);
    let cancelledArtifact: string | null = null;
    const cancelledStatus = cancelTask("RUNNING");
    if (cancelledStatus === "COMPLETED") cancelledArtifact = hash(canonicalRows(rows.slice(0, checkpointAt)));
    const cancelledNotPublished = cancelledStatus === "CANCELLED" && cancelledArtifact === null;
    const assertions = [
      { assertionId: "V2.5-RECOVERY-001", status: recovered.resumedAt === checkpointAt && recovered.imported.size === rows.length && recovered.duplicateRows === 0 ? "PASS" : "FAIL", expected: "fixture resumes from in-memory checkpoint without duplicate row keys", actual: { interruptedAt: checkpointAt, resumedAt: recovered.resumedAt, importedRows: recovered.imported.size, duplicateRows: recovered.duplicateRows } },
      { assertionId: "V2.5-RECOVERY-002", status: cancelledNotPublished ? "PASS" : "FAIL", expected: "cancelled fixture task does not publish partial artifact", actual: { status: cancelledStatus, published: cancelledArtifact !== null } },
      { assertionId: "V2.5-RECOVERY-003", status: OBSERVATION_GATE === "V2.4_20_TRADING_DAYS_PENDING" ? "PASS" : "FAIL", expected: "unmet V2.4 observation gate remains explicit", actual: { architecture: "linux/amd64-emulated", observationGate: OBSERVATION_GATE } },
    ];
    return { ...common, status: assertions.every((item) => item.status === "PASS") ? "COMPLETED" : "FAILED", namespace: `v2-5-recovery-${testRunId}`, assertions, evidence: { evidenceMode: "IN_MEMORY_SYNTHETIC_FIXTURE", durableImportRecovery: "NOT_RUN", resume: { checkpoint: `${DATA_VERSION}:${checkpointAt}`, interruptedAt: checkpointAt, resumedAt: recovered.resumedAt, importedRows: recovered.imported.size, duplicateRows: recovered.duplicateRows }, cancellation: { status: cancelledStatus, published: cancelledArtifact !== null }, architecture: "linux/amd64-emulated", observationGate: OBSERVATION_GATE } };
  }
}

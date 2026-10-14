import { createHash, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresStageRunRepository } from "../../src/adapters/postgres-stage-run-repository.js";
import { projectV14RunArtifactRefs, verifyV14ReportPayload } from "../../src/application/v14-report-artifact-ref.js";

const connectionString = process.env.PLATFORM_API_TEST_DATABASE_URL;
if (connectionString && decodeURIComponent(new URL(connectionString).pathname.slice(1)) !== "platform_api_test") throw new Error("PLATFORM_API_TEST_DATABASE_URL must target platform_api_test");
const run = connectionString ? describe : describe.skip;

run("PostgreSQL V1.4 report publication fencing", () => {
  const pool = new Pool({ connectionString });
  const repository = new PostgresStageRunRepository(pool);
  const ownerId = `v14-report-${randomUUID()}`;
  const cancelledRunId = randomUUID();
  const completedRunId = randomUUID();
  const concurrentRunId = randomUUID();
  const reportContent = (testRunId: string) => ({ testRunId, status: "COMPLETED", assertions: [{ assertionId: "V1.4-BT-REPORT-002", status: "PASS" }] });
  const canonical = (value: unknown): string => Array.isArray(value) ? `[${value.map(canonical).join(",")}]` : value && typeof value === "object" ? `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(",")}}` : JSON.stringify(value);
  const payload = (testRunId: string) => {
    const content = reportContent(testRunId);
    const resultSha256 = createHash("sha256").update(canonical(content)).digest("hex");
    return { ...content, durableReport: { resultSha256, manifestSha256: "a".repeat(64) } };
  };
  const runningRun = (testRunId: string) => ({
    testRunId, stageId: "V1.4" as const, scenarioId: "normal", scenarioVersion: "1.1.0", ownerId,
    namespace: `v1-4-normal-${testRunId}`, status: "RUNNING" as const, seed: 20260907, assertions: [],
    evidence: { v14Task: { phase: "RUNNING_QUANT", cancelRequested: false } },
  });

  beforeAll(async () => { await repository.migrate(); });
  afterAll(async () => {
    for (const testRunId of [cancelledRunId, completedRunId, concurrentRunId]) await pool.query("DELETE FROM acceptance_stage_run_history WHERE test_run_id=$1 AND owner_id=$2", [testRunId, ownerId]);
    await pool.query("DELETE FROM acceptance_stage_runs WHERE test_run_id = ANY($1::uuid[]) AND owner_id=$2", [[cancelledRunId, completedRunId, concurrentRunId], ownerId]);
    await pool.end();
  });

  it("cancellation wins the row lock and suppresses a completed report publication", async () => {
    await repository.save(runningRun(cancelledRunId));
    const cancellation = await repository.requestV14Cancellation(cancelledRunId, ownerId);
    expect(cancellation.evidence.v14Task).toMatchObject({ cancelRequested: true });
    await expect(repository.updateV14Progress(cancelledRunId, ownerId, { phase: "PUBLISHING_REPORT" })).resolves.toBe(false);
    await expect(repository.finishV14Run(cancelledRunId, ownerId, "COMPLETED", reportContent(cancelledRunId).assertions, { v14Task: { phase: "COMPLETED" }, reportPayload: payload(cancelledRunId) })).rejects.toThrow("cannot be completed");
    const cancelled = await repository.finishV14Run(cancelledRunId, ownerId, "CANCELLED", [{ assertionId: "V1.4-TASK-CANCEL-001", status: "PASS" }], { v14Task: { phase: "CANCELLED", cancelRequested: true } });
    expect(cancelled.status).toBe("CANCELLED");
    expect(projectV14RunArtifactRefs(cancelled)).toEqual([]);
    expect(await repository.find(cancelledRunId, "another-owner")).toBeNull();
  });

  it("completed report publication wins the row lock and rejects a later cancellation", async () => {
    await repository.save(runningRun(completedRunId));
    const published = await repository.finishV14Run(completedRunId, ownerId, "COMPLETED", reportContent(completedRunId).assertions, { v14Task: { phase: "COMPLETED", cancelRequested: false }, reportPayload: payload(completedRunId) });
    await expect(repository.requestV14Cancellation(completedRunId, ownerId)).rejects.toThrow("no longer cancellable");
    const refs = projectV14RunArtifactRefs(published);
    expect(refs).toHaveLength(1);
    expect(refs[0]).toMatchObject({ testRunId: completedRunId, ownerId, kind: "BACKTEST_REPORT", status: "PUBLISHED" });
    const verified = verifyV14ReportPayload(published, refs[0]!.artifactId);
    expect(verified).not.toBeNull();
    expect(createHash("sha256").update(canonical(verified!.payload)).digest("hex")).toBe(refs[0]!.sha256);
  });

  it("serializes simultaneous cancellation and completed-report publication under PostgreSQL row-lock contention", async () => {
    await repository.save(runningRun(concurrentRunId));
    const blocker = await pool.connect();
    try {
      await blocker.query("BEGIN");
      await blocker.query("SELECT test_run_id FROM acceptance_stage_runs WHERE test_run_id=$1 AND owner_id=$2 FOR UPDATE", [concurrentRunId, ownerId]);

      const completion = repository.finishV14Run(concurrentRunId, ownerId, "COMPLETED", reportContent(concurrentRunId).assertions, { v14Task: { phase: "COMPLETED", cancelRequested: false }, reportPayload: payload(concurrentRunId) });
      const cancellation = repository.requestV14Cancellation(concurrentRunId, ownerId);
      const deadline = Date.now() + 5000;
      let waitingContenders = 0;
      while (Date.now() < deadline) {
        const result = await pool.query<{ count: string }>(`SELECT count(*)::text AS count
          FROM pg_stat_activity
          WHERE datname=current_database() AND wait_event_type='Lock'
            AND query LIKE '%acceptance_stage_runs%' AND query LIKE '%FOR UPDATE%'`);
        waitingContenders = Number(result.rows[0]?.count ?? 0);
        if (waitingContenders >= 2) break;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      expect(waitingContenders).toBeGreaterThanOrEqual(2);
      await blocker.query("COMMIT");

      const [finished, cancelled] = await Promise.allSettled([completion, cancellation]);
      const finalRun = await repository.find(concurrentRunId, ownerId);
      expect(finalRun).not.toBeNull();
      expect(["COMPLETED", "RUNNING"]).toContain(finalRun!.status);
      if (finalRun!.status === "COMPLETED") {
        expect(finished.status).toBe("fulfilled");
        expect(cancelled.status).toBe("rejected");
        if (cancelled.status === "rejected") expect(String(cancelled.reason)).toContain("no longer cancellable");
        const refs = projectV14RunArtifactRefs(finalRun!);
        expect(refs).toHaveLength(1);
        expect(refs[0]).toMatchObject({ testRunId: concurrentRunId, ownerId, kind: "BACKTEST_REPORT", status: "PUBLISHED" });
        expect(verifyV14ReportPayload(finalRun!, refs[0]!.artifactId)).not.toBeNull();
      } else {
        expect(finished.status).toBe("rejected");
        if (finished.status === "rejected") expect(String(finished.reason)).toContain("cannot be completed");
        expect(cancelled.status).toBe("fulfilled");
        expect(finalRun!.evidence.v14Task).toMatchObject({ cancelRequested: true });
        expect(projectV14RunArtifactRefs(finalRun!)).toEqual([]);
        await repository.finishV14Run(concurrentRunId, ownerId, "CANCELLED", [{ assertionId: "V1.4-TASK-CANCEL-001", status: "PASS" }], { v14Task: { phase: "CANCELLED", cancelRequested: true } });
        expect(await repository.find(concurrentRunId, ownerId)).toMatchObject({ status: "CANCELLED" });
        expect(projectV14RunArtifactRefs((await repository.find(concurrentRunId, ownerId))!)).toEqual([]);
      }
    } finally {
      await blocker.query("ROLLBACK").catch(() => undefined);
      blocker.release();
    }
  });
});

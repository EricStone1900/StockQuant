import { randomUUID } from "node:crypto";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresStageRunRepository } from "../../src/adapters/postgres-stage-run-repository.js";
import { cancelV33ReadinessRun, V33_READINESS_CANCEL_COMMAND } from "../../src/application/v33-readiness-cancellation.js";
import { PlatformContainer, V33AcceptanceController } from "../../src/bootstrap/app.module.js";

const connectionString = process.env.PLATFORM_API_TEST_DATABASE_URL;
if (connectionString && decodeURIComponent(new URL(connectionString).pathname.slice(1)) !== "platform_api_test") throw new Error("PLATFORM_API_TEST_DATABASE_URL must target platform_api_test");
const run = connectionString ? describe : describe.skip;

run("PostgreSQL V3.3 readiness TestRun persistence", () => {
  const pool = new Pool({ connectionString });
  const repository = new PostgresStageRunRepository(pool);
  const testRunId = randomUUID();
  const transitionRunId = randomUUID();
  const cancelRunId = randomUUID();
  const httpCancelRunId = randomUUID();
  const dispatchedRunId = randomUUID();
  const ownerId = process.env.STOCKQUANT_LOCAL_DEVELOPMENT_USER ?? "acceptance-owner-1";
  const container = { stageRuns: repository, schedulerClock: { now: () => new Date("2026-10-06T01:00:00.000Z") } } as unknown as PlatformContainer;
  class V33CancellationHttpTestModule {}
  Module({ controllers: [V33AcceptanceController], providers: [{ provide: PlatformContainer, useValue: container }] })(V33CancellationHttpTestModule);
  let app: Awaited<ReturnType<typeof NestFactory.create>>;
  let baseUrl = "";

  beforeAll(async () => {
    await repository.migrate();
    app = await NestFactory.create(V33CancellationHttpTestModule, { logger: false });
    await app.listen(0, "127.0.0.1");
    const address = app.getHttpServer().address();
    if (!address || typeof address === "string") throw new Error("test HTTP server did not bind a TCP port");
    baseUrl = `http://127.0.0.1:${address.port}`;
  });
  afterAll(async () => {
    await app?.close();
    await pool.query("DELETE FROM acceptance_stage_run_history WHERE test_run_id=$1 AND owner_id=$2", [testRunId, ownerId]);
    await pool.query("DELETE FROM acceptance_stage_runs WHERE test_run_id=$1 AND stage_id='V3.3' AND owner_id=$2", [testRunId, ownerId]);
    await pool.query("DELETE FROM acceptance_stage_run_history WHERE test_run_id=$1 AND owner_id=$2", [transitionRunId, ownerId]);
    await pool.query("DELETE FROM acceptance_stage_runs WHERE test_run_id=$1 AND stage_id='V3.3' AND owner_id=$2", [transitionRunId, ownerId]);
    await pool.query("DELETE FROM acceptance_stage_run_history WHERE test_run_id=$1 AND owner_id=$2", [cancelRunId, ownerId]);
    await pool.query("DELETE FROM acceptance_stage_runs WHERE test_run_id=$1 AND stage_id='V3.3' AND owner_id=$2", [cancelRunId, ownerId]);
    await pool.query("DELETE FROM acceptance_stage_run_history WHERE test_run_id=$1 AND owner_id=$2", [httpCancelRunId, ownerId]);
    await pool.query("DELETE FROM acceptance_stage_runs WHERE test_run_id=$1 AND stage_id='V3.3' AND owner_id=$2", [httpCancelRunId, ownerId]);
    await pool.query("DELETE FROM acceptance_stage_run_history WHERE test_run_id=$1 AND owner_id=$2", [dispatchedRunId, ownerId]);
    await pool.query("DELETE FROM acceptance_stage_runs WHERE test_run_id=$1 AND stage_id='V3.3' AND owner_id=$2", [dispatchedRunId, ownerId]);
    await pool.end();
  });

  it("persists WAITING and NOT_RUN evidence under one owner with an idempotent read", async () => {
    const initial = await repository.save({
      testRunId, stageId: "V3.3", scenarioId: "recovery", scenarioVersion: "v3.3-readiness-v1", ownerId,
      status: "WAITING", seed: 20260907,
      assertions: [{ id: "V3.1_ACCEPTANCE", status: "NOT_RUN", reason: "not verified" }],
      evidence: { readiness: "WAITING", workflowStep: "TEST_RUN_BUDGET_BOUND", runnerDispatch: "NOT_PERFORMED", runnerJobsCreated: 0, externalModelCalls: 0 },
    });
    expect(initial).toMatchObject({ testRunId, stageId: "V3.3", status: "WAITING", seed: 20260907 });
    await expect(repository.save({ ...initial, status: "RUNNING", assertions: [{ id: "spoofed", status: "PASS" }] })).rejects.toThrow("must use transitionV33Workflow");
    await expect(repository.save({ ...initial, evidence: { readiness: "ALTERED" } })).rejects.toThrow("terminal evidence conflicts");
    await expect(repository.find(testRunId, ownerId)).resolves.toMatchObject({ status: "WAITING", evidence: { runnerJobsCreated: 0 } });
    await expect(repository.find(testRunId, "different-owner")).resolves.toBeNull();
    await expect(repository.save(initial)).resolves.toMatchObject({ status: "WAITING", evidence: { runnerJobsCreated: 0 } });
    await expect(repository.find(testRunId, ownerId)).resolves.toMatchObject({ status: "WAITING", assertions: [{ status: "NOT_RUN" }] });
  });

  it("records each V3.3 state transition, supports exact retry, and prevents terminal resurrection", async () => {
    await repository.save({
      testRunId: transitionRunId, stageId: "V3.3", scenarioId: "recovery", scenarioVersion: "v3.3-readiness-v1", ownerId,
      status: "WAITING", seed: 20260907, assertions: [{ id: "dispatch", status: "NOT_RUN" }], evidence: { dispatch: "NOT_PERFORMED" },
    });
    const running = {
      testRunId: transitionRunId, ownerId, expectedStatus: "WAITING" as const, status: "RUNNING" as const,
      assertions: [{ id: "dispatch", status: "RUNNING" }], evidence: { runnerJobIds: ["job-1"] },
    };
    await expect(repository.transitionV33Workflow(running)).resolves.toMatchObject({ status: "RUNNING", evidence: { runnerJobIds: ["job-1"] } });
    // A lost HTTP response may cause an exact retry after the state has committed.
    await expect(repository.transitionV33Workflow(running)).resolves.toMatchObject({ status: "RUNNING", evidence: { runnerJobIds: ["job-1"] } });
    await expect(repository.listRunHistory(transitionRunId, ownerId)).resolves.toHaveLength(1);

    const queued = {
      testRunId: transitionRunId, ownerId, expectedStatus: "RUNNING" as const, status: "QUEUED" as const,
      assertions: [{ id: "dispatch", status: "PENDING" }], evidence: { recovery: { checkpointRef: "checkpoint-1", resumed: true } },
    };
    await expect(repository.transitionV33Workflow(queued)).resolves.toMatchObject({ status: "QUEUED", evidence: queued.evidence });
    await expect(repository.listRunHistory(transitionRunId, ownerId)).resolves.toMatchObject([
      { status: "WAITING", evidence: { dispatch: "NOT_PERFORMED" } },
      { status: "RUNNING", evidence: { runnerJobIds: ["job-1"] } },
    ]);

    const resumed = {
      testRunId: transitionRunId, ownerId, expectedStatus: "QUEUED" as const, status: "RUNNING" as const,
      assertions: [{ id: "dispatch", status: "RUNNING" }], evidence: { runnerJobIds: ["job-2"], resumedFrom: "checkpoint-1" },
    };
    await expect(repository.transitionV33Workflow(resumed)).resolves.toMatchObject({ status: "RUNNING", evidence: resumed.evidence });

    const completed = {
      testRunId: transitionRunId, ownerId, expectedStatus: "RUNNING" as const, status: "COMPLETED" as const,
      assertions: ["V3.1_ACCEPTANCE", "V3.2_EXACT_VERSION", "PAPER_CONTINUITY", "V3.3_EXECUTOR"].map((id) => ({ id, status: "PASS" })),
      evidence: { businessWorkflow: "COMPLETED", paperContinuity: "VERIFIED", stageBudgetControl: "TEST_RUN_AND_ROUND_CAP_ENFORCED", experimentIds: ["experiment-1"], runnerJobIds: ["job-1"], expectedRounds: 2, completedRounds: 2, outputs: [{ sha256: "a".repeat(64) }] },
    };
    await expect(repository.transitionV33Workflow({ ...completed, assertions: [{ id: "V3.3_EXECUTOR", status: "PASS" }] })).rejects.toThrow("completion requires PASS evidence");
    await expect(repository.find(transitionRunId, ownerId)).resolves.toMatchObject({ status: "RUNNING" });
    await expect(repository.transitionV33Workflow(completed)).resolves.toMatchObject({ status: "COMPLETED", completedAt: expect.any(String) });
    await expect(repository.transitionV33Workflow({ ...completed, expectedStatus: "COMPLETED", status: "RUNNING" })).rejects.toThrow("transition is not allowed");
    await expect(repository.find(transitionRunId, "different-owner")).resolves.toBeNull();
  });

  it("persists a readiness-only cancellation and exact replay without touching Runner jobs", async () => {
    const waiting = await repository.save({
      testRunId: cancelRunId, stageId: "V3.3", scenarioId: "recovery", scenarioVersion: "v3.3-readiness-v1", ownerId,
      status: "WAITING", seed: 20260907, assertions: [{ id: "V3.3_EXECUTOR", status: "NOT_RUN" }],
      evidence: { readiness: "WAITING", workflowStep: "TEST_RUN_BUDGET_BOUND", runnerDispatch: "NOT_PERFORMED", runnerJobsCreated: 0, externalModelCalls: 0 },
    });
    const decision = cancelV33ReadinessRun(waiting, V33_READINESS_CANCEL_COMMAND, "2026-10-06T01:00:00.000Z");
    if ("error" in decision) throw new Error(decision.error);
    const cancelled = await repository.transitionV33Workflow({
      testRunId: cancelRunId, ownerId, expectedStatus: "WAITING", status: "CANCELLED",
      assertions: decision.assertions, evidence: decision.evidence,
    });
    expect(cancelled).toMatchObject({ status: "CANCELLED", evidence: { readiness: "CANCELLED", runnerDispatch: "NOT_PERFORMED", runnerJobsCreated: 0, cancellation: { scope: "READINESS_ONLY", runnerJobsCancelled: 0 } } });
    expect(cancelV33ReadinessRun(cancelled, V33_READINESS_CANCEL_COMMAND, "2026-10-06T02:00:00.000Z")).toMatchObject({ status: "CANCELLED", idempotent: true });
    await expect(repository.listRunHistory(cancelRunId, ownerId)).resolves.toHaveLength(1);
  });

  it("serves owner-scoped cancellation over HTTP and refuses cancellation after dispatch", async () => {
    await repository.save({
      testRunId: httpCancelRunId, stageId: "V3.3", scenarioId: "recovery", scenarioVersion: "v3.3-readiness-v1", ownerId,
      status: "WAITING", seed: 20260907, assertions: [{ id: "V3.3_EXECUTOR", status: "NOT_RUN" }],
      evidence: { readiness: "WAITING", workflowStep: "TEST_RUN_BUDGET_BOUND", runnerDispatch: "NOT_PERFORMED", runnerJobsCreated: 0, externalModelCalls: 0 },
    });
    const path = `${baseUrl}/api/v1/acceptance/v3/v3.3/runs/${httpCancelRunId}/cancel`;
    const command = { method: "POST", headers: { cookie: `sq_session=${ownerId}`, "content-type": "application/json" }, body: JSON.stringify({ confirmation: V33_READINESS_CANCEL_COMMAND }) };
    const anonymous = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: command.body });
    expect(anonymous.status).toBe(401);
    const otherOwner = await fetch(path, { ...command, headers: { ...command.headers, cookie: "sq_session=different-owner" } });
    expect(otherOwner.status).toBe(403);
    const wrongConfirmation = await fetch(path, { ...command, body: JSON.stringify({ confirmation: "CANCEL_ANY_RUN" }) });
    expect(wrongConfirmation.status).toBe(422);

    const cancelled = await fetch(path, command);
    expect(cancelled.status).toBe(201);
    expect(await cancelled.json()).toMatchObject({ testRunId: httpCancelRunId, stageId: "V3.3", status: "CANCELLED", idempotent: false, evidence: { readiness: "CANCELLED", runnerJobsCreated: 0, cancellation: { scope: "READINESS_ONLY", runnerJobsCancelled: 0 } } });
    const replayed = await fetch(path, command);
    expect(replayed.status).toBe(201);
    expect(await replayed.json()).toMatchObject({ status: "CANCELLED", idempotent: true });
    await expect(repository.listRunHistory(httpCancelRunId, ownerId)).resolves.toHaveLength(1);

    await repository.save({
      testRunId: dispatchedRunId, stageId: "V3.3", scenarioId: "normal", scenarioVersion: "v3.3-readiness-v1", ownerId,
      status: "WAITING", seed: 20260907, assertions: [{ id: "V3.3_EXECUTOR", status: "NOT_RUN" }],
      evidence: { readiness: "WAITING", runnerDispatch: "SUBMITTED", runnerJobsCreated: 1, externalModelCalls: 0 },
    });
    const dispatchedCancel = await fetch(`${baseUrl}/api/v1/acceptance/v3/v3.3/runs/${dispatchedRunId}/cancel`, command);
    expect(dispatchedCancel.status).toBe(409);
    await expect(repository.find(dispatchedRunId, ownerId)).resolves.toMatchObject({ status: "WAITING", evidence: { runnerDispatch: "SUBMITTED", runnerJobsCreated: 1 } });
  });
});

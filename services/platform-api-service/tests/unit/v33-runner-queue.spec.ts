import { afterEach, describe, expect, it, vi } from "vitest";
import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import { V33AcceptanceController } from "../../src/bootstrap/app.module.js";

describe("V3.3 owner-scoped Research queue proxy", () => {
  const platformToken = "p".repeat(40);
  afterEach(() => vi.restoreAllMocks());

  it("persists an explicit WAITING readiness TestRun without creating jobs or calling services", async () => {
    const testRunId = "b1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
    const stored = { testRunId, stageId: "V3.3", scenarioId: "normal", scenarioVersion: "v3.3-readiness-v1", ownerId: "acceptance-owner-1", status: "WAITING", seed: 20260907, assertions: [{ id: "V3.3_EXECUTOR", status: "NOT_RUN" }], evidence: { readiness: "WAITING", runnerDispatch: "NOT_PERFORMED", runnerJobsCreated: 0, externalModelCalls: 0 } };
    const container = { stageRuns: { newId: vi.fn(() => testRunId), save: vi.fn(async () => stored), find: vi.fn(async () => stored) } };
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const controller = new V33AcceptanceController(container as never);
    const created = await controller.createReadinessRun("sq_session=acceptance-owner-1", undefined, { scenarioId: "normal", seed: 20260907 });
    expect(created).toMatchObject({ accepted: true, testRunId, status: "WAITING", evidence: { runnerDispatch: "NOT_PERFORMED", runnerJobsCreated: 0, externalModelCalls: 0 } });
    expect(container.stageRuns.save).toHaveBeenCalledWith(expect.objectContaining({ testRunId, stageId: "V3.3", status: "WAITING", assertions: expect.arrayContaining([expect.objectContaining({ status: "NOT_RUN" })]) }));
    await expect(controller.getReadinessRun("sq_session=acceptance-owner-1", undefined, testRunId)).resolves.toMatchObject({ status: "WAITING" });
    container.stageRuns.find.mockResolvedValueOnce(null as never);
    await expect(controller.getReadinessRun("sq_session=acceptance-owner-1", undefined, testRunId)).rejects.toBeInstanceOf(NotFoundException);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects malformed scenario requests before storing a readiness run", async () => {
    const container = { stageRuns: { newId: vi.fn(), save: vi.fn() } };
    const controller = new V33AcceptanceController(container as never);
    await expect(controller.createReadinessRun("sq_session=acceptance-owner-1", undefined, { scenarioId: "normal", seed: -1 })).rejects.toThrow("seed must be an integer");
    await expect(controller.createReadinessRun("sq_session=acceptance-owner-1", undefined, { scenarioId: "normal", dispatch: true })).rejects.toThrow("only scenarioId, seed");
    expect(container.stageRuns.save).not.toHaveBeenCalled();
  });

  it("verifies exact owner-scoped V3.1 and V3.2 references while retaining runtime blockers", async () => {
    const sourceId = "b1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
    const promotionId = "c1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
    const run = { testRunId: sourceId, stageId: "V3.1", scenarioId: "normal" };
    const container = {
      stageRuns: { newId: vi.fn(() => "d1205560-6ca0-4d6c-b3d5-d292dae4a8dd"), find: vi.fn(async () => run), getV31PromotionGate: vi.fn(async () => ({ stageStatus: "PASS", humanAcceptance: "ACCEPTED", evidenceSha256: "a".repeat(64) })), save: vi.fn(async (value) => value) },
      quantResearchHeaders: vi.fn(() => ({ authorization: "Bearer " + "p".repeat(40) })),
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ schemaVersion: "v3.2-promotion-request-detail-v1", promotionRequestId: promotionId, request: { testRunId: sourceId }, status: "CANDIDATE_APPROVED", decision: { decision: "APPROVE", registryStatus: "CANDIDATE_APPROVED", activation: "DISABLED_UNTIL_MANDATE", versionFingerprint: "b".repeat(64) } }), { status: 200 }));
    const controller = new V33AcceptanceController(container as never);
    const result = await controller.createReadinessRun("sq_session=acceptance-owner-1", undefined, { scenarioId: "normal", sourceV31TestRunId: sourceId, promotionRequestId: promotionId }) as { evidence: { blockers: Array<{ id: string; status: string }>; runnerJobsCreated: number } };
    expect(result.evidence.blockers).toEqual(expect.arrayContaining([expect.objectContaining({ id: "V3.1_ACCEPTANCE", status: "VERIFIED" }), expect.objectContaining({ id: "V3.2_EXACT_VERSION", status: "VERIFIED" }), expect.objectContaining({ id: "PAPER_CONTINUITY", status: "NOT_VERIFIED" }), expect.objectContaining({ id: "V3.3_EXECUTOR", status: "NOT_IMPLEMENTED" })]));
    expect(result.evidence.runnerJobsCreated).toBe(0);
    expect(container.stageRuns.getV31PromotionGate).toHaveBeenCalledWith(sourceId);
  });

  it("rejects a PromotionRequest bound to a different exact source run", async () => {
    const sourceId = "b1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
    const promotionId = "c1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
    const container = { stageRuns: { newId: vi.fn(), find: vi.fn(async () => ({ testRunId: sourceId, stageId: "V3.1", scenarioId: "normal" })), getV31PromotionGate: vi.fn(async () => ({ stageStatus: "PASS", humanAcceptance: "ACCEPTED" })), save: vi.fn() }, quantResearchHeaders: vi.fn(() => ({})) };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ schemaVersion: "v3.2-promotion-request-detail-v1", promotionRequestId: promotionId, request: { testRunId: "e1205560-6ca0-4d6c-b3d5-d292dae4a8dd" }, status: "AWAITING_REVIEW", decision: null }), { status: 200 }));
    const controller = new V33AcceptanceController(container as never);
    await expect(controller.createReadinessRun("sq_session=acceptance-owner-1", undefined, { scenarioId: "normal", sourceV31TestRunId: sourceId, promotionRequestId: promotionId })).rejects.toThrow("bound to a different V3.1 source run");
    expect(container.stageRuns.save).not.toHaveBeenCalled();
  });

  it("requires a session-owned V3.3 run and forwards bounded pagination with Platform identity", async () => {
    const testRunId = "b1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
    const container = {
      stageRuns: { find: vi.fn(async () => ({ testRunId, stageId: "V3.3" })) },
      researchAutomationUrl: "http://research.local",
      portfolioToken: platformToken,
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ schemaVersion: "v3.3-runner-queue-v1", testRunId, offset: 0, limit: 10, jobs: [], hasMore: false }), { status: 200 }));
    const controller = new V33AcceptanceController(container as never);

    await expect(controller.runnerQueue("sq_session=acceptance-owner-1", undefined, testRunId, "0", "10"))
      .resolves.toMatchObject({ schemaVersion: "v3.3-runner-queue-v1", testRunId, jobs: [] });
    expect(fetchSpy.mock.calls[0]?.[0]?.toString()).toBe(`http://research.local/v1/runner/jobs?testRunId=${testRunId}&offset=0&limit=10`);
    expect(fetchSpy.mock.calls[0]?.[1]?.headers).toMatchObject({ "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${platformToken}` });

    await expect(controller.runnerQueue(undefined, undefined, testRunId)).rejects.toBeInstanceOf(UnauthorizedException);
    container.stageRuns.find.mockResolvedValueOnce(null as never);
    await expect(controller.runnerQueue("sq_session=acceptance-owner-1", undefined, testRunId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects unbounded or malformed pagination before making an upstream request", async () => {
    const container = { stageRuns: { find: vi.fn() }, researchAutomationUrl: "http://research.local", portfolioToken: platformToken };
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const controller = new V33AcceptanceController(container as never);
    await expect(controller.runnerQueue("sq_session=acceptance-owner-1", undefined, "b1205560-6ca0-4d6c-b3d5-d292dae4a8dd", undefined, "101")).rejects.toThrow("limit must be between 1 and 100");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(container.stageRuns.find).not.toHaveBeenCalled();
  });

  it("reads budget evidence only after validating the owner's V3.3 run", async () => {
    const testRunId = "b1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
    const container = {
      stageRuns: { find: vi.fn(async () => ({ testRunId, stageId: "V3.3" })) },
      researchAutomationUrl: "http://research.local",
      portfolioToken: platformToken,
    };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ schemaVersion: "v3.3-runner-budget-v1", testRunId, offset: 0, limit: 10, rows: [], hasMore: false }), { status: 200 }));
    const controller = new V33AcceptanceController(container as never);
    await expect(controller.runnerBudget("sq_session=acceptance-owner-1", undefined, testRunId, "0", "10"))
      .resolves.toMatchObject({ schemaVersion: "v3.3-runner-budget-v1", rows: [] });
    expect(fetchSpy.mock.calls[0]?.[0]?.toString()).toBe(`http://research.local/v1/runner/budgets?testRunId=${testRunId}&offset=0&limit=10`);
    container.stageRuns.find.mockResolvedValueOnce(null as never);
    await expect(controller.runnerBudget("sq_session=acceptance-owner-1", undefined, testRunId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects an upstream budget response for a different run or page", async () => {
    const testRunId = "b1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
    const container = { stageRuns: { find: vi.fn(async () => ({ testRunId, stageId: "V3.3" })) }, researchAutomationUrl: "http://research.local", portfolioToken: platformToken };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ schemaVersion: "v3.3-runner-budget-v1", testRunId: "123e4567-e89b-42d3-a456-426614174000", offset: 0, limit: 10 }), { status: 200 }));
    const controller = new V33AcceptanceController(container as never);
    await expect(controller.runnerBudget("sq_session=acceptance-owner-1", undefined, testRunId, "0", "10")).rejects.toThrow("does not match the scoped request");
  });

  it("reads a keyset queue page only after the owner's exact V3.3 run check", async () => {
    const testRunId = "b1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
    const cursor = Buffer.from(JSON.stringify({ submittedAt: "2026-09-27T00:00:00.000Z", jobId: "job-a" })).toString("base64url");
    const container = { stageRuns: { find: vi.fn(async () => ({ testRunId, stageId: "V3.3" })) }, researchAutomationUrl: "http://research.local", portfolioToken: platformToken };
    const payload = { schemaVersion: "v3.3-runner-cursor-queue-v1", testRunId, afterCursor: cursor, limit: 25, jobs: [], hasMore: false, nextAfterCursor: null };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }));
    const controller = new V33AcceptanceController(container as never);
    await expect(controller.runnerQueueCursor("sq_session=acceptance-owner-1", undefined, testRunId, cursor, "25")).resolves.toEqual(payload);
    expect(fetchSpy.mock.calls[0]?.[0]?.toString()).toBe(`http://research.local/v1/runner/jobs/cursor?testRunId=${testRunId}&afterCursor=${cursor}&limit=25`);
    container.stageRuns.find.mockResolvedValueOnce(null as never);
    await expect(controller.runnerQueueCursor("sq_session=acceptance-owner-1", undefined, testRunId)).rejects.toBeInstanceOf(NotFoundException);
    await expect(controller.runnerQueueCursor("sq_session=acceptance-owner-1", undefined, testRunId, undefined, "101")).rejects.toThrow("limit must be between 1 and 100");
  });
});

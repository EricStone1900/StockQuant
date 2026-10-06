import { afterEach, describe, expect, it, vi } from "vitest";
import { ForbiddenException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { V32AcceptanceController } from "../../src/bootstrap/app.module.js";

describe("V3.2 owner-scoped readiness TestRuns", () => {
  afterEach(() => vi.restoreAllMocks());

  it("persists an explicit WAITING run with no candidate, Registry, or Paper side effects", async () => {
    const testRunId = "b1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
    const stored = { testRunId, stageId: "V3.2", scenarioId: "normal", scenarioVersion: "v3.2-readiness-v1", ownerId: "acceptance-owner-1", status: "WAITING", seed: 20260907, assertions: [{ id: "V3.2_BUSINESS_WORKFLOW", status: "NOT_RUN" }], evidence: { readiness: "WAITING", sourceMode: "READINESS_ONLY", candidateExecution: "NOT_PERFORMED", registryMutation: "NOT_PERFORMED", paperCalls: 0, businessValidation: "NOT_RUN", humanAcceptance: "NOT_RUN" } };
    const container = { stageRuns: { newId: vi.fn(() => testRunId), save: vi.fn(async () => stored), find: vi.fn(async () => stored), getV31PromotionGate: vi.fn() } };
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const controller = new V32AcceptanceController(container as never);

    const created = await controller.createReadinessRun("sq_session=acceptance-owner-1", undefined, { scenarioId: "normal", seed: 20260907 });

    expect(created).toMatchObject({ accepted: true, testRunId, stageId: "V3.2", status: "WAITING", evidence: { sourceMode: "READINESS_ONLY", candidateExecution: "NOT_PERFORMED", registryMutation: "NOT_PERFORMED", paperCalls: 0, businessValidation: "NOT_RUN", humanAcceptance: "NOT_RUN" } });
    expect(container.stageRuns.save).toHaveBeenCalledWith(expect.objectContaining({ testRunId, stageId: "V3.2", scenarioVersion: "v3.2-readiness-v1", status: "WAITING", assertions: expect.arrayContaining([expect.objectContaining({ status: "NOT_RUN" })]) }));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("validates scenario, seed and an optional owner-scoped V3.1 source", async () => {
    const container = { stageRuns: { newId: vi.fn(), save: vi.fn(), find: vi.fn(async () => null), getV31PromotionGate: vi.fn() } };
    const controller = new V32AcceptanceController(container as never);
    await expect(controller.createReadinessRun("sq_session=acceptance-owner-1", undefined, { scenarioId: "unknown" })).rejects.toThrow("scenarioId must be");
    await expect(controller.createReadinessRun("sq_session=acceptance-owner-1", undefined, { scenarioId: "normal", seed: -1 })).rejects.toThrow("seed must be");
    await expect(controller.createReadinessRun("sq_session=acceptance-owner-1", undefined, { scenarioId: "normal", dispatch: true })).rejects.toThrow("only scenarioId");
    await expect(controller.createReadinessRun("sq_session=acceptance-owner-1", undefined, { scenarioId: "normal", sourceV31TestRunId: "not-a-uuid" })).rejects.toThrow("sourceV31TestRunId must be a UUID");
    await expect(controller.createReadinessRun("sq_session=acceptance-owner-1", undefined, { scenarioId: "normal", sourceV31TestRunId: "b1205560-6ca0-4d6c-b3d5-d292dae4a8dd" })).rejects.toBeInstanceOf(NotFoundException);
    await expect(controller.createReadinessRun(undefined, undefined, { scenarioId: "normal" })).rejects.toBeInstanceOf(UnauthorizedException);
    expect(container.stageRuns.save).not.toHaveBeenCalled();
  });

  it("requires the same owner and V3.2 stage to read a run", async () => {
    const testRunId = "b1205560-6ca0-4d6c-b3d5-d292dae4a8dd";
    const stored = { testRunId, stageId: "V3.2", scenarioId: "normal", scenarioVersion: "v3.2-readiness-v1", status: "WAITING" };
    const container = { stageRuns: { find: vi.fn(async () => stored) } };
    const controller = new V32AcceptanceController(container as never);
    await expect(controller.getReadinessRun("sq_session=acceptance-owner-1", undefined, testRunId)).resolves.toMatchObject({ testRunId, stageId: "V3.2", status: "WAITING" });
    await expect(controller.getReadinessRun("sq_session=acceptance-owner-2", undefined, testRunId)).rejects.toBeInstanceOf(ForbiddenException);
    container.stageRuns.find.mockResolvedValueOnce({ ...stored, stageId: "V3.3" } as never);
    await expect(controller.getReadinessRun("sq_session=acceptance-owner-1", undefined, testRunId)).rejects.toBeInstanceOf(NotFoundException);
    await expect(controller.getReadinessRun(undefined, undefined, testRunId)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});

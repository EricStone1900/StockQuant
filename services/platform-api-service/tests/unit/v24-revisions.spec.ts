import { afterEach, describe, expect, it, vi } from "vitest";
import { V24AcceptanceController } from "../../src/bootstrap/app.module.js";

describe("V2.4 observation revision access", () => {
  afterEach(() => vi.restoreAllMocks());

  it("persists V2.4 scenario checks as WAITING without fetching or inventing Paper evidence", async () => {
    const save = vi.fn(async (value: any) => value);
    const controller = new V24AcceptanceController({
      scheduler: {},
      stageRuns: { save },
      v24Observation: { listRunRevisions: vi.fn(), listObservationsForOwner: vi.fn() }
    } as any);
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    expect(() => controller.preview(undefined, undefined)).toThrow("local session is required");
    await expect(controller.create(undefined, undefined, { scenarioId: "normal" })).rejects.toThrow("local session is required");
    expect(save).not.toHaveBeenCalled();

    const result = await controller.create("sq_session=acceptance-owner-1", undefined, { scenarioId: "normal" });
    expect(result.status).toBe("WAITING");
    expect(save).toHaveBeenCalledOnce();
    expect(save.mock.calls[0][0]).toMatchObject({
      status: "WAITING",
      evidence: {
        dataMode: "NOT_CONNECTED",
        executionPolicy: "PREPARATION_ONLY",
        mandate: { status: "PREPARATION_ONLY" },
        source: { status: "NOT_RUN" },
        orders: [],
        fills: [],
        reconciliation: { status: "NOT_RUN" },
        assertions: [{ status: "WAITING", actual: "NOT_RUN" }]
      }
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns revisions only after owner-scoped TestRun lookup", async () => {
    const revision = {
      revisionId: "1",
      testRunId: "run-1",
      stageId: "V2.4",
      priorStatus: "COMPLETED",
      priorAssertions: [],
      priorEvidence: { observationCounted: true },
      priorCreatedAt: "2026-09-25T00:00:00.000Z",
      priorCompletedAt: "2026-09-25T01:00:00.000Z",
      reason: "OBSERVATION_EVENT_ERRORS",
      recordedAt: "2026-09-25T02:00:00.000Z"
    };
    const find = vi.fn(async () => ({ testRunId: "run-1", stageId: "V2.4", scenarioId: "observation" }));
    const listRunRevisions = vi.fn(async () => [revision]);
    const listObservationsForOwner = vi.fn(async () => []);
    const controller = new V24AcceptanceController({
      scheduler: {},
      stageRuns: { find },
      v24Observation: { listRunRevisions, listObservationsForOwner }
    } as any);

    await expect(controller.revisions("sq_session=acceptance-owner-1", undefined, "run-1")).resolves.toEqual({
      testRunId: "run-1",
      revisions: [revision]
    });
    expect(find).toHaveBeenCalledWith("run-1", "acceptance-owner-1");
    expect(listRunRevisions).toHaveBeenCalledWith("run-1", "acceptance-owner-1");
    await expect(controller.observations("sq_session=acceptance-owner-1", undefined)).resolves.toEqual([]);
    expect(listObservationsForOwner).toHaveBeenCalledWith("acceptance-owner-1");
  });

  it("does not query history for a different user or a non-observation run", async () => {
    const listRunRevisions = vi.fn();
    const find = vi.fn(async () => ({ testRunId: "run-1", stageId: "V2.4", scenarioId: "normal" }));
    const controller = new V24AcceptanceController({
      scheduler: {},
      stageRuns: { find },
      v24Observation: { listRunRevisions, listObservationsForOwner: vi.fn() }
    } as any);

    await expect(controller.revisions("sq_session=another-user", undefined, "run-1")).rejects.toThrow("not authorized");
    expect(find).not.toHaveBeenCalled();

    await expect(controller.revisions("sq_session=acceptance-owner-1", undefined, "run-1")).rejects.toThrow("observation run was not found");
    expect(listRunRevisions).not.toHaveBeenCalled();
    expect(() => controller.observations("sq_session=another-user", undefined)).toThrow("user is not authorized for the local acceptance scope");
    expect(() => controller.observations(undefined, undefined)).toThrow("local session is required");
  });
});

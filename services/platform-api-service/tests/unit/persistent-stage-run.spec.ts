import { describe, expect, it, vi } from "vitest";
import { PersistentStageRunService } from "../../src/application/persistent-stage-run.js";

describe("persistent V1.3-V1.5 stage runs", () => {
  it("stores engine output with stage, namespace and owner scope", async () => {
    const repository = { save: vi.fn(async (run: any) => run), find: vi.fn() } as any;
    const service = new PersistentStageRunService(repository, "V1.4", (scenarioId, seed) => ({
      testRunId: "00000000-0000-4000-8000-000000000014",
      stageId: "V1.4",
      scenarioId,
      seed,
      status: "COMPLETED",
      assertions: [{ assertionId: "A", status: "PASS" }],
      evidence: { brokerMode: "FAKE" }
    }));

    await expect(service.create("owner-a", "normal", 9)).resolves.toMatchObject({ accepted: true, status: "COMPLETED" });
    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({
      stageId: "V1.4",
      ownerId: "owner-a",
      namespace: "v1-4-normal-00000000-0000-4000-8000-000000000014"
    }));
  });

  it("uses the owner-scoped repository lookup", async () => {
    const repository = { find: vi.fn(async (id: string, owner: string) => ({ testRunId: id, ownerId: owner, stageId: "V1.5" })) } as any;
    const service = new PersistentStageRunService(repository, "V1.5", () => { throw new Error("not called"); });
    await service.find("run-15", "owner-b");
    expect(repository.find).toHaveBeenCalledWith("run-15", "owner-b");
  });
});

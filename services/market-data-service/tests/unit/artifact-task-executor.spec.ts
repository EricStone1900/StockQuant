import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { ArtifactTaskExecutor } from "../../src/application/artifact-task-executor.js";
import type { ArtifactTaskClaim, ArtifactTaskRecord } from "../../src/ports/artifact-delivery.js";

const claim: ArtifactTaskClaim = {
  taskId: "task-1",
  artifactId: "artifact:task-1",
  fixtureVersion: "fixture-v1",
  status: "RUNNING",
  sha256: null,
  error: null,
  fence: 7,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("ArtifactTaskExecutor", () => {
  it("hashes Fixture bytes and returns the persisted publication result", async () => {
    const bytes = Buffer.from("immutable fixture bytes");
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const completed: ArtifactTaskRecord = { ...claim, status: "COMPLETED", sha256 };
    const repository = {
      claimTask: vi.fn().mockResolvedValue(claim),
      publishTask: vi.fn().mockResolvedValue(completed),
      failTask: vi.fn(),
    };
    const executor = new ArtifactTaskExecutor(repository, async () => bytes, "worker-1");

    await expect(executor.tick()).resolves.toEqual(completed);
    expect(repository.claimTask).toHaveBeenCalledWith("worker-1", 30_000);
    expect(repository.publishTask).toHaveBeenCalledWith("task-1", 7, bytes, sha256);
    expect(repository.failTask).not.toHaveBeenCalled();
  });

  it("persists unsupported Fixture failures against the claimed fencing token", async () => {
    const repository = {
      claimTask: vi.fn().mockResolvedValue(claim),
      publishTask: vi.fn(),
      failTask: vi.fn().mockResolvedValue(undefined),
    };
    const executor = new ArtifactTaskExecutor(repository, async () => { throw new Error("unsupported Fixture"); }, "worker-2");

    await expect(executor.tick()).resolves.toMatchObject({ taskId: "task-1", status: "FAILED", error: "unsupported Fixture" });
    expect(repository.failTask).toHaveBeenCalledWith("task-1", 7, "unsupported Fixture");
    expect(repository.publishTask).not.toHaveBeenCalled();
  });

  it("returns null when no task can be claimed", async () => {
    const repository = { claimTask: vi.fn().mockResolvedValue(null), publishTask: vi.fn(), failTask: vi.fn() };
    const executor = new ArtifactTaskExecutor(repository, async () => Buffer.alloc(0), "worker-3");

    await expect(executor.tick()).resolves.toBeNull();
    expect(repository.publishTask).not.toHaveBeenCalled();
  });
});

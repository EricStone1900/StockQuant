import { describe, expect, it, vi } from "vitest";
import type { ArtifactRef } from "../../src/domain/artifact-ref.js";
import { rollbackUnreferencedArtifact } from "../../src/application/v31-artifact-publication-cleanup.js";

const ref: ArtifactRef = {
  schemaVersion: "v3.1-artifact-ref-v1",
  artifactId: "output-123",
  kind: "OUTPUT",
  namespace: "research/run-1/exp-1/outputs",
  sha256: "a".repeat(64),
  status: "PUBLISHED",
  sourceRef: "runner:job-1:fence:1",
};

describe("artifact publication rollback", () => {
  it("keeps bytes when the metadata lookup is uncertain after a failed publication", async () => {
    const readPersistedRef = vi.fn().mockRejectedValue(new Error("database connection lost"));
    const removeBytes = vi.fn();

    await expect(rollbackUnreferencedArtifact({ ref, readPersistedRef, removeBytes })).resolves.toBe("PRESERVED_UNCERTAIN");
    expect(readPersistedRef).toHaveBeenCalledWith(ref);
    expect(removeBytes).not.toHaveBeenCalled();
  });

  it("keeps bytes when a durable reference is present", async () => {
    const removeBytes = vi.fn();

    await expect(rollbackUnreferencedArtifact({ ref, readPersistedRef: async () => ref, removeBytes })).resolves.toBe("PRESERVED_REFERENCED");
    expect(removeBytes).not.toHaveBeenCalled();
  });

  it("removes staged bytes only after a successful lookup proves the reference absent", async () => {
    const removeBytes = vi.fn().mockResolvedValue(undefined);

    await expect(rollbackUnreferencedArtifact({ ref, readPersistedRef: async () => null, removeBytes })).resolves.toBe("REMOVED_UNREFERENCED");
    expect(removeBytes).toHaveBeenCalledWith(ref);
  });
});

import { describe, expect, it } from "vitest";
import { canTransitionArtifactStatus, expireArtifactRef } from "../../src/domain/artifact-ref.js";

describe("ArtifactRef lifecycle", () => {
  it("allows only idempotent status writes and forward-only transitions", () => {
    const allowed = [
      ["PENDING", "PENDING"], ["PENDING", "PUBLISHED"], ["PENDING", "FAILED"],
      ["PUBLISHED", "PUBLISHED"], ["PUBLISHED", "RETAINED"], ["PUBLISHED", "EXPIRED"],
      ["RETAINED", "RETAINED"], ["RETAINED", "EXPIRED"], ["FAILED", "FAILED"], ["EXPIRED", "EXPIRED"],
    ] as const;
    for (const [current, next] of allowed) expect(canTransitionArtifactStatus(current, next)).toBe(true);
  });

  it("does not permit publication to regress or an expired reference to revive", () => {
    const forbidden = [
      ["PUBLISHED", "PENDING"], ["FAILED", "PUBLISHED"], ["RETAINED", "PUBLISHED"],
      ["EXPIRED", "PUBLISHED"], ["EXPIRED", "RETAINED"], ["EXPIRED", "PENDING"],
    ] as const;
    for (const [current, next] of forbidden) expect(canTransitionArtifactStatus(current, next)).toBe(false);
  });

  it("expires only published/retained refs whose fixed retention timestamp has elapsed", () => {
    const ref = { schemaVersion: "v3.1-artifact-ref-v1" as const, artifactId: "output-1", kind: "OUTPUT" as const, namespace: "research/run-1/exp-1/outputs", sha256: "a".repeat(64), status: "PUBLISHED" as const, sourceRef: "runner:job-1", expiresAt: "2026-09-01T00:00:00.000Z" };
    expect(expireArtifactRef(ref, new Date("2026-10-01T00:00:00.000Z"))).toMatchObject({ status: "EXPIRED", expiresAt: ref.expiresAt });
    expect(() => expireArtifactRef({ ...ref, expiresAt: "2026-11-01T00:00:00.000Z" }, new Date("2026-10-01T00:00:00.000Z"))).toThrow("retention period has not elapsed");
  });
});

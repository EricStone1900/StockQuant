import { describe, expect, it } from "vitest";
import { projectV23QlibArtifactRef } from "../../src/application/v23-qlib-common-artifact-ref.js";

const testRunId = "8b2d68d1-62eb-46a8-a2c6-957a7b252a8f";
const ownerId = "owner-1";
const artifactId = "a".repeat(64);
const evidence = {
  crossService: {
    research: {
      durableArtifactStatus: "PERSISTED",
      artifactRef: {
        artifactId,
        sha256: artifactId,
        mediaType: "application/vnd.stockquant.qlib-fixture-model+json",
        url: `/api/v1/acceptance/v2/v2.3/runs/${testRunId}/artifacts/${artifactId}`,
      },
    },
  },
};

describe("projectV23QlibArtifactRef", () => {
  it("projects an owner-scoped Qlib artifact into the common TestRun reference", () => {
    expect(projectV23QlibArtifactRef(testRunId, ownerId, evidence)).toEqual([{
      schemaVersion: "artifact-ref.v1",
      artifactId,
      testRunId,
      ownerId,
      kind: "MODEL_PREDICTIONS",
      namespace: `research/${testRunId}/qlib-fixture`,
      mediaType: "application/vnd.stockquant.qlib-fixture-model+json",
      sha256: artifactId,
      status: "PUBLISHED",
      sourceRef: `platform-api-service:v2.3:${testRunId}`,
    }]);
  });

  it("omits unpersisted or incorrectly bound stage-specific references", () => {
    expect(projectV23QlibArtifactRef(testRunId, ownerId, { ...evidence, crossService: { research: { ...evidence.crossService.research, durableArtifactStatus: "FAILED" } } })).toEqual([]);
    expect(projectV23QlibArtifactRef(testRunId, ownerId, { crossService: { research: { ...evidence.crossService.research, artifactRef: { ...evidence.crossService.research.artifactRef, url: "https://attacker.invalid" } } } })).toEqual([]);
  });

  it("projects the persisted lifecycle without inventing an expiry policy", () => {
    expect(projectV23QlibArtifactRef(testRunId, ownerId, evidence, { status: "RETAINED", expiresAt: null })[0]).toMatchObject({ status: "RETAINED", expiresAt: null });
    expect(projectV23QlibArtifactRef(testRunId, ownerId, evidence, { status: "EXPIRED", expiresAt: "2026-10-01T00:00:00.000Z" })[0]).toMatchObject({ status: "EXPIRED", expiresAt: "2026-10-01T00:00:00.000Z" });
  });
});

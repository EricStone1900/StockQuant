import type { ArtifactRef } from "../contracts/generated-types.js";
import type { QlibFixtureArtifact } from "../ports/qlib-fixture-artifact-repository.js";

/** Projects the immutable V1.2 Qlib strategy payload onto the shared ArtifactRef contract. */
export function projectV12QlibArtifactRef(artifact: QlibFixtureArtifact): ArtifactRef {
  return {
    schemaVersion: "artifact-ref.v1",
    artifactId: artifact.artifactId,
    testRunId: artifact.testRunId,
    ownerId: artifact.ownerId,
    kind: "MODEL_PREDICTIONS",
    namespace: `research/${artifact.testRunId}/qlib-fixture`,
    mediaType: artifact.mediaType,
    sha256: artifact.sha256,
    status: artifact.status,
    sourceRef: `platform-api-service:v1.2:${artifact.testRunId}`,
    ...(artifact.expiresAt !== undefined ? { expiresAt: artifact.expiresAt } : {}),
  };
}

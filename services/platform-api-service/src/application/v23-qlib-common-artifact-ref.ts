import type { ArtifactRef } from "../contracts/generated-types.js";

type RecordValue = Record<string, unknown>;
const HASH = /^[a-f0-9]{64}$/u;

function record(value: unknown): RecordValue | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : null;
}

/** Projects the V2.3 Qlib payload ref into the shared owner/run-scoped TestRun contract. */
export function projectV23QlibArtifactRef(testRunId: string, ownerId: string, evidenceValue: unknown, lifecycle?: { status: "PUBLISHED" | "RETAINED" | "EXPIRED"; expiresAt?: string | null }): ArtifactRef[] {
  const evidence = record(evidenceValue);
  const crossService = record(evidence?.crossService);
  const research = record(crossService?.research);
  const ref = record(research?.artifactRef);
  if (!ref) return [];
  if (typeof ref.artifactId !== "string" || !HASH.test(ref.artifactId) || ref.sha256 !== ref.artifactId
    || ref.mediaType !== "application/vnd.stockquant.qlib-fixture-model+json"
    || ref.url !== `/api/v1/acceptance/v2/v2.3/runs/${encodeURIComponent(testRunId)}/artifacts/${encodeURIComponent(ref.artifactId)}`
    || research?.durableArtifactStatus !== "PERSISTED") return [];
  return [{
    schemaVersion: "artifact-ref.v1",
    artifactId: ref.artifactId,
    testRunId,
    ownerId,
    kind: "MODEL_PREDICTIONS",
    namespace: `research/${testRunId}/qlib-fixture`,
    mediaType: ref.mediaType,
    sha256: ref.sha256,
    status: lifecycle?.status ?? "PUBLISHED",
    sourceRef: `platform-api-service:v2.3:${testRunId}`,
    ...(lifecycle?.expiresAt !== undefined ? { expiresAt: lifecycle.expiresAt } : {}),
  }];
}

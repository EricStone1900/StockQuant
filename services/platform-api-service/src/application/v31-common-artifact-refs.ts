import type { ArtifactRef } from "../contracts/generated-types.js";

type RecordValue = Record<string, unknown>;
const HASH = /^[a-f0-9]{64}$/u;
const NAMESPACE = /^research\/([^/]+)\/([^/]+)\/(inputs|outputs)$/u;

function record(value: unknown): RecordValue | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : null;
}

/** Projects V3.1's persisted research refs into the shared TestRun ArtifactRef contract. */
export function projectV31ArtifactRefs(testRunId: string, ownerId: string, evidenceValue: unknown): ArtifactRef[] {
  const evidence = record(evidenceValue);
  const orchestration = record(evidence?.orchestration);
  const runnerJob = record(orchestration?.runnerJob);
  const refs: unknown[] = [];
  if (orchestration?.inputRef) refs.push(orchestration.inputRef);
  if (Array.isArray(runnerJob?.artifacts)) refs.push(...runnerJob.artifacts);

  const projected = new Map<string, ArtifactRef>();
  for (const value of refs) {
    const ref = record(value);
    if (ref?.schemaVersion !== "v3.1-artifact-ref-v1" || typeof ref.artifactId !== "string" || ref.artifactId.length < 1 || ref.artifactId.length > 256
      || typeof ref.kind !== "string" || !["INPUT", "GENERATED_CODE", "RUN_LOG", "METRICS", "ERROR", "CANDIDATE", "OUTPUT"].includes(ref.kind)
      || typeof ref.namespace !== "string" || !NAMESPACE.test(ref.namespace) || !ref.namespace.startsWith(`research/${testRunId}/`)
      || typeof ref.sha256 !== "string" || !HASH.test(ref.sha256)
      || typeof ref.status !== "string" || !["PENDING", "PUBLISHED", "FAILED", "RETAINED", "EXPIRED"].includes(ref.status)
      || typeof ref.sourceRef !== "string" || ref.sourceRef.length < 1 || ref.sourceRef.length > 512) continue;
    if (ref.expiresAt !== undefined && ref.expiresAt !== null && (typeof ref.expiresAt !== "string" || !Number.isFinite(Date.parse(ref.expiresAt)))) continue;
    const namespaceMatch = NAMESPACE.exec(ref.namespace);
    if (namespaceMatch?.[1] !== testRunId || (ref.kind === "INPUT" ? namespaceMatch[3] !== "inputs" : namespaceMatch[3] !== "outputs")) continue;
    const common: ArtifactRef = {
      schemaVersion: "artifact-ref.v1",
      artifactId: ref.artifactId,
      testRunId,
      ownerId,
      kind: ref.kind,
      namespace: ref.namespace,
      sha256: ref.sha256,
      status: ref.status as ArtifactRef["status"],
      sourceRef: ref.sourceRef,
      ...(ref.expiresAt === undefined ? {} : { expiresAt: ref.expiresAt as string | null }),
    };
    const key = `${common.namespace}\0${common.artifactId}`;
    const previous = projected.get(key);
    if (previous && JSON.stringify(previous) !== JSON.stringify(common)) throw new Error("conflicting V3.1 ArtifactRefs share a namespace and artifactId");
    projected.set(key, common);
  }
  return [...projected.values()];
}

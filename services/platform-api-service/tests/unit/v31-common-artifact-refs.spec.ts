import { describe, expect, it } from "vitest";
import { projectV31ArtifactRefs } from "../../src/application/v31-common-artifact-refs.js";

const testRunId = "8b2d68d1-62eb-46a8-a2c6-957a7b252a8f";
const ownerId = "owner-1";
const inputRef = {
  schemaVersion: "v3.1-artifact-ref-v1",
  artifactId: "a".repeat(64),
  kind: "INPUT",
  namespace: `research/${testRunId}/experiment-1/inputs`,
  sha256: "a".repeat(64),
  status: "PUBLISHED",
  sourceRef: "test-input",
};

describe("projectV31ArtifactRefs", () => {
  it("projects stage-specific input and output refs into owner/run-scoped public refs", () => {
    const outputRef = { ...inputRef, artifactId: "output-1", kind: "METRICS", namespace: `research/${testRunId}/experiment-1/outputs`, sourceRef: "test-output" };
    const result = projectV31ArtifactRefs(testRunId, ownerId, { orchestration: { inputRef, runnerJob: { artifacts: [outputRef] } } });
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ schemaVersion: "artifact-ref.v1", testRunId, ownerId, artifactId: inputRef.artifactId, kind: "INPUT", status: "PUBLISHED" });
    expect(result[1]).toMatchObject({ schemaVersion: "artifact-ref.v1", testRunId, ownerId, artifactId: "output-1", kind: "METRICS", status: "PUBLISHED" });
  });

  it("omits malformed, unscoped, and kind/namespace-mismatched refs", () => {
    const wrongRun = { ...inputRef, namespace: "research/another-run/experiment-1/inputs" };
    const wrongKindNamespace = { ...inputRef, kind: "OUTPUT", namespace: `research/${testRunId}/experiment-1/inputs` };
    const badHash = { ...inputRef, sha256: "invalid" };
    const result = projectV31ArtifactRefs(testRunId, ownerId, { orchestration: { inputRef: wrongRun, runnerJob: { artifacts: [wrongKindNamespace, badHash] } } });
    expect(result).toEqual([]);
  });

  it("preserves EXPIRED lifecycle state in the shared TestRun projection", () => {
    const expired = { ...inputRef, status: "EXPIRED", expiresAt: "2026-09-01T00:00:00.000Z" };
    expect(projectV31ArtifactRefs(testRunId, ownerId, { orchestration: { inputRef: expired } })).toMatchObject([
      { schemaVersion: "artifact-ref.v1", testRunId, ownerId, artifactId: inputRef.artifactId, status: "EXPIRED", expiresAt: expired.expiresAt },
    ]);
  });
});

import { describe, expect, it } from "vitest";
import { findV31RunArtifactRef } from "../../src/application/v31-run-artifact-access.js";

const testRunId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const experimentId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const jobId = `${testRunId}:${experimentId}`;
const inputRef = { schemaVersion: "v3.1-artifact-ref-v1", artifactId: "input-hash", kind: "INPUT", namespace: `research/${testRunId}/${experimentId}/inputs`, sha256: "1".repeat(64), status: "PUBLISHED", sourceRef: "fixture:small" };
const outputRef = { schemaVersion: "v3.1-artifact-ref-v1", artifactId: "output-hash", kind: "RUN_LOG", namespace: `research/${testRunId}/${experimentId}/outputs`, sha256: "2".repeat(64), status: "PUBLISHED", sourceRef: `runner:${jobId}` };
const run = { testRunId, stageId: "V3.1", evidence: { orchestration: { inputRef, runnerJob: { jobId, job: { testRunId, experimentId, outputNamespace: outputRef.namespace } } } } };
const runnerRecord = { jobId, job: { testRunId, experimentId, outputNamespace: outputRef.namespace }, artifacts: [outputRef] };

describe("V3.1 owner/run-scoped Artifact lookup", () => {
  it("returns only the published input and output refs bound to the exact RunnerJob", () => {
    expect(findV31RunArtifactRef({ run, requestedArtifactId: inputRef.artifactId, runnerRecord })).toEqual(inputRef);
    expect(findV31RunArtifactRef({ run, requestedArtifactId: outputRef.artifactId, runnerRecord })).toEqual(outputRef);
  });

  it("refuses another run's RunnerJob or namespace even when the artifact id matches", () => {
    expect(findV31RunArtifactRef({ run, requestedArtifactId: outputRef.artifactId, runnerRecord: { ...runnerRecord, job: { ...runnerRecord.job, testRunId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc" } } })).toBeNull();
    expect(findV31RunArtifactRef({ run, requestedArtifactId: outputRef.artifactId, runnerRecord: { ...runnerRecord, artifacts: [{ ...outputRef, namespace: "research/other/exp/outputs" }] } })).toBeNull();
  });

  it("refuses unlisted and non-published artifacts", () => {
    expect(findV31RunArtifactRef({ run, requestedArtifactId: "unlisted", runnerRecord })).toBeNull();
    expect(findV31RunArtifactRef({ run: { ...run, evidence: { orchestration: { ...run.evidence.orchestration, inputRef: { ...inputRef, status: "PENDING" } } } }, requestedArtifactId: inputRef.artifactId, runnerRecord })).toBeNull();
  });

  it("does not expose an EXPIRED Artifact even while its historical ref remains on the run", () => {
    const expiredRun = { ...run, evidence: { orchestration: { ...run.evidence.orchestration, inputRef: { ...inputRef, status: "EXPIRED" } } } };
    expect(findV31RunArtifactRef({ run: expiredRun, requestedArtifactId: inputRef.artifactId, runnerRecord })).toBeNull();
  });
});

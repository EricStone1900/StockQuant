export type V31RunArtifactRef = {
  schemaVersion: "v3.1-artifact-ref-v1";
  artifactId: string;
  kind: string;
  namespace: string;
  sha256: string;
  status: string;
  sourceRef: string;
};

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : null;
}

function artifactRef(value: unknown): V31RunArtifactRef | null {
  const ref = record(value);
  if (!ref || ref.schemaVersion !== "v3.1-artifact-ref-v1" || typeof ref.artifactId !== "string" || typeof ref.kind !== "string" || typeof ref.namespace !== "string" || typeof ref.sha256 !== "string" || !/^[0-9a-f]{64}$/u.test(ref.sha256) || typeof ref.status !== "string" || typeof ref.sourceRef !== "string") return null;
  return ref as V31RunArtifactRef;
}

/** Only references retained by the owner-scoped TestRun or its exact fenced RunnerJob are readable. */
export function findV31RunArtifactRef(input: {
  run: { testRunId: string; stageId: string; evidence: unknown };
  requestedArtifactId: string;
  runnerRecord: unknown;
}): V31RunArtifactRef | null {
  if (input.run.stageId !== "V3.1" || !input.requestedArtifactId) return null;
  const evidence = record(input.run.evidence);
  const orchestration = record(evidence?.orchestration);
  const submitted = record(orchestration?.runnerJob);
  const submittedJob = record(submitted?.job);
  const runner = record(input.runnerRecord);
  const job = record(runner?.job);
  const jobId = submitted?.jobId;
  const experimentId = submittedJob?.experimentId;
  const outputNamespace = submittedJob?.outputNamespace;
  if (typeof jobId !== "string" || typeof experimentId !== "string" || typeof outputNamespace !== "string" || submittedJob?.testRunId !== input.run.testRunId || jobId !== `${input.run.testRunId}:${experimentId}`) return null;
  if (runner?.jobId !== jobId || job?.testRunId !== input.run.testRunId || job?.experimentId !== experimentId || job?.outputNamespace !== outputNamespace) return null;
  if (outputNamespace !== `research/${input.run.testRunId}/${experimentId}/outputs`) return null;

  const candidates: V31RunArtifactRef[] = [];
  const inputRef = artifactRef(orchestration?.inputRef);
  if (inputRef?.kind === "INPUT" && inputRef.status === "PUBLISHED" && inputRef.namespace === `research/${input.run.testRunId}/${experimentId}/inputs`) candidates.push(inputRef);
  if (Array.isArray(runner.artifacts)) {
    for (const value of runner.artifacts) {
      const ref = artifactRef(value);
      if (ref?.status === "PUBLISHED" && ref.namespace === outputNamespace) candidates.push(ref);
    }
  }
  return candidates.find((candidate) => candidate.artifactId === input.requestedArtifactId) ?? null;
}

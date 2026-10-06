import { validateArtifactRef, sha256, type ArtifactRef } from "../domain/artifact-ref.js";
import type { ArtifactContentStore } from "../ports/artifact-content-store.js";
import type { ArtifactRefRepository } from "../ports/artifact-ref-repository.js";
import type { RunnerJob } from "./v31-runtime-guards.js";

export class RunnerInputPreflightError extends Error {
  constructor(message: string, readonly statusCode: 409 | 413 = 409) {
    super(message);
    this.name = "RunnerInputPreflightError";
  }
}

/** Check immutable input metadata and bytes before an accepted job becomes visible in the queue. */
export async function verifyRunnerInputBeforeDispatch(
  job: RunnerJob,
  artifacts: Pick<ArtifactRefRepository, "get">,
  content: Pick<ArtifactContentStore, "size" | "read">,
): Promise<ArtifactRef> {
  const parts = job.inputArtifact.split("/");
  if (parts.length !== 5 || parts[0] !== "research" || parts[1] !== job.testRunId
    || parts[2] !== job.experimentId || parts[3] !== "inputs") {
    throw new RunnerInputPreflightError("Runner input reference is outside the bound TestRun and Experiment");
  }
  const namespace = parts.slice(0, 4).join("/");
  const artifactId = parts[4];
  const ref = await artifacts.get(namespace, artifactId);
  if (!ref) throw new RunnerInputPreflightError("Runner input artifact is not registered");
  try { validateArtifactRef(ref); }
  catch { throw new RunnerInputPreflightError("Runner input artifact reference is invalid"); }
  if (ref.namespace !== namespace || ref.artifactId !== artifactId || ref.kind !== "INPUT"
    || ref.status !== "PUBLISHED" || ref.sha256 !== artifactId) {
    throw new RunnerInputPreflightError("Runner input artifact must be the exact published content-addressed input");
  }
  const size = await content.size(ref);
  if (!Number.isSafeInteger(size) || size < 0) throw new RunnerInputPreflightError("Runner input artifact size is invalid");
  if (size > 8 * 1024 * 1024) throw new RunnerInputPreflightError("Runner input artifact exceeds 8 MiB", 413);
  const bytes = await content.read(ref);
  if (bytes.byteLength !== size || sha256(bytes) !== ref.sha256) {
    throw new RunnerInputPreflightError("Runner input artifact bytes do not match the immutable reference");
  }
  return ref;
}

import type { RunnerJobRecord } from "./v31-runner-jobs.js";
import { sha256, type ArtifactRef } from "./v31-runtime-guards.js";

export type RunnerInputArtifactStore = {
  get(namespace: string, artifactId: string): Promise<ArtifactRef | null>;
  size(ref: ArtifactRef): Promise<number>;
  read(ref: ArtifactRef): Promise<Uint8Array>;
};

/** Return only the immutable input artifact for the currently fenced lease. */
export async function readLeasedRunnerInput(input: {
  record: RunnerJobRecord | null;
  workerId: string;
  fencingToken: number;
  now: Date;
  store: RunnerInputArtifactStore;
}): Promise<{ ref: ArtifactRef; content: Uint8Array } | null> {
  const { record } = input;
  const lease = record?.lease;
  const expiresAt = lease ? Date.parse(lease.expiresAt) : Number.NaN;
  if (!record || record.status !== "RUNNING" || !lease || lease.workerId !== input.workerId || lease.fencingToken !== input.fencingToken || !Number.isFinite(expiresAt) || expiresAt <= input.now.getTime()) return null;

  const parts = record.job.inputArtifact.split("/");
  if (parts.length !== 5 || parts[0] !== "research" || parts[3] !== "inputs") return null;
  const namespace = parts.slice(0, 4).join("/");
  const artifactId = parts[4];
  const ref = await input.store.get(namespace, artifactId);
  if (!ref || ref.kind !== "INPUT" || ref.status !== "PUBLISHED" || ref.namespace !== namespace || ref.artifactId !== artifactId) return null;
  if (await input.store.size(ref) > 8 * 1024 * 1024) throw new Error("runner input artifact exceeds 8 MiB limit");
  const content = await input.store.read(ref);
  if (sha256(content) !== ref.sha256) throw new Error("runner input artifact hash does not match its immutable reference");
  return { ref, content };
}

import { constants } from "node:fs";
import { lstat, open, readdir, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { sha256, validateArtifactRef, type ArtifactRef, type RunnerJob } from "./v31-runtime-guards.js";
import type { RunnerJobRecord } from "./v31-runner-jobs.js";

const MAX_OUTPUT_FILES = 64;
const MAX_OUTPUT_FILE_BYTES = 8 * 1024 * 1024;
const MAX_OUTPUT_TOTAL_BYTES = 32 * 1024 * 1024;
const SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;

export type CollectedRunnerOutput = { ref: ArtifactRef; content: Uint8Array; relativePath: string };

/** Verify that a Runner Host can publish only OUTPUT refs for its live fenced job. */
export function validateLeasedRunnerOutputPublication(input: {
  record: RunnerJobRecord | null;
  jobId: string;
  workerId: string;
  fencingToken: number;
  now: Date;
  ref: ArtifactRef;
}): void {
  const { record, ref } = input;
  const lease = record?.lease;
  if (!record || record.jobId !== input.jobId || record.status !== "RUNNING" || !lease || lease.workerId !== input.workerId || lease.fencingToken !== input.fencingToken || Date.parse(lease.expiresAt) <= input.now.getTime()) throw new Error("runner output publication requires the current unexpired lease");
  if (ref.kind !== "OUTPUT" || ref.status !== "PENDING" || ref.namespace !== record.job.outputNamespace || ref.sourceRef !== `runner:${input.jobId}:fence:${input.fencingToken}`) throw new Error("runner output reference must match the leased job, namespace, and fencing token");
}

/** Read bounded regular files from the completed Runner's isolated output directory. */
export async function collectRunnerOutputArtifacts(input: {
  jobId: string;
  job: RunnerJob;
  fencingToken: number;
  outputRoot: string;
}): Promise<CollectedRunnerOutput[]> {
  if (!Number.isSafeInteger(input.fencingToken) || input.fencingToken < 1) throw new Error("runner output fencingToken must be a positive safe integer");
  if (!isAbsolute(input.outputRoot) || input.outputRoot.includes(",") || input.outputRoot.split(/[\\/]+/u).includes("..")) throw new Error("runner output root must be absolute and traversal-free");
  const rootInfo = await lstat(input.outputRoot);
  if (rootInfo.isSymbolicLink() || !rootInfo.isDirectory()) throw new Error("runner output root must be a regular directory");
  const root = await realpath(input.outputRoot);
  const collected: CollectedRunnerOutput[] = [];
  let totalBytes = 0;

  async function walk(directory: string, segments: string[], depth: number): Promise<void> {
    if (depth > 16) throw new Error("runner output directory depth exceeds 16");
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      if (!SAFE_SEGMENT.test(entry.name)) throw new Error("runner output contains an unsafe path segment");
      const nextSegments = [...segments, entry.name];
      const target = resolve(directory, entry.name);
      const relativeFromRoot = relative(root, target);
      if (!relativeFromRoot || relativeFromRoot === ".." || relativeFromRoot.startsWith(`..${sep}`) || isAbsolute(relativeFromRoot)) throw new Error("runner output path escapes its isolated root");
      const details = await lstat(target);
      if (details.isSymbolicLink()) throw new Error("runner output symlinks are not publishable");
      if (details.isDirectory()) {
        await walk(target, nextSegments, depth + 1);
        continue;
      }
      if (!details.isFile() || details.nlink !== 1) throw new Error("runner output must contain only regular files without hard links");
      if (details.size > MAX_OUTPUT_FILE_BYTES) throw new Error("runner output file exceeds 8 MiB");
      if (collected.length >= MAX_OUTPUT_FILES) throw new Error("runner output exceeds 64 files");
      totalBytes += details.size;
      if (totalBytes > MAX_OUTPUT_TOTAL_BYTES) throw new Error("runner output exceeds 32 MiB total");

      const handle = await open(target, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
      let content: Buffer;
      try {
        const openedBefore = await handle.stat();
        if (!openedBefore.isFile() || openedBefore.nlink !== 1 || openedBefore.size !== details.size) throw new Error("runner output changed during collection");
        content = await handle.readFile();
        const openedAfter = await handle.stat();
        if (openedAfter.size !== openedBefore.size || content.byteLength !== openedBefore.size || openedAfter.mtimeMs !== openedBefore.mtimeMs) throw new Error("runner output changed during collection");
      } finally { await handle.close(); }

      const relativePath = nextSegments.join("/");
      const contentHash = sha256(content);
      const ref: ArtifactRef = {
        schemaVersion: "v3.1-artifact-ref-v1",
        artifactId: `output-${sha256(`${relativePath}\0${input.fencingToken}`).slice(0, 32)}-${contentHash.slice(0, 16)}`,
        kind: "OUTPUT",
        namespace: input.job.outputNamespace,
        sha256: contentHash,
        status: "PENDING",
        sourceRef: `runner:${input.jobId}:fence:${input.fencingToken}`,
      };
      validateArtifactRef(ref);
      collected.push({ ref, content, relativePath });
    }
  }

  await walk(root, [], 0);
  return collected;
}

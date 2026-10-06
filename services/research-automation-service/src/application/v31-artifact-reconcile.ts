import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, readdir, readFile, realpath, rename, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import type { ArtifactRef } from "./v31-runtime-guards.js";

export type OrphanArtifact = { namespace: string; artifactId: string; path: string; sizeBytes: number; sha256: string; modifiedAt: string };
export type ArtifactReconcileReport = { scanned: number; referenced: number; missingPublishedFiles: Array<Pick<ArtifactRef, "namespace" | "artifactId" | "sha256">>; hashMismatches: Array<{ namespace: string; artifactId: string; expectedSha256: string; actualSha256: string }>; recentUnreferenced: number; orphans: OrphanArtifact[] };

async function regularFiles(directory: string): Promise<string[]> {
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return []; throw error; }
  const paths: string[] = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) paths.push(...await regularFiles(path));
    else if (entry.isFile()) paths.push(path);
    // Symlinks and special files are intentionally ignored; reconciliation never follows them.
  }
  return paths;
}

type ResearchArtifactPath = { namespace: string; artifactId: string; contentSha256?: string };
const SAFE_SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const SHA256 = /^[a-f0-9]{64}$/;

/** Only V3.1-owned `{run}/{experiment}/{inputs|outputs}` paths belong to this reconciler. */
function researchArtifactPath(researchRoot: string, path: string): ResearchArtifactPath | null {
  const relativePath = relative(researchRoot, path);
  if (!relativePath || relativePath.startsWith(`..${sep}`) || relativePath === "..") return null;
  const parts = relativePath.split(sep);
  const contentAddressed = parts.length === 5 && SHA256.test(parts[3] ?? "");
  const legacy = parts.length === 4;
  if (!contentAddressed && !legacy) return null;
  if (!SAFE_SEGMENT.test(parts[0]) || !SAFE_SEGMENT.test(parts[1]) || !["inputs", "outputs"].includes(parts[2]) || !SAFE_SEGMENT.test(parts.at(-1)!)) return null;
  return {
    namespace: `research/${parts.slice(0, 3).join("/")}`,
    artifactId: parts.at(-1)!,
    ...(contentAddressed ? { contentSha256: parts[3] } : {}),
  };
}

export async function inspectArtifactOrphans(rootPath: string, refs: ArtifactRef[], options: { minAgeMs: number; now?: Date }): Promise<ArtifactReconcileReport> {
  if (!Number.isSafeInteger(options.minAgeMs) || options.minAgeMs < 0) throw new Error("minAgeMs must be a non-negative safe integer");
  const rootInput = resolve(rootPath);
  const rootInfo = await lstat(rootInput);
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) throw new Error("artifact root must be a real directory");
  const root = await realpath(rootInput);
  const researchRoot = join(root, "research");
  const cutoff = (options.now ?? new Date()).getTime() - options.minAgeMs;
  const refByIdentity = new Map(refs.map((ref) => [`${ref.namespace}\0${ref.artifactId}`, ref]));
  const researchInfo = await lstat(researchRoot).catch((error: NodeJS.ErrnoException) => error.code === "ENOENT" ? null : Promise.reject(error));
  if (researchInfo && (!researchInfo.isDirectory() || researchInfo.isSymbolicLink())) throw new Error("artifact research root must be a real directory");
  const files = (await regularFiles(researchRoot)).filter((path) => researchArtifactPath(researchRoot, path) !== null);
  const found = new Set<string>();
  const report: ArtifactReconcileReport = { scanned: files.length, referenced: 0, missingPublishedFiles: [], hashMismatches: [], recentUnreferenced: 0, orphans: [] };
  for (const path of files) {
    const info = await lstat(path);
    if (!info.isFile()) continue;
    const parsedPath = researchArtifactPath(researchRoot, path);
    if (!parsedPath) continue;
    const { namespace, artifactId, contentSha256 } = parsedPath;
    const identity = `${namespace}\0${artifactId}`;
    const content = await readFile(path);
    const digest = createHash("sha256").update(content).digest("hex");
    if (contentSha256 && digest !== contentSha256) {
      report.hashMismatches.push({ namespace, artifactId, expectedSha256: contentSha256, actualSha256: digest });
      continue;
    }
    const ref = refByIdentity.get(identity);
    if (ref) {
      report.referenced++;
      found.add(identity);
      if (["PUBLISHED", "RETAINED"].includes(ref.status) && digest !== ref.sha256) report.hashMismatches.push({ namespace, artifactId, expectedSha256: ref.sha256, actualSha256: digest });
      continue;
    }
    if (info.mtimeMs > cutoff) { report.recentUnreferenced++; continue; }
    report.orphans.push({ namespace, artifactId, path, sizeBytes: info.size, sha256: digest, modifiedAt: info.mtime.toISOString() });
  }
  for (const [identity, ref] of refByIdentity) {
    if (ref.status === "PUBLISHED" && !found.has(identity)) report.missingPublishedFiles.push({ namespace: ref.namespace, artifactId: ref.artifactId, sha256: ref.sha256 });
  }
  return report;
}

/** Moves explicitly approved, age-gated orphan candidates to a same-filesystem quarantine and records their hashes. */
export async function quarantineArtifactOrphans(report: ArtifactReconcileReport, rootPath: string, quarantinePath: string, currentRefs: ArtifactRef[], now: Date = new Date()): Promise<string[]> {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error("quarantine time is invalid");
  if (!Array.isArray(currentRefs)) throw new Error("quarantine requires a fresh ArtifactRef snapshot taken after the check-only report");
  const currentRefIdentities = new Set(currentRefs.map((ref) => `${ref.namespace}\0${ref.artifactId}`));
  const rootInput = resolve(rootPath);
  const rootInfo = await lstat(rootInput);
  if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) throw new Error("artifact root must be a real directory");
  const root = await realpath(rootInput);
  const quarantine = resolve(quarantinePath);
  await mkdir(quarantine, { recursive: true });
  const [rootReal, quarantineReal] = await Promise.all([realpath(root), realpath(quarantine)]);
  if (quarantineReal === rootReal || quarantineReal.startsWith(`${rootReal}${sep}`) || rootReal.startsWith(`${quarantineReal}${sep}`)) throw new Error("quarantine path must be separate from and outside the artifact root");
  if ((await stat(rootReal)).dev !== (await stat(quarantineReal)).dev) throw new Error("quarantine must be on the same filesystem as the artifact root");
  const researchRoot = join(rootReal, "research");
  const researchInfo = await lstat(researchRoot).catch((error: NodeJS.ErrnoException) => error.code === "ENOENT" ? null : Promise.reject(error));
  if (researchInfo && (!researchInfo.isDirectory() || researchInfo.isSymbolicLink())) throw new Error("artifact research root must be a real directory");
  const observedAt = now.toISOString();
  const batchId = `${observedAt.replaceAll(":", "-").replaceAll(".", "-")}-${randomUUID()}`;
  const moved: string[] = [];
  for (const candidate of report.orphans) {
    if (currentRefIdentities.has(`${candidate.namespace}\0${candidate.artifactId}`)) throw new Error("candidate gained an ArtifactRef after check-only; rerun check-only after publishers are paused");
    const path = resolve(candidate.path);
    const relativePath = relative(researchRoot, path);
    const parsedPath = researchArtifactPath(researchRoot, path);
    if (!parsedPath || resolve(researchRoot, relativePath) !== path || parsedPath.namespace !== candidate.namespace || parsedPath.artifactId !== candidate.artifactId || (parsedPath.contentSha256 && parsedPath.contentSha256 !== candidate.sha256)) throw new Error("candidate path escapes artifact research root or is outside Research-owned Artifact namespaces or does not match its reference");
    let ancestor = researchRoot;
    const parts = relativePath.split(sep);
    for (const part of parts.slice(0, -1)) {
      ancestor = join(ancestor, part);
      const parent = await lstat(ancestor);
      if (!parent.isDirectory() || parent.isSymbolicLink()) throw new Error("candidate parent changed after inspection");
    }
    const current = await lstat(path);
    if (!current.isFile() || current.isSymbolicLink()) throw new Error("candidate changed after inspection");
    const bytes = await readFile(path);
    const digest = createHash("sha256").update(bytes).digest("hex");
    if (digest !== candidate.sha256 || current.size !== candidate.sizeBytes || current.mtime.toISOString() !== candidate.modifiedAt) throw new Error("candidate changed after inspection; rerun check-only");
    const destination = join(quarantineReal, batchId, relativePath);
    await mkdir(dirname(destination), { recursive: true });
    await rename(path, destination);
    const manifest = { schemaVersion: "v3.1-artifact-orphan-quarantine-v1", observedAt, originalPath: path, namespace: candidate.namespace, artifactId: candidate.artifactId, sizeBytes: candidate.sizeBytes, sha256: candidate.sha256, modifiedAt: candidate.modifiedAt };
    await writeFile(`${destination}.manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`, { flag: "wx" });
    moved.push(destination);
  }
  return moved;
}

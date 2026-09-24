import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { sha256, validateArtifactRef, type ArtifactRef } from "./v31-runtime-guards.js";

const SAFE_ARTIFACT_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export class FileArtifactStore {
  constructor(private readonly root: string) {}

  private pathFor(ref: ArtifactRef): string {
    validateArtifactRef(ref);
    if (!SAFE_ARTIFACT_ID.test(ref.artifactId)) throw new Error("artifactId contains unsafe path characters");
    const relative = ref.namespace.replace(/^research\//, "") + "/" + ref.artifactId;
    const path = resolve(this.root, "research", relative);
    const root = resolve(this.root);
    if (path !== root && !path.startsWith(`${root}/`)) throw new Error("artifact path escapes the managed root");
    return path;
  }

  async publish(ref: ArtifactRef, content: Uint8Array): Promise<ArtifactRef> {
    if (sha256(content) !== ref.sha256) throw new Error("artifact content sha256 does not match the reference");
    const path = this.pathFor(ref);
    await mkdir(resolve(path, ".."), { recursive: true });
    try {
      const existing = await readFile(path);
      if (sha256(existing) !== ref.sha256) throw new Error("artifact path already contains different content");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      await writeFile(path, content, { flag: "wx" });
    }
    return { ...ref, status: "PUBLISHED" };
  }

  async read(ref: ArtifactRef): Promise<Uint8Array> { return readFile(this.pathFor(ref)); }
}

export function artifactPath(root: string, ref: ArtifactRef): string {
  validateArtifactRef(ref);
  if (!SAFE_ARTIFACT_ID.test(ref.artifactId)) throw new Error("artifactId contains unsafe path characters");
  return join(resolve(root), "research", ref.namespace.replace(/^research\//, ""), ref.artifactId);
}

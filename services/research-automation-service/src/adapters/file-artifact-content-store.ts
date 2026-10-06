import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { LocalArtifactContentStore } from "@stockquant/artifact-content-store";
import { sha256, validateArtifactRef, type ArtifactRef } from "../domain/artifact-ref.js";
import type { ArtifactContentStore } from "../ports/artifact-content-store.js";

const SAFE_ARTIFACT_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

export class FileArtifactStore implements ArtifactContentStore {
  private readonly shared: LocalArtifactContentStore;
  constructor(private readonly root: string) { this.shared = new LocalArtifactContentStore(root); }

  async publish(ref: ArtifactRef, content: Uint8Array): Promise<ArtifactRef> {
    if (ref.status !== "PENDING" && ref.status !== "PUBLISHED") throw new Error(`artifact status ${ref.status} cannot publish content`);
    if (sha256(content) !== ref.sha256) throw new Error("artifact content sha256 does not match the reference");
    await this.shared.publish(this.address(ref), content);
    return { ...ref, status: "PUBLISHED" };
  }

  async read(ref: ArtifactRef): Promise<Uint8Array> {
    if (ref.status !== "PUBLISHED" && ref.status !== "RETAINED") throw new Error(`artifact status ${ref.status} is not readable`);
    try { return await this.shared.read(this.address(ref)); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      const legacyBytes = await readFile(legacyArtifactPath(this.root, ref));
      if (sha256(legacyBytes) !== ref.sha256) throw new Error("stored artifact hash does not match its immutable reference");
      return legacyBytes;
    }
  }
  async size(ref: ArtifactRef): Promise<number> {
    if (ref.status !== "PUBLISHED" && ref.status !== "RETAINED") throw new Error(`artifact status ${ref.status} is not readable`);
    try { return await this.shared.size(this.address(ref)); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      const legacyBytes = await readFile(legacyArtifactPath(this.root, ref));
      if (sha256(legacyBytes) !== ref.sha256) throw new Error("stored artifact hash does not match its immutable reference");
      return legacyBytes.byteLength;
    }
  }
  /** Remove only the new shared-address bytes used by failed-publication rollback; legacy files are read-only during migration. */
  async remove(ref: ArtifactRef): Promise<void> {
    await this.shared.remove(this.address(ref));
  }

  private address(ref: ArtifactRef) { return { namespace: ref.namespace, artifactId: ref.artifactId, sha256: ref.sha256 }; }
}

function legacyArtifactPath(root: string, ref: ArtifactRef): string {
  return join(resolve(root), "research", ref.namespace.replace(/^research\//u, ""), ref.artifactId);
}

export function artifactPath(root: string, ref: ArtifactRef): string {
  validateArtifactRef(ref);
  if (!SAFE_ARTIFACT_ID.test(ref.artifactId)) throw new Error("artifactId contains unsafe path characters");
  return join(resolve(root), ref.namespace, ref.sha256, ref.artifactId);
}

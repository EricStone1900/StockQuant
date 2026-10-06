import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, mkdir, open, unlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const HASH = /^[a-f0-9]{64}$/u;
const SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u;
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function readRegularFileNoFollow(path) {
  if (!constants.O_NOFOLLOW) throw new Error("artifact storage requires O_NOFOLLOW support");
  let handle;
  try {
    handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    const info = await handle.stat();
    if (!info.isFile()) throw new Error("artifact path must be a regular file");
    return { bytes: await handle.readFile(), info };
  } catch (error) {
    if (error?.code === "ELOOP") throw new Error("artifact path must be a regular file", { cause: error });
    throw error;
  } finally {
    await handle?.close();
  }
}

/** Shared immutable content layer. Domain services retain their own owner/run metadata and authorization. */
export class LocalArtifactContentStore {
  constructor(root) { this.root = resolve(root); }

  pathFor({ namespace, artifactId, sha256 }) {
    if (typeof namespace !== "string" || namespace.length > 512 || namespace.startsWith("/") || namespace.endsWith("/")) throw new Error("artifact namespace is invalid");
    if (!HASH.test(sha256) || !SEGMENT.test(artifactId)) throw new Error("artifact content address is invalid");
    const segments = namespace.split("/");
    if (!segments.length || segments.some((segment) => !SEGMENT.test(segment))) throw new Error("artifact namespace contains an unsafe path segment");
    const path = resolve(this.root, ...segments, sha256, artifactId);
    if (path !== this.root && !path.startsWith(`${this.root}/`)) throw new Error("artifact path escapes the managed root");
    return path;
  }

  async ensureSafeParent(path) {
    const relative = path.slice(this.root.length + 1).split("/").slice(0, -1);
    let current = this.root;
    await mkdir(current, { recursive: true });
    const rootInfo = await lstat(current);
    if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) throw new Error("artifact root must be a real directory");
    for (const segment of relative) {
      current = join(current, segment);
      await mkdir(current, { recursive: true });
      const info = await lstat(current);
      if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("artifact namespace contains a non-directory path component");
    }
  }

  async assertSafeParent(path) {
    const relative = path.slice(this.root.length + 1).split("/").slice(0, -1);
    let current = this.root;
    const rootInfo = await lstat(current);
    if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) throw new Error("artifact root must be a real directory");
    for (const segment of relative) {
      current = join(current, segment);
      const info = await lstat(current);
      if (!info.isDirectory() || info.isSymbolicLink()) throw new Error("artifact namespace contains a non-directory path component");
    }
  }

  async publish(address, content) {
    const bytes = Buffer.from(content);
    if (hash(bytes) !== address.sha256) throw new Error("artifact content sha256 does not match its immutable address");
    const path = this.pathFor(address);
    await this.ensureSafeParent(path);
    try {
      const { bytes: existing } = await readRegularFileNoFollow(path);
      if (hash(existing) !== address.sha256) throw new Error("artifact path already contains different content");
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      await writeFile(path, bytes, { flag: "wx", mode: 0o640 });
    }
  }

  async read(address) {
    const path = this.pathFor(address);
    await this.assertSafeParent(path);
    const { bytes } = await readRegularFileNoFollow(path);
    if (hash(bytes) !== address.sha256) throw new Error("stored artifact hash does not match its immutable address");
    return bytes;
  }

  async size(address) { return (await this.read(address)).byteLength; }

  async remove(address) {
    const path = this.pathFor(address);
    await this.assertSafeParent(path).catch((error) => { if (error?.code !== "ENOENT") throw error; });
    let bytes;
    let info;
    try { ({ bytes, info } = await readRegularFileNoFollow(path)); }
    catch (error) {
      if (error?.code === "ENOENT") return;
      if (String(error?.message).includes("regular file")) throw new Error("artifact removal requires a regular file", { cause: error });
      throw error;
    }
    if (hash(bytes) !== address.sha256) throw new Error("refusing to remove artifact whose content does not match its immutable address");
    const current = await lstat(path);
    if (!current.isFile() || current.isSymbolicLink() || current.dev !== info.dev || current.ino !== info.ino) throw new Error("artifact path changed during removal");
    await unlink(path);
  }
}

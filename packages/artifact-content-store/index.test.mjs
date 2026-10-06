import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, symlink } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { LocalArtifactContentStore } from "./index.mjs";

const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");

test("publishes immutable namespaced bytes and verifies each read", async () => {
  const root = await mkdtemp(join(tmpdir(), "stockquant-artifact-store-"));
  try {
    const store = new LocalArtifactContentStore(root);
    const bytes = Buffer.from("frozen-artifact");
    const address = { namespace: "research/run-1/outputs", artifactId: "artifact-1", sha256: sha(bytes) };
    await store.publish(address, bytes);
    await store.publish(address, bytes);
    assert.deepEqual(Buffer.from(await store.read(address)), bytes);
    await assert.rejects(store.publish(address, Buffer.from("different")), /does not match/u);
    await rm(join(root, "research", "run-1", "outputs", address.sha256, address.artifactId));
    await import("node:fs/promises").then(({ writeFile }) => writeFile(join(root, "research", "run-1", "outputs", address.sha256, address.artifactId), "tampered"));
    await assert.rejects(store.read(address), /does not match/u);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("rejects path traversal and symlinked namespace components", async () => {
  const root = await mkdtemp(join(tmpdir(), "stockquant-artifact-store-"));
  const outside = await mkdtemp(join(tmpdir(), "stockquant-artifact-outside-"));
  try {
    const store = new LocalArtifactContentStore(root);
    const bytes = Buffer.from("content");
    const validHash = sha(bytes);
    assert.throws(() => store.pathFor({ namespace: "../outside", artifactId: "artifact", sha256: validHash }), /unsafe/u);
    await symlink(outside, join(root, "linked"));
    await assert.rejects(store.publish({ namespace: "linked/escape", artifactId: "artifact", sha256: validHash }, bytes), /non-directory/u);
    await assert.rejects(readFile(join(outside, validHash, "artifact")));
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test("does not follow a symlink at an artifact file address", async () => {
  const root = await mkdtemp(join(tmpdir(), "stockquant-artifact-leaf-link-"));
  const outside = await mkdtemp(join(tmpdir(), "stockquant-artifact-leaf-outside-"));
  try {
    const store = new LocalArtifactContentStore(root);
    const bytes = Buffer.from("outside bytes at a matching content address");
    const address = { namespace: "research/run-4/outputs", artifactId: "linked-artifact", sha256: sha(bytes) };
    const { mkdir, writeFile } = await import("node:fs/promises");
    const path = store.pathFor(address);
    await mkdir(join(path, ".."), { recursive: true });
    const outsidePath = join(outside, "source.bin");
    await writeFile(outsidePath, bytes);
    await symlink(outsidePath, path);

    await assert.rejects(store.read(address), /regular file/u);
    await assert.rejects(store.publish(address, bytes), /regular file/u);
    assert.deepEqual(await readFile(outsidePath), bytes);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test("removes only matching regular content and is idempotent for missing bytes", async () => {
  const root = await mkdtemp(join(tmpdir(), "stockquant-artifact-remove-"));
  try {
    const store = new LocalArtifactContentStore(root);
    const bytes = Buffer.from("retention-expired-content");
    const address = { namespace: "research/run-2/outputs", artifactId: "artifact-2", sha256: sha(bytes) };
    await store.publish(address, bytes);
    await store.remove(address);
    await store.remove(address);
    await assert.rejects(store.read(address), { code: "ENOENT" });

    await store.publish(address, bytes);
    const path = store.pathFor(address);
    await import("node:fs/promises").then(({ writeFile }) => writeFile(path, "changed after expiry scan"));
    await assert.rejects(store.remove(address), /refusing to remove artifact/u);
    assert.equal(await readFile(path, "utf8"), "changed after expiry scan");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("refuses to unlink a symlink stored at an artifact address", async () => {
  const root = await mkdtemp(join(tmpdir(), "stockquant-artifact-remove-link-"));
  const outside = await mkdtemp(join(tmpdir(), "stockquant-artifact-remove-outside-"));
  try {
    const store = new LocalArtifactContentStore(root);
    const bytes = Buffer.from("outside-content");
    const address = { namespace: "research/run-3/outputs", artifactId: "artifact-3", sha256: sha(bytes) };
    const { mkdir, writeFile } = await import("node:fs/promises");
    const path = store.pathFor(address);
    await mkdir(join(path, ".."), { recursive: true });
    const outsidePath = join(outside, "keep.txt");
    await writeFile(outsidePath, bytes);
    await symlink(outsidePath, path);
    await assert.rejects(store.remove(address), /regular file/u);
    assert.deepEqual(await readFile(outsidePath), bytes);
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

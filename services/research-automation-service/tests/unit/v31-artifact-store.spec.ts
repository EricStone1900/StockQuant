import { describe, expect, it } from "vitest";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { artifactPath, FileArtifactStore } from "../../src/adapters/file-artifact-content-store.js";
import { sha256 } from "../../src/application/v31-runtime-guards.js";

describe("V3.1 file artifact store", () => {
  it("publishes content addressed output and is idempotent", async () => {
    const root = mkdtempSync(join(tmpdir(), "stockquant-artifacts-"));
    try {
      const content = new TextEncoder().encode("runner-log");
      const ref = { schemaVersion: "v3.1-artifact-ref-v1" as const, artifactId: "log-1", kind: "RUN_LOG" as const, namespace: "research/run-1/exp-1/outputs", sha256: sha256(content), status: "PENDING" as const, sourceRef: "runner:job-1" };
      const store = new FileArtifactStore(root);
      const published = await store.publish(ref, content);
      expect(published).toMatchObject({ status: "PUBLISHED" });
      await expect(store.publish(ref, content)).resolves.toMatchObject({ status: "PUBLISHED" });
      await expect(store.read(published)).resolves.toEqual(Buffer.from(content));
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("rejects content whose digest differs from the reference", async () => {
    const root = mkdtempSync(join(tmpdir(), "stockquant-artifacts-"));
    try {
      const ref = { schemaVersion: "v3.1-artifact-ref-v1" as const, artifactId: "bad", kind: "ERROR" as const, namespace: "research/run-1/exp-1/outputs", sha256: "a".repeat(64), status: "PENDING" as const, sourceRef: "runner:job-1" };
      await expect(new FileArtifactStore(root).publish(ref, new TextEncoder().encode("wrong"))).rejects.toThrow("sha256");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("detects on-disk corruption before returning published artifact bytes", async () => {
    const root = mkdtempSync(join(tmpdir(), "stockquant-artifacts-"));
    try {
      const content = new TextEncoder().encode("runner-log");
      const ref = { schemaVersion: "v3.1-artifact-ref-v1" as const, artifactId: "log-1", kind: "RUN_LOG" as const, namespace: "research/run-1/exp-1/outputs", sha256: sha256(content), status: "PENDING" as const, sourceRef: "runner:job-1" };
      const store = new FileArtifactStore(root);
      const published = await store.publish(ref, content);
      writeFileSync(artifactPath(root, published), "tampered-runner-log");
      await expect(store.read(published)).rejects.toThrow("stored artifact hash does not match");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("reads legacy published bytes without rewriting them during the shared-store migration", async () => {
    const root = mkdtempSync(join(tmpdir(), "stockquant-artifacts-"));
    try {
      const content = new TextEncoder().encode("legacy-artifact");
      const ref = { schemaVersion: "v3.1-artifact-ref-v1" as const, artifactId: "legacy-1", kind: "OUTPUT" as const, namespace: "research/run-old/exp-old/outputs", sha256: sha256(content), status: "PUBLISHED" as const, sourceRef: "runner:old-job" };
      const legacyPath = join(root, "research", "run-old/exp-old/outputs", ref.artifactId);
      mkdirSync(join(legacyPath, ".."), { recursive: true });
      writeFileSync(legacyPath, content);
      const store = new FileArtifactStore(root);
      await expect(store.read(ref)).resolves.toEqual(Buffer.from(content));
      await expect(store.size(ref)).resolves.toBe(content.byteLength);
      expect(readFileSync(legacyPath)).toEqual(Buffer.from(content));
      expect(existsSync(artifactPath(root, ref))).toBe(false);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("removes failed shared publication bytes without deleting same-named legacy content", async () => {
    const root = mkdtempSync(join(tmpdir(), "stockquant-artifacts-"));
    try {
      const legacy = new TextEncoder().encode("legacy bytes owned by an earlier run");
      const staged = new TextEncoder().encode("new shared publication that failed to commit");
      const ref = { schemaVersion: "v3.1-artifact-ref-v1" as const, artifactId: "same-artifact-id", kind: "OUTPUT" as const, namespace: "research/run-1/exp-1/outputs", sha256: sha256(staged), status: "PENDING" as const, sourceRef: "runner:job-new" };
      const legacyPath = join(root, "research", "run-1/exp-1/outputs", ref.artifactId);
      mkdirSync(join(legacyPath, ".."), { recursive: true });
      writeFileSync(legacyPath, legacy);
      const store = new FileArtifactStore(root);
      const published = await store.publish(ref, staged);

      await store.remove(published);

      expect(readFileSync(legacyPath)).toEqual(Buffer.from(legacy));
      expect(existsSync(artifactPath(root, published))).toBe(false);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("does not republish or read an expired artifact", async () => {
    const root = mkdtempSync(join(tmpdir(), "stockquant-artifacts-"));
    try {
      const content = new TextEncoder().encode("expired-log");
      const ref = { schemaVersion: "v3.1-artifact-ref-v1" as const, artifactId: "expired", kind: "RUN_LOG" as const, namespace: "research/run-1/exp-1/outputs", sha256: sha256(content), status: "EXPIRED" as const, sourceRef: "runner:job-1", expiresAt: "2026-09-01T00:00:00.000Z" };
      const store = new FileArtifactStore(root);
      await expect(store.publish(ref, content)).rejects.toThrow("cannot publish content");
      await expect(store.read(ref)).rejects.toThrow("is not readable");
      await expect(store.size(ref)).rejects.toThrow("is not readable");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});

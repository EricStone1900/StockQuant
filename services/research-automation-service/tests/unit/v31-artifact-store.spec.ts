import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FileArtifactStore } from "../../src/application/v31-artifact-store.js";
import { sha256 } from "../../src/application/v31-runtime-guards.js";

describe("V3.1 file artifact store", () => {
  it("publishes content addressed output and is idempotent", async () => {
    const root = mkdtempSync(join(tmpdir(), "stockquant-artifacts-"));
    try {
      const content = new TextEncoder().encode("runner-log");
      const ref = { schemaVersion: "v3.1-artifact-ref-v1" as const, artifactId: "log-1", kind: "RUN_LOG" as const, namespace: "research/run-1/exp-1/outputs", sha256: sha256(content), status: "PENDING" as const, sourceRef: "runner:job-1" };
      const store = new FileArtifactStore(root);
      await expect(store.publish(ref, content)).resolves.toMatchObject({ status: "PUBLISHED" });
      await expect(store.publish(ref, content)).resolves.toMatchObject({ status: "PUBLISHED" });
      await expect(store.read(ref)).resolves.toEqual(Buffer.from(content));
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("rejects content whose digest differs from the reference", async () => {
    const root = mkdtempSync(join(tmpdir(), "stockquant-artifacts-"));
    try {
      const ref = { schemaVersion: "v3.1-artifact-ref-v1" as const, artifactId: "bad", kind: "ERROR" as const, namespace: "research/run-1/exp-1/outputs", sha256: "a".repeat(64), status: "PENDING" as const, sourceRef: "runner:job-1" };
      await expect(new FileArtifactStore(root).publish(ref, new TextEncoder().encode("wrong"))).rejects.toThrow("sha256");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});

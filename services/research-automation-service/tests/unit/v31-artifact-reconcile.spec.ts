import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, symlinkSync, utimesSync } from "node:fs";
import { readFile, mkdir, writeFile, readdir, lstat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inspectArtifactOrphans, quarantineArtifactOrphans } from "../../src/application/v31-artifact-reconcile.js";
import { sha256, type ArtifactRef } from "../../src/application/v31-runtime-guards.js";

describe("V3.1 artifact orphan reconciliation", () => {
  it("reports only old unreferenced files and quarantines them with a verifiable manifest", async () => {
    const base = mkdtempSync(join(tmpdir(), "stockquant-artifact-reconcile-"));
    const root = join(base, "artifacts");
    const quarantine = join(base, "quarantine");
    const old = join(root, "research/run-1/exp-1/outputs/orphan-1");
    const referenced = join(root, "research/run-1/exp-1/outputs/kept-1");
    const tampered = join(root, "research/run-1/exp-1/outputs/tampered-1");
    const recent = join(root, "research/run-1/exp-1/outputs/recent-1");
    const addressedContent = "content-addressed evidence";
    const addressedHash = sha256(new TextEncoder().encode(addressedContent));
    const addressed = join(root, `research/run-1/exp-1/outputs/${addressedHash}/addressed-1`);
    const qlibContent = "Platform Qlib model";
    const qlibHash = sha256(new TextEncoder().encode(qlibContent));
    const qlib = join(root, `research/testrun-1/qlib-fixture/${qlibHash}/${qlibHash}`);
    try {
      await Promise.all([mkdir(join(root, "research/run-1/exp-1/outputs"), { recursive: true }), mkdir(join(root, `research/run-1/exp-1/outputs/${addressedHash}`), { recursive: true }), mkdir(join(root, `research/testrun-1/qlib-fixture/${qlibHash}`), { recursive: true })]);
      await writeFile(old, "orphan evidence");
      await writeFile(referenced, "referenced evidence");
      await writeFile(tampered, "changed evidence");
      await writeFile(recent, "recent write");
      await writeFile(addressed, addressedContent);
      await writeFile(qlib, qlibContent);
      const oldTime = new Date("2026-09-20T00:00:00.000Z");
      utimesSync(old, oldTime, oldTime);
      utimesSync(qlib, oldTime, oldTime);
      const ref: ArtifactRef = { schemaVersion: "v3.1-artifact-ref-v1", artifactId: "kept-1", kind: "OUTPUT", namespace: "research/run-1/exp-1/outputs", sha256: sha256(new TextEncoder().encode("referenced evidence")), status: "PUBLISHED", sourceRef: "test" };
      const addressedRef: ArtifactRef = { ...ref, artifactId: "addressed-1", sha256: addressedHash };
      const missingRef: ArtifactRef = { ...ref, artifactId: "missing-1", sha256: "a".repeat(64) };
      const tamperedRef: ArtifactRef = { ...ref, artifactId: "tampered-1", sha256: sha256(new TextEncoder().encode("expected evidence")) };
      const report = await inspectArtifactOrphans(root, [ref, addressedRef, missingRef, tamperedRef], { minAgeMs: 24 * 60 * 60 * 1000, now: new Date("2026-09-25T00:00:00.000Z") });
      expect(report).toMatchObject({ scanned: 5, referenced: 3, missingPublishedFiles: [{ namespace: ref.namespace, artifactId: "missing-1", sha256: missingRef.sha256 }], recentUnreferenced: 1, orphans: [{ namespace: ref.namespace, artifactId: "orphan-1", sizeBytes: 15 }] });
      expect(report.hashMismatches).toEqual([{ namespace: ref.namespace, artifactId: "tampered-1", expectedSha256: tamperedRef.sha256, actualSha256: sha256(new TextEncoder().encode("changed evidence")) }]);
      expect(report.orphans[0]?.sha256).toBe(sha256(new TextEncoder().encode("orphan evidence")));
      expect(await readFile(old, "utf8")).toBe("orphan evidence");
      const quarantineAt = new Date("2026-09-25T00:00:01.000Z");
      const moved = await quarantineArtifactOrphans(report, root, quarantine, [ref, addressedRef, missingRef, tamperedRef], quarantineAt);
      expect(moved).toHaveLength(1);
      expect(await readFile(moved[0]!, "utf8")).toBe("orphan evidence");
      const manifest = JSON.parse(await readFile(`${moved[0]}.manifest.json`, "utf8")) as { sha256: string; originalPath: string; artifactId: string; observedAt: string };
      expect(manifest).toMatchObject({ sha256: report.orphans[0]?.sha256, originalPath: report.orphans[0]?.path, artifactId: "orphan-1", observedAt: quarantineAt.toISOString() });
      await expect(readFile(old)).rejects.toMatchObject({ code: "ENOENT" });
      expect(await readFile(referenced, "utf8")).toBe("referenced evidence");
      expect(await readFile(tampered, "utf8")).toBe("changed evidence");
      expect(await readFile(recent, "utf8")).toBe("recent write");
      expect(await readFile(addressed, "utf8")).toBe(addressedContent);
      expect(await readFile(qlib, "utf8")).toBe(qlibContent);
      expect((await readdir(quarantine, { recursive: true })).some((name) => String(name).endsWith(".manifest.json"))).toBe(true);
    } finally { rmSync(base, { recursive: true, force: true }); }
  });

  it("rejects quarantine directories inside the artifact volume", async () => {
    const root = mkdtempSync(join(tmpdir(), "stockquant-artifact-reconcile-"));
    try {
      await mkdir(join(root, "research"));
      await expect(quarantineArtifactOrphans({ scanned: 0, referenced: 0, missingPublishedFiles: [], hashMismatches: [], recentUnreferenced: 0, orphans: [] }, root, join(root, "quarantine"), [])).rejects.toThrow("outside the artifact root");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it("refuses crafted candidates outside the research subtree", async () => {
    const base = mkdtempSync(join(tmpdir(), "stockquant-artifact-reconcile-"));
    const root = join(base, "artifacts");
    const quarantine = join(base, "quarantine");
    const outside = join(root, "metadata", "do-not-move");
    try {
      await mkdir(join(root, "research"), { recursive: true });
      await mkdir(join(root, "metadata"), { recursive: true });
      await writeFile(outside, "protected");
      const report = { scanned: 1, referenced: 0, missingPublishedFiles: [], hashMismatches: [], recentUnreferenced: 0, orphans: [{ namespace: "research/x", artifactId: "do-not-move", path: outside, sizeBytes: 8, sha256: sha256(new TextEncoder().encode("protected")), modifiedAt: new Date().toISOString() }] };
      await expect(quarantineArtifactOrphans(report, root, quarantine, [])).rejects.toThrow("escapes artifact research root");
      expect(await readFile(outside, "utf8")).toBe("protected");
    } finally { rmSync(base, { recursive: true, force: true }); }
  });

  it("refuses Qlib and other non-Research-owned files as quarantine candidates", async () => {
    const base = mkdtempSync(join(tmpdir(), "stockquant-artifact-reconcile-"));
    const root = join(base, "artifacts");
    const quarantine = join(base, "quarantine");
    const content = "Platform Qlib model";
    const digest = sha256(new TextEncoder().encode(content));
    const qlibPath = join(root, `research/test-run/qlib-fixture/${digest}/${digest}`);
    try {
      await mkdir(join(root, `research/test-run/qlib-fixture/${digest}`), { recursive: true });
      await writeFile(qlibPath, content);
      const info = await lstat(qlibPath);
      const crafted = { scanned: 1, referenced: 0, missingPublishedFiles: [], hashMismatches: [], recentUnreferenced: 0, orphans: [{ namespace: `research/test-run/qlib-fixture/${digest}`, artifactId: digest, path: qlibPath, sizeBytes: info.size, sha256: digest, modifiedAt: info.mtime.toISOString() }] };
      await expect(quarantineArtifactOrphans(crafted, root, quarantine, [])).rejects.toThrow("Research-owned Artifact namespaces");
      expect(await readFile(qlibPath, "utf8")).toBe(content);
    } finally { rmSync(base, { recursive: true, force: true }); }
  });

  it("does not follow a symlinked research root during inspection", async () => {
    const base = mkdtempSync(join(tmpdir(), "stockquant-artifact-reconcile-"));
    const root = join(base, "artifacts");
    const external = join(base, "external");
    try {
      await mkdir(root, { recursive: true });
      await mkdir(external, { recursive: true });
      symlinkSync(external, join(root, "research"), "dir");
      await expect(inspectArtifactOrphans(root, [], { minAgeMs: 0 })).rejects.toThrow("research root must be a real directory");
    } finally { rmSync(base, { recursive: true, force: true }); }
  });

  it("refuses to quarantine a candidate that gained an owner reference after check-only", async () => {
    const base = mkdtempSync(join(tmpdir(), "stockquant-artifact-reconcile-"));
    const root = join(base, "artifacts");
    const quarantine = join(base, "quarantine");
    const path = join(root, "research/run-1/exp-1/outputs/orphan-1");
    try {
      await mkdir(join(root, "research/run-1/exp-1/outputs"), { recursive: true });
      await writeFile(path, "candidate");
      const info = await lstat(path);
      const candidate = { namespace: "research/run-1/exp-1/outputs", artifactId: "orphan-1", path, sizeBytes: info.size, sha256: sha256(new TextEncoder().encode("candidate")), modifiedAt: info.mtime.toISOString() };
      const report = { scanned: 1, referenced: 0, missingPublishedFiles: [], hashMismatches: [], recentUnreferenced: 0, orphans: [candidate] };
      const appearedRef: ArtifactRef = { schemaVersion: "v3.1-artifact-ref-v1", artifactId: "orphan-1", kind: "OUTPUT", namespace: candidate.namespace, sha256: candidate.sha256, status: "PUBLISHED", sourceRef: "test" };
      await expect(quarantineArtifactOrphans(report, root, quarantine, [appearedRef])).rejects.toThrow("gained an ArtifactRef after check-only");
      expect(await readFile(path, "utf8")).toBe("candidate");
    } finally { rmSync(base, { recursive: true, force: true }); }
  });
});

import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseV21SnapshotSamplingFixture } from "../../src/application/v21-snapshot-sampling-fixture.js";

const root = resolve(process.cwd(), "../../fixtures/v2/v2.1-snapshot-sampling");

describe("V2.1 snapshot sampling Fixture worker input", () => {
  it("persists the independent late-arrival Fixture as stale instead of changing fresh sample expectations", async () => {
    const manifest = JSON.parse(await readFile(resolve(root, "../v2.1-snapshot-stale/manifest.json"), "utf8"));
    const result = parseV21SnapshotSamplingFixture({ bytes: await readFile(resolve(process.cwd(), "../../", manifest.files[0].path)), manifestVersion: manifest.fixtureVersion, manifestSha256: manifest.files[0].sha256,
      scheduledAt: "2026-10-16T01:50:00.000Z", calendarVersion: "sse-cn-a-share-2026-1", securityIds: ["600000.SH", "000001.SZ"], ingestedAt: "2026-10-16T02:21:00.000Z", availableAt: "2026-10-16T02:21:00.000Z", maxAgeMinutes: 20 });
    expect(result.observations.every((row) => row.ageSeconds === 1860 && row.status === "STALE" && row.freshness === "STALE")).toBe(true);
  });
  it("validates the frozen manifest, schedule instant and scoped securities", async () => {
    const manifest = JSON.parse(await readFile(resolve(root, "manifest.json"), "utf8")) as { fixtureVersion: string; files: Array<{ path: string; sha256: string }> };
    const entry = manifest.files[0]!;
    const result = parseV21SnapshotSamplingFixture({
      bytes: await readFile(resolve(process.cwd(), "../../", entry.path)), manifestVersion: manifest.fixtureVersion,
      manifestSha256: entry.sha256, scheduledAt: "2026-10-16T01:50:00.000Z", calendarVersion: "sse-cn-a-share-2026-1",
      securityIds: ["600000.SH", "000001.SZ"], ingestedAt: "2026-10-16T02:00:00.000Z",
      availableAt: "2026-10-16T02:00:00.000Z", maxAgeMinutes: 20,
    });
    expect(result.fixtureVersion).toBe("v2.1-snapshot-sampling-1");
    expect(result.fixtureSha256).toBe(entry.sha256);
    expect(result.observations).toHaveLength(2);
    expect(result.observations.every((item) => item.observedAt === "2026-10-16T01:50:00.000Z")).toBe(true);
    expect(result.observations[0]).toMatchObject({ sourceId: "fixture:v2.1-snapshot-sampling-1", dataMode: "FIXTURE", ingestedAt: "2026-10-16T02:00:00.000Z", availableAt: "2026-10-16T02:00:00.000Z", ageSeconds: 600, freshness: "FRESH" });
  });

  it("rejects tampered bytes, schedule mismatch and scope expansion", async () => {
    const manifest = JSON.parse(await readFile(resolve(root, "manifest.json"), "utf8")) as { fixtureVersion: string; files: Array<{ path: string; sha256: string }> };
    const bytes = await readFile(resolve(process.cwd(), "../../", manifest.files[0]!.path));
    const common = { bytes, manifestVersion: manifest.fixtureVersion, manifestSha256: manifest.files[0]!.sha256, calendarVersion: "sse-cn-a-share-2026-1", securityIds: ["600000.SH"], ingestedAt: "2026-10-16T02:00:00.000Z", availableAt: "2026-10-16T02:00:00.000Z", maxAgeMinutes: 20 };
    expect(() => parseV21SnapshotSamplingFixture({ ...common, bytes: Buffer.concat([bytes, Buffer.from(" ")]), scheduledAt: "2026-10-16T01:50:00.000Z" })).toThrow("SNAPSHOT_FIXTURE_HASH_MISMATCH");
    expect(() => parseV21SnapshotSamplingFixture({ ...common, scheduledAt: "2026-10-16T02:10:00.000Z" })).toThrow("SNAPSHOT_FIXTURE_INSTANT_MISMATCH");
    expect(() => parseV21SnapshotSamplingFixture({ ...common, scheduledAt: "2026-10-16T01:50:00.000Z" })).toThrow("SNAPSHOT_FIXTURE_SCOPE_MISMATCH");
  });

  it("retains unknown source time as UNKNOWN instead of READY", async () => {
    const manifest = JSON.parse(await readFile(resolve(root, "manifest.json"), "utf8")) as { fixtureVersion: string; files: Array<{ path: string; sha256: string }> };
    const original = await readFile(resolve(process.cwd(), "../../", manifest.files[0]!.path), "utf8");
    const bytes = Buffer.from(original.replace('"observedAt": "2026-10-16T09:50:00+08:00"', '"observedAt": null'));
    const result = parseV21SnapshotSamplingFixture({
      bytes, manifestVersion: manifest.fixtureVersion, manifestSha256: createHash("sha256").update(bytes).digest("hex"),
      scheduledAt: "2026-10-16T01:50:00.000Z", calendarVersion: "sse-cn-a-share-2026-1",
      securityIds: ["600000.SH", "000001.SZ"], ingestedAt: "2026-10-16T02:00:00.000Z",
      availableAt: "2026-10-16T02:00:00.000Z", maxAgeMinutes: 20,
    });
    expect(result.observations[0]).toMatchObject({ observedAt: null, ageSeconds: null, freshness: "UNKNOWN", status: "UNKNOWN" });
  });
});

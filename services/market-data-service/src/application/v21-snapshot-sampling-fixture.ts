import { createHash } from "node:crypto";
import type { SnapshotSamplingObservation } from "../ports/snapshot-observation.js";
import { classifyQuoteAge } from "./v21-market-observation.js";

const fixtureVersions = new Set(["v2.1-snapshot-sampling-1", "v2.1-snapshot-stale-1"]);
type FixtureObservation = Pick<SnapshotSamplingObservation, "snapshotId" | "securityId" | "observedAt" | "price" | "status">;

export function parseV21SnapshotSamplingFixture(input: {
  bytes: Buffer;
  manifestVersion: string | undefined;
  manifestSha256: string | undefined;
  scheduledAt: string;
  calendarVersion: string;
  securityIds: string[];
  ingestedAt: string;
  availableAt: string;
  maxAgeMinutes: number;
}): { fixtureVersion: string; fixtureSha256: string; observations: SnapshotSamplingObservation[] } {
  const fixtureSha256 = createHash("sha256").update(input.bytes).digest("hex");
  if (!input.manifestVersion || !fixtureVersions.has(input.manifestVersion) || !input.manifestSha256) throw new Error("SNAPSHOT_FIXTURE_MANIFEST_INVALID");
  if (fixtureSha256 !== input.manifestSha256) throw new Error("SNAPSHOT_FIXTURE_HASH_MISMATCH");
  const fixture = JSON.parse(input.bytes.toString("utf8")) as {
    fixtureVersion?: string;
    dataMode?: string;
    market?: string;
    calendarVersion?: string;
    observations?: FixtureObservation[];
  };
  if (fixture.fixtureVersion !== input.manifestVersion || fixture.dataMode !== "FIXTURE" || fixture.market !== "CN_A" || fixture.calendarVersion !== input.calendarVersion || !Array.isArray(fixture.observations) || fixture.observations.length === 0) throw new Error("SNAPSHOT_FIXTURE_INVALID");
  const observations = fixture.observations.map((item) => {
    if (!item.snapshotId || !item.securityId || item.status !== "READY" || !/^\d+\.\d{4}$/u.test(item.price) || (item.observedAt != null && !Number.isFinite(Date.parse(item.observedAt)))) throw new Error("SNAPSHOT_FIXTURE_INVALID");
    const observedAt = item.observedAt == null ? null : new Date(item.observedAt).toISOString();
    const age = classifyQuoteAge({ observedAt, ingestedAt: input.ingestedAt }, input.availableAt, input.maxAgeMinutes);
    return {
      ...item,
      sourceId: `fixture:${input.manifestVersion}`,
      dataMode: "FIXTURE" as const,
      observedAt,
      ingestedAt: input.ingestedAt,
      availableAt: input.availableAt,
      ageSeconds: age.ageSeconds,
      freshness: age.freshness,
      status: age.freshness === "FRESH" ? "READY" as const : age.freshness,
    };
  });
  if (observations.some((item) => item.observedAt !== null && item.observedAt !== input.scheduledAt)) throw new Error("SNAPSHOT_FIXTURE_INSTANT_MISMATCH");
  if (input.securityIds.length > 0 && observations.some((item) => !input.securityIds.includes(item.securityId))) throw new Error("SNAPSHOT_FIXTURE_SCOPE_MISMATCH");
  return { fixtureVersion: input.manifestVersion, fixtureSha256, observations };
}

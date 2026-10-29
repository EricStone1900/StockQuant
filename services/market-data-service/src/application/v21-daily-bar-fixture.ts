import { createHash } from "node:crypto";
import { validateDailyBarCompletion, type DailyBarCompletionRequest, type DailyBarCompletionResult, type DailyBarFixtureRow } from "./v21-daily-bar-completion.js";

type DailyFixture = {
  fixtureId: string;
  fixtureVersion: string;
  dataMode: "FIXTURE";
  barType: "DAILY_BAR";
  sourceId: string;
  dataVersion: string;
  sessionDate: string;
  sessionCloseAt: string;
  completionRequestedAt: string;
  availableAt: string;
  expectedSecurityIds: string[];
  bars: DailyBarFixtureRow[];
};

const fixtureSpecs: Record<string, { fixtureId: string; sourceId: string }> = {
  "v2.1-daily-bars-1": { fixtureId: "v2.1-daily-bar-completion", sourceId: "fixture:v2.1-daily-bars-1" },
  "v24-c5-daily-bars-1": { fixtureId: "v24-c5-daily-bar-completion", sourceId: "fixture:v24-c5-daily-bars-1" },
  "v24-c5-prior-20261014-1": { fixtureId: "v24-c5-prior-20261014", sourceId: "fixture:v24-c5-prior-daily-1" },
  "v24-c5-prior-20261015-1": { fixtureId: "v24-c5-prior-20261015", sourceId: "fixture:v24-c5-prior-daily-1" }
};
for (const date of ["20240102", "20240103", "20240104", "20240105", "20240108", "20240109", "20240110"]) {
  fixtureSpecs[`v24-c5-local-daily-${date}-1`] = { fixtureId: `v24-c5-local-daily-${date}`, sourceId: "fixture:v24-c5-local-daily-1" };
}

export function parseV21DailyBarCompletionFixture(input: { bytes: Uint8Array; manifestVersion: string; expectedSha256: string; scope: DailyBarCompletionRequest["scope"] }): DailyBarCompletionResult {
  const spec = fixtureSpecs[input.manifestVersion];
  if (!spec) throw new Error("DAILY_BAR_FIXTURE_VERSION_MISMATCH");
  const actualSha256 = createHash("sha256").update(input.bytes).digest("hex");
  if (!/^[a-f0-9]{64}$/u.test(input.expectedSha256) || actualSha256 !== input.expectedSha256) throw new Error("DAILY_BAR_FIXTURE_HASH_MISMATCH");
  let fixture: DailyFixture;
  try {
    fixture = JSON.parse(Buffer.from(input.bytes).toString("utf8")) as DailyFixture;
  } catch {
    throw new Error("DAILY_BAR_FIXTURE_JSON_INVALID");
  }
  if (fixture.fixtureId !== spec.fixtureId || fixture.fixtureVersion !== input.manifestVersion || fixture.sourceId !== spec.sourceId || fixture.dataMode !== "FIXTURE" || fixture.barType !== "DAILY_BAR") throw new Error("DAILY_BAR_FIXTURE_SEMANTICS_INVALID");
  return validateDailyBarCompletion({
    sourceId: fixture.sourceId,
    dataMode: fixture.dataMode,
    scope: input.scope,
    fixtureVersion: fixture.fixtureVersion,
    dataVersion: fixture.dataVersion,
    sessionDate: fixture.sessionDate,
    expectedSecurityIds: fixture.expectedSecurityIds,
    bars: fixture.bars,
    sessionCloseAt: fixture.sessionCloseAt,
    completionRequestedAt: fixture.completionRequestedAt,
    availableAt: fixture.availableAt,
  }, { sourceAuthorized: false });
}

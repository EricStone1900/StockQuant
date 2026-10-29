import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { validateDailyBarCompletion, type DailyBarCompletionRequest } from "../../src/application/v21-daily-bar-completion.js";
import { parseV21DailyBarCompletionFixture } from "../../src/application/v21-daily-bar-fixture.js";

const base: DailyBarCompletionRequest = {
  sourceId: "fixture:v2.1-daily-bars-1", dataMode: "FIXTURE", scope: { market: "CN_A", ownerId: "fixture-owner", accountId: null, namespace: null, testRunId: null }, fixtureVersion: "v2.1-daily-bars-1", dataVersion: "daily-bars-cn-2026-10-16-v1", sessionDate: "2026-10-16",
  expectedSecurityIds: ["600000.SH", "000001.SZ"],
  bars: [
    { securityId: "600000.SH", sessionDate: "2026-10-16", open: "10.10", high: "10.50", low: "10.00", close: "10.25", volume: 1200, amount: "12240.00" },
    { securityId: "000001.SZ", sessionDate: "2026-10-16", open: "12.00", high: "12.60", low: "11.90", close: "12.34", volume: 900, amount: "11070.00" },
  ],
  sessionCloseAt: "2026-10-16T07:00:00.000Z", completionRequestedAt: "2026-10-16T07:01:00.000Z", availableAt: "2026-10-16T07:02:00.000Z",
};

describe("V2.1 independent DAILY_BAR completion gate", () => {
  const fixtureGate = { sourceAuthorized: false };
  it("loads each frozen local C5 daily bar under the same source version and exact session", async () => {
    const days = ["20240102", "20240103", "20240104", "20240105", "20240108", "20240109", "20240110"];
    const closes = ["10.0000", "10.2500", "10.0000", "10.0000", "10.0000", "10.0000", "10.0000"];
    const completions = [];
    for (const [index, day] of days.entries()) {
      const folder = resolve(process.cwd(), `../../fixtures/v2/v2.4/c5-local-daily-${day}`);
      const manifest = JSON.parse(await readFile(resolve(folder, "manifest.json"), "utf8")) as { fixtureVersion: string; files: Array<{ sha256: string }> };
      const bytes = await readFile(resolve(folder, "bars.json"));
      const completion = parseV21DailyBarCompletionFixture({ bytes, manifestVersion: manifest.fixtureVersion, expectedSha256: manifest.files[0]!.sha256, scope: base.scope });
      expect(completion).toMatchObject({ status: "COMPLETED_FIXTURE", sourceId: "fixture:v24-c5-local-daily-1", dataVersion: "v24-c5-local-daily-1", sessionDate: `2024-01-${day.slice(-2)}`, bars: [{ securityId: "600000.SH", close: closes[index] }] });
      completions.push(completion.completionId);
    }
    expect(new Set(completions).size).toBe(7);
  });
  it("loads and verifies the frozen standalone DAILY_BAR Fixture", async () => {
    const root = resolve(process.cwd(), "../../fixtures/v2/v2.1-daily-bar-completion");
    const manifest = JSON.parse(await readFile(resolve(root, "manifest.json"), "utf8")) as { fixtureVersion: string; files: Array<{ path: string; sha256: string }> };
    const result = parseV21DailyBarCompletionFixture({ bytes: await readFile(resolve(process.cwd(), "../../", manifest.files[0]!.path)), manifestVersion: manifest.fixtureVersion, expectedSha256: manifest.files[0]!.sha256, scope: base.scope });
    expect(result.status).toBe("COMPLETED_FIXTURE");
    expect(result.dataVersion).toBe("daily-bars-cn-2026-10-16-v1");
    expect(result.bars).toHaveLength(2);
  });

  it("loads the C5 three-security Fixture only under its registered immutable version", async () => {
    const root = resolve(process.cwd(), "../../fixtures/v2/v2.4/c5-daily-bar-completion");
    const manifest = JSON.parse(await readFile(resolve(root, "manifest.json"), "utf8")) as { fixtureVersion: string; files: Array<{ path: string; sha256: string }> };
    const scope = { market: "CN_A" as const, ownerId: "fixture-owner", accountId: "c5-account", namespace: "c5-run", testRunId: "c5-run" };
    const bytes = await readFile(resolve(process.cwd(), "../../", manifest.files[0]!.path));
    const result = parseV21DailyBarCompletionFixture({ bytes, manifestVersion: manifest.fixtureVersion, expectedSha256: manifest.files[0]!.sha256, scope });
    expect(result.status).toBe("COMPLETED_FIXTURE");
    expect(result.fixtureVersion).toBe("v24-c5-daily-bars-1");
    expect(result.bars.map((bar) => bar.securityId)).toEqual(["000001.SZ", "600000.SH", "600519.SH"]);
  });

  it("loads both frozen C5 prior-session fixtures with the same source and data version", async () => {
    const results = [];
    for (const day of ["20261014", "20261015"]) {
      const root = resolve(process.cwd(), `../../fixtures/v2/v2.4/c5-prior-daily-${day}`);
      const manifest = JSON.parse(await readFile(resolve(root, "manifest.json"), "utf8")) as { fixtureVersion: string; files: Array<{ path: string; sha256: string }> };
      const bytes = await readFile(resolve(process.cwd(), "../../", manifest.files[0]!.path));
      results.push(parseV21DailyBarCompletionFixture({ bytes, manifestVersion: manifest.fixtureVersion, expectedSha256: manifest.files[0]!.sha256, scope: base.scope }));
    }
    expect(results.map((result) => result.sessionDate)).toEqual(["2026-10-14", "2026-10-15"]);
    expect(results.map((result) => result.bars[0]?.close)).toEqual(["10.0000", "10.2500"]);
    expect(results.every((result) => result.status === "COMPLETED_FIXTURE" && result.sourceId === "fixture:v24-c5-prior-daily-1" && result.dataVersion === "v24-c5-prior-daily-1")).toBe(true);
    expect(results[0].completionId).not.toBe(results[1].completionId);
  });

  it("rejects a Fixture whose bytes or version differ from its frozen manifest", async () => {
    const root = resolve(process.cwd(), "../../fixtures/v2/v2.1-daily-bar-completion");
    const manifest = JSON.parse(await readFile(resolve(root, "manifest.json"), "utf8")) as { fixtureVersion: string; files: Array<{ path: string; sha256: string }> };
    const bytes = await readFile(resolve(process.cwd(), "../../", manifest.files[0]!.path));
    expect(() => parseV21DailyBarCompletionFixture({ bytes: Buffer.concat([bytes, Buffer.from(" ")]), manifestVersion: manifest.fixtureVersion, expectedSha256: manifest.files[0]!.sha256, scope: base.scope })).toThrow("DAILY_BAR_FIXTURE_HASH_MISMATCH");
    expect(() => parseV21DailyBarCompletionFixture({ bytes, manifestVersion: "v2.1-daily-bars-0", expectedSha256: manifest.files[0]!.sha256, scope: base.scope })).toThrow("DAILY_BAR_FIXTURE_VERSION_MISMATCH");
  });

  it("completes a fully available versioned Fixture with a stable identity", () => {
    const result = validateDailyBarCompletion(base, fixtureGate);
    expect(result.status).toBe("COMPLETED_FIXTURE");
    expect(result.bars).toHaveLength(2);
    expect(result.completionId).toMatch(/^dailybar:[a-f0-9]{64}$/u);
    expect(validateDailyBarCompletion({ ...base, bars: [...base.bars].reverse() }, fixtureGate).completionId).toBe(result.completionId);
    expect(validateDailyBarCompletion({ ...base, scope: { ...base.scope, testRunId: "another-run" } }, fixtureGate).completionId).not.toBe(result.completionId);
  });

  it("rejects quote snapshots, incomplete batches and requests before market close", () => {
    expect(validateDailyBarCompletion({ ...base, sourceId: "snapshot:tencent-quote" }, fixtureGate).reason).toBe("INDEPENDENT_DAILY_BAR_SOURCE_REQUIRED");
    expect(validateDailyBarCompletion({ ...base, bars: base.bars.slice(0, 1) }, fixtureGate).reason).toBe("DAILY_BAR_COVERAGE_INCOMPLETE");
    expect(validateDailyBarCompletion({ ...base, completionRequestedAt: "2026-10-16T06:59:00.000Z" }, fixtureGate).reason).toBe("SESSION_NOT_CLOSED");
    expect(validateDailyBarCompletion({ ...base, availableAt: "2026-10-16T07:00:30.000Z" }, fixtureGate).reason).toBe("DAILY_BAR_NOT_AVAILABLE");
  });

  it("rejects duplicate, out-of-scope, wrong-session and invalid OHLCV rows", () => {
    expect(validateDailyBarCompletion({ ...base, bars: [base.bars[0]!, base.bars[0]!] }, fixtureGate).reason).toBe("DAILY_BAR_SCOPE_OR_DUPLICATE_MISMATCH");
    expect(validateDailyBarCompletion({ ...base, bars: [{ ...base.bars[0]!, sessionDate: "2026-10-15" }, base.bars[1]!] }, fixtureGate).reason).toBe("DAILY_BAR_SESSION_MISMATCH");
    expect(validateDailyBarCompletion({ ...base, bars: [{ ...base.bars[0]!, high: "9.00" }, base.bars[1]!] }, fixtureGate).reason).toBe("DAILY_BAR_VALUE_INVALID");
    expect(validateDailyBarCompletion({ ...base, bars: [{ ...base.bars[0]!, high: "10.099999999999999999" }, base.bars[1]!] }, fixtureGate).reason).toBe("DAILY_BAR_VALUE_INVALID");
  });

  it("blocks unauthorized real sources and rejects missing source versions", () => {
    const real = { ...base, dataMode: "REAL" as const, fixtureVersion: null, sourceId: "tencent-daily-bars", sourceAuthorized: false };
    expect(validateDailyBarCompletion(real, { sourceAuthorized: false }).status).toBe("BLOCKED_SOURCE_AUTHORIZATION");
    expect(validateDailyBarCompletion({ ...base, fixtureVersion: null }, { sourceAuthorized: false }).reason).toBe("DAILY_BAR_VERSION_REQUIRED");
  });
});

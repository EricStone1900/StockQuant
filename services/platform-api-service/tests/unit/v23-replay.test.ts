import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { parseReplayBars, V23ReplayEngine } from "../../src/application/v23-replay.js";

const fixturePath = resolve(process.cwd(), "../../fixtures/v2/v2.3/replay_bars.csv");
async function fixture() { return parseReplayBars(await readFile(fixturePath, "utf8")); }

describe("V2.3 deterministic replay", () => {
  it("uses the frozen fixture and executes the signal only on the next available bar", async () => {
    const result = new V23ReplayEngine().run("normal", 20260907, await fixture());
    expect(result.status).toBe("COMPLETED");
    expect(result.evidence.fixtureHash).toBeTypeOf("string");
    const normal = result.evidence.normal as { signal: { executedAt: string; visibleAt: string }; fills: Array<{ quantity: number; fee: number }>; cash: number };
    expect(normal.signal.executedAt).toBe("2024-01-03T09:31:00+08:00");
    expect(normal.signal.executedAt > normal.signal.visibleAt).toBe(true);
    expect(normal.fills[0].quantity).toBe(50);
    expect(normal.fills[0].fee).toBe(0.5105);
    expect(normal.cash).toBe(9488.9795);
  });

  it("rejects unavailable execution inputs without creating a fill", async () => {
    const result = new V23ReplayEngine().run("rejection", 20260907, await fixture());
    expect(result.status).toBe("COMPLETED");
    expect(result.evidence.rejections).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "FUTURE_DATA", fillId: null }),
      expect.objectContaining({ code: "ZERO_VOLUME", fillId: null }),
      expect.objectContaining({ code: "MISSING_BAR", fillId: null })
    ]));
  });

  it("restores a serialized checkpoint to the same canonical result", async () => {
    const result = new V23ReplayEngine().run("recovery", 20260907, await fixture());
    const recovery = result.evidence.recovery as { reference: string; resumed: string };
    expect(recovery.resumed).toBe(recovery.reference);
    expect(result.assertions[0].status).toBe("PASS");
  });

  it("fails fast when the fixture contract is malformed", () => {
    expect(() => parseReplayBars("security,timestamp\n600000.SH,2024-01-02")).toThrow("V2.3 fixture header is invalid");
  });
});

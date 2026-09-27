import { describe, expect, it } from "vitest";
import { isReplayTestRunId, parseHistoricalReplayCommand, parseHistoricalReplayMultiCommand } from "../../src/domain/commands.js";

const command = {
  testRunId: "8bc14c23-4619-4a0e-80a9-f4d239576cbe", namespace: "v2-3-normal-8bc14c23-4619-4a0e-80a9-f4d239576cbe",
  ownerId: "acceptance-owner-1", scenarioId: "normal", seed: 20260907,
  bar: { timestamp: "2024-01-02T09:31:00+08:00", open: "10.0000", volume: 1000 },
};
const { bar, ...base } = command;

describe("historical replay HTTP command contract", () => {
  it("accepts the canonical single-bar and multi-bar request shapes", () => {
    expect(parseHistoricalReplayCommand(command)).toEqual(command);
    expect(parseHistoricalReplayMultiCommand({ ...base, bars: [bar] })).toMatchObject({ bars: [bar] });
  });

  it.each([
    ["non-UUID run", { ...command, testRunId: "run-1" }],
    ["unknown command key", { ...command, accountId: "cross-boundary-field" }],
    ["unversioned time", { ...command, bar: { ...command.bar, timestamp: "2024-01-02T09:31:00" } }],
    ["imprecise price", { ...command, bar: { ...command.bar, open: "10.00001" } }],
    ["negative volume", { ...command, bar: { ...command.bar, volume: -1 } }],
  ])("rejects %s", (_label, value) => expect(() => parseHistoricalReplayCommand(value)).toThrow());

  it("rejects an empty multi-bar replay and validates control-route run IDs", () => {
    expect(() => parseHistoricalReplayMultiCommand({ ...base, bars: [] })).toThrow("at least one");
    expect(isReplayTestRunId(command.testRunId)).toBe(true);
    expect(isReplayTestRunId("not-a-uuid")).toBe(false);
  });
});

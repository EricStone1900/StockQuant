import { describe, expect, it } from "vitest";
import { createResearchCheckpoint, hashResearchCheckpointState } from "../../src/domain/research-checkpoint.js";

const experimentId = "11111111-1111-4111-8111-111111111111";
const testRunId = "22222222-2222-4222-8222-222222222222";
const at = new Date("2026-10-03T00:00:00.000Z");

describe("research checkpoint envelope", () => {
  it("hashes canonical JSON independent of object key order", () => {
    expect(hashResearchCheckpointState({ b: 2, a: { y: true, x: 1 } })).toBe(hashResearchCheckpointState({ a: { x: 1, y: true }, b: 2 }));
  });

  it("binds a validated envelope to its experiment and stores its state hash", () => {
    const checkpoint = createResearchCheckpoint(experimentId, {
      schemaVersion: "v3.3-research-checkpoint-v1", testRunId, roundIndex: 2, sequence: 1, state: { cursor: 42 },
    }, at);
    expect(checkpoint).toMatchObject({ experimentId, testRunId, roundIndex: 2, sequence: 1, stateSha256: hashResearchCheckpointState({ cursor: 42 }) });
  });

  it("rejects out-of-range rounds, non-JSON state and oversized state", () => {
    const base = { schemaVersion: "v3.3-research-checkpoint-v1", testRunId, roundIndex: 1, sequence: 1, state: {} };
    expect(() => createResearchCheckpoint(experimentId, { ...base, roundIndex: 4 }, at)).toThrow(/roundIndex/u);
    expect(() => createResearchCheckpoint(experimentId, { ...base, state: { value: Number.NaN } }, at)).toThrow(/non-finite/u);
    expect(() => createResearchCheckpoint(experimentId, { ...base, state: { value: "x".repeat(256 * 1024) } }, at)).toThrow(/256 KiB/u);
  });
});

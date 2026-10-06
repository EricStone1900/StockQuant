import { describe, expect, it } from "vitest";
import { assertNoLegacyNonterminalRows, expectedLegacyShadowInsertCount } from "../../src/application/v11-legacy-migration-preflight.js";

describe("V1.1 legacy migration preflight", () => {
  it("allows an already partially copied shadow and calculates only the missing rows", () => {
    expect(expectedLegacyShadowInsertCount({ sourceRows: 49, shadowRows: 44 })).toBe(5);
  });

  it("allows first-copy and already-complete snapshots with their exact insertion counts", () => {
    expect(expectedLegacyShadowInsertCount({ sourceRows: 49, shadowRows: 0 })).toBe(49);
    expect(expectedLegacyShadowInsertCount({ sourceRows: 49, shadowRows: 49 })).toBe(0);
  });

  it("rejects every unresolved legacy nonterminal run, including stale rows, and a shadow larger than its source", () => {
    // The count covers all QUEUED/RUNNING/WAITING rows, not just a recent time window.
    expect(() => assertNoLegacyNonterminalRows(3)).toThrow(/operator disposition/u);
    expect(() => expectedLegacyShadowInsertCount({ sourceRows: 49, shadowRows: 50 })).toThrow(/exceeds the legacy source/u);
  });

  it("rejects malformed counts", () => {
    expect(() => expectedLegacyShadowInsertCount({ sourceRows: -1, shadowRows: 0 })).toThrow(/safe integers/u);
    expect(() => expectedLegacyShadowInsertCount({ sourceRows: 1.5, shadowRows: 0 })).toThrow(/safe integers/u);
    expect(() => assertNoLegacyNonterminalRows(-1)).toThrow(/safe integer/u);
  });
});

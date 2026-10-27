import { describe, expect, it } from "vitest";
import { checkHistoricalContext, historicalContentSha256, type HistoricalContextVersion } from "../../src/domain/historical-context.js";

const refs = { securityUniverseVersion: "universe-1", marketRuleSetVersion: "rules-1", corporateActionVersion: "actions-1" };
const membership = [{ securityId: "600000.SH", validFrom: "2026-01-01T00:00:00.000Z", validTo: "2026-12-31T23:59:59.999Z" }];
const records: Record<string, HistoricalContextVersion> = {
  SECURITY_UNIVERSE: { kind: "SECURITY_UNIVERSE", version: "universe-1", content: { securities: membership }, sha256: historicalContentSha256({ securities: membership }), validFrom: "2026-01-01T00:00:00.000Z", validTo: "2026-12-31T23:59:59.999Z", sourceReference: "fixture://universe", attestedBy: "local-owner" },
  MARKET_RULE_SET: { kind: "MARKET_RULE_SET", version: "rules-1", content: { market: "CN_A", sessions: [{ start: "09:30", end: "11:30" }] }, sha256: historicalContentSha256({ market: "CN_A", sessions: [{ start: "09:30", end: "11:30" }] }), validFrom: "2026-01-01T00:00:00.000Z", validTo: "2026-12-31T23:59:59.999Z", sourceReference: "fixture://rules", attestedBy: "local-owner" },
  CORPORATE_ACTIONS: { kind: "CORPORATE_ACTIONS", version: "actions-1", content: { securities: membership, actions: [] }, sha256: historicalContentSha256({ securities: membership, actions: [] }), validFrom: "2026-01-01T00:00:00.000Z", validTo: "2026-12-31T23:59:59.999Z", sourceReference: "fixture://actions", attestedBy: "local-owner" },
};
const input = { refs, records, from: "2026-06-01T01:30:00.000Z", to: "2026-06-01T02:00:00.000Z", securities: ["600000.SH"], market: "CN_A" };

describe("historical context replay readiness", () => {
  it("accepts fully resolved, hash-matched versions that cover the imported time and securities", () => {
    expect(checkHistoricalContext(input)).toMatchObject({ status: "READY", reasons: [], securities: ["600000.SH"] });
  });

  it("blocks missing and unknown version references", () => {
    const result = checkHistoricalContext({ ...input, refs: { ...refs, marketRuleSetVersion: null }, records: { ...records, SECURITY_UNIVERSE: undefined } });
    expect(result.status).toBe("BLOCKED");
    expect(result.reasons).toEqual(expect.arrayContaining(["MARKET_RULE_SET_REFERENCE_MISSING"]));
  });

  it("blocks validity gaps, hash tampering and incomplete security coverage", () => {
    const tampered = { ...records, SECURITY_UNIVERSE: { ...records.SECURITY_UNIVERSE!, content: { securities: [{ securityId: "000001.SZ", validFrom: "2026-01-01T00:00:00.000Z", validTo: "2026-12-31T23:59:59.999Z" }] } } };
    const result = checkHistoricalContext({ ...input, records: tampered, to: "2027-01-01T00:00:00.000Z", securities: ["600000.SH", "000001.SZ"] });
    expect(result.status).toBe("BLOCKED");
    expect(result.reasons).toEqual(expect.arrayContaining(["SECURITY_UNIVERSE_CONTENT_HASH_MISMATCH", "SECURITY_UNIVERSE_VALIDITY_OUT_OF_RANGE", "SECURITY_UNIVERSE_COVERAGE_INCOMPLETE", "CORPORATE_ACTIONS_VALIDITY_OUT_OF_RANGE", "CORPORATE_ACTIONS_COVERAGE_INCOMPLETE"]));
  });
});

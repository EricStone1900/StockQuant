import { describe, expect, it } from "vitest";
import { isV24PaperApprovalConfigured } from "../../src/application/v24-paper-approval.js";
const now = new Date("2026-10-24T08:00:00Z");
const approved = (): Record<string, string> => ({ STOCKQUANT_V24_CONTINUOUS_PAPER_APPROVED: "true", ...Object.fromEntries(["MANDATE_REF", "STRATEGY_VERSION", "ACCOUNT_REF", "RISK_POLICY_VERSION", "COST_POLICY_VERSION"].map((key) => [`STOCKQUANT_V24_PAPER_${key}`, "test-reference"])), STOCKQUANT_V24_PAPER_EFFECTIVE_UNTIL: "2026-10-25T08:00:00Z" });
describe("C5 Paper approval configuration", () => {
  it("accepts complete future-dated references", () => expect(isV24PaperApprovalConfigured(approved(), now)).toBe(true));
  it.each(Object.keys(approved()))("rejects a missing %s", (key) => {
    const env = approved(); delete env[key]; expect(isV24PaperApprovalConfigured(env, now)).toBe(false);
  });
  it.each(["garbage", "2026-10-24T08:00:00Z", "2026-10-23T08:00:00Z", "2026-10-25"])("rejects invalid or expired validity %s", (until) => {
    expect(isV24PaperApprovalConfigured({ ...approved(), STOCKQUANT_V24_PAPER_EFFECTIVE_UNTIL: until }, now)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { validateGapRequest } from "../../src/application/coverage-request.js";

const valid = { subscriptionId: "sub", fromDate: "2026-09-14", toDate: "2026-09-14", securityIds: ["600000.SH"], gaps: [] };

describe("validateGapRequest", () => {
  it("accepts an empty gap list for a non-empty scoped security set", () => {
    expect(validateGapRequest(valid)).toMatchObject({ ok: true });
  });

  it.each([
    [{ ...valid, fromDate: "2026-02-30" }, "INVALID_GAP_DATE_RANGE"],
    [{ ...valid, fromDate: "2026-09-15", toDate: "2026-09-14" }, "INVALID_GAP_DATE_RANGE"],
    [{ ...valid, securityIds: [] }, "INVALID_GAP_SECURITIES"],
    [{ ...valid, securityIds: ["600000.SH", "600000.SH"] }, "DUPLICATE_GAP_SECURITIES"],
    [{ ...valid, gaps: [{ gapId: "g", securityId: "000001.SZ", barStart: "2026-09-14T01:30:00Z", barEnd: "2026-09-14T01:35:00Z", reason: "MISSING", priority: "P1" }] }, "GAP_SECURITY_OUT_OF_SCOPE"],
    [{ ...valid, gaps: [{ gapId: "g", securityId: "600000.SH", barStart: "2026-09-13T15:55:00Z", barEnd: "2026-09-13T16:00:00Z", reason: "MISSING", priority: "P1" }] }, "INVALID_GAP_BAR_RANGE"],
  ])("rejects invalid boundary input", (body, code) => {
    expect(validateGapRequest(body).ok).toBe(false);
    expect(validateGapRequest(body)).toMatchObject({ ok: false, code });
  });
});

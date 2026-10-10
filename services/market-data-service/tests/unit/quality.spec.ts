import { describe, expect, it } from "vitest";
import { canPublishV12DailyFixture, parseV12DailyFixture, validateV12DailyBars } from "../../src/application/v12-daily-fixture.js";

const header = "security_id,ticker,date,open,high,low,close,volume,adjustment";
const row = "cn-1,000001.SZ,2024-01-02,10.00,10.20,9.90,10.10,100,raw";
const asOf = "2024-01-03";

function report(csv: string) {
  const parsed = parseV12DailyFixture(csv);
  return validateV12DailyBars(parsed.bars, asOf, parsed.structuralErrors);
}

describe("V1.2 daily Fixture quality and publication gate", () => {
  it("keeps valid raw rows mapped to a security and eligible for immutable publication", () => {
    const parsed = parseV12DailyFixture(`${header}\n${row}`);
    expect(parsed.bars).toMatchObject([{ securityId: "cn-1", ticker: "000001.SZ", adjustment: "raw" }]);
    const quality = validateV12DailyBars(parsed.bars, asOf, parsed.structuralErrors);
    expect(quality).toEqual({ status: "READY", errors: [] });
    expect(canPublishV12DailyFixture(quality)).toBe(true);
  });

  it.each([
    ["future dates", `${header}\ncn-1,000001.SZ,2024-01-04,10,11,9,10,100,raw`, "FUTURE_DATA"],
    ["invalid OHLC", `${header}\ncn-1,000001.SZ,2024-01-02,10,9,9.5,10,100,raw`, "OHLC_INVALID"],
    ["non-numeric values", `${header}\ncn-1,000001.SZ,2024-01-02,open,11,9,10,100,raw`, "NUMERIC_VALUE_INVALID"],
    ["missing numeric values", `${header}\ncn-1,000001.SZ,2024-01-02,,11,9,10,100,raw`, "NUMERIC_VALUE_MISSING"],
    ["negative volume", `${header}\ncn-1,000001.SZ,2024-01-02,10,11,9,10,-1,raw`, "VOLUME_INVALID"],
    ["unmapped security", `${header}\n,000001.SZ,2024-01-02,10,11,9,10,100,raw`, "SECURITY_MAPPING_MISSING"],
    ["duplicate security/date", `${header}\n${row}\n${row}`, "BAR_DUPLICATE"],
    ["unsupported adjustment semantics", `${header}\ncn-1,000001.SZ,2024-01-02,10,11,9,10,100,qfq`, "ADJUSTMENT_UNSUPPORTED"],
    ["wrong column mapping", `ticker,security_id,date,open,high,low,close,volume,adjustment\n${row}`, "COLUMN_MAPPING_INVALID"],
  ])("rejects %s and blocks publication", (_case, csv, code) => {
    const quality = report(csv);
    expect(quality.status).toBe("REJECTED");
    expect(quality.errors.map((error) => error.code)).toContain(code);
    expect(canPublishV12DailyFixture(quality)).toBe(false);
  });

  it("rejects malformed dates and rows with incomplete columns", () => {
    const quality = report(`${header}\ncn-1,000001.SZ,2024-02-30,10,11,9,10,100,raw\ncn-1,000001.SZ,2024-01-03,10,11,9`);
    expect(quality.status).toBe("REJECTED");
    expect(quality.errors.map((error) => error.code)).toEqual(expect.arrayContaining(["DATE_INVALID", "COLUMN_COUNT_INVALID"]));
    expect(canPublishV12DailyFixture(quality)).toBe(false);
  });
});

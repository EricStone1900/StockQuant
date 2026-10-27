import { describe, expect, it, vi } from "vitest";
import { EastmoneyDailyBarProvider, parseEastmoneyDailyBar } from "../../src/adapters/eastmoney-daily-bar-provider.js";

describe("independent RAW daily candle source", () => {
  const payload = { data: { code: "600000", klines: ["2026-10-21,10.10,10.25,10.50,10.00,12,12240.00"] } };
  it("maps RAW OHLC, lots to shares and amount without constructing bars from quotes", () => {
    expect(parseEastmoneyDailyBar(payload, "600000.SH", "2026-10-21")).toEqual({ securityId: "600000.SH", sessionDate: "2026-10-21", open: "10.10", close: "10.25", high: "10.50", low: "10.00", volume: 1200, amount: "12240.00" });
    expect(() => parseEastmoneyDailyBar(payload, "000001.SZ", "2026-10-21")).toThrow("COVERAGE_MISMATCH");
    expect(() => parseEastmoneyDailyBar(payload, "600000.SH", "2026-10-20")).toThrow("FIELDS_INVALID");
    expect(() => parseEastmoneyDailyBar({ data: { code: "600000", klines: ["2026-10-21,10,10,10,10,1"] } }, "600000.SH", "2026-10-21")).toThrow("FIELDS_INVALID");
  });
  it("requests only the declared security/session, RAW daily frequency, with bounded response and no redirects", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(payload)));
    const result = await new EastmoneyDailyBarProvider(request).loadDailyBars({ sourceId: "eastmoney-daily", securityIds: ["600000.SH"], sessionDate: "2026-10-21", dataVersion: "test" });
    expect(result).toHaveLength(1);
    const url = new URL(String(request.mock.calls[0]![0]));
    expect(url.searchParams.get("klt")).toBe("101"); expect(url.searchParams.get("fqt")).toBe("0");
    expect(url.searchParams.get("secid")).toBe("1.600000"); expect(url.searchParams.get("beg")).toBe("20261021");
    expect(request.mock.calls[0]![1]?.redirect).toBe("error");
  });
});

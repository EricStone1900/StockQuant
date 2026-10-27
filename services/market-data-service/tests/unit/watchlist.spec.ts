import { describe, expect, it } from "vitest";
import { normalizeWatchlist, prioritizeWatchlist } from "../../src/application/watchlist.js";

describe("online watchlist capacity", () => {
  it("counts unique securities and accepts duplicate input within the 100-security limit", () => {
    const securities = Array.from({ length: 100 }, (_, index) => `SEC-${index}`);
    const result = normalizeWatchlist([...securities, securities[0]]);

    expect(result).toEqual({ accepted: true, securities });
  });

  it("rejects a 101st unique security", () => {
    const securities = Array.from({ length: 101 }, (_, index) => `SEC-${index}`);

    expect(normalizeWatchlist(securities)).toEqual({ accepted: false, max: 100 });
  });

  it("orders holdings and in-flight securities before candidates with stable de-duplication", () => {
    expect(prioritizeWatchlist({
      holdings: ["600000.SH", "600000.SH"],
      inFlightOrders: ["000001.SZ", "600000.SH"],
      candidates: ["600519.SH", "000001.SZ", "600519.SH"],
    })).toEqual({
      accepted: true,
      securities: ["600000.SH", "000001.SZ", "600519.SH"],
      requiredCount: 2,
      omittedCandidates: [],
    });
  });

  it("blocks when mandatory holdings and in-flight orders exceed capacity", () => {
    const required = Array.from({ length: 101 }, (_, index) => `SEC-${index}`);
    expect(prioritizeWatchlist({ holdings: required, inFlightOrders: [], candidates: ["OPTIONAL"] })).toEqual({
      accepted: false,
      reason: "REQUIRED_SECURITIES_EXCEED_LIMIT",
      max: 100,
      requiredCount: 101,
    });
  });

  it("uses remaining capacity for candidates and reports omissions", () => {
    const holdings = Array.from({ length: 80 }, (_, index) => `H-${index}`);
    const inFlightOrders = Array.from({ length: 10 }, (_, index) => `O-${index}`);
    const candidates = Array.from({ length: 15 }, (_, index) => `C-${index}`);
    const result = prioritizeWatchlist({ holdings, inFlightOrders, candidates });

    expect(result.accepted).toBe(true);
    if (result.accepted) {
      expect(result.securities).toHaveLength(100);
      expect(result.securities.slice(0, 90)).toEqual([...holdings, ...inFlightOrders]);
      expect(result.omittedCandidates).toEqual(["C-10", "C-11", "C-12", "C-13", "C-14"]);
    }
  });
});

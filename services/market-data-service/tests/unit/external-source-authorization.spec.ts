import { describe, expect, it } from "vitest";
import { externalSourceUseAuthorized, isHistoricalResearchSourceAuthorized, missingSourceAuthorizationConfig, shouldEnableCollectionExecutor, shouldEnableCollectionScheduler } from "../../src/application/external-source-authorization.js";

describe("external Market Data source authorization gate", () => {
  it("fails closed by default for quote, news, collection, and historical research", () => {
    expect(externalSourceUseAuthorized("QUOTE", ["tencent-quote"], {})).toBe(false);
    expect(externalSourceUseAuthorized("NEWS", ["eastmoney-news"], {})).toBe(false);
    expect(externalSourceUseAuthorized("MINUTE_COLLECTION", ["sina"], {})).toBe(false);
    expect(externalSourceUseAuthorized("HISTORICAL_RESEARCH", ["baostock"], {})).toBe(false);
  });

  it("requires an exact true flag, authorization reference, data version, and source allowlist for each use", () => {
    const quote = { STOCKQUANT_MARKET_QUOTE_SOURCE_USE_AUTHORIZED: "true", STOCKQUANT_MARKET_QUOTE_SOURCE_AUTHORIZATION_REF: "evidence/source-authorization.json", STOCKQUANT_MARKET_QUOTE_DATA_VERSION: "quote-v1", STOCKQUANT_MARKET_QUOTE_AUTHORIZED_SOURCE_IDS: "tencent-quote" };
    expect(externalSourceUseAuthorized("QUOTE", ["tencent-quote"], quote)).toBe(true);
    expect(externalSourceUseAuthorized("DAILY_BAR", ["eastmoney-daily"], quote)).toBe(false);
    expect(externalSourceUseAuthorized("NEWS", ["eastmoney-news"], quote)).toBe(false);
    expect(externalSourceUseAuthorized("QUOTE", ["sina-quote"], quote)).toBe(false);
    expect(externalSourceUseAuthorized("QUOTE", ["tencent-quote"], { ...quote, STOCKQUANT_MARKET_QUOTE_SOURCE_USE_AUTHORIZED: "1" })).toBe(false);
    expect(externalSourceUseAuthorized("QUOTE", ["tencent-quote"], { ...quote, STOCKQUANT_MARKET_QUOTE_SOURCE_AUTHORIZATION_REF: " " })).toBe(false);
    expect(externalSourceUseAuthorized("QUOTE", ["tencent-quote"], { ...quote, STOCKQUANT_MARKET_QUOTE_DATA_VERSION: " " })).toBe(false);
    expect(missingSourceAuthorizationConfig("NEWS", ["eastmoney-news"], quote)).toEqual([
      "STOCKQUANT_MARKET_NEWS_SOURCE_USE_AUTHORIZED",
      "STOCKQUANT_MARKET_NEWS_SOURCE_AUTHORIZATION_REF",
      "STOCKQUANT_MARKET_NEWS_DATA_VERSION",
      "STOCKQUANT_MARKET_NEWS_AUTHORIZED_SOURCE_IDS",
    ]);
  });

  it("binds minute collection enablement to the configured source set", () => {
    const collection = { STOCKQUANT_COLLECTION_SOURCE_USE_AUTHORIZED: "true", STOCKQUANT_COLLECTION_SOURCE_AUTHORIZATION_REF: "evidence/minute-source-authorization.json", STOCKQUANT_COLLECTION_DATA_VERSION: "minute-v2", STOCKQUANT_COLLECTION_AUTHORIZED_SOURCE_IDS: "sina,baostock" };
    expect(externalSourceUseAuthorized("MINUTE_COLLECTION", ["sina", "baostock"], collection)).toBe(true);
    expect(externalSourceUseAuthorized("MINUTE_COLLECTION", ["sina", "tdx"], collection)).toBe(false);
    expect(shouldEnableCollectionExecutor(true, ["sina", "baostock"], collection)).toBe(true);
    expect(shouldEnableCollectionExecutor(true, ["sina", "tdx"], collection)).toBe(false);
    expect(shouldEnableCollectionExecutor(false, ["sina", "baostock"], collection)).toBe(false);
    expect(shouldEnableCollectionExecutor(true, ["sina", "baostock"], {})).toBe(false);
    expect(shouldEnableCollectionScheduler(true, ["sina", "baostock"], collection)).toBe(true);
    expect(shouldEnableCollectionScheduler(true, ["sina", "baostock"], {})).toBe(false);
    expect(shouldEnableCollectionScheduler(false, ["sina", "baostock"], collection)).toBe(false);
  });

  it("keeps historical research approval separate and source-scoped", () => {
    const research = { STOCKQUANT_MARKET_RESEARCH_SOURCE_USE_AUTHORIZED: "true", STOCKQUANT_MARKET_RESEARCH_SOURCE_AUTHORIZATION_REF: "evidence/historical-source-authorization.json", STOCKQUANT_MARKET_RESEARCH_DATA_VERSION: "baostock-history-v1", STOCKQUANT_MARKET_RESEARCH_AUTHORIZED_SOURCE_IDS: "baostock" };
    expect(externalSourceUseAuthorized("HISTORICAL_RESEARCH", ["baostock"], research)).toBe(true);
    expect(externalSourceUseAuthorized("MINUTE_COLLECTION", ["baostock"], research)).toBe(false);
    expect(externalSourceUseAuthorized("HISTORICAL_RESEARCH", ["sina"], research)).toBe(false);
    expect(isHistoricalResearchSourceAuthorized("baostock", research)).toBe(true);
    expect(isHistoricalResearchSourceAuthorized("sina", research)).toBe(false);
    expect(isHistoricalResearchSourceAuthorized("BaoStock", research)).toBe(false);
    expect(isHistoricalResearchSourceAuthorized(undefined, research)).toBe(false);
  });
});

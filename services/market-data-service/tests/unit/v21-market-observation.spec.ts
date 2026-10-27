import { describe, expect, it } from "vitest";
import { buildNewsPreview, classifyQuoteAge, deduplicateNews } from "../../src/application/v21-market-observation.js";
import { decideCnAShareSamplingTick } from "../../src/application/cn-a-share-calendar.js";

describe("V2.1 market observation semantics", () => {
  it("gates sampling by the supplied instant, trading sessions, lunch break, holidays, and calendar coverage", () => {
    expect(decideCnAShareSamplingTick("2026-10-08T01:30:00.000Z", 30)).toMatchObject({ status: "ELIGIBLE", localTime: "09:30", window: "morning" });
    expect(decideCnAShareSamplingTick("2026-10-08T02:00:00.000Z", 20)).toMatchObject({ status: "NOT_SAMPLING_TICK", localTime: "10:00" });
    expect(decideCnAShareSamplingTick("2026-10-08T03:45:00.000Z", 20)).toMatchObject({ status: "CLOSED", localTime: "11:45", window: null });
    expect(decideCnAShareSamplingTick("2026-10-08T05:00:00.000Z", 30)).toMatchObject({ status: "ELIGIBLE", localTime: "13:00", window: "afternoon" });
    expect(decideCnAShareSamplingTick("2026-10-01T01:30:00.000Z", 30).status).toBe("CLOSED");
    expect(decideCnAShareSamplingTick("2027-01-04T01:30:00.000Z", 30).status).toBe("UNKNOWN_CALENDAR");
  });

  it("marks missing, old, and future quote timestamps stale instead of live", () => {
    const now = "2026-10-17T02:00:00.000Z";
    expect(classifyQuoteAge({ observedAt: null, ingestedAt: now }, now, 30)).toEqual({ freshness: "UNKNOWN", ageSeconds: null });
    expect(classifyQuoteAge({ observedAt: "2026-10-17T01:20:00.000Z", ingestedAt: now }, now, 30)).toEqual({ freshness: "STALE", ageSeconds: 2400 });
    expect(classifyQuoteAge({ observedAt: "2026-10-17T01:40:00.000Z", ingestedAt: now }, now, 30)).toEqual({ freshness: "FRESH", ageSeconds: 1200 });
    expect(classifyQuoteAge({ observedAt: "2026-10-17T02:01:00.000Z", ingestedAt: now }, now, 30)).toEqual({ freshness: "STALE", ageSeconds: -60 });
  });

  it("deduplicates normalized cross-source copies and exposes unknown time and ambiguous entity links", () => {
    const base = { newsId: "n1", title: "市场！ 更新", publishedAt: null, observedAt: "2026-10-17T02:00:00.000Z", ingestedAt: "2026-10-17T02:00:00.000Z", availableAt: "2026-10-17T02:00:00.000Z", revision: 1 };
    const merged = deduplicateNews([
      { ...base, sourceId: "source-a", sourceItemId: "article-a", sourceUrl: "https://a.test/article-a", symbols: ["600000.SH"] },
      { ...base, newsId: "n2", title: "市场 更新", sourceId: "source-b", sourceItemId: "article-b", sourceUrl: "https://b.test/article-b", symbols: ["000001.SZ"] },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ sourceIds: ["source-a", "source-b"], sourceArticles: [{ sourceId: "source-a", sourceItemId: "article-a" }, { sourceId: "source-b", sourceItemId: "article-b" }], publicationTimeStatus: "UNKNOWN", entityMatchStatus: "AMBIGUOUS", revisionStatus: "VERIFIED_STABLE_SOURCE_ID", symbols: ["600000.SH", "000001.SZ"] });
  });

  it("preserves one source result when another source fails", () => {
    const result = buildNewsPreview(["source-a", "source-b"], [null, {
      newsId: "n2", sourceId: "source-b", title: "公告", publishedAt: null,
      observedAt: "2026-10-17T02:00:00.000Z", ingestedAt: "2026-10-17T02:00:00.000Z", availableAt: "2026-10-17T02:00:00.000Z", revision: 1, symbols: [],
    }]);
    expect(result.status).toBe("PARTIAL");
    expect(result.sourceFailures).toEqual(["source-a"]);
    expect(result.items).toHaveLength(1);
  });
});

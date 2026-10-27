export type QuoteTimestampEvidence = { observedAt: string | null; ingestedAt: string };

export function classifyQuoteAge(item: QuoteTimestampEvidence, now: string, maxAgeMinutes: number): { freshness: "FRESH" | "STALE" | "UNKNOWN"; ageSeconds: number | null } {
  if (!Number.isFinite(maxAgeMinutes) || maxAgeMinutes <= 0 || !item.observedAt) return { freshness: "UNKNOWN", ageSeconds: null };
  const observed = Date.parse(item.observedAt);
  const current = Date.parse(now);
  if (!Number.isFinite(observed) || !Number.isFinite(current)) return { freshness: "UNKNOWN", ageSeconds: null };
  const ageSeconds = Math.floor((current - observed) / 1000);
  if (ageSeconds < 0) return { freshness: "STALE", ageSeconds };
  return { freshness: ageSeconds <= maxAgeMinutes * 60 ? "FRESH" : "STALE", ageSeconds };
}

export type NewsEvidenceItem = { newsId: string; sourceId: string; sourceItemId?: string | null; sourceUrl?: string | null; title: string; publishedAt: string | null; observedAt: string; ingestedAt: string; availableAt: string; revision: number; symbols: string[] };
export type NewsSourceArticleRef = { sourceId: string; sourceItemId: string | null; sourceUrl: string | null; title: string; publishedAt: string | null; revision: number };

export function buildNewsPreview(sourceIds: string[], results: Array<NewsEvidenceItem | null>) {
  const sources = sourceIds.map((sourceId, index) => ({ sourceId, status: results[index] ? "RECEIVED" as const : "UNAVAILABLE" as const }));
  const received = results.filter((item): item is NewsEvidenceItem => item !== null);
  const items = deduplicateNews(received);
  return {
    items,
    sourceCount: sourceIds.length,
    sources,
    sourceFailures: sources.filter((source) => source.status === "UNAVAILABLE").map((source) => source.sourceId),
    deduplicated: items.length < received.length,
    status: sources.every((source) => source.status === "RECEIVED") ? "PASS" as const : "PARTIAL" as const,
  };
}

function normalizedTitle(title: string): string {
  return title.normalize("NFKC").toLocaleLowerCase().replace(/[\p{P}\p{S}\s]+/gu, "");
}

/** Collapse same-title cross-source copies while retaining all source IDs. */
export function deduplicateNews(items: NewsEvidenceItem[]): Array<NewsEvidenceItem & { sourceIds: string[]; sourceArticles: NewsSourceArticleRef[]; publicationTimeStatus: "KNOWN" | "UNKNOWN"; entityMatchStatus: "LINKED" | "UNMATCHED" | "AMBIGUOUS"; revisionStatus: "VERIFIED_STABLE_SOURCE_ID" | "UNVERIFIED_NO_STABLE_SOURCE_ID" }> {
  const grouped = new Map<string, NewsEvidenceItem & { sourceIds: string[]; sourceArticles: NewsSourceArticleRef[]; publicationTimeStatus: "KNOWN" | "UNKNOWN"; entityMatchStatus: "LINKED" | "UNMATCHED" | "AMBIGUOUS"; revisionStatus: "VERIFIED_STABLE_SOURCE_ID" | "UNVERIFIED_NO_STABLE_SOURCE_ID" }>();
  for (const item of items) {
    const key = normalizedTitle(item.title);
    if (!key) continue;
    const existing = grouped.get(key);
    if (existing) {
      if (!existing.sourceIds.includes(item.sourceId)) existing.sourceIds.push(item.sourceId);
      const sourceArticle = { sourceId: item.sourceId, sourceItemId: item.sourceItemId ?? null, sourceUrl: item.sourceUrl ?? null, title: item.title, publishedAt: item.publishedAt, revision: item.revision };
      if (!existing.sourceArticles.some((article) => article.sourceId === sourceArticle.sourceId && article.sourceItemId === sourceArticle.sourceItemId && article.revision === sourceArticle.revision)) existing.sourceArticles.push(sourceArticle);
      if (!item.sourceItemId) existing.revisionStatus = "UNVERIFIED_NO_STABLE_SOURCE_ID";
      if (!existing.publishedAt && item.publishedAt) { existing.publishedAt = item.publishedAt; existing.publicationTimeStatus = "KNOWN"; }
      for (const symbol of item.symbols) if (!existing.symbols.includes(symbol)) existing.symbols.push(symbol);
      existing.entityMatchStatus = existing.symbols.length > 1 ? "AMBIGUOUS" : existing.symbols.length === 1 ? "LINKED" : "UNMATCHED";
      continue;
    }
    grouped.set(key, { ...item, sourceIds: [item.sourceId], sourceArticles: [{ sourceId: item.sourceId, sourceItemId: item.sourceItemId ?? null, sourceUrl: item.sourceUrl ?? null, title: item.title, publishedAt: item.publishedAt, revision: item.revision }], publicationTimeStatus: item.publishedAt ? "KNOWN" : "UNKNOWN", entityMatchStatus: item.symbols.length > 1 ? "AMBIGUOUS" : item.symbols.length === 1 ? "LINKED" : "UNMATCHED", revisionStatus: item.sourceItemId ? "VERIFIED_STABLE_SOURCE_ID" : "UNVERIFIED_NO_STABLE_SOURCE_ID" });
  }
  return [...grouped.values()];
}

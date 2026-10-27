import { classifyQuoteAge } from "./v21-market-observation.js";

export type SnapshotSamplingProviderRequest = {
  sourceId: "tencent-quote" | "sina-quote";
  securityIds: string[];
  scheduledAt: string;
  executionAt: string;
  maxAgeMinutes: number;
};

export type SnapshotSamplingProviderQuote = {
  securityId: string;
  observedAt: string | null;
  price: string | null;
};

export type SnapshotSamplingProviderResult = {
  sourceId: string;
  quotes: SnapshotSamplingProviderQuote[];
};

/** Provider boundary shared by deterministic Fixture execution and authorized REAL adapters. */
export interface SnapshotSamplingProvider {
  sample(request: SnapshotSamplingProviderRequest): Promise<SnapshotSamplingProviderResult>;
}

/** Provider execution needs both the exact source authorization and a separate explicit runtime opt-in. */
export function isSnapshotSamplingProviderEnabled(sourceAuthorized: boolean, env: NodeJS.ProcessEnv = process.env): boolean {
  return sourceAuthorized && env.STOCKQUANT_SNAPSHOT_REAL_PROVIDER_ENABLED === "true";
}

export type NormalizedSnapshotSamplingObservation = {
  snapshotId: string;
  securityId: string;
  sourceId: string;
  dataMode: "REAL";
  observedAt: string | null;
  ingestedAt: string;
  availableAt: string;
  ageSeconds: number | null;
  freshness: "FRESH" | "STALE" | "UNKNOWN";
  price: string;
  status: "READY" | "STALE" | "UNKNOWN";
};

/** Reject partial, duplicate, foreign-source or malformed batches before any result is committed. */
export function normalizeSnapshotSamplingProviderResult(
  request: SnapshotSamplingProviderRequest,
  result: SnapshotSamplingProviderResult,
): NormalizedSnapshotSamplingObservation[] {
  if (result.sourceId !== request.sourceId) throw new Error("SNAPSHOT_PROVIDER_SOURCE_MISMATCH");
  if (request.securityIds.length === 0) throw new Error("SNAPSHOT_PROVIDER_EMPTY_SCOPE");
  const expected = new Set(request.securityIds);
  if (result.quotes.length !== expected.size) throw new Error("SNAPSHOT_PROVIDER_INCOMPLETE_BATCH");
  const seen = new Set<string>();
  return result.quotes.map((quote) => {
    if (!expected.has(quote.securityId) || seen.has(quote.securityId)) throw new Error("SNAPSHOT_PROVIDER_SCOPE_MISMATCH");
    seen.add(quote.securityId);
    if (quote.price === null || !/^\d+(?:\.\d{1,8})?$/u.test(quote.price) || !Number.isFinite(Number(quote.price)) || Number(quote.price) <= 0) throw new Error("SNAPSHOT_PROVIDER_INVALID_PRICE");
    if (quote.observedAt !== null && !Number.isFinite(Date.parse(quote.observedAt))) throw new Error("SNAPSHOT_PROVIDER_INVALID_TIMESTAMP");
    const observedAt = quote.observedAt === null ? null : new Date(quote.observedAt).toISOString();
    const age = classifyQuoteAge({ observedAt, ingestedAt: request.executionAt }, request.executionAt, request.maxAgeMinutes);
    const freshness = observedAt === null ? "UNKNOWN" : age.freshness;
    return {
      snapshotId: `${request.sourceId}:${quote.securityId}:${request.scheduledAt}`,
      securityId: quote.securityId,
      sourceId: request.sourceId,
      dataMode: "REAL",
      observedAt,
      ingestedAt: request.executionAt,
      availableAt: request.executionAt,
      ageSeconds: age.ageSeconds,
      freshness,
      price: quote.price,
      status: freshness === "FRESH" ? "READY" : freshness,
    };
  });
}

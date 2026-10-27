import type { SnapshotSamplingProvider, SnapshotSamplingProviderRequest, SnapshotSamplingProviderResult } from "../application/snapshot-sampling-provider.js";
import { PublicSourceHttpAdapter } from "./public-source-http-adapter.js";

/** Sina candidate quote adapter. It is reachable only through the existing REAL authorization/runtime gates. */
export class SinaSnapshotSamplingProvider implements SnapshotSamplingProvider {
  constructor(private readonly source: Pick<PublicSourceHttpAdapter, "sinaQuotePreview">) {}

  async sample(request: SnapshotSamplingProviderRequest): Promise<SnapshotSamplingProviderResult> {
    if (request.sourceId !== "sina-quote") throw new Error("SNAPSHOT_PROVIDER_SOURCE_MISMATCH");
    const response = await this.source.sinaQuotePreview(request.securityIds, request.executionAt);
    if (response.error || response.securities.length !== request.securityIds.length || response.securities.some((quote) => quote.status !== "LIVE_SOURCE")) {
      throw new Error("SNAPSHOT_PROVIDER_SOURCE_UNAVAILABLE");
    }
    return {
      sourceId: response.sourceId,
      quotes: response.securities.map((quote) => ({
        securityId: quote.symbol,
        observedAt: quote.observedAt,
        price: quote.price === null ? null : quote.price.toFixed(4),
      })),
    };
  }
}

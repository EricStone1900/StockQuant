import type { SnapshotSamplingProvider, SnapshotSamplingProviderRequest, SnapshotSamplingProviderResult } from "../application/snapshot-sampling-provider.js";
import { PublicSourceHttpAdapter } from "./public-source-http-adapter.js";

/** Tencent quote adapter for the shared snapshot-sampling Provider port. */
export class TencentSnapshotSamplingProvider implements SnapshotSamplingProvider {
  constructor(private readonly source: Pick<PublicSourceHttpAdapter, "tencentQuotePreview">) {}

  async sample(request: SnapshotSamplingProviderRequest): Promise<SnapshotSamplingProviderResult> {
    if (request.sourceId !== "tencent-quote") throw new Error("SNAPSHOT_PROVIDER_SOURCE_MISMATCH");
    const response = await this.source.tencentQuotePreview(request.securityIds, request.executionAt);
    if (response.error || response.securities.length !== request.securityIds.length) throw new Error("SNAPSHOT_PROVIDER_SOURCE_UNAVAILABLE");
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

import type { MinuteBar } from "../contracts/generated-types.js";
export class MinuteImportStorageQuotaExceeded extends Error { constructor(message: string) { super(message); this.name = "MinuteImportStorageQuotaExceeded"; } }
export type MinuteBarTradingStatus = MinuteBar["tradingStatus"];
export type MinuteBarLimitPriceReference = MinuteBar["limitPriceReference"];
export type MinuteImportBar = MinuteBar;
export function withMinuteBarContextDefaults(bar: Omit<MinuteImportBar, "tradingStatus" | "tradingStatusReference" | "limitPriceReference"> & Partial<Pick<MinuteImportBar, "tradingStatus" | "tradingStatusReference" | "limitPriceReference">>): MinuteImportBar {
  const statusReference = typeof bar.tradingStatusReference === "string" && bar.tradingStatusReference.trim() ? bar.tradingStatusReference.trim() : null;
  const tradingStatus = bar.tradingStatus && bar.tradingStatus !== "UNKNOWN" && statusReference ? bar.tradingStatus : "UNKNOWN";
  const suppliedLimit = bar.limitPriceReference;
  const limitPriceReference: MinuteBarLimitPriceReference = suppliedLimit?.status === "AVAILABLE"
    && Number.isFinite(suppliedLimit.upperLimit) && suppliedLimit.upperLimit! >= 0
    && Number.isFinite(suppliedLimit.lowerLimit) && suppliedLimit.lowerLimit! >= 0
    && suppliedLimit.upperLimit! >= suppliedLimit.lowerLimit!
    && suppliedLimit.marketRuleSetVersion?.trim() && suppliedLimit.sourceReference?.trim()
    ? { ...suppliedLimit, marketRuleSetVersion: suppliedLimit.marketRuleSetVersion.trim(), sourceReference: suppliedLimit.sourceReference.trim() }
    : suppliedLimit?.status === "NOT_APPLICABLE" && suppliedLimit.sourceReference?.trim()
      ? { status: "NOT_APPLICABLE", upperLimit: null, lowerLimit: null, marketRuleSetVersion: suppliedLimit.marketRuleSetVersion?.trim() || null, sourceReference: suppliedLimit.sourceReference.trim() }
      : { status: "UNKNOWN", upperLimit: null, lowerLimit: null, marketRuleSetVersion: null, sourceReference: null };
  return {
    ...bar,
    tradingStatus,
    tradingStatusReference: tradingStatus === "UNKNOWN" ? null : statusReference,
    limitPriceReference,
  };
}
export type MinuteImportManifest = {
  mapping: Record<string, string | null>; semantics: Record<string, string>;
  provenance: { sourceName: string; sourceReference: string | null; licenseStatement: string; licenseVerification: "OPERATOR_CONFIRMED" | "UNCONFIRMED"; acquiredAt: string } | null;
  researchUseAllowed: boolean;
  historicalContext: { securityUniverseVersion: string | null; marketRuleSetVersion: string | null; corporateActionVersion: string | null };
  historicalContextStatus: "READY_FOR_REVIEW" | "LIMITED_MISSING_REFERENCES";
};
export type MinuteImportRecord = { importId: string; version: string; status: "PUBLISHED" | "REJECTED"; accepted: number; errors: unknown[]; sha256: string; manifest: MinuteImportManifest };
export type PersistedMinuteImport = { record: MinuteImportRecord; idempotent: boolean };
export type MinuteBarPage = { version: string; items: MinuteImportBar[]; nextCursor: string | null };
export type StreamingMinuteImportParse = { sourceSha256: string; accepted: number; errors: unknown[] };
export type PublishMinuteImportInput = { sourceSha256: string; importKeySha256?: string; manifest?: Omit<MinuteImportManifest, "historicalContext" | "historicalContextStatus"> & Partial<Pick<MinuteImportManifest, "historicalContext" | "historicalContextStatus">>; status: MinuteImportRecord["status"]; accepted: number; errors: unknown[]; bars: MinuteImportBar[] };
export type PublishMinuteImportStreamInput = { expectedSha256: string; manifest: Omit<MinuteImportManifest, "historicalContext" | "historicalContextStatus"> & Partial<Pick<MinuteImportManifest, "historicalContext" | "historicalContextStatus">>; importKeyForSha: (sourceSha256: string) => string; parse: (writeBarsBatch: (bars: MinuteImportBar[]) => Promise<void>) => Promise<StreamingMinuteImportParse> };

export type MinuteImportBar = { securityId: string; market: string; frequency: string; barStart: string; barEnd: string; availableAt: string; open: number; high: number; low: number; close: number; volume: number; amount: number; adjustment: string };
export type MinuteImportManifest = {
  mapping: Record<string, string | null>; semantics: Record<string, string>;
  provenance: { sourceName: string; sourceReference: string | null; licenseStatement: string; licenseVerification: "OPERATOR_CONFIRMED" | "UNCONFIRMED"; acquiredAt: string } | null;
  researchUseAllowed: boolean;
};
export type MinuteImportRecord = { importId: string; version: string; status: "PUBLISHED" | "REJECTED"; accepted: number; errors: unknown[]; sha256: string; manifest: MinuteImportManifest };
export type PersistedMinuteImport = { record: MinuteImportRecord; idempotent: boolean };
export type MinuteBarPage = { version: string; items: MinuteImportBar[]; nextCursor: string | null };
export type StreamingMinuteImportParse = { sourceSha256: string; accepted: number; errors: unknown[] };
export type PublishMinuteImportInput = { sourceSha256: string; importKeySha256?: string; manifest?: MinuteImportManifest; status: MinuteImportRecord["status"]; accepted: number; errors: unknown[]; bars: MinuteImportBar[] };
export type PublishMinuteImportStreamInput = { expectedSha256: string; manifest: MinuteImportManifest; importKeyForSha: (sourceSha256: string) => string; parse: (writeBarsBatch: (bars: MinuteImportBar[]) => Promise<void>) => Promise<StreamingMinuteImportParse> };

import type { MinuteBarPage, MinuteImportRecord, PersistedMinuteImport, PublishMinuteImportInput, PublishMinuteImportStreamInput } from "../domain/minute-import.js";
export type { MinuteBarPage, MinuteImportBar, MinuteImportManifest, MinuteImportRecord, PersistedMinuteImport, PublishMinuteImportInput, PublishMinuteImportStreamInput, StreamingMinuteImportParse } from "../domain/minute-import.js";
export interface MinuteImportPort {
  migrate(): Promise<void>;
  publish(input: PublishMinuteImportInput): Promise<PersistedMinuteImport>;
  publishStream(input: PublishMinuteImportStreamInput): Promise<PersistedMinuteImport>;
  find(version: string): Promise<MinuteImportRecord | null>;
  page(version: string, cursor: number, pageSize: number, securityId?: string, fromBarStart?: string, toBarStart?: string): Promise<MinuteBarPage>;
  backfillLegacyPartitions(batchSize?: number): Promise<number>;
}

import type { CollectionSchedule, SchedulerLease } from "../domain/collection-schedule.js";
export interface CollectionSchedulePort {
  migrate(): Promise<void>;
  upsert(input: Omit<CollectionSchedule, "enabled" | "watermarkEnd" | "version">): Promise<CollectionSchedule>;
  find(subscriptionId: string): Promise<CollectionSchedule | null>;
  enabled(): Promise<CollectionSchedule[]>;
  setEnabled(subscriptionId: string, enabled: boolean): Promise<CollectionSchedule>;
  switchEnabled(sourceId: string, targetId: string): Promise<{ source: CollectionSchedule; target: CollectionSchedule }>;
  advanceWatermark(subscriptionId: string, expectedVersion: number, watermarkEnd: string): Promise<CollectionSchedule>;
  acquireLease(ownerId: string, leaseSeconds: number): Promise<SchedulerLease | null>;
}

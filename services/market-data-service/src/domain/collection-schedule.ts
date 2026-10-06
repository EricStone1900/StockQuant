export type CollectionSchedule = {
  subscriptionId: string; subscriptionVersion: number; fromDate: string; toDate: string; calendarVersion: string;
  enabled: boolean; watermarkEnd: string | null; version: number;
};
export type SchedulerLease = { ownerId: string; fencingToken: number; leaseUntil: string };
export class CollectionScheduleConflict extends Error {
  constructor(message: string) { super(message); this.name = "CollectionScheduleConflict"; }
}

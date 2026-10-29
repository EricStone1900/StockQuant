import type { AccountSnapshot, CorrectFillFeeCommand, InitializeAccountCommand, RecordFillCommand, ReserveResourceCommand, ResourceReservation } from "../domain/account.js";

export interface AccountRepository {
  initialize(command: InitializeAccountCommand): Promise<{ snapshot: AccountSnapshot; replayed: boolean }>;
  snapshot(accountId: string, ownerId: string): Promise<AccountSnapshot | null>;
  sellable(input: { accountId: string; ownerId: string; namespace: string; testRunId: string; security: string; asOf: string }): Promise<number | null>;
  accountExists(accountId: string): Promise<boolean>;
  settleDue(accountId: string, asOf: string): Promise<{ settledFillIds: string[] }>;
  recordFill(command: RecordFillCommand): Promise<{ snapshot: AccountSnapshot; replayed: boolean }>;
  correctFillFee(command: CorrectFillFeeCommand): Promise<{ snapshot: AccountSnapshot; replayed: boolean }>;
  reserveResource(command: ReserveResourceCommand): Promise<{ reservation: ResourceReservation; replayed: boolean }>;
  resolveReservation(input: {
    accountId: string;
    reservationId: string;
    namespace: string;
    testRunId: string;
    ownerId: string;
    outcome: "FILLED" | "CANCELLED" | "REJECTED" | "EXPIRED" | "UNKNOWN";
    evidenceRef: string;
  }): Promise<ResourceReservation | null>;
}

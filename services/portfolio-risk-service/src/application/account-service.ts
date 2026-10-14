import type { AccountSnapshot, CorrectFillFeeCommand, InitializeAccountCommand, RecordFillCommand, ReserveResourceCommand } from "../domain/account.js";
import type { AccountRepository } from "../ports/account-repository.js";

export class AccountService {
  private fillFailuresRemaining = 0;
  constructor(private readonly repository: AccountRepository) {}

  injectFillFailures(count: number) { this.fillFailuresRemaining = Math.max(0, Math.min(10, Math.trunc(count))); return this.fillFailuresRemaining; }

  initialize(command: InitializeAccountCommand) {
    return this.repository.initialize(command);
  }

  snapshot(accountId: string, ownerId: string): Promise<AccountSnapshot | null> {
    return this.repository.snapshot(accountId, ownerId);
  }

  accountExists(accountId: string): Promise<boolean> {
    return this.repository.accountExists(accountId);
  }

  settleDue(accountId: string, asOf: string) { return this.repository.settleDue(accountId, asOf); }

  recordFill(command: RecordFillCommand) {
    if (this.fillFailuresRemaining > 0) { this.fillFailuresRemaining -= 1; throw new Error("INJECTED_LEDGER_UNAVAILABLE"); }
    return this.repository.recordFill(command);
  }

  correctFillFee(command: CorrectFillFeeCommand) {
    return this.repository.correctFillFee(command);
  }

  reserveResource(command: ReserveResourceCommand & { accountId: string }) {
    return this.repository.reserveResource(command);
  }

  resolveReservation(input: { accountId: string; reservationId: string; namespace: string; testRunId: string; ownerId: string; outcome: "FILLED" | "CANCELLED" | "REJECTED" | "EXPIRED" | "UNKNOWN"; evidenceRef: string }) {
    return this.repository.resolveReservation(input);
  }

}

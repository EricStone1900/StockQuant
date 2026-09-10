import type { AccountSnapshot, InitializeAccountCommand, RecordFillCommand } from "../domain/account.js";
import { PostgresAccountRepository } from "../adapters/postgres-account-repository.js";

export class AccountService {
  private fillFailuresRemaining = 0;
  constructor(private readonly repository: PostgresAccountRepository) {}

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

  recordFill(command: RecordFillCommand) {
    if (this.fillFailuresRemaining > 0) { this.fillFailuresRemaining -= 1; throw new Error("INJECTED_LEDGER_UNAVAILABLE"); }
    return this.repository.recordFill(command);
  }
}

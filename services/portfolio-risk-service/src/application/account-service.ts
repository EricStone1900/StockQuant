import type { AccountSnapshot, InitializeAccountCommand } from "../domain/account.js";
import { PostgresAccountRepository } from "../adapters/postgres-account-repository.js";

export class AccountService {
  constructor(private readonly repository: PostgresAccountRepository) {}

  initialize(command: InitializeAccountCommand) {
    return this.repository.initialize(command);
  }

  snapshot(accountId: string, ownerId: string): Promise<AccountSnapshot | null> {
    return this.repository.snapshot(accountId, ownerId);
  }

  accountExists(accountId: string): Promise<boolean> {
    return this.repository.accountExists(accountId);
  }
}

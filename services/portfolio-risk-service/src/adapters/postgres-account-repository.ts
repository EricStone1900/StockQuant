import { createHash, randomUUID } from "node:crypto";
import { Pool } from "pg";
import type { AccountSnapshot, InitializeAccountCommand } from "../domain/account.js";

interface StoredAccount {
  account_id: string;
  namespace: string;
  test_run_id: string;
  owner_id: string;
  fixture_account_ref: string;
  market: "CN_A" | "US_EQUITY";
  environment_mode: "PAPER";
  broker_mode: "FAKE";
  cash_amount: string;
  currency: string;
  input_hash: string;
}

export class PostgresAccountRepository {
  constructor(private readonly pool: Pool) {}

  async migrate(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        account_id UUID PRIMARY KEY,
        namespace TEXT NOT NULL,
        test_run_id UUID NOT NULL,
        owner_id TEXT NOT NULL,
        fixture_account_ref TEXT NOT NULL,
        market TEXT NOT NULL CHECK (market IN ('CN_A', 'US_EQUITY')),
        environment_mode TEXT NOT NULL CHECK (environment_mode = 'PAPER'),
        broker_mode TEXT NOT NULL CHECK (broker_mode = 'FAKE'),
        cash_amount NUMERIC(20, 4) NOT NULL,
        currency CHAR(3) NOT NULL,
        initialization_key TEXT NOT NULL,
        input_hash CHAR(64) NOT NULL,
        ledger_version INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(namespace, initialization_key)
      );
      CREATE TABLE IF NOT EXISTS ledger_entries (
        entry_id UUID PRIMARY KEY,
        account_id UUID NOT NULL REFERENCES accounts(account_id),
        namespace TEXT NOT NULL,
        entry_type TEXT NOT NULL CHECK (entry_type = 'INITIAL_CASH'),
        amount NUMERIC(20, 4) NOT NULL,
        currency CHAR(3) NOT NULL,
        effective_at TIMESTAMPTZ NOT NULL,
        source_ref TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(account_id, entry_type)
      );
      CREATE INDEX IF NOT EXISTS accounts_test_run_idx ON accounts(test_run_id);
      CREATE INDEX IF NOT EXISTS ledger_entries_account_idx ON ledger_entries(account_id);
    `);
  }

  async initialize(command: InitializeAccountCommand): Promise<{ snapshot: AccountSnapshot; replayed: boolean }> {
    const inputHash = createHash("sha256")
      .update(JSON.stringify({
        fixtureAccountRef: command.fixtureAccountRef,
        ownerId: command.ownerId,
        market: command.market,
        environmentMode: command.environmentMode,
        brokerMode: command.brokerMode,
        initialCash: command.initialCash,
        namespace: command.namespace,
        testRunId: command.testRunId
      }))
      .digest("hex");
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const accountId = randomUUID();
      const insert = await client.query<StoredAccount>(
        `INSERT INTO accounts (
          account_id, namespace, test_run_id, owner_id, fixture_account_ref, market,
          environment_mode, broker_mode, cash_amount, currency, initialization_key, input_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (namespace, initialization_key) DO NOTHING
        RETURNING *`,
        [
          accountId,
          command.namespace,
          command.testRunId,
          command.ownerId,
          command.fixtureAccountRef,
          command.market,
          command.environmentMode,
          command.brokerMode,
          command.initialCash.amount,
          command.initialCash.currency,
          command.idempotencyKey,
          inputHash
        ]
      );
      let account: StoredAccount;
      let replayed = false;
      if (insert.rowCount === 1) {
        account = insert.rows[0];
        await client.query(
          `INSERT INTO ledger_entries (
            entry_id, account_id, namespace, entry_type, amount, currency, effective_at, source_ref
          ) VALUES ($1, $2, $3, 'INITIAL_CASH', $4, $5, now(), $6)`,
          [randomUUID(), account.account_id, command.namespace, command.initialCash.amount, command.initialCash.currency, command.fixtureAccountRef]
        );
      } else {
        const existing = await client.query<StoredAccount>(
          "SELECT * FROM accounts WHERE namespace = $1 AND initialization_key = $2 FOR UPDATE",
          [command.namespace, command.idempotencyKey]
        );
        account = existing.rows[0];
        if (!account || account.input_hash !== inputHash) {
          const conflict = new Error("IDEMPOTENCY_CONFLICT");
          conflict.name = "IdempotencyConflict";
          throw conflict;
        }
        replayed = true;
      }
      await client.query("COMMIT");
      // The initialization transaction already knows the only allowed V1.1 ledger
      // entry. Avoid taking a second pool connection while returning this command.
      return { snapshot: await this.toSnapshot(account, 1), replayed };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async snapshot(accountId: string, ownerId: string): Promise<AccountSnapshot | null> {
    const result = await this.pool.query<StoredAccount>(
      "SELECT * FROM accounts WHERE account_id = $1 AND owner_id = $2",
      [accountId, ownerId]
    );
    return result.rowCount === 1 ? this.toSnapshot(result.rows[0]) : null;
  }

  async accountExists(accountId: string): Promise<boolean> {
    const result = await this.pool.query("SELECT 1 FROM accounts WHERE account_id = $1", [accountId]);
    return result.rowCount === 1;
  }

  private async toSnapshot(account: StoredAccount, knownLedgerEntryCount?: number): Promise<AccountSnapshot> {
    const ledgerEntryCount = knownLedgerEntryCount ?? Number((await this.pool.query<{ count: string }>(
      "SELECT count(*) FROM ledger_entries WHERE account_id = $1",
      [account.account_id]
    )).rows[0].count);
    return {
      accountId: account.account_id,
      namespace: account.namespace,
      testRunId: account.test_run_id,
      ownerId: account.owner_id,
      fixtureAccountRef: account.fixture_account_ref,
      market: account.market,
      environmentMode: account.environment_mode,
      brokerMode: account.broker_mode,
      cash: { amount: account.cash_amount, currency: account.currency },
      positionCount: 0,
      ledgerEntryCount,
      ledgerVersion: 1
    };
  }
}

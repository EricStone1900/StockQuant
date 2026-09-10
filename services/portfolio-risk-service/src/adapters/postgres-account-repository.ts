import { createHash, randomUUID } from "node:crypto";
import { Pool } from "pg";
import type { AccountSnapshot, InitializeAccountCommand, RecordFillCommand } from "../domain/account.js";

interface StoredAccount {
  account_id: string;
  namespace: string;
  test_run_id: string;
  owner_id: string;
  fixture_account_ref: string;
  market: "CN_A" | "US_EQUITY";
  environment_mode: "PAPER" | "BACKTEST";
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
        environment_mode TEXT NOT NULL CHECK (environment_mode IN ('PAPER', 'BACKTEST')),
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
        entry_type TEXT NOT NULL CHECK (entry_type IN ('INITIAL_CASH', 'TRADE_FILL')),
        amount NUMERIC(20, 4) NOT NULL,
        currency CHAR(3) NOT NULL,
        effective_at TIMESTAMPTZ NOT NULL,
        source_ref TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(account_id, source_ref)
      );
      CREATE INDEX IF NOT EXISTS accounts_test_run_idx ON accounts(test_run_id);
      CREATE INDEX IF NOT EXISTS ledger_entries_account_idx ON ledger_entries(account_id);
    `);
    // Existing V1.1 databases used narrower checks.  Widening them is additive and
    // preserves all historical rows while allowing isolated BACKTEST accounts.
    await this.pool.query(`
      ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_environment_mode_check;
      ALTER TABLE accounts ADD CONSTRAINT accounts_environment_mode_check CHECK (environment_mode IN ('PAPER', 'BACKTEST'));
      ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS ledger_entries_account_id_entry_type_key;
      CREATE UNIQUE INDEX IF NOT EXISTS ledger_entries_account_id_source_ref_key ON ledger_entries(account_id, source_ref);
      ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS ledger_entries_entry_type_check;
      ALTER TABLE ledger_entries ADD CONSTRAINT ledger_entries_entry_type_check CHECK (entry_type IN ('INITIAL_CASH', 'TRADE_FILL'));
      CREATE TABLE IF NOT EXISTS account_positions (
        account_id UUID NOT NULL REFERENCES accounts(account_id),
        security TEXT NOT NULL,
        quantity BIGINT NOT NULL CHECK (quantity >= 0),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (account_id, security)
      );
      CREATE TABLE IF NOT EXISTS recorded_fills (
        external_fill_id TEXT PRIMARY KEY,
        account_id UUID NOT NULL REFERENCES accounts(account_id),
        namespace TEXT NOT NULL,
        security TEXT NOT NULL,
        quantity BIGINT NOT NULL CHECK (quantity > 0),
        price NUMERIC(20, 4) NOT NULL CHECK (price > 0),
        currency CHAR(3) NOT NULL,
        effective_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
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

  async recordFill(command: RecordFillCommand): Promise<{ snapshot: AccountSnapshot; replayed: boolean }> {
    if (!/^[A-Z0-9.]{3,20}$/u.test(command.security) || !Number.isSafeInteger(command.quantity) || command.quantity <= 0) {
      throw new Error("invalid fill security or quantity");
    }
    if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,4})?$/u.test(command.price) || !/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,4})?$/u.test(command.fee) || !/^[A-Z]{3}$/u.test(command.currency)) {
      throw new Error("invalid fill price or currency");
    }
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const accountResult = await client.query<StoredAccount>("SELECT * FROM accounts WHERE account_id = $1 FOR UPDATE", [command.accountId]);
      const account = accountResult.rows[0];
      if (!account || account.namespace !== command.namespace) throw new Error("ACCOUNT_NOT_FOUND");
      if (account.currency !== command.currency) throw new Error("FILL_CURRENCY_MISMATCH");
      const inserted = await client.query(
        `INSERT INTO recorded_fills (external_fill_id, account_id, namespace, security, quantity, price, currency, effective_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (external_fill_id) DO NOTHING RETURNING external_fill_id`,
        [command.externalFillId, command.accountId, command.namespace, command.security, command.quantity, command.price, command.currency, command.effectiveAt]
      );
      if (inserted.rowCount === 1) {
        const amount = await client.query<{ amount: string }>("SELECT (-$1::numeric * $2::numeric - $3::numeric)::text AS amount", [command.quantity, command.price, command.fee]);
        await client.query("UPDATE accounts SET cash_amount = cash_amount + $1::numeric, ledger_version = ledger_version + 1 WHERE account_id = $2", [amount.rows[0].amount, command.accountId]);
        await client.query(
          `INSERT INTO ledger_entries (entry_id, account_id, namespace, entry_type, amount, currency, effective_at, source_ref)
           VALUES ($1,$2,$3,'TRADE_FILL',$4,$5,$6,$7)`,
          [randomUUID(), command.accountId, command.namespace, amount.rows[0].amount, command.currency, command.effectiveAt, command.externalFillId]
        );
        await client.query(
          `INSERT INTO account_positions (account_id, security, quantity) VALUES ($1,$2,$3)
           ON CONFLICT (account_id, security) DO UPDATE SET quantity = account_positions.quantity + EXCLUDED.quantity, updated_at = now()`,
          [command.accountId, command.security, command.quantity]
        );
      }
      const refreshed = await client.query<StoredAccount>("SELECT * FROM accounts WHERE account_id = $1", [command.accountId]);
      await client.query("COMMIT");
      return { snapshot: await this.toSnapshot(refreshed.rows[0]), replayed: inserted.rowCount === 0 };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
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
      positionCount: Number((await this.pool.query<{ count: string }>("SELECT count(*) FROM account_positions WHERE account_id = $1 AND quantity > 0", [account.account_id])).rows[0].count),
      ledgerEntryCount,
      ledgerVersion: Number((await this.pool.query<{ ledger_version: number }>("SELECT ledger_version FROM accounts WHERE account_id = $1", [account.account_id])).rows[0].ledger_version)
    };
  }
}

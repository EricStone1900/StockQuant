import { createHash, randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import type { AccountSnapshot, CorrectFillFeeCommand, InitializeAccountCommand, RecordFillCommand, ReserveResourceCommand, ResourceReservation } from "../domain/account.js";
import { assertPaperSettlement } from "../application/settlement-calendar.js";

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

async function migrateUnmappedSettlementReceivables(client: PoolClient): Promise<void> {
  await client.query(`ALTER TABLE sell_settlements ALTER COLUMN settlement_date DROP NOT NULL;
    ALTER TABLE sell_settlements ADD COLUMN IF NOT EXISTS settlement_error_code TEXT NULL;
    ALTER TABLE sell_settlements DROP CONSTRAINT IF EXISTS sell_settlements_mapping_check;
    ALTER TABLE sell_settlements ADD CONSTRAINT sell_settlements_mapping_check CHECK (
      (settlement_date IS NOT NULL AND settlement_error_code IS NULL)
      OR (settlement_date IS NULL AND settlement_error_code='SETTLEMENT_CALENDAR_UNAVAILABLE' AND status='PENDING')
    );`);
  await client.query("INSERT INTO portfolio_risk_schema_migrations(version, description) VALUES (3, 'Persist unmapped Paper SELL receivables without releasing cash')");
}

export class PostgresAccountRepository {
  constructor(private readonly pool: Pool) {}

  async migrate(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", ["stockquant:portfolio-risk-service:schema-migrations"]);
      await client.query(`
        CREATE TABLE IF NOT EXISTS portfolio_risk_schema_migrations (
          version INTEGER PRIMARY KEY,
          description TEXT NOT NULL,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      const applied = await client.query<{ version: number }>("SELECT version FROM portfolio_risk_schema_migrations ORDER BY version DESC LIMIT 1");
      const latestVersion = applied.rows[0]?.version ?? 0;
      if (latestVersion > 3) throw new Error(`Unsupported Portfolio Risk schema version ${latestVersion}`);
      if (latestVersion === 3) { await client.query("COMMIT"); return; }
      if (latestVersion === 2) { await migrateUnmappedSettlementReceivables(client); await client.query("COMMIT"); return; }
      if (latestVersion === 1) {
        await client.query(`CREATE TABLE IF NOT EXISTS sell_settlements (
          fill_id TEXT PRIMARY KEY REFERENCES recorded_fills(external_fill_id), account_id UUID NOT NULL REFERENCES accounts(account_id),
          amount NUMERIC(20,4) NOT NULL CHECK (amount >= 0), currency CHAR(3) NOT NULL,
          trade_date DATE NOT NULL, settlement_date DATE NOT NULL CHECK (settlement_date >= trade_date),
          calendar_version TEXT NOT NULL, status TEXT NOT NULL CHECK (status IN ('PENDING','SETTLED')),
          settled_at TIMESTAMPTZ NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        ); CREATE INDEX IF NOT EXISTS sell_settlements_due_idx ON sell_settlements(account_id,settlement_date) WHERE status='PENDING';`);
        await client.query("ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS ledger_entries_entry_type_check; ALTER TABLE ledger_entries ADD CONSTRAINT ledger_entries_entry_type_check CHECK (entry_type IN ('INITIAL_CASH','TRADE_FILL','FEE_CORRECTION','CASH_SETTLEMENT'))");
        await client.query("INSERT INTO portfolio_risk_schema_migrations(version, description) VALUES (2, 'Strict settled cash and pending sell receivables')");
        await migrateUnmappedSettlementReceivables(client);
        await client.query("COMMIT");
        return;
      }

      // Version 1 is the existing idempotent V1 account schema baseline. Running
      // it in one transaction upgrades databases created by the former startup
      // initializer while making future schema changes explicit and ordered.
      await client.query(`
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
        entry_type TEXT NOT NULL CHECK (entry_type IN ('INITIAL_CASH', 'TRADE_FILL', 'FEE_CORRECTION')),
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
      await client.query(`
      ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_environment_mode_check;
      ALTER TABLE accounts ADD CONSTRAINT accounts_environment_mode_check CHECK (environment_mode IN ('PAPER', 'BACKTEST'));
      ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS ledger_entries_account_id_entry_type_key;
      CREATE UNIQUE INDEX IF NOT EXISTS ledger_entries_account_id_source_ref_key ON ledger_entries(account_id, source_ref);
      ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS ledger_entries_entry_type_check;
      ALTER TABLE ledger_entries ADD CONSTRAINT ledger_entries_entry_type_check CHECK (entry_type IN ('INITIAL_CASH', 'TRADE_FILL', 'FEE_CORRECTION'));
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
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(), fee NUMERIC(20,4) NOT NULL DEFAULT 0,
        original_fee NUMERIC(20,4), fee_revision INTEGER NOT NULL DEFAULT 0,
        side TEXT NOT NULL DEFAULT 'BUY' CHECK (side IN ('BUY','SELL')),
        reservation_id UUID NULL
      );
      ALTER TABLE recorded_fills ADD COLUMN IF NOT EXISTS fee NUMERIC(20,4) NOT NULL DEFAULT 0;
      ALTER TABLE recorded_fills ADD COLUMN IF NOT EXISTS original_fee NUMERIC(20,4);
      UPDATE recorded_fills SET original_fee=fee WHERE original_fee IS NULL;
      ALTER TABLE recorded_fills ALTER COLUMN original_fee SET NOT NULL;
      ALTER TABLE recorded_fills ADD COLUMN IF NOT EXISTS fee_revision INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE recorded_fills ADD COLUMN IF NOT EXISTS side TEXT NOT NULL DEFAULT 'BUY';
      ALTER TABLE recorded_fills ADD COLUMN IF NOT EXISTS reservation_id UUID NULL;
      CREATE TABLE IF NOT EXISTS fill_fee_corrections (
        external_fill_id TEXT NOT NULL REFERENCES recorded_fills(external_fill_id),
        revision INTEGER NOT NULL CHECK (revision > 0), previous_fee NUMERIC(20,4) NOT NULL,
        corrected_fee NUMERIC(20,4) NOT NULL, effective_at TIMESTAMPTZ NOT NULL,
        evidence_ref TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY(external_fill_id,revision)
      );
      CREATE TABLE IF NOT EXISTS resource_reservations (
        reservation_id UUID PRIMARY KEY,
        account_id UUID NOT NULL REFERENCES accounts(account_id),
        namespace TEXT NOT NULL, test_run_id UUID NOT NULL, owner_id TEXT NOT NULL,
        idempotency_key TEXT NOT NULL, client_order_id TEXT NOT NULL,
        side TEXT NOT NULL CHECK (side IN ('BUY','SELL')),
        currency CHAR(3) NOT NULL, cash_amount NUMERIC(20,4) NULL CHECK (cash_amount > 0),
        security TEXT NULL, quantity BIGINT NULL CHECK (quantity > 0), as_of TIMESTAMPTZ NULL,
        captured_cash_amount NUMERIC(20,4) NOT NULL DEFAULT 0 CHECK (captured_cash_amount >= 0),
        captured_quantity BIGINT NOT NULL DEFAULT 0 CHECK (captured_quantity >= 0),
        status TEXT NOT NULL CHECK (status IN ('HELD','UNKNOWN','CAPTURED','RELEASED')),
        evidence_ref TEXT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(account_id,idempotency_key),
        CHECK ((side='BUY' AND cash_amount IS NOT NULL AND security IS NULL AND quantity IS NULL)
          OR (side='SELL' AND cash_amount IS NULL AND security IS NOT NULL AND quantity IS NOT NULL))
      );
      ALTER TABLE resource_reservations ADD COLUMN IF NOT EXISTS captured_cash_amount NUMERIC(20,4) NOT NULL DEFAULT 0;
      ALTER TABLE resource_reservations ADD COLUMN IF NOT EXISTS captured_quantity BIGINT NOT NULL DEFAULT 0;
      ALTER TABLE resource_reservations ADD COLUMN IF NOT EXISTS as_of TIMESTAMPTZ NULL;
      CREATE INDEX IF NOT EXISTS resource_reservations_cash_held_idx ON resource_reservations(account_id,currency) WHERE status IN ('HELD','UNKNOWN') AND side='BUY';
      CREATE INDEX IF NOT EXISTS resource_reservations_security_held_idx ON resource_reservations(account_id,security) WHERE status IN ('HELD','UNKNOWN') AND side='SELL';
      CREATE UNIQUE INDEX IF NOT EXISTS resource_reservations_order_identity_idx ON resource_reservations(account_id,client_order_id);
      `);
      await client.query("INSERT INTO portfolio_risk_schema_migrations(version, description) VALUES (1, 'V1 account, ledger, fills, and resource reservations')");
      await client.query(`CREATE TABLE IF NOT EXISTS sell_settlements (
        fill_id TEXT PRIMARY KEY REFERENCES recorded_fills(external_fill_id), account_id UUID NOT NULL REFERENCES accounts(account_id),
        amount NUMERIC(20,4) NOT NULL CHECK (amount >= 0), currency CHAR(3) NOT NULL,
        trade_date DATE NOT NULL, settlement_date DATE NOT NULL CHECK (settlement_date >= trade_date),
        calendar_version TEXT NOT NULL, status TEXT NOT NULL CHECK (status IN ('PENDING','SETTLED')),
        settled_at TIMESTAMPTZ NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      ); CREATE INDEX IF NOT EXISTS sell_settlements_due_idx ON sell_settlements(account_id,settlement_date) WHERE status='PENDING';`);
      await client.query("ALTER TABLE ledger_entries DROP CONSTRAINT IF EXISTS ledger_entries_entry_type_check; ALTER TABLE ledger_entries ADD CONSTRAINT ledger_entries_entry_type_check CHECK (entry_type IN ('INITIAL_CASH','TRADE_FILL','FEE_CORRECTION','CASH_SETTLEMENT'))");
      await client.query("INSERT INTO portfolio_risk_schema_migrations(version, description) VALUES (2, 'Strict settled cash and pending sell receivables')");
      await migrateUnmappedSettlementReceivables(client);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
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

  async settleDue(accountId: string, asOf: string): Promise<{ settledFillIds: string[] }> {
    if (!/(?:Z|[+-]\d{2}:\d{2})$/u.test(asOf) || !Number.isFinite(Date.parse(asOf))) throw new Error("INVALID_SETTLEMENT_CLOCK");
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const accountResult = await client.query<StoredAccount>("SELECT * FROM accounts WHERE account_id=$1 FOR UPDATE", [accountId]);
      const account = accountResult.rows[0];
      if (!account) throw new Error("ACCOUNT_NOT_FOUND");
      if (account.environment_mode !== "PAPER" || account.broker_mode !== "FAKE") throw new Error("SETTLEMENT_REQUIRES_PAPER_FAKE");
      const timeZone = account.market === "CN_A" ? "Asia/Shanghai" : "America/New_York";
      const due = await client.query<any>("SELECT fill_id,amount::text,currency FROM sell_settlements WHERE account_id=$1 AND status='PENDING' AND ((settlement_date + TIME '09:30') AT TIME ZONE $2) <= $3::timestamptz ORDER BY settlement_date,fill_id FOR UPDATE", [accountId, timeZone, asOf]);
      for (const row of due.rows) {
        await client.query("UPDATE sell_settlements SET status='SETTLED',settled_at=$2 WHERE fill_id=$1 AND status='PENDING'", [row.fill_id, asOf]);
        await client.query("UPDATE accounts SET cash_amount=cash_amount+$2::numeric,ledger_version=ledger_version+1 WHERE account_id=$1", [accountId, row.amount]);
        await client.query("INSERT INTO ledger_entries(entry_id,account_id,namespace,entry_type,amount,currency,effective_at,source_ref) VALUES($1,$2,$3,'CASH_SETTLEMENT',$4,$5,$6,$7) ON CONFLICT(account_id,source_ref) DO NOTHING", [randomUUID(), accountId, account.namespace, row.amount, account.currency, asOf, `settlement:${row.fill_id}`]);
      }
      await client.query("COMMIT");
      return { settledFillIds: due.rows.map((row: { fill_id: string }) => row.fill_id) };
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }

  async recordFill(command: RecordFillCommand): Promise<{ snapshot: AccountSnapshot; replayed: boolean }> {
    if (!/^[A-Z0-9.]{3,20}$/u.test(command.security) || !Number.isSafeInteger(command.quantity) || command.quantity <= 0) {
      throw new Error("invalid fill security or quantity");
    }
    if (!/(?:Z|[+-]\d{2}:\d{2})$/u.test(command.effectiveAt) || !Number.isFinite(Date.parse(command.effectiveAt))) throw new Error("invalid fill effectiveAt");
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
      const side = command.side ?? "BUY";
      if (side !== "BUY" && side !== "SELL") throw new Error("INVALID_FILL_SIDE");
      if (side === "SELL" && account.environment_mode === "PAPER" && (!command.settlement || !/^\d{4}-\d{2}-\d{2}$/u.test(command.settlement.tradeDate) || (command.settlement.settlementDate !== null && (!/^\d{4}-\d{2}-\d{2}$/u.test(command.settlement.settlementDate) || command.settlement.settlementDate < command.settlement.tradeDate)) || !command.settlement.calendarVersion || ![null, "SETTLEMENT_CALENDAR_UNAVAILABLE"].includes(command.settlement.settlementErrorCode))) throw new Error("INVALID_SELL_SETTLEMENT");
      if (side === "BUY" && command.settlement) throw new Error("INVALID_BUY_SETTLEMENT");
      if (side === "SELL" && account.environment_mode === "PAPER") assertPaperSettlement({ market: account.market, currency: command.currency, effectiveAt: command.effectiveAt, settlement: command.settlement! });
      const previousFill = await client.query<any>(`SELECT *, (price=$2::numeric AND original_fee=$3::numeric AND effective_at=$4::timestamptz) AS values_match
        FROM recorded_fills WHERE external_fill_id=$1`, [command.externalFillId, command.price, command.fee, command.effectiveAt]);
      if (previousFill.rowCount) {
        const row = previousFill.rows[0];
        if (!row.values_match || row.account_id !== command.accountId || row.namespace !== command.namespace || row.security !== command.security || Number(row.quantity) !== command.quantity || row.currency.trim() !== command.currency || row.side !== side || (row.reservation_id ?? null) !== (command.reservation?.reservationId ?? null)) throw new Error("FILL_IDEMPOTENCY_CONFLICT");
        if (side === "SELL") {
          const settlement = await client.query<any>("SELECT trade_date::text,settlement_date::text,calendar_version,settlement_error_code FROM sell_settlements WHERE fill_id=$1", [command.externalFillId]);
          const saved = settlement.rows[0];
          if (!saved || saved.trade_date !== command.settlement!.tradeDate || saved.settlement_date !== command.settlement!.settlementDate || saved.calendar_version !== command.settlement!.calendarVersion || saved.settlement_error_code !== command.settlement!.settlementErrorCode) throw new Error("FILL_IDEMPOTENCY_CONFLICT");
        }
        if (command.reservation) {
          const bound = await client.query("SELECT 1 FROM resource_reservations WHERE account_id=$1 AND reservation_id=$2 AND owner_id=$3 AND test_run_id=$4 AND namespace=$5 AND client_order_id=$6 AND side=$7 AND currency=$8", [command.accountId, command.reservation.reservationId, command.reservation.ownerId, command.reservation.testRunId, command.namespace, command.reservation.clientOrderId, side, command.currency]);
          if (!bound.rowCount) throw new Error("FILL_RESERVATION_SCOPE_MISMATCH");
        }
        await client.query("COMMIT");
        return { snapshot: await this.toSnapshot(account), replayed: true };
      }
      if (account.environment_mode === "PAPER" && !command.reservation) throw new Error("PAPER_FILL_REQUIRES_RESERVATION");
      let reservation: any = null;
      if (command.reservation) {
        const found = await client.query<any>("SELECT * FROM resource_reservations WHERE account_id=$1 AND reservation_id=$2 FOR UPDATE", [command.accountId, command.reservation.reservationId]);
        reservation = found.rows[0];
        if (!reservation || reservation.namespace !== command.namespace || reservation.test_run_id !== command.reservation.testRunId || reservation.owner_id !== command.reservation.ownerId || reservation.client_order_id !== command.reservation.clientOrderId || reservation.side !== side || reservation.currency.trim() !== command.currency || (side === "SELL" && reservation.security !== command.security) || !["HELD", "UNKNOWN"].includes(reservation.status)) throw new Error("FILL_RESERVATION_SCOPE_MISMATCH");
      }
      const totalAmount = await client.query<{ amount: string }>("SELECT ($1::numeric * $2::numeric + $3::numeric)::numeric(20,4)::text AS amount", [command.quantity, command.price, command.fee]);
      if (reservation && side === "BUY") {
        const within = await client.query<{ ok: boolean }>("SELECT ($1::numeric + $2::numeric <= $3::numeric) AS ok", [reservation.captured_cash_amount, totalAmount.rows[0].amount, reservation.cash_amount]);
        if (!within.rows[0].ok) throw new Error("FILL_EXCEEDS_RESERVED_CASH");
      }
      if (reservation && side === "SELL" && Number(reservation.captured_quantity) + command.quantity > Number(reservation.quantity)) throw new Error("FILL_EXCEEDS_RESERVED_QUANTITY");
      const inserted = await client.query(
        `INSERT INTO recorded_fills (external_fill_id, account_id, namespace, security, quantity, price, currency, effective_at, side, reservation_id, fee, original_fee)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11) ON CONFLICT (external_fill_id) DO NOTHING RETURNING external_fill_id`,
        [command.externalFillId, command.accountId, command.namespace, command.security, command.quantity, command.price, command.currency, command.effectiveAt, side, reservation?.reservation_id ?? null, command.fee]
      );
      if (inserted.rowCount === 1) {
        const amount = await client.query<{ amount: string }>("SELECT CASE WHEN $4='BUY' THEN (-$1::numeric * $2::numeric - $3::numeric)::text ELSE ($1::numeric * $2::numeric - $3::numeric)::text END AS amount", [command.quantity, command.price, command.fee, side]);
        if (side === "BUY" || account.environment_mode !== "PAPER") await client.query("UPDATE accounts SET cash_amount = cash_amount + $1::numeric, ledger_version = ledger_version + 1 WHERE account_id = $2", [amount.rows[0].amount, command.accountId]);
        await client.query(
          `INSERT INTO ledger_entries (entry_id, account_id, namespace, entry_type, amount, currency, effective_at, source_ref)
           VALUES ($1,$2,$3,'TRADE_FILL',$4,$5,$6,$7)`,
          [randomUUID(), command.accountId, command.namespace, side === "SELL" && account.environment_mode === "PAPER" ? "0.0000" : amount.rows[0].amount, command.currency, command.effectiveAt, command.externalFillId]
        );
        if (side === "SELL" && account.environment_mode === "PAPER") await client.query(
          `INSERT INTO sell_settlements(fill_id,account_id,amount,currency,trade_date,settlement_date,calendar_version,settlement_error_code,status)
           VALUES($1,$2,$3,$4,$5,$6,$7,$8,'PENDING')`,
          [command.externalFillId, command.accountId, amount.rows[0].amount, command.currency, command.settlement!.tradeDate, command.settlement!.settlementDate, command.settlement!.calendarVersion, command.settlement!.settlementErrorCode]
        );
        if (side === "BUY") await client.query(
          `INSERT INTO account_positions (account_id, security, quantity) VALUES ($1,$2,$3)
           ON CONFLICT (account_id, security) DO UPDATE SET quantity = account_positions.quantity + EXCLUDED.quantity, updated_at = now()`,
          [command.accountId, command.security, command.quantity]
        );
        else {
          const position = await client.query("UPDATE account_positions SET quantity=quantity-$3,updated_at=now() WHERE account_id=$1 AND security=$2 AND quantity >= $3 RETURNING quantity", [command.accountId, command.security, command.quantity]);
          if (position.rowCount !== 1) throw new Error("FILL_EXCEEDS_AVAILABLE_POSITION");
        }
        if (reservation && side === "BUY") await client.query("UPDATE resource_reservations SET captured_cash_amount=captured_cash_amount+$3::numeric,updated_at=now() WHERE account_id=$1 AND reservation_id=$2", [command.accountId, reservation.reservation_id, totalAmount.rows[0].amount]);
        if (reservation && side === "SELL") await client.query("UPDATE resource_reservations SET captured_quantity=captured_quantity+$3,updated_at=now() WHERE account_id=$1 AND reservation_id=$2", [command.accountId, reservation.reservation_id, command.quantity]);
      } else {
        const previous = await client.query<any>("SELECT account_id,namespace,security,quantity,price=$3::numeric AS price_matches,original_fee=$4::numeric AS fee_matches,currency,side,reservation_id,effective_at=$2::timestamptz AS time_matches FROM recorded_fills WHERE external_fill_id=$1", [command.externalFillId, command.effectiveAt, command.price, command.fee]);
        const row = previous.rows[0];
        if (!row || row.account_id !== command.accountId || row.namespace !== command.namespace || row.security !== command.security || Number(row.quantity) !== command.quantity || !row.price_matches || !row.fee_matches || !row.time_matches || row.currency.trim() !== command.currency || row.side !== side || (row.reservation_id ?? null) !== (reservation?.reservation_id ?? null)) throw new Error("FILL_IDEMPOTENCY_CONFLICT");
      }
      const refreshed = await client.query<StoredAccount>("SELECT * FROM accounts WHERE account_id = $1", [command.accountId]);
      await client.query("COMMIT");
      return { snapshot: await this.toSnapshot(refreshed.rows[0]), replayed: inserted.rowCount === 0 };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }

  async correctFillFee(command: CorrectFillFeeCommand): Promise<{ snapshot: AccountSnapshot; replayed: boolean }> {
    if (!command.externalFillId || command.externalFillId.length > 128 || !Number.isSafeInteger(command.revision) || command.revision < 1 ||
      !/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,4})?$/u.test(command.previousFee) || !/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,4})?$/u.test(command.correctedFee) ||
      !/(?:Z|[+-]\d{2}:\d{2})$/u.test(command.effectiveAt) || !Number.isFinite(Date.parse(command.effectiveAt)) || !command.evidenceRef || command.evidenceRef.length > 512) {
      throw new Error("INVALID_FEE_CORRECTION");
    }
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const accountResult = await client.query<StoredAccount>("SELECT * FROM accounts WHERE account_id=$1 FOR UPDATE", [command.accountId]);
      const account = accountResult.rows[0];
      if (!account) throw new Error("ACCOUNT_NOT_FOUND");
      const fillResult = await client.query<any>("SELECT *,fee=$2::numeric AS fee_matches FROM recorded_fills WHERE external_fill_id=$1 FOR UPDATE", [command.externalFillId, command.previousFee]);
      const fill = fillResult.rows[0];
      if (!fill || fill.account_id !== command.accountId || fill.namespace !== account.namespace) throw new Error("FILL_NOT_FOUND");
      const priorCorrection = await client.query<any>(`SELECT previous_fee=$3::numeric AS previous_matches,corrected_fee=$4::numeric AS corrected_matches,
        effective_at=$5::timestamptz AS effective_at_matches,evidence_ref FROM fill_fee_corrections
        WHERE external_fill_id=$1 AND revision=$2`, [command.externalFillId, command.revision, command.previousFee, command.correctedFee, command.effectiveAt]);
      if (priorCorrection.rowCount) {
        const prior = priorCorrection.rows[0];
        const same = prior.previous_matches && prior.corrected_matches && prior.effective_at_matches && prior.evidence_ref === command.evidenceRef;
        if (!same) throw new Error("FEE_CORRECTION_IDEMPOTENCY_CONFLICT");
        const refreshed = await client.query<StoredAccount>("SELECT * FROM accounts WHERE account_id=$1", [command.accountId]);
        await client.query("COMMIT");
        return { snapshot: await this.toSnapshot(refreshed.rows[0]), replayed: true };
      }
      if (command.revision !== fill.fee_revision + 1 || !fill.fee_matches) throw new Error("FEE_CORRECTION_STALE_OR_OUT_OF_ORDER");
      const delta = await client.query<{ amount: string }>("SELECT ($1::numeric-$2::numeric)::numeric(20,4)::text AS amount", [command.previousFee, command.correctedFee]);
      await client.query("UPDATE recorded_fills SET fee=$2::numeric,fee_revision=$3 WHERE external_fill_id=$1", [command.externalFillId, command.correctedFee, command.revision]);
      if (fill.side === "SELL" && account.environment_mode === "PAPER") {
        const pending = await client.query("UPDATE sell_settlements SET amount=amount+$2::numeric WHERE fill_id=$1 AND status='PENDING' RETURNING fill_id", [command.externalFillId, delta.rows[0].amount]);
        if (pending.rowCount === 0) await client.query("UPDATE accounts SET cash_amount=cash_amount+$2::numeric,ledger_version=ledger_version+1 WHERE account_id=$1", [command.accountId, delta.rows[0].amount]);
      } else {
        await client.query("UPDATE accounts SET cash_amount=cash_amount+$2::numeric,ledger_version=ledger_version+1 WHERE account_id=$1", [command.accountId, delta.rows[0].amount]);
      }
      await client.query(`INSERT INTO ledger_entries(entry_id,account_id,namespace,entry_type,amount,currency,effective_at,source_ref)
        VALUES($1,$2,$3,'FEE_CORRECTION',$4,$5,$6,$7)`, [randomUUID(), command.accountId, account.namespace, delta.rows[0].amount, fill.currency, command.effectiveAt, `fee-correction:${command.externalFillId}:${command.revision}`]);
      if (fill.side === "BUY" && fill.reservation_id) {
        await client.query("UPDATE resource_reservations SET captured_cash_amount=captured_cash_amount-$3::numeric,updated_at=now() WHERE account_id=$1 AND reservation_id=$2", [command.accountId, fill.reservation_id, delta.rows[0].amount]);
      }
      await client.query(`INSERT INTO fill_fee_corrections(external_fill_id,revision,previous_fee,corrected_fee,effective_at,evidence_ref)
        VALUES($1,$2,$3,$4,$5,$6)`, [command.externalFillId, command.revision, command.previousFee, command.correctedFee, command.effectiveAt, command.evidenceRef]);
      const refreshed = await client.query<StoredAccount>("SELECT * FROM accounts WHERE account_id=$1", [command.accountId]);
      await client.query("COMMIT");
      return { snapshot: await this.toSnapshot(refreshed.rows[0]), replayed: false };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }

  /** A current-state quote only: the subsequent reservation rechecks under the same account lock. */
  async sellable(input: { accountId: string; ownerId: string; namespace: string; testRunId: string; security: string; asOf: string }): Promise<number | null> {
    if (!input.ownerId || !input.namespace || !input.testRunId || !/^[A-Z0-9.]{3,20}$/u.test(input.security) || !/(?:Z|[+-]\d{2}:\d{2})$/u.test(input.asOf) || !Number.isFinite(Date.parse(input.asOf))) throw new Error("INVALID_SELLABLE_QUERY");
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<StoredAccount>("SELECT * FROM accounts WHERE account_id=$1 FOR UPDATE", [input.accountId]);
      const account = result.rows[0];
      if (!account) { await client.query("COMMIT"); return null; }
      if (account.owner_id !== input.ownerId || account.namespace !== input.namespace || account.test_run_id !== input.testRunId || account.environment_mode !== "PAPER" || account.broker_mode !== "FAKE") throw new Error("ACCOUNT_SCOPE_MISMATCH");
      const future = await client.query("SELECT 1 FROM recorded_fills WHERE account_id=$1 AND effective_at > $2::timestamptz LIMIT 1", [input.accountId, input.asOf]);
      if (future.rowCount) throw new Error("SELLABLE_HISTORICAL_STATE_UNAVAILABLE");
      const position = await client.query<{ quantity: string }>("SELECT quantity::text AS quantity FROM account_positions WHERE account_id=$1 AND security=$2", [input.accountId, input.security]);
      const sameDay = account.market === "CN_A" ? await client.query<{ quantity: string }>(`SELECT COALESCE(sum(quantity),0)::text AS quantity FROM recorded_fills WHERE account_id=$1 AND security=$2 AND side='BUY' AND (effective_at AT TIME ZONE 'Asia/Shanghai')::date = ($3::timestamptz AT TIME ZONE 'Asia/Shanghai')::date`, [input.accountId, input.security, input.asOf]) : { rows: [{ quantity: "0" }] };
      const reserved = await client.query<{ quantity: string }>(`SELECT COALESCE(sum(quantity-captured_quantity),0)::text AS quantity FROM resource_reservations WHERE account_id=$1 AND security=$2 AND side='SELL' AND status IN ('HELD','UNKNOWN')`, [input.accountId, input.security]);
      const quantities = [position.rows[0]?.quantity ?? "0", sameDay.rows[0]!.quantity, reserved.rows[0]!.quantity].map(Number);
      if (!quantities.every(Number.isSafeInteger)) throw new Error("SELLABLE_QUANTITY_UNAVAILABLE");
      const quantity = Math.max(0, quantities[0]! - quantities[1]! - quantities[2]!);
      await client.query("COMMIT"); return quantity;
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }

  async reserveResource(command: ReserveResourceCommand): Promise<{ reservation: ResourceReservation; replayed: boolean }> {
    if (!command.idempotencyKey || command.idempotencyKey.length > 128 || !command.clientOrderId || command.clientOrderId.length > 128) throw new Error("INVALID_RESERVATION_IDENTITY");
    if (!command.namespace || !command.testRunId || !command.ownerId) throw new Error("INVALID_RESERVATION_SCOPE");
    if (command.side !== "BUY" && command.side !== "SELL") throw new Error("INVALID_RESERVATION_SIDE");
    if (command.side === "SELL" && (!command.asOf || !Number.isFinite(Date.parse(command.asOf)))) throw new Error("SELL_RESERVATION_REQUIRES_RUN_CLOCK");
    if (!/^[A-Z]{3}$/u.test(command.currency)) throw new Error("INVALID_RESERVATION_CURRENCY");
    if (command.side === "BUY" && (command.security !== null || command.quantity !== null || !/^(?:0|[1-9][0-9]{0,15})(?:\.[0-9]{1,4})?$/u.test(command.cashAmount ?? "") || (command.cashAmount ?? "").replace(/[.0]/gu, "") === "")) throw new Error("INVALID_RESERVATION_AMOUNT");
    if (command.side === "SELL" && (command.cashAmount !== null || !command.security || !/^[A-Z0-9.]{3,20}$/u.test(command.security) || !Number.isSafeInteger(command.quantity) || (command.quantity ?? 0) <= 0)) throw new Error("INVALID_RESERVATION_QUANTITY");
    const normalizeCash = (amount: string | null) => amount === null ? null : `${amount.split(".")[0]}.${(amount.split(".")[1] ?? "").padEnd(4, "0")}`;
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const accountResult = await client.query<StoredAccount>("SELECT * FROM accounts WHERE account_id=$1 FOR UPDATE", [command.accountId]);
      const account = accountResult.rows[0];
      if (!account || account.namespace !== command.namespace || account.test_run_id !== command.testRunId || account.owner_id !== command.ownerId) throw new Error("ACCOUNT_SCOPE_MISMATCH");
      if (account.environment_mode !== "PAPER" || account.broker_mode !== "FAKE") throw new Error("RESERVATION_REQUIRES_PAPER_FAKE");
      if (account.currency !== command.currency) throw new Error("RESERVATION_CURRENCY_MISMATCH");
      const previous = await client.query<any>("SELECT * FROM resource_reservations WHERE account_id=$1 AND (idempotency_key=$2 OR client_order_id=$3) FOR UPDATE", [command.accountId, command.idempotencyKey, command.clientOrderId]);
      if (previous.rowCount) {
        const row = previous.rows[0];
        const sameAsOf = row.as_of == null ? command.asOf == null : command.asOf != null && new Date(row.as_of).getTime() === Date.parse(command.asOf);
        const same = sameAsOf && row.namespace === command.namespace && row.test_run_id === command.testRunId && row.owner_id === command.ownerId && row.idempotency_key === command.idempotencyKey && row.client_order_id === command.clientOrderId && row.side === command.side && row.currency.trim() === command.currency && normalizeCash(row.cash_amount) === normalizeCash(command.cashAmount) && row.security === command.security && (row.quantity == null ? command.quantity == null : String(row.quantity) === String(command.quantity));
        if (!same) throw new Error("RESERVATION_IDEMPOTENCY_CONFLICT");
        await client.query("COMMIT");
        return { reservation: this.mapReservation(row), replayed: true };
      }
      if (command.side === "BUY") {
        const available = await client.query<{ sufficient: boolean }>(`SELECT ($1::numeric - COALESCE(sum(cash_amount-captured_cash_amount),0) - $3::numeric) >= 0 AS sufficient
          FROM resource_reservations WHERE account_id=$2 AND currency=$4 AND side='BUY' AND status IN ('HELD','UNKNOWN')`, [account.cash_amount, command.accountId, command.cashAmount, command.currency]);
        if (!available.rows[0].sufficient) throw new Error("INSUFFICIENT_AVAILABLE_CASH");
      } else {
        const position = await client.query<{ quantity: string }>("SELECT quantity::text AS quantity FROM account_positions WHERE account_id=$1 AND security=$2 FOR UPDATE", [command.accountId, command.security]);
        const sameDayBuys = account.market === "CN_A"
          ? await client.query<{ quantity: string }>(`SELECT COALESCE(sum(quantity),0)::text AS quantity FROM recorded_fills
              WHERE account_id=$1 AND security=$2 AND side='BUY'
                AND (effective_at AT TIME ZONE 'Asia/Shanghai')::date = ($3::timestamptz AT TIME ZONE 'Asia/Shanghai')::date`, [command.accountId, command.security, command.asOf])
          : { rows: [{ quantity: "0" }] };
        const held = Number(position.rows[0]?.quantity ?? 0);
        const unsettled = Number(sameDayBuys.rows[0].quantity);
        const reserved = await client.query<{ quantity: string }>(`SELECT COALESCE(sum(quantity-captured_quantity),0)::text AS quantity
          FROM resource_reservations WHERE account_id=$1 AND security=$2 AND side='SELL' AND status IN ('HELD','UNKNOWN')`, [command.accountId, command.security]);
        const remaining = held - Number(reserved.rows[0].quantity);
        if (remaining < (command.quantity ?? 0)) throw new Error("INSUFFICIENT_SELLABLE_QUANTITY");
        if (remaining - unsettled < (command.quantity ?? 0)) throw new Error("T_PLUS_ONE_UNSETTLED_QUANTITY");
      }
      const inserted = await client.query<any>(`INSERT INTO resource_reservations(reservation_id,account_id,namespace,test_run_id,owner_id,idempotency_key,client_order_id,side,currency,cash_amount,security,quantity,as_of,status)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'HELD') RETURNING *`, [randomUUID(), command.accountId, command.namespace, command.testRunId, command.ownerId, command.idempotencyKey, command.clientOrderId, command.side, command.currency, command.cashAmount, command.security, command.quantity, command.asOf ?? null]);
      await client.query("COMMIT");
      return { reservation: this.mapReservation(inserted.rows[0]), replayed: false };
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }

  async resolveReservation(input: { accountId: string; reservationId: string; namespace: string; testRunId: string; ownerId: string; outcome: "FILLED" | "CANCELLED" | "REJECTED" | "EXPIRED" | "UNKNOWN"; evidenceRef: string }): Promise<ResourceReservation | null> {
    const { accountId, reservationId, namespace, testRunId, ownerId, outcome, evidenceRef } = input;
    if (!["FILLED", "CANCELLED", "REJECTED", "EXPIRED", "UNKNOWN"].includes(outcome)) throw new Error("INVALID_RESOLUTION_OUTCOME");
    if (!namespace || !testRunId || !ownerId) throw new Error("INVALID_RESOLUTION_SCOPE");
    if (!evidenceRef || evidenceRef.length > 512) throw new Error("RESOLUTION_EVIDENCE_REQUIRED");
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const account = await client.query<StoredAccount>("SELECT * FROM accounts WHERE account_id=$1 FOR UPDATE", [accountId]);
      if (!account.rowCount || account.rows[0].namespace !== namespace || account.rows[0].test_run_id !== testRunId || account.rows[0].owner_id !== ownerId) throw new Error("ACCOUNT_SCOPE_MISMATCH");
      const found = await client.query<any>("SELECT * FROM resource_reservations WHERE account_id=$1 AND reservation_id=$2 FOR UPDATE", [accountId, reservationId]);
      if (!found.rowCount) { await client.query("COMMIT"); return null; }
      const row = found.rows[0];
      if (row.namespace !== namespace || row.test_run_id !== testRunId || row.owner_id !== ownerId) throw new Error("ACCOUNT_SCOPE_MISMATCH");
      if (outcome === "FILLED" && Number(row.captured_cash_amount ?? 0) === 0 && Number(row.captured_quantity ?? 0) === 0) throw new Error("RESERVATION_FILL_REQUIRED");
      const status = outcome === "UNKNOWN" ? "UNKNOWN" : outcome === "FILLED" ? "CAPTURED" : "RELEASED";
      if (["CAPTURED", "RELEASED"].includes(row.status)) {
        if (row.status !== status || row.evidence_ref !== evidenceRef) throw new Error("RESERVATION_ALREADY_RESOLVED");
        await client.query("COMMIT"); return this.mapReservation(row);
      }
      const updated = await client.query<any>("UPDATE resource_reservations SET status=$3,evidence_ref=$4,updated_at=now() WHERE account_id=$1 AND reservation_id=$2 RETURNING *", [accountId, reservationId, status, evidenceRef]);
      await client.query("COMMIT"); return this.mapReservation(updated.rows[0]);
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }

  private mapReservation(row: any): ResourceReservation {
    return { reservationId: row.reservation_id, accountId: row.account_id, namespace: row.namespace, testRunId: row.test_run_id, ownerId: row.owner_id, idempotencyKey: row.idempotency_key, clientOrderId: row.client_order_id, side: row.side, currency: row.currency.trim(), cashAmount: row.cash_amount, security: row.security, quantity: row.quantity == null ? null : Number(row.quantity), capturedCashAmount: row.captured_cash_amount ?? "0.0000", capturedQuantity: Number(row.captured_quantity ?? 0), status: row.status, evidenceRef: row.evidence_ref };
  }

  private async toSnapshot(account: StoredAccount, knownLedgerEntryCount?: number): Promise<AccountSnapshot> {
    const ledgerEntryCount = knownLedgerEntryCount ?? Number((await this.pool.query<{ count: string }>(
      "SELECT count(*) FROM ledger_entries WHERE account_id = $1",
      [account.account_id]
    )).rows[0].count);
    const positions = await this.pool.query<{ security: string; quantity: string }>("SELECT security,quantity::text FROM account_positions WHERE account_id=$1 AND quantity>0 ORDER BY security", [account.account_id]);
    const reservations = await this.pool.query<any>("SELECT reservation_id,client_order_id,side,cash_amount::text,captured_cash_amount::text,captured_quantity::text,status,evidence_ref FROM resource_reservations WHERE account_id=$1 ORDER BY created_at,reservation_id", [account.account_id]);
    const receivables = await this.pool.query<any>("SELECT fill_id,amount::text,currency,trade_date::text,settlement_date::text,calendar_version,settlement_error_code,status FROM sell_settlements WHERE account_id=$1 ORDER BY settlement_date NULLS LAST,fill_id", [account.account_id]);
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
      unsettledReceivables: receivables.rows.map((row) => ({ fillId: row.fill_id, amount: row.amount, currency: row.currency.trim(), tradeDate: row.trade_date, settlementDate: row.settlement_date, calendarVersion: row.calendar_version, settlementErrorCode: row.settlement_error_code, status: row.status })),
      positionCount: Number((await this.pool.query<{ count: string }>("SELECT count(*) FROM account_positions WHERE account_id = $1 AND quantity > 0", [account.account_id])).rows[0].count),
      ledgerEntryCount,
      ledgerVersion: Number((await this.pool.query<{ ledger_version: number }>("SELECT ledger_version FROM accounts WHERE account_id = $1", [account.account_id])).rows[0].ledger_version),
      positions: positions.rows.map((row) => ({ security: row.security, quantity: Number(row.quantity) })),
      reservations: reservations.rows.map((row) => ({ reservationId: row.reservation_id, clientOrderId: row.client_order_id, side: row.side, cashAmount: row.cash_amount, capturedCashAmount: row.captured_cash_amount ?? "0.0000", capturedQuantity: Number(row.captured_quantity ?? 0), status: row.status, evidenceRef: row.evidence_ref }))
    };
  }
}

import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PostgresAccountRepository } from "../../src/adapters/postgres-account-repository.js";

const connectionString = process.env.PORTFOLIO_RISK_TEST_DATABASE_URL;
if (connectionString) {
  const parsed = new URL(connectionString);
  if (parsed.pathname !== "/portfolio_risk_test" || parsed.username !== "portfolio_risk") throw new Error("PORTFOLIO_RISK_TEST_DATABASE_URL must use the isolated portfolio_risk_test database and portfolio_risk service role");
}
const run = connectionString ? describe : describe.skip;

run("persistent account resource reservations", () => {
  const pool = new Pool({ connectionString });
  const repository = new PostgresAccountRepository(pool);
  const testRunId = randomUUID();
  const namespace = `reservation-test/${testRunId}`;
  const ownerId = `owner-${testRunId}`;
  let accountId = "";
  const resolve = (reservationId: string, outcome: "FILLED" | "CANCELLED" | "REJECTED" | "EXPIRED" | "UNKNOWN", evidenceRef: string) => repository.resolveReservation({ accountId, reservationId, namespace, testRunId, ownerId, outcome, evidenceRef });

  beforeAll(async () => {
    await Promise.all([repository.migrate(), new PostgresAccountRepository(pool).migrate()]);
    const initialized = await repository.initialize({
      fixtureAccountRef: `fixture-${testRunId}`, ownerId, market: "CN_A", environmentMode: "PAPER", brokerMode: "FAKE",
      initialCash: { amount: "10000.0000", currency: "CNY" }, namespace, testRunId, idempotencyKey: `init-${testRunId}`
    });
    accountId = initialized.snapshot.accountId;
    await pool.query("INSERT INTO account_positions(account_id,security,quantity) VALUES($1,'600000.SH',100)", [accountId]);
  });

  afterAll(async () => {
    if (accountId) {
      await pool.query("DELETE FROM resource_reservations WHERE account_id=$1", [accountId]);
      await pool.query("DELETE FROM fill_fee_corrections c USING recorded_fills f WHERE c.external_fill_id=f.external_fill_id AND f.account_id=$1", [accountId]);
      await pool.query("DELETE FROM recorded_fills WHERE account_id=$1", [accountId]);
      await pool.query("DELETE FROM account_positions WHERE account_id=$1", [accountId]);
      await pool.query("DELETE FROM ledger_entries WHERE account_id=$1", [accountId]);
      await pool.query("DELETE FROM accounts WHERE account_id=$1", [accountId]);
      const remaining = await pool.query<{ reservations: string; fills: string; positions: string; ledger: string; accounts: string }>(`SELECT
        (SELECT count(*) FROM resource_reservations WHERE account_id=$1)::text AS reservations,
        (SELECT count(*) FROM recorded_fills WHERE account_id=$1)::text AS fills,
        (SELECT count(*) FROM account_positions WHERE account_id=$1)::text AS positions,
        (SELECT count(*) FROM ledger_entries WHERE account_id=$1)::text AS ledger,
        (SELECT count(*) FROM accounts WHERE account_id=$1)::text AS accounts`, [accountId]);
      if (Object.values(remaining.rows[0]).some((count) => count !== "0")) throw new Error("isolated reservation test account cleanup left rows");
    }
    await pool.end();
  });

  it("records the V1 schema baseline once across concurrent startup migrations", async () => {
    const result = await pool.query<{ version: number; description: string; count: string }>(`
      SELECT version, description, (SELECT count(*)::text FROM portfolio_risk_schema_migrations) AS count
        FROM portfolio_risk_schema_migrations
       WHERE version = 1
    `);
    expect(result.rows).toEqual([{
      version: 1,
      description: "V1 account, ledger, fills, and resource reservations",
      count: "1"
    }]);
    console.info(`[Portfolio schema migration] ${JSON.stringify({ version: 1, count: result.rows[0].count, concurrentStartup: "serialized", existingSchema: "baseline adopted transactionally" })}`);
  });

  it("persists separate CN and US cash ledgers with original currencies and conflict-safe initialization replay", async () => {
    const isolatedRunId = randomUUID();
    const isolatedNamespace = `dual-market-account-test/${isolatedRunId}`;
    const isolatedOwner = `owner-${isolatedRunId}`;
    const common = { ownerId: isolatedOwner, environmentMode: "PAPER" as const, brokerMode: "FAKE" as const, namespace: isolatedNamespace, testRunId: isolatedRunId };
    const cnCommand = { ...common, fixtureAccountRef: `cn-${isolatedRunId}`, market: "CN_A" as const, initialCash: { amount: "10000.0000", currency: "CNY" }, idempotencyKey: "initialize-cn" };
    const usCommand = { ...common, fixtureAccountRef: `us-${isolatedRunId}`, market: "US_EQUITY" as const, initialCash: { amount: "10000.0000", currency: "USD" }, idempotencyKey: "initialize-us" };
    let accountIds: string[] = [];
    try {
      const [cn, us] = await Promise.all([repository.initialize(cnCommand), repository.initialize(usCommand)]);
      accountIds = [cn.snapshot.accountId, us.snapshot.accountId];
      expect(new Set(accountIds).size).toBe(2);
      expect(cn.snapshot).toMatchObject({ market: "CN_A", cash: { amount: "10000.0000", currency: "CNY" } });
      expect(us.snapshot).toMatchObject({ market: "US_EQUITY", cash: { amount: "10000.0000", currency: "USD" } });

      await expect(repository.initialize(cnCommand)).resolves.toMatchObject({ replayed: true, snapshot: { accountId: cn.snapshot.accountId } });
      await expect(repository.initialize({ ...cnCommand, initialCash: { amount: "9999.0000", currency: "CNY" } })).rejects.toThrow("IDEMPOTENCY_CONFLICT");
      await expect(repository.initialize({ ...cnCommand, ownerId: "foreign-owner" })).rejects.toThrow("IDEMPOTENCY_CONFLICT");
      await expect(repository.snapshot(cn.snapshot.accountId, "foreign-owner")).resolves.toBeNull();

      const ledger = await pool.query<{ market: string; currency: string; entry_count: number; amount: string }>(
        `SELECT a.market, le.currency, count(*)::int AS entry_count, sum(le.amount)::text AS amount
           FROM accounts a JOIN ledger_entries le USING(account_id)
          WHERE a.account_id = ANY($1::uuid[])
          GROUP BY a.market, le.currency ORDER BY a.market`, [accountIds]
      );
      expect(ledger.rows).toEqual([
        { market: "CN_A", currency: "CNY", entry_count: 1, amount: "10000.0000" },
        { market: "US_EQUITY", currency: "USD", entry_count: 1, amount: "10000.0000" }
      ]);
      console.info(`[Portfolio dual-market account] ${JSON.stringify({ testRunId: isolatedRunId, accountIds, currencies: ledger.rows.map(({ market, currency }) => ({ market, currency })), idempotency: "same-payload-replayed/different-payload-and-owner-rejected", foreignOwnerRead: "DENIED" })}`);
    } finally {
      if (accountIds.length) {
        await pool.query("DELETE FROM ledger_entries WHERE account_id = ANY($1::uuid[])", [accountIds]);
        await pool.query("DELETE FROM accounts WHERE account_id = ANY($1::uuid[])", [accountIds]);
      }
    }
  });

  it("serializes concurrent cash reservations and retains UNKNOWN until authoritative release", async () => {
    const base = { accountId, namespace, testRunId, ownerId, side: "BUY" as const, currency: "CNY", cashAmount: "7000.0000", security: null, quantity: null };
    await expect(repository.reserveResource({ ...base, cashAmount: "0.0000", idempotencyKey: "cash-zero", clientOrderId: "order-zero" })).rejects.toThrow("INVALID_RESERVATION_AMOUNT");
    await expect(repository.reserveResource({ ...base, cashAmount: "1.00001", idempotencyKey: "cash-precision", clientOrderId: "order-precision" })).rejects.toThrow("INVALID_RESERVATION_AMOUNT");
    await expect(repository.reserveResource({ ...base, cashAmount: "10000000000000000", idempotencyKey: "cash-overflow", clientOrderId: "order-overflow" })).rejects.toThrow("INVALID_RESERVATION_AMOUNT");
    const results = await Promise.allSettled([
      repository.reserveResource({ ...base, idempotencyKey: "cash-a", clientOrderId: "order-a" }),
      repository.reserveResource({ ...base, idempotencyKey: "cash-b", clientOrderId: "order-b" })
    ]);
    const accepted = results.filter((result) => result.status === "fulfilled").map((result) => (result as PromiseFulfilledResult<Awaited<ReturnType<typeof repository.reserveResource>>>).value);
    expect(accepted).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason.message).toBe("INSUFFICIENT_AVAILABLE_CASH");
    const held = accepted[0].reservation;
    await expect(repository.reserveResource({ ...base, cashAmount: "7000", idempotencyKey: held.idempotencyKey, clientOrderId: held.clientOrderId })).resolves.toMatchObject({ replayed: true, reservation: { reservationId: held.reservationId } });
    await resolve(held.reservationId, "UNKNOWN", "fakebroker-timeout:order");
    await expect(repository.reserveResource({ ...base, cashAmount: "3001.0000", idempotencyKey: "cash-c", clientOrderId: "order-c" })).rejects.toThrow("INSUFFICIENT_AVAILABLE_CASH");
    await resolve(held.reservationId, "CANCELLED", "fakebroker-query:cancelled");
    const finalCash = await repository.reserveResource({ ...base, idempotencyKey: "cash-d", clientOrderId: "order-d" });
    expect(finalCash).toMatchObject({ replayed: false, reservation: { status: "HELD" } });
    await resolve(finalCash.reservation.reservationId, "CANCELLED", "cleanup:cash-d");
    await expect(repository.reserveResource({ ...base, ownerId: "other-owner", idempotencyKey: "cash-e", clientOrderId: "order-e" })).rejects.toThrow("ACCOUNT_SCOPE_MISMATCH");
  });

  it("serializes sellable quantity, supports idempotent retries, and releases only with evidence", async () => {
    const base = { accountId, namespace, testRunId, ownerId, side: "SELL" as const, currency: "CNY", cashAmount: null, security: "600000.SH", quantity: 80, asOf: "2026-09-25T01:00:00.000Z" };
    const first = await repository.reserveResource({ ...base, idempotencyKey: "sell-a", clientOrderId: "sell-order-a" });
    await expect(repository.reserveResource({ ...base, idempotencyKey: "sell-a", clientOrderId: "sell-order-a" })).resolves.toMatchObject({ replayed: true, reservation: { reservationId: first.reservation.reservationId } });
    await expect(repository.reserveResource({ ...base, asOf: "2026-09-26T01:00:00.000Z", idempotencyKey: "sell-a", clientOrderId: "sell-order-a" })).rejects.toThrow("RESERVATION_IDEMPOTENCY_CONFLICT");
    await expect(repository.reserveResource({ ...base, idempotencyKey: "sell-a-alt", clientOrderId: "sell-order-a" })).rejects.toThrow("RESERVATION_IDEMPOTENCY_CONFLICT");
    await expect(repository.reserveResource({ ...base, idempotencyKey: "sell-b", clientOrderId: "sell-order-b" })).rejects.toThrow("INSUFFICIENT_SELLABLE_QUANTITY");
    await resolve(first.reservation.reservationId, "UNKNOWN", "broker-timeout:sell-a");
    await expect(repository.reserveResource({ ...base, quantity: 21, idempotencyKey: "sell-c", clientOrderId: "sell-order-c" })).rejects.toThrow("INSUFFICIENT_SELLABLE_QUANTITY");
    await resolve(first.reservation.reservationId, "EXPIRED", "session-close:sell-a");
    const concurrent = await Promise.allSettled([
      repository.reserveResource({ ...base, quantity: 60, idempotencyKey: "sell-concurrent-a", clientOrderId: "sell-order-concurrent-a" }),
      repository.reserveResource({ ...base, quantity: 60, idempotencyKey: "sell-concurrent-b", clientOrderId: "sell-order-concurrent-b" })
    ]);
    const concurrentAccepted = concurrent.filter((result) => result.status === "fulfilled").map((result) => (result as PromiseFulfilledResult<Awaited<ReturnType<typeof repository.reserveResource>>>).value);
    expect(concurrentAccepted).toHaveLength(1);
    expect((concurrent.find((result) => result.status === "rejected") as PromiseRejectedResult).reason.message).toBe("INSUFFICIENT_SELLABLE_QUANTITY");
    await resolve(concurrentAccepted[0].reservation.reservationId, "CANCELLED", "sell-venue:cancelled");
    const afterRelease = await repository.reserveResource({ ...base, quantity: 100, idempotencyKey: "sell-d", clientOrderId: "sell-order-d" });
    expect(afterRelease.reservation.status).toBe("HELD");
    await expect(resolve(afterRelease.reservation.reservationId, "CANCELLED", "cancel:sell-d")).resolves.toMatchObject({ status: "RELEASED" });
    await expect(repository.resolveReservation({ accountId, reservationId: afterRelease.reservation.reservationId, namespace, testRunId, ownerId: "other-owner", outcome: "UNKNOWN", evidenceRef: "forged" })).rejects.toThrow("ACCOUNT_SCOPE_MISMATCH");
  });

  it("keeps same-day CN buy fills unavailable for sell reservations until the next Shanghai trade date", async () => {
    const isolatedRunId = randomUUID(); const isolatedNamespace = `t1-test/${isolatedRunId}`; const isolatedOwner = `owner-${isolatedRunId}`;
    const isolated = await repository.initialize({ fixtureAccountRef: `fixture-${isolatedRunId}`, ownerId: isolatedOwner, market: "CN_A", environmentMode: "PAPER", brokerMode: "FAKE", initialCash: { amount: "10000.0000", currency: "CNY" }, namespace: isolatedNamespace, testRunId: isolatedRunId, idempotencyKey: `init-${isolatedRunId}` });
    const isolatedAccountId = isolated.snapshot.accountId;
    try {
      const buy = await repository.reserveResource({ accountId: isolatedAccountId, namespace: isolatedNamespace, testRunId: isolatedRunId, ownerId: isolatedOwner, idempotencyKey: "t1-buy", clientOrderId: "t1-buy", side: "BUY", currency: "CNY", cashAmount: "505.0000", security: null, quantity: null });
      await repository.recordFill({ accountId: isolatedAccountId, namespace: isolatedNamespace, externalFillId: randomUUID(), security: "600002.SH", quantity: 50, price: "10.0000", fee: "5.0000", currency: "CNY", effectiveAt: "2026-09-24T01:00:00.000Z", side: "BUY", reservation: { reservationId: buy.reservation.reservationId, ownerId: isolatedOwner, testRunId: isolatedRunId, clientOrderId: "t1-buy" } });
      await repository.resolveReservation({ accountId: isolatedAccountId, reservationId: buy.reservation.reservationId, namespace: isolatedNamespace, testRunId: isolatedRunId, ownerId: isolatedOwner, outcome: "FILLED", evidenceRef: "fill:t1-buy" });
      const sell = { accountId: isolatedAccountId, namespace: isolatedNamespace, testRunId: isolatedRunId, ownerId: isolatedOwner, side: "SELL" as const, currency: "CNY", cashAmount: null, security: "600002.SH", quantity: 50, asOf: "2026-09-24T02:00:00.000Z" };
      await expect(repository.reserveResource({ ...sell, idempotencyKey: "t1-same-day", clientOrderId: "t1-same-day" })).rejects.toThrow("T_PLUS_ONE_UNSETTLED_QUANTITY");
      await expect(repository.reserveResource({ ...sell, asOf: "2026-09-28T01:00:00.000Z", idempotencyKey: "t1-next-trading-day", clientOrderId: "t1-next-trading-day" })).resolves.toMatchObject({ replayed: false, reservation: { status: "HELD" } });
      console.info(`[Portfolio CN T+1] ${JSON.stringify({ testRunId: isolatedRunId, accountId: isolatedAccountId, sameDay: "REJECTED/T_PLUS_ONE_UNSETTLED_QUANTITY", nextShanghaiDate: "HELD" })}`);
    } finally {
      await pool.query("DELETE FROM resource_reservations WHERE account_id=$1", [isolatedAccountId]);
      await pool.query("DELETE FROM recorded_fills WHERE account_id=$1", [isolatedAccountId]);
      await pool.query("DELETE FROM account_positions WHERE account_id=$1", [isolatedAccountId]);
      await pool.query("DELETE FROM ledger_entries WHERE account_id=$1", [isolatedAccountId]);
      await pool.query("DELETE FROM accounts WHERE account_id=$1", [isolatedAccountId]);
    }
    const usRunId = randomUUID(); const usNamespace = `us-settlement-test/${usRunId}`; const usOwner = `owner-${usRunId}`;
    const usAccount = await repository.initialize({ fixtureAccountRef: `fixture-${usRunId}`, ownerId: usOwner, market: "US_EQUITY", environmentMode: "PAPER", brokerMode: "FAKE", initialCash: { amount: "10000.0000", currency: "USD" }, namespace: usNamespace, testRunId: usRunId, idempotencyKey: `init-${usRunId}` });
    try {
      const buy = await repository.reserveResource({ accountId: usAccount.snapshot.accountId, namespace: usNamespace, testRunId: usRunId, ownerId: usOwner, idempotencyKey: "us-t1-buy", clientOrderId: "us-t1-buy", side: "BUY", currency: "USD", cashAmount: "250.0500", security: null, quantity: null });
      await repository.recordFill({ accountId: usAccount.snapshot.accountId, namespace: usNamespace, externalFillId: randomUUID(), security: "AAPL", quantity: 10, price: "25.0000", fee: "0.0500", currency: "USD", effectiveAt: "2026-09-25T01:00:00.000Z", side: "BUY", reservation: { reservationId: buy.reservation.reservationId, ownerId: usOwner, testRunId: usRunId, clientOrderId: "us-t1-buy" } });
      await expect(repository.reserveResource({ accountId: usAccount.snapshot.accountId, namespace: usNamespace, testRunId: usRunId, ownerId: usOwner, idempotencyKey: "us-same-day-sell", clientOrderId: "us-same-day-sell", side: "SELL", currency: "USD", cashAmount: null, security: "AAPL", quantity: 10, asOf: "2026-09-25T02:00:00.000Z" })).resolves.toMatchObject({ replayed: false, reservation: { status: "HELD" } });
      console.info(`[Portfolio US same-day sell] ${JSON.stringify({ testRunId: usRunId, accountId: usAccount.snapshot.accountId, sameDay: "HELD" })}`);
    } finally {
      await pool.query("DELETE FROM resource_reservations WHERE account_id=$1", [usAccount.snapshot.accountId]);
      await pool.query("DELETE FROM recorded_fills WHERE account_id=$1", [usAccount.snapshot.accountId]);
      await pool.query("DELETE FROM account_positions WHERE account_id=$1", [usAccount.snapshot.accountId]);
      await pool.query("DELETE FROM ledger_entries WHERE account_id=$1", [usAccount.snapshot.accountId]);
      await pool.query("DELETE FROM accounts WHERE account_id=$1", [usAccount.snapshot.accountId]);
    }
  });

  it("posts reserved partial BUY and SELL fills atomically and decrements the remaining hold", async () => {
    const buy = await repository.reserveResource({ accountId, namespace, testRunId, ownerId, idempotencyKey: "capture-buy", clientOrderId: "capture-buy-order", side: "BUY", currency: "CNY", cashAmount: "5000.0000", security: null, quantity: null });
    await expect(repository.resolveReservation({ accountId, reservationId: buy.reservation.reservationId, namespace, testRunId, ownerId, outcome: "FILLED", evidenceRef: "fill:missing" })).rejects.toThrow("RESERVATION_FILL_REQUIRED");
    const buyFill = { accountId, namespace, externalFillId: randomUUID(), security: "600001.SH", quantity: 20, price: "100.0000", fee: "10.0000", currency: "CNY", effectiveAt: "2026-09-25T01:00:00.000Z", side: "BUY" as const, reservation: { reservationId: buy.reservation.reservationId, ownerId, testRunId, clientOrderId: "capture-buy-order" } };
    await expect(repository.recordFill(buyFill)).resolves.toMatchObject({ replayed: false, snapshot: { cash: { amount: "7990.0000" } } });
    await expect(repository.recordFill(buyFill)).resolves.toMatchObject({ replayed: true, snapshot: { cash: { amount: "7990.0000" } } });
    await expect(repository.recordFill({ ...buyFill, price: "101.0000" })).rejects.toThrow("FILL_IDEMPOTENCY_CONFLICT");
    await expect(repository.recordFill({ ...buyFill, fee: "11.0000" })).rejects.toThrow("FILL_IDEMPOTENCY_CONFLICT");
    const firstCorrection = { accountId, externalFillId: buyFill.externalFillId, revision: 1, previousFee: "10.0000", correctedFee: "12.0000", effectiveAt: "2026-09-25T01:05:00.000Z", evidenceRef: "fakebroker-fee-correction:001" };
    await expect(repository.correctFillFee(firstCorrection)).resolves.toMatchObject({ replayed: false, snapshot: { cash: { amount: "7988.0000" } } });
    await expect(repository.correctFillFee(firstCorrection)).resolves.toMatchObject({ replayed: true, snapshot: { cash: { amount: "7988.0000" } } });
    await expect(repository.correctFillFee({ ...firstCorrection, correctedFee: "13.0000" })).rejects.toThrow("FEE_CORRECTION_IDEMPOTENCY_CONFLICT");
    await expect(repository.correctFillFee({ ...firstCorrection, revision: 3, previousFee: "12.0000", correctedFee: "11.0000", evidenceRef: "fakebroker-fee-correction:003" })).rejects.toThrow("FEE_CORRECTION_STALE_OR_OUT_OF_ORDER");
    const secondCorrection = { ...firstCorrection, revision: 2, previousFee: "12.0000", correctedFee: "11.0000", effectiveAt: "2026-09-25T01:06:00.000Z", evidenceRef: "fakebroker-fee-correction:002" };
    await expect(repository.correctFillFee(secondCorrection)).resolves.toMatchObject({ replayed: false, snapshot: { cash: { amount: "7989.0000" } } });
    await expect(repository.recordFill(buyFill)).resolves.toMatchObject({ replayed: true, snapshot: { cash: { amount: "7989.0000" } } });
    const feeLedger = await pool.query(`SELECT count(*)::int AS correction_count, sum(amount)::text AS amount FROM ledger_entries WHERE account_id=$1 AND entry_type='FEE_CORRECTION'`, [accountId]);
    expect(feeLedger.rows[0]).toEqual({ correction_count: 2, amount: "-1.0000" });
    const correctedReservation = await pool.query("SELECT captured_cash_amount::text FROM resource_reservations WHERE account_id=$1 AND reservation_id=$2", [accountId, buy.reservation.reservationId]);
    expect(correctedReservation.rows[0].captured_cash_amount).toBe("2011.0000");
    const remainingBuyHold = { accountId, namespace, testRunId, ownerId, side: "BUY" as const, currency: "CNY", cashAmount: "5001.0000", security: null, quantity: null };
    await expect(repository.reserveResource({ ...remainingBuyHold, idempotencyKey: "capture-buy-over", clientOrderId: "capture-buy-over" })).rejects.toThrow("INSUFFICIENT_AVAILABLE_CASH");
    await repository.resolveReservation({ accountId, reservationId: buy.reservation.reservationId, namespace, testRunId, ownerId, outcome: "FILLED", evidenceRef: `fill:${buyFill.externalFillId}` });
    await expect(repository.recordFill(buyFill)).resolves.toMatchObject({ replayed: true, snapshot: { cash: { amount: "7989.0000" } } });
    const releasedBuyRemainder = await repository.reserveResource({ ...remainingBuyHold, idempotencyKey: "capture-buy-after", clientOrderId: "capture-buy-after" });
    expect(releasedBuyRemainder.replayed).toBe(false);
    await repository.resolveReservation({ accountId, reservationId: releasedBuyRemainder.reservation.reservationId, namespace, testRunId, ownerId, outcome: "CANCELLED", evidenceRef: "cleanup:capture-buy-after" });

    const partiallyCancelledBuy = await repository.reserveResource({ accountId, namespace, testRunId, ownerId, idempotencyKey: "partial-cancel-buy", clientOrderId: "partial-cancel-buy-order", side: "BUY", currency: "CNY", cashAmount: "5000.0000", security: null, quantity: null });
    const cancelledBuyFill = { ...buyFill, externalFillId: randomUUID(), effectiveAt: "2026-09-25T01:00:01.000Z", reservation: { reservationId: partiallyCancelledBuy.reservation.reservationId, ownerId, testRunId, clientOrderId: "partial-cancel-buy-order" } };
    await expect(repository.recordFill(cancelledBuyFill)).resolves.toMatchObject({ replayed: false, snapshot: { cash: { amount: "5979.0000" } } });
    await expect(repository.resolveReservation({ accountId, reservationId: partiallyCancelledBuy.reservation.reservationId, namespace, testRunId, ownerId, outcome: "CANCELLED", evidenceRef: "fakebroker-cancel-accepted:partial-cancel-buy-order" })).resolves.toMatchObject({ status: "RELEASED", capturedCashAmount: "2010.0000" });
    const afterPartialCancel = await repository.reserveResource({ accountId, namespace, testRunId, ownerId, idempotencyKey: "partial-cancel-after", clientOrderId: "partial-cancel-after-order", side: "BUY", currency: "CNY", cashAmount: "5979.0000", security: null, quantity: null });
    expect(afterPartialCancel.reservation.status).toBe("HELD");
    await repository.resolveReservation({ accountId, reservationId: afterPartialCancel.reservation.reservationId, namespace, testRunId, ownerId, outcome: "CANCELLED", evidenceRef: "cleanup:partial-cancel-after" });

    const sell = await repository.reserveResource({ accountId, namespace, testRunId, ownerId, idempotencyKey: "capture-sell", clientOrderId: "capture-sell-order", side: "SELL", currency: "CNY", cashAmount: null, security: "600000.SH", quantity: 50, asOf: "2026-09-25T01:00:00.000Z" });
    const sellFill = { accountId, namespace, externalFillId: randomUUID(), security: "600000.SH", quantity: 20, price: "100.0000", fee: "10.0000", currency: "CNY", effectiveAt: "2026-09-25T01:01:00.000Z", side: "SELL" as const, reservation: { reservationId: sell.reservation.reservationId, ownerId, testRunId, clientOrderId: "capture-sell-order" } };
    await expect(repository.recordFill(sellFill)).resolves.toMatchObject({ replayed: false, snapshot: { cash: { amount: "7969.0000" } } });
    await expect(repository.recordFill({ ...sellFill, externalFillId: randomUUID(), quantity: 31 })).rejects.toThrow("FILL_EXCEEDS_RESERVED_QUANTITY");
    await expect(repository.recordFill({ ...sellFill, externalFillId: randomUUID(), quantity: 1, reservation: { ...sellFill.reservation, ownerId: "foreign" } })).rejects.toThrow("FILL_RESERVATION_SCOPE_MISMATCH");
    await expect(repository.reserveResource({ accountId, namespace, testRunId, ownerId, idempotencyKey: "capture-sell-over", clientOrderId: "capture-sell-over", side: "SELL", currency: "CNY", cashAmount: null, security: "600000.SH", quantity: 51, asOf: "2026-09-25T01:00:00.000Z" })).rejects.toThrow("INSUFFICIENT_SELLABLE_QUANTITY");
    await repository.resolveReservation({ accountId, reservationId: sell.reservation.reservationId, namespace, testRunId, ownerId, outcome: "FILLED", evidenceRef: `fill:${sellFill.externalFillId}` });
    await expect(repository.reserveResource({ accountId, namespace, testRunId, ownerId, idempotencyKey: "capture-sell-after", clientOrderId: "capture-sell-after", side: "SELL", currency: "CNY", cashAmount: null, security: "600000.SH", quantity: 80, asOf: "2026-09-25T01:00:00.000Z" })).resolves.toMatchObject({ replayed: false });
  });
});

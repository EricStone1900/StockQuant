import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { PostgresFakeBrokerRepository } from "../dist/adapters/postgres-fake-broker-repository.js";
import { V14BacktestEngine } from "../../quant-research-service/dist/domain/v14-daily-backtest.js";

const connectionString = process.env.TRADE_EXECUTION_TEST_DATABASE_URL;
if (!connectionString) throw new Error("TRADE_EXECUTION_TEST_DATABASE_URL is required");
const parsed = new URL(connectionString);
const databaseName = parsed.pathname.replace(/^\//u, "");
if (databaseName !== "trade_execution_test" || parsed.username !== "trade_execution_test" || parsed.hostname !== "127.0.0.1") {
  throw new Error("refusing V1.4 parity test outside its dedicated isolated trade_execution_test database");
}

const bars = ["2024-01-02", "2024-01-03", "2024-01-04", "2024-01-05"].map((date) => ({ date, securityId: "600000.SH", closeCents: 1_000, volume: 100 }));
const marketFeeSchedule = { scheduleId: "CN_A_CASH_EQUITY_2023_08_28", commissionRatePartsPerBillion: 54_100, minimumCommissionCents: 5 };
const policy = { initialCashCents: 200_000, targetQuantity: 29, participationRateBasisPoints: 2_900, slippageBasisPoints: 55, fixedFeeCents: 29, marketFeeSchedule };
const namespace = `v14-parity-${randomUUID()}`;
const accountId = randomUUID();
const pool = new Pool({ connectionString });

try {
  await pool.query("SELECT 1");
  const broker = new PostgresFakeBrokerRepository(pool);
  await broker.migrate();

  for (const item of [
    { side: "BUY", signalDate: "2024-01-02", executionDate: "2024-01-03" },
    { side: "SELL", signalDate: "2024-01-04", executionDate: "2024-01-05" },
  ]) {
    const sellOrder = item.side === "SELL" ? { signalDate: item.signalDate, executionDate: item.executionDate, quantity: 29 } : undefined;
    const backtest = new V14BacktestEngine(bars, "v14-postgres-parity", { ...policy, ...(sellOrder ? { sellOrder } : {}) }).run("normal");
    const expected = backtest.evidence.trades.find((trade) => trade.side === item.side);
    assert.ok(expected, `${item.side} fill is missing from the Quant result`);

    const clientOrderId = `parity-${item.side.toLowerCase()}-${randomUUID()}`;
    const execution = await broker.execute({
      namespace,
      accountId,
      clientOrderId,
      security: "600000.SH",
      requestedQuantity: 29,
      side: item.side,
      currency: "CNY",
      bar: { timestamp: `${item.executionDate}T01:30:00.000Z`, open: "10.00", volume: 100 },
      participationRate: 0.29,
      slippageBps: 55,
      marketFeeSchedule,
    });
    assert.equal(execution.replayed, false);
    assert.equal(execution.result.status, "FILLED");
    assert.ok(execution.result.fill);

    const persisted = await pool.query(`SELECT o.status, f.quantity::int AS quantity, f.price::text AS price, f.fee::text AS fee,
      f.effective_at::date::text AS session, EXISTS(SELECT 1 FROM fake_broker_outbox x WHERE x.order_id=o.order_id AND x.event_type='FILL_POST') AS fill_outbox
      FROM fake_broker_orders o JOIN fake_broker_fills f USING(order_id)
      WHERE o.namespace=$1 AND o.client_order_id=$2`, [namespace, clientOrderId]);
    assert.equal(persisted.rowCount, 1);
    const actual = persisted.rows[0];
    assert.deepEqual({
      status: actual.status,
      quantity: actual.quantity,
      price: actual.price,
      fee: actual.fee,
      session: actual.session,
      fillOutbox: actual.fill_outbox,
    }, {
      status: "FILLED",
      quantity: expected.quantity,
      price: `${Math.floor(expected.priceCents / 100)}.${(expected.priceCents % 100).toString().padStart(2, "0")}00`,
      fee: `${Math.floor(expected.feeCents / 100)}.${(expected.feeCents % 100).toString().padStart(2, "0")}00`,
      session: item.executionDate,
      fillOutbox: true,
    });
  }

  const partialPolicy = { ...policy, participationRateBasisPoints: 2_500, fixedFeeCents: 25 };
  const partialBacktest = new V14BacktestEngine(bars, "v14-postgres-partial-parity", partialPolicy).run("normal");
  const expectedPartial = partialBacktest.evidence.trades.find((trade) => trade.side === "BUY");
  assert.ok(expectedPartial, "partial BUY fill is missing from the Quant result");
  const partialClientOrderId = `parity-partial-buy-${randomUUID()}`;
  const partialExecution = await broker.execute({
    namespace, accountId, clientOrderId: partialClientOrderId, security: "600000.SH", requestedQuantity: 29,
    side: "BUY", currency: "CNY",
    bar: { timestamp: "2024-01-03T01:30:00.000Z", open: "10.00", volume: 100 },
    participationRate: 0.25, slippageBps: 55, marketFeeSchedule,
  });
  assert.equal(partialExecution.replayed, false);
  assert.equal(partialExecution.result.status, "PARTIALLY_FILLED");
  assert.ok(partialExecution.result.fill);
  const persistedPartial = await pool.query(`SELECT o.status, f.quantity::int AS quantity, f.price::text AS price, f.fee::text AS fee,
      f.effective_at::date::text AS session, EXISTS(SELECT 1 FROM fake_broker_outbox x WHERE x.order_id=o.order_id AND x.event_type='FILL_POST') AS fill_outbox
      FROM fake_broker_orders o JOIN fake_broker_fills f USING(order_id)
      WHERE o.namespace=$1 AND o.client_order_id=$2`, [namespace, partialClientOrderId]);
  assert.equal(persistedPartial.rowCount, 1);
  assert.deepEqual(persistedPartial.rows[0], {
    status: "PARTIALLY_FILLED",
    quantity: expectedPartial.quantity,
    price: `${Math.floor(expectedPartial.priceCents / 100)}.${(expectedPartial.priceCents % 100).toString().padStart(2, "0")}00`,
    fee: `${Math.floor(expectedPartial.feeCents / 100)}.${(expectedPartial.feeCents % 100).toString().padStart(2, "0")}00`,
    session: "2024-01-03",
    fill_outbox: true,
  });

  const noVolumeBars = bars.map((bar, index) => index === 1 ? { ...bar, volume: 0 } : bar);
  const noVolumeBacktest = new V14BacktestEngine(noVolumeBars, "v14-postgres-zero-volume-parity", policy).run("normal");
  const expectedRejection = noVolumeBacktest.evidence.orderOutcomes.find((outcome) => outcome.side === "BUY");
  assert.deepEqual(expectedRejection, {
    side: "BUY", signalDate: "2024-01-02", executionDate: "2024-01-03", requestedQuantity: 29,
    filledQuantity: 0, status: "REJECTED", reason: "ZERO_VOLUME",
  });
  const rejectedClientOrderId = `parity-zero-volume-${randomUUID()}`;
  const rejectedExecution = await broker.execute({
    namespace, accountId, clientOrderId: rejectedClientOrderId, security: "600000.SH", requestedQuantity: 29,
    side: "BUY", currency: "CNY",
    bar: { timestamp: "2024-01-03T01:30:00.000Z", open: "10.00", volume: 0 },
    participationRate: 0.29, slippageBps: 0,
  });
  assert.equal(rejectedExecution.result.status, expectedRejection.status);
  assert.equal(rejectedExecution.result.rejectionReason, expectedRejection.reason);
  const persistedRejection = await pool.query(`SELECT o.status, o.rejection_reason AS reason,
      (SELECT count(*)::int FROM fake_broker_fills f WHERE f.order_id=o.order_id) AS fills,
      (SELECT count(*)::int FROM fake_broker_outbox x WHERE x.order_id=o.order_id AND x.event_type='FILL_POST') AS fill_outbox
      FROM fake_broker_orders o WHERE o.namespace=$1 AND o.client_order_id=$2`, [namespace, rejectedClientOrderId]);
  assert.deepEqual(persistedRejection.rows, [{ status: "REJECTED", reason: "ZERO_VOLUME", fills: 0, fill_outbox: 0 }]);

  const counts = await pool.query(`SELECT count(*)::int AS orders,
    (SELECT count(*)::int FROM fake_broker_fills f JOIN fake_broker_orders o USING(order_id) WHERE o.namespace=$1) AS fills,
    (SELECT count(*)::int FROM fake_broker_outbox x JOIN fake_broker_orders o USING(order_id) WHERE o.namespace=$1 AND x.event_type='FILL_POST') AS fill_outbox
    FROM fake_broker_orders WHERE namespace=$1`, [namespace]);
  assert.deepEqual(counts.rows[0], { orders: 4, fills: 3, fill_outbox: 3 });
  console.log(JSON.stringify({ status: "PASS", database: "isolated trade_execution_test", scenario: "V1.4 Quant versus persisted FakeBroker/PostgreSQL order outcomes", fixture: "synthetic exact-cent CNY", compared: ["BUY", "SELL", "partial BUY", "zero-volume rejection"], fields: ["status", "quantity", "price", "fee", "session", "rejection reason", "Fill outbox"], counts: counts.rows[0] }));
} finally {
  await pool.end();
}

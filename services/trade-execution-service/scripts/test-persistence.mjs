import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Pool } from "pg";
import { PostgresFakeBrokerRepository } from "../dist/adapters/postgres-fake-broker-repository.js";

const connectionString = process.env.TRADE_EXECUTION_TEST_DATABASE_URL ?? "postgresql://trade_execution_test@127.0.0.1:5433/trade_execution_test";
const parsed = new URL(connectionString);
const databaseName = parsed.pathname.replace(/^\//u, "");
if (databaseName === "trade_execution" || parsed.username === "trade_execution") {
  console.error("refusing to run FakeBroker persistence tests against the formal trade_execution database; use a dedicated test database");
  process.exit(2);
}

let pool = new Pool({ connectionString });
let databaseReady = false;
let namespaceMigrated = false;
const namespace = `test-p5-idempotency-${randomUUID()}`;
const accountId = randomUUID();
const command = {
  namespace,
  accountId,
  clientOrderId: `order-${randomUUID()}`,
  security: "600000.SH",
  requestedQuantity: 100,
  bar: { timestamp: "2026-09-25T01:31:00.000Z", open: "10.2000", volume: 500 }
};

try {
  await pool.query("SELECT 1");
  databaseReady = true;
  const repository = new PostgresFakeBrokerRepository(pool);
  await repository.migrate();
  namespaceMigrated = true;
  const [first, concurrentReplay] = await Promise.all([repository.execute(command), repository.execute(command)]);
  assert.equal([first, concurrentReplay].filter((result) => !result.replayed).length, 1);
  assert.equal([first, concurrentReplay].filter((result) => result.replayed).length, 1);
  const original = first.replayed ? concurrentReplay : first;
  assert.equal(original.result.status, "PARTIALLY_FILLED");
  await assert.rejects(repository.execute({ ...command, requestedQuantity: 99 }), (error) => error?.statusCode === 409);
  await assert.rejects(repository.execute({ ...command, bar: { ...command.bar, open: "10.2100" } }), (error) => error?.statusCode === 409);
  const legacyClientOrderId = `legacy-${randomUUID()}`;
  await pool.query(`INSERT INTO fake_broker_orders (order_id,namespace,account_id,client_order_id,security,requested_quantity,status)
    VALUES ($1,$2,$3,$4,$5,$6,'FILLED')`, [randomUUID(), namespace, accountId, legacyClientOrderId, command.security, command.requestedQuantity]);
  await assert.rejects(repository.execute({ ...command, clientOrderId: legacyClientOrderId }), (error) => error?.statusCode === 409);
  const rows = await pool.query(`SELECT count(*)::int AS orders,
    (SELECT count(*)::int FROM fake_broker_fills f JOIN fake_broker_orders o USING (order_id) WHERE o.namespace=$1) AS fills,
    (SELECT count(*)::int FROM fake_broker_order_events e JOIN fake_broker_orders o USING (order_id) WHERE o.namespace=$1) AS events,
    (SELECT count(*)::int FROM fake_broker_outbox x JOIN fake_broker_orders o USING (order_id) WHERE o.namespace=$1) AS outbox
    FROM fake_broker_orders WHERE namespace=$1`, [namespace]);
  assert.deepEqual(rows.rows[0], { orders: 2, fills: 1, events: 1, outbox: 1 });

  await pool.end();
  pool = new Pool({ connectionString });
  const reopened = new PostgresFakeBrokerRepository(pool);
  const replayAfterReconnect = await reopened.execute(command);
  assert.equal(replayAfterReconnect.replayed, true);
  assert.deepEqual(replayAfterReconnect.result, original.result);
  console.log(JSON.stringify({ concurrentSameKey: "one order/fill/event/outbox", changedQuantity: "409, no side effect", changedPrice: "409, no side effect", legacyRowWithoutFingerprint: "409, no side effect", reconnectReplay: "same persisted result", brokerMode: "FAKE" }, null, 2));
} catch (error) {
  if (!databaseReady) {
    console.error("isolated trade-execution test database is unreachable; start the local PostgreSQL test service or set TRADE_EXECUTION_TEST_DATABASE_URL");
    process.exitCode = 2;
  } else {
    console.error(error instanceof Error ? error.stack : error);
    process.exitCode = 1;
  }
} finally {
  if (databaseReady && namespaceMigrated) {
    try {
      await pool.query(`DELETE FROM fake_broker_outbox x USING fake_broker_orders o WHERE x.order_id=o.order_id AND o.namespace=$1`, [namespace]);
      await pool.query(`DELETE FROM fake_broker_order_events e USING fake_broker_orders o WHERE e.order_id=o.order_id AND o.namespace=$1`, [namespace]);
      await pool.query(`DELETE FROM fake_broker_fills f USING fake_broker_orders o WHERE f.order_id=o.order_id AND o.namespace=$1`, [namespace]);
      await pool.query("DELETE FROM fake_broker_orders WHERE namespace=$1", [namespace]);
    } catch (error) {
      console.error("isolated FakeBroker test namespace cleanup failed", error);
      process.exitCode = 1;
    }
  }
  await pool.end().catch((error) => { console.error("test database connection close failed", error); process.exitCode = 1; });
}

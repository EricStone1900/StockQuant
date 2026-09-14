import test from "node:test";
import assert from "node:assert/strict";
import { markSentSql, parseOutboxRows } from "./dc08a-drain-outbox.mjs";

test("outbox rows parse and retain their durable payload", () => {
  const rows = parseOutboxRows('11111111-1111-4111-8111-111111111111\tkey\t22222222-2222-4222-8222-222222222222\tcollection.run.completed.v1\t{"rows":1}\t2026-09-14 10:00:00+00');
  assert.equal(rows[0].payload.rows, 1);
  assert.match(markSentSql(rows.map((row) => row.eventId)), /WHERE sent_at IS NULL/);
});

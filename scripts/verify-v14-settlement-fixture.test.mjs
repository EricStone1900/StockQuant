import test from "node:test";
import assert from "node:assert/strict";
import { loadV14SettlementCalendar, resolveV14SettlementDate, verifyV14SettlementCalendar } from "./v14-settlement-calendar.mjs";

test("V1.4 settlement fixture preserves explicit dual-market mappings and fails closed outside them", async () => {
  const { fixture } = await loadV14SettlementCalendar();
  const { fixture: fixture2, manifest } = await loadV14SettlementCalendar(process.cwd(), "fixtures/v1/v1.4-settlement-v1.1.0");
  const { fixture: fixture3, manifest: manifest3 } = await loadV14SettlementCalendar();
  assert.equal(manifest.fixtureVersion, "v1.4-paper-settlement-calendar-2");
  assert.equal(manifest3.fixtureVersion, "v1.4-paper-settlement-calendar-3");
  assert.deepEqual(resolveV14SettlementDate(fixture3, "CN_A", "2023-08-25"), { settlementDate: "2023-08-28", calendarVersion: "v1.4-synthetic-settlement-3" });
  assert.deepEqual(resolveV14SettlementDate(fixture3, "CN_A", "2023-08-30"), { settlementDate: "2023-08-31", calendarVersion: "v1.4-synthetic-settlement-3" });
  assert.deepEqual(Object.fromEntries(Object.entries(fixture.markets).map(([market, value]) => [market, value.currency])), { CN_A: "CNY", US_EQUITY: "USD" });
  assert.deepEqual(resolveV14SettlementDate(fixture, "CN_A", "2024-01-05"), { settlementDate: "2024-01-08", calendarVersion: "v1.4-synthetic-settlement-3" });
  assert.deepEqual(resolveV14SettlementDate(fixture, "US_EQUITY", "2024-01-05"), { settlementDate: "2024-01-08", calendarVersion: "v1.4-synthetic-settlement-3" });
  assert.throws(() => resolveV14SettlementDate(fixture, "CN_A", "2030-01-02"), { message: "SETTLEMENT_CALENDAR_UNAVAILABLE" });
  assert.throws(() => resolveV14SettlementDate(fixture, "US_EQUITY", "2024-01-09"), { message: "SETTLEMENT_CALENDAR_UNAVAILABLE" });
  assert.deepEqual(resolveV14SettlementDate(fixture2, "CN_A", "2026-09-25"), { settlementDate: "2026-09-28", calendarVersion: "v1.4-synthetic-settlement-2" });
  assert.deepEqual(resolveV14SettlementDate(fixture2, "US_EQUITY", "2026-09-25"), { settlementDate: "2026-09-28", calendarVersion: "v1.4-synthetic-settlement-2" });
  assert.deepEqual(resolveV14SettlementDate(fixture3, "US_EQUITY", "2026-09-25"), { settlementDate: "2026-09-28", calendarVersion: "v1.4-synthetic-settlement-3" });
  assert.throws(() => resolveV14SettlementDate(fixture2, "CN_A", "2026-09-26"), { message: "SETTLEMENT_CALENDAR_UNAVAILABLE" });
  assert.equal((await verifyV14SettlementCalendar()).status, "PASS");
});

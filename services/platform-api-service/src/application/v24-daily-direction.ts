/** Proposed educational Paper strategy. Pure evaluation; never submits an order. */
export const V24_DAILY_DIRECTION_VERSION = "c5-daily-direction-v1";
export type DailyDirectionInput = {
  clock: { now(): Date };
  sessionDate: string;
  expectedPriorSessions: [string, string];
  bars: Array<{ securityId: string; sessionDate: string; availableAt: string; close: string }>;
  account: { heldQuantity: number; sellableQuantity: number; settledCash: string };
  mandate: { validFrom: string; expiresAt: string; paused: boolean };
  referencePrice: string;
};
const units = (value: string): bigint | null => {
  if (!/^\d+(?:\.\d{1,4})?$/u.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 10_000n + BigInt(fraction.padEnd(4, "0"));
};
const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/u.test(value)
  && Number.isFinite(Date.parse(`${value}T00:00:00Z`)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
export function evaluateV24DailyDirection(input: DailyDirectionInput): { action: "BUY" | "SELL" | "HOLD" | "PAUSED"; quantity: number; reason: string } {
  const result = (action: "BUY" | "SELL" | "HOLD" | "PAUSED", reason: string, quantity = 0) => ({ action, quantity, reason });
  const now = input.clock.now().getTime();
  const from = Date.parse(input.mandate.validFrom); const until = Date.parse(input.mandate.expiresAt);
  if (!Number.isFinite(now) || !Number.isFinite(from) || !Number.isFinite(until) || until <= from || now < from || now >= until || input.mandate.paused) return result("PAUSED", "MANDATE_INACTIVE");
  const [older, newer] = input.expectedPriorSessions;
  const localDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai" }).format(new Date(now));
  if (!validDate(input.sessionDate) || !validDate(older) || !validDate(newer) || older >= newer || newer >= input.sessionDate || localDate !== input.sessionDate) return result("PAUSED", "SESSION_CONTEXT_INVALID");
  if (input.bars.length !== 2 || input.bars.some((bar, i) => bar.securityId !== "600000.SH" || bar.sessionDate !== input.expectedPriorSessions[i] || !Number.isFinite(Date.parse(bar.availableAt)) || Date.parse(bar.availableAt) > now || Date.parse(bar.availableAt) < Date.parse(`${bar.sessionDate}T15:00:00+08:00`))) return result("PAUSED", "DAILY_INPUT_UNAVAILABLE");
  const prices = input.bars.map((bar) => units(bar.close));
  const reference = units(input.referencePrice); const cash = units(input.account.settledCash);
  if (prices.some((price) => price === null || price <= 0n) || reference === null || reference <= 0n || cash === null) return result("PAUSED", "PRICE_OR_CASH_INVALID");
  const { heldQuantity, sellableQuantity } = input.account;
  if (![heldQuantity, sellableQuantity].every(Number.isSafeInteger) || ![0, 100].includes(heldQuantity) || sellableQuantity < 0 || sellableQuantity > heldQuantity) return result("PAUSED", "POSITION_OUTSIDE_SCOPE");
  const target = prices[1]! > prices[0]! ? 100 : prices[1]! < prices[0]! ? 0 : heldQuantity;
  if (target === heldQuantity) return result("HOLD", "TARGET_UNCHANGED");
  if (reference * 100n > 20_000_000n) return result("PAUSED", "ORDER_NOTIONAL_LIMIT");
  if (target > heldQuantity) return cash >= reference * 100n + 50_000n ? result("BUY", "DAILY_CLOSE_ROSE", 100) : result("PAUSED", "SETTLED_CASH_INSUFFICIENT");
  return sellableQuantity >= 100 ? result("SELL", "DAILY_CLOSE_FELL", 100) : result("PAUSED", "SELLABLE_QUANTITY_INSUFFICIENT");
}

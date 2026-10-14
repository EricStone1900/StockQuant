import { createHash } from "node:crypto";
import { calculateCnAEquityFeeCents, isValidCnAEquityFeeSchedule } from "@stockquant/cn-a-fee-rules";

/** V1 USD Paper Fixture fee; synthetic and not a real-market fee/tax schedule. */
export const US_EQUITY_SYNTHETIC_FIXTURE_FEE_CENTS = 100;

export interface HistoricalExecutionCommand {
  namespace: string;
  accountId: string;
  clientOrderId: string;
  security: string;
  requestedQuantity: number;
  /** Explicit independent FakeBroker account seed, bound into the authorized request hash. */
  initialAccountCash?: string;
  bar: { timestamp: string; open: string; volume: number; high?: string; low?: string; close?: string; tradingStatus?: "TRADED" | "SUSPENDED"; upperLimit?: string; lowerLimit?: string };
  side?: "BUY" | "SELL";
  orderType?: "MARKET" | "LIMIT";
  timeInForce?: "DAY";
  limitPrice?: string;
  participationRate?: number;
  slippageBps?: number;
  currency?: string;
  /** Versioned CN_A Fixture fee inputs used for explicit Quant/Paper parity checks. */
  marketFeeSchedule?: {
    scheduleId: "CN_A_CASH_EQUITY_2022_04_29_TO_2023_08_27" | "CN_A_CASH_EQUITY_2023_08_28";
    commissionRatePartsPerBillion: number;
    minimumCommissionCents: number;
  };
  reservation?: { reservationId: string; ownerId: string; testRunId: string; clientOrderId: string };
}

export type SnapshotPaperExecutionCommand = {
  namespace: string; accountId: string; clientOrderId: string; security: string; requestedQuantity: number;
  price: string; fee: string; effectiveAt: string; currency: string; snapshotId: string; policyVersion: string; fixtureVersion: string;
  quoteAgeSeconds: number; deviationBps: number; testRunId: string; ownerId: string; mandateId: string; mandateVersion: string; strategyVersion: string;
  reservation: { reservationId: string; ownerId: string; testRunId: string; clientOrderId: string };
};

/** Stable, semantic request identity for FakeBroker idempotency keys. */
export function historicalExecutionFingerprint(command: HistoricalExecutionCommand): string {
  const canonical = {
    namespace: command.namespace,
    accountId: command.accountId,
    clientOrderId: command.clientOrderId,
    security: command.security,
    requestedQuantity: command.requestedQuantity,
    initialAccountCash: command.initialAccountCash ?? null,
    bar: {
      timestamp: command.bar.timestamp,
      open: command.bar.open,
      volume: command.bar.volume,
      high: command.bar.high ?? null,
      low: command.bar.low ?? null,
      close: command.bar.close ?? null,
      tradingStatus: command.bar.tradingStatus ?? null,
      upperLimit: command.bar.upperLimit ?? null,
      lowerLimit: command.bar.lowerLimit ?? null
    },
    side: command.side ?? "BUY",
    orderType: command.orderType ?? "MARKET",
    timeInForce: command.timeInForce ?? "DAY",
    limitPrice: command.limitPrice ?? null,
    participationRate: command.participationRate ?? 0.1,
    slippageBps: command.slippageBps ?? 10,
    currency: command.currency ?? "CNY",
    marketFeeSchedule: command.marketFeeSchedule ?? null,
    reservation: command.reservation ?? null
  };
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}

/** Refuse to persist a fill whose reservation is bound to another order. */
export function validateExecutionReservation(command: HistoricalExecutionCommand): void {
  if (command.currency !== undefined && !/^[A-Z]{3}$/u.test(command.currency)) throw new Error("INVALID_CURRENCY");
  if (command.initialAccountCash !== undefined && !/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,4})?$/u.test(command.initialAccountCash)) throw new Error("INVALID_INITIAL_ACCOUNT_CASH");
  if (command.reservation && command.initialAccountCash === undefined) throw new Error("INITIAL_ASSET_CASH_REQUIRED");
  if (command.reservation && (!command.reservation.reservationId || !command.reservation.ownerId || !command.reservation.testRunId || command.reservation.clientOrderId !== command.clientOrderId)) {
    throw new Error("RESERVATION_ORDER_MISMATCH");
  }
}

export class IdempotencyConflictError extends Error {
  readonly statusCode = 409;
  constructor() {
    super("clientOrderId was already used with a different or unverifiable execution request");
    this.name = "IdempotencyConflictError";
  }
}

export interface HistoricalExecutionResult {
  orderId: string;
  status: "ACCEPTED" | "FILLED" | "PARTIALLY_FILLED" | "REJECTED" | "CANCEL_REQUESTED" | "CANCELLED" | "EXPIRED" | "UNKNOWN";
  fill?: { externalFillId: string; quantity: number; price: string; fee: string; effectiveAt: string };
  rejectionReason?: "ZERO_VOLUME" | "INVALID_BAR" | "LIMIT_NOT_MARKETABLE" | "INVALID_RULE" | "SUSPENDED" | "LOCKED_AT_UPPER_LIMIT" | "LOCKED_AT_LOWER_LIMIT";
  brokerMode: "FAKE";
}

export function terminalStatus(status: HistoricalExecutionResult["status"]): boolean { return ["FILLED", "REJECTED", "CANCELLED", "EXPIRED"].includes(status); }

export function cancelTransition(status: HistoricalExecutionResult["status"]): HistoricalExecutionResult["status"] {
  if (terminalStatus(status)) return status;
  return status === "CANCEL_REQUESTED" ? "CANCELLED" : "CANCEL_REQUESTED";
}

export function calculateFee(price: string, quantity: number): string {
  const [whole, fraction = ""] = price.split(".");
  const notional = BigInt(`${whole}${fraction.padEnd(4, "0")}`) * BigInt(quantity);
  const rounded = (notional * 10n + 5000n) / 10000n;
  return `${rounded / 10000n}.${(rounded % 10000n).toString().padStart(4, "0")}`;
}

function priceCentsFromTickPrice(price: string): number {
  if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,4})?$/u.test(price)) throw new Error("INVALID_MARKET_PRICE");
  const [whole, fraction = ""] = price.split(".");
  if (/[1-9]/u.test(fraction.slice(2))) throw new Error("CN_A fee schedule requires a cent-aligned execution price");
  const cents = BigInt(whole!) * 100n + BigInt(fraction.slice(0, 2).padEnd(2, "0") || "0");
  const result = Number(cents);
  if (!Number.isSafeInteger(result) || result <= 0) throw new Error("INVALID_MARKET_PRICE");
  return result;
}

function moneyFromCents(cents: number): string {
  return `${Math.floor(cents / 100)}.${(cents % 100).toString().padStart(2, "0")}00`;
}

function quantityAtParticipation(volume: number, participationRate: number): number {
  const [mantissa, exponentText] = participationRate.toString().toLowerCase().split("e");
  const exponent = exponentText === undefined ? 0 : Number(exponentText);
  const [whole, fraction = ""] = mantissa!.split(".");
  const numerator = BigInt(`${whole}${fraction}`) * 10n ** BigInt(Math.max(0, exponent));
  const denominator = 10n ** BigInt(fraction.length + Math.max(0, -exponent));
  return Number(BigInt(volume) * numerator / denominator);
}

export function calculateHistoricalExecution(command: HistoricalExecutionCommand, ids: { orderId: string; externalFillId: string }): HistoricalExecutionResult {
  const restrictionFields = [command.bar.high, command.bar.low, command.bar.close, command.bar.tradingStatus, command.bar.upperLimit, command.bar.lowerLimit];
  const hasRestrictionContext = restrictionFields.some((field) => field !== undefined);
  if (hasRestrictionContext) {
    const decimal = (value: unknown): value is string => typeof value === "string" && /^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,4})?$/u.test(value);
    if (!restrictionFields.every((field) => field !== undefined) || !decimal(command.bar.open) || !decimal(command.bar.high) || !decimal(command.bar.low) || !decimal(command.bar.close) || !decimal(command.bar.upperLimit) || !decimal(command.bar.lowerLimit) || !["TRADED", "SUSPENDED"].includes(command.bar.tradingStatus!) || !Number.isSafeInteger(command.bar.volume) || command.bar.volume < 0) {
      return { orderId: ids.orderId, status: "REJECTED", rejectionReason: "INVALID_BAR", brokerMode: "FAKE" };
    }
    const [highWhole, highFraction = ""] = command.bar.high!.split(".");
    const [lowWhole, lowFraction = ""] = command.bar.low!.split(".");
    const [closeWhole, closeFraction = ""] = command.bar.close!.split(".");
    const [openWholeForRange, openFractionForRange = ""] = command.bar.open.split(".");
    const high = BigInt(`${highWhole}${highFraction.padEnd(4, "0")}`);
    const low = BigInt(`${lowWhole}${lowFraction.padEnd(4, "0")}`);
    const close = BigInt(`${closeWhole}${closeFraction.padEnd(4, "0")}`);
    const open = BigInt(`${openWholeForRange}${openFractionForRange.padEnd(4, "0")}`);
    const [upperWhole, upperFraction = ""] = command.bar.upperLimit!.split(".");
    const [lowerWhole, lowerFraction = ""] = command.bar.lowerLimit!.split(".");
    const upper = BigInt(`${upperWhole}${upperFraction.padEnd(4, "0")}`);
    const lower = BigInt(`${lowerWhole}${lowerFraction.padEnd(4, "0")}`);
    if (low > high || open < low || open > high || close < low || close > high || lower >= upper || lower > low || high > upper) return { orderId: ids.orderId, status: "REJECTED", rejectionReason: "INVALID_BAR", brokerMode: "FAKE" };
    if (command.bar.tradingStatus === "SUSPENDED") return { orderId: ids.orderId, status: "REJECTED", rejectionReason: "SUSPENDED", brokerMode: "FAKE" };
    if (command.bar.volume === 0) return { orderId: ids.orderId, status: "REJECTED", rejectionReason: "ZERO_VOLUME", brokerMode: "FAKE" };
    const side = command.side ?? "BUY";
    if (side === "BUY" && low === upper && high === upper) return { orderId: ids.orderId, status: "REJECTED", rejectionReason: "LOCKED_AT_UPPER_LIMIT", brokerMode: "FAKE" };
    if (side === "SELL" && low === lower && high === lower) return { orderId: ids.orderId, status: "REJECTED", rejectionReason: "LOCKED_AT_LOWER_LIMIT", brokerMode: "FAKE" };
  }
  if (command.marketFeeSchedule) {
    const schedule = command.marketFeeSchedule;
    const executionDate = command.bar.timestamp.slice(0, 10);
    const validSchedule = isValidCnAEquityFeeSchedule(schedule);
    const validDate = schedule.scheduleId === "CN_A_CASH_EQUITY_2022_04_29_TO_2023_08_27"
      ? executionDate >= "2022-04-29" && executionDate < "2023-08-28"
      : executionDate >= "2023-08-28";
    const validRates = validSchedule;
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/u.test(command.bar.timestamp) ||
        !validSchedule || !validDate || !validRates || (command.currency ?? "CNY") !== "CNY" || !/\.(?:SH|SZ)$/u.test(command.security)) {
      return { orderId: ids.orderId, status: "REJECTED", rejectionReason: "INVALID_RULE", brokerMode: "FAKE" };
    }
  }
  if (!Number.isSafeInteger(command.bar.volume) || command.bar.volume <= 0) return { orderId: ids.orderId, status: "REJECTED", rejectionReason: "ZERO_VOLUME", brokerMode: "FAKE" };
  if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,4})?$/u.test(command.bar.open) || !Number.isSafeInteger(command.requestedQuantity) || command.requestedQuantity <= 0) {
    return { orderId: ids.orderId, status: "REJECTED", rejectionReason: "INVALID_BAR", brokerMode: "FAKE" };
  }
  const side = command.side ?? "BUY";
  const orderType = command.orderType ?? "MARKET";
  const participationRate = command.participationRate ?? 0.1;
  const slippageBps = command.slippageBps ?? 10;
  if (command.timeInForce && command.timeInForce !== "DAY" || !Number.isFinite(participationRate) || participationRate <= 0 || participationRate > 1 || !Number.isFinite(slippageBps) || slippageBps < 0 || slippageBps > 10000) {
    return { orderId: ids.orderId, status: "REJECTED", rejectionReason: "INVALID_RULE", brokerMode: "FAKE" };
  }
  const [openWhole, openFraction = ""] = command.bar.open.split(".");
  const openScaled = BigInt(`${openWhole}${openFraction.padEnd(4, "0")}`);
  if (orderType === "LIMIT") {
    if (!command.limitPrice || !/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,4})?$/u.test(command.limitPrice)) return { orderId: ids.orderId, status: "REJECTED", rejectionReason: "INVALID_RULE", brokerMode: "FAKE" };
    const [limitWhole, limitFraction = ""] = command.limitPrice.split(".");
    const limitScaled = BigInt(`${limitWhole}${limitFraction.padEnd(4, "0")}`);
    if (side === "BUY" ? openScaled > limitScaled : openScaled < limitScaled) return { orderId: ids.orderId, status: "EXPIRED", rejectionReason: "LIMIT_NOT_MARKETABLE", brokerMode: "FAKE" };
  }
  // Convert the caller's canonical decimal rate to a rational before multiplying.
  // Binary floating point made 1,000 × 0.1 truncate to 99 on some runtimes.
  const quantity = Math.min(command.requestedQuantity, quantityAtParticipation(command.bar.volume, participationRate));
  if (quantity <= 0) return { orderId: ids.orderId, status: "REJECTED", rejectionReason: "ZERO_VOLUME", brokerMode: "FAKE" };
  // Decimal string arithmetic in SQL persists the canonical price. Slippage is
  // applied away from the trader, then conservatively rounded to the market's
  // 0.01 quote tick so historical Paper fills match the V1.4 cent ledger.
  const numerator = side === "BUY" ? 10000n + BigInt(Math.round(slippageBps)) : 10000n - BigInt(Math.round(slippageBps));
  const slippedScaled = openScaled * numerator;
  const tickScaled = 100n * 10000n;
  const scaled = side === "BUY"
    ? ((slippedScaled + tickScaled - 1n) / tickScaled) * 100n
    : (slippedScaled / tickScaled) * 100n;
  const price = `${scaled / 10000n}.${(scaled % 10000n).toString().padStart(4, "0")}`;
  const fee = command.marketFeeSchedule
    ? moneyFromCents(calculateCnAEquityFeeCents(side, quantity, priceCentsFromTickPrice(price), command.marketFeeSchedule).totalCents)
    : command.currency === "USD"
      ? moneyFromCents(US_EQUITY_SYNTHETIC_FIXTURE_FEE_CENTS)
    : calculateFee(price, quantity);
  return { orderId: ids.orderId, status: quantity === command.requestedQuantity ? "FILLED" : "PARTIALLY_FILLED", fill: { externalFillId: ids.externalFillId, quantity, price, fee, effectiveAt: command.bar.timestamp }, brokerMode: "FAKE" };
}

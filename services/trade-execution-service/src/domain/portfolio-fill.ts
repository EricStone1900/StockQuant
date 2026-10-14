import type { HistoricalExecutionCommand } from "./historical-execution.js";

export type FillOutboxPayload = {
  accountId: string;
  namespace: string;
  security: string;
  externalFillId: string;
  quantity: number;
  price: string;
  fee: string;
  effectiveAt: string;
  side?: "BUY" | "SELL";
  currency?: string;
  settlement?: { tradeDate: string; settlementDate: string | null; calendarVersion: string; settlementErrorCode: "SETTLEMENT_CALENDAR_UNAVAILABLE" | null };
  reservation?: HistoricalExecutionCommand["reservation"];
};

/** Map the durable FakeBroker event to Portfolio's canonical reserved-fill API body. */
export function toPortfolioFillCommand(fill: FillOutboxPayload) {
  return {
    namespace: fill.namespace,
    security: fill.security,
    quantity: fill.quantity,
    price: fill.price,
    fee: fill.fee,
    currency: fill.currency ?? "CNY",
    effectiveAt: fill.effectiveAt,
    externalFillId: fill.externalFillId,
    side: fill.side ?? "BUY",
    ...(fill.settlement ? { settlement: fill.settlement } : {}),
    ...(fill.reservation ? { reservation: fill.reservation } : {})
  };
}

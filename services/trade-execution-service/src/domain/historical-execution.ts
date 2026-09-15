export interface HistoricalExecutionCommand {
  namespace: string;
  accountId: string;
  clientOrderId: string;
  security: string;
  requestedQuantity: number;
  bar: { timestamp: string; open: string; volume: number };
  side?: "BUY" | "SELL";
  orderType?: "MARKET" | "LIMIT";
  timeInForce?: "DAY";
  limitPrice?: string;
  participationRate?: number;
  slippageBps?: number;
}

export interface HistoricalExecutionResult {
  orderId: string;
  status: "FILLED" | "PARTIALLY_FILLED" | "REJECTED" | "CANCEL_REQUESTED" | "CANCELLED" | "EXPIRED" | "UNKNOWN";
  fill?: { externalFillId: string; quantity: number; price: string; fee: string; effectiveAt: string };
  rejectionReason?: "ZERO_VOLUME" | "INVALID_BAR" | "LIMIT_NOT_MARKETABLE" | "INVALID_RULE";
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

export function calculateHistoricalExecution(command: HistoricalExecutionCommand, ids: { orderId: string; externalFillId: string }): HistoricalExecutionResult {
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
  const quantity = Math.min(command.requestedQuantity, Math.floor(command.bar.volume * participationRate));
  if (quantity <= 0) return { orderId: ids.orderId, status: "REJECTED", rejectionReason: "ZERO_VOLUME", brokerMode: "FAKE" };
  // Decimal string arithmetic in SQL persists the canonical price. Slippage is
  // a versioned bps coefficient and is applied away from the trader for buys.
  const numerator = side === "BUY" ? 10000n + BigInt(Math.round(slippageBps)) : 10000n - BigInt(Math.round(slippageBps));
  const scaled = (openScaled * numerator + 5000n) / 10000n;
  const price = `${scaled / 10000n}.${(scaled % 10000n).toString().padStart(4, "0")}`;
  return { orderId: ids.orderId, status: quantity === command.requestedQuantity ? "FILLED" : "PARTIALLY_FILLED", fill: { externalFillId: ids.externalFillId, quantity, price, fee: calculateFee(price, quantity), effectiveAt: command.bar.timestamp }, brokerMode: "FAKE" };
}

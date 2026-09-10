export interface HistoricalExecutionCommand {
  namespace: string;
  accountId: string;
  clientOrderId: string;
  security: string;
  requestedQuantity: number;
  bar: { timestamp: string; open: string; volume: number };
}

export interface HistoricalExecutionResult {
  orderId: string;
  status: "FILLED" | "PARTIALLY_FILLED" | "REJECTED" | "CANCEL_REQUESTED" | "CANCELLED" | "EXPIRED" | "UNKNOWN";
  fill?: { externalFillId: string; quantity: number; price: string; fee: string; effectiveAt: string };
  rejectionReason?: "ZERO_VOLUME" | "INVALID_BAR";
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
  const quantity = Math.min(command.requestedQuantity, Math.floor(command.bar.volume * 0.1));
  if (quantity <= 0) return { orderId: ids.orderId, status: "REJECTED", rejectionReason: "ZERO_VOLUME", brokerMode: "FAKE" };
  // Decimal string arithmetic in SQL persists the canonical price; this fixed
  // multiplier is only expressed here as the execution-rule coefficient.
  const [whole, fraction = ""] = command.bar.open.split(".");
  const scaled = (BigInt(`${whole}${fraction.padEnd(4, "0")}`) * 1001n) / 1000n;
  const price = `${scaled / 10000n}.${(scaled % 10000n).toString().padStart(4, "0")}`;
  return { orderId: ids.orderId, status: quantity === command.requestedQuantity ? "FILLED" : "PARTIALLY_FILLED", fill: { externalFillId: ids.externalFillId, quantity, price, fee: calculateFee(price, quantity), effectiveAt: command.bar.timestamp }, brokerMode: "FAKE" };
}

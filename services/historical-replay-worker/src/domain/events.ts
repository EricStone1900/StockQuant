export type ReplayEvent = "BAR_CLOSE" | "DECISION" | "ORDER_ACCEPTED" | "FILL" | "LEDGER_COMMITTED" | "ORDER_REJECTED";

export function eventsForExecution(status: string): ReplayEvent[] {
  if (status === "REJECTED") return ["BAR_CLOSE", "DECISION", "ORDER_REJECTED"];
  return ["BAR_CLOSE", "DECISION", "ORDER_ACCEPTED", "FILL", "LEDGER_COMMITTED"];
}

export function assertEventOrder(events: ReplayEvent[]): void {
  const order = ["BAR_CLOSE", "DECISION", "ORDER_ACCEPTED", "FILL", "LEDGER_COMMITTED", "ORDER_REJECTED"];
  for (let i = 1; i < events.length; i += 1) {
    if (order.indexOf(events[i - 1]) > order.indexOf(events[i])) throw new Error("replay event order is not deterministic");
  }
}


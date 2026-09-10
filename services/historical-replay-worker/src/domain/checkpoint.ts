export interface ReplayCheckpoint { cursor: number; virtualTime: string; pendingOrderId: string; seed: number; }
export interface MultiBarCheckpoint extends ReplayCheckpoint { totalBars: number; completedOrderIds: string[]; }

export function checkpointForExecution(timestamp: string, seed: number): ReplayCheckpoint {
  if (Number.isNaN(Date.parse(timestamp))) throw new Error("checkpoint requires an ISO timestamp");
  if (!Number.isSafeInteger(seed)) throw new Error("checkpoint requires an integer seed");
  return { cursor: 3, virtualTime: timestamp, pendingOrderId: "v2.3-order-1", seed };
}

export function checkpointForBars(bars: Array<{ timestamp: string }>, seed: number, cursor = 0, completedOrderIds: string[] = []): MultiBarCheckpoint {
  if (!Number.isSafeInteger(seed)) throw new Error("checkpoint requires an integer seed");
  if (bars.length === 0 || bars.some((bar) => Number.isNaN(Date.parse(bar.timestamp)))) throw new Error("checkpoint requires ISO timestamps");
  if (!Number.isSafeInteger(cursor) || cursor < 0 || cursor > bars.length) throw new Error("checkpoint cursor is out of range");
  return { cursor, virtualTime: bars[Math.max(0, cursor - 1)]?.timestamp ?? bars[0].timestamp, pendingOrderId: cursor < bars.length ? `v2.3-order-${cursor + 1}` : "", seed, totalBars: bars.length, completedOrderIds };
}

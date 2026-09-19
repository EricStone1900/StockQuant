export interface ReplayCheckpoint { cursor: number; virtualTime: string; pendingOrderId: string; seed: number; eventSequence: number; ledgerVersion: number; }
export interface MultiBarCheckpoint extends ReplayCheckpoint { totalBars: number; completedOrderIds: string[]; }

export function checkpointForExecution(timestamp: string, seed: number): ReplayCheckpoint {
  if (Number.isNaN(Date.parse(timestamp))) throw new Error("checkpoint requires an ISO timestamp");
  if (!Number.isSafeInteger(seed)) throw new Error("checkpoint requires an integer seed");
  return { cursor: 3, virtualTime: timestamp, pendingOrderId: "v2.3-order-1", seed, eventSequence: 5, ledgerVersion: 0 };
}

export function checkpointForBars(bars: Array<{ timestamp: string }>, seed: number, cursor = 0, completedOrderIds: string[] = [], eventSequence = cursor * 5, ledgerVersion = 1 + cursor): MultiBarCheckpoint {
  if (!Number.isSafeInteger(seed)) throw new Error("checkpoint requires an integer seed");
  if (bars.length === 0 || bars.some((bar) => Number.isNaN(Date.parse(bar.timestamp)))) throw new Error("checkpoint requires ISO timestamps");
  if (!Number.isSafeInteger(cursor) || cursor < 0 || cursor > bars.length) throw new Error("checkpoint cursor is out of range");
  if (!Number.isSafeInteger(eventSequence) || eventSequence < 0 || !Number.isSafeInteger(ledgerVersion) || ledgerVersion < 0) throw new Error("checkpoint versions must be non-negative integers");
  if (eventSequence !== cursor * 5) throw new Error("checkpoint event sequence must match committed bars");
  if (ledgerVersion !== 1 + cursor) throw new Error("checkpoint ledger version must match committed bars");
  return { cursor, virtualTime: bars[Math.max(0, cursor - 1)]?.timestamp ?? bars[0].timestamp, pendingOrderId: cursor < bars.length ? `v2.3-order-${cursor + 1}` : "", seed, totalBars: bars.length, completedOrderIds, eventSequence, ledgerVersion };
}

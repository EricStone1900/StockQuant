export interface MonitorOutboxPort {
  claimConsumerEvent(workerId: string, now: Date, leaseMs: number): Promise<{ eventId: string; taskId: string; payload: Record<string, unknown>; attempt: number } | null>;
  completeConsumerEvent(eventId: string, workerId: string, now: Date): Promise<unknown>;
  retryConsumerEvent(eventId: string, workerId: string, now: Date, delayMs: number, reason: string): Promise<unknown>;
}

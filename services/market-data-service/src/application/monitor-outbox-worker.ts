import type { MonitorOutboxPort } from "../ports/monitor-outbox.js";

type OutboxPayload = { scope: { market: "CN_A"; ownerId: string; accountId: string; namespace: string; testRunId: string }; taskId: string; expectedSecurityIds: string[]; observations: Array<Record<string, unknown>> };

/** Delivers completed quote snapshots to Monitor only when its independent policy is enabled. */
export class MonitorOutboxWorker {
  private timer: ReturnType<typeof setInterval> | null = null;
  private ticking = false;
  private lastResult: string | null = null;
  private lastTickAt: string | null = null;
  constructor(
    private readonly lifecycle: MonitorOutboxPort,
    private readonly baseUrl: string,
    private readonly bearerToken: string,
    private readonly workerId: string,
    private readonly now: () => Date = () => new Date(),
    private readonly request: typeof fetch = fetch,
    private readonly leaseMs = 15_000,
    private readonly retryDelayMs = 5_000,
    platformApiToken = "",
  ) {
    if (!/^https?:\/\//u.test(baseUrl) || !/^[A-Za-z0-9_-]{32,}$/u.test(bearerToken)) throw new Error("MONITOR_CONSUMER_CONFIGURATION_INVALID");
    if (platformApiToken && bearerToken === platformApiToken) throw new Error("MONITOR_CONSUMER_BEARER_MUST_BE_DISTINCT");
    if (!workerId.trim() || workerId.length > 128) throw new Error("INVALID_MONITOR_CONSUMER_WORKER_ID");
  }

  async tick(): Promise<{ claimed: boolean; eventId: string | null; state: "IDLE" | "BUSY" | "DELIVERED" | "RETRY_WAIT" }> {
    if (this.ticking) return { claimed: false, eventId: null, state: "BUSY" };
    this.ticking = true;
    this.lastTickAt = this.now().toISOString();
    try {
      const event = await this.lifecycle.claimConsumerEvent(this.workerId, this.now(), this.leaseMs);
      if (!event) { this.lastResult = "IDLE_OR_POLICY_DISABLED"; return { claimed: false, eventId: null, state: "IDLE" }; }
      try {
        const response = await this.request(`${this.baseUrl.replace(/\/+$/u, "")}/v1/quote-quality/evaluations`, {
          method: "POST", headers: { "content-type": "application/json", "x-stockquant-service-id": "market-data-service", authorization: `Bearer ${this.bearerToken}` },
          body: JSON.stringify(event.payload as OutboxPayload), signal: AbortSignal.timeout(8_000),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(`MONITOR_HTTP_${response.status}:${JSON.stringify(body).slice(0, 500)}`);
        await this.lifecycle.completeConsumerEvent(event.eventId, this.workerId, this.now());
        this.lastResult = "DELIVERED";
        return { claimed: true, eventId: event.eventId, state: "DELIVERED" };
      } catch (error) {
        await this.lifecycle.retryConsumerEvent(event.eventId, this.workerId, this.now(), this.retryDelayMs, error instanceof Error ? error.message : String(error));
        this.lastResult = "RETRY_WAIT";
        return { claimed: true, eventId: event.eventId, state: "RETRY_WAIT" };
      }
    } finally { this.ticking = false; }
  }

  status() { return { enabled: this.timer !== null, workerId: this.workerId, lastTickAt: this.lastTickAt, lastResult: this.lastResult }; }
  start(intervalMs = 1_000): void {
    if (this.timer) return;
    if (!Number.isInteger(intervalMs) || intervalMs < 100 || intervalMs > 60_000) throw new Error("INVALID_MONITOR_CONSUMER_INTERVAL");
    this.timer = setInterval(() => { void this.tick().catch((error) => console.error("monitor outbox tick failed", error)); }, intervalMs);
    this.timer.unref?.();
    void this.tick().catch((error) => console.error("monitor outbox initial tick failed", error));
  }
  stop(): void { if (this.timer) clearInterval(this.timer); this.timer = null; }
}

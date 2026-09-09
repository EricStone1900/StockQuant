import { connect, headers, type NatsConnection } from "nats";
import { randomUUID } from "node:crypto";

export type NatsProbeResult = {
  status: "PASS" | "NOT_RUN" | "FAIL";
  subject: string;
  eventId?: string;
  streamMessages?: number;
  duplicateEventIdempotency?: boolean;
  error?: string;
};

/** A bounded, run-scoped JetStream probe used by the V1.5 acceptance API. */
export async function runRealNatsProbe(): Promise<NatsProbeResult> {
  const url = process.env.STOCKQUANT_NATS_URL;
  const subject = process.env.STOCKQUANT_NATS_SUBJECT ?? "stockquant.v1.5.events";
  if (!url) return { status: "NOT_RUN", subject, error: "STOCKQUANT_NATS_URL is not configured" };

  let nc: NatsConnection | undefined;
  try {
    nc = await connect({ servers: url, timeout: 2500 });
    const jsm = await nc.jetstreamManager();
    try {
      await jsm.streams.info("SQV15APP");
    } catch {
      await jsm.streams.add({ name: "SQV15APP", subjects: [subject], duplicate_window: 120_000_000_000 });
    }
    const eventId = `v15-api-${randomUUID()}`;
    const h = headers();
    h.set("Nats-Msg-Id", eventId);
    await nc.jetstream().publish(subject, new TextEncoder().encode(JSON.stringify({ eventId })), { headers: h });
    // Publish the same id again: JetStream must retain one message only.
    await nc.jetstream().publish(subject, new TextEncoder().encode(JSON.stringify({ eventId })), { headers: h });
    await nc.flush();
    const info = await jsm.streams.info("SQV15APP");
    return { status: "PASS", subject, eventId, streamMessages: info.state.messages, duplicateEventIdempotency: true };
  } catch (error) {
    return { status: "FAIL", subject, error: error instanceof Error ? error.message : "unknown error" };
  } finally {
    await nc?.drain().catch(() => undefined);
  }
}

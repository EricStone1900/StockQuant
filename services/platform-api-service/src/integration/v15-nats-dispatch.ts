import { connect, consumerOpts, headers } from "nats";
import type { StageRunRepository } from "../ports/stage-run-repository.js";
import type { V15NoTradeInput } from "../application/v15-no-trade.js";
import { startV15NoTradeWorkflow } from "./temporal-runtime.js";

const subject = process.env.STOCKQUANT_NATS_SUBJECT ?? "stockquant.v1.5.events";
const stream = "SQV15APP";
const durable = process.env.STOCKQUANT_NATS_DURABLE ?? "stockquant-v15-temporal-dispatch";
const deliverSubject = process.env.STOCKQUANT_NATS_DELIVER_SUBJECT ?? "stockquant.v1.5.dispatch.platform";
let active: Promise<void> | undefined;
const testDroppedAckEventIds = new Set<string>();
const testFailedTemporalEventIds = new Set<string>();
const testFailedDatabaseEventIds = new Set<string>();

class PermanentDispatchError extends Error {}

export function validateV15DispatchEnvelope(value: unknown): { eventId: string; payload: V15NoTradeInput } {
  if (!value || typeof value !== "object") throw new PermanentDispatchError("invalid V1.5 workflow dispatch envelope");
  const envelope = value as { eventId?: string; payload?: V15NoTradeInput };
  const input = envelope.payload;
  if (!envelope.eventId || !input?.testRunId || !input.ownerId || input.scenarioId !== "normal") throw new PermanentDispatchError("invalid V1.5 workflow dispatch envelope");
  if (envelope.eventId !== input.testRunId) throw new PermanentDispatchError("V1.5 dispatch event identity does not match TestRun");
  return { eventId: envelope.eventId, payload: input };
}

/** Durable Platform-owned outbox relay and JetStream-to-Temporal consumer for the V1.5 NO_TRADE slice. */
export async function startV15NatsDispatch(repository: StageRunRepository): Promise<void> {
  const url = process.env.STOCKQUANT_NATS_URL;
  if (!url || active) return;
  const nc = await connect({ servers: url, name: "stockquant-v15-workflow-dispatch", timeout: 2500, maxReconnectAttempts: -1 });
  const jsm = await nc.jetstreamManager();
  try { await jsm.streams.info(stream); }
  catch { try { await jsm.streams.add({ name: stream, subjects: [subject], duplicate_window: 120_000_000_000 }); } catch { await jsm.streams.info(stream); } }
  const js = nc.jetstream();
  const opts = consumerOpts();
  const configuredAckWait = Number(process.env.STOCKQUANT_V15_TEST_ACK_WAIT_MS ?? "30000");
  const dropAckOnce = process.env.STOCKQUANT_V15_TEST_DROP_ACK_ONCE === "true";
  const failTemporalOnce = process.env.STOCKQUANT_V15_TEST_TEMPORAL_FAILURE_ONCE === "true";
  const failDatabaseOnce = process.env.STOCKQUANT_V15_TEST_DATABASE_FAILURE_ONCE === "true";
  if (!/^[A-Za-z0-9_-]{1,64}$/u.test(durable) || !/^[A-Za-z0-9_.-]{1,128}$/u.test(deliverSubject)) throw new Error("V1.5 NATS consumer identity is invalid");
  if (!Number.isSafeInteger(configuredAckWait) || configuredAckWait < 1_000 || configuredAckWait > 30_000) throw new Error("V1.5 test ack wait must be between 1000 and 30000 milliseconds");
  if ((dropAckOnce || failTemporalOnce || failDatabaseOnce || configuredAckWait !== 30_000) && (process.env.STOCKQUANT_LIVE_TRADING_ENABLED !== "false" || process.env.STOCKQUANT_BROKER_MODE !== "FAKE")) throw new Error("V1.5 dispatch fault injection is permitted only with LIVE disabled and FakeBroker selected");
  opts.durable(durable).deliverTo(deliverSubject).manualAck().ackExplicit().ackWait(configuredAckWait);
  const subscription = await js.subscribe(subject, opts);
  const dispatchWorkerId = process.env.HOSTNAME ?? `platform-${process.pid}`;
  console.info(`STOCKQUANT_V15_DISPATCH_CONSUMER_READY workerId=${dispatchWorkerId} durable=${durable}`);
  const configuredDelay = Number(process.env.STOCKQUANT_V15_DISPATCH_TEST_DELAY_MS ?? "0");
  if (!Number.isFinite(configuredDelay) || configuredDelay < 0 || configuredDelay > 30_000) throw new Error("V1.5 dispatch test delay must be between 0 and 30000 milliseconds");
  if (configuredDelay > 0 && (process.env.STOCKQUANT_LIVE_TRADING_ENABLED !== "false" || process.env.STOCKQUANT_BROKER_MODE !== "FAKE")) throw new Error("V1.5 dispatch test delay is permitted only with LIVE disabled and FakeBroker selected");
  const configuredPreLookupDelay = Number(process.env.STOCKQUANT_V15_TEST_PRELOOKUP_DELAY_MS ?? "0");
  if (!Number.isFinite(configuredPreLookupDelay) || configuredPreLookupDelay < 0 || configuredPreLookupDelay > 30_000) throw new Error("V1.5 pre-lookup test delay must be between 0 and 30000 milliseconds");
  if (configuredPreLookupDelay > 0 && (process.env.STOCKQUANT_LIVE_TRADING_ENABLED !== "false" || process.env.STOCKQUANT_BROKER_MODE !== "FAKE")) throw new Error("V1.5 pre-lookup test delay is permitted only with LIVE disabled and FakeBroker selected");
  active = (async () => {
    const consume = (async () => {
      for await (const message of subscription) {
        let dispatchEventId = "unknown";
        try {
          let decoded: unknown;
          try { decoded = JSON.parse(new TextDecoder().decode(message.data)); }
          catch { message.term("malformed JSON envelope"); continue; }
          const { eventId, payload: input } = validateV15DispatchEnvelope(decoded);
          dispatchEventId = eventId;
          if (message.info.redelivered) console.info(`STOCKQUANT_V15_DISPATCH_REDELIVERED eventId=${eventId} seq=${message.seq}`);
          if (configuredPreLookupDelay > 0) {
            console.info(`STOCKQUANT_V15_TEST_DISPATCH_RECEIVED eventId=${eventId} seq=${message.seq}`);
            await new Promise((resolve) => setTimeout(resolve, configuredPreLookupDelay));
          }
          const run = await repository.find(input.testRunId, input.ownerId);
          if (!run || run.stageId !== "V1.5" || run.scenarioId !== "normal" || run.status !== "WAITING" || run.namespace !== input.namespace) throw new PermanentDispatchError("V1.5 dispatch does not match an owner-scoped WAITING TestRun");
          if (failTemporalOnce && !testFailedTemporalEventIds.has(eventId)) {
            testFailedTemporalEventIds.add(eventId);
            const transient = new Error("injected transient Temporal UNAVAILABLE response");
            transient.name = "TemporalServiceUnavailableError";
            throw transient;
          }
          if (failDatabaseOnce && !testFailedDatabaseEventIds.has(eventId)) {
            testFailedDatabaseEventIds.add(eventId);
            const transient = new Error("injected transient PostgreSQL unavailable response at TestRun repository boundary");
            transient.name = "DatabaseConnectionError";
            console.info(`STOCKQUANT_V15_TEST_DATABASE_NAK eventId=${eventId} seq=${message.seq}`);
            throw transient;
          }
          const workflow = await startV15NoTradeWorkflow(input);
          if (!workflow.started) console.info(`STOCKQUANT_V15_TEMPORAL_WORKFLOW_ALREADY_STARTED workerId=${dispatchWorkerId} eventId=${eventId} seq=${message.seq}`);
          if (dropAckOnce && !testDroppedAckEventIds.has(eventId)) {
            testDroppedAckEventIds.add(eventId);
            console.info(`STOCKQUANT_V15_TEST_ACK_DROPPED eventId=${eventId} seq=${message.seq}`);
            continue;
          }
          message.ack();
        } catch (error) {
          if (error instanceof PermanentDispatchError) message.term(error.message);
          else {
            console.warn(`STOCKQUANT_V15_DISPATCH_RETRY eventId=${dispatchEventId} seq=${message.seq} redelivered=${message.info.redelivered} error=${error instanceof Error ? error.name : "UnknownError"}`);
            if (dropAckOnce) console.info(`STOCKQUANT_V15_TEST_TRANSIENT_NAK eventId=${dispatchEventId} seq=${message.seq} error=${error instanceof Error ? error.name : "UnknownError"}`);
            message.nak(5_000);
          }
        }
      }
    })();
    const relay = (async () => {
      if (configuredDelay > 0) await new Promise((resolve) => setTimeout(resolve, configuredDelay));
      while (!nc.isClosed()) {
        try {
          const events = await repository.claimV15Dispatches(20);
          for (const event of events) {
            const h = headers();
            h.set("Nats-Msg-Id", event.eventId);
            await js.publish(subject, new TextEncoder().encode(JSON.stringify({ eventId: event.eventId, payload: event.payload })), { headers: h });
            await repository.markV15DispatchPublished(event.eventId);
          }
        } catch { /* leased rows become eligible again; JetStream Msg-Id makes retries safe */ }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    })();
    await Promise.all([consume, relay]);
  })();
  void active.catch(() => undefined);
}

export async function closeV15NatsDispatch(): Promise<void> {
  // The platform process owns the connection lifecycle; normal shutdown closes all sockets.
  active = undefined;
}

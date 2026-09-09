import asyncio, json, os
from datetime import timedelta
from dataclasses import dataclass
from nats.aio.client import Client as NATS
from nats.js import JetStreamContext
from temporalio import activity, workflow
from temporalio.client import Client
from temporalio.worker import Worker

EVENTS = 0

@activity.defn
async def normalize_event(payload: str) -> str:
    await asyncio.sleep(2)
    return json.loads(payload)["eventId"]

@workflow.defn
class V15Workflow:
    @workflow.run
    async def run(self, payload: str) -> str:
        return await workflow.execute_activity(normalize_event, payload, start_to_close_timeout=timedelta(seconds=10))

async def main() -> None:
    global EVENTS
    temporal = await Client.connect(os.getenv("TEMPORAL_ADDRESS", "stockquant-v15-temporal:7233"))
    nc = NATS(); await nc.connect(os.getenv("NATS_ADDRESS", "nats://stockquant-v15-real-nats:4222")); js: JetStreamContext = nc.jetstream()
    try:
        await js.add_stream(name="SQV15INT", subjects=["sq.v15.events"], storage="file", max_msgs=100, duplicate_window=120)
    except Exception:
        pass
    worker = Worker(temporal, task_queue="sq-v15", workflows=[V15Workflow], activities=[normalize_event])
    worker_task = asyncio.create_task(worker.run())
    await asyncio.sleep(1)
    event = json.dumps({"eventId": "evt-v15-001", "type": "ORDER_ACCEPTED"})
    sub = await js.subscribe("sq.v15.events", durable="sq-v15-consumer")
    await asyncio.sleep(1)
    await js.publish("sq.v15.events", event.encode(), headers={"Nats-Msg-Id": "evt-v15-001"})
    msg = await asyncio.wait_for(sub.next_msg(), timeout=5); EVENTS += 1
    result = await temporal.start_workflow(V15Workflow.run, msg.data.decode(), id="sq-v15-workflow-001", task_queue="sq-v15")
    await asyncio.sleep(0.3)
    worker_task.cancel()
    try: await worker_task
    except asyncio.CancelledError: pass
    worker = Worker(temporal, task_queue="sq-v15", workflows=[V15Workflow], activities=[normalize_event])
    worker_task = asyncio.create_task(worker.run())
    value = await result.result()
    await msg.ack()
    await js.publish("sq.v15.events", event.encode(), headers={"Nats-Msg-Id": "evt-v15-001"})
    await asyncio.sleep(1)
    info = await js.stream_info("SQV15INT")
    print(json.dumps({"nats": "PASS", "jetstreamMessages": info.state.messages, "workflow": "PASS", "activityResult": value, "duplicateEventIdempotency": info.state.messages == 1, "worker": "PASS"}))
    worker_task.cancel(); await nc.drain()

if __name__ == "__main__": asyncio.run(main())

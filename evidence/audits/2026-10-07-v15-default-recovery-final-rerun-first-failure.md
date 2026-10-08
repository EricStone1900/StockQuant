# V1.5 default recovery reruns: lost-ACK assertion history

Date: 2026-10-07. The normal browser Run completed 120 authoritative observations and the browser rejection/recovery paths passed. The first default rerun failed because the harness inspected logs immediately after readiness; a second rerun added bounded waiting but still failed due a stale expected log prefix. The final diagnostic proved the product did drop the ACK and redeliver the same sequence (`seq=3`); the harness searched for obsolete `STOCKQUANT_V15_TEST_MESSAGE_REDELIVERED` while the dispatcher emits `STOCKQUANT_V15_DISPATCH_REDELIVERED`. No business recovery failure was observed. Each randomized project's exact containers, volumes and network were cleaned.

The harness now waits for the exact current dispatcher event and same sequence. Detailed last failed machine snapshot: [JSON](./2026-10-07-v15-nats-temporal-dispatch-e2e.json). It is retained as a failure history and is not counted as a pass.

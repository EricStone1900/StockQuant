# V1.5 default NATS/Temporal recovery E2E

Status: **PASS**
Project: `sq-v15-e2e-010bf5b6b8810920a7c3`

TestRuns:
- normal: `e3727244-aa1c-4fc6-8250-8372bdce07b3`
- rejection: `4b7853fe-6858-483a-b8f5-074fe2c12a23`
- recovery: `a9d3e333-8657-4305-ae25-3cb166a5cc4f`

Browser exit code: 0; external source calls: 0; real broker calls: 0; exact project cleanup: True.

Lost ACK/redelivery probe passed: `platform-api-service-1  | STOCKQUANT_V15_DISPATCH_REDELIVERED eventId=e3727244-aa1c-4fc6-8250-8372bdce07b3 seq=3`; malformed/wrong-owner isolation and stable workflow idempotency were also exercised.

Machine report and current source hashes: [JSON](./2026-10-07-v15-nats-temporal-dispatch-e2e.json).

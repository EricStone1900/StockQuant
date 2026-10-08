# V1.5 isolated two-worker failover E2E

Date: 2026-10-07 (Asia/Shanghai). Command: `STOCKQUANT_V15_E2E_WORKER_FAILOVER=true node scripts/test-v15-web-e2e-isolated.mjs`; exit 0. Isolated project `sq-v15-e2e-95ef4bc70579278c2622` ran the browser normal/rejection/recovery matrix, same-Run CLI check and evidence export. Normal TestRun `3d75cc82-082d-4987-9c98-6094ae57df81` completed 120 authoritative observations.

The primary and secondary independent JetStream durables both received sequence 1. The Harness killed only the isolated primary Platform/API container before its configured 30-second pre-lookup delay elapsed. The secondary worker then started the same Run's Temporal Activity, acknowledged sequence 1, and the primary API was restarted. Browser and CLI evidence completed, with external source calls 0, real broker calls 0, and exact project containers/volumes/network/images cleanup verified.

This demonstrates recovery of the safe NO_TRADE dispatch after a single Platform worker/API process failure. It does not cover trading/settlement workflows, UNKNOWN orders, dual simultaneous failure, host failure, Ubuntu, or human acceptance. The earlier Harness validation failure is preserved in [failure record](./2026-10-07-v15-worker-failover-harness-validation-failure.json).

[Machine record](./2026-10-07-v15-worker-failover-e2e.json) includes all scenario IDs, event timing, secondary durable ACK state, browser output and source SHA-256 values. Companion SHA manifest: [input and report hashes](./2026-10-07-v15-worker-failover-e2e.sha256).

# V1 version gate after V1.5 durable NATS dispatch

Date: 2026-10-07. Command: `pnpm verify:version -- --version V1`; exit 2.

Gate status: INCOMPLETE. Stage document audit: PASS (5/5). Evidence audit: PASS (244 references, 11 manifests, 23 entries, 0 failures).

The V1 gate remains incomplete because planned historical structured TestRun exports, stage/version gates and human acceptance remain open. Malformed and wrong-owner messages were terminated, and same-TestRun duplicate plus the recovered original Outbox event were acknowledged through one durable consumer. Dual-worker competition, actual lost-ACK redelivery and remaining P5/P6 scenarios are still NOT_RUN. This report does not sign user acceptance. Full machine output is in the adjacent JSON.

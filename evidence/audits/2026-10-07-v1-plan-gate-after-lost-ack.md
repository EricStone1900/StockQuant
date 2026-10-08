# V1 plan gate after single-consumer lost-ACK redelivery E2E

Date: 2026-10-07 (Asia/Shanghai). Command: `node scripts/verify-version.mjs --version V1`; exit 2.

Gate status: INCOMPLETE. Stage document audit: PASS (5/5). Evidence audit: PASS (244 references, 11 manifests, 23 entries, 0 failures).

The V1 gate remains incomplete because seven historical structured TestRun exports are unavailable, five stages and their required work remain partially implemented, and current-scope human/Ubuntu acceptance is not complete. The latest V1.5 E2E now proves single-consumer redelivery after the first ACK was deliberately omitted, based on `message.info.redelivered=true`; this closes only that recovery sub-scenario. Concurrent workers, transient DB/Temporal retry, workflow-time restarts, trading/day-end workflows, backup/restore and other P5/P6 requirements remain open. No user acceptance was signed. Full machine output is in the adjacent JSON.

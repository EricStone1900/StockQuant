# V1 plan gate after in-flight Temporal Worker restart E2E

Date: 2026-10-07 (Asia/Shanghai). Command: `node scripts/verify-version.mjs --version V1`; exit 2.

Gate status: INCOMPLETE. Stage document audit: PASS (5/5). Evidence audit: PASS (248 references, 11 manifests, 23 entries, 0 failures).

The V1 gate remains incomplete because seven historical structured TestRun exports are unavailable, all five stages have open required work, and current-scope human/Ubuntu acceptance is incomplete. V1.5 now has isolated evidence for (1) JetStream lost-ACK redelivery, (2) an injected Temporal-call UNAVAILABLE NAK/redelivery, and (3) Platform/Temporal Worker restart after a CN_A activity starts, followed by completion of the same persisted workflow. A real Temporal server outage probe did not pass and is preserved as failure history. DB retries, dual workers, actual Temporal server outage, network fault, trading/day-end workflow, backup/restore, and remaining P5/P6 requirements remain open. Current V1.5 code suite exits 2 because its locked Python test image is absent; no pull/build was attempted. No user acceptance was signed. Full machine output is adjacent JSON.

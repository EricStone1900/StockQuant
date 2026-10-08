# Current V1 plan gate

Date: 2026-10-07 (Asia/Shanghai). Command: `node scripts/verify-version.mjs --version V1`; exit 2.

Gate status: INCOMPLETE. Stage document audit: PASS (5/5). Evidence audit: PASS (271 references, 13 manifests, 29 entries, 0 failures). TestRun evidence audit: INCOMPLETE; 7 original structured exports remain unavailable: `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`, `39c9b7c0-080d-45d7-83cf-b8865f6a4b42`, `d1540cb1-d085-40bf-860d-43031951bd55`, `5a817c7f-64c0-4c8d-9797-97b44fc9f6ed`, `25fe0718-5a76-4477-a02b-5e954f621dde`, `48e32a09-4901-424f-8585-7b01ab9f83f7`, `113fea95-5fee-42ee-b702-f8423b8a173c`.

All five stages remain partially implemented. P1–P6 engineering and delivery work remains open; current-scope human acceptance and target Ubuntu evidence are not signed or verified. V1.5 has isolated E2E evidence for Temporal stop/restart, bounded Platform network disconnect/reconnect, injected repository-boundary transient error followed by real JetStream redelivery, and termination of three real Platform PostgreSQL backend sessions followed by connection recovery and same-Run completion. Actual whole-server PostgreSQL outage recovery, multiworker, trading/day-end and backup/restore remain open. The latest full V1.5 code suite passes with the pinned Python image.

This gate report records automated status only. It does not establish business acceptance, recover missing historical facts, or sign human/Ubuntu acceptance. The adjacent JSON is the exact verifier output for this snapshot.

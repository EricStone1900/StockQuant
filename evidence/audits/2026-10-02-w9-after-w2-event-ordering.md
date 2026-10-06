# W9 gate refresh after FakeBroker event ordering

Date: 2026-10-02 (Asia/Shanghai)

`pnpm baseline:check` passed: 2,701 Markdown links, 222 JSON files, 152 schemas, 39 fixtures, and all 26 version/stage/evidence tests. The complete V2.4 code suite passed after the isolated PostgreSQL startup-race fix. Its four API and four Web TestRuns are recorded in the machine report; all matching CLI checks passed, `activeServicesTouched=false`, and Linux/ARM64 readiness kept trading disabled.

Evidence-reference gates: V2 PASS (12 stage documents, 193 references, 29 manifests, 50 hashes); V3 PASS. V1 is FAIL (9 documents, 78 references, 9 manifests, 88 hashes) because three entries in the historical V1.4 SHA manifest no longer match shared generated contract types updated by later contract work. The historical V1.4 manifest remains unchanged because rewriting it would alter point-in-time evidence. A fresh V1.4 run/export bound to current contracts is the next engineering step.

Business gates remain incomplete: V1 has five unresolved stages/acceptance rows, V2 has five, and V3 has four. This audit does not promote a stage, infer user acceptance, authorize market data, start Paper, or count observations. The project owner confirmed `NO_TRADE` and no market-source authorization; W3/O1/O2 remain unstarted or waiting.

Machine detail: [gate snapshot JSON](2026-10-02-w9-after-w2-event-ordering.json). The V2.4 API/Web evidence is [here](2026-10-02-v24-paper-smoke-67ce2137fd464458a5335a075d00dc6d.json); the P-F05 implementation evidence is [here](2026-10-02-w2-fakebroker-event-ordering-implementation.md).

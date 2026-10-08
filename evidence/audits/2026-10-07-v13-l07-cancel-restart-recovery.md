# V1.3 L07 cancellation-pending recovery across Trade restart

Date: 2026-10-07 (Asia/Shanghai).

The isolated Web flow creates a fixed 200-share CN MANUAL order, buffers cumulative Fill seq=2 (150 shares), applies seq=1 (100 shares), then requests cancellation through the owner/TestRun/Proposal-scoped Platform API. Before restart, the API independently verifies `CANCEL_REQUESTED` and Portfolio reservation `HELD`. After restarting only Trade Execution, the same facts remain. The fixed authoritative seq=3 accepted-cancel result then moves the order to `CANCELLED`, releases the unfilled 50-share reservation, and preserves the 150-share fills.

The final independently read state is FakeBroker/Portfolio cash 8,495.0000 CNY, position 150 shares, reservation `RELEASED` with 1,505.0000 CNY captured, and reconciliation `MATCH`. CLI `--check-only` checks the same TestRun and order. Stage TestRun remains `WAITING`/`NOT_RUN`; business assertions come from the browser/API readback and CLI check.

The focused isolated scenario passed 1/1. Full command `STOCKQUANT_V13_TEST_FEE_CORRECTION_FAILURE_ENABLED=true pnpm test:e2e -- --stage V1.3` passed 21/21. Random project `sq-v13-web-a6994907b2887e39b704` was removed; the harness verified its containers, PostgreSQL volume, network and project images were gone. External market-source and real-broker calls: 0. `pnpm contracts:check` and Platform API typecheck passed. The cancellation request/result operations and their state contracts are in the V1.3 acceptance OpenAPI and checked by `scripts/check-openapi-contract.mjs`.

Successful same-run TestRun: `6a3d15b4-9332-4c1a-8bc1-ec45599811af`; evidence JSON SHA-256 `c2287db62a30fbd9130dd52a2e925cc6b01df20a71b34c1aefeee45b322eb537`. Adjacent manifest records the exact source and evidence snapshot hashes.

This closes the fixed L07 cancel-pending state across one Trade process restart. It does not establish every cancellation race, other crash points, full market-rule coverage, stage runbook completion, or current human acceptance.

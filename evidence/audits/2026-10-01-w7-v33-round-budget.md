# W7 V3.3 fixed per-round budget caps

Date: 2026-10-01 (Asia/Shanghai)

## Change

Extended V3.3 budget enforcement from cumulative TestRun caps to per-experiment, fixed round caps. An experiment declares 1–3 rounds when its budget is reserved. The total is partitioned deterministically (integer remainder goes to earlier rounds). Each model call must supply its explicit one-based `roundIndex`; multi-round calls without it, indices outside the reservation, and reuse of one `modelRunId` in a different round are rejected. RESERVED, DISPATCHED and UNKNOWN calls retain the full amount in their assigned round; SETTLED calls consume verified actual spend; rejected calls consume zero. Unused capacity never transfers across rounds.

PostgreSQL persists the round count and call index, backfills existing allocation rows from experiment records, and applies the per-round cap under the existing serialized stage/experiment reservation transaction. In-memory behavior mirrors PostgreSQL. The owner-scoped TestRun summary now reports allocated, used and UNKNOWN cents for each round. The Web page displays those rows and identifies both TestRun and round enforcement. These controls remain independent of the full V3.3 business workflow, Paper observation and human acceptance.

## Verification

- Research Automation lint/typecheck: PASS; unit tests 171/171.
- Isolated PostgreSQL integration tests: 23/23, including persisted round counts, per-round rejection, UNKNOWN retention, cross-round identity and TestRun summary.
- TestRun budget HTTP smoke: PASS; first experiment reports round 1 used 55/80 cents with 15 cents UNKNOWN; cumulative over-cap rejection and owner-scope checks pass.
- Isolated summary capacity probe: PASS across 100, 1,000, 5,000, 10,000 and 50,000 synthetic experiments; 66,100 synthetic rows total. At 50,000 rows the final offset page measured ~850 ms p95 while keyset measured ~19 ms p95. This is a local hot-cache database microbenchmark, not production capacity.
- Isolated two-round Runner termination/recovery smoke: PASS; SIGKILL, expired lease takeover, fencing token 2, stale publish rejected with HTTP 409; deterministic Fixture work only, zero model-provider calls.
- Platform: 116/116 unit tests and 3/3 integration tests. Web typecheck and Playwright 3/3 PASS.
- Full `pnpm verify:stage -- --stage V3.3 --suite code`: exit 0. The summary reports `TEST_RUN_AND_ROUND_CAP_ENFORCED`; `businessWorkflow=NOT_IMPLEMENTED`, `businessValidation=NOT_RUN`, `humanAcceptance=NOT_RUN`, `paperContinuity=NOT_CHECKED`.

No external Provider, authorized market data source, Paper or LIVE order was used. The user-confirmed NO_TRADE / no-source-authorization boundary remains in force. V3.3 remains `NOT_RUN` pending its business scenarios and actual user acceptance.

# V1.3 governance coordination after revision-service extraction

Date: 2026-10-07 (Asia/Shanghai)

## Delivered

Four Platform application services now handle AUTO_POLICY dispatch, approved MANUAL execution, MANUAL proposal decisions, and append-only proposal revisions. They receive explicit ports; enforce persisted owner/TestRun scope and the injected TestRun clock; and forward version/hash/reason or stable clientOrderId data to the owning Governance/Trade services. Platform remains a coordinator and does not create order, fill, authorization, or ledger facts. The fourth service adds five focused tests for input validation, cross-scope rejection, stale-version conflict, and clock forwarding.

## Final-snapshot verification

- `pnpm --filter @stockquant/platform-api-service exec vitest run tests/unit/v13-proposal-revision.spec.ts`: 5/5 passed; Platform typecheck exit 0.
- `pnpm verify:stage -- --stage V1.3 --suite code`: exit 0. Platform 59 files / 261 tests; Research Automation 38 files / 218 tests; Quant Python Worker 14 tests. Full log: adjacent `2026-10-07-v13-proposal-revision-code-suite.log`.
- `STOCKQUANT_V13_TEST_FEE_CORRECTION_FAILURE_ENABLED=true pnpm test:e2e -- --stage V1.3`: exit 0, Playwright 21/21. This includes MANUAL proposal revision and stale-version conflict from the browser flow, CN/US execution, rejection, AUTO_POLICY boundaries, T+1, UNKNOWN and Trade restart recovery, L07 sequenced events, L08 Outbox retry, and same-TestRun CLI checks. Full log: adjacent `2026-10-07-v13-proposal-revision-e2e.log`.
- Representative TestRuns: normal/revision `41db2130-a99b-4570-8883-35608cc88db4`; recovery/version conflict `725855b1-1200-485e-98f6-619d84cf2102`; US normal `7a8b865f-0b05-461f-8c89-91b13be34953`.
- Isolated project `sq-v13-web-a46db33ba34a8c1d1377` reported exact containers, volume, and network removed. Real broker calls and external-source calls were zero. Human conclusions remain `NOT_RUN`.

## Remaining P3 boundary

Sequenced fill/cancel and session-advance coordination still has controller logic, and all-market rule completeness, full recovery/documentation delivery, and new-scope human acceptance remain open. This slice does not close the P3 parent checkbox or V1 gate.

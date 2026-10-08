# V1.3 governance application-service coordination verification

Date: 2026-10-07 (Asia/Shanghai)

This final-code snapshot extracts three owner-scoped workflows from the Platform HTTP controller into application services: AUTO_POLICY submission, approved MANUAL execution, and MANUAL proposal decisions. All use explicit ports, the persisted TestRun clock, and exact owner/TestRun scope checks. Trade Execution, Governance, Portfolio, FakeBroker orders/fills, and accounting retain ownership of their domain facts. Each service has five focused unit tests.

Verification on this source snapshot:

- `pnpm verify:stage -- --stage V1.3 --suite code`: exit 0. Platform 58 files / 256 tests; Research Automation 38 files / 218 tests; Quant Python Worker 14 tests. Contract, fixture, layer, build, type, and unit gates passed. Full log: adjacent `2026-10-07-v13-governance-application-services-code-suite.log`.
- `STOCKQUANT_V13_TEST_FEE_CORRECTION_FAILURE_ENABLED=true pnpm test:e2e -- --stage V1.3`: exit 0, Playwright 21/21. It includes CN and US MANUAL approval-to-FakeBroker loops, rejection/old-version conflict, AUTO_POLICY normal/HOLD/limit/scope paths, T+1, L06 UNKNOWN lookup and Trade restart, L07 sequenced fills/cancel across restart, L08 fee correction/outbox retry, Web refresh, and same-TestRun CLI checks. Full log: adjacent `2026-10-07-v13-governance-application-services-e2e.log`.
- Representative TestRuns from this final run: CN normal `39b51551-b1b2-4434-b3ec-40fef680dedb`; US normal `8e2366c7-0699-47ff-a326-8558bf76d0f9`; recovery `5f8c2faf-d43a-4b36-ac1e-bcb528b6abe3`; T+1 `5658be2f-9393-4b85-bd95-94c15ab2736c`.
- Isolated Compose project `sq-v13-web-67943a7bb1f2416919d5` reported exact container/volume/network/project cleanup. Real-broker and external-source calls were zero.
- `pnpm docs:check`: 5145 Markdown links, zero failures. `git diff --check`: exit 0.
- Current V1 gate remains `INCOMPLETE`; stage documentation and evidence reference/hash checks pass, but historical TestRun exports, remaining plan packages, Ubuntu evidence, and user acceptance are outstanding. No run was human-signed; new-run conclusions remain `NOT_RUN`.

Scope is limited to the three extracted Platform coordination paths and the current fixed V1.3 matrix. Other coordination (including sequenced fill/cancel and all-market business rules) remains, so P3 and V1 are not complete.

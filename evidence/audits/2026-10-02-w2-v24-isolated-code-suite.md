# W2 V2.4 code suite with disposable PostgreSQL targets

Date: 2026-10-02 (Asia/Shanghai)

## Result

`pnpm verify:stage -- --stage V2.4 --suite code` completed with exit 0 after routing every PostgreSQL-writing integration/smoke command through `scripts/run-isolated-postgres-command.mjs`. This wrapper creates a digest-pinned PostgreSQL container, random loopback port, isolated bridge without masquerading, and per-run roles/databases; it checks the inspected container/network configuration and verifies both resources are removed after the command. The Platform Paper smoke receives an admin URL only for this disposable instance. The Trade V2.4 read-only readiness HTTP check now consumes the wrapper's inspected-container marker.

The suite passed baseline docs/contracts/fixtures/layer checks, workspace builds/lint/typecheck/unit tests, Python checks, Trade/Portfolio/Market Data isolated integration and auth paths, full V2.4 Paper HTTP/Web/CLI normal/rejection/recovery scenarios, Trade readiness HTTP and Linux ARM64 container smoke. The Paper report confirms four API TestRuns (`841e5b69-c0e4-46d5-816f-72ae4ea3a086`, `7f02062f-ed93-4231-820b-b746603eef54`, `846e783a-6fb0-436e-b4f4-a6809e97a96c`, `5ff0fcd1-e4a2-4fcf-8c54-ff37f37a9b04`) and four Web runs (`951980c1-a295-4ebf-bfa2-f1f7110d8f64`, `36a358f9-29b5-4ed3-bb03-801b60c9961d`, `a0a465c5-d6f2-4045-b30f-4139d5923f85`, `0b8b8485-a000-43af-9da3-aa6b9b0b5801`). Report: [Paper smoke JSON](2026-10-02-v24-paper-smoke-132a4559d00e41f78888ea7538322418.json). The separate readiness integration asserted anonymous/wrong-token/forged identity rejection, CN blocked, US rejected, and zero orders/fills/events/outbox before and after.

Individual wrapper results recorded `activeServices: NOT_CONNECTED` and `cleanup: container and network removed and verified`; the suite's Docker readiness smoke reports active services `NOT_CONNECTED`, LIVE disabled, and zero FakeBroker writes. No real provider, broker, market source, or scheduled Paper job was contacted. PostgreSQL test data was disposable and removed.

## Failure retained

The first full-suite attempt passed its baseline, builds, unit suites, Portfolio/Trade/Market Data integrations, and Paper smoke, then the readiness HTTP guard rejected the generic wrapper's marker because it still read the obsolete variable `STOCKQUANT_ISOLATED_TEST_POSTGRES_CONTAINER`. The wrapper cleaned its temporary database/network. The script now checks `STOCKQUANT_ISOLATED_PG_CONTAINER`; the full suite was rerun and exited 0. No test targeted port 5433 in either run.

## Boundary

This is automated offline/FakeBroker code-suite evidence, not human acceptance or real Paper/market observation. W2 remains `IN_PROGRESS`: broker event-sequence arbitration for genuinely concurrent/reordered authoritative fill and cancellation events is still unresolved. W3 and O1 remain `NO_TRADE` with no market-source authorization; the 20-session observation has not started. Version-level acceptance, Ubuntu migration, and human signatures remain open.

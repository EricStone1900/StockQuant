# W2 P-F05 FakeBroker external-order reconciliation

Date: 2026-10-02

## Result

FakeBroker now stores simulated external order observations in an independent table, separate from platform-owned orders, fills, ledger entries and Outbox events. The namespace reconciliation summary joins this independent fact source to local orders by external order ID or client order ID and returns `EXTERNAL_ORDER_MISSING_LOCALLY` with evidence reference and observation time when no local order matches.

The Platform API service is the only authenticated writer. Historical Replay cannot write external observations. Replaying an identical observation is idempotent; reusing the external ID with changed facts returns a conflict. The shared JSON Schema, OpenAPI operation and compatibility rule describe the request and reconciliation response.

The normal/rejection/recovery Paper flow now has a fourth `external-reconciliation` Fixture scenario. It executes the isolated normal Paper chain, adds one external-only FakeBroker order observation and stores a PASS assertion for the exact `EXTERNAL_ORDER_MISSING_LOCALLY` evidence. The formal Web page renders the difference and its evidence reference; the Web-created TestRun is read through CLI `--check-only`.

## Verification

- `pnpm --filter @stockquant/trade-execution-service typecheck` — PASS.
- `pnpm --filter @stockquant/trade-execution-service test:integration:persistence:isolated` — PASS. Disposable PostgreSQL image `sha256:9e9764474d0c70ceff17378a6eca55b00c98d2f4d564be06a8e82f2431b3caa2`; loopback-only binding; container removed; active services `NOT_CONNECTED`.
- `pnpm --filter @stockquant/trade-execution-service test:p5-7` — PASS. TestRun `bdbc2dba-8697-4b96-8f7a-189cca845fdc` verifies HTTP create 201, identical replay 200, changed facts 409, Historical Replay writer 403, and namespace summary discrepancy; temporary test records are cleaned.
- `pnpm verify:stage -- --stage V2.4 --suite code` — PASS after adding the fourth scenario. API TestRun `47a3acfd-bd1d-4c58-9bc5-42b916f228de` and Web TestRun `bf8e8474-ce11-43c8-a9d4-ca2268c0c8a1` both pass same-Run CLI `--check-only`; Chromium verifies the nonzero discrepancy count and details. Full audit: [isolated four-scenario HTTP/Web run](2026-10-02-v24-paper-smoke-912a971fa6374e339157f75bee08b5f6.json), [Web evidence and screenshot links](2026-10-02-v24-paper-web-e2e-bf8e8474-ce11-43c8-a9d4-ca2268c0c8a1.json), and [external discrepancy screenshot](2026-10-02-v24-paper-web-external-reconciliation-bf8e8474-ce11-43c8-a9d4-ca2268c0c8a1.png).
- `pnpm contracts:generate` followed by `pnpm contracts:check` — PASS; compatibility matrix 106 consumer rules and Trade Execution OpenAPI 3 operations.
- Earlier full `pnpm test` invocation with an extra Vitest filter argument failed because it bypassed Vitest's configured loader and attempted to import TypeScript directly under Node. The package's intended `pnpm test` command is rerun separately; this invocation failure is retained here.

## Limits

This validates deterministic simulated FakeBroker evidence only. It does not establish real broker connectivity, actual external order discovery, live trading, real delayed-report protocol semantics, or user sign-off. The P-F05 external-order discrepancy's automated Web/CLI acceptance is complete; W2/V2.4 remain incomplete for other scope and user acceptance.

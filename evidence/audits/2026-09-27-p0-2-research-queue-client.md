# P0.2 Research Automation V3.3 queue client audit

- Date: 2026-09-27 (Asia/Shanghai)
- Scope: Platform-to-Research Automation read clients for offset queue pages, cursor queue pages and page-scoped budget ledger pages.
- Result: OpenAPI-generated typed client, Platform integration and V3.3 code/E2E verification PASS. V3.3 business workflow and human acceptance remain NOT_RUN.

## Implementation

`scripts/generate-research-queue-client.mjs` generates the three Research Automation HTTP methods from the Research Automation-server operations in `platform-v33-research-queue.v1.json`. It injects the Platform service identity and dedicated Platform Bearer, serializes query parameters with `URL`, applies a bounded request timeout, returns generated contract types and preserves downstream HTTP status in a typed error. `contracts:generate` refreshes the client and `contracts:check` checks drift.

Platform's owner-scoped V3.3 queue, cursor and budget endpoints now call this client only after verifying the session and that the requested TestRun belongs to the user and V3.3. Existing cursor and budget response-to-request binding checks remain in place. No dispatch or experiment execution was added.

## Verification

- `pnpm --filter @stockquant/platform-api-service build` exited 0.
- `pnpm --filter @stockquant/platform-api-service test` exited 0: 23 files, 78 tests, including query encoding, identity headers, downstream status preservation and owner-scoped proxy checks.
- `pnpm contracts:check` exited 0; generated Research Queue client has three operations with no drift.
- `pnpm verify:stage -- --stage V3.3 --suite code` exited 0. It included full repository baseline/build/lint/typecheck/unit/integration/contract/adapter/ops checks and V3.3 Playwright 3/3.

## Remaining boundary

The verified behavior is limited to read-only queue/budget paths and readiness TestRun metadata. The suite reports `businessWorkflow=NOT_IMPLEMENTED`, `businessValidation=NOT_RUN`, and `humanAcceptance=NOT_RUN`; it does not prove Runner dispatch, checkpoint recovery, capacity, real RD-Agent/model calls, stage acceptance, or 20-day observation. Other Research Automation HTTP consumers and producer routes still require a full route/client inventory.

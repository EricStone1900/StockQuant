# W1 / V1.3 synthetic Web/API/CLI same-run E2E

Date: 2026-10-06 (Asia/Shanghai)

Result: PASS for the isolated acceptance surface only; V1.3 business-stage acceptance remains incomplete.

Commands: `pnpm test:e2e:v13-isolated` (exit 0) and `pnpm verify:stage -- --stage V1.3 --suite code` (exit 0). The harness created a random Compose project, random host ports, random database passwords, and an isolated PostgreSQL volume. Playwright exercised `normal`, `rejection`, and `recovery` in the Web page, then invoked `verify-stage --stage V1.3 --run <same UUID> --check-only` for each run. Browser assertions passed for all three scenarios. The complete code suite passed baseline governance/contracts/fixtures/layers, workspace build, typecheck and service unit tests. Web TypeScript check, `node --check scripts/test-v13-web-e2e-isolated.mjs`, and `git diff --check` also passed.

TestRun IDs: normal `89759582-5c4d-4e55-b466-97e88dbe8c74`; rejection `7c25bd30-91b9-419a-8928-f89768008485`; recovery `75e9d9e1-f90f-476a-92c2-d4fc1c8e71e2`.

Boundary: the current `V13TradingEngine` directly synthesizes order, fill, risk and recovery evidence. This E2E verifies the acceptance page, persisted TestRun and same-run CLI read only. It does not execute Decision Governance, Trade Execution, Portfolio ledger or FakeBroker and therefore does not establish the V1.3 trading/business acceptance conditions. The isolated stack used the existing V1.1 Platform/PostgreSQL harness; its random containers, volume and network were removed and then independently confirmed absent. External market/provider calls: 0. Broker calls: 0. Active application services were not targeted.

The development task remains open: implement and independently test the real isolated trading vertical slice, replace the synthetic evidence engine, complete the V1.3 manual and applicable runbook entries, and obtain actual user acceptance. This audit does not change any human sign-off or stage/version gate.

Plan reconciliation: the V1.3 §2 implementation checkboxes for governance, FakeBroker integration, order/recovery behavior and server-side execution constraints were previously checked, but the current code and E2E do not prove those claims. They have been returned to unchecked; the old dated human sign-off is preserved as historical evidence.

Machine details and checksums: [JSON result](./2026-10-06-w1-v13-synthetic-web-e2e.json), [Web E2E log](./2026-10-06-w1-v13-synthetic-web-e2e.log), [full code-suite log](./2026-10-06-w1-v13-code-suite.log), [SHA-256 manifest](./2026-10-06-w1-v13-synthetic-web-e2e.sha256).

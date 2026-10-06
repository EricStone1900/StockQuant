# V3.3 per-round budget Fixture HTTP/PostgreSQL verification

Date: 2026-10-06 (Asia/Shanghai)

## Result

The Research Automation Fixture gateway and PostgreSQL ledger now have a single HTTP smoke case for the frozen two-round normal scenario. It creates an Experiment bound to a separate TestRun with an 80-cent reservation and two 40-cent round caps, calls the deterministic Fixture gateway once for each explicit round, settles each call at 23 cents, then settles the Experiment at 46 cents.

The owner-scoped TestRun budget summary returned round 1 `allocated=40/used=23/unknown=0` and round 2 `allocated=40/used=23/unknown=0`; total Experiment settlement was 46 cents. Calls report `modelCalls=NO_EXTERNAL_CALL`; external model calls and Paper calls were zero. The smoke ran in a disposable PostgreSQL database/container and reported `activeServices=NOT_CONNECTED`; its exact rows, container and network were cleaned up.

Successful identifiers: TestRun `ef6f8e2c-8e47-4ba6-8a5c-d327e26dc4ad`; Experiment `f7835b4e-42a0-4b27-b26d-5bcc6cbbd05a`.

## Verification

- Isolated HTTP/PostgreSQL smoke: `node scripts/run-isolated-postgres-command.mjs --url-env RESEARCH_AUTOMATION_DATABASE_URL:research_automation_test:research_automation_test -- pnpm --filter @stockquant/research-automation-service v33:test-run-budget-summary-http-smoke` — exit 0.
- Full V3.3 code suite: `pnpm verify:stage -- --stage V3.3 --suite code` — exit 0; Research Automation unit 216/216, PostgreSQL integration 29/29, Platform unit 186/186, PostgreSQL integration 8/8, Web E2E 3/3. The suite also passed budget/queue capacity probes and the separate Runner Host checkpoint SIGKILL/takeover smoke.
- `pnpm baseline:check` — exit 0; contracts 161 schemas / 41 fixture instances, documentation links 4,001/4,001, governance tests 30/30.
- `git diff --check` and the content SHA-256 manifest — pass.

## Retained failures and limits

Four initial smoke attempts failed for sandbox Docker access, a generated-type `$defs` issue, a test-fixture ID count, and an obsolete result-field assertion. Details are recorded in [`2026-10-06-w7-v33-round-budget-http-smoke-failures.md`](./2026-10-06-w7-v33-round-budget-http-smoke-failures.md).

This verifies persisted per-round model-call caps and fixture settlements, plus pre-existing independent per-round Runner Job identity tests. It does not implement the formal V3.3 TestRun orchestration, submit these Runner Jobs as a single workflow, exercise the Web/CLI against this same business TestRun, verify real model/provider invoices, or prove Paper continuity. The full suite still reports `businessWorkflow=NOT_IMPLEMENTED`, `paperContinuity=NOT_CHECKED`, `businessValidation=NOT_RUN`, and `humanAcceptance=NOT_RUN`; V3.3 and the delivery plan remain open.

See [`2026-10-06-w7-v33-round-budget-http-smoke.sha256`](./2026-10-06-w7-v33-round-budget-http-smoke.sha256) for source, contract, documentation and raw-suite hashes.

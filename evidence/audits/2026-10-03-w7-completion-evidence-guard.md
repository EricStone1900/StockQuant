# W7 V3.3 completion evidence guard

The Platform repository now rejects a `COMPLETED` transition unless all four required stage assertions pass (exact V3.1 acceptance, exact V3.2 version, Paper continuity, and V3.3 executor), business workflow evidence is complete, the stage and round budgets are enforced, persisted Experiment and Runner Job identities exist, and all expected rounds (1–3) finished. The rejection occurs within the locked PostgreSQL transaction.

Validation: Platform build PASS; Platform unit 169/169 PASS; isolated PostgreSQL integration 4 files / 6 tests PASS, including rejection of incomplete completion evidence while the row remains `RUNNING`. Source hashes: [manifest](./2026-10-03-w7-completion-evidence-guard.sources.sha256). The full formal `pnpm verify:stage -- --stage V3.3 --suite code` completed with exit 0: Research Automation 203 unit / 28 integration; Platform 169 unit / 6 integration; cursor/budget capacity probe; two-round deterministic Runner SIGKILL takeover; Web E2E 3/3. The machine summary still reports `businessWorkflow=NOT_IMPLEMENTED`, `paperContinuity=NOT_CHECKED`, `businessValidation=NOT_RUN` and `humanAcceptance=NOT_RUN`. See the [complete suite log](./2026-10-03-w7-completion-evidence-guard-full-suite.log).

This is an anti-false-completion guard, not the V3.3 Experiment/Runner workflow. Dispatch, business rounds, Paper continuity, Provider invoice reconciliation, Ubuntu and human acceptance remain unverified. NO_TRADE and no market-source authorization remain in force; no external calls were made.


The initial baseline failure was preserved and diagnosed as a stale historical V2.3 source-hash link, then corrected without rewriting its historical manifest; see [failure diagnosis](./2026-10-03-w7-stale-v23-manifest-suite-failure.md).

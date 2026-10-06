# V1.4 code-suite rerun

Date: 2026-10-02 (Asia/Shanghai)

## Result

`pnpm verify:stage -- --stage V1.4 --suite code` exited 0 on the current workspace. The run included `baseline:check` (2613 Markdown links, 152 schemas, 37 fixtures), workspace build/typecheck/lint and unit suites across the configured services. The Qlib Worker Python boundary unit suite passed 13/13 with local loopback permission; Quant Research passed 18 files/88 tests, Platform API 46 files/162 tests, Research Automation 35 files/196 tests, Market Data 17 files/70 tests, Trade Execution 13 files/62 tests, Historical Replay 9 files/25 tests, Governance 6 files/22 tests, and Portfolio Risk 3 files/5 tests.

## Scope and limits

This code suite did not create a V1.4 business TestRun, run the stage's full browser/API integration harness, or execute a Qlib-versus-transaction-engine common-case comparison of rules and costs. The Qlib Worker unit suite validates its local request boundary, not an actual Qlib fit. No market-data, model-provider, Paper, broker, or active-service calls were made. V1.4 remains partially implemented; its restriction/fee synthetic cases and existing TestRun bundles remain separate evidence, and human acceptance/Ubuntu gates remain open.

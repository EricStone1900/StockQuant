# V1.4 synthetic corporate-actions accounting slice — 2026-10-07

## Result

The fixed synthetic corporate-actions scenario passed through the isolated V1.4 Quant, PostgreSQL, Platform API, formal Web, and same-`testRunId` CLI path. The scenario verifies RAW-price accounting for a 2:1 split, a cash dividend receivable and payment, duplicate event delivery, and hand-calculated NAV. This is an engineering scenario only; it does not establish real corporate-action data quality, exchange-wide rules, complete tax/settlement behavior, Qlib/Paper parity, or V1.4 human acceptance.

## Frozen inputs and identities

- Fixture version: `v1.4-corporate-actions-1`; provenance: synthetic, `SIMULATION_ONLY`.
- Corporate-action input SHA-256: `ff33b0f3eb1214a1670ead8337988db13fa60c823ba001cd2e6d841c109f342f`.
- RAW daily-bar input SHA-256: `826436b30245e6a9d4250274a29012b216edf474fb94b444cd70411704f9a0e6`.
- Manifest composite input SHA-256: `914f703cd19b7e3f305b59c3353cb8356f075c820c1806cdcee97f6b09f595dc`.
- Source identity recorded by the Harness: `sha256:38e5b8a65aa913eb06be1a4ec046d819d8d7dc0a0ad2b42752f85a038d447357`.
- API/CLI corporate-actions run: `1ba33e5f-162f-4e09-adac-444b7d441b3a` (CLI run).
- Web corporate-actions run, verified again by CLI: `0ceae8a1-c216-4c20-9d51-e65ab40dd23a`.

## Assertions and evidence

Five RAW closes for `600000.SH` span 2024-01-02 through 2024-01-08. With initial cash 200,000 cents and 100 shares bought at 1,000 cents, the 2:1 split produces 200 shares at a 500-cent RAW close. The 10-cent/share dividend creates a 2,000-cent receivable on ex-date; on payment date it moves into cash. At each date, hand-calculated NAV remains exactly 200,000 cents. The duplicate delivery with the same `actionId` is ignored once. The Web report showed all three domain assertions PASS, and the same run's CLI check-only passed. Quant persisted the BacktestRun and Fixture manifest/hash binding in the isolated PostgreSQL database.

The complete isolated Harness command was `pnpm test:e2e -- --stage V1.4`. Playwright passed 5/5; the Harness checked 13 BacktestRun rows, 13 Fixture manifests and 13 result-hash matches, including the API, CLI and seven browser-created runs. It removed and verified the randomly named project's containers, volume and network. No external market or broker calls occurred. The current-tree code gate `pnpm verify:stage -- --stage V1.4 --suite code` also exited 0 on 2026-10-07, including contract/schema and Fixture validation, all workspace builds/typechecks/tests and Qlib Worker Python 14/14.

## Preserved debugging history

The run exposed and fixed four issues before final PASS: the CLI stage allowlist omitted the scenario; Quant PostgreSQL's scenario constraint omitted it; the browser assertion selected an evidence-only panel instead of the assertion table; and a duplicate log line confused Harness run counting. The isolated report retains its execution data at `evidence/audits/2026-10-02-w1-v14-quant-configurable-web-c306911ef752fc24501d.json` with adjacent Markdown and SHA file. Earlier failed attempts remain in the generated audit history and are not rewritten as passes.

## Remaining V1.4 and V1 gates

The corporate-actions slice does not finish V1.4. Exchange-wide A-share/US rules, complete corporate-action semantics and real data, Qlib/Paper execution-rule parity, the full rejection/recovery matrix, executable persistent Web handoff, Ubuntu evidence, and user acceptance remain open. No human acceptance was signed. V1.4 remains `PARTIALLY_IMPLEMENTED`; V1 remains blocked from release by its open stage and historical evidence gates.

# V1.2 market-data-4 full code-suite verification — 2026-10-06

Status: full V1.2 automated code suite PASS; P2 remains incomplete.

`pnpm verify:stage -- --stage V1.2 --suite code` exited 0 after the v4 manifest fix. The suite covered the root baseline (Markdown/contracts/fixtures/layer rules), build, lint, typecheck, service unit tests, isolated PostgreSQL integrations, service-auth HTTP, Python adapter checks, Market Data artifact-task restart smoke, locked Qlib worker fit smoke and V1.2 browser E2E. The added fixture check resolved and validated manifest schema path, hash list, 10 CN/3 US securities, 60 sessions, 774 bars, quality cases, 20-session feature/next-session label windows, and 180/142/138 train/validation/test rows.

The Web harness created normal `e65d46aa-0232-4ede-b493-70d9aad8f108`, rejection `510ae217-e059-40d4-b317-ce7aabd69c30`, and recovery `d8769ba8-05f0-4d22-b8e1-62ac109aab85`; each exact TestRun ID was checked by the same-run CLI. Normal remains `WAITING` because the Qlib factor output has not been wired to this dataset. Rejection and recovery-probe automated checks passed. Harness URL: `http://127.0.0.1:53226/`. Isolated Compose project `sq-v12-e2e-400e0e98723c648013be` and its containers, volume and network were removed.

Previous failures are retained: the authoring fixture’s first version omitted its intended missing bar; a later nested manifest used an invalid relative schema path; contract validation then caught the retired manifests’ same path. Candidate versions were retired, original bar inputs preserved, and v4 became the corrected frozen version. Details are linked from the V1.2 stage record.

This pass does not prove actual exchange calendars, real input data, production capacity, Qlib strategy ranking from the fixture, model profitability, human acceptance, or V1 version completion. No external data/model or broker calls occurred; no active database or volume was touched.

Full output: [suite log](2026-10-06-v1-p2-v12-market-data-4-suite-pass.log), SHA-256 `44e7dd0e9ea9ac229bba9d5093850a02768c75f2f1dc76751d65ed3fae10f08b`.

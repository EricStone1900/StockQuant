# W1 V1.2 Web TestRun and same-run CLI verification

Date: 2026-10-06 (Asia/Shanghai)

The formal V1.2 page lets an operator select normal, future-data rejection, or Qlib probe availability, create a persistent Platform TestRun, poll its owner-scoped result, and inspect assertions/evidence. The recovery-probe label explicitly says it does not execute fault recovery.

The random-project Compose harness ran Platform, Market Data, Quant Research, the Qlib Worker, PostgreSQL, Vite, and Chromium with collection and LIVE disabled. The controlled full `pnpm verify:stage -- --stage V1.2 --suite code` run exited 0 and its Playwright case created three independent Web TestRuns: normal `7e7b0687-c73a-4717-8190-cdc8724c39a8`, rejection `0ae8f719-0f2b-4941-9b6a-9a287c7373b6`, and recovery-probe `cc5a3650-ab50-4dd6-bf37-2e2e358a911e`. CLI `--check-only` verified each same UUID. The complete suite log is [here](./2026-10-06-w1-v12-full-code-suite-three-scenarios.log); the machine E2E record and input manifest are [here](./2026-10-06-w1-v12-isolated-web-e2e.json) and [here](./2026-10-06-w1-v12-isolated-web-e2e.sha256). All disposable containers, database volume, network, and project images were removed and verified.

Web typecheck passed. The recovery-probe checks only that Qlib reports READY; no fault was injected, and no cancellation, atomic Artifact publication, or recovery workflow was verified. This engineering regression does not constitute real-market Qlib research, human acceptance of the new scope, Ubuntu validation, or V1 version acceptance. Earlier single-scenario reports remain historical execution records.

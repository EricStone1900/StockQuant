# V1.2 three-scenario Web/API/CLI verification

Date: 2026-10-06 (Asia/Shanghai). Result: PASS for the isolated engineering suite.

The controlled full `pnpm verify:stage -- --stage V1.2 --suite code` run exited 0. Its Playwright case created three independent Web TestRuns: normal `7e7b0687-c73a-4717-8190-cdc8724c39a8`, future-data rejection `0ae8f719-0f2b-4941-9b6a-9a287c7373b6`, and Qlib probe availability `cc5a3650-ab50-4dd6-bf37-2e2e358a911e`; each same UUID passed the CLI `--check-only` check. The full-suite output is in [the complete code-suite log](./2026-10-06-w1-v12-full-code-suite-three-scenarios.log).

A subsequent focused isolated E2E rerun also passed and generated the harness-native machine record: normal `e2764994-a64f-47d8-b559-6f5c207117fc`, rejection `e55aef14-888e-4faa-8f30-46bd5ffe67a6`, and recovery-probe `aaf42e58-79dd-4269-81ed-4f9cd6ab2cad`. See [machine report](./2026-10-06-w1-v12-isolated-web-e2e.json) and [its input manifest](./2026-10-06-w1-v12-isolated-web-e2e.sha256). Web typecheck passed.

Both isolated harness runs disabled collection and LIVE, recorded zero market-source/model/broker calls, and verified removal of their randomly named containers, database volumes, networks, and images. The recovery-probe only checks that Qlib reports READY. It injects no failure and does not verify cancellation, Artifact atomicity, or workflow recovery. This result does not close V1.2 human acceptance, Ubuntu validation, real-market research requirements, or the V1 version gate.

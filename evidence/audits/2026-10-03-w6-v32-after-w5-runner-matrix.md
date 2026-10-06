# W6 V3.2 current-worktree offline code/readiness suite — 2026-10-03

The full `pnpm verify:stage -- --stage V3.2 --suite code` suite exited 0. Quant Research passed 91 TypeScript and 14 Python unit tests; the synthetic cross-runtime independent evaluator matched 70 decisions. Governance passed 22 unit tests; Research Automation passed 203; Platform passed 169 unit tests and 6 integration tests; Web passed build, typecheck and 1 test. Promotion-preparation HTTP checks verified synthetic-gate-only submission, stable replay, restart-safe unknown outcome, and no Registry mutation.

A linux/amd64 internal-only disposable PostgreSQL container verified a persisted READINESS_ONLY TestRun (`0823b385-811b-4b34-8e22-c39dac56e36b`) survives restart and enforces owner access. It remains `WAITING` with `businessValidation=NOT_RUN`. Active services, active Registry and Paper were untouched; external Provider and market-data calls were zero. Candidate source remained FIXTURE; candidate execution, Qlib execution, business and human acceptance were NOT_RUN.

This completes a W6 engineering/readiness slice only. W5 real V3.1 acceptance is still unresolved, and no real candidate was independently validated or approved for consumption.

- Full output: [2026-10-03-w6-v32-after-w5-runner-matrix.log](./2026-10-03-w6-v32-after-w5-runner-matrix.log), SHA-256 `d6fd691e3b5e1b28057f703d2c7716b5c86f0551c5235afb4f58ec7f49be2132`.
- Machine report: [2026-10-03-w6-v32-after-w5-runner-matrix.json](./2026-10-03-w6-v32-after-w5-runner-matrix.json).
- Source hash manifest: [2026-10-03-w6-v32-after-w5-runner-matrix.sources.sha256](./2026-10-03-w6-v32-after-w5-runner-matrix.sources.sha256).

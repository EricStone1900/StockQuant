# W4 / V2.3 Qlib Fixture Web-to-Artifact rerun

Date: 2026-10-02 (Asia/Shanghai)

The isolated `pnpm --filter @stockquant/platform-api-service v23:qlib-fixture-testrun-smoke` command exited 0. The Web scenario traversed Platform, Quant Research and the pinned Qlib Worker, trained/predicted with Qlib 0.9.6 and LightGBM 4.7.0, and produced 24 finite predictions and a durable owner-scoped model Artifact. Owner read returned 200; a foreign owner received 403. CLI same-run `--check-only` exited 0 without mutation. Evidence export contains the TestRun and Artifact with a verified manifest.

- TestRun: `41b4e5b2-e865-4a5a-8cc2-acd11b2aedbe`.
- Artifact SHA-256: `24864d22e4016e1419382e380aec504f02607004262696c92b76451cc1dbb6a8`.
- Export manifest SHA-256: `d1bf43e322162055f4bc71f75b12f0ecc493322647716507849d074ef9402cea`.
- Input mode: deterministic synthetic `FIXTURE`; external sources: 0; broker: `FAKE`.
- Runtime: linux/amd64 Qlib container emulated on Apple Silicon.
- Cleanup: isolated PostgreSQL databases/container/network, Qlib container/image and shared temporary content directory were removed.

`independentValidation=NOT_RUN`. This run is engineering and synthetic scenario evidence only. It does not establish real-market input authorization, PIT correctness, profitability, independent model validation, Ubuntu behavior, or new human acceptance. V2.3 remains `PARTIALLY_IMPLEMENTED`.

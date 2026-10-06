# W4 V2.3 TestRun identity after V3.3 state-history support

`pnpm verify:stage -- --stage V2.3 --suite code` completed with exit 0. TestRun `8e2dd579-f780-4db1-b867-94b082457579` bound codeVersion `sha256:0971be7a5e6f5b1594447789d273785e3be275b66d6286ca63d84b07e9ff6ee4` over 165 workspace inputs; an independent recomputation matched exactly. The added V3.3 state-transition application and Platform unit test are included because the shared Platform source tree is fingerprinted.

The locked Qlib 0.9.6 / LightGBM 4.7.0 fixture fit/predict produced 24 finite predictions with temporal validation PASS. Owner Artifact read returned 200 and foreign-owner read 403; same-run CLI check-only exited 0 with no mutation, and the run-local two-entry evidence export manifest verified.

This remains synthetic `FIXTURE` data on an Apple Silicon host emulating `linux/amd64`. Independent validation, real market/PIT research, Provider calls, Paper continuity, Ubuntu, and user acceptance remain unverified. The [full suite log](./2026-10-03-w4-v23-stage-state-history.log), [machine report](./2026-10-03-w4-v23-stage-state-history.json), [165-input SHA-256 list](./2026-10-03-w4-v23-stage-state-history.sources.sha256), and [audit SHA-256 manifest](./2026-10-03-w4-v23-stage-state-history.sha256) retain the exact evidence boundary.

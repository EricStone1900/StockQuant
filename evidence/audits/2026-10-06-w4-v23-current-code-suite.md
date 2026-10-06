# W4 V2.3 current-worktree code and Qlib Fixture regression

Date: 2026-10-06 (Asia/Shanghai)

## Result

`pnpm verify:stage -- --stage V2.3 --suite code` passed with wrapper exit code 0. The isolated Qlib component smoke executed the locked Qlib 0.9.6 / LightGBM 4.7.0 `LGBModel.fit/predict` path in a Linux/amd64 worker emulated on Apple Silicon, using 120 frozen synthetic rows (72 train, 24 validation, 24 test) and producing 24 finite predictions. Temporal checks and repeat model/prediction hashes passed.

The full suite created TestRun `da12c960-92fe-4a04-8678-4167a92ecfb6`, binding 170 workspace inputs to codeVersion `sha256:bef5d16a14e896cf592de7b49e43eb79bf68afd2dd1e2e52840aa4af37f8d095`. The Qlib Artifact persisted through shared immutable storage; owner read returned 200 and foreign read 403. Same-Run CLI `--check-only` exited 0 with no mutation. Evidence export manifest hash was `11e532e5140c7c5578794e942dde22721a9109154386d85ad9f49e21d094fcfc`; its two-entry manifest verifies. All temporary databases, networks, containers, Qlib image and content directory were removed. External market sources and brokers were not called.

## Limits

Data mode is FIXTURE and model validation is `NOT_RUN`. This does not authorize the local BaoStock archive, prove real-market PIT or independent model validation, establish profitability, or satisfy Ubuntu, Paper observation or human acceptance. V2.3 remains formally incomplete.

The complete current-worktree transcript is [here](./2026-10-06-w4-v23-current-code-suite.log). Structured evidence is [the TestRun](../local/V2.3/da12c960-92fe-4a04-8678-4167a92ecfb6/evidence.json), with [its manifest](../local/V2.3/da12c960-92fe-4a04-8678-4167a92ecfb6/manifest.sha256). The TestRun codeVersion covers the 170 listed workspace inputs.

# V3.2 fixed-fixture reference recomputation

Date: 2026-09-27 (Asia/Shanghai)

## Implementation

Quant Research now has a deterministic reference evaluator for the frozen `v3.2-independent-validation-1` fixture. It independently recalculates the allowlisted 5/20 SMA signal from the raw 180-session series per security, observes the close `availableAt` cutoff, enters at the next session open, computes test-window trades and marked return, applies 5 bps commission plus 5 bps slippage on each side, and checks each order against the retrospective 1% realized-volume participation bound. It does not execute the candidate-provided source; the rules gate requires its source string to exactly match the frozen fixture reference and rejects algorithm/parameter drift. The output is run through the canonical PromotionRequest parser and independent-validation report builder. It is in-memory only.

The report's UUIDs come from the static contract Fixture and are explicitly marked `STATIC_CONTRACT_FIXTURE_IDS_NOT_PERSISTED`. The output file is [the deterministic recomputation report](../v3.2/2026-09-27-independent-fixture-recompute.json).

## Verification

- 6 Quant Research unit-test files / 33 tests pass, including future-available data rejection, invalid algorithm/source/parameters, split misalignment, capacity overflow, invalid volume/price and invalid capacity configuration.
- Quant Worker HTTP boundary tests: 3/3 pass; Quant build passes.
- `pnpm --filter @stockquant/quant-research-service v32:fixture-recompute` emits a report with PIT, OUT_OF_SAMPLE, COST, RULES and CAPACITY all PASS, disposition `ELIGIBLE_FOR_REVIEW`, and distinct `sourceMode=FIXTURE`.
- `pnpm verify:stage -- --stage V3.2 --suite code` exits 0 after the command was added to the standard suite. Overall stage result remains code `PASS`, business validation `NOT_RUN`, Registry mutation `NOT_PERFORMED`, human acceptance `NOT_RUN`.

## Boundary

The TypeScript calculation runs in the Quant Research Node process. The Python cross-check is now executed in a constrained container based on the cached Qlib Worker image; it does not invoke Qlib APIs or execute candidate code. The fixture is mounted read-only, networking is disabled, and the container runs non-root with a read-only root filesystem, dropped capabilities, no-new-privileges, 256 MiB/1 CPU/64 PID bounds, and `--pull never`; the image is resolved to an immutable ID and required to be `linux/amd64`. On this Apple Silicon host that platform is emulated, not native Ubuntu evidence.

The workflow still does not fetch persisted owner-bound experiment/Artifact records, compare against a persisted source-experiment metrics artifact, or implement real-candidate recomputation. The 2-security synthetic sample cannot establish profitability, market fidelity or production capacity. The report is not a persisted V3.2 TestRun and does not authorize approval, activation or Paper orders. Real independent validation, actual Qlib model execution and human acceptance remain `NOT_RUN`; Registry mutation remains `NOT_PERFORMED`.

## 2026-09-27 input-boundary and cross-runtime hardening

The reference parser rejects non-positive OHLC prices and volume, and the capacity gate requires a finite participation limit in `(0, 1]`. A second, separately implemented Python standard-library evaluator now recomputes the frozen fixture and the command fails unless decision count, full trades, fees and returns agree with the TypeScript implementation. The same Python evaluator also ran against a read-only fixture mount in the cached Linux/AMD64 Qlib worker image (`qlib==0.9.6`); no service or database was used. Quant tests pass 33/33, Python tests pass 6/6 (3 crosscheck + 3 Worker HTTP boundary), and the complete V3.2 code suite exits 0. The refreshed report SHA-256 is `5b71182752ad0717b5cee8a31eeb23525ff22f9ee7f803c6c31d2dde67105f1e`.

This is independent cross-runtime arithmetic, not Qlib evaluation: the Python code does not call Qlib APIs or execute candidate code. `qlibExecution` remains `NOT_RUN`; isolated Qlib model/backtest recomputation, persisted owner-bound report, V3.2 Web/TestRun flow, business validation and human acceptance remain unverified. Registry mutation remains `NOT_PERFORMED`.

## 2026-09-27 container enforcement and code/audit correction

Source review found that the then-current `v32:fixture-recompute` command actually used host `python3`, despite the earlier evidence text saying its standard command used a read-only container mount. The production command now resolves `stockquant-v12-qlib-worker:latest` to an immutable image ID and refuses any non-`linux/amd64` image; it runs the standard-library cross-check with `docker run --pull never --network none --read-only`, read-only script/fixture mounts, UID 65532, no extra capabilities, no-new-privileges, and 256 MiB/1 CPU/64 PID limits. No host-Python fallback exists.

Verified image: `sha256:4135861adbf3617ae1b2e578caf7d2eb3f3835e0f5f42cf257b7a0d7b6991094`, platform `linux/amd64`. Host architecture is `arm64`, so this is emulated Linux/AMD64 behavior only. A fresh report is preserved at [container-backed recomputation output](../v3.2/2026-09-27-independent-fixture-container-recompute.json), SHA-256 `0c319afed9e970497673aa006bfabb144112f53d074cc6e33916bc7bf4eda33c`. It records 70 decisions, complete trade match, return tolerance `1e-6`, no Qlib execution, no persistence, no candidate code execution, no Registry mutation, and no human acceptance. The full `pnpm verify:stage -- --stage V3.2 --suite code` exits 0 after this correction.

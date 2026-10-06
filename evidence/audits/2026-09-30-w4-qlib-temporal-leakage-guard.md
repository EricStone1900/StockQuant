# W4 Qlib temporal leakage guard

Date: 2026-09-30 (Asia/Shanghai)

## Implementation

The explicit-FIXTURE `qlib-fit-fixture-v1` request now accepts optional row-aligned `temporalMetadata`: `decisionAt`, `featureAvailableAt`, and `labelAvailableAt`. The Worker requires timezone-qualified ISO-8601 timestamps, strictly increasing decision times, features available no later than their decision, and labels not available before their own decision. Every training label must be available strictly before the first validation decision; every validation label must be available strictly before the first test decision. Equal-time boundary labels fail closed because event ordering is not otherwise established. The Qlib result reports `temporalValidation=PASS` only when these checks ran successfully; without metadata it reports `NOT_RUN`. `modelValidation` remains `NOT_RUN` and the route still accepts only synthetic FIXTURE inputs.

The request/result JSON Schemas and generated TypeScript/Python types were updated. The schema remains additive and backward-compatible: existing Fixture callers may omit the optional metadata, but then receive no temporal-validation claim.

## Verification

- Python temporal validator tests: 5/5 PASS, covering valid metadata, future features, label leakage across split boundaries (including exact-time equality), nonmonotonic decisions, and timestamps without timezone offsets.
- `pnpm contracts:check`: PASS (114 schemas, 36 Fixtures, compatibility matrix and generated types checked).
- `pnpm --filter @stockquant/quant-research-service typecheck`: PASS.
- `pnpm verify:stage -- --stage V2.3 --suite code`: PASS, exit 0 on the final implementation. The locked Qlib 0.9.6/LightGBM 4.7.0 `linux/amd64` container returned `temporalValidation=PASS` for the deterministic 120-row Fixture, produced 24 finite test predictions and identical model/prediction hashes across two fits, and rejected overlapping splits with HTTP 422. Market Data integration (22 tests), service-auth isolated HTTP/PostgreSQL checks and the full V2.3 build/lint/typecheck/unit/code checks passed. The temporary image was removed.

## Limits

This is deterministic synthetic-input engineering evidence. It does not establish a real licensed dataset, historical universe/survivorship correctness, walk-forward strategy validity, persistent research TestRun/Artifact behavior, independent model validation, profitability, Ubuntu execution, or human acceptance. Real-source use remains unauthorized and `NO_TRADE` remains active.

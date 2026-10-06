# W1 / V1.4 sell slippage input guard

Date: 2026-10-02 (Asia/Shanghai)

## Change

When a sell order is configured, the engine now rejects a 10,000-bps adverse-slippage policy during construction. At that boundary the sell-price formula returns zero cents; rejecting the policy up front prevents a delayed simulation exception and keeps the reported input-validation contract consistent.

## Verification

- Focused V1.4 domain tests: 11/11 PASS, including the 10,000-bps sell rejection.
- Quant Research TypeScript typecheck: PASS.
- Quant Research Python Worker suite: 13/13 PASS under the controlled local run; the default sandbox attempt could not bind loopback and failed with EPERM.
- `pnpm verify:stage -- --stage V1.4 --suite code`: PASS, exit 0 under the controlled local run. This includes repository quality gates and service tests.
- No market-data source, active service, Paper, FakeBroker execution, or human acceptance was invoked.

This guard only rejects an invalid sell policy. It does not add market fees, exchange calendar, suspensions/price limits, corporate actions, Qlib parity, real-data validation, or user acceptance. V1.4 and W1 remain incomplete.

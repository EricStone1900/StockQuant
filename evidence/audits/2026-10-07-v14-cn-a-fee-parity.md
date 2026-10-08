# V1.4 CN_A fee parity verification

Date: 2026-10-07 (Asia/Shanghai). The Quant daily backtest and FakeBroker now use the same explicitly versioned CN_A fee schedule for parity runs. The schedule is included in the FakeBroker request fingerprint so an idempotency key cannot silently replay a different fee policy. Unsupported market/currency or dates outside the selected schedule fail closed.

- Quant parity unit checks: 6/6 passed, including BUY/SELL at 0 and 55 bps.
- FakeBroker fee/scope unit checks: 11/11 passed; Trade typecheck passed.
- Disposable PostgreSQL parity smoke: passed. It compared persisted order, Fill quantity/price/fee/session, rejection reason, and Fill Outbox for BUY, SELL, partial BUY, and zero-volume rejection; 4 orders / 3 fills / 3 Fill Outbox rows. The database container/network were removed and verified.
- Full pnpm verify:stage -- --stage V1.4 --suite code: exit 0.

Raw isolated PostgreSQL output, including the random binding and cleanup result: [run log](./2026-10-07-v14-cn-a-fee-parity.log).

The schedule is a frozen software Fixture and does not establish complete exchange rules, all historical fees, actual brokerage charges, user acceptance, or Ubuntu acceptance. Exact source hashes and machine fields are in the adjacent JSON.

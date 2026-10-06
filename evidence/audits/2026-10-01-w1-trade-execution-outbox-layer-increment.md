# W1 Trade Execution outbox-layer increment

Date: 2026-10-01 (Asia/Shanghai)

Moved the HTTP server composition root to `src/bootstrap/main.ts` while retaining `src/main.ts` as the package entrypoint. Extracted FakeBroker fill-outbox delivery into `src/application/fill-outbox-delivery.ts`; it depends on `FakeBrokerOutboxPort` and `PortfolioFillWriter` interfaces and preserves claim, Portfolio fill/reservation posting, acknowledgement, and retry-on-failure order. The Postgres FakeBroker adapter implements the outbox port.

Validation: Trade Execution typecheck and 13 unit files / 58 tests PASS; `pnpm service:layers -- --service trade-execution-service` PASS. The full `pnpm verify:stage -- --stage V2.4 --suite code` completed with exit 0, including baseline, full-workspace build/lint/typecheck/unit, isolated persistence and identity checks, V2.4 API/Web/CLI FakeBroker recovery flows and linux/arm64 readiness image smoke. The temporary image reports `activeServices=NOT_CONNECTED`; no live provider, model, broker, or active service call was made.

This is an initial application-use-case extraction, not a claim that every HTTP handler has left bootstrap or that Trade Execution S0, V2.4 human acceptance, source authorization, Ubuntu deployment, or O2 observation is complete. Historical signatures and stage acceptance remain unchanged.

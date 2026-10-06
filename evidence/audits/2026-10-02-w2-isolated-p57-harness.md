# W2 isolated Trade → Portfolio persistence and cancellation verification

Date: 2026-10-02 (Asia/Shanghai)

## Change

`test:p5-7` now creates a fresh digest-pinned PostgreSQL container with two disposable test databases, publishes only a random `127.0.0.1` port, and uses a dedicated bridge with masquerading disabled. Runtime Docker inspection verifies the image digest, network membership/options, read-only root, tmpfs data directory, resource bounds, exact port binding, and absence of Compose ownership. The smoke itself refuses the shared `stockquant-v12` PostgreSQL port 5433. The generic Trade integration command now calls isolated persistence and readiness runners instead of direct scripts against shared Compose databases.

## Verification

- Trade Execution tests: 13 Vitest files / 62 tests and 5 PostgreSQL target guard tests passed.
- Trade Execution lint/typecheck passed.
- `pnpm --filter @stockquant/trade-execution-service test:integration:persistence:isolated` passed against disposable PostgreSQL image `sha256:9e9764474d0c70ceff17378a6eca55b00c98d2f4d564be06a8e82f2431b3caa2`. Coverage includes partial-fill cancel request/accept/reject, fill report during `CANCEL_REQUESTED`, cumulative-to-incremental conversion, duplicate replay, reservation-release barrier, fee correction and independent external-order discrepancy.
- `pnpm --filter @stockquant/trade-execution-service test:p5-7` passed with TestRun `aa03498b-03b7-4d67-8fca-7ba5ee70e65d`. It proved Portfolio commit/response loss, durable Outbox restart and lease fencing, two-fill cross-service ledger total 75, accepted cancel releasing only the remaining reservation, fee correction, and `EXTERNAL_ORDER_MISSING_LOCALLY` reconciliation. Broker mode was `FAKE`.
- The disposable PostgreSQL bound to random loopback port on bridge `sq-p57-net-bee42b83bb42d4fc`; Docker confirmed no masquerading. Container `sq-test-postgres-bee42b83bb42d4fc` and network were removed and absence verified. Active services were not connected.
- `git diff --check` passed.

## Preserved failures and boundary

The first ordinary sandbox run was blocked before test setup by Docker socket / loopback `EPERM`. The first isolated wrapper attempt correctly rejected a Docker network with no published port; the second caught a package-relative path error before service startup. Both were retained in tool history; the final corrected isolated run passed. A read-only Docker listing showed 5433 belongs to the active `stockquant-v12-postgres-1`, so the test no longer uses that endpoint.

At the time of the original P5.7 increment, the full V2.4 code suite had not been rerun because Portfolio, Market Data, and Paper smoke commands still targeted shared PostgreSQL defaults. A follow-up on 2026-10-02 added the generic disposable-PostgreSQL command wrapper, moved those code-suite entries to it, and reran `pnpm verify:stage -- --stage V2.4 --suite code` successfully. The end-to-end result and complete run IDs are in [the follow-up suite audit](2026-10-02-w2-v24-isolated-code-suite.md). Every wrapper verified teardown; active Compose services remained disconnected.

This verifies the ordered FakeBroker fill-during-cancel path and cross-service accounting, but does not prove broker-sequence arbitration for truly simultaneous, reordered independent Fill and cancellation acknowledgements. That event ordering remains a P-F05 gap; W2 stays `IN_PROGRESS`. No real broker, market provider, Paper schedule, or active service was called or modified.

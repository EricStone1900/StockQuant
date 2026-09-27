# P0.2 Historical FakeBroker execution contract audit

- Date: 2026-09-27 (Asia/Shanghai)
- Scope: Read-only route inventory followed by a contract-only addition for an already implemented historical replay endpoint.
- Result: Contract checks PASS; this does not change the endpoint implementation or claim a Paper trading path is connected.

## Coverage finding

`portfolio-account.v1.json` already describes account initialization, owner-scoped snapshot reads, fills, resource reservations and reservation resolution. The actual Trade Execution route `POST /internal/v1/historical-orders/execute` already checks caller identity, forwards the authorization decision to Governance, then uses the isolated FakeBroker repository and idempotency fingerprint. Before this change, that route had no canonical request/result Schema, OpenAPI operation or compatibility-matrix consumer rule.

The route request includes `authorizationId`, run namespace/account/order/security identity, requested quantity and historical bar, with optional side/order/participation/slippage/currency and reservation binding. The response wraps the FakeBroker result and `replayed` flag. OpenAPI limits the caller to `historical-replay-worker` using the service Bearer scheme. This contract describes the current historical BACKTEST route only; it does not authorize LIVE or enable V2.4 Paper execution.

## Changed contract artifacts

- `packages/contracts/schemas/common/historical-fake-execution-command.schema.json`
- `packages/contracts/schemas/common/historical-fake-execution-result.schema.json`
- `packages/contracts/openapi/trade-execution-historical.v1.json`
- `packages/contracts/compatibility-matrix.json`
- Generated shared TypeScript/Python types and service TypeScript projections.
- `scripts/check-openapi-contract.mjs` now asserts the operation, Bearer security, caller identity, schemas and HTTP responses.

## Verification

`pnpm contracts:generate` completed successfully. `pnpm contracts:check` exited 0:

- JSON files: 134 checked; schemas: 80; fixtures: 34; validation failures: 0.
- Generated type drift: none.
- Compatibility matrix: 67 consumer rules.
- OpenAPI: 14 contract groups checked, including the new one-operation `trade-execution-historical.v1`.

No endpoint behavior, active service, account, order, fill, data collection, observation record or user acceptance state was changed by this contract slice.

## Remaining P0.2 inventory

The same route inventory found a second contract gap: Research Automation already protects Runner Host `POST /v1/runner/jobs/claim`, `/{jobId}/input`, `/{jobId}/heartbeat`, and `/{jobId}/complete` with the dedicated Runner Host Bearer and lease/fencing checks. `V31RunnerHostApiClient` calls these endpoints. Current `platform-v33-research-queue.v1.json` documents bounded queue/budget reads and Platform readiness proxies, but not these host lifecycle commands. Existing Runner Job, lease, input request/response and ArtifactRef schemas provide part of the contract source; the host command/result envelopes still need to be described and checked. This is follow-up work, not covered by the verification result above.

The existing OpenAPI documents also do not establish that every HTTP client is generated from OpenAPI; most consumers currently use handwritten `fetch` wrappers with generated shared Schema types. P0.2 therefore remains partially complete until Runner Host lifecycle contracts/client generation and the remaining historical-replay/Research Automation cross-service routes are inventoried and scoped.

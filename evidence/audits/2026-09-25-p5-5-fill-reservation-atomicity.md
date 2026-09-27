# P5.5/P5.7 Portfolio fill and resource reservation atomicity

Date: 2026-09-25 (Asia/Shanghai). Scope: isolated Portfolio repository and temporary HTTP smoke only. This is engineering evidence; it does not authorize or enable a Paper strategy.

`POST /internal/v1/accounts/{accountId}/fills` now accepts a canonical `ReservedFillCommand`. A PAPER account requires a reservation tied to the same account, owner, namespace, TestRun, client order, currency and side. In one PostgreSQL transaction the repository locks the account and reservation, checks that a BUY fill including fees remains within reserved cash or that a SELL fill remains within reserved quantity, inserts the idempotent fill, updates cash and position, writes the ledger entry, and increments the reservation's captured amount/quantity. A repeated identical external fill is replayed without applying a second ledger effect; reusing its identity with different semantics conflicts. BUY subtracts notional plus fee; SELL adds proceeds less fee and reduces the held position.

Resource reservations report captured cash/quantity. New reservations count only the uncaptured remainder of HELD/UNKNOWN reservations, so partial fills do not double-count consumed resources or release the rest prematurely. UNKNOWN still holds the remainder. `FILLED` resolution requires a captured fill; terminal resolution remains a separate trade-service operation with evidence. The canonical JSON Schema, fixed BUY contract fixture, generated TypeScript/Python types, compatibility entry, and Portfolio OpenAPI operation are included.

Verification passed:

- `pnpm --filter @stockquant/portfolio-risk-service build`
- `pnpm --filter @stockquant/portfolio-risk-service test`: 2 files, 4 tests.
- `pnpm --filter @stockquant/portfolio-risk-service test:integration`: dedicated `portfolio_risk_test`, 1 file/3 tests, followed by a live temporary HTTP service smoke. The new case checked BUY and SELL partial capture, exact available-resource remainder, same-fill replay, changed-payload conflict, over-reservation rejection, foreign-owner rejection, and refusal to mark an empty reservation FILLED. The HTTP smoke also posted a reserved BUY through the actual route and confirmed retry replay; it passed Bearer route scope, UNKNOWN hold, and evidence-backed cancellation checks. Test accounts, reservations, fills, positions, ledger rows, service process and temporary directory are cleaned by exact test-run scope.
- `pnpm baseline:check`: 568 Markdown links, 33 schemas, 20 fixtures, generated types, 22 compatibility rules, three OpenAPI documents and 13 fixture files passed.
- `git diff --check` passed.

Remaining: the FakeBroker outbox does not yet carry and invoke this reservation binding; trade order placement is not gated by V2.4 Mandate, quote freshness or risk evaluation; cross-service outbox/Portfolio recovery and complete Web/CLI scenarios are not implemented. The `FILLED` resolution evidence string is supplied by the trusted trade-service caller and is not independently reconciled to an authoritative FakeBroker order in this slice. Do not mark P5.5/P5.7 or V2.4 Paper complete. OD-007 remains unresolved and Paper remains HOLD.

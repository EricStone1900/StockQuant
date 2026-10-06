# W1 / V1.3 current code boundary

Date: 2026-10-06. This current source manifest combines the V1.3 WAITING API-contract slice with the new manual proposal decision rule in `decision-governance-service`. The earlier contract-only source manifest remains preserved as a point-in-time audit and is now explicitly historical because the stage document and implementation have advanced.

The pure domain function uses an explicit caller-supplied run clock. It accepts a decision only while a proposal is `MANUAL_APPROVAL_PENDING`, for the exact proposal version and content hash, before expiry, in `PAPER`/`FAKE` mode, with explicit actor and reason. A HOLD must contain no legs; a REBALANCE must contain valid non-empty legs. Approval returns `APPROVED_MANUAL` only; it does not issue an `ExecutionAuthorization`.

The governance service's complete unit suite passed (7 files, 31 tests), its TypeScript typecheck passed, Markdown link check passed (4,643 local links), and `git diff --check` passed. The prior contract slice independently passed `pnpm contracts:check`, Platform typecheck, 13 targeted V1.3 tests, and the full V1.3 code suite; those original logs remain attached to the contract-boundary audit. Logs for this incremental run are attached in this directory.

This is not a persisted proposal workflow. No HTTP route, user-session identity binding, proposal repository/migration, risk re-evaluation, Mandate, budget/resource reservation, Trade Execution, Portfolio, FakeBroker, Provider, collection, Paper, or Broker operation was added or called. V1.3 remains incomplete and its development and acceptance checkboxes remain unchecked.

See [machine summary](./2026-10-06-w1-v13-manual-approval-domain.json), [current source SHA-256 manifest](./2026-10-06-w1-v13-manual-approval-domain.sha256), and the [historical contract-slice audit](./2026-10-06-w1-v13-contract-boundary.md).

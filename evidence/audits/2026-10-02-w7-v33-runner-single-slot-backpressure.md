# W7 V3.3 PostgreSQL Runner single-slot backpressure verification

Date: 2026-10-02 (Asia/Shanghai)

Command: from `services/research-automation-service`, run `RESEARCH_AUTOMATION_DATABASE_URL=postgres://.../research_automation_test pnpm exec vitest run tests/integration/pg-v31-preparation.spec.ts` against a disposable `postgres:16.9-alpine` tmpfs container with a random loopback port.

Result: 1 integration file, 16/16 tests passed. In the specific `enforces the single active Runner slot across workers and TestRun scopes` case, two workers concurrently attempted to claim jobs from different TestRun scopes; exactly one claim succeeded, the database held exactly one unexpired `RUNNING` lease, and after completion released capacity, the queued job was claimable and completed. Other cases in this integration file also exercised fencing/lease takeover, submission idempotency, cancellation and artifact persistence boundaries. Container cleanup ran explicitly; residual labeled container count was 0.

This verifies the PostgreSQL queue's configured global capacity of one and queued-work recovery under a deterministic database race. It does not measure multi-slot throughput, sustained pressure, real Runner computation under simultaneous external loads, cancellation latency in the running Host, Paper coexistence, production database behavior, or Ubuntu. No active stack, market-data, Provider, or Paper endpoint was contacted.

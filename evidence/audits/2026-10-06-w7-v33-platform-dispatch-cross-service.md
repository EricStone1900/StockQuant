# W7 V3.3 Platform dispatch cross-service HTTP/PostgreSQL verification

Date: 2026-10-06

## Scope

An isolated test starts the real Research Automation bootstrap against a disposable PostgreSQL database and mounts the real `V33AcceptanceController` against a separate disposable Platform PostgreSQL database. It drives one owner-scoped TestRun through the Platform HTTP endpoints for budget binding, Fixture Experiment reservation, and explicit two-round dispatch. It verifies persisted Platform state and queries Research Automation PostgreSQL for model-call budgets, ArtifactRefs, and Runner Jobs. It does not start a Runner Host, use an external model Provider, connect to market data/Paper/Broker, or connect to the active services.

## Verified result

- Platform created a single owner-scoped normal TestRun and bound its immutable 100-cent cap through authenticated Research Automation HTTP.
- Platform reserved the expected same-TestRun two-round, 80-cent Fixture Experiment through authenticated Research Automation HTTP.
- Platform dispatched round 1 and round 2 through the real HTTP client. Each call returned the contract field `actualCostCents=23`, and each distinct `modelRunId` settled once in PostgreSQL at 23 cents against a 40-cent round reservation.
- Both round jobs are persisted as `QUEUED`, carry explicit round indices, the pinned image digest, and `networkPolicy=DENY`. The identical generated source is deduplicated to one immutable content-addressed input ArtifactRef with stable provenance.
- Platform persisted six StageRun history revisions and remains `RUNNING` at `RUNNER_JOBS_QUEUED`. Runner execution is deliberately reported `QUEUED_NOT_STARTED`; this smoke is cross-service dispatch evidence, not output/reconciliation evidence.
- The wrapper verified disposable PostgreSQL container/network cleanup. Active services were not connected; external Provider calls were 0.

The final complete V3.3 code suite, including this integration, is recorded in [the full log](2026-10-06-w7-v33-platform-dispatch-cross-service-suite.log). The smoke command is included in the V3.3 code suite via `scripts/run-isolated-postgres-command.mjs`. Initial failed attempts are retained in [the failure record](2026-10-06-w7-v33-platform-dispatch-cross-service-initial-failures.md); current evidence hashes are in [the SHA-256 manifest](2026-10-06-w7-v33-platform-dispatch-cross-service.sha256).

## Failed attempts retained

The first harness run could not resolve `pg` from the repository-root script; imports were corrected to resolve dependencies from the Platform package. The next run exposed that the readiness route returns HTTP 202, not the harness's default 201; the harness was corrected to the controller contract. Actual service routing then exposed three implementation defects: round model IDs contained a colon forbidden by the model-call contract; round-specific path segments violated the ArtifactRef namespace contract; and identical generated input bytes used round-specific provenance, conflicting with ArtifactRef immutability. Those were fixed by safe dotted round IDs, canonical input/output namespaces, and content-derived stable provenance. The final run confirmed identical inputs correctly produce one ArtifactRef, and the history assertion was aligned with the repository's six recorded prior revisions. None of these failed isolated runs wrote to active databases; the wrapper removed each disposable container/network.

## Acceptance boundary

This proves the V3.3 Platform-to-Research Automation dispatch through PostgreSQL. It does not execute the queued Runner Jobs in this TestRun, reconcile output Artifacts, settle the Experiment aggregate, produce normal/rejection/recovery business assertions or exports, measure concurrent Paper continuity, satisfy Ubuntu acceptance, or record human sign-off. V3.3 remains incomplete.

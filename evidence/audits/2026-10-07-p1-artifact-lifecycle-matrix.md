# P1 V1 Artifact producer and lifecycle matrix

Date: 2026-10-07 (Asia/Shanghai)

## Scope and ownership

This audit covers runtime byte-producing artifacts in the current V1 implementation. It does not treat database business facts as files and does not decide retention policy.

| Producer / data | Canonical owner | Identity and access | Lifecycle evidence | Result |
|---|---|---|---|---|
| V1.2 Qlib fit model and fit evidence | Quant Research creates model bytes; Platform owns the TestRun projection | Shared immutable `artifact-ref.v1`; content SHA-256; owner, TestRun, kind, namespace and source reference; owner-scoped read/export | [V1.2 ArtifactRef audit](2026-10-07-p1-v12-artifact-ref.md); [V1.2 full isolated run](2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-1b9ee3cef4f70f4bc004.json); cancellation, restart/resume and no-publication assertions are in the run evidence | PASS for the exercised V1.2 producer and scenarios |
| V1.4 Quant backtest report | Quant owns persistent BacktestRun/Manifest; Platform owns TestRun association and owner-scoped export | Report result SHA-256 bound to owner/TestRun; export recomputes and verifies canonical JSON bytes | [V1.4 report ArtifactRef audit](2026-10-07-p1-v14-report-artifact-ref.md); [complete V1.4 code suite](2026-10-07-p1-v14-artifact-fencing-complete-code-suite.log); integration test `services/platform-api-service/tests/integration/v14-report-publication-fencing.spec.ts` | PASS for report publication/export and both cancellation/publication lock orderings |
| Versioned market and model input Fixtures | Fixture repository/consumer per Fixture specification; immutable versioned file plus Manifest | Fixture ID/version, provenance/license, exact semantics, SHA-256 and expected assertions | `pnpm fixtures:check` is included in the complete V1.3/V1.4 code suites; each evidence-bearing run identifies exact Fixture version/hash | PASS as versioned inputs; not migrated to runtime ArtifactRef |
| Orders, Fills, reservations, assets and ledgers | Trade Execution / Portfolio domain stores | Domain IDs, idempotency keys, event sequence, account and TestRun ownership; persistent relational facts | V1.3 fixed trade matrix and service integration suites; authoritative rows remain in their owning stores | PASS as domain facts; intentionally not represented as file Artifacts |
| Platform TestRun evidence/export | Platform owns TestRun metadata and assertions; domain services own business results | Stable TestRun UUID, stage/scenario/owner, assertion references and versioned export bundle | [V1.1–V1.5 TestRun/dispatch matrix](2026-10-07-p1-testrun-dispatch-matrix.md); current stage export paths are independently exercised in the listed stage runs | Producer ownership mapped; old missing TestRun exports remain a P6 history gap |

## Cancellation and publication ordering

V1.4's isolated PostgreSQL test proves both orders: when cancellation acquires the row lock first, report completion is rejected and no ArtifactRef is attached; when publication commits first, a later cancellation is rejected. The test also checks owner/Run binding and the canonical content hash. The complete V1.4 code suite passed after adding this test. V1.2's isolated Web/API/CLI E2E separately exercises cancellation without publication and Platform restart/resume of the original Run.

## Open decision and limits

OD-013 remains OPEN for retention duration, orphan identification/sweep semantics, and physical deletion authorization. No automatic expiration or deletion is enabled. The producer inventory is scoped to V1 runtime byte producers evidenced in code and stage contracts; any newly discovered producer must be added with its owner and lifecycle evidence before claiming the inventory complete. Historical structured TestRun export gaps cannot be replaced by a new Run.

Automated results are engineering evidence only. Human acceptance remains NOT_RUN until the user performs and confirms it.

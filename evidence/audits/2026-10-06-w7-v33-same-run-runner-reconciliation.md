# W7 V3.3 same-TestRun Runner result reconciliation

Date: 2026-10-06

## Scope

The isolated smoke drives one owner-scoped Platform V3.3 TestRun through actual Platform HTTP, Research Automation HTTP, and separate disposable PostgreSQL databases. It binds the 100-cent TestRun cap, reserves the 80-cent two-round Experiment, calls the local deterministic Fixture twice (23 cents each), publishes one deduplicated input Artifact, and dispatches the two round-bound Runner Jobs. An authenticated isolated Runner Host caller then claims those exact Jobs, publishes fenced output Artifacts, and completes the Jobs through the real Research Automation HTTP API. Finally, the owner-scoped Platform reconciliation route reads the same TestRun queue, validates exact Job/TestRun/Experiment/round identity, reads each immutable output Artifact through Research Automation, verifies its content SHA-256, parses the JSON, and checks the frozen Fixture metrics before persisting both round results on that same StageRun.

The machine result is in [the JSON report](2026-10-06-w7-v33-same-run-runner-reconciliation.json); the exact build-and-smoke command is `pnpm v33:platform-dispatch-cross-service-smoke`.

## Result

Run `3cc26001-8ce5-4e74-a55c-ecf16ba7248e` reconciled both round results into its original StageRun. PostgreSQL retained seven StageRun history entries, two `SETTLED` model calls at 23/40 cents each, and one deduplicated immutable input Artifact. Both output Artifacts were independently read and SHA-256 verified. Each result matched the fixed metrics: 6 bars, Fixture `v3.1-research-small-sample-1`, Qlib `0.9.6.99`, return `0.12`. External Provider calls were 0; active services were not connected and disposable DBs/container/network/artifact directory were cleaned.

## Acceptance boundary

This verifies Platform reconciliation against Runner Host-authenticated HTTP completion in the same TestRun. The completion portion of this integration smoke submits deterministic completion records directly to the Runner Host API; it does **not** run a container on this same TestRun. Actual bounded container execution, output publishing, SIGKILL lease takeover, checkpoint recovery and stale-fence rejection are independently verified by [the Runner Host recovery smoke](2026-10-06-w7-v33-runner-host-rounds-recovery.md). Experiment aggregate settlement, rejection/recovery scenario assertions and export, Web/CLI independent recomputation of business assertions, Paper continuity, Ubuntu acceptance and human sign-off remain incomplete. The StageRun intentionally stays `RUNNING`; `businessValidation=NOT_RUN` and `experimentSettlement=NOT_VERIFIED`.

Initial attempts found two request-contract errors (Runner output provenance must contain the active job fence, and completion refers to the original `PENDING` artifact ref); both are preserved in [the failure record](2026-10-06-w7-v33-same-run-runner-reconciliation-initial-failures.md). See [the SHA-256 manifest](2026-10-06-w7-v33-same-run-runner-reconciliation.sha256) for current source and evidence integrity.

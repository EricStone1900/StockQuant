# W9 V2.4 exact TestRun evidence recovery

Captured 2026-10-05. This recovers the missing structured bundle for V2.4 external-reconciliation TestRun `bf8e8474-ce11-43c8-a9d4-ca2268c0c8a1` from existing point-in-time evidence.

The source Platform JSON snapshot contains exactly one persisted `acceptance_stage_runs` row for this UUID. Its run is `COMPLETED`, scenario `external-reconciliation`, version `2.0.0`, with nine persisted `PASS` assertions including their expected and actual values. The snapshot contains no exact-run `acceptance_records`; the persisted `humanAcceptance` value is `NOT_RUN`.

The existing four-scenario Web audit independently records the same exact TestRun as `COMPLETED`, reports `cliCheckOnly: true`, and names the preserved external-reconciliation screenshot. The recovery script compares the Web assertion IDs/statuses with the persisted assertions and validates the screenshot exists. It also checks all seven source files against the earlier W0 file manifest before exporting anything.

Recovered bundle: [evidence.json](../../local/V2.4/bf8e8474-ce11-43c8-a9d4-ca2268c0c8a1/evidence.json), with a manifest binding its exact bytes. Source references and hashes are embedded in the bundle; machine details are in [recovery.json](./recovery.json). This is a recovery from persisted snapshots, not a new business run. It does not create a user acceptance record, infer a new sign-off, prove real-source authorization, or satisfy the V2.4 observation gate.

The first gate capture ran before the recovery `files.sha256` linked from the stage docs had been created, so that capture is retained as [version-gates-first-attempt-failed.json](./version-gates-first-attempt-failed.json) and is not the current gate result. The gate was rerun after writing the manifest.

Current gates at 2026-10-05T15:54:24Z: V1/V2/V3 remain `INCOMPLETE`, with 5/5/4 unresolved stages. TestRun evidence is V1 `INCOMPLETE` (10 IDs, 7 missing), V2 `INCOMPLETE` (11 IDs, 6 missing; this V2.4 bundle is now present), and V3 `NOT_RUN` (0 IDs). Evidence integrity and stage-document audits pass for all versions. See [version-gates.json](./version-gates.json).

Reproduction: `node evidence/audits/2026-10-05-w9-v24-run-recovery/recover-v24-run.mjs`. Full recovery/source/export hashes: [files.sha256](./files.sha256); outer audit check: [audit.sha256](./audit.sha256).

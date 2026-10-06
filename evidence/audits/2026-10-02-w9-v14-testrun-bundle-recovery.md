# W9 V1.4 TestRun bundle recovery

Date: 2026-10-02. Status: PASS for recovery packaging only.

The isolated Quant ownership audit contains four exact completed V1.4 TestRuns. Each was copied without field changes into a stage-scoped bundle under `evidence/local/V1.4/<testRunId>/`. The bundle manifest binds both `evidence.json` and the extracted `source-evidence.json`; provenance points back to the source audit SHA-256 `52db5c6886716c8bd4cffe132c36498bd4e29e30bfe55183d52eef7686026fb9`. All four bundle records explicitly retain `manualConclusion=NOT_RUN`.

The identity scanner moved from 22 unresolved V1/V2 associations to 18 after these four bundles. No legacy run was fabricated. Remaining missing IDs are listed in the JSON report. V1/V2/V3 remain subject to their normal gates; no human acceptance or version status was changed.

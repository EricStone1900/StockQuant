# W9 historical TestRun evidence recovery check

Date: 2026-10-02 (Asia/Shanghai)

## Recovered exact legacy export

The V1 gate identified TestRun `d5add8bf-ae44-48a8-b726-b4be34ab4278` as missing because its original `evidence.json` lived at `evidence/local/<UUID>/` rather than the required stage-scoped path. The original manifest was verified before use (`fe6eb9e97d27f99f9ffaa8eae22beea9d13f8e53495ecb9207a927204509748b`). The export itself records V1.1, the exact same UUID, COMPLETED, two PASS assertions, and `manualConclusion=NOT_RUN`.

Preserved the original directory and created `evidence/local/V1.1/<UUID>/` with the exact original bytes copied as `source-evidence.json`, a normalized v2 envelope exposing top-level stage/run identity, and a manifest binding both files. No assertions, result values or human conclusion were changed. The V1 verifier now recognizes this one historical association; V1 remains INCOMPLETE and no acceptance was inferred.

## Read-only database check and remaining gap

Queried the active `platform_api` database inside a `READ ONLY` transaction for the exact unresolved V1 and V2 IDs (23 IDs). It returned zero rows. The active database cannot regenerate those historical exports. A repository-wide evidence scan found no source payloads for the other legacy IDs; documented audit prose containing UUIDs is not a TestRun export and was not used to create bundles.

After this recovery, 16 V1 associations remain unresolved and all 6 V2.1/V2.2 associations remain unresolved. Recover them only from exact archived exports or a backup proven to contain those rows. Historical user acceptance remains unchanged; `manualConclusion=NOT_RUN` for the recovered V1.1 run.

# V1 historical TestRun recovery source check

Date: 2026-10-07 (Asia/Shanghai)

The current V1 verifier lists seven historical TestRun UUIDs without structured evidence exports: one V1.2, three V1.3, and three V1.5. I checked the available local Platform source without changing it:

- A request to the existing local `stockquant-v12` Platform API's session endpoint returned 200; the three exact V1.5 run lookups then returned 404. This is a legacy running image, so its runtime behavior is not treated as current-source evidence. The connected `platform_api` database has no `platform_local_sessions` table, and the request did not create a TestRun.
- A PostgreSQL `BEGIN READ ONLY` query against the mounted `stockquant-v12_postgres-v11` volume's `platform_api` database found no matching rows for any of the seven UUIDs in either `acceptance_stage_runs` or `test_runs`.
- The repository's `evidence/local` tree contains no UUID-scoped export for the seven runs. Search results in audit files identify the IDs and prior conclusions, but contain no original structured run payload.

This proves those original records cannot be recovered from the currently inspected local Platform database or checked-in structured evidence. It does not prove that no external/offline backup exists. The historical UUIDs remain unresolved; only an authorized original backup containing the matching records could support exact recovery. New TestRuns cannot replace them, and this audit does not alter any historical record, gate, or signature.

## 2026-10-10 current API recheck

After confirming the existing local `stockquant-v12-platform-api-service-1` was running, I made GET-only owner-scoped lookups for the four V1-gate UUIDs. All four exact stage routes returned 404; response bodies were not retained, and no container or database state was changed. Machine record: [JSON](./2026-10-10-v1-current-history-test-run-api-recheck-a01.json), [SHA-256](./2026-10-10-v1-current-history-test-run-api-recheck-a01.json.sha256). This confirms current local API absence only; it does not rule out an external/offline backup or authorize replacing the historical runs.

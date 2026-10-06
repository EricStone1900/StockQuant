# W9 legacy V1.1 TestRun recovery

Captured 2026-10-05 (UTC). This audit checks whether exact historical TestRun rows missing from the current V1/V2 structured evidence bundles can be recovered from the unattached V1 PostgreSQL volume.

## Source handling

- Docker metadata identified `stockquant-v11_postgres-v11` as a PostgreSQL 16 Compose volume with no associated container. Its data directory measured about 69.9 MB.
- The volume was mounted read-only into a network-disabled utility container and copied to `/private/tmp/stockquant-v11-legacy-copy-20261005`.
- PostgreSQL 16.9 was started with `--network none` and `listen_addresses=''` against the temporary copy only. It shut down cleanly after the targeted queries. The source volume and active V12 service were not started, written, or changed.
- The query selected only the 16 exact UUIDs recorded in the prior W9 missing-TestRun audit and only run identity/status/timestamps. It found two rows, both V1.1. Follow-up reads were limited to those rows' assertion fields and acceptance-record conclusion metadata; no acceptance notes, session secrets, or unrelated payloads were queried.
- Exact selected source rows are preserved in [legacy-v11-test-run-rows.jsonl](./legacy-v11-test-run-rows.jsonl), SHA-256 `72a422629c4694f949459a4b1756bd6302445b6cef95145afc43778080a7b255`.

## Recovered records

| TestRun | Scenario | State | Assertions | Exact-run user acceptance |
|---|---|---|---|---|
| `24276340-2e5a-4516-a7d0-20f92851754b` | rejection | COMPLETED | 2/2 PASS | No record; remains `NOT_RUN` |
| `bdb53484-19b4-4363-a130-eee94761df54` | recovery | COMPLETED | 2/2 PASS | No record; remains `NOT_RUN` |

Each row now has a structured evidence bundle under `evidence/local/V1.1/<TestRun UUID>/`. Bundles are explicitly labeled as reconstructed from exact legacy database rows, not as original Platform API exports. They include no screenshots, Web/CLI same-run result, or facts absent from those rows. The recovery utility refuses unexpected IDs, non-V1.1 rows, incomplete runs, failed/empty assertions, duplicate input IDs, and unsupported acceptance-record multiplicity.

## Verification and remaining work

- `pnpm verify:version -- --version V1` remains `INCOMPLETE` (exit 2), with evidence links/manifests passing. The two V1.1 records are no longer missing structured bundles. Seven different V1 IDs remain without structured exports: one V1.2, three V1.3, and three V1.5.
- Refreshed three-version gates at 2026-10-05T15:32:30Z: V1/V2/V3 remain INCOMPLETE with 5/5/4 unresolved stages; TestRun audits are V1 INCOMPLETE (10 IDs checked, 7 missing), V2 INCOMPLETE (11 checked, 7 missing), and V3 NOT_RUN (0 IDs). Evidence and stage-document audits PASS for all three versions. See [version-gates.json](./version-gates.json).
- `pnpm baseline:check` passed after the recovery and first W0 snapshot were linked: 3947 Markdown links/0 failures, contracts and Fixtures passed, and repository governance tests passed (9+2+5+30 assertions across the configured suites). Full output: [baseline-check-after-snapshot.log](./baseline-check-after-snapshot.log). The earlier attempt, run before the newly referenced W0 files existed, failed only the expected link-existence check and is retained as [baseline-check-first-attempt-failed.log](./baseline-check-first-attempt-failed.log).
- V1.1 itself remains `PARTIALLY_IMPLEMENTED`; this recovery does not close API cutover/rollback, old nonterminal-run disposition, new-scope acceptance, or other listed requirements.
- The original database contains no acceptance record for either recovered TestRun. Historical stage-level signatures elsewhere remain unchanged and are not copied into these run bundles.
- The other 14 IDs were not found in the V1.1 database. The V2 IDs and any other backups/exports remain unsearched.
- The original Docker volume remains available and untouched; the temporary copy was removed after evidence files were written.

Machine summary: [recovery.json](./recovery.json). Source query and generated files: [files.sha256](./files.sha256). Outer audit check: [audit.sha256](./audit.sha256). Recovery code: [recover-legacy-v11-testrun-evidence.mjs](../../../scripts/recover-legacy-v11-testrun-evidence.mjs).

# W9 exact historical TestRun presence check (read only)

Captured 2026-10-05 14:52Z. The currently healthy Platform PostgreSQL container was queried with a SELECT restricted to the 16 exact V1/V2 TestRun IDs reported by the current W9 verifier as missing structured exports. Only ID, stage, status and creation time were selected; returned rows were not persisted in this report.

Result: query exit 1; 16 exact IDs queried; 0 matching rows. The IDs are not present in the active platform_api.test_runs table. This confirms the active database cannot currently supply those records. It does not cover historical backups or separate exports, and does not authorize reconstructing evidence from logs. No application/database writes, migrations, service restarts, Provider calls or trading actions occurred.

The exact read-only SQL is in the sibling .sql file; machine result is in the sibling .json file. Historical evidence can only be resolved using exact original structured exports or a project-owner-approved backup containing the exact records.

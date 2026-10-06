# V1.1 active TestRun nonterminal read-only review

Captured 2026-10-02 13:23:33 UTC from the active `platform_api` in a read-only transaction. The database contained 49 V1.1 legacy TestRuns and 44 V1.1 shadow rows. Three historical nonterminal records remain:

| TestRun | Scenario | Status | Created (UTC) |
|---|---|---|---|
| `221157ba-dde4-4fe4-92ff-0bb942c066b4` | normal | RUNNING | 2026-09-15 14:42:58.67055 |
| `49a6dfa0-4c96-480f-9d64-7680fa61a626` | normal | RUNNING | 2026-09-15 14:44:16.160814 |
| `fbb122dc-2543-4680-b3fb-bf474161ce45` | recovery | WAITING | 2026-09-16 11:57:56.055377 |

Read-only Docker inspection confirmed Platform API and PostgreSQL were running and healthy with their existing start times. No run or database row was changed, no migration was applied, and no service was restarted. The statuses alone are not sufficient evidence to mark these runs failed or complete; operator disposition remains pending. Refresh this inventory before an authorized maintenance window because activity may change.

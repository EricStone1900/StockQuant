# P4/DC-08A read-only live check (2026-09-27 19:16 Asia/Shanghai)

This is a read-only runtime check. No collection, repair, service restart, subscription change, evidence finalization, or production database write was performed.

## Live runtime

- `pnpm dc08a:supervise -- --check-only`: `HEALTHY`, HTTP 200, `actions=[]`.
- `pnpm dc08a:verify-automation`: `PASS`, no configuration failures. Existing `a-20`, `dc-08a`, `dc-08a-2`, `stockquant-tdx`, and `stockquant-tdx-2` retain their reported states; no automation was changed.
- Health report captured at `2026-09-27T11:16:26.283Z` (`19:16:26` Shanghai): active subscription `dc08a-20260917-20-v1`; 20 frozen securities; PostgreSQL persistence, scheduler worker and collection executor enabled; scheduler tick age 55.191 seconds; next execution `2026-09-28T01:37:00Z` (`09:37` Shanghai); `openGaps=0`, `pendingOutbox=0`.
- Calendar state was `CLOSED` with version `sse-cn-a-share-2026-1`. Sina and Baostock circuits were `CLOSED` with zero failures; Eastmoney remained disabled.

## Archived observation count

An independent in-memory summary of the existing archive was written only to `/tmp/stockquant-dc08a-observation-current.json`: four stable completed days plus one recovered day, `5/20`, `15` remaining, `WAITING`. No malformed evidence or invalid timestamps were found; 185 files for other subscriptions were excluded. The latest finalized archive remains 2026-09-25 with zero runs and is incomplete. 2026-09-27 is Sunday and the calendar is closed, so this check adds no observation day. This archival counter does not retroactively certify earlier evidence against the stricter sampling-window/requested-security quality rules; see [the observation history rule audit](2026-09-27-observation-history-rule-audit.md).

## Reproducible snapshots

- `/tmp/stockquant-dc08a-health-current.json`, SHA-256 `3b96a298b9259222a98a1201340c685b0d71e2b45485ce954a2dd2b4b7caad09`.
- `/tmp/stockquant-dc08a-observation-current.json`, SHA-256 `357d761516c9946d48f21b1d8ab77e88fe1693ef85196f8c50d2b619513d07fb`.

The ordinary sandbox initially could not fetch the loopback health endpoint. The same checks were rerun with local service access; both completed successfully. The snapshots remain outside the repository and no formal observation archive was overwritten.

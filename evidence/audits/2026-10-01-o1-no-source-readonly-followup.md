# O1 no-source pause read-only follow-up — 2026-10-01

## Result

No new O1 observation day was earned. The existing archive remains 8/20 (7 complete days and 1 recovery day), with 12 valid observation days remaining. The market calendar was closed at the check time, so source freshness was not expected. Health returned `UNHEALTHY` because there was no next scheduler trigger; PostgreSQL readiness and the scheduler worker were available, and gap/outbox counts were zero.

The health document's `activeSubscription` field is a configured/default subscription identifier, not proof that a schedule is enabled. A separate authenticated read of `GET /v2/collection-schedules` via `node scripts/dc08a-active-subscription.mjs --field enabled-count` returned `0`. The companion `--field id` read correctly refused to identify an active subscription (`expected exactly one enabled subscription, found 0`). Thus the displayed `scheduler=ENABLED` is worker readiness and does not mean the paused subscription will collect. No source probe, collection trigger, subscription mutation, order, or Paper action was made.

## Commands and evidence

- `pnpm dc08a:health-report`: captured `2026-10-01T14:54:23.918Z`; returned exit 1 / `UNHEALTHY` due `nextTriggerRecorded=false`, with calendar `CLOSED`, `openGaps=0`, `pendingOutbox=0`.
- `pnpm dc08a:observation-summary`: returned exit 2 / `WAITING`, `observedDays=8`, `remainingDays=12`; newest counted day remains 2026-09-30.
- `node scripts/dc08a-active-subscription.mjs --field enabled-count`: returned `0`.
- `node scripts/dc08a-active-subscription.mjs --field id`: exit 2, expected because there are no enabled subscriptions.

The health and derived observation documents are retained at `evidence/dc08a/health-report.json` and `evidence/dc08a/observation-summary.json`. These are read-only operational snapshots; they do not authorize or start collection. O1a/O1b/O1c, O2 and Ubuntu observation gates remain open. Resuming source observations requires explicit source authorization and a verified schedule before the next real trading session.

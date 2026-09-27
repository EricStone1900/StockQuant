# V2.4 acceptance evidence correction (2026-09-27)

## Finding

The V2.4 acceptance scenario engine created static PASS records rather than running Paper behavior. Its normal fixture claimed an ACTIVE Mandate and PASS reconciliation, while rejection/recovery fixtures asserted stale quote handling, idempotency and recovery without exercising those services. The controller also appended a quote preview to the synthetic run. These records were not evidence of actual orders, fills, reconciliation or source observations.

## Correction

All three V2.4 scenario entry points now persist `WAITING` with a single `WAITING` assertion and `actual=NOT_RUN` while the SNAPSHOT-to-Mandate/risk/reservation/FakeBroker execution chain remains disconnected. Evidence explicitly labels `dataMode=NOT_CONNECTED`, policy and Mandate `PREPARATION_ONLY`, source and reconciliation `NOT_RUN`, and empty order/fill lists. The endpoint no longer fetches or appends a quote preview. The Web controls now say they check prerequisites, and the page labels the current mode accurately. V2.4 scenario/config/scheduler/observation endpoints require a local session.

The observation-day counter remains separate and is not incremented by these prerequisite checks. Existing observation records and prior human sign-offs are not rewritten; those records do not prove this corrected Paper execution scope.

## Verification

The platform API unit suite now asserts that no V2.4 run claims an active Mandate, quote, order, fill or reconciliation before those paths run; it also checks that unauthenticated access is rejected, a created scenario remains `WAITING`, and no downstream quote request occurs. Browser coverage checks the visible NOT_CONNECTED label and confirms rejection/recovery requests remain `WAITING`/`NOT_RUN` instead of displaying invented fault events. Full V2.4 code-suite verification is recorded in the execution plan after the code change.

No activity service, Paper account, formal observation record, or shared volume was changed.

## Stage checklist consistency follow-up

The same audit found the V2.4 stage-delivery checklist still checked backend completion, current Web scenarios, current repeat/recovery evidence and current user acceptance, while the stage's own current run table said `WAITING/NOT_RUN` and the acceptance matrix said the 2026-09-11 sign-off was historical only. Those stale checks are now cleared and the V2 version plan explicitly separates the retained historical `8/20` database count/signature from evidence for the corrected Paper chain. The contract/scenario definition and documentation-update items remain checked only where their wording is still supported. No historical record or signature was removed.

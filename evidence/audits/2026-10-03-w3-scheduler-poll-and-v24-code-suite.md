# W3 scheduler polling status and V2.4 code-suite audit

The persistent scheduler now reports `nextPollAt` separately from `nextExecutionAt`: a poll loop can remain active when no collection window is due. Stopping the scheduler clears its next-poll estimate. This is a read-only status improvement; it neither enables the collection executor nor changes external-source authorization.

Verification: Market Data unit suite passed 18 files / 71 tests and typecheck. The complete V2.4 code suite passed with exit 0 under controlled loopback access after the default sandbox denied the existing Qlib Worker loopback bind with `EPERM`. The suite retained the FIXTURE / PAPER / FAKE boundary, passed four API and four browser scenarios with same-run CLI checks, verified read-only business facts remained unchanged, exported temporary database evidence before cleanup, and reported `activeServicesTouched=false`.

The active service was not redeployed. No source/provider or real-broker calls were made. NO_TRADE, missing source authorization, O1/O2 observation, Ubuntu validation, and human acceptance remain unchanged. Machine details and run IDs are in the paired JSON and source/hash manifest.

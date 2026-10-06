# O1/O2 read-only status rerun — 2026-10-02

At 2026-10-01 17:15 UTC / 2026-10-02 01:15 Asia/Shanghai, recomputed the O1 count from local archived observation JSON and queried only the Market Data service's authenticated schedule-list GET endpoint.

- O1 archive: 8/20 effective days (7 complete, 1 recovered), 12 remaining, `WAITING`; latest counted date 2026-09-30. No malformed observation or invalid timestamp files; 185 records for other subscriptions were excluded from this subscription's tally.
- Active schedule metadata: enabled subscription count `0`.
- No health-triggered operation, provider/source probe, collection, scheduler activation, Paper run, trade, or write was performed.
- O1 cannot accumulate more valid days while source authorization remains absent and the subscription is disabled. O2 remains `NOT_STARTED` because its W3-approved Paper prerequisite has not been enabled.

This is a state check, not a new observation day, source-capability validation, or business acceptance. Continue only after the applicable source authorization and subsequent approved operational gates are present.

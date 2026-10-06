# O1 read-only health check during NO_TRADE hold

Date: 2026-10-02 16:28 Asia/Shanghai

Using only authenticated GET requests, the Health report returned `UNHEALTHY`: China A-share calendar `CLOSED` (`sse-cn-a-share-2026-1`), scheduler `ENABLED`, recent successful tick (2.298 seconds old), no next execution timestamp, `sourceFreshnessExpected=false`, and zero open gaps/pending outbox. A separate GET to the persisted collection-schedules endpoint returned zero enabled schedules. The source catalog reports BaoStock and Sina configured/enabled, while Eastmoney and TDX are disabled; catalog enablement is not a collection schedule or user authorization.

The archived observation summary remains 8/20 (7 complete + 1 recovered, 12 remaining), latest finalized day 2026-09-30. No new observation day was counted because the market was closed. No provider/source data endpoint was called; no collection, Paper, order, or write endpoint was invoked. Services were not restarted or reconfigured.

Evidence: `2026-10-02-o1-readonly-health-after-w5.json` is the fresh Health GET snapshot. The archived summary and enabled schedule count are independently cited in the delivery plan. This does not close O1a/O1b/O1c, O2, or Ubuntu observations.

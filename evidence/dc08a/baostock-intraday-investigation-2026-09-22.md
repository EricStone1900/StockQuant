# BaoStock 当日分钟数据排查（2026-09-22）

- 正式订阅 `dc08a-20260917-20-v1` 的 48 个五分钟窗口全部完成，960/960 根 Bar，来源均为 Sina。BaoStock 尝试中，16 次返回 `EMPTY_RESULT`，32 次因熔断冷却返回 `CIRCUIT_OPEN`；没有成功切回。原始窗口、来源尝试和时间见 [`dc-t19/2026-09-22/observation-2026-09-22T09-45-40-174Z.json`](dc-t19/2026-09-22/observation-2026-09-22T09-45-40-174Z.json)。
- 当天收盘后，在正式 `market-data-service` 容器内以独立 `/tmp/stockquant-baostock-probe-20260922.json` 健康状态文件运行一次只读适配器探针。请求 `600000.SH`、`2026-09-22`、BaoStock 单来源、12 秒超时、最多一次尝试；返回 `COMPLETED`、48 根 Bar、一次 `PASS`。
- 再以独立 `/tmp/stockquant-baostock-probe-3-20260922.json` 文件探测 `600000.SH`、`600004.SH`、`600006.SH`，同日、20 秒超时、最多一次尝试；返回 `COMPLETED`、144 根 Bar，每只 48 根、一次 `PASS`。同参数复核摘要保存为 [`baostock-after-close-probe-2026-09-22.json`](baostock-after-close-probe-2026-09-22.json)。探针未接触正式熔断状态、未发布 Bar 或触发补采。
- 对比说明：同一交易日的盘中窗口持续空结果，盘后同日全量查询成功。现有证据支持“BaoStock 的这条 5 分钟接口对当日数据有发布延迟”，但未测出准确发布时间，也不能推断每个交易日都如此。Sina 备用源保证了今天的数据完整性；BaoStock 盘中能力和成功切回仍为未通过。
- 保持当前持久订阅与 600 秒半开探测，以便在后续真实交易日观察；若继续出现整日 `EMPTY_RESULT`，应将正式盘中偏好源调整为已验证的 Sina，并把 BaoStock 用于盘后/历史读取。调整主备顺序前需同步来源契约、证据和验收口径。

健康告警的旧快照保留为 [`health-report-before-session-fix-2026-09-22.json`](health-report-before-session-fix-2026-09-22.json)。修复后检查交易日历与交易时段：只有采集时段及其后 30 分钟要求最近来源成功；其他时段仍要求来源熔断关闭、有效的历史成功记录、调度器和质量项正常。运行证据见 [`health-report-after-session-fix-2026-09-22.json`](health-report-after-session-fix-2026-09-22.json)。

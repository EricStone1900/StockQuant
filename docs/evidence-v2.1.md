# V2.1 免费行情、新闻聚合与在线股票池证据

验证日期：2026-09-09

- 平台入口：`/api/v1/acceptance/v2/v2.1`
- 来源能力：PASS（Tencent 行情、Eastmoney 新闻页、CLS 新闻页均 HTTP 200）；Sina 行情在本次 5 秒超时窗口内未完成，保留为 UNAVAILABLE，不影响“至少一个行情源、两个新闻源”的当前小样本门槛。
- 实时行情 Adapter：Tencent quote，按股票池批量请求并返回 `sourceId/observedAt/price`，股票池默认 3 只，硬上限 100。
- 新闻 Adapter：Eastmoney 与 CLS 实际页面抓取，结构化保存 `sourceId/title/observedAt/ingestedAt/availableAt/revision`；本次各取得一条标题记录，接口返回 `status: PASS`。重复新闻验收样本 `v2-news-001` 返回 `deduplicated: true`。
- 股票池限制：`PUT /api/v1/acceptance/v2/v2.1/watchlist` 超过 100 只返回 `WATCHLIST_LIMIT`（422）。
- 采样规则：`GET/PUT /api/v1/acceptance/v2/v2.1/sampling` 支持 20/30 分钟，固定返回 09:30–11:30、13:00–15:00 交易窗口和午休区间，不触发下单。
- 熔断恢复：统一场景 `recovery` PASS，Tencent 来源状态按 `HEALTHY → OPEN → HEALTHY` 恢复。
- 统一 TestRun：normal `3f5ff2ef-138a-4c33-b3b5-25fd25a46d7f`、rejection `c06b2e74-b7c4-4960-a01f-a8a169a4c1fa`、recovery `20d58d69-9e20-4b7e-9821-d72a78a26230`，三个运行均 `COMPLETED` 且断言 PASS。
- Web：V2.1 验收页面已提供来源、股票池、行情快照、新闻预览和 101 只拒绝操作。
- 自动验证：全仓 TypeScript typecheck PASS；Docker market-data/platform-api/web build PASS；来源烟测结果为 `PARTIAL`（Sina 超时）。

未覆盖：免费来源生产许可/长期限流额度、新闻正文/RSS 条目级解析、跨真实交易日的 20/30 分钟持续观察。因此 V2.1 版本验收仍需人工 Web/命令验收确认，不能仅凭自动运行标记通过。

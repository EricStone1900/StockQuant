# V2.1 免费行情、新闻聚合与在线股票池证据

验证日期：2026-09-09

- 平台入口：`/api/v1/acceptance/v2/v2.1`
- 来源能力：PASS（Tencent 行情、Eastmoney 新闻页、CLS 新闻页均 HTTP 200）；Sina 行情在本次 5 秒超时窗口内未完成，保留为 UNAVAILABLE，不影响“至少一个行情源、两个新闻源”的当前小样本门槛。
- 实时行情 Adapter：Tencent quote，按股票池批量请求并返回 `sourceId/observedAt/price`，股票池默认 3 只，硬上限 100。
- 新闻 Adapter：Eastmoney 与 CLS 实际页面抓取，结构化保存 `sourceId/title/observedAt/ingestedAt/availableAt/revision`；本次各取得一条标题记录，接口返回 `status: PASS`。重复新闻验收样本 `v2-news-001` 返回 `deduplicated: true`。
- 股票池限制：`PUT /api/v1/acceptance/v2/v2.1/watchlist` 超过 100 只返回 `WATCHLIST_LIMIT`（422）。
- Web：V2.1 验收页面已提供来源、股票池、行情快照、新闻预览和 101 只拒绝操作。
- 自动验证：全仓 TypeScript typecheck PASS；Docker market-data/platform-api/web build PASS；来源烟测结果为 `PARTIAL`（Sina 超时）。

未覆盖：免费来源生产许可/长期限流额度、新闻正文/RSS 条目级解析、20/30 分钟持续观察、来源熔断后的自动恢复。因此 V2.1 版本验收仍为 NOT_RUN，不能据此进入 V2.2。

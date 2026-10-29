# C5 按日线完成事实读取前序交易日

日期：2026-10-27。范围：持久日线精确读取子项，不启用 Candidate A 或来源调用。

新增平台服务 Bearer 保护的 `GET /v2/daily-bars/completions/sessions` 和生成客户端。查询必须指定 owner、账户、namespace、TestRun、递增的两个日期、来源、数据版本、模式及带时区的运行时刻。只返回指定时刻已可用的完成事实；缺少任一日期返回 null，指定条件下同一日期存在多个可用结果返回 409，非法参数返回 422。API 不选择交易日、不证明日期连续，也不推断可卖数量，后续协调器仍需校验日历和完整证券覆盖。

验证：`pnpm --filter @stockquant/market-data-service typecheck`、Platform typecheck、`pnpm contracts:check` 和 Market Data 服务身份单元测试均退出 0。隔离真实 PostgreSQL 测试经 `node scripts/run-isolated-postgres-command.mjs --url-env MARKET_DATA_DATABASE_URL:market_data_test:market_data_test -- pnpm --filter @stockquant/market-data-service exec vitest run tests/integration/v24-daily-bar-sessions.spec.ts` 退出 0，覆盖两日读取、缺日、可用时刻、跨 TestRun、来源和歧义版本；测试容器及网络清理核实。`pnpm --filter @stockquant/market-data-service sampling:http-restart-smoke` 最终退出 0，实际 HTTP 验证未认证 401、缺日 null、逆序 422 和服务重启后读取；无外部来源请求。首次 smoke 因旧测试仍引用 `eastmoney-rss` 而失败，修正为现有 `eastmoney-news` 后复验通过。

工作树 SHA-256：仓储 `5a7b399e8f75c18f9874719ab714b42fca8d6069fab47217644ea12ce896b145`；服务入口 `7064a0d311c7ff10b8ec46e48fd73ce5955c0951088ea5d5729c05b79badfc99`；数据库测试 `55b5d53a415503ac698c3bb8b0405c052e87718c55f6d75ee420ccfb14ae06d3`；OpenAPI `6640bd6885de02ae17b1dc36e79a37e90351d4b76b59477a1d7f0e02055d9711`。隔离镜像为 `sha256:9e9764474d0c70ceff17378a6eca55b00c98d2f4d564be06a8e82f2431b3caa2`；测试数据不是冻结验收 Fixture。此项尚未连接后台目标生成，也未运行 Web/CLI 同 Run 或用户验收；C5 保持 PENDING。

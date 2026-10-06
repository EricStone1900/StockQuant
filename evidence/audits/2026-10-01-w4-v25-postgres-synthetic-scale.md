# W4/V2.5 PostgreSQL 合成数据持久化切片

日期：2026-10-01（Asia/Shanghai）

## 结果

执行 `pnpm test:integration:market-data`，退出码 0。脚本强制连接专用 `market_data_test` 数据库，并拒绝正式 `market_data` 库。Market Data PostgreSQL 集成测试 23/23 通过，之后的分区回填 smoke 也通过（插入 1 行、重试 0 行、读取 1 行）。

新增集成场景通过真实 `MinuteImportRepository.publishStream` 将 1,200 行合成数据分六个 200 行批次写入 PostgreSQL 日分区，重复导入按内容键幂等；以 333 行分页完整读回 4 页，断言 20 个证券各有 60 个工作日会话样本、共 60 个会话日期且无重复键，并直接聚合分区表核对 1,200 行。证券过滤与版本隔离查询也通过。测试结束按 source SHA 清理导入记录，由外键级联清理其行数据。

输入是确定性合成值、每个证券/工作日仅一根 5 分钟样本，不是市场观察、不是 60 个交易日完整分钟序列，也不测试原始 CSV 解析器、生产导入队列、跨进程恢复、Qlib/PIT、真实行情容量或研究授权。数据清单标记 `researchUseAllowed=false`、许可 `UNCONFIRMED`。该结果只补强 PostgreSQL 持久写入、分区、幂等和分页路径证据，不能解除 V2.5/W4 的其他门禁。

首次普通沙箱执行因 loopback 访问限制在连接前返回 `EPERM`；同一仓库测试入口随后在受控本机测试库访问下成功。没有连接市场数据源，没有操作正式业务库或活动服务。

代码位置：[collection-run-postgres.spec.ts](../../services/market-data-service/tests/integration/collection-run-postgres.spec.ts)。

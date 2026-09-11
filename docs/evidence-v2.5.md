# V2.5 历史数据扩容与 V2 验收证据

验证日期：2026-09-11（Asia/Shanghai）。本次为小规模确定性扩容切片；数据为 `FIXTURE`，执行模式为 `BACKTEST`，券商为 `FAKE`，不代表全市场容量或收益有效性。

- normal：`fe37c045-962f-40be-84b1-36d33df08184`，`COMPLETED`；20 只证券 × 60 交易日、1200 行，扩容前后规范结果 Hash 一致，PIT/Walk-forward、缓存隔离和资源预算断言通过。
- rejection：`9996f785-fd7c-4912-b839-c6e0389f4c9f`，`COMPLETED`；超并发、跨 DataVersion 缓存和资源预算超限均拒绝，未发布半成品。
- recovery：`0727a1c4-ed36-4ae8-9a94-543d287cdc68`，`COMPLETED`；从游标 640 恢复，重复行 0，取消任务不发布半成品并保留证据。
- 同 Run 只读核对：normal `--check-only` 退出码 0，未创建新业务副作用。
- 证据导出：`evidence/local/V2.5/fe37c045-962f-40be-84b1-36d33df08184`；Manifest SHA-256 `2b82e57e7c54a04b9628adbf39ad856274d68c90093c8a4ed119b93b9c3b690e`。
- Web E2E：`PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 pnpm test:e2e -- --stage V2.5`，1/1 通过。
- 代码/基础检查：类型检查、构建、平台单元测试 19/19、`verify:stage --suite code`、契约/Fixture/Markdown 检查通过。
- 架构证据：`linux/amd64-emulated`；S2 资源预算 1024 MB / 120 秒，最新运行时测量见下文。
- V2.4 20 个实际交易日观察仍由独立定时任务累计，当前门禁保持 `V2.4_20_TRADING_DAYS_PENDING`；V2.5 不据此宣称 V2 全部通过。

Mac 监控池实测（2026-09-11，Apple Silicon `darwin/arm64`）：`pnpm v25:monitor-capacity` 先从 Tencent 返回结果中筛选有效证券，再依次写入并采集 50/80/100 只股票；配置数、采样数和有效 `LIVE_SOURCE` 数量分别为 50/50/50、80/80/80、100/100/100，耗时 65ms、61ms、58ms，服务上限 100，原 3 只监控池已恢复，质量门禁 PASS。该结果证明在线监控池的数量与时间戳质量路径可承载，不代表历史全市场容量。

BaoStock 只读探针（2026-09-11，`pnpm v25:probe-baostock`）：`sh.600000` 日线返回 7 行、5 分钟返回 336 行，均 `errorCode=0`；1 分钟请求返回 `10004012 请求数据类型不正确`。`query_all_stock(2024-01-05)` 返回 5,639 个证券，另对前 20 个证券执行 2019-01-01 至 2024-12-31 日线查询，均返回 1,456 行且 `errorCode=0`。探针状态仍为 `PARTIAL`：该结果证明免费源具备较大股票宇宙和多年日线读取能力，但不是全市场多年导入/存储/限频/许可验收，也不证明 1 分钟能力。

全市场多年数据容量验证：`NOT_RUN`。当前仓库仅有 V2.2 的 6 行分钟 Fixture 与 V2.3 的 4 行回放 Fixture，没有带版本 Manifest 的全市场多年分钟数据、许可/覆盖证明或目标 Ubuntu 实机；不能用合成扩展结果代替该门禁。

复核修正（2026-09-11）：V2.5 normal `testRunId=7fd708cd-c040-4142-902b-618008d2b601` 的资源断言改为运行时测量，实际处理 1200 行，容器 RSS `230 MB`、耗时 `0.000 秒`，预算为 `1024 MB / 120 秒`；不再写入固定的 384 MB / 4 秒。

最终 CLI 复核（2026-09-11）：normal `verify:stage` 运行 ID 由命令新建并退出 0；rejection `aad9a92f-6ed6-4bf2-b4dd-125825333a3a`、recovery `ad5b6860-974f-4223-8459-185b93b7e7bc` 均 `COMPLETED` 且全部断言 `PASS`。此前导出的 normal 证据目录与 Manifest 保持不变。

已知限制：当前仅覆盖 S2 小规模 Fixture；全市场多年数据的真实导入/存储/恢复容量、真实 Ubuntu、真实财务/行业 PIT、长期容量和用户人工验收尚未完成。

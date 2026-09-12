# V2.5 历史数据扩容与 V2 验收证据

验证日期：2026-09-12（Asia/Shanghai）。本次包含小规模确定性扩容切片、BaoStock 全市场多年日线导入和分钟抽样；Fixture 数据执行模式为 `BACKTEST`，券商为 `FAKE`，不代表分钟级全市场容量或收益有效性。

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

BaoStock 只读探针（2026-09-12，`BAOSTOCK_CAPACITY_SAMPLE=5 BAOSTOCK_MINUTE_SAMPLE=20 pnpm v25:probe-baostock`）：`query_all_stock(2024-01-05)` 返回 5,639 个证券，`query_stock_basic` 筛选出 5,219 个已上市 A 股；5 个 A 股多年日线样本均返回 1,456 行，20 个 A 股 5 分钟样本均返回 336 行且 `errorCode=0`。`sh.600000` 的 1 分钟请求仍返回 `10004012 请求数据类型不正确`，探针状态为 `PARTIAL`。该结果证明免费源具备日线和 5 分钟抽样读取能力，不是分钟级全市场多年导入/存储/限频/许可验收。

限频/会话稳定性验证（2026-09-12）：新增 `scripts/probe-baostock-stability.py`，设计为 20 标的×3 轮只读 5 分钟查询并重新登录恢复。实际运行在重复查询阶段超过 2 分钟无返回，受控停止；缩小到 5 标的×2 轮后仍在首轮查询阶段无返回，未取得可计入 PASS 的稳定性证据。结论为 `UNVERIFIED`，提示当前 BaoStock 连接存在吞吐/等待限制；不得据此宣称长期限频稳定。

BaoStock 分区导入验证（2026-09-11）：新增 `scripts/import-baostock-daily.py`，通过 `query_stock_basic` 筛选 `type=1,status=1` 的已上市 A 股；宇宙 8,950 条，其中已上市股票 5,219 条。5 标的档完成 7,280 行写入，Manifest、逐证券 CSV 和 SHA-256 均生成；100 标的档完成 145,021 行写入。首次运行因 BaoStock 会话冲突在 38 个证券后中断，已保留 checkpoint；同一输出目录续跑完成 100/100，重跑不会重复查询已完成证券，证明中断恢复和幂等路径。该验证仍是 100 标的容量档，不代表 5,219 标的全量导入容量。

500 标的容量档（2026-09-11）：同一导入器完成 500/500 个证券、727,421 行、500 个分区 CSV，磁盘占用 54,120,176 bytes（约 51.6 MiB），Manifest `COMPLETED` 且无错误字段；同目录幂等重跑退出 0，产物数量和行数保持不变。该结果可作为全量导入前的压力基线，仍不等同于 5,219 标的全量验收。

全量预检与导入（2026-09-12）：500 档实测推算 5,219 标的约需 538.7 MiB；本机 `/tmp` 可用空间约 183 GiB，磁盘不是阻塞因素。随后使用 `--sample-size 5219` 完成全量导入：5,219/5,219 个已上市 A 股、6,260,343 行、5,219 个分区 CSV，磁盘占用 469,866,998 bytes（约 0.438 GiB）。Manifest 为 `COMPLETED` 且无错误字段；逐文件行数与 SHA-256 校验 5,219/5,219 全部匹配。该结果证明本机环境下全量多年日线导入可完成，但不覆盖分钟级全量、长期限频稳定性或 Ubuntu 实机。

全市场多年日线数据容量验证：`PARTIAL_PASS`。5,219 标的全量导入、磁盘产物和逐文件完整性已通过；分钟级全量、长期限频/恢复稳定性及目标 Ubuntu 实机仍未验证，因此 V2.5 全部容量门禁不能标记 PASS。

复核修正（2026-09-11）：V2.5 normal `testRunId=7fd708cd-c040-4142-902b-618008d2b601` 的资源断言改为运行时测量，实际处理 1200 行，容器 RSS `230 MB`、耗时 `0.000 秒`，预算为 `1024 MB / 120 秒`；不再写入固定的 384 MB / 4 秒。

最终 CLI 复核（2026-09-11）：normal `verify:stage` 运行 ID 由命令新建并退出 0；rejection `aad9a92f-6ed6-4bf2-b4dd-125825333a3a`、recovery `ad5b6860-974f-4223-8459-185b93b7e7bc` 均 `COMPLETED` 且全部断言 `PASS`。此前导出的 normal 证据目录与 Manifest 保持不变。

已知限制：分钟级全市场多年导入/存储/恢复容量、BaoStock 长期限频/会话稳定性、真实 Ubuntu、真实财务/行业 PIT 和用户人工验收尚未完成。

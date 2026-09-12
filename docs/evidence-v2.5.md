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

限频/会话稳定性验证（2026-09-12）：`scripts/probe-baostock-stability.py` 已改为每个 5 分钟查询在独立进程和独立会话执行，由父进程强制超时回收；默认 30 秒，可由 `BAOSTOCK_STABILITY_QUERY_TIMEOUT_SECONDS` 配置。实测 `1 标的×1 轮、5 秒超时`：`sh.600000` 查询及随后独立恢复查询均准确记录为 `TIMEOUT`（约 5.00 秒），命令退出 0 且 JSON 状态为 `PARTIAL`，不再无限等待。该结果验证了失败边界与可观测性，不是上游稳定性 PASS；长期限频/会话稳定性仍为 `UNVERIFIED`。

BaoStock 分区导入验证（2026-09-11）：新增 `scripts/import-baostock-daily.py`，通过 `query_stock_basic` 筛选 `type=1,status=1` 的已上市 A 股；宇宙 8,950 条，其中已上市股票 5,219 条。5 标的档完成 7,280 行写入，Manifest、逐证券 CSV 和 SHA-256 均生成；100 标的档完成 145,021 行写入。首次运行因 BaoStock 会话冲突在 38 个证券后中断，已保留 checkpoint；同一输出目录续跑完成 100/100，重跑不会重复查询已完成证券，证明中断恢复和幂等路径。该验证仍是 100 标的容量档，不代表 5,219 标的全量导入容量。

500 标的容量档（2026-09-11）：同一导入器完成 500/500 个证券、727,421 行、500 个分区 CSV，磁盘占用 54,120,176 bytes（约 51.6 MiB），Manifest `COMPLETED` 且无错误字段；同目录幂等重跑退出 0，产物数量和行数保持不变。该结果可作为全量导入前的压力基线，仍不等同于 5,219 标的全量验收。

全量预检与导入（2026-09-12）：500 档实测推算 5,219 标的约需 538.7 MiB；本机 `/tmp` 可用空间约 183 GiB，磁盘不是阻塞因素。随后使用 `--sample-size 5219` 完成全量导入：5,219/5,219 个已上市 A 股、6,260,343 行、5,219 个分区 CSV，磁盘占用 469,866,998 bytes（约 0.438 GiB）。Manifest 为 `COMPLETED` 且无错误字段；逐文件行数与 SHA-256 校验 5,219/5,219 全部匹配。该结果证明本机环境下全量多年日线导入可完成，但不覆盖分钟级全量、长期限频稳定性或 Ubuntu 实机。

归档/恢复验证（2026-09-12）：将上述数据集归档到项目已忽略的本地路径 `data/local/baostock-daily-2019-2024-v1`（459 MiB）；从该归档创建隔离恢复副本 `/tmp/stockquant-baostock-daily-restore-verify-v1` 后，Manifest `COMPLETED`、5,219/5,219 个完成分区、6,260,343 行及 5,219/5,219 SHA-256 均通过。归档内容不提交 Git，保留源端/时间范围与文件完整性信息。

5 分钟 20×约60交易日真实导入验证（2026-09-12）：`scripts/import-baostock-minute-sample.py` 已修正跨进程队列读取顺序：父进程先消费行集再等待子进程退出，避免大结果集的队列馈送阻塞；同时加入每标的最多 3 次的有限重试并记录实际尝试。`sh.600000` 单标的返回 2,784 行；5 标的完成 13,920 行；同一 Manifest 从检查点续跑至 20/20 标的、55,680 行，每标的 2,784 行。20 个 CSV 的 SHA-256、证券代码、重复时间戳和 OHLC 范围校验均通过；一次 `10001001 用户未登录` 在续跑时由独立会话重试恢复。产物位于 Git 忽略的 `data/local/baostock-minute-20x60-v1`。

备用免费源实测（2026-09-12）：东方财富经 AKShare `stock_zh_a_hist_min_em(period="5")` 在本机被远端断开，未取得样本；新浪经 AKShare `stock_zh_a_minute(period="5")` 返回 1,970 行，覆盖 2026-07-16 至 2026-09-11，约 40 个交易日；腾讯公开分钟端点返回最近 320 根，覆盖 2026-09-03 至 2026-09-11，约 7 个交易日。新浪和腾讯可作为近期数据降级路径，但均不能满足 60 个交易日历史导入，当前没有经过本机实测且可替代 BaoStock 的免费 60 日备用源。

PIT 能力核验（2026-09-12，`pnpm v25:probe-baostock-pit`）：`sh.600000` 的 2024 年一季度财务查询返回 `pubDate=2024-04-30` 和 `statDate=2024-03-31`，字段级财务可见时间为 `PARTIAL`，可作为后续按 `availableAt=pubDate` 过滤的输入。该接口未提供修订链、原始来源 Artifact 或历史证券池；行业查询仅返回当前 `updateDate=2026-09-07`、行业名称和分类，缺少历史有效区间、修订链及历史成分，状态为 `NOT_AVAILABLE`。因此财务/行业因子保持禁用，不把当前行业分类回填到历史决策。

全市场多年日线数据容量验证：`PARTIAL_PASS`。5,219 标的全量导入、磁盘产物和逐文件完整性已通过；分钟级全量、长期限频/恢复稳定性仍未验证，因此 V2.5 全部容量门禁不能标记 PASS。Ubuntu 实机人工子项另行记录如下。

Ubuntu 实机人工验收（2026-09-12）：用户已确认 Ubuntu 实机验证通过。该确认作为人工验收子项记录；由于未提供主机版本、CPU 架构、镜像摘要、实际命令和日志路径，本记录不补写未提供的技术细节，后续可追加原始证据链接。

复核修正（2026-09-11）：V2.5 normal `testRunId=7fd708cd-c040-4142-902b-618008d2b601` 的资源断言改为运行时测量，实际处理 1200 行，容器 RSS `230 MB`、耗时 `0.000 秒`，预算为 `1024 MB / 120 秒`；不再写入固定的 384 MB / 4 秒。

最终 CLI 复核（2026-09-11）：normal `verify:stage` 运行 ID 由命令新建并退出 0；rejection `aad9a92f-6ed6-4bf2-b4dd-125825333a3a`、recovery `ad5b6860-974f-4223-8459-185b93b7e7bc` 均 `COMPLETED` 且全部断言 `PASS`。此前导出的 normal 证据目录与 Manifest 保持不变。

自动验收复核（2026-09-12）：`pnpm verify:stage -- --stage V2.5 --scenario normal --seed 20260907` 生成 `fbad155b-3b64-40d6-9955-b6cb3f2d2ef6`，5/5 断言通过；rejection `045bcf69-808a-4457-87b7-330010f792a6` 3/3 预期拒绝断言通过；recovery `a2c5025c-fec6-48f7-b9f0-201f7dfddfa9` 3/3 恢复/取消断言通过。随后 `pnpm verify:stage -- --stage V2.5 --suite code` 通过构建、lint、类型检查、36 项工作区单元测试、契约和 Fixture 校验。以上为自动验收事实，不替代 V2.5 整体人工签署。

已知限制：分钟级全市场多年导入/存储/恢复容量、BaoStock 长期限频/会话稳定性、可覆盖 60 个交易日的第二免费分钟源、带修订链的真实财务/行业 PIT、V2.5 整体人工验收和 V2.4 20 个实际交易日观察尚未完成；Ubuntu 实机人工子项已确认通过。

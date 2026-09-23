# V2.5 历史数据扩容与 V2 验收证据

2026-09-23 TDX 候选源适配与复核：新增可选 easy-tdx 分钟适配器，锁定 Git commit
`4820b4a0496899ece0b8ca4d7f4d66a5159da7f8`，默认正式来源仍为 `sina,baostock`。适配器
48/48、ruff、mypy、全仓 lint/typecheck/test 和文档检查通过；3 只证券只读探针返回
144/144 根 Bar，20 只证券盘后批量烟测返回 960/960 根 Bar。该候选源尚未完成实际交易日、
限频恢复和正式调度门禁，不能替代 V2.4/DC-08A 观察或 60 日第二在线免费源验收。详细服务器、
延迟、Hash 和未完成门禁见[TDX候选源审计](../evidence/audits/2026-09-23-tdx-source-switch.md)。

2026-09-19 计划复核：V2.5 code suite 重新通过；5分钟历史备用源探针 PASS，BaoStock 与 Sina 均返回 3 个样本证券的有效结果，证据为 `evidence/local/V2.5/minute-source-probe-20260919.json`。该探针的 `liveSession` 明确为 `NOT_RUN`，因此不替代真实交易日观察。BaoStock PIT 探针仍为 `PARTIAL`：财务字段存在公告日期，但缺少修订链、来源 Artifact/溯源和历史证券集合；行业分类缺少历史有效区间、修订链及历史成分，不能解除真实 PIT 门禁。

2026-09-20 V2.5 阶段证据刷新：当前 HEAD 上 `verify:stage --suite code` 通过，V2.5 Web E2E 1/1 通过；normal `e033c817-d521-40a8-892c-3c5b8098ea4c` 的 6/6 断言、rejection `17057748-135a-4337-a726-e654f97ed565` 的 3/3 断言、recovery `d3fefb85-2fb9-42c2-9cc1-adefba08af77` 的 3/3 断言全部通过。normal 同 Run `--check-only` 退出码 0，未创建新业务副作用；正式导出目录为 `evidence/local/V2.5/e033c817-d521-40a8-892c-3c5b8098ea4c`，Manifest SHA-256 为 `f2a8f76cfe03fb5f4a76988812d20c46ff1eca562dadb5027344bd277ff1f575`。自动证据仍不替代 V2.5 人工验收、V2.4 20 个实际交易日观察或真实交易时段长期稳定性门禁。

2026-09-20 用户人工验收确认：用户在 `http://127.0.0.1:8080/acceptance/v2/v2.5` 复核 V2.5 页面、S2 配置、自动场景证据和导出 Manifest，确认验收通过。该确认只关闭 V2.5 页面/场景人工验收，不关闭 V2.4 20 个实际交易日、真实交易时段长期稳定性、60 日备用源或 PIT 修订链门禁。

2026-09-20 BaoStock 修复诊断：原适配器固定的 `baostock==0.8.9` 使用旧 `www.baostock.com:10030` 端点并在登录阶段返回 `10002007`；临时验证 `baostock==0.9.3` 已切换至 `public-api.baostock.com:10030`，匿名登录返回 `errorCode=0`。项目已升级并重新生成 `uv.lock`/`requirements.lock`，适配器同时保留原始登录/查询错误码。新版单证券历史查询仍需在有界超时内继续验证，因此本条只证明旧版端点兼容问题已修复，不将 BaoStock 稳定性门禁改为 PASS。

2026-09-20 BaoStock 修复复核：此前稳定性探针的 `TIMEOUT` 根因是循环遗漏 `query.get_row_data()`，不是接口分页失败；修复后两轮×三证券×60交易日及独立恢复查询均 `PASS`，每次返回2,784条。正式适配器容器同窗口查询也返回2,784条，且时间字段已从 0.9.3 的 `YYYYMMDDHHMMSSmmm` 正确归一化为 09:30–15:00 的5分钟窗口。适配器现对批次映射、行结构、证券代码、重复 Bar 和分页错误进行显式校验；容器持久健康状态已恢复为 `baostock=CLOSED, failures=0`。该有界结果证明查询、分页和恢复路径可用，但不替代真实交易时段长期限频/恢复观察，后者仍为 `NOT_RUN`。

验证日期：2026-09-19（Asia/Shanghai，自动复核批次；早期批次仍保留在本文件历史记录中）。本次包含小规模确定性扩容切片、BaoStock 全市场多年日线导入和分钟抽样；Fixture 数据执行模式为 `BACKTEST`，券商为 `FAKE`，不代表分钟级全市场容量或收益有效性。

- normal：`3bee90bc-2c75-4ebb-989e-07be04b80069`，`COMPLETED`；断言 6/6 PASS。
- rejection：`4f3de864-8604-4efb-8118-a54fffea3742`，`COMPLETED`；断言 3/3 PASS。
- recovery：`0391745a-de9d-4e37-a0c9-0110e5052e9d`，`COMPLETED`；断言 3/3 PASS。
- 同 Run 只读核对：normal `--check-only` 退出码 0，未创建新业务副作用。
- 证据导出：`evidence/local/3bee90bc-2c75-4ebb-989e-07be04b80069`；Manifest SHA-256 `0603d5260a4c2007c3fd6b807e4934ccb8d53d8f2956852041b5b4e1fc28e885`。
- Web E2E：`PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 pnpm test:e2e -- --stage V2.5`，1/1 通过。
- 代码/基础检查：类型检查、构建、适配器单元测试 32/32、平台单元测试、`verify:stage --suite code`、契约/Fixture/Markdown 检查通过。
- 架构证据：`linux/amd64-emulated`；S2 资源预算 1024 MB / 120 秒，最新运行时测量见下文。
- V2.4 20 个实际交易日观察仍由独立定时任务累计，当前门禁保持 `V2.4_20_TRADING_DAYS_PENDING`；V2.5 不据此宣称 V2 全部通过。

Mac 监控池实测（2026-09-11，Apple Silicon `darwin/arm64`）：`pnpm v25:monitor-capacity` 先从 Tencent 返回结果中筛选有效证券，再依次写入并采集 50/80/100 只股票；配置数、采样数和有效 `LIVE_SOURCE` 数量分别为 50/50/50、80/80/80、100/100/100，耗时 65ms、61ms、58ms，服务上限 100，原 3 只监控池已恢复，质量门禁 PASS。该结果证明在线监控池的数量与时间戳质量路径可承载，不代表历史全市场容量。

BaoStock 只读探针（2026-09-12，`BAOSTOCK_CAPACITY_SAMPLE=5 BAOSTOCK_MINUTE_SAMPLE=20 pnpm v25:probe-baostock`）：`query_all_stock(2024-01-05)` 返回 5,639 个证券，`query_stock_basic` 筛选出 5,219 个已上市 A 股；5 个 A 股多年日线样本均返回 1,456 行，20 个 A 股 5 分钟样本均返回 336 行且 `errorCode=0`。`sh.600000` 的 1 分钟请求仍返回 `10004012 请求数据类型不正确`，探针状态为 `PARTIAL`。该结果证明免费源具备日线和 5 分钟抽样读取能力，不是分钟级全市场多年导入/存储/限频/许可验收。

限频/会话稳定性验证（2026-09-12）：`scripts/probe-baostock-stability.py` 已改为每个 5 分钟查询在独立进程和独立会话执行，由父进程强制超时回收；默认 30 秒，可由 `BAOSTOCK_STABILITY_QUERY_TIMEOUT_SECONDS` 配置。实测 `2 标的×1 轮、10 秒超时`：两个查询及随后独立恢复查询均准确记录为 `TIMEOUT`（约 10.00 秒），命令退出 0 且 JSON 状态为 `PARTIAL`，不再无限等待。该结果验证了失败边界与可观测性，不是上游稳定性 PASS；长期限频/会话稳定性仍为 `UNVERIFIED`，50→100 容量档暂不启动。

BaoStock 分区导入验证（2026-09-11）：新增 `scripts/import-baostock-daily.py`，通过 `query_stock_basic` 筛选 `type=1,status=1` 的已上市 A 股；宇宙 8,950 条，其中已上市股票 5,219 条。5 标的档完成 7,280 行写入，Manifest、逐证券 CSV 和 SHA-256 均生成；100 标的档完成 145,021 行写入。首次运行因 BaoStock 会话冲突在 38 个证券后中断，已保留 checkpoint；同一输出目录续跑完成 100/100，重跑不会重复查询已完成证券，证明中断恢复和幂等路径。该验证仍是 100 标的容量档，不代表 5,219 标的全量导入容量。

500 标的容量档（2026-09-11）：同一导入器完成 500/500 个证券、727,421 行、500 个分区 CSV，磁盘占用 54,120,176 bytes（约 51.6 MiB），Manifest `COMPLETED` 且无错误字段；同目录幂等重跑退出 0，产物数量和行数保持不变。该结果可作为全量导入前的压力基线，仍不等同于 5,219 标的全量验收。

全量预检与导入（2026-09-12）：500 档实测推算 5,219 标的约需 538.7 MiB；本机 `/tmp` 可用空间约 183 GiB，磁盘不是阻塞因素。随后使用 `--sample-size 5219` 完成全量导入：5,219/5,219 个已上市 A 股、6,260,343 行、5,219 个分区 CSV，磁盘占用 469,866,998 bytes（约 0.438 GiB）。Manifest 为 `COMPLETED` 且无错误字段；逐文件行数与 SHA-256 校验 5,219/5,219 全部匹配。该结果证明本机环境下全量多年日线导入可完成，但不覆盖分钟级全量、长期限频稳定性或 Ubuntu 实机。

归档/恢复验证（2026-09-12）：将上述数据集归档到项目已忽略的本地路径 `data/local/baostock-daily-2019-2024-v1`（459 MiB）；从该归档创建隔离恢复副本 `/tmp/stockquant-baostock-daily-restore-verify-v1` 后，Manifest `COMPLETED`、5,219/5,219 个完成分区、6,260,343 行及 5,219/5,219 SHA-256 均通过。归档内容不提交 Git，保留源端/时间范围与文件完整性信息。

5 分钟 20×约60交易日真实导入验证（2026-09-12）：`scripts/import-baostock-minute-sample.py` 已修正跨进程队列读取顺序：父进程先消费行集再等待子进程退出，避免大结果集的队列馈送阻塞；同时加入每标的最多 3 次的有限重试并记录实际尝试。`sh.600000` 单标的返回 2,784 行；5 标的完成 13,920 行；同一 Manifest 从检查点续跑至 20/20 标的、55,680 行，每标的 2,784 行、58 个实际交易日。20 个 CSV 的 SHA-256、证券代码、重复时间戳和 OHLC 范围校验均通过；一次 `10001001 用户未登录` 在续跑时由独立会话重试恢复。产物位于 Git 忽略的 `data/local/baostock-minute-20x60-v1`。

5 分钟 20×严格60交易日历史覆盖验证（2026-09-16）：使用既有只读入口 `pnpm v25:import-baostock-minute-sample -- --sample-size 20 --start-date 2024-01-02 --end-date 2024-04-02 --output-dir data/local/baostock-minute-20x60-2024-01-02-2024-04-02-v1 --continue-on-error`，不修改正式订阅、定时任务或既有58日样本。Manifest 为 `COMPLETED`：冻结的20只证券全部完成，合计57,600根5分钟 Bar；每只2,880根，覆盖相同的60个交易日（2024-01-02至2024-04-02）和每日48个窗口。逐文件复算 SHA-256 与 Manifest 记录20/20匹配；逐证券日期数、行数、每日窗口数和无重复 `date+time` 均为20/20通过。`pnpm data:test-coverage` 8/8通过。产物仍位于 Git 忽略的本地目录；它满足历史数据覆盖的技术证据，但不替代 DC-08A 的真实盘中运行，也不将V2.4的20个实际交易日观察缩短。

DC-T23 真实归档回放（2026-09-16）：新增 `pnpm v25:replay-baostock-minute`，读取上述 Manifest 的20个分区文件，转换为既有 V2.3 MINUTE_BAR 回放输入，逐证券执行下一 Bar/10% 参与率/费用规则，并核对确定性回放结果。20/20 证券均 `PASS`，断点恢复无重复成交、资金与 NAV 校验通过；报告为 `evidence/dc08a/historical-replay-2026-09-16.json`，源 Manifest SHA-256 为 `729793b462b25951bae2f032ea2eefc3c1ef86689a1c7882b908a24b68417c5f`。该报告只证明历史归档回放和数据质量，不替代真实盘中观察。

备用免费源实测（2026-09-12）：东方财富经 AKShare `stock_zh_a_hist_min_em(period="5")` 在本机被远端断开，未取得样本；新浪经 AKShare `stock_zh_a_minute(period="5")` 返回 1,970 行，覆盖 2026-07-16 至 2026-09-11，约 40 个交易日；腾讯公开分钟端点返回最近 320 根，覆盖 2026-09-03 至 2026-09-11，约 7 个交易日。新浪和腾讯可作为近期数据降级路径，但均不能满足 60 个交易日历史导入，当前没有经过本机实测且可替代 BaoStock 的免费 60 日备用源。

本地通达信文件备用通道（2026-09-12）：新增 `pnpm v25:import-tdx-minute-sample -- --tdx-dir /绝对路径/通达信数据根目录 --symbols sh600000,sz000001 --start-date 2024-01-02 --end-date 2024-03-29 --output-dir data/local/tdx-minute-5`。该命令只读取用户既有的 `fzline/*.lc5`（或 `.5`）文件，逐证券输出规范 5 分钟 CSV 以及包含源文件/输出 SHA-256 的 Manifest；不会联网、下载或改写源数据。当前工作区未提供此类文件，已验证缺文件时以 `FAIL` 退出且不宣称导入成功，实际 60 个交易日导入状态为 `NOT_RUN`，待提供合法本地文件后执行。

PIT 能力核验（2026-09-12，`pnpm v25:probe-baostock-pit`）：`sh.600000` 的 2024 年一季度财务查询返回 `pubDate=2024-04-30` 和 `statDate=2024-03-31`，字段级财务可见时间为 `PARTIAL`，可作为后续按 `availableAt=pubDate` 过滤的输入。该接口未提供修订链、原始来源 Artifact 或历史证券池；行业查询仅返回当前 `updateDate=2026-09-07`、行业名称和分类，缺少历史有效区间、修订链及历史成分，状态为 `NOT_AVAILABLE`。因此财务/行业因子保持禁用，不把当前行业分类回填到历史决策。

全市场多年日线数据容量验证：`PARTIAL_PASS`。5,219 标的全量导入、磁盘产物和逐文件完整性已通过；分钟级全量、长期限频/恢复稳定性仍未验证，因此 V2.5 全部容量门禁不能标记 PASS。Ubuntu 实机人工子项另行记录如下。

Ubuntu 实机人工验收（2026-09-12）：用户已确认 Ubuntu 实机验证通过。该确认作为人工验收子项记录；由于未提供主机版本、CPU 架构、镜像摘要、实际命令和日志路径，本记录不补写未提供的技术细节，后续可追加原始证据链接。

复核修正（2026-09-11）：V2.5 normal `testRunId=7fd708cd-c040-4142-902b-618008d2b601` 的资源断言改为运行时测量，实际处理 1200 行，容器 RSS `230 MB`、耗时 `0.000 秒`，预算为 `1024 MB / 120 秒`；不再写入固定的 384 MB / 4 秒。

最终 CLI 复核（2026-09-11）：normal `verify:stage` 运行 ID 由命令新建并退出 0；rejection `aad9a92f-6ed6-4bf2-b4dd-125825333a3a`、recovery `ad5b6860-974f-4223-8459-185b93b7e7bc` 均 `COMPLETED` 且全部断言 `PASS`。此前导出的 normal 证据目录与 Manifest 保持不变。

自动验收复核（2026-09-12）：`pnpm verify:stage -- --stage V2.5 --scenario normal --seed 20260907` 生成 `fbad155b-3b64-40d6-9955-b6cb3f2d2ef6`，5/5 断言通过；rejection `045bcf69-808a-4457-87b7-330010f792a6` 3/3 预期拒绝断言通过；recovery `a2c5025c-fec6-48f7-b9f0-201f7dfddfa9` 3/3 恢复/取消断言通过。随后 `pnpm verify:stage -- --stage V2.5 --suite code` 通过构建、lint、类型检查、36 项工作区单元测试、契约和 Fixture 校验。以上为自动验收事实，不替代 V2.5 整体人工签署。

已知限制：分钟级全市场多年导入/存储/恢复容量、BaoStock 长期限频/会话稳定性、可覆盖 60 个交易日的第二在线免费分钟源、TDX 本地文件的实际导入验证、带修订链的真实财务/行业 PIT、V2.5 整体人工验收和 V2.4 20 个实际交易日观察尚未完成；Ubuntu 实机人工子项已确认通过。

100 只分钟容量分阶段验证（2026-09-17）：使用 `pnpm v25:import-baostock-minute-sample -- --sample-size 100 --start-date 2024-01-02 --end-date 2024-04-02 --output-dir data/local/baostock-minute-100x60-2024-01-02-2024-04-02-v1 --continue-on-error` 完成 100/100 个冻结证券、288,000 根 5 分钟 Bar；随后运行 `pnpm v25:validate-baostock-minute -- --manifest data/local/baostock-minute-100x60-2024-01-02-2024-04-02-v1/manifest.json --expected-securities 100 --output evidence/dc08a/historical-coverage-100x60-2024-01-02-2024-04-02.json`，逐文件 SHA、重复键、OHLCV 和每日48窗口全部 PASS。Manifest SHA-256 为 `5f80293b33ee23ad6ecd4a2141ea274eeb883d0215724ee0ed405d7596505e1b`，本地目录约 25 MiB。该结果仅通过 100 只分阶段容量门禁，不代表 500/1000 只或全市场分钟容量。

来源诊断复核（2026-09-15）：只读探针对 `sh.600000`、`sz.000001`、`sh.600519` 执行
2024-01-02 至 2024-01-10 的 5 分钟历史查询；BaoStock 三个标的均返回 336 行且
`errorCode=0`，Sina 三个标的均 HTTP 200 返回 1,970 行，探针总体 `PASS`。输出保存在
`evidence/local/V2.5/minute-source-probe-20260915.json`（原始探针输出位于本机临时目录）；该结果证明历史读取能力，不替代真实盘中
主源稳定性或 60 日备用源验收。

Mac 50/80/100 监控池复验（2026-09-15）：受控执行 `pnpm v25:monitor-capacity`，平台
`darwin/arm64`，Tencent LIVE_SOURCE 路径下 50、80、100 三档均配置数=采样数=LIVE 数，
耗时分别约 55ms、61ms、64ms，最大池限制 100，全部 `pass=true`；原有 3 标的股票池已恢复。
该结果仅覆盖在线快照监控池，不代表分钟历史全市场容量。

BaoStock 稳定性探针（2026-09-15）：使用 `UV_CACHE_DIR=.uv-cache pnpm v25:probe-baostock-stability`
执行 3 轮、3 个标的、每请求 30 秒上限及一次重连探针。9 次查询与重连均达到超时，结果为
`PARTIAL`，未取得成功行数；该结果明确证明当前网络/会话条件下长期稳定性不能标记 PASS，
BaoStock 主源仍需在可用网络和实际交易日继续观察。

免费分钟源能力复验（2026-09-15）：受控网络执行 `UV_CACHE_DIR=.uv-cache pnpm v25:probe-minute-sources`
返回总体 `PASS`。BaoStock 三个标的各返回 336 行（2024-01-02 至 2024-01-10），字段完整且
`errorCode=0`；Sina 三个标的均 HTTP 200、各返回 1,970 行（约覆盖 2026-07-20 至 2026-09-15）。
该结果证明两条历史读取路径当前可用，但 Sina 回溯长度仍不足 60 个交易日，且 liveSession 保持
`NOT_RUN`，不能替代 60 日备用源或盘中稳定性验收。

PostgreSQL 数据采集集成复验（2026-09-15）：使用本地 Docker PostgreSQL 执行
`MARKET_DATA_DATABASE_URL=postgresql://market_data:market_data_local_only@localhost:5433/market_data pnpm --filter @stockquant/market-data-service exec vitest run tests/integration/collection-run-postgres.spec.ts`，15/15 通过，覆盖分区运行、检查点、租约接管、恢复、配额和项目隔离；不代表分钟级全市场容量。

V2.5 代码套件复验（2026-09-15）：执行 `pnpm verify:stage -- --stage V2.5 --suite code`，文档链接 403/403、契约 19/19、Fixture 8/8、全仓构建、lint、类型检查及各服务单测全部通过，退出码 0。该结果证明代码回归通过，不改变 V2.5 实际数据容量和人工验收门禁。

V2.5 Web 端到端复验（2026-09-15）：执行
`PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 pnpm test:e2e -- --stage V2.5`，V2.5
扩容页回归与恢复证据场景 1/1 通过，退出码 0。该结果证明 Web 页面可读取既有证据，
不替代真实来源、容量和人工观察门禁。

项目级门禁复验（2026-09-15）：`pnpm verify:compat -- --platform linux/arm64`
返回 `PASS`（容器 `linux/arm64`、Node `v24.1.0`）。`pnpm verify:version -- --version V2`
按设计返回退出码 1（`NOT_PASS`），明确列出 V2.3 补偿/完整恢复编排、V2.4 20 个交易日
观察以及 V2.5 分钟全量/长期稳定性/60 日备用源等未满足门禁；该非零结果为预期，不是测试故障。

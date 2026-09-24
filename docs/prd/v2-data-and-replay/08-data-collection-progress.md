# 共享数据采集：进度、问题及接续记录

建立日期：2026-09-20；最近更新：2026-09-24；计划版本1.7。入口：[开发计划](./06-shared-data-collection-plan.md)、[测试手册](./07-data-collection-tests.md)。此文件是开发接续的主记录，业务进度不得只留在聊天中。

## 1. 状态规则

开发状态用TODO / IN_PROGRESS / BLOCKED / DONE；测试用NOT_RUN / PASS / FAIL；运行等待用WAITING；人工验收独立记录。DONE必须有实现和所需测试证据。文档已编写不表示业务已实现；历史脚本通过不能使新模块工作包自动DONE。

2026-09-19 配置巡检校准：`dc08a:supervise --check-only` 现在同时核对 `.env.local` 的20只证券顺序、唯一活动订阅和服务 `/ready`，重启后的配置漂移会返回非零；维修命令使用 `--env-file .env.local`，不会回落到默认3只集合。

## 2. 当前完成与待办

当前优先级：DC-00/04/05 的真实来源盘中稳定性、备用来源许可与恢复继续观察；DC-08A 的 20 只订阅和 V2.4 的 20 个实际交易日按各自口径累计，不能互相替代；DC-08B 的 60 日历史覆盖已完成，第二来源及真实长期稳定性仍是后续门禁。既有自动化继续运行，不因阶段文档更新重启服务或改动订阅。

两项交付分别记录：DC-00～DC-07 的本机开发切片和历史 DC-08B 归档回放有自动测试证据；模块级人工验收及真实来源运行门禁仍 NOT_RUN/WAITING。已完成的代码/历史数据工作不因真实市场观察未满而回退，后台观察也不能代替短期盘中实测。

- [x] 梳理用户需求、当前代码结构及仓库已有证据，形成版本化计划、测试矩阵和接续机制。
- [x] 完成新模块实现及自动测试（DC-00～DC-07 本机范围；真实来源长期稳定性、实际交易日和外部灾备仍按门禁单独记录）。
- [ ] 验证盘中真实来源能力并启用正式采集任务。
- [ ] 完成Mac/Ubuntu运行、备用切换、备份/恢复与人工验收。
- [x] 获得固定证券集合的严格60交易日历史覆盖并完成真实归档回放验收；真实盘中累计仍单独记录。

| 工作包 | 开发状态 | 自动测试 | 人工验收 | 本包证据 | 下一动作 |
|---|---|---|---|---|---|
| DC-00 来源能力 | IN_PROGRESS | PASS（历史）/NOT_RUN（盘中） | NOT_RUN | [DC-00来源能力记录](../../evidence-data-collection-dc00.md)；探针退出0 | 在实际交易时段完成DC-T19盘中更新/延迟/切换观测；60日第二源仍未满足 |
| DC-01 契约设计 | DONE（设计与冻结输入） | PASS：contracts/fixtures/docs检查 | NOT_RUN | [ADR-0005](../../decisions/ADR-0005-shared-data-collection-boundary.md)、3个JSON Schema、冻结输入 | 生成客户端/迁移设计已纳入服务实现；人工验收仍待补 |
| DC-02 持久切片 | DONE | PASS：TS、4单测、真实PostgreSQL 6集成测（进程终止接管、Outbox重试、Fixture→Artifact原子发布）、HTTP幂等烟测 | NOT_RUN | [DC-02证据](../../evidence-data-collection-dc02.md) | 进入DC-03交易日历/Clock调度；不得将本包自动PASS当成人工验收 |
| DC-03 调度 | DONE（本机范围） | PASS：服务单测21/21、真实PostgreSQL集成12/12、容器导入/健康验证；计划/持久API、执行器、精确窗口发布和延迟重试已实现 | NOT_RUN | [DC-03证据](../../evidence-data-collection-dc03.md) | 真实交易日运行和 Web/验收中心观察归入 DC-08A；正式订阅仍默认关闭 |
| DC-04 主备 | IN_PROGRESS | PASS：Python适配器48/48、独立来源恢复探测单测3/3、Linux ARM64容器导入、盘后真实探针；BaoStock 两轮×三证券有界稳定性和恢复探针通过，Sina历史读取可用；TDX可选候选源3只/144根及20只/960根盘后只读烟测通过 | NOT_RUN | [DC-04证据](../../evidence-data-collection-dc04.md)；[TDX候选源审计](../../../evidence/audits/2026-09-23-tdx-source-switch.md) | 交易时段完成DC-T19、长期限频/恢复、许可/限频核验和真实源审计；60日第二源仍未满足 |
| DC-05 补采覆盖 | IN_PROGRESS | PASS：质量/覆盖单测12/12、真实PostgreSQL回归8/8、历史归档逐日覆盖与回放20/20通过、质量/覆盖及GapRecord/补采HTTP烟测 | NOT_RUN | [DC-05证据](../../evidence-data-collection-dc05.md)；[DC-T23真实归档回放](../../../evidence/dc08a/historical-replay-2026-09-16.json) | 实际补采执行、停牌权威核验、每日自动覆盖报告和盘中数据持续观察 |
| DC-06 多项目Web/API | DONE | PASS：项目规则17/17单测、PostgreSQL集成10/10、平台 API/Web 构建、DC-06 Playwright 1/1、数据库令牌认证/权限/真实Artifact分页/导出脱敏/指标/去重HTTP烟测 | PASS：用户人工验收通过 | [DC-06证据](../../evidence-data-collection-dc06.md) | 运行期观察 |
| DC-07 部署运维 | DONE（本机范围） | PASS：Mac ARM64 Compose 配置/健康、market-data 重启约11.957s恢复、1CPU/1GiB资源限制、告警Outbox 11/11、PostgreSQL备份SHA-256和隔离恢复20张表；Ubuntu实机人工验证已确认通过 | PASS：Ubuntu实机人工验证通过 | [DC-07证据](../../evidence-data-collection-dc07.md) | 生产外部告警/异机灾备延期；本轮进入DC-03/04实际执行链验证 |
| DC-08A 启用/短期验收 | IN_PROGRESS | PASS：3只跨沪深证券于2026-09-14～2026-09-16各完成48窗口/144根5分钟Bar；2026-09-17目标20只完成48/48窗口、960/960根Bar、0缺口、0待投递Outbox；截至2026-09-23归档口径稳定完整日3、恢复后完整日1、共4/20，自动化/健康检查PASS | NOT_RUN | `evidence/dc08a/daily-report-2026-09-17.json`、[首日验收清单](../../../evidence/dc08a/acceptance-checklist-2026-09-17.md)、[阶段六汇总](../../../evidence/audits/2026-09-23-phase-6-observation-summary.json) | 继续逐个实际交易日观察来源切换、BaoStock 半开恢复和20只窗口质量；不可将盘后探针替代盘中恢复 |
| DC-08B 60日数据验收 | IN_PROGRESS | PASS（历史覆盖） | NOT_RUN | `data/local/baostock-minute-20x60-2024-01-02-2024-04-02-v1/manifest.json`：20只×60交易日×48窗口=57,600根，逐文件 SHA-256 20/20匹配 | 历史分钟回放验收；真实盘中累计仍独立观察，不能以历史导入替代 |

2026-09-16 代码与容量复核：20只证券隔离监控池测试使用 `V25_MONITOR_SIZES=20 pnpm v25:monitor-capacity`，返回 configured/sampled/live 均为20、耗时47ms，测试后 watchlist 恢复3只，未修改正式活动订阅。持久调度器状态接口新增 `lastSuccessfulTickAt`、`nextExecutionAt`、`lastSubmitted`，盘后无待执行窗口时仅保留低频健康轮询。market-data-service 单元35/35、PostgreSQL集成17/17、全仓 lint/typecheck/test、契约/Fixture、Docker DC-07、V2.5 Web E2E、ARM64兼容性均通过；`pnpm test:integration` 在 Docker 服务启动且使用可访问宿主网络后通过，运行ID为 `9bf69efc-0922-44a7-a397-2f49a060da72`（normal）、`7caf6007-2a7e-4086-9b0a-e523ab43a96d`（rejection）、`0b77e43f-dd27-4b06-89f3-0816e2539452`（recovery）。人工验收和真实交易日观察不因本次自动测试提前签署。

2026-09-16 DC-08B/DC-T23：20只冻结证券的 BaoStock 5分钟归档覆盖严格达到60个交易日、57,600根 Bar；逐文件完整性、逐日窗口与真实归档回放20/20通过。历史覆盖与回放证据已记录，但 DC-08A 真实盘中累计和 V2.4 20个实际交易日观察继续独立进行。

2026-09-17 DC-08A 首次20只收盘后补采：自动任务首次请求因 `TypeError: fetch failed` 退出1，受控重试后切换至 `dc08a-20260917-20-v1`；日终完成48/48窗口、960/960根Bar，来源Sina，开放缺口和待投递Outbox均为0。由于切换时间约19:22（收盘后），不计作全天盘中观察日；下一实际交易日继续观察。

2026-09-17 V2.5 分阶段容量：BaoStock 100 只×60 交易日分钟归档完成 288,000 根 Bar，逐文件完整性与 48 窗口校验 PASS；证据为 `evidence/dc08a/historical-coverage-100x60-2024-01-02-2024-04-02.json`。

2026-09-18 V2.5 500只分钟容量：BaoStock 500 只×60 交易日归档完成 1,440,000 根 Bar，逐证券完整性、每日48窗口、重复键、OHLCV 和 Manifest SHA 校验 PASS；同目录续跑退出0且约9秒内跳过已完成证券，未重复下载。独立临时恢复副本树 SHA 与原目录一致，恢复证据为 `evidence/dc08a/historical-coverage-500x60-recovery-2026-09-18.json`。导入过程峰值内存因 macOS 资源采样权限未记录，暂不进入1000只档。

2026-09-18 DC-08A/V2.4观察：20只订阅首个完整交易日完成48/48窗口、960/960根Bar、0缺口、0待投递Outbox，来源均为Sina（BaoStock熔断状态为OPEN）；DC-08A有效日累计1/20。V2.4数据库日终最终记录已累计2026-09-15至2026-09-18共4/20，文档和健康报告仍需保持来源熔断与服务重启后的真实状态。

2026-09-19 运行可靠性与门禁复核：修复 Python 适配器持久限频状态在宿主机重启后可能因 monotonic 时钟回退而产生超长等待的问题；新状态使用 wall-clock 并兼容旧数值格式，新增时钟回退测试，适配器 unittest 17/17 通过。根级新增 `test:python-adapter`、`test:ops` 和 `test:integration:market-data` 入口；运维脚本 61/61、market-data PostgreSQL 集成 17/17 通过。`verify-version` 现在区分 `PASS`/`FAIL`/`INCOMPLETE`，未完成门禁返回退出码2，并忽略通用证据模板中的占位词。V1/V2 README、版本计划、V1.1/V2.4阶段状态和未决事项已按最新证据校准。V2.3 回放 Runner、事件屏障和多窗口执行模型已完成技术收口并通过 code suite；用户已于 2026-09-19 对 V2.3 新收口范围人工确认通过，后续继续累计 DC-08A/V2.4 实际交易日。

2026-09-19 计划1～5执行复核：DC-08A 健康检查与活动订阅检查均 PASS，订阅仍为 `dc08a-20260917-20-v1`；因当天为交易日历 CLOSED，morning/monitor/eod 均正确返回 `NOT_RUN`，未虚增 V2.4 或 DC-08A 有效日，观察计数保持 V2.4 `4/20`、DC-08A `1/20`。V2.5 code suite 重新通过；BaoStock/Sina 5分钟历史能力探针 PASS（证据 `evidence/local/V2.5/minute-source-probe-20260919.json`，live session 仍 NOT_RUN）；BaoStock PIT 探针仍为 PARTIAL，财务/行业修订链和历史有效区间不足，不能解除 PIT 门禁。

2026-09-21 观察口径修复与运行复核：自动化配置校验 `pnpm dc08a:verify-automation` 退出0；`dc08a:supervise -- --check-only` 返回 HEALTHY，20只证券顺序、唯一活动订阅 `dc08a-20260917-20-v1`、调度器/执行器均正常，下一触发为2026-09-22T01:37:00Z。观察汇总逻辑升级为 `dc08a-observation-summary-v2`：盘中暂时 `QUEUED` 或开放缺口在日终前收口时不标记失败，只有历史快照出现终态 `FAILED` 才将完整日计入 `recoveredDays`。当前汇总为连续稳定日 `1/20`（2026-09-18）、恢复后完整日 `1`（2026-09-21）、观察日 `2`；原始快照和盘后补采证据全部保留。单元测试4/4、`git diff --check`通过。下一实际交易日按DC-T19验证BaoStock故障→Sina切换→600秒冷却半开探测→成功切回，并逐日累计连续稳定观察。

2026-09-21 DC-T19证据链补齐：`dc08a:morning`、盘中`dc08a:monitor`和`dc08a:eod`会将每次观测归档到 `evidence/dc08a/dc-t19/YYYY-MM-DD/`，同时保留根目录兼容证据。观测快照新增当日运行明细（窗口、状态、创建/更新时间、重试时间、checkpoint/来源尝试）和最多3条规范字段样本；日终归档包含日报、健康报告和观察汇总。证据模板与归档规则见 `evidence/dc08a/dc-t19/README.md`。`dc08a:observe`与观察汇总相关测试8/8通过；真实交易日的 BaoStock→Sina→半开探测→切回仍待下一交易日。

## 3. 开发中断接续协议

每完成一个子任务、遇到失败、切换工作包或结束工作时更新此文件：当前Git分支/commit及未提交文件、工作包/子任务、已执行命令/退出码、证据路径、运行ID、剩余任务、阻塞及下一条操作。计划更改先增加版本和变更原因；不得重编号已存在的测试/任务。

恢复开发时：先读本表和最近执行记录→执行git status核对未提交变更→核查被记录的任务/进程状态→读取对应工作包和测试→从最后未完成子任务继续。不要自动重跑已完成数据导入，也不要重复启用定时器。代码/依赖变化只重验受影响项及必要回归。

执行记录模板（每次追加，不覆盖历史）：

| 字段 | 必填内容 |
|---|---|
| 日期/执行者/计划版本 | 实际UTC时间和角色 |
| 工作包/子任务/状态变化 | 如DC-02/租约，IN_PROGRESS→DONE |
| 代码与环境 | branch/commit或工作区Hash、未提交文件、锁/镜像、架构 |
| 输入与运行 | Fixture/DataVersion/Hash、runId/testRunId、订阅修订、checkpoint |
| 测试证据 | 每条命令、原退出码、对应DC-T编号、日志/报告/截图 |
| 问题/失败与修复 | 原失败记录、原因、修复及复验；不删历史 |
| 下一动作 | 具体文件/命令/子任务、依赖、不可重复执行项 |
| 人工结论 | 默认NOT_RUN，仅用户实际确认后追加 |

## 4. 风险和待确定配置

| ID | 项目 | 最迟解决包 | 当前状态/未解决行为 |
|---|---|---|---|
| DC-B01 | BaoStock/Sina盘中更新、字段、量额单位、限流与许可 | DC-00/04 | OPEN；禁用未验证盘中能力 |
| DC-B02 | 首批20只清单、实际启动日期、允许消费字段 | DC-01/08 | PASS（冻结输入）；计划、20只集合及 SHA 已记录；实际启动日期和覆盖仍待DC-08A |
| DC-B03 | 日历来源与有效年限、特殊交易日规则 | DC-01/03 | OPEN；未知日期暂停受影响市场 |
| DC-B04 | 独立备份路径、保留期限和告警目的地 | 上线前 | 本机备份/隔离恢复PASS；外部介质和告警目的地延期，不能标记生产就绪 |
| DC-B05 | Ubuntu主机/架构、资源及部署位置 | 上线前 | Ubuntu实机人工兼容验证PASS；正式主机/资源/部署位置仍UNSET |
| DC-B06 | 其他项目的数据种类/身份/用途与许可 | DC-06及新增适配器时 | OPEN；先两个隔离Fixture消费者验共享，未支持类型明确拒绝 |

## 5. 首次记录

本节历史记录保留；最新安排以第6节为准。

2026-09-12：完成计划文档；工作区开始时干净；核实market-data-service实际为TS且部分状态为内存Map，Python分钟导入脚本独立存在。既有58日、来源超时、TDX缺真实文件等结论来自历史证据。新正式采集任务未创建，既有V2.4观察任务未变更。DC-00历史探针三只跨沪深证券的BaoStock/Sina查询均成功；盘中能力未在交易时段执行，保持NOT_RUN。DC-01契约设计冻结并通过JSON/Fixture/Markdown检查。DC-02已完成持久表、任务API、单元/真实数据库集成和HTTP幂等烟测；Worker故障接管、消息/数据库故障、完整Fixture发布链仍待完成。

文档校验：`pnpm docs:check`退出0，391个本地Markdown链接、0失败；`git diff --check`退出0。DC-00探针静态检查、contracts、fixtures和文档检查退出0；DC-T01～DC-T25均有输入、操作和预期。DC-01设计检查PASS；新模块持久化/调度业务测试和人工验收仍NOT_RUN。

## 6. 计划1.1变更及后续交接

2026-09-19 P0 修复与回归：版本验收脚本修正验收表解析，新增计划/验收阶段缺失与多余行检查；V2 现能解析 5 条验收记录并按实际未完成状态返回退出码2。Python 适配器持久熔断状态修正为只有真实成功才清零，失败次数可跨 Collector/进程累计至 OPEN；新增跨进程累计失败测试，适配器 unittest 20/20、运维测试 62/62、全仓 lint/typecheck/test、baseline 检查通过。采集 CLI 新增 `sources` 请求字段及 `STOCKQUANT_COLLECTION_SOURCES` 配置，默认仍为已验证的 `baostock,sina`，东方财富必须显式启用；未知、重复来源被拒绝。真实来源能力、盘中稳定性、许可和人工验收门槛未因本次代码修复改变。

2026-09-19 V2.5 执行批次：Compose 重新构建并启动成功；normal `3bee90bc-2c75-4ebb-989e-07be04b80069`、rejection `4f3de864-8604-4efb-8118-a54fffea3742`、recovery `0391745a-de9d-4e37-a0c9-0110e5052e9d` 均 COMPLETED，断言分别为 6/6、3/3、3/3 PASS。normal 同 Run check-only PASS，证据导出目录 `evidence/local/3bee90bc-2c75-4ebb-989e-07be04b80069`，Manifest Hash `0603d5260a4c2007c3fd6b807e4934ccb8d53d8f2956852041b5b4e1fc28e885`。V2.5 code suite、Web E2E 1/1（Web `127.0.0.1:8080`）通过。normal 资源证据为 linux/amd64-emulated、1200 行、216 MiB、0 秒；不能外推全量容量。BaoStock PIT 探针返回 `PARTIAL`：财务公告日期可读，但缺修订链、来源 Artifact 和历史证券范围；行业历史有效区间、修订链和历史成分均缺失，继续保持 PIT 门禁。DC-08A/V2.4 仍只读观察，未因 Fixture 场景通过而增加有效交易日。

2026-09-19 交易日入口复核：`dc08a:morning` 返回 READY、正式订阅 `dc08a-20260917-20-v1` 已启用且20只集合一致；`dc08a:monitor` 返回 `QUIET_AFTER_CLOSE`；`dc08a:eod` 根据日历 `sse-cn-a-share-2026-1` 判定 2026-09-19 为 CLOSED，返回 `NOT_RUN`，expected/actual 均为0，观察 `observationCounted=false`，未增加 DC-08A/V2.4 有效日。来源健康接口显示 BaoStock OPEN（累计失败118）、Sina CLOSED 且有最近成功、Eastmoney UNKNOWN；默认正式来源仍未启用 Eastmoney，主备盘中能力和许可门禁保持未完成。

2026-09-19 探针与容量复核：`v25:probe-minute-sources` 返回历史 5 分钟能力 PASS（BaoStock、Sina 各3只样本），实时盘中部分 NOT_RUN；`v25:validate-baostock-minute` 返回20只×60日×48窗口、57,600/57,600 PASS；`v25:replay-baostock-minute` 返回20只、57,600行、每证券60交易日 PASS；`v25:monitor-capacity` 在 darwin/arm64 对50/80/100只在线监控池均 PASS（configured/sampled/live一致，48/49/49ms，测试后恢复3只）。`v25:probe-baostock-stability` 因单次外部查询超过约3分钟无输出被中断，保留为超时/未完成证据，不标记稳定性 PASS。阶段 E2E 包装脚本现在在未设置 `PLAYWRIGHT_BASE_URL` 时自动使用 Compose 的 `http://127.0.0.1:8080`；V2.5 E2E 1/1、运维测试62/62通过。

2026-09-19 东方财富候选备用接入：`market-data-adapter` 新增直接公开 JSON 端点的 `EastmoneyMinuteClient`，主备顺序固定为 BaoStock→Sina→Eastmoney；`market-data-service` 来源健康接口同步展示 `eastmoney`。东方财富成交量按公开 K 线手数转换为规范股数，所有请求仍受统一超时、限流、重试和熔断保护。代码检查与适配器单测通过；真实请求仍观察到间歇性断连，故不标记 DC-04/08A 或 60 日备用源门禁通过。

2026-09-20 计划1～7执行：采集 CLI 现在区分缺省来源与显式空来源，且只初始化实际启用的客户端；来源健康接口报告 `configuredSources`、`enabled` 和 `DISABLED` 状态，并兼容数字/字符串时间戳；`.env.example` 与 Compose 已补齐 `STOCKQUANT_COLLECTION_SOURCES`。历史覆盖/回放脚本默认生成带 UTC 执行时间的新证据文件，并拒绝覆盖已有文件；此前被重复运行改写的 2026-09-16 历史时间戳已恢复。稳定性探针新增全局预算和 stderr 进度；BaoStock 两轮×三证券有界查询及独立恢复探针全部 `SUCCESS`，但该结果不能解除真实交易时段长期稳定性门禁。分页结果映射、行结构、证券代码和重复 Bar 校验已加入适配器；适配器 unittest 35/35、market-data-service typecheck、`uv lock --check`、容器构建和容器内 BaoStock 0.9.3 登录均通过。健康报告已于 2026-09-20 刷新：BaoStock/Sina 均 `CLOSED` 且失败数为0，质量缺口和待投递 Outbox 均为0；报告整体因休市日来源最近成功时间超过30分钟而标记 `UNHEALTHY`，不等同于来源熔断或查询失败。

2026-09-20 BaoStock 兼容性修复：适配器依赖由 `baostock==0.8.9` 升级至 `0.9.3`，`uv.lock` 与带哈希 `requirements.lock` 已同步；新版客户端登录验证返回成功。子进程边界现在将 BaoStock 原始 `errorCode` 传递到 `SourceError` 和熔断审计，便于区分登录、查询和网络错误。随后确认旧稳定性探针因遗漏 `get_row_data()` 将查询误判为超时，现已修正并新增分页游标测试；适配器同步兼容 0.9.3 的17位时间字段。

2026-09-20 BaoStock 修复验收：两轮×三证券、2024-01-02至2024-03-29 的稳定性探针 6 次查询及恢复探针全部 `SUCCESS`，每次2,784条；容器正式适配器同窗口返回2,784条，时间戳为09:30–15:00，持久健康状态为 `CLOSED / failures=0`。能力探针三证券历史读取 `PASS`，但 `liveSession=NOT_RUN`；长期限频、真实交易时段观察和人工验收仍未签署。

2026-09-21 DC-08A 故障恢复：当日 12 个五分钟窗口全部失败，数据库 checkpoint 均为 `Unexpected token 'l', "login fail"... is not valid JSON`；BaoStock 子进程的登录诊断写入适配器 stdout，破坏单 JSON 边界，使已配置的 Sina 备用源无法接管。将第三方 SDK 诊断定向到 stderr，并将半开熔断探针限制为单次尝试；适配器 unittest 37/37、Ruff、Linux ARM64 容器构建通过。容器内一只证券真实探针得到 BaoStock `TIMEOUT` 后 Sina `PASS`（48根）；受控恢复接口将 12 个失败运行逐一恢复，数据库 48/48 `COMPLETED`。重新执行 `pnpm dc08a:eod` 退出0：当日 960/960 根唯一 Bar、缺口0、重复0、待投递 Outbox 0，关闭旧缺口240，日报 `PASS`。修复后 BaoStock 熔断仍为 `OPEN`、最近错误 `TIMEOUT`，Sina 为 `CLOSED`；本次恢复依赖备用源，未证明 BaoStock 本身恢复。修复前覆盖/日报/健康快照保留为 `*-before-recovery.json`；这次补采不追认原定时执行成功，也不代替后续交易日的 BaoStock 稳定性观察或用户验收。

2026-09-21 运维与 V3.1 执行：`pnpm dc08a:recover-failed -- --check-only --subscription dc08a-20260917-20-v1 --from 2026-09-21 --to 2026-09-21 --limit 20` 返回候选0，证明失败批次已收口且检查模式不产生新运行。`dc08a:eod` 现在在缺口关闭和 Outbox 投递后重新生成 health/observation summary；当日覆盖 960/960、缺口0、重复0、Outbox0、日报 PASS，观察摘要同步记录 2 个已完成日。V3.1 代码套件通过（contracts 21/21、research 单测5/5、PostgreSQL集成1/1、platform API 单测27/27、类型检查通过）；normal `290a08d0-93cc-4147-a072-a7e1f8bb8f8b`、rejection `fdb827dc-b426-48f5-981e-8825813caccf`、recovery `057bc825-9bc5-4b5a-8df5-9e2361dea2b0` 均 COMPLETED 且断言 PASS，normal 同 Run `check-only` PASS，Web Playwright 1/1 通过。V3.1 仍为准备阶段：真实模型凭证、隔离 Runner 和 OD-009 决策未完成，三个场景只证明 RESEARCH/FIXTURE/FAKE 的编排、LIVE 拒绝和取消幂等。

2026-09-21 BaoStock 恢复策略优化：半开熔断冷却时间新增 `STOCKQUANT_COLLECTION_SOURCE_RECOVERY_COOLDOWN_SECONDS` 配置，Compose 默认600秒。BaoStock连续失败后仍由Sina立即接管；每个后续采集窗口最多触发一次半开探测，成功即关闭熔断并切回BaoStock，失败继续使用Sina，不启动独立高频重连线程。适配器单测38/38通过，容器内配置读取为600秒，重建后的market-data-service健康检查通过；该策略不改变当前BaoStock `OPEN/TIMEOUT`事实，仍需后续实际盘中窗口观察。

2026-09-21 DC-T19 自动化接入：复用现有 `a-20` 心跳任务（工作日08:00–17:45，每15分钟），将DC-T19证据目录、BaoStock/Sina切换、600秒半开探测、切回/继续降级、延迟、原始字段和日终质量项加入任务提示；未创建重复任务，`dc08a`晨间守卫和`dc-08a-2`盘后任务保持不变。`pnpm dc08a:verify-automation` 返回PASS，服务健康和活动订阅复核通过。自动任务仍禁止删除数据、切换订阅、手工补采、启用LIVE或连接真实券商。

2026-09-22 定时任务复核与健康告警修复：盘前守卫 `READY`，20只活动订阅一致；日终 48/48 窗口、960/960 Bar、缺口0、Outbox0，日报 `PASS`。BaoStock 盘中 16 次半开尝试均为 `EMPTY_RESULT`，Sina 完成全部窗口；盘后独立只读探针在 BaoStock 取得当天3只证券各48根，支持当日分钟数据延迟发布的判断，但盘中恢复仍未验证。`dc08a-health-v3` 使用版本化交易日历的会话时段，仅在采集窗口及其后30分钟要求来源最近成功；收盘/午休时保留熔断、调度与质量检查，避免来源自然停止更新造成误报。定向单测11/11、`pnpm dc08a:verify-automation` PASS、实际盘后 `pnpm dc08a:health-report` 退出0且报告 `HEALTHY`；BaoStock 原熔断状态保留。旧健康失败快照和探针记录见 [`baostock-intraday-investigation-2026-09-22.md`](../../../evidence/dc08a/baostock-intraday-investigation-2026-09-22.md)。

2026-09-22 来源策略落地：基于当日盘中空结果与盘后延迟发布证据，将默认分钟来源顺序调整为 `sina,baostock`；Sina 负责盘中优先采集，BaoStock 保留盘后/历史读取及600秒半开恢复探测。显式请求仍可指定来源顺序，来源尝试序列写入每个运行的 checkpoint 和 Artifact；切换后的长期盘中稳定性与 BaoStock 成功切回仍待后续实际交易日验证。

2026-09-22 重启健康复核：发现行情服务重启后持久调度器要等首个60秒间隔才写入 `lastSuccessfulTickAt`，会造成短暂的健康误报；调度器启动时改为立即执行一次持久 Tick，重建后首个 Tick 记录为 `2026-09-22T11:39:42.103Z`，下一触发为 `2026-09-23T01:37:00.000Z`。盘后 `dc08a-health-v3` 重新报告 `HEALTHY`，BaoStock `OPEN` 与 Sina `CLOSED` 的真实来源状态保持不变。

2026-09-22 观察门禁计数修复与完整复核：发现 `dc08a-observation-summary-v2` 将恢复后完整日计入 `observedDays`，但 `remainingDays` 只扣除连续稳定日；已统一为按 `observedDays` 扣减并让 `status` 使用同一门禁口径，回归测试4/4通过。当前正式订阅汇总为连续稳定日2（2026-09-18、2026-09-22）、恢复后完整日1（2026-09-21）、观察日3、剩余17；数据库 V2.4 日终总记录仍为6/20，两者分别对应当前 DC-08A 订阅与历史 V2.4 总观察口径。`pnpm verify:stage -- --stage V2.4 --suite code` 退出0（构建、类型、全仓单测、Python适配器39/39、运维69/69、市场数据 PostgreSQL 集成17/17）；`pnpm v24:preflight` 五项均 PASS，健康报告为 `HEALTHY`。真实交易日、BaoStock 盘中恢复切回和人工验收仍按门禁累计。

2026-09-23 独立来源恢复探测实现：现有 `dc08a:monitor`（含盘后 `dc08a:eod` 调用）现在会在来源检查中单独调用适配器恢复探测，不依赖 Sina 失败，也不占用正式采集窗口。探测只处理冷却期已满的 `OPEN` 来源，使用活动集合首只证券和最近5个自然日，单次来源查询超时3秒，并复用持久来源健康文件及跨进程半开锁。成功才关闭熔断；`EMPTY_RESULT` 记为 `INCONCLUSIVE` 且保留原 OPEN/失败数，以适配盘中延迟发布；异常会留存独立尝试并重置冷却，不改变该次正式采集状态。Python适配器44/44、探测调度单测3/3通过，market-data-service镜像构建成功且未重启现有服务。实际自动任务首次运行、真实 BaoStock 恢复/切回仍 `NOT_RUN`，不据代码或模拟测试记为运行验收。

2026-09-23 阶段六验收、观察与自动化复核：平台只读 V2.4 `observation-summary` 返回 `WAITING`、7/20、剩余13日，计数日期为 9/15～18、9/21～23；9/19 收盘记录未计数。`v24:preflight` 五项均 PASS：platform API 与 market-data 服务就绪，Paper/FakeBroker，20只集合、持久调度器/执行器 ENABLED，当前快照为 `HEALTHY`。V2.4 下一采样为 2026-09-24 09:30，DC-08A 健康报告 `HEALTHY`、20只、缺口0、Outbox0；来源仍为 Sina CLOSED、BaoStock OPEN（92次 `EMPTY_RESULT`），不能把总体健康解释为 BaoStock 已恢复。DC-08A 归档观察汇总按最新快照规则为稳定完整日3、恢复后完整日1、总计4/20、WAITING（剩余16日）；与 V2.4 数据库总观察日口径分开。

同日核对 Codex 自动化配置：`a-20`、`dc-08a`、`dc-08a-2` ACTIVE；`dc-08a` 配置到期 `2026-10-20T00:45:00Z`（北京时间08:45），另两项循环任务未设到期；一次性已完成 `dc-08a-20` 和迁移旧任务 `stockquant` 为 PAUSED。`pnpm dc08a:verify-automation` PASS。健康与归档快照及完整状态表见[阶段六审计](../../../evidence/audits/2026-09-23-phase-6-status-and-automations.md)。

2026-09-12：根据用户先完成本次任务再进入主项目的安排，明确开发范围与交付门槛；DC-08拆为A/B，新增DC-T25，本次开发与长期数据验收分别签署。未修改业务代码，未启动采集/调度，未暂停现有观察任务。下一动作仍为DC-00；等待交易日时仅推进本模块独立子项。

本次交付时填写：实际部署/架构与运行版本、订阅及唯一调度ID、20只清单Hash、源能力报告、数据及备份位置、告警状态、下一运行时间、当前有效覆盖及缺口、DC-08B状态/后续检查入口、用户签署、主项目恢复点及前置门槛。主项目恢复点需交付时重新读取版本计划和证据确定，不提前声称后续任务已通过。

1.1文档校验：`pnpm docs:check`退出0（391个链接、0失败），`git diff --check`退出0。DC-T25已补短期真实运行输入与预期；所有业务测试保持NOT_RUN。计划修订完成，业务开发尚未开始。

2026-09-12 DC-02收尾记录：TypeScript lint 退出0；`vitest run tests/unit` 退出0（4/4）；`MARKET_DATA_DATABASE_URL=... vitest run tests/integration/collection-run-postgres.spec.ts` 退出0（6/6）。测试使用唯一 `suffix=Date.now()`，收尾不删除共享数据库表，保留运行、Artifact 和 Outbox 证据。真实子进程脚本仅更新本次唯一 run 的租约，SIGKILL 后由新 worker 接管；消息故障通过不调用 `markEventSent` 模拟，随后恢复发送。人工验收仍为NOT_RUN。

2026-09-12 DC-03启动记录：完成注入Clock/版本日历的确定性调度器和计划/启停 API；单元测试 7/7、TypeScript lint 通过。调度器只生成已闭合且达到发布延迟的5分钟窗口，未知日期进入等待，重复键跳过并标记漏窗补采。持久调度配置、独立后台进程和跨重启恢复尚未完成，人工验收NOT_RUN。

2026-09-12 DC-03持久化收尾记录：新增调度计划表、单活租约表和可选后台 Worker（`STOCKQUANT_SCHEDULER_WORKER=1`）；Worker 按持久水位创建 CollectionRun，跨新 Worker 实例恢复后重复 Tick 提交数为0。真实 PostgreSQL 调度集成 7/7 通过；HTTP 烟测在端口3313验证 `/ready`、创建计划、启用和查询；服务已停止，未启用正式无人值守采集。人工验收仍NOT_RUN。

2026-09-12 DC-04启动记录：新增独立 `services/market-data-adapter` Python 包，BaoStock/Sina 均为只读适配器；主源三次可重试失败后切换新浪，连续失败打开熔断，冷却后单探针半开恢复；规范化层拒绝空结果、缺字段、来源不一致。Python unittest 5/5通过；真实源盘中能力和许可保持NOT_RUN。

2026-09-12 DC-05启动记录：新增分钟质量校验、应有窗口、GapRecord、覆盖报告和年龄优先级；新增 `/v2/minute/quality` 与 `/v2/minute/coverage`。单元测试12/12、PostgreSQL回归7/7、HTTP质量/覆盖烟测通过；真实60交易日覆盖、持久缺口台账和停牌权威核验保持NOT_RUN。

2026-09-12 DC-05持久化收尾记录：新增 `market_data_gap_records`、`market_data_backfill_tasks` 及对应 API；真实 PostgreSQL 测试 8/8，通过重复上报、关闭缺口、补采幂等验证；HTTP 烟测验证 GapRecord 写入/查询及相同幂等键返回相同 taskId。实际补采执行和每日自动报告尚未启用，人工验收NOT_RUN。

2026-09-12 DC-06启动记录：新增项目归属/作用域、并发配额/公平队列、物理共享去重键、DataVersion锁定分页和导出Manifest；新增项目访问、分页、导出和去重API。16/16单测及HTTP烟测通过；正式认证、持久配额、Web/验收中心E2E保持NOT_RUN。

2026-09-12 DC-06认证收尾记录：新增 `market_data_projects` 持久化项目策略、作用域、令牌哈希和运行计数；数据库模式下缺失/错误令牌返回403，配额超限返回429。真实 PostgreSQL 集成测试9/9通过；认证 HTTP 烟测正确令牌允许、缺失/错误令牌拒绝。公平队列指标、真实Artifact分页和脱敏仍待部署切片，人工验收NOT_RUN。

2026-09-12 DC-06交付收尾记录：新增持久队列指标表，分页访问记录 admitted 计数；导出递归脱敏敏感字段后重新计算 SHA-256；新增 `market_data_artifact_rows` 真实 Artifact 行存储、项目隔离分页和 DataVersion 冲突保护；新增平台验收代理和 `/acceptance/v2/dc06` 页面。单元测试17/17、真实 PostgreSQL 集成10/10、Artifact HTTP 烟测、平台/Web 构建和 Playwright 1/1 通过（写入2行、pageSize=1返回首行、错误令牌403）。人工验收已通过。

2026-09-12 DC-06人工验收后自动复核：normal/rejection/recovery 三个 `testRunId` 均为 `COMPLETED` 且断言全PASS；Playwright 1/1、PostgreSQL 10/10、单元17/17通过。人工验收已由用户确认通过，后续仅保留运行期观察记录。

2026-09-12 计划1.2/执行链启动记录：用户确认第一版本仅需本机单机全流程，Ubuntu已人工验证；因此DC-07标记为本机范围DONE，外部告警、异机备份和生产灾备延期至上线前，不降低真实分钟数据和DC-08A观察门槛。发现原持久调度器仅创建任务/推进水位、不调用适配器或持久化分钟数据；新增独立执行器领取持久任务、调用受控Python JSON边界、质量校验、内容寻址Artifact和项目范围行的同事务发布，源端/质量失败转`WAITING_RETRY`并记录延迟重试。Python适配器固定`baostock==0.8.9`并生成锁；修正BaoStock/Sina代码格式和新浪返回日期过滤。当前已通过市场数据服务单测20/20、TypeScript typecheck、Python unittest 6/6；容器/真实PostgreSQL复验仍在执行，真实交易日观察尚未启动。

2026-09-12 DC-08A准备记录：复核既有冻结输入 `fixtures/v2/data-collection/collection-plan-v1.json`，20只集合版本为 `baostock-minute-20x60-v1`，SHA-256为`045595a9923a826e0413e9ad3708dc9409effaeeb007e794634bc21faf4d26a9`；完成服务格式映射并记录3只跨沪深短期观察集合。新增[DC-08A启用前准备记录](../../evidence-data-collection-dc08a-readiness.md)。调度器和执行器继续保持默认关闭，待实际交易时段按检查单显式启用。

2026-09-13 当前状态校准：根据已提交的 DC-02～DC-07 实现和复验结果，DC-01～DC-03
当前表格状态改为 DONE（DC-03 限本机范围），不再把已完成的契约冻结、持久化和调度能力列为待实现；
DC-04/05 仍保持 IN_PROGRESS，因为盘中真实源能力、实际补采和 60 日覆盖尚未取得证据。
DC-08A 仍为 TODO/NOT_RUN：唯一正式订阅已准备且 check-only 返回 `READY_TO_ENABLE`，
但调度器/执行器保持关闭，等待下一个实际交易日的 3 只短期观察。

2026-09-13 启动条件与保护链复验：宿主权限下 `pnpm v24:preflight` 5/5 PASS，
`pnpm dc08a:activate -- --check-only` 返回 `READY_TO_ENABLE`，唯一正式订阅为
`dc08a-20260914-short-v1`；调度器/执行器均为 `DISABLED`，服务状态为
`WAITING_CONFIGURATION`（退出码2），符合默认安全配置。覆盖规则 `data:test-coverage`
7/7、日终报告 3/3、观察 4/4、Linux ARM64 兼容性验证 PASS。非交易日
`daily-report-2026-09-13.json` 为 `NOT_RUN`，当前观察 `NOT_ACTIVE`、Artifact/缺口均为0；
`dc08a:promote-20 -- --check-only` 按预期以“短期日终报告未全部 PASS”阻塞，未修改订阅或容器。

2026-09-13 CLI 契约收尾：新增根入口 `pnpm data:collect`、`data:status`、`data:resume`、
`data:backfill`、`data:schedule`，分别覆盖采集运行创建/查询、带 `expectedVersion` 的恢复、
补采任务幂等创建和订阅启停/查询；服务新增恢复 API 的版本冲突保护。market-data-service
TypeScript typecheck、`data:test-coverage` 7/7、`dc08a:test-activate` 7/7 和脚本语法检查通过。
CLI 的真实网络执行、DC-T25 实际交易日观察及浏览器采集场景仍保持 NOT_RUN。

2026-09-13 回填扩展收尾：`POST /v2/minute/backfills` 已按交易日/会话展开逐窗口
`BACKFILL` collection run（真实 HTTP 烟测生成 48 条运行记录）；执行器发布最后一个窗口后按
任务前缀汇总运行状态，全部完成时自动关闭对应日期/证券缺口并将 task 标记 `COMPLETED`。
TypeScript typecheck、30 个单测、PostgreSQL 集成 15/15 通过。真实适配器运行和 60 日覆盖仍
保持 NOT_RUN，HTTP 扩展烟测仅证明任务展开，不代表真实数据已补齐。

2026-09-13 回填失败边界补齐：执行器记录每次失败的 `retryCount/lastError`，达到配置的
`maxRetries`（默认3次）后将 collection run 标记 `FAILED`；BACKFILL 运行同步使所属 task
进入 `FAILED`，避免无限重试。来源范围外/空窗口错误因此可审计并终止，真实 Docker 适配器
执行仍待专门端到端验证。

2026-09-13 Docker 端到端复验：重新构建 `market-data-service` 镜像成功，并以
`STOCKQUANT_COLLECTION_EXECUTOR=1`、隔离订阅启动；HTTP 创建回填任务成功展开 48 个窗口，
容器实际领取运行并出现 `WAITING_RETRY`（BaoStock/Sina 网络回溯耗时），证明执行器→适配器
边界已接通。受数据源响应未在观察时限内完成影响，本次未取得 Artifact/缺口关闭/`COMPLETED`
终态，真实数据补采仍保持 NOT_RUN，不能将该烟测标记为完整 E2E PASS。

2026-09-13 API 校验补强：collection-run 创建现在核对订阅存在、版本一致及窗口日期在
订阅范围内；resume 对非法 runId 返回 422、未知运行返回 404，版本冲突保持 409。类型检查、
31 个单测与文档链接检查继续通过。

2026-09-13 来源范围处理补强：当 BaoStock 与 Sina 均仅返回空结果时，适配器返回不可重试的
`OUT_OF_SOURCE_RANGE`，执行器按失败上限直接收口，避免对明确超范围日期无限重试。Python
适配器 unittest 7/7 通过。

2026-09-13 定时采集运行保障补强：执行器增加同一进程防重入，持久运行查询纳入租约过期的
`RUNNING` 任务，允许重启后自动接管；巡检任务改为北京时间盘中每15分钟运行，并在恢复前
固定正式订阅上下文。相关服务类型检查、31个单测、15个 PostgreSQL 集成测试和定时脚本
回归测试均通过。

2026-09-13 四项必修复收尾：Artifact 发布成功后，完成回调改为独立边界，回调异常不再将已
发布运行误标为失败；PostgreSQL 集成测试在结束时精确停用测试订阅，避免污染正式调度。最新
market-data-service 镜像已重建并以正式订阅启动，`/ready` 返回 `collectionPersistence=POSTGRES`、
调度器/执行器均 `ENABLED`。服务类型检查、32 个单测、PostgreSQL 集成 15/15、定时脚本 9/9、
文档链接检查均通过。当前数据库仍有历史遗留的 24 个过期 `RUNNING` 运行，已具备重启接管逻辑，
需在正式交易时段观察其实际收口；真实数据源、20 个交易日和 60 日覆盖仍按验收门槛保持 NOT_RUN。

2026-09-14 定时运行保障修复：新增受控的 `dc08a:morning`、`dc08a:monitor` 与
`dc08a:eod` 入口。晨间入口以冻结的唯一短期订阅进行有界启动、显式启用与健康等待；巡检和
日终入口动态读取唯一启用订阅及证券数，盘后巡检延长至23:45。覆盖/日报忽略已取消运行，
collection outbox 只会在写入本地审计证据后按正式订阅的非取消运行标记已投递。实际复核时
服务健康、调度器/执行器均为 ENABLED；41个窗口已完成，剩余窗口和缺口保持 INCOMPLETE，
不作为 DC-08A 通过证据。Codex 无人值守沙箱的最小外部命令规则尚需用户明确批准并重启
Codex 后生效，因此自动任务的权限门禁仍待完成。

2026-09-16 自动化与恢复链复核：Docker 全部服务健康，market-data-service `/ready` 返回 PostgreSQL 持久化、调度器/执行器 ENABLED，当前数据库启用订阅与服务运行配置均为短期3只集合；2026-09-16 日终报告为 `PASS`（144/144 Bar、0开放缺口、0待投递 Outbox）。20只切换只读预检返回 `READY_TO_PROMOTE`。修复20只切换成功后将订阅及证券集合持久化到 `.env.local`，守卫重启不再回退到旧3只配置；控制接口未配置令牌时改为拒绝；回滚兜底增加事务、影响行数及唯一活动订阅后置校验；来源限频状态按来源持久化到独立状态文件，跨采集子进程继续生效；补充晨间定时任务显式 DTSTART 校验；V1.1 PostgreSQL/恢复集成测试三场景全部通过，测试运行记录为 `f7ab4039-80e8-4ae7-9877-a7c2085be7f3`、`9132df29-94dd-4b08-810f-37ee73baf70d1`、`4e167680-6f0f-4f57-a418-1c8ea533baf4`。人工验收、20只实际交易日、20日观察及60日覆盖仍未完成。

2026-09-15 DC-08A短期真实运行复核：唯一正式短期订阅
`dc08a-20260914-short-v1` 连续两个实际交易日完成采集。2026-09-14 初始日终报告曾在
最后窗口发布前生成 `INCOMPLETE`，恢复后重新按数据库最终状态生成，结果为48/48运行、
144/144 Bar、48个Artifact、0开放缺口、0非取消待投递Outbox、`PASS`；2026-09-15 同样为
48/48、144/144、0缺口、`PASS`。两日完成运行的实际来源均为Sina，BaoStock主源成功率仍须
单独观察。`pnpm dc08a:promote-20 -- --check-only` 返回 `READY_TO_PROMOTE`（20只）；人工
验收保持NOT_RUN，实际切换安排在2026-09-17交易时段前，随后需完成20只至少一个实际交易日。

2026-09-23 阶段一至六执行收口：观察汇总增加最终日终快照标记，普通巡检不再覆盖已确认日终；
V3.1 预算账本接入实验创建/结算 API，Runner 增加受管路径和有界执行器；BaoStock 独立恢复探测
实际返回 `TIMEOUT` 并以 `DEGRADED` 留证，Sina 继续作为可用来源。自动化配置、全仓 lint/typecheck/test、
Python 适配器和契约校验通过。NATS/Temporal 持久卷已生效。市场数据服务状态接口源码已修正为报告持久化
来源执行模式，但本次 Docker 构建因 registry 依赖下载中止，运行容器仍为上一镜像，不能将接口修正记为
运行期 PASS。V2.4 保持7/20，DC-08A保持4/20，V3.1真实模型调用和来源恢复仍未完成。详见
[`阶段一至六执行收口记录`](../../../evidence/audits/2026-09-23-phase-1-6-execution.md)。

2026-09-23 部署复核：重新构建 `market-data-service` 镜像成功，并仅重建该服务容器；容器健康，
`/ready` 返回 PostgreSQL 持久化、调度器和执行器均 `ENABLED`。`/v2/collection-scheduler/status`
现返回 `PERSISTENT_SOURCE_EXECUTION`，已确认最新状态代码进入运行环境。Sina 来源保持 `CLOSED`，
BaoStock 仍为 `OPEN/TIMEOUT`；正式订阅健康接口返回 `openGaps=0`、`pendingOutbox=0`。因此镜像
部署阻塞已解除，但 BaoStock 恢复、真实交易日观察、20 日观察和 V3.1 真实模型链路仍保持未完成。

2026-09-23 TDX 候选源适配：Python 适配器新增可选 `tdx`，锁定 easy-tdx Git commit
`4820b4a0496899ece0b8ca4d7f4d66a5159da7f8`，默认 `sina,baostock` 未改变。适配器单元测试
48/48、ruff、mypy 和全仓 typecheck 通过；只读探针在真实 TDX 服务器 `121.37.207.165`
上对 `600000.SH`、`000001.SZ`、`600519.SH` 返回 144 根 5 分钟 Bar，连接延迟约 330ms，
结果 Hash 为 `12ae2df345ae6939568b55a700ea8a2d24bc14bb7a32ab96354240441d2ff0ef`。探针不创建
运行任务、Artifact 或数据库写入；TDX 仍为 `CANDIDATE`，至少两个实际交易日和20只证券的
正式观察为 `NOT_RUN`，未替换当前正式来源。

同日盘后20只证券批量只读烟测返回 `960/960` 根 Bar，服务器 `123.60.47.136`，结果 Hash
为 `826b8f6689376ceda42410e5f211be0c18f4e003dc3d1f9110ed4addfee10c38`。该结果仅作为容量
和分页边界证据，不计入实际交易时段观察或 DC-08A 门禁。

2026-09-23 TDX 定时观察接入：新增工作日 11:35 和 15:20 两个只读候选源任务，交易日先由
`pnpm v24:preflight` 判断，再运行20只证券 `pnpm v25:probe-tdx`，分别归档上午和收盘观察。
任务不修改正式来源、不创建采集运行、不写数据库；`pnpm dc08a:verify-automation` 已扩展检查
两个任务并返回 PASS。Dockerfile 增加 `STOCKQUANT_INSTALL_TDX=1` 可选构建参数，默认值为0，
默认镜像和 `sina,baostock` 正式来源保持不变。显式启用该参数的镜像构建返回0，镜像内
`import easy_tdx` 通过；这只是可选依赖安装验证，未替换当前运行容器。实际交易日 TDX
证据尚未产生，门禁仍为 `NOT_RUN`。

2026-09-24 真实交易日运行收口：DC-08A 日终报告为 `PASS`，20只证券48/48窗口、960/960根
5分钟Bar、0开放缺口、0待投递Outbox；其观察汇总累计5/20（稳定完整日4、恢复后完整日1），
继续保持 `WAITING`。V2.4 Paper最终观察新增1日，累计8/20，剩余12日，继续保持 `WAITING`。
TDX上午与收盘任务均成功触发并保留 JSON，但运行环境拒绝创建TCP socket，结果为
`PARTIAL`、0行；探针修复为 `PARTIAL/NOT_RUN` 返回退出码2，并将权限拒绝归类为
`TCP_PERMISSION_DENIED`，定向测试31/31、ruff和mypy通过。该失败证明当前执行环境权限不足，
不作为 TDX 数据源能力结论。随后在允许 TCP 出站的受控本机环境对同一20只证券做只读复测，
返回 `PASS`、960行，说明候选源和分页能力可用；自动任务的交易时段观察仍需在具备网络权限
的执行环境中重新运行。正式来源仍为 `sina,baostock`。

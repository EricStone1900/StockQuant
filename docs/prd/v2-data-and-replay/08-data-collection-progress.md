# 共享数据采集：进度、问题及接续记录

日期：2026-09-20；计划版本1.6。入口：[开发计划](./06-shared-data-collection-plan.md)、[测试手册](./07-data-collection-tests.md)。此文件是开发接续的主记录，业务进度不得只留在聊天中。

## 1. 状态规则

开发状态用TODO / IN_PROGRESS / BLOCKED / DONE；测试用NOT_RUN / PASS / FAIL；运行等待用WAITING；人工验收独立记录。DONE必须有实现和所需测试证据。文档已编写不表示业务已实现；历史脚本通过不能使新模块工作包自动DONE。

2026-09-19 配置巡检校准：`dc08a:supervise --check-only` 现在同时核对 `.env.local` 的20只证券顺序、唯一活动订阅和服务 `/ready`，重启后的配置漂移会返回非零；维修命令使用 `--env-file .env.local`，不会回落到默认3只集合。

## 2. 当前完成与待办

当前优先级：先完成本模块DC-00～DC-07及DC-08A，再恢复主项目其他开发；DC-08B届时后台继续。20只隔离吞吐验证不切换正式订阅；定时任务健康检查需记录最近成功 Tick 与下一触发时间。仅本模块必要兼容修改和原有功能回归可在当前开发；既有观察任务继续。

两项交付分别记录：本次模块开发交付TODO；后续60日数据验收TODO。启用累积后后者可变WAITING；本次交付依据计划2.1及DC-T25，不能因后台观察未满误认为代码未完成，也不能跳过短期真实运行。

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
| DC-04 主备 | IN_PROGRESS | PASS：Python适配器23/23、Linux ARM64容器导入、盘后真实探针；BaoStock超时后Sina返回3只×48条 | NOT_RUN | [DC-04证据](../../evidence-data-collection-dc04.md) | 交易时段完成DC-T19、许可/限频核验和真实源审计，再启用正式采集 |
| DC-05 补采覆盖 | IN_PROGRESS | PASS：质量/覆盖单测12/12、真实PostgreSQL回归8/8、历史归档逐日覆盖与回放20/20通过、质量/覆盖及GapRecord/补采HTTP烟测 | NOT_RUN | [DC-05证据](../../evidence-data-collection-dc05.md)；[DC-T23真实归档回放](../../../evidence/dc08a/historical-replay-2026-09-16.json) | 实际补采执行、停牌权威核验、每日自动覆盖报告和盘中数据持续观察 |
| DC-06 多项目Web/API | DONE | PASS：项目规则17/17单测、PostgreSQL集成10/10、平台 API/Web 构建、DC-06 Playwright 1/1、数据库令牌认证/权限/真实Artifact分页/导出脱敏/指标/去重HTTP烟测 | PASS：用户人工验收通过 | [DC-06证据](../../evidence-data-collection-dc06.md) | 运行期观察 |
| DC-07 部署运维 | DONE（本机范围） | PASS：Mac ARM64 Compose 配置/健康、market-data 重启约11.957s恢复、1CPU/1GiB资源限制、告警Outbox 11/11、PostgreSQL备份SHA-256和隔离恢复20张表；Ubuntu实机人工验证已确认通过 | PASS：Ubuntu实机人工验证通过 | [DC-07证据](../../evidence-data-collection-dc07.md) | 生产外部告警/异机灾备延期；本轮进入DC-03/04实际执行链验证 |
| DC-08A 启用/短期验收 | IN_PROGRESS | PASS：3只跨沪深证券于2026-09-14～2026-09-16各完成48窗口/144根5分钟Bar；2026-09-17目标20只完成48/48窗口、960/960根Bar、0缺口、0待投递Outbox，日终质量报告PASS；切换发生在收盘后，全天盘中观察门槛仍WAITING | NOT_RUN | `evidence/dc08a/daily-report-2026-09-17.json`、[首日验收清单](../../../evidence/dc08a/acceptance-checklist-2026-09-17.md)、[观察记录](../../../evidence/dc08a/observation-2026-09-17T11-37-48-253Z.json) | 下一个实际交易日开盘前核对20只集合并完成全天盘中观察 |
| DC-08B 60日数据验收 | IN_PROGRESS | PASS（历史覆盖） | NOT_RUN | `data/local/baostock-minute-20x60-2024-01-02-2024-04-02-v1/manifest.json`：20只×60交易日×48窗口=57,600根，逐文件 SHA-256 20/20匹配 | 历史分钟回放验收；真实盘中累计仍独立观察，不能以历史导入替代 |

2026-09-16 代码与容量复核：20只证券隔离监控池测试使用 `V25_MONITOR_SIZES=20 pnpm v25:monitor-capacity`，返回 configured/sampled/live 均为20、耗时47ms，测试后 watchlist 恢复3只，未修改正式活动订阅。持久调度器状态接口新增 `lastSuccessfulTickAt`、`nextExecutionAt`、`lastSubmitted`，盘后无待执行窗口时仅保留低频健康轮询。market-data-service 单元35/35、PostgreSQL集成17/17、全仓 lint/typecheck/test、契约/Fixture、Docker DC-07、V2.5 Web E2E、ARM64兼容性均通过；`pnpm test:integration` 在 Docker 服务启动且使用可访问宿主网络后通过，运行ID为 `9bf69efc-0922-44a7-a397-2f49a060da72`（normal）、`7caf6007-2a7e-4086-9b0a-e523ab43a96d`（rejection）、`0b77e43f-dd27-4b06-89f3-0816e2539452`（recovery）。人工验收和真实交易日观察不因本次自动测试提前签署。

2026-09-16 DC-08B/DC-T23：20只冻结证券的 BaoStock 5分钟归档覆盖严格达到60个交易日、57,600根 Bar；逐文件完整性、逐日窗口与真实归档回放20/20通过。历史覆盖与回放证据已记录，但 DC-08A 真实盘中累计和 V2.4 20个实际交易日观察继续独立进行。

2026-09-17 DC-08A 首次20只收盘后补采：自动任务首次请求因 `TypeError: fetch failed` 退出1，受控重试后切换至 `dc08a-20260917-20-v1`；日终完成48/48窗口、960/960根Bar，来源Sina，开放缺口和待投递Outbox均为0。由于切换时间约19:22（收盘后），不计作全天盘中观察日；下一实际交易日继续观察。

2026-09-17 V2.5 分阶段容量：BaoStock 100 只×60 交易日分钟归档完成 288,000 根 Bar，逐文件完整性与 48 窗口校验 PASS；证据为 `evidence/dc08a/historical-coverage-100x60-2024-01-02-2024-04-02.json`。

2026-09-18 V2.5 500只分钟容量：BaoStock 500 只×60 交易日归档完成 1,440,000 根 Bar，逐证券完整性、每日48窗口、重复键、OHLCV 和 Manifest SHA 校验 PASS；同目录续跑退出0且约9秒内跳过已完成证券，未重复下载。独立临时恢复副本树 SHA 与原目录一致，恢复证据为 `evidence/dc08a/historical-coverage-500x60-recovery-2026-09-18.json`。导入过程峰值内存因 macOS 资源采样权限未记录，暂不进入1000只档。

2026-09-18 DC-08A/V2.4观察：20只订阅首个完整交易日完成48/48窗口、960/960根Bar、0缺口、0待投递Outbox，来源均为Sina（BaoStock熔断状态为OPEN）；DC-08A有效日累计1/20。V2.4数据库日终最终记录已累计2026-09-15至2026-09-18共4/20，文档和健康报告仍需保持来源熔断与服务重启后的真实状态。

2026-09-19 运行可靠性与门禁复核：修复 Python 适配器持久限频状态在宿主机重启后可能因 monotonic 时钟回退而产生超长等待的问题；新状态使用 wall-clock 并兼容旧数值格式，新增时钟回退测试，适配器 unittest 17/17 通过。根级新增 `test:python-adapter`、`test:ops` 和 `test:integration:market-data` 入口；运维脚本 61/61、market-data PostgreSQL 集成 17/17 通过。`verify-version` 现在区分 `PASS`/`FAIL`/`INCOMPLETE`，未完成门禁返回退出码2，并忽略通用证据模板中的占位词。V1/V2 README、版本计划、V1.1/V2.4阶段状态和未决事项已按最新证据校准。V2.3 回放 Runner、事件屏障和多窗口执行模型已完成技术收口并通过 code suite；用户已于 2026-09-19 对 V2.3 新收口范围人工确认通过，后续继续累计 DC-08A/V2.4 实际交易日。

2026-09-19 计划1～5执行复核：DC-08A 健康检查与活动订阅检查均 PASS，订阅仍为 `dc08a-20260917-20-v1`；因当天为交易日历 CLOSED，morning/monitor/eod 均正确返回 `NOT_RUN`，未虚增 V2.4 或 DC-08A 有效日，观察计数保持 V2.4 `4/20`、DC-08A `1/20`。V2.5 code suite 重新通过；BaoStock/Sina 5分钟历史能力探针 PASS（证据 `evidence/local/V2.5/minute-source-probe-20260919.json`，live session 仍 NOT_RUN）；BaoStock PIT 探针仍为 PARTIAL，财务/行业修订链和历史有效区间不足，不能解除 PIT 门禁。

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

2026-09-20 计划1～7执行：采集 CLI 现在区分缺省来源与显式空来源，且只初始化实际启用的客户端；来源健康接口报告 `configuredSources`、`enabled` 和 `DISABLED` 状态，并兼容数字/字符串时间戳；`.env.example` 与 Compose 已补齐 `STOCKQUANT_COLLECTION_SOURCES`。历史覆盖/回放脚本默认生成带 UTC 执行时间的新证据文件，并拒绝覆盖已有文件；此前被重复运行改写的 2026-09-16 历史时间戳已恢复。稳定性探针新增全局预算和 stderr 进度，仍只以有界样本判定，不能解除长期稳定性门禁。适配器、TypeScript、运维和文档回归待本次执行收尾后追加原始退出码。

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

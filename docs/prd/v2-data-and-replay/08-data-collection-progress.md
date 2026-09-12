# 共享数据采集：进度、问题及接续记录

日期：2026-09-12；计划版本1.1。入口：[开发计划](./06-shared-data-collection-plan.md)、[测试手册](./07-data-collection-tests.md)。此文件是开发接续的主记录，业务进度不得只留在聊天中。

## 1. 状态规则

开发状态用TODO / IN_PROGRESS / BLOCKED / DONE；测试用NOT_RUN / PASS / FAIL；运行等待用WAITING；人工验收独立记录。DONE必须有实现和所需测试证据。文档已编写不表示业务已实现；历史脚本通过不能使新模块工作包自动DONE。

## 2. 当前完成与待办

当前优先级：先完成本模块DC-00～DC-07及DC-08A，再恢复主项目其他开发；DC-08B届时后台继续。仅本模块必要兼容修改和原有功能回归可在当前开发；既有观察任务继续。任务开始时重新核对Git及部署状态，本文尚不表示已经启动开发。

两项交付分别记录：本次模块开发交付TODO；后续60日数据验收TODO。启用累积后后者可变WAITING；本次交付依据计划2.1及DC-T25，不能因后台观察未满误认为代码未完成，也不能跳过短期真实运行。

- [x] 梳理用户需求、当前代码结构及仓库已有证据，形成版本化计划、测试矩阵和接续机制。
- [x] 完成新模块实现及自动测试（DC-00～DC-02 当前切片；调度/主备/部署仍待后续工作包）。
- [ ] 验证盘中真实来源能力并启用正式采集任务。
- [ ] 完成Mac/Ubuntu运行、备用切换、备份/恢复与人工验收。
- [ ] 获得固定证券集合的严格60交易日真实覆盖并完成回放验收。

| 工作包 | 开发状态 | 自动测试 | 人工验收 | 本包证据 | 下一动作 |
|---|---|---|---|---|---|
| DC-00 来源能力 | IN_PROGRESS | PASS（历史）/NOT_RUN（盘中） | NOT_RUN | [DC-00来源能力记录](../../evidence-data-collection-dc00.md)；探针退出0 | 在实际交易时段完成DC-T19盘中更新/延迟/切换观测；60日第二源仍未满足 |
| DC-01 契约设计 | DONE（设计冻结） | PASS：contracts/fixtures/docs检查 | NOT_RUN | [ADR-0005](../../decisions/ADR-0005-shared-data-collection-boundary.md)、3个JSON Schema、冻结输入 | 进入DC-02持久最小切片；生成客户端/迁移仍待实现 |
| DC-02 持久切片 | DONE | PASS：TS、4单测、真实PostgreSQL 6集成测（进程终止接管、Outbox重试、Fixture→Artifact原子发布）、HTTP幂等烟测 | NOT_RUN | [DC-02证据](../../evidence-data-collection-dc02.md) | 进入DC-03交易日历/Clock调度；不得将本包自动PASS当成人工验收 |
| DC-03 调度 | IN_PROGRESS | PASS：TS、8个服务单测、真实PostgreSQL调度集成7/7、HTTP配置烟测；计划/持久API和Worker已实现 | NOT_RUN | [DC-03证据](../../evidence-data-collection-dc03.md) | 在DC-07完成容器部署、目标环境实际交易日运行、Web/验收中心接入 |
| DC-04 主备 | IN_PROGRESS | PASS：Python适配器5/5；TS检查通过；主备/熔断/字段隔离已验证 | NOT_RUN | [DC-04证据](../../evidence-data-collection-dc04.md) | 交易时段完成DC-T19、许可/限频核验和真实源审计，再接入正式采集 |
| DC-05 补采覆盖 | IN_PROGRESS | PASS：质量/覆盖单测12/12、真实PostgreSQL回归8/8、质量/覆盖及GapRecord/补采HTTP烟测 | NOT_RUN | [DC-05证据](../../evidence-data-collection-dc05.md) | 实际补采执行、停牌权威核验、每日自动覆盖报告和真实60日覆盖 |
| DC-06 多项目Web/API | DONE | PASS：项目规则17/17单测、PostgreSQL集成10/10、平台 API/Web 构建、DC-06 Playwright 1/1、数据库令牌认证/权限/真实Artifact分页/导出脱敏/指标/去重HTTP烟测 | PASS：用户人工验收通过 | [DC-06证据](../../evidence-data-collection-dc06.md) | 运行期观察 |
| DC-07 部署运维 | IN_PROGRESS | PASS：Mac ARM64 Compose 配置/健康、market-data 重启约11.957s恢复、1CPU/1GiB资源限制、告警Outbox 11/11、PostgreSQL备份SHA-256和隔离恢复20张表；Ubuntu实机人工验证已确认通过 | PASS：Ubuntu实机人工验证通过 | [DC-07证据](../../evidence-data-collection-dc07.md) | 外部告警出口故障/恢复、宿主机重启续跑记录、完善操作手册 |
| DC-08A 启用/短期验收 | TODO | NOT_RUN | NOT_RUN | 未启动本模块采集 | DC-07后3只2实际交易日、20只1实际交易日，交接并恢复主项目 |
| DC-08B 60日数据验收 | TODO | NOT_RUN | NOT_RUN | 未启动本模块采集 | DC-08A后后台累计；到期严格覆盖/回放验收 |

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
| DC-B02 | 首批20只清单、实际启动日期、允许消费字段 | DC-01/08 | OPEN；优先使用已有20只清单；冻结后才计覆盖 |
| DC-B03 | 日历来源与有效年限、特殊交易日规则 | DC-01/03 | OPEN；未知日期暂停受影响市场 |
| DC-B04 | 独立备份路径、保留期限和告警目的地 | DC-07 | UNSET；开发使用隔离资源，正式备份/外部通知验收不通过 |
| DC-B05 | Ubuntu主机/架构、资源及部署位置 | DC-07 | UNSET；以前其他模块的Ubuntu人工通过不覆盖本模块 |
| DC-B06 | 其他项目的数据种类/身份/用途与许可 | DC-06及新增适配器时 | OPEN；先两个隔离Fixture消费者验共享，未支持类型明确拒绝 |

## 5. 首次记录

本节历史记录保留；最新安排以第6节为准。

2026-09-12：完成计划文档；工作区开始时干净；核实market-data-service实际为TS且部分状态为内存Map，Python分钟导入脚本独立存在。既有58日、来源超时、TDX缺真实文件等结论来自历史证据。新正式采集任务未创建，既有V2.4观察任务未变更。DC-00历史探针三只跨沪深证券的BaoStock/Sina查询均成功；盘中能力未在交易时段执行，保持NOT_RUN。DC-01契约设计冻结并通过JSON/Fixture/Markdown检查。DC-02已完成持久表、任务API、单元/真实数据库集成和HTTP幂等烟测；Worker故障接管、消息/数据库故障、完整Fixture发布链仍待完成。

文档校验：`pnpm docs:check`退出0，391个本地Markdown链接、0失败；`git diff --check`退出0。DC-00探针静态检查、contracts、fixtures和文档检查退出0；DC-T01～DC-T25均有输入、操作和预期。DC-01设计检查PASS；新模块持久化/调度业务测试和人工验收仍NOT_RUN。

## 6. 计划1.1变更及后续交接

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

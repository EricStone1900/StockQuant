# 在线股票池与市场监控服务

服务：`market-monitor-service`。设计日期：2026-09-07；截至2026-10-19，C2-C质量投影持久化/API/Web切片已实现并通过定向自动检查；其余调度、持续监控及阶段人工验收仍NOT_RUN。技术基线：Python / FastAPI。

共同约束见[整体架构](../01-system-architecture.md)、[契约与数据](../02-contracts-and-data.md)、[部署](../03-deployment-and-operations.md)。本文是服务S0设计输入；逻辑表与扩展端口需在对应阶段冻结Schema/迁移，不表示已有实现。

## 1. 范围与交付

V2.1在线池/采样策略与质量；V2.4持续监控；高级盘中风险动作/漂移模型后续。

唯一拥有：Watchlist及优先级、MonitorPolicy、采样/评估窗口、覆盖/年龄质量和确定性异常；行情原始事实仍归market-data。

边界：不独立形成第二套行情权威源，不把≤100池作为全市场，不直接下单/放宽风险或用稀疏快照造Bar。

## 2. 内部分层

domain：池合并/容量、时间窗口/质量/冷却；application：更新池、请求采样、评估/异常合并；ports：MarketData、Portfolio/Execution只读、Calendar/Clock；adapters：DB/API、调度。

服务目录：`services/market-monitor-service/`，包含src、独立依赖锁、migrations、Dockerfile、README和分层tests。domain不依赖框架/SDK；application依赖ports，由bootstrap注入adapters。配置验证失败需明确依赖项。

## 3. 数据与一致性

逻辑持久化：watchlists/memberships、monitor_policy_versions、window_runs、quality_snapshots、anomaly_records、cooldowns、quote_refs。

事务/幂等：证券去重取最高优先级；窗口键market/watchlistVersion/policy/time区间唯一；同一异常同窗口幂等，冷却与恢复持久化。

每服务独立数据库/User。涉及业务账户与运行的数据按market/account/environmentMode/runId或namespace隔离；命令身份来自可信上下文。不得跨库join获得未授权事实或跨库写入；通过API或事件投影合作。需要事件发布的业务状态与Outbox原子提交，消费者副作用与Inbox同事务。

## 4. 入站接口与出站依赖

| 端口/基线路由 | 契约行为 |
|---|---|
| Watchlist/监控政策读写（S0待冻结路由） | 持仓/在途优先，>100时显式拒绝或阻塞配置。 |
| 采样/窗口查询（S0待冻结路由） | 通过数据服务取得报价引用，显示来源年龄与覆盖。 |
| 异常查询 | 返回阈值/窗口/证据版本；任何动作由治理的已批准政策决定。 |

读组合持仓、执行在途和量化候选合并池；请求数据服务采集/查询；由编排或受控调度器按政策触发，不能两套定时器重复采集。

路由标“待冻结”表示架构意图；已有基线路由引用[市场契约](../../docs/prd/03-market-rules-and-contracts.md)。所有扩展在S0生成OpenAPI/AsyncAPI与TS/Python Client，写命令具备Idempotency-Key、expectedVersion、reason/sourceRef和统一错误。

## 5. 事件与主要流程

事件：发布stock.monitor.anomaly.detected.v1；常规窗口无异常不发模型请求；消费者先检查用途与时效。

1. 聚合持仓/在途/候选/关注，去重并检查≤100。
2. 按市场会话默认30/可选20分钟发起受控采样，记录实际请求和窗口。
3. 评估覆盖/年龄/阈值，复用旧窗口明确标无新证据；确定性异常去重冷却。
4. 平台展示；需要动作时交治理重评，不能绕过预算。

## 6. 故障、权限与恢复

必需证券超限不能静默截断；断源/陈旧标降级；原120/180秒建议与本轮稀疏采样不能直接套用，按SimulationExecutionPolicy和采样政策分别冻结年龄阈值。

所有三版交易通道仅FakeBroker，服务身份只能获得需要的最小访问范围。历史业务时间通过run-scoped Clock，基础设施超时用单调时钟；重试必须区分幂等查询与不确定副作用。恢复需保留原业务ID/幂等键/版本和失败证据。

## 7. 部署与可观测性

Python / FastAPI Worker组件按已启用能力部署；API和长计算/消费者可分进程，未启用的后续服务不需常驻。遵循Mac Linux ARM64小样本及真实Ubuntu目标架构验证，独立健康/版本/迁移/回滚说明。

提供/live、/ready或等价探针，记录服务依赖、版本和队列/任务年龄；日志贯通correlationId/testRunId及适用业务ID。指标包含任务成功/拒绝/失败/耗时、重试与恢复进度，不能只靠HTTP200报业务健康。

## 8. Web与验证

池成员/来源/优先级、20/30分钟配置、实际采样/评估/执行时间、质量和异常。

测试映射：T16/17/38及VT05覆盖本轮采样默认；50/80/100/101容量、午休、重复窗口、陈旧和持仓保护。

自动检查与人工验收分别记录；使用阶段文件第7节待办及第8节手册交付，必须包含正常/拒绝/恢复、实际命令/URL与证据。共同测试见[总体测试](../../docs/prd/90-test-plan.md)及[三版规则](../../docs/prd/05-three-version-delivery.md)。

## 9. S0冻结与变更检查

- [ ] 本服务实体/端口/所有权与上下游一致，API/事件Schema和错误码已生成。
- [ ] 逻辑表落为实际迁移，唯一约束、并发锁、事务与修订/保留政策已明确。
- [ ] 场景参数/Clock/资源限制/健康探针和运行权限已配置，未知配置保持UNSET。
- [ ] Web、代码测试、故障恢复和人工手册引用同一规则/场景版本。
- [ ] 变更同步PRD/契约/阶段计划/追踪/测试与验收，实测后更新架构证据，不提前勾选。

2026-10-17 V2.1 C2实现边界：Market Data现持久化20/30分钟快照采样间隔，并以明确的A股日历/交易会话函数计算采样节拍；该功能不启动Monitor评估、日频策略或订单执行。快照新鲜阈值当前随采样间隔计算并标记证据，不覆盖V2.4更严格的SimulationExecutionPolicy年龄门禁；独立评估/执行配置与真实时钟调度恢复仍需其阶段实测。

## 10. V2.1 C2消费者交接契约（2026-10-19）

以下契约冻结C2消费者之间的输入/触发边界。Market Data保留带完整scope的`GET /v2/sampling/tasks/latest`读接口，并在采样任务终态事务中写入Monitor Outbox事件；Platform仍可显式读取任务，后台消费者通过独立service identity投递。Monitor只读取终态`COMPLETED_FIXTURE`或`COMPLETED_REAL`任务中的`observations`，并逐条保留`taskId`、`snapshotId`、`securityId`、`sourceId`、`dataMode`、`observedAt`、`ingestedAt`、`availableAt`、`ageSeconds`、`freshness`和`status`；`STALE`/`UNKNOWN`不等价READY。Fixture引用版本/Hash和REAL来源身份随任务保留。Market Data仍是报价事实唯一所有者；Monitor只保存报价引用和自身质量/异常结论。

| 消费者 | 唯一触发与最低输入 | 缺失/门禁行为 |
|---|---|---|
| Monitor | `ON_QUOTE_AVAILABLE`；消费完成快照任务的报价引用和质量字段 | executor `CONFIGURED`；策略默认关闭，只有显式启用后才消费事务Outbox。只对引用字段确定质量，STALE/UNKNOWN保留异常；不调用模型、不发单 |
| 日线完成 | `AFTER_SESSION_CLOSE`；仅消费独立`DAILY_BAR`来源、完成标志、数据版本和`availableAt` | 当前executor `NOT_IMPLEMENTED`；快照不能合成日线/分钟线；来源授权或完整性不足时不发布READY |
| 策略评估 | `ON_DAILY_BAR_READY`；消费已完成日线版本及引用 | 当前executor `NOT_IMPLEMENTED`且受OD-007审批；快照或未完成日线不能触发 |
| 订单执行 | `C5_EXECUTION_WINDOW`；消费已批准的策略/执行授权与风险输入 | 当前executor `NOT_IMPLEMENTED`且受C5批准；本阶段不得创建订单 |

Monitor、日线、策略、订单策略记录默认均为`enabled=false`。快照20/30分钟策略版本变化只影响快照，不改变其他策略版本或触发消费者。Monitor允许在V2.1验收页显式启停；其余日线/策略/订单仍保持关闭且未实现。

2026-10-19 C2-C第一块实现为`services/market-monitor-service/src/stockquant_market_monitor/domain/quote_quality.py`纯领域函数：按预期证券计算FRESH覆盖、最大有效年龄，并将缺失/STALE/UNKNOWN形成为确定性异常；重复证券/观测拒绝。四个标准库测试通过。它不读库、不写质量快照、不接HTTP/调度/Web；这些仍是C2-C待办。DAILY_BAR输入属于Market Data；独立来源/收盘完成领域校验见[Market Data服务记录](./market-data-service.md)和对应审计，不由Market Monitor复制行情事实。


## 11. V2.1 C2-C quote-quality persistence implementation (2026-10-19)

`services/market-monitor-service` now provides an authenticated FastAPI service and a Monitor-owned PostgreSQL schema. `POST /v1/quote-quality/evaluations` accepts only a completed-task projection supplied by Platform, persists deterministic coverage/freshness/anomaly results with the Market Data quote references (IDs, source/data mode, source/availability time, age and state), and is idempotent by exact scope plus task ID. Reusing that key with different input returns `409 QUALITY_TASK_INPUT_CONFLICT`. `GET /v1/quote-quality/latest` reads only the requested market/owner/account/namespace/TestRun scope. The `platform-api-service` identity uses its own bearer; the separate `market-data-service` identity and bearer are accepted only for quote evaluation delivery.

Platform obtains the latest sampling task from Market Data and rejects missing, non-terminal or out-of-scope tasks before its explicit evaluation route. The V2.1 acceptance page can read back the current scope's quality and explicitly enable or disable the independent ON_QUOTE_AVAILABLE policy. The projection does not store prices or mutate Market Data facts; it does not trigger strategy evaluation or order placement. The service has an independent `market_monitor` database/User, migration ledger, health probes, pinned lock files and Compose service. An idempotent one-shot provisioner creates/updates the role and database before Monitor starts, including when the shared PostgreSQL volume predates this service.

Evidence for migration/idempotency/restart/scope isolation, API unit tests and Web E2E is recorded in [the 2026-10-19 C2 Monitor persistence audit](../../evidence/audits/2026-10-19-v21-c2-monitor-persistence.md). The Market Data v17 outbox and lease-based dispatcher now persist completed scoped quote handoffs atomically with the sampling lifecycle finish. Delivery is idempotent by task/consumer, retries after failure, and waits while the Monitor policy is disabled. The projection excludes prices. Isolated PostgreSQL/HTTP restart smoke verifies disabled retention, one delivery after explicit enablement, scope and service identity; see [the 2026-10-20 Monitor Outbox audit](../../evidence/audits/2026-10-20-v21-c2-monitor-outbox-consumer.md). Full Compose-to-Compose persistence/recovery, real-source acceptance and complete C2-C/C2 stage remain unverified.

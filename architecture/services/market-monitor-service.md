# 在线股票池与市场监控服务

服务：`market-monitor-service`。日期：2026-09-07。状态：设计草案；实现/运行/验收均NOT_RUN。技术基线：Python / FastAPI Worker。

共同约束见[整体架构](../01-system-architecture.md)、[契约与数据](../02-contracts-and-data.md)、[部署](../03-deployment-and-operations.md)。本文是服务S0设计输入；逻辑表与扩展端口需在对应阶段冻结Schema/迁移，不表示已有实现。

## 1. 范围与交付

V2.1在线池/采样策略与质量；V2.4持续监控；高级盘中风险动作/漂移模型后续。

唯一拥有：Watchlist及优先级、MonitorPolicy、采样/评估窗口、覆盖/年龄质量和确定性异常；行情原始事实仍归market-data。

边界：不独立形成第二套行情权威源，不把≤100池作为全市场，不直接下单/放宽风险或用稀疏快照造Bar。

## 2. 内部分层

domain：池合并/容量、时间窗口/质量/冷却；application：更新池、请求采样、评估/异常合并；ports：MarketData、Portfolio/Execution只读、Calendar/Clock；adapters：DB/API、调度。

目标目录：`services/market-monitor-service/`，包含src、独立依赖锁、migrations、Dockerfile、README和分层tests。domain不依赖框架/SDK；application依赖ports，由bootstrap注入adapters。配置验证失败需明确依赖项。

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

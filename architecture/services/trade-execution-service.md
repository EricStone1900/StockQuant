# 交易执行、Gateway与对账服务

服务：`trade-execution-service`。日期：2026-09-07。状态：设计草案；实现/运行/验收均NOT_RUN。技术基线：TypeScript / NestJS API + Gateway/报告Worker + PostgreSQL。

共同约束见[整体架构](../01-system-architecture.md)、[契约与数据](../02-contracts-and-data.md)、[部署](../03-deployment-and-operations.md)。本文是服务S0设计输入；逻辑表与扩展端口需在对应阶段冻结Schema/迁移，不表示已有实现。

## 1. 范围与交付

V1.3模拟协议/状态机；V1.5恢复；V2.3历史Adapter；V2.4快照模拟；真实Broker延后。

唯一拥有：BrokerAccountMapping、CapabilitySnapshot、Batch/Intent/Order/Fill、原始回报、累计高水位、ReconciliationCase、发送日志/DispatchPermit/租约。

边界：不写组合账本，不批准策略或Mandate；本轮唯一外部交易端是自有FakeBroker，不接真实券商模拟API。

## 2. 内部分层

domain：批次/订单/回报归一化、对账/发送状态；application：接受批次、发送/查询/撤单、Fill/对账；ports：Authorization/AccountFacts/ExecutionVenue/Clock；adapters：FakeBroker、历史日线/分钟与快照模型、DB；bootstrap：API/Gateway/Worker。

目标目录：`services/trade-execution-service/`，包含src、独立依赖锁、migrations、Dockerfile、README和分层tests。domain不依赖框架/SDK；application依赖ports，由bootstrap注入adapters。配置验证失败需明确依赖项。

## 3. 数据与一致性

逻辑持久化：batches/intents/orders、raw_reports/fills、cumulative_high_watermarks、dispatch_logs/permits、sender_leases、reconciliation_cases、capability_snapshots、inbox/outbox。

事务/幂等：批次/全部Intent/幂等记录/Outbox原子事务；clientOrderId稳定；externalFillId按broker/account命名空间唯一；fencingToken防旧发送者，网络写入不承诺exactly-once。

每服务独立数据库/User。涉及业务账户与运行的数据按market/account/environmentMode/runId或namespace隔离；命令身份来自可信上下文。不得跨库join获得未授权事实或跨库写入；通过API或事件投影合作。需要事件发布的业务状态与Outbox原子提交，消费者副作用与Inbox同事务。

## 4. 入站接口与出站依赖

| 端口/基线路由 | 契约行为 |
|---|---|
| POST /internal/v1/rebalance-batches | 权威校验授权后原子接受；不确定返回acceptanceStatus=UNKNOWN。 |
| GET /internal/v1/orders/by-client-id/{id}；POST /api/v1/orders/{id}/cancel | 查权威状态；cancel为请求，不直接设置CANCELLED。 |
| POST /internal/v1/broker-reports；POST /api/v1/reconciliation-cases/{id}/resolve | 原始回报持久归一化；处理差异要求事实/版本/理由，不能仅关闭提示。 |

同步验证治理授权/撤销与组合资源/风险；数据提供RAW报价/规则；FakeBroker提供独立报告/资产；向组合发布确认Fill。

路由标“待冻结”表示架构意图；已有基线路由引用[市场契约](../../docs/prd/03-market-rules-and-contracts.md)。所有扩展在S0生成OpenAPI/AsyncAPI与TS/Python Client，写命令具备Idempotency-Key、expectedVersion、reason/sourceRef和统一错误。

## 5. 事件与主要流程

事件：发布stock.execution.batch.accepted.v1、stock.execution.fill.recorded.v1、stock.execution.reconciliation.blocked.v1；消费必要暂停/账户变化，但最后发送查权威事实。

1. 原子接受批次；Gateway确认当前sender租约、pauseEpoch、风险/报价/授权和单次Permit。
2. 记发送日志再调用Venue，接受/拒绝落库；响应丢失记UNKNOWN并保留资源。
3. 通过原clientOrderId查询，累计转增量，重复/迟到/非法回报分别处理，Outbox发布Fill。
4. 对照FakeBroker与组合事实生成差异，冲正通过所属域命令；重启DISPATCHING只查询不重发。

## 6. 故障、权限与恢复

部分成交后暂停仍处理Fill；无法查询保持UNKNOWN；累计下降走更正，不记随意负Fill；进程租约失效禁止新place。

所有三版交易通道仅FakeBroker，服务身份只能获得需要的最小访问范围。历史业务时间通过run-scoped Clock，基础设施超时用单调时钟；重试必须区分幂等查询与不确定副作用。恢复需保留原业务ID/幂等键/版本和失败证据。

## 7. 部署与可观测性

TypeScript / NestJS API + Gateway/报告Worker + PostgreSQL组件按已启用能力部署；API和长计算/消费者可分进程，未启用的后续服务不需常驻。遵循Mac Linux ARM64小样本及真实Ubuntu目标架构验证，独立健康/版本/迁移/回滚说明。

提供/live、/ready或等价探针，记录服务依赖、版本和队列/任务年龄；日志贯通correlationId/testRunId及适用业务ID。指标包含任务成功/拒绝/失败/耗时、重试与恢复进度，不能只靠HTTP200报业务健康。

## 8. Web与验证

订单/成交、原始回报来源、UNKNOWN查询/撤单、占用/预算关联、对账和发送时间线；VT03/04/06。

测试映射：T25～31、T48～54模拟子项；原子接受、双Worker、暂停竞态、回报重复乱序及备份恢复。

自动检查与人工验收分别记录；使用阶段文件第7节待办及第8节手册交付，必须包含正常/拒绝/恢复、实际命令/URL与证据。共同测试见[总体测试](../../docs/prd/90-test-plan.md)及[三版规则](../../docs/prd/05-three-version-delivery.md)。

## 9. S0冻结与变更检查

- [ ] 本服务实体/端口/所有权与上下游一致，API/事件Schema和错误码已生成。
- [ ] 逻辑表落为实际迁移，唯一约束、并发锁、事务与修订/保留政策已明确。
- [ ] 场景参数/Clock/资源限制/健康探针和运行权限已配置，未知配置保持UNSET。
- [ ] Web、代码测试、故障恢复和人工手册引用同一规则/场景版本。
- [ ] 变更同步PRD/契约/阶段计划/追踪/测试与验收，实测后更新架构证据，不提前勾选。

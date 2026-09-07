# 工作流编排与市场调度服务

服务：`workflow-orchestration-service`。日期：2026-09-07。状态：设计草案；实现/运行/验收均NOT_RUN。技术基线：TypeScript / Temporal Worker + 调度/事件Starter。

共同约束见[整体架构](../01-system-architecture.md)、[契约与数据](../02-contracts-and-data.md)、[部署](../03-deployment-and-operations.md)。本文是服务S0设计输入；逻辑表与扩展端口需在对应阶段冻结Schema/迁移，不表示已有实现。

## 1. 范围与交付

V1.5完整调度恢复；早期阶段可用明确受控编排切片；V2持续Paper/回放粗粒度管理。

唯一拥有：调度定义/版本、工作流配置和触发去重记录；执行进度/等待由Temporal持久化，业务订单/授权/账本仍归各域。

边界：不代替消息总线或领域数据库，不逐Bar训练/撮合，不由Web定时器启动后台业务循环。

## 2. 内部分层

domain：日历调度策略/触发身份；application：日分析、调仓、日终、回放任务启动/取消；ports：领域API/日历；adapters：Temporal Activities、NATS Starter、调度配置Repository。

目标目录：`services/workflow-orchestration-service/`，包含src、独立依赖锁、migrations、Dockerfile、README和分层tests。domain不依赖框架/SDK；application依赖ports，由bootstrap注入adapters。配置验证失败需明确依赖项。

## 3. 数据与一致性

逻辑持久化：schedule_definitions、trigger_receipts、workflow_config_versions（本域库）；Temporal使用独立持久化存储，禁止直接查改其内部表作为业务API。

事务/幂等：稳定workflowId绑定market/account/tradingDate/策略或trigger/run；Starter消费去重后调用幂等启动，跨存储失败可重试，不以本地Map保存等待。

每服务独立数据库/User。涉及业务账户与运行的数据按market/account/environmentMode/runId或namespace隔离；命令身份来自可信上下文。不得跨库join获得未授权事实或跨库写入；通过API或事件投影合作。需要事件发布的业务状态与Outbox原子提交，消费者副作用与Inbox同事务。

## 4. 入站接口与出站依赖

| 端口/基线路由 | 契约行为 |
|---|---|
| 调度配置/运行查询/暂停（S0待冻结路由） | 版本化时区/会话/窗口；平台只做权限代理。 |
| 领域Activity调用 | strategy-runs→proposals/风险授权→rebalance-batches→对账；携带稳定请求ID。 |
| 回放启动/取消/检查点查询端口 | 转交量化ReplayRunner，不在Temporal里推进每一根Bar。 |

读market-data日历与发布事件；调用quant/governance/execution/portfolio；平台查询工作流，不直接干预内部业务状态。

路由标“待冻结”表示架构意图；已有基线路由引用[市场契约](../../docs/prd/03-market-rules-and-contracts.md)。所有扩展在S0生成OpenAPI/AsyncAPI与TS/Python Client，写命令具备Idempotency-Key、expectedVersion、reason/sourceRef和统一错误。

## 5. 事件与主要流程

事件：消费data-version/strategy-snapshot/proposal授权等事件；事件只触发工作，不能充当授权凭证；工作流进度投影供平台查询。

1. 按市场日历产生唯一触发，检查是否错过窗口及输入版本。
2. 运行分析，遇HOLD结束并记录；人工分支持久等待，自动分支按Mandate继续。
3. 调用执行接受后等待事实收敛和日终对账；失败按错误类型重试或阻塞。
4. 重启恢复等待；过期任务先重评不集中补单，回放使用专用Worker检查点。

## 6. 故障、权限与恢复

网络超时不自动重下UNKNOWN；Temporal不可用时领域查询仍可用；重放工作流事件不得产生重复业务副作用。

所有三版交易通道仅FakeBroker，服务身份只能获得需要的最小访问范围。历史业务时间通过run-scoped Clock，基础设施超时用单调时钟；重试必须区分幂等查询与不确定副作用。恢复需保留原业务ID/幂等键/版本和失败证据。

## 7. 部署与可观测性

TypeScript / Temporal Worker + 调度/事件Starter组件按已启用能力部署；API和长计算/消费者可分进程，未启用的后续服务不需常驻。遵循Mac Linux ARM64小样本及真实Ubuntu目标架构验证，独立健康/版本/迁移/回滚说明。

提供/live、/ready或等价探针，记录服务依赖、版本和队列/任务年龄；日志贯通correlationId/testRunId及适用业务ID。指标包含任务成功/拒绝/失败/耗时、重试与恢复进度，不能只靠HTTP200报业务健康。

## 8. Web与验证

下次调度、市场会话、运行步骤/人工等待、异常恢复、关闭Web后台继续；外部进程演练步骤。

测试映射：T24/32/36/40/48/53/54、VT06；双日历、重复触发、ACK前崩溃、持久等待和错过窗口。

自动检查与人工验收分别记录；使用阶段文件第7节待办及第8节手册交付，必须包含正常/拒绝/恢复、实际命令/URL与证据。共同测试见[总体测试](../../docs/prd/90-test-plan.md)及[三版规则](../../docs/prd/05-three-version-delivery.md)。

## 9. S0冻结与变更检查

- [ ] 本服务实体/端口/所有权与上下游一致，API/事件Schema和错误码已生成。
- [ ] 逻辑表落为实际迁移，唯一约束、并发锁、事务与修订/保留政策已明确。
- [ ] 场景参数/Clock/资源限制/健康探针和运行权限已配置，未知配置保持UNSET。
- [ ] Web、代码测试、故障恢复和人工手册引用同一规则/场景版本。
- [ ] 变更同步PRD/契约/阶段计划/追踪/测试与验收，实测后更新架构证据，不提前勾选。

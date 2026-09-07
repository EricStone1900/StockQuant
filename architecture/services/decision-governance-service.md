# 建议治理与执行授权服务

服务：`decision-governance-service`。日期：2026-09-07。状态：设计草案；实现/运行/验收均NOT_RUN。技术基线：TypeScript / NestJS + PostgreSQL。

共同约束见[整体架构](../01-system-architecture.md)、[契约与数据](../02-contracts-and-data.md)、[部署](../03-deployment-and-operations.md)。本文是服务S0设计输入；逻辑表与扩展端口需在对应阶段冻结Schema/迁移，不表示已有实现。

## 1. 范围与交付

V1.3人工/自动授权；V1.5失效/恢复；V3候选激活后仍复用本域规则。

唯一拥有：Proposal及版本、HumanApproval/Review关联、AutomationMandate、交易次数BudgetReservation、ExecutionAuthorization、受治理经验（后续）。

边界：不拥有现金占用或策略Registry，不改硬风控；用户批准策略/实验不能自动替代每批执行授权。

## 2. 内部分层

domain：建议状态、授权范围/有效期、交易次数/失效；application：提出/修订/审批/自动判定/校验；ports：量化Registry、组合风控/占用、执行接受查询、Clock；adapters：DB/API/Event。

目标目录：`services/decision-governance-service/`，包含src、独立依赖锁、migrations、Dockerfile、README和分层tests。domain不依赖框架/SDK；application依赖ports，由bootstrap注入adapters。配置验证失败需明确依赖项。

## 3. 数据与一致性

逻辑持久化：proposals/proposal_versions、human_approvals、mandate_versions、budget_reservations、execution_authorizations、review_refs、inbox/outbox。

事务/幂等：同输入/策略/触发键去重；预算按portfolio/market/tradingDate锁定；授权绑定Hash/账户/mode/占用，变更生成新版本；跨服务预留用Saga而非跨库事务。

每服务独立数据库/User。涉及业务账户与运行的数据按market/account/environmentMode/runId或namespace隔离；命令身份来自可信上下文。不得跨库join获得未授权事实或跨库写入；通过API或事件投影合作。需要事件发布的业务状态与Outbox原子提交，消费者副作用与Inbox同事务。

## 4. 入站接口与出站依赖

| 端口/基线路由 | 契约行为 |
|---|---|
| POST /internal/v1/proposals；POST /api/v1/proposals/{id}/approve、/reject、/revise | HOLD与调仓分开；修订增加版本并重跑证据/风控。 |
| POST /api/v1/automation-mandates；POST /api/v1/automation-mandates/{id}/activate、/pause、/revoke | 授权精确策略/账户/范围/时段/限额；实际用户身份校验。 |
| POST /internal/v1/authorizations；POST /internal/v1/authorizations/{id}/validate | 从权威组合与Registry核对事实，不接受前端自填批准标志。 |

量化只提供目标与策略版本；组合负责风险/现金/证券预留；执行回报是否接受批次；编排负责驱动步骤/重试等待。

路由标“待冻结”表示架构意图；已有基线路由引用[市场契约](../../docs/prd/03-market-rules-and-contracts.md)。所有扩展在S0生成OpenAPI/AsyncAPI与TS/Python Client，写命令具备Idempotency-Key、expectedVersion、reason/sourceRef和统一错误。

## 5. 事件与主要流程

事件：发布stock.governance.mandate.changed.v1和stock.governance.proposal.authorized.v1；消费batch.accepted及portfolio.snapshot.changed处理预算/失效。

1. 校验证据与策略，HOLD直接记录不占交易预算。
2. 经硬风控后选择人工或AUTO_POLICY；确认预算与账户资源，再签短期执行授权。
3. 执行接受即消费次数；通知缺失时DISPATCHING继续占位并查询执行事实。
4. 参数/策略/授权/非预期账户变化使旧证据失效；剩余交易如变化需新建议授权。

## 6. 故障、权限与恢复

风控/身份/账户不可验证则拒绝新授权；未知接受不退预算；撤销不谎称在途单已消失；跨服务部分失败仅释放有证据可释放的预留。

所有三版交易通道仅FakeBroker，服务身份只能获得需要的最小访问范围。历史业务时间通过run-scoped Clock，基础设施超时用单调时钟；重试必须区分幂等查询与不确定副作用。恢复需保留原业务ID/幂等键/版本和失败证据。

## 7. 部署与可观测性

TypeScript / NestJS + PostgreSQL组件按已启用能力部署；API和长计算/消费者可分进程，未启用的后续服务不需常驻。遵循Mac Linux ARM64小样本及真实Ubuntu目标架构验证，独立健康/版本/迁移/回滚说明。

提供/live、/ready或等价探针，记录服务依赖、版本和队列/任务年龄；日志贯通correlationId/testRunId及适用业务ID。指标包含任务成功/拒绝/失败/耗时、重试与恢复进度，不能只靠HTTP200报业务健康。

## 8. Web与验证

建议时间线、风险与拒绝、人工修改差异、Mandate范围/剩余额度、暂停；自动路径不逐单等待人工。

测试映射：T22～27、T31、T48/49/52；Hash/模式/版本伪造、第三批拒绝、60日HOLD及并发预留Saga。

自动检查与人工验收分别记录；使用阶段文件第7节待办及第8节手册交付，必须包含正常/拒绝/恢复、实际命令/URL与证据。共同测试见[总体测试](../../docs/prd/90-test-plan.md)及[三版规则](../../docs/prd/05-three-version-delivery.md)。

## 9. S0冻结与变更检查

- [ ] 本服务实体/端口/所有权与上下游一致，API/事件Schema和错误码已生成。
- [ ] 逻辑表落为实际迁移，唯一约束、并发锁、事务与修订/保留政策已明确。
- [ ] 场景参数/Clock/资源限制/健康探针和运行权限已配置，未知配置保持UNSET。
- [ ] Web、代码测试、故障恢复和人工手册引用同一规则/场景版本。
- [ ] 变更同步PRD/契约/阶段计划/追踪/测试与验收，实测后更新架构证据，不提前勾选。

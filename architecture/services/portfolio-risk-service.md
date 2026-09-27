# 账户、组合账本与硬风控服务

服务：`portfolio-risk-service`。日期：2026-09-07。状态：设计草案；实现/运行/验收均NOT_RUN。技术基线：TypeScript / NestJS + PostgreSQL。

共同约束见[整体架构](../01-system-architecture.md)、[契约与数据](../02-contracts-and-data.md)、[部署](../03-deployment-and-operations.md)。本文是服务S0设计输入；逻辑表与扩展端口需在对应阶段冻结Schema/迁移，不表示已有实现。

## 1. 范围与交付

V1.1账户初始化；V1.3资源/风控/账本；V1.4起回测/结算；各版复用。

唯一拥有：Account、Portfolio、不可变LedgerEntry、PositionLot、CashSettlement、RiskPolicy/Evaluation、账户级ResourceReservation及组合快照。

边界：不签发Mandate/ExecutionAuthorization，不创建券商订单；不能用平台缓存或研究预测代替可用现金。

## 2. 内部分层

domain：Money/Quantity、账户/持仓Lot、结算/风控/占用；application：初始化、评估、预留/释放、Fill入账、估值/公司行动；ports：数据/券商快照读取、Repository/Clock/Event；adapters：DB和API客户端。

目标目录：`services/portfolio-risk-service/`，包含src、独立依赖锁、migrations、Dockerfile、README和分层tests。domain不依赖框架/SDK；application依赖ports，由bootstrap注入adapters。配置验证失败需明确依赖项。

## 3. 数据与一致性

逻辑持久化：accounts/portfolios、ledger_entries、position_lots、cash_settlements、risk_policy_versions/evaluations、resource_reservations、portfolio_snapshots、inbox/outbox。

事务/幂等：初始化键唯一；Fill来源唯一约束；账户/币种/证券资源在事务内锁定，多个策略共享账户不能双重占用；Inbox与入账及快照版本推进同事务。

每服务独立数据库/User。涉及业务账户与运行的数据按market/account/environmentMode/runId或namespace隔离；命令身份来自可信上下文。不得跨库join获得未授权事实或跨库写入；通过API或事件投影合作。需要事件发布的业务状态与Outbox原子提交，消费者副作用与Inbox同事务。

## 4. 入站接口与出站依赖

| 端口/基线路由 | 契约行为 |
|---|---|
| GET /api/v1/accounts/{id}/snapshot；GET /api/v1/portfolios/{id}/ledger | 返回原币、可用/冻结/未结算、可卖量及ledgerVersion。 |
| POST /internal/v1/risk-evaluations | 校验全Leg及中间路径，绑定策略/证据/账户版本。 |
| POST /internal/v1/resource-reservations | 按最新事实预留，输入预计费用/数量及幂等键；释放须有权威执行证据。 |

读取数据规则/价格/FX/公司行动；消费执行归一化Fill和模拟券商快照；向治理提供风险/占用，向执行提供最新资源事实。

路由标“待冻结”表示架构意图；已有基线路由引用[市场契约](../../docs/prd/03-market-rules-and-contracts.md)。所有扩展在S0生成OpenAPI/AsyncAPI与TS/Python Client，写命令具备Idempotency-Key、expectedVersion、reason/sourceRef和统一错误。

## 5. 事件与主要流程

事件：消费stock.execution.fill.recorded.v1及公司行动；发布stock.portfolio.snapshot.changed.v1；告警/阻塞事件在服务S0冻结。

1. 初始化独立CN/US账户和期初Lot，重复无累加。
2. 评估全组合与顺序现金路径，事务预留账户资源；CNY不能替代USD购买力。
3. 确认Fill唯一入账，结算/费用/可卖量按当时版本更新；正常批次变化返回最新ledgerVersion。
4. 日终估值与公司行动冲正保持来源链，未知财务差异阻断新交易但不丢合法成交。

## 6. 故障、权限与恢复

UNKNOWN不按TTL释放；缺FX返回原币和缺失状态；异常已确认成交仍先合法入账再报警；不直接改旧流水。

所有三版交易通道仅FakeBroker，服务身份只能获得需要的最小访问范围。历史业务时间通过run-scoped Clock，基础设施超时用单调时钟；重试必须区分幂等查询与不确定副作用。恢复需保留原业务ID/幂等键/版本和失败证据。

## 7. 部署与可观测性

TypeScript / NestJS + PostgreSQL组件按已启用能力部署；API和长计算/消费者可分进程，未启用的后续服务不需常驻。遵循Mac Linux ARM64小样本及真实Ubuntu目标架构验证，独立健康/版本/迁移/回滚说明。

提供/live、/ready或等价探针，记录服务依赖、版本和队列/任务年龄；日志贯通correlationId/testRunId及适用业务ID。指标包含任务成功/拒绝/失败/耗时、重试与恢复进度，不能只靠HTTP200报业务健康。

## 8. Web与验证

账户资金/持仓/可卖量、风险拒绝、中间路径、占用、账本/冲正；手算10000-100×10-5=8995。

测试映射：T01、T23～29、T42～47；双策略并发不超支、重复Fill一次、公司行动不双算及结算假期。

自动检查与人工验收分别记录；使用阶段文件第7节待办及第8节手册交付，必须包含正常/拒绝/恢复、实际命令/URL与证据。共同测试见[总体测试](../../docs/prd/90-test-plan.md)及[三版规则](../../docs/prd/05-three-version-delivery.md)。

## 实现证据补充（2026-09-25）

早期准备记录（2026-09-25）：`PostgresAccountRepository`先增加了资源预留持久表及BUY现金/SELL可卖数量primitive；当时尚未暴露API或实现Fill与预留原子结算。后续的HTTP身份和结算实现见下面的补充记录；Portfolio的S0门禁仍未完成。

服务身份补充（2026-09-25）：平台API、FakeBroker执行服务和历史回放Worker现使用各自独立Bearer Token；portfolio服务以恒定时间比较凭据并按调用方/HTTP方法/路径做最小授权，`service-id`只作身份选择器。缺失/无效token分别拒绝为503/401，未授权route为403；读账户仍强制owner scope。临时portfolio服务在`portfolio_risk_test`上通过HTTP smoke，覆盖有效平台初始化/查询、缺失/错token、跨route和跨owner拒绝；临时账户精确清理。Compose把对应引用注入收件服务/发件服务，静态配置检查通过；活动portfolio及其调用容器未重建。资源预留API和BUY/SELL原子Fill能力现已实现；Mandate readiness、risk evaluation和Paper执行调用仍未接线/启用，故P5.5继续未完成。

原子Fill补充（2026-09-25）：`ReservedFillCommand`现由规范Schema/类型/OpenAPI描述。PAPER Fill必须绑定账户范围内的资源预留；账户、预留、Fill、现金/持仓和Ledger在同一事务更新，重复Fill做语义核对并幂等回放。部分成交仅扣减已使用的现金/数量，剩余HELD/UNKNOWN仍参与可用资源计算；SELL入账扣持仓并增加净现金。专用`portfolio_risk_test`覆盖BUY/SELL及HTTP实际路由。该能力未接FakeBroker Outbox，Mandate/报价/风险/订单前置仍未实现，不能视作完整Paper交易链；详见[原子Fill审计](../../evidence/audits/2026-09-25-p5-5-fill-reservation-atomicity.md)。

## 9. S0冻结与变更检查

- [ ] 本服务实体/端口/所有权与上下游一致，API/事件Schema和错误码已生成。
- [ ] 逻辑表落为实际迁移，唯一约束、并发锁、事务与修订/保留政策已明确。
- [ ] 场景参数/Clock/资源限制/健康探针和运行权限已配置，未知配置保持UNSET。
- [ ] Web、代码测试、故障恢复和人工手册引用同一规则/场景版本。
- [ ] 变更同步PRD/契约/阶段计划/追踪/测试与验收，实测后更新架构证据，不提前勾选。

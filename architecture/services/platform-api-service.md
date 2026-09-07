# 平台API、身份与开发验收中心

服务：`platform-api-service`。日期：2026-09-07。状态：设计草案；实现/运行/验收均NOT_RUN。技术基线：TypeScript / NestJS BFF + 持久任务协调。

共同约束见[整体架构](../01-system-architecture.md)、[契约与数据](../02-contracts-and-data.md)、[部署](../03-deployment-and-operations.md)。本文是服务S0设计输入；逻辑表与扩展端口需在对应阶段冻结Schema/迁移，不表示已有实现。

## 1. 范围与交付

V1.1建立身份/健康/TestRun，全部14阶段增量扩展；不新增独立验收平台服务。

唯一拥有：本地身份/会话、偏好、平台审计、通知投影、TestScenario目录/版本、TestRun元数据、TestAssertion和AcceptanceRecord。

边界：不拥有交易资金/订单事实，不直接跨库读写领域，不授予Web任意SQL/shell或Docker能力。

## 2. 内部分层

domain：测试场景/运行/人工签署、访问范围；application：BFF聚合、测试编排、证据导出、暂停命令转发；ports：领域Clients/JobCoordinator/Artifact；adapters：DB、会话认证、只读投影；bootstrap：API/受控后台任务。

目标目录：`services/platform-api-service/`，包含src、独立依赖锁、migrations、Dockerfile、README和分层tests。domain不依赖框架/SDK；application依赖ports，由bootstrap注入adapters。配置验证失败需明确依赖项。

## 3. 数据与一致性

逻辑持久化：identities/sessions、preferences、platform_audits、notification_projections、test_scenarios、test_runs、test_assertions、acceptance_records、job_dispatch_records。

事务/幂等：TestRun创建与持久派发记录同事务，后台恢复不会重复创建业务运行；stage/scenario/version唯一；人工结论追加、绑定代码/run，不能覆盖原失败。

每服务独立数据库/User。涉及业务账户与运行的数据按market/account/environmentMode/runId或namespace隔离；命令身份来自可信上下文。不得跨库join获得未授权事实或跨库写入；通过API或事件投影合作。需要事件发布的业务状态与Outbox原子提交，消费者副作用与Inbox同事务。

## 4. 入站接口与出站依赖

| 端口/基线路由 | 契约行为 |
|---|---|
| GET /api/v1/dashboard；GET /api/v1/alerts；POST /api/v1/control/pause | 带账户范围聚合，暂停转发治理/执行，局部失败明确展示。 |
| 场景列表/创建TestRun/查询/取消（S0待冻结路由） | CLI与Web同入口，202仅受理；初始化通过业务API。 |
| check-only/证据导出/人工签署端口（S0待冻结路由） | 同run后端事实断言；禁止新增订单/模型调用；人工签署校验实际用户身份。 |

通过生成Client读写各领域；粗粒度长任务可委托workflow；证据存Artifact引用；Stage能力不足明确阻塞。

路由标“待冻结”表示架构意图；已有基线路由引用[市场契约](../../docs/prd/03-market-rules-and-contracts.md)。所有扩展在S0生成OpenAPI/AsyncAPI与TS/Python Client，写命令具备Idempotency-Key、expectedVersion、reason/sourceRef和统一错误。

## 5. 事件与主要流程

事件：消费领域事件构建可重建通知/状态投影；按aggregateVersion去重；关键写操作仍向领域权威校验。

1. 登录并授权到模拟namespace；选择stage/scenario固定输入并生成testRunId。
2. 持久受理、后台通过领域API准备隔离账户/数据、触发功能，收集真实业务ID。
3. 独立读取事实计算expected/actual，Web/CLI查看同run；浏览器关闭不影响任务。
4. 导出脱敏证据，实际用户追加人工结论；脚本不得代签，清理仅选定非活动运行。

## 6. 故障、权限与恢复

某领域503返回分区失败/陈旧，不能当正常空值；未满观察期WAITING，零测试/缺脚本不能PASS；平台故障不导致交易服务停收合法Fill。

所有三版交易通道仅FakeBroker，服务身份只能获得需要的最小访问范围。历史业务时间通过run-scoped Clock，基础设施超时用单调时钟；重试必须区分幂等查询与不确定副作用。恢复需保留原业务ID/幂等键/版本和失败证据。

## 7. 部署与可观测性

TypeScript / NestJS BFF + 持久任务协调组件按已启用能力部署；API和长计算/消费者可分进程，未启用的后续服务不需常驻。遵循Mac Linux ARM64小样本及真实Ubuntu目标架构验证，独立健康/版本/迁移/回滚说明。

提供/live、/ready或等价探针，记录服务依赖、版本和队列/任务年龄；日志贯通correlationId/testRunId及适用业务ID。指标包含任务成功/拒绝/失败/耗时、重试与恢复进度，不能只靠HTTP200报业务健康。

## 8. Web与验证

正式导航/总览及/acceptance的版本阶段、场景、任务、证据、差异、人工记录；见组件文档。

测试映射：T01～03、T22/35～37、VT01；run越权、幂等、关闭Web、只读核对无副作用及不能自动签署。

自动检查与人工验收分别记录；使用阶段文件第7节待办及第8节手册交付，必须包含正常/拒绝/恢复、实际命令/URL与证据。共同测试见[总体测试](../../docs/prd/90-test-plan.md)及[三版规则](../../docs/prd/05-three-version-delivery.md)。

## 9. S0冻结与变更检查

- [ ] 本服务实体/端口/所有权与上下游一致，API/事件Schema和错误码已生成。
- [ ] 逻辑表落为实际迁移，唯一约束、并发锁、事务与修订/保留政策已明确。
- [ ] 场景参数/Clock/资源限制/健康探针和运行权限已配置，未知配置保持UNSET。
- [ ] Web、代码测试、故障恢复和人工手册引用同一规则/场景版本。
- [ ] 变更同步PRD/契约/阶段计划/追踪/测试与验收，实测后更新架构证据，不提前勾选。

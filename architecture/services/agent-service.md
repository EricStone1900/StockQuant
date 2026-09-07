# Agent与模型网关服务

服务：`agent-service`。日期：2026-09-07。状态：设计草案；实现/运行/验收均NOT_RUN。技术基线：TypeScript / 通用Kernel + Provider Adapter。

共同约束见[整体架构](../01-system-architecture.md)、[契约与数据](../02-contracts-and-data.md)、[部署](../03-deployment-and-operations.md)。本文是服务S0设计输入；逻辑表与扩展端口需在对应阶段冻结Schema/迁移，不表示已有实现。

## 1. 范围与交付

V3按需交付模型网关/预算审计/Schema验证必要子集；六角色分析和Memory工具后续，不阻塞V1/V2。

唯一拥有：AgentRun、ModelRun、模型Profile/Prompt版本、ContextManifest和Tool审计；经验批准事实属于治理。

边界：不持Broker凭证、不直接改风险/资金/策略Registry；模型请求成功不等于建议或晋升批准。

## 2. 内部分层

domain：Profile/预算/权限/Schema/时效；application：模型调用、Agent运行、工具调度/降级；ports：ModelProvider/只读Context与Artifact；adapters：Provider/DB；bootstrap：API/异步Worker。

目标目录：`services/agent-service/`，包含src、独立依赖锁、migrations、Dockerfile、README和分层tests。domain不依赖框架/SDK；application依赖ports，由bootstrap注入adapters。配置验证失败需明确依赖项。

## 3. 数据与一致性

逻辑持久化：model_profiles/prompt_versions、model_runs、agent_runs、context_manifests、tool_invocations、budget_entries、evaluation_reports。

事务/幂等：每次实际Provider调用独立modelRunId；关联逻辑请求和重试链；预算原子预留/消费；超时未知费用保留不确定状态，不能视为免费重试。

每服务独立数据库/User。涉及业务账户与运行的数据按market/account/environmentMode/runId或namespace隔离；命令身份来自可信上下文。不得跨库join获得未授权事实或跨库写入；通过API或事件投影合作。需要事件发布的业务状态与Outbox原子提交，消费者副作用与Inbox同事务。

## 4. 入站接口与出站依赖

| 端口/基线路由 | 契约行为 |
|---|---|
| 模型请求/运行查询（V3前S0冻结） | profile、上下文引用、输出Schema、预算、超时；调用方权限与作用域。 |
| 可选Agent/Tool接口 | 只允许注册工具与有效参数/只读资源；后续六角色共用Kernel而非六套服务。 |

研究服务/可选新闻状态分析调用模型端口；通过授权只读Client取得当时证据；外部Provider为真实可用配置而非预设供应商。

路由标“待冻结”表示架构意图；已有基线路由引用[市场契约](../../docs/prd/03-market-rules-and-contracts.md)。所有扩展在S0生成OpenAPI/AsyncAPI与TS/Python Client，写命令具备Idempotency-Key、expectedVersion、reason/sourceRef和统一错误。

## 5. 事件与主要流程

事件：模型/Agent完成与失败事件启用时冻结；结果仅供证据/研究，不作为执行授权。

1. 核对profile能力、预算、调用方和Context PIT，持久化请求。
2. 调用Provider，校验结构/工具白名单，有限重试需新modelRunId和剩余预算。
3. 保存输出引用/成本/失败与评测；返回待消费结果，不写交易事实。

## 6. 故障、权限与恢复

Provider全失败或输出无效时阻塞依赖该能力的任务；不动态切策略模式绕过必需复核；QUANT_ONLY无模型调用。

所有三版交易通道仅FakeBroker，服务身份只能获得需要的最小访问范围。历史业务时间通过run-scoped Clock，基础设施超时用单调时钟；重试必须区分幂等查询与不确定副作用。恢复需保留原业务ID/幂等键/版本和失败证据。

## 7. 部署与可观测性

TypeScript / 通用Kernel + Provider Adapter组件按已启用能力部署；API和长计算/消费者可分进程，未启用的后续服务不需常驻。遵循Mac Linux ARM64小样本及真实Ubuntu目标架构验证，独立健康/版本/迁移/回滚说明。

提供/live、/ready或等价探针，记录服务依赖、版本和队列/任务年龄；日志贯通correlationId/testRunId及适用业务ID。指标包含任务成功/拒绝/失败/耗时、重试与恢复进度，不能只靠HTTP200报业务健康。

## 8. Web与验证

V3模型Profile、预算和调用审计；六角色页面后续。真实/录制/Fake模式明确，密钥不回传浏览器。

测试映射：T19～21适用子集、VT07；Schema/越权Tool/PIT、429/超时/预算、未知计费及核心Paper独立性。

自动检查与人工验收分别记录；使用阶段文件第7节待办及第8节手册交付，必须包含正常/拒绝/恢复、实际命令/URL与证据。共同测试见[总体测试](../../docs/prd/90-test-plan.md)及[三版规则](../../docs/prd/05-three-version-delivery.md)。

## 9. S0冻结与变更检查

- [ ] 本服务实体/端口/所有权与上下游一致，API/事件Schema和错误码已生成。
- [ ] 逻辑表落为实际迁移，唯一约束、并发锁、事务与修订/保留政策已明确。
- [ ] 场景参数/Clock/资源限制/健康探针和运行权限已配置，未知配置保持UNSET。
- [ ] Web、代码测试、故障恢复和人工手册引用同一规则/场景版本。
- [ ] 变更同步PRD/契约/阶段计划/追踪/测试与验收，实测后更新架构证据，不提前勾选。

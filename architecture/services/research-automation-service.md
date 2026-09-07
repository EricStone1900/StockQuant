# RD-Agent自动研究服务

服务：`research-automation-service`。日期：2026-09-07。状态：设计草案；实现/运行/验收均NOT_RUN。技术基线：Python API + RD-Agent控制器 + 隔离Runner。

共同约束见[整体架构](../01-system-architecture.md)、[契约与数据](../02-contracts-and-data.md)、[部署](../03-deployment-and-operations.md)。本文是服务S0设计输入；逻辑表与扩展端口需在对应阶段冻结Schema/迁移，不表示已有实现。

## 1. 范围与交付

V1.2兼容探针；V3.1实际小实验、V3.2候选、V3.3扩容恢复、V3.4Ubuntu。

唯一拥有：Experiment、实验计划/轮次/预算分配、生成代码CandidateArtifact、失败试验、PromotionRequest及研究检查点。

边界：不拥有生产或模拟策略Registry写批准权，不直接交易；RD-Agent不是第二个同名领域服务。

## 2. 内部分层

domain：实验/候选/预算/检查点；application：研究循环、候选提交、取消/恢复；ports：ModelGateway/ExperimentRunner/QlibEvaluation/Artifact/Clock；adapters：固定RD-Agent fork、模型网关客户端、Docker受控Runner、DB。

目标目录：`services/research-automation-service/`，包含src、独立依赖锁、migrations、Dockerfile、README和分层tests。domain不依赖框架/SDK；application依赖ports，由bootstrap注入adapters。配置验证失败需明确依赖项。

## 3. 数据与一致性

逻辑持久化：experiments/experiment_steps、candidate_artifacts、promotion_requests、research_checkpoints、budget_allocations、runner_jobs、artifact_refs。网关拥有调用实际成本，本域汇总引用不重复计费。

事务/幂等：实验输入/代码Hash与轮次稳定；步骤完成/Artifact指针原子发布；恢复不重复发布或晋升；真实LLM重生成不保证相同。

每服务独立数据库/User。涉及业务账户与运行的数据按market/account/environmentMode/runId或namespace隔离；命令身份来自可信上下文。不得跨库join获得未授权事实或跨库写入；通过API或事件投影合作。需要事件发布的业务状态与Outbox原子提交，消费者副作用与Inbox同事务。

## 4. 入站接口与出站依赖

| 端口/基线路由 | 契约行为 |
|---|---|
| 实验创建/查询/取消（S0待冻结路由） | 固定数据/模型Profile/预算/轮数，202返回run；首轮并发1。 |
| PromotionRequest提交 | 引用精确候选/实验/代码/数据，交quant独立复算；不能调用approve/activate。 |
| 受控Runner任务协议 | 镜像白名单、只读输入、独立输出/资源限额/网络政策；不接受任意宿主挂载。 |

模型调用经统一网关；market-data/quant提供固定数据和评价契约；Qlib实验在隔离镜像运行，quant另做独立候选复算。

路由标“待冻结”表示架构意图；已有基线路由引用[市场契约](../../docs/prd/03-market-rules-and-contracts.md)。所有扩展在S0生成OpenAPI/AsyncAPI与TS/Python Client，写命令具备Idempotency-Key、expectedVersion、reason/sourceRef和统一错误。

## 5. 事件与主要流程

事件：实验完成/失败/候选提交在S0冻结；不把候选事件直接连成策略ACTIVE或订单。

1. 冻结数据/时间切分/模型/代码和预算，真实模型生成假设/代码。
2. Runner按白名单镜像执行Qlib评估，保存全部失败与反例，不能只保留最佳收益。
3. 量化域独立复算，用户批准后进入模拟策略，研究域只能查看晋升状态。
4. 检查点恢复、排队/扩容保持预算与发布幂等，录制响应只用于确定性编排测试。

## 6. 故障、权限与恢复

越权/超时/OOM隔离终止实验；模型响应未知记录可能计费；没有凭证则真实闭环NOT_RUN，不能用预制因子代替。

所有三版交易通道仅FakeBroker，服务身份只能获得需要的最小访问范围。历史业务时间通过run-scoped Clock，基础设施超时用单调时钟；重试必须区分幂等查询与不确定副作用。恢复需保留原业务ID/幂等键/版本和失败证据。

## 7. 部署与可观测性

Python API + RD-Agent控制器 + 隔离Runner组件按已启用能力部署；API和长计算/消费者可分进程，未启用的后续服务不需常驻。遵循Mac Linux ARM64小样本及真实Ubuntu目标架构验证，独立健康/版本/迁移/回滚说明。

提供/live、/ready或等价探针，记录服务依赖、版本和队列/任务年龄；日志贯通correlationId/testRunId及适用业务ID。指标包含任务成功/拒绝/失败/耗时、重试与恢复进度，不能只靠HTTP200报业务健康。

## 8. Web与验证

实验参数/轮次、假设/代码/日志/指标、预算、失败、检查点、候选审批跳转；控制器秘密与Socket不暴露。

测试映射：T12～14/20/38、VT07；实际模型→代码→Qlib、Runner隔离、预算/取消/恢复、独立复算及未批准不晋升。

自动检查与人工验收分别记录；使用阶段文件第7节待办及第8节手册交付，必须包含正常/拒绝/恢复、实际命令/URL与证据。共同测试见[总体测试](../../docs/prd/90-test-plan.md)及[三版规则](../../docs/prd/05-three-version-delivery.md)。

## 9. S0冻结与变更检查

- [ ] 本服务实体/端口/所有权与上下游一致，API/事件Schema和错误码已生成。
- [ ] 逻辑表落为实际迁移，唯一约束、并发锁、事务与修订/保留政策已明确。
- [ ] 场景参数/Clock/资源限制/健康探针和运行权限已配置，未知配置保持UNSET。
- [ ] Web、代码测试、故障恢复和人工手册引用同一规则/场景版本。
- [ ] 变更同步PRD/契约/阶段计划/追踪/测试与验收，实测后更新架构证据，不提前勾选。

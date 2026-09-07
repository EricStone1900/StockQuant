# 量化研究、策略与回测服务

服务：`quant-research-service`。日期：2026-09-07。状态：设计草案；实现/运行/验收均NOT_RUN。技术基线：Python / FastAPI + CPU计算Worker / Qlib Adapter。

共同约束见[整体架构](../01-system-architecture.md)、[契约与数据](../02-contracts-and-data.md)、[部署](../03-deployment-and-operations.md)。本文是服务S0设计输入；逻辑表与扩展端口需在对应阶段冻结Schema/迁移，不表示已有实现。

## 1. 范围与交付

V1.2因子/策略；V1.4日线回测；V2.3分钟回放；V2.5模型验证；V3.2候选复算。

唯一拥有：历史股票池、Factor/Model/Strategy Registry、参数/验证报告、分析/目标快照、Backtest/Replay Manifest、研究结果及Outcome。

边界：不创建真实执行订单，不改账户账本或Mandate；回放只能调用执行/治理/组合端口，不独占另一套交易规则。

## 2. 内部分层

domain：股票池、因子定义、策略版本与晋升、运行清单；application：因子/模型/策略运行、回测、候选复算；ports：数据/组合快照、执行回放/治理、Artifact/Clock；adapters：Qlib、DB、对象存储；bootstrap：API、计算Worker。

目标目录：`services/quant-research-service/`，包含src、独立依赖锁、migrations、Dockerfile、README和分层tests。domain不依赖框架/SDK；application依赖ports，由bootstrap注入adapters。配置验证失败需明确依赖项。

## 3. 数据与一致性

逻辑持久化：universe_versions、factor/model/strategy_versions、validation_runs、strategy_snapshots、research_runs、replay_manifests/checkpoints、outcomes、artifact_refs。模型/矩阵/代码/净值大产物在对象存储。

事务/幂等：运行键绑定数据/代码/参数/时钟/规则Hash；Registry按expectedVersion变更；发布指针、运行终态、Outbox同事务；生成文件Hash与规范数值Hash分开。

每服务独立数据库/User。涉及业务账户与运行的数据按market/account/environmentMode/runId或namespace隔离；命令身份来自可信上下文。不得跨库join获得未授权事实或跨库写入；通过API或事件投影合作。需要事件发布的业务状态与Outbox原子提交，消费者副作用与Inbox同事务。

## 4. 入站接口与出站依赖

| 端口/基线路由 | 契约行为 |
|---|---|
| POST /internal/v1/strategy-runs | 固定输入/市场/组合/策略，返回202/runId。 |
| GET /api/v1/runs/{id} | 运行进度、模式/执行模型、输入Manifest、结果/失败与取消状态。 |
| POST /api/v1/strategies/{id}/versions/{v}/validate、/approve、/activate、/suspend | 独立复算和精确版本授权；研究身份不能执行approve/activate。 |

只读市场数据Artifact、组合快照；治理消费目标快照；回放通过受控端口驱动交易链路；研究服务提交PromotionRequest。

路由标“待冻结”表示架构意图；已有基线路由引用[市场契约](../../docs/prd/03-market-rules-and-contracts.md)。所有扩展在S0生成OpenAPI/AsyncAPI与TS/Python Client，写命令具备Idempotency-Key、expectedVersion、reason/sourceRef和统一错误。

## 5. 事件与主要流程

事件：发布stock.quant.strategy-snapshot.published.v1、stock.quant.outcome.evaluated.v1；消费固定数据版本用于任务触发。

1. 冻结数据/股票池/预热和训练验证测试窗口，按asOf过滤。
2. Qlib计算特征/模型/目标权重，NO_TRADE保持空交易腿。
3. 回测固定执行模型；历史Worker按事件屏障推进，通过真实服务小样本核验共享规则。
4. 完整结果原子发布；候选复算合格后由用户批准版本，交治理形成模拟授权。

## 6. 故障、权限与恢复

OOM/取消不发布半报告；旧快照可读但陈旧；不把LLM重生成随机性作为固定代码复算不一致的理由。

所有三版交易通道仅FakeBroker，服务身份只能获得需要的最小访问范围。历史业务时间通过run-scoped Clock，基础设施超时用单调时钟；重试必须区分幂等查询与不确定副作用。恢复需保留原业务ID/幂等键/版本和失败证据。

## 7. 部署与可观测性

Python / FastAPI + CPU计算Worker / Qlib Adapter组件按已启用能力部署；API和长计算/消费者可分进程，未启用的后续服务不需常驻。遵循Mac Linux ARM64小样本及真实Ubuntu目标架构验证，独立健康/版本/迁移/回滚说明。

提供/live、/ready或等价探针，记录服务依赖、版本和队列/任务年龄；日志贯通correlationId/testRunId及适用业务ID。指标包含任务成功/拒绝/失败/耗时、重试与恢复进度，不能只靠HTTP200报业务健康。

## 8. Web与验证

因子/策略、回测净值/成交/费用、分钟回放控制、候选比较/批准；VT04/06/07。

测试映射：T08～14、T33；手算/无未来泄漏、成本/公司行动一致性、恢复无重复、样本外及独立批准。

自动检查与人工验收分别记录；使用阶段文件第7节待办及第8节手册交付，必须包含正常/拒绝/恢复、实际命令/URL与证据。共同测试见[总体测试](../../docs/prd/90-test-plan.md)及[三版规则](../../docs/prd/05-three-version-delivery.md)。

## 9. S0冻结与变更检查

- [ ] 本服务实体/端口/所有权与上下游一致，API/事件Schema和错误码已生成。
- [ ] 逻辑表落为实际迁移，唯一约束、并发锁、事务与修订/保留政策已明确。
- [ ] 场景参数/Clock/资源限制/健康探针和运行权限已配置，未知配置保持UNSET。
- [ ] Web、代码测试、故障恢复和人工手册引用同一规则/场景版本。
- [ ] 变更同步PRD/契约/阶段计划/追踪/测试与验收，实测后更新架构证据，不提前勾选。

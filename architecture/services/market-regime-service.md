# 市场状态服务（后续可选）

服务：`market-regime-service`。日期：2026-09-07。状态：设计草案；实现/运行/验收均NOT_RUN。技术基线：Python / FastAPI + 状态计算Worker。

共同约束见[整体架构](../01-system-architecture.md)、[契约与数据](../02-contracts-and-data.md)、[部署](../03-deployment-and-operations.md)。本文是服务S0设计输入；逻辑表与扩展端口需在对应阶段冻结Schema/迁移，不表示已有实现。

## 1. 范围与交付

完整状态策略不在V1～V3必交范围；本文保留长期设计，启用前单独建立阶段/测试，不自动启动。

唯一拥有：RegimeDefinition/参数、特征快照、RegimeSnapshot、迟滞计数/状态转换及解释；数据来源不归本域。

边界：不修改RiskPolicy、不从少量在线池宣称全市场宽度、不以数据缺失直接推出STRESS。

## 2. 内部分层

domain：状态定义/阈值/迟滞/覆盖；application：特征计算、状态判定、快照发布、历史回放；ports：MarketData/Clock/Artifact；adapters：DB/计算库/API。

目标目录：`services/market-regime-service/`，包含src、独立依赖锁、migrations、Dockerfile、README和分层tests。domain不依赖框架/SDK；application依赖ports，由bootstrap注入adapters。配置验证失败需明确依赖项。

## 3. 数据与一致性

逻辑持久化：regime_definition_versions、feature_snapshot_refs、regime_snapshots、transition_records、hysteresis_states、outbox。

事务/幂等：按market/定义版本/asOf唯一；状态变化与迟滞计数同事务；重放固定历史输入、定义与顺序。

每服务独立数据库/User。涉及业务账户与运行的数据按market/account/environmentMode/runId或namespace隔离；命令身份来自可信上下文。不得跨库join获得未授权事实或跨库写入；通过API或事件投影合作。需要事件发布的业务状态与Outbox原子提交，消费者副作用与Inbox同事务。

## 4. 入站接口与出站依赖

| 端口/基线路由 | 契约行为 |
|---|---|
| 定义验证/发布、状态查询（启用时S0冻结） | 定义版本化；返回覆盖、质量、解释与有效时间。 |
| 计算/回放任务 | 固定历史股票池/数据；不可使用离线未来状态标签生成当时特征。 |

只读market-data固定发布物；可选量化策略读取状态；治理只接受已声明且时效满足的状态证据。

路由标“待冻结”表示架构意图；已有基线路由引用[市场契约](../../docs/prd/03-market-rules-and-contracts.md)。所有扩展在S0生成OpenAPI/AsyncAPI与TS/Python Client，写命令具备Idempotency-Key、expectedVersion、reason/sourceRef和统一错误。

## 5. 事件与主要流程

事件：stock.regime.snapshot.changed.v1；FAIL不发布伪正常快照，未启用不发空事件。

1. 验证范围/覆盖与PIT，计算趋势/宽度/波动/流动性等已定义特征。
2. 按固定阈值和多窗口迟滞确定RISK_ON/NEUTRAL/RISK_OFF/STRESS。
3. 记录转换原因并原子发布，旧快照过期显式展示。

## 6. 故障、权限与恢复

数据不足标UNKNOWN/质量FAIL而非强行映射交易状态；策略若声明必需则阻塞该策略，不影响不依赖它的QUANT_ONLY。

所有三版交易通道仅FakeBroker，服务身份只能获得需要的最小访问范围。历史业务时间通过run-scoped Clock，基础设施超时用单调时钟；重试必须区分幂等查询与不确定副作用。恢复需保留原业务ID/幂等键/版本和失败证据。

## 7. 部署与可观测性

Python / FastAPI + 状态计算Worker组件按已启用能力部署；API和长计算/消费者可分进程，未启用的后续服务不需常驻。遵循Mac Linux ARM64小样本及真实Ubuntu目标架构验证，独立健康/版本/迁移/回滚说明。

提供/live、/ready或等价探针，记录服务依赖、版本和队列/任务年龄；日志贯通correlationId/testRunId及适用业务ID。指标包含任务成功/拒绝/失败/耗时、重试与恢复进度，不能只靠HTTP200报业务健康。

## 8. Web与验证

启用后显示覆盖/状态/特征贡献/转换时间线/历史比较；当前只显示未启用，不假造正常状态。

测试映射：T18及启用后的T12；覆盖不足、迟滞边界、极端波动、恢复确认、回放无未来标签。

自动检查与人工验收分别记录；使用阶段文件第7节待办及第8节手册交付，必须包含正常/拒绝/恢复、实际命令/URL与证据。共同测试见[总体测试](../../docs/prd/90-test-plan.md)及[三版规则](../../docs/prd/05-three-version-delivery.md)。

## 9. S0冻结与变更检查

- [ ] 本服务实体/端口/所有权与上下游一致，API/事件Schema和错误码已生成。
- [ ] 逻辑表落为实际迁移，唯一约束、并发锁、事务与修订/保留政策已明确。
- [ ] 场景参数/Clock/资源限制/健康探针和运行权限已配置，未知配置保持UNSET。
- [ ] Web、代码测试、故障恢复和人工手册引用同一规则/场景版本。
- [ ] 变更同步PRD/契约/阶段计划/追踪/测试与验收，实测后更新架构证据，不提前勾选。

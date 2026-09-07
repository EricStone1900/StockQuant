# 市场数据服务

服务：`market-data-service`。日期：2026-09-07。状态：设计草案；实现/运行/验收均NOT_RUN。技术基线：Python / FastAPI + 导入与采集Worker。

共同约束见[整体架构](../01-system-architecture.md)、[契约与数据](../02-contracts-and-data.md)、[部署](../03-deployment-and-operations.md)。本文是服务S0设计输入；逻辑表与扩展端口需在对应阶段冻结Schema/迁移，不表示已有实现。

## 1. 范围与交付

V1.2日线与Fixture；V2.1免费来源；V2.2分钟导入；V2.5扩容。

唯一拥有：Security及历史标识、Calendar、MarketRuleSet来源证据、DataVersion、质量报告、行情/FX/公司行动/财务PIT修订与数据Artifact元数据。

边界：不持有账户账本，不发布交易建议，不执行撮合；未知数据不解释为确认停牌。

## 2. 内部分层

domain：证券、日历、Bar/PIT、质量与发布规则；application：导入预览、验证、发布、按版本查询；ports：Provider/Repository/Artifact/Clock；adapters：文件、免费来源、PostgreSQL、对象存储；bootstrap：API与Worker。

目标目录：`services/market-data-service/`，包含src、独立依赖锁、migrations、Dockerfile、README和分层tests。domain不依赖框架/SDK；application依赖ports，由bootstrap注入adapters。配置验证失败需明确依赖项。

## 3. 数据与一致性

逻辑持久化：securities/security_aliases、calendars/sessions、data_versions/artifact_refs、import_runs、quality_reports、corporate_action_revisions、rule_versions。分钟行情按市场/频率/日期/证券分区Artifact，不默认逐Bar写关系表。

事务/幂等：历史标识按有效区间查询；导入幂等键绑定来源/载荷Hash/run；重复同内容返回原结果、冲突409；发布元数据与Outbox同事务。

每服务独立数据库/User。涉及业务账户与运行的数据按market/account/environmentMode/runId或namespace隔离；命令身份来自可信上下文。不得跨库join获得未授权事实或跨库写入；通过API或事件投影合作。需要事件发布的业务状态与Outbox原子提交，消费者副作用与Inbox同事务。

## 4. 入站接口与出站依赖

| 端口/基线路由 | 契约行为 |
|---|---|
| POST /internal/v1/data-imports | 输入来源/字段映射/范围/幂等键，202返回runId；预览/取消为待冻结扩展。 |
| GET /api/v1/data-versions/{id} | 返回不可变Manifest、质量/覆盖/用途；按securityId/asOf查询禁止回退latest。 |
| GET /internal/v1/quotes | 读取适用时点、来源和用途的报价，不把研究快照声明为LIVE报价。 |

读取供应商/用户文件；向量化、监控、组合发布只读版本引用；公司行动由组合入账、执行调整订单。

路由标“待冻结”表示架构意图；已有基线路由引用[市场契约](../../docs/prd/03-market-rules-and-contracts.md)。所有扩展在S0生成OpenAPI/AsyncAPI与TS/Python Client，写命令具备Idempotency-Key、expectedVersion、reason/sourceRef和统一错误。

## 5. 事件与主要流程

事件：发布stock.market-data.data-version.published.v1及stock.market-data.corporate-action.published.v1；原始大文件不放事件。

1. 接受导入并存原始Hash/来源/用途，预览映射和单位。
2. 校验交易时段、缺失、重复、RAW/复权、availableAt及历史证券；写分区临时产物。
3. 完整产物校验后原子发布元数据/Outbox；失败保留上一可用版本但标时效。
4. 消费者用固定DataVersion查询；旧数据/修订链仍可重现。

## 6. 故障、权限与恢复

断源独立限流/退避；中断从导入游标续跑，发布前清单完整性必须验证；缺分钟不前填。

所有三版交易通道仅FakeBroker，服务身份只能获得需要的最小访问范围。历史业务时间通过run-scoped Clock，基础设施超时用单调时钟；重试必须区分幂等查询与不确定副作用。恢复需保留原业务ID/幂等键/版本和失败证据。

## 7. 部署与可观测性

Python / FastAPI + 导入与采集Worker组件按已启用能力部署；API和长计算/消费者可分进程，未启用的后续服务不需常驻。遵循Mac Linux ARM64小样本及真实Ubuntu目标架构验证，独立健康/版本/迁移/回滚说明。

提供/live、/ready或等价探针，记录服务依赖、版本和队列/任务年龄；日志贯通correlationId/testRunId及适用业务ID。指标包含任务成功/拒绝/失败/耗时、重试与恢复进度，不能只靠HTTP200报业务健康。

## 8. Web与验证

导入预览/错误行、日线和分钟浏览、质量/覆盖、来源与版本差异；VT04坏行/中断，VT05真实源/限流。

测试映射：T04～09、T40～44、T47；验证原价/复权分离、PIT、导入幂等、日历/单位和半成品不发布。

自动检查与人工验收分别记录；使用阶段文件第7节待办及第8节手册交付，必须包含正常/拒绝/恢复、实际命令/URL与证据。共同测试见[总体测试](../../docs/prd/90-test-plan.md)及[三版规则](../../docs/prd/05-three-version-delivery.md)。

## 9. S0冻结与变更检查

- [ ] 本服务实体/端口/所有权与上下游一致，API/事件Schema和错误码已生成。
- [ ] 逻辑表落为实际迁移，唯一约束、并发锁、事务与修订/保留政策已明确。
- [ ] 场景参数/Clock/资源限制/健康探针和运行权限已配置，未知配置保持UNSET。
- [ ] Web、代码测试、故障恢复和人工手册引用同一规则/场景版本。
- [ ] 变更同步PRD/契约/阶段计划/追踪/测试与验收，实测后更新架构证据，不提前勾选。

# 新闻聚合与情报服务

服务：`news-intelligence-service`。日期：2026-09-07。状态：设计草案；实现/运行/验收均NOT_RUN。技术基线：Python / FastAPI + 来源采集Worker。

共同约束见[整体架构](../01-system-architecture.md)、[契约与数据](../02-contracts-and-data.md)、[部署](../03-deployment-and-operations.md)。本文是服务S0设计输入；逻辑表与扩展端口需在对应阶段冻结Schema/迁移，不表示已有实现。

## 1. 范围与交付

V2.1采集/去重/实体关联/修订/展示必交；模型事件分析与自动动作不属于本轮默认范围。

唯一拥有：新闻来源/许可、原文索引/允许保存的正文、URL/Hash、转载聚类、证券实体关联、事件修订；模型情报为后续按策略启用。

边界：不把新闻当系统指令，不持交易权限，不因标题正面就生成Alpha订单；无历史公开时间不能伪造PIT证据。

## 2. 内部分层

domain：来源记录、去重/关联/修订；application：采集、聚类、实体纠正、查询；ports：Source/SecurityLookup/Artifact/可选ModelGateway；adapters：允许的RSS/公告/文件、DB、HTTP。

目标目录：`services/news-intelligence-service/`，包含src、独立依赖锁、migrations、Dockerfile、README和分层tests。domain不依赖框架/SDK；application依赖ports，由bootstrap注入adapters。配置验证失败需明确依赖项。

## 3. 数据与一致性

逻辑持久化：sources/license_refs、news_items/revisions、content_refs、clusters/memberships、entity_links、ingestion_runs；正文是否存储由许可决定。

事务/幂等：source+sourceItemId/内容Hash去重，转载属于聚类而非删除原证据；更正有supersedes，实体人工纠正带版本/理由。

每服务独立数据库/User。涉及业务账户与运行的数据按market/account/environmentMode/runId或namespace隔离；命令身份来自可信上下文。不得跨库join获得未授权事实或跨库写入；通过API或事件投影合作。需要事件发布的业务状态与Outbox原子提交，消费者副作用与Inbox同事务。

## 4. 入站接口与出站依赖

| 端口/基线路由 | 契约行为 |
|---|---|
| 新闻列表/详情/来源/修订查询（S0待冻结路由） | 证券/时间/来源过滤，保留publishedAt/ingestedAt及原链接。 |
| 采集任务/实体纠正（S0待冻结路由） | 有范围、幂等键、用户身份；来源失败各自退避。 |
| 可选结构化事件分析 | 仅在后续明确启用时经模型网关，证据/Schema/预算必需。 |

market-data提供证券/曾用名映射；平台查询展示；可选agent模型端口；监控/治理只消费已定义策略需要的证据。

路由标“待冻结”表示架构意图；已有基线路由引用[市场契约](../../docs/prd/03-market-rules-and-contracts.md)。所有扩展在S0生成OpenAPI/AsyncAPI与TS/Python Client，写命令具备Idempotency-Key、expectedVersion、reason/sourceRef和统一错误。

## 5. 事件与主要流程

事件：新闻新证据/修订事件在S0冻结；本轮未实现模型分析不发布空成功情报事件。

1. 按已验证来源和范围限速采集，保存来源/公开/入库时间与许可。
2. 清洗去重并聚类转载，关联证券及置信度，保留冲突与更正。
3. Web展示引用/修订并允许受控纠正；历史回放按实际可见时点过滤。

## 6. 故障、权限与恢复

一个来源失败其他继续；发布时间未知明确缺失；低置信度不能直接触发交易，外部内容无工具授权。

所有三版交易通道仅FakeBroker，服务身份只能获得需要的最小访问范围。历史业务时间通过run-scoped Clock，基础设施超时用单调时钟；重试必须区分幂等查询与不确定副作用。恢复需保留原业务ID/幂等键/版本和失败证据。

## 7. 部署与可观测性

Python / FastAPI + 来源采集Worker组件按已启用能力部署；API和长计算/消费者可分进程，未启用的后续服务不需常驻。遵循Mac Linux ARM64小样本及真实Ubuntu目标架构验证，独立健康/版本/迁移/回滚说明。

提供/live、/ready或等价探针，记录服务依赖、版本和队列/任务年龄；日志贯通correlationId/testRunId及适用业务ID。指标包含任务成功/拒绝/失败/耗时、重试与恢复进度，不能只靠HTTP200报业务健康。

## 8. Web与验证

新闻列表、股票关联、原链接/时间、转载/更正、源健康和纠正；至少两个实际来源与Fixture分别标记。

测试映射：T15、VT05；转载去重、修订、同名误关联、来源失败、许可留存和Prompt注入隔离。

自动检查与人工验收分别记录；使用阶段文件第7节待办及第8节手册交付，必须包含正常/拒绝/恢复、实际命令/URL与证据。共同测试见[总体测试](../../docs/prd/90-test-plan.md)及[三版规则](../../docs/prd/05-three-version-delivery.md)。

## 9. S0冻结与变更检查

- [ ] 本服务实体/端口/所有权与上下游一致，API/事件Schema和错误码已生成。
- [ ] 逻辑表落为实际迁移，唯一约束、并发锁、事务与修订/保留政策已明确。
- [ ] 场景参数/Clock/资源限制/健康探针和运行权限已配置，未知配置保持UNSET。
- [ ] Web、代码测试、故障恢复和人工手册引用同一规则/场景版本。
- [ ] 变更同步PRD/契约/阶段计划/追踪/测试与验收，实测后更新架构证据，不提前勾选。

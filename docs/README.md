# StockQuant 文档入口

当前工作入口（2026-10-29）：先看[当前进度](./progress.md)。C5本地工程范围已签收PASS；C6本轮本地单源范围IN_PROGRESS，所有者已批准[备用分钟源及60日覆盖DEFERRED](./decisions/2026-10-29-c6-backup-minute-source-deferral.md)，停止继续选源/探测。V2.5正式页已接入现存已发布分钟导入/查询并绑定持久TestRun，真实隔离同Run Web/CLI smoke通过；详细见[接线审计](../evidence/audits/2026-10-29-v25-minute-import-run-integration.md)。下一步依[V2主计划§7.2.3](./prd/v2-data-and-replay/00-version-plan.md#723-c6单源范围接续2026-10-29)核清队列/额度/取消恢复的实际职责和未验证缺口，只补必要功能。全市场分钟、真实长期稳定性、PIT及V2.4实际观察仍未完成；本轮范围调整不代表V2整版通过。

先看[当前进度](./progress.md)与[V2.2阶段记录](./prd/v2-data-and-replay/02-minute-data-import.md)。V1批准的Mac本地主要范围已完成，V2.1 C1/C2、V2.2 C3批准范围及V2.3 C4 Fixture本地学习范围已按记录验收。上述C3来源补证和历史上下文说明为历史入口信息，不是当前任务路由；当前接续为C6/V2.5。V2.2完整历史事实/回放、V2.3真实市场/PIT研究仍分别保留未完成边界；V2整版未完成。

| 要回答的问题 | 权威入口 | 更新方式 |
|---|---|---|
| 如何开始使用V1、停止环境及查找恢复步骤？ | [仓库使用入口](../README.md) | 汇总现有命令与阶段手册；实际URL使用每次启动输出，停止前导出需保留的证据 |
| 本轮必须交付什么、哪些不做？ | [三版共同规则](./prd/05-three-version-delivery.md)、[产品要求](./prd/00-product-requirements.md) | 需求变化才修改；执行计划不能改写验收范围 |
| V1/V2/V3分别有哪些阶段？ | [PRD目录](./prd/README.md)及各版本00-version-plan | 保留阶段依赖与正式状态 |
| 当前做什么、下一步是什么？ | [进度摘要](./progress.md)、[V2完成与收口计划](./prd/v2-data-and-replay/00-version-plan.md#7-v2完成与收口执行计划2026-10-17) | 摘要只维护当前结论和剩余项；工作包细节回到原计划，执行流水见[修正前历史归档](../evidence/audits/2026-10-12-v1-execution-correction/README.md)，[较早归档](./progress-history-2026-10-10.md)保留 |
| 功能完成了吗、怎么验收？ | 各阶段第2/7/8节、各版本90-test-plan与99-acceptance | 实测再勾选；工程、手册、人工分别记录 |
| 哪项要求由谁实现、如何测试？ | [需求追踪](./prd/01-feature-traceability.md) | 需求变化同步更新责任域、测试与交付版本 |
| 服务边界、合同和技术决定是什么？ | [架构索引](../architecture/README.md)、[ADR索引](./decisions/README.md)、[未决事项](./decisions/open-decisions.md) | 设计更新回原文件；决定回原登记表 |
| 如何部署、切换或恢复？ | [V1服务发布顺序与回退准备](./operations/v1-service-release-order.md)、[V1数据库迁移与回退](./operations/v1-database-migrations.md)、[存储切换Runbook](./operations/v11-test-run-storage-cutover.md)、[运维目录](./operations/)、对应阶段第8节 | 运维不充当新需求或阶段签署 |
| 某次运行为什么PASS/FAIL？ | [证据目录](../evidence/)、[本轮只读门禁复核](../evidence/audits/2026-10-08-delivery-review/README.md) | 一次运行一份不可覆盖证据；正文只留结论与链接 |
| 旧计划还要执行吗？ | [计划索引与接替关系](./plans/README.md) | 旧文件保留历史，不从旧IN_PROGRESS自动启动任务 |

文档归位规则：需求进PRD、设计进architecture、决定进decisions、操作进operations或阶段手册、运行事实进evidence。`docs/evidence-*.md`保留为既有证据摘要，不作为新的排期入口。无需为每次小修复再建一份“总计划”。

2026-10-12按所有者要求将进度/计划流水归档至evidence，字节原件与SHA保留，当前入口只存当前结论与剩余队列。其他文档不批量搬迁/删除。现有相对链接、源码Hash、Manifest和历史签署会引用原路径；若以后确需迁移，逐文件核对引用并保留历史可读性。独立PRD文档包继续保留内部结构，不把运行进度塞回其设计模板。

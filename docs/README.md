# StockQuant 文档入口

先看[当前进度与下一步](./progress.md)，再读对应阶段。2026-10-14已批准的Mac本地V1主要功能闭环已完成，用户验收及正式门禁PASS；已有V2/V3成果保留，后续安排等待所有者指令，不从旧计划自动扩展。

| 要回答的问题 | 权威入口 | 更新方式 |
|---|---|---|
| 本轮必须交付什么、哪些不做？ | [三版共同规则](./prd/05-three-version-delivery.md)、[产品要求](./prd/00-product-requirements.md) | 需求变化才修改；执行计划不能改写验收范围 |
| V1/V2/V3分别有哪些阶段？ | [PRD目录](./prd/README.md)及各版本00-version-plan | 保留阶段依赖与正式状态 |
| 当前做什么、下一步是什么？ | [进度摘要](./progress.md)、[当前执行计划](./plans/2026-10-08-v1-completion-plan.md) | 摘要只维护当前结论和剩余项；工作包细节回到原计划，执行流水见[修正前历史归档](../evidence/audits/2026-10-12-v1-execution-correction/README.md)，[较早归档](./progress-history-2026-10-10.md)保留 |
| 功能完成了吗、怎么验收？ | 各阶段第2/7/8节、各版本90-test-plan与99-acceptance | 实测再勾选；工程、手册、人工分别记录 |
| 哪项要求由谁实现、如何测试？ | [需求追踪](./prd/01-feature-traceability.md) | 需求变化同步更新责任域、测试与交付版本 |
| 服务边界、合同和技术决定是什么？ | [架构索引](../architecture/README.md)、[ADR索引](./decisions/README.md)、[未决事项](./decisions/open-decisions.md) | 设计更新回原文件；决定回原登记表 |
| 如何部署、切换或恢复？ | [V1服务发布顺序与回退准备](./operations/v1-service-release-order.md)、[V1数据库迁移与回退](./operations/v1-database-migrations.md)、[存储切换Runbook](./operations/v11-test-run-storage-cutover.md)、[运维目录](./operations/)、对应阶段第8节 | 运维不充当新需求或阶段签署 |
| 某次运行为什么PASS/FAIL？ | [证据目录](../evidence/)、[本轮只读门禁复核](../evidence/audits/2026-10-08-delivery-review/README.md) | 一次运行一份不可覆盖证据；正文只留结论与链接 |
| 旧计划还要执行吗？ | [计划索引与接替关系](./plans/README.md) | 旧文件保留历史，不从旧IN_PROGRESS自动启动任务 |

文档归位规则：需求进PRD、设计进architecture、决定进decisions、操作进operations或阶段手册、运行事实进evidence。`docs/evidence-*.md`保留为既有证据摘要，不作为新的排期入口。无需为每次小修复再建一份“总计划”。

2026-10-12按所有者要求将进度/计划流水归档至evidence，字节原件与SHA保留，当前入口只存当前结论与剩余队列。其他文档不批量搬迁/删除。现有相对链接、源码Hash、Manifest和历史签署会引用原路径；若以后确需迁移，逐文件核对引用并保留历史可读性。独立PRD文档包继续保留内部结构，不把运行进度塞回其设计模板。

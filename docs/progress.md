# 当前V1进度与执行入口

更新：2026-10-14。**V1已批准的Mac本地主要功能范围：开发完成，人工验收PASS，正式门禁PASS/exit 0。** 当前候选源码/配置/Fixture SHA-256 `132535fbdf2bf1d50e4260e397424b3a47ef949dedcc62e58257c0a5697bd2d4`；用户已在本对话确认通过。完成范围以[既定计划](plans/2026-10-08-v1-completion-plan.md)、[范围决定](decisions/2026-10-13-v1-core-closeout-scope.md)和[Ubuntu延期决定](decisions/2026-10-13-v1-ubuntu-deferral.md)为准。

## 1. 已完成范围

| 阶段 | 已交付及实测范围 |
|---|---|
| V1.1 | Mac本地容器Web/验收中心、双市场模拟账户、身份/owner隔离、正常/拒绝/恢复、同Run CLI/export |
| V1.2 | 冻结双市场小数据、真实锁版Qlib 0.9.6训练/预测与112项预测、可追溯产物、Governance研究快照、取消和重启恢复 |
| V1.3 | CN/US MANUAL/AUTO模拟交易、授权预算/预留、部分成交/撤单、UNKNOWN原单恢复、严格现金结算与独立账本MATCH；受影响容器E2E 40/40 |
| V1.4 | 日线回测报告、固定费用/滑点/限制/结算、固定CN/US Quant/Paper账本对照、刷新/重启恢复；容器E2E 7/7 |
| V1.5 | 真实NATS/Temporal后台工作流、固定日历AUTO/日终对账、关页/Worker恢复、幂等重投；容器E2E 4/4及真实AUTO业务本地配对恢复 |

原始业务结果见[主要路径汇总](../evidence/audits/2026-10-13-v1-current-core-e2e-a01.md)，修复及最终收口见[执行记录](../evidence/audits/2026-10-14-v1-core-closeout-a01.md)。本次只完成文档、清单和证据关联收口，未修改业务代码或扩大功能。

## 2. 完成依据

五阶段第7节当前交付项、第8节实测手册、版本十项清单及当前签署均已核对。[最终版本门禁](../evidence/audits/2026-10-14-v1-core-closeout-gate-a03.log)为PASS；五阶段文档审计与证据审计通过，未关闭阶段/验收、无效PASS声明均为零。[14个完成态代表Run](../evidence/audits/2026-10-14-v1-closeout-selected-runs.json)的COMPLETED状态、全PASS断言和Manifest均通过严格核验，完整场景覆盖仍由原E2E报告证明。

用户2026-10-14的整版确认绑定上述精确候选；单Run导出的原人工结论不倒填。V1.5 NO_TRADE观察Run继续WAITING，取消Run继续CANCELLED；V1.3拒绝/恢复业务探针保持原状态。历史失败、六个MISSING及旧签署保留于原记录和[收口前快照](../evidence/audits/2026-10-14-v1-closeout-before-status-sync.json)，不伪造恢复、不删除。

## 3. 已延期及已知限制

Ubuntu实机、真实行情/新闻与活动策略启用、全市场日历/客户费税、穷举多seed/多故障、长期实时时钟/睡眠唤醒观察、宿主/异地灾备与生产RPO/RTO、自动Artifact清理、活动旧栈切换、增强告警/导航和容量优化均非本轮完成条件，保持DEFERRED或原未验收状态。

真实Qlib Artifact跨卷同点恢复未验收；本轮Artifact卷以合成探针验证恢复机制，实际AUTO订单/Fill/Portfolio/NATS/Temporal配对恢复通过。Qlib Worker使用锁定linux/amd64仿真环境，目标架构仿真不代表Ubuntu实机；小样本不证明收益或容量。

始终只用FakeBroker、拒绝LIVE/真实券商；研究输出不自行激活策略，OD-007精确版本批准继续适用。

## 4. 后续入口

本轮V1收尾队列已完成，不自动恢复旧暂停目标、V2/V3、活动采集或部署。后续只处理实际发现的V1缺陷；新功能、旧目标恢复与Ubuntu部署按所有者后续指令安排。启动、正式Web路由、输入、检查和停止步骤使用[阶段手册目录](prd/v1-local-simulation/README.md)，每次采用启动时输出的动态URL。

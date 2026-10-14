> 当前结论（2026-10-14）：V1已批准的Mac本地主要功能范围开发与正式验收完成，五阶段PASS、用户验收PASS、版本门禁PASS/exit 0。见[当前进度](../../progress.md)和[最终验收](./99-acceptance.md)。下方旧“当前复核/未完成”记录均按原日期作为历史保留；已延期事项不自动恢复。

> 当前V1收尾范围（2026-10-13）：所有者要求聚焦主要功能、减少非必要验证和停止扩散；当前执行以[V1主要功能完成计划](../../plans/2026-10-08-v1-completion-plan.md)及[范围决定](../../decisions/2026-10-13-v1-core-closeout-scope.md)为准。延期增强和广泛验证不阻塞本轮，旧任务/结果/签署保留为历史；核心正确性和人工验收不缩减。

> 当前范围决定（2026-10-13）：所有者已将Ubuntu实机部署/恢复/主机资源验收延期至后续Ubuntu部署验收，状态DEFERRED / NOT_RUN；它不再阻塞V1本轮开发及验收。Mac本地容器、目标架构烟测/缺口登记、其余业务/恢复和人工验收要求保留。旧记录中的Ubuntu缺口保留为历史事实，不代表当前V1阻塞。见[延期决定](../../decisions/2026-10-13-v1-ubuntu-deferral.md)。

当前复核：2026-10-12正式V1门禁current-a50为`INCOMPLETE`/exit 2；五阶段文档结构审计PASS、证据审计PASS（2538引用、436份Manifest、574项）；32个指定TestRun中24份结构化导出有效、8份历史导出缺失。V1.3 L16新增撤单请求前置拒绝无副作用与乱序Fill恢复（§8.113），当前完整Web/API/CLI E2E 40/40、完整code suite exit 0；P0 A135确认L17全V1写入面、发布回退、恢复、Ubuntu及人工验收未完成。各阶段仍有交付未关闭。[最新门禁](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a50.log)、[L16执行记录](../../../evidence/audits/2026-10-12-v13-l16-cancel-precondition-full-e2e-a01.log)、[L17语义复核](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a135.md)。

当前复核：2026-10-10正式门禁a472仍为`INCOMPLETE`/exit 2；五阶段文档审计PASS、证据审计PASS（1079引用、148份Manifest、287项）。V1.5组合故障恢复固定子项已通过（§8.31），V1整体关闭条件仍未满足。历史TestRun导出、各阶段剩余工程/交付、OD-013/014及旧Run处置、活动数据恢复、Ubuntu实机和当前范围人工验收未完成。V1.4 Replay namespace与bodyless命令边界增量已通过完整代码套件，但不代表阶段结项。[最新门禁](../../../evidence/audits/2026-10-10-v1-version-gate-a472.log)。

在 Mac M1 上使用小样本与真实 Qlib，完成双市场确定性模拟闭环及可长期保留的 Web 验收中心。A股为主要交互路径，美股用明确的 Fixture 验证完整基础链路。

本轮优先完成V1，非必要不扩展功能或V2/V3新能力。仅允许V1必需共享修复及受影响兼容回归；不从旧排期自动选择后续版本任务。

## 阅读与执行

先读[三版共同规则](../05-three-version-delivery.md)、[总体架构](../02-system-architecture.md)和[市场契约](../03-market-rules-and-contracts.md)，再读[本版计划](./00-version-plan.md)。这些文件夹是同一PRD包的组成部分，单独复制某一文件夹不能替代完整PRD。

- [V1.1 环境、账户初始化与 Web 验收中心](./01-environment-and-web-center.md)
- [V1.2 小样本数据、真实 Qlib 与环境探针](./02-small-data-and-qlib.md)
- [V1.3 治理、风控与模拟券商完整交易链路](./03-fake-broker-trading-loop.md)
- [V1.4 日线历史回测与可核对报告](./04-daily-backtest.md)
- [V1.5 无人逐笔操作、故障恢复与 V1 验收](./05-scheduling-and-recovery.md)

最后执行[测试计划](./90-test-plan.md)，填写[版本验收](./99-acceptance.md)。状态以最新证据和阶段文件为准；历史目标命令不表示所有能力都已实现。

# V1 小数据本地模拟闭环

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

# V1 小数据本地模拟闭环

日期：2026-09-19。状态：部分完成；V1.1 的实现范围已有人工作业证据，但仍有契约生成、Artifact 存储等未完成项；V1.2～V1.5 的验收结果见本版验收表。

在 Mac M1 上使用小样本与真实 Qlib，完成双市场确定性模拟闭环及可长期保留的 Web 验收中心。A股为主要交互路径，美股用明确的 Fixture 验证完整基础链路。

## 阅读与执行

先读[三版共同规则](../05-three-version-delivery.md)、[总体架构](../02-system-architecture.md)和[市场契约](../03-market-rules-and-contracts.md)，再读[本版计划](./00-version-plan.md)。这些文件夹是同一PRD包的组成部分，单独复制某一文件夹不能替代完整PRD。

- [V1.1 环境、账户初始化与 Web 验收中心](./01-environment-and-web-center.md)
- [V1.2 小样本数据、真实 Qlib 与环境探针](./02-small-data-and-qlib.md)
- [V1.3 治理、风控与模拟券商完整交易链路](./03-fake-broker-trading-loop.md)
- [V1.4 日线历史回测与可核对报告](./04-daily-backtest.md)
- [V1.5 无人逐笔操作、故障恢复与 V1 验收](./05-scheduling-and-recovery.md)

最后执行[测试计划](./90-test-plan.md)，填写[版本验收](./99-acceptance.md)。状态以最新证据和阶段文件为准；历史目标命令不表示所有能力都已实现。

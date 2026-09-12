# V2 免费数据、分钟回放与连续模拟

日期：2026-09-07。状态：计划，全部业务验收 NOT_RUN。

接入经验证的免费来源及用户提供的历史数据，形成日频策略、分钟成交仿真和真实时钟模拟；在线监控池≤100只。

## 阅读与执行

先读[三版共同规则](../05-three-version-delivery.md)、[总体架构](../02-system-architecture.md)和[市场契约](../03-market-rules-and-contracts.md)，再读[本版计划](./00-version-plan.md)。这些文件夹是同一PRD包的组成部分，单独复制某一文件夹不能替代完整PRD。

- [V2.1 免费行情、新闻聚合与在线股票池](./01-free-data-and-news.md)
- [V2.2 历史分钟数据导入与校验](./02-minute-data-import.md)
- [V2.3 日频决策、分钟撮合与历史事件回放](./03-historical-minute-replay.md)
- [V2.4 真实时钟下持续模拟交易](./04-continuous-paper-trading.md)
- [V2.5 历史数据扩容与 V2 验收](./05-data-scale-and-v2-acceptance.md)

最后执行[测试计划](./90-test-plan.md)，填写[版本验收](./99-acceptance.md)。所有代码路径、Web路由和命令都是待开发目标，不表示已存在。

2026-09-12新增规划：[共享数据采集开发计划](./06-shared-data-collection-plan.md)、[对应测试与恢复手册](./07-data-collection-tests.md)、[进度与接续记录](./08-data-collection-progress.md)。支持多项目、交易时段定时采集、主备来源与60交易日积累；当前为计划，未改变上述阶段验收结果。

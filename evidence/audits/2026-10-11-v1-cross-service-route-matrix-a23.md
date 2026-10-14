# V1 跨服务调用矩阵更正 A23

日期：2026-10-11。类型：静态调用点与文档一致性核对，不是新的运行验收。

## 更正

`evidence/audits/2026-10-10-v1-cross-service-route-matrix-a06.md` 的 operation 清单曾把 `startHistoricalMultiBarReplay`、`readHistoricalReplayRun` 和 `controlHistoricalReplayRun` 错列为 V1.4 Platform 生产入口，并称 `startHistoricalReplay` 与 UNKNOWN 恢复调用点仍待核清。此行现按已完成的范围审计 A22 修正：三项多 bar 操作的生产调用属于 `V23AcceptanceController`，仅属 V2.3；两个单 bar/UNKNOWN helper 在当前非测试生产源码中只有声明，没有调用点。

V1.4 Platform 页面使用 `V14AcceptanceController` 与 `V14QuantBacktestAdapter` 调用 `GeneratedQuantV14BacktestClient.runV14DailyFixtureBacktest`。V1.4 Replay Worker 服务级验证仍是单独证据，不能推导为 V1.4 Platform 页面已接入 Replay Worker。

## 当前源码核对

- `services/platform-api-service/src/bootstrap/app.module.ts:994` 起的 `V14AcceptanceController` 注入日线回测适配器；控制器日线回测路径调用 `runV14DailyFixtureBacktest`。
- 同文件 `V23AcceptanceController` 从约第 1503 行开始；第 1562 行启动 `startHistoricalMultiBarReplay`，第 1591–1592 行读取/控制 Replay Run。
- `services/platform-api-service/src/contracts/generated-historical-replay-client.ts` 定义 `startHistoricalReplay` 和 `recoverHistoricalReplayUnknownOrder`，但在排除测试文件后的平台生产源码搜索中没有调用方。
- A22 已记录相同范围结论：[`2026-10-10-v1-replay-client-stage-scope-a22.md`](./2026-10-10-v1-replay-client-stage-scope-a22.md)。

核对依据为当前工作树源码及调用点搜索：`rg -n "startHistoricalMultiBarReplay|readHistoricalReplayRun|controlHistoricalReplayRun|runV14DailyFixtureBacktest|startHistoricalReplay|recoverHistoricalReplayUnknownOrder" services/platform-api-service/src`。静态搜索可证明当前仓库的调用关系，不能证明运行时部署、用户验收或完整发布兼容。

## 状态与边界

A23 修复 A06 内部过期条目与 A22、Crosswalk 范围结论之间的文档冲突。它不新增业务功能，不产生运行测试结果，不关闭 V1.1-S2-L14，也不关闭 P0/P1、V1.4 页面接线、发布/迁移兼容或 V1 门禁。后续完整调用方/身份/合同/副作用/发布矩阵仍按计划执行。

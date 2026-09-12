# DC-03 交易时段调度切片证据

验证日期：2026-09-12（Asia/Shanghai）。本证据覆盖隔离 Fixture 计划器，不代表正式无人值守调度或真实来源已启用。

## 实现

- `services/market-data-service/src/application/collection-scheduler.ts`：注入 `Clock` 和版本化 `Calendar`，按 Asia/Shanghai 会话生成闭合 5 分钟窗口。
- `services/market-data-service/src/application/collection-schedule-repository.ts`：持久化订阅计划、启停状态、版本和水位；使用单行租约表保证单活调度器。
- `services/market-data-service/src/application/persistent-collection-scheduler.ts`：读取启用计划，抢占调度租约，按水位创建持久 CollectionRun，成功后推进水位；重复 Tick 依赖幂等键不重复创建。
- 窗口必须满足结束时间加发布延迟（默认120秒）不晚于当前 Clock；午休、闭市不生成任务。
- `UNKNOWN` 日历日期返回 `waitingDates`，不按周一至周五猜测交易日。
- 使用 `subscriptionId + revision + windowStart + windowEnd + jobKind` 生成幂等键；传入已存在键时跳过，历史窗口标记 `backfill`。
- `enable/disable/status` 支持暂停与恢复；服务提供只读计划接口 `/v2/collection-scheduler/plan?subscriptionId=...&from=...&to=...`，以及状态/启停接口。持久计划 API 为 `/v2/collection-schedules` 及 `/{subscriptionId}/enable|disable`；后台 Worker 只有 `STOCKQUANT_SCHEDULER_WORKER=1` 时才启动。

## 自动验证

```bash
pnpm --filter @stockquant/market-data-service lint
pnpm --filter @stockquant/market-data-service exec vitest run tests/unit
```

结果：TypeScript 检查通过；3 个单元测试文件、8 个测试通过；真实 PostgreSQL 调度集成测试 7/7 通过；HTTP 烟测验证 `/ready`、计划创建、启用和查询。覆盖开盘前/闭合窗口、发布延迟、午休和闭市、未知日历、重复触发去重、漏窗标记、暂停/恢复、持久水位和单活租约。

## 范围与剩余门槛

DC-03 当前状态为 `IN_PROGRESS`：确定性计划算法、持久调度配置、单活租约、可恢复 Worker 和 HTTP 配置链路已完成并验证。仍需在 DC-07 进行正式容器部署、目标环境实际交易日运行、Web/验收中心接入和真实来源采集；本证据不能代替 DC-T25 或 DC-08A。

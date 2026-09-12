# DC-03 交易时段调度切片证据

验证日期：2026-09-12（Asia/Shanghai）。本证据覆盖隔离 Fixture 计划器，不代表正式无人值守调度或真实来源已启用。

## 实现

- `services/market-data-service/src/application/collection-scheduler.ts`：注入 `Clock` 和版本化 `Calendar`，按 Asia/Shanghai 会话生成闭合 5 分钟窗口。
- 窗口必须满足结束时间加发布延迟（默认120秒）不晚于当前 Clock；午休、闭市不生成任务。
- `UNKNOWN` 日历日期返回 `waitingDates`，不按周一至周五猜测交易日。
- 使用 `subscriptionId + revision + windowStart + windowEnd + jobKind` 生成幂等键；传入已存在键时跳过，历史窗口标记 `backfill`。
- `enable/disable/status` 支持暂停与恢复；服务提供只读计划接口 `/v2/collection-scheduler/plan?subscriptionId=...&from=...&to=...`，以及状态/启停接口。当前接口是计划预览，后台 Worker 的正式部署开关仍保持显式配置。

## 自动验证

```bash
pnpm --filter @stockquant/market-data-service lint
pnpm --filter @stockquant/market-data-service exec vitest run tests/unit
```

结果：TypeScript 检查通过；3 个单元测试文件、7 个测试通过。覆盖开盘前/闭合窗口、发布延迟、午休和闭市、未知日历、重复触发去重、漏窗标记、暂停/恢复和稳定的下次执行时间。

## 范围与剩余门槛

DC-03 当前状态为 `IN_PROGRESS`：确定性计划算法和隔离 API 已完成。真实持久调度配置、独立后台 Worker、跨重启水位恢复、真实交易日运行及 Web/验收中心仍待 DC-03 后续切片和 DC-07 部署演练，不能将本证据当作 DC-T17 或 DC-08A 通过。

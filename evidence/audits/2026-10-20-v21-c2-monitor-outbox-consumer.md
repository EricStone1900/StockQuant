# V2.1 C2 Monitor Outbox 消费者交接审计

日期：2026-10-20（Asia/Shanghai）  
结论：Monitor 自动交接工程子项 PASS；C2-B、C2-C、C2 仍为 IN_PROGRESS。

## 实现

- Market Data schema v17 建立持久 Monitor consumer outbox。采样执行状态 `COMPLETED` 与 Outbox 事件在一个 PostgreSQL 事务中提交；如果事务失败，Worker 可重试已完成快照并再次完成交接，不丢失任务。
- Outbox 以 `taskId + monitorEvaluation` 幂等，消费者使用租约、SKIP LOCKED、过期接管和持久重试；Monitor API 幂等处理交付重试。只为带完整 owner/account/namespace/TestRun 和非空证券清单的任务发事件。
- `monitorEvaluation` executor 标记 `CONFIGURED`，但策略初始 `enabled=false`。验收页可显式开关此策略；关闭时 Outbox 保留待投递事件，开启后消费。日线、策略和订单政策仍关闭且 executor 未实现。
- Market Data 使用独立 `market-data-service` 身份与 Bearer 调用 Monitor。Monitor 同时验证 `platform-api-service`、`market-data-service` 对应的不同 token。传给 Monitor 的投影仅含scope、任务/证券引用和来源/时间/质量字段（含 `observedAt`、`ingestedAt`、`availableAt`），不含价格；Monitor 的质量引用持久化保留这些时间字段。
- Compose、`.env.example` 和 Web/Platform 路由同步。监控质量计算不发模型请求或订单；OD-008 行情授权与REAL运行开关保持原状。

## 验证

| 检查 | 结果 |
|---|---|
| `pnpm --filter @stockquant/market-data-service sampling:http-restart-smoke` | PASS；隔离 PostgreSQL 完成迁移/HTTP重启；关闭策略时无调用，显式启用后仅投递一次；校验taskId、完整scope、观察质量、独立service-id/Bearer；随后关闭策略。临时容器和网络已清理，真实来源请求0 |
| Market Data 单测 | PASS，25文件/124项 |
| Market Data、Platform API、Web `typecheck` | PASS |
| V2.1 C2 Playwright `v21-c2-observation.spec.ts` | PASS，1/1；覆盖Monitor策略显式开关 |
| `docker compose ... config -q` | 使用独立占位Token配置 PASS；直接 Compose 若使用当前忽略文件 `.env.local` 需补齐 Market Data 独立 token；正式 V2.1 隔离栈入口会自动生成独立 token |
| `uv run --directory services/market-monitor-service --frozen pytest tests/unit`（`UV_CACHE_DIR=/tmp/stockquant-uv-cache`） | PASS，9项 |
| `pnpm contracts:generate && pnpm contracts:check` | PASS，353 JSON（230 schemas、73 fixtures）及 OpenAPI/兼容检查；0 failures |

消费者交接烟测通过隔离 HTTP Monitor 接收器验证实际请求与身份头；独立 Monitor API/持久化本身由[2026-10-19 Monitor 持久化审计](./2026-10-19-v21-c2-monitor-persistence.md)验证。全量 Playwright 曾因误传参数启动：C2 用例通过，另有两项既有测试因缺少 DC-06 项目 Token、V2.4 用户/API 环境变量失败，另一个 V1.3 用例在中断全量运行时未完成；随后按单文件正确命令重跑，C2 为 1/1 通过。本轮未把全量 E2E 记为通过。尚未通过真实 Compose 中 Market Data→Monitor 独立数据库的端到端恢复场景；该跨容器正常/拒绝/恢复及同Run CLI仍归C2-E验收，不在本审计中宣称完成。

## 代码快照

仓库基线：`45bce40bf1ae44785f70a6ffeedcaaed1acba61a`；共享工作树含其他既有未提交改动。

本次关键文件 SHA-256：

- `services/market-data-service/src/adapters/postgres-sampling-task-lifecycle-repository.ts`: `93f738bebe3cd74e2e7d44be0068defc17748e3bbdbd352b23415f8d11a0de67`
- `services/market-data-service/src/application/monitor-outbox-worker.ts`: `343aad6aaa03db955149769b3178257ef0d9236c9746a9eff909e579bfc1f595`
- `services/market-data-service/src/adapters/postgres-schema-migrations.ts`: `f7533db5e174a589184265ac81bc56f258f2a8498d33e32dda9dca397b3cc8ad`
- `services/market-monitor-service/src/stockquant_market_monitor/api.py`: `231b323725446af7ac9dd08db1f04b5d58b1e44c6adccaa8cde20dda422d56e0`
- `services/platform-api-service/src/bootstrap/app.module.ts`: `c82ba8ccf6b4073c3f927b1be856c29ed6679d801e4aa1fb67c00eaa515ab8a7`
- `services/market-data-service/src/bootstrap/main.ts`: `b7c0b88edb93cde7c93541d7771119930ed35050e7776d9e61c336be048961d2`
- `services/market-data-service/src/adapters/postgres-sampling-policy-repository.ts`: `cd8533a8d241b24c852f3a6f5b32957ed20c528e1a4dc3f3f768aa113e2bb579`
- `packages/contracts/openapi/market-data-calendar.v1.json`: `c4b51abcfe548a06bcd2c66bf0c9e4422fb3cd0eacf85a9f4cac1390c60f260a`
- `scripts/generate-v21-market-data-client.mjs`: `893a8e60ef7421d5cec91c7c1b92519b23eb3f6934441cc58b09c0f5f8440eff`
- `apps/web/src/main.tsx`: `d055efb88c5e09ebffb26944f4d94a04acc27ecdce004f5fe031216e3b9d80f9`

## 剩余

本地工程交接已打通。独立 DAILY_BAR 的收盘后自动触发、策略/订单执行器、真实来源能力/许可及OD-008、真实Compose跨容器同Run验收、可执行手册和用户人工验收未完成。此审计不改变V2.1或C2整体状态。

# P3.2 V1.2 持久 TestRun 与 owner 范围

日期：2026-09-24（Asia/Shanghai）。

## 改动

- 新增 `V12AcceptanceService`，V1.2 创建时写入 `acceptance_stage_runs`，异步执行后更新状态、断言、证据和完成时间。
- V1.2 `GET /runs/:testRunId` 改为从 PostgreSQL 查询，并要求本地 session/测试身份和 owner 匹配；未授权运行返回资源不存在。
- V1.2 场景目录也要求身份校验；只保留 `PAPER/FAKE`、Fixture 数据和 Qlib/Fake 依赖事实。
- 新增 `services/platform-api-service/scripts/test-persistence.mjs` 及 `pnpm test:integration:platform`，默认使用隔离 `platform_api_test`，拒绝连接正式 `platform_api`。

## 验证

- `pnpm --filter @stockquant/platform-api-service test`：8个测试文件、30/30通过。
- `pnpm --filter @stockquant/platform-api-service typecheck`：退出0。
- `pnpm test:integration:platform`：退出0；独立数据库迁移、写入 RUNNING、更新 COMPLETED、关闭连接后重连读取、断言读取和 owner 隔离均通过；测试行已按 testRunId 删除。
- 正式库保护负例：使用 `postgresql://platform_api@.../platform_api` 时退出2，未执行写入。
- `pnpm build` 和 `pnpm typecheck`：全仓9个工作区通过，退出0；`pnpm docs:check` 468/468，`pnpm contracts:check` 退出0，`pnpm test:ops` 82/82。

## 边界

V1.3～V1.5仍使用内存运行记录，V2.1/V2.2及更早历史迁移、账户详情页和全局身份服务尚未完成。当前仅能把 V1.2 持久化切片标为 PARTIAL，不能改变 V1.1/V1/V2 的人工验收结论。

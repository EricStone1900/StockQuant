# P3.3 V1.3～V1.5 持久 TestRun

日期：2026-09-24（Asia/Shanghai）。

## 改动

- 新增共享 `PersistentStageRunService`，将 V1.3、V1.4、V1.5 引擎输出保存到 `acceptance_stage_runs`。
- 三个控制器的场景目录、创建和查询均通过本地 session/测试身份，并将 owner 传入持久仓库。
- 删除 V1.3～V1.5 控制器内存 `Map`，重启后可按原 `testRunId` 查询状态、断言和证据。
- `test-persistence.mjs` 扩展覆盖 V1.2、V1.3、V1.4、V1.5，并继续拒绝正式 `platform_api` 数据库。

## 验证

- `pnpm --filter @stockquant/platform-api-service test`：9个测试文件、32/32通过。
- `pnpm --filter @stockquant/platform-api-service typecheck`：退出0。
- `pnpm test:integration:platform`：退出0；V1.2/V1.3/V1.4/V1.5 均在隔离库完成迁移、写入、关闭连接后重连读取，状态均为 `COMPLETED`，断言数量为1，owner 隔离均为 true；测试行已按 testRunId 删除。
- `pnpm build`、`pnpm typecheck`、`pnpm docs:check`、`pnpm contracts:check`、`pnpm test:ops`：分别退出0、0、0、0、0（运维82/82）。

## 边界

V2.1/V2.2 仍有内存运行记录；正式平台容器未重启，以免影响正在进行的 Paper 观察。账户详情页、统一身份服务和历史运行迁移仍属于后续 P3 工作，不改变版本人工验收结论。

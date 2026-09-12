# DC-02 持久化最小切片证据

验证日期：2026-09-12（Asia/Shanghai）；完成 DC-02 持久化最小切片及三项故障/发布闭环验证。调度、主备和实际交易日采集仍不在本证据范围。

## 实现

- `services/market-data-service/src/application/collection-run-repository.ts`：PostgreSQL 任务表、幂等创建、租约抢占、检查点、fencing token、Artifact 元数据和发布状态。
- `market_data_collection_runs`：独立数据库表；状态、版本、检查点、租约、fencing token、发布 Artifact 引用均持久化。
- `market_data_collection_artifacts`：保存 Artifact ID、SHA-256、行数并与任务发布事务绑定。
- `market_data_collection_outbox`：完成事件与任务发布同事务写入；消息未送达时保持 pending，可重试并幂等标记 sent。
- `POST /v2/collection-runs`：创建任务；重复 `idempotencyKey + requestHash` 返回原任务，冲突请求抛出409。
- `GET /v2/collection-runs/{runId}`：只读查询；没有数据库连接时服务明确返回 `PERSISTENCE_UNAVAILABLE`。
- `/ready` 增加 `collectionPersistence=POSTGRES|DISABLED`，便于部署检查。

## 自动测试

```bash
pnpm --filter @stockquant/market-data-service lint
pnpm --filter @stockquant/market-data-service test
MARKET_DATA_DATABASE_URL='postgresql://market_data@127.0.0.1:5433/market_data' \
  pnpm --filter @stockquant/market-data-service exec vitest run tests/integration
```

结果：TypeScript 检查通过；单元测试 2 个文件、4 个测试通过；真实 PostgreSQL 集成测试 6 个通过。集成测试验证迁移、创建、重复幂等、租约 fencing、检查点、旧 token 拒绝、过期租约接管、数据库不可用时不确认任务、Outbox 消息故障重试、真实子进程 SIGKILL 后接管，以及 Fixture 校验→SHA-256 Artifact 元数据→Outbox 原子发布。

## HTTP 烟测

服务使用 `STOCKQUANT_DATABASE_URL=postgresql://market_data@127.0.0.1:5433/market_data`、端口3312启动。

- `GET /ready` 返回 `collectionPersistence: POSTGRES`。
- 第一次 POST `/v2/collection-runs` 返回 `201`、`created=true` 和 runId `2f9530e2-4115-45cf-ae21-ab372bcf4bc44`。
- 同请求第二次返回 `200`、`created=false`，runId 完全相同。

## 结论

DC-02 状态为 `DONE`（自动验证 PASS）。本次真实进程终止测试使用受控 Node 子进程和 PostgreSQL 租约，SIGKILL 后旧 fencing token 被拒绝、新 worker 获得 token=2；消息故障测试确认完成事件在未标记 sent 时持续 pending，恢复后可重试；Fixture 发布测试读取 `fixtures/v2/v2.2/minute_bars.csv`，校验表头和行数，计算 SHA-256，并在同一事务写入 Artifact、完成任务和 Outbox。后续仍需 DC-03 调度、DC-04 主备、DC-07 部署及 DC-08 实际交易日观察。

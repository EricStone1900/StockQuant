# DC-02 持久化最小切片证据

验证日期：2026-09-12（Asia/Shanghai）；本次只验证任务状态持久化和 HTTP 最小入口，不宣称完整采集 Worker、调度或故障演练已完成。

## 实现

- `services/market-data-service/src/application/collection-run-repository.ts`：PostgreSQL 任务表、幂等创建、租约抢占、检查点、fencing token 和发布状态。
- `market_data_collection_runs`：独立数据库表；状态、版本、检查点、租约、fencing token、发布 Artifact 引用均持久化。
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

结果：TypeScript 检查通过；单元测试 2 个文件、4 个测试通过；真实 PostgreSQL 集成测试 3 个通过。集成测试验证迁移、创建、重复幂等、租约 fencing、检查点、旧 token 拒绝、过期租约接管、数据库不可用时不确认任务及发布。

## HTTP 烟测

服务使用 `STOCKQUANT_DATABASE_URL=postgresql://market_data@127.0.0.1:5433/market_data`、端口3312启动。

- `GET /ready` 返回 `collectionPersistence: POSTGRES`。
- 第一次 POST `/v2/collection-runs` 返回 `201`、`created=true` 和 runId `2f9530e2-4115-45cf-ae21-ab372bcf4bc44`。
- 同请求第二次返回 `200`、`created=false`，runId 完全相同。

## 未完成门槛

DC-T12 的真实 Worker 进程崩溃、消息系统故障、完整 Fixture 采集发布链尚未执行；已用真实数据库模拟过期租约接管和数据库不可用边界。DC-02 状态为 `IN_PROGRESS`。下一步是补受控 Worker/检查点故障测试及 Fixture 发布链，再进入 DC-03 交易时段调度。

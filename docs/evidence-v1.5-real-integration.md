# V1.5-H 真实 NATS/Temporal 业务集成证据

验证日期：2026-09-09

- NATS JetStream：PASS，真实 `nats:2.10-alpine`，file stream `SQV15INT`
- NATS 消息去重：PASS，重复 `Nats-Msg-Id=evt-v15-001` 后 Stream 消息数仍为 `1`
- Temporal SDK：PASS，`temporalio==1.18.0` Python SDK 客户端成功连接真实 Temporal Server `1.31.2`
- Temporal Worker：PASS，真实 Worker 执行 `V15Workflow`
- Activity：PASS，`normalize_event` 返回 `evt-v15-001`
- 端到端链路：PASS，JetStream 事件被消费后启动 Workflow 并完成 Activity
- Worker 重启后继续执行：PASS，Activity 执行期间停止 Worker，再启动新 Worker 后 Workflow 完成
- Activity 临时失败自动重试：PASS，首次注入失败，第二次尝试成功（`activityAttempts: 2`）
- StockQuant platform-api 正式进程 NATS 接入：PASS，`GET /api/v1/integration/nats/probe` 使用 `STOCKQUANT_NATS_URL=nats://nats:4222` 连接 Compose 内真实 JetStream；重复事件返回 `streamMessages: 1`、`duplicateEventIdempotency: true`
- Temporal 业务服务正式进程接入：PASS，platform-api-service 使用 `@temporalio/client`/`@temporalio/worker` 连接 Compose 内真实 Temporal Server；`GET /api/v1/integration/temporal/probe` 返回 Workflow 完成、Activity 结果回读，固定注入首次失败后 `activityAttempts: 2`、`activityRetry: true`
- V1 全量代码回归：PASS（baseline、build、typecheck、unit tests）
- V1 Web E2E：PASS，5 tests
- V1.5-H 后 V1 回归：PASS，代码套件与 5 个 Web E2E 全部通过

临时 NATS/Temporal 容器已清理，未删除 StockQuant 数据库和业务卷。

## 2026-09-23 当前 Compose 持久化补充复核

历史记录保留原状：2026-09-09 的 V1.5-H 工作流/Activity E2E 和当时的临时重启证据仍代表当日测试结果；它不等于当前 Compose 容器已把 NATS/Temporal 状态持久化。

阶段一只读审计发现当前 `nats:2.10-alpine` 容器未挂卷，JetStream 使用容器层 `/tmp/nats/jetstream`；当前 `temporalio/temporal:latest` 实际为 1.8.3 / Server 1.31.2，但启动参数未设持久文件，日志显示 `Temporal Persistence: in-memory`。切换前 NATS `streams=0/messages=0`、Temporal `default` Namespace Workflow 为 `[]`，因此这次不用迁移已有业务消息或 Workflow；发现非空状态时应停止并先完成导出/备份，不适用本次空状态切换步骤。

2026-09-23 将 Compose 镜像锁定为 NATS 2.10.29 Alpine 3.22 多架构 digest `sha256:b83efabe3e7def1e0a4a31ec6e078999bb17c80363f881df35edc70fcb6bb927` 和 Temporal 1.8.3 多架构 digest `sha256:cea463d98a8d6def4420f903ea5c3fcd0d85c8d10fbcc2770a50c12fff2eb26d`。NATS `store_dir=/data/jetstream/jetstream` 已挂至 `stockquant-v12_nats-jetstream-v1`；Temporal SQLite `/home/temporal/temporal.db` 已挂至 `stockquant-v12_temporal-dev-state-v1`。

恢复实测：NATS 测试专属流 `SQPH5PERSIST` 的 seq=1 消息在 `--force-recreate` 后按原 payload 读回，随后只删除该匹配固定 smoke payload 的流，最终 `/jsz` 为 streams/messages/bytes 全0。Temporal 探针创建并完成 workflow `v15-api-51030b26-4cd9-40fe-a06b-fb687c6f405b`（run `01a0ce18-3794-76e7-b470-87ae6868c9b5`），强制重建后原 ID 仍可查询，状态 COMPLETED、historyLength 11、结果一致。NATS 和 Temporal 各自重建后 platform-api `/ready` 都是 HTTP 200。过程及可重复命令见[本地持久化恢复 Runbook](operations/nats-temporal-persistence-recovery.md)。

此结果证明当前 macOS Docker Compose 单节点的容器重建/命名卷恢复，不证明宿主或磁盘灾难恢复、异地备份、生产 HA 或 ADR-0006 的 RPO/RTO。

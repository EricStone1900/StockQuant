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
- 业务服务正式进程接入：NOT_RUN（本次使用独立真实 SDK 集成验证器）
- V1 全量代码回归：PASS（baseline、build、typecheck、unit tests）
- V1 Web E2E：PASS，5 tests
- V1.5-H 后 V1 回归：PASS，代码套件与 5 个 Web E2E 全部通过

临时 NATS/Temporal 容器已清理，未删除 StockQuant 数据库和业务卷。

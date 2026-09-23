# 阶段五：NATS / Temporal 持久化恢复复核

日期：2026-09-23（Asia/Shanghai）  
范围：检查 Compose 与实际运行容器；只在确认状态为空后，将本地 NATS JetStream / Temporal dev 服务切到版本化持久卷。未检查或修改其他项目卷。

## 切换前快照

- NATS 实际镜像版本 `nats-server v2.10.29`，运行命令 `-js -m 8222`；无 Docker volume mount。JetStream 使用容器可写层 `/tmp/nats/jetstream`，`/jsz` 报告 `streams=0`、`consumers=0`、`messages=0`、`bytes=0`；目录无文件，大小 4 KiB。没有需要迁入新卷的消息或流。
- Temporal 原标签 `temporalio/temporal:latest` 解析为 CLI `1.8.3`、Server `1.31.2`、UI `2.50.1`，镜像摘要为 `sha256:cea463d98a8d6def4420f903ea5c3fcd0d85c8d10fbcc2770a50c12fff2eb26d`；实际日志报告 `Temporal Persistence: in-memory`，无 volume mount。`default` Namespace workflow list 为 `[]`。没有可复制的持久 Temporal DB 或在途 Workflow。
- 切换前 `platform-api-service /ready` 为 HTTP 200，Temporal cluster health 为 `SERVING`。
- Docker 中发现另一个历史项目的 `stock-analysis-infra_nats-data`、`stock-analysis-infra_temporal-postgres-data`；不属于 `stockquant-v12`，不得使用、删除或改挂载。

## 配置修复

- NATS 镜像固定为 `nats:2.10.29-alpine3.22` 多架构 index digest `sha256:b83efabe3e7def1e0a4a31ec6e078999bb17c80363f881df35edc70fcb6bb927`，JetStream store 显式设为 `/data/jetstream`，卷名 `nats-jetstream-v1`。
- Temporal 固定为 `temporalio/temporal:1.8.3` 多架构 index digest（与切换前 `latest` 实际摘要相同），增加 `--db-filename /home/temporal/temporal.db` 和卷 `temporal-dev-state-v1`。一次性卷权限测试确认默认 UID 1000 可写；测试卷已删除。
- 固定镜像 tag/digest 和 Temporal `--db-filename` 行为根据[Temporal 官方 CLI 文档](https://docs.temporal.io/cli/server)核对；NATS 2.10.29 Alpine 版本及多架构标签按[官方镜像资料](https://hub.docker.com/_/nats)核对。

## 切换与恢复证据

- `docker compose config --quiet` 通过；镜像已按精确 index digest 拉取。
- Temporal 挂载位置用一次性卷检查：初始卷继承镜像 `/home/temporal` 的 UID/GID 1000 所有权，默认 `temporal` 用户成功创建标记文件；临时卷已删除。
- 19:46 CST 仅重建 NATS。新卷 `stockquant-v12_nats-jetstream-v1` 挂载到 `/data/jetstream`；NATS v2.10.29 报告 `store_dir=/data/jetstream/jetstream`，启动后 0 streams/0 messages；platform-api `/ready` HTTP 200。
- NATS persistence smoke 用于验证数据路径：创建 `SQPH5PERSIST` file stream，仅发布 seq 1 的固定 payload `stockquant-phase5-persistence-smoke-v1`；使用 `--force-recreate --no-deps nats` 重建容器后，读回 stream、subject、seq 和 payload 完全一致；随后 cleanup 只删除该固定 stream。最终 JetStream 回到 0 streams/0 messages/0 bytes。
- 19:48 CST 仅重建 Temporal。SQLite `/home/temporal/temporal.db` 在 `stockquant-v12_temporal-dev-state-v1` 中，文件属主 UID:GID `1000:1000`；Temporal CLI 1.8.3 / Server 1.31.2 cluster health 为 `SERVING`。
- 通过现有 `GET /api/v1/integration/temporal/probe` 得到 `PASS`、`activityAttempts=2`、重试成功。Workflow ID `v15-api-51030b26-4cd9-40fe-a06b-fb687c6f405b`，Run ID `01a0ce18-3794-76e7-b470-87ae6868c9b5`；强制重建 Temporal 后以同一 ID `describe`，仍为 `COMPLETED`，HistoryLength 11，结果 `evt-8e17f3c4-d032-4088-83c6-156683cc4e46` 完全一致。Workflow list 随后仍包含该已完成历史。
- NATS 和 Temporal 各自切换/重建后，platform-api `/ready` 均 HTTP 200；原活动订阅和 PostgreSQL 卷未重启或改动。

本次只验证 macOS Docker Compose 单节点容器重建及命名卷读回；没有验证宿主机/磁盘故障、异机备份、Ubuntu、Temporal HA 或 ADR-0006 的 RPO/RTO。非空运行状态的快照、隔离恢复和切换步骤见[本地持久化恢复 Runbook](../../docs/operations/nats-temporal-persistence-recovery.md)。

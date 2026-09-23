# NATS 与 Temporal 本地持久化及恢复

状态：本机持久卷切换与服务容器重建恢复已验证（2026-09-23）。范围仅限 Docker Compose 开发与验收环境，不构成生产 Temporal 部署方案。

## 当前配置

- NATS：`nats:2.10.29-alpine3.22@sha256:b83efabe3e7def1e0a4a31ec6e078999bb17c80363f881df35edc70fcb6bb927`；JetStream 数据根目录挂载至 `/data/jetstream`，NATS 实际 `store_dir` 为 `/data/jetstream/jetstream`；命名卷为 `nats-jetstream-v1`。
- Temporal：`temporalio/temporal:1.8.3@sha256:cea463d98a8d6def4420f903ea5c3fcd0d85c8d10fbcc2770a50c12fff2eb26d`；Workflow SQLite 文件为 `/home/temporal/temporal.db`，挂载 `temporal-dev-state-v1`。已用一次性卷确认镜像默认 `temporal` 用户（UID 1000）可写挂载目录。
- 卷名由 Compose 项目前缀限定为 `stockquant-v12_nats-jetstream-v1` 和 `stockquant-v12_temporal-dev-state-v1`。不得用 `docker compose down -v`，不得删除旧卷或其他项目中同名语义的卷。

Temporal CLI 官方说明：`start-dev` 默认在服务进程退出后丢失 Workflow；`--db-filename` 可把 Workflow 状态写入指定持久文件。该 SQLite 开发服务不满足生产 HA、备份或 RPO/RTO 目标。见[Temporal CLI start-dev 参考](https://docs.temporal.io/cli/server)。NATS 非空流必须逐流快照并包含消费者状态，参考[NATS JetStream 备份与恢复](https://docs.nats.io/learn/backup-recovery/stream-backup-restore)。

## 每次重建前的状态门

在项目根目录使用 `.env.local` 调用 Compose，不打印该文件或容器环境变量：

```bash
docker compose --env-file .env.local -f infra/compose/docker-compose.yml config --quiet
docker compose --env-file .env.local -f infra/compose/docker-compose.yml ps nats temporal
docker exec stockquant-v12-nats-1 wget -qO- 'http://127.0.0.1:8222/jsz?streams=true&consumers=true'
docker exec stockquant-v12-temporal-1 temporal operator namespace list --address 127.0.0.1:7233 --output json
docker exec stockquant-v12-temporal-1 temporal workflow list --address 127.0.0.1:7233 --namespace default --output json
```

记录 JetStream 每个流的消息数/消费者数，以及 Temporal Namespace 清单中每个 Namespace 的 Workflow；上面的 `workflow list` 用 `default` 举例，需对清单里的每个 Namespace 重复执行。只要发现任一消息、消费者、活动 Workflow、UNKNOWN 状态或无法读取状态，**停止后续重建**；先安排维护窗口，按流和 Namespace 做可校验备份/导出，确认应用侧可恢复流程和消费者偏移，并在隔离副本验证。当前 Compose 下若 Temporal 仍使用无 `--db-filename` 的内存服务，活动 Workflow 无可复制的持久数据库；必须先通过受控业务命令将其完成/取消并记录结果，不能承诺从内存迁移。

NATS JetStream 的非空状态应使用兼容当前 Server 的 NATS CLI，带消费者状态逐流快照（例如 `nats backup stream STREAM BACKUP_DIR --consumers`），校验 stream 配置、序号、消息数和备份文件 SHA-256，再恢复到隔离新服务/新卷（`nats backup restore stream BACKUP_DIR`）；禁止把非空源直接挂到空卷后启动。Temporal 已持久化后的 SQLite 备份应先正常停止 Temporal，再复制 `temporal.db` 及存在的 `temporal.db-wal`/`temporal.db-shm` 文件并逐个记录 SHA-256；在隔离新卷启动同一 Temporal digest、查询 Namespace/Workflow 历史，再切换。旧卷和备份在验收前保持原样。

## 经空状态门批准的本地切换

只有上述检查明确为空、相关应用 `/ready` 正常、正式采集已收盘且没有重放/交易工作流在途时，才按顺序重建两个基础服务；该步骤不重启其他 Compose 服务：

```bash
docker compose --env-file .env.local -f infra/compose/docker-compose.yml pull nats temporal
docker compose --env-file .env.local -f infra/compose/docker-compose.yml up -d --no-deps nats
docker compose --env-file .env.local -f infra/compose/docker-compose.yml up -d --no-deps temporal
docker exec stockquant-v12-nats-1 wget -qO- 'http://127.0.0.1:8222/jsz?streams=true&consumers=true'
docker exec stockquant-v12-temporal-1 temporal operator cluster health --address 127.0.0.1:7233
docker exec stockquant-v12-platform-api-service-1 node -e 'fetch("http://127.0.0.1:3000/ready").then(async r=>{console.log(r.status,await r.text());process.exitCode=r.ok?0:1})'
```

不得添加 `--renew-anon-volumes`、`down -v` 或清理卷选项。确认 NATS `/jsz` 的 `store_dir` 指向 `/data/jetstream/jetstream`，Temporal cluster health 为 `SERVING`，platform-api `/ready` 为 HTTP 200。然后执行下列跨重建检查：

```bash
pnpm infra:nats-persistence-smoke publish
docker compose --env-file .env.local -f infra/compose/docker-compose.yml up -d --force-recreate --no-deps nats
pnpm infra:nats-persistence-smoke verify
pnpm infra:nats-persistence-smoke cleanup
```

NATS smoke 固定使用 `SQPH5PERSIST`、最多一条消息；cleanup 只在 stream 内容与固定 smoke payload 完全匹配时删除。Temporal 通过 `GET /api/v1/integration/temporal/probe` 运行已有 V1.5 探针，记录 workflowId/runId，执行 `up -d --force-recreate --no-deps temporal` 后用 `temporal workflow describe --workflow-id ID` 查询同一 Workflow 历史；不启动第二次新运行来替代查询。

本次实际结果：NATS 2.10.29 重建后固定测试流读回同一条消息（seq=1、payload 一致），cleanup 后 `/jsz` 回到 streams/messages/bytes 全 0；Temporal 1.8.3/Server 1.31.2 重建后 `SERVING`，同一 Workflow `v15-api-51030b26-4cd9-40fe-a06b-fb687c6f405b` / run `01a0ce18-3794-76e7-b470-87ae6868c9b5` 仍为 COMPLETED、historyLength 11；数据库位于 `temporal-dev-state-v1` 卷并由 UID 1000 持有。两次重建后 `platform-api-service /ready` 均 HTTP 200。详见[阶段五审计记录](../../evidence/audits/2026-09-23-phase-5-nats-temporal.md)。

若健康未恢复：不要删卷或覆盖备份。保留新旧容器日志和卷名；检查文件权限、镜像 digest、参数和 volume mount。必要时用独立恢复卷复制备份后验证；只在恢复副本通过后切换。失败历史需留存，不能用清空数据制造 PASS。

该过程验证的是本机单节点存活重建及持久卷读取。它不验证宿主机/磁盘故障恢复、异地备份、Ubuntu 部署、Temporal 集群高可用或 ADR-0006 的 RPO≤24小时/RTO≤4小时。

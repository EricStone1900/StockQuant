# V1.5-H 基础设施加固验证

验证日期：2026-09-09

## NATS JetStream

- 真实 NATS Server：`2.10.29`
- Stream：`SQV15`，file storage，replicas=1：PASS
- 消息发布并写入 Stream：PASS，消息数 `1`
- Server 重启后 Stream 和消息仍存在：PASS，消息数 `1`
- 业务服务接入真实 NATS：PASS（platform-api `/api/v1/integration/nats/probe`）

## Temporal

- 真实 Temporal Server：`1.31.2`
- 集群健康、Namespace、重启持久性：已在 [Temporal 证据](./evidence-v1.5-real-temporal.md) 记录并通过
- SDK Worker、业务 Workflow/Activity：PASS（正式 platform-api Worker，详见集成证据）；Activity 重试：PASS

## Ubuntu 烟测

- `ubuntu:24.04`，`linux/amd64`，容器内 `uname -m=x86_64`：PASS
- Ubuntu 包安装/完整 StockQuant 栈：PASS（用户于 2026-09-09 确认真实 Ubuntu 主机完整 Compose 烟测完成）
- 实际 Ubuntu 主机部署：PASS（用户人工确认；主机版本、架构、Commit 和命令输出尚未附在本记录中）

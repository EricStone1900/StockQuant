# V1.5 真实 NATS 验证证据

验证日期：2026-09-09

## 结果

- NATS Server：`2.10.29`，真实容器运行
- Docker 网络：`stockquant-v12_internal`
- 发布/订阅：PASS，主题 `sq.v15.test`，消息 `hello-v15`
- 请求/响应：PASS，主题 `sq.v15.req`，响应 `reply-v15`
- Server 重启后重新发布：PASS，主题 `sq.v15.reconnect`，消息 `reconnect-ok`
- 监控端点：PASS，`/varz` 返回有效 server id/version
- JetStream 持久化：NOT_RUN（nats-box v0.5.0 本次 CLI 参数与预期不兼容，未伪造结果）
- 业务服务接入真实 NATS：NOT_RUN（当前 V1.5 业务证据仍标记 `nats: NOT_RUN`）

临时容器 `stockquant-v15-real-nats` 已删除；未删除项目数据库、业务容器或数据卷。

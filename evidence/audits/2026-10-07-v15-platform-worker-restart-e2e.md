# V1.5 JetStream→Temporal持久派发、重试与执行中恢复隔离E2E

日期：2026-10-07（Asia/Shanghai）。命令 `pnpm test:e2e -- --stage V1.5` exit 0，Playwright 1/1。随机隔离项目 `sq-v15-e2e-afb6d0a2f81c482f35cb` 的容器、PostgreSQL/NATS/Temporal卷、网络及项目镜像已精确清理。外部行情源和真实券商调用均为0。

normal Run `e4a6b243-afc0-4e65-8be4-9eec8dfba358`在PostgreSQL事务内创建TestRun和Outbox。Harness停止本项目NATS约3秒、恢复后重启Platform API；坏JSON seq1与错误owner seq2由Consumer终止。同Run合法重复消息seq3首次ACK被FAKE-only隔离Hook丢弃后，逐消息元数据观察到`message.info.redelivered=true`并按稳定Workflow ID幂等接收。恢复Relay发布原始Outbox seq4，durable Consumer ACK floor推进至4。工作流在Frozen CN/US Fixture上完成120次Portfolio/FakeBroker权威观察，页面核对零订单、Fill、Reservation和账本/余额变化；同Run CLI check-only按WAITING exit 2，证据导出exit 0。rejection Run `eed9758c-4e0e-48be-8eb3-ba013d6db5e2`与recovery Run `67c48cad-6a99-4ba9-8072-a08e76e28674`仍为业务NOT_CONNECTED/NOT_RUN，自动通路检查通过。

在上述normal Workflow执行期间，Harness确认Platform日志中的CN_A `verifyNoTradeSessions` Activity启动Marker，此时浏览器尚未观察到120项完成；随后重启承载Temporal Worker的Platform API容器。Platform恢复后，同一Temporal持久Workflow最终完成120项权威观察，Web等待、同Run CLI/export及项目资源清理均通过。事件日志保存Activity启动、重启时间和工作流完成，不把该结果解释为Temporal Server停机恢复。

第二个normal Run `9558d1e7-fd4d-446e-85f2-094737da83ea`通过正式API创建。对该事件的Temporal调用边界注入一次`TemporalServiceUnavailableError`，Platform记录seq5并发出`NAK(5000)`；JetStream实际重投，同一Run完成120次权威观察，ACK floor到5，未产生第二份业务结果。这证明受控瞬态错误的NAK/重投，不证明真实Temporal连接中断或数据库错误重试。

机器事件时序、Playwright原始输出及源码/Compose/Fixture/Harness SHA-256见相邻JSON。真实Temporal服务停机追加探针未得通过结论，测试期间停服务后API Run创建请求报`fetch failed`；另外两次未达重试断言的Harness响应读取/旧日志定位问题也保留：[停机探针失败](2026-10-07-v15-temporal-outage-e2e-attempt-failure.md)、[响应读取失败](2026-10-07-v15-temporal-injected-retry-e2e-attempt-failure.md)、[旧日志匹配失败](2026-10-07-v15-temporal-injected-retry-stale-log-e2e-failure.md)。lost-ACK早期聚合计数探针与坏消息包解析失败记录亦保留，见[计数探针历史](2026-10-07-v15-lost-ack-counter-probe-failure.md)和[坏消息Harness历史](2026-10-07-v15-poison-envelope-e2e-failure.md)。ACK后的`ConsumerInfo.num_redelivered`快照是0；结论使用逐消息delivery metadata，而非聚合计数。

仍未验证：数据库瞬态重试、Temporal Server进程停机恢复、双Consumer/Worker竞争、受限网络恢复、交易授权/日终工作流、拒绝与UNKNOWN业务、备份恢复、目标Ubuntu和当前范围人工验收。

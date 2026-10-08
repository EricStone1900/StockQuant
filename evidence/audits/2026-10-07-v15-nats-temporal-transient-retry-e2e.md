# V1.5 JetStream→Temporal持久派发与重试隔离E2E

日期：2026-10-07（Asia/Shanghai）。本轮 `pnpm test:e2e -- --stage V1.5` exit 0，Playwright 1/1。随机隔离项目 `sq-v15-e2e-5fec044e380f12912533` 的容器、PostgreSQL/NATS/Temporal卷、网络及项目镜像已精确清理。

第一个normal Run `c7172228-4a57-4b0a-abad-1ed552797585` 在PostgreSQL事务内创建TestRun和Outbox。Harness停止随机项目NATS约3秒、恢复后重启Platform API；坏JSON seq1和错误owner seq2由Consumer终止，同Run合法重复消息seq3在首次ACK被隔离Hook丢弃后以`message.info.redelivered=true`再次投递，并经稳定Temporal Workflow ID幂等接收。恢复Relay发布原始Outbox事件seq4，consumer ACK floor到4。唯一业务结果含120次权威CN/US观察。normal页面断言零订单、零Fill、零Reservation及账本/余额不变；同Run CLI `--check-only`按WAITING exit 2，证据导出exit 0。rejection `886ef29e-d58d-47e1-be1f-3cdd714b042e`及recovery `e128c14f-246e-4a54-b630-8d61004b4d56`的业务仍保持NOT_CONNECTED/NOT_RUN，Web/CLI/export通路通过。

随后由正式V1.5 API创建第二个normal Run `760e851c-ee69-49d6-9210-4832b82029c6`。在随机项目中对该事件的Temporal调用边界注入一次`TemporalServiceUnavailableError`，Platform真实记录同一TestRun事件seq5并调用`NAK(5000)`。JetStream实际重投后Temporal执行同一Run；权威观察达到120，consumer ACK floor到5。第一次成功派发后的ACK也按测试设置丢弃一次，因此同一稳定Workflow ID再次幂等接收并最终ACK。该证据证明调用边界瞬态失败的分类、NAK、JetStream重投和单消费者恢复；不是Temporal服务器真实停机恢复，也不是数据库瞬态错误重试。

机器事件时序、Playwright输出和源码/配置/Fixture/Harness SHA-256见相邻JSON。此轮没有外部数据源或真实券商调用。此前实际停Temporal后追加API Run创建报`fetch failed`，未形成停机恢复结论；Harness响应读取错误和旧日志误匹配两次未达业务断言的失败均单独保留：[真实停机探针失败](2026-10-07-v15-temporal-outage-e2e-attempt-failure.md)、[响应读取失败](2026-10-07-v15-temporal-injected-retry-e2e-attempt-failure.md)、[旧日志匹配失败](2026-10-07-v15-temporal-injected-retry-stale-log-e2e-failure.md)。聚合`ConsumerInfo.num_redelivered`在ACK后为0；重投证据使用逐消息delivery metadata与逐Run事件日志。

仍未验证：数据库瞬态重试、双Consumer/Worker竞争、真实Temporal进程/Workflow执行期间重启、交易/日终工作流、拒绝/UNKNOWN业务、备份恢复、目标Ubuntu和当前范围人工验收。

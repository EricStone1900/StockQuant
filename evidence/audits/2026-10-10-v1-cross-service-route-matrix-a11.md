# V1 跨服务调用矩阵 A11 增量证据

日期：2026-10-10。增补[A06实际调用映射](./2026-10-10-v1-cross-service-route-matrix-a06.md)中Platform/Trade→Decision Governance AUTO Mandate两个V1.3消费者，完整P1/A04调用/身份/部署矩阵仍OPEN。

Platform `GeneratedPlatformV13AutoMandateClient`逐项覆盖create/read/readBudget/activate/pause五个操作，断言路径（含Mandate/TestRun编码）、HTTP方法、Platform Bearer和service身份、owner/actor scope、payload、无body读取及timeout；非法version在请求前拒绝。Trade `GeneratedTradeV13AutoMandateClient`逐项覆盖authorizeOrder/settleReservation，断言Governance专用路由、Trade身份/Bearer、准确请求体、路径编码和timeout。

定向Platform测试2/2、Trade测试1/1通过。当前完整V1.3 code suite exit 0：Platform 323、Trade 98；隔离服务迁移/HTTP smoke、仓库基线、临时资源清理通过，活动服务NOT_CONNECTED。证据：[完整日志](./2026-10-10-v13-auto-mandate-client-contract-code-suite-a01.log)、[exit](./2026-10-10-v13-auto-mandate-client-contract-code-suite-a01.exit.txt)、[SHA-256](./2026-10-10-v13-auto-mandate-client-contract-code-suite-a01.log.sha256)。

此切片不证明Governance预算业务的全部拒绝/恢复语义、跨域结算一致性、部署回退、全阶段人工验收或V1.1-S2-L14/P1/A04完成。

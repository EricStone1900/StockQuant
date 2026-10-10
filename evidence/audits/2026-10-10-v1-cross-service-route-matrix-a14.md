# V1 跨服务调用矩阵 A14 增量证据

日期：2026-10-10。补充[A06](./2026-10-10-v1-cross-service-route-matrix-a06.md)的Platform→Market Data V1.2双市场研究Fixture读取调用。

`services/platform-api-service/tests/unit/generated-v12-fixture-client.spec.ts`现直接验证`GET /v1/fixtures/research-preview`、Platform Bearer与服务ID、无请求体、AbortSignal和默认5000ms超时。定向文件3/3，Platform typecheck通过。

当前完整V1.2 code suite退出0：Platform 66文件/324测试、全局基线66项、隔离服务/迁移、Market Data PostgreSQL任务持久化恢复、锁版Qlib CPU组件及四个same-TestRun Web/API/CLI场景通过。恢复期间一次ECONNREFUSED后原Run完成；随机容器、卷、网络清理通过。证据：[完整日志](./2026-10-10-v12-market-research-preview-contract-code-suite-a01.log)、[退出码](./2026-10-10-v12-market-research-preview-contract-code-suite-a01.exit.txt)、[SHA-256](./2026-10-10-v12-market-research-preview-contract-code-suite-a01.log.sha256)。

仅补充P2研究Fixture消费者的传输合同；不代表Market Data源授权、真实市场日历、策略有效性、Ubuntu或人工验收通过，也不关闭P2父项。

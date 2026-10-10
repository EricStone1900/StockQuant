# V1 跨服务调用矩阵 A13 增量证据

日期：2026-10-10。补充[A06](./2026-10-10-v1-cross-service-route-matrix-a06.md)中Platform→Quant V1.2研究预览只读调用。

`services/platform-api-service/tests/unit/quant-v12-preview-client.spec.ts`逐项验证Qlib probe、RD-Agent probe和factor preview固定路由均使用Platform服务身份，无请求体，并携带`AbortSignal.timeout(5000)`信号；Quant HTTP错误状态保留。定向测试2/2、Platform typecheck通过。

完整V1.2代码套件退出0：Platform 66文件/323测试，全局基线66项，隔离数据库/迁移与Market Data集成、真实锁版Qlib CPU组件及四个same-TestRun Web/API/CLI场景通过。恢复窗口单次ECONNREFUSED后原Run完成恢复，隔离资源清理通过。证据：[完整套件日志](./2026-10-10-v12-preview-read-contract-code-suite-a01.log)、[退出码](./2026-10-10-v12-preview-read-contract-code-suite-a01.exit.txt)、[SHA-256](./2026-10-10-v12-preview-read-contract-code-suite-a01.log.sha256)。

只关闭预览客户端传输合同断言子项，不证明模型调用、策略有效性、Ubuntu或人工验收，也不关闭P1/A04整体调用/发布矩阵。

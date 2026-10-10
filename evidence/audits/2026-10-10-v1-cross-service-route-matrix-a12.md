# V1 跨服务调用矩阵 A12 增量证据

日期：2026-10-10。补充[A06](./2026-10-10-v1-cross-service-route-matrix-a06.md)中的Platform→Quant V1.2 Qlib fit长任务调用超时断言。

`services/platform-api-service/tests/unit/quant-qlib-client.spec.ts`现验证固定fit route、Platform服务身份/Bearer、完整Qlib Fixture请求JSON、`AbortSignal`以及默认`AbortSignal.timeout(120000)`，并保留HTTP 422与响应体。定向文件2/2、Platform typecheck通过。

完整V1.2代码套件退出0：Platform 66文件/323测试，基线66项、隔离迁移/服务身份HTTP smoke、真实Qlib组件和四个same-TestRun Web/API/CLI E2E通过，随机栈资源清理。恢复探针重启期间有单次连接拒绝日志，随后原Run恢复且Harness PASS。证据：[套件日志](./2026-10-10-v12-qlib-client-timeout-code-suite-a01.log)、[exit](./2026-10-10-v12-qlib-client-timeout-code-suite-a01.exit.txt)、[SHA-256](./2026-10-10-v12-qlib-client-timeout-code-suite-a01.log.sha256)。

该增量不证明Qlib策略独立有效性、真实RD-Agent模型调用、Ubuntu或人工验收，也不关闭全V1调用与发布矩阵。

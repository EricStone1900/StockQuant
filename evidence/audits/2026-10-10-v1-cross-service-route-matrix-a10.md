# V1 跨服务调用矩阵 A10 增量证据

日期：2026-10-10。为[A06调用映射](./2026-10-10-v1-cross-service-route-matrix-a06.md)的Platform→Quant V1.4操作补足完整传输合同断言；该单operation测试不关闭总矩阵。

`services/platform-api-service/tests/unit/v14-backtest-adapter.spec.ts`中的`uses the service bearer and preserves typed HTTP rejection`现断言：固定`POST /v1/research/backtests/daily-fixture`路由、Platform service ID及Bearer、JSON content type、准确scenario/seed/policy载荷、AbortSignal，以及HTTP 422对应的错误状态和response body。该测试文件6/6、Platform typecheck通过。

完整V1.4隔离代码套件退出0，Platform 66文件/323单测及隔离迁移/业务Harness/Artifact fencing通过，活动服务未连接且临时资源清理。[日志](./2026-10-10-v14-platform-quant-client-contract-code-suite-a01.log)、[exit](./2026-10-10-v14-platform-quant-client-contract-code-suite-a01.exit.txt)、[SHA-256](./2026-10-10-v14-platform-quant-client-contract-code-suite-a01.log.sha256)。仍未证明V1.4 Quant与Paper完整规则一致、SELL应收/结算、V1全调用/发布矩阵或人工验收。

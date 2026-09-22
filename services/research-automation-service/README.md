# research-automation-service

V3.1 的最小研究编排边界。当前支持实验请求的校验、幂等创建、查询和取消，并把缺少真实模型凭证或隔离 Runner 的状态明确记录为 `PENDING_PREREQUISITES`。

服务不会调用真实模型、启动 Runner 或连接真实券商。`environmentMode` 固定为 `RESEARCH`，`brokerMode` 固定为 `FAKE`。

本地检查：

```bash
pnpm --filter @stockquant/research-automation-service typecheck
pnpm --filter @stockquant/research-automation-service test
pnpm --filter @stockquant/research-automation-service test:integration
```

当前已增加两个安全边界校验入口：`POST /v1/runner/jobs/validate` 校验不可变镜像 digest、run/experiment namespace、资源限制和网络策略；`POST /v1/artifacts/validate` 校验内容寻址 ArtifactRef。它们只做校验，不启动 Runner、不写 Artifact，也不调用模型。预算规则由 `src/application/v31-runtime-guards.ts` 的 `BudgetLedger` 实现，未知费用状态会停止后续自动重试。

当前容器仍明确报告 `runner=NOT_CONFIGURED`、`modelGateway=NOT_CONFIGURED` 和 `PENDING_PREREQUISITES`。真实 RD-Agent、模型网关、Artifact 持久化和 Ubuntu Runner 验收不能用这些校验接口替代。

集成测试需要设置 `RESEARCH_AUTOMATION_DATABASE_URL`，只使用唯一测试 `experiment_id`，结束后删除本次测试行，不清理共享数据库或数据卷。

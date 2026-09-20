# research-automation-service

V3.1 的最小研究编排边界。当前支持实验请求的校验、幂等创建、查询和取消，并把缺少真实模型凭证或隔离 Runner 的状态明确记录为 `PENDING_PREREQUISITES`。

服务不会调用真实模型、启动 Runner 或连接真实券商。`environmentMode` 固定为 `RESEARCH`，`brokerMode` 固定为 `FAKE`。

本地检查：

```bash
pnpm --filter @stockquant/research-automation-service typecheck
pnpm --filter @stockquant/research-automation-service test
pnpm --filter @stockquant/research-automation-service test:integration
```

集成测试需要设置 `RESEARCH_AUTOMATION_DATABASE_URL`，只使用唯一测试 `experiment_id`，结束后删除本次测试行，不清理共享数据库或数据卷。

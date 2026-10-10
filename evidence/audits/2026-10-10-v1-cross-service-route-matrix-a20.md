# V1 跨服务调用矩阵 A20：Historical Replay授权在Trade端消费

日期：2026-10-10。补充V1.4 Historical FakeBroker执行中的Trade Execution→Decision Governance授权验证边界。该边此前只在端到端叙述中隐含，没有作为明确的生成客户端调用记录。

| OpenAPI operationId | 调用方与生成客户端 | 生产调用点 | 作用域/安全边界 |
|---|---|---|---|
| `authorizeHistoricalReplayExecution` | Historical Replay Worker / `GeneratedReplayDependenciesClient.authorizeHistoricalReplayExecution` | `historical-replay-worker/src/application/replay-coordinator.ts` | 申请精确的`BACKTEST/FAKE`命令授权；由`historical-replay-worker`专属身份调用Governance。 |
| `executeHistoricalFakeOrder` | Historical Replay Worker / `GeneratedTradeExecutionClient.executeHistoricalFakeOrder` | Replay coordinator执行已授权命令；Trade只接受Replay Worker caller | 仅向FakeBroker提交绑定namespace、账户、clientOrderId、证券、数量和bar的历史订单命令。 |
| `validateHistoricalReplayExecution` | Trade Execution / `GeneratedReplayGovernanceClient.validateHistoricalReplayExecution` | `trade-execution-service/src/bootstrap/main.ts`的`POST /internal/v1/historical-orders/execute` | Trade在调用FakeBroker前消费/幂等重验Replay授权；请求携带Trade专属Bearer及与原授权完全绑定的命令事实。无授权或验证失败时拒绝执行。 |

本轮增强最后一条边的直接客户端合同测试：除Trade identity、method、URL外，逐字段断言Content-Type、序列化授权/命令载荷、AbortSignal及默认5000ms超时。定向测试[Replay Governance client](../../services/trade-execution-service/tests/unit/replay-governance-client.spec.ts)1/1通过；完整`pnpm verify:stage -- --stage V1.4 --suite code`受控退出0，Trade Execution 99/99、Replay Worker 27/27、Governance 43/43、迁移账本、服务身份HTTP/PG、三服务真实授权/订单/Fill/Portfolio账本Harness与V1.4报告发布fencing均通过，随机资源清理已验证。完整[套件日志](./2026-10-10-v14-trade-replay-governance-client-contract-code-suite-a01.log)、[exit](./2026-10-10-v14-trade-replay-governance-client-contract-code-suite-a01.exit.txt)、[SHA-256](./2026-10-10-v14-trade-replay-governance-client-contract-code-suite-a01.log.sha256)。

已有V1.4 HTTP/PostgreSQL证据验证错误调用方不能签发或验证Historical Replay授权、篡改命令哈希不消费ACTIVE grant、无授权不能创建FakeBroker订单、正确Replay身份可走完授权执行路径；详见[A06中的V1.4拒绝边界](./2026-10-10-v1-cross-service-route-matrix-a06.md#v14-governance授权与trade执行拒绝边界补充2026-10-10)。

此补充补齐一条调用边的显式映射与直接客户端合同，不证明完整Replay全局故障/恢复组合、所有V1 route 发布矩阵或V1整体验收完成。OD-014、活动部署、Ubuntu和人工验收状态不变。

## A21：Platform→Governance V1.2策略快照接收映射（2026-10-10）

| OpenAPI operationId | 调用方与生成客户端 | 生产调用点 | 作用域/安全边界 |
|---|---|---|---|
| `receiveV12StrategySnapshot` | Platform / `GeneratedPlatformV12StrategySnapshotClient.receiveStrategySnapshot` | `platform-api-service/src/adapters/v12-strategy-governance-client.ts`，由`V12AcceptanceService`调用 | Platform专属Bearer与身份头，只向Governance提交已完成V1.2实验的策略快照并接收`RECEIVED`回执。客户端路径、body、身份和超时有直接测试，生成/漂移检查纳入全局合同命令。 |

完整V1.2 code suite exit 0：[日志](./2026-10-10-v12-governance-snapshot-generated-client-code-suite-a02.log)，[exit](./2026-10-10-v12-governance-snapshot-generated-client-code-suite-a02.exit.txt)，[SHA-256](./2026-10-10-v12-governance-snapshot-generated-client-code-suite-a02.log.sha256)。此记录关闭一条客户端生成/调用映射子项，不关闭P1/A04完整路由矩阵或V1验收。

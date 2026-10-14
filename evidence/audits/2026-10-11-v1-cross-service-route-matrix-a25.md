# V1 Trade Execution受保护写路由凭据矩阵 A25

日期：2026-10-11。范围：Trade Execution服务内13条V1受保护写路由的缺少身份、错误Bearer及错误服务身份拒绝；不覆盖V2.4 snapshot execution，也不关闭V1.1-S2-L14总矩阵。

## 覆盖路由

| 路由 | 允许调用方 |
|---|---|
| `POST /internal/v1/historical-orders/execute` | `historical-replay-worker` |
| `POST /internal/v1/v13/paper-orders/execute-manual-proposal` | `platform-api-service` |
| `POST /internal/v1/v13/paper-orders/execute-manual-sequenced-proposal` | `platform-api-service` |
| `POST /internal/v1/v13/paper-orders/execute-auto-proposal` | `platform-api-service` |
| `POST /internal/v1/v13/accounts/settlements` | `platform-api-service` |
| `POST /internal/v1/fake-broker/external-orders` | `platform-api-service` |
| `POST /internal/v1/orders/{id}/cancel` | `platform-api-service` |
| `POST /internal/v1/orders/{id}/cancel-result` | `platform-api-service` |
| `POST /internal/v1/orders/{id}/expire` | `platform-api-service` |
| `POST /internal/v1/orders/{id}/unknown` | `platform-api-service` |
| `POST /internal/v1/orders/{id}/simulated-fill-reports` | `platform-api-service` |
| `POST /internal/v1/orders/{id}/fills/{fillId}/fee-corrections` | `platform-api-service` |
| `POST /internal/v1/outbox/{eventId}/compensate` | `platform-api-service` |

每条路由分别使用错误服务身份/其自身Bearer、无服务身份与Bearer、正确服务名配另一服务Bearer；全部返回403。错误身份和凭据探针均在请求解析/领域处理前被拒绝。隔离命名空间中的FakeBroker orders、fills、events、outbox和sell receivables均为0。完整V1.3代码套件a04通过；随机服务/PostgreSQL资源清理完成。详见[运行日志](./2026-10-11-v13-trade-route-credential-matrix-code-suite-a04.log)、[退出码](./2026-10-11-v13-trade-route-credential-matrix-code-suite-a04.log.exit.txt)及[SHA-256](./2026-10-11-v13-trade-route-credential-matrix-code-suite-a04.log.sha256)。

## 剩余范围

该矩阵证明列出的V1 Trade写入口对三类错误身份/凭据失败关闭且无FakeBroker事实副作用。它不证明每一路由的合法请求响应、所有账户/Run/owner字段绑定、Platform→Trade消费者映射、迁移发布/回滚顺序或活动部署；这些与Portfolio/Governance/Replay/Market Data/Quant调用边一道保留在P1/A04总矩阵。V1.1-S2-L14和P1仍OPEN。

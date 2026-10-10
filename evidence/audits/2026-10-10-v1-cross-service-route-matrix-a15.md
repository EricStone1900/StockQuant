# V1 跨服务调用矩阵 A15 增量证据

日期：2026-10-10。补充Decision Governance内部API的Bearer路由准入规则枚举。

`services/decision-governance-service/tests/unit/service-auth.spec.ts`列出服务当前21条准入路径，并对Platform API、Trade Execution、Historical Replay三种服务身份逐一核验允许/拒绝，再验证错误HTTP方法、无效Proposal ID及未知路径均拒绝。定向文件7/7、Governance typecheck通过。

扩展隔离HTTP+PostgreSQL smoke，21条路由均进行错误身份、错误HTTP方法和伪造Bearer请求；畸形POST请求返回403，证明身份拒绝早于请求JSON解析。合计83个拒绝探测；`proposals`、`proposal_versions`、`proposal_decisions`、`proposal_revisions`、两类授权、Mandate、Mandate events、预算Reservations、Governed Strategy Snapshots十张事实表探测前后计数不变。

完整V1.3代码套件退出0，包含上述Governance route-scope HTTP+PG矩阵、Replay/Quant服务身份smoke及临时PostgreSQL：[日志](./2026-10-10-v13-governance-route-scope-http-code-suite-a01.log)、[exit](./2026-10-10-v13-governance-route-scope-http-code-suite-a01.exit.txt)、[SHA-256](./2026-10-10-v13-governance-route-scope-http-code-suite-a01.log.sha256)。

该证据确认Governance服务的路由级身份策略，不证明每条已授权路径的业务/模式拒绝和数据库无副作用，也不关闭全服务写路由矩阵或V1。

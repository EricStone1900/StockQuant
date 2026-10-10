# V1 跨服务调用矩阵 A16 增量证据

日期：2026-10-10。补充Decision Governance Platform API调用身份配置门禁。

Governance暴露Platform API专属的策略快照、Proposal、Paper授权与AUTO Mandate路由；旧配置加载器允许Platform Bearer缺失，可能导致服务启动成功但上述V1调用全部不可用。现在Platform API、Trade Execution、Historical Replay三份token均为必填、至少32字符且必须相互不同；启动加载器对缺失、弱值和复用值失败关闭。Compose Governance服务块的三项插值也改为必填，`.env.example`及服务架构同步说明。

证据：`service-auth.spec.ts`定向8/8通过，Decision Governance typecheck通过；Compose合法配置exit 0、强制空Platform token配置exit 1，见[Compose配置边界检查](./2026-10-10-v13-governance-compose-token-gate-a01.md)。完整V1.3 code suite exit 0（Governance 43、Platform 324、Trade 98），并包含21路由83个HTTP拒绝探测、隔离迁移与PostgreSQL smoke，随机资源清理完成。完整日志见[套件记录](./2026-10-10-v13-governance-platform-token-required-code-suite-a01.log)，exit与SHA见sidecar。

该变更只证明V1配置fail-closed和隔离回归；活动Governance服务未重启，完整跨服务消费者/部署矩阵及V1仍未关闭。

# V1.4 Replay namespace 与命令载荷边界代码套件

日期：2026-10-10

本次在 Replay UNKNOWN 原订单查询增加持久 namespace 约束后，补充检查 Replay lifecycle 和 UNKNOWN recovery 四个无请求体命令。对 `pause`、`resume`、`cancel`、`recover-unknown` 分别提交伪造 `status/result/orderId` JSON，均返回 422；数据库中的 Run 保持 `COMPLETED`，业务结果保持空对象。此前单独的 Trade 隔离 PostgreSQL/HTTP 集成还验证正确 namespace 返回 200、错误 namespace返回404，Replay身份访问通用订单详情返回403。

完整命令：`pnpm verify:stage -- --stage V1.4 --suite code`。受控 loopback 执行退出0；日志及机器材料：[日志](./2026-10-10-v14-replay-namespace-code-suite-a02.log)、[退出码](./2026-10-10-v14-replay-namespace-code-suite-a02.exit.txt)、[日志SHA-256](./2026-10-10-v14-replay-namespace-code-suite-a02.log.sha256)。套件覆盖仓库baseline/build/lint/typecheck/unit、V1.4相关隔离HTTP/数据库集成、服务 migration ledger、Quant与持久FakeBroker规则对照、Artifact fencing。所有隔离数据库容器和网络清理并核验；活动服务 `NOT_CONNECTED`。

普通沙箱首次运行因两个seed:paper HTTP单测无法监听127.0.0.1而失败（EPERM）；同一命令在受控本机 loopback 环境重跑a02后通过，原始失败不作为通过证据。

本报告只证明当前V1.4代码兼容套件和所述路由切片通过，不代表V1.4阶段验收、全V1门禁、OD-014决策、目标Ubuntu证据或用户人工验收完成。

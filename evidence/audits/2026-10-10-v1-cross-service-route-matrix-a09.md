# V1 跨服务调用矩阵 A09 增量证据

日期：2026-10-10。增补[A06实际调用映射](./2026-10-10-v1-cross-service-route-matrix-a06.md)中Platform→Trade Execution的V1.3生成客户端逐操作测试，父矩阵与V1.1-S2-L14仍保持OPEN。

`services/platform-api-service/tests/unit/generated-v13-manual-trade-client.spec.ts`为Platform实际使用的9个操作各有直接合同断言：execute MANUAL、execute sequenced MANUAL、execute AUTO、record sequenced Fill、request cancel、resolve cancel、read order by client ID、read independent assets、correct Fill fee。断言包含请求方法/路径、service identity/Bearer、必要载荷及路径/query编码；bodyless/GET保持无body。定向测试9/9和Platform typecheck通过。

完整`pnpm verify:stage -- --stage V1.3 --suite code`退出0，Platform 66个文件/323项测试、Trade 98项及仓库66项基线测试通过；Portfolio/Governance/Trade隔离迁移与HTTP检查通过。活动服务NOT_CONNECTED，测试临时数据库/网络均清理。证据：[完整日志](./2026-10-10-v13-platform-manual-trade-client-contract-code-suite-a01.log)、[exit](./2026-10-10-v13-platform-manual-trade-client-contract-code-suite-a01.exit.txt)、[SHA-256](./2026-10-10-v13-platform-manual-trade-client-contract-code-suite-a01.log.sha256)。

这只证明Platform→Trade传输合同。Trade端到端授权/预算/模式拒绝副作用、V1完整调用者/operation矩阵、活动部署回退、所有者决定、恢复及用户验收仍需各自证据。

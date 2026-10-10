# V1 跨服务调用矩阵 A07 增量证据

日期：2026-10-10。此记录增补[调用矩阵A06](./2026-10-10-v1-cross-service-route-matrix-a06.md)中Platform→Historical Replay客户端逐操作覆盖，不改变A06中各项状态，也不关闭V1.1-S2-L14/P1/A04。

`services/platform-api-service/tests/unit/historical-replay-client.spec.ts`现有直接测试确认：单bar启动使用POST、生成的回放命令、Platform服务身份/Bearer与超时信号；多bar同步/异步启动维持既有覆盖；run ID含斜杠时read/pause/resume/cancel/recover-unknown各操作路径编码；bodyless操作不携带请求体；HTTP错误保留状态码。定向单测4/4及Platform typecheck通过。

随后完整`pnpm verify:stage -- --stage V1.4 --suite code`退出0；Platform API 64个测试文件/310项单测通过，全局66项基线脚本、隔离服务迁移、身份HTTP smoke和Trade/Portfolio/Governance固定账本Harness通过；活动服务`NOT_CONNECTED`，随机临时数据库/网络清理通过。详见[完整日志](./2026-10-10-v14-platform-replay-client-contract-code-suite-a01.log)、[exit](./2026-10-10-v14-platform-replay-client-contract-code-suite-a01.exit.txt)及[SHA-256](./2026-10-10-v14-platform-replay-client-contract-code-suite-a01.log.sha256)。

本切片不替代Replay业务成功/恢复固定场景、每个消费者拒绝副作用矩阵、跨版本发布兼容/回退、全V1恢复与用户验收。四个历史Run导出、OD-014结算决定、Ubuntu/宿主演练和其他关闭条件维持原状态。

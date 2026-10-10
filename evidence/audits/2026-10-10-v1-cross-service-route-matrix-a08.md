# V1 跨服务调用矩阵 A08 增量证据

日期：2026-10-10。此记录增补[调用矩阵A06](./2026-10-10-v1-cross-service-route-matrix-a06.md)中Platform→Decision Governance Proposal生成客户端的操作级测试，矩阵父项与完整V1范围仍保持OPEN。

`services/platform-api-service/tests/unit/generated-v13-proposal-client.spec.ts`通过4项直接测试覆盖create/read/decision/revision四类调用：create使用Platform身份/Bearer及准确payload；read使用编码proposal ID、owner scope且无body；approve与reject使用各自route、actor header和精确command；revision使用编码ID、owner/actor范围与完整payload。超时AbortSignal均存在。定向4/4及Platform typecheck通过。

完整`pnpm verify:stage -- --stage V1.3 --suite code` exit 0。Platform 65文件/314测试，Decision Governance 41、Trade Execution 98、Replay Worker 27；仓库66项基线脚本、隔离服务迁移和HTTP边界通过。活动服务`NOT_CONNECTED`，随机临时资源清理通过。[完整日志](./2026-10-10-v13-platform-proposal-client-contract-code-suite-a01.log)、[exit](./2026-10-10-v13-platform-proposal-client-contract-code-suite-a01.exit.txt)、[SHA-256](./2026-10-10-v13-platform-proposal-client-contract-code-suite-a01.log.sha256)。

剩余范围包括V1 operation/consumer完整矩阵、独立拒绝副作用覆盖、跨服务部署/回退与阶段业务接受路径；本增量不关闭V1.1-S2-L14、P1/A04、P3或V1门禁。

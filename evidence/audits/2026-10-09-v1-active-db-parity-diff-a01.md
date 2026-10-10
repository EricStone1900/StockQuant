# V1 当前活动 TestRun 逐行Parity差异 A01

日期：2026-10-09。目标：`stockquant-v12` 的 `platform_api` 数据库。SQL复用了`PostgresLegacyTestRunMigration`的字段投影和对比项，在`BEGIN READ ONLY`事务中连接legacy `test_runs` 与 `acceptance_stage_runs`，只输出Run UUID、状态和不同字段名称；不输出assertion/evidence正文、不更改记录。

- [逐行差异原始结果](./2026-10-09-v1-active-db-parity-diff-a01.log)，SHA-256 `198b79e07b710c53d682b0396e158dc3380fbbab28dbfaa91ed55b45e99d8c23`：59条legacy源记录中有15条在stage目标表缺失，均为`COMPLETED`；已存在目标记录中未发现字段divergence。所列15个UUID是迁移候选差异，不等于获准执行迁移。
- [阻塞迁移的非终态Run清单](./2026-10-09-v1-active-db-nonterminal-a01.log)，SHA-256 `bb31a610559fcbd900814d1869f32bbb4d61150a375fb9402aa03408289e4e49`：2条`RUNNING`均为V1.1 `normal`、assertion与acceptance均0行；1条`WAITING`为V1.1 `recovery`、有1条assertion、无acceptance记录。精确UUID/创建时间/Seed见日志。没有读取assertion正文，也没有推断其业务结果。

依照[迁移Runbook](../../docs/operations/v11-test-run-storage-cutover.md)，所有legacy非终态必须先由操作负责人明确处置并保留证据；不能因时间久或断言为空自动判失败/完成。之后仍须维护窗口、双写停止、备份/恢复和隔离演练，并在允许时通过已有事务迁移及Parity门禁。状态保持`NOT_READY / NOT_AUTHORIZED / NOT_DEPLOYED`。本次没有写入stage表、更新非终态状态或应用迁移。

# V1 历史 TestRun 导出来源复核 A02

日期：2026-10-11。只读范围限定为正式门禁仍缺失的四个 V1 UUID：V1.2 `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`，以及 V1.5 `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`。

对 `evidence/local` 下的 3,631 份 JSON 导出执行精确 `stageId` + UUID 扫描，四项均无匹配 payload。[机器结果](./2026-10-11-v1-history-export-source-recheck-a02.json)，SHA-256见同名 `.json.sha256`。对当前运行的10个 `postgres:16.9-alpine` 容器，在各自 `platform_api` 数据库中以 `BEGIN TRANSACTION READ ONLY` 精确查询 `test_runs.test_run_id`，所有容器均无匹配且查询无错误；逐容器结果见[日志](./2026-10-11-v1-history-export-postgres-readonly-a02.log)及其 SHA-256 sidecar。此前的本地 API 精确 GET 404记录见[API复核 A01](./2026-10-10-v1-current-history-test-run-api-recheck-a01.json)。

这证明当前已检查的本地 JSON、活动 PostgreSQL 和 API 来源没有这些原始运行记录；不证明离线或外部备份不存在。未启动、重启、回放或改写任何栈/卷，也未创建替代Run。只有包含原始 UUID 和完整业务断言的原始备份/导出，才可恢复为正式证据；否则须保留缺失状态并由项目所有者决定证据缺失的处置，不能合成 payload、用新Run替换或绕过Verifier。

# platform-api-service

状态：已实现多个V1～V3阶段API/持久化与验收编排切片；不能据此推断所有阶段验收、活动部署或浏览器用户会话已通过。设计见[服务架构](../../architecture/services/platform-api-service.md)。

平台API负责本地开发身份、能力/健康、各阶段TestRun、证据索引和人工结论元数据；服务不得拥有或直写组合账本。真实用户会话和人工签署仍受阶段验收门禁约束。

V1.1历史TestRun的`test_runs`记录已加法迁移到`acceptance_stage_runs`，源行与历史接受记录仍保留。`STOCKQUANT_V11_RUN_STORAGE`支持`legacy`（默认，当前部署行为）与`stage`。stage模式启动前会验证两表的全部V1.1投影完全一致；不一致时服务启动失败。启用后读统一阶段表，创建/状态/断言在同一数据库事务写两表，供回滚期间继续读取旧版。切换前需停止全部旧版写进程，确认活动数据库影子数据完整；只允许单一兼容版本写入，不能在混合旧版与stage模式实例时滚动切换。活动Compose配置默认legacy，本地实现/隔离HTTP证据见[历史TestRun迁移审计](../../evidence/audits/2026-09-25-p3-history-inventory.md)。此代码路径尚未在活动服务启用，也不改变人工验收状态。

2026-10-05 V1.1迁移安全门禁复核：迁移入口现在拒绝任何尚未处置的legacy `QUEUED`、`RUNNING`、`WAITING`记录，不再仅拒绝24小时内的记录。活动快照中仍有2条RUNNING和1条WAITING；切换前必须由负责人决定并保留处置证据，年龄不等于终结。该修改经过Platform typecheck、全量49文件/180项单测及脚本语法检查；未连接活动库或执行迁移。见[W1迁移门禁审计](../../evidence/audits/2026-10-05-w1-v11-stale-nonterminal-migration-guard.md)。

V2.3旧Qlib JSONB搬迁演练入口为`pnpm --filter @stockquant/platform-api-service v23:qlib-legacy-backfill`。须同时设置`PLATFORM_API_QLIB_BACKFILL_DATABASE_URL`（数据库名必须精确为专用`platform_api_test`）和`PLATFORM_API_QLIB_BACKFILL_CONTENT_ROOT`（系统临时目录下、名称为`stockquant-qlib-backfill-*`的新目录）；默认只dry-run，可加`-- --apply --limit=100`执行有界批次。仅处理PUBLISHED/RETAINED行，逐项校验JSON规范字节SHA与artifact_id，先写共享内容存储并回读校验，再以payload/status/hash条件更新清空JSONB。冲突留待重跑，校验/存储异常会中止且保留原行；执行入口不会自动连接活动Compose配置。

实现边界与验证记录见[W1 Qlib JSONB回填审计](../../evidence/audits/2026-10-01-w1-qlib-legacy-jsonb-backfill.md)及其SHA-256清单。

2026-10-01 V1.1存储切换Runbook更新：活动`platform_api`只读快照当前观察到49条legacy TestRun及44条V1.1影子行，最近24小时非终态为0。随机恢复副本已验证部分shadow迁移补齐差额、重复运行幂等、stage owner读取与新Run双写。执行顺序、维护窗口停止条件和失败回退见[存储切换Runbook](../../docs/operations/v11-test-run-storage-cutover.md)与[复演审计](../../evidence/audits/2026-10-01-w1-v11-current-snapshot-migration.md)。这些准备没有部署或修改活动API。

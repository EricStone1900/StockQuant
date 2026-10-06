# V1.1 当前快照 TestRun 迁移复演

日期：2026-10-01（Asia/Shanghai）

## 发现与改动

活动 PostgreSQL 与 Platform API 在检查时分别为 `healthy`。对 `platform_api` 做只读定制格式 pg_dump，并恢复到随机 `platform_shadow_<hex>` 数据库后，首次运行既有迁移复演入口触发旧断言：它要求目标影子表为空，而当前快照已有44条 V1.1 影子记录。旧入口拒绝继续，未改写本地副本以外的数据。随后临时拓展检查允许从部分影子状态继续后，实测迁移原子补入5条；复跑断言仍以“0插入”为唯一期望且失败。两次快照尝试均因命令返回非零执行精确清理，活动库只读。

`services/platform-api-service/scripts/rehearse-legacy-test-run-migration.mjs`现按源/目标快照关系验证首拷贝、部分shadow补齐或已迁移状态。它要求迁移插入数等于迁移前缺口，验证全部核心字段、精确时间、断言与历史接受记录，随后要求第二次迁移新增0条并保持源记录数不变；最后从stage模式进行owner-scoped读取和新TestRun legacy/stage双写，再复核parity，精确清理创建的Run。

## 当前库快照复演结果

受控本机只读快照恢复到随机隔离数据库 `platform_shadow_ef37ad7bb97042ef`。source TestRun 49条：43 COMPLETED、3 FAILED、2 RUNNING、1 WAITING；V1.1 unified shadow 原有44条。两条RUNNING最早/最晚为2026-09-15 14:42:58.67055Z / 14:44:16.160814Z，单条WAITING为2026-09-16 11:57:56.055377Z；最近24小时非终态0，满足迁移入口现有的时间窗前置。运行结果：

- `migrationMode=partial-shadow snapshot`；补齐5条。
- 所有49条核心字段差异0；断言/接受历史差异0。
- 幂等复跑新增0条；legacy源表记录数保持49。
- stage模式owner-scoped读取通过；创建/状态更新同时写入两表；迁移后parity通过。
- 临时快照数据库、临时dump和测试TestRun均精确清理；复核活动库仍49条legacy/44条shadow，服务仍healthy，无 `platform_shadow_%` 数据库残留。

完整命令为Platform package的`test:legacy-migration-rehearsal`，包含服务build。活动 API 未重启或写入。切换前必须在维护窗口停止旧写入、重新备份/恢复演练、重新评估非终态记录并在允许情况下补齐最新差额；不得把本次快照数量视作切换日基线。切换/回退仍未授权、未部署；参见[Runbook](../../docs/operations/v11-test-run-storage-cutover.md)。

变更后的复验：Platform TypeScript typecheck PASS、42个测试文件/139项单测PASS；`pnpm verify:stage -- --stage V1.1 --suite code`受控完整重跑exit 0，包含docs/contracts/fixtures、全仓构建/lint/typecheck/unit和V1.1适用隔离代码回归。更新后docs:check 1,712条本地链接PASS、`git diff --check`与本审计SHA-256校验PASS。

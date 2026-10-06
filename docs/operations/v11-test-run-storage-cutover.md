# V1.1 TestRun 存储切换与回退 Runbook

状态：PREPARED / NOT_AUTHORIZED / NOT_DEPLOYED。此文档和隔离演练不授权维护窗口操作；活动 Platform API 与数据库必须保持原样，直至另有明确维护窗口安排。

## 当前运行基线

2026-10-01 从运行中的本地 `platform_api` 只读导出恢复到随机 `platform_shadow_<hex>` 副本。快照含49条 legacy TestRun，其中43 COMPLETED、3 FAILED、2 RUNNING、1 WAITING；统一表已有44条 V1.1 记录。两条 RUNNING 最早/最晚为2026-09-15 14:42:58.67055Z / 14:44:16.160814Z，唯一 WAITING 为2026-09-16 11:57:56.055377Z，24小时内非终态数量为0。恢复副本补齐5条后，核心字段/接受历史差异均为0，重复迁移新增0；stage模式 owner-scoped读取、新TestRun双写和迁移后parity通过。快照数据库及临时dump随后精确删除；活动 API/PostgreSQL 未重启或写入，复核仍为healthy，活动表数量未变。证据：[当前库快照迁移复演审计](../../evidence/audits/2026-10-01-w1-v11-current-snapshot-migration.md)。

当前 API `STOCKQUANT_V11_RUN_STORAGE` 默认为 `legacy`。因此在旧版继续写入期间，影子表可能落后；2026-10-01 的只读基线已观察到5条差额。部署前必须重新测量，不能复用上述数量当成维护日数据。


## 2026-10-02 当前快照复演

10:51 Asia/Shanghai 从当前运行的 `platform_api` 只读导出 custom-format dump（113,204 bytes，SHA-256 `9bd97e60dd85c3bf272a751b411ffba7953ca3e6ed67ba3120a41a19913ef113`），恢复到随机隔离数据库 `platform_shadow_d645bb1cae6341de`。当前快照仍为49条 legacy/44条 V1.1 shadow，状态43 COMPLETED、3 FAILED、2 RUNNING、1 WAITING；过去24小时非终态为0。使用 `test:legacy-migration-rehearsal` 后补迁5条、字段/接受历史差异0、重复运行新增0、source仍49、owner读取/双写/parity通过。清理后活动库仍为49/44、没有任何 `platform_shadow_%` 数据库、dump已删除，PostgreSQL仍healthy。原始复演输出见[复演日志](../../evidence/audits/2026-10-02-w1-v11-partial-shadow-rehearsal.log)；完整审计见[W1审计](../../evidence/audits/2026-10-02-w1-v11-partial-shadow-rehearsal.md)。

迁移入口此前拒绝任何非空目标表，这与当前44条合法 shadow 行冲突；现在按 `sourceRows - existingShadowRows` 计算应插数，并保留超额目标及字段冲突拒绝。旧版本的脚本只拒绝最近24小时的非终态；但当前快照中虽该计数为0，仍有2条旧 RUNNING 和1条旧 WAITING，存在迁移后把未处置Run永久留在非终态的风险。2026-10-05已加固为拒绝任何QUEUED/RUNNING/WAITING legacy行，须由操作负责人先处置并保留证据；不得以年龄视为已处置。维护窗口尚未安排，因此活动切换/回退仍为NOT_AUTHORIZED/NOT_DEPLOYED。

## 放行前置条件

1. 维护负责人确认本地目标、影响服务、开始/结束时间和回退负责人；本流程需要短暂停止 Platform API 写入。
2. 按当前备份/恢复流程为 Platform 数据库及关联 Artifact 做成对备份，验证 Manifest 与隔离恢复；记录可恢复的RPO/RTO。缺少可验证备份时停止。
3. 确认 Web/CLI/自动化不会向 Platform API 写入；平滑停止全部旧 Platform API 实例，确认无旧版本写进程。
4. 只读核对 `platform_api`、本地PostgreSQL映射端口、活动容器身份及写入停止状态。检查全部非终态TestRun；`apply-legacy-test-run-shadow-migration.mjs` 会拒绝任何QUEUED/RUNNING/WAITING legacy行（不论创建时间），异常或未完成业务Run须由负责人先作明确处置并保留证据。
5. 对最新恢复快照先运行 `PLATFORM_API_MIGRATION_REHEARSAL_DATABASE_URL=<随机 platform_shadow_... DSN> pnpm --filter @stockquant/platform-api-service test:legacy-migration-rehearsal`。仅接受 source/target 全量字段一致、历史断言/接受记录保留、重复运行新增0、owner-scoped读取和新Run双写均通过。

## 维护窗口执行

仅在以上条件通过并获准后执行。使用平台迁移管理员凭据配置 `PLATFORM_API_LEGACY_MIGRATION_DATABASE_URL`，不要将凭据放在命令历史、审计或版本控制中。入口硬限制本地 `127.0.0.1:5433/platform_api` 和 `postgres` 管理角色，并且必须显式带 `--apply`：

```bash
PLATFORM_API_LEGACY_MIGRATION_DATABASE_URL="$PLATFORM_API_MIGRATION_DSN" \
  pnpm --filter @stockquant/platform-api-service v11:legacy-shadow-migration
```

迁移以事务锁定源/目标表、只插入缺失的影子行、拒绝冲突、不删除或改写源表。命令输出必须显示 sourceRows=targetRows、冲突0、第二遍新增0、源记录数不变。否则立即停止，不启动 stage 模式。

先保持 Platform API 停止，设置 `STOCKQUANT_V11_RUN_STORAGE=stage`，启动单一新版本实例。等待服务启动时对完整 V1.1 投影执行 parity 门禁，并验证健康、TestRun读/创建/更新与验收记录；确认无另一旧版实例。然后恢复 Web/CLI 写入。

## 放行标准与回退

放行要求：迁移脚本与stage启动parity均通过；只读源/目标计数一致；原TestRun ID、状态、Seed、创建/完成时间、断言、错误/账户信息和历史验收可读；新建Run在legacy/stage表原子双写；Web创建的同Run能由CLI `--check-only`核对；Artifact引用和导出可读取；关键业务数据库计数未出现非预期变化。

任何门禁失败、写入错误、owner读取差异或健康检查不通过：停止新写入，保留日志/数据库与Artifact，恢复原Platform镜像及 `STOCKQUANT_V11_RUN_STORAGE=legacy`，重启单一旧版服务。stage模式正常双写 legacy 表，预期可回退读取；若parity或schema无法确认，则保持API停止并人工核查，禁止删除影子表或历史证据。恢复后重复健康与同ID只读检查，并归档迁移前后证据。不得通过删行、重置账本或覆盖备份修复差异。

当前维护窗口、备份恢复、活动切换、回退和新增范围人工验收都尚未执行；现有 isolated code suite 和本地快照演练不代替这些门禁。

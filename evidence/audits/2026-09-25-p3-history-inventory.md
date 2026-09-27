# P3 历史 TestRun 只读盘点

日期：2026-09-25（Asia/Shanghai）

## 方法与边界

使用活动 `platform_api` PostgreSQL 数据库的只读事务，对 `test_runs` 与 `acceptance_stage_runs` 按阶段、状态聚合计数；没有读取运行ID、owner、namespace、assertion、evidence 或账户标识，也没有写入或迁移数据。

## 结果

| 表 | 阶段 | 状态 | 数量 |
|---|---|---|---:|
| `test_runs` | V1.1 | COMPLETED | 38 |
| `test_runs` | V1.1 | FAILED | 3 |
| `test_runs` | V1.1 | RUNNING | 2 |
| `test_runs` | V1.1 | WAITING | 1 |
| `acceptance_stage_runs` | V1.3 | COMPLETED | 1 |
| `acceptance_stage_runs` | V2.1 | COMPLETED | 3 |
| `acceptance_stage_runs` | V2.2 | COMPLETED | 3 |
| `acceptance_stage_runs` | V2.3 | COMPLETED / FAILED / RUNNING | 55 / 7 / 3 |
| `acceptance_stage_runs` | V2.4 | COMPLETED / FAILED / RUNNING | 24 / 1 / 1 |
| `acceptance_stage_runs` | V2.5 | COMPLETED | 34 |
| `acceptance_stage_runs` | V3.1 | COMPLETED | 43 |

旧 `test_runs` 表当前只保留 V1.1 共44条，其中6条仍为非终态；较新阶段记录存放在 `acceptance_stage_runs`。两种存储的列与证据形状不同：旧表另有 assertion/acceptance 子表，而阶段表把 assertions/evidence 放在行内。因此这次计数能确认历史分布，不能单独证明记录可无损合并。

## 结论

历史迁移仍未执行。活动数据保持原样，所有RUNNING/WAITING记录均保留。实施迁移前还需在专用恢复副本中冻结字段映射、接受记录及assertion关系、终态/时间保真、重复ID冲突处理和回滚校验；不得把当前活动库作为迁移试验目标。该盘点不改变任何阶段或人工验收状态。


## 隔离影子迁移验证（2026-09-25）

实现 `shadowMigrateLegacyTestRuns`，在事务中对旧源表加共享锁、对目标表加迁移锁，将V1.1 `test_runs`复制到`acceptance_stage_runs`；保留源表，不删除、不更新任何旧行。转换将原断言（含创建时间）、owner、namespace、status、seed、accountId、error、原created/completed时间及完整接受记录历史封装到目标行。若同ID目标行与映射不一致，或namespace发生唯一键冲突，事务失败并整体回滚；相同映射可安全重跑。

在专用`platform_api_test`新增3条合成源记录（COMPLETED、RUNNING、WAITING），包含断言和两条不同时点的历史接受记录；验证完成记录的金额断言、accountId、接受记录顺序和时间、open状态及时刻保真。首次影子迁移插入3条，第二次插入0条。再为第四条源记录预置内容不同的同ID目标行，确认冲突被检测且不覆盖，事务回滚。测试创建的源/目标行均按精确ID/owner/namespace清除。平台持久化integration入口已纳入该测试。

这证明影子复制算法及冲突策略，不等于活动库迁移或API读写切换已完成。活动库只读盘点仍为V1.1旧表44条（38 COMPLETED、3 FAILED、2 RUNNING、1 WAITING）；原表保留及正式兼容/回滚方案仍待评审执行。V2.4完整code suite在此变更后退出0。

## Restored active-snapshot rehearsal (2026-09-26)

The active `platform_api` database was read-only dumped (about 9 MiB) from the existing PostgreSQL container to its temporary filesystem, restored into a newly generated `platform_shadow_<random hex>` database, and the shadow migration was executed only against that restored copy. No active API or PostgreSQL service was restarted. The rehearsal command is `PLATFORM_API_MIGRATION_REHEARSAL_DATABASE_URL=postgresql://postgres@127.0.0.1:5433/platform_shadow_<random hex> pnpm --filter @stockquant/platform-api-service test:legacy-migration-rehearsal`; the script refuses any database name outside this random shadow prefix and requires the local test admin.

It copied all 44 source rows: 38 COMPLETED, 3 FAILED, 2 RUNNING and 1 WAITING. Core status/seed/timestamps and acceptance-record history mismatches were both zero; the migration's own transaction also checked every mapped source/target field and rejected any conflict. A second run inserted zero rows. The source rows remained present. The exact shadow DB and dump were deleted; a final query confirmed the active status distribution was unchanged and both services remained healthy. The configured `test:integration:persistence` suite then passed, including synthetic state/timestamp/acceptance-history preservation, idempotence and conflicting-ID rollback.

This validates the mapping against a restored snapshot of current history, but does not authorize or execute migration on the active database, switch API reads/writes, or establish a production rollback window. Active cutover, concurrent-write handling, compatibility period, and recovery/rollback evidence remain open.

## Additive active shadow copy (2026-09-26)

Before writing, a fresh read-only preflight found 0 V1.1 target rows, 44 legacy rows, and 0 QUEUED/RUNNING/WAITING legacy rows created during the preceding 24 hours. The nonterminal historical rows date to 2026-09-15/16. Platform API and PostgreSQL were healthy. A temporary `pg_dump` of `platform_api` was created inside the PostgreSQL container and SHA-256 checked before migration.

Ran `PLATFORM_API_LEGACY_MIGRATION_DATABASE_URL=postgresql://postgres@127.0.0.1:5433/platform_api pnpm --filter @stockquant/platform-api-service v11:legacy-shadow-migration`. The guarded command requires the explicit `--apply` package task, accepts only the local `platform_api` endpoint, refuses any recent nonterminal run, and refuses preexisting V1.1 target rows. Its migration transaction copied all 44 rows and independently verified complete source/target projection equality before commit; a second pass inserted zero rows. Post-run read-only comparison returned zero mismatches, and source and target status distributions matched exactly: 38 COMPLETED, 3 FAILED, 2 RUNNING, 1 WAITING. The source rows were retained. The temporary dump was removed after verification; the API and PostgreSQL containers remained healthy and neither was restarted.

This completes the additive data shadow copy on the active database. The legacy table remains authoritative for V1.1 API reads/writes; no runtime cutover, dual-write, rollback-window rehearsal, or human sign-off occurred. Follow-on work must implement and test a controlled read/write switch before the old source can be retired. Existing histories in both tables must remain preserved.

## Controlled unified-store API mode (2026-09-26)

Implemented `STOCKQUANT_V11_RUN_STORAGE=stage`; the default remains `legacy`. Startup runs a full source/target parity assertion after both schemas exist and refuses stage mode on any missing or divergent row. In stage mode V1.1 reads are owner-scoped from `acceptance_stage_runs`; create, status updates and assertion replacement write the unified and legacy tables within one transaction. A failed second write rolls back the first, and legacy dual-writes remain available for rollback to the old application version. Deployment must stop all old writers before starting stage mode; mixed old/new writers are not safe. The Compose setting explicitly defaults to `legacy`.

The dedicated `platform_api_test` PostgreSQL suite passes migration preservation/conflict cases plus dual-store creation, status/account/error/evidence and assertion checks, full-precision timestamp preservation, stage owner scoping, parity failure when a target row is missing, and rollback after an injected missing-target write. A real temporary Platform API process started in stage mode, passed the startup parity gate, served run and evidence GETs (200), rejected a foreign session (403), and cleaned its exact TestRun. `pnpm --filter @stockquant/platform-api-service test:integration:persistence` passes all configured checks.

This supplies an implementation and isolated HTTP cutover proof, not an active service rollout. The active Compose service remains on default `legacy`; no existing browser session, collector, formal observations, or acceptance history were changed. A coordinated deployment/rollback-window and Web→API verification remain outstanding before considering cutover complete.

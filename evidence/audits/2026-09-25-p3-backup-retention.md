# P3.R 备份保留清理器审计

日期：2026-09-25（Asia/Shanghai）

## 已实现

- 新增配对备份清单 `paired-backup-manifest-v1`，记录备份标识、创建时间、保留类别、数据库/Artifact卷身份，以及每个文件的相对路径、字节数和 SHA-256。
- 新增保留计划工具：每日备份保留当前日及之前29个UTC日；月末备份保留最近12个UTC月份。仅接纳清单格式、目录结构、文件集合、大小和哈希全部匹配的直接子目录；无效、不完整或损坏的归档不会被纳入删除候选。
- 默认只输出计划；必须显式使用 `--apply` 才会清理过期归档。备份根目录必须通过绝对路径配置。
- 添加临时目录单测，覆盖日/月末窗口、dry-run/apply、损坏归档、非托管目录及相对路径拒绝。

## 验证

- `pnpm test:backup-retention`：2/2通过。
- `pnpm test:ops`：84/84通过。
- `pnpm contracts:generate`：31个Schema生成完成。
- `pnpm baseline:check`：Markdown本地链接556/556、JSON 57个/Schema 32个/Fixture 19个、契约兼容规则21项、OpenAPI 3份均通过；生成类型无漂移。
- `git diff --check`：通过。

## 边界与未完成项

当前已具备配对备份生产器和隔离恢复验证；周期调度、独立备份介质配置、活动数据库与Artifact卷恢复、RPO/RTO测量和灾难恢复演练仍缺。因此P3.R备份与恢复仍为部分完成，OD-003保持PARTIAL，发布所需恢复证据仍NOT_RUN。

## Paired backup producer and isolated restore (2026-09-25)

Added `pnpm backup:create` with two required safety boundaries: an absolute, pre-existing real backup directory and an explicit per-invocation `--confirm-writes-quiesced=<database>/<artifact-volume>` argument after stopping database writers and Artifact publishers. The confirmation is bound to the exact configured sources; a persistent shell environment variable cannot authorize a later backup. It resolves the configured helper image to a local immutable image ID and runs the Artifact volume exporter with network disabled, read-only root, read-only source volume, dropped capabilities, and no image pull. PostgreSQL dump is streamed to a new backup directory; volume archive and per-file inventory are captured next. The producer writes and fsyncs file contents and publishes `manifest.json` last as the commit marker. Incomplete captures lack a valid manifest and cannot enter retention deletion candidates. Daily vs month-end classification uses the UTC calendar; duplicate IDs and malformed output are rejected.

Both Docker export and `pg_dump` use a configurable bounded timeout (default four hours; SIGTERM then SIGKILL after ten seconds). The script itself has no scheduler and does not stop or start services; the operator-provided quiescence condition must be true for the selected database and volume before a run.

`pnpm test:paired-backup` passes 3/3; `pnpm test:backup-retention` passes 2/2; research service build passes. Final `pnpm --filter @stockquant/research-automation-service backup:paired-smoke` exited 0 on a dedicated `research_automation_test` database and a newly created random Artifact volume. Backup `paired-2026-09-25T10-52-18-906Z-015415bb` restored to random database `research_restore_7d024f03b5f64481a69c`; the exact PUBLISHED ArtifactRef and sourceRef were found, and restored Artifact bytes/hash matched `97630bfe3b6fa411ed90bf9be7b9651dfa4e3d7f120cc059975b6fa9f26ef7d9`. Follow-up read-only checks found 0 restore databases, 0 matching source test refs, and no test volume. No production database or Artifact volume was mounted or modified.

Remaining: no periodic scheduler or independent/off-host backup destination is configured. Restore was verified on isolated local Docker/PostgreSQL, not the active database/volume; production quiescence orchestration, backup window, RPO/RTO measurement, and disaster recovery rehearsal remain NOT_RUN. No production backup was created. Do not close P3.R, OD-003, or release recovery acceptance from this smoke.

## Restore-validation gate and final smoke (2026-09-25)

The manifest contract and retention validator now require `restoreValidation` with exact `PASS`, timestamp, checked PUBLISHED ArtifactRef count, and method `PG_RESTORE_AND_ARTIFACT_SHA256`. `backup:create` cannot commit the manifest until it restores the database into a random isolated database and verifies every published reference against the extracted Artifact files and their inventory/hash. A dedicated unit case proves that restore mismatch or self-asserted validation method leaves the directory ineligible. Generated TypeScript/Python contract types are refreshed; `pnpm baseline:check` passes (34 schemas, 22 contract fixtures, 23 compatibility rules).

Final smoke at 2026-09-25 11:02 UTC: backup `paired-2026-09-25T11-02-13-982Z-8ac61f85` restored from `research_automation_test` into `research_restore_ac16776c574a441e8f45`; one PUBLISHED ArtifactRef was checked and its file SHA matched `97630bfe3b6fa411ed90bf9be7b9651dfa4e3d7f120cc059975b6fa9f26ef7d9`. Read-only cleanup verification returned 0 for the restore database, 0 matching source refs, and no random test volume. No active application DB or Artifact volume was touched.

The earlier restore-pass claim is now enforced as a manifest eligibility condition. Still open: scheduler, independent/off-host copy, confirmed production quiescence process, active-volume recovery drill, and measured RPO/RTO. The local test does not establish those release gates.

## 2026-09-27 Ubuntu host scheduler template

Added `infra/backup/stockquant-paired-backup.timer` and `.service`, a daily 02:30 UTC timer (`Persistent=true`) that invokes `scripts/scheduled-paired-backup.mjs`. The wrapper requires exact database/Artifact-volume identities, an existing absolute backup/Compose path, executable absolute quiesce and resume hooks, and a dedicated lock directory. It takes an exclusive `0600` lock; a pre-existing lock fails closed and requires operator inspection. It invokes quiesce with the exact pair, starts `backup:create` only after successful quiescence and passes the required per-invocation confirmation, then attempts the idempotent resume hook after either capture success or failure. Resume failure is surfaced as an overall failure. SIGTERM/SIGINT terminate the active child and enter the resume path; a hard kill can leave a stale lock, which is intentionally never cleared automatically.

The service uses a dedicated host account and Docker-group membership to access the Docker daemon. Docker-group membership is host-administrator-equivalent and must be security-reviewed on the actual Ubuntu host. `infra/backup/README.md` documents hook guarantees, installation configuration, failure recovery and the exact remaining acceptance steps. No hook implementation is supplied because the target host topology and safe maintenance window are not known; the unit is not installed, enabled, or run against the active Mac stack. No backup was created or deleted.

Verification: `pnpm test:backup-scheduled` passes 6/6, covering exact target binding/order, failed-quiesce capture suppression with resume attempt, resume failure reporting, lock collision, path/hook validation, and a real child-process SIGTERM during quiescence that verifies capture is skipped, resume runs, the lock is removed, and the wrapper exits 143. Existing `pnpm test:backup-retention` passes 2/2. `systemd-analyze` is unavailable on this macOS host, so unit syntax and timer behavior remain NOT_RUN pending validation on the target Ubuntu release. This implements a deployable schedule template, not configured periodic backups, off-host copies, active-source recovery, measured RPO/RTO, or release acceptance; P3.R and OD-003 remain open.

## 2026-09-27 paired-backup CLI preflight regression

Added process-level tests proving `backup:create` exits before invoking Docker when the exact per-invocation writer/publisher quiescence argument is absent or targets the wrong database/Artifact volume, source identities are missing, or the configured backup root does not exist. A stale `STOCKQUANT_BACKUP_WRITES_QUIESCED=YES` environment value does not authorize a run. The nonexistent-root case initially exposed a raw `ENOENT`; the CLI now converts it to an actionable fail-closed configuration error. `pnpm test:paired-backup` passes 5/5, `pnpm test:backup-retention` passes 2/2, and `pnpm test:ops` passes 97/97; `git diff --check` passes. Tests use temporary directories and subprocess preflight only; no Docker command, backup, database, or Artifact volume was touched. This strengthens CLI safety only; it does not add scheduling, off-host copies, active restore evidence, or measured RPO/RTO.

## 2026-09-27 backup lock-directory hardening

Review of the host scheduler wrapper found the lock directory could be group- or world-writable; another local process could then remove an active lock and permit a concurrent backup. The wrapper now rejects such directories before creating the lock or invoking either quiescence hook. A dedicated test chmods the temporary lock directory to `0777` and asserts zero hook/capture calls and no lock creation. The systemd unit already creates its runtime lock directory with mode `0700`; the installation guide now documents the same invariant.

`pnpm test:backup-scheduled` passes 7/7, including the new unsafe-directory case; `node --check scripts/scheduled-paired-backup.mjs` and `git diff --check` pass. No systemd unit was installed or enabled, no active service was paused, and no backup was captured. Ubuntu `systemd-analyze verify`, hook implementation for the real host topology, off-host copy, production recovery, and RPO/RTO remain NOT_RUN; P3.R stays open.

## 2026-09-27 backup hook immutability hardening

A second review found that an executable quiesce/resume hook could still be modified by its owner or another writer after deployment. Hook validation now rejects any write permission bits; on Linux it also requires UID 0, matching the documented root-owned hook deployment. Unit fixtures use executable read-only hooks; the SIGTERM fixture only makes them writable during setup, then restores mode `0500` before invocation. A new test confirms a writable hook is rejected before lock creation or hook/capture execution.

`pnpm test:backup-scheduled` passes 8/8; Node syntax check and `git diff --check` pass. This verifies wrapper-side metadata checks on macOS and Linux-specific UID logic by inspection; no Ubuntu host/systemd runtime was available for validating actual root-owned hook deployment. No backup or active service action occurred. P3.R remains open.

## 2026-09-27 retention deletion root confirmation

The retention tool was preview-first and required `--apply`, but that flag alone could delete expired archives under whichever `STOCKQUANT_BACKUP_DIR` happened to be inherited. Apply mode now also requires exactly one explicit absolute `--confirm-root` whose resolved lexical path equals the configured absolute backup root. Missing, relative or mismatched confirmation exits before scanning/deleting. Dry-run remains unchanged; per-archive restore-validation, full manifest/file rehash, safe-root containment and symlink checks still apply. The operations guide documents the exact invocation, and retention remains manually invoked rather than tied to systemd until backup location/policy deployment is approved.

`pnpm test:backup-retention` passes 2/2, including missing/wrong confirmation with the expired archive still intact before the exact-root apply, then successful deletion only after confirmation. `node --check scripts/backup-retention.mjs`, `pnpm docs:check` (848 Markdown links), and `git diff --check` pass. No repository or production backup directory was pruned. This does not configure automated retention, off-host copies, active restore or measured RPO/RTO; P3.R remains partial.

The documented package entry was also exercised end-to-end against a fresh empty `/tmp` directory: `STOCKQUANT_BACKUP_DIR=<temp> pnpm backup:retention:apply -- --confirm-root=<temp>` returned `mode=APPLY`, 0 eligible/expired/removed, then the exact temp directory was removed. This confirms pnpm forwards the confirmation argument as documented; it is not evidence of production pruning.


## 2026-09-27 retention root and pre-delete revalidation

A follow-up safety review tightened the retention root itself: group/world-writable roots are rejected before candidate scanning. In apply mode each candidate is also re-inspected immediately before deletion, including the restore-validation claim, every declared file size/hash, actual file inventory, root containment and whether the backup is still expired under the same policy. This closes the gap where a verified candidate could be modified after initial selection but before its turn in the deletion loop.

`pnpm test:backup-retention` passes 3/3, including the unsafe-root rejection with its contents left intact; the valid expired backup remains intact after missing/wrong confirmation and is removed only after exact confirmation. Node syntax check, docs links (850), and diff check pass. Production backups remain untouched. No automatic retention schedule, off-host copy, active recovery, or measured RPO/RTO has been enabled.

## Ubuntu 24.04 systemd 单元静态验证（2026-09-27）

通过一次性 Ubuntu 24.04 `linux/amd64` 容器运行真实 `systemd-analyze verify stockquant-paired-backup.service stockquant-paired-backup.timer`及`systemd-analyze calendar "*-*-* 02:30:00 UTC"`，两条均退出0；timer规范化为每天02:30 UTC。容器宿主Docker为Linux/aarch64，故这是AMD64仿真中的Ubuntu userspace静态校验，不是原生Ubuntu主机或运行systemd的证据。为使verify仅检查单元语法与依赖解析，容器临时提供了`docker.service` verifier stub及空的`/usr/bin/node`可执行路径；它们没有启动服务或执行备份。Unit文件只读挂载；容器退出即删除。普通Ubuntu基础镜像没有systemd工具/CA；改用HTTPS并通过只读宿主CA bundle验证后才安装校验包，未关闭TLS校验。当前工作树`pnpm test:backup-scheduled`8/8及`pnpm test:backup-retention`3/3通过。此证据提升为“Ubuntu 24.04模拟userspace unit语法与日历PASS”；真实目标主机上的用户/组、Docker组、路径/权限、真实Node脚本运行、timer安装启用、周期备份、异地副本、活动恢复与RPO/RTO仍NOT_RUN，P3.R及OD-003保持PARTIAL。

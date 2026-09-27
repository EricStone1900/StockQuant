# P3.R Artifact / 身份边界审计（源码审查）

日期：2026-09-25。范围为研究服务当前工作树源码、Compose配置及已存在的V3.1准备证据；本记录不是新的数据库/HTTP/Web实测。

## 已实现

- `FileArtifactStore` 验证内容SHA-256、拒绝不安全路径、禁止覆盖同路径不同内容，并支持内部 `read(ref)`。
- `PgArtifactRefRepository` 持久化schema版本、namespace、artifactId、类型、Hash、状态和sourceRef；项目 Compose 将文件根目录挂载到命名卷 `research-artifacts-v1`。
- 发布HTTP入口限制请求体解码后的Artifact大小≤8 MiB，并在数据库可用时写入引用记录。2026-09-24准备证据记录了隔离发布、Hash和重启后查询测试。

## 仍缺 / 未验证

- 独立Artifact读取API现已实现：平台服务身份可读取指定namespace内已发布引用，先检查8 MiB上限、再校验Hash；Runner Host无读取权限。后续HTTP验证见下文。
- P7.2已为研究服务 `/v1/` 路由加入按调用方的Bearer认证和最小route scope；owner/run级用户访问通过平台StageRun owner过滤及精确TestRun/RunnerJob/namespace核对实施。
- 活动卷只读快照/恢复副本现已做一次实测，见下文；周期调度、保留策略和活动数据库与卷的一致性备份仍未验证。
- （已在后续代码修复中关闭）原幂等 upsert 允许同一 `(namespace,artifactId)` 的Hash/sourceRef被改写；对象文件写入本身拒绝不同内容覆盖，可能导致元数据与对象不一致。

## 结论

OD-003保持PARTIAL：Artifact存储、受限读取、Hash校验、服务身份和平台owner/run授权均有实现；活动卷已通过一次只读快照恢复及DB引用Hash核对，但周期备份/保留和活动PG数据库配对一致性流程仍未完成。不得把P3阶段其它服务的owner隔离证据外推至V3.1研究服务。历史TestRun迁移另由P3.2/P3.3记录逐版本核实，当前不合成无法恢复的历史运行事实。

## 2026-09-25 isolated paired backup/restore smoke

Added `pnpm --filter @stockquant/research-automation-service artifact:backup-restore-smoke`. It inserts one uniquely named test ArtifactRef and matching content into a private temporary artifact root, creates a PostgreSQL custom-format dump of the dedicated `research_automation_test` database, restores it into a newly created uniquely named temporary database, and copies the private artifact tree to a separate restore root. It then reads the restored reference and file and verifies PUBLISHED state, sourceRef, exact bytes and SHA-256. Cleanup deletes only the exact inserted source row, drops only the generated restore database, and removes both temporary file roots. The active named Artifact volume is not mounted or touched.

Verification: research service build exit 0; unit tests 76/76; isolated PostgreSQL integration tests 7/7; final backup/restore smoke exit 0. Temporary restore database `research_restore_ee7071cf18c64cf6bd6c`; dump size 11,787 bytes; test artifact 52 bytes; SHA-256 `6f010ec44ea357c84c157938fc68f87bbcec501320a7ed4c2f1bc9eb1e213feb`. The smoke verified the generated restore database no longer exists and the exact source ArtifactRef row was removed. Two initial harness runs failed before backup because the Compose plugin was hidden by a temporary HOME and then because the filtered pnpm working directory was mistaken for repository root; both were fixed, and their cleanup completed. This verifies paired consistency in an isolated database and filesystem copy. It does not verify backup scheduling/retention, the active named volume, production-sized restore duration, Ubuntu storage, or historical TestRun migration. OD-003 and P3.R remain PARTIAL.

## 2026-09-25 owner/run Artifact HTTP authorization

Added `GET /api/v1/acceptance/v3/v3.1/runs/:testRunId/artifacts/:artifactId`. The platform session resolves the owner-scoped V3.1 TestRun, checks that the requested immutable published ref appears as that run's input or in its exact RunnerJob output namespace, verifies the live job identity from research service, then reads the Artifact using the platform service Bearer identity. Research service auth now grants platform identity read-only `GET /v1/runner/jobs/:jobId` metadata scope needed by that check; mutation endpoints remain forbidden under GET. Unit suites: platform 40/40 and research 76/76. `pnpm --filter @stockquant/platform-api-service v31:artifact-owner-scope-http-smoke` passed against dedicated `platform_api_test` and `research_automation_test`: owner read 200 with exact content, missing identity 401, foreign owner 403, unlisted Artifact 404, exact test rows removed, active services untouched. This is service-level API evidence; browser rendering/session acceptance and deployment remain pending.

The V3.1 preparation page now exposes the published input's hash and a same-TestRun read/download action. `pnpm --filter @stockquant/web typecheck` passed; the targeted isolated Playwright test passed (1/1) against a temporary loopback Vite server with controlled API responses. `RESEARCH_AUTOMATION_DATABASE_URL=postgresql://research_automation@127.0.0.1:5433/research_automation_test pnpm verify:stage -- --stage V3.1 --suite code` passed after correcting the stage runner to call the research service's existing `lint` script (it has no `typecheck` script): contracts 28 schemas/16 fixtures/17 compatibility rules, research 76 unit/7 isolated PostgreSQL tests, platform 40 unit tests, and Web typecheck. UI verification does not prove active backend/session integration or human acceptance.

## 后续代码修复

本次源码审计发现数据库 upsert 允许相同 ArtifactRef 主键被改写为不同 Hash/sourceRef，可能造成引用元数据与对象文件不一致。已收紧 `PgArtifactRefRepository.save`：只允许同一身份更新状态；schemaVersion/kind/hash/sourceRef任一变化均返回明确冲突，调用方应换新 artifactId。新增隔离PostgreSQL集成断言覆盖Hash和sourceRef变更拒绝。

早期验证记录：research-automation-service 单元测试33/33和类型检查通过；当时PG集成因未配置隔离库URL而SKIP。后续已创建独立`research_automation_test`并由环境变量守卫拒绝正式数据库连接；不可变Artifact引用与Runner租约PG用例在该隔离库实测通过（P7.2记录）。2026-09-25容器HTTP读取smoke对既有V3.1输入Artifact返回200、59字节、SHA-256匹配；仅读取，不创建/改变领域记录。


## 契约Fixture验证补强

新增P5.4/P5.5契约Fixture时发现通用 `contracts:check` 只检查文件JSON语法，并不会发现 `packages/contracts/fixtures` 中带有 `$schema` 的实例。已修复验证器：将 `$schema` 作为验证元数据移除后按相对Schema校验实例，并在失败时显示实例级校验错误。当前合同检查实测覆盖12个Fixture，全部通过。

## 2026-09-25 Artifact read API follow-up

新增`POST /v1/artifacts/read`，由独立平台Bearer身份访问；只接受namespace和artifactId，不接受文件路径。仅PUBLISHED元数据可读，服务端先stat拒绝超过8 MiB的文件，再从managed artifact root读取并核SHA-256，内容以base64返回。Runner Host身份无此route scope。研究服务类型检查、41项单测、Markdown链接检查及容器HTTP读取smoke通过。命名卷/PG备份恢复仍NOT_RUN。

## 2026-09-25 active named-volume read-only snapshot and restore

Added `pnpm --filter @stockquant/research-automation-service artifact:volume-backup-restore-smoke`. It mounts only the exact Compose volume `stockquant-v12_research-artifacts-v1` read-only in the locally cached `node:24.1.0-slim` image with networking disabled, dropped capabilities, read-only container root and no-new-privileges. The helper writes a tar and source file/hash manifest to a private temporary directory, extracts to a second temporary directory after rejecting unsafe paths, compares every relative path/size/SHA-256, then removes all temporary files. PASS: 28 files, 1,646 bytes, archive 112,640 bytes, archive SHA-256 `fa293e63199e51da354d5a647764a1482d7ee83190b2790c8c8b20bca7fb8008`, source/restore manifest SHA-256 `71c37d57359ba872dc56697b07210eb2a6db83ca540e502501d2201e2ef2627b`; volume was not written and active services were not restarted. A separate read-only database query piped metadata inside the active research container and confirmed all 23 PUBLISHED ArtifactRefs have files with matching SHA-256 (0 missing, 0 mismatches); names, hashes and content were not printed. This is one manual snapshot/restore integrity run against the current low-volume deployment. It does not configure schedule/retention, test production-sized restore time, or atomically back up the active PostgreSQL reference DB with the volume.

## 2026-09-27 current-worktree paired backup/restore revalidation

Ran `pnpm --filter @stockquant/research-automation-service backup:paired-smoke` against the exact dedicated source database `research_automation_test` and a random disposable Artifact volume. The producer quiescence guard passed with zero other source DB connections; it generated backup `paired-2026-09-27T06-53-36-701Z-1de31488`, restored PostgreSQL into `research_restore_12c8fd2fcd384119b7f1`, and restored the paired three-file Artifact volume. The PUBLISHED ArtifactRef/sourceRef and bytes matched SHA-256 `97630bfe3b6fa411ed90bf9be7b9651dfa4e3d7f120cc059975b6fa9f26ef7d9`.

Cleanup was independently verified: the random restore DB count is zero, no source `research_artifact_refs` row remains for `source_ref='paired-backup-producer-smoke'`, and the temporary Docker volume is absent. Compose inspection after the smoke showed PostgreSQL still healthy and Research Automation still running/healthy; neither active service was restarted. PASS proves current isolated paired restore integrity only; scheduled backups, off-host copies, production write-pause coordination, active-volume/DB atomicity, RPO/RTO, and Ubuntu recovery remain unverified, so OD-003/P3.R stays PARTIAL.

Immediately afterward, reran the read-only active-volume snapshot/restore check and compared every PUBLISHED DB reference to the live Artifact volume inside the existing Research Automation container using a PostgreSQL `READ ONLY` transaction. Snapshot verified 33 files / 1,945 bytes, archive SHA-256 `ec8959e61f516cedd5eeb4f722eaef5e3010486adbab8b30237b302e35b9d196`; database check verified 28 PUBLISHED refs, 0 missing files, 0 Hash mismatches. The volume helper reports `activeVolumeWritten=false` and `activeServicesRestarted=false`. This verifies current low-volume byte consistency, not a concurrent atomic backup boundary or recovery objective.

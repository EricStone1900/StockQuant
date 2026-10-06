# W8 现有部署维护与回退审阅包

状态：**PREPARED / NOT AUTHORIZED / NOT EXECUTED**。用途：将 V3.4/V2.4 工作树变更与现有 PostgreSQL SCRAM 迁移要求整理为一次可审阅的维护边界。它不是维护许可。用户当前确认 `NO_TRADE` 且无新增 W3 行情源授权；不能启用 V2.4 Paper、策略、行情源或 Ubuntu 发布。活动服务进程、数据库结构/业务账本和卷保持原状；唯一DC-08A订阅已按无授权决定单独停用，见[暂停审计](../../evidence/audits/2026-09-30-w3-no-source-pause.json)。

## 1. 维护前只读基线

最近复核时间：2026-09-30 08:36Z（Asia/Shanghai）。`docker ps`确认13个 `stockquant-v12-*` 容器仍运行；Market Data、PostgreSQL及其他依赖显示healthy，Platform API 显示unhealthy。Platform `GET /ready` 返回503通用 `required dependency is unavailable`；不得假设当前工作树/新 Compose 配置已部署，也不得假设重启即可恢复。相关原始只读复核见[W8构建审计](../../evidence/audits/2026-09-30-w8-amd64-image-build.md)、[W3停采样审计](../../evidence/audits/2026-09-30-w3-live-paper-stop.md)及[O1健康审计](../../evidence/audits/2026-09-30-o1-live-health-check.md)。

当前关键对象：

| 对象 | 现状 | 维护边界 |
|---|---|---|
| PostgreSQL | `stockquant-v12-postgres-1`，image ID `sha256:9e9764474d0c70ceff17378a6eca55b00c98d2f4d564be06a8e82f2431b3caa2` | 唯一活动数据目录卷 `stockquant-v12_postgres-v11:/var/lib/postgresql/data`；现有 trust 目录不受 init SQL 自动迁移；严禁删除/重建 |
| Platform API | `stockquant-v12-platform-api-service-1`，image ID `sha256:2d3b6d1c18fd2b190adbad5491ca00e8c09fdc0a87f682f5e96857ef3ad05709`，Up/unhealthy | 需替换服务身份/配置并安全部署；部署后先验证 `/ready`，Paper scheduler 必须为 STOPPED |
| Market Data | `stockquant-v12-market-data-service-1`，image ID `sha256:91c0a1690305167210705da98ef44c65caf87c6ea95efd088de33105191e83d5`，Up/healthy | Market Data进程保留运行；无来源授权期间唯一DC-08A订阅保持`enabled=false`、无下一触发及无提交任务。取得授权后才可显式重新启用；备份维护时仍需另行暂停写入并记录观察中断 |
| Web | `stockquant-v12-web-1`，image ID `sha256:af081c98a0b870bcef46f2946fd328c9abaa06f2fe141e25efccb83600873f37` | 只部署已冻结工作树对应镜像；验证真实登录会话和页面；不把旧人工签署移植到新范围 |

活动持久卷全量只读清单：

| 命名卷 | 挂载服务/路径 | 处理方式 |
|---|---|---|
| `stockquant-v12_postgres-v11` | PostgreSQL `/var/lib/postgresql/data` | 和 Research Artifact 做配对备份/恢复校验；原卷绝不删除或覆盖 |
| `stockquant-v12_research-artifacts-v1` | Research Automation `/var/lib/stockquant/research-artifacts` | 与 PostgreSQL ArtifactRef 同一配对；逐文件SHA-256及引用匹配 |
| `stockquant-v12_market-data-health` | Market Data `/var/lib/stockquant` | 保留；不由配对备份工具清理或重建 |
| `stockquant-v12_temporal-dev-state-v1` | Temporal `/home/temporal` | 保留；不重置或删除 |
| `stockquant-v12_nats-jetstream-v1` | NATS `/data/jetstream` | 保留；不重置或删除 |

W1 shared Artifact content update (2026-10-01): the current source Compose configuration mounts `research-artifacts-v1` in both Platform API and Research Automation, while the last active-container inventory above predates this change and lists only Research Automation. No active Compose rollout was performed. Before any future paired backup, inspect actual container mount sources and quiesce every service with read/write access to this named volume; after the updated Compose is deployed, this includes both `platform-api-service` (Qlib content) and `research-automation-service` (research content). If the exact writer/mount set cannot be proved or any writer cannot be paused, stop the backup operation. The isolated restore verifier now checks new SHA-layered Research paths, legacy Research paths, and external Qlib references in `platform_api`; its mixed-layout end-to-end recovery passed in a no-network temporary PostgreSQL project. See [W1 shared content audit](../../evidence/audits/2026-10-01-w1-common-artifact-content-store.md).

其他 8 个应用容器、Temporal、NATS、Qlib Worker 均保持当前运行；只按审核过的 Compose service 名单逐个重建受影响应用容器，不执行全栈 `down`、`down -v` 或 volume prune。完整凭据及备份细则见[PostgreSQL SCRAM迁移Runbook](./postgres-scram-migration.md)。

### Ubuntu目标主机只读预检

运行 `node scripts/w8-ubuntu-host-preflight.mjs` 可记录本机OS发行版、CPU架构/逻辑核、内存、当前路径可用磁盘及本地Unix-socket Docker daemon版本/平台。它拒绝非本地Docker endpoint，不联系镜像仓库，不读取凭据，不启停容器、不写数据库或卷。输出`INVENTORY_ONLY`仅表示Ubuntu x86_64和本地Linux Docker基础信息可采集；仍不能视作release-ready，因为资源下限、目标主机授权、网络/存储、备份与维护审批须单独确定。目标规格未冻结时任何资源数字只作采集值，不自行推导PASS阈值。退出码0=`INVENTORY_ONLY`、2=`BLOCKED`、1=采集失败。

当前Codex宿主上的默认沙箱运行因Docker Desktop Unix socket不可访问而`BLOCKED`；经受控只读权限重跑，Docker daemon报告Linux/aarch64、Docker Desktop、Engine 28.0.4、cgroup v2、overlay2、10 CPU及约7.66 GiB daemon内存。宿主本身仍为macOS/aarch64，运行结果`BLOCKED`且`linuxContainerRuntimeMatchesTarget=FAIL`；这不是Ubuntu x86_64证据，也没有连接远程daemon或触碰容器。单测覆盖Ubuntu x86_64仅返回`INVENTORY_ONLY`（不是就绪）、macOS/ARM/非Ubuntu及不可用/架构不符Docker均BLOCKED，并断言远程TCP Docker endpoint拒绝，4/4通过。脚本与审计见[Ubuntu主机预检审计](../../evidence/audits/2026-10-03-w8-ubuntu-host-preflight.md)、机器结果及[SHA-256 Manifest](../../evidence/audits/2026-10-03-w8-ubuntu-host-preflight.sha256)。

## 2. 必须满足的放行门禁

1. 明确维护负责人、开始/结束时间、通知范围、批准的备份目录/异地副本和回退责任人。以上字段当前未确认，维护不得开始。
2. 记录所有活动 Paper/collection scheduler 状态、未完成 TestRun、订单/UNKNOWN状态、未结 Fill/Reservation、Outbox、Artifacts发布者和 Runner Job。任何未决业务状态都先停在这里，不能靠重启解决。
3. DC-08A在无来源授权决定后已停用唯一正式订阅（版本425→426）；复核确认该订阅`enabled=false`、无下一次执行、`lastSubmitted=0`，Market Data worker进程仍为`ENABLED`。O1归档保持8/20，暂无授权期间不累计观察日。相关暂停审计及跨调度周期复核见[暂停审计](../../evidence/audits/2026-09-30-w3-no-source-pause.json)、[暂停后健康快照](../../evidence/audits/2026-09-30-o1-health-after-no-source-pause.json)和[无任务后续复核](../../evidence/audits/2026-09-30-o1-no-source-pause-followup.json)。备份维护前仍须按门禁精确暂停所有实际写者并核实无未决写入；若未来取得授权，只可在明确批准后恢复既有DC-08A配置，不能打开新的来源、V2.4行情或Paper路径。
4. **旧单库备份CLI已禁用；正式集群备份仍未运行。** 活动PostgreSQL有48个数据库（9个服务库、5个测试库和34个隔离/历史库）；新 `pnpm backup:create` 使用 `cluster.v2`，由 `pg_dumpall --no-role-passwords` 导出完整数据库/无密码全局角色定义，并前后核对数据库/角色清单。Artifact卷作为配对部分归档。隔离E2E已在随机临时Compose项目上PASS（2库、1角色、1个发布ArtifactRef）；恢复容器`network=none`、无Compose标签/端口/卷，仅临时tmpfs，恢复后核对数据库/角色、全部Artifact文件Hash及发布引用。它没有读取/备份活动48库，不能证明真实活动备份、异地副本、保留期限或RPO/RTO。正式维护前仍须落实写入/Artifact publisher暂停、批准目录/异地介质、维护窗口与责任人；其后才可运行新工具并验证全部48库。
5. 冻结最终源码/worktree hash、所有将部署的服务镜像完整digest、Compose配置Hash、数据库模式、当前 `pg_hba.conf` Hash、备份Manifest Hash、服务Bearer secret reference（不记秘密值）及逐容器重建名单。现有AMD64候选镜像是在Mac M1模拟构建、没有签名/registry provenance；它们不能作为Ubuntu交付镜像。
6. 从批准的secret store配置并核对所有PostgreSQL及服务Bearer引用；当前 `.env.local` 中10个独立PostgreSQL凭据仅准备态，尚未应用到活动角色。禁止把值放进命令参数、shell history、日志或本文件。
7. 候选 Platform 必须 `/ready` 200、所有 service Bearer caller/verifier 匹配、独立DB连接验证成功、V2.4 AUTO_START=false/source approval=false/authorization reference与data version为空、authenticated scheduler STOPPED。活动Paper账户/Mandate/订单不得创建。

## 3. 建议执行顺序（仅获批维护窗口使用）

1. 保存本表的维护前检查及当前五个卷名；以只读 API 查询并存档 Scheduler/collection/Outbox 状态和领域待处理计数。任何状态不清晰立即取消维护。
2. 暂停所有会写 PostgreSQL 或发布Artifact的活动worker；逐个复核实际 Compose Mounts，显式暂停当前挂载`research-artifacts-v1`的 Research Automation，并在共享内容卷候选已部署时同时暂停 Platform API；核对无其他写者、没有RUNNING/UNKNOWN/排队写操作。暂停既有 DC-08A 收集写入。不要暂停或删除支撑服务卷。
3. 使用通过隔离合成E2E测试的 `pnpm backup:create` 创建集群DB+Artifact配对备份并恢复校验。备份操作必须在所有写者/Artifact publisher已停且负责人、介质/目录与窗口明确后进行；在正式备份前/后保存完整数据库名及角色属性清单，复核无缺项。恢复只可在当前cluster.v2实现的独立临时PostgreSQL容器与Artifact目录执行；不得对正式集群/卷创建测试库、恢复或覆盖。真实48库活动备份尚未执行。
4. 使用PostgreSQL local admin socket以 `\password role` 为九个既有角色设置独立密码；核对仅SCRAM分类、不输出散列。原有Host trust规则暂时保留。
5. 仅以已固定image digest重建对应应用服务，让各自新DSN先在旧trust规则下连通。拟受影响服务：`portfolio-risk-service`、`platform-api-service`、`trade-execution-service`、`decision-governance-service`、`historical-replay-worker`、`market-data-service`、`quant-research-service`、`research-automation-service`、`web`；逐项确认精确镜像、服务Bearer及健康状态。不要重建PostgreSQL、Temporal、NATS或未变更服务。
6. 按Runbook收紧 `pg_hba.conf` 至SCRAM，保留本地管理员规则；核对首匹配规则，再用每个独立身份做正确密码、缺密码、错误密码TCP验证。健康检查与所有依赖连接通过后才允许恢复先前暂停的writer。
7. 逐项回读账本、持仓、Reservation、订单/Fill、collection lease/outbox及Artifact引用，对比维护前的配对快照。调度器依次恢复并确认唯一订阅；V2.4 Paper继续STOPPED。若collection没有先前授权或数据版本变化，不恢复行情写入并将O1标为WAITING。
8. 保存维护起止、命令与退出码、每个image digest、验证SQL断言（不含凭据）、健康/资源输出、业务前后差异、备份/恢复Manifest与失败回退记录。

上述是执行步骤设计，不是现在可直接复制运行的release命令。当前活动Platform unhealthy、正式volume仍为trust、备份目录/异地介质与维护时段未确定；在这些条件满足并由项目所有者明确批准前不应运行迁移。

## 4. 停止条件与回退

- 备份或任意Artifact hash失败、volume/container/project身份不符、存在活动/UNKNOWN写操作、任何服务Ready失败、密码拒绝矩阵失败、`pg_hba_file_rules`顺序不符、数据库/ArtifactRef账本不一致：立即停止，保持writer暂停。
- Host auth失败可恢复原先精确备份的 `pg_hba.conf` 并 reload，验证服务按原规则恢复；不得用 `down -v`、重新初始化、删除正式卷或把隔离备份覆盖到现有数据目录。
- 新镜像/配置不健康时仅可按审定的前一image digest与DSN配置回退。回退会回到已知 Platform `/ready` 不健康的状态，不得记录成恢复完成；此时保持Paper/策略关闭并按Runbook升级处置。
- 数据有差异时先在全新隔离project恢复配对快照、比较并查明，不清理证据或反复重试直到PASS。
- O1/O2与Ubuntu观察分别按实际交易日和部署后规则重新计数；本次维护或本机AMD64构建不能抵扣长期观察。真实Ubuntu部署、V3.4业务TestRun、5个交易日观察及人工验收继续单独未完成。

## 5. 当前结论

本审阅包仅把已知对象、边界和操作条件整理为可审查材料；新增集群级实现与随机隔离E2E已通过。本次没有备份活动48库、没有暂停Artifact publisher、没有修改Bearer/DB角色/`pg_hba.conf`、没有重建活动容器、没有触及活动卷或交易业务账本。唯一DC-08A订阅因无来源授权已停用，且跨一个调度周期复核仍为无任务提交；见[后续复核](../../evidence/audits/2026-09-30-o1-no-source-pause-followup.json)。正式备份介质/目录、写入暂停窗口与维护责任人未落实，真实活动恢复/RPO/RTO、Ubuntu迁移及W9发布门禁仍未通过。最新隔离备份逐文件Hash及临时资源/活动容器清理复核见[2026-10-03 W8备份Hash审计](../../evidence/audits/2026-10-03-w8-paired-backup-file-hashes.md)与[机器报告](../../evidence/audits/2026-10-03-w8-paired-backup-file-hashes.json)。

### 当前 V3.2 Platform/Web 镜像补充（2026-09-30）

在Mac M1上从当前工作树构建了 `linux/amd64` Platform API和Web镜像，并以`network=none`、只读根、非root、临时`/tmp`、drop ALL capabilities、no-new-privileges和64 PID限制做静态镜像边界探针。两镜像构建和探针均通过；镜像ID及范围见[W8 V3.2 current images](../../evidence/audits/2026-09-30-w8-v32-current-images.md)及[Hash Manifest](../../evidence/audits/2026-09-30-w8-v32-current-images.sha256)。它们只是本地审计镜像，不是Ubuntu兼容或发布验证；未启动完整服务/Compose、未推送镜像、未访问数据库或改变活动服务。

另新增`pnpm verify:w8:v32-readiness`，并接入V3.2代码套件。该检查实际启动Platform HTTP服务和固定摘要PostgreSQL：随机`--internal`网络、数据库仅tmpfs、Platform只读根文件系统/无特权；覆盖就绪失败关闭、TestRun创建与owner权限、Platform重启后PG持久性。完整证据与TestRun ID见[W6容器运行时扩展审计](../../evidence/audits/2026-09-30-w6-readiness-testrun.md)。此Mac上验证了当前`linux/amd64`容器运行行为；Ubuntu验证仍未完成，且V3.2用户业务验收仍为NOT_RUN。

清理复核：成功套件运行后检查发现早期失败迭代遗留一个已退出的随机Platform容器与对应唯一临时镜像；核对名称/状态后仅移除这两个烟测资源，二次清单确认无`sq-v32`容器/网络和`stockquant-v32-readiness-smoke`镜像。未触碰任何`stockquant-v12-*`活动容器或卷；详见W6运行时审计。

### V3.1 Runner与Web/研究服务隔离边界复验（2026-09-30）

当前本地Runner候选为`stockquant-v31-runner:rd-agent-v0.8.0-qlib-3e72593-full-deps`，本轮AMD64镜像ID `sha256:eb9030b8107c79c3554dabc68322814b81c04564bb0a1e5a9841bd603a67ccf1`；固定离线隔离Runner六场景通过。W8当前工作树Web与Research Automation候选容器均验证无Docker Socket、无非空凭据环境；证据及历史默认镜像失败见[Runner/容器边界审计](../../evidence/audits/2026-09-30-w8-runner-container-boundary.md)和[SHA-256 Manifest](../../evidence/audits/2026-09-30-w8-runner-container-boundary.sha256)。这些是Mac上的AMD64仿真审计镜像，不作为Ubuntu发布镜像，也未部署到活动服务；OD-004活动Bearer配置/轮换、维护窗口、备份/恢复及正式迁移仍未批准/执行。

候选服务身份凭据准备（2026-09-30）：只读盘点发现原`.env.local`少4个服务身份Token；`pnpm prepare:w8:service-bearers`在权限0600文件中仅补齐缺失的4个独立随机值，保持既有4值不变，`pnpm verify:w8:service-bearers`及3项脚本测试通过。只输出变量名/状态，具体值留在被忽略的本机文件中；没有将候选凭据注入容器、核验活动会话或旋转现有活动token。证据见[本地Bearer准备审计](../../evidence/audits/2026-09-30-w8-service-bearer-preparation.md)及[SHA-256 Manifest](../../evidence/audits/2026-09-30-w8-service-bearer-preparation.sha256)。

该切片的具体服务依赖、既有TestRun表兼容性、发布门禁及回退条件另见[V3.2发布审阅包](./2026-09-30-v32-readiness-release-review.md)和[Hash Manifest](../../evidence/audits/2026-09-30-w8-v32-release-review.sha256)。

其余未发布版本切片的服务影响范围、当前内联DDL调用点、建议依赖顺序、开放/UNKNOWN订单与追加证据处理、逐服务放行和回退标准见[W8未发布切片迁移与回退审阅](./2026-09-30-w8-unreleased-slices-review.md)。该清单处于PREPARED状态，尚未与活动数据库schema逐项对账，不构成部署批准。

### Market Data 来源门禁候选镜像补充（2026-10-01）

当前工作树已构建并通过真实隔离PostgreSQL运行态烟测的候选为`stockquant-market-data:source-gates-20261001`，image ID `sha256:d8d368a1ca020e1bb0edd3eb5984214a2bb929ccd81ab0188189a555f24e8043`，平台`linux/arm64`。独立临时数据库使用锁版`postgres:16.9-alpine@sha256:7c688148e5e156d0e86df7ba8ae5a05a2386aaec1e2ad8e6d11bdf10504b1fb7`；Docker internal network、tmpfs数据目录和精确清理均由烟测创建/验证。调度worker开启、来源用途授权全部关闭时，服务报告POSTGRES持久化和worker ENABLED，但executor DISABLED；quote/news/sourceSmoke为403且Provider请求计数为0。细节见[PostgreSQL联合运行态审计](../../evidence/audits/2026-10-01-w8-market-data-source-gate-postgres-runtime.md)及其[SHA-256](../../evidence/audits/2026-10-01-w8-market-data-source-gate-postgres-runtime.sha256)。

可复验的候选构建/验证命令：`docker buildx build --platform linux/arm64 --load -t stockquant-market-data:source-gates-20261001 -f services/market-data-service/Dockerfile .`，随后运行`pnpm market-data:source-gates:container-smoke`。本地候选尚无registry digest/signature，只能从当前工作树重建并比对上述image ID；它不是活动旧Market Data镜像的标识。此准备项不授权发布。活动服务旧镜像仍报告执行器能力ENABLED；12:00Z只读态为0启用订阅、无下次触发、无缺口/待投递。任何以后替换都必须重新核对活动镜像ID/配置和持久schema，完成获批的正式48库+Artifact配对备份及隔离恢复，明确维护/回退责任人，逐服务维护替换后确认POSTGRES、scheduler状态、executor DISABLED、来源NOT_AUTHORIZED、唯一订阅数0，再验证health和无来源请求。任何字段不符立即按已批准前一镜像/配置回退；当前这些前置条件未满足，仍为NOT_AUTHORIZED/NOT_EXECUTED。

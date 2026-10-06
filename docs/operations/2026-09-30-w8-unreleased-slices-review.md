# W8 未发布切片迁移与回退审阅

状态：**PREPARED / NOT AUTHORIZED / NOT DEPLOYED**。本审阅覆盖当前计划中尚未发布且会影响运行服务或持久数据的切片。它是迁移影响清单，不是发布批准。项目决定仍为 `NO_TRADE`、无新增数据源授权；不得据此启动采集、真实Paper、Provider调用或Ubuntu部署。

## 1. 当前范围与证据边界

源码与数据库初始化采用各服务启动时的内联 `CREATE TABLE IF NOT EXISTS`、`ALTER TABLE ... ADD COLUMN IF NOT EXISTS` 及约束替换；仓库目前没有统一 schema migration ledger，也没有可证明每个存量库当前schema版本的集中清单。因此下表是从当前工作树迁移调用点整理的受影响面，不可当作已在活动库验证过的迁移清单。所有候选镜像/摘要必须在最终冻结源码后重新构建并记录；旧审计摘要不自动对应最新工作树。

| 切片 / 范围 | 运行服务 | 持久化所有者与迁移影响（当前代码调用点） | 部署依赖 / 不可变事实 |
|---|---|---|---|
| V1.1 Stage TestRun 与跨服务客户端 | Platform API、Web、Trade Execution、Historical Replay Worker、Portfolio Risk、Decision Governance | Platform：`acceptance_stage_runs`、history、V1.1 acceptance；Portfolio：accounts/ledger/positions/fills/reservations及字段/检查约束；Trade：FakeBroker orders/fills/events/outbox及fingerprint/lease；Decision Governance：execution authorizations字段及状态约束；Replay：run及request hash | 先发布被调用方API/兼容契约，再发布生成客户端调用方；账户、账本、订单和填充事实不可重建/删除。对应SQL见各服务 `src/adapters/*repository.ts` 与 `src/main.ts` |
| V2.3 Replay / V2.5 导入和数据规模 | Historical Replay Worker、Market Data Service、Market Data Adapter、Quant Research Service、Platform API、Web | Replay run/checkpoint；Market Data gaps/backfill、collection runs/artifacts/outbox/schedule leases、分钟导入哈希/Manifest/分区行、上传块、project/queue、artifact/alert outbox；Quant Research候选/验证/registry表 | 先部署数据API及契约，再部署消费者；数据许可、Manifest和来源语义须先冻结。迁移可能含PK替换、NOT NULL和CHECK变更，不得笼统视作零风险纯加法 |
| V2.4 连续Paper只读准备与门禁 | Platform API、Web、Portfolio Risk、Trade Execution、Market Data Service | V2.4 scheduler/observation/day/run/finalization/revision表；共享Portfolio与FakeBroker表如上 | AUTO_START必须false，来源授权配置缺失；scheduler必须STOPPED。NO_TRADE下无行情读写、无Paper账户/订单。当前活动旧Platform曾不健康，不能作为健康回退目标 |
| V3.1 研究运行与费用证据 | Research Automation Service、Runner、Quant Research Service、Platform API、Web | Runner jobs及artifact/attempt/lease/fencing字段和状态约束；预算/Provider调用账本；experiment预算币种/TestRun；ArtifactRef；候选/Promotion/Registry；Platform acceptance | Controller与Runner镜像分别固定；默认网络隔离与凭据剥离；没有Provider授权时只跑Fixture/离线验证。UNKNOWN请求/费用必须查证原请求，禁止重放或释放预留 |
| V3.2 readiness / promotion 准备 | Platform API、Web、Research Automation、Quant Research | Platform既有 `acceptance_stage_runs` 追加WAITING readiness记录；Submission journal；Quant promotion/decision/registry表 | V3.2 readiness route可产生追加证据；不要把WAITING解释成业务PASS。禁止未经独立复算和用户精确版本批准写入注册表 |
| V3.3 队列/规模与V3.4 Ubuntu交付 | Platform API、Web、Research Automation、Runner、依赖服务 | Research job lease/队列指标及复用前述预算/Artifact/Acceptance表；不应假设Ubuntu已有兼容schema | 先完成V3.4正式前置和Ubuntu目标主机审查；Mac M1 AMD64模拟不等于Ubuntu实机证据 |
| PostgreSQL SCRAM / 服务Bearer | PostgreSQL、所有9个应用DB身份消费者、Web与各服务身份调用方 | 现有目录trust状态不会因init SQL变化；角色密码与`pg_hba.conf`为活动集群级变更，不属于普通应用schema迁移 | 按[SCRAM Runbook](./postgres-scram-migration.md)单独维护；正式集群配对备份和隔离恢复为绝对前置。当前本地`.env.local`候选秘密未应用，不等同凭据轮换 |

涉及SQL的主要调用点包括：Platform `postgres-stage-run-repository.ts`、`postgres-test-run-repository.ts`、`postgres-v24-observation-repository.ts`；Portfolio `postgres-account-repository.ts`；Trade `postgres-fake-broker-repository.ts`；Replay `main.ts`；Market Data `coverage-repository.ts`、`collection-run-repository.ts`、`minute-import-repository.ts`、`minute-upload-repository.ts`、`collection-schedule-repository.ts`及artifact/outbox repositories；Research Automation `pg-runner-job-store.ts`、`pg-budget-ledger.ts`、`pg-experiment-repository.ts`、`pg-v32-promotion-submission-journal.ts`；Quant Research `main.ts`；Decision Governance `main.ts`。最终实施前须重新审阅冻结commit中的每个实际迁移调用点、启动顺序和锁行为。

## 2. 发布依赖顺序与可加迁移规则

1. 冻结目标版本、工作树/源码Hash、契约兼容矩阵、每个服务镜像digest、Compose解析配置Hash、角色/服务secret引用名及迁移调用点。任何冻结后源码差异都要求重新构建、重审受影响表和更新验证证据。
2. 在活动环境只读盘点：服务/镜像/健康、数据库与角色清单、表/列/约束、运行中写者、scheduler/collection、TestRun、订单/Fill/Reservation、Trade与Market Data Outbox、UNKNOWN、Runner jobs/leases、Artifacts和published refs。无法解释的状态即停止。
3. 先完成正式配对备份和隔离恢复，覆盖活动集群所有数据库、全局角色定义与Research Artifact卷；比对前后对象清单、文件Hash和全部发布引用。批准的异地介质、维护时段和责任人缺一不可。当前隔离双库烟测不是活动48库备份。
4. 在支持兼容发布的切片中先添加新表/可空字段/兼容读取，再部署服务端兼容实现，再部署生成客户端/Web；在全量回读及观察通过前保留旧字段/读路径。约束收紧、主键替换、NOT NULL回填、auth策略变化须单独分批并测量锁时长；当前启动式迁移没有集中版本、自动锁超时/回滚治理，不能在生产直接一键执行。
5. 发布次序按依赖拓扑而非全栈重建：数据库拥有者/被调用API先于调用者；在完成每个切片健康、HTTP契约、持久化读回、权限隔离和副作用断言后再推进下一个。V1.1客户端链路需逐个确认Platform/Portfolio/Trade/Governance/Replay接口；研究路径需先有契约与Registry兼容能力，再接研究/Runner。
6. V2.4始终AUTO_START=false、授权缺省关闭且scheduler STOPPED；DC-08A在来源无授权状态保持禁用。迁移不允许悄悄启用任何writer。SCRAM与服务Bearer按独立凭据轮换步骤推进，不和业务schema变更混成一个不可分辨批次。

## 3. 交易、任务与追加证据处理

维护前后都要存有经过权限审查的计数与脱敏状态清单。若存在开放/未知订单，只能用原订单ID查询FakeBroker事实；UNKNOWN时不重发订单、不释放资源、不推断失败。任何未完成Fill、Reservation、资产/账本差异或Outbox `PENDING/DELIVERING/COMPENSATION_REQUIRED` 均阻止维护切换；按原幂等键完成核对和修复，并保留事件序列。

Collection/Market Data与Temporal/NATS消息先确认生产者、消费者、lease和outbox已稳定停止，保留gap、revision、Manifest及失败历史。Runner的RUNNING/租约过期任务先按fencing token和原attempt查明；不得因重启自动复制模型请求、结算费用或覆盖Artifact。V3.2/V1.1 acceptance/TestRun为追加证据，发布回退时保留行及历史，不能DELETE/重建以伪造干净状态。回退后对前后行计数、owner、status/assertions、订单/账本、任务与Artifact引用逐项比对。

## 4. 放行、验证和回退标准

**开始门禁**：负责人/回退负责人/窗口和写入暂停已明确；备份真实恢复验证通过；迁移清单与冻结digest一致；没有未决UNKNOWN/订单/Fill/Reservation/Outbox/Runner租约；V2.4来源和Paper开关仍关闭；每个DB schema和关键业务基线可回读。真实用户数据、授权或业务写入条件不满足时仅可做独立隔离测试，不可执行正式迁移。

**逐服务放行**：新服务健康、依赖连接和service Bearer成功；OpenAPI/生成客户端契约测试与目标阶段normal/rejection/recovery通过；相同Web `testRunId` 的只读CLI复核通过；账本/订单幂等和故障恢复断言通过；无越权跨owner读取、无非预期订单/行情/Provider调用、无数据或Artifact丢失。记录命令、退出码、容器/镜像、健康、DB前后Hash/计数、Web Trace与测试Run。脚本PASS、用户验收和自然观察分别记录。

**停止条件**：备份/Artifact Hash、数据库清单、角色、服务依赖、权限或健康任一不符；迁移超时/异常锁；任何账户、订单、Fill、Reservation、Outbox、UNKNOWN、任务attempt或Artifact引用不一致；阶段检查不是明确PASS；回退资源不可用。停止继续发布，保存完整日志和失败状态，不清理证据、不随机重试。

**回退**：优先回退应用镜像及兼容配置，使用冻结前的精确digest；追加的TestRun/事件/订单/Fill保留。扩展字段先保持兼容，不在应用回退时删除。只有已验证的正式配对备份及获批恢复步骤可用于数据恢复，绝不以 `down -v`、删卷、活动集群内临时恢复库或重新初始化来回退。若DDL为破坏性且新旧版本不兼容，必须停止并执行事先演练过的配对恢复方案；恢复完成前保持writer关闭。旧Platform当前已知unhealthy，回退到它不能记作恢复成功。

## 5. 当前结论与后续证据

此清单目前仍是源码迁移调用点级别的审阅材料，不包含活动库当前schema对账、48库正式配对备份、锁时长实测、具体维护窗口或目标Ubuntu验证；因而W8跨切片发布准备尚不可关闭。对每个实际选定切片，还需从冻结源码生成“服务/镜像/DDL逐项表”和执行前后的真实状态证据。本文件与W8总维护包互为补充；后者保留集群对象、备份介质、写入暂停与SCRAM操作细节。

本轮仅编辑本地文档；未连接活动数据库/服务，未调用行情或Provider，未部署/重启容器，未改变交易账本或调度状态。

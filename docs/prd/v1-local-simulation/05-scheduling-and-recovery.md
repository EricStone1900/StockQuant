> 当前V1收尾范围（2026-10-13）：所有者要求聚焦主要功能、减少非必要验证和停止扩散；当前执行以[V1主要功能完成计划](../../plans/2026-10-08-v1-completion-plan.md)及[范围决定](../../decisions/2026-10-13-v1-core-closeout-scope.md)为准。延期增强和广泛验证不阻塞本轮，旧任务/结果/签署保留为历史；核心正确性和人工验收不缩减。

> 当前范围决定（2026-10-13）：所有者已将Ubuntu实机部署/恢复/主机资源验收延期至后续Ubuntu部署验收，状态DEFERRED / NOT_RUN；它不再阻塞V1本轮开发及验收。Mac本地容器、目标架构烟测/缺口登记、其余业务/恢复和人工验收要求保留。旧记录中的Ubuntu缺口保留为历史事实，不代表当前V1阻塞。见[延期决定](../../decisions/2026-10-13-v1-ubuntu-deferral.md)。

# V1.5 无人逐笔操作、故障恢复与 V1 验收

状态：PASS（2026-10-14，已批准的Mac本地V1主要功能范围；真实NATS/Temporal、固定日历AUTO/日终对账、关页/Worker重启、重投幂等/UNKNOWN及实际业务本地配对恢复已有实测证据，见§8.43、§8.48、§8.55–8.60；用户已确认精确候选整版验收通过）。长期实时时钟/睡眠唤醒、增强跨阶段导航、穷举故障、宿主/异地灾备及Ubuntu实机延期；Artifact卷仅合成探针。版本入口：[README](./README.md)。

2026-10-07 P5真实Temporal服务中断：独立隔离E2E先停止Temporal服务，再创建normal TestRun；确认Platform对同一Run的Temporal派发真实失败并NAK，重启同一Temporal容器/持久卷后Run完成120项权威观察。浏览器normal/rejection/recovery矩阵1/1、同Run CLI/export及随机项目资源清理通过；外部来源/真实券商调用0。详细故障时序、Run ID和源码Hash见[停机恢复审计](../../../evidence/audits/2026-10-07-v15-temporal-server-outage-e2e.md)。这是服务单次停机恢复证据，不覆盖数据库错误、网络隔离、双Worker或备份恢复。

2026-10-07 P5持久派发与恢复增量：V1.5 normal NO_TRADE经Platform PostgreSQL事务写入TestRun+Outbox、JetStream durable consumer校验消息后启动稳定Temporal Workflow。隔离E2E验证NATS短停、派发前Platform重启、坏JSON与错误owner消息终止、同Run重复消息首次ACK丢弃后以`message.info.redelivered=true`真实重投、Relay恢复后原Outbox事件最终ACK；独立Run注入一次Temporal调用边界UNAVAILABLE，实际观察5秒NAK、JetStream重投并完成120次权威观察；另在CN_A Activity已开始后重启Platform/Temporal Worker，原Run基于Temporal持久历史恢复并完成。双Worker独立durable consumer均ACK同一normal TestRun，并实际观察Temporal稳定Workflow ID重复启动幂等收敛。完整时序见[持久派发审计](../../../evidence/audits/2026-10-07-v15-nats-temporal-dispatch-e2e.md)及[双Worker审计](../../../evidence/audits/2026-10-07-v15-multiworker-e2e.md)。PostgreSQL主机灾难恢复、双Worker故障切换、其他非法消息矩阵、交易/日终、拒绝/UNKNOWN、全V1/Artifact卷备份及Ubuntu和人工验收仍未完成。

2026-09-23 当前 Compose 运行时补充：阶段一只读检查发现当时 NATS JetStream 没有挂卷、Temporal `start-dev` 使用内存持久化；这不推翻 2026-09-09 历史测试结果，但说明它们未验证当前 Compose 容器重建后的状态保留。现已按[本地持久化恢复 Runbook](../../operations/nats-temporal-persistence-recovery.md)锁定两镜像 digest、配置 NATS/Temporal 命名卷，并实测 NATS 测试消息与 Temporal 已完成 Workflow 在强制容器重建后仍可读。该补充只证明本机单节点 Compose 恢复，不证明宿主灾难恢复或生产 HA；完整输出见[阶段五审计](../../../evidence/audits/2026-09-23-phase-5-nats-temporal.md)。

2026-10-07 P1交互栈增量：V1.5隔离Compose真实包含固定Digest的NATS JetStream/Temporal、随机PostgreSQL以及容器Web；Platform NATS重复消息探针PASS（同Msg-ID两次publish，JetStream仅1条），Temporal cluster health为SERVING，随机项目所有卷/资源精确清理。完整边界见[P1 V1.5交互栈审计](../../../evidence/audits/2026-10-07-p1-v15-interactive-stack.md)。V1.5场景业务仍WAITING；该运行没有调用Temporal workflow probe来假设worker已接线，长观察、双Worker、睡眠/备份恢复及用户验收仍未通过。

2026-10-06 V1完整闭环P0审计更正：复核发现原`V15OrchestrationEngine`按场景名直接填写60日HOLD/零订单、暂停拒绝、未知单查询、双Worker单发送者及备份一致等字段，再比较自行构造的expected/actual并生成PASS；当次路径没有实际调用NATS、Temporal、FakeBroker、账本或备份恢复。该实现现改为`WAITING`/`NOT_RUN`，分别标注workflow未接线、订单/Fill/账本未创建，所有业务断言保持WAITING。历史TestRun及2026-09-09签署保留其历史范围，不追认到本轮的新要求。该变更纠正证据表达，不实现或验证V1.5工作流。V1.5 code suite受控运行结果及源码Hash见[P0基线审计](../../../evidence/audits/2026-10-06-v1-p0-baseline.md)与[机器摘要](../../../evidence/audits/2026-10-06-v1-p0-baseline.json)。

## 1. 前置与范围

V1.1～V1.4通过；真实NATS、Temporal与已验收领域服务接入。

本阶段所有订单、券商资产和成交均来自隔离模拟环境。真实业务数据库、Qlib或RD-Agent在声明“已验证”时必须真正执行；替身需独立标注。

## 2. 开发任务

2026-10-14当前范围收口：按[所有者决定](../../decisions/2026-10-13-v1-core-closeout-scope.md)核对本轮交付，以下既有广泛父项中的剩余扩展继续保留未勾选，不构成本轮必交。原状态与清单完整保存在[同步前快照](../../../evidence/audits/2026-10-14-v1-closeout-before-status-sync.json)；不把延期项写成PASS。

- [x] 当前主要功能范围已实现并实测：真实NATS/Temporal、固定日历AUTO/日终对账、关页/Worker重启、重投幂等/UNKNOWN及实际业务本地配对恢复。证据见§8.43、§8.48、§8.55–8.60及[五阶段主要路径汇总](../../../evidence/audits/2026-10-13-v1-current-core-e2e-a01.md)。长期实时时钟/睡眠唤醒、增强跨阶段导航、穷举故障、宿主/异地灾备及Ubuntu实机延期；Artifact卷仅合成探针。

2026-10-10 P0责任核对：本阶段当前A31中第2/7/8节20条要求已人工映射服务主责、协作及外部操作职责，见[责任映射A01](../../../evidence/audits/2026-10-10-v1-v15-responsibility-a01.md)和[JSON](../../../evidence/audits/2026-10-10-v1-v15-responsibility-a01.json)。Platform当前承担Run/Workflow编排集成，Temporal/NATS为持久基础设施，领域服务分别拥有订单/授权/组合事实；睡眠/唤醒、Ubuntu与人工验收属于实际运维/所有者步骤。该映射不关闭P5。

- [ ] 实现市场日历交易工作流与自动日终对账。固定AUTO由真实NATS/Temporal后台串接持久Proposal、Mandate、FakeBroker订单/Fill、Portfolio和独立预算账本；最新四场景隔离E2E覆盖首日错过、随后两次交易及逐日收盘双账本复核（[报告](../../../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-aede7e79765691df51db.json)，详见第8.14节）。真实交易日历、多日连续调度、结算语义和完整日终运行仍未完成，本父项保持未关闭。
  2026-10-12共享Trade费用变更后的V1.5完整代码兼容复验通过（§8.55）；这不补足真实市场日历、多日连续运行、全量结算或恢复证据。
- [x] 固定双Trade实例+PostgreSQL同时中断组合已在FakeBroker提交后执行，恢复原库/依赖服务后由Temporal按原clientOrderId读回原单（第8.31节）；只关闭该故障子项，P5父项保持未关闭。
- [ ] 实现完整暂停/恢复、UNKNOWN原单查询、执行中的重启恢复与错过窗口策略；已验证暂停后新订单拒绝、UNKNOWN原单查询、活动/已完成AUTO重复派发幂等及Fixture错过首日后两次重评估（第8.12/8.14节）。Trade Execution单实例故障、双实例同时中断后的固定恢复场景分别见第8.18/8.30节；真实时钟延迟调度、Trade双实例与PostgreSQL同时中断的固定组合已通过（第8.31节）；其他独立故障组合和完整跨域恢复仍未完成。AUTO取消请求时间由注入Clock记录（第8.19.3节）。固定AUTO撤单/部分Fill竞态已通过隔离E2E，见第8.19.4节；真实日历与结算仍未完成。
- [x] Activity执行期间Platform API/Temporal Worker重启恢复：CN_A `verifyNoTradeSessions`已开始后重启随机隔离Platform容器，原Workflow完成120条权威读取（[执行中Worker重启审计](../../../evidence/audits/2026-10-07-v15-nats-temporal-dispatch-e2e.json)）；本地新复验还验证主/备用dispatch durable均收到同一Run后终止主Platform容器，由备用Worker接管、ACK并完成Run（第8.17节）。真实Temporal服务停机/同实例重启恢复另见[停机恢复审计](../../../evidence/audits/2026-10-07-v15-temporal-server-outage-e2e.md)。以上均为Platform/NO_TRADE派发恢复，不代表Trade单实例备用接管固定场景已通过第8.18节；这不代表多实例/多故障切换、在途Fill取消或备份恢复通过。
- [x] 已完成AUTO TestRun重复派发：对同一`eventId`使用新JetStream Msg-ID发布第二条消息，观察原稳定Temporal Workflow ID已存在并确认新序号；随后通过内部身份读取CN/US FakeBroker summary、Portfolio账户及Governance预算，订单/Fill仍各2，预算仍每Mandate消费1次，现金/持仓/ledgerEntryCount/ledgerVersion不变。隔离Harness `sq-v15-e2e-9d20807a341936dceaf1` exit 0；机器证据[JSON](../../../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-9d20807a341936dceaf1.json)。本项覆盖已完成与活动AUTO Workflow的重复派发；不覆盖撤销、在途Fill或交易Worker恢复。
- [x] V1.5 normal NO_TRADE以PostgreSQL原子Outbox→真实JetStream→Temporal稳定Workflow ID运行，并经 owner/TestRun范围检查；坏JSON与错误owner消息实际终止，同一TestRun重复消息首次ACK丢弃后真实redelivery，恢复后原Outbox也ACK；第二个TestRun上的一次性Temporal `UNAVAILABLE`异常经真实NAK/redelivery后完成120项Workflow。独立多Worker durable consumer重复派发同一Run也通过稳定Workflow ID幂等收敛（[坏消息/丢ACK重投E2E](../../../evidence/audits/2026-10-07-v15-poison-envelope-e2e.md)，[完整派发和瞬态重试E2E](../../../evidence/audits/2026-10-07-v15-nats-temporal-dispatch-e2e.md)，[双Worker E2E](../../../evidence/audits/2026-10-07-v15-multiworker-e2e.md)）。
- [x] 单Platform Worker/API进程故障接管子场景：主/备用独立durable收到同一Run后终止隔离主Platform容器，备用Worker启动该Run的Temporal Activity并ACK原消息；恢复主API后原Run完成120项权威读取（[故障切换E2E](../../../evidence/audits/2026-10-07-v15-worker-failover-e2e.md)）。此项只关闭NO_TRADE单Worker进程故障，不覆盖双Worker同时故障或真实交易/UNKNOWN。
- [ ] 把已创建页面的告警、能力阻塞、验收中心证据和比较功能贯通；支持从任一成交追溯完整链路。V1.5现可按External Fill ID在当前用户全部V1.5 Run中只读定位成交，包含近期列表之外的历史Run，并打开完整已存订单/授权/Outbox/双账本证据（见§8.50）。跨阶段成交检索、告警/能力/比较页到成交的导航贯通，以及全链路业务事实再核验仍未完成；本父项保持未关闭。
- [x] 增量：owner范围的V1.5 TestRun历史和比较视图已实现并验证；`GET /api/v1/acceptance/v1/v1.5/runs?limit=`默认20、上限50，仅返回当前owner的Run摘要；所选历史Run通过现有owner保护详情接口读取。见第8.21节。此增量不关闭上方父项。
- [x] 增量：V1.5验收页按当前TestRun的持久证据展示工作流派发、NATS、Temporal和领域执行状态；明确`NOT_CONNECTED`或失败状态显示为能力阻塞，`NOT_RUN`仍是未执行而非失败。单测和隔离浏览器负向断言见第8.22节。告警Incident接入/确认仍未实现，此增量不关闭上方父项。
- [x] 增量：V1.5 Run Incident按持久化阻塞证据生成owner/TestRun范围投影，登录会话用户可幂等确认；阻塞清除后Incident解决，再次出现创建新Incident。NOT_RUN/WAITING不生成Incident。隔离PostgreSQL、HTTP身份边界及正式Web确认用例见第8.24节；自动外发通知及跨阶段追溯仍未完成。
- [x] 增量：Run证据保存时在同一PostgreSQL事务内自动写入/更新Incident；恢复和复发也随证据保存即时解决/新建，不依赖GET触发。Platform隔离PG代码套件、V1.5四场景Web/API/CLI/export E2E及V1.1–V1.4兼容代码套件证据见第8.24节。外发通知、跨阶段成交链和任意成交追溯仍开放。
- [ ] 提供完整外部故障演练脚本和操作Runbook，覆盖Worker/总线重启、断网、睡眠恢复、双Worker竞争；当前已补齐隔离故障命令、预期行为和已有证据索引（见§8.25），Mac睡眠/唤醒及人工执行仍未验证，多故障组合也未全覆盖，故父项保持未关闭。NATS健康探针现已在保留隔离栈应用并复验（§8.39）。
- [x] PostgreSQL进程停机恢复：终止隔离V1.5栈数据库容器进程，恢复同容器/卷后观察同一JetStream序号NAK、重投、ACK及同一Run完成120项观察；源码Hash和范围见[数据库进程恢复审计](../../../evidence/audits/2026-10-07-v15-database-outage-e2e.md)。这不代表备份/恢复或宿主故障切换。
- [x] V1.5隔离栈配对卷恢复子场景：全栈停止后对PostgreSQL集群、NATS JetStream和Temporal SQLite三个卷逐份归档/记录SHA与大小，恢复到新卷并重启；同一TestRun保持120项权威HOLD观察，Temporal Workflow和JetStream ACK状态保留，资源精确清理（[审计](../../../evidence/audits/2026-10-07-v15-paired-backup-restore-e2e.md)）。这不覆盖V1.1–V1.4 Artifact文件卷、Ubuntu、异地备份或RPO/RTO。
- [x] 配对备份/恢复生产器契约回归：11项定向测试验证数据库/角色清单、业务事实引用关联、捕获期间源漂移拒绝及恢复证据提交门槛；`node --test scripts/cluster-paired-backup.test.mjs scripts/paired-backup.test.mjs`于2026-10-10 exit 0。该代码测试不覆盖完整V1各服务业务Artifact恢复或实际Ubuntu演练，父项仍未关闭（[日志](../../../evidence/audits/2026-10-10-v1-paired-backup-coverage-a01.log)，SHA-256 `b6815f0362a1be64a4ca490d9257487986f90e71881443e83b66a47191877e09`）。
- [ ] 全V1隔离备份恢复；执行Mac M1完整模拟E2E及目标Ubuntu架构烟测，记录未覆盖环境，V1证据打包。2026-10-09新增真实隔离集群备份器端到端测试：建立全部V1服务数据库/角色、一个合成Published ArtifactRef及匹配内容，调用生产集群备份器并恢复到无网络PostgreSQL临时实例，校验十个数据库、角色属性与Artifact字节Hash；[证据](../../../evidence/audits/2026-10-09-v1-isolated-cluster-paired-backup-a9366d9c50ee4001.json)。后续同一V1.5隔离Harness已在一个实际Web创建的normal TestRun下，同点归档/恢复PostgreSQL、NATS JetStream、Temporal SQLite和research Artifact四个持久卷，核对120项HOLD观察、Workflow完成态、JetStream ackFloor/delivered与ArtifactRef/内容SHA；[四卷E2E](../../../evidence/audits/2026-10-09-v15-paired-backup-restore-sq-v15-e2e-a378990c03fcf9de8260.json)。该ArtifactRef及字节是测试合成数据，不代表V1.1～V1.4真实发布产物或Artifact服务API发布；当前完整V1 DB/事件/Artifact数据配对、Ubuntu/异地/RPO/RTO仍未验。Mac ARM64宿主上的`linux/amd64` Platform API兼容性构建/Node探针仿真通过，明确标记为模拟架构，不能替代Ubuntu主机烟测；[日志](../../../evidence/audits/2026-10-09-v1-linux-amd64-compat-a173.log)，SHA-256 `d05179876661cc97b12ccd0d3ffcb98767a77954ed544d43b1522f94231f254f`。

2026-10-09再次实测同一备份器路径：`pnpm test:backup:cluster-isolated`（默认沙箱因Docker socket权限退出1；在受控Docker执行上下文重跑退出0）。恢复清单含十个V1服务数据库和角色；合成Published ArtifactRef对应字节SHA一致；活动项目未触碰，随机项目资源精确清理。最新机器报告：[JSON](../../../evidence/audits/2026-10-09-v1-isolated-cluster-paired-backup-a9366d9c50ee4001.json)，SHA-256 `cfaff400ac5e1d5ee87969bc34b06e65778dfbe3034f455607922a26fe0c8842`。这仍是工具链/结构验证，不含真实业务Run账本，也未将NATS/Temporal与全部领域数据做同点配对恢复；全V1配对业务恢复任务保持未完成。

2026-10-10对生产集群备份器的隔离业务事实场景复验：`pnpm test:backup:cluster-isolated` exit 0；随机隔离项目恢复10个服务数据库/角色及合成TestRun `e0d597cf-72b7-4a10-b12a-a5a8474842e1`、FakeBroker订单/Fill和Portfolio账本。恢复断言包括2条LedgerEntry、现金899.9000、持仓10股、业务关系均匹配，报告确认外部/真实券商调用0并精确清理随机资源。[机器报告](../../../evidence/audits/2026-10-09-v1-isolated-cluster-paired-backup-6ec18309cc38403b.json)；[复验日志](../../../evidence/audits/2026-10-10-v1-isolated-cluster-paired-business-facts-a01.log)，SHA-256 `71c9d43903873841a14edb0834aaff89a3de4b1cfcdbca626eea2650eac12c44`。这是对既有合成业务事实路径的复验，不是新的业务能力，也不覆盖Research Automation API发布产物、V1.1–V1.4真实回测/模型产物、活动备份编排、同点NATS/Temporal/Artifact完整V1数据、Ubuntu/异地及RPO/RTO；§2全V1备份恢复仍未完成。

- [x] 当前树V1.5完整隔离Web/API/CLI自动阶段入口复跑通过：normal、AUTO trade、rejection、recovery三个浏览器用例完成，七条身份/owner拒绝及四种运行模式拒绝通过，三Run同Run CLI/export通过；见§8.47。睡眠/唤醒及其它多故障/目标环境仍未验证。

## 3. 同步 Web 开发

正式页：总览、调度、暂停、告警、对账和恢复状态。验收页已区分60日NO_TRADE与双市场AUTO Fixture场景；AUTO只执行固定测试Mandate，不激活活动策略。现已提供固定AUTO/UNKNOWN Run的订单成交到双账本追溯视图；仍需交付任意成交入口、告警/比较贯通、全链路回归、外部演练步骤、截图/Trace及各阶段人工签署。

验收中心路径：`/acceptance/v1/v1.5`（目标路由）。场景参数提交到后端TestRun编排接口，后端调用业务API并汇集证据。浏览器不直接写领域数据，不自行判定成交。该阶段至少提供正常、拒绝/异常场景；适用时增加重试/恢复场景。

## 4. 人工验收步骤

1. 批准一次模拟Mandate后关页面，按虚拟日历完成自动交易/日终；重开页面核对全链路。
2. 回放60个当地交易日HOLD，两市场均零委托、零交易预算消耗。
3. 在UNKNOWN及事件未确认时重启，确认只查不重下、重复事件不重复入账；暂停期间合法成交继续处理。
4. 执行备份恢复和双市场日历边界，检查无跨币种放行、无集中补下过期订单；导出V1证据。

每次保存testRunId、场景版本、代码/镜像、数据/规则版本、种子及注入事件序列、实际/预期、截图/Trace。判定依据必须是后端事实和独立检查，不能只看Toast成功提示。

## 5. 异常与替身边界

关闭网页不是停机测试；外部进程故障由限定脚本/人工实施，Web后端不挂宿主Docker Socket。目标Ubuntu尚不可用时烟测保持NOT_RUN并记录迁移缺口。

## 6. 产物与验证

目标产物：workflow-orchestration-service、scripts/verify/backup/restore、完整Web回归、V1环境报告和证据包。

自动验证：真数据库/总线/Temporal进程恢复E2E、浏览器关闭与重连、双Worker、备份恢复及V1全阶段回归。

需求/测试追踪：SYS-05、OPS、AUT模拟部分、XMK；T24/31～38/40/48～54模拟子项；DV-01/02/03、VT01/02/03。

退出条件：开发任务完成、Web真实可操作、全部适用检查PASS、人工签署、已知限制写入证据。填写[本版验收表](./99-acceptance.md)，未完成项不得勾选通过。

- [x] 增量安全边界：V1.5 Platform Run创建只接受`scenarioId`、`seed`；六种客户端交易模式组合均被拒绝且不新增TestRun（见第8.28、8.52节）。此原子入口验证不关闭全V1路由/Worker模式矩阵。
- [x] 增量安全边界：V1.5取消与Incident确认命令拒绝非空客户端业务事实载荷；拒绝后Run取消状态及Incident状态不变，合法空体命令可继续执行。完整V1.5隔离E2E及代码套件均通过，见第8.29节。
- [x] 增量恢复验证：V1.5正式Web创建的normal TestRun在关闭并重开页面后恢复同一Run；Temporal Activity运行中对Platform API主进程PID 1注入SIGKILL后，Compose `unless-stopped`自动重启，原Workflow完成120项观察且同Run CLI/export通过（§8.43）。这只关闭该隔离NO_TRADE进程崩溃子场景，不替代保留栈维护、Mac睡眠/唤醒、全域备份恢复或阶段人工验收。
- [x] 增量恢复验证：保留栈中已完成Temporal Workflow但Platform API容器退出的normal Run，通过恢复该精确容器使API/Web重新可用；同Run `--check-only`确认仍为WAITING（系统调度断言NOT_RUN、HOLD观察PASS）。见§8.44；未修改Run状态或业务数据。
- [x] 增量安全边界：V1.5 JetStream dispatch envelope及嵌套payload/session采用字段白名单；拒绝未知交易模式和客户端业务事实注入。19项定向单测及完整V1.5 code suite通过，见§8.56；本次注入覆盖为consumer validator单测，不宣称另行执行了坏消息JetStream端到端场景。
- [x] 当前树主要功能验证：normal、双市场AUTO、rejection、recovery浏览器4/4通过；AUTO四笔成交可从Run追溯，四场景均完成同Run CLI/export，隔离资源清理核验通过（§8.57）。此项不替代全版回归或人工验收。

- [x] 2026-10-13当前树V1.5正常/AUTO/拒绝/恢复浏览器4/4通过，AUTO 4 Fill追溯与同Run CLI/export通过；另完成PostgreSQL、JetStream、Temporal及Artifact卷同点隔离恢复，原AUTO订单/成交/账本MATCH且状态不变。见§8.57–8.58；Artifact内容为合成探针，不声称Qlib产物恢复。

## 7. 阶段交付待办（完成后勾选）

当前交付清单按2026-10-13已批准的主要功能范围核实；PASS仅覆盖本轮范围。长期实时时钟/睡眠唤醒、增强跨阶段导航、穷举故障、宿主/异地灾备及Ubuntu实机延期；Artifact卷仅合成探针。下方早期增量说明中的“未完成/待验收”是对应日期历史，当前结论以上方状态及本节2026-10-14确认记录为准。

以下勾选只记录本阶段交付进度，不能代替第2节逐项开发任务或版本验收结论。开发者凭实现/实测证据勾选开发项；“人工验收”仅在用户实际确认后勾选，不预填PASS。

- [x] 当前范围的契约、数据结构、冻结Fixture、场景及预期已核实；证据见§8.43、§8.48、§8.55–8.60，广泛增强仍延期。
- [x] 第2节当前主要功能范围完成，真实组件/Fixture边界明确；依据§8.43、§8.48、§8.55–8.60。未勾选的广泛父项按本轮范围拆分，延期部分仍未通过。
- [x] 正式Web及验收中心当前范围正常/异常/恢复场景已通过容器Web/API/CLI实测，见§8.43、§8.48、§8.55–8.60；增强告警/跨阶段导航按范围延期。
- [x] 第8节本地运行命令、动态Web URL、Fixture路径/Hash、配置、超时及恢复/停止说明已实测，见§8.43、§8.48、§8.55–8.60；Ubuntu URL/主机配置按决定延期，不以本地地址代填。
- [x] 第8节本地主要路径已从准备运行到同Run CLI/export执行，原报告保留源码/输入Hash、退出码、截图/Trace与业务断言；见§8.43、§8.48、§8.55–8.60及[汇总](../../../evidence/audits/2026-10-13-v1-current-core-e2e-a01.md)。
- [x] 增量安全边界：取消和Incident确认拒绝客户端业务事实载荷，完整隔离E2E/code证据见§8.29。该增量不代表阶段人工验收。
- [x] 当前固定重复/恢复与适用观察范围已有实测，见§8.43、§8.48、§8.55–8.60；实际业务本地恢复见§8.58，长期实际日观察、睡眠/唤醒及完整故障穷举延期，不以虚拟日替代。
- [x] 用户已通过Web及命令证据完成人工验收，记录确认时间/结论（2026-09-09，PASS）。
- [x] 操作说明与限制已更新，[本版验收表](./99-acceptance.md)已同步（2026-10-10：§8.1–8.4命令与证据更新，成交级链路、Trade恢复与NATS保留栈探针实测已同步；当前新增范围人工验收仍NOT_RUN）。
- [x] AUTO取消/在途Fill竞态固定场景已由隔离Web、Trade FakeBroker与Portfolio账本完整执行；订单取消、部分Fill和剩余预留释放有单测、E2E及同Run CLI/export证据（仅关闭该固定场景；见§8.19.4）。
- [x] Platform API四条V1.5场景/Run/TestRun/取消入口身份矩阵在完整隔离E2E中通过：匿名401、伪造owner 403各4/4，路由清单与控制器匹配（见§8.20）。
- [x] 增量交付：V1.5 Run创建拒绝全部六种环境/券商模式组合注入，HTTP 422且PostgreSQL TestRun数量不变；完整V1.5 Web/API/CLI E2E通过，见§8.28、§8.52。此子项不表示全服务/Worker模式矩阵关闭。
- [x] 增量交付：Incident确认及AUTO取消入口六种客户端模式组合均返回422且无业务状态变化；完整阶段、专用AUTO取消Web/API/CLI E2E及当前code suite见§8.53。此切片不表示全服务/Worker矩阵或阶段验收完成。
- [x] 增量交付：owner范围V1.5历史Run摘要列表、历史详情读取及并排比较已通过代码和浏览器验证（见§8.21）；告警/能力阻塞、跨阶段追溯和人工验收仍开放。
- [x] 增量交付：V1.5 Run能力状态与明确阻塞在正式验收页可见，`NOT_RUN`不误标失败；单元测试、负向浏览器用例、完整代码套件及四场景E2E通过（见§8.22）。告警Incident集成、跨阶段追溯和人工验收仍开放。
- [x] 增量交付：Run Incident持久投影、会话身份确认、恢复解决/再次发生及owner隔离已由PostgreSQL集成和隔离HTTP/Web验证（见§8.24）；自动外发通知、跨阶段追溯和人工验收仍开放。
- [x] 增量交付：隔离栈故障演练命令、预期结果、已存证据及停止/清理要求已整理为可查Runbook（见§8.25）；Mac睡眠/唤醒和人工完整操作仍未验证，其他多故障组合也未覆盖。Trade双实例中断见§8.30，双Trade与PostgreSQL组合见§8.31；不代表全域同时故障验收。
- [x] 增量交付：FakeBroker订单/Fill已持久提交、Trade HTTP响应未返回时，实际同时终止两个Trade Execution实例1.5秒，再重启一个实例；Temporal按原`clientOrderId`读回原单，完整AUTO四笔Fill与双账本仍MATCH（见§8.30）。双Trade与PostgreSQL同时中断后的依赖服务恢复及原单读回也通过（§8.31）。Mac睡眠/唤醒、其他故障组合、真实时钟与人工演练仍开放。
- [x] 增量交付：保留隔离栈NATS JetStream readiness探针已应用；原JetStream卷/消息和consumer状态、TestRun及Web/API经重建后复验（见§8.39）。该交付不改变人工验收未完成状态。
- [x] 增量交付：从owner范围近期运行摘要只读打开历史V1.5 Run，并逐笔追溯该Run的四个AUTO Fill已通过隔离E2E（§8.49）；跨阶段查询、近期列表之外检索及本人验收仍开放。
- [x] 增量交付：按External Fill ID从owner范围完整V1.5 Run集合定位近期列表之外的历史成交，隔离PostgreSQL集成、完整V1.5 code suite与Web/API/CLI E2E通过（§8.50）；跨阶段追溯、关联事实复核、告警/能力/比较导航及当前范围人验仍未完成，故父项未勾选。
- [x] 增量交付：正常TestRun页面刷新恢复及Platform API主进程崩溃自动重启均在随机隔离栈实际执行；四场景E2E、同Run CLI/export与隔离资源清理通过（§8.43）。不勾选整阶段重复/恢复或本人验收项。
- [x] 增量交付：保留交互栈Platform API容器恢复及同Run只读CLI核查已执行（§8.44）；Run仍WAITING，因此不勾选阶段恢复观察、阶段通过或本轮人工验收。
- [x] 当前树完整V1.5隔离Web/API/CLI运行已通过，normal/AUTO/rejection/recovery同Run事实核验、工作流恢复及精确容器/四状态卷/网络清理见§8.47；新Run自动结论仍NOT_RUN人工验收。
- [x] 2026-10-12当前树V1.5完整代码套件`pnpm verify:stage -- --stage V1.5 --suite code`退出0；基线67/67、Market Data集成28/28、Python适配器69/69、四服务迁移、Outbox原子性5/5和Run Incident 3/3检查通过，隔离资源清理通过。原始日志、退出码与SHA-256见§8.48。此项不关闭完整睡眠/唤醒恢复、Ubuntu或人工验收。
- [x] V1.4共享Trade费用实现变更后的V1.5完整代码/隔离集成复验exit 0；受控PostgreSQL迁移、服务构建、Market Data/Platform集成及资源清理通过，见§8.55。此项不关闭V1.5完整业务恢复、Ubuntu或人工验收。
- [x] 2026-10-13 V1.5 dispatch envelope字段白名单及业务事实注入单测19/19，完整code suite exit 0（§8.56）；当前树主要场景Web/API/CLI/export 4/4及四笔AUTO Fill追溯通过（§8.57）。不表示阶段人验或V1验收完成。

- [x] 2026-10-13当前树V1.5正常/AUTO/拒绝/恢复浏览器4/4通过，AUTO 4 Fill追溯与同Run CLI/export通过；另完成PostgreSQL、JetStream、Temporal及Artifact卷同点隔离恢复，原AUTO订单/成交/账本MATCH且状态不变。见§8.57–8.58；Artifact内容为合成探针，不声称Qlib产物恢复。

- [x] 用户于2026-10-14在对话确认当前候选整版V1验收通过，覆盖本阶段本轮范围；候选SHA-256 `132535fbdf2bf1d50e4260e397424b3a47ef949dedcc62e58257c0a5697bd2d4`，代表Run及签署日期见[验收表](./99-acceptance.md)。历史单Run人工结论不倒填。

## 8. 阶段验收操作手册

### 8.1 当前可执行性与验收准备

手册状态：VERIFIED_EXECUTABLE（2026-10-14收口，限已实测的Mac本地主要功能操作；实际执行证据见§8.43、§8.48、§8.55–8.60，当前候选整版人工验收已由用户确认）。启动时使用当次输出的动态URL和精确项目名；历史随机URL不能复用。长期实时时钟/睡眠唤醒、增强跨阶段导航、穷举故障、宿主/异地灾备及Ubuntu实机延期；Artifact卷仅合成探针。以前部分验证状态与原操作记录保留于[同步前快照](../../../evidence/audits/2026-10-14-v1-closeout-before-status-sync.json)及下方各次实测记录。

前置服务：V1核心服务、真实NATS/Temporal、Gateway/FakeBroker、备份恢复工具与外部故障执行器。

固定输入：NO_TRADE Fixture及AUTO两市场各三个合成日历日；v1.5-auto-trade-calendar-2首个窗口错过，后两个交易日分别成交并在收盘对账。E2E使用独立随机运行，不以seed替代固定Manifest。

| 开发交付时必须填写 | 当前值 |
|---|---|
| 实测代码Commit或工作区Hash/验证日期 | 2026-10-09；HEAD `baded04948d0337257f6a6348cf6ebfdaddc026a`；隔离E2E报告逐文件记录源码SHA，不能代表整个脏工作区提交 |
| 项目根目录、Node/pnpm/Python/uv及Docker版本 | `/Users/huangbosong/Documents/ChatGPT/StockQuant`；Node `v24.1.0`、pnpm `10.34.5`、Python `3.9.6`、uv `0.12.7`、Docker `28.0.4`、Compose `v2.34.0-desktop.1` |
| Web基础URL/身份登录或会话建立方式 | 每次启动使用随机loopback URL；隔离Harness首个Web请求建立本地 `acceptance-owner-1` 会话，不记录凭证 |
| 本阶段Web路由 | `/acceptance/v1/v1.5`（已验证隔离交互路由） |
| 正式页面的真实入口/跳转链接 | 启动时打印随机loopback URL；2026-10-07最终复验 `http://127.0.0.1:50143/acceptance/v1/v1.5` |
| Fixture文件/数据版本/确切日期/Hash、规则与成本版本 | AUTO日历 `fixtures/v1/v1.5/auto-trade-calendar-2.json`，版本`v1.5-auto-trade-calendar-2`，SHA-256 `793e573513c39431f4ba5019d35cec8d5c9d73f4b7c4c53777b3c71472893afc`；Manifest `fixtures/v1/v1.5/auto-trade-calendar-2-manifest.json` SHA-256 `d8a7e2adf550c67404cf874551b5aa2f2587c00952b479ef2829b8866fcf6b01`；两市场合成日均为2026-01-05、06、07；第1日错过，第2、3日成交并收盘对账。NO_TRADE Fixture SHA-256 `540e28f2f70b61d16c5430901224682e1b57f137d0807e7318cea8d0c61be463` |
| 配置文件及必需环境变量名/非秘密测试值 | 隔离Harness自动生成随机配置；FAKE broker、模拟账户、LIVE写入关闭；不需手填凭证 |
| 外部故障目标及可执行命令、恢复/隔离清理入口 | E2E只操作随机Compose项目并自动清理；交互栈停止仅使用当次启动输出的 `stopCommand`。当前范围PostgreSQL/NATS/Temporal与实际AUTO业务配对恢复已实测，见§8.58；Artifact仅合成探针，宿主/异地灾备延期 |
| 预期耗时、轮询超时、实际观察期/预算 | 最近V1.5 E2E约2分钟；健康检查最多30秒；有界等待超时即失败。合成日历不是实际市场观察 |

### 8.2 初始化与启动（隔离交互栈已实测；业务验收待执行）

在上表填写的项目根目录运行；工具版本按锁文件/项目说明准备。首次开发由开发者生成锁文件和脚本，验收者不负责补建环境。环境变量按上表配置；保持FAKE券商与模拟账户，真实模型仅在本阶段明确要求且预算已配置的场景调用。

2026-10-09当前工作区实际启停：首次沙箱内绑定127.0.0.1被系统拒绝（EPERM），在获准的本机执行范围内重试后启动成功。本次随机项目` sq-v15-stack-18421f61ab7de2de7a4d`输出Web `http://127.0.0.1:59420/acceptance/v1/v1.5`、API `http://127.0.0.1:59419`；Web路由与`/live`均HTTP 200，broker=FAKE、PAPER、LIVE=false。精确运行输出的停止命令退出0，容器、项目卷、网络、专属镜像和凭据文件清理通过，未触碰其他项目；人工验收仍NOT_RECORDED。结构化记录见[本次交互栈生命周期审计](../../../evidence/audits/2026-10-09-v15-interactive-stack-lifecycle-a01.json)及其SHA sidecar。

```bash
# 终端A：先确认实际执行目录为项目根目录
pwd
pnpm install --frozen-lockfile
pnpm stack:up -- --stage V1.5

# 终端B：按启动输出复制精确项目ID，停止仅本项目
read -r project_id
pnpm stack:down -- --project "$project_id"
```

2026-10-07最终实测随机项目`sq-v15-stack-70a462189477cbbd2c16`，容器Web HTTP 200；Platform的真实NATS JetStream探针PASS，重复Msg-ID只保留一条消息；Temporal CLI cluster health返回`SERVING`。关停后精确项目PostgreSQL/NATS/Temporal卷、容器、网络、镜像、0600 env/state均清理。Harness输出实际Web/API URL、broker FAKE、LIVE false和stop命令。上例ID/URL仅是已完成审计的示例；每次启动必须以本次Harness打印的新值为准。业务normal NO_TRADE经真实JetStream Outbox派发并由Temporal执行的隔离E2E见下方记录；其它业务场景、故障恢复、备份、Ubuntu和人工验收仍未完成。

2026-10-07隔离业务normal E2E新增：随机项目`sq-v15-e2e-c6da10b7e980bc5a5834`使用真实PostgreSQL、Portfolio Risk、Trade Execution/FakeBroker、Temporal、NATS和容器Web。正常Run `9e08dadd-c56f-422b-b7e6-aa3250b2d065`对冻结日历逐日执行CN_A/US_EQUITY各60个日期的权威账户与FakeBroker查询，共120条；零订单、零Fill、零预留、资金/持仓与账本版本不变，`V1.5-HOLD-002=PASS`，workflow `COMPLETED`。浏览器内同Run CLI check-only退出2且忠实返回WAITING，证据export退出0；拒绝Run `b0e2f24e-1977-42c1-8d15-3fc381aa2eed`、恢复Run `37619e69-5c30-4571-8ba9-8ea4f8c5ead1`仅证明NOT_CONNECTED/NOT_RUN呈现、同Run CLI与导出路径，绝非其业务场景通过。隔离Harness 1/1并精确清理容器、卷、网络及镜像，真实来源/券商调用0；详见[机器审计](../../../evidence/audits/2026-10-07-v15-no-trade-workflow-e2e.json)。日历Fixture为日期型虚拟日程，不是实际等待窗口或完整交易所日历。拒绝/恢复业务、UNKNOWN、备份还原、Ubuntu和当前人工验收仍未完成；NATS事件驱动与双Worker同Run幂等另有后续E2E证据。

初始化在验收中心“准备隔离运行”完成；CLI场景入口也负责同样的准备，两者调用同一业务API。准备后记录testRunId、accountId、namespace及Fixture/DataVersion；初始化业务本身是测试对象时不得预先完成被测动作。缺源/凭证/历史数据时显示缺项，不静默换成Fake并报真实场景通过。

### 8.3 Web逐步操作及预期结果

1. 打开本次 `stack:up` 输出的 `webUrl`（路径 `/acceptance/v1/v1.5`），确认标题“V1.5 无人调度、故障恢复与 V1 验收”、模拟运行和FAKE模式。
2. 在“调度场景”选择场景，点击“准备 V1.5 场景”；等待本次 `testRunId` 显示并记录。每次选择创建独立Run；需要恢复/重复投递时复用该Run与原业务幂等键。
3. 按下表核对实际页面明细。自动化测试已验证的场景与尚未接通/执行的业务场景分开记录；不能把 `WAITING` 或 `NOT_RUN` 当成业务通过。

| 场景ID（阶段内唯一） | 场景 | 点击顺序/输入 | 预期结果与核对点 |
|---|---|---|---|
| `normal` | 后台调度与60日HOLD | 选择“后台调度与 60 日 HOLD”，点击“准备 V1.5 场景”；可刷新或关闭再打开页面，按同一Run ID查看后台任务。 | Temporal完成CN_A/US_EQUITY各60条权威观察；核对零订单、零Fill、零预留及HOLD断言。该NO_TRADE场景不证明AUTO交易恢复。 |
| `auto-trade` | 双市场Fixture自动交易 | 选择“双市场 Fixture 自动交易”，点击“准备 V1.5 场景”；等待后台Workflow结束后刷新同一Run。 | 核对两市场各2笔Proposal/Mandate/订单/Fill、首日错过且不建旧单、第2/3日逐日收盘前成交并双账本匹配。不是实际日历或真实交易观察。 |
| `rejection` | 暂停与窗口拒绝 | 选择“暂停与窗口拒绝”，点击“准备 V1.5 场景”，检查断言详情。 | 自动化PASS：CN/US Mandate暂停后新提案均以403/MANDATE_INACTIVE拒绝，且无订单、Fill、预算预留副作用；USD不足、过时窗口和在途Fill其余组合仍需单独验证。 |
| `recovery` | Worker/总线与备份恢复 | 选择“Worker/总线与备份恢复”，点击“准备 V1.5 场景”，等待Workflow完成并检查恢复证据与双市场账本。 | 自动化PASS：CN_A FakeBroker已提交后丢响应、原单查询首次不可用，重试后按原clientOrderId恢复；US_EQUITY单次执行为对照；双市场各1订单/Fill、无未决订单且账本匹配。数据库、Temporal服务故障及全V1配对备份恢复仍未完成。 |

4. 从运行详情打开关联正式页面，执行一次刷新/关闭再打开；核对长任务后台状态、历史证据和加载/失败/陈旧提示。
5. 每项记录实际结果、截图与业务ID。异常场景“预期拒绝”被正确验证时断言可PASS，但被测业务操作仍显示拒绝；若意外接受则断言FAIL。

### 8.4 命令行复验与相同运行核对（同Run路径已由隔离E2E验证）

在仓库根目录运行下列命令。`normal`、`auto-trade`、`rejection`、`recovery`是自动化Harness支持的scenario名称；各独立创建Run。已验证同Run CLI/export由隔离E2E执行，交互栈命令须使用它自身新建的Run ID。任何WAITING的场景检查均不构成PASS。

```bash
pnpm verify:stage -- --stage V1.5 --scenario normal --seed 20260907
pnpm verify:stage -- --stage V1.5 --scenario auto-trade --seed 20260907
# 紧接上一命令执行；0表示全部场景断言通过
 echo $?
pnpm verify:stage -- --stage V1.5 --scenario rejection --seed 20260907
 echo $?
pnpm verify:stage -- --stage V1.5 --scenario recovery --seed 20260907
 echo $?
pnpm verify:stage -- --stage V1.5 --suite code
 echo $?
pnpm test:e2e -- --stage V1.5
 echo $?
```

预期：各场景输出testRunId、实际数据/模型/券商模式、断言expected/actual及证据位置；预期内拒绝场景验证成功退出0，意外副作用/缺脚本/缺必需依赖/未满观察条件非零。恢复场景需外部动作时输出已核实目标和步骤，停留WAITING；完成动作后复验原run，不伪称Web可重启宿主。浏览器测试必须实际运行本阶段用例，零用例/全跳过不能退出0。

再对Web中已运行的同一testRunId执行只读核对，避免仅创建新样本掩盖页面问题：

```bash
# 从stack:up输出复制API地址；从Web运行详情复制UUID；Cookie中只复制完整sq_session值，不回显、不写文件
read -r platform_api_url
read -r acceptance_run_id
read -rs session_cookie
export STOCKQUANT_PLATFORM_API_URL="$platform_api_url"
export STOCKQUANT_SESSION_COOKIE="$session_cookie"
export STOCKQUANT_EVIDENCE_SESSION_COOKIE="$session_cookie"
pnpm verify:stage -- --stage V1.5 --run "$acceptance_run_id" --check-only
check_exit=$?
printf 'check-only exit=%s\n' "$check_exit"
pnpm evidence:export -- --stage V1.5 --run "$acceptance_run_id"
export_exit=$?
printf 'evidence export exit=%s\n' "$export_exit"
unset STOCKQUANT_SESSION_COOKIE STOCKQUANT_EVIDENCE_SESSION_COOKIE session_cookie
```

V1.5的check-only只GET原Run事实，不创建新Run/订单、不重放成交或发起模型调用。对仍有`WAITING`聚合断言的Run，exit 2表示完整观察尚未结束；检查输出仍须绑定同一Run ID并核对已完成观察、业务断言及零副作用。错误stage/越权Run必须拒绝。Evidence Export必须显式带`--stage V1.5`（省略时工具默认V1.1），仅导出脱敏数据并输出实际目录和Manifest Hash，不自动勾选人工验收。端到端不同场景运行分别导出。Cookie只从本地浏览器开发者工具的Cookie项复制，输入保持隐藏，不保存到证据、命令历史或Git。

本阶段代码测试覆盖要求：真数据库/总线/Temporal进程恢复E2E、浏览器关闭与重连、双Worker、备份恢复及V1全阶段回归。 在交付时把映射到的实际Domain/DB/契约/服务内测试命令补入本节，注明执行目录、测试文件或套件、退出码和报告；verify:stage必须展示实际调用的测试清单，不能空壳返回0。Python服务使用自身锁定环境，不串用其他服务虚拟环境。

### 8.5 交叉核对、失败定位与恢复

交叉核对：发送日志、FakeBroker place次数、Outbox/Inbox、账本唯一性和恢复Hash；保存实际外部故障时间及目标。

先检查Web与CLI的testRunId、输入/策略/代码版本和模式是否一致，再按Trace查平台、领域、适配器与持久化证据。页面错误而CLI正确，记录Web失败；二者都错则保留领域断言失败。缺能力先查健康/迁移/数据与日志，不修改余额或订单状态使断言通过。

独立复跑创建新run；测试幂等/检查点/重启恢复则使用原run和原幂等键。故障发生后保留旧证据，修复后新增运行或检查记录；不得清空账本、随机更换seed直到通过。真实观察窗口、来源验证和实际模型调用与加速/录制测试分别记录。

### 8.6 验收记录与收尾

| 场景/检查 | Web实际结果与截图 | 命令/退出码/报告 | testRunId/业务ID | 结论 |
|---|---|---|---|---|
| normal NO_TRADE、NATS停机及派发前Platform重启、丢ACK重投 | 停止本项目JetStream约3秒后恢复并重启Platform；坏JSON seq1、错误owner seq2终止；同Run重复seq3首次ACK丢弃后真实redelivery；恢复Relay原Outbox seq4；同一Run完成120条权威读取 | `pnpm test:e2e -- --stage V1.5` exit 0，Playwright 1/1；同Run CLI exit 2/WAITING、export exit 0；[时序/原始日志/源码Hash审计](../../../evidence/audits/2026-10-07-v15-nats-temporal-dispatch-e2e.json)；[边界/失败历史](../../../evidence/audits/2026-10-07-v15-poison-envelope-e2e.md) | `79828837-80e4-4225-8964-e34563a805cb` | 自动HOLD断言及单消费者lost-ACK redelivery、Activity执行中Platform/Worker重启恢复PASS；两类永久消息终止、原Outbox恢复PASS；Temporal服务重启、双Worker和人工验收仍NOT_RUN |
| 第二个normal Run Temporal瞬态错误重试 | 在API创建TestRun后，测试Hook对其Temporal调用首次返回`TemporalServiceUnavailableError`；真实JetStream NAK等待后重投，同一Run完成120条权威读取，ACK floor=5 | 同一`pnpm test:e2e -- --stage V1.5` exit 0；本轮机器时序/源码Hash见[完整E2E JSON](../../../evidence/audits/2026-10-07-v15-nats-temporal-dispatch-e2e.json) | `e71f5ef6-1be4-4ae1-b38d-1815e2c2b824` | 注入错误分类/NAK/redelivery/最终完成PASS；数据库瞬态错误、真实Temporal服务停机恢复、多Worker与人工验收仍NOT_RUN |
| Activity执行中的Platform/Temporal Worker重启 | CN_A Activity启动后，在normal Run完成前重启Platform API容器；Temporal持久Workflow恢复后完成120项观察 | 同一`pnpm test:e2e -- --stage V1.5` exit 0；机器事件含Activity启动marker、重启及完成时序 | `79828837-80e4-4225-8964-e34563a805cb` | Platform承载的Temporal Worker进程重启恢复PASS；Temporal服务进程、网络、DB、双Worker及人工验收仍NOT_RUN |
| 双Platform Worker处理同一normal Run | 两个Worker以不同JetStream durable consumer接收同一事件；检查两个consumer ACK、重复Workflow启动和唯一权威结果 | `STOCKQUANT_V15_E2E_MULTIWORKER=true pnpm test:e2e -- --stage V1.5` exit 0；当前`pnpm verify:stage -- --stage V1.5 --suite code` exit 0；[双Worker E2E](../../../evidence/audits/2026-10-07-v15-multiworker-e2e.md) | `7e0744ff-af77-4a00-bcd1-c931ebd29076` | 两consumer ACK、稳定Workflow ID幂等启动、120项观察及精确清理PASS；Worker故障切换/交易流程/备份与人工验收仍NOT_RUN |
| normal NO_TRADE虚拟60日/市场 | 容器Web正式E2E；120条权威观测、零订单/Fill/账本变化；页面详情由E2E断言 | `pnpm test:e2e -- --stage V1.5` exit 0；同Run CLI check-only exit 2/WAITING；export exit 0；[机器审计](../../../evidence/audits/2026-10-07-v15-no-trade-workflow-e2e.json) | `9e08dadd-c56f-422b-b7e6-aa3250b2d065` | HOLD自动断言PASS；阶段仍WAITING，人工验收NOT_RUN |
| rejection（含全部子场景） | Run状态呈现NOT_CONNECTED；未执行业务拒绝断言 | 同上E2E：Web/API/CLI/export通路检查通过 | `886ef29e-d58d-47e1-be1f-3cdd714b042e` | 业务NOT_RUN |
| recovery（含实际外部动作） | Run状态呈现NOT_CONNECTED；未执行Worker/总线/备份动作 | 同上E2E：Web/API/CLI/export通路检查通过 | `e128c14f-246e-4a54-b630-8d61004b4d56` | 业务NOT_RUN |
| Web同run只读核对与证据导出 | 三个唯一TestRun均由CLI同Run检查；三份导出断言通过（Harness临时输出根清理） | 同上E2E exit 0；run IDs及边界见机器审计 | 以上三个TestRun | 自动通路PASS；导出文件未保留在仓库，业务状态不因此改变 |
| 前次代码门禁缺镜像记录（历史快照） | 当时Platform单测和NATS边界通过；测试镜像检查在无Docker访问时返回前置缺失 | 历史命令与原始日志见[前次代码门禁](../../../evidence/audits/2026-10-07-v15-code-suite-after-worker-restart.md) | 保留历史执行证据，不改写 | 该结果不代表当前可访问Docker环境下的最新代码门禁 |
| 本轮完整代码套件 | 规定的构建/类型/合同/Fixture/工作区测试和V1.5隔离代码检查通过；Python Worker测试用本地锁版linux/arm64镜像、禁网容器执行14项 | `pnpm verify:stage -- --stage V1.5 --suite code` exit 0；完整原始日志见[本轮code suite](../../../evidence/audits/2026-10-07-v15-code-suite-pinned-python-available.log) | 精确image digest、image ID、计数和Hash见[机器审计](../../../evidence/audits/2026-10-07-v15-code-suite-pinned-python-available.json)及[SHA-256](../../../evidence/audits/2026-10-07-v15-code-suite-pinned-python-available.sha256) | 只关闭代码套件与Python镜像前置；V1.5业务rejection/recovery、真实Temporal服务停机、DB/网络/多Worker、交易/日终、备份和人工验收仍未完成 |
| 本阶段代码测试/实际观察适用项 | Platform类型检查/全量55文件241项单测、Web类型检查、Fixture 33文件Hash检查通过；完整code suite复用既有审计 | typecheck exit 0；vitest 7/7；`pnpm fixtures:check` exit 0 | 机器审计及既有完整code suite审计 | 小样本虚拟日程，不抵扣真实观察；Ubuntu/其余故障测试NOT_RUN |
| AUTO Fixture交易切片 | Web提交`auto-trade`；核对CN 100股、US 10股的Proposal/Mandate/订单/Fill、Outbox、Portfolio与独立FakeBroker账本；CLI同Run只读检查并导出 | 隔离Web/API/CLI/export E2E exit 0，当前机器证据见[审计](../../../evidence/audits/2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-d21a630d48224b59c757.json) | `795d12f5-301a-4ecf-844a-1199e9ca9b20` | 已验证固定首笔slice；父级多日/日终仍NOT_RUN，人工验收NOT_RUN |
| 关闭页面后续看同一TestRun | 浏览器提交normal后台Run后关闭原V1.5验收页并新开页面；AUTO Run则在页面关闭期间完成交易和双市场独立对账后再重新打开；localStorage恢复Run ID，页面重新查询持久API并显示同一ID与WAITING状态；该TestRun随后完成120项观察及同Run CLI/export | `pnpm test:e2e -- --stage V1.5` exit 0，Playwright 1/1；Web typecheck及Vitest 1/1通过。隔离Harness在报告输出内记录四场景Run IDs；源码断言关闭页面后重开恢复同一ID：[E2E报告](../../../evidence/audits/2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-391873c1eb80223c45ee.json)、[SHA-256](../../../evidence/audits/2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-391873c1eb80223c45ee.json.sha256) | normal `c79a0652-077d-416e-bef5-6a2610b78bd8`；AUTO `ab58814d-4255-41a3-9b9b-f4a20a3dfa77`；rejection `4730b546-c843-4466-bc73-4ffc974ebcac`；recovery `419350a7-0bf7-45ae-87b8-fe3d9b32b4ad` | 关闭页面后重开恢复及四场景Web/API/CLI/export通路PASS；不证明多日AUTO、日终或当前人工验收 |
| AUTO成交追溯视图 | 正式Web按市场逐项展示Proposal ID、Mandate ID/版本、ClientOrder ID、FakeBroker Order/Fill、Outbox状态、Portfolio/FakeBroker现金、预算已消费额及独立对账；Playwright将显示值逐项与同Run持久证据比较 | 同一隔离四场景E2E exit 0，逐市场断言匹配；报告同时绑定`apps/web/src/main.tsx`和E2E测试源码SHA：[E2E报告](../../../evidence/audits/2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-1c93141314b58f1a2cd5.json)、[SHA-256](../../../evidence/audits/2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-1c93141314b58f1a2cd5.json.sha256) | normal `ce288bb7-faeb-4ad5-b509-5edd3d186575`; AUTO `2ce7af80-d86e-4b0c-925c-1b3597c2818b`; rejection `f35725f6-07bf-4424-ae52-f5c2af7b0a9f`; recovery `2b082d28-d9f8-47f3-b020-c386d3f03ce3` | 固定AUTO Run可端到端读回；尚无任意成交入口/跨Run比较/告警能力阻塞，父需求仍OPEN |
| AUTO工作流终态复核 | 成交活动结束后，再次按owner/TestRun分别读取CN/US Portfolio与FakeBroker独立资产；精确核对市场、币种、现金、持仓及隔离身份，任一差异阻止Run完成 | V1.5 code suite exit 0（Platform定向16/16、锁版Python Worker 14/14）；四场景隔离Web/API/CLI/export E2E PASS，新断言`V1.5-AUTO-TERMINAL-RECON-001`；[a30代码套件](../../../evidence/audits/2026-10-09-v15-terminal-reconciliation-code-suite-a30.log)、[E2E报告](../../../evidence/audits/2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-230c4258f848db04ca52.json)、[SHA-256](../../../evidence/audits/2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-230c4258f848db04ca52.json.sha256) | AUTO `5a7d84fe-218a-4cc1-b88a-9d7b15a9f2b3`（normal `c20e67a5-c770-4f46-8fd2-f3428c446faa`；rejection `19d88d45-7578-472d-ad22-e2fb70340a21`；recovery `9d7114d7-419a-4866-b0bf-723e233a502a`） | 只证明工作流终态复读/对账，不等于日历日终或多日交易；日终结算、重复交易循环、人工验收仍OPEN |
| 用户人工验收 | 待用户确认 | 不由脚本代签 | 确认人/日期待填 | NOT_RUN |

记录不适用子项的范围依据，不能将必需项改为不适用绕过门禁。归档后在[本版验收表](./99-acceptance.md)填写证据链接和结论。清理只针对本轮已结束的隔离运行，默认保留证据；停止测试不能删除数据库卷或取消无关任务。

2026-10-07 P5受限网络恢复：在随机隔离V1.5项目内仅断开Platform API容器网络3秒后恢复；同一normal Run完成120项权威观察，并通过Web/同Run CLI/export和精确清理。完整记录见[网络中断审计](../../../evidence/audits/2026-10-07-v15-network-outage-e2e.md)。依赖专属分区、双Worker及其它故障仍未验证。

2026-10-07 P5数据库边界瞬态重试子场景：隔离Web/API/CLI/E2E对真实JetStream Run消息在TestRun repository边界注入一次确定性的`DatabaseConnectionError`，实际观察首次NAK、同序号JetStream redelivery及原Run完成120条权威观察；资源精确清理通过。详见[数据库边界重试审计](../../../evidence/audits/2026-10-07-v15-database-retry-e2e.md)。这不代表PostgreSQL进程真实停机/恢复，后者未通过验证，仍为P5未完成项。

2026-10-07 P5数据库重试代码门禁：派发路径加入仅LIVE=false/FakeBroker允许的一次性TestRun repository边界`DatabaseConnectionError`固定注入；隔离E2E实际观察同序号JetStream redelivery、同一Run完成120项。V1.5完整code suite当前树exit 0，原始日志及Hash见[重试后代码套件审计](../../../evidence/audits/2026-10-07-v15-database-retry-code-suite.md)。PostgreSQL进程停机/恢复探针未形成可证的DB错误重试，仍NOT_RUN；此固定注入仅证明异常分类和消息恢复。

2026-10-07 P5 Platform PostgreSQL会话恢复：在消息投递后终止随机隔离数据库中3个`platform_api` backend session；Platform未退出，随后出现新的Platform DB会话，同一Run完成120条权威观察。Web/CLI/export及精确资源清理通过，未观测到NAK且数据库服务保持健康。证据见[PG会话恢复审计](../../../evidence/audits/2026-10-07-v15-database-connection-drop-e2e.md)。这不等价于整个PostgreSQL服务中断/恢复。

2026-10-07 P5数据库会话恢复后的完整代码门禁：`pnpm verify:stage -- --stage V1.5 --suite code` exit 0，Platform 55文件/241项，Python Worker 14/14。全日志及代码Hash见[当前V1.5 code suite报告](../../../evidence/audits/2026-10-07-v15-database-recovery-code-suite.md)。主机/卷灾难恢复、双Worker、交易与日终、备份恢复及人工验收仍未验证。


2026-10-07 P5 PostgreSQL进程故障恢复：初次注入暴露Portfolio Risk、Trade Execution和Quant的idle pool client错误会导致服务退出；失败范围保留于[首次尝试记录](../../../evidence/audits/2026-10-07-v15-database-outage-first-attempt-failure.md)。三个服务现监听脱敏池错误，NO_TRADE Activity采用有界5次重试。隔离E2E中实际终止PostgreSQL进程、恢复同一容器和卷，观察同一序号NAK/重投/ACK及原Run完成120项；浏览器矩阵、CLI/export和精确清理通过，外部行情/真实券商调用0。详见[数据库进程故障审计](../../../evidence/audits/2026-10-07-v15-database-outage-e2e.md)。这不覆盖宿主或卷丢失、备份恢复、交易/日终、故障切换及Ubuntu。


2026-10-07 P5备份工具回归：配对集群备份5/5、定时封存/恢复钩子8/8、保留策略3/3，共16项离线测试通过；详见[备份工具合同审计](../../../evidence/audits/2026-10-07-v1-p5-backup-tool-contract-tests.md)。该测试没有实际捕获或恢复V1数据库、FakeBroker、NATS/Temporal或Artifact卷，不改变隔离备份恢复复选框状态。


2026-10-07 P5 V1.5配对卷备份恢复：独立E2E实际归档PostgreSQL集群、JetStream和Temporal卷，恢复到新卷并重启栈；原normal Run恢复后保持120项权威观察，Temporal Workflow为COMPLETED，NATS durable ACK状态保留，恢复卷清理通过。机器Hash与范围：[审计](../../../evidence/audits/2026-10-07-v15-paired-backup-restore-e2e.md)。该结果只关闭V1.5当前隔离栈的恢复子场景；全V1 Artifact卷、目标Ubuntu及RPO/RTO仍未验。


2026-10-09 V1.5证据路径防覆盖复验：Harness报告按日期/故障类型/隔离项目命名，JSON与SHA sidecar采用exclusive create；碰撞测试证明既有内容不变。`pnpm test:e2e -- --stage V1.5` exit 0，normal `d582d25e-5297-452d-9f6c-433c0543e689`完成120次权威NO_TRADE观测；rejection/recovery仅验证WAITING/NOT_RUN及同Run CLI/export。随机项目`sq-v15-e2e-31c821bcb9084baadd5b`的容器/卷/网络精确清理通过。原始报告与Hash：[运行JSON](../../../evidence/audits/2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-31c821bcb9084baadd5b.json)、[SHA-256](../../../evidence/audits/2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-31c821bcb9084baadd5b.json.sha256)。此项只完成证据保护前置，不关闭交易/日终和拒绝/恢复业务。


2026-10-09 A02抽取后独立复验：定向单测1/1，V1.5隔离E2E exit 0；normal `6ae9fe44-7e98-4801-a1c8-849b235785aa`完成120项NO_TRADE观察，rejection `a3061a64-a1fa-439b-a5b5-c7847fe00616`、recovery `96e885c9-66b2-4927-bb54-1fff3b8ccebb`仍为WAITING/NOT_RUN。报告[JSON](../../../evidence/audits/2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-f975700af5bd364b1c57.json)，SHA-256 `8ac071f41ed5c4693cb6e7a3a40aa0ad064b62f72e2dd41964cba8920ce70c9a`及sidecar。随机隔离资源清理通过。本证据不关闭交易/日终或rejection/recovery业务。


2026-10-09 当前代码门禁复验：`pnpm verify:stage -- --stage V1.5 --suite code` exit 0，完整日志与SHA见[机器输出](../../../evidence/audits/2026-10-09-v15-code-suite.log)及[摘要](../../../evidence/audits/2026-10-09-v15-code-suite.log.sha256)。该门禁覆盖代码、类型、合同、Fixtures和隔离服务检查；业务交易/日终及本阶段拒绝/恢复仍NOT_RUN，不改变第2/7节交付项或人工验收。


2026-10-09 A02 sidecar修复后复验：V1.5隔离E2E exit 0，normal `1adb0e78-48f1-466a-ae7d-fe456c2cc767`完成120项NO_TRADE观察；rejection `1b3efd0b-dd57-4d35-8984-dc683efad8db`及recovery `de63c934-6572-459d-8e07-e6a2ed61462b`为WAITING/NOT_RUN。报告[JSON](../../../evidence/audits/2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-a58ec06b245a3eb3c82f.json)及[SHA-256 sidecar](../../../evidence/audits/2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-a58ec06b245a3eb3c82f.json.sha256)，摘要为`82ba3db8482cd09e52f570b36ee06adc54c93013cbc16b2d4d86d0a8d8deb4bb`。完整V1.5 code suite以修复后的最终工作树exit 0，日志见[code suite](../../../evidence/audits/2026-10-09-v15-code-suite.log)及[SHA-256](../../../evidence/audits/2026-10-09-v15-code-suite.log.sha256)。自动业务范围仍只有normal NO_TRADE；交易/日终/拒绝/恢复与人工验收未通过。


2026-10-09 A09固定AUTO双市场首个纵切：V1.5隔离Web/API/CLI/export E2E exit 0。normal `5376beaf-eb24-49ff-ba51-2691a50bdf8d`完成120项NO_TRADE观察；AUTO `795d12f5-301a-4ecf-844a-1199e9ca9b20`完成CN 100股与US 10股Fixture成交、Mandate授权、Fill Outbox投递、Portfolio现金/持仓与独立FakeBroker核对；rejection `3d40aa8f-a5fb-4e78-8e89-b2c69e9b59e7`及recovery `1e07c29d-a190-47f0-bf5b-d79b0e47e796`当前仍WAITING/NOT_RUN。每个Run均由CLI只读核对并导出；外部来源/真实券商调用0，随机项目资源清理通过。完整机器证据：[E2E JSON](../../../evidence/audits/2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-d21a630d48224b59c757.json)、[SHA-256](../../../evidence/audits/2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-d21a630d48224b59c757.json.sha256)。最新V1.5完整code suite exit 0，含Platform API集成3/3与Python Worker 14/14：[日志](../../../evidence/audits/2026-10-09-v15-code-suite-a10.log)、[SHA-256](../../../evidence/audits/2026-10-09-v15-code-suite-a10.log.sha256)。A09多日交易/日终仍未完成；该切片不代表A10交易拒绝/恢复或当前范围人工验收通过。


2026-10-09 A10拒绝边界定向补强：Mandate激活返回HTTP 409时，应用层断言不调用Trade Execution，也不读取Portfolio、FakeBroker独立资产或对账汇总；V1.5 Platform定向单测11/11通过。该测试未运行真实暂停/跨币种拒绝业务，rejection/recovery后台Run仍NOT_RUN，不关闭A10或第2/7节交付项。


2026-10-09 A10暂停拒绝首个业务切片：Web创建的rejection Run经PostgreSQL Outbox→JetStream→Temporal执行CN/US固定AUTO Proposal；持久Mandate激活后暂停，Trade Execution对两市场请求均返回403，Portfolio现金/持仓与账本版本维持初始化状态，FakeBroker订单、Fill、未决订单、待投递Outbox均为0。隔离Web/API/CLI/export E2E exit 0，定向Platform单测21/21通过；rejection TestRun `0c902e20-b8ab-48ab-b214-dcf671661b7c`，normal/AUTO/recovery Run分别为`9f130088-8650-4f2b-9b4a-920533e77d64`、`06999b1b-fbb4-42c8-bdd8-b2bd4f25014a`、`d170bf5b-655a-4877-a88c-47493f891858`。原始报告[JSON](../../../evidence/audits/2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-3b7841dbda28a30e3efb.json)，SHA-256 `849f01ff026d73b5900a19414c6402729366819090cdf99336ef0979d3289eba`；随机隔离项目资源清理通过，外部行情/真实券商调用0。该切片未独立读取Mandate预算记录，执行接口未提供可核验的内部拒绝码；撤销、在途Fill、UNKNOWN原单查询、错过窗口及故障恢复未完成，recovery Run仍NOT_RUN，不关闭A10或阶段交付项。

2026-10-09 V1.5完整代码门禁复验：`pnpm verify:stage -- --stage V1.5 --suite code` exit 0。Platform API 61个测试文件/284项通过；锁定Linux ARM64 Python Worker 14/14；一次性PostgreSQL Outbox集成3/3；其它构建、lint、类型、合同、Fixture与服务检查通过。报告SHA-256 `58b96fb7835497bbabb00cf8fde1dc1aeaf39bf9b779673b4b0cf440c4654e11`，详见[完整原始日志](../../../evidence/audits/2026-10-09-v15-code-suite-a19.log)及[SHA-256](../../../evidence/audits/2026-10-09-v15-code-suite-a19.log.sha256)。代码门禁不关闭V1.5业务缺项、人工验收或V1总门禁。

2026-10-09 A10跨币种拒绝纵切：同一rejection Run先向真实Governance HTTP入口提交CN/CNY-security/USD与US/USD-security/CNY两种市场币种错配的AUTO_POLICY Proposal，均返回422；随后CN/US正确Proposal各自创建Mandate、暂停并经Trade Execution返回403，Portfolio现金/持仓与账本版本不变，FakeBroker无订单/Fill/Outbox。Web/API/CLI同Run只读检查及证据导出均通过；隔离Harness `sq-v15-e2e-89e86d3b4bf2b311ea91` exit 0、精确容器/卷/网络清理通过、真实来源/券商调用0。rejection Run `09990ca5-4a5e-417f-8096-4a4a026f92cd`，相关normal/AUTO/recovery Run分别为`a8bbe28f-d2b9-4e63-93a3-d1b09d80853b`、`a1b2850e-37f9-4561-b99e-227dabee2b52`、`6432ccfc-26fe-47f0-9355-ec539a4c7736`。报告SHA-256 `dadcfb7a7afec2891b633a0a79c6f0ba1c149e2ac4930efe59bdada731b90745`：[E2E JSON](../../../evidence/audits/2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-89e86d3b4bf2b311ea91.json)。它只关闭跨币种提案边界和暂停拒绝子项；Mandate预算未独立读取、内部暂停拒绝码未核验，撤销/在途Fill/UNKNOWN/窗口/Worker交易恢复及真实恢复业务仍开放；recovery Run仍NOT_RUN，不关闭A10。

2026-10-09 A10治理拒绝原因持久化复验：Trade Execution现在在拒绝响应的`detail.reasonCode`保留Governance决策码；隔离E2E再次通过，并从Run详情断言CN/US `MANDATE_INACTIVE`写入持久`V1.5-OPS-PAUSE-001`。rejection Run `17d9d088-4192-4bda-9447-4aeb0c253753`；normal/AUTO/recovery分别为`de6650b0-3a79-45d4-a5c7-8fc7fdbd116e`、`d5e0195a-2fff-4543-8810-d38606fc5231`、`5062bb74-cc39-45d0-a1de-81498d3c0c60`。Harness `sq-v15-e2e-9b2e26f6645c9152b201` exit 0，真实来源/券商调用0，精确隔离资源清理通过；证据SHA-256 `ea1e12b08f7f1f2d29783a987b792abc3e5ec2089f2d10e03e4a96928145d14`：[E2E JSON](../../../evidence/audits/2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-9b2e26f6645c9152b201.json)。完整V1.5 code suite exit 0，Platform API 61文件/284测试、Qlib Worker 14/14、PostgreSQL Outbox 3/3：[代码门禁日志](../../../evidence/audits/2026-10-09-v15-code-suite-a20.log)。随后补充了owner/TestRun/Mandate版本作用域预算读取及CN/US精确额度消费验证（见[预算汇总HTTP/PG日志](../../../evidence/audits/2026-10-09-v13-mandate-budget-http-pg-a01.log)、[四场景E2E](../../../evidence/audits/2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-0d837e9c09a10e5b6d31.json)）；这不验证多日/日终、撤销/在途Fill、错过窗口和完整Worker交易恢复，仍不关闭A10。

2026-10-09 UNKNOWN recovery纵切：随机隔离项目`sq-v15-e2e-e09b3c5a08f1a6594056`完成正式容器Web/API/CLI/export四场景；恢复Run `1f1e2531-15f8-48c9-9333-ae46a4b861b7`在CN_A FakeBroker接受后丢失响应，原单查询首次被固定故障拒绝，Temporal活动随后使用原namespace/clientOrderId成功查回原订单。US_EQUITY控制单只执行一次；最终独立账本恰有CN/US各1订单和Fill，Outbox无未决项且reconciliation MATCH。Web断言两项PASS，同Run CLI/export均运行；项目容器、网络及卷精确清理，真实行情/券商调用0。机器时序/故障序列/Hash见[隔离E2E审计](../../../evidence/audits/2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-e09b3c5a08f1a6594056.json)。这仅关闭UNKNOWN原单查询子项；拒绝窗口/错过窗口/撤销在途Fill、预算独立对账、多日/日终、完整V1与Artifact恢复、Ubuntu实机及人工验收仍未完成。


2026-10-09 A10 Mandate预算独立读回：AUTO纵切在治理服务激活Mandate后，使用同一owner/TestRun范围独立GET持久记录，逐项核对status、版本/hash、账户/市场/币种/证券范围、maxOrderAmount、maxTotalAmount、maxOrderCount与有效期；任一不符或读回不可用时在FakeBroker下单前失败关闭。CN_A 100股额度CNY 1005.00、US_EQUITY 10股额度USD 250.05均由隔离Web/API/CLI/export四场景E2E通过；normal 120项观察、AUTO/rejection/recovery同Run只读核验和导出均PASS，外部来源/真实券商调用0，隔离资源清理通过。定向Platform单测15/15、Platform build通过。机器证据：[E2E JSON](../../../evidence/audits/2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-a5febd81dd36fb60b172.json)及[SHA-256](../../../evidence/audits/2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-a5febd81dd36fb60b172.json.sha256)。这只证明Mandate配置额度的独立读回，不证明预算reservation/已消费金额的独立查询；撤销、在途Fill、错过窗口及Worker交易恢复、多日/日终与完整V1验收仍开放，不关闭A10。

2026-10-09 V1.5 Mandate额度读回后的完整代码套件：锁定Python Worker镜像`python@sha256:e41613d42d4891e4930f79523f93f81bbc7632584ec65e36ab055f41a800b41e`以禁网Linux容器执行14/14；规定的代码/类型/合同/Fixture、服务测试及隔离PostgreSQL检查均通过。原始日志：[a23 code suite](../../../evidence/audits/2026-10-09-v15-code-suite-a23.log)，SHA-256 `7fd13da84ab63d571e6a497e1c3960dbd7a2777dca0bd1303f9a118f69e061f1`。这是代码套件证据，不替代日终/交易恢复/Ubuntu或人工验收。

2026-10-09预算读回交付及完整套件复验：新增治理预算只读OpenAPI路由、严格Platform身份及owner/TestRun/Mandate版本绑定查询，Platform AUTO Activity在下单后读取实际预留账本并验证终态金额/计数；V1.5 AUTO浏览器E2E分别核对CN CNY 1005.00和US USD 250.05各消费1次、无遗留预留/释放。治理隔离HTTP/PG聚合、Trade身份403、跨owner 404见[日志](../../../evidence/audits/2026-10-09-v13-mandate-budget-http-pg-a01.log)；完整四场景Web/API/CLI/export E2E见[机器报告](../../../evidence/audits/2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-0d837e9c09a10e5b6d31.json)，SHA-256 `04ae8712616cfc4c47c080f0af6f107c32a5eae956d75c42e0ce6f0d889efe9d`。用本机只读确认的锁版Python Worker镜像及隔离Docker环境复跑完整V1.5 code suite exit 0，完整日志[a24](../../../evidence/audits/2026-10-09-v15-budget-readback-code-suite-a24.log)，SHA-256见侧车文件。多日调度/日终、撤销在途Fill、错过窗口、双Worker交易故障和完整配对恢复仍未验证；预算子项完成不代表V1.5关闭。

### 8.7 V1.5数据库迁移CLI集成回归（2026-10-09）

`pnpm test:db:migrate:v1 -- --stage V1.5`及完整V1.5代码套件均运行；隔离PostgreSQL覆盖Platform API、Decision Governance、Trade Execution、Portfolio Risk，空库迁移提示、apply、重复apply和未知版本拒绝均PASS，各临时资源清理已核验。[完整V1.5代码套件日志](../../../evidence/audits/2026-10-09-v15-migration-cli-code-suite-a02.log)及[SHA-256](../../../evidence/audits/2026-10-09-v15-migration-cli-code-suite-a02.log.sha256)；阶段隔离迁移日志见[专项日志](../../../evidence/audits/2026-10-09-v15-migration-cli-a02.log)及[SHA-256](../../../evidence/audits/2026-10-09-v15-migration-cli-a02.log.sha256)。本项只证明代码/隔离迁移，不证明配对恢复、活动部署、完整后台业务验收或用户签署。

### 8.8 Artifact卷只读备份与临时恢复校验（2026-10-09）

运行`pnpm --filter @stockquant/research-automation-service artifact:volume-backup-restore-smoke`，退出0。只读读取`stockquant-v12_research-artifacts-v1`源卷，归档至系统临时目录，再恢复到另一临时目录并逐文件比对；本次33个文件/1945字节匹配，归档SHA-256 `ec8959e61f516cedd5eeb4f722eaef5e3010486adbab8b30237b302e35b9d196`，临时文件清理由脚本完成。详见[运行日志](../../../evidence/audits/2026-10-09-v1-artifact-volume-backup-restore-a01.log)及[SHA-256](../../../evidence/audits/2026-10-09-v1-artifact-volume-backup-restore-a01.log.sha256)。此烟测不停止Artifact写入方，未证明与Platform/领域数据库的时间点配对一致性、完整V1恢复、目标Ubuntu或RPO/RTO；不代表部署备份已就绪。

2026-10-09 V1.5页面续跑增量：验收页将当前TestRun ID保存在浏览器localStorage，normal观察及AUTO订单链均在验收页关闭期间继续，重开后重新读取同一持久TestRun并显示原ID/状态；正式隔离E2E在normal Run创建后执行normal/AUTO场景均关闭原页面并新开页面、断言ID保持不变；AUTO另在页面关闭期间等候后台交易结束，随后完成120项观察和同Run CLI/export。容器化V1.5四场景E2E exit 0，AUTO预算读回、暂停拒绝及UNKNOWN恢复同时通过；最新报告含Web实现与E2E源码Hash：[JSON](../../../evidence/audits/2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-391873c1eb80223c45ee.json)，SHA-256 `0731546fd3501f479326b8f55bf419700d59baa9d840fba95e81143f24361626`。完整V1.5 code suite exit 0：[a27日志](../../../evidence/audits/2026-10-09-v15-auto-closed-page-code-suite-a27.log)及[SHA-256](../../../evidence/audits/2026-10-09-v15-auto-closed-page-code-suite-a27.log.sha256)。此项证明normal观察及AUTO双市场交易均可在验收页关闭期间继续，并可重开返回同一Run，不证明多日AUTO交易、自动日终、关浏览器真实运行观察、成交全链路追溯或用户人工验收。

2026-10-09 A10完成AUTO Run重复派发子项：Harness为既有AUTO TestRun发布新JetStream Msg-ID、相同eventId和原始Fixture payload，观察消费者ACK及`STOCKQUANT_V15_TEMPORAL_WORKFLOW_ALREADY_STARTED`；随后经内部授权读取Trade Execution、Portfolio、Governance，确认总计2订单/2 Fill，CN/US预算reservation/consumed计数各1、Portfolio现金/持仓及账本版本/条目未变化。四场景隔离E2E exit 0，AUTO Run `daf483fb-9996-4c0a-9072-114bb4c88685`；[机器报告](../../../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-9d20807a341936dceaf1.json)，SHA-256 `a39e4f27ca4280f3e02edfb10620379238c7847d3a3099b83eab211af244b2b4`。不覆盖活动中的重复消息、撤销/在途Fill、错过窗口或交易Worker恢复，A10/P5保持开放。

2026-10-09 A11隔离配对卷恢复复验：`STOCKQUANT_V15_E2E_BACKUP_RESTORE=true pnpm test:e2e -- --stage V1.5`以随机项目`sq-v15-e2e-0b9eff3c4bb85ced2ff0`运行，四场景Web/API/CLI/export通过，normal TestRun `8ef52eac-6050-40c9-9aa7-bc9ac821cb31`及AUTO TestRun `b83b2320-519c-4f5d-8240-20e8312f3df4`可读；PostgreSQL、JetStream、Temporal三卷归档并恢复到新隔离卷后，原Run仍为WAITING，`V1.5-HOLD-002` 120项观察PASS，JetStream ackFloor/delivered均为4，恢复卷与原隔离项目资源精确清理通过。恢复Run整体check-only exit 2是因版本门禁另有未完成AUTO断言，不把它计作恢复失败或版本通过。报告[JSON](../../../evidence/audits/2026-10-09-v15-paired-backup-restore-sq-v15-e2e-0b9eff3c4bb85ced2ff0.json)，SHA-256 `91d8f509753dd03461c6280a72ec368ec3f78607fa546cb380cbc9e011e9fb42`。该Harness没有创建独立Artifact卷，不证明V1.1～V1.4 Artifact字节、全域业务ID/账本配对、宿主/异地恢复或实际RPO/RTO；A11/P5仍未关闭。

2026-10-09 A11生产配对备份器隔离端到端验证：`pnpm test:backup:cluster-isolated`在随机PostgreSQL/Artifact项目中使用真实`postgres-init.sql`创建全部10个服务数据库及角色，写入一个内容Hash匹配的合成Published ArtifactRef，运行`create-cluster-paired-backup.mjs`，恢复到独立无网络临时PostgreSQL并核对数据库/角色及ArtifactRef字节SHA。隔离Compose项目容器/网络/卷均已检查为空并清理，活动项目/卷触碰数0；[报告](../../../evidence/audits/2026-10-09-v1-isolated-cluster-paired-backup-4d8fbaa077eb41cc.json)，SHA-256 `90459d47827604beb09ddc0dd56a9ab965ff0c4ef0879a0ab036ad0b464d2a1`。报告只证明生产工具的一次合成隔离恢复，不含真实跨服务TestRun事实、FakeBroker业务账本、NATS/Temporal同一时间点状态、宿主/异地及RPO/RTO；A11仍未关闭。

2026-10-09 A10/P5 在途暂停增量：隔离V1.5 E2E在CN AUTO订单完成Mandate授权后、Portfolio预留及FakeBroker发送前暂停同一Mandate；该已授权订单仍完成Fill/账本入账，后续对同一AUTO Run重复派发后独立账本读数仍为2订单/2 Fill、CN/US Mandate各消费1次且无新增预留/释放。Web/API/CLI/export E2E 1/1通过，外部来源/真实券商调用0，随机项目容器/网络/卷精确清理；[机器报告](../../../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-8fd1dd0df18b40b97b68.json)，SHA-256 `f3e0baf72cff33d68dd7df78aa419d56d5dbd2fa49b2e2b5987aff0af66a8b72`；[运行日志](../../../evidence/audits/2026-10-09-v15-inflight-pause-e2e-a04.log)，SHA-256 `af3410adb9a454691503671f2a50c17e820b61715f380e6e16ddbd574bb9ffed`。这证明固定场景中的暂停/在途授权订单语义和同Run重派幂等，不证明暂停后新订单拦截（现有rejection场景另行验证）、撤销/在途Fill、错过窗口、多日/日终或Worker交易故障恢复。受影响V1.5 code suite未完成：Worker测试因锁定Python镜像在本机不可用而exit 2，详见[日志](../../../evidence/audits/2026-10-09-v15-inflight-pause-code-a01.log)及[SHA-256](../../../evidence/audits/2026-10-09-v15-inflight-pause-code-a01.log.sha256)。A10/P5仍开放。

### 8.9 集群数据库与Artifact配对工具隔离测试（2026-10-09）

仓库根目录运行`pnpm test:backup:cluster-isolated`。命令只创建随机PostgreSQL/Artifact Compose项目，使用锁定仓库的V1初始化SQL生成所有服务数据库/角色，种入合成ArtifactRef后调用正式`create-cluster-paired-backup`，恢复目标为无网络、临时PostgreSQL。脚本核对全DB/角色清单、Artifact引用与SHA及临时项目容器/网络/卷清理；不读写现有活动卷，不调用真实券商/行情。实测报告：[JSON](../../../evidence/audits/2026-10-09-v1-isolated-cluster-paired-backup-4d8fbaa077eb41cc.json)，SHA-256 `90459d47827604beb09ddc0dd56a9ab965ff0c4ef0879a0ab036ad0b464d2a1`。它是合成数据工具测试，不能替代真实业务数据一致性、NATS/Temporal时间点配对、宿主/异地恢复、RPO/RTO或Ubuntu实机验收。

2026-10-09业务事实配对恢复增量：在上述隔离Harness中增加同一TestRun的Platform WAITING记录、FakeBroker FILLED订单/Fill/已送达Outbox，以及Portfolio账户、对应Fill、两条Ledger和10股持仓；生产备份器恢复后校验跨库Run/namespace、订单-Fill-Outbox、双库Fill ID、Ledger与持仓关系均一致。实测PASS，10个数据库/角色及Artifact SHA校验、随机Compose资源清理通过，活动项目/卷触碰0，真实券商/外部来源调用0；[JSON报告](../../../evidence/audits/2026-10-09-v1-isolated-cluster-paired-backup-8b984f5ff18c4e87.json)，SHA-256 `c8c25c4a549734eae34fd274bbc026aadc58eed6febfd4575fe56f13a6f66ec0`。这些是按正式表结构形状写入的合成行，不是服务API生成的真实Run；NATS/Temporal同点恢复、活动Artifact配对、主机/异地恢复、实测RPO/RTO和Ubuntu主机仍开放，故A11/P5不关闭。

2026-10-09业务事实清单强校验复验：备份Retention现检查恢复报告中的TestRun/namespace、UUID业务ID、FakeBroker已送达Fill Outbox、Portfolio owner/run/fill、Ledger版本/条目和持仓数量及各关系断言；无效关系会使清单检查失败并阻止进入保留候选。新增单测9/9通过，包括篡改双库Fill关联后的拒绝；隔离Docker配对恢复再次PASS，报告[JSON](../../../evidence/audits/2026-10-09-v1-isolated-cluster-paired-backup-2f0c1de2e66d49b7.json)，SHA-256 `8795ec7ee1aef81c6000ff9788ecc941c9e641c3410f8b50765bf89c141d444f`，运行日志[SHA-256](../../../evidence/audits/2026-10-09-v1-isolated-cluster-paired-backup-business-facts-a01.log.sha256)。严格校验提升合成配对证据的完整性，不改变其合成性质或A11剩余缺口。

2026-10-09 A11来源复现信息补齐：隔离配对恢复报告新增备份/校验脚本、PostgreSQL初始化SQL的逐文件SHA-256，记录Mac arm64、Node v24.1.0及实际PostgreSQL/辅助容器镜像ID；恢复全10数据库/角色、Artifact SHA和合成业务关联均PASS，临时资源精确清理，活动卷触碰0。[最新JSON](../../../evidence/audits/2026-10-09-v1-isolated-cluster-paired-backup-2d597dbd749e4b19.json)，SHA-256 `c41975b628b3de9039105af546c16af35531a85f4ed21b56778c7be2a6f45bcc`；完整控制台日志[SHA-256](../../../evidence/audits/2026-10-09-v1-isolated-cluster-paired-backup-source-manifest-a01.log.sha256)。此补充使该隔离运行可追溯，但仍不证明同点NATS/Temporal恢复、真实服务生成Run或Ubuntu/异地/RPO/RTO。

### 8.9.1 四卷同点恢复增量（2026-10-09）

复验命令：`STOCKQUANT_V15_E2E_BACKUP_RESTORE=true pnpm test:e2e -- --stage V1.5`。正常Web场景实际创建TestRun `ba1c0f0d-324b-42a8-b550-bfc3463592f7`并完成120项HOLD观察；Harness随后在停止整个隔离栈后，对PostgreSQL、NATS JetStream、Temporal SQLite和research Artifact四卷记录归档SHA/字节数，恢复至四个新卷并启动恢复栈。CLI从恢复PostgreSQL读回同一TestRun与120项断言，Temporal读回原Workflow完成历史，JetStream ackFloor/delivered均为4；research_automation库读回与TestRun sourceRef关联的PUBLISHED ArtifactRef，Artifact卷字节SHA与该Ref一致。浏览器normal/AUTO/rejection/recovery矩阵1/1通过，实际ArtifactRef与内容为隔离测试合成输入，不调用真实券商或外部行情；源/恢复项目容器、卷、网络和镜像精确清理验证通过。完整JSON：[报告](../../../evidence/audits/2026-10-09-v15-paired-backup-restore-sq-v15-e2e-a378990c03fcf9de8260.json)，SHA-256 `0b967d9c34356b22ccef16adaabcd9c7cf5f3c858a584001062752349cef937a`；Harness运行日志[SHA-256](../../../evidence/audits/2026-10-09-v15-four-volume-paired-restore-e2e-a01.log.sha256)。此结果补齐同一V1.5隔离点四卷恢复，不证明Artifact服务API产生该Ref、V1.1～V1.4真实Artifact/回测/模型配对、生产备份调度、目标Ubuntu、异地复制或实测RPO/RTO，故全V1/P5仍开放。

### 8.10 Mandate暂停后的在途授权订单（2026-10-09）

复验命令：`pnpm test:e2e -- --stage V1.5`。脚本仅启动随机隔离V1.5 Compose项目，设置8秒测试暂停点；当同TestRun CN AUTO订单完成Mandate授权后，在Portfolio资源预留及FakeBroker发送前通过Governance受权暂停Mandate。Harness紧接着以相同owner、TestRun、账户、Mandate和Proposal提交一个唯一的新订单请求，收到403/`MANDATE_INACTIVE`，且拒绝发生在预留/FakeBroker前；原已授权CN订单仍完成Fill/账本入账。随后相同AUTO Run重复派发被稳定Temporal Workflow ID幂等吸收；独立Trade/Portfolio/Governance账本读回仍为2订单/2 Fill，CN/US Mandate各消费一次，未增加预留或释放。Web/API/CLI/export四场景E2E 1/1通过；TestRun `f29f31f1-b357-44f9-b201-387a50077807`。机器报告：[JSON](../../../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-91f6525571ab14125e64.json)，SHA-256 `14a502642c21f5230681745240633fe0fad5a7a033d5629e09e37fd2d24a6b99`；[完整运行日志](../../../evidence/audits/2026-10-09-v15-inflight-pause-e2e-a05.log)及[SHA-256](../../../evidence/audits/2026-10-09-v15-inflight-pause-e2e-a05.log.sha256)。运行期间外部来源/真实券商调用0，随机容器、网络、卷均精确清理。该结果不覆盖撤销/在途Fill、多日/日终、窗口遗漏或交易Worker故障恢复。本次代码最终套件`pnpm verify:stage -- --stage V1.5 --suite code` exit 0，包含锁定Python Worker 14/14、服务检查及隔离PostgreSQL迁移/集成测试：[missed-window a25日志](../../../evidence/audits/2026-10-09-v15-missed-window-code-suite-a25.log)及[SHA-256](../../../evidence/audits/2026-10-09-v15-missed-window-code-suite-a25.log.sha256)。


### 8.11 AUTO单日Fixture收盘对账（2026-10-09）

复验命令：`pnpm test:e2e -- --stage V1.5`。AUTO场景读取冻结输入`fixtures/v1/v1.5/auto-trade-calendar.json`（版本`v1.5-auto-trade-calendar-1`，SHA-256 `a2d16e34a79594304a52bbd690c9f276e69edf98e19984e383d0a6360345c854`），每市场列出`2026-01-05`和`2026-01-06`两个合成窗口。AUTO在首日收盘后记录`MISSED_WINDOW`且不创建过期订单；次日重新创建TestRun范围Proposal/Mandate后执行，Fill位于本地开盘（含）与收盘（不含）之间，收盘后重新读取Portfolio与独立FakeBroker资产并匹配，保存`V1.5-AUTO-EOD-RECON-001`及`V1.5-AUTO-MISSED-WINDOW-001`。Web显示次日两市场收盘UTC时间和错过窗口结果，同Run CLI只读核验并导出。该日历为合成Fixture，不宣称真实交易所日历或结算规则。

最终源码快照隔离E2E报告：[JSON](../../../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-0dfba7eada488cb3a0fa.json)，SHA-256 `b05ab89db705c89ee95cf3f9a259a77b2a7c3ff3c00d7b62a1bb9001a046c741`；完整命令日志：[E2E日志](../../../evidence/audits/2026-10-09-v15-single-session-eod-e2e-a02.log)及[SHA-256](../../../evidence/audits/2026-10-09-v15-single-session-eod-e2e-a02.log.sha256)。normal/AUTO/rejection/recovery四场景Web/API/CLI/export均通过；Run分别为`535c55a8-7731-4882-bff2-acb10df409e1`、`10375744-6480-4c7d-9bf3-403d063292d7`、`ee22a041-3455-4ad6-99b6-c83a50d1f2f5`、`70bc5c3d-0ddf-4f4a-8d22-f0319b753b78`；外部来源/真实券商调用0，随机容器/网络/卷精确清理。单日合成时钟不是实时等待，也不证明多日交易循环、交易所日历正确性、结算/可用现金规则、错过窗口处理或交易故障恢复。完整代码套件复验日志和Hash见[code suite a02](../../../evidence/audits/2026-10-09-v15-single-session-eod-code-suite-a02.log)。


### 8.12 AUTO活动Workflow重复派发（2026-10-09）

复验命令：`pnpm test:e2e -- --stage V1.5`。随机隔离V1.5栈在AUTO TestRun的CN_A Temporal Activity已启动、Workflow尚未完成时，以相同eventId/TestRun和新的JetStream Msg-ID发布重复消息；观察consumer ACK floor到达新序号，Platform记录`STOCKQUANT_V15_TEMPORAL_WORKFLOW_ALREADY_STARTED`并复用稳定Workflow ID。随后正常完成四场景Web/API/CLI/export矩阵，并对CN/US独立读取FakeBroker、Portfolio和Governance预算：两市场各1订单/1 Fill，Mandate各消费1次，现金、持仓、ledgerEntryCount和ledgerVersion未因重复派发增加；外部来源/真实券商调用0，随机项目卷/网络/容器已精确清理。

E2E报告：[JSON](../../../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-38f6de33ef35ba78617c.json)，SHA-256 `cfe31f82c8e61f88d3113208d6d2a0467156b8d639c9a81da023c516418aa1dc`；完整运行日志：[日志](../../../evidence/audits/2026-10-09-v15-active-auto-duplicate-e2e-a03.log)，SHA-256 `f53c8e404549170f77de9ef8ac1f40f5a296fe9322d1152aa65e693d25922414`。场景Run IDs：normal `7aca106b-a17c-43b9-af58-24eaf0231380`、AUTO `1adfadaf-afe1-49a3-86fe-5bebd4e70970`、rejection `c34de50a-af15-4480-a1fb-8f44ae7a5588`、recovery `8000ac4a-0b49-431d-ad05-f87c3f50176e`。该证据仅关闭活动/完成Workflow重复投递幂等子项；恢复/取消语义、在途Fill取消、错过窗口及业务交易Worker故障切换仍未验证。


### 8.13 AUTO错过首日窗口并于次日重评估（2026-10-09）

复验命令：`pnpm test:e2e -- --stage V1.5`。冻结日历现为每市场两日；AUTO执行路径选用第二日时钟，首日只保留`MISSED_WINDOW`决定记录，不创建旧日订单，次日建立新的Proposal/Mandate后各市场仅成交一笔。Web断言两市场窗口决定、无过期订单、次日收盘双账本匹配；同Run CLI以`--check-only`核对并导出证据。

四场景E2E报告：[JSON](../../../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-6e7301d0edfd5bcdb496.json)，SHA-256 `42461ec13ef7eb08c42ba5e20fba571c498a3bb26a5c9595e405e6d502bf5906`；Run IDs：normal `9029cd9d-3ce8-497b-93fa-9c8373915a9a`、AUTO `e05cf69d-745f-4a96-b1b3-156fc4aceb2f`、rejection `fc5c1215-c7e8-434b-afa1-bbe5da288bb1`、recovery `33beef16-8ef2-4a9c-ad60-79466a297eca`.Web/API/CLI/export通过，外部来源/真实券商调用0，隔离资源精确清理。此Fixture仅验证错过窗口策略分支，不证明真实时钟延迟调度、多日循环、交易所日历或结算；当前范围人工验收仍NOT_RUN。V1.5完整代码门禁在该改动后再次exit 0：[日志](../../../evidence/audits/2026-10-09-v15-auto-cancel-code-suite-a02.log)，SHA-256 `c66797f78d8f83324ed73011c548c07297d46d8befa933f2202fff7ae185c27b`。V1正式门禁仍exit 2/INCOMPLETE，原因含四个历史TestRun缺结构化证据导出，见[门禁日志](../../../evidence/audits/2026-10-09-v1-version-gate-auto-cancel-a02.log)。

### 8.14 AUTO三日Fixture两次执行与逐日收盘对账（2026-10-09）

复验命令：`pnpm test:e2e -- --stage V1.5`。冻结输入为`fixtures/v1/v1.5/auto-trade-calendar-2.json`，版本`v1.5-auto-trade-calendar-2`，CN_A/US_EQUITY各含2026-01-05、06、07三个合成交易日；首日窗口错过且没有过期订单，随后两日每市场分别创建独立Proposal/Mandate及FakeBroker Order/Fill。四笔交易均在对应Fixture开盘后、收盘前成交；每个执行日分别对Portfolio和独立FakeBroker现金/持仓进行收盘复核。Mandate按日设置和暂停，第二日授权预算不会与第三日并存；首日错过策略、订单幂等、NATS/Temporal重复派发、暂停拒绝、UNKNOWN原单恢复均在同一隔离Web/API/CLI/export运行中验证。Web页面核对每笔Proposal/Mandate/Order/Fill、Mandate预算、Outbox及逐日收盘账本；同一TestRun经CLI`--check-only`复核并导出。

四场景E2E报告：[JSON](../../../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-aede7e79765691df51db.json)，SHA-256 `79ee291fc37992e32f6c781d85be0542ab7e6d6dd053718b1dd857673b3414a5`；Run IDs：normal `1a0dbb2a-8f7e-4326-ab19-8092a052ddc6`、AUTO `677a2a13-ac5c-4989-8059-66f525d0e330`、rejection `3b95ebcf-588f-4693-928c-55d8b4a0dc93`、recovery `214175d3-4721-42c9-8549-735b3721b648`。同一源码版本V1.5 code suite退出0，包含基线/合同/Fixture检查、服务和隔离PostgreSQL迁移/集成、Platform Outbox原子性3/3：[日志](../../../evidence/audits/2026-10-09-v15-multi-session-code-suite-a01.log)，SHA-256 `c872609248da52cef548fe4756f4a786962a78bd51cb241bfd4180e021ab219d`。外部数据/真实券商调用0，隔离项目资源精确清理。本子项只证明固定合成Fixture的两次交易及日终账本核对，不证明真实交易日历、连续实时时钟/策略调度、T+1/结算现金语义、撤销/在途Fill、交易Worker故障切换或真实Ubuntu；当前范围人工验收仍`NOT_RUN`。


### 8.15 当前Run成交级链路选择复验（2026-10-09）

改动：在`/acceptance/v1/v1.5`成交链路区增加“选择成交追溯”下拉框，选项来自当前TestRun的实际Fill记录；选择某笔后展示该成交对应的Proposal、Mandate、FakeBroker Order/Fill、Outbox、Portfolio与FakeBroker现金、预算消耗。空成交Run不生成选择项，也不伪造追溯结果。

复验命令：`pnpm test:e2e -- --stage V1.5`。最新隔离报告[JSON](../../../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-45fbf478d4dcba196115.json)，SHA-256 `64f5c9d9146e1d22d5cfad78c78b65a3c48dcc0dc5f8432bc7dffe31d85fa752`；normal `10427460-86d7-4644-a100-e49da443bac7`、AUTO `d676e973-8f47-4262-96b7-474763036c21`、rejection `4eb96741-e264-49d2-a027-8db1e9634f59`、recovery `eca5ebf1-80a3-4e40-b0b7-ae17e948da9c`。AUTO Run的四笔成交均出现在选择器中；E2E逐一切换并核验每笔Fill、Proposal、Mandate、订单及两本账现金。完整V1.5 code suite退出0：[日志](../../../evidence/audits/2026-10-09-v15-fill-trace-selector-code-suite-a03.log)，SHA-256 `7517bf3fa02d52ab78f01b450d48bf9b7837481bdbd1358714e6c3436caf0496`；独立E2E终端日志[SHA sidecar](../../../evidence/audits/2026-10-09-v15-fill-trace-selector-e2e-a02.log.sha256)。四场景E2E 1/1，外部数据/真实券商调用0，临时容器/卷/网络精确清理。此项只关闭固定V1.5 Run成交选择与显示子项；不证明任意阶段/跨Run追溯、告警/能力阻塞、结算或人工验收。

### 8.16 Trade Execution提交后重启与原单恢复（2026-10-09）

隔离E2E通过V1.5测试专用故障钩子，在CN_A AUTO第一执行Session中让FakeBroker持久提交Order/Fill并记录待返回边界；Harness随后终止Trade Execution容器，再以原PostgreSQL卷启动同一服务。Temporal Activity遇到断连后重试，Governance返回同一Mandate Reservation，Trade Execution通过原`clientOrderId`读取已提交订单，继续预算结算、Fill Outbox投递和最终双账本对账。Hook只有在`STOCKQUANT_V13_TEST_FAULTS_ENABLED=true`、LIVE关闭、`BROKER_MODE=FAKE`且精确命中V1.5首个CN session订单时运行；非隔离业务没有该启用配置。

命令：`pnpm test:e2e -- --stage V1.5`。四场景E2E JSON：[报告](../../../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-9ab3f1b90438b7f715eb.json)，SHA-256 `1886eae2af5356c2b347f8b339a51489de069753f32e8ae65ffa57929d6611f7`；AUTO Run `90567c92-04e2-445e-a1cf-f6d354c24755`。Machine fault sequence严格记录“FakeBroker提交→杀停Trade→重启Trade→Temporal按同一clientOrderId查询原单”；最终四场景均PASS，外部来源/真实券商调用0，随机项目容器/卷/网络精确清理。完整V1.5 code suite退出0：[日志](../../../evidence/audits/2026-10-09-v15-trade-worker-restart-code-suite-a01.log)，SHA-256 `89168b7cb6bd158ec2982f4e5ce4b3768131db7c11fbcc9ad51c5a38eb55fb41`。E2E输出日志[SHA sidecar](../../../evidence/audits/2026-10-09-v15-trade-worker-restart-e2e-a01.log.sha256)。本子项关闭Trade单服务进程重启后的原单恢复路径；多Worker接管、取消/在途Fill、真实时钟运行、OD-014结算、Ubuntu及人工验收仍未完成。

### 8.17 Platform dispatch Worker 故障接管（2026-10-09）

命令：`STOCKQUANT_V15_E2E_WORKER_FAILOVER=true pnpm test:e2e -- --stage V1.5`。隔离E2E报告：[JSON](../../../evidence/audits/2026-10-09-v15-worker-failover-sq-v15-e2e-17f973b67e6e20e35f29.json)，SHA-256 `04785fad1307daea62fbdfaeb7f6e26c15cd29ec6d09148eca401abe2b29a403`。normal Run `f8452489-f768-40b6-9814-06a0365c025a`的主/备用Platform durable均收到seq=1后，Harness在备用读取前实际终止主Platform容器；备用Worker启动同一Run的CN_A Activity并ACK原消息，主API恢复，Run完成120项权威读取。另三个标准场景也通过：AUTO `27d347dd-d7bb-4247-8209-c109ae54b109`、rejection `76a884f4-abec-40d6-8865-1dd0593559d1`、recovery `4483cf23-115a-410c-9d34-7be646c34def`。外部来源/真实券商调用0，隔离Compose容器、网络和卷精确清理通过。此结果证明Platform dispatch Worker单进程接管；不证明Trade执行中的业务Worker故障切换、在途撤单竞态、真实多日运行或人工验收。


### 8.18 Trade Execution提交后工作实例故障与备用实例接管（2026-10-09）

在隔离V1.5栈内执行 `STOCKQUANT_V15_E2E_TRADE_FAILOVER=true pnpm test:e2e -- --stage V1.5`。Harness启动第二个Trade Execution实例，连接同一隔离PostgreSQL并注册 `trade-execution-service` 服务别名；AUTO FakeBroker订单已提交、HTTP响应尚未返回时，实际终止主实例。Temporal重试同一命令，由备用实例按原 `clientOrderId` 查询已提交订单。

故障时序：备用实例健康并加入共享服务别名 → AUTO Run `21caf4d1-ecd3-466a-a518-b7d429ac086f` 的主Trade实例提交订单后被终止 → 备用实例恢复同一 `clientOrderId=v15-auto-CN_A-21caf4d1-ecd3-466a-a518-b7d429ac086f-session-2` → normal、AUTO、rejection、recovery四场景及各自同Run CLI/export通过。其余Run分别为 `df2da7f6-8890-41d8-82a5-37343296faeb`、`688f1c87-e0d3-4a48-ad7c-33ba76b1fef1`、`67e7d5da-0c45-412c-920f-e80334089a37`。机器报告记录外部来源/真实券商调用均为0、隔离项目资源精确清理为true。

报告：[JSON](../../../evidence/audits/2026-10-09-v15-trade-worker-failover-sq-v15-e2e-75b262d7e2b9d8fa1806.json)，SHA-256 `f89d797ec555d475936a26156724aa6df81eb0e8264d8e82e88bf36b56bde307`；可复现命令如上。场景期望：四个浏览器场景与同Run CLI/export通过，故障序列含提交后终止及备用实例按相同clientOrderId读取原单，隔离资源完成清理。该证据覆盖单实例故障后的交易命令恢复，不证明取消/在途Fill、多实例同时故障、实时时钟延迟、真实市场结算或全V1备份恢复。


本轮完整V1.5代码套件复验：`pnpm verify:stage -- --stage V1.5 --suite code` exit 0；锁定Python Worker在禁网ARM64容器中通过，服务单测、构建/lint/typecheck、隔离PostgreSQL迁移及V1.5专项集成检查均通过。完整日志：[代码套件](../../../evidence/audits/2026-10-09-v15-trade-worker-failover-code-suite-a01.log)，SHA-256 `7fd5ebaf89845e57507f654130cad5195867f83f5e276a01ae464ed85f5e3da1`。需求交叉索引按本轮逐项复核41个证据路径、5个精确测试名和当前阶段锚点均匹配（[审计A05](../../../evidence/audits/2026-10-09-v1-crosswalk-trade-failover-refresh-a05.json)）；首次检查发现并更正一个陈旧测试标题，失败审计保留。

### 8.19 AUTO TestRun取消与当前授权Fill收尾（2026-10-09）

复验命令：`STOCKQUANT_V15_E2E_AUTO_CANCEL=true node scripts/test-v15-web-e2e-isolated.mjs`。脚本构建并启动随机隔离V1.5 Compose项目（容器化Web/API、PostgreSQL、NATS JetStream、Temporal及领域服务），LIVE保持关闭且FakeBroker启用。浏览器在CN_A Mandate授权后、FakeBroker发送前等待固定授权marker，再点击“取消后续 AUTO 订单”；API将取消请求与requestedAt写入同一owner/TestRun持久证据。当前已进入执行的CN订单完成唯一FakeBroker Order/Fill与Portfolio账本核对，Worker读到取消请求后不再发送后续CN/US窗口订单。

本轮E2E exit 0，normal/AUTO/rejection/recovery Web/API/CLI/export矩阵通过；AUTO Run `3de298ac-3981-4e12-9c2b-657785dc5144`，Mandate `41191ff9-f9fe-5699-a29c-7ae2fbaf53a1`，Proposal `c41ae758-48f7-49f8-a771-18e9e5f72984`，clientOrderId `v15-auto-CN_A-3de298ac-3981-4e12-9c2b-657785dc5144-session-2`。结构化报告明确记录“Web取消在授权之后、FakeBroker之前”“完成Order/Fill=1”“laterSessionOrdersCreated=0”“独立对账MATCH”“AUTO-CANCEL PASS / 完整AUTO ORDER WAITING / AUTO RECON PASS”；真实来源与券商调用均为0，随机项目容器、卷、网络清理验证通过。报告[JSON](../../../evidence/audits/2026-10-09-v15-auto-trade-cancellation-sq-v15-e2e-967e0b65c09fe54c5332.json)，SHA-256 `2b41b3eb1fa48082f635f8799ccc2756427e5d5b27defc53ba33edc25a2d54c5`。

此证据只关闭AUTO TestRun级取消请求和在途授权订单收尾切片；它不表示券商订单撤销/部分成交竞态已完成，也不把被取消的Run记作完整AUTO通过。取消Run保持WAITING，完整AUTO订单断言保持WAITING；人工验收仍NOT_RUN。V1.5完整代码门禁在该改动后再次exit 0：[日志](../../../evidence/audits/2026-10-09-v15-auto-cancel-code-suite-a02.log)，SHA-256 `c66797f78d8f83324ed73011c548c07297d46d8befa933f2202fff7ae185c27b`。V1正式门禁仍exit 2/INCOMPLETE，原因含四个历史TestRun缺结构化证据导出，见[门禁日志](../../../evidence/audits/2026-10-09-v1-version-gate-auto-cancel-a02.log)。

#### 8.19.1 可复跑Web交接（2026-10-09）

仓库根目录执行：`STOCKQUANT_V15_E2E_AUTO_CANCEL=true node scripts/test-v15-web-e2e-isolated.mjs`。只使用Docker Desktop的隔离V1.5 Compose Harness；脚本随机分配loopback端口并在启动输出与JSON报告记录本次`webUrl`/`apiHealthUrl`，LIVE固定`false`、broker固定`FAKE`。最近复验URL为`http://127.0.0.1:60016/acceptance/v1/v1.5`，API健康地址`http://127.0.0.1:60015/live`；它们只在该次栈运行期间有效，脚本结束会删除项目容器、卷、网络和镜像。浏览器测试超时600秒，服务就绪探针最多30秒。

自动化在正式页面`/acceptance/v1/v1.5`选择“**双市场 Fixture 自动交易**”，点击“**准备 V1.5 场景**”；收到CN_A Mandate授权marker后点击“**取消后续 AUTO 订单**”。冻结交易输入为`fixtures/v1/v1.5/auto-trade-calendar-2.json`，manifest为同目录`auto-trade-calendar-2-manifest.json`；本次输入SHA-256 `793e573513c39431f4ba5019d35cec8d5c9d73f4b7c4c53777b3c71472893afc`，manifest SHA-256 `d8a7e2adf550c67404cf874551b5aa2f2587c00952b479ef2829b8866fcf6b01`。本次E2E exit 0，浏览器用例标题`V1.5 normal, isolated AUTO trade and paused-mandate rejection use durable workflows`；AUTO Run `fbe42efd-59b3-41a3-b997-f7be6f628f2f`。预期API请求持久化、该Run产生1个Order/1个Fill、后续订单0、对账MATCH；Workflow完成后相同取消请求重试仍返回HTTP 202和同一`requestedAt`，不增加历史快照。`V1.5-AUTO-CANCEL-001`与`V1.5-AUTO-RECON-001`为PASS，完整AUTO断言`V1.5-AUTO-ORDER-001`为WAITING。脚本另对同Run执行CLI check-only与证据导出，WAITING时check-only退出2是预期观察，不表示业务失败。完整机器报告[JSON](../../../evidence/audits/2026-10-09-v15-auto-trade-cancellation-sq-v15-e2e-dd8affc13398a8448de9.json)，SHA-256 `24804e8977c63961a2d5e2e6c705c175f391808b41b43b81b7b217f674dcc2a6`；控制台日志[SHA-256](../../../evidence/audits/2026-10-09-v15-auto-cancel-idempotency-a04.log.sha256)。报告还记录完成后重试事件。

失败时脚本保留平台日志和失败报告，并在finally精确停止该随机Compose项目、删除其卷/网络/镜像并核实资源不存在；以E2E进程退出码判断整体成功，不能把已有202或单个PASS marker当成通过。该复跑仍是自动浏览器验收，不是用户手动签署或真实交易日观察；真实手动验收保持NOT_RUN。 AUTO取消改动后的完整`pnpm verify:stage -- --stage V1.5 --suite code`也exit 0，含锁版Python Worker、服务检查、隔离PostgreSQL迁移/专项集成（4/4）；[日志](../../../evidence/audits/2026-10-09-v15-auto-cancel-idempotency-code-suite-a03.log)，SHA-256 `a1b575165960958b7e53b64c3af4d99d54a76842c40e8c00c3e4747a056e191d`。

#### 8.19.2 FakeBroker提交后响应窗口中的AUTO取消（2026-10-09）

使用同一Harness命令：`STOCKQUANT_V15_E2E_AUTO_CANCEL=true node scripts/test-v15-web-e2e-isolated.mjs`。本次Harness将CN_A执行暂停点从“Mandate授权后、FakeBroker前”推进至“FakeBroker已提交、Trade HTTP响应待返回”：观察Trade日志中的`V15_AUTO_RESPONSE_PENDING_BEFORE_TRADE_RESTART`标记，确认目标`clientOrderId`为session-2后，在正式V1.5页面点击“取消后续 AUTO 订单”。注入只存在隔离测试配置，LIVE关闭且FakeBroker启用。

AUTO Run `71dd227e-5ff7-4c8a-89e6-544189b39e8e`在持久FakeBroker已有订单的窗口收到取消；结果保持1 Order/1 Fill，Outbox已送达、无待处理/未知订单，独立对账`MATCH`，后续session订单0。完成后重试同一取消请求返回原202与`requestedAt`。Playwright 1/1通过，完整normal/AUTO/rejection/recovery Harness exit 0，真实来源/券商调用0，随机容器/卷/网络精确清理。报告[JSON](../../../evidence/audits/2026-10-09-v15-auto-trade-cancellation-sq-v15-e2e-64e119e1e01cdbd2515d.json)，SHA-256 `bcaf2671da2a1d59ae5d4a67c3ddfa04002ed8cade44e8cd48424c56b1569446`；Harness日志[SHA-256](../../../evidence/audits/2026-10-09-v15-auto-cancel-after-commit-e2e-a01.log.sha256)。这证明AUTO Run取消与已提交订单响应丢失窗口的幂等恢复；取消请求仍不撤销已提交FakeBroker订单，券商订单撤销/部分Fill仲裁、真实时钟与人工验收仍开放。Run的AUTO全量完成断言仍WAITING，不记为完整AUTO成功。


#### 8.19.3 AUTO取消请求的注入时钟（2026-10-09）

取消应用服务从Platform容器注入的`Clock`读取请求事件时间，不在V1.5 HTTP控制器直接调用`new Date()`。新增单测以固定Clock验证持久化仓储收到的`requestedAt`；运行时仍记录取消发生时的事件时间，不改变策略、授权、订单或结算使用的Fixture时钟。

专用Harness命令：`STOCKQUANT_V15_E2E_AUTO_CANCEL=true node scripts/test-v15-web-e2e-isolated.mjs`。复验在FakeBroker已提交、Trade响应待返回时，从正式Web发起取消；请求时间被持久化，完成后重试返回相同时间，当前Fill完成、后续订单0、独立账本`MATCH`。normal/AUTO/rejection/recovery四场景、同Run CLI/export、Playwright 1/1通过，外部来源/真实券商调用0，随机Compose资源清理通过。TestRun：AUTO `4a338ca8-b612-4770-9e88-2b01c5a8c4cf`；完整报告[JSON](../../../evidence/audits/2026-10-09-v15-auto-trade-cancellation-sq-v15-e2e-398bd38ec91b610d9653.json)，SHA-256 `eae703cdb96c21b2e8a396d0ca1de7382b61c9d42bf1fedbece4141c93687cb2`。报告源码Hash清单包含取消应用服务、固定Clock单测、控制器和Harness。V1.5完整代码套件exit 0：Platform 62个测试文件/298项测试通过，锁版Linux Python Worker 14/14，隔离PostgreSQL检查及迁移通过；[日志](../../../evidence/audits/2026-10-09-v15-cancellation-clock-code-suite-a03.log)，SHA-256 `bfab65dee705c627db4fd918f6b61e1efd50c94d5a11e637918700a87b49a078`。此补强不关闭FakeBroker订单撤销/部分Fill仲裁、真实延迟调度或人工/Ubuntu验收。

#### 8.19.4 AUTO FakeBroker撤单与部分Fill竞态（2026-10-09）

复验命令：`STOCKQUANT_V15_E2E_AUTO_CANCEL=true node scripts/test-v15-web-e2e-isolated.mjs`。Harness在CN_A session-2 FakeBroker订单已持久提交、Trade HTTP响应被固定延迟时，从正式V1.5页面提交Run取消。Platform通过Trade领域API依次记录broker sequence 1的25/50股部分Fill、sequence 2撤单请求及权威`CANCELLED`结果；Fill Outbox送达后Portfolio确认未成交余量的reservation为`RELEASED`。此路径实际验证V1.5编排与Trade/FakeBroker/Portfolio，不是仅设置Run取消标志。

AUTO TestRun `7c1b3790-bb9e-4d2a-b063-516066e21c8b`：订单`b1ab899e-a1c2-4999-9277-0d74cb385fd7`最终`CANCELLED`，Fill为25股、价格10.0000、费用2.5000；后续session订单0，双账本`MATCH`且pending Outbox、未决订单均为0。完成后同一取消重试返回HTTP 202、原`requestedAt`及相同取消事实。normal/AUTO/rejection/recovery四场景Playwright 1/1、同Run CLI/export、隔离资源清理通过；外部源/真实券商调用0。完整报告[JSON](../../../evidence/audits/2026-10-09-v15-auto-trade-cancellation-sq-v15-e2e-4e5746d1118a6280c5e6.json)，SHA-256 `6093961118e6cf735b5c145bfc1fc446e0b889c54ecb9ca4d7d12db20a285f81`；全量V1.5代码套件exit 0，Platform 62文件/299项测试、Python Worker 14/14及隔离数据库/迁移/合同检查通过，[日志](../../../evidence/audits/2026-10-09-v15-auto-cancel-partial-fill-code-suite-a01.log)，SHA-256 `3c3cd78fca1d38f80b45599bf4093624757a3598b00fad52d36cdb8b81352150`。报告绑定本轮41个源文件Hash。

此证据关闭V1.5 AUTO在该固定响应窗口下的撤单/部分Fill切片，不关闭真实交易日历/结算、连续时钟调度、多故障Worker、完整V1恢复、Ubuntu或当前范围人工验收；阶段仍`PARTIALLY_IMPLEMENTED`，AUTO Run仍按实际取消状态记录，不算完整AUTO正常完成。


### 8.20 Platform API身份边界与当前E2E复验（2026-10-09）

执行`pnpm test:e2e -- --stage V1.5`。Harness从控制器源码提取场景列表、Run创建、TestRun读取和取消四条受保护入口，并分别验证匿名401（4/4）及伪造owner 403（4/4）；控制器路由清单匹配。完整隔离流程normal、AUTO、rejection、recovery均执行，浏览器创建的Run由同Run CLI/export复核，随机Compose容器/卷/网络精确清理；外部来源与真实券商调用均为0。TestRun：normal `ad841d0c-9c96-4a31-b6df-edc3f03d6527`、AUTO `5686fea3-c4bd-4d05-a961-c261b8bbbe7e`、rejection `35bcbb52-95cc-44b2-a124-1e47bf97c535`、recovery `28e2cbfb-0ebc-4ad8-93af-09915e44863b`。机器报告[JSON](../../../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-b9494057151e8fb7fb4f.json)，SHA-256 `1e03d58f4cd19022a3957460902c52fbf7371f192e121f45264f611345794e1f`；[执行日志](../../../evidence/audits/2026-10-09-v15-platform-identity-e2e-a02.log)，SHA-256 `621c4b2d2de7f5dbea48dbfe1b64c98bb98f43d43ff895b684d9a4f1adac5925`。首次运行暴露AUTO Fill固定Clock时间断言与实现的`runClockNow + 1秒`不一致；E2E已按确定性实现改为精确验证该时刻，失败日志保留。此矩阵和E2E不替代连续调度、完整业务恢复、结算、Ubuntu或人工验收；阶段仍`PARTIALLY_IMPLEMENTED`。

### 8.21 Owner范围V1.5运行历史与并排比较（2026-10-09）

V1.5正式页新增最近TestRun摘要选择和并排比较。API `GET /api/v1/acceptance/v1/v1.5/runs?limit=`从会话身份取得owner，默认返回20条、最多50条，仅查询V1.5且只返回摘要字段；所选运行再通过既有owner范围详情API读取完整证据。匿名访问返回401、伪造owner返回403，列表响应不暴露完整证据Blob。页面比较场景、状态、seed、断言PASS/WAITING/FAIL数量、订单数、Fill数和对账状态。

复验命令：`pnpm verify:stage -- --stage V1.5 --suite code`及`pnpm test:e2e -- --stage V1.5`。完整代码门禁exit 0，隔离PostgreSQL集成验证owner过滤、V1.5过滤、limit上限和精确摘要字段；Playwright四场景通过，浏览器实际选择前一Run并显示并排比较。匿名/伪造owner身份探针覆盖本轮更新后的五条V1.5路由。E2E日志：[a02](../../../evidence/audits/2026-10-09-v15-owner-run-history-comparison-web-e2e-a02.log)，SHA-256见[sidecar](../../../evidence/audits/2026-10-09-v15-owner-run-history-comparison-web-e2e-a02.log.sha256)；完整代码套件：[日志](../../../evidence/audits/2026-10-09-v15-owner-run-history-comparison-code-suite-a01.log)，[SHA-256](../../../evidence/audits/2026-10-09-v15-owner-run-history-comparison-code-suite-a01.log.sha256)。隔离项目报告记录Web/API/CLI/export通过、随机容器/卷/网络精确清理，真实数据源/券商调用0。

本项只交付owner范围V1.5摘要列表与Run比较切片，不关闭告警/能力阻塞、跨阶段追溯、全阶段交付或当前范围人工验收；父需求继续OPEN。

### 8.22 V1.5 Run能力状态与明确阻塞显示（2026-10-09）

正式V1.5验收页现将当前Run证据中的Durable workflow dispatch、NATS delivery、Temporal worker及Domain execution逐项展示。`NOT_CONNECTED`、`UNAVAILABLE`及显式FAILED/ERROR状态列为已确认阻塞；`NOT_RUN`保留为尚未执行，不作为失败；队列中和完成状态不误报阻塞。状态投影仅读取TestRun持久化证据，不执行额外探测，也不生成告警事件。

`pnpm --filter @stockquant/web test`通过（2个测试文件、4项测试），typecheck/build通过。`pnpm verify:stage -- --stage V1.5 --suite code`在Docker可访问环境exit 0，含锁版Python Worker与隔离PostgreSQL迁移/集成（[完整日志a02](../../../evidence/audits/2026-10-09-v15-capability-blockers-code-suite-a02.log)，[SHA-256](../../../evidence/audits/2026-10-09-v15-capability-blockers-code-suite-a02.log.sha256)）。`pnpm test:e2e -- --stage V1.5`隔离Harness四场景及同Run CLI/export通过，新增浏览器用例“V1.5 displays explicit capability blockers without converting NOT_RUN into failure”通过，匿名401/伪造owner403均5/5，真实外部数据/券商调用0、随机Compose资源精确清理；[E2E日志a02](../../../evidence/audits/2026-10-09-v15-capability-blockers-web-e2e-a02.log)，[SHA-256](../../../evidence/audits/2026-10-09-v15-capability-blockers-web-e2e-a02.log.sha256)。早期E2E a01因既有用例把页面所有表格混为断言表，新增能力表后行数断言失败；修正为只读取带testid的断言表后a02通过，失败记录保留。

此项展示运行能力阻塞，并提供到既有V2.4系统告警/Paper能力概览的显式入口；不覆盖V1.5 TestRun关联的Incident列表/确认、自动告警生成、跨阶段成交链或当前人工验收；V1.5-S2-L19父项继续OPEN。

### 8.23 V1.5四卷配对恢复与AUTO业务幂等续跑（2026-10-09）

复验命令：`STOCKQUANT_V15_E2E_BACKUP_RESTORE=true pnpm test:e2e -- --stage V1.5`。随机隔离Harness先执行正式Web的NO_TRADE、双市场AUTO、拒绝及恢复场景，再备份PostgreSQL、NATS JetStream、Temporal状态及Research Artifact卷到独立卷，并恢复到新隔离Compose项目。恢复后同Run CLI `--check-only`保留WAITING时的预期exit 2；独立查询确认AUTO Run、4笔FakeBroker订单/成交、Portfolio账户快照及Governance Mandate预算均与备份前相同。Temporal Workflow历史、JetStream消费确认状态和ArtifactRef/字节SHA-256均复核一致。

对恢复后的AUTO Run使用新NATS消息ID重复派发原eventId，消息被确认且记录复用原稳定Temporal Workflow ID；再次独立查询确认FakeBroker订单/成交、Portfolio账本和Mandate预算未变化。E2E exit 0，真实外部来源/券商调用0，随机源/恢复Compose项目的容器、卷、网络均精确清理。机器报告：[JSON](../../../evidence/audits/2026-10-09-v15-paired-backup-restore-sq-v15-e2e-3f8a26344c4a0ef1f867.json)，SHA-256 `fccf792169f8667ba5ff780831e011b7a3c292cf8e08bcde79ff7e2930fcfe11`（同目录`.json.sha256`）。改动后完整V1.5 code suite exit 0：[日志](../../../evidence/audits/2026-10-09-v15-paired-backup-restore-code-suite-a01.log)，SHA-256 `fcc7c46d3935a102a77722c417a09d903a00f143803a744f69a97ae804525eec`。首次试跑先后发现check-only应保留exit 2以及AUTO结构化输出超过Harness解析窗口，均已修正；失败报告保留。

此证据仅覆盖V1.5隔离栈的四卷配对恢复和同Run幂等重放；不覆盖V1.1–V1.4活动数据、真实宿主/异地灾备、RPO/RTO或完整V1范围。Artifact字节为标记合成输入。P5全域恢复仍未关闭，V1.5人工验收仍NOT_RUN。

### 8.24 V1.5 Run Incident生命周期与确认（2026-10-09）

Platform从owner/TestRun持久化证据派生Incident：显式`NOT_CONNECTED`、`UNAVAILABLE`、工作流/总线/Temporal/领域执行状态中的`*_FAILED`/`*_ERROR`/`*_UNAVAILABLE`及断言`FAIL`可打开Incident；`NOT_RUN`和`WAITING`不产生告警。Run `save()`在同一PostgreSQL事务内写入/更新Incident，证据恢复则原子解决，后续复发创建新的Incident；自动生成不依赖页面或API读取。`GET /runs/:testRunId/incidents`仍保留读取/协调能力，确认路径为`POST /runs/:testRunId/incidents/:incidentId/acknowledge`。服务端从当前登录会话取得确认人，不接受浏览器提交actor；重复确认保留第一次确认时间。路由要求owner与活动TestRun匹配。

验证命令：`pnpm verify:stage -- --stage V1.5 --suite code`；Platform隔离PostgreSQL专项3/3通过，含保存时即时生成、恢复解决、再次复发新建。完整代码套件日志[code suite](../../../evidence/audits/2026-10-09-v15-auto-incident-projection-code-suite-a01.log)，SHA-256 `e2da9be4f8e7f68ad70d70d86b9281c1d994362bb8285570ec015e96b70c0242`。共享Platform变更后V1.1、V1.2、V1.3、V1.4代码套件均退出0，日志[兼容套件](../../../evidence/audits/2026-10-09-v15-auto-incident-projection-cross-stage-code-suite-a01.log)，SHA-256 `36e0aeb63f8c9b0a605728385c972e1f51ae5f9350986b9fb18e52059398ce6d`。`pnpm test:e2e -- --stage V1.5`通过3/3浏览器用例及normal/AUTO/rejection/recovery四场景、同Run CLI/export；自动投影的完整E2E日志[web E2E](../../../evidence/audits/2026-10-09-v15-auto-incident-projection-web-e2e-a01.log)，SHA-256 `d03260c04978b7682d1b36e7a64a9b361dbfb6fc7236ca2de0d32cc857400f74`，机器报告[JSON](../../../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-f8bca4e6e2fb4e454d6a.json)。本次无真实来源或券商调用，隔离项目资源精确清理通过。

此投影提供当前Run内的告警生命周期，不包含邮件/短信等外发通知、统一跨阶段成交追溯、人工验收或全V1故障恢复；V1.5-S2-L19和P5仍OPEN。

### 8.25 隔离栈故障演练命令与证据索引（2026-10-09）

以下命令只由测试Harness创建随机命名的V1.5隔离Compose项目，完成后应精确清理该项目的容器、卷和网络。每次只启用一个故障变量；失败时保留原始日志/报告并停止，不要换seed重试来覆盖失败。先确认Docker可用、工作区依赖已安装且本地没有同名Harness项目。命令成功只证明表内固定注入路径，不证明宿主灾备或人工验收。

| 演练 | 命令 | 已有证据及预期观察 | 未覆盖范围 |
|---|---|---|---|
| Temporal服务停止/恢复 | `STOCKQUANT_V15_E2E_TEMPORAL_OUTAGE=true pnpm test:e2e -- --stage V1.5` | [Temporal停机审计](../../../evidence/audits/2026-10-07-v15-temporal-server-outage-e2e.md)：派发失败后NAK；同容器/持久卷恢复后原Run完成120项权威观察 | 宿主/卷丢失、持续HA |
| PostgreSQL进程停止/恢复 | `STOCKQUANT_V15_E2E_DATABASE_OUTAGE=true pnpm test:e2e -- --stage V1.5` | [PostgreSQL故障审计](../../../evidence/audits/2026-10-07-v15-database-outage-e2e.md)：同容器/卷恢复，同序号NAK、重投、ACK，Run完成120项观察 | 宿主/卷灾难恢复 |
| 网络中断/恢复 | `STOCKQUANT_V15_E2E_NETWORK_OUTAGE=true pnpm test:e2e -- --stage V1.5` | [网络故障审计](../../../evidence/audits/2026-10-07-v15-network-outage-e2e.md)：恢复后Run继续并完成；检查Web、同Run CLI/export和隔离资源回收 | Mac睡眠/唤醒、任意真实网络故障 |
| 双Platform Worker竞争 | `STOCKQUANT_V15_E2E_MULTIWORKER=true pnpm test:e2e -- --stage V1.5` | [双Worker审计](../../../evidence/audits/2026-10-07-v15-multiworker-e2e.md)：重复durable消费收敛到稳定Workflow ID，Run不重复产生业务事实 | 双Worker同时崩溃/宿主故障 |
| Platform备用Worker接管 | `STOCKQUANT_V15_E2E_WORKER_FAILOVER=true pnpm test:e2e -- --stage V1.5` | [Platform接管审计](../../../evidence/audits/2026-10-07-v15-worker-failover-e2e.md)；Run Incident改动后的当前树复验报告[sq-v15-e2e-6558c295fca307bd8c66](../../../evidence/audits/2026-10-09-v15-worker-failover-sq-v15-e2e-6558c295fca307bd8c66.json)，原始日志[a02](../../../evidence/audits/2026-10-09-v15-run-incident-worker-failover-e2e-a02.log)，SHA-256 `31353fdce776b640ad69dda95bd8ce4bb144bd9916c4d245f2f41d40538cc283`；3个浏览器场景通过，normal/AUTO/rejection/recovery均同Run CLI/export，随机隔离资源精确清理 | 多个实例同时故障 |
| Trade备用实例接管 | `STOCKQUANT_V15_E2E_TRADE_FAILOVER=true pnpm test:e2e -- --stage V1.5` | [Trade接管E2E](../../../evidence/audits/2026-10-09-v15-trade-worker-failover-sq-v15-e2e-75b262d7e2b9d8fa1806.json)：按原clientOrderId恢复已提交订单并完成账本链 | 任意交易故障窗口、多个Trade实例同时故障 |
| 四卷配对备份恢复 | `STOCKQUANT_V15_E2E_BACKUP_RESTORE=true pnpm test:e2e -- --stage V1.5` | [四卷恢复报告](../../../evidence/audits/2026-10-09-v15-paired-backup-restore-sq-v15-e2e-3f8a26344c4a0ef1f867.json)：恢复后同Run检查、Workflow/ACK、Artifact Hash及AUTO幂等重放通过 | 活动V1.1–V1.4数据、异地/RPO/RTO |

Mac M1资源/运行采样补充：当前Apple M1 Max/arm64宿主为32 GiB内存；Docker Desktop 28.0.4提供10 vCPU、约7.65 GiB内存，Linux容器架构aarch64。受控备用Worker故障模式E2E期间每约5秒采样容器CPU/内存，API采样最大285.4 MiB、备用Worker265.4 MiB；由于未设置单容器CPU quota，CPU百分比可高于100%。原始日志/CSV、全服务样本、仓库卷和daemon全局磁盘快照及测量限制见[资源环境审计](../../../evidence/audits/2026-10-09-v1-m1-container-resource-snapshot-a01.md)。该小样本间隔采样不是绝对峰值/容量结论，Playwright宿主进程不在容器表内；Ubuntu和完整版本负载仍NOT_RUN。

Harness退出码0代表该固定隔离检查通过；非0时保存完整命令、退出码和报告，确认随机资源清理情况后再调查。不得手动删除共享容器、命名卷、活动数据库或证据。

#### Mac睡眠/唤醒人工演练（已准备，未执行）

此步骤只操作本机`pnpm stack:up -- --stage V1.5`创建并登记的随机隔离项目；不得对活动栈或共享卷演练。它观察睡眠前已完成的NO_TRADE TestRun在宿主唤醒后的持久读回和服务恢复，不注入真实订单，也不代替正在执行中的AUTO工作流故障恢复。当前阶段状态仍为`NOT_RUN`，必须由操作者实际执行并记录后才可更新。

1. 仓库根目录运行`pnpm stack:up -- --stage V1.5`，从JSON输出分别复制`isolatedProject`、`webUrl`和`platformApiUrl`，并保留输出中的`stopCommand`。在终端设置本轮变量：`read -r project_id`、`read -r web_url`、`read -r api_url`（每行粘贴对应值）；创建独立证据目录`evidence/audits/v15-mac-sleep-wake-${project_id}/`。启动超时或状态不是`READY_FOR_MANUAL_ACCEPTANCE`时停止，不继续睡眠演练。
2. 打开本次`web_url`（启动输出已包含`/acceptance/v1/v1.5`路由）并建立本地验收会话。选择“后台调度与 60 日 HOLD”，点击“准备 V1.5 场景”；记录正式显示的`testRunId`，在终端执行`read -r test_run_id`并粘贴该UUID。等待Run完成，核对120项权威观察、零订单/Fill/预留及HOLD断言均PASS。若页面未给出已完成Run，不进入下一步。
3. 睡眠前在仓库根目录记录证据：`date -u +%FT%TZ > "evidence/audits/v15-mac-sleep-wake-${project_id}/before.utc.txt"`、`curl -fsS "$api_url/live" > "evidence/audits/v15-mac-sleep-wake-${project_id}/before-live.json"`、`docker ps --filter "label=com.docker.compose.project=$project_id" --format '{{.Names}} {{.Status}}' > "evidence/audits/v15-mac-sleep-wake-${project_id}/before-containers.txt"`。通过macOS Apple菜单选择“睡眠”，再由操作者唤醒本机。不要关闭或清理隔离项目。
4. 唤醒后最多等待120秒，执行以下有界探测并保存`date -u +%FT%TZ`、`pmset -g log | tail -n 200`及相同`docker ps`查询到独立目录（文件名分别为`after-wake.utc.txt`、`pmset.log`、`after-containers.txt`）。API和Web都须HTTP 200，TestRun ID与睡眠前一致。

```bash
set -e
curl --fail --silent --show-error --retry 59 --retry-connrefused --retry-delay 1 --max-time 1 "$api_url/live" > "evidence/audits/v15-mac-sleep-wake-${project_id}/after-live.json"
curl --fail --silent --show-error --retry 59 --retry-connrefused --retry-delay 1 --max-time 1 "$web_url" > /dev/null
date -u +%FT%TZ > "evidence/audits/v15-mac-sleep-wake-${project_id}/after-wake.utc.txt"
pmset -g log | tail -n 200 > "evidence/audits/v15-mac-sleep-wake-${project_id}/pmset.log"
docker ps --filter "label=com.docker.compose.project=$project_id" --format '{{.Names}} {{.Status}}' > "evidence/audits/v15-mac-sleep-wake-${project_id}/after-containers.txt"
```

5. 在仓库根目录运行原Run只读核对与证据导出；保存实际退出码、导出目录和Manifest Hash。检查不得创建Run、订单、Fill或重放事件。CLI不会自动继承Web地址或登录态：执行前在当前终端隐藏输入本轮`api_url`、`test_run_id`和浏览器Cookie `sq_session=<token>`，并设置`STOCKQUANT_PLATFORM_API_URL`、`STOCKQUANT_SESSION_COOKIE`及`STOCKQUANT_EVIDENCE_SESSION_COOKIE`；Cookie不得回显或写入证据文件，完成后unset。

```bash
read -r platform_api_url  # 粘贴本轮api_url
read -r test_run_id       # 粘贴本轮testRunId
read -rs session_cookie   # 粘贴完整sq_session=<token>，隐藏输入
export STOCKQUANT_PLATFORM_API_URL="$platform_api_url"
export STOCKQUANT_SESSION_COOKIE="$session_cookie"
export STOCKQUANT_EVIDENCE_SESSION_COOKIE="$session_cookie"
if pnpm verify:stage -- --stage V1.5 --run "$test_run_id" --check-only > "evidence/audits/v15-mac-sleep-wake-${project_id}/same-run-check.log" 2>&1; then
  printf '0\n' > "evidence/audits/v15-mac-sleep-wake-${project_id}/same-run-check.exit.txt"
else
  code=$?
  printf '%s\n' "$code" > "evidence/audits/v15-mac-sleep-wake-${project_id}/same-run-check.exit.txt"
fi
if pnpm evidence:export -- --stage V1.5 --run "$test_run_id" > "evidence/audits/v15-mac-sleep-wake-${project_id}/evidence-export.log" 2>&1; then
  printf '0\n' > "evidence/audits/v15-mac-sleep-wake-${project_id}/evidence-export.exit.txt"
else
  code=$?
  printf '%s\n' "$code" > "evidence/audits/v15-mac-sleep-wake-${project_id}/evidence-export.exit.txt"
fi
unset STOCKQUANT_SESSION_COOKIE STOCKQUANT_EVIDENCE_SESSION_COOKIE session_cookie
```

只接受原Run读回且断言/账本状态与睡眠前相同；任何身份、健康、Run或事实不一致都记录FAIL并保留现场，不改Run、不换seed重试。
6. 完成取证后只运行启动输出中的精确`stopCommand`；确认该随机项目容器、卷、网络已清理。保留Run导出和完整审计证据，不清理活动项目或其它资源。

2026-10-10 前置实跑（睡眠/唤醒仍未执行）：随机隔离项目 `sq-v15-stack-bd6742505479a4cd8f94` 已启动，URL为 `http://127.0.0.1:60898/acceptance/v1/v1.5`，API `http://127.0.0.1:60897`。通过容器化Web创建NO_TRADE TestRun `1f9b8fd0-9a51-45eb-803d-b613bbd8d126`；120项观察完成，`V1.5-HOLD-002=PASS`、`V1.5-SYS-SCHEDULE-001=WAITING`，订单/Fill/预留为0。睡眠前UTC时间、API健康、容器清单已保存；CLI `--check-only` exit 2（完整调度断言仍WAITING），stage-specific Evidence Export exit 0，Manifest Hash `0b5fadfe98a7ee859db788549e3c957b7fae79858797ce02fbee19b14776c20c`。详细记录：[前置运行与尝试记录](../../../evidence/audits/v15-mac-sleep-wake-sq-v15-stack-bd6742505479a4cd8f94/attempts.md)、[Run摘要](../../../evidence/audits/v15-mac-sleep-wake-sq-v15-stack-bd6742505479a4cd8f94/pre-sleep-run.json)及[导出](../../../evidence/local/V1.5/1f9b8fd0-9a51-45eb-803d-b613bbd8d126/manifest.sha256)。本机当时处于锁屏，尚无`pmset`睡眠/唤醒证据；随机项目暂时保留以便操作者解锁后继续，阶段状态仍NOT_RUN。另修正本Runbook导出命令，明确传入`--stage V1.5`，避免脚本按默认V1.1导出。

尚未验证的部分：本步骤是可执行操作说明和睡眠前准备证据，不构成睡眠/唤醒PASS。它对已完成NO_TRADE Run做持久读回；真实Mac睡眠/唤醒、服务恢复、操作者恢复和用户验收均须待实际演练后记录。没有实际Run ID、系统时序、命令退出码和恢复读回证据前，§2对应任务和V1.5阶段保持开放。

### 8.26 V1.3 Mandate预算读回共享Platform变更后的V1.5代码兼容复验（2026-10-10）

`pnpm verify:stage -- --stage V1.5 --suite code`退出0。全仓baseline、合同/Fixtures、构建/类型检查/单测、锁版Market Data Python适配器、Market Data隔离HTTP/PG、V1.5平台迁移和Run Incident持久化用例3/3通过；随机数据库/网络清理通过，活动服务`NOT_CONNECTED`。完整日志[见此](../../../evidence/audits/2026-10-10-v15-after-v13-budget-readback-code-suite-a01.log)，SHA-256 `36f6a87dcad979991b882f2f8e216cb9e46c7d1738d2dae25581ccd2bc43fcbe`。该套件不替代V1.5四场景Web/API/CLI/export E2E、真实结算/日历、多故障演练、Ubuntu或当前范围人工验收。

### 8.27 共享Platform/Web变更后的V1.5当前树浏览器复验（2026-10-10）

`pnpm test:e2e -- --stage V1.5`退出0：Playwright 3/3，覆盖normal、AUTO Paper交易、暂停拒绝、recovery以及Incident/能力状态页面；四个场景均通过同Run CLI核对和结构化证据导出。TestRun：normal `47d5065e-c609-4582-a761-ce8e370ae3b5`、AUTO `ac995d7d-ac90-4838-9406-4d1c9e38501b`、rejection `5cf89742-ac02-4240-b748-49c166635d38`、recovery `93993342-e7cb-4b45-9d93-1de943f12ee0`。AUTO固定场景日志记录CN/US多日交易、预算/账本核验和后台重试；真实来源调用0、真实券商调用0。隔离项目`sq-v15-e2e-e90e5aea1ec8b8ebfb13`的容器、四卷及网络精确移除并验证；机器报告[JSON](../../../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-e90e5aea1ec8b8ebfb13.json)，SHA-256 `0fb3610a8cb7f7e705d6bfe046c3b8605356cf811564d37fca4e3121f2a3e040`。完整日志[见此](../../../evidence/audits/2026-10-10-v15-after-v13-budget-readback-web-e2e-a01.log)，SHA-256 `4adb703f4fa7e0167bd75118637d7cbcc268ee2bd03e98526620f56d5fae66ff`。此为固定隔离场景复验，不替代真实结算/日历、Ubuntu、Mac睡眠恢复或当前范围人工验收。

### 8.28 V1.5 TestRun创建拒绝客户端交易模式注入（2026-10-10）

V1.5 Platform `POST /api/v1/acceptance/v1/v1.5/runs`现仅接受`scenarioId`和`seed`。隔离HTTP+PostgreSQL实际发送PAPER/FAKE、LIVE/FAKE、BACKTEST/REAL、LIVE/REAL四种模式组合，全部返回422；拒绝前后`acceptance_stage_runs`中V1.5 Run计数不变，证明没有创建TestRun或派发NATS/Temporal工作流。同一隔离E2E还通过七条V1.5 Platform路由匿名401/伪造owner403、三项Playwright用例及normal/AUTO/rejection/recovery四场景Web/API/CLI同Run/export验证，隔离容器/卷/网络清理通过。TestRun：normal `9d12706a-3ae9-4525-9e76-bac05913ec5e`、AUTO `82c2af39-164e-48f0-82c5-bc71b2d4f9b9`、rejection `30f2de6d-1e15-4274-9532-cdb4b49c8091`、recovery `18e251dc-310c-4bdb-85e2-e1dc48b47c8f`。机器报告[JSON](../../../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-f9a9f2684c0d09bbe7e8.json)及[SHA清单](../../../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-f9a9f2684c0d09bbe7e8.json.sha256)，独立E2E日志[见此](../../../evidence/audits/2026-10-10-v15-platform-mode-boundary-e2e-a01.log)。完整V1.5代码套件exit 0见[套件日志](../../../evidence/audits/2026-10-10-v15-platform-mode-boundary-code-suite-a01.log)。该增量不证明活动部署、真实交易、全V1模式路由/Worker矩阵、Ubuntu或阶段人工验收完成。


### 8.29 V1.5取消与Incident确认拒绝客户端业务事实注入（2026-10-10）

`pnpm test:e2e -- --stage V1.5`通过，3/3浏览器测试及normal/AUTO/rejection/recovery场景完成；Web/API/CLI同Run核验、Incident UI与隔离服务断言通过。针对V1.5 Run取消和Incident确认分别提交伪造状态/现金等非空请求体，均返回422；Run取消标志与Incident OPEN状态保持不变，随后合法空体命令和重复确认按原行为完成。TestRun：AUTO `41080a73-3b55-4209-bff8-0c408deb93aa`、rejection `a7db080d-afca-4b0e-9bc2-126a203c6f1e`、recovery `04c5add1-3fd8-486d-9526-936f805b4fc7`。真实来源/券商调用0，隔离资源精确清理。E2E日志[SHA-256](../../../evidence/audits/2026-10-10-v15-body-injection-code-e2e-a01.log.sha256)；完整code suite exit 0，日志[SHA-256](../../../evidence/audits/2026-10-10-v15-platform-mode-boundary-code-suite-a01.log.sha256)。

此项只关闭列明V1.5命令的载荷拒绝切片，不关闭完整业务恢复、Ubuntu或阶段人工验收；V1.5仍`PARTIALLY_IMPLEMENTED`。

### 8.30 Trade双实例同时中断后的原单恢复（2026-10-10）

执行`STOCKQUANT_V15_E2E_TRADE_DOUBLE_FAILURE=true pnpm test:e2e -- --stage V1.5`。Harness启动第二个Trade Execution实例并确认它连接同一隔离PostgreSQL、注册`trade-execution-service`别名。固定AUTO CN_A首笔请求观察到FakeBroker已提交Order/Fill且HTTP响应仍挂起后，实际`SIGKILL`两个Trade实例；两者均不可用1.5秒，再启动备用实例。Temporal恢复后必须从服务实例日志观察到按完全相同的`clientOrderId`读取原单。AUTO Run `b97e2d01-80c4-4554-8394-dd95a1348271`；故障序列报告[JSON](../../../evidence/audits/2026-10-10-v15-trade-double-failure-sq-v15-e2e-e2b3577ef5b427c3b250.json)，SHA-256 `4b7f8591c6e6b34dc6629f8bfce29c7a3ae9f765569bb41d496052d66607acf4`；执行日志[受控E2E a02](../../../evidence/audits/2026-10-10-v15-trade-double-failure-e2e-a02.log)，SHA-256 `67e8c68c7391b67218aa3015d884c28e35efa9406a1fa6049d26c4038352fce4`。normal、AUTO、rejection、recovery四场景及同Run CLI/export、四笔双市场AUTO订单/Fill、Mandate预算和Portfolio/FakeBroker双账本断言通过；外部行情/真实券商调用0，隔离容器/卷/网络精确清理。

随后完整`pnpm verify:stage -- --stage V1.5 --suite code`受控回环复验exit 0：[代码套件a02](../../../evidence/audits/2026-10-10-v15-trade-double-failure-code-suite-a02.log)，SHA-256 `d1c2351e6da555a7cdac6503bca65ce3b08e46bbfc27ad85805d2c55315350aa`。沙箱首轮仅因两项loopback HTTP单测`EPERM`失败，日志[a01](../../../evidence/audits/2026-10-10-v15-trade-double-failure-code-suite-a01.log)保留；隔离数据库、网络与栈资源已由通过的测试逐项清理。

### 8.31 Trade双实例与PostgreSQL同时中断后的原单恢复（2026-10-10）

执行`STOCKQUANT_V15_E2E_TRADE_AND_DATABASE_FAILURE=true pnpm test:e2e -- --stage V1.5`。隔离Harness在FakeBroker持久提交AUTO CN_A订单/Fill、Trade HTTP响应仍挂起时，实际终止两台Trade Execution实例及同一PostgreSQL容器；确认三者Exited，恢复同一PG容器/卷，等待数据库就绪并从Platform API确认Decision Governance、Portfolio Risk可解析且ready，再恢复一个Trade实例。Temporal重试原AUTO命令，Trade日志确认以同一`clientOrderId`读回原订单。AUTO TestRun `c2f59b62-9370-4e72-8f21-a3d26f2c36d9`；四场景TestRun IDs：normal `f430baa4-049c-4c59-8fb5-e1737ef0ef6c`、rejection `179ebd60-5e2e-4593-9734-b04b9bc99e7b`、recovery `fc0b18a0-1f20-47ce-84b3-3a4c3b30d797`。Playwright 3/3、同Run CLI/export及完整AUTO账本断言通过；故障报告[JSON](../../../evidence/audits/2026-10-10-v15-trade-database-combined-failure-sq-v15-e2e-d3d07879c69cbbf93168.json)，SHA-256 `2a594537d31bedfeae7c7af23debfe68391966fc5116568a46d05fefaa635b21`；E2E日志[a04](../../../evidence/audits/2026-10-10-v15-trade-database-combined-e2e-a04.log)，exit 0。无真实来源/券商调用，随机项目容器/卷/网络精确清理。

失败诊断和修复：a02报告显示Governance容器因PostgreSQL断开时的idle Pool client error退出，之后Platform重试遇到服务名`ENOTFOUND`；a03新增可达性探针复现并明确记录`decision-governance-service exited/unhealthy`。现为Governance PostgreSQL Pool注册安全的idle-client `error`监听，只记录错误名/代码并保持进程存活；PostgreSQL回来后依赖服务恢复验证已纳入Harness。首轮零等待配置失败a01、旧实现E2E失败a02/a03均保留为历史，不冒充通过。

完整`pnpm verify:stage -- --stage V1.5 --suite code`受控复验通过，完整代码门禁a02 exit 0；首轮a01仅因沙箱拒绝loopback HTTP测试监听而失败并保留。该固定组合恢复子项完成，不关闭P5父项；Mac睡眠/唤醒、其他故障组合、生产数据库恢复、宿主/异地RPO/RTO、Ubuntu与人工验收仍开放。


### 8.32 V1.5 NATS健康探针配置核正（2026-10-10）

只读检查发现当前隔离栈NATS服务持续正常运行且`/healthz`返回成功，但Compose声明的`nats-server --signal check`在NATS 2.10.29中返回`unknown signal "check"`，导致Docker健康状态持续`unhealthy`。将声明式健康探针改为容器内`wget -q -O /dev/null http://127.0.0.1:8222/healthz?js-enabled-only=true`，使探针检查V1.5依赖的JetStream就绪状态；当前容器没有重建或重启，故其健康状态仍按实际观测记录为`unhealthy`，本次不宣称活动服务已应用修复。`docker compose config --quiet`通过，活动容器中的JetStream健康端点探测exit 0；随后以独立Compose项目启动的新NATS容器按修正后的探针变为`healthy`（fail streak 0），精确清理该临时容器/卷/网络并确认预先存在的栈未触碰。原始检查见[诊断a01](../../../evidence/audits/2026-10-10-v15-nats-healthcheck-fix-a01.log)、[readiness复验a02](../../../evidence/audits/2026-10-10-v15-nats-healthcheck-fix-a02.log)和[隔离容器运行验证a03](../../../evidence/audits/2026-10-10-v15-nats-healthcheck-fix-a03.log)，SHA见各自sidecar。该配置修正降低后续隔离栈误报；须在维护/验收栈操作窗口重建后再核验容器健康转为`healthy`，不代表P5、宿主睡眠/唤醒或V1验收通过。


### 8.33 V1.5当前交互栈人工检查入口快照（2026-10-10）

为解锁后的当前会话交接，按只读方式复查已存在项目`sq-v15-stack-bd6742505479a4cd8f94`，未创建TestRun/订单/Fill、未重启服务、未清理项目。当前Web入口为`http://127.0.0.1:60898/acceptance/v1/v1.5`（HTTP 200），Platform API `http://127.0.0.1:60897/live`（HTTP 200）；Governance、Platform、Portfolio、PostgreSQL、Quant、Trade和Web均healthy，Temporal运行，NATS运行但Docker健康状态仍unhealthy（容器保留旧`nats-server --signal check`探针）。配置修正已在独立NATS临时项目验证healthy，但尚未应用到此栈。当前栈保持运行供后续检查；人工验收仍未记录，访问页面/服务健康不等于业务场景或用户验收通过。机器快照及SHA见[当前栈只读报告](../../../evidence/audits/2026-10-10-v15-interactive-stack-current-snapshot-a01.json)及sidecar。


### 8.34 V1.5当前树完整代码套件及NATS探针修正回归（2026-10-10）

运行`pnpm verify:stage -- --stage V1.5 --suite code`。首次受限沙箱执行因`seed:paper`两项本机回环HTTP测试监听`127.0.0.1`被拒绝（EPERM），完整输出保留在控制台运行记录；随后在获准的受控本机权限下完整重跑并退出0。当前树基线含文档/交叉索引（147要求、1654路径引用/544目标）、契约与Fixture校验、共享Artifact内容存储测试、10个工作区的build/lint/typecheck/test、服务分层检查、V1.5隔离PostgreSQL/HTTP集成、四服务migration CLI、Platform Outbox原子性/Run Incident测试、Trade P5-P7恢复、Market Data集成及容器化linux/arm64 Trade服务readiness。测试均使用隔离资源；各PostgreSQL容器/网络清理验证通过，活动服务标记`NOT_CONNECTED`，没有外部数据源或真实券商调用。全量输出[代码套件a01](../../../evidence/audits/2026-10-10-v15-current-tree-code-suite-a01.log)，exit code见[记录](../../../evidence/audits/2026-10-10-v15-current-tree-code-suite-a01.exit.txt)，SHA-256见[sidecar](../../../evidence/audits/2026-10-10-v15-current-tree-code-suite-a01.log.sha256)。

该复验关闭当前树V1.5代码套件运行子项，并实测受修正NATS探针配置下的V1.5依赖兼容回归；既有交互验收栈未重建或改变。它不替代当前栈NATS探针应用、真实睡眠/唤醒、市场日历/结算、V1全域业务备份恢复、Ubuntu实机或阶段/版本人工签署；V1.5及V1总体仍未完成。


### 8.35 修正NATS探针的完整隔离交互栈实测（2026-10-10）

按本节命令启动一个新的随机隔离V1.5完整栈：`pnpm stack:up -- --stage V1.5`。项目`sq-v15-stack-fc8958c88b00bd563385`启动到`READY_FOR_MANUAL_ACCEPTANCE`，Web `http://127.0.0.1:65019/acceptance/v1/v1.5`、Platform API `http://127.0.0.1:65018`；运行模式为PAPER/FAKE、LIVE关闭。实际NATS容器状态`running`、Docker health `healthy`、`failingStreak=0`，容器内`wget -q -O /dev/null http://127.0.0.1:8222/healthz?js-enabled-only=true`退出0。随后运行JSON输出中的精确命令`pnpm stack:down -- --project sq-v15-stack-fc8958c88b00bd563385`，结果`STOPPED_AND_PURGED`；项目容器、PostgreSQL专属卷、网络、项目镜像及凭据文件均清理，后置Docker查询无匹配容器/卷/网络。未触碰此前保留的V1.5验收栈。报告[JSON](../../../evidence/audits/2026-10-10-v15-interactive-stack-nats-health-a02.json)，SHA-256见[sidecar](../../../evidence/audits/2026-10-10-v15-interactive-stack-nats-health-a02.json.sha256)。

此项证明修正后的NATS/JetStream探针在新建的完整V1.5隔离栈中健康，并实测该栈启动/精确清理命令。保留栈尚未重建应用探针；Mac锁屏，睡眠/唤醒与人工验收未执行。阶段与V1仍未完成。


### 8.36 保留交互栈当前健康状态只读复核（2026-10-10）

只读检查此前保留的项目`sq-v15-stack-bd6742505479a4cd8f94`：9个容器仍运行；Web `http://127.0.0.1:60898/acceptance/v1/v1.5`与Platform API `/live`均HTTP 200；NATS容器仍使用旧`nats-server --signal check`探针并报告`unhealthy`（failingStreak 2394）。未重建容器、未停止服务、未操作卷或数据库。当前栈快照[JSON](../../../evidence/audits/2026-10-10-v15-interactive-stack-current-snapshot-a02.json)，SHA-256见[sidecar](../../../evidence/audits/2026-10-10-v15-interactive-stack-current-snapshot-a02.json.sha256)。新建隔离栈中修正探针已健康通过（§8.35），但不表示该保留栈已应用；其实际修复仍待受控维护/回归。


### 8.37 保留交互栈WAITING运行保护（2026-10-10）

为判断能否对§8.36保留项目应用NATS健康探针修正，使用只读PostgreSQL查询聚合V1.5 TestRun状态：`SELECT stage_id,status,count(*) FROM acceptance_stage_runs WHERE stage_id='V1.5' GROUP BY stage_id,status`。结果为`WAITING=1`；不输出Run ID或业务详情，不执行更新。因该Run仍在等待，保留当前NATS容器、PostgreSQL/JetStream卷及现有栈，暂不重启服务；新建隔离栈探针通过（§8.35）不构成可中断此Run的理由。状态报告[JSON](../../../evidence/audits/2026-10-10-v15-interactive-stack-current-snapshot-a03.json)，SHA-256见[sidecar](../../../evidence/audits/2026-10-10-v15-interactive-stack-current-snapshot-a03.json.sha256)。

待该Run有明确终态或负责人批准维护窗口后，再在同一随机项目上应用新探针，复验现有JetStream/Temporal/TestRun状态并记录恢复证据。当前保留栈NATS仍`unhealthy`；不将Docker探针误报当成JetStream业务失败，也不将新栈健康误报为当前栈已修复。


### 8.38 WAITING运行详情只读复核（2026-10-10）

对§8.37中的唯一`WAITING`记录进一步只读核实：场景为`normal`，创建时间`2026-10-10 04:13:37.728431+00`，`completed_at=NULL`，含2条断言。没有查询或导出Run ID、断言载荷或用户信息；未对数据库执行写操作。由于该记录仍非终态，不能推定已无后台观察/恢复依赖；暂缓重启NATS。详细最小化快照[JSON](../../../evidence/audits/2026-10-10-v15-interactive-stack-current-snapshot-a04.json)，SHA-256见[sidecar](../../../evidence/audits/2026-10-10-v15-interactive-stack-current-snapshot-a04.json.sha256)。


### 8.39 保留V1.5栈应用NATS探针修正并复验持久状态（2026-10-10）

在§8.37/8.38确认唯一`WAITING` normal Run的Temporal Workflow已完成、该Run的NATS证据为`NOT_USED_FOR_NO_TRADE_SESSION_DISPATCH`，并且JetStream durable consumer无pending/ack-pending后，仅在精确项目`sq-v15-stack-bd6742505479a4cd8f94`执行：

```bash
docker compose -p sq-v15-stack-bd6742505479a4cd8f94 \
  --env-file .codex/isolated-stacks/sq-v15-stack-bd6742505479a4cd8f94.env \
  -f infra/compose/docker-compose.v15-integration.yml \
  up -d --no-deps --force-recreate nats
```

只重建NATS容器；保留JetStream卷` sq-v15-stack-bd6742505479a4cd8f94_nats-jetstream`（挂载`/data/jetstream`），不重建PostgreSQL、Temporal、Platform或Web。复验：NATS Docker health=`healthy`、failing streak 0，JetStream readiness exit 0；stream`SQV15APP`的1条消息及durable consumer均保留，pending/ack-pending/redelivered均0；Temporal运行中Workflow 0；Web与Platform `/live`仍HTTP 200；TestRun仍原为`WAITING`（schedule断言`WAITING`、HOLD断言`PASS`），没有修改业务状态。前置快照[preflight A05](../../../evidence/audits/2026-10-10-v15-interactive-stack-nats-restart-preflight-a05.json)，修复后报告[A06](../../../evidence/audits/2026-10-10-v15-interactive-stack-nats-probe-repair-a06.json)，SHA-256见对应sidecar。

本项关闭V1.5保留隔离栈NATS健康探针的应用/持久状态复验子项。Run仍有一条WAITING系统调度断言、Mac睡眠/唤醒和本人验收、Ubuntu及全V1恢复仍未完成；不能据此关闭阶段或版本。

### 8.40 当前树全服务数据库与Artifact卷配对备份隔离复验（2026-10-10）

在当前工作树执行`pnpm test:backup:cluster-isolated`，随机隔离Compose项目通过正式`postgres-init.sql`建立并备份/恢复10个数据库及服务角色；恢复目标为独立临时PostgreSQL。合成数据覆盖跨库V1.3 `WAITING` TestRun、FakeBroker `FILLED`订单/Fill/已送达Outbox、Portfolio账户/双账本/持仓，以及内容Hash匹配的Published ArtifactRef和Artifact卷字节。恢复校验确认Run/namespace、订单-Fill-Outbox、Trade/Portfolio Fill ID、Ledger/持仓关系和Artifact SHA-256均匹配；项目容器/网络/卷精确清理，活动项目/卷触碰为0。环境为Mac `darwin/arm64`、Node v24.1.0、PostgreSQL 16.9 Alpine；实际源码Hash、镜像ID和报告见[机器报告](../../../evidence/audits/2026-10-10-v1-isolated-cluster-paired-backup-684635a15dda4aea.json)。

该复验补强的是当前备份器对合成V1业务事实和Artifact卷的数据库/字节配对能力；不是由各领域服务API生成的真实V1.1–V1.5状态，也未覆盖Qlib旧/新Artifact引用、Quant回测报告、同点NATS/Temporal、活动卷、主机/异地恢复、Ubuntu或RPO/RTO。P5及整版恢复仍OPEN。

### 8.41 V1.2 Qlib ArtifactRef与共享字节卷配对恢复（2026-10-10）

将V1.2 Qlib ArtifactRef纳入`pnpm test:backup:cluster-isolated`随机隔离种子：Platform `acceptance_stage_runs`保存合成V1.2 Run，`qlib_fixture_artifacts`保存owner/Run绑定的PUBLISHED记录，Artifact卷保存与`artifact_id`及`sha256`一致的内容寻址字节。正式集群备份/恢复器恢复全部10个服务数据库/角色并在无网络临时PostgreSQL中校验Research与Qlib两类ArtifactRef均能匹配恢复卷中的内容SHA；既有V1.3 TestRun—Trade订单/Fill/Outbox—Portfolio Ledger/持仓关系仍同时核验。实测`publishedArtifactRefs=2`，活动项目/卷触碰0，临时项目资源清理完成。执行源码Hash、镜像ID及逐项结果见[机器报告](../../../evidence/audits/2026-10-10-v1-isolated-cluster-paired-backup-a15c94ce9cc0449b.json)。

Qlib Run、元数据和字节均由隔离Harness直接写入合成Fixture，并非真实Qlib/Platform流程生成；本项不证明旧JSONB payload备份、V1.4 Quant BacktestRun/Manifest与Platform TestRun投影配对、同点NATS/Temporal、活动/宿主/异地、Ubuntu或RPO/RTO。P5和V1仍OPEN。

### 8.42 V1.4 Quant回测结果/Manifest与Platform TestRun报告配对恢复（2026-10-10）

扩展同一隔离备份Harness，合成写入Quant `research_backtest_runs`/`research_backtest_manifests`，以及Platform `acceptance_stage_runs`中的V1.4 TestRun、报告载荷和`BACKTEST_REPORT` ArtifactRef。`pnpm test:backup:cluster-isolated`通过生产集群备份/恢复工具和独立临时PostgreSQL，核对Run—Manifest外键关系、规范化结果/Manifest SHA-256、Platform TestRun ID/owner/status、报告投影Hash及ArtifactRef与Quant结果一致；同时继续校验V1.2 Qlib与Research ArtifactRef/字节、V1.3订单/Fill/Outbox/Portfolio关系。10库/角色恢复、临时资源精确清理通过；活动项目/卷触碰0，无真实券商或外部来源调用。完整源码Hash、镜像ID和断言见[机器报告](../../../evidence/audits/2026-10-10-v1-isolated-cluster-paired-backup-765778dbb0e74e55.json)。

V1.4记录由Harness直接插入，是数据库结构与配对校验的合成覆盖，不是Quant/Platform API生成的真实回测Run；不证明真实V1各阶段产物、NATS/Temporal同点、活动/宿主/异地恢复、Ubuntu或RPO/RTO。P5和V1仍OPEN。

### 8.43 页面刷新与Platform API进程崩溃恢复（2026-10-10）

在全新隔离Compose项目`sq-v15-e2e-df1ddabd2e4498763cd4`执行`pnpm test:e2e -- --stage V1.5`，Web为`http://127.0.0.1:59032/acceptance/v1/v1.5`，API健康地址`http://127.0.0.1:59031/live`。normal TestRun `2731058c-1e27-4bf7-837c-218967922900`创建后关闭页面并新开页面，恢复同一TestRun与WAITING状态；NATS停机/恢复后，在CN_A `verifyNoTradeSessions` Activity开始且Workflow尚未完成时，对Platform API容器实际Node PID 1发送SIGKILL。`restart: unless-stopped`使容器自动恢复，原Workflow完成120条权威观察；随后同Run CLI检查与证据导出通过。AUTO、rejection、recovery也完成Web/API/CLI/export；其TestRun分别为`a6b86eb8-67d9-4eef-99c6-6476d1761924`、`0e81899a-9c6d-42c6-92df-360b1c45eee3`、`2c7884a4-fb62-4bba-a135-df3f82710cce`。三项Playwright测试通过，隔离容器/卷/网络精确清理，外部行情与真实券商调用0。机器报告[JSON](../../../evidence/audits/2026-10-10-v15-nats-temporal-dispatch-sq-v15-e2e-df1ddabd2e4498763cd4.json)，SHA-256见[sidecar](../../../evidence/audits/2026-10-10-v15-nats-temporal-dispatch-sq-v15-e2e-df1ddabd2e4498763cd4.json.sha256)。

两次失败尝试保留为诊断历史：`sq-v15-e2e-c9a250f0a1f68a6a26da`使用Compose显式`kill`，其手动停止语义不会触发restart policy（[失败JSON](../../../evidence/audits/2026-10-10-v15-nats-temporal-dispatch-sq-v15-e2e-c9a250f0a1f68a6a26da.json)）；`sq-v15-e2e-8cefa881e40ce43e774d`则错误地要求exec注入命令必须返回非零（[失败JSON](../../../evidence/audits/2026-10-10-v15-nats-temporal-dispatch-sq-v15-e2e-8cefa881e40ce43e774d.json)）。二者均非产品验收证据，隔离资源均已清理。上述PASS仅证明本次隔离NO_TRADE进程崩溃及浏览器刷新子场景，不证明保留交互栈修复、Trade/数据库/宿主恢复、Mac睡眠唤醒或Ubuntu实机；P5及V1仍OPEN。

### 8.44 保留V1.5栈Platform API恢复与同Run只读核查（2026-10-10）

只读预检确认精确项目`sq-v15-stack-bd6742505479a4cd8f94`的Platform API容器因OOM退出（exit 137），而唯一normal TestRun的持久状态为`WAITING`、Workflow/Temporal均`COMPLETED`、业务执行为`NO_TRADE_SESSIONS_EXECUTED`。随后仅将该精确API容器的restart policy设为`unless-stopped`并启动该容器；未执行SQL写入、其他容器重启、卷操作、迁移、行情源或券商调用。容器现为running/healthy，API `/live`与Web页面均HTTP 200。恢复快照[JSON](../../../evidence/audits/2026-10-10-v15-platform-api-recovered-live-stack-a01.json)，SHA-256见[sidecar](../../../evidence/audits/2026-10-10-v15-platform-api-recovered-live-stack-a01.json.sha256)。

对既有TestRun `1f9b8fd0-9a51-45eb-803d-b613bbd8d126`执行`pnpm verify:stage -- --stage V1.5 --run 1f9b8fd0-9a51-45eb-803d-b613bbd8d126 --check-only`，请求为只读GET，退出码2。断言`V1.5-SYS-SCHEDULE-001`仍WAITING/`NOT_RUN`；`V1.5-HOLD-002`为PASS，包含120项权威观察、0订单/Fill、账户余额和持仓不变。该退出码表示必要观察尚未执行，保留为INCOMPLETE而非失败；不据此更改历史Run或签署人工验收。CLI日志、退出码及摘要见[核查日志](../../../evidence/audits/2026-10-10-v15-retained-normal-run-checkonly-a01.log)、[摘要](../../../evidence/audits/2026-10-10-v15-retained-normal-run-checkonly-a01.json)。

### 8.45 V1.5共享StageRun证据投影与四场景模式核对（2026-10-11）

修复V1.5权威Run证据生成路径，使normal、AUTO、rejection及UNKNOWN recovery均记录`environmentMode=PAPER`和`dataMode=FIXTURE`；导出API不再推断缺失模式。平台单测31/31及类型检查通过。`pnpm test:e2e -- --stage V1.5`在隔离项目`sq-v15-e2e-982b64e3e0bad66da7bd`中3/3 Playwright通过；四个同Run共享证据响应均为HTTP 200，UUID、owner、stage一致，模式为PAPER/FIXTURE/FAKE，断言数量分别为2/5/3/2，人工结论为NOT_RUN。四个TestRun：normal `81ec613d-005b-4bb4-a66d-9848bb65f9e9`、AUTO `c0a00708-faa8-46e6-ba60-275240923a24`、rejection `adab4e9a-1f9c-48b7-bf56-f7fed70402f1`、recovery `a47e3e50-ae7c-4260-b73d-a7b263107113`。真实来源/券商调用均为0，隔离容器、卷、网络精确删除。E2E完整日志[ a02 ](../../../evidence/audits/2026-10-11-v15-shared-stage-evidence-isolated-a02.log)，SHA-256 `af4f7144a621fd1f7a7af8412d34699c373f355774ad57f884c9a8f6a22567d7`；机器报告[JSON](../../../evidence/audits/2026-10-11-v15-nats-temporal-dispatch-sq-v15-e2e-982b64e3e0bad66da7bd.json)，SHA-256 `c36484e1009edda10896d2de3771b597e1d3910c01876d935617b5e2adf43d1f`。V1.5完整代码套件exit 0，见[code suite a01](../../../evidence/audits/2026-10-11-v15-shared-stage-code-suite-a01.log)，SHA-256 `5e9229bc074c9c188d3cb29e110b8f1b7bfa9f92d663e582512ef3975823c81d`。首次缺模式的E2E失败保留于[ a01 ](../../../evidence/audits/2026-10-11-v15-shared-stage-evidence-isolated-a01.log)。本子项不签署人工验收，也不关闭V1.5整体恢复及正式V1门禁。

### 8.46 V1.5当前树NATS/Temporal与Trade中断恢复E2E（2026-10-11）

受控隔离执行`pnpm test:e2e -- --stage V1.5`，浏览器3/3通过，当前树报告记录46个来源文件且SHA-256全匹配。normal、AUTO、rejection、recovery四个TestRun分别为`8c4fc990-bdc2-4774-b8fb-4a2bf7600cf8`、`c414dd42-6d88-488e-83fc-c9249dc68b17`、`b2208cc0-c1be-470a-8654-eda686bd96f3`、`aae355a9-0e59-4fba-9cc7-d991576f31c5`；覆盖NATS停止恢复、Platform API和Temporal Worker重启、毒消息/错owner ACK隔离与JetStream重投、AUTO活动重复派发抑制、Mandate暂停阻止后续订单、Trade提交后断联、Temporal重试并查询原单、UNKNOWN按原`clientOrderId`恢复，以及短暂Temporal不可用后的重投。四场景同Run证据出口核对PAPER/FIXTURE/FAKE；无真实行情源或券商调用，报告确认精确隔离资源清理。机器报告[JSON](../../../evidence/audits/2026-10-11-v15-nats-temporal-dispatch-sq-v15-e2e-dec42825cd8376398a70.json)，SHA-256 `2a7e28080e3a25ff5ba30d160d8be7164017454838053e57805968d7cc0422cd`；执行日志[日志](../../../evidence/audits/2026-10-11-v15-current-tree-recovery-e2e-a03.log)，exit 0，SHA-256见[sidecar](../../../evidence/audits/2026-10-11-v15-current-tree-recovery-e2e-a03.log.sha256)。这是固定隔离恢复覆盖，不代表Mac睡眠/唤醒、完整V1业务备份恢复、Ubuntu或阶段人工验收通过；本轮TestRun的人工结论仍NOT_RUN。

### 8.47 V1.5 当前树完整隔离阶段入口复跑（2026-10-12）

执行`pnpm test:e2e -- --stage V1.5`，完整日志/exit/SHA见[复跑日志](../../../evidence/audits/2026-10-12-v15-current-tree-stage-e2e-a01.log)、[退出码](../../../evidence/audits/2026-10-12-v15-current-tree-stage-e2e-a01.log.exit.txt)及[SHA-256](../../../evidence/audits/2026-10-12-v15-current-tree-stage-e2e-a01.log.sha256)，受控exit 0。真实NATS JetStream/Temporal/PostgreSQL与领域容器启动；三项Chromium用例通过，其中主用例执行normal NO_TRADE、AUTO交易、暂停Mandate拒绝及recovery；每个场景经同Run CLI/export，另有能力阻塞和Incident身份用例。Platform 7条路由匿名/伪造owner拒绝矩阵及4种运行模式注入拒绝通过。normal/AUTO/recovery TestRun分别为`2c4be751-34fc-4b19-8bcc-f6f8ff67b8c9`、`f19348cc-ad7d-437f-9390-e6d53920dd45`、`4622a913-28ae-4b8d-8f76-6ed9e9042f73`。Harness核实随机项目`sq-v15-e2e-004ec1c10490dcebd6a7`的容器、PostgreSQL/NATS/Temporal/Artifact四卷和网络均按精确名称移除；外部行情源及真实券商调用0。

本次只验证固定Fixture自动路径。各Run`manualConclusion=NOT_RUN`；Mac睡眠/唤醒、其它多故障Worker组合、真实市场日历/结算、完整V1.1–V1.4活动配对恢复、Ubuntu与当前范围本人验收仍未满足，不能据此关闭V1.5/P5。

### 8.48 V1.5 当前树完整代码套件复跑（2026-10-12）

`pnpm verify:stage -- --stage V1.5 --suite code`在受控本机回环/容器环境退出0。基线67/67、工作区build/lint/typecheck及服务单测通过；Market Data隔离HTTP/PG集成28/28、Python适配器69/69通过；Platform、Governance、Trade、Portfolio四服务独立数据库迁移通过，Platform Outbox原子性5/5、Run Incident 3/3通过，linux/arm64 Trade readiness通过。隔离PostgreSQL容器/网络均清理并核验，活动服务`NOT_CONNECTED`。完整日志、退出码与SHA-256见[code suite日志](../../../evidence/audits/2026-10-12-v15-current-tree-code-suite-a01.log)、[exit](../../../evidence/audits/2026-10-12-v15-current-tree-code-suite-a01.log.exit.txt)和[SHA-256](../../../evidence/audits/2026-10-12-v15-current-tree-code-suite-a01.log.sha256)。这不验证Mac睡眠/唤醒、全域配对恢复、Ubuntu实机或当前范围人工验收。

### 8.49 owner范围历史Run成交追溯（2026-10-12）

正式Web新增“打开历史运行（只读）”入口，选项来自当前用户近期V1.5 Run摘要；切换时清空旧成交选择，通过既有owner保护详情和Incident API读取所选Run，不创建或修改业务事实。`pnpm test:e2e -- --stage V1.5`退出0，normal、AUTO、rejection、recovery及能力阻塞/Incident用例3/3通过。主流程创建AUTO Run `de0e683f-02fa-4ef2-a158-1b7b4137103d`，后续完成rejection与recovery，再从近期历史列表重开该AUTO Run；Web显示同一TestRun ID，并可选择四笔Fill逐项核对Proposal、Mandate、FakeBroker Order、Portfolio现金与FakeBroker现金，均与owner认证详情API证据一致。四场景各自的CLI同Run检查及证据导出通过，人工结论均为`NOT_RUN`。完整代码门禁`pnpm verify:stage -- --stage V1.5 --suite code`也退出0。运行日志、退出码及SHA-256见[E2E日志](../../../evidence/audits/2026-10-12-v15-historical-run-fill-trace-e2e-a02.log)、[E2E exit](../../../evidence/audits/2026-10-12-v15-historical-run-fill-trace-e2e-a01.exit.txt)、[E2E SHA-256](../../../evidence/audits/2026-10-12-v15-historical-run-fill-trace-e2e-a02.log.sha256)和[code suite日志](../../../evidence/audits/2026-10-12-v15-historical-run-fill-trace-code-a04.log)。隔离项目容器、卷和网络由Harness精确清理；真实行情/券商调用0。

本实现仅覆盖owner近期列表内的V1.5 Run；不提供跨阶段或列表之外的任意Fill检索，也未贯通告警/能力/比较页到成交的导航。V1.5-S2-L19/P5保持`OPEN`；睡眠/唤醒、Ubuntu和当前范围本人验收未由本次执行覆盖。

### 8.50 按External Fill ID检索V1.5历史成交链路（2026-10-12）

V1.5验收页新增External Fill ID搜索；Platform API `GET /api/v1/acceptance/v1/v1.5/fills/{externalFillId}/trace`按当前会话owner和`stage_id=V1.5`在完整历史Run证据中精确查找，不受近期Run列表20条限制。不存在或其他用户的Fill均返回404；同一用户多个Run出现相同Fill ID时返回409，不猜测目标。页面只读打开命中Run并选中该Fill，展示其已持久化Proposal、Mandate、FakeBroker Order/Fill、Outbox和Portfolio/FakeBroker对账。

PostgreSQL集成测试将目标Run设为90天前并确认其不在`listV15Runs(owner, 1)`结果内，仍可按Fill ID找回；另一owner持有相同ID不泄漏，缺失ID返回空，当前owner出现重复ID时失败关闭。完整`pnpm verify:stage -- --stage V1.5 --suite code`退出0，日志[code suite a03](../../../evidence/audits/2026-10-12-v15-fill-id-trace-code-suite-a03.log)、[exit](../../../evidence/audits/2026-10-12-v15-fill-id-trace-code-suite-a03.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v15-fill-id-trace-code-suite-a03.log.sha256)。当前树`pnpm test:e2e -- --stage V1.5`隔离浏览器3/3通过，normal/AUTO/rejection/recovery的同Run CLI/export、历史AUTO四笔成交及按Fill ID搜索核对通过；随机容器、卷、网络已清理，外部行情/真实券商调用0。见[E2E日志](../../../evidence/audits/2026-10-12-v15-fill-id-trace-e2e-a01.log)、[exit](../../../evidence/audits/2026-10-12-v15-fill-id-trace-e2e-a01.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v15-fill-id-trace-e2e-a01.log.sha256)和[隔离Run报告](../../../evidence/audits/2026-10-11-v15-nats-temporal-dispatch-sq-v15-e2e-fb8424b59c5a689bc260.json)。本项只关闭近期列表范围之外的V1.5 Fill定位子项；跨阶段追溯、关联事实重新核验、告警/能力/比较导航和人工验收仍未完成，V1.5-S2-L19/P5继续OPEN。

### 8.51 V1.5 Incident与AUTO取消路由拒绝模式注入（2026-10-12）

隔离V1.5完整Web/API/CLI Harness在Run Incident确认路由提交四种交易模式，均422且Incident保持OPEN；随后合法确认和幂等重放通过。专用AUTO取消Harness同样对四种模式拒绝并核对取消事实不变；正式Web在FakeBroker提交部分成交后取消原Run，最终仅1笔25股Fill、订单CANCELLED、剩余预约RELEASED、无后续订单、FakeBroker/Portfolio `MATCH`，同Run CLI/export通过。正常V1.5阶段Harness浏览器3/3、模式创建边界和Incident确认通过；专用AUTO取消重跑浏览器3/3、精确容器/卷/网络清理通过。证据汇总见[A108](../../../evidence/audits/2026-10-12-v1-l17-cancel-mode-boundaries-a108.json)，标准Run报告[见此](../../../evidence/audits/2026-10-11-v15-nats-temporal-dispatch-sq-v15-e2e-f1969e9b3ae6011602c8.json)，AUTO取消报告[见此](../../../evidence/audits/2026-10-11-v15-auto-trade-cancellation-sq-v15-e2e-ca6df78b79cb538c5b78.json)。首次AUTO取消Run因历史回查断言固定要求4笔Fill而失败；修正为按取消结果期待1笔后复验通过，原失败报告保留于[此处](../../../evidence/audits/2026-10-11-v15-auto-trade-cancellation-sq-v15-e2e-ad2e3ecb1205cc60367a.json)。

上述证据只覆盖V1.5两个Platform端点的固定拒绝/幂等场景，V1.5所有服务/Worker写路由、活动发布回退、全域恢复、Ubuntu与人验仍未关闭。

### 8.53 V1.5 Incident确认与AUTO取消六种模式矩阵（2026-10-12）

将V1.5 Run Incident确认及AUTO Run取消的客户端交易模式拒绝检查扩展至完整`PAPER/BACKTEST/LIVE × FAKE/REAL`六组合。标准隔离Harness在Incident确认入口逐项发送六种组合，每次均422且Incident保持OPEN；后续合法确认/幂等重放仍通过。专用AUTO取消场景在FakeBroker已提交部分成交后发起同Run取消，六种注入均422且取消事实不变；订单最终CANCELLED、25股部分成交、剩余量取消、Reservation RELEASED、无后续Session订单，FakeBroker/Portfolio对账MATCH，同Run CLI/export通过。标准阶段浏览器4/4、专用AUTO取消浏览器4/4；完整V1.5 code suite exit 0，真实券商/外部来源调用0，隔离资源精确清理。

证据：[标准阶段E2E](../../../evidence/audits/2026-10-12-v15-l17-six-mode-e2e-a01.log)、[AUTO取消E2E](../../../evidence/audits/2026-10-12-v15-l17-six-mode-auto-cancel-e2e-a01.log)、[完整code suite](../../../evidence/audits/2026-10-12-v15-l17-six-mode-code-suite-a01.log)，各自附有exit与SHA sidecar。此项仅覆盖两个V1.5 Platform入口，不关闭其他服务/Worker写路由、阶段缺项、Ubuntu、完整恢复或人工验收。

### 8.52 V1.5 Run创建完整客户端模式注入矩阵（2026-10-12）

在V1.5正式验收页建立本地会话后，读取owner范围Run列表作为持久化基线，依次向`POST /api/v1/acceptance/v1/v1.5/runs`提交`PAPER/FAKE`、`PAPER/REAL`、`BACKTEST/FAKE`、`BACKTEST/REAL`、`LIVE/FAKE`、`LIVE/REAL`六种客户端模式组合。六项均在派发前返回422；前后TestRun ID列表均为空，没有新增Run或Workflow派发。随后既有V1.5 normal、AUTO、rejection、recovery Web场景及同Run CLI/evidence export完整通过；AUTO Run四笔成交可从owner历史记录读回。真实券商/行情源调用0，隔离项目容器、PostgreSQL/NATS/Temporal/Artifact卷和网络精确清理。

完整V1.5隔离E2E日志、退出码与SHA-256见[日志](../../../evidence/audits/2026-10-12-v15-l17-mode-injection-e2e-a01.log)、[exit](../../../evidence/audits/2026-10-12-v15-l17-mode-injection-e2e-a01.log.exit.txt)及[SHA-256](../../../evidence/audits/2026-10-12-v15-l17-mode-injection-e2e-a01.log.sha256)。后续完整`pnpm verify:stage -- --stage V1.5 --suite code`在受控本机回环环境exit 0，基线、Crosswalk、合同/Fixture、全仓lint/typecheck/unit、Trade隔离故障、Market Data HTTP/PG及四服务迁移检查通过；隔离数据库、容器和网络清理验证通过，见[code suite日志](../../../evidence/audits/2026-10-12-v15-l17-mode-injection-code-suite-a01.log)、[exit](../../../evidence/audits/2026-10-12-v15-l17-mode-injection-code-suite-a01.log.exit.txt)及[SHA-256](../../../evidence/audits/2026-10-12-v15-l17-mode-injection-code-suite-a01.log.sha256)。本项只扩展V1.5 Platform Run创建入口的拒绝矩阵；其他服务/Worker入口、完整运行时故障恢复、Ubuntu和当前范围本人验收仍未完成，L17/P5/V1保持开放。

### 8.54 V1.5-S2-L17 strict-cash evidence semantic refresh (2026-10-12)

A137只复核`V1.5-S2-L17`一条：OD-014获批准后，共享Portfolio/Trade Paper当前树定向测试通过，V1.4完整隔离code suite报告9组跨域账本对账/9次FakeBroker幂等资产重放，V1.4容器化Web/API/CLI E2E 7/7并完成同Run CLI检查。该证据补足共享严格现金实现的当前证据，但没有证明V1.5 AUTO全链路结算Parity。V1.5仍是三会话合成日历、两次执行；真实时钟/权威日历/一般化多日调度/完整日终、Worker恢复和人验仍OPEN/NOT_RUN，因此P5不关闭。[A137语义复核](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a137.md)、[A137矩阵](../../../evidence/audits/2026-10-12-v1-current-gap-matrix-a137.json)、[strict-cash code suite](../../../evidence/audits/2026-10-12-v14-full-code-suite-strict-cash-a01.log)、[Web/API/CLI E2E](../../../evidence/audits/2026-10-12-v14-strict-cash-web-e2e-a01.log)。

### 8.55 V1.4共享Trade执行费用变更后的V1.5兼容回归（2026-10-12）

V1.4 US固定Fixture费用/滑点修复后，受控执行`pnpm verify:stage -- --stage V1.5 --suite code`，完整套件exit 0。套件覆盖全仓基线、Trade构建与隔离安全探针、V1.5 Platform/PostgreSQL迁移、Market Data隔离HTTP/PG、Platform Run Incident集成及当前树V1.5代码检查；临时数据库/网络均报告PASS并移除，服务`NOT_CONNECTED`，未连接真实数据源或券商。日志、exit及SHA见[V1.5 code suite](../../../evidence/audits/2026-10-12-v15-post-a142-code-suite-a01.log)、[exit](../../../evidence/audits/2026-10-12-v15-post-a142-code-suite-a01.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v15-post-a142-code-suite-a01.log.sha256)。

这是共享依赖变更后的当前树兼容复验，不等同完整AUTO业务恢复/实时时钟/日历验收；Ubuntu和本轮人工验收仍NOT_RUN，P5继续OPEN。

### 8.56 V1.5 JetStream dispatch envelope字段白名单（2026-10-13）

`validateV15DispatchEnvelope`现对envelope、payload及嵌套session字段执行白名单校验，未知字段、六种客户端环境/券商模式及status/cash/ledger/order业务事实注入均由consumer validator拒绝。定向Vitest 19/19通过；完整`pnpm verify:stage -- --stage V1.5 --suite code` exit 0，隔离PostgreSQL与精确资源清理通过。[执行日志](../../../evidence/audits/2026-10-13-v15-l17-dispatch-envelope-mode-http-unit-a01.log)、[退出码](../../../evidence/audits/2026-10-13-v15-l17-dispatch-envelope-mode-http-unit-a01.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-13-v15-l17-dispatch-envelope-mode-http-unit-a01.log.sha256)。本次注入证据为validator单测；没有单独声称坏消息JetStream端到端测试。本项不关闭V1.5业务恢复、Ubuntu或人工验收。

### 8.57 当前树 V1.5 四场景主要功能复验（2026-10-13）

执行 `pnpm test:e2e -- --stage V1.5`，隔离真实PostgreSQL、NATS JetStream、Temporal、Platform/Trade/Portfolio/Governance及Web环境。浏览器4/4通过：normal、双市场AUTO、rejection、recovery；AUTO Run `7a7b15ba-a02a-4b62-ba99-f9e3bdef5b7a`查询并追溯4笔Fill，四个Run均通过同Run CLI/证据导出。报告保留`manualConclusion=NOT_RUN`；外部来源/真实券商调用为0，随机项目容器、持久卷、网络清理通过。[机器报告](../../../evidence/audits/2026-10-13-v15-nats-temporal-dispatch-sq-v15-e2e-7a86df3dcd7b56648bef.json)，SHA-256 `5106c93b15dbeed3ec67af3d0322435941635afbb874416ed1d1ca00276a0fa8`。本次确认V1.5固定场景当前树可用，不替代完整V1 code/E2E回归或人验；日历仍是合成Fixture，不代表实时市场观察。

### 8.58 V1.5 AUTO实际业务事实本地配对恢复（2026-10-13）

`STOCKQUANT_V15_E2E_BACKUP_RESTORE=true pnpm test:e2e -- --stage V1.5` exit 0。固定AUTO Run `c37b5b88-4a7b-4fd4-928c-b3fde11e42bd`在PostgreSQL/NATS JetStream/Temporal/Artifact四卷存档后恢复至新卷；原Run仍`AUTO_TRADE_EXECUTED`，4订单/4 Fill，组合及Mandate预算读回、业务状态和账本MATCH。normal/rejection/recovery同Run CLI/export和隔离资源清理通过。完整报告及四卷归档Hash见[机器报告](../../../evidence/audits/2026-10-13-v15-paired-backup-restore-sq-v15-e2e-e946ae2d2ce051439c03.json)，报告SHA-256 `9262b3b4751f68945264921b3de64e076ca944159c4f62b7a96d75132411a2f2`。Artifact内容是为精确测试Run写入的合成内容寻址探针，不是Qlib真实模型Artifact；恢复证明限于V1.5隔离栈和其业务Run，不证明异地/宿主灾备、生产RPO/RTO或Qlib Artifact跨阶段恢复。人工验收NOT_RUN。

### 8.59 当前候选重新验收（2026-10-13）

重新执行标准`pnpm test:e2e -- --stage V1.5`及配对恢复环境`STOCKQUANT_V15_E2E_BACKUP_RESTORE=true pnpm test:e2e -- --stage V1.5`，两者exit 0。标准浏览器4/4，AUTO四笔Fill追溯、四场景同Run CLI/export通过；配对恢复后原AUTO订单/成交/组合账本保持MATCH。报告分别见[标准E2E](../../../evidence/audits/2026-10-13-v15-nats-temporal-dispatch-sq-v15-e2e-b9bfad6c14160fc11f15.json)与[配对恢复](../../../evidence/audits/2026-10-13-v15-paired-backup-restore-sq-v15-e2e-082ede02bbf443ef315f.json)。外部数据源/真实券商调用0，隔离资源清理通过；Artifact仅以合成探针验证卷恢复，真实Qlib Artifact恢复未验证。生成Run的`manualConclusion`不由自动测试或文档代签。

### 8.60 V1.5完成态与当前TestRun Bundle复验（2026-10-14）

修正AUTO成交、paused-mandate拒绝和原单恢复业务断言全部通过后，StageRun状态仍为WAITING的问题：三种已完成的业务工作流现在持久化COMPLETED，NO_TRADE观察Run仍保留WAITING；浏览器和同Run CLI依照各自真实完成态核对，未降低业务断言。执行环境选项 STOCKQUANT_V15_PRESERVE_RUN_EXPORTS=true 下运行 pnpm test:e2e -- --stage V1.5，退出0，4/4通过：normal进行了120次Fixture观察且无订单；AUTO双市场执行并追溯4笔Fill；paused-mandate拒单；恢复场景通过。四Run均完成同Run CLI与Evidence Export并保留Bundle：normal 0142b7ca-43ca-4f79-bf55-d36eed38b813（WAITING，两断言PASS）；AUTO baf7dfea-2a62-48a3-879b-9ece98b5ae0f（COMPLETED，5项PASS）；rejection f060fa86-0fe5-4322-9fc1-8fa6a6f30890（COMPLETED，3项PASS）；recovery dce571d9-51d7-4d2b-a5e4-a933ce384594（COMPLETED，2项PASS）。Manifest SHA依次为69e66bc7c8c1442619a504138f139516e734ebf7bff58b9cde8e292463577541、299baa8152f17f501f6bdd6feb8a437be779ccf98b0988b980ef71fbc293386f、7428d402104c8ce94a8bdcce988e339816d587fe556dbb0baa60d8c9216cb24d、976a2dd8c04b3f59e09eb5898d7b28cd3dce25d203b3ead636c805206531a9af。报告[JSON](../../../evidence/audits/2026-10-14-v15-nats-temporal-dispatch-sq-v15-e2e-b3092c429344ecbdf32a.json)，报告SHA-256 4c0ad1bea5740136baa9598c847f2071a02fdc58c9effbc1b09f3f335ddfde6c。真实来源/券商调用0；隔离项目及精确资源清理通过。Run内人工结论仍NOT_RUN；本次状态结论不延伸到未运行的日终或实时时钟观察。

# V1.5 无人逐笔操作、故障恢复与 V1 验收

状态：PARTIALLY_IMPLEMENTED（2026-09-09历史模拟/NATS/Temporal/Ubuntu烟测与人工签署保留；2026-10-07隔离交互栈、真实JetStream去重、normal NO_TRADE→Temporal工作流、Temporal服务/NATS/Platform/网络/PG会话/进程恢复、单消费者lost-ACK同序号redelivery、Temporal调用边界瞬态错误NAK重投、Activity执行期间Platform/Temporal Worker重启、双Worker独立durable竞争/稳定Workflow启动幂等及单Platform Worker/API进程故障后的备用Worker接管均已核验；PostgreSQL/NATS/Temporal三卷配对恢复后同Run的120项观察、Workflow完成态及JetStream ACK状态保留亦已通过。该配对快照只覆盖V1.5隔离栈，不含V1.1–V1.4 Artifact数据，不证明宿主/异地灾难恢复或RPO/RTO。交易/日终其它Workflow、告警证据贯通、双Worker同时故障、UNKNOWN及Ubuntu详细证据未完成，第7节未验，第8节仅部分可执行）。版本入口：[README](./README.md)。共同约束：[三版共同规则](../05-three-version-delivery.md)。

2026-10-07 P5真实Temporal服务中断：独立隔离E2E先停止Temporal服务，再创建normal TestRun；确认Platform对同一Run的Temporal派发真实失败并NAK，重启同一Temporal容器/持久卷后Run完成120项权威观察。浏览器normal/rejection/recovery矩阵1/1、同Run CLI/export及随机项目资源清理通过；外部来源/真实券商调用0。详细故障时序、Run ID和源码Hash见[停机恢复审计](../../../evidence/audits/2026-10-07-v15-temporal-server-outage-e2e.md)。这是服务单次停机恢复证据，不覆盖数据库错误、网络隔离、双Worker或备份恢复。

2026-10-07 P5持久派发与恢复增量：V1.5 normal NO_TRADE经Platform PostgreSQL事务写入TestRun+Outbox、JetStream durable consumer校验消息后启动稳定Temporal Workflow。隔离E2E验证NATS短停、派发前Platform重启、坏JSON与错误owner消息终止、同Run重复消息首次ACK丢弃后以`message.info.redelivered=true`真实重投、Relay恢复后原Outbox事件最终ACK；独立Run注入一次Temporal调用边界UNAVAILABLE，实际观察5秒NAK、JetStream重投并完成120次权威观察；另在CN_A Activity已开始后重启Platform/Temporal Worker，原Run基于Temporal持久历史恢复并完成。双Worker独立durable consumer均ACK同一normal TestRun，并实际观察Temporal稳定Workflow ID重复启动幂等收敛。完整时序见[持久派发审计](../../../evidence/audits/2026-10-07-v15-nats-temporal-dispatch-e2e.md)及[双Worker审计](../../../evidence/audits/2026-10-07-v15-multiworker-e2e.md)。PostgreSQL主机灾难恢复、双Worker故障切换、其他非法消息矩阵、交易/日终、拒绝/UNKNOWN、全V1/Artifact卷备份及Ubuntu和人工验收仍未完成。

2026-09-23 当前 Compose 运行时补充：阶段一只读检查发现当时 NATS JetStream 没有挂卷、Temporal `start-dev` 使用内存持久化；这不推翻 2026-09-09 历史测试结果，但说明它们未验证当前 Compose 容器重建后的状态保留。现已按[本地持久化恢复 Runbook](../../operations/nats-temporal-persistence-recovery.md)锁定两镜像 digest、配置 NATS/Temporal 命名卷，并实测 NATS 测试消息与 Temporal 已完成 Workflow 在强制容器重建后仍可读。该补充只证明本机单节点 Compose 恢复，不证明宿主灾难恢复或生产 HA；完整输出见[阶段五审计](../../../evidence/audits/2026-09-23-phase-5-nats-temporal.md)。

2026-10-07 P1交互栈增量：V1.5隔离Compose真实包含固定Digest的NATS JetStream/Temporal、随机PostgreSQL以及容器Web；Platform NATS重复消息探针PASS（同Msg-ID两次publish，JetStream仅1条），Temporal cluster health为SERVING，随机项目所有卷/资源精确清理。完整边界见[P1 V1.5交互栈审计](../../../evidence/audits/2026-10-07-p1-v15-interactive-stack.md)。V1.5场景业务仍WAITING；该运行没有调用Temporal workflow probe来假设worker已接线，长观察、双Worker、睡眠/备份恢复及用户验收仍未通过。

2026-10-06 V1完整闭环P0审计更正：复核发现原`V15OrchestrationEngine`按场景名直接填写60日HOLD/零订单、暂停拒绝、未知单查询、双Worker单发送者及备份一致等字段，再比较自行构造的expected/actual并生成PASS；当次路径没有实际调用NATS、Temporal、FakeBroker、账本或备份恢复。该实现现改为`WAITING`/`NOT_RUN`，分别标注workflow未接线、订单/Fill/账本未创建，所有业务断言保持WAITING。历史TestRun及2026-09-09签署保留其历史范围，不追认到本轮的新要求。该变更纠正证据表达，不实现或验证V1.5工作流。V1.5 code suite受控运行结果及源码Hash见[P0基线审计](../../../evidence/audits/2026-10-06-v1-p0-baseline.md)与[机器摘要](../../../evidence/audits/2026-10-06-v1-p0-baseline.json)。

## 1. 前置与范围

V1.1～V1.4通过；真实NATS、Temporal与已验收领域服务接入。

本阶段所有订单、券商资产和成交均来自隔离模拟环境。真实业务数据库、Qlib或RD-Agent在声明“已验证”时必须真正执行；替身需独立标注。

## 2. 开发任务

- [ ] 实现市场日历交易工作流与自动日终对账；当前仅完成冻结虚拟日历上的NO_TRADE读证据，不包含交易计划、执行窗口或日终账务对账。
- [ ] 实现完整暂停/恢复、UNKNOWN原单查询、执行中的重启恢复与错过窗口策略；已通过单消费者消息重投、Platform Worker执行中恢复、双Worker重复Workflow启动幂等及单Worker/API故障后备用Worker接管NO_TRADE子场景，但真实交易/UNKNOWN事实与双Worker同时故障切换尚未接入。
- [x] Activity执行期间Platform API/Temporal Worker重启恢复：CN_A `verifyNoTradeSessions`已开始后重启随机隔离Platform容器，原Workflow完成120条权威读取（[执行中Worker重启审计](../../../evidence/audits/2026-10-07-v15-nats-temporal-dispatch-e2e.json)）；受限网络、UNKNOWN、多Worker故障切换及备份恢复仍未验；真实Temporal服务停机/同实例重启恢复另见[停机恢复审计](../../../evidence/audits/2026-10-07-v15-temporal-server-outage-e2e.md)。
- [x] V1.5 normal NO_TRADE以PostgreSQL原子Outbox→真实JetStream→Temporal稳定Workflow ID运行，并经 owner/TestRun范围检查；坏JSON与错误owner消息实际终止，同一TestRun重复消息首次ACK丢弃后真实redelivery，恢复后原Outbox也ACK；第二个TestRun上的一次性Temporal `UNAVAILABLE`异常经真实NAK/redelivery后完成120项Workflow。独立多Worker durable consumer重复派发同一Run也通过稳定Workflow ID幂等收敛（[坏消息/丢ACK重投E2E](../../../evidence/audits/2026-10-07-v15-poison-envelope-e2e.md)，[完整派发和瞬态重试E2E](../../../evidence/audits/2026-10-07-v15-nats-temporal-dispatch-e2e.md)，[双Worker E2E](../../../evidence/audits/2026-10-07-v15-multiworker-e2e.md)）。
- [x] 单Platform Worker/API进程故障接管子场景：主/备用独立durable收到同一Run后终止隔离主Platform容器，备用Worker启动该Run的Temporal Activity并ACK原消息；恢复主API后原Run完成120项权威读取（[故障切换E2E](../../../evidence/audits/2026-10-07-v15-worker-failover-e2e.md)）。此项只关闭NO_TRADE单Worker进程故障，不覆盖双Worker同时故障或真实交易/UNKNOWN。
- [ ] 把已创建页面的告警、能力阻塞、验收中心证据和比较功能贯通；支持从任一成交追溯完整链路。
- [ ] 提供外部故障演练脚本和操作Runbook，覆盖Worker/总线重启、断网、睡眠恢复、双Worker竞争；Web仅记录操作提示和回收证据。
- [x] PostgreSQL进程停机恢复：终止隔离V1.5栈数据库容器进程，恢复同容器/卷后观察同一JetStream序号NAK、重投、ACK及同一Run完成120项观察；源码Hash和范围见[数据库进程恢复审计](../../../evidence/audits/2026-10-07-v15-database-outage-e2e.md)。这不代表备份/恢复或宿主故障切换。
- [x] V1.5隔离栈配对卷恢复子场景：全栈停止后对PostgreSQL集群、NATS JetStream和Temporal SQLite三个卷逐份归档/记录SHA与大小，恢复到新卷并重启；同一TestRun保持120项权威HOLD观察，Temporal Workflow和JetStream ACK状态保留，资源精确清理（[审计](../../../evidence/audits/2026-10-07-v15-paired-backup-restore-e2e.md)）。这不覆盖V1.1–V1.4 Artifact文件卷、Ubuntu、异地备份或RPO/RTO。
- [ ] 全V1隔离备份恢复；执行Mac M1完整模拟E2E及目标Ubuntu架构烟测，记录未覆盖环境，V1证据打包。

## 3. 同步 Web 开发

正式页：总览、调度、暂停、告警、对账和恢复状态。验收页：全链路回归、外部演练步骤、截图/Trace、各阶段人工签署。

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

## 7. 阶段交付待办（完成后勾选）

以下勾选只记录本阶段交付进度，不能代替第2节逐项开发任务或版本验收结论。开发者凭实现/实测证据勾选开发项；“人工验收”仅在用户实际确认后勾选，不预填PASS。

- [ ] 契约、数据结构、场景定义和预期结果已冻结。
- [ ] 第2节后端任务完成，真实依赖与替身明确。
- [ ] 正式Web功能页及验收中心正常/异常场景完成。
- [ ] 命令、实际URL、Fixture路径/Hash和配置说明已补齐，待实现占位已消除或明确列为范围外。
- [ ] 开发者按第8节从准备到导出亲自执行，保存代码版本、退出码、截图/Trace和断言证据。
- [ ] 重复/恢复及适用观察期验证完成，未覆盖项如实记录。
- [x] 用户已通过Web及命令证据完成人工验收，记录确认时间/结论（2026-09-09，PASS）。
- [ ] 操作说明与限制已更新，[本版验收表](./99-acceptance.md)已同步。

## 8. 阶段验收操作手册

### 8.1 当前可执行性与验收准备

手册状态：PARTIALLY_VERIFIED_EXECUTABLE（2026-10-07：隔离stack启动/精确关闭、容器Web路由、NATS JetStream去重探针、Temporal集群健康及normal NO_TRADE的Web/API/CLI/export业务E2E均已实测；normal工作流经真实NATS Outbox派发到Temporal并完成120条虚拟session权威读取；NATS/Temporal服务/Platform/Worker/网络/PG会话/进程恢复及双Worker同Run派发幂等子场景已有隔离E2E。拒绝/恢复业务、PostgreSQL主机/卷故障、双Worker故障切换、备份和当前范围人工验收未完成）。本节只对已实际运行的操作写入证据；未验证业务命令和路径仍明确标出，不推断为通过。

前置服务：V1核心服务、真实NATS/Temporal、Gateway/FakeBroker、备份恢复工具与外部故障执行器。

固定输入：CN/US 60个当地交易日HOLD Fixture及独立调仓/UNKNOWN/日历边界Fixture；seed=20260907。

| 开发交付时必须填写 | 当前值 |
|---|---|
| 实测代码Commit或工作区Hash/验证日期 | 待实现后填写 |
| 项目根目录、Node/pnpm/Python/uv及Docker版本 | 待实现后填写 |
| Web基础URL/身份登录或会话建立方式 | 待实现后填写；不记录密码/token |
| 本阶段Web路由 | `/acceptance/v1/v1.5`（已验证隔离交互路由） |
| 正式页面的真实入口/跳转链接 | 启动时打印随机loopback URL；2026-10-07最终复验 `http://127.0.0.1:50143/acceptance/v1/v1.5` |
| Fixture文件/数据版本/确切日期/Hash、规则与成本版本 | 待实现后填写；不能只写“小样本” |
| 配置文件及必需环境变量名/非秘密测试值 | 待实现后填写；凭证只记录引用方式 |
| 外部故障目标及可执行命令、恢复/隔离清理入口 | 待实现后填写；不适用项注明理由 |
| 预期耗时、轮询超时、实际观察期/预算 | 待实现后填写，不用无限等待或假成功 |

### 8.2 初始化与启动（隔离交互栈已实测；业务验收待执行）

在上表填写的项目根目录运行；工具版本按锁文件/项目说明准备。首次开发由开发者生成锁文件和脚本，验收者不负责补建环境。环境变量按上表配置；保持FAKE券商与模拟账户，真实模型仅在本阶段明确要求且预算已配置的场景调用。

```bash
# 终端A：先确认实际执行目录为项目根目录
pwd
pnpm install --frozen-lockfile
pnpm stack:up -- --stage V1.5

# 终端B：按启动输出复制精确项目ID，停止仅本项目
pnpm stack:down -- --project sq-v15-stack-d2e239bfd22aa2a378b8
```

2026-10-07最终实测随机项目`sq-v15-stack-70a462189477cbbd2c16`，容器Web HTTP 200；Platform的真实NATS JetStream探针PASS，重复Msg-ID只保留一条消息；Temporal CLI cluster health返回`SERVING`。关停后精确项目PostgreSQL/NATS/Temporal卷、容器、网络、镜像、0600 env/state均清理。Harness输出实际Web/API URL、broker FAKE、LIVE false和stop命令。上例ID/URL仅是已完成审计的示例；每次启动必须以本次Harness打印的新值为准。业务normal NO_TRADE经真实JetStream Outbox派发并由Temporal执行的隔离E2E见下方记录；其它业务场景、故障恢复、备份、Ubuntu和人工验收仍未完成。

2026-10-07隔离业务normal E2E新增：随机项目`sq-v15-e2e-c6da10b7e980bc5a5834`使用真实PostgreSQL、Portfolio Risk、Trade Execution/FakeBroker、Temporal、NATS和容器Web。正常Run `9e08dadd-c56f-422b-b7e6-aa3250b2d065`对冻结日历逐日执行CN_A/US_EQUITY各60个日期的权威账户与FakeBroker查询，共120条；零订单、零Fill、零预留、资金/持仓与账本版本不变，`V1.5-HOLD-002=PASS`，workflow `COMPLETED`。浏览器内同Run CLI check-only退出2且忠实返回WAITING，证据export退出0；拒绝Run `b0e2f24e-1977-42c1-8d15-3fc381aa2eed`、恢复Run `37619e69-5c30-4571-8ba9-8ea4f8c5ead1`仅证明NOT_CONNECTED/NOT_RUN呈现、同Run CLI与导出路径，绝非其业务场景通过。隔离Harness 1/1并精确清理容器、卷、网络及镜像，真实来源/券商调用0；详见[机器审计](../../../evidence/audits/2026-10-07-v15-no-trade-workflow-e2e.json)。日历Fixture为日期型虚拟日程，不是实际等待窗口或完整交易所日历。拒绝/恢复业务、UNKNOWN、备份还原、Ubuntu和当前人工验收仍未完成；NATS事件驱动与双Worker同Run幂等另有后续E2E证据。

初始化在验收中心“准备隔离运行”完成；CLI场景入口也负责同样的准备，两者调用同一业务API。准备后记录testRunId、accountId、namespace及Fixture/DataVersion；初始化业务本身是测试对象时不得预先完成被测动作。缺源/凭证/历史数据时显示缺项，不静默换成Fake并报真实场景通过。

### 8.3 Web逐步操作及预期结果

1. 登录上表实际Web地址，进入“开发验收中心→V1→V1.5”；检查页面版本、模拟模式、服务能力与固定输入。
2. 每个场景点击“准备隔离运行”，核对参数后记下testRunId；正常/异常/恢复使用独立运行，场景内部的重复或恢复操作继续使用原运行及业务幂等键。
3. 按下表执行。操作按钮为目标交互，交付时开发者必须换成实际页面名称/按钮及路由；预期必须从业务明细读取，不能只看“任务完成”。

| 场景ID（阶段内唯一） | 场景 | 点击顺序/输入 | 预期结果与核对点 |
|---|---|---|---|
| normal | 后台自动调度 | 准备模拟Mandate→启用日历调度→关闭Web→由后台推进场景→重开总览；再运行60日HOLD。 | 调仓全链路可追溯；HOLD两市场均零委托、零交易预算消耗，页面不承担调度。 |
| rejection | 暂停与过时窗口 | 在执行过程中暂停，再注入合法在途Fill；运行错过交易窗口和USD不足子场景。 | 暂停不再签新发送许可但继续合法入账；不补旧单、不用CNY净值放行USD订单。 |
| recovery | 进程与备份恢复 | 按限定脚本在UNKNOWN/ACK前重启Worker或总线，运行双Worker竞争；在隔离恢复目标恢复备份。 | 只查不重下、无重复入账、仅一个有效发送者；恢复数据与Artifact一致，原环境未清空。 |

4. 从运行详情打开关联正式页面，执行一次刷新/关闭再打开；核对长任务后台状态、历史证据和加载/失败/陈旧提示。
5. 每项记录实际结果、截图与业务ID。异常场景“预期拒绝”被正确验证时断言可PASS，但被测业务操作仍显示拒绝；若意外接受则断言FAIL。

### 8.4 命令行复验与相同运行核对（待实现）

在项目根目录执行以下目标命令。stage/scenario必须匹配8.3定义；CLI与Web共用场景版本、Fixture和断言。每条命令执行后立即查看退出码，任何非零先保存错误再定位，不能继续假定本阶段通过。

```bash
pnpm verify:stage -- --stage V1.5 --scenario normal --seed 20260907
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
# 粘贴Web运行详情中的实际testRunId，再按回车；这是普通ID，不是凭证
read -r acceptance_run_id
pnpm verify:stage -- --stage V1.5 --run "$acceptance_run_id" --check-only
 echo $?
pnpm evidence:export -- --run "$acceptance_run_id"
 echo $?
```

check-only仅查询此运行后端事实并追加检查证据，不创建新订单、不重放成交或发起模型调用；空ID/错误stage/越权run必须拒绝。导出只含脱敏数据，输出实际目录和Manifest Hash，不自动勾选人工验收。端到端正常/异常/恢复运行产生不同ID，导出时分别保存。

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

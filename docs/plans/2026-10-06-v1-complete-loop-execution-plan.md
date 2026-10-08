# V1 完整模拟闭环执行计划

日期：2026-10-06（Asia/Shanghai）。状态：IN_PROGRESS（P0工程基线完成；P1～P6未完成）。起始基线：`c0f6745`；本计划及旧计划接替说明为起始时两项文档改动。当前源码基线、证据Hash与运行命令见[P0基线审计](../../evidence/audits/2026-10-06-v1-p0-baseline.md)。后续实施状态以追加审计为准。

本计划接替[9月30日总交付计划](./2026-09-30-complete-delivery-plan.md)的当前主工程排序，只推进 V1 完整闭环及必要前置。旧计划保留 V2/V3、来源、实际观察和最终 Ubuntu 等剩余范围与历史证据；这些工作没有取消，也没有自动通过。本计划不启动或恢复 Codex 目标、自动化或活动服务。

## 1. 目标、范围与完成定义

交付一条可真实操作、持久化、恢复和独立核验的链：冻结日线数据 → 真实 Qlib/确定性策略目标 → 治理建议与人工审批/预授权 → 风控和资源预留 → 执行授权 → FakeBroker 独立状态 → 成交入账/结算 → 对账 → 日终及后台恢复 → 正式 Web、验收中心、同 Run CLI 与证据导出。

覆盖 CN_A/CNY 与 US_EQUITY/USD；A股为主要人工路径，美股必须完成 Fixture 基础回归。全部账户、订单和成交为隔离模拟事实，LIVE/真实券商配置在启动与写边界拒绝。真实 Qlib 不等于真实行情，固定 RD-Agent 兼容探针不等于真实模型实验。

权威要求不变：[三版共同规则](../prd/05-three-version-delivery.md)、[V1版本计划](../prd/v1-local-simulation/00-version-plan.md)、[V1测试计划](../prd/v1-local-simulation/90-test-plan.md)、[V1验收](../prd/v1-local-simulation/99-acceptance.md)、[架构](../../architecture/README.md)、[市场契约](../prd/03-market-rules-and-contracts.md)、[未决事项](../decisions/open-decisions.md)。实现阶段逐一读取各阶段全文及对应服务架构。

| 里程碑 | 允许宣称的结论 | 退出条件 |
|---|---|---|
| M0 基线可信 | 已明确缺口和可复现基线 | P0完成；所有V1必需项已映射，合成结果不充当业务PASS |
| M1 交易链可验证 | V1.3隔离业务链工程通过 | P1/P2工程前置具备、P3全矩阵通过；未签署前不标正式阶段PASS |
| M2 本地闭环工程就绪 | V1本地闭环工程就绪 | P1～P5全部工程门禁、当前环境部署/恢复和手册通过 |
| M3 V1正式验收 | V1正式PASS | P6完成；五阶段当前必需要求、版本门禁及真实用户签署全部满足 |

若现有阶段要求包含尚缺的真实Ubuntu明细、活动存储切换或其他外部决定，M2可独立记录，M3继续INCOMPLETE。不得修改Verifier、删除未决验收行或把模拟架构当实机来放行。目标架构烟测属于本计划；V3最终Ubuntu迁移/真实模型/实际交易日观察不在本计划执行范围。若需调整现有验收归属，先形成需求差异与去向表，经明确范围决定后同步PRD、追踪、架构、合同及测试，再变更门禁。

## 2. 当前基线与已知缺口

2026-10-06编制时实际执行 `node scripts/verify-version.mjs --version V1|V2|V3`（分别执行三个命令）：均exit 2/INCOMPLETE，未决阶段5/5/4，证据引用/Hash检查无失败。V1历史Run未决7项，V2为6项，V3为0项；这不是业务正确性或人工验收通过。此前V1证据失败已经修复，不重复把旧诊断列为当前失败。

| 阶段 | 可复用基础 | 本计划必须解决 |
|---|---|---|
| V1.1 | 账户、契约、生成客户端、隔离stage存储、身份与Artifact切片 | V1实际调用的合同/迁移/发布覆盖；统一可追踪Artifact；当前交互环境和存储切换/回退要求；历史证据缺口 |
| V1.2 | 锁版Qlib CPU/fit Fixture、数据PIT预览、Artifact任务原子发布及隔离手册 | 双市场Qlib fit/TopK与NO_TRADE Artifact、Web/同Run CLI、取消和真实Platform重启恢复工程验证通过；OD-007治理/活动策略决定、新增范围人工验收与Ubuntu证据未完成 |
| V1.3 | WAITING合同、人工审批纯领域规则、V2.4隔离交易链及故障实现 | Proposal/审批持久化与可信身份、MANUAL/AUTO全链、CN/US、真实故障矩阵和独立断言 |
| V1.4 | Quant-owned持久BacktestRun、日线BUY/SELL、部分成本/结算规则 | 适用市场规则/日历/公司行动；与Paper规则对照；取消恢复与可交互正式报告 |
| V1.5 | NATS/Temporal真实探针与持久卷证据 | 去掉常量业务PASS；真实调度/日终/双Worker/未知单恢复；隔离备份恢复、手册及用户验收 |

V1.5当前 `V15OrchestrationEngine`直接填写60日HOLD、备份一致与唯一发送者等结果，不能作为业务证据；真实组件探针保留原适用范围。V1.3当前WAITING不是代码回归失败，更不能被替换为合成订单PASS。

## 3. 执行纪律与依赖

唯一主工程包按 **P0 → P1 → P2 → P3 → P4 → P5 → P6** 推进。P0先封住V1.5误报；P2不得成为耗时的模型研究项目，先做确定性Qlib因子与NO_TRADE/低换手TopK Fixture；P3优先打一笔真实持久订单，再逐项补拒绝/恢复。已有V2.4组件按语义复用，不复制特定CN快照政策充当通用双市场日线规则。

工程验证可在已验证必要前置上推进，正式阶段签收仍遵守原依赖。必要前置尚未人工通过时不得伪称通过；准备态、自动断言、手册和人工结论分别记录。

- 每包按合同/固定场景 → 后端 → 正式Web及验收中心 → 独立断言/故障 → 手册/证据交付；Web不留到最后集中开发。
- 不扩展V2/V3容量、真实来源、真实模型、Agent/Memory、真实券商能力。为V1修复共享依赖时仅做适用回归。
- 默认并发1。每次运行独立account/namespace、缓存、事件和Artifact前缀；凭据由隔离Harness生成，不读活动`.env.local`作为测试默认。
- 业务Clock注入且按run隔离；网络/租约超时使用真实单调时钟。虚拟60个当地交易日HOLD只是固定场景，不抵扣真实观察日数。
- 一个切片一份源码/锁/合同/Fixture/镜像证据快照。实施时遵守提交与审批约束，保存可复现版本；不自动提交其它任务改动、不重置用户工作树。
- 没有新改动或证据变化，不反复跑完整套件、重建全仓镜像或刷新无变化外部预检。

### 3.1 当前剩余交付队列（2026-10-07）

本表是P0完成后的唯一执行队列索引；各包正文复选框仍是状态事实来源。本表不改变既有需求、正式验收或用户签署条件。工程证据、历史Run恢复、用户决定和目标环境验收分别结论；没有原始Run就保留其缺口，不得由新Run替代。

| 顺序 | 工作包 | 交付结果与关闭证据 | 当前状态/阻塞 |
|---|---|---|---|
| 0 | 收敛与可回退检查点 | 维护此表及下方唯一剩余项；核实工作树改动归属/生成物/日志，不覆盖用户文件；形成可定位源码快照和恢复步骤 | 已完成内容快照及恢复说明：[检查点](../../evidence/checkpoints/2026-10-07-worktree-before-p1-artifact-lifecycle.md)、[本地归档SHA-256](../../evidence/checkpoints/2026-10-07-worktree-before-p1-artifact-lifecycle.archive.sha256)、[文件清单](../../evidence/checkpoints/2026-10-07-worktree-before-p1-artifact-lifecycle.sha256)；已验证本地归档中8242个路径与清单一致。126.82 MB归档因超过GitHub单文件100 MB限制而保持本地，不进入版本库；归档路径已加入忽略规则。快照不含.git和忽略文件；未清理共享工作树 |
| 1 | P1 TestRun与派发 | 各V1异步路径的受理事务、持久状态、稳定业务身份、API重启后原Run恢复；刷新和CLI只读同Run；NATS/Temporal Outbox原子入队及重投去重 | 当前V1.1–V1.5路径矩阵与V1.5 Outbox回滚集成已记录；本项关闭，P1父项仍受Artifact生命周期和活动存储切换前置阻挡 |
| 2 | P1 Artifact与并发生命周期 | 对确实产生字节产物的行情Fixture/研究模型/回测报告/TestRun证据使用稳定ArtifactRef；内容Hash不可变、owner/TestRun隔离、失败/取消不发布、受控读取/导出；并发取消/发布与fencing有证据。结构化订单、Fill、资产和账本仍由领域服务保存，不伪装成文件Artifact | V1.2模型与V1.4报告为当前V1动态字节Artifact producer：owner/TestRun绑定、内容Hash、受控读取/导出已验证；V1.4取消/发布行锁fencing代码集成2/2通过，V1.2取消/重启生命周期有隔离E2E。Fixtures继续以版本化Manifest管理，交易事实归领域服务；本轮V1.3冻结Fixture为仓库输入，不新增动态Artifact producer，见[Artifact盘点复核](../../evidence/audits/2026-10-08-p1-artifact-inventory-recheck.md)。剩余为OD-013保留/孤儿清扫/删除决定与验证；不启用物理删除 |
| 3 | P1存储切换前置 | 在恢复副本验证迁移、双写/切换与回退，交付维护窗口、活动writer暂停/恢复、旧RUNNING/WAITING处置和备份核对Runbook | 隔离迁移/双写/回退机制有PASS证据；切换准备包已列清活动副本恢复演练和责任输入：[切换准备审计](../../evidence/audits/2026-10-07-p1-storage-cutover-preparation.md)。活动数据备份/恢复演练、维护窗口、责任人与旧非终态Run处置仍未完成；真实活动切换保持未授权 |
| 4 | P1结项审查 | 账户/合同/环境/TestRun/Artifact各父项均有覆盖矩阵；`verify:version`和证据审计无虚假PASS；输出P1明确结论 | 已审查并记录为NOT_CLOSED：[P1结项审查](../../evidence/audits/2026-10-07-p1-close-review.md)。依赖项3的活动副本恢复演练/维护输入与OD-013治理决策未满足，P1不能勾选；队列继续转入不依赖活动数据的P3工程切片 |
| 5 | P3单一交易主线 | 选固定双市场Fixture主场景，同一策略Artifact追踪到Proposal/审批或Mandate、风控预留、授权、FakeBroker订单/Fill、Portfolio入账及独立对账；页面、同Run CLI、导出核验同一UUID | 固定业务矩阵21/21、CN/US、拒绝/UNKNOWN/重启/乱序/T+1与同Run CLI/导出已有当前PASS；Web刷新恢复缺陷已修复；L07/L08 sequenced Fill与撤单协调均已提取到Platform Application并完成全套单测、完整代码门禁和21/21隔离Web/API/CLI回归，见[应用服务审计](../../evidence/audits/2026-10-08-p3-v13-sequenced-fill-application-service.md)。PAPER/LIVE/REAL边界已在Portfolio、Trade、Governance三个高风险HTTP写入口补独立模式拒绝/无副作用断言，见[边界审计](../../evidence/audits/2026-10-08-p3-paper-fake-server-boundary.md)；不能据此宣称全路由审计完成。真实市场规则与任意故障组合未获证明。P3仍未关闭：完整市场规则/边界、整版验收、Ubuntu及新增范围人工签署分开保持未完成 |
| 6 | P4 Paper规则对照 | 冻结适用规则/费用输入；相同信号与成交输入下逐笔比较回测与Paper金额、数量、报价档、费用、结算及公司行动，差异修复或明确拒绝边界 | 部分对照已通过；费用模型/市场日历与完整规则仍有已知差异 |
| 7 | P5 后台交易、日终与恢复 | 真实交易授权/日终Workflow；关页持续、暂停/撤销、UNKNOWN原单查询、乱序/重放无重复入账；多Worker、故障及隔离配对恢复按V1要求验证 | 当前NO_TRADE工作流与基础设施恢复已有大量证据；交易/日终业务连接和完整故障/备份项开放 |
| 8 | P6交付与版本验收 | 五阶段可执行手册、适用全回归、证据包、7个历史Run恢复或持续缺失处置、版本Verifier；用户本人完成新增范围签署及目标Ubuntu必需验证 | 最后执行；历史Run缺失、用户决定/签署、Ubuntu环境不可由自动测试代替 |

所有现存P1～P6未勾选项均映射到上述队列；只有对应退出条件和可重读证据齐备时才勾父项。P1未结项前可以准备P3固定场景和契约，但不以准备工作宣称P1关闭或交易闭环通过。

## 4. P0：可信基线与场景清单（预计1～2开发人日）

负责人：主开发执行者。进入条件：本计划作为当前工程入口；旧总目标保持暂停。

- [x] 记录HEAD/status、锁文件、已有脚本、场景版本、迁移、活动与隔离环境边界；生成本次快照，见[P0基线审计](../../evidence/audits/2026-10-06-v1-p0-baseline.md)。
- [x] 对V1五阶段第2/7/8节及90/99逐条建覆盖表：要求/测试ID、事实所有者、实现路径、场景、证据、缺项、责任包、状态。106项覆盖映射见[P0覆盖台账](../../evidence/audits/2026-10-06-v1-p0-coverage.md)，历史勾选仅作为来源声明并复核其证明范围。
- [x] 审查五个验收引擎。V1.5未执行项改为WAITING/NOT_RUN；保留已有业务FAIL，未执行业务不会返回COMPLETED/PASS。历史Run未改写。
- [x] 盘点V1历史7个未决Run的精确UUID与导出缺口，见基线审计；仅恢复原记录的规则已明确，无法恢复项继续在版本门禁显示INCOMPLETE。
- [x] 冻结L01～L10场景输入与预期；目前固定交易、市场规则与故障输入均标为Fixture/模拟，新增Fixture需独立版本Manifest并留存来源、SHA-256、时钟及故障序列。

退出条件：每项必需要求都有负责包；不存在未执行业务被显示PASS的新路径；当前门禁输出及缺口已保存。此包不关闭业务验收。

## 5. P1：账户、合同、持久任务与交互环境（预计2～4开发人日）

主要位置：`packages/contracts/`、Platform、Portfolio、Market Data、`infra/compose/`、Web。

- [x] 完成V1启用能力的Schema/OpenAPI/生成TS/Python和消费者发布/漂移检查；其它版本独有边界登记去向，不伪称全仓任务已完。验证记录：[P1合同与兼容性审计](../../evidence/audits/2026-10-07-p1-contracts-and-arm64-compat.md)。
- [x] 验证双市场初始化、原币资金、独立账本、同键重放/异载荷冲突、owner/run越权和LIVE拒绝。当前树真实隔离PostgreSQL验证CN_A/CNY与US_EQUITY/USD双账户及各自期初账本、同键幂等/异载荷与异owner冲突、跨owner读取拒绝；Portfolio HTTP smoke验证LIVE初始化返回403且无账户副作用；V1.3正式E2E覆盖CN/US执行与owner/TestRun约束。证据：[P1账户闭环审计](../../evidence/audits/2026-10-07-p1-account-identity-ledger-matrix.md)。
- [x] 当前V1.1–V1.5的持久TestRun/派发路径、API/Worker恢复及Web创建后CLI同Run只读核验已按覆盖矩阵复核；V1.5 WAITING TestRun与Outbox同事务提交，故障注入证实Outbox插入失败时TestRun一起回滚。[覆盖矩阵](../../evidence/audits/2026-10-07-p1-testrun-dispatch-matrix.md)、[V1.5原子Outbox代码套件](../../evidence/audits/2026-10-07-p1-v15-outbox-atomicity-code-suite.md)。历史缺失结构化Run不由新Run覆盖，另列P6处置。
- [x] 当前V1动态字节Artifact producer（V1.2 Qlib模型、V1.4 Quant回测报告）统一映射公共ArtifactRef，内容Hash不可变、owner/TestRun隔离、失败/取消不发布、受控读取/导出；版本化Fixture仍按Fixture Manifest治理，订单/Fill/资产/账本归各领域服务。证据：[Artifact生命周期审计](../../evidence/audits/2026-10-07-p1-artifact-lifecycle-matrix.md)。
- [x] V1.2/V1.4取消与发布竞争、重启恢复和fencing有隔离验证；V1.4锁序反例2/2通过，完整当前代码套件exit 0见[V1.4完整代码套件](../../evidence/audits/2026-10-07-p1-v14-artifact-fencing-complete-code-suite.log)。
- [ ] OD-013的保留期、孤儿Artifact识别/清扫及物理删除政策仍OPEN；在明确决策与恢复证据前不自动到期、不物理删除。此治理决策不因现有ArtifactRef纵切而关闭。
- [x] 提供贯穿五阶段的隔离可交互环境：随机项目、回环端口、明确生命周期、容器化Web与真实容器后端。打印实际URL、身份建立方法、超时与精确清理范围。五阶段环境生命周期均已独立实测；各业务阶段验收和P1总体退出条件仍分别开放。
- [ ] 活动legacy/stage存储切换若为V1必需交付：先在活动数据恢复副本演练迁移与回退，完成恢复核对和旧非终态Run处置，再冻结维护窗口、writer暂停/恢复顺序、值守人与回退责任人；本计划编制不授权暂停活动writer或修改活动卷。隔离持久化复验只证明迁移/双写/回退机制：[审计](../../evidence/audits/2026-10-07-v11-storage-persistence-rerun.md)。

退出条件：账户/持久任务/Artifact真实PG与身份检查通过，当前环境关闭/刷新页面不丢Run，初始Web/API/CLI同Run可核验。

2026-10-06 P1执行记录：V1.1隔离存储模式normal/rejection/recovery及Web/同Run CLI复核3/3通过，完整隔离脚本含code suite exit 0；证据见[本轮审计](../../evidence/audits/2026-10-06-p1-v11-stage-rerun.md)。这只关闭该测试切片，P1其它合同/迁移发布、Artifact生命周期、环境切换与当前人工验收仍未完成。

2026-10-07 P1交互环境增量：新增V1.2隔离交互入口，随机Compose项目/回环端口，容器化Web连真实隔离Platform、Qlib worker、Governance、Market Data与PostgreSQL；凭据及关停状态以0600存于忽略目录。Web HTTP 200、Platform `/live` 正常，统一 `stack:down -- --project <精确项目>`通过stop marker触发Harness完成清理，最终容器/卷/网络/镜像及凭据均为0。真实V1.2 Qlib完整E2E既有验证见P2；本次只测栈启动与页面/API可达，没有创建业务Run或人工验收。审计见[V1.2隔离交互栈](../../evidence/audits/2026-10-07-p1-v12-isolated-interactive-stack.md)及输入SHA-256清单。P1五阶段交互栈、共享合同发布、全Artifact生命周期和切换/回退仍未完成，原“贯穿五阶段”勾选保持未完成。

2026-10-07 P1 V1.3隔离交互栈及矩阵回归：随机项目 `sq-v13-web-773629b8e36c2a5e16f3` 使用SCRAM-SHA-256主机认证、随机角色口令和服务token，Web `http://127.0.0.1:50251/acceptance/v1/v1.3`、Platform `/live`、Trade `/ready`通过；0600凭据/状态文件、精确stop marker及Harness清理实测成功，人工验收未记录。随后修复自动E2E清理遗漏的项目Web/Trade/Governance镜像，启用L08专用一次性投递失败后，完整Web/API/CLI矩阵20/20通过（`sq-v13-web-af5ff20faa2d6ca4c386`）；独立检查项目容器/卷/网络/镜像均为0。首次未启用故障开关的19/20失败及两轮重跑均保留日志和解释，详见[SCRAM矩阵审计](../../evidence/audits/2026-10-07-v13-scram-e2e-retry.md)。当前更新只补齐V1.3交互栈切片与P3固定矩阵回归；V1.4/V1.5交互栈、共享合同、TestRun派发与Artifact生命周期、存储迁移/回退及用户验收均仍待办，P1总体勾选保持未完成。

2026-10-07 V1.4集成边界凭据加固复验：移除V1.4 Compose PostgreSQL `trust`及固定服务Bearer token，改用SCRAM-SHA-256、每个隔离项目随机DB角色/超级用户口令和服务token，所有业务DB连接显式认证；持久任务探针改用运行时token。第一次随机项目运行准确失败在一个尚使用旧固定token的内部幂等重试探针（403，已保留为执行问题）；修复后 `pnpm test:integration:v14-backtest` 全套PASS，项目`sq-v14-backtest-12903920de9fc80f826d`，包括前置取消、Quant前及Quant持久化后Platform重启恢复、同TestRun幂等/冲突、市场限制/历史费用/公司行动、5/5 Web测试和7个浏览器Run同Run CLI；15个Quant BacktestRun/Manifest结果Hash相同，16个TestRun，真实行情/券商调用0。每个Run的结构化证据及hash manifest已输出；Compose容器/卷/网络清理通过，且Stage用户验收仍NOT_RUN。共享codeVersion输入清单已抽成同一模块，由自动集成与交互栈共用；该集成复跑确认代码摘要`sha256:3d09a8c94828e47c7bfe0743a0d049495f5d6f5846072a7471a3c9925f223439`。详见[V1.4持久任务审计](../../evidence/audits/2026-10-07-v14-durable-tasks-12903920de9fc80f826d.md)。这是V1.4集成栈凭据安全及既有用例复验，不构成V1.4交互栈、P1整体或版本放行完成。

2026-10-07 P1 V1.4交互栈纵切：新增V1.4手动验收隔离入口和正式容器Web profile，沿用随机项目/回环端口、随机SCRAM凭据与服务token、0600忽略目录和精确stop marker；禁用延时测试Hook，环境标记BACKTEST/FAKE且LIVE关闭。实测项目`sq-v14-stack-f130ccd6951b701f2096` Web `http://127.0.0.1:49683/acceptance/v1/v1.4` HTTP 200、Platform `/live`正常、DB `password_encryption=scram-sha-256`；精确`stack:down`与前台Harness均验证容器/卷/网络/项目镜像/凭据均清理。首次关停后Harness把预期移除前存在的项目镜像误判为清理失败，修复核验顺序后重跑成功；人工验收仍NOT_RECORDED。V1.1至V1.5各自交互栈现均有生命周期实测；P1合同/Artifact/存储迁移与各阶段人工交接尚未完成，故只关闭五阶段交互环境这个单独子项。

2026-10-07 P1 V1.5隔离交互栈纵切：增加可交互容器化V1.5 Web、真实隔离PostgreSQL、固定Digest的NATS JetStream与Temporal开发服务器；Compose以随机项目隔离所有PostgreSQL/NATS/Temporal卷、只绑定回环端口，SCRAM随机凭据/服务Token以0600保存，LIVE关闭。实测项目`sq-v15-stack-d2e239bfd22aa2a378b8`页面`http://127.0.0.1:49903/acceptance/v1/v1.5` HTTP 200；真实Platform NATS探针PASS，重复相同Msg-ID后streamMessages=1，Temporal CLI集群健康`SERVING`。精确关停确认容器、三个项目卷、网络、镜像及凭据状态均清理，人工验收NOT_RECORDED。此处只验证交互/中间件可达性：V1.5业务工作流仍WAITING，Temporal页面探针没有替代Worker/业务链集成、60日观察、双Worker/备份恢复演练。详见[P1 V1.5交互栈审计](../../evidence/audits/2026-10-07-p1-v15-interactive-stack.md)及[历史执行快照SHA-256](../../evidence/audits/2026-10-07-p1-v15-interactive-stack.sha256)。V1.1至V1.5交互环境生命周期要求现有环境证据，故只勾选该具体环境子项；P1其余合同、Artifact、TestRun、存储维护任务继续未勾，P1总体未退出。

2026-10-07 P1合同发布与架构兼容性：`pnpm contracts:check` exit 0，验证289个JSON文件（203 schemas、46 Fixtures）、生成的TypeScript/Python合同与29个客户端生成器、111条消费者兼容规则及24份OpenAPI合同；生成漂移和合同检查均通过。随后`pnpm verify:compat -- --platform linux/arm64` exit 0，使用本地锁定Node 24.1.0镜像构建并在linux/arm64容器内执行Platform探针，host为darwin/arm64且未发生架构模拟。首次受限执行因无法访问Docker daemon在构建前失败，保留该尝试；获准本地daemon访问后原命令通过。机器结果与输入Hash见[P1合同/兼容性审计](../../evidence/audits/2026-10-07-p1-contracts-and-arm64-compat.md)。此项只关闭P1合同/消费者漂移检查，不代表账户、TestRun事务、Artifact生命周期或存储迁移已通过；P1及V1总体保持开放。

2026-10-07 P1隔离持久账户/Web基线初次复验：当次`pnpm test:e2e -- --stage V1.1` exit 0并通过normal/rejection/recovery 3/3，但检查发现V1.1代码分支没有调用完整注册套件，故该历史结果仅作为Web切片保留、不算完整code suite。后续已修正入口、补齐集成测试并重跑，见本节“代码套件入口和账户矩阵完成”记录及[P1账户身份账本矩阵](../../evidence/audits/2026-10-07-p1-account-identity-ledger-matrix.md)。

2026-10-07 P1 V1.1代码套件入口和账户矩阵完成：检查发现V1.1 `--suite code`曾绕过注册套件中的PostgreSQL/Trade/Market Data集成、Python adapter和ops检查，已改为调用统一`codeSuiteCommands`完整清单。首轮完整运行暴露P5.7历史预期陈旧（成交按10bp滑点及两个权威Fill实际扣款766.5210，旧断言为766.0305）；保留首轮失败，按实际Fill事件、价格、费用和PostgreSQL NULL序号排序修复，并将P1真实PG测试扩展为双市场原币/独立初始账本、同键重放及异载荷/异owner拒绝。最终`pnpm test:e2e -- --stage V1.1` exit 0，完整code套件所有集成检查、容器Web normal/rejection/recovery 3/3及同Run CLI检查通过；Portfolio HTTP身份smoke实际LIVE请求403、账户副作用0。最终日志和代码/输入Hash见[P1账户身份账本矩阵](../../evidence/audits/2026-10-07-p1-account-identity-ledger-matrix.md)。另结合[V1.3当前树正式矩阵](../../evidence/audits/2026-10-07-v13-governance-coordination-after-revision.md)确认CN/US执行和owner/TestRun边界。该证据只关闭P1账户身份/账本验证项；TestRun/outbox原子事务、通用Artifact与活动存储维护仍未完成。

2026-10-07 P1 V1.2/V1.4持久Artifact导出：V1.2随机隔离栈的完整Web/API/CLI Qlib流程exit 0，四个Run覆盖双市场正常fit、拒绝、恢复探针、Platform重启续跑；完成Run的 owner-scoped Qlib Artifact 下载后，导出包列出同一ArtifactRef并通过内容SHA-256校验，取消Run不发布Artifact，人工结论保持NOT_RUN。证据：[V1.2结构化E2E](../../evidence/audits/2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-1b9ee3cef4f70f4bc004.json)、[输入Hash清单](../../evidence/audits/2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-1b9ee3cef4f70f4bc004.sha256)及[导出包](../../evidence/local/V1.2/7e9468f3-a532-48be-bfba-8a925f0e72d6/evidence.json)。V1.4完整隔离回测栈17个Platform TestRun/16对Quant BacktestRun与Manifest哈希匹配，Web/CLI同Run及报告Artifact导出通过，附件原始JSON字节SHA与ArtifactRef一致；容器/卷/网络/镜像清理完成，人工结论NOT_RUN。证据：[V1.4结构化E2E](../../evidence/audits/2026-10-07-v14-durable-tasks-a6bf8ae8c9262747df8f.json)及[审计说明](../../evidence/audits/2026-10-07-v14-durable-tasks-a6bf8ae8c9262747df8f.md)。此增量关闭两个Artifact样本链，不关闭通用Artifact生命周期、成交/行情映射、取消发布竞争/fencing、P1或正式版本验收；首次镜像元数据EOF及此前错误路由/回执的失败记录均保留。

2026-10-07 P1持久TestRun与派发复核：按[V1.1–V1.5路径矩阵](../../evidence/audits/2026-10-07-p1-testrun-dispatch-matrix.md)复核每阶段持久化/恢复与Web创建后CLI同Run只读路径；补充V1.5真实PostgreSQL Outbox原子性测试，正常提交TestRun/Outbox同事务，注入Outbox约束失败后两表均无Run痕迹。完整V1.5 code suite包含共享lint/typecheck/build/unit、合同/服务检查及该隔离PG测试，exit 0（[报告](../../evidence/audits/2026-10-07-p1-v15-outbox-atomicity-code-suite.md)、[终端日志](../../evidence/audits/2026-10-07-p1-v15-atomic-outbox-code-suite.log)、[源码/日志SHA-256](../../evidence/audits/2026-10-07-p1-v15-outbox-atomicity-code-suite.sha256)）。当前TestRun/派发复核子项勾选；这不关闭P1父项，Artifact完整生命周期、取消/发布fencing和存储迁移维护仍未完成。首次数据库测试夹具错误独立保留于[失败记录](../../evidence/audits/2026-10-07-p1-v15-outbox-atomicity-first-attempt-failure.md)。

2026-10-07 P1账户矩阵后的V1门禁：`node scripts/verify-version.mjs --version V1` exit 2 / `INCOMPLETE`；阶段文档结构5/5、证据引用300项、13份Manifest和29个Manifest条目均通过且无路径/Hash错误。V1.1–V1.5仍为PARTIALLY_IMPLEMENTED，七个既有TestRun结构化导出缺失、版本摘要/门禁复选未通过，P1/P2剩余工作、目标环境和人工验收继续开放。机器快照：[V1门禁JSON](../../evidence/audits/2026-10-07-v1-gate-after-p1-account-matrix.json)。

## 6. P2：冻结数据、真实Qlib与策略输出（预计3～5开发人日）

主要位置：Market Data、Quant/Qlib worker、`fixtures/v1/`、数据与策略页。

- [x] 完成CN 10只与US 3只冻结日线样本，满足预热及分市场训练/验证/测试/标签窗口；含缺失、退市、拆股公司行动与未来PIT探针。新版本v4；旧失败候选保留。
- [x] 证券/每证券IANA时区/币种/raw OHLCV与独立公司行动、availableAt/asOf和合成工作日日历均在Fixture契约明示；独立验证未来PIT排除及标签时间屏障，v1日线经独立契约与市场字段保持DAILY_BAR语义。
- [x] 对两个独立受控隔离E2E的同一冻结输入，真实锁版Qlib执行分市场fit/predict；独立校验20日特征与收盘收益标签。两次运行的模型与测试预测SHA完全一致，证明此输入/环境下确定性重现，不推及其它平台/规模。
- [x] 固定NO_TRADE空目标与明确原因；TopK有版本化目标/策略Hash、输入/数据Hash、asOf及逐目标原因。Fixture策略只用于隔离模拟，不替代OD-007活动策略决定。
- [x] 实际策略目标通过合同交给治理，不由Platform直接生成成交；拒绝未来数据/不足历史/未知规则并保存零副作用断言。
- [x] 正式数据/策略页提供Fixture预览、质量、因子/策略输出、任务进度/取消/结果及错误；浏览器刷新及Platform重启后从持久状态恢复同一Run。
- [x] 固定代码RD-Agent兼容探针实际运行并标记无真实模型调用；依赖/源commit/平台和资源边界已在本阶段证据记录。

退出条件：固定输入→真实Qlib→持久目标/Artifact→Web/同Run CLI可验证，PIT拒绝和任务取消/恢复通过。小样本不能证明策略收益或真实市场数据能力。

2026-10-07 P2当前工作树回归：`pnpm test:e2e -- --stage V1.2`在隔离真实Compose、PostgreSQL、容器化Qlib Worker与本机Web下Playwright 1/1通过；四个分离Run经Web持久回读与同Run CLI核对，覆盖CN/US Qlib、normal/rejection/recovery probe、取消无Artifact、Platform进程重启恢复，Governance行断言`[2,0,0,0]`通过，Harness清理已核验。随后完整`pnpm verify:stage -- --stage V1.2 --suite code`受控本机重跑exit 0，包含真实Qlib fit smoke、隔离PostgreSQL/HTTP与Market Data Artifact重启检查，并再次跑通隔离Web/API/CLI 1/1；本次四个Run为`29a16b68-b6a9-48a4-8f32-05e469b993f4`、`3c9486dd-62d5-4c39-857e-8c4d119a555e`、`a06209ed-e935-4423-83f9-08cfd11c9f4f`、`a71a23fb-6068-4762-a542-6b1ddf0ccbf3`，项目`sq-v12-e2e-1dd2d38c42f2392cb0b4`清理核验通过。普通沙箱首跑的loopback `EPERM`保留为平台权限失败。最新[隔离机器结果](../../evidence/audits/2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-1dd2d38c42f2392cb0b4.json)及[历史执行快照SHA-256 Manifest](../../evidence/audits/2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-1dd2d38c42f2392cb0b4.sha256)与[完整代码套件日志](../../evidence/audits/2026-10-07-v12-code-suite-current.log)已归档；快照记录本次执行输入，不代表后续工作树哈希。此回归不关闭历史TestRun导出、真实行情、Ubuntu或新增范围人工验收，V1.2仍为PARTIALLY_IMPLEMENTED。

2026-10-07 V1总门禁复核：阶段文档审计5/5通过，活动证据审计204引用/11个活动Manifest/23条目/0失败；`pnpm verify:version -- --version V1`仍exit 2/INCOMPLETE，原因包括V1.2一条、V1.3三条、V1.5三条历史TestRun缺少结构化导出，五阶段执行/签署要求也未全部完成。另有一轮因把P1交互栈历史执行SHA清单误当活动源码Manifest，Verifier报告两条过期哈希；已将stage文档标签更正为“历史执行快照”，保留原SHA文件未改写并复验恢复为PASS。V1不放行，未新增人工签署。

2026-10-06 P2前置纠正：因子预览原为固定排名，现改为NOT_RUN/WAITING；完整V1.2 code suite经修复一个集成测试变量遗漏后exit 0，Web/同Run CLI验证normal确实保持WAITING。审计见[V1.2因子边界与复验](../../evidence/audits/2026-10-06-v1-p2-v12-static-factor-fail-closed.md)。P2核心数据/真实Qlib策略输出仍未完成。

2026-10-06 P2数据基础推进历史快照：冻结了v1.2-market-data-4双市场合成研究Fixture（10只CN、3只US、60工作日、774 bar），并接通Market Data生成客户端及Web预览。该段关于normal WAITING是该时点结论；后续P2增量见本节末尾，原快照及失败候选记录不改写。详见[API预览审计](../../evidence/audits/2026-10-06-v1-p2-marketdata-research-fixture-api.md)及[P2全套验证报告](../../evidence/audits/2026-10-06-v1-p2-dual-market-fixture-full-suite.md)。

2026-10-06 P2增量：V1.2 normal现从冻结v4 Fixture生成20日动量、20日成交量比、区间因子，按CN_A/US_EQUITY分别通过锁版Qlib 0.9.6/LightGBM 4.7.0执行fit/predict；未来收盘收益标签、边界purge及availableAt/asOf独立检查均通过。TestRun生成TopK与空NO_TRADE两个版本化策略目标并写入不可变Artifact；正式Web读取相同Run Artifact，CLI `--check-only`对同一Run验证成功。真实Qlib、浏览器、API和同Run CLI的随机隔离E2E退出0，Playwright与资源清理核验通过，细节和模型/预测/策略/Artifact/Fixture哈希见[P2真实Qlib闭环审计](../../evidence/audits/2026-10-06-v1-p2-qlib-strategy-loop.md)、[机器Run结果](../../evidence/audits/2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-cfed4f354f335e110e07.json)及[历史执行快照输入Hash清单](../../evidence/audits/2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-cfed4f354f335e110e07.sha256)。这关闭了策略计算/Artifact可读的工程缺口，但没有关闭独立策略有效性验证、任务取消/重启恢复、人工验收或真实市场数据能力；P2仍未达到退出条件。

2026-10-06 P2增量复验：策略Artifact合同新增策略级与目标级原因，Web页面以`?runId=`持久指向当前TestRun，刷新后从PostgreSQL恢复同一Run。定向真实Qlib/Playwright/同Run CLI E2E通过，normal/rejection/recovery-probe均保留独立Run；报告与完整输入Hash见[V1.2刷新恢复E2E](../../evidence/audits/2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-20365e923bb39b9f1dcc.json)和[历史执行快照SHA清单](../../evidence/audits/2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-20365e923bb39b9f1dcc.sha256)。锁版Qlib两次隔离训练的模型及预测SHA一致；这不验证Qlib任务在Platform进程重启时会自动恢复，也没有运行中取消策略Run的UI/后端动作；P2仍不结项。

2026-10-06 P2运行态增量：Qlib TestRun任务增加持久阶段、Web运行中安全取消、Platform启动恢复和 advisory lock 双worker fencing；Artifact身份迁移为TestRun范围复合主键，确保内容相同的Artifact可供不同TestRun各自引用。真实隔离PostgreSQL 3/3、取消无Artifact、Platform在US市场fit阶段重启后原Run `resumeCount=1`完成双市场拟合、持久Artifact、Web刷新和同Run CLI验证均通过；完整V1.2 code suite exit 0。证据含报告、全部Run事实、日志和SHA见[V1.2真实重启恢复门禁](../../evidence/audits/2026-10-06-v12-code-suite-platform-restart.log)、[隔离E2E结果](../../evidence/audits/2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-c803feeff360de114c1a.json)和[历史执行快照输入Hash清单](../../evidence/audits/2026-10-06-v12-code-suite-platform-restart.sha256)。此前两次失败记录原样保留，分别暴露全局Artifact主键冲突和Harness场景计数错误，均经修复及完整重验。P2仍有活动策略至Governance handoff/OD-007、当前范围用户验收与Ubuntu实机证据待办；工程退出不等于人工或版本签署。

2026-10-07 P2策略治理交接完成：新增V1.2策略快照命令/目标Schema及Governance OpenAPI，Governance使用独立PostgreSQL收件箱按owner/TestRun/strategy持久化、同内容幂等、冲突409；只有Platform服务可提交。Platform在不可变Qlib Artifact发布后提交TopK和空NO_TRADE精确输出，两份Governance `RECEIVED`收据成为normal Run独立断言。Governance不把快照转成Proposal、授权、订单或账本事实。normal/rejection/取消/Platform重启恢复与同Run CLI隔离Web E2E通过；PostgreSQL直接断言`[normal snapshots=2, future-data rejection snapshots=0, normal proposals=0, normal execution authorizations=0]`，短历史在Qlib调用前失败，未知策略规则被治理拒绝且不写收件箱。Playwright 1/1、V1.2平台定向单测6/6、Governance定向单测6/6、两个服务Build与`pnpm contracts:check`均通过；随机Compose资源清理已核验。完整V1.2 code suite已通过；最新Run/模型与Artifact Hash/数据库断言及完整输入Manifest见[机器审计](../../evidence/audits/2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-06793bf40b17c3a872e6.json)和[历史执行快照输入SHA-256清单](../../evidence/audits/2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-06793bf40b17c3a872e6.sha256)。此工程项不代表策略有效性、OD-007活动参数决定、新范围人工签署或Ubuntu通过；接下来的P3才把治理结果推进到精确版本建议/审批与模拟执行。

## 7. P3：治理、风控、FakeBroker与交易矩阵（预计5～8开发人日）

主要位置：Governance、Portfolio、Trade Execution、FakeBroker、Platform应用协调器及正式交易页。

- [ ] 持久化Proposal/修订与审批，actor来自会话，绑定expectedVersion/contentHash/有效期；审批后重新核验风险，批准本身不直接代替执行授权。
- [ ] MANUAL_APPROVAL覆盖批准/拒绝/修改后旧版本冲突；AUTO_POLICY通过版本化Mandate限定账户/策略/市场/资金/次数/窗口，无需逐单人工批准。HOLD不创建订单、不消费次数。
- [ ] 稳定业务ID协调治理预算、组合资金/证券占用和执行接受；UNKNOWN保留预留，通过原clientOrderId查权威订单，不盲目重发或按TTL释放。
- [ ] FakeBroker独立持久orders/fills/assets与故障状态；通过其API/仓储边界独立读取对账，不复制Portfolio快照作为券商资产。
- [ ] CN/US逐腿检查币种、规则、可卖量、费用/数量舍入和授权。补成交、撤单、迟到/重复/乱序、费用更正的稳定事件序号及Outbox/Inbox事务边界。
- [ ] 把业务协调从HTTP控制器提取为可恢复application服务/ports；Platform只拥有TestRun与证据投影，不计算订单/账本事实。
- [ ] 正式页支持建议审批、授权状态、订单/成交、现金/持仓/可卖量、对账及故障时间线。normal/rejection/recovery各由浏览器创建Run并用相同UUID独立核对。

最小场景矩阵如下；P0补充阶段文件中的其它必需项，不能把此表当删减授权：

| ID | 输入/动作 | 独立预期与后端证据 |
|---|---|---|
| L01 | CN现金10000 CNY，买100股×10，Fixture费5 | 现金8995、持仓100；券商原单、唯一Fill、唯一入账；1005预留捕获，对账一致 |
| L02 | 独立US账户现金10000.00 USD；合成开放时段买入10股×25.00 USD；Fixture固定费用0.05 USD | 现金9749.95 USD、持仓10股；Fixture占用2500.05美元；CNY账户/账本无变化。该数值/费用和合成交易时段是软件断言输入，不声称真实券商收费或美股市场日历 |
| L03 | MANUAL批准/拒绝/修改/旧版本 | 可信用户审批、风险不可被覆盖；拒绝/冲突无新增place；所有版本与决定追加保存 |
| L04 | AUTO合法/第三批超预算/暂停/过期 | 合法范围无逐单确认；超范围拒绝；HOLD与拒绝零订单、零交易次数消耗 |
| L05 | 资金不足、CN当日卖出、跨币种、无效规则/身份 | 原因精确；broker place增量0，现金/账本/占用无非法变化 |
| L06 | 接受已提交但响应被代理丢弃、查询暂不可用 | 持久UNKNOWN与占用保留；原单查询后收敛，place唯一，不创建第二订单 |
| L07 | 同一Fill重放10次；sequence=2先于sequence=1到达；累计量从100变150 | 重放不重复入账；seq=2缓冲，seq=1到达后按因果顺序归约为累计150/增量50；现金/持仓与权威事实一致 |
| L08 | 100股订单先成交40股（seq=1），撤单成功结果seq=2，费用更正revision=1 | 合法40股Fill继续入账；seq=2到达前余量资源不释放；撤单生效后释放60股余量；同一更正重放仅记一次 |
| L09 | FakeBroker独立外部模拟订单/资产差异 | 真实差异持久记录和显示；不清账本来制造一致 |
| L10 | 刷新/关页/会话失效/跨owner/run、重复请求 | 后台继续、持久回读；401/403/409正确；相同幂等不重复业务事实 |

当前未完成的具体路径确认（2026-10-07）：MANUAL V1.3执行协调器仍明确拒绝所有SELL并释放刚创建的资源预留；尽管Proposal订单构造器和FakeBroker支持SELL，Run的`runClockNow`目前固定为`2026-09-28T09:31:00+08:00`，Portfolio以注入的该时钟判断T+1，因此现有账户先买后卖必然仍是同一Session。不得只删除SELL拒绝分支或绕过T+1。要补SELL正常路径，需先提供TestRun范围、持久、可审计的Fixture Session推进（使用版本化交易日历），再证明Portfolio和FakeBroker均从同一已结算持仓出发、卖出Fill/费用/应收唯一入账，并保留同日SELL零副作用拒绝。该约束需作为L05/L01的正反场景一起验收。

退出条件：全矩阵真实服务/PG/事件/FakeBroker证据通过，正常路径准确、拒绝无非法副作用、恢复无重复；浏览器同Run、只读检查前后事实计数不变。人工待确认则保持NOT_RUN。

2026-10-07 P3 T+1关键缺口与当前矩阵复验：新增TestRun持久Fixture Session推进（锁版CN交易日历、事件序号、幂等键、账户/订单/Outbox/预留与独立资产对账前置）；同日SELL继续以零FakeBroker订单和零账本副作用拒绝，推进到下一合法Session后SELL经Portfolio/Governance/FakeBroker/Fill Outbox闭环并由Web和同Run CLI核对。修复FakeBroker此前把SELL记为BUY的独立现金/持仓和Fill方向缺陷。带L08专用一次性失败注入的完整隔离V1.3 Web/API/CLI矩阵21/21通过，容器/卷/网络/镜像清理核验为0；`pnpm verify:stage -- --stage V1.3 --suite code`在受控本机环境exit 0，合同、文档链接及diff检查通过。报告见[持久Session推进与T+1审计](../../evidence/audits/2026-10-07-v13-tplus1-session-advance.md)。首次矩阵因遗漏L08故障开关导致1项失败，失败记录保留；手动验收仍NOT_RUN。此增量关闭SELL/日历推进子缺口，不关闭P3全市场规则和其它全部要求，也不代表P1/P2/P4/P5/P6结项。

2026-10-07 P4滑点报价档子项：新增 FakeBroker 在方向性滑点后按0.01报价档保守取整，BUY向上、SELL向下；Quant/Paper同输入55 bps逐单比较价格、数量和Session通过。定向Quant 6/6、Trade 10/10、两服务typecheck通过；受控loopback重跑V1.3及V1.4完整code suite均exit 0。审计见[滑点报价档对照](../../evidence/audits/2026-10-07-v14-slippage-tick-parity.md)。费用模型仍存在固定费与比例费差异，日历/费率、完整账务及全市场规则均未关闭，P4保持开放。

2026-10-07 P4变更后隔离回测全链复验：随机项目`sq-v14-backtest-4e57ac038d47aa451642`，17个Platform TestRun、16个Quant BacktestRun/Manifest结果Hash配对；取消、调用Quant前与落库后Platform恢复、同ID幂等和Web/同Run CLI场景均通过，Playwright与结构化证据审计PASS。workspace codeVersion为`sha256:7d2584652ae9b1f81cd5a3d8e4808872b7da016e32735ca341be9c3f8e27d3ba`；项目容器/卷/网络清理核验通过，人工结论NOT_RUN。详见[最新V1.4隔离任务审计](../../evidence/audits/2026-10-07-v14-durable-tasks-4e57ac038d47aa451642.md)及相邻JSON/SHA清单。该证据不覆盖完整CN/US交易规则、费用账务一致性或人工验收。

2026-10-07 P4增量后V1门禁复核：Verifier退出2/INCOMPLETE，阶段文档5/5 PASS，226项证据引用/11份Manifest/23条目无Hash或路径错误；五阶段仍PARTIALLY_IMPLEMENTED，7个历史结构化TestRun导出缺失。机器结果见[V1当前门禁](../../evidence/audits/2026-10-07-v1-gate-after-v14-tick-parity.md)。

2026-10-07 V1.3报价档变更后端到端复验：受控随机隔离项目`sq-v13-web-460c759feaa52a8b7e62`完整Web/API/CLI故障矩阵Playwright 21/21通过、退出0；导出21份同Run证据且manualConclusion均NOT_RUN，项目资源清理通过。终端日志、Run UUID及逐包SHA见[V1.3复验审计](../../evidence/audits/2026-10-07-v13-tick-parity-e2e.md)。此复验只证实固定矩阵未回归，不关闭P3规则完整性、人工验收或P3退出项。

2026-10-07 V1.3矩阵后V1门禁：`verify-version --version V1`仍为exit 2/INCOMPLETE；文档5/5和228项活动证据引用Hash审计PASS，7项历史Run导出缺口仍在。结构化输出见[门禁复核](../../evidence/audits/2026-10-07-v1-gate-after-v13-tick-e2e.md)。

2026-10-07 P3应用层协调子项：把V1.3持久Session推进及“先核对Portfolio/FakeBroker独立事实，再查版本化日历并持久推进Clock”的用例协调从HTTP Controller抽到Platform Application Service；同一提交新增5项单测。V1.3受控code suite全量通过，隔离Web/API/CLI矩阵21/21通过，精确项目资源清理通过，21份Run人工结论均NOT_RUN。审计见[Session推进应用层复验](../../evidence/audits/2026-10-07-v13-session-advance-application-e2e.md)。Proposal/审批/执行等其它协调仍部分在Controller，P3“协调全面移出HTTP”条目继续开放。

2026-10-07 P3抽取后V1版本门禁：`verify-version --version V1`退出2/INCOMPLETE；文档结构5/5、230项活动引用及11份Manifest审计PASS，7项历史TestRun导出缺口仍未解决。输出见[门禁复核](../../evidence/audits/2026-10-07-v1-gate-after-v13-app-service.md)。

## 8. P4：日线回测与同规则对照（预计3～5开发人日）

- [ ] Quant拥有BacktestRun/Manifest/报告；日终信号最早下一合法可交易时点成交。业务Clock贯通风险、授权、撮合和结算。
- [ ] 补冻结适用CN/US日历、停牌/限制规则、成交量/滑点/费表日期、可卖量和结算；缺规则拒绝，不以合成锁板公式声称完整市场支持。
- [x] RAW成交与复权研究分离；加入公司行动Fixture，验证现金/数量/净值手算，不重复计收益。明确日线内路径无法推断的保守撮合假设。合成RAW拆股/分红Web/API/Quant/PG/同Run CLI证据及手算见[公司行动审计](../../evidence/audits/2026-10-07-v14-corporate-actions.md)；不代表真实公司行动或交易所全规则支持。
- [ ] 复用P3确定性规则/端口；快路径必须在相同输入与真实服务样本对照。Qlib研究与全链路回测执行模型分开，金额/数量/费用/结算精确，浮点容差预先冻结。
- [x] V1.4 Quant任务持久后台运行、取消门禁、相同输入稳定TestRun/BacktestRun ID及重放幂等已通过；Platform在Quant执行前及Quant结果/Manifest落库后被强制终止，启动恢复仍完成同一TestRun，后者无重复Quant记录。固定V1.4日线任务不生成Trade Fill；更广泛故障/规则矩阵仍按各自项目执行。详见[持久任务审计](../../evidence/audits/2026-10-07-v14-durable-tasks-3e249b385f39763ddd91.md)。
- [ ] 正式回测页提供配置、任务、净值/回撤、费用、交易、拒绝和比较；从报告追溯真实账本与执行事实，完成三场景同Run检查。

退出条件：无未来泄漏、公司行动/费用/结算手算、Paper规则对照和取消恢复全部通过；模型报告、交易事实与证据Hash一致。

## 9. P5：真实后台编排、恢复与隔离备份（预计4～6开发人日）

- [x] V1 normal NO_TRADE后台工作流经真实NATS JetStream派发至Temporal；PostgreSQL事务同时保存WAITING TestRun与Outbox，JetStream按稳定消息ID去重，Consumer校验owner/TestRun后按稳定Workflow ID启动。范围仅为安全的NO_TRADE纵切，不代表交易/日终调度或独立编排服务完成。详见[本轮持久派发E2E审计](../../evidence/audits/2026-10-07-v15-nats-temporal-dispatch-e2e.md)。
- [ ] 真实NATS JetStream/Temporal运行交易授权及日终工作流；若独立编排进程尚缺，只建立V1必要worker，不一次搭全长期服务。探针连通不替代业务执行。
- [x] CN/US各60个当地虚拟交易日执行NO_TRADE；从权威订单/账本/预算读取零新增，不直接填写holdDays或placeCalls。（2026-10-07正式隔离E2E：冻结日期Fixture、120条Portfolio/FakeBroker权威观测、零订单/Fill/预留及账本/余额不变；仅关闭本HOLD子项，审计见[v15 NO_TRADE E2E](../../evidence/audits/2026-10-07-v15-no-trade-workflow-e2e.md)。）
- [ ] 自动授权正常交易关页后继续；人工待审批合法WAITING。暂停/撤销阻断新发送，已确认合法Fill仍入账；错过窗口只重评、不补旧单。
- [x] 隔离Harness在normal TestRun+Outbox事务提交后停止本项目NATS约3秒再恢复，并在Relay首次发布前重启Platform API；同一Run在恢复后完成120项观测，准确记录停止/恢复/重启/完成顺序。证据见[持久派发恢复E2E](../../evidence/audits/2026-10-07-v15-nats-temporal-dispatch-e2e.md)。
- [x] 不可恢复的坏JSON及固定Run错误owner JetStream消息终止；同一TestRun重复消息在首次ACK被隔离测试钩子丢弃后，真实观察到同一序号以`message.info.redelivered=true`重投并由同一稳定Temporal Workflow ID幂等接收；恢复后的原Outbox消息也ACK，最终仅一份120项Workflow结果。另注入一次Temporal调用边界的`UNAVAILABLE`，观察5秒NAK后的同序号重投、完成120项结果和ACK。数据库错误重试、多Consumer竞争及其它身份矩阵仍待测。
- [ ] 双Worker完整故障切换及UNKNOWN检查原单/Outbox/Inbox副作用验证；记录目标容器/namespace及实际事件顺序。
  - [x] 单Platform Worker/API进程故障切换子场景：normal TestRun消息被两个独立durable接收后，仅终止隔离主Platform容器；备用Worker启动同一Temporal Workflow Activity并ACK原序号，主API恢复后同Run完成120项观察，Web normal/rejection/recovery、CLI/export及精确资源清理通过。审计见[双Worker故障切换E2E](../../evidence/audits/2026-10-07-v15-worker-failover-e2e.md)；首次Harness附加断言失败保留于[失败记录](../../evidence/audits/2026-10-07-v15-worker-failover-harness-validation-failure.md)。只关闭单Worker故障接管子场景，UNKNOWN/真实交易业务、双Worker同时故障、主机故障、Ubuntu及P5父项仍开放。
- [x] V1.5 deterministic 数据库仓储边界错误子场景：对一条真实JetStream Run消息注入一次`DatabaseConnectionError`，观察初次NAK、同序号redelivery及同Run完成120项权威读取，浏览器/同Run CLI/export和随机资源清理通过（Run `3d4153aa-0db7-4de9-b3b0-7037b7506cbf`；[数据库边界重试审计](../../evidence/audits/2026-10-07-v15-database-retry-e2e.md)）。该子项只验证异常分类/NAK/重投，PostgreSQL进程真实停机恢复仍未验证；P5总体保持开放。
- [x] 隔离PostgreSQL真实后端会话恢复子场景：JetStream已投递normal Run后终止3个`platform_api`专属PG会话；Platform建立新PG会话，同一Run完成120项权威观察，Web/CLI/export和项目清理通过（Run `0a2d90d1-317a-4a03-934b-b1fc5c7eed9d`；[PG会话恢复审计](../../evidence/audits/2026-10-07-v15-database-connection-drop-e2e.md)）。
- [x] 隔离Harness在CN_A `verifyNoTradeSessions` Activity已启动且Run未完成时重启承载Temporal Worker的Platform API；同一持久Workflow恢复并完成120项观察。证据见[本轮派发/重试/执行中Worker重启E2E](../../evidence/audits/2026-10-07-v15-nats-temporal-dispatch-e2e.md)。此项只关闭Platform Worker进程重启子场景，不覆盖Temporal服务进程重启、断网、双Worker或真实交易事实。
- [x] 两个Platform Worker用独立JetStream durable consumer处理同一normal TestRun；两边均ACK，稳定Temporal Workflow ID的重复启动被幂等处理，唯一Run完成120项观察。见[双Worker E2E](../../evidence/audits/2026-10-07-v15-multiworker-e2e.md)及[首次尝试记录](../../evidence/audits/2026-10-07-v15-multiworker-first-attempt-failure.md)。这证明重复派发幂等；单Worker故障接管另见下方子场景，双Worker同时故障、UNKNOWN和自动交易仍未验证。
- [x] 隔离V1.5 Compose中终止PostgreSQL服务进程并恢复同容器/卷；确认同一JetStream序号发生NAK、重投、ACK，原normal Run完成120项观察，三场景浏览器与同Run CLI/export及精确资源清理通过。完整机器记录、源码Hash见[数据库进程恢复E2E](../../evidence/audits/2026-10-07-v15-database-outage-e2e.md)；首次尝试失败和修复原因见[失败记录](../../evidence/audits/2026-10-07-v15-database-outage-first-attempt-failure.md)。不代表主机/卷丢失或备份恢复。
- [ ] Mac睡眠/恢复使用显式人工步骤和实际停机证据；未实测不能被代理断网等价替代。基础设施故障脚本仅触及随机隔离资源。
- [ ] 隔离配对备份包括所有本次V1领域DB、FakeBroker、NATS/Temporal状态及Artifact/配置版本；冻结一致性屏障、介质、保留/RPO/RTO目标，恢复到新隔离环境核验全部事实/Hash再恢复执行。
  - [x] V1.5当前隔离栈子场景：停止全部服务后对完整PostgreSQL集群（含Trade/FakeBroker数据库）、NATS JetStream卷及Temporal SQLite卷归档并记录字节数/SHA；恢复至三个全新卷后重启栈，原TestRun check-only保留120项权威HOLD事实，Temporal Workflow仍COMPLETED，JetStream consumer ACK状态保留，资源精确清理。详见[配对恢复E2E](../../evidence/audits/2026-10-07-v15-paired-backup-restore-e2e.md)。不覆盖V1.1–V1.4外置Artifact卷/跨域产物、Ubuntu、off-host、RPO/RTO及宿主灾难恢复；父项保持未勾。
- [ ] 测量真实资源限制/峰值/恢复时长；目标资源与阈值先冻结后测。正式跨机/活动备份若仍为必需项，提供具体维护包并保留未完成状态，不能用小库smoke替代。
- [ ] 完成容器化Web/后端和linux/arm64、目标linux/amd64适用烟测；记录Qlib/RD-Agent支持矩阵、host/container架构和仿真，实机缺口明确。
- [ ] 正式调度/暂停/告警/对账页从真实工作流与领域状态读取；任一Fill可追溯策略→建议→审批/Mandate→授权→订单→账本。

退出条件：实际业务工作流和全部适用故障/恢复、双市场HOLD、备份恢复及目标架构验证有事实证据；对应第2节勾选只在证明范围内更新。

2026-10-07 P5当前树门禁复核：`pnpm verify:stage -- --stage V1.5 --suite code`在本地普通执行及申请的受控重跑中均于Quant Worker Python边界测试失败：`tests/test_qlib_worker.py`随机回环端口绑定返回`PermissionError: [Errno 1] Operation not permitted`。完整失败日志及输入校验值见[本轮代码套件失败审计](../../evidence/audits/2026-10-07-v15-code-suite-eperm-current.txt)和SHA-256清单；此前受控环境code suite PASS记录继续作为历史快照保留，不能代表当前执行环境复验。其它已打印的构建、TypeScript类型检查及服务单测均通过；因脚本在Worker错误处退出，整套code suite结论为FAIL/环境阻断，不能记PASS，需在具备可用受控loopback的目标环境复验。`pnpm verify:version -- --version V1`仍exit 2/INCOMPLETE：五阶段文档审计PASS（5/5）、活动证据审计PASS（230引用/11 Manifest/23条目/0失败），但V1.2 1个、V1.3 3个及V1.5 3个历史TestRun缺结构化导出，阶段门禁和人工签署也未全部完成。V1.5 Temporal仍为`normalizeEvent`基础设施探针，`V15OrchestrationEngine`保持`WAITING/NOT_RUN`；本次没有接入真实交易/日终Workflow、双市场60当地交易日权威零订单/零账本/零预算核验或恢复链。上述结果只更新当前验证状态，不关闭P5退出条件；历史UUID、既有失败及用户签署均未改写。

2026-10-07 P5代码门禁阻塞修复：没有跳过或放宽HTTP边界断言；Quant Research `test:worker`现通过一次性、无网络、只读挂载、固定Python镜像Digest的ARM64容器执行真实Worker子进程测试，14/14通过。`pnpm verify:stage -- --stage V1.5 --suite code`完整当前树复验exit 0，链接/合同/Fixture、服务分层、构建、类型检查和各工作区单测通过。测试镜像未安装时脚本按未满足前置exit 2，不尝试拉取/构建。原沙箱失败日志保留；完整成功日志及边界见[容器化Python后的V1.5代码套件审计](../../evidence/audits/2026-10-07-v15-code-suite-containerized-python.md)与[机器日志](../../evidence/audits/2026-10-07-v15-code-suite-containerized-python.txt)。本修复只完成执行环境/代码门禁切片；V1.5业务Workflow仍为WAITING，60日CN/US权威事实、故障恢复/备份和V1正式门禁均未关闭。

2026-10-07 P5/P6 V1.5 Web/CLI验收可见性复核：修复V1.5页面把未执行流程呈现成“运行”的误导文案，Web当前明确业务工作流未接线且保留WAITING；E2E期望normal/rejection/recovery均WAITING、同Run `--check-only`退出2并独立导出。Harness路由单测7/7、Web typecheck、V1.5 code suite及4965条链接检查通过。三轮隔离E2E未通过：前两轮启动完整隔离栈后暴露证据覆盖保护与临时CWD脚本路径问题，已修复；第三轮冻结安装停在最后一个依赖约四分钟后中断，未抵达浏览器断言。三轮所用精确项目资源均核查/清理，历史失败证据保留。详细结果见[V1.5 Web/CLI E2E审计](../../evidence/audits/2026-10-07-v15-web-cli-e2e-current.md)及SHA清单。该测试仅验证WAITING诚实呈现，不能替代P5真实业务流程、60日权威账本、故障恢复或备份演练；P5仍未退出。

2026-10-07 P5 NO_TRADE权威HOLD纵切已通过：修复E2E在初次页面对不存在TestRun元素执行读取造成的无界等待后，正式容器Web/API/CLI/export隔离Playwright 1/1通过。normal Run `9e08dadd-c56f-422b-b7e6-aa3250b2d065`由Temporal执行冻结CN/US各60个虚拟交易日期，逐日读取Portfolio和独立FakeBroker，120条观测完成，账本版本/条目、余额、持仓/预留保持不变且订单/Fill均为0，`V1.5-HOLD-002=PASS`；同Run CLI仍忠实WAITING/exit 2，Evidence export exit 0。rejection/recovery各自Run及CLI/export通路通过但业务NOT_CONNECTED/NOT_RUN。审计和源码Hash见[V1.5 NO_TRADE机器报告](../../evidence/audits/2026-10-07-v15-no-trade-workflow-e2e.json)及[摘要/Hash](../../evidence/audits/2026-10-07-v15-no-trade-workflow-e2e.md)。隔离Harness项目容器/卷/网络/镜像清理通过，外部来源和真实券商调用为0。该证据关闭P5第二项双市场虚拟HOLD子项，不证明NATS调度、自动交易、暂停拒绝、双Worker、UNKNOWN/重启恢复、Mac睡眠恢复、备份还原、目标架构、Ubuntu或人工验收；P5/P6及V1版本门禁继续开放。

2026-10-07 P5切片后复验：`pnpm verify:stage -- --stage V1.5 --suite code`当前树退出0；包含最新NO_TRADE Temporal切片、Platform全量236项单测及Quant Python Worker 14项；`pnpm docs:check`检查4,974条链接、0失败。随后`pnpm verify:version -- --version V1`仍退出2/INCOMPLETE：阶段文档5/5、活动证据Hash检查237引用/12个Manifest/32条目、0失败；7份指定历史Run导出仍缺，五阶段仍PARTIALLY_IMPLEMENTED，P1～P6及Ubuntu/当前人工验收仍有未完成项。结构化门禁摘要见[当前V1门禁报告](../../evidence/audits/2026-10-07-v1-plan-gate-after-v15-hold.json)。因此本轮只关闭P5双市场虚拟HOLD子项，不关闭P5、P6或V1版本门禁；历史签署未新增。

2026-10-07 P5持久派发纵切：V1.5 normal TestRun及Platform Outbox在PostgreSQL同一事务提交；后台Relay使用JetStream `Nats-Msg-Id=TestRun ID`和30秒租约重试，durable Consumer使用稳定deliver subject，校验消息TestRun/owner/namespace后以`v15-no-trade-${testRunId}`启动Temporal，ACK发生在Temporal受理之后。Playwright真实隔离E2E通过，normal场景NO_TRADE工作流完成120次双市场权威读取，rejection/recovery仍WAITING/NOT_RUN；同Run CLI和export通过，随机Compose项目资源清理完成。运行及关键源码/日历Hash见[持久派发E2E审计](../../evidence/audits/2026-10-07-v15-nats-temporal-dispatch-e2e.md)。该项关闭仅限normal NO_TRADE总线派发；双Worker竞争与重复消息重放、Workflow执行中的Platform/Temporal重启、交易/日终工作流、UNKNOWN、安全拒绝及备份仍待实测。

2026-10-07 P5 NATS/Platform恢复补验：固定隔离Harness在normal TestRun/Outbox同事务提交后停止本项目JetStream约3秒再恢复，并在Relay首次发布前重启Platform API。实际序列为创建Run→NATS停止→NATS恢复→Platform重启就绪→同一Run Workflow完成。Run `06993e55-6e72-4e3b-a95e-82a74d1b728f`最终完成120项权威HOLD观测，Playwright 1/1通过且资源清理为0残留。审计保存精确时序、原始输出、8个源码/配置/Fixture/Harness Hash及三个场景Run IDs，见[持久派发恢复E2E](../../evidence/audits/2026-10-07-v15-nats-temporal-dispatch-e2e.md)；此前Platform重启中的瞬时HTTP截断失败及修复见[失败历史](../../evidence/audits/2026-10-07-v15-platform-restart-failure-history.md)。此证据覆盖派发前API恢复，不覆盖Workflow执行中的Worker/Temporal重启、断网、双Worker或延迟重复消息实际重放。

2026-10-07 毒信封与重复派发隔离演练：随机项目 `sq-v15-e2e-60c61b8fae45105857d7` 中，NATS停/复及派发前Platform重启后，Consumer终止坏JSON（stream seq 1）；Harness为同一normal TestRun发布重复消息（seq 2）；Relay恢复后又发布事务内原始Outbox消息（seq 3），Consumer ack floor推进至3。稳定Workflow ID下只观察到一份业务结果完成120条权威观测。normal Run `c9538b4d-c2a6-4849-a08b-56e5b7bcf541`；Playwright 1/1通过，项目容器/卷/网络/镜像精确清理，无外部数据源/真实券商调用。rejection/recovery业务仍WAITING/NOT_RUN。该结果不覆盖双Worker竞争、非法身份/owner拒绝、暂时性基础设施错误重投或Workflow执行期间重启。

2026-10-07 含Relay原始消息的最终复跑：更新后的隔离Harness等到恢复Relay实际发出原始Outbox事件（stream seq 3）并确认durable consumer ack floor=3，而非只靠探针提前触发Workflow。项目 `sq-v15-e2e-60c61b8fae45105857d7`、Run `c9538b4d-c2a6-4849-a08b-56e5b7bcf541`、Playwright 1/1通过，正常Workflow完成120项且资源清理完成。完整时序和机器输出已刷新至本阶段E2E报告。

2026-10-07 owner隔离与重试边界补验：在更新后的隔离Harness内，坏JSON seq 1和格式正确但owner不匹配的消息seq 2均由JetStream Consumer终止；同Run重复合法消息seq 3启动稳定Workflow ID，恢复后的PostgreSQL Outbox消息seq 4随后ACK至consumer ack floor 4。唯一normal Run `d6953bb9-8593-4c8c-9751-112a16873bf6`完成120条权威观测，Web/API/CLI/export通过且资源精确清理。此测试证明固定Run的错误owner隔离，不覆盖其他非法字段矩阵、实际lost-ACK redelivery或多Consumer并发。

2026-10-07 P5增量后的全树复验：Platform typecheck通过，单测54文件/236项通过；正式隔离V1.5 Web/API/PostgreSQL/NATS/Temporal E2E通过，normal TestRun+Outbox提交后停止NATS约3秒并在Relay派发前重启Platform API，同一Run恢复后完成120条权威观测；保存事件序列、3个场景TestRun IDs、原始日志和8项源码/Compose/Fixture/Harness Hash。`pnpm docs:check`为4,988链接/0失败。`pnpm verify:stage -- --stage V1.5 --suite code`本轮退出2，Quant Worker前置固定Digest Python镜像缺失，未自动拉取/构建；此环境缺口按未满足前置记录，不覆盖已有历史PASS。最新版`pnpm verify:version -- --version V1`退出2/INCOMPLETE：阶段文档5/5 PASS、活动证据审计241引用/12 Manifest/27条目/0失败；7份历史TestRun结构化导出、阶段/版本门禁和人工验收仍未完成。见[本次V1门禁报告](../../evidence/audits/2026-10-07-v1-plan-gate-after-nats-dispatch.md)、[恢复E2E审计](../../evidence/audits/2026-10-07-v15-nats-temporal-dispatch-e2e.md)及[重启失败历史](../../evidence/audits/2026-10-07-v15-platform-restart-failure-history.md)。

2026-10-07 P5毒消息重试边界：Consumer对无法解析的JSON及格式、事件身份、TestRun/owner/namespace/场景不匹配执行JetStream `term`，避免无穷NAK；数据库/Temporal临时错误保留5秒NAK重试。Platform typecheck通过，55个测试文件241项通过。坏JSON与固定Run错误owner终止已在真实JetStream隔离E2E验证；代码/单测范围见[单测审计](../../evidence/audits/2026-10-07-v15-poison-envelope-unit.md)，实际总线验证见[毒信封E2E](../../evidence/audits/2026-10-07-v15-poison-envelope-e2e.md)及[机器记录](../../evidence/audits/2026-10-07-v15-poison-envelope-e2e.json)。当时实际lost-ACK redelivery和多Worker竞争仍NOT_RUN；后续结果以最新复验记录为准。

2026-10-07重复派发与恢复复验（历史快照）：Platform typecheck和55个测试文件/241项通过。后续lost-ACK正式复验见本节最新记录；此条保留当时无真实redelivery断言的历史范围。

2026-10-07 P5 JetStream lost-ACK redelivery复验：隔离Harness在same-TestRun消息seq 3上丢弃首次ACK；Platform按`message.info.redelivered=true`逐消息记录同一seq再次投递，Temporal以稳定Workflow ID幂等接收，未产生第二业务结果；恢复Relay原Outbox seq 4后consumer ack floor达到4。正式Web/API/CLI/export E2E 1/1、normal Run完成120条权威HOLD观察、故障资源精确清理。机器时序、Run IDs和源码Hash见[最新派发E2E](../../evidence/audits/2026-10-07-v15-nats-temporal-dispatch-e2e.json)。此项只证明单消费者丢ACK重投；聚合`num_redelivered`快照在ACK后为0，结论依据逐消息delivery metadata。暂时性DB/Temporal错误、多Worker竞争、执行期重启、交易/日终与备份仍NOT_RUN；固定Digest Python镜像缺失使当前完整Stage code suite exit 2，完整原始日志见[当前代码门禁审计](../../evidence/audits/2026-10-07-v15-code-suite-after-worker-restart.md)，P5仍未退出。

2026-10-07 P5 Temporal瞬态错误重试E2E：同一随机V1.5隔离项目第二个normal Run由正式API创建；只对该Run/event注入一次Temporal调用边界`TemporalServiceUnavailableError`（LIVE关闭/FakeBroker），Platform观测seq 5并`NAK(5000)`。JetStream随后实际重投，Temporal成功执行同一TestRun；Run完成120次Portfolio/FakeBroker权威观察，durable consumer ack floor推进到5，未发生重复业务结果，整体V1.5 Playwright 1/1且项目精确清理通过。该固定错误注入证明Temporal瞬态异常分类/NAK/重投恢复，不代表Temporal进程断开恢复或DB重试；证据和源码Hash见[本轮派发及重试E2E](../../evidence/audits/2026-10-07-v15-nats-temporal-dispatch-e2e.md)与[机器记录](../../evidence/audits/2026-10-07-v15-nats-temporal-dispatch-e2e.json)。真实Temporal停机追加探针在重启后API Run创建请求报`fetch failed`，未形成重试结论，失败保存在[停机探针记录](../../evidence/audits/2026-10-07-v15-temporal-outage-e2e-attempt-failure.md)；两次测试Harness断言/日志定位失败分别保留。数据库暂时错误、多Worker竞争、执行期Worker重启、交易/日终和备份仍NOT_RUN，P5未退出。

2026-10-07 P5执行中Worker重启：隔离Harness对正常Workflow执行添加FAKE/LIVE=false限定的观察延时；观察到Run `79828837-80e4-4225-8964-e34563a805cb`的CN_A `verifyNoTradeSessions` Activity已开始且Web尚未收到120项完成事件后，重启Platform API（其内承载Temporal Worker）。同一Run随后由Temporal持久历史恢复并完成120项Portfolio/FakeBroker权威观察，页面/Web、同Run CLI/export与精确项目清理通过；Playwright 1/1。机器事件明确保存Activity启动Marker、重启时间和完成结果，见[当前V1.5 E2E审计](../../evidence/audits/2026-10-07-v15-nats-temporal-dispatch-e2e.md)。这关闭Platform/Worker执行中重启这一子场景；不代表Temporal服务器重启、数据库重试、受限网络、多Worker、交易/日终或备份恢复通过。

2026-10-07 P5瞬态重试后V1门禁：`node scripts/verify-version.mjs --version V1` exit 2/INCOMPLETE；五阶段文档审计PASS，活动引用/Hash审计246 refs、11 manifests、23 entries、0 failures。V1.5 Temporal调用边界瞬态错误注入后的JetStream真实NAK/redelivery已通过，但数据库重试、真实Temporal进程中断、多Worker、交易/日终及其余P5/P6项仍开放；7个历史TestRun bundle仍缺，版本/阶段人工及Ubuntu验收仍未完成。机器输出见[本轮门禁报告](../../evidence/audits/2026-10-07-v1-plan-gate-after-transient-retry.md)。

## 10. P6：手册、全版回归与用户验收（预计2～3开发人日；人工/外部等待另计）

- [ ] 每阶段完成后立即补第8节实际URL/登录、按钮、配置名、Fixture版本/Hash、命令、工作目录、输出、等待/超时、恢复与清理；按手册从头实测后才标VERIFIED_EXECUTABLE。
- [ ] 五阶段normal/rejection/recovery及全部必需子场景、code、浏览器、Web同Run CLI、证据导出执行并记录命令/退出码。适用故障不可用READY探针充数。
- [ ] code清单真实调用lint/type/domain/DB/合同；Python用各服务锁定环境；空suite、skip、缺脚本、仅202/jobId都不成功。
- [ ] 当前版本证据包含代码/镜像/依赖/迁移、scenario/rule/data/strategy版本、seed/故障序列、架构/资源、testRunId/business IDs、断言、截图/trace和签署。当前与历史源码Manifest准确区分，历史Hash不重写。
- [ ] 历史缺失Run逐项恢复或明确保留不可恢复结论；补新验收记录必须有真实用户确认和可追踪关联，不靠替换UUID绕过历史缺口。
- [ ] 更新五阶段第2/7/8节及00/99状态、需求追踪和适用架构；人工签署在用户确认前NOT_RUN。签署绑定精确版本和Run，不沿用旧签署扩展到新范围。
- [ ] 提交可交互环境和验收包让用户逐阶段确认；期间无需停止独立准备，但正式前置保持未通过状态。
- [ ] 运行V1正式Verifier；任何未决必需项继续INCOMPLETE，FAIL先诊断修复并重验。只有全部适用门禁与用户签署通过才宣布M3。

2026-10-07 P6历史Run恢复源审计：在只读事务中查询当前挂载的`stockquant-v12_postgres-v11`/`platform_api`数据库，门禁列出的7个精确UUID在`acceptance_stage_runs`与`test_runs`均无原始行；本地`evidence/local`也无对应UUID结构化导出。已运行的旧版本机Platform API对V1.5三个Run返回404（此旧镜像不视为当前源码证据）。结论仅限已检查的本地数据源：目前无法从中精确恢复历史事实，原UUID继续INCOMPLETE，等待可用的原始离线备份；新Run不得替代。证据与范围边界见[历史Run恢复源审计](../../evidence/audits/2026-10-07-v1-history-run-recovery-check.md)。历史查找和数据库查询未改写业务Run或签署。

2026-10-07 P6更新引用后的当前V1门禁：`node scripts/verify-version.mjs --version V1` exit 2/INCOMPLETE；阶段文档结构审计5/5 PASS，活动证据引用234项、11个Manifest/23个条目、0失败；精确TestRun证据审计仍有7个历史UUID缺原始结构化导出。五阶段状态、人工签署和总版门禁均未被本轮自动测试替代。

## 11. 命令契约与安全执行

以下是实施后的必需入口，不表示当前业务场景已通过。P0/P1先核实路由、参数、隔离目标和脚本能力；默认活动栈不能作为测试环境。缺入口先实现，不能让用户猜参数。未完成路径退出2，失败退出1，全部必需断言通过退出0，保存底层退出码。

```bash
# 在仓库根目录；第一次依赖安装与静态检查
pnpm install --frozen-lockfile
pnpm baseline:check

# 在已核实的V1随机隔离目标上，逐阶段V1.1～V1.5分别执行
pnpm stack:up -- --stage V1.3
pnpm dev:web
pnpm verify:stage -- --stage V1.3 --scenario normal --seed 20260907
pnpm verify:stage -- --stage V1.3 --scenario rejection --seed 20260907
pnpm verify:stage -- --stage V1.3 --scenario recovery --seed 20260907
pnpm verify:stage -- --stage V1.3 --suite code
pnpm test:e2e -- --stage V1.3

# RUN_ID替换为浏览器实际创建UUID；明确指向同一隔离API
pnpm verify:stage -- --stage V1.3 --run RUN_ID --check-only
pnpm evidence:export -- --run RUN_ID

# 完整工程与用户验收后进行正式门禁
pnpm verify:compat -- --platform linux/arm64
pnpm verify:compat -- --platform linux/amd64
pnpm verify:version -- --version V1
```

`verify:compat`现有入口仅证明其实际覆盖镜像/探针；P5补完整V1组件矩阵，不把两条命令直接当完整栈或Ubuntu实机通过。P1必须使stage启动显式解析隔离目标，或提供实现并实测的统一Harness及正式入口委托；在此之前不得直接用上述启动命令改写活动栈。

CLI/API位置由已实现的`STOCKQUANT_PLATFORM_API_URL`等明确配置指向Harness打印的端口；每阶段手册写入实测具体变量和地址。导出必须完成在临时服务清理之前；证据存`evidence/local/V1.x/<testRunId>/`，每包审计存`evidence/audits/`，不在主计划无限追加执行日志。

check-only前后比对订单、Fill、账本、资源预留、任务及模型调用计数；模型调用为0，外部行情/券商调用为0。预期拒绝是业务REJECTED，独立拒绝断言才可PASS。

## 12. 决定、阻塞与停止条件

| 条件 | 可继续工作 | 不能擅自执行/关闭 |
|---|---|---|
| 来源授权仍NONE、活动NO_TRADE | 合成Fixture与已有明确授权离线输入验证 | 外部行情/新闻/历史Provider请求、启用采集/活动Paper |
| OD-007活动策略参数未确认 | 隔离Fixture参数、NO_TRADE/TopK开发及验收 | 活动账户/Mandate/策略启用 |
| OD-013Artifact期限未决定 | 不可变发布、取消、读取/导出、只读孤儿巡检 | 自动过期或物理删除；相关必需项不能假定完成 |
| 活动数据库/存储需迁移 | 恢复副本演练，准备精确备份/停写/回退材料 | 未获维护范围授权就改活动writer、角色、卷或DSN |
| 真实Ubuntu缺失 | 本地容器及目标架构烟测，列出实机所需材料 | 宣称Ubuntu实测；现有实机必需项保持未完成 |
| 用户尚未确认 | 独立工程验证/证据整理 | 代签阶段或版本、扩大授权、删旧失败 |

发现合成PASS、重复入账、越权、跨币种放行、未来数据可交易、UNKNOWN盲重发、证据不符或清理目标不确定：停止对应业务推进，保存故障与资源，修复并重验受影响场景。未恢复前不推进依赖它的业务包。不要换seed或清账本来获得PASS。

同一外部阻塞没有状态变化时，只报告所需决定/材料，转向本计划允许的独立前置；没有新条件不反复预检。审批需要时提交具体可审阅配置/版本/维护包，用户确认只针对该范围。

## 13. 排期与下一步

单主执行者工程预算约22～35开发人日（P0 1～2、P1 2～4、P2 3～5、P3 5～8、P4 3～5、P5 4～6、P6 2～3；各项相加为20～33，另留2日集成余量）；仅为当前缺口粗估，不是交付日期。P0结束以实际覆盖表重估，不得按代码/测试数量计算完成率。用户验收、活动维护、来源决定或Ubuntu等外部等待另计。

每包交付报告最多概述已完成要求、证据、剩余缺口、下一步和估算变化。每个必需场景一次完整通过后，仅因变更/失败/未决风险重跑；P6做冻结候选全版最终回归。

2026-10-07 P3首个治理持久化切片：Proposal首版、幂等Hash、owner/run绑定、版本快照及人工决定记录已由Governance PostgreSQL仓储实现；32项治理单测、typecheck/build及一次性PostgreSQL新增/重放/冲突/owner/版本冲突/批准回读均通过。详见[V1.3 Proposal持久化审计](../../evidence/audits/2026-10-07-v13-proposal-persistence.md)。该切片尚未接Platform/Web、Proposal修订、审批后风险复评、Mandate/预算/资源占用、Trade/FakeBroker或业务场景，故P3及V1.3仍未达到退出条件，阶段开发复选框不勾选；下一步接通会话绑定的Platform提案/审批代理并冻结端到端业务命令契约，然后落地完整正常订单链。

2026-10-07 P3治理/组合Web增量：前述记录保持为当时切片快照；之后已按合同生成链新增Proposal/决定Schema与Governance OpenAPI/Platform客户端，接入会话绑定的V1.3账户、提案和决定路由、浏览器刷新恢复及CLI同Run Proposal只读核验，并新增包含Platform/Portfolio/Governance/Trade/PostgreSQL的V1.3隔离Compose。normal/rejection/recovery三场景浏览器与同Run/Proposal CLI验证通过；合同检查、Platform/Governance类型检查、Governance 33单测、Web构建和隔离E2E均通过。证据：[V1.3治理/组合Web子闭环](../../evidence/audits/2026-10-07-v13-governance-web-loop.md)。P3仍未通过：尚无Proposal修订、审批后风险复评、授权/预算/占用、FakeBroker订单/成交/账本、独立资产或故障恢复。下一步实现一条真实FakeBroker正常模拟交易闭环，然后扩充L01-L10矩阵；任何阶段或人工验收状态仍未完成。

2026-10-07 P3执行授权增量：Governance执行授权绑定Proposal精确版本/hash、owner、Run、account、clientOrderId及命令Hash，仅Trade身份能签发和消费，TTL由Proposal过期与5分钟共同限制。一次性PostgreSQL验证覆盖相同命令幂等授权、ACTIVE单次消费、相同重放REPLAYED、变更Hash拒绝；期间发现并修复了重放仍返回VALID的状态更新漏洞。Governance单测33/33、Governance/Trade类型检查及合同检查通过，随机数据库容器已清理。此授权尚未与组合资源预留和FakeBroker订单执行集成，不勾选P3交付任务；更新证据见[V1.3治理/组合Web子闭环审计](../../evidence/audits/2026-10-07-v13-governance-web-loop.md)。

2026-10-07 P3首条CN模拟订单链增量：新增契约生成的Trade入口，执行器只接受已批准/未过期的单腿固定Fixture；依次验证Proposal owner/run/account、向Portfolio预留精确CNY 1005、签发并消费Governance短时命令Hash授权、FakeBroker持久化唯一订单/Fill/序号事件/Outbox，并将Fill及占用捕获交付到Portfolio。正式Web可点击执行；相同proposal clientOrderId重试先查原单。隔离E2E的CN normal、人工拒绝、旧版本冲突三场景最终均通过；normal断言FakeBroker全成100股×10元、费用5元、Portfolio现金8995元/持仓100股、Web刷新后同单返回及CLI只读核验，测试容器/卷/网络已清理，外部源/真实券商调用0。Platform 215单测、Trade 71单测、Governance 33单测、三服务类型检查、Web构建、合同与链接检查通过。详见[V1.3治理及CN订单闭环审计](../../evidence/audits/2026-10-07-v13-governance-web-loop.md)。这仅是L01 CN单条正向工程证据：L01独立资产对账/保留证据、L02 US服务E2E、L03修改旧版本、L04自动Mandate/预算、L05拒绝矩阵、L06 UNKNOWN、L07乱序重复、L08撤单/更费、L09独立外部资产对账、L10权限及后台恢复都未完成；不勾选P3总任务和V1.3通过项。接下来抽出Trade应用协调器并补FakeBroker资产/对账，再完成双市场与恢复矩阵。

2026-10-07 P3独立资产与预留捕获增量：FakeBroker在其独立PostgreSQL资产表维护初始现金、当前现金、持仓和Fill资产事件；订单接受与独立资产变更同事务、同幂等保护。Trade只读资产API提供给Platform对照Portfolio，返回明确MATCH/DISCREPANCY及差异，而非通过复制Portfolio快照伪造一致。normal CN再复跑时CLI核对FakeBroker cash=8995.0000 CNY、position=100、Portfolio匹配、Portfolio资源预留1005.0000状态CAPTURED，Web刷新及同订单恢复、拒绝/旧版本冲突均通过；隔离资源精确清理。最新Run `fa02e057-c00c-4e66-ab72-c952829fa2b7`，项目 `sq-v13-web-545bcc5278243f697e6a`，审计附后。本步让L01 CN正常案例证据具备，尚不代表整个L01所有拒绝/故障变体完成；L02-L10与P3退出条件仍开放。下一步移出Trade HTTP执行协调逻辑并走US USD订单链。

2026-10-07 P3应用层提取与L02 US增量：将合同/治理/组合/Trade/FakeBroker/Outbox协调流程提取到`V13ManualPaperExecutionService`，HTTP handler不再承载跨服务业务编排；应用单测检验事件顺序，未批准Proposal确保无资源预留、无FakeBroker place。新增US正式页与隔离E2E：独立USD 10000账户、AAPL 10股×25.0000、费用0.0500；FakeBroker现金9749.9500 USD、持仓10，Portfolio预留250.0500状态CAPTURED，与Portfolio资产MATCH；页面刷新与CLI只读查同Run订单。一次性Compose最新4场景（CN normal、US normal、rejection、stale-version recovery）均PASS，TestRun分别为`23fd098a-0d5e-411a-bc63-8ac2a511ae2e`、`cd81f109-3f31-4e60-8186-8565fa65731e`、`9cd63d97-94c1-4b42-8680-11ec2fbffab0`、`4334f149-6f58-4834-b547-bede42c6106b`；项目`sq-v13-web-24301dfb5a5818ca7349`清理已核实。Trade 73项单测、Platform/Web类型构建通过；证据已追加到[V1.3订单闭环审计](../../evidence/audits/2026-10-07-v13-governance-web-loop.md)。L01/L02固定正向链已初步齐备，但正式账户恢复、完整拒绝/重复/故障覆盖与用户验收尚缺。下一步执行L03 Proposal追加修订/冲突版本路径及审批后风险重评，再进入L04-L10。

2026-10-06 P0当前状态：V1.5完整代码套件exit 0，V1版本门禁仍INCOMPLETE；源码/锁/阶段文档/证据状态及V1五阶段第2/7/8节106项责任映射见[P0基线审计](../../evidence/audits/2026-10-06-v1-p0-baseline.md)及[机器摘要](../../evidence/audits/2026-10-06-v1-p0-baseline.json)。纠正了V1.5场景引擎以常量生成业务PASS的边界；正常/拒绝/恢复现在明确WAITING/NOT_RUN。第1次完整V1.5 code suite因审计报告目标文件尚未落盘，Markdown链接检查中止；受控本机另将Qlib loopback worker测试14/14通过。完整V1.5 code suite现已exit 0并归档；五阶段第2/7/8节106项责任映射已归档，P0工程基线完成。当前Verifier仍INCOMPLETE，历史Run缺失导出继续保留；不改变旧签署。

- [x] 记录基线、Git状态、锁文件、脚本、证据门禁与隔离边界；保存P0机器审计。
- [x] 复核V1五阶段第2/7/8节、90/99验收及关联业务引擎；覆盖和未决项映射见P0审计。
- [x] V1.5未执行场景已改为WAITING/NOT_RUN；不改写历史Run或签署。
- [x] 逐项核对7个历史TestRun缺失导出身份；原Run不替换，缺口继续在版本门禁体现。
- [x] 冻结L01～L10基本业务输入/预期；数据均为模拟Fixture，真实费用/日历/授权边界已明确。
- [x] 保存106项第2/7/8节责任映射；旧勾选仅作为来源声明，当前验证与人工验收状态分别记录。

P1开始前提：P0完整code suite已在基线证据目标存在时受控退出0、覆盖台账及门禁审计归档完成；M0仍有V1.1/V1.2历史TestRun导出缺失、阶段前置与用户验收未关闭。P1可在新隔离环境推进，不得用该事实提前签署阶段。

2026-10-07 P3 L03追加修订增量：Governance按owner行锁，校验待审批状态、版本/Hash、可信actor、有效期及注入Clock，事务内追加Proposal版本和修订审计行；Platform/Web接入修订入口。随机隔离V1.3四场景E2E 4/4通过，Recovery Run `505d0f3d-98ec-41a0-bf8b-4613257c2b4b`证明v1旧Hash审批409且v2仍待批。合同、Governance单测/类型、Platform类型、Web构建通过，项目`sq-v13-web-d6420472af6939a59208`清理通过，详情见[V1.3订单闭环审计](../../evidence/audits/2026-10-07-v13-governance-web-loop.md)。L03仍缺批准后重新评估风险，故保持P3未通过；接下来补风险绑定再实现L04-L10。

2026-10-07 P3 L03执行前风控复评补证：执行协调器在取得当前Governance Proposal后才对Portfolio提交精确版本/数量/费用对应的最新资源预留；模拟资源不足返回冲突时不签发/消费执行授权、不访问FakeBroker。新增顺序单测，Trade全量测试74/74、Governance 33/33、Platform类型检查通过。该工程能力限当前Fixture现金/资源边界，且仍待正式阶段和人工验收，未勾选P3总任务。

2026-10-07 P3 L04规则域起步（仍未接入）：新增版本Hash/owner-run-account-strategy/市场币种证券范围、逐单与累计预算、订单次数、有效期和暂停状态校验；HOLD零交易次数/占用；金额以整数分核对。Governance 8文件/37单测及类型检查通过。持久化版本激活、并发预算原子预留、AUTO_POLICY FakeBroker正式链路与Web/CLI验证仍未实现，因此L04和P3全部保持未完成，详见[V1.3订单闭环审计](../../evidence/audits/2026-10-07-v13-governance-web-loop.md)。

2026-10-07完整代码门禁增量：`pnpm verify:stage -- --stage V1.3 --suite code`受控loopback重跑exit 0；Governance 37项、Trade 74项、Platform 215项、Qlib Worker Python 14项及全仓build/lint/typecheck/unit通过。受限沙箱首次出现Quant Worker临时loopback `EPERM`，保留失败并在同命令受控重跑；V1.3真实业务E2E仍按单独矩阵记录，code suite不宣称P3完成。复核还将被后续V1共享源码变更影响的三份V2执行Hash引用标记为历史快照，原文件及V2签署未变；version-gate测试4/4通过，V2仍exit2/INCOMPLETE。详情见[V1.3订单闭环审计](../../evidence/audits/2026-10-07-v13-governance-web-loop.md)。

2026-10-07 P3 L04持久化增量（仍未端到端）：Governance新增AUTO Mandate版本/hash与限额/范围/有效期存储、精确人工激活/暂停事件及按Mandate行锁串行化的预算预留。Postgres随机隔离smoke Run `24f793a9-3e80-49fa-af27-90cb9e3ad692`验证并发3请求只授权2单、第三单超次数拒绝、同命令幂等、异命令冲突及预算/次数持久化；治理8文件/37单测、typecheck/build通过。尚未接OpenAPI/Platform/Trade FakeBroker自动执行及Web/CLI矩阵，因此L04/P3保持未完成。详见[V1.3订单闭环审计](../../evidence/audits/2026-10-07-v13-governance-web-loop.md)。

2026-10-07 P3 L04治理接口增量（AUTO仍未端到端）：Mandate固定UUID幂等键贯通OpenAPI/生成客户端/Governance和Platform API；Platform仅凭当前用户与V1.3 TestRun创建、精确Hash激活和暂停，并检查PAPER/FAKE账户范围。Governance HTTP smoke证明同请求重放返回原Mandate，Trade服务逐单预算授权持久化，Platform不能调用Trade授权；隔离PostgreSQL Run `0b25bd83-f8b2-41d4-83e3-747f8d690c8c`的25个场景通过，`pnpm contracts:check`、Governance 38单测、Platform/Governance typecheck及Governance build通过。正式Mandate Web页、Trade→预算→FakeBroker/Portfolio协调与预算结算、UNKNOWN恢复和Web/CLI矩阵仍缺，因此L04/P3继续未完成，阶段验收不得勾选。下一步让Trade应用协调器建立AUTO专用执行路径及确定性消耗/释放，然后补Web入口和业务矩阵；审计见[V1.3订单闭环审计](../../evidence/audits/2026-10-07-v13-governance-web-loop.md)。

2026-10-07 L04释放重放安全复验：预算仓储现将已确定释放的reservation重放fail-closed拒绝，防止原clientOrderId在资源已释放后被视为仍授权。隔离PostgreSQL Run `5a35b015-0d03-4272-82d1-bd534a9ad6cf`含26个通过场景，明确验证该拒绝；Governance typecheck/build通过，docs:check 4738链接无失败，测试容器/网络已清理。该项只补强授权仓储语义，Trade自动执行、预算结算接口、Web与阶段验收仍未完成；持续执行L04及剩余闭环工作，见[V1.3订单闭环审计](../../evidence/audits/2026-10-07-v13-governance-web-loop.md)。

2026-10-07 P3 L04 AUTO_POLICY FakeBroker闭环增量：Trade服务现在重读持久AUTO Proposal/Mandate，核验精确owner/Run/account/strategy/market/currency/hash/Fixture腿，先预留含费预算和Portfolio资源再下单；确定性失败释放预算，UNKNOWN保留资源并禁止盲重发，成功消费预算及交付Fill Outbox。Platform只作范围校验和代理。Web成功路径改为独立读取FakeBroker原单/资产并与Portfolio对账，HOLD显示无订单且不读取不存在订单。隔离V1.3 Web/API/CLI E2E最新8/8通过，覆盖AUTO正常成交、1005.0000 CNY预留捕获、8995.0000 CNY余额、对账MATCH、刷新及同Run CLI；HOLD现金10000且无订单；两笔限额耗尽后第三笔执行409拒绝；暂停后新提案执行403拒绝；所有拒绝的权威订单查询均404、账户无额外变化。`pnpm contracts:check` exit 0，Web build、Governance/Trade/Platform typecheck通过。最近全仓`pnpm verify:stage -- --stage V1.3 --suite code`受控重跑exit 0；`pnpm docs:check` 4740链接无失败。随机隔离Compose项目`sq-v13-web-84e2bce19201107966e0`最终PASS，容器/卷/网络清理已核实。完整证据见[V1.3订单闭环审计](../../evidence/audits/2026-10-07-v13-governance-web-loop.md)。L04/P3仍未退出：过期/跨范围、UNKNOWN真实故障恢复、L05～L10其它异常/事件顺序验证与正式人工验收仍未完成。

2026-10-07 P3 L06 AUTO_POLICY UNKNOWN固定故障链通过：仅V1.3隔离Compose启用有序注入，先在FakeBroker提交后丢失响应，再令原clientOrderId查询暂时503；前两次HTTP为503，第三次原单恢复HTTP 202。Web/API/CLI隔离E2E 9/9通过，Run `6e9a38de-3dbf-44b3-82de-37280394bd46`最终仅一笔FakeBroker订单`36003765-73dd-4430-8853-67aff05bd621`和Fill `5e6bec02-8fc6-4f3f-bc6c-2b8a6d5a5b8a`；资源先保持HELD，恢复后Mandate CONSUMED、Reservation CAPTURED、Outbox DELIVERED，独立账本与Portfolio现金8995/持仓100股核对MATCH，0未决订单、0待交付事件。同Run CLI只读核验通过；隔离项目`sq-v13-web-ca1c93131842ec60cd5d`容器/卷/网络清理已核实，外部行情和真实券商调用0。全量`pnpm verify:stage -- --stage V1.3 --suite code`本次完成PASS，Trade 81、Platform 215、Quant Worker Python 14及全仓规定门禁通过。证据：[L06故障恢复审计](../../evidence/audits/2026-10-07-v13-governance-web-loop.md#l06-auto_policy-unknown-故障恢复2026-10-07)。此固定故障序列不覆盖进程重启、任意消息乱序及全部L06边界；AUTO到期/跨scope、L05/L07-L10、P4-P6和正式人工验收仍待执行，故P3、V1保持未完成。

2026-10-07 P3 L04 Mandate证券范围拒绝补证：新增正式Web/API场景，人工激活仅授权`000001.SZ`的Mandate后提交`600000.SH` Proposal，Trade/Governance拒绝HTTP 403；账户现金保持10000 CNY、无Portfolio reservation、FakeBroker订单读取404；同Run `--check-only`仍为WAITING/exit 2。Run `1e933aca-0854-4021-bc52-dbb18d461cab`，Mandate `549b0cc6-dd29-4da4-bd1c-f6f4bcbd9391`，Proposal `125c781b-f9fc-4f76-8f9b-3d82a4e9f7ee`。隔离Web/API/CLI矩阵增至10/10 PASS，项目`sq-v13-web-d3b9d0f4d25f9f10f2ac`容器/卷/网络清理已核实，外部源与真实券商调用0。期限到达的域逻辑单测仍有，但当前TestRun注入Clock无推进接口，HTTP/持久化到期边界证据未完成；不将L04标为完成。详见[L04证券范围审计](../../evidence/audits/2026-10-07-v13-governance-web-loop.md#l04-auto_policy-证券范围拒绝2026-10-07)。

2026-10-07 P3 L04到期边界及范围拒绝补证：PostgreSQL smoke通过固定Run Clock跨过expiresAt，返回`REJECTED/MANDATE_EXPIRED`且预算预留行数0；隔离Run `f9368f71-f780-4d3d-afcd-7f89bc94542e`、过期Mandate `7e0589b1-78cc-4b6d-be2d-c989efde84a4`。使用仓库安全包装器、固定postgres镜像及loopback随机端口，确认容器/网络已清理。正式Web/API/同Run CLI跨证券范围场景10/10：Mandate只授权`000001.SZ`时，提交`600000.SH`返回403、账户现金10000、Portfolio预留0、FakeBroker订单404、CLI `--check-only`保持WAITING/exit 2；Run `1e933aca-0854-4021-bc52-dbb18d461cab`，隔离项目`sq-v13-web-d3b9d0f4d25f9f10f2ac`的容器/卷/网络独立查询均为空，外部源/真实券商调用0。到期的PostgreSQL边界和证券范围正式服务路径已证实；L04整体仍未完成，其他L05～L10及P4-P6和正式验收保持开放。见[Mandate到期与范围审计](../../evidence/audits/2026-10-07-v13-governance-web-loop.md#l04-mandate-到期与范围拒绝持久化补证2026-10-07)。

2026-10-07本轮V1.3代码门禁复验：`pnpm verify:stage -- --stage V1.3 --suite code`普通沙箱exit 1，Quant Worker loopback bind EPERM；保留失败后使用本机受控loopback权限同命令exit 0。docs/contracts/fixtures/layers、全仓build/lint/typecheck/unit通过，Governance 39、Trade 81、Platform 215、Quant Worker Python 14及其余服务测试通过。该门禁不替代业务矩阵和P3/版本人工验收。

2026-10-07 P4买入结果与规则子集对照增量：Quant为每笔BUY/SELL返回请求量、成交量、状态和拒绝原因，并将拒绝订单与部分成交分开计数；新增无量拒绝、资金不足拒绝及参与率部分买入断言。Quant定向单测20/20；隔离Trade PostgreSQL持久仓储对照覆盖全成BUY/SELL、部分BUY和零量拒绝，逐单价格、数量、费用、交易日及Outbox均一致，数据库事实orders=4/fills=3/fill_outbox=3，拒绝未生成Fill。隔离V1.4真实PostgreSQL/API/Quant/Web测试5/5，8个浏览器TestRun均由CLI同Run只读验证，16组Quant BacktestRun/Manifest结果Hash一致；新增100000股请求得到989股部分成交，未成交原因`INSUFFICIENT_CASH`，资源清理通过。最新运行审计见[隔离集成审计](../../evidence/audits/2026-10-07-v14-durable-tasks-b026a189be132c0a09b7.md)，两层规则证据见[规则对照审计](../../evidence/audits/2026-10-07-v14-trade-rule-parity.md)。Trade HTTP/Governance/Portfolio实际账本、全部CN/US日历/费税/结算、完整取消恢复和Qlib/Paper全规则一致性仍未通过，不勾选P4整体项或V1.4阶段。下一步先推进P3未完成的业务矩阵，再返回补齐P4剩余规则及端到账本对照。

2026-10-07 P3 L07/L08/L09 FakeBroker底层复验：`pnpm --filter @stockquant/trade-execution-service test:p5-7`当前树PASS，Run `aae5d1b1-ddd7-4b28-961c-1176ba905246`。真实隔离PostgreSQL/HTTP验证乱序取消seq2缓冲至Fill seq1到达、进程重启保留gap、因果归约至seq2、累计75股转增量、重复事件幂等、资源等待全部Fill交付后释放、版本费用更正Outbox投递；独立外部订单差异被持久显示。P5.7底层证据不替代V1.3上层治理/场景验收。P3 L10补证：V1.3 AUTO正常成交后独立无Cookie用户读订单403、随机其他Run读同单404，页面本身和同Run CLI合法读取不变；Run `d35b3fae-91af-472c-a50f-f9c93ce6e2a6`。V1.3隔离Web/API/CLI矩阵10/10 PASS，项目`sq-v13-web-462d139fdc7c0f78ac65`资源清理已确认。详见[V1.3事件顺序与权限审计](../../evidence/audits/2026-10-07-v13-governance-web-loop.md#l07l08-fakebroker-顺序事件复验与-l10-订单读取隔离-2026-10-07)。完整L10还缺真实会话失效/后台刷新及跨重启恢复，P3/P5和正式验收继续开放。

2026-10-07 P3 L05拒绝边界增量：V1.3隔离Web/API/CLI完整矩阵11/11 PASS，项目`sq-v13-web-854cb8fa430283f28473`容器/卷/网络已核实清理。新增跨币种（US/USD Proposal 对 CN/CNY Mandate）与Mandate证券范围拒绝，两者HTTP 403、Portfolio预留0、现金不变、FakeBroker订单404；并以固定CN Fixture执行9笔1005 CNY订单把余额降至955，第10笔Portfolio资源预留因不足返回409，同clientOrderId重放403，最终仍为9笔Captured预留、拒绝订单404。Run分别为`9efcc264-3f7a-4db9-bf41-d8a63845cf6c`和`76955552-4b03-4cea-98df-b962647d150a`。Web typecheck及V1.3 E2E通过，详见[V1.3 L05拒绝与资金审计](../../evidence/audits/2026-10-07-v13-governance-web-loop.md#后续进展l05拒绝边界与现金耗尽2026-10-07)。当前固定订单Fixture不支持卖出，故T+1可卖量仍未验证；L05、P3及正式阶段/人工验收保持开放。

2026-10-07 P3 L05 CN T+1 Portfolio前置增量（原日期假设已更正）：SELL资源预留输入新增run-scoped `asOf`并纳入持久幂等身份，CN按`Asia/Shanghai`日期排除当日BUY Fill数量，US不套用CN当日锁定规则。随机隔离PostgreSQL集成全部4项通过，实测CN当日`T_PLUS_ONE_UNSETTLED_QUANTITY`拒绝、9月24日买入后9月28日接受（25–27日Fixture休市），US同日接受。Market Data Fixture证实9月28日是交易日；Portfolio自身仍未读取版本化日历。旧记录里的“次日”描述以及9月26日日期假设不作为有效交易日证据。此前所述合同、身份、清理和代码门禁结果只代表当时树状态；当前树需按本次复验更新。详见[Portfolio CN T+1预留边界](../../evidence/audits/2026-10-07-v13-governance-web-loop.md#portfolio-cn-t1-sell-reservation-2026-10-07)。

2026-10-07 P3 L05正式Web/API/CLI T+1拒绝增量（修正有效交易日）：V1.3固定手工Proposal可构造CN SELL候选并把注入Run Clock传入Portfolio卖出预留；仅当预留通过后才释放并明确拒绝（尚未启用卖出执行），因此SELL不会误走买单FakeBroker路径。旧E2E Run `fce8381a-5ba2-4b50-84db-97d93aaf8126`使用Fixture休市日，不能作为有效正式证据。修正后的隔离Web/API/CLI矩阵12/12 PASS，Run `baac1599-7704-4ad3-b24b-c0936d1be0dd`，项目`sq-v13-web-fd8d870e3109d5423148`：以Fixture开市日2026-09-28运行，买入100股后同日批准SELL 100，Portfolio精确拒绝`T_PLUS_ONE_UNSETTLED_QUANTITY`，现金8995、持仓100、仅1笔Captured买入预留，SELL订单查询404；同Run CLI忠实WAITING/exit 2。隔离容器/卷/网络已清理，外部行情/真实券商调用0。详见[V1.3 T+1正式拒绝与Portfolio边界](../../evidence/audits/2026-10-07-v13-governance-web-loop.md#portfolio-cn-t1-sell-reservation-2026-10-07)。未覆盖版本化交易日历与CN卖出成功路径；仅关闭L05当日锁定拒绝子场景，P3/L05继续开放。

2026-10-07当前树V1.3代码门禁：`pnpm verify:stage -- --stage V1.3 --suite code`先在普通沙箱因Quant Worker随机loopback端口绑定EPERM退出1；保留失败记录后，在本机受控loopback权限下同命令退出0。当前树的文档/合同/Fixture/服务分层审计、全仓构建/类型检查/单测均通过；Platform 215、Trade 82、Governance 39、Market Data 74、Replay Worker 25、Quant Research TS 91与Python 14、Research Automation 218、Portfolio 5、Web 1及共享包测试通过。此门禁不替代P3业务场景、P4-P6或用户签署。

2026-10-07 P3 L06 Trade进程重启恢复增量：隔离V1.3 E2E加入固定序列——AUTO FakeBroker已提交唯一订单/Fill后HTTP响应丢失，先确认Portfolio预留仍HELD，再重启随机Compose项目内的Trade Execution容器，以同一`clientOrderId`重试查询并恢复。浏览器/API/同Run CLI矩阵13/13通过；Run `98d252d4-5f6d-49c8-84aa-8819b09b342a`，订单`ea68aecc-3b46-43c1-96f8-fb2c76aad415`，Fill `ac5f7e07-e8b2-4230-9d4b-d80d0ea17853`，Mandate CONSUMED、Portfolio reservation CAPTURED 1005 CNY、现金8995、持仓100，Outbox DELIVERED、独立资产MATCH、无未决订单/事件。隔离项目`sq-v13-web-55a525bc335d7881cd27`容器/卷/网络已核实删除，外部行情/真实券商调用0。该场景证明此固定提交后重启恢复，不代表任意Worker/总线双节点故障；L07/L08正式交易链、L09正式页面差异处理、L10会话边界等仍未完成，故P3保持开放。

2026-10-07 V1.3正式入口和逐Run导出复验：修复证据导出输出结构断言后，`pnpm test:e2e -- --stage V1.3` 13/13通过；每个Web TestRun在Harness清理前成功导出到`evidence/local/V1.3/<UUID>/`。最新Trade重启Run `fdbbe5ce-4e1d-4ff2-ad56-73ba66aca521`及原始声明见[V1.3隔离治理/Web审计](../../evidence/audits/2026-10-07-v13-governance-web-loop.md#v13正式e2e入口复验2026-10-07)。导出中的平台TestRun仍如实标记WAITING/NOT_RUN，不能覆盖浏览器业务事实，也不能据此宣称V1.3正式PASS；相关证据含义已在审计中拆分说明。该修复不关闭P3矩阵或版本门禁。

2026-10-07 P1隔离环境增量：V1.3正式Harness此前只把容器化后端接到宿主Vite；现在同一随机Compose项目构建并运行正式Web镜像，通过随机回环端口进行浏览器验收。`pnpm test:e2e -- --stage V1.3`在容器化Web环境13/13通过，包含Trade进程重启与同Run CLI；项目容器/卷/网络精确清理已核实，Web typecheck及Harness命令单测5/5通过；本次变化后完整V1.3 code suite exit 0。详见[V1.3容器化Web审计](../../evidence/audits/2026-10-07-v13-governance-web-loop.md#v13容器化web正式harness复验2026-10-07)。该结果补齐本V1.3 Harness的容器Web子项；P1贯穿五阶段环境、P3场景矩阵及P4-P6仍未完成。

2026-10-07 P3 L09外部订单差异闭环增量：V1.3新增owner/TestRun受限的固定外部订单观察和持久对账读取API，Web展示差异并在刷新后恢复。固定隔离场景确认FakeBroker外部未匹配订单1、本地订单/成交/待交付Outbox均0，Portfolio现金/持仓/资源占用无变化；重放同一观察请求`replayed=true`且差异数仍为1；同Run CLI仍WAITING/exit 2且只读。正式容器Web/API/CLI全矩阵14/14通过，最新差异Run `929eb1c9-7d1f-491e-adca-29d7e7437e00`，TestRun结构导出与独立业务事实分别记录，详见[V1.3 L09审计](../../evidence/audits/2026-10-07-v13-governance-web-loop.md#l09-v13正式页面持久外部订单差异-2026-10-07)。这只完成L09独立外部订单差异的一条完整业务子场景；外部资金/持仓对账及P3其余L01-L10缺口、P4-P6均继续开放。

该L09变更后，完整`pnpm verify:stage -- --stage V1.3 --suite code` exit 0，V1版本门禁仍exit 2/INCOMPLETE（5阶段未决、7条历史TestRun缺少结构化导出；当前证据引用与Hash检查PASS）。因此P3矩阵和V1总体版本没有提前关闭。

2026-10-07 V1.3阶段E2E正式入口纠正并实测：`pnpm test:e2e -- --stage V1.3`现委托隔离Harness，随机映射Platform和Trade loopback端口、使用独立PostgreSQL，并将Docker重启严格限制到该随机Compose项目。正式入口本次13/13通过，含L06 Trade进程重启原单恢复；项目`sq-v13-web-7e2ef7a59f5728d8e03e`清理经脚本核验。命令路由单测5/5、docs:check 4748/0、git diff --check通过。证据见[V1.3正式入口与Trade重启审计](../../evidence/audits/2026-10-07-v13-governance-web-loop.md#v13正式e2e入口复验2026-10-07)。

2026-10-07 P3 L10会话失效子场景：正式`pnpm test:e2e -- --stage V1.3`新增浏览器测试，先读同Run返回200，清除Context Cookie后同一请求返回401；完整隔离Web/API/CLI矩阵15/15通过，Run `f13e2a68-3f79-4235-89de-58d8b1dfb87f`。现有跨owner订单403、跨run订单404、Proposal过期版本409、L09重复命令幂等及刷新恢复断言也通过。随机Compose项目`sq-v13-web-19ca8de420b743579e1c`容器/卷/网络清理已核实；同次V1.3 code suite在受控loopback权限下通过（普通沙箱首跑因Quant Worker随机loopback绑定EPERM失败并保留）。该测试证明浏览器Cookie清除后的请求拒绝，不证明服务器端令牌撤销、会话后台刷新或API重启后的失效策略；因此L10/P3继续未完成。详细见[V1.3 L10会话失效审计](../../evidence/audits/2026-10-07-v13-session-invalidation.md)。

2026-10-07 L10服务端撤销及重启持久性增量：Platform以256位随机Token建立持久`platform_local_sessions`记录，只保存SHA-256、owner、创建/12小时到期/撤销时间；每个带Session Cookie的请求在入口查DB，logout立即撤销并清理Cookie，存储故障拒绝认证。正式随机隔离V1.3 E2E 15/15：Run `15735b58-1282-47ad-91ad-026cdd367aa7`有效请求200、logout 204、重启Platform API后旧Token重放401、无Cookie浏览器请求401；项目`sq-v13-web-e2a13b15514a17ad756a`容器/卷/网络清理已核实。Platform/Web类型检查及Platform 215项单测通过。V1.3 code suite须在本增量后重新执行；12小时真实等待未在E2E中执行，过期行为由每请求SQL条件强制而未宣称长时实测。OD-004/P3/L10其它矩阵、跨版本验收和用户签署仍未关闭，见[L10持久会话审计](../../evidence/audits/2026-10-07-v13-session-invalidation.md)。

2026-10-07 P3 L08单成交手续费更正正式Web纵切：新增owner/TestRun/Proposal/订单/Fill精确作用域路由与正式Web按钮；Run Clock和证据引用服务端注入，Trade持久层验证精确幂等命令。修复正式订单读取应返回当前费用而不是`original_fee`，且将手续费差额原子同步至FakeBroker独立资产现金。Fixture费用5→6后Portfolio/FakeBroker现金8994、100股持仓MATCH、Captured Reservation 1006；同Run CLI只读核验及完全相同revision重放通过。V1.3隔离正式E2E 16/16退出0；项目`sq-v13-web-b8110274053eeb22f6a1`容器/卷/网络均清理、外部源/真实券商调用0；TestRun `b4dd5393-a673-4e8f-8f36-c5c042d51c55`导出Manifest `da1ec67618fd6588cfde727530d14f8e1fbe924fae98be743200f52ffe16fab2`。当前树`pnpm verify:stage -- --stage V1.3 --suite code`exit 0；`pnpm contracts:check`exit 0、Markdown 4767链接无失败，变更源码SHA清单复核通过。V1正式门禁复核仍exit 2/INCOMPLETE：阶段文档审计和证据引用/Hash子门禁PASS，但五阶段未决及历史TestRun缺结构化导出未关闭。本轮仅完成L08的单个完整Fill revision-1更正/重放子场景；L07时序事件同Run矩阵、L08部分Fill/撤单竞态及错误恢复、P3其他场景与人工验收仍未完成。详见[L08审计](../../evidence/audits/2026-10-07-v13-l08-fee-correction.md)和[当前实现SHA-256](../../evidence/audits/2026-10-07-v13-l08-fee-correction.sha256)。

2026-10-07 P3 L07 FakeBroker因果成交序列持久化补证：更新Trade真实PostgreSQL隔离集成脚本，验证已有累计100股基线之上，累计150股的seq=2先到并缓冲，完全相同事件重放10次仍无新成交/Outbox；随后seq=1累计100到达并确认为0增量，因果游标一次推进至2，seq=2准确新增50股，最终FakeBroker成交事实150股、2笔Fill/2条Fill Outbox，现金事实1530.0190 CNY，Inbox无未应用事件；应用后再分别重放两条事件仍无重复。`pnpm --filter @stockquant/trade-execution-service test:integration:persistence:isolated` exit 0；PostgreSQL镜像`sha256:9e9764474d0c70ceff17378a6eca55b00c98d2f4d564be06a8e82f2431b3caa2`，随机loopback只绑定、临时只读容器由脚本清除。合成测试run ID `d1084653-1d90-410d-8904-7d2760a807a0`、订单`262b25bd-6f29-4571-8c37-af7803a42e77`。本证据只关闭L07的底层持久化因果顺序/10次重放子项：尚未通过正式用户/TestRun/Proposal Web命令路径，也未等Outbox交付后比较Portfolio与FakeBroker独立现金/持仓或同Run CLI，所以L07/P3/V1.3继续开放。详见[L07因果成交序列审计](../../evidence/audits/2026-10-07-v13-l07-causal-fill-sequencing.md)。

2026-10-07修复Trade独立账本可选性并恢复P5.7 HTTP/PG门禁：失败复现日志证明V2.4 snapshot订单不维护V1.3专用FakeBroker资产行，之前fee correction对缺行抛未捕获异常，导致Trade退出且HTTP连接断开。现Fee Correction无论如何更新FakeBroker Fill并写入Portfolio Outbox；只有独立资产账本存在时才在同一事务同步现金。`pnpm --filter @stockquant/trade-execution-service test:p5-7` exit 0，验证Portfolio入账丢响应后Trade重启Outbox恢复、revision-1费用更正确认/幂等/越权拒绝、L07/L08底层撤单与成交乱序gap跨重启保持、成交后精确释放余量资源、外部订单差异持久化。TestRun `527e2a43-4820-4281-ad1e-4fdb100e9fe5`，订单`c0796972-e73b-479a-9e07-b58dff71790b`；隔离PostgreSQL/网络清理已核验。详见[Fee Correction账本兼容性修复](../../evidence/audits/2026-10-07-trade-fee-correction-ledger-compatibility.md)。这只修复P5.7集成故障，不替代P3正式Web L07/L08工作。

2026-10-07本轮V1.3代码门禁复验：修复后Trade 82项单测、Trade→Portfolio隔离HTTP/PG recovery、FakeBroker隔离PostgreSQL持久化（含L07新增子项）均通过；`pnpm verify:stage -- --stage V1.3 --suite code`普通沙箱首跑因Quant Worker本机随机loopback绑定EPERM退出1，保留失败记录后受控权限下同命令退出0。contracts/doc links/build/typecheck/全仓单测/Python Qlib Worker均通过。`pnpm verify:version -- --version V1`仍exit 2/INCOMPLETE：五阶段均PARTIALLY_IMPLEMENTED，stage文档审计PASS 5/5、当前引用与SHA manifest检查PASS（177 refs/11 manifests/23 entries），另有7条历史TestRun结构化导出缺失（V1.2一条、V1.3三条、V1.5三条）。该门禁既不证明阶段人工验收，也不关闭P3-P6。下一步继续L07正式同Run Web/API/CLI事件链，并推进五阶段各自未完工作与可恢复的历史证据导出。

2026-10-07 P3 L07正式工作中订单增量：新增仅适用CN 600000.SH、MANUAL_APPROVAL、200股固定Fixture的隔离sequenced执行入口；Platform用当前用户、Run、Proposal、账户范围与注入Run Clock生成报告事实，Trade先持久化无Fill的ACCEPTED订单。Web可按L07场景顺序发送累计150股seq2、重放10次、再发送累计100股seq1；隔离PostgreSQL底层场景与Web/API/CLI E2E均PASS。TestRun `932c0040-b735-42ce-acca-f7ea87683b0e`最终两条Fill为seq1=100、seq2=50；FakeBroker与Portfolio现金8495.0000 CNY、持仓150，对账MATCH，同Run CLI只读核验通过，剩余500元Reservation仍HELD、已捕获1505元。Contracts、docs、Trade 84单测和Web/Platform/Trade类型检查通过；Harness已清除随机项目容器/卷/网络。审计见[V1.3订单闭环审计](../../evidence/audits/2026-10-07-v13-governance-web-loop.md#l07-webcli因果成交闭环2026-10-07)。L07的固定序列业务路径已具备，但恢复/竞态边界仍待补；P3、P1/P2/P4/P5/P6及用户签署仍未完成，V1不得放行。

2026-10-07 L07完成后的V1.3矩阵回归：当前隔离Harness 17/17 PASS，覆盖既有L01～L06、L08～L10以及新增L07 Web工作中订单因果成交路径；最新L07 Run `c1eec76f-f3e3-4e2e-b41c-4eb6f6f8bded`，订单/Proposal `e2021633-c79d-43d2-ba35-b6ddc045b8f5`，seq2重复10次后Fill为seq1=100/seq2=50，现金8495.0000 CNY、持仓150、Portfolio匹配；同Run CLI只读检查PASS，报告导出SHA `a7314b9dad70956010d3815125edd8e1d3e26914c0e74db45b1f21e7eb64bfd9`。随机隔离项目`sq-v13-web-bae432f9d16c70232d6b`已清理。完整代码门禁受控loopback运行exit 0（Qlib Worker Python 14/14）；V1版本门禁exit 2/INCOMPLETE，五阶段PARTIALLY_IMPLEMENTED、7份历史TestRun结构化导出缺失（V1.2一份、V1.3三份、V1.5三份），历史缺口和原记录均保留。P3矩阵仍受文档所有未决项/人工验收约束，P1/P2/P4/P5/P6尚未退出。


2026-10-07 P3 L08部分成交/撤单正式Web纵切通过：随机隔离V1.3 Web/API/CLI单场景1/1 PASS，Run `ba3778b9-fcf2-4a67-9891-8ad49a38c80c`。100股固定CN买单先成交40股(seq=1)，撤单前验证FakeBroker `CANCEL_REQUESTED`，seq=2 ACCEPTED后归约为`CANCELLED`并释放60股剩余预留；Fill手续费revision=1从1更正为6且同命令重放幂等。费用更正Outbox交付后FakeBroker/Portfolio现金均9594 CNY、持仓40、reservation RELEASED/captured 406、对账MATCH；同Run CLI只读检查及随机容器/卷/网络清理PASS。修复Trade cancel-result HTTP处理器归约成功后未drain Reservation Resolution Outbox。详见[L08部分成交撤单审计](../../evidence/audits/2026-10-07-v13-l08-partial-fill-cancel.md)及[源码SHA-256清单](../../evidence/audits/2026-10-07-v13-l08-partial-fill-cancel.sha256)。这只关闭L08固定成功顺序子项；取消竞态/费用更正失败恢复、P3其他矩阵、P4/P5/P6和版本人工签署继续未完成。

L08加强复验：在同一固定Web/API/CLI场景新增撤单接受前Portfolio Reservation必须保持`HELD`的后端断言，seq=2接受后回读为`RELEASED`；同一revision-1费用更正正式API重放返回本Platform合同约定的202且`replayed=true`，余额没有二次记账。Run `4597d1cf-81bc-4553-8fc7-4bd7f2926efc`、Proposal `f1745ebe-18ba-4809-8912-ce110afa5ffc`、ManifestHash `7ab4490bc81b66b2c795b2649854a6a58684869b4eb45221319845e729978f9a`；单场景PASS，随机项目`sq-v13-web-34498d7abe8c3b94d23c`退出0并清理通过。初次Playwright把该路由幂等重放响应误期望为200，依据现有固定202路由合同修正断言后复验通过；该失败为测试期望问题。审计中保留前次Run并追加最新复验事实。

L08加强变更后的V1.3完整回归：`pnpm test:e2e:v13-isolated`随机隔离运行18/18通过，现有L01–L07、L09–L10及L08部分成交/撤单/费用更正场景全通过，同Run CLI断言通过，Harness退出0并确认容器/卷/网络清理；真实券商/外部行情调用0。完整回归项目`sq-v13-web-26c45aee91d57f6f5097`，增强L08 Run `552d9af8-ad6a-4af8-b594-abf4d1a19833`，ManifestHash `8a091502b3fdf44340071b6d684a368388bfee6078e27d7f3e1e7f8f92d0accf`。完整回归详情及准确边界见[L08审计](../../evidence/audits/2026-10-07-v13-l08-partial-fill-cancel.md)。这关闭当前固定Web矩阵回归，不关闭P3其余非固定边界、V1的P1/P2/P4/P5/P6或人工签署。

2026-10-07 P3 L08费用更正持久Outbox失败恢复：增加仅隔离V1.3 Compose环境可开启的一次性Portfolio投递拒绝，Web订单详情显示费用更正Outbox状态/尝试次数。正式恢复测试注入第1次交付失败后，持久Outbox自动重试并以第2次`DELIVERED`；费用6.0000、组合现金8994.0000、FakeBroker与Portfolio对账MATCH，同Run CLI check-only通过。第一次全矩阵未开启专用故障开关，19/20通过并准确失败于尝试次数断言；失败Run保留。启用`STOCKQUANT_V13_TEST_FEE_CORRECTION_FAILURE_ENABLED=true`后，正式隔离命令20/20通过，20份结构化Run均`manualConclusion=NOT_RUN`；代码套件完整exit 0；Harness确认随机Compose容器、卷、网络均已删除，真实券商/外部行情调用0。逐Run证据见[20/20矩阵审计](../../evidence/audits/2026-10-07-v13-web-matrix-20-20.md)。这关闭L08该持久失败恢复子场景，不关闭P3全矩阵、运行手册、完整市场规则或人工验收。

2026-10-07本轮版本门禁复核：`pnpm verify:version -- --version V1` exit 2/INCOMPLETE；阶段文档审计5/5 PASS，证据引用与活动Hash审计202 refs/11 manifests/23 entries PASS。仍因7个既有V1.2/V1.3/V1.5历史TestRun缺少结构化导出、多个阶段/交付项未完成及未签署而不能放行。本次没有把自动Run的`manualConclusion=NOT_RUN`提升为人工PASS；V1整体执行计划继续推进。

2026-10-07 P1 V1.1正式E2E入口修复：顶层`pnpm test:e2e -- --stage V1.1`先前直接调用原生Playwright，recovery用例因缺少隔离Compose项目标识而在业务操作前失败。现阶段路由改为调用既有随机隔离stage-storage Harness；路由单测6/6通过，正式命令完整重跑退出0，内含V1.1 code suite与Chromium normal/rejection/recovery 3/3，同Run CLI check-only成功，recovery仅重启核验后的Portfolio容器，Harness精确移除并核对容器/卷/网络/镜像。项目`sq-v11-stage-ec7d1d5666183e86a70b`，Run输出`fa2bf85a-fb29-4219-89d9-f535b6a3a874`、`774d4367-5a52-4ae2-b4ff-185a02b5cbed`、`acd9fedf-324b-44cf-b248-934613f36091`；隔离数据库清理后不作为结构化Evidence bundle或人工签署。详见[P1 V1.1入口复验](../../evidence/audits/2026-10-07-p1-v11-stage-entry-rerun.md)。此修复完成正式命令路由切片，P1合同覆盖、Artifact/全阶段隔离要求与活动存储维护包仍未完成。

2026-10-07 P1交互环境与清理边界加固：此前`stack:up`读取共享`.env.local`并使用Compose默认项目名，`stack:down`也没有目标约束，不满足随机隔离并存在误操作默认项目的风险。现只开放真实隔离配置完成的V1.1交互栈，其余阶段明确exit 2；V1.1使用随机Compose项目/loopback端口、0700目录和0600随机PostgreSQL超级用户/角色凭据、SCRAM主机认证、容器化Web/API/PostgreSQL、PAPER/FAKE/LIVE关闭和显式项目ID停止。因发现原V1.1集成Compose使用trust，两个前置交互栈均已精确清理且不作SCRAM证据；中间曾有一次未传新的Web端口导致的无资源启动失败，补参后正式隔离code/Web/CLI/restart suite退出0，normal/rejection/recovery 3/3、同Run CLI均通过，Harness清理容器/卷/网络/镜像。SCRAM交互栈精确清理已单独验证成功；另一个SCRAM栈当前保留供人工检查：`sq-v11-stack-6c7c96c2fd4cde3f6e88`，Web `http://127.0.0.1:59783/acceptance/v1/v1.1`，停止命令`pnpm stack:down -- --project sq-v11-stack-6c7c96c2fd4cde3f6e88`。审计及源码SHA见[交互隔离栈生命周期审计](../../evidence/audits/2026-10-07-p1-isolated-interactive-stack.md)。该改进关闭V1.1交互栈生命周期子项，不关闭其他V1阶段环境、完整第8节手册、活动存储迁移或P1总体。

2026-10-07 P4 当前代码与正式隔离E2E复核：`pnpm verify:stage -- --stage V1.4 --suite code`在本机受控loopback权限下exit 0；普通沙箱首次因Qlib Worker随机loopback bind EPERM退出1，失败保留。该门禁中合同/生成器漂移、Fixture、分层、全仓构建/lint/typecheck/unit通过；Quant Worker Python 14、Market Data 74、Trade 85、Platform 216、Governance 40、Research Automation 218项单测通过。按阶段入口`pnpm test:e2e -- --stage V1.4`先因Docker socket权限退出1，受控权限原命令重跑exit 0。随机Compose `sq-v14-backtest-28218813000ec6215f40`的真实PostgreSQL、Quant、Portfolio、Platform、容器化Web执行完整回测；Playwright 4/4通过：报告展示、合成停牌/锁板、历史费表切换、策略配置与持久运行比较；6个浏览器创建Run加API Run均由同Run CLI核验，另含CLI rejection/recovery，PostgreSQL 11个BacktestRun/Manifest结果Hash匹配。Fixture SHA `88a198cbf5e2cf8f3bf1351a31c5aba1b9d9c6ce2d28343fb05a1dc462569bef`，源码 `sha256:e57db3ec917a178448a7c024eaf22e48bd3360b1aa6c1fc3a127c1ac82eca6d7`，机器结果在[隔离回测审计](../../evidence/audits/2026-10-02-w1-v14-quant-configurable-web-28218813000ec6215f40.json)，当前复核过程和边界见[V1.4复验审计](../../evidence/audits/2026-10-07-v14-reverification.md)。容器、卷、网络清理均由Harness确认。此复核证明当前V1.4固定回测链能执行，不覆盖P4计划中的公司行动、跨市场规则一致性、取消/进程重启恢复、全量拒绝/恢复矩阵、用户签署或最终V1放行；P4及阶段状态仍不结项。

2026-10-07 V1正式Verifier历史Hash/Run缺口复核：第一次运行exit 1的9条源码Hash差异位于两份2026-10-06 V1.2历史执行输入Manifest；未改写Hash文件，只将PRD/总计划中相应引用label明确为“历史执行快照”，重跑后V1 verifier为INCOMPLETE/exit 2，文档审计5/5与当前有效证据Hash审计均PASS（186 refs/12 manifests/32 entries/0 failures）。仍有7条旧V1.2/V1.3/V1.5 TestRun结构化导出缺失；逐项工作树搜索和Git本地历史查询均无可恢复bundle。随后本机Platform恢复可达，使用短时LOCAL_DEVELOPMENT会话对7个原UUID逐一只读查询，各自阶段路由均HTTP 404；未编造结果或替换UUID。完整核查见[V1历史Run与版本门禁审计](../../evidence/audits/2026-10-07-v1-version-gate-history-audit.md)。如原Platform数据库/备份以后恢复，可再次尝试相同ID导出；在此之前版本门禁继续INCOMPLETE。此为P6历史证据项的准确结论，不阻止P3/P4/P5独立工程继续。

2026-10-07 P6测试手册状态纠正：V1测试计划曾过期地把五阶段第8节均概述为DRAFT_NOT_EXECUTABLE；按当前阶段文件核对后，已改为逐阶段现状（V1.2限定Fixture手册VERIFIED_EXECUTABLE，V1.4/V1.5 PARTIALLY_VERIFIED_EXECUTABLE，V1.1/V1.3 DRAFT_NOT_EXECUTABLE）。该目录修正只纠正事实，不改变任何阶段交付、验收或人工签署结论。

2026-10-07 P4合成公司行动账务切片已通过：V1.4新增版本化合成RAW日线、2:1拆股、每股10分现金分红应收/支付及重复投递去重。随机隔离Harness `pnpm test:e2e -- --stage V1.4` Playwright 5/5、13个BacktestRun/Manifest/Hash匹配、Web TestRun同Run CLI check-only通过；逐日净值手算均为200000分，临时容器/卷/网络清理通过。完整当前树代码门禁`pnpm verify:stage -- --stage V1.4 --suite code` exit 0，Qlib Worker Python 14/14。证据、源与Fixture哈希以及修复前失败记录见[公司行动审计](../../evidence/audits/2026-10-07-v14-corporate-actions.md)。此前V1.4复验条目作为历史快照保留。此合成账务切片不等于完整公司行动支持；真实公司行动/税务与交易所规则、Qlib/Paper规则对照、拒绝/恢复矩阵、持久人工手册、用户签署与Ubuntu验证仍待完成。P4不结项，P5/P6以及V1版门禁继续执行。

2026-10-07 P4同输入撮合规则对照增量：Quant测试对照Trade Execution确定性历史撮合器，固定BUY/SELL数量、价格、费用、下一交易日日期2/2通过；并通过随机隔离PostgreSQL调用持久FakeBroker仓储重复核对两笔订单、Fill及Fill Outbox，数值与Quant报告一致。29%×100股向量曾使二进制浮点`floor(100*0.29)`错误返回28，Trade Execution现将十进制参与率转为有理数计算。PostgreSQL临时容器/网络清理通过，Trade撮合单测10/10通过；新增对照已经纳入`pnpm verify:stage -- --stage V1.4 --suite code`，完整门禁exit 0。审计见[规则对照切片](../../evidence/audits/2026-10-07-v14-trade-rule-parity.md)。此PG测试直调FakeBroker仓储，未走Trade HTTP/Governance授权或向Portfolio投递Fill，不核对组合账本；费率/滑点舍入、结算现金、公司行动、拒绝恢复与全市场规则仍未一致性验证，故P4同规则对照项目仍开放。

2026-10-07 P4持久任务闭环增量：Platform先在PostgreSQL创建RUNNING TestRun，再异步调用Quant；生成Quant请求把同一UUID用作BacktestRun/Manifest ID，结果连同策略证据持久后才完成Platform投影。取消在Quant派发前持久记录；Platform启动扫描RUNNING并逐TestRun advisory lock恢复。隔离Harness成功验证：取消前Quant报告计数不变；Platform分别在Quant调用前、Quant BacktestRun/Manifest提交后被强制终止，恢复后原TestRun以`resumeCount=1`完成；已存在Quant结果的同ID同输入重试返回同一结果且不增加行，变更策略返回409。Web 5/5，7个浏览器Run由CLI同Run核验；总计16个Platform TestRun、15对Quant Run/Manifest/Hash一致；容器/卷/网络/镜像已清理。证据见[持久任务审计](../../evidence/audits/2026-10-07-v14-durable-tasks-3e249b385f39763ddd91.md)及相邻JSON/SHA-256。此项不关闭市场规则日历、Qlib/Paper全规则对照、人工Web操作/签署或P4剩余检查。

2026-10-07 P4完整代码回归：在Quant仓储幂等单测更新后，`pnpm verify:stage -- --stage V1.4 --suite code`受控loopback权限完整exit 0；contracts/fixtures/service layers、构建、类型、全仓测试及Qlib Worker 14/14通过，Platform 51文件219项、Research Automation 218项、Market Data 74项等全仓单测通过。普通沙箱运行在Qlib Worker随机loopback socket绑定处EPERM退出1，失败事实保留，受控权限同命令通过。隔离Web/API/Quant/PostgreSQL/CLI E2E使用相同代码Hash并通过；最新结果见[持久任务审计](../../evidence/audits/2026-10-07-v14-durable-tasks-3e249b385f39763ddd91.md)。本项仍不关闭P4市场规则、日历、全量Paper规则对照及人工验收。

2026-10-07 P3当前正式矩阵复验：新增L08正式Web/API路径验证seq=1/2成交事件按因果顺序累计150股后，seq=3权威撤单结果才取消剩余50股；Portfolio保持1,505.0000 CNY已捕获、500.0000 CNY余量释放，FakeBroker/Portfolio对账MATCH，同Run CLI check-only通过。单场景随机隔离Run `38cf8469-33e9-4311-b2fa-a1252559fb5c`通过后，完整正式命令`pnpm test:e2e -- --stage V1.3`重跑为19/19 PASS；19份结构化TestRun导出均保持`manualConclusion=NOT_RUN`，随机Compose项目`sq-v13-web-c5ccad5e4588e2b7c456`容器/卷/网络清理通过。逐Run链接、限定范围及边界见[本轮矩阵审计](../../evidence/audits/2026-10-07-v13-web-matrix-19-19.md)，源码/审计SHA清单相邻保存。这不覆盖L08费用更正失败恢复、真实市场覆盖、运行手册和用户签署；P3/V1继续开放。

2026-10-07 P3 L08变化后的完整代码门禁：`pnpm verify:stage -- --stage V1.3 --suite code`在受控环境exit 0；合同生成/漂移检查、Fixture与服务分层、全仓构建/类型/单测均通过，Platform 51文件219项、Research Automation 38文件218项、Market Data 74项、Quant Worker 14项等。本门禁与上方19/19隔离端到端复验针对同一当前工作树。`pnpm verify:version -- --version V1`仍exit 2/INCOMPLETE，阶段文档审计5/5和证据引用/当前Manifest校验PASS，7份历史结构化Run导出仍缺，人工验收保持NOT_RUN；这轮只关闭固定L08时序子项。

2026-10-07 当前迭代收束复核：V1.3 hardened-SCRAM固定矩阵20/20与code suite在受控loopback环境PASS；V1.4独立隔离PostgreSQL/Quant/Platform/Web/CLI集成在随机凭据、SCRAM、随机服务token下PASS，包含持久任务取消/两处崩溃恢复、5/5浏览器和15份Hash配对；V1.4与V1.5交互栈逐项目实测清理；V1.5真实NATS重复Msg-ID探针只留下1条、Temporal集群健康SERVING。V1.5 code suite同样需loopback权限，受控重跑PASS。`pnpm docs:check`检查4893链接无失败，V1阶段文档审计5/5 PASS，活动引用/Hash审计206 refs、11 manifests、23 entries PASS。V1版本门禁仍exit 2/INCOMPLETE，五阶段状态均PARTIALLY_IMPLEMENTED；7份历史TestRun结构化导出缺失，P1剩余合同/持久派发/Artifact/存储维护未关闭，P3/P4/P5/P6及Ubuntu/人工确认仍有未完成项。计划维持IN_PROGRESS，本轮所有自动证据保留NOT_RUN人工结论，未签署阶段或版本验收。

2026-10-07 P1 V1.2 ArtifactRef契约切片：新增公共`artifact-ref.v1`投影，TestRun的`qlibFit`证据与Artifact读取API返回一致的owner/run/kind/namespace/hash/status/sourceRef；V1.2 OpenAPI响应正式引用公共ArtifactRef Schema，保留既有响应字段、Artifact领域存储及生命周期。定向平台单测7/7、平台Build、`pnpm contracts:check`（286 JSON/203 schemas/生成器及23份OpenAPI）与`git diff --check`通过。真实隔离Web/API/CLI Playwright 1/1通过，锁版Qlib CN_A/US_EQUITY训练、拒绝/恢复探针、取消无发布、Platform重启后同Run恢复（resumeCount=1）、Artifact API ref等于TestRun证据ref均被核验；容器/卷/网络/镜像精确清理通过。主Run `06af4dcd-86af-4e85-82df-207dc7842565`，Artifact SHA-256 `aaad642e185dc622d2fe79764f6527645c05709a4d41f536f6e7a2ba7e61e3`，审计见[V1.2 ArtifactRef](../../evidence/audits/2026-10-07-p1-v12-artifact-ref.md)及[机器E2E](../../evidence/audits/2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-bdfb6470595aee4cfb60.json)。P1“全V1数据/因子/报告Artifact统一身份”仍未通过，V1.3/V1.4 Artifact待同类审计；当前范围人工验收仍NOT_RUN，不启用OD-013未决的到期/删除策略。

2026-10-07 P1 V1.4 Quant报告ArtifactRef切片：Quant仍拥有持久BacktestRun/Manifest；只有两者原子持久化后才在结果合同回传双Hash。Platform将结果Hash绑定owner/TestRun并投影公共`artifact-ref.v1`到TestRun读取，同时提供受owner保护的报告导出API，导出前重新计算规范Hash；失败/取消Run不发布。V1.4 Quant结果Schema与TS/Python生成类型已更新，新增Platform OpenAPI文档和契约检查注册。Platform/Quant构建、报告投影/持久任务/Adapter单测11项、`pnpm contracts:check`通过；隔离真实PostgreSQL/Quant/Platform/Web/CLI集成重跑Playwright 5/5、七个浏览器Run同Run CLI检查全部通过，API报告内容Hash核验，异owner无Cookie访问403，重启/取消路径与双Hash持续通过，项目容器/卷/网络清理已核实。最新项目`sq-v14-backtest-40fb36100b381d1dafdf`、主Run`2e13fd9a-0d4b-4044-ad25-c23b5cf4350f`、报告SHA-256 `cdaf9a1f1ea994087d827af89f98981cb4152a618a093f8c9a517faf4c63f9e0`；审计见[V1.4报告ArtifactRef](../../evidence/audits/2026-10-07-p1-v14-report-artifact-ref.md)及[隔离集成机器记录](../../evidence/audits/2026-10-07-v14-durable-tasks-40fb36100b381d1dafdf.json)。该切片不代表V1.1/V1.3 Artifact、行情数据导出或P1总要求完成；P1复选框保持未勾选，当前范围人工验收NOT_RUN。

2026-10-07 P1当前代码门禁补验：`pnpm verify:stage -- --stage V1.5 --suite code`普通沙箱运行因Qlib Worker随机loopback绑定EPERM退出1；保留该结果后受控本机同命令exit 0。contracts/fixtures、29个客户端生成器与漂移/兼容检查、8个服务分层规则、构建/类型检查和工作区测试通过；V1.5 orchestration单测3/3通过且确认真实业务仍是WAITING/NOT_RUN。审计及当时工作树patch摘要Hash见[V1.5代码套件复验](../../evidence/audits/2026-10-07-v15-code-suite-rerun.md)和[SHA-256](../../evidence/audits/2026-10-07-v15-code-suite-rerun.sha256)。这是契约生成、漂移与分层工程门禁的当前证据，但不能证明所有跨服务消费者已迁移到生成客户端，也不关闭P1全Artifact Producer统一、活动存储切换/回退及V1.5业务Workflow；相应P1复选框与V1版本门禁保持开放。

2026-10-07 P2当前树完整复验后V1门禁：`pnpm verify:stage -- --stage V1.2 --suite code`受控运行exit 0，真实Qlib fit smoke、隔离PostgreSQL/HTTP、Artifact重启检查及Web/API/CLI 1/1均在套件内通过；Playwright四个Run及哈希快照见[本次机器结果](../../evidence/audits/2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-1dd2d38c42f2392cb0b4.json)和[历史执行快照输入清单](../../evidence/audits/2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-1dd2d38c42f2392cb0b4.sha256)，隔离Harness容器/卷/网络清理通过。`node scripts/verify-version.mjs --version V1`复跑仍为exit 2/INCOMPLETE；阶段文档审计5/5、证据审计283引用/13 Manifest/29条目/0失败，7个特定历史TestRun仍无可恢复结构化导出，五阶段未完成项与人工签署未完成继续由Verifier拦截。V1.2验收表记录了本次自动回归，`manualConclusion`仍为NOT_RUN；本结果不关闭P2/P1或V1版门禁。

2026-10-07 P1 Artifact/并发与执行检查点：Artifact producer/lifecycle矩阵记录V1.2模型、V1.4报告、版本化Fixture、TestRun导出与领域事实的所有权边界；V1.4取消先行时拒绝报告发布、发布先行时拒绝取消及Artifact owner/Run/hash隔离的真实PostgreSQL测试2/2通过，完整V1.4 `--suite code` exit 0，详见[Artifact矩阵](../../evidence/audits/2026-10-07-p1-artifact-lifecycle-matrix.md)与[代码套件日志](../../evidence/audits/2026-10-07-p1-v14-artifact-fencing-complete-code-suite.log)。V1.3完整`--suite code` exit 0（baseline/docs 5203 links、构建、lint、typecheck、工作区测试240/240、Portfolio/Trade/Market Data隔离集成、合同、Python adapter、ops与HTTP smoke），日志见[V1.3代码套件](../../evidence/audits/2026-10-07-p1-v13-shared-code-suite.log)。内容检查点归档及8242个文件Hash已验证，见[检查点说明](../../evidence/checkpoints/2026-10-07-worktree-before-p1-artifact-lifecycle.md)。当前明确的Artifact剩余只有OD-013保留/孤儿处理决定与盘点闭合；活动存储切换准备见[切换准备审计](../../evidence/audits/2026-10-07-p1-storage-cutover-preparation.md)，因为活动数据副本恢复演练与维护责任输入缺失，状态保持DRAFT_NOT_EXECUTABLE，不暂停writer、不碰活动卷。P1总体仍未完成。

2026-10-07 P1 V1.1存储回退前置复验：修正test-legacy-stage-http-smoke.mjs在当前安全配置下缺少一次性随机Platform服务令牌、仍使用已撤销假Cookie的问题；HTTP smoke现在用临时32-byte token和明确启用的测试身份头，不创建真实Session。随机隔离PostgreSQL完整test:integration:persistence最终通过：跨阶段存储/冲突断言、迁移与历史记录、幂等和冲突事务回滚、stage owner范围读取、legacy/stage双写、双写部分失败原子回滚、HTTP/evidence读取200与跨owner 403；Harness确认活动服务未连接并精确清理容器/网络。完整终端日志、日志Hash与当时patchHash见[V1.1存储持久化复验](../../evidence/audits/2026-10-07-v11-storage-persistence-rerun.md)、[日志](../../evidence/audits/2026-10-07-v11-storage-persistence-rerun.log)和[SHA-256](../../evidence/audits/2026-10-07-v11-storage-persistence-rerun.sha256)。早先两个配置失败均在本轮辨明，未用于报告PASS。只关闭隔离迁移/双写/回退机制的工程证明，不执行或授权活动切换；备份恢复、维护窗口、旧非终态Run处置和回退负责人仍是切换前门槛，P1总体保持未完成。

2026-10-07 P3 L07跨Trade重启恢复：正式Web场景先发送并重复重放累计Fill seq=2，再重启随机隔离项目的Trade Execution容器，最后发送seq=1；重启后持久化缓冲事件按因果次序归约，产生seq=1 100股和seq=2 50股两条唯一Fill。FakeBroker与Portfolio均为150股/现金8495.0000 CNY，对账MATCH，同Run CLI check-only通过。单场景1/1，完整V1.3隔离Web/API/CLI矩阵21/21通过，Harness确认容器/卷/网络/镜像清理。首轮全矩阵未启用L08指定一次性失败开关，按断言记录失败并保留；启用`STOCKQUANT_V13_TEST_FEE_CORRECTION_FAILURE_ENABLED=true`后完整重跑通过，观察到费用Outbox第1次失败、第2次DELIVERED。V1.3 Web typecheck通过；Run `322d8249-4f10-47e4-9e2e-ec2e3231efaa`及输入哈希见[L07跨重启审计](../../evidence/audits/2026-10-07-v13-l07-restart-recovery.md)。此项仅关闭L07该恢复切片；TestRun摘要及人工结论继续WAITING/NOT_RUN，P3其他竞态/故障、全市场规则、手册和人工验收未关闭。

2026-10-07 L07变更后V1门禁复验：`node scripts/verify-version.mjs --version V1`退出2/INCOMPLETE；阶段文档审计5/5 PASS，当前有效证据引用222项、11份Manifest、23条目、0失败。五阶段仍为PARTIALLY_IMPLEMENTED，7个原始历史TestRun结构化导出仍缺。机器报告见[本轮V1门禁](../../evidence/audits/2026-10-07-v1-plan-progress-after-v13-l07.md)。历史执行快照按明确标签排除当前源码比较，原哈希未改写。该门禁结果不改变V1未完成结论。

2026-10-07 P3 L07撤单待确认跨Trade重启：为200股固定CN订单补充两个会话保护的TestRun/Proposal-scoped Platform 操作：持久撤单请求、按固定seq=3提交权威接受结果。Web E2E 在seq=2缓冲/seq=1归约150股后请求撤单，验证订单`CANCEL_REQUESTED`、Portfolio预留`HELD`；仅重启Trade容器后两项仍保持原状；随后seq=3将订单收敛为`CANCELLED`，50股余量释放且150股合法成交保留。FakeBroker与Portfolio现金均8495.0000 CNY、持仓150、Reservation `RELEASED`/captured 1505.0000、reconciliation `MATCH`，同Run CLI check-only通过。OpenAPI添加并由contracts checker验证两步操作、身份/路径范围和响应状态。定向隔离E2E 1/1、完整V1.3矩阵21/21、Platform typecheck、`pnpm contracts:check`均通过；Harness确认随机项目`sq-v13-web-a6994907b2887e39b704`的容器/卷/网络/镜像清理。Run `6a3d15b4-9332-4c1a-8bc1-ec45599811af`及源码/证据Hash见[L07撤单待确认恢复审计](../../evidence/audits/2026-10-07-v13-l07-cancel-restart-recovery.md)。这关闭固定L07撤单待确认的一次Trade重启恢复；其他竞态/故障点、全市场规则、交接及当前人工验收仍未关闭。

2026-10-07 P3 AUTO_POLICY协调应用服务切片：将AUTO_POLICY执行的Run/Proposal/Mandate/FAKE账户范围核验及Trade命令协调从HTTP Controller提取到带显式Ports的`v13-auto-execution`应用服务，注入TestRun Clock并保留现有Trade/FakeBroker/Portfolio业务事实边界；新增5项单测。`pnpm verify:stage -- --stage V1.3 --suite code` exit 0（Platform 56文件/246项），带声明式L08失败注入的完整隔离Web/API/CLI矩阵21/21通过，容器/卷/网络/项目资源精确清理，真实券商/外部来源调用0。AUTO_POLICY主Run `feaa6ca0-12d2-4901-881a-51d179a85280`；L06 UNKNOWN查询恢复Run `52462eb5-515d-4d6c-b724-3dd9f09d7056`；Trade重启恢复Run `7eb7b96e-2891-457a-8803-e6a4cccb6c54`。首次矩阵未提供L08专用注入变量、触发既定重试次数断言失败，保留并在审计说明；补齐输入后的正式全矩阵通过。完整日志、代表Run、限制及源码Hash见[AUTO_POLICY应用服务审计](../../evidence/audits/2026-10-07-v13-auto-execution-application-service.md)及相邻JSON/SHA清单。该切片仅证明AUTO_POLICY这条协调边界，Proposal/审批、MANUAL与其它业务协调仍未全部从Controller移出；P3和V1继续开放，自动证据不改变`manualConclusion=NOT_RUN`。

2026-10-07 P3增量后V1门禁：版本Verifier退出2/INCOMPLETE，阶段文档结构5/5 PASS，当前有效证据225引用/11份Manifest/23条目无失败，7份原始历史Run导出仍未恢复。最新门禁结构化输出见[门禁审计](../../evidence/audits/2026-10-07-v1-plan-progress-after-v13-l07-cancel.md)；整体V1仍未完成。

2026-10-07整计划进度门禁复核：`node scripts/verify-version.mjs --version V1`退出2/INCOMPLETE；五阶段文档结构5/5 PASS，证据引用223项、13份Manifest、156个条目均无Hash/路径失败。五阶段均PARTIALLY_IMPLEMENTED；原始历史TestRun结构化导出仍缺7项（V1.2一项、V1.3三项、V1.5三项），并未改写UUID或推断结果。机器输出及Hash见[进度门禁审计](../../evidence/audits/2026-10-07-v1-plan-progress-gate.md)。该结果只重确认当前阻断，不代表计划完成；P1～P6工程缺口及本轮人工验收继续推进/待用户实际确认。

2026-10-07 P5执行中Worker重启后的当前门禁：最终V1.5隔离E2E `sq-v15-e2e-379cfb205b900536844f` exit 0，Playwright 1/1；normal Run `79828837-80e4-4225-8964-e34563a805cb`的CN_A Activity启动后重启Platform/Temporal Worker，同一持久Workflow完成120条观察；第二Run `e71f5ef6-1be4-4ae1-b38d-1815e2c2b824`经一次Temporal调用边界UNAVAILABLE、实际NAK/redelivery后完成120条且ACK floor=5。NATS短停/API派发前重启、坏JSON/错误owner终止、丢ACK重投、原Outbox恢复和精确清理仍通过；详见[本轮V1.5运行审计](../../evidence/audits/2026-10-07-v15-nats-temporal-dispatch-e2e.md)及9项源码Hash。`pnpm verify:stage -- --stage V1.5 --suite code`当前exit 2，所有在前构建、类型、链接/契约/Fixture、已结束的单测通过，最后被未安装的锁版Python Worker镜像`python@sha256:e41613d42d4891e4930f79523f93f81bbc7632584ec65e36ab055f41a800b41e`阻断；没有拉取/构建，完整输出见[code suite报告](../../evidence/audits/2026-10-07-v15-code-suite-after-worker-restart.md)。V1门禁仍INCOMPLETE，当前门禁报告见[版本门禁审计](../../evidence/audits/2026-10-07-v1-plan-gate-after-worker-restart.md)：七份原始历史Run导出、P1～P6工程/手册、DB错误、Temporal服务真实停机、网络、多Worker、交易/日终、备份、W8目标Ubuntu与新增范围人工签署仍未完成；历史签署没有扩展或代签。

2026-10-07 本轮继续执行后的门禁快照：重新运行`node scripts/verify-version.mjs --version V1`，结果仍为exit 2/INCOMPLETE，阶段文档审计5/5 PASS，当前证据引用254项、13份Manifest、29条目、0失败；7个原始历史Run导出仍不可用，五阶段均未完成。V1.5完整code suite现已exit 0；详情见下方P5记录及[当前V1计划门禁](../../evidence/audits/2026-10-07-v1-plan-gate-current.md)。该版本门禁不关闭其它工程包或人工/Ubuntu验收。

2026-10-07 P4 CN_A费用对照推进：FakeBroker历史执行接受受限的版本化CN_A费用输入，将费用计划纳入请求指纹；按Quant相同的佣金最低值、沪市过户费、卖方印花税和逐项向上取整规则计算分币费用，对非CNY/非沪深证券和费率生效日期外输入拒绝。Quant/FakeBroker同输入单测6/6通过，Trade执行域11/11及类型检查通过；专用随机PostgreSQL smoke比较BUY、SELL、部分BUY、零成交拒绝的持久状态、数量、滑点价、分币费用、Session、拒绝原因及Fill Outbox，4订单/3 Fill/3 Outbox精确相符，容器及网络清理核验通过；完整`pnpm verify:stage -- --stage V1.4 --suite code` exit 0。证据及四个源码Hash见[CN_A费用一致性审计](../../evidence/audits/2026-10-07-v14-cn-a-fee-parity.md)。范围限冻结合成CN_A费率计划；全市场/完整历史费税、结算规则、Paper总账对照和用户/Ubuntu验收仍开放，因此P4及V1.4不结项。

2026-10-07 P5完整代码套件复验：本地只读镜像检查确认锁版Python基础镜像`python@sha256:e41613d42d4891e4930f79523f93f81bbc7632584ec65e36ab055f41a800b41e`现可用（image ID `sha256:829cc065f506a60d332260af9fc48c590d60cfeff8bfc20df57b7baf20edb879`，linux/arm64）；没有pull/build，Worker单测以network=none运行。`pnpm verify:stage -- --stage V1.5 --suite code`最新exit 0，14/14 Python Worker测试及完整规定代码套件通过，完整日志/镜像身份见[V1.5代码套件审计](../../evidence/audits/2026-10-07-v15-code-suite-pinned-python-available.md)。先前镜像缺失exit2保留为当时快照。此结果关闭V1.5代码套件镜像前置，不关闭业务Workflow、真实Temporal服务停机、数据库/网络/双Worker、交易/日终、备份、Ubuntu或用户验收。


2026-10-07 P5真实Temporal服务停机恢复：在正式隔离Compose栈中先停止Temporal服务，再由Web创建normal Run `0871ddc3-9e7b-4669-b9c4-03a3182ecd31`；Platform真实记录该Run派发失败并NAK（停机时`redelivered=false`），随后重启同一Temporal容器/持久卷，原Run完成120项权威观察。normal/rejection/recovery浏览器矩阵1/1、同Run CLI/export和精确资源清理通过，外部行情/真实券商调用均为0。完整时间线及9项源码Hash见[真实Temporal停机恢复审计](../../evidence/audits/2026-10-07-v15-temporal-server-outage-e2e.md)。该工程子场景关闭；数据库瞬态错误、受限网络、多Worker、备份恢复、交易/日终、Ubuntu与当前范围人工验收仍开放，P5/V1不结项。


2026-10-07 P5受限网络恢复子场景：在随机隔离V1.5 Compose项目中，normal Run `c29b544c-824c-4518-ba88-48d204fc8873`执行期间仅断开Platform API容器与该项目网络3秒，再按原服务别名接回；同一Run完成120条权威观察，Web/CLI/export及精确资源清理通过，外部来源/真实券商调用0。时序与源码Hash见[受限网络恢复审计](../../evidence/audits/2026-10-07-v15-network-outage-e2e.md)。这是固定脚本网络恢复子场景，不证明依赖专属分区、双Worker、备份恢复或其它P5门禁；整项保持未完成。


2026-10-07 P5数据库边界重试后的完整代码门禁：`pnpm verify:stage -- --stage V1.5 --suite code`在当前树exit 0；Platform 55文件/241单测、Python Worker 14/14及规定构建、类型、契约、Fixture和服务测试通过。原始日志、logHash与源码Hash见[数据库边界重试后代码套件审计](../../evidence/audits/2026-10-07-v15-database-retry-code-suite.md)。PostgreSQL进程停机恢复的两次注入未观察到可核验的Repository失败/NAK，不计为通过；仅仓储边界确定性瞬态错误/真实JetStream redelivery子项有证据。实际DB进程恢复、多Worker、业务调度、备份、Ubuntu和人工签署仍开放。


2026-10-07 P5 PostgreSQL backend会话恢复与全套回归：初次真实连接故障注入发现终止Platform空闲后端会话可使进程退出，定位为pg-pool idle client error事件未监听；Platform现在安装脱敏错误监听，避免无Promise捕获的pool错误变为进程级未处理事件。修正后的隔离E2E在Run派发后终止3个`platform_api`会话，观察Platform继续可用、新会话恢复、同Run完成120项及Web/CLI/export/精确清理通过；机器时序见[PostgreSQL会话恢复审计](../../evidence/audits/2026-10-07-v15-database-connection-drop-e2e.md)。本轮完整V1.5 code suite exit 0（Platform 55文件/241测试、Python Worker 14/14），[日志与源Hash](../../evidence/audits/2026-10-07-v15-database-recovery-code-suite.md)。PG server健康保持正常，这不是整库停机恢复；多Worker/完整P5、Ubuntu和人工验收仍开放。

2026-10-07 P5双Worker幂等竞争复验：随机隔离项目`sq-v15-e2e-fa7a296744f0637bfd1d`启动两个Platform Worker，各订阅独立JetStream durable；同一normal TestRun `7e0744ff-af77-4a00-bcd1-c931ebd29076`在两边的ack floor均到1，日志实际记录稳定Temporal Workflow ID已启动，120项CN/US权威观察仅产生一个完成结果，normal/rejection/recovery浏览器与同Run CLI/export通过，容器/卷/网络/镜像清理为0残留。机器时间线/源码Hash见[双Worker E2E](../../evidence/audits/2026-10-07-v15-multiworker-e2e.md)。第一次尝试浏览器流程通过后因Harness多Worker模式落入默认NATS停机注入而失败；修正后复跑通过，失败范围和资源清理记于[首次尝试记录](../../evidence/audits/2026-10-07-v15-multiworker-first-attempt-failure.md)。此证据关闭双Consumer同事件/稳定Workflow启动幂等子项，不代表双Worker故障切换、自动交易/结算、UNKNOWN、备份、Ubuntu或完整P5通过。

2026-10-07 P5多Worker变更后代码门禁：`pnpm verify:stage -- --stage V1.5 --suite code`当前树再运行exit 0；Platform 55文件/241测试、Python Worker 14/14。原始日志及源码Hash见[本轮完整代码套件](../../evidence/audits/2026-10-07-v15-multiworker-current-code-suite.md)。


2026-10-07 P5 PostgreSQL进程故障恢复：初次故障注入暴露三个依赖服务未处理idle pool错误会退出；失败事实保留于[首次尝试记录](../../evidence/audits/2026-10-07-v15-database-outage-first-attempt-failure.md)。补入脱敏pool错误监听和有界Activity重试后，隔离E2E真实终止数据库进程、恢复同容器/卷，观察同序号NAK/重投/ACK及原Run完成120项权威读取；Web矩阵、同Run CLI/export、精确清理均PASS。详见[数据库故障审计](../../evidence/audits/2026-10-07-v15-database-outage-e2e.md)。此项仅关闭V1.5隔离栈进程故障子场景，不覆盖备份恢复、主机/卷故障、交易/日终或多Worker故障切换，P5/V1仍未完成。


2026-10-07 P5 PostgreSQL进程恢复后的代码与版本门禁：V1.5完整`pnpm verify:stage -- --stage V1.5 --suite code`当前树exit 0，Platform 55文件/241项、Python Worker 14/14通过；原始日志、机器结果和六项源Hash见[代码套件审计](../../evidence/audits/2026-10-07-v15-postgres-process-recovery-code-suite.md)。V1版本Verifier重跑exit 2/INCOMPLETE，阶段文档5/5与证据290引用/13 Manifest/29条目/0失败；七个历史结构化Run导出仍缺，所有五阶段PARTIALLY_IMPLEMENTED，人工/目标环境及其余工程缺口仍未解决。机器门禁见[报告](../../evidence/audits/2026-10-07-v1-plan-gate-after-postgres-outage.md)。


2026-10-07 P5配对备份工具合同回归：`pnpm test:cluster-paired-backup` 5/5、`pnpm test:backup-scheduled` 8/8、`pnpm test:backup-retention` 3/3，共16项通过；日志、JSON与当前源码Hash见[备份工具合同测试审计](../../evidence/audits/2026-10-07-v1-p5-backup-tool-contract-tests.md)。这是离线单元/合同检查，不是V1多域备份或隔离恢复证据；FakeBroker、NATS/Temporal状态、Artifact卷、目标Ubuntu和恢复后账本/Run核对仍未通过，P5备份复选框保持未勾。


2026-10-07 P5 V1.5配对卷备份恢复子场景：normal/rejection/recovery Web矩阵及同Run CLI/export通过；停止随机隔离栈，归档完整PostgreSQL集群、NATS JetStream与Temporal SQLite三个卷，逐份记录SHA-256/字节数并恢复到新卷。恢复栈后同一Run `106bc868-2c7c-4b42-b58e-017b6ef9cd0d`的`V1.5-HOLD-002`保持PASS且120项权威观察仍在，整体check-only按契约返回2/WAITING；Temporal原Workflow仍COMPLETED，JetStream ackFloor/delivered均为1，克隆卷及项目资源精确清理。详情见[配对恢复审计](../../evidence/audits/2026-10-07-v15-paired-backup-restore-e2e.md)。这只关闭V1.5隔离栈卷子项，未覆盖V1.1–V1.4 Artifact文件卷、Ubuntu、异地备份或冻结RPO/RTO，P5父备份项仍未完成。首次模式断言/卷权限/退出码修复经过的失败记录分别见[首轮](../../evidence/audits/2026-10-07-v15-paired-backup-restore-first-attempt-failure.md)、[第二轮](../../evidence/audits/2026-10-07-v15-paired-backup-restore-second-attempt-failure.md)、[第三轮](../../evidence/audits/2026-10-07-v15-paired-backup-restore-third-attempt-failure.md)。


2026-10-07 P5配对恢复后的源码最终复验：默认丢ACK→同JetStream序号重投路径与PostgreSQL/NATS/Temporal三卷配对恢复模式分别PASS；前者确认原序号ACK丢弃后以相同序号redelivery并完成，后者恢复新卷后原Run仍有120项权威观察、Temporal Workflow仍COMPLETED、JetStream ackFloor/delivered仍为1。最终V1.5完整code suite exit 0（Platform 55文件/241项、Python Worker 14/14）。审计分别见[默认派发/重投E2E](../../evidence/audits/2026-10-07-v15-nats-temporal-dispatch-e2e.md)、[配对卷恢复E2E](../../evidence/audits/2026-10-07-v15-paired-backup-restore-e2e.md)、[最终代码套件](../../evidence/audits/2026-10-07-v15-final-recovery-code-suite.md)。V1.5仍PARTIALLY_IMPLEMENTED；配对恢复仅覆盖当前V1.5隔离栈，不关闭全V1备份父项、Artifact卷、宿主/异地恢复、交易/日终或人工/Ubuntu门禁。

门禁刷新：新增本轮验收引用后，`node scripts/verify-version.mjs --version V1`于2026-10-07重跑exit 2/INCOMPLETE；阶段文档5/5、证据审计290引用/13 Manifest/29条目/0失败，七个历史结构化Run导出仍缺。机器结果见[V1门禁快照](../../evidence/audits/2026-10-07-v1-plan-gate-after-v15-backup.md)。


2026-10-07 P5单Worker故障切换子场景：隔离Harness使用两个独立JetStream durable；同一Run在两边均收件后立即终止主Platform/API容器，备用Worker经Temporal稳定Workflow ID启动CN_A Activity并ACK stream sequence 1，重启主API后同Run完成120项权威观察。三场景浏览器、同Run CLI/export及随机容器/卷/网络/镜像精确清理通过；外部来源/真实券商调用0。机器时间线、Run ID与源码Hash见[故障切换审计](../../evidence/audits/2026-10-07-v15-worker-failover-e2e.md)。这是NO_TRADE单Worker失效子场景，不证明UNKNOWN订单处理、交易/日终Workflow、双Worker同时失效、主机/卷灾难恢复或目标Ubuntu；P5及V1仍未结项。故障切换后完整V1.5 code suite exit 0，Platform 55文件/241项、Python Worker 14项；详见[代码套件审计](../../evidence/audits/2026-10-07-v15-worker-failover-code-suite.md)。首次因Harness遗漏故障切换模式排除导致的附加默认断言失败已留档，不计为通过。

2026-10-07 P5单Worker故障切换后V1版本门禁：`node scripts/verify-version.mjs --version V1` exit 2/INCOMPLETE，阶段文档5/5 PASS，证据审计293引用/13 Manifest/29条目/0失败；五阶段均仍PARTIALLY_IMPLEMENTED，七个历史结构化Run导出缺失。机器门禁报告见[V1故障切换后快照](../../evidence/audits/2026-10-07-v1-plan-gate-after-worker-failover.md)。

2026-10-07 P3 AUTO_POLICY切片后版本门禁：最新`node scripts/verify-version.mjs --version V1` exit 2/INCOMPLETE；五阶段文档结构5/5 PASS，证据引用294项、13份Manifest、29条目、0失败，七个历史Run结构化导出仍缺。机器结果见[门禁JSON](../../evidence/audits/2026-10-07-v1-gate-after-auto-execution-application-service.json)。这次门禁只证明引用与文档结构可核验，未关闭P1～P6及版本人工/Ubuntu验收。

2026-10-07 P3 MANUAL_APPROVAL协调应用服务切片：将已批准Proposal的TestRun/owner/account范围检查与稳定clientOrderId Trade命令从HTTP Controller提取至`v13-manual-execution`应用服务，通过Ports注入隔离仓储/客户端并使用TestRun Clock；新增5项单测。受控`pnpm verify:stage -- --stage V1.3 --suite code` exit 0（Platform 57文件/251项、Research Automation 38文件/218项、Python Worker 14项）；专用L08失败注入下完整V1.3隔离Web/API/CLI矩阵21/21通过，覆盖CN及US人工审批交易、拒绝与恢复，项目`sq-v13-web-744dd2157453d3959821`的容器/卷/网络精确清理通过。代表Run：CN `8dd89ce2-0cfa-40ea-84c2-12a873d54762`、US `6ea221bf-02af-421c-a0ed-889d433b356c`。首次受限shell code suite因无权访问Docker daemon退出2，随后确认锁定镜像原已存在并在受控访问下原命令通过，未拉取/重建镜像。审计、原始E2E日志及源码Hash见[MANUAL应用服务审计](../../evidence/audits/2026-10-07-v13-manual-execution-application-service.md)与SHA清单。Proposal/审批、sequenced fill/cancel等协调仍未全部提取，P3/V1开放，人工结论保持NOT_RUN。

2026-10-07 P3 MANUAL应用服务切片后版本门禁：`verify-version --version V1` exit 2/INCOMPLETE；阶段文档结构5/5 PASS，295项证据引用、13份Manifest、29个条目、0失败，七个历史TestRun导出仍缺。机器结果见[门禁JSON](../../evidence/audits/2026-10-07-v1-gate-after-manual-execution-application-service.json)。

2026-10-07 P3治理协调器最终代码快照：在AUTO_POLICY执行、已批准MANUAL执行后，再将MANUAL提案批准/拒绝的TestRun/owner/version/hash/reason检查与Governance调用抽至第三个Platform application service；三服务共15项定向单测通过。最终树`pnpm verify:stage -- --stage V1.3 --suite code` exit 0（Platform 58文件/256项、Research Automation 38文件/218项、Python Worker 14项），完整隔离Web/API/CLI矩阵21/21通过；同Run CN/US MANUAL交易、审批拒绝/版本冲突、AUTO_POLICY、T+1、UNKNOWN、成交/撤单跨重启和Outbox重试均核验，且清理通过。源码、最终完整日志、代表Run和Hash见[治理应用服务最终审计](../../evidence/audits/2026-10-07-v13-governance-application-services.md)。sequenced fill/cancel与其余控制器协调、P3全市场验证、交接及人工验收仍未完成。

2026-10-07治理协调器最终快照V1门禁：版本仍exit 2/INCOMPLETE；五阶段结构5/5 PASS，296项证据引用、13份Manifest、29条目、0 Hash/路径失败；五阶段当前状态均未达到正式PASS，七个历史结构化TestRun导出及计划剩余包保持开放。报告：[V1门禁JSON](../../evidence/audits/2026-10-07-v1-gate-after-governance-application-services.json)。

2026-10-07 P3追加修订协调切片：Proposal append-only revision的owner/TestRun/expectedVersion/contentHash/expiry/operation/legs/reason校验及注入Clock现也从HTTP Controller抽至第四个应用服务，经生成Governance客户端提交，新增定向单测5/5。包含此切片的完整当前V1.3 code suite exit 0（Platform 59文件/261项、Research Automation 38文件/218项、Python Worker 14项），正式隔离Web/API/CLI矩阵21/21通过，覆盖浏览器修订和旧版本409、CN/US交易及Recovery；项目`sq-v13-web-a46db33ba34a8c1d1377`精确清理通过。最终源码和完整日志见[修订协调审计](../../evidence/audits/2026-10-07-v13-governance-coordination-after-revision.md)。L07/L08专用协调仍部分留在Controller；P3其它规则、完整交付及用户验收保持未完成。

2026-10-07本轮修订协调后的V1版本门禁：`verify-version --version V1` exit 2/INCOMPLETE，阶段文档5/5 PASS，证据引用298项、13份Manifest、29个条目、0路径/hash失败；五阶段均仍未正式通过。机器结果见[门禁JSON](../../evidence/audits/2026-10-07-v1-gate-after-proposal-revision-coordination.json)。

2026-10-08 P3刷新恢复缺陷修复与复验：逐项截图发现V1.3完成交易后刷新会恢复Run/账户/Proposal/Mandate，却遗漏已持久订单显示；Web现在在同Run/Proposal范围按固定MANUAL/AUTO `clientOrderId`读取并恢复订单、Fill、Outbox和reconciliation，normal MANUAL及L04 AUTO浏览器场景均验证刷新后FILLED/精确现金与MATCH。专用L08故障注入配置下固定Web/API/CLI矩阵21/21通过（21项各自同Run check-only/export；外部行情和真实券商调用0；Harness精确清理），V1.3完整code suite在随后增加PostgreSQL竞态覆盖后再次exit 0（含固定Digest、network=none的Python Worker）。新增FakeBroker隔离PG路径覆盖“撤单请求持久后，累计全额Fill先到、接受撤单结果后到”，序号1/2归约为FILLED且总成交100，事件数/订单终态断言通过。完整代码门禁及专项运行日志见[最终代码套件](../../evidence/audits/2026-10-08-p3-v13-final-code-suite-after-security-guard.log)和[竞态复验](../../evidence/audits/2026-10-08-p3-v13-late-fill-cancel-race-rerun.log)；最终日志/逐文件截图Trace哈希见[刷新恢复复验审计](../../evidence/audits/2026-10-08-p3-v13-fixture-and-handoff.md)；首次未开L08专用注入开关的失败运行及刷新前截图仍保留。P3仍有未建模订单故障边界/完整市场规则、可执行Ubuntu手册、人工验收；P1仍受OD-013治理和活动存储切换前置阻挡。按队列继续完成P3剩余边界盘点及可独立工程项，不将本矩阵扩写为阶段或版本PASS。

2026-10-08刷新恢复/迟到成交竞态切片后版本门禁：`node scripts/verify-version.mjs --version V1` exit 2/INCOMPLETE；阶段文档结构5/5 PASS，313项证据引用、15份Manifest、113条目、0路径/Hash失败。当前未关闭结构化历史导出的原Run为V1.2 `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`及V1.5 `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`；新Run不能替代。完整门禁快照见[报告](../../evidence/audits/2026-10-08-v1-gate-after-v13-final-rerun.log)。

2026-10-08 P1 Artifact盘点复核：新V1.3 frozen fixture是仓库输入，不是共享内容存储的动态producer；订单、Fill、账户/账本仍由领域服务持有，无新删除通道。OD-013仍OPEN，活动DB+Artifact配对备份/恢复、维护窗口、责任人和非终态Run处置仍无获批执行输入，故不更改/清理活动数据。最新盘点见[审计](../../evidence/audits/2026-10-08-p1-artifact-inventory-recheck.md)。

2026-10-08 PAPER/FAKE边界断言后的复核：治理内部Proposal HTTP新增LIVE/REAL拒绝且无仓储副作用断言，随V1.3完整code suite exit 0；完整21/21 Web矩阵和刷新后订单恢复结果未受测试层变更影响。`docs:check` 5264条本地链接0失败，`git diff --check`通过。V1版本Verifier仍exit 2/INCOMPLETE，阶段结构5/5、318项证据引用/14份Manifest/71条目/0路径Hash失败；四个V1.2/V1.5历史Run导出缺口未由新证据替代。报告见[最新门禁](../../evidence/audits/2026-10-08-v1-final-gate.log)。

2026-10-08 V1.4兼容回归（V1.3修复后）：V1.4当前代码套件exit 0；隔离PostgreSQL/Quant/Platform/Web/CLI E2E 5/5通过，8个浏览器TestRun同Run CLI核验，项目`sq-v14-backtest-294b128079abc876ecf3`的容器/卷/网络精确清理通过。E2E日志SHA-256 `f320aab84d4f8a3fcec1a9e01011dc1f570d611297e3228e281e44d930fe04bb`，代码套件日志SHA-256 `94624062481986b73febfed24fea656604348768f90d75d93735aea99e264ab0`。`docs:check` 5269条本地链接0失败；最新V1门禁exit 2/INCOMPLETE，阶段结构5/5、319项证据引用/14份Manifest/71条目/0路径Hash失败。门禁、链接检查原始结果分别见[V1门禁复跑](../../evidence/audits/2026-10-08-v1-gate-after-v14-rerun.log)及[文档检查](../../evidence/audits/2026-10-08-docs-check-after-v14.log)。该回归只证明V1.3变更未破坏V1.4固定兼容场景；不关闭P3/P4、历史Run、人工或Ubuntu缺口。

2026-10-08 P3订单故障边界盘点：逐项回看L06–L10固定Web矩阵、Trade隔离PostgreSQL顺序归约/撤单/Outbox测试及其证据，确认已有覆盖范围包括UNKNOWN原单查询、乱序/重复/冲突/累计回退/超量、撤单竞争与资源释放、固定Outbox失败重试、独立FakeBroker对账和刷新读取；不将其外推为任意故障组合或真实市场规则验证。发现的下一项可独立工程审查是L07/L08事件协调仍位于Platform HTTP模块，需先按领域边界确认应用服务职责再决定是否提取。盘点见[P3订单边界审计](../../evidence/audits/2026-10-08-p3-order-boundary-inventory.md)。本次仅审计，未新增测试/改业务代码，P3保持开放。

2026-10-08 P3边界盘点后文档/版本门禁：最终`pnpm docs:check`检查5283条本地Markdown链接、0失败；`git diff --check`通过。`node scripts/verify-version.mjs --version V1`仍exit 2/INCOMPLETE，阶段结构5/5、319项证据引用/14份Manifest/71条目/0路径或Hash失败；历史导出、五阶段工程退出项、人工验收与Ubuntu要求仍开放。原始结果及日志SHA见[文档检查](../../evidence/audits/2026-10-08-docs-check-final-current.log)和[版本门禁](../../evidence/audits/2026-10-08-v1-gate-after-p3-boundary-review.log)。

2026-10-08 P3 sequenced Fill协调抽至应用层：新增`V13SequencedFill`流程及4项定向用例；Platform完整单测60文件/265项、typecheck通过，V1.3完整代码套件受控重跑exit 0。固定Web/API/CLI矩阵21/21，逐Run CLI只读检查与结构化导出通过，真实券商/外部来源调用0、Harness精确清理通过。受限默认环境的镜像访问/socket失败保留后，以仓库锁定镜像和随机隔离Harness成功复验；记录和SHA详见[应用服务审计](../../evidence/audits/2026-10-08-p3-v13-sequenced-fill-application-service.md)。L07/L08撤单控制仍需审查/提取；P3及V1其余门禁不变。

2026-10-08 P3 L07/L08撤单协调提取完成：Sequenced Fill、L07撤单请求/结果、L08部分成交撤单、HELD资源时序及最终Run投影检查现均在Platform `V13SequencedFill`应用服务内，Controller仅处理身份和HTTP适配；应用服务定向用例7项，Platform全量单测60文件/268项、typecheck通过。V1.3完整`--suite code`受控运行exit 0，隔离Web/API/CLI矩阵21/21通过，每项同Run CLI check-only/export成功、外部来源/真实券商0、容器/卷/网络精确清理。完整结果见[最新应用服务审计](../../evidence/audits/2026-10-08-p3-v13-sequenced-fill-application-service.md)、[代码套件日志](../../evidence/audits/2026-10-08-p3-v13-order-coordination-application-services-code-suite.log)与[E2E日志](../../evidence/audits/2026-10-08-p3-v13-order-coordination-application-services-e2e.log)。Harness截图目录复用问题已修为每个隔离项目唯一目录；本轮21 PNG/21 Trace SHA清单见[截图证据](../../evidence/audits/2026-10-08-v13-browser-captures-order-coordination.sha256)。旧刷新修复轮清单因此前目录被复用覆盖而留存为失配的历史快照，不计入当前证据；该证据保留事故已登记在应用服务审计。上述仅关闭应用分层切片和当前固定矩阵回归，不关闭P3全市场规则、用户/Ubuntu验收或P1/P2/P4/P5/P6。

2026-10-08 L07/L08协调提取及Paper/Fake边界增量后的文档/版本门禁：最终`pnpm docs:check`检查5315条本地Markdown链接、0失败，`git diff --check`通过；`node scripts/verify-version.mjs --version V1`仍exit 2/INCOMPLETE，阶段文档5/5 PASS，证据引用328项/15份Manifest/113条目/0路径Hash失败。门禁日志SHA-256 `17d9c20f033b19f3ab6ccd4e2af17acc0b8bb3b7259093d690fe5a7890ce24f7`，文档检查日志SHA-256 `9215399f17e7425b3c2a07fd9b27c355534e56912ec3a8a6aae561acf63e6eea`。原始结果见[最终文档检查](../../evidence/audits/2026-10-08-docs-check-final-after-order-coordination.log)和[最终版本门禁](../../evidence/audits/2026-10-08-v1-gate-final-after-order-coordination.log)。旧刷新修复轮截图Hash失配已明确列为历史执行快照并从活动manifest检查排除；当前完整21项截图/Trace使用独立目录和Hash清单。仍不能替代四个历史Run导出、五阶段工程退出项、人工验收或Ubuntu证据。

2026-10-08 共享Platform变更后的P4/P5兼容回归：V1.4完整code suite exit 0，隔离Web/API/CLI E2E 5/5及8个浏览器Run同Run核验通过、项目资源清理通过；代码与E2E日志Hash分别为`f9b8dfe67d982f3b4ab642f203fe64fd6c0fa0066583284824de8adad20b288f`及`f964c45475c377806baf94abbc91f7214a2cea51050e837cc7d20eb6c009ba91`。V1.5完整code suite exit 0；NO_TRADE normal/rejection/recovery Web/API/CLI E2E 1/1通过，60+60冻结Session权威观测、每个Run同Run CLI/export及精确Compose清理通过；外部来源与真实券商调用0。代码与E2E日志Hash分别为`ee3db75f0fb0b48cdd4f8e5daf619a93db3d7cfe758dff9e4bb00d9830c381b7`及`5aae7c39260d59ac51b29cd6dc69848def760ff1425fc2f3bd29bc1b9f35a96b`。完整原始证据见[V1.4代码套件](../../evidence/audits/2026-10-08-p4-v14-after-order-coordination-code-suite.log)、[V1.4 E2E](../../evidence/audits/2026-10-08-p4-v14-after-order-coordination-e2e.log)、[V1.5代码套件](../../evidence/audits/2026-10-08-p5-v15-after-order-coordination-code-suite.log)、[V1.5 E2E](../../evidence/audits/2026-10-08-p5-v15-after-order-coordination-e2e.log)。这是共享源码变更后固定范围兼容复验，不关闭P4完整Paper规则差异、P5交易/日终工作流或全V1备份/目标环境验收。

2026-10-08 P3 PAPER/FAKE服务端边界增量：扩大Portfolio隔离HTTP/PostgreSQL smoke，对LIVE/FAKE、PAPER/REAL、LIVE/REAL各拒绝403且无账户副作用；Trade V1.3手工执行端点拒绝附加LIVE/REAL字段422且不产生订单；Governance Proposal API对同三组合422且无仓储副作用。完整V1.3 code suite exit 0；单轮隔离Web/API/CLI矩阵21/21通过，容器/卷/网络精确清理，真实券商/外部源调用0；42份逐场景PNG/Trace清单Hash为`53239d6e0d365f6d3915d9b3ef99faec547bacfc9969340ac56e1e2b92861aa6`。当前高风险入口结果与限制见[边界审计](../../evidence/audits/2026-10-08-p3-paper-fake-server-boundary.md)，code suite完整日志SHA-256为`445546fc0ef4b94d0b6c2c30ad5f54a53d7ffe2be5b7ecd89cb40096c0698e68`。V1.3全服务所有接受路径仍需按交易/回测用途完成清单；不勾选阶段安全父项，也不把合法BACKTEST+FAKE路径误判为LIVE能力。

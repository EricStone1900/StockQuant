2026-10-10最新正式V1门禁a626：五阶段文档与证据审计PASS（1368引用、199份Manifest、338项），V1仍INCOMPLETE/exit 2。V1.4锁跌停SELL真实持仓/预留拒绝释放子项通过，四个历史Run结构化导出、OD-013/014与旧Run处置、剩余工程及恢复/环境验证和本人验收仍开放。[a626日志](../../../evidence/audits/2026-10-10-v1-version-gate-a626.log)、[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a626.log.sha256)。

2026-10-10当前正式门禁a582：V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`；五阶段文档审计PASS，证据审计PASS（1257引用、172份Manifest、311项）。V1.4浏览器正常/拒绝/刷新恢复7/7、当前完整code suite、ARM64容器Web和全仓基线均通过；仍缺4个历史Run导出、OD-013/014与旧Run决定、活动/全域恢复、Mac睡眠唤醒、Ubuntu实机及当前范围本人验收。[a582门禁](../../../evidence/audits/2026-10-10-v1-version-gate-a582.log)，[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a582.log.sha256)。
2026-10-10最新正式门禁a351：五阶段结构文档审计PASS，证据审计PASS（900引用、121份Manifest、260项），V1仍INCOMPLETE/exit 2；四个历史TestRun导出、OD-013/OD-014与旧Run决定、全V1业务恢复、Ubuntu实机及人工验收仍未满足。[a351日志](../../../evidence/audits/2026-10-10-v1-version-gate-a351.log)，[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a351.log.sha256)。

2026-10-10最新正式门禁a350：五阶段结构文档审计PASS，证据审计PASS（896引用、120份Manifest、259项），V1仍INCOMPLETE/exit 2。四个历史TestRun导出、五阶段交付关闭、OD-013/OD-014与旧Run决定、全V1业务恢复、Ubuntu实机和当前范围人工验收仍未满足。[a350日志](../../../evidence/audits/2026-10-10-v1-version-gate-a350.log)，[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a350.log.sha256)。

2026-10-10文档同步后正式门禁a349：五阶段结构审计PASS，证据审计PASS（892引用、119份Manifest、258项），V1仍INCOMPLETE/exit 2。[a349日志](../../../evidence/audits/2026-10-10-v1-version-gate-a349.log)，[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a349.log.sha256)。阻塞项与上一轮一致：4个历史TestRun缺结构化导出，五阶段工程/交付及当前范围人工验收未关闭，OD-013/OD-014和旧Run处置未决，全V1业务数据恢复与目标Ubuntu证据未完成。

2026-10-10最新正式门禁a348：五阶段结构文档审计PASS，证据审计PASS（888引用、118份Manifest、257项），V1仍INCOMPLETE/exit 2。V1.3 Mandate激活/暂停模式拒绝补充及完整22项E2E、代码套件已验证；四个历史TestRun结构化导出仍缺（V1.2一个、V1.5三个），OD-013/OD-014、旧Run处置、全V1业务恢复、Ubuntu实机和当前范围人工验收仍开放。[a348日志](../../../evidence/audits/2026-10-10-v1-version-gate-a348.log)，[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a348.log.sha256)。

2026-10-09最新正式门禁a290：阶段文档审计PASS（5阶段）、证据审计PASS（765引用、106份Manifest、245项），V1仍INCOMPLETE/exit 2。4个历史TestRun结构化导出、OD-014/旧记录处置决定、完整V1业务恢复、Ubuntu实机、阶段剩余工作及当前范围人工验收仍未满足。[门禁日志](../../../evidence/audits/2026-10-09-v1-version-gate-a290.log)，[SHA-256](../../../evidence/audits/2026-10-09-v1-version-gate-a290.log.sha256)。

2026-10-09最新工程增量：V1.5运行历史比较见[§8.21](./05-scheduling-and-recovery.md#821-owner范围v15运行历史与并排比较2026-10-09)，Run能力阻塞显示见[§8.22](./05-scheduling-and-recovery.md#822-v15-run能力状态与明确阻塞显示2026-10-09)；两项均有完整代码套件与隔离浏览器E2E证据，但告警Incident接入、父需求和阶段验收仍OPEN。最近正式门禁a287为INCOMPLETE/exit 2；下一轮门禁在本轮文档收尾后复核。

2026-10-09当前复核：五阶段代码套件及限定隔离Web/API/CLI回归已记录，详见[本轮运行记录](../../../evidence/audits/2026-10-08-v1-development-run.md)。V1.5已有NO_TRADE、AUTO交易、CN/US拒绝、UNKNOWN原单查询恢复、错过窗口次日重评估和Trade进程/备用实例原单恢复切片；三日Fixture两次交易、逐日对账及逐Fill Web追溯选择均经E2E验证。最新AUTO撤单竞态已实际覆盖FakeBroker部分Fill、序号化撤单和Portfolio余量释放（见§8.19.4）；更广泛多Worker故障切换、真实市场日历/结算和全V1业务数据配对恢复仍未完成。备份器十个服务数据库/角色及合成Artifact恢复结构复验通过，但不包含真实业务Run账本；Mac ARM64上的linux/amd64构建仿真不能替代Ubuntu实机。五阶段保持PARTIALLY_IMPLEMENTED，当前版本门禁INCOMPLETE。历史TestRun导出、阶段交付、OD-014与结算、全V1恢复、目标Ubuntu及新增范围用户验收仍阻止V1收尾；正式门禁[a286](../../../evidence/audits/2026-10-09-v1-version-gate-a286.log)阶段文档与证据审计均PASS（747引用、100份Manifest、239项），但整体INCOMPLETE/exit 2。未新增人工签署。历史PASS仅适用当时范围。

2026-10-09 P5/A11补充：V1.5实际Web TestRun所在隔离栈现已将PostgreSQL、NATS、Temporal和Artifact四卷在同一停止点恢复至新卷，恢复后原Run/Workflow/JetStream ACK与合成ArtifactRef/content SHA匹配；此项不替代V1.1～V1.4真实Artifact配对、生产备份/调度、Ubuntu、异地/RPO/RTO及当前人工验收，版本仍不关闭。详见V1.5 [§8.9.1](./05-scheduling-and-recovery.md#891-四卷同点恢复增量2026-10-09)。

## 1. 目标和范围

在 Mac M1 上使用小样本与真实 Qlib，完成双市场确定性模拟闭环及可长期保留的 Web 验收中心。A股为主要交互路径，美股用明确的 Fixture 验证完整基础链路。

对应原 D0～D4 与 R0 的交付方向；V1.2 提前做 RD-Agent 环境探针，完整研究功能留在 V3。所有 brokerMode=FAKE；不接真实券商。

## 2. 数据与环境

A股10～20只股票、建议1～2年日线，至少覆盖因子预热窗口；美股3～5只及独立夏令时/结算样本。另有手算小样本、历史退市/公司行动和缺失状态样本。合成数据统一标 FIXTURE/SIMULATION_ONLY，不作为收益有效性证据。

Mac M1优先Linux ARM64容器，先验证依赖再承诺原生支持。Linux AMD64作为目标Ubuntu为x86时的验证平台，Ubuntu ARM64则按实际目标调整。按[共同规则](../05-three-version-delivery.md)分别记录本地、模拟架构及真实Ubuntu证据。Web开发服务器可原生热更新，阶段验收必须覆盖容器服务。

## 3. 阶段顺序

| 阶段 | 交付 | 依赖 | 状态 |
|---|---|---|---|
| [V1.1](./01-environment-and-web-center.md) | 环境、账户初始化与 Web 验收中心 | 本文件前置条件；详细依赖见阶段文件 | PARTIALLY_IMPLEMENTED（V1.1完整code suite当前树exit 0（脚本66/66、Portfolio 7单测、Platform 324单测）；隔离Web/API/CLI normal/rejection/recovery 3/3；六类核心Schema及8个服务类型副本字段/required性检查、Portfolio三Caller独立token检查通过；Platform API ARM64原生与AMD64仿真探针通过。跨服务消费者/发布矩阵、活动API切换/回退、RUNNING/WAITING旧记录处置、Ubuntu及当前范围人验仍未完成。详见[V1.1 §8.30](./01-environment-and-web-center.md#830-portfolio-risk调用身份密钥必须互异2026-10-10)及[最近code suite](../../../evidence/audits/2026-10-10-v11-portfolio-distinct-identities-code-suite-a01.log)。) |
| [V1.2](./02-small-data-and-qlib.md) | 小样本数据、真实 Qlib 与环境探针 | V1.1；详细依赖见阶段文件 | PARTIALLY_IMPLEMENTED（当前研究输入为不可变v1.2-market-data-5，显式市场会话日历与整市场缺日失败关闭见§8.41；Platform→Quant预览读合同见§8.43、Platform→Market Data research-preview消费者合同见§8.44。完整V1.2 code suite最新exit 0（Platform 324/324），锁版Qlib 0.9.6、隔离PostgreSQL/迁移、Market Data Artifact恢复与四个Web/API/CLI same-TestRun场景通过；隔离资源清理验证。历史TestRun `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`结构化导出、新增范围人工验收及Ubuntu实机复核仍未完成。详见[阶段验收与执行记录](./02-small-data-and-qlib.md#844-platformmarket-data双市场研究fixture读取合同2026-10-10)及[最新完整代码套件](../../../evidence/audits/2026-10-10-v12-market-research-preview-contract-code-suite-a01.log)。) |
| [V1.3](./03-fake-broker-trading-loop.md) | 治理、风控与模拟券商完整交易链路 | V1.2；详细依赖见阶段文件 | PARTIALLY_IMPLEMENTED（最新完整code suite exit 0；当前Platform 66文件/324测试、Governance 8文件/43测试、Portfolio 7单测、Trade 98测试；共享Schema变更后Web/API/CLI/export 27/27（§8.67）；27路由身份矩阵、模式注入拒绝、固定故障/恢复与双市场AUTO子场景有证据；Governance准入路由21项身份/method策略、83个HTTP拒绝探测及Platform caller必填、Portfolio caller token互异回归见§8.73–8.75。新增范围人工验收、完整市场/结算规则、未覆盖交易故障组合及Ubuntu交付仍开放。详见[阶段文件](./03-fake-broker-trading-loop.md)与[最近Portfolio caller回归](../../../evidence/audits/2026-10-10-v13-portfolio-distinct-identities-code-suite-a01.log)。) |
| [V1.4](./04-daily-backtest.md) | 日线历史回测与可核对报告 | V1.3；详细依赖见阶段文件 | PARTIALLY_IMPLEMENTED（当前树完整code suite、随机隔离PostgreSQL/Quant/Web/CLI持久任务及浏览器7/7通过；正式页拒绝场景显示未来成交/T+1原因、不发布报告并同Run CLI核对，刷新后恢复同一TestRun；ARM64容器化Web构建/启动与资源清理通过。T+1、结算、公司行动与AAPL持久FakeBroker BUY/SELL仅覆盖固定Fixture切片；冻结停牌/涨停BUY与锁跌停SELL经Governance授权、Trade Paper HTTP拒单和幂等重放；新双会话Fixture使锁跌停SELL绑定真实29股持仓与Portfolio Reservation，拒单释放预留且Portfolio/FakeBroker账本不变（§8.77、完整code suite a05）。全市场适用规则、Qlib/Paper逐规则账本一致性、真实费税/日历、完整恢复、当前范围人验仍未完成。详见[§8.77](./04-daily-backtest.md#877-冻结市场限制fixture贯通trade-paper拒绝路径2026-10-10)、[a05 code suite](../../../evidence/audits/2026-10-10-v14-sellable-position-locked-sell-code-suite-a05.log)、[Web兼容E2E](../../../evidence/audits/2026-10-10-v14-market-restrictions-paper-web-e2e-a01.log)。) |
| [V1.5](./05-scheduling-and-recovery.md) | 无人逐笔操作、故障恢复与 V1 验收 | V1.4；详细依赖见阶段文件 | PARTIALLY_IMPLEMENTED（固定双市场AUTO、真实NATS/Temporal、暂停/UNKNOWN/重投/撤单及双账本对账有隔离Web/API/CLI证据；双Trade与PostgreSQL中断后原单恢复E2E 3/3及完整code suite通过。真实日历/结算、外发通知、跨阶段成交追溯、Mac睡眠/唤醒、实际V1业务产物与同点NATS/Temporal/宿主恢复、Ubuntu及当前范围人验仍未完成；当前树全服务数据库/Artifact卷合成行隔离恢复及V1.2 Qlib ArtifactRef/字节配对复验已通过§8.40–§8.41，不替代这些范围。详见[阶段§8.31](./05-scheduling-and-recovery.md#831-trade双实例与postgresql同时中断后的原单恢复2026-10-10)。) |

以功能纵向切片交付；服务内部仍采用S0～S6生命周期。每阶段先冻结场景和预期，再同时开发后端与Web，执行自动检查后人工验收。后续独立工作可推进，但未通过的依赖不能被假成功替代。

## 4. 每阶段必交材料

- 任务清单及接口/数据/状态变更，更新的依赖锁、镜像与迁移。
- 正式功能页与验收中心场景：正常、拒绝/异常、重试/恢复中适用项。
- 固定数据和假依赖清单；实际组件与Fixture分开标记。
- 自动检查报告、浏览器截图、业务ID/Trace与人工签署。
- 运行/排错说明、已知限制、后续阶段所需契约和性能缺口。

## 5. 验收口径

本版各阶段[测试](./90-test-plan.md)和[验收](./99-acceptance.md)均需完成。流程成功、自动断言通过与人工批准分开保存。未跑、缺少数据/凭证/主机、观察期未满均保留NOT_RUN；业务不变量失败为FAIL。小数据通过只证明对应范围，不能推算全量性能或收益有效性。

## 6. 开发工作包约定

2026-10-08执行约束：以完成V1为基础，非必要不扩展功能或V2/V3新能力。新增工程切片必须关联本版既有必需要求、当前缺口及有限退出条件；允许复用已有后续版本组件、修复V1共享依赖及必要兼容回归，不据此增加后续版本能力。先核对当前要求/证据差异，再收尾基础、交易、回测、后台恢复及版本验收。原阶段范围与签署条件不因排期调整自动变化。

每次开始一个阶段，读取该阶段文件及共同规则，把复选任务作为本次边界。先确认已有工作区改动和依赖状态，按契约→最小后端→同步Web→异常→证据推进。不得仅搭空页面就报阶段完成；不得接入真实券商，也不得把假订单变成实际券商测试单。
W9版本门禁结构审计（2026-10-01）：当前验证还检查本版本阶段链接/第2、7、8节和共享需求追踪矩阵存在性；三版阶段结构均通过，但业务/观察/人工验收状态不因此改变。实现与范围见[W9结构门禁审计](../../../evidence/audits/2026-10-01-w9-stage-document-guard.md)及[代码SHA-256](../../../evidence/audits/2026-10-01-w9-stage-document-guard.sha256)。

2026-10-10最新正式版本门禁a323：V1仍`INCOMPLETE`/exit 2；五阶段结构审计PASS、证据审计PASS（804引用、107份Manifest、246项）。四个历史Run导出与其余工程/决定/环境/人工条件未关闭。详见[门禁日志](../../../evidence/audits/2026-10-10-v1-version-gate-a323.log)及[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a323.log.sha256)。

2026-10-10门禁a324（V1.3预算终态Web/API/CLI与code suite及交叉索引更新后）：V1状态`INCOMPLETE`/exit 2；五阶段结构审计PASS、证据审计PASS（810引用、109份Manifest、248项）。仍缺四个历史TestRun导出以及决定、迁移/恢复、Ubuntu和人工验收门槛。[日志](../../../evidence/audits/2026-10-10-v1-version-gate-a324.log)，SHA-256 `4d3c0974fb6a86d69cdfce593a2b3e9370b38b3113890ed7dc223d869c01efb9`。

2026-10-10门禁a325：V1整体`INCOMPLETE`/exit 2，五阶段结构审计PASS，证据审计PASS（813引用、110份Manifest、249项）。历史Run导出及外部决定/恢复/Ubuntu/人工验收门槛仍开放。[a325日志](../../../evidence/audits/2026-10-10-v1-version-gate-a325.log)，SHA-256 `358e4cd1b73dcf7ac6539b7f28426d1b82649f232600744d9cac7cebbf87a2a4`。

2026-10-10 W8 Ubuntu只读preflight：当前Mac ARM64宿主不是目标Ubuntu x86_64，容器运行时UNAVAILABLE、资源门槛和主机授权未确认；命令未连接外网或修改环境。该结果不能代替目标Ubuntu验证，详见[preflight报告](../../../evidence/audits/2026-10-10-w8-ubuntu-host-preflight-a01.log)。

2026-10-10最新门禁a326（Ubuntu环境只读preflight已记入后）：V1 `INCOMPLETE`/exit 2；结构审计PASS，证据审计PASS（817/111/250）。历史导出、负责人决定、活动数据恢复、目标Ubuntu和人工验收未完成。[a326日志](../../../evidence/audits/2026-10-10-v1-version-gate-a326.log)，SHA-256 `29af2c8df97be36492faff208a7398a8b9a62086a1717fc7bcfb2f045749db96`。

2026-10-10门禁a327：V1仍`INCOMPLETE`/exit 2；结构审计PASS、证据审计PASS（820/112/251）。四个历史Run结构化导出、负责人决定、活动存储维护/恢复、Ubuntu实机及当前范围人工验收仍未完成。[a327日志](../../../evidence/audits/2026-10-10-v1-version-gate-a327.log)，SHA-256 `9cea4bb914f23afdb91c0a867747d1c4dcf70053b6bcd92dfc103f5ff980c0e3`。

2026-10-10最新门禁a328：文档结构审计PASS、证据审计PASS（822/112/251），V1仍`INCOMPLETE`/exit 2；历史导出与决定、环境、人工验收门槛未变化。[a328日志](../../../evidence/audits/2026-10-10-v1-version-gate-a328.log)，SHA-256 `e9cdcba42a1854c9a054e430d38550829bbb95d4212591caeddebb05c764a119`。

2026-10-10共享Platform API预算读回变更后的跨阶段代码兼容复验：V1.1/V1.2/V1.4/V1.5完整code suite均exit 0；V1.2四Run Web/API/CLI/export与锁版Qlib Worker、V1.4 Artifact fencing及V1.5 Incident隔离用例通过。对应运行记录见五阶段§8。此项仅为兼容回归，不改变任何阶段PARTIALLY_IMPLEMENTED状态或本次人工验收状态。

2026-10-10共享Platform/Web变更后的浏览器兼容复验：V1.1 normal/rejection/recovery 3/3、V1.4报告与限制/规则矩阵5/5、V1.5 normal/AUTO/rejection/recovery 3/3通过；V1.1/V1.4浏览器Run与V1.5四场景均由同Run CLI/export核对，随机资源清理通过。各项仅为兼容回归，不能替代阶段交付及人工验收。

2026-10-10最新门禁a329：文档审计PASS、证据审计PASS（829/112/251），V1仍`INCOMPLETE`/exit 2；四个历史Run导出、决定/活动恢复、Ubuntu实机和本人验收仍未满足。[日志](../../../evidence/audits/2026-10-10-v1-version-gate-a329.log)，SHA-256 `d222fcb2d9a4c394541acbbb971d67549c4458466d595938a01eee1afe9d000f`。

2026-10-10最新正式V1门禁a330：结构审计PASS、证据审计PASS（836/112/251），V1仍`INCOMPLETE`/exit 2；历史导出、决定/恢复、Ubuntu及本人验收仍开放。[a330日志](../../../evidence/audits/2026-10-10-v1-version-gate-a330.log)，SHA-256 `bd4fdb7a075181ec335d7d6a339656f889142055964c2517d7564cab14f9020c`。


正式V1门禁a331（V1.2追踪索引校准后）：五阶段结构审计PASS、证据审计PASS（838/112/251），整体仍`INCOMPLETE`/exit 2。历史Run导出、OD-014/旧Run处置、活动数据恢复、Ubuntu实机及人工验收保持OPEN/NOT_RUN。[a331日志](../../../evidence/audits/2026-10-10-v1-version-gate-a331.log)，SHA-256 `68d1742f0bac54c8cdd2913b7980d48d3a374fc33f19607391a6cc0537eb43ac`。


2026-10-10当前树工程基线`pnpm baseline:check`退出0；298 JSON、206 schema、50 Fixture、兼容矩阵、29生成器、34 Fixture文件、Artifact库、八服务分层及60项运维/门禁测试通过。该基础检查不等于V1各阶段验收或版本门禁通过，当前版本状态不变。[完整日志](../../../evidence/audits/2026-10-10-v1-current-tree-baseline-a01.log)，SHA-256 `ccdf50e40440f22948347fd332accf372f386110f426c82017fbea62fcc9b644`。


正式V1门禁a332（当前树基线记录后复核）：阶段文档审计PASS、证据审计PASS（842/112/251），整体`INCOMPLETE`/exit 2。全仓基线退出0不等于阶段完成；四个历史TestRun导出、待决结算与旧Run处理、活动数据完整恢复、Ubuntu以及本人当前范围验收仍未满足。[a332日志](../../../evidence/audits/2026-10-10-v1-version-gate-a332.log)，SHA-256 `2eb9a8441ff3e33f4da7b348b35b3e363e01e616f4db39748f61c0be93aab084`。


2026-10-10 V1.3 Governance历史回测授权模式拒绝增量见[阶段§8.47](./03-fake-broker-trading-loop.md#847-governance历史回测授权模式拒绝2026-10-10)：非法LIVE/REAL组合HTTP拒绝且隔离授权记录0，合法BACKTEST/FAKE保留，完整V1.3 code suite exit 0。全V1模式矩阵和阶段父项仍未完成。


正式V1门禁a333（本轮模式拒绝原子验证与文档更新后）：结构审计PASS、证据审计PASS（846/113/252），整体仍`INCOMPLETE`/exit 2。历史Run、待决结算/旧Run、活动恢复、Ubuntu及本人验收未完成。[a333日志](../../../evidence/audits/2026-10-10-v1-version-gate-a333.log)，SHA-256 `4622816719b6af691cb8d8c144dd37a7b12db592d64f4de821aa0985606fe9ef`。

正式V1门禁a334（V1.4回测创建入口模式拒绝证据同步后）：阶段文档审计PASS、证据审计PASS（851引用、114份Manifest、253项），V1仍`INCOMPLETE`/exit 2；历史Run、OD-014/旧Run处置、活动数据恢复、Ubuntu及本人验收未完成。[a334日志](../../../evidence/audits/2026-10-10-v1-version-gate-a334.log)，SHA-256 `945ad2e3447ece3008edb0dd9ec1437e3714b921d16f953d254e06f99688f9a2`。

正式V1门禁a335（当前V1.4阶段、进度和验收记录复核）：阶段文档审计PASS、证据审计PASS（853/114/253），V1仍`INCOMPLETE`/exit 2；历史Run、待决决定、活动恢复、Ubuntu和用户验收未完成。[a335日志](../../../evidence/audits/2026-10-10-v1-version-gate-a335.log)，SHA-256 `ba20fa3d9d1527847b6a6bb0cc94d814937e28d3d7cc95b9c30193864cd7e11e`。

正式V1门禁a340（活动运行时只读审计A02及Runbook同步后）：阶段文档审计PASS、证据审计PASS（858引用、115份Manifest、254项），V1仍`INCOMPLETE`/exit 2。A02确认活动legacy总数60、3条V1.1非终态不变和Artifact卷挂载漂移；活动切换、历史Run恢复、Ubuntu及当前范围人工验收未完成。[a340日志](../../../evidence/audits/2026-10-10-v1-version-gate-a340.log)，SHA-256 `7797fed729baa4c560362fd99a1c4e3edf71106025d9ed41545100ea07508944`。

2026-10-10 V1.2 TestRun模式边界子项已由当前树隔离E2E验证：四种客户端环境/券商模式注入均被服务端拒绝且无Run副作用，详见[阶段§8.33](./02-small-data-and-qlib.md#833-v12-testrun创建拒绝客户端交易模式注入2026-10-10)。此项仅更新自动工程证据，不改变V1.2 `PARTIALLY_IMPLEMENTED`或V1 `INCOMPLETE`状态。

2026-10-10门禁a342（V1.2 TestRun模式边界同步后）：五阶段文档审计PASS、证据审计PASS（867引用、115份Manifest、254项），V1仍`INCOMPLETE`/exit 2。四个历史Run结构化导出、业务/旧Run处置决定、活动存储与完整恢复、目标Ubuntu及本人当前范围验收未满足。[日志](../../../evidence/audits/2026-10-10-v1-version-gate-a342.log)，SHA-256 `b9b0932e7f8cc376282e2fbe469ef2669155a7f430a672023ba3d614fa27c54a`。

2026-10-10门禁a343（V1.2模式边界原子复核及交叉表更新后）：五阶段结构审计PASS、证据审计PASS（870引用、115份Manifest、254项），V1仍`INCOMPLETE`/exit 2。四个历史TestRun结构化导出、OD-014/旧Run处置、活动存储维护/完整恢复、Ubuntu实机与当前范围人工验收仍未满足。[日志](../../../evidence/audits/2026-10-10-v1-version-gate-a343.log)，SHA-256 `10928f284170b77a1852220171d949ccdc12e2eaa5b277e6c6dbea9d10c9a942`。

2026-10-10 V1.5 Platform TestRun模式边界已通过隔离HTTP/PostgreSQL和完整Web/API/CLI E2E验证；运行时白名单拒绝四种客户端环境/券商模式注入，且无TestRun副作用（[阶段§8.28](./05-scheduling-and-recovery.md#828-v15-testrun创建拒绝客户端交易模式注入2026-10-10)）。此自动子项通过不改变V1.5`PARTIALLY_IMPLEMENTED`或V1整体验收状态。

2026-10-10正式门禁a344：文档结构与证据审计PASS（876/116/255），但V1仍`INCOMPLETE`/exit 2。四个历史Run结构化导出、OD-014/旧Run处置、活动数据维护和完整恢复、Ubuntu实机及本人当前范围验收未关闭。[门禁日志](../../../evidence/audits/2026-10-10-v1-version-gate-a344.log)，SHA-256 `43b9ad50014657ee322a287befc2f260ccafc718add40ffcc3d72e0f39fbdac3`。

2026-10-10正式门禁a345：五阶段结构审计PASS，证据审计PASS（878/116/255），V1仍`INCOMPLETE`/exit 2。P0新增当前树交叉表审计发现精确测试名和来源锚点待校正；历史TestRun、待决定事项、活动数据维护/恢复、Ubuntu和本人验收仍未完成。[a345日志](../../../evidence/audits/2026-10-10-v1-version-gate-a345.log)，SHA-256 `69ea2ef0876aadae1335d7f57730285e9e6852a86a00615838039f6d174f6760`。

2026-10-10正式门禁a346：五阶段结构审计PASS、证据审计PASS（880/116/255），V1仍`INCOMPLETE`/exit 2。P0交叉表结构项已更新复核，但语义覆盖和P1–P6必需交付、历史证据、待决决定、活动恢复、Ubuntu及本人验收未关闭。[a346日志](../../../evidence/audits/2026-10-10-v1-version-gate-a346.log)，SHA-256 `7ef72830293f445143e81a7f1314b302fe582bc8c7245609a574a4b2b08bf8b5`。

2026-10-10正式门禁a347：文档结构审计PASS、证据审计PASS（882/116/255），V1仍`INCOMPLETE`/exit 2。Artifact生产者当前源码盘点已更新OD-013决策材料，但生命周期技术/政策放行、活动数据恢复、历史Run、P0语义、Ubuntu和本人验收仍未关闭。[a347日志](../../../evidence/audits/2026-10-10-v1-version-gate-a347.log)，SHA-256 `07dbf45f5a14f6b9fd67bdf9409fac824bc71064e7b45f0fdbf2edc12e239fa5`。

2026-10-10 V1.4兼容增量及正式门禁a419：Replay UNKNOWN原单读取按订单ID+持久namespace双重scope，通过隔离Trade HTTP/PostgreSQL与完整V1.4 code suite。V1正式门禁仍INCOMPLETE/exit 2；阶段文档/证据审核PASS（1011引用、139份Manifest、278项），4个历史TestRun缺结构化导出，阶段未关闭、当前用户签署、OD-013/014及旧Run处置、活动数据恢复和Ubuntu实机条件仍开放。[a419日志](../../../evidence/audits/2026-10-10-v1-version-gate-a419.log)，[Replay隔离审计](../../../evidence/audits/2026-10-10-v14-replay-namespace-recovery-a01.md)。


2026-10-10 V1.2当前Fixture修订：v1.2-market-data-5新增显式合成市场会话日历，完整V1.2 code suite及隔离Web/API/CLI四Run通过；见阶段§8.41。此工程证据不关闭真实市场日历、历史导出、Ubuntu或本人验收。


正式V1门禁a528：五阶段文档与证据审计PASS（1176引用、157份Manifest），但V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。V1.2新增合成市场日历子项通过，版本必需历史证据、决策、恢复、主机环境及本人验收仍开放。[a528日志](../../../evidence/audits/2026-10-10-v1-version-gate-a528.log)，[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a528.log.sha256)。


正式V1门禁a529：文档与证据审计PASS（1180引用、158份Manifest），V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。历史Run、政策决定、全域恢复、环境与本人验收继续开放。[a529日志](../../../evidence/audits/2026-10-10-v1-version-gate-a529.log)，[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a529.log.sha256)。


正式V1门禁a530：文档与证据审计PASS（1184引用、159份Manifest），但V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。阻塞项包括4个历史Run导出、未决政策与旧Run、活动/全版恢复、Mac/Ubuntu实机及本人验收。[a530日志](../../../evidence/audits/2026-10-10-v1-version-gate-a530.log)，[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a530.log.sha256)。


正式V1门禁a531：阶段文档/证据审计PASS（1188引用、160份Manifest），V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。本轮只修正验收手册状态总览，不改变阶段状态。[a531日志](../../../evidence/audits/2026-10-10-v1-version-gate-a531.log)，[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a531.log.sha256)。
2026-10-10正式门禁a564：V1仍`INCOMPLETE`/exit 2；阶段文档审计PASS、证据审计PASS（1222引用、166份Manifest、305项）。V1.1/V1.3 Portfolio Risk Caller互异身份密钥门禁及A17调用矩阵已同步；历史Run、未决决定/旧Run处置、恢复、目标环境及人验仍未满足。[a564日志](../../../evidence/audits/2026-10-10-v1-version-gate-a564.log)，[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a564.log.sha256)。

2026-10-10正式门禁a562：V1仍`INCOMPLETE`/exit 2；阶段文档审计PASS、证据审计PASS（1217引用、165份Manifest、304项）。V1.3 Governance三身份token门禁与A16调用矩阵、Compose空值失败检查已同步；历史Run、未决决定/旧Run处置、恢复、目标环境及人验仍未满足。[a562日志](../../../evidence/audits/2026-10-10-v1-version-gate-a562.log)，[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a562.log.sha256)。

2026-10-10正式门禁a560：V1仍`INCOMPLETE`/exit 2；阶段文档审计PASS、证据审计PASS（1211引用、163份Manifest、302项）。V1.3 Governance Platform caller三身份token必填与交叉追踪已同步；历史Run、未决决定/旧Run处置、恢复、目标环境及人验仍未满足。[a560日志](../../../evidence/audits/2026-10-10-v1-version-gate-a560.log)，[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a560.log.sha256)。

2026-10-10 A18 Portfolio Risk路由caller拒绝矩阵与V1.1/V1.3代码套件结果已入档；本次全仓baseline 66/66通过。V1正式门禁仍需复核，且外部历史证据、决定/Run处置、全域恢复、目标环境及本人验收未满足。

2026-10-10正式门禁a566：五阶段文档审计PASS，证据审计PASS（1224引用、166份Manifest、305项），V1仍`INCOMPLETE`/exit 2。A18路由身份拒绝矩阵及全仓66/66基线已登记。历史TestRun导出、所有者决定与旧Run处置、全域恢复、Mac睡眠唤醒、Ubuntu及当前范围本人验收仍待完成。[a566日志](../../../evidence/audits/2026-10-10-v1-version-gate-a566.log)，[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a566.log.sha256)。

2026-10-10正式门禁a568：a567发现的SHA sidecar格式问题已更正并重验；五阶段文档/证据审计PASS（1226/167/306），但V1仍INCOMPLETE/exit 2。历史Run、所有者决定/旧Run处置、完整恢复、Mac/Ubuntu实机及当前范围本人验收未满足。[a568日志](../../../evidence/audits/2026-10-10-v1-version-gate-a568.log)，[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a568.log.sha256)。

2026-10-10正式门禁a570：V1.4终态拒绝资源释放修复已同步，五阶段文档/证据审计PASS（1231/168/307）；V1仍`INCOMPLETE`/exit 2。历史TestRun导出、所有者决定及旧Run处置、全域恢复、Mac/Ubuntu目标环境和本人验收未满足。[a570日志](../../../evidence/audits/2026-10-10-v1-version-gate-a570.log)，[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a570.log.sha256)。

2026-10-10正式门禁a571：五阶段文档审计PASS、证据审计PASS（1234引用、169份Manifest、308项）；V1仍`INCOMPLETE`/exit 2。V1.4固定拒绝Reservation释放子项已完成，四个历史TestRun导出、所有者政策/旧Run决定、恢复、Mac/Ubuntu和当前范围本人验收仍未满足。[a571日志](../../../evidence/audits/2026-10-10-v1-version-gate-a571.log)，[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a571.log.sha256)。


2026-10-10 Ubuntu验收范围澄清：本仓库所有者指令要求最终迁移验收提供实际Ubuntu证据；V1/V2目标架构烟测要求与V3 Ubuntu部署要求分别保留。amd64仿真不替代V1最终迁移验收的真实Ubuntu运行。当前Mac M1宿主无可用容器运行时，实机项NOT_RUN；见[分类补充A02](../../../evidence/audits/2026-10-10-v1-gate-classification-a02.md)及[只读preflight](../../../evidence/audits/2026-10-10-w8-ubuntu-host-preflight-a01.log)。

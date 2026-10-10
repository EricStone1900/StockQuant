# V1 完成开发计划

2026-10-10 P3/P4增量：V1.4 Web现对拒绝场景也有浏览器覆盖，未来成交与同日SELL显示明确拒绝、`reportPublished=false`，并以相同TestRun经CLI核对；Playwright 7/7，10个浏览器Run同Run CLI通过，18组Quant结果/Manifest Hash配对及19个Platform Run核验、隔离资源清理通过。此修复补齐§7正式Web正常/拒绝/恢复场景交付证据。另有刷新恢复与ARM64容器化Web构建/路由验证；V1.1兼容代码套件exit 0，全仓基线66/66。证据分别见[本轮Web拒绝E2E](../../evidence/audits/2026-10-10-v14-web-rejection-e2e-a01.log)、[刷新E2E](../../evidence/audits/2026-10-10-v14-browser-refresh-recovery-e2e-a02.log)、[容器Web smoke](../../evidence/audits/2026-10-10-v14-containerized-web-refresh-smoke-a02.log)、[V1.1兼容套件](../../evidence/audits/2026-10-10-v11-v14-web-refresh-compat-code-suite-a01.log)及[基线](../../evidence/audits/2026-10-10-v1-v14-refresh-baseline-a05.log)。这不关闭P4规则/OD-014结算、完整人工验收或V1版本验收。

正式门禁a584（在a583后纳入当前进度状态复核）：五阶段文档审计PASS，证据审计PASS（1258引用、172份Manifest、311项）；版本仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。TestRun审计仍有4个历史Run缺结构化导出；OD-013/014及旧Run处置、活动/全域恢复、Mac睡眠唤醒、Ubuntu实机和当前范围人工验收也未完成。[a584门禁日志](../../evidence/audits/2026-10-10-v1-version-gate-a584.log)、[exit](../../evidence/audits/2026-10-10-v1-version-gate-a584.exit.txt)、[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a584.log.sha256)。

2026-10-10 P1/A04 Quant→Qlib Worker调用映射增量：补录V1.2 `probeQlibWorker`与`fitQlibFixtureInWorker`实际生产调用、专属Bearer/120秒拟合超时及V2.3摘要train/validate边界；交叉索引为V1.1-S2-L14增加客户端测试与运行证据（crosswalk 147项、1699路径引用/596目标、205精确测试名、147锚点通过）。完整V1.2 code suite受控重跑exit 0：脚本66/66、Qlib Worker 14/14、Quant Research 101项、真实Qlib 0.9.6容器、四场景Web/API/CLI同TestRun及恢复通过，隔离资源清理通过。E2E间有一次代理`socket hang up`输出但最终测试PASS。详见[阶段§8.32](../prd/v1-local-simulation/01-environment-and-web-center.md#832-quant-researchqlib-worker生成客户端v1调用边界2026-10-10)、[矩阵A19](../../evidence/audits/2026-10-10-v1-cross-service-route-matrix-a19.md)、[日志](../../evidence/audits/2026-10-10-v12-qlib-worker-client-inventory-code-suite-a01.log)及[SHA-256](../../evidence/audits/2026-10-10-v12-qlib-worker-client-inventory-code-suite-a01.log.sha256)。此项只补齐一条调用边盘点和隔离回归，不关闭P1/A04或V1整体。

正式复核a585（A19阶段/计划/进度及crosswalk同步后）：五阶段文档审计PASS，证据审计PASS（1262引用、173份Manifest、312项）；版本仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。四个历史TestRun结构化导出仍缺失；OD-013/014与旧Run处置、活动/全域恢复、Mac睡眠唤醒、Ubuntu实机和当前范围人工验收未满足。[a585门禁日志](../../evidence/audits/2026-10-10-v1-version-gate-a585.log)、[exit](../../evidence/audits/2026-10-10-v1-version-gate-a585.exit.txt)、[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a585.log.sha256)。

正式复核a586（计划/进度、A19矩阵与交叉索引更新后）：五阶段文档审计PASS，证据审计PASS（1262引用、173份Manifest、312项）；V1仍INCOMPLETE/exit 2。四个历史TestRun结构化导出、OD-013/014及旧Run处置、活动/全域恢复、Mac睡眠唤醒、Ubuntu实机和当前范围人工验收继续未满足。[a586门禁日志](../../evidence/audits/2026-10-10-v1-version-gate-a586.log)、[exit](../../evidence/audits/2026-10-10-v1-version-gate-a586.exit.txt)、[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a586.log.sha256)。

2026-10-10 P1/A04 Trade→Governance Historical Replay授权消费映射：补录V1.4 Trade在FakeBroker执行前以Trade专属身份调用`validateHistoricalReplayExecution`的真实生产边；客户端合同测试现在逐字段断言POST路径、身份/Bearer、Content-Type、命令Hash绑定载荷和5000ms超时。完整V1.4 code suite受控exit 0（Trade 99/99、Replay 27/27、Governance 43/43，真实三服务HTTP/PG与9执行日账本对照、Artifact fencing通过，资源清理完成）。crosswalk:check通过147项/1699路径/597目标/206精确测试/147锚点。详见[V1.4 §8.76](../prd/v1-local-simulation/04-daily-backtest.md#876-tradegovernance-historical-replay授权验证客户端合同2026-10-10)、[矩阵A20](../../evidence/audits/2026-10-10-v1-cross-service-route-matrix-a20.md)、[完整套件日志](../../evidence/audits/2026-10-10-v14-trade-replay-governance-client-contract-code-suite-a01.log)。只关闭一条调用合同子项，P1/A04和V1整体验收仍OPEN。

正式复核a587（Trade→Governance客户端合同、V1.4测试计划、crosswalk和A20同步后）：五阶段文档审计PASS，证据审计PASS（1267引用、174份Manifest、313项）；V1仍INCOMPLETE/exit 2。四个历史TestRun结构化导出、OD-013/014和旧Run处置、活动/全域恢复、Mac睡眠唤醒、Ubuntu实机及当前范围人工验收仍未满足。[a587门禁日志](../../evidence/audits/2026-10-10-v1-version-gate-a587.log)、[exit](../../evidence/audits/2026-10-10-v1-version-gate-a587.exit.txt)、[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a587.log.sha256)。

正式复核a444：V1.4九个执行日Quant/Portfolio现金及持仓精确对照、阶段记录和交叉映射更新后执行；五阶段文档审计PASS、证据审计PASS（1051/145/284），V1仍INCOMPLETE/exit 2。指定历史Run导出、阶段交付/人工验收、OD-013/OD-014及旧Run决策、活动与全域恢复和Ubuntu实机仍未满足。[门禁日志](../../evidence/audits/2026-10-10-v1-version-gate-a444.log)，[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a444.log.sha256)。

正式门禁a428：进度/计划同步后复核，文档与证据审计均PASS（1033/144/283），V1仍INCOMPLETE/exit 2；详细未结条件以[门禁日志](../../evidence/audits/2026-10-10-v1-version-gate-a428.log)为准。

正式复核a427（进度同步后）：五阶段文档与证据审计PASS（1033/144/283），V1仍INCOMPLETE/exit 2。遗留历史导出、人工验收、业务决定、配对恢复和Ubuntu目标环境证据均未满足。[门禁日志](../../evidence/audits/2026-10-10-v1-version-gate-a427.log)。

正式复核a426：阶段文档审计PASS、证据审计PASS（1033/144/283），V1仍INCOMPLETE/exit 2；V1.3客户端契约子项通过不改变整体门禁。四个历史结构化Run导出、OD-014/OD-013及旧Run决定、全域恢复、Ubuntu和阶段人工验收继续开放。[门禁日志](../../evidence/audits/2026-10-10-v1-version-gate-a426.log)。

2026-10-10 A04/P1增量执行：V1.3 AUTO Mandate生成客户端Platform 5项、Trade 2项操作新增直接契约单测；完整V1.3 code suite exit 0。阶段、测试追踪、调用矩阵及项目进度已更新，证据见[套件日志](../../evidence/audits/2026-10-10-v13-auto-client-contract-code-suite-a01.log)。只完成客户端契约原子项；V1整体和P1/P3父项继续开放。

日期：2026-10-08（Asia/Shanghai）。状态：IN_PROGRESS。依据：项目所有者要求“以完成V1为基础，非必要不扩展功能或V2/V3新功能，重点梳理V1文档与进度”。首轮差异映射和五阶段代码/隔离Web回归已执行，详细结果见[本轮V1开发运行记录](../../evidence/audits/2026-10-08-v1-development-run.md)；P0逐条证据关联、P1～P6及正式验收尚未关闭。

本计划接替[10月6日计划](./2026-10-06-v1-complete-loop-execution-plan.md)的当前排期和剩余队列，沿用P0～P6映射，不重做已有切片。旧计划的场景、细项、成功/失败及签署保留为历史依据。当前进度只在[进度摘要](../progress.md)汇总；需求与正式状态仍以[V1版本计划](../prd/v1-local-simulation/00-version-plan.md)、五阶段第2/7/8节、[测试计划](../prd/v1-local-simulation/90-test-plan.md)、[验收表](../prd/v1-local-simulation/99-acceptance.md)为准。计划编写和隔离回归不代表工作包通过，不授权活动迁移、清理或策略启用。

2026-10-09 P3/A07增量：Platform API Proposal入口的三种非法模式注入均返回422且无账本/订单/Fill副作用，同幂等键PAPER/FAKE合法请求返回201；新增Web E2E并由同Run CLI `--check-only`核对。完整V1.3 E2E 22/22与完整代码套件exit 0。只关闭该入口原子测试覆盖，V1.3-S2-L17全路由模式边界父项仍OPEN；证据与限制见[阶段§8.30](../prd/v1-local-simulation/03-fake-broker-trading-loop.md#830-platform-proposal模式注入拒绝及无交易副作用2026-10-09)及[机器交叉索引](../../evidence/audits/2026-10-09-v1-requirement-test-crosswalk.json)。

V1正式门禁的最新结论与历史记录统一追加在[当前进度摘要](../progress.md)；不能以单次隔离测试或文档审计通过替代版本门禁。当前已验证V1.5运行比较、能力阻塞显示和四卷隔离业务恢复/幂等重放切片，完整范围仍OPEN；历史Run导出、未决业务/旧记录决定、V1.1–V1.4活动数据及宿主灾备、Ubuntu和当前范围人工验收仍未完成。

P0/A01增量复核：V1.3-S2-L17本轮新增Platform Proposal测试及证据逐项映射完成，25条关联路径存在；覆盖审计仅确认该原子入口，父级全V1模式边界保持OPEN。[逐项审计](../../evidence/audits/2026-10-09-v1-crosswalk-platform-mode-a01.json)。

本轮证据质量复核更正了V1.3模式拒绝测试摘要硬编码：容器E2E现证明账本条目数初始化前后均为1、版本不变、交易副作用为0；完整E2E 22/22与代码套件通过。首次门禁a177暴露sidecar相对路径错误并保留失败记录，修正后a178证据审计PASS。旧摘要日志保留，阶段/交叉索引改引更正日志。父级范围仍OPEN。

2026-10-09共享Platform Run Incident改动后的五阶段兼容复验：V1.1 code suite+Web/API/CLI 3/3；V1.2 code suite（含锁版Qlib/Artifact与隔离Web/API/CLI E2E）；V1.3 code suite+Web/API/CLI 22/22；V1.4 code suite+Web/API/CLI 5/5；V1.5 code suite+Run Incident四场景E2E均exit 0。各隔离资源清理通过，未调用真实数据源/券商。运行结论同步于[项目进度](../progress.md)及各阶段第8节；全部阶段仍未满足当前范围人工/环境验收，V1门禁仍INCOMPLETE。

P5/AUTO取消新增FakeBroker已提交、Trade HTTP响应未返回时的部分成交撤单固定窗口：Web提交Run取消后记录25/50股权威Fill、接受FakeBroker撤单、释放剩余Portfolio预留；同Run CLI/export、双账本MATCH及随机栈精确清理均通过。报告与代码门禁见[V1.5 §8.19.4](../prd/v1-local-simulation/05-scheduling-and-recovery.md#8194-auto-fakebroker撤单与部分fill竞态2026-10-09)。该证据关闭固定场景，不关闭真实日历/结算、实时调度、多故障Worker、完整跨域恢复与人工验收。

## 1. 目标和范围控制

交付完整可操作链路：冻结双市场日线输入 → 真实Qlib/确定性策略输出 → 建议/人工审批或预授权 → 风控与资源预留 → 执行授权 → 独立持久FakeBroker订单/Fill/资产 → 入账与结算 → 对账/日终 → 后台恢复。正式Web、/acceptance、同Run CLI核对与证据导出同步交付。

- CN_A/CNY为主要交互路径，US_EQUITY/USD完成明确标注的Fixture闭环；小样本、单计算Worker起步。
- 继续使用现有服务、合同、锁版Qlib和冻结Fixture；不为完善架构外观而重写服务或拆出无必要新服务。
- 不开展V2免费来源/新闻扩展、分钟导入/回放新能力、持续Paper长期观察扩展、容量扩容，也不开展V3真实模型/RD-Agent研究、候选晋升新能力、研究扩容或最终Ubuntu迁移项目。
- V1既定RD-Agent环境/固定代码探针保留；没有真实模型调用不阻塞该探针验收。全部真实券商、券商Paper API和LIVE写入继续禁止。
- 允许复用V2/V3已实现组件，以及为V1必需的共享修复和受影响回归。每项例外先写明V1来源要求、现有缺口、最小改动、验证及停止边界；不能映射到V1必需项就放回后续版本。若实质新增需求或改变验收范围，先交具体差异供所有者决定。
- 不恢复旧目标、其他聊天或自动化；活动采集/策略/服务状态不因本计划自动改变。

## 2. 已核实基线与文档梳理结果

基线HEAD `baded04`。本轮保留既有文档改动，并新增隔离运行证据。开始时三个版本Verifier分别exit 2/INCOMPLETE；本轮后V1仍exit 2/INCOMPLETE，五阶段仍PARTIALLY_IMPLEMENTED，主要原因是P1/P5业务与交付缺口、4个历史Run缺结构化导出及当前范围人工/环境验收未完成。原始与本轮结果见[门禁复核](../../evidence/audits/2026-10-08-delivery-review/README.md)和[运行记录](../../evidence/audits/2026-10-08-v1-development-run.md)。本轮通过的代码/E2E仅在记录的隔离范围有效。

| 阶段/责任包 | 复用成果 | 必须收尾的类别 | 当前手册 |
|---|---|---|---|
| V1.1 / P1 | 当前树code suite、交互栈生命周期、Web normal/rejection/recovery 3/3及同Run CLI/export均通过 | V1适用调用/发布覆盖、Artifact政策、活动切换、完整交接、当前人工验收 | VERIFIED_EXECUTABLE（仅隔离执行手册） |
| V1.2 / P2 | 本轮code suite与隔离双市场Qlib/Web/CLI运行通过，含取消/重启恢复及日线质量拒绝发布门 | 输入到交易主线追踪复核、通用导入/正式Artifact仍非此固定Fixture切片范围、历史证据、当前范围用户/环境验收 | VERIFIED_EXECUTABLE，仅隔离Fixture范围 |
| V1.3 / P3 | 当前code suite通过；完整Web/API/CLI E2E 21/21通过 | 接受路径模式审计、适用规则与授权/故障剩余项、完整交接 | VERIFIED_EXECUTABLE（仅Mac ARM64隔离手册范围；阶段仍部分实现） |
| V1.4 / P4 | 当前树code suite、隔离Web/API/CLI E2E 7/7通过（正式页正常/拒绝/恢复；拒绝及刷新Run均同Run CLI核验）；ARM64容器化Web构建/路由/资源加载与精确清理通过；交互栈及截图/Trace证据保留 | 同输入Paper执行及账本完整对照、适用规则、人工验收、报告交接 | VERIFIED_EXECUTABLE（限Mac ARM64隔离操作；业务阶段仍未关闭） |
| V1.5 / P5 | 四场景Web/API/CLI/export E2E与完整code suite通过；固定三日AUTO Fixture逐日对账、Fill追溯、Platform/Trade Worker恢复、FakeBroker部分Fill后权威撤单、owner范围Run历史和比较均有隔离证据；四卷隔离恢复验证AUTO Run订单/成交、Portfolio、Mandate、NATS/Temporal与Artifact，重放原事件无重复业务事实（§8.23）；Run Incident持久投影、会话确认、解决/复发及owner边界通过隔离API/PG/Web验证（§8.24）；Trade两实例提交后同时中断1.5秒并按原单恢复（§8.30），另有双Trade与PostgreSQL同时中断、依赖服务恢复后原单读回的固定场景（§8.31）；normal Run刷新恢复及Platform API主进程在Activity中崩溃自动重启，四场景E2E/同Run CLI/export 3/3通过（§8.43）；保留栈Platform API容器已恢复，原normal Run只读check-only仍显示WAITING（系统调度NOT_RUN、HOLD观察PASS，§8.44） | 真实多日/市场日历/结算、实时时钟调度、Mac睡眠/唤醒与其他多故障组合、完整操作者演练；V1.1–V1.4活动数据、宿主/异地配对恢复及RPO/RTO、目标Ubuntu与当前范围人工验收 | PARTIALLY_VERIFIED_EXECUTABLE |

V1.3的21项矩阵和L07/L08应用协调提取不再当作新任务重复开发；NO_TRADE通过不等于交易/日终通过。历史人工签署继续保留当时范围，新增范围人工结论仍NOT_RUN。

已完成文档导航整理：根README/AGENTS指向V1；[文档地图](../README.md)区分需求、设计、决定、操作和证据；[计划索引](./README.md)说明接替关系。后续V1文档收尾如下：

| 文档 | 维护职责与本轮动作 |
|---|---|
| V1 README与00-version-plan | 给出当前五阶段状态和范围；旧日期事实保留适用范围，不继续自称从空仓库开始 |
| 五阶段第2节 | 核实实现任务与证据，补“已实现但未交付/验证”的明确结论，不凭代码存在打勾 |
| 五阶段第7节 | 核实开发交付；人工勾选仅凭用户实际确认 |
| 五阶段第8节 | 补当前启动/登录/按钮、固定输入/Hash、超时、恢复/清理及同Run命令；实测后更新手册状态 |
| V1 90-test-plan与99-acceptance | 与场景和当前范围同步；分别保存代码/业务/Web/手册/人工/环境结论及历史 |
| 需求追踪、架构、ADR/未决事项 | 仅在要求/合同/责任边界或决定变化时同步，不为每次测试再写设计 |
| evidence与旧执行计划 | 保存原运行/Hash/失败及历史签署；新计划只留结论和引用，不搬迁覆盖历史文件 |

## 3. 执行顺序与依赖

唯一工程队列：**P0差异收敛 → P1工程收尾 → P2链路复核 → P3交易收尾 → P4规则对照 → P5后台闭环与全域恢复 → P6版本验收**。每包正常/拒绝/恢复、Web、证据及手册随包完成，不在最后集中补页面。

P1活动切换、策略启用或人工验收未满足时，只推进已验证隔离前置上独立的P2/P3工程项，不标P1通过。P3必要交易规则未验证不推进依赖该规则的P4/P5场景；正式阶段签收依然遵守V1.1→V1.2→V1.3→V1.4→V1.5。

| 工作包 | 当前状态 | 主责 | 进入条件 | 工程交付/退出条件 |
|---|---|---|---|---|
| P0 差异收敛 | 进行中；当前工作树`pnpm crosswalk:check` PASS（147项/147唯一ID、1734个路径引用/624个唯一目标、210个精确测试名、147个当前来源锚点，0失败；源交叉索引SHA-256 `36895aeff8a55555fb8fc967a2eeb9fb2f78ad6cc3090ff6e634a3efe778b4aa`）。责任映射覆盖A01将147条需求全部分类（108条阶段行、38条共性行、1条XMK-03，0未分类）。P0仍OPEN：测试充分性、Fixture语义及消费者/发布兼容仍需逐项核实；crosswalk结构检查和责任归属不代表需求行为通过。[当前索引](../../evidence/audits/2026-10-09-v1-requirement-test-crosswalk.json)、[责任覆盖](../../evidence/audits/2026-10-10-v1-responsibility-coverage-a01.md) | 开发者；需要政策/历史处置时由项目所有者决定 | 当前A31及来源审计已建立 | 147条需求实现/测试/Fixture/证据/缺口逐项可信，责任归属与语义充分性分开，所有未决边界有关闭条件 |
| P1 基础收尾 | 未关闭；统一`pnpm db:migrate:v1`检查/应用CLI及V1.1–V1.5阶段隔离PostgreSQL套件已有通过记录（见§3中a84和V1.5专项）；down-migration不提供，Runbook明确采用独立恢复回退。共享Platform Run保存事务变更后V1.1–V1.4 code suite均exit 0，V1.1新增六类公共核心Schema在TS/Python及8服务生成副本中的字段/required性回归，完整V1.1 code suite a02 exit 0；隔离Web/API/CLI回归还包括V1.1 3/3、V1.2四个Run、V1.3最新完整E2E 27/27（含固定US AUTO多腿BUY）及V1.4 5/5；V1.5另有对应code/E2E证据（各项按阶段§8与进度记录）；业务消费者完整映射、活动存储准备/切换、Artifact统一生命周期和新增范围验收仍未完成 | 开发者；活动操作由指定负责人 | P0对应范围明确 | V1适用合同/迁移/发布矩阵无漏项；Artifact引用/生命周期工程验证；活动数据恢复副本切换与回退演练；实际切换仅在精确批准后执行 |
| P2 数据/Qlib复核 | 工程已有成果，未正式关闭 | 开发者 | 已验证的隔离P1基础 | 冻结DataVersion/规则/策略输出至P3输入可追踪，CN/US及不足/未来/缺失样本覆盖；原子发布、取消/恢复及真实Qlib证据有效；不重复研究新模型 |
| P3 交易收尾 | 固定交易矩阵和多个拒绝/恢复子项已通过；V1.3最新完整E2E 27/27及code suite exit 0，V1.4三服务真实Governance→Trade→Portfolio HTTP/独立PG含9个执行日Quant/Portfolio账本对照、零成交拒绝/到期及冻结停牌/涨跌停三类Paper拒单通过（§8.25–8.26、§8.77、套件a04）。P3父项仍开放：全V1入口身份/模式/副作用清单、授权与预留剩余路径、SELL真实可用量/应收/结算、规则及Web/同Run交付仍未全部验证 | 开发者 | P2输入和必要P1基础有效 | V1全部接受路径清单与适用安全断言齐全；授权/预留/订单/Fill/账本/独立对账当前剩余项逐一验证；正式Web与同Run独立断言及手册完成 |
| P4 回测一致性 | 部分规则对照通过；冻结停牌BUY/涨停BUY/跌停SELL拒单已贯通Trade Paper HTTP与Governance授权并验证幂等；BUY预留释放通过，SELL场景无真实持仓/Reservation。现有正式Web拒绝场景及契约兼容7/7 E2E只证明页面/同Run交付，不扩展结算结论 | 开发者 | 对应P3规则/执行事实可核验 | 相同输入下两市场逐笔价格/数量/费用、现金/应收/可卖量/结算一致；适用公司行动/日历/恢复有证据；回测报告能追溯业务事实 |
| P5 后台闭环与恢复 | NO_TRADE及基础设施子项通过；固定AUTO双市场交易、合成日历逐日对账、错过窗口重评估、暂停拒绝/在途授权订单完成、UNKNOWN恢复、重复派发幂等、Trade进程重启和单实例接管均有隔离E2E；FakeBroker权威撤单/部分Fill/剩余预留释放固定窗口已通过；V1.5四卷恢复含真实AUTO业务事实并验证重复派发幂等；Run Incident持久投影/会话确认/Run保存事务内自动生成、恢复解决和复发新建已通过隔离API/PG/Web验证（§8.24）；Trade双实例提交后同时中断1.5秒并恢复原单的固定场景已通过（§8.30）；外发通知与跨阶段成交追溯仍开放；Mac睡眠/唤醒、其他多故障Worker、真实市场日历/结算与时钟调度仍未完成 | 开发者；手动环境演练由实际操作者 | P3交易链、P4适用规则通过；OD-014决定先解决结算口径 | 自动交易和日终由真实后台执行；完整适用暂停/撤销/在途Fill、UNKNOWN、错过窗口、幂等及工作器故障验证；V1.1–V1.4活动数据恢复、真实宿主/异地灾备及资源/架构验证 |
| P6 交付与验收 | 未关闭 | 开发者交付；所有者实际验收 | P1～P5必需工程项及对应决定齐备 | 五阶段当前手册可执行、候选版本回归与证据完整、环境要求满足、用户实际签署；V1正式Verifier exit 0 |

## 4. 各包的最小开发任务

### P0：先把完成边界固定下来

- [x] 复用[106项既有覆盖台账](../../evidence/audits/2026-10-06-v1-p0-coverage.md)，按当前阶段来源逐项核对增删与状态；新覆盖结果另存当前执行快照，旧台账不改写。当前交叉索引稳定坐标匹配106/106条历史项、识别41条新增项、0条历史项失配；每项连带当前来源锚点、分类、测试/证据、缺口和关闭条件见[对照快照](../../evidence/audits/2026-10-10-v1-p0-coverage-reconciliation-a01.json)。这是追踪对照工作完成，不代表任何关联需求行为或验收通过。
- [ ] 对V1.1～V1.5第2/7/8节、90/99要求建立当前差异清单：来源要求→阶段/责任服务→实现/测试/Fixture→已有证据→剩余动作→责任包→关闭条件；不得只统计勾选率。当前逐项快照见[A32矩阵](../../evidence/audits/2026-10-10-v1-current-gap-matrix-a32.json)及[全量责任映射覆盖A01](../../evidence/audits/2026-10-10-v1-responsibility-coverage-a01.md)：147条要求均有责任分类。仍需逐项核实实现/测试充分性、Fixture覆盖与发布兼容语义，不能据此关闭任何业务要求，P0父项继续OPEN。
- [x] 明确“完整市场规则”对应V1已规定的证券/订单/日历/费用/结算/公司行动集合，并将固定Fixture证据、未验证边界及后续范围逐类列出；不降低V1必需项。[范围与证据矩阵](../../evidence/audits/2026-10-10-v1-market-rule-scope-a01.md)。此项只关闭规则范围定义，不代表P3/P4规则、OD-014或版本验收通过。
- [ ] 核对Ubuntu、Artifact清理、活动策略/部署分别属于何种V1门禁；有冲突先形成原文差异、建议归属和影响，需改变要求时取得具体决定并同步PRD/追踪/测试/验收。已形成[原文分类审计A01](../../evidence/audits/2026-10-09-v1-gate-classification-a01.md)；按项目所有者提供的AGENTS.md，V1最终迁移验收明确要求真实Ubuntu证据，故不再把W8实机要求列为待决；[分类补充A02](../../evidence/audits/2026-10-10-v1-gate-classification-a02.md)记录了要求和操作输入。真实主机尚不可用，W8仍NOT_RUN；OD-013 Artifact过期/物理清理仍待所有者政策决定，不设置默认、不删除字节。
- [x] 精确列出4个历史Run的已查来源和缺失状态；本地Platform API以测试身份读取V1.2 Run及三个V1.5 Run均为404，无身份为401；V1.2 API还检查了已知本地端口；本地Docker卷、仓库`evidence/local`及旧版Platform数据库只读查询未发现对应原始结构化记录。来源与证据边界见[当前API/卷探针](../../evidence/audits/2026-10-09-v1-historical-run-api-probe-a01.json)、[早期本地数据库/证据恢复审计](../../evidence/audits/2026-10-07-v1-history-run-recovery-check.md)及[当前Version Gate](../../evidence/audits/2026-10-09-v1-version-gate-a202.log)。当前只能证明已查本地来源无记录，不能证明离线/外部备份不存在；原始导出恢复仍是P6未满足项。出现新原始备份/来源时再恢复，不重复无变化全盘搜索。

P0退出后才能冻结剩余工期；本计划不继承10月6日22～35人日作为当前承诺。

2026-10-09 P3实现增量：FakeBroker已确认DAY到期现会事务化写入终态、审计事件和Portfolio预留释放Outbox；部分Fill待投递时延迟释放，UNKNOWN拒绝按到期释放。单测/类型检查/隔离PostgreSQL持久化回归通过，见[审计](../../evidence/audits/2026-10-09-v13-expiry-reservation-release-a01.md)。这只补齐一个订单状态副作用切片，未关闭P3完整接受路径、错过窗口重评估或P5交易Worker恢复。

同轮改动后的V1.3完整代码套件已exit 0，完整输出见[套件日志](../../evidence/audits/2026-10-09-v13-expiry-reservation-release-code-suite-a01.log)。正式V1版本门禁复核[a137](../../evidence/audits/2026-10-09-v1-version-gate-a137.log)仍exit 2/INCOMPLETE：阶段文档审计PASS、证据审计PASS（532引用/57份Manifest/196条目），但4个历史Run导出及其他P1～P6工程/决定/环境/当前范围人工验收条件仍开放。该门禁没有因本次局部通过而改变版本结论。

### P1/P2：复用基础并补齐交付

- [ ] 仅盘点V1实际调用的生成客户端、身份scope、兼容/迁移、锁与发布流程；补缺失，不顺便覆盖V2/V3所有路由。
- [ ] 复核V1动态字节产物（模型、回测报告）、TestRun引用与导出：owner/run/hash绑定、取消/失败不发布、并发fencing、受控读取；订单/Fill/账本仍由领域服务保存。2026-10-09新增V1.2 Qlib Artifact隔离PG断言：错误owner/TestRun无法读取Artifact/生命周期，默认不写expiresAt，同Run幂等及跨Run相同内容通过；原有取消/发布fencing和恢复测试保留。完整V1.2 code suite exit 0，见[阶段§8.28](../prd/v1-local-simulation/02-small-data-and-qlib.md#828-qlib-artifact-ownertestrun读取隔离及保留默认值2026-10-09)及[日志](../../evidence/audits/2026-10-09-v12-artifact-scope-code-suite-a01.log)。当前源码产物分类、位置、跨服务引用与SHA已刷新见[Artifact生产者盘点A01](../../evidence/audits/2026-10-10-v1-artifact-producer-inventory-a01.md)，SHA-256 `1a88096d7b52b763f1a33ec13685078d7382416857c0d2fbca2b98707602b0b2`。此只更新V1产物地图，不关闭全V1生命周期、OD-013引用权威/保留政策、活动卷切换/回退或P1整体。
- [x] 准备OD-013具体政策包：列出保留期限选项、保护类别、孤儿/共享引用核验、dry-run、配对备份/恢复及物理删除边界；另按V1.1～V1.5区分实际产物与业务账本。[OD-013决策包](../../evidence/audits/2026-10-09-v1-artifact-policy-decision-package.md)。此项只完成开发者材料，不代表所有者确认；未确认前不启用默认过期或物理清理，只读盘点继续。
- [ ] 按[存储切换Runbook](../operations/v11-test-run-storage-cutover.md)准备精确活动资源清单和配对备份恢复副本，验证迁移/双写/回退及非终态Run处置；完成维护输入后再请求针对实际切换的批准。2026-10-09只读运行清单已发现`stockquant-v12` Platform仍为legacy、容器无挂载，而当前Compose为其声明Artifact卷；先由维护负责人确认目标实例并核对Artifact文件/PG引用，漂移处理及隔离恢复未完成前不执行切换或配对备份。只读DB审计还发现legacy 59条中有3条非终态（RUNNING 2、WAITING 1）、V1.1 stage为44条且四个历史缺失UUID在两张表均不存在；已确认stage缺15条legacy Run且均COMPLETED、现有行无字段差异；3条legacy非终态（2 RUNNING、1 WAITING）仍需负责人逐项处置。四个缺失历史UUID在两张表均不存在，仍需寻找外部原始导出。详见[容器审计A01](../../evidence/audits/2026-10-09-v1-active-container-inventory-a01.md)、[DB前置审计A01](../../evidence/audits/2026-10-09-v1-active-db-preflight-a01.md)和[逐行Parity A01](../../evidence/audits/2026-10-09-v1-active-db-parity-diff-a01.md)。
- [ ] 复用V1.2真实锁版Qlib与冻结双市场输入，核对策略版本/Artifact至Proposal/Run关联及NO_TRADE语义；补当前来源要求中确有缺口的异常和恢复验证。最新链路审计确认V1.2 Artifact到Governance策略快照（owner/TestRun/数据/策略Hash）已闭合，但V1.3 Proposal不消费该快照，真实E2E为两条研究快照、零Proposal/授权；V1.3使用独立Fixture策略版本。OD-007只批准NO_TRADE基线，TopK活动策略仍未批准；是否要求隔离FakeBroker测试专用来源绑定、以及持有/再平衡语义需所有者明确，当前不接线。详见[P2血缘审计](../../evidence/audits/2026-10-09-v1-v12-proposal-lineage-boundary-a01.md)。
- [x] 分开列出V1.2研究、V1.3人工Paper和V1.5 AUTO的测试Fixture/策略标签/固定订单参数，并与OD-007已确认的只读NO_TRADE及活动策略UNSET项分列；未批准活动策略不阻止隔离固定交易测试，也不因此启用策略。详见[Fixture与活动策略边界审计A01](../../evidence/audits/2026-10-09-v1-fixture-vs-active-strategy-a01.md)。OD-007本身仍OPEN，不能把测试参数复用为活动授权。
- [ ] 完成V1.1/V1.2当前范围手册与阶段交付；已验证路径仅在输入/代码变化或失败时重验。

### P3/P4：交易正确性与同规则对照

- [ ] 全量列出V1账户/治理/执行/回测接受路径：HTTP或Worker入口→身份→允许模式→验证点→领域副作用→拒绝测试。PAPER+FAKE及BACKTEST+FAKE按用途验证；LIVE/REAL拒绝且无新增事实。2026-10-10新增V1.4 Replay UNKNOWN原单读取按namespace隔离并完成Trade隔离HTTP/PG集成；仅关闭该路由子项，完整差异矩阵仍未完成，见[阶段§8.20](../prd/v1-local-simulation/04-daily-backtest.md#820-v14-unknown原单读取按replay-namespace隔离2026-10-10)及[审计](../../evidence/audits/2026-10-10-v14-replay-namespace-recovery-a01.md)。
- [ ] 以既有L01～L10及21项矩阵为基础，对照当前要求补遗漏的授权/预算、资金/证券预留、订单故障和恢复；不重复提取已完成的应用服务，不添加无需求依据的重构。
- [ ] 冻结适用CN/US规则与版本化Fixture，核对币种/数量/报价档、可卖量、限价/停牌限制、成本/结算与适用公司行动；新输入建新版本，保留旧证据。
- [ ] 建规则差异表并逐项修复；同信号/订单/成交输入经过Quant回测和实际Paper服务，比较Fill、费用、Portfolio现金/应收/持仓/可卖量及独立FakeBroker资产。只比较计算函数不足以关闭跨服务账本一致性。
- [ ] 对正常/拒绝/部分成交/T+1/公司行动/取消及重启恢复等阶段必需组合保留独立预期、精确金额和计数；研究浮点容差事前冻结。
- [ ] 正式交易/回测页面显示真实状态、拒绝原因、授权/资源与对账；刷新/关页恢复、同Run CLI/export及当前交互手册齐备。

### P5：先完成业务接线，再补完整恢复

- [ ] 第一切片为冻结AUTO策略输入→治理/授权→风控预留→FakeBroker订单/Fill→入账→日终对账；由真实NATS/Temporal后台执行，Web关闭后继续，完整业务ID可追踪。
- [ ] 接入对应拒绝与恢复路径：暂停/撤销阻止新发送、在途合法Fill继续入账；UNKNOWN查原单，不盲重发或超时释放；错过窗口重新评估、不补发旧单；同ID重放无重复预算/订单/账本。
- [ ] 将现有故障恢复机制应用于上述交易业务，验证阶段必需Worker/总线/数据库/网络及双Worker竞争/故障切换矩阵；不以NO_TRADE探针代替交易恢复。
- [ ] 全V1配对恢复覆盖实际参与的领域数据库、FakeBroker状态、NATS/Temporal、Artifact字节及配置版本；恢复到新隔离环境，核对原Run/业务ID、账本不变量、引用Hash和继续执行的幂等性。
- [ ] 复用[ADR-0006](../decisions/ADR-0006-backup-retention-rpo-rto.md)已有备份参数，按适用范围记录实际RPO/RTO与资源；不把已有决定重新列成全部UNSET，尚缺部署实测如实保留。
- [ ] 执行V1要求的Mac睡眠/恢复人工演练、容器化Web/后端及目标架构验证，记录CPU/内存/磁盘、峰值、恢复时长和是否仿真；Ubuntu实机争议按P0决定处理，不启动V3最终迁移扩展。
- [ ] 正式调度/暂停/告警/对账页面与验收中心读取真实工作流/领域事实；禁止常量业务PASS。

2026-10-09执行增量：V1.5四卷隔离配对备份恢复现已包含实际AUTO Run、FakeBroker订单/Fill、Portfolio账户、Governance预算、NATS/Temporal状态及Artifact字节；恢复后用新NATS消息ID重放原Run事件，稳定Workflow ID复用且业务事实无重复变化，详见[阶段§8.23](../prd/v1-local-simulation/05-scheduling-and-recovery.md#823-v15四卷配对恢复与auto业务幂等续跑2026-10-09)和[报告](../../evidence/audits/2026-10-09-v15-paired-backup-restore-sq-v15-e2e-3f8a26344c4a0ef1f867.json)。这只推进V1.5隔离栈证据，不满足V1.1–V1.4活动数据恢复、宿主/异地灾备、RPO/RTO或人工演练，本工作包仍开放。

### P6：验收齐备才关闭版本

- [ ] 每阶段第8节从准备到导出实测，打印本轮真实URL/登录方式、Fixture版本/Hash、按钮、配置名、耗时/超时和精确恢复/清理步骤；旧随机端口只作历史示例。
- [ ] 冻结候选代码/镜像/锁/迁移/合同/Fixture/场景/规则；执行五阶段适用代码、业务与浏览器最终回归，Web创建Run，CLI只读核对同一UUID及导出。
- [ ] 保存实际故障序列、架构/资源、业务ID、断言、退出码、截图/Trace和SHA；不可复用输出目录覆盖已有证据。
- [ ] 对4个历史Run核原始事实：已对当前运行Platform API做GET只读检查；无身份401，默认内建测试用户对四个原UUID均404；已知V1.2 API端口同样404，当前in-app browser无本地Web标签且Shell未配置会话Cookie。精确探针记录见[历史Run API核查](../../evidence/audits/2026-10-09-v1-historical-run-api-probe-a01.json)。这不能证明离线备份/归档不存在；仍需出现可访问原始备份或用户登录的正式导出来源后继续恢复。若来源不可恢复，保留原UUID和缺失结论，提出证据缺失处置决定；不得用新Run替换或改Verifier绕过。
- [ ] 对照当前覆盖表核实五阶段第2/7节、00/90/99及适用追踪/架构；先交可操作验收包，再由用户本人确认当前范围，不代签。
- [ ] 运行正式V1门禁；缺工程/决定/环境/证据/签署仍exit 2，失败exit 1，全部必需条件满足才exit 0/PASS。

## 5. 验证命令和执行边界

所有命令在仓库根目录执行，先依据对应阶段第8节确定锁、隔离API和能力前置。以下是后续实施的执行合同；历史已执行结果以第2节及运行记录为准，不表示本次制定计划重新执行了这些业务检查。启动命令只在已核实随机隔离目标上运行，缺入口/前置保留未完成，不使用默认活动栈顶替。

```bash
pnpm docs:check
pnpm contracts:check
pnpm fixtures:check
# STAGE逐一替换V1.1～V1.5
pnpm stack:up -- --stage STAGE
pnpm verify:stage -- --stage STAGE --scenario normal --seed 20260907
pnpm verify:stage -- --stage STAGE --scenario rejection --seed 20260907
pnpm verify:stage -- --stage STAGE --scenario recovery --seed 20260907
pnpm verify:stage -- --stage STAGE --suite code
pnpm test:e2e -- --stage STAGE
# RUN_ID为Web创建的实际UUID，指向同一隔离API
pnpm verify:stage -- --stage STAGE --run RUN_ID --check-only
pnpm evidence:export -- --run RUN_ID
pnpm verify:compat -- --platform linux/arm64
pnpm verify:compat -- --platform linux/amd64
pnpm verify:version -- --version V1
```

具体code suite必须列出真实lint/type/domain/DB/合同命令、工作目录、文件和底层退出码；Python用对应服务锁定环境。check-only前后业务事实计数不得增加。compat现有命令只证明其实际探针，完整V1组件另有矩阵；amd64仿真不是Ubuntu实机或性能证据。底层失败不吞掉，空套件/skip/仅202不能PASS。

每包先定向测试，再运行受影响阶段门禁/E2E；共享改动触及V2/V3时只做必要兼容回归，不借回归开发其新功能。P6执行一次冻结候选全版回归；只有代码/输入变化、新失败或未决风险才重复全套。

## 6. 决定与外部阻塞处理

| 条件 | 开发者先交付 | 所有者/操作者需提供 | 等待期间允许推进 |
|---|---|---|---|
| OD-013 | 期限/保护/孤儿/删除的具体方案与dry-run/恢复证据 | 精确政策决定 | 不可变发布/读取/导出、只读盘点；不物理删除 |
| 活动存储切换 | 精确资源、恢复副本演练、旧非终态Run清单、停写/回退方案 | 维护窗口、目标范围、操作/回退责任和针对执行的批准 | 隔离P1～P5工程；不改活动writer/卷 |
| OD-007 | 精确策略版本、参数、市场/资金/风险/预算及授权用途 | 活动启用的明确决定 | Fixture模拟交易与NO_TRADE；不激活活动策略 |
| Ubuntu归属/环境 | 依AGENTS.md已确认V1最终迁移验收须有实际Ubuntu证据；目标架构烟测与实机验收分开记录 | 提供授权Ubuntu x86_64主机、网络/存储边界、CPU/内存/磁盘阈值与维护/恢复责任 | 当前Mac ARM64只读preflight已证实不能完成实机项；实际主机运行仍NOT_RUN；见分类补充A02 |
| 历史证据缺失 | 已查来源、精确UUID和恢复/处置选项 | 可用原备份；无法恢复时对具体处置作决定 | 当前版本工程/证据交付；不冒充恢复旧Run |
| 当前人工验收 | 实际Web入口、固定输入/预期、同Run检查、限制和证据包 | 用户实际操作/确认精确版本范围 | 独立准备；不提前标阶段/版本PASS |

以上不是本轮立即向用户索取的笼统审批清单。先把材料做到具体可审阅，再在依赖动作前询问；未决只阻塞对应操作。发生越权、重复入账、UNKNOWN盲发、未来泄漏、币种错误、证据覆盖或目标不明时，停止受影响路径并诊断，不换seed或清账本凑绿。

## 7. 里程碑、排期和汇报

| 里程碑 | 必需结果 | 可宣称结论 |
|---|---|---|
| M0 边界与任务可信 | P0当前差异映射、争议处理/未决去向、每包退出条件明确 | 可以按有限队列实施，不等于工程完成 |
| M1 交易与回测工程就绪 | 必要P1/P2隔离基础、P3/P4当前工程检查通过 | 固定范围工程通过；活动切换/人工/环境仍分别报告 |
| M2 本地完整闭环工程就绪 | P1～P5必需工程与完整业务/恢复、当前本地手册满足 | 本地工程就绪；不能等同正式V1 PASS |
| M3 V1正式完成 | P6、全部当前必需决定/环境/历史证据处置、用户签署及Verifier通过 | V1 PASS |

按里程碑推进，不设置缺乏依据的日历完成日期。当前先补完P0逐项需求—测试—证据关联，避免无变化的全阶段重复回归；完成后依据实际缺实现/缺验证数量，给出P1～P6逐包剩余开发人日、等待条件和估算区间。后续每包只因新增证据或具体失败修正估算，不延用旧整包预算。

默认一个主执行者、一个工程切片在做；无显式委派不启动并行Agent。每次汇报固定四项：已关闭的来源要求与证据、当前工作包、阻塞及责任、下一项具体交付。文档总结回原包/阶段与进度摘要，完整日志存evidence，不再创建竞争总计划。

执行状态（2026-10-09）：A02已关闭并完成抽取后独立复验；A01索引已扩至145项，覆盖106条原始§2/7/8行、38条§90/99增量及1条全局XMK-03要求，并记录当前交叉索引83条精确测试名称引用（75个唯一路径/标题）及7个脚本执行入口；原链接审计验证145条路径/规则及55条测试名称逐字匹配，V1.3 FakeBroker新增16条测试引用/8个唯一测试、12个原子要求且0失败；本轮拆分V1.2 RD-Agent探针父项（A02，2条引用/2个唯一测试）及日线质量/Artifact任务父项（A03，13条引用/12个唯一测试）；修复质量验证与发布共用的拒绝门，完整V1.2套件退出0。固定代码探针通过；真实RD-Agent、通用导入/持久Artifact范围、Ubuntu/人工验收保持OPEN，详见[父项拆分A02](../../evidence/audits/2026-10-09-v1-crosswalk-parent-decomposition-a02.json)和[A03](../../evidence/audits/2026-10-09-v1-crosswalk-parent-decomposition-a03.json)。详见[原链接审计](../../evidence/audits/2026-10-09-v1-crosswalk-link-audit-a01.json)及[本次父项拆分审计](../../evidence/audits/2026-10-09-v1-crosswalk-parent-decomposition-a01.json)。新增检查发现Portfolio SELL Fill立即增加可用现金，未区分未结应收与结算日；A08/P4需完成结算模型和双市场中间路径验证。V1.2 L19探针（A02）及L15/L17日线质量/Artifact任务（A03）、V1.1-S2-L14合同/分层/迁移父项（A04）累计新增31条精确引用/30个唯一测试并逐名核验；145条索引均已人工核对当前来源锚点（含38条90/99增量）；来源定位完成不代表需求语义/实现通过，其余父项拆分和历史Run处置仍未完成。A06/P2已验证Artifact至Governance逐字段血缘（7/7）、双市场历史预检（8/8）及缺失会话/证券上市区间语义；V1.2完整代码套件、锁版Qlib与隔离Web/API/CLI E2E通过；日线质量拒绝发布门通过84项Market Data单测和四Run E2E验证，详见[当前完整日志](../../evidence/audits/2026-10-09-v12-daily-quality-code-suite-a02.log)、[父项拆分A03](../../evidence/audits/2026-10-09-v1-crosswalk-parent-decomposition-a03.json)、[历史摘要](../../evidence/audits/2026-10-09-v12-insufficient-history-a06-summary.json)及[缺失会话摘要](../../evidence/audits/2026-10-09-v12-session-gap-a06-summary.json)。P3消费端、全输入交接和真实市场日历仍未核完，A06/P2保持部分补强。2026-10-09追加执行P1/A04：Replay、Quant Research、Market Data服务专属事务化迁移账本已完成；Market Data验证legacy业务行保留、并发启动、幂等和未知版本拒绝；Replay/Governance并发HTTP验证、Quant聚焦迁移、Market Data聚焦/集成测试，以及改后V1.2、V1.4完整代码套件均退出0。文档链接审计5742项、0失败。新增V1.2/V1.3/V1.4身份烟测完整套件依次exit 0，证据：[V1.2](../../evidence/audits/2026-10-09-v12-service-auth-code-suite-a02.log)、[V1.3](../../evidence/audits/2026-10-09-v13-service-auth-code-suite-a01.log)、[V1.4](../../evidence/audits/2026-10-09-v14-service-auth-code-suite-a01.log)；OD-014开发者语义决策包已准备，待所有者确认。该段“未提供统一部署前迁移CLI”是CLI实现前的历史状态，已由2026-10-09 P1/A04后续执行记录（§3执行日志a84及V1.1–V1.5隔离迁移套件）取代；当前统一检查/应用CLI已实现并验证。通用down-migration未提供，Runbook明确要求逐服务备份/隔离恢复回退，不等于迁移CLI缺失。活动数据库仍未操作，也未获授权。2026-10-09继续P3/A07：Governance/Trade/Portfolio Risk单测41/41、90/90、5/5及Trade隔离PostgreSQL目标边界5/5复验通过，精确测试名及边界附入V1.3-L17交叉索引；全局`baseline:check`也exit 0，含文档/合同/Fixture、8项服务分层及50项基础测试（[日志](../../evidence/audits/2026-10-09-v1-baseline-check-a01.log)）；全量服务/路由审计继续OPEN，详情见[服务端模式复验日志](../../evidence/audits/2026-10-09-v13-server-mode-boundary-a01.log)。V1.1 Portfolio共享模式策略修复后，完整V1.1与V1.3代码套件均退出0；Portfolio隔离HTTP+PostgreSQL还实际创建并读回PAPER/FAKE、BACKTEST/FAKE账户，非法模式无落库，详见[V1.1 HTTP smoke](../../evidence/audits/2026-10-09-v11-backtest-account-http-a01.log)、[V1.1完整套件](../../evidence/audits/2026-10-09-v11-mode-policy-code-suite-a04.log)、[V1.3完整套件](../../evidence/audits/2026-10-09-v13-mode-policy-code-suite-a03.log)。文档更新后正式门禁a73仍INCOMPLETE/exit 2；文档阶段审计PASS，证据审计423引用、34份Manifest、132条Manifest项PASS；四个历史TestRun结构化导出缺失、五阶段未关闭，详见[a73门禁日志](../../evidence/audits/2026-10-09-v1-version-gate-a73.log)及[Hash](../../evidence/audits/2026-10-09-v1-version-gate-a73.log.sha256)。随后继续A01语义符合性/父项拆分及P1/P2工程，再进入P3接受路径、P4规则缺口和P5交易/日终后台纵切；不把本计划的编写或一次代码门禁当作P0已完成。


2026-10-09 P1 Artifact/报告发布边界定向复验：Platform API V1.2 Run lifecycle隔离PostgreSQL集成3/3、V1.4 report publication fencing隔离PostgreSQL集成2/2及V1.2取消/内容存储、V1.4报告引用/Hash单测14/14通过；两次PG测试均先构建，隔离Harness确认无活动服务连接并清理临时容器/网络。覆盖Run/owner/hash隔离读取、取消/完成两种先后次序下发布fence。V1.4测试按顺序执行两种胜出转移，并非同时调度压力测试。证据见[边界审计A01](../../evidence/audits/2026-10-09-v1-artifact-publication-boundary-a01.md)。这只补强当前两类生产路径，不关闭通用Artifact消费者/生产者矩阵、实际业务Artifact恢复或物理清理决策；A04仍OPEN。

## 8. 可领取任务与首批安排

下表将原工作包拆成有限交付单元，不增加验收范围。任务ID只用于当前排期，要求ID、测试ID、场景与Fixture继续沿用原来源。所有任务初始为待执行/待补齐；已有证据必须复用，不能将表格建立本身计为完成。主责均为开发者，范围/活动操作决定和人工签署归所有者。

| ID / 工作包 | 本次交付物 | 依赖和停止边界 | 验证/关闭依据 |
|---|---|---|---|
| A01 / P0（进行中） | 在[当前覆盖表](../../evidence/audits/2026-10-08-v1-current-coverage.md)补每项来源要求、具体测试/实现路径、有效证据、缺口类别和责任任务；区分父项和子项，纳入当前90/99新增要求。已建立145条稳定ID/逐条路由（原106条加§90/99增量38条及全局XMK-03一条），交叉索引保留精确测试名称与脚本执行入口，145条索引均有当前原文锚点；原始106行的范围变化/章节迁移已记录。新增V1.3 FakeBroker四条父项12个原子条目、16条精确测试引用；4个仍OPEN/PARTIAL子项及V1.3固定Fixture边界已记录。[父项拆分审计](../../evidence/audits/2026-10-09-v1-crosswalk-parent-decomposition-a01.json)。本轮刷新V1.5-S2-L18映射，加入同一Mandate暂停后拒绝新订单/已授权订单完成的机器证据与执行边界；逐路径/精确测试名称存在性审计a03为PASS（154条唯一来源/证据路径，93个精确测试名引用，0缺失），[a03](../../evidence/audits/2026-10-09-v1-crosswalk-link-audit-a03.json)。A01语义符合性、其余父项拆分及V1.5未覆盖父要求仍未完成；2026-10-09对V1.5-S2-L18新增Trade备用实例接管映射做了19条证据路径和4个精确源码标记存在性复核，PASS但只限路径/字面标记，不推断语义覆盖；审计[记录](../../evidence/audits/2026-10-09-v1-crosswalk-trade-failover-refresh-a01.json)，当前交叉表SHA-256 `d71a0b3323ca674fe5b2526861b68c85ad26decb1774f50631e8ee87b4c74c8f`。2026-10-09随后按最新交叉表完成全量字面复核：145条要求、194个唯一路径、107个精确测试名引用均存在（0缺失），记录[link audit a09](../../evidence/audits/2026-10-09-v1-crosswalk-link-audit-a09.json)，不代表语义覆盖通过。V1.1-S2-L14的全V1调用/合同/身份/迁移/发布矩阵仍OPEN | 先复用已有106项，不重新写需求包；无证据项明确未验证 | [机器交叉索引](../../evidence/audits/2026-10-09-v1-requirement-test-crosswalk.json)覆盖106/106来源行且ID唯一；精确Test ID/断言和证据关联仍是开放任务；不能仅填HISTORICAL/RECHECK作为关闭依据 |
| A02 / P0证据保护前置 | 已将[当前V1.5 Harness](../../scripts/test-v15-web-e2e-isolated.mjs)报告写入抽为独立工具；按日期/故障类型/隔离项目名新建JSON及SHA-256 sidecar，exclusive create拒绝覆盖。已有历史路径和Hash保留 | 完成；下一次Harness运行前置已满足 | `node --test scripts/unique-evidence.test.mjs` 1/1通过；V1.5隔离E2E 1/1通过并产生本次独立报告；JSON Hash与sidecar一致；容器/卷/网络清理通过。详细证据见[10月9日记录](../../evidence/audits/2026-10-08-v1-development-run.md#2026-10-09-a02证据写入保护) |
| A03 / P0（范围核对完成） | 已在[当前覆盖表](../../evidence/audits/2026-10-08-v1-current-coverage.md)记录Ubuntu、双市场订单规则、Artifact/OD-013及活动存储/策略边界；未发现需修改ADR或降级V1范围的依据 | 只处理A01发现的真实冲突；变更既有必需项须明确决定 | 原文范围、建议、影响及未决安全行为均列明；Ubuntu实机、活动迁移、物理清理/策略启用仍由对应工程包或OD-013/OD-007单独关闭 |
| A04 / P1（部分完成） | V1实际调用的合同/身份/迁移/发布覆盖矩阵，修复遗漏。已将V1.1迁移、双存储、owner隔离和HTTP持久化回归纳入其代码门禁，并在隔离PostgreSQL上通过；已形成按V1.1–V1.5实际代码/OpenAPI边界整理的首轮A05矩阵；Portfolio账户/账本和Governance授权/提案/Mandate/策略快照schema已建立事务化V1 migration ledger，隔离PG并发启动/legacy baseline、Governance双进程启动与HTTP验证及改后V1.3完整code suite通过，Governance随后也加入事务化baseline并通过隔离双进程/HTTP与改后V1.3完整code suite；Trade也已有事务化baseline并有disposable PostgreSQL持久化/重复迁移验证，最新完整V1.3 suite exit 0；Replay与Quant已加入服务专属事务化baseline并通过隔离PostgreSQL迁移测试及V1.4完整code suite；Market Data八组schema已加入服务专属事务化baseline，并通过legacy行保留、并发启动、幂等及未知版本隔离测试；独立部署前CLI现已实现为`pnpm db:migrate:v1`检查/应用入口，并纳入V1.1～V1.5代码套件；各阶段真实隔离PostgreSQL均验证空库、应用、重复应用和未知版本拒绝（见对应`*-migration-cli-code-suite-*`日志及SHA）。全服务逐操作/发布回退核对、活动库操作及完整配对备份恢复仍开放；Governance/Replay/Quant HTTP身份烟测现已集成至V1.2/V1.3/V1.4完整套件并退出0 | A01对应要求明确；不扩为V2/V3全路由整理 | [A05首轮矩阵](../../evidence/audits/2026-10-09-v1-cross-service-route-matrix-a05.md)、[Replay/Quant迁移后的V1.4完整套件](../../evidence/audits/2026-10-09-v14-quant-migration-code-suite-a03.log)、[Quant聚焦迁移测试](../../evidence/audits/2026-10-09-v14-quant-migration-a01.log)、[Market Data聚焦迁移](../../evidence/audits/2026-10-09-v12-market-data-migration-a03.log)、[Market Data完整集成](../../evidence/audits/2026-10-09-v12-market-data-migration-integration-a02.log)、[最终V1.4完整套件](../../evidence/audits/2026-10-09-v14-market-data-migration-code-suite-a04.log)、[Market Data迁移后的V1.2完整套件](../../evidence/audits/2026-10-09-v12-market-data-migration-code-suite-a01.log)、[Portfolio迁移及V1.3套件](../../evidence/audits/2026-10-09-v13-portfolio-migration-code-suite-a01.log)、[Governance迁移HTTP验证](../../evidence/audits/2026-10-09-v1-governance-migration-http-a01.log)、[Governance后的V1.3完整回归](../../evidence/audits/2026-10-09-v13-governance-migration-code-suite-a02.log)、[Trade迁移后的最新V1.3完整回归](../../evidence/audits/2026-10-09-v13-migration-ledgers-code-suite-a03.log)、[隔离迁移证据](../../evidence/audits/2026-10-09-v11-persistence-migration-a04.json)、[V1.1最终代码套件日志](../../evidence/audits/2026-10-09-v11-code-suite-a04.log)；`baseline:check`通过29个生成器、111条消费者规则及8个服务层扫描；平台迁移/双写脚本通过。活动切换仍未授权，A04整体不关闭 |
| A05 / P1（决策包已备；其余待执行） | 已整理OD-013决策维度和技术放行条件；活动存储的恢复副本/切换/回退包仍待对照实际维护目标补齐 | 使用原OD-013和Runbook；先完成可审阅材料，精确批准后才活动操作 | [Artifact保留决策包](../../evidence/audits/2026-10-09-v1-artifact-policy-decision-package.md)；副本业务事实/Hash核对、非终态Run处置、维护与回退输入齐备后，才能申请针对性决定/操作授权 |
| A06 / P2（部分补强） | 固定双市场DataVersion/Qlib策略Artifact→Proposal/Run输入追踪；治理快照逐字段绑定Artifact；先校验两市场完整历史再拟合；缺失市场会话不压缩桥接、证券主数据上市区间校验 | A04必要隔离基础有效；不引入真实来源或新模型 | [血缘单测](../../evidence/audits/2026-10-09-v12-lineage-unit-a06.log)、[不足历史拒绝单测](../../evidence/audits/2026-10-09-v12-insufficient-history-a06.log)和[缺失会话单测/Fixture校验](../../evidence/audits/2026-10-09-v12-session-gap-a06-summary.json)通过；改动后V1.2完整代码套件及隔离E2E通过。P3消费端、真实市场日历和完整输入交接仍开放，A06/P2不关闭 |
| A07 / P3（部分核验） | 全部V1交易/回测接受路径及其允许模式清单，补遗漏安全断言与缺实现。新增逐Leg Mandate证券范围、notional/fee聚合预算和AUTO多腿无副作用拒绝证据，见[机器摘要](../../evidence/audits/2026-10-09-v13-per-leg-authorization-a07.json) | A06输入有效；已验证三入口和21项矩阵复用 | PAPER/BACKTEST按用途+FAKE；LIVE/REAL拒绝且无副作用；原治理/预留/授权必需项覆盖闭合。治理/执行/Portfolio服务单测当前复验41/41、90/90、5/5，Trade隔离PostgreSQL目标边界5/5（[日志](../../evidence/audits/2026-10-09-v13-server-mode-boundary-a01.log)，[SHA-256](../../evidence/audits/2026-10-09-v13-server-mode-boundary-a01.log.sha256)）；追加Trade Execution真实HTTP+PostgreSQL对manual、sequenced-manual、AUTO三条提案执行路由注入LIVE/REAL，均422且订单/成交/事件/outbox零副作用，V1.3完整代码套件exit 0（[日志](../../evidence/audits/2026-10-09-v13-route-mode-injection-code-suite-a01.log)，[SHA-256](../../evidence/audits/2026-10-09-v13-route-mode-injection-code-suite-a01.log.sha256)）。Trade进一步针对13个写入口用错误服务身份进行隔离HTTP探测，均403且无订单/成交/事件/outbox副作用，包含此前三条提案模式注入断言；改后完整V1.3 code suite exit 0（[日志](../../evidence/audits/2026-10-09-v13-trade-route-scope-code-suite-a02.log)，[SHA-256](../../evidence/audits/2026-10-09-v13-trade-route-scope-code-suite-a02.log.sha256)）。该结果和逐路由清单已记入[A05矩阵](../../evidence/audits/2026-10-09-v1-cross-service-route-matrix-a05.md#v13-trade-execution-写入口身份拒绝子矩阵2026-10-09)，仍只覆盖Trade服务身份边界，不能关闭全V1.1/V1.3接受路径审计；Platform/Governance/Replay/Worker、BACKTEST业务操作和UI篡改仍开放。固定CN_A及US_EQUITY MANUAL/AUTO BUY/BUY两腿场景现有隔离Web/API/CLI断言，US AUTO完整E2E 27/27及V1.3 code suite exit 0，详见[阶段§8.61](../prd/v1-local-simulation/03-fake-broker-trading-loop.md#861-v13-auto_policy固定us_equity两腿buy批次2026-10-10)；SELL proceeds-to-BUY结算仍待OD-014，完整服务/路由矩阵和阶段验收仍开放 |
| A08 / P4（部分增量完成） | 同输入回测与实际Paper服务的差异表及逐笔账本对照；新增USD Fixture BUY/SELL订单事实对照，保留固定测试费和未验证边界 | 依赖对应A07规则；缺市场合同/决定的路径保留阻塞，不扩大证券范围 | [USD增量机器证据](../../evidence/audits/2026-10-09-v14-us-fixture-parity-a08.json)；CN既有对照继续有效。完整Paper账本/费税结算、适用公司行动和规则矩阵仍未通过；XMK-03要求的已结算/未结算现金、结算日历及SELL应收不可提前支持BUY尚未实现；OD-014冻结双市场Paper Fixture日历/释放语义前阻断该路径，A08不关闭 |
| A09 / P5首个业务切片（部分完成） | 固定AUTO输入→授权→订单/Fill→Portfolio入账→独立账本核对的后台纵切，正式Web/验收中心同步。CN/US固定Proposal、Mandate、FakeBroker成交/Fill Outbox、Portfolio/FakeBroker现金持仓、预算与终态独立读取已接线；四场景隔离Web/API/CLI/export E2E验证三日合成日历：首日错过、随后两日分别建Proposal/Mandate并成交，每日收盘前Fill及Portfolio/FakeBroker双账本复核（[最新报告](../../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-aede7e79765691df51db.json)）。交互栈启动与精确清理另有实测（[生命周期审计](../../evidence/audits/2026-10-09-v15-interactive-stack-lifecycle-a01.json)）。 | 只依赖已核验A04/A06/A07/A08对应规则；A02完成；不启用活动策略 | 这只证明固定Fixture上的两次跨日执行，不证明真实交易日历、实时时钟/连续调度、OD-014结算现金语义、撤销/在途Fill或交易Worker故障切换；页面固定AUTO成交链路已有逐字段回读，不能推导为任意成交导航或全P5通过。 |
| A10 / P5（部分完成） | 将阶段规定拒绝/暂停/撤销/UNKNOWN/错过窗口/重投及Worker故障应用于A09交易链 | A09固定双市场正常业务成立；故障限定随机隔离目标 | 最新四场景Web/API/CLI/export E2E验证多会话错过窗口、CN/US币种错配422、暂停后新单403/MANDATE_INACTIVE且零副作用；CN_A FakeBroker提交后响应丢失、原单查询首次不可用，Temporal重试按同一clientOrderId查询并恢复；US单次执行为对照，双市场订单/Fill总计各2、未决0、账本MATCH。事件、同Run CLI/export及输入Hash见[机器报告](../../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-aede7e79765691df51db.json)。V1.5 code suite exit 0（[日志](../../evidence/audits/2026-10-09-v15-multi-session-code-suite-a01.log)）。 | A09固定业务成立；故障限定随机隔离目标；不使用真实券商/数据源 | 已关闭固定暂停拒绝、UNKNOWN原单查询、已完成Workflow重复派发及错过首日窗口后两次合成日重评估子项；新增V1.5隔离E2E验证Trade Execution在FakeBroker提交后、HTTP响应前被实际终止并重启；Temporal重试通过原clientOrderId读取已提交订单，同一Run最终账本匹配，详见[执行记录](../../evidence/audits/2026-10-09-v15-trade-worker-restart-crosswalk-a01.json)。这只关闭Trade单进程重启/原单恢复子项；随后Trade主实例在FakeBroker提交后响应前被实际kill，备用Trade Execution容器按同一clientOrderId读回原单，四场景隔离E2E及完整V1.5代码套件均exit 0（[备用接管JSON](../../evidence/audits/2026-10-09-v15-trade-worker-failover-sq-v15-e2e-75b262d7e2b9d8fa1806.json)，[代码套件](../../evidence/audits/2026-10-09-v15-trade-worker-failover-code-suite-a01.log)）。这补充单实例故障接管证据，不覆盖撤销/在途Fill、多实例同时故障、真实时钟延迟及数据库/Temporal服务故障，故A10不关闭。 |
| A11 / P5（环境子项部分执行） | 全V1数据库/FakeBroker/NATS/Temporal/Artifact/配置配对恢复；适用Mac/架构与资源演练。已完成Platform API linux/arm64原生及linux/amd64仿真架构探针；V1.5四卷同点恢复及含合成业务Run/FakeBroker/Portfolio事实的生产备份器隔离恢复均有实测（2026-10-09及2026-10-10复验） | A09/A10事实稳定；复用ADR-0006；手动/实机缺环境则单列 | [兼容探针汇总](../../evidence/audits/2026-10-09-v1-compatibility-probes.json)；[V1.5四卷恢复报告](../../evidence/audits/2026-10-09-v15-paired-backup-restore-sq-v15-e2e-a378990c03fcf9de8260.json)；[2026-10-10业务事实复验JSON](../../evidence/audits/2026-10-09-v1-isolated-cluster-paired-backup-6ec18309cc38403b.json)；[复验日志](../../evidence/audits/2026-10-10-v1-isolated-cluster-paired-business-facts-a01.log)。此为合成业务事实的重复验证，不代表Research API发布产物或V1.1–V1.4真实产物；生产编排/保留、宿主/异地恢复、实测RPO/RTO及Ubuntu实机仍未覆盖 |
| A12 / P6 | 五阶段当前手册、历史4个Run缺失处置、候选版本证据包及用户验收 | 手册随A04～A11更新；最后冻结候选执行一次全版回归；历史恢复只在有新来源时继续 | 第2/7/8节与00/90/99一致；环境/决定满足；精确版本实际用户签署；Verifier最终exit 0 |

A02已关闭。首批继续执行A01；A03整理仅处理A01发现的真实冲突。首批交付是“有限剩余清单＋证据保护前置＋待决影响”，不是再跑一次全部测试或补写大量设计。A01～A03的整理与定向修复预留**1～2个开发人日**作为初步预算，实际新增缺口超出预算时明确报告未完成项；这是计划估算，不是基于已执行测量的承诺，也不含所有者等待时间。

A01收尾时，为A04～A12逐项补充剩余实现/验证人日区间；同时给出工程时间、人工/决定等待、环境等待三列，避免用一个结束日期掩盖阻塞。工期变化必须指出新增缺口或失败，不能借“完善架构”不断延长。A09是本轮核心新增业务交付，基础整理只做到其必要前置和原阶段必交要求，不无限盘点后续版本。

每项领取时记录当前源码/工作树、实际修改文件、必需测试和退出条件；结束时在本表或原包登记状态与证据引用。代码/输入没有变化且已有证据仍有效时直接复用。提交验收前分别报告工程、手册、部署、环境、历史证据与人工结果；任何一类未满足都不宣称V1完成。


2026-10-09追加P3三路由模式注入HTTP证据后，V1正式门禁a75仍为INCOMPLETE/exit 2；阶段文档审计PASS，证据审计428引用/37份Manifest/135条Manifest项PASS，4个历史结构化TestRun导出缺失，五阶段均未关闭。详见[门禁a76](../../evidence/audits/2026-10-09-v1-version-gate-a76.log)及[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a76.log.sha256)。


2026-10-09 P1/A04增量：统一部署前迁移CLI和V1.1～V1.4各服务隔离数据库套件已完成，四个阶段完整代码套件exit 0；操作边界见[迁移Runbook](../operations/v1-database-migrations.md)。这关闭“无独立CLI”这一子项，不关闭活动迁移、完整配对恢复/旧版回退、全调用发布核对或A04父项。正式门禁[a84](../../evidence/audits/2026-10-09-v1-version-gate-a84.log)仍INCOMPLETE/exit 2：阶段文档PASS，证据审计443引用/43份Manifest/141项PASS；四个历史结构化TestRun导出缺失，五阶段未关闭。

2026-10-09验证增量：`pnpm baseline:check` exit 0，包含Markdown链接、合同生成/兼容、Fixtures、Artifact内容存储、8项服务分层及51项脚本测试。随后正式V1门禁[a85](../../evidence/audits/2026-10-09-v1-version-gate-a85.log)仍INCOMPLETE/exit 2；五阶段文档PASS、证据审计452引用/46份Manifest/144项PASS。V1.2及V1.5四个既有TestRun仍缺结构化导出；阶段业务/交付未全关闭，当前范围人工验收、目标Ubuntu实机、活动迁移/回退准备和OD-014决定均未完成。本次验证没有将任何人工或活动环境状态标为PASS。

2026-10-09 P5/A09增量：Decision Governance新增 owner/TestRun/Mandate版本绑定预算汇总GET接口；隔离HTTP/PG smoke实际读出RESERVED 100.00、CONSUMED 200.00、RELEASED 50.00，Trade caller 403、错误owner 404，[日志及SHA](../../evidence/audits/2026-10-09-v13-mandate-budget-http-pg-a01.log)。平台AUTO Activity在FakeBroker完成后独立读取治理账本并逐市场核验：CN CNY消费1005.00、US USD消费250.05，分别仅一笔消费，reserved/released均为0。新增Web断言后V1.5四场景隔离Web/API/CLI/export E2E exit 0，TestRun：normal `f86e9519-2f8e-4cd4-8807-ae76defe88a0`、AUTO `887a3c26-1f93-4a0d-90f7-bd0207a10989`、rejection `1bffdb1b-c799-4a09-b6b1-05641d6c4a24`、recovery `351171c9-ef73-4c77-9242-c2b53a6dd9bd`；证据[JSON](../../evidence/audits/2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-0d837e9c09a10e5b6d31.json)，SHA `04ae8712616cfc4c47c080f0af6f107c32a5eae956d75c42e0ce6f0d889efe9d`，真实来源/券商调用0，隔离项目资源清理通过。隔离Docker只读复查确认锁定Python镜像已在本机，完整`pnpm verify:stage -- --stage V1.5 --suite code`重跑exit 0（Python Worker 14/14，完整报告[a24](../../evidence/audits/2026-10-09-v15-budget-readback-code-suite-a24.log)）。首次exit2只是未授权Docker socket下的可访问性限制，不再是当前阻塞。上述关闭预算状态独立读取和完整code suite复验子项，不关闭A09/P5：多日交易、日终与完整业务故障恢复仍未完成。

2026-10-09正式V1门禁复核a94：仍`INCOMPLETE`/exit 2；阶段文档与证据审计PASS；四个历史TestRun结构化导出仍缺失，五阶段交付、当前范围人工验收、活动迁移决定、目标Ubuntu实机证据及OD-014未满足。门禁结果见[a94日志](../../evidence/audits/2026-10-09-v1-version-gate-a94.log)和[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a94.log.sha256)。

2026-10-09追加V1.5：将后台阶段实际调用的Platform API、Governance、Trade Execution、Portfolio Risk迁移CLI检查纳入V1.5代码套件；四服务隔离PostgreSQL专项与完整V1.5代码套件exit 0（[日志](../../evidence/audits/2026-10-09-v15-migration-cli-code-suite-a02.log)），日志见[专项迁移](../../evidence/audits/2026-10-09-v15-migration-cli-a02.log)及[完整套件](../../evidence/audits/2026-10-09-v15-migration-cli-code-suite-a02.log)。A04仍因完整发布/恢复审查未关闭。

2026-10-09 P5恢复增量：只读Artifact卷归档并恢复到临时目录，33文件逐项SHA相同；此为数据可读回烟测，不替代暂停发布方的数据库/Artifact配对备份、全V1业务ID恢复核对、Ubuntu和RPO/RTO实测。见[Artifact卷恢复证据](../../evidence/audits/2026-10-09-v1-artifact-volume-backup-restore-a01.log)。

2026-10-09 P0历史Run只读核查更新：当前运行V1主API可达，但未认证请求401；默认内建测试身份对四个原UUID均404；已检查本地已运行的V1.2 API端口也返回404。Shell没有证据导出会话Cookie，Codex in-app browser没有本地验收标签。Docker项目卷列表未见独立V1.5备份栈卷；未挂载或修改任何卷。当前不再将情况表述为“API不可连接”，准确状态与范围见[API探针记录](../../evidence/audits/2026-10-09-v1-historical-run-api-probe-a01.json)。离线备份仍可能存在，4项继续OPEN。


2026-10-09 P5/A09页面续跑子项：V1.5验收页持久化当前TestRun ID，关闭原页后重开并重新查询、恢复相同Run。隔离E2E在normal场景创建后关闭原浏览器页并新开页面，核对原ID/WAITING，随后完成120项观察和同Run CLI/export；四场景容器化Web/API/CLI/export均PASS，证据[报告](../../evidence/audits/2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-391873c1eb80223c45ee.json)、SHA `0731546fd3501f479326b8f55bf419700d59baa9d840fba95e81143f24361626`。完整V1.5 code suite exit 0，含锁版Python Worker 14/14：[a27日志](../../evidence/audits/2026-10-09-v15-auto-closed-page-code-suite-a27.log)。E2E报告纳入`apps/web/src/main.tsx`与Playwright测试源码Hash。该子项关闭“验收页关闭期间normal观察/AUTO交易继续并重开同一Run”子项，不关闭多日AUTO、自动日终、成交追溯、交易故障恢复或人工验收。

2026-10-09 V1.5页面关闭续跑：normal 120项观察和AUTO双市场订单/Fill/独立账本对账均在验收页关闭期间完成，重开后恢复同一TestRun；rejection和UNKNOWN recovery场景也通过。`pnpm test:e2e -- --stage V1.5` exit 0，完整code suite a27 exit 0（Python Worker 14/14）。正式V1门禁a95仍INCOMPLETE/exit 2，阶段文档与证据审计PASS；四个历史结构化TestRun导出、五阶段完成、当前范围人工验收、目标Ubuntu和外部决定仍未满足，见[门禁日志](../../evidence/audits/2026-10-09-v1-version-gate-a95.log)与[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a95.log.sha256)。

2026-10-09 P5/A09成交追溯视图：V1.5正式页现逐市场呈现固定AUTO Run的Proposal→Mandate→FakeBroker Order/Fill→Outbox→Portfolio/FakeBroker现金→预算消费→独立对账。隔离Web E2E逐字段对比同Run后端证据，normal页面关闭续跑及AUTO页面关闭期间成交继续、双账本核对后重开均通过；rejection/UNKNOWN recovery也通过。完整`pnpm verify:stage -- --stage V1.5 --suite code` exit 0：[a28日志](../../evidence/audits/2026-10-09-v15-trade-trace-code-suite-a28.log)及SHA sidecar。四场景E2E：[报告](../../evidence/audits/2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-1c93141314b58f1a2cd5.json)，AUTO Run `2ce7af80-d86e-4b0c-925c-1b3597c2818b`。该视图不提供任意成交导航、跨Run比较、告警/能力阻塞；A09仍缺多日策略循环、自动日终及结算，A10恢复场景也仍开放。

2026-10-09 V1正式门禁a97：`pnpm verify:version -- --version V1` exit 2，状态仍为INCOMPLETE；阶段文档审计PASS，证据审计PASS（469引用、48 manifests、146条目），四个历史TestRun结构化导出缺失，五阶段交付/当前人工验收/目标Ubuntu证据仍开放。文档链接检查5883项通过，`git diff --check`通过。门禁日志与SHA：[a97](../../evidence/audits/2026-10-09-v1-version-gate-a97.log)、[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a97.log.sha256)。

2026-10-09 P0/P1基线复核：改动后的`pnpm baseline:check` exit 0，Markdown 5883链接无失败、292个JSON/205个Schema/48个Fixture有效、Artifact内容存储与8服务分层检查通过，脚本回归51/51；完整输出与SHA见[基线日志](../../evidence/audits/2026-10-09-v1-baseline-check-a02.log)及[SHA-256](../../evidence/audits/2026-10-09-v1-baseline-check-a02.log.sha256)。该共享基线不替代五阶段业务/E2E、人工验收或Ubuntu证据。

2026-10-09 V1正式门禁a98：在更新本执行记录/进度摘要后重跑`pnpm verify:version -- --version V1`，仍为INCOMPLETE/exit 2；五阶段结构文档审计PASS、证据审计PASS（469引用、48 manifests、146项），四个历史Run缺结构化导出，五阶段交付、当前人工验收及Ubuntu实机证据仍开放。日志与SHA：[a98](../../evidence/audits/2026-10-09-v1-version-gate-a98.log)、[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a98.log.sha256)。

2026-10-09 A09/P5工程增量：AUTO工作流完成前新增按owner/TestRun读取CN/US Portfolio与独立FakeBroker资产的终态复核；验证市场、PAPER/FAKE模式、币种、精确现金和持仓，不匹配时阻止保存完成Run。定向Platform测试16/16、完整V1.5 code suite exit 0（含Python Worker 14/14），隔离四场景Web/API/CLI/export E2E exit 0；新断言`V1.5-AUTO-TERMINAL-RECON-001`已绑定E2E报告。机器证据：[a30代码套件](../../evidence/audits/2026-10-09-v15-terminal-reconciliation-code-suite-a30.log)、[四场景E2E](../../evidence/audits/2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-230c4258f848db04ca52.json)。失败格式断言报告保留，资源精确清理通过。此项是工作流完成时复读，不证明日历日终/结算或多日AUTO；A09/P5保持未关闭。

2026-10-09 V1正式门禁a99：本轮V1.5终态复核代码/E2E证据及阶段记录同步后重跑，版本仍INCOMPLETE/exit 2；阶段文档审计与证据审计PASS（473引用、49 manifests、147条目），历史TestRun导出、阶段收尾、当前人工验收、目标Ubuntu环境等仍未满足。链接/Hash检查和`git diff --check`通过。日志：[a99](../../evidence/audits/2026-10-09-v1-version-gate-a99.log)、[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a99.log.sha256)。

2026-10-09 A10/P5完成AUTO同ID重复派发子项：隔离Harness向真实JetStream发布已完成AUTO Run相同eventId的新消息，观察ACK和Temporal稳定Workflow ID幂等收敛；独立读取CN/US FakeBroker、Portfolio、Governance预算，订单/Fill总数仍为2，每个Mandate只消费1次，现金/持仓/账本版本及条目保持一致。四场景V1.5 E2E exit 0，Run `daf483fb-9996-4c0a-9072-114bb4c88685`：[报告](../../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-9d20807a341936dceaf1.json)。只关闭完成Run重复派发子项；活动中重复消息/撤销/在途Fill/错过窗口/交易Worker恢复仍未通过。

2026-10-09 V1正式门禁a100：纳入A10完成Run重复派发E2E及阶段记录后重跑`pnpm verify:version -- --version V1`，仍为INCOMPLETE/exit 2；阶段文档审计PASS、证据审计PASS（476引用、49 manifests、147条目）。V1.2/V1.5四个历史TestRun结构化导出缺失，五阶段收尾、新增范围人工验收及目标Ubuntu证据未满足。文档链接检查5904项、`git diff --check`及两份新增证据SHA校验通过。日志：[a100](../../evidence/audits/2026-10-09-v1-version-gate-a100.log)、[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a100.log.sha256)。

2026-10-09 A11/P5增量：V1.5隔离Harness重新执行三卷备份/恢复，PostgreSQL、JetStream、Temporal恢复后同一normal Run仍可读，120项观察PASS，四场景Web/API/CLI/export通过，精确临时资源清理通过。报告[JSON](../../evidence/audits/2026-10-09-v15-paired-backup-restore-sq-v15-e2e-0b9eff3c4bb85ced2ff0.json)，SHA `91d8f509753dd03461c6280a72ec368ec3f78607fa546cb380cbc9e011e9fb42`。该验证不含Artifact独立卷、全V1业务事实配对、宿主/异地恢复或实测RPO/RTO。正式门禁a101仍INCOMPLETE/exit 2，阶段文档与证据审计PASS（477引用、49 manifests、147项）；见[门禁日志](../../evidence/audits/2026-10-09-v1-version-gate-a101.log)及[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a101.log.sha256)。

2026-10-09 A11 Artifact恢复复验：精确只读挂载`stockquant-v12_research-artifacts-v1`，离线隔离容器归档后恢复到临时目录，33文件/1945字节逐项SHA一致；未写源卷或重启活动服务。日志[Artifact卷烟测a02](../../evidence/audits/2026-10-09-v1-artifact-volume-backup-restore-a02.log)及SHA sidecar。结合V1.5三卷恢复仅证明分开的环境切片；数据库与Artifact同一时间点配对恢复、全V1业务ID引用匹配、异地/RPO/RTO仍未验证。

2026-10-09 V1门禁a102：纳入A11 Artifact卷独立读恢复证据后重跑，仍INCOMPLETE/exit 2；阶段文档审计PASS、证据审计PASS（477引用、49 manifests、147项）。Artifact卷和V1.5三卷为分开的快照，不能证明配对一致性。链接检查5918项、差异空白检查及a02报告SHA校验通过。日志：[a102](../../evidence/audits/2026-10-09-v1-version-gate-a102.log)与[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a102.log.sha256)。

2026-10-09 V1门禁a103：加入生产集群配对备份器隔离E2E后正式门禁仍INCOMPLETE/exit 2；阶段文档与证据审计PASS（480引用、49 manifests、147项）。配对恢复机器测试覆盖全部V1服务数据库/角色及一个合成ArtifactRef，但不包含真实Run/FakeBroker事实或NATS/Temporal同点快照。`pnpm test:cluster-paired-backup` 5/5、`pnpm docs:check` 5927链接、`git diff --check`及报告Hash均PASS。历史Run导出、OD-014、全V1当前交付、人工/Ubuntu验收未满足。日志：[a103](../../evidence/audits/2026-10-09-v1-version-gate-a103.log)、[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a103.log.sha256)。

2026-10-09 P0/A11后基线复验：`pnpm baseline:check` exit 0，292 JSON、205 Schema、48 Fixture、8项服务层检查及脚本测试51/51通过；完整日志[baseline a03](../../evidence/audits/2026-10-09-v1-baseline-check-a03.log)及SHA sidecar。基线不代表业务阶段、真实数据恢复或人工/Ubuntu验收。

2026-10-09 V1门禁a104：在追加配对工具端到端和基线a03记录后重跑，正式版本仍INCOMPLETE/exit 2；阶段文档及证据审计PASS（480引用、49 manifests、147项）。当前仍缺历史Run结构化导出、OD-014所有者决策、真实业务数据/全后台卷一致恢复、阶段交付收尾、人工验收及目标Ubuntu实机证据。链接检查5933项、基线/门禁/配对证据Hashes和`git diff --check`通过。门禁[a104](../../evidence/audits/2026-10-09-v1-version-gate-a104.log)、[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a104.log.sha256)。

2026-10-09 A07/P3增量：在V1.3隔离E2E内验证5条Platform API入口，匿名5/5为401、伪造用户身份5/5为403；Playwright 21/21通过，TestRun业务状态仍`WAITING/NOT_RUN`。证据见[身份边界报告](../../evidence/audits/2026-10-09-v13-platform-identity-boundary-a01.json)及[A05矩阵](../../evidence/audits/2026-10-09-v1-cross-service-route-matrix-a05.md#v13-platform-api-匿名与伪造用户身份拒绝子矩阵2026-10-09)。仅关闭对应五条路由子项，A07/P3及阶段交付仍未关闭。

正式门禁a105（2026-10-09）：新增身份矩阵后V1仍`INCOMPLETE`/exit 2；阶段文档与证据审计PASS（482引用、49份Manifest、147项），`docs:check`为5943链接/0失败。历史Run导出、阶段收尾、OD-014、当前范围人工验收、Ubuntu及实际业务数据配对恢复未满足。日志：[a105](../../evidence/audits/2026-10-09-v1-version-gate-a105.log)及[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a105.log.sha256)。

2026-10-09 A07/P3增量：V1.3 Platform身份探针覆盖全部24条用户API路由（23个V1.3控制器操作+账户详情），匿名24/24返回401、伪造身份24/24返回403；完整隔离E2E 21/21通过，精确清理容器、网络和卷。21个TestRun仍`WAITING/NOT_RUN`。证据：[a02](../../evidence/audits/2026-10-09-v13-platform-identity-boundary-a02.json)；A05及阶段手册已更新。仅关闭此Platform路由子项，A07/P3仍开放。

正式门禁a106（2026-10-09）：阶段文档与证据审计通过（484引用、49份Manifest、147项），文档链接5953项/0失败；正式V1仍`INCOMPLETE`/exit 2，历史TestRun导出、P1～P5余项、OD-014、当前范围人工验收、Ubuntu实机和实际业务配对恢复均未完成。见[a106](../../evidence/audits/2026-10-09-v1-version-gate-a106.log)及[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a106.log.sha256)。

正式门禁a107（2026-10-09）：V1.3全24路由身份矩阵被证据审计接受；阶段文档/证据审计PASS（484引用、49份Manifest、147项），版本门禁仍`INCOMPLETE`/exit 2。历史Run、各阶段剩余收尾、OD-014、人工验收、Ubuntu实机与实际业务配对恢复仍未满足。见[a107](../../evidence/audits/2026-10-09-v1-version-gate-a107.log)及[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a107.log.sha256)。

2026-10-09 A07/P3覆盖纠正：源代码路由枚举确认V1.3 Platform控制器为25个操作。早先a02身份报告仅覆盖其中23个，已标记为`PARTIAL_SUPERSEDED`；Harness现从控制器源码提取方法/路径并断言25/25唯一匹配身份探针。补齐TestRun读取与Fill费用更正后，26条路径（加账户详情）匿名26/26返回401、伪造身份26/26返回403，隔离Web/API/CLI E2E 21/21通过并精确清理。最终证据：[a03](../../evidence/audits/2026-10-09-v13-platform-identity-boundary-a03.json)，[E2E日志](../../evidence/audits/2026-10-09-v13-platform-route-inventory-e2e-a02.log)。21个TestRun仍`WAITING/NOT_RUN`，该子项不关闭P3整体。

正式门禁a108（2026-10-09）：V1仍`INCOMPLETE`/exit 2；阶段文档与证据审计PASS（485引用、49份Manifest、147项），`docs:check`为5969链接/0失败。V1.3 Platform全路由身份证据已对照源码闭环；历史Run导出、其他P1～P5交付、OD-014、当前人工验收、Ubuntu实机及实际业务配对恢复未完成。见[a108](../../evidence/audits/2026-10-09-v1-version-gate-a108.log)及[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a108.log.sha256)。


2026-10-09 V1.5/P5单日EOD纵切执行：冻结`v1.5-auto-trade-calendar-1`合成开/收市Fixture，AUTO活动在收盘后重读Portfolio/FakeBroker并核对，Web增加收盘状态视图与`V1.5-AUTO-EOD-RECON-001`断言。最终源码Hash快照四场景Web/API/CLI/export E2E exit 0，TestRuns `535c55a8-7731-4882-bff2-acb10df409e1`、`10375744-6480-4c7d-9bf3-403d063292d7`、`ee22a041-3455-4ad6-99b6-c83a50d1f2f5`、`70bc5c3d-0ddf-4f4a-8d22-f0319b753b78`；报告[JSON](../../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-0dfba7eada488cb3a0fa.json)，SHA-256 `b05ab89db705c89ee95cf3f9a259a77b2a7c3ff3c00d7b62a1bb9001a046c741`。V1.5最终代码套件exit 0，含锁定Python Worker 14/14、全部类型/合同/服务测试及隔离PG集成：[日志](../../evidence/audits/2026-10-09-v15-single-session-eod-code-suite-a02.log)，SHA-256 `31073a42b0da1ea247f5c831b5fc5a2ed3582fb745602c41c75298e01477a8d7`。E2E日志[链接](../../evidence/audits/2026-10-09-v15-single-session-eod-e2e-a02.log)，SHA sidecar随文件。此项仅验证单个合成日，不证明真实市场时钟、多日调度、结算规则或用户人工验收。

2026-10-09 P1/A04手册与V1.1交互生命周期执行：当前树`pnpm test:e2e -- --stage V1.1` exit 0，normal/rejection/recovery Chromium 3/3，三条Run同UUID CLI `--check-only`及证据导出/Manifest Hash均PASS；`stack:up`独立交互栈、`/api/v1/session`与Web健康探针、精确`stack:down`也完成。实跑发现stack:down漏删项目镜像，已改为仅移除注册项目自己的tag、失败保留state便于重试，新增4单测并在新随机项目验证全资源0残留。机器证据见[8.14手册运行报告](../../evidence/audits/2026-10-09-v11-current-worktree-e2e-a03.json)及[生命周期报告](../../evidence/audits/2026-10-09-v11-interactive-stack-lifecycle-a02.json)。V1.1手册更新为VERIFIED_EXECUTABLE（隔离工程说明范围）；用户当前范围验收NOT_RUN，A04调用矩阵、Artifact治理、活动存储切换/回退仍开放。

2026-10-09 P1/V1.1本轮收尾复核：补齐验收表当前三条Web Run及手册实际按钮/未执行人工刷新项；`pnpm docs:check` 6045链接/0失败，`pnpm baseline:check`通过（55项脚本测试）。正式V1门禁[a125](../../evidence/audits/2026-10-09-v1-version-gate-a125.log)仍INCOMPLETE/exit 2，阶段文档PASS、证据审计PASS（511引用、55份Manifest、153项）。缺4个历史Run原始导出、P1～P6剩余交付、OD-014所有者决策、全V1业务/Artifact配对恢复、目标Ubuntu和当前范围人工验收；此条不关闭V1.1阶段。

2026-10-09 P3/V1.3手册与当前树复验：正式`pnpm test:e2e -- --stage V1.3` exit 0，21/21；完整`pnpm verify:stage -- --stage V1.3 --suite code` exit 0。独立`stack:up`项目`sq-v13-web-f80938d5f5af5e665db3`的Web/session均200，精确`stack:down`为STOPPED_AND_PURGED。V1.3第8节修正固定端口/伪造用户头和待实现说明，限定手册VERIFIED_EXECUTABLE仅覆盖Mac ARM64隔离操作；Ubuntu、完整市场规则及当前范围人工验收未过。[结构化证据](../../evidence/audits/2026-10-09-v13-current-worktree-evidence-a01.json)、[code suite](../../evidence/audits/2026-10-09-v13-current-tree-code-suite-a01.log)、[E2E](../../evidence/audits/2026-10-09-v13-current-tree-e2e-a02.log)。V1.3仍PARTIALLY_IMPLEMENTED。


2026-10-09 P3/A07 V1.3治理授权入口增量：扩展隔离HTTP+PostgreSQL smoke，对 Proposal execution authorization 的 create/validate 两条真实路由验证Platform身份403、Trade caller与错误Bearer组合403、匹配Trade身份但畸形载荷422，且数据库未产生授权行；完整 `pnpm test:service-auth:http` exit 0，临时PostgreSQL清理通过。[日志](../../evidence/audits/2026-10-09-v13-proposal-auth-http-boundary-a01.log)，SHA-256 `084a1481c424c95b0f72ef531053d00d60242ba287a502939f89f408d7f4c2f6`。此为身份边界/失败关闭证据；有效已批准Proposal的签发与消费仍未通过完整Trade→Governance→FakeBroker端到端验证，不关闭P3/A07或阶段验收。
2026-10-09 P3/A07成功链增量：同隔离smoke新增真实Proposal create/approve→Trade grant→command tamper denial→并发validate，确认authorization row最终绑定精确owner/TestRun/account/command且只消费一次；V1.3完整code suite在改后exit 0。[HTTP+PG日志](../../evidence/audits/2026-10-09-v13-proposal-auth-http-pg-a03.log)，SHA-256 `145e9f69f345561bc468306054ec2c7afc59e357afe3ee795406bcd190e14cea`；[完整套件a224](../../evidence/audits/2026-10-09-v13-code-suite-a225.log)，SHA-256 `a98d65c8c85ed7c6512888839d3717a5e9252f0c73621fa75298ce51b73829c6`。此处止于Governance grant/validate，不代表Trade真实客户端到FakeBroker/Portfolio的同Run验收。
2026-10-09 P3/A07授权与Replay身份切片：V1.3完整code suite中的隔离HTTP/PG smoke现将Governance授权签发/校验、Mandate预算owner/TestRun读回，以及Replay Worker read/submit/lifecycle/recover-unknown的允许、拒绝和畸形请求行为写入[A05路由矩阵](../../evidence/audits/2026-10-09-v1-cross-service-route-matrix-a05.md#v1-governance-authorization--replay-worker-服务身份与错误路径切片2026-10-09)。代码套件exit 0；未覆盖有效Replay完整执行或全V1接受路径，故只关闭身份/失败关闭子切片，不关闭P3/A07。

2026-10-09 P4/V1.4当前树复验：完整code suite与隔离E2E均exit 0（5/5浏览器用例），交互栈启动/三端点健康检查/精确清理通过；五组浏览器截图/Trace已按逐文件SHA登记。stack-up首次失败及修复后成功日志均保留。手册已验证为Mac ARM64隔离操作可执行；OD-014所需结算语义、完整Paper同输入账本对照、适用规则和人工验收仍开放。最终工作区Hash `sha256:3e00461cbac3bbdd37c985fc6800adc6154eb0f47199b0b67a378ef4ca51af91`。正式门禁[a129](../../evidence/audits/2026-10-09-v1-version-gate-a129.log)exit 2，文档审计PASS、证据审计PASS（525引用、57份Manifest、196项）；历史TestRun结构化导出缺失及五阶段验收项仍阻止V1完成。

正式门禁a130（2026-10-09）：V1.4截图/Trace补齐并完成code suite复验后，五阶段文档审计PASS、证据审计PASS（527引用、57份Manifest、196项），版本门禁仍INCOMPLETE/exit 2；四个V1.2/V1.5历史Run结构化导出缺失，OD-014、全阶段剩余业务交付、配对恢复、Ubuntu和当前范围人工验收未满足。见[门禁日志](../../evidence/audits/2026-10-09-v1-version-gate-a130.log)及[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a130.log.sha256)。

正式门禁a131（2026-10-09）：V1.4浏览器证据目录/逐文件Hash纳入阶段手册后，阶段文档PASS、证据审计PASS（527引用、57份Manifest、196项），正式门禁仍INCOMPLETE/exit 2；历史Run缺失和P1～P6交付/决定/环境/人工验收继续阻断。见[门禁日志](../../evidence/audits/2026-10-09-v1-version-gate-a131.log)及[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a131.log.sha256)。

正式门禁a132（2026-10-09）：补充说明Playwright Trace中的临时会话值已脱敏后，阶段文档审计PASS、证据审计PASS（527引用、57份Manifest、196项）；V1仍INCOMPLETE/exit 2，缺失历史导出及剩余交付/决定/环境/人工签署没有变化。见[门禁日志](../../evidence/audits/2026-10-09-v1-version-gate-a132.log)及[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a132.log.sha256)。

2026-10-09 A01/P0局部交叉索引更新：V1.4 §7-L64/L65/L68现绑定当前勾选锚点、五个浏览器E2E测试名、交互栈生命周期日志和截图/Trace逐文件SHA清单；逐项源行/测试名/证据引用存在性检查3/3 PASS，见[刷新审计](../../evidence/audits/2026-10-09-v14-crosswalk-refresh-a01.json)。此更新只核验V1.4第7节交付记录；A01整体语义符合性、P4业务一致性和V1.4人工验收保持开放。

2026-10-09 P5增量：完成AUTO错过首日Fixture窗口后的次日重评估纵切。四场景Web/API/CLI/export E2E及完整V1.5 code suite均exit 0，机器报告及边界见[进度记录](../progress.md)。这不关闭P5其余恢复路径或V1验收条件。

2026-10-09正式V1门禁复核a138：五阶段文档审计与证据引用审计均PASS（533引用、57份Manifest、196项），版本仍INCOMPLETE/exit 2。四个历史TestRun导出、P1～P6其余交付、OD-014、全V1配对恢复、Ubuntu和人工验收仍是未关闭条件；[门禁日志](../../evidence/audits/2026-10-09-v1-version-gate-a138.log)。

2026-10-09正式门禁复核a139：阶段与证据引用审计PASS（533引用/57份Manifest/196项），V1仍INCOMPLETE/exit 2，未关闭条件见[日志](../../evidence/audits/2026-10-09-v1-version-gate-a139.log)。

2026-10-09 P0/A05增量：V1.5双日Fixture错过窗口证据已回写145项需求—测试交叉表，并核对两个父项当前源锚点、精确测试名和18条证据路径；检查PASS但父项保留PARTIAL，详情见[审计A02](../../evidence/audits/2026-10-09-v15-missed-window-crosswalk-a02.json)。

2026-10-09 P0/A06-A07：刷新145条当前交叉表锚点，核对1,058个来源/计划/验收/证据路径与96条精确测试名，A07 PASS。A06发现并保留XMK-03源文件路由错误，修复后A07全量复核通过。此项是索引完整性，不替代父项语义与测试覆盖审计。[审计](../../evidence/audits/2026-10-09-v1-crosswalk-link-audit-a07.json)。

2026-10-09正式V1门禁a141：P0全局交叉索引刷新后重跑，阶段/证据文档审计均PASS（531引用/57份Manifest/196项）；V1仍INCOMPLETE/exit 2，条件与a139相同。见[门禁a141](../../evidence/audits/2026-10-09-v1-version-gate-a141.log)。

2026-10-09 P5/V1.5操作手册增量：补入可复核的本机工具版本、隔离会话和FAKE/LIVE边界、两份Fixture Hash、随机项目精确清理方法、超时及已验证命令；历史E2E Run ID明确标为已清理、不可复用。文档链接检查6136/6136，diff whitespace检查通过。正式门禁a142文档/证据审计PASS，但版本仍INCOMPLETE/exit 2（531引用、57份Manifest、196项），缺失条件同a141。[门禁](../../evidence/audits/2026-10-09-v1-version-gate-a142.log)，SHA-256 3813819b9cec3e6550529672fe45d5fdc48bf32cd3ad5fe994602afc9bb6d626。

2026-10-09 P5/V1.5 §8.3手册复核：按Web真实标题、场景选择器与按钮更新逐步操作；normal/AUTO事实与rejection/recovery NOT_RUN明确区分。pnpm docs:check检查6138个链接0失败，git diff --check通过。门禁a143仍INCOMPLETE/exit 2，文档/证据审计PASS（531/57/196）。四个历史TestRun在可用API返回404，历史缺口只能由准确原始记录/结构化导出/授权备份恢复，不能用新Run冒充。[门禁](../../evidence/audits/2026-10-09-v1-version-gate-a143.log)。

2026-10-09 P5证据更正：回查原始E2E测试而非旧手册摘要，确认V1.5 rejection场景的暂停后403/零副作用断言、recovery场景的FakeBroker提交后响应丢失→原clientOrderId查询暂不可用→同原单恢复均为PASS，双市场独立账本匹配；同Run CLI/export也通过。更新阶段手册当前操作步骤与证据记录。限定切片PASS不代表基础设施故障/配对备份恢复/完整V1恢复或人工验收；详情见阶段第8节与最新机器JSON。

2026-10-09 V1门禁a144：更正恢复证据与阶段手册后复核，五阶段文档审计PASS、证据审计PASS（532引用/57 Manifest/196条目），版本仍INCOMPLETE/exit 2；四个历史TestRun结构化导出及P1～P6交付/决定/配对恢复/Ubuntu/人工验收继续开放。[门禁](../../evidence/audits/2026-10-09-v1-version-gate-a144.log)，SHA-256 144cb84f3c809517e7539bdc06753022e460419d3afea309409bccdc75a35537。

2026-10-09 P5/V1.5交互手册复验：当前工作区真实启动随机隔离栈，动态Web/API路由HTTP 200，确认PAPER+FAKE、LIVE关闭；按启动器打印的精确项目命令关闭并验证项目容器/卷/网络/镜像/秘密文件清理，退出0。首轮受限loopback EPERM记录为失败历史，获准后同一验证成功；不触碰其他栈，人工验收保持NOT_RECORDED。[生命周期审计](../../evidence/audits/2026-10-09-v15-interactive-stack-lifecycle-a01.json) SHA-256 6713de9b95f0ceff1c4679a4a940a21b3cf2a94ce2d538ee8fee8becae0653ec。

2026-10-09门禁a145：V1.5运行手册/当前交互栈生命周期证据回写后，五阶段文档与证据审计PASS（533/57/196），V1仍INCOMPLETE/exit 2。未满足项包括4条历史结构化Run导出、各阶段剩余交付、OD-014与结算实现、全V1配对恢复、Ubuntu及人类验收。[a145](../../evidence/audits/2026-10-09-v1-version-gate-a145.log)，SHA-256 d5f4c728ff21f60c0fce67e0733df8f4ad527e19eca02c9214a2d4d6b596b786。

2026-10-09 P0/A01、P5/V1.5更新：最新原始四场景E2E确认固定暂停拒绝/UNKNOWN恢复/MISSED_WINDOW次日重评估/单日收盘对账的自动断言结果，计划A09/A10状态已按剩余多日、结算、撤销/在途Fill、交易Worker恢复收敛。V1.5 §8已实测固定手册步骤与随机栈精确启停；更新99验收表和§7文档交付勾选，人工验收仍NOT_RUN。145项crosswalk本轮刷新29个精确源行锚点；145/145锚点、196唯一路径、90精确测试字面引用A08 PASS。交叉索引SHA-256 9a44d2c2e4b7ea2ec7aa67922ba3cebfed29feae6d9f0072b2b5fd4da8a6f854；[A08审计](../../evidence/audits/2026-10-09-v1-crosswalk-link-audit-a08.json)。A01语义符合性和V1正式关闭条件继续开放。

2026-10-09正式门禁a146：更新本计划/进度/验收表及A08交叉索引审计后重跑，五阶段文档审计和引用Hash审计PASS（535引用/57 Manifest/196条目），V1仍INCOMPLETE/exit 2；四条历史结构化Run导出及工程、决定、配对恢复、Ubuntu、人工验收缺口仍在。[日志](../../evidence/audits/2026-10-09-v1-version-gate-a146.log)，SHA-256 9c58eeedadd3e60b9321d53dfde1949a8ccd660d4de6844e422a2473fa549605。

2026-10-09 P0/A01跨服务矩阵语义纠正：逐一追踪 `getCnAShareCalendarSession` 的真实调用点后，确认它不属于V1.2日线Fixture调用链；V1.2只调用Market Data正常/未来Fixture预览。该生成操作实际由V1.3 SessionAdvance注入并调用，合同仍复用V2.4 Market Observation schema，Market Data `/v2/calendar/cn-a-share/{date}` 读取路由本身不要求Bearer。已将A05矩阵拆成V1.2 Fixture与V1.3会话推进两行，避免把V2.4能力/真实日历误记为V1.2验收项；依据为 `services/platform-api-service/src/bootstrap/app.module.ts` 的 `readCalendarDay` 注入、`services/platform-api-service/src/application/v24-live-observation.ts` 的生成客户端调用及 `services/market-data-service/src/bootstrap/main.ts` 路由。`pnpm docs:check` 6156链接/0失败、`git diff --check`通过。此为源路由归属修正，不关闭A01语义审计或V1.3日历正确性验证。

2026-10-09继续P0/A01：A05初审所引Market Data service-auth测试使用旧的日历路径 `/v2/calendar/CN_A?date=...`，与当前OpenAPI/实际路由不一致。已改成实际 `GET /v2/calendar/cn-a-share/2026-09-27`，使测试明确保护“日历仅内网可读、不要求服务Bearer”的既定边界；`pnpm --filter @stockquant/market-data-service exec vitest run tests/unit/service-auth.spec.ts` 3/3通过。此修复只加强身份边界测试的路径准确性，不改变合同、安全策略或真实日历验收状态。

2026-10-09继续P0/A04：隔离Market Data HTTP smoke通过随机loopback端口验证日历正常交易日TRADING、休市日CLOSED、覆盖外UNKNOWN和非法日期400共4例；数据库未配置，调度器/采集执行器关闭。首轮受限沙箱绑定端口遇EPERM，记录失败后在本轮授权的隔离本机回归下同命令成功，未触碰活动服务。日志[calendar HTTP smoke](../../evidence/audits/2026-10-09-v1-calendar-http-smoke-a01.log)，SHA-256 `a18ee673ae365acdcef89395fec64ef092daa70b1d17f3ef7502a544f2e874d2`。这确认路由和既定内网边界，不证明完整市场日历，也不关闭A04整体。

2026-10-09 P5/A09-A10执行增量：冻结新Fixture `v1.5-auto-trade-calendar-2`，CN/US各三日，首日错过后各执行两次并逐日做Portfolio/FakeBroker收盘双账本核对；完成正常、暂停拒绝、UNKNOWN原单恢复、重复Activity投递的四场景隔离Web/API/CLI/export E2E，零外部数据/真实券商调用，精确回收随机隔离资源。机器报告：[E2E JSON](../../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-aede7e79765691df51db.json)，SHA-256 `79ee291fc37992e32f6c781d85be0542ab7e6d6dd053718b1dd857673b3414a5`；四个TestRun：normal `1a0dbb2a-8f7e-4326-ab19-8092a052ddc6`、AUTO `677a2a13-ac5c-4989-8059-66f525d0e330`、rejection `3b95ebcf-588f-4693-928c-55d8b4a0dc93`、recovery `214175d3-4721-42c9-8549-735b3721b648`。`pnpm verify:stage -- --stage V1.5 --suite code`退出0：[日志](../../evidence/audits/2026-10-09-v15-multi-session-code-suite-a01.log)，SHA-256 `c872609248da52cef548fe4756f4a786962a78bd51cb241bfd4180e021ab219d`。手册、当前进度和V1.5验收记录已同步。此自动化结果仅覆盖合成日历和固定Fixture，不证明真实市场日历、连续实时时钟、结算、取消/在途Fill、真实Ubuntu或人工验收；P5与V1版本关闭条件仍开放。下一步执行正式V1版本门禁并按结果保存日志。

2026-10-09正式V1门禁a147：本轮阶段与证据索引复核PASS（541个引用、57份Manifest、196项），但V1仍INCOMPLETE/exit 2。门禁报告仍列历史结构化Run导出缺失及未检查/未完成的版本条件；V1.5新增范围人工验收、各阶段其余交付、OD-014/结算、全V1配对恢复和目标Ubuntu仍未关闭。[原始日志](../../evidence/audits/2026-10-09-v1-version-gate-a147.log)，SHA-256 `b062657db796bc33ce70e083e2394eaea334221dca50674bf3603c5927a9a635`。不得将V1.5自动化PASS写成版本完成。

2026-10-09正式V1门禁a148：在本轮最终文档/证据链接更新后复跑；阶段文档审计PASS、证据审计PASS（542引用、57份Manifest、196项），V1仍INCOMPLETE/exit 2。四条历史Run结构化导出缺失分别为V1.2 `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`及V1.5 `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`；新增范围人工签署、OD-014/结算、Ubuntu及其它V1阶段关闭要求仍未满足。[原始门禁日志](../../evidence/audits/2026-10-09-v1-version-gate-a148.log)，SHA-256 `e75ce25e5ee464728e97d589496a1fa3a4600e8819a636f5ae8a256b0f239cae`。

2026-10-09 P0/A01与P5交叉表增量：将最新三日AUTO Fixture、两次执行/逐日双账本对账、V1.5完整代码套件及四场景Web/API/CLI/export证据回写至9条需求行；修正“交易工作流尚未实现”和“只覆盖只读正常场景”等过时表述。逐条精确测试名称、Fixture/Manifest及E2E/代码套件证据路径检查通过，需求完成分类未改变；真实交易日历/结算、实时时钟、取消/在途Fill/Worker恢复、Ubuntu和人工验收保持OPEN。详见[刷新审计](../../evidence/audits/2026-10-09-v15-multi-session-crosswalk-refresh-a01.json)，交叉表SHA-256 `30d8c9b5ac3e0e67c5d4dedb0e5ad79d268c2078fae26fa415af6cf8340d68e9`。

2026-10-09正式V1门禁a149：交叉索引刷新和进度更新后复跑，五阶段文档审计PASS、证据审计PASS（543引用、57份Manifest、196项），版本仍INCOMPLETE/exit 2。四条历史TestRun结构化导出缺失、当前范围人工签署、OD-014及结算实现、目标Ubuntu和各阶段剩余交付继续阻止版本关闭。[门禁日志](../../evidence/audits/2026-10-09-v1-version-gate-a149.log)，SHA-256 `9de4ed6467368c35b9ba8052d3f3da9a1cb21e93993fee47175c31da4ab351a6`。


2026-10-09 P5成交级追溯增量：V1.5页面新增当前Run的Fill选择器，E2E对AUTO的4笔成交逐一切换并核对关联Proposal/Mandate/Order、Outbox和Portfolio/FakeBroker现金；四场景隔离E2E PASS，完整V1.5 code suite exit 0。详细验收步骤与Run ID见[V1.5 §8.15](../prd/v1-local-simulation/05-scheduling-and-recovery.md#815-当前run成交级链路选择复验2026-10-09)，[交叉表更新](../../evidence/audits/2026-10-09-v15-fill-trace-crosswalk-refresh-a01.json)。此项只关闭当前TestRun成交选择/显示子项，告警/能力阻塞、跨Run/跨阶段追溯和全部V1门禁余项仍开放。

2026-10-09 正式V1门禁复核a150首次发现新增E2E日志sidecar使用了不正确的相对路径，证据审计FAIL；该失败记录保留。修正sidecar为仓库根路径后，a151阶段文档审计PASS、证据审计PASS（548引用、58份Manifest、196项、0失败），V1仍INCOMPLETE/exit 2；四条历史Run结构化导出、OD-014/结算、Ubuntu、人工验收及各阶段其它交付继续阻塞。[a150失败门禁](../../evidence/audits/2026-10-09-v1-version-gate-a150.log)；[a151门禁](../../evidence/audits/2026-10-09-v1-version-gate-a151.log)，SHA-256 `d8c945befce8f3d90a1fe861edeca3b076b19538761cc00fd4e5785519767da3`。


2026-10-09 P5/A10交易恢复增量：新增真实Trade Execution容器kill/restart注入，时点位于FakeBroker Order/Fill持久提交后、HTTP响应前；Temporal活动重试并经授权幂等读取同一原clientOrderId。完整四场景Web/API/CLI/export E2E通过，AUTO同Run逐日账本MATCH，外部数据/真实券商调用0，隔离资源精确清理；V1.5完整code suite exit 0。报告[JSON](../../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-9ab3f1b90438b7f715eb.json)，SHA-256 `1886eae2af5356c2b347f8b339a51489de069753f32e8ae65ffa57929d6611f7`；[代码套件](../../evidence/audits/2026-10-09-v15-trade-worker-restart-code-suite-a01.log)，SHA-256 `89168b7cb6bd158ec2982f4e5ce4b3768131db7c11fbcc9ad51c5a38eb55fb41`；[需求追踪刷新](../../evidence/audits/2026-10-09-v15-trade-worker-restart-crosswalk-a01.json)。此证据不关闭Trade多Worker接管、取消/在途Fill、Settlement、实时调度或全V1恢复。


2026-10-09正式V1门禁a152：新增Trade进程重启E2E、完整V1.5 code suite和阶段验收记录后复跑；五阶段文档审计PASS，证据审计PASS（553引用、59份Manifest、198项、0失败），版本仍INCOMPLETE/exit 2。四条历史Run导出、OD-014结算决策与实现、目标Ubuntu、当前范围人工签署及其它阶段关闭要求仍未满足。[a152日志](../../evidence/audits/2026-10-09-v1-version-gate-a152.log)，SHA-256 `bbcf3a33353d46549d90de1996935fd3ee8f22abcbcd20ca9448f80881b9bedf`。

2026-10-09 P5状态复核：隔离E2E a05和V1.5 code suite a25确认Mandate暂停后新订单在资源预留/FakeBroker发送前被拒绝，已授权订单继续Fill与账本入账；因此暂停语义已验证，不再列作缺项。撤销/在途Fill竞态和多Worker交易接管仍开放。详见[V1.5 §8.10](../prd/v1-local-simulation/05-scheduling-and-recovery.md#810-mandate暂停后的在途授权订单2026-10-09)。正式V1门禁a154重跑：五阶段文档审计PASS，证据审计PASS（555引用、59份Manifest、198项、0失败），仍INCOMPLETE/exit 2。四条历史TestRun导出、OD-014/结算、Ubuntu、当前范围人工签署及各阶段剩余工程要求仍未满足。[a154日志](../../evidence/audits/2026-10-09-v1-version-gate-a154.log)，SHA-256 `c1ac607713baa904d673a141e7849931d8829e6f0860748bf4a1857abd9889a0`。

2026-10-09验收表同步本轮P5自动证据后，`pnpm docs:check`通过6219条链接；正式门禁a155阶段文档审计PASS、证据审计PASS（559引用、59份Manifest、198项），版本仍INCOMPLETE/exit 2。四条历史Run结构化导出、各阶段其余工程/交付、OD-014与结算实现、目标Ubuntu及当前范围人工验收仍未满足。[a155日志](../../evidence/audits/2026-10-09-v1-version-gate-a155.log)，SHA-256 `5b7c2fc64336442afda8274cae7f362367f3c435a36a9a22e9851ac533862440`。

2026-10-09 V1.3当前树Trade回归复验：在共享Trade Execution改动后重新运行`pnpm test:e2e -- --stage V1.3`，21/21通过。L07部分成交撤单Run在Trade重启后继续应用第二笔合法Fill并消费已接受撤单结果；累计成交150、取消余量50、预留释放且独立账本MATCH。此证据重验V1.3共享订单语义，不改变P5 AUTO撤销编排仍待验的分类。[机器审计](../../evidence/audits/2026-10-09-v13-current-tree-cancel-restart-e2e-a01.json)，SHA-256 `2552317ce19d1b0c7ff4e742f4f69695bc489d3f816218410b5ea3af7eda55a3`。

2026-10-09 P0/A01补强V1.1-S2-L13：为共享公共Schema核心字段生成增加具名TS/Python回归测试，覆盖Money、Security、AccountInitializationFixture、AccountSnapshot、ClockContext、TestRun所有Schema属性及required状态，并纳入`contracts:check`。定向测试、合同漂移检查和V1.1完整代码套件均通过；交叉表明确消费者覆盖仍未闭合，父项保持PARTIAL/HISTORICAL。详见[V1.1阶段§8.15](../prd/v1-local-simulation/01-environment-and-web-center.md#815-核心公共schema的tspython字段回归2026-10-09)、[代码套件日志](../../evidence/audits/2026-10-09-v11-core-schema-parity-code-suite-a01.log)及更新后的[交叉表](../../evidence/audits/2026-10-09-v1-requirement-test-crosswalk.json)（SHA-256 `36b04c923d521dcdd1ce932514fbef75dcd744d1beb5b11f4750dc5b6f4bcb85`）。

2026-10-09 V1.1 §7合同/场景冻结交付核验：当前树完整V1.1 code suite和normal/rejection/recovery Web/API/CLI/export矩阵均通过，三个Run各有2项PASS且manualConclusion为`NOT_RUN`。只将V1.1 §7第一项勾选为已冻结，不影响其余开发、交付、人工验收或V1版本状态；追踪行V1.1-S7-L65增加精确测试/运行证据并记为RECHECK。[当前E2E日志](../../evidence/audits/2026-10-09-v11-core-contracts-current-e2e-a01.log)，SHA-256 `abb64c038f019049358a380cbb4c90f79bf254c4f1c36077721f4b97df1be7b0`。

2026-10-09 P5 Platform dispatch Worker故障接管：运行`STOCKQUANT_V15_E2E_WORKER_FAILOVER=true pnpm test:e2e -- --stage V1.5`，隔离E2E四场景PASS。normal Run `f8452489-f768-40b6-9814-06a0365c025a`中主/备用durable收到同一seq=1后，实际终止主Platform容器，备用Worker启动同Run CN_A Activity、ACK原消息；主API恢复后Run完成120项权威读取。报告[JSON](../../evidence/audits/2026-10-09-v15-worker-failover-sq-v15-e2e-17f973b67e6e20e35f29.json)，SHA-256 `04785fad1307daea62fbdfaeb7f6e26c15cd29ec6d09148eca401abe2b29a403`。只关闭Platform dispatch单进程接管；Trade业务Worker故障切换、撤销/在途Fill、结算、真实多日及人工/Ubuntu验收仍开放。


2026-10-09 P5/AUTO取消子项：V1.5新增owner/TestRun范围的持久AUTO取消请求，Worker在每个订单发送边界检查取消；取消到达已授权订单期间时等待该订单完成FakeBroker Fill和独立账本对账，随后不再发送后续订单。Web按钮连接同一API。隔离E2E在授权后、FakeBroker发送前通过正式Web按钮触发，最终一笔Order/Fill、MATCH、laterSessionOrdersCreated=0；AUTO-CANCEL断言PASS、完整四订单断言WAITING。四场景Web/API/CLI/export E2E exit 0，报告[JSON](../../evidence/audits/2026-10-09-v15-auto-trade-cancellation-sq-v15-e2e-967e0b65c09fe54c5332.json)，SHA-256 `2b41b3eb1fa48082f635f8799ccc2756427e5d5b27defc53ba33edc25a2d54c5`。撤销Run保持WAITING；实际FakeBroker订单撤销/部分Fill竞态、OD-014结算和人工验收仍开放。


2026-10-09执行增量：V1.5 TestRun级AUTO取消已实现并通过容器化Web/API/Temporal/FakeBroker四场景E2E、完整V1.5代码门禁；执行证据与保留缺口见[当前进度](../progress.md)及[V1.5阶段§8.19](../prd/v1-local-simulation/05-scheduling-and-recovery.md#819-auto-testrun取消与当前授权fill收尾2026-10-09)。V1门禁复验仍INCOMPLETE，历史Run导出、结算规则决定、实际FakeBroker撤单/部分Fill、Ubuntu和当前范围人工验收未关闭。

2026-10-09 P5可执行交接补齐：隔离取消Harness日志和JSON报告输出实际随机Web/API URL；复跑Web/API/CLI/export四场景通过后，将URL用途/生命周期、Fixture版本Hash、正式页面按钮、超时、预期Run断言和失败清理方法写入V1.5 §8.19.1，并更新验收表/交叉索引。该操作改进不替代用户手动验收或FakeBroker真实撤单/部分Fill。

最终门禁复验（2026-10-09 a03）：五阶段文档审计PASS，证据审计PASS（581引用/60份Manifest/199条目），V1仍exit 2/INCOMPLETE；V1.2/V1.5共4个旧TestRun无结构化导出，版本摘要/人工/环境条件未通过。[日志](../../evidence/audits/2026-10-09-v1-version-gate-auto-cancel-a03.log)，SHA-256 `e0768bf9ea52be8505d75752d407250f4525ec674c6b9fd6b4ec4492765d42a4`。

2026-10-09 P5 AUTO取消请求重试恢复已实现：客户端在取消请求被持久保存但响应丢失、Workflow完成后重试时，仍返回同一请求的202与原requestedAt，历史不重复。完整V1.5代码套件exit 0、Web/API/CLI/export四场景E2E及隔离PostgreSQL集成通过；V1.5 §8.19.1及交叉矩阵已更新。此项不替代FakeBroker部分成交撤单竞态或OD-014结算范围。

正式V1门禁a04复核：五阶段文档和本地证据审计通过（581引用、61份Manifest、200条目）；V1仍exit 2/INCOMPLETE，原因含4个缺失历史Run导出、版本摘要/门禁未签、当前人工与环境验收未完成。[日志](../../evidence/audits/2026-10-09-v1-version-gate-auto-cancel-a04.log)，SHA-256 `16dcce5e06db7e48ada404b6c279f048ea282be03374a29e6733ff11064f746f`。

2026-10-09 P5配对备份工具链复验：`pnpm test:backup:cluster-isolated` 在受控Docker上下文exit 0，恢复校验覆盖十个V1服务数据库/角色及一个合成Published Artifact内容Hash，并精确清理随机资源；默认沙箱Docker socket受限的exit 1保留。报告[JSON](../../evidence/audits/2026-10-09-v1-isolated-cluster-paired-backup-a9366d9c50ee4001.json)，SHA-256 `cfaff400ac5e1d5ee87969bc34b06e65778dfbe3034f455607922a26fe0c8842`。此为备份器/结构切片，不含真实Run账本或NATS/Temporal同点配对，故不关闭计划中的全V1业务数据配对恢复工作包。

正式V1门禁a171：备份器复验与当前文档引用纳入检查后，五阶段文档审计PASS、证据审计PASS（582引用、61份Manifest、200条目），正式版本仍INCOMPLETE/exit 2。4条历史Run结构化导出、OD-014、剩余阶段交付、全V1真实业务配对恢复、Ubuntu及人工验收仍开放；版本摘要/门禁也未勾选。[日志](../../evidence/audits/2026-10-09-v1-version-gate-a171.log)，SHA-256 `c2498d23959cea6e2280ebe71806385576def1718067f615125617095d4df794`。

P0/A01增量：V1.5-S2-L21交叉索引保留原引用并加入本轮备份报告；6个唯一路径存在性检查PASS，父项仍OPEN，报告[JSON](../../evidence/audits/2026-10-09-v1-crosswalk-paired-backup-a01.json)，交叉表SHA `516b99c7b44ab7259b23a6f8740142fff48a630a353653bde6dc75040f2086b7`。a172正式门禁重新检查后仍INCOMPLETE/exit 2，五阶段文档/证据审计PASS（582/61/200）；[日志](../../evidence/audits/2026-10-09-v1-version-gate-a172.log)，SHA与a171相同。

P5 AMD64仿真补证：扩展`verify:compat`允许显式镜像标签，避免覆盖已有默认镜像；在Mac ARM64宿主构建并运行`linux/amd64` Platform API，容器探针确认Node v24.1.0/x64，PASS后精确删除临时镜像。该项只是目标架构模拟，不是Ubuntu实机。日志[SHA-256](../../evidence/audits/2026-10-09-v1-linux-amd64-compat-a173.log.sha256)。合同/Fixture检查PASS（202 schemas、111 consumer rules、29 generators；34 Fixture files），`docs:check` 6295/0。交叉表行审计a02检查7个唯一路径、0缺失，父项OPEN；a173正式V1门禁阶段文档/证据审计PASS（583/61/200），V1仍INCOMPLETE/exit 2，4个历史Run缺导出及决定、工程、Ubuntu、人工验收等仍开放。[交叉表审计](../../evidence/audits/2026-10-09-v1-crosswalk-paired-backup-a02.json)，[a173日志](../../evidence/audits/2026-10-09-v1-version-gate-a173.log)，SHA-256 `b87cd3647f16fe8e9fe9db9366f8adbd547f28ff3079d42d9ab1ffb51c80c13d`。


2026-10-09 P3/V1.3补证：`pnpm --filter @stockquant/trade-execution-service test:p5-7`在隔离PostgreSQL和Trade→Portfolio HTTP边界通过固定部分Fill/撤单竞态与重启后序号补齐，证据及边界见[V1.3 §8.29补充](../prd/v1-local-simulation/03-fake-broker-trading-loop.md#829-当前树v13撤单在途filltrade重启矩阵复验2026-10-09)。这关闭共享FakeBroker的一个固定竞态子场景，不关闭P3父项或V1.5 AUTO取消/撤单编排。

2026-10-09 P5/A11四卷同点恢复：`STOCKQUANT_V15_E2E_BACKUP_RESTORE=true pnpm test:e2e -- --stage V1.5`在随机V1.5栈中以Web创建normal TestRun后停止写入，同点归档PostgreSQL、NATS JetStream、Temporal SQLite和research Artifact四卷，恢复至新卷并读回同一TestRun/120项HOLD断言、Workflow完成历史、JetStream ackFloor/delivered及匹配TestRun sourceRef的PUBLISHED ArtifactRef/content SHA。E2E exit 0，资源精确清理，ArtifactRef/字节标为合成；见[V1.5 §8.9.1](../prd/v1-local-simulation/05-scheduling-and-recovery.md#891-四卷同点恢复增量2026-10-09)。这补齐V1.5固定隔离栈的四卷同点恢复，不关闭V1.1～V1.4实际Artifact、完整V1业务数据、生产恢复、Ubuntu/异地/RPO/RTO或人工验收。


2026-10-09 P5四卷同点恢复入档后正式V1门禁a189：阶段文档审计PASS、证据审计PASS（600引用、68份Manifest、207项、0失败），版本仍INCOMPLETE/exit 2。正式报告明确剩余4个历史TestRun结构化导出缺失、五阶段仍部分实现、版本摘要/门禁未关闭，以及当前范围人工验收和Ubuntu实机验收未完成。四卷恢复中的ArtifactRef/内容是合成数据，未冒充真实业务Run产物。门禁日志[JSON输出](../../evidence/audits/2026-10-09-v1-version-gate-a189.log)，SHA-256 `d44bafa85c8bbfe2b43ed2dc9d1478cc385246ca7423699c2f5b8ec2cc9d04d8`；四卷E2E报告[JSON](../../evidence/audits/2026-10-09-v15-paired-backup-restore-sq-v15-e2e-a378990c03fcf9de8260.json)，SHA-256 `0b967d9c34356b22ccef16adaabcd9c7cf5f3c858a584001062752349cef937a`。

2026-10-09正式V1门禁a190：在进度/计划摘要更新后复核，阶段文档审计PASS、证据审计PASS（600引用、68份Manifest、207项，0失败），V1仍INCOMPLETE/exit 2。输出与a189字节一致（同SHA-256），故没有改变门禁结论；正式缺口仍是历史TestRun原始导出、阶段工程与交付、结算决策、完整业务恢复、Ubuntu和用户验收。日志[a190](../../evidence/audits/2026-10-09-v1-version-gate-a190.log)，SHA-256 `d44bafa85c8bbfe2b43ed2dc9d1478cc385246ca7423699c2f5b8ec2cc9d04d8`。


2026-10-09 P5/A10时钟边界补强：V1.5 AUTO取消接口原先直接在HTTP控制器调用`new Date()`；已抽为应用服务并注入Platform容器Clock，以固定Clock单测验证仓储持久化的`requestedAt`。专用AUTO取消E2E在FakeBroker提交后/Trade响应前发起取消，完成后重试保持原请求时间，1个当前Fill完成、后续订单0、独立账本MATCH；四场景Web/API/CLI/export通过，资源精确清理。完整报告[JSON](../../evidence/audits/2026-10-09-v15-auto-trade-cancellation-sq-v15-e2e-398bd38ec91b610d9653.json)，SHA-256 `eae703cdb96c21b2e8a396d0ca1de7382b61c9d42bf1fedbece4141c93687cb2`。改后的V1.5完整代码套件exit 0（含Platform 298测试、Python Worker 14/14及隔离PostgreSQL/迁移），[日志](../../evidence/audits/2026-10-09-v15-cancellation-clock-code-suite-a03.log)，SHA-256 `bfab65dee705c627db4fd918f6b61e1efd50c94d5a11e637918700a87b49a078`。这只是取消事件时间的时钟接线补强；不关闭FakeBroker订单撤销/部分Fill、真实时钟延迟调度、A10父项或V1人工/Ubuntu验收。


2026-10-09正式V1门禁a191：纳入V1.5取消注入Clock及其隔离E2E/代码套件记录后重跑，阶段文档审计PASS、证据审计PASS（604引用、68份Manifest、207项、0失败）；V1仍INCOMPLETE/exit 2。尚缺4个原始历史TestRun结构化导出、五阶段完成/交付、OD-014决策、全V1真实业务配对恢复，以及目标Ubuntu和当前范围用户验收。报告[a191](../../evidence/audits/2026-10-09-v1-version-gate-a191.log)，SHA-256 `e4bf7c3bcd654b9bd0de8540963dac8b5b227a28bb31038ee8238227ea67ee37`。


2026-10-09 A04 Platform API身份矩阵增量：V1.4五条、V1.5四条入口控制器清单匹配，匿名401/伪造owner 403逐路由通过；V1.4完整隔离回归exit 0，V1.5 normal/AUTO/rejection/recovery完整E2E exit 0，均完成同Run CLI核对及临时资源精确清理。V1.5 Fill时间首轮断言失败保留，按固定Clock的`runClockNow + 1秒`修正后全场景通过。详见V1.4 §8.8、V1.5 §8.20、进度文档及交叉服务矩阵A05。此项不改变V1仍未完成的正式状态，也未补签人工验收。

2026-10-09正式V1门禁a205：V1.4/V1.5 Platform身份矩阵证据与阶段文档同步后，正式门禁阶段文档审计PASS、证据审计PASS（619引用、69份Manifest、208项、0失败），但版本仍`INCOMPLETE`/exit 2。缺口包括四个历史TestRun结构化导出、五阶段剩余交付与版本摘要/门禁勾选、OD-014结算决策/实现、全V1实际业务数据配对恢复、目标Ubuntu和当前范围用户验收。[日志](../../evidence/audits/2026-10-09-v1-version-gate-a205.log)，SHA-256 `e2fb77021746c34b0813dacf049861bec8ab956ba3583ac4176ac070dbe7ad19`；链接检查6450/0、`git diff --check`通过。
正式门禁a206对a205作确定性复跑，状态与审计计数一致：`INCOMPLETE`/exit 2，阶段文档/证据审计PASS（619引用、69 manifests、208项），日志SHA-256 `e2fb77021746c34b0813dacf049861bec8ab956ba3583ac4176ac070dbe7ad19`。[a206](../../evidence/audits/2026-10-09-v1-version-gate-a206.log)。


2026-10-09 P0/A01追踪一致性修正：V1.5-S2-L18曾在阶段第2节将“多Worker交易业务故障切换”整体列为未完成，和已有§8.18证据矛盾。已改为固定Trade单实例故障后备用实例按原`clientOrderId`恢复已验证；并发竞争/同时故障与完整恢复仍开放。交叉索引逐项审计[A05](../../evidence/audits/2026-10-09-v1-crosswalk-trade-failover-refresh-a05.json)检查41路径、5测试名、阶段锚点通过；首轮发现的旧测试名失败记录保留。

2026-10-09正式V1门禁a210：收录P0/A01追踪一致性修正后复跑。五阶段文档审计PASS，证据审计PASS（620引用、69份Manifest、208项、0失败）；TestRun证据审计仍INCOMPLETE，具体四个缺失Run为V1.2 `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`及V1.5 `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`。OD-014、阶段交付/版本门禁、全V1真实业务配对恢复、Ubuntu及当前范围用户验收仍未满足，正式版本`INCOMPLETE`/exit 2。[a210日志](../../evidence/audits/2026-10-09-v1-version-gate-a210.log)，SHA-256 `d8d1ae0f5271519ce55e7248616f1f93b82babfa57d2198f86c299d15a7b6527`。


正式V1门禁a211是a210文档收尾后的确定性复核：阶段文档审计PASS、证据审计PASS（620引用、69份Manifest、208项），V1仍INCOMPLETE/exit 2；4个历史Run结构化导出、OD-014、阶段/版本收尾、全域实际业务恢复、目标Ubuntu和用户本人验收未完成。输出与a210一致，SHA-256 `d8d1ae0f5271519ce55e7248616f1f93b82babfa57d2198f86c299d15a7b6527`。[a211日志](../../evidence/audits/2026-10-09-v1-version-gate-a211.log)。

正式V1门禁a212：P2血缘边界记录同步后，阶段文档审计PASS、证据审计PASS（621引用、69份Manifest、208项），四个历史TestRun结构化导出仍缺，V1总状态`INCOMPLETE`/exit 2。其他未满足项包括OD-014、P2跨阶段来源绑定决定、阶段交付/版本门禁、全V1实际业务恢复、Ubuntu及当前范围用户验收。[a212日志](../../evidence/audits/2026-10-09-v1-version-gate-a212.log)，SHA-256 `f8253556d357d181c0e3216d8d3091b4c9f57353e0c0d3436c2a88435bb83f01`。
正式门禁a213对a212确定性复跑一致，五阶段文档/证据审计PASS（621/69/208、0失败），正式版本仍`INCOMPLETE`/exit 2；日志SHA-256相同 `f8253556d357d181c0e3216d8d3091b4c9f57353e0c0d3436c2a88435bb83f01`。[a213](../../evidence/audits/2026-10-09-v1-version-gate-a213.log)。

正式门禁a214：修正计划首页门禁链接、V1.3手册可执行状态和V1.5主备故障汇总后复跑，与a213结果一致；阶段文档/证据审计PASS（621引用、69份Manifest、208项），V1仍`INCOMPLETE`/exit 2。[a214日志](../../evidence/audits/2026-10-09-v1-version-gate-a214.log)，SHA-256 `f8253556d357d181c0e3216d8d3091b4c9f57353e0c0d3436c2a88435bb83f01`。
正式门禁a215在首页引用a214后复核，与a214确定性一致：V1`INCOMPLETE`/exit 2，五阶段文档审计与证据审计PASS（621/69/208、0失败），SHA-256 `f8253556d357d181c0e3216d8d3091b4c9f57353e0c0d3436c2a88435bb83f01`。[a215日志](../../evidence/audits/2026-10-09-v1-version-gate-a215.log)。


2026-10-09 V1.2 Artifact失败不可见修复与正式门禁a227：Qlib产物先存为不可读`PENDING`，仅在后续断言未失败且Run未取消时按owner/TestRun范围显式发布；既有V2.3直接发布API保持不变。定向单测12/12、Platform构建、隔离PostgreSQL生命周期4/4通过；完整V1.2 code suite与容器化Qlib/Web/API/CLI E2E退出0，资源清理验证通过，运行记录见[V1.2 §8.29](../prd/v1-local-simulation/02-small-data-and-qlib.md#829-artifact暂存与失败不可见2026-10-09)。a227五阶段文档审计PASS、证据审计PASS（626引用、70份Manifest、244项、0失败），正式V1仍INCOMPLETE/exit 2；四个历史TestRun结构化导出、剩余阶段交付与版本勾选、OD-014及结算、全V1实际业务恢复、目标Ubuntu和当前范围用户本人验收仍未满足。[a227日志](../../evidence/audits/2026-10-09-v1-version-gate-a227.log)，SHA-256 `f448708897e1d28544f79a1332d6ec9417b494a5c9a3126da6b66752bc251a66`。

正式门禁a228在§8.29文档及总进度更新后复核：阶段文档审计PASS、证据审计PASS（626引用、70份Manifest、244项），V1仍INCOMPLETE/exit 2；输出与a227确定性一致，SHA-256 `f448708897e1d28544f79a1332d6ec9417b494a5c9a3126da6b66752bc251a66`。[a228](../../evidence/audits/2026-10-09-v1-version-gate-a228.log)。

正式V1门禁a229在同步V1.2验收表和计划/进度链接后复核：阶段文档审计PASS、证据审计PASS（626引用、70份Manifest、244项），V1仍INCOMPLETE/exit 2；四个历史TestRun结构化导出、阶段交付/版本勾选、OD-014及结算、全V1实际业务恢复、目标Ubuntu和当前范围用户本人验收未满足。[a229日志](../../evidence/audits/2026-10-09-v1-version-gate-a229.log)，SHA-256 `f6d4306b7274abc01a8609f40ba08d0ef39083f9d4f7937291a8b93260b2dba5`。


正式V1门禁a230：在V1.2 Governance写入失败不发布Artifact测试及本轮阶段/验收记录后复核，阶段文档审计PASS、证据审计PASS（626引用、70份Manifest、244项），V1仍INCOMPLETE/exit 2；结果SHA与a229一致 `f6d4306b7274abc01a8609f40ba08d0ef39083f9d4f7937291a8b93260b2dba5`。[a230日志](../../evidence/audits/2026-10-09-v1-version-gate-a230.log)。

正式门禁a231在总计划同步a230后复核，输出与a229/a230确定性一致：阶段文档审计PASS、证据审计PASS（626/70/244），V1仍INCOMPLETE/exit 2，SHA-256 `f6d4306b7274abc01a8609f40ba08d0ef39083f9d4f7937291a8b93260b2dba5`。[a231](../../evidence/audits/2026-10-09-v1-version-gate-a231.log)。

正式门禁a232：V1.2 Artifact过期不可复活修复、完整code suite和§8.29验收记录后复核。五阶段文档审计PASS、证据审计PASS（626/70/244），正式V1仍INCOMPLETE/exit 2；SHA-256与a229～a231一致 `f6d4306b7274abc01a8609f40ba08d0ef39083f9d4f7937291a8b93260b2dba5`。[a232日志](../../evidence/audits/2026-10-09-v1-version-gate-a232.log)。

正式门禁a233：V1.2 Artifact过期保护实现、完整code suite和阶段记录后复核；五阶段文档与证据审计PASS（626引用、70份Manifest、244条目），V1仍INCOMPLETE/exit 2。四个历史TestRun结构化导出、版本摘要/门禁勾选、OD-014结算、实际业务配对恢复、Ubuntu实机及当前范围人工验收仍开放。[a233日志](../../evidence/audits/2026-10-09-v1-version-gate-a233.log)，[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a233.log.sha256)。

正式门禁a234在计划与总进度同步后复核：阶段文档审计PASS、证据审计PASS（626/70/244），V1仍INCOMPLETE/exit 2；上述历史Run、结算决策、业务恢复、Ubuntu和人工验收条件仍未满足。[a234日志](../../evidence/audits/2026-10-09-v1-version-gate-a234.log)，[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a234.log.sha256)。

2026-10-09 A08/P4当前树回归增量：V1.4完整代码套件exit 0，锁版Python Worker 14/14；隔离Trade Execution/PostgreSQL逐字段核对CN_A与US_EQUITY BUY/SELL、部分买入和零成交拒绝，六个订单结果与Quant回测一致；Report Artifact fencing集成2/2、V1.4迁移CLI及Market Data PG集成28/28通过，证据见[阶段§8.9](../prd/v1-local-simulation/04-daily-backtest.md#89-当前工作区完整代码套件复验2026-10-09)与[完整日志](../../evidence/audits/2026-10-09-v14-code-suite-current-a01.log)。这是固定Fixture规则子集回归，不覆盖OD-014结算、完整费税/市场规则/全规则一致性，也不关闭A08/P4或V1.4阶段。

正式门禁a235在更新V1.4验收摘要后复核：五阶段文档与证据审计PASS（630/71/245），V1仍`INCOMPLETE`/exit 2；历史结构化导出、OD-014结算、真实业务配对恢复、目标Ubuntu和当前范围人工验收仍未满足。[a235日志](../../evidence/audits/2026-10-09-v1-version-gate-a235.log)，[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a235.log.sha256)。

正式门禁a236：更新V1.4验收表和当前进度后复核，阶段文档审计PASS、证据审计PASS（632/71/245），V1仍INCOMPLETE/exit 2；四个历史导出、OD-014、实际配对恢复、Ubuntu与人工验收仍未满足。[a236日志](../../evidence/audits/2026-10-09-v1-version-gate-a236.log)，[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a236.log.sha256)。

正式门禁a237：在文档链接/差异检查通过后复核，五阶段文档及证据审计PASS（632/71/245），V1仍INCOMPLETE/exit 2。a237结果及未满足的历史导出、OD-014、恢复、Ubuntu与人工验收条件见[门禁日志](../../evidence/audits/2026-10-09-v1-version-gate-a237.log)与[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a237.log.sha256)。

正式门禁a238在计划文档同步后复核：文档与证据审计PASS（632/71/245），V1仍INCOMPLETE/exit 2；四个历史Run导出、OD-014、配对恢复、目标Ubuntu与当前范围人工验收仍开放。[a238日志](../../evidence/audits/2026-10-09-v1-version-gate-a238.log)，[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a238.log.sha256)。

2026-10-09 A08/P4补强：将CN_A费率版本2023-08-28生效切换加进持久FakeBroker/PostgreSQL与Quant对照，切换日前和当日/之后各验证BUY/SELL；完整V1.4套件a02 exit 0，Python Worker 14/14、十笔订单场景及隔离清理PASS。证据见[V1.4 §8.10](../prd/v1-local-simulation/04-daily-backtest.md#810-历史费率切换的持久订单逐笔对照2026-10-09)与[当前完整日志](../../evidence/audits/2026-10-09-v14-code-suite-current-a02.log)。A08仍开放：这是合成费率版本范围，不替代OD-014、完整市场/费用规则或回测/纸面总账全规则一致性。

正式门禁a239在A08阶段、验收及总进度索引同步后复核：文档与本地证据审计PASS（636/72/246），V1仍INCOMPLETE/exit 2；历史Run结构化导出、OD-014、实际业务恢复、Ubuntu与人工验收仍开放。[a239日志](../../evidence/audits/2026-10-09-v1-version-gate-a239.log)，[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a239.log.sha256)。

正式门禁a240：a239后只同步门禁索引，当前阶段和证据审计仍PASS（636/72/246），V1仍INCOMPLETE/exit 2；完整未满足条件见[a240日志](../../evidence/audits/2026-10-09-v1-version-gate-a240.log)与[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a240.log.sha256)。

正式门禁a241在总进度/计划指针更新后复核：五阶段文档审计PASS、证据审计PASS（636/72/246），V1仍INCOMPLETE/exit 2；历史导出、OD-014、实际恢复、Ubuntu和人工验收仍未完成。[a241日志](../../evidence/audits/2026-10-09-v1-version-gate-a241.log)，[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a241.log.sha256)。

2026-10-09 A08/A12 V1.4当前树Web/API/CLI验收复验：五项Playwright、17个Platform TestRun、16个Quant BacktestRun/Manifest及Hash配对PASS；八个浏览器创建Run由同Run CLI核对；normal/rejection/recovery、历史费率、限制价/停牌、RAW公司行动、有界策略、取消前门禁和Platform进程恢复均通过。实际报告与截图/Trace位置、代码Hash及限制见[V1.4 §8.11](../prd/v1-local-simulation/04-daily-backtest.md#811-当前工作区webapicli验收复验2026-10-09)及[执行报告](../../evidence/audits/2026-10-07-v14-durable-tasks-668a13697fcfa1b5d777.md)。此自动回归不替代用户本人验收、Ubuntu实机或完整V1状态。

正式门禁a242：当前V1.4自动E2E及计划/进度/验收索引完成后复核，五阶段文档审计PASS、证据审计PASS（644/73/349），V1仍INCOMPLETE/exit 2；历史导出、结算决定、实际配对恢复、Ubuntu和当前范围人工验收仍开放。[a242日志](../../evidence/audits/2026-10-09-v1-version-gate-a242.log)，[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a242.log.sha256)。

正式门禁a243：V1.4当前Web/API/CLI执行报告纳入索引后，文档审计PASS、证据审计PASS（644/73/349），V1仍INCOMPLETE/exit 2；历史导出、OD-014、实际业务恢复、Ubuntu和人工验收仍未满足。[a243日志](../../evidence/audits/2026-10-09-v1-version-gate-a243.log)，[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a243.log.sha256)。

2026-10-09 P3/A07继续：补齐Governance执行授权签发及验证HTTP/PostgreSQL边界的三种非法模式注入测试。六种端点/模式组合均422，验证探测不消费ACTIVE授权，后续合法并发只消费一次；完整V1.3代码套件exit 0，详情见[V1.3 §8.32](../prd/v1-local-simulation/03-fake-broker-trading-loop.md#832-governance执行授权签发验证模式注入拒绝-2026-10-09)及[A05调用矩阵](../../evidence/audits/2026-10-09-v1-cross-service-route-matrix-a05.md)。这只关闭Governance路由模式注入子项；P3/A07及V1仍开放。

正式门禁a244：V1.3增量证据与阶段/版本验收索引同步后复核，五阶段文档审计PASS、证据审计PASS（646引用、74份Manifest、350项），V1仍INCOMPLETE/exit 2。四个历史TestRun结构化导出、OD-014结算决策、实际业务配对恢复、目标Ubuntu实机及当前范围人工验收仍未满足。[a244日志](../../evidence/audits/2026-10-09-v1-version-gate-a244.log)，[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a244.log.sha256)。

正式门禁a245：验收表收录V1.3 Governance授权签发/验证模式注入证据后复核，文档审计PASS、证据审计PASS（649/75/351），V1仍INCOMPLETE/exit 2；四个历史Run导出、OD-014、业务配对恢复、Ubuntu及当前范围人工验收仍未满足。[a245日志](../../evidence/audits/2026-10-09-v1-version-gate-a245.log)，[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a245.log.sha256)。

正式门禁a246因两份历史执行源码快照SHA清单的引用标签未声明其历史性质，产生SHA与当前工作树不匹配的证据审计FAIL；原始快照文件与哈希未改动，PRD引用已明确标注历史执行快照。该失败保留于[a246日志](../../evidence/audits/2026-10-09-v1-version-gate-a246.log)。

正式门禁a247：快照标签修正后阶段文档审计及证据审计PASS（653/73/212），V1仍INCOMPLETE/exit 2；四个历史TestRun导出、OD-014、完整业务配对恢复、目标Ubuntu和当前范围人工验收未满足。[a247日志](../../evidence/audits/2026-10-09-v1-version-gate-a247.log)，[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a247.log.sha256)。

正式门禁a248：纳入a246/a247历史SHA清单标签审计记录和V1.3 Platform模式拒绝矩阵后复核，阶段文档审计PASS、证据审计PASS（656/74/213），V1仍INCOMPLETE/exit 2；四个历史Run导出、OD-014、恢复、Ubuntu及人工验收未满足。[a248日志](../../evidence/audits/2026-10-09-v1-version-gate-a248.log)，[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a248.log.sha256)。

正式门禁a249：更新计划与总进度的门禁指针后复核，阶段文档审计PASS、证据审计PASS（658/75/214），V1仍INCOMPLETE/exit 2；历史导出、OD-014、业务配对恢复、Ubuntu和人工验收仍未满足。[a249日志](../../evidence/audits/2026-10-09-v1-version-gate-a249.log)，[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a249.log.sha256)。

正式门禁a250：a249结果写入进度、计划和验收后复核，阶段文档审计PASS、证据审计PASS（660/76/215），V1仍INCOMPLETE/exit 2；四个历史导出、OD-014、实际业务配对恢复、Ubuntu及当前范围人工验收仍未满足。[a250日志](../../evidence/audits/2026-10-09-v1-version-gate-a250.log)，[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a250.log.sha256)。

正式门禁a251：V1.3账户初始化与交易模式边界扩展后，阶段文档和证据审计PASS（662/77/216），V1仍INCOMPLETE/exit 2；四个历史Run导出、OD-014、业务配对恢复、Ubuntu及人工验收仍未满足。[a251日志](../../evidence/audits/2026-10-09-v1-version-gate-a251.log)，[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a251.log.sha256)。

2026-10-09 P3/A07增量：Platform账户初始化、Proposal/Mandate创建与三条执行入口的18种模式篡改尝试均在HTTP层返回422，Mandate/订单/Fill不创建，Portfolio账本保持不变；完整V1.3 code suite及Web/API/CLI 22/22通过。详见[V1.3 §8.33](../prd/v1-local-simulation/03-fake-broker-trading-loop.md#833-platform-auto-mandate执行路由模式注入拒绝-2026-10-09)及[A05子矩阵](../../evidence/audits/2026-10-09-v1-cross-service-route-matrix-a05.md#v13-platform交易模式注入拒绝子矩阵2026-10-09)。这补齐指定Platform入口模式拒绝边界，不关闭P3/A07全服务父项。

V1.1新增边界回归：当前源码隔离栈验证账户初始化与TestRun创建拒绝客户端模式注入，完整`pnpm test:integration:v11-stage-storage`退出0，含代码门禁、数据库迁移/持久化检查和Web normal/rejection/recovery 3/3。细节见[V1.1 §8.24](../prd/v1-local-simulation/01-environment-and-web-center.md#824-v11入口拒绝客户端交易模式注入2026-10-09)。此自动回归不解除V1.1活动存储维护条件或新增范围人工验收。

最新正式门禁[a252](../../evidence/audits/2026-10-09-v1-version-gate-a252.log)的文档与证据审计通过（664/78/217），V1仍INCOMPLETE/exit 2。开发执行已覆盖此次授权范围内可独立推进的代码、隔离验证与文档同步；完整交付仍依赖四个历史Run结构化导出、OD-014结算口径、维护负责人确认活动存储/非终态Run处置、实际跨域配对恢复、目标Ubuntu实机和用户对新增范围的真实验收。上述外部事实不能由自动化脚本代替，故计划仍IN_PROGRESS。

正式门禁最新结果更新为[a253](../../evidence/audits/2026-10-09-v1-version-gate-a253.log)：阶段文档与证据审计PASS（665/78/217），V1仍INCOMPLETE/exit 2，计划保持IN_PROGRESS，未将开发者自动回归误记为用户签收。

P3/A07新增Portfolio写入口切片：V1.1/V1.3完整代码套件及V1.3 Web/API/CLI 22/22通过；Portfolio四个账户写入接口拒绝模式字段，并在隔离PG证明零拒绝副作用。L06对于后台Outbox先投递Fill的CAPTURED合法时序现有精确断言。保留首轮失败日志，不将特定路由回归上推为P3整体通过。详见[V1.3 §8.34](../prd/v1-local-simulation/03-fake-broker-trading-loop.md#834-portfolio写入口拒绝客户端模式注入与outbox时序2026-10-09)。

正式门禁[a254](../../evidence/audits/2026-10-09-v1-version-gate-a254.log)在Portfolio模式边界证据入档后复核，阶段文档/证据审计PASS（671/79/218），V1仍INCOMPLETE/exit 2。该增量未解除历史导出、OD-014、活动数据维护、完整恢复、Ubuntu和用户验收等剩余条件。

最新门禁指针更新为[a255](../../evidence/audits/2026-10-09-v1-version-gate-a255.log)，文档和证据审计均PASS（673/80/219），V1仍INCOMPLETE/exit 2，收尾队列保持开放。

P0/A01追踪增量：将本轮Platform/Governance/Trade/Portfolio模式边界和V1.3最终22/22 E2E证据补入`V1.3-S2-L17`稳定交叉索引；40条精确证据/源码路径均存在且索引Hash有效。覆盖状态仍PARTIAL，全部V1服务/Worker路由、BACKTEST接受链与父项关闭审查继续OPEN。当前覆盖审计见[A01交叉索引段落](../../evidence/audits/2026-10-08-v1-current-coverage.md#2026-10-09-a01追加v13-s2-l17服务端模式边界精确映射)。

正式门禁[a256](../../evidence/audits/2026-10-09-v1-version-gate-a256.log)确认本轮追踪映射后，阶段文档/证据审计PASS（675/81/220），版本仍INCOMPLETE/exit 2；外部原始证据、结算决策、实际维护/恢复与人工验收仍待完成。

最新正式门禁指针为[a257](../../evidence/audits/2026-10-09-v1-version-gate-a257.log)，五阶段文档及证据审计PASS（677/82/221），V1仍INCOMPLETE/exit 2；计划保持IN_PROGRESS。

P0/A01追踪继续：`V1.3-S2-L16`已从未映射补为11条固定Web E2E精确测试关联，覆盖正常/HOLD/预算拒绝、币种/范围/现金/T+1拒绝、响应丢失/原单查询失败、Trade重启、乱序Fill和部分撤单。关联路径存在、索引Hash匹配；要求状态保持PARTIAL，完整市场规则/故障和结算父项仍开放。见[当前覆盖映射](../../evidence/audits/2026-10-08-v1-current-coverage.md#2026-10-09-a01追加v13-s2-l16固定交易场景精确测试映射)。

正式门禁[a258](../../evidence/audits/2026-10-09-v1-version-gate-a258.log)在A01映射更新后复核，文档及证据审计PASS（679/83/222），版本仍INCOMPLETE/exit 2。

最新正式门禁[a279](../../evidence/audits/2026-10-09-v1-version-gate-a279.log)仍为INCOMPLETE/exit 2；阶段文档审计PASS、证据审计PASS（723引用、97份Manifest、236项），4个历史TestRun结构化导出缺失；计划继续IN_PROGRESS。

### 2026-10-09 续跑记录：V1.3事件序列精确映射

Trade FakeBroker authoritative event sequence 单测独立运行3/3通过，验证乱序撤单缓存后按序归并、序号缺口与已缓存事实冲突、相同事件幂等回放以及无效/过期序号拒绝。执行日志：[a01](../../evidence/audits/2026-10-09-v13-event-sequencer-unit-a01.log)，SHA sidecar随日志。V1.3-S2-L16交叉索引已加入三条精确断言与证据路径，覆盖仍标为PARTIAL，不能替代多seed故障矩阵、全市场规则或人工验收。复跑正式版本门禁[a260](../../evidence/audits/2026-10-09-v1-version-gate-a260.log)：exit 2/INCOMPLETE；阶段文档审计PASS，证据审计PASS（683引用/85份Manifest/224条目）。计划保持IN_PROGRESS。

2026-10-09 V1基础质量门禁复跑：`pnpm baseline:check`退出0，Markdown链接6729/0失败，合同与Fixture校验0失败，所有登记客户端/合同生成检查、Artifact content-store、8项服务分层扫描通过，脚本测试55/55。完整输出：[日志](../../evidence/audits/2026-10-09-v1-baseline-check-a01.log)，SHA sidecar随文件。此基础门禁只证明通用质量检查，不替代当前阶段接受路径、P1～P6交付或人工/环境验收。

正式门禁a261在本轮基础质量复跑和文档同步后仍为INCOMPLETE/exit 2；五阶段文档审计PASS，证据审计PASS（683引用/85份Manifest/224项）。四个历史Run导出、OD-014结算决定、活动存储/旧非终态Run负责人处置、真实跨域配对恢复、目标Ubuntu及用户本人验收仍未满足。见[门禁日志](../../evidence/audits/2026-10-09-v1-version-gate-a261.log)及[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a261.log.sha256)。计划继续IN_PROGRESS。

### 2026-10-09 续跑：Governance AUTO Mandate模式边界

P3补证覆盖AUTO Mandate创建、激活、订单预算授权、预算结算四类真实HTTP写路由，三种LIVE/REAL注入均422；隔离PostgreSQL确认无Mandate/预算副作用，合法创建与激活仍成功。[§8.35](../prd/v1-local-simulation/03-fake-broker-trading-loop.md#835-governance-auto-mandate服务写入口模式注入拒绝2026-10-09)、[a05日志](../../evidence/audits/2026-10-09-v13-governance-auth-http-a05.log)。单测6/6通过。完整V1.3 code suite本轮运行但因锁定Python Worker镜像当前不可用而exit 2；禁止以该结果宣称全套件PASS，也未擅自拉取镜像。HTTP smoke及已执行Node单测单独记录，首次无效Fixture时间输入的失败日志保留。

本轮正式V1门禁a262仍为INCOMPLETE/exit 2，文档及证据审计PASS（687引用/85份Manifest/224项）。该次包含新增Governance AUTO Mandate服务模式边界证据；仍未解决的外部输入/工程项按计划保留。[日志](../../evidence/audits/2026-10-09-v1-version-gate-a262.log)，[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a262.log.sha256)。

锁定Python Worker镜像按精确digest准备后，改动后的完整V1.3代码套件已复跑exit 0，禁网linux/arm64 Worker测试14/14；输出见[Governance Mandate完整代码套件a02](../../evidence/audits/2026-10-09-v13-governance-mandate-code-a02.log)。此前镜像不可用的a01 exit 2仅作历史保留，现结论以a02为准。AUTO Mandate模式注入HTTP+PG smoke a05及阶段记录/交叉索引已同步；全V1路由矩阵仍未关闭。

正式门禁a263：本轮V1.3完整代码套件与Governance服务边界证据被收录后，阶段文档及证据审计PASS（687/85/224），V1仍INCOMPLETE/exit 2；未满足项维持P1～P6及历史、环境与人工要求。[a263日志](../../evidence/audits/2026-10-09-v1-version-gate-a263.log)，SHA sidecar随附。

P3/FakeBroker固定标识补证：隔离PostgreSQL持久化回归新增稳定orderId断言，首次执行、并发幂等重试和重连重试返回同一UUID，单笔订单/Fill/event/outbox及变更命令409断言保留。[V1.3 §8.36](../prd/v1-local-simulation/03-fake-broker-trading-loop.md#836-fakebroker稳定对外订单标识回归2026-10-09)、[a02日志](../../evidence/audits/2026-10-09-v13-fakebroker-order-id-stability-a02.log)。此只关闭稳定ID原子证据，完整操作契约与P3父项仍开放。

正式V1门禁a264在FakeBroker稳定ID证据同步后运行，文档/证据审计PASS（688/85/224），版本仍INCOMPLETE/exit 2；P3完整操作契约及其余P1～P6、外部决定/环境/历史/验收条件仍开放。[日志](../../evidence/audits/2026-10-09-v1-version-gate-a264.log)，SHA sidecar随附。

P3 FakeBroker合同增量：固定HTTP/PG恢复烟测经by-clientId路由在服务重启前后读回相同订单ID、取消终态和完整Fill事实，cancel/Fill Outbox/Portfolio对账退出0。[V1.3 §8.37](../prd/v1-local-simulation/03-fake-broker-trading-loop.md#837-fakebroker-by-clientid查询取消与fill恢复http契约2026-10-09)，[a02日志](../../evidence/audits/2026-10-09-v13-fakebroker-contract-http-a02.log)。对旧版P5.7路径误要求V1.3独立资产账本的失败a01保留，a02仅断言该场景支持的契约；独立账户GET与完整全版本API合同继续OPEN。

正式门禁a265：FakeBroker新by-clientId HTTP/PG恢复证据与当前索引通过文档/证据审核（690/85/224），正式V1仍INCOMPLETE/exit 2。剩余FakeBroker独立账户GET与全操作矩阵、P1～P6其他实现、决定、环境、历史和用户实际验收继续开放。[a265日志](../../evidence/audits/2026-10-09-v1-version-gate-a265.log)，SHA sidecar随附。

### 2026-10-09 续跑：V1.3 FakeBroker独立资产HTTP读回

Trade身份HTTP smoke新增独立资产账本读取的正向/拒绝断言：测试库写入随机账户与持仓后，经`GET /internal/v1/v13/accounts/assets`由Platform身份读取，逐项核对owner、TestRun、CNY现金和证券数量；错误服务身份403，未知账户或namespace404，缺失范围参数422。定向HTTP+隔离PG smoke PASS，临时数据库/容器/网络清理通过：[a02日志](../../evidence/audits/2026-10-09-v13-independent-assets-http-a02.log)、[SHA-256](../../evidence/audits/2026-10-09-v13-independent-assets-http-a02.log.sha256)。改动后完整V1.3代码套件已运行并通过，覆盖Trade集成、其他V1.3服务、合同/Python/运维检查和迁移CLI：[a02完整日志](../../evidence/audits/2026-10-09-v13-independent-assets-code-suite-a02.log)、[SHA-256](../../evidence/audits/2026-10-09-v13-independent-assets-code-suite-a02.log.sha256)。该原子证据只证明GET读取和身份/账户范围，不证明端到端资产生命周期或跨版本账本合同；V1.3-S2-L14父项仍OPEN，V1第2/7节和用户验收复选框未改。

### 2026-10-09 续跑：V1.3 Governance Proposal决策与修订模式边界

共享V1.3治理HTTP+PostgreSQL smoke扩展Proposal Approve、Reject与Revise入口：`LIVE/FAKE`、`PAPER/REAL`、`LIVE/REAL`九个请求全部422，且读回proposal版本/状态不变、decision/revision行0；合法Approve随后仍成功。定向`pnpm test:service-auth:http`和完整V1.3 code suite a02均通过：[HTTP+PG日志](../../evidence/audits/2026-10-09-v13-proposal-mode-decision-revision-http-a02.log)、[完整代码套件](../../evidence/audits/2026-10-09-v13-governance-proposal-mode-boundary-code-suite-a02.log)。精确要求映射已加入`V1.3-S2-L17`，仅关闭这三类Governance命令原子范围；其它服务/Worker接受路径和完整V1模式矩阵仍OPEN，L17父项不变，人工复选框未改。

### 2026-10-09 续跑：V1.3 AUTO Mandate pause模式边界

真实隔离HTTP+PostgreSQL smoke新增已激活AUTO Mandate的pause路由三种模式注入，均422，数据库读回保持ACTIVE且事件数不变；随后合法pause成功。[定向日志](../../evidence/audits/2026-10-09-v13-governance-auth-http-a06.log)。改后完整V1.3 code suite已运行，结果见[日志](../../evidence/audits/2026-10-09-v13-auto-mandate-pause-mode-boundary-code-suite-a01.log)。该测试补充`V1.3-S2-L17`原子覆盖；其它服务/Worker完整接受路径、全V1模式矩阵及P3仍开放，不改变阶段/人工验收状态。

### 2026-10-09 续跑：V1.3 Trade订单转换模式载荷边界

Trade服务的`cancel`、`expire`和`unknown`之前忽略POST body，使携带LIVE/REAL字段的Platform命令仍可能按FakeBroker语义改变订单状态。本轮改为拒绝这些body-less命令上的任何非空载荷；隔离HTTP+PG以一笔真实持久部分Fill订单验证四类请求（含`cancel-result`）均422且订单状态、事件、Fill及Outbox事实不变，随后正常撤单/结果仍成功：[HTTP+PG日志](../../evidence/audits/2026-10-09-v13-trade-transition-mode-http-a01.log)。Trade共享给V1.5，故完整V1.3回归后继续运行V1.5完整代码套件；结果和最终V1门禁再补入此页。该原子项加入L17映射，不关闭全路由父项。

正式门禁a266因该HTTP日志SHA sidecar路径相对于服务目录而被证据审计拒绝（失败保留）；改为仓库根相对路径后a267阶段文档与证据审计PASS（693/86/225），版本仍INCOMPLETE/exit 2。四个历史TestRun导出、OD-014、活动存储/非终态Run维护决定、真实全域配对恢复、Ubuntu实机及本人验收仍未满足。[a267日志](../../evidence/audits/2026-10-09-v1-version-gate-a267.log)，[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a267.log.sha256)。

最终同步阶段验收表后的正式门禁a269：文档/证据审计PASS（697引用、87份Manifest、226项），V1仍INCOMPLETE/exit 2；四个历史Run结构化导出、OD-014、活动数据维护决定、完整跨域配对恢复、目标Ubuntu实机和当前范围人工验收仍未满足。[a269日志](../../evidence/audits/2026-10-09-v1-version-gate-a269.log)，[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a269.log.sha256)。

### 2026-10-09 续跑：V1.5隔离故障演练Runbook

V1.5 §8.25已将已有Temporal/PostgreSQL/网络故障、双Platform Worker竞争、Platform/Trade备用实例接管及四卷配对恢复证据整理成单一操作索引，列出精确命令、固定预期和范围限制；§2对应父任务仍未勾选，因为Mac睡眠/唤醒、同时故障和人工全流程执行没有证据。`pnpm docs:check`检查6969条本地Markdown链接、0失败，`git diff --check`通过。更新后版本门禁a302文档审计PASS、证据审计PASS（784引用、106份Manifest、245项），整体仍INCOMPLETE/exit 2；四个历史TestRun导出、OD-014、三条旧非终态Run处置、活动数据/完整灾备、Ubuntu实机和当前范围人工验收仍未关闭。[a302日志](../../evidence/audits/2026-10-09-v1-version-gate-a302.log)，SHA-256 `9a52682164af0b6c5b5863ba9389c38206ab12cd04a271f393d3bdc42a57126e`。不改变门禁或人工验收状态。

Run Incident改动后的当前工作树复跑Platform备用Worker故障模式：初次受沙箱loopback限制失败（a01保留），受控本机重跑exit 0。浏览器场景3/3、Platform入口匿名/伪造owner探针7/7，normal/AUTO/rejection/recovery均完成同Run CLI/export，隔离项目`sq-v15-e2e-6558c295fca307bd8c66`容器/卷/网络精确清理，外部来源/真实券商调用0。报告[JSON](../../evidence/audits/2026-10-09-v15-worker-failover-sq-v15-e2e-6558c295fca307bd8c66.json)、[日志a02](../../evidence/audits/2026-10-09-v15-run-incident-worker-failover-e2e-a02.log)，SHA-256 `31353fdce776b640ad69dda95bd8ce4bb144bd9916c4d245f2f41d40538cc283`；手册§8.25已更新。此复验只确认固定Platform Worker故障切换，不覆盖Mac睡眠、多故障或V1.5整体关闭。

复验后正式V1门禁a304：五阶段文档审计PASS、证据审计PASS（786引用、106份Manifest、245项），版本仍INCOMPLETE/exit 2；四个历史TestRun结构化导出、OD-014/旧Run决定、活动数据及完整灾备、Ubuntu实机和当前范围人工验收仍未满足。[a304日志](../../evidence/audits/2026-10-09-v1-version-gate-a304.log)，SHA-256 `7e95a5d4ac7e6a8c9108a056c766147e7c099c79e7cb479ce81b2653a4d01029`。

### 2026-10-09 续跑：Mac M1 容器资源实测

在第二次当前树V1.5备用Worker故障演练期间，以约5秒间隔采集随机Compose容器CPU/内存；E2E PASS、浏览器3/3、精确清理，未调用外部数据源或真实券商。Docker Desktop ARM64额度为10 vCPU/约7.65 GiB；Platform API/备用Worker采样最大内存285.4/265.4 MiB。CPU百分比高于100%符合未设单容器CPU quota的Docker计数定义；采样不是绝对瞬时峰值，Playwright宿主进程未包括。环境、Docker/仓库磁盘快照、各服务数据、完整限制和原始文件Hash见[资源审计](../../evidence/audits/2026-10-09-v1-m1-container-resource-snapshot-a01.md)。本记录补齐一次Mac隔离负载的资源依据，不替代Ubuntu实机、Mac睡眠恢复、完整市场容量/RPO/RTO或当前范围人工验收。

资源审计同步后的正式V1门禁a306：阶段文档审计PASS、证据审计PASS（787引用、106份Manifest、245项），总版本仍INCOMPLETE/exit 2。缺少四个历史Run导出、OD-014与旧Run处置、活动数据/全域实际灾备、Ubuntu和人工验收等条件；[a306日志](../../evidence/audits/2026-10-09-v1-version-gate-a306.log)，SHA-256 `78403df7b313c06f1d45462dd482f12f1b91ba7657ac7d0fe235e3e48e1c8acb`。

### 2026-10-09 续跑：共享Trade路由V1.5兼容验证

V1.5完整代码套件a02通过；改动后的隔离Web/API/CLI/export E2E a01四场景通过，normal/auto-trade/rejection/recovery各自执行同Run CLI/export核验，1.9分钟完成并清理精确隔离资源。无真实券商或外部来源调用。相关证据同步至V1.3 §8.41、99验收和L17交叉索引。共享路由兼容已验证，但L17/P3父项保持OPEN。接下来重跑全V1正式门禁并校验文档链接；历史TestRun导出、OD-014、活动数据/旧Run处置决定、实际完整跨域恢复、Ubuntu实机及本人验收仍是完成V1的开放条件。

2026-10-09继续处理Trade Outbox补偿路由：非空body（含LIVE/REAL模式字段）现在先于重试副作用被拒绝。隔离HTTP+PG及V1.3/V1.4/V1.5完整代码套件通过；V1.5四场景与V1.3完整22项Web/API/CLI/export回归通过并清理隔离资源。详见[V1.3 §8.42](../prd/v1-local-simulation/03-fake-broker-trading-loop.md#842-trade-outbox补偿路由拒绝请求体注入及跨阶段回归2026-10-09)及[HTTP+PG日志](../../evidence/audits/2026-10-09-v13-trade-outbox-compensation-body-http-a01.log)。本项只关闭指定补偿路由边界及兼容回归；L17/P3父项仍OPEN。V1完成仍取决于四个历史Run原始结构化导出、OD-014、活动数据/非终态Run处置决定、完整跨域配对恢复、目标Ubuntu和用户验收。


正式门禁a279复核：阶段文档审计PASS（5阶段），证据审计PASS（723引用、97份Manifest、236项）；V1仍INCOMPLETE/exit 2。11个TestRun关联中4个历史Run结构化导出缺失；版本摘要及门禁检查也仍不完整。详见[a279日志](../../evidence/audits/2026-10-09-v1-version-gate-a279.log)及[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a279.log.sha256)。

正式门禁a280：阶段文档审计PASS（5阶段），证据审计PASS（723引用、97份Manifest、236项）；版本仍INCOMPLETE/exit 2。四个历史TestRun结构化导出仍缺失；版本门禁清单与用户验收不能由代码/文档检查自动签署。该次门禁在计划已引用a279后生成，保留其“unchecked”字段以如实表示阶段性门禁项尚未完成。[a280日志](../../evidence/audits/2026-10-09-v1-version-gate-a280.log)，[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a280.log.sha256)。

### 2026-10-09 续跑：Historical Replay BACKTEST 请求严格字段拒绝

发现Trade历史执行HTTP控制器未执行OpenAPI中`additionalProperties:false`，未知`environmentMode`/`brokerMode`字段会被忽略。已在HTTP边界按契约核验顶层及bar/reservation对象的精确允许字段，并限制8 KiB；隔离PostgreSQL smoke以三个LIVE/REAL组合验证422、零治理授权调用、零订单副作用，合法BACKTEST请求仍执行。完整V1.3 code suite exit 0；完整V1.4 code suite exit 0；V1.4 Web/API/CLI E2E 5/5通过、同Run CLI检查通过、随机隔离资源清理通过。记录见V1.4 §8.12，V1.3-S2-L17与V1.4-S2-L14索引更新但父级状态仍部分/开放。该项没有改变结算、恢复、历史TestRun、Ubuntu或人工验收阻塞。

正式门禁a283：阶段文档审计PASS（5阶段）；证据审计PASS（731引用、97份Manifest、236项）；V1仍INCOMPLETE/exit 2。历史Run导出和人工/业务门禁条件未完成。[a283日志](../../evidence/audits/2026-10-09-v1-version-gate-a283.log)，[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a283.log.sha256)。

正式门禁a285复核：阶段文档审计PASS，证据审计PASS（741引用、99份Manifest、238项）；V1仍INCOMPLETE/exit 2。缺失条件仍包括四个历史Run原始导出、OD-014及活动数据/非终态Run处置决定、完整跨域配对恢复、目标Ubuntu和当前范围人工验收。[a284日志](../../evidence/audits/2026-10-09-v1-version-gate-a285.log)，[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a285.log.sha256)。

正式门禁a285：五阶段文档审计PASS、证据审计PASS（741引用、99份Manifest、238项）；V1继续INCOMPLETE/exit 2。四个历史TestRun原始导出、OD-014、活动记录维护/处置决定、完整配对恢复、Ubuntu实机和当前范围用户验收未满足。[a285门禁日志](../../evidence/audits/2026-10-09-v1-version-gate-a285.log)，[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a285.log.sha256)。

2026-10-09共享Trade请求边界变更后的V1.1完整兼容复验：`pnpm verify:stage -- --stage V1.1 --suite code`退出0，包含隔离HTTP/PG、服务身份、V1.1迁移CLI与层级检查；活动服务未连接，详见[V1.1 §8.18](../prd/v1-local-simulation/01-environment-and-web-center.md#818-共享trade路由变更后的v11完整代码兼容复验2026-10-09)及[日志](../../evidence/audits/2026-10-09-v11-trade-outbox-compensation-compat-code-suite-a01.log)。此兼容项通过不关闭V1.1活动存储切换/回退、整阶段验收或V1门禁；历史导出、OD-014、维护决定、完整配对恢复、Ubuntu和人工验收仍待完成。

正式门禁a286在V1.1共享Trade兼容复验和文档同步后执行：五阶段文档审计PASS，证据审计PASS（747引用、100份Manifest、239项），V1继续INCOMPLETE/exit 2；四个历史Run原始导出、OD-014及维护决定、完整跨域配对恢复、Ubuntu实机和用户本人验收仍未满足。[a286日志](../../evidence/audits/2026-10-09-v1-version-gate-a286.log)，[SHA-256](../../evidence/audits/2026-10-09-v1-version-gate-a286.log.sha256)。

2026-10-09 P5/V1.5 owner范围运行历史比较切片完成：新增仅返回摘要的owner过滤V1.5 TestRun历史API（默认20、上限50），页面允许选取历史Run并并排比较；历史细节继续通过既有owner范围详情API读取。隔离PostgreSQL验证查询边界，完整V1.5代码套件exit 0，四场景Web/API/CLI/export E2E实际比较通过；日志见[V1.5 §8.21](../prd/v1-local-simulation/05-scheduling-and-recovery.md#821-owner范围v15运行历史与并排比较2026-10-09)。此切片不关闭V1.5-S2-L19父项，告警/能力阻塞/跨阶段追溯、历史Run缺失、OD-014、全V1恢复、Ubuntu及人工验收仍阻止V1收尾。

2026-10-09 P5/V1.5能力阻塞切片：V1.5验收页新增workflow/NATS/Temporal/domain持久Run状态与阻塞展示，NOT_RUN保持未运行语义；Web单测、完整代码门禁和隔离四场景E2E通过。详见[V1.5 §8.22](../prd/v1-local-simulation/05-scheduling-and-recovery.md#822-v15-run能力状态与明确阻塞显示2026-10-09)。正式告警Incident列表/确认、跨阶段追溯、历史TestRun原始导出、OD-014、全V1真实业务恢复、Ubuntu和当前范围人工验收仍为V1收尾项。

P5 V1.5告警/能力入口增量：能力状态/明确阻塞由Run持久证据展示，NOT_RUN语义保留，并链接到已有V2.4系统告警/Paper概览；四场景隔离E2E与完整代码门禁exit 0，详见[V1.5 §8.22](../prd/v1-local-simulation/05-scheduling-and-recovery.md#822-v15-run能力状态与明确阻塞显示2026-10-09)。V1.5 Run级Incident自动生成/关联/确认与跨阶段追溯仍OPEN。

2026-10-09 P5/V1.5 Run Incident增量：Platform基于Run持久阻塞证据生成owner/TestRun范围Incident；登录会话确认、重复确认幂等、恢复解决及复发新建均通过隔离PostgreSQL/API/Web验证，NOT_RUN/WAITING不误报。完整V1.5 code suite和四场景Web/API/CLI/export E2E通过，随机Compose资源精确清理，真实来源/券商调用0。详见[阶段§8.24](../prd/v1-local-simulation/05-scheduling-and-recovery.md#824-v15-run-incident生命周期与确认2026-10-09)和[机器报告](../../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-88f2a323800f2c15b7b2.json)。该增量不关闭V1.5-S2-L19/P5：外发通知、跨阶段追溯、V1.1–V1.4活动数据与灾备、Ubuntu及人工验收仍未完成。

### 2026-10-09 续跑：V1.5 Run Incident保存时自动投影

Run证据更新原先只在读取Incident API时才投影，无法保证无人读取时产生告警。本轮将Incident生命周期同步放入Run `save()`事务：阻塞证据保存即创建/更新、恢复即解决、复发新建；保留GET协调读取。V1.5代码套件exit 0（[日志](../../evidence/audits/2026-10-09-v15-auto-incident-projection-code-suite-a01.log)，SHA-256 `e2da9be4f8e7f68ad70d70d86b9281c1d994362bb8285570ec015e96b70c0242`），四场景Web/API/CLI/export E2E exit 0（[日志](../../evidence/audits/2026-10-09-v15-auto-incident-projection-web-e2e-a01.log)，SHA-256 `d03260c04978b7682d1b36e7a64a9b361dbfb6fc7236ca2de0d32cc857400f74`），共享Platform修改后的V1.1–V1.4代码兼容套件均退出0（[日志](../../evidence/audits/2026-10-09-v15-auto-incident-projection-cross-stage-code-suite-a01.log)，SHA-256 `36e0aeb63f8c9b0a605728385c972e1f51ae5f9350986b9fb18e52059398ce6d`）。V1.5-S2-L19/P5仍OPEN：外发通知、跨阶段成交链和任意成交追溯尚缺，且V1整体仍有历史Run证据、OD-014/旧Run处置、完整数据恢复、Ubuntu与用户验收门禁。

正式V1门禁a308（Incident自动投影文档同步后）：五阶段文档审计PASS、证据审计PASS（789引用、106份Manifest、245项），整体`INCOMPLETE`/exit 2。V1.2历史Run `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`及V1.5历史Run `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`仍缺结构化导出；版本摘要及门禁项未关闭；OD-014、三条旧非终态Run处置、活动数据/全V1配对恢复、Ubuntu实机和当前范围人工验收仍待完成。[a308日志](../../evidence/audits/2026-10-09-v1-version-gate-a308.log)，SHA-256 `cf91234985ff671703c66d4e5c9ef70fac0bdf0c1271dd262e6b6515fdfb9dae`。

正式V1门禁a310（同步V1版本总览中的Incident自动投影状态后）：阶段文档审计PASS、证据审计PASS（789引用、106份Manifest、245项），版本仍`INCOMPLETE`/exit 2；未满足项与a308相同。[a310日志](../../evidence/audits/2026-10-09-v1-version-gate-a310.log)，SHA-256 `0a7776b6d538c112ba3091594e29f239344cdcf4e07d41c257d3b150cc79db14`。

2026-10-09 P1/V1.1共享Platform Run保存事务的Web/API/CLI兼容闭环：共享`save()`事务变更后，当前树`pnpm test:e2e -- --stage V1.1`隔离复验exit 0，完整V1.1 code suite通过、normal/rejection/recovery浏览器3/3、同UUID CLI `--check-only`及导出通过，随机Compose容器/卷/网络/镜像已精确清理。三个新Run证据包：`e5e661b1-9655-4f9b-9869-9a4dda4b5ce4`、`839ec19a-40cf-463e-a42d-43d0131c23db`、`86799f53-11a2-41c8-a63f-cf0632da38f3`，完整日志见[V1.1 §8.20](../prd/v1-local-simulation/01-environment-and-web-center.md#820-run事务保存变更后的当前树v11端到端兼容复验2026-10-09)。该复验不关闭V1.1活动存储切换、旧非终态Run处置或人工验收。

2026-10-09 P1/V1.2共享Platform Run保存事务的当前树E2E复验：首次启动在拉取固定`python:3.11-slim-bookworm`基础镜像时unexpected EOF，未进入场景，固定日志[a01](../../evidence/audits/2026-10-09-v12-current-tree-shared-run-save-e2e-a01.log)保留；检查确认项目卷清理且镜像本地缺失后，相同命令复跑成功。`pnpm test:e2e -- --stage V1.2` exit 0，隔离Web/API/CLI四个Run检查通过，项目资源清理验证通过，详见[V1.2 §8.31](../prd/v1-local-simulation/02-small-data-and-qlib.md#831-共享platform-run保存事务变更后的v12当前树复验2026-10-09)。仅证明当前树兼容性，不关闭历史TestRun、人工/Ubuntu验收或V1.2阶段。

2026-10-09 P1/P3 V1.3共享Platform Run保存事务变更后的纵切兼容复验：完整隔离`pnpm test:e2e -- --stage V1.3` exit 0、Playwright 22/22，覆盖CN/US固定订单、拒绝和Trade重启恢复，Web/API/CLI同Run核对及导出、独立FakeBroker/Portfolio MATCH、精确清理均通过，外部调用0。详见[V1.3 §8.44](../prd/v1-local-simulation/03-fake-broker-trading-loop.md#844-共享platform-run保存事务变更后的v13当前树e2e复验2026-10-09)及[运行日志](../../evidence/audits/2026-10-09-v13-current-tree-shared-run-save-e2e-a01.log)，SHA-256 `42f0ee31328dda70c8b655e7eed0e637e79680dbab5e25f04a60b0fcb40d6462`。此兼容检查不关闭V1.3完整接受路径、P4规则、OD-014或人工/Ubuntu验收。

2026-10-09 P1/P4 V1.4共享Platform Run保存事务变更后的当前树E2E：隔离`pnpm test:e2e -- --stage V1.4` exit 0，浏览器5/5、八个Web Run同UUID CLI核对、正式页面持久回测/比较和精确隔离资源清理通过；完整日志见[V1.4 §8.14](../prd/v1-local-simulation/04-daily-backtest.md#814-共享platform-run保存事务变更后的v14当前树复验2026-10-09)，SHA-256 `9dfa2e46ecf0e18342620e88a9e156c69ba0e6a16ba23c978174f5b99677c302`。该兼容复验不覆盖OD-014结算、Quant/Paper完整逐笔对照、Ubuntu或人工验收。

正式V1门禁a311（Run `save()`共享改动后的V1.1–V1.4代码及E2E兼容证据同步后）：五阶段文档审计PASS，证据审计PASS（798引用、107份Manifest、281项、0失败）；总版本仍`INCOMPLETE`/exit 2。四个历史Run结构化导出缺失、版本摘要/门禁未关闭、OD-014和3条旧非终态Run处置、活动数据/全V1恢复、Ubuntu和当前范围人工验收继续开放。[a311日志](../../evidence/audits/2026-10-09-v1-version-gate-a311.log)，SHA-256 `5bd70036933dd3c08db95c45cfc5683f9a31685fe1733f21d661c61e51f8f6f0`。

2026-10-10 命令契约补齐：根级`seed:paper`与`verify:paper`现已实现。前者显式接受V1.3 WAITING TestRun并幂等初始化双市场PAPER/FAKE账户；后者执行完整V1.3 Web/API/CLI隔离E2E。新增命令单测4/4、合同检查、Web/Platform类型检查通过；正式`verify:paper` exit 0、Playwright 22/22，证据见[V1.3 §8.45](../prd/v1-local-simulation/03-fake-broker-trading-loop.md#845-seedpaper-与-verifypaper-命令契约-2026-10-10)。命令实现没有改变阶段完成状态。接下来执行V1.3 code suite和正式V1版本门禁，并继续处理P0/P1/P3/P4/P5及外部条件；4个历史Run导出、OD-014/旧非终态Run处置、活动存储维护批准与恢复、Ubuntu实机和当前范围人工验收仍未满足。

2026-10-10 V1.3命令交付验证：完整`pnpm verify:stage -- --stage V1.3 --suite code` exit 0，包含新增seed/verify命令的baseline单测、合同与Fixture、隔离PostgreSQL恢复、服务身份HTTP及迁移检查；原始日志见[V1.3代码套件](../../evidence/audits/2026-10-10-v13-seed-paper-code-suite-a01.log)，SHA sidecar随附。`verify:paper`此前实际运行exit 0、Playwright 22/22，见阶段§8.45。首轮正式门禁报告旧V1.2快照SHA与当前源码不一致；核对后明确该清单为2026-10-06历史执行快照并在对应原文标注历史属性，没有改写旧Hash或旧证据。修正分类后的门禁a315为INCOMPLETE，阶段文档审计PASS、证据审计PASS（799引用、106份Manifest、245项）；未满足项仍包括4个历史Run导出、各阶段/人工交付、OD-014/旧Run/维护恢复决定、Ubuntu和本人验收。[a315日志](../../evidence/audits/2026-10-10-v1-version-gate-a315.log)，SHA-256见sidecar。

正式门禁a316（计划与进度已记载a315结果后复核）：五阶段文档审计PASS、证据审计PASS（799引用、106份Manifest、245项），V1仍INCOMPLETE/exit 2。历史导出缺口与外部决定、环境和人工验收条件继续阻止完成。[a316日志](../../evidence/audits/2026-10-10-v1-version-gate-a316.log)，SHA-256见sidecar。

V1.3第7节已增记`seed:paper`/`verify:paper`命令子交付，00-version-plan和99验收表同步当前状态；V1.3父阶段仍PARTIALLY_IMPLEMENTED，未把自动测试误记成人工签收。a317为上述文档更新后的V1门禁复核（INCOMPLETE，文档/证据审计PASS）。

正式门禁a319（更新00-version-plan、V1.3 §7及99验收记录后）：文档审计PASS、证据审计PASS（800引用、106份Manifest、245项），版本仍INCOMPLETE/exit 2；尚有历史Run导出、工程/决定/环境和当前范围人工签收条件未满足。[a319日志](../../evidence/audits/2026-10-10-v1-version-gate-a319.log)，SHA-256见sidecar。

2026-10-10 P0/A01追踪增量：V1总验收命令门禁行`V1-99-GATE-03`现映射新增`seed:paper`/`verify:paper`的四个精确测试名、阶段§8.45和code/E2E日志。完整145项索引的证据路径存在性复核0缺失，索引SHA已更新。此项只补V1.3命令子合同，五阶段完整运行命令与最终用户/环境验收仍留在OPEN。

P0/A01交叉索引更新后的正式V1门禁a321：五阶段结构审计PASS、证据审计PASS（800引用、106份Manifest、245项），版本仍INCOMPLETE/exit 2；四个历史TestRun结构化导出仍缺失，工程/决定/环境/人工门槛未全部满足。[a321日志](../../evidence/audits/2026-10-10-v1-version-gate-a321.log)，SHA-256见sidecar。

### 2026-10-10 续跑：V1.3 AUTO Mandate预算终态独立读回

发现V1.3 AUTO正式交易虽由Governance持久化Mandate预算，但Platform订单结果与刷新后的Web投影没有独立展示预算终态。本轮增加精确owner/TestRun/Mandate ID与版本的Governance只读回读；已提交交易后读回故障明确返回`NOT_VERIFIED`，不反转交易响应、不诱导盲目重试；新增会话保护的预算GET路由，刷新后恢复预算快照。完整`pnpm test:e2e:v13-isolated`退出0、22/22；新增预算路由后Platform身份矩阵27/27（匿名401/伪造owner403）。L04固定CN运行`00f726fb-a078-484a-964c-35d7103cd488`的真实隔离容器结果为`reservedAmount=0.00`、`consumedAmount=1005.00`、`consumedCount=1`，浏览器刷新后仍显示，独立FakeBroker/Portfolio MATCH、同Run CLI及精确清理通过。完整日志[见此](../../evidence/audits/2026-10-10-v13-mandate-budget-readback-web-e2e-a01.log)，SHA-256 `9dedcc1931c73a0ce88acf1e8c042a6fc39c1699b837ba8d6b2ce117bb9bba11`。Stage §8.46、测试计划、版本计划、验收表及Platform架构已同步；只关闭V1.3 AUTO成功路径预算读回子项，不改变阶段/版本状态。

正式V1门禁a323（Mandate预算读回证据与计划同步后）：V1仍`INCOMPLETE`/exit 2；五阶段文档结构审计PASS，证据审计PASS（804引用、107份Manifest、246项）。四个指定历史Run结构化导出缺失、版本摘要/门禁复选项未关闭；OD-014、三条旧非终态Run处置、活动存储维护批准与完整恢复、Ubuntu实机和当前范围人工验收仍未满足。[a323日志](../../evidence/audits/2026-10-10-v1-version-gate-a323.log)，SHA-256 `0b648a4dd1dd40817699014cac53d148c7535287696e27793370cbbe932d8b73`。

V1.3 AUTO Mandate预算读回改动后的`pnpm verify:stage -- --stage V1.3 --suite code`完整通过，包含contracts/fixtures/docs、全部V1.3服务、FakeBroker/Portfolio/Governance隔离HTTP与PostgreSQL、身份边界及迁移CLI检查；完整日志[见此](../../evidence/audits/2026-10-10-v13-mandate-budget-readback-code-suite-a02.log)，SHA-256 `649f3012af17f50c6026f49b4546d7f8a7689a9de74cd64fd2685700bd7fdd31`。V1要求-测试交叉索引`V1.3-S2-L13`已加入精确的预算读回失败安全单测和E2E/code日志，145项索引SHA已刷新为`49cc6e01732dda77ece05b1075e5d9c69dd625a16ddcb74f40800c36dc93bc97`。该父需求仍OPEN，因多腿执行/结算路径及其他市场/授权范围未完成。

正式V1门禁a324（V1.3 AUTO Mandate预算读回完整E2E/code suite、交叉索引和文档同步后）：整体仍`INCOMPLETE`/exit 2；五阶段结构审计PASS，证据审计PASS（810引用、109份Manifest、248项）。四个历史Run结构化导出缺失、版本摘要/门禁项未关闭；OD-014结算口径、三条旧非终态Run处置、活动存储维护批准与完整恢复、目标Ubuntu和本人验收仍未完成。[a324日志](../../evidence/audits/2026-10-10-v1-version-gate-a324.log)，SHA-256 `4d3c0974fb6a86d69cdfce593a2b3e9370b38b3113890ed7dc223d869c01efb9`。

正式门禁a325（同步a324结果后重验）：五阶段结构审计PASS，证据审计PASS（813引用、110份Manifest、249项），但V1整体仍`INCOMPLETE`/exit 2。四个历史TestRun结构化导出、版本摘要/门禁关闭、OD-014及三条活动非终态Run处置、活动存储批准与完整业务恢复、Ubuntu实机和本人签收均未满足。[a325日志](../../evidence/audits/2026-10-10-v1-version-gate-a325.log)，SHA-256 `358e4cd1b73dcf7ac6539b7f28426d1b82649f232600744d9cac7cebbf87a2a4`。

2026-10-10 Ubuntu环境前置只读复核：`pnpm verify:w8:ubuntu-host`退出2，当前执行主机为macOS/aarch64，不是目标Ubuntu x86_64，Linux容器运行时探测UNAVAILABLE；检查没有读凭据、访问外网、改服务或运行迁移。资源阈值与目标主机授权也未定义/确认，不能把Mac Docker仿真记作Ubuntu验收。[原始报告](../../evidence/audits/2026-10-10-w8-ubuntu-host-preflight-a01.log)，SHA-256 `83ee428b63a69144d86e5c66974c3afa68e06d53a1ea2288b20128b80787a507`。

正式V1门禁a326（Ubuntu主机前置审计同步后）：V1仍`INCOMPLETE`/exit 2，阶段文档结构审计PASS、证据审计PASS（817引用、111份Manifest、250项）。四个历史TestRun导出、决策/活动数据维护与完整恢复、目标Ubuntu实际环境、版本关闭和当前范围人工验收均未满足。[a326日志](../../evidence/audits/2026-10-10-v1-version-gate-a326.log)，SHA-256 `29af2c8df97be36492faff208a7398a8b9a62086a1717fc7bcfb2f045749db96`。

正式V1门禁a327：结构审计PASS、证据审计PASS（820引用、112份Manifest、251项），整体`INCOMPLETE`/exit 2。四个指定历史TestRun结构化导出仍缺失；只读检索没有发现可验证归档源。OD-014及三条旧非终态Run处置、活动存储维护批准和完整业务恢复、Ubuntu实机及本人当前范围验收仍未满足。[a327日志](../../evidence/audits/2026-10-10-v1-version-gate-a327.log)，SHA-256 `9cea4bb914f23afdb91c0a867747d1c4dcf70053b6bcd92dfc103f5ff980c0e3`。

正式门禁a328在a327同步后复核：五阶段结构审计PASS、证据审计PASS（822引用、112份Manifest、251项），V1仍`INCOMPLETE`/exit 2。四个历史导出、OD-014/旧Run决定、活动存储维护与配对恢复、Ubuntu实机和本人验收仍未满足。[a328日志](../../evidence/audits/2026-10-10-v1-version-gate-a328.log)，SHA-256 `e9cdcba42a1854c9a054e430d38550829bbb95d4212591caeddebb05c764a119`。

2026-10-10共享Platform API兼容回归增量：V1.1/V1.2/V1.4/V1.5完整代码套件在V1.3 Mandate预算独立读回改动后均退出0，按阶段记录于§8.21/8.32/8.15/8.26。V1.2完整Web/API/CLI/export四Run通过；V1.4 Artifact发布fencing 2/2，V1.5 Incident 3/3；随机隔离资源清理通过。该兼容性结果不关闭P1～P6父工作包、五阶段手工验收或环境/历史证据门槛。

同一共享Platform/Web变更后的定向浏览器兼容回归：V1.1 normal/rejection/recovery 3/3，V1.4 Chromium 5/5并做同Run CLI核验，V1.5 normal/AUTO/rejection/recovery及页面Incident/能力状态3/3；所有随机隔离资源清理。证据分别见阶段§8.22、§8.16、§8.27和2026-10-10完整日志。由于这些检查没有执行结算/完整业务恢复/Ubuntu与当前范围人工验收，不改变阶段或版本完成状态。

正式门禁a329在本轮兼容性证据同步后重验：文档结构审计PASS、证据审计PASS（829引用、112份Manifest、251项）；V1仍`INCOMPLETE`/exit 2，4个历史TestRun导出、OD-014/非终态Run处置、活动维护和全域业务恢复、Ubuntu实机与本人当前范围验收继续开放。[a329日志](../../evidence/audits/2026-10-10-v1-version-gate-a329.log)，SHA-256 `d222fcb2d9a4c394541acbbb971d67549c4458466d595938a01eee1afe9d000f`。

正式门禁a330（阶段兼容性浏览器回归同步后）：文档审计PASS、证据审计PASS（836/112/251），V1仍INCOMPLETE/exit 2；四个历史导出、结算/旧Run决定、活动维护恢复、Ubuntu实机和人工验收仍阻塞完成。[a330日志](../../evidence/audits/2026-10-10-v1-version-gate-a330.log)，SHA-256 `bd4fdb7a075181ec335d7d6a339656f889142055964c2517d7564cab14f9020c`。

P0交叉表校准增量：V1.2-S2-L18旧摘要错误地把US/缺失/退市样本列为后续缺口，与当前V1.2第2节的冻结双市场Fixture要求不符。现已依据`v1.2-market-data-4`及精确单测更新摘要、测试映射和剩余限制；9/9证据路径、5/5测试源标题、3/3执行点核验通过。未把合成Fixture扩大解释为真实市场日历或已完成的P2→P3策略交接，父项仍PARTIAL。交叉表SHA-256 `caef5b9085a496ece289c240a25e655d3f473627b83bd5330f138d453b90b98f`。


正式V1门禁a331（V1.2追踪摘要校准及交叉索引复核后）：结构审计PASS、证据审计PASS（838引用、112份Manifest、251项），V1仍`INCOMPLETE`/exit 2。校准只确认现有合成测试覆盖的CN/US、未来PIT、缺失会话、上市边界和历史不足；真实市场日历/来源语义及P2→P3策略交接仍是明确缺口。四个历史TestRun导出、OD-014/旧Run处置、活动存储维护与配对恢复、Ubuntu实机和本人验收继续未完成。[门禁日志](../../evidence/audits/2026-10-10-v1-version-gate-a331.log)，SHA-256 `68d1742f0bac54c8cdd2913b7980d48d3a374fc33f19607391a6cc0537eb43ac`。


2026-10-10 P0/P1基线：当前树`pnpm baseline:check`受控执行exit 0；文档、298 JSON/206 schema/50 Fixture、合同兼容、29生成器、34 Fixture文件、共享Artifact库、八个服务分层及60项基线脚本测试通过。首轮受限sandbox的两个seed:paper测试因loopback EPERM未能监听；同机受控重跑3/3后完整基线通过。该结果只验证仓库基线，不替代逐阶段code/Web/API/CLI、全交易规则对照、环境或人工验收。原始输出[见此](../../evidence/audits/2026-10-10-v1-current-tree-baseline-a01.log)，SHA-256 `ccdf50e40440f22948347fd332accf372f386110f426c82017fbea62fcc9b644`。


正式V1门禁a332（当前树基线及进度页同步后复核）：阶段文档审计PASS、证据审计PASS（842引用、112份Manifest、251项），整体仍`INCOMPLETE`/exit 2。当前树完整`pnpm baseline:check`退出0（证据见上），仅证明通用工程基线；四个历史导出、OD-014/旧Run处置、活动存储维护/全域恢复、Ubuntu实机、五阶段剩余交付和本人当前范围验收仍开放。[a332日志](../../evidence/audits/2026-10-10-v1-version-gate-a332.log)，SHA-256 `2eb9a8441ff3e33f4da7b348b35b3e363e01e616f4db39748f61c0be93aab084`。


P3/V1.3模式边界增量（2026-10-10）：补测Governance历史回测授权端点：三种LIVE/REAL注入在真实HTTP+隔离PG返回422且不建授权记录，合法BACKTEST/FAKE路径继续授权并单次消费。Governance 41项单测、服务身份HTTP+PG smoke、完整V1.3 code suite均通过；完整套件日志[见此](../../evidence/audits/2026-10-10-v13-historical-replay-mode-boundary-code-suite-a01.log)，SHA-256 `f32f35cb3f27d3183522002628e04bd3ca224bc68e75745de593152ee5eb5a0f`。§2全量模式矩阵父项未关闭，其他Paper/Backtest服务与Worker接受路径及页面状态/余额篡改仍待复核。交叉表V1.3-S2-L17已增补两项精确测试映射并刷新SHA至`e33a284f62dcec632edb7f7577aebedd4dc5ae1f75fe09b4361ac1e124eb0ebf`。


正式V1门禁a333（本轮V1.3 Governance历史Replay模式拒绝子项和交叉表同步后）：文档审计PASS、证据审计PASS（846引用、113份Manifest、252项），总版本仍`INCOMPLETE`/exit 2。P3该子项通过不关闭全路由模式审计。4个历史TestRun导出、OD-014/旧Run处置、活动数据恢复、Ubuntu实机、全阶段余项和本人当前范围验收继续开放。[a333日志](../../evidence/audits/2026-10-10-v1-version-gate-a333.log)，SHA-256 `4622816719b6af691cb8d8c144dd37a7b12db592d64f4de821aa0985606fe9ef`。

2026-10-10 P3/P4增量：V1.4 Platform回测创建入口曾忽略客户端交易模式字段；现以顶层Schema白名单拒绝四种模式注入。隔离PostgreSQL/Quant/Web/CLI集成、5项浏览器E2E和同Run CLI检查通过，拒绝请求不产生Quant Run，隔离资源清理通过。完整V1.4 code suite exit 0，详见[套件日志](../../evidence/audits/2026-10-10-v14-mode-boundary-code-suite-a01.log)；首轮发现缺陷的失败记录保留。专项详情见[V1.4 §8.17](../prd/v1-local-simulation/04-daily-backtest.md#817-v14回测入口拒绝客户端交易模式注入2026-10-10)及[执行记录](../../evidence/audits/2026-10-10-v14-platform-mode-injection-http-e2e-a01.log)。此仅关闭一个回测创建端点的字段注入切片；P3全路由矩阵、V1.4结算/全规则、Ubuntu及本人验收继续OPEN。

P0交叉映射随本次代码完成更新：`V1-90-STAGE-V1.4`现含精确模式注入断言和两份当前执行证据；独立核验源码断言、四种请求组合、HTTP 422与Quant无新增Run断言均存在，索引与阶段文档路径有效。机器核验[见此](../../evidence/audits/2026-10-10-v1-crosswalk-v14-mode-a01.json)，SHA-256 `7d0db229bc8f49681a319ae0194e6b30caa98dba6a550ef8e9e5cdb46255bbf7`；交叉表SHA-256 `ac1d00c170ec855dcad8571564f7cbf9c386c47eb3d84d5010693d4e451e996e`。V1.4结算父项和P0整体语义符合性继续OPEN。

2026-10-10 P1活动存储只读复核A02：最新`stockquant-v12/platform_api` legacy计数60（COMPLETED 54、FAILED 3、RUNNING 2、WAITING 1），相较A01的59条发生1条已完成Run增量；V1.1 stage仍44条，3个legacy非终态Run保持原状，stage全表仍有12条非终态。四个历史UUID仍不在活动两表。Platform容器仍是legacy且无挂载，Artifact卷只挂Research Automation，Compose/运行漂移需维护负责人确认。结果及精确ID见[Runbook A02](../operations/v11-test-run-storage-cutover.md#2026-10-10-活动运行时只读复核-a02)与[审计](../../evidence/audits/2026-10-10-v1-active-runtime-preflight-a02.md)，SHA-256 `992834d575d0d93393846956eaf4fd8c4d4b53406671a176932f16b02ecf395c`；机器报告SHA-256 `2c51bf95c95d1befed7150b24de1132ba886d521d65798c9f90daa84bdfbf7f4`。只读复核没有授权或执行切换、备份、挂载调整或Run处置；P1继续阻塞于目标确认、Artifact核对、Run逐项处置、最新逐行Parity及维护窗口/隔离恢复。

2026-10-10 P3/V1.2 Platform模式边界增量：`POST /api/v1/acceptance/v1/v1.2/runs`严格拒绝`scenarioId`/`seed`之外字段；四种PAPER/LIVE/REAL注入均422，隔离数据库V1.2 TestRun计数不变。完整V1.2代码套件exit 0，[套件日志](../../evidence/audits/2026-10-10-v12-mode-boundary-code-suite-a01.log)SHA-256 `3163404e01ff1c7ee1a3921a1c95bc3d31343d027d758fbbda13822fe99370a2`；隔离Web/API/CLI E2E四Run、Qlib双市场、取消、Platform重启恢复及精确资源清理通过，详见[V1.2 §8.33](../prd/v1-local-simulation/02-small-data-and-qlib.md#833-v12-testrun创建拒绝客户端交易模式注入2026-10-10)、[E2E日志](../../evidence/audits/2026-10-10-v12-mode-injection-e2e-a01.log)和[机器报告](../../evidence/audits/2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-82d1d16c378eac819679.json)。需求映射新增V1.2-S2-L20，交叉表SHA-256 `ef43bb602e593afa9bc8917dc34f2ff5545aceddf4cfe57cc748bf9e55b7836d`。同步更新[A05跨服务路由矩阵](../../evidence/audits/2026-10-09-v1-cross-service-route-matrix-a05.md)。仅关闭一个入口原子断言，P3全路由矩阵、活动部署、历史导出、OD-014、Ubuntu与本人验收仍OPEN。

正式V1门禁a342（V1.2模式边界、完整V1.2代码套件日志及交叉映射同步后）：阶段文档审计PASS、证据审计PASS（867引用、115份Manifest、254项），V1仍`INCOMPLETE`/exit 2。四个历史TestRun导出、OD-014/旧Run处置、活动存储切换与恢复、目标Ubuntu及本人验收未完成。[a342日志](../../evidence/audits/2026-10-10-v1-version-gate-a342.log)，SHA-256 `b9b0932e7f8cc376282e2fbe469ef2669155a7f430a672023ba3d614fa27c54a`。

正式V1门禁a343（V1.2模式边界逐项复核和索引同步后）：五阶段结构审计PASS、证据审计PASS（870引用、115份Manifest、254项），总版仍`INCOMPLETE`/exit 2。四个历史结构化Run导出、OD-014/旧Run决定、活动存储维护和完整恢复、Ubuntu实机与本人当前范围验收仍未满足。[a343日志](../../evidence/audits/2026-10-10-v1-version-gate-a343.log)，SHA-256 `10928f284170b77a1852220171d949ccdc12e2eaa5b277e6c6dbea9d10c9a942`。

2026-10-10 P3/V1.5 Platform模式边界增量：V1.5 Run创建此前忽略请求中的额外`environmentMode`/`brokerMode`，可能让错误请求继续创建Run并派发工作；现已在运行时拒绝`scenarioId`、`seed`之外字段。四种模式注入均422，PostgreSQL V1.5 Run数量不变。完整V1.5代码套件exit 0；独立Web/API/CLI E2E三项浏览器用例、normal/AUTO/rejection/recovery四个同Run场景、7条路由身份矩阵及资源清理通过。详见[V1.5 §8.28](../prd/v1-local-simulation/05-scheduling-and-recovery.md#828-v15-testrun创建拒绝客户端交易模式注入2026-10-10)、[E2E日志](../../evidence/audits/2026-10-10-v15-platform-mode-boundary-e2e-a01.log)、[code suite日志](../../evidence/audits/2026-10-10-v15-platform-mode-boundary-code-suite-a01.log)及[A05路由矩阵](../../evidence/audits/2026-10-09-v1-cross-service-route-matrix-a05.md)。逐项映射147项索引SHA-256 `39d819a5e4a39934349f231dfbae528e665720be3e43a26d075c61c8448a7b53`，原子复核[见此](../../evidence/audits/2026-10-10-v1-crosswalk-v15-mode-a01.json)，SHA-256 `57094131a17c7fcfbc98e62bd7533a5dde268163a42b65b5a8ed7ecd838d343b`。此项只覆盖V1.5 Platform Run创建；全V1服务/Worker模式矩阵和阶段其它未完成任务继续OPEN。

正式门禁a344（V1.5边界证据与文档同步后）：五阶段文档审计PASS；证据审计PASS（876引用、116份Manifest、255项），V1仍`INCOMPLETE`/exit 2。四个指定历史TestRun结构化导出、OD-014及三条旧非终态Run处置、活动存储维护与完整业务恢复、目标Ubuntu实机和当前范围本人验收仍未完成。[a344日志](../../evidence/audits/2026-10-10-v1-version-gate-a344.log)，SHA-256 `43b9ad50014657ee322a287befc2f260ccafc718add40ffcc3d72e0f39fbdac3`。

2026-10-10 P0交叉表当前树重审：147项的1329条来源/验收/测试计划/证据路径均可解析；发现13个映射测试标题不在对应文件中逐字出现、6条测试名缺精确文件路径、13项当前来源锚点文本与记录不符。测试标题差异可能是运行报告标签，需逐条回到源码/实际报告核定，不能据此推断测试失败或覆盖通过。当前审计及逐项清单见[机器报告](../../evidence/audits/2026-10-10-v1-crosswalk-current-tree-a01.json)，SHA-256 `7b12c3966596facc4dfe38ab567d61131c091b3021153c8b1b3f4c00570efd1d`。P0继续OPEN，待校正精确引用并完成语义覆盖复核。

正式门禁a345（P0当前树交叉表审计纳入证据后）：阶段文档审计PASS、证据审计PASS（878引用、116份Manifest、255项），V1仍`INCOMPLETE`/exit 2。四个历史Run导出、OD-014/旧Run处置、活动维护/完整恢复、Ubuntu及本人验收仍OPEN；P0精确映射语义核定继续进行。[a345日志](../../evidence/audits/2026-10-10-v1-version-gate-a345.log)，SHA-256 `69ea2ef0876aadae1335d7f57730285e9e6852a86a00615838039f6d174f6760`。

2026-10-10 P0结构映射问题更正：先前a01/a02发现的6条无路径测试名、13条非字面测试映射及13条过期锚点已逐条核对并修正交叉表；当前147项、1329个路径引用、151个精确测试名和147个来源锚点均通过结构复核，见[a04机器报告](../../evidence/audits/2026-10-10-v1-crosswalk-current-tree-a04.json)，SHA-256 `712235625f661925de4a9604efe957c598134b4ba4f2ade6ac6457bb562a5dfd`；交叉表SHA-256 `8b708ea516b7d58bdf10356ac811d0a4cb0aaa69f3ded50dc1294a9761e4080a`。该修复只关闭路径/字面引用/来源锚点漂移，不证明测试行为或业务覆盖充分；P0语义复核继续OPEN。

正式门禁a346（当前交叉表结构校正后）：阶段文档审计PASS，证据审计PASS（880引用、116份Manifest、255项）；V1仍`INCOMPLETE`/exit 2。P0语义覆盖、P1–P6未完成工程/决定/环境与历史/本人验收仍OPEN。[a346日志](../../evidence/audits/2026-10-10-v1-version-gate-a346.log)，SHA-256 `7ef72830293f445143e81a7f1314b302fe582bc8c7245609a574a4b2b08bf8b5`。

正式门禁a347（当前Artifact生产者源码盘点同步后）：五阶段结构审计PASS，证据审计PASS（882引用、116份Manifest、255项），V1仍`INCOMPLETE`/exit 2。Artifact清理/保留和活动数据切换仍受OD-013及维护输入阻塞；P0语义、历史证据、其它P1–P6任务、Ubuntu及本人验收继续OPEN。[a347日志](../../evidence/audits/2026-10-10-v1-version-gate-a347.log)，SHA-256 `07dbf45f5a14f6b9fd67bdf9409fac824bc71064e7b45f0fdbf2edc12e239fa5`。

2026-10-10执行增量（A07/P3）：Platform API AUTO Mandate激活和暂停路由缺少客户端`environmentMode`/`brokerMode`拒绝守卫，现已在路由进入身份/状态处理前拒绝。完整V1.3隔离Web/API/CLI E2E 22/22通过，覆盖激活/暂停的`LIVE/FAKE`、`PAPER/REAL`、`LIVE/REAL`六次拒绝、状态无副作用、合法转换可用及零FakeBroker订单/Fill；TestRun `51edf948-3229-46a4-9b92-6a639321caa3`，Manifest Hash `5749c505fe9c8779aae33f604ab71ecde63fce68de70db1d18319a77a4cb0725`，详见[V1.3 stage §8.48](../prd/v1-local-simulation/03-fake-broker-trading-loop.md#848-platform-auto-mandate激活暂停模式拒绝2026-10-10)。完整V1.3代码套件exit 0，日志SHA-256 `8d84833c3be862de2c22d8eaf86b7e735ab5389a1464a964fb17d82f6f7d3999`，详见[日志](../../evidence/audits/2026-10-10-v13-platform-mandate-mode-boundary-code-suite-a01.log)及[SHA-256](../../evidence/audits/2026-10-10-v13-platform-mandate-mode-boundary-code-suite-a01.log.sha256)。P3全量模式审计和V1剩余交付仍OPEN。

正式门禁a348（本轮代码/E2E证据和阶段记录同步后）：五阶段结构文档审计PASS，证据审计PASS（888引用、118份Manifest、257项），V1整体`INCOMPLETE`/exit 2。剩余硬缺口包括V1.2的`5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`与V1.5三个历史Run无结构化导出、五阶段尚未全部验收关闭、OD-013/OD-014及旧Run决定、全V1业务数据/存储恢复、目标Ubuntu实机证据和新增范围用户人工验收。门禁日志SHA-256 `8416e8a68a5d60f20ac12da5926c8dc64d37f239b7b7c0a897e3f5d5f7fb3f96`（[a348日志](../../evidence/audits/2026-10-10-v1-version-gate-a348.log)、[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a348.log.sha256)）。不得据此声明V1完成。

正式门禁a349（计划、进度、版本验收摘要同步后）：五阶段结构文档审计PASS，证据审计PASS（892引用、119份Manifest、258项），V1整体`INCOMPLETE`/exit 2。四个历史Run仍缺结构化导出；五阶段尚未全部收尾，OD-013/OD-014与旧Run处置、全V1业务数据恢复、Ubuntu实机及当前范围人工验收仍未满足。日志SHA-256 `837eef61a7c8b032b35417ab6b7aeb70b1796a0322248777c2dc02a0f0a894da`（[a349日志](../../evidence/audits/2026-10-10-v1-version-gate-a349.log)、[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a349.log.sha256)）。不得据此声明V1完成。

2026-10-10历史Run导出来源核查：缺失的V1.2 Run在三个仍运行本地V1.2 Platform API上均无法找到（HTTP 404）；三个V1.5 Run所在旧隔离项目只有部分服务仍运行，Platform API容器缺失。为了避免启动旧栈时触发积压Temporal/NATS/outbox模拟交易，没有重启容器、回放任务或改写Run；详情见[来源核查记录](../../evidence/audits/2026-10-10-v1-history-export-source-check-a01.md)及[SHA-256](../../evidence/audits/2026-10-10-v1-history-export-source-check-a01.md.sha256)。这证明当前查询源无法提供导出，不证明Run从未存在或原业务验收失败。四个历史证据仍待原始存储或既有导出来源恢复。

正式门禁a350（历史Run来源核查与记录更新后）：五阶段结构文档审计PASS，证据审计PASS（896引用、120份Manifest、259项），V1仍`INCOMPLETE`/exit 2。缺失的V1.2历史Run在三个活动V1.2 API上均404；三个V1.5历史Run所在旧栈缺Platform API，未启动旧栈或重放任务，详见[来源核查](../../evidence/audits/2026-10-10-v1-history-export-source-check-a01.md)。门禁SHA-256 `887c21b41f9818ea50e8c0351611b24bfa6e5fce65100730b53643b45b5fbe07`（[a350日志](../../evidence/audits/2026-10-10-v1-version-gate-a350.log)、[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a350.log.sha256)）。其余工程/决定/环境/人工验收阻塞保持开放。

正式门禁a351（阶段第7节子项更新后）：五阶段结构审计PASS，证据审计PASS（900引用、121份Manifest、260项），V1仍`INCOMPLETE`/exit 2。四个旧Run缺结构化导出，OD-013/OD-014与旧Run处置未决、全V1业务恢复、Ubuntu实机及人工验收继续OPEN。日志SHA-256 `68f7297dba0b2f60476ae414016331ca718bc62ab68af32fb9b867c9fdae5445`（[a351日志](../../evidence/audits/2026-10-10-v1-version-gate-a351.log)、[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a351.log.sha256)）。
2026-10-10 执行增量（A07/P3）：Platform Proposal修订/审批及Session推进入口在任何业务读取/写入前拒绝客户端交易模式注入；9个模式组合请求均422，拒绝后Proposal状态/版本/hash和Run Clock不变。合法Proposal由Platform从验证过的PAPER/FAKE账户派生模式。完整V1.3隔离Web/API/CLI E2E 22/22与完整code suite exit 0；完整命令/证据见[V1.3 §8.49](../prd/v1-local-simulation/03-fake-broker-trading-loop.md#849-platform-proposal修订审批与session推进模式拒绝2026-10-10)、[E2E日志](../../evidence/audits/2026-10-10-v13-proposal-mode-boundary-e2e-a02.log)和[code日志](../../evidence/audits/2026-10-10-v13-proposal-mode-boundary-code-a01.log)。只关闭这些入口子项，A07/P3父项仍开放。

正式门禁a352（Proposal模式边界与完整V1.3 code suite证据同步后）：阶段结构审计PASS、证据审计PASS（908引用、124份Manifest、263项），但V1仍`INCOMPLETE`/exit 2。门禁指出4个历史TestRun缺结构化导出，版本摘要与V1门禁复选项未关闭，OD-013/OD-014及旧Run决定、全V1业务恢复、Ubuntu实机和人工验收仍待完成。[a352日志](../../evidence/audits/2026-10-10-v1-version-gate-a352.log)，SHA-256 `a6e58a1b467744b47b77068d84d4d013c55d92f1d4317604f7ed9e6aaf8fa1bc`。不得据自动套件PASS推断V1关闭。

正式门禁a353（更正验收清单中V1.5局部人工状态标题并复核）：阶段文档审计PASS、证据审计PASS（911引用、125份Manifest、264项）；`versionSummaryIncomplete=false`，V1仍`INCOMPLETE`/exit 2，原因包括四个历史Run导出缺失及版本门禁条件未完成。OD-013/OD-014、旧Run处置、完整V1业务恢复、Ubuntu实机和本人验收仍开放。[a353日志](../../evidence/audits/2026-10-10-v1-version-gate-a353.log)，SHA-256 `788c6e282005c34b497433cdc2bcbc7e512bf24ca7a4376d317e64166dd45490`。

正式门禁a354（补录首次失败回归及其修复历史后）：五阶段文档审计PASS、证据审计PASS（913引用、126份Manifest、265项），版本仍`INCOMPLETE`/exit 2；`versionSummaryIncomplete=false`，但版本验收门禁未勾项、四个历史Run缺失导出、待决事项、全V1恢复、Ubuntu与人工签署仍阻止完成。[a354日志](../../evidence/audits/2026-10-10-v1-version-gate-a354.log)，SHA-256 `4317541b58a5b2c01dd2e489767d815395c43bad63d127129a6f2ff8d9f507b7`。

2026-10-10 A01/P0索引增量：将V1.3 Platform Proposal修订/审批与Session推进模式拒绝的最新E2E/code suite日志关联至V1.3-S2-L17机器交叉索引，并同步V1测试计划；父项仍OPEN，因全V1服务/Worker写路由矩阵、回测业务操作和Web状态/余额篡改仍待验证。交叉索引SHA-256 `fe0de07529c222711d0407e515b66912c372fdf6e3b548eb79d950545b776631`。局部工作通过`pnpm docs:check`（7320链接、0失败）及`git diff --check`。

正式V1门禁a356（最终交叉索引哈希和计划记录同步后）：阶段结构审计PASS、证据审计PASS（913引用、126份Manifest、265项），V1仍`INCOMPLETE`/exit 2；四个历史TestRun导出、版本门禁未勾项、待决事项、全V1恢复、Ubuntu和人工验收仍未完成。日志SHA-256 `4317541b58a5b2c01dd2e489767d815395c43bad63d127129a6f2ff8d9f507b7`（与a354/a355字节一致）。[a356日志](../../evidence/audits/2026-10-10-v1-version-gate-a356.log)。

2026-10-10 A01/P0结构复核a05：当前交叉索引源锚点有一条因V1.3测试计划更新而过期，现已按当前源码行修正。复核147项、1484条声明路径引用、356个唯一已解析路径、151个精确测试名、147个来源锚点；缺失路径/测试标题/锚点均为0。机器报告[a05](../../evidence/audits/2026-10-10-v1-crosswalk-current-tree-a05.json)，SHA-256 `b262b29d5511dd09e1363e60ccb163fdd49ae4cbd0f5315ca32e6b1d15b78367`；交叉索引SHA-256 `e2c70bd6af7a9c9edc6797818e4c0a42053e900ccbb7c1acc67def06e6922870`。这只证明当前追踪结构一致，不关闭P0需求语义覆盖审查。

正式V1门禁a357（P0交叉表锚点同步后）：文档结构与证据审计通过，V1仍`INCOMPLETE`/exit 2；未完成的历史TestRun、决定、业务恢复、Ubuntu及人工验收条件持续阻止版本关闭。日志SHA-256 `4317541b58a5b2c01dd2e489767d815395c43bad63d127129a6f2ff8d9f507b7`，与a354–a356相同。[a357日志](../../evidence/audits/2026-10-10-v1-version-gate-a357.log)。

2026-10-10 A07/P3增量：Platform V1.3账户/Proposal/Mandate/执行写入口现拒绝客户端注入服务器所有的状态、现金/余额、持仓、账本、订单和成交事实；隔离Web/API/CLI矩阵22/22通过、完整V1.3 code suite exit 0，拒绝后账户/Proposal/Run Clock未变且FakeBroker订单/Fill为0。操作说明与V1验收表已同步，E2E/TestRun `a4e1f3b8-510d-4527-b6e2-356d9f4250c1`、Manifest SHA-256 `5c68036847e2115533a422280a006372556c9f372acb5719e8b9b2eb23986f47`。证据：[§8.50](../prd/v1-local-simulation/03-fake-broker-trading-loop.md#850-platform写入口拒绝客户端注入账户与交易事实)、[E2E](../../evidence/audits/2026-10-10-v13-server-owned-facts-e2e-a02.log) SHA-256 `7e8c5fc243c4ceca42b40e60d63b959678c2e0e757d58f63bdf905ff1f85658a`、[code suite](../../evidence/audits/2026-10-10-v13-server-owned-facts-code-a01.log) SHA-256 `c8d48794270a84a91ffc50eb761aec68a63303c0cb7b773ab2811746a3fbc269`。P3全V1/V1.1路由与Worker、回测端点和更多Web状态写入面仍OPEN；本项不关闭L17/P3父要求或人工验收。

2026-10-10 A01/P0结构复核a06：本轮测试计划、验收摘要和证据路径同步后，147项、1486条路径引用、358个唯一已解析路径、151个精确测试引用及147个来源锚点全部通过，无缺失。报告[a06](../../evidence/audits/2026-10-10-v1-crosswalk-current-tree-a06.json)，SHA-256 `e8ffac29bc995c925d115650582dbe3a7e9864efb23dccd64f5e60bd5f115195`；当前交叉索引SHA-256 `7ba3b4f659bd2ac6c32291314ae6fb40a60ee5b1a9efa98128d2cf9a8f3dd21d`。只证明结构一致，语义覆盖审查仍开放。

正式V1门禁a358（客户端业务事实拒绝、交叉索引、阶段测试计划与验收摘要同步后）：状态仍`INCOMPLETE`/exit 2；阶段文档审计PASS、证据审计PASS（917引用、126份Manifest、265项），`versionSummaryIncomplete=false`，但`uncheckedVersionGate=true`。四个历史TestRun结构化导出、五阶段未关闭、OD-013/OD-014及旧Run处置、活动存储/业务恢复、Ubuntu实机和当前范围本人验收仍未满足。[a358日志](../../evidence/audits/2026-10-10-v1-version-gate-a358.log)，SHA-256 `41a1a63815ba3e873611c84198acd06d2fa8c1d470a2acf71c25f4c3150e9300`。

正式V1门禁a359（a358结果同步后复核）：阶段结构审计PASS、证据审计PASS（917引用、126份Manifest、265项），V1仍`INCOMPLETE`/exit 2，未完成条件与a358相同；日志SHA-256 `41a1a63815ba3e873611c84198acd06d2fa8c1d470a2acf71c25f4c3150e9300`。[a359日志](../../evidence/audits/2026-10-10-v1-version-gate-a359.log)。
2026-10-10 P3增量：四个此前bodyless的V1.3 Platform写入口（外部订单观察、sequenced Fill报告、sequenced撤单请求/结果）现拒绝非空客户端请求体，防止服务端生成的业务事实被伪造载荷混淆。定向隔离E2E及完整V1.3 E2E 22/22、V1.3 code suite均退出0；TestRun `8271379a-6c08-4fa1-9d66-045b2c4a87ca` Manifest SHA-256 `75e42e80bb092eb0d019af282e72636fc105b0f7905b6b2b9d7d156efcbd3ab5`，执行日志见[V1.3 §8.51](../prd/v1-local-simulation/03-fake-broker-trading-loop.md#851-platform事实保护扩展至无载荷命令2026-10-10)。该增量不关闭P3/L17：V1.1、Worker、Backtest写入口及完整Web状态篡改矩阵仍OPEN。
2026-10-10 P3增量：四个此前bodyless的V1.3 Platform写入口（外部订单观察、sequenced Fill报告、sequenced撤单请求/结果）现拒绝非空客户端请求体，防止服务端生成的业务事实被伪造载荷混淆。定向隔离E2E和完整V1.3 E2E 22/22、V1.3 code suite均退出0；全量Run `8271379a-6c08-4fa1-9d66-045b2c4a87ca` Manifest SHA-256 `75e42e80bb092eb0d019af282e72636fc105b0f7905b6b2b9d7d156efcbd3ab5`，定向日志见[V1.3 §8.51](../prd/v1-local-simulation/03-fake-broker-trading-loop.md#851-platform事实保护扩展至无载荷命令2026-10-10)。code suite日志SHA-256 `8a4b118c92bbe3ea13b7aeae721e627fe35be7333550ee98fdba136dd43015b7`，定向E2E日志SHA-256 `565ae433ab518f7906b146a096ed7b8c7be08e362703dffacef8b2f8b1754a65`。P3/L17父项仍OPEN：V1.1、Worker、Backtest写入口及完整Web状态篡改矩阵仍待审计。

P0/A01当前树交叉索引a07：将新增代码/E2E证据加入V1.3-S2-L17并更新V1.3测试计划来源锚点。147项、1729条路径引用、369个唯一已解析路径、151个精确测试名、146个当前来源锚点全部结构复核通过；缺失路径、测试名和来源锚点为0。交叉表SHA-256 `282b8f5ffc157f9b215e2285cbcc9ce5f80c3e9e48900607b1ebd3a1c2ce6c3b`；报告[a07](../../evidence/audits/2026-10-10-v1-crosswalk-current-tree-a07.json)，SHA-256 `a3ffb1355522e479f797325f9b0030d2f4692474355ff0afc6017eed2d65c734`。只证明结构链接，不证明语义覆盖。

正式V1门禁a361（本轮V1.3更新与交叉索引复核后）：五阶段文档审计PASS，证据审计PASS（918条引用、126份Manifest、265项），`versionSummaryIncomplete=false`、`uncheckedVersionGate=true`，V1仍`INCOMPLETE`/exit 2。V1.2一个及V1.5三个历史Run仍缺结构化导出，当前阶段交付/人工验收、待决事项、旧Run处置、活动恢复和Ubuntu实机仍阻塞。[门禁日志](../../evidence/audits/2026-10-10-v1-version-gate-a361.log)，SHA-256 `3e098614375efc58eaf87eb934afd32fedd37bf89970222e7014309d9266db39`。
2026-10-10 P3增量：V1.1 Platform Run创建现只接受`scenarioId/seed`，US账户初始化与恢复无载荷命令拒绝客户端status/cash/positions。V1.1完整阶段入口`pnpm test:e2e -- --stage V1.1`退出0（code suite、隔离PG迁移/持久化/身份、Web/API/CLI normal/rejection/recovery 3/3），详细见[§8.23](../prd/v1-local-simulation/01-environment-and-web-center.md#823-v11-platform命令拒绝客户端写入业务事实2026-10-10)与[执行日志](../../evidence/audits/2026-10-10-v11-client-facts-code-e2e-a01.log)，SHA-256 `7ab3675f8bca745102f19021463e03f583623095131e4760295c711ed92a7033`。新增Run及账户事实均422且Run状态不变；活动存储切换/回退、其它服务写路由和人工验收未改变。

P0/A01当前树交叉索引a08：将V1.1与V1.3写边界增量证据关联L17，并刷新两个V1阶段测试计划锚点。147项、1732条路径引用、371个唯一解析路径、152个精确测试名、146个来源锚点全部通过，无缺失。交叉索引SHA-256 `689f374342c4647ea23bd5d4002dfbf88007a99557c29fd3aad0cadb2a71411d`；报告[a08](../../evidence/audits/2026-10-10-v1-crosswalk-current-tree-a08.json)，SHA-256 `0f1f50390fb07c60e72a8d512a3d98457ad27228f568bb8e875ecf5f6af41abb`。仅结构一致，业务覆盖仍OPEN。
正式V1门禁a363（V1.1客户端事实边界回归、阶段文档和交叉索引a08更新后）：五阶段文档审计PASS，证据审计PASS（921引用、126份Manifest、265项），`versionSummaryIncomplete=false`、`uncheckedVersionGate=true`，版本仍`INCOMPLETE`/exit 2。四个历史业务Run导出、当前交付与人工签收、待决事项及旧Run处置、完整业务/存储恢复和Ubuntu实机仍未满足。[门禁日志](../../evidence/audits/2026-10-10-v1-version-gate-a363.log)，SHA-256 `cc92c0d46a4669bbad5f28456c8e4cf25de944867c4085447e6c87fea04239a1`。


2026-10-10 P3命令载荷边界增量：V1.2、V1.4、V1.5取消命令及V1.5 Incident确认拒绝客户端伪造业务事实。完整V1.2/V1.4/V1.5隔离阶段E2E均退出0；拒绝后状态保持不变、合法命令可正常执行。日志SHA-256分别为`8bf5375703bc1afee95e4e896455792e44fa18dd459638122afc5f5b8677d`（V1.2，准确值见日志 sidecar）、`188c0891a300d21326c4a14e29319ba0de324978ad87fff624d27853adfb935f`（V1.4）、`fd79e13e49fc2ff939f2d1a3503c7abfb67fc4133567701ab14c9eeb8840b729`（V1.5）。阶段记录：[V1.2 §8.34](../prd/v1-local-simulation/02-small-data-and-qlib.md#834-v12取消命令拒绝客户端业务事实注入2026-10-10)、[V1.4 §8.17](../prd/v1-local-simulation/04-daily-backtest.md#818-v14取消命令拒绝客户端业务事实注入2026-10-10)、[V1.5 §8.29](../prd/v1-local-simulation/05-scheduling-and-recovery.md#829-v15取消与incident确认拒绝客户端业务事实注入2026-10-10)。

P0/A01当前树交叉索引a09：同步上述证据与三个测试计划来源锚点。147项、1742条路径引用、377个唯一解析路径、156个精确测试名、143个来源锚点结构审计PASS，无缺失路径、测试名或锚点；交叉表SHA-256 `382dc286a7d27d1b8453ece5b2ce0d4667aac76db430828f61fcd47c4d762f5c`，报告[a09](../../evidence/audits/2026-10-10-v1-crosswalk-current-tree-a09.json)，报告SHA-256见sidecar。只证明追踪结构，不代替语义覆盖。


正式V1门禁a364（当前命令载荷边界与a09交叉索引更新后）：五阶段文档审计PASS，证据审计PASS（927引用、128份Manifest、267项），`versionSummaryIncomplete=false`，`uncheckedVersionGate=true`，V1仍`INCOMPLETE`/exit 2。V1.2一个、V1.5三个历史TestRun缺结构化导出；五阶段当前范围人工验收、OD-013/OD-014及旧Run处置、活动数据与完整业务恢复、目标Ubuntu实机仍未满足。[a364日志](../../evidence/audits/2026-10-10-v1-version-gate-a364.log)，SHA-256 `0c67c76ffbd7a78fd3a6aa285b0e511de57f11de6e41c8a81813541e032e0865`。


正式V1门禁a365（a364结果同步后复核）：五阶段文档审计PASS，证据审计PASS（928引用、128份Manifest、267项）；`versionSummaryIncomplete=false`、`uncheckedVersionGate=true`，版本仍`INCOMPLETE`/exit 2。4个既定历史Run缺少结构化导出，版本门禁未勾项仍包括阶段交付/当前范围人工验收、OD-013/OD-014及旧Run决定、活动业务/存储恢复与Ubuntu实机。`pnpm docs:check` 7384链接/0失败、`git diff --check`通过。[a365日志](../../evidence/audits/2026-10-10-v1-version-gate-a365.log)，SHA-256 `48ad5b5e357dff88753936e8bfd3207f5c20c6d9f2a372d58ece83a522aa8f0b`。


2026-10-10 V1基础门禁复验：初次沙箱运行中两项本机HTTP测试因`127.0.0.1`绑定EPERM未运行成功；在允许回环绑定的受控环境重跑`pnpm baseline:check`退出0，脚本测试60/60通过，合同/Fixture、分层与Artifact检查均通过。日志：[baseline a02](../../evidence/audits/2026-10-10-v1-baseline-check-a02.log)，SHA-256 `fa303318d27a91d436fdf2138ba9cac2e303b6ca92e2302232da9c1a6c0672f4`。这是基础工具链检查，不替代阶段业务验收。


正式V1门禁a366（基础工具链复验纳入证据后）：阶段文档审计PASS，证据审计PASS（929引用、128份Manifest、267项），`uncheckedVersionGate=true`、V1仍`INCOMPLETE`/exit 2。四个指定历史TestRun结构化导出缺失；决策、活动恢复、Ubuntu及当前范围人工验收未通过。[a366日志](../../evidence/audits/2026-10-10-v1-version-gate-a366.log)，SHA-256 `0a597b00495e4472bc3487eda60c0d4790488cd0b2346494974387ce4ff25d9a`。


正式V1门禁a367（本轮文档与证据记录同步后最终复核）：五阶段文档审计PASS，证据审计PASS（930引用、128份Manifest、267项），摘要无局部不完整状态，但`uncheckedVersionGate=true`，V1整体仍`INCOMPLETE`/exit 2。四个历史TestRun缺结构化导出，五阶段仍`PARTIALLY_IMPLEMENTED`；当前范围用户验收、未决决策、活动数据/全域恢复与目标Ubuntu实机未完成。[a367日志](../../evidence/audits/2026-10-10-v1-version-gate-a367.log)，SHA-256 `b34384a6b676007d5fdee96aab33556c6c476c785af1f0469a5a1986dfae024a`。


2026-10-10 P3/L08增量：V1.3部分成交撤单入口实测拒绝混合`cancelSequence`与客户端status/cash/ledgerVersion；拒绝后订单仍PARTIALLY_FILLED、40股Fill、FakeBroker现金9599.0000且双账本MATCH，正式Web撤单后剩余60股取消、费用更正和同Run CLI核验通过。TestRun `655b741e-3d45-4def-b7cf-9ff9792f1db2`。完整隔离Web/API/CLI/export E2E 22/22、V1.3 code suite exit 0；资源精确清理且外部行情/真实券商调用0。证据：[§8.52](../prd/v1-local-simulation/03-fake-broker-trading-loop.md#852-l08部分成交撤单拒绝客户端业务事实注入2026-10-10)、[E2E](../../evidence/audits/2026-10-10-v13-l08-cancel-injection-e2e-a02.log)，SHA-256 `a75065b972ed36417b6ec44f95554fd26a711c315ffd4c3ea5e941630eb316d6`；[code suite](../../evidence/audits/2026-10-10-v13-l08-cancel-injection-code-a02.log)，SHA-256 `04d91533efebb080e347c93ae11010c85a744852656f409372ba766307e68de3`。这是单一Platform命令的负向原子验证，P3全V1接受路径/Worker、市场规则及人工验收仍开放。

P0/A01交叉索引a10：新增L08证据和具名E2E关联L17，刷新V1.3测试计划当前锚点。147项、1747路径引用、381唯一路径、157精确测试名、143来源锚点全部结构PASS，无缺失；crosswalk SHA-256 `2e6477e75d05f144c25ae0c07f2f573823fc4f9a641d8b0c66764a218cd576e8`；报告[a10](../../evidence/audits/2026-10-10-v1-crosswalk-current-tree-a10.json)，SHA-256见sidecar。结构审计不代表语义覆盖关闭。


正式V1门禁a368（L08撤单边界代码/E2E、阶段文档与a10追踪更新后）：阶段文档审计PASS，证据审计PASS（934引用、129份Manifest、268项），`versionSummaryIncomplete=false`，`uncheckedVersionGate=true`；V1仍`INCOMPLETE`/exit 2。四个指定历史TestRun结构化导出仍缺失，五阶段未关闭；当前范围人工验收、OD-013/OD-014及旧Run处置、活动存储/全域恢复、Ubuntu实机仍未完成。[a368日志](../../evidence/audits/2026-10-10-v1-version-gate-a368.log)，SHA-256 `0c0bafe787f2859e5fbd18d79d765a7eed532d629bf1f6c2bca8dd79b5760144`。


正式V1门禁a369（a368结果同步后最终复核）：五阶段文档审计PASS，证据审计PASS（935引用、129份Manifest、268项），`versionSummaryIncomplete=false`，但`uncheckedVersionGate=true`，V1仍`INCOMPLETE`/exit 2。四个历史TestRun导出缺失；五阶段交付/人工验收、OD-013/OD-014及旧Run决定、活动数据和完整恢复、Ubuntu实机仍未满足。[a369日志](../../evidence/audits/2026-10-10-v1-version-gate-a369.log)，SHA-256 `1ae78b9b7c2283c73d035955d3dde01316970bf1386620e1027a8e199e608425`。

2026-10-10 P3/Proposal载荷增量：Platform V1.3 Proposal创建入口在认证后实施公开字段白名单，拒绝未声明客户端字段（422）；匿名请求仍优先401，合法Proposal创建和现有交易流程未回退。完整隔离E2E 22/22和V1.3 code suite退出0，详见阶段[§8.53](../prd/v1-local-simulation/03-fake-broker-trading-loop.md#853-platform-proposal创建拒绝未声明字段2026-10-10)及后续本轮门禁记录。该项不关闭P3全V1接受路径/Worker矩阵或版本门禁。

正式门禁a371：文档审计PASS、证据审计PASS（937/129/268），版本仍INCOMPLETE/exit 2。4个历史TestRun结构化导出缺失；五阶段人工/范围验收、OD-013/OD-014及旧Run处置、活动数据/完整恢复和Ubuntu实测未完成。[a371日志](../../evidence/audits/2026-10-10-v1-version-gate-a371.log)，SHA-256 `b3f72e2eae427e0dccee809a04156e9fb1ee0194b94dd75961d7a6ccbce8b3bf`。本轮usage错误调用a370仅作为失败历史保留，不作为门禁结论。

正式门禁a372（a371及验收记录同步后的最终复核）：文档审计PASS，证据审计PASS（938/129/268），版本整体仍INCOMPLETE/exit 2；四个历史Run导出、当前范围人工验收、未决决策/旧Run处置、活动全域恢复与Ubuntu实机仍未完成。[a372日志](../../evidence/audits/2026-10-10-v1-version-gate-a372.log)，SHA-256 `db24465a4908d3ec74274138d9f789c50e2334dcd30b049884d9aed9fc83e3d2`。

2026-10-10 P3/AUTO Mandate字段增量：Platform V1.3 Mandate创建入口现在通过身份后执行封闭字段集校验；未知字段422，拒绝后Mandate未创建、原合法命令仍可成功。完整E2E 22/22与V1.3 code suite均exit 0，证据见阶段[§8.54](../prd/v1-local-simulation/03-fake-broker-trading-loop.md#854-platform-auto-mandate创建拒绝未声明字段2026-10-10)。仍只覆盖创建入口，Mandate全生命周期及全V1 P3矩阵未关闭。

正式门禁a373（AUTO Mandate载荷边界证据同步后）：文档和证据审计PASS（941/129/268），版本仍INCOMPLETE/exit 2。四个历史Run导出、当前用户验收、决策与旧Run处置、活动数据/完整恢复及Ubuntu实测未完成。[a373日志](../../evidence/audits/2026-10-10-v1-version-gate-a373.log)，SHA-256 `bef041bf2f97cfbe8d3025ca22a386251c03ac80f2572313bac1d0f98bbbf6c8`。

2026-10-10 P3/Proposal命令字段边界：Proposal修订和审批端点现有封闭字段集，拒绝未知字段后业务状态/版本/hash不变；原合法治理路径仍通过。完整V1.3 E2E 22/22、code suite exit 0，详见阶段[§8.55](../prd/v1-local-simulation/03-fake-broker-trading-loop.md#855-platform-proposal修订与审批拒绝未声明字段2026-10-10)。完整接受路径/Worker矩阵仍开放。

正式门禁a374：文档审计PASS、证据审计PASS（944/129/268），V1仍INCOMPLETE/exit 2。四个历史Run导出、各阶段剩余交付/用户验收、未决决策和旧Run处置、活动恢复及Ubuntu实机均未满足。[a374日志](../../evidence/audits/2026-10-10-v1-version-gate-a374.log)，SHA-256 `3640b07ce693fc0b17e68d5c48366aa63598c01de19929c2c149414f9dd391f2`。


2026-10-10 V1.3 AUTO Mandate字段边界完成：激活/暂停未知字段返回422、状态不变，合法转换继续成功；修正Web暂停请求多传`contentHash`后，完整E2E 22/22、V1.3 code suite exit 0。E2E SHA-256 `11cb0823aa65a8618d933b7026a51131c02aad52efd141040cdbaff0b5e79083`，code suite SHA-256 `f489d906bf343ef5d84bebcd21ae875b35cfd24c93fb385bf7ad15b38003a69d`。详见[§8.56](../prd/v1-local-simulation/03-fake-broker-trading-loop.md#856-platform-auto-mandate激活与暂停拒绝未声明字段2026-10-10)。本次自动验证不代表阶段关闭或人工验收。


正式V1门禁a375（V1.3 Mandate转换边界及同步记录后）：阶段文档审计PASS；证据审计PASS（951引用、131份Manifest、270项）；`versionSummaryIncomplete=false`但`uncheckedVersionGate=true`，整体仍`INCOMPLETE`/exit 2。V1.2旧Run `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`及V1.5旧Run `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`缺结构化导出；阶段正式关闭、当前范围人工验收、OD-013/OD-014和旧Run处置、活动存储/全域恢复、Ubuntu实机仍未满足。[a375日志](../../evidence/audits/2026-10-10-v1-version-gate-a375.log)，SHA-256 `1986b564cac7ff5c8e4ffb618b2b5387b79693bc9e901d15813614a1aacfb90e`。


正式V1门禁a376（最新记录同步后复核）：阶段文档审计PASS；证据审计PASS（952引用、131份Manifest、270项）；`versionSummaryIncomplete=false`、`uncheckedVersionGate=true`，整体`INCOMPLETE`/exit 2。四个指定历史Run结构化导出缺失（V1.2 `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`；V1.5 `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`）；阶段正式交付/人工验收、OD-013/OD-014及旧Run处置、活动存储/全域恢复、Ubuntu实机仍未满足。[a376日志](../../evidence/audits/2026-10-10-v1-version-gate-a376.log)，SHA-256 `504060203cbdaa4a0bb538c25787664ecf7508e3dd51b052fa2ab5cb4ceb3bd2`。


2026-10-10 P0/A01当前树复核a11：纠正V1.3-S2-L17两条非精确测试名映射，并刷新因V1.3测试计划增补而过期的来源锚点。结构审计147项、1532路径引用、400唯一目标、155精确测试名、143来源锚点全部PASS；无缺失路径、测试名失配或过期锚点。交叉表SHA-256 `01a2df82794948d52ac1c76d72b0e846ea2ca711b29db3654b98c321f4b0d208`；[当前树结构报告](../../evidence/audits/2026-10-10-v1-crosswalk-current-tree-a11.json)，报告SHA-256见sidecar。此为结构性核查，不证明语义覆盖或需求关闭；P0保持进行中。


正式V1门禁a377（P0交叉索引a11更新后）：五阶段文档审计PASS；证据审计PASS（953引用、131份Manifest、270项）；`versionSummaryIncomplete=false`，但`uncheckedVersionGate=true`，整体`INCOMPLETE`/exit 2。四个历史TestRun结构化导出、阶段工程/交付/人工验收、OD-013/OD-014与旧Run处置、活动数据/全域恢复、Ubuntu实机条件仍未满足。[a377门禁日志](../../evidence/audits/2026-10-10-v1-version-gate-a377.log)，SHA-256 `f0fc9343d391c5f2006ca435de4223140c280116cb8449a458993866b65f3872`。


2026-10-10 P3/A05增量：跨服务路由矩阵补入六条Platform V1.3 Proposal/Mandate载荷白名单及负向/合法转换边界，完整E2E 22/22、code suite exit 0；修正Web暂停载荷多传字段。详见[A05矩阵](../../evidence/audits/2026-10-09-v1-cross-service-route-matrix-a05.md#2026-10-10-v13-platform-proposalmandate字段白名单增量)与[阶段§8.56](../prd/v1-local-simulation/03-fake-broker-trading-loop.md#856-platform-auto-mandate激活与暂停拒绝未声明字段2026-10-10)。仅为六个HTTP请求边界，不关闭V1.1-S2-L14或P3。


正式V1门禁a378（A05路由边界与P0交叉表a11同步后）：阶段文档审计PASS；证据审计PASS（954引用、131份Manifest、270项）；`versionSummaryIncomplete=false`、`uncheckedVersionGate=true`，整体仍`INCOMPLETE`/exit 2。四个历史Run结构化导出缺失；P1～P6工程/决定/环境/当前范围人工验收条件仍未满足。[a378日志](../../evidence/audits/2026-10-10-v1-version-gate-a378.log)，SHA-256 `0beef31691b3c86648c7a371eeb4d74dd7baacdb90700d9a712f3ff845a24ada`。

2026-10-10执行记录：新增V1.3多腿固定输入和§90断言要求，schema/hash已验证；Trade多腿执行、拒绝副作用断言及部分提交恢复仍NOT_RUN，V1.3-S2-L13保持OPEN。`pnpm fixtures:check`、`node scripts/validate-json.mjs packages/contracts fixtures`、`pnpm docs:check`与`git diff --check`通过。OD-014未决，不实现SELL proceeds-to-BUY。

正式门禁a379：阶段文档审计PASS，证据审计PASS（955引用/131 Manifest/270项），版本`INCOMPLETE`/exit 2；未解决项见[当前进度](../progress.md)及门禁报告[日志](../../evidence/audits/2026-10-10-v1-version-gate-a379.log)。

2026-10-10 P0/A01 a12独立结构复核：修复V1.3 §90锚点漂移；147条需求对应1772个具名路径字段引用/408个目标、155个字面测试声明、144个来源文本，0缺失/失配/过期。计数口径明确且不与早期广义路径审计比较；这不关闭需求语义覆盖。报告见[交叉表审计a12](../../evidence/audits/2026-10-10-v1-crosswalk-current-tree-a12.json)。

正式门禁a380：阶段文档审计PASS，证据审计PASS（956引用/131 Manifest/270项），版本仍INCOMPLETE/exit 2；历史Run、工程、决策、环境及人工验收缺口继续列于[进度摘要](../progress.md)。[a380门禁日志](../../evidence/audits/2026-10-10-v1-version-gate-a380.log)，SHA-256 `3150f946bc6dbcc45414880d797c17d84ad3f677c093590a524c826e4133cfc5`。

正式门禁a381（同步a380记录后）：阶段文档审计PASS、证据审计PASS（957/131/270），V1整体INCOMPLETE/exit 2；[门禁日志](../../evidence/audits/2026-10-10-v1-version-gate-a381.log)，SHA-256 `099a9dcd01302332ef9f7dec0dabbbcc4669666d7a18cca16836297e517a417c`。

2026-10-10 P3多腿执行进展：V1.3固定CN_A MANUAL BUY/BUY批次已完成实现，完整E2E 23/23与code suite exit 0，证明双预留、单批次授权、两个稳定子订单/Fill、同Run CLI MATCH和浏览器刷新恢复。Trade单测另覆盖聚合现金不足清理及首腿响应丢失后查原单/仅补缺腿。证据与Run见[阶段§8.57](../prd/v1-local-simulation/03-fake-broker-trading-loop.md#857-v13多腿执行固定输入及验证状态2026-10-10)。P3父项仍OPEN：US MANUAL E2E、AUTO多腿、真实跨服务低余额拒绝、Trade进程重启恢复、SELL中间资金/结算及更广授权规则未完成；SELL资金路径待OD-014。此结果替代本计划稍早“多腿执行仍NOT_RUN”的进度快照。

2026-10-10 P0/A01当前树交叉表a13：关联CN MANUAL双腿E2E/code证据，更新V1.3-S2-L13与阶段测试计划锚点。147项、1781个显式路径字段引用/418唯一目标、154个字面测试声明、143个来源文本结构审计PASS，0缺失/失配/过期。报告SHA-256 `61fd50b11fe00632245563b51b71d0bcc88c61ec6c6774fd999186b325b1d1d8`；crosswalk SHA-256 `45576f5c196f6f771c0dda34aeea2a87b82e699e1add02b11ae64017983d5275`。结构核查不代表语义覆盖。

正式V1门禁a382（V1.3多腿固定子项、追踪a13和最新证据同步后）：五阶段文档审计PASS；证据审计PASS（961引用、131份Manifest、270项）；`versionSummaryIncomplete=false`、`uncheckedVersionGate=true`，版本仍`INCOMPLETE`/exit 2。缺少四个历史TestRun结构化导出、阶段工程/交付关闭与本人验收、决策/旧Run处置、活动存储/全域恢复和Ubuntu实机条件。[a382门禁日志](../../evidence/audits/2026-10-10-v1-version-gate-a382.log)，SHA-256 `ed71ed65e59ea1a198bf5d5084719a1be60f433f47893498b39246124bc163e8`。

2026-10-10 P3多腿跨市场增量：US_EQUITY MANUAL BUY/BUY使用冻结Fixture 1.0.1通过完整V1.3 E2E 24/24；TestRun `eb34b908-d568-4fa8-b73f-cbd4a48c4880`，两订单/两Fill、期末USD 9549.9000、同Run CLI MATCH与刷新恢复均通过，隔离资源精确清理。日志SHA-256 `867792eb60650e183735b03ea240509d90b2ead6e309150915903a8845d9ac24`。补上CN/US固定MANUAL多腿场景后，AUTO多腿、真实跨服务低余额拒绝、多腿Trade重启恢复及SELL结算仍开放。

2026-10-10 P3代码复验及P0交叉表a14：修正文档路径后V1.3完整code suite exit 0（SHA-256 `3c555594d3221cff2d1823a6dc4fad51d43dd1ff634c5a7c247a77b6acad5627`）。交叉表147项、1787显式路径/423目标、155字面测试名、143来源锚点全部结构PASS，无缺失/失配/过期；a14报告SHA-256 `a9c4a99fc67f0a18ee5100ef738ae6abe2d60f8b1c3668a8664b65edadf62a2a`，crosswalk SHA-256 `b909c93b6cb6ab50cd6d2d1a2228b2d7567eb706adcf239cc6b90f23e85d50cc`。

正式V1门禁a383（US MANUAL双腿与V1.3代码复验记录同步后）：五阶段文档审计PASS；证据审计PASS（965/131/270）；`versionSummaryIncomplete=false`、`uncheckedVersionGate=true`，V1仍INCOMPLETE/exit 2。四个历史TestRun导出及阶段工程/交付/本人验收、决定/旧记录处置、活动恢复与Ubuntu实机条件未满足。[a383](../../evidence/audits/2026-10-10-v1-version-gate-a383.log)，SHA-256 `0bae4e5ca522a9724b71e19856bc20e2ded3508310a40d65a998addfffb709f1`。


2026-10-10 P3多腿进程重启恢复：固定CN_A MANUAL BUY/BUY在首个FakeBroker子订单已提交后重启Trade Execution，以原批次clientOrderId重试，成功恢复缺失腿；两笔订单/Fill、同Run CLI及账本MATCH通过，精确隔离Compose资源清理。定向E2E 1/1 TestRun `39f1f636-eebc-41b7-9551-ce073392cadc`；完整V1.3隔离Web/API/CLI/export E2E 25/25 TestRun `690641a2-d40d-4a5d-80e4-4df6657b97e1`，日志SHA-256 `8a53bc888aef9a1eff4dc9a821e4f15f2c5ad71c9b49125974b10f784849a61e`；完整V1.3 code suite exit 0，SHA-256 `8600a3132057cd7a93dc4f9a456f0764464283107c0f56500cc611e5fe4b70d3`。阶段§8.58已记录。本项只关闭固定MANUAL恢复子场景，AUTO多腿及真实跨服务低余额拒绝仍OPEN。

正式V1门禁a384（更新多腿Trade重启恢复子项后）：阶段文档审计PASS；证据审计PASS（966引用、131份Manifest、270项），但V1仍INCOMPLETE/exit 2。V1.2历史Run `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`及V1.5三个历史Run缺结构化导出；版本阶段交付/人工验收、OD-013/OD-014与旧Run处置、活动数据恢复和Ubuntu实机条件仍未满足。[a384日志](../../evidence/audits/2026-10-10-v1-version-gate-a384.log)，SHA-256见sidecar。

P0/A01当前树交叉索引a15：更新V1.3-S2-L13的多腿进程重启精确测试名、日志路径及90测试计划来源锚点；147条要求、1508个显式路径字段引用/412唯一目标、156个字面测试名和143个当前来源文本结构复核全部通过，缺失/失配/过期均0。crosswalk SHA-256 `ca1b9e8a6862ea64f5c2152dae14565e64b5e37a9f1e5bb07794e366b3af1689`，报告[a15](../../evidence/audits/2026-10-10-v1-crosswalk-current-tree-a15.json)，SHA-256 `2721f3c9d4f6a266d548e6cffab9b2e4e0549c2ff5a952f826fbdc1c6fdc82ec`。此为结构审计，不代表语义覆盖。

2026-10-10 P3多腿现金不足跨服务拒绝完成固定子项：隔离TestRun `e8d1092b-1914-4684-a184-cbbf2e52de6e`先产生9笔成交、现金降至955.0000 CNY，再提交已批准CN_A MANUAL双腿批次；Platform/Trade/Portfolio API返回409，批次订单404，账户现金/账本/预留/持仓及reconciliation未变，同Run CLI通过。定向E2E 1/1，TestRun `e8d1092b-1914-4684-a184-cbbf2e52de6e`；完整V1.3 Web/API/CLI/export E2E 25/25，L05 TestRun `44241fdd-ee91-4ff6-8511-959bb52b9ca6`，日志SHA-256 `fbee613ce6a592a45ea9bbd2a08610c60efa031f50bc5baa579c1812de165c2c`；完整V1.3 code suite exit 0，SHA-256 `4c4792ec65f0205ff1aac79f5a3893b74df08d42ab3652d31777d17a0a89bfa9`。首腿预留已成功而次腿失败的端到端回滚仍只有Trade单测覆盖；AUTO多腿和SELL资金路径仍OPEN。详见[§8.59](../prd/v1-local-simulation/03-fake-broker-trading-loop.md#859-v13多腿低现金拒绝及零副作用)。

P0/A01交叉索引a16：将多腿低现金跨服务拒绝、Trade重启及最新V1.3完整E2E/code证据接入V1.3-S2-L13，并刷新§2来源锚点。147项、1515个路径字段引用/419目标、157精确测试名、143来源文本结构审计PASS，缺失/失配/过期均0。crosswalk SHA-256 `0bec54f66a879644e27eda8e06534ba0fda47d262a724bcb8c6f2814eb255f57`；[a16报告](../../evidence/audits/2026-10-10-v1-crosswalk-current-tree-a16.json)，SHA-256 `359aa75eb82e75b74fac5cf2112bb8a34873e35a854f8a0f476acbfca26dd43c`。此为结构检查，不代表语义覆盖。

2026-10-10 P3/V1.3多腿部分预留后端到端回滚通过：同Run现金1960.0000 CNY时MANUAL两腿操作先预留CN腿1005.0000，次腿资金不足被拒；首腿Reservation被释放且captured=0，次腿Reservation/两子订单/Fill不存在，账户现金、持仓、账本版本/条目和对账不变。同Run CLI通过。定向E2E 1/1 TestRun `f64b339c-8f60-4c7f-9027-72ebada6d66e`，日志SHA-256 `d2a500f004034541f3153271178a31705c194a244dbc39a728d384c3a0e45241`；完整V1.3 E2E 25/25，TestRun `ea222a4d-71be-4b2e-a053-fca3b4df3acf`，SHA-256 `a45600b14d972414a05c800a1a23a8230675a04503747126455eae4f252513c6`；完整code suite exit 0，SHA-256 `4152638b5e47f2d92f404b2348df5eeb1728d83200603e6bd986929887cc5ef5`。AUTO多腿、结算路径及更广规则仍OPEN，详见[§8.59](../prd/v1-local-simulation/03-fake-broker-trading-loop.md#859-v13多腿低现金拒绝及零副作用2026-10-10)。

P0/A01交叉索引a17：关联V1.3多腿第二腿资金不足与首腿Reservation释放E2E及最新完整E2E/code suite，刷新来源锚点。147项、1522路径引用/426目标、157测试名、143来源文本结构审计PASS，无路径/测试名/锚点问题。crosswalk SHA-256 `72648c4e9ac2547826d42fca0eb536c5521acad0e94d03482de514ed02489384`；[a17报告](../../evidence/audits/2026-10-10-v1-crosswalk-current-tree-a17.json)，SHA-256 `7daa1af69c2b4a5de451f6a69327be86f377d493bb5c66b00511baa248253814`。仅结构审计。
正式V1门禁a393（当前复核）：文档审计PASS、证据审计PASS（966引用、131 Manifest、270项），但五阶段未关闭、验收表5项未解决、版本INCOMPLETE/exit 2。四个旧Run导出、当前范围人验、活动恢复、Ubuntu实机及待决政策继续OPEN。[a393日志](../../evidence/audits/2026-10-10-v1-version-gate-a393.log)，SHA-256 `fe0af013028cce5f02e7d4b5328f22ac6e4fa72b482718d2214bba62c454dfea`。

正式V1门禁a388（V1.3多腿低现金拒绝、部分Reservation回滚与交叉表a17同步后）：五阶段文档审计PASS；证据审计PASS（966引用、131份Manifest、270项），但V1仍INCOMPLETE/exit 2。四个历史Run结构化导出、各阶段工程与交付关闭/当前范围人工验收、OD-013/OD-014与历史Run处置、活动存储/全域恢复和Ubuntu实机条件仍未满足。[a388日志](../../evidence/audits/2026-10-10-v1-version-gate-a388.log)，SHA-256见sidecar。


最新正式V1门禁a389（本轮V1.3回滚E2E/code套件及文档索引更新后）：五阶段文档审计PASS，证据审计PASS（966引用/131 Manifest/270项）；V1仍INCOMPLETE/exit 2。四个历史TestRun结构化导出缺失、五阶段工程/交付与人工验收、OD-013/OD-014及历史处置、活动恢复/切换和Ubuntu实机验收继续开放。[a389日志](../../evidence/audits/2026-10-10-v1-version-gate-a389.log)，SHA-256见sidecar。

正式V1门禁a390：文档/证据审计PASS（966引用/131份Manifest/270项），V1仍INCOMPLETE/exit 2；工程门禁仍未全部勾选。见[a390日志](../../evidence/audits/2026-10-10-v1-version-gate-a390.log)。

正式V1门禁a391：五阶段文档/证据审计PASS（966/131/270），版本仍INCOMPLETE/exit 2；不得将局部P3关闭视为V1完成。[a391门禁](../../evidence/audits/2026-10-10-v1-version-gate-a391.log)。

2026-10-10 P3/AUTO固定CN两腿子项完成：TRADE AUTO应用服务、治理Fixture白名单、Platform Mandate响应和正式Web入口支持两腿BUY批次，使用新冻结Fixture 1.0.2；不覆盖1.0.1。完整V1.3隔离E2E 26/26（新AUTO TestRun `cb6130f5-671c-4be3-bb6b-bae551e8a980`）和完整V1.3 code suite均通过。证据、Fixture SHA、可执行步骤及未覆盖边界记入[阶段§8.60](../prd/v1-local-simulation/03-fake-broker-trading-loop.md#860-v13-auto_policy固定两腿buy批次2026-10-10)、[完整E2E日志](../../evidence/audits/2026-10-10-v13-auto-multileg-full-e2e-a01.log)和[code suite日志](../../evidence/audits/2026-10-10-v13-auto-multileg-code-suite-a03.log)。首次code suite因Schema enum未登记新Fixture版本而失败，修复后a02全绿，保留a01历史。此子项不关闭V1.3-S2-L13/P3父项：SELL proceeds-to-BUY、OD-014、US AUTO及其余规则/阶段人验仍待完成。

正式V1门禁a395在AUTO多腿与最新记录同步后仍为INCOMPLETE/exit 2：五阶段文档审计PASS、证据引用审计PASS（969引用/131 Manifest/270项），但四个历史TestRun缺结构化导出，五阶段交付及新增范围人验、OD-013/OD-014和旧Run处置、活动数据/跨服务恢复、Ubuntu实机未满足。[a395门禁](../../evidence/audits/2026-10-10-v1-version-gate-a395.log)，SHA-256 `a6b715256deae37719d2da3019db9921de6e391dac4d39c078bb23685272df1e`。本次V1.3 AUTO CN两腿BUY子项已过，但不构成版本完成。

2026-10-10 P0市场规则范围审计与正式门禁a410：范围矩阵已按V1合同列明已验证固定Fixture切片和未验证领域；不推断全市场覆盖，OD-014仍待所有者决定。a410阶段文档/证据审计PASS（984/136/275），但四个历史Run导出、阶段交付及人工验收、政策决定、活动恢复和Ubuntu实机等仍开放，V1 `INCOMPLETE`/exit 2。[a410](../../evidence/audits/2026-10-10-v1-version-gate-a410.log)，SHA-256 `c79ab9fe4b9b3b7a8de7ce5c7067c94811a8b44a4d4fc7156765b6ac7ff66279`。

正式V1门禁a411（当前差异快照同步后）：五阶段文档审计PASS；证据审计PASS（986引用、137份Manifest、276项）；版本仍INCOMPLETE/exit 2，uncheckedVersionGate=true。四个历史TestRun导出、阶段交付/人验及其他版本门禁仍未满足。[a411日志](../../evidence/audits/2026-10-10-v1-version-gate-a411.log)，SHA-256 `f805749a9020f064b9c569b2d120ec05815fd4e2d1e1f0429e4f8206484c1b3f`。


2026-10-10 P3/P4接受路径增量：V1.4回测Platform入口四种模式注入当前树隔离复验通过（422、Quant Run零增量、Web/API同Run CLI、浏览器5/5、随机资源清理）；§8.19及测试计划已更新，交叉索引/当前差异快照加入证据。该入口原子覆盖仍不关闭V1全路由矩阵、费用/结算同规则一致性、OD-014或V1总体门禁。


正式V1门禁a412（V1.4模式边界E2E、追溯索引与进度记录同步后）：阶段文档审计PASS；证据审计PASS（992引用、138份Manifest、277项）；版本仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。四个历史TestRun结构化导出、五阶段交付/人工验收、待决政策、活动恢复和Ubuntu实机条件仍未满足。[a412日志](../../evidence/audits/2026-10-10-v1-version-gate-a412.log)，SHA-256 `5963f7837db0e8d532eacfb580dd794e764fbd07454fe9296fdd0a70b527caaa`。


2026-10-10 P1基础门禁当前树复验：`pnpm baseline:check`受控本机exit 0、66/66测试通过；首次普通沙箱仅2项HTTP单测遇loopback EPERM，a02失败日志保留，a03为同命令通过证据。只更新基础工程状态，不关闭P1完整消费者/生产发布流程、活动存储、阶段交付或V1总体门禁。


正式V1门禁a413（V1.4当前树隔离E2E及P1全局基线证据同步后）：五阶段文档审计PASS；证据审计PASS（993引用、138份Manifest、277项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。四个历史TestRun导出、五阶段交付及当前范围人工验收、政策/旧Run处置、活动恢复和Ubuntu条件仍未满足。[a413日志](../../evidence/audits/2026-10-10-v1-version-gate-a413.log)，SHA-256 `a27fc2394c106c772dcd25c892306ee9604ff2aa551d3a4f4ae977854e4723c7`。

2026-10-10 P0历史台账坐标及增量对照已完成：106/106历史项匹配当前源坐标，当前索引新增41项，旧台账不改写；逐项当前锚点、分类、引用证据、测试及缺口另存[快照](../../evidence/audits/2026-10-10-v1-p0-coverage-reconciliation-a01.json)。此子项只完成历史映射，不关闭相邻P0完整语义差异核查或需求验收。


正式V1门禁a414（历史台账映射与V1.4当前树验证记录同步后）：五阶段文档审计PASS；证据审计PASS（994引用、138份Manifest、277项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。四个历史TestRun结构化导出、五阶段当前交付/人工验收、政策/旧Run处置、活动恢复与Ubuntu条件仍开放。[a414日志](../../evidence/audits/2026-10-10-v1-version-gate-a414.log)，SHA-256 `1ff6f942b34b0128b065f4f7da4ead25e013b5d284933277c624f36d1abc7400`。


2026-10-10 P3模式路由边界增量：V1.3外部订单观察写入口现有明确拒绝三种LIVE/REAL注入的Web/API/CLI同Run断言及前后对账相等验证；同场景模式尝试计数修正并完整E2E定向通过。它只关闭该路由子项，不关闭V1全服务/Worker路由矩阵、所有交易副作用边界或P3验收。


正式V1门禁a415（V1.3外部订单观察模式边界补测、索引及阶段记录同步后）：五阶段文档审计PASS；证据审计PASS（998引用、139份Manifest、278项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。四个历史Run结构化导出、阶段交付/用户人工验收、待决政策、活动数据恢复及Ubuntu实机仍开放。[a415日志](../../evidence/audits/2026-10-10-v1-version-gate-a415.log)，SHA-256 `ca7f5e55d0641080bf72c6a65a7f72a23567f126287efc2dcc9e03d3ea5fbf86`。

2026-10-10 P3/V1.3 Run创建与外部订单观察模式边界补测：新增Run创建入口的三种LIVE/REAL模式注入拒绝及拒绝后创建有效Run的检查；与账户、提案、Mandate、执行、会话推进、外部订单观察合计39次拒绝尝试。隔离E2E通过，TestRun `5dcb856e-d742-4718-b0d0-bad240e9d220`，订单/Fill为0、账本不变、同Run CLI通过、精确清理通过，日志SHA-256 `00ba500ee2da23ff30d4bb0af825ff9d318cd951979babd4347da7a21816072d`，见[阶段§8.63](../prd/v1-local-simulation/03-fake-broker-trading-loop.md#863-v13-run创建与外部订单观察模式注入拒绝2026-10-10)。首次尝试因测试前置会话缺失而401，记录于a02；a03修正后通过。本次仅覆盖V1.3平台固定路由，服务/Worker全路径模式核验及P3父项仍开放。

正式V1门禁a416（本轮V1.3 Run创建模式边界、计划/进度同步后）：五阶段文档审计PASS；证据审计PASS（1001引用、139份Manifest、278项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。四个历史Run结构化导出、五阶段交付/新增范围人工验收、待决政策与旧Run处置、活动数据恢复及Ubuntu实机仍开放。[a416日志](../../evidence/audits/2026-10-10-v1-version-gate-a416.log)，SHA-256 `c3904adb0a9cdff6a5e2aaadaa17fb1c6ce5db260d02d4f4a8c53acb83b23937`。

2026-10-10 V1.3完整回归暴露并修复L05低现金测试人工批准竞态：新增显式等待`APPROVED_MANUAL`，并要求资金不足必须由Portfolio返回`INSUFFICIENT_AVAILABLE_CASH`/409；平台422响应保留下游验证原因。定向隔离Playwright 1/1、完整Web/API/CLI/export E2E 27/27、V1.3 code suite均exit 0，后者66/66基线单测和V1.3三服务隔离迁移/HTTP检查通过。证据详见[阶段§8.64](../prd/v1-local-simulation/03-fake-broker-trading-loop.md#864-v13人工批准等待与低现金拒绝回归-2026-10-10)。首次全套26/27竞态失败、定向a01的通用错误体、code suite沙箱loopback EPERM均保留；当前隔离E2E与代码复验通过后，再更新正式门禁。追踪a18新增E2E/code证据及拒绝原因；crosswalk SHA-256 `c0f5786259fcd9ccce19d9cd656fccaf81792d998654ca3a0fca5d12663d541f`，gap matrix SHA-256 `5128e283d919529fcfa27b554651d4ddbf53eb5d71b7995c0759f90a1d8eb15d`，P0历史对照SHA-256 `e9fede56f5c231911cad7502ae58eb1f8727a3446045e419f5564aec5f0c1a76`。

正式V1门禁a417（V1.3批准同步修复、完整27/27 E2E、code suite及追踪a18同步后）：五阶段文档审计PASS；证据审计PASS（1005引用、139份Manifest、278项）；V1仍`INCOMPLETE`/exit 2，`versionSummaryIncomplete=false`、`uncheckedVersionGate=true`。四个历史TestRun结构化导出缺失；五阶段工程/交付关闭与本人验收、未决政策/旧Run处置、活动数据恢复和Ubuntu实机条件仍不满足。[a417日志](../../evidence/audits/2026-10-10-v1-version-gate-a417.log)，SHA-256 `e27fe3905f315a1375712297a1becbc373bdb84e895d0e6ebdebbb840d4bbbf3`。

正式V1门禁a419（2026-10-10 Replay namespace子项与阶段证据同步后）：V1仍`INCOMPLETE`/exit 2，五阶段结构审计PASS，证据审计PASS（1011引用、139份Manifest、278项），`uncheckedVersionGate=true`。四个历史TestRun导出、各阶段工程与交付关闭、当前用户验收、待决政策/旧Run处置、活动数据恢复和Ubuntu实机仍开放。[a419日志](../../evidence/audits/2026-10-10-v1-version-gate-a419.log)，[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a419.log.sha256)。

2026-10-10 P3/V1.4 Replay lifecycle 命令边界补验：对bodyless的pause、resume、cancel、recover-unknown提交伪造status/result/orderId，四条均422且Run状态/结果不变；Replay UNKNOWN订单查询额外绑定持久Run namespace。当前树完整V1.4 code suite受控loopback exit 0，证据见[§8.20](../prd/v1-local-simulation/04-daily-backtest.md#820-v14-unknown原单读取按replay-namespace隔离2026-10-10)、[审计报告](../../evidence/audits/2026-10-10-v14-replay-namespace-code-suite-a02.md)和[机器日志](../../evidence/audits/2026-10-10-v14-replay-namespace-code-suite-a02.log)。此结果不关闭P3全路由矩阵、V1.4结算/全规则、V1总门禁、Ubuntu及本人验收。

正式V1门禁a420（V1.4 Replay命令载荷边界、namespace兼容回归与进度/阶段证据同步后）：五阶段文档审计PASS；证据审计PASS（1012引用、139份Manifest、278项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。四个历史TestRun导出、阶段工程/交付与当前范围人工验收、OD-013/014及旧Run处置、完整活动数据恢复和Ubuntu证据仍开放。[a420日志](../../evidence/audits/2026-10-10-v1-version-gate-a420.log)，[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a420.log.sha256)。

正式V1门禁a421：V1仍`INCOMPLETE`/exit 2；五阶段文档审计和本地证据审计通过（1012引用、139份Manifest、278项），`uncheckedVersionGate=true`。剩余缺口仍包括四份历史TestRun导出、阶段交付/本人验收、OD-013/014与旧Run处置、完整活动恢复和Ubuntu目标证据。[a421日志](../../evidence/audits/2026-10-10-v1-version-gate-a421.log)，[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a421.log.sha256)。

正式V1门禁a422：五阶段结构审计PASS，证据审计PASS（1014引用、139份Manifest、278项）；V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。Replay路由补验未改变V1总体结论；历史Run导出、所有阶段完整交付与本人验收、未决决定/旧Run处置、活动全域恢复及Ubuntu实机仍开放。[a422日志](../../evidence/audits/2026-10-10-v1-version-gate-a422.log)，[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a422.log.sha256)。

正式V1门禁a423（阶段主入口、测试计划及验收表同步到当前Replay证据后）：阶段文档审计PASS，证据审计PASS（1019引用、140份Manifest、279项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。历史Run导出、各阶段剩余交付/当前范围验收、OD-013/014与旧Run决定、活动恢复和Ubuntu实机仍开放。[a423日志](../../evidence/audits/2026-10-10-v1-version-gate-a423.log)，[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a423.log.sha256)。

正式V1门禁a424：主入口和阶段验收记录同步后复核，五阶段文档/证据审计PASS（1023/141/280），但V1整体仍`INCOMPLETE`/exit 2；历史TestRun导出、五阶段交付/人工验收、OD-013/014及旧Run决定、全域恢复和Ubuntu实机仍开放。[a424日志](../../evidence/audits/2026-10-10-v1-version-gate-a424.log)，[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a424.log.sha256)。

2026-10-10 A04/P1生成客户端调用点映射增量：已用当前OpenAPI、生成客户端、生产源码调用点和既有隔离测试核实V1.3 AUTO Mandate 7项操作的真实消费者——Platform负责创建/读取/预算读回/激活/暂停，Trade负责订单授权与预算结算；也确认V1.4报告TestRun/Artifact是Platform owner-scoped本地读取并校验不可变Hash，不是下游生成客户端边。证据为V1.3隔离HTTP/PG身份与预算检查、V1.3完整固定AUTO回归、V1.4报告Artifact PostgreSQL fencing和完整代码套件；映射见[A05当前矩阵](../../evidence/audits/2026-10-09-v1-cross-service-route-matrix-a05.md)。关闭上述两组操作映射子项，不关闭A04全操作发布/迁移矩阵、V1.3全接受路径、V1.4结算/全规则或P1父项。

正式V1门禁a425：五阶段文档审计PASS、证据审计PASS（1026/142/281）；V1仍`INCOMPLETE`/exit 2。上述A04映射增量未关闭完整P1/P3父项；四个历史TestRun导出、阶段交付与人工验收、未决决定/旧Run处置、完整恢复及Ubuntu证据仍未满足。[a425日志](../../evidence/audits/2026-10-10-v1-version-gate-a425.log)，[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a425.log.sha256)。


2026-10-10 P4/V1.4增量：持久FakeBroker Fill Outbox九条载荷现逐字段核对固定CN/US输入的accountId、namespace、security、externalFillId、quantity、price、fee、effectiveAt、side和currency；更正首轮对订单表字段的错误假设后，完整V1.4 code suite exit 0。首轮失败保留，详情见[V1.4 §8.21](../prd/v1-local-simulation/04-daily-backtest.md#821-持久fill-outbox载荷逐字段核对-2026-10-10)和[a02日志](../../evidence/audits/2026-10-10-v14-fill-outbox-payload-parity-code-suite-a02.log)。此增量只验证Outbox映射，不代表Portfolio总账、Trade HTTP端到端或结算通过。正式V1门禁a433文档审计及证据审计PASS（1036/144/283），版本仍INCOMPLETE/exit 2；历史Run导出及其他工程/决定/环境/人工验收门槛未满足。


2026-10-10 P0/P4追踪增量：将九条Fill Outbox payload字段核对证据关联到`V1.4-S2-L15`，并派生当前差异矩阵A03；该规则要求仍OPEN，明确剩余Portfolio总账、Trade HTTP、结算及全市场规则缺口。交叉表147项、1581路径引用/481目标、162精确测试名、147来源锚点结构审计PASS，详见[检查日志a04](../../evidence/audits/2026-10-10-v1-crosswalk-check-a04.log)、[矩阵A03](../../evidence/audits/2026-10-10-v1-current-gap-matrix-a03.json)。交叉表SHA-256 `21f87385908673f755d6ca376876d71421387e09eb10663e0948099f47897f99`；矩阵A03 SHA-256 `dfe6283a305afa74550c338549c84f295cf9d1719cbc9b6fbe5ddfd19a893706`。此索引工作仅记录局部覆盖，不证明P4或V1通过。


2026-10-10 P4交易账本增量：把Quant→持久FakeBroker Fill→独立Portfolio PostgreSQL的五个CN/US BUY账本核对纳入V1.4 code suite；精确现金、证券持仓及账本条数均匹配，Trade 10单/9 Fill/9 Outbox与原规则断言通过，完整suite exit 0。两个服务使用受控随机隔离数据库，活动服务未连接且清理核验通过；普通沙箱Docker socket拒绝尝试已保留为[a00环境记录](../../evidence/audits/2026-10-10-v14-portfolio-buy-ledger-parity-sandbox-denial-a00.log)。详见[阶段§8.22](../prd/v1-local-simulation/04-daily-backtest.md#822-quantfakebroker与独立portfolio-buy账本对照2026-10-10)和[完整套件日志](../../evidence/audits/2026-10-10-v14-portfolio-buy-ledger-parity-code-suite-a01.log)。只覆盖BUY账本子集；Portfolio HTTP/reservation授权、SELL应收结算、OD-014和完整市场规则仍OPEN。需求追踪当前快照A05与交叉检查a06已同步（此前a05锚点失配失败保留，更新当前来源文本后a06通过）。


交叉检查恢复记录：首次为更新V1.4测试计划而刷新跨版本来源锚点后，`crosswalk:check`发现`V1-90-STAGE-V1.4`锚点失配，失败日志保留在[检查a05](../../evidence/audits/2026-10-10-v1-crosswalk-check-a05.log)。已按测试计划当前原文更新精确锚点并生成当前差异矩阵A05，随后交叉检查a06通过（147需求、1584路径引用/484目标、162精确测试名、147来源锚点，无错误）。该修复仅同步追踪，不改变任何需求完成状态。


2026-10-10门禁记录：a436发现本轮套件SHA sidecar缺少文件名导致evidence audit FAIL/exit 1；已将sidecar修正为标准`shasum -a 256`格式，a437重跑后stage文档与证据审计PASS（1042/145/284），版本仍INCOMPLETE/exit 2。失败和修正后的结果均保留。

2026-10-10 P0/P4交叉映射更新：V1.4-S2-L15纳入真实Trade/Portfolio HTTP和独立PostgreSQL证据；`pnpm crosswalk:check` 147项、1588路径引用/488目标、162测试名及147来源锚点PASS。差异快照A06由A05派生，源crosswalk SHA-256 `4122333b05b65ea274c2b98afe8f3e91faa7f4b6642917c71a21e4152d23f8be`；[A06](../../evidence/audits/2026-10-10-v1-current-gap-matrix-a06.json)。这只更新证据映射，P4仍因测试授权桩、SELL结算/OD-014和完整规则矩阵保持OPEN。

2026-10-10 P4真实Governance授权增量：V1.4隔离Harness从测试桩改为真实Decision Governance HTTP+独立PG；9笔订单逐笔申请并消费命令Hash绑定的一次性Replay授权，Trade执行及Portfolio投影链路通过。三服务定向Harness exit 0，完整V1.4 code suite exit 0（suite a03的命令计划测试失败已保留，a04修正后通过）。[阶段§8.24](../prd/v1-local-simulation/04-daily-backtest.md#824-v14真实governance授权链复验2026-10-10)、[suite a04](../../evidence/audits/2026-10-10-v14-paper-http-parity-code-suite-a04.log)。交叉矩阵A07从A06派生并刷新`V1.4-S2-L15`证据；结算/OD-014、完整规则与人工验收仍OPEN。

2026-10-10 P4独立日账本增量：将Harness预期现金/持仓从Trade Fill回推扩展为直接读取Quant `cashLedger`/`positionAvailability`；九个执行日Portfolio现金按分对照settled+unsettled、持仓逐股对照Quant，9/9通过。完整V1.4 code suite exit 0，定向三服务HTTP/PG exit 0。§8.25明确SELL金额一致不等于可用性/应收/结算规则一致；OD-014仍OPEN。交叉矩阵A08已关联a05 suite与独立Harness报告。
2026-10-10 P3/V1.4拒绝路径增量：真实Governance→Trade→Portfolio三服务HTTP/隔离PostgreSQL链新增三项拒绝断言：错误服务身份签发Replay grant为403且无授权行；篡改命令Hash验证为403且授权仍ACTIVE；错误授权ID执行为403且无FakeBroker订单。后续正确授权/命令成功，完整`pnpm verify:stage -- --stage V1.4 --suite code` exit 0，证据[完整日志](../../evidence/audits/2026-10-10-v14-paper-http-parity-code-suite-a06.log)、[exit code](../../evidence/audits/2026-10-10-v14-paper-http-parity-code-suite-a06.exit.txt)、[SHA-256](../../evidence/audits/2026-10-10-v14-paper-http-parity-code-suite-a06.log.sha256)；详见[V1.4 §8.26](../prd/v1-local-simulation/04-daily-backtest.md#826-v14-governance拒绝与无副作用执行边界2026-10-10)和[路由矩阵A06增补](../../evidence/audits/2026-10-10-v1-cross-service-route-matrix-a06.md)。当前差异快照[A09](../../evidence/audits/2026-10-10-v1-current-gap-matrix-a09.json)，SHA-256 `6f721eaccc96cbf33a82d9bfc8b3a6ae13390b4d756a7afc0181019984ba38ec`；交叉表147项、1602路径引用/501目标、162测试名与147锚点通过。只关闭固定身份/Hash/无副作用拒绝切片；P3完整路由矩阵、P4完整规则及SELL结算/OD-014、其他阶段剩余工程/交付、Ubuntu与用户验收继续OPEN。

2026-10-10正式V1门禁a450：本轮阶段和路由矩阵文档同步后复核，阶段文档审计PASS、证据审计PASS（1054/146/285），版本仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。四个指定历史Run结构化导出、五阶段必要工程/交付及新增范围人工验收、OD-013/OD-014和旧Run决策、完整恢复及Ubuntu仍未满足。[a450日志](../../evidence/audits/2026-10-10-v1-version-gate-a450.log)，[exit code](../../evidence/audits/2026-10-10-v1-version-gate-a450.exit.txt)，[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a450.log.sha256)。

2026-10-10 P4/V1.4独立FakeBroker资产记账：历史FakeBroker请求纳入经Governance Hash绑定的初始现金；持久事务校验owner/TestRun/account/currency/初始余额，并与订单、Fill、事件和Outbox原子更新现金、持仓及资产事件。相同请求重试不重复记账。修复通用Trade持久化及service-auth固定SELL场景的显式开仓资产与漏传请求数量后，相关隔离持久化、HTTP身份与Trade→Portfolio恢复测试均PASS。真实三服务HTTP/独立PG九个固定成交资产快照9/9、原请求幂等重试9/9；完整V1.4 code suite exit 0，日志[见此](../../evidence/audits/2026-10-10-v14-paper-http-parity-code-suite-a12.log)，SHA-256 `18304cc9b32ce853cf0bc0d07da340919e809771bed008d34886ccbc763eb915`。阶段§8.27、P4勾选及V1.4-S2-L15追踪已同步；crosswalk check a11 PASS（147需求、1605路径引用/505目标、163精确测试名、147来源锚点），差异矩阵[A10](../../evidence/audits/2026-10-10-v1-current-gap-matrix-a10.json)，SHA-256 `3add1298c1796b4f4a2eda2e61e3289f4195f9fd8ebfec90812543894276a6ab`。此工作只关闭独立FakeBroker资产账本固定场景子项；OD-014、SELL可用性/应收/结算、完整市场规则、用户验收与V1其余门禁继续开放。

正式V1门禁a453（本轮FakeBroker资产账本、V1.4 §8.27、P4交付勾选、crosswalk与A10同步后）：五阶段文档审计PASS，证据审计PASS（1056引用、147份Manifest、286项、0失败），V1仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`。仍缺四个指定历史TestRun结构化导出（V1.2及V1.5历史Run）、新增范围五阶段用户人工验收、OD-013/OD-014及旧Run决定、活动/全域配对恢复、Ubuntu目标环境与其他阶段未完成项。[a453日志](../../evidence/audits/2026-10-10-v1-version-gate-a453.log)，[exit code](../../evidence/audits/2026-10-10-v1-version-gate-a453.exit.txt)，[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a453.log.sha256)。

2026-10-10 P4/V1.4 FakeBroker资产不足拒绝及恢复：隔离Governance/Trade/Portfolio真实HTTP和三套独立PostgreSQL中，以正常Portfolio余额/Reservation配合受Hash授权的FakeBroker零现金种子执行BUY，Trade返回422 `FAKEBROKER_INSUFFICIENT_ASSETS`；订单、Fill、Outbox、账户资产和资产事件均0。用修正初始现金和新授权重试后唯一提交1订单/1 Fill/1 Outbox/1资产事件；相同命令重放仍稳定。定向Harness PASS，完整V1.4 code suite a13 exit 0，[日志](../../evidence/audits/2026-10-10-v14-paper-http-parity-code-suite-a13.log)，SHA-256 `0ef094a5f5ea8551e8760e244f88ac162c88b5b3122ef94fd64e99ab54815af6`。阶段§8.28、V1.4-S2-L15、当前差异矩阵A13及交叉检查a12同步；147项/1608路径引用/508目标/163测试名/147锚点PASS。P4依旧OPEN，OD-014结算语义、SELL应收/可用性、完整规则与人工验收未完成。

正式V1门禁a454（V1.4 FakeBroker资金不足原子拒绝/新授权恢复、阶段§8.28、crosswalk和差异矩阵A11同步后）：五阶段文档审计PASS，证据审计PASS（1057引用、147份Manifest、286项、0失败），V1仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`。四个指定历史TestRun导出、五阶段新增范围人工验收、OD-013/OD-014及旧Run决策、全域配对恢复、Ubuntu目标环境与其他阶段未完成工程继续开放。[a454日志](../../evidence/audits/2026-10-10-v1-version-gate-a454.log)，[exit code](../../evidence/audits/2026-10-10-v1-version-gate-a454.exit.txt)，[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a454.log.sha256)。

V1.4当前工作树Web/API/CLI E2E复验：在FakeBroker独立资产原子账本/资金不足恢复实现后执行完整`pnpm test:e2e -- --stage V1.4` exit 0；Playwright 5/5，API与8个浏览器Run同Run CLI check-only通过，临时资源清理核验。详见[日志](../../evidence/audits/2026-10-10-v14-paper-http-parity-web-e2e-a01.log)，SHA-256 `6d05ea27f03d1916027c0c19b5fe7ed6cf23f77b18ab3e5d1e813e217b14e332`。更新V1.4验收行和V1.4-S2-L15 crosswalk；crosswalk a17通过（147项、1614路径引用/514目标、163测试名、147锚点），当前差异矩阵[A14](../../evidence/audits/2026-10-10-v1-current-gap-matrix-a14.json)，SHA-256 `f37133dd05a6190a294dc39ad8c358edf2998de1a6914c9a95516a353553f45b`。正式V1门禁a456文档审计PASS、证据审计PASS（1063/148/287），仍INCOMPLETE/exit 2；[门禁日志](../../evidence/audits/2026-10-10-v1-version-gate-a456.log)，SHA-256 `7a55234ebfebdbfa9ccdd8114cb0abf7067c253d436fdc87a1725d23986f5ac8`。

2026-10-10 P1/V1.1核心合同副本回归：扩展`generate-contract-types.test.mjs`，检查Money、Security、AccountInitializationFixture、AccountSnapshot、ClockContext和TestRun六类核心Schema在包级TS/Python及8个服务生成TS副本中的字段与required性。定向测试3/3；`pnpm contracts:check`通过（207个Schema校验、12项合同测试、203个类型生成输出、29个客户端生成器、111条兼容规则）；完整`pnpm verify:stage -- --stage V1.1 --suite code`受控回环exit 0。沙箱首轮仅因两个本机HTTP测试绑定`127.0.0.1`被EPERM阻断，失败保留于[a01](../../evidence/audits/2026-10-10-v11-core-service-schema-code-suite-a01.log)；受控重跑[a02](../../evidence/audits/2026-10-10-v11-core-service-schema-code-suite-a02.log)SHA-256 `719006df439ebf23d8f38a209782869ed8f171a5f8a95376abb474cd602ddceb`通过。crosswalk a18 PASS：147项、1625路径引用/525目标、164精确测试名、147来源锚点；当前差异矩阵[A15](../../evidence/audits/2026-10-10-v1-current-gap-matrix-a15.json)，SHA-256 `24330a4dc3dc8c975ef579b476ac6ba6323b93409ab468d612d62ea43bf19cd7`。该证据只补生成类型副本字段一致性，业务模块消费映射仍OPEN，V1.1-S2-L13/P1不关闭。

正式V1门禁a458（V1.1公共核心Schema服务副本回归、阶段/验收/交叉表和A15矩阵同步后）：五阶段文档审计PASS，证据审计PASS（1068引用、148份Manifest、287项、0失败）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。缺少四个指定历史TestRun结构化导出，OD-013/OD-014与旧Run决定、完整活动/全域恢复、目标Ubuntu及新增范围人工验收仍未满足。[a458日志](../../evidence/audits/2026-10-10-v1-version-gate-a458.log)，SHA-256 `2538398ea4a70713ed8b35bdf342016b3fde63ffa791c149017c0e83bd719f69`。

2026-10-10 P0/P5-V1.5-S2-L20现状纠正：复核发现A15沿用的OPEN说明称“Trade Worker在真实订单/Fill后故障未验证”，与阶段§8.18的当前有效报告矛盾。已核对隔离机器报告及E2E断言：FakeBroker持久提交后、HTTP响应前实际终止Trade主实例，Temporal重试由共享库备用实例按原`clientOrderId`查询；AUTO四笔订单/Fill、预算消耗和双账本MATCH均有断言，四场景Web/API/CLI/export通过，外部来源和真实券商调用0。交叉索引[a20](../../evidence/audits/2026-10-10-v1-crosswalk-check-a20.log)结构检查PASS：147项、1632路径引用/527目标、165精确测试名、147锚点；差异矩阵[A16](../../evidence/audits/2026-10-10-v1-current-gap-matrix-a16.json)将该单实例故障切片记为已验证，仍保持P5父项PARTIAL/OPEN。实际Mac睡眠/唤醒、同时/多故障组合、完整操作者演练及人工验收仍未完成。历史报告[JSON](../../evidence/audits/2026-10-09-v15-trade-worker-failover-sq-v15-e2e-75b262d7e2b9d8fa1806.json)SHA-256 `f89d797ec555d475936a26156724aa6df81eb0e8264d8e82e88bf36b56bde307`；这次纠正的是P0差异描述，不代表新增故障执行或整项验收通过。

2026-10-10 P5/V1.5双Trade中断增量：实现固定故障开关，使两个Trade Execution实例在FakeBroker持久提交订单/Fill后同时终止1.5秒，随后恢复一个实例，验证Temporal按原`clientOrderId`查询原单并完成AUTO账本核验。隔离E2E 3/3、完整V1.5 code suite exit 0；首轮loopback EPERM保留为a01，受控复跑a02通过。报告[JSON](../../evidence/audits/2026-10-10-v15-trade-double-failure-sq-v15-e2e-e2b3577ef5b427c3b250.json)、[E2E日志](../../evidence/audits/2026-10-10-v15-trade-double-failure-e2e-a02.log)、[code suite](../../evidence/audits/2026-10-10-v15-trade-double-failure-code-suite-a02.log)。P5仅增加该固定切片，Mac睡眠/唤醒、多故障组合、操作演练与人工验收仍未完成。交叉表a21结构检查147项、1636路径/530目标、166精确测试名、147锚点PASS；差异矩阵[A17](../../evidence/audits/2026-10-10-v1-current-gap-matrix-a17.json)仍为派生草稿，需人工语义复核。

正式V1门禁a460（双Trade故障证据、V1.5操作记录、测试计划、验收摘要、交叉表a21与A17同步后）：五阶段文档审计PASS，证据审计PASS（1072引用、148份Manifest、287项、0失败），版本仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。四个指定历史Run导出、OD-013/OD-014及旧Run决定、五阶段剩余交付/人工验收、全域恢复及Ubuntu目标环境继续未满足。[a460日志](../../evidence/audits/2026-10-10-v1-version-gate-a460.log)，SHA-256 `450c3e1a03d2b91031b9920fbfe03e1c7de96556739fc87fbf362622ba37b9a9`。

修正a461门禁日志的SHA sidecar格式后复跑正式门禁a462：五阶段文档审计PASS，证据审计PASS（1072引用、148份Manifest、287项、0失败），整体仍INCOMPLETE/exit 2且`uncheckedVersionGate=true`。a461记录保留为失败历史（它指出a460侧车格式不符）；a462为当前有效门禁。[a462日志](../../evidence/audits/2026-10-10-v1-version-gate-a462.log)，[exit code](../../evidence/audits/2026-10-10-v1-version-gate-a462.exit.txt)，[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a462.log.sha256)。

2026-10-10共享核心Schema当前树兼容复验：完整V1.2代码套件a02 exit 0（四Run Web/API/CLI、Qlib 0.9.6隔离worker、数据库集成/迁移、Artifact取消/恢复；随机资源精确清理）；V1.3完整代码套件a01 exit 0（授权/模式边界和隔离迁移/HTTP/PG）；V1.4完整代码套件a01 exit 0（三服务真实HTTP、独立PostgreSQL、FakeBroker/Portfolio账本与迁移/回测检查）。首轮V1.2普通沙箱测试只因监听`127.0.0.1`受EPERM阻止，保留于[a01](../../evidence/audits/2026-10-10-v12-post-core-schema-compat-code-suite-a01.log)，受控本机重跑a02通过。三份完整通过日志：[V1.2 a02](../../evidence/audits/2026-10-10-v12-post-core-schema-compat-code-suite-a02.log)，SHA-256 `d33270fca698367dbd50262821122b25e3218fab3f0dca40b548ca778d4fd8eb`；[V1.3 a01](../../evidence/audits/2026-10-10-v13-post-core-schema-compat-code-suite-a01.log)，SHA-256 `403587636570d37134363bf314e9f9d51ccd080cb87b4f587563492328f51ff9`；[V1.4 a01](../../evidence/audits/2026-10-10-v14-post-core-schema-compat-code-suite-a01.log)，SHA-256 `cf4e9313624fece5cc96745c87dc892611e086e13fd110f5798ae11869e9b478`。这组回归证明共享合同副本改动未破坏这些适用代码路径，不代表P2/P3/P4整体关闭、OD-014批准、目标Ubuntu或人验完成。

2026-10-10正式V1门禁a464（跨阶段代码兼容复验及阶段/测试计划/进度记录同步后）：五阶段文档审计PASS，证据审计PASS（1076引用、148份Manifest、287项、0失败），V1仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。门禁确认4个指定历史TestRun结构化导出仍缺失；OD-013/OD-014及旧Run决定、阶段交付、人验/环境和完整恢复条件仍开放。[a464日志](../../evidence/audits/2026-10-10-v1-version-gate-a464.log)，[exit](../../evidence/audits/2026-10-10-v1-version-gate-a464.exit.txt)，[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a464.log.sha256)。

正式门禁a465在上述兼容复验文档同步后复核：五阶段文档与证据审计PASS（1076/148/287，0失败），V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`；四个指定历史TestRun结构化导出仍缺失。[a465日志](../../evidence/audits/2026-10-10-v1-version-gate-a465.log)，SHA-256见sidecar。

2026-10-10 P5/V1.5双Trade+PostgreSQL恢复组合完成：a02/a03失败证据定位Decision Governance idle PostgreSQL Pool error导致服务进程退出；增加安全Pool error观察器并在Harness验证依赖服务ready后，隔离E2E a04通过（3/3）、同Run CLI/export及原clientOrderId读回断言通过；完整V1.5 code suite a02 exit 0。报告[JSON](../../evidence/audits/2026-10-10-v15-trade-database-combined-failure-sq-v15-e2e-d3d07879c69cbbf93168.json)，E2E日志[受控a04](../../evidence/audits/2026-10-10-v15-trade-database-combined-e2e-a04.log)，SHA-256 `64d7533dbe29e817bd32871aafa5deda50511ee6878898bababda2add3705f59`；完整代码日志[受控a02](../../evidence/audits/2026-10-10-v15-trade-database-combined-code-suite-a02.log)，SHA-256 `481df13b8e357ebb075bf771878d92d24bffafc44ccffbd216a611130b455398`。失败历史保留在阶段§8.31，父P5及V1验收仍OPEN。交叉索引复核[a22](../../evidence/audits/2026-10-10-v1-crosswalk-check-a22.log)检查147项、1641路径引用/534目标、166精确测试名和147来源锚点，PASS；差异矩阵[A18](../../evidence/audits/2026-10-10-v1-current-gap-matrix-a18.json)仅同步V1.5-L18/L20受影响条目并保持派生草稿待全表人工语义复核。


2026-10-10 V1.5共享Decision Governance池恢复改动后的V1.3兼容复验：V1.3完整代码套件受控a02 exit 0；正式隔离CN/US Web/API/CLI/export E2E 27/27通过，Trade进程重启/原单恢复等路径仍PASS，资源精确清理且真实来源/券商调用0。代码日志[受控a02](../../evidence/audits/2026-10-10-v13-post-governance-pg-resilience-code-suite-a02.log)，SHA-256 `8a281ba4a37dcadbd9257d98eb1ddb3679e993811b4b726053ac27e977e733f4`；E2E日志[a01](../../evidence/audits/2026-10-10-v13-post-governance-pg-resilience-web-e2e-a01.log)，SHA-256 `6e33112fa0d4e873f71fe783b035e3e76d2ad89d9ade4aa61d787e59a8f06434`。兼容回归不关闭P3/P5或V1阶段/人工验收。
2026-10-10 P5共享PostgreSQL恢复兼容复验：V1.5 Governance修复后，V1.2完整code suite受控a03 exit 0，Qlib/PG集成与隔离Web/API/CLI四Run通过，临时项目/卷/网络清理通过；见[日志](../../evidence/audits/2026-10-10-v12-post-governance-pg-resilience-code-suite-a03.log)，SHA-256 `c28333183c70661b7f886c2d393f0c1d7d2f42a4acfaa7aa990526e64f9130bd`。V1.2历史Run结构化导出、阶段正式交付和人工验收仍OPEN。

正式门禁a473（本轮V1.2兼容结果记录后）：文档审计PASS、证据审计PASS（1082/148/287），V1仍INCOMPLETE/exit 2。缺口与具体失败门禁详见[日志](../../evidence/audits/2026-10-10-v1-version-gate-a473.log)。

2026-10-10 P0增量：V1.5-S2-L18当前源锚点已对照第2节/§8.31人工复核并由A19记录；crosswalk结构检查PASS，147项锚点完整。该单行修复不关闭P0，差异矩阵继续保留草稿，服务/Fixture责任和语义充分性尚待人工逐项复核。

正式V1门禁a474：P0锚点变更及其记录后，五阶段文档审计PASS、证据审计PASS（1083/148/287），V1仍INCOMPLETE/exit 2；详见[日志](../../evidence/audits/2026-10-10-v1-version-gate-a474.log)。

2026-10-10 P0增量：完成V1.5-S2-L18服务责任人工映射（Platform/Governance/Trade/Portfolio）及NATS/Temporal基础设施边界记录，见[A20矩阵](../../evidence/audits/2026-10-10-v1-current-gap-matrix-a20.json)。L18仍partial，真实时钟、结算和额外恢复组合OPEN；P0整体不关闭。

正式V1门禁a475：P0服务责任矩阵更新后复核，五阶段文档审计PASS、证据审计PASS（1084/148/287），版本仍INCOMPLETE/exit 2；见[门禁日志](../../evidence/audits/2026-10-10-v1-version-gate-a475.log)。

2026-10-10 P0增量：V1.5-S2-L20确认属于操作者/主机维护范围，§8.25新增Mac睡眠/唤醒操作程序（PREPARED_NOT_EXECUTED），覆盖隔离栈、NO_TRADE同Run读回、探针/系统日志、导出及精确清理；测试名重复已去重。详见[A21矩阵](../../evidence/audits/2026-10-10-v1-current-gap-matrix-a21.json)。真实睡眠/唤醒与操作者演练仍NOT_RUN，P0未关闭。

正式V1门禁a476（L20操作程序及NOT_RUN记录同步后）：阶段文档审计PASS、证据审计PASS（1085/148/287），版本仍INCOMPLETE/exit 2。门禁详情见[日志](../../evidence/audits/2026-10-10-v1-version-gate-a476.log)。

2026-10-10 P0增量：A22完成人工核对V1.5-S2-L17市场日历/自动结账责任边界及L19 Run/Incident/Fill追溯责任边界，更新Market Data与领域服务依据并去重精确测试名。L17真实Calendar/时钟/结算、L19跨阶段任意Fill追踪及通知仍OPEN，P0矩阵整体保留草稿。详见[A22](../../evidence/audits/2026-10-10-v1-current-gap-matrix-a22.json)。

正式V1门禁a477：A22索引同步后重跑，阶段文档审计PASS、证据审计PASS（1086/148/287），V1仍INCOMPLETE/exit 2。详见[门禁日志](../../evidence/audits/2026-10-10-v1-version-gate-a477.log)。

2026-10-10 P0增量：A23从当前精确测试/证据路径为9条需求填入服务候选；其余113条仍无可据路径候选。此自动路径提取仅改善后续人工核对定位，不宣称所有权已确认；P0整体仍DRAFT/OPEN。详见[A23](../../evidence/audits/2026-10-10-v1-current-gap-matrix-a23.json)。

正式V1门禁a478（A23后复核）：阶段文档审计PASS、证据审计PASS（1087/148/287），版本仍INCOMPLETE/exit 2；见[日志](../../evidence/audits/2026-10-10-v1-version-gate-a478.log)。

2026-10-10 P0/A24更新：V1.5隔离备份恢复行新增三个精确测试映射，定向回归11/11通过；Stage §2与90-test-plan同步。全V1真实业务Artifact、Mac M1完整E2E、Ubuntu与宿主/异地RPO/RTO仍开放，见[A24矩阵](../../evidence/audits/2026-10-10-v1-current-gap-matrix-a24.json)。

正式V1门禁a479（P5备份契约测试状态同步后）：阶段文档审计PASS、证据审计PASS（1090/148/287），V1仍INCOMPLETE/exit 2；见[日志](../../evidence/audits/2026-10-10-v1-version-gate-a479.log)。

2026-10-10 P1/V1.1-S2-L28增量：当前Platform API linux/arm64容器构建和Node 24.1.0探针PASS，宿主darwin/arm64、无仿真。报告与边界见[A25矩阵](../../evidence/audits/2026-10-10-v1-current-gap-matrix-a25.json)。仅为一个服务镜像；完整栈、Qlib/RD-Agent、资源压力和真实Ubuntu验收仍OPEN。

正式V1门禁a480：V1.1 Platform API ARM64兼容证据同步后，阶段文档审计PASS、证据审计PASS（1096/148/287），V1仍INCOMPLETE/exit 2；详见[门禁日志](../../evidence/audits/2026-10-10-v1-version-gate-a480.log)。

2026-10-10 P1/V1.1-S2-L28增量：当前Platform API镜像`linux/arm64`原生与`linux/amd64`仿真探针均通过；更新双架构报告、阶段手册/测试计划与[A26矩阵](../../evidence/audits/2026-10-10-v1-current-gap-matrix-a26.json)。真实Ubuntu/全服务栈及Qlib/RD-Agent仍开放。

正式V1门禁a481（双架构Platform API探针记录同步后）：阶段文档审计PASS、证据审计PASS（1103/148/287），V1仍INCOMPLETE/exit 2；[日志](../../evidence/audits/2026-10-10-v1-version-gate-a481.log)。

2026-10-10 P0增量：A27人工追踪V1.1六类共享核心Schema的实际消费者；合同/Fixture校验当前PASS，但ClockContext直接消费和Platform V1.1本地TestRun到共享TestRun的适配仍待澄清。V1.1-S2-L13和P0保持PARTIAL/OPEN。详见[A27](../../evidence/audits/2026-10-10-v1-current-gap-matrix-a27.json)。

2026-10-10 P0/A28补充：修复V1.1-S2-L13当前来源锚点并将消费者映射指向更新Crosswalk SHA。`pnpm crosswalk:check`复验PASS，147条/147锚点、路径与测试名无缺失；消费者语义仍PARTIAL，P0不关闭。

2026-10-10 正式V1门禁a482：五阶段文档审计PASS；证据审计PASS（1105引用、148份Manifest、287项），版本仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。V1.2历史Run `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`与V1.5历史Runs `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`仍缺结构化导出；OD-013/014与旧Run处置、Mac睡眠/唤醒演练、全域活动恢复、Ubuntu实机验证及当前范围用户验收仍未完成。未替代历史Run、未签署用户验收。[a482门禁日志](../../evidence/audits/2026-10-10-v1-version-gate-a482.log)，SHA-256 `4655c2042d98b3cb79ac2a1816ba65d5158fd9382719ce8263d0ce705420b34e`。

2026-10-10 P1整版工程基线复验：`pnpm baseline:check`受控本机回环exit 0；文档链接8115/0失败、阶段编号5/0重复、Crosswalk 147项/147锚点且路径与测试引用无缺失、307 JSON/207 Schema/58 Fixture无错误、脚本测试66/66通过。普通沙箱运行a01两项仅监听127.0.0.1的seed-paper测试因EPERM失败（64/66），完整失败保留；受控同命令a02通过，日志[baseline a02](../../evidence/audits/2026-10-10-v1-baseline-check-a02.log)，SHA-256 `bbb901637b716b0f4557b06abb0550ae00e878a52f57bee579a4fc334f3cc63e`。这是共享工程基线证据，不替代任何阶段业务E2E、手册执行、目标Ubuntu、历史TestRun导出或人验，也不关闭P1/P0。

正式V1门禁a483（整版工程基线证据同步后）：五阶段文档审计PASS、证据审计PASS（1106引用、148份Manifest、287项），版本仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。四个历史TestRun结构化导出、政策/旧Run决定、全域恢复、Mac睡眠/唤醒、Ubuntu及当前范围人工验收仍未完成。[a483门禁日志](../../evidence/audits/2026-10-10-v1-version-gate-a483.log)，SHA-256 `8e8fe91b8aeadfc0607b2bad8a3c73f8b3cf924bbd937fb1b3f78bb048895eb2`。

正式V1门禁a484（修正进度证据链接并同步a483历史后）：五阶段文档审计PASS、证据审计PASS（1107引用、148份Manifest、287项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。a483中记录的四个历史Run导出、未决政策/旧Run处置、完整恢复、Mac睡眠/唤醒、Ubuntu与当前范围人工验收仍未完成。[a484日志](../../evidence/audits/2026-10-10-v1-version-gate-a484.log)，SHA-256 `78f19d2fd0940def8d7ccf4634330277a8faf908f5939de49d717854a7d28854`。

2026-10-10 P0责任类型映射A29：从A28中人工分类第7节36条阶段交付、第90节13条跨服务测试验证、第99节25条版本门禁记录，共74条归为跨服务/版本责任，而不强行分配单一领域服务。仍有38条（主要第8节操作与运行要求）和第2节实现责任需要逐项核实；P0父项保持OPEN，分类不代表完成或验收。详见[A29差异矩阵](../../evidence/audits/2026-10-10-v1-current-gap-matrix-a29.json)，SHA-256 `ec8affc228d74ccbb14392be7dc41a4b4c52c449ad0d4a38040da73978558d23`。

正式V1门禁a485（A29责任类型矩阵及Crosswalk复验同步后）：五阶段文档审计PASS、证据审计PASS（1108引用、148份Manifest、287项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。A29仅完成74条交付/测试/门禁记录的跨服务责任分类；剩余38条运行/实现责任、四个历史Run导出、决定与旧Run处置、全域恢复、环境实测和当前范围人工验收仍未满足。[a485日志](../../evidence/audits/2026-10-10-v1-version-gate-a485.log)，SHA-256 `2a3c12e0967a80ffc9689d37a62be1149f9c8e4e4d793ba2b1b0fd331592a3be`。

2026-10-10 P0责任类型映射A30：对A29剩余38条未显式服务归属项逐条核对来源，确认均为五阶段第8节小节标题/运行验证记录，分类为命令、环境准备、Web/CLI操作、恢复手册、证据及验收记录责任；不是单一领域服务实现的直接归属。矩阵现0条未分类服务责任，但第2节服务候选的语义归属与第8节实际手册执行仍开放，P0继续OPEN。[A30矩阵](../../evidence/audits/2026-10-10-v1-current-gap-matrix-a30.json)，SHA-256 `075fb3764796200af485faedba630122ec9b086b9f5bd164eb811569a2f97252`。

正式V1门禁a486（A30将38条第8节执行记录分类后）：五阶段文档审计PASS、证据审计PASS（1109引用、148份Manifest、287项），版本仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。A30只补责任类型分类，不代表手册执行、服务语义映射或验收完成；四个历史Run导出、业务/旧Run决定、全域恢复、Mac睡眠/唤醒、Ubuntu及当前范围人工验收继续开放。[a486日志](../../evidence/audits/2026-10-10-v1-version-gate-a486.log)，SHA-256 `74ee14ad8cfde06939fc8dd881c9464b4470790a2c24c089f5ea613a9b4a439e`。

2026-10-10 V1版本状态摘要纠偏：核对当前阶段第8节与最新隔离证据后，更新`00-version-plan.md`五阶段状态摘要，替换V1.3过期的22/22为当前27/27，并补录V1.1双架构探针、V1.2最新PG恢复兼容、V1.4现存边界及V1.5 Trade+PostgreSQL组合恢复；过往运行/失败与签署仍保留在阶段第8节和原始日志。阶段均保持PARTIALLY_IMPLEMENTED，不因摘要更新推断验收通过。

正式V1门禁a489（版本计划五阶段摘要更新与表格修正后）：五阶段文档审计PASS、证据审计PASS（1110引用、148份Manifest、287项），版本仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。V1.1–V1.5均保持PARTIALLY_IMPLEMENTED；历史TestRun导出、待决决定/旧Run处置、完整恢复、Mac睡眠/唤醒、Ubuntu及当前范围用户验收未完成。[a489日志](../../evidence/audits/2026-10-10-v1-version-gate-a489.log)，SHA-256 `9c6741d8483fab053537cdc74dd1c5f02b80967d8b1f38b9b6a54bef33021c51`。

2026-10-10 P4/V1.4当前树兼容回归：因共享Platform/Governance/Trade/Portfolio实现近期变化，重跑完整V1.4 code suite，受控exit 0；隔离HTTP/PG交易与独立账本对照、Market Data迁移/集成、报告发布fencing及资源清理均通过。阶段§8.30、90-test-plan与V1.4状态摘要已同步。只确认当前树代码兼容和固定场景，不关闭OD-014、全规则/结算、Ubuntu、人验或P4父项。日志[见此](../../evidence/audits/2026-10-10-v14-current-tree-code-suite-a01.log)，SHA-256 `c2f03a99fa118c749937568f2886b501e8da713097fbdfc6ad194f80eb0196c2`。

正式V1门禁a491（V1.4当前树完整code suite记录同步后）：五阶段文档审计PASS、证据审计PASS（1114引用、148份Manifest、287项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。本次V1.4 code suite只加强当前代码兼容证据，不关闭P4完整规则/结算、OD-014、Ubuntu、人验或历史Run导出。[a491日志](../../evidence/audits/2026-10-10-v1-version-gate-a491.log)，SHA-256 `55e33fd13b95adb18cd2aeb6e7c2478b31df7f033afee71ba9f21d4fe4dc1e30`。

正式V1门禁a492（修正V1.4状态摘要并同步a491结果后复核）：五阶段文档审计PASS、证据审计PASS（1117引用、148份Manifest、287项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。阶段代码/固定切片通过不替代规则结算、历史导出、环境实测及人工验收；未新增签署。[a492日志](../../evidence/audits/2026-10-10-v1-version-gate-a492.log)，SHA-256 `4343ed66a7410fe1b212ebeb8fff9684507d1d1d5227d8f9dc496ea94e1c4990`。

2026-10-10 P0/V1.3交易核心责任映射A31：人工按Architecture与阶段要求核实V1.3-S2-L13～L17：L13治理/Portfolio为主责、Trade与Platform协作；L14 Trade拥有FakeBroker订单/成交契约；L15 Trade拥有状态/Fill，Governance预算与Portfolio账本按域持有；L16 Platform编排固定场景、Trade注入FakeBroker故障；L17由Platform/Governance/Portfolio/Trade分别在服务端接受路径执行PAPER/FAKE限制。映射不证明测试/需求完成，剩余缺口保留。详见[A31矩阵](../../evidence/audits/2026-10-10-v1-current-gap-matrix-a31.json)，SHA-256 `c4bd36b46c40fd5b30b59896bd1d7974e71425f1ccdef52c0a03a89a2d8081ee`。

正式V1门禁a493（P0 A31服务责任映射及当前Crosswalk复核后）：五阶段文档审计PASS、证据审计PASS（1118引用、148份Manifest、287项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。A31只明确V1.3-L13～L17责任分工，不证明功能、测试充分性或接受通过；历史导出、OD/旧Run处置、活动/全域恢复、Ubuntu和用户当前范围人验仍开放。[a493日志](../../evidence/audits/2026-10-10-v1-version-gate-a493.log)，SHA-256 `7a097acbfcbfa9eed43bdc0e5c24393104bfcf9904decce17eb9f68ced5005ef`。

2026-10-10 P1/V1.1当前树完整code suite兼容复验：因共享存储、Platform与认证相关实现近期变化，重跑`pnpm verify:stage -- --stage V1.1 --suite code`，受控exit 0；脚本66/66、隔离迁移/持久化、服务身份与模式边界检查通过，活动服务未连接且临时容器/网络清理确认。V1.1 §8.26、90-test-plan和00-version-plan已同步；只关闭当前工程兼容复验子项，不关闭活动API切换/回退、旧RUNNING/WAITING记录处置、完整发布矩阵、Ubuntu、人验或P1父项。日志[见此](../../evidence/audits/2026-10-10-v11-current-tree-code-suite-a01.log)，SHA-256 `5df1d49e48b8adf73bce5eee1d4df1060b954bdf6c5cc05884780de4f1583602`。

正式V1门禁a494（V1.1当前树code suite记录同步后）：五阶段文档审计PASS、证据审计PASS（1232引用、148份Manifest、287项），V1仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。V1.1工程兼容代码复验通过不改变活动API切换/回退、旧Run处置、目标Ubuntu或当前范围人工验收的未完成状态；四个历史TestRun导出和OD/恢复缺口仍开放。[a494日志](../../evidence/audits/2026-10-10-v1-version-gate-a494.log)，SHA-256 `43a0e23a1eb2692b84f53e7f7372d5925533fa71cffae57981b7259f29f48470`。


2026-10-10 P1/P3 V1.3当前树Web/API/CLI复验：完整隔离`pnpm test:e2e -- --stage V1.3` exit 0、Playwright 27/27，当前固定双市场/拒绝/恢复/AUTO/多腿/UNKNOWN/Trade重启/T+1场景均经同Run CLI核对并导出；真实来源和券商调用0，精确隔离清理通过。日志[见此](../../evidence/audits/2026-10-10-v13-current-tree-web-api-cli-e2e-a01.log)，SHA-256 `bb186939cc96599279377bcec66da9e7c87b2505335d0808efbb46c0c0dfd1e9`，已同步V1.3 §8.67、测试计划和版本摘要。该回归不关闭完整市场规则/结算、OD-014、全域恢复、Ubuntu及用户验收。


正式V1门禁a495（V1.3当前树Web/API/CLI E2E记录同步后）：五阶段文档审计PASS、证据审计PASS（1235引用、148份Manifest、287项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。V1.3固定场景当前树27/27通过仅更新工程证据；四个历史TestRun结构化导出缺失、OD/旧Run与活动数据处置决定、完整跨域恢复、Mac睡眠/唤醒、目标Ubuntu及当前范围用户验收仍未完成。[a495日志](../../evidence/audits/2026-10-10-v1-version-gate-a495.log)，SHA-256 `29f33cd25b0828fbc542565d70cc6eec03695ee13510ccb19b56e3b5cfcdf51a`。


2026-10-10 P5 Mac睡眠/唤醒演练前置准备：隔离V1.5交互栈 `sq-v15-stack-bd6742505479a4cd8f94` 已达READY，NO_TRADE Run `1f9b8fd0-9a51-45eb-803d-b613bbd8d126`有120/120观察、HOLD断言PASS、订单/Fill/预留0；导出Manifest Hash为`0b5fadfe98a7ee859db788549e3c957b7fae79858797ce02fbee19b14776c20c`。同Run CLI exit 2，原因是完整调度断言仍WAITING；Evidence Export exit 0。Mac当时锁屏，未触发睡眠，隔离项目保留等待操作者继续；未把子项标PASS。阶段§8.25 Runbook已修正Evidence Export显式`--stage V1.5`，尝试历史及前置文件见[证据目录](../../evidence/audits/v15-mac-sleep-wake-sq-v15-stack-bd6742505479a4cd8f94/attempts.md)。

正式V1门禁a496（V1.5睡眠/唤醒前置运行证据及Runbook导出命令修正后）：阶段文档与证据审计PASS（1239/149/288），V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。锁定Mac导致本轮未执行真实睡眠/唤醒；隔离栈保留待操作者解锁继续，历史Run、政策/旧Run决定、活动/全域恢复、Ubuntu及当前范围人验仍OPEN。[a496日志](../../evidence/audits/2026-10-10-v1-version-gate-a496.log)，SHA-256 `0d1279c86b956bb6ab22673e32d3bf36772360240daf38f37dc265b5bc492e11`。


正式V1门禁a497（V1.5睡眠/唤醒Runbook补齐Web session、API地址与V1.5导出参数后）：阶段文档与证据审计PASS（1240/149/288）；V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。真实睡眠/唤醒仍因Mac锁屏未执行，隔离项目保留等待操作者恢复；政策、历史Run、活动/全域恢复、Ubuntu和人验阻塞不变。[a497日志](../../evidence/audits/2026-10-10-v1-version-gate-a497.log)，SHA-256 `5f9cefd671ea6cec7f7aa9aa1373b093164e33a412bd942c671044a4db328250`。


2026-10-10 P0/V1.1责任映射增量：按当前A31逐条对照V1.1阶段PRD、Platform/Portfolio/Quant/Research Automation服务设计，人工确认第2/7/8节23条现存行的服务主责、协作方与项目所有者/运维责任。结果[A01 JSON](../../evidence/audits/2026-10-10-v1-v11-responsibility-a01.json)，SHA-256见sidecar；摘要[审计说明](../../evidence/audits/2026-10-10-v1-v11-responsibility-a01.md)。Platform负责Run/验收与编排，Portfolio负责Account/账本，Artifact为跨服务内容内核，活动切换/Ubuntu/人验属于运维或项目负责人动作。此审计只减少V1.1责任候选歧义，不关闭任何未验证交付；全V1 P0矩阵继续OPEN。阶段S2-L14已加引用。


正式V1门禁a498（V1.1责任映射审计A01归档后）：五阶段文档与证据审计PASS（1242/149/288），版本仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。责任分类不能代替交付或用户验收；P0全版逐项矩阵、V1.1活动切换、OD/历史Run、全域恢复、Ubuntu仍未闭合。[a498日志](../../evidence/audits/2026-10-10-v1-version-gate-a498.log)，SHA-256 `e377fc67dcc2b603f24f3f0c91f70d2eab82d0b9fbc910299f346713745eca1d`。


2026-10-10 P0/V1.2责任映射增量：对照A31与V1.2阶段要求及Market Data、Quant Research、Platform服务设计，人工确认第2/7/8节25条要求的领域主责、Platform编排、共享Artifact内核及外部操作责任。结果见[A01审计](../../evidence/audits/2026-10-10-v1-v12-responsibility-a01.md)和[JSON](../../evidence/audits/2026-10-10-v1-v12-responsibility-a01.json)，JSON SHA-256见sidecar。该映射只减少责任歧义；Artifact保留政策/物理清理、真实RD-Agent、完整日历/研究边界、Ubuntu、人验和P0全版差异矩阵继续OPEN。


正式V1门禁a499（V1.2责任映射记录同步后）：五阶段文档审计与证据审计PASS（1245/149/288），V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。本轮完成V1.2责任分类而未关闭业务要求；全版P0差异核对、历史Run/决定、全域恢复、Ubuntu、阶段和版本人验继续OPEN。[a499日志](../../evidence/audits/2026-10-10-v1-version-gate-a499.log)，SHA-256 `fb085de49cfb5b29b23f571be60769f48fcd8880b6ce351ab3c4dc00d460b314`。


2026-10-10 P0/V1.4责任映射增量：按V1.4 Quant ownership设计及服务架构核对第2节六项要求，明确Quant Research负责BacktestRun/时钟/撮合/成本规则/指标，Platform拥有TestRun/Web投影，Trade与Portfolio分别持有Paper订单成交及现金/结算账本。审计[A01](../../evidence/audits/2026-10-10-v1-v14-responsibility-a01.md)，结构化[JSON](../../evidence/audits/2026-10-10-v1-v14-responsibility-a01.json)，SHA-256见sidecar。OD-014仍阻断Paper SELL→BUY结算验收；映射不关闭P4或V1.4。


正式V1门禁a500（V1.4责任映射A01后）：阶段文档与证据审计PASS（1248/149/288），V1仍INCOMPLETE/exit 2。责任澄清不代表Quant与Paper规则一致；OD-014、V1.4市场规则/结算、P0全版矩阵、历史Run、恢复、Ubuntu与人验仍开放。[a500日志](../../evidence/audits/2026-10-10-v1-version-gate-a500.log)，SHA-256 `b4de366ad163c4cda63a2c7f7468233cf77316417711c6d80d8d4abe3d3739c5`。


2026-10-10 P0/V1.5责任映射增量：按当前需求矩阵、V1.5阶段和Platform/Temporal/Trade/Governance/Portfolio服务设计人工核对20条第2/7/8节要求。明确Platform owns当前Workflow/TestRun编排集成，Temporal/NATS承担持久基础设施，领域事实由Trade/Governance/Portfolio分别拥有，Ubuntu及睡眠/唤醒属于真实主机/操作责任。详见[A01审计](../../evidence/audits/2026-10-10-v1-v15-responsibility-a01.md)及[JSON](../../evidence/audits/2026-10-10-v1-v15-responsibility-a01.json)。该项只完成责任分类；Mac仍锁屏、睡眠/唤醒NOT_RUN，P5及全版P0继续OPEN。


正式V1门禁a501（V1.5责任映射记录同步后）：阶段文档和证据审计PASS（1251/149/288），V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。责任边界核对不关闭P5运行/恢复验收。Mac睡眠/唤醒、全V1配对恢复、Ubuntu、历史Run、项目所有者决定及人工签署仍待满足。[a501日志](../../evidence/audits/2026-10-10-v1-version-gate-a501.log)，SHA-256 `8d2b90096ebdc8bf5c6c37c95180743aba98552af4efe86f95fdaf6df8a28eb4`。

2026-10-10 P0/V1.3责任映射增量：按A31、V1.3阶段要求与领域服务边界核对第2/7/8节20条当前来源行，明确Proposal/授权与预算、FakeBroker订单成交、Platform编排、Web/CLI/evidence及用户/操作责任。记录见[审计A02](../../evidence/audits/2026-10-10-v1-v13-responsibility-a02.md)、[JSON](../../evidence/audits/2026-10-10-v1-v13-responsibility-a02.json)。本项不代表实现或验收通过，P0全版矩阵继续OPEN。

正式V1门禁a502（2026-10-10，V1.3责任映射A02后）：阶段文档/证据审计PASS（1255/149/288），V1为INCOMPLETE/exit 2，`uncheckedVersionGate=true`。V1.3责任分类完成而未关闭产品/恢复/环境/人验门槛；详见[日志](../../evidence/audits/2026-10-10-v1-version-gate-a502.log)。

2026-10-10 P0/V1.4责任映射增量：A31中V1.4第2/7/8节20条要求已完成主责/协作人工核对；此前A01只覆盖第2节6条，新增第7/8节14条见[审计A02](../../evidence/audits/2026-10-10-v1-v14-responsibility-a02.md)和[JSON](../../evidence/audits/2026-10-10-v1-v14-responsibility-a02.json)。P0差异清单其余测试充分性、Fixture覆盖及发布/消费者语义仍开放。

正式V1门禁a503（2026-10-10）：五阶段文档/证据审计PASS（1258/149/288），V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。V1.4责任映射收尾不证明P4规则/结算一致性或版本通过。[日志](../../evidence/audits/2026-10-10-v1-version-gate-a503.log)。

2026-10-10 P4/V1.4公司行动拒绝切片：将冲突事件ID、拆股零碎股、Fixture日历外派息三项fail-closed行为加入`V1.4-S2-L15`测试追踪；受控完整`pnpm verify:stage -- --stage V1.4 --suite code` exit 0（Quant 101/101、Python Worker 14/14，隔离DB/HTTP检查及清理通过）；普通沙箱首轮因loopback EPERM未完成。详见[阶段§8.31](../prd/v1-local-simulation/04-daily-backtest.md#831-corporate-action冲突无效输入拒绝测试2026-10-10)。公司行动完整规则与OD-014仍OPEN。

2026-10-10 P0范围更新：共享V1测试计划已恢复至`90-test-plan.md`，重复的V1.1材料留在其正式阶段文件；交叉索引已刷新并通过（147/147要求、1644路径引用、168精确测试名、147锚点、零失配）。责任映射全量覆盖A01将147条要求逐项分类，0未分类。P0未关闭：仍需评估断言充分性、Fixture要求覆盖、消费者/发布兼容及其他语义缺口。[crosswalk a24](../../evidence/audits/2026-10-10-v1-crosswalk-check-a24.json)，[责任覆盖A01](../../evidence/audits/2026-10-10-v1-responsibility-coverage-a01.md)。

正式V1门禁a504（2026-10-10）：五阶段文档/证据审计PASS（1131/150/289），V1仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`。本轮P0责任/索引及P4负向测试切片均未关闭版本所需历史证据、政策决定、活动与宿主恢复、Ubuntu及人工验收。[a504日志](../../evidence/audits/2026-10-10-v1-version-gate-a504.log)。

正式V1门禁a505（V1.4当前树完整code suite、责任映射与文档链接核验后）：阶段文档/证据引用审计均PASS（1133/150/289），V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。历史Run原始导出、OD-013/014及旧Run决策、活动/全域恢复、Mac睡眠唤醒、Ubuntu和当前范围人验仍是验收阻塞项。[日志](../../evidence/audits/2026-10-10-v1-version-gate-a505.log)。


2026-10-10 P5/V1.5 NATS健康探针增量：复核当前V1.5容器发现错误的`nats-server --signal check`健康探针；NATS服务本身的`/healthz?js-enabled-only=true`JetStream readiness检查exit 0。Compose声明已修为wget探测且配置校验通过，活动栈未重建，因此原容器仍为unhealthy，保留原运行现场；独立隔离容器应用修正探针后healthy（fail streak 0），临时资源已核验清理。后续维护窗口仍需在现存栈应用配置并检查健康状态。[诊断a01](../../evidence/audits/2026-10-10-v15-nats-healthcheck-fix-a01.log)、[JetStream复验a02](../../evidence/audits/2026-10-10-v15-nats-healthcheck-fix-a02.log)、[隔离运行a03](../../evidence/audits/2026-10-10-v15-nats-healthcheck-fix-a03.log)。不关闭P5或版本验收。

正式V1门禁a506（2026-10-10）：阶段文档及证据引用审计PASS（1135/150/289），V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。V1.5 NATS探针声明修正尚未应用到当前运行容器；历史导出、未决政策/旧Run、活动切换及恢复、主机/Ubuntu和人工验收仍OPEN。[日志](../../evidence/audits/2026-10-10-v1-version-gate-a506.log)。

正式V1门禁a507：阶段文档/证据审计PASS（1136/150/289），V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`；活动NATS容器需未来重建以应用已验证的JetStream readiness探针，其他历史/政策/宿主/Ubuntu/人验项继续OPEN。[日志](../../evidence/audits/2026-10-10-v1-version-gate-a507.log)。

正式V1门禁a508：五阶段文档/证据审计PASS（1138/150/289），V1仍INCOMPLETE/exit 2；JetStream探针配置已核验但活动容器未重建，历史证据/决策/恢复/主机环境和人工验收仍OPEN。[日志](../../evidence/audits/2026-10-10-v1-version-gate-a508.log)。

正式V1门禁a509：文档/证据审计PASS（1141/150/289），V1仍INCOMPLETE/exit 2；新隔离NATS容器应用修正探针后healthy，但当前验收栈未重建。历史导出、决定、恢复、宿主/Ubuntu及人工验收仍未达成。[日志](../../evidence/audits/2026-10-10-v1-version-gate-a509.log)。

2026-10-10 P0增量：纠正V1.1-S8-L96过时的“待实现”总结。当前§8.2随机隔离启动/会话/Web/精确清理指引及2026-10-09实跑报告已具备，交叉索引该单项转PASS；Ubuntu主机发布步骤/实机证据仍缺，V1.1 §7交付与阶段验收不因此关闭。矩阵[A32](../../evidence/audits/2026-10-10-v1-current-gap-matrix-a32.json)，Crosswalk运行报告[a26](../../evidence/audits/2026-10-10-v1-crosswalk-check-a26.json)，均保留P0整体OPEN。

正式V1门禁a510：五阶段文档/证据审计PASS（1141/150/289），V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。V1.1本地启动文档子项已由实跑证据关闭，不改变V1.1整体交付；Ubuntu、活动存储决定、历史Run、政策、全版恢复和用户验收仍OPEN。[日志](../../evidence/audits/2026-10-10-v1-version-gate-a510.log)。


2026-10-10 P6/V1.5当前人工验收入口更新：只读核对现存隔离栈，真实Web/API URL已固化，Web和API live返回200；NATS仍显示unhealthy（旧探针），其它服务健康。栈保持运行，未创建业务Run或重启；Mac解锁后可从该入口继续当前范围人工检查，但当前仍NOT_RECORDED。[快照证据](../../evidence/audits/2026-10-10-v15-interactive-stack-current-snapshot-a01.json)。

正式V1门禁a511：阶段文档与证据审计PASS（1143/150/289），V1仍INCOMPLETE/exit 2。当前V1.5入口可交接但不构成用户验收，NATS仍待在原栈应用修正；历史Run/决定/恢复/宿主与Ubuntu门槛仍OPEN。[日志](../../evidence/audits/2026-10-10-v1-version-gate-a511.log)。


### 2026-10-10 续跑：交付手册追踪复核与门禁a512

V1.1 §8.4的同Run CLI/export与V1.5 §8.2/§8.4的隔离启动/清理、同Run CLI/export操作路径已按当前阶段文本及执行报告校正Crosswalk与A33矩阵；`pnpm crosswalk:check`通过（147条要求、1654路径引用、544个目标、168个精确测试名、147个锚点）。这些PASS严格限定在已执行的操作手册子项。a512正式门禁仍`INCOMPLETE`/exit 2，证据审计1143/150/289通过，4个历史Run结构化导出、开放决定与旧Run处置、活动数据/全域恢复、Mac实际睡眠唤醒、Ubuntu实机、当前范围本人验收仍开放。[门禁日志](../../evidence/audits/2026-10-10-v1-version-gate-a512.log)，SHA-256 `ee808eaa4ef305904ca8669aad39bac8125d676f655702b6fa4ae947e33b3966。


2026-10-10 P5/A12：当前工作树V1.5完整代码套件受控重跑exit 0，覆盖baseline、workspace build/lint/typecheck/unit、隔离PostgreSQL/HTTP、migration CLI、Trade恢复集成、linux/arm64容器边界；每个隔离数据库/网络清理验证通过，活动服务`NOT_CONNECTED`。完整日志及SHA见[V1.5 §8.34](../prd/v1-local-simulation/05-scheduling-and-recovery.md#834-v15当前树完整代码套件及nats探针修正回归2026-10-10)。这关闭代码回归子项，不关闭业务阶段、当前交互栈健康修复、真实宿主/Ubuntu或人工验收。


正式门禁a514已确认V1.5当前树code suite及文档/证据结构检查通过；版本仍INCOMPLETE/exit 2，未关闭项详见[验收记录](../prd/v1-local-simulation/99-acceptance.md)。


A13/P5：新建V1.5随机隔离交互栈实测Compose修正后NATS JetStream健康，readiness HTTP exit 0；就绪Web/API显示PAPER/FAKE、LIVE关闭。精确项目清理及无残留通过。[运行证据与范围](../prd/v1-local-simulation/05-scheduling-and-recovery.md#835-修正nats探针的完整隔离交互栈实测2026-10-10)。该结论不应用于此前保留的运行栈；睡眠/唤醒和本人验收仍待实机。


正式门禁a516确认最近V1.5工程证据已进入可核查索引；版本仍INCOMPLETE/exit 2。最新阻塞和证据引用见[进度](../progress.md)与[验收表](../prd/v1-local-simulation/99-acceptance.md)。


A14/P5运行栈状态：已实测新隔离栈应用NATS探针并清理，但保留交互项目仍使用旧探针且Docker报告unhealthy，Web/API均200。保留栈只读证据及维护边界见[V1.5 §8.36](../prd/v1-local-simulation/05-scheduling-and-recovery.md#836-保留交互栈当前健康状态只读复核2026-10-10)；后续需在精确维护/回归窗口应用。


A15/P5运行保护：目标隔离栈有1个V1.5 WAITING TestRun，故不在运行中重启NATS或更改栈。等待该Run结束或维护负责人批准窗口后，方可将新探针修复应用于保留栈并做原Run恢复检查；详见[V1.5 §8.37](../prd/v1-local-simulation/05-scheduling-and-recovery.md#837-保留交互栈waiting运行保护2026-10-10)。


A16/P5：只读确认保留栈的单个WAITING TestRun是normal场景、未完成且有2项断言；在Run终态或维护窗口批准前继续保护栈。详见[V1.5 §8.38](../prd/v1-local-simulation/05-scheduling-and-recovery.md#838-waiting运行详情只读复核2026-10-10)。


A17/P5：在只读确认无运行Temporal Workflow、JetStream pending/ack-pending均0、唯一WAITING normal Run不依赖NATS之后，对保留隔离项目只重建NATS容器并保留JetStream卷。修正探针现已在原栈healthy，durable消息/consumer状态、TestRun、Web/API均复验保持；详见[V1.5 §8.39](../prd/v1-local-simulation/05-scheduling-and-recovery.md#839-保留v15栈应用nats探针修正并复验持久状态2026-10-10)。


A18/P0：A34矩阵及Crosswalk已按V1.5保留栈NATS探针修复更新，S2-L20/S7-L63当前锚点已复核。结构审计PASS（147要求、1657路径/547目标、168精确测试名、147锚点、0错误）；此项只证明映射链条完整，不证明父需求/WAITING断言或验收通过。


正式V1门禁a526（保留栈NATS探针修复、A34追踪与当前摘要同步后复核）：五阶段文档审计PASS，证据审计PASS（1166引用、155份Manifest、294项），V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。V1.2与V1.5四个指定历史TestRun仍缺结构化导出；OD-013/014与旧Run处置、活动/全域恢复、Mac睡眠唤醒、Ubuntu实机和本人验收仍未完成。不得用新Run替代历史记录或自动签署验收。[a526日志](../../evidence/audits/2026-10-10-v1-version-gate-a526.log)，SHA-256 `8b7bfe65d9597abc279dd3f2396e01d4039bd33aac06bdeb2e711c9cd28d4fa5`。


正式门禁a527（a526结果及本次记录同步后）：五阶段文档与证据审计PASS（1168引用、156份Manifest），V1仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。四个历史Run结构化导出以及决策、恢复、Mac/Ubuntu实机和本人验收仍未完成。[a527日志](../../evidence/audits/2026-10-10-v1-version-gate-a527.log)，SHA-256 `12e1369b35d2928f2cb5a5b227b6c6683b98ebb40aae1cc9e8de40a8b8c00a21`。


2026-10-10 P2/V1.2整市场缺失会话子项完成：新增不可变v1.2-market-data-5显式CN/US预期会话日历，Market Data校验文件Hash并返回会话；Platform/Qlib不再从幸存Bars推导时间轴。整市场缺失日单测在拟合前验证历史不足失败关闭；独立Fixture审计覆盖日历Hash、PIT、窗口恢复及无真实交易日历声明。定向Platform单测12/12、contracts/fixtures校验、V1.2隔离Web/API/CLI四Run和完整code suite均PASS。完整套件[2026-10-10-v12-market-session-calendar-code-suite-a02.log](../../evidence/audits/2026-10-10-v12-market-session-calendar-code-suite-a02.log) SHA-256 `fe0ca1ff4359148fd66c5c50ac99d715a69657059520182d49501fff5541f202`；[隔离E2E](../../evidence/audits/2026-10-10-v12-market-session-calendar-web-e2e-a01.log)；[A35差异矩阵](../../evidence/audits/2026-10-10-v1-current-gap-matrix-a35.json)。该子项关闭，P2到P3完整策略交接和真实来源/交易日历仍OPEN。


2026-10-10 P0/V1.2-S2-L18追踪更新：current crosswalk为显式合成市场会话日历与整市场缺日单测补入版本化Fixture、具体断言、a02完整套件和独立E2E；Crosswalk a29 PASS（147要求、1664路径引用/554目标、169精确测试名、147当前锚点，0缺失/不匹配）；差异矩阵A35只更新该受影响行，父项仍PARTIAL，真实交易所日历/P2-P3完整策略交接未关闭。Crosswalk SHA-256 `9eb4d108ea97073171f890fb3167df0fb2411ff138e27ef06625154121721692`；[a29日志](../../evidence/audits/2026-10-10-v1-crosswalk-check-a29.log)，[A35矩阵](../../evidence/audits/2026-10-10-v1-current-gap-matrix-a35.json)SHA-256 `99aa9ca7d1478c554760ebd91b7eec66e5ab08ec68b1f09ccd9d138e8c3e7b86`。


正式V1门禁a528（V1.2 v5显式市场日历及当前树套件证据同步后）：五阶段文档与证据审计PASS（1176引用、157份Manifest），V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。V1.2整市场缺日Fixture子项通过不改变阶段PARTIAL；四个历史Run结构化导出、待决政策/旧Run、活动与全域恢复、Mac/Ubuntu实机和本人验收仍未满足。[a528日志](../../evidence/audits/2026-10-10-v1-version-gate-a528.log)，SHA-256 `ab22a68749369d58c545821576a48cf891374813b7a567c793a4656876250ad3`。


正式V1门禁a529（a528更新入档后）：五阶段文档与证据审计PASS（1180引用、158份Manifest），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`；版本级历史Run、决策、恢复、环境与本人验收要求未满足。[a529日志](../../evidence/audits/2026-10-10-v1-version-gate-a529.log)，SHA-256 `abc4384f86f60e5c27ad4bef04193b09c86ad65713ff0e2db2c0f227970e32b9`。


正式V1门禁a530（修正进度文档相对证据链接后复核）：阶段文档审计及证据审计PASS（1184引用、159份Manifest），V1仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。a530确认本轮V1.2自动证据已被索引；四个历史Run、未决政策/旧Run处置、全版活动与灾备恢复、Mac/Ubuntu实机及本人验收仍未满足。[a530日志](../../evidence/audits/2026-10-10-v1-version-gate-a530.log)，SHA-256 `9ac9b841d8d431714f68b10c2e438b5e6863a7aa94cecf4be4bfc939e799656a`。


2026-10-10 P6文档一致性修复：90-test-plan状态总览曾将V1.1/V1.3手册列为DRAFT，与两个阶段§8.1的已执行Mac隔离操作记录矛盾。已校准为V1.1/V1.2/V1.3 `VERIFIED_EXECUTABLE`（各限其明确隔离范围），V1.4/V1.5 `PARTIALLY_VERIFIED_EXECUTABLE`；没有改变任何阶段实现状态、人验、Ubuntu或版本门禁结论。


正式V1门禁a531（90-test-plan状态总览与当前阶段§8.1实测状态一致性修复后）：五阶段文档/证据审计PASS（1188引用、160份Manifest），版本仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`；本轮仅修复手册状态索引，不改变业务或人工验收。[a531日志](../../evidence/audits/2026-10-10-v1-version-gate-a531.log)，SHA-256 `c751e7b383c53e00b9ba96f72bbb8ed0e173b382857b68b3cdcecc8868451b74`。

2026-10-10 P3文档/追踪校正：按`V1.3-S2-L14`源要求复核现存27/27隔离Web/API/CLI报告与独立资产HTTP+PG smoke，确认a35把固定V1.3 place/query/cancel/fills/account覆盖描述得过宽。单行修订见[当前差异矩阵a36](../../evidence/audits/2026-10-10-v1-current-gap-matrix-a36.json)及[V1.3 §8.68](../prd/v1-local-simulation/03-fake-broker-trading-loop.md#868-v13-fakebroker固定范围契约覆盖复核2026-10-10)。修订只确认V1.3固定场景，未关闭跨版本路由、完整市场/故障范围或阶段验收。

正式V1门禁a532（V1.3固定范围覆盖差异校正后）：`pnpm verify:version -- --version V1` exit 2，五阶段文档审计PASS、证据审计PASS（1195引用、161份Manifest、300项），V1仍`INCOMPLETE`且`uncheckedVersionGate=true`。四个历史TestRun结构化导出、结算/旧Run所有者决策、活动与全域恢复、Ubuntu实机及当前范围人工验收仍未满足。[a532日志](../../evidence/audits/2026-10-10-v1-version-gate-a532.log)、[exit code](../../evidence/audits/2026-10-10-v1-version-gate-a532.exit.txt)、[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a532.log.sha256)。

2026-10-10 P0/A04追踪增量：`baseline:check`首次暴露V1.2验收行更新后crosswalk锚点过期。已将`V1-99-STAGE-V1.2.currentSourceAnchorCandidate`对齐至当前第77行；`crosswalk:check`通过147/147要求、1664路径引用、169精确测试名和147当前锚点。受控完整`pnpm baseline:check` exit 0（66/66脚本测试），日志见[基线复验a02](../../evidence/audits/2026-10-10-v1-baseline-after-crosswalk-anchor-a02.log)、[exit code](../../evidence/audits/2026-10-10-v1-baseline-after-crosswalk-anchor-a02.exit.txt)及[SHA-256](../../evidence/audits/2026-10-10-v1-baseline-after-crosswalk-anchor-a02.log.sha256)。普通沙箱两次因loopback `EPERM`未完成的日志保留；本增量只修复当前文档锚点，不关闭P0整体、活动部署、版本或人验门槛。

正式V1门禁a533（crosswalk与完整基线复验记录同步后）：版本仍`INCOMPLETE`/exit 2，阶段文档审计PASS、证据审计PASS（1195引用、161份Manifest、300项），`uncheckedVersionGate=true`。此前列明的历史Run、所有者决定、活动/全域恢复、Ubuntu与当前范围人工验收仍未满足。[a533日志](../../evidence/audits/2026-10-10-v1-version-gate-a533.log)、[exit code](../../evidence/audits/2026-10-10-v1-version-gate-a533.exit.txt)、[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a533.log.sha256)。

2026-10-10 P1/A04 Platform→Portfolio客户端增量：为生成客户端initialize/get snapshot/reserve/resolve/fill/fee-correction六项生产操作增加直接方法、路径及编码、身份/Bearer、owner和载荷断言；定向客户端测试3/3及typecheck通过，V1.1完整code suite exit 0（Platform 308/308、脚本基线66/66、隔离迁移/HTTP smoke清理通过）。阶段§2/§7/§8.27、V1.1-S2-L14 crosswalk及责任计划已同步；该操作边被测试不等于全部调用方/发布矩阵完成。记录保留V1.1于2026-09-09的历史用户确认范围，明确当前新增范围仍未签署。

正式V1门禁a534（P1/A04客户端合同及历史签署范围澄清后）：V1仍`INCOMPLETE`/exit 2，阶段文档审计PASS、证据审计PASS（1196引用、161份Manifest、300项），`uncheckedVersionGate=true`。四个历史TestRun结构化导出仍缺，另有未决结算/旧Run决定、活动与全域恢复、Ubuntu实机及当前范围人工验收未满足。[a534日志](../../evidence/audits/2026-10-10-v1-version-gate-a534.log)、[exit code](../../evidence/audits/2026-10-10-v1-version-gate-a534.exit.txt)、[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a534.log.sha256)。

正式V1门禁a535（P1进度摘要同步及文档/crosswalk复查后）：版本状态未变，仍`INCOMPLETE`/exit 2；五阶段文档审计PASS，证据审计PASS（1196引用、161份Manifest、300项），`uncheckedVersionGate=true`。历史Run、结算/旧Run决定、活动/全域恢复、Ubuntu和当前范围人验继续未满足。[a535日志](../../evidence/audits/2026-10-10-v1-version-gate-a535.log)、[exit code](../../evidence/audits/2026-10-10-v1-version-gate-a535.exit.txt)、[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a535.log.sha256)。

2026-10-10 P1/A04 Trade→Portfolio补测：Trade Outbox实际使用的Fill手续费更正生成客户端现有逐操作HTTP方法、编码路径、Trade身份/Bearer与载荷断言；Trade客户端定向4/4、typecheck及V1.3完整code suite exit 0（Trade 98/98、Platform 308/308）。V1.1/V1.3 crosswalk加入精确测试和证据；crosswalk:check通过147要求/172测试引用/147锚点，完整baseline:check exit 0（66/66脚本测试）。阶段记录见[V1.3 §8.69](../prd/v1-local-simulation/03-fake-broker-trading-loop.md#869-tradeportfolio费用更正生成客户端合同回归2026-10-10)。仅关闭这一个调用子项，A04父任务与其余调用/发布/活动切换范围仍开放。代码套件[日志](../../evidence/audits/2026-10-10-v13-trade-fee-correction-client-code-suite-a01.log)，基线[日志](../../evidence/audits/2026-10-10-v1-baseline-v13-fee-client-a01.log)。

正式门禁a536首次证据审计FAIL（exit 1）：阶段文档审计PASS；发现本轮基线日志SHA sidecar内路径相对仓库根目录错误。失败原始日志保留于[a536](../../evidence/audits/2026-10-10-v1-version-gate-a536.log)，已修正相关sidecar路径并复跑。

正式V1门禁a537（修正sidecar后）：V1仍`INCOMPLETE`/exit 2，阶段文档与证据审计均PASS（1199引用、162份Manifest、301项），`uncheckedVersionGate=true`。四个历史TestRun结构化导出、结算/旧Run决定、活动与全域恢复、Ubuntu实机及当前范围人工验收仍未满足。[a537日志](../../evidence/audits/2026-10-10-v1-version-gate-a537.log)、[exit code](../../evidence/audits/2026-10-10-v1-version-gate-a537.exit.txt)、[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a537.log.sha256)。

2026-10-10 P1/A04执行增量：补齐Historical Replay→Portfolio Account账户初始化与快照读取客户端直接传输合同测试，定向2/2、typecheck通过；完整V1.4 code suite退出0（Replay Worker 27/27、Trade 98/98、Platform 308/308，隔离HTTP/PostgreSQL与迁移检查通过）。V1.1 §8.28及需求追踪V1.1-S2-L14已回写，crosswalk PASS（147项需求、1668路径引用/559目标、174精确测试引用、147锚点，0缺失/失配）。该项不关闭P1/A04父项或全版本。随后正式门禁a538仍INCOMPLETE/exit 2：五阶段文档审计PASS；证据审计PASS（1200引用/162 Manifest/301条目），`uncheckedVersionGate=true`；四个历史TestRun导出、当前范围人验、OD-014/结算、旧Run处置、全V1配对恢复、Ubuntu与Mac睡眠唤醒等仍开放。[V1.4完整套件日志](../../evidence/audits/2026-10-10-v14-replay-portfolio-client-code-suite-a01.log)，SHA-256 `d671ca9a3c25b27c1714984d6ee307c495fc3e16a31d8adcb288b8eacd9a18fc`；[a538正式门禁](../../evidence/audits/2026-10-10-v1-version-gate-a538.log)，exit 2，SHA见sidecar。

2026-10-10 本轮收尾基线：`pnpm baseline:check`完整退出0；文档链接、crosswalk、schema/Fixture、类型/客户端生成漂移、合同兼容性、8项服务分层和66项基线脚本通过。`pnpm docs:check`检查8420条Markdown链接无失败、5个阶段编号无重复；`pnpm crosswalk:check` PASS（147项、1668路径引用、174精确测试名、147锚点，无缺失/失配）；`git diff --check`通过。后续正式门禁仍需重跑以纳入此记录，版本关闭条件仍未满足。

2026-10-10 最终V1门禁a540：在本轮基线及计划/进度记录回写后复核，V1仍INCOMPLETE/exit 2；五阶段文档审计PASS，证据审计PASS（1200引用/162 Manifest/301条目），`uncheckedVersionGate=true`。四个历史结构化Run导出、OD-014及结算、遗留非终态Run负责人处置、全V1配对恢复、Mac睡眠唤醒、Ubuntu/目标环境和当前范围人工验收仍是关闭前条件。[a540门禁日志](../../evidence/audits/2026-10-10-v1-version-gate-a540.log)，SHA-256见sidecar。

2026-10-10 P1/A04 Platform→Historical Replay执行增量：补齐Platform生产调用方Replay Worker客户端单bar启动、编码路径、bodyless pause/resume/cancel及UNKNOWN恢复直接契约测试；定向4/4、Platform typecheck通过。受控执行完整`pnpm verify:stage -- --stage V1.4 --suite code`退出0，Platform 64文件/310单测、基线66项、隔离迁移、Replay身份HTTP smoke和真实Governance/Trade/Portfolio隔离Harness通过。保存日志及hash sidecar：[V1.4完整套件](../../evidence/audits/2026-10-10-v14-platform-replay-client-contract-code-suite-a01.log)，SHA-256 `baaf8b49e4c854572cf79a843214d2f9cf7b5503c7caec9be92b687cadc3092c`；调用矩阵增量[A07](../../evidence/audits/2026-10-10-v1-cross-service-route-matrix-a07.md)。阶段§8.29与V1.1-S2-L14交叉追踪同步。该操作合同测试不关闭完整V1调用/发布矩阵或P1/A04；门禁仍需复核，其他历史、决定、恢复、目标环境及人工验收项继续OPEN/NOT_RUN。

正式门禁a542在本轮回写后复核仍为INCOMPLETE/exit 2；五阶段文档审计PASS、证据审计PASS（1201引用/162 Manifest/301条目），四个历史TestRun导出、所有者决定、完整恢复与环境及当前范围人验仍未闭合。[a542日志](../../evidence/audits/2026-10-10-v1-version-gate-a542.log)，exit 2，SHA见sidecar。

2026-10-10 P1/A04 Platform→Decision Governance Proposal客户端增量：直接测试覆盖Proposal create/read/approve/reject/revise客户端合同，定向4/4、Platform typecheck通过；V1.3完整代码套件exit 0，Platform 314/314、Governance 41/41、Trade 98/98、Replay 27/27及隔离迁移/HTTP检查通过。记录见[V1.3 §8.70](../prd/v1-local-simulation/03-fake-broker-trading-loop.md#870-platformdecision-governance-proposal客户端操作合同回归2026-10-10)、[矩阵A08](../../evidence/audits/2026-10-10-v1-cross-service-route-matrix-a08.md)及[完整日志](../../evidence/audits/2026-10-10-v13-platform-proposal-client-contract-code-suite-a01.log)，SHA-256 `8841de539509450d9b8d1b254a5038db610d44de219308df838d374ba2c7d955`。Crosswalk加入4条精确调用测试。仅关闭该生成客户端合同子项；完整V1路径/负向副作用/发布矩阵与P1/A04仍OPEN。

正式门禁a544在本轮Proposal操作合同与文档索引回写后复核：V1仍INCOMPLETE/exit 2；阶段文档/证据审计PASS（1202引用、162 Manifest、301条目），`uncheckedVersionGate=true`。历史Run导出、未决所有者决定、完整恢复、环境证据和用户人验仍未满足。[a544门禁日志](../../evidence/audits/2026-10-10-v1-version-gate-a544.log)，exit 2，SHA见sidecar。

2026-10-10 P1/A04 Platform→Trade执行调用逐操作增量：新增9项直接合同测试覆盖MANUAL、顺序MANUAL、AUTO、顺序Fill、撤单/撤单结果、订单查询、独立资产读取、Fill费用更正；定向9/9、Platform typecheck通过。完整V1.3 code suite退出0，Platform 323/323、Trade 98/98、仓库基线66/66，隔离迁移/HTTP smoke通过且临时资源清理。阶段证据§8.71、调用矩阵[A09](../../evidence/audits/2026-10-10-v1-cross-service-route-matrix-a09.md)、[套件日志](../../evidence/audits/2026-10-10-v13-platform-manual-trade-client-contract-code-suite-a01.log)，SHA-256 `f2fe73363162739c83504a963a787eb9e158513e0f2913cabd03c988bd36b386`。Crosswalk加9项精确测试及证据引用。本增量只关闭Platform→Trade客户端传输合同，不关闭P1/A04完整调用/发布矩阵或V1收尾条件。

正式V1门禁a546在本轮Platform→Trade合同测试和记录同步后仍为INCOMPLETE/exit 2；五阶段文档与证据审计PASS（1203引用/162 Manifest/301条目），`uncheckedVersionGate=true`。缺失的历史导出、未决决定、全V1恢复、目标环境和当前范围人工验收仍阻止收尾。[a546日志](../../evidence/audits/2026-10-10-v1-version-gate-a546.log)，SHA见sidecar。

2026-10-10 P1/A04 Platform→Quant V1.4客户端合同增量：直接验证生成客户端完整日线回测请求和拒绝响应（路由、身份/Bearer、content type、scenario/seed/policy、超时、422及response body）；定向6/6、Platform typecheck通过。当前完整V1.4 code suite exit 0，Platform 323/323、基线66/66及隔离迁移/业务Harness/Artifact fencing通过。阶段见§8.72，矩阵[A10](../../evidence/audits/2026-10-10-v1-cross-service-route-matrix-a10.md)，日志[见此](../../evidence/audits/2026-10-10-v14-platform-quant-client-contract-code-suite-a01.log)，SHA-256 `dcb20a8af6c2b57d25a6eb920f1887869c59217d59cc0cbd1270c5a384107b49`。Crosswalk新增精确测试及套件证据。只关闭该客户端传输合同，不替代V1.4业务规则/结算和V1整体关闭条件。

正式门禁a548在本轮V1.4 Quant客户端合同增量及文档同步后复核仍为INCOMPLETE/exit 2；阶段文档审计和证据审计PASS（1204引用/162 Manifest/301条目），`uncheckedVersionGate=true`。完整V1规则结算、历史导出、未决决定、全域恢复、目标环境与当前范围人验仍未闭合。[a548日志](../../evidence/audits/2026-10-10-v1-version-gate-a548.log)，SHA见sidecar。

2026-10-10 P1/A04 AUTO Mandate调用覆盖追踪：当前Platform生成客户端逐项映射create/read/readBudget/activate/pause及invalid-version拒绝，Trade客户端映射authorizeOrder/settleReservation；身份、owner/actor scope、body、路径编码、timeout的已有直接测试定向2/2、1/1通过。完整当前树V1.3 code suite exit 0（Platform 323/323、Trade 98/98、隔离迁移/HTTP smoke及全局基线通过、随机资源清理）。证据见[V1.3 §8.72](../prd/v1-local-simulation/03-fake-broker-trading-loop.md#872-platformtradegovernance-auto-mandate客户端操作合同2026-10-10)、[矩阵A11](../../evidence/audits/2026-10-10-v1-cross-service-route-matrix-a11.md)、[完整日志](../../evidence/audits/2026-10-10-v13-auto-mandate-client-contract-code-suite-a01.log)，SHA-256 `5d348e95e2788a9f3cbd8db1968fab5c6e795950762be33d85f0718025b1a224`。Crosswalk已补3条精确测试。只补齐两条消费者操作映射，不关闭完整业务/发布矩阵与P1/A04。

正式V1门禁a550在AUTO Mandate调用映射同步后复核仍为INCOMPLETE/exit 2；阶段文档/证据审计PASS（1205引用/162 Manifest/301条目），`uncheckedVersionGate=true`。历史TestRun导出、所有者决定、完整V1恢复、目标环境与当前范围人工验收仍阻止关闭。[a550日志](../../evidence/audits/2026-10-10-v1-version-gate-a550.log)，SHA见sidecar。

2026-10-10 P1/A04 Platform→Quant Qlib V1.2客户端超时合同：直接验证fit route、Platform身份/Bearer、确定性Fixture JSON、默认120000ms超时及拒绝状态/响应体；定向2/2、typecheck通过。当前完整V1.2 code suite exit 0，Platform 323/323、基线66/66、真实Qlib、隔离迁移/身份与四个same-Run Web/API/CLI场景通过并确认清理。证据见[V1.2 §8.42](../prd/v1-local-simulation/02-small-data-and-qlib.md#842-platformquant-qlib客户端长任务超时合同复验2026-10-10)、[矩阵A12](../../evidence/audits/2026-10-10-v1-cross-service-route-matrix-a12.md)和[完整日志](../../evidence/audits/2026-10-10-v12-qlib-client-timeout-code-suite-a01.log)，SHA-256 `00d3ecd56c582ced01bf184299be18b71593f648f8fb7942b096a9236d2ea074`。单次重启窗口ECONNREFUSED已记录，后续same-run恢复成功。此项不关闭模型效力、OD-007、Ubuntu/当前人验或P1整体。

正式V1门禁a552在V1.2 Qlib客户端超时合同与相关追踪回写后复核仍为INCOMPLETE/exit 2；阶段文档/证据审计PASS（1206引用/162 Manifest/301条目）。OD-014具体结算口径提案已等待所有者确认；四个历史Run导出、其它未决决定/旧Run处置、全V1配对恢复、目标环境与当前范围人验仍未满足。[a552日志](../../evidence/audits/2026-10-10-v1-version-gate-a552.log)，exit 2，SHA见sidecar。

2026-10-10 P1/A04 Platform→Quant V1.2预览客户端合同：三条固定只读路由的Platform身份、无body、默认5秒AbortSignal及Quant错误保留均直接断言；定向2/2、Platform typecheck通过。完整V1.2代码套件exit 0，真实Qlib CPU、隔离服务与四Run Web/API/CLI恢复工作流通过，随机栈清理验证。阶段§8.43、调用矩阵[A13](../../evidence/audits/2026-10-10-v1-cross-service-route-matrix-a13.md)及crosswalk更新；保存日志[见此](../../evidence/audits/2026-10-10-v12-preview-read-contract-code-suite-a01.log)，SHA见sidecar。该增量不关闭完整跨服务发布矩阵、OD-014或V1版本门禁。

正式门禁a554在预览客户端证据同步后复核，仍INCOMPLETE/exit 2；文档审计PASS，证据审计PASS（1208引用/163 Manifest/302条目），`uncheckedVersionGate=true`。四个历史TestRun结构化导出、OD-013/014与旧非终态Run处置、V1全域配对恢复、Mac睡眠唤醒、目标Ubuntu和新增范围本人验收继续阻塞完成。[a554日志](../../evidence/audits/2026-10-10-v1-version-gate-a554.log)，exit 2，SHA见sidecar。

2026-10-10 P2/A06 Platform→Market Data V1.2研究Fixture读取合同增量：直接验证research-preview GET路径、Platform身份、无body及5000ms上限；定向3/3、Platform typecheck通过。完整V1.2 code suite exit 0，Platform 324/324，隔离Market Data/PostgreSQL、Qlib CPU及四Run Web/API/CLI同Run验证通过并完成精确清理。阶段§8.44、调用矩阵[A14](../../evidence/audits/2026-10-10-v1-cross-service-route-matrix-a14.md)与crosswalk更新，日志[见此](../../evidence/audits/2026-10-10-v12-market-research-preview-contract-code-suite-a01.log)。该增量只关闭P2研究Fixture消费者传输合同子项。

正式门禁a556在V1.2 research-preview客户端及计划记录同步后复核：V1仍INCOMPLETE/exit 2，文档和证据审计PASS（1209引用/163 Manifest/302条目）。历史TestRun结构化导出、未决决定/旧Run处置、完整恢复、目标环境与人工验收未关闭。[a556门禁日志](../../evidence/audits/2026-10-10-v1-version-gate-a556.log)，exit 2，SHA见sidecar。

2026-10-10 P1/A04-P3增量：Decision Governance现行21个准入路由均新增身份/方法策略枚举断言，覆盖Platform/Trade/Replay三身份、拒绝交叉调用、错误HTTP方法及未知路径。定向7/7、typecheck通过，完整V1.3 code suite exit 0，Governance 42/42、Platform 324/324、Trade 98/98；隔离HTTP/PostgreSQL smoke和资源清理通过。V1.3 §8.73、调用矩阵[A15](../../evidence/audits/2026-10-10-v1-cross-service-route-matrix-a15.md)、V1.1-S2-L14 crosswalk已同步。[完整日志](../../evidence/audits/2026-10-10-v13-governance-route-scope-matrix-code-suite-a01.log)。这项服务身份策略覆盖不代替HTTP业务副作用和模式矩阵，不改变P1/P3父状态。

正式V1门禁a557在V1.2双市场研究Fixture消费者合同、阶段§8.44/A14与crosswalk同步后仍INCOMPLETE/exit 2；文档及证据审计PASS（1209引用/163 Manifest/302条目）。历史证据、未决决定/旧Run、全域恢复、环境与人验未满足。[a557日志](../../evidence/audits/2026-10-10-v1-version-gate-a557.log)，SHA见sidecar。

2026-10-10 P1/A04–P3增量深化：Governance现行21条准入路径在真实隔离HTTP+PG上执行83个拒绝探测，覆盖错误服务身份、方法及Bearer；畸形POST早于解析返回403，10张Proposal/授权/Mandate/预算/策略快照表事实计数不变。完整V1.3代码套件exit 0、Governance 42/42、Platform 324/324、Trade 98/98；真实Governance/Replay/Quant身份 smoke、隔离迁移、资源清理通过。详情见[V1.3 §8.73](../prd/v1-local-simulation/03-fake-broker-trading-loop.md#873-decision-governance完整准入路由身份策略枚举2026-10-10)、[矩阵A15](../../evidence/audits/2026-10-10-v1-cross-service-route-matrix-a15.md)、[套件日志](../../evidence/audits/2026-10-10-v13-governance-route-scope-http-code-suite-a01.log)。合法业务模式拒绝、全服务写路由和业务端到端仍开放。
2026-10-10执行增量：按V1.3服务身份安全范围修复Decision Governance缺失Platform API Bearer时仍可启动的问题；三份调用身份token现在启动必需、强度不低于32字符且互异，Compose缺项失败关闭。定向测试8/8、typecheck、Compose config、完整V1.3 code suite与全仓baseline均通过；证据见V1.3 §8.74及`evidence/audits/2026-10-10-v13-governance-platform-token-required-code-suite-a01.log`。该项不替代活动部署或人验，V1总门禁仍需复核。

正式门禁a560：阶段文档审计与证据审计PASS（1211引用、163份Manifest、302项），V1仍INCOMPLETE/exit 2。4个指定历史TestRun缺结构化导出；决策/旧Run责任处置、全域配对恢复、Mac睡眠唤醒、Ubuntu目标环境和当前范围人验仍开放。[a560日志](../../evidence/audits/2026-10-10-v1-version-gate-a560.log)，SHA-256 `316716d2ff1f4057d69cd66015ab7de0cb5b97f4bf9c78f77c20bbce4c81c3a2`。

正式复核a561（进度同步后）：五阶段结构审计PASS、证据审计PASS（1213/164/303），V1仍INCOMPLETE/exit 2；四个历史结构化Run导出、决定与旧Run处置、全域恢复、目标环境及当前范围用户验收仍为未满足条件。[a561日志](../../evidence/audits/2026-10-10-v1-version-gate-a561.log)，SHA-256 `c281eafb135db1ea7391bd150769cff543a7bba2402c706fe3077a2ca2b87692`。

正式门禁a562：A16治理配置身份矩阵及Compose空token拒绝证据纳入后，五阶段结构/证据审计PASS（1217/165/304），V1仍INCOMPLETE/exit 2；历史结构化Run导出、所有者决定、非终态旧Run、恢复、目标环境与人验仍待处理。[a562日志](../../evidence/audits/2026-10-10-v1-version-gate-a562.log)，SHA-256 `83f0eb23a5266fafb9f3f0f8ca7c850828fe4d68e6578364e705e21774343248`。

2026-10-10 P1/A04最小共享身份修复：Portfolio Risk拒绝Platform/Trade/Replay caller身份复用Bearer；V1.1与V1.3完整代码套件、服务身份定向测试、typecheck及Compose正负配置均通过。阶段证据见V1.1 §8.30、V1.3 §8.75和[矩阵A17](../../evidence/audits/2026-10-10-v1-cross-service-route-matrix-a17.md)。活动服务未变更；该项不关闭A04/P1父项。

Portfolio调用身份修复后的全仓基线exit 0（链接8579项、Crosswalk 147条/201精确测试、脚本66/66、合同/Fixture检查通过）；[基线日志](../../evidence/audits/2026-10-10-v1-portfolio-identities-baseline-a01.log)，SHA-256 `eb2137082fff58e110c15ac873e1241a2649079b153abe8018788dcada1ae45b`。该基线不替代V1版本门禁与剩余P0/P1交付。

正式门禁a563（代码、阶段和Crosswalk同步后）：V1仍INCOMPLETE/exit 2；五阶段文档和证据审计PASS（1220/165/304）。历史结构化Run导出、所有者决定/旧Run处置、全域恢复、Mac/Ubuntu目标环境及当前范围人工验收仍未完成。[a563日志](../../evidence/audits/2026-10-10-v1-version-gate-a563.log)，SHA-256 `4df5beac420dc14fe48d764034d072f2d5af03a235cc3440541717bca804b26f`。

正式门禁a564（本轮新增实现、阶段证据和映射同步后）：文档/证据审计PASS（1222/166/305），V1仍INCOMPLETE/exit 2。外部历史运行证据、所有者政策/旧Run决定、剩余全域恢复和目标环境/人工验收仍是必要前置。[a564日志](../../evidence/audits/2026-10-10-v1-version-gate-a564.log)，SHA-256 `afe9393b8a42fbc55e7ccf857739d4bb6ffe9a2da98546ef3e99be619bc5fad0`。

2026-10-10 Portfolio Risk路由授权矩阵增量：新增7路由×4身份共28次真实HTTP拒绝探测，401/403符合预期且六类业务事实计数保持0；策略单测及V1.1/V1.3完整代码套件exit 0。阶段证据见V1.1 §8.31、V1.3 §8.76与[矩阵A18](../../evidence/audits/2026-10-10-v1-cross-service-route-matrix-a18.md)。此项不关闭V1全域授权/部署/人验。

正式V1门禁a565：五阶段文档审计PASS、证据审计PASS（1224/166/305），版本仍INCOMPLETE/exit 2。缺失的历史TestRun结构化导出、待所有者决策/旧Run处置、全域故障恢复、Mac/Ubuntu目标环境证明和当前范围人工验收仍需完成；不可将实现或自动测试通过视为版本结项。[a565门禁](../../evidence/audits/2026-10-10-v1-version-gate-a565.log)，SHA见sidecar。

正式V1门禁a566（阶段任务勾选、A18证据与baseline同步后）：五阶段文档审计PASS、证据审计PASS（1224/166/305），但版本仍INCOMPLETE/exit 2。历史TestRun导出、OD-013/014与旧Run处置、完整恢复、宿主睡眠唤醒、目标Ubuntu及当前范围本人验收是未满足门禁项。A18后全仓baseline 66/66通过。见[a566](../../evidence/audits/2026-10-10-v1-version-gate-a566.log)与[baseline](../../evidence/audits/2026-10-10-v1-portfolio-route-matrix-baseline-a02.log)。

当前工作树复核a568：修正a567暴露的本轮SHA sidecar格式后，阶段文档审计PASS、证据审计PASS（1226/167/306）；正式V1门禁仍exit 2/INCOMPLETE。历史四Run导出、所有者决定及旧Run处置、全域恢复、宿主/Ubuntu验证及本人验收仍为必需条件。a567证据格式失败保留为历史记录。

正式门禁a569：阶段审计PASS、证据审计PASS（1228/168/307），V1仍INCOMPLETE/exit 2。不得将当前baseline或A18拒绝矩阵视为版本收尾；历史导出、所有者决策/旧Run处置、全域恢复、主机/Ubuntu验证及当前范围本人验收尚未完成。详见[a569](../../evidence/audits/2026-10-10-v1-version-gate-a569.log)。

2026-10-10 P4/A08增量：修复V1.4 Historical FakeBroker终态`REJECTED`/`EXPIRED`且无Fill时遗留Portfolio Reservation的问题；订单与Reservation Resolution Outbox同事务持久化，后端按唯一Order ID拒绝证据释放。真实三服务隔离HTTP/PG通过零成交量拒绝、重复命令同单重放、Reservation仅释放一次、Portfolio现金/账本及FakeBroker成交/资产事实无副作用。完整V1.4 code suite exit 0，baseline 66/66，crosswalk 147条/1691引用/588目标/201精确测试/147锚点PASS。证据见[阶段§8.73](../prd/v1-local-simulation/04-daily-backtest.md#873-v14历史fakebroker终态拒绝释放资源预留2026-10-10)、[套件](../../evidence/audits/2026-10-10-v14-zero-volume-reservation-release-code-suite-a02.log)、[Crosswalk A19](../../evidence/audits/2026-10-10-v1-crosswalk-current-a19.json)。该原子项不关闭OD-014、结算/全规则一致性或P4父项。

正式门禁a570：V1.4终态无Fill拒绝释放原资源预留的代码/HTTP隔离验证完成；五阶段文档与证据审计PASS（1231/168/307），V1门禁仍INCOMPLETE/exit 2。历史导出、所有者决定/旧Run处置、全域恢复、主机/Ubuntu实测与人工验收仍未满足。[a570日志](../../evidence/audits/2026-10-10-v1-version-gate-a570.log)。

正式V1门禁a571：V1.4固定终态拒绝释放子项及架构/需求/验收文档同步后，五阶段文档与证据审计PASS（1234/169/308）；版本仍INCOMPLETE/exit 2。四个历史TestRun导出、所有者决定与旧Run处置、全域恢复、Mac/Ubuntu目标环境和当前范围本人验收仍未满足。[a571日志](../../evidence/audits/2026-10-10-v1-version-gate-a571.log)。全仓基线66/66通过。


2026-10-10执行增量（V1.4/P4）：修复Historical FakeBroker在无Fill终态订单未释放Portfolio Reservation的问题，并将HTTP/隔离PostgreSQL固定验证扩展至ZERO_VOLUME拒绝和不可成交LIMIT过期。完整V1.4 code suite a04 exit 0；测试包含Outbox原子性、Reservation只释放原订单、无成交/账本/资产副作用、现金不变及命令幂等。证据见[阶段§8.73](../prd/v1-local-simulation/04-daily-backtest.md#873-v14历史fakebroker终态拒绝释放资源预留2026-10-10)及[a04日志](../../evidence/audits/2026-10-10-v14-terminal-reservation-release-code-suite-a04.log)，SHA sidecar随日志保存。仅关闭该固定原子子项，OD-014、完整结算/规则、其余P4交付及版本门禁仍开放。

正式V1门禁a572（V1.4拒绝与过期两种终态预留释放验证、Crosswalk A20及当前全仓基线后）：五阶段文档审计PASS，证据审计PASS（1238引用、170份Manifest、309项）；版本仍INCOMPLETE/exit 2。四个历史TestRun结构化导出缺失；决策/旧Run处置、全域恢复、Mac睡眠唤醒、Ubuntu目标环境和当前范围本人验收仍未满足。[a572日志](../../evidence/audits/2026-10-10-v1-version-gate-a572.log)，[exit](../../evidence/audits/2026-10-10-v1-version-gate-a572.exit.txt)，[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a572.log.sha256)。Crosswalk A20和baseline分别见[映射审计](../../evidence/audits/2026-10-10-v1-crosswalk-current-a20.json)及[66/66基线](../../evidence/audits/2026-10-10-v1-terminal-reservation-baseline-a02.log)。

正式V1门禁a573（计划/进度与a572结果同步后）：五阶段文档审计PASS、证据审计PASS（1239引用、170份Manifest、309项）；V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。版本阻塞仍为4个历史TestRun结构化导出缺失，以及所有者决策/旧Run处置、全域恢复、Mac睡眠唤醒、Ubuntu目标环境和当前范围本人验收。[a573日志](../../evidence/audits/2026-10-10-v1-version-gate-a573.log)，[exit](../../evidence/audits/2026-10-10-v1-version-gate-a573.exit.txt)，[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a573.log.sha256)。当前全仓baseline 66/66通过，见[日志](../../evidence/audits/2026-10-10-v1-terminal-reservation-baseline-a04.log)。

正式V1门禁a574（同步a573及最新计划/进度记录后）：五阶段文档审计PASS、证据审计PASS（1240引用、170份Manifest、309项）；V1仍INCOMPLETE/exit 2。四份历史TestRun结构化导出及旧Run处置/决策、全域恢复、Mac睡眠唤醒、Ubuntu实机和当前范围本人验收均未满足。[a574日志](../../evidence/audits/2026-10-10-v1-version-gate-a574.log)，[exit](../../evidence/audits/2026-10-10-v1-version-gate-a574.exit.txt)，[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a574.log.sha256)。

2026-10-10 P1/A04 Quant→Qlib Worker调用映射增量：补录V1.2 `probeQlibWorker`与`fitQlibFixtureInWorker`实际生产调用、专属Bearer/120秒拟合超时及V2.3摘要train/validate边界；交叉索引为V1.1-S2-L14增加准确客户端测试与运行证据（crosswalk 147项、1699路径引用/596目标、209个精确测试名、147个锚点通过）。完整V1.2 code suite重新受控运行exit 0：脚本66/66、Qlib Worker 14/14、Quant Research 101项、真实Qlib 0.9.6容器、四场景Web/API/CLI same-TestRun与恢复通过，临时资源清理通过；E2E间出现代理socket hang up日志但最终套件PASS。详情见[阶段§8.32](../prd/v1-local-simulation/01-environment-and-web-center.md#832-quant-researchqlib-worker生成客户端v1调用边界2026-10-10)、[矩阵A19](../../evidence/audits/2026-10-10-v1-cross-service-route-matrix-a19.md)及[完整日志](../../evidence/audits/2026-10-10-v12-qlib-worker-client-inventory-code-suite-a01.log)。该增量只完成一条调用边盘点与隔离回归，不关闭P1/A04或V1整体。

2026-10-10 P1/A04 Platform→Governance V1.2策略快照生成客户端：OpenAPI生成器及漂移检查现纳入全局合同命令，生产适配器委托生成客户端；新增直接合同测试2/2、Platform typecheck与`contracts:check`通过。完整V1.2 code suite受控执行exit 0，baseline 66/66、Platform 67文件/326测试、Market Data集成28/28、真实Qlib容器与4个Web/API/CLI同TestRun及重启恢复通过，隔离资源清理完成。受限沙箱初跑的loopback EPERM及受控E2E一次代理socket hang up均在证据中保留，受控完整套件最终PASS。详见[V1.2阶段§8.45](../prd/v1-local-simulation/02-small-data-and-qlib.md#845-platformgovernance-v12策略快照生成客户端合同2026-10-10)、[矩阵A21](../../evidence/audits/2026-10-10-v1-cross-service-route-matrix-a20.md)、[运行日志](../../evidence/audits/2026-10-10-v12-governance-snapshot-generated-client-code-suite-a02.log)。P1/A04与V1整体仍OPEN。

正式复核a588（A21、V1.2阶段§8.45及crosswalk同步后）：五阶段文档审计PASS，证据审计PASS（1268引用、174份Manifest、313项），V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。四个历史TestRun结构化导出缺失、OD-013/014与旧Run处置、活动/全域恢复、Mac睡眠唤醒、Ubuntu实机及当前范围人工验收仍未满足。[a588门禁日志](../../evidence/audits/2026-10-10-v1-version-gate-a588.log)、[exit](../../evidence/audits/2026-10-10-v1-version-gate-a588.exit.txt)、[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a588.log.sha256)。

正式复核a589（a588门禁结果及当前状态同步后）：五阶段文档审计PASS，证据审计PASS（1268引用、174份Manifest、313项）；整体V1仍INCOMPLETE/exit 2且`uncheckedVersionGate=true`。未满足项保持：4个历史TestRun结构化导出，OD-013/014和旧Run处置，活动/全域恢复，Mac睡眠唤醒，Ubuntu实机与当前范围人工验收。[a589门禁](../../evidence/audits/2026-10-10-v1-version-gate-a589.log)、[exit](../../evidence/audits/2026-10-10-v1-version-gate-a589.exit.txt)、[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a589.log.sha256)。

A06矩阵主表已同步纳入Platform→Governance `receiveV12StrategySnapshot`生成客户端边；增量测试与套件证据见A21。正式门禁a590复核：五阶段文档/证据审计PASS（1268引用、174份Manifest、313项），V1仍INCOMPLETE/exit 2；缺失历史导出、未决业务决定、活动/宿主恢复、Ubuntu及本人验收继续阻塞。[a590](../../evidence/audits/2026-10-10-v1-version-gate-a590.log)、[exit](../../evidence/audits/2026-10-10-v1-version-gate-a590.exit.txt)、[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a590.log.sha256)。

正式复核a591（A06矩阵与a590状态记录同步后）：五阶段文档审计PASS、证据审计PASS（1268引用、174份Manifest、313项）；V1仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`。剩余必须条件仍包括4个历史TestRun结构化导出、OD-013/014及旧Run处置、活动/全域恢复、Mac睡眠唤醒、Ubuntu真实主机和本轮人工验收。[a591门禁](../../evidence/audits/2026-10-10-v1-version-gate-a591.log)、[exit](../../evidence/audits/2026-10-10-v1-version-gate-a591.exit.txt)、[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a591.log.sha256)。

2026-10-10 P0/A04矩阵一致性补录：交叉检查V1.2生产注入点、Market Data生成客户端和§8.44直接测试后，将`getV12ResearchFixturePreview`补入A06主表，与详细操作表对齐。该路由已有完整V1.2 suite与直接请求合同证据；此次修正是矩阵完整性，不新增业务能力，也不关闭P0/P1父项。`docs:check` 8803条链接、`crosswalk:check` 147条需求/1707引用/207精确测试均通过。

正式复核a592（A06 V1.2 Fixture摘要补录后）：五阶段文档审计PASS、证据审计PASS（1268引用、174份Manifest、313项）；V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。历史导出、OD-013/014及旧Run处置、活动/全域恢复、Mac睡眠唤醒、Ubuntu实机和当前范围人工验收仍未满足。[a592日志](../../evidence/audits/2026-10-10-v1-version-gate-a592.log)、[exit](../../evidence/audits/2026-10-10-v1-version-gate-a592.exit.txt)、[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a592.log.sha256)。

2026-10-10 P0/P1/A04调用范围校准A22：复核V1.4/V2.3生产控制器后，确认V1.4正式API只调用Quant日线回测；Platform GeneratedHistoricalReplayClient多Bar启动/查询/控制实际由`stageId=V2.3`的控制器调用，single-bar start与recover helper无生产调用点。V1.4阶段明确要求的Replay Worker→Trade/Portfolio/Governance服务级HTTP/PG边及其测试保留为V1.4证据，但不据此声称正式V1.4 Web已接入Replay Worker。A06、V1.4 §8.76及crosswalk已校准；Crosswalk 147项需求、1708引用/604目标、205精确测试/147锚点均通过。A22见[范围审计](../../evidence/audits/2026-10-10-v1-replay-client-stage-scope-a22.md)。该范围澄清不关闭P0/P1/P3或版本验收。

正式V1复核a593（A22调用范围校准、主矩阵及crosswalk同步后）：五阶段文档审计PASS，证据审计PASS（1269引用、174份Manifest、313项）；V1仍INCOMPLETE/exit 2且`uncheckedVersionGate=true`。四个历史TestRun结构化导出、OD-013/014与旧Run处置、活动数据恢复、Mac睡眠唤醒、Ubuntu实机及本轮人工验收仍未完成。[a593日志](../../evidence/audits/2026-10-10-v1-version-gate-a593.log)、[exit](../../evidence/audits/2026-10-10-v1-version-gate-a593.exit.txt)、[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a593.log.sha256)。

2026-10-10 V1.2策略快照客户端直接合同测试加固：将原类型断言的两字段测试输入替换为schema完整必填字段、满足格式/枚举约束的`V12StrategySnapshotCommand`（无type cast），JSON序列化仍逐字节匹配该命令。定向客户端2/2、Platform typecheck与全局`contracts:check`通过，30个客户端生成器检查均已登记。[阶段§8.45](../prd/v1-local-simulation/02-small-data-and-qlib.md#845-platformgovernance-v12策略快照生成客户端合同2026-10-10)，[命令日志](../../evidence/audits/2026-10-10-v12-snapshot-valid-command-tests-a01.log)、[SHA-256](../../evidence/audits/2026-10-10-v12-snapshot-valid-command-tests-a01.log.sha256)。本项只加强传输测试输入真实性，不改变V1.2应用行为或整体验收状态。

正式V1复核a594（A22范围校准及V1.2完整命令直接测试证据同步后）：五阶段文档审计PASS，证据审计PASS（1270引用、174份Manifest、313项）；整体V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。历史TestRun导出、OD-013/014及旧Run处置、活动/宿主恢复、Mac睡眠唤醒、Ubuntu实机与当前范围人工验收继续未满足。[a594日志](../../evidence/audits/2026-10-10-v1-version-gate-a594.log)、[exit](../../evidence/audits/2026-10-10-v1-version-gate-a594.exit.txt)、[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a594.log.sha256)。

2026-10-10 P5当前树配对备份隔离复验：`pnpm test:backup:cluster-isolated` exit 0；当前生产备份/恢复工具恢复全部10个服务数据库/角色、合成跨库TestRun—FakeBroker订单/Fill/Outbox—Portfolio账本/持仓关联及内容Hash匹配的Artifact字节。随机临时项目资源清理通过，活动项目/卷触碰0。环境、源码Hash和逐项恢复结果见[V1.5 §8.40](../prd/v1-local-simulation/05-scheduling-and-recovery.md#840-当前树全服务数据库与artifact卷配对备份隔离复验2026-10-10)及[机器报告](../../evidence/audits/2026-10-10-v1-isolated-cluster-paired-backup-684635a15dda4aea.json)。此项提升合成配对恢复证据；不证明各V1真实服务生成状态、Qlib/Quant报告配对、NATS/Temporal同点、活动/宿主/异地恢复、Ubuntu或RPO/RTO，P5/V1保持OPEN。

正式V1门禁a596（当前树全服务数据库/Artifact卷隔离恢复证据、V1.5 §8.40、测试计划、验收表及crosswalk同步后）：五阶段文档审计PASS、证据审计PASS（1272引用、174份Manifest、313项）；V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。历史TestRun结构化导出，OD-013/014及旧Run决策，实际V1业务产物/同点NATS-Temporal/宿主恢复，Mac睡眠唤醒，Ubuntu实机和本轮人工验收仍待满足。[a596日志](../../evidence/audits/2026-10-10-v1-version-gate-a596.log)、[exit](../../evidence/audits/2026-10-10-v1-version-gate-a596.exit.txt)、[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a596.log.sha256)。

正式V1门禁a598（SHA sidecar格式修正及本地历史TestRun API只读复核纳入后）：五阶段文档审计PASS，证据审计PASS（1276引用、175份Manifest、314项）；整体V1仍INCOMPLETE/exit 2且`uncheckedVersionGate=true`。保留a597 sidecar格式导致的证据审计失败历史；a598已复验通过。历史结构化导出、OD-013/014/旧Run决策、真实V1业务事实与活动/同点恢复、Mac睡眠唤醒、Ubuntu和本人验收仍开放。[a598](../../evidence/audits/2026-10-10-v1-version-gate-a598.log)、[exit](../../evidence/audits/2026-10-10-v1-version-gate-a598.exit.txt)、[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a598.log.sha256)。

2026-10-10 P5隔离恢复覆盖增量：扩展配对备份Harness，使合成V1.2 `acceptance_stage_runs`与Platform `qlib_fixture_artifacts` PUBLISHED记录同共享Artifact卷内容寻址字节一起备份/恢复；当前运行校验Research和Qlib两类ArtifactRef共2项均与恢复字节SHA匹配，并同时保留跨库V1.3订单/Fill/Outbox/Portfolio关系断言，资源清理通过。[V1.5 §8.41](../prd/v1-local-simulation/05-scheduling-and-recovery.md#841-v12-qlib-artifactref与共享字节卷配对恢复2026-10-10)，[机器报告](../../evidence/audits/2026-10-10-v1-isolated-cluster-paired-backup-a15c94ce9cc0449b.json)。Harness合成写入，不代表真实Qlib Run/旧JSONB/V1.4 Quant Manifest、同点NATS/Temporal、活动宿主/异地/Ubuntu/RPO-RTO恢复；P5仍OPEN。

正式V1门禁a599（加入V1.2 Qlib ArtifactRef/Artifact卷隔离恢复切片后）：阶段文档审计PASS，证据审计PASS（1281引用、176份Manifest、315项）；V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。新切片仅验证合成Qlib引用/内容字节与现有合成交易事实恢复，不关闭实际V1业务、NATS/Temporal同点、活动/宿主/Ubuntu恢复、决策、历史Run或本人验收。[a599日志](../../evidence/audits/2026-10-10-v1-version-gate-a599.log)、[exit](../../evidence/audits/2026-10-10-v1-version-gate-a599.exit.txt)、[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a599.log.sha256)。

2026-10-10 P5 V1.4配对恢复增量：隔离备份Harness新增合成Quant `research_backtest_runs`/`research_backtest_manifests`与Platform V1.4 TestRun报告投影/ArtifactRef的配对校验；独立恢复后Run/Manifest关系、规范化内容Hash、owner/状态/Run ID和报告Hash匹配，V1.2 Qlib/Research ArtifactRef字节及V1.3跨库交易事实同时通过，10库/角色恢复、精确清理通过，活动项目/卷触碰0。[V1.5 §8.42](../prd/v1-local-simulation/05-scheduling-and-recovery.md#842-v14-quant回测结果manifest与platform-testrun报告配对恢复2026-10-10)，[机器报告](../../evidence/audits/2026-10-10-v1-isolated-cluster-paired-backup-765778dbb0e74e55.json)。所有新增业务记录均由Harness直接构造，不代表真实Quant/Platform流程、同点NATS/Temporal、活动/主机恢复或RPO/RTO。

正式V1门禁a602（V1.4合成Quant/Platform报告配对恢复及文档索引更新后）：阶段文档审计PASS，证据审计PASS（1286引用、177份Manifest、316项），整体仍INCOMPLETE/exit 2且`uncheckedVersionGate=true`。4个历史TestRun结构化导出、OD-013/014与旧Run决策、真实V1业务产物/同点恢复、Mac睡眠唤醒、Ubuntu实机及当前范围本人验收仍未满足。[a602日志](../../evidence/audits/2026-10-10-v1-version-gate-a602.log)、[exit](../../evidence/audits/2026-10-10-v1-version-gate-a602.exit.txt)、[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a602.log.sha256)。

正式V1最终复核a603：修复a600/a601日志sidecar路径后重新运行，五阶段文档审计PASS、证据审计PASS（1289引用、178份Manifest、317项），V1仍INCOMPLETE/exit 2且`uncheckedVersionGate=true`。四个历史TestRun导出缺失以及OD-013/014与旧Run处置、真实业务/同点基础设施和主机恢复、Mac睡眠唤醒、Ubuntu实机及本人当前范围验收继续未满足。[a603日志](../../evidence/audits/2026-10-10-v1-version-gate-a603.log)、[exit](../../evidence/audits/2026-10-10-v1-version-gate-a603.exit.txt)、[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a603.log.sha256)。

2026-10-10 P0/P1当前状态校准后的正式门禁a604：交叉索引审计147/147需求、1713路径引用/607目标、205精确测试名、147当前来源锚点PASS；阶段文档审计PASS，证据审计PASS（1292引用、179份Manifest、318项）。V1仍INCOMPLETE/exit 2，历史Run、所有者决策、活动/全域恢复、Ubuntu及本人验收等门禁条件仍开放。[a604日志](../../evidence/audits/2026-10-10-v1-version-gate-a604.log)、[exit](../../evidence/audits/2026-10-10-v1-version-gate-a604.exit.txt)、[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a604.log.sha256)。

2026-10-10 V1.5保留栈Platform API恢复及同Run核查：精确API容器OOM退出后仅调整该容器restart policy并启动，API/Web恢复200；既有normal TestRun `1f9b8fd0-9a51-45eb-803d-b613bbd8d126`的只读`--check-only`退出2，调度断言仍WAITING/NOT_RUN，HOLD为120项观察PASS。细节见[V1.5 §8.44](../prd/v1-local-simulation/05-scheduling-and-recovery.md#844-保留v15栈platform-api恢复与同run只读核查2026-10-10)、[API快照](../../evidence/audits/2026-10-10-v15-platform-api-recovered-live-stack-a01.json)和[CLI摘要](../../evidence/audits/2026-10-10-v15-retained-normal-run-checkonly-a01.json)。正式门禁a607仍INCOMPLETE/exit 2：五阶段文档与证据审计PASS（1312引用、184份Manifest、323条目）；四个历史Run导出、OD-013/014及旧Run决定、完整恢复、目标环境和本人验收仍开放。[a607日志](../../evidence/audits/2026-10-10-v1-version-gate-a607.log)、[exit](../../evidence/audits/2026-10-10-v1-version-gate-a607.exit.txt)、[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a607.log.sha256)。

正式V1门禁a608复核：五阶段文档与证据审计PASS（1315引用、185份Manifest、324条目），但V1仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`。4个历史TestRun结构化导出、OD-013/014及旧Run决定、完整恢复、Mac/Ubuntu目标环境和本人验收仍开放。[a608日志](../../evidence/audits/2026-10-10-v1-version-gate-a608.log)、[exit](../../evidence/audits/2026-10-10-v1-version-gate-a608.exit.txt)、[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a608.log.sha256)。

2026-10-10 P1/A04生成客户端合同增量：补齐V1.1/V1.3真实对账边`recordSimulatedFakeBrokerExternalOrder`的直接客户端传输测试；Platform API 327项/typecheck与完整V1.3 code suite受控exit 0，HTTP/PG、迁移和Web/API/CLI通过并清理隔离资源。沙箱loopback EPERM首跑保留，a02受控重跑通过。[V1.1 §8.33](../prd/v1-local-simulation/01-environment-and-web-center.md#833-platformtrade-execution外部fakebroker订单观察客户端合同2026-10-10)、[V1.3 §8.77](../prd/v1-local-simulation/03-fake-broker-trading-loop.md#877-外部fakebroker订单观察生成客户端合同回归2026-10-10)、[套件日志](../../evidence/audits/2026-10-10-v13-external-order-client-contract-code-suite-a02.log)，SHA-256 `81a35eca7469e7b025144629e1d70baa7f6b8cb57f2ec275e124424288470545`。该客户端操作合同子项通过，P1/A04/P3父项仍开放。

正式V1门禁a609复核（新增Platform→Trade Execution外部FakeBroker订单观察客户端合同并同步追踪后）：五阶段文档审计PASS、证据审计PASS（1323引用、187份Manifest、326项），但版本仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`。4个历史TestRun结构化导出、OD-013/014及旧Run决定、活动/全域恢复、Mac睡眠唤醒、Ubuntu实机和本人验收未满足。[a609日志](../../evidence/audits/2026-10-10-v1-version-gate-a609.log)、[exit](../../evidence/audits/2026-10-10-v1-version-gate-a609.exit.txt)、[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a609.log.sha256)。

正式V1门禁a610复核（更新V1.1/V1.3阶段增量待办后）：五阶段文档与证据审计PASS（1326引用、188份Manifest、327项）；整体V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。四个历史Run导出、OD-013/014与旧Run决定、活动/全域及目标环境恢复和本人验收仍开放。[a610日志](../../evidence/audits/2026-10-10-v1-version-gate-a610.log)、[exit](../../evidence/audits/2026-10-10-v1-version-gate-a610.exit.txt)、[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a610.log.sha256)。

2026-10-10 P1/A04 Trade→Governance生成客户端增量：为实际V1.3路径的Proposal读取、执行授权创建、授权校验新增逐字段客户端合同回归；定向3/3、Trade typecheck和完整V1.3 code suite受控exit 0，隔离迁移/HTTP/PG/Web/API/CLI及临时资源清理通过。详见[V1.3 §8.78](../prd/v1-local-simulation/03-fake-broker-trading-loop.md#878-trade→decision-governance-v13授权客户端操作合同2026-10-10)和[日志](../../evidence/audits/2026-10-10-v13-trade-governance-client-contract-code-suite-a01.log)，SHA-256 `c9c0419b2620f9c0957da81d1d8b006c513cc03fd2ca76ebff2ab105dbc739bb`。仅关闭三个出站客户端操作合同；P1/A04/P3父项和V1仍OPEN。

正式V1门禁a611复核（本轮Trade→Governance客户端合同与文档/追踪同步后）：五阶段文档审计PASS、证据审计PASS（1331引用、189份Manifest、328项），整体V1仍INCOMPLETE/exit 2。四个指定历史Run导出、OD-013/014及旧Run决策、全域/活动恢复、目标环境与本人验收仍开放。[a611日志](../../evidence/audits/2026-10-10-v1-version-gate-a611.log)、[exit](../../evidence/audits/2026-10-10-v1-version-gate-a611.exit.txt)、[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a611.log.sha256)。

2026-10-10 执行进度：已把冻结V1.4限制Fixture的停牌/涨停封板BUY场景贯通Trade Paper HTTP、Governance授权及Portfolio预留释放；完整隔离code suite exit 0，细节见[V1.4 §8.77](../prd/v1-local-simulation/04-daily-backtest.md#877-冻结市场限制fixture贯通trade-paper拒绝路径2026-10-10)。这只完成P4的固定规则子场景。V1整体门禁a612仍INCOMPLETE/exit 2，仍需处理四个历史TestRun结构化导出、OD-013/014与旧Run决策、真实业务/活动及全域恢复、Mac睡眠唤醒、Ubuntu实机和五阶段当前范围人工验收；未完成前不关闭计划。

正式门禁a613复核（含本轮V1.4 P4固定限制Paper HTTP切片及追踪同步）：五阶段文档审计和证据审计通过；V1仍INCOMPLETE/exit 2，历史Run导出、OD-013/014与旧Run决策、恢复/目标环境和本人验收未满足。计划继续执行，不提前关闭。[a613](../../evidence/audits/2026-10-10-v1-version-gate-a613.log)。

最新正式复核a614：五阶段文档审计、证据审计PASS（1346引用、193份Manifest、332项）；整体V1仍INCOMPLETE/exit 2。不能结束计划：历史导出、待决所有者决策/旧Run处理、活动与全域恢复、Mac/Ubuntu目标环境和本人验收均仍开放。[a614门禁](../../evidence/audits/2026-10-10-v1-version-gate-a614.log)。

正式复核a615（新增冻结锁跌停SELL的授权Trade HTTP拒单/幂等路径后）：五阶段文档审计及证据审计PASS，整体V1仍INCOMPLETE/exit 2。P4固定限制Fixture的三类Paper拒单子场景已验证，但真实持仓/可卖量、结算、全市场规则仍OPEN；历史导出、OD决策、旧Run处置、活动/目标环境恢复与用户验收亦未满足。计划继续执行，不能关闭。[a615门禁](../../evidence/audits/2026-10-10-v1-version-gate-a615.log)。

正式门禁a616：五阶段文档审计、证据审计和Crosswalk结构检查PASS；整体V1仍INCOMPLETE/exit 2。完成计划继续开放，固定Paper市场限制拒单仅关闭一个P4子场景，剩余交易规则/结算、历史Run、活动/目标环境恢复、待决所有者决策和实际用户验收仍需完成。[a616门禁](../../evidence/audits/2026-10-10-v1-version-gate-a616.log)。

正式V1门禁a617（差异矩阵A32增补后）：五阶段文档/证据检查PASS，V1仍INCOMPLETE/exit 2。A32仅更新一个P4来源行，不关闭P0全量语义复核；历史Run/所有者决策、活动与Ubuntu恢复、各阶段人工验收仍未完成，故计划继续开放。[a617](../../evidence/audits/2026-10-10-v1-version-gate-a617.log)。

2026-10-10 正式门禁复核a618：按当前工作树重新执行`pnpm verify:version -- --version V1`，五阶段文档审计PASS，证据审计PASS（1358引用、198份Manifest、337项）；V1仍INCOMPLETE/exit 2。四个历史TestRun原始结构化导出缺失；OD-013/014与3条旧非终态Run处置、全域恢复、Mac睡眠唤醒、Ubuntu实机和阶段剩余工程项继续OPEN，且人工验收未签署。[a618日志](../../evidence/audits/2026-10-10-v1-version-gate-a618.log)，[exit](../../evidence/audits/2026-10-10-v1-version-gate-a618.exit.txt)，SHA-256 `7f7d5e2bc607a01f981f4aabbd6b353fea72d40f5d720da17ff17774ac499509`。本轮只刷新门禁证据，不代表V1完成。

正式门禁复核a619：在进度、计划追加a618记录后重跑，五阶段文档审计PASS，证据审计PASS（1358引用、198份Manifest、337项）；V1仍INCOMPLETE/exit 2，147条需求交叉追踪结构检查PASS但不替代P0逐项语义复核。历史Run导出、OD-013/014及旧Run处置、工程/环境恢复和本人验收仍未满足。[a619日志](../../evidence/audits/2026-10-10-v1-version-gate-a619.log)、[exit](../../evidence/audits/2026-10-10-v1-version-gate-a619.exit.txt)、[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a619.log.sha256)。

2026-10-10 P0语义复核增量：将V1.2-S2-L20逐一对照当前PRD源行、Platform创建路由顺序及隔离HTTP/PostgreSQL断言；四种客户端模式字段组合均在调用V12AcceptanceService前返回422，数据库Run计数不变。该原子要求判PASS并更新差异矩阵A37；V1-wide模式路由清单及其余P0要求未因此关闭。同步至[90-test-plan](../prd/v1-local-simulation/90-test-plan.md)后，首次Crosswalk检查发现并保留一个过期源行锚点失败[a03](../../evidence/audits/2026-10-10-v1-crosswalk-current-a03-failure.log)；更新锚点后147条需求/1735路径引用/625目标/210精确测试/147锚点全部通过[a04](../../evidence/audits/2026-10-10-v1-crosswalk-current-a04.log)。[A37矩阵](../../evidence/audits/2026-10-10-v1-current-gap-matrix-a37.json)，SHA-256 `c1c6fa03348f6be75449f22502cc1bd6f39523f92e43b7d835f61e67535022a6`。

正式门禁a620：单行语义复核、测试计划及Crosswalk锚点同步后，五阶段文档/证据审计PASS（1358引用、198份Manifest、337项），V1仍INCOMPLETE/exit 2。四个历史Run导出、OD-013/014及旧Run处置、P0余项、阶段工程与恢复、目标主机验证及本人验收仍开放。[a620日志](../../evidence/audits/2026-10-10-v1-version-gate-a620.log)、[exit](../../evidence/audits/2026-10-10-v1-version-gate-a620.exit.txt)、[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a620.log.sha256)。

2026-10-10 P0语义复核第二条：V1.5-S2-L22当前Platform Run创建路由仅接收`scenarioId`/`seed`，模式字段在持久化和NATS/Temporal派发前被严格拒绝。隔离HTTP/PostgreSQL验证四种组合全部422、Run行数不变；对应四场景隔离Web/API/CLI与完整code-suite证据已存在并核验。更新A38及90-test-plan，Crosswalk 147条/1736引用/626目标/210精确测试/147锚点PASS。[A38矩阵](../../evidence/audits/2026-10-10-v1-current-gap-matrix-a38.json)，SHA-256 `d3f23c05ae721da9a9229c067e949893dfc6d048589533968c122a3f7d34c04c`；[Crosswalk a05](../../evidence/audits/2026-10-10-v1-crosswalk-current-a05.log)。这仅关闭V1.5这一原子创建入口要求，P0其余行与V1门禁继续开放。

正式V1门禁a621：V1.5-S2-L22逐项复核并同步测试计划/追踪后，五阶段文档与证据审计PASS（1358引用、198份Manifest、337项），整体V1仍INCOMPLETE/exit 2。四个历史Run导出、待决政策与旧Run处置、P0/P1–P6剩余工程、环境/恢复及本人验收仍开放。[a621日志](../../evidence/audits/2026-10-10-v1-version-gate-a621.log)、[exit](../../evidence/audits/2026-10-10-v1-version-gate-a621.exit.txt)、[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a621.log.sha256)。

门禁a622（同步a621记录后复跑）：五阶段文档/证据审计PASS，V1仍INCOMPLETE/exit 2。缺失历史TestRun导出、OD-013/014与旧Run决策、P0及阶段剩余工程、恢复/环境验证和本人验收尚未关闭。[a622日志](../../evidence/audits/2026-10-10-v1-version-gate-a622.log)、[exit](../../evidence/audits/2026-10-10-v1-version-gate-a622.exit.txt)、[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a622.log.sha256)。

### 2026-10-10 续跑：公共TestRun与运行时钟消费者复核

P0第三条语义复核对照公共TestRun Schema、V1.1本地Platform DTO/投影及V1.3/V1.5运行时钟消费。V1.1 DTO与严格公共Schema存在字段差异，运行时公共ClockContext消费也未被证实；保留V1.1-S2-L13/P0为OPEN，未擅改API。业务时钟静态路径与现有测试支持V1使用固定Fixture、持久化Run时钟或历史Bar时间戳。详见[A39](../../evidence/audits/2026-10-10-v1-current-gap-matrix-a39.json)、[核查报告](../../evidence/audits/2026-10-10-v1-core-schema-clock-consumer-review-a01.md)。Crosswalk a07更新来源锚点后PASS（147/147需求、1738路径引用/628目标、210精确测试、147锚点）。版本门禁仍未完成。

正式V1门禁a623（同步A39复核和执行记录后复跑）：五阶段文档审计PASS、证据审计PASS（1359引用、198份Manifest、337项），版本仍INCOMPLETE/exit 2。四个历史TestRun结构化导出、OD-013/014及旧Run决定、P0/P1–P6剩余工程、目标主机/恢复验证和用户验收仍开放。[a623日志](../../evidence/audits/2026-10-10-v1-version-gate-a623.log)、[exit](../../evidence/audits/2026-10-10-v1-version-gate-a623.exit.txt)、[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a623.log.sha256)。

2026-10-10 P1续跑：V1.1跨服务基础中“客户端生成器纳入生成/漂移门禁”子项已复验：`pnpm contracts:check` exit 0，203个Schema、8个服务类型副本、30个生成器、111条兼容规则及OpenAPI检查通过，注册测试2/2。其范围不证明V1实际调用方/身份/路由、发布迁移端到端完整性，故P1父项仍OPEN。[A40](../../evidence/audits/2026-10-10-v1-current-gap-matrix-a40.json)、[日志](../../evidence/audits/2026-10-10-v1-contract-generator-drift-p1-a01.log)。

正式V1门禁a624（纳入P1生成器检查复核后）：文档/证据审计PASS（1361引用、198份Manifest、337项），V1仍INCOMPLETE/exit 2。历史导出、待决决定和旧Run处置、剩余语义/工程/恢复/环境与人工验收尚未满足。[a624日志](../../evidence/audits/2026-10-10-v1-version-gate-a624.log)、[exit](../../evidence/audits/2026-10-10-v1-version-gate-a624.exit.txt)、[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a624.log.sha256)。

2026-10-10 P4续跑：为锁跌停SELL新增版本化双会话合成Fixture，并扩展三服务隔离HTTP/PostgreSQL场景。先用BUY在真实Portfolio/FakeBroker建仓29股；次日成功建立可卖SELL Reservation后授权Trade拒单并幂等重放，系统释放该Reservation且Portfolio/FakeBroker现金、持仓和账本不变。完整V1.4 code suite a05 exit 0，检查过Fixture manifest/hash及隔离资源清理。此子项不关闭全市场规则、Quant/Paper逐规则对照、OD-014结算/应收、Ubuntu或阶段/版本验收。[矩阵A41](../../evidence/audits/2026-10-10-v1-current-gap-matrix-a41.json)、[§8.77](../prd/v1-local-simulation/04-daily-backtest.md#877-冻结市场限制fixture贯通trade-paper拒绝路径2026-10-10)、[a05套件](../../evidence/audits/2026-10-10-v14-sellable-position-locked-sell-code-suite-a05.log)。

正式V1门禁a625：五阶段文档审计和证据审计PASS（1365引用、198份Manifest、337项），版本仍INCOMPLETE/exit 2；历史证据、待决决定、旧Run、其余工程/恢复/环境条件和本人验收未完成。[日志](../../evidence/audits/2026-10-10-v1-version-gate-a625.log)、[exit](../../evidence/audits/2026-10-10-v1-version-gate-a625.exit.txt)、[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a625.log.sha256)。

正式V1门禁a626：五阶段文档及证据审计PASS（1368引用、199份Manifest、338项），V1仍INCOMPLETE/exit 2；历史导出、所有者决定/旧Run、剩余工程、环境/恢复和人验均未关闭。[a626日志](../../evidence/audits/2026-10-10-v1-version-gate-a626.log)、[exit](../../evidence/audits/2026-10-10-v1-version-gate-a626.exit.txt)、[SHA-256](../../evidence/audits/2026-10-10-v1-version-gate-a626.log.sha256)。

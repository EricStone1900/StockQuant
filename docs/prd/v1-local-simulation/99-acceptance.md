> 当前V1收尾范围（2026-10-13）：所有者要求聚焦主要功能、减少非必要验证和停止扩散；当前执行以[V1主要功能完成计划](../../plans/2026-10-08-v1-completion-plan.md)及[范围决定](../../decisions/2026-10-13-v1-core-closeout-scope.md)为准。延期增强和广泛验证不阻塞本轮，旧任务/结果/签署保留为历史；核心正确性和人工验收不缩减。

> 当前范围决定（2026-10-13）：所有者已将Ubuntu实机部署/恢复/主机资源验收延期至后续Ubuntu部署验收，状态DEFERRED / NOT_RUN；它不再阻塞V1本轮开发及验收。Mac本地容器、目标架构烟测/缺口登记、其余业务/恢复和人工验收要求保留。旧记录中的Ubuntu缺口保留为历史事实，不代表当前V1阻塞。见[延期决定](../../decisions/2026-10-13-v1-ubuntu-deferral.md)。

## 当前候选验收状态（2026-10-14）

**历史人工验收：PASS；当前候选人工验收：PASS。** 用户于2026-10-14在本对话明确确认整版V1当前候选通过，签署绑定源码/配置/Fixture快照SHA-256 `132535fbdf2bf1d50e4260e397424b3a47ef949dedcc62e58257c0a5697bd2d4`（1287个文件）。此前2026-10-13签署绑定的旧快照`e45e9232f323539181fd4fc4e00f9c165a08ec9ec32426b9e6884c4d2d8b58b4`仍作为历史保留。此项整版人工验收不改写各StageRun自动导出的`manualConclusion=NOT_RUN`，也不将未满足的工程门禁标成通过。本轮复验和候选信息见[2026-10-14收尾记录](../../../evidence/audits/2026-10-14-v1-core-closeout-a01.md)。

**正式技术门禁：PASS（2026-10-14，exit 0）。** 已批准的Mac本地V1主要功能范围开发、交付及人工验收完成；五阶段状态/§7清单/§8手册和版本十项清单已按实测证据核实。5阶段14个完成态代表Run的状态、全部断言及Manifest逐项校验通过；正常/拒绝/恢复完整覆盖仍见原E2E报告。文档、Crosswalk和证据审计均通过，无未关闭阶段、无无效PASS声明。延期项目保持未验收；历史失败、等待/取消Run、六份旧MISSING及旧签署全部保留。最新结果见[最终门禁](../../../evidence/audits/2026-10-14-v1-core-closeout-gate-a03.log)。

验收范围和操作材料仍以[核心范围验收交接单](../../../evidence/audits/2026-10-13-v1-core-acceptance-handoff-a01.md)为准。当前候选的整版用户签署登记于上方摘要、阶段验收行及收尾记录，不倒填到单个StageRun；自动导出的`manualConclusion`保持原值。历史六个缺失Run UUID及来源继续见[历史来源复核](../../../evidence/audits/2026-10-12-v1-history-export-source-recheck-a04.md)和历次门禁日志，不作为当前候选Run。

Governance L17正式门禁a04仍INCOMPLETE/exit 2：五阶段文档审计PASS、证据审计PASS（2658引用/462份Manifest/600项），六份指定历史Run导出缺失，当前范围人工验收未执行。[门禁日志](../../../evidence/audits/2026-10-12-v1-formal-gate-governance-l17-a04.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-governance-l17-a04.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-governance-l17-a04.log.sha256)。
2026-10-12 V1.1 Portfolio初始化服务端六模式HTTP+PostgreSQL增量见[§8.72](./01-environment-and-web-center.md#872-p0l17-portfolio账户初始化服务端六模式httppostgresql矩阵2026-10-12)：两种FAKE模拟组合成功并准确持久化，四种REAL或LIVE组合403；集成7/7、认证拒绝32/32，隔离资源清理核验通过。此工程子项不改变V1门禁a83状态或阶段/当前范围人工验收结论。
2026-10-12 Portfolio四条账务写路由六模式字段注入矩阵见[V1.1 §8.73](./01-environment-and-web-center.md#873-p0l17-portfolio账务写路由六模式注入与零副作用矩阵2026-10-12)：预留、Fill、费用更正、预留解除共24次请求均422，拒绝前后PostgreSQL业务事实不变。仅为路由子项自动证据；正式V1门禁和人工验收状态不变。
2026-10-12 Portfolio结算六种客户端模式字段注入均HTTP 400，拒绝期间到期应收款保持不变，随后合法结算精确成功；详见[V1.1 §8.74](./01-environment-and-web-center.md#874-p0l17-portfolio结算写路由六模式注入与应收款保护2026-10-12)。该路由子项自动PASS不代表V1或阶段人工签收。
2026-10-12 Governance/Replay L17隔离HTTP+PG复验：Mandate、Proposal决策/修订、Proposal执行授权及历史授权端点六模式矩阵通过；历史授权只允许BACKTEST/FAKE，其他五种拒绝；零副作用与合法授权轮换/消费分别见[V1.3 §8.115](./03-fake-broker-trading-loop.md#8115-p0l17-decision-governance-auto-mandate写路由六模式httppostgresql矩阵2026-10-12)和[§8.116](./03-fake-broker-trading-loop.md#8116-p0l17-decision-governance-proposal与历史回测授权六模式httppostgresql矩阵2026-10-12)。正式V1门禁与阶段人工验收仍未通过。
current-a79正式门禁仍INCOMPLETE/exit 2：结构与证据审计通过，6份指定历史Run导出缺失，人工验收未执行。[门禁日志](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a79.log)。
current-a78正式门禁仍INCOMPLETE/exit 2：结构和证据审计通过，6份指定历史Run导出缺失，当前范围人工验收未执行。[门禁日志](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a78.log)。
最新current-a77正式门禁仍INCOMPLETE/exit 2：结构审计通过，6份指定历史Run导出缺失，人工验收尚未执行。[门禁日志](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a77.log)。
current-a76正式门禁仍为INCOMPLETE/exit 2：结构审计通过，6份指定历史Run结构化导出缺失，人工验收尚未执行。详见[门禁日志](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a76.log)。
2026-10-12 A142记录：V1.4 US固定Fixture 55bps滑点费用Parity差异修复，code suite通过；此机器证据不构成人工验收，P4保持OPEN，人工签收仍NOT_RUN。详见[报告](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a142.md)。
2026-10-12正式V1门禁current-a75（纳入A141阶段追踪与Crosswalk锚点更新后）：五阶段文档审计PASS、证据审计PASS（2601引用、449份Manifest、587项）；35个目标TestRun中6个指定历史Run仍缺结构化导出，V1为INCOMPLETE/exit 2。阶段交付余项、Ubuntu实机、全域恢复及本人验收仍未完成。[a75日志](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a75.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a75.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a75.log.sha256) `80be301eb81ca29855c9777f7c08e64aba5db22d745c0b946fd45e26c3f72482`。
2026-10-12 V1.4-S2-L18语义复核A141：修正§2旧摘要（后续已补固定Fixture费用/滑点/限制/结算，真实Governance/Trade/Portfolio HTTP+PG和9次账本/9次幂等对照），但全适用规则组合、完整Quant/Paper事件账本Parity、所有恢复组合、Ubuntu及当前范围人验仍缺，需求保持OPEN。[A141报告](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a141.md)、[矩阵](../../../evidence/audits/2026-10-12-v1-current-gap-matrix-a141.json)。
2026-10-12 V1.2 §8.3 Web/API/CLI自动化复核：normal/rejection/recovery-probe、取消和Platform重启恢复当前隔离浏览器复验通过，Playwright 1/1；五个TestRun均有结构化导出且人工结论保持`NOT_RUN`；导出器支持无ArtifactRef的有效拒绝/取消Run并保留引用校验；完整V1.2 code suite a03 exit 0。截图/Trace、机器报告、五份导出及测试日志见[阶段§8.65](./02-small-data-and-qlib.md#865-§83-五个testrun结构化导出与拒绝场景无产物处理2026-10-12)。本次新增Run不替代缺失的指定历史导出，Ubuntu、用户验收及V1门禁仍未完成。
2026-10-12正式V1门禁a24：五阶段文档审计PASS、证据审计PASS（2452引用、422份Manifest、566项）；V1仍INCOMPLETE/exit 2。25个指定TestRun中21份结构化导出有效，V1.2一份及V1.5三份历史导出缺失；阶段完整交付、Ubuntu/全域恢复和当前范围人工验收仍未完成。[a24日志](../../../evidence/audits/2026-10-12-v1-formal-gate-v14-execution-model-a24.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-v14-execution-model-a24.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-v14-execution-model-a24.log.sha256)。

2026-10-12正式门禁a06：五阶段文档审计与证据审计PASS（2381引用、409份Manifest、547项）；版本仍INCOMPLETE/exit 2，历史TestRun导出、阶段交付、Ubuntu/恢复和本人验收未完成。[门禁a06](../../../evidence/audits/2026-10-12-v1-formal-gate-v14-market-local-date-a06.log)。

2026-10-12 V1.4时区回归与完整code suite通过，详见[阶段§8.104](./04-daily-backtest.md#8104-v14结算日期按市场本地时区跨utc日界回归2026-10-12)及[A120](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a120.md)。这只是自动化证据，当前范围人工签署仍NOT_RUN，V1整体仍INCOMPLETE。

2026-10-12 V1.4结算时区回归：Trade与Portfolio本地日期边界定向测试和类型检查通过，详见[阶段§8.104](./04-daily-backtest.md#8104-v14结算日期按市场本地时区跨utc日界回归2026-10-12)及[A119](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a119.md)。这只是自动化子项，当前范围人工签署仍NOT_RUN，V1整体仍INCOMPLETE。

2026-10-12正式门禁a04（同步A118和最新进度后）：五阶段文档审计PASS、证据审计PASS（2369引用/407份Manifest/545项）；V1仍INCOMPLETE/exit 2，四份历史TestRun导出、剩余阶段交付、Ubuntu/恢复和本人验收仍未完成。[a04日志](../../../evidence/audits/2026-10-12-v1-formal-gate-v14-benchmark-a04.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-v14-benchmark-a04.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-v14-benchmark-a04.log.sha256)。

正式V1门禁a10：五阶段文档审计PASS、证据审计PASS（2355引用/404份Manifest/542项），版本仍INCOMPLETE/exit 2，4份历史TestRun导出、阶段工程、Ubuntu/恢复和本人验收未满足。[日志](../../../evidence/audits/2026-10-12-v1-formal-gate-v13-l17-a10.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-v13-l17-a10.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-v13-l17-a10.log.sha256)。

正式V1门禁a09：五阶段文档审计PASS、证据审计PASS（2352引用/403份Manifest/541项）；版本仍INCOMPLETE/exit 2，4份历史TestRun导出、阶段工程、Ubuntu/恢复和本人验收未满足。[日志](../../../evidence/audits/2026-10-12-v1-formal-gate-v13-l17-a09.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-v13-l17-a09.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-v13-l17-a09.log.sha256)。

正式V1门禁a08：五阶段文档审计PASS、证据审计PASS（2345引用/402份Manifest/540项），版本仍INCOMPLETE/exit 2，4份历史TestRun导出、阶段工程、Ubuntu/恢复与人工验收未满足。[日志](../../../evidence/audits/2026-10-12-v1-formal-gate-v13-l17-a08.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-v13-l17-a08.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-v13-l17-a08.log.sha256)。

正式V1门禁a07：五阶段文档审计PASS、证据审计PASS（2342引用/401份Manifest/539项），版本仍INCOMPLETE/exit 2，4份历史TestRun导出、剩余阶段工程、Ubuntu/恢复与本人验收未满足。[日志](../../../evidence/audits/2026-10-12-v1-formal-gate-v13-l17-a07.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-v13-l17-a07.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-v13-l17-a07.log.sha256)。

正式V1门禁a06：五阶段文档审计PASS、证据审计PASS（2339引用/400份Manifest/538项），版本仍INCOMPLETE/exit 2；4份历史TestRun结构化导出、剩余阶段工程、Ubuntu/恢复与本人验收仍未满足。[日志](../../../evidence/audits/2026-10-12-v1-formal-gate-v13-l17-a06.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-v13-l17-a06.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-v13-l17-a06.log.sha256)。

2026-10-12正式V1门禁a05（纳入V1.3 Platform六模式新增撤单/费用更正两路由及阶段/追踪更新）：五阶段文档与证据审计PASS（2336引用/399份Manifest/537项）；V1整体INCOMPLETE/exit 2、`uncheckedVersionGate=true`，4份历史Run结构化导出及Ubuntu、恢复、人验未完成。[日志](../../../evidence/audits/2026-10-12-v1-formal-gate-v13-l17-a05.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-v13-l17-a05.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-v13-l17-a05.log.sha256)。

正式V1门禁a865（最终同步V1.3幂等恢复证据后）：五阶段文档审计PASS；证据审计PASS（2262引用、383份Manifest、521项）；V1仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`。四个指定历史TestRun导出、阶段剩余工程/交付、全域恢复与Ubuntu实机、当前范围本人验收仍未满足。[a865日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a865.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a865.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a865.log.sha256)。

正式V1门禁a864（纳入L16 seq=3拒单结果幂等/冲突验证及当前树完整回归）：五阶段文档审计PASS；证据审计PASS（2259引用、382份Manifest、520项）；Crosswalk 147项/290个精确测试引用PASS。V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。四个指定历史TestRun结构化导出仍缺，阶段收尾、恢复/Ubuntu实机及本人验收未完成。[a864日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a864.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a864.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a864.log.sha256)。

2026-10-12 L16 seq=3拒单同事实幂等重放与同序号改事实冲突自动子项：US定向隔离E2E 1/1、完整V1.3矩阵38/38、code suite exit 0，Platform应用单测14/14；初次全矩阵37/38的单条CN撤单409已保留，单项复现通过、第二次完整矩阵38/38。所有新Run仍manualConclusion=NOT_RUN，不代表阶段或版本签收。

正式V1门禁a863（复核当前阶段/进度/计划记录后）：五阶段文档审计PASS；证据审计PASS（2247引用、381份Manifest、519项）；V1仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`。4个历史TestRun导出缺失，V1工程/阶段收尾、活动与目标环境恢复、Ubuntu实机及人工签收仍未满足；a863为本轮最终有效正式门禁。[a863日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a863.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a863.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a863.log.sha256)。

正式V1门禁a862（纳入L16 US撤单拒绝恢复与当前树复验后）：五阶段文档审计PASS；证据审计PASS（2244引用、380份Manifest、518项）；Crosswalk 147项/289个精确测试引用PASS。V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。25个指定TestRun中21份导出可验证，四份历史结构化导出缺失（V1.2 `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`；V1.5 `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`）。阶段关闭、其他P0/P1–P6、活动/配对恢复、Ubuntu实机和本人验收仍OPEN。[a862日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a862.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a862.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a862.log.sha256)。a861保留了Crosswalk sidecar仓库根相对路径错误诊断；修正后a862证据审计通过。

2026-10-12 L16 US_EQUITY/AAPL撤单拒绝恢复自动子项：定向E2E 1/1通过，TestRun `4e3368c9-555c-49ca-9b62-7b3dbe95435d`；完整V1.3回归38/38、代码套件exit 0；人工结论NOT_RUN，阶段/版本签署保持未完成。详见[§8.104](./03-fake-broker-trading-loop.md#8104-p0l16-us_equityaapl-撤单拒绝后同单恢复与重试2026-10-12)。

正式V1门禁a857（纳入A110后V1.3完整代码套件当前树复跑及文档同步后）：五阶段文档审计PASS；证据审计PASS（2226引用、377份Manifest、515项）；Crosswalk结构检查147项、286条精确测试名PASS。V1仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`；25个指定TestRun中21个结构化导出通过，四个历史原始导出仍缺；其他阶段工程、Ubuntu/恢复和本人当前范围验收未完成。[a857日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a857.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a857.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a857.log.sha256)。

2026-10-12 V1.3完整code suite复验：当前树A110后`pnpm verify:stage -- --stage V1.3 --suite code`受控执行exit 0，详细日志见[V1.3 §8.102](./03-fake-broker-trading-loop.md#8102-a110后v13当前树完整代码套件复验2026-10-12)。仅记录自动回归，V1.3及V1人工验收未签署。

正式V1门禁a856（纳入P0/L17 A110真实到期应收路由复验及文档同步后）：五阶段文档审计PASS；证据审计PASS（2219引用、375份Manifest、513项）；Crosswalk结构检查147项、286条精确测试名通过。V1仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`；25个指定TestRun中21个结构化导出通过，4个历史原始导出仍缺；阶段剩余工程、目标Ubuntu/恢复和当前范围人工验收未满足。[a856日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a856.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a856.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a856.log.sha256)。

2026-10-12 P0/L17 A110：真实隔离CN_A应收在四种结算模式载荷拒绝后仍PENDING，合法请求后才结算。仅为原子自动测试，不产生人工验收或阶段签收；V1门禁仍未通过。[A110](../../../evidence/audits/2026-10-12-v1-portfolio-settlement-due-mode-boundary-a110.json)。

正式V1门禁a855（纳入P0/L17 A109 Portfolio结算路由覆盖及文档同步后）：五阶段文档审计PASS；证据审计PASS（2211引用、374份Manifest、512项）；Crosswalk结构检查147项、286条精确测试名通过。V1仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`；25个指定TestRun中21个结构化导出可验证，V1.2 `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`及V1.5 `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`仍缺原始结构化导出。其余阶段工程、目标Ubuntu/恢复和本人当前范围验收仍未满足。[a855日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a855.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a855.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a855.log.sha256)。

2026-10-12 P0/L17 A109：Portfolio结算入口四种模式载荷均被精确Schema拒绝，账户与账本事实不变；定向隔离集成6/6、授权矩阵32/32通过。此子项不关闭L17/P0/V1；V1门禁与人工签署状态保持未完成。[A109](../../../evidence/audits/2026-10-12-v1-portfolio-settlement-mode-boundary-a109.json)。

正式V1门禁a854（A108及本轮证据登记后）：五阶段文档审计PASS；证据审计PASS（2204引用、373份Manifest、511项）；Crosswalk结构检查147项/285条测试名通过。V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。25个指定TestRun中21个结构化导出通过，四个历史导出仍缺（V1.2 `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`；V1.5 `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`）。阶段剩余工程、OD-013/旧Run处置、全域恢复、Ubuntu实机和当前范围人工验收未完成。[a854日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a854.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a854.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a854.log.sha256)。

2026-10-12增量记录：P0/L17 A108已验证V1.2 Run取消、V1.4回测Run取消、V1.5 Incident确认及AUTO取消入口对四种客户端模式注入均返回422且业务事实不变，报告见[evidence A108](../../../evidence/audits/2026-10-12-v1-l17-cancel-mode-boundaries-a108.json)。仅为局部自动化证据；正式门禁、阶段工程、环境恢复和用户人工验收仍未满足，不签署版本验收。

正式V1门禁a853（纳入L16/A50三seed Web/API/CLI证据、A106矩阵、Crosswalk及文档纠错后）：五阶段文档审计PASS；证据审计PASS（2188引用、372份Manifest、510项）；25个指定TestRun中21个结构化导出通过，4个历史原始导出仍缺。V1状态仍为`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`；不得视为V1完成或人工验收。[a853日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a853.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a853.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a853.log.sha256)。

正式V1门禁a852（纳入L16/A50三seed Web/API/CLI证据、A106矩阵及Crosswalk后）：五阶段文档审计PASS；证据审计PASS（2182引用、371份Manifest、509项）；25个指定TestRun中21个结构化导出通过，4个历史原始导出仍缺。V1状态仍为`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`；阶段剩余工程、Ubuntu/全域恢复和人工验收未满足。[a852日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a852.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a852.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a852.log.sha256)。

2026-10-12 V1.3-S2-L16多seed自动增量：增加seed 20261013/20261014两个独立Web/API/CLI Run，分别验证seq=2先到并缓冲，以及两次部分Fill后撤单；连同既有seed 20260907场景构成三个seed/三种到达顺序。定向2/2、完整V1.3 Web/API/CLI/Evidence Export 36/36、完整code suite退出0。L16仍PARTIAL/OPEN，用户验收NOT_RUN；不以自动结果签署版本。[阶段§8.98](./03-fake-broker-trading-loop.md#898-v13-l16-多种子webapicli因果成交与撤单-2026-10-12)、[A50](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a50.md)、[A106](../../../evidence/audits/2026-10-12-v1-current-gap-matrix-a106.json)、[E2E](../../../evidence/audits/2026-10-12-v13-l16-multiseed-full-e2e-a01.log)、[代码套件](../../../evidence/audits/2026-10-12-v13-l16-multiseed-code-suite-a01.log)。

正式V1门禁a851（相对链接和SHA-256 sidecar格式修正后）：五阶段文档审计PASS；证据审计PASS（2169引用、369份Manifest、507项）；25个指定TestRun中21个导出通过，4个原始结构化导出仍缺。V1为`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`；不构成V1完成或人工验收。[a851日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a851.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a851.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a851.log.sha256)。

门禁复跑a849诊断记录：新增a848日志在此文档的相对链接曾少一级，导致证据审计FAIL/exit 1；路径已修正并保留诊断日志。本记录不改变自动/人工验收状态。[a849诊断日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a849.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a849.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a849.log.sha256)。

正式V1门禁a848（同步L16/A49场景与追踪记录前）：五阶段文档审计PASS、证据审计PASS（2163引用、367份Manifest、505项）；21个指定历史TestRun中17份结构化导出可验证，4份原始导出仍缺。V1保持`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`；新增L16自动证据不关闭父项、阶段交付或用户验收。[a848日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a848.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a848.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a848.log.sha256)。

2026-10-12 V1.3-S2-L16新增代表性Web/API/CLI自动证据：请求撤单后seq=3结果先到并缓冲，缺失seq=2成交由Web补入；订单最终CANCELLED，双账本、预留释放、MATCH及同Run CLI检查通过。完整V1.3隔离E2E 34/34、完整code suite exit 0。L16仍PARTIAL/OPEN；多seed浏览器故障矩阵、完整阶段和用户人工验收仍未完成，Run `manualConclusion=NOT_RUN`。[阶段§8.97](./03-fake-broker-trading-loop.md#897-v13-l16同run早到撤单结果缓冲与后续成交恢复2026-10-12)、[A49](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a49.md)、[E2E日志](../../../evidence/audits/2026-10-12-v13-l16-mixed-full-web-e2e-a01.log)、[Code日志](../../../evidence/audits/2026-10-12-v13-l16-mixed-full-code-suite-a01.log)。

正式V1门禁a847（纳入L16/A48与A104后）：五阶段文档审计PASS、证据审计PASS（2154引用/366份Manifest/504项）；四份指定历史Run导出仍缺；V1继续`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。P0、阶段交付、环境/全域恢复及本人验收均未完成。[a847日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a847.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a847.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a847.log.sha256)。

2026-10-12 V1.3-S2-L16新增自动证据：隔离PostgreSQL 24种子Fill/Fill/Accepted-Cancel混合到达覆盖六种排列，订单/Fill/独立FakeBroker账本/预留及幂等重放、冲突拒绝均通过；当前V1.3完整code suite通过。此数据库证据不替代多seed Web/API/CLI、全恢复矩阵及用户签收，L16/P3人工验收仍NOT_RUN、V1未通过。[§8.96](./03-fake-broker-trading-loop.md#896-v13-l16-postgresql多种子fill取消混合事件到达序列2026-10-12)、[A48](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a48.md)、[suite](../../../evidence/audits/2026-10-12-v13-mixed-event-current-code-suite-a01.log)。

正式V1门禁a846（纳入a845记录后）：五阶段文档审计PASS、证据审计PASS（2144引用/364份Manifest/502项）；四份历史Run原始导出仍缺，Crosswalk PASS，V1继续`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。Artifact P1/L20、Ubuntu、全域恢复、其余阶段交付和本人验收未满足。[a846日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a846.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a846.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a846.log.sha256)。

正式V1门禁a845（纳入A103及当前Crosswalk锚点后）：五阶段文档审计PASS、证据审计PASS（2141引用/363份Manifest/501项）；25个指定TestRun中21份结构化导出通过，四份历史原始导出缺失；交叉表结构PASS；V1继续`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。Artifact L20/P1、Ubuntu、完整恢复、阶段交付和本人验收未完成。[a845日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a845.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a845.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a845.log.sha256)。

正式V1门禁a844（纳入P0/A103及V1.1 §8.66后）：五阶段文档审计PASS、证据审计PASS（2138引用/362份Manifest/500项）；25个指定TestRun中21份结构化导出通过，四份历史原始导出缺失；V1继续`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。L20及其余阶段交付、Ubuntu/完整恢复和本人验收未完成。[a844日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a844.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a844.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a844.log.sha256)。

2026-10-12 V1.1-S2-L20当前源码/共享内容包复核：A03更新Artifact源码Hash，内容包测试6/6通过；跨Producer/TestRun引用权威、OD-013保留与回收、活动存储迁移/回退、配对恢复和Ubuntu宿主仍未验证，故L20/P1保持OPEN，不产生人工签署。[§8.66](./01-environment-and-web-center.md#866-v1-artifact当前源码哈希与共享内容包测试复核2026-10-12)、[A03](../../../evidence/audits/2026-10-12-v1-artifact-producer-inventory-a03.md)、[A103矩阵](../../../evidence/audits/2026-10-12-v1-current-gap-matrix-a103.json)。

正式V1门禁a842（同步a841及历史Run A01后）：五阶段文档审计PASS，证据审计PASS（2131引用/361份Manifest/499项）；25个指定TestRun中21份结构化导出通过，四份既定历史导出缺失，V1继续`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。Ubuntu、完整恢复、阶段交付和本人验收未完成。[a842日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a842.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a842.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a842.log.sha256)。

正式V1门禁a841（纳入活动库只读历史Run复核A01后）：五阶段文档审计PASS、证据审计PASS（2128引用/360份Manifest/498项）；25个指定TestRun中21份结构化导出通过，四份既定历史导出仍缺。活动Platform的legacy/stage Run表和仓库本地证据包均未找到对应UUID；V1继续`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。需恢复原始外部归档或由所有者另行处置，不可用新Run替代；Ubuntu、完整恢复、阶段交付和本人验收未完成。[a841日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a841.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a841.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a841.log.sha256)。

2026-10-12历史Run恢复源复核：四个缺失UUID在活动Platform `test_runs`与`acceptance_stage_runs`表均无记录，仓库本地证据包亦不存在；只读结果及限制见[审计A01](../../../evidence/audits/2026-10-12-v1-history-run-active-db-readonly-a01.md)。这些Run仍需原始外部备份/归档，或所有者对缺失历史证据作出单独处置；新Run不能替代。

正式V1门禁a840（2026-10-12）：五阶段文档审计PASS，证据审计PASS（2124引用、359份Manifest、497项）；25个指定TestRun中21份结构化导出通过，V1.2一份及V1.5三份历史Run导出缺失。V1整体INCOMPLETE/exit 2、uncheckedVersionGate=true。V1.5组合故障恢复a04已有通过证据；V1剩余阶段交付、Ubuntu/完整恢复与本人验收未完成。[a840日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a840.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a840.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a840.log.sha256)。

正式V1门禁a839（2026-10-12）：五阶段文档审计PASS，证据审计PASS（2121引用、358份Manifest、496项）；25个指定TestRun中21份结构化导出通过，V1.2一份及V1.5三份旧Run导出仍缺。V1整体INCOMPLETE/exit 2、uncheckedVersionGate=true。OD-014固定合成结算子项有自动通过证据，但V1.4/P4其他交付、Ubuntu/全域恢复和本人验收未完成。[a839日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a839.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a839.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a839.log.sha256)。

2026-10-12 OD-014决定与证据状态同步/A102：所有者严格已结算现金决定已执行于有界CN/US合成Fixture，自动Code/账本/Web/API/CLI证据通过；完整真实日历/费税、Quant/Paper全规则矩阵及新增范围人工验收仍未完成。保持V1.4 P4 OPEN，所有新增TestRun人工结论仍NOT_RUN。[A102](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a102.md)、[矩阵](../../../evidence/audits/2026-10-12-v1-current-gap-matrix-a102.json)。

正式门禁a838（2026-10-12）：五阶段文档审计PASS，证据审计PASS（2116引用、357份Manifest、495项）；25个指定TestRun中21份结构化导出核验通过，V1.2一份及V1.5三份历史原始导出仍缺。V1整体INCOMPLETE/exit 2、uncheckedVersionGate=true。V1.5 Fill ID追溯增量已自动验证（见§8.50），不构成人工签署；阶段整体交付、真实Ubuntu/完整恢复和本人验收仍未满足。[a838日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a838.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a838.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a838.log.sha256)。

2026-10-12 V1.5 owner-scoped任意历史Fill追溯自动证据：90天前且不在近期Run列表内的V1.5 Run可按External Fill ID只读定位；同owner重复ID409、missing/foreign数据不泄漏；code suite exit 0及Web/API/CLI E2E 3/3通过。该项只关闭近期列表外检索子项；跨阶段追溯和当前版本人工验收仍NOT_RUN，未新增任何人工签署。详见[阶段§8.50](./05-scheduling-and-recovery.md#850-按external-fill-id检索v15历史成交链路2026-10-12)、[code suite](../../../evidence/audits/2026-10-12-v15-fill-id-trace-code-suite-a03.log)及[E2E](../../../evidence/audits/2026-10-12-v15-fill-id-trace-e2e-a01.log)。

2026-10-12 P0/P1调用合同增量A44：Trade→Portfolio五个实际V1调用均逐项断言5秒超时，定向测试6/6、Trade typecheck exit 0。证据见[V1.3 §8.93](./03-fake-broker-trading-loop.md#893-trade→portfolio实际v1客户端逐操作超时合同2026-10-12)、[A44](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a44.md)及[A90](../../../evidence/audits/2026-10-12-v1-current-gap-matrix-a90.json)。只关闭一项客户端预算断言，L14/P1及V1.3验收保持开放；现有TestRun人工结论不变。

2026-10-12正式V1门禁a822：五阶段文档审计PASS、证据审计PASS（2045引用、346份Manifest、522项）；V1整体`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。四条指定历史Run导出缺失，阶段工程、完整恢复/目标环境及当前范围本人验收继续未完成。[a822日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a822.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a822.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a822.log.sha256)。

2026-10-12 P0/P1调用合同增量A43：Platform→Portfolio六个V1账户客户端操作逐项锁定5秒超时，定向客户端测试4/4、Platform typecheck exit 0。证据见[V1.1 §8.63](./01-environment-and-web-center.md#863-platformportfolio账户客户端逐操作超时合同2026-10-12)、[A43](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a43.md)及[A89](../../../evidence/audits/2026-10-12-v1-current-gap-matrix-a89.json)。仅关闭一个传输预算断言；L14/P1、阶段交付和人工作业仍OPEN/NOT_RUN。正式门禁a821尚未包含该增量。

2026-10-12 V1.5历史Run成交追溯自动验收增量：AUTO Run `de0e683f-02fa-4ef2-a158-1b7b4137103d`在随后rejection/recovery运行后由owner近期列表重开，四笔Fill在Web逐笔与owner认证详情API核对；normal `f0557418-74ef-4fb6-b605-7aabb5123851`、rejection `8dec9d63-fee4-4366-8555-5b09708d53e2`、recovery `7d310e60-7964-414e-9c2c-0600c2de1aaf`均完成同Run CLI/export并保留结构化证据包。E2E 3/3与V1.5完整code suite通过，四个Run的人工作业结论仍NOT_RUN；跨阶段/列表外检索开放，见[§8.49](./05-scheduling-and-recovery.md#849-owner范围历史run成交追溯2026-10-12)。

2026-10-12 V1.2当前树自动复跑：`pnpm test:e2e -- --stage V1.2`与完整`pnpm verify:stage -- --stage V1.2 --suite code`均exit 0；normal/rejection/recovery-probe/Platform重启恢复四Run同Run CLI与独立断言通过，锁定Qlib双市场拟合及Governance快照接收通过，随机隔离资源清理完成。Run IDs及限制见[§8.53](./02-small-data-and-qlib.md#853-v12-当前树完整阶段与代码套件复跑2026-10-12)和[A02执行记录](../../../evidence/audits/2026-10-12-v12-current-tree-stage-rerun-a02.md)。新增Run人工结论均NOT_RUN；历史TestRun导出、模型独立有效性、Ubuntu及阶段/版本验收仍未完成。

2026-10-12 P0/P1调用合同增量A42：Platform→Trade十个V1.3生成客户端操作现均由定向用例核对15秒写/5秒读超时预算，测试11/11、Platform typecheck exit 0；见[V1.1 §8.62](./01-environment-and-web-center.md#862-platformtrade-v13客户端逐操作超时合同2026-10-12)。A88只更新V1.1-S2-L14的一个调用传输子项，跨服务完整调用/身份/副作用、迁移和发布回退仍OPEN，不影响V1阶段与人工验收状态。

2026-10-12正式V1门禁a821：五阶段文档审计PASS；证据审计PASS（2037引用、345份Manifest、521项）；V1整体`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。25个指定Run中21个结构化导出通过，四个指定历史Run导出缺失；阶段工程、全V1恢复、目标Ubuntu及当前范围人验继续未完成。[a821日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a821.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a821.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a821.log.sha256)。

2026-10-12正式V1门禁a819：五阶段文档审计PASS；证据审计PASS（2022引用、342份Manifest、518项）；验收表25个指定TestRun中21份结构化导出通过，四份历史原始导出仍缺，V1整体`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。文档/追踪/证据路径无新增缺失；阶段工程、全V1恢复、目标Ubuntu及本人当前范围验收仍未完成。[a819日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a819.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a819.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a819.log.sha256)。

2026-10-12正式V1门禁a820：五阶段文档审计PASS；证据审计PASS（2028引用、343份Manifest、519项）；验收表25个指定TestRun中21份结构化导出通过，四份历史原始导出仍缺，V1整体`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。本轮V1.2隔离E2E与完整代码套件均自动PASS，人工/阶段验收、全V1恢复、目标Ubuntu仍未完成。[a820日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a820.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a820.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a820.log.sha256)。

正式门禁a817（2026-10-12）：五阶段文档和证据审计PASS（2012引用、339份Manifest、479项）；验收表25个TestRun中21份结构化导出通过，四份原始历史Run导出仍缺，版本`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。本轮四个V1.5 Run导出均通过身份与Manifest Hash核验；这不替代阶段/人工签收、Ubuntu及完整恢复。[a817日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a817.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a817.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a817.log.sha256)。

正式门禁a818（2026-10-12）：五阶段文档审计PASS，证据审计PASS（2015引用、340份Manifest、480项）；25个TestRun中21份结构化导出验证通过，V1.2一份及V1.5三份既定历史原始导出仍缺。V1为`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`；本轮新Run自动证据不改变人工验收和阶段签收。[a818日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a818.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a818.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a818.log.sha256)。

2026-10-12正式V1门禁a782：五阶段文档与证据审计PASS（1808/301/441），21个验收TestRun已核对；V1.1 15条导出通过，四条历史Run导出仍缺，V1整体INCOMPLETE/exit 2。[a782日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a782.log)。

2026-10-12正式V1门禁a781：五阶段文档与证据审计PASS（1802/300/440），21个验收TestRun已核对；V1.1 15条导出通过，四条历史Run导出仍缺，V1整体INCOMPLETE/exit 2。[a781日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a781.log)。

2026-10-12正式V1门禁a780：五阶段文档与证据审计PASS（1798/299/439），21个验收TestRun已核对；V1.1 15条导出通过，四条历史Run导出仍缺，V1整体INCOMPLETE/exit 2。[a780日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a780.log)。

2026-10-12正式V1门禁a779：五阶段文档与证据审计PASS（1794/298/438），21个验收TestRun已核对；V1.1 15条导出通过，四条历史Run导出仍缺，V1整体INCOMPLETE/exit 2。[a779日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a779.log)。

2026-10-12正式门禁a778：五阶段文档与证据审计PASS（1791/297/437），21个验收TestRun已核对；V1.1 15条导出通过，四条历史Run导出仍缺，V1整体INCOMPLETE/exit 2。[a778日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a778.log)。

2026-10-12 V1.1恢复继续接口三种LIVE/REAL模式注入均422且Run保持WAITING；合法恢复后同Run CLI/export与Portfolio只读账本核对通过。新增3个Web Run人工结论仍NOT_RUN，详见[§8.58](./01-environment-and-web-center.md#858-v11恢复继续路由模式注入拒绝与无副作用验证2026-10-12)。

2026-10-12最新V1正式门禁待本轮验收表同步后复核；本轮V1.1恢复继续模式边界新增3个Run均由结构化导出审计核验通过，但人工结论仍NOT_RUN。

2026-10-11 V1.5当前树恢复E2E新增自动证据：normal/AUTO/rejection/recovery四个隔离Run的NATS/Temporal/Trade故障恢复浏览器覆盖3/3通过，详情见[§8.46](./05-scheduling-and-recovery.md#846-v15当前树natstemporal与trade中断恢复e2e2026-10-11)。四个Run人工结论仍NOT_RUN，不替代阶段签收或版本通过。

2026-10-11正式门禁a776：五阶段文档审计与证据Manifest审计PASS（1780/293/433），版本仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`；4个指定历史Run导出及五阶段剩余交付、Ubuntu/恢复、当前范围人工验收仍未满足。[a776](../../../evidence/audits/2026-10-11-v1-formal-gate-a776.log)。修复UUID解析后V1.1验收行12个TestRun均有结构化导出；账户ID不再误报，V1.4结算请求体合同补齐；V1.4 OD-014当前树完整code suite a06 exit 0（§8.93），9个固定会话跨账本结算现金/应收一致；当前树Web/API/CLI E2E 7/7、10个Web Run同UUID CLI核验通过（§8.94）。新增Run人工结论仍NOT_RUN。

2026-10-11 V1验收状态：V1.1当前树完整code suite及Web/API/CLI三场景E2E 3/3通过（§8.55–§8.56）；V1.2当前树完整code suite exit 0、四场景Qlib隔离E2E和normal Run结构化证据通过（§8.49）。OD-014固定CN_A/US_EQUITY严格已结算现金Paper SELL子项均自动验证通过（V1.3 §8.80–§8.81）。新Run人工结论仍NOT_RUN，V1仍INCOMPLETE；四条指定历史Run结构化导出、阶段工程、目标环境/恢复与本人验收仍开放。正式门禁a744文档/证据审计通过（1688/274/414），15个验收TestRun中本轮normal Run证据PASS；四个历史Run导出仍缺。[a744日志](../../../evidence/audits/2026-10-11-v1-formal-gate-a744.log)。

2026-10-11 V1.1 §8.5补充：当前树隔离E2E normal/rejection/recovery三条同Run账本核对均通过，完整V1.1 code suite及Playwright exit 0、3/3；详见[§8.57](./01-environment-and-web-center.md#857-同一web-testrun到portfolio账本的隔离只读核对2026-10-11)和[日志](../../../evidence/audits/2026-10-11-v11-same-run-db-crosscheck-e2e-a01.log)。该自动证据仅关闭固定隔离交叉核对子项；阶段仍PARTIALLY_IMPLEMENTED，新增范围人工验收NOT_RUN，活动存储、Ubuntu及V1正式门禁未关闭。

2026-10-11 V1.1 §8.7当前Harness复核：随机隔离stage storage项目完整复跑并确认recovery目标、精确清理和当前源码Hash；L164固定自动执行子项PASS（A23/A69/A83）。不代表活动存储切换/回滚授权、Ubuntu或人工验收。[A23报告](../../../evidence/audits/2026-10-11-v1-gap-matrix-semantic-review-a23.md)。

2026-10-11 V1.1 §7契约/场景冻结核对：当前已勾选的定义冻结项与共享合同/三场景测试相符，L65仅以该定义冻结范围PASS记录在A24/A70/A84；后端完成、操作环境交付和当前范围人验保持未完成。

2026-10-11 V1.1 操作手册交付边界A25：Mac ARM64隔离入口及动态URL/session已实跑；Ubuntu目标主机、部署URL/配置和实机执行缺失，L68保持部分完成、§7未勾选（A71/A85）。

2026-10-11 OD-014 CN_A严格已结算现金子项完成：Trade Outbox持久化结算映射，FakeBroker与Portfolio将SELL净额列为PENDING应收，Run Clock按冻结日历释放；隔离PostgreSQL/Trade集成与完整V1.3 Web/API/CLI E2E 27/27通过。同Run `27cb77ea-c08a-4049-95ff-51b73acabf8c`现金仍为8995.0000 CNY，995.0000 CNY应收结算日2026-09-30，双账差异为空；人工验收仍NOT_RUN。详见[V1.4 §8.86](./04-daily-backtest.md#886-od014-trade-outbox双账本结算及v13-paper验证2026-10-11)及[机器证据](../../../evidence/audits/2026-10-11-v14-od014-settled-cash-paper-loop-a01.md)。

2026-10-11 V1.1活动存储只读复核：Platform API仍使用legacy TestRun存储且无Artifact挂载，PostgreSQL与Research Automation各自有挂载卷；活动Platform与仓库Compose配置存在Artifact持久卷漂移。未读取业务数据或Artifact字节，也未执行备份、迁移或回退；V1.1活动存储继续NOT_READY/NOT_AUTHORIZED/NOT_DEPLOYED。详见[§8.49](./01-environment-and-web-center.md#849-活动-platformpostgresqlartifact-挂载只读复核2026-10-11)及[机器报告A04](../../../evidence/audits/2026-10-11-v1-active-runtime-preflight-a04.json)。

2026-10-11正式门禁a674（纳入V1.4取消/报告发布真实并发fencing、Crosswalk A52及阶段/验收/计划同步后）：五阶段文档审计PASS；本地证据审计PASS（1548引用、245份Manifest、384项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。四个历史TestRun结构化导出、阶段剩余交付、开放决定、环境/恢复和本人验收仍未满足。[a674门禁](../../../evidence/audits/2026-10-11-v1-formal-gate-a674.log)、[退出码](../../../evidence/audits/2026-10-11-v1-formal-gate-a674.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-formal-gate-a674.log.sha256)。

2026-10-11正式门禁a668（纳入V1.3共享StageRun真实隔离验证、Fixture模式元数据修复、完整代码套件与A49 Crosswalk后）：五阶段文档审计PASS；本地证据审计PASS（1530引用、240份Manifest、379项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。四个历史TestRun结构化导出、阶段剩余交付、开放决定、环境/恢复和本人验收仍未满足。[a668门禁](../../../evidence/audits/2026-10-11-v1-formal-gate-a668.log)、[退出码](../../../evidence/audits/2026-10-11-v1-formal-gate-a668.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-formal-gate-a668.log.sha256)。

2026-10-11正式门禁a667（纳入V1.1/V1.2真实隔离证据导出验证、A47 Crosswalk及进度/计划/验收同步后）：五阶段文档审计PASS；本地证据审计PASS（1526引用、239份Manifest、378项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。四个指定历史TestRun结构化导出、阶段剩余工程与交付、开放决定、恢复/目标环境和本人验收仍未完成。[a667门禁](../../../evidence/audits/2026-10-11-v1-formal-gate-a667.log)、[退出码](../../../evidence/audits/2026-10-11-v1-formal-gate-a667.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-formal-gate-a667.log.sha256)。

2026-10-11正式门禁a666（纳入V1.1/V1.2真实隔离证据导出验证及A47 Crosswalk后）：五阶段文档审计PASS；本地证据审计PASS（1523引用、238份Manifest、377项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。四个指定历史TestRun结构化导出、阶段剩余工程与交付、开放决定、恢复/目标环境和本人验收仍未完成。[a666门禁](../../../evidence/audits/2026-10-11-v1-formal-gate-a666.log)、[退出码](../../../evidence/audits/2026-10-11-v1-formal-gate-a666.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-formal-gate-a666.log.sha256)。

2026-10-11正式门禁a658（纳入A40 Crosswalk锚点修复、共享费用测试计划及执行记录后）：五阶段文档审计PASS；证据审计PASS（1475引用、226份Manifest、365项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。四个指定历史TestRun结构化导出、阶段剩余工程、开放决定、目标环境/恢复和本人验收仍未完成。[a658门禁](../../../evidence/audits/2026-10-11-v1-version-gate-a658.log)、[退出码](../../../evidence/audits/2026-10-11-v1-version-gate-a658.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-version-gate-a658.log.sha256)。

2026-10-11正式门禁a659（纳入V1.1 §8.43静态客户端方法测试引用盘点与Crosswalk A41后）：文档审计PASS；证据审计PASS（1482引用、227份Manifest、366项）；V1仍`INCOMPLETE`/exit 2，四个指定历史Run导出、阶段剩余工程、开放决定、目标环境/恢复及人工验收未完成。[a659门禁](../../../evidence/audits/2026-10-11-v1-version-gate-a659.log)、[退出码](../../../evidence/audits/2026-10-11-v1-version-gate-a659.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-version-gate-a659.log.sha256)。

2026-10-11正式门禁a660：文档审计PASS；证据审计PASS（1485引用、228份Manifest、367项）；V1仍`INCOMPLETE`/exit 2，四个指定历史Run原始导出、阶段其余交付、开放决定、目标环境/恢复及人工验收未完成。[a660门禁](../../../evidence/audits/2026-10-11-v1-version-gate-a660.log)、[退出码](../../../evidence/audits/2026-10-11-v1-version-gate-a660.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-version-gate-a660.log.sha256)。

2026-10-11正式门禁a657（纳入V1.4共享CN_A费用模块、A40来源锚点复核与测试计划同步后）：五阶段文档审计PASS；证据审计PASS（1474引用、226份Manifest、365项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。V1.2/V1.5四个指定历史TestRun结构化导出仍缺，五阶段剩余工程、未决决定、目标环境/恢复和本人验收仍未满足。[a657门禁](../../../evidence/audits/2026-10-11-v1-version-gate-a657.log)、[退出码](../../../evidence/audits/2026-10-11-v1-version-gate-a657.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-version-gate-a657.log.sha256)。

2026-10-11 Crosswalk A40：V1.4需求映射了5个共享CN_A费用测试；V1.4 test-plan来源锚点同步，V1.5来源锚点改为其自身行；检查PASS（147需求、1822路径、691目标、220精确测试、147来源锚点）。此追踪状态不代表L18/P4或版本验收通过。[A40](../../../evidence/audits/2026-10-11-v1-crosswalk-current-a40.log)。

2026-10-11 P1/A04静态方法测试引用盘点：20个A06/A23所列生成客户端中71个当前生产使用方法，在同服务且引用同一客户端类的测试内均找到方法调用；Crosswalk A41通过。该词法筛查不代表测试断言充分、业务行为或HTTP授权/副作用通过；V1.1-S2-L14、P1、阶段自动验收及人工签署状态不变。详见[V1.1 §8.43](./01-environment-and-web-center.md#843-v1生成客户端生产方法测试引用静态盘点2026-10-11)及[A41](../../../evidence/audits/2026-10-11-v1-crosswalk-current-a41.log)。

2026-10-11正式门禁a654：五阶段文档审计PASS；证据审计PASS（1462引用、223份Manifest、362项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。V1.2/V1.5四个指定历史TestRun结构化导出仍缺，五阶段剩余交付、开放决定、实际恢复/Ubuntu环境及本人验收条件未满足。[a654门禁](../../../evidence/audits/2026-10-11-v1-version-gate-a654.log)，[退出码](../../../evidence/audits/2026-10-11-v1-version-gate-a654.exit.txt)，[SHA-256](../../../evidence/audits/2026-10-11-v1-version-gate-a654.log.sha256)。

2026-10-11正式门禁a653：五阶段文档审计PASS；证据审计PASS（1458引用、222份Manifest、361项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。V1.2/V1.5四个指定历史TestRun结构化导出仍缺，五阶段剩余交付、开放决定、实际恢复/Ubuntu环境及本人验收条件未满足。[a653门禁](../../../evidence/audits/2026-10-11-v1-version-gate-a653.log)，[退出码](../../../evidence/audits/2026-10-11-v1-version-gate-a653.exit.txt)，[SHA-256](../../../evidence/audits/2026-10-11-v1-version-gate-a653.log.sha256)。

2026-10-10当前正式门禁a626：V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`；五阶段文档审计PASS，证据审计PASS（1368引用、199份Manifest、338项）。V1.4新增锁跌停SELL真实持仓/可卖Reservation拒绝与释放隔离证据；四个指定历史TestRun导出、OD-013/014与旧Run决定、活动/全域恢复、Mac睡眠唤醒、Ubuntu实机和当前范围本人验收仍未满足。[a626门禁](../../../evidence/audits/2026-10-10-v1-version-gate-a626.log)，[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a626.log.sha256)。


2026-10-10 V1.3 Run创建及外部订单观察模式注入拒绝自动补测通过：Run创建和外部订单观察两入口三种模式组合均422，Run创建后有效Run仍能正常执行；外部观察前后Run对账读数不变，完整V1.3模式场景39次拒绝尝试，订单/Fill为0、账本不变，同Run CLI及清理通过。详情见[阶段§8.63](./03-fake-broker-trading-loop.md#863-v13-run创建与外部订单观察模式注入拒绝2026-10-10)。此自动证据不构成人工验收，V1.3全服务/Worker路由矩阵仍开放。

正式V1门禁a415（V1.3外部订单观察模式边界补测、索引及阶段记录同步后）：五阶段文档审计PASS；证据审计PASS（998引用、139份Manifest、278项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。四个历史Run结构化导出、阶段交付/用户人工验收、待决政策、活动数据恢复及Ubuntu实机仍开放。[a415日志](../../../evidence/audits/2026-10-10-v1-version-gate-a415.log)，SHA-256 `ca7f5e55d0641080bf72c6a65a7f72a23567f126287efc2dcc9e03d3ea5fbf86`。

正式V1门禁a416（V1.3 Run创建及外部订单观察模式边界证据、追溯与计划同步后）：五阶段文档审计PASS；证据审计PASS（1001引用、139份Manifest、278项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。四个历史TestRun结构化导出、阶段交付/新增范围人工验收、待决政策及历史Run处置、活动恢复与Ubuntu实机条件仍开放。[a416日志](../../../evidence/audits/2026-10-10-v1-version-gate-a416.log)，SHA-256 `c3904adb0a9cdff6a5e2aaadaa17fb1c6ce5db260d02d4f4a8c53acb83b23937`。

2026-10-10 V1.3人工批准等待与低现金场景复验：在Web状态显式达到`APPROVED_MANUAL`后提交，Portfolio返回409/`INSUFFICIENT_AVAILABLE_CASH`，Reservation、订单和账本无副作用。定向测试1/1、完整V1.3隔离Web/API/CLI/export E2E 27/27、V1.3 code suite均通过，资源清理通过；首轮竞态失败保留。细节与Hash见[阶段§8.64](./03-fake-broker-trading-loop.md#864-v13人工批准等待与低现金拒绝回归-2026-10-10)。这是自动测试稳定性/可诊断性修复，不构成人工验收，也不关闭V1.3-S2-L13父项。

正式V1门禁a417（V1.3批准/低现金回归及追踪同步后）：五阶段文档审计PASS，证据审计PASS（1005引用、139份Manifest、278项），V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。四个历史Run导出、五阶段交付与新增范围人工验收、待决政策/旧Run处置、活动恢复和Ubuntu实机仍开放。[a417日志](../../../evidence/audits/2026-10-10-v1-version-gate-a417.log)，SHA-256 `e27fe3905f315a1375712297a1becbc373bdb84e895d0e6ebdebbb840d4bbbf3`。

正式V1门禁a414（历史台账映射与V1.4当前树验证记录同步后）：五阶段文档审计PASS；证据审计PASS（994引用、138份Manifest、277项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。四个历史TestRun结构化导出、五阶段当前交付/人工验收、政策/旧Run处置、活动恢复与Ubuntu条件仍开放。[a414日志](../../../evidence/audits/2026-10-10-v1-version-gate-a414.log)，SHA-256 `1ff6f942b34b0128b065f4f7da4ead25e013b5d284933277c624f36d1abc7400`。

正式V1门禁a413（V1.4当前树隔离E2E及P1全局基线证据同步后）：五阶段文档审计PASS；证据审计PASS（993引用、138份Manifest、277项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。四个历史TestRun导出、五阶段交付及当前范围人工验收、政策/旧Run处置、活动恢复和Ubuntu条件仍未满足。[a413日志](../../../evidence/audits/2026-10-10-v1-version-gate-a413.log)，SHA-256 `a27fc2394c106c772dcd25c892306ee9604ff2aa551d3a4f4ae977854e4723c7`。

正式V1门禁a412（V1.4模式边界E2E、追溯索引与进度记录同步后）：阶段文档审计PASS；证据审计PASS（992引用、138份Manifest、277项）；版本仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。四个历史TestRun结构化导出、五阶段交付/人工验收、待决政策、活动恢复和Ubuntu实机条件仍未满足。[a412日志](../../../evidence/audits/2026-10-10-v1-version-gate-a412.log)，SHA-256 `5963f7837db0e8d532eacfb580dd794e764fbd07454fe9296fdd0a70b527caaa`。

正式V1门禁a411（当前差异快照同步后）：五阶段文档审计PASS；证据审计PASS（986引用、137份Manifest、276项）；版本仍INCOMPLETE/exit 2，uncheckedVersionGate=true。四个历史TestRun导出、阶段交付/人验及其他版本门禁仍未满足。[a411日志](../../../evidence/audits/2026-10-10-v1-version-gate-a411.log)，SHA-256 `f805749a9020f064b9c569b2d120ec05815fd4e2d1e1f0429e4f8206484c1b3f`。


2026-10-10 V1.4当前工作树回测模式拒绝复验：`pnpm test:integration:v14-backtest`受控本机执行exit 0；四种环境/券商模式注入均422且Quant Run计数不变，Web/API Run由同ID CLI断言核验，Playwright 5/5，随机容器/卷/网络清理通过。完整步骤、Fixture/代码Hash、动态URL规则及首次沙箱权限失败均见[V1.4 §8.19](./04-daily-backtest.md#819-v14当前工作树模式拒绝与回测webapicli复验2026-10-10)及[a03日志](../../../evidence/audits/2026-10-10-v14-mode-boundary-e2e-a03.log)。只关闭V1.4回测创建入口固定模式矩阵子项；全V1路由矩阵、OD-014、完整规则、Ubuntu与当前范围人工验收仍开放。

2026-10-10正式门禁a410：五阶段文档审计PASS、证据审计PASS（984引用、136份Manifest、275项）；TestRun审计仍有四个历史结构化导出缺失，版本`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。五阶段当前交付/人工验收、待决政策、活动恢复与Ubuntu实机门禁仍未完成。[a410日志](../../../evidence/audits/2026-10-10-v1-version-gate-a410.log)，[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a410.log.sha256)。

2026-10-10正式门禁a409：五阶段文档审计PASS、证据审计PASS（982引用、135份Manifest、274项）；TestRun审计仍有四个历史结构化导出缺失，V1为`INCOMPLETE`/exit 2。[a409日志](../../../evidence/audits/2026-10-10-v1-version-gate-a409.log)，[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a409.log.sha256)。

2026-10-10正式门禁a408：五阶段文档审计PASS、证据审计PASS（980引用、134份Manifest、273项）；TestRun审计检查11个ID，4个历史Run导出仍缺，整体V1为`INCOMPLETE`/exit 2。[a408日志](../../../evidence/audits/2026-10-10-v1-version-gate-a408.log)，[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a408.log.sha256)。

2026-10-10正式门禁a407（验收页与进度摘要同步后复跑）：文档审计PASS、证据审计PASS（976引用、132份Manifest、271项）；版本仍`INCOMPLETE`/exit 2，四个历史TestRun导出及版本其他必需条件未满足。[a407日志](../../../evidence/audits/2026-10-10-v1-version-gate-a407.log)，[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a407.log.sha256)。

2026-10-10 V1.4自动验收子项更新：§8.73固定ZERO_VOLUME拒绝与LIMIT_NOT_MARKETABLE过期两个真实隔离HTTP/PG场景均PASS，预留释放、零Fill/账本/资产副作用及同命令幂等通过；完整代码套件a04 exit 0。仅自动证据，不构成人工签署，V1.4仍PARTIALLY_IMPLEMENTED。[日志](../../../evidence/audits/2026-10-10-v14-terminal-reservation-release-code-suite-a04.log)。

2026-10-10正式门禁a406：五阶段文档审计PASS；证据审计PASS（976引用、132份Manifest、271项）；版本仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。TestRun审计检查11个ID，V1.2 `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`及V1.5 `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`仍缺结构化导出；用户验收及其他版本条件未完成。[a406日志](../../../evidence/audits/2026-10-10-v1-version-gate-a406.log)，[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a406.log.sha256)。

2026-10-10正式门禁a404：五阶段文档审计PASS，证据审计PASS（974引用、131份Manifest、270项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。TestRun审计检查11个ID，V1.2 `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`及V1.5 `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`仍缺原始结构化导出；当前范围签署、业务/环境门禁也未完成。[a404日志](../../../evidence/audits/2026-10-10-v1-version-gate-a404.log)，[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a404.log.sha256)。

2026-10-10正式门禁a354：阶段文档审计PASS，证据审计PASS（913引用、126份Manifest、265项），V1仍`INCOMPLETE`/exit 2。四个历史TestRun结构化导出和当前范围用户签署未完成；版本门禁适用项仍有未勾选条件。[a354日志](../../../evidence/audits/2026-10-10-v1-version-gate-a354.log)，[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a354.log.sha256)。

2026-10-10 V1.3增量自动验证：Proposal修订/审批及Session推进拒绝客户端模式注入，9次请求422且Proposal状态/版本/hash与Run Clock未变；合法模式由服务端派生。完整Web/API/CLI E2E 22/22和V1.3 code suite通过，见[阶段§8.49](./03-fake-broker-trading-loop.md#849-platform-proposal修订审批与session推进模式拒绝2026-10-10)。此自动结果不改变V1.3人工验收`NOT_RUN`及V1整体未完成状态。

2026-10-10最新正式门禁a351：阶段文档审计PASS，证据审计PASS（900引用、121份Manifest、260项），V1仍INCOMPLETE/exit 2。四个历史Run导出、五阶段交付关闭、OD-013/OD-014与旧Run决定、全V1业务恢复、Ubuntu实机及当前范围用户签署仍未完成。[a351日志](../../../evidence/audits/2026-10-10-v1-version-gate-a351.log)，[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a351.log.sha256)。

2026-10-10最新正式门禁a350：阶段文档审计PASS，证据审计PASS（896引用、120份Manifest、259项），版本仍INCOMPLETE/exit 2。四个历史结构化Run导出、五阶段工程/交付关闭、OD-013/OD-014和旧Run决定、全V1业务恢复、Ubuntu实机与当前范围人工验收仍未完成。[a350日志](../../../evidence/audits/2026-10-10-v1-version-gate-a350.log)，[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a350.log.sha256)。

2026-10-10最新正式门禁a349：阶段文档审计PASS，证据审计PASS（892引用、119份Manifest、258项），版本仍INCOMPLETE/exit 2。四个历史结构化Run导出、五阶段交付关闭、用户对当前范围签署、OD-013/OD-014及旧Run决定、全V1业务恢复和目标Ubuntu实机证据仍未完成。[a349日志](../../../evidence/audits/2026-10-10-v1-version-gate-a349.log)，[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a349.log.sha256)。

2026-10-10门禁a348：阶段文档与证据结构审计PASS（888引用、118份Manifest、257项）；版本仍INCOMPLETE/exit 2。四个历史结构化Run导出、五阶段业务/交付收尾、待决事项、旧Run处置、活动数据恢复、Ubuntu和当前范围人工验收未完成。V1.3 AUTO Mandate激活/暂停模式边界新增自动验证记录于[阶段§8.48](./03-fake-broker-trading-loop.md#848-platform-auto-mandate激活暂停模式拒绝2026-10-10)，不改变人工验收状态或签署。[a348门禁](../../../evidence/audits/2026-10-10-v1-version-gate-a348.log)，[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a348.log.sha256)。

2026-10-09增量状态：V1.5 Run Incident生命周期及共享Platform变更后的V1.1–V1.5代码/适用Web/API/CLI隔离回归均已通过；详见各阶段第8节与[项目进度](../../progress.md)。自动测试未增加人工签署。4个历史TestRun结构化导出、OD-014、3条旧非终态Run处置、活动数据/全域恢复、Ubuntu范围与人工验收仍未完成，V1门禁保持INCOMPLETE。

2026-10-09正式V1门禁a290：阶段文档与证据审计PASS（765引用、106份Manifest、245项），V1仍INCOMPLETE/exit 2；4个历史Run导出、业务决定、完整恢复、Ubuntu和当前范围人工验收未满足。V1.5能力阻塞/系统告警导航增量见阶段§8.22，未新增签署。[门禁日志](../../../evidence/audits/2026-10-09-v1-version-gate-a290.log)，[SHA-256](../../../evidence/audits/2026-10-09-v1-version-gate-a290.log.sha256)。

2026-10-09 V1.5最新增量：三日合成Fixture实现首日错过后两次执行与逐日收盘双账本核对；normal/AUTO/rejection/recovery四场景Web/API/CLI/export隔离E2E PASS，V1.5 code suite退出0。证据：[E2E](../../../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-aede7e79765691df51db.json)、[code suite日志](../../../evidence/audits/2026-10-09-v15-multi-session-code-suite-a01.log)；最新成交选择器回归：[四场景E2E](../../../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-45fbf478d4dcba196115.json)、[V1.5 code suite](../../../evidence/audits/2026-10-09-v15-fill-trace-selector-code-suite-a03.log)、[阶段手册第8.14节](./05-scheduling-and-recovery.md#814-auto三日fixture两次执行与逐日收盘对账2026-10-09)。此为合成Fixture，不证明真实市场日历、实时时钟/连续调度或结算；人类验收仍`NOT_RUN`。

2026-10-09正式V1版本门禁最新结果：`pnpm verify:version -- --version V1`退出2，状态`INCOMPLETE`；五阶段文档审计PASS、证据审计PASS（541引用/57 Manifest/196项）。门禁日志：[a147](../../../evidence/audits/2026-10-09-v1-version-gate-a147.log)，SHA-256 sidecar随附。历史结构化Run导出与版本完成条件未满足，V1不予签署完成。

2026-10-09最终门禁a148在本文件更新后复跑，仍`INCOMPLETE`/exit 2；阶段审计PASS、证据审计PASS（542/57/196）。四条历史结构化Run导出、V1.5新增人工验收及其它版本关闭项未完成。见[a148日志](../../../evidence/audits/2026-10-09-v1-version-gate-a148.log)及SHA sidecar。

2026-10-09当前复核：五阶段代码套件及限定隔离Web/CLI回归已记录，详见[本轮运行记录](../../../evidence/audits/2026-10-08-v1-development-run.md)。V1.5 normal NO_TRADE、双市场AUTO、暂停拒绝和CN_A UNKNOWN原单查询恢复均通过隔离Web/API/CLI/export E2E；AUTO预算账本、错过窗口后重评估、Trade恢复和重复派发也已有各自固定证据。最新AUTO撤单竞态固定场景已验证FakeBroker序号1部分Fill、序号2权威撤单、Portfolio余量释放及双账本MATCH（见[V1.5 §8.19.4](./05-scheduling-and-recovery.md#8194-auto-fakebroker撤单与部分fill竞态2026-10-09)及本轮[机器报告](../../../evidence/audits/2026-10-09-v15-auto-trade-cancellation-sq-v15-e2e-4e5746d1118a6280c5e6.json)）。真实日历/结算、实时时钟调度、多故障恢复、全V1含Artifact配对恢复、Ubuntu与当前新增范围人工验收仍未验。五阶段保持PARTIALLY_IMPLEMENTED，当前V1版本门禁INCOMPLETE；未新增人工签署。历史PASS仅适用当时范围。

2026-10-09 V1.5 AUTO撤单补验：FakeBroker持久订单在Trade HTTP响应延迟窗口收到Web取消，完成25/50股权威部分Fill、序号化撤单及剩余Portfolio reservation释放；独立账本MATCH，后续订单0。固定场景四个Web/API/CLI/export情景通过，不等同于完整AUTO正常完成或当前范围人工签署。详见[机器报告](../../../evidence/audits/2026-10-09-v15-auto-trade-cancellation-sq-v15-e2e-4e5746d1118a6280c5e6.json)和[V1.5 §8.19.4](./05-scheduling-and-recovery.md#8194-auto-fakebroker撤单与部分fill竞态2026-10-09)。

V1.5本轮新增范围人工验收结论：NOT_RUN。这里只验收本轮模拟范围，不代表原R1真实账户、R2实盘或全部R3增强通过。

2026-10-09 V1.5手册同步复核：最新四场景隔离E2E确认暂停拒绝、UNKNOWN原单恢复、双日AUTO错过窗口后次日重评估及收盘对账均PASS；当前工作区交互栈随机项目启动、Web/API HTTP 200、PAPER+FAKE/LIVE关闭与精确资源清理均通过。机器证据分别见[四场景E2E](../../../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-6e7301d0edfd5bcdb496.json)和[交互栈生命周期](../../../evidence/audits/2026-10-09-v15-interactive-stack-lifecycle-a01.json)。以上是自动化/运行手册证据；V1.5新增范围人工验收仍NOT_RUN，阶段仍PARTIALLY_IMPLEMENTED。

2026-10-09 V1.4当前树复验：代码套件和隔离E2E均exit 0，另完成交互栈启动及精确清理；五个浏览器用例截图/Trace已记录在[捕获清单](../../../evidence/audits/2026-10-09-v14-browser-captures-a01.json)，细节见[V1.4阶段记录](./04-daily-backtest.md)。操作手册已验证为Mac ARM64隔离操作可执行；V1.4仍PARTIALLY_IMPLEMENTED，本轮人工验收NOT_RUN，完整规则/结算、同输入Paper总账对照及Ubuntu未通过，不新增人工签署。
2026-10-07 V1.4 CN_A费用子项自动对照新增：Quant与FakeBroker在相同锁版费率下BUY/SELL及滑点费用一致，专用隔离PostgreSQL对BUY/SELL/部分BUY/零成交拒绝的持久订单与Fill事实核验通过；详见[费用一致性审计](../../../evidence/audits/2026-10-07-v14-cn-a-fee-parity.md)。V1.4总体仍PARTIALLY_IMPLEMENTED，完整适用市场规则、费税、结算、Paper总账一致性、Ubuntu和本轮用户确认均未通过；未新增人工签署。

2026-10-09 V1.5 AUTO取消恢复增量：FakeBroker提交后、Trade响应前从正式Web发出Run级取消；原订单恢复并完成1 Order/1 Fill，后续订单0、独立对账MATCH，Web/API/CLI/export四场景Harness通过。报告：[JSON](../../../evidence/audits/2026-10-09-v15-auto-trade-cancellation-sq-v15-e2e-64e119e1e01cdbd2515d.json)，完整V1.5代码套件exit 0见[日志](../../../evidence/audits/2026-10-09-v15-auto-cancel-after-commit-code-suite-a01.log)。新增范围仍需用户人工验收；不等于完整AUTO场景PASS或券商订单撤销仲裁完成。

2026-10-11正式门禁a680（纳入本轮Artifact阶段转换竞态、Crosswalk与最新项目状态后）：五阶段文档审计PASS；证据审计PASS（1566引用、250份Manifest、389项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。历史Run导出、阶段工程、开放决定、活动/目标环境恢复和本人验收仍未满足。[a680门禁](../../../evidence/audits/2026-10-11-v1-formal-gate-a680.log)、[退出码](../../../evidence/audits/2026-10-11-v1-formal-gate-a680.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-formal-gate-a680.log.sha256)。

2026-10-11正式门禁a679（纳入V1.2真实Pending Artifact对取消/进入发布阶段转换的双顺序并发验证、Crosswalk A56和最新进度/计划后）：五阶段文档审计PASS，证据审计PASS（1563引用、249份Manifest、388项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。四个历史TestRun导出、P1跨生产者Artifact生命周期/OD-013、活动切换、剩余交易/结算、目标Ubuntu/恢复及当前范围人工验收仍未完成。[a679门禁](../../../evidence/audits/2026-10-11-v1-formal-gate-a679.log)、[退出码](../../../evidence/audits/2026-10-11-v1-formal-gate-a679.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-formal-gate-a679.log.sha256)。

2026-10-11正式门禁a678（纳入V1.2双顺序并发fencing及最新计划/进度记录后）：五阶段文档审计PASS；证据审计PASS（1561引用、248份Manifest、387项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。四个指定历史TestRun结构化导出、剩余工程交付、开放决定、环境/恢复及本人验收仍未完成。[a678门禁](../../../evidence/audits/2026-10-11-v1-formal-gate-a678.log)、[退出码](../../../evidence/audits/2026-10-11-v1-formal-gate-a678.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-formal-gate-a678.log.sha256)。

2026-10-11正式门禁a677（纳入V1.2取消/完成两个并发行锁顺序、Crosswalk A54、测试计划/进度/计划同步后）：五阶段文档审计PASS；证据审计PASS（1558引用、247份Manifest、386项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。四个指定历史TestRun结构化导出、阶段剩余工程交付、开放决定、恢复/目标环境和本人验收仍未完成。[a677门禁](../../../evidence/audits/2026-10-11-v1-formal-gate-a677.log)、[退出码](../../../evidence/audits/2026-10-11-v1-formal-gate-a677.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-formal-gate-a677.log.sha256)。

2026-10-11正式门禁a676（纳入V1.2 §8.47取消/Artifact发布真实并发争锁测试、Crosswalk A53及阶段/进度记录后）：五阶段文档审计PASS；证据审计PASS（1551引用、246份Manifest、385项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。V1.2单Run取消/完成竞态与完整code suite通过；四个指定历史TestRun结构化导出、阶段剩余工程交付、开放决定、恢复/目标环境和本人验收仍未完成。[a676门禁](../../../evidence/audits/2026-10-11-v1-formal-gate-a676.log)、[退出码](../../../evidence/audits/2026-10-11-v1-formal-gate-a676.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-formal-gate-a676.log.sha256)。

## 1. 阶段验收

2026-10-11当前V1.1代码套件受控复跑exit 0、Web/API/CLI三场景E2E 3/3，同Run CLI核验与Evidence Bundle导出通过，详情见[阶段§8.55–8.56](./01-environment-and-web-center.md#856-v11当前树webapicli三场景及证据导出复验2026-10-11)和对应运行日志。三个新Run自动化断言通过，人工作业结论仍`NOT_RUN`。正式门禁a737仍为`INCOMPLETE`/exit 2；四个指定历史TestRun结构化导出、其余阶段工程、目标环境/恢复与本人验收未完成。

2026-10-11当前V1.1代码套件受控复跑exit 0，详情见[阶段§8.55](./01-environment-and-web-center.md#855-v11当前树完整代码套件受控回归2026-10-11)和原始日志。此为自动化代码检查，不改变本轮人工作业结论：仍`NOT_RUN`。正式门禁a732仍为`INCOMPLETE`/exit 2；四个指定历史TestRun结构化导出、其余阶段工程、目标环境/恢复与本人验收未完成。

| 阶段 | 后端/自动检查 | Web人工验收 | 证据/testRunId | 已知限制 | 签署/日期 |
|---|---|---|---|---|---|
| [V1.1 环境、账户初始化与 Web 验收中心](./01-environment-and-web-center.md) | PASS（当前范围实测；本地容器Web、验收中心、双市场账户初始化、owner隔离和同Run CLI/export；既有code/E2E证据复用，范围边界见阶段记录） | PASS（用户于2026-10-14确认精确候选整版验收通过） | 完成态核对Run：`8b250377-6207-4320-a0ac-6a4bd09db2a5`、`79616f50-aa8b-4ba7-a2dc-d20c1d814622`、`bbb31707-aaaf-423a-852b-c45247b72221`；正常/拒绝/恢复的完整执行范围见[主要路径汇总](../../../evidence/audits/2026-10-13-v1-current-core-e2e-a01.md)及阶段§8.68–8.69、§8.72–8.75；[逐包核验](../../../evidence/audits/2026-10-14-v1-closeout-selected-runs.json) | 全平台消费者/发布矩阵、活动旧栈存储切换、自动Artifact生命周期及Ubuntu实机按既定范围延期 | 用户于2026-10-14确认当前候选整版PASS，覆盖本阶段；源码/配置/Fixture SHA-256 `132535fbdf2bf1d50e4260e397424b3a47ef949dedcc62e58257c0a5697bd2d4`；证据关联代表Run `8b250377-6207-4320-a0ac-6a4bd09db2a5`；单Run原人工结论不改写 |
| [V1.2 小样本数据、真实 Qlib 与环境探针](./02-small-data-and-qlib.md) | PASS（当前范围实测；冻结双市场输入、真实Qlib 0.9.6训练/预测、不可变产物与Governance研究快照、取消和重启恢复；既有code/E2E证据复用，范围边界见阶段记录） | PASS（用户于2026-10-14确认精确候选整版验收通过） | 完成态核对Run：`f343a146-c01e-4b57-83e9-5cea9100dc0a`、`006c9746-b171-469d-a974-e3813e88502f`、`5c9abce6-34a3-445d-8879-04e9d2f26520`、`c50d5faf-aca0-4139-b3c5-0f054daab87d`；正常/拒绝/恢复的完整执行范围见[主要路径汇总](../../../evidence/audits/2026-10-13-v1-current-core-e2e-a01.md)及阶段§8.62–8.63、§8.68、§8.70；[逐包核验](../../../evidence/audits/2026-10-14-v1-closeout-selected-runs.json) | 真实行情、活动策略启用、模型收益有效性、真实Qlib Artifact跨卷配对恢复和Ubuntu实机未验收 | 用户于2026-10-14确认当前候选整版PASS，覆盖本阶段；源码/配置/Fixture SHA-256 `132535fbdf2bf1d50e4260e397424b3a47ef949dedcc62e58257c0a5697bd2d4`；证据关联代表Run `f343a146-c01e-4b57-83e9-5cea9100dc0a`；单Run原人工结论不改写 |
| [V1.3 治理、风控与模拟券商完整交易链路](./03-fake-broker-trading-loop.md) | PASS（当前范围实测；固定CN/US MANUAL/AUTO授权、预算/预留、FakeBroker成交/撤单、严格现金结算、独立账本及UNKNOWN原单恢复；既有code/E2E证据复用，范围边界见阶段记录） | PASS（用户于2026-10-14确认精确候选整版验收通过） | 完成态核对Run：`973b73fc-0aef-4c60-abef-15c982322c46`；正常/拒绝/恢复的完整执行范围见[主要路径汇总](../../../evidence/audits/2026-10-13-v1-current-core-e2e-a01.md)及阶段§8.80–8.81、§8.87、§8.91、§8.113–8.118；[逐包核验](../../../evidence/audits/2026-10-14-v1-closeout-selected-runs.json) | 固定Fixture之外的全市场规则/故障穷举、活动发布回退和Ubuntu实机延期 | 用户于2026-10-14确认当前候选整版PASS，覆盖本阶段；源码/配置/Fixture SHA-256 `132535fbdf2bf1d50e4260e397424b3a47ef949dedcc62e58257c0a5697bd2d4`；证据关联代表Run `973b73fc-0aef-4c60-abef-15c982322c46`；单Run原人工结论不改写 |

2026-10-11新增OD-014结算调用边合同与身份拒绝回归：Platform→Trade、Trade→Portfolio两个生成客户端现有直接载荷/身份/超时/拒绝响应断言；Portfolio settlement HTTP拒绝矩阵及Trade错误Replay身份结算请求均验证无应收副作用；完整V1.3 code suite exit 0，详见[阶段§8.82](./03-fake-broker-trading-loop.md#882-od-014结算调用边生成客户端合同复验2026-10-11)和[路由审计A24](../../../evidence/audits/2026-10-11-v1-cross-service-route-matrix-a24.md)。这些是自动化证据，当前V1.3新增范围人工验收保持NOT_RUN。
| [V1.4 日线历史回测与可核对报告](./04-daily-backtest.md) | PASS（当前范围实测；固定日线回测、费用/滑点/限制/结算、报告与刷新恢复、固定CN/US Quant/Paper账本对照；既有code/E2E证据复用，范围边界见阶段记录） | PASS（用户于2026-10-14确认精确候选整版验收通过） | 完成态核对Run：`d8470c00-1f11-479e-85ed-2ab5210dba92`、`c463f556-ffca-4184-be7c-4253da14e94b`、`d017efde-d6ec-4008-99b6-ffce035d77e3`；正常/拒绝/恢复的完整执行范围见[主要路径汇总](../../../evidence/audits/2026-10-13-v1-current-core-e2e-a01.md)及阶段§8.104、§8.108、§8.113–8.117；[逐包核验](../../../evidence/audits/2026-10-14-v1-closeout-selected-runs.json) | 全市场日历、客户费税和全规则/全事件Parity未验收；US费用为合成Fixture | 用户于2026-10-14确认当前候选整版PASS，覆盖本阶段；源码/配置/Fixture SHA-256 `132535fbdf2bf1d50e4260e397424b3a47ef949dedcc62e58257c0a5697bd2d4`；证据关联代表Run `d8470c00-1f11-479e-85ed-2ab5210dba92`；单Run原人工结论不改写 |
| [V1.5 无人逐笔操作、故障恢复与 V1 验收](./05-scheduling-and-recovery.md) | PASS（当前范围实测；真实NATS/Temporal、固定日历AUTO/日终对账、关页/Worker重启、重投幂等/UNKNOWN及实际业务本地配对恢复；既有code/E2E证据复用，范围边界见阶段记录） | PASS（用户于2026-10-14确认精确候选整版验收通过） | 完成态核对Run：`baf7dfea-2a62-48a3-879b-9ece98b5ae0f`、`f060fa86-0fe5-4322-9fc1-8fa6a6f30890`、`dce571d9-51d7-4d2b-a5e4-a933ce384594`；正常/拒绝/恢复的完整执行范围见[主要路径汇总](../../../evidence/audits/2026-10-13-v1-current-core-e2e-a01.md)及阶段§8.43、§8.48、§8.55–8.60；[逐包核验](../../../evidence/audits/2026-10-14-v1-closeout-selected-runs.json) | 长期实时时钟/睡眠唤醒、增强跨阶段导航、穷举故障、宿主/异地灾备及Ubuntu实机延期；Artifact卷仅合成探针 | 用户于2026-10-14确认当前候选整版PASS，覆盖本阶段；源码/配置/Fixture SHA-256 `132535fbdf2bf1d50e4260e397424b3a47ef949dedcc62e58257c0a5697bd2d4`；证据关联代表Run `baf7dfea-2a62-48a3-879b-9ece98b5ae0f`；单Run原人工结论不改写 |

2026-10-09 V1.1 Platform身份边界增量：七个受保护API操作匿名401/伪造owner403各7/7，控制器声明与探针清单对应；完整`pnpm test:integration:v11-stage-storage`退出0，代码门禁与Chromium normal/rejection/recovery 3/3、同Run CLI/export和隔离资源清理通过。证据见[身份边界审计](../../../evidence/audits/2026-10-09-v11-platform-identity-boundary-a01.md)及[完整代码/浏览器日志](../../../evidence/audits/2026-10-09-v11-platform-identity-code-suite-a01.log)。新增Run人工结论均NOT_RUN；V1.1及整版V1结论仍未关闭，不新增用户签署。

2026-10-09 V1.2 Platform身份边界增量：新增路由矩阵逐项验证11条Acceptance API路由匿名访问401、伪造owner访问403；完整V1.2代码套件在Docker可用环境exit 0，Web/API/CLI四个TestRun及清理通过。详见[身份边界审计](../../../evidence/audits/2026-10-09-v12-platform-identity-boundary-a01.md)及[完整代码日志](../../../evidence/audits/2026-10-09-v12-platform-identity-code-suite-a01.log)。V1.2仍PARTIALLY_IMPLEMENTED：本轮用户验收未执行，历史TestRun导出及Ubuntu实机仍未满足，不新增人工签署。

2026-10-09 V1.3 Governance授权模式注入增量：执行授权签发与验证两条真实隔离HTTP/PostgreSQL路由，对`LIVE/FAKE`、`PAPER/REAL`、`LIVE/REAL`六种组合均返回422；验证失败探针不消费ACTIVE授权，随后合法并发验证为`CONSUMED`/`REPLAYED`。完整V1.3代码套件exit 0，见[阶段§8.32](./03-fake-broker-trading-loop.md#832-governance执行授权签发验证模式注入拒绝-2026-10-09)及[日志](../../../evidence/audits/2026-10-09-v13-governance-mode-injection-code-suite-a01.log)。V1.3完整业务接受链、人工验收和版本级门禁仍未通过。

正式V1门禁a245：五阶段文档审计PASS、证据审计PASS（649引用、75份Manifest、351项），V1仍INCOMPLETE/exit 2；四个历史TestRun结构化导出、OD-014结算决策、实际业务配对恢复、目标Ubuntu实机和当前范围人工验收仍未满足。[a245日志](../../../evidence/audits/2026-10-09-v1-version-gate-a245.log)，[SHA-256](../../../evidence/audits/2026-10-09-v1-version-gate-a245.log.sha256)。

2026-10-09 V1.3 Platform交易模式注入增量：账户初始化、Proposal创建、AUTO Mandate创建与MANUAL、sequenced-MANUAL、AUTO三条执行入口对三种非法模式组合共18次均422；AUTO Mandate未创建，订单/Fill为0且Portfolio账本不变。定向Web/API回归exit 0；完整V1.3代码套件exit 0；完整Web/API/CLI 22/22通过，同Run TestRun `d938c4e8-0ef0-4b4f-abe9-a0c7a83ec4b6`及Manifest hash `64c0805fef6f0d86dcd168bb61a772fa087236b8fd40ff1510fdb83349c6af1d`。详见[阶段§8.33](./03-fake-broker-trading-loop.md#833-platform-auto-mandate执行路由模式注入拒绝-2026-10-09)及[A05矩阵](../../../evidence/audits/2026-10-09-v1-cross-service-route-matrix-a05.md#v13-platform交易模式注入拒绝子矩阵2026-10-09)。这仅关闭列明的Platform端点子项，不关闭全V1模式审计、P3或整阶段验收。

正式V1门禁a247：阶段文档审计PASS、证据审计PASS（653引用、73份Manifest、212项），V1仍INCOMPLETE/exit 2。a246曾因旧源码执行快照SHA清单在PRD中的引用未标注历史状态而出现证据审计FAIL；原始日志保留，哈希清单未重写，修正文档标签后的a247审计通过。四个历史TestRun结构化导出、OD-014结算决策、实际业务配对恢复、目标Ubuntu实机和当前范围人工验收仍未满足。[a246失败日志](../../../evidence/audits/2026-10-09-v1-version-gate-a246.log)，[a247日志](../../../evidence/audits/2026-10-09-v1-version-gate-a247.log)，[SHA-256](../../../evidence/audits/2026-10-09-v1-version-gate-a247.log.sha256)。

正式V1门禁a248：上述快照标签修正及V1.3模式拒绝证据入索引后复核，阶段文档审计PASS、证据审计PASS（656引用、74份Manifest、213项），V1仍INCOMPLETE/exit 2；四个历史导出、OD-014、真实业务恢复、目标Ubuntu和当前范围人工验收仍未满足。[a248日志](../../../evidence/audits/2026-10-09-v1-version-gate-a248.log)，[SHA-256](../../../evidence/audits/2026-10-09-v1-version-gate-a248.log.sha256)。

正式V1门禁a249：文档链接检查与a248记录同步后复核，阶段文档审计PASS、证据审计PASS（658引用、75份Manifest、214项），V1仍INCOMPLETE/exit 2；四个历史导出、OD-014、实际业务配对恢复、Ubuntu实机和当前范围人工验收未满足。[a249日志](../../../evidence/audits/2026-10-09-v1-version-gate-a249.log)，[SHA-256](../../../evidence/audits/2026-10-09-v1-version-gate-a249.log.sha256)。

正式V1门禁a250：阶段文档审计PASS、证据审计PASS（660引用、76份Manifest、215项）；V1仍INCOMPLETE/exit 2。四个历史TestRun导出、OD-014、实际业务配对恢复、Ubuntu实机和当前范围人工验收仍未满足。[a250日志](../../../evidence/audits/2026-10-09-v1-version-gate-a250.log)，[SHA-256](../../../evidence/audits/2026-10-09-v1-version-gate-a250.log.sha256)。

正式V1门禁a251：纳入V1.3账户初始化/交易模式拒绝的最终隔离回归后，阶段文档审计PASS、证据审计PASS（662引用、77份Manifest、216项），V1仍INCOMPLETE/exit 2；四个历史导出、OD-014结算、配对恢复、目标Ubuntu实机和当前范围人工验收仍未完成。[a251日志](../../../evidence/audits/2026-10-09-v1-version-gate-a251.log)，[SHA-256](../../../evidence/audits/2026-10-09-v1-version-gate-a251.log.sha256)。

2026-10-07 V1.3最新隔离E2E补充：带一次性费用更正Outbox失败注入的正式隔离Web/API/CLI矩阵21/21浏览器用例通过，全部Run均有独立结构化导出；在此前L01-L10场景上新增持久版本化Fixture日历推进、同日SELL零副作用拒绝及下一交易日T+1 SELL双账核对。详见[本轮Session推进及T+1审计](../../../evidence/audits/2026-10-07-v13-tplus1-session-advance.md)和[此前20项矩阵审计](../../../evidence/audits/2026-10-07-v13-web-matrix-20-20.md)。所有新增Run人工验收仍NOT_RUN，V1.3继续PARTIALLY_IMPLEMENTED。

2026-10-09 V1.3 FakeBroker独立资产GET补证：Trade HTTP+隔离PostgreSQL smoke及改后完整V1.3代码套件a02通过；允许Platform身份精确读回独立账本的owner/TestRun、现金及持仓，错误服务身份403、未知账户/namespace404、缺少范围参数422。证据见[阶段§8.38](./03-fake-broker-trading-loop.md#838-fakebroker独立账户资产http读取契约2026-10-09)、[HTTP+PG日志](../../../evidence/audits/2026-10-09-v13-independent-assets-http-a02.log)和[完整代码套件](../../../evidence/audits/2026-10-09-v13-independent-assets-code-suite-a02.log)。这只覆盖独立资产读取原子项；完整FakeBroker生命周期合同、P3父项、V1.3当前范围人工验收仍未完成，未新增签署。

2026-10-09 V1.3 Proposal决策模式拒绝增量：Governance Approve、Reject与Revise路由对三种LIVE/REAL模式组合共九次请求均返回422，数据库中Proposal继续为版本1/PENDING，决策和修订记录均为0；随后合法审批继续通过。定向HTTP+PG smoke及完整V1.3代码套件a02通过，详见[阶段§8.39](./03-fake-broker-trading-loop.md#839-governance-proposal审批修订拒绝模式注入2026-10-09)、[HTTP+PG日志](../../../evidence/audits/2026-10-09-v13-proposal-mode-decision-revision-http-a02.log)、[完整套件](../../../evidence/audits/2026-10-09-v13-governance-proposal-mode-boundary-code-suite-a02.log)。此项仅关闭Governance决策/修订路由边界；L17和P3父项仍开放，未新增用户签署。

2026-10-09 V1.3 AUTO Mandate pause模式拒绝增量：三种LIVE/REAL模式篡改均422，独立账本显示Mandate仍ACTIVE且事件数不变；随后合法pause成功。隔离HTTP+PG smoke及完整V1.3代码套件通过，详见[阶段§8.40](./03-fake-broker-trading-loop.md#840-auto-mandate暂停路由模式注入拒绝2026-10-09)、[HTTP+PG日志](../../../evidence/audits/2026-10-09-v13-governance-auth-http-a06.log)和[完整套件](../../../evidence/audits/2026-10-09-v13-auto-mandate-pause-mode-boundary-code-suite-a01.log)。该项仅关闭pause命令原子边界，L17/P3父项仍开放，未新增用户签署。

2026-10-09 V1.3 Trade订单转换模式载荷拒绝：对持久部分成交FakeBroker订单，`cancel`、`expire`、`unknown`与`cancel-result`四类写请求注入LIVE/REAL字段均422；订单状态、事件、Fill和Outbox事实未变化，随后合法撤单/结果继续完成。定向HTTP+隔离PG和完整V1.3代码套件通过，见[阶段§8.41](./03-fake-broker-trading-loop.md#841-trade订单取消到期unknown路由拒绝模式载荷2026-10-09)、[HTTP+PG日志](../../../evidence/audits/2026-10-09-v13-trade-transition-mode-http-a01.log)、[完整套件](../../../evidence/audits/2026-10-09-v13-trade-transition-mode-code-suite-a01.log)。Trade body-less转换接口现拒绝任意非空载荷。由于与V1.5共享路由，V1.5回归须单独通过；L17/P3仍开放且未新增用户签署。

正式V1门禁a268在本条验收记录新增前完成：文档与证据审计PASS（693引用、86份Manifest、225项），V1仍INCOMPLETE/exit 2。新增验收记录和后续文档同步由[a270](../../../evidence/audits/2026-10-09-v1-version-gate-a270.log)复核：链接、阶段文档和证据审计PASS（697/87/226），版本结论不变。[a268 SHA-256](../../../evidence/audits/2026-10-09-v1-version-gate-a268.log.sha256)、[a270 SHA-256](../../../evidence/audits/2026-10-09-v1-version-gate-a270.log.sha256)。

2026-10-07 V1.1存储切换前置补充：隔离PostgreSQL持久化/HTTP复验验证迁移幂等、历史记录保留、stage owner读取、双写及失败回滚；HTTP owner读取200、跨owner 403，容器/网络精确清理通过。日志与边界见[V1.1存储复验](../../../evidence/audits/2026-10-07-v11-storage-persistence-rerun.md)。活动数据库/API保持原样，切换仍NOT_AUTHORIZED/NOT_DEPLOYED；本条不新增人工验收或签署。

2026-10-07 V1.5 NO_TRADE Temporal normal切片：正式容器Web/API/CLI/export隔离E2E 1/1通过，TestRun `9e08dadd-c56f-422b-b7e6-aa3250b2d065`验证60个CN及60个US虚拟交易日、120条Portfolio/FakeBroker权威观测，`V1.5-HOLD-002` PASS；同Run CLI check-only按WAITING返回2，证据导出0。拒绝/恢复分别创建Run `b0e2f24e-1977-42c1-8d15-3fc381aa2eed`、`37619e69-5c30-4571-8ba9-8ea4f8c5ead1`，其业务事实如实NOT_CONNECTED/NOT_RUN，但CLI/export路径通过。隔离资源清理及零真实来源/券商调用通过。完整边界见[本轮机器审计](../../../evidence/audits/2026-10-07-v15-no-trade-workflow-e2e.json)；这不关闭V1.5拒绝/恢复、NATS事件驱动、双Worker、UNKNOWN、备份、Ubuntu、人工验收或历史缺失Run，V1门禁保持未完成。

2026-10-09 V1.4 A08增量：V1.4完整code suite在加入USD Fixture FakeBroker/Quant BUY/SELL对照后退出0；[日志](../../../evidence/audits/2026-10-09-v14-code-suite-a08.log)、[机器证据](../../../evidence/audits/2026-10-09-v14-us-fixture-parity-a08.json)。这不代表美国真实市场费税或完整Paper账本/结算规则已验证。

2026-10-09 V1.4当前工作区回归：`pnpm verify:stage -- --stage V1.4 --suite code`在禁网linux/arm64锁版Python Worker镜像中退出0，Worker 14/14；六个CN/US Quant与持久FakeBroker/PostgreSQL订单结果逐字段一致，隔离Market Data集成28/28、迁移CLI和报告Artifact fencing均通过。[完整日志](../../../evidence/audits/2026-10-09-v14-code-suite-current-a01.log)、[SHA-256](../../../evidence/audits/2026-10-09-v14-code-suite-current-a01.log.sha256)。此自动证据不代表P4整体通过、OD-014结算已决、当前范围人工验收完成或用户已签署。

2026-10-09 V1.4历史费率对照增量：当前完整套件a02 exit 0，持久FakeBroker/PostgreSQL与Quant新增比较2023-08-28生效日前后CN_A费率版本各自BUY/SELL；全场景共10笔订单、9笔Fill/Outbox，逐项匹配且隔离资源清理通过。[完整日志](../../../evidence/audits/2026-10-09-v14-code-suite-current-a02.log)、[SHA-256](../../../evidence/audits/2026-10-09-v14-code-suite-current-a02.log.sha256)。仍属合成费率子集；不代表OD-014结算决定、完整规则、Ubuntu或当前范围用户验收。

2026-10-09 V1.4当前工作区Web/API/CLI复验：隔离`pnpm test:e2e -- --stage V1.4` exit 0，Playwright 5/5；normal、rejection、recovery、market restrictions、historical fees、corporate actions和有界策略场景的TestRun完成，API/八个浏览器Run由同Run CLI校验，17个Platform Run及16个Quant BacktestRun/Manifest Hash配对通过，容器/卷/网络/镜像清理核验通过。[机器报告](../../../evidence/audits/2026-10-07-v14-durable-tasks-668a13697fcfa1b5d777.json)、[说明](../../../evidence/audits/2026-10-07-v14-durable-tasks-668a13697fcfa1b5d777.md)、[历史执行快照Hash清单](../../../evidence/audits/2026-10-07-v14-durable-tasks-668a13697fcfa1b5d777.sha256)。人工结论保持NOT_RUN；不代表OD-014、完整P4一致性、Ubuntu或用户已签署。

2026-10-09 V1.1 A04增量：新增隔离PostgreSQL迁移/统一存储集成检查并纳入V1.1 code suite，完整代码门禁退出0；证据：[机器摘要](../../../evidence/audits/2026-10-09-v11-code-suite-a04.json)、[原始日志](../../../evidence/audits/2026-10-09-v11-code-suite-a04.log)。这不改变活动迁移、完整手册、人工验收或V1.1阶段状态。

2026-10-09 V1.5 UNKNOWN recovery纵切：随机隔离项目`sq-v15-e2e-e09b3c5a08f1a6594056`完成正式容器Web/API/CLI/export四场景；恢复Run `1f1e2531-15f8-48c9-9333-ae46a4b861b7`在CN_A FakeBroker接受后丢失响应，原单查询首次被固定故障拒绝，Temporal活动随后使用原namespace/clientOrderId成功查回原订单。US_EQUITY控制单只执行一次；最终独立账本恰有CN/US各1订单和Fill，Outbox无未决项且reconciliation MATCH。Web断言两项PASS，同Run CLI/export均运行；项目容器、网络及卷精确清理，真实行情/券商调用0。机器时序/故障序列/Hash见[隔离E2E审计](../../../evidence/audits/2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-e09b3c5a08f1a6594056.json)。这仅关闭UNKNOWN原单查询子项；拒绝窗口/错过窗口/撤销在途Fill、预算独立对账、多日/日终、完整V1与Artifact恢复、Ubuntu实机及人工验收仍未完成。

2026-10-09 V1.1合同与场景冻结复核：当前树`pnpm test:e2e -- --stage V1.1`完整代码套件PASS，Chromium normal/rejection/recovery 3/3，三个Run分别为`2c2a7dd3-72d4-4eaa-a0ed-286fb946ca38`、`a93a70fd-f2a4-4684-950a-052def2eb077`、`55f0c68e-058c-4577-b4d7-dd67ece53a3b`；每个Run的2项断言PASS，同Run CLI和证据导出完成；人工结论均`NOT_RUN`。V1.1 §7“契约、数据结构、场景定义和预期结果已冻结”仅此一项勾选，其他交付/验收仍各自未关闭。[运行日志](../../../evidence/audits/2026-10-09-v11-core-contracts-current-e2e-a01.log)。

2026-10-09 P5最新自动化结论补充：Mandate暂停时，新AUTO订单在Portfolio预留/FakeBroker发送前被拒绝，已有授权订单继续Fill并入账，见[暂停后在途订单E2E](../../../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-91f6525571ab14125e64.json)及[运行日志](../../../evidence/audits/2026-10-09-v15-inflight-pause-e2e-a05.log)。Trade Execution在FakeBroker已持久提交后被重启，Temporal重试按原`clientOrderId`恢复同一订单，见[重启恢复E2E](../../../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-9ab3f1b90438b7f715eb.json)。锁版Worker和V1.5完整代码套件通过：[a25日志](../../../evidence/audits/2026-10-09-v15-missed-window-code-suite-a25.log)。另在当前树重跑V1.3 Web/API/CLI矩阵21/21；L07期间Trade重启、在途Fill和接受撤单后释放余量均MATCH（[审计](../../../evidence/audits/2026-10-09-v13-current-tree-cancel-restart-e2e-a01.json)）。这属于共享V1.3执行语义证据，不代替V1.5 AUTO TestRun撤销编排验收；本轮人工签署、多Worker交易接管和其他V1门禁仍未完成。

2026-10-12 V1.3 L16新增撤单前置拒绝与恢复场景：无已应用Fill、以及seq=2仅缓冲时撤单均409且订单/账本无变化；补交seq=1后按序完成Fill与seq=3接受撤单，最终账本MATCH。定向Run `e83b828f-c5a1-46a9-8b31-4c891a216809`及完整矩阵Run `09d8b01c-72d5-4824-bd7b-c0e6be64e116`均保持人工结论`NOT_RUN`；完整V1.3 E2E 40/40及code suite exit 0。六个不满足撤单请求业务前置的初始尝试作为诊断保留，见[V1.3 §8.113](./03-fake-broker-trading-loop.md#8113-v13-s2-l16-撤单前置拒绝无副作用与乱序恢复2026-10-12)。这只增加L16一个固定拒绝/恢复组合，不改变阶段或版本签收状态。


当前表仅列经过严格完成态/全PASS断言/Manifest校验的代表Run，并非全部业务场景清单；其余场景见原E2E报告。V1.3恢复/拒绝探针的原WAITING状态、V1.5 NO_TRADE观察Run `0142b7ca-43ca-4f79-bf55-d36eed38b813`的WAITING，以及取消Run的CANCELLED均保留，未改成PASS。上一版完整验收行与历史签署见[同步前快照](../../../evidence/audits/2026-10-14-v1-closeout-before-status-sync.json)。

## 2. 版本门禁

2026-10-14按已批准的Mac本地主要功能范围核实；原十项未关闭清单及旧结论保存在[同步前快照](../../../evidence/audits/2026-10-14-v1-closeout-before-status-sync.json)，不删除历史。逐项证据映射见[收尾核对记录](../../../evidence/audits/2026-10-14-v1-core-closeout-a01.md)。

- [x] 每阶段第7节当前范围交付项已核实；用户2026-10-14确认当前候选整版通过，签署与代表Run见上表。
- [x] 每阶段第8节当前范围均为VERIFIED_EXECUTABLE；已有实测启动/停止命令、动态URL、Fixture/参数/Hash、超时及恢复步骤，见各阶段§8.1–8.4与后续最新记录。
- [x] 正常/拒绝/恢复、适用code suite、浏览器E2E、同Run只读CLI及导出有命令/退出码/断言；当前未受影响证据复用，长期真实观察明确延期。
- [x] 五阶段当前主要功能及适用成功/拒绝/恢复场景通过；修复后的V1.3 40/40与V1.5 4/4通过，失败记录保留，不换seed掩盖失败。
- [x] 正式页面与验收中心使用业务API；持久后台任务、刷新/关闭页面和Worker重启恢复已有真实容器证据。
- [x] 独立FakeBroker订单/Fill/资产、严格现金/数量/可卖量、预算预留、幂等/UNKNOWN、固定PIT/owner运行隔离有实际断言。
- [x] FIXTURE数据、真实Qlib、FAKE券商、PAPER/BACKTEST环境、合成成本/成交模型及真实NATS/Temporal分别标注；未把仿真或探针称作真实目标环境/产物。
- [x] Mac本地容器及目标架构仿真记录/缺口明确；资源限制与小样本边界见阶段记录，Ubuntu实机、容量性能与长期观察为DEFERRED，不勾选其业务验收通过。
- [x] 阶段脚本、日志、截图/Trace、数值断言、迁移与本地实际AUTO业务配对恢复、操作说明齐备；真实Qlib Artifact跨卷恢复仍列已知限制。
- [x] 服务端LIVE/REAL失败关闭且真实券商（含只读）未接入；本轮仅自有FakeBroker模拟交付，安全模式拒绝和零业务副作用有实测。

## 3. 运行证据模板

| 字段 | 内容 |
|---|---|
| 版本/阶段/场景版本/testRunId | 待填写 |
| market/account/namespace | 待填写 |
| environmentMode/dataMode/modelMode/brokerMode/executionModel | 待填写 |
| Commit或工作区快照Hash/镜像Digest/依赖锁Hash/迁移/契约 | 待填写 |
| 输入数据/股票池/日历/规则/成本/策略/Mandate/时钟 | 待填写 |
| seed/固定故障场景/实际注入事件序列 | 待填写 |
| Mac或Ubuntu/CPU架构/是否模拟架构/资源配额 | 待填写 |
| 命令/退出码/自动断言/Trace/截图/报告 | 待填写 |
| 实际结果/预期/容差/未覆盖与原因 | 待填写 |
| 人工验收人/UTC时间/结论 | 待填写；NOT_RUN/PASS/FAIL |

本版全部必需门禁PASS才可标PASS；部分完成用文字说明范围，总结不能覆盖子项FAIL/NOT_RUN。后续数据扩容或镜像/代码变化需新证据，不覆盖历史签署。

2026-10-07 V1.5真实Temporal服务停机增量：Run `0871ddc3-9e7b-4669-b9c4-03a3182ecd31`在Temporal服务停止时创建，观察到真实派发失败/NAK；同一Temporal容器/持久卷恢复后，Run完成120项权威观察，normal/rejection/recovery Web、同Run CLI/export和隔离资源清理通过。证据：[停机恢复审计](../../../evidence/audits/2026-10-07-v15-temporal-server-outage-e2e.md)。此子项自动验证通过，不表示当前范围人工验收；数据库、网络、多Worker、备份、Ubuntu和历史Run缺口继续阻挡版本闭环。

2026-10-07 V1.5受限网络恢复子场景自动验证：Platform容器隔离网络断开3秒/恢复后同一Run完成120项；外部数据源/真实券商调用0，Web/CLI/export与资源清理通过。见[网络中断审计](../../../evidence/audits/2026-10-07-v15-network-outage-e2e.md)。此增量不替代双Worker、备份、目标Ubuntu及当前范围人工签署。

2026-10-07 V1.5数据库边界重试自动子场景：确定性仓储边界错误经JetStream NAK/同序号redelivery后同一Run完成120项；Web、同Run CLI/export、资源清理通过。证据：[数据库边界重试审计](../../../evidence/audits/2026-10-07-v15-database-retry-e2e.md)。PostgreSQL真实进程故障恢复及本轮人工验收仍未通过/签署。

2026-10-07 V1.5数据库边界错误后当前完整code suite：`pnpm verify:stage -- --stage V1.5 --suite code` exit 0；Platform 55文件/241测试、Python Worker 14/14及合同、Fixture、构建和服务测试均通过。日志与机器清单：[报告](../../../evidence/audits/2026-10-07-v15-database-retry-code-suite.md)。此门禁不代表真实PostgreSQL进程中断恢复或人工验收完成。

2026-10-07 V1.5 PostgreSQL会话恢复自动子场景：终止3个隔离Platform专属后端会话后，Platform建立新数据库会话，原Run完成120条权威观察；容器化Web、同Run CLI/export、项目清理通过。证据：[PG会话恢复审计](../../../evidence/audits/2026-10-07-v15-database-connection-drop-e2e.md)。这是当时的PG后端会话故障子场景；后续PostgreSQL进程停机/恢复已单独通过（见本节后续记录），主机/卷灾难恢复和新增范围人工验收仍未完成。

2026-10-07 V1.5 Platform PG会话恢复后code suite：完整`pnpm verify:stage -- --stage V1.5 --suite code` exit 0，Platform 55文件/241测试、Python Worker 14/14。报告和源码哈希见[重试/恢复后代码套件审计](../../../evidence/audits/2026-10-07-v15-database-recovery-code-suite.md)。

2026-10-07 V1.5双Worker dispatch幂等：两个独立Platform durable consumers都ACK同一normal TestRun，Temporal稳定Workflow ID重复启动按幂等路径收敛，120项NO_TRADE观察完成；browser normal/rejection/recovery、同Run CLI/export及隔离清理通过。报告：[E2E摘要](../../../evidence/audits/2026-10-07-v15-multiworker-e2e.md)、[机器记录及源码Hash](../../../evidence/audits/2026-10-07-v15-multiworker-e2e.json)。首次Harness尝试失败单独保留，详见[失败记录](../../../evidence/audits/2026-10-07-v15-multiworker-first-attempt-failure.md)。多Worker变更后当前完整V1.5 code suite exit 0（[日志和源码Hash](../../../evidence/audits/2026-10-07-v15-multiworker-current-code-suite.md)）。本次新增人工验收未执行；双Worker故障切换、交易/日终、UNKNOWN、备份恢复及目标Ubuntu仍未完成。


2026-10-07 V1.5 PostgreSQL进程中断恢复补验：隔离Harness终止PostgreSQL进程后重启同一容器/卷，同一JetStream序号被NAK并重投，原normal TestRun完成120项权威观察；normal/rejection/recovery浏览器路径、同Run CLI/export与精确清理通过。机器证据和13项源码SHA见[数据库进程故障审计](../../../evidence/audits/2026-10-07-v15-database-outage-e2e.md)。这不是宿主/卷灾备或备份恢复，不改变交易/日终、UNKNOWN、备份、目标Ubuntu及当前范围人工验收未完成的结论。首次尝试失败记录：[故障恢复首轮记录](../../../evidence/audits/2026-10-07-v15-database-outage-first-attempt-failure.md)。

2026-10-07 V1.5单Worker故障切换：独立durable主/备用Worker同时收到normal Run后，仅终止隔离主Platform/API容器；备用Worker启动该Run的Temporal Activity并ACK原JetStream序号，主API恢复后原Run完成120条权威观察。normal/rejection/recovery Web矩阵、同Run CLI/export、随机资源清理通过；外部来源和真实券商调用0。完整时序见[单Worker故障切换审计](../../../evidence/audits/2026-10-07-v15-worker-failover-e2e.md)。这是安全NO_TRADE切片，不代表UNKNOWN、真实交易/日终Workflow、双Worker同时故障、主机恢复、Ubuntu或当前范围人工验收。


2026-10-09环境兼容性增量：V1.1阶段文件记录的Platform API `linux/arm64`原生容器探针及`linux/amd64`仿真探针均PASS，完整输出与范围见[机器汇总](../../../evidence/audits/2026-10-09-v1-compatibility-probes.json)。该单服务架构探针不替代完整栈、Qlib/RD-Agent、资源/恢复、真实Ubuntu或当前范围人工验收；不改变V1.1/V1的未关闭状态及既有签署。


2026-10-09 V1.2/A06新增验证：不足历史双市场预检、Artifact到Governance逐字段绑定定向单测通过；此后V1.2完整代码套件与隔离Web/API/CLI正常、拒绝、探针恢复及Platform重启恢复通过，Run及限制见[机器摘要](../../../evidence/audits/2026-10-09-v12-insufficient-history-a06-summary.json)。新增工程证据不改变V1.2或V1阶段结论；当前范围人工验收、历史Run导出、完整缺失/退市语义、Ubuntu/全栈恢复仍待完成。正式V1门禁a27仍INCOMPLETE/exit 2（[日志](../../../evidence/audits/2026-10-09-v1-version-gate-a27.log)）。


2026-10-09 V1.5 Trade Execution订单提交后进程重启/原clientOrderId恢复切片：四场景隔离E2E [报告](../../../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-9ab3f1b90438b7f715eb.json)，完整代码套件 [日志](../../../evidence/audits/2026-10-09-v15-trade-worker-restart-code-suite-a01.log)。此自动化证据不替代当前范围人工验收。


2026-10-09 V1.5 AUTO TestRun取消：隔离E2E通过正式Web按钮，在Mandate授权后、FakeBroker发送前持久化取消请求；当前授权订单完成一个Fill与MATCH对账，后续订单为0。AUTO-CANCEL断言PASS，但完整AUTO订单断言保持WAITING；Web/API/CLI/export四场景和资源清理通过。详情与Run ID见[阶段§8.19](./05-scheduling-and-recovery.md#819-auto-testrun取消与当前授权fill收尾2026-10-09)及[JSON证据](../../../evidence/audits/2026-10-09-v15-auto-trade-cancellation-sq-v15-e2e-967e0b65c09fe54c5332.json)。该项不等于FakeBroker实际撤单/部分Fill竞态已完成；新增人工验收仍NOT_RUN。


2026-10-09 V1.5 AUTO TestRun级取消切片通过隔离四场景E2E（复验含实际Web/API动态URL与固定Fixture哈希），V1.5完整code suite exit 0；取消Run和本轮新增范围人工结论仍NOT_RUN/WAITING。V1总门禁复验exit 2/INCOMPLETE，4个历史TestRun仍缺结构化导出，且各阶段/版本级人工验收尚未完成。详见[取消运行记录](./05-scheduling-and-recovery.md#819-auto-testrun取消与当前授权fill收尾2026-10-09)和[版本门禁日志](../../../evidence/audits/2026-10-09-v1-version-gate-auto-cancel-a02.log)。

2026-10-09 V1.5 AUTO取消时钟边界增量：取消应用服务使用注入Clock记录操作事件时间；固定Clock单测与专用AUTO取消Web/API/CLI/export四场景E2E通过。最新E2E报告[JSON](../../../evidence/audits/2026-10-09-v15-auto-trade-cancellation-sq-v15-e2e-398bd38ec91b610d9653.json)，SHA-256 `eae703cdb96c21b2e8a396d0ca1de7382b61c9d42bf1fedbece4141c93687cb2`；V1.5完整代码套件exit 0（[日志](../../../evidence/audits/2026-10-09-v15-cancellation-clock-code-suite-a03.log)，SHA-256 `bfab65dee705c627db4fd918f6b61e1efd50c94d5a11e637918700a87b49a078`）。该时间戳只表示操作事件，不改变Fixture业务时钟。固定FakeBroker订单撤销/部分Fill仲裁已在§8.19.4验证；真实时钟延迟调度与当前范围用户验收仍未完成。


2026-10-09 Platform入口身份矩阵增量：V1.4五条、V1.5四条受保护路由均通过匿名401/伪造owner 403隔离探测，控制器清单匹配；V1.5 normal/AUTO/rejection/recovery完整隔离E2E exit 0。证据见V1.4 §8.8、V1.5 §8.20和交叉服务矩阵A05。本增量是工程证据，不构成人工验收签署，版本/阶段整体仍未通过。

2026-10-09 V1.2 Artifact失败路径补充：新增Governance handoff抛错时Run失败、pending Artifact未发布的应用层断言；重跑完整V1.2 code suite，Platform 300/300、隔离PG生命周期4/4，容器E2E四个Run均通过并完成清理。当前范围用户验收、历史Run导出和Ubuntu保持未完成，不新增签署。细节见[阶段§8.29](./02-small-data-and-qlib.md#829-artifact暂存与失败不可见2026-10-09)。

2026-10-09 V1.2 Artifact不可复活补强：暂存同内容若已处于EXPIRED状态现在拒绝重用；隔离PG覆盖过期后读取仍404、重试不恢复，完整V1.2 code suite和Web/API/CLI四Run再次通过。当前范围人验收、历史导出和Ubuntu不变。见[阶段§8.29](./02-small-data-and-qlib.md#829-artifact暂存与失败不可见2026-10-09)。

2026-10-09 V1.1新增模式边界E2E：当前源码隔离栈下六次客户端模式注入均422；V1.1 code/storage与Web normal/rejection/recovery通过，同Run CLI核对及精确资源清理完成。见[阶段§8.24](./01-environment-and-web-center.md#824-v11入口拒绝客户端交易模式注入2026-10-09)。这是开发者自动验收证据，不是新增用户签署；版本门禁[a252](../../../evidence/audits/2026-10-09-v1-version-gate-a252.log)仍INCOMPLETE/exit 2。

正式V1门禁a253：阶段文档审计PASS、证据审计PASS（665引用、78份Manifest、217项），V1仍INCOMPLETE/exit 2。未满足项仍含四个历史TestRun导出、OD-014结算、活动存储/非终态Run维护与跨域恢复、目标Ubuntu实机及版本级用户验收。[a253日志](../../../evidence/audits/2026-10-09-v1-version-gate-a253.log)，[SHA-256](../../../evidence/audits/2026-10-09-v1-version-gate-a253.log.sha256)。

2026-10-09 Portfolio写入口交易模式字段边界：V1.1与V1.3完整代码套件通过，V1.3隔离Web/API/CLI 22/22；四个Portfolio账户写入口拒绝模式注入且隔离PG证明零副作用。Outbox L06同时覆盖仍持有预留与已真实入账CAPTURED两种时序，最终恢复和对账MATCH。见[阶段§8.34](./03-fake-broker-trading-loop.md#834-portfolio写入口拒绝客户端模式注入与outbox时序2026-10-09)。该自动化证据不替代当前范围用户签署。

正式V1门禁a254：阶段文档审计PASS，证据审计PASS（671引用、79份Manifest、218项），版本仍INCOMPLETE/exit 2；缺失项详见[日志](../../../evidence/audits/2026-10-09-v1-version-gate-a254.log)与[SHA-256](../../../evidence/audits/2026-10-09-v1-version-gate-a254.log.sha256)。

门禁指针复核a255：阶段文档及证据审计PASS（673/80/219），V1仍INCOMPLETE/exit 2。[日志](../../../evidence/audits/2026-10-09-v1-version-gate-a255.log)，[SHA-256](../../../evidence/audits/2026-10-09-v1-version-gate-a255.log.sha256)。

V1正式门禁a256：阶段文档审计PASS、证据审计PASS（675引用、81份Manifest、220项），版本仍INCOMPLETE/exit 2。详情见[日志](../../../evidence/audits/2026-10-09-v1-version-gate-a256.log)和[SHA-256](../../../evidence/audits/2026-10-09-v1-version-gate-a256.log.sha256)。

门禁a257：五阶段文档审计PASS，证据审计PASS（677/82/221），V1仍INCOMPLETE/exit 2。[日志](../../../evidence/audits/2026-10-09-v1-version-gate-a257.log)，[SHA-256](../../../evidence/audits/2026-10-09-v1-version-gate-a257.log.sha256)。

正式门禁a258：五阶段文档审计PASS，证据审计PASS（679/83/222），V1仍INCOMPLETE/exit 2。[日志](../../../evidence/audits/2026-10-09-v1-version-gate-a258.log)，[SHA-256](../../../evidence/audits/2026-10-09-v1-version-gate-a258.log.sha256)。

门禁a259复核：五阶段文档及证据审计PASS（681/84/223），但版本仍INCOMPLETE/exit 2。[日志](../../../evidence/audits/2026-10-09-v1-version-gate-a259.log)，[SHA-256](../../../evidence/audits/2026-10-09-v1-version-gate-a259.log.sha256)。

2026-10-09 V1.3 Trade订单转换边界的跨阶段兼容复验：共享Trade路由修复后，完整V1.5代码套件exit 0；隔离Web/API/CLI/export E2E四场景PASS，且同Run CLI核验完成、精确隔离资源已清理。证据见[阶段§8.41](./03-fake-broker-trading-loop.md#841-trade订单取消到期unknown路由拒绝模式载荷2026-10-09)、[V1.5代码套件](../../../evidence/audits/2026-10-09-v15-trade-transition-mode-compat-code-suite-a02.log)、[V1.5 E2E](../../../evidence/audits/2026-10-09-v15-trade-transition-mode-web-e2e-a01.log)。这是共享路由兼容性增量，未关闭V1.5父级需求、全V1门禁或人工验收。

2026-10-09 V1.3/V1.5共享Trade Outbox补偿边界：非空请求体拒绝及隔离PostgreSQL无副作用验证通过；V1.3 22项、V1.5四场景Web/API/CLI/export回归通过，详见[阶段§8.42](./03-fake-broker-trading-loop.md#842-trade-outbox补偿路由拒绝请求体注入及跨阶段回归2026-10-09)。此为单路由边界证据，不代表全V1验收完成。

2026-10-09 共享Trade Execution改动的V1.1兼容复验：`pnpm verify:stage -- --stage V1.1 --suite code`退出0，完整套件的隔离数据库、身份边界、服务分层与迁移CLI检查通过，见[V1.1阶段§8.18](./01-environment-and-web-center.md#818-共享trade路由变更后的v11完整代码兼容复验2026-10-09)及[完整日志](../../../evidence/audits/2026-10-09-v11-trade-outbox-compensation-compat-code-suite-a01.log)。此项不代表活动存储切换/回退或当前范围人工验收完成。

2026-10-09 V1.4历史回放请求边界增量：Trade历史FakeBroker HTTP入口现执行Schema的顶层与嵌套`additionalProperties: false`，拒绝三种LIVE/REAL字段组合且在Governance调用及订单持久化前失败；合法BACKTEST仍能进入执行。Trade隔离HTTP+PG、完整V1.3/V1.4代码套件、V1.4五项Web E2E及同Run CLI检查均通过，证据见[V1.4 §8.12](./04-daily-backtest.md#812-historical-fakebroker-http命令严格附加字段边界2026-10-09)、[HTTP+PG](../../../evidence/audits/2026-10-09-v13-historical-execution-strict-body-trade-integration-a02.log)、[V1.3代码套件](../../../evidence/audits/2026-10-09-v13-historical-execution-strict-body-code-suite-a01.log)、[V1.4代码套件](../../../evidence/audits/2026-10-09-v14-historical-execution-strict-body-compat-code-suite-a01.log)、[V1.4 E2E](../../../evidence/audits/2026-10-09-v14-historical-execution-strict-body-web-e2e-a01.log)。此为一个HTTP契约原子边界，不关闭V1.4历史回测规则/结算、V1全路由矩阵或当前范围人工验收。

正式门禁a283：五阶段文档审计PASS、证据审计PASS（731引用、97份Manifest、236项），V1仍INCOMPLETE/exit 2；4个历史TestRun结构化导出、开放业务/环境条件和人工验收仍未满足。[门禁日志](../../../evidence/audits/2026-10-09-v1-version-gate-a283.log)，[SHA-256](../../../evidence/audits/2026-10-09-v1-version-gate-a283.log.sha256)。

正式V1门禁a285：五阶段文档审计PASS、证据审计PASS（741引用、99份Manifest、238项），但V1仍INCOMPLETE/exit 2。四个历史TestRun结构化导出及开放业务/环境条件、人工验收未完成。[a284日志](../../../evidence/audits/2026-10-09-v1-version-gate-a285.log)，[SHA-256](../../../evidence/audits/2026-10-09-v1-version-gate-a285.log.sha256)。

正式V1门禁a285：阶段文档审计PASS，证据审计PASS（741引用、99份Manifest、238项），版本仍INCOMPLETE/exit 2。历史TestRun、业务/环境未决事项及新增范围人工验收仍未通过。[a285日志](../../../evidence/audits/2026-10-09-v1-version-gate-a285.log)，[SHA-256](../../../evidence/audits/2026-10-09-v1-version-gate-a285.log.sha256)。

正式V1门禁a286：五阶段文档审计PASS，证据审计PASS（747引用、100份Manifest、239项），V1仍INCOMPLETE/exit 2；历史Run、结算/维护决定、完整恢复、Ubuntu和当前范围人工验收继续未完成。[a286日志](../../../evidence/audits/2026-10-09-v1-version-gate-a286.log)，[SHA-256](../../../evidence/audits/2026-10-09-v1-version-gate-a286.log.sha256)。

2026-10-09 V1.5 owner范围Run历史比较增量：完整代码门禁exit 0，隔离PostgreSQL覆盖owner/V1.5过滤、limit边界和摘要字段；完整四场景Web/API/CLI/export E2E通过，浏览器选择历史Run并逐列呈现比较结果。匿名/伪造owner拒绝已扩至本轮新增路由。详细步骤、限制和日志见[阶段§8.21](./05-scheduling-and-recovery.md#821-owner范围v15运行历史与并排比较2026-10-09)、[代码套件](../../../evidence/audits/2026-10-09-v15-owner-run-history-comparison-code-suite-a01.log)与[E2E](../../../evidence/audits/2026-10-09-v15-owner-run-history-comparison-web-e2e-a02.log)。该增量不关闭告警/能力阻塞、跨阶段追溯或V1.5整体验收；当前范围人工验收仍NOT_RUN。

2026-10-09 V1.5能力阻塞增量：正式验收页现在按当前Run持久证据显示workflow/NATS/Temporal/domain执行状态；明确未接线/失败会标为阻塞，NOT_RUN仍是“未运行”。Web单测4/4、完整V1.5 code suite exit 0、四场景Web/API/CLI/export E2E与新增负向浏览器用例通过，隔离资源精确清理。详见[阶段§8.22](./05-scheduling-and-recovery.md#822-v15-run能力状态与明确阻塞显示2026-10-09)及其代码/E2E日志。本项不包含Market Data告警Incident集成/确认，不关闭V1.5父项或人工验收。

2026-10-09 V1.5能力阻塞与告警导航最终复验：完整隔离E2E a03和完整code suite a03均exit 0；页面显示持久Run capability状态、明确阻塞及到既有V2.4系统告警/Paper概览的链接。E2E四场景、同Run CLI/export、匿名/伪造owner路由拒绝5/5和资源精确清理通过。此项不代表V1.5 Run级Incident自动生成/确认已完成；当前人工验收仍NOT_RUN。详见阶段§8.22及[code suite](../../../evidence/audits/2026-10-09-v15-capability-alerts-code-suite-a03.log)、[E2E](../../../evidence/audits/2026-10-09-v15-capability-alerts-web-e2e-a03.log)。

2026-10-09 V1.5 Run Incident自动投影增量：Run持久证据保存时在同一PostgreSQL事务中生成/更新Incident，恢复时即时解决，复发时新建记录；不依赖GET触发。V1.5 code suite、四场景Web/API/CLI/export E2E及V1.1–V1.4代码兼容套件均通过，证据与Hash见阶段§8.24。此自动化证据不构成人工验收；V1.5-S2-L19/P5仍因外发通知、跨阶段成交追溯及任意成交追溯保持开放，V1总门禁仍待复跑。

2026-10-09 V1正式门禁a308复核：五阶段文档审计PASS，证据审计PASS（789引用、106份Manifest、245项），版本仍`INCOMPLETE`/exit 2。四个指定历史Run结构化导出、OD-014及三条旧非终态Run处置、活动数据/完整配对恢复、Ubuntu实机和当前范围用户验收未满足；门禁日志与SHA见[完成计划记录](../../plans/2026-10-08-v1-completion-plan.md)。

2026-10-09 V1.1共享Platform Run保存事务变更后的Web兼容复验：当前工作树完整V1.1 code suite exit 0，normal/rejection/recovery Chromium 3/3通过；同Run CLI只读核对和结构化导出通过，三条Run均保持`manualConclusion=NOT_RUN`。运行日志与Hash见[阶段§8.20](./01-environment-and-web-center.md#820-run事务保存变更后的当前树v11端到端兼容复验2026-10-09)。此结果只验证当前隔离兼容，不构成新增人工验收或活动存储切换。

2026-10-09 V1.2共享Platform Run保存事务变更后的兼容E2E：隔离Web/API/CLI同Run套件exit 0，4个Run报告与清理证据见[V1.2 §8.31](./02-small-data-and-qlib.md#831-共享platform-run保存事务变更后的v12当前树复验2026-10-09)。固定镜像拉取首轮EOF失败被保留；同命令复跑成功。此自动验证不替代当前范围人工验收或历史Run导出恢复。

2026-10-09 V1.3共享Platform Run保存事务变更后的当前树E2E：隔离Web/API/CLI 22/22通过，CN/US固定订单链、拒绝及Trade重启原单恢复均有验证，同Run核对、独立账本对账与精确清理通过，外部来源/券商调用0。日志与SHA见[V1.3 §8.44](./03-fake-broker-trading-loop.md#844-共享platform-run保存事务变更后的v13当前树e2e复验2026-10-09)。此兼容验证不替代完整规则、OD-014或当前范围人工验收。

2026-10-09 V1.4共享Platform Run保存事务变更后的E2E兼容复验：隔离Web/API/CLI exit 0，浏览器5/5、八个Web TestRun同Run CLI核对通过，固定回测页面/策略比较与资源清理通过。详情见[V1.4 §8.14](./04-daily-backtest.md#814-共享platform-run保存事务变更后的v14当前树复验2026-10-09)。OD-014结算口径及当前范围人工验收仍未完成。

2026-10-09正式V1门禁a311：阶段文档审计PASS，证据审计PASS（798引用、107份Manifest、281项），版本`INCOMPLETE`/exit 2。新增兼容E2E已记录，但4个指定历史Run、OD-014/旧Run处置、活动数据恢复、Ubuntu与当前范围人工验收仍未满足；见[完成计划](../../plans/2026-10-08-v1-completion-plan.md)。

2026-10-10 V1.3纸面账户命令增量：`seed:paper`对同一个WAITING TestRun幂等建立CN_A/CNY与US_EQUITY/USD PAPER+FAKE账户，不产生订单/Fill；`verify:paper`完整隔离Web/API/CLI矩阵22/22通过。实际Run、账户ID、限制和SHA见[阶段§8.45](./03-fake-broker-trading-loop.md#845-seedpaper-与-verifypaper-命令契约-2026-10-10)及日志。命令子项已实现，但阶段人工验收仍NOT_RUN，V1门禁未关闭。

正式V1门禁a317（命令实现、阶段交付子项及历史快照标签同步后）：V1.1–V1.5结构文档审计PASS，证据审计PASS（799引用、106份Manifest、245项）；版本仍INCOMPLETE/exit 2。4个历史TestRun导出、未关闭阶段任务、OD-014/旧Run处置、活动数据维护与完整恢复、Ubuntu以及当前范围用户验收未完成。[日志](../../../evidence/audits/2026-10-10-v1-version-gate-a317.log)，SHA-256见sidecar。

2026-10-10 V1.3 AUTO Mandate预算终态Web/API/CLI复验：Platform独立读取Governance精确owner/TestRun/Mandate版本预算，提交与刷新后页面均显示`VERIFIED`快照；CN `consumedAmount=1005.00`、`reservedAmount=0.00`、`consumedCount=1`。完整隔离矩阵22/22、平台身份路由27/27、同Run CLI与资源清理通过。见[阶段§8.46](./03-fake-broker-trading-loop.md#846-auto-mandate预算终态独立读回2026-10-10)及[运行日志](../../../evidence/audits/2026-10-10-v13-mandate-budget-readback-web-e2e-a01.log)。V1.3仍PARTIALLY_IMPLEMENTED；本轮自动证据不构成人工签署。

2026-10-10正式V1门禁a323在V1.3预算读回文档同步后复核：状态仍`INCOMPLETE`/exit 2；五阶段结构审计PASS、证据审计PASS（804/107/246）。四个历史Run结构化导出、未关闭版本摘要/验收门禁、OD-014与旧Run处置、活动存储批准/完整恢复、Ubuntu及当前范围人工验收仍开放。见[门禁日志](../../../evidence/audits/2026-10-10-v1-version-gate-a323.log)和[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a323.log.sha256)。

补充验证：Mandate预算读回变更后的完整V1.3 code suite退出0，证据见[§8.46](./03-fake-broker-trading-loop.md#846-auto-mandate预算终态独立读回2026-10-10)。稳定V1要求/测试交叉索引已更新原子证据路径，但需求父项仍OPEN。

2026-10-10正式门禁a324在V1.3预算读回E2E/code、稳定交叉索引及文档更新后复核：五阶段结构审计PASS、证据审计PASS（810/109/248），V1仍`INCOMPLETE`/exit 2。四个历史Run缺少结构化导出，OD-014、旧非终态Run处置、活动维护/全域恢复、Ubuntu与当前范围人工验收继续开放。[a324日志](../../../evidence/audits/2026-10-10-v1-version-gate-a324.log)，[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a324.log.sha256)。

2026-10-10最终记录门禁a325：V1仍`INCOMPLETE`/exit 2；结构审计与证据审计PASS（813/110/249）。历史导出、OD-014/Run处置、活动存储/配对恢复、Ubuntu与当前范围人工签收未满足。[a325日志](../../../evidence/audits/2026-10-10-v1-version-gate-a325.log)，[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a325.log.sha256)。

正式门禁a326（Ubuntu只读preflight文档化后）：V1仍`INCOMPLETE`/exit 2；文档结构审计PASS、证据审计PASS（817/111/250）。四个历史Run导出、OD-014/非终态Run处置、活动维护与配对恢复、Ubuntu实机、版本完成项及本人验收仍开放。[a326日志](../../../evidence/audits/2026-10-10-v1-version-gate-a326.log)，[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a326.log.sha256)。

正式V1门禁a327复核：文档和证据审计PASS（820引用/112份Manifest/251项），版本整体仍INCOMPLETE/exit 2。四个指定历史Run导出及决定、环境、恢复和本人验收门槛未关闭。[门禁日志](../../../evidence/audits/2026-10-10-v1-version-gate-a327.log)，SHA-256 `9cea4bb914f23afdb91c0a867747d1c4dcf70053b6bcd92dfc103f5ff980c0e3`。

正式V1门禁a328：文档与证据审计PASS（822/112/251），但当前V1版本仍INCOMPLETE/exit 2；本记录不构成用户签收。[门禁日志](../../../evidence/audits/2026-10-10-v1-version-gate-a328.log)，SHA-256 `e9cdcba42a1854c9a054e430d38550829bbb95d4212591caeddebb05c764a119`。

2026-10-10 V1.3共享Platform变更兼容性补测：V1.1、V1.2、V1.4、V1.5代码套件均PASS；具体证据引用见相应阶段第8节。本记录只记自动工程回归，不是用户当前范围验收签署；总体门禁仍未通过。

共享Web/API变更后补充浏览器回归：V1.1 3/3、V1.4 5/5、V1.5 3/3，细节和证据见阶段§8.22/8.16/8.27。自动化通过不等于本轮用户人工验收；人工签署保持未执行。

正式门禁a329复核：五阶段结构审计PASS、证据审计PASS（829/112/251），V1仍INCOMPLETE/exit 2。本人当前范围验收未签署；自动兼容套件不替代人工验收。[门禁日志](../../../evidence/audits/2026-10-10-v1-version-gate-a329.log)，SHA-256 `d222fcb2d9a4c394541acbbb971d67549c4458466d595938a01eee1afe9d000f`。

正式V1门禁a330：结构/证据审计PASS（836/112/251），版本仍INCOMPLETE/exit 2。浏览器自动回归不构成用户当前范围验收；未增加签署。[a330日志](../../../evidence/audits/2026-10-10-v1-version-gate-a330.log)，SHA-256 `bd4fdb7a075181ec335d7d6a339656f889142055964c2517d7564cab14f9020c`。


正式V1门禁a331：结构审计PASS、证据审计PASS（838引用、112份Manifest、251项），版本状态仍`INCOMPLETE`/exit 2。四个历史TestRun结构化导出、待决事项、活动存储/全域恢复及Ubuntu实机门槛未完成；用户当前范围人工验收仍`NOT_RUN`，未签署。[a331日志](../../../evidence/audits/2026-10-10-v1-version-gate-a331.log)，SHA-256 `68d1742f0bac54c8cdd2913b7980d48d3a374fc33f19607391a6cc0537eb43ac`。


2026-10-10全仓基线：`pnpm baseline:check`退出0（298 JSON、206 schema、50 Fixture、111条合同兼容矩阵、29个生成器、八服务分层、60项脚本/门禁测试）。这不替代五阶段业务运行、独立TestRun证据、目标环境验证或本人当前范围验收；人工验收仍`NOT_RUN`。[基线日志](../../../evidence/audits/2026-10-10-v1-current-tree-baseline-a01.log)，SHA-256 `ccdf50e40440f22948347fd332accf372f386110f426c82017fbea62fcc9b644`。


正式V1门禁a332：结构审计PASS、证据审计PASS（842引用、112份Manifest、251项），版本仍`INCOMPLETE`/exit 2。四个历史Run导出和待决事项/环境条件未关闭，用户当前范围人工验收保持`NOT_RUN`；未新增签署。[a332日志](../../../evidence/audits/2026-10-10-v1-version-gate-a332.log)，SHA-256 `2eb9a8441ff3e33f4da7b348b35b3e363e01e616f4db39748f61c0be93aab084`。


2026-10-10新增V1.3 Governance历史回测授权拒绝证据：三种LIVE/REAL模式注入被HTTP+隔离PostgreSQL拒绝，无授权副作用；BACKTEST/FAKE合法授权保持。V1.3完整code suite exit 0，详见[阶段§8.47](./03-fake-broker-trading-loop.md#847-governance历史回测授权模式拒绝2026-10-10)。该自动子项不构成人工验收，V1.3全量模式矩阵和用户签收仍未完成。


正式V1门禁a333：结构与证据审计PASS（846引用、113份Manifest、252项），版本仍`INCOMPLETE`/exit 2。新模式注入自动回归不构成全版本模式验收；历史/环境阻塞未关闭，用户当前范围人工验收继续`NOT_RUN`，不新增签署。[a333日志](../../../evidence/audits/2026-10-10-v1-version-gate-a333.log)，SHA-256 `4622816719b6af691cb8d8c144dd37a7b12db592d64f4de821aa0985606fe9ef`。

正式V1门禁a334：阶段文档审计PASS、证据审计PASS（851/114/253），版本仍`INCOMPLETE`/exit 2。V1.4模式拒绝增量已记录；四个历史Run结构化导出、OD-014/旧Run决定、活动数据恢复、Ubuntu和本人当前范围验收仍未满足；人工结论`NOT_RUN`，不新增签署。[a334日志](../../../evidence/audits/2026-10-10-v1-version-gate-a334.log)，SHA-256 `945ad2e3447ece3008edb0dd9ec1437e3714b921d16f953d254e06f99688f9a2`。

正式V1门禁a335：阶段文档与证据审计PASS（853引用、114份Manifest、253项），整体仍`INCOMPLETE`/exit 2。历史Run、待决决定、活动数据恢复、Ubuntu和本人验收未完成；人工状态仍`NOT_RUN`。[a335日志](../../../evidence/audits/2026-10-10-v1-version-gate-a335.log)，SHA-256 `ba20fa3d9d1527847b6a6bb0cc94d814937e28d3d7cc95b9c30193864cd7e11e`。

正式V1门禁a340：阶段文档与证据审计PASS（858/115/254），版本仍`INCOMPLETE`/exit 2。活动存储切换尚未获授权，3条legacy非终态Run及四个历史结构化导出未解决，Ubuntu和本人当前范围验收仍NOT_RUN；不新增签署。[a340日志](../../../evidence/audits/2026-10-10-v1-version-gate-a340.log)，SHA-256 `7797fed729baa4c560362fd99a1c4e3edf71106025d9ed41545100ea07508944`。

2026-10-10 V1.2 Platform TestRun模式边界自动检查已通过，详情见[阶段§8.33](./02-small-data-and-qlib.md#833-v12-testrun创建拒绝客户端交易模式注入2026-10-10)。该结果不代表V1.2人工验收；五阶段当前范围人工签署、历史TestRun导出、待决业务/存储决定、完整恢复与目标Ubuntu实机仍未完成，V1保持INCOMPLETE。

2026-10-10正式门禁a342：结构审计PASS、证据审计PASS（867引用、115份Manifest、254项），V1仍`INCOMPLETE`/exit 2。缺失的四个历史TestRun结构化导出、待决定的结算与旧Run处置、活动维护/恢复、Ubuntu实机及所有者当前范围验收仍阻止签署完成。[门禁日志](../../../evidence/audits/2026-10-10-v1-version-gate-a342.log)，SHA-256 `b9b0932e7f8cc376282e2fbe469ef2669155a7f430a672023ba3d614fa27c54a`。

2026-10-10正式门禁a343复核：五阶段结构与证据审计PASS（870/115/254），版本`INCOMPLETE`/exit 2。历史TestRun导出、业务/旧Run决定、活动数据维护与恢复、Ubuntu实机及本人当前范围验收仍未关闭。[日志](../../../evidence/audits/2026-10-10-v1-version-gate-a343.log)，SHA-256 `10928f284170b77a1852220171d949ccdc12e2eaa5b277e6c6dbea9d10c9a942`。

2026-10-10 V1.5 Run创建模式注入自动验收通过，细节见[阶段§8.28](./05-scheduling-and-recovery.md#828-v15-testrun创建拒绝客户端交易模式注入2026-10-10)。这不是V1.5当前范围人工签署；四个历史Run导出、OD-014/旧Run决定、活动存储恢复、Ubuntu实机及本人验收仍未满足。

2026-10-10门禁a344复核：五阶段文档审计PASS，证据审计PASS（876/116/255），版本整体`INCOMPLETE`/exit 2。四个历史结构化TestRun导出、结算与旧Run待决事项、活动数据维护和完整恢复、Ubuntu实机以及所有者对当前范围的人工验收仍未完成；人工验收保持`NOT_RUN`，不新增签署。[门禁记录](../../../evidence/audits/2026-10-10-v1-version-gate-a344.log)，SHA-256 `43b9ad50014657ee322a287befc2f260ccafc718add40ffcc3d72e0f39fbdac3`。

2026-10-10正式门禁a345复核：五阶段文档审计PASS、证据审计PASS（878/116/255），整体`INCOMPLETE`/exit 2。当前交叉索引结构审计已列出待校正的来源锚点和精确测试映射；四个历史TestRun导出、结算与旧Run决定、活动维护和完整恢复、Ubuntu实机以及所有者当前范围人工验收未完成，人工仍`NOT_RUN`。[a345记录](../../../evidence/audits/2026-10-10-v1-version-gate-a345.log)，SHA-256 `69ea2ef0876aadae1335d7f57730285e9e6852a86a00615838039f6d174f6760`。

2026-10-10正式门禁a346：结构审计PASS，证据审计PASS（880/116/255），版本仍`INCOMPLETE`/exit 2。交叉索引结构校正已通过；业务覆盖、四个历史Run结构化导出、结算/旧Run待决事项、活动数据维护与恢复、Ubuntu实机和本人当前范围验收仍未完成，人工状态`NOT_RUN`。[a346日志](../../../evidence/audits/2026-10-10-v1-version-gate-a346.log)，SHA-256 `7ef72830293f445143e81a7f1314b302fe582bc8c7245609a574a4b2b08bf8b5`。

2026-10-10正式门禁a347：阶段文档和证据审计PASS（882/116/255），版本仍`INCOMPLETE`/exit 2。当前Artifact边界盘点仅是源码审计；历史Run导出、待决政策/旧Run、活动维护与恢复、Ubuntu实机及当前范围人工验收仍未完成，人工`NOT_RUN`。[a347日志](../../../evidence/audits/2026-10-10-v1-version-gate-a347.log)，SHA-256 `07dbf45f5a14f6b9fd67bdf9409fac824bc71064e7b45f0fdbf2edc12e239fa5`。
2026-10-10 V1.3阶段机器验收更新：见[§8.51](./03-fake-broker-trading-loop.md#851-platform事实保护扩展至无载荷命令2026-10-10)。bodyless Platform写命令的非空载荷拒绝与原工作流重放通过；完整E2E/code证据已记录。V1整体仍INCOMPLETE，当前范围人工验收保持`NOT_RUN`，不得由自动结果代签。
2026-10-10 V1.1阶段机器验收更新：见[§8.23](./01-environment-and-web-center.md#823-v11-platform命令拒绝客户端写入业务事实2026-10-10)。新增客户端事实拒绝及完整V1.1隔离回归通过；三个TestRun均有结构化Evidence Bundle。此为开发者机器验证，V1.1当前范围人工验收仍`NOT_RUN`，活动存储迁移/回退仍未授权。

2026-10-10 V1.2、V1.4、V1.5命令载荷边界增量：V1.2 Run取消、V1.4回测取消、V1.5 Run取消及Incident确认拒绝客户端伪造事实，拒绝后原状态不变且合法命令可继续；对应完整阶段E2E均退出0。详见[V1.2 §8.34](./02-small-data-and-qlib.md#834-v12取消命令拒绝客户端业务事实注入2026-10-10)、[V1.4 §8.18](./04-daily-backtest.md#818-v14回测取消命令拒绝客户端状态现金注入2026-10-10)、[V1.5 §8.29](./05-scheduling-and-recovery.md#829-v15取消与incident确认拒绝客户端业务事实注入2026-10-10)。这是机器验收证据；本轮V1.2/V1.4/V1.5人工验收仍`NOT_RUN`。

正式V1门禁a364：五阶段文档审计PASS，证据审计PASS（927引用、128份Manifest、267项），整体仍`INCOMPLETE`/exit 2。四个指定历史TestRun结构化导出、当前范围人工验收、OD-013/OD-014与旧Run处置、活动数据/业务恢复和目标Ubuntu实机仍未完成；人工验收不由自动测试代签。[a364日志](../../../evidence/audits/2026-10-10-v1-version-gate-a364.log)，SHA-256 `0c67c76ffbd7a78fd3a6aa285b0e511de57f11de6e41c8a81813541e032e0865`。

正式V1门禁a365：阶段文档审计PASS，证据审计PASS（928/128/267），版本整体仍`INCOMPLETE`/exit 2。四个历史Run导出及阶段/人工、待决政策与旧Run处置、活动恢复和Ubuntu实机条件未满足；当前范围人工验收保持`NOT_RUN`。[a365日志](../../../evidence/audits/2026-10-10-v1-version-gate-a365.log)，SHA-256 `48ad5b5e357dff88753936e8bfd3207f5c20c6d9f2a372d58ece83a522aa8f0b`。

正式V1门禁a366：文档审计PASS、证据审计PASS（929/128/267），但V1整体仍`INCOMPLETE`/exit 2；历史导出、决策/旧Run处置、活动恢复、Ubuntu和当前范围人工验收未完成。[a366日志](../../../evidence/audits/2026-10-10-v1-version-gate-a366.log)，SHA-256 `0a597b00495e4472bc3487eda60c0d4790488cd0b2346494974387ce4ff25d9a`。

正式V1门禁a367：五阶段文档审计PASS，证据审计PASS（930/128/267），但V1仍`INCOMPLETE`/exit 2。四个历史TestRun导出、五阶段当前交付、决策/旧Run处置、活动数据及全域恢复、Ubuntu实机和当前范围人工验收仍未完成。[a367日志](../../../evidence/audits/2026-10-10-v1-version-gate-a367.log)，SHA-256 `b34384a6b676007d5fdee96aab33556c6c476c785af1f0469a5a1986dfae024a`。

2026-10-10 V1.3 L08边界增量：部分成交订单的撤单命令拒绝夹带客户端status/cash/ledgerVersion；拒绝后订单、Fill、现金和独立对账不变，之后正式撤单及同Run CLI核对通过。完整V1.3 E2E 22/22、code suite exit 0，见[§8.52](./03-fake-broker-trading-loop.md#852-l08部分成交撤单拒绝客户端业务事实注入2026-10-10)。这属于自动隔离验收，当前范围人工验收仍`NOT_RUN`。

2026-10-10 V1.3 L08撤单边界复验：见[§8.52](./03-fake-broker-trading-loop.md#852-l08部分成交撤单拒绝客户端业务事实注入2026-10-10)，E2E 22/22、V1.3 code suite exit 0。客户端伪造状态/现金/账本版本被拒绝且业务事实不变；这不关闭P3父项或当前范围人工验收。

正式V1门禁a368：阶段文档审计PASS、证据审计PASS（934/129/268），V1仍`INCOMPLETE`/exit 2。四个历史导出、五阶段正式关闭、所有者当前范围验收、未决决策、活动恢复及Ubuntu实机仍未满足。[a368日志](../../../evidence/audits/2026-10-10-v1-version-gate-a368.log)，SHA-256 `0c0bafe787f2859e5fbd18d79d765a7eed532d629bf1f6c2bca8dd79b5760144`。

正式V1门禁a369：文档/证据审计PASS（935/129/268），版本仍`INCOMPLETE`/exit 2。四个历史TestRun导出、五阶段关闭、当前范围人工验收、未决决策、活动恢复和Ubuntu实机仍未完成。[a369日志](../../../evidence/audits/2026-10-10-v1-version-gate-a369.log)，SHA-256 `1ae78b9b7c2283c73d035955d3dde01316970bf1386620e1027a8e199e608425`。

2026-10-10 V1.3 Proposal创建载荷白名单增量：未知客户端字段返回422、匿名身份仍先401，合法Proposal流程持续通过；E2E 22/22、完整V1.3 code suite exit 0，见[阶段§8.53](./03-fake-broker-trading-loop.md#853-platform-proposal创建拒绝未声明字段2026-10-10)。该自动证据不代替人工签署。

正式V1门禁a371：阶段文档审计PASS、证据审计PASS（937/129/268），但版本仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。V1.2 `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`及V1.5 `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`仍缺结构化TestRun导出；当前范围人工验收保持`NOT_RUN`，其他门禁条件见当前计划。[a371日志](../../../evidence/audits/2026-10-10-v1-version-gate-a371.log)，SHA-256 `b3f72e2eae427e0dccee809a04156e9fb1ee0194b94dd75961d7a6ccbce8b3bf`。

正式V1门禁a372（a371复核结果同步后的最终复核）：文档审计PASS、证据审计PASS（938/129/268），版本仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。四个历史TestRun结构化导出和当前人工验收均未满足；政策决定、活动恢复及目标Ubuntu验证也未完成。[a372日志](../../../evidence/audits/2026-10-10-v1-version-gate-a372.log)，SHA-256 `db24465a4908d3ec74274138d9f789c50e2334dcd30b049884d9aed9fc83e3d2`。

2026-10-10 V1.3 AUTO Mandate创建载荷边界增量：未知客户端字段422，拒绝后Mandate未创建，合法PAPER/FAKE命令继续成功。完整E2E 22/22与code suite exit 0，见[阶段§8.54](./03-fake-broker-trading-loop.md#854-platform-auto-mandate创建拒绝未声明字段2026-10-10)。这不是用户人工验收。

正式V1门禁a373：文档审计PASS、证据审计PASS（941/129/268），V1仍INCOMPLETE/exit 2。当前仍缺四个历史Run结构化导出、阶段关闭条件、用户实际签署、待决政策与旧Run处置、活动数据/全域恢复、Ubuntu目标验证。[a373日志](../../../evidence/audits/2026-10-10-v1-version-gate-a373.log)，SHA-256 `bef041bf2f97cfbe8d3025ca22a386251c03ac80f2572313bac1d0f98bbbf6c8`。

2026-10-10 V1.3 Proposal修订/审批字段边界增量：未知客户端字段返回422，Proposal状态、版本、内容Hash不变，合法治理流程回归通过。完整E2E 22/22、code suite exit 0，见[阶段§8.55](./03-fake-broker-trading-loop.md#855-platform-proposal修订与审批拒绝未声明字段2026-10-10)。当前范围用户人工验收仍`NOT_RUN`。

正式V1门禁a374：文档审计PASS、证据审计PASS（944/129/268），V1仍INCOMPLETE/exit 2。四个历史TestRun结构化导出和当前人工验收缺失；其余待决决定、恢复与Ubuntu条件保持开放。[a374日志](../../../evidence/audits/2026-10-10-v1-version-gate-a374.log)，SHA-256 `3640b07ce693fc0b17e68d5c48366aa63598c01de19929c2c149414f9dd391f2`。


2026-10-10 V1.3 AUTO Mandate字段边界完成：激活/暂停未知字段返回422、状态不变，合法转换继续成功；修正Web暂停请求多传`contentHash`后，完整E2E 22/22、V1.3 code suite exit 0。E2E SHA-256 `11cb0823aa65a8618d933b7026a51131c02aad52efd141040cdbaff0b5e79083`，code suite SHA-256 `f489d906bf343ef5d84bebcd21ae875b35cfd24c93fb385bf7ad15b38003a69d`。详见[§8.56](./03-fake-broker-trading-loop.md#856-platform-auto-mandate激活与暂停拒绝未声明字段2026-10-10)。本次自动验证不代表阶段关闭或人工验收。


正式V1门禁a375（V1.3 Mandate转换边界及同步记录后）：阶段文档审计PASS；证据审计PASS（951引用、131份Manifest、270项）；`versionSummaryIncomplete=false`但`uncheckedVersionGate=true`，整体仍`INCOMPLETE`/exit 2。V1.2旧Run `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`及V1.5旧Run `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`缺结构化导出；阶段正式关闭、当前范围人工验收、OD-013/OD-014和旧Run处置、活动存储/全域恢复、Ubuntu实机仍未满足。[a375日志](../../../evidence/audits/2026-10-10-v1-version-gate-a375.log)，SHA-256 `1986b564cac7ff5c8e4ffb618b2b5387b79693bc9e901d15813614a1aacfb90e`。


正式V1门禁a376（最新记录同步后复核）：阶段文档审计PASS；证据审计PASS（952引用、131份Manifest、270项）；`versionSummaryIncomplete=false`、`uncheckedVersionGate=true`，整体`INCOMPLETE`/exit 2。四个指定历史Run结构化导出缺失（V1.2 `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`；V1.5 `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`）；阶段正式交付/人工验收、OD-013/OD-014及旧Run处置、活动存储/全域恢复、Ubuntu实机仍未满足。[a376日志](../../../evidence/audits/2026-10-10-v1-version-gate-a376.log)，SHA-256 `504060203cbdaa4a0bb538c25787664ecf7508e3dd51b052fa2ab5cb4ceb3bd2`。


正式V1门禁a377（P0交叉索引a11更新后）：五阶段文档审计PASS；证据审计PASS（953引用、131份Manifest、270项）；`versionSummaryIncomplete=false`，但`uncheckedVersionGate=true`，整体`INCOMPLETE`/exit 2。四个历史TestRun结构化导出、阶段工程/交付/人工验收、OD-013/OD-014与旧Run处置、活动数据/全域恢复、Ubuntu实机条件仍未满足。[a377门禁日志](../../../evidence/audits/2026-10-10-v1-version-gate-a377.log)，SHA-256 `f0fc9343d391c5f2006ca435de4223140c280116cb8449a458993866b65f3872`。


正式V1门禁a378（A05路由边界与P0交叉表a11同步后）：阶段文档审计PASS；证据审计PASS（954引用、131份Manifest、270项）；`versionSummaryIncomplete=false`、`uncheckedVersionGate=true`，整体仍`INCOMPLETE`/exit 2。四个历史Run结构化导出缺失；P1～P6工程/决定/环境/当前范围人工验收条件仍未满足。[a378日志](../../../evidence/audits/2026-10-10-v1-version-gate-a378.log)，SHA-256 `0beef31691b3c86648c7a371eeb4d74dd7baacdb90700d9a712f3ff845a24ada`。

2026-10-10 V1.3多腿固定输入准备：新增CN/US两腿、聚合现金不足零副作用及响应丢失恢复Fixture；schema/hash通过。实际Trade多腿执行与Web/CLI同Run断言尚未运行，阶段验收不变，V1.3-S2-L13仍OPEN；不得由Fixture准备推断通过。详情见[§8.57](./03-fake-broker-trading-loop.md#857-v13多腿执行固定输入2026-10-10尚未执行)。

正式V1门禁a379：五阶段文档审计PASS、证据审计PASS（955引用、131份Manifest、270项），`versionSummaryIncomplete=false`但`uncheckedVersionGate=true`，版本整体INCOMPLETE/exit 2；四个历史Run导出与五阶段业务/交付/人工验收、决策、活动数据恢复和Ubuntu实机条件仍未满足。[门禁日志](../../../evidence/audits/2026-10-10-v1-version-gate-a379.log)，SHA-256 `86a9af4707a338c3439e086b1ad43cc7439ebf6038817912945acf7a96ab1cb5`。

正式V1门禁a380：五阶段文档审计PASS，证据审计PASS（956引用、131份Manifest、270项）；`versionSummaryIncomplete=false`但`uncheckedVersionGate=true`，版本INCOMPLETE/exit 2。四个历史TestRun结构化导出、五阶段未完业务/交付/人工验收、决策和环境条件未满足。[a380门禁日志](../../../evidence/audits/2026-10-10-v1-version-gate-a380.log)，SHA-256 `3150f946bc6dbcc45414880d797c17d84ad3f677c093590a524c826e4133cfc5`。

正式V1门禁a381：五阶段文档审计PASS、证据审计PASS（957引用、131份Manifest、270项），版本仍INCOMPLETE/exit 2；未决条件见当前进度。[a381日志](../../../evidence/audits/2026-10-10-v1-version-gate-a381.log)，SHA-256 `099a9dcd01302332ef9f7dec0dabbbcc4669666d7a18cca16836297e517a417c`。

2026-10-10 V1.3多腿批次验收更新：固定CN_A MANUAL BUY/BUY子场景通过完整23/23隔离E2E及code suite，见[§8.57](./03-fake-broker-trading-loop.md#857-v13多腿执行固定输入及验证状态2026-10-10)。这更新此前“多腿执行NOT_RUN”的记录；V1.3-S2-L13和P3父项仍OPEN，AUTO多腿、US E2E、进程重启与跨服务拒绝仍待验证，当前范围人工验收仍NOT_RUN。

正式门禁a382（2026-10-10多腿固定子项及追踪同步后）：阶段文档与证据审计PASS（961引用、131 Manifest、270项），V1仍INCOMPLETE/exit 2。四个历史Run结构化导出、五阶段工程/交付及当前范围人工签署、未决决定与旧Run处置、活动数据恢复和Ubuntu实机条件未满足；见[当前进度](../../progress.md)与[门禁日志](../../../evidence/audits/2026-10-10-v1-version-gate-a382.log)，SHA-256 `ed71ed65e59ea1a198bf5d5084719a1be60f433f47893498b39246124bc163e8`。
正式V1门禁a393（2026-10-10）：阶段文档审计PASS，证据审计PASS（966引用、131份Manifest、270项）；五阶段仍未关闭、验收表5项未解决、门禁复选项未满足，版本`INCOMPLETE`/exit 2。四个历史TestRun缺结构化导出；当前范围人工验收、活动恢复、Ubuntu实机及待决政策仍未满足。[a393日志](../../../evidence/audits/2026-10-10-v1-version-gate-a393.log)，SHA-256 `fe0af013028cce5f02e7d4b5328f22ac6e4fa72b482718d2214bba62c454dfea`。

2026-10-10 V1.3 US多腿验收更新：US_EQUITY固定MANUAL BUY/BUY已纳入完整V1.3 E2E 24/24；同Run CLI核对两笔订单/Fill、期末USD 9549.9000、MATCH和刷新恢复，TestRun `eb34b908-d568-4fa8-b73f-cbd4a48c4880`。日志见[§8.57](./03-fake-broker-trading-loop.md#857-v13多腿执行固定输入及验证状态2026-10-10)。此项关闭US固定MANUAL子场景，V1.3-S2-L13/P3父项仍OPEN。

2026-10-10 V1.3当前代码门禁更新：US两腿E2E纳入后，完整`pnpm verify:stage -- --stage V1.3 --suite code`通过exit 0，SHA-256 `3c555594d3221cff2d1823a6dc4fad51d43dd1ff634c5a7c247a77b6acad5627`；[运行日志](../../../evidence/audits/2026-10-10-v13-multileg-us-code-suite-a02.log)。V1.3与版本级验收状态仍保持未关闭。

正式V1门禁a383：阶段文档审计PASS，证据审计PASS（965引用、131 Manifest、270项），V1仍INCOMPLETE/exit 2。历史Run导出、阶段交付/当前范围人工验收、未决决定、活动数据恢复和Ubuntu实机条件仍未满足。[a383日志](../../../evidence/audits/2026-10-10-v1-version-gate-a383.log)，SHA-256 `0bae4e5ca522a9724b71e19856bc20e2ded3508310a40d65a998addfffb709f1`。

2026-10-10 V1.3多腿Trade重启恢复更新：首腿FakeBroker子订单持久化后重启Trade，以原批次clientOrderId重试，恢复缺失腿并验证两订单/两Fill/MATCH。定向E2E 1/1通过（TestRun `39f1f636-eebc-41b7-9551-ce073392cadc`），完整V1.3 E2E 25/25通过（TestRun `690641a2-d40d-4a5d-80e4-4df6657b97e1`），code suite exit 0；证据见[阶段§8.58](./03-fake-broker-trading-loop.md#858-v13多腿trade进程重启恢复2026-10-10)。V1.3-S2-L13及P3仍OPEN：AUTO多腿、真实跨服务低余额拒绝和更广规则/故障验证未完成，阶段/人工验收未签署。

2026-10-10 V1.3多腿低现金拒绝通过：同Run先成交9笔将CNY现金降至955.0000，再经正式Platform API提交已批准MANUAL两腿Proposal，真实服务返回409；没有批次订单，账户账本/现金/持仓/预留及对账事实保持不变，同Run CLI核验通过。TestRun `e8d1092b-1914-4684-a184-cbbf2e52de6e`，定向E2E 1/1，详见[§8.59](./03-fake-broker-trading-loop.md#859-v13多腿低现金拒绝及零副作用2026-10-10)。部分预留后次腿失败的端到端释放仍只由Trade单测覆盖；V1.3父项、阶段和人工验收保持OPEN/NOT_RUN。

2026-10-10 V1.3多腿第二腿资金拒绝与首腿Reservation回滚更新：现金1960.0000时真实Platform/Trade/Portfolio链路拒绝两腿MANUAL批次；首腿1005.0000 Reservation变为RELEASED、第二腿无Reservation、两子订单查询404，现金/持仓/账本版本与条目/reconciliation不变。同Run CLI通过。定向TestRun `f64b339c-8f60-4c7f-9027-72ebada6d66e`；完整V1.3 E2E 25/25 TestRun `ea222a4d-71be-4b2e-a053-fca3b4df3acf`，code suite exit 0，证据见[§8.59](./03-fake-broker-trading-loop.md#859-v13多腿低现金拒绝及零副作用2026-10-10)。V1.3-S2-L13仍OPEN：AUTO多腿、SELL中间资金/结算、完整授权规则和版本人工验收未完成。

2026-10-10 V1.3固定CN_A AUTO_POLICY两腿BUY更新：新增Fixture 1.0.2并保留1.0.1；单个Mandate授权/消费CNY 2210.00、Portfolio逐腿预留、两笔稳定FakeBroker子订单/Fill、期末现金7790.0000、刷新恢复及同Run CLI均通过。AUTO TestRun `cb6130f5-671c-4be3-bb6b-bae551e8a980`；完整V1.3隔离E2E 26/26、code suite exit 0，详见[阶段§8.60](./03-fake-broker-trading-loop.md#860-v13-auto_policy固定两腿buy批次2026-10-10)。这只关闭固定CN_A AUTO BUY/BUY子场景；V1.3-S2-L13、P3及阶段人验仍OPEN/NOT_RUN，US AUTO、SELL中间资金/结算和更广规则未完成。

2026-10-10 V1.3固定US_EQUITY AUTO_POLICY两腿BUY通过：新增Fixture 1.0.3并保留1.0.0–1.0.2；单个Mandate消费USD 450.10、Portfolio逐腿预留、AAPL/MSFT两笔稳定FakeBroker订单/Fill，期末现金USD 9549.9000，刷新后页面事实恢复。定向E2E 1/1，完整隔离Web/API/CLI/export E2E 27/27，完整V1.3 code suite exit 0；业务TestRun `382dd284-62cc-4157-a53e-5711385e3b90`。详细步骤、同Run CLI status 2的WAITING边界及限制见[阶段§8.61](./03-fake-broker-trading-loop.md#861-v13-auto_policy固定us_equity两腿buy批次2026-10-10)。该子项不关闭V1.3/P3，SELL结算、全面授权规则、阶段交付/人工签收及Ubuntu仍开放。

2026-10-10正式V1门禁a419：五阶段文档审计PASS；证据审计PASS（1011引用、139份Manifest、278项），但V1整体`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。V1.4 Replay UNKNOWN原单namespace路由子项及完整code suite已通过，见[§8.20](./04-daily-backtest.md#820-v14-unknown原单读取按replay-namespace隔离2026-10-10)。四个历史Run结构化导出、五阶段工程/交付与当前范围人工验收、待决政策及旧Run处置、活动数据恢复和Ubuntu实机仍未满足；未新增用户签署。[正式门禁a419](../../../evidence/audits/2026-10-10-v1-version-gate-a419.log)。

正式V1门禁a423复核：阶段文档审计PASS，证据审计PASS（1019引用、140份Manifest、279项），版本仍`INCOMPLETE`/exit 2。四个历史TestRun导出、阶段完整交付、未决政策/旧Run处置、活动全域恢复与Ubuntu证据均未齐；当前范围用户人工验收维持`NOT_RUN`，不新增签署。[a423日志](../../../evidence/audits/2026-10-10-v1-version-gate-a423.log)，[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a423.log.sha256)。

正式V1门禁a424复核：五阶段文档审计和证据审计通过（1023引用、141份Manifest、280项），版本仍`INCOMPLETE`/exit 2；历史Run导出、阶段交付、决定/旧Run处置、完整恢复和Ubuntu实机证据仍缺，当前范围人工验收`NOT_RUN`，未签署。[a424日志](../../../evidence/audits/2026-10-10-v1-version-gate-a424.log)，[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a424.log.sha256)。

正式V1门禁a425：五阶段文档审计及证据审计PASS（1026引用、142份Manifest、281项），但V1为`INCOMPLETE`/exit 2。四个历史TestRun结构化导出、未决政策和旧Run、完整恢复、Ubuntu及当前范围人工验收仍未完成；本人签署状态未变。[a425日志](../../../evidence/audits/2026-10-10-v1-version-gate-a425.log)，[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a425.log.sha256)。


2026-10-10 V1.5固定组合恢复子项通过：同时中断两台Trade与PostgreSQL后，恢复原数据库容器/卷、Governance/Portfolio依赖服务和一个Trade实例；Temporal按原clientOrderId读回FakeBroker已提交订单，四场景E2E及V1.5 code suite通过。详见[阶段§8.31](./05-scheduling-and-recovery.md#831-trade双实例与postgresql同时中断后的原单恢复2026-10-10)及机器报告[JSON](../../../evidence/audits/2026-10-10-v15-trade-database-combined-failure-sq-v15-e2e-d3d07879c69cbbf93168.json)。本项仅记录固定工程场景自动化PASS，不代表V1.5人工验收、Mac睡眠/唤醒、全V1灾备或版本关闭。
2026-10-10 V1.2共享PostgreSQL恢复兼容复验：Governance进程恢复修复后，受控完整V1.2 code suite exit 0，隔离Web/API/CLI四Run及锁版Qlib、数据库/迁移检查通过，项目资源精确清理。日志[2026-10-10-v12-post-governance-pg-resilience-code-suite-a03.log](../../../evidence/audits/2026-10-10-v12-post-governance-pg-resilience-code-suite-a03.log)，SHA-256 `c28333183c70661b7f886c2d393f0c1d7d2f42a4acfaa7aa990526e64f9130bd`。这是兼容回归，不代表V1.2正式关闭或人验。

正式V1门禁a473：五阶段文档审计PASS、证据审计PASS（1082引用、148份Manifest、287项），版本仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。四个指定历史Run结构化导出、OD-013/014及旧Run处置、全域恢复、Ubuntu和五阶段当前范围用户验收未满足。[日志](../../../evidence/audits/2026-10-10-v1-version-gate-a473.log)，SHA-256 `b2dbe5587a4c2057dbe191dd0f4e68e3fdd089114c84d6abc8f1ebc2a89ad306`。

正式V1门禁a474：阶段文档审计PASS；证据审计PASS（1083引用、148份Manifest、287项），版本仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。历史Run结构化导出、OD-013/014与旧Run处置、全域恢复、Ubuntu和五阶段当前范围用户验收仍未满足。[日志](../../../evidence/audits/2026-10-10-v1-version-gate-a474.log)，SHA-256 `ace508cdd344c72033b5325ee3e021e8bb31c1d49cc06a8f9ec3b3199ae01b9e`。

正式V1门禁a475：五阶段文档审计PASS、证据审计PASS（1084引用、148份Manifest、287项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。历史Run结构化导出、OD-013/014与旧Run处置、全域恢复、Ubuntu和五阶段当前范围人工验收未满足。[日志](../../../evidence/audits/2026-10-10-v1-version-gate-a475.log)，SHA-256 `7d06b80bad8b3bc7767521941013445cb934a22c13f7cf4be7b0f789fb8f1fac`。

正式V1门禁a476：阶段文档审计PASS、证据审计PASS（1085引用、148份Manifest、287项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。真实睡眠/唤醒、历史Run结构化导出、未决决定/旧Run处置、全域恢复、Ubuntu及当前范围人验仍未满足。[日志](../../../evidence/audits/2026-10-10-v1-version-gate-a476.log)，SHA-256 `35c491d8ae48510c52499e1a0a2e1f7e2b21034d830668bfacf0013d0794e5eb`。

正式V1门禁a477：五阶段文档审计PASS、证据审计PASS（1086引用、148份Manifest、287项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。指定历史Run导出、未决业务/旧Run决定、全域恢复、Ubuntu及五阶段当前范围人工验收未满足。[日志](../../../evidence/audits/2026-10-10-v1-version-gate-a477.log)，SHA-256 `9d5e0d0c5c42ec645040dc19ecc2da9f4dab7740ccdae7ab970586c4c3044e68`。

正式V1门禁a478：阶段文档审计PASS、证据审计PASS（1087引用、148份Manifest、287项），版本仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。历史Run导出、业务/旧Run决定、全域恢复、Mac睡眠/唤醒、Ubuntu及五阶段当前范围人验未满足。[日志](../../../evidence/audits/2026-10-10-v1-version-gate-a478.log)，SHA-256 `6409e34678c80f71c2420b46ca3070401dc5a9b778b61fcf966a90a2a6e5ecc1`。

正式V1门禁a479：阶段文档审计PASS、证据审计PASS（1090引用、148份Manifest、287项），版本仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。历史Run导出、未决决策/旧Run处置、全域恢复、Mac睡眠/唤醒实测、Ubuntu及用户验收未完成。[日志](../../../evidence/audits/2026-10-10-v1-version-gate-a479.log)，SHA-256 `c9b9da25e1597fcad6f1c3a3f6feac4fa869202cf5e2ef2ca26884e42cf355fe`。

正式V1门禁a480：阶段文档审计PASS、证据审计PASS（1096引用、148份Manifest、287项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。历史Run导出、业务/旧Run决定、全域恢复、Mac睡眠/唤醒、真实Ubuntu及当前范围人验未满足。[日志](../../../evidence/audits/2026-10-10-v1-version-gate-a480.log)，SHA-256 `8c42adcdf0f7c230eaa8d2524bead32289e8ca849a417aea83ec0ef0c24a1016`。

正式V1门禁a481：五阶段文档审计PASS、证据审计PASS（1103引用、148份Manifest、287项），版本仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。历史Run结构化导出、业务/旧Run决策、真实Ubuntu及全域恢复、Mac睡眠/唤醒和当前范围用户验收仍未完成。[日志](../../../evidence/audits/2026-10-10-v1-version-gate-a481.log)，SHA-256 `3038bdf1e9fd6e633009f52c200c1a3293ce2f3d33af20dda18d78a52209b3e8`。

2026-10-10 正式V1门禁a482：五阶段文档审计PASS；证据审计PASS（1105引用、148份Manifest、287项），版本仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。V1.2历史Run `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`与V1.5历史Runs `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`仍缺结构化导出；OD-013/014与旧Run处置、Mac睡眠/唤醒演练、全域活动恢复、Ubuntu实机验证及当前范围用户验收仍未完成。未替代历史Run、未签署用户验收。[a482日志](../../../evidence/audits/2026-10-10-v1-version-gate-a482.log)，SHA-256 `4655c2042d98b3cb79ac2a1816ba65d5158fd9382719ce8263d0ce705420b34e`。

正式V1门禁a483（整版工程基线证据同步后）：五阶段文档审计PASS、证据审计PASS（1106引用、148份Manifest、287项），版本仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。四个历史TestRun结构化导出、政策/旧Run决定、全域恢复、Mac睡眠/唤醒、Ubuntu及当前范围人工验收仍未完成。[a483日志](../../../evidence/audits/2026-10-10-v1-version-gate-a483.log)，SHA-256 `8e8fe91b8aeadfc0607b2bad8a3c73f8b3cf924bbd937fb1b3f78bb048895eb2`。

正式V1门禁a484（修正进度证据链接并同步a483历史后）：五阶段文档审计PASS、证据审计PASS（1107引用、148份Manifest、287项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。a483中记录的四个历史Run导出、未决政策/旧Run处置、完整恢复、Mac睡眠/唤醒、Ubuntu与当前范围人工验收仍未完成。[a484日志](../../../evidence/audits/2026-10-10-v1-version-gate-a484.log)，SHA-256 `78f19d2fd0940def8d7ccf4634330277a8faf908f5939de49d717854a7d28854`。

正式V1门禁a485（A29责任类型矩阵及Crosswalk复验同步后）：五阶段文档审计PASS、证据审计PASS（1108引用、148份Manifest、287项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。A29仅完成74条交付/测试/门禁记录的跨服务责任分类；剩余38条运行/实现责任、四个历史Run导出、决定与旧Run处置、全域恢复、环境实测和当前范围人工验收仍未满足。[a485日志](../../../evidence/audits/2026-10-10-v1-version-gate-a485.log)，SHA-256 `2a3c12e0967a80ffc9689d37a62be1149f9c8e4e4d793ba2b1b0fd331592a3be`。

正式V1门禁a486（A30将38条第8节执行记录分类后）：五阶段文档审计PASS、证据审计PASS（1109引用、148份Manifest、287项），版本仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。A30只补责任类型分类，不代表手册执行、服务语义映射或验收完成；四个历史Run导出、业务/旧Run决定、全域恢复、Mac睡眠/唤醒、Ubuntu及当前范围人工验收继续开放。[a486日志](../../../evidence/audits/2026-10-10-v1-version-gate-a486.log)，SHA-256 `74ee14ad8cfde06939fc8dd881c9464b4470790a2c24c089f5ea613a9b4a439e`。

正式V1门禁a489（版本计划五阶段摘要更新与表格修正后）：五阶段文档审计PASS、证据审计PASS（1110引用、148份Manifest、287项），版本仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。V1.1–V1.5均保持PARTIALLY_IMPLEMENTED；历史TestRun导出、待决决定/旧Run处置、完整恢复、Mac睡眠/唤醒、Ubuntu及当前范围用户验收未完成。[a489日志](../../../evidence/audits/2026-10-10-v1-version-gate-a489.log)，SHA-256 `9c6741d8483fab053537cdc74dd1c5f02b80967d8b1f38b9b6a54bef33021c51`。

正式V1门禁a491（V1.4当前树完整code suite记录同步后）：五阶段文档审计PASS、证据审计PASS（1114引用、148份Manifest、287项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。本次V1.4 code suite只加强当前代码兼容证据，不关闭P4完整规则/结算、OD-014、Ubuntu、人验或历史Run导出。[a491日志](../../../evidence/audits/2026-10-10-v1-version-gate-a491.log)，SHA-256 `55e33fd13b95adb18cd2aeb6e7c2478b31df7f033afee71ba9f21d4fe4dc1e30`。

正式V1门禁a492（修正V1.4状态摘要并同步a491结果后复核）：五阶段文档审计PASS、证据审计PASS（1117引用、148份Manifest、287项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。阶段代码/固定切片通过不替代规则结算、历史导出、环境实测及人工验收；未新增签署。[a492日志](../../../evidence/audits/2026-10-10-v1-version-gate-a492.log)，SHA-256 `4343ed66a7410fe1b212ebeb8fff9684507d1d1d5227d8f9dc496ea94e1c4990`。

正式V1门禁a493（P0 A31服务责任映射及当前Crosswalk复核后）：五阶段文档审计PASS、证据审计PASS（1118引用、148份Manifest、287项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。A31只明确V1.3-L13～L17责任分工，不证明功能、测试充分性或接受通过；历史导出、OD/旧Run处置、活动/全域恢复、Ubuntu和用户当前范围人验仍开放。[a493日志](../../../evidence/audits/2026-10-10-v1-version-gate-a493.log)，SHA-256 `7a097acbfcbfa9eed43bdc0e5c24393104bfcf9904decce17eb9f68ced5005ef`。

正式V1门禁a494（V1.1当前树code suite记录同步后）：五阶段文档审计PASS、证据审计PASS（1232引用、148份Manifest、287项），V1仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。V1.1工程兼容代码复验通过不改变活动API切换/回退、旧Run处置、目标Ubuntu或当前范围人工验收的未完成状态；四个历史TestRun导出和OD/恢复缺口仍开放。[a494日志](../../../evidence/audits/2026-10-10-v1-version-gate-a494.log)，SHA-256 `43a0e23a1eb2692b84f53e7f7372d5925533fa71cffae57981b7259f29f48470`。


正式V1门禁a495（V1.3当前树Web/API/CLI E2E记录同步后）：五阶段文档审计PASS、证据审计PASS（1235引用、148份Manifest、287项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。V1.3固定场景当前树27/27通过仅更新工程证据；四个历史TestRun结构化导出缺失、OD/旧Run与活动数据处置决定、完整跨域恢复、Mac睡眠/唤醒、目标Ubuntu及当前范围用户验收仍未完成。[a495日志](../../../evidence/audits/2026-10-10-v1-version-gate-a495.log)，SHA-256 `29f33cd25b0828fbc542565d70cc6eec03695ee13510ccb19b56e3b5cfcdf51a`。


正式V1门禁a496（2026-10-10）：五阶段文档审计PASS、证据审计PASS（1239引用、149份Manifest、288项），V1仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。本轮V1.5睡眠/唤醒仅完成随机隔离栈、NO_TRADE Run及睡眠前CLI/导出准备；Mac锁屏期间未执行真实睡眠/唤醒，阶段和版本人工验收均未签署。四个历史Run导出、政策/旧Run处置、活动/全域恢复与Ubuntu仍未满足。[a496日志](../../../evidence/audits/2026-10-10-v1-version-gate-a496.log)，SHA-256 `0d1279c86b956bb6ab22673e32d3bf36772360240daf38f37dc265b5bc492e11`。


正式V1门禁a497（2026-10-10 V1.5睡眠/唤醒手册命令修正后）：阶段文档审计PASS、证据审计PASS（1240引用、149份Manifest、288项），V1仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。CLI/Evidence Export手册现要求显式本地API地址、隐藏会话Cookie及`--stage V1.5`；这改善可执行性，但Mac实际睡眠/唤醒仍NOT_RUN，人工验收未签署。[a497日志](../../../evidence/audits/2026-10-10-v1-version-gate-a497.log)，SHA-256 `5f9cefd671ea6cec7f7aa9aa1373b093164e33a412bd942c671044a4db328250`。


正式V1门禁a498（2026-10-10）：五阶段文档审计PASS、证据审计PASS（1242引用、149份Manifest、288项），V1仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。V1.1第2/7/8节23条要求已完成人工责任映射，但业务交付、活动切换和人验状态不因此改变。[a498日志](../../../evidence/audits/2026-10-10-v1-version-gate-a498.log)，SHA-256 `e377fc67dcc2b603f24f3f0c91f70d2eab82d0b9fbc910299f346713745eca1d`。


正式V1门禁a499（2026-10-10）：五阶段文档审计PASS、证据审计PASS（1245引用、149份Manifest、288项），版本仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。V1.2责任映射已记录但不改变业务/人工验收状态；历史Run、政策、恢复、Ubuntu和当前范围签署仍未满足。[a499日志](../../../evidence/audits/2026-10-10-v1-version-gate-a499.log)，SHA-256 `fb085de49cfb5b29b23f571be60769f48fcd8880b6ce351ab3c4dc00d460b314`。


正式V1门禁a500（2026-10-10）：五阶段文档审计PASS、证据审计PASS（1248引用、149份Manifest、288项），V1仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。本轮V1.4责任归属记录不替代规则/费用/结算一致性、OD-014或用户验收。[a500日志](../../../evidence/audits/2026-10-10-v1-version-gate-a500.log)，SHA-256 `b4de366ad163c4cda63a2c7f7468233cf77316417711c6d80d8d4abe3d3739c5`。


正式V1门禁a501（2026-10-10）：五阶段文档审计PASS、证据审计PASS（1251引用、149份Manifest、288项），V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。V1.5责任映射只厘清所有权；Mac睡眠/唤醒仍NOT_RUN，目标Ubuntu、全域恢复与当前范围人工验收均未通过。[a501日志](../../../evidence/audits/2026-10-10-v1-version-gate-a501.log)，SHA-256 `8d2b90096ebdc8bf5c6c37c95180743aba98552af4efe86f95fdaf6df8a28eb4`。

正式V1门禁a502（2026-10-10）：五阶段文档与证据审计PASS（1255引用、149份Manifest、288项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。V1.3责任映射不代表业务验收；缺失的历史Run导出、OD-013/014决定、活动存储切换/回退与旧Run处置、全V1恢复、Mac睡眠/唤醒、Ubuntu和当前范围用户签署仍开放。[a502日志](../../../evidence/audits/2026-10-10-v1-version-gate-a502.log)，SHA-256见sidecar。

正式V1门禁a503（2026-10-10）：五阶段文档与证据审计PASS（1258引用、149份Manifest、288项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。本次V1.4责任映射不构成P4或用户验收；历史Run原始导出、OD-013/014及旧Run决定、活动数据恢复/切换、Mac睡眠唤醒、Ubuntu和当前范围用户签署继续开放。[a503日志](../../../evidence/audits/2026-10-10-v1-version-gate-a503.log)，SHA-256见sidecar。

正式V1门禁a504（2026-10-10）：五阶段文档与证据审计PASS（1131引用、150份Manifest、289项）；V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。责任映射及V1.4拒绝测试增量不构成阶段或版本签收；历史Run原始导出、OD-013/014与旧Run处置、活动/全域恢复、Mac睡眠唤醒、Ubuntu和当前范围用户签署仍未满足。[a504日志](../../../evidence/audits/2026-10-10-v1-version-gate-a504.log)，SHA-256见sidecar。

正式V1门禁a505（2026-10-10）：五阶段文档与证据审计PASS（1133引用、150份Manifest、289项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。V1.4固定拒绝测试/代码套件通过不构成完整规则验收；历史Run导出、政策/旧Run处置、活动及全域恢复、Mac睡眠唤醒、Ubuntu和用户当前范围签署仍未满足。[a505日志](../../../evidence/audits/2026-10-10-v1-version-gate-a505.log)，SHA-256见sidecar。

正式V1门禁a506（2026-10-10）：五阶段文档与证据审计PASS（1135引用、150份Manifest、289项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。NATS健康探针配置已修正但活动容器仍未重建；版本验收继续受历史导出、政策决定、活动/配对恢复、宿主及Ubuntu实机和用户签署阻塞。[a506日志](../../../evidence/audits/2026-10-10-v1-version-gate-a506.log)，SHA-256见sidecar。

正式V1门禁a507（2026-10-10）：阶段文档与证据审计PASS（1136引用、150份Manifest、289项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。NATS配置探针修正仅在声明文件与当前JetStream端点验证，活动容器尚未应用；历史Run、政策、配对恢复、Mac/Ubuntu及用户验收未满足。[a507日志](../../../evidence/audits/2026-10-10-v1-version-gate-a507.log)，SHA-256见sidecar。

正式V1门禁a508（2026-10-10）：阶段文档及证据审计PASS（1138引用、150份Manifest、289项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。V1.5 NATS探针在配置与JetStream端点上已验证，但现存容器尚未应用；其余历史、决策、恢复、实机及人验要求仍未满足。[a508日志](../../../evidence/audits/2026-10-10-v1-version-gate-a508.log)，SHA-256见sidecar。

正式V1门禁a509（2026-10-10）：五阶段文档与证据审计PASS（1141引用、150份Manifest、289项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。NATS探针在唯一命名隔离容器实际healthy，既有验收栈未应用该改动；其余历史证据、政策、恢复、主机/Ubuntu与用户签署仍未满足。[a509日志](../../../evidence/audits/2026-10-10-v1-version-gate-a509.log)，SHA-256见sidecar。

正式V1门禁a510（2026-10-10）：五阶段文档与证据审计PASS（1141引用、150份Manifest、289项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。V1.1隔离启动/关闭文档子项已实跑验证；当前范围人工签收、Ubuntu与其他版本门槛未满足。[a510日志](../../../evidence/audits/2026-10-10-v1-version-gate-a510.log)，SHA-256见sidecar。

正式V1门禁a511（2026-10-10）：阶段文档及证据审计PASS（1143引用、150份Manifest、289项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。V1.5当前Web/API入口只读可用；NATS探针未应用至该栈，业务/人验未执行；历史与环境门槛保持未满足。[a511日志](../../../evidence/audits/2026-10-10-v1-version-gate-a511.log)，SHA-256见sidecar。


正式V1门禁a512（交付手册映射修订与crosswalk复核后）：五阶段文档与证据索引审计PASS（1143引用、150份Manifest、289项），版本仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。Crosswalk仅证明所列V1.1/V1.5本地操作手册子项可执行，不改变4个历史TestRun结构化导出、OD决策/旧Run处置、活动与全域恢复、Mac/Ubuntu实机和当前范围本人验收的未完成状态。[a512日志](../../../evidence/audits/2026-10-10-v1-version-gate-a512.log)，SHA-256 `ee808eaa4ef305904ca8669aad39bac8125d676f655702b6fa4ae947e33b3966`。


2026-10-10正式V1门禁a514（V1.5当前树代码套件a01及阶段§8.34同步后）：阶段文档审计PASS、证据审计PASS（1147引用、151份Manifest、290项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。V1.5完整code suite受控exit 0，仅关闭当前树工程回归子项；4个历史TestRun结构化导出、开放决策与旧Run处置、活动数据/全域恢复、Mac睡眠唤醒、Ubuntu实机及当前范围本人验收继续未满足。[a514日志](../../../evidence/audits/2026-10-10-v1-version-gate-a514.log)，SHA-256 `62550d46a9ab190444185318999c8b63e9a05325d1186a74b7a8976f9e221957`。


正式V1门禁a515（V1.5当前树代码套件及完整隔离栈NATS健康复验入档后）：五阶段文档审计PASS，证据审计PASS（1150引用、152份Manifest、291项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。V1.5完整code suite与新隔离栈启动/健康/清理子项通过；4个历史TestRun结构化导出、OD-013/014及旧Run处置、活动数据/全域恢复、Mac睡眠唤醒、Ubuntu实机及当前范围本人验收仍未满足。[a515日志](../../../evidence/audits/2026-10-10-v1-version-gate-a515.log)，SHA-256 `7aa9e459654dc9b7a578cada7af713cf085b7e151008a6e66d1178127cb91267`。


正式V1门禁a516（V1.5完整隔离栈探针证据及00/99当前摘要同步后）：五阶段文档审计PASS，证据审计PASS（1158引用、153份Manifest、292项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。V1.5当前树完整code suite及新栈NATS健康/清理通过；4个历史TestRun导出、OD-013/014与旧Run决定、活动/全域恢复、Mac睡眠唤醒、Ubuntu实机和当前范围本人验收继续开放。[a516日志](../../../evidence/audits/2026-10-10-v1-version-gate-a516.log)，SHA-256 `a80f97cdca3f21a494609f2a00ac8adaf4c7917cb08d76b9fa69727931279a44`。


正式V1门禁a517（V1.5保留交互栈只读快照及阶段记录同步后）：阶段文档审计PASS、证据审计PASS（1161引用、154份Manifest、293项），V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。新隔离栈NATS修正探针健康，但保留栈仍旧探针unhealthy且未更改；历史TestRun导出、待决决策/旧Run处置、活动和全域恢复、睡眠唤醒、Ubuntu与本人验收继续OPEN。[a517日志](../../../evidence/audits/2026-10-10-v1-version-gate-a517.log)，SHA-256 `0fe88eb5a18d3e40afb9f4fa49fbec051eac663c2f1bb27edf2f5860eb7d1c0c`。


正式V1门禁a520（更新当前版本摘要并同步WAITING运行保护后）：五阶段文档审计PASS、证据审计PASS（1159引用、154份Manifest、293项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。保留栈1个WAITING Run导致NATS修正暂不应用；新隔离栈健康和清理通过。历史导出、决策、数据恢复、宿主/Ubuntu和本人验收仍未满足。[a520日志](../../../evidence/audits/2026-10-10-v1-version-gate-a520.log)，SHA-256 `3d680980588cd4a21f069906568bdaea04fb9b1572d8468b4237bbfe72598956`。


正式V1门禁a521（WAITING normal TestRun只读详情入档后）：五阶段文档审计PASS、证据审计PASS（1162引用、155份Manifest、294项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。保留栈唯一normal运行仍WAITING（2断言、无完成时间），故NATS暂不重启；新隔离栈探针测试PASS。历史TestRun导出、待决决定、活动/全域恢复、Mac/Ubuntu及人工验收仍OPEN。[a521日志](../../../evidence/audits/2026-10-10-v1-version-gate-a521.log)，SHA-256 `534397be0ce9f1f135a4cf841d092ae8d6ea0f01f1f5d592194384403a638786`。


正式V1门禁a522（保留栈NATS探针修复及阶段§8.39入档后）：五阶段文档审计PASS、证据审计PASS（1165引用、155份Manifest、294项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。保留栈NATS已健康且JetStream消息/consumer持久状态、WAITING Run和Web/API复验保持；历史导出、结算/Artifact决策、活动与全域恢复、Mac/Ubuntu实机及本人验收仍未满足。[a522日志](../../../evidence/audits/2026-10-10-v1-version-gate-a522.log)，SHA-256 `c17aeee2961e7d62b467e8f32b8a250a3c2cfe3b7b58477662c15e6aadb8429b`。


正式V1门禁a523（a522摘要同步后）：五阶段文档审计PASS，证据审计PASS（1163引用、155份Manifest、294项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。a06证明保留V1.5 NATS探针已应用、JetStream持久状态与TestRun未变；4个历史Run结构化导出、OD-013/014/旧Run决定、活动/全域恢复、Mac/Ubuntu实机和本人验收未满足。[a523日志](../../../evidence/audits/2026-10-10-v1-version-gate-a523.log)，SHA-256 `4cba7a95fb59a0ecaeaa8c94a2b00478a811fd47486cd107fd95ec3c63baa029`。


正式V1门禁a524（A06保留栈探针修复、A34/A27追踪同步后）：五阶段文档与证据审计均PASS（1164引用、155份Manifest、294项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。NATS已在保留栈应用并验证healthy；4个历史Run导出、待决决策/旧Run处置、活动与全域恢复、Mac睡眠唤醒、Ubuntu和本人验收仍未满足。[a524日志](../../../evidence/audits/2026-10-10-v1-version-gate-a524.log)，SHA-256 `91b0f7a83e5255594653095e8d184fcde1481c354c06686612e10767c5eb9a27`。


正式V1门禁a525（当前摘要同步后）：五阶段文档审计PASS，证据审计PASS（1165引用、155份Manifest、294项），V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。V1.5保留栈NATS修正及A34追踪同步均被证据索引识别；4个历史TestRun结构化导出缺失，另有OD/旧Run决策、活动与全域恢复、Mac/Ubuntu实机和本人验收未完成。[a525日志](../../../evidence/audits/2026-10-10-v1-version-gate-a525.log)，SHA-256 `c17aeee2961e7d62b467e8f32b8a250a3c2cfe3b7b58477662c15e6aadb8429b`。


正式V1门禁a526：五阶段文档审计PASS，证据审计PASS（1166引用、155份Manifest、294项），但V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。四个历史Run结构化导出及业务/环境/人工验收门槛尚未满足；本次未改变任何阶段状态或签署。[a526日志](../../../evidence/audits/2026-10-10-v1-version-gate-a526.log)，[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a526.log.sha256)。


正式V1门禁a527：五阶段文档与证据审计PASS（1168引用、156份Manifest），但V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。历史Run和业务/环境/人工验收门槛仍开放。[a527日志](../../../evidence/audits/2026-10-10-v1-version-gate-a527.log)，[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a527.log.sha256)。


2026-10-10 V1.2自动化增量：新冻结输入`v1.2-market-data-5`加入显式CN/US合成交易日历，验证某市场整日缺Bars时Qlib窗口不压缩并在拟合前fail-closed。当前树V1.2完整code suite exit 0，隔离Web/API/CLI四Run通过；机器报告为[TestRun与Manifest](../../../evidence/audits/2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-b8ba70b2115aa4208ee8.json)，套件日志[见此](../../../evidence/audits/2026-10-10-v12-market-session-calendar-code-suite-a02.log)。V1.2仍PARTIALLY_IMPLEMENTED；人工验收、历史Run导出、真实市场日历、Ubuntu和V1正式门禁不因此关闭。


正式V1门禁a528：五阶段文档与证据审计PASS（1176引用、157份Manifest），但V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。V1.2新增合成市场日历子项通过，版本必需历史证据、决策、恢复、主机环境及本人验收仍开放。[a528日志](../../../evidence/audits/2026-10-10-v1-version-gate-a528.log)，[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a528.log.sha256)。


正式V1门禁a529：文档与证据审计PASS（1180引用、158份Manifest），V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。历史Run、政策决定、全域恢复、环境与本人验收继续开放。[a529日志](../../../evidence/audits/2026-10-10-v1-version-gate-a529.log)，[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a529.log.sha256)。


正式V1门禁a530：文档与证据审计PASS（1184引用、159份Manifest），但V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。阻塞项包括4个历史Run导出、未决政策与旧Run、活动/全版恢复、Mac/Ubuntu实机及本人验收。[a530日志](../../../evidence/audits/2026-10-10-v1-version-gate-a530.log)，[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a530.log.sha256)。


正式V1门禁a531：阶段文档/证据审计PASS（1188引用、160份Manifest），V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。本轮只修正验收手册状态总览，不改变阶段状态。[a531日志](../../../evidence/audits/2026-10-10-v1-version-gate-a531.log)，[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a531.log.sha256)。

2026-10-10 V1.4拒绝订单资源释放自动化子项：隔离真实Governance/Trade/Portfolio HTTP+PostgreSQL验证授权ZERO_VOLUME订单形成REJECTED事实并由Reservation Resolution Outbox只释放原Reservation；账户现金和Portfolio Ledger不变、无FakeBroker Fill/资产事件，同命令重试回读同一拒绝。完整code suite exit 0，详见[V1.4 §8.73](./04-daily-backtest.md#873-v14历史fakebroker终态拒绝释放资源预留2026-10-10)及[日志](../../../evidence/audits/2026-10-10-v14-zero-volume-reservation-release-code-suite-a02.log)。这是自动化固定子项记录，不是用户签署或V1.4/P4阶段验收。

正式V1门禁a570：五阶段文档审计PASS、证据审计PASS（1231引用、168份Manifest、307项），版本仍INCOMPLETE/exit 2。V1.4零成交终态拒绝释放Portfolio原预留的隔离自动子项已通过；本记录不代表完整阶段人工验收或用户签署。四个历史Run导出、OD-013/014与旧Run处置、全域恢复、Mac/Ubuntu及当前范围人工验收仍未完成。[a570门禁](../../../evidence/audits/2026-10-10-v1-version-gate-a570.log)，SHA见sidecar。

正式V1门禁a571：五阶段文档及证据审计PASS（1234引用、169份Manifest、308项），V1仍INCOMPLETE/exit 2。V1.4自动化零成交拒绝释放Reservation子项已验证；不替代本人验收或阶段整体签署。四个历史Run导出、所有者决定/旧Run处置、全域恢复、Mac/Ubuntu及当前范围用户验收仍未满足。[a571日志](../../../evidence/audits/2026-10-10-v1-version-gate-a571.log)，SHA sidecar见文件旁。

2026-10-10正式门禁a572：文档/证据审计PASS（1238引用、170份Manifest、309项），版本仍INCOMPLETE/exit 2；四个历史TestRun结构化导出、所有者决策/旧Run处置、恢复与目标环境及当前范围人验仍未满足。[日志](../../../evidence/audits/2026-10-10-v1-version-gate-a572.log)。

2026-10-10正式门禁a573：五阶段文档审计PASS、证据审计PASS（1239引用、170份Manifest、309项），V1仍INCOMPLETE/exit 2。历史TestRun导出、旧Run处置、恢复、Mac/Ubuntu目标环境和当前范围人验仍未满足。[门禁日志](../../../evidence/audits/2026-10-10-v1-version-gate-a573.log)。

2026-10-10正式门禁a574：文档审计与证据审计PASS（1240引用、170份Manifest、309项）；V1仍INCOMPLETE/exit 2，缺失历史导出、决策/旧Run处置、恢复、目标环境及当前范围人验仍未完成。[a574日志](../../../evidence/audits/2026-10-10-v1-version-gate-a574.log)。

2026-10-10正式V1门禁a596：当前树全服务数据库/Artifact卷合成行隔离恢复已通过§8.40，阶段文档审计PASS、证据审计PASS（1272引用、174份Manifest、313项）；V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。四个历史TestRun结构化导出、OD-013/014与旧Run处置、实际V1产物/同点NATS-Temporal/宿主恢复、Mac睡眠唤醒、Ubuntu实机及本轮人工验收未满足。[门禁日志](../../../evidence/audits/2026-10-10-v1-version-gate-a596.log)、[exit](../../../evidence/audits/2026-10-10-v1-version-gate-a596.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a596.log.sha256)。

2026-10-10正式V1门禁a598：五阶段文档审计PASS，证据审计PASS（1276引用、175份Manifest、314项），V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。a597因a596日志SHA sidecar格式不合规范造成证据审计失败，已更正并保留历史；a598复验通过。四个历史TestRun当前本地API仍404且结构化导出缺失，OD-013/014与旧Run处置、实际V1产物/活动恢复、Mac睡眠唤醒、Ubuntu实机和当前范围本人验收仍未满足。[a598门禁](../../../evidence/audits/2026-10-10-v1-version-gate-a598.log)、[exit](../../../evidence/audits/2026-10-10-v1-version-gate-a598.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a598.log.sha256)。

2026-10-10正式V1门禁a599：V1.2 Qlib ArtifactRef及共享字节卷合成配对恢复已通过§8.41；五阶段文档和证据审计PASS（1281引用、176份Manifest、315项），整体仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`。历史TestRun导出、OD-013/014与旧Run处置、真实V1服务状态/活动与宿主恢复、Mac睡眠唤醒、Ubuntu实机和当前范围本人验收仍未满足。[a599日志](../../../evidence/audits/2026-10-10-v1-version-gate-a599.log)、[exit](../../../evidence/audits/2026-10-10-v1-version-gate-a599.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a599.log.sha256)。

2026-10-10正式V1门禁a602：V1.4 Quant BacktestRun/Manifest与Platform TestRun报告投影的合成配对恢复加入§8.42并通过隔离集成测试；阶段文档审计PASS，证据审计PASS（1289引用、178份Manifest、317项），但V1仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`。四个历史Run结构化导出、OD-013/014及旧Run处置、真实V1产物/同点NATS-Temporal/活动与宿主恢复、Mac睡眠唤醒、Ubuntu实机及当前范围本人验收仍未满足。[a602日志](../../../evidence/audits/2026-10-10-v1-version-gate-a602.log)、[exit](../../../evidence/audits/2026-10-10-v1-version-gate-a602.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a602.log.sha256)。

门禁a601的证据审计因本轮新生成a600日志SHA sidecar使用错误相对路径而FAIL；已修正a600/a601 sidecar为仓库根目录相对路径，并由a602复验PASS。a601记录保留为失败历史，不视为业务阶段失败。

最终复核a603（a601 sidecar路径修复与失败历史说明同步后）：阶段文档审计PASS，证据审计PASS（1289引用、178份Manifest、317项），整体仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`；未决项同a602所列。[a603日志](../../../evidence/audits/2026-10-10-v1-version-gate-a603.log)、[exit](../../../evidence/audits/2026-10-10-v1-version-gate-a603.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a603.log.sha256)。

2026-10-10复核a604（P0交叉索引计数与P1迁移CLI状态校准后）：五阶段文档审计PASS，证据审计PASS（1292引用、179份Manifest、318项），整体仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`；缺项仍以本表列示的历史Run导出、未决事项、阶段工程/环境及本人验收为准。[a604日志](../../../evidence/audits/2026-10-10-v1-version-gate-a604.log)、[exit](../../../evidence/audits/2026-10-10-v1-version-gate-a604.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a604.log.sha256)。

2026-10-10 V1.5刷新与Platform进程崩溃恢复增量：四场景Web/API/CLI/export隔离E2E 3/3通过；normal TestRun `2731058c-1e27-4bf7-837c-218967922900`刷新后仍可读，Platform API主进程在Temporal Activity期间SIGKILL后自动重启，原Workflow完成120项观察；同Run CLI/export通过。AUTO、rejection、recovery Run分别为`a6b86eb8-67d9-4eef-99c6-6476d1761924`、`0e81899a-9c6d-42c6-92df-360b1c45eee3`、`2c7884a4-fb62-4bba-a135-df3f82710cce`。完整细节和SHA见[阶段§8.43](./05-scheduling-and-recovery.md#843-页面刷新与platform-api进程崩溃恢复2026-10-10)及[机器报告](../../../evidence/audits/2026-10-10-v15-nats-temporal-dispatch-sq-v15-e2e-df1ddabd2e4498763cd4.json)。这是隔离NO_TRADE恢复子项，保留栈状态未改变；阶段与版本人工验收仍NOT_RUN，V1正式门禁待复核。


正式V1门禁a605（纳入§8.43刷新/Platform PID 1崩溃恢复、测试计划、验收表、P5计划摘要及crosswalk更新后）：五阶段文档审计PASS；证据审计PASS（1300引用、181份Manifest、320项）；V1仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`。TestRun证据审计11个ID中7个PASS、4个历史导出缺失：V1.2 `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`，V1.5 `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`。其他阶段工程、OD-013/014与旧Run决定、实际恢复/目标环境及用户本人验收仍开放。[a605门禁日志](../../../evidence/audits/2026-10-10-v1-version-gate-a605.log)、[exit](../../../evidence/audits/2026-10-10-v1-version-gate-a605.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a605.log.sha256)。


2026-10-10正式V1门禁a606：五阶段文档审计PASS，证据审计PASS（1303引用、182份Manifest、321项），但V1仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`。TestRun证据审计11个ID中7个PASS、4个历史结构化导出缺失（V1.2 `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`；V1.5 `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`）；OD-013/014与旧Run处置、环境/恢复及本人当前范围验收仍未满足。[a606日志](../../../evidence/audits/2026-10-10-v1-version-gate-a606.log)、[exit](../../../evidence/audits/2026-10-10-v1-version-gate-a606.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a606.log.sha256)。
2026-10-10 V1.5保留栈Platform API恢复与同Run核查：精确API容器由OOM退出后设置`unless-stopped`并启动，API/Web恢复200；对normal TestRun `1f9b8fd0-9a51-45eb-803d-b613bbd8d126`执行GET-only `--check-only`，退出2，系统调度断言WAITING/NOT_RUN、HOLD断言PASS（120观察、0订单/Fill）。恢复及限制见[§8.44](./05-scheduling-and-recovery.md#844-保留v15栈platform-api恢复与同run只读核查2026-10-10)、[快照](../../../evidence/audits/2026-10-10-v15-platform-api-recovered-live-stack-a01.json)、[check-only摘要](../../../evidence/audits/2026-10-10-v15-retained-normal-run-checkonly-a01.json)。该执行记录不构成阶段或V1通过，也不签署用户验收；当前版本门禁仍待复核。

正式V1门禁a607（文档/证据审计通过）：五阶段文档审计PASS；证据审计PASS（1312引用、184份Manifest、323条目）；整体V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。四个指定历史Run导出缺失，OD-013/014与旧Run处置、恢复/目标环境及当前范围用户验收仍开放。[门禁日志](../../../evidence/audits/2026-10-10-v1-version-gate-a607.log)、[exit](../../../evidence/audits/2026-10-10-v1-version-gate-a607.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a607.log.sha256)。

正式V1门禁a608：阶段文档审计PASS、证据审计PASS（1315引用、185份Manifest、324项）；V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。缺失历史TestRun导出及其他开放条件仍未满足。[a608日志](../../../evidence/audits/2026-10-10-v1-version-gate-a608.log)、[exit](../../../evidence/audits/2026-10-10-v1-version-gate-a608.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a608.log.sha256)。

2026-10-10 V1跨服务客户端合同增量：Platform→Trade Execution外部FakeBroker订单观察客户端直接锁定路由、请求体、服务身份/Bearer及超时信号；Platform 327项单测/typecheck和完整V1.3 code suite exit 0，见[V1.1 §8.33](./01-environment-and-web-center.md#833-platformtrade-execution外部fakebroker订单观察客户端合同2026-10-10)、[V1.3 §8.77](./03-fake-broker-trading-loop.md#877-外部fakebroker订单观察生成客户端合同回归2026-10-10)。此为单操作合同证据，不代表P1/P3父项、阶段或版本验收完成。

正式V1门禁a609：新增外部FakeBroker订单观察客户端合同及阶段文档同步后，五阶段文档审计PASS、证据审计PASS（1323引用、187份Manifest、326项），V1仍INCOMPLETE/exit 2。未取得的历史Run导出、所有者决策、环境/恢复和本人验收继续OPEN。[a609日志](../../../evidence/audits/2026-10-10-v1-version-gate-a609.log)、[exit](../../../evidence/audits/2026-10-10-v1-version-gate-a609.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a609.log.sha256)。

正式V1门禁a610：阶段文档审计PASS，证据审计PASS（1326引用、188份Manifest、327项），但V1仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`；历史导出、待决条件及本人验收未满足。[a610日志](../../../evidence/audits/2026-10-10-v1-version-gate-a610.log)、[exit](../../../evidence/audits/2026-10-10-v1-version-gate-a610.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a610.log.sha256)。

2026-10-10 P1/A04 Trade→Governance V1.3客户端合同增量：Proposal读取、执行授权创建与授权校验三条真实出站操作新增逐项路由/身份/载荷/响应测试；定向3/3、Trade typecheck和完整V1.3 code suite exit 0。见[V1.3 §8.78](./03-fake-broker-trading-loop.md#878-trade→decision-governance-v13授权客户端操作合同2026-10-10)及[套件日志](../../../evidence/audits/2026-10-10-v13-trade-governance-client-contract-code-suite-a01.log)。该增量不构成P3父项或阶段人工验收。

正式V1门禁a611：阶段文档审计PASS、证据审计PASS（1331引用、189份Manifest、328项），V1仍INCOMPLETE/exit 2且`uncheckedVersionGate=true`；历史Run导出、所有者决策、环境/恢复及本人验收继续未满足。[a611日志](../../../evidence/audits/2026-10-10-v1-version-gate-a611.log)、[exit](../../../evidence/audits/2026-10-10-v1-version-gate-a611.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a611.log.sha256)。

2026-10-10正式V1门禁a612（V1.4冻结停牌/涨停Paper拒单子场景、§8.77及crosswalk同步后）：五阶段文档审计PASS，证据审计PASS（1338引用、191份Manifest、330项），但整体V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。四个历史TestRun结构化导出、OD-013/014及旧Run处置、活动与全域恢复、Mac/Ubuntu环境和当前范围人工验收仍开放。[a612门禁日志](../../../evidence/audits/2026-10-10-v1-version-gate-a612.log)、[exit](../../../evidence/audits/2026-10-10-v1-version-gate-a612.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a612.log.sha256)。该自动门禁记录不是用户签署。

正式V1门禁a613（V1.4 Paper市场限制固定HTTP场景、阶段/测试计划与crosswalk更新后）：五阶段文档审计PASS，证据审计PASS（1341引用、192份Manifest、331项），但V1仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`。历史TestRun结构化导出、OD-013/014及旧Run处置、活动/全域恢复、Mac睡眠唤醒、Ubuntu实机和本人当前范围验收仍未满足。[a613日志](../../../evidence/audits/2026-10-10-v1-version-gate-a613.log)、[exit](../../../evidence/audits/2026-10-10-v1-version-gate-a613.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a613.log.sha256)。此门禁记录不是人工签署。

正式V1门禁a614（纳入V1.4现有Web流程兼容E2E及其日志后）：五阶段文档审计PASS，证据审计PASS（1346引用、193份Manifest、332项），但V1仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`。四个历史TestRun结构化导出、OD-013/014及旧Run处置、活动/全域恢复、Mac睡眠唤醒、Ubuntu实机和当前范围人工验收未完成。[a614日志](../../../evidence/audits/2026-10-10-v1-version-gate-a614.log)、[exit](../../../evidence/audits/2026-10-10-v1-version-gate-a614.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a614.log.sha256)。自动门禁不是用户签署。

正式V1门禁a615（纳入停牌/涨停BUY及锁跌停SELL授权Trade HTTP拒单、完整套件与文档同步后）：五阶段文档审计PASS，证据审计PASS（1350引用、195份Manifest、334项），V1仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`。4个历史TestRun结构化导出、OD-013/014与旧Run处置、活动/全域恢复、Mac睡眠唤醒、Ubuntu实机及当前范围人工验收仍未满足。[a615日志](../../../evidence/audits/2026-10-10-v1-version-gate-a615.log)、[exit](../../../evidence/audits/2026-10-10-v1-version-gate-a615.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a615.log.sha256)。自动检查未替代用户签署。

正式V1门禁a616（V1.4阶段摘要和P0/P3/P4计划状态同步后）：五阶段文档审计PASS，证据审计PASS（1352引用、196份Manifest、335项），Crosswalk PASS；V1仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`。4个历史TestRun结构化导出、OD-013/014与旧Run处置、活动/全域恢复、Mac睡眠唤醒、Ubuntu实机与当前范围人工验收仍开放。[a616日志](../../../evidence/audits/2026-10-10-v1-version-gate-a616.log)、[exit](../../../evidence/audits/2026-10-10-v1-version-gate-a616.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a616.log.sha256)。

正式V1门禁a617（V1.4冻结限制规则与当前差异快照A32记录后）：五阶段文档审计PASS、证据审计PASS（1355引用、197份Manifest、336项），但V1仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`。4个历史TestRun原始结构化导出、OD-013/014和旧Run处置、活动/全域恢复、Mac睡眠唤醒、Ubuntu实机、P0逐项语义复核及当前范围用户验收仍开放。[a617日志](../../../evidence/audits/2026-10-10-v1-version-gate-a617.log)、[exit](../../../evidence/audits/2026-10-10-v1-version-gate-a617.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-10-v1-version-gate-a617.log.sha256)。此自动门禁不是人工签署。


2026-10-10 V1.4固定锁跌停SELL可卖持仓拒绝/释放自动验收：新增两会话合成输入，真实Portfolio/FakeBroker通过前一交易日BUY持有29股；次日SELL Reservation成功后，Governance授权的锁跌停SELL经Trade拒绝，同命令重放后预留释放，持仓/现金/账本不变。V1.4完整code suite a05 exit 0，详见[阶段§8.77](./04-daily-backtest.md#877-冻结市场限制fixture贯通trade-paper拒绝路径2026-10-10)及[套件日志](../../../evidence/audits/2026-10-10-v14-sellable-position-locked-sell-code-suite-a05.log)。仅关闭该自动化子项；V1.4仍PARTIALLY_IMPLEMENTED，OD-014、完整规则/结算和本阶段本人签署仍OPEN/NOT_RUN。
2026-10-11 V1.1 TestRun响应契约工程增量：Platform owner-scoped Run Read现有独立`V11AcceptanceRun`生成响应类型和OpenAPI/schema，不再将窄本地持久化记录误映射为带未记录Clock/模式的共享TestRun；完整V1.1 code suite受控运行exit 0，`contracts:check`、Platform typecheck及Crosswalk均通过。详情见[阶段§8.34](./01-environment-and-web-center.md#834-v11-owner-scoped-testrun响应契约2026-10-11)、[A46消费者映射](../../../evidence/audits/2026-10-11-v1-v11-acceptance-response-contract-a46.md)、[代码套件日志](../../../evidence/audits/2026-10-11-v11-api-response-contract-code-suite-a02.log)及[合同检查日志](../../../evidence/audits/2026-10-11-v11-response-contract-check-a02.log)。V1.1/V1仍未通过；本项不是运行时逐响应校验，新增范围人工验收保持NOT_RUN，未添加用户签署。当前正式门禁a631仍`INCOMPLETE`/exit 2，五阶段文档审计PASS，证据审计PASS（1380引用、201份Manifest、340项）；见[门禁日志](../../../evidence/audits/2026-10-11-v1-version-gate-a631.log)、[exit](../../../evidence/audits/2026-10-11-v1-version-gate-a631.exit.txt)及[SHA-256](../../../evidence/audits/2026-10-11-v1-version-gate-a631.log.sha256)。

2026-10-11 V1.4状态和交叉索引校准后复核：固定锁跌停SELL持仓/Reservation子项已与§8.77保持一致；Crosswalk 147项要求/1755路径引用/644唯一目标/210精确测试名/147来源锚点PASS。正式V1门禁a632仍`INCOMPLETE`/exit 2；文档审计PASS，证据审计PASS（1380引用、201份Manifest、340项），四个指定历史Run仍缺结构化导出，其他用户决策、环境与人工验收继续OPEN/NOT_RUN。[a632日志](../../../evidence/audits/2026-10-11-v1-version-gate-a632.log)、[exit](../../../evidence/audits/2026-10-11-v1-version-gate-a632.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-version-gate-a632.log.sha256)。

2026-10-11 V1.4状态同步后正式门禁复核a633：五阶段文档审计PASS，证据审计PASS（1383引用、202份Manifest、341项）；V1仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。四个指定历史TestRun导出、开放决策、活动/全域恢复、Mac睡眠唤醒、Ubuntu实机及当前范围人工验收仍未满足。自动检查不构成用户签署。[门禁日志](../../../evidence/audits/2026-10-11-v1-version-gate-a633.log)、[exit](../../../evidence/audits/2026-10-11-v1-version-gate-a633.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-version-gate-a633.log.sha256)。

2026-10-11 W8本机preflight与Crosswalk证据同步后正式门禁复核a635：五阶段文档审计PASS，证据审计PASS（1388引用、203份Manifest、342项）；V1仍`INCOMPLETE`/exit 2。四个历史Run导出、用户决策、活动/全域恢复、Mac睡眠唤醒、目标Ubuntu实机和当前范围用户验收仍未满足。[门禁日志](../../../evidence/audits/2026-10-11-v1-version-gate-a635.log)、[exit](../../../evidence/audits/2026-10-11-v1-version-gate-a635.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-version-gate-a635.log.sha256)。本机探针A02只记录Darwin ARM64及沙箱Docker socket访问限制，不代替Ubuntu实机验收；[审计](../../../evidence/audits/2026-10-11-w8-ubuntu-host-preflight-a02.md)。


2026-10-11 V1.1运行时响应合同增量：隔离真实API以正常场景/seed 20260907创建Run返回202，owner-scoped读取返回200，创建响应通过OpenAPI 202 Schema，读取响应通过AJV `V11AcceptanceRun` Schema及owner/stage/id断言；同轮代码、Chromium三场景和同Run CLI均通过，随机隔离资源已清理。见[阶段§8.35](./01-environment-and-web-center.md#835-v11-owner-scoped-testrun运行时响应校验2026-10-11)及[隔离运行日志](../../../evidence/audits/2026-10-11-v11-runtime-response-contract-isolated-a04.log)。此自动化结果不替代用户验收；V1.1本轮人工验收仍`NOT_RUN`，无新增签署。


V1.1响应Schema运行时验证和证据同步后正式门禁a636：五阶段文档审计PASS，证据审计PASS（1395引用、204份Manifest、343项）；V1仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。四个历史Run导出和其他工程、决定、环境及当前范围本人验收仍未满足。[a636日志](../../../evidence/audits/2026-10-11-v1-version-gate-a636.log)、[exit](../../../evidence/audits/2026-10-11-v1-version-gate-a636.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-version-gate-a636.log.sha256)。

正式V1门禁a640：五阶段文档审计PASS、证据审计PASS（1415引用、209份Manifest、348项）；V1仍`INCOMPLETE`/exit 2。自动化机器验收通过不等于当前人工签收；V1.1人工验收仍`NOT_RUN`，真实Ubuntu、指定历史Run导出及开放决定/恢复项仍未满足。[a640日志](../../../evidence/audits/2026-10-11-v1-version-gate-a640.log)、[exit](../../../evidence/audits/2026-10-11-v1-version-gate-a640.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-version-gate-a640.log.sha256)。

2026-10-11 V1.1创建/读取响应双Schema验证后正式门禁a637：五阶段文档审计PASS，证据审计PASS（1400引用、205份Manifest、344项）；V1仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。四个历史Run结构化导出及其他阶段交付、决定、环境和当前范围人工验收仍未满足。[a637日志](../../../evidence/audits/2026-10-11-v1-version-gate-a637.log)、[exit](../../../evidence/audits/2026-10-11-v1-version-gate-a637.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-version-gate-a637.log.sha256)。

2026-10-11 V1.1全隔离栈amd64仿真机器验收：Mac M1 Docker Desktop上的linux/amd64 V1.1 code suite、真实API响应/身份、Trade容器就绪探针、Chromium normal/rejection/recovery 3/3及同Run CLI均通过，随机容器/卷/网络/镜像精确清理；详见[阶段§8.36](./01-environment-and-web-center.md#836-v11全隔离栈linuxamd64仿真验收2026-10-11)及[a05日志](../../../evidence/audits/2026-10-11-v11-amd64-emulated-isolated-a05.log)。这只是Mac上的仿真验收记录，不是Ubuntu验收或用户签署；V1.1阶段仍PARTIALLY_IMPLEMENTED，本轮人工验收仍`NOT_RUN`。

2026-10-11 V1.1 Web响应消费者合同更新：四个Web Run读取点现绑定生成的`V11AcceptanceRun`；Web typecheck、2文件/4项单测及生产构建通过，详见[阶段§8.37](./01-environment-and-web-center.md#837-v11-web读取调用绑定生成响应类型2026-10-11)和检查日志。此为开发者机器检查，不是用户验收；V1.1本轮人工验收仍`NOT_RUN`，无新增人工签署。

正式V1门禁a641：五阶段文档审计PASS、证据审计PASS（1421引用、210份Manifest、349项）；V1整体仍`INCOMPLETE`/exit 2，指定历史Run导出、决定/恢复、真实Ubuntu和本人验收门槛未满足。[a641日志](../../../evidence/audits/2026-10-11-v1-version-gate-a641.log)、[exit](../../../evidence/audits/2026-10-11-v1-version-gate-a641.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-version-gate-a641.log.sha256)。

正式V1门禁a642（纳入V1.1 Web与CLI响应消费者约束及§8.38后）：五阶段文档审计PASS，证据审计PASS（1425引用、211份Manifest、350项）；V1仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。四个历史Run结构化导出、待决决定、活动/全域恢复、真实Ubuntu及当前范围本人验收仍未满足。[a642日志](../../../evidence/audits/2026-10-11-v1-version-gate-a642.log)、[exit](../../../evidence/audits/2026-10-11-v1-version-gate-a642.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-version-gate-a642.log.sha256)。

正式V1门禁a644：修复a643发现的SHA-256 sidecar格式后，五阶段文档审计PASS、证据审计PASS（1428引用、212份Manifest、351项）；V1仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。四个历史Run结构化导出、待决决定、活动/全域恢复、真实Ubuntu及当前范围本人验收仍未满足。[a644日志](../../../evidence/audits/2026-10-11-v1-version-gate-a644.log)、[exit](../../../evidence/audits/2026-10-11-v1-version-gate-a644.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-version-gate-a644.log.sha256)。

2026-10-11 P0 Crosswalk A31：V1.1-S2-L13新增CLI check-only/轮询的两个精确回归测试、Schema与证据映射；147条需求、1806路径引用、675目标、212精确测试名及147来源锚点通过结构检查。此项只补追踪，P0和版本验收仍开放。[A32日志](../../../evidence/audits/2026-10-11-v1-crosswalk-current-a32.log)、[索引](../../../evidence/audits/2026-10-09-v1-requirement-test-crosswalk.json)及[SHA-256](../../../evidence/audits/2026-10-09-v1-requirement-test-crosswalk.json.sha256)。

正式V1门禁a647（纳入V1.1-S2-L13消费者映射与Crosswalk A31/A32后）：五阶段文档审计PASS，证据审计PASS（1434引用、214份Manifest、353项）；V1仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。四个历史Run结构化导出、开放决定、恢复/目标主机与当前范围人工验收仍未满足。[a647日志](../../../evidence/audits/2026-10-11-v1-version-gate-a647.log)、[exit](../../../evidence/audits/2026-10-11-v1-version-gate-a647.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-version-gate-a647.log.sha256)。

2026-10-11 V1.1 CLI响应消费者增量：V1.1场景轮询及`--run ... --check-only`现在运行时校验owner-scoped `V11AcceptanceRun` JSON Schema；CLI合法/漂移响应测试4/4通过，见[阶段§8.38](./01-environment-and-web-center.md#838-v11-cli同run只读响应契约校验2026-10-11)及其日志。此为开发者测试，不是用户验收；V1.1人工验收仍`NOT_RUN`，不生成签署。

2026-10-11 Crosswalk A26同步后正式V1门禁a638：阶段文档审计PASS，证据审计PASS（1403引用、206份Manifest、345项）；V1仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。四个历史Run导出、开放决定、活动/全域恢复、目标Ubuntu及当前范围人工验收和阶段工程项仍未满足。[a638日志](../../../evidence/audits/2026-10-11-v1-version-gate-a638.log)、[exit](../../../evidence/audits/2026-10-11-v1-version-gate-a638.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-version-gate-a638.log.sha256)。

2026-10-11 P4 USD费用范围审计与Crosswalk A27同步后正式门禁a639：阶段文档审计PASS，证据审计PASS（1407引用、207份Manifest、346项）；V1仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。四个历史Run导出、待决决定、活动/全域恢复、目标Ubuntu、当前范围人工验收及其他阶段工程项仍未满足。[a639日志](../../../evidence/audits/2026-10-11-v1-version-gate-a639.log)、[exit](../../../evidence/audits/2026-10-11-v1-version-gate-a639.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-version-gate-a639.log.sha256)。


2026-10-11 V1.1 CLI响应Schema真实隔离E2E：`pnpm test:integration:v11-stage-storage` exit 0；Chromium normal/rejection/recovery 3/3通过，并对三个Web生成的TestRun逐一使用同UUID CLI `--check-only`校验canonical `V11AcceptanceRun` Schema。三个Run导出与Manifest匹配，2项断言均PASS；运行证据见[机器报告](../../../evidence/audits/2026-10-11-v11-cli-response-schema-isolated-e2e-a01.json)，阶段操作说明见[§8.39](./01-environment-and-web-center.md#839-v11-cli响应schema隔离e2e2026-10-11)。环境为Mac ARM64上的Linux/amd64仿真；人工结论均`NOT_RUN`，不新增用户签署，也不替代真实Ubuntu或V1.1阶段验收。


2026-10-11正式V1门禁a649：五阶段文档审计PASS，证据审计PASS（1440引用、216份Manifest、355项）；四个历史TestRun结构化导出仍缺，版本为`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。其他阶段工作、政策决定、目标环境和本人新增范围验收仍未满足。[门禁日志](../../../evidence/audits/2026-10-11-v1-version-gate-a649.log)、[退出码](../../../evidence/audits/2026-10-11-v1-version-gate-a649.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-version-gate-a649.log.sha256)。


正式V1门禁a650（纳入a649状态、验收与计划记录后）：五阶段文档审计PASS；证据审计PASS（1443条引用、217份Manifest、356项）；V1仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。四个指定历史Run结构化导出仍缺，阶段、开放决定、实际恢复/目标环境及人工验收条件继续未满足。[a650日志](../../../evidence/audits/2026-10-11-v1-version-gate-a650.log)、[exit](../../../evidence/audits/2026-10-11-v1-version-gate-a650.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-version-gate-a650.log.sha256)。


2026-10-11 V1.1浏览器端响应Schema增量：Web四个V1.1 owner-scoped Run读取调用现在在写入React状态前按canonical `V11AcceptanceRun` JSON Schema运行时校验。Web parser 3文件/6项单测（含合法响应、错误stage、额外字段、无效UUID）、typecheck、生产构建及完整隔离集成全部通过；Chromium normal/rejection/recovery 3/3，同Run CLI和证据导出通过。三个Run证据Manifest均匹配，人工结论仍`NOT_RUN`。详见[阶段§8.40](./01-environment-and-web-center.md#840-v11-web读取响应浏览器端运行时schema校验2026-10-11)及[机器报告](../../../evidence/audits/2026-10-11-v11-web-runtime-response-schema-e2e-a01.json)。不代表V1.1阶段或版本验收完成。


正式V1门禁a651（纳入V1.1 Web运行时Schema校验、A34 Crosswalk及阶段/计划记录后）：五阶段文档审计PASS，证据审计PASS（1449条引用、219份Manifest、358项）；V1仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。四个指定历史Run结构化导出缺失，五阶段剩余工程、开放决定、实际恢复/Ubuntu环境及本人验收条件未满足。[a651日志](../../../evidence/audits/2026-10-11-v1-version-gate-a651.log)、[exit](../../../evidence/audits/2026-10-11-v1-version-gate-a651.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-version-gate-a651.log.sha256)。


2026-10-11 V1.1畸形响应浏览器错误态：Playwright在恢复读取中注入带额外字段的HTTP 200 TestRun，浏览器明确显示canonical Schema校验错误；同一次完整隔离集成的normal/rejection/recovery 3/3、同Run CLI和证据导出通过。机器记录见[报告a02](../../../evidence/audits/2026-10-11-v11-web-runtime-response-schema-e2e-a02.json)，阶段操作见[§8.41](./01-environment-and-web-center.md#841-v11浏览器处理http-200畸形run响应2026-10-11)。Run人工结论仍`NOT_RUN`；注入只验证客户端处理，不表示后端发生合同漂移。

2026-10-11 V1.1当前工作树完整code suite复验：`pnpm verify:stage -- --stage V1.1 --suite code`受控回环退出0；全局基线66/66、全仓build/lint/typecheck/unit、契约/生成器/Fixture、隔离PostgreSQL及V1.1迁移/持久化检查通过；活动服务`NOT_CONNECTED`，隔离资源清理通过。完整日志见[a03](../../../evidence/audits/2026-10-11-v11-response-contract-code-suite-a03.log)。本记录只证明自动化代码套件，不构成人工验收或签署，V1.1及V1仍未完成。

2026-10-11 正式V1门禁a661：五阶段文档审计PASS，证据引用/Manifest审计PASS（1492/230/369）；版本仍`INCOMPLETE`、exit 2、`uncheckedVersionGate=true`。V1.2/V1.5四个指定历史TestRun结构化导出缺失；五阶段工程/交付、开放决定、实际恢复/目标环境与本人验收未满足。[a661日志](../../../evidence/audits/2026-10-11-v1-version-gate-a661.log)、[exit](../../../evidence/audits/2026-10-11-v1-version-gate-a661.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-version-gate-a661.log.sha256)。

2026-10-11 V1.1 OpenAPI路径与真实创建/读取控制器对照：修复创建路径文档漂移并强化202响应合同门禁；`pnpm contracts:check`、Platform API typecheck、Web 6/6单测、文档检查通过，见[阶段§8.45](./01-environment-and-web-center.md#845-v11创建run-openapi路径与响应校验对齐2026-10-11)及[验证日志](../../../evidence/audits/2026-10-11-v11-openapi-endpoint-contract-a01.log)。这是自动化合同验证，不构成人工验收或V1.1签收。

2026-10-11 V1.1 acceptance OpenAPI补全：固定场景目录及同Run恢复继续操作已加入合同并纳入`contracts:check`；路径、owner session、参数、请求体和202响应检查通过，Web测试6/6。记录见[阶段§8.46](./01-environment-and-web-center.md#846-v11固定场景与恢复继续openapi覆盖2026-10-11)和[验证a02](../../../evidence/audits/2026-10-11-v11-acceptance-route-contract-a02.log)。这只记录自动化结果，不是用户签收。

2026-10-11 正式V1门禁a662：五阶段文档审计PASS，证据引用/Manifest审计PASS（1496/231/370）；版本仍`INCOMPLETE`、exit 2、`uncheckedVersionGate=true`。四个历史Run导出和其他工程/决定/恢复/目标环境/用户验收未完成。[a662日志](../../../evidence/audits/2026-10-11-v1-version-gate-a662.log)、[exit](../../../evidence/audits/2026-10-11-v1-version-gate-a662.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-version-gate-a662.log.sha256)。

2026-10-11 V1.1场景与恢复继续OpenAPI补全见§8.46，合同门禁、Platform typecheck、Web测试6/6通过；记录[a02](../../../evidence/audits/2026-10-11-v11-acceptance-route-contract-a02.log)。正式V1门禁a663：文档与证据审计PASS（1503/233/372），V1仍`INCOMPLETE`、exit 2；四份历史Run导出及其他阶段/决定/恢复/环境/人工验收仍未满足。[a663](../../../evidence/audits/2026-10-11-v1-version-gate-a663.log)、[exit](../../../evidence/audits/2026-10-11-v1-version-gate-a663.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-version-gate-a663.log.sha256)。

恢复V1执行后补齐共享证据导出`GET /api/v1/acceptance/runs/{testRunId}/evidence`的OpenAPI双形态响应合同：V1.1专用Envelope与StageRun投影；Exporter实际共享路由用于V1.1/V1.3/V1.5，V1.2/V1.4使用独立Run路由。两种响应都锁定人工结论`NOT_RUN`。合同门禁退出0，见阶段[§8.47](./01-environment-and-web-center.md#847-v1共享证据导出双投影openapi合同2026-10-11)及[日志](../../../evidence/audits/2026-10-11-v1-evidence-export-contract-a01.log)。这是自动合同检查，不构成人工验收。

当前Crosswalk来源锚点已随测试计划同步；A45结构检查PASS（147项要求、1829路径引用、698目标、220测试声明、147来源锚点），见[日志](../../../evidence/audits/2026-10-11-v1-crosswalk-current-a45.log)。同步完成后正式门禁a664复核为文档/证据审计PASS（1512/235/374），但V1仍`INCOMPLETE`、exit 2；四份历史Run导出及其余工程、决定、环境和本人验收条件仍未满足。[a664日志](../../../evidence/audits/2026-10-11-v1-version-gate-a664.log)、[exit](../../../evidence/audits/2026-10-11-v1-version-gate-a664.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-version-gate-a664.log.sha256)。本记录不代表任何人工作业已签收。

V1.1共享证据导出真实API隔离复验见[§8.48](./01-environment-and-web-center.md#848-v11共享证据导出真实隔离api回归2026-10-11)：Run `eaf7baec-5966-456a-b55c-955d7a06e8ee`完成、两项自动断言、导出`v1.1-1`且人验仍`NOT_RUN`；三场景Web/同Run CLI与隔离清理通过。Crosswalk A46 PASS（147/1832/701/220/147），见[日志](../../../evidence/audits/2026-10-11-v1-crosswalk-current-a46.log)。这不覆盖共享API的StageRun分支，也不构成本阶段人工签署。

V1.2共享StageRun证据投影隔离验证见[§8.46](./02-small-data-and-qlib.md#846-共享stagerun证据投影真实隔离api验证2026-10-11)：同Run `2790f2e5-b3e1-4e50-81ef-a857fc1b1a8e`由共享API返回`v2-stage-run-1`及`manualConclusion=NOT_RUN`，V1.2专用Exporter也通过；真实Qlib和Web/API/CLI E2E通过，Docker镜像修复与首次失败均保留在a01/a02日志。这是自动测试证据，不是策略独立验证或人工验收。


2026-10-11正式V1门禁a651后，V1.1浏览器Schema负路径新增E2E报告a02及阶段§8.41记录。运行退出0、业务三场景3/3、同Run CLI/导出通过；HTTP 200额外字段在浏览器显示Schema拒绝错误。该注入是客户端处理测试，不声称服务端实际Schema回归。全部本次Run人验`NOT_RUN`。


正式V1门禁a652（纳入V1.1浏览器端HTTP 200畸形响应拒绝测试及A35后）：五阶段文档审计PASS；证据审计PASS（1455条引用、221份Manifest、360项）；V1仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。四个指定历史Run结构化导出缺失，其他阶段/工程、未决决定、实际环境与本轮人工验收条件未满足。[a652日志](../../../evidence/audits/2026-10-11-v1-version-gate-a652.log)、[exit](../../../evidence/audits/2026-10-11-v1-version-gate-a652.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-version-gate-a652.log.sha256)。

2026-10-11正式门禁a681（纳入V1.1恢复并发领取证据与Crosswalk A57后）：五阶段文档审计PASS；证据审计PASS（1572引用、252份Manifest、391项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。四个历史TestRun导出、阶段剩余交付、开放决定、活动/目标环境恢复及当前范围人工验收仍未满足。[a681门禁](../../../evidence/audits/2026-10-11-v1-formal-gate-a681.log)、[退出码](../../../evidence/audits/2026-10-11-v1-formal-gate-a681.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-formal-gate-a681.log.sha256)。

2026-10-11工程增量记录（非人工签署）：V1.1 TestRun的legacy/stage并发恢复领取单赢家与ScenarioRunner单次外部读取已由隔离回归/code suite验证，参见[阶段§8.50](./01-environment-and-web-center.md#850-v11-testrun并发恢复领取fencing2026-10-11)。本工程检查不更改V1.1或其它阶段的人工验收状态。

2026-10-11正式门禁a682（纳入V1.1 §8.50并发领取、Crosswalk A58及工程记录后）：五阶段文档审计PASS；证据审计PASS（1584引用、254份Manifest、393项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。四个历史Run结构化导出、阶段剩余工程/开放决定、活动与目标环境恢复及当前范围人工验收仍未满足。[a682日志](../../../evidence/audits/2026-10-11-v1-formal-gate-a682.log)、[退出码](../../../evidence/audits/2026-10-11-v1-formal-gate-a682.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-formal-gate-a682.log.sha256)。

2026-10-11 Crosswalk A60为V1.1恢复并发领取补充精确测试/证据映射并通过（147/1875/731/227/147）。这只是追踪审计；当前范围人工验收仍NOT_RUN。[A60日志](../../../evidence/audits/2026-10-11-v1-crosswalk-current-a60.log)。

2026-10-11正式门禁a683（纳入V1.1恢复并发领取工程、Crosswalk A60及当前阶段文档后）：五阶段文档审计PASS；证据审计PASS（1592引用、255份Manifest、394项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。四个历史TestRun结构化导出、阶段剩余工程/开放决定、活动与目标环境恢复及当前范围人工验收仍未满足。[门禁日志](../../../evidence/audits/2026-10-11-v1-formal-gate-a683.log)、[退出码](../../../evidence/audits/2026-10-11-v1-formal-gate-a683.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-formal-gate-a683.log.sha256)。


正式V1门禁a724（OD-014 CN_A Paper T+1 SELL隔离PostgreSQL、Trade集成、V1.3容器E2E 27/27、同Run CLI/Evidence导出及阶段文档同步后）：五阶段文档审计PASS；证据审计PASS（1640引用、263份Manifest、402项）；整体仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。四个指定历史TestRun结构化导出仍缺，V1.3/V1.4其余规则/阶段范围、目标环境恢复与当前范围用户本人验收仍未满足。[a724日志](../../../evidence/audits/2026-10-11-v1-formal-gate-a724.log)、[exit](../../../evidence/audits/2026-10-11-v1-formal-gate-a724.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-formal-gate-a724.log.sha256)。
2026-10-11 正式V1门禁a754（结算客户端合同与HTTP身份/无副作用复验后）：五阶段文档审计PASS，证据审计PASS（1707引用、278份Manifest、418项），15个TestRun均已检查；四个指定历史Run结构化导出缺失，五阶段仍部分实现，V1整体`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。V1.3新增自动化证据不改变人工验收状态；阶段工程、目标环境/恢复与当前范围本人验收仍未满足。[a754日志](../../../evidence/audits/2026-10-11-v1-formal-gate-a754.log)、[exit](../../../evidence/audits/2026-10-11-v1-formal-gate-a754.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-formal-gate-a754.log.sha256)。

2026-10-11 正式V1门禁a755复核：文档审计PASS，证据审计PASS（1710引用、279份Manifest、419项）；15个验收TestRun均已检查，四个指定历史Run结构化导出仍缺失。五阶段仍部分实现，V1整体`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`；Ubuntu/恢复和当前范围人工验收继续未满足。[a755日志](../../../evidence/audits/2026-10-11-v1-formal-gate-a755.log)、[exit](../../../evidence/audits/2026-10-11-v1-formal-gate-a755.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-formal-gate-a755.log.sha256)。

2026-10-11 V1.4同Run证据导出当前树复验：专用V1.4版本化路由支持10个Web创建Run的同UUID CLI核对；同一Run报告Artifact导出后Hash精确匹配，机器运行exit 0、随机隔离资源已清理。详细记录见[§8.90](./04-daily-backtest.md#890-v14专用同run-webapicli与报告证据导出当前树复验2026-10-11)及[日志a02](../../../evidence/audits/2026-10-11-v14-shared-evidence-scope-e2e-a02.log)。人工结论仍`NOT_RUN`，V1.4及V1未因此通过。

正式V1门禁a756：文档审计PASS，证据审计PASS（1719引用、281份Manifest、421项）；15个验收TestRun均检查，四个历史TestRun结构化导出仍缺失，五阶段仍部分实现。整体`INCOMPLETE`/exit 2，Ubuntu/恢复和当前范围人工验收继续未满足。[a756日志](../../../evidence/audits/2026-10-11-v1-formal-gate-a756.log)、[exit](../../../evidence/audits/2026-10-11-v1-formal-gate-a756.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-formal-gate-a756.log.sha256)。

2026-10-11 V1.3 Trade身份拒绝子矩阵：13条V1受保护写路由对缺身份、错误Bearer及错误caller均403，FakeBroker orders/fills/events/outbox/sell receivables保持为0；当前隔离完整code suite exit 0，见[§8.83](./03-fake-broker-trading-loop.md#883-trade-execution-v1写路由缺身份错误bearer矩阵2026-10-11)和[A25](../../../evidence/audits/2026-10-11-v1-cross-service-route-matrix-a25.md)。它不覆盖13条路由的全部合法语义，V1.3与V1仍未完成。

正式V1门禁a757：五阶段文档审计PASS，证据审计PASS（1728引用、283份Manifest、423项）；四个指定历史Run结构化导出缺失、五阶段仍部分实现，V1整体`INCOMPLETE`/exit 2。当前自动化增量不改变人工验收或Ubuntu/恢复状态。[a757日志](../../../evidence/audits/2026-10-11-v1-formal-gate-a757.log)、[exit](../../../evidence/audits/2026-10-11-v1-formal-gate-a757.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-formal-gate-a757.log.sha256)。

2026-10-11 OD-014所有者批准后V1.4完整代码套件当前树复验：`pnpm verify:stage -- --stage V1.4 --suite code`退出0；9个固定历史/当前会话的Quant settled cash、Portfolio settled cash/FakeBroker settled cash与双方pending receivable逐项一致，FakeBroker幂等重放9/9，隔离资源清理通过。详见[阶段§8.91](./04-daily-backtest.md#891-od-014所有者批准后v14当前树完整代码门禁复验2026-10-11)、[完整日志](../../../evidence/audits/2026-10-11-v14-od014-owner-approved-code-suite-a01.log)、[exit](../../../evidence/audits/2026-10-11-v14-od014-owner-approved-code-suite-a01.exit.txt)和[SHA-256](../../../evidence/audits/2026-10-11-v14-od014-owner-approved-code-suite-a01.log.sha256)。这是自动化子项证据，不改变V1.4人工结论`NOT_RUN`。

正式V1门禁a758：五阶段文档审计PASS，证据审计PASS（1734引用、285份Manifest、425项）；四个指定历史Run结构化导出缺失、五阶段仍部分实现，整体`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。Ubuntu目标实机、恢复与当前范围人工验收仍未满足。[a758日志](../../../evidence/audits/2026-10-11-v1-formal-gate-a758.log)、[exit](../../../evidence/audits/2026-10-11-v1-formal-gate-a758.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-formal-gate-a758.log.sha256)。

正式V1门禁a759（同步OD-014所有者批准后V1.4当前树完整代码suite及a758后复核）：五阶段结构审计PASS，证据审计PASS（1740引用、286份Manifest、426项），验收结构无重复/缺行；四个历史Run导出缺失，五阶段交付仍部分实现，`versionSummaryIncomplete=false`、`uncheckedVersionGate=true`，V1仍`INCOMPLETE`/exit 2。目标Ubuntu实机/恢复与当前范围人工验收继续OPEN。[a759日志](../../../evidence/audits/2026-10-11-v1-formal-gate-a759.log)、[exit](../../../evidence/audits/2026-10-11-v1-formal-gate-a759.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-formal-gate-a759.log.sha256)。

2026-10-11 P0语义复核A21更正XMK-03的过时差异描述：OD-014应收、Run Clock、BUY已结算现金门禁及CN/US固定Paper账本已有当前树证据；全球要求仍为部分映射，完整规则/故障组合/Ubuntu与人工验收OPEN。A67刷新该单项并保留A66历史快照，Crosswalk A81结构检查PASS（147要求、1991路径、821目标、251精确测试、147锚点）。详见[A21报告](../../../evidence/audits/2026-10-11-v1-gap-matrix-semantic-review-a21.md)、[A67矩阵](../../../evidence/audits/2026-10-11-v1-current-gap-matrix-a67.json)和[A81日志](../../../evidence/audits/2026-10-11-v1-crosswalk-current-a81.log)。仅更正当前状态追踪，不声明XMK-03或P4通过。

正式V1门禁a760（纳入OD-014当前树套件、XMK-03 A21/A67与Crosswalk A81后）：五阶段文档审计PASS，证据审计PASS（1743引用、287份Manifest、427项），验收结构完整；四个指定历史TestRun导出缺失、五阶段仍部分实现，V1 `INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。Ubuntu/恢复和当前范围人工验收仍OPEN。[a760日志](../../../evidence/audits/2026-10-11-v1-formal-gate-a760.log)、[exit](../../../evidence/audits/2026-10-11-v1-formal-gate-a760.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-formal-gate-a760.log.sha256)。

2026-10-11 V1.3 Trade服务端模式边界增量：当前树13条V1 Trade受保护写路由均对`LIVE/REAL`注入返回422；结算、外部模拟单、模拟成交回报、费用更正四条新增探测前后订单/成交/应收/outbox事实不变。完整V1.3 code suite exit 0；见[阶段§8.84](./03-fake-broker-trading-loop.md#884-v13-trade全部受保护写路由模式注入拒绝复验2026-10-11)及[完整日志a05](../../../evidence/audits/2026-10-11-v13-mode-boundary-code-suite-a05.log)。这是Trade服务拒绝边界子项，不代替V1.1/UI完整模式矩阵、V1.3人工验收或V1门禁。

2026-10-12正式门禁a785：文档与证据审计PASS（1818/303/443），四条指定历史TestRun导出仍缺；V1整体INCOMPLETE/exit 2。Trade V1受保护写路由身份策略全量单测和V1.3完整code suite通过不改变V1.3人工验收NOT_RUN或版本未完成状态。[门禁日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a785.log)。

2026-10-12正式V1门禁a786：五阶段文档审计PASS；证据审计PASS（1818引用、303份Manifest、443项）；四条指定历史TestRun结构化导出仍缺，V1整体INCOMPLETE/exit 2、`uncheckedVersionGate=true`。V1.1–V1.5的阶段工程、环境恢复及当前范围人工验收仍未完成。[门禁日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a786.log)、[退出码](../../../evidence/audits/2026-10-12-v1-formal-gate-a786.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a786.log.sha256)。

2026-10-12 P0 Crosswalk语义复核A29：V1.1-S2-L13的独立V11AcceptanceRun投影、HTTP/Web/CLI运行时消费者现有证据已与早期A01时间点区分；该DTO歧义子项关闭，但Shared ClockContext无V1直接类型消费、其余消费者/发布兼容未完整映射，L13、P0和V1验收保持开放。[A29](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a29.md)、[A76](../../../evidence/audits/2026-10-12-v1-current-gap-matrix-a76.json)。

2026-10-12正式V1门禁a787：五阶段文档审计PASS；证据审计PASS（1825引用、303份Manifest、443项）；四条指定历史TestRun结构化导出仍缺，V1整体INCOMPLETE/exit 2、`uncheckedVersionGate=true`。V1.1–V1.5的阶段工程、环境恢复及当前范围人工验收仍未完成。[门禁日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a787.log)、[退出码](../../../evidence/audits/2026-10-12-v1-formal-gate-a787.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a787.log.sha256)。

2026-10-12 V1.1双市场账户初始化当前树复验：随机隔离Compose真实PostgreSQL中CN_A/CNY与US_EQUITY/USD新账户均返回`positionCount=0`且`account_positions`无行；原币现金、唯一初始流水、幂等冲突和owner边界通过。Portfolio integration 6/6，V1.1 code suite及Chromium Web/API/CLI 3/3 exit 0；新增Run保持`manualConclusion=NOT_RUN`。详见[§8.59](./01-environment-and-web-center.md#859-v11-双市场账户初始化零持仓-postgresql-断言-2026-10-12)及[原始日志](../../../evidence/audits/2026-10-12-v11-dual-market-initial-position-e2e-a02.log)。该增量不关闭V1.1阶段、Ubuntu或V1验收。

2026-10-12正式V1门禁a788：五阶段文档审计PASS；证据审计PASS（1833引用、305份Manifest、445项）；四条指定历史TestRun结构化导出仍缺，V1整体INCOMPLETE/exit 2、`uncheckedVersionGate=true`。V1.1–V1.5阶段剩余交付、环境恢复及当前范围人工验收仍未完成。[门禁日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a788.log)、[退出码](../../../evidence/audits/2026-10-12-v1-formal-gate-a788.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a788.log.sha256)。


2026-10-12 V1 Artifact生产者/引用者静态复核：确认Qlib与V3.1共用文件目录但引用owner分离，V1.4报告/Manifest由Quant PostgreSQL持有，Market Data Fixture为关系型数据；Qlib/V1.4发布fencing现有测试分别覆盖固定路径。区分了内容删除原语、Research失败发布回滚、V3.1隔离工具与尚不存在的V1政策型过期调度。OD-013仍OPEN，V1.1-S2-L20保持OPEN/PARTIAL；没有扫描活动库/卷或运行清理，不产生人工验收结论。见[§8.60](./01-environment-and-web-center.md#860-v1-artifact生产者引用者当前源码边界复核2026-10-12)、[盘点A02](../../../evidence/audits/2026-10-12-v1-artifact-producer-inventory-a02.md)、[复核A31](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a31.md)。

2026-10-12正式V1门禁a789：五阶段文档审计PASS；证据审计PASS（1842引用、306份Manifest、446项）；四条指定历史TestRun导出仍缺，整体INCOMPLETE/exit 2、`uncheckedVersionGate=true`。Artifact生产者复核不改变阶段/人工签收状态。[日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a789.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a789.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a789.log.sha256)。

2026-10-12正式V1门禁a790：五阶段文档审计PASS；证据审计PASS（1851引用、308份Manifest、448项）；四条指定历史TestRun导出仍缺，整体INCOMPLETE/exit 2、`uncheckedVersionGate=true`。定向Trade→Portfolio客户端复验5/5不改变阶段/人工验收状态。[日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a790.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a790.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a790.log.sha256)。

2026-10-12 OD-014多腿预留服务层增量：MANUAL/AUTO按SELL持仓与BUY已结算现金分别预留，结算前卖出应收不计入批次购买力；Trade单测109/109、Portfolio隔离PostgreSQL集成6/6、V1.3完整code suite与文档/追踪检查通过。混合多腿Web/API/CLI同Run、Fixture和恢复场景尚未交付，V1.3阶段保持未完成。详见[§8.86](./03-fake-broker-trading-loop.md#886-od-014严格已结算现金下manualauto多腿预留边界2026-10-12)。

2026-10-12正式V1门禁a792：五阶段文档审计PASS；证据审计PASS（1861引用、310份Manifest、450项）；四条指定历史TestRun结构化导出仍缺，V1整体INCOMPLETE/exit 2、`uncheckedVersionGate=true`。V1.3新增混合多腿仅有服务层/Portfolio自动化验证，无Web/API/CLI同Run与人工验收；其它阶段交付、Ubuntu/恢复和人验仍未完成。[门禁日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a792.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a792.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a792.log.sha256)。


2026-10-12 V1.3 OD-014混合腿新增自动验收：完整隔离Web/API/CLI矩阵30/30通过；最终Fixture v1.0.4 Schema对齐后MANUAL成功与AUTO拒绝目标场景2/2复跑通过。已结算现金7,790.0000 CNY、995.0000待结算应收；资金不足AUTO为409、无订单/成交、Portfolio/Mandate预留释放。V1.3完整code suite exit 0。详见[阶段§8.87](./03-fake-broker-trading-loop.md#887-od-014混合sellbuy多腿webapicli同run验收2026-10-12)与[最终E2E日志](../../../evidence/audits/2026-10-12-v13-od014-strict-multileg-web-e2e-a02.log)。新TestRun人工结论均`NOT_RUN`，不等同于用户签收。

2026-10-12正式V1门禁a794：五阶段文档审计PASS、证据审计PASS（1865引用、310份Manifest、450项）；V1仍`INCOMPLETE`/exit 2，四个指定历史TestRun结构化导出、五阶段正式关闭、活动存储/完整恢复、Ubuntu实机与本人当前范围验收未满足。V1.3 OD-014混合多腿新自动化已通过，人工结论NOT_RUN。见[a794日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a794.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a794.log.exit.txt)和[SHA](../../../evidence/audits/2026-10-12-v1-formal-gate-a794.log.sha256)。

正式V1门禁a795（a794同步后的复核）：文档结构审计PASS、证据审计PASS（1871引用、311份Manifest、451项），但V1仍`INCOMPLETE`/exit 2；四个历史导出、阶段关闭、环境恢复、Ubuntu与本人验收仍OPEN。[a795日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a795.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a795.log.exit.txt)、[SHA](../../../evidence/audits/2026-10-12-v1-formal-gate-a795.log.sha256)。

2026-10-12 P0语义复核A33：所有者批准OD-014严格已结算现金规则；固定v1.0.4混合SELL/BUY MANUAL成功及AUTO拒绝Web/API/CLI同Run证据已写入A80矩阵。MANUAL现金CNY 7,790、待收CNY 995、Portfolio/FakeBroker MATCH；AUTO拒绝不以待收款购买且无订单/成交，预留与Mandate预算释放。自动测试通过不代表人工签收，Run仍`manualConclusion=NOT_RUN`；V1.3-S2-L13/P3仍OPEN。[A33](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a33.md)、[A80](../../../evidence/audits/2026-10-12-v1-current-gap-matrix-a80.json)。

正式V1门禁a796：文档结构审计PASS、证据审计PASS（1875引用、312份Manifest、452项），V1仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。V1.2/V1.5四个历史Run导出、五阶段收尾、环境/完整恢复、Ubuntu及当前范围人工验收仍未满足。[a796日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a796.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a796.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a796.log.sha256)。

正式V1门禁a799：文档结构审计PASS、证据审计PASS（1882引用、313份Manifest、453项），版本仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。四条指定历史Run结构化导出、五阶段收尾、恢复/Ubuntu及本人当前范围验收仍未满足。a797/a798 SHA sidecar路径问题保留为失败历史，a799修复后复核通过。[日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a799.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a799.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a799.log.sha256)。

2026-10-12 V1.3-S2-L15复核：事件序列器单测3/3和隔离Trade→Portfolio响应丢失/重启/乱序Fill与Cancel恢复通过，FakeBroker与Portfolio最终账本一致。该固定自动Run不代表全状态、全故障种子或人工验收；L15/P3仍OPEN，人验未签署。见[阶段§8.88](./03-fake-broker-trading-loop.md#888-v13-s2-l15当前树事件序列与重启恢复复验2026-10-12)及[审计A01](../../../evidence/audits/2026-10-12-v13-l15-event-sequence-current-tree-a01.md)。

正式V1门禁a800（纳入P0 A34/A81及V1.3 §8.88后）：五阶段文档审计PASS，证据审计PASS（1888引用、314份Manifest、454项）；V1仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。四条指定历史Run导出、阶段关闭、活动/配对恢复、Ubuntu和本人验收未满足。[日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a800.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a800.log.exit.txt)、[SHA](../../../evidence/audits/2026-10-12-v1-formal-gate-a800.log.sha256)。

2026-10-12 P0 A35语义复核：V1.3-S2-L16固定CN响应丢失/原单查询恢复、乱序Fill跨Trade重启、部分Fill/Cancel/费用更正有测试映射，当前只标记部分覆盖；US恢复变体、多seed故障序列、全入口及人工验收仍未满足。见[A35](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a35.md)与[A82](../../../evidence/audits/2026-10-12-v1-current-gap-matrix-a82.json)。

正式V1门禁a801（纳入A35/A82后）：五阶段文档与证据审计PASS（1897引用、315份Manifest、455项），整体仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。历史Run导出、阶段关闭、完整恢复、Ubuntu和本人验收未满足。[日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a801.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a801.log.exit.txt)、[SHA](../../../evidence/audits/2026-10-12-v1-formal-gate-a801.log.sha256)。

2026-10-12 V1.3 L16增量：固定US_EQUITY/AAPL AUTO响应丢失及原单查询暂时不可用后，同clientOrderId恢复已通过隔离Web/API/CLI；美元账本和Portfolio资源、FakeBroker MATCH核对通过。它只关闭一个固定恢复子场景，不关闭L16/P3，Run自动结论的`manualConclusion=NOT_RUN`，人工验收未签。见[阶段§8.89](./03-fake-broker-trading-loop.md#889-v13-us_equity-auto-unknown响应丢失原单查询恢复2026-10-12)和[审计A04](../../../evidence/audits/2026-10-12-v13-us-l06-unknown-recovery-a04.md)。

正式V1门禁a802（纳入A36/A83后）：五阶段文档和证据审计PASS（1909引用、316份Manifest、456项），整体仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。四条历史Run结构化导出、五阶段完成、配对恢复、Ubuntu及本人当前范围验收仍未满足。[日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a802.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a802.log.exit.txt)、[SHA](../../../evidence/audits/2026-10-12-v1-formal-gate-a802.log.sha256)。

2026-10-12 V1.3-S2-L16增量：US_EQUITY/AAPL AUTO固定场景验证FakeBroker提交后响应丢失、Trade容器重启、原clientOrderId恢复；10股、USD 9,749.9500现金、USD 0.0500费用、CAPTURED预留、Outbox完成、MATCH和同Run CLI均通过，隔离资源清理完成。详见[§8.90](./03-fake-broker-trading-loop.md#890-v13-s2-l16-us_equity-trade重启后同单恢复2026-10-12)及[日志](../../../evidence/audits/2026-10-12-v13-us-trade-restart-e2e-a02.log)。此为固定子场景自动PASS，人工结论仍NOT_RUN；US乱序/重复、多seed故障矩阵、Ubuntu、阶段完整验收与V1门禁仍未完成。

正式V1门禁a803（2026-10-12）：文档审计与证据审计PASS（1924引用、318份Manifest、458项），整体`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。四个历史TestRun结构化导出、阶段关闭、活动/配对恢复、Ubuntu实机和本人当前范围验收仍未完成。[日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a803.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a803.log.exit.txt)、[SHA](../../../evidence/audits/2026-10-12-v1-formal-gate-a803.log.sha256)。

正式门禁a804（同步A38最终复验后）：五阶段结构文档审计PASS、证据审计PASS（1928引用、319份Manifest、459项）；21个指定TestRun仅17个导出通过，V1.2一个与V1.5三个历史原始导出缺失。V1仍INCOMPLETE/exit 2，阶段关闭、环境恢复与本人验收未完成。[日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a804.log)、[退出码](../../../evidence/audits/2026-10-12-v1-formal-gate-a804.log.exit.txt)、[SHA](../../../evidence/audits/2026-10-12-v1-formal-gate-a804.log.sha256)。

正式门禁a805（2026-10-12）：五阶段文档审计PASS；21个指定TestRun中17个导出核验通过，4个历史原始结构化导出缺失；本地证据审计PASS（1932引用、320份Manifest、460项）。V1仍INCOMPLETE/exit 2，不能用替代Run推定历史事实或本人验收。[日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a805.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a805.log.exit.txt)、[SHA](../../../evidence/audits/2026-10-12-v1-formal-gate-a805.log.sha256)。


2026-10-12 V1.3-S2-L16增量：固定US_EQUITY/AAPL 200股乱序成交在Trade重启后按序应用通过；seq2先到并重放10次、seq1后到，持仓150股、现金USD 6,249.9500、预留USD 5,000.0500、MATCH及同Run CLI核验通过。完整33项隔离Web/API/CLI矩阵与V1.3 code suite均通过，见[§8.91](./03-fake-broker-trading-loop.md#891-v13-l16-us_equity-aapl乱序成交重启恢复2026-10-12)、[E2E日志](../../../evidence/audits/2026-10-12-v13-us-ordered-fill-full-e2e-a01.log)、[Code日志](../../../evidence/audits/2026-10-12-v13-us-ordered-fill-code-suite-a01.log)。该固定自动子场景为PASS；L16/P3/V1及人验仍未关闭，人工结论NOT_RUN。


V1.3-S2-L16的增量语义复核仍分类PARTIAL，见[A39](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a39.md)与[A85](../../../evidence/audits/2026-10-12-v1-current-gap-matrix-a85.json)。只审阅了L16这一行，不能推定其余需求已复核或V1完成。


正式门禁a807（2026-10-12）：五阶段结构审计PASS；证据审计PASS（1944引用、321份Manifest、461项）；21条指定TestRun中17个结构化导出通过，V1.2一条与V1.5三条历史原始导出缺失。故V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`，本人签收未完成。[a807日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a807.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a807.log.exit.txt)、[SHA](../../../evidence/audits/2026-10-12-v1-formal-gate-a807.log.sha256)。a806 sidecar格式错误诊断保留，不改变a807结果。


正式门禁a808（2026-10-12）：五阶段文档结构PASS，证据审计PASS（1947引用、322份Manifest、462项）；21个指定历史TestRun中17个导出验证通过，V1.2一条及V1.5三条原始导出缺失，V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。[a808日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a808.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a808.log.exit.txt)、[SHA](../../../evidence/audits/2026-10-12-v1-formal-gate-a808.log.sha256)。

正式门禁a809（2026-10-12）：五阶段文档结构PASS，证据审计PASS（1952引用、323份Manifest、463项）；21个指定历史TestRun中17个导出验证通过，V1.2一条及V1.5三条原始导出缺失，V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。[a809日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a809.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a809.log.exit.txt)、[SHA](../../../evidence/audits/2026-10-12-v1-formal-gate-a809.log.sha256)。

2026-10-12 V1.1当前树完整隔离阶段入口复跑：`pnpm test:e2e -- --stage V1.1` exit 0，代码套件及normal/rejection/recovery Web/API/CLI 3/3通过，三个Run的结构化导出与同Run账本核对通过；见[§8.61](./01-environment-and-web-center.md#861-v11-当前树完整隔离阶段入口复跑2026-10-12)和[完整日志](../../../evidence/audits/2026-10-12-v11-current-tree-stage-e2e-a01.log)。三Run人工结论继续NOT_RUN；活动切换/配对恢复和Ubuntu交付不因本次自动复验而关闭。

正式门禁a810（2026-10-12）：阶段文档结构审计PASS，证据审计PASS（1959引用、325份Manifest、465项）；21个指定历史TestRun仍17个导出验证通过，V1.2一条及V1.5三条原始导出缺失，V1仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`。[a810日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a810.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a810.log.exit.txt)、[SHA](../../../evidence/audits/2026-10-12-v1-formal-gate-a810.log.sha256)。

2026-10-12 V1.2当前树阶段复跑：完整隔离Web/API/CLI四场景与锁定Qlib 0.9.6双市场训练/验证通过，normal Run结构化导出和同Run CLI检查通过，详见[§8.52](./02-small-data-and-qlib.md#852-v12-当前树完整隔离阶段入口复跑2026-10-12)及[日志](../../../evidence/audits/2026-10-12-v12-current-tree-stage-e2e-a01.log)。该Run人工结论NOT_RUN；不能代替缺失历史Run的原始导出。

正式门禁a811（2026-10-12）：五阶段结构文档审计PASS，证据审计PASS（1966引用、327份Manifest、467项）；21个指定历史TestRun中17个导出验证通过，V1.2一条与V1.5三条历史结构化导出缺失，整体INCOMPLETE/exit 2、`uncheckedVersionGate=true`。[a811日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a811.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a811.log.exit.txt)、[SHA](../../../evidence/audits/2026-10-12-v1-formal-gate-a811.log.sha256)。

2026-10-12 V1.3当前树隔离矩阵复跑：`pnpm test:e2e -- --stage V1.3` exit 0，33/33 Web/API/CLI测试通过，真实券商/外部数据调用0，隔离资源精确清理，详见[§8.92](./03-fake-broker-trading-loop.md#892-v13-当前树完整隔离webapicli矩阵复跑2026-10-12)和[日志](../../../evidence/audits/2026-10-12-v13-current-tree-stage-e2e-a01.log)。各Run人工结论NOT_RUN；全市场语义、多seed、Ubuntu与阶段签收仍开放。

正式门禁a812（2026-10-12）：文档结构审计PASS，证据审计PASS（1973引用、329份Manifest、469项）；21个指定历史Run中17个导出验证通过，V1.2一条、V1.5三条原始导出缺失，V1仍INCOMPLETE/exit 2。[a812日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a812.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a812.log.exit.txt)、[SHA](../../../evidence/audits/2026-10-12-v1-formal-gate-a812.log.sha256)。

2026-10-12 V1.4当前树隔离Web/API/CLI阶段复跑：7/7浏览器测试、API及浏览器Run同Run CLI核验和报告/Manifest Hash配对通过，精确隔离清理完成；见[§8.95](./04-daily-backtest.md#895-v14-当前树完整隔离webapicli阶段复跑2026-10-12)及[日志](../../../evidence/audits/2026-10-12-v14-current-tree-stage-e2e-a01.log)。自动结果不签署用户验收。

正式门禁a813（2026-10-12）：文档结构审计PASS，证据审计PASS（1980引用、331份Manifest、471项）；21个指定历史Run仍17个导出验证通过，V1.2一条及V1.5三条原始结构化导出缺失，整体INCOMPLETE/exit 2。[a813](../../../evidence/audits/2026-10-12-v1-formal-gate-a813.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a813.log.exit.txt)、[SHA](../../../evidence/audits/2026-10-12-v1-formal-gate-a813.log.sha256)。

2026-10-12 V1.5当前树隔离阶段入口复跑：`pnpm test:e2e -- --stage V1.5` exit 0，normal/AUTO/rejection/recovery、共享证据和同Run CLI/export通过，7条API身份边界及4种模式拒绝通过；隔离容器、四卷和网络精确清理，详见[§8.47](./05-scheduling-and-recovery.md#847-v15-当前树完整隔离阶段入口复跑2026-10-12)和[日志](../../../evidence/audits/2026-10-12-v15-current-tree-stage-e2e-a01.log)。自动Run人工结论NOT_RUN。

正式门禁a814（2026-10-12）：五阶段文档与证据审计PASS（1987引用、333份Manifest、473项）；21个指定历史TestRun仍仅17个导出可验证，4个原始导出缺失。版本门禁`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。[a814日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a814.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a814.log.exit.txt)、[SHA](../../../evidence/audits/2026-10-12-v1-formal-gate-a814.log.sha256)。

2026-10-12当前树V1.4完整代码套件exit 0：基线67/67、适配器69/69、Market Data集成28/28、报告fencing 3/3、九个CN/US固定会话严格结算账本对照和隔离迁移通过，详见[阶段§8.96](./04-daily-backtest.md#896-v14-当前树完整代码套件复跑2026-10-12)及[日志](../../../evidence/audits/2026-10-12-v14-current-tree-code-suite-a01.log)。V1.5完整代码套件exit 0：基线67/67、适配器69/69、Market Data集成28/28、四服务迁移、Outbox 5/5和Incident 3/3通过，详见[阶段§8.48](./05-scheduling-and-recovery.md#848-v15-当前树完整代码套件复跑2026-10-12)及[日志](../../../evidence/audits/2026-10-12-v15-current-tree-code-suite-a01.log)。新增自动证据不更改人工验收签署，不补历史Run原始导出。

正式门禁a815（2026-10-12）：五阶段文档审计PASS，证据审计PASS（1998引用、336份Manifest、476项）；21个指定历史TestRun中17个结构化导出可验证，4条历史原始导出仍缺失。版本`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。[a815日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a815.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a815.log.exit.txt)、[SHA](../../../evidence/audits/2026-10-12-v1-formal-gate-a815.log.sha256)。

2026-10-12 P0语义复核A40：V1.5固定AUTO TestRun内四个Fill均可逐笔核查Proposal/Mandate/Order/Fill及双账结果；跨阶段/任意历史Run成交追溯及告警/能力/比较导航仍开放，V1.5-S2-L19保持PARTIAL/OPEN。见[A40](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a40.md)及[A86](../../../evidence/audits/2026-10-12-v1-current-gap-matrix-a86.json)。

正式门禁a816（2026-10-12）：五阶段结构审计PASS，证据审计PASS（2002引用、337份Manifest、477项）；21个指定历史TestRun中17个导出验证通过，四个原始历史导出缺失。版本`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。[a816日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a816.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a816.log.exit.txt)、[SHA](../../../evidence/audits/2026-10-12-v1-formal-gate-a816.log.sha256)。
2026-10-12正式V1门禁a823：五阶段文档审计PASS，证据审计PASS（2056引用、347份Manifest、523项）；V1整体`INCOMPLETE`/exit 2，4条指定历史Run原始导出仍缺。阶段工程、全V1恢复/目标环境和本人验收继续未完成。[a823日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a823.log)、[退出码](../../../evidence/audits/2026-10-12-v1-formal-gate-a823.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a823.log.sha256)。
2026-10-12 P0/P1调用合同增量A45：Historical Replay→Portfolio两个V1生产调用的超时预算均为5秒；定向测试3/3、Replay worker typecheck exit 0。与A43/A44组成Platform 6、Trade 5、Replay 2个实际调用的逐项超时断言。详见[V1.4 §8.97](./04-daily-backtest.md#897-historical-replay→portfolio实际v1客户端逐操作超时合同2026-10-12)、[A45](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a45.md)及[A91](../../../evidence/audits/2026-10-12-v1-current-gap-matrix-a91.json)。仅关闭传输预算子项；跨服务完整矩阵、阶段与人工验收仍开放。
2026-10-12正式V1门禁a824：五阶段文档审计PASS、证据审计PASS（2067引用、348份Manifest、524项）；V1整体`INCOMPLETE`/exit 2，4条指定历史Run导出仍缺，阶段工程、完整恢复/Ubuntu及人工作业验收未满足。[a824日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a824.log)、[退出码](../../../evidence/audits/2026-10-12-v1-formal-gate-a824.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a824.log.sha256)。

2026-10-12正式门禁a828：五阶段文档审计PASS，证据审计PASS（2077引用、349份Manifest、523项）；V1整体仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。本轮L16数据库多种子证据不改变阶段人验状态。四个指定历史Run结构化导出、目标Ubuntu/完整恢复及当前范围用户签收继续未满足。[门禁日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a828.log)、[退出码](../../../evidence/audits/2026-10-12-v1-formal-gate-a828.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a828.log.sha256)。

2026-10-12正式门禁a829（最终文档状态）：五阶段文档审计PASS，证据审计PASS（2080引用、350份Manifest、524项）；V1整体仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。L16多种子数据库增量仅作为自动证据记录，所有人工结论仍由用户确认；4个既定历史Run原始导出、目标Ubuntu/完整恢复与阶段验收继续未满足。[门禁日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a829.log)、[退出码](../../../evidence/audits/2026-10-12-v1-formal-gate-a829.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a829.log.sha256)。

2026-10-12增量：V1.3完整code suite在24-seed PostgreSQL成交序列矩阵后受控exit 0；L17语义复核A47确认当前Platform/Governance/Portfolio/Trade/Replay隔离模式片段有证据，但全V1服务/Worker/页面和活动发布回退矩阵仍开放。自动代码通过不变更任何TestRun的`manualConclusion=NOT_RUN`，不变更阶段签署或V1门禁状态。[V1.3 §8.95](./03-fake-broker-trading-loop.md#895-v13当前树多种子持久化与服务端模式边界完整代码套件2026-10-12)、[A47](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a47.md)、[A93矩阵](../../../evidence/audits/2026-10-12-v1-current-gap-matrix-a93.json)。

正式V1门禁a830：五阶段文档审计PASS，证据审计PASS（2090引用、351份Manifest、525项）；V1整体仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。四条历史Run原始结构化导出缺失，阶段/环境/完整恢复及人工验收未满足；自动代码套件不会签署用户结论。[a830日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a830.log)、[退出码](../../../evidence/audits/2026-10-12-v1-formal-gate-a830.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a830.log.sha256)。

正式V1门禁a831：五阶段文档审计PASS，证据审计PASS（2093引用、352份Manifest、526项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。L16/L17增量不构成阶段人工验收，四条历史Run导出和目标环境/完整恢复仍未满足。[a831日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a831.log)、[退出码](../../../evidence/audits/2026-10-12-v1-formal-gate-a831.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a831.log.sha256)。
正式V1门禁a860：五阶段文档审计PASS、证据审计PASS（2237引用/379份Manifest/517项）、Crosswalk 147项及288条精确映射PASS。版本仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`；25个指定历史Run有21份结构化导出通过，四份旧Run导出仍缺；阶段交付、Ubuntu/恢复和当前人工验收未完成。[a860日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a860.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a860.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a860.log.sha256)。

正式V1门禁a859：五阶段文档和证据审计均PASS（2234引用、378份Manifest、516项），Crosswalk 147项/288条精确测试映射PASS；但V1仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`。25个指定Run有21份结构化导出通过，V1.2一份及V1.5三份历史导出缺失；阶段工程、目标Ubuntu/恢复和本人当前范围验收仍未满足。[a859日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a859.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a859.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a859.log.sha256)。

2026-10-12 V1.3-S2-L16撤单拒绝/同单重试自动子场景已通过：seq=3拒绝恢复PARTIALLY_FILLED并保持预留HELD，随后seq=4接受完成撤单；完整隔离E2E 37/37、V1.3完整code suite exit 0。该Run的人工结论保持NOT_RUN，不代替本版本/阶段的人工签署或L16父项关闭。详见[V1.3 §8.103](./03-fake-broker-trading-loop.md#8103-p0l16-撤单拒绝后同单恢复与重试2026-10-12)、[E2E](../../../evidence/audits/2026-10-12-v13-l16-cancel-rejection-full-e2e-a02.log)及[代码套件](../../../evidence/audits/2026-10-12-v13-l16-cancel-rejection-current-code-suite-a02.log)。


2026-10-12自动证据增量：V1.3 Trade 13条受保护写路由及历史执行入口的六种客户端模式注入隔离HTTP/PG矩阵通过，完整V1.3 code suite exit 0（[§8.105](./03-fake-broker-trading-loop.md#8105-p0l17-v13-trade完整客户端模式注入矩阵2026-10-12)）。这是自动化工程证据，不是人工验收；本轮及版本/阶段人工结论仍`NOT_RUN`/未签署，L17/P0/V1保持OPEN。


2026-10-12自动证据增量：V1.1三个Paper服务端入口对六种客户端模式注入的拒绝矩阵通过，正常Run和恢复状态/隔离账本无副作用断言通过；完整阶段入口exit 0、3/3。Run及限制见[§8.67](./01-environment-and-web-center.md#867-p0l17-v11-paper入口客户端模式注入矩阵2026-10-12)与[日志](../../../evidence/audits/2026-10-12-v11-l17-client-mode-matrix-b03.log)。新增Run的人工作业结论均`NOT_RUN`，没有阶段签署；P0/L17/V1未关闭。


2026-10-12自动安全边界增量：V1.5 Run创建入口对六种PAPER/BACKTEST/LIVE × FAKE/REAL客户端模式组合均返回422，owner范围TestRun列表前后均为0；既有normal/AUTO/rejection/recovery完整隔离Web/API/CLI/export 4/4通过，真实券商/行情调用0，容器/卷/网络精确清理。见[V1.5 §8.52](./05-scheduling-and-recovery.md#852-v15-run创建完整客户端模式注入矩阵2026-10-12)及[A112](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a112.md)。本自动证据不签署人工验收，TestRun人验仍NOT_RUN；L17/P5/V1继续OPEN。完整V1.5 code suite当前树复验exit 0，日志、exit及SHA见[code suite证据](../../../evidence/audits/2026-10-12-v15-l17-mode-injection-code-suite-a01.log)。


2026-10-12正式V1门禁（V1.5 L17六模式拒绝与code suite后）：五阶段结构审计PASS、证据审计PASS（2288引用、389份Manifest、527项），Crosswalk 147项/295精确测试引用PASS；整体V1仍INCOMPLETE/exit 2、uncheckedVersionGate=true。25条指定历史Run中21份结构化导出通过，V1.2 Run 5dc2a5a7-28f1-4c9f-a867-3a676994f5b4及V1.5 Run 25fe0718-5a76-4477-a02b-5e954f621dde、48e32a09-4901-424f-8585-7b01ab9f83f7、113fea95-5fee-42ee-b702-f8423b8a173c原始导出缺失；阶段收尾、本人签收、Ubuntu/全域恢复仍OPEN。[门禁日志](../../../evidence/audits/2026-10-12-v1-formal-gate-v15-l17-a02.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-v15-l17-a02.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-v15-l17-a02.log.sha256)。

2026-10-12 V1.4自动安全边界增量：Run创建及取消两个Platform端点现在对完整六种`PAPER/BACKTEST/LIVE × FAKE/REAL`组合拒绝；创建时Quant Run数不变，取消Run状态不变。完整隔离E2E 7/7、同Run CLI核验和精确资源清理通过，完整V1.4 code suite exit 0，见[V1.4 §8.101](./04-daily-backtest.md#8101-v14创建与取消入口六种客户端交易模式矩阵2026-10-12)、[E2E日志](../../../evidence/audits/2026-10-12-v14-l17-six-mode-e2e-a01.log)、[code suite日志](../../../evidence/audits/2026-10-12-v14-l17-six-mode-code-suite-a02.log)。人验仍NOT_RUN；L17/V1.4/V1不因此通过。

正式V1门禁a04（纳入V1.4 L17 Replay Worker六模式矩阵及文档追踪）：五阶段文档审计PASS，证据审计PASS（2332引用、399份Manifest、537项）；25个指定历史TestRun仍有4份结构化导出缺失。V1仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`；阶段工程、目标Ubuntu/配对恢复与当前范围本人验收仍未满足。[门禁日志](../../../evidence/audits/2026-10-12-v1-formal-gate-v14-l17-a04.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-v14-l17-a04.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-v14-l17-a04.log.sha256)。

2026-10-12 V1.2自动模式边界增量：Run创建和取消入口完整六种`PAPER/BACKTEST/LIVE × FAKE/REAL`组合均被拒绝；创建后无TestRun/Qlib副作用，取消后Run状态和`cancelRequested`不变；正常取消及Platform重启恢复通过。完整Web/API/CLI E2E和V1.2 code suite均exit 0，见[V1.2 §8.56](./02-small-data-and-qlib.md#856-v12-run创建与取消入口六种客户端模式矩阵2026-10-12)、[E2E](../../../evidence/audits/2026-10-12-v12-l17-six-mode-e2e-a01.log)和[code suite](../../../evidence/audits/2026-10-12-v12-l17-six-mode-code-suite-a01.log)。新Run人验仍NOT_RUN，V1.2、L17及V1不因此通过。

正式V1门禁（2026-10-12，纳入V1.2 L17六模式矩阵）：五阶段结构审计PASS、证据审计PASS（2298引用、392份Manifest、530项）；25个指定历史Run中21份结构化导出通过，V1.2一份及V1.5三份原始导出仍缺。V1仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`；阶段收尾、目标Ubuntu/恢复与本人验收仍未满足。[门禁日志](../../../evidence/audits/2026-10-12-v1-formal-gate-v12-l17-a01.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-v12-l17-a01.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-v12-l17-a01.log.sha256)。

正式V1门禁（2026-10-12，V1.2 L17六模式矩阵及追踪同步后）：五阶段结构审计PASS、证据审计PASS（2298引用、392份Manifest、530项）；25个指定Run中21份结构化导出通过，V1.2一份及V1.5三份旧Run导出缺失。V1仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`；阶段工程、目标Ubuntu/完整恢复及当前范围本人验收仍未满足。[门禁日志](../../../evidence/audits/2026-10-12-v1-formal-gate-v12-l17-a01.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-v12-l17-a01.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-v12-l17-a01.log.sha256)。

2026-10-12 V1.5 L17自动模式边界增量：Run Incident确认与AUTO取消入口六种客户端模式均返回422，Incident维持OPEN、AUTO取消业务事实无变化；合法后续确认及同Run AUTO取消完成后双账本MATCH。标准隔离阶段E2E与专用AUTO取消E2E均浏览器4/4，完整V1.5 code suite exit 0、隔离资源精确清理。人验未新增签署，L17/P5/V1仍OPEN；详见[V1.5 §8.53](./05-scheduling-and-recovery.md#853-v15-incident确认与auto取消六种模式矩阵2026-10-12)、[阶段E2E](../../../evidence/audits/2026-10-12-v15-l17-six-mode-e2e-a01.log)、[AUTO取消E2E](../../../evidence/audits/2026-10-12-v15-l17-six-mode-auto-cancel-e2e-a01.log)及[code suite](../../../evidence/audits/2026-10-12-v15-l17-six-mode-code-suite-a01.log)。

正式V1门禁（2026-10-12，纳入V1.5 L17六模式Incident/AUTO取消矩阵）：五阶段结构审计PASS、证据审计PASS（2310引用、393份Manifest、531项）；25个指定历史Run中21份结构化导出通过，V1.2一份及V1.5三份旧Run结构化导出缺失。V1仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`；阶段交付、Ubuntu/恢复及本人验收未满足。[门禁日志](../../../evidence/audits/2026-10-12-v1-formal-gate-v15-l17-a01.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-v15-l17-a01.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-v15-l17-a01.log.sha256)。

正式V1门禁复核a03（2026-10-12）：五阶段文档审计PASS、证据审计PASS（2313引用、394份Manifest、532项）；25个指定历史Run中21份导出通过，四份原始Run结构化导出缺失；整体仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`，阶段工程、Ubuntu/完整恢复及本人验收未满足。前次a02的证据审计因新日志SHA sidecar时点校验失败，日志保留；当前日志哈希复核后a03通过证据审计。[a03](../../../evidence/audits/2026-10-12-v1-formal-gate-v15-l17-a03.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-v15-l17-a03.log.exit.txt)、[SHA](../../../evidence/audits/2026-10-12-v1-formal-gate-v15-l17-a03.log.sha256)、[a02诊断](../../../evidence/audits/2026-10-12-v1-formal-gate-v15-l17-a02.log)。

2026-10-12 V1.4-S2-L17合成基准收益报告已通过自动验证：隔离PostgreSQL/Quant/Platform/容器化Web的完整V1.4 E2E 7/7，10个浏览器Run由同Run CLI核对，Quant持久化18份TestRun/Manifest结果哈希匹配；完整V1.4 code suite退出0。证据见[V1.4 §8.103](./04-daily-backtest.md#8103-v14合成基准与超额收益报告)和机器报告。合成基准不证明真实指数收益；本轮人工接受未执行，`manualConclusion=NOT_RUN`，不构成V1.4或V1签收。语义矩阵A118将V1.4-S2-L17保持PARTIAL并记录范围边界，见[专项复核](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a118.md)。之后正式V1门禁a02确认五阶段文档审计PASS、证据审计PASS（2363引用、406份Manifest、544项），但V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`；[门禁日志](../../../evidence/audits/2026-10-12-v1-formal-gate-v14-benchmark-a02.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-v14-benchmark-a02.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-v14-benchmark-a02.log.sha256)。
2026-10-12 OD-014未知结算日严格现金回归已新增真实Trade→Portfolio HTTP/隔离PostgreSQL场景，Outbox交付成功、现金未提前释放、待结算应收不能用于BUY；完整V1.4 code suite exit 0，见[V1.4 §8.107](./04-daily-backtest.md#8107-od-014未知结算日的trade→portfolio真实http严格现金回归2026-10-12)及[日志](../../../evidence/audits/2026-10-12-v14-unknown-calendar-receivable-code-suite-a03.log)。正式V1门禁a12文档及证据审计PASS（2403引用/414份Manifest/552项），但V1仍INCOMPLETE/exit 2，四份历史结构化TestRun导出、阶段收尾、Ubuntu/恢复和当前范围本人验收未完成；本自动化证据不替代人工签收。[门禁a12](../../../evidence/audits/2026-10-12-v1-formal-gate-v14-unknown-calendar-a12.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-v14-unknown-calendar-a12.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-v14-unknown-calendar-a12.log.sha256)。
2026-10-12 V1.4 Quant已按OD-014批准的严格现金口径读取冻结结算日历，映射外SELL款持续作为未结算应收；完整code suite exit 0、容器Web/API/CLI E2E 7/7，10个浏览器Run经同Run CLI核对，隔离资源清理通过，详见[V1.4 §8.108](./04-daily-backtest.md#8108-quant回测按冻结结算fixture处理已结算现金与未知日历应收2026-10-12)。正式V1门禁a14五阶段文档及证据审计PASS（2415引用/417份Manifest/555项），但版本仍INCOMPLETE/exit 2；四份历史结构化TestRun导出、阶段收尾、Ubuntu/恢复和当前范围本人验收仍未完成。人工作业未签署。[a14门禁](../../../evidence/audits/2026-10-12-v1-formal-gate-v14-quant-settlement-a14.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-v14-quant-settlement-a14.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-v14-quant-settlement-a14.log.sha256)。

2026-10-12 V1.4执行模型结果合同加入场景模型ID匹配约束，合同测试2/2；完整code suite a03 exit 0、Web/API/CLI E2E a02 exit 0（浏览器7/7），详见[§8.110](./04-daily-backtest.md#8110-v14回测报告显式区分执行模型2026-10-12)。a25曾因把V1.2交互栈SHA清单误当当前源码快照导致证据审计FAIL；阶段记录已明确历史执行快照并保留原清单。a26五阶段文档/证据审计PASS（2455引用/421份Manifest/559项），但整体仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`；四份历史结构化Run导出、阶段余项、Ubuntu/完整恢复及当前范围人工验收未完成。[a25诊断](../../../evidence/audits/2026-10-12-v1-formal-gate-v14-execution-model-a25.log)、[a26门禁](../../../evidence/audits/2026-10-12-v1-formal-gate-v14-execution-model-a26.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-v14-execution-model-a26.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-v14-execution-model-a26.log.sha256)。

同步当前V1汇总、计划及本验收记录后的a27复核：五阶段文档审计PASS，证据审计PASS（2459引用/422份Manifest/560项）；版本整体仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`。四份历史结构化TestRun导出、阶段交付、Ubuntu实机、全域恢复和当前范围本人验收未完成。[a27门禁](../../../evidence/audits/2026-10-12-v1-formal-gate-v14-execution-model-a27.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-v14-execution-model-a27.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-v14-execution-model-a27.log.sha256)。

2026-10-12 V1.3 L16补充撤单拒绝先到因果恢复：seq=3 REJECTED先于seq=2 Fill时缓冲，订单保持待撤且预留HELD；补齐Fill后订单回到PARTIALLY_FILLED，同Run CLI确认中间态，再以seq=4接受同单重试并释放预留，FakeBroker/Portfolio账本MATCH。TestRun `71388ee9-fadb-4e7a-8526-e1b4f1e74323`，定向E2E 1/1、完整V1.3浏览器矩阵39/39和code suite exit 0。[§8.112](./03-fake-broker-trading-loop.md#8112-v13-s2-l16撤单拒绝先到时保留预留并同单恢复2026-10-12)、[定向日志](../../../evidence/audits/2026-10-12-v13-l16-early-rejected-cancel-e2e-a03.log)。本Run人工验收为NOT_RUN；该固定因果子项不关闭L16/P3或V1阶段/版本验收。

纳入V1.3 L16拒绝先到恢复证据后的正式V1门禁a28：五阶段文档审计PASS、证据审计PASS（2471引用/423份Manifest/561项），版本仍INCOMPLETE/exit 2；四份历史结构化Run导出、阶段收尾、Ubuntu、完整恢复及本人当前范围验收未完成。[a28日志](../../../evidence/audits/2026-10-12-v1-formal-gate-v13-l16-early-rejected-cancel-a28.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-v13-l16-early-rejected-cancel-a28.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-v13-l16-early-rejected-cancel-a28.log.sha256)。
2026-10-12正式V1门禁current-a41：五阶段文档审计PASS，证据审计PASS（2508引用/432份Manifest/606项），但版本仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。四份指定历史TestRun导出、阶段剩余交付、Ubuntu x86_64实机、全域恢复和本人验收仍未完成。V1.2新生成的五个Run均有结构化导出，但不得替代原始历史Run。[a41日志](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a41.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a41.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a41.log.sha256)。
2026-10-12正式V1门禁current-a42：五阶段文档审计PASS，证据审计PASS（2511引用/433份Manifest/607项），版本仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。四份指定历史TestRun导出、阶段剩余工程与人工验收仍未满足；目标Ubuntu x86_64和全域恢复亦未验证。[a42日志](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a42.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a42.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a42.log.sha256)。
2026-10-12 V1.2 §8.4 CLI/证据导出交付复核A133：当前Web创建的normal/rejection/recovery-probe及重启恢复Run与同UUID CLI `--check-only`核对，取消Run同Run只读核对，五个导出包Hash有效；仅`V1.2-S8-L115`限域PASS，`manualConclusion`均为`NOT_RUN`。不代表阶段/用户签收或V1通过。[A133](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a133.md)、[§8.66](./02-small-data-and-qlib.md#866-§84-同run-cli只读核对与证据导出的当前执行复核2026-10-12)。
2026-10-12正式V1门禁current-a43：五阶段文档/证据审计PASS（2521引用、434份Manifest、608项），但V1仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`。25个指定Run仍有4个历史导出缺失；阶段工程和用户签收、Ubuntu实机及完整恢复未完成。[a43日志](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a43.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a43.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a43.log.sha256)。
2026-10-12正式V1门禁current-a44：五阶段文档审计PASS，证据审计PASS（2524引用/435份Manifest/609项）；Crosswalk 147项/319个精确测试映射PASS，但版本仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。本次核查的30个指定TestRun中22份结构化导出有效，8份缺失：V1.2五份（`5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`、`49be08a1-2a93-486f-9878-c755196c1366`、`75f53599-3488-4c44-b1f7-431d86bae38e`、`19637177-937f-4bed-9512-c0a26f057eac`、`91990695-4b20-4a4d-9b8a-9fe29f448286`），V1.5三份（`25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`）。阶段交付、Ubuntu/恢复及当前范围人工签收仍未完成。[a44日志](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a44.log)、[退出码](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a44.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a44.log.sha256)。
2026-10-12正式V1门禁current-a50：五阶段文档结构审计PASS、证据审计PASS（2538引用/436份Manifest/574项）；32个指定TestRun中24份结构化导出验证通过，8份历史导出缺失（V1.2五份、V1.5三份）。版本仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`；所有阶段交付、Ubuntu实机、全域恢复和当前范围人工验收仍未完成。[a50日志](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a50.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a50.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a50.log.sha256)。a49在V1.3行格式缺分隔符时只解析4阶段，作为审计诊断保留，不作为正式门禁结论。
2026-10-12 OD-014严格已结算现金当前树定向复核：Portfolio结算日历/资源预留单测5/5、Trade Fill/MANUAL/AUTO Paper定向单测23/23、contracts与Fixtures检查均退出0，覆盖未知日历失败关闭与BUY严格使用已结算现金；日志见[V1.4 §8.112](./04-daily-backtest.md#8112-od-014严格现金当前树定向复核2026-10-12)。该自动证据不替代完整市场规则/Quant-Paper对照，人工验收仍NOT_RUN，P4/V1继续OPEN。
2026-10-12 V1.2历史Run恢复：从原始隔离E2E日志中精确回读恢复rejection `49be08a1-2a93-486f-9878-c755196c1366`和recovery `75f53599-3488-4c44-b1f7-431d86bae38e`结构化证据包，逐包绑定原始字段与来源日志/机器报告SHA，人工结论仍`NOT_RUN`。其余3个V1.2及3个V1.5历史导出仍缺，不以摘要重建。[V1.2 §8.67](./02-small-data-and-qlib.md#867-两个历史v12-testrun从原始api回读日志恢复2026-10-12)、[恢复报告](../../../evidence/audits/2026-10-12-v12-historical-run-bundle-recovery-a01.json)。
2026-10-12正式V1门禁current-a53：五阶段结构审计PASS，证据审计PASS（2547引用/438份Manifest/576项）；32个目标TestRun关联中6份历史结构化导出缺失（V1.2 3份、V1.5 3份），两份已恢复V1.2导出通过逐UUID校验。V1仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`；阶段交付、目标Ubuntu、完整恢复和新增范围人工签收仍开放。[门禁日志](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a53.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a53.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a53.log.sha256)。


2026-10-12正式V1门禁current-a66：五阶段文档审计PASS、证据审计PASS（2570引用、443份Manifest、581项）；35个指定TestRun中29份导出通过，6份缺失（V1.2 `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`、`19637177-937f-4bed-9512-c0a26f057eac`、`91990695-4b20-4a4d-9b8a-9fe29f448286`；V1.5 `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`）。V1仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`；阶段交付、Ubuntu x86_64实机、全域恢复和当前范围人验未完成。[a66日志](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a66.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a66.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a66.log.sha256)。缺失来源与恢复边界见[历史来源复核A04](../../../evidence/audits/2026-10-12-v1-history-export-source-recheck-a04.md)。

2026-10-12正式V1门禁current-a67：五阶段文档审计PASS、证据审计PASS（2576引用、444份Manifest、582项）；35个指定TestRun中29份导出通过，6份缺失（V1.2三份、V1.5三份，精确UUID及来源状态见上方current-a66记录和[来源复核A04](../../../evidence/audits/2026-10-12-v1-history-export-source-recheck-a04.md)）。V1仍INCOMPLETE/exit 2，阶段交付、Ubuntu实机、全域恢复及当前范围人工验收未完成。[a67日志](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a67.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a67.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a67.log.sha256)。

2026-10-12正式V1门禁current-a72（纳入A140调用合同增量后）：五阶段文档审计PASS、证据审计PASS（2588引用、447份Manifest、585项）；35个目标TestRun中6个指定历史Run仍缺结构化导出，V1为INCOMPLETE/exit 2。P0–P6阶段交付余项、Ubuntu实机、全域恢复及当前范围人工验收未完成。[a72日志](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a72.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a72.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a72.log.sha256)。

2026-10-13 V1.2 Qlib Worker模式边界增量：本机真实HTTP Worker对六种客户端`environmentMode`/`brokerMode`注入均返回422，定向测试5/5通过；合法请求在缺少本机Qlib时如实返回503/`NOT_RUN`。仓库锁定Python测试镜像缺失，Linux容器验证NOT_RUN；该测试不代表模型训练/有效性、阶段人验或V1验收。[V1.2 §8.69](./02-small-data-and-qlib.md#869-qlib-worker-http交易模式字段拒绝边界2026-10-13)、[HTTP日志](../../../evidence/audits/2026-10-13-v12-qlib-worker-mode-boundary-a01.log)。

2026-10-13 V1正式门禁复核：五阶段文档审计PASS、证据审计PASS（2662引用、463份Manifest、601项）；门禁仍为`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`，35个目标TestRun有6个历史导出缺失，Ubuntu实机、完整恢复、阶段余项与当前范围人工签收仍未完成。[门禁日志](../../../evidence/audits/2026-10-13-v1-formal-gate-qlib-worker-mode-a01.log)、[退出码](../../../evidence/audits/2026-10-13-v1-formal-gate-qlib-worker-mode-a01.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-13-v1-formal-gate-qlib-worker-mode-a01.log.sha256)。

2026-10-13 V1.5 L17 dispatch边界增量：envelope/payload/session字段白名单及客户端模式/业务事实注入拒绝定向19/19，完整V1.5 code suite exit 0；详见[阶段§8.56](./05-scheduling-and-recovery.md#856-v15-jetstream-dispatch-envelope字段白名单2026-10-13)及[日志](../../../evidence/audits/2026-10-13-v15-l17-dispatch-envelope-mode-http-unit-a01.log)。本项不改变V1.5或V1正式状态；当前范围人工验收仍NOT_RUN。

2026-10-13当前树V1.5主要场景复验：隔离Web/API/CLI/export 4/4，AUTO四笔Fill追溯成功，临时资源清理通过；自动报告仍`manualConclusion=NOT_RUN`。详见[阶段§8.57](./05-scheduling-and-recovery.md#857-当前树-v15-四场景主要功能复验-2026-10-13)及[机器报告](../../../evidence/audits/2026-10-13-v15-nats-temporal-dispatch-sq-v15-e2e-7a86df3dcd7b56648bef.json)。

2026-10-13当前树V1.2核心功能E2E：真实Qlib 0.9.6双市场112项预测、Governance持久接收TOPK/NO_TRADE研究快照、Platform重启恢复，四个Run同Run CLI/export，隔离清理PASS；人工验收NOT_RUN。见[阶段§8.70](./02-small-data-and-qlib.md#870-当前树v12-qlib主流程复验-2026-10-13)与[运行记录](../../../evidence/audits/2026-10-13-v12-current-core-e2e-a01.md)。

2026-10-13 V1主要功能当前树隔离E2E：V1.1 3/3、V1.2真实Qlib/Governance链路、V1.3 40/40、V1.4 7/7、V1.5 4/4；本地PostgreSQL/NATS/Temporal/Artifact配对恢复含真实V1.5 AUTO订单/Fill账本，恢复后MATCH。各项详细范围、运行ID与限制见[汇总证据](../../../evidence/audits/2026-10-13-v1-current-core-e2e-a01.md)。Artifact卷内容为合成探针，不宣称Qlib模型Artifact已配对恢复；所有人工结论仍NOT_RUN。

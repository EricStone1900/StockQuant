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

## 1. 阶段验收

| 阶段 | 后端/自动检查 | Web人工验收 | 证据/testRunId | 已知限制 | 签署/日期 |
|---|---|---|---|---|---|
| [V1.1 环境、账户初始化与 Web 验收中心](./01-environment-and-web-center.md) | PARTIALLY_IMPLEMENTED（历史自动PASS保留；当前范围未关闭） | 历史用户确认PASS（2026-09-09）；新增范围人工验收NOT_RUN | normal `d5add8bf-ae44-48a8-b726-b4be34ab4278`（[恢复的原始TestRun证据包](../../../evidence/local/V1.1/d5add8bf-ae44-48a8-b726-b4be34ab4278/evidence.json)，manualConclusion仍NOT_RUN）；rejection `24276340-2e5a-4516-a7d0-20f92851754b`（[2026-10-05从legacy PostgreSQL精确行恢复](../../../evidence/local/V1.1/24276340-2e5a-4516-a7d0-20f92851754b/evidence.json)，无run级人工签署）；recovery `bdb53484-19b4-4363-a130-eee94761df54`（[2026-10-05从legacy PostgreSQL精确行恢复](../../../evidence/local/V1.1/bdb53484-19b4-4363-a130-eee94761df54/evidence.json)，无run级人工签署）；2026-09-26 stage-mode code suite及Web normal/rejection/recovery同run CLI见[审计](../../../evidence/audits/2026-09-26-v11-stage-store-code-suite.md)；2026-10-09当前树`pnpm test:e2e -- --stage V1.1`完整code suite与Chromium三场景3/3通过，Run normal `3c2d0c3a-b116-4919-ae7c-cf40e25a864c`、rejection `92cf8854-cd6f-4d36-baec-70e0cc300434`、recovery `bead2713-cc26-47e5-9d23-a96f8a008d0a`均经同UUID CLI只读核对并结构化导出；详见[机器报告](../../../evidence/audits/2026-10-09-v11-current-worktree-e2e-a03.json)及[交互栈清理报告](../../../evidence/audits/2026-10-09-v11-interactive-stack-lifecycle-a02.json) | 历史 2026-09-09 验收范围为本地 ARM64；当前统一TestRun存储模式代码和三场景Web/CLI在独立PG验证通过；2026-10-01 V1.1全代码套件受控退出0，包含DC-06项目分页/导出生成客户端漂移检查，Market Data分钟API八操作及账户客户端仍有效；新增Research Artifact不可变过期时间/EXPIRED终态有隔离PG、Platform投影与完整V3.1套件证据，但未批准保留期/调度或物理清理；DC-06分页/导出另有匿名401、跨项目403的真实隔离HTTP/PG证据；活动API仍为`legacy`且未执行切换/回退窗口；2026-10-10核心Schema TS/Python及8服务类型副本字段回归、V1.1完整code suite exit 0（[§8.25](./01-environment-and-web-center.md#825-核心公共schema服务类型副本字段回归2026-10-10)，[日志](../../../evidence/audits/2026-10-10-v11-core-service-schema-code-suite-a02.log)）；该类型副本检查不证明业务消费者使用正确；本轮未新增人工签署 | 用户确认（本会话） / 2026-09-09；历史签署保留，新增范围未签署 |
| [V1.2 小样本数据、真实 Qlib 与环境探针](./02-small-data-and-qlib.md) | PARTIALLY_IMPLEMENTED（2026-10-10当前树已升级到v1.2-market-data-5并通过显式市场会话日历/整市场缺日失败关闭的完整代码和隔离Web/API/CLI复验（§8.41）；历史范围保留；2026-10-09完整code suite及隔离Web/API/CLI回归通过（含Market Data事务迁移的[最终套件日志](../../../evidence/audits/2026-10-09-v12-market-data-migration-code-suite-a01.log)）；Artifact失败路径现为PENDING暂存、成功后显式发布，完整复验见[§8.29](./02-small-data-and-qlib.md#829-artifact暂存与失败不可见2026-10-09)；固定RD-Agent兼容探针在隔离Qlib Worker执行value=42且Web同Run核验modelCalls=NOT_RUN；新增范围人工验收和Ubuntu未完成） | 历史用户确认PASS（2026-09-09）；新增范围人工验收NOT_RUN；Ubuntu NOT_RUN | `v1.2-market-data-4`；Qlib 0.9.6；历史平台Run `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`（结构化导出缺失；2026-10-10当前API仍404，见[只读复核](../../../evidence/audits/2026-10-10-v1-current-history-test-run-api-recheck-a01.json)）；当前normal TestRun `890f3fab-e689-471b-8c45-97abd531d3d5`（[结构化证据包](../../../evidence/local/V1.2/890f3fab-e689-471b-8c45-97abd531d3d5/evidence.json)，3/3断言PASS、manualConclusion NOT_RUN）；2026-10-07完整`pnpm verify:stage -- --stage V1.2 --suite code`exit 0并含最新隔离Web/API/CLI 1/1，四个Run及输入Hash见[机器结果](../../../evidence/audits/2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-1dd2d38c42f2392cb0b4.json)和[历史执行快照SHA清单](../../../evidence/audits/2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-1dd2d38c42f2392cb0b4.sha256) | Qlib容器为Mac ARM64上的linux/amd64仿真；真实市场数据、全量数据、Ubuntu x86_64及新增范围人工验收仍未验证 | 用户历史确认保留 / 2026-09-09；本轮不新增签署 |
| [V1.3 治理、风控与模拟券商完整交易链路](./03-fake-broker-trading-loop.md) | PARTIALLY_IMPLEMENTED（历史范围保留；2026-10-08版本化Fixture/Schema/Web消费、修复刷新后订单恢复、Portfolio/Trade/Governance三处LIVE/REAL拒绝与无副作用断言通过、当前完整code suite exit 0、固定隔离Web/API/CLI矩阵21/21通过及逐项截图/Trace重新验证；完整交易所规则/目标Ubuntu交接与本轮人工验收未完成；2026-10-09当前树完整code suite exit 0，正式`pnpm test:e2e -- --stage V1.3`22/22（新增Platform Proposal三种模式篡改拒绝与无副作用、同Run CLI核验）；最新code suite exit 0，独立stack Web/session探针200且精确清理PASS，报告见[结构化证据](../../../evidence/audits/2026-10-09-v13-current-worktree-evidence-a01.json)） | 历史用户Web确认PASS（2026-09-09）；新Fixture范围当前自动矩阵22/22 PASS；2026-10-10 AUTO Mandate预算读回和刷新恢复复验22/22、27条路由身份矩阵通过（[执行日志](../../../evidence/audits/2026-10-10-v13-mandate-budget-readback-web-e2e-a01.log)）；新增Platform客户端业务事实注入拒绝V1.3隔离E2E 22/22、code suite exit 0（[E2E](../../../evidence/audits/2026-10-10-v13-server-owned-facts-e2e-a02.log)，[Code](../../../evidence/audits/2026-10-10-v13-server-owned-facts-code-a01.log)）；新增范围人工验收NOT_RUN | [V1.3 Fixture与交接审计](../../../evidence/audits/2026-10-08-p3-v13-fixture-and-handoff.md)；[Paper/Fake服务端边界代码套件](../../../evidence/audits/2026-10-08-p3-paper-fake-server-boundary.md)；[新Fixture绑定的完整矩阵](../../../evidence/audits/2026-10-08-p3-v13-refresh-fix-matrix-enabled.log)；[订单协调应用服务后的完整代码套件](../../../evidence/audits/2026-10-08-p3-v13-order-coordination-application-services-code-suite.log)；[订单协调应用服务后的21项Web/API/CLI矩阵](../../../evidence/audits/2026-10-08-p3-v13-order-coordination-application-services-e2e.log)；[应用服务提取后21项截图与Trace Hash清单](../../../evidence/audits/2026-10-08-v13-browser-captures-after-app-service.sha256)；[刷新修复轮历史执行快照Hash清单（Harness复用原目录后已失配）](../../../evidence/audits/2026-10-08-v13-browser-captures-refresh-fix.sha256)；[修订协调后最终审计](../../../evidence/audits/2026-10-07-v13-governance-coordination-after-revision.md)；[治理应用服务最终审计](../../../evidence/audits/2026-10-07-v13-governance-application-services.md)；[MANUAL执行应用服务审计](../../../evidence/audits/2026-10-07-v13-manual-execution-application-service.md)；[AUTO_POLICY应用服务审计](../../../evidence/audits/2026-10-07-v13-auto-execution-application-service.md)；[持久Session推进与T+1审计](../../../evidence/audits/2026-10-07-v13-tplus1-session-advance.md) | FakeBroker为隔离模拟，未接触真实券商；固定矩阵不是完整交易所规则、长期观察、Ubuntu或用户验收 |
| [V1.4 日线历史回测与可核对报告](./04-daily-backtest.md) | PARTIALLY_IMPLEMENTED（2026-10-10 Replay UNKNOWN原单查询已按订单ID+namespace隔离，Trade隔离HTTP/PG验证正确scope 200、跨scope 404、通用订单读取403（[§8.20](./04-daily-backtest.md#820-v14-unknown原单读取按replay-namespace隔离2026-10-10)；[审计](../../../evidence/audits/2026-10-10-v14-replay-namespace-recovery-a01.md)）。历史签署保留；2026-10-07固定回测/公司行动及持久异步任务隔离E2E通过，覆盖预执行取消、Quant调用前与Quant结果落库后Platform进程恢复、同ID幂等重放、Web轮询和同Run CLI；2026-10-07 V1.3 FakeBroker SELL修复后复跑V1.4完整code suite与隔离E2E通过；2026-10-10 FakeBroker独立资产账本原子记账、幂等重试、现金不足零副作用拒绝/新授权恢复在code suite a13通过，之后当前工作树V1.4 Web/API/CLI E2E a01 exit 0（Playwright 5/5、API和8个浏览器Run同Run CLI检查、容器/卷/网络清理完成）；当前树V1.4 E2E a02 exit 0（Playwright 6/6，新增RUNNING期间浏览器刷新后恢复同一TestRun并经CLI核验，9个浏览器Run同Run CLI、17组Quant结果/Manifest Hash匹配、18个Platform Run及资源清理通过；自动证据Run `6b3ca46d-46ee-4112-99ad-f1661c3d322a`，详见[§8.74日志](../../../evidence/audits/2026-10-10-v14-browser-refresh-recovery-e2e-a02.log)）；滑点后0.01报价档BUY/SELL对齐的规则切片已验证；费用模型/全市场规则/日历、Qlib/Paper完整对照、当前范围用户验收未完成；2026-10-10新增Web拒绝场景显示FUTURE_SIGNAL_SAME_DAY/T_PLUS_1_UNAVAILABLE、reportPublished=false并由同Run CLI核验（§8.75），当前隔离E2E 7/7） | `pnpm verify:stage -- --stage V1.4 --suite code` exit 0；`pnpm test:e2e -- --stage V1.4` exit 0，最新18组Quant BacktestRun/Manifest/resultHash配对、19个Platform TestRun、10个浏览器Run由CLI同Run核验、Playwright 7/7；当前滑点取整受影响的V1.3/V1.4 code suite均exit 0；人工结论NOT_RUN | [滑点报价档对照](../../../evidence/audits/2026-10-07-v14-slippage-tick-parity.md)、[最新持久任务复验](../../../evidence/audits/2026-10-07-v14-durable-tasks-ab5fb8f4ee92e8c60081.md)、[历史执行快照机器结果](../../../evidence/audits/2026-10-07-v14-durable-tasks-ab5fb8f4ee92e8c60081.json)、[历史执行快照输入SHA-256](../../../evidence/audits/2026-10-07-v14-durable-tasks-ab5fb8f4ee92e8c60081.sha256)、[本轮E2E日志](../../../evidence/audits/2026-10-10-v14-paper-http-parity-web-e2e-a01.log)、[E2E SHA-256](../../../evidence/audits/2026-10-10-v14-paper-http-parity-web-e2e-a01.log.sha256)、[Web拒绝场景7/7 E2E](../../../evidence/audits/2026-10-10-v14-web-rejection-e2e-a01.log)、[拒绝变更后当前树code suite](../../../evidence/audits/2026-10-10-v14-web-rejection-code-suite-a01.log)、[资产账本code suite a13](../../../evidence/audits/2026-10-10-v14-paper-http-parity-code-suite-a13.log) | 完整适用市场规则/日历、费用税务、Qlib/Paper逐规则一致性和当前人工签署未完成；自动PASS不替代人工验收或V1.4关闭 | 历史人工签署仅适用当时范围；本轮新增范围未签署 |
| [V1.5 无人逐笔操作、故障恢复与 V1 验收](./05-scheduling-and-recovery.md) | PARTIALLY_IMPLEMENTED（normal NO_TRADE、AUTO交易、暂停拒绝、UNKNOWN原单恢复、已完成AUTO Run重复派发无副作用及基础设施恢复子项均有隔离E2E；最新完整V1.5 code suite exit 0，含锁版Python Worker 14/14及隔离数据库/HTTP检查（[最终a02日志](../../../evidence/audits/2026-10-09-v15-single-session-eod-code-suite-a02.log)；重复AUTO派发证据见[四场景E2E](../../../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-9d20807a341936dceaf1.json)）；治理预算汇总HTTP/PG验证RESERVED/CONSUMED/RELEASED汇总和owner scope（[日志](../../../evidence/audits/2026-10-09-v13-mandate-budget-http-pg-a01.log)）；AUTO Web/API/CLI/export E2E逐市场核对CN CNY 1005.00、US USD 250.05各消费一次（[JSON](../../../evidence/audits/2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-0d837e9c09a10e5b6d31.json)）；本轮新增AUTO工作流终态独立账本复读断言通过[四场景E2E](../../../evidence/audits/2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-230c4258f848db04ca52.json)；关闭原验收页后重开并恢复同一TestRun已通过隔离E2E（[报告](../../../evidence/audits/2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-391873c1eb80223c45ee.json)）；AUTO工作流终态双账本复读、双日合成Fixture错过窗口重评估及收盘对账均已通过四场景隔离E2E（[报告](../../../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-6e7301d0edfd5bcdb496.json)）；多日交易/日历完整性及结算、关浏览器持续运行观察、任意Run成交全链路追溯（固定AUTO Run逐字段追溯视图和工作流终态双账本复读已通过隔离E2E）、真实时钟延迟调度/完整交易恢复、各V1阶段实际Artifact/Quant产物配对、同点NATS/Temporal及宿主/异地恢复仍未完成；当前树合成全数据库/Artifact卷隔离复验及V1.2 Qlib/V1.4 Quant报告配对见[§8.40–§8.42](./05-scheduling-and-recovery.md#842-v14-quant回测结果manifest与platform-testrun报告配对恢复2026-10-10)、[Qlib报告](../../../evidence/audits/2026-10-10-v1-isolated-cluster-paired-backup-a15c94ce9cc0449b.json)和[Quant报告](../../../evidence/audits/2026-10-10-v1-isolated-cluster-paired-backup-765778dbb0e74e55.json)，第2/7/8节待办未完成） | 历史用户Web与Ubuntu烟测确认PASS（2026-09-09）；当前W8目标主机明细/范围重验NOT_RUN；当前V1.5新增范围人工验收NOT_RUN | 历史业务Run `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`结构化导出缺失；本轮NO_TRADE及Web/API/CLI/export证据：[V1.5 NO_TRADE Temporal E2E](../../../evidence/audits/2026-10-07-v15-no-trade-workflow-e2e.md)、[UNKNOWN恢复E2E](../../../evidence/audits/2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-e09b3c5a08f1a6594056.json)、[预算读取AUTO E2E](../../../evidence/audits/2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-0d837e9c09a10e5b6d31.json)、[预算HTTP/PG汇总](../../../evidence/audits/2026-10-09-v13-mandate-budget-http-pg-a01.log)、[坏消息/错误owner/重复派发与原Outbox恢复E2E](../../../evidence/audits/2026-10-07-v15-poison-envelope-e2e.md)、[双Worker E2E](../../../evidence/audits/2026-10-07-v15-multiworker-e2e.md)、[四卷恢复E2E](../../../evidence/audits/2026-10-07-v15-paired-backup-restore-e2e.md)、[当前树含V1.2 Qlib ArtifactRef的配对恢复](../../../evidence/audits/2026-10-10-v1-isolated-cluster-paired-backup-a15c94ce9cc0449b.json)、[历史Run恢复源审计及2026-10-10当前API只读复核](../../../evidence/audits/2026-10-07-v1-history-run-recovery-check.md) | 120个当地日期是虚拟Fixture观察，不是实际日历等待；宿主/异地恢复、Artifact卷、双Worker同时故障、交易/日终调度、目标Ubuntu和当前范围用户签署未完成。历史Run缺失证据未替代 | Ubuntu历史人工签署保留；本轮新增范围未签署 |

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

## 2. 版本门禁

2026-09-23 状态复核：V1.1～V1.5 的阶段级历史自动验证和人工签署继续保留；阶段五已补充当前 Compose NATS/Temporal 持久卷容器重建 PASS。但版本级门禁清单仍有待逐项完成，且原始 Ubuntu 明细尚缺，因此版本总结维持 `NOT_RUN`，不改变用户既有签署。

- [ ] 每阶段第7节开发交付项已逐项核实；用户人工项有实际确认依据。
- [ ] 每阶段第8节由DRAFT_NOT_EXECUTABLE更新为实测手册，填写目录、URL、具体Fixture/参数、代码测试命令和预期输出。
- [ ] 正常/拒绝/恢复、代码套件、浏览器E2E、Web同run只读核对及证据导出均有实际命令/退出码；必需观察项未跳过。

- [ ] 所有必需阶段及成功/拒绝/恢复适用场景已通过，失败未被随机性掩盖。
- [ ] 正式页面与验收中心实际调用业务服务；长任务不依赖浏览器存活。
- [ ] FakeBroker独立状态、订单/Fill幂等、资金与可卖量、PIT及运行隔离通过。
- [ ] 数据、模型、券商、环境、成交模型分别标注；真实组件/外部服务与Fixture证据不混淆。
- [ ] 目标架构检查、性能/观察窗口按本版阶段要求记录，缺项仍NOT_RUN。
- [ ] 阶段脚本、日志、截图、数值检查、迁移/备份及操作说明齐备。
- [ ] LIVE写入口不可用，真实券商（含只读）未接入；本版仅模拟交付。

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
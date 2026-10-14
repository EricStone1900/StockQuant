> 当前正式结论（2026-10-14）：V1当前主要功能范围开发与正式验收完成，五阶段PASS、正式门禁PASS/exit 0；结果见[本次记录](../../../evidence/audits/2026-10-14-v1-core-closeout-gate-a03.log)。本文件下方旧审计/OPEN均保留对应日期的历史范围，不恢复已延期要求。

> 当前V1收尾范围（2026-10-13）：所有者要求聚焦主要功能、减少非必要验证和停止扩散；当前执行以[V1主要功能完成计划](../../plans/2026-10-08-v1-completion-plan.md)及[范围决定](../../decisions/2026-10-13-v1-core-closeout-scope.md)为准。延期增强和广泛验证不阻塞本轮，旧任务/结果/签署保留为历史；核心正确性和人工验收不缩减。

> 当前范围决定（2026-10-13）：所有者已将Ubuntu实机部署/恢复/主机资源验收延期至后续Ubuntu部署验收，状态DEFERRED / NOT_RUN；它不再阻塞V1本轮开发及验收。Mac本地容器、目标架构烟测/缺口登记、其余业务/恢复和人工验收要求保留。旧记录中的Ubuntu缺口保留为历史事实，不代表当前V1阻塞。见[延期决定](../../decisions/2026-10-13-v1-ubuntu-deferral.md)。

最新正式V1门禁current-a83：五阶段文档与证据审计PASS（2638引用/455份Manifest/593项）；六份指定历史TestRun导出缺失，V1保持INCOMPLETE/exit 2；阶段余项、Ubuntu、完整恢复与人验仍未满足。[a83日志](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a83.log)。
最新正式V1门禁current-a79：五阶段文档审计PASS、证据审计PASS（2625引用/452份Manifest/590项）；6份指定历史Run导出缺失，V1仍INCOMPLETE/exit 2；阶段余项、Ubuntu、完整恢复和人验未完成。[a79日志](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a79.log)。
最新正式V1门禁current-a78：五阶段文档审计PASS、证据审计PASS（2620引用/451份Manifest/589项）；6份指定历史TestRun导出缺失，V1仍INCOMPLETE/exit 2；阶段余项、Ubuntu、完整恢复及人工验收未完成。[a78日志](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a78.log)。
最新正式V1门禁current-a77：五阶段文档审计PASS、证据审计PASS（2615引用/450份Manifest/588项）；35个目标Run中6份历史结构化导出缺失，V1仍INCOMPLETE/exit 2。阶段余项、Ubuntu、全域恢复及人验未完成。[a77日志](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a77.log)。
2026-10-12正式V1门禁current-a76：五阶段文档审计PASS、证据审计PASS（2613引用/450份Manifest/588项）；35个目标Run中6份历史结构化导出缺失，V1仍INCOMPLETE/exit 2。阶段余项、Ubuntu、全域恢复及人验未完成。[a76日志](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a76.log)。
2026-10-12 V1.4-S2-L18语义复核A142：US固定Fixture Quant/Paper在55bps滑点下的固定合成USD费用差异已修复，定向测试与完整隔离code suite通过；仅限该场景，P4仍OPEN，完整规则/恢复矩阵、Ubuntu与人验未完成。[A142报告](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a142.md)、[矩阵](../../../evidence/audits/2026-10-12-v1-current-gap-matrix-a142.json)。
2026-10-12正式V1门禁current-a75（纳入A141阶段追踪与Crosswalk锚点更新后）：五阶段文档审计PASS、证据审计PASS（2601引用、449份Manifest、587项）；35个目标TestRun中6个指定历史Run仍缺结构化导出，V1为INCOMPLETE/exit 2。阶段交付余项、Ubuntu实机、全域恢复及本人验收仍未完成。[a75日志](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a75.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a75.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a75.log.sha256) `80be301eb81ca29855c9777f7c08e64aba5db22d745c0b946fd45e26c3f72482`。
2026-10-12 V1.4-S2-L18语义复核A141：修正§2旧摘要（后续已补固定Fixture费用/滑点/限制/结算，真实Governance/Trade/Portfolio HTTP+PG和9次账本/9次幂等对照），但全适用规则组合、完整Quant/Paper事件账本Parity、所有恢复组合、Ubuntu及当前范围人验仍缺，需求保持OPEN。[A141报告](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a141.md)、[矩阵](../../../evidence/audits/2026-10-12-v1-current-gap-matrix-a141.json)。
2026-10-12 V1.2 §8.3自动Web操作及证据复核A132：`V1.2-S8-L100`限域PASS，五个场景/恢复TestRun截图与Trace均绑定ID，Playwright 1/1与同Run CLI核对通过，完整code suite a02 exit 0；人工结论仍NOT_RUN。[A132](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a132.md)、[§8.64](./02-small-data-and-qlib.md#864-§83-web逐步操作与证据采集复验2026-10-12)。
2026-10-12 V1.2 §8.2操作手册复核A131：隔离栈启动就绪及随机项目精确清理行`V1.2-S8-L85` PASS；用户场景/人工验收NOT_RUN，不代表阶段或V1通过。[A131](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a131.md)、[矩阵](../../../evidence/audits/2026-10-12-v1-current-gap-matrix-a131.json)。
2026-10-12正式V1门禁current-a34（最新）：五阶段文档审计PASS、证据审计PASS（2486引用、429份Manifest、639项）；V1仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`。4个指定历史TestRun结构化导出、阶段完整交付、Ubuntu x86_64实机、全域恢复及当前范围本人验收仍未完成。[a34日志](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a34.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a34.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-current-a34.log.sha256)。
2026-10-12 V1.2 §8.1运行准备语义复核A130：最新隔离栈启停、当前Web/API/CLI E2E和完整V1.2 code suite均通过，37项源输入清单37/37匹配；仅`V1.2-S8-L65`运行手册准备行PASS，用户验收和阶段/V1门禁仍OPEN。[A130](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a130.md)、[A130矩阵](../../../evidence/audits/2026-10-12-v1-current-gap-matrix-a130.json)、[§8.63](./02-small-data-and-qlib.md#863-共享webplatform变更后的当前树隔离e2e复验2026-10-12)、[code suite](../../../evidence/audits/2026-10-12-v12-post-shared-worktree-code-suite-a02.log)。

2026-10-12正式V1门禁a853：五阶段文档审计PASS，证据审计PASS（2188引用/372份Manifest/510项）；25个指定TestRun中21个结构化导出通过，V1.2一项和V1.5三项历史导出仍缺。V1仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`；阶段交付、目标环境/恢复和当前范围人工验收未全部满足。[a853日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a853.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a853.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a853.log.sha256)。

正式V1门禁a852（纳入L16/A50三seed Web/API/CLI证据、A106矩阵及Crosswalk后）：五阶段文档审计PASS；证据审计PASS（2182引用、371份Manifest、509项）；25个指定TestRun中21个结构化导出通过，4个历史原始导出仍缺。V1状态仍为`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`；阶段剩余工程、Ubuntu/全域恢复和人工验收未满足。[a852日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a852.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a852.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a852.log.sha256)。

2026-10-12 P0/P1 A44：Trade→Portfolio五个实际V1调用逐一锁定5秒超时，定向测试6/6、Trade typecheck exit 0，详见[V1.3 §8.93](./03-fake-broker-trading-loop.md#893-trade→portfolio实际v1客户端逐操作超时合同2026-10-12)。只验证传输时限细节，不关闭P1/L14或阶段验收。

2026-10-12正式V1门禁a822：五阶段文档审计PASS；证据审计PASS（2045引用、346份Manifest、522项）；4个指定历史TestRun导出仍缺，V1为INCOMPLETE/exit 2、`uncheckedVersionGate=true`。A43 Platform→Portfolio超时测试通过，但不改变阶段/版本结论。[门禁日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a822.log)、[退出码](../../../evidence/audits/2026-10-12-v1-formal-gate-a822.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a822.log.sha256)。

2026-10-12 P0/P1 A43：Platform→Portfolio六个V1生成客户端操作逐项锁定5秒超时；定向测试4/4、Platform typecheck exit 0，证据见[V1.1 §8.63](./01-environment-and-web-center.md#863-platformportfolio账户客户端逐操作超时合同2026-10-12)。仅关闭L14的一项传输断言，阶段及V1验收仍开放；正式门禁a821尚未纳入本轮文档更新。

2026-10-12正式V1门禁a821：五阶段文档审计PASS；证据审计PASS（2037引用、345份Manifest、521项）；四条指定历史TestRun结构化导出仍缺，V1整体INCOMPLETE/exit 2、`uncheckedVersionGate=true`。V1.2当前树E2E/code suite复跑与Platform→Trade超时合同直接测试通过（§8.53/§8.62），但阶段工程、历史Run导出、Ubuntu/完整恢复及当前范围人工验收未完成。[门禁日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a821.log)、[退出码](../../../evidence/audits/2026-10-12-v1-formal-gate-a821.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a821.log.sha256)。

2026-10-12正式V1门禁a790：五阶段文档审计PASS；证据审计PASS（1851引用、308份Manifest、448项）；四条指定历史TestRun结构化导出仍缺，V1整体INCOMPLETE/exit 2、`uncheckedVersionGate=true`。A32仅复验既有Trade→Portfolio结算客户端合同，V1.1-S2-L14及P1总体保持OPEN；Artifact L20与OD-013仍未关闭。阶段剩余交付、环境恢复及当前范围人工验收未完成。[门禁日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a790.log)、[退出码](../../../evidence/audits/2026-10-12-v1-formal-gate-a790.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a790.log.sha256)。

2026-10-12 P0语义复核A27：V1.1-S8-L211已绑定本轮三条新Run、同Run导出与隔离Portfolio账本证据；所有新增Run人工结论NOT_RUN。增量矩阵[A74](../../../evidence/audits/2026-10-12-v1-current-gap-matrix-a74.json)，复核说明[A27](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a27.md)；其它矩阵行仍未全量复核。

2026-10-12最新正式V1门禁a781：五阶段文档审计PASS；证据审计PASS（1802引用、300份Manifest、440项）；21个验收TestRun中V1.1 15条结构化导出核验通过，V1.2一条及V1.5三条历史Run原始导出仍缺。V1整体`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`；阶段剩余交付、Ubuntu/完整恢复及当前范围本人验收未满足。[a781日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a781.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a781.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a781.log.sha256)。

2026-10-12最新正式V1门禁a780：五阶段文档审计PASS；证据审计PASS（1798引用、299份Manifest、439项）；21个验收TestRun中V1.1 15条结构化导出核验通过，V1.2一条及V1.5三条历史Run原始导出仍缺。V1整体`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`；阶段剩余交付、Ubuntu/完整恢复及当前范围本人验收未满足。[a780日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a780.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a780.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a780.log.sha256)。

2026-10-12最新正式V1门禁a779：五阶段文档审计PASS；证据审计PASS（1794引用、298份Manifest、438项）；21个验收TestRun中V1.1 15条结构化导出核验通过，V1.2一条及V1.5三条历史Run原始导出仍缺。V1整体`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`；阶段剩余交付、Ubuntu/完整恢复及当前范围本人验收未满足。[a779日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a779.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a779.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a779.log.sha256)。

2026-10-12正式V1门禁a778：五阶段文档审计PASS；证据审计PASS（1791引用、297份Manifest、437项）；21个验收TestRun中V1.1 15条结构化导出核验通过，V1.2一条及V1.5三条历史Run原始导出仍缺。整体`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`；阶段剩余工程、Ubuntu/完整恢复及当前范围本人验收未满足。[a778日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a778.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a778.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a778.log.sha256)。

2026-10-11最新正式V1门禁a777：五阶段文档审计PASS；证据审计PASS（1783引用、294份Manifest、434项）；18个验收TestRun中V1.1 12条结构化导出核验通过，V1.2一条与V1.5三条历史Run导出仍缺。版本仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。V1.5当前树NATS/Temporal与Trade恢复隔离E2E 3/3通过（§8.46），不替代Mac睡眠/唤醒、完整V1业务恢复、Ubuntu或人工验收。[a777日志](../../../evidence/audits/2026-10-11-v1-formal-gate-a777.log)、[exit](../../../evidence/audits/2026-10-11-v1-formal-gate-a777.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-formal-gate-a777.log.sha256)。

2026-10-11最新正式V1门禁a737：五阶段文档审计PASS；证据审计PASS（1679引用、272份Manifest、411项）；14个纳入验收表的TestRun已检查，其中V1.1本轮normal/rejection/recovery三个新Run导出均PASS。V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`；V1.1受控完整code suite与Web/API/CLI E2E 3/3通过。四个指定历史Run缺结构化导出，阶段剩余工程、目标环境/恢复及当前范围本人验收仍未满足。[a737日志](../../../evidence/audits/2026-10-11-v1-formal-gate-a737.log)、[退出码](../../../evidence/audits/2026-10-11-v1-formal-gate-a737.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-formal-gate-a737.log.sha256)。

历史正式门禁a680（2026-10-11）：五阶段文档审计PASS；证据审计PASS（1566引用、250份Manifest、389项）；V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。V1.2真实Pending Artifact对取消/发布阶段转换的双顺序行锁竞态通过，包含实际publishPending与Run引用核验；完整V1.2 code suite exit 0；四个历史Run导出、阶段剩余工程、开放决定、目标环境/恢复及本人验收仍开放。[a680日志](../../../evidence/audits/2026-10-11-v1-formal-gate-a680.log)、[SHA-256](../../../evidence/audits/2026-10-11-v1-formal-gate-a680.log.sha256)。

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
| [V1.1](./01-environment-and-web-center.md) | 环境、账户初始化与 Web 验收中心 | 本文件前置条件；详细依赖见阶段文件 | PASS（2026-10-14当前主要功能范围；§8.68–8.69、§8.72–8.75实测与用户当前候选确认；延期项不计PASS） |
| [V1.2](./02-small-data-and-qlib.md) | 小样本数据、真实 Qlib 与环境探针 | V1.1；详细依赖见阶段文件 | PASS（2026-10-14当前主要功能范围；§8.62–8.63、§8.68、§8.70实测与用户当前候选确认；延期项不计PASS） |
| [V1.3](./03-fake-broker-trading-loop.md) | 治理、风控与模拟券商完整交易链路 | V1.2；详细依赖见阶段文件 | PASS（2026-10-14当前主要功能范围；§8.80–8.81、§8.87、§8.91、§8.113–8.118实测与用户当前候选确认；延期项不计PASS） |
| [V1.4](./04-daily-backtest.md) | 日线历史回测与可核对报告 | V1.3；详细依赖见阶段文件 | PASS（2026-10-14当前主要功能范围；§8.104、§8.108、§8.113–8.117实测与用户当前候选确认；延期项不计PASS） |
| [V1.5](./05-scheduling-and-recovery.md) | 无人逐笔操作、故障恢复与 V1 验收 | V1.4；详细依赖见阶段文件 | PASS（2026-10-14当前主要功能范围；§8.43、§8.48、§8.55–8.60实测与用户当前候选确认；延期项不计PASS） |

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

2026-10-11 W8本机只读复核A02：观测宿主为Darwin 25.5.0 arm64；Docker CLI 28.0.4存在，但当前沙箱不能访问Docker Desktop socket（operation not permitted），这不证明Docker Desktop或外部Ubuntu主机整体不可用。未识别/连接目标Ubuntu，未尝试SSH或网络访问，未更改容器/卷/主机；实际Ubuntu验收继续NOT_RUN。[机器结果](../../../evidence/audits/2026-10-11-w8-ubuntu-host-preflight-a02.json)、[审计说明](../../../evidence/audits/2026-10-11-w8-ubuntu-host-preflight-a02.md)。

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

2026-10-11正式门禁a681（纳入V1.1恢复并发领取、Crosswalk A57及当前进度后）：五阶段文档审计PASS；证据审计PASS（1572引用、252份Manifest、391项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。四个历史Run结构化导出、剩余阶段工程、开放决定、活动/目标环境恢复及当前范围用户验收仍未满足。[a681门禁](../../../evidence/audits/2026-10-11-v1-formal-gate-a681.log)、[退出码](../../../evidence/audits/2026-10-11-v1-formal-gate-a681.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-formal-gate-a681.log.sha256)。

2026-10-11 V1.1恢复并发领取继续验证：legacy与stage两种TestRun存储下并发状态条件迁移均为单赢家；ScenarioRunner应用层断言只有一个请求读取Portfolio并写终态。完整隔离回归和当前V1.1 code suite均exit 0，Platform 68文件/328项通过；Crosswalk A58 PASS（147/1875/730/226/147）。见[V1.1 §8.50](./01-environment-and-web-center.md#850-v11-testrun并发恢复领取fencing2026-10-11)、[集成日志](../../../evidence/audits/2026-10-11-v11-concurrent-recovery-claim-a01.log)、[code suite](../../../evidence/audits/2026-10-11-v11-concurrent-recovery-claim-code-suite-a02.log)及[A58](../../../evidence/audits/2026-10-11-v1-crosswalk-current-a58.log)。该工程子项不改变V1.1当前范围人工验收NOT_RUN。

2026-10-11正式门禁a682（纳入V1.1 §8.50并发领取、Crosswalk A58及阶段记录后）：五阶段文档审计PASS；证据审计PASS（1584引用、254份Manifest、393项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。四个历史Run结构化导出、阶段剩余工程/开放决定、活动与目标环境恢复及当前范围人工验收仍未满足。[a682日志](../../../evidence/audits/2026-10-11-v1-formal-gate-a682.log)、[退出码](../../../evidence/audits/2026-10-11-v1-formal-gate-a682.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-formal-gate-a682.log.sha256)。

2026-10-11 Crosswalk A60：将V1.1-S7-L70的并发恢复应用层测试及完整V1.1 code suite证据纳入精确映射；147项要求、1875路径引用、731唯一目标、227精确测试名和147来源锚点全部PASS。该映射仅补充恢复工程子项，不改变阶段/版本人工验收状态。[A60日志](../../../evidence/audits/2026-10-11-v1-crosswalk-current-a60.log)。

2026-10-11正式门禁a683（纳入V1.1恢复并发领取工程、Crosswalk A60及当前阶段文档后）：五阶段文档审计PASS；证据审计PASS（1592引用、255份Manifest、394项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。四个历史TestRun结构化导出、阶段剩余工程/开放决定、活动与目标环境恢复及当前范围人工验收仍未满足。[门禁日志](../../../evidence/audits/2026-10-11-v1-formal-gate-a683.log)、[退出码](../../../evidence/audits/2026-10-11-v1-formal-gate-a683.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v1-formal-gate-a683.log.sha256)。


2026-10-12正式门禁a792：五阶段文档审计PASS；证据审计PASS（1861引用、310份Manifest、450项）；四条指定历史TestRun导出仍缺，V1整体INCOMPLETE/exit 2、`uncheckedVersionGate=true`。V1.3多腿严格现金子项的当前树完整code suite通过，但混合场景Web/API/CLI验收尚未完成。[a791日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a792.log)、[退出码](../../../evidence/audits/2026-10-12-v1-formal-gate-a792.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a792.log.sha256)。

2026-10-12正式门禁a794（V1.3 OD-014混合多腿Web/API/CLI验收、Fixture及阶段/追踪同步后）：五阶段文档审计PASS，证据审计PASS（1865引用、310份Manifest、450项）；`versionSummaryIncomplete=false`、`uncheckedVersionGate=true`，V1仍`INCOMPLETE`/exit 2。4个指定历史Run结构化导出、阶段正式交付、完整存储/业务恢复、Ubuntu实机及当前范围人工验收仍OPEN。[门禁日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a794.log)、[exit](../../../evidence/audits/2026-10-12-v1-formal-gate-a794.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a794.log.sha256)。

正式门禁a795（a794结果同步后复核）：文档结构审计PASS，证据审计PASS（1871引用、311份Manifest、451项）；V1仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。历史运行导出、阶段交付关闭、活动恢复/Ubuntu与本人验收仍未满足。[a795日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a795.log)。

P0 A33（2026-10-12）：OD-014严格已结算现金口径已获所有者批准。V1.3-S2-L13新增固定混合多腿MANUAL/AUTO Web/API/CLI同Run证据及v1.0.4 Fixture映射；MANUAL卖出款保持待收，AUTO BUY不得使用该款。此项不关闭L13/P3或人验，保持OPEN/NOT_RUN。正式门禁a796：文档/证据审计PASS（1875引用、312 Manifest、452条目），V1仍INCOMPLETE/exit 2，四个历史Run导出、阶段关闭、恢复、Ubuntu及本人验收未完成。[A33](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a33.md)、[a796](../../../evidence/audits/2026-10-12-v1-formal-gate-a796.log)。

P0 A34更新V1.3-S2-L15固定事件顺序子项后，正式门禁a800文档/证据审计PASS（1888引用、314 Manifest、454条目）；V1仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`。历史Run导出、阶段工程/交付关闭、恢复/Ubuntu与人工验收继续OPEN。[A34](../../../evidence/audits/2026-10-12-v13-l15-event-sequence-current-tree-a01.md)、[a800](../../../evidence/audits/2026-10-12-v1-formal-gate-a800.log)。

P0 A35/A82：V1.3-S2-L16固定CN响应丢失、乱序Fill/重启及部分Fill/Cancel有映射，仍缺US恢复变体和完整多seed事件矩阵；需求保持PARTIAL/OPEN，不能推断P3或版本通过。[A35](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a35.md)、[A82](../../../evidence/audits/2026-10-12-v1-current-gap-matrix-a82.json)。

正式门禁a801：文档/证据审计PASS（1897引用、315 Manifest、455条目），V1仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`；四个历史导出、阶段交付、恢复/Ubuntu及人工验收未满足。[a801](../../../evidence/audits/2026-10-12-v1-formal-gate-a801.log)。

P0 A36/A83及V1.3 §8.89新增US_EQUITY/AAPL UNKNOWN响应丢失/原单读取故障恢复；完整浏览器矩阵31/31、完整code suite exit 0。L16仍OPEN，US Trade重启/乱序、多seed故障、其他版本/环境与人验仍未闭合。[A04](../../../evidence/audits/2026-10-12-v13-us-l06-unknown-recovery-a04.md)、[A83](../../../evidence/audits/2026-10-12-v1-current-gap-matrix-a83.json)。

正式门禁a802：文档/证据审计PASS（1909引用、316份Manifest、456项），V1仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`；历史导出、阶段收尾、恢复/Ubuntu与本人验收继续未满足。[a802](../../../evidence/audits/2026-10-12-v1-formal-gate-a802.log)。

P0 A38/A84：L16新增US_EQUITY/AAPL AUTO UNKNOWN后Trade Execution重启、原clientOrderId恢复的隔离Web/API/CLI证据，定向1/1；现金USD 9,749.9500、10股、MATCH、同Run CLI及精确资源清理通过。L16/P3仍OPEN，US乱序/重复和多seed完整事件矩阵、Ubuntu及人验仍未满足。[A38](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a38.md)、[A84](../../../evidence/audits/2026-10-12-v1-current-gap-matrix-a84.json)、[E2E](../../../evidence/audits/2026-10-12-v13-us-trade-restart-e2e-a02.log)。

正式门禁a803（纳入A38/A84、US Trade重启恢复及完整V1.3复验）：五阶段文档PASS，证据PASS（1924/318/458），但V1仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`。V1.2一个、V1.5三个指定旧Run无结构化导出，阶段收尾、活动/配对恢复、Ubuntu及本人验收仍OPEN。[日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a803.log)。

正式门禁a804：文档审计PASS（5阶段），证据审计PASS（1928/319/459）；21个指定Run有17个结构化导出通过，V1.2缺1个、V1.5缺3个历史导出。整体仍INCOMPLETE/exit 2，阶段关闭、恢复/Ubuntu与本人验收未满足。[a804](../../../evidence/audits/2026-10-12-v1-formal-gate-a804.log)。

正式门禁a805：五阶段文档审计PASS；21个指定Run中17个结构化导出通过，V1.2一个与V1.5三个历史原始导出仍缺；证据审计PASS（1932/320/460），V1整体INCOMPLETE/exit 2。[a805](../../../evidence/audits/2026-10-12-v1-formal-gate-a805.log)。
2026-10-12正式V1门禁a823：五阶段文档审计PASS，证据审计PASS（2056引用、347份Manifest、523项）；4个指定历史TestRun导出仍缺，V1整体INCOMPLETE/exit 2、`uncheckedVersionGate=true`。A44只补充Trade→Portfolio超时断言，不改变阶段/版本结论。[门禁日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a823.log)、[退出码](../../../evidence/audits/2026-10-12-v1-formal-gate-a823.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a823.log.sha256)。
2026-10-12 P0/P1 A45：Historical Replay→Portfolio两个实际V1调用逐项断言5秒超时，定向测试3/3、Replay worker typecheck exit 0，见[V1.4 §8.97](./04-daily-backtest.md#897-historical-replay→portfolio实际v1客户端逐操作超时合同2026-10-12)。A43/A44/A45仅验证三个调用方的超时预算，不关闭L14/P1或阶段/版本验收。
2026-10-12正式V1门禁a824：五阶段文档审计PASS，证据审计PASS（2067引用、348份Manifest、524项）；四个指定历史Run导出仍缺，V1整体INCOMPLETE/exit 2、`uncheckedVersionGate=true`。A43/A44/A45关闭三个Portfolio客户端调用方的13个方法超时测试子项，不改变版本结论。[门禁日志](../../../evidence/audits/2026-10-12-v1-formal-gate-a824.log)、[退出码](../../../evidence/audits/2026-10-12-v1-formal-gate-a824.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-formal-gate-a824.log.sha256)。

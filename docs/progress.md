2026-10-10 P0消费者映射锚点同步：因在V1.1-S2-L13行追加消费者说明，首次Crosswalk检查发现唯一过期锚点；已把当前原文同步到`2026-10-09-v1-requirement-test-crosswalk.json`并更新[A28矩阵](../evidence/audits/2026-10-10-v1-current-gap-matrix-a28.json)及sourceCrosswalk SHA-256 `737f6a8d57448860d22b3ff3c2a536a8ae81516bdf67c31a37f719a99242bc6b`。复查Crosswalk PASS（147项、1641路径/534目标、166精确测试名、147当前锚点，0失配）。消费者结论仍为PARTIAL，未将锚点修复当作业务合同完成。

2026-10-10 P0/V1.1-S2-L13核心合同消费者人工映射：追踪六类共享schema的实际引用。Money/Security由Portfolio账户领域直接采用；InitializeAccountCommand/AccountSnapshot用于Platform、Portfolio和Replay服务边界；AccountInitializationFixture仅作为V1.1 Fixture schema校验输入。发现ClockContext仅由shared TestRun schema嵌套、V1业务服务无直接导入，Platform V1.1 domain TestRun也未消费共享生成TestRun而使用本地窄类型，须澄清adapter映射；不为追求“全用共享类型”而强行改代码。`pnpm contracts:check`与`pnpm fixtures:check`均exit 0；日志SHA-256分别`784288197300b14b264044e295d4b65fa533d8b2e7b7e1d893dbe35e8b0d5681`、`a1d5bddd7c424238512e94732fae47601f004d8b009b7660ef060904c1a6e9d2`。A27矩阵保留该行PARTIAL，证据与边界均已列出。

正式V1门禁a481（V1.1双架构兼容报告与A26同步后）：阶段文档审计PASS；证据审计PASS（1103引用、148份Manifest、287项）；版本仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。当前双架构证据只覆盖Platform API；真实Ubuntu/全栈、Qlib/RD-Agent、资源压力、历史Run导出、未决决策/旧Run处置、全域恢复和用户验收仍开放。[日志](../evidence/audits/2026-10-10-v1-version-gate-a481.log)，[exit](../evidence/audits/2026-10-10-v1-version-gate-a481.exit.txt)，[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a481.log.sha256)。

2026-10-10 V1.1-S2-L28双架构当前兼容复验：当前工作区Platform API `linux/arm64`原生探针与`linux/amd64` Docker Desktop仿真探针均PASS，容器Node `v24.1.0`。AMD64镜像ID `sha256:b06eefd3f570ebbb330dda363d16962bd35fe5ce5b54c85513937b2288331b52`；报告[AMD64](../evidence/audits/2026-10-10-v11-linux-amd64-compat-a01.json) SHA-256 `47db54fe044ef288d4efa30f8a9207f2305d9fe4543f210f673b276d37380e24`，日志SHA-256 `2776bfa6caefae9e1183f0a49320650fa9033e40c2c28c8b3e72d81cf580498c`。这是Platform API单服务探针；真实Ubuntu、完整V1服务栈、Qlib/RD-Agent镜像与资源压力仍NOT_RUN。阶段/90-test-plan和[A26矩阵](../evidence/audits/2026-10-10-v1-current-gap-matrix-a26.json)已同步。

正式V1门禁a480（V1.1 ARM64当前兼容复验与A25同步后）：阶段文档审计PASS；证据审计PASS（1096引用、148份Manifest、287项）；版本仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。指定历史Run导出、OD-013/014及旧Run处置、全域恢复、真实Mac睡眠/唤醒、完整Ubuntu/服务栈及五阶段人工验收仍未满足。[日志](../evidence/audits/2026-10-10-v1-version-gate-a480.log)，[exit](../evidence/audits/2026-10-10-v1-version-gate-a480.exit.txt)，[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a480.log.sha256)。

2026-10-10 V1.1-S2-L28目标架构兼容复验：受控执行`pnpm verify:compat -- --platform linux/arm64`，当前Platform API镜像Buildx构建和容器内Node `v24.1.0`/arm64探针PASS，host `darwin/arm64`，非仿真；镜像唯一标签`stockquant-compat-platform-api:v1-arm64-a01`，ID `sha256:86ee7dedb2ba579a978e37aeed9aa54086019f7276db9bea8e51af6d606c2e22`。完整报告[JSON](../evidence/audits/2026-10-10-v11-linux-arm64-compat-a01.json) SHA-256 `833c668fabdad12bf62405e52b98cac6405220bb845078c57c97cfb142dce523`，日志[见此](../evidence/audits/2026-10-10-v11-linux-arm64-compat-a01.log) SHA-256 `428bcf22035a4cad94c270f68073087d80462fb007d4738b01f601af77dad5a8`。仅覆盖Platform API；完整V1栈、Qlib/RD-Agent、压力、真实Ubuntu仍未验证。A25矩阵与阶段/测试计划已同步。

正式V1门禁a479（备份契约测试与Stage/测试计划同步后）：五阶段文档审计PASS；证据审计PASS（1090引用、148份Manifest、287项）；版本仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。Mac睡眠/唤醒未执行、历史Run结构化导出、业务决定与旧Run处置、全域活动备份/恢复、Ubuntu和五阶段当前范围人验仍未满足。[日志](../evidence/audits/2026-10-10-v1-version-gate-a479.log)，[exit](../evidence/audits/2026-10-10-v1-version-gate-a479.exit.txt)，[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a479.log.sha256)。

2026-10-10 V1.5-P5备份契约测试复验：配对集群备份/恢复生产器相关定向测试11/11 PASS；证据与SHA见[日志](../evidence/audits/2026-10-10-v1-paired-backup-coverage-a01.log)。阶段第2节新增单独checked代码回归子项，保持全V1备份恢复父项未关闭。

正式V1门禁a478（A23路径候选索引同步后）：阶段文档审计PASS；证据审计PASS（1087引用、148份Manifest、287项）；版本仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。五阶段交付/用户验收、历史Run导出、OD-013/014与旧Run政策、全域恢复、Mac睡眠/唤醒实测和Ubuntu仍开放。[日志](../evidence/audits/2026-10-10-v1-version-gate-a478.log)，[exit](../evidence/audits/2026-10-10-v1-version-gate-a478.exit.txt)，[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a478.log.sha256)。

2026-10-10 P0服务候选路径盘点A23：对147行当前差异矩阵扫描精确测试/证据路径，对此前`NOT_EXPLICIT_IN_SOURCE_INDEX`的122行找到9行明确`services/<service>/`实现/测试路径并标为`CANDIDATES_FROM_LINKED_PATHS`，保留“路径候选≠业务所有权确认”边界；仍有113行没有服务路径候选。V1.1核心Schema行明确显示8个服务生成副本范围不等于业务运行时消费；V1.4回测计算由Quant路径承载、Platform仅参与运行/结果展示。见[A23矩阵](../evidence/audits/2026-10-10-v1-current-gap-matrix-a23.json)，SHA-256 `f0f3969ff2d0250006efeb9b0e6d9e0450acfde5bf20a7a6a2fc297d15e27fe9`。P0仍草稿、未关闭。

正式V1门禁a477（P0 A22服务/测试索引记录后）：五阶段文档审计PASS；证据审计PASS（1086引用、148份Manifest、287项）；V1仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。真实Calendar/时钟/结算、跨阶段追溯、历史Run导出、未决决策、全域恢复、Ubuntu和当前范围用户验收仍未满足。[日志](../evidence/audits/2026-10-10-v1-version-gate-a477.log)，[exit](../evidence/audits/2026-10-10-v1-version-gate-a477.exit.txt)，[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a477.log.sha256)。

2026-10-10 P0差异矩阵服务责任复核A22：对照V1.5-S2-L17/L19当前需求、测试/Fixture证据和Market Data、Platform、Governance、Trade、Portfolio架构，补齐L17当前Fixture时钟/预算/订单/账本各责任边界，并明确真实Calendar服务接入仍开放；L19区分Platform Run/Incident与领域授权、交易和账本数据所有权，跨阶段任意Fill追溯/外发通知仍开放。两行精确测试名去重，保留所有断言引用。见[A22矩阵](../evidence/audits/2026-10-10-v1-current-gap-matrix-a22.json)，SHA-256 `2fbd651ac822542d3f71e69563b9333c9bab01ec675e9e563940567a4e47d3fa`。A22仍为草稿，P0未关闭。

正式V1门禁a476（L20睡眠/唤醒Runbook准备后）：阶段文档审计PASS；证据审计PASS（1085引用、148份Manifest、287项）；版本仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。历史Run导出、OD-013/014与旧Run处置、真实Mac睡眠/唤醒、全域恢复、Ubuntu实机和五阶段当前范围人工验收仍未满足。[门禁日志](../evidence/audits/2026-10-10-v1-version-gate-a476.log)，[exit](../evidence/audits/2026-10-10-v1-version-gate-a476.exit.txt)，[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a476.log.sha256)。

2026-10-10 P0/V1.5-S2-L20运维责任与睡眠演练Runbook补充：对照§2和§8.25及`stack:up/down`实际命令后，明确宿主睡眠/唤醒由operator/host maintainer负责，固定故障Harness和业务服务只负责其隔离故障路径；为已完成NO_TRADE TestRun补充睡眠前后API/Web/容器探针、macOS pmset日志、同一TestRun `--check-only`与结构化导出、退出码及随机项目精确清理步骤。步骤标记为PREPARED_NOT_EXECUTED，不能视为Mac睡眠恢复PASS。更新[A21差异矩阵](../evidence/audits/2026-10-10-v1-current-gap-matrix-a21.json)，SHA-256 `e1353e4891458a18b31d538b7d5cc27829ffc91ff6d8479c3f29c2197ff8fa5e`；L20和P0保持开放。

正式V1门禁a475（P0服务责任映射A20及记录同步后）：阶段文档审计PASS；证据审计PASS（1084引用、148份Manifest、287项）；版本仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。历史Run结构化导出、OD-013/014及旧Run处置、全域恢复、Ubuntu和五阶段人工验收仍未满足。[日志](../evidence/audits/2026-10-10-v1-version-gate-a475.log)，[exit](../evidence/audits/2026-10-10-v1-version-gate-a475.exit.txt)，[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a475.log.sha256)。

2026-10-10 P0差异矩阵服务责任人工核对：V1.5-S2-L18按阶段第2节/§8.12、8.13、8.18、8.30、8.31及四个服务架构文件逐项复核，确认Platform负责编排/暂停命令转发，Governance拥有Mandate/授权，Trade拥有FakeBroker订单及UNKNOWN原单查询，Portfolio拥有预留/Fill账本；NATS/Temporal标注为基础设施边界。更新[A20矩阵](../evidence/audits/2026-10-10-v1-current-gap-matrix-a20.json)，SHA-256 `12be0f55abf6cf22edf8799468975aeccdd4bc59768efd7e42ee998f5b1f0568`。本需求仍为部分覆盖：真实时钟、结算及其他恢复组合未验证；P0矩阵整体仍草稿。

正式V1门禁a474（P0矩阵A19锚点增量后）：五阶段文档审计PASS；证据审计PASS（1083引用、148份Manifest、287项）；版本仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。指定历史Run导出、业务决策/旧Run处置、全域恢复、Ubuntu与五阶段当前范围人工验收仍未满足。[门禁日志](../evidence/audits/2026-10-10-v1-version-gate-a474.log)，[exit](../evidence/audits/2026-10-10-v1-version-gate-a474.exit.txt)，[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a474.log.sha256)。

2026-10-10 P0差异矩阵锚点复核：检查V1.5-S2-L18的当前第2节及§8.31后，修正A18中缺失的来源人工核对标记，生成[A19矩阵](../evidence/audits/2026-10-10-v1-current-gap-matrix-a19.json)，SHA-256 `faba1b7e1e1b0d97341141d14d7c5d63f194d0b0f06cebc3dbcbee2a17c883d3`。147项crosswalk结构检查PASS（1641路径引用/534目标、166精确测试名、147个当前锚点）；矩阵仍为`DRAFT_DERIVED_REQUIRES_MANUAL_RECONCILIATION`，其余服务责任、Fixture归属和语义充分性仍需逐项核查。

正式V1门禁a473（V1.2 PostgreSQL共享恢复兼容记录同步后）：五阶段文档审计PASS；证据审计PASS（1082引用、148份Manifest、287项）；整体仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。四个指定历史Run结构化导出缺失；旧Run处置、OD-013/014、全域恢复、Ubuntu实机及五阶段当前范围人工验收仍开放。[门禁日志](../evidence/audits/2026-10-10-v1-version-gate-a473.log)，[exit](../evidence/audits/2026-10-10-v1-version-gate-a473.exit.txt)，[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a473.log.sha256)。

2026-10-10 V1.2 PostgreSQL共享恢复兼容回归：在V1.5修复Decision Governance idle Pool client error退出问题后，受控完整`pnpm verify:stage -- --stage V1.2 --suite code`退出0；隔离Web/API/CLI normal/rejection/recovery-probe及取消/Platform重启恢复均通过，Qlib 0.9.6与PostgreSQL集成验证通过，4个TestRun为`8a1d4439-a280-4c08-8c44-228fbf072622`、`5aebf4be-ed04-4754-89d8-9b5f916e4061`、`a2a7750e-2b2e-4c10-97be-a2846b1d84d1`、`d9ba8973-fb1e-4f80-bdcc-ba47b122e51e`；隔离项目及卷/网络清理核验通过。首轮loopback EPERM与镜像拉取EOF均保留；真实源/券商调用0。[完整日志](../evidence/audits/2026-10-10-v12-post-governance-pg-resilience-code-suite-a03.log)，SHA-256 `c28333183c70661b7f886c2d393f0c1d7d2f42a4acfaa7aa990526e64f9130bd`。该回归不代替V1.2正式阶段验收、历史Run结构化导出或用户验收。

2026-10-10 正式V1门禁a472（加入V1.3兼容复验记录后）：五阶段文档审计PASS、证据审计PASS（1079引用、148份Manifest、287项、0失败）；版本仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。四个历史TestRun结构化导出缺失，OD-013/014与旧Run处置、全域恢复、Ubuntu实机及五阶段新增范围用户验收仍未满足。[a472日志](../evidence/audits/2026-10-10-v1-version-gate-a472.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a472.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a472.log.sha256)。

2026-10-10 Decision Governance PostgreSQL错误监听变更的V1.3兼容回归：完整V1.3代码套件受控a02 exit 0，隔离CN/US Web/API/CLI/export E2E 27/27通过，包含Governance授权、Trade重启/原单恢复、拒绝与T+1固定场景；容器/卷/网络精确清理，真实来源/券商调用0。首轮代码套件a01仅因localhost EPERM失败并保留。[代码日志](../evidence/audits/2026-10-10-v13-post-governance-pg-resilience-code-suite-a02.log)，SHA-256 `8a281ba4a37dcadbd9257d98eb1ddb3679e993811b4b726053ac27e977e733f4`；[E2E日志](../evidence/audits/2026-10-10-v13-post-governance-pg-resilience-web-e2e-a01.log)，SHA-256 `6e33112fa0d4e873f71fe783b035e3e76d2ad89d9ade4aa61d787e59a8f06434`。这是共享Governance改动的兼容证据，不关闭V1.3阶段或用户验收。

2026-10-10 正式V1门禁a471（V1.5 §8.31、验收、测试计划、crosswalk/A18与计划同步后）：阶段文档审计PASS（5阶段），证据审计PASS（1079引用、148份Manifest、287项、0失败）；整体仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。4个历史TestRun结构化导出缺失，OD-013/014及旧Run处置、全域恢复、Ubuntu实机和五阶段当前范围人工验收仍未满足。[a471日志](../evidence/audits/2026-10-10-v1-version-gate-a471.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a471.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a471.log.sha256)。

2026-10-10 P5/V1.5双Trade+PostgreSQL固定组合故障恢复通过：根因是Decision Governance的idle PostgreSQL Pool client error未处理，服务进程随数据库中断退出。加入安全error观察日志后，隔离E2E a04 exit 0、Playwright 3/3；在PG恢复后Platform探测确认Governance/Portfolio就绪，Trade恢复后Temporal按相同clientOrderId读回原单，随机容器/卷/网络清理通过，真实源/券商调用0。[机器报告](../evidence/audits/2026-10-10-v15-trade-database-combined-failure-sq-v15-e2e-d3d07879c69cbbf93168.json)、[E2E日志](../evidence/audits/2026-10-10-v15-trade-database-combined-e2e-a04.log)；完整V1.5 code suite受控a02 exit 0（[日志](../evidence/audits/2026-10-10-v15-trade-database-combined-code-suite-a02.log)）。首轮loopback EPERM与根因定位失败a01–a03全部保留。阶段§8.31、开发/交付子项、测试计划、验收记录和crosswalk已同步。crosswalk a22 PASS：147项、1641引用/534目标、166精确测试名、147锚点；当前差异矩阵A18只更新受影响P5条目，仍为待人工复核草稿。该固定子项通过不关闭P5/V1。

2026-10-10 正式V1门禁a469（补充§8.31 Platform重试日志诊断后）：阶段文档审计PASS（5阶段），证据审计PASS（1079引用、148份Manifest、287项、0失败）；版本仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。4个指定历史TestRun导出、OD-013/014及旧Run处置、全域恢复、Ubuntu和当前范围人验仍未完成。[a469日志](../evidence/audits/2026-10-10-v1-version-gate-a469.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a469.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a469.log.sha256)。

2026-10-10 正式V1门禁a468（新增§8.31未通过组合故障记录及计划记录后复核）：阶段文档审计PASS（5阶段），证据审计PASS（1079引用、148份Manifest、287项、0失败）；整体仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。四个历史TestRun结构化导出缺失，OD-013/014、旧Run处置、全域恢复、Ubuntu和人工验收仍未满足。[a468日志](../evidence/audits/2026-10-10-v1-version-gate-a468.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a468.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a468.log.sha256)。

2026-10-10 P5/V1.5多故障组合验证未通过：新增隔离模式在FakeBroker提交后确实终止两台Trade实例及同一PostgreSQL容器，确认三者Exited，再恢复同一PG容器/卷及一台Trade实例；但Playwright自动交易Run最终FAILED，Temporal未按原clientOrderId完成读回，故不记PASS、不勾阶段交付。第一次尝试因提交边界等待配置为0ms、未生成目标标记；第二次已修正等待窗口，浏览器2/3通过，核心工作流失败。报告[JSON](../evidence/audits/2026-10-10-v15-trade-database-combined-failure-sq-v15-e2e-21599a0792cb837e9cfa.json)，运行日志[a02](../evidence/audits/2026-10-10-v15-trade-database-combined-e2e-a02.log)，exit 1；随机Compose容器、卷、网络均已精确移除，真实数据源/券商调用0。组合恢复根因仍需诊断。

2026-10-10 正式V1门禁a467：最新正式检查仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`；阶段文档审计PASS（5阶段），证据审计PASS（1076引用、148份Manifest、287项、0失败）。4个指定历史Run导出缺失；OD-013/014、旧Run处置、全域恢复、Ubuntu和人工验收仍阻止V1关闭。[a467日志](../evidence/audits/2026-10-10-v1-version-gate-a467.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a467.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a467.log.sha256)。

2026-10-10 P0/P5-V1.5-S2-L20差异复核：A15把“Trade Worker订单/Fill提交后故障未验证”列为剩余项，与阶段§8.18和隔离报告冲突。已核实FakeBroker提交/Fill持久化后杀停Trade主实例、备用实例通过Temporal重试按相同clientOrderId读原单，四笔AUTO订单/Fill、预算和双账本MATCH由Web E2E断言；四场景及同Run CLI/export通过。交叉索引a20检查147项、1632路径引用/527目标、165精确测试名、147锚点PASS；A16更正为此原子项已验证、P5父项仍开放。Mac睡眠/唤醒真实观察、多故障组合、操作者演练与当前范围用户验收仍未验证。见[差异矩阵A16](../evidence/audits/2026-10-10-v1-current-gap-matrix-a16.json)、[阶段§8.18报告](../evidence/audits/2026-10-09-v15-trade-worker-failover-sq-v15-e2e-75b262d7e2b9d8fa1806.json)、[crosswalk a20](../evidence/audits/2026-10-10-v1-crosswalk-check-a20.log)。

2026-10-10 正式V1门禁a458：V1.1公共核心Schema字段及8服务类型副本回归、阶段/验收/追踪同步后复核；五阶段文档审计PASS，证据审计PASS（1068引用、148份Manifest、287项、0失败）；V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。历史TestRun导出仍缺V1.2 `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`及V1.5 `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`；OD-013/014与旧Run政策、全域恢复、Ubuntu及新增范围人工验收仍未满足。[a458日志](../evidence/audits/2026-10-10-v1-version-gate-a458.log)，[exit code](../evidence/audits/2026-10-10-v1-version-gate-a458.exit.txt)，[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a458.log.sha256)。

2026-10-10 P1/V1.1核心合同副本回归：六类共享核心Schema字段及required性现同时核对公共TS/Python类型和8个服务生成类型副本；定向测试3/3、`pnpm contracts:check` 12/12及完整V1.1 code suite exit 0。a01沙箱loopback EPERM失败保留，受控a02 SHA-256 `719006df439ebf23d8f38a209782869ed8f171a5f8a95376abb474cd602ddceb`通过。crosswalk a18检查147项、1625路径引用/525目标、164精确测试名、147锚点，均无缺失；差异矩阵A15仍将业务消费映射列为OPEN，未关闭P1或V1。[阶段§8.25](prd/v1-local-simulation/01-environment-and-web-center.md#825-核心公共schema服务类型副本字段回归2026-10-10)、[代码套件日志](../evidence/audits/2026-10-10-v11-core-service-schema-code-suite-a02.log)、[crosswalk日志](../evidence/audits/2026-10-10-v1-crosswalk-check-a18.log)。

2026-10-10 V1.4当前工作树Web/API/CLI回归：FakeBroker原子资产账本与资金不足恢复改动后，`pnpm test:e2e -- --stage V1.4` exit 0；Playwright 5/5、API及8个浏览器TestRun由同Run CLI `--check-only`核验，随机容器/卷/网络移除并核实。日志[见此](../evidence/audits/2026-10-10-v14-paper-http-parity-web-e2e-a01.log)，SHA-256 `6d05ea27f03d1916027c0c19b5fe7ed6cf23f77b18ab3e5d1e813e217b14e332`。只作为当前V1.4 Web兼容性回归证据，不覆盖Trade现金不足路径本身，也不关闭P4/人工验收。

2026-10-10 正式V1门禁a456：纳入V1.4 a13资产账本code suite、当前Web/API/CLI E2E、V1.4验收表与crosswalk/A14差异矩阵后复核；五阶段文档审计PASS，证据审计PASS（1063引用、148份Manifest、287项、0失败）；V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。指定历史Run结构化导出、OD-013/OD-014及旧Run决定、完整恢复、Ubuntu和新增范围用户验收仍未满足。[a456日志](../evidence/audits/2026-10-10-v1-version-gate-a456.log)、[exit code](../evidence/audits/2026-10-10-v1-version-gate-a456.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a456.log.sha256)。

2026-10-10 正式V1门禁a454：V1.4现金不足拒绝/新授权恢复场景、阶段/计划/追踪和A11差异矩阵同步后复核；五阶段文档审计PASS，证据审计PASS（1057引用、147份Manifest、286项、0失败），V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。历史TestRun导出、用户对OD-014/OD-013及旧Run政策的确认、完整恢复与目标Ubuntu/当前范围人工验收依然未满足。[a454日志](../evidence/audits/2026-10-10-v1-version-gate-a454.log)、[exit code](../evidence/audits/2026-10-10-v1-version-gate-a454.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a454.log.sha256)。

2026-10-10 V1.4 P4 FakeBroker资产不足拒绝/恢复：真实Governance/Trade/Portfolio HTTP和隔离PostgreSQL验证命令Hash绑定的零现金种子返回422，订单/Fill/Outbox/资产/资产事件0副作用；新授权、正确现金种子重试后仅落库1/1/1/1，重复命令幂等。完整V1.4 code suite a13 exit 0。详见[§8.28](prd/v1-local-simulation/04-daily-backtest.md#828-v14-fakebroker现金不足拒绝与授权恢复2026-10-10)与[a13日志](../evidence/audits/2026-10-10-v14-paper-http-parity-code-suite-a13.log)。V1.4-S2-L15追踪及差异矩阵A11已更新；crosswalk a12 PASS（147项、1608引用/508目标、163精确测试名、147锚点）。SELL结算与OD-014、完整适用市场规则、阶段人工/环境验收仍开放。

2026-10-10 正式V1门禁a453：V1.4独立FakeBroker资产账本原子记账/重试证据及追踪同步后复核。五阶段文档审计PASS；证据审计PASS（1056引用、147份Manifest、286项、0失败）；版本仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。仍有四个指定历史TestRun结构化导出缺失、V1.2及V1.5历史导出未完成、五阶段新增范围人工验收、OD-013/OD-014及旧Run决定、全域恢复/Ubuntu交付门槛未满足。[a453日志](../evidence/audits/2026-10-10-v1-version-gate-a453.log)、[exit code](../evidence/audits/2026-10-10-v1-version-gate-a453.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a453.log.sha256)。

2026-10-10 V1.4 P4 FakeBroker独立资产账本增量：历史执行命令绑定初始现金，订单事务同时提交独立现金、持仓与资产事件；Trade持久化和服务身份SELL场景显式提供固定开仓持仓。真实Governance/Trade/Portfolio HTTP及三套隔离PostgreSQL中，九个成交快照及九次同命令幂等重试全部通过；完整V1.4 code suite a12 exit 0。详见[阶段§8.27](prd/v1-local-simulation/04-daily-backtest.md#827-v14-fakebroker独立资产账本原子记账与重试2026-10-10)、[套件日志](../evidence/audits/2026-10-10-v14-paper-http-parity-code-suite-a12.log)、[SHA-256](../evidence/audits/2026-10-10-v14-paper-http-parity-code-suite-a12.log.sha256)。crosswalk 147项/1605路径引用/505目标/163测试名/147锚点PASS；A10差异矩阵已派生。FakeBroker资产原子性子项完成不代表Portfolio SELL应收/结算、OD-014、完整市场规则或P4/V1验收完成。

2026-10-10 V1.4 P3拒绝路径增量：真实三服务隔离HTTP/PG Harness新增错误Governance签发身份403且零授权行、篡改命令Hash 403且授权保持ACTIVE、无匹配授权的Trade执行403且无FakeBroker订单；之后合法请求仍成功。完整V1.4 code suite exit 0，日志[见此](../evidence/audits/2026-10-10-v14-paper-http-parity-code-suite-a06.log)，exit记录与SHA sidecar齐备；阶段§8.26已同步。此项只关闭固定授权/执行拒绝子路径，P3全路由矩阵与P4结算/OD-014、完整规则、阶段交付、Ubuntu和人工验收仍OPEN。

2026-10-10正式V1门禁a450：阶段文档审计PASS，证据审计PASS（1054条引用、146份Manifest、285项、0失败）；V1仍INCOMPLETE、exit 2，`uncheckedVersionGate=true`。四个指定历史TestRun结构化导出、阶段工程/交付及新增范围用户验收、OD-013/OD-014与旧Run决定、完整恢复及Ubuntu证据仍未满足。[a450日志](../evidence/audits/2026-10-10-v1-version-gate-a450.log)、[exit code](../evidence/audits/2026-10-10-v1-version-gate-a450.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a450.log.sha256)。

2026-10-10 V1正式门禁a444：V1.4九个执行日的Quant现金/持仓与真实Portfolio快照逐日精确对照、阶段追踪及交叉映射同步后复核；五阶段文档审计PASS，证据审计PASS（1051引用、145份Manifest、284项），V1仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`。四个指定历史TestRun结构化导出、五阶段剩余工程/交付和新增范围人工验收、OD-013/OD-014及旧Run决策、全域配对恢复和Ubuntu实机证据仍开放。[a444门禁日志](../evidence/audits/2026-10-10-v1-version-gate-a444.log)，[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a444.log.sha256)。

2026-10-10 V1.4 P4精确日账本对照：三服务真实HTTP/PG Harness现对9个执行日逐日独立比较Quant settled cash + unsettled SELL proceeds与Portfolio快照现金（逐分），并逐股比较持仓，9/9通过；另有五个BUY账本条目/绑定断言及9笔真实Governance授权消费。完整V1.4 code suite exit 0（a05），定向Harness exit 0（a04）；[套件日志](../evidence/audits/2026-10-10-v14-paper-http-parity-code-suite-a05.log)。边界：金额对齐不证明SELL可用性、应收分类或结算时点一致；OD-014及P4父项OPEN。阶段§8.25与交叉矩阵A08已同步。

2026-10-10 V1正式门禁a442：真实Decision Governance→Trade→Portfolio HTTP/独立PostgreSQL授权与账本链路加入阶段记录后复核，五阶段文档审计PASS，证据审计PASS（1049引用、145份Manifest、284项），V1仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`。缺口仍包括4个指定历史TestRun结构化导出、五阶段剩余工程/正式交付与新增范围人工验收、OD-013/OD-014及旧Run决定、活动/全域配对恢复和Ubuntu实机证据。[a442日志](../evidence/audits/2026-10-10-v1-version-gate-a442.log)，[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a442.log.sha256)。

2026-10-10 V1.4 P4真实Governance→Trade→Portfolio链路：新增独立decision_governance_test数据库并启动真实Governance HTTP；9笔固定CN/US下单均获一笔命令Hash绑定的BACKTEST/FAKE Replay授权，Trade逐笔消费，最终授权状态CONSUMED；Trade/FakeBroker/Portfolio HTTP订单成交、Outbox与五个BUY账本对照通过。三服务Harness exit 0，完整V1.4 code suite exit 0；[Harness](../evidence/audits/2026-10-10-v14-paper-http-parity-a03.log)、[完整套件](../evidence/audits/2026-10-10-v14-paper-http-parity-code-suite-a04.log)。suite a03初次因命令计划断言未同步而失败，失败保留；修复后a04通过。SELL结算/OD-014、完整市场规则与人工验收仍未满足。交叉矩阵A07及阶段§8.24已更新。

2026-10-10 V1正式门禁a439：V1.4真实Trade→Portfolio HTTP/独立PostgreSQL固定费率链路、文档追踪与交叉映射同步后复验；阶段文档审计PASS，证据审计PASS（1045引用、145份Manifest、284项），但V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。4个历史TestRun结构化导出、各阶段剩余交付与人工签收、OD-014/旧Run决定、全域恢复和Ubuntu实机证据仍开放。[a439日志](../evidence/audits/2026-10-10-v1-version-gate-a439.log)，[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a439.log.sha256)。

2026-10-10 V1.4 P4 HTTP链路增量：真实Trade Execution与Portfolio Risk HTTP服务连接相互独立的随机PostgreSQL；固定CN/US费率BUY/SELL、历史费率及部分Fill路径通过，核对10订单、9 Fill/Outbox、9次测试授权校验及五个BUY Portfolio现金/持仓/账本。隔离Harness和完整V1.4 code suite均exit 0；HTTP日志SHA-256 `7b4094a4d8fa55913c5a3d3de3063e300ed8af642d5b38733c6a73cf8915c7e1`，套件SHA-256 `dadf68b1e1511cf386fd3f47a843e4163f07724c5d2b3459b528c842c1b2da7f`。新增严格HTTP schema字段`marketFeeSchedule`并通过207个契约生成/检查。限制：Governance为有界测试桩，SELL应收/结算与OD-014、完整市场规则及人工验收未通过；阶段/V1保持OPEN。详见[V1.4 §8.23](prd/v1-local-simulation/04-daily-backtest.md#823-tradeportfolio-http历史费率与fill账本切片2026-10-10)。

2026-10-10 P0/P4追踪增量：V1.4九条Fill Outbox载荷逐字段保真和五个固定CN/US BUY独立Portfolio现金/持仓/账本核对证据均已关联至`V1.4-S2-L15`；当前差异矩阵A04记录两个原子覆盖通过，同时保留该需求OPEN及Portfolio HTTP/reservation、SELL结算、OD-014与完整市场规则缺口。独立PostgreSQL隔离Harness和完整V1.4 code suite均exit 0，日志见[code suite](../evidence/audits/2026-10-10-v14-portfolio-buy-ledger-parity-code-suite-a01.log)。交叉表检查147项、1581路径引用/481目标、162精确测试名和147来源锚点通过。[矩阵A04](../evidence/audits/2026-10-10-v1-current-gap-matrix-a04.json)。

2026-10-10 正式V1门禁a433：V1.4持久Fill Outbox九条CN/US载荷逐字段与FakeBroker Fill核对及完整code suite exit 0后复核；文档审计PASS，证据审计PASS（1036引用、144份Manifest、283项、0失败），V1仍INCOMPLETE/exit 2。4个历史TestRun结构化导出及P1～P6工程、决定、环境和当前范围人工验收条件仍开放。[a433日志](../evidence/audits/2026-10-10-v1-version-gate-a433.log)，[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a433.log.sha256)。
2026-10-10 正式V1门禁a432：同步P0差异矩阵A02和V1.3客户端超时验证后复核，五阶段文档审计PASS、证据审计PASS（1034引用、144份Manifest、283项、0失败）；V1仍INCOMPLETE/exit 2。[a432日志](../evidence/audits/2026-10-10-v1-version-gate-a432.log)，[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a432.log.sha256)。

2026-10-10 V1.3 AUTO Mandate客户端超时契约增强：Platform五项、Trade两项客户端逐操作断言默认5000ms及自定义超时；定向Platform 2/2、Trade 1/1及完整V1.3 code suite exit 0；随机隔离PostgreSQL迁移/身份检查通过并清理。日志[完整套件](../evidence/audits/2026-10-10-v13-auto-client-timeout-contract-code-suite-a01.log)、[SHA-256](../evidence/audits/2026-10-10-v13-auto-client-timeout-contract-code-suite-a01.log.sha256)。这是客户端契约子项，不关闭SELL结算、V1.3父项或V1整体。

2026-10-10 P0差异矩阵A02：从147条需求矩阵A01派生当前快照并同步V1.3-S2-L13新增Platform/Trade客户端契约测试和完整套件证据；该项仍OPEN，SELL结算、宽授权/市场规则、全阶段验收仍属差距。[矩阵A02](../evidence/audits/2026-10-10-v1-current-gap-matrix-a02.json)，[SHA-256](../evidence/audits/2026-10-10-v1-current-gap-matrix-a02.json.sha256)。该增量不声称完成147项逐项语义人工核对。

2026-10-10 正式V1门禁a427：进度与当前计划同步后复核，五阶段文档审计PASS、证据审计PASS（1033引用、144份Manifest、283项、0失败）；V1仍INCOMPLETE/exit 2。四个历史TestRun结构化导出缺失、阶段交付与本轮人工验收、未决决定/旧Run处置、全V1配对恢复及Ubuntu证据未满足。[a427日志](../evidence/audits/2026-10-10-v1-version-gate-a427.log)，[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a427.log.sha256)。

2026-10-10 正式V1门禁a426：V1.3 AUTO Mandate生成客户端契约补测及文档映射后复核，五阶段文档审计PASS、证据审计PASS（1033引用、144份Manifest、283项、0失败）；V1仍INCOMPLETE/exit 2。四个历史TestRun结构化导出缺失、阶段交付与本轮人工验收、未决决定/旧Run处置、全V1配对恢复及Ubuntu证据未满足。[a426日志](../evidence/audits/2026-10-10-v1-version-gate-a426.log)，[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a426.log.sha256)。

2026-10-10 V1.3 AUTO Mandate客户端契约测试增量：Platform 5项、Trade 2项直接契约单测通过；typecheck/build通过，完整V1.3 code suite exit 0。证据见[套件日志](../evidence/audits/2026-10-10-v13-auto-client-contract-code-suite-a01.log)及[SHA-256](../evidence/audits/2026-10-10-v13-auto-client-contract-code-suite-a01.log.sha256)；阶段§8.65、测试计划与A05调用矩阵已同步。该补测不关闭SELL结算、V1.3父级或V1整体。

2026-10-09 正式V1门禁a226：V1.2 Artifact owner/TestRun边界新增隔离集成和完整套件复验后重跑。阶段文档审计PASS；证据审计PASS（624引用、69份Manifest、208项、0失败）；V1仍INCOMPLETE/exit 2。四个历史Run结构化导出、五阶段工程/交付/人工验收、OD-014及OD-013决定、活动存储迁移处置、全V1配对恢复和目标Ubuntu证据仍未满足。[a226日志](../evidence/audits/2026-10-09-v1-version-gate-a226.log)，SHA-256 `e4240bfe297677957f4fb1e16a088c0465ebd919dbe15d1db89da79ff010829f`。

2026-10-09 P1/V1.2 Qlib Artifact访问scope增量：隔离PostgreSQL新增owner/TestRun错误读取拒绝、生命周期scope拒绝及无隐式`expiresAt`断言；同Run幂等、相同不可变内容跨Run分别绑定、取消/发布fencing和运行锁恢复通过。定向`test:v12-run-lifecycle` 3/3通过；完整`pnpm verify:stage -- --stage V1.2 --suite code` exit 0，Qlib容器E2E正常/拒绝/恢复场景通过，资源清理核验通过。[完整套件日志](../evidence/audits/2026-10-09-v12-artifact-scope-code-suite-a01.log)，SHA-256 `9b80a38eb48c9f460fc4ae96e37b88f627163f1bfcb7522649fb9d035eeead4c`。该子项不代表OD-013策略、全域Artifact Producer或活动卷切换/回退已完成。

2026-10-09 V1正式门禁a225：在V1.3授权scope拒绝加固及完整代码套件通过后复核。阶段文档审计PASS；证据审计PASS（623引用、69份Manifest、208项、0失败）；版本整体仍INCOMPLETE/exit 2。[门禁日志](../evidence/audits/2026-10-09-v1-version-gate-a225.log)，SHA-256 `c4c832fda05ad7c8ba86cb9984916720994912a50855bfa2d22545fc40fe6f07`。四个历史Run导出、五阶段剩余交付/人工验收、OD-014结算规则、活动迁移处置、全域配对恢复及目标Ubuntu证据仍未完成。

2026-10-09 V1.3 Proposal授权范围拒绝加固：隔离HTTP+PG对approved Proposal尝试错误owner、TestRun或account的grant均403且0行副作用；正确scope签发、命令哈希篡改拒绝、并发消费/幂等重放及DB精确绑定均通过。`pnpm test:service-auth:http` exit 0，随后完整V1.3 code suite exit 0，所有隔离资源清理通过。[HTTP+PG日志](../evidence/audits/2026-10-09-v13-proposal-auth-http-pg-a03.log)，SHA-256 `145e9f69f345561bc468306054ec2c7afc59e357afe3ee795406bcd190e14cea`；[完整套件](../evidence/audits/2026-10-09-v13-code-suite-a225.log)，SHA-256 `a98d65c8c85ed7c6512888839d3717a5e9252f0c73621fa75298ce51b73829c6`。V1.3完整Stage E2E已有同Run FakeBroker/账本/CLI证据（§8.0/8.23/8.29）；本轮加固不改变人工验收NOT_RUN和阶段PARTIALLY_IMPLEMENTED。

2026-10-09 V1正式门禁a224：收录V1.3治理授权有效Proposal grant/consume HTTP+PG路径和改后完整code suite报告后复验。阶段文档与证据审计PASS（623引用、69份Manifest、208项、0失败），V1仍INCOMPLETE/exit 2。四个历史Run导出、五阶段剩余交付/人工验收、OD-014结算规则、活动迁移处置、全域恢复及目标Ubuntu证据仍未完成。[a224门禁](../evidence/audits/2026-10-09-v1-version-gate-a224.log)，SHA-256 `c4c832fda05ad7c8ba86cb9984916720994912a50855bfa2d22545fc40fe6f07`。

2026-10-09 V1.3 Governance Proposal授权成功链：在隔离HTTP+PostgreSQL中通过平台创建并批准PAPER/FAKE Proposal、Trade获取绑定scope的ACTIVE grant；篡改commandHash返回403；并发准确校验恰有一次首次消费、一次幂等重放，DB中唯一grant为正确scope的CONSUMED。`pnpm test:service-auth:http` exit 0；其后完整`pnpm verify:stage -- --stage V1.3 --suite code` exit 0，锁定Python Worker 14/14，隔离容器/网络清理通过。[HTTP+PG日志](../evidence/audits/2026-10-09-v13-proposal-auth-http-pg-a02.log)，SHA-256 `69ecdb5332c8b167c8eab777d45e63adbb866255b482f14bfde93832447efefc`；[完整V1.3代码套件](../evidence/audits/2026-10-09-v13-code-suite-a224.log)，SHA-256 `72e0921dfc29ae8c33d9ab196ce102bbdaac3acf22ea4c9459a811beaaa797b6`。此为Governance层成功路径证据，不等于Trade→FakeBroker→Portfolio同Run完整交易验收。

2026-10-09 V1正式门禁a223：在本轮新增治理授权入口和V1.3完整code suite报告后再次执行。阶段文档审计PASS；证据审计PASS（623个引用、69份Manifest、208项、0失败）；整体仍INCOMPLETE/exit 2。缺口仍包括四个历史TestRun结构化导出、五阶段剩余交付与人工验收、OD-014/结算、活动迁移处置、跨域恢复及目标Ubuntu证据。[门禁日志](../evidence/audits/2026-10-09-v1-version-gate-a223.log)，SHA-256 `c4c832fda05ad7c8ba86cb9984916720994912a50855bfa2d22545fc40fe6f07`。

2026-10-09 V1.3完整代码套件复验及正式门禁a222：锁定Python Worker镜像就绪后，`pnpm verify:stage -- --stage V1.3 --suite code` exit 0，含14/14 Python Worker、69/69 Market Data Python adapter、隔离PostgreSQL服务集成、FakeBroker恢复、契约/迁移及本轮Governance身份边界；本轮隔离资源清理已核验。[套件报告](../evidence/audits/2026-10-09-v13-code-suite-a222.log)，SHA-256 `4b096db94b78777427be57ca77f115a9f19778b46656c448ad6dad3b4aa8f7e4`。正式`pnpm verify:version -- --version V1`仍INCOMPLETE/exit 2：阶段文档与证据审计PASS（621引用、69份Manifest、208项），但四个历史TestRun结构化导出缺失、五阶段交付/用户验收、OD-014结算决定、活动存储迁移处置、完整恢复和目标Ubuntu证据未完成。[门禁日志](../evidence/audits/2026-10-09-v1-version-gate-a222.log)，SHA-256 `c1d86a1406f1327fe5f309d36a86963c85980dd531959948f6a486b90e01da66`。

2026-10-09 V1.3 Governance授权入口增量：隔离PostgreSQL HTTP smoke覆盖Proposal授权create/validate两条实际路由；Platform调用方403、Trade调用方配错Bearer 403、正确Trade身份畸形请求422，且授权表0行；`pnpm test:service-auth:http` exit 0，临时数据库/容器/网络清理核验通过。[日志](../evidence/audits/2026-10-09-v13-proposal-auth-http-boundary-a01.log)，SHA-256 `084a1481c424c95b0f72ef531053d00d60242ba287a502939f89f408d7f4c2f6`。本项只证明身份边界和拒绝无副作用，不证明有效Proposal授权到FakeBroker的成功全链，V1.3与V1总验收继续OPEN。

# 当前进度与执行入口

2026-10-09 P1活动容器只读核对发现配置漂移：`stockquant-v12` Platform API容器仍运行legacy TestRun存储且无Volume mounts；PostgreSQL与Research Automation分别挂载现有数据库/Artifact卷。当前仓库Compose为Platform也声明该Artifact卷，因运行实例没有挂载而不能据源码推断Artifact已持久化。只读日志、镜像/卷身份、Hash与未读取数据的边界见[审计A01](../evidence/audits/2026-10-09-v1-active-container-inventory-a01.md)；未更改任何容器/数据库/卷。同日只读查询活动DB：legacy 59条（3条RUNNING/WAITING非终态）、V1.1 stage 44条、stage全表288条（12条非终态）；四个缺失历史UUID在两张表均不存在，且当前无独立Qlib Artifact表。逐行Parity已确认stage缺15条COMPLETED legacy Run且现有目标无字段差异；Runbook已记录需负责人处置3条非终态并提供外部历史来源；V1.1切换准备新增目标实例确认、Artifact文件与PostgreSQL引用配对核验及漂移的批准窗口处理前置；在处理前不进行切换或备份。详见[DB前置审计](../evidence/audits/2026-10-09-v1-active-db-preflight-a01.md)。

2026-10-09 V1.2 Platform身份边界修复：发现`quant/probe`、`quant/factors`、`quant/rdagent-probe`未要求Platform会话身份，现统一补齐。逐项探测V1.2控制器11条路由，匿名请求11/11返回401，伪造owner 11/11返回403；改后`pnpm verify:stage -- --stage V1.2 --suite code`在允许Docker访问环境退出0，四个Web/API/CLI TestRun、锁版Qlib和隔离资源清理通过。审计及完整日志/哈希见[身份边界审计](../evidence/audits/2026-10-09-v12-platform-identity-boundary-a01.md)、[完整套件日志](../evidence/audits/2026-10-09-v12-platform-identity-code-suite-a01.log)。默认受限shell无法访问Docker的退出2已保留为环境先决条件记录，不混作测试失败或PASS。此增量不关闭全V1路由矩阵、V1.2人工验收或V1总门禁。

2026-10-09 V1.1/A04身份增量：隔离Harness新增7条受保护Platform API路由匿名401/伪造身份403探测，并核对源码路由清单。`pnpm test:integration:v11-stage-storage`退出0，V1.1 code suite与Chromium normal/rejection/recovery 3/3通过；三个Run已导出，人工结论仍NOT_RUN，隔离容器/卷/网络/镜像清理通过。[身份审计](../evidence/audits/2026-10-09-v11-platform-identity-boundary-a01.md)、[完整日志](../evidence/audits/2026-10-09-v11-platform-identity-code-suite-a01.log)，SHA-256 `158c9ae26888c10c578e8a695651f90470b068480d53d5d41a38765c19ac58b7`。V1.1总体、活动存储切换及A04全矩阵仍开放。

2026-10-09正式V1门禁a221：加入legacy→stage逐行Parity差异及非终态Run元数据审计后复核；`pnpm docs:check`检查6493个本地Markdown链接、0失败，`git diff --check`通过。五阶段文档审计PASS，证据审计PASS（621引用、69份Manifest、208项、0失败），V1整体仍INCOMPLETE/exit 2。四个历史Run结构化导出、阶段剩余交付/人工验收、OD-014与结算、全V1恢复及目标Ubuntu证据继续未满足。[门禁日志](../evidence/audits/2026-10-09-v1-version-gate-a221.log)，SHA-256 `f8253556d357d181c0e3216d8d3091b4c9f57353e0c0d3436c2a88435bb83f01`。

2026-10-09 P0门禁分类审计：逐项对照了V1/V2目标架构烟测与V3真实Ubuntu部署要求、OD-013 Artifact保留/清理约束、OD-007活动策略限制及V1.1活动存储切换前置。已写明原文、V1影响与安全边界；W8是否要求真实Ubuntu实机和OD-013过期/物理删除仍待所有者明确，不据此删减门禁或配置自动清理。详见[分类审计](../evidence/audits/2026-10-09-v1-gate-classification-a01.md)。

2026-10-09 P0历史Run来源盘点关闭：计划项要求的4个缺失TestRun已有本地Platform API/端口探针、Docker卷清单、仓库结构化证据目录与只读旧库恢复审计；四个UUID均精确列出，已查本地API返回404、无身份401，旧库与`evidence/local`没有原始结构化导出。来源审计只证明已查本地来源，不断言离线/外部备份不存在；因此关闭的是来源盘点，P6历史导出门禁仍未通过。细节见[本地API/卷探针](../evidence/audits/2026-10-09-v1-historical-run-api-probe-a01.json)与[旧库恢复审计](../evidence/audits/2026-10-07-v1-history-run-recovery-check.md)。

2026-10-09 P5/V1.5 AUTO FakeBroker撤单与部分Fill竞态已通过：在FakeBroker已提交订单、Trade响应延迟时，隔离Web取消导致序号1的25/50股Fill、序号2权威撤单，Portfolio剩余预留`RELEASED`；双账本MATCH、后续订单0、同Run CLI/export和随机资源清理均通过。报告[JSON](../evidence/audits/2026-10-09-v15-auto-trade-cancellation-sq-v15-e2e-4e5746d1118a6280c5e6.json)，SHA-256 `6093961118e6cf735b5c145bfc1fc446e0b889c54ecb9ca4d7d12db20a285f81`；全量V1.5 code suite exit 0，[日志](../evidence/audits/2026-10-09-v15-auto-cancel-partial-fill-code-suite-a01.log)，SHA-256 `3c3cd78fca1d38f80b45599bf4093624757a3598b00fad52d36cdb8b81352150`。Stage §2/§7/§8、验收说明、completion plan和P5交叉表已同步。只关闭该固定故障窗口切片，真实日历/结算/时钟调度、多故障恢复、Ubuntu及当前范围人工验收仍开放；正式V1门禁已在文档同步后重跑，仍为INCOMPLETE。

2026-10-09正式V1门禁a194：本轮V1.5阶段记录与交叉表同步后复核，五阶段文档审计PASS，证据审计PASS（601引用、68份Manifest、207项、0失败）；版本仍INCOMPLETE/exit 2。四个历史TestRun结构化导出、阶段剩余交付、OD-014及结算决策/实现、完整跨域恢复、目标Ubuntu及本轮人工验收仍未完成。[门禁日志](../evidence/audits/2026-10-09-v1-version-gate-a194.log)，SHA-256 `020cef181c817bbd20f6b3be42100dd3d9e481b825c70e5c94fd5c77872fd8c6`。

2026-10-09继续执行复核：`pnpm docs:check`检查6374个本地Markdown链接、0失败；正式V1门禁[a192](../evidence/audits/2026-10-09-v1-version-gate-a192.log)阶段文档/证据审计PASS（604引用、68份Manifest、207项），整体仍INCOMPLETE/exit 2。V1.5取消路径核对确认当前只在已授权订单结束后阻止后续订单；Trade侧撤单/部分Fill接口尚未接入AUTO编排，仍是P5开放工程项。`git diff --check`通过；不新增人工签署。

2026-10-09 P5/A11四卷同点配对恢复：V1.5随机隔离栈实际Web创建normal TestRun并完成120项HOLD观察后，同点停止并分别归档PostgreSQL、NATS JetStream、Temporal SQLite、research Artifact四卷，恢复到四个新卷；恢复后同Run CLI读回PASS，原Temporal Workflow/JetStream ACK状态保留，ArtifactRef与内容Hash匹配。全normal/AUTO/rejection/recovery E2E 1/1通过，真实券商/外部来源0，随机资源清理核验通过。报告[JSON](../evidence/audits/2026-10-09-v15-paired-backup-restore-sq-v15-e2e-a378990c03fcf9de8260.json)，SHA-256 0b967d9c34356b22ccef16adaabcd9c7cf5f3c858a584001062752349cef937a；[运行日志](../evidence/audits/2026-10-09-v15-four-volume-paired-restore-e2e-a01.log)，SHA-256 2370a20d702e5b29c759243bc43b5ca13f798ff044c16251c04bc753fdde023a。ArtifactRef/内容为测试合成输入；V1.1～V1.4真实产物、完整交易Run续跑幂等、生产备份编排、Ubuntu/异地/RPO/RTO及人工验收仍开放。

2026-10-09 P5/A11隔离配对恢复来源追溯补强：Harness报告逐文件记录备份器、Retention、初始化SQL等源码SHA-256，记录macOS arm64/Node v24.1.0及PostgreSQL/辅助镜像ID。恢复十个数据库/角色、Artifact哈希和跨库合成TestRun/Trade/Portfolio关联均PASS，临时资源精确清理、活动卷触碰0。[JSON](../evidence/audits/2026-10-09-v1-isolated-cluster-paired-backup-2d597dbd749e4b19.json)，SHA-256 `c41975b628b3de9039105af546c16af35531a85f4ed21b56778c7be2a6f45bcc`；[运行日志](../evidence/audits/2026-10-09-v1-isolated-cluster-paired-backup-source-manifest-a01.log)，SHA-256 `55964aaa0f727b52d4752505a380ce190dbd4b976ddc65d3961fd1f007c005f1`。业务事实由隔离Harness按表形状合成，未证明同点NATS/Temporal、真实服务生成Run、Ubuntu、异地/RPO/RTO。

正式V1门禁a188：来源可复现信息入档后重跑，阶段文档审计PASS，证据审计PASS（600引用、68份Manifest、207项、0失败），版本仍INCOMPLETE/exit 2；4个历史Run导出、五阶段工程/交付、OD-014与结算、真实同点跨域恢复、Ubuntu及当前范围人工验收未满足。[门禁日志](../evidence/audits/2026-10-09-v1-version-gate-a189.log)，SHA-256 `d44bafa85c8bbfe2b43ed2dc9d1478cc385246ca7423699c2f5b8ec2cc9d04d8`。

2026-10-09 P5/A11业务事实备份清单校验加固：备份Retention校验TestRun/namespace、业务UUID、Trade→Portfolio Fill ID、Outbox、owner/run、Ledger和持仓事实；错配时拒绝备份清单通过与保留候选。新增单测9/9通过，包含篡改Fill关联后的拒绝；严格校验下隔离Docker全库/Artifact配对恢复再次PASS：[JSON](../evidence/audits/2026-10-09-v1-isolated-cluster-paired-backup-2f0c1de2e66d49b7.json)，SHA-256 `8795ec7ee1aef81c6000ff9788ecc941c9e641c3410f8b50765bf89c141d444f`；[日志](../evidence/audits/2026-10-09-v1-isolated-cluster-paired-backup-business-facts-a01.log)，SHA-256 `157701cd3fe5ddf796ca21ff7fb757999f20cbb1069852b00eef5b6dc38d84a4`。数据仍为表形状合成记录；同点NATS/Temporal/Artifact与Ubuntu/异地/RPO/RTO未验证。

2026-10-09 P3/V1.3固定撤单/部分Fill竞态复验：隔离PostgreSQL及真实Trade→Portfolio HTTP路径验证部分Fill、并发撤单、序号缺口缓冲、Trade重启后补序、幂等回放、累计成交75/100与最终撤单；独立Portfolio现金/Fill/预留事实一致，临时容器/网络已清理。[运行日志](../evidence/audits/2026-10-09-v13-cancel-partial-fill-race-e2e-a01.log)，SHA-256 `fb6331813c0588d9af83c18b359650d43c4ad1010c4db73b8ace466767114635`。V1.3阶段手册、测试计划和L15/L16索引已更新；这不替代V1.5 AUTO撤销编排、结算、多故障Worker或人工验收。

正式V1门禁a185：阶段文档与证据审计PASS（593引用、65份Manifest、204项、0失败），版本仍INCOMPLETE/exit 2；四个历史Run缺结构化导出，五阶段工程/交付、OD-014结算、完整跨域恢复、目标Ubuntu和当前范围人工签署仍开放。[a185日志](../evidence/audits/2026-10-09-v1-version-gate-a185.log)，SHA-256 `972431de4606c27d08bb1b89283375aa1047b1fd9d344160777a4009aebd1efe`。

2026-10-09 P3/V1.3撤单与部分Fill竞态补验证：隔离PostgreSQL和真实Trade→Portfolio HTTP调用通过，覆盖部分Fill后重复并发撤单、Fill/撤单序号缺口、Trade进程重启、同序号幂等、累计75/100后接受撤单、两个Fill入账后释放余量；独立现金/Fill/预留事实一致，随机容器/网络清理通过。[运行日志](../evidence/audits/2026-10-09-v13-cancel-partial-fill-race-e2e-a01.log)，SHA-256 `fb6331813c0588d9af83c18b359650d43c4ad1010c4db73b8ace466767114635`。V1.3阶段手册、测试计划和L15/L16交叉索引已记录。该共享FakeBroker切片不替代V1.5 AUTO撤销编排、真实结算、多故障交易Worker或人工验收。

2026-10-09 P1/A04 V1.5迁移CLI隔离复验：Platform API、Decision Governance、Trade Execution、Portfolio Risk四个独立PostgreSQL目标均通过预检不改库、应用、重复应用幂等及未知迁移版本拒绝；容器/网络清理核验通过，活动服务未连接。[运行日志](../evidence/audits/2026-10-09-v15-migration-cli-suite-a01.log)，SHA-256 `fb3a54451d3f9d84f2977e33fb23a88d52c9a500a7ff58f7d5417be383203db0`。迁移Runbook现已校正所有五阶段命令入口。此为隔离迁移证据，不证明活动迁移、回退或完整配对备份。

2026-10-09 P5/A11配对恢复业务事实复验：隔离Harness恢复Platform TestRun、FakeBroker订单/Fill/DELIVERED Outbox及Portfolio账户/Fill/Ledger/持仓关联，连同全部10个DB/角色与Artifact内容Hash通过；活动项目触碰0、资源精确清理、真实券商/外部来源调用0。[JSON](../evidence/audits/2026-10-09-v1-isolated-cluster-paired-backup-8b984f5ff18c4e87.json)，SHA-256 `c8c25c4a549734eae34fd274bbc026aadc58eed6febfd4575fe56f13a6f66ec0`。事实由隔离测试按正式表结构写入，仍属合成数据，不代表服务API真实运行，也未覆盖NATS/Temporal同点恢复、活动Artifact、Ubuntu、异地或RPO/RTO。正式V1门禁a183：本轮同步配对恢复证据后复跑，五阶段文档审计PASS、证据审计PASS（592引用、65份Manifest、204项、0失败），版本仍INCOMPLETE/exit 2；缺口包括4个历史Run结构化导出、五阶段未完成交付、版本汇总/门禁未勾选、OD-014及结算、真实跨域运行恢复、Ubuntu与当前范围人工验收。[a183日志](../evidence/audits/2026-10-09-v1-version-gate-a183.log)，SHA-256 `d78f6647b08fa472a6d1189702bd4357d55ed40aa2070aba772a34083d7b166b`。
正式V1门禁a182：阶段文档审计PASS，证据审计PASS（592引用、65份Manifest、204项、0失败），版本INCOMPLETE/exit 2；仍有4个历史Run缺结构化导出、版本汇总/门禁勾选、五阶段工作与人工/Ubuntu验收等缺口。[a182日志](../evidence/audits/2026-10-09-v1-version-gate-a182.log)，SHA-256 `d78f6647b08fa472a6d1189702bd4357d55ed40aa2070aba772a34083d7b166b  evidence/audits/2026-10-09-v1-version-gate-a182.log`.

核对日期：2026-10-09（Asia/Shanghai）。本页是当前状态摘要，不另立需求或替代阶段验收。执行细节继续使用[10月8日V1完成开发计划](./plans/2026-10-08-v1-completion-plan.md)；需求服从[三版规则](./prd/05-three-version-delivery.md)。

2026-10-09最新执行：V1.5正式验收页新增当前Run成交选择器，可逐笔查看每笔Fill完整链路；四场景隔离Web/API/CLI/export E2E逐一选择4笔AUTO Fill并比对领域账本通过，完整V1.5代码套件exit 0。证据：[E2E JSON](../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-45fbf478d4dcba196115.json)、[code suite](../evidence/audits/2026-10-09-v15-fill-trace-selector-code-suite-a03.log)。文档/交叉表已同步；V1正式门禁a151仍INCOMPLETE/exit 2（阶段文档与证据审计PASS，548引用、58份Manifest、196项、0失败），[门禁日志](../evidence/audits/2026-10-09-v1-version-gate-a151.log)。
2026-10-09继续V1.5恢复切片：Trade Execution在FakeBroker提交AUTO Order/Fill后、HTTP响应前被实际终止并重启；Temporal在同一TestRun下用原clientOrderId读回持久订单，双账本最终匹配。隔离四场景E2E及完整V1.5 code suite均exit 0，报告见[V1.5 §8.16](./prd/v1-local-simulation/05-scheduling-and-recovery.md#816-trade-execution提交后重启与原单恢复2026-10-09)。此结果不覆盖多Worker故障切换、取消/在途Fill、结算或人工/Ubuntu验收。

2026-10-08所有者明确要求：以完成V1为基础，非必要不扩展功能或V2/V3新功能。本轮完成V1.2/P2日线质量拒绝发布门（84项Market Data单测、改后完整代码套件退出0）；并继续记录既有V1.5 A10：新增同一Web/API/CLI/export隔离E2E的CN_A UNKNOWN恢复，按原namespace/clientOrderId查回FakeBroker原单，最终双市场各1订单/Fill且对账匹配：[JSON](../evidence/audits/2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-e09b3c5a08f1a6594056.json)。本轮新增Decision Governance owner/TestRun/Mandate版本作用域预算汇总读取，隔离HTTP/PG验证RESERVED/CONSUMED/RELEASED精确金额，Trade身份403、错误owner 404：[日志](../evidence/audits/2026-10-09-v13-mandate-budget-http-pg-a01.log)。V1.5四场景Web/API/CLI/export隔离E2E逐市场核验CN CNY 1005.00和US USD 250.05均恰好消费一次：[机器证据](../evidence/audits/2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-0d837e9c09a10e5b6d31.json)，真实来源/券商调用0、随机资源清理通过。完整V1.5 code suite在已缓存锁版Python Worker镜像的隔离Docker环境中exit 0，含14/14 Python Worker测试及完整规定检查：[a24日志](../evidence/audits/2026-10-09-v15-budget-readback-code-suite-a24.log)。V1.5验收页当前TestRun ID已持久化，且固定AUTO/UNKNOWN Run新增逐市场成交追溯视图；隔离E2E中normal与AUTO均关闭原验收页后重开并核对同一Run ID；normal完成120项观察，AUTO在页面关闭期间完成CN/US订单、Fill及独立账本对账后重开核验；四场景同Run CLI/export通过；页面Proposal/Mandate/Order/Fill/Outbox/双账本/预算与后端证据逐字段一致；四场景容器E2E PASS，完整V1.5 code suite exit 0（Python Worker 14/14）。证据：[E2E](../evidence/audits/2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-391873c1eb80223c45ee.json)、[a28套件](../evidence/audits/2026-10-09-v15-trade-trace-code-suite-a28.log)。该子项不等于多日交易/日终、成交追溯或人工验收。最新V1门禁a98仍INCOMPLETE/exit 2，阶段文档与证据审计PASS（469引用、48 manifests、146条目）；四个历史TestRun缺结构化导出，五阶段未关闭，当前用户验收和目标Ubuntu环境证据也未满足。本轮`pnpm baseline:check`通过（5883链接、292 JSON/205 Schema/48 Fixture、51项脚本回归），但不替代业务验收：[日志](../evidence/audits/2026-10-09-v1-baseline-check-a02.log)、[SHA-256](../evidence/audits/2026-10-09-v1-baseline-check-a02.log.sha256)。

2026-10-09继续V1.3/P3：Trade Execution隔离HTTP+PostgreSQL验证三条manual、sequenced-manual、AUTO提案下单路由均拒绝LIVE/REAL模式注入（HTTP 422），并确认订单/成交/事件/outbox均零副作用；V1.3完整代码套件exit 0，详见[套件日志](../evidence/audits/2026-10-09-v13-route-mode-injection-code-suite-a01.log)及[SHA-256](../evidence/audits/2026-10-09-v13-route-mode-injection-code-suite-a01.log.sha256)。该项已登记至V1.3-S2-L17交叉索引；其余V1.1/V1.3写路由、BACKTEST路径和UI篡改审计仍开放。

2026-10-09继续P3：Trade Execution完整写路由身份拒绝矩阵复验13个HTTP写入口，错误服务身份均403，隔离数据库订单/成交/事件/outbox零副作用；三条V1.3提案执行路由也拒绝LIVE/REAL注入。改后完整V1.3代码套件exit 0，证据见[日志](../evidence/audits/2026-10-09-v13-trade-route-scope-code-suite-a02.log)及[SHA-256](../evidence/audits/2026-10-09-v13-trade-route-scope-code-suite-a02.log.sha256)。Platform/Governance/Replay/Worker写边界、BACKTEST业务路径和UI篡改仍未审计。

当前目标：先完成V1本地模拟闭环工程交付，再完成当前范围人工/环境验收。V2/V3已有代码与证据保留，当前不扩展真实来源、模型实验和容量。必要共享修复须明确关联V1要求；本页不改变活动服务或其他聊天/自动化的运行状态。

2026-10-09继续V1.3/P3：补齐FakeBroker已确认DAY到期的预留释放链。订单终态、事件及释放Outbox事务化提交；部分成交等待所有Fill Outbox入账后才释放；UNKNOWN不得转为EXPIRED释放资金。Trade单测、类型检查与隔离PostgreSQL持久化回归通过，详情见[审计](../evidence/audits/2026-10-09-v13-expiry-reservation-release-a01.md)。该切片不关闭错过窗口后的重评估、多日/日终调度或P3父项。

本次变更后的V1.3完整code suite exit 0（禁网锁版Python镜像已实际执行），日志见[套件记录](../evidence/audits/2026-10-09-v13-expiry-reservation-release-code-suite-a01.log)。正式V1门禁a137仍INCOMPLETE/exit 2：五阶段文档审计PASS、证据审计PASS（532引用/57 manifests/196条目）；4个历史Run缺结构化导出，P1～P6其他工程、OD-014、目标环境及当前范围人工验收仍未关闭。详见[门禁日志](../evidence/audits/2026-10-09-v1-version-gate-a137.log)。

2026-10-09继续V1.3/P3：Platform API Proposal入口新增LIVE/FAKE、PAPER/REAL、LIVE/REAL注入拒绝（422）及无交易副作用断言；同幂等键合法PAPER/FAKE仍接受，Web TestRun同Run CLI check-only核对通过。新增用例后完整V1.3隔离E2E 22/22、完整code suite均exit 0；交叉表仅将该原子覆盖标为已验证，V1.3-S2-L17父项仍OPEN。详见[阶段§8.30](./prd/v1-local-simulation/03-fake-broker-trading-loop.md#830-platform-proposal模式注入拒绝及无交易副作用2026-10-09)、[完整E2E](../evidence/audits/2026-10-09-v13-platform-mode-full-e2e-a01.log)、[代码套件](../evidence/audits/2026-10-09-v13-platform-mode-code-suite-a02.log)。

2026-10-09正式V1门禁a174：Platform Proposal模式拒绝E2E和证据索引更新后复核，五阶段文档审计PASS、证据审计PASS（588引用、65份Manifest、204条目）；V1仍INCOMPLETE/exit 2。未满足项包括4个历史TestRun结构化导出、阶段交付与版本摘要/门禁未关闭、OD-014结算语义、全V1业务账本与Artifact配对恢复、目标Ubuntu及当前范围人工验收。[a174日志](../evidence/audits/2026-10-09-v1-version-gate-a174.log)，SHA-256 `8ccd87e7a304373027a6efb1cadec547e1bb1b2a81ae9cfa6cb633dd4b544882`。

V1.3-S2-L17追踪复核：新增Platform Proposal模式注入Web E2E已纳入交叉索引，25条该行证据路径均存在；逐原子映射检查记录为PASS_FOR_ATOMIC_MAPPING_PARENT_OPEN，父项保持OPEN，范围不外推至其它Platform路由。[审计](../evidence/audits/2026-10-09-v1-crosswalk-platform-mode-a01.json)，SHA-256 `58ccbe3857d7d1ab6dd1fbdfdc19f884716b41ae830d8bc8b07259a8582e0b8a`。

正式V1门禁a176：本轮阶段/交叉索引更新后复核，五阶段文档审计PASS、证据审计PASS（588引用、65份Manifest、204条目）；V1仍INCOMPLETE/exit 2，4个历史TestRun结构化导出及阶段工程、结算决策、Ubuntu/人工验收条件仍未满足。门禁输出与a174一致，SHA-256 `8ccd87e7a304373027a6efb1cadec547e1bb1b2a81ae9cfa6cb633dd4b544882`；[a176日志](../evidence/audits/2026-10-09-v1-version-gate-a176.log)。

V1.3 §8.30证据摘要更正：完整矩阵重跑22/22通过（TestRun `9c8f49b0-913f-453b-a582-eaf5834bbae6`）；修正前摘要曾将`ledgerEntryCount`硬编码为0，现日志改为报告快照真实值（前后均1、版本不变），订单/Fill仍为0。完整E2E日志[ a03 ](../evidence/audits/2026-10-09-v13-platform-mode-full-e2e-a03.log)，完整V1.3代码套件[ a03 ](../evidence/audits/2026-10-09-v13-platform-mode-code-suite-a03.log)均exit 0；先前摘要有误的日志保留为历史记录，阶段手册指向更正后报告。

V1.3修正后完整回归：E2E 22/22通过，平台模式用例日志真实报告初始化/结束账本条目数1/1、版本不变、订单/Fill为0；完整代码套件exit 0。初次门禁a177因新日志sidecar采用了错误相对路径而FAIL，失败记录保留；修正后a179阶段文档审计PASS、证据审计PASS（587引用、64份Manifest、203项、0失败），正式V1仍INCOMPLETE/exit 2。[a177失败日志](../evidence/audits/2026-10-09-v1-version-gate-a177.log)，[a178正式门禁](../evidence/audits/2026-10-09-v1-version-gate-a179.log)，SHA-256 `75ca9cea74dfcc39b57888c19554b780955d4232c368d257337ad165432f6070`。

V1.5/P5撤销恢复增量：将AUTO取消固定故障窗口推进到FakeBroker已提交、Trade HTTP响应未返回时；正式Web按钮持久化取消，Temporal按原命令恢复后完成原订单，最终1 Order/1 Fill、Outbox已送达、独立对账MATCH、后续session订单0。完成后同取消请求重试返回原202/requestedAt。隔离Web/API/Temporal/FakeBroker E2E 1/1通过，随机资源清理通过；Run完整AUTO验收保持WAITING。详见[阶段§8.19.2](./prd/v1-local-simulation/05-scheduling-and-recovery.md#8192-fakebroker提交后响应窗口中的auto取消2026-10-09)、[JSON](../evidence/audits/2026-10-09-v15-auto-trade-cancellation-sq-v15-e2e-64e119e1e01cdbd2515d.json)、[日志](../evidence/audits/2026-10-09-v15-auto-cancel-after-commit-e2e-a01.log)。这不证明FakeBroker订单撤销/部分Fill仲裁完成。

V1.5/P5 AUTO Run取消恢复扩展：隔离故障注入改在FakeBroker已提交、Trade HTTP响应待返回时触发。正式Web取消请求保持owner/TestRun隔离；Temporal恢复同一`clientOrderId`后原订单完成，独立事实为1 Order/1 Fill、Outbox已送达、MATCH、后续session订单0；重试仍返回原202与requestedAt。隔离Web/API/Temporal/FakeBroker E2E通过，完整V1.5代码套件exit 0，见[§8.19.2](./prd/v1-local-simulation/05-scheduling-and-recovery.md#8192-fakebroker提交后响应窗口中的auto取消2026-10-09)、[JSON](../evidence/audits/2026-10-09-v15-auto-trade-cancellation-sq-v15-e2e-64e119e1e01cdbd2515d.json)和[套件](../evidence/audits/2026-10-09-v15-auto-cancel-after-commit-code-suite-a01.log)。券商订单撤销/部分Fill仲裁和人工验收仍开放。

正式V1门禁a181：V1.5 AUTO取消提交后响应窗口回归和文档/交叉索引同步后复跑；五阶段文档审计PASS，证据审计PASS（591引用、65份Manifest、204项、0失败），V1仍INCOMPLETE/exit 2。四个历史TestRun结构化导出、其余阶段工作包、OD-014结算决定/实现、全V1业务配对恢复、Ubuntu与当前范围人工验收未满足。[a180日志](../evidence/audits/2026-10-09-v1-version-gate-a181.log)，SHA-256 `06e67c81d7e3f729e114a58cbfd47396c59aa8e4168697a090f953ae2d1ff089`。

## 1. 实际进度

本轮基础核对HEAD为`baded04`，其后本工作区已有文档整理和本轮隔离运行产生的证据。已分别重跑三个版本Verifier；V1最新门禁a67仍为INCOMPLETE/exit 2，五阶段仍PARTIALLY_IMPLEMENTED，4个历史Run缺少结构化导出。a67证据审核413引用、31份Manifest、129个活动Manifest条目PASS，详见[门禁日志](../evidence/audits/2026-10-09-v1-version-gate-a67.log)及[Hash](../evidence/audits/2026-10-09-v1-version-gate-a67.log.sha256)。以下不是按代码量或复选框数量估算的完成率。

2026-10-08至09本轮开发验证：V1.1 code suite及隔离存储E2E通过，Web normal/rejection/recovery 3/3；V1.2 code suite及隔离Qlib/Web/CLI E2E再次通过，覆盖双市场锁版Qlib、取消与Platform重启恢复；本轮将RD-Agent兼容探针从静态READY改为隔离Qlib Worker内受限执行固定Python代码，实测value=42、source SHA、dockerSocketMounted=false，Web同Run断言modelCalls=NOT_RUN（[完整门禁日志](../evidence/audits/2026-10-09-v12-rdagent-probe-code-suite.log)；[父项拆分审计](../evidence/audits/2026-10-09-v1-crosswalk-parent-decomposition-a02.json)）。另修复V1.2日线Fixture字段/值/RAW/OHLC/重复与PIT质量校验，并在Artifact发布入口拒绝REJECTED数据；84项市场数据单测、Web类型检查及完整V1.2代码套件退出0（[本轮日志](../evidence/audits/2026-10-09-v12-daily-quality-code-suite-a02.log)；[父项拆分A03](../evidence/audits/2026-10-09-v1-crosswalk-parent-decomposition-a03.json)）。该探针不等于真实RD-Agent实验，Ubuntu与人工验收仍未通过。A06追加缺失会话语义和证券上市区间校验后，完整V1.2门禁再次通过：Platform API 61文件/288项、Python适配器69项、锁版Qlib 0.9.6及四Run Web/API/CLI E2E通过，见[缺失会话摘要](../evidence/audits/2026-10-09-v12-session-gap-a06-summary.json)；真实市场日历与全市场共同缺失仍未验证，P2不关闭。V1.3 code suite通过、固定Web/API/CLI场景21/21通过。V1.3首次E2E暴露隔离Harness未开启一次性费用更正故障注入，已在[测试Harness](../scripts/test-v13-web-e2e-isolated.mjs)内将该test-only开关设为true；生产配置仍关闭，修复后完整21/21通过，日志/Run证据见[V1.3当前E2E目录](../evidence/audits/2026-10-08-v13-browser-captures-sq-v13-web-07c71ddffdc6b9dec3ad)。V1.4 code suite与Web/CLI E2E 5/5通过，覆盖固定回测、规则输入及持久报告；后续A08补入USD Fixture Quant/FakeBroker/PostgreSQL BUY/SELL合成费用及Outbox对照（[日志](../evidence/audits/2026-10-09-v14-code-suite-a08.log)），真实美股费用/税费和完整账本结算仍未验证。V1.5本轮Mandate读回改动后完整code suite通过，锁定Python Worker 14/14；日志见[a23](../evidence/audits/2026-10-09-v15-code-suite-a23.log)及[Hash](../evidence/audits/2026-10-09-v15-code-suite-a23.log.sha256)。四场景隔离E2E exit 0，证明CN_A UNKNOWN原单查询恢复、CN/US各唯一订单与Fill、对账MATCH；跨币种提案422、暂停执行403并持久保存`MANDATE_INACTIVE`也通过。恢复报告见[E2E JSON](../evidence/audits/2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-e09b3c5a08f1a6594056.json)。Mandate配置额度已通过owner/TestRun独立读回验证；budget reservation/已消费金额仍未独立查询，A10撤销/在途Fill/错过窗口/Worker交易恢复和多日/日终仍开放。随机隔离资源精确清理，外部行情/真实券商调用0。自动化不代表新范围人工验收、活动切换或Ubuntu实机通过。a50 V1 Verifier exit 2/INCOMPLETE；证据审计393引用、26份Manifest、124个活动Manifest条目PASS；4个历史结构化导出仍缺失、五阶段保持未关闭，详见[a50门禁日志](../evidence/audits/2026-10-09-v1-version-gate-a50.log)及[Hash](../evidence/audits/2026-10-09-v1-version-gate-a50.log.sha256)。本轮新增XMK-03结算缺口路由，未改变业务验收状态。

2026-10-09新增V1.2/V1.3/V1.4 Governance、Replay、Quant HTTP身份边界检查并纳入各阶段完整代码套件；服务身份smoke改为一次性隔离PostgreSQL端点，V1.2/V1.3/V1.4完整套件均exit 0，分别见[V1.2](../evidence/audits/2026-10-09-v12-service-auth-code-suite-a02.log)、[V1.3](../evidence/audits/2026-10-09-v13-service-auth-code-suite-a01.log)、[V1.4](../evidence/audits/2026-10-09-v14-service-auth-code-suite-a01.log)。V1.2隔离E2E Playwright 1/1通过并清理资源。OD-014已有双市场Paper结算语义提案，等待所有者确认；受该决定约束的SELL→BUY结算仍未实现。

| 版本 | 当前正式门禁 | 未正式关闭阶段 | 主要剩余范围 |
|---|---|---|---|
| V1 | INCOMPLETE，exit 2 | 5/5；版本计划均PARTIALLY_IMPLEMENTED | 共享基础收尾、市场/执行规则对照、后台交易/日终、全V1恢复、手册、历史证据及新增范围人工/环境验收 |
| V2 | INCOMPLETE，exit 2 | 5/5 | 来源/用途与活动策略决定、真实连续观察、数据语义/PIT与容量剩余项、6个历史Run导出缺口；当前不扩展 |
| V3 | INCOMPLETE，exit 2 | 4/4；版本计划均NOT_RUN | 真实RD-Agent/模型实验、独立验证和批准、业务连续运行、真实Ubuntu迁移/恢复；已有工程子项不能替代 |

原始结果与核对范围：[本轮门禁复核](../evidence/audits/2026-10-08-delivery-review/README.md)。三个版本的链接/活动Manifest检查均PASS，只说明该审计范围可读且Hash匹配，不能推导业务完整或用户已签署。

| V1阶段 | 已记录的工程证据（截至2026-10-09） | 当前未关闭事项 | 手册状态 |
|---|---|---|---|
| [V1.1](./prd/v1-local-simulation/01-environment-and-web-center.md) | 当前工作树code suite通过；随机隔离交互栈启动/会话/Web/精确关闭通过；normal/rejection/recovery 3/3；同Run CLI与三份结构化导出/Manifest校验通过 | V1适用合同/发布调用矩阵、Artifact治理、活动存储切换前置和部署、用户人工验收 | VERIFIED_EXECUTABLE（仅隔离执行手册） |
| [V1.2](./prd/v1-local-simulation/02-small-data-and-qlib.md) | 本轮 code suite 通过；隔离双市场真实Qlib、Web/CLI正常/拒绝/恢复及取消/重启恢复通过 | OD-007活动策略决定、历史Run导出、新范围人工与目标环境验证 | VERIFIED_EXECUTABLE，仅隔离Fixture范围 |
| [V1.3](./prd/v1-local-simulation/03-fake-broker-trading-loop.md) | 当前树完整code suite、完整26/26 Web/API/CLI/export E2E（含MANUAL CN/US和AUTO CN两腿BUY）、独立stack/session清理及隔离数据库恢复回归通过 | 全接受路径模式边界清单、适用市场/授权/故障要求覆盖、错过窗口重评估、Ubuntu与新范围人工验收 | VERIFIED_EXECUTABLE（仅Mac ARM64隔离手册范围） |
| [V1.4](./prd/v1-local-simulation/04-daily-backtest.md) | 本轮 code suite 通过；正式隔离Web/API/CLI E2E 5/5通过 | 完整适用日历/规则/公司行动、Paper账本逐规则对照、交互手册与当前验收 | PARTIALLY_VERIFIED_EXECUTABLE |
| [V1.5](./prd/v1-local-simulation/05-scheduling-and-recovery.md) | normal 120观察、AUTO双市场、暂停拒绝、CN_A UNKNOWN原单查询恢复、活动Workflow重复派发幂等、Platform dispatch Worker故障接管、Trade提交后单实例故障并由备用实例按原clientOrderId恢复均通过隔离Web/API/CLI/export E2E | 多日/日终、结算、撤销/在途Fill、Trade多实例/多故障切换、预算独立对账、完整V1含Artifact恢复、手册与当前验收 | PARTIALLY_VERIFIED_EXECUTABLE |

细项与签署仍以[V1验收表](./prd/v1-local-simulation/99-acceptance.md)、阶段第2/7/8节及[106项既有覆盖台账](../evidence/audits/2026-10-06-v1-p0-coverage.md)为依据。历史人工PASS继续保留适用范围；本轮扩展不继承旧签署。上述五阶段未结项不表示已有成果全部失效。

## 2. 偏移在哪里

- 根README仍指向“V2当前重点”，而10月6日计划已明确回到V1；本轮修正仓库入口。
- 六份执行/专项文档保留不同时间的IN_PROGRESS，读者容易同时领取多个队列；现由[计划索引](./plans/README.md)说明接替关系。
- 10月6日历史V1计划已超过600行，状态与测试流水混排；摘要应显示剩余项，运行过程保存在evidence，原计划只保留必要结论/引用。
- “有代码”“固定用例PASS”“可执行手册”“活动部署”“人工签署”“版本完成”被混在长段落里；今后交付分别报告这些事实，不再以新增测试数量代替阶段关闭。
- P3已完成的L07/L08应用协调提取，在旧盘点中仍能看到“下一步”；以其后续更正和最新证据为准，不重复提取、无变化重跑或继续相邻重构。

这些是依据仓库记录作出的管理诊断；尚未完成对全部业务需求逐条重新验收，不能宣称已穷尽代码缺陷。

### 2026-10-08本次复核的修正与未决冲突

最近一轮执行主要补充回归证据和一项测试配置修复，没有完成P5业务主链。相对“完成V1开发”的要求，存在执行重心偏差：P0逐项关联尚未闭合，P1～P6也没有因测试数量增加而结项。当前工作区未发现新增V2/V3功能的改动；这不等于对历史全部提交完成范围审计。

| 核对项 | 结论与处理 |
|---|---|
| 计划索引“未开始执行”、进度表“未重跑” | 与已记录运行冲突，已改为执行中及限定范围隔离复验。10月6日长计划明确标为历史来源。 |
| PRD入口“没有代码”、共同规则“没有通过业务测试” | 过时初始描述已改为设计基线；实际状态引用阶段计划和验收表。命令契约和手册初始状态不再冒充当前状态。 |
| V1.1验收表直接显示PASS，版本计划为部分实现 | 已显式区分历史PASS与当前PARTIALLY_IMPLEMENTED；原签署和Run事实保留，新增范围人工仍NOT_RUN。 |
| V1.5历史JSON被本轮脚本覆盖 | 已将本轮内容保存为[独立JSON](../evidence/audits/2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-68e0832c5fa51e912c32.json)和[Hash清单](../evidence/audits/2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-68e0832c5fa51e912c32.sha256)，原10月7日文件恢复为HEAD原件。Harness仍固定输出历史路径，是待修的证据持久化问题；下次运行前须改为每次独立路径，不能继续覆盖。 |
| Ubuntu验收层级 | [共同规则第5节](./prd/05-three-version-delivery.md)规定V1/V2目标架构烟测尝试、V3真实Ubuntu部署/恢复/E2E；V1.3第7节又把目标Ubuntu细节作为手册关闭条件，V1.2/99还列实机未完成。表述层级不一致，需逐条区分架构烟测、实机兼容、最终迁移后统一；本轮未擅自移除任何门禁。 |
| “全市场规则”“真实RD-Agent运行” | 必须映射到V1已批准的证券/订单/Fixture及环境探针要求；笼统措辞有无限扩展风险。真实RD-Agent模型实验属V3，V1固定环境探针不能据此扩成研究项目；本轮未据此新增需求或勾选完成。 |

本次只进行文件、源码接线和版本门禁复核，未再次重跑业务套件。Git未合并条目和冲突标记检查均未发现冲突；这与上述文档语义冲突是不同检查。文档链接/格式检查及证据Hash通过，V1版本门禁仍exit 2/INCOMPLETE，4个历史Run导出缺口不变。原始结果见[本次进度复核门禁](../evidence/audits/2026-10-08-v1-progress-review-gate.json)。

## 3. 剩余队列与下一步

沿用原P编号，10月8日计划接替旧排期；只分解现有必需项，不新增平行“整改版本”。默认一个工程切片在做，阻塞项可独立准备，未通过前置始终保留未通过。本轮阶段回归补强了当前证据，但未完成P0逐条追踪，也未实施V1.5交易/日终纵切。

| 顺序/工作包 | 下一项具体交付 | 关闭标准 | 当前状态 |
|---|---|---|---|
| P0当前差异与边界核实（进行中） | 复用106项历史台账，对照当前五阶段2/7/8及90/99，列出已验证/缺实现/缺验证/缺决定/缺环境/历史证据缺失及责任包；核实Ubuntu等归属 | 每个当前必需项有来源、退出条件和去向；争议不靠删门禁解决 | 已完成145项索引（106条原始行+38条§90/99增量+全局XMK-03一条）；A02当前路径审计复核1034条路径、88条精确测试名称且0缺失（历史A01审计仍保留原结论）；本轮V1.3父项拆分新增16条测试引用/8个唯一测试，合计71条引用/53个唯一断言，脚本执行入口7条，详见[原索引校验](../evidence/audits/2026-10-09-v1-crosswalk-link-audit-a01.json)、[本轮路径与测试名复核](../evidence/audits/2026-10-09-v1-crosswalk-link-audit-a02.json)和[父项拆分审计](../evidence/audits/2026-10-09-v1-crosswalk-parent-decomposition-a01.json)；145条索引均有经原文核验的当前来源锚点；其余父项拆分、语义映射和历史Run处置未完成 |
| P1共享基础收尾 | 对照现有V1调用/Artifact清单补合同与发布覆盖；准备活动恢复副本及切换包，列明非终态Run处理和回退 | 适用合同/迁移覆盖可定位；副本恢复验证及治理决定齐备；活动操作有精确批准 | 部分完成：独立迁移CLI及V1.1～V1.4隔离套件PASS；全调用/发布核对、配对恢复/旧版回退、OD-013和维护输入仍开放 |
| P2数据/Qlib收尾 | 复用已验证Fixture/Qlib及手册；新增精确断言核对发布Artifact与Governance收到的策略快照一致，覆盖版本/Run/Hash/策略Hash/asOf/目标和空NO_TRADE | 定向V1.2单测7/7通过；仍需核对P3消费端、缺失/未来/不足历史及阶段交接 | 部分补强，P2未关闭 |
| P3交易链收尾 | 完成V1.1/V1.3交易及回测接受路径清单：入口→模式→验证点→副作用→测试；把全市场/故障笼统缺口映射到既有要求和固定场景 | PAPER+FAKE、BACKTEST+FAKE按用途接受；LIVE/REAL拒绝且无副作用；每项明确已覆盖、缺测试、缺实现或待决定 | 三处高风险HTTP边界既有无副作用拒绝证据；2026-10-09治理/执行/Portfolio单测41/41、90/90、5/5和Trade隔离PG目标限制5/5复验通过（[日志](../evidence/audits/2026-10-09-v13-server-mode-boundary-a01.log)，[SHA-256](../evidence/audits/2026-10-09-v13-server-mode-boundary-a01.log.sha256)）；此后全局`baseline:check`复核exit 0，含5749项文档链接、合同/Fixture、8项服务分层及50项基础测试（[日志](../evidence/audits/2026-10-09-v1-baseline-check-a01.log)，[SHA-256](../evidence/audits/2026-10-09-v1-baseline-check-a01.log.sha256)）。补充修复Portfolio `isSimulationModeAllowed`未覆盖BACKTEST/缺失配置的策略测试；V1.1与V1.3完整code suites在修复后均exit 0，并新增HTTP+PostgreSQL smoke对PAPER/BACKTEST账户创建及LIVE/REAL无副作用拒绝的真实读回（[HTTP smoke](../evidence/audits/2026-10-09-v11-backtest-account-http-a01.log)、[V1.1](../evidence/audits/2026-10-09-v11-mode-policy-code-suite-a04.log)、[V1.3](../evidence/audits/2026-10-09-v13-mode-policy-code-suite-a03.log)）。Trade 13个写入口错误身份403及零副作用矩阵已逐路由写入[A05审计](../evidence/audits/2026-10-09-v1-cross-service-route-matrix-a05.md#v13-trade-execution-写入口身份拒绝子矩阵2026-10-09)；其他Platform/Governance/Replay/Worker路由、BACKTEST完整业务路径和UI篡改仍缺，不重复已完成L07/L08提取 |
| P4规则一致性 | 先列出CN/US回测与Paper当前规则差异，再按已有要求补费用/结算/公司行动等固定输入对照 | 同信号/成交输入下数量、金额、费用、现金/应收与结算逐项一致，或对未支持输入明确拒绝 | 部分对照通过，父项未关闭 |
| P5后台业务闭环 | 固定双市场AUTO、Governance暂停/跨币种拒绝及CN_A UNKNOWN原单查询恢复已完成Web/API/CLI/export隔离纵切；真实服务使用PostgreSQL Outbox、JetStream、Temporal、FakeBroker和独立账本核对 | Web关闭后继续；同Run CLI只读核对；拒绝/暂停/UNKNOWN/错过窗口和故障重启无重复；全V1配对恢复与资源/环境检查 | V1.5四场景完整隔离E2E exit 0，UNKNOWN提交后响应丢失和原单查询短暂不可用均按固定顺序注入，CN原单重放、US控制单仅执行一次，最终双市场各1订单/Fill且匹配；证据见[机器审计](../evidence/audits/2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-e09b3c5a08f1a6594056.json)。多日终、其它拒绝/窗口场景、预算独立对账、完整V1/Artifact恢复、Ubuntu和人工验收仍开放 |
| P6逐阶段交付 | 各包完成即补手册和对应阶段状态，工程齐备后交付当前版本验收包 | 手册实测、适用代码/业务/浏览器检查、历史证据、目标环境及真实用户签署分别满足；Verifier通过 | 未关闭；不能等最后才补Web或交接 |

当前完成A03范围核对，A01逐项证据关联仍进行中；A04发现并补上V1.1隔离迁移/双存储集成检查，迁移、历史保留、幂等、冲突回滚、owner隔离及HTTP持久性通过；本轮复核`baseline:check`当前工作树exit 0（29生成器、111消费者规则、8个配置服务层扫描、46项基础测试），并为V1.1-S2-L14补16条精确测试引用。随后按V1.1–V1.5代码/OpenAPI形成首轮[跨服务调用与发布矩阵A05](../evidence/audits/2026-10-09-v1-cross-service-route-matrix-a05.md)，列出Platform、Trade、Replay、Portfolio、Governance、Quant、Market Data调用边及其已知缺口；此为首轮枚举；2026-10-09又把核心operationId映射到生成客户端方法和应用调用点，并纠正Replay侧只初始化/读取Portfolio、没有直接结算操作的判断；治理执行授权/验证、AUTO Mandate预算/结算、Artifact/Market Data/V1.5逐操作映射、完整身份负测及迁移发布顺序仍未闭合，L14仍OPEN；活动存储未切换。A05进一步核对启动入口发现各V1领域服务多在运行时内联schema初始化；本轮为Portfolio现有schema加事务化版本1 baseline/migration ledger、advisory lock、失败回滚和未知版本拒绝，隔离PostgreSQL验证legacy baseline纳管与并发启动唯一记录。Portfolio typecheck/单测5/5、PG集成6/6和V1.3完整code suite均通过（[日志](../evidence/audits/2026-10-09-v13-portfolio-migration-code-suite-a01.log)，[SHA-256](../evidence/audits/2026-10-09-v13-portfolio-migration-code-suite-a01.log.sha256)）。随后为Governance授权/Proposal/Mandate/策略快照初始化也加事务化V1 baseline与migration ledger；临时随机PG并发启动两个Governance进程，之后验证版本记录唯一并继续完成服务身份/授权HTTP smoke，PASS并删库（[日志](../evidence/audits/2026-10-09-v1-governance-migration-http-a01.log)，[SHA-256](../evidence/audits/2026-10-09-v1-governance-migration-http-a01.log.sha256)）。Portfolio、Governance、Trade、Replay现均有事务化V1 migration ledger及服务专属账本；Governance/Replay共享临时PG的并发启动隔离验证通过，完整V1.4 code suite退出0（[日志](../evidence/audits/2026-10-09-v14-quant-migration-code-suite-a03.log)，[SHA-256](../evidence/audits/2026-10-09-v14-quant-migration-code-suite-a03.log.sha256)），迁移HTTP smoke通过（[日志](../evidence/audits/2026-10-09-v1-replay-migration-http-a01.log)，[SHA-256](../evidence/audits/2026-10-09-v1-replay-migration-http-a01.log.sha256)）；无降级脚本或独立迁移CLI，Quant/Market Data部署前迁移核对仍待。将Trade纳入后最新完整V1.3 code suite退出0（[日志](../evidence/audits/2026-10-09-v13-migration-ledgers-code-suite-a03.log)，[SHA-256](../evidence/audits/2026-10-09-v13-migration-ledgers-code-suite-a03.log.sha256)）；此前Governance改动后也通过（[日志](../evidence/audits/2026-10-09-v13-governance-migration-code-suite-a02.log)）（[日志](../evidence/audits/2026-10-09-v13-governance-migration-code-suite-a02.log)，[SHA-256](../evidence/audits/2026-10-09-v13-governance-migration-code-suite-a02.log.sha256)）；全L14保持OPEN。详见[A04父项拆分](../evidence/audits/2026-10-09-v1-crosswalk-parent-decomposition-a04.json)、[当前baseline日志](../evidence/audits/2026-10-09-v11-contract-layer-baseline-a01.log)和[V1.1阶段记录](./prd/v1-local-simulation/01-environment-and-web-center.md)。A08新增USD Fixture Quant/FakeBroker/PostgreSQL BUY/SELL对照（合成固定费用，非真实美国规则），V1.4 code suite完整重跑退出0（[日志](../evidence/audits/2026-10-09-v14-code-suite-a08.log)），P4仍缺完整账本与结算对照；新增确认Portfolio SELL Fill立即增加可用现金，结算应收状态/日期缺失，故卖出款可能被后续BUY提前使用；XMK-03现已单列为OPEN；双市场Paper结算日历/释放口径登记为OD-014，未决时必须阻断相关SELL→BUY链，详情见[A08证据](../evidence/audits/2026-10-09-v14-us-fixture-parity-a08.json)。A05已准备[OD-013 Artifact保留决策包](../evidence/audits/2026-10-09-v1-artifact-policy-decision-package.md)，供精确期限/保护类别/清理协议决定；未擅自填期限或启动清理。同期`contracts:check`通过（29生成器、111消费者规则）。详细见[A04运行记录](../evidence/audits/2026-10-08-v1-development-run.md#2026-10-09-a04v11隔离存储与迁移覆盖补齐)和[机器证据](../evidence/audits/2026-10-09-v11-persistence-migration-a04.json)。A06/P2新增V1.2 Artifact至Governance快照逐字段血缘（7/7）、不足历史零副作用预检（8/8），并修复缺失会话窗口桥接；缺失样本与退市日期边界定向验证及改动后完整V1.2门禁均通过（[摘要](../evidence/audits/2026-10-09-v12-session-gap-a06-summary.json)）。A01交叉索引已补充V1.2缺失/退市断言和“研究快照不直接激活交易”的消费边界（[交叉索引](../evidence/audits/2026-10-09-v1-requirement-test-crosswalk.json)）；真实市场日历、P3消费端与完整输入交接仍开放，不证明P2关闭。A11环境子项运行Platform API `verify:compat`：linux/arm64原生及linux/amd64仿真探针均PASS（[汇总](../evidence/audits/2026-10-09-v1-compatibility-probes.json)），完整栈、Qlib/RD-Agent、资源压力和Ubuntu实机仍未验证。随后继续逐项检验A05调用映射并推进P1/P2工程，再按依赖进入P3/P4和P5交易/日终后台纵切；未改变代码或输入时不重复整轮五阶段回归。A02证据保护已关闭，详见[执行记录](../evidence/audits/2026-10-08-v1-development-run.md#2026-10-09-a02证据写入保护)。没有V1必需项依据的改动放回后续版本；不重复已完成L07/L08提取，不把“任意故障”当无限工程任务。

## 4. 决定、历史缺口与范围疑点

2026-10-09 A07/P3新增逐腿预算边界证据：Mandate逐腿检查securityScope并汇总notional与fee，超单笔/累计预算拒绝；V1.3 AUTO/MANUAL多腿提案在预算/组合预留和执行授权前拒绝，固定命令构造器拒绝多腿形状。[机器证据](../evidence/audits/2026-10-09-v13-per-leg-authorization-a07.json)，定向Governance/AUTO/MANUAL协调/命令测试分别6/6、8/8、5/5、9/9，两服务类型检查通过。该切片未实现多腿执行和跨腿资金净额，因此P3继续开放，阶段复选框不变。

| 项目 | 归属/下一步 | 未满足时 |
|---|---|---|
| OD-013 Artifact保留/保护/清理 | 开发者准备具体期限、保护类别、dry-run目标和恢复依据；所有者决定，回写[原登记表](./decisions/open-decisions.md) | 不启用默认到期/物理删除，不由开发者猜期限 |
| V1.1活动存储切换 | 先按[原Runbook](./operations/v11-test-run-storage-cutover.md)准备副本演练、目标资源、维护窗口、writer顺序、负责人/回退；再取得针对实际操作的批准 | 不暂停活动writer、不迁移活动卷；隔离工程继续 |
| OD-007活动策略 | 精确版本/市场/参数/资金/风险和授权决定归所有者；明确区别隔离Fixture交易测试 | 活动策略保持准备态；不把它误作所有固定模拟用例的阻塞 |
| 目标Ubuntu/手册归属 | 共同规则要求V1/V2目标架构尝试和缺口登记、V3真实迁移；现有V1阶段另含实机待办。先逐项核对原要求与证据，若调整归属须需求差异/去向及明确范围决定 | 不自行把Ubuntu要求从V1删除，也不以M1仿真替代实机 |
| 历史Run缺失 | 原UUID恢复来源/结果回原验收记录；可恢复则补原导出，不可恢复则记录缺失及后续处置决定 | 不拿新Run替换UUID，不删除失败/旧签署以放行 |

本轮V1历史结构化导出未决为4个，取代旧摘要的“7个”，不改写历史审计：

- V1.2：`5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`。
- V1.5：`25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`。

## 5. 后续维护与汇报

每次只汇报：本次关闭哪项既有要求、证据链接、仍阻塞什么、下一项具体交付。更新本页当前表、原工作包及对应阶段/99验收；不把完整日志追加进摘要，不新建竞争总计划。需求变更同时更新追踪/架构/合同/测试；一般证据更新不另造需求。

验证按改动范围选择代码与业务检查。需求/验收/证据关联变化时重跑对应版本门禁；共享代码影响到其他阶段时补适用回归。有新变化才重复完整套件；文档修复通过链接/格式检查不代表业务通过。

仓库根目录的当前状态核对命令：

```bash
node scripts/verify-version.mjs --version V1
node scripts/verify-version.mjs --version V2
node scripts/verify-version.mjs --version V3
pnpm docs:check
git diff --check
```

前三项本轮预期exit 2/INCOMPLETE；0仅限全部必需门禁满足，1表示失败。仅有此次文档整理不应改变它们为PASS。当前页面URL、固定输入和运行命令执行时从对应阶段第8节取得，历史随机端口不代表现在仍在运行。

2026-10-09继续执行P1/A04：Replay、Quant Research、Market Data分别采用服务专属迁移账本和事务化V1 baseline；Market Data还验证升级前遗留业务行保留、双进程并发、幂等及未知版本拒绝。隔离HTTP/迁移测试、V1.2完整代码套件、V1.4完整代码套件均退出0，详见[Replay/Governance并发HTTP日志](../evidence/audits/2026-10-09-v1-replay-migration-http-a01.log)、[Quant迁移日志](../evidence/audits/2026-10-09-v14-quant-migration-a01.log)、[Market Data迁移与遗留行日志](../evidence/audits/2026-10-09-v12-market-data-migration-a03.log)、[V1.2完整套件](../evidence/audits/2026-10-09-v12-market-data-migration-code-suite-a01.log)、[V1.4最终完整套件](../evidence/audits/2026-10-09-v14-market-data-migration-code-suite-a04.log)。`pnpm docs:check`检查5723个本地Markdown链接、0失败。最新门禁a62依然exit 2，且没有降级/部署前统一迁移CLI或活动库升级；活动切换仍未授权，P1/A04不关闭。


2026-10-09 P1/A04最新进展：独立部署前迁移CLI已实现，并对V1.1～V1.4范围内七个服务逐阶段运行隔离PostgreSQL；空库需迁移/应用/READY/重复应用/未知版本拒绝均通过，四个完整阶段代码套件exit 0：[V1.1](../evidence/audits/2026-10-09-v11-migration-cli-code-suite-a05.log)、[V1.2](../evidence/audits/2026-10-09-v12-migration-cli-code-suite-a01.log)、[V1.3](../evidence/audits/2026-10-09-v13-migration-cli-code-suite-a03.log)、[V1.4](../evidence/audits/2026-10-09-v14-migration-cli-code-suite-a01.log)，Runbook见[迁移说明](./operations/v1-database-migrations.md)。正式门禁更新为[a84](../evidence/audits/2026-10-09-v1-version-gate-a84.log)：INCOMPLETE/exit 2；文档PASS，证据审计443引用、43份Manifest、141项PASS。四个历史Run结构化导出仍缺失，五阶段仍未关闭；活动数据库迁移/配对恢复、OD-014所有者决定、目标环境证据及本人验收也未满足。

2026-10-09补齐V1.5：迁移CLI套件新增后台阶段所需Platform API、Governance、Trade Execution、Portfolio Risk四服务；专项隔离PostgreSQL测试PASS，纳入后的V1.5完整代码套件exit 0（RUN_EXIT=0），见[专项迁移日志](../evidence/audits/2026-10-09-v15-migration-cli-a02.log)及[完整套件日志](../evidence/audits/2026-10-09-v15-migration-cli-code-suite-a02.log)。V1.1～V1.5阶段迁移检查现在均有代码门禁入口。

2026-10-09 P5恢复增量：执行Artifact卷只读备份/临时恢复烟测，33文件/1945字节逐文件SHA匹配，退出0；该烟测未暂停发布写入方，不能证明数据库与Artifact同一时间点配对一致。证据见[运行日志](../evidence/audits/2026-10-09-v1-artifact-volume-backup-restore-a01.log)。P0/A01路径与精确测试名复核更新后为145项、1033条来源/证据路径、88个精确测试名全部存在/命中；[最新审计](../evidence/audits/2026-10-09-v1-crosswalk-link-audit-a02.json)。

2026-10-09 P0历史Run来源探测：对运行中的主Platform API无身份GET返回401，默认测试用户对四个UUID均404；当前V1.2备用API地址同一V1.2 UUID均404。无Shell导出会话Cookie，in-app浏览器无本地验收页面；只检查项目Docker卷名称，不挂载/改动数据。探针[JSON](../evidence/audits/2026-10-09-v1-historical-run-api-probe-a01.json)与[SHA-256](../evidence/audits/2026-10-09-v1-historical-run-api-probe-a01.json.sha256)已保存。结论是当前在线API不持有四条Run，不等于所有离线备份不存在；需原始备份或用户登录的正式导出来源，历史证据缺口仍OPEN。

2026-10-09 P3/A07增量：把Trade Execution 13个POST写入口的允许/拒绝身份、403响应及零FakeBroker副作用逐项列入[A05子矩阵](../evidence/audits/2026-10-09-v1-cross-service-route-matrix-a05.md#v13-trade-execution-写入口身份拒绝子矩阵2026-10-09)，其依据是隔离PG smoke及改后完整V1.3代码套件。V1.3所有服务接受路径和BACKTEST/Web边界仍未关闭。

本轮A09/P5新增AUTO工作流完成前的CN/US Portfolio+FakeBroker终态复读与精确账本核对，差异阻止完成保存；定向测试16/16、V1.5完整code suite exit 0（Python Worker 14/14）、四场景隔离Web/API/CLI/export E2E PASS。证据见[a30](../evidence/audits/2026-10-09-v15-terminal-reconciliation-code-suite-a30.log)与[四场景E2E](../evidence/audits/2026-10-08-v15-nats-temporal-dispatch-sq-v15-e2e-230c4258f848db04ca52.json)。a99正式门禁仍INCOMPLETE/exit 2，审计PASS（473引用、49 manifests、147条目）；详见[门禁日志](../evidence/audits/2026-10-09-v1-version-gate-a99.log)及[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a99.log.sha256)。该复核不等于多日交易或日历日终。

本轮A10/P5补入已完成AUTO Run重复派发隔离E2E：同eventId新JetStream消息由原Temporal Workflow ID幂等接收，Trade/Portfolio/Governance独立读回证明订单和Fill仍2笔、每市场Mandate消费仍1次、账本计数与现金持仓未变化；Harness和精确资源清理PASS。证据：[运行报告](../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-9d20807a341936dceaf1.json)。仍未覆盖活动中重复消息及其他交易恢复，A10未关闭。

2026-10-09 V1正式门禁a100：纳入A10已完成AUTO Run同ID重复派发证据后重跑，版本仍INCOMPLETE/exit 2；阶段文档审计PASS，证据审计PASS（476引用、49 manifests、147条目），4个历史TestRun结构化导出仍缺失，五阶段当前交付/人工验收/Ubuntu实机证据仍开放。日志：[a100](../evidence/audits/2026-10-09-v1-version-gate-a100.log)及[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a100.log.sha256)。

2026-10-09 P5/A09、A10本轮增量：V1.5新增`v1.5-auto-trade-calendar-2`，CN/US各三日合成日历；首日错过后，两日各自创建独立Proposal/Mandate、成交并在收盘前后分别核对Fill与双账本。四场景normal/AUTO/rejection/recovery的隔离Web/API/CLI/export E2E PASS，Run IDs见[机器审计](../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-aede7e79765691df51db.json)，SHA-256 `79ee291fc37992e32f6c781d85be0542ab7e6d6dd053718b1dd857673b3414a5`；V1.5 `verify:stage -- --stage V1.5 --suite code`退出0，[完整日志](../evidence/audits/2026-10-09-v15-multi-session-code-suite-a01.log)，SHA-256 `c872609248da52cef548fe4756f4a786962a78bd51cb241bfd4180e021ab219d`。这些只证明固定合成日期和隔离切片，不等于真实市场日历、实时时钟、连续调度或结算。阶段及验收文档已同步；V1正式门禁待基于本次更新重跑，V1.5人工验收、目标Ubuntu及其它V1开放项未关闭。

2026-10-09正式V1门禁a147：退出2，状态`INCOMPLETE`；阶段文档审计PASS、证据审计PASS（541个引用/57份Manifest/196项），但历史Run结构化导出与版本关闭要求未满足。完整门禁结果与SHA见[a147日志](../evidence/audits/2026-10-09-v1-version-gate-a147.log)。当前V1.5自动化通过不代表V1版本关闭；人类验收、Ubuntu实机、OD-014/结算与其它阶段交付继续开放。

2026-10-09最终文档更新后的V1门禁a148仍`INCOMPLETE`/exit 2；阶段文档与证据审计PASS（542/57/196），四条历史TestRun缺结构化导出，OD-014/结算、Ubuntu及新增范围人工验收等关闭条件仍开放。[a148日志](../evidence/audits/2026-10-09-v1-version-gate-a148.log)，SHA-256 `e75ce25e5ee464728e97d589496a1fa3a4600e8819a636f5ae8a256b0f239cae`。

2026-10-09 A11/P5隔离配对卷恢复复验：随机Harness备份并恢复V1.5领域PostgreSQL、JetStream、Temporal三卷；恢复后同一normal Run `8ef52eac-6050-40c9-9aa7-bc9ac821cb31`仍可读，`V1.5-HOLD-002` 120项观察PASS，JetStream ack/delivered状态保留；四场景E2E及精确隔离资源清理通过。报告：[机器证据](../evidence/audits/2026-10-09-v15-paired-backup-restore-sq-v15-e2e-0b9eff3c4bb85ced2ff0.json)，SHA-256 `91d8f509753dd03461c6280a72ec368ec3f78607fa546cb380cbc9e011e9fb42`。本Harness不含独立Artifact卷或全V1服务组合，恢复Run check-only exit 2是因V1.5另有未完成AUTO断言；不能据此声称全V1灾备/RPO-RTO或版本通过。

2026-10-09正式V1门禁a101：纳入A11新隔离配对卷恢复报告后，`pnpm verify:version -- --version V1`仍为INCOMPLETE/exit 2；阶段文档与证据审计通过（477引用、49 manifests、147条目），四个历史结构化TestRun导出、五阶段收尾、OD-014所有者决定、当前范围人工验收和目标Ubuntu实机证据仍未满足。日志：[a101](../evidence/audits/2026-10-09-v1-version-gate-a101.log)及[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a101.log.sha256)。

2026-10-09 A11 Artifact补充：按只读、无网络、无写层容器再次快照`stockquant-v12_research-artifacts-v1`并临时恢复；33个文件/1945字节逐文件SHA完全匹配，卷未写、服务未重启。与同日V1.5 PostgreSQL/JetStream/Temporal恢复证据分别证明两个环境的可恢复性，但不是同一时间点数据库+Artifact配对恢复；证据[日志](../evidence/audits/2026-10-09-v1-artifact-volume-backup-restore-a02.log)，SHA-256 sidecar已保存。

2026-10-09正式V1门禁a102：纳入A11 Artifact卷读恢复证据后，V1仍INCOMPLETE/exit 2；阶段文档与证据审计通过（477引用、49 manifests、147项）。Artifact卷单独恢复不满足数据库+Artifact一致快照的A11要求；历史Run、五阶段交付、OD-014、人工及Ubuntu证据仍开放。日志：[a102](../evidence/audits/2026-10-09-v1-version-gate-a102.log)和[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a102.log.sha256)。

2026-10-09 A11生产配对工具隔离端到端：新增`pnpm test:backup:cluster-isolated`，随机Compose集群通过正式初始化脚本生成全部10个V1服务数据库/角色，种入合成Published ArtifactRef及内容Hash，调用生产`create-cluster-paired-backup`并在无网络隔离PostgreSQL恢复；数据库/角色、Artifact引用和字节Hash均核对通过，临时容器/网络/卷精确清理。报告：[JSON](../evidence/audits/2026-10-09-v1-isolated-cluster-paired-backup-4d8fbaa077eb41cc.json)，SHA-256 `90459d47827604beb09ddc0dd56a9ab965ff0c4ef0879a0ab036ad0b464d2a1`。该测试证明生产工具隔离配对链路，不含真实跨服务业务Run/FakeBroker、同点NATS/Temporal或宿主/异地RPO/RTO验收。

2026-10-09正式V1门禁a103：纳入生产配对备份器隔离端到端证据及A11阶段交付后重跑，仍为INCOMPLETE/exit 2；阶段文档/证据审计PASS（480引用、49 manifests、147项）。历史4个TestRun结构化导出、OD-014决定、实际业务数据配对恢复/环境、五阶段当前交付、人工与Ubuntu验收继续未满足。日志：[a103](../evidence/audits/2026-10-09-v1-version-gate-a103.log)及[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a103.log.sha256)。

2026-10-09基线复核a03：在新增隔离配对备份入口后重跑`pnpm baseline:check` exit 0；Markdown链接、292 JSON/205 Schema/48 Fixture、合同生成/兼容、Artifact内容存储、8个服务分层及51项脚本测试全部通过。日志：[a03](../evidence/audits/2026-10-09-v1-baseline-check-a03.log)，SHA-256见侧车。

2026-10-09正式V1门禁a104：纳入a03共享基线复验及A11配对备份器E2E后仍为INCOMPLETE/exit 2；阶段文档/证据审计PASS（480引用、49 manifests、147项），但历史TestRun导出、OD-014、实际跨服务业务/后台配对恢复、五阶段交付、人工及Ubuntu验收未完成。日志：[a104](../evidence/audits/2026-10-09-v1-version-gate-a104.log)及[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a104.log.sha256)。

2026-10-09 A07/P3：V1.3隔离Web E2E新增Platform API匿名/伪造用户身份矩阵，5个只读/写入入口均分别返回401/403，完整Playwright 21/21通过并精确清理隔离资源。21个TestRun仍是平台`WAITING/NOT_RUN`，不把认证探针误记作交易业务断言。报告及TestRun/Manifest映射：[JSON](../evidence/audits/2026-10-09-v13-platform-identity-boundary-a01.json)，SHA-256 `f5eee74bd270ee3d97a15340f83b9c0251e7dbf259c4a3b341d11c72f5e163dd`；A05矩阵已更新。仅关闭这五条Platform路由的会话身份边界子项，其他Platform路由、Governance/Replay/Worker边界、BACKTEST完整路径和UI篡改仍开放。

2026-10-09正式V1门禁a105：纳入A07新增的Platform身份边界报告及A05路由矩阵后，`pnpm verify:version -- --version V1`为INCOMPLETE/exit 2；阶段文档审计PASS，证据审计PASS（482引用、49份Manifest、147项）。`docs:check`通过（5943个本地Markdown链接、0失败）。四个历史TestRun结构化导出、五阶段工程/交付收尾、OD-014决定、当前范围人工签署、目标Ubuntu实机及配对业务恢复仍未完成。日志：[a105](../evidence/audits/2026-10-09-v1-version-gate-a105.log)及[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a105.log.sha256)；文档校验：[日志](../evidence/audits/2026-10-09-v1-docs-check-a01.log)。

2026-10-09 A07/P3继续：将V1.3 Platform身份拒绝探针从5个代表路由扩至控制器全部23个用户API操作及账户读取，共24条；匿名24/24为401，伪造用户头24/24为403，隔离完整E2E 21/21通过，随机项目资源精确清理，外部来源/真实券商调用0。机器证据及当轮21个TestRun/Manifest：[a02 JSON](../evidence/audits/2026-10-09-v13-platform-identity-boundary-a02.json)，SHA-256 `dcef8cca976f25ec2b47c2c4cdf719535a02ad1a18076251d6caba70a24419a1`；矩阵和V1.3手册已同步。所有TestRun业务断言仍`WAITING/NOT_RUN`，仅关闭V1.3 Platform用户API身份拒绝子项。

2026-10-09正式V1门禁a106：纳入V1.3 Platform全24路由身份矩阵后，阶段文档审计PASS、证据审计PASS（484引用、49份Manifest、147项），但V1仍`INCOMPLETE`/exit 2；四个历史TestRun导出、P1～P5剩余工程与交付、OD-014所有者决定、当前范围人工验收、目标Ubuntu和实际业务数据配对恢复继续未满足。`docs:check`通过（5953链接、0失败）。日志：[a106](../evidence/audits/2026-10-09-v1-version-gate-a106.log)和[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a106.log.sha256)；文档日志：[a02](../evidence/audits/2026-10-09-v1-docs-check-a02.log)。

2026-10-09正式V1门禁a107：复核a02报告引用后，阶段文档审计PASS，证据审计PASS（484引用、49份Manifest、147项）；V1仍`INCOMPLETE`/exit 2。历史TestRun导出、五阶段剩余工程/交付、OD-014、当前范围人工验收、Ubuntu实机和真实业务配对恢复继续未满足。日志：[a107](../evidence/audits/2026-10-09-v1-version-gate-a107.log)及[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a107.log.sha256)。

2026-10-09 A07/P3路由覆盖更正与闭环：源码对照发现V1.3 Platform控制器实际25个操作，上一轮a02仅探测23个控制器操作+账户详情；a02已更正为`PARTIAL_SUPERSEDED`，其证据不再被描述为全覆盖。Harness新增源码路由提取/逐项唯一匹配断言；补齐TestRun读取、Fill费用更正后，26路由匿名26/26为401、伪造身份26/26为403，完整隔离E2E 21/21通过。随机Compose容器/网络/卷清理成功；外部源/真实券商0。最终机器报告：[a03](../evidence/audits/2026-10-09-v13-platform-identity-boundary-a03.json)，原始E2E日志及SHA：[日志](../evidence/audits/2026-10-09-v13-platform-route-inventory-e2e-a02.log)。21个Run依旧`WAITING/NOT_RUN`，只关闭V1.3 Platform用户API身份拒绝子项。

2026-10-09正式V1门禁a108：纳入身份路由覆盖纠正与最终a03报告后，阶段文档审计PASS、证据审计PASS（485引用、49份Manifest、147项），但版本仍`INCOMPLETE`/exit 2。四个历史TestRun导出、其余工程/交付、OD-014、当前范围人工验收、Ubuntu实机和实际业务配对恢复继续未满足。`docs:check`通过（5969链接、0失败）。日志：[a108](../evidence/audits/2026-10-09-v1-version-gate-a108.log)及[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a108.log.sha256)；文档日志：[a03](../evidence/audits/2026-10-09-v1-docs-check-a03.log)。

2026-10-09 A10/P5在途暂停增量：V1.5固定CN AUTO交易中，Harness在Mandate授权后、Portfolio预留/FakeBroker发送前暂停同一Mandate；已授权订单仍完成，且同Run重复派发后独立读回仍为2订单/2 Fill、CN/US预算各消费1次，未增加预留/释放。隔离Web/API/CLI/export E2E 1/1通过，TestRun `99e89273-9912-4123-8789-0c3cd34391a9`；[机器报告](../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-8fd1dd0df18b40b97b68.json)，SHA-256 `f3e0baf72cff33d68dd7df78aa419d56d5dbd2fa49b2e2b5987aff0af66a8b72`；[原始日志](../evidence/audits/2026-10-09-v15-inflight-pause-e2e-a04.log)，SHA-256 `af3410adb9a454691503671f2a50c17e820b61715f380e6e16ddbd574bb9ffed`。修正文档链接与镜像可用性后，受影响完整V1.5 code suite exit 0，含Python Worker 14/14、服务及隔离数据库检查：[日志](../evidence/audits/2026-10-09-v15-inflight-pause-code-a03.log)。A10/P5仍开放，其他未满足V1门禁继续保留。

2026-10-09正式V1门禁a109：纳入A10在途暂停机器报告后，五阶段文档审计PASS，证据审计PASS（489引用、50份Manifest、148项），但版本仍`INCOMPLETE`/exit 2；4条历史结构化Run导出及各阶段交付/验收、OD-014、Ubuntu实机和真实业务数据配对恢复仍未满足。新增受影响V1.5 code suite未完成（锁定Python测试镜像不可用，exit 2）；不把本轮E2E通过误记为代码套件或阶段通过。日志：[a109](../evidence/audits/2026-10-09-v1-version-gate-a109.log)及[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a109.log.sha256)；[文档校验a05](../evidence/audits/2026-10-09-v1-docs-check-a05.log)，5981链接/0失败。

2026-10-09 V1.5最终代码套件复验：使用锁定Python Worker镜像后，`pnpm verify:stage -- --stage V1.5 --suite code` exit 0；同一轮完成baseline、服务测试/类型/构建、Python Worker 14/14、迁移CLI和隔离PostgreSQL检查。日志：[a03](../evidence/audits/2026-10-09-v15-inflight-pause-code-a03.log)及[SHA-256](../evidence/audits/2026-10-09-v15-inflight-pause-code-a03.log.sha256)。本次仅证明代码套件，不等于P5/V1通过。

2026-10-09正式V1门禁a115：纳入同Mandate暂停后拒绝新订单/完成在途授权Fill、V1.5 code suite及交叉索引a03后，五阶段文档审计PASS，证据审计PASS（493引用、52份Manifest、150项），版本仍`INCOMPLETE`/exit 2。4条历史结构化Run导出、OD-014、剩余交付/业务验收、Ubuntu实机及实际业务数据配对恢复继续开放。`docs:check`通过（5998链接、0失败）。日志：[a115](../evidence/audits/2026-10-09-v1-version-gate-a115.log)及[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a115.log.sha256)；[文档校验a12](../evidence/audits/2026-10-09-v1-docs-check-a12.log)。

2026-10-09 A10/P5同Mandate暂停拒绝与在途Fill联合断言：在同一CN AUTO TestRun中，授权后Mandate暂停；新的同owner/账户/Proposal/Mandate唯一订单请求返回403/`MANDATE_INACTIVE`，随后原授权订单仍完成。复验TestRun `f29f31f1-b357-44f9-b201-387a50077807`，四场景Web/API/CLI/export E2E 1/1通过；独立预算与账本保持2订单/2 Fill、CN/US各消费一次、无新增预留/释放，[报告](../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-91f6525571ab14125e64.json)，SHA-256 `14a502642c21f5230681745240633fe0fad5a7a033d5629e09e37fd2d24a6b99`。变更后完整V1.5 code suite再次exit 0：[a04](../evidence/audits/2026-10-09-v15-inflight-pause-code-a04.log)，SHA-256见sidecar。仅关闭该固定时序场景子项，不覆盖多日/日终、撤销在途Fill、窗口遗漏或交易Worker故障恢复。

2026-10-09 A01/P0交叉索引局部更新：V1.5-S2-L18关联Mandate暂停拒绝及活动/完成AUTO Workflow重复派发幂等E2E；a04逐路径/精确测试名存在性复核覆盖145条要求、164个唯一来源/证据路径与91个精确测试名引用，0缺失。审计只验证引用存在，不验证要求完整性或行为通过；A01整体及其余父项仍OPEN。[更新后的索引](../evidence/audits/2026-10-09-v1-requirement-test-crosswalk.json)、[a04审计](../evidence/audits/2026-10-09-v1-crosswalk-link-audit-a04.json)。


2026-10-09 V1.5 AUTO单日收盘对账增量：新增冻结的合成单日双市场开/收市Fixture（`v1.5-auto-trade-calendar-1`，SHA-256 `104fd63a1dcaa3bd9e939e4304db0e033376ba140c4e26a36dfacacadc1b9103`），AUTO Fill须在会话开盘至收盘之间；Temporal活动完成后重新读取Portfolio与FakeBroker，保存`V1.5-AUTO-EOD-RECON-001`。Web显示CN/US收盘UTC时间和独立对账状态，同Run CLI只读检查与export通过。四场景隔离E2E PASS，normal/AUTO/rejection/recovery TestRun见[机器报告](../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-c234b158137aec968ebd.json)，SHA-256 `c20b288003adc8267ec40fdedc25595b529b27b28fdc694c7b22f2b16f5ba585`；外部源/真实券商调用0、隔离容器/网络/卷清理PASS。该项只覆盖一个合成交易日，不代表多日调度、市场日历完整性或结算。受限沙箱首次V1.5代码套件因无法看到本机锁版Python Docker镜像exit 2；只读检查确认镜像存在，受控Docker重跑结果见[最终代码套件a02](../evidence/audits/2026-10-09-v15-single-session-eod-code-suite-a02.log)及SHA sidecar。V1整体门禁仍须复验，不能以该V1.5切片替代其他阶段、历史Run导出、OD-014、全V1业务/Artifact配对恢复、Ubuntu或人工验收。


2026-10-09正式V1门禁a117：在V1.5单日EOD实现及最终四场景E2E之前的文档证据同步后复验，五阶段文档审计PASS、证据审计PASS（497引用、53份Manifest、151项），正式版本仍INCOMPLETE/exit 2。缺口包括V1.2/V1.5历史TestRun结构化导出、剩余阶段工程/交付、OD-014、当前范围用户验收、目标Ubuntu实机及覆盖真实业务与Artifact的配对恢复。日志：[a117](../evidence/audits/2026-10-09-v1-version-gate-a117.log)，SHA-256见[sidecar](../evidence/audits/2026-10-09-v1-version-gate-a117.log.sha256)。


2026-10-09正式V1门禁a118：同步最终V1.5单日EOD E2E、代码套件日志及阶段/验收文档后重跑，阶段文档审计PASS、证据审计PASS（497引用、53份Manifest、151项），版本仍INCOMPLETE/exit 2。缺少的历史TestRun结构化导出、剩余阶段工作包与交付、OD-014、真实业务与Artifact配对恢复、目标Ubuntu及当前范围人工验收继续未满足。文档链接检查a14为6009链接/0失败；[a118门禁](../evidence/audits/2026-10-09-v1-version-gate-a118.log)，SHA-256见sidecar；[a14文档日志](../evidence/audits/2026-10-09-v1-docs-check-a14.log)。


2026-10-09正式V1门禁a119：V1.5单日EOD工程、最终E2E/code-suite证据和验收文档已纳入，阶段文档审计PASS，证据审计PASS（497引用、53份Manifest、151项）；正式V1仍INCOMPLETE/exit 2。历史V1.2/V1.5 TestRun导出、V1.1–V1.5剩余交付、OD-014、目标Ubuntu、实际全域业务/Artifact配对恢复和当前范围人工验收仍是未关闭项。[a119门禁](../evidence/audits/2026-10-09-v1-version-gate-a119.log)，SHA-256见sidecar；文档链接/格式检查见[a15](../evidence/audits/2026-10-09-v1-docs-check-a15.log)。

2026-10-09 P0/V1.5-S2-L17交叉索引纠正：原测试映射仍指向已删除的“日终未实现”单测名称，现改为当前单日收盘单测、EOD assertion、正式Web E2E、Fixture及最新代码/E2E报告；明确父项仍因多日调度/结算/恢复保持PARTIAL。全量交叉索引存在性复核覆盖145条要求、164条路径引用、91条精确测试名引用，0缺失；该检查只验证路径/名称存在，不代表测试行为或需求完整。[更新索引](../evidence/audits/2026-10-09-v1-requirement-test-crosswalk.json)、[a04审计](../evidence/audits/2026-10-09-v1-crosswalk-link-audit-a04.json)。

2026-10-09正式V1门禁a120：纳入最新AUTO EOD测试映射后，五阶段文档审计PASS，证据审计PASS（498引用、53份Manifest、151项），正式V1仍INCOMPLETE/exit 2；门禁具体缺失仍为原历史Run导出及阶段/环境/人工收尾。a120：[门禁日志](../evidence/audits/2026-10-09-v1-version-gate-a120.log)，SHA-256见sidecar。

2026-10-09 V1正式门禁a121：V1测试计划/验收表加入`V1.5-AUTO-EOD-RECON-001`的单日Fixture收盘验证要求并明确多日/结算单独验收；阶段文档审计PASS，证据审计PASS（498引用、53份Manifest、151项），版本仍INCOMPLETE/exit 2。V1.2一条及V1.5三条历史Run结构化导出缺失；另有工程交付、OD-014、Ubuntu/Artifact配对恢复和人工验收未完成。见[a121日志](../evidence/audits/2026-10-09-v1-version-gate-a121.log)及[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a121.log.sha256)。

2026-10-09 V1.5活动AUTO Workflow重复投递幂等通过：相同TestRun/eventId使用新JetStream Msg-ID，在CN_A Activity活动期间投递；稳定Temporal Workflow ID识别已运行Workflow并ACK新消息。四场景Web/API/CLI/export E2E exit 0，CN/US仍各1订单和1 Fill，预算仅消费一次，独立Portfolio/FakeBroker资产及账本版本未因重复派发变化；外部来源/真实券商调用0，随机隔离资源精确清理。见[阶段第8.12节](./prd/v1-local-simulation/05-scheduling-and-recovery.md)及[机器证据](../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-38f6de33ef35ba78617c.json)。该子项自动PASS不代表V1.5或V1完成；恢复/撤销、在途Fill、错过窗口、真实Ubuntu、历史Run导出、跨Artifact恢复和人工验收仍未完成。

2026-10-09正式V1版本门禁a123：五阶段文档审计PASS；证据审计PASS（501引用、53份Manifest、151项），V1仍INCOMPLETE/exit 2。当前缺少V1.5三条历史TestRun结构化导出；其余仍需完成工程/手册交付、OD-014决定及落地、完整V1 Artifact配对恢复、目标Ubuntu证据和当前范围人工验收。a123：[门禁日志](../evidence/audits/2026-10-09-v1-version-gate-a123.log)、[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a123.log.sha256)。V1.5本轮新增完整code suite exit 0见[日志](../evidence/audits/2026-10-09-v15-active-auto-duplicate-code-suite-a03.log)，文档链接检查6024项/0失败见[日志](../evidence/audits/2026-10-09-v15-active-auto-duplicate-docs-check-a04.log)。

2026-10-09正式V1版本门禁a124：五阶段文档审计PASS；证据审计PASS（502引用、53份Manifest、151项），正式V1仍INCOMPLETE/exit 2。明确缺口为4个历史业务Run结构化导出：V1.2 `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`，V1.5 `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8c173c`；另有工程/手册交付、OD-014决策和落地、完整V1 Artifact配对恢复、目标Ubuntu证据及当前范围人工验收未完成。门禁结果：[a124日志](../evidence/audits/2026-10-09-v1-version-gate-a124.log)及[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a124.log.sha256)。

2026-10-09 P1/V1.1手册收尾：在当前树实测随机交互栈`stack:up`输出真实URL/会话，Web与session 200；修复stack:down未移除本项目镜像的清理缺陷，增加4项单测并以新项目验证`stack:down` exit 0、容器/卷/网络/专属镜像/凭据0残留。`pnpm test:e2e -- --stage V1.1` exit 0，normal/rejection/recovery浏览器3/3；每个Run经同UUID CLI `--check-only`和结构化export核验，Manifest SHA一致，`manualConclusion=NOT_RUN`。手册第8.1/8.2/8.3/8.4/8.14及验收表已更新；其`VERIFIED_EXECUTABLE`仅表示隔离执行说明已实际运行，不表示V1.1人工签署、活动存储切换或阶段整体关闭。[E2E报告](../evidence/audits/2026-10-09-v11-current-worktree-e2e-a03.json)、[生命周期报告](../evidence/audits/2026-10-09-v11-interactive-stack-lifecycle-a02.json)、[stack:down修复单测](../evidence/audits/2026-10-09-v11-stack-down-images-a01.log)。


2026-10-09 V1门禁a125：阶段文档审计PASS，证据审计PASS（511引用、55份Manifest、153项），正式V1仍INCOMPLETE/exit 2。V1.1当前工作树code suite、隔离stack生命周期、normal/rejection/recovery 3/3、同Run CLI与结构化导出均通过，手册与验收表已更新；人工刷新/关闭重开检查仍未执行，故阶段保持PARTIALLY_IMPLEMENTED。仍缺四个历史Run导出、P1～P6其余交付、OD-014所有者决定、全V1业务与Artifact配对恢复、目标Ubuntu实机及当前范围人工验收。门禁：[a125日志](../evidence/audits/2026-10-09-v1-version-gate-a125.log)、[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a125.log.sha256)。

2026-10-09正式V1门禁a126（在本轮文档修订后复核）：五阶段文档审计PASS；证据审计PASS（511引用、55份Manifest、153项）；V1仍INCOMPLETE/exit 2。四个历史TestRun导出缺失，阶段剩余交付、OD-014结算决策与实现、实际业务数据/Artifact配对恢复、目标Ubuntu及当前范围人工验收仍未满足。[a126日志](../evidence/audits/2026-10-09-v1-version-gate-a126.log)。

2026-10-09 P3/V1.3当前树复核：正式E2E `pnpm test:e2e -- --stage V1.3` exit 0，Playwright 21/21；normal/rejection/recovery三Run完成同UUID CLI只读核验与结构化导出；完整code suite exit 0。独立交互栈的Web和session均200，`stack:down`精确清理成功。修正了手册固定端口/身份示例和历史“待实现”陈述；Mac ARM64隔离手册标记VERIFIED_EXECUTABLE，阶段仍PARTIALLY_IMPLEMENTED，当前范围人工验收NOT_RUN。首轮沙箱Docker socket失败保留，受控权限重跑PASS。[结构化报告](../evidence/audits/2026-10-09-v13-current-worktree-evidence-a01.json)、[E2E日志](../evidence/audits/2026-10-09-v13-current-tree-e2e-a02.log)、[Code suite](../evidence/audits/2026-10-09-v13-current-tree-code-suite-a01.log)。

2026-10-09正式V1门禁a127：V1.1与V1.3手册/证据修订后，五阶段文档审计PASS，证据审计PASS（519引用、57份Manifest、196项）；版本仍INCOMPLETE/exit 2。4个历史Run结构化导出缺失，其余阶段业务/交付、OD-014结算决策及实现、全V1配对恢复、目标Ubuntu和当前范围用户验收仍未完成。[a127门禁日志](../evidence/audits/2026-10-09-v1-version-gate-a127.log)，[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a127.log.sha256)。

2026-10-09 P3/A07增量：将当前V1.3完整代码套件中真实隔离PostgreSQL HTTP smoke已验证的Governance授权申请/校验、Mandate预算精确owner/TestRun隔离和Replay Worker read/submit/lifecycle/recover-unknown身份矩阵登记至[A05](../evidence/audits/2026-10-09-v1-cross-service-route-matrix-a05.md#v1-governance-authorization--replay-worker-服务身份与错误路径切片2026-10-09)。命令为`pnpm test:service-auth:http`（已纳入V1.3完整code suite）；有效授权绑定改载荷拒绝、并发只消费一次、重放安全，Replay错caller403、授权畸形输入422、缺失Run生命周期404、无原单UNKNOWN恢复422。只关闭明确列出的身份/拒绝子项，不代表Replay完整成功执行或P3接受路径全覆盖。

2026-10-09正式V1门禁a128（收录V1.3当前树手册及Governance/Replay身份证据后）：五阶段文档审计PASS、证据审计PASS（519引用、57份Manifest、196项）；正式V1仍INCOMPLETE/exit 2。V1.3身份拒绝子项复核未清除全版本缺口；四个历史Run导出、阶段范围交付、OD-014、完整业务/Artifact配对恢复、Ubuntu与当前范围人工验收仍未满足。[a128日志](../evidence/audits/2026-10-09-v1-version-gate-a128.log)。

2026-10-09 P4/V1.4当前树复验：`pnpm verify:stage -- --stage V1.4 --suite code`与`pnpm test:e2e -- --stage V1.4`均exit 0；E2E 5/5浏览器用例、API/Web TestRun同ID CLI核验及随机项目资源清理通过，codeVersion为`sha256:3bcb5028c1b0a5363a3ed87a0b274d5d363484d39ccbb7873441beca69012b8c`。首次`stack:up`暴露`readFileSync`导入缺失，保留失败日志后修复并完成交互栈启动、Web/API/session健康检查及精确`stack:down`清理。证据与SHA见[V1.4阶段手册](./prd/v1-local-simulation/04-daily-backtest.md)及相邻审计日志。手册仅对Mac ARM64隔离操作标记VERIFIED_EXECUTABLE；V1.4/P4仍开放：浏览器截图/Trace、完整Paper逐账对照、适用规则与OD-014结算、人工验收、Ubuntu及阶段剩余交付均未通过。

2026-10-09 V1正式门禁a129：纳入V1.4当前树代码/E2E、交互栈启动与清理记录后，`pnpm verify:version -- --version V1`仍INCOMPLETE/exit 2；五阶段结构文档审计PASS，证据审计PASS（525引用、57份Manifest、196项）。V1.2/V1.5历史TestRun结构化导出缺失，P1～P5阶段剩余工作、OD-014、全V1业务/Artifact配对恢复、Ubuntu及本轮人工验收未完成。V1.4仅部分验证隔离手册，不代表阶段通过。见[门禁a129](../evidence/audits/2026-10-09-v1-version-gate-a129.log)及[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a129.log.sha256)。

2026-10-09 P4/V1.4补齐自动化浏览器证据：E2E Harness现在对五个V1.4 Playwright场景保存PNG全页截图和Trace ZIP；当前树E2E 5/5及完整`pnpm verify:stage -- --stage V1.4 --suite code`均exit 0，临时项目清理通过。截图/Trace逐文件SHA及测试Run IDs见[捕获清单](../evidence/audits/2026-10-09-v14-browser-captures-a01.json)，E2E日志[a03](../evidence/audits/2026-10-09-v14-current-tree-e2e-a03.log)，代码套件[a03](../evidence/audits/2026-10-09-v14-current-tree-code-suite-a03.log)。操作手册标记VERIFIED_EXECUTABLE仅指Mac ARM64隔离执行步骤；V1.4仍PARTIALLY_IMPLEMENTED，人工验收、OD-014结算、完整Paper同输入账本比较、Ubuntu和剩余阶段交付未完成。

2026-10-09 V1正式门禁a130：五阶段文档审计PASS、证据审计PASS（527引用、57份Manifest、196项）；正式V1仍INCOMPLETE/exit 2。当前遗留四个V1.2/V1.5历史TestRun结构化导出缺失、P1～P5交付、OD-014所有者结算语义、全V1业务/Artifact配对恢复、目标Ubuntu和本轮人工验收。见[门禁a130](../evidence/audits/2026-10-09-v1-version-gate-a130.log)及[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a130.log.sha256)。

2026-10-09正式门禁a131：阶段文档与证据引用审计均PASS（527引用、57份Manifest、196项），V1正式结果仍INCOMPLETE/exit 2；四个历史TestRun结构化导出缺失、P1～P6剩余交付、OD-014结算决定、全V1配对恢复、Ubuntu和当前范围人工验收仍未满足。见[门禁a131](../evidence/audits/2026-10-09-v1-version-gate-a131.log)和[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a131.log.sha256)。

2026-10-09正式门禁a132：Playwright Trace已脱敏临时`sq_session`并重算逐文件Hash；五阶段文档PASS、证据审计PASS（527引用、57份Manifest、196项），V1仍INCOMPLETE/exit 2。历史Run导出、OD-014、跨服务配对恢复、Ubuntu、五阶段工程交付和本轮用户验收依然未完成。见[门禁a132](../evidence/audits/2026-10-09-v1-version-gate-a132.log)及[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a132.log.sha256)。

2026-10-09 P0/A01局部交叉索引更新：V1.4 §7-L64/L65/L68现绑定当前勾选锚点、五个浏览器E2E测试名、交互栈生命周期日志和截图/Trace逐文件SHA清单；逐项源行/测试名/引用存在性检查3/3 PASS。[更新审计](../evidence/audits/2026-10-09-v14-crosswalk-refresh-a01.json)。此项不关闭A01整体语义核验、P4业务一致性或V1.4用户验收。

2026-10-09正式V1门禁a134：V1.4交叉索引当前锚点刷新后，五阶段文档审计PASS、证据审计PASS（527引用、57份Manifest、196项），版本仍INCOMPLETE/exit 2；四个历史TestRun结构化导出及P1～P6剩余工程/决定/恢复/环境/人工验收仍未完成。见[门禁a134](../evidence/audits/2026-10-09-v1-version-gate-a134.log)及[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a134.log.sha256)。

2026-10-09 V1.5 P5错过AUTO窗口恢复切片：冻结日历升级为双日版本，首日窗口记录MISSED_WINDOW且不下旧单，次日以新Proposal/Mandate重评估并完成CN/US FakeBroker订单、收盘Portfolio/FakeBroker独立对账。Web明确展示错过窗口决定，四场景Web/API/CLI/export E2E exit 0，Run normal `9029cd9d-3ce8-497b-93fa-9c8373915a9a`、AUTO `e05cf69d-745f-4a96-b1b3-156fc4aceb2f`、rejection `fc5c1215-c7e8-434b-afa1-bbe5da288bb1`、recovery `33beef16-8ef2-4a9c-ad60-79466a297eca`；报告[JSON](../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-6e7301d0edfd5bcdb496.json)，SHA-256 `42461ec13ef7eb08c42ba5e20fba571c498a3bb26a5c9595e405e6d502bf5906`。V1.5完整code suite exit 0，含锁版Linux Python Worker 14/14、迁移CLI和隔离PostgreSQL检查；[日志](../evidence/audits/2026-10-09-v15-missed-window-code-suite-a25.log)，SHA-256 `1e7a7e8506e6db863644163fc16eccd4682c5ab762c4a7d657d0c90a936d388b`。这只关闭错过窗口Fixture子项；真实时钟延迟/多日调度、结算、撤销/在途Fill、交易故障恢复、Ubuntu与当前范围人工验收仍开放，V1总门禁未改变。

2026-10-09正式V1门禁a138：五阶段文档审计PASS，证据审计PASS（533引用、57份Manifest、196项）；V1仍INCOMPLETE/exit 2。四个历史TestRun结构化导出缺失（V1.2 `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`；V1.5 `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8c173c`），另有P1～P6交付、OD-014、全V1配对恢复、Ubuntu及当前范围人工验收未完成。门禁日志[a138](../evidence/audits/2026-10-09-v1-version-gate-a138.log)，SHA-256见[sidecar](../evidence/audits/2026-10-09-v1-version-gate-a138.log.sha256)。

2026-10-09正式V1门禁a139：更新阶段验收说明后重跑，阶段文档审计PASS、证据审计PASS（533引用、57份Manifest、196项），V1仍INCOMPLETE/exit 2；阻塞项与a138相同，未因错过窗口切片改变。见[门禁a139](../evidence/audits/2026-10-09-v1-version-gate-a139.log)及[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a139.log.sha256)。

2026-10-09 P0/A05交叉表刷新：V1.5 AUTO市场日历/错过窗口两个父项更新为双日Fixture、次日新Proposal/Mandate、最新Web/CLI/code suite证据和当前差距；源锚点、精确测试名称及证据路径逐项检查PASS（2项要求、18条证据路径，无缺失）。[审计A02](../evidence/audits/2026-10-09-v15-missed-window-crosswalk-a02.json)，SHA-256见[sidecar](../evidence/audits/2026-10-09-v15-missed-window-crosswalk-a02.json.sha256)。父项仍PARTIAL，真实多日调度、结算、撤销/在途Fill和交易Worker恢复未关闭。

2026-10-09 P0/A06-A07全局交叉索引复核：阶段文档编辑造成145条当前锚点行号漂移，现逐条刷新并核验145/145锚点、1,058条来源/计划/验收/证据路径、96条精确测试名，A07 PASS。首轮A06发现XMK-03错指源文件，错误审计保留，修复stageRequirementFile后A07无遗漏；只证明路由/定位，不证明测试充分或要求PASS。[A07](../evidence/audits/2026-10-09-v1-crosswalk-link-audit-a07.json)，[A06失败记录](../evidence/audits/2026-10-09-v1-crosswalk-link-audit-a06.json)。

2026-10-09正式V1门禁a141：P0交叉表/来源锚点刷新后正式复核，阶段文档审计PASS、证据审计PASS（531引用、57份Manifest、196项），V1仍INCOMPLETE/exit 2。四个历史Run导出仍缺，五阶段工程/交付、OD-014、全V1配对恢复、Ubuntu和本轮人工验收仍未满足；详见[门禁a141](../evidence/audits/2026-10-09-v1-version-gate-a141.log)与[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a141.log.sha256)。

2026-10-09 P5/V1.5手册补齐：§8.1环境、模式、Fixture版本/Hash、随机隔离项目清理和时限已填实；§8.2加入实际自动化命令/隔离stack启停方式，§8.4标明同Run CLI/export已有自动化验证；未验证的拒绝/恢复父级业务与人工签收仍保持NOT_RUN。`pnpm docs:check`检查6136条链接、0失败；`git diff --check`通过。V1门禁a142五阶段文档审计PASS、证据审计PASS（531引用/57份Manifest/196项），仍INCOMPLETE/exit 2，未关闭条件与a141相同。[门禁日志](../evidence/audits/2026-10-09-v1-version-gate-a142.log)，SHA-256 `3813819b9cec3e6550529672fe45d5fdc48bf32cd3ad5fe994602afc9bb6d626`。

2026-10-09 P5/V1.5手册第8.3节复核：把实际Web标题、场景下拉与“准备 V1.5 场景/刷新运行”按钮写入步骤，按现有E2E结果区分normal/AUTO已测和rejection/recovery仍NOT_RUN；删除误导性的“交付时再替换按钮”描述。链接检查6138/6138、0失败，diff检查通过。正式门禁a143仍INCOMPLETE/exit 2，文档与证据审计PASS（531引用/57 Manifest/196条目）；四个历史Run原记录在当前API均404，原结构化导出及离线备份未找到，此项须原始数据/备份才能真实完成，未用新Run替代。门禁日志及SHA见[a143](../evidence/audits/2026-10-09-v1-version-gate-a143.log)。

2026-10-09 更正并核实P5/V1.5恢复状态：重新逐项检查最新E2E JSON与Playwright断言，rejection Run fc5c1215-c7e8-434b-afa1-bbe5da288bb1确实验证CN/US暂停后403/MANDATE_INACTIVE且无订单/Fill/预算预留；recovery Run 33beef16-8ef2-4a9c-ad60-79466a297eca确实注入FakeBroker响应丢失、原单首次查询不可用，再同clientOrderId恢复，AUTO_TRADE_RECOVERED与RECOVERY-001/002 PASS，双市场总计2订单/2 Fill、0未决，账本MATCH；同Run CLI/export完成。先前本轮草稿称该recovery Run为WAITING不准确，已按原始测试证据修正V1.5手册。范围只关闭固定暂停拒绝和UNKNOWN单笔恢复切片，数据库/Temporal故障、交易Worker故障切换、撤销/在途Fill、备份与全V1恢复以及人工验收仍开放。[原始E2E](../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-6e7301d0edfd5bcdb496.json)，[摘要SHA](../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-6e7301d0edfd5bcdb496.json.sha256)。

2026-10-09正式V1门禁a144（更正P5/V1.5拒绝与UNKNOWN恢复证据后）：五阶段文档审计PASS，证据引用审计PASS（532引用、57份Manifest、196条目）；V1仍INCOMPLETE/exit 2。未关闭门禁仍包括四个历史结构化Run导出缺失、阶段交付余项、OD-014决策及其结算实现、全V1配对Artifact恢复、Ubuntu与本轮人工验收。[日志](../evidence/audits/2026-10-09-v1-version-gate-a144.log)，SHA-256 144cb84f3c809517e7539bdc06753022e460419d3afea309409bccdc75a35537。

2026-10-09 P5/V1.5交互栈手册实测：当前工作区启动随机项目 sq-v15-stack-18421f61ab7de2de7a4d；Web路由 /acceptance/v1/v1.5 与 Platform /live 均HTTP 200；输出模式为PAPER+FAKE、LIVE=false。首次受限执行因loopback EPERM失败，按本任务已授权的本机栈验收范围重试成功；使用Harness精确stopCommand退出0，容器/项目卷/网络/专属镜像/凭据文件全部清理。人工验收保持NOT_RECORDED。证据[a01 JSON](../evidence/audits/2026-10-09-v15-interactive-stack-lifecycle-a01.json)，SHA 6713de9b95f0ceff1c4679a4a940a21b3cf2a94ce2d538ee8fee8becae0653ec。

2026-10-09正式V1门禁a145：V1.5手册和交互栈生命周期审计纳入后，阶段文档审计PASS，证据审计PASS（533引用、57份Manifest、196条目），版本仍INCOMPLETE/exit 2。门禁列出的四条历史结构化Run导出、五阶段残余交付、OD-014与其结算落地、全V1配对Artifact恢复、目标Ubuntu和本轮人工验收未满足。日志[a145](../evidence/audits/2026-10-09-v1-version-gate-a145.log)，SHA-256 d5f4c728ff21f60c0fce67e0733df8f4ad527e19eca02c9214a2d4d6b596b786。

2026-10-09 P0/A01与P5/V1.5交付同步：按最新实际E2E更正V1.5 rejection/UNKNOWN恢复状态，补记当前四场景与手册生命周期证据；验收表保持阶段PARTIALLY_IMPLEMENTED、当前人工NOT_RUN；V1.5 §7“操作说明与限制已更新、验收表已同步”由未勾选改为有依据的完成。145条交叉表中有29个源行号因本轮文档增补刷新，145/145锚点精确匹配；196个唯一本地路径、90条精确测试名引用均存在/命中，A08 PASS。该项关闭局部文档交付和交叉索引定位，A01语义覆盖/P1-P6工程和V1验收仍开放。[A08审计](../evidence/audits/2026-10-09-v1-crosswalk-link-audit-a08.json)，crosswalk SHA-256 9a44d2c2e4b7ea2ec7aa67922ba3cebfed29feae6d9f0072b2b5fd4da8a6f854。

2026-10-09正式V1门禁a146：本轮修正V1.5交付/验收同步并刷新145条交叉索引后复核。五阶段文档审计PASS；证据审计PASS（535引用、57份Manifest、196条目）；V1仍INCOMPLETE/exit 2，TestRun证据审计保留4个历史结构化导出缺口（V1.2一条、V1.5三条）。其余开放项仍含P1–P6交付/业务、OD-014决定与结算实现、全V1真实业务/Artifact配对恢复、Ubuntu及当前范围人工验收。[门禁a146](../evidence/audits/2026-10-09-v1-version-gate-a146.log)，SHA-256 9c58eeedadd3e60b9321d53dfde1949a8ccd660d4de6844e422a2473fa549605。

2026-10-09 P0/A01继续：A05跨服务矩阵纠正日历客户端归属。`getCnAShareCalendarSession`不是V1.2 Fixture调用；实际由V1.3 SessionAdvance使用，OpenAPI schema来自V2.4合同，Market Data日历路由不要求Bearer。A05已拆分V1.2 Fixture与V1.3会话推进路径，链接检查6156/6156通过。此项不代表V1.3交易日历正确性通过；OD-014及全量源语义审计仍开放。详见[跨服务矩阵](../evidence/audits/2026-10-09-v1-cross-service-route-matrix-a05.md)和计划执行记录。

同轮补强Market Data身份边界测试：将过时的日历URL替换为当前路由路径，`service-auth.spec.ts` 3/3通过；不更改内网日历的开放读取策略。正式版本门禁仍需复核，且V1.3日历完整性尚未验证。

V1日历路由隔离HTTP smoke：4/4通过，验证TRADING/CLOSED/UNKNOWN及非法日期拒绝；数据库未配置、scheduler/executor关闭。首轮受限运行EPERM失败，按授权在随机loopback隔离环境重跑成功。机器日志[calendar HTTP smoke](../evidence/audits/2026-10-09-v1-calendar-http-smoke-a01.log)，SHA-256 `a18ee673ae365acdcef89395fec64ef092daa70b1d17f3ef7502a544f2e874d2`。仅验证冻结日历路由行为，真实完整市场日历与V1.3整体验收仍未通过。

2026-10-09 P0/A01追踪表刷新：按最新V1.5三日AUTO Fixture及四场景隔离E2E、完整code suite更新9条需求行，补入精确单测名、Fixture/Manifest及新证据引用。9条映射中所有证据路径与测试名称逐项检查通过；更新只纠正实现/测试状态描述，不改变完成分类。结算、实时调度、取消/在途Fill/交易Worker恢复、Ubuntu和当前范围用户验收仍开放。[刷新审计](../evidence/audits/2026-10-09-v15-multi-session-crosswalk-refresh-a01.json)，交叉表SHA-256 `30d8c9b5ac3e0e67c5d4dedb0e5ad79d268c2078fae26fa415af6cf8340d68e9`。

2026-10-09正式V1门禁a149：五阶段文档审计PASS；证据审计PASS（543引用、57份Manifest、196项）；V1仍INCOMPLETE/exit 2。四个历史TestRun结构化导出、OD-014/结算实现、阶段剩余交付、目标Ubuntu和当前范围用户验收仍未满足。门禁日志[a149](../evidence/audits/2026-10-09-v1-version-gate-a149.log)，SHA-256 `9de4ed6467368c35b9ba8052d3f3da9a1cb21e93993fee47175c31da4ab351a6`。


2026-10-09 P5成交链路可用性增量：在V1.5验收页增加按当前TestRun Fill选择完整链路，E2E确认4个Fill均可选并核对Proposal/Mandate/FakeBroker Order/Fill/Outbox/Portfolio与FakeBroker现金/预算；同一Run下不引入新业务事实。当前树`pnpm test:e2e -- --stage V1.5`四场景PASS、资源精确清理；`pnpm verify:stage -- --stage V1.5 --suite code`exit 0，Python Worker锁版镜像14/14。追踪表更新3项且保留OPEN/PARTIAL分类：[交叉表审计](../evidence/audits/2026-10-09-v15-fill-trace-crosswalk-refresh-a01.json)。该切片不覆盖跨Run/跨阶段Trace、告警/能力阻塞、结算和当前范围人工验收。


2026-10-09正式V1门禁a151：修复a150揭示的E2E日志sidecar路径后重跑，阶段文档审计PASS、证据审计PASS（548引用、58份Manifest、196项、0失败），正式V1仍INCOMPLETE/exit 2。门禁仍明确缺少4条历史TestRun结构化导出，且OD-014/结算、阶段剩余交付、目标Ubuntu和当前范围用户验收未满足。[a151](../evidence/audits/2026-10-09-v1-version-gate-a151.log)，SHA-256 `d8c945befce8f3d90a1fe861edeca3b076b19538761cc00fd4e5785519767da3`。a150 sidecar路径失败原始日志保留供审计。


2026-10-09 P5交易服务进程恢复切片：在FakeBroker已持久提交但Trade Execution响应未返回时，Harness实际kill并重启Trade Execution容器，确认Temporal重试通过原clientOrderId读取同一已提交订单，继续预算结算/Fill Outbox/账本核对。四场景E2E PASS、随机隔离资源清理PASS，完整V1.5 code suite exit 0；证据详见[机器报告](../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-9ab3f1b90438b7f715eb.json)、[code suite](../evidence/audits/2026-10-09-v15-trade-worker-restart-code-suite-a01.log)、[交叉表审计](../evidence/audits/2026-10-09-v15-trade-worker-restart-crosswalk-a01.json)。该项仅关闭Trade单进程重启后的原单恢复；多Worker接管、取消/在途Fill、结算、目标Ubuntu和用户人工签署仍开放。


2026-10-09正式V1门禁a152：阶段文档审计PASS，证据审计PASS（553条引用、59份Manifest、198个条目、0失败）；正式V1仍INCOMPLETE/exit 2。历史TestRun结构化导出缺4条，OD-014/结算、剩余阶段交付、目标Ubuntu和当前范围用户验收仍未满足。日志[a152](../evidence/audits/2026-10-09-v1-version-gate-a152.log)，SHA-256 `bbcf3a33353d46549d90de1996935fd3ee8f22abcbcd20ca9448f80881b9bedf`。

2026-10-09核对并更正P5状态：V1.5暂停E2E a05及完整code suite a25均已通过；固定AUTO Run在Mandate暂停后拒绝新的订单请求，既有授权订单继续入账。此前P5进度记录将暂停后的在途订单/Worker交易恢复概括为未完成，现拆分为已通过的暂停和单Trade进程重启切片，以及仍未通过的撤销/在途Fill竞态、多Worker交易接管。计划与V1.5状态摘要已同步。E2E运行日志SHA-256 `b90f1a638c0fffaf959e2c3bb8f3d2b7b3dc3b779c8156ba85cf4dafaafb3271`；V1.5 code suite日志SHA-256 `1e7a7e8506e6db863644163fc16eccd4682c5ab762c4a7d657d0c90a936d388b`。

2026-10-09正式V1门禁a154：计划/状态更新后重跑，五阶段文档审计PASS，证据审计PASS（555引用、59份Manifest、198项、0失败）；版本仍INCOMPLETE/exit 2。四条历史TestRun结构化导出仍缺；各阶段工程/交付余项、OD-014与结算实现、Ubuntu及当前范围人工签署仍未满足。[a154日志](../evidence/audits/2026-10-09-v1-version-gate-a154.log)，SHA-256 `c1ac607713baa904d673a141e7849931d8829e6f0860748bf4a1857abd9889a0`。

2026-10-09 V1.5验收表同步了暂停后新单拒绝/既有授权订单继续入账及Trade提交后重启恢复证据；`pnpm docs:check`检查6219条本地链接、0失败，`git diff --check`通过。正式V1门禁a155：阶段文档审计PASS，证据审计PASS（559引用、59份Manifest、198项、0失败），V1仍INCOMPLETE/exit 2；四条历史Run导出、各阶段未完工程与交付、OD-014/结算、Ubuntu和当前范围人工签署仍开放。[a155日志](../evidence/audits/2026-10-09-v1-version-gate-a155.log)，SHA-256 `5b7c2fc64336442afda8274cae7f362367f3c435a36a9a22e9851ac533862440`。

2026-10-09当前树V1.3 Trade共享语义复验：`pnpm test:e2e -- --stage V1.3`隔离矩阵21/21通过；L07 Run `0e2dbca1-ae62-4a4c-b00c-514b02f66698`验证撤单待定期间保持预留，Trade重启后合法seq=2 Fill入账、seq=3接受撤单、撤单余量50释放且对账MATCH；同Run CLI/export与随机Compose清理通过。外部数据/真实券商调用0。[机器审计](../evidence/audits/2026-10-09-v13-current-tree-cancel-restart-e2e-a01.json)，SHA-256 `2552317ce19d1b0c7ff4e742f4f69695bc489d3f816218410b5ea3af7eda55a3`。该测试验证V1.3共享FakeBroker路径，不等于V1.5 AUTO撤销编排；P5仍开放。

2026-10-09正式V1门禁a157（纳入上述V1.3当前树复验与V1.5验收记录）：`pnpm docs:check` 6226条链接0失败；五阶段文档审计PASS，证据审计PASS（562引用、60份Manifest、199项），版本仍INCOMPLETE/exit 2。历史TestRun、OD-014/结算、阶段余项、目标Ubuntu和人工签收仍未满足。[a157日志](../evidence/audits/2026-10-09-v1-version-gate-a157.log)，SHA-256 `9b41f8f0908bc6604a8ea4b6992cbd772b06891879b9ece60f0daefd48dc8043`。

2026-10-09 P0/A01合同字段追踪补强：新增具名回归测试，逐字段检查Money、Security、AccountInitializationFixture、AccountSnapshot、ClockContext、TestRun的公共生成TS/Python类型，并接入`contracts:check`；定向测试2/2、合同检查11/11、202项Schema漂移与29个客户端生成器检查通过；V1.1完整代码套件exit 0。交叉表V1.1-S2-L13已增加测试名、字段范围、证据路径及当前剩余消费者覆盖缺口，需求状态仍PARTIAL/HISTORICAL，不以测试名或聚合套件推断关闭。[V1.1套件日志](../evidence/audits/2026-10-09-v11-core-schema-parity-code-suite-a01.log)，SHA-256 `1422abc94c880e4ac5311bed8235bf1949dad13c8913e634181256c7e5afcc92`。

2026-10-09正式V1门禁a159：P0交叉表与V1.1阶段证据同步后，`pnpm docs:check`检查6232条本地链接、0失败；五阶段文档审计PASS，证据审计PASS（563引用、60份Manifest、199项）；V1仍INCOMPLETE/exit 2。该测试补强不关闭P1父项的跨服务消费者/发布矩阵；历史Run导出、OD-014结算、其他阶段工程项、Ubuntu与人工验收保持OPEN。[a159日志](../evidence/audits/2026-10-09-v1-version-gate-a159.log)，SHA-256 `e71b1ff6d98807ef068ef3f98408647f042094519a0a96b717e0eec406b752f0`。

2026-10-09 V1.1当前树合同/场景E2E复验：`pnpm test:e2e -- --stage V1.1`通过，代码套件PASS，Chromium normal/rejection/recovery 3/3，每Run两项断言PASS、同Run CLI/export成功、随机项目资源精确清理。三个Run的人工结论均`NOT_RUN`。据此只勾选V1.1 §7“契约、数据结构、场景定义和预期结果已冻结”，第2节任务、其他§7交付和当前范围签收保持未关闭。日志SHA-256 `abb64c038f019049358a380cbb4c90f79bf254c4f1c36077721f4b97df1be7b0`。

2026-10-09正式V1门禁a161：V1.1 §7 L65勾选和V1.1当前树normal/rejection/recovery E2E记录同步后，`pnpm docs:check`检查6238条链接、0失败；五阶段文档审计PASS，证据审计PASS（567引用、60份Manifest、199项）；正式V1仍INCOMPLETE/exit 2。四条历史Run导出、阶段工程/交付余项、OD-014/结算、Ubuntu与当前范围人工签收仍未完成。[a161日志](../evidence/audits/2026-10-09-v1-version-gate-a161.log)，SHA-256 `34d8f76f9c97d05a05cb3f19e268134b3372ee97c09be599255af196e3699d0f`。

2026-10-09 P5/V1.5 Platform dispatch Worker故障接管复验：以`STOCKQUANT_V15_E2E_WORKER_FAILOVER=true pnpm test:e2e -- --stage V1.5`运行，normal Run `f8452489-f768-40b6-9814-06a0365c025a`主/备用durable收到seq=1后实际kill主Platform容器，备用Worker接管同Run CN_A Activity并ACK，主API恢复，120项权威观察完成；normal/AUTO/rejection/recovery四场景通过，隔离资源精确清理、外部源及真实券商调用0。机器报告[JSON](../evidence/audits/2026-10-09-v15-worker-failover-sq-v15-e2e-17f973b67e6e20e35f29.json)，SHA-256 `04785fad1307daea62fbdfaeb7f6e26c15cd29ec6d09148eca401abe2b29a403`。V1.5阶段记录、P5队列表述和V1.5-S2-L18交叉索引已同步；仅关闭Platform dispatch Worker单进程故障接管子项。Trade业务Worker故障切换、撤销/在途Fill、结算、历史Run导出、OD-014、Ubuntu和当前范围人工验收仍未完成。

2026-10-09正式V1门禁a165：更新V1阶段摘要、Platform dispatch Worker接管证据和追踪后复核，阶段文档审计PASS、证据审计PASS（568引用、60份Manifest、199项、0失败），版本仍INCOMPLETE/exit 2。四个历史结构化Run导出、OD-014及结算实现、其余阶段工程/交付、全V1真实业务与Artifact配对恢复、目标Ubuntu和当前范围人工签收未完成。`pnpm docs:check`复核6243条链接/0失败，`git diff --check`通过。[a165门禁](../evidence/audits/2026-10-09-v1-version-gate-a165.log)，SHA-256 sidecar已保存。


2026-10-09 P5 Trade Execution备用实例故障接管：在 FakeBroker 已提交、HTTP 响应未返回时实际终止主 Trade Execution 容器，由共享隔离 PostgreSQL/服务别名上的备用实例通过相同 `clientOrderId` 恢复原订单；四场景 Web/API/CLI/export PASS，外部来源/真实券商调用均为0，隔离资源精确清理。AUTO Run `21caf4d1-ecd3-466a-a518-b7d429ac086f`。报告[JSON](../evidence/audits/2026-10-09-v15-trade-worker-failover-sq-v15-e2e-75b262d7e2b9d8fa1806.json)，SHA-256 `f89d797ec555d475936a26156724aa6df81eb0e8264d8e82e88bf36b56bde307`；V1.5阶段可执行步骤见[§8.18](./prd/v1-local-simulation/05-scheduling-and-recovery.md#818-trade-execution提交后工作实例故障与备用实例接管2026-10-09)。这只验证一个实例故障后的幂等恢复，不关闭取消/在途Fill、多实例同时故障、OD-014/结算、全V1恢复、Ubuntu及当前范围人工验收。


2026-10-09正式V1门禁a166：新增Trade Execution主实例在FakeBroker提交后退出、备用实例按原clientOrderId恢复的隔离E2E，并同步V1.5 §8.18、P5计划及需求追踪。阶段文档审计PASS、证据审计PASS（569引用、60份Manifest、199项、0失败），版本仍INCOMPLETE/exit 2；四个历史TestRun结构化导出、OD-014/结算、其余阶段工程与交接、全V1数据/Artifact配对恢复、目标Ubuntu及当前范围人工签收未完成。`pnpm docs:check`为6246链接/0失败，`git diff --check`通过。[a166门禁](../evidence/audits/2026-10-09-v1-version-gate-a166.log)，SHA-256 `184ed7edaad693dc4a15dc5273e6936c84219089eeb9212ba1bb59aad4d0fef5`。

2026-10-09 V1.5代码套件复验：首次在默认沙箱中因Docker socket不可访问而记录exit 2；核对确认锁版Python镜像已本地存在，随后在授权Docker执行上下文重跑完整套件，exit 0。含禁网ARM64 Python Worker、全服务测试、Web构建/typecheck/lint及隔离PostgreSQL迁移/集成检查；[完整日志](../evidence/audits/2026-10-09-v15-trade-worker-failover-code-suite-a01.log)，SHA-256 `7fd5ebaf89845e57507f654130cad5195867f83f5e276a01ae464ed85f5e3da1`。初次exit 2保留为执行环境限制记录，不代表代码失败。

正式V1门禁a167：V1.5 Trade备用实例接管及完整代码套件记录后复核，五阶段文档审计PASS、证据审计PASS（570引用、60份Manifest、199项、0失败），版本仍INCOMPLETE/exit 2。四个历史TestRun结构化导出、OD-014/结算、各阶段交付余项、全V1业务/Artifact配对恢复、目标Ubuntu和当前范围人工验收未完成。[a167门禁](../evidence/audits/2026-10-09-v1-version-gate-a167.log)，SHA-256 `f23323d55204042dd42787ef903e20370771d1fa6339974634611a174e50c577`。


2026-10-09 P5/追踪修订：需求行V1.5-S2-L18保留了原先位于`testMapping.evidencePaths`的全部17条来源，现同步恢复到顶层引用并增加Trade备用实例E2E/代码套件引用；状态仍PARTIAL，撤销/在途Fill和多故障场景保持OPEN。修正P5摘要中对备用接管证据的重复/矛盾表述；`pnpm docs:check`为6253条/0失败，`git diff --check`通过。交叉表SHA-256 `8bd707721f9c02d2f466608863e2722b899c8c136377170840a68fec7f2093ad`。

正式V1门禁a168：阶段文档审计PASS、证据审计PASS（571引用、60份Manifest、199项、0失败），版本仍INCOMPLETE/exit 2。四个历史TestRun结构化导出、OD-014/结算实现、各阶段交付余项、全V1业务/Artifact配对恢复、目标Ubuntu与当前范围人工签收仍未满足。[a168门禁](../evidence/audits/2026-10-09-v1-version-gate-a168.log)，SHA-256 `4a3498725017b8fc33661e162cefb9b9e02d7a9f45b5d684dfa1bfa18abe2064`。


2026-10-09 P0/A01交叉索引增量：V1.5-S2-L18补入主Trade实例提交后终止、备用实例按原clientOrderId查询的E2E/完整代码套件证据，原有17条引用已保留；单行审计核对19条路径、当前Playwright标题和Trade failover源码事件标记均存在，PASS。详见[交叉表复核](../evidence/audits/2026-10-09-v1-crosswalk-trade-failover-refresh-a01.json)，当前交叉表SHA-256 `d71a0b3323ca674fe5b2526861b68c85ad26decb1774f50631e8ee87b4c74c8f`。这只是字面路径检查，A01语义符合性及P0整体仍开放。


正式V1门禁a169复核：阶段文档审计PASS、证据审计PASS（571引用、60份Manifest、199项、0失败），版本仍INCOMPLETE/exit 2。缺口依旧为4个历史TestRun结构化导出、OD-014/结算、各阶段工程和交付、全V1业务/Artifact配对恢复、Ubuntu以及当前范围人工签收。[a169门禁日志](../evidence/audits/2026-10-09-v1-version-gate-a169.log)，SHA-256 `4a3498725017b8fc33661e162cefb9b9e02d7a9f45b5d684dfa1bfa18abe2064`。


2026-10-09 P0/A01全量索引复核：按当前机器交叉表逐条检查145条要求的来源/证据/执行入口文件及精确测试名引用，194个唯一路径和107个测试名全部存在，0缺失。[复核报告](../evidence/audits/2026-10-09-v1-crosswalk-link-audit-a09.json)，交叉表SHA-256 `d71a0b3323ca674fe5b2526861b68c85ad26decb1774f50631e8ee87b4c74c8f`。此项只说明导航和精确名称可定位；A01语义覆盖、证据充分性和P0整体仍OPEN。


正式V1门禁a170复核：新增P0/A01字面链接核验记录后重跑，五阶段文档审计PASS，证据审计PASS（571引用、60份Manifest、199项、0失败），版本仍INCOMPLETE/exit 2。4条历史TestRun导出、OD-014与结算、阶段余项、全V1业务/Artifact配对恢复、Ubuntu和当前范围人工验收继续未满足。[a170日志](../evidence/audits/2026-10-09-v1-version-gate-a170.log)，SHA-256与a168/a169相同（输出确定性一致）。


2026-10-09 P5/V1.5 AUTO TestRun取消纵切：新增owner-scoped持久取消请求API、TestRun证据/历史快照、Temporal Activity订单边界检查、取消完成记录和Web控制。隔离Web/API/Temporal/FakeBroker E2E在Mandate授权后点击取消，唯一当前订单完成Fill并MATCH，后续订单数0；完整AUTO订单断言保持WAITING。四场景Web/API/CLI/export矩阵通过，随机容器/网络/卷精确清理，外部来源/真实券商调用0；结构化证据[JSON](../evidence/audits/2026-10-09-v15-auto-trade-cancellation-sq-v15-e2e-967e0b65c09fe54c5332.json)，SHA-256 `2b41b3eb1fa48082f635f8799ccc2756427e5d5b27defc53ba33edc25a2d54c5`。对应§8.19。该结果不覆盖FakeBroker订单撤销/部分Fill竞态、全V1配对恢复、OD-014/结算、目标Ubuntu或人工签署。

2026-10-09 P5 AUTO TestRun取消切片收尾：完整V1.5代码门禁exit 0（锁版Python Worker、服务检查、迁移及PostgreSQL集成；日志[SHA-256](../evidence/audits/2026-10-09-v15-auto-cancel-code-suite-a02.log.sha256)）；取消E2E于Mandate授权后、FakeBroker发送前由Web触发，当前已授权订单完成一笔Fill且后续订单数0、独立对账MATCH，完整AUTO仍WAITING。已同步V1.5 §8.19、版本计划、验收记录和V1.5-S2-L18交叉表。V1正式门禁仍exit 2/INCOMPLETE，4个历史TestRun缺结构化导出，五个阶段均未完成当前范围人工/Ubuntu验收；文档收尾后的最终[门禁日志](../evidence/audits/2026-10-09-v1-version-gate-auto-cancel-a02.log)仍exit 2，SHA-256 `0a5d7d4c72f50c1ef83fcde5ee011e10b5ab9e8dbf01a98184f97af4833873ed`。历史恢复检查已确认原本地运行库/仓库无这三个V1.5 Run导出，只有用户可提供的原始备份能支持恢复；不得用新Run替代。实际FakeBroker撤单/部分Fill、OD-014结算语义等仍是V1缺口。

2026-10-09 P5/交接改进：隔离AUTO取消Harness现于启动时打印并写入报告本次Web/API loopback URL；复跑E2E exit 0，Web URL `http://127.0.0.1:59218/acceptance/v1/v1.5`，API health `http://127.0.0.1:59217/live`（只在该随机项目存活期间有效）。自动化实际点击“取消后续 AUTO 订单”，CN订单1 Fill、后续订单0、MATCH；同Run CLI/export均通过，隔离资源全部删除。操作手册补入Fixture/manifest SHA、配置名、按钮、600秒测试超时、30秒健康等待、预期断言和清理恢复步骤；[新报告](../evidence/audits/2026-10-09-v15-auto-trade-cancellation-sq-v15-e2e-9af92a999559bec94e57.json)，报告SHA-256 `08b42608c661a44ec50e59b124f8f202be790f254cafe4f6a011702aa53cb3ff`，Harness日志[sidecar](../evidence/audits/2026-10-09-v15-auto-cancel-web-handoff-a01.log.sha256)。该动态URL已随测试清理关闭，复跑时以新启动输出为准；当前用户手动验收仍NOT_RUN。

2026-10-09 最终V1门禁a03：V1.5可执行手册补入动态Web/API地址、Fixture/Manifest Hash、按钮和超时/清理步骤后重验；五阶段文档审计PASS，证据审计PASS（581引用、60份Manifest、199条目、0失败），版本仍INCOMPLETE/exit 2。门禁精确发现V1.2 1个、V1.5 3个历史TestRun缺结构化导出，且版本汇总/人工/环境等条件未满足。[a03日志](../evidence/audits/2026-10-09-v1-version-gate-auto-cancel-a03.log)，SHA-256 `e0768bf9ea52be8505d75752d407250f4525ec674c6b9fd6b4ec4492765d42a4`。本轮没有改写旧Run或手工验收结论。

2026-10-09 P5取消重试修复：将已持久取消请求的重放判断置于终态Run冲突之前，解决客户端丢失202、Workflow完成后重试返回409的问题。隔离PostgreSQL Outbox/取消集成4/4，覆盖终态后重复取消仍返回原requestedAt且不新建历史；平台AUTO单测23/23、typecheck通过。完整V1.5四场景E2E复验PASS：AUTO Run `fbe42efd-59b3-41a3-b997-f7be6f628f2f` 完成后重复POST取消收到202且原请求时间一致，当前授权Fill 1、后续订单0、MATCH；报告[JSON](../evidence/audits/2026-10-09-v15-auto-trade-cancellation-sq-v15-e2e-dd8affc13398a8448de9.json)，SHA-256 `24804e8977c63961a2d5e2e6c705c175f391808b41b43b81b7b217f674dcc2a6`。容器/卷/网络精确清理PASS、真实来源/券商调用0。完整V1.5 code suite仍在运行，结果随后补录。

2026-10-09 P5 AUTO取消幂等收尾：包含完成后重复POST的完整 V1.5 代码门禁退出0；Python Worker 14/14、服务检查、构建/lint/typecheck、隔离PostgreSQL迁移和取消持久化集成4/4通过。[完整代码套件日志](../evidence/audits/2026-10-09-v15-auto-cancel-idempotency-code-suite-a03.log)，SHA-256 `a1b575165960958b7e53b64c3af4d99d54a76842c40e8c00c3e4747a056e191d`。V1.5阶段手册与S2-L18交叉索引已新增该证据；V1总门禁尚待这些新记录完成后复核。

2026-10-09 正式V1门禁a04：AUTO取消完成后重试修复及完整V1.5代码/E2E证据入档后重跑。五阶段文档审计PASS；证据审计PASS（581引用、61份Manifest、200条目、0失败）；V1仍exit 2/INCOMPLETE：4个历史TestRun缺结构化证据导出（V1.2 1个、V1.5 3个），版本摘要/门禁勾选及当前范围人工/环境验收未满足。[a04日志](../evidence/audits/2026-10-09-v1-version-gate-auto-cancel-a04.log)，SHA-256 `16dcce5e06db7e48ada404b6c279f048ea282be03374a29e6733ff11064f746f`。
2026-10-09 P5配对备份工具链复验：`pnpm test:backup:cluster-isolated` 在受控Docker上下文退出0。恢复验证覆盖十个V1服务数据库/角色及一个合成Published Artifact内容Hash，随机资源精确清理，活动项目未触碰；[机器报告](../evidence/audits/2026-10-09-v1-isolated-cluster-paired-backup-a9366d9c50ee4001.json)，SHA-256 `cfaff400ac5e1d5ee87969bc34b06e65778dfbe3034f455607922a26fe0c8842`。默认沙箱Docker socket受限的退出1保留为执行环境记录。此结果不含真实业务Run/账本或NATS/Temporal同点配对恢复，因此P5全V1业务数据恢复仍未完成。

2026-10-09正式V1门禁a171：本轮备份器复验及文档同步后重跑，五阶段文档审计PASS，证据审计PASS（582引用、61份Manifest、200条目）；正式V1仍INCOMPLETE/exit 2。缺口包括4个历史TestRun结构化导出、未勾选版本门禁/汇总、未完成阶段交付、OD-014结算决策、全V1真实业务/Artifact配对恢复、目标Ubuntu与当前范围人工验收。[a171日志](../evidence/audits/2026-10-09-v1-version-gate-a171.log)，SHA-256 `c2498d23959cea6e2280ebe71806385576def1718067f615125617095d4df794`。

2026-10-09 P0/A01更新V1.5-S2-L21：交叉索引加入本轮隔离集群备份报告；该行6个唯一引用路径均存在，逐行链接审计PASS，父项仍OPEN。报告记录交叉表SHA `516b99c7b44ab7259b23a6f8740142fff48a630a353653bde6dc75040f2086b7`，见[审计](../evidence/audits/2026-10-09-v1-crosswalk-paired-backup-a01.json)。版本门禁a172复验阶段文档PASS、证据PASS（582引用、61份Manifest、200条目），V1仍exit 2/INCOMPLETE；日志SHA与a171相同。[a172日志](../evidence/audits/2026-10-09-v1-version-gate-a172.log)。

2026-10-09 P5 AMD64仿真补证：`verify:compat -- --platform linux/amd64` 在Mac ARM64上用临时标签构建Platform API，容器Node v24.1.0/x64探针PASS；标签随后精确删除。[日志](../evidence/audits/2026-10-09-v1-linux-amd64-compat-a173.log)，SHA-256 `d05179876661cc97b12ccd0d3ffcb98767a77954ed544d43b1522f94231f254f`。兼容脚本新增可注入`STOCKQUANT_COMPAT_IMAGE`，保护已有默认标签。合同检查（202 schemas、111 consumers、29 generators）和Fixture检查（34文件）均PASS；文档链接6295/0、diff check PASS。逐行交叉表复核a02覆盖7个唯一引用路径、0缺失，父项保持OPEN；更新后正式门禁a173的阶段文档/证据审计PASS（583/61/200），V1仍INCOMPLETE/exit 2。[交叉表审计](../evidence/audits/2026-10-09-v1-crosswalk-paired-backup-a02.json)、[a173门禁](../evidence/audits/2026-10-09-v1-version-gate-a173.log)，SHA-256 `b87cd3647f16fe8e9fe9db9366f8adbd547f28ff3079d42d9ab1ffb51c80c13d`。

2026-10-09 正式V1门禁a189：五阶段文档审计PASS、证据审计PASS（600引用、68份Manifest、207项，0失败）；正式V1仍INCOMPLETE/exit 2。未关闭项包括四个历史TestRun结构化导出、阶段范围实现/交付、OD-014结算决策、完整V1真实业务事实配对恢复、版本摘要/门禁及新增范围人工和Ubuntu实机验收。四卷同点恢复报告含合成ArtifactRef/内容，不视为真实业务产物。[a189日志](../evidence/audits/2026-10-09-v1-version-gate-a189.log)，SHA-256 `d44bafa85c8bbfe2b43ed2dc9d1478cc385246ca7423699c2f5b8ec2cc9d04d8`。

2026-10-09正式V1门禁a190复核：阶段文档审计与证据审计均PASS（600引用、68份Manifest、207项，0失败），正式版本仍INCOMPLETE/exit 2；日志与a189输出确定性一致，SHA-256 `d44bafa85c8bbfe2b43ed2dc9d1478cc385246ca7423699c2f5b8ec2cc9d04d8`。[a190门禁](../evidence/audits/2026-10-09-v1-version-gate-a190.log)。

2026-10-09 P5/A10时钟边界补强：V1.5 AUTO取消事件时间已从HTTP控制器直读`new Date()`改为应用服务接收Platform注入的Clock；新增固定Clock单测。专用Web/API/CLI/export四场景E2E在FakeBroker已提交/Trade响应未返时实际取消并验证事件时间持久化、重试幂等、当前Fill完成、后续订单0、独立账本MATCH；Playwright 1/1、精确资源清理通过，未调用外部来源/真实券商。[E2E报告](../evidence/audits/2026-10-09-v15-auto-trade-cancellation-sq-v15-e2e-398bd38ec91b610d9653.json)，SHA-256 `eae703cdb96c21b2e8a396d0ca1de7382b61c9d42bf1fedbece4141c93687cb2`；Harness报告Hash清单已加入新服务与测试文件。完整V1.5代码套件exit 0，含Platform 298项单测、Python Worker 14/14、隔离PostgreSQL集成/迁移，[日志](../evidence/audits/2026-10-09-v15-cancellation-clock-code-suite-a03.log)，SHA-256 `bfab65dee705c627db4fd918f6b61e1efd50c94d5a11e637918700a87b49a078`。FakeBroker实际订单撤销/部分Fill竞态及阶段人工验收仍OPEN。

2026-10-09 正式V1门禁a191：V1.5取消注入Clock工程、四场景专用E2E、完整代码套件及交叉索引引用更新后复核。阶段文档审计PASS，证据审计PASS（604引用、68份Manifest、207项、0失败），版本仍INCOMPLETE/exit 2；4个历史导出、OD-014、阶段交付、完整V1业务恢复、Ubuntu及当前范围人工验收仍未满足。[a191日志](../evidence/audits/2026-10-09-v1-version-gate-a191.log)，SHA-256 `e4bf7c3bcd654b9bd0de8540963dac8b5b227a28bb31038ee8238227ea67ee37`。
2026-10-09 P1 Artifact/报告发布边界定向复验：V1.2 Run lifecycle隔离PostgreSQL集成3/3、V1.4报告发布fencing集成2/2通过，另相关单测14/14；两次PG测试先build后测试，Harness确认活动服务未连接并精确清理临时容器/网络。V1.4测试按顺序覆盖取消先提交/完成先提交两种终态，不是并发压力测试。范围与限制见[审计A01](../evidence/audits/2026-10-09-v1-artifact-publication-boundary-a01.md)。

2026-10-09正式V1门禁a201：进度文档更新后复核，结果与a200确定性一致；阶段文档PASS、证据审计PASS（603引用、68份Manifest、207项），总体仍INCOMPLETE/exit 2。历史导出缺失及阶段交付、版本摘要/勾选、决定与恢复、Ubuntu和当前范围人工验收继续开放。[a201日志](../evidence/audits/2026-10-09-v1-version-gate-a201.log)，SHA-256与a200一致 `e23f59aaa2411f22119c86d5dc5023cd6ee5d4b27e3b77ad4f72b6b532725cf2`。

2026-10-09 P1 Artifact证据同步：V1.2取消/内容存储及V1.4报告引用/Hash定向单测14/14，并将V1.4阶段第7节现有Artifact交付项更新为当前工作树fencing证据；既有工程项保持勾选状态，人工验收与整版Artifact矩阵仍开放。详情见[边界审计A01](../evidence/audits/2026-10-09-v1-artifact-publication-boundary-a01.md)。

2026-10-09正式V1门禁a202：阶段文档审计PASS、证据审计PASS（604引用、68份Manifest、207项），总状态仍INCOMPLETE/exit 2；四个历史Run结构化导出、剩余阶段交付/版本门禁勾选、OD-014/结算、实际业务跨域恢复、Ubuntu及新增范围人工验收仍未完成。日志SHA-256 `563973a250531f05a78c4506623d9c43edd05f6acf7153acaaf15ed28cfc12fc`。[门禁日志](../evidence/audits/2026-10-09-v1-version-gate-a202.log)。

2026-10-09 P1/OD-007范围隔离项关闭：依据V1.2/v1.3/v1.5冻结Fixture和实际服务参数，分列测试策略标签/订单/预算输入与所有者已确认的只读NO_TRADE边界；活动策略版本、来源、账户、资金、风险费用、Mandate仍UNSET/未批准。审计见[策略边界A01](../evidence/audits/2026-10-09-v1-fixture-vs-active-strategy-a01.md)。这关闭文档区分任务，不关闭OD-007或任何活动启用条件。

2026-10-09正式V1门禁a203：更新策略/Fixture隔离记录和阶段链接后，阶段文档审计PASS，证据审计PASS（604引用、68份Manifest、207项），V1仍INCOMPLETE/exit 2。`pnpm fixtures:check`检查34个Fixture文件无Hash失败，V1.2 774行双市场输入语义通过；`pnpm docs:check`检查6411条链接无失败，`git diff --check`通过。未关闭项包括历史Run导出、五阶段交付/版本汇总与门禁勾选、OD-014结算、跨域真实业务恢复、目标Ubuntu和当前范围人工验收。[a203日志](../evidence/audits/2026-10-09-v1-version-gate-a203.log)，SHA-256 `563973a250531f05a78c4506623d9c43edd05f6acf7153acaaf15ed28cfc12fc`。

2026-10-09 P1/OD-013开发者决策包完善：按V1实际源码区分V1.2共享内容字节+新旧metadata、V1.4 Quant DB报告/Manifest与Platform Run投影、V1.1/V1.3/V1.5业务Run/账本/工作流事实、冻结Fixture和调用者导出；注明V3.1共用内容卷，避免把整卷误归V1。更新[决策包](../evidence/audits/2026-10-09-v1-artifact-policy-decision-package.md)并关闭计划中的材料准备子项；OD-013仍待所有者确定期限/保护类别/清理授权，未设置到期或删除字节。

2026-10-09正式V1门禁a204：OD-013 V1专属产物盘点和计划更新后复核，文档阶段审计PASS、证据审计PASS（604引用、68份Manifest、207项），V1仍INCOMPLETE/exit 2。缺失历史导出、版本与阶段交付、OD-014结算、真实业务全栈恢复、目标Ubuntu和当前范围人工验收仍未通过。[a204日志](../evidence/audits/2026-10-09-v1-version-gate-a204.log)，SHA-256 `563973a250531f05a78c4506623d9c43edd05f6acf7153acaaf15ed28cfc12fc`。


2026-10-09 A04 Platform身份边界增量：V1.4五条回测入口和V1.5四条调度/Run入口通过匿名401、伪造owner 403逐路由实测，控制器路由清单匹配。V1.4完整隔离回归exit 0（Playwright 5/5、同Run CLI、精确清理）；V1.5完整normal/AUTO/rejection/recovery E2E exit 0、同Run CLI/export和精确清理。V1.5首次时间断言失败保留，按注入Clock确定性`+1秒`修正后重跑通过。证据与范围见[V1.4 §8.8](prd/v1-local-simulation/04-daily-backtest.md#88-platform-回测入口身份负向矩阵-2026-10-09)、[V1.5 §8.20](prd/v1-local-simulation/05-scheduling-and-recovery.md#820-platform-api身份边界与当前e2e复验-2026-10-09)和[A05矩阵](../evidence/audits/2026-10-09-v1-cross-service-route-matrix-a05.md)。此子项不关闭V1总缺口；人验收保持未签署。

2026-10-09 正式V1门禁a205：A04文档和V1.4/V1.5身份矩阵增量后重跑，五阶段文档审计PASS，证据审计PASS（619引用、69份Manifest、208项、0失败），版本仍`INCOMPLETE`/exit 2。四个历史TestRun结构化导出缺失、版本摘要/门禁勾选、阶段剩余交付、OD-014结算、全V1真实业务配对恢复、Ubuntu实机和当前范围人工验收仍未满足；不将自动化证据当作用户签署。[a205日志](../evidence/audits/2026-10-09-v1-version-gate-a205.log)，SHA-256 `e2fb77021746c34b0813dacf049861bec8ab956ba3583ac4176ac070dbe7ad19`。`pnpm docs:check` 6450链接/0失败，`git diff --check`通过。
正式V1门禁a206：a205结果在仅追加门禁记录后确定性复跑一致，阶段/证据审计PASS（619/69/208），总状态`INCOMPLETE`/exit 2；SHA-256仍为`e2fb77021746c34b0813dacf049861bec8ab956ba3583ac4176ac070dbe7ad19`。[a206日志](../evidence/audits/2026-10-09-v1-version-gate-a206.log)。


2026-10-09 P0/A01 交叉索引事实纠偏：重新核实 V1.5-S2-L18 后，固定AUTO提交后主Trade实例故障、备用实例用原`clientOrderId`读取订单的接管已由四场景隔离E2E与完整V1.5 code suite通过。更新阶段第2节与索引，未将并发竞争/同时多Worker故障、真实时钟、结算或完整恢复误报为完成。索引审计核对41个唯一路径、5个测试名和当前阶段锚点均PASS；首轮审计发现旧测试标题错误并保留失败记录，修正后审计[A05](../evidence/audits/2026-10-09-v1-crosswalk-trade-failover-refresh-a05.json)通过。已存在的成功机器报告及代码套件见[V1.5 §8.18](prd/v1-local-simulation/05-scheduling-and-recovery.md#818-trade-execution提交后工作实例故障与备用实例接管2026-10-09)。

2026-10-09 正式V1门禁a210：阶段文档审计PASS，证据审计PASS（620引用、69份Manifest、208项，0失败），但TestRun证据审计仍有4个历史结构化导出缺失，V1总状态`INCOMPLETE`/exit 2。其余未关闭项仍包括OD-014结算决策/实现、阶段交付与版本门禁勾选、全V1真实业务配对恢复、目标Ubuntu和当前范围用户验收。[a210日志](../evidence/audits/2026-10-09-v1-version-gate-a210.log)，SHA-256 `d8d1ae0f5271519ce55e7248616f1f93b82babfa57d2198f86c299d15a7b6527`；`pnpm docs:check`为6458链接/0失败，`git diff --check`通过。

正式V1门禁a211：计划首页和本轮记录收尾后确定性复跑，阶段文档审计与证据审计仍PASS（620/69/208），总状态INCOMPLETE/exit 2；a210/a211输出SHA一致。历史导出、OD-014及结算、阶段剩余交付、全V1真实恢复、Ubuntu和当前范围人工验收继续未满足。[a211](../evidence/audits/2026-10-09-v1-version-gate-a211.log)，SHA-256 `d8d1ae0f5271519ce55e7248616f1f93b82babfa57d2198f86c299d15a7b6527`。


2026-10-09 P2数据/Qlib血缘核对：V1.2冻结DataVersion→Qlib→Artifact→Governance策略快照的同owner/TestRun/Artifact SHA与策略Hash已具备并有真实容器证据；该E2E数据库断言为2条快照、0个Proposal、0个执行授权。V1.3使用独立Fixture策略版本，不消费V1.2快照。OD-007仅授权NO_TRADE只读基线，TopK活动策略参数未批准；跨阶段Proposal来源绑定仍OPEN，先需明确是否要求隔离FakeBroker测试专用绑定及持有/再平衡语义，不擅自把TopK变成可执行策略。[血缘边界审计](../evidence/audits/2026-10-09-v1-v12-proposal-lineage-boundary-a01.md)、[V1.2 §8.27](prd/v1-local-simulation/02-small-data-and-qlib.md#827-v12-qlib-快照与-v13-paper-proposal-血缘边界-2026-10-09)。

2026-10-09 正式V1门禁a212：加入P2 Qlib→Proposal血缘边界审计及阶段记录后复跑。五阶段文档审计PASS，证据审计PASS（621引用、69份Manifest、208项、0失败），TestRun证据审计仍有4个历史结构化导出缺失，V1总状态`INCOMPLETE`/exit 2。当前还缺OD-014结算决定/实现、P2跨阶段来源绑定决定、阶段交付/版本门禁勾选、全V1业务数据配对恢复、Ubuntu实机及当前范围人工验收。[a212日志](../evidence/audits/2026-10-09-v1-version-gate-a212.log)，SHA-256 `f8253556d357d181c0e3216d8d3091b4c9f57353e0c0d3436c2a88435bb83f01`；链接检查6469/0，差异检查通过。
正式V1门禁a213对a212确定性复跑一致：五阶段文档与本地证据审计PASS（621/69/208、0失败），四个历史Run仍无结构化导出，V1总状态仍`INCOMPLETE`/exit 2；SHA-256与a212相同。[a213日志](../evidence/audits/2026-10-09-v1-version-gate-a213.log)。

2026-10-09 文档状态一致性复核：总计划首页从a211刷新为a213后，最新门禁a214复核输出与a213一致；V1.3第8节已实测的Mac ARM64隔离操作手册状态同步为`VERIFIED_EXECUTABLE`（不代表阶段通过）。V1.5手册汇总更正为Trade主/备实例固定故障恢复已由§8.18验证，并发Worker竞争/同时故障仍开放。阶段文档审计PASS、证据审计PASS（621/69/208、0失败），总版本仍`INCOMPLETE`/exit 2。[a214日志](../evidence/audits/2026-10-09-v1-version-gate-a214.log)，SHA-256 `f8253556d357d181c0e3216d8d3091b4c9f57353e0c0d3436c2a88435bb83f01`；`pnpm docs:check` 6473/0，`git diff --check`通过。
正式V1门禁a215在a214链接同步后确定性复核一致：阶段文档与证据审计PASS（621/69/208、0失败），4个历史导出及决定、恢复、环境和人工验收缺口仍在，整体`INCOMPLETE`/exit 2；日志SHA与a214一致。[a215](../evidence/audits/2026-10-09-v1-version-gate-a215.log)。


2026-10-09 V1.2 Artifact暂存/发布边界：失败或取消前不再暴露Artifact，成功完成后显式发布；定向单测、隔离PostgreSQL和完整V1.2 code suite/Web/API/CLI E2E通过，证据见[阶段§8.29](prd/v1-local-simulation/02-small-data-and-qlib.md#829-artifact暂存与失败不可见2026-10-09)。正式门禁a229仍INCOMPLETE/exit 2，文档与证据审计PASS（626/70/244）；V1的历史Run导出、剩余阶段交付、OD-014结算、全V1恢复、Ubuntu及当前范围人工验收未完成。


2026-10-09 V1.2失败注入复验：直接覆盖Governance写入失败后的Artifact不可发布；V1.2完整code suite再次退出0，Platform全单测300/300，隔离PostgreSQL 4/4，双市场Qlib/Web/API/CLI重启恢复E2E通过并清理容器/卷/网络。最新同Run及限制见[阶段§8.29](prd/v1-local-simulation/02-small-data-and-qlib.md#829-artifact暂存与失败不可见2026-10-09)。当前范围人验收、缺失历史导出、OD-014和实机/恢复任务仍未关闭。

正式门禁a232复核：文档审计及证据审计PASS（626/70/244），V1仍INCOMPLETE/exit 2；四个历史Run、阶段交付/版本勾选、OD-014结算、真实恢复、Ubuntu和当前范围人工验收仍未完成。


2026-10-09 V1.2 Artifact过期保护：新增已过期内容不可通过相同Run重试复活的仓储约束和隔离PG断言；完整V1.2 code suite再度通过（Platform 300/300、迁移/服务隔离集成、锁版Qlib、容器E2E四Run和清理通过）。报告在[阶段§8.29](prd/v1-local-simulation/02-small-data-and-qlib.md#829-artifact暂存与失败不可见2026-10-09)。

正式门禁a233复核：Artifact过期保护证据链接加入后，五阶段文档审计PASS、证据审计PASS（626引用、70份Manifest、244条目）；四个历史TestRun仍缺结构化导出，版本摘要/门禁未勾选，V1总体仍`INCOMPLETE`/exit 2。OD-014结算、实际业务数据配对恢复、Ubuntu实机及当前范围人工验收未满足。[a233日志](../evidence/audits/2026-10-09-v1-version-gate-a233.log)、[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a233.log.sha256)。

正式门禁a234在本页与总计划同步后复核：阶段文档审计PASS、证据审计PASS（626/70/244），V1仍`INCOMPLETE`/exit 2；四个历史Run结构化导出、OD-014、真实恢复、Ubuntu及当前人工验收仍未满足。[a234日志](../evidence/audits/2026-10-09-v1-version-gate-a234.log)，[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a234.log.sha256)。

2026-10-09当前工作区V1.4完整代码套件复验exit 0：禁网linux/arm64锁版Python Worker 14/14，Quant与PostgreSQL持久FakeBroker六个CN/US规则情景逐字段对照通过，隔离迁移CLI、Market Data PG 28/28、报告发布fencing 2/2及规定全仓检查通过；随机数据库和网络清理已核验。完整日志见[V1.4当前套件](../evidence/audits/2026-10-09-v14-code-suite-current-a01.log)及[SHA-256](../evidence/audits/2026-10-09-v14-code-suite-current-a01.log.sha256)。V1.4阶段与V1总门禁仍未完成，结算语义、完整规则一致性、历史Run证据、Ubuntu及人工验收继续开放。

正式门禁a235：纳入V1.4当前代码套件/§8.9及验收表后，五阶段文档审计PASS、证据审计PASS（630引用、71份Manifest、245项），V1仍`INCOMPLETE`/exit 2。四个历史Run导出、OD-014、实际业务配对恢复、Ubuntu和当前范围人工验收仍未满足。[a235日志](../evidence/audits/2026-10-09-v1-version-gate-a235.log)，[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a235.log.sha256)。

正式门禁a236：更新验收表和P4工作包后，五阶段文档审计PASS、证据审计PASS（632引用、71份Manifest、245项），V1仍`INCOMPLETE`/exit 2。未满足项仍包括4个旧TestRun导出、OD-014、真实业务恢复、目标Ubuntu及当前范围人工验收。[a236日志](../evidence/audits/2026-10-09-v1-version-gate-a236.log)，[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a236.log.sha256)。

正式门禁a237：进度与计划更新后，阶段文档审计PASS、证据审计PASS（632/71/245），V1仍`INCOMPLETE`/exit 2；历史导出、结算决策、实际业务恢复、Ubuntu和用户验收未满足。[a237日志](../evidence/audits/2026-10-09-v1-version-gate-a237.log)，[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a237.log.sha256)。

正式门禁a238：最新计划索引同步后，五阶段文档审计PASS、证据审计PASS（632引用、71份Manifest、245项），V1仍`INCOMPLETE`/exit 2；四个旧TestRun导出、OD-014、业务配对恢复、Ubuntu实机和人工验收仍未满足。[a238日志](../evidence/audits/2026-10-09-v1-version-gate-a238.log)，[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a238.log.sha256)。

2026-10-09 P4/A08历史费率切换对照：Quant与持久FakeBroker/PostgreSQL新增对照CN_A 2023-08-28前后冻结费率版本，各自BUY/SELL；当前V1.4完整code suite a02 exit 0，14/14锁版Python Worker和10笔订单/9个Fill-Outbox场景PASS，临时DB/网络清理核验通过。证据已登记在[V1.4 §7/§8.10](prd/v1-local-simulation/04-daily-backtest.md#810-历史费率切换的持久订单逐笔对照2026-10-09)及[V1.4套件日志](../evidence/audits/2026-10-09-v14-code-suite-current-a02.log)。只关闭冻结日期费率的持久逐笔对照子项；真实费率、OD-014结算、完整P4一致性、阶段状态和V1总门禁不变。

正式V1门禁a239：V1.4历史费率切换对照与验收记录纳入后，五阶段文档审计PASS、证据审计PASS（636引用、72份Manifest、246项）；V1仍`INCOMPLETE`/exit 2。四个历史Run导出、OD-014、实际业务恢复、Ubuntu和当前范围人工验收仍未满足。[a239日志](../evidence/audits/2026-10-09-v1-version-gate-a239.log)，[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a239.log.sha256)。

正式门禁a240复核：阶段文档审计PASS、证据审计PASS（636/72/246），V1仍`INCOMPLETE`/exit 2；4个历史Run导出、OD-014、实际恢复、Ubuntu与当前范围人工验收仍未满足。[a240日志](../evidence/audits/2026-10-09-v1-version-gate-a240.log)，[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a240.log.sha256)。

正式门禁a241：V1.4历史费率对照阶段/总进度索引同步后，五阶段文档审计PASS、证据审计PASS（636引用、72份Manifest、246项），V1仍`INCOMPLETE`/exit 2。四个历史Run结构化导出、OD-014、真实业务配对恢复、Ubuntu实机与当前范围人工验收仍未满足。[a241日志](../evidence/audits/2026-10-09-v1-version-gate-a241.log)，[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a241.log.sha256)。

2026-10-09 V1.4当前工作区Web/API/CLI E2E通过：五项Playwright、normal/rejection/recovery/market restrictions/historical fees/corporate actions及有界策略场景通过；API与八个浏览器Run经同Run CLI核验，17个Platform TestRun与16个Quant BacktestRun/Manifest Hash一致，恢复测试和资源清理通过。[运行报告](../evidence/audits/2026-10-07-v14-durable-tasks-668a13697fcfa1b5d777.json)、[说明](../evidence/audits/2026-10-07-v14-durable-tasks-668a13697fcfa1b5d777.md)、[源码/运行Hash清单](../evidence/audits/2026-10-07-v14-durable-tasks-668a13697fcfa1b5d777.sha256)。人工结论仍NOT_RUN，V1.4/V1及OD-014、完整规则、Ubuntu和用户验收仍未关闭。

正式V1门禁a242：V1.4当前工作区Web/API/CLI矩阵及机器证据纳入后，五阶段文档审计PASS、证据审计PASS（644引用、73份Manifest、349项）；V1仍`INCOMPLETE`/exit 2。四个历史TestRun导出、OD-014、实际业务恢复、Ubuntu及当前范围人工验收仍未满足。[a242日志](../evidence/audits/2026-10-09-v1-version-gate-a242.log)，[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a242.log.sha256)。

正式V1门禁a243：阶段/计划/验收增加V1.4隔离Web/API/CLI运行证据后，文档审计PASS、证据审计PASS（644引用、73份Manifest、349项）；V1仍`INCOMPLETE`/exit 2。当前范围人工验收保持NOT_RUN；历史导出、OD-014、业务配对恢复和Ubuntu环境仍未满足。[a243日志](../evidence/audits/2026-10-09-v1-version-gate-a243.log)，[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a243.log.sha256)。

正式V1门禁a244：纳入V1.3 Governance授权签发/验证三种模式篡改的真实HTTP+PostgreSQL拒绝证据后，文档审计PASS、证据审计PASS（646引用、74份Manifest、350项），V1仍`INCOMPLETE`/exit 2。四个历史TestRun导出、OD-014、完整业务配对恢复、目标Ubuntu和当前范围人工验收仍未满足。[a244日志](../evidence/audits/2026-10-09-v1-version-gate-a244.log)，[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a244.log.sha256)。

正式V1门禁a245：验收表收录V1.3 Governance模式注入证据后复核，文档审计PASS、证据审计PASS（649引用、75份Manifest、351项），V1仍`INCOMPLETE`/exit 2；四个历史Run结构化导出、OD-014结算决策、实际业务配对恢复、目标Ubuntu实机及当前范围人工验收仍未满足。[a245日志](../evidence/audits/2026-10-09-v1-version-gate-a245.log)，[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a245.log.sha256)。

2026-10-09 P3/A07增量：Governance授权签发与验证HTTP/PostgreSQL真实端点对`LIVE/FAKE`、`PAPER/REAL`、`LIVE/REAL`三种篡改均返回422，验证探测不消费ACTIVE授权；合法并发验证仍为`CONSUMED`/`REPLAYED`且仅一条绑定授权。改后完整V1.3代码套件exit 0，日志及Hash见[V1.3 §8.32](prd/v1-local-simulation/03-fake-broker-trading-loop.md#832-governance执行授权签发验证模式注入拒绝-2026-10-09)。仅关闭Governance两条路由的模式注入子项；全服务/Worker模式边界、Trade→FakeBroker/Portfolio完整接受路径和A07父项仍未关闭。

2026-10-09 P3/A07增量：Platform API账户初始化、Proposal/Mandate创建和MANUAL、sequenced-MANUAL、AUTO执行六条入口明确拒绝客户端模式字段；18次非法模式注入均422，AUTO Mandate不存在、订单/Fill为0、账本未变。定向回归与改后V1.3完整代码套件通过，完整Web/API/CLI矩阵22/22，TestRun `d938c4e8-0ef0-4b4f-abe9-a0c7a83ec4b6`。详见[V1.3 §8.33](prd/v1-local-simulation/03-fake-broker-trading-loop.md#833-platform-auto-mandate执行路由模式注入拒绝-2026-10-09)、[完整代码套件](../evidence/audits/2026-10-09-v13-platform-mode-strict-code-suite-a02.log)与[完整E2E日志](../evidence/audits/2026-10-09-v13-platform-mode-strict-e2e-a02.log)。仅关闭这六条Platform端点子项，P3/A07父项及V1仍未完成。

正式门禁a246首次复核：阶段文档审计PASS，但证据审计FAIL（四个当前源码SHA被指为不匹配）。查明被点名的V1.2/V1.4 SHA清单是旧执行源码快照，已在PRD引用标签标明“历史执行快照”，原始哈希文件未改写；a246失败日志保留。[a246日志](../evidence/audits/2026-10-09-v1-version-gate-a246.log)。随后a247证据审计PASS（653引用、73份当前Manifest、212项），V1仍INCOMPLETE/exit 2；四个指定历史Run导出、OD-014、恢复、Ubuntu和当前范围人工验收仍未满足。[a247日志](../evidence/audits/2026-10-09-v1-version-gate-a247.log)，[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a247.log.sha256)。

正式门禁a248：将历史SHA快照审计失败的解释及V1.3 Platform模式注入记录纳入索引后复核，阶段文档审计PASS、证据审计PASS（656引用、74份Manifest、213项），V1仍INCOMPLETE/exit 2；四个历史Run导出、OD-014、业务恢复、Ubuntu实机及当前范围人工验收仍未满足。[a248日志](../evidence/audits/2026-10-09-v1-version-gate-a248.log)，[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a248.log.sha256)。

正式门禁a249：验收与进度索引同步后复核，阶段文档审计PASS、证据审计PASS（658引用、75份Manifest、214项），V1仍INCOMPLETE/exit 2；四个历史TestRun导出、OD-014、业务配对恢复、目标Ubuntu实机及当前范围人工验收仍未满足。[a249日志](../evidence/audits/2026-10-09-v1-version-gate-a249.log)，[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a249.log.sha256)。

正式门禁a250：V1.3模式边界证据及a246失败/a247恢复记录完成计划与验收索引后复核，阶段文档审计PASS、证据审计PASS（660引用、76份Manifest、215项），V1仍INCOMPLETE/exit 2；四个历史导出、OD-014、实际配对恢复、Ubuntu和当前范围人工验收仍未满足。[a250日志](../evidence/audits/2026-10-09-v1-version-gate-a250.log)，[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a250.log.sha256)。

正式门禁a251：纳入V1.3账户初始化模式拒绝与18次端点注入回归证据后复核，阶段文档审计PASS、证据审计PASS（662引用、77份Manifest、216项），V1仍INCOMPLETE/exit 2；四个历史导出、OD-014、实际业务配对恢复、Ubuntu实机和当前范围人工验收仍未满足。[a251日志](../evidence/audits/2026-10-09-v1-version-gate-a251.log)，[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a251.log.sha256)。

2026-10-09 V1.1入口模式边界增量：账户初始化和TestRun创建拒绝客户端`environmentMode`/`brokerMode`注入；当前源码构建的隔离`pnpm test:integration:v11-stage-storage`退出0，V1.1 code/storage/Web normal/rejection/recovery 3/3通过，CLI同Run核对和精确资源清理通过。详情见[V1.1 §8.24](prd/v1-local-simulation/01-environment-and-web-center.md#824-v11入口拒绝客户端交易模式注入2026-10-09)。新增运行自动证据不改变V1.1或V1整体状态，用户验收、活动存储维护条件等仍未关闭。

正式门禁a252：V1.1入口模式注入回归与阶段记录纳入后复核，五阶段文档审计PASS、证据审计PASS（664引用、78份Manifest、217项），V1仍INCOMPLETE/exit 2。尚缺四个历史Run结构化导出；OD-014结算规则、跨域配对恢复/活动存储维护、目标Ubuntu实机及版本级人工验收仍未完成。[a252日志](../evidence/audits/2026-10-09-v1-version-gate-a252.log)，[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a252.log.sha256)。

正式门禁a253：将a252执行结果及本轮V1.1边界证据索引纳入后复核，五阶段文档审计PASS、证据审计PASS（665引用、78份Manifest、217项），V1仍INCOMPLETE/exit 2。[a253日志](../evidence/audits/2026-10-09-v1-version-gate-a253.log)，[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a253.log.sha256)。

2026-10-09 Portfolio模式边界增量：Portfolio内部Fill、费用更正、资源预留、结算四条写入口拒绝额外交易模式字段；HTTP/隔离PG验证422且拒绝前无账本副作用，正常Paper及Backtest初始化保留。V1.1完整code suite exit 0；V1.3完整code suite exit 0、Web/API/CLI 22/22通过。L06 E2E现在覆盖Outbox后台先完成Fill时合法的CAPTURED时序；首轮假设错误的失败被保留，最终a02通过。证据见[V1.3 §8.34](prd/v1-local-simulation/03-fake-broker-trading-loop.md#834-portfolio写入口拒绝客户端模式注入与outbox时序2026-10-09)。P3全量路由矩阵和V1整体仍开放。

正式门禁a254：纳入Portfolio四条写入口模式拒绝、完整V1.1/V1.3代码套件及V1.3 E2E 22/22证据后，五阶段文档审计PASS、证据审计PASS（671引用、79份Manifest、218项），但V1仍INCOMPLETE/exit 2。历史Run原始导出、OD-014、活动库维护/非终态Run处置、实际全V1配对恢复、Ubuntu及当前范围用户验收仍未满足。[a254日志](../evidence/audits/2026-10-09-v1-version-gate-a254.log)，[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a254.log.sha256)。

正式门禁a255：a254结果及计划/验收链接同步后，五阶段文档审计PASS、证据审计PASS（673引用、80份Manifest、219项），V1继续INCOMPLETE/exit 2。验收/外部条件未改变。[a255日志](../evidence/audits/2026-10-09-v1-version-gate-a255.log)，[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a255.log.sha256)。

2026-10-09 P0/A01追踪更新：稳定需求`V1.3-S2-L17`已加入本轮Platform/Governance/Trade/Portfolio服务端模式边界证据及V1.3 E2E 22/22结果；40条证据/源码路径存在、索引SHA sidecar有效。该行保持PARTIAL，剩余V1服务/Worker完整路由及BACKTEST接受路径语义仍未审完。[当前覆盖审计](../evidence/audits/2026-10-08-v1-current-coverage.md#2026-10-09-a01追加v13-s2-l17服务端模式边界精确映射)。

正式门禁a256：稳定交叉索引纳入最新V1.3模式边界映射后复核，五阶段文档审计PASS、证据审计PASS（675引用、81份Manifest、220项）；V1仍INCOMPLETE/exit 2。历史Run导出、OD-014、维护/恢复、Ubuntu与用户验收未满足。[a256日志](../evidence/audits/2026-10-09-v1-version-gate-a256.log)，[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a256.log.sha256)。

正式门禁a257：a256结果与验收指针同步后复核，五阶段文档审计PASS、证据审计PASS（677引用、82份Manifest、221项），V1继续INCOMPLETE/exit 2。[a257日志](../evidence/audits/2026-10-09-v1-version-gate-a257.log)，[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a257.log.sha256)。

2026-10-09 P0/A01映射增量：稳定索引`V1.3-S2-L16`新增11条精确固定E2E测试关联（正常/HOLD/预算拒绝、业务拒绝、响应丢失、查询失败、重启、乱序Fill、部分撤单）。证据路径/索引Hash检查通过，需求仍PARTIAL，完整市场与故障矩阵、结算和用户验收未由此关闭。见[当前覆盖审计](../evidence/audits/2026-10-08-v1-current-coverage.md#2026-10-09-a01追加v13-s2-l16固定交易场景精确测试映射)。

正式门禁a258：纳入L16/L17交叉索引增量后，五阶段文档审计PASS、证据审计PASS（679引用、83份Manifest、222项），V1仍INCOMPLETE/exit 2。[a258日志](../evidence/audits/2026-10-09-v1-version-gate-a258.log)，[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a258.log.sha256)。

正式门禁a259：a258结果及总索引同步后复核，五阶段文档审计PASS，证据审计PASS（681引用、84份Manifest、223项），V1继续INCOMPLETE/exit 2；必需外部历史证据、结算决定、环境演练和人工验收未完成。[a259日志](../evidence/audits/2026-10-09-v1-version-gate-a259.log)，[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a259.log.sha256)。

2026-10-09 V1.3事件序列映射补证：单独运行Trade FakeBroker事件序列单测3/3通过，覆盖撤单先到后按序归并、序号缺口/事实冲突、重复回放幂等及无效/过期序号拒绝；日志及SHA见[单测证据](../evidence/audits/2026-10-09-v13-event-sequencer-unit-a01.log)。交叉索引A01已增加对应精确断言/证据，父项仍PARTIAL/OPEN。正式V1版本门禁a260复核：五阶段文档审计PASS，证据审计PASS（683引用、85份Manifest、224项），V1仍INCOMPLETE/exit 2；四条历史Run结构化导出及环境、决定、工程与人工验收条件未满足。[门禁日志](../evidence/audits/2026-10-09-v1-version-gate-a260.log)及[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a260.log.sha256)。

2026-10-09 V1基础门禁复跑：`pnpm baseline:check`退出0，Markdown 6729链接/0失败，JSON合同/Fixture校验0失败，生成客户端与schema drift检查通过，Artifact content-store测试及8服务分层检查通过；脚本测试55/55。完整日志：[baseline-check a01](../evidence/audits/2026-10-09-v1-baseline-check-a01.log)，SHA-256 sidecar随文件。该基础检查不关闭五阶段业务接受路径、环境/历史证据或人工验收。复核最新V1正式版本门禁仍以a260为准，待本记录纳入后再复跑。

正式V1版本门禁a261在baseline复跑及本轮计划/进度同步后执行：五阶段文档审计PASS，证据审计PASS（683引用、85份Manifest、224项），V1仍INCOMPLETE/exit 2；四个历史TestRun结构化导出及计划列明的结算决策、活动存储/非终态Run处置、全域配对恢复、目标Ubuntu和实际用户验收尚未满足。[a261门禁日志](../evidence/audits/2026-10-09-v1-version-gate-a261.log)，[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a261.log.sha256)。

2026-10-09 P3增量：Decision Governance AUTO Mandate创建、激活、订单授权及预算结算4类写入口增加三种LIVE/REAL模式注入拒绝HTTP+PostgreSQL验证，均422且写侧仓储/预算无副作用，合法创建激活仍成功；Evidence在[V1.3 §8.35](./prd/v1-local-simulation/03-fake-broker-trading-loop.md#835-governance-auto-mandate服务写入口模式注入拒绝2026-10-09)及[HTTP+PG日志](../evidence/audits/2026-10-09-v13-governance-auth-http-a05.log)。单测6/6通过。更新后的V1.3完整代码套件运行到锁定Python Worker时因本地缺失镜像`python@sha256:e41613...`按前置退出2；它不是PASS，本轮完成的Node单测和HTTP+PG切片分别记录。完整V1路由矩阵仍OPEN。

正式V1版本门禁a262：收录Governance AUTO Mandate模式注入HTTP/PG证据及本轮文档后，五阶段文档审计PASS、证据审计PASS（687引用、85份Manifest、224项）；V1仍INCOMPLETE/exit 2。除上述局部交易边界外，四条历史TestRun结构化导出、OD-014结算决定、活动存储与非终态Run处置、全V1配对恢复、Ubuntu及用户本人验收未满足。[a262日志](../evidence/audits/2026-10-09-v1-version-gate-a262.log)与[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a262.log.sha256)。

2026-10-09 V1.3 AUTO Mandate模式边界最终复验：按固定digest准备锁定Python测试镜像后，完整`pnpm verify:stage -- --stage V1.3 --suite code`退出0，包含Python Worker 14/14、所有规定构建/类型/单测/隔离服务身份HTTP+PG及V1.3迁移CLI；记录[a02代码套件日志](../evidence/audits/2026-10-09-v13-governance-mandate-code-a02.log)。AUTO Mandate四类写路由模式注入真实HTTP+PG断言亦通过[a05](../evidence/audits/2026-10-09-v13-governance-auth-http-a05.log)。先前缺镜像exit 2保留为历史失败，不再代表当前套件状态；P3完整V1路由矩阵与其他外部/验收缺口仍开放。

正式V1门禁a263在收录a02完整V1.3代码套件及Governance Mandate HTTP/PG证据后复核：阶段文档审计PASS，证据审计PASS（687引用、85份Manifest、224项），正式版本仍INCOMPLETE/exit 2。四条历史Run导出、OD-014结算决定、活动存储/非终态Run处置、全域配对恢复、目标Ubuntu和用户本人验收仍未满足。[a263日志](../evidence/audits/2026-10-09-v1-version-gate-a263.log)，[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a263.log.sha256)。

2026-10-09 P3/FakeBroker标识增量：持久化测试明确比较首次执行、并发同键重试、重连后重试的FakeBroker对外`orderId`（固定V1.3 brokerOrderId），要求UUID一致；隔离PostgreSQL回归exit 0，机器摘要记录首次/两次重试ID和相等断言：[日志](../evidence/audits/2026-10-09-v13-fakebroker-order-id-stability-a02.log)。交叉索引现将稳定标识原子项列为固定Fixture PASS，而全量place/query/cancel/fills/account HTTP契约及跨域账本归属仍OPEN。

正式V1门禁a264在FakeBroker稳定对外订单ID新证据同步后复核：五阶段文档与证据审计PASS（688引用、85份Manifest、224项），V1仍INCOMPLETE/exit 2；完整FakeBroker操作合同与P3其余项、四条历史导出、OD-014、实际业务配对恢复、Ubuntu和人工验收仍未满足。[a264日志](../evidence/audits/2026-10-09-v1-version-gate-a264.log)，[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a264.log.sha256)。

2026-10-09 P3/FakeBroker查询合同增量：隔离Trade→Portfolio HTTP/PG恢复烟测现通过`GET /internal/v1/orders/by-client-id`在执行后、Trade重启及乱序Fill/撤单恢复后查询，验证同一FakeBroker orderId、`CANCELLED`终态和两条Fill；既有撤单、Fill Outbox及Portfolio精确对账仍通过。[a02日志](../evidence/audits/2026-10-09-v13-fakebroker-contract-http-a02.log)。初次误将独立账户GET加入非V1.3资产账本场景返回404，失败保留于a01；取消该不适配断言后a02通过。完整操作合同和独立账户GET单路由仍OPEN。

正式V1门禁此前复核见[a277](../evidence/audits/2026-10-09-v1-version-gate-a277.log)：V1仍INCOMPLETE/exit 2，后续状态以本页最新a279记录为准。独立资产GET的namespace隔离和缺参拒绝由定向HTTP+PG及完整V1.3代码套件a02验证，见[V1.3 §8.38](prd/v1-local-simulation/03-fake-broker-trading-loop.md#838-fakebroker独立账户资产http读取契约2026-10-09)。Governance Proposal Approve/Reject/Revise模式拒绝及AUTO Mandate pause的三种非法模式注入均有隔离HTTP+PG和完整V1.3 code suite证据；分别见[§8.39](prd/v1-local-simulation/03-fake-broker-trading-loop.md#839-governance-proposal审批修订拒绝模式注入2026-10-09)、[§8.40](prd/v1-local-simulation/03-fake-broker-trading-loop.md#840-auto-mandate暂停路由模式注入拒绝2026-10-09)。L17/P3父项仍开放。四个历史Run导出、OD-014、活动数据维护/旧非终态Run处置、真实跨域配对恢复、目标Ubuntu及本人验收仍未满足。

其后继续推进L17：Governance Proposal Approve/Revise对三种非法模式的6次真实HTTP请求均422，持久Proposal仍PENDING/版本1且decision/revision为0；合法Approve及授权流程后续继续成功。定向HTTP+PG与完整V1.3 code suite通过，证据见[阶段§8.39](prd/v1-local-simulation/03-fake-broker-trading-loop.md#839-governance-proposal审批修订拒绝模式注入2026-10-09)。此为路由原子项，L17父级全服务/Worker接受路径矩阵仍OPEN；无用户验收复选框变更。

2026-10-09继续V1.3 Trade模式边界：共享Trade改动后V1.5完整代码套件a02退出0；隔离Web/API/CLI/export E2E a01四场景PASS（normal、auto-trade、rejection、recovery），每个Run均以同Run CLI/export核验，精确隔离资源清理通过，无真实券商/外部来源调用。证据见[V1.5代码套件](../evidence/audits/2026-10-09-v15-trade-transition-mode-compat-code-suite-a02.log)和[E2E](../evidence/audits/2026-10-09-v15-trade-transition-mode-web-e2e-a01.log)。已同步§8.41、阶段验收和L17索引；兼容性增量通过不表示L17/P3或V1完成，正式门禁待本轮文档同步后重跑。V1剩余历史Run导出、OD-014、运行数据维护/旧非终态Run决定、真实全域配对恢复、Ubuntu实机及本人验收仍OPEN。

2026-10-09继续V1.3/V1.5共享Trade路由：Outbox补偿入口现在拒绝任何非空请求体；隔离HTTP+PostgreSQL证明LIVE/REAL注入422且Outbox事实不变，合法空请求仍进入重试路径。V1.3、V1.4、V1.5完整代码套件通过；V1.3 22项完整Web/API/CLI/export E2E和V1.5四场景兼容E2E通过，精确隔离资源清理，无真实券商或外部数据源调用。证据见[V1.3 §8.42](./prd/v1-local-simulation/03-fake-broker-trading-loop.md#842-trade-outbox补偿路由拒绝请求体注入及跨阶段回归2026-10-09)。该单路由证据不关闭L17/P3父项或V1；外部历史Run、OD-014、活动数据/旧Run决定、真实全域配对恢复、目标Ubuntu和本人验收仍待完成。

正式V1门禁a279：阶段文档审计PASS（5阶段）；证据审计PASS（723引用、97份Manifest、236项）；V1仍INCOMPLETE/exit 2。4个历史TestRun结构化导出缺失，版本摘要仍不完整且需复核门禁记录。[a279日志](../evidence/audits/2026-10-09-v1-version-gate-a279.log)，[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a279.log.sha256)。

正式V1门禁a283复核：五阶段文档审计PASS；证据审计PASS（731引用、97份Manifest、236项）；版本仍INCOMPLETE/exit 2。四个历史TestRun结构化导出缺失，版本门禁人工/业务条件未完成；保留`uncheckedVersionGate`与`versionSummaryIncomplete`，不伪造关项。[a283日志](../evidence/audits/2026-10-09-v1-version-gate-a283.log)，[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a283.log.sha256)。

2026-10-09继续V1.3/V1.4请求边界：Trade历史FakeBroker执行路由此前没有落实请求Schema的`additionalProperties:false`，可能静默忽略LIVE/REAL字段。现在严格拒绝顶层及bar/reservation嵌套未知字段并限制请求体8 KiB。Trade隔离PostgreSQL HTTP+PG覆盖LIVE/FAKE、PAPER/REAL、LIVE/REAL三种组合：全为422，Governance校验调用不增加，订单无写入；合法BACKTEST仍按原路径执行。完整V1.3代码套件exit 0，完整V1.4代码套件exit 0，V1.4 Web/API/CLI E2E Playwright 5/5及同Run CLI核验通过，隔离资源清理通过。证据见[V1.4 §8.12](prd/v1-local-simulation/04-daily-backtest.md#812-historical-fakebroker-http命令严格附加字段边界2026-10-09)和[完整Web E2E日志](../evidence/audits/2026-10-09-v14-historical-execution-strict-body-web-e2e-a01.log)。此仅收紧BACKTEST请求字段原子契约，不关闭L17全矩阵、V1.4规则/结算或V1整体。

2026-10-09 V1.4历史执行HTTP边界后版本门禁复核a283：五阶段文档审计PASS；证据审计PASS（731引用、97份Manifest、236项）；V1仍INCOMPLETE/exit 2。四个历史TestRun原始结构化导出、结算口径、活动记录责任人处置、真实全域配对恢复、目标Ubuntu及当前范围人工签署仍未满足。

正式V1门禁a285复核：五阶段文档审计PASS，证据审计PASS（741引用、99份Manifest、238项）；V1仍INCOMPLETE/exit 2。四个历史TestRun结构化导出、业务/环境决定、全域配对恢复和当前范围人工验收仍未完成。[a285门禁日志](../evidence/audits/2026-10-09-v1-version-gate-a285.log)，[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a285.log.sha256)。

正式V1门禁a285复核：五阶段文档审计PASS，证据审计PASS（741引用、99份Manifest、238项）；版本仍INCOMPLETE/exit 2。四个历史TestRun导出、OD-014与旧Run处置决定、完整跨域配对恢复、目标Ubuntu及本人新增范围验收均未完成。[a285日志](../evidence/audits/2026-10-09-v1-version-gate-a285.log)，[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a285.log.sha256)。

共享Trade请求边界变更后的V1.1完整代码兼容复验通过：隔离Trade/Portfolio PostgreSQL契约、服务身份探针、迁移CLI和V1.1服务检查均PASS，活动服务未连接；完整日志见[V1.1兼容套件](../evidence/audits/2026-10-09-v11-trade-outbox-compensation-compat-code-suite-a01.log)。该项补齐共享服务的V1.1受影响回归，不关闭活动存储切换/回退、Stage人工验收或V1门禁余项。

正式V1门禁a286：五阶段文档审计PASS，证据审计PASS（747引用、100份Manifest、239项），版本仍INCOMPLETE/exit 2。四个历史TestRun导出及OD-014、旧Run处理决定、全域恢复、Ubuntu实机和当前范围人工验收仍未满足。[a286门禁日志](../evidence/audits/2026-10-09-v1-version-gate-a286.log)，[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a286.log.sha256)。

2026-10-09 P5/V1.5运行历史比较：完成owner范围V1.5最近Run摘要API和正式Web并排比较，详情仍经owner保护读取；隔离PostgreSQL断言过滤/边界/响应形状，匿名401与伪造owner 403，浏览器实际选中前一Run比较。完整V1.5 code suite和normal/AUTO/rejection/recovery隔离E2E均exit 0，同Run CLI/export及精确资源清理通过，无真实来源/券商调用。证据及限制见[V1.5 §8.21](prd/v1-local-simulation/05-scheduling-and-recovery.md#821-owner范围v15运行历史与并排比较2026-10-09)、[代码日志](../evidence/audits/2026-10-09-v15-owner-run-history-comparison-code-suite-a01.log)、[E2E日志](../evidence/audits/2026-10-09-v15-owner-run-history-comparison-web-e2e-a02.log)。已更新需求交叉表；V1.5-S2-L19父项仍OPEN（告警/能力阻塞/跨阶段追溯未完），人工验收NOT_RUN。正式V1门禁待同步检查后重跑。

正式V1门禁a287（运行历史比较文档同步后）：五阶段文档审计PASS；证据审计PASS（755引用、103份Manifest、242项）；V1仍INCOMPLETE/exit 2。四个历史Run结构化导出、OD-014/旧记录处置决定、阶段业务缺口、全V1实际业务恢复、Ubuntu及当前范围人工验收仍未满足。[a287日志](../evidence/audits/2026-10-09-v1-version-gate-a287.log)，[SHA-256](../evidence/audits/2026-10-09-v1-version-gate-a287.log.sha256)。

2026-10-09 P5/V1.5能力阻塞显示切片：正式验收页新增当前Run工作流派发、NATS、Temporal和领域执行状态表，只有持久证据明确未连接/不可用/失败时标阻塞，NOT_RUN不误报失败。Web投影单测2文件4项通过，typecheck/build通过；完整V1.5 code suite在Docker可访问上下文exit 0，含锁版Python Worker及隔离PostgreSQL；隔离E2E四场景、同Run CLI/export及新增NOT_CONNECTED负向浏览器用例通过，真实来源/券商调用0，随机资源精确清理。首轮E2E因新增页面表格导致旧断言选中全部页面表而失败，保留a01日志，收窄为显式断言表定位后a02通过。详见[V1.5 §8.22](prd/v1-local-simulation/05-scheduling-and-recovery.md#822-v15-run能力状态与明确阻塞显示2026-10-09)、[code suite](../evidence/audits/2026-10-09-v15-capability-blockers-code-suite-a02.log)、[E2E](../evidence/audits/2026-10-09-v15-capability-blockers-web-e2e-a02.log)。V1.5正式告警Incident集成/确认及跨阶段追溯仍开放，V1.5-S2-L19父项不关闭。

正式V1门禁a289：五阶段文档审计PASS；证据审计PASS（759引用、105份Manifest、244项、0失败）；V1仍INCOMPLETE/exit 2。四个历史TestRun结构化导出、未决业务决定、阶段剩余工程、全V1真实业务恢复、Ubuntu与当前范围人工验收仍未满足。[a289日志](../evidence/audits/2026-10-09-v1-version-gate-a289.log)，SHA-256 `e9ffa3cd11030bd5217a7fd15b97a43ee7ccab2d12c364bd97f7f3507ec0331a`。a288因两份新增日志sidecar缺`evidence/audits/`相对前缀而判证据FAIL，修正sidecar后a289通过证据审计；失败记录保留。

2026-10-09 V1.5能力阻塞/告警导航最终复验：运行面板精确展示workflow/NATS/Temporal/领域执行持久状态，NOT_CONNECTED/显式失败列为阻塞、NOT_RUN不转为失败；增加至既有V2.4系统告警/Paper概览的链接。完整V1.5 Web/API/CLI/export E2E a03及code suite a03 exit 0，含四场景、负向能力阻塞浏览器用例、身份拒绝5/5、锁版Python Worker、隔离PostgreSQL和随机资源精确清理；外部来源/真实券商调用0。最终证据见[V1.5 §8.22](prd/v1-local-simulation/05-scheduling-and-recovery.md#822-v15-run能力状态与明确阻塞显示2026-10-09)、[E2E](../evidence/audits/2026-10-09-v15-capability-alerts-web-e2e-a03.log)、[完整代码套件](../evidence/audits/2026-10-09-v15-capability-alerts-code-suite-a03.log)。V1.5 Run级告警Incident、自动告警、跨阶段追溯仍开放。

正式V1门禁a290：五阶段文档审计PASS，证据审计PASS（765引用、106份Manifest、245项、0失败），整体仍INCOMPLETE/exit 2。4个历史Run结构化导出缺失，活动/业务决定、全域实际恢复、Ubuntu、当前人工验收与版本门禁勾选未完成。[a290日志](../evidence/audits/2026-10-09-v1-version-gate-a290.log)，SHA-256 `7eb2af6b4535f21178a25d6e47cc161f07739bb1706d02d148d99204ee669c30`。

2026-10-09 P5/V1.5配对恢复增量：隔离E2E现将真实AUTO Run的FakeBroker订单/Fill、Portfolio账户快照、Governance预算、NATS JetStream确认、Temporal历史与ArtifactRef/字节纳入四卷备份并恢复到新隔离栈；同Run CLI保留WAITING/check-only exit 2。使用新NATS消息ID重放原事件后复用稳定Workflow ID，业务事实无重复变化；E2E exit 0、外部来源/真实券商调用0、隔离资源精确清理。报告[JSON](../evidence/audits/2026-10-09-v15-paired-backup-restore-sq-v15-e2e-3f8a26344c4a0ef1f867.json)，SHA-256 `fccf792169f8667ba5ff780831e011b7a3c292cf8e08bcde79ff7e2930fcfe11`；详细操作见[V1.5 §8.23](prd/v1-local-simulation/05-scheduling-and-recovery.md#823-v15四卷配对恢复与auto业务幂等续跑2026-10-09)。仅覆盖V1.5隔离栈与合成Artifact，不证明V1.1–V1.4活动数据、宿主/异地灾备或RPO/RTO；P5和人工验收仍开放。

正式V1门禁a291（V1.5配对恢复证据同步后）：五阶段文档审计PASS；证据审计PASS（766引用、106份Manifest、245项、0失败）；总版本仍INCOMPLETE/exit 2。4个历史TestRun结构化导出、未决业务/环境决定、其余阶段交付、V1.1–V1.4活动数据/完整灾备、Ubuntu和当前范围用户验收仍未满足；V1版本门禁复选框保持未勾选。[a291日志](../evidence/audits/2026-10-09-v1-version-gate-a291.log)，SHA-256 `f19f7a0a32a772b5a715f71b42c973593524649df62c898a78dd11183a72cd49`。

2026-10-09 V1.5配对恢复Harness改动后的完整code suite复验exit 0；日志[code suite](../evidence/audits/2026-10-09-v15-paired-backup-restore-code-suite-a01.log)，SHA-256 `fcc7c46d3935a102a77722c417a09d903a00f143803a744f69a97ae804525eec`。详见[V1.5 §8.23](prd/v1-local-simulation/05-scheduling-and-recovery.md#823-v15四卷配对恢复与auto业务幂等续跑2026-10-09)。

正式V1门禁a292（追加V1.5配对恢复完整code suite日志后）：五阶段文档审计PASS；证据审计PASS（767引用、107份Manifest、246项、0失败）；V1仍INCOMPLETE/exit 2。4个历史TestRun结构化导出、未决业务决定、V1.1–V1.4活动数据及宿主灾备、Ubuntu实机和当前范围用户验收尚未完成。[a292日志](../evidence/audits/2026-10-09-v1-version-gate-a292.log)，SHA-256 `5b99f6966352b31a6436bac93dca6258de67683834fddc398440dcb8a8046baa`。版本验收表保持未签字、版本门禁复选框保持未勾选。

正式V1门禁a294（计划摘要同步后复验）：五阶段文档审计PASS、证据审计PASS（767引用、106份Manifest、245项、0失败），V1仍INCOMPLETE/exit 2；a293与a294结论一致。[a294日志](../evidence/audits/2026-10-09-v1-version-gate-a294.log)，SHA-256见[sidecar](../evidence/audits/2026-10-09-v1-version-gate-a294.log.sha256)。

正式V1门禁a295（进度/计划同步后）：阶段文档审计PASS、证据审计PASS（767引用、106份Manifest、245项、0失败），V1仍INCOMPLETE/exit 2；缺失的4个历史TestRun导出及外部决定/环境/用户验收条件保持未完成。[a295日志](../evidence/audits/2026-10-09-v1-version-gate-a295.log)，SHA-256见[sidecar](../evidence/audits/2026-10-09-v1-version-gate-a295.log.sha256)。

2026-10-09 P5/V1.5 Run Incident生命周期增量：Platform按Run持久阻塞证据创建owner/TestRun范围Incident；会话身份确认及重复确认幂等、恢复后解决和再次发生新建通过隔离PostgreSQL/API/Web验证，NOT_RUN/WAITING不会生成Incident。四场景Web/API/CLI/export与3项浏览器测试通过，HTTP探针覆盖owner确认、错误Owner 403及恢复解决，隔离Compose资源精确清理；报告[JSON](../evidence/audits/2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-88f2a323800f2c15b7b2.json)，SHA-256 `4664caad1b194e50dea189d51fd1d5290b93e015c0f36a4bd8262cc33b541c1d`。代码专项日志[首次执行](../evidence/audits/2026-10-09-v15-run-incidents-code-suite-a01.log)；本轮完整代码门禁复跑因锁版Python Worker镜像`python@sha256:e41613d42d4891e4930f79523f93f81bbc7632584ec65e36ab055f41a800b41e`在本地不可用而exit 2，失败记录保留于[复跑日志](../evidence/audits/2026-10-09-v15-run-incidents-code-suite-a02.log)，先前通过的V1.5完整代码套件证据仍有效但不能替代本次缺失组件复验。文档链接、合同检查、Web typecheck及`git diff --check`通过。

正式V1门禁a296（Run Incident文档同步前执行）：五阶段文档审计PASS；证据审计PASS（769引用、106份Manifest、245项、0失败）；V1仍INCOMPLETE/exit 2。门禁定位到4个缺结构化导出的TestRun：`5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`及V1.5的`25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`；OD-014/旧Run处置、V1.1–V1.4活动数据与宿主灾备、Ubuntu实机及当前范围用户验收亦未完成。[a296日志](../evidence/audits/2026-10-09-v1-version-gate-a296.log)，SHA-256 `ea9123c0d274ae41030f8e3ed5d54dd4ce27c49e8f08da2070c8714f5222ad6c`。版本门禁复选框与当前范围人工验收保持未勾选。

正式V1门禁a297（Run Incident计划/进度/手册同步后）：五阶段文档审计PASS；证据审计PASS（769引用、106份Manifest、245项、0失败）；V1继续INCOMPLETE/exit 2。四个历史TestRun结构化导出缺失、OD-014与旧非终态Run决定、V1.1–V1.4活动数据及宿主灾备、Ubuntu实机和当前范围人工验收未满足。[a297日志](../evidence/audits/2026-10-09-v1-version-gate-a297.log)，SHA-256见[sidecar](../evidence/audits/2026-10-09-v1-version-gate-a297.log.sha256)。

正式V1门禁a298最终复核：阶段文档审计PASS、证据审计PASS（769引用、106份Manifest、245项、0失败），V1仍INCOMPLETE/exit 2；四个历史TestRun导出、业务/旧Run决定、全域恢复、Ubuntu实测和本人验收仍未满足。机器日志保存在`evidence/audits/2026-10-09-v1-version-gate-a298.log`（SHA-256 `ea9123c0d274ae41030f8e3ed5d54dd4ce27c49e8f08da2070c8714f5222ad6c`）；门禁与人工验收未签署。

2026-10-09 V1.5 Run Incident完整代码复验：先前复跑因本地缺少锁版Python镜像退出2；按仓库固定摘要拉取`python@sha256:e41613d42d4891e4930f79523f93f81bbc7632584ec65e36ab055f41a800b41e`后，`pnpm verify:stage -- --stage V1.5 --suite code`完整exit 0。Linux ARM64禁网/只读Worker测试14/14、全套件服务检查通过、新Run Incident隔离PostgreSQL 3/3、临时数据库资源清理均通过；日志[a03](../evidence/audits/2026-10-09-v15-run-incidents-code-suite-a03.log)，SHA-256 `e954d1b6b1d68eb1d3a77a54ecb48e18e22a54d3472ca2e7c85bfcfda2527a2e`。

2026-10-09共享Platform变更后的V1.1兼容回归：`pnpm verify:stage -- --stage V1.1 --suite code` exit 0；包含全仓检查、Market Data服务身份/HTTP、隔离迁移与存储双写/owner读取、FakeBroker恢复和订单账本专项，全部临时PostgreSQL清理通过，活动服务保持`NOT_CONNECTED`。日志[套件](../evidence/audits/2026-10-09-v11-run-incidents-compat-code-suite-a01.log)，SHA-256 `997588765a326f08bdc61d887ff4373c0e786bc3ba1ea994a4d681c6a09cb2ce`。该回归不代表活动存储切换、非终态Run处置或V1.1用户验收完成。

2026-10-09共享Platform变更后的V1.2兼容回归：`pnpm verify:stage -- --stage V1.2 --suite code` exit 0；锁版Qlib/Artifact隔离E2E、11条Platform入口身份边界及四个Web/CLI同Run场景通过，临时Compose资源精确清理，外部来源调用0。详见[V1.2 §8.30](prd/v1-local-simulation/02-small-data-and-qlib.md#830-共享platform-api变更后的v12兼容复验2026-10-09)和[套件日志](../evidence/audits/2026-10-09-v12-run-incidents-compat-code-suite-a01.log)。此回归不补回历史Run导出，不代表活动Artifact/DB切换、Ubuntu实机或人工验收完成。

2026-10-09共享Platform Run Incident改动后的跨阶段兼容回归现已覆盖五阶段：V1.1 code suite及Web/API/CLI 3/3通过；V1.2 code suite含锁版Qlib、Artifact生命周期及Web/API/CLI场景通过；V1.3 code suite与22/22 Web/API/CLI通过；V1.4 code suite与5/5 Web/API/CLI通过；V1.5 code suite及Run Incident四场景E2E通过。所有临时数据库/Compose资源均有精确清理证据，未调用真实数据源或券商。阶段细节分别见V1.1 §8.19、V1.2 §8.30、V1.3 §8.43、V1.4 §8.13、V1.5 §8.24及对应新日志。自动回归不等于阶段用户验收；V1整体门禁仍INCOMPLETE，四个历史Run导出、OD-014、活动数据/旧Run处置、全域灾备、Ubuntu范围和本人验收继续OPEN。

正式V1门禁a300（五阶段本轮兼容代码/E2E记录同步后）：阶段文档审计PASS、证据审计PASS（777引用、106份Manifest、245项、0失败）；V1仍INCOMPLETE/exit 2。准确缺少结构化导出的4个历史Run仍为V1.2 `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`及V1.5 `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`。OD-014、3条旧非终态Run处置、活动V1.1–V1.4数据及完整宿主/异地恢复、Ubuntu门禁与人工验收仍未关闭。日志`evidence/audits/2026-10-09-v1-version-gate-a300.log`，SHA-256 `c48403cf311a670928a74af959a4c067efc49c1e0e3bdf6cc2cf4ac1087e423b`；不新增签署。

2026-10-09 V1.5故障演练Runbook整理：阶段§8.25汇总已具备的隔离Temporal/PostgreSQL/网络故障、Platform双Worker及备用Worker接管、Trade备用实例接管、四卷配对恢复命令与报告，说明每项预期和未覆盖边界；Mac睡眠/唤醒、同时故障及人工全流程尚无证据，故第2节父任务仍OPEN。文档链接6969条/0失败，`git diff --check`通过。正式版本门禁a302阶段文档审计PASS、证据审计PASS（784引用、106份Manifest、245项），V1继续INCOMPLETE/exit 2；四个历史Run结构化导出、OD-014、三条旧非终态Run处置、活动数据与完整灾备、Ubuntu及当前范围人工验收仍未解决。[V1.5 §8.25](prd/v1-local-simulation/05-scheduling-and-recovery.md#825-隔离栈故障演练命令与证据索引2026-10-09)、[a302门禁日志](../evidence/audits/2026-10-09-v1-version-gate-a302.log)，SHA-256 `9a52682164af0b6c5b5863ba9389c38206ab12cd04a271f393d3bdc42a57126e`。

2026-10-09 Run Incident改动后的V1.5 Platform备用Worker故障复验：首次运行因沙箱拒绝loopback监听而未进入测试，失败日志a01保留；受控本机同命令重跑exit 0。身份探针匿名/伪造owner 7/7；normal、AUTO、rejection、recovery四场景同Run CLI/export通过；浏览器3/3；隔离项目`sq-v15-e2e-6558c295fca307bd8c66`容器、卷、网络精确清理，外部来源/券商调用0。报告[JSON](../evidence/audits/2026-10-09-v15-worker-failover-sq-v15-e2e-6558c295fca307bd8c66.json)、[日志a02](../evidence/audits/2026-10-09-v15-run-incident-worker-failover-e2e-a02.log)，SHA-256 `31353fdce776b640ad69dda95bd8ce4bb144bd9916c4d245f2f41d40538cc283`。该运行确认固定Platform Worker切换在当前源码通过，不代表睡眠恢复/同时故障或阶段验收完成。

正式V1门禁a304（Platform Worker当前树故障复验、Runbook及进度同步后）：五阶段文档审计PASS、证据审计PASS（786引用、106份Manifest、245项），V1仍INCOMPLETE/exit 2；4个历史TestRun导出、OD-014与旧Run处置、活动数据/完整灾备、目标Ubuntu实机和当前范围人工验收未完成。[a304门禁日志](../evidence/audits/2026-10-09-v1-version-gate-a304.log)，SHA-256 `7e95a5d4ac7e6a8c9108a056c766147e7c099c79e7cb479ce81b2653a4d01029`。

2026-10-09 V1 Mac M1资源快照：Apple M1 Max/arm64宿主32 GiB内存；Docker Desktop 28.0.4 Linux/aarch64、10 vCPU及约7.65 GiB内存；仓库所在卷460 GiB/325 GiB已用/114 GiB可用。一次V1.5备用Worker故障E2E以约5秒间隔采样9类容器共113条记录，整套E2E退出0、浏览器3/3、随机资源精确清理；Platform API及备用Worker采样最大内存285.4/265.4 MiB。未设CPU quota时CPU读数可超过100%；采样不是绝对峰值且不含Playwright宿主进程。Docker全局磁盘值与范围限制、命令和Hash见[资源审计](../evidence/audits/2026-10-09-v1-m1-container-resource-snapshot-a01.md)、[完整容器采样CSV](../evidence/audits/2026-10-09-v15-worker-failover-resource-sample-a01.csv)。该证据只补固定Mac隔离E2E环境基线，不替代Ubuntu、睡眠/唤醒、完整规模或人工验收。

正式V1门禁a306（M1资源快照及阶段手册同步后）：五阶段文档审计PASS、证据审计PASS（787引用、106份Manifest、245项），V1继续INCOMPLETE/exit 2；四个历史TestRun导出、OD-014/旧Run处置、活动业务配对灾备、目标Ubuntu及当前范围人工验收未完成。[a306门禁日志](../evidence/audits/2026-10-09-v1-version-gate-a306.log)，SHA-256 `78403df7b313c06f1d45462dd482f12f1b91ba7657ac7d0fe235e3e48e1c8acb`。

2026-10-09 V1.5自动Incident增量：Run证据保存时事务内创建/更新Incident，恢复即时解决，复发新建，不再依赖GET触发；V1.5代码与Web/API/CLI/export E2E通过，V1.1–V1.4共享Platform兼容代码套件均通过。详细命令、机器报告与SHA见[V1.5阶段§8.24](prd/v1-local-simulation/05-scheduling-and-recovery.md#824-v15-run-incident生命周期与确认2026-10-09)及完成计划。版本仍未完成，门禁待本次文档同步后复跑；历史Run导出、OD-014/旧Run处置、活动数据完整恢复、Ubuntu实机和当前范围人工验收仍未满足。

正式V1门禁a308：阶段文档审计PASS、证据审计PASS（789引用、106份Manifest、245项），总版本`INCOMPLETE`/exit 2。4个指定历史TestRun结构化导出缺失，版本摘要/门禁未关闭；OD-014、3条旧非终态Run处置、活动数据/全V1配对恢复、目标Ubuntu实机和当前范围人工验收尚未满足。门禁日志及SHA见[完成计划](plans/2026-10-08-v1-completion-plan.md)。

门禁a310（最新）：五阶段文档审计与证据审计均PASS（789引用、106份Manifest、245项）；版本仍INCOMPLETE/exit 2。报告见[正式门禁日志](../evidence/audits/2026-10-09-v1-version-gate-a310.log)及[计划记录](plans/2026-10-08-v1-completion-plan.md)。

2026-10-09 P1/V1.1补充共享Platform Run保存事务改动后的当前树隔离Web/API/CLI复验：完整代码套件exit 0、normal/rejection/recovery 3/3、同Run CLI与导出通过，随机隔离资源清理通过。Run记录及哈希见[V1.1 §8.20](prd/v1-local-simulation/01-environment-and-web-center.md#820-run事务保存变更后的当前树v11端到端兼容复验2026-10-09)。这不改变V1.1阶段状态；人工结论NOT_RUN，活动存储切换未执行。

2026-10-09 P1/V1.2共享Platform Run保存改动后的当前树隔离E2E：首轮固定Python基础镜像读取EOF被保留；同命令复跑exit 0，4个Run Web/API/CLI核对与精确清理通过。日志与机器报告见[V1.2 §8.31](prd/v1-local-simulation/02-small-data-and-qlib.md#831-共享platform-run保存事务变更后的v12当前树复验2026-10-09)。阶段状态不变，新增范围人工验收、Ubuntu及指定历史Run证据仍开放。

2026-10-09 P1/P3 V1.3共享Platform Run保存变更后的隔离E2E复验：22/22通过，CN/US固定订单链、拒绝、Trade重启恢复、同Run CLI/export、独立账本MATCH及精确清理均通过，真实来源/券商调用0。证据见[V1.3 §8.44](prd/v1-local-simulation/03-fake-broker-trading-loop.md#844-共享platform-run保存事务变更后的v13当前树e2e复验2026-10-09)。

2026-10-09 P1/P4 V1.4共享Platform Run保存变更后的隔离E2E：浏览器5/5，Web Run同Run CLI核对、回测页面与比较场景、精确资源清理均通过，日志/机器报告见[V1.4 §8.14](prd/v1-local-simulation/04-daily-backtest.md#814-共享platform-run保存事务变更后的v14当前树复验2026-10-09)。结算规则和当前范围验收继续开放。

正式V1门禁a311：阶段文档审计PASS，证据审计PASS（798引用、107份Manifest、281项、0失败），V1仍INCOMPLETE/exit 2。四个历史Run、OD-014/旧非终态处置、活动数据/全V1恢复、Ubuntu和当前范围人工验收未解决。报告和Hash见[门禁日志](../evidence/audits/2026-10-09-v1-version-gate-a311.log)与[计划记录](plans/2026-10-08-v1-completion-plan.md)。

2026-10-10 P1命令入口补齐：新增`pnpm seed:paper -- --stage V1.3 --run <UUID>`与`pnpm verify:paper`。前者只对已授权WAITING TestRun幂等创建CN_A/CNY、US_EQUITY/USD PAPER+FAKE账户，不生成订单/Fill；后者复用全量隔离V1.3 E2E。脚本单测4/4、合同检查和Platform/Web typecheck通过；真实`verify:paper` exit 0、Playwright 22/22，seed重复调用账户ID稳定。Run、账户、SHA和精确边界见[V1.3 §8.45](prd/v1-local-simulation/03-fake-broker-trading-loop.md#845-seedpaper-与-verifypaper-命令契约-2026-10-10)。该增量仅关闭命令入口子项；V1仍未完成，历史TestRun导出、OD-014与旧Run处置、全域业务恢复、Ubuntu及当前范围人工签收继续OPEN。

2026-10-10 V1.3命令入口的完整代码门禁exit 0，含baseline/合同/服务层/隔离数据库、HTTP身份与迁移检查，日志见[V1.3代码套件](../evidence/audits/2026-10-10-v13-seed-paper-code-suite-a01.log)。正式V1门禁首次发现一份2026-10-06旧V1.2源码快照需标作历史；保持快照文件和SHA不变，仅在引用处注明历史属性后，a315文档审计与证据审计均PASS（799引用、106份Manifest、245项），版本仍INCOMPLETE/exit 2。4个历史Run导出、OD-014/旧Run处置、活动数据维护与业务恢复、Ubuntu和当前范围人工验收未满足；见[门禁a315](../evidence/audits/2026-10-10-v1-version-gate-a315.log)及完成计划。

正式V1门禁a316复核（计划和进度已收录a315结果后）：五阶段文档审计PASS、证据审计PASS（799引用、106份Manifest、245项）；版本仍INCOMPLETE/exit 2，四个历史TestRun导出、OD-014/旧Run处置、活动存储维护与完整业务恢复、Ubuntu及本人验收仍未完成。[a316日志](../evidence/audits/2026-10-10-v1-version-gate-a316.log)，SHA-256见sidecar。

V1.3阶段第7节现记录命令契约增量完成，00-version-plan与99验收页同步了22/22结果；V1.3父项及人工验收未勾成PASS。a317在这些同步后复核仍为INCOMPLETE，阶段文档与证据审计PASS。[a317](../evidence/audits/2026-10-10-v1-version-gate-a317.log)。

V1.3阶段第7节新增命令增量项，00-version-plan与验收页已同步，父项仍部分实现。同步后的正式V1门禁a319：五阶段文档审计PASS、证据审计PASS（800引用、106份Manifest、245项），版本INCOMPLETE/exit 2；必需历史Run导出、工程收尾、决定/环境和本人验收仍未满足。[a319日志](../evidence/audits/2026-10-10-v1-version-gate-a319.log)。

2026-10-10 P0/A01：稳定交叉索引`V1-99-GATE-03`已补入V1.3 `seed:paper`/`verify:paper`的4个精确测试名、实现路径、§8.45与code/E2E证据；145项索引所有证据路径存在性复核0缺失，JSON及SHA sidecar一致。该验收门禁行仍OPEN，因五阶段完整命令矩阵、当前人工验收和环境证据未全部满足。

P0/A01交叉表补录后正式V1门禁a321：文档审计PASS、证据审计PASS（800/106/245），V1仍INCOMPLETE/exit 2；4个历史TestRun结构化导出、结算/旧Run决定、活动恢复、Ubuntu及本人验收仍未完成。[a321](../evidence/audits/2026-10-10-v1-version-gate-a321.log)。

2026-10-10 V1.3 AUTO Mandate预算终态补证：Platform按精确owner/TestRun/Mandate版本从Governance读回预算结果，Web交易结果及刷新后页面显示独立账本快照；读回不可用不会把已提交订单作为失败返回。完整隔离V1.3 Web/API/CLI/export E2E 22/22，新增预算读取API纳入身份矩阵27/27（匿名401、伪造owner403），CN消费1005.00、预留0.00、单次消费断言通过，完整日志及SHA见[V1.3 §8.46](prd/v1-local-simulation/03-fake-broker-trading-loop.md#846-auto-mandate预算终态独立读回2026-10-10)。这只补V1.3 AUTO成功路径预算证据；正式V1整体门禁、历史TestRun导出、OD-014及旧Run处置、活动存储批准和完整配对恢复、Ubuntu实机与当前范围人工验收仍需处理。

2026-10-10 正式V1门禁a323：V1整体`INCOMPLETE`/exit 2；五阶段结构审计PASS，证据审计PASS（804引用、107份Manifest、246项）。门禁继续识别V1.2一个及V1.5三个历史TestRun缺少结构化导出；版本摘要及验收门禁未关闭。OD-014、三条旧非终态Run处置、活动存储维护批准和完整业务数据恢复、Ubuntu实机以及当前范围人工验收未满足。日志：[a323](../evidence/audits/2026-10-10-v1-version-gate-a323.log)，SHA-256 `0b648a4dd1dd40817699014cac53d148c7535287696e27793370cbbe932d8b73`。自动回归PASS不等于V1完成。

V1.3预算读回变更后的完整`pnpm verify:stage -- --stage V1.3 --suite code`退出0；包含真实合同/Fixture/文档、服务单测、隔离HTTP/PG、FakeBroker恢复、授权模式拒绝及服务迁移。完整日志见[§8.46](prd/v1-local-simulation/03-fake-broker-trading-loop.md#846-auto-mandate预算终态独立读回2026-10-10)；稳定145项 requirement-test crosswalk 已增加V1.3-S2-L13精确预算读回测试/证据路径并刷新SHA（`49cc6e01732dda77ece05b1075e5d9c69dd625a16ddcb74f40800c36dc93bc97`），不改变该父需求OPEN状态。

2026-10-10 正式V1门禁a324：V1仍`INCOMPLETE`/exit 2；五阶段结构审计PASS，证据审计PASS（810引用、109份Manifest、248项）。历史Run导出、版本摘要/验收门禁、OD-014与旧Run处置、活动存储维护批准/完整恢复、Ubuntu实机及当前范围人工验收仍未满足。[日志](../evidence/audits/2026-10-10-v1-version-gate-a324.log)，SHA-256 `4d3c0974fb6a86d69cdfce593a2b3e9370b38b3113890ed7dc223d869c01efb9`。

正式V1门禁a325：五阶段结构审计PASS、证据审计PASS（813引用、110份Manifest、249项），整体`INCOMPLETE`/exit 2。四个历史TestRun结构化导出、OD-014与旧非终态Run处置、活动存储批准/完整恢复、Ubuntu与人工签收仍阻止完成。[日志](../evidence/audits/2026-10-10-v1-version-gate-a325.log)，SHA-256 `358e4cd1b73dcf7ac6539b7f28426d1b82649f232600744d9cac7cebbf87a2a4`。

2026-10-10 Ubuntu只读preflight：`pnpm verify:w8:ubuntu-host`退出2；当前为macOS/aarch64，目标Ubuntu x86_64不匹配，Linux容器运行时UNAVAILABLE，资源阈值NOT_DEFINED、目标主机授权NOT_CONFIRMED。未访问外网/凭据、未改服务/迁移；需在获准的实际Ubuntu主机重做。[报告](../evidence/audits/2026-10-10-w8-ubuntu-host-preflight-a01.log)，SHA-256 `83ee428b63a69144d86e5c66974c3afa68e06d53a1ea2288b20128b80787a507`。

2026-10-10 最新正式V1门禁a326：结构审计PASS、证据审计PASS（817引用、111份Manifest、250项），V1整体`INCOMPLETE`/exit 2。历史Run导出、OD-014及非终态Run负责人决定、活动存储维护/完整恢复、实际Ubuntu主机、版本验收关闭和用户本人当前范围签收仍未通过。[a326日志](../evidence/audits/2026-10-10-v1-version-gate-a326.log)，SHA-256 `29af2c8df97be36492faff208a7398a8b9a62086a1717fc7bcfb2f045749db96`。

2026-10-10正式V1门禁a327复核：五阶段结构审计PASS、证据审计PASS（820引用、112份Manifest、251项），整体仍`INCOMPLETE`/exit 2。V1.2一个、V1.5三个历史TestRun的结构化导出仍缺失；负责人决定、活动存储维护/恢复、Ubuntu实机及当前范围人工验收仍开放。只读恢复检索未发现可验证的原始导出包，没有重建或伪造历史证据。[a327日志](../evidence/audits/2026-10-10-v1-version-gate-a327.log)，SHA-256 `9cea4bb914f23afdb91c0a867747d1c4dcf70053b6bcd92dfc103f5ff980c0e3`。

正式门禁a328在a327记录同步后复核：结构审计PASS、证据审计PASS（822引用、112份Manifest、251项），V1仍`INCOMPLETE`/exit 2；四个历史TestRun缺失导出和外部决定、环境、人工验收门槛未变化。[a328日志](../evidence/audits/2026-10-10-v1-version-gate-a328.log)，SHA-256 `e9cdcba42a1854c9a054e430d38550829bbb95d4212591caeddebb05c764a119`。

2026-10-10共享Platform API兼容复验：V1.1、V1.2、V1.4、V1.5完整`verify:stage --suite code`均exit 0，分别覆盖服务身份/隔离数据库/迁移、V1.2锁版Qlib/Artifact及四Run E2E、V1.4规则/报告Artifact fencing、V1.5 Incident与后台服务回归；V1.2四Run同Run Web/API/CLI/export通过且隔离资源清理。V1.1首轮loopback权限EPERM已保留，授权重跑通过。证据：[V1.1](../evidence/audits/2026-10-10-v11-after-v13-budget-readback-code-suite-a02.log)、[V1.2](../evidence/audits/2026-10-10-v12-after-v13-budget-readback-code-suite-a01.log)、[V1.4](../evidence/audits/2026-10-10-v14-after-v13-budget-readback-code-suite-a01.log)、[V1.5](../evidence/audits/2026-10-10-v15-after-v13-budget-readback-code-suite-a01.log)。这些代码套件不关闭五阶段完整人工验收、活动存储/备份决策、Ubuntu或缺失历史导出，V1整体仍未通过。

共享Platform/Web改动后的浏览器兼容回归也完成：V1.1 3/3（normal/rejection/recovery，CLI/export同Run）；V1.4 5/5（报告、限制价/停牌、费率、公司行动、比较，所有浏览器Run同Run CLI核对）；V1.5 3/3（normal/AUTO/rejection/recovery、Incident与能力阻塞），四场景同Run CLI/export。随机Compose容器/卷/网络均清理验证。详见阶段§8.22/8.16/8.27与各自日志；历史Run缺失、结算/旧Run决定、活动维护恢复、Ubuntu和人工验收仍开放。

2026-10-10正式V1门禁a329（四阶段兼容套件和阶段文档更新后）：结构审计PASS、证据审计PASS（829引用、112份Manifest、251项），V1仍`INCOMPLETE`/exit 2。四个历史TestRun结构化导出仍缺；结算/旧Run决定、活动存储维护与全域恢复、Ubuntu实机及当前范围人工验收未满足。[a329日志](../evidence/audits/2026-10-10-v1-version-gate-a329.log)，SHA-256 `d222fcb2d9a4c394541acbbb971d67549c4458466d595938a01eee1afe9d000f`。

正式门禁a330（追加V1.1/V1.4/V1.5浏览器复验记录后）：文档结构审计PASS、证据审计PASS（836引用、112份Manifest、251项），版本仍`INCOMPLETE`/exit 2；四个历史TestRun结构化导出缺失，OD-014/旧Run处置、活动维护/完整恢复、Ubuntu与当前范围人工验收仍未满足。[a330日志](../evidence/audits/2026-10-10-v1-version-gate-a330.log)，SHA-256 `bd4fdb7a075181ec335d7d6a339656f889142055964c2517d7564cab14f9020c`。

P0 crosswalk校准：V1.2-S2-L18的旧摘要已与当前阶段需求对齐；新增日线质量Future PIT表驱动测试的精确源标题、缺失会话/上市区间/跨市场不足历史单测，以及当前四Run锁版Qlib回归证据。单项复核9个证据路径、5个测试名称、3个脚本执行点均存在/匹配。状态仍PARTIAL：合成Fixture无法证明真实市场日历、全市场缺失会话或P2→P3实际策略消费者交接。交叉表SHA-256 `caef5b9085a496ece289c240a25e655d3f473627b83bd5330f138d453b90b98f`。


正式V1门禁a331（V1.2交叉追踪摘要校准后）：阶段结构审计PASS，证据审计PASS（838引用、112份Manifest、251项），版本仍`INCOMPLETE`/exit 2。四个历史TestRun结构化导出、OD-014与三条旧非终态Run处置、活动存储维护及完整恢复、目标Ubuntu实机和当前范围本人验收仍未满足；不新增人工签署。日志[见此](../evidence/audits/2026-10-10-v1-version-gate-a331.log)，SHA-256 `68d1742f0bac54c8cdd2913b7980d48d3a374fc33f19607391a6cc0537eb43ac`。


2026-10-10 V1当前树基线复验：在允许绑定本机回环的执行环境中运行`pnpm baseline:check`退出0。Markdown本地链接7118/0失败；298个JSON、206个schema、50个Fixture校验0失败，合同兼容矩阵111条及29个生成器drift检查通过；Fixture检查34文件通过；Artifact共享库、8个服务分层和60项脚本/Verifier测试全部通过。首次受限沙箱运行的seed:paper 2项测试为loopback `EPERM`，不属于断言失败；受控同机执行3/3通过后重新完整跑基线。日志[见此](../evidence/audits/2026-10-10-v1-current-tree-baseline-a01.log)，SHA-256 `ccdf50e40440f22948347fd332accf372f386110f426c82017fbea62fcc9b644`。此为工程基线，不覆盖五阶段完整业务验收、历史Run、Ubuntu、人工签收或正式V1版本门禁。


正式V1门禁a332（收录当前树基线后）：V1仍`INCOMPLETE`/exit 2；阶段结构审计PASS、证据审计PASS（842引用、112份Manifest、251项）。基线`pnpm baseline:check`本轮exit 0，但不关闭四个缺失历史TestRun结构化导出、OD-014/旧非终态Run处置、活动存储维护与全域恢复、Ubuntu实机、阶段未完成项及当前范围本人验收。[a332门禁](../evidence/audits/2026-10-10-v1-version-gate-a332.log)，SHA-256 `2eb9a8441ff3e33f4da7b348b35b3e363e01e616f4db39748f61c0be93aab084`。


2026-10-10 P3/V1.3历史回测模式边界增量：Governance `/internal/v1/authorizations`现在对LIVE/FAKE、PAPER/REAL、LIVE/REAL返回422，隔离PostgreSQL授权记录数保持0；合法BACKTEST/FAKE仍授权并单次消费。单测41/41、`pnpm test:service-auth:http`和完整V1.3 code suite均exit 0，临时PG容器/网络清理通过。[当前V1.3套件日志](../evidence/audits/2026-10-10-v13-historical-replay-mode-boundary-code-suite-a01.log)，SHA-256 `f32f35cb3f27d3183522002628e04bd3ca224bc68e75745de593152ee5eb5a0f`。阶段§2全模式边界父项仍OPEN：其他Paper/Backtest路由、页面事实篡改和完整V1路由矩阵仍未闭合。要求/测试交叉表V1.3-S2-L17已补精确测试名及日志，SHA-256 `e33a284f62dcec632edb7f7577aebedd4dc5ae1f75fe09b4361ac1e124eb0ebf`。


正式V1门禁a333（新增历史Replay模式拒绝验证、阶段/计划/交叉表同步后）：阶段文档审计PASS、证据审计PASS（846引用、113份Manifest、252项），V1仍`INCOMPLETE`/exit 2。模式拒绝原子增量已记录，但四个历史TestRun结构化导出、OD-014/旧非终态Run处置、活动存储维护与完整恢复、Ubuntu实机和本人当前范围验收仍未满足。[a333日志](../evidence/audits/2026-10-10-v1-version-gate-a333.log)，SHA-256 `4622816719b6af691cb8d8c144dd37a7b12db592d64f4de821aa0985606fe9ef`。

2026-10-10 V1.4回测创建HTTP边界增量：隔离集成首次发现客户端注入`PAPER/FAKE`获202；Platform现严格限制请求字段，只接受`scenarioId`、`seed`、`policy`。修复后四种模式注入均422且Quant Run记录数不变；隔离集成及浏览器5/5、八个Web Run同UUID CLI检查、16个Quant Run/Manifest Hash配对和取消/重启恢复通过，临时资源清理通过。修复后完整V1.4 code suite exit 0：[套件日志](../evidence/audits/2026-10-10-v14-mode-boundary-code-suite-a01.log)，SHA-256 `2ac4b11d8718b55b14b8b6f934d31b1502c8ae80f18684bdd4627250538722e9`。另见[V1.4 §8.15](prd/v1-local-simulation/04-daily-backtest.md#817-v14回测入口拒绝客户端交易模式注入2026-10-10)及[专项E2E证据](../evidence/audits/2026-10-10-v14-platform-mode-injection-http-e2e-a01.log)，SHA-256 `d18511fa164ab5b02142e8beeeb8646ca16046f6a5788972790979dab425822a`。本切片未关闭完整模式路由矩阵、OD-014、历史导出、活动恢复、Ubuntu与本人验收。

2026-10-10 V1.2 Platform TestRun模式边界增量：创建入口现仅接受`scenarioId`和`seed`；`PAPER/FAKE`、`LIVE/FAKE`、`BACKTEST/REAL`、`LIVE/REAL`四种注入均返回422，隔离PostgreSQL中的V1.2 Run计数不变。完整V1.2 code suite exit 0，隔离Web/API/CLI E2E四Run、双市场锁版Qlib、取消和Platform重启恢复通过；11条路由匿名401/伪造owner403，隔离容器/卷/网络清理通过。完整代码套件日志[见此](../evidence/audits/2026-10-10-v12-mode-boundary-code-suite-a01.log)，SHA-256 `3163404e01ff1c7ee1a3921a1c95bc3d31343d027d758fbbda13822fe99370a2`；证据见[阶段§8.33](prd/v1-local-simulation/02-small-data-and-qlib.md#833-v12-testrun创建拒绝客户端交易模式注入2026-10-10)、[E2E日志](../evidence/audits/2026-10-10-v12-mode-injection-e2e-a01.log)和[机器报告](../evidence/audits/2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-82d1d16c378eac819679.json)。需求映射增加V1.2-S2-L20（当前索引146项），交叉表SHA-256 `ef43bb602e593afa9bc8917dc34f2ff5545aceddf4cfe57cc748bf9e55b7836d`；此子项通过不关闭全V1路由模式矩阵、历史Run、活动恢复、Ubuntu或本人验收。

P0交叉映射复核：V1测试计划V1.4范围行现关联回测创建模式注入的精确隔离HTTP断言、专项E2E与完整code suite日志；逐项复核通过，V1.4测试计划行仍为RECHECK，P4结算/完整规则父项未关闭。交叉表SHA-256更新为`ac1d00c170ec855dcad8571564f7cbf9c386c47eb3d84d5010693d4e451e996e`，对应[机器复核](../evidence/audits/2026-10-10-v1-crosswalk-v14-mode-a01.json)，SHA-256 `7d0db229bc8f49681a319ae0194e6b30caa98dba6a550ef8e9e5cdb46255bbf7`。

正式V1门禁a334（V1.4边界证据及阶段文档同步后）：阶段结构审计PASS，证据审计PASS（851引用、114份Manifest、253项），V1仍INCOMPLETE/exit 2；历史TestRun导出、待决结算/旧Run、活动数据恢复、Ubuntu及本人验收保持未完成。[a334日志](../evidence/audits/2026-10-10-v1-version-gate-a334.log)，SHA-256 `945ad2e3447ece3008edb0dd9ec1437e3714b921d16f953d254e06f99688f9a2`。

正式V1门禁a335在本轮V1.4资料同步后复核：文档审计PASS、证据审计PASS（853引用、114份Manifest、253项），总版继续INCOMPLETE/exit 2；遗留历史Run、决定、活动恢复、Ubuntu及本人验收。[a335日志](../evidence/audits/2026-10-10-v1-version-gate-a335.log)，SHA-256 `ba20fa3d9d1527847b6a6bb0cc94d814937e28d3d7cc95b9c30193864cd7e11e`。

2026-10-10 P1活动存储只读复核A02：Platform仍用`legacy`且容器无持久挂载，Artifact卷仅挂Research Automation；现役legacy Run共60条，较A01增加1条COMPLETED，V1.1 stage仍44条，3个legacy非终态及全stage 12个非终态保持不变。四个历史UUID仍不在活动两表。详见[存储Runbook A02](operations/v11-test-run-storage-cutover.md#2026-10-10-活动运行时只读复核-a02)、[审计说明](../evidence/audits/2026-10-10-v1-active-runtime-preflight-a02.md)与[机器报告](../evidence/audits/2026-10-10-v1-active-runtime-preflight-a02.json)。存储切换仍NOT_READY/NOT_AUTHORIZED/NOT_DEPLOYED；未读Artifact字节或Run正文，未操作容器、卷或数据库。

正式V1门禁a340在A02及Runbook复核后仍`INCOMPLETE`/exit 2：阶段文档审计PASS、证据审计PASS（858引用、115份Manifest、254项）。[a340日志](../evidence/audits/2026-10-10-v1-version-gate-a340.log)，SHA-256 `7797fed729baa4c560362fd99a1c4e3edf71106025d9ed41545100ea07508944`。活动存储未获授权，历史Run、决定、Ubuntu与人工验收仍未满足。

2026-10-10正式V1门禁a342（V1.2模式边界与当前文档同步后）：五阶段结构审计PASS，证据审计PASS（867引用、115份Manifest、254项）；版本仍`INCOMPLETE`/exit 2。四个历史结构化Run导出、待决结算/旧Run处置、活动存储维护及配对恢复、Ubuntu实机和本人当前范围验收继续开放。[a342日志](../evidence/audits/2026-10-10-v1-version-gate-a342.log)，SHA-256 `b9b0932e7f8cc376282e2fbe469ef2669155a7f430a672023ba3d614fa27c54a`。

2026-10-10正式V1门禁a343（当前V1.2路由边界及P0交叉映射审计同步后）：结构审计PASS，证据审计PASS（870引用、115份Manifest、254项）；整体仍`INCOMPLETE`/exit 2。4个历史TestRun结构化导出、OD-014与旧Run处置、活动存储维护/全域恢复、目标Ubuntu和本人验收仍未完成。[a343日志](../evidence/audits/2026-10-10-v1-version-gate-a343.log)，SHA-256 `10928f284170b77a1852220171d949ccdc12e2eaa5b277e6c6dbea9d10c9a942`。

2026-10-10 V1.5 Platform TestRun模式边界增量：隔离HTTP/PG确认PAPER/FAKE、LIVE/FAKE、BACKTEST/REAL、LIVE/REAL均422且V1.5 Run计数不变；改后完整V1.5代码套件和单独隔离Web/API/CLI E2E通过，normal/AUTO/rejection/recovery四Run与同Run CLI/export、7条路由身份矩阵及精确资源清理均通过。详见[V1.5 §8.28](prd/v1-local-simulation/05-scheduling-and-recovery.md#828-v15-testrun创建拒绝客户端交易模式注入2026-10-10)、[E2E日志](../evidence/audits/2026-10-10-v15-platform-mode-boundary-e2e-a01.log)、[code suite](../evidence/audits/2026-10-10-v15-platform-mode-boundary-code-suite-a01.log)和[A05](../evidence/audits/2026-10-09-v1-cross-service-route-matrix-a05.md)。模式注入原子子项关闭；V1.5结算/Ubuntu/人工验收、全V1模式路径、历史Run与活动恢复仍未完成。

正式V1门禁a344（V1.5 Platform TestRun模式边界同步后）：五阶段文档审计PASS，证据审计PASS（876引用、116份Manifest、255项），V1仍`INCOMPLETE`/exit 2。四个指定历史TestRun结构化导出、OD-014及旧非终态Run处置、活动存储维护与完整恢复、目标Ubuntu实机和本人当前范围验收仍未满足。[日志](../evidence/audits/2026-10-10-v1-version-gate-a344.log)，SHA-256 `43b9ad50014657ee322a287befc2f260ccafc718add40ffcc3d72e0f39fbdac3`。

2026-10-10 P0交叉索引当前树重审：147条需求的1329个来源/验收/测试计划/证据路径均可解析；发现13个精确测试标题未能在所映射文件逐字复核、6条测试名缺文件路径、13条来源锚点文本漂移。此为追踪质量OPEN项，不直接代表功能/测试失败；需要根据真实测试报告与源码逐项校正。详情：[机器审计](../evidence/audits/2026-10-10-v1-crosswalk-current-tree-a01.json)，SHA-256 `7b12c3966596facc4dfe38ab567d61131c091b3021153c8b1b3f4c00570efd1d`。

正式V1门禁a345（P0当前树交叉表审计记录后）：五阶段文档审计PASS，证据审计PASS（878引用、116份Manifest、255项），V1仍`INCOMPLETE`/exit 2。新增审计没有缺失路径；P0精确测试映射/来源锚点语义复核、历史Run导出、未决业务/旧Run处置、活动数据维护与完整恢复、Ubuntu和本人验收仍未完成。[a345日志](../evidence/audits/2026-10-10-v1-version-gate-a345.log)，SHA-256 `69ea2ef0876aadae1335d7f57730285e9e6852a86a00615838039f6d174f6760`。

2026-10-10 P0交叉索引更正与复核：a01/A02中定位到的13个测试映射名称、6条无文件路径名称及13个来源锚点均已核对修正；147项、1329个路径引用、151个精确测试引用和147个当前来源锚点通过结构审计，无缺失项。该审计只证明索引结构/引用字面一致，不证明断言充分或业务测试通过。[a04报告](../evidence/audits/2026-10-10-v1-crosswalk-current-tree-a04.json)，SHA-256 `712235625f661925de4a9604efe957c598134b4ba4f2ade6ac6457bb562a5dfd`；更新后的交叉表SHA-256 `8b708ea516b7d58bdf10356ac811d0a4cb0aaa69f3ded50dc1294a9761e4080a`。

正式V1门禁a346（交叉索引结构问题校正后）：五阶段文档审计PASS，证据审计PASS（880引用、116份Manifest、255项），V1仍`INCOMPLETE`/exit 2。交叉索引路径、当前锚点和精确文件标题结构复核通过，但P0语义覆盖与P1–P6交付、历史Run、待决定事项、活动恢复、Ubuntu和本人验收继续未关闭。[a346日志](../evidence/audits/2026-10-10-v1-version-gate-a346.log)，SHA-256 `7ef72830293f445143e81a7f1314b302fe582bc8c7245609a574a4b2b08bf8b5`。

2026-10-10 P1 Artifact源码盘点A01刷新：逐处核对当前V1.2 Qlib共享文件字节、V1.4 Quant PostgreSQL报告/Manifest与Platform TestRun投影、Market Data关系型分页Dataset，并区分V1.1/V1.3/V1.5业务事实引用和V3.1共享卷生产者。源码文件SHA、生产/读取/发布入口与限制记录于[当前盘点](../evidence/audits/2026-10-10-v1-artifact-producer-inventory-a01.md)，SHA-256 `1a88096d7b52b763f1a33ec13685078d7382416857c0d2fbca2b98707602b0b2`。该静态审计刷新OD-013决策材料，但未扫描活动数据库/卷、未授权或执行清理；P1 Artifact生命周期与活动恢复仍OPEN。

正式V1门禁a348（新增Platform Mandate模式边界证据与阶段记录后）：五阶段结构审计PASS，证据审计PASS（888引用、118份Manifest、257项），V1仍`INCOMPLETE`/exit 2。V1.3激活/暂停模式拒绝E2E 22/22与完整代码套件通过；四个历史Run结构化导出（V1.2一项、V1.5三项）、全阶段交付/用户验收、OD-013/OD-014、旧Run处置、全V1业务/存储恢复及Ubuntu实机仍未完成。[a348日志](../evidence/audits/2026-10-10-v1-version-gate-a348.log)，SHA-256 `8416e8a68a5d60f20ac12da5926c8dc64d37f239b7b7c0a897e3f5d5f7fb3f96`。

正式V1门禁a349（进度、计划与验收摘要同步后）：五阶段结构审计PASS，证据审计PASS（892引用、119份Manifest、258项），V1仍`INCOMPLETE`/exit 2。四个历史TestRun无结构化导出，五阶段交付/用户验收、OD-013/OD-014及旧Run决定、全V1业务恢复和Ubuntu实机证据仍OPEN。[a349日志](../evidence/audits/2026-10-10-v1-version-gate-a349.log)，SHA-256 `837eef61a7c8b032b35417ab6b7aeb70b1796a0322248777c2dc02a0f0a894da`。

正式V1门禁a347（Artifact生产者源码盘点同步后）：五阶段结构审计PASS，证据审计PASS（882引用、116份Manifest、255项），V1仍`INCOMPLETE`/exit 2。Artifact清理/保留和活动数据切换仍受OD-013及维护输入阻塞；P0语义、历史证据、其它P1–P6任务、Ubuntu及本人验收继续OPEN。[a347日志](../evidence/audits/2026-10-10-v1-version-gate-a347.log)，SHA-256 `07dbf45f5a14f6b9fd67bdf9409fac824bc71064e7b45f0fdbf2edc12e239fa5`。

2026-10-10 A07/P3增量：Platform AUTO Mandate激活与暂停写路由现于身份/状态读取前拒绝客户端`environmentMode`/`brokerMode`。完整V1.3隔离Web/API/CLI套件22/22通过；模式边界TestRun `51edf948-3229-46a4-9b92-6a639321caa3`中激活/暂停的三类非法组合共6次均422，拒绝后Mandate分别保持PENDING/ACTIVE，合法转换仍可成功，账本未变且订单/Fill为0。证据Manifest Hash为`5749c505fe9c8779aae33f604ab71ecde63fce68de70db1d18319a77a4cb0725`；完整代码套件日志SHA-256 `8d84833c3be862de2c22d8eaf86b7e735ab5389a1464a964fb17d82f6f7d3999`。详见[V1.3 stage §8.48](./prd/v1-local-simulation/03-fake-broker-trading-loop.md#848-platform-auto-mandate激活暂停模式拒绝2026-10-10)。该项只关闭两个路由的模式注入子项，不关闭P3全量模式边界审计；最新正式V1门禁需在本轮验证后重跑。

2026-10-10历史Run来源只读核查：缺失V1.2 Run在三个已运行本地API端点均HTTP 404，三个V1.5缺失Run的旧项目缺少Platform API容器。为避免恢复旧栈时触发积压Temporal/NATS/outbox工作，没有启动容器或重放Run。四份证据只能从原始Run存储或既有导出恢复，具体边界见[核查记录](../evidence/audits/2026-10-10-v1-history-export-source-check-a01.md)及[SHA-256](../evidence/audits/2026-10-10-v1-history-export-source-check-a01.md.sha256)；此状态不代表业务验收失败。

正式V1门禁a350（历史Run可用来源核查及记录更新后）：阶段结构审计PASS、证据审计PASS（896引用、120份Manifest、259项），V1仍INCOMPLETE/exit 2。4个历史Run导出仍无法取得，五阶段交付、待决事项、全V1业务恢复、Ubuntu和当前范围人工验收仍未完成。[a350日志](../evidence/audits/2026-10-10-v1-version-gate-a350.log)，SHA-256 `887c21b41f9818ea50e8c0351611b24bfa6e5fce65100730b53643b45b5fbe07`。

正式V1门禁a351（V1.3阶段第7节交付记录同步后）：阶段文档审计PASS，证据审计PASS（900引用、121份Manifest、260项），V1仍INCOMPLETE/exit 2。历史Run导出、OD-013/OD-014/旧Run决定、全V1业务恢复、Ubuntu和本人验收仍未满足。[a351日志](../evidence/audits/2026-10-10-v1-version-gate-a351.log)，SHA-256 `68f7297dba0b2f60476ae414016331ca718bc62ab68af32fb9b867c9fdae5445`。
2026-10-10 A07/P3增量：Platform Proposal修订、审批及Session推进写路由现明确拒绝客户端交易模式字段；拒绝的9次请求均422，Proposal状态/版本/内容Hash及Run Clock不变。合法Proposal Web/API载荷已去掉客户端模式字段，Platform从验证过的账户派生PAPER/FAKE传给Governance。完整V1.3隔离E2E 22/22和`pnpm verify:stage -- --stage V1.3 --suite code`均exit 0；边界Run `2644bb0b-c144-4347-9888-38533de607cf`，Manifest SHA-256 `b0473840da8308c94f14a1cabd4b22f546dc02959ba7d5f18da9dbceb3f1639b`。完整E2E日志SHA-256 `d333848f21bc590a7a0c15c99f81698e12cffdd47e7703c990e716bfa6b94cee`；代码套件SHA-256 `1155096eec4bb5052ddaea0f2e7d9e74e655b59619f6b0b7feb6145208d8c09a`。见[V1.3 §8.49](./prd/v1-local-simulation/03-fake-broker-trading-loop.md#849-platform-proposal修订审批与session推进模式拒绝2026-10-10)。仅关闭三个入口子项，P3父项/V1整体仍开放。

V1正式门禁a351（本轮新代码/E2E证据与阶段记录同步前的上次结果）：五阶段结构审计PASS，证据审计PASS（900引用、121份Manifest、260项），V1仍INCOMPLETE/exit 2。最新状态待本轮计划与验收文档同步后重新运行门禁。[a351日志](../evidence/audits/2026-10-10-v1-version-gate-a351.log)，SHA-256 `68f7297dba0b2f60476ae414016331ca718bc62ab68af32fb9b867c9fdae5445`。

正式V1门禁a352（本轮V1.3工程/证据和计划文档同步后）：阶段结构审计PASS、证据审计PASS（908引用、124份Manifest、263项），版本仍`INCOMPLETE`/exit 2。四个历史Run导出仍缺，版本摘要和V1门禁勾选尚未关闭；OD-013/OD-014与旧Run决定、全V1业务恢复、Ubuntu实机及本人验收继续开放。[a352日志](../evidence/audits/2026-10-10-v1-version-gate-a352.log)，SHA-256 `a6e58a1b467744b47b77068d84d4d013c55d92f1d4317604f7ed9e6aaf8fa1bc`。

正式V1门禁a353（版本验收摘要局部状态修正后复核）：阶段结构审计PASS，证据审计PASS（911引用、125份Manifest、264项）；验收摘要局部结论误触发已清除（`versionSummaryIncomplete=false`），V1仍`INCOMPLETE`/exit 2，因历史Run导出、版本门禁条件及其他工程/决定/环境/本人验收未完成。[a353日志](../evidence/audits/2026-10-10-v1-version-gate-a353.log)，SHA-256 `788c6e282005c34b497433cdc2bcbc7e512bf24ca7a4376d317e64166dd45490`。

正式V1门禁a354（保留首轮失败E2E与修复后全套PASS的审计链后）：结构审计PASS，证据审计PASS（913引用、126份Manifest、265项），V1仍`INCOMPLETE`/exit 2；摘要误报保持清除。四个历史Run导出、未勾版本门禁项、OD-013/OD-014与旧Run决定、完整业务恢复、Ubuntu及本人验收仍未完成。[a354日志](../evidence/audits/2026-10-10-v1-version-gate-a354.log)，SHA-256 `4317541b58a5b2c01dd2e489767d815395c43bad63d127129a6f2ff8d9f507b7`。

2026-10-10 A01/P0：已将V1.3 Proposal修订/审批与Session推进模式拒绝的最新E2E/code suite日志关联至L17交叉索引，并更新阶段测试计划。索引结构状态仍为PARTIAL/OPEN；全V1写路由与Worker、回测接受路径、UI状态/余额篡改尚未全量验证。交叉表SHA-256 `fe0de07529c222711d0407e515b66912c372fdf6e3b548eb79d950545b776631`。文档链接检查7320项/0失败，`git diff --check`通过；正式V1门禁待本轮文档同步后复跑。

正式门禁a356：阶段文档审计PASS、证据审计PASS（913引用、126份Manifest、265项），V1仍`INCOMPLETE`/exit 2。四个历史Run导出、版本门禁未勾项、待决事项、完整恢复、Ubuntu实机和本人验收仍未满足；日志与a354/a355相同，SHA-256 `4317541b58a5b2c01dd2e489767d815395c43bad63d127129a6f2ff8d9f507b7`，见[a356](../evidence/audits/2026-10-10-v1-version-gate-a356.log)。

2026-10-10 A01/P0结构复核a05：同步V1.3测试计划当前锚点后，147项/1484条路径引用/356个唯一路径/151个精确测试名/147个来源锚点复核全部通过，无缺失路径、标题或锚点。交叉索引SHA-256 `e2c70bd6af7a9c9edc6797818e4c0a42053e900ccbb7c1acc67def06e6922870`；[a05报告](../evidence/audits/2026-10-10-v1-crosswalk-current-tree-a05.json)，SHA-256 `b262b29d5511dd09e1363e60ccb163fdd49ae4cbd0f5315ca32e6b1d15b78367`。这里只关闭结构一致性，不证明需求语义覆盖。

正式门禁a357（P0锚点和交叉索引更新后）：文档/证据审计通过，V1仍`INCOMPLETE`/exit 2；历史TestRun导出、决策、业务恢复、Ubuntu和人工验收继续OPEN。[a357日志](../evidence/audits/2026-10-10-v1-version-gate-a357.log)，SHA-256 `4317541b58a5b2c01dd2e489767d815395c43bad63d127129a6f2ff8d9f507b7`。

2026-10-10 A07/P3：Platform V1.3账户、Proposal、Mandate和执行命令现拒绝客户端直接注入状态、现金/余额、持仓、账本、订单及Fill事实，所有8类字段返回422；E2E 22/22和完整V1.3 code suite通过。TestRun `a4e1f3b8-510d-4527-b6e2-356d9f4250c1`，Manifest SHA-256 `5c68036847e2115533a422280a006372556c9f372acb5719e8b9b2eb23986f47`。详见[§8.50](./prd/v1-local-simulation/03-fake-broker-trading-loop.md#850-platform写入口拒绝客户端注入账户与交易事实)及[E2E日志](../evidence/audits/2026-10-10-v13-server-owned-facts-e2e-a02.log)、[code suite](../evidence/audits/2026-10-10-v13-server-owned-facts-code-a01.log)。全V1路由、Worker及人工验收仍开放。

2026-10-10 A01/P0交叉表a06：147项、1486条路径引用、358个唯一解析路径、151个精确测试名与147个来源锚点结构审计全部通过。报告[见此](../evidence/audits/2026-10-10-v1-crosswalk-current-tree-a06.json)，交叉索引SHA-256 `7ba3b4f659bd2ac6c32291314ae6fb40a60ee5b1a9efa98128d2cf9a8f3dd21d`。结构一致不代表需求行为覆盖充分。

正式V1门禁a358：阶段文档审计PASS、证据审计PASS（917引用、126份Manifest、265项），`versionSummaryIncomplete=false`但`uncheckedVersionGate=true`，V1仍`INCOMPLETE`/exit 2。四个历史TestRun导出、待决事项、阶段交付、业务/存储恢复、Ubuntu及本人验收仍阻止完成。[a358日志](../evidence/audits/2026-10-10-v1-version-gate-a358.log)，SHA-256 `41a1a63815ba3e873611c84198acd06d2fa8c1d470a2acf71c25f4c3150e9300`。

正式V1门禁a359：同步a358状态后复核，阶段结构/证据审计仍PASS（917引用、126份Manifest、265项），V1仍`INCOMPLETE`/exit 2；阻塞项未变化。[a359日志](../evidence/audits/2026-10-10-v1-version-gate-a359.log)，SHA-256 `41a1a63815ba3e873611c84198acd06d2fa8c1d470a2acf71c25f4c3150e9300`。
2026-10-10 P3增量：四个V1.3 Platform bodyless写入口（外部订单观察、sequenced Fill、sequenced撤单请求/结果）现拒绝任何非空客户端载荷。逐项注入状态、现金、持仓、Fill/账本版本均422；原定向E2E及完整Web/API/CLI套件22/22通过，同Run `8271379a-6c08-4fa1-9d66-045b2c4a87ca`、Manifest SHA-256 `75e42e80bb092eb0d019af282e72636fc105b0f7905b6b2b9d7d156efcbd3ab5`；V1.3完整code suite exit 0，日志SHA-256 `8a4b118c92bbe3ea13b7aeae721e627fe35be7333550ee98fdba136dd43015b7`。详见[阶段§8.51](./prd/v1-local-simulation/03-fake-broker-trading-loop.md#851-platform事实保护扩展至无载荷命令2026-10-10)。只证明V1.3这四个命令及其现有流程，不关闭P3/L17、全量回测/Worker或人工验收。
2026-10-10 A01/P0交叉索引a07：V1.3-S2-L17纳入bodyless写命令的新E2E/code证据，并刷新V1.3测试计划锚点。147项、1729条路径引用、369个唯一已解析路径、151个精确测试名、146个来源锚点全部通过；报告[a07](../evidence/audits/2026-10-10-v1-crosswalk-current-tree-a07.json)，SHA-256 `a3ffb1355522e479f797325f9b0030d2f4692474355ff0afc6017eed2d65c734`，交叉表SHA-256 `282b8f5ffc157f9b215e2285cbcc9ce5f80c3e9e48900607b1ebd3a1c2ce6c3b`。仅证明结构链接一致，语义覆盖仍开放。

正式V1门禁a361：阶段结构审计PASS、证据审计PASS（918引用、126份Manifest、265项），`versionSummaryIncomplete=false`，但`uncheckedVersionGate=true`，版本保持`INCOMPLETE`/exit 2。4个历史业务TestRun无结构化导出；五阶段交付与人工签收、未决事项/旧Run处置、完整业务与存储恢复、Ubuntu实机仍未满足。[a361日志](../evidence/audits/2026-10-10-v1-version-gate-a361.log)，SHA-256 `3e098614375efc58eaf87eb934afd32fedd37bf89970222e7014309d9266db39`。
2026-10-10 P3增量：V1.1 Platform Run创建现拒绝`scenarioId/seed`之外字段，US账户初始化及recovery continuation拒绝非空请求体；status/cash/positions伪造均422，原Run仍COMPLETED。完整V1.1阶段命令退出0，Web/API/CLI normal/rejection/recovery 3/3及code suite通过，3个Run Evidence Manifest正常导出且隔离资源精确清理。日志SHA-256 `7ab3675f8bca745102f19021463e03f583623095131e4760295c711ed92a7033`；见[§8.23](./prd/v1-local-simulation/01-environment-and-web-center.md#823-v11-platform命令拒绝客户端写入业务事实2026-10-10)。不代表活动存储切换、全V1关闭或人工验收。

2026-10-10 A01/P0交叉索引a08：V1.1/V1.3客户端事实写入拒绝证据已加入V1.3-S2-L17，当前源锚点复核147项、1732条引用、371个唯一路径、152个精确测试名与146个来源锚点全部PASS；报告[a08](../evidence/audits/2026-10-10-v1-crosswalk-current-tree-a08.json)，SHA-256 `0f1f50390fb07c60e72a8d512a3d98457ad27228f568bb8e875ecf5f6af41abb`，索引SHA-256 `689f374342c4647ea23bd5d4002dfbf88007a99557c29fd3aad0cadb2a71411d`。只验证追踪结构，不证明语义覆盖充分。
正式V1门禁a363：五阶段结构/文档审计PASS，证据审计PASS（921引用、126份Manifest、265项），摘要无局部不完整状态，但`uncheckedVersionGate=true`，V1仍`INCOMPLETE`/exit 2。V1.2/V1.5四个历史TestRun导出未取得；阶段交付/本人验收、待决规则与旧Run处置、活动数据/业务恢复及Ubuntu实机仍OPEN。[a363](../evidence/audits/2026-10-10-v1-version-gate-a363.log)，SHA-256 `cc92c0d46a4669bbad5f28456c8e4cf25de944867c4085447e6c87fea04239a1`。


2026-10-10 P3命令载荷边界增量：V1.2、V1.4、V1.5取消命令及V1.5 Incident确认拒绝客户端伪造业务事实。完整V1.2/V1.4/V1.5隔离阶段E2E均退出0；拒绝后状态保持不变、合法命令可正常执行。日志SHA-256分别为`8bf5375703bc1afee95e4e896455792e44fa18dd459638122afc5f5b8677d`（V1.2，准确值见日志 sidecar）、`188c0891a300d21326c4a14e29319ba0de324978ad87fff624d27853adfb935f`（V1.4）、`fd79e13e49fc2ff939f2d1a3503c7abfb67fc4133567701ab14c9eeb8840b729`（V1.5）。阶段记录：[V1.2 §8.34](./prd/v1-local-simulation/02-small-data-and-qlib.md#834-v12取消命令拒绝客户端状态资金注入2026-10-10)、[V1.4 §8.18](./prd/v1-local-simulation/04-daily-backtest.md#818-v14回测取消命令拒绝客户端状态现金注入2026-10-10)、[V1.5 §8.29](./prd/v1-local-simulation/05-scheduling-and-recovery.md#829-v15取消与incident确认拒绝客户端业务事实注入2026-10-10)。

P0/A01当前树交叉索引a09：同步上述证据与三个测试计划来源锚点。147项、1742条路径引用、377个唯一解析路径、156个精确测试名、143个来源锚点结构审计PASS，无缺失路径、测试名或锚点；交叉表SHA-256 `382dc286a7d27d1b8453ece5b2ce0d4667aac76db430828f61fcd47c4d762f5c`，报告[a09](../evidence/audits/2026-10-10-v1-crosswalk-current-tree-a09.json)，报告SHA-256见sidecar。只证明追踪结构，不代替语义覆盖。


正式V1门禁a364（当前命令载荷边界与a09交叉索引更新后）：五阶段文档审计PASS，证据审计PASS（927引用、128份Manifest、267项），`versionSummaryIncomplete=false`，`uncheckedVersionGate=true`，V1仍`INCOMPLETE`/exit 2。V1.2一个、V1.5三个历史TestRun缺结构化导出；五阶段当前范围人工验收、OD-013/OD-014及旧Run处置、活动数据与完整业务恢复、目标Ubuntu实机仍未满足。[a364日志](../evidence/audits/2026-10-10-v1-version-gate-a364.log)，SHA-256 `0c67c76ffbd7a78fd3a6aa285b0e511de57f11de6e41c8a81813541e032e0865`。


正式V1门禁a365（a364结果同步后复核）：五阶段文档审计PASS，证据审计PASS（928引用、128份Manifest、267项）；`versionSummaryIncomplete=false`、`uncheckedVersionGate=true`，版本仍`INCOMPLETE`/exit 2。4个既定历史Run缺少结构化导出，版本门禁未勾项仍包括阶段交付/当前范围人工验收、OD-013/OD-014及旧Run决定、活动业务/存储恢复与Ubuntu实机。`pnpm docs:check` 7384链接/0失败、`git diff --check`通过。[a365日志](../evidence/audits/2026-10-10-v1-version-gate-a365.log)，SHA-256 `48ad5b5e357dff88753936e8bfd3207f5c20c6d9f2a372d58ece83a522aa8f0b`。


2026-10-10 V1基础门禁复验：初次沙箱运行中两项本机HTTP测试因`127.0.0.1`绑定EPERM未运行成功；在允许回环绑定的受控环境重跑`pnpm baseline:check`退出0，脚本测试60/60通过，合同/Fixture、分层与Artifact检查均通过。日志：[baseline a02](../evidence/audits/2026-10-10-v1-baseline-check-a02.log)，SHA-256 `fa303318d27a91d436fdf2138ba9cac2e303b6ca92e2302232da9c1a6c0672f4`。这是基础工具链检查，不替代阶段业务验收。


正式V1门禁a366（基础工具链复验纳入证据后）：阶段文档审计PASS，证据审计PASS（929引用、128份Manifest、267项），`uncheckedVersionGate=true`、V1仍`INCOMPLETE`/exit 2。四个指定历史TestRun结构化导出缺失；决策、活动恢复、Ubuntu及当前范围人工验收未通过。[a366日志](../evidence/audits/2026-10-10-v1-version-gate-a366.log)，SHA-256 `0a597b00495e4472bc3487eda60c0d4790488cd0b2346494974387ce4ff25d9a`。


正式V1门禁a367（本轮文档与证据记录同步后最终复核）：五阶段文档审计PASS，证据审计PASS（930引用、128份Manifest、267项），摘要无局部不完整状态，但`uncheckedVersionGate=true`，V1整体仍`INCOMPLETE`/exit 2。四个历史TestRun缺结构化导出，五阶段仍`PARTIALLY_IMPLEMENTED`；当前范围用户验收、未决决策、活动数据/全域恢复与目标Ubuntu实机未完成。[a367日志](../evidence/audits/2026-10-10-v1-version-gate-a367.log)，SHA-256 `b34384a6b676007d5fdee96aab33556c6c476c785af1f0469a5a1986dfae024a`。


2026-10-10 P3/L08增量：V1.3部分成交撤单入口实测拒绝混合`cancelSequence`与客户端status/cash/ledgerVersion；拒绝后订单仍PARTIALLY_FILLED、40股Fill、FakeBroker现金9599.0000且双账本MATCH，正式Web撤单后剩余60股取消、费用更正和同Run CLI核验通过。TestRun `655b741e-3d45-4def-b7cf-9ff9792f1db2`。完整隔离Web/API/CLI/export E2E 22/22、V1.3 code suite exit 0；资源精确清理且外部行情/真实券商调用0。证据：[§8.52](./prd/v1-local-simulation/03-fake-broker-trading-loop.md#852-l08部分成交撤单拒绝客户端业务事实注入2026-10-10)、[E2E](../evidence/audits/2026-10-10-v13-l08-cancel-injection-e2e-a02.log)，SHA-256 `a75065b972ed36417b6ec44f95554fd26a711c315ffd4c3ea5e941630eb316d6`；[code suite](../evidence/audits/2026-10-10-v13-l08-cancel-injection-code-a02.log)，SHA-256 `04d91533efebb080e347c93ae11010c85a744852656f409372ba766307e68de3`。这是单一Platform命令的负向原子验证，P3全V1接受路径/Worker、市场规则及人工验收仍开放。

P0/A01交叉索引a10：新增L08证据和具名E2E关联L17，刷新V1.3测试计划当前锚点。147项、1747路径引用、381唯一路径、157精确测试名、143来源锚点全部结构PASS，无缺失；crosswalk SHA-256 `2e6477e75d05f144c25ae0c07f2f573823fc4f9a641d8b0c66764a218cd576e8`；报告[a10](../evidence/audits/2026-10-10-v1-crosswalk-current-tree-a10.json)，SHA-256见sidecar。结构审计不代表语义覆盖关闭。


正式V1门禁a368（L08撤单边界代码/E2E、阶段文档与a10追踪更新后）：阶段文档审计PASS，证据审计PASS（934引用、129份Manifest、268项），`versionSummaryIncomplete=false`，`uncheckedVersionGate=true`；V1仍`INCOMPLETE`/exit 2。四个指定历史TestRun结构化导出仍缺失，五阶段未关闭；当前范围人工验收、OD-013/OD-014及旧Run处置、活动存储/全域恢复、Ubuntu实机仍未完成。[a368日志](../evidence/audits/2026-10-10-v1-version-gate-a368.log)，SHA-256 `0c0bafe787f2859e5fbd18d79d765a7eed532d629bf1f6c2bca8dd79b5760144`。


正式V1门禁a369（a368结果同步后最终复核）：五阶段文档审计PASS，证据审计PASS（935引用、129份Manifest、268项），`versionSummaryIncomplete=false`，但`uncheckedVersionGate=true`，V1仍`INCOMPLETE`/exit 2。四个历史TestRun导出缺失；五阶段交付/人工验收、OD-013/OD-014及旧Run决定、活动数据和完整恢复、Ubuntu实机仍未满足。[a369日志](../evidence/audits/2026-10-10-v1-version-gate-a369.log)，SHA-256 `1ae78b9b7c2283c73d035955d3dde01316970bf1386620e1027a8e199e608425`。

2026-10-10 P3增量：Platform V1.3 Proposal创建接口现对登录请求执行显式客户端字段白名单；未知字段422，匿名仍先401，合法载荷继续成功。完整隔离E2E 22/22通过，Proposal模式/事实拒绝与同Run交易场景回归；V1.3完整code suite exit 0，覆盖文档/合同、服务单测、PostgreSQL集成、Linux ARM64容器readiness及迁移入口。TestRun `c02c4067-9591-43ea-9dc3-1429e2d3f604`，Manifest SHA-256 `d28b5cad80d9c1189c42d087a4ad49e377e6a6afa279cc66ed5bf639d26d9fc7`。E2E日志SHA-256 `0bc58a8054974e24d2cddd89a6a73d78d31bf82000125402bee400bc6fab894a`，退出码0；code suite SHA-256 `2fa95795052306f25fd99b4a5d24e49e5f33f51be4389e40a7492c3b07b7a853`，退出码0。见[阶段§8.53](./prd/v1-local-simulation/03-fake-broker-trading-loop.md#853-platform-proposal创建拒绝未声明字段2026-10-10)。V1.3 P3全量路由/Worker矩阵和版本整体仍开放。

P0/A01交叉索引a11：新增Proposal白名单E2E/code日志及退出码侧车至V1.3-S2-L17，字段追踪状态仍OPEN/PARTIAL。交叉表SHA-256 `584210c0aed3ee6860923c8c87e8ffe392ee03b95fa197807a23d5fc051e1ba8`；本次改动只扩充证据路径，不代表需求语义覆盖已通过。

正式V1门禁a371（Proposal白名单工程/证据同步后）：阶段文档审计PASS，证据审计PASS（937引用、129份Manifest、268项），`versionSummaryIncomplete=false`但`uncheckedVersionGate=true`，版本仍INCOMPLETE/exit 2。四个历史Run（V1.2 `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`；V1.5 `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`）结构化导出仍缺；人工验收、待决政策/旧Run处置、活动恢复及Ubuntu目标验证也未满足。[a371日志](../evidence/audits/2026-10-10-v1-version-gate-a371.log)，SHA-256 `b3f72e2eae427e0dccee809a04156e9fb1ee0194b94dd75961d7a6ccbce8b3bf`。另保留未传参数的usage调用a370为失败记录，不作为版本门禁结果。

正式V1门禁a372（a371结果和验收记录同步后最终复核）：阶段文档审计PASS，证据审计PASS（938引用、129份Manifest、268项），`versionSummaryIncomplete=false`但`uncheckedVersionGate=true`；V1整体仍INCOMPLETE/exit 2。四个旧Run缺结构化导出、阶段交付/人工验收、OD-013/OD-014与旧Run处置、活动数据/业务恢复及Ubuntu实机仍是未满足条件。[a372日志](../evidence/audits/2026-10-10-v1-version-gate-a372.log)，SHA-256 `db24465a4908d3ec74274138d9f789c50e2334dcd30b049884d9aed9fc83e3d2`。

2026-10-10 P3/AUTO Mandate增量：Platform V1.3 Mandate创建接受字段现有显式白名单；`clientApproved`未知字段422，匿名请求身份优先，拒绝后Mandate不存在且合法创建仍成功。完整Web/API/CLI E2E 22/22、code suite exit 0，边界Run `050cfe16-8037-4b2f-b905-4ca4afbbb19d`，Manifest SHA-256 `cf54c67cdbb4ef52ce12e263e7b54002242e13b53c146349df8e49e0355a52e8`。E2E SHA-256 `ac7407c3f2465374bb3d18ed0abaa15a2f4b30cbc9df94b8aa6d30e8f2ed66ec`；code suite SHA-256 `bb98cf7ccd18bbfe9e7d587794c8cc758c7357bc83c652bf58fced5a3645b171`。详见[阶段§8.54](./prd/v1-local-simulation/03-fake-broker-trading-loop.md#854-platform-auto-mandate创建拒绝未声明字段2026-10-10)。

P0/A01交叉索引a12：V1.3-S2-L17增加AUTO Mandate字段白名单E2E/code日志与退出码sidecar；原需求分类仍OPEN/PARTIAL。交叉表SHA-256 `5649df709b3f2016d2e768c90764cdf12ecb1aa9dca90864ca302278f4258cfe`。

正式V1门禁a373（AUTO Mandate字段切片及追踪更新后）：五阶段文档审计PASS，证据审计PASS（941引用、129份Manifest、268项），`versionSummaryIncomplete=false`、`uncheckedVersionGate=true`；版本仍INCOMPLETE/exit 2。四个历史Run的结构化导出仍缺，五阶段交付与当前范围用户验收、未决政策/旧Run处置、活动数据及完整恢复、Ubuntu实机条件仍未满足。[a373日志](../evidence/audits/2026-10-10-v1-version-gate-a373.log)，SHA-256 `bef041bf2f97cfbe8d3025ca22a386251c03ac80f2572313bac1d0f98bbbf6c8`。

2026-10-10 P3/Proposal修订审批增量：Platform Proposal修订/审批HTTP命令现在在身份认证后拒绝未声明字段；两次`clientApproved`注入均422，独立回读确认Proposal状态/版本/内容Hash不变，合法流程仍通过。V1.3隔离E2E 22/22及完整code suite均exit 0，验证Run `b24e8925-85af-481b-8fde-e155d194b918`、Manifest SHA-256 `856f635c88b0ae831d27e98e949183638b086812aff060389c64bbdd251dae78`；E2E SHA-256 `ab096472913987cf185f4b4b83b9b0b1cd7f7b87b1c057f6d70a20b57891a5b8`，code suite SHA-256 `ecc1e63adcd57b957400a0dab6f067341479b866e439c37f95c5735f61bdbe50`。详见[阶段§8.55](./prd/v1-local-simulation/03-fake-broker-trading-loop.md#855-platform-proposal修订与审批拒绝未声明字段2026-10-10)。

P0/A01交叉索引a13：V1.3 Proposal修订/审批字段白名单E2E/code日志及退出码sidecar已关联L17；crosswalk SHA-256 `a9689221422ce4ae7c937dd8fe65b4a3385b8b7ab56d3df86e6f94ef88c8f5ba`。正式V1门禁a374：文档审计PASS、证据审计PASS（944引用、129份Manifest、268项），版本INCOMPLETE/exit 2；四个历史结构化TestRun导出、五阶段关闭/当前人工验收、决策与旧Run处置、活动恢复及Ubuntu实测仍未完成。[a374日志](../evidence/audits/2026-10-10-v1-version-gate-a374.log)，SHA-256 `3640b07ce693fc0b17e68d5c48366aa63598c01de19929c2c149414f9dd391f2`。


2026-10-10 V1.3 AUTO Mandate字段边界完成：激活/暂停未知字段返回422、状态不变，合法转换继续成功；修正Web暂停请求多传`contentHash`后，完整E2E 22/22、V1.3 code suite exit 0。E2E SHA-256 `11cb0823aa65a8618d933b7026a51131c02aad52efd141040cdbaff0b5e79083`，code suite SHA-256 `f489d906bf343ef5d84bebcd21ae875b35cfd24c93fb385bf7ad15b38003a69d`。详见[§8.56](./prd/v1-local-simulation/03-fake-broker-trading-loop.md#856-platform-auto-mandate激活与暂停拒绝未声明字段2026-10-10)。本次自动验证不代表阶段关闭或人工验收。


正式V1门禁a375（V1.3 Mandate转换边界及同步记录后）：阶段文档审计PASS；证据审计PASS（951引用、131份Manifest、270项）；`versionSummaryIncomplete=false`但`uncheckedVersionGate=true`，整体仍`INCOMPLETE`/exit 2。V1.2旧Run `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`及V1.5旧Run `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`缺结构化导出；阶段正式关闭、当前范围人工验收、OD-013/OD-014和旧Run处置、活动存储/全域恢复、Ubuntu实机仍未满足。[a375日志](../evidence/audits/2026-10-10-v1-version-gate-a375.log)，SHA-256 `1986b564cac7ff5c8e4ffb618b2b5387b79693bc9e901d15813614a1aacfb90e`。


正式V1门禁a376（最新记录同步后复核）：阶段文档审计PASS；证据审计PASS（952引用、131份Manifest、270项）；`versionSummaryIncomplete=false`、`uncheckedVersionGate=true`，整体`INCOMPLETE`/exit 2。四个指定历史Run结构化导出缺失（V1.2 `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`；V1.5 `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`）；阶段正式交付/人工验收、OD-013/OD-014及旧Run处置、活动存储/全域恢复、Ubuntu实机仍未满足。[a376日志](../evidence/audits/2026-10-10-v1-version-gate-a376.log)，SHA-256 `504060203cbdaa4a0bb538c25787664ecf7508e3dd51b052fa2ab5cb4ceb3bd2`。


2026-10-10 P0交叉索引a11：当前需求表已修正V1.3白名单的具名测试引用与测试计划锚点，147条需求结构审计PASS（1532路径/398目标/155测试名/143锚点，无缺失或失配）。交叉表SHA-256 `01a2df82794948d52ac1c76d72b0e846ea2ca711b29db3654b98c321f4b0d208`；[审计报告](../evidence/audits/2026-10-10-v1-crosswalk-current-tree-a11.json)。语义覆盖和P0整体仍开放。


正式V1门禁a377（P0交叉索引a11更新后）：五阶段文档审计PASS；证据审计PASS（953引用、131份Manifest、270项）；`versionSummaryIncomplete=false`，但`uncheckedVersionGate=true`，整体`INCOMPLETE`/exit 2。四个历史TestRun结构化导出、阶段工程/交付/人工验收、OD-013/OD-014与旧Run处置、活动数据/全域恢复、Ubuntu实机条件仍未满足。[a377门禁日志](../evidence/audits/2026-10-10-v1-version-gate-a377.log)，SHA-256 `f0fc9343d391c5f2006ca435de4223140c280116cb8449a458993866b65f3872`。


2026-10-10 P3/A05增量：跨服务路由矩阵补入六条Platform V1.3 Proposal/Mandate载荷白名单及负向/合法转换边界，完整E2E 22/22、code suite exit 0；修正Web暂停载荷多传字段。详见[A05矩阵](../evidence/audits/2026-10-09-v1-cross-service-route-matrix-a05.md#2026-10-10-v13-platform-proposalmandate字段白名单增量)与[阶段§8.56](./prd/v1-local-simulation/03-fake-broker-trading-loop.md#856-platform-auto-mandate激活与暂停拒绝未声明字段2026-10-10)。仅为六个HTTP请求边界，不关闭V1.1-S2-L14或P3。


正式V1门禁a378（A05路由边界与P0交叉表a11同步后）：阶段文档审计PASS；证据审计PASS（954引用、131份Manifest、270项）；`versionSummaryIncomplete=false`、`uncheckedVersionGate=true`，整体仍`INCOMPLETE`/exit 2。四个历史Run结构化导出缺失；P1～P6工程/决定/环境/当前范围人工验收条件仍未满足。[a378日志](../evidence/audits/2026-10-10-v1-version-gate-a378.log)，SHA-256 `0beef31691b3c86648c7a371eeb4d74dd7baacdb90700d9a712f3ff845a24ada`。

2026-10-10 P3/V1.3多腿执行测试准备：新增合成CN/US两腿输入、聚合资金不足拒绝及首腿响应丢失恢复场景；Fixture schema/hash检查通过，但Trade执行断言尚未实现/运行，故V1.3-S2-L13仍OPEN。测试计划已记录订单/Fill逐腿、同Run CLI、账本MATCH与原clientOrderId恢复要求；OD-014未决前不含卖出资金供买入的路径。[固定输入](./../fixtures/v1/v1.3-multileg/trading-loop-scenarios.json)、[阶段§8.57](./prd/v1-local-simulation/03-fake-broker-trading-loop.md#857-v13多腿执行固定输入2026-10-10尚未执行)。Fixture校验35文件通过、JSON校验301文件/207 schema/52 fixtures通过；文档链接7480条通过，git diff --check通过。P0交叉索引a12加入Fixture路径（1533路径/401目标；结构性复核不代表语义覆盖PASS），crosswalk SHA-256 `9850aed3d0ba144cd5a079be707a60d6188874b16b8b03741f773768442b66e4`。

正式V1门禁a379（多腿Fixture与计划追踪同步后）：五阶段文档审计PASS；证据审计PASS（955引用、131份Manifest、270项）；`versionSummaryIncomplete=false`、`uncheckedVersionGate=true`，V1仍INCOMPLETE/exit 2。四个历史TestRun结构化导出缺失；五阶段余项/当前范围人工验收、未决决策与旧Run处置、活动存储恢复及Ubuntu实机证据仍未满足。[a379日志](../evidence/audits/2026-10-10-v1-version-gate-a379.log)，SHA-256 `86a9af4707a338c3439e086b1ad43cc7439ebf6038817912945acf7a96ab1cb5`。

2026-10-10 P0/A01交叉表独立复核a12：修复V1-90-STAGE-V1.3测试计划锚点，使其与新增多腿执行断言的当前行完全一致；独立结构检查147条需求、1772个显式路径字段引用/408个目标、155个测试名、144个来源文本，缺失/失配/过期均为0。该报告使用具名路径字段口径，不与旧版广口径路径计数直接比较，也不证明语义覆盖。[a12报告](../evidence/audits/2026-10-10-v1-crosswalk-current-tree-a12.json)，报告SHA-256 `554516311dde64c5d372c3423a2b602800bda2512e6414f7d62594400678c697`，交叉表SHA-256 `384eff7df363e5c608e6952ebf67878065d101e977f52a7f7cffc7a7acab1cfc`。`pnpm docs:check` 7487链接/0失败，`git diff --check`通过。

正式V1门禁a380（a12交叉索引复核及计划同步后）：五阶段文档审计PASS；证据审计PASS（956引用、131份Manifest、270项）；`versionSummaryIncomplete=false`、`uncheckedVersionGate=true`，V1仍INCOMPLETE/exit 2。四个历史TestRun结构化导出、五阶段工程/交付及当前范围人工验收、未决决策/旧Run处置、活动存储全域恢复和Ubuntu实机条件仍未满足。[a380日志](../evidence/audits/2026-10-10-v1-version-gate-a380.log)，SHA-256 `3150f946bc6dbcc45414880d797c17d84ad3f677c093590a524c826e4133cfc5`。

正式V1门禁a381（同步a380记录后）：五阶段文档审计PASS，证据审计PASS（957引用、131份Manifest、270项）；`versionSummaryIncomplete=false`、`uncheckedVersionGate=true`，V1仍INCOMPLETE/exit 2。未关闭项不变：四个历史导出、五阶段工程/交付/当前范围人工验收、未决决策/旧Run处置、活动存储恢复及Ubuntu实机。[a381日志](../evidence/audits/2026-10-10-v1-version-gate-a381.log)，SHA-256 `099a9dcd01302332ef9f7dec0dabbbcc4669666d7a18cca16836297e517a417c`。

2026-10-10 P3/V1.3多腿批次执行完成固定子项：CN_A MANUAL BUY/BUY两腿已通过完整V1.3 Playwright 23/23及完整code suite exit 0。新TestRun `5c6c9cd0-853f-4623-a435-96630d50f105`验证两订单/两Fill、Fixture 1.0.1期末现金7790.0000、同Run CLI MATCH和刷新恢复；定向TestRun `93496dd5-eb25-48c1-9123-53ae06b2e2b6`亦通过。完整E2E日志SHA-256 `b0dbf79c22240668e630383dc640acfac1e3a7a579db0dcf5d0d494b10429186`；完整code suite SHA-256 `23fa72898179390d4b5b00361b23782cb3f096fe7bf5f3f42642a7d06368992c`。多腿资金不足无授权/订单和首腿响应丢失后的查询原单/补缺腿有单元测试。更新了交叉索引并保留OPEN分类；旧进度中“无执行断言/NOT_RUN”为本轮前历史快照，已由当前证据取代。具体范围及证据见[阶段§8.57](./prd/v1-local-simulation/03-fake-broker-trading-loop.md#857-v13多腿执行固定输入及验证状态2026-10-10)与[当前需求追踪](../evidence/audits/2026-10-09-v1-requirement-test-crosswalk.json)。P3/V1.3父项仍OPEN：US MANUAL E2E、AUTO多腿、跨服务低余额拒绝、Trade真实进程重启恢复和授权规则全覆盖未完成；SELL proceeds-to-BUY等待OD-014。自动化结果不代表阶段关闭或当前范围人工签署。

2026-10-10 P0/A01交叉索引a13：同步V1.3-S2-L13的CN MANUAL双腿执行测试和E2E/code日志，并刷新§2及§90来源锚点。147项、1781个显式路径字段引用/418唯一目标、154个字面测试声明、143个来源文本结构审计PASS，无缺失/失配/过期；[a13报告](../evidence/audits/2026-10-10-v1-crosswalk-current-tree-a13.json)，SHA-256 `61fd50b11fe00632245563b51b71d0bcc88c61ec6c6774fd999186b325b1d1d8`；更新交叉索引SHA-256 `45576f5c196f6f771c0dda34aeea2a87b82e699e1add02b11ae64017983d5275`。`pnpm docs:check` 7505链接/0失败、Fixture检查36文件PASS、JSON检查303文件/207 schema/54 fixtures PASS、`git diff --check` PASS。该结构检查不证明语义覆盖或阶段验收。

正式V1门禁a382（V1.3多腿固定子项、追踪a13和最新证据同步后）：五阶段文档审计PASS；证据审计PASS（961引用、131份Manifest、270项）；`versionSummaryIncomplete=false`、`uncheckedVersionGate=true`，版本仍`INCOMPLETE`/exit 2。仍缺V1.2旧TestRun `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`和V1.5三条历史TestRun结构化导出；五阶段工程/交付关闭与当前范围人工验收、OD-013/OD-014和旧Run处置、活动存储切换/全域恢复及Ubuntu实机条件尚未满足。[a382日志](../evidence/audits/2026-10-10-v1-version-gate-a382.log)，SHA-256 `ed71ed65e59ea1a198bf5d5084719a1be60f433f47893498b39246124bc163e8`。

2026-10-10 P3/V1.3 US MANUAL双腿固定场景完成：新增Web E2E消费Fixture 1.0.1的US_EQUITY两腿输入，完整V1.3套件24/24通过。TestRun `eb34b908-d568-4fa8-b73f-cbd4a48c4880`生成两订单/两Fill，期末USD现金9549.9000；同Run CLI核对预留与MATCH，页面刷新恢复订单。隔离资源精确清理，外部行情源/真实券商调用0；日志SHA-256 `867792eb60650e183735b03ea240509d90b2ead6e309150915903a8845d9ac24`，见[E2E日志](../evidence/audits/2026-10-10-v13-multileg-us-manual-e2e-a01.log)。V1.3-S2-L13剩余AUTO多腿、真实跨服务低余额拒绝、多腿进程重启恢复、更广授权规则和SELL结算；父项/P3仍OPEN。

2026-10-10 P3 V1.3多腿边界的代码门禁：修正新增US验收记录的相对链接后，`pnpm verify:stage -- --stage V1.3 --suite code`完整通过，exit 0；日志SHA-256 `3c555594d3221cff2d1823a6dc4fad51d43dd1ff634c5a7c247a77b6acad5627`，见[完整code suite日志](../evidence/audits/2026-10-10-v13-multileg-us-code-suite-a02.log)。此前因错误Markdown相对链接导致的code suite a01 exit 1保留为失败历史，不算测试失败。P0/A01 a14同步US两腿用例与代码门禁证据，147项/1787显式路径/423目标/155测试名/143锚点结构审计PASS、0缺失；报告SHA-256 `a9c4a99fc67f0a18ee5100ef738ae6abe2d60f8b1c3668a8664b65edadf62a2a`，crosswalk SHA-256 `b909c93b6cb6ab50cd6d2d1a2228b2d7567eb706adcf239cc6b90f23e85d50cc`。`pnpm docs:check` 7514链接/0失败。

正式V1门禁a383（US MANUAL双腿与V1.3代码复验记录同步后）：五阶段文档审计PASS；证据审计PASS（965引用、131份Manifest、270项）；`versionSummaryIncomplete=false`、`uncheckedVersionGate=true`，整体INCOMPLETE/exit 2。四个历史Run结构化导出、五阶段工程/交付及当前范围人工验收、决策与旧Run处置、活动存储/全域恢复和Ubuntu实机条件仍未满足。[a383门禁日志](../evidence/audits/2026-10-10-v1-version-gate-a383.log)，SHA-256 `0bae4e5ca522a9724b71e19856bc20e2ded3508310a40d65a998addfffb709f1`。


2026-10-10 P3/V1.3多腿Trade重启恢复子项通过：定向E2E 1/1 TestRun `39f1f636-eebc-41b7-9551-ce073392cadc`；完整V1.3隔离Web/API/CLI/export E2E 26/26，TestRun `690641a2-d40d-4a5d-80e4-4df6657b97e1`，日志SHA-256 `8a53bc888aef9a1eff4dc9a821e4f15f2c5ad71c9b49125974b10f784849a61e`；完整V1.3 code suite exit 0，日志SHA-256 `8600a3132057cd7a93dc4f9a456f0764464283107c0f56500cc611e5fe4b70d3`。首腿FakeBroker持久提交后重启Trade，再以原批次clientOrderId重试，恢复第二腿并验证两订单/Fill、同Run CLI与MATCH，隔离资源已清理。详见[阶段§8.58](./prd/v1-local-simulation/03-fake-broker-trading-loop.md#858-v13多腿trade进程重启恢复2026-10-10)与[当前追踪表](../evidence/audits/2026-10-09-v1-requirement-test-crosswalk.json)。V1.3-S2-L13/P3仍OPEN，AUTO多腿、真实跨服务低余额拒绝、SELL结算/OD-014、更广授权和其他阶段工作未完成；版本与人工验收不能据此签署。

正式V1门禁a384：阶段文档审计PASS，证据审计PASS（966引用/131份Manifest/270项），V1仍INCOMPLETE/exit 2。四个历史Run缺结构化导出，阶段交付与人工签收、决策/旧Run处置、活动恢复和Ubuntu实机条件仍未满足。[a384门禁日志](../evidence/audits/2026-10-10-v1-version-gate-a384.log)。

P0/A01交叉索引a15已通过：147项需求，1508个显式路径引用/412个目标，156个精确测试名、143个来源锚点，0缺失/失配/过期；仅结构校验，不替代语义和阶段验收。[报告](../evidence/audits/2026-10-10-v1-crosswalk-current-tree-a15.json)。

2026-10-10 P3/V1.3多腿低现金跨服务拒绝：现金955.0000 CNY时MANUAL两腿被Platform→Trade→Portfolio链路409拒绝，批次订单未产生，Portfolio账户及reconciliation精确不变，同Run CLI通过。定向E2E 1/1 TestRun `e8d1092b-1914-4684-a184-cbbf2e52de6e`；更新后完整Web/API/CLI/export 25/25，code suite exit 0，日志分别SHA-256 `fbee613ce6a592a45ea9bbd2a08610c60efa031f50bc5baa579c1812de165c2c`、`4c4792ec65f0205ff1aac79f5a3893b74df08d42ab3652d31777d17a0a89bfa9`。首腿成功预留后次腿失败的实际跨服务释放仍未验证，V1.3父项保持OPEN。

P0/A01交叉索引a16：147项、1515路径引用/419目标、157个测试名、143来源锚点全部结构通过，缺失/失配/过期0；此为结构核对，不替代行为与验收。[报告](../evidence/audits/2026-10-10-v1-crosswalk-current-tree-a16.json)。

P3/V1.3 MANUAL多腿部分预留后回滚已通过Docker隔离E2E：第一腿Reservation为RELEASED，第二腿未预留，未创建子订单/Fill，余额/持仓/账本/对账不变；同Run CLI PASS。定向TestRun `f64b339c-8f60-4c7f-9027-72ebada6d66e`；完整V1.3 E2E 25/25与code suite均exit 0（日志SHA-256分别`a45600b14d972414a05c800a1a23a8230675a04503747126455eae4f252513c6`、`4152638b5e47f2d92f404b2348df5eeb1728d83200603e6bd986929887cc5ef5`）。AUTO多腿、SELL结算和V1.3父级验收仍OPEN。

P0/A01交叉索引a17：147项，1522个显式路径引用/426目标，157个精确测试名，143个来源文本；缺失路径、测试名失配、过期锚点均0。此为结构检查，不代表语义覆盖。[报告](../evidence/audits/2026-10-10-v1-crosswalk-current-tree-a17.json)。

最新正式门禁a388：五阶段文档审计PASS、证据审计PASS（966引用/131份Manifest/270项），整体V1仍INCOMPLETE/exit 2。四个旧TestRun缺结构化导出；阶段收尾与人工签收、OD-013/OD-014和历史记录处置、活动数据恢复及Ubuntu实机仍是阻塞项。[门禁日志](../evidence/audits/2026-10-10-v1-version-gate-a388.log)。

最新V1门禁a389：阶段文档审计PASS，证据审计PASS（966引用/131份Manifest/270项），整体V1仍INCOMPLETE/exit 2。V1.3 MANUAL部分预留回滚子项已通过完整E2E/code suite；V1.2及V1.5四个历史TestRun导出、其余五阶段工程/交付及人工验收、OD-013/OD-014、活动数据恢复/切换和Ubuntu实机仍开放。[a389门禁](../evidence/audits/2026-10-10-v1-version-gate-a389.log)。

正式V1门禁a390（更新P3交付状态后）：V1仍INCOMPLETE/exit 2，五阶段文档与本地证据引用审计均PASS（966引用、131 Manifest、270项）；`uncheckedVersionGate=true`。未解决项继续包括四个历史Run导出、五阶段工程/交付及人验、OD-013/OD-014、活动恢复与Ubuntu实机。[日志](../evidence/audits/2026-10-10-v1-version-gate-a390.log)。

最新正式V1门禁a391：五阶段文档审计PASS、证据审计PASS（966引用/131份Manifest/270项）；整体仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。四个历史TestRun缺结构化导出；阶段交付/人工签收、OD-013/OD-014、活动数据恢复及Ubuntu实机未满足。[a391日志](../evidence/audits/2026-10-10-v1-version-gate-a391.log)。

正式V1门禁a393：五阶段文档审计PASS、证据审计PASS（966引用、131份Manifest、270项），但五阶段未关闭、验收表5项未解决、门禁未勾选，V1仍`INCOMPLETE`/exit 2。四个历史TestRun结构化导出、当前范围人工验收、活动数据/跨服务恢复、Ubuntu实机及待决政策仍未满足。[a393日志](../evidence/audits/2026-10-10-v1-version-gate-a393.log)，SHA-256 `fe0af013028cce5f02e7d4b5328f22ac6e4fa72b482718d2214bba62c454dfea`。

2026-10-10 P3/V1.3固定AUTO_POLICY两腿BUY通过：新增Fixture 1.0.2记录AUTO批次语义，原1.0.1保持冻结未改。CN_A正式Web完成单个Mandate预算消费CNY 2210.00、两条Portfolio逐腿预留、两笔稳定子订单/Fill，期末现金7790.0000；刷新恢复与同Run `--check-only` CLI核对PASS。TestRun `cb6130f5-671c-4be3-bb6b-bae551e8a980`。完整V1.3隔离E2E 26/26，日志SHA-256 `ee9ace15c381b694e5663dcfd84f331c054c61a8e96fab8f07403058f8494a6e`；完整V1.3 code suite exit 0，日志SHA-256 `8d76fd5e1ef9ddd62d6648e231f0f85fa4fb8ed4123bcc253485ab8c3336d117`，具体Fixture、命令、预期及执行手册见[阶段§8.60](./prd/v1-local-simulation/03-fake-broker-trading-loop.md#860-v13-auto_policy固定两腿buy批次2026-10-10)。首次代码检查因Schema尚未允许Fixture 1.0.2而失败，新增版本enum后通过；失败日志保留。当前仅关闭CN_A固定AUTO BUY/BUY子场景；SELL资金结算、US AUTO及更广规则未覆盖，L13、P3和V1.3人验继续OPEN/NOT_RUN。

正式V1门禁a395（AUTO固定两腿场景及文档、追踪索引同步后）：五阶段文档审计PASS，证据引用审计PASS（969引用、131份Manifest、270项）；版本`INCOMPLETE`/exit 2，`versionSummaryIncomplete=false`、`uncheckedVersionGate=true`。仍缺结构化导出的历史TestRun为V1.2 `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`和V1.5 `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`；五阶段交付/新增范围人验、OD-013/OD-014与历史Run处置、活动数据/跨服务恢复和Ubuntu实机仍未满足。[a395日志](../evidence/audits/2026-10-10-v1-version-gate-a395.log)，SHA-256 `a6b715256deae37719d2da3019db9921de6e391dac4d39c078bb23685272df1e`。该门禁证实当前版本尚不能签收；自动测试通过不能替代历史证据恢复、用户决定或人验。

2026-10-10 P5/A11生产备份器业务事实复验：`pnpm test:backup:cluster-isolated` exit 0；隔离恢复10个服务数据库/角色和合成TestRun `e0d597cf-72b7-4a10-b12a-a5a8474842e1` 的FakeBroker订单/Fill及Portfolio账本，2条LedgerEntry、现金899.9000、10股均通过关系断言，外部/真实券商调用0，随机项目精确清理。机器报告 [JSON](../evidence/audits/2026-10-09-v1-isolated-cluster-paired-backup-6ec18309cc38403b.json)，复验日志 [log](../evidence/audits/2026-10-10-v1-isolated-cluster-paired-business-facts-a01.log)，SHA-256 `71c9d43903873841a14edb0834aaff89a3de4b1cfcdbca626eea2650eac12c44`。这是对既有合成业务事实路径的复验，A11仍OPEN：真实Research API/V1.1–V1.4产物、完整活动备份编排、Ubuntu/异地/RPO-RTO及人工验收仍未完成。

正式V1门禁a397（A11复验记录及交叉索引同步后）：五阶段文档审计PASS；证据引用审计PASS（971引用、131份Manifest、270项）；版本`INCOMPLETE`/exit 2，`versionSummaryIncomplete=false`、`uncheckedVersionGate=true`。仍缺V1.2及V1.5四个历史Run结构化导出、阶段交付与当前范围人验、待决政策/旧Run处置、活动恢复与Ubuntu实机条件。[a397门禁日志](../evidence/audits/2026-10-10-v1-version-gate-a397.log)，SHA-256见同名`.sha256`。该门禁确认本次文档/证据索引完整，但V1尚不能签收。

2026-10-10 P3/V1.3 US AUTO_POLICY多腿BUY固定子项通过：新增Fixture 1.0.3（场景SHA-256 `e705f393a5d7f8c94915302e1250212e2dd45fd41d5c5795f519d7bd6b3c0115`，1.0.0–1.0.2原文件保留）。US_EQUITY单一Mandate消费USD 450.10、两条Portfolio预留、AAPL 10/MSFT 5两订单与Fill、期末USD 9549.9000，双账本MATCH；Web刷新恢复及同Run CLI断言通过。定向Playwright 1/1；完整V1.3隔离Web/API/CLI/export E2E 27/27，业务Run `382dd284-62cc-4157-a53e-5711385e3b90`；完整V1.3 code suite exit 0。证据见[阶段§8.61](./prd/v1-local-simulation/03-fake-broker-trading-loop.md#861-v13-auto_policy固定us_equity两腿buy批次2026-10-10)、[完整E2E日志](../evidence/audits/2026-10-10-v13-auto-us-multileg-full-e2e-a01.log) SHA-256 `6e7e4200f91b6776a04dfa84e7803f9ce583df5f7b9389f00e30df7c084e9ddf`、[完整code suite日志](../evidence/audits/2026-10-10-v13-auto-us-multileg-code-suite-a01.log) SHA-256 `d1c4fb360652e6fdb3f51160959d53c7ee98707ca455ace2918221a94a965e79`。业务TestRun仍为WAITING，`--check-only` exit 2是该状态的预期结果，不能标记正式Run PASS。随机隔离资源精确清理、真实来源/券商调用0。此项只关闭US AUTO BUY/BUY固定子场景，V1.3/P3、OD-014 SELL结算、全路由矩阵、阶段/人工验收仍OPEN/NOT_RUN。

正式V1门禁a398（V1.3 US AUTO固定两腿场景、完整E2E/code suite证据及交叉索引同步后）：五阶段文档审计PASS，证据引用审计PASS（974引用、131份Manifest、270项）；版本仍为`INCOMPLETE`/exit 2，`versionSummaryIncomplete=false`、`uncheckedVersionGate=true`。V1.2历史Run `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`及V1.5历史Run `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`的结构化导出仍缺；五阶段交付/新增范围人工验收、OD-013/OD-014与历史Run处置、活动恢复及Ubuntu实机条件仍未满足。[a398门禁日志](../evidence/audits/2026-10-10-v1-version-gate-a398.log)，SHA-256 `3b28c480f48914de50d0bae638ec43be26233d6142d89dc1a44f91fd26c29cf8`。本次US AUTO子场景证据和文档审计齐全，但不改变V1未完成状态。

正式V1门禁a399：在a398结果同步至进度摘要后重跑，结论未变：五阶段文档审计PASS、证据审计PASS（974引用、131份Manifest、270项），版本`INCOMPLETE`/exit 2；仍由四个历史TestRun结构化导出及未勾选的版本条件阻塞。[a399门禁日志](../evidence/audits/2026-10-10-v1-version-gate-a399.log)，SHA-256 `3b28c480f48914de50d0bae638ec43be26233d6142d89dc1a44f91fd26c29cf8`。本次未覆盖历史门禁日志本身的自引用，不以重复门禁制造已完成假象。

2026-10-10 计划摘要同步：完成P1/P3汇总表中V1.3旧E2E数字的文档漂移更正，引用最新完整27/27结果及US AUTO TestRun，并维持P1/P3开放状态；`pnpm docs:check`（7574链接）和`git diff --check`通过。此同步不改变工程/人工验收状态。

计划摘要同步后的正式门禁a400复核仍为`INCOMPLETE`/exit 2，未改变历史导出缺失及版本门禁未勾选项；文档摘要修正不等于关闭父工作包。[a400门禁日志](../evidence/audits/2026-10-10-v1-version-gate-a400.log)，SHA-256 `3b28c480f48914de50d0bae638ec43be26233d6142d89dc1a44f91fd26c29cf8`。

2026-10-10 V1.4操作手册锚点修复：发现并修正§8.15重复编号，将回测模式注入拒绝与取消载荷拒绝分别编号为§8.17/§8.18，并同步90-test-plan、99-acceptance及计划/进度中的引用。验收步骤现在指向唯一条目；`pnpm docs:check`（7575链接，0失败）和`git diff --check`通过。仅修复证据导航，不改变V1.4业务验收或阶段状态。

V1.4锚点修复后的正式门禁a401仍为`INCOMPLETE`/exit 2，阶段文档审计与证据引用审计通过；四个历史TestRun原始导出及其他V1必需验收条件依然未满足。[a401门禁日志](../evidence/audits/2026-10-10-v1-version-gate-a401.log)，SHA-256 `3b28c480f48914de50d0bae638ec43be26233d6142d89dc1a44f91fd26c29cf8`。

2026-10-10 V1五阶段验收手册章节编号复核：发现V1.1、V1.2、V1.3各有重复§8编号；将重复的后续记录分别调整为唯一编号（V1.1 §8.24、V1.2 §8.35–§8.39、V1.3 §8.63），更新已确认的V1.1反向链接。脚本复核五个阶段文档中§8.x编号零重复；`pnpm docs:check` 7576链接、`git diff --check`均通过。此工作修复文档定位，不改变任何阶段通过/人验状态。

编号与链接修复后的正式门禁a402仍为`INCOMPLETE`/exit 2；文档/证据审计通过，四个历史TestRun结构化导出和未满足的版本验收条件仍阻塞签收。[a402门禁日志](../evidence/audits/2026-10-10-v1-version-gate-a402.log)，SHA-256 `3b28c480f48914de50d0bae638ec43be26233d6142d89dc1a44f91fd26c29cf8`。

2026-10-10 文档结构防回归：新增V1五阶段§8编号唯一性检查并接入`pnpm docs:check`；脚本忽略围栏代码，四项单元测试覆盖重复、行号、围栏及嵌套编号前缀。修复本轮发现的V1.1/V1.2/V1.3/V1.4重复章节号并重定向已确认引用。`pnpm baseline:check`在本机回环授权环境退出0（64项脚本测试PASS，contracts/fixtures、生成器、分层门禁和文档检查均通过）；默认沙箱首轮因两项既有localhost HTTP测试绑定EPERM退出1，不作为代码失败，受控同命令重跑通过。

结构检查与完整基线更新后的正式V1门禁a403仍`INCOMPLETE`/exit 2，阶段文档审计与证据引用审计PASS；历史导出和版本业务/环境/人工验收条件不变。[a403门禁日志](../evidence/audits/2026-10-10-v1-version-gate-a403.log)，SHA-256 `3b28c480f48914de50d0bae638ec43be26233d6142d89dc1a44f91fd26c29cf8`。

2026-10-10 文档锚点交叉复核：章节编号更正后按实际标题文本复核V1.4取消和模式拒绝链接，将验收表/进度中的V1.4取消引用更新至唯一§8.18标题，并将模式拒绝计划引用更新为§8.17；`pnpm docs:check` 7578链接、阶段编号检查零重复，四项结构检查单测通过。完整Markdown锚点通用校验因当前仓库标题归一化存在差异尚未接入，不能把只读候选扫描的误报当作缺链结论。

文档检查器和V1.4验收链接更新后的正式门禁a404仍`INCOMPLETE`/exit 2；文档审计及证据引用审计PASS，历史导出和其余未满足验收条件仍待解决。[a404门禁日志](../evidence/audits/2026-10-10-v1-version-gate-a404.log)，SHA-256 `3b28c480f48914de50d0bae638ec43be26233d6142d89dc1a44f91fd26c29cf8`。

2026-10-10 证据sidecar失败处置：a405在验收页首次引用a404 SHA sidecar后退出1，证据审计发现a404 `.sha256`仅有哈希、缺少目标相对路径（因此格式无效）。保留失败日志[a405](../evidence/audits/2026-10-10-v1-version-gate-a405.log)，其SHA-256 `aa2a97b4db6d09c9ab10fd5f8dc7b96f647cbeae08dcb8d01ccf540f96a290f2`；已将a404与a405 sidecar改为仓库要求的`<sha256>  <repository-relative-path>`格式，a404日志本体未改。该失败归因于证据清单格式，不代表运行测试失败；须以修正后的下一次门禁确认。

a405 sidecar修复后的正式门禁a406：五阶段文档审计PASS、证据审计PASS（976引用、132份Manifest、271项）；V1`INCOMPLETE`/exit 2，四个历史Run结构化导出仍缺，版本验收条件仍未勾齐。[a406日志](../evidence/audits/2026-10-10-v1-version-gate-a406.log)，SHA-256 `f199c22fa5e40dbe582b7be75ee6daa7e4f59c043e47a754a332307544872199`。验收页已同步最新结论。

最新正式V1门禁a407在验收页/进度同步后复跑：文档审计PASS、证据审计PASS（976/132/271），V1仍`INCOMPLETE`/exit 2；四个历史Run导出和其余验收条件未变。[a407日志](../evidence/audits/2026-10-10-v1-version-gate-a407.log)，SHA-256 `9ccd71777a6015d6f6a22d3729bc82f44ed4f8bfd87bd49ca4fae6d7d63de618`。

2026-10-10 P0/A01交叉索引当前树复核a18：修复6条失效/空缺的来源定位文本后，重新按当前来源逐字核对147条当前来源锚点；147个需求ID唯一，1548个路径字段引用/460个唯一目标存在，159条精确测试声明全部命中，0缺失路径、0测试失配、0过期锚点。当前索引SHA-256 `8eb7e7f0aab4f756c5539afff4551510c255a927acbe8ec808e15d6368c55ed4`，sidecar已同步；[a18结构报告](../evidence/audits/2026-10-10-v1-crosswalk-current-tree-a18.json)，SHA-256 `6fddf77a82f7bc6186c70c8af804e9aa5885494d95448047d314d4f07c7de927`。该复核只验证路径、字面测试名与来源文本定位，不证明断言充分、需求完成或人验；P0语义覆盖和整体仍OPEN，未勾选总项。

交叉索引a18复核后的正式门禁a408：五阶段文档审计PASS、证据审计PASS（980引用、134份Manifest、273项），TestRun审计仍有4个历史结构化导出缺失，V1 `INCOMPLETE`/exit 2。a408结果已同步至版本验收页；[门禁日志](../evidence/audits/2026-10-10-v1-version-gate-a408.log)，SHA-256 `5c3d21dbea84f7b43fb79a1ef0995dd9c9710dc248f346aef0733c0c305e2a7d`。

2026-10-10 P0交叉索引核验固化：新增`pnpm crosswalk:check`及两项单元测试，接入`baseline:check`；覆盖需求ID唯一、索引中1548个路径引用/460个目标、159个精确测试名及147条来源文本定位。报告由当前仓库脚本生成：[a19 JSON](../evidence/audits/2026-10-10-v1-crosswalk-current-tree-a19.json)，SHA-256 `043d6bcbf1ba0c4c343a5f1a076a53003084d9b774e1de93624086686b2eb9ea`。完整`pnpm baseline:check`在本机回环环境退出0，66项脚本测试PASS；contracts/fixtures、生成器、服务分层及文档检查通过。检查只验证索引结构，不代表需求行为覆盖或验收。

最新正式V1门禁a409：五阶段文档审计PASS、证据审计PASS（982/135/274），四个历史TestRun结构化导出仍缺，版本继续`INCOMPLETE`/exit 2；a409已同步至版本验收页。[日志](../evidence/audits/2026-10-10-v1-version-gate-a409.log)，SHA-256 `0ccc18b014d887edf5e3b696351a48e4942d37d6091275e7014a66329805f99b`。


2026-10-10 P0市场规则范围核对：按市场规则合同/V1范围/V1.4当前缺口建立来源到已验证Fixture切片及未验证领域的矩阵（市场/证券、时区日历、价格数量、停牌/成交量、资金可卖性、费用滑点、结算、公司行动、Qlib/Paper一致性）。明确固定Fixture不等于完整市场规则；OD-014结算口径仍待所有者决定，P3/P4规则实现继续OPEN。[范围矩阵](../evidence/audits/2026-10-10-v1-market-rule-scope-a01.md)。

正式V1门禁a410（市场规则范围矩阵及计划记录同步后）：阶段文档审计PASS；证据审计PASS（984引用、136份Manifest、275项）；版本仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。V1.2 Run `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`和V1.5 Runs `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`仍缺结构化导出；五阶段交付/人工验收、OD-013/OD-014处置、活动数据恢复及Ubuntu实机等条件仍未满足。[a410日志](../evidence/audits/2026-10-10-v1-version-gate-a410.log)，[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a410.log.sha256)。


2026-10-10 P0差异清单推进：基于当前147项需求索引生成逐项快照，包含当前来源锚点/摘要、责任包、链接证据与逐名测试、可显式识别的Fixture路径、已记录缺口和关闭条件。仅24项存在可从证据路径提取的服务候选、10项有显式Fixture链接、37项有逐名测试；其他映射不推断服务或行为通过，语义/责任归属人工复核仍OPEN。[当前差异快照](../evidence/audits/2026-10-10-v1-current-gap-matrix-a01.json)，SHA-256 `00d24a39af2b1fd8c3cf5b59b396bb5f938ef27a2b49f2d933bd3ca04a7dff49`。

正式V1门禁a411（当前差异快照同步后）：五阶段文档审计PASS；证据审计PASS（986引用、137份Manifest、276项）；版本仍INCOMPLETE/exit 2，uncheckedVersionGate=true。四个历史TestRun导出、阶段交付/人验及其他版本门禁仍未满足。[a411日志](../evidence/audits/2026-10-10-v1-version-gate-a411.log)，SHA-256 `f805749a9020f064b9c569b2d120ec05815fd4e2d1e1f0429e4f8206484c1b3f`。


2026-10-10 V1.4回测入口模式矩阵当前树复验通过：隔离`pnpm test:integration:v14-backtest` exit 0；四种PAPER/LIVE/BACKTEST与FAKE/REAL组合注入均在Platform入口422且Quant Run数不增加，正常隔离回测继续通过；浏览器5/5，Web/API创建Run均同ID CLI核验，临时Compose资源清理确认。最新执行[a03日志](../evidence/audits/2026-10-10-v14-mode-boundary-e2e-a03.log) SHA-256 `e53e90bf5b38d286528ce1dc50fc61128f7ec949eb4ed8be9d6db8b90de8d30a`；首次沙箱Docker权限失败保留为a02。只关闭V1.4一个入口子矩阵，不关闭P3全路由矩阵/P4规则、结算或版本人工/环境验收。交叉索引及当前差异快照已附该证据。


正式V1门禁a412（V1.4模式边界E2E、追溯索引与进度记录同步后）：阶段文档审计PASS；证据审计PASS（992引用、138份Manifest、277项）；版本仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。四个历史TestRun结构化导出、五阶段交付/人工验收、待决政策、活动恢复和Ubuntu实机条件仍未满足。[a412日志](../evidence/audits/2026-10-10-v1-version-gate-a412.log)，SHA-256 `5963f7837db0e8d532eacfb580dd794e764fbd07454fe9296fdd0a70b527caaa`。


2026-10-10 V1全局基线当前树复验：`pnpm baseline:check`受控本机exit 0，66/66测试通过，包含docs/contracts/fixtures、生成/兼容、服务分层与版本门禁测试。普通沙箱a02仅两项seed-paper HTTP测试因127.0.0.1监听EPERM失败，受控同命令a03通过；失败保留不覆盖。该基线只证明工程脚本状态，不构成阶段业务E2E或人工验收。[a03日志](../evidence/audits/2026-10-10-v1-baseline-check-a03.log)，[SHA-256](../evidence/audits/2026-10-10-v1-baseline-check-a03.log.sha256)。


正式V1门禁a413（V1.4当前树隔离E2E及P1全局基线证据同步后）：五阶段文档审计PASS；证据审计PASS（993引用、138份Manifest、277项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。四个历史TestRun导出、五阶段交付及当前范围人工验收、政策/旧Run处置、活动恢复和Ubuntu条件仍未满足。[a413日志](../evidence/audits/2026-10-10-v1-version-gate-a413.log)，SHA-256 `a27fc2394c106c772dcd25c892306ee9604ff2aa551d3a4f4ae977854e4723c7`。

2026-10-10 P0历史覆盖台账逐项对照：将2026-10-06的106条历史要求与当前147项索引按阶段/章节/原始源行匹配，106/106匹配、41项为后续新增、0条旧项坐标失配；保留原历史状态并追加当前源锚点、分类、测试/证据链接和剩余关闭条件。[JSON对照快照](../evidence/audits/2026-10-10-v1-p0-coverage-reconciliation-a01.json)，SHA-256 `c87abf0cf4350a32e74079a66c450ebf518ef4d04d482e13a6f337921c3d6e55`。这完成映射/增量核对；坐标匹配及分类索引不等于需求语义、实现或验收通过，P0第二项完整差异语义核对仍OPEN。


正式V1门禁a414（历史台账映射与V1.4当前树验证记录同步后）：五阶段文档审计PASS；证据审计PASS（994引用、138份Manifest、277项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。四个历史TestRun结构化导出、五阶段当前交付/人工验收、政策/旧Run处置、活动恢复与Ubuntu条件仍开放。[a414日志](../evidence/audits/2026-10-10-v1-version-gate-a414.log)，SHA-256 `1ff6f942b34b0128b065f4f7da4ead25e013b5d284933277c624f36d1abc7400`。


2026-10-10 V1.3 Run创建及外部订单观察模式拒绝补测：新增隔离E2E断言V1.3 Run创建及外部订单观察路由对LIVE/FAKE、PAPER/REAL、LIVE/REAL均返回422，并比较外部观察前后Run reconciliation完全一致；完整模式矩阵共39次拒绝，订单/Fill为0、Portfolio账本不变、同Run CLI通过、资源清理通过。见[阶段§8.63](./prd/v1-local-simulation/03-fake-broker-trading-loop.md#863-v13-run创建与外部订单观察模式注入拒绝2026-10-10)及[日志](../evidence/audits/2026-10-10-v13-run-creation-mode-boundary-e2e-a03.log)，SHA-256 `00ba500ee2da23ff30d4bb0af825ff9d318cd951979babd4347da7a21816072d`。只补此平台固定路由，P3全服务/Worker路径、结算和用户验收仍OPEN。


正式V1门禁a415（V1.3外部订单观察模式边界补测、索引及阶段记录同步后）：五阶段文档审计PASS；证据审计PASS（998引用、139份Manifest、278项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。四个历史Run结构化导出、阶段交付/用户人工验收、待决政策、活动数据恢复及Ubuntu实机仍开放。[a415日志](../evidence/audits/2026-10-10-v1-version-gate-a415.log)，SHA-256 `ca7f5e55d0641080bf72c6a65a7f72a23567f126287efc2dcc9e03d3ea5fbf86`。

正式V1门禁a416（V1.3 Run创建及外部订单观察模式边界证据、追溯与计划同步后）：五阶段文档审计PASS；证据审计PASS（1001引用、139份Manifest、278项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。四个历史TestRun结构化导出、五阶段交付/新增范围人工验收、待决政策及历史Run处置、活动数据恢复和Ubuntu实机条件仍未满足。[a416日志](../evidence/audits/2026-10-10-v1-version-gate-a416.log)，SHA-256 `c3904adb0a9cdff6a5e2aaadaa17fb1c6ce5db260d02d4f4a8c53acb83b23937`。

2026-10-10 V1.3低现金拒绝回归修复：完整27场景E2E发现L05测试在MANUAL批准响应尚未完成时立即提交，偶发只触发`V13_PROPOSAL_NOT_EXECUTABLE`而未触及余额校验。测试现等待`APPROVED_MANUAL`并要求Portfolio错误`INSUFFICIENT_AVAILABLE_CASH`；Platform对下游422保留受控错误body。定向Playwright 1/1 TestRun `647d94c8-9087-4541-bfb8-100b510f66fb`通过；完整隔离E2E 27/27，低现金TestRun `58fcd1ca-fa9f-44d9-a5b3-2d3e0d00cb1f`；V1.3 code suite受控本机exit 0，66/66基线脚本/单测及服务隔离迁移、身份检查通过。随机资源清理通过，真实数据源/券商调用为0。[阶段§8.64](prd/v1-local-simulation/03-fake-broker-trading-loop.md#864-v13人工批准等待与低现金拒绝回归-2026-10-10)列明首次失败、诊断和通过证据。交叉索引保持147条要求全OPEN/PARTIAL分类不变：crosswalk SHA-256 `c0f5786259fcd9ccce19d9cd656fccaf81792d998654ca3a0fca5d12663d541f`，当前差异矩阵SHA-256 `5128e283d919529fcfa27b554651d4ddbf53eb5d71b7995c0759f90a1d8eb15d`，P0历史坐标对照SHA-256 `e9fede56f5c231911cad7502ae58eb1f8727a3446045e419f5564aec5f0c1a76`。自动套件通过不代表P3关闭或用户验收。

正式V1门禁a417（同步V1.3批准/低现金修复与追踪记录后）：五阶段文档审计PASS；本地证据引用审计PASS（1005引用、139份Manifest、278项）；版本仍`INCOMPLETE`/exit 2，`versionSummaryIncomplete=false`、`uncheckedVersionGate=true`。四个历史TestRun结构化导出、阶段交付/本人验收、待决政策/旧Run处置、活动数据恢复和Ubuntu实机仍未完成。[a417门禁日志](../evidence/audits/2026-10-10-v1-version-gate-a417.log)，SHA-256 `e27fe3905f315a1375712297a1becbc373bdb84e895d0e6ebdebbb840d4bbbf3`。
2026-10-10 V1 P3增量：Replay UNKNOWN原单查询已改为订单ID+持久Run namespace双重匹配；Replay身份不能再访问Platform通用订单详情，正确namespace/错误namespace分别返回200/404。Trade隔离HTTP+PostgreSQL集成套件exit 0，Replay单测26/26、Trade单测96/96，代码生成/合同/typecheck/build通过。阶段记录见[V1.4 §8.20](prd/v1-local-simulation/04-daily-backtest.md#820-v14-unknown原单读取按replay-namespace隔离2026-10-10)及[审计](../evidence/audits/2026-10-10-v14-replay-namespace-recovery-a01.md)。这只关闭一条读取路由子项；V1完整P3接受路径矩阵和版本门禁仍未通过。

2026-10-10 V1.4兼容回归与门禁a419：Replay UNKNOWN原单已按持久Run namespace限制读取；Trade完整隔离PostgreSQL/HTTP集成及`pnpm verify:stage -- --stage V1.4 --suite code`均exit 0。基线通过（文档7668链接无失效；需求交叉表147项、1572路径、159测试名；JSON/Schema/Fixture验证0失败；脚本测试66/66）。正式版本门禁a419仍INCOMPLETE/exit 2：五阶段文档审计PASS，证据审计PASS（1011引用、139份Manifest、278项），但`uncheckedVersionGate=true`；4个历史Run结构化导出、阶段工程/交付与人工验收、待决政策/旧Run处置、活动数据恢复和目标Ubuntu证据仍未满足。[a419日志](../evidence/audits/2026-10-10-v1-version-gate-a419.log)，[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a419.log.sha256)，[V1.4 Replay隔离审计](../evidence/audits/2026-10-10-v14-replay-namespace-recovery-a01.md)。

2026-10-10 V1.4 Replay lifecycle载荷拒绝及namespace兼容套件：`pause/resume/cancel/recover-unknown`拒绝客户端伪造status/result/orderId，四条均422且Run持久状态未变；Replay UNKNOWN原单按持久namespace读取，wrong namespace 404、Replay通用订单路由403。完整V1.4 code suite受控loopback重跑exit 0，包含baseline、构建/lint/typecheck/unit、隔离HTTP/数据库集成、migration ledger、规则对照及Artifact fencing；随机资源清理通过，活动服务NOT_CONNECTED。证据见[阶段§8.20](prd/v1-local-simulation/04-daily-backtest.md#820-v14-unknown原单读取按replay-namespace隔离2026-10-10)、[审计报告](../evidence/audits/2026-10-10-v14-replay-namespace-code-suite-a02.md)和[完整日志](../evidence/audits/2026-10-10-v14-replay-namespace-code-suite-a02.log)。V1总体门禁仍未通过。

正式V1门禁a420（V1.4 Replay lifecycle载荷拒绝、namespace约束和全量代码套件证据同步后）：五阶段文档审计PASS；证据审计PASS（1012引用、139份Manifest、278项）；版本仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。四份历史TestRun结构化导出缺失，五阶段工程/交付及新增范围本人验收未闭合，OD-013/014与旧Run处置、完整活动数据恢复及Ubuntu目标证据仍未满足。[a420日志](../evidence/audits/2026-10-10-v1-version-gate-a420.log)，[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a420.log.sha256)。

正式V1门禁当前复核a421：阶段文档审计PASS，证据审计PASS（1012引用、139份Manifest、278项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。四份历史Run导出、阶段交付/当前范围本人验收、未决政策与旧Run处置、完整活动数据恢复和目标Ubuntu证据未满足。见[a421完整日志](../evidence/audits/2026-10-10-v1-version-gate-a421.log)、[退出码](../evidence/audits/2026-10-10-v1-version-gate-a421.exit.txt)及[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a421.log.sha256)。

P0/A01 路由矩阵增量：将Replay `pause/resume/cancel/recover-unknown`空体要求、伪造事实422无副作用，以及Trade历史订单namespace双重读取/通用读路由403加入[A05跨服务矩阵](../evidence/audits/2026-10-09-v1-cross-service-route-matrix-a05.md)。当前V1.4完整代码套件exit 0支撑这些切片；源码全路由枚举、缺失路由负测和P3父项仍OPEN。

阶段交付记录同步：V1.4第2节和第7节分别新增Replay lifecycle/recovery伪造事实拒绝及Trade历史订单namespace隔离的已验证子项，均指向§8.20与A05路由矩阵；未勾选全阶段开发完成、恢复矩阵、人工验收或版本通过。

正式V1门禁a422（V1.4 §2/§7 Replay路由已验证子项及A05矩阵同步后）：五阶段文档审计PASS；证据审计PASS（1014引用、139份Manifest、278项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。历史Run导出、阶段完整工程/交付、未决政策/旧Run处置、活动恢复、Ubuntu及当前范围用户验收仍未满足。[a422日志](../evidence/audits/2026-10-10-v1-version-gate-a422.log)，[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a422.log.sha256)。

正式V1门禁当前复核a423：五阶段文档审计PASS，证据审计PASS（1019引用、140份Manifest、279项）；版本仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。历史TestRun导出、阶段剩余工程/交付、未决政策及旧Run处置、活动业务数据恢复、Ubuntu实机和当前范围人工验收仍未满足。[a423日志](../evidence/audits/2026-10-10-v1-version-gate-a423.log)，[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a423.log.sha256)。

正式V1门禁a424（版本主入口及阶段/验收状态同步后）：五阶段文档审计PASS，证据审计PASS（1023引用、141份Manifest、280项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。四个历史Run导出、五阶段剩余工程与交付、未决政策及旧Run处置、活动恢复、Ubuntu和当前范围人工验收仍未完成。[a424日志](../evidence/audits/2026-10-10-v1-version-gate-a424.log)，[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a424.log.sha256)。

A04/P1调用映射增量：根据生成客户端与生产调用源码核实V1.3 AUTO Mandate 7个OpenAPI操作分别由Platform（create/read/readBudget/activate/pause）与Trade（authorizeOrder/settleReservation）消费；V1.4回测报告Run/Artifact是Platform owner/TestRun/hash受控读取，不是跨服务client。现有隔离HTTP/PG、完整AUTO E2E/code suite及V1.4 report fencing证据已指入[A05](../evidence/audits/2026-10-09-v1-cross-service-route-matrix-a05.md)。只关闭两组调用映射子项，A04/P1全矩阵与P3接受路径仍OPEN。

正式V1门禁a425复核：五阶段文档审计PASS，证据审计PASS（1026引用、142份Manifest、281项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。历史导出、阶段交付/人工验收、未决决定/旧Run处置、活动恢复和Ubuntu实机仍开放。[a425日志](../evidence/audits/2026-10-10-v1-version-gate-a425.log)，[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a425.log.sha256)。
2026-10-10 P0交叉索引现状复核：`pnpm crosswalk:check` exit 0，147条需求/147个唯一ID、1572条路径引用/473个目标、159项精确测试名与147条来源锚点均无缺失或失配；[审计日志](../evidence/audits/2026-10-10-v1-crosswalk-check-a01.log)。这只验证追踪链接/名称/锚点，不证明需求语义或断言充分性；P0保持进行中。

2026-10-10 V1.3-S2-L13追踪增量：将Platform Mandate客户端两项契约测试和Trade授权/结算客户端测试、完整V1.3 code suite证据加入147项需求交叉表。更新后`pnpm crosswalk:check` exit 0，162项逐名测试引用全部精确匹配；SELL资金结算和更广授权规则仍开放。[a02日志](../evidence/audits/2026-10-10-v1-crosswalk-check-a02.log)。
2026-10-10 正式V1门禁a429：P0交叉索引计数和审计证据登记后复核，五阶段文档审计PASS、证据审计PASS（1033引用、144份Manifest、283项），但V1仍INCOMPLETE/exit 2。[a429日志](../evidence/audits/2026-10-10-v1-version-gate-a429.log)，[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a429.log.sha256)。
2026-10-10 V1.4 P3拒绝路径增量：真实三服务隔离HTTP/PG Harness新增错误Governance签发身份403且零授权行、篡改命令Hash 403且授权保持ACTIVE、无匹配授权的Trade执行403且无FakeBroker订单；之后合法请求仍成功。完整V1.4 code suite exit 0，日志[见此](../evidence/audits/2026-10-10-v14-paper-http-parity-code-suite-a06.log)，exit记录与SHA sidecar齐备；阶段§8.26已同步。此项只关闭固定授权/执行拒绝子路径，P3全路由矩阵与P4结算/OD-014、完整规则、阶段交付、Ubuntu和人工验收仍OPEN。
2026-10-10 P5/V1.5双Trade实例中断恢复增量：在FakeBroker提交订单/Fill后、HTTP响应返回前同时终止两个Trade实例1.5秒，再启动一个实例；Temporal重试按原`clientOrderId`读取原单。隔离Web/API/CLI/export E2E 3/3及完整V1.5 code suite exit 0，报告[JSON](../evidence/audits/2026-10-10-v15-trade-double-failure-sq-v15-e2e-e2b3577ef5b427c3b250.json)、[E2E日志](../evidence/audits/2026-10-10-v15-trade-double-failure-e2e-a02.log)、[代码套件](../evidence/audits/2026-10-10-v15-trade-double-failure-code-suite-a02.log)。普通沙箱loopback失败记录保留；受控重跑通过。外部来源/真实券商调用0，随机资源清理通过。此为固定故障切片，Mac睡眠/唤醒、多个故障组合、人工运行手册和V1.5/V1验收仍开放，详见[V1.5 §8.30](prd/v1-local-simulation/05-scheduling-and-recovery.md#830-trade双实例同时中断后的原单恢复2026-10-10)。
2026-10-10 V1门禁a466：五阶段文档审计PASS，证据审计PASS（1076引用、148份Manifest、287项、0失败），版本仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。正式Run证据审计确认V1.2 `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`及V1.5 `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`仍缺结构化导出；OD-013/OD-014及旧Run决定、全域配对恢复、Ubuntu目标环境、阶段剩余交付及新增范围人工验收仍开放。本轮V1.2/1.3/1.4共享合同完整代码兼容套件通过不代表阶段或版本关闭。[a466门禁日志](../evidence/audits/2026-10-10-v1-version-gate-a466.log)。
2026-10-10共享核心Schema当前树跨阶段兼容复验：V1.2完整code suite a02 exit 0（四个隔离Web/API/CLI TestRun、Qlib/PG集成和迁移/Artifact恢复）；V1.3完整code suite a01 exit 0（授权/模式边界与隔离服务迁移）；V1.4完整code suite a01 exit 0（Governance→Trade→Portfolio真实HTTP/独立PG、FakeBroker账本与回测发布检查）。V1.2普通沙箱首轮因固定HTTP测试无法监听127.0.0.1而失败，日志保留；受控本机重跑通过。三阶段手册分别补充§8.35、§8.66、§8.29，测试计划和总队列同步。该兼容复验不改变任一阶段或V1的验收状态。完整日志见[计划增量记录](plans/2026-10-08-v1-completion-plan.md)。

2026-10-10 正式V1门禁a482：五阶段文档审计PASS；证据审计PASS（1105引用、148份Manifest、287项），版本仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。V1.2历史Run `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`与V1.5历史Runs `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`仍缺结构化导出；OD-013/014与旧Run处置、Mac睡眠/唤醒演练、全域活动恢复、Ubuntu实机验证及当前范围用户验收仍未完成。未替代历史Run、未签署用户验收。[a482门禁日志](../evidence/audits/2026-10-10-v1-version-gate-a482.log)，SHA-256 `4655c2042d98b3cb79ac2a1816ba65d5158fd9382719ce8263d0ce705420b34e`。

2026-10-10 P1整版工程基线复验：`pnpm baseline:check`受控本机回环exit 0；文档链接8115/0失败、阶段编号5/0重复、Crosswalk 147项/147锚点且路径与测试引用无缺失、307 JSON/207 Schema/58 Fixture无错误、脚本测试66/66通过。普通沙箱运行a01两项仅监听127.0.0.1的seed-paper测试因EPERM失败（64/66），完整失败保留；受控同命令a02通过，日志[baseline a02](../evidence/audits/2026-10-10-v1-baseline-check-a02.log)，SHA-256 `bbb901637b716b0f4557b06abb0550ae00e878a52f57bee579a4fc334f3cc63e`。这是共享工程基线证据，不替代任何阶段业务E2E、手册执行、目标Ubuntu、历史TestRun导出或人验，也不关闭P1/P0。

正式V1门禁a483（整版工程基线证据同步后）：五阶段文档审计PASS、证据审计PASS（1106引用、148份Manifest、287项），版本仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。四个历史TestRun结构化导出、政策/旧Run决定、全域恢复、Mac睡眠/唤醒、Ubuntu及当前范围人工验收仍未完成。[a483门禁日志](../evidence/audits/2026-10-10-v1-version-gate-a483.log)，SHA-256 `8e8fe91b8aeadfc0607b2bad8a3c73f8b3cf924bbd937fb1b3f78bb048895eb2`。

正式V1门禁a484（修正进度证据链接并同步a483历史后）：五阶段文档审计PASS、证据审计PASS（1107引用、148份Manifest、287项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。a483中记录的四个历史Run导出、未决政策/旧Run处置、完整恢复、Mac睡眠/唤醒、Ubuntu与当前范围人工验收仍未完成。[a484日志](../evidence/audits/2026-10-10-v1-version-gate-a484.log)，SHA-256 `78f19d2fd0940def8d7ccf4634330277a8faf908f5939de49d717854a7d28854`。

2026-10-10 P0责任类型映射A29：从A28中人工分类第7节36条阶段交付、第90节13条跨服务测试验证、第99节25条版本门禁记录，共74条归为跨服务/版本责任，而不强行分配单一领域服务。仍有38条（主要第8节操作与运行要求）和第2节实现责任需要逐项核实；P0父项保持OPEN，分类不代表完成或验收。详见[A29差异矩阵](../evidence/audits/2026-10-10-v1-current-gap-matrix-a29.json)，SHA-256 `ec8affc228d74ccbb14392be7dc41a4b4c52c449ad0d4a38040da73978558d23`。

正式V1门禁a485（A29责任类型矩阵及Crosswalk复验同步后）：五阶段文档审计PASS、证据审计PASS（1108引用、148份Manifest、287项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。A29仅完成74条交付/测试/门禁记录的跨服务责任分类；剩余38条运行/实现责任、四个历史Run导出、决定与旧Run处置、全域恢复、环境实测和当前范围人工验收仍未满足。[a485日志](../evidence/audits/2026-10-10-v1-version-gate-a485.log)，SHA-256 `2a3c12e0967a80ffc9689d37a62be1149f9c8e4e4d793ba2b1b0fd331592a3be`。

2026-10-10 P0责任类型映射A30：对A29剩余38条未显式服务归属项逐条核对来源，确认均为五阶段第8节小节标题/运行验证记录，分类为命令、环境准备、Web/CLI操作、恢复手册、证据及验收记录责任；不是单一领域服务实现的直接归属。矩阵现0条未分类服务责任，但第2节服务候选的语义归属与第8节实际手册执行仍开放，P0继续OPEN。[A30矩阵](../evidence/audits/2026-10-10-v1-current-gap-matrix-a30.json)，SHA-256 `075fb3764796200af485faedba630122ec9b086b9f5bd164eb811569a2f97252`。

正式V1门禁a486（A30将38条第8节执行记录分类后）：五阶段文档审计PASS、证据审计PASS（1109引用、148份Manifest、287项），版本仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。A30只补责任类型分类，不代表手册执行、服务语义映射或验收完成；四个历史Run导出、业务/旧Run决定、全域恢复、Mac睡眠/唤醒、Ubuntu及当前范围人工验收继续开放。[a486日志](../evidence/audits/2026-10-10-v1-version-gate-a486.log)，SHA-256 `74ee14ad8cfde06939fc8dd881c9464b4470790a2c24c089f5ea613a9b4a439e`。

2026-10-10 V1版本状态摘要纠偏：核对当前阶段第8节与最新隔离证据后，更新`00-version-plan.md`五阶段状态摘要，替换V1.3过期的22/22为当前27/27，并补录V1.1双架构探针、V1.2最新PG恢复兼容、V1.4现存边界及V1.5 Trade+PostgreSQL组合恢复；过往运行/失败与签署仍保留在阶段第8节和原始日志。阶段均保持PARTIALLY_IMPLEMENTED，不因摘要更新推断验收通过。

正式V1门禁a489（版本计划五阶段摘要更新与表格修正后）：五阶段文档审计PASS、证据审计PASS（1110引用、148份Manifest、287项），版本仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。V1.1–V1.5均保持PARTIALLY_IMPLEMENTED；历史TestRun导出、待决决定/旧Run处置、完整恢复、Mac睡眠/唤醒、Ubuntu及当前范围用户验收未完成。[a489日志](../evidence/audits/2026-10-10-v1-version-gate-a489.log)，SHA-256 `9c6741d8483fab053537cdc74dd1c5f02b80967d8b1f38b9b6a54bef33021c51`。

2026-10-10 P4/V1.4当前树兼容回归：因共享Platform/Governance/Trade/Portfolio实现近期变化，重跑完整V1.4 code suite，受控exit 0；隔离HTTP/PG交易与独立账本对照、Market Data迁移/集成、报告发布fencing及资源清理均通过。阶段§8.30、90-test-plan与V1.4状态摘要已同步。只确认当前树代码兼容和固定场景，不关闭OD-014、全规则/结算、Ubuntu、人验或P4父项。日志[见此](../evidence/audits/2026-10-10-v14-current-tree-code-suite-a01.log)，SHA-256 `c2f03a99fa118c749937568f2886b501e8da713097fbdfc6ad194f80eb0196c2`。

正式V1门禁a491（V1.4当前树完整code suite记录同步后）：五阶段文档审计PASS、证据审计PASS（1114引用、148份Manifest、287项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。本次V1.4 code suite只加强当前代码兼容证据，不关闭P4完整规则/结算、OD-014、Ubuntu、人验或历史Run导出。[a491日志](../evidence/audits/2026-10-10-v1-version-gate-a491.log)，SHA-256 `55e33fd13b95adb18cd2aeb6e7c2478b31df7f033afee71ba9f21d4fe4dc1e30`。

正式V1门禁a492（修正V1.4状态摘要并同步a491结果后复核）：五阶段文档审计PASS、证据审计PASS（1117引用、148份Manifest、287项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。阶段代码/固定切片通过不替代规则结算、历史导出、环境实测及人工验收；未新增签署。[a492日志](../evidence/audits/2026-10-10-v1-version-gate-a492.log)，SHA-256 `4343ed66a7410fe1b212ebeb8fff9684507d1d1d5227d8f9dc496ea94e1c4990`。

2026-10-10 P0/V1.3交易核心责任映射A31：人工按Architecture与阶段要求核实V1.3-S2-L13～L17：L13治理/Portfolio为主责、Trade与Platform协作；L14 Trade拥有FakeBroker订单/成交契约；L15 Trade拥有状态/Fill，Governance预算与Portfolio账本按域持有；L16 Platform编排固定场景、Trade注入FakeBroker故障；L17由Platform/Governance/Portfolio/Trade分别在服务端接受路径执行PAPER/FAKE限制。映射不证明测试/需求完成，剩余缺口保留。详见[A31矩阵](../evidence/audits/2026-10-10-v1-current-gap-matrix-a31.json)，SHA-256 `c4bd36b46c40fd5b30b59896bd1d7974e71425f1ccdef52c0a03a89a2d8081ee`。

正式V1门禁a493（P0 A31服务责任映射及当前Crosswalk复核后）：五阶段文档审计PASS、证据审计PASS（1118引用、148份Manifest、287项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。A31只明确V1.3-L13～L17责任分工，不证明功能、测试充分性或接受通过；历史导出、OD/旧Run处置、活动/全域恢复、Ubuntu和用户当前范围人验仍开放。[a493日志](../evidence/audits/2026-10-10-v1-version-gate-a493.log)，SHA-256 `7a097acbfcbfa9eed43bdc0e5c24393104bfcf9904decce17eb9f68ced5005ef`。

2026-10-10 P1/V1.1当前树完整code suite兼容复验：因共享存储、Platform与认证相关实现近期变化，重跑`pnpm verify:stage -- --stage V1.1 --suite code`，受控exit 0；脚本66/66、隔离迁移/持久化、服务身份与模式边界检查通过，活动服务未连接且临时容器/网络清理确认。V1.1 §8.26、90-test-plan和00-version-plan已同步；只关闭当前工程兼容复验子项，不关闭活动API切换/回退、旧RUNNING/WAITING记录处置、完整发布矩阵、Ubuntu、人验或P1父项。日志[见此](../evidence/audits/2026-10-10-v11-current-tree-code-suite-a01.log)，SHA-256 `5df1d49e48b8adf73bce5eee1d4df1060b954bdf6c5cc05884780de4f1583602`。

正式V1门禁a494（V1.1当前树code suite记录同步后）：五阶段文档审计PASS、证据审计PASS（1232引用、148份Manifest、287项），V1仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。V1.1工程兼容代码复验通过不改变活动API切换/回退、旧Run处置、目标Ubuntu或当前范围人工验收的未完成状态；四个历史TestRun导出和OD/恢复缺口仍开放。[a494日志](../evidence/audits/2026-10-10-v1-version-gate-a494.log)，SHA-256 `43a0e23a1eb2692b84f53e7f7372d5925533fa71cffae57981b7259f29f48470`。


2026-10-10 V1.3当前树兼容复验：隔离Web/API/CLI E2E 27/27通过，同Run CLI核对与结构化导出通过，真实来源/券商调用0且随机容器/卷/网络精确清理。已同步V1.3 §8.67、测试计划与版本摘要；仅增强固定场景当前树证据，V1继续未完成。详见[执行计划记录](plans/2026-10-08-v1-completion-plan.md)及[原始日志](../evidence/audits/2026-10-10-v13-current-tree-web-api-cli-e2e-a01.log)。


正式V1门禁a495（V1.3当前树Web/API/CLI E2E记录同步后）：五阶段文档审计PASS、证据审计PASS（1235引用、148份Manifest、287项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。V1.3固定场景当前树27/27通过仅更新工程证据；四个历史TestRun结构化导出缺失、OD/旧Run与活动数据处置决定、完整跨域恢复、Mac睡眠/唤醒、目标Ubuntu及当前范围用户验收仍未完成。[a495日志](../evidence/audits/2026-10-10-v1-version-gate-a495.log)，SHA-256 `29f33cd25b0828fbc542565d70cc6eec03695ee13510ccb19b56e3b5cfcdf51a`。


2026-10-10 V1.5睡眠/唤醒演练已完成隔离栈与NO_TRADE Run前置准备，但Mac锁屏期间无法执行真实睡眠/唤醒；TestRun `1f9b8fd0-9a51-45eb-803d-b613bbd8d126`完成120观察，HOLD PASS、无订单/Fill/预留；check-only exit 2（全调度仍WAITING），stage导出exit 0。随机栈仍保留等待操作者解锁和继续，未改变V1.5/V1结论。详见[§8.25](prd/v1-local-simulation/05-scheduling-and-recovery.md)和[前置证据](../evidence/audits/v15-mac-sleep-wake-sq-v15-stack-bd6742505479a4cd8f94/attempts.md)。

正式V1门禁a496（同步V1.5睡眠/唤醒前置运行证据及§8.25导出命令修正后）：五阶段文档审计PASS、证据审计PASS（1239引用、149份Manifest、288项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。前置NO_TRADE Run和导出已留证，但Mac锁屏期间未发生睡眠/唤醒，P5及用户验收仍未关闭；四个历史TestRun导出、OD/旧Run决定、活动/全域恢复和Ubuntu实机同样未满足。[a496门禁日志](../evidence/audits/2026-10-10-v1-version-gate-a496.log)，SHA-256 `0d1279c86b956bb6ab22673e32d3bf36772360240daf38f37dc265b5bc492e11`。


正式V1门禁a497（补齐V1.5手册的本地API地址、隐藏session cookie输入及显式stage导出参数后）：五阶段文档审计PASS、证据审计PASS（1240引用、149份Manifest、288项），V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。锁屏阻止真实睡眠/唤醒；隔离栈和前置Run保持运行，等待解锁继续。[a497门禁日志](../evidence/audits/2026-10-10-v1-version-gate-a497.log)，SHA-256 `5f9cefd671ea6cec7f7aa9aa1373b093164e33a412bd942c671044a4db328250`。


2026-10-10 P0 V1.1责任映射：A31中V1.1第2/7/8节23条当前来源行已人工核对服务主责/协作/运维/人工责任，结果在[A01审计](../evidence/audits/2026-10-10-v1-v11-responsibility-a01.md)及[JSON](../evidence/audits/2026-10-10-v1-v11-responsibility-a01.json)。只关闭责任分类子项；P0全版差异核对、P1部署/Artifact、阶段工程与当前范围人工验收仍开放。睡眠/唤醒隔离栈仍运行；Mac锁屏未解除，未执行实际唤醒观察。


正式V1门禁a498（V1.1责任映射A01及阶段计划同步后）：五阶段文档审计PASS，证据审计PASS（1242引用、149份Manifest、288项）；V1仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。本轮只关闭23条V1.1来源行的责任分类，未关闭对应实现/交付、活动存储切换、P0全版矩阵或人工验收。[a498日志](../evidence/audits/2026-10-10-v1-version-gate-a498.log)，SHA-256 `e377fc67dcc2b603f24f3f0c91f70d2eab82d0b9fbc910299f346713745eca1d`。


2026-10-10 P0 V1.2责任映射：A31内25条V1.2第2/7/8节来源行已人工核对主责/协作/外部责任，见[审计](../evidence/audits/2026-10-10-v1-v12-responsibility-a01.md)及[JSON](../evidence/audits/2026-10-10-v1-v12-responsibility-a01.json)。只完成责任分类子项，不改变V1.2阶段或V1验收状态；OD-013、历史Run、Ubuntu、人验与全版差异审计仍开放。


正式V1门禁a499（V1.2责任映射A01及阶段/计划记录同步后）：五阶段文档审计PASS，证据审计PASS（1245引用、149份Manifest、288项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。V1.2责任归属已清晰化，但P0全版差异、OD-013/历史Run/恢复/Ubuntu及人验仍未完成。[a499日志](../evidence/audits/2026-10-10-v1-version-gate-a499.log)，SHA-256 `fb085de49cfb5b29b23f571be60769f48fcd8880b6ce351ab3c4dc00d460b314`。


2026-10-10 P0 V1.4责任映射：六项V1.4第2节回测规则要求已按Quant ownership人工厘清服务主责及与Platform/Trade/Portfolio边界，详见[审计](../evidence/audits/2026-10-10-v1-v14-responsibility-a01.md)和[JSON](../evidence/audits/2026-10-10-v1-v14-responsibility-a01.json)。OD-014、完整规则/结算、当前人验仍未满足；P0全版矩阵继续OPEN。


正式V1门禁a500（V1.4责任映射A01及阶段/计划链接同步后）：五阶段文档审计PASS，证据审计PASS（1248引用、149份Manifest、288项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。本轮仅明确Quant回测与Paper账本的责任边界，不关闭OD-014、规则/结算、历史Run、环境或当前范围人验。[a500日志](../evidence/audits/2026-10-10-v1-version-gate-a500.log)，SHA-256 `b4de366ad163c4cda63a2c7f7468233cf77316417711c6d80d8d4abe3d3739c5`。


2026-10-10 P0 V1.5责任映射：A31内20条V1.5要求的服务主责、协作和外部责任已人工核对，记录见[审计](../evidence/audits/2026-10-10-v1-v15-responsibility-a01.md)及[JSON](../evidence/audits/2026-10-10-v1-v15-responsibility-a01.json)。Mac仍锁屏，隔离睡眠/唤醒演练继续NOT_RUN；该映射不关闭P5或人工/环境验收。


正式V1门禁a501（V1.5责任映射A01同步后）：五阶段文档审计PASS，证据审计PASS（1251引用、149份Manifest、288项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。V1.5责任已分类但睡眠/唤醒、全域恢复、Ubuntu和用户验收未完成；OD-013/014、历史Run等仍OPEN。[a501日志](../evidence/audits/2026-10-10-v1-version-gate-a501.log)，SHA-256 `8d2b90096ebdc8bf5c6c37c95180743aba98552af4efe86f95fdaf6df8a28eb4`。

2026-10-10 P0 V1.3责任映射：A31中V1.3第2/7/8节20条当前来源要求已人工厘清主责及协作方，详见[审计](../evidence/audits/2026-10-10-v1-v13-responsibility-a02.md)及[JSON](../evidence/audits/2026-10-10-v1-v13-responsibility-a02.json)。该项只完成责任分类，不改变V1.3交付/验收状态；全市场规则、完整恢复、Ubuntu、OD-014和本轮人验仍开放。

正式V1门禁a502（V1.3责任映射A02同步后）：五阶段文档审计PASS，证据审计PASS（1255引用、149份Manifest、288项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。V1.3 20条责任映射完成，但历史Run导出、OD-013/014、旧Run决策、活动TestRun切换/回退、全V1恢复、Mac睡眠/唤醒、Ubuntu及当前范围人工验收仍未闭合。[a502日志](../evidence/audits/2026-10-10-v1-version-gate-a502.log)，SHA-256见sidecar。

2026-10-10 P0 V1.4责任映射补齐：将此前只覆盖第2节6条的A01扩充为第2/7/8节20条完整主责/协作映射，见[审计A02](../evidence/audits/2026-10-10-v1-v14-responsibility-a02.md)及[JSON](../evidence/audits/2026-10-10-v1-v14-responsibility-a02.json)。只完成职责分类，不代表规则一致性、结算、阶段交付或验收通过。

正式V1门禁a503（V1.4责任映射补齐后）：五阶段文档审计PASS，证据审计PASS（1258引用、149份Manifest、288项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。历史Run来源本地不可用；OD-013/014与旧Run处置、活动切换/回退、全V1恢复、Mac锁定中的睡眠/唤醒、Ubuntu实机及用户当前范围签署仍未满足。[a503日志](../evidence/audits/2026-10-10-v1-version-gate-a503.log)，SHA-256见sidecar。

2026-10-10 P4/V1.4公司行动边界测试：补充冲突`actionId`、零碎股拆分、冻结日历外派息日期三种fail-closed单测；Quant定向TypeScript测试18/18、typecheck通过。随后受控重跑完整V1.4 code suite exit 0（Quant 101/101、Python Worker 14/14）；普通沙箱首轮因loopback EPERM失败保留为环境限制。完整日志见[V1.4 code suite](../evidence/audits/2026-10-10-v14-corporate-action-code-suite-a01.log)。公司行动完整规则与OD-014仍OPEN。证据见[V1.4 §8.31](prd/v1-local-simulation/04-daily-backtest.md#831-corporate-action冲突无效输入拒绝测试2026-10-10)及[日志](../evidence/audits/2026-10-10-v14-corporate-action-rejection-tests-a01.log)。P4公司行动完整覆盖/OD-014/版本验收仍OPEN。

2026-10-10 P0文档与责任矩阵收敛：发现`docs/prd/v1-local-simulation/90-test-plan.md`误含一份重复V1.1阶段文件；V1.1最新兼容证据及V1.3当前树E2E已在各自正式阶段文档中保留，故恢复共享90测试计划的既有内容，并刷新跨索引来源锚点。当前`pnpm crosswalk:check` PASS：147/147唯一要求、1644路径引用/537目标、168精确测试名、147个当前锚点，0缺失/失配/过期。A31的147条要求责任分类覆盖已汇总为[责任覆盖A01](../evidence/audits/2026-10-10-v1-responsibility-coverage-a01.md)，0条未分类。P0仍OPEN，因为测试充分性、Fixture覆盖与发布兼容语义尚待逐项审查；责任分类不等于需求完成。机器报告：[crosswalk a24](../evidence/audits/2026-10-10-v1-crosswalk-check-a24.json)。

正式V1门禁a504（P0责任覆盖/共享测试计划整理、V1.4公司行动拒绝边界测试同步后）：五阶段文档审计PASS，证据审计PASS（1131引用、150份Manifest、289项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。门禁仍要求四个历史Run原始导出、OD-013/014与旧Run决策、活动存储切换/回退及全域恢复、Mac睡眠唤醒、Ubuntu实机和当前范围人工签署；P1-P5工程项仍未全关。[a504日志](../evidence/audits/2026-10-10-v1-version-gate-a504.log)，SHA-256见sidecar。

正式V1门禁a505（V1.4当前树完整code suite、责任映射与文档链接核验后）：五阶段文档审计PASS，证据审计PASS（1133引用、150份Manifest、289项）；V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。历史TestRun导出、OD-013/014及旧Run处置、活动存储切换/回退、完整V1恢复、Mac睡眠唤醒、Ubuntu实机与用户签署仍待完成。[a505日志](../evidence/audits/2026-10-10-v1-version-gate-a505.log)，SHA-256见sidecar。


2026-10-10 P5/V1.5 NATS健康探针核正：只读检查发现活跃隔离栈NATS 2.10.29的`/healthz`可用，但Compose的`nats-server --signal check`持续报`unknown signal`并误报unhealthy。声明式探针已改为容器内wget检查`/healthz?js-enabled-only=true`，确认当前JetStream readiness端点exit 0且Compose配置通过；未重启/重建当前V1.5栈，其容器仍实际显示unhealthy；唯一命名隔离项目的新容器应用该探针后healthy/fail streak 0，并已精确清理自己的资源。[诊断a01](../evidence/audits/2026-10-10-v15-nats-healthcheck-fix-a01.log)、[readiness a02](../evidence/audits/2026-10-10-v15-nats-healthcheck-fix-a02.log)、[运行验证a03](../evidence/audits/2026-10-10-v15-nats-healthcheck-fix-a03.log)，SHA-256见sidecar。

正式V1门禁a506（V1.5 NATS健康探针诊断及配置修正、阶段记录同步后）：阶段文档审计PASS、证据审计PASS（1135引用、150份Manifest、289项）；V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。历史Run导出、OD-013/014与旧Run决策、活动存储与配对恢复、Mac睡眠/唤醒、Ubuntu实机和人验仍未满足；当前NATS容器尚未重建应用新健康探针。[a506日志](../evidence/audits/2026-10-10-v1-version-gate-a506.log)，SHA-256见sidecar。

正式V1门禁a507（V1.5 NATS JetStream健康探针诊断和声明式修正后）：五阶段文档审计PASS，证据引用审计PASS（1136引用、150份Manifest、289项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。活动容器仍运行旧探针、状态unhealthy，需在受控维护窗口重建验证；四个历史Run导出、政策/旧Run决策、全域恢复、Mac睡眠唤醒、Ubuntu和人验仍未关闭。[a507日志](../evidence/audits/2026-10-10-v1-version-gate-a507.log)，SHA-256见sidecar。

正式V1门禁a508（V1.5 JetStream readiness探针a02核验及阶段记录更新后）：五阶段文档审计PASS，证据审计PASS（1138引用、150份Manifest、289项），版本仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。活动NATS栈保留原容器，探针声明未应用；缺失历史导出、决策、恢复、目标环境与人验仍未闭合。[a508日志](../evidence/audits/2026-10-10-v1-version-gate-a508.log)，SHA-256见sidecar。

正式V1门禁a509（V1.5 NATS JetStream探针隔离容器healthy运行验证后）：五阶段文档审计PASS，证据审计PASS（1141引用、150份Manifest、289项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。该修正已在新隔离容器验证，不表示现有运行栈已应用；原栈保留，历史Run、政策决定、Mac/Ubuntu、人验等仍未关闭。[a509日志](../evidence/audits/2026-10-10-v1-version-gate-a509.log)，SHA-256见sidecar。

2026-10-10 P0/V1.1-S8-L96追踪校正：复核发现历史交叉索引仍将当前已执行的V1.1隔离栈启动/关闭写成“目标命令待实现”。按阶段§8.2及生命周期a02报告，修正当前索引原文/状态/证据，单项改为PASS；P0矩阵A32仍为派生草稿（147条），明确Ubuntu主机发布/人验仍分别OPEN。`pnpm crosswalk:check` PASS：147条、1648引用/541目标、168精确测试名、147锚点，0缺失/失配/过期。[矩阵A32](../evidence/audits/2026-10-10-v1-current-gap-matrix-a32.json)、[Crosswalk a26](../evidence/audits/2026-10-10-v1-crosswalk-check-a26.json)。

正式V1门禁a510（V1.1-S8-L96本地隔离启动手册状态校正及A32/a26记录后）：五阶段文档审计PASS，证据审计PASS（1141引用、150份Manifest、289项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。此轮只关闭本地操作手册追踪子项；Ubuntu发布/人验、活动存储迁移、四个历史Run导出、OD-013/014、完整恢复及其他阶段交付继续开放。[a510日志](../evidence/audits/2026-10-10-v1-version-gate-a510.log)，SHA-256见sidecar。


2026-10-10 V1.5用户验收入口只读刷新：现存随机隔离项目`sq-v15-stack-bd6742505479a4cd8f94`保持运行，Web `http://127.0.0.1:60898/acceptance/v1/v1.5`和API `/live`均200；6个应用容器（含Web）及PostgreSQL healthy，Temporal运行；NATS运行但旧Compose探针仍报unhealthy。无TestRun/交易副作用、无服务重启/栈清理。供Mac解锁后用户检查，但不代替场景验收；报告[见此](../evidence/audits/2026-10-10-v15-interactive-stack-current-snapshot-a01.json)，SHA-256见sidecar。

正式V1门禁a511（V1.5当前交互栈入口只读刷新后）：阶段文档/证据审计PASS（1143引用、150份Manifest、289项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。当前Web入口可访问但未进行用户场景验收；NATS容器健康探针仍需后续维护窗口应用。历史Run、未决政策、活动存储、全域恢复、Mac/Ubuntu与人工签署继续未完成。[a511日志](../evidence/audits/2026-10-10-v1-version-gate-a511.log)，SHA-256见sidecar。


2026-10-10 P0交付手册追踪复核：V1.1 §8.4、V1.5 §8.2/§8.4 的当前手册状态与已执行隔离证据重新对齐；`pnpm crosswalk:check` PASS（147项、1654路径引用/544目标、168精确测试名、147锚点，0缺失/失配/过期）。状态PASS仅代表指定本地手册子项执行，不改变业务、阶段、环境或用户验收。正式门禁a512仍INCOMPLETE/exit 2：证据链接审计PASS（1143引用、150份Manifest、289项），4个历史TestRun结构化导出缺失；OD决策/旧Run处置、活动数据及跨域恢复、Mac睡眠唤醒、Ubuntu实机和当前范围用户签收仍未完成。[a512日志](../evidence/audits/2026-10-10-v1-version-gate-a512.log)，SHA-256 `ee808eaa4ef305904ca8669aad39bac8125d676f655702b6fa4ae947e33b3966`；[机器交叉索引](../evidence/audits/2026-10-09-v1-requirement-test-crosswalk.json)，[差异矩阵A33](../evidence/audits/2026-10-10-v1-current-gap-matrix-a33.json)。


2026-10-10 P5/V1.5当前树代码回归：受控运行`pnpm verify:stage -- --stage V1.5 --suite code` exit 0；含baseline、契约/Fixture、10个workspace build/lint/typecheck/unit、隔离PG/HTTP集成、4服务migration CLI、Trade恢复集成与linux/arm64容器边界。隔离资源清理确认，活动服务`NOT_CONNECTED`。日志[代码套件a01](../evidence/audits/2026-10-10-v15-current-tree-code-suite-a01.log)，SHA-256 `9d14f8caaff1a3f542c1780a757f13ab364353c142c276ecf4668790aed57257`；V1.5 §8.34已同步。V1.5业务、睡眠/唤醒、NATS当前栈应用、V1.1–V1.4真实数据恢复、Ubuntu、人验等仍未满足。


2026-10-10正式V1门禁a514（V1.5当前树代码套件a01及阶段§8.34同步后）：阶段文档审计PASS、证据审计PASS（1147引用、151份Manifest、290项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。V1.5完整code suite受控exit 0，仅关闭当前树工程回归子项；4个历史TestRun结构化导出、开放决策与旧Run处置、活动数据/全域恢复、Mac睡眠唤醒、Ubuntu实机及当前范围本人验收继续未满足。[a514日志](../evidence/audits/2026-10-10-v1-version-gate-a514.log)，SHA-256 `62550d46a9ab190444185318999c8b63e9a05325d1186a74b7a8976f9e221957`。


2026-10-10 P5/V1.5完整隔离栈探针复验：新随机栈启动至READY，NATS容器健康`healthy`/failingStreak 0，JetStream readiness探针exit 0；Web/API在loopback可用，模式PAPER/FAKE、LIVE关闭。按精确项目名执行stack:down，容器/专属卷/网络/镜像/凭据均清理，Docker inventory确认无残留，之前保留的栈未触碰。完整记录[V1.5栈健康a02](../evidence/audits/2026-10-10-v15-interactive-stack-nats-health-a02.json)，SHA-256 `7a1e2c192071c6a126539f4c488e9e5bc75cb07deefc97b78d01804f7929f4ff`，详见[V1.5 §8.35](prd/v1-local-simulation/05-scheduling-and-recovery.md#835-修正nats探针的完整隔离交互栈实测2026-10-10)。保留栈未应用修正；Mac锁屏、睡眠唤醒及人工验收仍NOT_RUN。


正式V1门禁a515（V1.5当前树代码套件及完整隔离栈NATS健康复验入档后）：五阶段文档审计PASS，证据审计PASS（1150引用、152份Manifest、291项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。V1.5完整code suite与新隔离栈启动/健康/清理子项通过；4个历史TestRun结构化导出、OD-013/014及旧Run处置、活动数据/全域恢复、Mac睡眠唤醒、Ubuntu实机及当前范围本人验收仍未满足。[a515日志](../evidence/audits/2026-10-10-v1-version-gate-a515.log)，SHA-256 `7aa9e459654dc9b7a578cada7af713cf085b7e151008a6e66d1178127cb91267`。


正式V1门禁a516（V1.5完整隔离栈探针证据及00/99当前摘要同步后）：五阶段文档审计PASS，证据审计PASS（1158引用、153份Manifest、292项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。V1.5当前树完整code suite及新栈NATS健康/清理通过；4个历史TestRun导出、OD-013/014与旧Run决定、活动/全域恢复、Mac睡眠唤醒、Ubuntu实机和当前范围本人验收继续开放。[a516日志](../evidence/audits/2026-10-10-v1-version-gate-a516.log)，SHA-256 `a80f97cdca3f21a494609f2a00ac8adaf4c7917cb08d76b9fa69727931279a44`。


2026-10-10 V1.5保留栈只读复核：原9容器项目仍运行，Web/API HTTP 200；NATS仍使用旧探针，Docker状态`unhealthy`/failingStreak 2394。没有重启或更改该栈；新隔离项目采用修正探针并健康通过。快照[A02](../evidence/audits/2026-10-10-v15-interactive-stack-current-snapshot-a02.json)，SHA-256 `6655cb49fd0fce1a2655ae21fec804fdd3294c6f30382a540dbb74652d0e0f0b`，详见[V1.5 §8.36](prd/v1-local-simulation/05-scheduling-and-recovery.md#836-保留交互栈当前健康状态只读复核2026-10-10)。


正式V1门禁a517（V1.5保留交互栈只读快照及阶段记录同步后）：阶段文档审计PASS、证据审计PASS（1161引用、154份Manifest、293项），V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。新隔离栈NATS修正探针健康，但保留栈仍旧探针unhealthy且未更改；历史TestRun导出、待决决策/旧Run处置、活动和全域恢复、睡眠唤醒、Ubuntu与本人验收继续OPEN。[a517日志](../evidence/audits/2026-10-10-v1-version-gate-a517.log)，SHA-256 `0fe88eb5a18d3e40afb9f4fa49fbec051eac663c2f1bb27edf2f5860eb7d1c0c`。


2026-10-10 V1.5保留栈只读运行保护：Platform DB聚合查询发现V1.5有1个`WAITING` TestRun。未输出Run ID、未写数据；因此暂不重启NATS或更改栈，保护其工作流及持久卷。证据[A03](../evidence/audits/2026-10-10-v15-interactive-stack-current-snapshot-a03.json)，SHA-256 `e06965bce2ae7686611364ffd8fec6660fccda08d8e1f090a58a461890cc8574`；见[V1.5 §8.37](prd/v1-local-simulation/05-scheduling-and-recovery.md#837-保留交互栈waiting运行保护2026-10-10)。需等待终态或维护负责人批准后再处理保留栈探针。


2026-10-10当前正式门禁a519：V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`；五阶段文档审计PASS，证据审计PASS（1164引用、155份Manifest、294项）。V1.5当前树代码套件及新隔离栈NATS探针健康通过；保留交互栈仍有1个WAITING TestRun，旧NATS探针`unhealthy`，为保护在途Run暂不重启。4个历史Run导出、OD-013/OD-014/旧Run处置、活动/全域恢复、Mac睡眠唤醒、Ubuntu实机和用户验收仍未满足。[a519门禁](../evidence/audits/2026-10-10-v1-version-gate-a519.log)，SHA-256 `91b0f7a83e5255594653095e8d184fcde1481c354c06686612e10767c5eb9a27`。


正式V1门禁a520（更新当前版本摘要并同步WAITING运行保护后）：五阶段文档审计PASS、证据审计PASS（1159引用、154份Manifest、293项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。保留栈1个WAITING Run导致NATS修正暂不应用；新隔离栈健康和清理通过。历史导出、决策、数据恢复、宿主/Ubuntu和本人验收仍未满足。[a520日志](../evidence/audits/2026-10-10-v1-version-gate-a520.log)，SHA-256 `3d680980588cd4a21f069906568bdaea04fb9b1572d8468b4237bbfe72598956`。


V1.5保留栈WAITING详情只读确认：唯一运行属于normal，created 2026-10-10 04:13:37 UTC、completed_at为空、2条断言；未读Run ID/载荷且未写数据库，因此仍不重启NATS。证据[A04](../evidence/audits/2026-10-10-v15-interactive-stack-current-snapshot-a04.json)，SHA-256 `9464cdf18e29dbb9f4978cb68d7185704bfddf278db1266f104d294209514936`，详见[V1.5 §8.38](prd/v1-local-simulation/05-scheduling-and-recovery.md#838-waiting运行详情只读复核2026-10-10)。


正式V1门禁a521（WAITING normal TestRun只读详情入档后）：五阶段文档审计PASS、证据审计PASS（1162引用、155份Manifest、294项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。保留栈唯一normal运行仍WAITING（2断言、无完成时间），故NATS暂不重启；新隔离栈探针测试PASS。历史TestRun导出、待决决定、活动/全域恢复、Mac/Ubuntu及人工验收仍OPEN。[a521日志](../evidence/audits/2026-10-10-v1-version-gate-a521.log)，SHA-256 `534397be0ce9f1f135a4cf841d092ae8d6ea0f01f1f5d592194384403a638786`。


2026-10-10 V1.5保留栈NATS探针修复：仅对精确隔离项目重建NATS容器、保留JetStream卷；新健康探针healthy/failingStreak 0，1条已确认消息和consumer状态保持、pending/ack-pending 0，Temporal运行Workflow 0，Web/API仍200；WAITING normal Run未被修改。前置[A05](../evidence/audits/2026-10-10-v15-interactive-stack-nats-restart-preflight-a05.json)、修复后[A06](../evidence/audits/2026-10-10-v15-interactive-stack-nats-probe-repair-a06.json)，SHA-256 `3f5b311cd64d25e107a3f60a27cf7e7f8539036f23853dc13e85aaaf80c7a054`；详见[V1.5 §8.39](prd/v1-local-simulation/05-scheduling-and-recovery.md#839-保留v15栈应用nats探针修正并复验持久状态2026-10-10)。


正式V1门禁a522（保留栈NATS探针修复及阶段§8.39入档后）：五阶段文档审计PASS、证据审计PASS（1165引用、155份Manifest、294项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。保留栈NATS已健康且JetStream消息/consumer持久状态、WAITING Run和Web/API复验保持；历史导出、结算/Artifact决策、活动与全域恢复、Mac/Ubuntu实机及本人验收仍未满足。[a522日志](../evidence/audits/2026-10-10-v1-version-gate-a522.log)，SHA-256 `c17aeee2961e7d62b467e8f32b8a250a3c2cfe3b7b58477662c15e6aadb8429b`。


正式V1门禁a523（a522摘要同步后）：五阶段文档审计PASS，证据审计PASS（1163引用、155份Manifest、294项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。a06证明保留V1.5 NATS探针已应用、JetStream持久状态与TestRun未变；4个历史Run结构化导出、OD-013/014/旧Run决定、活动/全域恢复、Mac/Ubuntu实机和本人验收未满足。[a523日志](../evidence/audits/2026-10-10-v1-version-gate-a523.log)，SHA-256 `4cba7a95fb59a0ecaeaa8c94a2b00478a811fd47486cd107fd95ec3c63baa029`。


2026-10-10 P0/A34交叉索引复核：V1.5-S8-L87保留栈NATS探针的当前结论更新为已在原栈应用并复验持久状态；同步修订V1.5-S2-L20与S7-L63锚点。Crosswalk PASS：147要求唯一、1657路径引用/547目标、168精确测试名、147个当前锚点，缺失/失配/过期均0。[Crosswalk a27日志](../evidence/audits/2026-10-10-v1-crosswalk-check-a27.log)，SHA-256 `e0f933dc2546757cdf45f301734a0bce150de5d24e2a0cf262b64f71a93a2071`；[差异矩阵A34](../evidence/audits/2026-10-10-v1-current-gap-matrix-a34.json)，SHA-256 `c1e14cc34737f46408d8bb09982d6ef56ed8a95b8eed7a05d435d153a33a9d61`。该审计仅验证追踪结构，不代表WAITING schedule断言或人工验收通过。


正式V1门禁a524（A06保留栈探针修复、A34/A27追踪同步后）：五阶段文档与证据审计均PASS（1164引用、155份Manifest、294项），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`。NATS已在保留栈应用并验证healthy；4个历史Run导出、待决决策/旧Run处置、活动与全域恢复、Mac睡眠唤醒、Ubuntu和本人验收仍未满足。[a524日志](../evidence/audits/2026-10-10-v1-version-gate-a524.log)，SHA-256 `91b0f7a83e5255594653095e8d184fcde1481c354c06686612e10767c5eb9a27`。


正式V1门禁a525（当前摘要同步后）：五阶段文档审计PASS，证据审计PASS（1165引用、155份Manifest、294项），V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。V1.5保留栈NATS修正及A34追踪同步均被证据索引识别；4个历史TestRun结构化导出缺失，另有OD/旧Run决策、活动与全域恢复、Mac/Ubuntu实机和本人验收未完成。[a525日志](../evidence/audits/2026-10-10-v1-version-gate-a525.log)，SHA-256 `c17aeee2961e7d62b467e8f32b8a250a3c2cfe3b7b58477662c15e6aadb8429b`。


2026-10-10正式V1门禁a526：V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`；五阶段文档审计PASS、证据审计PASS（1166引用、155份Manifest、294项）。四个历史TestRun结构化导出、开放决定/旧Run处置、活动与全域恢复、Mac/Ubuntu实机及本人验收仍未满足。[a526门禁](../evidence/audits/2026-10-10-v1-version-gate-a526.log)，SHA-256 `8b7bfe65d9597abc279dd3f2396e01d4039bd33aac06bdeb2e711c9cd28d4fa5`。


2026-10-10正式V1门禁a527：阶段文档/证据审计PASS（1168引用、156份Manifest），V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。4个历史Run导出、待决政策/旧Run处置、全版恢复、宿主/Ubuntu实机及用户本人验收仍未满足。[a527](../evidence/audits/2026-10-10-v1-version-gate-a527.log)，SHA-256 `12e1369b35d2928f2cb5a5b227b6c6683b98ebb40aae1cc9e8de40a8b8c00a21`。


2026-10-10 V1.2增量：冻结Fixture升级为v1.2-market-data-5，显式列出CN/US合成预期会话日，整市场缺日时窗口不压缩/不桥接且历史不足在Qlib调用前拒绝。合同、Fixture哈希、定向单测12/12、隔离Web/API/CLI和完整V1.2 code suite通过；4个本轮TestRun及精确资源清理见[机器报告](../evidence/audits/2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-b8ba70b2115aa4208ee8.json)。完整套件[日志](../evidence/audits/2026-10-10-v12-market-session-calendar-code-suite-a02.log)SHA-256 `fe0ca1ff4359148fd66c5c50ac99d715a69657059520182d49501fff5541f202`；阶段§8.41和[A35差异矩阵](../evidence/audits/2026-10-10-v1-current-gap-matrix-a35.json)已同步。真实交易所日历、Ubuntu、人验和整版门禁仍未完成。


2026-10-10 P0/V1.2-S2-L18追踪更新：current crosswalk为显式合成市场会话日历与整市场缺日单测补入版本化Fixture、具体断言、a02完整套件和独立E2E；Crosswalk a29 PASS（147要求、1664路径引用/554目标、169精确测试名、147当前锚点，0缺失/不匹配）；差异矩阵A35只更新该受影响行，父项仍PARTIAL，真实交易所日历/P2-P3完整策略交接未关闭。Crosswalk SHA-256 `9eb4d108ea97073171f890fb3167df0fb2411ff138e27ef06625154121721692`；[a29日志](../evidence/audits/2026-10-10-v1-crosswalk-check-a29.log)，[A35矩阵](../evidence/audits/2026-10-10-v1-current-gap-matrix-a35.json)SHA-256 `99aa9ca7d1478c554760ebd91b7eec66e5ab08ec68b1f09ccd9d138e8c3e7b86`。


正式V1门禁a528（V1.2 v5显式市场日历及当前树套件证据同步后）：五阶段文档与证据审计PASS（1176引用、157份Manifest），V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。V1.2整市场缺日Fixture子项通过不改变阶段PARTIAL；四个历史Run结构化导出、待决政策/旧Run、活动与全域恢复、Mac/Ubuntu实机和本人验收仍未满足。[a528日志](../evidence/audits/2026-10-10-v1-version-gate-a528.log)，SHA-256 `ab22a68749369d58c545821576a48cf891374813b7a567c793a4656876250ad3`。


正式V1门禁a529（a528更新入档后）：五阶段文档与证据审计PASS（1180引用、158份Manifest），V1仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`；版本级历史Run、决策、恢复、环境与本人验收要求未满足。[a529日志](../evidence/audits/2026-10-10-v1-version-gate-a529.log)，SHA-256 `abc4384f86f60e5c27ad4bef04193b09c86ad65713ff0e2db2c0f227970e32b9`。


正式V1门禁a530（修正进度文档相对证据链接后复核）：阶段文档审计及证据审计PASS（1184引用、159份Manifest），V1仍`INCOMPLETE`/exit 2、`uncheckedVersionGate=true`。a530确认本轮V1.2自动证据已被索引；四个历史Run、未决政策/旧Run处置、全版活动与灾备恢复、Mac/Ubuntu实机及本人验收仍未满足。[a530日志](../evidence/audits/2026-10-10-v1-version-gate-a530.log)，SHA-256 `9ac9b841d8d431714f68b10c2e438b5e6863a7aa94cecf4be4bfc939e799656a`。


2026-10-10 P6文档一致性修复：90-test-plan状态总览曾将V1.1/V1.3手册列为DRAFT，与两个阶段§8.1的已执行Mac隔离操作记录矛盾。已校准为V1.1/V1.2/V1.3 `VERIFIED_EXECUTABLE`（各限其明确隔离范围），V1.4/V1.5 `PARTIALLY_VERIFIED_EXECUTABLE`；没有改变任何阶段实现状态、人验、Ubuntu或版本门禁结论。


正式V1门禁a531（90-test-plan状态总览与当前阶段§8.1实测状态一致性修复后）：五阶段文档/证据审计PASS（1188引用、160份Manifest），版本仍`INCOMPLETE`/exit 2且`uncheckedVersionGate=true`；本轮仅修复手册状态索引，不改变业务或人工验收。[a531日志](../evidence/audits/2026-10-10-v1-version-gate-a531.log)，SHA-256 `c751e7b383c53e00b9ba96f72bbb8ed0e173b382857b68b3cdcecc8868451b74`。

2026-10-10 P3文档/追踪校正：按`V1.3-S2-L14`源要求复核现存27/27隔离Web/API/CLI报告与独立资产HTTP+PG smoke，确认a35把固定V1.3 place/query/cancel/fills/account覆盖描述得过宽。单行修订见[当前差异矩阵a36](../evidence/audits/2026-10-10-v1-current-gap-matrix-a36.json)及[V1.3 §8.68](prd/v1-local-simulation/03-fake-broker-trading-loop.md#868-v13-fakebroker固定范围契约覆盖复核2026-10-10)。修订只确认V1.3固定场景，未关闭跨版本路由、完整市场/故障范围或阶段验收。

正式V1门禁a532（V1.3固定范围覆盖差异校正后）：`pnpm verify:version -- --version V1` exit 2，五阶段文档审计PASS、证据审计PASS（1195引用、161份Manifest、300项），V1仍`INCOMPLETE`且`uncheckedVersionGate=true`。四个历史TestRun结构化导出、结算/旧Run所有者决策、活动与全域恢复、Ubuntu实机及当前范围人工验收仍未满足。[a532日志](../evidence/audits/2026-10-10-v1-version-gate-a532.log)、[exit code](../evidence/audits/2026-10-10-v1-version-gate-a532.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a532.log.sha256)。

2026-10-10 P0/A04追踪增量：`baseline:check`首次暴露V1.2验收行更新后crosswalk锚点过期。已将`V1-99-STAGE-V1.2.currentSourceAnchorCandidate`对齐至当前第77行；`crosswalk:check`通过147/147要求、1664路径引用、169精确测试名和147当前锚点。受控完整`pnpm baseline:check` exit 0（66/66脚本测试），日志见[基线复验a02](../evidence/audits/2026-10-10-v1-baseline-after-crosswalk-anchor-a02.log)、[exit code](../evidence/audits/2026-10-10-v1-baseline-after-crosswalk-anchor-a02.exit.txt)及[SHA-256](../evidence/audits/2026-10-10-v1-baseline-after-crosswalk-anchor-a02.log.sha256)。普通沙箱两次因loopback `EPERM`未完成的日志保留；本增量只修复当前文档锚点，不关闭P0整体、活动部署、版本或人验门槛。

正式V1门禁a533（crosswalk与完整基线复验记录同步后）：版本仍`INCOMPLETE`/exit 2，阶段文档审计PASS、证据审计PASS（1195引用、161份Manifest、300项），`uncheckedVersionGate=true`。此前列明的历史Run、所有者决定、活动/全域恢复、Ubuntu与当前范围人工验收仍未满足。[a533日志](../evidence/audits/2026-10-10-v1-version-gate-a533.log)、[exit code](../evidence/audits/2026-10-10-v1-version-gate-a533.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a533.log.sha256)。

2026-10-10 P1/A04 Platform→Portfolio客户端增量：为生成客户端initialize/get snapshot/reserve/resolve/fill/fee-correction六项生产操作增加直接方法、路径及编码、身份/Bearer、owner和载荷断言；定向客户端测试3/3及typecheck通过，V1.1完整code suite exit 0（Platform 308/308、脚本基线66/66、隔离迁移/HTTP smoke清理通过）。阶段§2/§7/§8.27、V1.1-S2-L14 crosswalk及责任计划已同步；该操作边被测试不等于全部调用方/发布矩阵完成。记录保留V1.1于2026-09-09的历史用户确认范围，明确当前新增范围仍未签署。

正式V1门禁a534（P1/A04客户端合同及历史签署范围澄清后）：V1仍`INCOMPLETE`/exit 2，阶段文档审计PASS、证据审计PASS（1196引用、161份Manifest、300项），`uncheckedVersionGate=true`。四个历史TestRun结构化导出仍缺，另有未决结算/旧Run决定、活动与全域恢复、Ubuntu实机及当前范围人工验收未满足。[a534日志](../evidence/audits/2026-10-10-v1-version-gate-a534.log)、[exit code](../evidence/audits/2026-10-10-v1-version-gate-a534.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a534.log.sha256)。

正式V1门禁a535（P1进度摘要同步及文档/crosswalk复查后）：版本状态未变，仍`INCOMPLETE`/exit 2；五阶段文档审计PASS，证据审计PASS（1196引用、161份Manifest、300项），`uncheckedVersionGate=true`。历史Run、结算/旧Run决定、活动/全域恢复、Ubuntu和当前范围人验继续未满足。[a535日志](../evidence/audits/2026-10-10-v1-version-gate-a535.log)、[exit code](../evidence/audits/2026-10-10-v1-version-gate-a535.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a535.log.sha256)。

2026-10-10 P1/A04 Trade→Portfolio补测：Trade Outbox实际使用的Fill手续费更正生成客户端现有逐操作HTTP方法、编码路径、Trade身份/Bearer与载荷断言；Trade客户端定向4/4、typecheck及V1.3完整code suite exit 0（Trade 98/98、Platform 308/308）。V1.1/V1.3 crosswalk加入精确测试和证据；crosswalk:check通过147要求/172测试引用/147锚点，完整baseline:check exit 0（66/66脚本测试）。阶段记录见[V1.3 §8.69](prd/v1-local-simulation/03-fake-broker-trading-loop.md#869-tradeportfolio费用更正生成客户端合同回归2026-10-10)。仅关闭这一个调用子项，A04父任务与其余调用/发布/活动切换范围仍开放。代码套件[日志](../evidence/audits/2026-10-10-v13-trade-fee-correction-client-code-suite-a01.log)，基线[日志](../evidence/audits/2026-10-10-v1-baseline-v13-fee-client-a01.log)。

正式门禁a536首次证据审计FAIL（exit 1）：阶段文档审计PASS；发现本轮基线日志SHA sidecar内路径相对仓库根目录错误。失败原始日志保留于[a536](../evidence/audits/2026-10-10-v1-version-gate-a536.log)，已修正相关sidecar路径并复跑。

正式V1门禁a537（修正sidecar后）：V1仍`INCOMPLETE`/exit 2，阶段文档与证据审计均PASS（1199引用、162份Manifest、301项），`uncheckedVersionGate=true`。四个历史TestRun结构化导出、结算/旧Run决定、活动与全域恢复、Ubuntu实机及当前范围人工验收仍未满足。[a537日志](../evidence/audits/2026-10-10-v1-version-gate-a537.log)、[exit code](../evidence/audits/2026-10-10-v1-version-gate-a537.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a537.log.sha256)。

2026-10-10 P1/A04 Historical Replay→Portfolio客户端增量：为Replay Worker账户初始化/快照读取补充请求合同单测（2/2）与服务typecheck；V1.4完整代码套件exit 0，Replay Worker 27/27、Trade 98/98、Platform 308/308，隔离HTTP/PG与迁移检查通过。阶段记录见[V1.1 §8.28](prd/v1-local-simulation/01-environment-and-web-center.md#828-historical-replayportfolio账户客户端传输合同2026-10-10)，追踪表新增两条精确测试。正式门禁a538复核：五阶段文档审计PASS；证据审计PASS（1200引用、162份Manifest、301项）；版本仍INCOMPLETE/exit 2且`uncheckedVersionGate=true`。四个历史TestRun结构化导出仍缺；新增范围人验、OD-014/结算语义、旧非终态Run处置、全V1配对恢复、Ubuntu与Mac睡眠唤醒仍未解决。[门禁日志](../evidence/audits/2026-10-10-v1-version-gate-a538.log)，[exit](../evidence/audits/2026-10-10-v1-version-gate-a538.exit.txt)，[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a538.log.sha256)。

本轮`pnpm baseline:check`完整通过：文档链接、交叉追踪、208个schema/59个Fixture验证、合同生成器/兼容性、8项服务分层及仓库66项基线脚本均通过；V1.4隔离代码套件先前exit 0。基线通过不改变a539正式门禁的INCOMPLETE状态。

正式V1门禁最终复核a540（基线与计划/进度记录回写后）：五阶段文档审计PASS；证据审计PASS（1200引用、162份Manifest、301项）；V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。缺口仍包括4个历史TestRun结构化导出、未决决定/非终态旧Run处置、完整V1配对恢复、Mac睡眠唤醒、Ubuntu/目标环境与阶段人验。详见[门禁日志](../evidence/audits/2026-10-10-v1-version-gate-a540.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a540.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a540.log.sha256)。

2026-10-10 P1/A04 Platform→Historical Replay客户端增量：为Replay生成客户端补齐单bar启动、路径编码、无请求体pause/resume/cancel、UNKNOWN恢复及服务身份/AbortSignal直接测试；定向单测4/4、Platform typecheck通过。完整V1.4 code suite受控退出0（Platform 310/310、基线脚本66/66、Replay服务身份HTTP smoke及隔离迁移/Trade-Portfolio-Governance对账Harness通过，活动服务NOT_CONNECTED且临时资源清理）。证据见[V1.1 §8.29](prd/v1-local-simulation/01-environment-and-web-center.md#829-platformhistorical-replay客户端操作合同2026-10-10)及[调用矩阵A07](../evidence/audits/2026-10-10-v1-cross-service-route-matrix-a07.md)。Crosswalk新增两条精确测试引用，P1/A04仍OPEN；此测试不代表回放业务恢复全矩阵、OD-014、环境或人工验收。

正式V1门禁a542（Platform→Replay客户端测试、V1.1 §8.29、A07矩阵与crosswalk同步后）：V1仍INCOMPLETE/exit 2；五阶段文档审计PASS，证据审计PASS（1201引用、162份Manifest、301项），`uncheckedVersionGate=true`。历史TestRun导出、未决结算/旧Run决定、全V1配对恢复、宿主/Ubuntu验证和当前范围人工验收仍未满足。[门禁日志](../evidence/audits/2026-10-10-v1-version-gate-a542.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a542.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a542.log.sha256)。

2026-10-10 P1/A04 Platform→Decision Governance Proposal客户端增量：新增4项操作级测试覆盖create/read/approve/reject/revise、路径编码、服务Bearer、owner/actor scope和精确请求体；定向4/4、Platform typecheck及完整V1.3 code suite退出0。完整套件Platform 314/314、Governance 41/41、Trade 98/98、Replay 27/27及基线/隔离迁移/HTTP验证通过，活动服务NOT_CONNECTED且临时资源清理。阶段证据[V1.3 §8.70](prd/v1-local-simulation/03-fake-broker-trading-loop.md#870-platformdecision-governance-proposal客户端操作合同回归2026-10-10)，矩阵增量[A08](../evidence/audits/2026-10-10-v1-cross-service-route-matrix-a08.md)。交叉追踪加入4条精确测试；A04父项、治理全接受/拒绝矩阵、活动部署与人工验收仍未关闭。

正式V1门禁a544（Proposal客户端测试、V1.3 §8.70/A08及crosswalk更新后）：五阶段文档审计PASS；证据审计PASS（1202引用、162份Manifest、301项），版本仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。本轮新增出站客户端合同覆盖没有改变历史TestRun缺失、OD-014/旧Run决定、全V1恢复、目标环境及当前范围人验状态。[门禁日志](../evidence/audits/2026-10-10-v1-version-gate-a544.log)，[exit](../evidence/audits/2026-10-10-v1-version-gate-a544.exit.txt)，[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a544.log.sha256)。

2026-10-10 P1/A04 Platform→Trade V1.3客户端逐操作增量：9项实际生成客户端操作的路由/方法、身份/Bearer、载荷与路径/query合同直测9/9，Platform typecheck及完整V1.3 code suite退出0（Platform 323/323、Trade 98/98、隔离迁移/HTTP与基线66/66通过，活动服务未连接、临时资源清理）。阶段记录[V1.3 §8.71](prd/v1-local-simulation/03-fake-broker-trading-loop.md#871-platformtrade-execution-v13客户端逐操作合同回归2026-10-10)、矩阵[A09](../evidence/audits/2026-10-10-v1-cross-service-route-matrix-a09.md)和crosswalk已同步。直接合同子项完成；Trade端端授权拒绝副作用、全调用发布矩阵及P1/A04父项仍OPEN。

正式V1门禁a546（Platform→Trade九项客户端合同、V1.3 §8.71/A09及crosswalk同步后）：阶段文档审计PASS、证据审计PASS（1203引用、162份Manifest、301项），V1仍INCOMPLETE/exit 2且`uncheckedVersionGate=true`。历史Run导出、决定/旧Run处置、配对恢复、目标环境及人工验收状态不变。[a546日志](../evidence/audits/2026-10-10-v1-version-gate-a546.log)，[exit](../evidence/audits/2026-10-10-v1-version-gate-a546.exit.txt)，[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a546.log.sha256)。

2026-10-10 P1/A04 Platform→Quant V1.4请求合同增量：强化日线回测客户端测试，核对路由、Platform服务身份/Bearer、content type、精确scenario/seed/policy body、超时signal和422状态/响应body；定向6/6、typecheck通过。完整V1.4 code suite exit 0（Platform 323/323、基线66/66、隔离迁移/HTTP业务Harness及报告fencing通过，临时资源清理、活动服务未连接）。记录[V1.4 §8.72](prd/v1-local-simulation/04-daily-backtest.md#872-platformquant日线回测客户端请求合同强化2026-10-10)、[调用矩阵A10](../evidence/audits/2026-10-10-v1-cross-service-route-matrix-a10.md)及crosswalk；完整费用/规则对照、OD-014、环境与人工验收仍开放。

正式V1门禁a548（Platform→Quant合同与V1.4 §8.72/A10、crosswalk更新后）：阶段文档审计PASS；证据审计PASS（1204引用、162份Manifest、301项），V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。完整规则/结算、历史导出、决定/旧Run处置、全V1恢复、目标环境与人工验收未因客户端测试改变。[a548门禁日志](../evidence/audits/2026-10-10-v1-version-gate-a548.log)，[exit](../evidence/audits/2026-10-10-v1-version-gate-a548.exit.txt)，[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a548.log.sha256)。

2026-10-10 P1/A04 AUTO Mandate客户端追踪增量：核实当前Platform/Trade两套生成客户端直接测试（Platform五项操作加非法version零请求；Trade订单授权/预算结算各项路径、身份、载荷和timeout）。定向2/2、1/1，当前完整V1.3 code suite exit 0（Platform 323/323、Trade 98/98，隔离迁移/HTTP、基线通过且清理完成）。详见[V1.3 §8.72](prd/v1-local-simulation/03-fake-broker-trading-loop.md#872-platformtradegovernance-auto-mandate客户端操作合同2026-10-10)、[矩阵A11](../evidence/audits/2026-10-10-v1-cross-service-route-matrix-a11.md)；crosswalk新增3条精确引用。此为现有消费者证据追踪，完整治理拒绝/恢复、发布回退与P1/A04父项仍开放。

正式V1门禁a550（AUTO Mandate客户端证据映射、V1.3 §8.72/A11与crosswalk同步后）：阶段文档审计PASS，证据审计PASS（1205引用、162份Manifest、301项），V1仍INCOMPLETE/exit 2且`uncheckedVersionGate=true`。仅追踪已存在的客户端操作证据，没有改变四个历史Run导出、未决所有者决定/旧Run处置、全V1恢复、目标环境和人工验收状态。[a550日志](../evidence/audits/2026-10-10-v1-version-gate-a550.log)，[exit](../evidence/audits/2026-10-10-v1-version-gate-a550.exit.txt)，[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a550.log.sha256)。

2026-10-10 P1/A04 Platform→Quant V1.2 Qlib fit客户端超时合同增量：默认120000ms timeout、AbortSignal已加入现有路由/身份/Bearer/完整请求body直接断言；定向2/2、Platform typecheck通过。完整V1.2 code suite exit 0（Platform 323/323、全局基线66/66、迁移/HTTP和真实Qlib组件、四个same-TestRun Web/API/CLI场景通过，临时资源清理）。重启恢复窗口的单次ECONNREFUSED后恢复成功，明确保留在日志中。阶段[V1.2 §8.42](prd/v1-local-simulation/02-small-data-and-qlib.md#842-platformquant-qlib客户端长任务超时合同复验2026-10-10)，矩阵[A12](../evidence/audits/2026-10-10-v1-cross-service-route-matrix-a12.md)，crosswalk已添加精确测试。

正式V1门禁a552（V1.2 Qlib请求超时合同、§8.42/A12与crosswalk同步后）：阶段文档审计PASS；证据审计PASS（1206引用、162份Manifest、301项），版本仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。OD-014严格已结算现金提案已提交所有者确认，回应前不实现被其阻断的SELL→BUY结算路径；历史Run导出、其余决定/旧Run处置、全V1恢复、目标环境与当前范围人工验收仍开放。[a552日志](../evidence/audits/2026-10-10-v1-version-gate-a552.log)，[exit](../evidence/audits/2026-10-10-v1-version-gate-a552.exit.txt)，[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a552.log.sha256)。

2026-10-10 P1/A04 Platform→Quant V1.2预览读接口合同：三条只读路由均锁定Platform身份头、无body、5秒AbortSignal超时及HTTP错误保留；定向2/2、Platform typecheck通过。完整V1.2 code suite exit 0，Platform 323/323、baseline 66/66、真实Qlib CPU组件、隔离服务/迁移与四个same-TestRun Web/API/CLI场景通过并确认清理。日志[见此](../evidence/audits/2026-10-10-v12-preview-read-contract-code-suite-a01.log)，SHA-256见sidecar；一次Platform恢复窗口ECONNREFUSED及成功恢复均保留。阶段[V1.2 §8.43](prd/v1-local-simulation/02-small-data-and-qlib.md#843-platformquant研究预览只读请求合同复验2026-10-10)，矩阵[A13](../evidence/audits/2026-10-10-v1-cross-service-route-matrix-a13.md)，crosswalk已追加精确测试与日志证据。仅补该传输合同子项，P1/A04父项及V1仍开放。

正式V1门禁a554（预览客户端测试、阶段§8.43、A13与crosswalk回写后）：五阶段文档审计PASS；证据审计PASS（1208引用、163份Manifest、302条目），版本仍INCOMPLETE/exit 2且`uncheckedVersionGate=true`。4个历史TestRun结构化导出仍缺（V1.2一个、V1.5三个）；OD-013/014及旧非终态Run决定、全V1配对恢复、Mac睡眠唤醒/Ubuntu实机与新增范围人验仍开放。[a554门禁日志](../evidence/audits/2026-10-10-v1-version-gate-a554.log)，exit 2，SHA见sidecar。

2026-10-10 P2/A06 Platform→Market Data研究Fixture消费者增量：为`v1.2-market-data-5`补充`GET /v1/fixtures/research-preview`直接合同测试，验证Platform身份、空请求体及5秒超时；定向3/3与Platform typecheck通过。完整V1.2 code suite exit 0，Platform 324/324、基线66/66、真实Qlib CPU、隔离数据库/迁移、四个same-TestRun Web/API/CLI场景与资源清理通过。恢复窗口ECONNREFUSED后同一Run恢复，记录于[套件日志](../evidence/audits/2026-10-10-v12-market-research-preview-contract-code-suite-a01.log)。阶段[V1.2 §8.44](prd/v1-local-simulation/02-small-data-and-qlib.md#844-platformmarket-data双市场研究fixture读取合同2026-10-10)，矩阵[A14](../evidence/audits/2026-10-10-v1-cross-service-route-matrix-a14.md)，crosswalk已挂测试/证据。仅关闭研究Fixture消费者合同这一原子项；来源授权、真实日历、目标环境及验收仍未通过。

正式V1门禁a556（V1.2研究Fixture消费合同、§8.44/A14及crosswalk回写后）：V1仍INCOMPLETE/exit 2，五阶段文档审计及证据审计PASS（1209引用、163份Manifest、302条目），`uncheckedVersionGate=true`。四个指定历史Run导出、未决决定和旧非终态Run处置、全域恢复、Mac睡眠唤醒、Ubuntu实机及当前范围用户验收仍阻止V1收尾。[a556门禁日志](../evidence/audits/2026-10-10-v1-version-gate-a556.log)，exit 2，SHA见sidecar。

2026-10-10 P1/A04–P3 Governance服务端身份策略枚举：为Decision Governance现行21个准入路由逐项测试Platform/Trade/Replay三身份授权/拒绝、方法错误、无效ID及未知路径；定向7/7、typecheck通过。完整V1.3 code suite exit 0，Governance 42/42、Platform 324/324、Trade 98/98，隔离迁移与真实Governance/Replay/Quant HTTP smoke通过且随机资源清理。阶段[V1.3 §8.73](prd/v1-local-simulation/03-fake-broker-trading-loop.md#873-decision-governance完整准入路由身份策略枚举2026-10-10)、调用矩阵[A15](../evidence/audits/2026-10-10-v1-cross-service-route-matrix-a15.md)、crosswalk同步。仅确认Governance route-scope策略，不关闭业务模式拒绝/副作用审计或P1/P3父项。日志[见此](../evidence/audits/2026-10-10-v13-governance-route-scope-matrix-code-suite-a01.log)，SHA见sidecar。

正式V1门禁a557（纳入§8.44及P2 Market Data消费者合同和crosswalk后）：文档/证据审计PASS（1209引用/163 Manifest/302条目），V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`；4个历史Run导出、决定/旧Run处置、全域恢复、目标环境与当前范围人工验收仍开放。[a557门禁](../evidence/audits/2026-10-10-v1-version-gate-a557.log)，exit 2，SHA见sidecar。

2026-10-10 P1/A04–P3 Governance准入路由HTTP+PG拒绝矩阵：对21条路由实际执行83次错误身份、错误方法及伪造Bearer探测；畸形POST均在JSON解析前403，10张Governance业务事实表前后计数一致。定向策略7/7、typecheck通过；完整V1.3 code suite exit 0（Governance 42/42、Platform 324/324、Trade 98/98），Governance/Replay/Quant HTTP smoke、隔离迁移及清理通过。更新[V1.3 §8.73](prd/v1-local-simulation/03-fake-broker-trading-loop.md#873-decision-governance完整准入路由身份策略枚举2026-10-10)、[矩阵A15](../evidence/audits/2026-10-10-v1-cross-service-route-matrix-a15.md)、crosswalk和版本摘要。[完整日志](../evidence/audits/2026-10-10-v13-governance-route-scope-http-code-suite-a01.log)，SHA见sidecar。该证据只关闭拒绝身份/方法及副作用子项，不关闭合法业务请求/模式边界或P1/P3父项。

2026-10-10 P1/A04 Governance配置fail-closed增量：发现Governance有Platform专属V1路由但Platform Bearer可缺省，已改为Platform/Trade/Replay三份强且互异token必填；Compose配置改为缺项时报错，示例环境文件与架构文档同步。定向身份单测8/8、Governance typecheck、Compose config检查通过；完整V1.3 code suite exit 0（Governance 43、Platform 324、Trade 98项），21路由83次HTTP拒绝矩阵、隔离数据库迁移和资源清理通过。阶段[V1.3 §8.74](prd/v1-local-simulation/03-fake-broker-trading-loop.md#874-decision-governance-platform-api身份配置fail-closed2026-10-10)，crosswalk精确测试已同步；[套件日志](../evidence/audits/2026-10-10-v13-governance-platform-token-required-code-suite-a01.log)，SHA-256 `bb380f1db9e2e0361a66ff9d7b235ddcd72d6cc3f11af32482a15f806c8361e8`。全仓基线`pnpm baseline:check` exit 0（Markdown链接8548、schema 208、Fixture 59、脚本单测66/66）；活动服务未部署。V1仍待正式门禁、历史TestRun导出、决策/旧Run处置、全域恢复、目标环境及人验。

正式V1门禁a560（纳入Governance Platform caller配置修复、V1.3 §8.74及crosswalk后）：五阶段文档审计PASS，证据审计PASS（1211引用、163份Manifest、302项）；版本仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。历史TestRun导出仍缺4项；OD-013/014与旧非终态Run处置、全V1配对恢复、Mac睡眠唤醒、Ubuntu/目标环境及五阶段当前范围人验仍未满足。[a560日志](../evidence/audits/2026-10-10-v1-version-gate-a560.log)，exit 2，SHA-256 `316716d2ff1f4057d69cd66015ab7de0cb5b97f4bf9c78f77c20bbce4c81c3a2`。

2026-10-10 A04/P0调用矩阵增量A16：将Governance Platform/Trade/Replay三Caller身份token必填、长度与互异约束映射至V1跨服务矩阵及V1.1-S2-L14 crosswalk；另实测Compose合法本地配置exit 0、空Platform token配置exit 1。当前crosswalk审计PASS（147项、1688路径引用、199精确测试、147锚点、0失配）；详见[A16](../evidence/audits/2026-10-10-v1-cross-service-route-matrix-a16.md)及[Compose边界检查](../evidence/audits/2026-10-10-v13-governance-compose-token-gate-a01.md)。仅关闭Governance配置fail-closed原子项，A04父项和完整V1保持开放。

正式V1门禁a561（进度/计划摘要同步后）：阶段文档审计PASS，证据审计PASS（1213引用、164份Manifest、303项）；版本仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。四个历史TestRun结构化导出仍缺；决策/旧Run处置、全域恢复、Mac睡眠唤醒、目标环境及当前范围用户验收未满足。[a561日志](../evidence/audits/2026-10-10-v1-version-gate-a561.log)，exit 2，SHA-256 `c281eafb135db1ea7391bd150769cff543a7bba2402c706fe3077a2ca2b87692`。

正式V1门禁a562（纳入A16与Compose缺token负向检查后）：文档/证据审计PASS（1217引用、165份Manifest、304项），版本仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。四个历史TestRun结构化导出、决定与旧Run处置、全V1恢复、目标环境及当前范围人验仍未满足。[a562日志](../evidence/audits/2026-10-10-v1-version-gate-a562.log)，exit 2，SHA-256 `83f0eb23a5266fafb9f3f0f8ca7c850828fe4d68e6578364e705e21774343248`。

2026-10-10 P1/A04–P3 Portfolio Risk Caller凭据互异修复：发现`service-id`可作为路由选择器，但三种caller共用同一Bearer时仍会被授权；现请求和ready共享检查，要求Platform API、Trade Execution、Historical Replay三份至少32字符且相互不同的token，Compose缺项失败关闭。定向Portfolio身份测试3/3、typecheck、Compose正负配置检查通过；完整V1.1与V1.3 code suite均exit 0，Portfolio 7项单测及隔离PostgreSQL/HTTP迁移验证通过并清理。见[V1.1 §8.30](prd/v1-local-simulation/01-environment-and-web-center.md#830-portfolio-risk调用身份密钥必须互异2026-10-10)、[V1.3 §8.75](prd/v1-local-simulation/03-fake-broker-trading-loop.md#875-portfolio-risk跨调用身份bearer不可复用2026-10-10)、[矩阵A17](../evidence/audits/2026-10-10-v1-cross-service-route-matrix-a17.md)，套件[V1.1](../evidence/audits/2026-10-10-v11-portfolio-distinct-identities-code-suite-a01.log) SHA `956570bf3869ae251e8c6e973beab68aa03fc36270176995b216b1d8f2dc0b22`、[V1.3](../evidence/audits/2026-10-10-v13-portfolio-distinct-identities-code-suite-a01.log) SHA `7d830f6948ab7b14234125bd77f53df0b474f07a964829602903d3104b8198b5`。仅关闭该服务身份配置子项；活动服务、全V1身份矩阵及版本验收仍未完成。

该修复后全仓`pnpm baseline:check` exit 0：Markdown链接8579/0失败、stage ID唯一、crosswalk 147需求/1688路径引用/201精确测试名/147锚点均PASS、JSON合同与Fixture 0失败、脚本基线66/66。完整[基线日志](../evidence/audits/2026-10-10-v1-portfolio-identities-baseline-a01.log)，SHA-256 `eb2137082fff58e110c15ac873e1241a2649079b153abe8018788dcada1ae45b`。V1仍需正式门禁复核及未解决的外部历史/决策/恢复/环境/人验输入。

正式V1门禁a563（Portfolio Risk caller身份修复与A17矩阵、Crosswalk和基线证据入档后）：五阶段文档审计PASS，证据审计PASS（1220引用、165份Manifest、304项）；V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。四个历史TestRun导出、OD-013/014及旧非终态Run处置、全V1配对恢复、Mac睡眠唤醒、Ubuntu/目标环境和当前范围人验仍未完成。[a563日志](../evidence/audits/2026-10-10-v1-version-gate-a563.log)，exit 2，SHA-256 `4df5beac420dc14fe48d764034d072f2d5af03a235cc3440541717bca804b26f`。

正式V1门禁a564（阶段新增§8.30/§8.75、A17与代码证据映射回写后）：五阶段文档审计PASS，证据审计PASS（1222引用、166份Manifest、305项）；V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。四个历史TestRun结构化导出、所有者决定与旧Run处置、完整V1恢复、宿主/Ubuntu验证和当前范围人验仍未满足。[a564日志](../evidence/audits/2026-10-10-v1-version-gate-a564.log)，exit 2，SHA-256 `afe9393b8a42fbc55e7ccf857739d4bb6ffe9a2da98546ef3e99be619bc5fad0`。

2026-10-10 P1/A04 Portfolio Risk全准入路由拒绝矩阵：新增七条路由×四caller身份的28次隔离HTTP拒绝探测，错误Bearer全部401、越权Caller全部403，六类Portfolio业务事实计数前后为0；策略单测通过，V1.1与V1.3完整code suite均exit 0。见[V1.1 §8.31](prd/v1-local-simulation/01-environment-and-web-center.md#831-portfolio-risk全准入路由caller拒绝矩阵2026-10-10)、[V1.3 §8.76](prd/v1-local-simulation/03-fake-broker-trading-loop.md#876-portfolio-risk全准入路由http拒绝矩阵2026-10-10)、[矩阵A18](../evidence/audits/2026-10-10-v1-cross-service-route-matrix-a18.md)。证据只覆盖拒绝路径和副作用边界，V1仍未完成。

正式V1门禁a565（A18 Portfolio Risk拒绝矩阵、阶段记录与66/66基线证据同步后）：阶段文档审计PASS，证据审计PASS（1224引用、166份Manifest、305项）；版本仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。历史TestRun结构化导出缺失仍是明确阻塞，所有者决定与旧Run处置、完整恢复、Mac/Ubuntu目标环境及当前范围人验未满足。[a565日志](../evidence/audits/2026-10-10-v1-version-gate-a565.log)，SHA-256见sidecar。

正式V1门禁a566（最新开发勾选与A18基线证据同步后）：五阶段文档审计PASS，证据审计PASS（1224引用、166份Manifest、305项）；V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。历史TestRun导出、OD-013/014及旧Run处置、全域恢复、Mac睡眠唤醒、Ubuntu目标环境和当前范围本人验收尚未满足。[a566日志](../evidence/audits/2026-10-10-v1-version-gate-a566.log)，SHA-256见sidecar。A18全仓基线66/66通过，日志见[evidence](../evidence/audits/2026-10-10-v1-portfolio-route-matrix-baseline-a02.log)。

正式V1门禁a567发现并保留证据格式失败：本轮新增a566 `.log.sha256`仅含裸哈希，当前审计要求带文件名的标准SHA-256行；修复a565/a566及本轮baseline sidecar格式后，a568重跑文档审计PASS、证据审计PASS（1226引用、167份Manifest、306项），V1仍INCOMPLETE/exit 2。四个历史TestRun结构化导出缺失、决策/旧Run处置、完整恢复、Mac/Ubuntu及当前范围本人验收仍未满足。[a567失败日志](../evidence/audits/2026-10-10-v1-version-gate-a567.log)，[a568通过审计但版本未过日志](../evidence/audits/2026-10-10-v1-version-gate-a568.log)，SHA sidecar见各文件旁。

正式V1门禁a569（sidecar格式修复、当前工作树文档和a568记录同步后）：文档审计PASS（5阶段），证据审计PASS（1228引用、168份Manifest、307项），版本仍INCOMPLETE/exit 2。四个历史TestRun导出仍缺；OD-013/014与旧Run处置、完整故障恢复、Mac睡眠/唤醒、Ubuntu目标环境和当前范围本人验收仍未满足。[a569日志](../evidence/audits/2026-10-10-v1-version-gate-a569.log)，exit 2，SHA-256见sidecar。

2026-10-10 P4/V1.4终态拒绝资源释放修复：发现授权Historical FakeBroker订单以`REJECTED`/`EXPIRED`且无Fill终止时不会释放Portfolio Reservation。现在Trade在同事务写Reservation Resolution Outbox，HTTP处理器即时投递，Portfolio以原单Order ID和拒绝原因作证据；ZERO_VOLUME真实Governance→Trade→Portfolio HTTP/隔离PG证明预留只释放一次、现金与Portfolio ledger不变、无Fill/Fill Outbox/FakeBroker asset event、同命令重放读取同订单。完整V1.4 code suite exit 0，9项正常CN/US结果对照和9次幂等检查保持通过；见[V1.4 §8.73](prd/v1-local-simulation/04-daily-backtest.md#873-v14历史fakebroker终态拒绝释放资源预留2026-10-10)、[套件](../evidence/audits/2026-10-10-v14-zero-volume-reservation-release-code-suite-a02.log) SHA `9cca18b6b74a71c83f369e454f68a3758596bd45fc37c722889d0bf42b3602d8`。baseline 66/66，crosswalk当前审计147项/1691引用/588目标/201精确测试/147锚点PASS；分别见[基线](../evidence/audits/2026-10-10-v1-v14-reservation-release-baseline-a01.log)与[Crosswalk A19](../evidence/audits/2026-10-10-v1-crosswalk-current-a19.json)。这只关闭终态拒绝/到期无Fill的Reservation原子项；OD-014 SELL应收/结算及P4/P1父项、全阶段与V1验收仍开放。

正式V1门禁a570（V1.4 §8.73、Crosswalk A19、baseline和计划同步后）：五阶段文档审计PASS，证据审计PASS（1231引用、168份Manifest、307项）；版本仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`。当前P4终态拒绝Reservation释放增量通过，但4个历史TestRun结构化导出、OD-013/014及旧Run处置、全域恢复、Mac睡眠/唤醒、Ubuntu目标环境和当前范围人工验收继续未满足。[a570门禁](../evidence/audits/2026-10-10-v1-version-gate-a570.log)，exit 2，SHA-256见sidecar。

正式V1门禁a571（V1.4拒绝释放修复、架构/测试/验收记录及最新全仓基线同步后）：五阶段文档审计PASS，证据审计PASS（1234引用、169份Manifest、308项）；版本仍`INCOMPLETE`/exit 2。四个指定历史TestRun结构化导出缺失、OD-013/014与旧Run所有者处置、全域恢复、Mac睡眠唤醒、Ubuntu目标环境及当前范围人工验收继续未满足。[a571门禁](../evidence/audits/2026-10-10-v1-version-gate-a571.log)，exit 2，SHA sidecar见日志旁；[66/66基线](../evidence/audits/2026-10-10-v1-final-baseline-a01.log)。


2026-10-10 P4/V1.4终态Reservation释放覆盖扩展：在已验证ZERO_VOLUME→REJECTED外，新增真实Governance→Trade→Portfolio HTTP/隔离PG的不可成交LIMIT→EXPIRED场景；两者均验证Reservation释放、无Fill/账本/资产事件、初始现金不变及同命令幂等。V1.4完整code suite a04 exit 0（含基线66/66），之前计数器预期错误的a03失败保留。阶段§8.73、90-test-plan、架构和验收及Crosswalk同步；当前Crosswalk具体检查待本轮收尾。该切片不关闭OD-014、完整结算/费税规则、P4父项、Ubuntu及人工验收。

正式V1门禁a572（V1.4拒绝与过期两种终态预留释放验证、Crosswalk A20及当前全仓基线后）：五阶段文档审计PASS，证据审计PASS（1238引用、170份Manifest、309项）；版本仍INCOMPLETE/exit 2。四个历史TestRun结构化导出缺失；决策/旧Run处置、全域恢复、Mac睡眠唤醒、Ubuntu目标环境和当前范围本人验收仍未满足。[a572日志](../evidence/audits/2026-10-10-v1-version-gate-a572.log)，[exit](../evidence/audits/2026-10-10-v1-version-gate-a572.exit.txt)，[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a572.log.sha256)。Crosswalk A20和baseline分别见[映射审计](../evidence/audits/2026-10-10-v1-crosswalk-current-a20.json)及[66/66基线](../evidence/audits/2026-10-10-v1-terminal-reservation-baseline-a02.log)。

正式V1门禁a573（计划/进度与a572结果同步后）：五阶段文档审计PASS、证据审计PASS（1239引用、170份Manifest、309项）；V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。版本阻塞仍为4个历史TestRun结构化导出缺失，以及所有者决策/旧Run处置、全域恢复、Mac睡眠唤醒、Ubuntu目标环境和当前范围本人验收。[a573日志](../evidence/audits/2026-10-10-v1-version-gate-a573.log)，[exit](../evidence/audits/2026-10-10-v1-version-gate-a573.exit.txt)，[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a573.log.sha256)。当前全仓baseline 66/66通过，见[日志](../evidence/audits/2026-10-10-v1-terminal-reservation-baseline-a04.log)。

正式V1门禁a574（同步a573及最新计划/进度记录后）：五阶段文档审计PASS、证据审计PASS（1240引用、170份Manifest、309项）；V1仍INCOMPLETE/exit 2。四份历史TestRun结构化导出及旧Run处置/决策、全域恢复、Mac睡眠唤醒、Ubuntu实机和当前范围本人验收均未满足。[a574日志](../evidence/audits/2026-10-10-v1-version-gate-a574.log)，[exit](../evidence/audits/2026-10-10-v1-version-gate-a574.exit.txt)，[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a574.log.sha256)。

2026-10-10 P0 Ubuntu范围澄清：按仓库所有者提供的AGENTS.md，“最终迁移验收必须有真实Ubuntu证据”，消除原分类审计中W8实机范围待决定的歧义；V1/V2目标架构烟测可使用并标注仿真，但不替代最终迁移实机验收。当前只读preflight为macOS ARM64、runtime unavailable，真实主机未执行。详见[分类补充A02](../evidence/audits/2026-10-10-v1-gate-classification-a02.md)。待提供授权Ubuntu x86_64主机、资源阈值和网络/存储及维护恢复边界后执行。OD-013仍OPEN。

2026-10-10 P3/V1.4 Web刷新恢复修复：V1.4运行页原先只存React内存，刷新会失去TestRun关联；现以本地存储保存最近testRunId，载入后读回原任务并持续轮询，不会创建第二个Run。新增隔离Playwright场景实际在RUNNING期间刷新，恢复同一ID、完成后同Run CLI核验通过；Web typecheck及V1.4 E2E 6/6通过，机器报告17组Quant结果/Manifest Hash配对、18个Platform Run、隔离资源清理PASS。证据Run `6b3ca46d-46ee-4112-99ad-f1661c3d322a`；详见[V1.4 §8.74](prd/v1-local-simulation/04-daily-backtest.md#874-v14-web运行中刷新恢复原testrun2026-10-10)和[E2E日志](../evidence/audits/2026-10-10-v14-browser-refresh-recovery-e2e-a02.log)。此前标题筛选未命中新用例的a01失败保留。此项不构成用户人工验收或关闭P3/P4父项。

2026-10-10 P3/P4验证补齐：独立构建linux/arm64 Web容器并运行验收路由，HTTP 200、SPA与bundle加载及精确临时镜像/容器清理通过；V1.1共享Web兼容完整code suite和全仓`pnpm baseline:check`均exit 0（66/66脚本基线）。容器首轮启动探测过早导致空响应，a01失败日志保留；增加有界健康重试后a02通过。详见[容器运行日志](../evidence/audits/2026-10-10-v14-containerized-web-refresh-smoke-a02.log)、[V1.1兼容套件](../evidence/audits/2026-10-10-v11-v14-web-refresh-compat-code-suite-a01.log)、[基线日志](../evidence/audits/2026-10-10-v1-v14-refresh-baseline-a05.log)。这些通过只证明记录的隔离范围，正式V1门禁尚待重跑。

正式V1门禁a578（纳入本轮实现、E2E、容器化Web及兼容/基线证据后）：阶段文档审计PASS，证据审计PASS（1250引用、172份Manifest、311项）；V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。四个历史TestRun结构化导出仍缺；OD-013/014及旧Run处置、活动/全域配对恢复、Mac睡眠唤醒、Ubuntu实机及当前范围人工验收仍未满足。[a578日志](../evidence/audits/2026-10-10-v1-version-gate-a578.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a578.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a578.log.sha256)。

2026-10-10 P4/V1.4 Web拒绝路径补齐：新增正式回测页E2E，选择未来成交拒绝场景后明确显示`FUTURE_SIGNAL_SAME_DAY`、`T_PLUS_1_UNAVAILABLE`和`reportPublished=false`，后端断言可见，原TestRun经CLI `--check-only`复核通过。完整隔离V1.4 E2E扩至7/7；10个Web创建TestRun同Run CLI核对通过，18组Quant BacktestRun/Manifest/resultHash一致、19个Platform TestRun、随机容器/卷/网络清理通过。Harness报告Run `0a99d67e-2d71-438a-a288-6d023e52e863`，项目`sq-v14-backtest-d343174b691a93b5604c`；详见[V1.4 §8.75](prd/v1-local-simulation/04-daily-backtest.md#875-v14-web拒绝场景及同run独立核对2026-10-10)及[E2E日志](../evidence/audits/2026-10-10-v14-web-rejection-e2e-a01.log)。更新阶段交付待办、测试计划、验收表与需求交叉索引；用户人工验收仍NOT_RUN，OD-014及P4结算/规则父项未关闭。

该变更后`pnpm docs:check`通过（8696个Markdown链接、0失败，5个阶段编号唯一），crosswalk通过（147/147需求、1699路径引用、203个精确测试名、147来源锚点均通过），Web typecheck通过；全仓`pnpm baseline:check` exit 0，66/66基线脚本通过。[基线日志](../evidence/audits/2026-10-10-v1-v14-web-rejection-baseline-a01.log)，exit/SHA sidecar已保存。以上自动验证不代替版本门禁、Ubuntu实机或用户验收。

正式V1门禁a580（上述Web拒绝E2E、交叉索引、Acceptance记录与基线同步后）：V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`；阶段文档审计PASS，证据审计PASS（1252引用、172份Manifest、311项）。四个历史TestRun结构化导出、OD-013/014与旧Run处置、活动/全域配对恢复、Mac睡眠唤醒、Ubuntu实机和当前范围人工验收仍未满足。[a580日志](../evidence/audits/2026-10-10-v1-version-gate-a580.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a580.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a580.log.sha256)。

V1.4 Web拒绝场景增量后，当前树完整`pnpm verify:stage -- --stage V1.4 --suite code`再次exit 0：Market Data集成28/28、四服务独立迁移账本、Trade→Portfolio真实HTTP/PG固定业务对账、报告Artifact fencing及基线脚本66/66通过；隔离资源清理成功，活动服务NOT_CONNECTED。详见[V1.4 code suite日志](../evidence/audits/2026-10-10-v14-web-rejection-code-suite-a01.log)及exit/SHA sidecar。该代码门禁不覆盖全规则OD-014、Mac/Ubuntu实机或人工验收。

正式V1门禁a582（纳入上述完整V1.4 code suite与阶段/验收/crosswalk同步后）：V1仍`INCOMPLETE`/exit 2，`uncheckedVersionGate=true`；五阶段文档审计PASS，证据审计PASS（1257引用、172份Manifest、311项）。四个历史Run结构化导出、OD-013/014与旧Run决定、活动/全域配对恢复、Mac睡眠唤醒、Ubuntu实机及当前范围人工验收仍未完成。[a582日志](../evidence/audits/2026-10-10-v1-version-gate-a582.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a582.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a582.log.sha256)。
2026-10-10 V1收尾状态复核：将V1.4正式Web拒绝路径及最新交叉索引纳入后，正式门禁a584仍为INCOMPLETE/exit 2；五阶段文档审计PASS、证据审计PASS（1258引用、172份Manifest、311项），但4个历史TestRun缺结构化导出，OD-013/014与旧Run处置、活动/全域恢复、Mac睡眠唤醒、Ubuntu实机及当前范围人工验收仍开放。[a584门禁日志](../evidence/audits/2026-10-10-v1-version-gate-a584.log)。主执行计划已同步为a584；当前结论不构成V1完成，也不替代待办的外部证据与用户验收。
2026-10-10 P1/A04 Quant→Qlib Worker调用映射增量：补录V1.2 `probeQlibWorker`与`fitQlibFixtureInWorker`实际生产调用、专属Bearer/120秒拟合超时及V2.3摘要train/validate边界；交叉索引V1.1-S2-L14增加准确客户端测试与运行证据（147项需求、1699路径引用/596目标、205精确测试名、147锚点通过）。完整V1.2 code suite受控重跑exit 0：基线脚本66/66、Qlib Worker 14/14、Quant Research 101项、真实Qlib 0.9.6容器、四场景Web/API/CLI same-TestRun与恢复通过，临时资源清理通过。E2E中代理曾报告`socket hang up`，但套件最终报告PASS，原始输出保留。[阶段§8.32](./prd/v1-local-simulation/01-environment-and-web-center.md#832-quant-researchqlib-worker生成客户端v1调用边界2026-10-10)、[矩阵A19](../evidence/audits/2026-10-10-v1-cross-service-route-matrix-a19.md)、[code suite日志](../evidence/audits/2026-10-10-v12-qlib-worker-client-inventory-code-suite-a01.log)。该增量只完成一条调用边映射和隔离回归，不关闭A04/P1或V1整体。
2026-10-10 A19后正式门禁a585：五阶段文档审计PASS，证据审计PASS（1262引用、173份Manifest、312项），V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。四个历史TestRun结构化导出、OD-013/014与旧Run处置、活动与全域恢复、Mac睡眠唤醒、Ubuntu实机和当前范围人工验收仍未完成。[a585日志](../evidence/audits/2026-10-10-v1-version-gate-a585.log)，[exit](../evidence/audits/2026-10-10-v1-version-gate-a585.exit.txt)，[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a585.log.sha256)。
正式V1门禁a586：计划/进度、A19矩阵与crosswalk更新后复核，文档与证据审计PASS（1262引用、173份Manifest、312项），版本仍INCOMPLETE/exit 2。四个历史Run结构化导出、所有者决策/旧Run处置、活动及全域恢复、Mac睡眠唤醒、Ubuntu实机和本人当前范围验收仍未满足。[a586日志](../evidence/audits/2026-10-10-v1-version-gate-a586.log)，[exit](../evidence/audits/2026-10-10-v1-version-gate-a586.exit.txt)，[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a586.log.sha256)。
2026-10-10 P1/A04 Trade→Governance Historical Replay授权消费映射：补录Trade以专属身份在FakeBroker执行前验证BACKTEST/FAKE授权的生成客户端调用，精确断言URL、Bearer、Content-Type、命令载荷、AbortSignal和5秒超时；定向1/1、受控完整V1.4 code suite exit 0（Trade 99/99、Replay 27/27、Governance 43/43，隔离三服务HTTP/PG、FakeBroker/Portfolio账本对照和Artifact fencing通过，资源清理完成）。Crosswalk通过147项/1699路径/597目标/206精确测试/147锚点。详见[V1.4 §8.76](./prd/v1-local-simulation/04-daily-backtest.md#876-tradegovernance-historical-replay授权验证客户端合同2026-10-10)、[矩阵A20](../evidence/audits/2026-10-10-v1-cross-service-route-matrix-a20.md)、[完整套件日志](../evidence/audits/2026-10-10-v14-trade-replay-governance-client-contract-code-suite-a01.log)。该调用边子项不关闭P1/A04或V1整体。
2026-10-10 正式V1门禁a587（A20及阶段/测试计划/crosswalk同步后）：五阶段文档审计PASS，证据审计PASS（1267引用、174份Manifest、313项）；整体V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。四个历史TestRun结构化导出、OD-013/014与旧Run处置、活动/全域恢复、Mac睡眠唤醒、Ubuntu实机及当前范围人工验收继续未满足。[a587门禁](../evidence/audits/2026-10-10-v1-version-gate-a587.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a587.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a587.log.sha256)。

2026-10-10 P1/A04 Platform→Governance V1.2策略快照调用补齐生成客户端：`receiveV12StrategySnapshot`从手写HTTP适配改由OpenAPI生成客户端承载；生成/漂移检查注册完成，直接路径、Platform身份/Bearer、Content-Type、body、超时测试2/2，Platform typecheck及`contracts:check`通过。完整V1.2 code suite受控运行exit 0：基线66/66、Platform 67文件/326测试、Market Data集成28/28、真实锁版Qlib、隔离Web/API/CLI四Run（normal/rejection/cancel/平台重启恢复）同Run核验通过，临时资源清理通过。受限沙箱loopback EPERM失败和正式运行中一次`socket hang up`均保留日志；最终重启恢复场景PASS。详见[阶段§8.45](prd/v1-local-simulation/02-small-data-and-qlib.md#845-platformgovernance-v12策略快照生成客户端合同2026-10-10)、[A21调用映射](../evidence/audits/2026-10-10-v1-cross-service-route-matrix-a20.md)、[code suite日志](../evidence/audits/2026-10-10-v12-governance-snapshot-generated-client-code-suite-a02.log)。此单边映射不关闭P1/A04或V1版本验收。

正式V1门禁a588（V1.2 Platform→Governance生成客户端、阶段测试计划/crosswalk更新后）：五阶段文档审计PASS，证据审计PASS（1268引用、174份Manifest、313项），版本仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。缺口仍包括4个历史TestRun结构化导出、OD-013/014与旧Run决策、活动/全域配对恢复、Mac睡眠唤醒、Ubuntu真实主机及当前范围人工验收。[a588门禁日志](../evidence/audits/2026-10-10-v1-version-gate-a588.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a588.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a588.log.sha256)。

正式V1复核a589：最新计划和进度同步后，五阶段文档审计PASS、证据审计PASS（1268引用、174份Manifest、313项）；V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。V1.2生成客户端工作已归档，但既有历史Run导出、业务决定/旧Run处置、活动与宿主恢复、Ubuntu实机及当前范围本人验收仍缺。[a589日志](../evidence/audits/2026-10-10-v1-version-gate-a589.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a589.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a589.log.sha256)。

正式V1门禁a590（A06主矩阵纳入A21调用边后）：五阶段文档及证据审计PASS（1268引用、174份Manifest、313项），V1仍INCOMPLETE/exit 2。A06、A21、V1.2阶段、测试计划及crosswalk已同步记录该生成客户端子项；P1/A04完整矩阵仍OPEN，历史导出、业务决定、活动/宿主恢复、Ubuntu实机与本人验收未满足。[a590日志](../evidence/audits/2026-10-10-v1-version-gate-a590.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a590.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a590.log.sha256)。

正式V1复核a591：A06主矩阵及a590状态记录同步后复验，五阶段文档与证据审计PASS（1268引用、174份Manifest、313项），版本仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`。最新调用映射工作不改变整体验收；历史结构化导出、OD-013/014/旧Run决策、活动数据和主机恢复、Ubuntu实机及本轮人工验收仍未满足。[a591日志](../evidence/audits/2026-10-10-v1-version-gate-a591.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a591.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a591.log.sha256)。

2026-10-10 P0/A04矩阵一致性补录：确认V1.2 `getV12ResearchFixturePreview`在`V12Acceptance`及Platform数据预览路由有实际调用，并已有直接路径/身份/body/超时单测与完整套件证据；A06主表已补全，与详细operation映射一致。docs:check 8803条链接通过，crosswalk 147项需求、1707引用、207精确测试、147锚点通过。只修正调用边摘要完整性，不关闭P0/P1/V1。

正式V1门禁a592：A06调用摘要和当前进度同步后，五阶段文档/证据审计PASS（1268引用、174份Manifest、313项），V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。当前仍需历史Run原始导出、未决业务/旧Run决策、活动和宿主恢复、Ubuntu实机及用户本人验收。[a592门禁](../evidence/audits/2026-10-10-v1-version-gate-a592.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a592.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a592.log.sha256)。

2026-10-10 P0/P1/A04调用范围校准A22：A06原将Platform→Historical Replay Worker误列为V1.4生产调用。代码确认V1.4正式控制器仅调用Quant日线Backtest；Platform多BarReplay生产消费者是`stageId=V2.3`控制器，single-bar start/recover helper当前无生产调用点。V1.4阶段要求的Replay Worker→Trade/Portfolio/Governance服务级隔离验证和Worker客户端测试保留；明确不等同正式V1.4 Web接线。A06、§8.76与crosswalk已校正，移除V2.3 Platform客户端测试的V1精确映射，保留V1.4 Worker服务边。Crosswalk 147项/1708路径/604目标/205精确测试/147锚点通过。详情见[A22范围审计](../evidence/audits/2026-10-10-v1-replay-client-stage-scope-a22.md)。

正式V1门禁a593：A22跨版本消费者范围校准、A06与crosswalk同步后，五阶段文档审计PASS，证据审计PASS（1269引用、174份Manifest、313项）；版本仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`。历史TestRun导出、OD-013/014/旧Run决策、活动恢复、Mac睡眠唤醒、Ubuntu实机及当前范围本人验收仍缺。[a593日志](../evidence/audits/2026-10-10-v1-version-gate-a593.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a593.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a593.log.sha256)。

2026-10-10 V1.2客户端测试质量加固：策略快照生成客户端测试不再将缺owner/artifact/data/strategy等schema必填属性的对象强制断言为类型；改用完整`V12StrategySnapshotCommand`合法输入并断言其精确JSON body。定向2/2、Platform typecheck与合同生成/漂移检查通过（30个client generators登记）。证据见[执行日志](../evidence/audits/2026-10-10-v12-snapshot-valid-command-tests-a01.log)和[SHA-256](../evidence/audits/2026-10-10-v12-snapshot-valid-command-tests-a01.log.sha256)。仅提升客户端测试真实性，V1整体门禁仍未通过。

正式V1门禁a594：V1.2客户端测试改为schema完整命令并将A22范围校准纳入追踪后，五阶段文档审计PASS、证据审计PASS（1270引用、174份Manifest、313项）；V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。历史导出、未决业务/旧Run决策、活动及主机恢复、Ubuntu实机和本人验收仍待满足。[a594日志](../evidence/audits/2026-10-10-v1-version-gate-a594.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a594.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a594.log.sha256)。

2026-10-10 P5当前树全服务数据库/Artifact卷隔离恢复复验：`pnpm test:backup:cluster-isolated` exit 0；恢复全部10个数据库/角色、合成TestRun—FakeBroker订单/Fill/Outbox—Portfolio双账本/持仓关联及已发布ArtifactRef和精确字节SHA-256，随机隔离资源已删除、活动项目/卷触碰0。[V1.5 §8.40](./prd/v1-local-simulation/05-scheduling-and-recovery.md#840-当前树全服务数据库与artifact卷配对备份隔离复验2026-10-10)、[机器报告](../evidence/audits/2026-10-10-v1-isolated-cluster-paired-backup-684635a15dda4aea.json)。仅证明当前备份工具对合成配对数据的恢复；不证明真实服务生成的V1业务状态、Qlib/Quant报告、NATS/Temporal同点、活动/宿主/异地、Ubuntu或RPO/RTO；P5和整版验收仍OPEN。

正式V1门禁a596（当前树全服务数据库/Artifact卷隔离恢复证据及V1.5阶段、测试计划、验收表和crosswalk同步后）：V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`；五阶段文档审计PASS，证据审计PASS（1272引用、174份Manifest、313项）。历史TestRun结构化导出、OD-013/014及旧Run处置、真实V1业务产物/同点NATS-Temporal/宿主恢复、Mac睡眠唤醒、Ubuntu实机和本轮用户验收仍未满足。[a596门禁](../evidence/audits/2026-10-10-v1-version-gate-a596.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a596.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a596.log.sha256)。

2026-10-10历史TestRun恢复源追加只读复核：现有`stockquant-v12` Platform API在精确owner-scoped V1.2/V1.5运行查询中四个历史UUID均返回404，未保存响应正文、未修改或重启活动容器，也未恢复导出。机器记录见[只读API复核](../evidence/audits/2026-10-10-v1-current-history-test-run-api-recheck-a01.json)及[历史恢复源审计更新](../evidence/audits/2026-10-07-v1-history-run-recovery-check.md)。仅证明当前本地API缺少这些记录，不排除外部/离线备份；不得重建或用新Run替代。

正式V1门禁a598（修正新增门禁SHA sidecar格式并纳入当前本地API历史Run只读复核后）：V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`；五阶段文档审计PASS，证据审计PASS（1276引用、175份Manifest、314项）。a597曾因a596 SHA sidecar缺少文件名字段导致证据审计FAIL，原始失败日志保留；已改为标准`shasum -a 256 <file>`格式并由a598复验。历史TestRun导出、OD-013/014/旧Run决策、实际V1产物及活动/同点恢复、Mac/Ubuntu环境和人工验收仍未满足。[a598日志](../evidence/audits/2026-10-10-v1-version-gate-a598.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a598.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a598.log.sha256)。

2026-10-10 P5恢复Harness新增V1.2 Qlib ArtifactRef与共享卷字节配对：Platform数据库中合成V1.2 Run/owner绑定的PUBLISHED `qlib_fixture_artifacts`引用，与内容寻址Artifact字节共同备份；隔离恢复后Research/Qlib两条Published引用均精确匹配SHA-256，既有跨库V1.3交易事实关系通过，10库/角色恢复及临时资源清理通过。[V1.5 §8.41](./prd/v1-local-simulation/05-scheduling-and-recovery.md#841-v12-qlib-artifactref与共享字节卷配对恢复2026-10-10)，[报告](../evidence/audits/2026-10-10-v1-isolated-cluster-paired-backup-a15c94ce9cc0449b.json)。此为合成Fixture恢复，不证明真实Qlib流、旧JSONB、V1.4 Quant报告、同点NATS/Temporal、活动/异地/Ubuntu或RPO/RTO；V1仍未完成。

正式V1门禁a599（V1.2 Qlib ArtifactRef/共享卷字节配对恢复证据纳入后）：V1仍INCOMPLETE/exit 2且`uncheckedVersionGate=true`；五阶段文档审计PASS，证据审计PASS（1281引用、176份Manifest、315项）。P5合成Qlib Artifact恢复切片通过但不代表实际服务产物、完整V1/同点队列恢复、Ubuntu或人验。四个历史TestRun结构化导出、OD-013/014及旧Run处置、活动/宿主恢复、Mac睡眠唤醒、Ubuntu实机和本轮本人验收仍未满足。[a599日志](../evidence/audits/2026-10-10-v1-version-gate-a599.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a599.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a599.log.sha256)。

2026-10-10 P5恢复配对增量：隔离备份/恢复Harness加入合成V1.4 Quant BacktestRun/Manifest与Platform TestRun报告投影/ArtifactRef配对，恢复后的内容Hash、run/owner/status关系、ArtifactRef一致性通过；同时保留V1.2 Qlib/Research Artifact字节及V1.3跨库订单/Fill/Outbox/Portfolio核验。10库/角色恢复和随机隔离资源精确清理通过，活动项目/卷触碰0。证据：[V1.5 §8.42](prd/v1-local-simulation/05-scheduling-and-recovery.md#842-v14-quant回测结果manifest与platform-testrun报告配对恢复2026-10-10)、[机器报告](../evidence/audits/2026-10-10-v1-isolated-cluster-paired-backup-765778dbb0e74e55.json)。Harness直接写入合成数据，不证明真实服务产物或全链路/宿主恢复。

正式V1门禁a602：五阶段文档审计PASS，证据审计PASS（1286引用、177份Manifest、316项）；整体INCOMPLETE/exit 2，`uncheckedVersionGate=true`。仍未解决4个历史TestRun结构化导出、OD-013/014和旧Run处置决策、真实业务/同点NATS-Temporal/活动与主机恢复、Mac睡眠唤醒、Ubuntu实机及本轮本人验收。[门禁日志](../evidence/audits/2026-10-10-v1-version-gate-a602.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a602.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a602.log.sha256)。

最终正式门禁a603：阶段文档与证据审计PASS（1289引用、178份Manifest、317项），但全V1仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`。a601曾因新日志sidecar路径错误失败；修复a600/a601 sidecar后a603复核通过。仍缺四个历史Run原始结构化导出、OD-013/014/旧Run决策、真实V1服务状态及同点/宿主恢复、Mac睡眠唤醒、Ubuntu实机和当前范围用户本人验收。[a603日志](../evidence/audits/2026-10-10-v1-version-gate-a603.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a603.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a603.log.sha256)。

2026-10-10 计划状态校准：收尾计划P0行交叉索引计数已按当前`pnpm crosswalk:check`结果更新为147/147需求、1713路径引用、607目标、205精确测试名、147锚点，PASS（源索引SHA-256 `ed2f6465386b71ccba48279f16f66138465bad5725bae61aa496c211d59c3e00`）。另将P1历史叙述中“仍未提供统一部署前迁移CLI”标为已被a84及各阶段迁移套件证据取代：`pnpm db:migrate:v1`现已存在并覆盖V1.1–V1.5隔离数据库验证；通用down-migration仍未提供，按Runbook逐库备份/隔离恢复回退，活动库未操作且未授权。历史日志保留原文，不将当时状态改写为当前状态。P0语义充分性、P1调用/发布矩阵与活动切换、P2–P6剩余工程和验收仍OPEN。

正式V1门禁a604（P0/P1当前状态校准后）：五阶段文档与证据审计PASS（1292引用、179份Manifest、318项），整体仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`。当前交叉索引147项、1713路径引用/607目标、205精确测试、147锚点检查PASS；迁移CLI已实现但完整P1、历史证据/决定、环境和人工验收仍未满足。[a604日志](../evidence/audits/2026-10-10-v1-version-gate-a604.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a604.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a604.log.sha256)。

2026-10-10 V1.5刷新/Platform进程崩溃自动恢复通过：随机Compose项目`sq-v15-e2e-df1ddabd2e4498763cd4`完成normal/AUTO/rejection/recovery四场景Web/API/CLI/export，Playwright 3/3；normal Run在新页面恢复同一TestRun，Platform API真实Node PID 1于CN_A Temporal Activity运行中被SIGKILL后由`unless-stopped`自动重启，原Workflow完成120项观察，随后同Run CLI/export通过。四个Run ID、完整故障序列、源码SHA、固定输入和资源清理记录见[V1.5 §8.43机器报告](../evidence/audits/2026-10-10-v15-nats-temporal-dispatch-sq-v15-e2e-df1ddabd2e4498763cd4.json)，报告SHA-256 `d38f151e4e36a04ab179aa87cbcbae47e830ad44646e6174b8c0a9bf71ccc920`；刷新失败诊断使Playwright限时等待15秒并附API状态/响应上下文。两次错误注入尝试均保留为失败证据并已清理隔离项目。保留的交互栈未重启/改写（其Platform API仍为OOM退出且有WAITING Run）；当前子项不改变阶段/版本人工验收NOT_RUN。§8.43已同步测试计划、验收表及P5计划摘要。Crosswalk复核PASS（147项、1717路径引用/609目标、205精确测试、147锚点；源SHA `9c52232dadf92a8394827fd176f635d19a44fef90a5e33a4e1c68d15628a9beb`）；docs:check通过8915个链接、5阶段编号。正式门禁待重跑。


正式V1门禁a605（纳入§8.43刷新/Platform PID 1崩溃恢复、测试计划、验收表、P5计划摘要及crosswalk更新后）：五阶段文档审计PASS；证据审计PASS（1300引用、181份Manifest、320项）；V1仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`。TestRun证据审计11个ID中7个PASS、4个历史导出缺失：V1.2 `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`，V1.5 `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`。其他阶段工程、OD-013/014与旧Run决定、实际恢复/目标环境及用户本人验收仍开放。[a605门禁日志](../evidence/audits/2026-10-10-v1-version-gate-a605.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a605.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a605.log.sha256)。


2026-10-10正式V1门禁a606（记录a605并复核当前树后）: 五阶段文档审计PASS；证据审计PASS（1303引用、182份Manifest、321项）；V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。11个被要求核验的TestRun中7个结构化证据包PASS，另有4个历史Run导出缺失：V1.2 `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`，V1.5 `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`。不得以新TestRun替代历史导出；OD-013/014、旧Run处置、全域/宿主恢复、Mac睡眠唤醒、Ubuntu实机和当前范围人工签署仍按计划开放。[a606门禁日志](../evidence/audits/2026-10-10-v1-version-gate-a606.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a606.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a606.log.sha256)。
2026-10-10 V1.5保留栈API恢复与同Run核查：精确Platform API容器原为OOM退出（137），已将其restart policy设为`unless-stopped`并只启动该容器；Web/API恢复200，未改数据库/Run、未动其他容器或卷。原normal TestRun `1f9b8fd0-9a51-45eb-803d-b613bbd8d126`的同Run `--check-only`为GET-only，exit 2：系统调度断言WAITING/NOT_RUN，HOLD观察PASS（120条、0订单/Fill），Run仍WAITING。详见[V1.5 §8.44](prd/v1-local-simulation/05-scheduling-and-recovery.md#844-保留v15栈platform-api恢复与同run只读核查2026-10-10)、[API恢复快照](../evidence/audits/2026-10-10-v15-platform-api-recovered-live-stack-a01.json)和[CLI摘要](../evidence/audits/2026-10-10-v15-retained-normal-run-checkonly-a01.json)。当前正式V1门禁仍未通过；历史TestRun导出、OD-013/014及旧Run处置、完整恢复、Mac/Ubuntu实机和本人验收仍未完成。

正式V1门禁a607（保留栈API恢复、check-only核查、§8.44与交叉索引更新后）：五阶段文档审计PASS，证据审计PASS（1312引用、184份Manifest、323条目），但V1仍INCOMPLETE/exit 2且`uncheckedVersionGate=true`。11个指定TestRun中7个结构化证据包PASS，4个历史导出缺失（V1.2 1个、V1.5 3个）；OD-013/014与旧Run决定、完整恢复、Mac睡眠唤醒、Ubuntu实机及本人验收仍未满足。[a607日志](../evidence/audits/2026-10-10-v1-version-gate-a607.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a607.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a607.log.sha256)。

正式V1门禁a608（同步a607结果并最终复核）：阶段文档审计PASS，证据审计PASS（1315引用、185份Manifest、324项）；版本仍INCOMPLETE/exit 2且`uncheckedVersionGate=true`。四个历史TestRun结构化导出仍缺；本次栈恢复未改变该门禁结论。[a608日志](../evidence/audits/2026-10-10-v1-version-gate-a608.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a608.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a608.log.sha256)。

2026-10-10 P1/A04生成客户端合同增量：发现V1.1/V1.3对账真实调用的`recordSimulatedFakeBrokerExternalOrder`虽已有E2E路径，但生成客户端缺直接合同测试。补充POST路由/完整请求体/Platform Bearer身份/Content-Type/AbortSignal/响应透传断言；Platform API 67文件327项及typecheck通过，完整V1.3 code suite受控退出0，迁移、隔离HTTP/PG、Web/API/CLI和资源清理均通过。沙箱首次因loopback `EPERM`失败留存a01，受控重跑a02通过。证据见[V1.1 §8.33](prd/v1-local-simulation/01-environment-and-web-center.md#833-platformtrade-execution外部fakebroker订单观察客户端合同2026-10-10)、[V1.3 §8.77](prd/v1-local-simulation/03-fake-broker-trading-loop.md#877-外部fakebroker订单观察生成客户端合同回归2026-10-10)及[a02日志](../evidence/audits/2026-10-10-v13-external-order-client-contract-code-suite-a02.log)，SHA-256 `81a35eca7469e7b025144629e1d70baa7f6b8cb57f2ec275e124424288470545`。Crosswalk正补登记此测试；P1/A04与P3、V1整体继续OPEN。

P0/A04追踪索引已同步本轮客户端操作合同：Crosswalk PASS（147/147需求、1726路径引用/616目标、206精确测试、147锚点；0缺失/失配/过期），源SHA-256 `c1ef4052c74cc10123ee4401bfc45244df8218dc54e20b76fa7dec39ff6e15ed`。`docs:check`通过8977条链接、5阶段编号无重复。该索引状态校验不证明P1/P3父项或业务验收通过。

正式V1门禁a609（P1/A04新增外部FakeBroker订单观察客户端合同、阶段/测试计划/验收及Crosswalk同步后）：阶段文档审计PASS，证据审计PASS（1323引用、187份Manifest、326条目），V1仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`。指定历史TestRun结构化导出、OD-013/014与旧Run处置、活动/全域恢复、Mac睡眠唤醒、Ubuntu实机和本人验收均仍开放。[a609日志](../evidence/audits/2026-10-10-v1-version-gate-a609.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a609.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a609.log.sha256)。

正式V1门禁a610（V1.1/V1.3第2/7节增量交付勾选及§8.33/§8.77、测试计划同步后）：五阶段文档审计PASS，证据审计PASS（1326引用、188份Manifest、327条目）；V1仍INCOMPLETE/exit 2且`uncheckedVersionGate=true`。历史Run导出、OD决策/旧Run处置、完整恢复、Mac/Ubuntu环境和本人验收继续未满足。[a610日志](../evidence/audits/2026-10-10-v1-version-gate-a610.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a610.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a610.log.sha256)。

2026-10-10 P1/A04 Trade→Governance V1.3授权客户端合同增量：确认MANUAL/sequenced MANUAL执行真实依赖的Proposal owner范围读取、授权创建、授权校验三条生产操作缺直接合同测试。新增3项逐操作断言，锁定编码路径、Trade服务Bearer、owner身份头、类型化请求体、5秒超时及响应透传；定向3/3、Trade typecheck、完整隔离V1.3 code suite exit 0。迁移、HTTP/PG、Web/API/CLI和清理通过。详见[V1.3 §8.78](prd/v1-local-simulation/03-fake-broker-trading-loop.md#878-trade→decision-governance-v13授权客户端操作合同2026-10-10)、[完整套件](../evidence/audits/2026-10-10-v13-trade-governance-client-contract-code-suite-a01.log)，SHA-256 `c9c0419b2620f9c0957da81d1d8b006c513cc03fd2ca76ebff2ab105dbc739bb`。P1/A04和P3全接受路径/副作用父项仍OPEN。

P0/A04 Crosswalk同步Trade→Governance三项直接测试及证据后复核通过：147/147需求、1730路径引用/620目标、209精确测试名、147锚点；0缺失、0失配。Crosswalk源SHA-256 `84a00123585bb4dae85cc74a1abb560ad293d2e5162f157ea08179bf92ca8a67`。`docs:check`通过9002链接、5阶段编号唯一；追踪结构通过不等同于P1/P3父项验收。

正式V1门禁a611（Trade→Governance授权生成客户端合同、V1.3第2/7/8节、测试计划、验收和Crosswalk同步后）：五阶段文档审计PASS，证据审计PASS（1331引用、189份Manifest、328项）；V1仍INCOMPLETE/exit 2且`uncheckedVersionGate=true`。4个历史Run结构化导出、OD-013/014与旧Run决策、P1–P6其余工程/环境及本人验收仍未满足。[a611日志](../evidence/audits/2026-10-10-v1-version-gate-a611.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a611.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a611.log.sha256)。

2026-10-10 V1.4 P4固定限制规则贯通：Trade历史执行契约增加OHLC、交易状态、涨跌停价；完整bar进入Governance授权Hash和FakeBroker幂等指纹。冻结`fixtures/v1/v1.4/market_restrictions_synthetic.csv`（SHA-256 `45413145031d48c74f0592dbe450a68081f4e0e22e769e8d8b4ddf2ffd57e52a`）的停牌/涨停封板BUY通过隔离Governance→Trade→Portfolio HTTP/PostgreSQL拒单、同命令重放和预留释放，无Fill/Fill Outbox；Trade领域测试另覆盖跌停SELL与正常bar。定向12/12、typecheck、`contracts:check`、完整V1.4 code suite exit 0；随机资源清理通过。[V1.4 §8.77](./prd/v1-local-simulation/04-daily-backtest.md#877-冻结市场限制fixture贯通trade-paper拒绝路径2026-10-10)、[套件日志](../evidence/audits/2026-10-10-v14-market-restrictions-paper-code-suite-a03.log)、SHA-256 `49ac542309adda7092d2fcd492b7c217473bd8b18762ef3031eabf5af70d3c59`。Crosswalk PASS：147项、1732路径引用/622目标、210精确测试、147锚点。正式V1门禁a612仍INCOMPLETE/exit 2；证据审计PASS（1338引用、191 Manifest、330项），4个历史TestRun结构化导出、OD-013/014及旧Run处置、活动/全域恢复、Mac/Ubuntu目标环境与当前范围人工验收仍未满足。[a612日志](../evidence/audits/2026-10-10-v1-version-gate-a612.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a612.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a612.log.sha256)。

正式V1门禁a613（V1.4 §8.77、测试计划、阶段交付和crosswalk锚点更新后复核）：五阶段文档审计PASS、证据审计PASS（1341引用、192份Manifest、331项）；整体V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。四个历史TestRun结构化导出、OD-013/014与旧Run处置、活动/全域恢复、Mac睡眠唤醒、Ubuntu实机及当前范围人工验收未满足。[a613日志](../evidence/audits/2026-10-10-v1-version-gate-a613.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a613.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a613.log.sha256)。

2026-10-10 V1.4契约兼容回归：新增Paper限制字段后再次执行`pnpm test:e2e -- --stage V1.4` exit 0；Playwright 7/7、API创建与10个浏览器创建Run经相同TestRun ID CLI `--check-only`核验，临时容器/卷/网络移除确认。[日志](../evidence/audits/2026-10-10-v14-market-restrictions-paper-web-e2e-a01.log)、SHA-256 `0025ebf78ab2c022a17dd8334cbe16787fb8d99d8a77e9d68d176bd8d6c58381`。这只是现有页面兼容回归，不是新增限制拒单的浏览器场景验收；完整业务范围仍未关闭。

正式V1门禁a614（含V1.4 Paper限制契约后的7/7 Web/API/CLI兼容复验记录）：五阶段文档审计PASS，证据审计PASS（1346引用、193份Manifest、332项），V1仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`。四个历史TestRun结构化导出、OD-013/014与旧Run处置、活动/全域恢复、Mac睡眠唤醒、Ubuntu实机及当前范围人工验收仍未满足。[a614日志](../evidence/audits/2026-10-10-v1-version-gate-a614.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a614.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a614.log.sha256)。

2026-10-10 V1.4 P4市场限制继续收口：同一冻结Fixture中的停牌BUY、锁涨停BUY、锁跌停SELL现均通过隔离Governance授权→Trade Paper HTTP拒单与同命令幂等重放；BUY场景释放2个真实Portfolio Reservation，SELL场景无持仓/Reservation且不声称可卖量已验证。完整V1.4 code suite a04 exit 0，Trade定向12/12、typecheck、contracts检查通过，资源精确清理；既有V1.4 Web/API/CLI E2E 7/7兼容复验通过。[§8.77](./prd/v1-local-simulation/04-daily-backtest.md#877-冻结市场限制fixture贯通trade-paper拒绝路径2026-10-10)、[a04套件](../evidence/audits/2026-10-10-v14-market-restrictions-paper-code-suite-a04.log)、[Web兼容E2E](../evidence/audits/2026-10-10-v14-market-restrictions-paper-web-e2e-a01.log)。Crosswalk PASS（147项/1734路径/624目标/210精确测试/147锚点）；文档链接9043/0失败。正式门禁a615证据审计PASS（1350引用、195 Manifest、334项），五阶段文档审计PASS，但整体仍INCOMPLETE/exit 2；历史TestRun导出、OD-013/014与旧Run决定、实际活动/全域恢复、Mac/Ubuntu环境和当前范围人工验收仍待。[a615日志](../evidence/audits/2026-10-10-v1-version-gate-a615.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a615.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a615.log.sha256)。

正式V1门禁a616（同步V1.4 §8.77和V1版本计划摘要后复核）：五阶段文档审计PASS，证据审计PASS（1352引用、196份Manifest、335项），V1仍INCOMPLETE/exit 2、`uncheckedVersionGate=true`。Crosswalk 147项/1734路径/624目标/210测试名/147锚点PASS。仍未满足4个历史TestRun结构化导出、OD-013/014与旧Run决定、活动/全域恢复、Mac睡眠唤醒、Ubuntu实机及当前范围人工验收。[a616日志](../evidence/audits/2026-10-10-v1-version-gate-a616.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a616.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a616.log.sha256)。

2026-10-10 P0差异矩阵增量A32：从历史草稿A31派生，只更新V1.4-S2-L15当前来源锚点、Trade Paper限制HTTP证据和剩余缺口；保持`DRAFT_DERIVED_REQUIRES_MANUAL_RECONCILIATION`与P4 OPEN，不误作147项全量语义复核。[矩阵A32](../evidence/audits/2026-10-10-v1-current-gap-matrix-a32.json)，SHA-256 `590bb865b9fdbbce72258c9cdec2cc4b72ad98af786de1c163bc20817fd761ca`。

正式V1门禁a617（A32差异快照增补后）：五阶段文档审计PASS，证据审计PASS（1355引用、197份Manifest、336项），Crosswalk保持PASS；V1仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。A32仍是仅更新V1.4-S2-L15的派生草稿，147条语义覆盖尚未人工逐项复核。4个原始TestRun导出、OD-013/014和旧Run处置、活动/目标恢复、Mac/Ubuntu及当前范围用户验收仍开放。[a617日志](../evidence/audits/2026-10-10-v1-version-gate-a617.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a617.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a617.log.sha256)。

2026-10-10 正式门禁复核a618：按当前工作树重新执行`pnpm verify:version -- --version V1`，五阶段文档审计PASS，证据审计PASS（1358引用、198份Manifest、337项）；V1仍INCOMPLETE/exit 2。四个历史TestRun原始结构化导出缺失；OD-013/014与3条旧非终态Run处置、全域恢复、Mac睡眠唤醒、Ubuntu实机和阶段剩余工程项继续OPEN，且人工验收未签署。[a618日志](../evidence/audits/2026-10-10-v1-version-gate-a618.log)，[exit](../evidence/audits/2026-10-10-v1-version-gate-a618.exit.txt)，SHA-256 `7f7d5e2bc607a01f981f4aabbd6b353fea72d40f5d720da17ff17774ac499509`。本轮只刷新门禁证据，不代表V1完成。

正式门禁复核a619：在进度、计划追加a618记录后重跑，五阶段文档审计PASS，证据审计PASS（1358引用、198份Manifest、337项）；V1仍INCOMPLETE/exit 2，147条需求交叉追踪结构检查PASS但不替代P0逐项语义复核。历史Run导出、OD-013/014及旧Run处置、工程/环境恢复和本人验收仍未满足。[a619日志](../evidence/audits/2026-10-10-v1-version-gate-a619.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a619.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a619.log.sha256)。

2026-10-10 P0逐项复核：人工对照V1.2-S2-L20当前源行、Platform V1.2创建路由的严格`scenarioId/seed`字段白名单，以及隔离HTTP/PostgreSQL套件日志。四种客户端模式组合均返回422，数据库V1.2 TestRun数保持不变；确认此原子路由要求PASS，并更新派生差异矩阵A37。补入90-test-plan后，交叉索引首次复查发现该V1.2源行锚点文字过期（失败保留见[失败日志](../evidence/audits/2026-10-10-v1-crosswalk-current-a03-failure.log)）；刷新锚点后147条需求/1735路径引用/625目标/210精确测试/147锚点校验通过，详见[a04](../evidence/audits/2026-10-10-v1-crosswalk-current-a04.log)。V1全局模式路由矩阵与P0其余146项仍未完成语义复核；版本门禁仍开放。[矩阵A37](../evidence/audits/2026-10-10-v1-current-gap-matrix-a37.json)，SHA-256 `c1c6fa03348f6be75449f22502cc1bd6f39523f92e43b7d835f61e67535022a6`；[隔离E2E](../evidence/audits/2026-10-10-v12-mode-injection-e2e-a01.log)，SHA-256 `b16b42bc47336186c18c14e93c6b32f59cf0ef00e7e60582e3c388b7d367de94`。

正式门禁a620：上述单行语义复核、测试计划及Crosswalk锚点同步后，五阶段文档/证据审计PASS（1358引用、198份Manifest、337项），V1仍INCOMPLETE/exit 2。四个历史Run导出、OD-013/014及旧Run处置、P0余项、各阶段工程与恢复、目标主机验证和当前范围人工验收仍开放。[a620日志](../evidence/audits/2026-10-10-v1-version-gate-a620.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a620.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a620.log.sha256)。

2026-10-10 P0复核第二条：对V1.5-S2-L22逐项核验当前Platform路由的身份校验、`scenarioId/seed`严格白名单、持久化/派发顺序及四种模式HTTP/PG断言；四种均422且V1.5 Run行数不变。该原子要求PASS，差异矩阵更新至[A38](../evidence/audits/2026-10-10-v1-current-gap-matrix-a38.json)，SHA-256 `d3f23c05ae721da9a9229c067e949893dfc6d048589533968c122a3f7d34c04c`；V1.5自动测试映射已纳入[90-test-plan](prd/v1-local-simulation/90-test-plan.md)，Crosswalk检查147/147无缺失/漂移[a05](../evidence/audits/2026-10-10-v1-crosswalk-current-a05.log)。范围仅是V1.5创建入口，不关闭其余V1路由与Worker，也不关闭阶段、P0或版本门禁。

正式V1门禁a621：V1.5-S2-L22语义复核与阶段测试计划/交叉索引同步后，五阶段文档和证据审计PASS（1358引用、198份Manifest、337项），但V1仍INCOMPLETE/exit 2。历史结构化Run、所有者决定/旧Run处置、P0/P1–P6剩余项、环境/恢复和本人验收继续未满足。[a621日志](../evidence/audits/2026-10-10-v1-version-gate-a621.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a621.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a621.log.sha256)。

门禁a622（同步a621记录后复跑）：五阶段文档和证据审计仍PASS；版本仍INCOMPLETE/exit 2，四个缺失历史TestRun导出、OD-013/014与三条旧非终态Run决策、剩余工程/环境条件和用户本人验收未解决。[a622日志](../evidence/audits/2026-10-10-v1-version-gate-a622.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a622.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a622.log.sha256)。

2026-10-10 P0语义复核第三条：对照公共TestRun schema、V1.1 Platform本地DTO、创建/查询投影和V1.3/V1.5注入时钟消费路径。发现V1.1 DTO缺少公共契约必需模式/时钟字段且`error`与严格公共Schema不兼容；尚无证据证明V1运行时验证公共ClockContext。没有改API或推测兼容策略，V1.1-S2-L13及P0保持OPEN。运行时钟源代码与既有测试显示V1业务决策使用固定Fixture、持久化Run时钟或历史Bar时间戳；平台生命周期时间戳不作为业务决策时钟。[A39差异矩阵](../evidence/audits/2026-10-10-v1-current-gap-matrix-a39.json)、[语义/消费者核查](../evidence/audits/2026-10-10-v1-core-schema-clock-consumer-review-a01.md)、SHA-256 `90b97203d1d1a64e3765b75680436e82e26555b4154af3125f646b0cdd9e8b30`。更新来源锚点后Crosswalk a07通过（147需求、1738路径引用/628目标、210精确测试、147锚点）。

正式V1门禁a623（同步A39及执行记录后复跑）：五阶段文档审计PASS，证据审计PASS（1359引用、198份Manifest、337项）；整体仍INCOMPLETE/exit 2。四个历史TestRun结构化导出、待决OD-013/014及旧Run处置、P0/P1–P6剩余工程、实际主机/恢复验证和本人验收仍未满足。[a623日志](../evidence/audits/2026-10-10-v1-version-gate-a623.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a623.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a623.log.sha256)。

2026-10-10 P1/V1.1跨服务合同增量：实跑`pnpm contracts:check`退出0；203个Schema、类型生成及8个服务副本、30个客户端生成器漂移检查、111条兼容规则和OpenAPI检查通过，生成器注册测试2/2。此只关闭“生成器纳入生成与漂移门禁”子项，不证明V1-only调用方/身份/路由、发布/迁移完整性或运行时兼容，V1.1-S2-L14继续OPEN。追踪更新为[A40](../evidence/audits/2026-10-10-v1-current-gap-matrix-a40.json)，Crosswalk a09结构检查通过；[套件日志](../evidence/audits/2026-10-10-v1-contract-generator-drift-p1-a01.log)，SHA-256 `8accf21b54bf81703eace7226014bd6b91626521bfca2baa9e26664cc63978e7`。

正式V1门禁a624（追加P1客户端生成器子项证据后）：阶段文档与证据审计PASS（1361引用、198份Manifest、337项），版本仍INCOMPLETE/exit 2；四个历史Run导出、OD-013/014与旧非终态Run处置、P0和P1–P6剩余项、环境/恢复与本人验收继续开放。[a624日志](../evidence/audits/2026-10-10-v1-version-gate-a624.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a624.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a624.log.sha256)。

2026-10-10 P4/V1.4锁跌停SELL可卖量子项：新增独立冻结sell-chain Fixture v1，使用前一交易日真实BUY建仓；在后续交易日通过真实Trade/Portfolio/Governance隔离HTTP+PostgreSQL建立全部29股SELL Reservation，锁跌停SELL经授权后拒绝、同命令重放，Reservation释放，Portfolio持仓/现金/账本和FakeBroker独立资产保持不变。完整`pnpm verify:stage -- --stage V1.4 --suite code`受控exit 0。[§8.77](./prd/v1-local-simulation/04-daily-backtest.md#877-冻结市场限制fixture贯通trade-paper拒绝路径2026-10-10)，[a05套件日志](../evidence/audits/2026-10-10-v14-sellable-position-locked-sell-code-suite-a05.log)，SHA-256 `2d34986c8501ec37f42af944e9901dae1a892e383f18252c68e83a2a0c42c380`。此仅关闭固定锁跌停卖出预留/拒绝子项，市场完整规则、结算/应收OD-014、Quant/Paper全规则一致性和阶段验收保持OPEN。追踪矩阵更新为[A41](../evidence/audits/2026-10-10-v1-current-gap-matrix-a41.json)，Crosswalk a10通过（147项、1744路径引用/634目标、210精确测试、147锚点）。

正式V1门禁a625：文档审计PASS、证据审计PASS（1365引用、198份Manifest、337项），版本仍INCOMPLETE/exit 2。历史Run导出、OD-013/014及旧Run处置、其余P0/P1–P6工程、Mac/Ubuntu/恢复条件和本人验收仍开放。[a625日志](../evidence/audits/2026-10-10-v1-version-gate-a625.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a625.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a625.log.sha256)。

正式V1门禁a626（V1.4 P4锁跌停SELL真实持仓/预留证据、V1.4阶段摘要和验收记录同步后）：五阶段文档审计PASS，证据审计PASS（1368引用、199份Manifest、338项）；V1仍INCOMPLETE/exit 2。四个历史Run导出、OD-013/014和旧Run处置、P0/P1–P6剩余工程、环境/恢复及本人验收尚未满足。[a626日志](../evidence/audits/2026-10-10-v1-version-gate-a626.log)、[exit](../evidence/audits/2026-10-10-v1-version-gate-a626.exit.txt)、[SHA-256](../evidence/audits/2026-10-10-v1-version-gate-a626.log.sha256)。

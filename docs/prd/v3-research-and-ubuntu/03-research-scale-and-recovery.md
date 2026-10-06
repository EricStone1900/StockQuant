# V3.3 研究扩容、预算与持续运行

2026-10-06 验收页面能力描述校正：`/acceptance/v3/v3.3`此前将正式业务工作流描述为`PARTIAL_TWO_ROUND_FIXTURE_DISPATCH`，在双轮Fixture容器执行/结算、normal/recovery/rejection同Run独立断言完成后已过期。页面现准确列出隔离Fixture能力，并明确Paper连续性`NOT_CHECKED`、真实Provider/行情及人工验收尚未通过。Web typecheck和Playwright E2E 5/5通过；当前源码下完整V3.3 code suite exit 0。Web E2E使用mock API，不被解释为Web到运行服务的业务联测；跨服务业务断言由隔离双PostgreSQL/Runner suite独立证明。详情见[页面状态修订审计](../../../evidence/audits/2026-10-06-w7-v33-web-capability-boundary.md)、[机器摘要](../../../evidence/audits/2026-10-06-w7-v33-web-capability-boundary.json)和[源码/报告Hash（历史执行快照，绑定该次页面回归输入）](../../../evidence/audits/2026-10-06-w7-v33-web-capability-boundary.sha256)。

2026-10-06 W7预算拒绝业务断言：拒绝场景新增owner-scoped显式确认`POST .../runs/{testRunId}/verify-rejection`。在同一TestRun确认绑定50-cent cap后，以稳定幂等键尝试80-cent/两轮Fixture Experiment；仅将Research Automation明确返回`TestRun budget exhausted`的422视为预期拒绝。Platform随后读取完整预算总账和Runner队列，要求Experiment/预留/结算/UNKNOWN/model call计数及Job数均为0，再持久化`V3.3_REJECTION_NO_SIDE_EFFECTS=PASS`及完整证据。不可用响应保持待核验；意外成功或副作用记录FAIL；不清理/重试业务副作用。Web二次确认、CLI `--run RUN_ID --verify-rejection`、OpenAPI/Schema及Platform单测、CLI测试加入。完整V3.3 code suite exit 0：Platform 196 unit/8 PG、Research 217 unit/32 PG、CLI 1/1、Web E2E 4/4；真实隔离Platform/Research HTTP与双PostgreSQL smoke实际验证422及DB中allocation/model-call/Runner-job计数全为0。该PASS只关闭budget-rejection子断言；normal/recovery完整业务断言、正式证据导出、Paper连续性、Ubuntu及人工签收仍NOT_RUN，V3.3不关闭。见[拒绝场景审计](../../../evidence/audits/2026-10-06-w7-v33-rejection-business-assertion.md)、[机器报告](../../../evidence/audits/2026-10-06-w7-v33-rejection-business-assertion.json)、[完整suite日志](../../../evidence/audits/2026-10-06-w7-v33-rejection-business-assertion-full-suite.log)及[历史执行快照 SHA-256](../../../evidence/audits/2026-10-06-w7-v33-rejection-business-assertion.sha256)。

2026-10-06 W7 Experiment预留步接入：对normal/recovery TestRun，Platform新增需精确确认的owner-scoped `POST .../runs/{testRunId}/experiment`，要求先完成cap绑定，再以TestRun稳定幂等键创建冻结Fixture的2轮/80-cent Experiment；严格核对返回TestRun、Fixture、轮数、金额、FAKE/RESEARCH模式和RESERVED账本后才记录`EXPERIMENT_RESERVED`。可重放RUNNING预留请求，Web按钮和CLI `--reserve-experiment`读取同一Run；此后不允许把预留过Experiment的Run当纯readiness取消。Platform单测24/24、CLI 1/1、Platform/Web typecheck、Web E2E 3/3及合同检查通过；完整V3.3 code suite复验PASS，Research Automation 217/30、Platform 191/8、Web E2E 3/3。仍未发Runner Job或调用模型；rejection场景的已有承诺构造与无副作用拒绝、normal/recovery两轮派发/结算、检查点业务恢复、独立断言和正式结果导出尚未实现。详见[Experiment预留审计](../../../evidence/audits/2026-10-06-w7-v33-experiment-reservation.md)及[完整复验日志](../../../evidence/audits/2026-10-06-w7-v33-experiment-reservation-code-suite-rerun.log)。

2026-10-06 W7正式双轮Fixture派发增量：新增owner-scoped显式确认`POST .../runs/{testRunId}/dispatch`；只接受normal/recovery且已预留80-cent双轮Experiment的Run。Platform按稳定模型Run ID分别调用确定性Fixture Gateway（每轮23 cents、`NO_EXTERNAL_CALL`），内容寻址发布生成代码输入Artifact，再以显式roundIndex和固定资源/网络DENY向Runner队列幂等提交两轮Job。每轮提交后将jobId、Artifact Hash、费用事实写回同一StageRun历史，允许部分完成后安全重试；缺少不可变`STOCKQUANT_V33_FIXTURE_RUNNER_IMAGE_DIGEST`时失败关闭。Web和CLI新增二次确认，Web三场景E2E 3/3、Platform unit 192/192、PG integration 8/8、CLI同Run测试1/1、contracts/baseline通过；最终完整suite PASS。该增量只证明派发代码路径与UI/mock，不证明本端点与Research HTTP/PG的端到端联跑，也不证明已排队任务执行/产物汇总/Experiment最终结算。恢复故障编排、rejection预算承诺构造、同Run独立断言/导出、Paper共存、Ubuntu和人工验收仍未完成，阶段状态及交付复选框保持不变。见[本轮审计](../../../evidence/audits/2026-10-06-w7-v33-two-round-dispatch.md)、[最终完整套件日志](../../../evidence/audits/2026-10-06-w7-v33-two-round-dispatch-code-suite.log)、[首次失败记录](../../../evidence/audits/2026-10-06-w7-v33-two-round-dispatch-initial-failures.md)及[历史执行快照 SHA-256清单](../../../evidence/audits/2026-10-06-w7-v33-two-round-dispatch.sha256)。

2026-10-06 W7真实Fixture HTTP合同复核及恢复修复：Research Automation完成调用和已结算重放现在均返回合同要求的`actualCostCents`（内部账本字段名不向调用方泄露）；精确同Run/指纹/轮次/金额已结算请求可重放固定响应，未知或未结算调用仍不重试。Research Automation真实隔离HTTP Fixture smoke、fixed Pipeline HTTP/离线Runner/输出metrics与Hash验证通过；完整V3.3 code suite exit 0（Research 217/30、Platform 192/8、Web 3/3）。它证明合同映射和通用固定Pipeline，不证明Platform V3.3 dispatch→Runner Host→TestRun终态的复合联测。队列结果回收/独立断言/恢复场景、Paper共存和V3.3签收仍未完成。详见[恢复/合同审计](../../../evidence/audits/2026-10-06-w7-v33-fixture-replay-recovery.md)、[完整suite日志](../../../evidence/audits/2026-10-06-w7-v33-fixture-replay-contract-code-suite.log)、[Fixture HTTP smoke](../../../evidence/audits/2026-10-06-w7-v33-fixture-replay-http-smoke.log)和[固定Pipeline smoke](../../../evidence/audits/2026-10-06-w7-v33-fixture-replay-fixed-pipeline-smoke.log)。

2026-10-06 W7正式Platform→Research Automation→PostgreSQL派发联测：真实owner-scoped Platform V3.3 Controller经真实Research Automation bearer-auth HTTP服务，使用分离的临时PostgreSQL完成同一TestRun预算绑定、Fixture Experiment预留和双轮派发；独立SQL核实两个round-indexed Runner Job均QUEUED且`networkPolicy=DENY`、每轮模型调用各结算23/40 cents、同一固定输入去重为一个PUBLISHED ArtifactRef、StageRun历史六条，外部Provider调用0。此次联测实际修复了非法modelRunId分隔符、Artifact namespace round扩展和重复内容provenance冲突。完整V3.3 code suite纳入此Smoke后PASS；状态严格标记`PARTIAL_RUNNER_DISPATCH_CROSS_SERVICE_PG`、`RUNNER_JOBS_QUEUED_NOT_STARTED`，未宣称已执行Runner/验证业务输出。端到端Runner回收、rejection/recovery业务流程、Paper共存、Ubuntu与人工签收仍未通过。失败尝试及最终证据见[cross-service审计](../../../evidence/audits/2026-10-06-w7-v33-platform-dispatch-cross-service.md)、[完整suite日志](../../../evidence/audits/2026-10-06-w7-v33-platform-dispatch-cross-service-suite.log)和[历史执行快照 SHA-256](../../../evidence/audits/2026-10-06-w7-v33-platform-dispatch-cross-service.sha256)。

W9证据引用复核（2026-10-06）：历史点时SHA已明确标记为历史快照；当前V3证据门禁PASS，缺失引用/哈希失配均0。正式`verify:version`仍INCOMPLETE/exit 2，V3.1–V3.4全为NOT_RUN；未将本轮代码测试当作业务或人工验收。

2026-10-06 W7正式场景预算初始化接入：Platform创建normal/rejection/recovery TestRun前，按冻结Fixture分别调用Research Automation Platform-only API绑定100/50/100 cents不可变TestRun cap；校验返回的schema、TestRun UUID、金额和CONFIGURED状态后才保存WAITING记录，并将绑定结果写入同一TestRun证据。Platform场景单测15/15、V3.3 CLI normal/rejection/recovery及同Run `--check-only`测试1/1、Platform typecheck和Web E2E 3/3通过；正常创建仍不派发Runner、不调用Provider/行情/Paper/Broker。预算初始化从“未接入”推进到已接入，但后续Experiment/两轮执行、拒绝/恢复业务工作流、独立断言和正式导出仍未实现；阶段与第7节复选框不变。完整V3.3 code suite追加通过，Research Automation 217/30、Platform 188/8、Web 3/3；详见[预算编排审计](../../../evidence/audits/2026-10-06-w7-v33-budget-bind-orchestration.md)与[完整原始日志](../../../evidence/audits/2026-10-06-w7-v33-budget-bind-orchestration-code-suite.log)。

2026-10-06当前工作树V3.3 code suite复验：`pnpm verify:stage -- --stage V3.3 --suite code`受控loopback运行退出0；Research Automation 216单测/29项隔离PG集成、Platform 186单测/8项集成、Web E2E 3/3通过，66,100行预算分页微基准和双轮Fixture Runner检查点接管通过。默认沙箱的5项loopback绑定EPERM失败已保留；无外部Provider/行情/Paper/Broker调用。正式`businessWorkflow`仍`NOT_IMPLEMENTED`，readiness仍仅持久WAITING，Paper连续性、业务验证及人工验收NOT_RUN。完整日志与范围说明见[当前工作树审计](../../../evidence/audits/2026-10-06-w7-v33-current-code-suite.md)及[历史执行快照 SHA-256](../../../evidence/audits/2026-10-06-w7-v33-current-code-suite.sha256)。

2026-10-06 W7 TestRun预算上限绑定工程切片：内存与PostgreSQL账本现支持按TestRun持久绑定小于等于服务硬上限的不可变cap；与Experiment预留共享阶段行锁，超额预留不创建账本行，重配置不能改变cap，也不能把cap降到已有承诺之下。单测11/11、定向PG集成8/8、Research Automation typecheck通过。此账本能力尚未由正式V3.3编排端点调用，未关闭正式workflow/三场景Web同Run/业务导出要求。审计见[预算上限绑定切片](../../../evidence/audits/2026-10-06-w7-v33-testrun-cap-binding.md)。

该切片完整回归追加（2026-10-06）：完整V3.3 code suite在本次cap变更后仍PASS，Research 217单测/30隔离PG集成、Platform 186单测/8集成、Web E2E 3/3；完整命令见[本轮原始日志](../../../evidence/audits/2026-10-06-w7-v33-testrun-cap-binding-code-suite.log)。套件仍明确报告正式`businessWorkflow=NOT_IMPLEMENTED`，不改变阶段状态。

2026-10-06 V3.3预算cap Platform专用HTTP接口：增加版本化命令/结果Schema及生成Platform客户端，Research Automation仅接受Platform service Bearer为TestRun设置上限。完整隔离HTTP/PG预算摘要Smoke实证anonymous 401、Runner 403、同值重放200、改值409、超cap创建Experiment前422且Experiment/Allocation行数不变、低于已占用金额的cap更新409且原预留不变。随后已由上述预算初始化切片接入正式V3.3 TestRun创建路径；Experiment/Runner派发、完整normal/rejection/recovery执行和业务断言仍未实现。详见[cap绑定审计](../../../evidence/audits/2026-10-06-w7-v33-testrun-cap-binding.md)及[API后完整套件日志](../../../evidence/audits/2026-10-06-w7-v33-test-run-cap-api-code-suite.log)。

2026-10-05当前工作树完整代码套件复验：`pnpm verify:stage -- --stage V3.3 --suite code`退出0；Research Automation 216单测/29项隔离PG集成、Platform 180单测/6项集成、Web typecheck与Chromium 3/3通过。确定性1,000行两轮Runner Fixture在Host SIGKILL后由fencing token 2接管，恢复检查点序号1并提交序号2；旧fence发布返回409。66,100行预算分页探针的50,000行最深页offset P95 806.332ms、keyset P95 5.689ms，限于隔离热缓存PG微基准。普通沙箱首轮loopback EPERM失败保留，受控回环复跑通过。完整命令日志及结论见[W7当前套件审计](../../../evidence/audits/2026-10-05-w7-v33-current-code-suite.md)、[原始日志](../../../evidence/audits/2026-10-05-w7-v33-current-code-suite.log)、[机器摘要](../../../evidence/audits/2026-10-05-w7-v33-current-code-suite.json)及[SHA-256](../../../evidence/audits/2026-10-05-w7-v33-current-code-suite.sha256)。本次模型/Provider/行情/Paper/Broker调用均为0；`businessWorkflow=NOT_IMPLEMENTED`、Paper连续性/业务验收/人工验收仍未完成，阶段保持NOT_RUN。

2026-10-03检查点增量：Runner Host现有持久检查点读写协议及PostgreSQL append-only存储，支持按TestRun/Experiment/轮次恢复和Hash校验；这只提供基础设施能力，尚未接入正式TestRun业务编排或真实RD-Agent执行。聚焦单测8/8通过，完整研究服务单测在受限沙箱有5项loopback权限失败；PG集成、HTTP smoke、全阶段回归及人工验收未运行。详见[W7检查点切片审计](../../../evidence/audits/2026-10-03-w7-checkpoint-infrastructure.md)。

2026-10-03检查点真实容器传输及恢复：修复`/run/output`为容器内tmpfs、Host仅在任务完成后复制常规产物，导致长任务运行中Host读不到检查点的问题。现在Host在容器运行时以受限Docker执行通道抽取≤256KiB检查点、原子写入当前fence目录，由心跳通过Bearer HTTP持久化；常规产物导出排除该专用文件。隔离两轮Fixture smoke真实经PostgreSQL验证Host1 SIGKILL前提交序号1、过期租约由fencing token 2接管、Host2恢复序号1并提交序号2/游标2，旧fence发布409，容器/行/临时文件清理完成。完整V3.3 code suite退出0：Research 216单测/29 PG集成、Platform 169单测/6集成、Web E2E 3/3。模型/Provider/Paper调用0。见[真实容器恢复审计](../../../evidence/audits/2026-10-03-w7-checkpoint-live-container-recovery.md)、[机器结果](../../../evidence/audits/2026-10-03-w7-checkpoint-live-container-recovery.json)及[完整suite日志](../../../evidence/audits/2026-10-03-w7-v33-checkpoint-recovery-current-suite.log)。这只关闭检查点传输及Fixture恢复工程子项；正式TestRun业务编排、真实研究、Paper连续性、Ubuntu和人工验收仍未完成。

状态：NOT_RUN。版本入口：[README](./README.md)。共同约束：[三版共同规则](../05-three-version-delivery.md)。

2026-10-01 W7 增量：V3.3现同时强制TestRun累计预算和每实验固定分轮预算。`roundIndex`由调用方显式给出；多轮缺失索引、越界或跨轮复用模型运行ID会被拒绝。RESERVED/UNKNOWN占用所属轮次额度，SETTLED按核实实耗计算，轮次间不转移额度。owner-scoped TestRun汇总返回每轮分配/已用/UNKNOWN额度及第一页总计。Research服务171项单测、23项隔离PostgreSQL集成、50k分页微基准和完整V3.3 code suite通过，Web E2E 3/3。详见[W7逐轮预算审计](../../../evidence/audits/2026-10-01-w7-v33-round-budget.md)。此代码验证不改变本阶段`NOT_RUN`：正式业务工作流未实现，V3.3 business validation及人工验收`NOT_RUN`，Paper连续性未检查；无Provider、数据源或订单调用。

2026-10-01 Platform预算汇总代理收敛：Platform此前只接受旧的`NOT_IMPLEMENTED`标志，现已改为接受TestRun预算合同定义的三种`stageBudgetControl`值，确保完整TestRun/逐轮硬上限状态可传至正式只读页面，同时拒绝未知枚举。Platform单测140/140，完整V3.3 code suite退出0；Research Automation隔离HTTP/PG验证TestRun/轮次cap、UNKNOWN保留、分页及越权拒绝，外部模型与Paper调用均为0。50,000行深页keyset P95 23.178 ms、offset P95 886.445 ms只是隔离热缓存微基准。该代理修正不实现V3.3业务工作流，不改变阶段NOT_RUN或人工状态。见[W7预算代理集成审计](../../../evidence/audits/2026-10-01-w7-v33-budget-proxy-integration.md)与[SHA-256](../../../evidence/audits/2026-10-01-w7-v33-budget-proxy-integration.sha256)。

2026-09-27 本地工程验证：Platform 的V3.3队列、游标和页内预算查询现通过OpenAPI生成的Research Automation客户端访问，服务端返回类型和Platform Bearer/服务身份头统一受契约漂移检查。完整`pnpm verify:stage -- --stage V3.3 --suite code`退出0，Platform单测78项，V3.3 Playwright 3/3通过。该套件确认owner-scoped只读队列、预算页和WAITING准备TestRun；`businessWorkflow=NOT_IMPLEMENTED`、`businessValidation=NOT_RUN`、`humanAcceptance=NOT_RUN`，没有派发真实研究任务或调用模型，阶段状态仍为`NOT_RUN`。详见[Research Queue客户端审计](../../../evidence/audits/2026-09-27-p0-2-research-queue-client.md)。

2026-09-30 Runner队列适配器一致性修复：内存测试适配器现与PostgreSQL生产队列保持全局单个有效租约上限及`submittedAt,jobId`稳定领取顺序；过期租约接管也受同一容量约束。Coordinator在访问适配器前拒绝空Worker、非法时间和无效lease时长。研究服务154项单测、lint及build通过。详见[W7队列一致性审计](../../../evidence/audits/2026-09-30-w7-runner-queue-parity.md)及[审计SHA-256清单](../../../evidence/audits/2026-09-30-w7-runner-queue-parity.sha256)。此修复仅避免替身高估并发能力；V3.3实际实验派发、检查点恢复、预算控制、Paper并发可用性和人工验收仍未完成，阶段继续`NOT_RUN`。

2026-09-30 预算实现边界澄清：Research Automation的`POST /v1/experiments`已通过ExperimentService对实验预留预算，PostgreSQL阶段行锁把RESERVED/UNKNOWN全额和SETTLED核实费用计入V3.1聚合上限；Runner入队校验确切TestRun绑定与RESERVED状态。该V3.1机制不能单独证明V3.3预算控制。V3.3原提供owner-scoped只读TestRun总账；2026-10-01新增累计TestRun硬上限：实验预算预留在同一阶段行锁事务内按TestRun汇总，RESERVED/UNKNOWN计全额、SETTLED计核实实际费用，超限在实验落库和Runner派发前拒绝；TestRun上限作为配置与PostgreSQL持久限制绑定。遗留绑定可从实验记录回填。该次TestRun限额实现时，V3.3账本页面返回`TEST_RUN_CAP_ENFORCED_ROUND_CAP_NOT_IMPLEMENTED`，当时独立轮次额度尚未实现；2026-10-01后续逐轮额度增量见下文。UNKNOWN与预留存在包含关系，不能重复相加，也不是Provider账单。V3.3正式业务工作流、分轮次额度/恢复预算控制及Paper并行负载仍未实现/验证。Research Automation [README](../../../services/research-automation-service/README.md)已更正早先“实验创建未调用预算账本”的过时说明。此增量不改变V3.3验收状态。

2026-10-02 Runner数据规模增量：在两轮、并发1、固定500m/512MiB/32 PIDs、同一linux/amd64镜像（Mac arm64仿真）下，扩展逐行JSONL Fixture 至100,000行；两轮输出校验、Host SIGKILL后租约接管、Artifact内容Hash和旧fence拒绝均PASS。输入2,678,580B，管理文件5,358,919B，采样内存峰值35,494,298B、CPU 34.57%、3 PIDs，耗时12.239秒（含固定恢复延迟），输出内容223B，临时PG清理残留0；无模型/行情/Paper调用。此为流式合成Fixture单点，采样峰值并非连续监测，耗时不代表吞吐，不能外推Ubuntu、生产或多任务并发。失败尝试与逐档数据见[W7 1k/10k/100k容量审计](../../../evidence/audits/2026-10-02-w7-v33-runner-data-scale-1k-10k.md)及其[SHA-256](../../../evidence/audits/2026-10-02-w7-v33-runner-data-scale-1k-10k.sha256)。阶段业务、Web、人工验收仍未完成。

2026-10-02 Runner 100k重复方差：相同冻结输入/镜像/资源限制下顺序运行3个独立TestRun，全部通过双轮Fixture、恢复接管/fencing、产物Hash及stale publish拒绝；运行12.127～12.203秒（含固定恢复窗口），采样内存峰值35.75～37.00MB、CPU峰值34.85～38.55%、3 PIDs，管理文件及产物字节一致，3个临时PG均清理残留0。该三次合成样本和稀疏采样不能证明生产方差、吞吐、并发、Paper共存或Ubuntu性能。详情见[W7 Runner 100k重复方差审计](../../../evidence/audits/2026-10-02-w7-v33-runner-100k-repeat-variance.md)及[SHA-256](../../../evidence/audits/2026-10-02-w7-v33-runner-100k-repeat-variance.sha256)。

2026-10-02 Runner单槽并发背压：专用PostgreSQL集成16/16通过；两个Worker跨TestRun并发争抢仅一个获得租约，数据库活动RUNNING租约数为1；完成后下一排队任务获得槽位并完成。该确定性队列测试证明配置的全局单槽约束，不证明多槽吞吐、持续压力、Paper共存、运行态取消延迟、生产DB或Ubuntu。命令及限制见[W7单槽背压审计](../../../evidence/audits/2026-10-02-w7-v33-runner-single-slot-backpressure.md)及[SHA-256](../../../evidence/audits/2026-10-02-w7-v33-runner-single-slot-backpressure.sha256)。

2026-10-02 运行态取消/恢复：已将固定Pipeline smoke的PG管理端口改为显式且仅限`127.0.0.1`的可配置端口，仍要求postgres管理员和`/postgres`库，避免占用活动5433。隔离真实Runner取消复验PASS：TestRun `d87e8c21-2ef3-4bc4-a8af-9fc8078378ef`；运行容器被移除、取消后heartbeat被fence、迟到发布409且文件/ArtifactRef均未产生，23美分Fixture成本仅结算一次，外部调用0，临时PG残留0。首轮因烟测仍读取过期`actualCostCents`字段，在Runner派发前失败；修正为当前契约`settledCostCents`后重跑通过，失败保留。见[W7运行态取消审计](../../../evidence/audits/2026-10-02-w7-v33-runner-cancellation-recovery.md)及[SHA-256](../../../evidence/audits/2026-10-02-w7-v33-runner-cancellation-recovery.sha256)。这仍不是Paper共存、生产延迟或Ubuntu验证。

2026-10-02 Runner固定故障矩阵复验：共享烟测合同修正后，隔离运行非零退出、超时、DENY网络和128MiB有界OOM四场景全部PASS；分别持久化FAILED/TIMED_OUT终态，容器移除，不发布输出产物，23美分Fixture预算各结算一次，外部调用0，PG残留0。首个命令编排因shell条件语法错在测试前退出且trap清理成功；取消烟测首轮另因旧费用字段断言在派发前失败并修正，均保留。详见[W7固定故障矩阵审计](../../../evidence/audits/2026-10-02-w7-v33-runner-fault-matrix-after-cancel-smoke-fix.md)及[SHA-256](../../../evidence/audits/2026-10-02-w7-v33-runner-fault-matrix-after-cancel-smoke-fix.sha256)。这验证隔离执行边界，不代表正式TestRun/RD-Agent编排、Provider对账、Paper共存或Ubuntu。

2026-10-02 V3.3隔离完整代码套件复验：`pnpm verify:stage -- --stage V3.3 --suite code`在一次性随机loopback PostgreSQL容器中退出0。研究服务lint、34文件191单测、4文件27 PG集成，实验/TestRun绑定和队列/预算HTTP smoke、66,100合成Experiment预算分页容量探针、双轮Fixture Runner SIGKILL接管/资源采样/旧fence 409、CLI同Run只读、Platform typecheck与45文件156单测/4文件5 PG集成、Web typecheck、Playwright 3/3及baseline/contracts均通过。首轮发现Platform两个集成文件并行创建共享`acceptance_stage_runs`时PostgreSQL隐式类型名冲突；已在共享迁移中加入事务级advisory lock，完整重跑后4个集成文件全通过。临时PostgreSQL、Runner、网络已自动清理。模型/行情/Paper调用均0。详细尝试、边界与运行摘要见[W7 V3.3完整代码套件审计](../../../evidence/audits/2026-10-02-w7-v33-isolated-code-suite.md)、[JSON](../../../evidence/audits/2026-10-02-w7-v33-isolated-code-suite.json)及[SHA-256](../../../evidence/audits/2026-10-02-w7-v33-isolated-code-suite.sha256)。这只证明代码与隔离Fixture路径，不实现正式研究业务轮次编排，不代表真实Provider/费用核对、Paper共存、Ubuntu、业务验收或人工签署；V3.3仍NOT_RUN。

2026-10-02 Runner Job轮次身份增量：新增可选`roundIndex`合同字段及1–3范围验证；派发时Experiment超过一轮必须显式指定已分配轮次，否则拒绝，单轮旧请求兼容。JSONB Job持久化测试与失败重试测试确认轮次身份保留；HTTP场景覆盖缺参/越界拒绝和合法round 2入队。首轮完整V3.3代码套件发现既有Runner Host smoke未提供该字段，修正测试负载后完整重跑退出0：Research 201单测/27 PostgreSQL集成、Platform 162单测/5集成、隔离Runner恢复、预算分页容量探针、Web typecheck及Playwright 3/3通过。合同检查151 schemas及全部客户端、兼容规则通过，Provider/模型/Paper调用0。Runner Host smoke虽绑定round 1，但其固定Fixture脚本会生成两个计算输出；该测试不是按轮派发/预算记账的业务工作流证明。正式业务工作流、检查点续跑、Paper连续性、真实RD-Agent/Provider与人工验收保持未完成。详情见[W7轮次绑定审计](../../../evidence/audits/2026-10-02-w7-v33-runner-round-binding.md)、[机器结果](../../../evidence/audits/2026-10-02-w7-v33-runner-round-binding.json)；历史SHA-256清单仍保存在`evidence/audits/2026-10-02-w7-v33-runner-round-binding.sha256`，仅绑定当时点时源码，当前实现Hash见后续W5/W7时钟审计。


2026-10-06 W7当前源码完整套件与执行断言对账：正常/恢复/拒绝TestRun均在隔离Platform/Research Automation HTTP与双PostgreSQL路径中完成；2轮Runner容器无网络执行、46-cent账本派生结算、checkpoint SIGKILL接管/旧fence拒绝以及三个独立业务断言和结构化导出均通过。回归同时修正旧`V3.3_EXECUTOR=NOT_IMPLEMENTED`状态：准备Run先记`NOT_RUN`，只有场景独立核验通过才持久化PASS，意外副作用/核验失败持久化FAIL。完整`pnpm verify:stage -- --stage V3.3 --suite code`受控loopback复跑退出0；当前Platform 200 unit/8 PG integration、Research 218 unit/32 PG integration、Web E2E 5/5通过，默认沙箱5项loopback EPERM首轮失败单独保留。最新normal `faaed2e8-70a4-4395-9be7-106d0cae8602`、recovery `0f064e6c-cfff-4254-85a2-92ceea5944bd`、rejection `2eb910b8-8a33-4753-968a-9834b1719170`业务断言均PASS且`humanAcceptance=NOT_RUN`。无外部Provider/行情/Paper/Broker调用；活动服务未连接。详见[完整套件审计](../../../evidence/audits/2026-10-06-w7-v33-current-full-code-suite-after-executor-assertion.md)、[原始日志](../../../evidence/audits/2026-10-06-w7-v33-current-full-code-suite-after-executor-assertion.log)、[机器摘要](../../../evidence/audits/2026-10-06-w7-v33-current-full-code-suite-after-executor-assertion.json)及[该次执行源码SHA清单（历史执行快照）](../../../evidence/audits/2026-10-06-w7-v33-current-full-code-suite-after-executor-assertion.sha256)。这些Fixture业务场景不构成Paper连续性、真实RD-Agent/Provider、Ubuntu或V3.3人工/阶段验收。

## 1. 前置与范围

V3.1/3.2通过；数据扩容与固定小样本回归可用。

本阶段所有订单、券商资产和成交均来自隔离模拟环境。真实业务数据库、Qlib或RD-Agent在声明“已验证”时必须真正执行；替身需独立标注。

## 2. 开发任务

- [ ] 按数据范围→实验轮次→并发顺序逐档扩容；初始并发1，各档冻结资源和Token/费用预算。全市场多年分钟训练为实测后扩展，不作为Mac默认承诺。
- [ ] 实验任务具备排队、检查点、取消、失败隔离和结果原子发布；模型请求发出但响应未知时保留费用不确定性，不承诺外部计费exactly-once。进展：V3.3已有精确TestRun队列分页、按Job查看账本和按唯一Experiment查看全TestRun去重总账；累计TestRun硬上限与每个Experiment固定分轮额度均在预留前强制执行，RESERVED/UNKNOWN占用所属轮全额、SETTLED按实际费用核算且禁止跨轮转额，超限在Experiment持久化和Runner派发前拒绝。Platform先验证当前用户拥有对应V3.3 TestRun，再以独立Bearer代理汇总，并透传合同定义的三种`stageBudgetControl`能力状态。Runner原始提交与terminal任务重试使用PostgreSQL原子`createIfAbsent`，相同身份重放不覆盖既有状态，冲突payload被拒绝（[提交幂等审计](../../../evidence/audits/2026-10-02-w7-runner-submit-idempotency.md)、[重试幂等审计](../../../evidence/audits/2026-10-02-w7-runner-retry-idempotency.md)）。2026-10-06 Platform按冻结normal/rejection/recovery Fixture绑定100/50/100 cents TestRun cap；normal/recovery现可在明确确认后，用同一TestRun稳定幂等键预留2轮、80-cent FIXTURE Experiment，并持久化完整账本回包。该步骤不创建Runner Job。定向Platform 24/24、CLI 1/1、Platform/Web typecheck、Web E2E 3/3及合同检查通过；不代表排队派发、Fixture两轮执行/结算、rejection无副作用工作流、恢复业务链或完整TestRun同Run验收已实现，不能勾选完成。
- [ ] 记录所有尝试、失败、重复试验及测试集使用；控制搜索范围和数据窗口，防止只展示最优收益。
- [ ] 可用录制模型响应回放验证编排可复现；真实模型再次生成允许不同，固定生成代码/数据的数值复算按精度策略验收。
- [ ] 研究Worker与模拟交易分配独立资源配额；OOM/故障时核心Paper继续，模型不可用不改变QUANT_ONLY策略。

## 3. 同步 Web 开发

正式页：可只读查看Runner队列、当前页Job关联账本和按唯一Experiment去重的TestRun级总账。总账跨页展示该TestRun的实验数、申请/预留/结算/UNKNOWN金额及模型尝试数，重试不会复制Experiment额度；UNKNOWN金额是预留的一部分，不能再次与预留相加，也不是供应商账单。预算明细使用创建时间/Experiment UUID keyset游标；首页计算精确总额，续页`totals=null`避免重复聚合，Web保留首页总额。TestRun和每轮硬上限已执行；历史offset接口仍兼容但深页会退化。normal/recovery/rejection的正式V3.3 TestRun Fixture工作流、同Run Runner执行/结果归并/预算结算及独立断言已有隔离端到端证据；资源档位对比、Paper并行性页面与并行观察仍未完成。验收页：研究OOM、服务重启后的同TestRun工作流和Paper连续性仍未完成。

验收中心路径：`/acceptance/v3/v3.3`。页面可创建owner-scoped准备态TestRun并立刻读取同一个记录；这只持久化`WAITING/NOT_RUN`元数据及缺失门禁，不代表业务场景已运行，也不派发工作。队列与Job分页账本只显示已有Job；新增TestRun汇总则读取所有已绑定实验，即使还没有Runner Job。两种预算视图均先校验登录用户确实拥有该V3.3 TestRun，再由Platform独立Bearer读取Research Automation数据。浏览器不直接写领域数据，不自行判定成交。真正完整阶段仍需正常、拒绝/异常及适用的重试/恢复场景执行。

## 4. 人工验收步骤

1. 从小档扩到预定下一档，比较耗时/峰值/Token，查看全部候选而非只看最佳。
2. 重启实验Worker，从检查点恢复，无重复发布/重复晋升；缺失模型响应标未知。
3. 耗尽预算确认停止新调用；终止一个实验，其他模拟交易任务继续。
4. 用同份生成代码和固定数据复算；录制响应和真实模型运行分别标注。

每次保存testRunId、场景版本、代码/镜像、数据/规则版本、种子及注入事件序列、实际/预期、截图/Trace。判定依据必须是后端事实和独立检查，不能只看Toast成功提示。

## 5. 异常与替身边界

同seed不能保证LLM重生成一致；研究故障不得阻断独立核心交易流程；超资源档位降为未支持而非隐式缩样本。

## 6. 产物与验证

目标产物：研究队列/预算/恢复、实验比较和全试验账、资源隔离配置、性能与故障报告。

自动验证：预算/并发/恢复/取消、不可重复发布、录制回放与代码复算、研究压力下核心Paper可用性。

需求/测试追踪：RES-01～04、QNT-10、AGT-08、OPS-08；T09/12/13/20/38；DV-07、VT07。

退出条件：开发任务完成、Web真实可操作、全部适用检查PASS、人工签署、已知限制写入证据。填写[本版验收表](./99-acceptance.md)，未完成项不得勾选通过。

W7 TestRun状态持久化基础（2026-10-03）：Platform StageRun Repository新增V3.3专用事务状态迁移，`SELECT ... FOR UPDATE`锁定owner-scoped TestRun，先把前态/assertions/evidence写入append-only history，再更新当前状态；只接受明确定义的QUEUED/RUNNING/WAITING与终态迁移，精确重放幂等，COMPLETED/FAILED/CANCELLED不可复活。独立PostgreSQL验证等待→运行→恢复重排队→重新运行→完成、历史记录、丢响应重放、越权和终态拒绝通过；最终V3.3全code suite退出0。该实现仅为持久状态基础，未实现TestRun内的Experiment/Runner实际派发、预算轮次工作流、检查点执行/恢复或Paper并行。详见[W7状态历史审计](../../../evidence/audits/2026-10-03-w7-v33-run-state-history.md)。本任务复选框保持未完成。

## 7. 阶段交付待办（完成后勾选）

以下勾选只记录本阶段交付进度，不能代替第2节逐项开发任务或版本验收结论。开发者凭实现/实测证据勾选开发项；“人工验收”仅在用户实际确认后勾选，不预填PASS。

2026-10-03 Experiment业务时钟工程增量：`ExperimentService`现在注入Clock，Experiment创建/取消时间使用注入的业务时间；固定时钟单测精确断言时间戳，bootstrap注入SystemRunnerClock。无真实模型、行情、研究Job或活动服务调用；不代表本阶段研究/扩容工作流已运行，也不改变人工验收状态。见[W5/W7时钟注入审计](../../../evidence/audits/2026-10-03-w7-experiment-clock-injection.md)、[机器结果](../../../evidence/audits/2026-10-03-w7-experiment-clock-injection.json)和当时实现源码SHA清单（历史快照）。
2026-10-03 V3.3 Clock增量后完整code suite受控退出0：Research Automation 202项、Platform 166项单测/5项集成、预算HTTP/容量与双轮Fixture Runner恢复通过；同时明确业务流程`NOT_IMPLEMENTED`、Paper连续性`NOT_CHECKED`、人工验收`NOT_RUN`。

- [ ] 契约、数据结构、场景定义和预期结果已冻结。
- [ ] 第2节后端任务完成，真实依赖与替身明确。
- [ ] 正式Web功能页及验收中心正常/异常场景完成。
- [ ] 命令、实际URL、Fixture路径/Hash和配置说明已补齐，待实现占位已消除或明确列为范围外。
- [ ] 开发者按第8节从准备到导出亲自执行，保存代码版本、退出码、截图/Trace和断言证据。
- [ ] 重复/恢复及适用观察期验证完成，未覆盖项如实记录。
- [ ] 用户已通过Web及命令证据完成人工验收，记录确认时间/结论。
- [ ] 操作说明与限制已更新，[本版验收表](./99-acceptance.md)已同步。

2026-10-02队列持久性增量：POST同一Runner身份的并发不同payload仅允许一个内容被保留；terminal job的并发retry调用收敛到唯一持久attempt，不能用迟到的重复写覆盖其lease或运行结果。隔离PG运行证明此单项实现与PostgreSQL一致；业务TestRun内的正式轮次工作流、Web场景和人工验收仍未完成，故本节交付待办不勾选。审计：[提交去重](../../../evidence/audits/2026-10-02-w7-runner-submit-idempotency.md)、[重试去重](../../../evidence/audits/2026-10-02-w7-runner-retry-idempotency.md)。

2026-10-02隔离Runner两轮恢复复跑：第一轮在任务完成后因烟测仍按旧Artifact文件布局读文件而失败；依据当前共享内容寻址存储改为通过`LocalArtifactContentStore`按不可变地址读取，完整重跑通过。固定Fixture任务在Host SIGKILL后由新Host通过过期租约/fencing token 2接管，旧Runner容器清理，三件输出内容Hash吻合，旧fence发布HTTP 409；临时PG容器已清理。证据：[两轮恢复烟测审计](../../../evidence/audits/2026-10-02-w7-v33-rounds-recovery-rerun.md)及[SHA-256](../../../evidence/audits/2026-10-02-w7-v33-rounds-recovery-rerun.sha256)。仅验证小型确定性Fixture恢复路径，不构成Experiment业务轮次编排、容量、Paper共存、Ubuntu或人工验收；W7继续未完成。

2026-10-02 W7首个Runner资源测量点：单slot、两轮tiny deterministic Fixture下，Docker限制/配置为500m CPU、512 MiB、32 PIDs；五次约2.5–2.9秒间隔采样峰值35,211,182 bytes、CPU 32.61%、3 PIDs，Runner执行11,762 ms；Runner临时文件1,154 bytes、输出Artifact 112 bytes。外部模型/行情/Paper调用0，模型Provider费用0（主机/Docker运行成本未估算）。结果仅是单一微型数据点，不能外推生产规模或连续峰值。完整Run及局限见[容量样本审计](../../../evidence/audits/2026-10-02-w7-v33-runner-capacity-sample.md)及[SHA-256](../../../evidence/audits/2026-10-02-w7-v33-runner-capacity-sample.sha256)。阶段容量矩阵、逐档预算、并发/背压、Paper共存与Ubuntu测量仍未完成。

2026-10-02 W7固定资源下数据量递增样本：新增1000/10000行JSONL输入，Runner流式计算行数/checksum并验证输出。两轮、并发1、500m CPU/512MiB/32 PIDs、DENY网络、30秒超时保持一致；输入分别24,780/257,851B，执行11,896/11,854ms，采样峰值内存35,232,154/35,232,154B、CPU 34.35/35.00%、PIDs 3/3，Runner管理文件51,303/517,453B，发布Artifact 211/217B。Mac arm64上运行linux/amd64 Runner仿真；统计间隔约2.5–2.9秒，执行时间含固定11秒恢复观察延迟，非吞吐结论。首个10k命令因工作目录错误在业务运行前失败，修正后重跑通过，失败保留。审计：[数据扩容测量](../../../evidence/audits/2026-10-02-w7-v33-runner-data-scale-1k-10k.md)及[SHA-256](../../../evidence/audits/2026-10-02-w7-v33-runner-data-scale-1k-10k.sha256)。仅为两种合成规模小样，不证明生产容量、Paper共存或Ubuntu支持；W7仍未完成。

2026-10-03 W7状态历史增量交付记录：Platform 168项单测、4个PostgreSQL集成文件/6项测试和正式V3.3 Playwright 3/3均通过；状态历史测试由同一TestRun验证前态归档、精确重放和终态拒绝。V3.3 full code suite exit 0，但其正式范围报告仍是`businessWorkflow=NOT_IMPLEMENTED`、`businessValidation=NOT_RUN`、`paperContinuity=NOT_CHECKED`及`humanAcceptance=NOT_RUN`，因此下面的阶段交付复选框继续不勾选。完整结果：[W7审计](../../../evidence/audits/2026-10-03-w7-v33-run-state-history.md)、[机器报告](../../../evidence/audits/2026-10-03-w7-v33-run-state-history.json)、[完整日志](../../../evidence/audits/2026-10-03-w7-v33-run-state-history-code-suite.log)。

## 8. 阶段验收操作手册

### 8.1 当前可执行性与验收准备

手册状态：DRAFT_NOT_EXECUTABLE（2026-10-06隔离Fixture业务链已由完整code suite及Platform→Research Automation→双PostgreSQL→Runner容器联测验证；但尚未完成用户环境Web逐步验收、Paper并行观察、V3.1/V3.2正式前置确认、Ubuntu验证和人工签署。本节现记录可复核的Fixture命令/输入/结果；在上述验收前置实际执行并记录之前，不得改为VERIFIED_EXECUTABLE）。

前置服务：研究队列/预算/检查点/Runner、监控及资源独立的核心Paper服务。

固定输入：冻结小档与下一档范围/轮数、并发1起、Token/费用/内存预算；固定生成代码和录制响应样本单独准备。

| 验收信息 | 已核实值/边界 |
|---|---|
| 当前代码/验证日期 | 工作树代码；2026-10-06；不可将本机工作树Hash冒充正式发布Commit。当前套件审计：[W7报告](../../../evidence/audits/2026-10-06-w7-v33-current-full-code-suite-after-executor-assertion.md) |
| 项目根目录/工具 | `/Users/huangbosong/Documents/ChatGPT/StockQuant`；Node.js与pnpm按根`package.json`及`pnpm-lock.yaml`锁定。验收时记录`node --version`、`pnpm --version`、`python --version`、`uv --version`、`docker version`实际输出；这些开发机输出不证明Ubuntu兼容性 |
| Web路由/身份 | `/acceptance/v3/v3.3`；使用当前登录用户会话，CLI可通过`STOCKQUANT_SESSION_COOKIE`读取会话，禁止把Cookie/token写入证据 |
| Fixture | `v3.3-research-orchestration-1`；场景文件[`scenario-plan.json`](../../../fixtures/v3/v3.3-research-orchestration-v1/scenario-plan.json)，SHA-256 `277ac70ea4a529a06cbdde9717c7f4bfb860d5155e7ec168546c55e41fa74107`；Manifest在同目录。合成编排数据，无行情、Provider响应或凭据 |
| 冻结业务参数 | 两轮；normal/recovery TestRun cap 100 cents，rejection cap 50 cents并尝试80 cents；每轮Fixture模型记账23 cents，预期合计46 cents；网络策略DENY。仅为确定性Fixture预算，不是Provider账单或真实研究成本 |
| Runner环境 | 必须配置不可变`STOCKQUANT_V33_FIXTURE_RUNNER_IMAGE_DIGEST`；缺失时派发应失败关闭。完整套件使用固定digest、隔离无网络Runner和独立临时PostgreSQL；执行前从最新审计记录抄录并核对实际digest，不从历史示例猜测 |
| 真实源/交易/Provider | 来源授权NONE、模式NO_TRADE；本Fixture流程的外部行情、真实Broker、Paper订单及外部模型Provider调用必须为0 |
| 预期时间/等待 | 完整code suite是长时间隔离检查，按终端输出和CI/命令超时观察；不能把Job入队当完成。Paper连续性观察按V2.4/V3.3验收要求的真实有效窗口单独计时，Fixture运行不能抵扣 |

### 8.2 隔离代码套件（已验证命令；不启动正式采集或Paper）

在上表项目根目录运行。该命令会执行基线、契约、Research Automation单测/隔离PG与HTTP smoke、Platform单测/隔离PG及跨服务Runner业务smoke、Web类型检查和Stage E2E。必须使用隔离测试数据库；不要把活动服务数据库URL传给测试命令。它不启动正式数据采集、Paper或外部Provider调用。

```bash
# 项目根目录；先确认实际执行目录和工具版本
pwd
node --version
pnpm --version
pnpm verify:stage -- --stage V3.3 --suite code
echo $?
```

通过标准：命令退出0，末尾JSON报告`suite=code`、`status=PASS`、`businessWorkflow=FIXTURE_RUNNER_SETTLEMENT_NORMAL_RECOVERY_AND_REJECTION_ASSERTIONS`、`paperContinuity=NOT_CHECKED`、`humanAcceptance=NOT_RUN`。退出1为检查失败；退出2表示所需前置/观察未完成。普通沙箱回环绑定权限错误不算通过；保留首次错误，并仅在获准的受控本机测试上下文重新执行。此命令不构成用户Web验收、Paper观察、Ubuntu或版本验收。

业务TestRun通过验收中心或CLI场景入口创建；操作会写入隔离的StageRun/Research Automation测试数据。执行前确认V3.1来源TestRun与PromotionRequest均为获准且精确版本；不得伪造前置ID。记录testRunId、Experiment/Job ID、Artifact Hash及Fixture版本。当前NO_TRADE与来源授权NONE保持不变；Fixture模型响应不得标注为真实Provider结果。

### 8.3 Web逐步操作及预期结果

1. 登录上表实际Web地址，进入“开发验收中心→V3→V3.3”；检查页面版本、模拟模式、服务能力与固定输入。
2. 点击“记录正常场景”“记录预算/故障拒绝场景”或“记录恢复场景”，记录返回TestRun UUID。normal/recovery按页面提示依次明确确认Experiment预留、两轮Fixture派发、已完成结果归并和场景断言；rejection明确确认50-cent预算下的80-cent申请拒绝断言。拒绝场景只有验证无Experiment/Allocation/模型调用/Runner Job副作用后才PASS。
3. 对每个动作等待同一TestRun写回结果；排队状态不是完成。normal需核两轮输出Artifact字节Hash、Fixture指标和46-cent结算；recovery还需核检查点序列、恢复输出和旧fence拒绝；rejection核零副作用。最新完整隔离suite导出的业务Run为normal `98054476-9b1c-4896-82f9-23de4e548505`、recovery `df7779d0-3cc3-4bd6-b4af-a17b57d0b37d`、rejection `d44eb74f-0bb5-46d1-a7c9-1a851c4ef236`。这些是自动隔离suite证据，不是用户本人Web验收。Paper连续性仍`NOT_CHECKED`，V3.1/V3.2正式前置和版本人工验收仍未签收。

| 场景ID（阶段内唯一） | 场景 | 点击顺序/输入 | 预期结果与核对点 |
|---|---|---|---|
| normal | 双轮Fixture研究 | 创建同一TestRun，按确认步骤预留、派发、归并、验证。 | 同一TestRun两轮完成；Artifact/指标Hash正确，Fixture账本精确结算46 cents；外部Provider调用0。 |
| rejection | 预算拒绝 | 创建50-cent cap的拒绝Run，明确确认80-cent Experiment申请并验证。 | 预期HTTP 422；Experiment、Allocation、模型调用、Runner Job均为0；独立断言PASS。 |
| recovery | 检查点恢复 | 创建同一TestRun，执行双轮后按恢复场景注入固定Host中断/接管序列并验证。 | 同一轮从持久检查点续跑，新fence完成发布，旧fence发布被拒；断言与输出Hash可追溯。 |

4. 从运行详情打开关联正式页面，执行一次刷新/关闭再打开；核对长任务后台状态、历史证据和加载/失败/陈旧提示。
5. 每项记录实际结果、截图与业务ID。异常场景“预期拒绝”被正确验证时断言可PASS，但被测业务操作仍显示拒绝；若意外接受则断言FAIL。

### 8.4 命令行准备态创建与相同运行核对（业务执行待实现）

在项目根目录执行以下目标命令。stage/scenario必须匹配8.3定义；CLI与Web共用场景版本、Fixture和断言。每条命令执行后立即查看退出码，任何非零先保存错误再定位，不能继续假定本阶段通过。

```bash
pnpm verify:stage -- --stage V3.3 --scenario normal --seed 20260907
# 紧接上一命令执行；0表示全部场景断言通过
 echo $?
pnpm verify:stage -- --stage V3.3 --scenario rejection --seed 20260907
 echo $?
pnpm verify:stage -- --stage V3.3 --scenario recovery --seed 20260907
 echo $?
pnpm verify:stage -- --stage V3.3 --suite code
 echo $?
pnpm test:e2e -- --stage V3.3
 echo $?
```

当前CLI合同：`--scenario normal|rejection|recovery`创建持久TestRun；normal/recovery可附加`--reserve-experiment --dispatch-runner`执行明确确认的Fixture步骤，并需传入获准的V3.1 TestRun与PromotionRequest UUID。rejection在创建后用`--run RUN_ID --verify-rejection`；normal/recovery在同一Run两条Job完成后用`--reconcile-runner-results`，再分别用`--verify-normal`或`--verify-recovery`。各命令都必须检查退出码及同一TestRun证据，不得把HTTP成功或队列入队当业务通过。`--check-only`只GET给定Run。传`STOCKQUANT_SESSION_COOKIE`时使用当前用户会话，服务端执行owner检查。`--suite code`包含baseline、契约、Research Automation lint/unit/PG/HTTP、Platform type/unit/PG、跨服务双PG/Runner Smoke、Web typecheck和Stage E2E；2026-10-06该套件退出0，详见8.1链接审计。Runner派发需要固定镜像Digest。自动化Fixture业务断言已覆盖，但Paper持续性、真实RD-Agent/Provider、Ubuntu、用户Web操作记录、阶段正式验收和人工签署仍未完成。

再对Web中已运行的同一testRunId执行只读核对，避免仅创建新样本掩盖页面问题：

```bash
# 粘贴Web运行详情中的实际testRunId，再按回车；这是普通ID，不是凭证
read -r acceptance_run_id
pnpm verify:stage -- --stage V3.3 --run "$acceptance_run_id" --check-only
 echo $?
# V3.3正式业务证据导出尚未实现；不要用其它阶段导出器代替。
```

check-only仅读取所给运行的后端事实，不创建Run、不派发任务、不发起模型调用；空ID/错误stage/越权Run必须拒绝。当前CLI不提供V3.3正式业务证据导出命令；不得用其它阶段导出器代替。三份code-suite结构化Run Bundle路径与Manifest Hash核对见8.1所链接审计；它们不能代替后续用户环境验收Run或人工签署。

本阶段代码测试覆盖要求：预算/并发/恢复/取消、不可重复发布、录制回放与代码复算、研究压力下核心Paper可用性。 在交付时把映射到的实际Domain/DB/契约/服务内测试命令补入本节，注明执行目录、测试文件或套件、退出码和报告；verify:stage必须展示实际调用的测试清单，不能空壳返回0。Python服务使用自身锁定环境，不串用其他服务虚拟环境。

2026-10-01执行记录：已实现owner-scoped的TestRun全局预算账本只读汇总与Web分页展示，并通过完整V3.3 code suite；仍未实现阶段级原子预算控制/round allocation、正式业务工作流派发与检查点续跑/统一轮次汇总，亦未验证Paper连续运行。证据与测试边界见[W7预算汇总审计](../../../evidence/audits/2026-10-01-w7-v33-testrun-budget-summary.md)及其[SHA-256清单](../../../evidence/audits/2026-10-01-w7-v33-testrun-budget-summary.sha256)。阶段门禁和引用状态见[本轮W9复核](../../../evidence/audits/2026-10-01-w9-after-w7-budget-summary.md)及其[SHA-256清单](../../../evidence/audits/2026-10-01-w9-after-w7-budget-summary.sha256)。V3.3阶段预算控制和业务/人工验收状态保持未完成。

2026-10-01 TestRun预算执行增量：`STOCKQUANT_RESEARCH_MAX_TEST_RUN_BUDGET_CENTS`现在独立配置并持久化到Research阶段预算限制；新旧数据库执行加法迁移，既有Experiment绑定预算可回填。创建Experiment时同一Stage锁事务检查当前TestRun累计额，RESERVED/UNKNOWN计完整预留、SETTLED计实际费用；超过上限返回拒绝且不落Experiment记录。增加内存/PG账本边界测试、并发同TestRun争用测试及HTTP超限拒绝断言。完整V3.3 code suite的隔离HTTP、PostgreSQL集成、合同、单测、Web检查通过，Provider/订单调用均为0。尚缺独立轮次额度及其并发共享控制、正式业务阶段执行/恢复、Paper并行性和人工验收；阶段继续NOT_RUN。详情及限制见[W7 TestRun预算硬上限审计](../../../evidence/audits/2026-10-01-w7-v33-test-run-budget-cap.md)及其[SHA-256](../../../evidence/audits/2026-10-01-w7-v33-test-run-budget-cap.sha256)。

2026-10-01 Runner执行准备增量：已从HTTP/PG持久实验派发到双轮次确定性Fixture Runner容器执行，并覆盖Host强制终止、租约超时接管、fencing与三件Artifact发布/hash复验；Provider调用0。命令、TestRun/Job ID和限制见[W7双轮次恢复审计](../../../evidence/audits/2026-10-01-w7-v33-runner-rounds-recovery.md)与其[SHA-256清单](../../../evidence/audits/2026-10-01-w7-v33-runner-rounds-recovery.sha256)。这是执行/恢复基础设施切片，正式业务工作流、阶段预算、检查点、Paper并行、正式同Run导出/验收仍未完成，不勾选阶段任务。

2026-10-01队列分页容量探针：隔离PostgreSQL合成规模最高50,000 Job/TestRun，cursor深页查询只扫描一页100行；offset深页扫描大量前置行且10,000行查询计划出现并行Seq Scan+Sort。Web队列继续使用cursor分页。测试库热缓存微基准与限制见[W7容量审计](../../../evidence/audits/2026-10-01-w7-v33-queue-capacity.md)及其[SHA-256清单](../../../evidence/audits/2026-10-01-w7-v33-queue-capacity.sha256)。该探针不覆盖Experiment并发执行、CPU/RSS/磁盘、生产分布、Ubuntu、预算或Paper，不构成业务规模验收；所有容量和业务验收要求维持未完成。

2026-10-01预算摘要深分页切片：为Experiment TestRun/创建时间/UUID添加索引，预算汇总增加精确时间戳+UUID游标续页；首页计算总额，续页返回null并由Web保留首页账本总额，offset继续兼容。专用PostgreSQL中合成50,000 Experiment尾页：offset P95 161.34ms（全量Seq Scan/Hash Join/Sort），cursor P95 3.36ms（索引读取100行）；续页跳过总额聚合。首页总额P95 70.20ms。完整数据及边界见[W7预算摘要分页审计](../../../evidence/audits/2026-10-01-w7-v33-budget-summary-pagination.md)、[审计Hash](../../../evidence/audits/2026-10-01-w7-v33-budget-summary-pagination.sha256)、[机器结果](../../../evidence/audits/2026-10-01-w7-v33-budget-summary-capacity.json)和[机器结果Hash](../../../evidence/audits/2026-10-01-w7-v33-budget-summary-capacity.sha256)。仅热缓存隔离微基准，不证明生产规模或一致事务快照；阶段预算执行、业务流程、Paper、观察和人工验收仍未完成。

2026-10-01 V3.3完整代码套件复验：`pnpm verify:stage -- --stage V3.3 --suite code`在受控本机环境退出0；Research 173单测/23 PG集成、Platform 136单测/3集成、隔离HTTP/Runner恢复、预算分页探针及Web 3/3通过。普通沙箱首次因临时loopback绑定EPERM失败，已保留失败记录。套件scope仍为`businessWorkflow=NOT_IMPLEMENTED`、`businessValidation=NOT_RUN`、`paperContinuity=NOT_CHECKED`、`humanAcceptance=NOT_RUN`；Provider/Paper调用为0。见[复验审计](../../../evidence/audits/2026-10-01-w7-v33-code-rerun.md)及其[SHA-256清单](../../../evidence/audits/2026-10-01-w7-v33-code-rerun.sha256)。

### 8.5 交叉核对、失败定位与恢复

交叉核对：预算消费流水、模型未知请求、队列/检查点、Artifact发布次数与Paper心跳/订单日志对应。

先检查Web与CLI的testRunId、输入/策略/代码版本和模式是否一致，再按Trace查平台、领域、适配器与持久化证据。页面错误而CLI正确，记录Web失败；二者都错则保留领域断言失败。缺能力先查健康/迁移/数据与日志，不修改余额或订单状态使断言通过。

独立复跑创建新run；测试幂等/检查点/重启恢复则使用原run和原幂等键。故障发生后保留旧证据，修复后新增运行或检查记录；不得清空账本、随机更换seed直到通过。真实观察窗口、来源验证和实际模型调用与加速/录制测试分别记录。

### 8.6 验收记录与收尾

| 场景/检查 | Web实际结果与截图 | 命令/退出码/报告 | testRunId/业务ID | 结论 |
|---|---|---|---|---|
| normal | 待执行 | 待执行 | 待执行 | NOT_RUN |
| rejection（含全部子场景） | 待执行 | 待执行 | 待执行 | NOT_RUN |
| recovery（含实际外部动作） | 待执行 | 待执行 | 待执行 | NOT_RUN |
| Web同run只读核对与证据导出 | 待执行 | 待执行 | 待执行 | NOT_RUN |
| 本阶段代码测试/实际观察适用项 | 待执行 | 待执行 | 待执行 | NOT_RUN |
| 用户人工验收 | 待用户确认 | 不由脚本代签 | 确认人/日期待填 | NOT_RUN |

记录不适用子项的范围依据，不能将必需项改为不适用绕过门禁。归档后在[本版验收表](./99-acceptance.md)填写证据链接和结论。清理只针对本轮已结束的隔离运行，默认保留证据；停止测试不能删除数据库卷或取消无关任务。

2026-10-03完整V3.3代码套件复验：受限沙箱首跑因本地HTTP代理测试 `listen EPERM 127.0.0.1` 失败并保留；受控本机loopback重跑退出0，Research 202/202单测、27/27 PG集成，Platform 166/166单测、5/5集成，Web E2E 3/3，预算上限/UNKNOWN/轮次绑定、66,100行合成账本深页探针、双轮次Runner SIGKILL接管/fencing/Artifact Hash均通过。容量结果仅为隔离热缓存PostgreSQL微基准；Runner是Mac arm64宿主Linux容器Fixture，不是Ubuntu/生产容量或真实RD-Agent证据。最终套件仍报告`businessWorkflow=NOT_IMPLEMENTED`、`paperContinuity=NOT_CHECKED`、`businessValidation=NOT_RUN`、`humanAcceptance=NOT_RUN`；未触发Provider、Paper、行情或Broker调用，W7保持未完成。完整输出、范围和限制见[审计](../../../evidence/audits/2026-10-03-w7-v33-full-code-suite.md)、[原始日志](../../../evidence/audits/2026-10-03-w7-v33-full-code-suite.log)及[SHA-256清单](../../../evidence/audits/2026-10-03-w7-v33-full-code-suite.sha256)。

2026-10-03轮次Job身份修复：发现`RunnerJobCoordinator`以`testRunId:experimentId`作为所有Job身份，导致同一多轮实验第二个轮次与首轮共享主键，不能独立幂等派发。现未指定`roundIndex`时保持旧身份兼容；显式轮次使用`testRunId:experimentId:round-N`，相同轮次重复提交幂等，跨轮次身份隔离；重试仍以轮次Job为父身份。Research Runner unit 13/13、PostgreSQL preparation 17/17、V3.3 HTTP dispatch smoke通过并真实入队同一实验的第1/2轮，外部调用0。此项只修复Runner基础设施，不实现正式研究工作流或阶段验收。

2026-10-03轮次级Runner Job完整回归：显式`roundIndex`生成独立持久Job ID，同一3轮Experiment通过HTTP实际排入round-1和round-2；测试旧无轮次键兼容、逐轮幂等、跨TestRun/无预算/越界拒绝、PG持久化分页、Runner Host按round-1租约接管及Artifact Hash。完整V3.3 code suite exit 0：Research unit 203/203、PG 28/28，Platform unit 166/166、PG 5/5，Playwright 3/3，66,100行合成预算探针与双轮Runner恢复通过。首次全套失败因Runner Host smoke仍查询旧`testRunId:experimentId`，失败诊断保留；修正为round-1 ID后完整重跑通过。证据：[W7审计](../../../evidence/audits/2026-10-03-w7-v33-round-specific-runner-jobs.md)、[机器报告](../../../evidence/audits/2026-10-03-w7-v33-round-specific-runner-jobs.json)、[原始套件日志](../../../evidence/audits/2026-10-03-w7-v33-round-specific-runner-jobs-suite.log)、[首轮失败诊断](../../../evidence/audits/2026-10-03-w7-round-identity-regression-diagnosis.md)、[审计SHA](../../../evidence/audits/2026-10-03-w7-v33-round-specific-runner-jobs.sha256)、当时实现源码SHA清单（历史快照）。Provider/Paper/行情/Broker调用均为0。正式业务工作流、Paper连续性、用户验收及V3.3阶段状态仍未完成。


2026-10-03 V3.3终态证据门禁增量：StageRun持久仓储现在只在业务断言V3.1精确验收、V3.2精确版本、Paper连续性和Executor全部PASS，且Experiment/Runner Job存在、各轮全部完成、TestRun与逐轮预算限制启用时接受COMPLETED；未满足时事务回滚并保持原状态。Platform 169项单测、隔离PostgreSQL 4文件/6集成通过，包含不完整证据拒绝并确认仍为RUNNING的用例。此门禁可阻止准备态/部分执行被误记为完成，但**不实现**Experiment/Runner派发、业务轮次编排、费用供应商对账、真实Paper共存或阶段验收，状态仍未完成。

2026-10-06 等待态准备Run取消：正式V3.3页面可对本人创建的WAITING readiness Run发出明确确认，服务端只在`runnerDispatch=NOT_PERFORMED`且`runnerJobsCreated=0`时通过StageRun状态历史转为CANCELLED；精确重复请求幂等。真实HTTP/隔离PostgreSQL联测覆盖匿名401、异主403、错误确认422、成功201、重复201且只写一条状态历史，以及已派发时409并核实持久状态不变；Platform unit 186/186，V3.3 Platform PostgreSQL集成4文件/8项，Web Playwright 3/3通过。首次HTTP fixture因错误复用已终结Run ID而失败，修正为独立ID后通过；原失败见[fixture失败记录](../../../evidence/audits/2026-10-06-w7-v33-readiness-cancellation-initial-http-fixture-failure.md)。此路径只撤销未派发的准备记录，不取消真实Runner任务、不改预算或Paper状态，也不实现正式研究Workflow；业务状态、连续Paper验证、真实Provider费用核对和人工验收仍NOT_RUN。详见[取消审计](../../../evidence/audits/2026-10-06-w7-v33-readiness-cancellation.md)及其[历史执行快照 SHA-256](../../../evidence/audits/2026-10-06-w7-v33-readiness-cancellation.sha256)。

2026-10-06 W7 场景输入冻结：[`v3.3-research-orchestration-1`](../../../fixtures/v3/v3.3-research-orchestration-v1/manifest.json)现冻结normal两轮结算、TestRun预算超限拒绝和SIGKILL后检查点恢复三条隔离场景的预算、故障事件序列与预期断言；严格结构和值合同见[Fixture场景Schema](../../../fixtures/manifests/v3.3-research-orchestration-scenarios.schema.json)。`pnpm baseline:check`退出0（161合同Schema/41 Fixture）。输入不含行情/模型/provider数据或凭据，且不提供来源授权。该Fixture只冻结未来业务执行的输入，不是运行证据；Web与CLI仍为readiness-only，三种场景断言尚未执行，相关开发复选框及人工验收保持未勾选。完整范围见[W7场景冻结审计](../../../evidence/audits/2026-10-06-w7-v33-scenarios-frozen.md)及[历史执行快照 SHA-256](../../../evidence/audits/2026-10-06-w7-v33-scenarios-frozen.sha256)。

2026-10-06 双轮预算Fixture HTTP/PG验证：扩展Research Automation隔离HTTP smoke，经TestRun绑定的两轮Experiment实际调用本地确定性Fixture Gateway，各轮预留40美分并结算23美分；最终TestRun budget summary持久返回round 1/2各自allocated=40、used=23、unknown=0，Experiment结算46。完整V3.3 code suite退出0：Research unit 216、隔离PG集成29；Platform unit 186、隔离PG集成8；Web E2E 3/3。仅Fixture模型路径，无外部Provider、行情、Paper或Broker调用；初始Docker沙箱权限、生成类型、测试ID和结果字段四个失败均保留在[失败记录](../../../evidence/audits/2026-10-06-w7-v33-round-budget-http-smoke-failures.md)。完整审计/套件见[双轮预算验证](../../../evidence/audits/2026-10-06-w7-v33-round-budget-http-smoke.md)、[完整suite日志](../../../evidence/audits/2026-10-06-w7-v33-round-budget-full-suite.log)及[历史执行快照 SHA-256](../../../evidence/audits/2026-10-06-w7-v33-round-budget-http-smoke.sha256)。该验证未派发研究Runner Job，也未执行正式Web/CLI同Run或Paper连续性；`businessWorkflow=NOT_IMPLEMENTED`、业务/人工验收`NOT_RUN`保持，开发待办不得勾选完成。

2026-10-03 W7 完成证据门禁后完整V3.3 code suite复验：exit 0；Research Automation 203单测/28集成，Platform 169单测/6集成，50k分页/预算探针、双轮Fixture Runner SIGKILL接管与Web 3/3通过。Scope仍准确标记`businessWorkflow=NOT_IMPLEMENTED`、`paperContinuity=NOT_CHECKED`、`businessValidation=NOT_RUN`、`humanAcceptance=NOT_RUN`。完整输出见[W7当前审计](../../../evidence/audits/2026-10-03-w7-completion-evidence-guard.md)、[机器结果](../../../evidence/audits/2026-10-03-w7-completion-evidence-guard.json)、[完整code suite日志](../../../evidence/audits/2026-10-03-w7-completion-evidence-guard-full-suite.log)、[SHA清单](../../../evidence/audits/2026-10-03-w7-completion-evidence-guard.sha256)。此Fixture suite不代表实际模型Provider/真实Paper连续性/Ubuntu或业务验收通过。

失败保留说明：[V3.3首次baseline退出的原因](../../../evidence/audits/2026-10-03-w7-stale-v23-manifest-suite-failure.md)。这是过期V2.3历史Hash引用引起的门禁失败，修正活动引用并重跑V2.3后，当前V3.3完整套件退出0。

2026-10-03 当前W7/V3.3完整代码套件复验：`pnpm verify:stage -- --stage V3.3 --suite code`退出0；Platform单测169/169、4个隔离PG集成文件6/6、Web端到端3/3通过；固定Runner 1,000行/2轮模拟SIGKILL后租约接管PASS，预算/分页PostgreSQL微基准通过，模型Provider/Paper调用均0。完整套件最终报告仍为`businessWorkflow=NOT_IMPLEMENTED`、`businessValidation=NOT_RUN`、`paperContinuity=NOT_CHECKED`、`humanAcceptance=NOT_RUN`，因此本阶段`NOT_RUN`及第7节待办保持不变。详见[W7复验审计](../../../evidence/audits/2026-10-03-w7-v33-current-suite-refresh.md)、[机器摘要](../../../evidence/audits/2026-10-03-w7-v33-current-suite-refresh.json)及[SHA-256](../../../evidence/audits/2026-10-03-w7-v33-current-suite-refresh.sha256)。

2026-10-03 W7 Paper连续性就绪预检工程增量：创建V3.3 readiness TestRun时，现在将Platform Paper调度器快照和O2 20日观察汇总作为只读证据持久化，使用注入的Paper scheduler Clock确定快照时间，并分别判定最近tick是否新鲜/后续采样是否排定，以及观察日是否全部合格；契约同步纳入`paperContinuityPreflight`。该预检永远保留`PAPER_CONTINUITY=NOT_VERIFIED`，即使前置条件齐备也只会返回`READY_FOR_CONCURRENT_TEST`，必须另行完成有授权且实测的研究负载与Paper共存测试。完整V3.3 code suite exit 0：Research 216/216单测、29/29 PG集成，Platform 173/173单测、6/6 PG集成、Web 3/3；Runner恢复、66,100条热缓存PostgreSQL微基准及baseline 26/26通过。最终Web E2E额外断言预检不可被误报为连续性通过，3/3通过，见[UI核验原始日志](../../../evidence/audits/2026-10-03-w7-v33-paper-preflight-web-e2e.log)。受限沙箱loopback EPERM首轮失败已保留，受控重跑通过。NO_TRADE、无数据源授权下未启动采集、Provider、Paper或Broker调用；业务Workflow `NOT_IMPLEMENTED`，Paper连续性`NOT_CHECKED`、业务/人工验收`NOT_RUN`不变。详见[W7预检审计](../../../evidence/audits/2026-10-03-w7-v33-paper-preflight.md)、[机器报告](../../../evidence/audits/2026-10-03-w7-v33-paper-preflight.json)、[完整套件日志](../../../evidence/audits/2026-10-03-w7-v33-paper-preflight-full-suite.log)和[SHA-256](../../../evidence/audits/2026-10-03-w7-v33-paper-preflight.sha256)。

2026-10-06 W7 Runner Host双轮恢复组件复验：隔离HTTP/PG smoke实际运行固定Fixture任务，Host SIGKILL后由第二Host用新fencing token接管，恢复checkpoint并完成输出Artifact发布；峰值资源低于声明限制，旧fence发布被HTTP 409拒绝，外部Provider调用0。此Run独立于Platform跨服务派发TestRun，未证明同Run结果回收、Experiment聚合结算或业务断言闭环；V3.3与人工验收继续NOT_RUN。见[审计](../../../evidence/audits/2026-10-06-w7-v33-runner-host-rounds-recovery.md)及[机器结果](../../../evidence/audits/2026-10-06-w7-v33-runner-host-rounds-recovery.json)、[历史执行快照 SHA-256清单](../../../evidence/audits/2026-10-06-w7-v33-runner-host-rounds-recovery.sha256)。

2026-10-06 W7同TestRun Runner结果归并工程切片：正式接口要求用户再次明确确认，只归并同一StageRun已绑定的精确两轮Job；Platform读取Research Automation Job记录和Published Artifact bytes，核对身份/轮次/namespace、终态与exit code、单一Artifact、SHA-256和冻结Fixture JSON指标后持久化Round结果。未完成或任一引用/内容不匹配时拒绝且不写StageRun；成功仅进入`RUNNER_RESULTS_RECONCILED`，保留RUNNING并明确Experiment aggregate `NOT_VERIFIED`、businessValidation/humanAcceptance `NOT_RUN`。真实隔离Platform/Research HTTP+PG同TestRun归并通过；同Run实际容器执行仍需后续将Worker容器集成此业务Run（本次通过Runner Host身份直接提交合同有效的确定性完成记录），实际容器/lease恢复另有独立Smoke。Web/CLI路径由同Run mock E2E/合同测试覆盖，不代表自动独立业务断言或导出完成。见[审计](../../../evidence/audits/2026-10-06-w7-v33-same-run-runner-reconciliation.md)、[机器结果](../../../evidence/audits/2026-10-06-w7-v33-same-run-runner-reconciliation.json)、[失败记录](../../../evidence/audits/2026-10-06-w7-v33-same-run-runner-reconciliation-initial-failures.md)和[历史执行快照 SHA-256](../../../evidence/audits/2026-10-06-w7-v33-same-run-runner-reconciliation.sha256)。

2026-10-06完整V3.3 code suite复验通过（含基线、Research/Platform、数据库容量探针、Runner Host恢复、跨服务同TestRun归并及Web E2E 3/3）；详细范围与机器报告见[套件日志](../../../evidence/audits/2026-10-06-w7-v33-runner-reconciliation-full-suite-escalated.log)。这只是代码验证：V3.3业务验证与Experiment结算仍NOT_VERIFIED/NOT_RUN，stage和人工验收未通过。首次沙箱loopback EPERM记录在[失败日志](../../../evidence/audits/2026-10-06-w7-v33-runner-reconciliation-full-suite.log)。

2026-10-06 W7真实同Run容器联测：正式Platform/Research Automation隔离HTTP+双PG smoke现由Runner Host在固定sha256镜像的无网络隔离容器中领取并执行原TestRun的两轮任务，不再用直接HTTP完成记录代替执行。两轮COMPLETED/exit 0，Platform读回输出Artifact验证SHA与冻结metrics，23 cents/round，无外部Provider调用；实际宿主仍是Mac ARM64上的Docker目标架构仿真，不是Ubuntu验收。完整V3.3 code suite复跑通过，summary为`sameRunRunnerExecution=PINNED_NO_NETWORK_ISOLATED_CONTAINER`。Experiment aggregate仍NOT_VERIFIED，业务断言/导出、rejection和故障恢复场景、Paper共存、Ubuntu及人工验收尚未完成。详见[容器联测审计](../../../evidence/audits/2026-10-06-w7-v33-same-run-container-execution.md)、[机器结果](../../../evidence/audits/2026-10-06-w7-v33-same-run-container-execution.json)、[完整suite日志](../../../evidence/audits/2026-10-06-w7-v33-same-run-container-execution-full-suite.log)。

2026-10-06 W7 Experiment预算由模型调用账本结算：Platform要求Research Automation精确TestRun汇总证明唯一80-cent/two-round Experiment中round 1、2各有一笔SETTLED模型调用，成本各23 cents且无未决/UNKNOWN。受Platform Bearer保护的新endpoint只接收TestRun UUID和轮数，由Research Automation锁定PostgreSQL预算行、从模型调用账本原子求和结算46/80 cents；不接受caller-provided金额。Platform再读回Experiment状态和汇总并持久化round结算事实。其保证是Fixture账本一致性，不声称第三方Provider账单核销。真实跨服务同Run容器smoke与完整code suite通过，Research 217/217 unit、32/32 PG；Platform 194/194 unit、8/8 PG；CLI 1/1、Web 3/3。UNKNOWN/缺少一轮Settled调用均保持未结算。StageRun仍RUNNING，断言/导出及rejection/recovery、Paper、Ubuntu和人工验收未完成。见[结算审计](../../../evidence/audits/2026-10-06-w7-v33-experiment-ledger-settlement.md)、[机器结果](../../../evidence/audits/2026-10-06-w7-v33-experiment-ledger-settlement.json)、[完整suite日志](../../../evidence/audits/2026-10-06-w7-v33-experiment-ledger-settlement-full-suite.log)。

2026-10-06 W7/V3.3同TestRun恢复执行工程联测：隔离Platform/Research双PostgreSQL smoke使用冻结recovery场景，在同一TestRun两轮Runner Job中对round 1先提交checkpoint sequence 1，再对首Host执行SIGKILL；等待Research PostgreSQL中最后持久租约确实到期后，第二Host以fence 2恢复同Hash检查点，产生并持久化sequence 2，随后完成原TestRun的round 2。旧fence发布返回409；TestRun输出bytes、SHA、冻结metrics和Experiment 46/80-cent账本核验通过。Recovery TestRun `2084e649-bab9-4b95-ae60-604a12db1d03`故障事件与两个checkpoint Hash记录于[联测日志](../../../evidence/audits/2026-10-06-w7-v33-same-run-recovery-cross-service.log)。联测发现并修复同Experiment双轮Runner Host工作区冲突：输入/输出路径新增round目录；定向Runner launch/loop测试10/10通过。完整V3.3 code suite退出0，Research 218 unit/32 PostgreSQL、Platform 196 unit/8 PostgreSQL、Web E2E 4/4；恢复Fixture HTTP smoke、合同及生成客户端检查通过，外部Provider调用0、活动服务未连接。完整范围见[工程审计](../../../evidence/audits/2026-10-06-w7-v33-same-test-run-recovery.md)、[机器报告](../../../evidence/audits/2026-10-06-w7-v33-same-test-run-recovery.json)、[完整suite日志](../../../evidence/audits/2026-10-06-w7-v33-recovery-full-suite.log)及[历史执行快照 SHA-256](../../../evidence/audits/2026-10-06-w7-v33-same-run-recovery.sha256)。该smoke证明隔离Runner恢复执行；Platform StageRun `businessValidation`仍`NOT_RUN`，尚未提供owner-scoped Web/CLI同TestRun恢复断言保存和独立复算；V3.3、Paper continuity、证据导出、Ubuntu及人工验收继续未完成。

2026-10-06 W7恢复业务断言闭环增量：同一recovery TestRun现可在两轮结果归并及账本结算后通过owner-scoped `POST .../runs/{testRunId}/verify-recovery`完成业务复核。Platform经Research Automation service Bearer只读获取确切TestRun/Experiment/round 1持久checkpoint历史，验证序列1/2、state cursor 1/2、逐checkpoint规范JSON SHA-256复算及round-1冻结输出报告从sequence 1恢复到sequence 2/cursor 2，然后把`V3.3_CHECKPOINT_RECOVERY_001`与原始检查点、输出事实写入原StageRun；成功重放幂等。页面按钮和CLI `--run RUN_ID --verify-recovery`复核同一个StageRun。隔离Platform/Research HTTP+双PostgreSQL实际Host SIGKILL、租约到期、fence 1→2、检查点恢复/提交、旧fence HTTP409、两轮执行、预算结算及StageRun断言均PASS。最终完整V3.3 code suite exit 0：Research 218/218 unit、32/32 PG；Platform 197/197 unit、8/8 PG；CLI same-Run、Web E2E 4/4、合同/基线及66,100行容量探针PASS。首次SHA复算全套失败源于测试夹具复用异态Hash，保留日志并修正后最终复跑PASS。上述只关闭恢复业务断言子项；normal业务断言、结构化导出与独立复算、Paper连续性、V3.3其他阶段前置和人工签收、Ubuntu及最终版本验收仍未完成。继续遵守NO_TRADE/无来源授权。详情见[恢复业务审计](../../../evidence/audits/2026-10-06-w7-v33-recovery-business-assertion.md)、[机器结果](../../../evidence/audits/2026-10-06-w7-v33-recovery-business-assertion.json)、[最终完整suite](../../../evidence/audits/2026-10-06-w7-v33-recovery-business-assertion-full-suite-rerun.log)、[初次失败记录](../../../evidence/audits/2026-10-06-w7-v33-recovery-business-assertion-full-suite.log)及[历史执行快照 SHA清单](../../../evidence/audits/2026-10-06-w7-v33-recovery-business-assertion.sha256)。

2026-10-06 W7/V3.3 normal同Run业务断言：normal场景现有owner-scoped `POST .../runs/{testRunId}/verify-normal`，仅在两轮结果归并和Fixture预算结算后执行。Platform重新读取Research队列与Artifact字节，自行复算SHA-256，校验冻结Qlib Fixture指标和完整TestRun/round账本，随后在原StageRun写入`V3.3_NORMAL_RESULTS_001`；成功复放幂等，Research读取失败不形成PASS/FAIL。Web确认操作、同Run CLI选项及单测/E2E已覆盖。隔离HTTP+双PG真实Runner联测TestRun `2ba531af-da7b-4a13-905a-e55c3125e91f`的两个Artifact/metrics和80申请、46实际结算复核均PASS；同次suite recovery与rejection断言亦PASS。完整V3.3 code suite退出0，Research 218 unit/32 PG、Platform 198 unit/8 PG、CLI 1/1、Web E2E 5/5，容量探针/合同/baseline通过；外部Provider调用0、临时资源清理通过。详见[normal业务审计](../../../evidence/audits/2026-10-06-w7-v33-normal-business-assertion.md)、[机器报告](../../../evidence/audits/2026-10-06-w7-v33-normal-business-assertion.json)、[完整日志](../../../evidence/audits/2026-10-06-w7-v33-normal-business-assertion-full-suite.log)和[历史执行快照 SHA-256](../../../evidence/audits/2026-10-06-w7-v33-normal-business-assertion.sha256)。后续变更了其所列源码；原清单保留为该次执行快照，本轮源码Hash由结构化导出审计清单覆盖。

2026-10-06 W7/V3.3三类同TestRun结构化证据导出与独立复核：真实隔离Platform/Research HTTP+双PostgreSQL联测在临时数据库清理前导出normal、recovery、rejection三个owner-scoped TestRun；normal/recovery分别包含2个输出Artifact字节，rejection无产物附件并保留422预算拒绝和零副作用事实。独立版本门禁检查三个精确UUID、导出信封、内部manifest、Artifact原始字节SHA-256、冻结Fixture指标、normal账本、recovery检查点规范化SHA和resume指标、rejection无副作用断言，TestRun证据审计3/3 PASS；三阶段自动状态仍NOT_RUN、用户签收NOT_RUN。联测发现并修复Artifact `artifactId`是不透明标识而非内容SHA的边界错误，并为rejection显式持久化`humanAcceptance=NOT_RUN`。详细记录见[结构化导出审计](../../../evidence/audits/2026-10-06-w7-v33-structured-run-evidence-export.md)、[机器报告](../../../evidence/audits/2026-10-06-w7-v33-structured-run-evidence-export.json)、[V3版本门禁日志](../../../evidence/audits/2026-10-06-w9-v33-structured-export-gate.log)、[normal Run](../../../evidence/local/V3.3/c079cc1c-c218-4a8d-83e5-18c82890d0fa/evidence.json)、[recovery Run](../../../evidence/local/V3.3/03f284b1-8edd-4e3c-b37c-2e7281f4468f/evidence.json)、[rejection Run](../../../evidence/local/V3.3/e29c2b81-3d2f-4fe3-bf3f-f8f926cf73ee/evidence.json)和[历史执行快照SHA-256](../../../evidence/audits/2026-10-06-w7-v33-structured-run-evidence-export.sha256)。这只关闭V3.3结构化导出子项，不代表V3.3阶段通过；其他版本前置、Paper/O1/O2、授权、Ubuntu和人工验收仍未完成。

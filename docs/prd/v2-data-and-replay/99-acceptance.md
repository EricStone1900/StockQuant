2026-10-29 本地学习版最小证据核对：C1–C6共8个Run、33项断言和原始Manifest通过；完整C3导出按既定安排保留本机。证据、各自签收的精确范围与校验方式见[复核](../../../evidence/audits/2026-10-29-v2-local-minimum-evidence-review.md)；整版本地候选人工验收仍NOT_RUN，原V2完整版仍INCOMPLETE。

2026-10-29 新的[V2本地学习版收口范围](../../decisions/2026-10-29-v2-local-learning-version-scope.md)已获所有者同意，当前候选准备中；该范围决定不构成精确整版候选人工签收。原完整版V2门禁与本地学习版分别记录，原版继续INCOMPLETE。

# V2 免费数据、分钟回放与连续模拟：验收清单

2026-10-29 C6最新范围：所有者批准[备用分钟源延期](../../decisions/2026-10-29-c6-backup-minute-source-deferral.md)，第二源接入及其60日覆盖为`DEFERRED`，不再阻塞本轮本地单源范围。此批准仅变更范围；`C6_LOCAL_SINGLE_SOURCE_ENGINEERING`已于2026-10-29通过自动验证、所有者验收及独立复核；原V2.5与V2继续`PARTIALLY_IMPLEMENTED`。全市场分钟、真实长期稳定性、PIT与V2.4观察仍按原门禁核对。

2026-10-29 C5新计划：[本地工程完成与收口§7.2.2](./00-version-plan.md#722-c5本地工程完成与收口计划2026-10-28)。P1–P5工程项已完成；当前范围的P6项目所有者人工验收仍未签署。

| 当前验收范围 | 状态 | 退出条件/限制 |
|---|---|---|
| C6_LOCAL_SINGLE_SOURCE_ENGINEERING / V2.5本地单源工程 | **PASS（2026-10-29，所有者验收并独立复核）** | 仅覆盖持久分钟上传队列、租约过期接管、owner隔离、排队取消、1,440,000 Bar配额拒绝、V2.5查询/TestRun/同Run CLI/脱敏导出及对应Web手册。第二源/60日DEFERRED；全市场容量、物理磁盘额度、长期稳定性、PIT、V2.4观察及V2.5/V2整版不在本签收范围。见[签收与复核审计](../../../evidence/audits/2026-10-29-v25-minute-upload-queue.md)与[导出包JSON](../../../evidence/audits/2026-10-29-v25-minute-import-evidence-export-39a256a1/evidence.json)。|
| C5_LOCAL_ENGINEERING_V1 / 本地工程 | **PASS（2026-10-29，项目所有者签收）** | P1–P6证据及候选指纹已复核；签收仅覆盖本地合成Fixture/CN_A/PAPER/FAKE工程范围。详情见[候选复核与签收包](../../../evidence/audits/2026-10-29-c5-local-p6-candidate-review.md) |
| 20个合格实际交易日 / 长期稳定性 | DEFERRED / NOT_RUN | 独立延期，不阻塞本地范围收口；历史/Fixture/短期运行不抵扣实际日数 |
| V2.4原完整范围及V2整版 | 未完成 | 本地范围PASS不自动通过原真实来源/实际观察及其他阶段门禁 |

2026-10-29 C5本地工程范围最终验收：项目所有者明确回复“确认验收通过”。据此记录`PASS（C5_LOCAL_ENGINEERING_V1，仅本地工程范围）`，绑定[P6候选复核与签收记录](../../../evidence/audits/2026-10-29-c5-local-p6-candidate-review.md)中的工作区/Fixture/运行证据指纹。20个合格实际交易日仍为`DEFERRED / NOT_RUN`；真实来源、常驻策略/LIVE、Ubuntu、V2.4原完整范围与V2整版保持未通过。

2026-10-28 P2本地后台整链自动验收：同一隔离TestRun `88e9be16-73dc-47fc-9dd5-256aa2f85f21`五服务真实进程运行通过，四项C5断言PASS、CLI `--check-only`退出0；BUY→SELL→HOLD×3、T+1结算和独立账本对账完成。详见[P2完成审计](../../../evidence/audits/2026-10-28-c5-local-p2-progress.md)及[Smoke JSON](../../../evidence/audits/2026-10-28-v24-paper-smoke-04f13ec530b3401688ca5bb02001ea5f.json)。这只是P2自动证据；P3–P6和当前候选用户签收仍未完成。

2026-10-29 P4多日及定时进程自动验收：冻结两日预热+五个评估日Fixture覆盖BUY→SELL→HOLD及T+结算，C5六项断言通过。关浏览器测试进程后实际单调计时`1,800,927 ms`；中点对Platform执行一次SIGKILL，约0.532秒后使用同一隔离数据库恢复，同Run CLI退出0，前后账本、订单、成交、预留与Outbox计数一致；外部行情请求0、LIVE关闭。完整Smoke和临时资源清理退出0，详见[P4审计](../../../evidence/audits/2026-10-29-c5-local-p4-progress.md)与[机器报告](../../../evidence/audits/2026-10-29-v24-paper-smoke-e40e870322ae446ba4b9ed6a875e5647.json)。此为已完成Run的本地进程稳定性观察，不是活动策略运行或实际市场观察；P5–P6仍未完成，当前范围用户签收仍为NOT_RUN。首次计时尝试被旧包装器240秒上限中断，失败保留在[记录](../../../evidence/audits/2026-10-29-c5-p4-initial-attempt-failed.md)。

2026-10-29 P5专属Web/CLI/导出自动验收：同一Web C5 TestRun `06e40938-b6aa-4116-adb6-ab6d8a0eba2c`完成五个评估会话及六项断言，未激活Mandate拒绝无交易副作用；关闭页面后重开恢复原Run和后台Job，五个Mandate均显式暂停。CLI `--check-only`对同一Web Run退出0，专属导出成功且Manifest SHA-256为`8e4232ac3a84331e7d70af32e5e43dadbdedc1fe3b7b3172219816f85701c1cc`。完整隔离Smoke中既有Web normal/rejection/recovery等六场景同Run CLI均通过，前后业务事实计数一致，临时DB/Web资源已清理；代码/运行/命令细节见[P5审计](../../../evidence/audits/2026-10-29-c5-local-p5-progress.md)、[完整Smoke](../../../evidence/audits/2026-10-29-v24-paper-smoke-b95154f8d6aa48b6ae7c90ab1ad5dc38.json)和[Web/CLI场景报告](../../../evidence/audits/2026-10-29-v24-paper-web-e2e-77769075-660f-4ac4-8b3f-70cc43d1f55c.json)。此处验收状态是P5完成时的历史截面；后续P6签收记录见上方最终验收记录。

2026-10-28：执行窗口评估时刻及跨日边界修正经单测通过；新边界Web/CLI同Run验收未执行，C5仍PENDING。见[记录](../../../evidence/audits/2026-10-28-v24-execution-window-evaluation.md)。

2026-10-28：采样时钟边界修正经注入时钟单测通过；此不构成实际观察或连续链验收，C5仍PENDING。见[记录](../../../evidence/audits/2026-10-28-v24-sampling-clock-boundary.md)。

2026-10-28：隔离Fixture目标Web入口与同Run CLI未完成状态核对通过；真实持续链、20日观察和用户签收仍未完成，C5仍PENDING。见[记录](../../../evidence/audits/2026-10-28-v24-c5-fixture-target-web.md)。

2026-10-28：既有Web场景完整隔离复验通过，先前502未复现、根因未确定；见[复核](../../../evidence/audits/2026-10-28-v24-web-502-followup.md)。

2026-10-28：C5隔离目标写入后终止Platform及测试数据库会话，原任务接管并复用目标；见[审计](../../../evidence/audits/2026-10-28-v24-c5-committed-target-crash.md)。

2026-10-28：C5隔离Worker领取后进程强制终止并重启，同Run租约到期接管验证通过；见[审计](../../../evidence/audits/2026-10-28-v24-c5-fixture-worker-crash.md)。

2026-10-27：C5隔离创建中断恢复已覆盖账户创建后依赖服务停止/重启；Platform创建各提交点崩溃仍未完成。见[审计](../../../evidence/audits/2026-10-27-v24-c5-fixture-setup-recovery.md)。

2026-10-27：C5隔离Fixture目标入口已通过真实多服务与同Run CLI未完成状态核对；见[审计](../../../evidence/audits/2026-10-27-v24-c5-fixture-target-entry.md)。

2026-10-27：C5隔离Fixture目标后台任务底层与客户端桩/PG租约恢复通过；此为入口增量之前的历史记录。见[审计](../../../evidence/audits/2026-10-27-v24-c5-fixture-target-worker.md)。

2026-10-27：C5两日持久Fixture完成事实到暂停目标的隔离协调组件已做单元及PG验证；实际服务客户端、调度、Web/CLI和用户验收未完成，C5仍PENDING。见[审计](../../../evidence/audits/2026-10-27-v24-c5-fixture-daily-coordinator.md)。

2026-10-27：C5新增受保护的两日持久日线精确读取，隔离PG/HTTP重启检查通过；目标协调和阶段Web/CLI验收尚未完成，不改变C5及V2验收状态。见[审计](../../../evidence/audits/2026-10-27-v24-c5-daily-session-read.md)。

2026-10-27：现有HOLD观察未接入Candidate A连续链，新增失败关闭计数与未知可卖数量边界；仅完成单元验证，不改变C5阶段及20日观察的未完成状态。见[边界审计](../../../evidence/audits/2026-10-27-v24-c5-observation-boundary.md)。

2026-10-26 C5账户有效期边界：所有者确认账户不设置独立有效期，执行授权有效期由绑定Mandate控制，见[决定记录](../../decisions/2026-10-26-c5-account-validity.md)。2026-10-24 C5当前补充：所有者已[确认候选A参数用于实现/隔离验证](../../decisions/2026-10-24-c5-candidate-a-parameters.md)。两根冻结日线经候选规则产生不可变PostgreSQL目标并驱动既有BUY Fixture链；31项纯规则/门禁、4项真实PG测试、四个API及四个容器化Chromium场景/同Run CLI通过，14条真实TestRun契约校验通过。[最终Smoke](../../../evidence/audits/2026-10-24-v24-paper-smoke-ceb06091a3594f0f8be26836f1b07c18.json)、[浏览器报告](../../../evidence/audits/2026-10-24-v24-paper-web-e2e-bba7e007-2518-4fe8-8cf3-54a8e7563252.json)及[准确边界](../../../evidence/audits/2026-10-24-v24-c5-entry-gap-review.md#候选a确认后的日频目标切片2026-10-24)。这不是候选A完整活动政策通过：旧Fixture仍为三证券采样、20分钟、09:49–09:55及1800秒策略；活动单证券30分钟/60秒/09:31窗口、SELL/跨日结算、权威授权、持续风险和日终告警未接通。V2.4保持PARTIALLY_IMPLEMENTED，20日观察及当前候选人工验收NOT_RUN。

当前结论：PARTIALLY_IMPLEMENTED。这里只验收本轮模拟范围，不代表原R1真实账户、R2实盘或全部R3增强通过；V2.4历史实现范围已完成人工确认，V2.3历史回放/模拟撮合签署保留，但2026-09-27源码复核发现Qlib研究子能力被错误标记，当前阶段状态已回退为PARTIALLY_IMPLEMENTED并待重新验证。V2.4的20个实际交易日观察、V2.5分钟级长期门禁和DC-08A的20只证券稳定观察仍未完成。2026-09-24数据库正式日终记录为V2.4 8/20；DC-08A当前归档为4个稳定完整日、1个恢复后完整日（5/20），其人工验收门槛仍未完成。

2026-10-01 Qlib Artifact存储实现补充：V2.3代码套件和隔离`platform_api_test` JSONB回填/读取/幂等集成通过，真实锁版Qlib仅使用合成Fixture；新增证据见[W1回填审计](../../../evidence/audits/2026-10-01-w1-qlib-legacy-jsonb-backfill.md)。此增量不改变本版本或V2.3当前`PARTIALLY_IMPLEMENTED`结论，不等于真实市场数据Qlib研究验证、独立模型验证、活动迁移或新的用户签署。

2026-10-02 V2.1 adapter 边界工程复归：Market Data 真实来源HTTP调用已归入adapter，完整V2.1 code suite exit 0，且未发出外部Provider请求；真实数据源能力/许可仍未验证，V2.1和V2总状态保持PARTIALLY_IMPLEMENTED，无新增人工签署。见[审计](../../../evidence/audits/2026-10-02-w3-market-data-provider-adapter.md)及[SHA-256](../../../evidence/audits/2026-10-02-w3-market-data-provider-adapter.sha256)。

## 1. 阶段验收

2026-10-24最新范围决定：项目所有者批准[C3本地学习范围收口](../../decisions/2026-10-24-v22-c3-local-learning-closeout-scope.md)。C3/V2.2为**PASS（仅批准的本地学习范围）**，包括本地分钟导入、查询、版本比较、质量报告、恢复和已执行的受限FakeBroker回放。完整历史事实补证延期，缺项保持UNKNOWN/null；C4已按Fixture本地学习范围完成自动与人工验收，真实研究输入条件仍未满足。以下较早日期记录保留历史，不作为当前待办。

追加[收口记录](../../../evidence/audits/2026-10-24-v22-c3-local-learning-closeout.json)绑定既有证据，不改写旧TestRun或原人工签署。

2026-10-21 V2.1 C1/C2当前范围**用户人工验收PASS**：完整代码套件exit 0；真实容器Web四场景、同Run CLI/export、实源Worker→Monitor/PostgreSQL、独立当前日日线及五种故障恢复通过。用户确认绑定源码候选Hash `aa8ac2e88285d70b4f73976ed7977b000787ad0476d88dc8eb278f5399f15f32`。V2.1阶段PASS仅覆盖已明确的本地个人学习/C1/C2范围；广义OD-008、长期来源和V2后续阶段保持各自限制。签署及证据见[收口审计](../../../evidence/audits/2026-10-21-v21-c2-closeout.md)。

2026-10-24 V2.2/V2.3受限本地历史回放自动验收：所有者批准的本地留存 BaoStock 小样本在隔离 Web→Platform→Market Data→Historical Replay Worker→Portfolio/Trade/Governance/Quant→FakeBroker 链完成。720根5分钟Bar导入后历史上下文预检为`READY`；Web TestRun `fb9d5de2-fb60-48fd-a9d2-7d73d0bd9417`回放600000.SH前120根Bar并通过`V2.3-IMPORTED-MINUTE-001`，同Run CLI `--check-only`退出0，导出Manifest SHA-256 `f8039b802ac45e38d0e9f5dcece4ee250c8f0209a98991dabf80e22267f15c5d`。该结果只代表一次性、无外部请求的本地回放自动验证；逐Bar状态/停牌/限价、完整公司行动和市场规则事实仍未获权威核验，V2.2与V2.3均保持`PARTIALLY_IMPLEMENTED`，没有新增人工签署。已整理的最小证券有效期、时段和来源记录及仍未知边界见[历史事实清单](../../../evidence/audits/2026-10-24-v22-c3-minimum-historical-fact-inventory.md)；见[决定](../../../evidence/audits/2026-10-24-v22-c3-historical-research-decision.json)和[复核](../../../evidence/audits/2026-10-24-v22-c3-bounded-local-replay.md)。

| 阶段 | 后端/自动检查 | Web人工验收 | 证据/testRunId | 已知限制 | 签署/日期 |
|---|---|---|---|---|---|
2026-10-02 V2.3自动证据补充：合成TestRun `41b4e5b2-e865-4a5a-8cc2-acd11b2aedbe`通过Qlib Fixture Web→服务→模型训练/预测→持久Artifact→owner读取→CLI check-only→离线导出；这不改变V2.3人工新范围签署或模型独立验证结论。见[W4复验审计](../../../evidence/audits/2026-10-02-w4-v23-qlib-fixture-rerun.md)及[TestRun](../../../evidence/local/V2.3/41b4e5b2-e865-4a5a-8cc2-acd11b2aedbe/evidence.json)。

| [V2.1 免费行情、新闻聚合与在线股票池](./01-free-data-and-news.md) | PASS（C1/C2当前范围完整代码、容器Web四场景、实源小样本及故障恢复通过） | PASS（项目所有者人工验收当前候选，2026-10-21） | [normal](../../../evidence/local/V2.1/aaf9d591-3a40-44a5-9a0f-5f6cf3000a64/evidence.json)、[rejection](../../../evidence/local/V2.1/81d65be4-c610-4c85-9218-23f6129f89d0/evidence.json)、[recovery](../../../evidence/local/V2.1/ff98e407-a887-417c-84f9-23657d1a7223/evidence.json)、[stale](../../../evidence/local/V2.1/79e74f07-64cb-432a-9549-4d3599c36ac3/evidence.json)；[人工签署与候选Hash](../../../evidence/audits/2026-10-21-v21-c2-closeout/human-acceptance.json)、[源码/命令/限制](../../../evidence/audits/2026-10-21-v21-c2-closeout.md) | 已接受范围为本地个人学习/C1/C2；OD-008其他用途PARTIAL，新闻公开发布时间未解析，长期稳定/覆盖、Sina/US实源及策略订单仍在其各自后续范围 | 用户人工验收确认 / 2026-10-21（绑定 `aaf9d591-3a40-44a5-9a0f-5f6cf3000a64`、`81d65be4-c610-4c85-9218-23f6129f89d0`、`ff98e407-a887-417c-84f9-23657d1a7223`、`79e74f07-64cb-432a-9549-4d3599c36ac3`） |
| [V2.2 历史分钟数据导入与校验](./02-minute-data-import.md) | PASS（批准的本地学习范围；完整代码套件、导入/查询/比较/质量、CSV/Parquet恢复及受限回放证据复用） | PASS（2026-10-23本地软件候选人工验收；2026-10-24确认收口范围与延期边界） | [追加收口记录](../../../evidence/audits/2026-10-24-v22-c3-local-learning-closeout.json)、[软件候选](../../../evidence/local/V2.2/75300ba9-0807-48f5-80dc-a6cadce18b2c/evidence.json)、[受限回放审计](../../../evidence/audits/2026-10-24-v22-c3-bounded-local-replay.md) | 完整历史事实补证延期；缺项UNKNOWN/null；日线参考未独立核验，不放行C4真实研究或扩展来源用途 | 用户确认 / 2026-10-24；绑定软件候选 `75300ba9-0807-48f5-80dc-a6cadce18b2c`；[范围决定](../../decisions/2026-10-24-v22-c3-local-learning-closeout-scope.md) |
| [V2.3 日频决策、分钟撮合与历史事件回放](./03-historical-minute-replay.md) | PARTIALLY_IMPLEMENTED（历史回放/模拟撮合自动验证保留；完整V2.3 code suite与锁定Qlib `LGBModel.fit/predict` 合成数据烟测通过；owner-scoped持久Qlib Fixture TestRun真实隔离HTTP/Web/CLI同Run和脱敏导出自动回归通过；2026-10-03重新绑定共享Artifact源码/测试后的历史TestRun `0e71363c-4b35-4098-a5ea-432982a3df92`及完整suite通过；历史TestRun `8e2dd579-f780-4db1-b867-94b082457579`及其源码指纹证据保留；当前复验TestRun `692619fb-dc30-4507-9e26-09a70611aa84`与165项最新源码指纹绑定（[当前W4审计](../../../evidence/audits/2026-10-03-w4-v23-after-completion-evidence-gate.md)、[当前TestRun](../../../evidence/local/V2.3/692619fb-dc30-4507-9e26-09a70611aa84/evidence.json)；该次源码Manifest保留为历史点时Hash清单，当前代码更新后不再作为门禁）；当前W4复验 TestRun `12424631-19bd-4bdf-b5f4-6dfd948d751c`及[回归审计](../../../evidence/audits/2026-10-03-w4-v23-v25-current-code-rerun.md)；C4范围A自动Fixture子范围通过（锁版fit/predict、Artifact完整性及已保存模型独立推理复算）；复算仅证明推理可复现，`modelValidation=NOT_RUN`，真实市场/PIT仍NOT_RUN；见[范围决定](../../decisions/2026-10-24-v23-c4-fixture-learning-scope.md)与[验收记录](../../../evidence/audits/2026-10-24-v23-c4-fixture-validation.md)） | 历史用户确认保留（2026-09-19；仅覆盖当时的normal/rejection/recovery、同Run、Web E2E声明范围）；C4 Fixture本地学习范围用户人工验收PASS（2026-10-24；[签署记录](../../../evidence/audits/2026-10-24-v23-c4-fixture-human-acceptance.json)） | 历史场景ID与Manifest保留；[旧Qlib边界更正](../../../evidence/audits/2026-09-27-v23-qlib-boundary-correction.md)；[Qlib Fixture TestRun审计](../../../evidence/audits/2026-10-01-w4-v23-qlib-fixture-testrun.md)；[2026-10-02复验](../../../evidence/audits/2026-10-02-w4-v23-qlib-fixture-rerun.md)；[2026-10-03 Artifact代码身份修复审计](../../../evidence/audits/2026-10-03-w4-v23-artifact-codeversion-binding.md)、[完整日志](../../../evidence/audits/2026-10-03-w4-v23-artifact-codeversion-binding.log)、[当前TestRun](../../../evidence/local/V2.3/0e71363c-4b35-4098-a5ea-432982a3df92/evidence.json)、[Run Manifest](../../../evidence/local/V2.3/0e71363c-4b35-4098-a5ea-432982a3df92/manifest.sha256) | 输入为120行确定性合成数据；`modelValidation=NOT_RUN`、`candidateSourceExecution=NOT_PERFORMED`；真实市场/PIT及模型质量/收益验证NOT_RUN；C4 Fixture范围自动与人工验收PASS；V2.4/V2.5观察门禁独立 | 历史用户人工确认 / 2026-09-19（保留）；C4 Fixture本地学习范围人工验收 / 2026-10-24（见签署记录） |
| [V2.4 真实时钟下持续模拟交易](./04-continuous-paper-trading.md) | PARTIALLY_IMPLEMENTED；2026-10-29 C5隔离Smoke及专属Web/CLI同Run通过，`C5_LOCAL_ENGINEERING_V1`本地工程范围已由项目所有者签收PASS；原真实来源、常驻调度和其他整版门禁仍未完成 | V2.4完整范围未通过；本地签收仅覆盖C5本地合成Fixture工程范围 | [P6候选复核与签收](../../../evidence/audits/2026-10-29-c5-local-p6-candidate-review.md)；[P5隔离Smoke](../../../evidence/audits/2026-10-29-v24-paper-smoke-b95154f8d6aa48b6ae7c90ab1ad5dc38.json)；最新C5 Web TestRun `c2c7d74c-1675-43f1-8112-056f72f91334`结构化导出（6/6断言PASS、同Run CLI/导出成功）：[证据JSON](../../../evidence/audits/2026-10-29-v24-c5-local-export-c2c7d74c/evidence.json)；[完整隔离Smoke报告](../../../evidence/audits/2026-10-29-v24-paper-smoke-7c8f9c41325b47fca322091438b35d79.json) | OD-007活动策略、OD-008逐源用途/授权与真实能力、正式调度/真实时钟观察、20个合格交易日、Ubuntu实机验收及V2整版门禁仍未完成 | C5本地范围人工验收PASS / 2026-10-29；V2.4整版仍未通过 |
| [V2.5 历史数据扩容与 V2 验收](./05-data-scale-and-v2-acceptance.md) | PARTIALLY_IMPLEMENTED（20×60 Fixture 与 BaoStock 真实分钟切片、57,600 行/20/20 SHA-256/逐日窗口/真实归档回放通过；Mac 监控池 50/80/100 质量、5/100/500/5219 多年日线、归档和隔离恢复 5,219/5,219 SHA-256 通过；BaoStock 财务公告日字段已核验但行业 PIT/修订链不足；BaoStock 有界稳定性与恢复探针通过，2026-10-02隔离完整code suite与Linux/arm64 100k Parquet容量复验通过；真实交易时段长期稳定性仍待观察；Ubuntu 实机人工子项已确认通过） | PASS（用户人工验收确认，2026-09-20；页面、normal/rejection/recovery 场景和导出证据已复核） | `docs/evidence-v2.5.md`；DC-T23 `evidence/dc08a/historical-replay-2026-09-16.json`；normal `e033c817-d521-40a8-892c-3c5b8098ea4c`；rejection `17057748-135a-4337-a726-e654f97ed565`；recovery `d3fefb85-2fb9-42c2-9cc1-adefba08af77`；导出 Manifest `f2a8f76cfe03fb5f4a76988812d20c46ff1eca562dadb5027344bd277ff1f575`；[V2.5完整隔离code suite审计](../../../evidence/audits/2026-10-02-w4-v25-isolated-capacity-code-suite.md)及[SHA-256](../../../evidence/audits/2026-10-02-w4-v25-isolated-capacity-code-suite.sha256)；[2026-10-03当前容量复验](../../../evidence/audits/2026-10-03-w4-v23-v25-current-code-rerun.md)；[2026-10-29单源队列/配额增量](../../../evidence/audits/2026-10-29-v25-minute-upload-queue.md)| 分钟级全量、真实交易时段长期限频/恢复稳定性、备用免费分钟源及60日覆盖DEFERRED（2026-10-29所有者决定，仅移出本轮单源范围）、带修订链的真实 PIT、容量长期稳定性和 V2.4 20 日观察待完成；Ubuntu 原始技术日志待补 | 历史用户人工确认 / 2026-09-20（不覆盖2026-10-29新增单源队列/配额范围）；C6_LOCAL_SINGLE_SOURCE_ENGINEERING PASS / 2026-10-29（不扩大V2.5整版范围） |

最新复核（2026-09-17）：Docker 服务全部健康；DC-08A 目标20只订阅已完成48/48窗口、960/960根5分钟Bar，日终报告为`PASS`，开放缺口和待投递Outbox均为0，实际来源统计为Sina 960根。自动任务首次请求失败后受控重试完成切换；由于切换发生在收盘后，本次仅作为收盘后数据质量证据，不计作全天盘中观察日。V2.4 20个实际交易日观察、其余人工验收和真实盘中主源稳定性继续保持未完成。

2026-09-19 V2.3 技术收口证据：正式验收 `4db177da-6f2f-46c1-adb5-8e75f7a33309` 已执行 3 Bar 跨服务回放，3/3 Fill、3/3 账本提交屏障，checkpoint `cursor=3,eventSequence=15,ledgerVersion=4`；长任务 Web E2E 暂停/恢复通过（2/2）。证据 Manifest Hash：`54aba03f4885e63bcf4e154350e82acda01fd886b6644d66644be341bd778036`。

2026-09-19 V2.3 人工验收复核：用户确认按执行顺序重新完成 normal `ca0678f9-7c24-4f99-ad58-59054dfac2f9`、rejection `79f5af32-9ede-492d-94b2-3a554394a06f`、recovery `5a98fffc-50f4-4fb7-a90c-3a44ce9542b0`；三场景、Web E2E 2/2、code suite、同 run check-only 和证据导出均 PASS。fresh Manifest Hash：`f8329e91ea592a90cf8db8cc5b0228883383425262fa7b7eb0e6cf8ff61c772e`。本结论仅覆盖 V2.3 技术收口范围，不代表真实模型、LIVE 或 V2.4/V2.5 门禁。

2026-09-27 复核追加：保留上条历史用户签署，但当前V2.3研究能力状态改为PARTIALLY_IMPLEMENTED。量化Worker原先只计算Fixture open均值/重算摘要Hash，并未调用Qlib模型；相关返回字段已更正为Fixture-only，Qlib模型训练与独立模型验证NOT_RUN。完整更正与当前证据见[边界更正审计](../../../evidence/audits/2026-09-27-v23-qlib-boundary-correction.md)。

2026-09-23 TDX 候选源复核：新增可选 easy-tdx 适配器并锁定 Git commit
`4820b4a0496899ece0b8ca4d7f4d66a5159da7f8`。离线质量检查和适配器 48/48 单元测试通过；
真实只读探针对3只跨沪深证券返回144根5分钟Bar，服务器为 `121.37.207.165`，结果 Hash
为 `12ae2df345ae6939568b55a700ea8a2d24bc14bb7a32ab96354240441d2ff0ef`。该证据只证明候选
源的单日小样本可读性，正式来源仍为 `sina,baostock`；2个实际交易日、20只证券、持续限频、
窗口完整性及恢复观察继续为 `NOT_RUN`，不改变 V2.4 8/20 或 DC-08A 5/20 门禁。

## 2. 版本门禁

2026-09-24 运行快照：V2.4 `/api/v1/acceptance/v2/v2.4/observation-summary` 返回 `WAITING`、8/20、剩余12日；调度器 `RUNNING`，采样30分钟、Paper/FakeBroker。DC-08A 健康报告为 `HEALTHY`，20只订阅、调度器/执行器 `ENABLED`，当日日终为48/48运行、960/960根Bar、开放缺口0、待投递Outbox 0；BaoStock 与 Sina 当前均为 `CLOSED`。健康只代表至少一个来源可用和数据质量门禁通过，不表示 BaoStock 已完成长期盘中稳定性验收。2026-09-24 起日终计数还要求盘中采样完整、执行窗口存在且逐次行情新鲜。

自动化复核：a-20、dc-08a、dc-08a-2 为 ACTIVE；dc-08a 守卫配置 `UNTIL=2026-10-20T00:45:00Z`（北京时间 08:45）；a-20 与盘后任务无到期时间。已完成的一次性 dc-08a-20 和已迁移旧 stockquant 任务均 PAUSED。验证命令 `pnpm dc08a:verify-automation` PASS；详见[阶段六审计](../../../evidence/audits/2026-09-23-phase-6-status-and-automations.md)。

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


2026-10-01 V2.3 Artifact自动验证增量：真实隔离Qlib Fixture Web TestRun现保存不可变模型/预测Artifact；owner读取200、foreign owner拒绝403，同Run CLI check-only和导出无写入。TestRun `8eeabdd5-45e7-44cb-9223-fb4a0069ca9d`，Artifact SHA-256 `24864d22e4016e1419382e380aec504f02607004262696c92b76451cc1dbb6a8`。不改变新增研究能力人工验收NOT_RUN、真实授权数据/PIT和独立模型验证NOT_RUN。

2026-10-02 P-F05最新实现复核：隔离PostgreSQL覆盖重复/并发撤单请求、部分Fill、FakeBroker模拟接受/拒绝结果、状态/事件事务、迟到重复回报抑制及断线重放；接受关闭未成交余量、拒绝恢复`PARTIALLY_FILLED`。Trade新增平台Bearer受限撤单结果HTTP/OpenAPI，并以持久`RESERVATION_RESOLVE` Outbox在Fill成功入Portfolio后释放剩余Reservation；Portfolio独立PG集成验证部分BUY已捕获2010时`CANCELLED`保留捕获金额、只释放余量、余额5980可再次预留。`pnpm verify:stage -- --stage V2.4 --suite code`完整退出0，normal/rejection/recovery API/Web与同Run CLI、服务认证、PostgreSQL集成和Linux ARM64 readiness均通过，活动服务未连接。剩余真实Fill/撤单并发竞态、费用更正及独立外部委托仍NOT_RUN；W2/V2.4保持未完成。见[审计](../../../evidence/audits/2026-10-02-w2-fakebroker-partial-cancel-idempotency.md)（关联SHA清单保留为该次执行的历史点时快照；当前工作区源码以后续审计为准）。

2026-10-02 P-F05费用更正跨服务闭环增量：在Portfolio接收端基础上，Trade新增仅平台Bearer可调用的版本化费用更正接口，按连续revision/前值及成交入账条件写入FakeBroker持久Outbox；先前费用事件未确认时拒绝下一版，三次失败进入既有补偿状态。隔离Trade PostgreSQL验证顺序、幂等、冲突、投递claim/ack及不可变原始Fill；扩展P5.7双服务HTTP/PG smoke实测Trade→Portfolio投递、精确费用差额账本、BUY captured cash同步、同请求重放和错误调用身份403，业务TestRun `72cf8f97-7df5-4be4-a1f0-9b6981321213`，现金8996.9990、账本3条、捕获额1003.0010。P-F05其余成交/撤单因果竞态与独立外部委托仍NOT_RUN，故V2.4/P-F05/W2整体未完成。详见[跨服务费用更正审计](../../../evidence/audits/2026-10-02-w2-fee-correction-outbox.md)（关联SHA清单保留为该次执行的历史点时快照；当前工作区源码以后续审计为准）；Portfolio接收端历史见[接收端审计](../../../evidence/audits/2026-10-02-w2-portfolio-fee-correction.md)。


2026-10-02 P-F05撤单期间成交及累计回报增量化：Trade现支持平台Bearer保护的固定FakeBroker模拟累计Fill报告契约，按严格递增broker sequence及幂等externalFillId记录原始报告；累计数量下降、越过订单量、改写重复ID、终态订单回报均拒绝，累计值未增加只留原始报告、不创建重复Fill/Outbox。新增成交以差量独立写FakeBroker Fill和Portfolio Outbox，撤单与回报竞争由订单行锁线性化。隔离PG同时覆盖“成交报告先于撤单确认”与“撤单确认先于成交报告”两种确定顺序，验证部分成交后关闭余量、所有Fill投递后才释放Reservation。双服务HTTP/PG smoke TestRun `f86a080a-e379-490f-9a95-30863e0130a3`证明初始50股+撤单中累计75股转换为25股增量；两笔Fill仅入账一次，终态`CANCELLED`，Portfolio现金`8230.9685`、账本5项、Reservation `RELEASED`且捕获`766.0305`；重复请求幂等，Replay调用方403。专用FakeBroker PostgreSQL完整覆盖累计回退/超量/零增量/报告重放/撤单终态隔离。其为可控FakeBroker回报，不证明真实券商延迟回报或独立外部订单；该项及当前Web/CLI人工验收仍NOT_RUN，P-F05/W2/V2.4保持未完成。审计见[撤单期间成交审计](../../../evidence/audits/2026-10-02-w2-fakebroker-fill-cancel-race.md)；原始SHA清单保留为该次运行的历史点时快照，当前工作区代码Hash由后续审计分别记录。

2026-10-02 P-F05增量报告后的完整V2.4代码套件复验：`pnpm verify:stage -- --stage V2.4 --suite code`受控退出0，包含Trade/Portfolio/Market Data隔离PG、V2.4 normal/rejection/recovery HTTP与Web、同Run CLI、浏览器、响应丢失恢复和Linux ARM64 readiness；费用更正/撤单中累计Fill HTTP/PG TestRun `1d17df03-32af-4604-ad29-dc69e32f3c2d`通过，活动服务未触碰。API Runs `a32c3fbd-72d1-4c8a-b6ac-de6765d05262`、`3d0e53a1-00bf-4c91-b176-870b9125522a`、`76cc71a0-320b-4130-9d40-6a1f290e0a35`，Web Runs `c0c06d2b-5e0e-4106-aec1-6353bbac6567`、`d9960f8c-6ccb-4c7d-a727-11c0bbeb20b9`、`7ae068af-9ccf-40b7-942c-779252f65651`；Linux ARM64镜像`sha256:ce3099253598b1e413ad5de21762c166d389a9d7b83b09d24f1d474a4c83d11e` readiness PASS，交易入口关闭。该机器回归不构成人工签署或20日实际观察；P-F05独立外部模拟委托、真实券商延迟报告语义、V2.4用户验收、来源授权与观察仍未完成。

2026-10-02 P-F05独立外部模拟订单正式Web验收：V2.4新增`external-reconciliation`固定Fixture场景，独立FakeBroker观察与本地订单账本分开保存；TestRun断言识别`EXTERNAL_ORDER_MISSING_LOCALLY`，正式Web显示外部订单ID、数量、状态和证据引用，Web TestRun `bf8e8474-ce11-43c8-a9d4-ca2268c0c8a1`及API TestRun `47a3acfd-bd1d-4c58-9bc5-42b916f228de`均由CLI同Run `--check-only`退出0。完整四场景V2.4 code suite退出0；完整HTTP/PG/Web/ARM64结果见[全栈审计](../../../evidence/audits/2026-10-02-v24-paper-smoke-912a971fa6374e339157f75bee08b5f6.json)、[Web证据](../../../evidence/audits/2026-10-02-v24-paper-web-e2e-bf8e8474-ce11-43c8-a9d4-ca2268c0c8a1.json)和[差异截图](../../../evidence/audits/2026-10-02-v24-paper-web-external-reconciliation-bf8e8474-ce11-43c8-a9d4-ca2268c0c8a1.png)。关闭P-F05独立模拟单的工程及自动Web/CLI验证子项；不代表真实券商协议、当前范围人工签收、来源授权或20日观察完成，V2.4保持PARTIALLY_IMPLEMENTED。

2026-10-03 ADR-0008 FakeBroker事件因果顺序工程子项：完整V2.4代码suite退出0；P5.7 TestRun `5b5cabfe-8965-4106-8980-109a71c1e112`证明序号2撤单先到后不应用、重启后缺口仍持久且Reservation不释放，序号1 Fill补齐后事务内依序应用并只释放未成交资源。重复事件幂等、同序号异载荷冲突。该项按FakeBroker域和隔离集成验证通过；不覆盖真实券商接口、NO_TRADE/来源许可、O1/O2、当前范围人工验收，故V2.4总验收仍未通过。证据：[W2事件顺序当前复验](../../../evidence/audits/2026-10-03-w2-fakebroker-event-sequence-full-v24-suite.md)、[机器报告](../../../evidence/audits/2026-10-03-w2-fakebroker-event-sequence-full-v24-suite.json)。


V2.3当前源码回归（2026-10-03）：TestRun `af9bcd6d-2e47-4f78-8851-40098accf24c`，完整code suite PASS；仅证明锁版Qlib Fixture与当前165项源码身份，不代表真实数据、独立验证、Paper或人工验收。证据：[审计](../../../evidence/audits/2026-10-03-w4-v23-after-v33-save-path-guard.md)。阶段状态维持未完成。

2026-10-03 V2.3 W4 evidence increment: the isolated synthetic Qlib fit and owner-scoped Artifact/TestRun flow passed, including same-run CLI check-only and evidence export (TestRun `2674d870-f73d-456b-9630-4209e0dce45f`, Manifest SHA-256 `76a60f7d0736dd022057d6c8c8cff7a945fbff9970f63496f219ec35fd75a3e1`). This is automated engineering evidence only. Independent validation, real-data authorization, Ubuntu x86_64, required observation, and this increment's user acceptance remain NOT_RUN; the V2.3 stage/version is not signed off.

2026-10-03 V2.4当前代码套件与告警跨服务浏览器验收更新：完整`pnpm verify:stage -- --stage V2.4 --suite code`退出0，normal/rejection/recovery/external-reconciliation四场景及同Run CLI通过；新增真实浏览器→Platform→隔离Market Data PostgreSQL告警确认，确认状态与Cookie用户落库一致。审计：[完整报告](../../../evidence/audits/2026-10-03-v24-paper-smoke-ce6b0c6569f74286889aff48e622d63c.json)，[SHA-256](../../../evidence/audits/2026-10-03-v24-paper-smoke-ce6b0c6569f74286889aff48e622d63c.sha256)。本轮为自动/隔离测试证据，不是用户人工签署；来源授权NONE、O2观察不足、活动部署/人工验收未完成，V2.4仍为PARTIALLY_IMPLEMENTED。

2026-10-03 V2.3 W4自动证据增量：当前代码完整套件新建合成Qlib TestRun `5595be61-15b5-4bf9-8b1a-0c3985db98d7`，锁版容器Fit/Predict、24项有限预测、时间切分、持久Artifact/owner隔离、同Run CLI check-only及Manifest均通过。此增量不构成用户验收；真实市场/PIT、独立验证、Ubuntu x86_64及新研究能力签署仍NOT_RUN，V2.3仍为PARTIALLY_IMPLEMENTED。证据：[审计](../../../evidence/audits/2026-10-03-w4-v23-current-fixture-rerun.md)、[TestRun](../../../evidence/local/V2.3/5595be61-15b5-4bf9-8b1a-0c3985db98d7/evidence.json)、[Manifest](../../../evidence/local/V2.3/5595be61-15b5-4bf9-8b1a-0c3985db98d7/manifest.sha256)。
2026-10-29 V2.3/C4当前代码定向复验：批准的合成Fixture TestRun `3e0536e2-b156-41ad-b6ed-3ca7482ab7f6`通过真实隔离Web/API/Qlib、Artifact持久化与所有者隔离、同Run CLI `--check-only`及脱敏导出；外部来源请求0，临时资源全部清理。详见[复验审计](../../../evidence/audits/2026-10-29-v23-c4-fixture-rerun-3e0536e2.md)和[TestRun证据](../../../evidence/audits/2026-10-29-v23-c4-fixture-rerun-3e0536e2/evidence.json)。C4已批准范围证据仍不改变V2.3整体`PARTIALLY_IMPLEMENTED`：`modelValidation=NOT_RUN`，真实市场/PIT与收益/模型质量门禁未运行。

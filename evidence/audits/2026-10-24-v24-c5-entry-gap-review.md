# C5 / V2.4 连续 Paper 接续缺口复核

日期：2026-10-24。用途：在C4本地Fixture范围人工验收后，核对C5当前实际状态和可继续范围。下列“入口复核”是实施前快照；本文件末尾追加了本轮获准的C5 Fixture接线及实测结果。

## C4前置结论

C4批准的Fixture本地学习范围自动与人工验收均已PASS，签署见[记录](2026-10-24-v23-c4-fixture-human-acceptance.json)。V2.3整体仍`PARTIALLY_IMPLEMENTED`；C5可继续不依赖真实市场研究的Fixture开发和隔离验证。C5真实来源与活动观察不能以C4 Fixture结果替代。

## C5已有证据

- 准备态：owner-scoped持久`WAITING` TestRun、真实Platform→Trade Execution readiness代理、同Run Web/CLI只读核对；默认订单关闭。
- 隔离业务纵切：固定`FIXTURE/PAPER/FAKE`场景已验证授权、快照执行、资源预留、订单/Fill/Outbox、组合账本，以及normal、stale rejection、响应丢失后按原clientOrderId恢复。它是受控的一次性Fixture链，不是实际采样器驱动的连续Paper。
- FakeBroker可靠性：持久幂等、UNKNOWN安全恢复、事件序号、迟到Fill/撤单、费用更正及投账屏障已有隔离PostgreSQL证据；V2.4完整代码套件2026-10-05通过。
- 调度与防护：20/30分钟策略、SystemClock调度恢复及超过60秒的错过窗口转`RECOVERY_CHECK`已有验证；`NO_TRADE`、未授权/陈旧/断连/未知来源等执行暂停原因可持久记录并在`/paper`只读显示。
- Web：`/paper`为状态只读页；`/acceptance/v2/v2.4`已有Fixture normal/rejection/recovery/external-reconciliation Web场景与同Run CLI证据。

## 未完成门禁

1. **纵向业务接线**：实际Market Data采样任务尚未持续驱动日频信号→治理/Mandate→风险评估与资源预留→FakeBroker→Portfolio账本→日终对账的同一运行链。现有快照执行纵切不能证明后台连续链。
2. **OD-007策略/Mandate**：仅批准只读`NO_TRADE`基线。活动Paper所需的精确策略版本、证券/账户、资金、持有期/再平衡、偏离、风险与费用版本、有效期均未决定/未设置；不得由测试自动激活或创建活动订单。
3. **OD-008运行条件**：个人本地学习的有界源测试已通过，但长期行情源能力/稳定性尚未验证，V2.4报价读取配置保持关闭。来源门禁和策略门禁满足前，不启动真实时钟行情采集或正式观察。
4. **运行恢复与日终**：完整账户过期检测、连续交易/日终告警生命周期、自动日终对账、告警去重和断网/睡眠后的真实调度恢复仍未闭环；一部分暂停原因展示已完成。
5. **观察与签收**：新链20个合格实际交易日为`NOT_RUN`，当前范围V2.4人工验收未发生。历史8/20不能抵扣。

## C5 Fixture接线可行性复核

进一步核对Market Data与Platform API实现后，现有两个冻结输入不能直接组成同Run端到端场景：V2.1采样Fixture的观察时间固定为`2026-10-16T09:50:00+08:00`；当前V2.4执行Fixture的执行窗口为`2026-09-25T09:31–09:35+08:00`，且其快照价格/时间是独立静态输入。把前者直接塞入后者会破坏信号/执行窗口或快照新鲜度断言。

采样任务在提供scope时还要求Market Data已有匹配owner/account/namespace/TestRun的持久化scoped watchlist。现有V2.4 TestRun会创建Paper账户，但不会为该采样链初始化watchlist。因此要证明真正的同Run纵向接线，需新增专用的合成组合Fixture/场景，明确关联采样结果与Paper执行时间/价格，并在同一TestRun初始化最小watchlist；不得改写V2.1或V2.4既有冻结Fixture。

## 实施前下一执行切片（已完成）

先冻结独立C5组合Fixture及契约，再在隔离环境完成“同Run scoped watchlist→持久采样Fixture TestRun→执行端消费采样结果→测试专用Fixture策略/Mandate→FakeBroker/账本”接线。复用固定采样时点或另建新Fixture版本，必须保证不改写既有Fixture；覆盖重复tick/重复消费幂等、陈旧/拒绝零副作用、接受响应丢失时按原clientOrderId恢复及同Run CLI只读核对。只允许测试专用`FIXTURE/PAPER/FAKE`，不能修改活动策略、开启报价读取或启动正式调度。之后再依据OD-007、OD-008决定受控真实时钟观察；20日观察只在前置完整并经单独确认后开始。

实施前结论：C5为`PENDING`。该结论描述实施前状态；实施后的C5 Fixture子范围结果如下。

## 2026-10-24 C5 Fixture接线执行与复验

按上述顺序新增独立的`v24-sampled-paper-composition-1`合成组合Fixture及JSON Schema，未改写V2.1原采样Fixture或V2.4原交易Fixture。Fixture固定2026-10-16同一采样/执行场景、20分钟采样间隔、600000.SH信号和10.2500价格，并保留原V2.1源Fixture要求的三只证券scope。Platform在每个V2.4 TestRun内创建Paper/FAKE账户及owner/account/namespace/TestRun scoped watchlist，读取并校验组合Fixture Manifest，再经Market Data持久任务执行采样；Trade Execution消费实际持久观测的snapshotId和价格。拒绝场景使用持久stale Fixture观测，不写FakeBroker订单/Fill或额外Portfolio账本。重复tick返回原任务ID且`created=false`。FakeBroker命令将Fixture初始现金显式传入，保持精确资金/预留断言和安全恢复。

完整隔离烟测：[机器报告](2026-10-24-v24-paper-smoke-0a05aa0123e34b5eb07fc639d0f0fb15.json)为`PASS`；API正常、拒绝、恢复及外部订单差异四场景均`COMPLETED`，四个API TestRun各自同Run CLI `--check-only`退出0；包含响应丢失后的原单恢复和Trade进程重启查询。容器化Chromium四场景及每个Web TestRun的CLI同Run检查均通过，详细断言/证据见[Web/API/CLI报告](2026-10-24-v24-paper-web-e2e-8c000573-52d8-4837-9c4c-70552fc756aa.json)。临时数据库均在快照导出后删除，临时Web容器和镜像已删除，`activeServicesTouched=false`。

随后补入`v24-c5-daily-bars-1`：它不复用两证券V2.1日线输入，而为C5同一三证券scoped watchlist提供独立冻结`DAILY_BAR`批次。Market Data只接受登记Fixture版本，核对Manifest SHA-256、scope和完整证券集合后持久入队。normal、recovery和external-reconciliation均验证日线完成、重复请求返回原持久任务且`created=false`，并在读取FakeBroker/Portfolio对账事实后完成。

恢复分支补充（2026-10-24）：此前若订单接受响应丢失且原单查询暂不可用，`/recover`可恢复已持久订单和账本，但未重放该Run的独立日线完成。现已在创建Run时先持久记录冻结日线计划；恢复仅使用原owner/account/namespace/TestRun和原Fixture版本入队，再重复请求验证幂等。隔离故障注入实际覆盖“响应丢失→查询503→Trade重启→不盲目重发→`/recover`”，恢复Run的`V2.4-C5-DAILY-BAR-001`和`V2.4-C5-DAILY-BAR-IDEMPOTENCY-001`均PASS，CLI `--check-only`退出0。现有告警Outbox的浏览器确认也持久化为`ACKNOWLEDGED`；这验证的是Fixture告警通道，不构成连续日终告警观察。

更新后的[完整隔离Smoke](2026-10-24-v24-paper-smoke-d3c8022e6a3c4f7ba26c8ab31f1a0402.json)和[Web/API/CLI报告](2026-10-24-v24-paper-web-e2e-01578745-d570-445d-ba8e-cd2cb44b2058.json)均`PASS`；临时五库导出后清理，`activeServicesTouched=false`。拒绝场景继续在陈旧快照门禁处终止，不创建日线、订单、Fill或账本副作用。

定向质量门禁：`pnpm contracts:check`、`pnpm fixtures:check`、Platform API typecheck、Web typecheck均退出0。完整浏览器 smoke中修复并验证了两个先前未在正式签发session下运行的E2E请求夹具。该轮不是完整V2.4 code suite，也不改变当前范围的用户人工验收状态。

**当前C5结论：**同Run持久Fixture采样→Paper/FakeBroker/Portfolio→独立日线完成/对账读取这一工程子项已自动验收通过；C5整项仍`PENDING`。OD-007活动策略与Mandate、OD-008真实来源用途/能力及授权、正式行情采集/调度、真实时钟稳定性与20个合格交易日、当前范围人工签收仍未完成。所有对应真实源/正式调度保持关闭，不能用该Fixture结果增加观察日。

## 候选A确认后的日频目标切片（2026-10-24）

所有者已批准候选A参数用于实现和隔离验证，见[决定记录](../../docs/decisions/2026-10-24-c5-candidate-a-parameters.md)。OD-007不再是“参数尚未确认”；剩余为活动绑定、接线与最终启用。没有代签当前候选人工验收，也没有启用真实来源或观察日。

新增独立冻结`v24-daily-direction-1`，输入SHA-256 `b04ca7ed834cbbddca1138905aa3c208574b362c9d44dc15b91a9717c68ae48b`。两根合成已完成日线和实际隔离Portfolio初始现金经已确认策略源码计算BUY 100，Platform在调用Governance之前保存`v24_fixture_daily_targets`，随后从PostgreSQL重读此目标组装信号。信号ID使用targetId，`asOf`使用实际评估Clock，不能早于两根输入的availableAt。新场景版本为`2.2.0`，旧Fixture字节及历史运行未重写。

目标持久记录包含owner/account/namespace/TestRun、策略/输入Hash、两根日线、评估Clock、决策和原clientOrderId；同一TestRun只允许一个目标，相同输入幂等，修改输入/替换账户冲突。HOLD与PAUSED不生成订单身份。恢复读取原目标并核对命令/策略/原单身份，再走原单查询；目标不是权威Mandate、风险预算或账本。Web时间线显示目标与策略，刷新和原Run恢复仍读取后端事实。

最终[完整隔离报告](2026-10-24-v24-paper-smoke-ceb06091a3594f0f8be26836f1b07c18.json)及[Web/API/CLI报告](2026-10-24-v24-paper-web-e2e-bba7e007-2518-4fe8-8cf3-54a8e7563252.json)均PASS；normal/recovery/external-reconciliation包含新增目标/目标幂等断言，rejection仍在陈旧报价处零交易副作用退出。四个API场景与四个浏览器TestRun及同Run CLI全部通过。查询失联恢复Run `99443de4-b21a-4ec6-bd0c-f88086ccd2c8`最终COMPLETED，只有一次执行请求，未盲目重发。五库快照导出后清理，Web容器/镜像与临时PG容器/网络均已移除，`activeServicesTouched=false`。较早的`2483f59ba0294af19d352c8c3acf9bd7`报告保留为信号时间修正前历史；追加运行核对了信号时间和源码Hash，不用早期结果代替修正后验证。

| 验证 | 实际命令/范围 | 结果 |
|---|---|---|
| 纯规则/配置门禁 | Platform Vitest：`v24-daily-direction.spec.ts`、`v24-paper-approval.spec.ts`、`v24-scheduler-authorization.spec.ts` | 31/31，exit 0 |
| PostgreSQL持久化/并发/重新连接恢复/不可变及隔离 | 临时PG包装器→`vitest run tests/integration/v24-daily-target-postgres.spec.ts` | 4/4，exit 0；补强单Run唯一性后重新实测通过 |
| API/Chromium/CLI与原单恢复 | 临时PG包装器→`pnpm --filter @stockquant/platform-api-service v24:paper-http-smoke` | exit 0；报告及实际ID见上 |
| 类型/契约/输入 | Platform、Web typecheck，`pnpm contracts:check`、`pnpm fixtures:check` | 全部exit 0；55个冻结文件Hash检查通过 |
| 真实返回契约 | 旧V2.4 schema仅描述WAITING，现保留准备态分支并增加Fixture执行分支及dailyTarget类型，TS/Python重新生成；对本轮PG导出的14条V2.4当前TestRun映射API字段后用AJV校验 | 14/14；无错误，历史WAITING兼容保留 |

**准确边界：**本切片完成“候选日频规则→不可变Fixture目标→既有治理/快照执行/账本→日线完成与对账读取”的BUY子链。使用既有三证券采样模板、20分钟和09:49–09:55 Fixture窗口，原政策允许1800秒年龄；它没有验证候选A活动范围的单证券30分钟、09:31–09:35和60秒政策。SELL在2026-10-24后续接线中已进入受控 Fixture 的治理、快照风险、Portfolio可卖数量预留和Fill事件方向；该证明只是单笔命令语义，未以持仓Fixture验证跨日卖出款结算。活动账户/Mandate、前一日后台自动生成次日目标、跨日连续持仓/结算、持续敞口/日累计/亏损预算和自动日终告警仍未闭合。下一项按已确认参数继续这些工程接线，无需重复确认候选参数；正式启用和20日观察仍未执行，C5保持PENDING。

## SELL 命令语义接线（2026-10-24）

V2.4隔离快照契约把`signal.action`从仅`BUY`扩展为`BUY | SELL`，没有增加REAL、LIVE或常驻调度入口。治理仍只接受同一`FIXTURE/PAPER/FAKE`、owner/account/namespace/TestRun限定的grant；Trade Execution根据实际方向请求Portfolio：BUY使用精确现金预留，SELL使用证券和数量及运行Clock进行可卖数量预留。Snapshot FakeBroker命令和Fill Outbox负载保留该方向，因此后续Portfolio账本可按照SELL处理结算，而不会将卖出误投为买入。

已实际运行Trade Execution Fixture gate 5/5、Governance Fixture authorization 8/8，两个服务及Platform typecheck、`pnpm contracts:check`、`pnpm docs:check`和`git diff --check`均退出0。本轮没有建立持有100股的跨日账户Fixture，也没有启动HTTP/浏览器全链重跑；不能把这些定向验证记为卖出结算、连续Paper或人工验收的通过。

## 卖出款结算组件复验（2026-10-24）

通过临时隔离PostgreSQL运行`resource-reservations.spec.ts`，7/7通过。该真实仓储验证以CN_A/PAPER/FAKE账户记录SELL Fill：现金在卖出日保持不变、应收款为`PENDING`，结算日前的BUY现金预留被`INSUFFICIENT_AVAILABLE_CASH`拒绝；到冻结结算日09:30后`settleDue`只结算原Fill、将应收款标为`SETTLED`并写入现金，随后相同额度BUY预留可创建。该运行的容器、网络及数据库均已自动删除，未连接活动服务。

这证明既有账本严格结算能力仍可复现，并不等同于V2.4候选账户的连续持仓验收：尚缺一个独立V2.4 Fixture，把前一日BUY产生的100股、次日SELL、同一账户的待结算款、下一日可用现金和FakeBroker/Portfolio对账放入同一TestRun。

后续补齐的同范围账本场景使用`v24-paper-v2-{TestRunId}` namespace 和同一 owner/account/TestRun：2024-01-04 BUY 100股（10.0000，费5.0000）后，2024-01-05仅在T+1可卖数量已成立时 SELL 100股（10.2500，费5.0000）。账户现金从10000降为8995，1020卖出款作为`PENDING`应收款映射至2024-01-08；09:30前9500的BUY预留拒绝，09:30后结算为10015并允许预留。该新增真实PostgreSQL场景与现有资源预留集成测试一起8/8通过。它使持仓、T+1、结算与可用现金在一个V2.4范围的账本TestRun中闭合，但仍不包含同Run FakeBroker执行/对账或HTTP/Web入口。

快照执行随后写入FakeBroker独立资产账本，而不只保留订单/Fill/Outbox：BUY同步扣减独立现金、增加独立持仓；SELL同步扣减独立持仓并持久待结算应收款，只有`settlePaperReceivables`在映射结算日后释放独立现金。Platform在非拒绝V2.4场景读取该独立账本并新增`V2.4-PAPER-009`，要求owner/TestRun/currency以及现金/持仓与Portfolio完全相同。最终[隔离Smoke](2026-10-24-v24-paper-smoke-f32b10a56a2140daa68ebb151c5c79e2.json)为PASS：normal、recovery和external-reconciliation均通过新断言，四个API、四个Chromium和同Run CLI通过；五库快照先导出，临时数据库、Web容器和镜像均清理，`activeServicesTouched=false`。当前HTTP/Web对账仍是BUY Fixture；SELL跨日尚未作为此入口的端到端场景。

## 依据

## 2026-10-25 跨日结算入口收口

新增`crossday-settlement`固定`FIXTURE/PAPER/FAKE`场景，复用同一TestRun账户完成2024-01-04 BUY、2024-01-05 SELL、2024-01-08结算。结算日前的9500 CNY BUY预留经Trade Execution受控探针返回HTTP 409及`INSUFFICIENT_AVAILABLE_CASH`，未放宽Platform直接写Portfolio账本的权限。结算后Portfolio与独立FakeBroker现金均为10015.0000、持仓为空、两个订单和两个Fill均已对账。

[完整隔离报告](2026-10-25-v24-paper-smoke-c232c06585d844a285f9c768162e3293.json)和[浏览器报告](2026-10-25-v24-paper-web-e2e-23768f56-8e3b-4d28-877a-e08772da42ea.json)均为`PASS`：五个API、五个Chromium Web场景及每个同Run CLI `--check-only`通过，临时数据库导出后清理，`activeServicesTouched=false`。这关闭了C5 Fixture范围的跨日SELL/结算入口工程与自动验收；OD-007、OD-008、真实时钟观察、20日和当前范围人工验收仍未完成。

## 2026-10-25 Candidate A 隔离绑定

新增冻结输入`fixtures/v2/v2.4/candidate-a-binding-v1`，包含已确认的`c5-daily-direction-v1`源码SHA、CN_A/600000.SH、10,000 CNY独立账户、`c5-local-risk-v1`、`c5-local-flat-fee-v1`和批准记录引用。`candidate-binding`场景只通过服务端生成的TestRun/account/Mandate身份持久化这些事实；客户端、环境变量和旧Fixture都不能伪造该绑定。

Governance Mandate 使用隔离测试时钟的短有效窗口，创建后必须读取为`PENDING`，从未激活；预算读取必须为零，订单/成交数组为空，连续调度状态必须为`STOPPED`。这避免把候选长期有效期或活动启用状态塞入24小时TestRun Mandate 约束。完整临时PostgreSQL五库 smoke 运行`node scripts/run-isolated-postgres-command.mjs --admin-env V24_PAPER_SMOKE_ADMIN_DATABASE_URL -- pnpm --filter @stockquant/platform-api-service v24:paper-http-smoke`退出0，并对该TestRun执行`verify-stage --check-only`退出0。

该验证完成C5第一项的隔离持久绑定，不创建活动账户/Mandate，不开放真实来源、不启动调度，也不增加任何观察日。后续仍需把持久日频目标接到后台时钟、候选A的60秒新鲜度与09:31–09:35窗口、持续风险/暂停/恢复和日终告警生命周期。

### 隔离目标物化器增量

`V24FixtureDailyTargetWorker`现成为后台目标生产的受限入口：输入必须带完整owner/account/namespace/TestRun scope，读取同scope Portfolio账户，再调用既有不可变目标仓储。它不枚举账户、不读取真实来源、不做订单提交。隔离绑定中的`PENDING` Mandate 会被明确转译为`PAUSED/MANDATE_INACTIVE`目标，`targetQuantity`和`clientOrderId`均为空；因此即使未来由受控Worker调用，也不会绕过活动Mandate门禁。

定向Vitest为16/16通过，完整五库smoke再次通过并核对该持久目标、零预算、零订单、零成交和停止调度。正式实时调度尚未调用此入口：接线前仍需定义活动Mandate读取、可恢复任务队列、真实交易日和严格执行窗口语义。

补齐`v24-revisions`拒绝场景的scoped watchlist、Fixture采样任务、重放和读取mock后，Platform完整unit suite为71个文件、387项通过。该回归仍走陈旧观测拒绝，验证新增物化器或采样依赖不会在拒绝场景产生订单、Fill或Outbox。

## Candidate A 持久风险状态基线（2026-10-25）

新增`v24_candidate_risk_states`，以TestRun/owner/account/namespace为唯一作用域保存Candidate A固定初始现金、2,000 CNY总敞口/日累计上限和200 CNY累计亏损阈值。绑定场景初始化时，权威Mandate仍为`PENDING`，所以风险状态写为`PAUSED/MANDATE_INACTIVE`，日累计、敞口与累计亏损均精确为`0.0000`。它不把活动Mandate或订单事实写入风险表。

定向风险状态测试3/3及完整临时五库smoke通过；smoke读取同一TestRun中的持久风险状态、暂停目标、零预算、零订单和零成交。当前仅完成持久状态基线，尚未将实际Fill/净值变动写入日累计/敞口/亏损转换；相应执行窗口、原单恢复、暂停恢复和日终告警仍为后续工作。

### 阈值转换规则

风险状态现有独立复算入口：日累计成交严格超过2,000 CNY、总敞口严格超过2,000 CNY，或累计亏损达到200 CNY时，状态转为`PAUSED`并保留精确原因；已暂停状态不能由低风险事实自动恢复。6项规则测试覆盖三个阈值、非法输入与非自动恢复。它不生成订单、不会从环境变量取得许可，也尚未消费实际Candidate A Fill或净值事件；这些事件必须先与活动Mandate、原单查询和日终对账一起接通。

风险事实现通过`v24_candidate_risk_states`的同scope行锁事务读取、复算、写回；不存在或跨owner/account/namespace的状态不能被更新。绑定场景只持久回写零事实，用于验证事务路径，继续保持`PAUSED/MANDATE_INACTIVE`。完整隔离五库smoke在此变更后通过。真实Candidate A Fill、净值和原单查询仍未可用，因而没有伪造风险累计或自动恢复证据。

### 只读风险事实投影与双账前置条件（2026-10-25）

`projectV24CandidateRiskFacts`只读取同scope Portfolio账户快照和冻结日频Fixture价格，精确计算现金、600000.SH持仓市值、应收款、净值、总敞口及相对初始资金的累计损失。日累计成交不能由资产快照反推，因此始终标为`NOT_AVAILABLE/FILL_FACTS_REQUIRED`。只有独立FakeBroker资产快照存在且初始现金、现金、持仓、应收款完全匹配时才可报告双账`MATCH`；不创建独立资产的PENDING候选绑定如实报告`NOT_AVAILABLE/INDEPENDENT_FAKEBROKER_ASSETS_NOT_CREATED`，并且`eligibleForRiskUpdate=false`。

定向Vitest（风险状态与投影）9/9、Platform typecheck、`git diff --check`及临时五库`v24:paper-http-smoke`均退出0。该冒烟会核对候选账户净值10000.0000、零敞口/零损失、不可更新状态，并继续确认PENDING Mandate、零预算、零订单、零成交和停止调度。此项没有创建订单、没有启动调度、没有使候选变为活动状态。实际Candidate A Fill、独立资产双账MATCH、日累计与风险状态事务更新、原单查询/重启恢复和日终告警仍是后续必要项。

### 受限成交风险累加与持久闭环（2026-10-25）

风险状态保存`appliedFills`，每项包含`externalFillId`及完整成交/事实指纹。`applyV24CandidateRiskFill`只接收`600000.SH/CNY`的正数量成交，且调用方必须已经取得独立资产与Portfolio的`MATCH`对账结果；日名义成交按`quantity × price`精确累加，费用不混入成交名义额。相同ID及相同指纹返回原状态；同一ID内容变化、非匹配账本或非当前交易日输入均失败关闭。`SETTLED`应收款已成为现金，净值投影只计入`PENDING`应收款，避免重复计算。

`PostgresV24CandidateRiskStateRepository.applyFill`在TestRun/owner/account/namespace行锁中读取、核验、复算并回写状态。隔离正常、恢复和外部差异场景在FakeBroker Fill及双账`MATCH`后写入日累计`1025.0000`、敞口`1025.0000`、累计损失`5.0000`及一个成交指纹；`V2.4-C5-RISK-001`为PASS。正式Web展示MATCH、三项风险数值和成交计数，Web、API及同Run CLI均核对该事实。

定向领域测试13/13、真实隔离PostgreSQL并发/重连测试2/2、Platform及Web typecheck、`git diff --check`和临时五库`v24:paper-http-smoke`均退出0。该闭环只使用冻结`FIXTURE/PAPER/FAKE`输入，不创建常驻活动Mandate、不读取真实来源或启动调度。跨交易日风险轮换、暂停后的受控恢复和日终告警仍为后续工作。

## 2026-10-25 跨交易日风险轮换与受控恢复

`v24-candidate-risk-state`现在持久记录`sessionDate`和轮换审计记录。隔离`crossday-settlement`在1月4日BUY后写入1000成交额与1000敞口，进入1月5日时清空仅限当日的成交指纹与成交额，再写入SELL的1025成交额；1月8日结算后的账户/独立资产核对为`MATCH`，敞口及累计损失为零。限额暂停状态不能无记录恢复，必须同时提供操作员与批准时间；`MANDATE_INACTIVE`不允许轮换。这不是活动Mandate、生产恢复或日终调度的实现。

定向领域测试为15/15，真实隔离PostgreSQL测试为3/3；[完整五服务 HTTP/Chromium/CLI smoke](2026-10-25-v24-paper-smoke-8f11ad07ce2e4619a0d611e6e2f44d3a.json)与[Web 场景报告](2026-10-25-v24-paper-web-e2e-b292b5c0-1cca-47e0-bd4e-e3e924678679.json)均为`PASS`，前者确认`activeServicesTouched=false`。日终自动对账/告警、活动账户、正式来源和长期真实时钟观察仍未完成。

## 2026-10-25 候选A严格执行时窗与新鲜度

新增纯领域`v24-candidate-execution-gate`，固定Candidate A的CN_A/600000.SH执行准入：接受时间必须位于上海时间09:31至09:35（右开区间），快照必须在接受后观察、状态为`READY`、年龄不超过60秒且相对参考价偏离不超过100bps。窗口外、陈旧、非本证券/市场、无效时间戳和超偏离均失败关闭为`PAUSED`。该门禁本身不能授权、下单、写账本或恢复Mandate。

`candidate-binding`隔离TestRun记录一个40秒的合格样本、一个61秒陈旧样本及一个09:35错过窗口样本，断言`V2.4-C5-CANDIDATE-EXECUTION-001`要求三者分别为`ELIGIBLE`、`SNAPSHOT_STALE`和`EXECUTION_WINDOW_CLOSED`；绑定Mandate继续`PENDING`，订单、成交、预算和调度副作用保持为零。定向领域测试31/31、Platform typecheck和完整隔离命令均退出0。自动日终对账/告警、活动账户、真实来源和真实时钟观察仍未完成。

## 2026-10-25至26 C5日终告警与Web恢复验收

新增Bearer保护的Market Data操作`POST /v2/alerts/paper-reconciliation`及其OpenAPI/生成客户端。Platform在 scoped `DAILY_BAR`任务完成后重新读取FakeBroker与Portfolio事实，以TestRun作为告警键：差异创建或更新一个`V24_PAPER_RECONCILIATION_DISCREPANCY`严重Incident；重复请求复用当前Incident；账本恢复匹配时调用同键恢复关闭并留下本地Outbox事件。结果会进入TestRun的`dailyClose`证据，匹配与外部订单差异场景各有断言入口。该操作只在显式隔离验收Run调用，不启用真实日终调度或外部通知。

首轮完整Web复验失败，分别暴露恢复事务没有把候选风险状态及日终Incident结果写回同一TestRun，以及跨日结算证据未提供Web通用`projection`字段。Platform已修复恢复路径：查询原订单后核验独立资产，按Fill指纹幂等应用风险状态，完成日线与对账告警并记录PASS/FAIL断言；跨日结算统一投影字段用于正式Web显示。修复后的[完整隔离报告](2026-10-26-v24-paper-smoke-206840a62ec441ebb42b750fb987f552.json)为`PASS`：6个API场景均COMPLETED、同Run CLI `--check-only`退出0，5个Chromium TestRun全部退出0；差异Incident按TestRun去重，`OPEN`→`RESOLVED`且重复恢复不新建事件。运行限定`FIXTURE/PAPER/FAKE`，五库快照先导出，临时容器/网络已清理，`activeServicesTouched=false`。代码typecheck/build及差异检查通过。该结果关闭Fixture工程子项；真实日终调度、通知、睡眠/断网中的真实时钟恢复、来源条件和观察门禁仍未验收，C5维持PENDING。

- [本次关键源码/输入指纹](2026-10-24-v24-c5-daily-target.sources.sha256)
- [V2.4阶段任务和限制](../../docs/prd/v2-data-and-replay/04-continuous-paper-trading.md)
- [V2工作包与D1/D2门禁](../../docs/prd/v2-data-and-replay/00-version-plan.md)
- [OD-007/OD-008决定登记](../../docs/decisions/open-decisions.md)
- [V2.4完整隔离套件证据](2026-10-05-w2-v24-code-suite.md)、[本轮C5完整Smoke](2026-10-24-v24-paper-smoke-d3c8022e6a3c4f7ba26c8ab31f1a0402.json)及[Web/CLI详细报告](2026-10-24-v24-paper-web-e2e-01578745-d570-445d-ba8e-cd2cb44b2058.json)
- [C4范围签署](2026-10-24-v23-c4-fixture-human-acceptance.json)

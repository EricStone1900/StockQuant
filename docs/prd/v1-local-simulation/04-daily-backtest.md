# V1.4 日线历史回测与可核对报告

状态：PARTIALLY_IMPLEMENTED（历史自动和先前范围人工验收PASS继续保留；当前完整适用市场规则/日历、完整费税、Qlib/Paper全规则对照、第7节其余交付项和新增范围人工验收仍未完成。2026-10-10历史FakeBroker独立资产原子记账、同命令幂等重试及现金不足拒绝/授权恢复通过；Trade Paper路径现以冻结限制Fixture验证停牌/涨停封板BUY及跌停封板SELL通过Governance授权与Trade Paper HTTP拒单和幂等重放；BUY预留释放，此前SELL不验证持仓/可卖量；现新增冻结两日建仓→锁跌停卖出Fixture，并通过真实持仓Reservation拒单/释放隔离验证，完整V1.4 code suite a05 exit 0（§8.77）。此切片仍不关闭OD-014结算、完整适用规则、阶段交付或人工验收；保留[新增完整套件](../../../evidence/audits/2026-10-10-v14-sellable-position-locked-sell-code-suite-a05.log)及[SHA-256](../../../evidence/audits/2026-10-10-v14-sellable-position-locked-sell-code-suite-a05.log.sha256)。版本入口：[README](./README.md)。共同约束：[三版共同规则](../05-three-version-delivery.md)。

## 1. 前置与范围

V1.3通过；复用同一风控、账本与执行规则，避免另建交易规则副本。

本阶段所有订单、券商资产和成交均来自隔离模拟环境。真实业务数据库、Qlib或RD-Agent在声明“已验证”时必须真正执行；替身需独立标注。

## 2. 开发任务

2026-10-10 P0责任复核：本节六项回测/交易规则要求已按Quant Backtest所有权设计人工核对主责与独立领域账本边界，见[责任映射A01](../../../evidence/audits/2026-10-10-v1-v14-responsibility-a01.md)及[JSON](../../../evidence/audits/2026-10-10-v1-v14-responsibility-a01.json)。Quant拥有BacktestRun/Fixture回放与模拟规则；Platform拥有TestRun投影；Trade/Portfolio拥有Paper订单和权威账本。该映射不关闭完整市场规则或OD-014结算口径。

- [x] TestRun先持久受理，再异步派发Quant；Web/CLI按同一TestRun ID轮询，页面刷新不触发重新计算。已在取消前、Quant执行前崩溃、Quant结果/Manifest提交后崩溃三种路径执行独立PostgreSQL验证，恢复保留原ID；Quant重复输入幂等返回原报告、变更输入409。该工程切片不代表本阶段其余规则或人工验收完成。详情见[持久任务审计](../../../evidence/audits/2026-10-07-v14-durable-tasks-3e249b385f39763ddd91.md)。
- [x] V1.4 Web刷新后恢复最近TestRun：隔离E2E等待原Run处于RUNNING后刷新页面，同一testRunId恢复并完成，CLI只读核验同Run通过，见§8.74及[a02日志](../../../evidence/audits/2026-10-10-v14-browser-refresh-recovery-e2e-a02.log)。该子项不关闭当前范围人工验收。
- [x] Platform→Quant V1.4日线回测生成客户端合同现在直接断言固定路由、Platform服务Bearer/身份、准确scenario/seed/policy载荷、超时信号和422状态/响应保留；定向测试及当前树完整V1.4 code suite通过，详见§8.72。仅关闭该传输合同子项。
- [x] V1.4回测取消命令拒绝客户端status/cash事实注入；422后`cancelRequested`不变，合法空体取消和完整回测/恢复仍通过，见§8.17。
- [x] 持久FakeBroker Fill Outbox载荷逐字段保留固定请求中的账户、namespace、证券、外部成交ID、数量、价格、费用、时间、方向和币种；九条持久载荷与九个持久Fill匹配，且完整V1.4 code suite exit 0，见§8.21及[日志](../../../evidence/audits/2026-10-10-v14-fill-outbox-payload-parity-code-suite-a02.log)。此项仅覆盖Outbox payload边界，不代表Portfolio账本、Trade HTTP全链路、结算或P4整体完成。
- [x] Quant→持久FakeBroker→独立Portfolio数据库的五个固定CN/US BUY账本投影（现金、持仓、账本条数）逐项一致；完整V1.4 code suite exit 0，见§8.22及[套件日志](../../../evidence/audits/2026-10-10-v14-portfolio-buy-ledger-parity-code-suite-a01.log)。此项仅完成BUY账本子集；SELL现金结算/应收与Paper HTTP链路仍未通过，OD-014保持OPEN。
- [x] 历史FakeBroker独立现金/持仓/资产事件与订单、Fill、Outbox同事务提交；9个正常固定成交的同命令重试均幂等；另有现金不足事务零副作用拒绝及新授权恢复一次。三服务真实HTTP/隔离PostgreSQL和完整V1.4 code suite a13通过，见§8.27–§8.28及[a13日志](../../../evidence/audits/2026-10-10-v14-paper-http-parity-code-suite-a13.log)。OD-014结算、SELL应收和可用性仍OPEN。
- [x] 历史FakeBroker零成交终态（`REJECTED`/`EXPIRED`）在授权HTTP执行后通过事务Outbox释放Portfolio Reservation；零成交量拒绝有真实Governance→Trade→Portfolio HTTP/隔离PG验证、无Fill/账本/资产事件、同命令幂等重放通过，见§8.73。仅关闭拒绝/到期预留释放原子子项。
- [x] Replay暂停、恢复、取消及UNKNOWN恢复命令拒绝客户端伪造业务事实；UNKNOWN订单详情按持久ReplayRun namespace读取，跨namespace 404、Replay访问通用订单路由403，四条命令注入均422且持久状态不变。Trade隔离HTTP/PG集成和V1.4完整代码套件退出0，见§8.20及[路由矩阵](../../../evidence/audits/2026-10-09-v1-cross-service-route-matrix-a05.md)。该勾选只关闭这些命令/读取路由切片，不表示全Replay API矩阵或V1.4通过。

- [x] 建立BacktestRun及固定Manifest：数据、股票池、策略/因子、规则、成本、依赖/镜像、种子、初始账户、区间与基准。
- [x] 实现按运行隔离的历史时钟与日线撮合；日终确认信号最早下一可交易时点执行，原价用于成交，复权研究与公司行动入账分离。
- [x] Trade历史FakeBroker HTTP入口执行canonical request schema严格字段边界，包含bar/reservation嵌套对象；隔离HTTP+PG证明三种非法LIVE/REAL组合在授权和订单持久化前被拒，合法BACKTEST仍运行，见[§8.12](#812-historical-fakebroker-http命令严格附加字段边界2026-10-09)。此项只完成请求合同原子边界，不代表完整V1.4回测范围完成。
- [ ] 完成费用、滑点、成交量约束、停牌/限制价、可卖量及结算处理；当前已实现固定费用/不利滑点、可配置A股佣金参数/最低佣金、沪深经手费与过户费、卖方印花税、成交量约束、T+1与单卖单次一Fixture Session结算，并有合成停牌/锁板场景。停牌和锁涨停买入现已在Trade Paper HTTP链路接收完整日线与限制价字段，进入Governance授权Hash与FakeBroker幂等指纹，并实测拒单和预留释放（§8.77）；跌停卖出已通过真实Governance→Trade Paper HTTP授权拒单及幂等重放，但该拒单未绑定实际Portfolio持仓/Reservation，故可卖量和真实持仓链仍未验证。独立合成历史日期费率Fixture覆盖2023-08-28前后规则切换。每笔买卖结果记录请求/成交量、状态和适用原因；拒绝单与部分成交分别统计。完整券商费率、交易所结算日历、公司行动及交易规则一致性仍缺；日线无法确定的盘中顺序采用明确保守规则。
- [x] 单证券日线Fixture按交易Session记录持仓、T+1未可卖量和可卖量；成交日持仓纳入估值，下一条Fixture交易日才释放卖出可用量；同日卖出被拒绝，后续显式SELL按可卖持仓/成交参与率成交，扣费后计未结算款并在下一Fixture Session转为现金。后端断言、Web结果和同Run CLI核对均通过；Fixture结束时未结款仍作为应收项。
- [x] 提供收益/基准、回撤、换手、费用归因、成交率、拒绝/未成交数量和数据覆盖；关联实际模拟流水。
- [ ] Qlib快速研究报告和交易链路回放分开标注执行模型；同一基准案例比对规则与费用，无差异才作为一致性证据。2026-10-07已扩展V1.4与Trade Execution固定规则对照：全成BUY/SELL数量、价格、费用、下一Session，以及参与率限制的部分BUY和零成交拒绝（`PARTICIPATION_LIMIT`/`ZERO_VOLUME`）均逐单对照。Quant单测20/20；隔离真实PostgreSQL/Web/API/Quant集成5/5，8个Web TestRun均同Run经CLI检查；其中部分买单以`INSUFFICIENT_CASH`准确拒绝不可负担部分，允许部分成交，回测独立计数。该隔离集成未调用Trade HTTP/Governance或Portfolio账本；对照尚不覆盖日期费率、滑点取整、现金/应收结算和完整恢复矩阵，故规则一致性项仍未完成。2026-10-09新增独立USD Fixture BUY/SELL对照：Quant结果与PostgreSQL持久FakeBroker的状态、数量、价格、固定合成费用、交易日和Fill Outbox逐项相等；该固定费仅用于USD Fixture，不声称美股真实费税规则已验证。首轮费用预期错误已保留并按1.00 USD持久值修正；完整V1.4代码门禁已在该变更后重跑并退出0，日志见[当前代码套件](../../../evidence/audits/2026-10-09-v14-code-suite-a08.log)。详见[规则对照审计](../../../evidence/audits/2026-10-07-v14-trade-rule-parity.md)、[USD增量机器证据](../../../evidence/audits/2026-10-09-v14-us-fixture-parity-a08.json)和[隔离持久任务复验](../../../evidence/audits/2026-10-07-v14-durable-tasks-b11017bd3e3392b3a963.md)。

2026-10-07滑点取整增量：FakeBroker现在在方向性滑点后按0.01报价档向不利方向取整；Quant/Paper同输入55 bps的CN BUY/SELL价格、数量和Session对照通过。对照审计见[滑点报价档审计](../../../evidence/audits/2026-10-07-v14-slippage-tick-parity.md)。费用模型仍未对齐：非零滑点时Quant固定费与FakeBroker比例费用不同；全市场tick与规则支持也未验证，因此本项和阶段仍未完成。

2026-10-07费用对照后续：上段记录的是当时事实。新增同一个`CN_A_CASH_EQUITY_2023_08_28` Fixture费率计划，Quant和FakeBroker对BUY/SELL在0与55 bps下费用逐笔一致；实际隔离PostgreSQL还核对了部分BUY和零成交拒绝，验证费用与成交Outbox持久一致。FakeBroker请求指纹包含费率版本，并拒绝超出计划市场、币种及生效日期的输入。见[CN_A费用一致性审计](../../../evidence/audits/2026-10-07-v14-cn-a-fee-parity.md)与[SHA-256](../../../evidence/audits/2026-10-07-v14-cn-a-fee-parity.sha256)。这一项只证明冻结的CN_A费率Fixture，不证明US费用、完整历史费税、结算与Paper总账逐规则一致；第2节整体交付、P4和V1.4继续未完成。


2026-10-09新增完整代码回归：V1.4套件纳入Governance/Replay/Quant HTTP身份与路由scope smoke后exit 0，见[日志](../../../evidence/audits/2026-10-09-v14-service-auth-code-suite-a01.log)。本结果验证身份边界与现有代码，不关闭OD-014；双市场结算语义的开发者提案见[OD-014决策包](../../../evidence/audits/2026-10-09-v1-od014-settlement-decision-a01.md)，待所有者确认前SELL→BUY结算链仍阻断。

## 3. 同步 Web 开发

正式页：回测配置、任务列表、净值、回撤、交易明细和运行比较。验收页：逐日推进小样本、未来信号/公司行动/拒绝场景及账本核对。

验收中心路径：`/acceptance/v1/v1.4`。场景参数提交到后端TestRun编排接口，后端调用业务API并汇集证据。浏览器不直接写领域数据，不自行判定成交。含正常、拒绝、恢复、合成市场限制及历史日期费率场景；历史费率场景使用单独的合成日期Fixture与固定卖出日，不能用于说明历史行情。

## 4. 人工验收步骤

1. 选择固定区间、资金、策略和成本模型启动，关闭并重开页面查看后台结果。
2. 抽查收盘信号不会在同日已结束价格成交；确认规则拒绝保留在报告。
3. 使用正式页面支持的固定策略/成本配置，重跑相同输入并调整目标股数或滑点后比较报告；核对现金、持仓、市值、费用和净值；公司行动收入不重复。当前页面没有NO_TRADE/TopK切换控件，不把未实现控件写入手册。
4. 重跑固定输入，再取消另一任务，确认结果可复验且取消未覆盖完整报告。

每次保存testRunId、场景版本、代码/镜像、数据/规则版本、种子及注入事件序列、实际/预期、截图/Trace。判定依据必须是后端事实和独立检查，不能只看Toast成功提示。

## 5. 异常与替身边界

缺交易状态不能强行撮合；小样本报告必须提示不能证明泛化收益；资金金额精确比较，跨架构研究浮点按预先定义容差。

## 6. 产物与验证

目标产物：quant-research-service 回测Worker/Manifest、历史时钟和日线执行Adapter、回测Web、fixtures/backtest、运行报告。

自动验证：无未来泄漏、费用/结算/公司行动手算、相同输入复跑、日线与Paper规则一致性及回测浏览器E2E。

需求/测试追踪：QNT-08/09/10、POR-02/03、DAT-12、XMK-05/07；T06/08/09/11/12/29/45/47；DV-04、VT04。

2026-10-01工程证据增量：最初Platform API Fixture计算和隔离PostgreSQL/API/Web Chromium、Web TestRun同Run CLI核对见[回测真实性审计](../../../evidence/audits/2026-10-01-v14-fixture-backed-backtest.md)。2026-10-02按服务所有权迁移后，Platform使用Bearer保护的生成OpenAPI Client调用Quant Research；Quant读取并校验镜像内冻结Fixture，执行日线计算，并在自己的数据库原子持久化BacktestRun及SHA-256绑定Manifest，Platform只保存TestRun元数据/结果投影。所有权迁移阶段的审计见[Quant所有权迁移审计](../../../evidence/audits/2026-10-02-w1-v14-quant-ownership.md)；可配置Web早期验收见[早期隔离审计](../../../evidence/audits/2026-10-02-w1-v14-quant-configurable-web-d25f1e1e07be057ac502.md)。T+1可卖数量增量审计见[早期T+1审计](../../../evidence/audits/2026-10-02-w1-v14-quant-configurable-web-0f21cc9c8e2bfa3cfc18.md)，其源码清单是当时点快照；当前源码Hash以本节最新SELL/结算隔离审计的Manifest为准。正式V1.4 E2E仍使用隔离Harness；完整交易所规则、Qlib/Paper规则一致性、当前范围完整人工验收和Ubuntu仍未完成。

费率日期证据范围：上交所2023-08-18通知说明经手费率从0.00487%下调至0.00341%，自2023-08-28生效（[上交所公告](https://www.sse.com.cn/lawandrules/sselawsrules2025/repeal/rules/c/c_20230818_10776219.shtml)）；国家税务总局公告自同日起将证券交易印花税减半（[税务总局政策原文](https://fgk.chinatax.gov.cn/zcfgk/c102416/c5211343/content.html)）；中国结算2022年过户费率公告见[中国结算费率PDF](https://www.chinaclear.cn/zdjs/editor_file/20220701154723234.pdf)。本地旧费率参数模型含旧经手费/证券监管费底线、过户费与卖方印花税；Fixture只用合成价格核对计算和边界，不替代对所有历史期间、交易板块及账户佣金费率的核验。

可复验工程入口：在仓库根目录运行`pnpm test:integration:v14-backtest`。该脚本构建独立随机Compose项目及PostgreSQL卷，使用回环随机端口执行 normal API→CLI check-only、rejection、recovery和单个V1.4 Chromium正常场景；结束时删除并验证仅属于该项目的容器、卷、网络及镜像。它不执行完整第4节人工操作，也不执行真实数据、长观察或完整报告产品验收。

2026-10-02工程证据追加：隔离Harness现为每个TestRun注入同一`sha256:` workspace codeVersion，摘要覆盖V1.4 Schema/OpenAPI、冻结Fixture、Quant/Platform/Web相关源码、容器定义、集成Harness和锁文件；API normal、CLI rejection/recovery及三个Web创建TestRun均断言该摘要与运行证据完全一致。最新集成TestRun为API `ff200d81-e0fa-4ff4-804a-7b36417bc560`、CLI rejection `1617973b-c552-40e2-8042-5c8e0364fd05`、CLI recovery `a74dfc74-3baf-4d92-ae6f-8b4903ddd6a9`及Web `bc44ed31-69cd-4938-9e42-071e0a4cdd5e`、`32cdea5a-cc13-456f-b17f-87252773c16c`、`c62608f5-877e-46e1-8e5c-679c1ee7bd24`；六个TestRun所有断言PASS，六条Quant BacktestRun/Manifest结果Hash相符，临时项目资源已清理。报告/逐文件Manifest见[本次workspace Hash绑定审计](../../../evidence/audits/2026-10-02-w1-v14-quant-configurable-web-113281a0447f86dddb26.md)及相邻JSON/SHA-256。此改动补齐自动化工程证据的代码身份，不关闭限制规则、Qlib一致性、完整人工验收或Ubuntu门禁。

退出条件：开发任务完成、Web真实可操作、全部适用检查PASS、人工签署、已知限制写入证据。填写[本版验收表](./99-acceptance.md)，未完成项不得勾选通过。

## 7. 阶段交付待办（完成后勾选）

以下勾选只记录本阶段交付进度，不能代替第2节逐项开发任务或版本验收结论。开发者凭实现/实测证据勾选开发项；“人工验收”仅在用户实际确认后勾选，不预填PASS。

- [ ] 契约、数据结构、场景定义和预期结果已冻结。
- [ ] 第2节后端任务完成，真实依赖与替身明确。
- [x] V1.4回测取消入口客户端事实保护及完整当前树code/Web/API/CLI回归完成，见§8.17；结算和规则残余不变。
- [x] Replay lifecycle/UNKNOWN恢复命令的body拒绝与历史订单namespace隔离已完成隔离HTTP/PG和当前V1.4 code suite复验；范围及证据见§8.20和[A05跨服务矩阵](../../../evidence/audits/2026-10-09-v1-cross-service-route-matrix-a05.md)。仅完成这些路由子项。
- [x] 正式Web功能页及验收中心的正常、拒绝和恢复浏览器场景已由隔离E2E逐项验证并按同一TestRun经CLI检查；具体范围见§8.74–§8.75。全市场规则、Paper结算与当前范围人工验收仍未完成。
- [x] V1.4正式页最近TestRun刷新恢复及同Run CLI检查完成；尚未关闭整阶段Web/业务人工验收，见§8.74。
- [x] 命令、实际URL、Fixture路径/Hash和配置说明已补齐；未实现的完整规则/结算和本轮人工验收限制已明确列出。
- [x] Platform API五条V1.4回测入口匿名/伪造owner身份矩阵与控制器路由清单匹配并在随机隔离栈实测（匿名401、伪造owner 403各5/5）；详见§8.8及[审计日志](../../../evidence/audits/2026-10-09-v14-platform-identity-code-suite-a01.log)。
- [x] 开发者按第8节执行隔离Web/API/CLI回归及交互栈启动、健康检查和精确清理；代码版本、退出码、断言、浏览器截图/Trace均已归档。人工验收仍独立待用户执行。
- [x] 固定输入重复、任务恢复、刷新后原Run恢复及适用Fixture观察边界验证完成；连续自然市场观察不适用于此离线Fixture切片，见§8.74。其他故障恢复和阶段观察条件仍按本计划保持OPEN。
- [x] 固定市场限制拒单切片：冻结停牌/涨停封板BUY及锁跌停SELL通过Governance授权和Trade Paper HTTP拒绝；新sell-chain Fixture另先实际建立29股Portfolio/FakeBroker持仓，再在后续交易日建立SELL Reservation，锁跌停拒单后仅释放该Reservation且Portfolio/FakeBroker现金、持仓和账本不变。完整V1.4 code suite a05 exit 0，详见§8.77及[a05日志](../../../evidence/audits/2026-10-10-v14-sellable-position-locked-sell-code-suite-a05.log)。完整市场规则/结算与人工验收仍OPEN。
- [ ] 用户已通过Web及命令证据完成人工验收，记录确认时间/结论。
- [x] 操作说明与限制已更新，[本版验收表](./99-acceptance.md)已同步。
- [x] P1 V1.4回测报告Artifact的公共身份/owner读取/Hash校验切片已完成并经隔离Web/API/CLI验证；当前工作树另通过报告发布fencing PostgreSQL集成2/2及V1.2取消/内容存储、V1.4 Artifact引用/Hash单测14/14，含取消先提交时抑制发布、完成先提交时拒绝取消、owner/TestRun绑定和篡改后拒绝读取，见[边界审计A01](../../../evidence/audits/2026-10-09-v1-artifact-publication-boundary-a01.md)。fencing集成按顺序检查两种先后转移，不是并发压力测试。本项不代替本阶段其他交付、人工验收或整版Artifact统一审计，原始实现切片详见[P1报告ArtifactRef审计](../../../evidence/audits/2026-10-07-p1-v14-report-artifact-ref.md)。
- [x] 2026-10-09锁版Linux Python Worker的历史完整代码套件及固定CN/US规则切片保留在[历史套件记录](../../../evidence/audits/2026-10-09-v14-code-suite-current-a02.log)和[SHA-256](../../../evidence/audits/2026-10-09-v14-code-suite-current-a02.log.sha256)；此后共享服务代码变化已由§8.30当前树套件重新验证。该历史结果仍不关闭完整市场规则/结算、Qlib/Paper全规则一致性、Ubuntu或人工验收。
- [x] 共享服务变更后的当前工作区完整V1.4 code suite受控复验通过，含隔离HTTP/PG交易授权、独立资产/Portfolio账本、迁移和Artifact fencing，活动服务未连接且资源清理通过；见§8.30和[当前树完整日志](../../../evidence/audits/2026-10-10-v14-current-tree-code-suite-a01.log)，SHA-256 `c2f03a99fa118c749937568f2886b501e8da713097fbdfc6ad194f80eb0196c2`。此为code suite，不代表浏览器E2E或P4/人工验收完成。
- [x] Trade→Portfolio真实HTTP/独立PostgreSQL固定场景通过：CN/US BUY/SELL、历史费率窗口、部分Fill、9条持久Fill/Outbox及五个BUY账本断言；9次真实Replay Governance授权发放与消费通过。证据见§8.23、§8.24。SELL结算/应收与OD-014仍未验证。
- [x] 九个执行日的Quant现金账本（settled + unsettled proceeds）与真实Portfolio快照现金逐分匹配，持仓逐股匹配；§8.25明确该数额对照不证明SELL可用资金/应收/结算分类一致。
- [x] 共享Platform/Governance/Trade/Portfolio实现变更后，当前树完整V1.4 code suite受控复验exit 0；含Market Data隔离集成/迁移、真实Governance→Trade→Portfolio HTTP与独立PostgreSQL九场景资产/账本对照、报告发布fencing；隔离资源清理确认。见§8.30及[完整日志](../../../evidence/audits/2026-10-10-v14-current-tree-code-suite-a01.log)。该复验不是Web E2E，也不关闭P4全规则/结算、Ubuntu或人工验收。
- [x] Platform→Quant日线回测客户端的请求合同直测和完整V1.4当前代码套件兼容复验见§8.72；该项不代表Quant/Paper完整规则一致性。
- [x] 独立FakeBroker账户现金、持仓与资产事件和逐笔历史Fill原子落库；现金不足的固定交易零订单/Fill/Outbox/资产副作用，纠正输入并新授权后准确恢复一次；完整V1.4 code suite a13 exit 0，报告见[日志](../../../evidence/audits/2026-10-10-v14-paper-http-parity-code-suite-a13.log)及[SHA-256](../../../evidence/audits/2026-10-10-v14-paper-http-parity-code-suite-a13.log.sha256)。不证明OD-014结算或人工验收。
- [x] Trade历史回放HTTP请求字段边界通过真实隔离PostgreSQL烟测及改动后的V1.3/V1.4完整code suite；V1.4 Web/API/CLI E2E五项通过，同Run CLI核验及隔离资源清理完成：[§8.12](#812-historical-fakebroker-http命令严格附加字段边界2026-10-09)。此工程证据不替代业务结算、完整市场规则或人工验收。
- [x] 当前工作区正式Web/API/CLI隔离矩阵已重跑：五项Playwright通过；API和八个浏览器创建Run均经同Run CLI check-only核对，覆盖normal、historical-fees、market-restrictions、corporate-actions及有界策略场景；17个Platform TestRun和16组Quant BacktestRun/Manifest结果Hash匹配，取消/崩溃恢复和随机资源精确清理通过。报告见[§8.11机器报告](../../../evidence/audits/2026-10-07-v14-durable-tasks-668a13697fcfa1b5d777.json)及[历史执行快照Hash清单](../../../evidence/audits/2026-10-07-v14-durable-tasks-668a13697fcfa1b5d777.sha256)。2026-10-10在FakeBroker独立资产原子记账及资金不足恢复改动后，再运行当前工作树`pnpm test:e2e -- --stage V1.4` exit 0，Playwright 5/5，API和八个Web创建Run由同Run CLI核验，随机容器/卷/网络清理通过；[日志](../../../evidence/audits/2026-10-10-v14-paper-http-parity-web-e2e-a01.log)、[SHA-256](../../../evidence/audits/2026-10-10-v14-paper-http-parity-web-e2e-a01.log.sha256)。该E2E是V1.4 Web/API/CLI回归，不覆盖新的Trade/FakeBroker拒绝路径，也不代替当前范围用户人工签署。

## 8. 阶段验收操作手册

### 8.1 当前可执行性与验收准备

手册状态：VERIFIED_EXECUTABLE（隔离栈自动/交互启动、健康检查、精确清理、当前V1.4六项Playwright与同Run CLI核对已实测；2026-10-10新增运行中刷新恢复验证。此状态仅指指引和所列操作可执行；当前范围人工验收、完整规则与Ubuntu实机仍NOT_RUN）。

前置服务：只使用本命令自动创建的随机隔离Compose项目，包括V1.4 Quant Research、Platform API、Portfolio Risk、PostgreSQL和Web；不依赖活动服务。Docker daemon须可访问。当前执行环境为Node `v24.1.0`、pnpm `10.34.5`、Docker CLI `28.0.4`；仓库Node版本见根目录`.node-version`。

固定输入：常规场景为`fixtures/v1/v1.4/backtest_daily.csv`，SHA-256 `88a198cbf5e2cf8f3bf1351a31c5aba1b9d9c6ce2d28343fb05a1dc462569bef`；版本`v1.4-daily-backtest-1`；合成单证券`600000.SH`，2024-01-02至2024-01-05。历史费率场景为`fixtures/v1/v1.4/backtest_historical_fees.csv`，SHA-256 `5a3d946c23d81097a29307b53813281be15b07f187b325b2b32c577a2d2e2573`；版本`v1.4-historical-fees-1`；合成日期2023-08-23至2023-08-28，不含真实历史价格。公司行动场景使用独立Manifest `fixtures/v1/v1.4/corporate-actions-manifest.json`、Fixture版本`v1.4-corporate-actions-1`及复合输入Hash `914f703cd19b7e3f305b59c3353cb8356f075c820c1806cdcee97f6b09f595dc`；五个合成RAW收盘价覆盖2024-01-02至2024-01-08，含2:1拆股、每股10分现金分红与重复事件投递。拆股/分红仅为账务引擎输入，不代表实际证券公司行动数据或完整税务规则。默认策略资金1,000,000分、目标100股、参与率100bps、滑点0bps、固定费500分；seed=`20260907`。

| 开发交付时必须填写 | 当前值 |
|---|---|
| 实测代码Commit或工作区Hash/验证日期 | E2E codeVersion `sha256:3e00461cbac3bbdd37c985fc6800adc6154eb0f47199b0b67a378ef4ca51af91`；2026-10-09；项目/Run IDs与断言见[本次E2E日志](../../../evidence/audits/2026-10-09-v14-current-tree-e2e-a03.log) |
| 项目根目录、Node/pnpm/Python/uv及Docker版本 | 仓库根目录；Node `v24.1.0`、pnpm `10.34.5`、Docker CLI `28.0.4`；本场景不调用Python/uv |
| Web基础URL/身份登录或会话建立方式 | 隔离Harness在`127.0.0.1`绑定随机端口，启动日志提供URL；Playwright自动打开并经隔离Platform接受测试owner；Harness退出时服务和端口销毁，不是持久人工验收站点 |
| 本阶段Web路由 | `/acceptance/v1/v1.4`（已在隔离Harness实际请求并通过） |
| 正式页面的真实入口/跳转链接 | 在Web正式验收中心选择V1 → V1.4；隔离浏览器直接进入`/acceptance/v1/v1.4` |
| Fixture文件/数据版本/确切日期/Hash、规则与成本版本 | `fixtures/v1/v1.4/backtest_daily.csv`，2024-01-02至2024-01-05，SHA-256见本节上文；`v1.4-daily-backtest-1`；`FIXED_FEE_CENTS_PLUS_ADVERSE_SLIPPAGE_BPS_V2` |
| 配置文件及必需环境变量名/非秘密测试值 | Harness自动生成随机端口、Compose project与服务凭证；API地址通过`STOCKQUANT_PLATFORM_API_URL`传入，浏览器地址通过`PLAYWRIGHT_BASE_URL`传入。无需手工放置密钥，不在终端输出凭证 |
| 外部故障目标及可执行命令、恢复/隔离清理入口 | `pnpm test:e2e -- --stage V1.4`在独立Compose项目中强制终止Platform API两次（Quant调用前、Quant报告已落库后），重启后按原TestRun ID恢复；另验证预执行取消、同ID Quant幂等重放、API/Web/CLI及精确隔离资源清理 |
| 预期耗时、轮询超时、实际观察期/预算 | Harness健康等待上限30秒；V1.4任务终态轮询上限30秒；单次E2E以容器构建/浏览器执行为准。外部数据、Paper及Provider预算均为0；自然市场观察不适用于本Fixture套件 |

### 8.2 初始化与启动（隔离自动化与交互栈已实测；人工操作待执行）

在仓库根目录运行以下隔离验证命令。它内部构建唯一随机Compose项目、临时数据库、服务与Web；固定注入两个受限测试延时，以便在Quant调用前及Quant报告落库后强制终止隔离Platform进程，检验恢复/幂等。结束后移除并核验本次项目的容器、卷、网络和镜像。不要另行对活动Stack执行初始化或迁移。

```bash
# 仓库根目录；先确认执行目录、锁定工具版本和Docker daemon可用
pwd
pnpm install --frozen-lockfile
pnpm test:e2e -- --stage V1.4
```

预期：命令退出0；报告包含API/browser TestRun IDs、Quant BacktestRun/Manifest配对Hash、Fixture Hash和临时资源清理结果。公司行动场景应包含RAW价位、持仓/现金/应收变化及重复事件数。任一服务构建/健康、CLI核对、浏览器断言、Hash或清理失败时命令非零退出并保留审计报告。此命令启动的临时Web URL仅在运行期间可用；它支持自动验收，不满足本节要求的人工交互式启动/持久URL。

交互式隔离栈可单独启动供人工检查。入口生成每项目随机Compose ID、回环端口、SCRAM数据库口令和服务Token；禁用V1.4测试延时Hook、使用FAKE/BACKTEST并保持LIVE关闭。2026-10-09实际启动项目`sq-v14-stack-166b0122e43afcbc6ed7`，Web `http://127.0.0.1:55483/acceptance/v1/v1.4`、Platform `http://127.0.0.1:55482`；Web、`/live`和`/api/v1/session`均HTTP 200，数据库为SCRAM-SHA-256，凭据权限0600。随后精确执行`pnpm stack:down -- --project sq-v14-stack-166b0122e43afcbc6ed7`并确认容器/卷/网络/项目镜像及凭据均清理。运行记录：[启动](../../../evidence/audits/2026-10-09-v14-interactive-stack-up-a02.log)、[清理](../../../evidence/audits/2026-10-09-v14-interactive-stack-down-a01.log)。

```bash
pnpm stack:up -- --stage V1.4
# 按命令输出打开随机端口的正式验收页；另一终端按启动输出停止精确项目：
pnpm stack:down -- --project <使用本次stack:up打印的项目ID>
```

自动化E2E已通过，并保存五个V1.4浏览器用例截图与Trace；人工只读检查、Web发起回测、同Run CLI核验和本轮用户签署仍未执行。不可据交互栈健康状态推断人工验收通过。隔离E2E自动运行后会销毁其临时URL；交互栈按停止命令销毁，二者均不触碰活动服务或共享卷。

2026-10-09当前树复验：`pnpm verify:stage -- --stage V1.4 --suite code`与`pnpm test:e2e -- --stage V1.4`均exit 0；E2E含5/5浏览器用例、API/Web创建TestRun同ID CLI核验及精确项目清理，机器输出见[代码套件](../../../evidence/audits/2026-10-09-v14-current-tree-code-suite-a03.log)及[最终E2E](../../../evidence/audits/2026-10-09-v14-current-tree-e2e-a03.log)。五个用例各自的截图/Trace SHA见[捕获清单](../../../evidence/audits/2026-10-09-v14-browser-captures-a01.json)，Trace内临时`sq_session`值已脱敏。首次交互启动暴露`readFileSync`缺失，失败记录保留于[a01](../../../evidence/audits/2026-10-09-v14-interactive-stack-up-a01.log)；补齐导入后实际启动、三端点健康与精确清理通过。上述仅验证操作可执行，不关闭人工验收、完整Paper/结算规则或Ubuntu验收。

初始化在验收中心“准备隔离运行”完成；CLI场景入口也负责同样的准备，两者调用同一业务API。准备后记录testRunId、accountId、namespace及Fixture/DataVersion；初始化业务本身是测试对象时不得预先完成被测动作。缺源/凭证/历史数据时显示缺项，不静默换成Fake并报真实场景通过。

### 8.3 Web逐步操作及预期结果

1. 登录上表实际Web地址，进入“开发验收中心→V1→V1.4”；检查页面版本、模拟模式、服务能力与固定输入。
2. 每个场景点击“准备隔离运行”，核对参数后记下testRunId；正常/异常/恢复使用独立运行，场景内部的重复或恢复操作继续使用原运行及业务幂等键。
3. 在“运行配置”中通过“场景”选择器选中对应场景，填写表中明确参数，然后点击“运行回测”。任务完成后从“运行结果”核对TestRun ID、状态、数据版本、Fixture SHA-256、执行模式、后端断言、绩效/资金及逐日流水；不得只看按钮或Toast。运行中页面提供“取消当前回测”。当前正式页面地址为本次`stack:up`输出的随机Web URL加`/acceptance/v1/v1.4`，固定路由为`/acceptance/v1/v1.4`。

| 场景ID（阶段内唯一） | 场景 | 点击顺序/输入 | 预期结果与核对点 |
|---|---|---|---|
| normal | 日线回测 | 保持默认固定输入：初始现金1,000,000分、目标100股、参与率100bps、滑点0bps、固定费500分；点击“运行回测”。 | 数据版本`v1.4-daily-backtest-1`、`DAILY_BAR/BACKTEST/FAKE`；信号不早于下一交易日执行，正常报告含后端断言、费用、净值与持仓可卖量。 |
| corporate-actions | 拆股与现金分红 | “场景”选择“合成：RAW拆股与现金分红（Fixture）”，点击“运行回测”，检查“公司行动账本（RAW价格，合成Fixture）”及“逐日净值”。 | 2:1拆股后200股、RAW价500分；每股10分分红形成2000分应收并在支付日结算；NAV均为200000分、重复事件忽略1次，不叠加复权价格。 |
| rejection | 未来成交拒绝 | “场景”选择“拒绝：未来成交时间”，点击“运行回测”，查看“成交明细”“订单结果”和后端断言。 | 同日/未来成交拒绝，T+1不可卖数量按预期拒绝；无意外成交或报告副作用。重复公司行动覆盖于`corporate-actions`场景。 |
| market-restrictions | 合成停牌与限制价 | “场景”选择“合成：停牌与限制价（Fixture）”，点击“运行回测”，展开“查看完整证据”。 | 停牌、上限锁定BUY、下限锁定SELL按固定合成断言拒绝，非锁定bar可成交；显示`SYNTHETIC_FIXTURE_BOUNDARIES_ONLY`。 |
| historical-fees | 合成历史日期费率 | “场景”选择“合成历史日期费率（Fixture）”，核对页面自动选中的历史费率日期，点击“运行回测”。 | 数据版本`v1.4-historical-fees-1`、合成执行日期2023-08-25；费用分项可核对，不代表真实历史行情/券商账单。 |
| recovery | 取消、刷新恢复与复跑 | 选择“恢复：取消后固定输入复跑”，点击“运行回测”。任务仍为RUNNING时记录TestRun ID并刷新页面；刷新后页面从同一浏览器的本地存储恢复同一ID并继续轮询。需要测取消时，在RUNNING期间点击“取消当前回测”；复跑须再次点击“运行回测”创建独立Run。 | 刷新不创建第二个Run，原Run后台继续；取消Run不发布完整报告；正常完成的原Run刷新后仍显示原状态、断言和证据。隔离E2E通过1500ms固定测试延时覆盖此刷新路径。 |

4. 同一浏览器刷新或关闭后重开`/acceptance/v1/v1.4`；页面使用`stockquant:v14:lastTestRunId`恢复最近Run，并重新读取原TestRun。确认Run ID不变、运行状态最终终结且原证据可读。新Run只通过“运行回测”创建。
5. 每项记录实际结果、截图与业务ID。异常场景“预期拒绝”被正确验证时断言可PASS，但被测业务操作仍显示拒绝；若意外接受则断言FAIL。

### 8.4 命令行复验与相同运行核对（已验证）

在项目根目录执行以下目标命令。stage/scenario必须匹配8.3定义；CLI与Web共用场景版本、Fixture和断言。每条命令执行后立即查看退出码，任何非零先保存错误再定位，不能继续假定本阶段通过。

```bash
pnpm verify:stage -- --stage V1.4 --scenario normal --seed 20260907
# 紧接上一命令执行；0表示全部场景断言通过
 echo $?
pnpm verify:stage -- --stage V1.4 --scenario rejection --seed 20260907
 echo $?
pnpm verify:stage -- --stage V1.4 --scenario recovery --seed 20260907
 echo $?
pnpm verify:stage -- --stage V1.4 --scenario market-restrictions --seed 20260907
 echo $?
pnpm verify:stage -- --stage V1.4 --scenario corporate-actions --seed 20260907
 echo $?
pnpm verify:stage -- --stage V1.4 --suite code
 echo $?
pnpm test:e2e -- --stage V1.4
 echo $?
```

预期：各场景输出testRunId、实际数据/模型/券商模式、断言expected/actual及证据位置；预期内拒绝场景验证成功退出0，意外副作用/缺脚本/缺必需依赖/未满观察条件非零。恢复场景需外部动作时输出已核实目标和步骤，停留WAITING；完成动作后复验原run，不伪称Web可重启宿主。浏览器测试必须实际运行本阶段用例，零用例/全跳过不能退出0。

再对Web中已运行的同一testRunId执行只读核对，避免仅创建新样本掩盖页面问题：

```bash
# 粘贴Web运行详情中的实际testRunId，再按回车；这是普通ID，不是凭证
read -r acceptance_run_id
pnpm verify:stage -- --stage V1.4 --run "$acceptance_run_id" --check-only
 echo $?
pnpm evidence:export -- --run "$acceptance_run_id"
 echo $?
```

check-only仅查询此运行后端事实并追加检查证据，不创建新订单、不重放成交或发起模型调用；空ID/错误stage/越权run必须拒绝。导出只含脱敏数据，输出实际目录和Manifest Hash，不自动勾选人工验收。端到端正常/异常/恢复运行产生不同ID，导出时分别保存。

本阶段代码测试覆盖要求：无未来泄漏、费用/结算/公司行动手算、相同输入复跑、日线与Paper规则一致性及回测浏览器E2E。 在交付时把映射到的实际Domain/DB/契约/服务内测试命令补入本节，注明执行目录、测试文件或套件、退出码和报告；verify:stage必须展示实际调用的测试清单，不能空壳返回0。Python服务使用自身锁定环境，不串用其他服务虚拟环境。

### 8.5 交叉核对、失败定位与恢复

交叉核对：净值=按冻结估值规则的现金与持仓权益，未结算项目不重复计；订单/费用/公司行动流水与报告逐项核对。

先检查Web与CLI的testRunId、输入/策略/代码版本和模式是否一致，再按Trace查平台、领域、适配器与持久化证据。页面错误而CLI正确，记录Web失败；二者都错则保留领域断言失败。缺能力先查健康/迁移/数据与日志，不修改余额或订单状态使断言通过。

独立复跑创建新run；测试幂等/检查点/重启恢复则使用原run和原幂等键。故障发生后保留旧证据，修复后新增运行或检查记录；不得清空账本、随机更换seed直到通过。真实观察窗口、来源验证和实际模型调用与加速/录制测试分别记录。

### 8.6 验收记录与收尾

| 场景/检查 | Web实际结果与截图 | 命令/退出码/报告 | testRunId/业务ID | 结论 |
|---|---|---|---|---|
| normal | Web 页面通过（截图由验收者留存） | CLI 退出码 0 | `78a5c084-abdb-4e50-b451-9787d85b0c1c` | PASS |
| rejection（含全部子场景） | Web 页面通过（截图由验收者留存） | CLI 退出码 0 | `82b1d78a-00f1-4f61-b069-29b94e7aab95` | PASS |
| recovery（含实际外部动作） | Web 页面通过（截图由验收者留存） | CLI 退出码 0 | `538be4e9-1ece-4c95-a8d3-c5c45e3947c4` | PASS |
| Web同run只读核对与证据导出 | Web/CLI 证据一致 | 三个 check-only 退出码 0 | 同上 | PASS |
| 本阶段代码测试/实际观察适用项 | Web E2E 4 tests passed | `verify:stage --suite code` 退出码 0 | Commit `026b9c2` | PASS |
| 用户人工验收 | 用户已确认 Web 与命令验收通过 | 不由脚本代签 | 2026-09-09 | PASS |

记录不适用子项的范围依据，不能将必需项改为不适用绕过门禁。归档后在[本版验收表](./99-acceptance.md)填写证据链接和结论。清理只针对本轮已结束的隔离运行，默认保留证据；停止测试不能删除数据库卷或取消无关任务。

2026-10-02 费用/成交预算切片：日线DAILY_BAR引擎使用显式`V14ExecutionPolicy`（整数分币、目标数量、成交量参与率bps、滑点bps、固定手续费）。BUY滑点按不利方向向上取整；成交量、目标数及扣除手续费后的可负担股数共同限制成交；零成交不收手续费，并报告拒绝数、未成交数量与成交率。成交价、现金、换手、NAV及收益/回撤bps使用整数分币/BigInt中间值；超出安全整数NAV时拒绝而不近似。冻结Fixture默认参数仍为100股、1%参与率、0bps滑点、500分固定手续费、1000000分初始资金。手算断言覆盖1021分成交价、102000分初始资金下成交99股/余款421分，以及低量/资金不足零成交。详情见[V1.4成本与资金约束审计](../../../evidence/audits/2026-10-02-w1-v14-cost-budget-fill-guard.md)。

2026-10-02 A股费税可配置切片：增加版本化`CN_A_CASH_EQUITY_2023_08_28`费用参数，佣金率和最低佣金明确由用户按券商账户配置；计算沪深交易经手费、按成交金额计提的过户费，以及仅卖出侧印花税，所有比例结果向上取整到分。默认固定费用回测不变。新增API/Web参数验证、成交分项展示、领域手算（买511分、卖562分）及Web创建Run后的CLI同Run校验，完整代码suite及隔离PostgreSQL/Web/CLI验收通过。费率依据：[上交所交易费用说明](https://www.sse.com.cn/services/tradingservice/charge/ssecharge/)、[深交所现行收费表](https://investor.szse.cn/marketServices/deal/payFees/index.html)、[税务机关证券交易印花税政策](https://shanxi.chinatax.gov.cn/web/detail/sx-11400-545-1780448)。该费表不是券商报价，也未涵盖所有税费、账户差异、完整历史费率、交易所日历和公司行动。详情见[费用模型隔离审计](../../../evidence/audits/2026-10-02-w1-v14-quant-configurable-web-eb9f94dfcd44198ba613.md)和[计数更正记录](../../../evidence/audits/2026-10-02-w1-v14-audit-count-correction.md)。因此V1.4成本/市场规则验收仍未完成。

2026-10-02 A股费表生效日期失败关闭与历史费率验证：现行档仅适用于2023-08-28起，历史档限制于2022-04-29至2023-08-27；前后切换使用独立合成Fixture，不声称价格为真实历史行情。官方费率依据见上方[日期/费率来源](#费率日期证据范围)。V1.4完整代码门禁退出0，隔离PostgreSQL/Web/CLI E2E退出0；11个Quant结果/Manifest配对、11个Platform TestRun、6个Web Run同Run CLI校验、浏览器4/4及临时资源清理均通过。机器结果见[隔离集成审计](../../../evidence/audits/2026-10-02-w1-v14-quant-configurable-web-38596c330e6b62e701d2.md)及[JSON](../../../evidence/audits/2026-10-02-w1-v14-quant-configurable-web-38596c330e6b62e701d2.json)。该E2E逐文件SHA清单保留为2026-10-02执行时的历史源码快照；后续V2.3路由更新改变了其中共用`app.module.ts`的当前Hash，因此不把旧清单当作当前源码Hash证据。当前工作区以V1.4/V2.3代码门禁和相应运行证据为准。自动PASS不等于完整费税、全市场规则、Qlib/Paper一致性、手册/用户验收或Ubuntu完成。

当前边界：回测计算已由Quant Research服务内的domain/application执行，Platform经生成客户端编排用户范围和TestRun；Quant自己的PostgreSQL原子持久化BacktestRun及Hash绑定Manifest，Platform同时保留用户验收TestRun投影。SELL/T+1/结算跨服务行为见[隔离验收](../../../evidence/audits/2026-10-02-w1-v14-quant-configurable-web-5309f6fec3be0e11fe90.md)（其源码Manifest为点时快照）；当前源码SHA-256清单见[卖出滑点输入门禁审计](../../../evidence/audits/2026-10-02-w1-v14-sell-slippage-input-guard.md)（对应SHA清单为历史点时快照）。单测另核对期末部分成交的50,250分未结算应收，见[边界审计](../../../evidence/audits/2026-10-02-w1-v14-final-session-sale-receivable.md)。单证券close/volume Fixture尚不能验证开盘区间/涨跌停、停牌、交易所结算日历、公司行动、方向/市场费税表或与Qlib/Paper逐规则一致。上述缺项、第2节整体任务、第7节和第8节人工交付均保持未完成；本增量不改变V1.4状态或历史签署。

可重跑聚焦命令：`pnpm --filter @stockquant/quant-research-service exec vitest run tests/unit/v14-daily-backtest.spec.ts tests/unit/v14-daily-backtest-service.spec.ts`和`pnpm --filter @stockquant/platform-api-service exec vitest run tests/unit/v14-backtest-adapter.spec.ts`；跨服务Web/CLI命令为`pnpm test:integration:v14-backtest`，完整隔离代码命令为`pnpm verify:stage -- --stage V1.4 --suite code`。代码门禁不启动活动API；集成命令使用随机隔离Compose资源。任何自动证据都不能替代用户对当前完整范围的人工签署。

2026-10-02 Quant所有权迁移后最终代码门禁：`pnpm verify:stage -- --stage V1.4 --suite code`退出0；其中baseline、contracts、service-layers、全仓build/lint/typecheck及测试全部通过，Quant Research为18个TS测试文件/82项与13项Python Worker测试，Platform API为45文件/158项。专用隔离Compose联测及正式`pnpm test:e2e -- --stage V1.4`退出0，新增合成停牌/限制价场景及同Run CLI核验；本轮最终审计共8个TestRun，Quant八个Run/Manifest的result hash精确匹配；非法策略字段返回422且不创建Run，随机容器、卷、网络和镜像已清理。期间一次无隔离的浏览器代理误连活动旧API，产生一个TestRun；原始响应已单独留档并明确排除验收，未删除该活动记录，后续验证均使用隔离Compose。隔离路径活动服务/行情/Provider/Paper/Broker调用为0。阶段业务范围仍部分完成，自动PASS不替代当前人工签署。

2026-10-02 T+1可卖量接入后回归（历史增量）：Quant按Fixture交易Session在买入成交当日输出held=100/sellable=0/unsettled=100，从下一Fixture交易日输出held=100/sellable=100/unsettled=0；当时报告记录见[T+1可卖量隔离审计](../../../evidence/audits/2026-10-02-w1-v14-quant-configurable-web-0f21cc9c8e2bfa3cfc18.md)，它的源码Manifest仅代表该时点。SELL成交/结算后续隔离审计与其源码SHA-256见[SELL/结算E2E](../../../evidence/audits/2026-10-02-w1-v14-quant-configurable-web-8a3f64eba4cbf65bbaaa.md)；上述8a3f64...源码清单作为其执行时点的历史快照保留，不再作为当前源码Hash。期末部分成交/未结应收边界见[单测审计](../../../evidence/audits/2026-10-02-w1-v14-final-session-sale-receivable.md)，其源码清单同样为该阶段点时快照。

2026-10-02 单证券与日期输入限制：引擎现在要求真实ISO日历日期，且拒绝跨证券bar序列，避免当前单仓位账本把多证券价格混算成错误NAV。无效`2024-02-30`与混合`600000.SH`/`AAPL.US`输入单测拒绝；完整V1.4代码门禁和隔离API/PG/Web/CLI E2E复验通过。报告见[单证券/日期门禁审计](../../../evidence/audits/2026-10-02-w1-v14-single-security-input-guard.md)（其Manifest保留为点时快照），相关六Run记录见[隔离E2E审计](../../../evidence/audits/2026-10-02-w1-v14-quant-configurable-web-5309f6fec3be0e11fe90.md)。此门禁明确拒绝不支持的多证券输入，不代表多证券回测已经实现。

2026-10-02 卖出滑点输入边界：配置卖单时，`slippageBasisPoints=10000`会把卖出成交价计算为零分；现在在构造回测引擎时直接拒绝该策略，并新增回归测试。聚焦V1.4测试11/11、Quant TypeScript检查通过，完整V1.4 code suite受控本机重跑exit 0；普通沙箱Python Worker因loopback EPERM失败已保留，受控本机13/13通过。详情及当前源码Hash见[卖出滑点输入门禁审计](../../../evidence/audits/2026-10-02-w1-v14-sell-slippage-input-guard.md)（对应SHA清单为历史点时快照）。该修复不改变V1.4/W1未完成状态。

2026-10-02 W4全仓代码回归：`pnpm verify:stage -- --stage V1.4 --suite code`在普通沙箱因Qlib Worker临时loopback socket EPERM首轮失败；受控本机同命令最终exit 0，完成baseline、build、typecheck、全仓unit tests（Quant TS 91/Python Worker 13；Research Automation 196；Platform 162；Market Data 70；Trade Execution 62；Replay 25；Governance 22；Portfolio 5；Web 1；Artifact store 4）。套件没有运行本阶段API/Web/CLI隔离E2E或真实Qlib fit，不生成业务TestRun。未接触活动服务、行情、Provider、Paper/Broker；阶段部分完成及未验收范围不变。详见[W4 V1.4全仓代码复核](../../../evidence/audits/2026-10-02-w4-v14-full-code-suite-refresh.md)及其SHA-256清单。

2026-10-02结构化证据Bundle增量：V1.4隔离Harness现在从哈希绑定的Run审计原样生成每个TestRun的`evidence.json`、`source-evidence.json`及SHA-256 Manifest，目录已存在时拒绝覆盖；Bundle sourceExport绑定审计文件Hash，`manualConclusion=NOT_RUN`。本轮六个run均通过V1阶段身份/内容Hash核验；最新审计见[六Run workspace/Bundle证据](../../../evidence/audits/2026-10-02-w1-v14-quant-configurable-web-3fc51ea6f6138d6b3251.md)、[JSON](../../../evidence/audits/2026-10-02-w1-v14-quant-configurable-web-3fc51ea6f6138d6b3251.json)（当时50项SHA-256 Manifest保留为历史点时快照）。旧TestRun缺失导出和人工验收未改变。

2026-10-02 合成市场限制域规则起步：新增独立冻结 Fixture `fixtures/v1/v1.4/market_restrictions_synthetic.csv`（Manifest `market-restrictions-manifest.json`，SHA-256 `45413145031d48c74f0592dbe450a68081f4e0e22e769e8d8b4ddf2ffd57e52a`）及Quant域辅助规则，固定覆盖停牌、买入上限锁定、卖出下限锁定和非锁定可交易bar；原close/volume Fixture不变。聚焦Vitest 13项、Quant TypeScript构建、`pnpm fixtures:check`（19文件）和`pnpm contracts:check`均通过。后续已将该用例接入版本化V1.4请求/结果Schema、Quant持久BacktestRun、Platform TestRun场景目录和正式Web选择器；集成脚本已加入浏览器创建Run的同TestRun CLI只读断言，隔离HTTP/PG/Web/CLI联测现已通过，细节见本节最新审计。该SIMULATION_ONLY合成用例不证明A股交易所限价公式、盘中成交顺序、真实行情或完整停牌/限制价处理；第2节整体任务仍保持未完成。无数据源、Paper、Broker或活动服务调用。


2026-10-02 V1.4合成停牌/限制价场景完整隔离纵切详见此前W1审计及当前费用模型审计；本场景明确为合成规则边界，不建模交易所限价公式/盘中队列/真实行情。V1.4第2节整体交付、完整费用税率、公司行动/Qlib规则一致性及人工验收仍未完成。

2026-10-02 W4正式隔离E2E补验（历史点时记录）：在全仓代码门禁后运行`pnpm test:e2e -- --stage V1.4`，随机Compose/PostgreSQL栈退出0；11个Quant BacktestRun/Manifest/resultHash配对、6个Web创建Run由CLI same-run核对、Playwright 4/4、临时容器/卷/网络/镜像清理。该次报告见[历史隔离E2E审计](../../../evidence/audits/2026-10-02-w1-v14-quant-configurable-web-07b36a2ebce39465ea5a.md)、[机器JSON](../../../evidence/audits/2026-10-02-w1-v14-quant-configurable-web-07b36a2ebce39465ea5a.json)；其SHA-256清单作为不可变历史点时记录保留在`evidence/audits/2026-10-02-w1-v14-quant-configurable-web-07b36a2ebce39465ea5a.sha256`，不作为当前工作树哈希。此增量补齐前一条代码回归明确未运行的API/Web/CLI隔离E2E；仍未执行真实Qlib fit，也未验证完整交易所规则、完整费税、公司行动、日历、Qlib/Paper规则一致性或人工/Ubuntu验收。当前完整工程状态仍PARTIALLY_IMPLEMENTED。

2026-10-02 W9哈希漂移修复后的当前V1.4复验：为绑定后续共享契约版本，重新运行`pnpm test:e2e -- --stage V1.4`，隔离栈退出0；11个Quant BacktestRun/Manifest/resultHash相符，六个浏览器创建的TestRun均由CLI同Run核验，Playwright 4/4，随机容器/卷/网络删除。当前workspace codeVersion为`sha256:249165d62f3a4179e3b6a456a9cb36d18b804c5ff3eb2f4837eedf0274f12fd7`。报告与机器JSON原件保留于`evidence/audits/2026-10-02-w1-v14-quant-configurable-web-29d7797558a9431213d2.md/.json`，其中的SHA清单为其执行时历史快照。历史运行及其点时Manifest保留在审计目录；本节“最新”只指新报告。它不完成完整交易所规则、公司行动、日历、Qlib/Paper规则一致性、Ubuntu或人工验收。

2026-10-02共享合同生成文件快照说明：后续V3.3 Runner Job合同新增可选`roundIndex`后，全仓合同生成检查通过且V1.4业务API/E2E未受影响；之前当前E2E审计中的生成类型SHA属于其执行时点。原文件与原SHA清单均保留，不覆盖历史；此前W7 Runner SHA Manifest作为历史执行快照保留于`evidence/audits/2026-10-02-w7-v33-runner-round-binding.sha256`；当前共享源码/合同Hash由[刷新说明](../../../evidence/audits/2026-10-03-w7-current-shared-contracts.md)、[机器结果](../../../evidence/audits/2026-10-03-w7-current-shared-contracts.json)及此前W9共享源码SHA点时快照（仅代表当时版本）绑定。此前的当前侧车清单保留为历史点时记录。此说明只更正跨版本共享生成文件的时间基准，不改变V1.4验收状态或其业务证据。

2026-10-07当前工作区固定回测复验为历史快照，详见[V1.4复验审计](../../../evidence/audits/2026-10-07-v14-reverification.md)。最新持久异步任务纵切使用随机项目`sq-v14-backtest-3e249b385f39763ddd91`，源码Hash `sha256:f4f2aa6a9be7c569ffa310fc073b9a861c33ee9b28f3f816de92e41ddc1b8834`，15个Quant BacktestRun/Manifest/结果Hash配对、16个Platform TestRun、Web 5/5及7个Web Run同Run CLI通过。Harness分别在Quant调用前和Quant已落库、Platform未终结时终止Platform进程；原UUID恢复完成，Quant同ID重试无重复记录；取消场景未产生Quant报告。审计和逐TestRun导出位于[持久任务审计](../../../evidence/audits/2026-10-07-v14-durable-tasks-3e249b385f39763ddd91.md)、相邻JSON/SHA-256和`evidence/local/V1.4/`。随机项目容器、卷、网络和镜像已清理。该证据不证明完整市场规则/日历、Qlib/Paper逐规则一致性、当前人工操作签署或Ubuntu实机；阶段继续PARTIALLY_IMPLEMENTED。

2026-10-07 P4合成公司行动账务切片：新增冻结的`v1.4-corporate-actions-1`合成RAW日线与拆股/现金分红Fixture；2:1拆股、每股10分股息应收/支付、重复`actionId`投递均按分手算，逐日NAV维持200000分。公司行动Web/API/Quant/PostgreSQL/CLI同Run隔离E2E Playwright 5/5通过，13个BacktestRun/Manifest/结果Hash匹配；Web TestRun由同Run CLI `check-only`通过，临时容器/卷/网络清理确认。当前树V1.4完整code suite再次exit 0，Quant Python Worker 14/14。运行ID、输入Hash、断言和边界见[公司行动审计](../../../evidence/audits/2026-10-07-v14-corporate-actions.md)。此证据只验证合成账务切片；不覆盖真实公司行动数据、完整税务/交易所规则、Qlib/Paper逐规则一致性、完整拒绝/恢复、人类验收或Ubuntu实机，V1.4保持`PARTIALLY_IMPLEMENTED`。

2026-10-07 P1回测报告ArtifactRef切片：Quant报告结果和Manifest先在Quant PostgreSQL持久化，再由Platform把结果SHA投影为owner/TestRun范围公共`artifact-ref.v1`；API返回报告前重新核验内容SHA，异owner且无本地会话Cookie被拒绝403。V1.4 schema/OpenAPI/TS-Python生成检查通过；报告页面端到端下载同一内容、7个浏览器Run由CLI同Run验证，Playwright 5/5。具体Hash、命令和边界见[P1报告ArtifactRef审计](../../../evidence/audits/2026-10-07-p1-v14-report-artifact-ref.md)。这只关闭V1.4报告Artifact切片；完整规则、阶段其他交付、用户新范围签署和Ubuntu验收保持未完成。

2026-10-07 持久异步任务纵切：按数据库RUNNING任务与Per-TestRun advisory lock实现V1.4后台恢复；Quant请求/报告/Manifest复用稳定TestRun UUID，平台只有在完整Quant响应返回后才完成结果投影。取消请求在预执行阶段阻止Quant计算。Web提交后显示RUNNING并轮询；CLI创建与check-only都轮询终态。隔离真实PostgreSQL、Platform/Quant容器和Web浏览器验证取消、Quant落库前崩溃恢复、Quant报告原子落库后崩溃恢复、同ID重放无重复报告/Manifest及冲突409；16个TestRun、15对Quant记录、Playwright 5/5、7个Web TestRun同Run CLI核验、隔离资源清理全部PASS。执行审计：[Markdown](../../../evidence/audits/2026-10-07-v14-durable-tasks-3e249b385f39763ddd91.md)、[机器结果](../../../evidence/audits/2026-10-07-v14-durable-tasks-3e249b385f39763ddd91.json)、[历史执行快照SHA-256](../../../evidence/audits/2026-10-07-v14-durable-tasks-3e249b385f39763ddd91.sha256)。Web当前手工验收、全市场规则/日历、Qlib/Paper逐规则一致性、stage code suite与完整V1门禁仍须分别完成。

2026-10-09 Replay启动迁移与共享账本隔离：`historical-replay-worker`现在使用事务化`historical_replay_schema_migrations`服务专属版本账本；修正同一数据库内多服务共用`stockquant_schema_migrations`、版本号互相覆盖的问题。Governance、Replay分别双进程并发启动，临时共享PostgreSQL验证两条服务专属v1账本各自唯一，Replay HTTP身份/拒绝/UNKNOWN恢复路由烟测通过，随机数据库删除；完整V1.4 code suite退出0，锁版Linux ARM64 Python Worker 14/14，Market Data适配器69项，Portfolio集成6项、Trade/PostgreSQL与P5-P7恢复及其他适用检查通过。原始证据：[迁移HTTP日志](../../../evidence/audits/2026-10-09-v1-replay-migration-http-a01.log)及[SHA-256](../../../evidence/audits/2026-10-09-v1-replay-migration-http-a01.log.sha256)、[V1.4完整代码套件](../../../evidence/audits/2026-10-09-v14-replay-migration-code-suite-a01.log)及[SHA-256](../../../evidence/audits/2026-10-09-v14-replay-migration-code-suite-a01.log.sha256)。这只证明隔离工程回归；不代表活动DB迁移、降级/部署前迁移CLI、完整市场规则、Ubuntu或当前用户人工验收通过，阶段保持`PARTIALLY_IMPLEMENTED`。

2026-10-09 Quant Research启动迁移增量：V1.4 Backtest及既有研究表改由`quant_research_schema_migrations`服务专属账本登记v1，并在事务/advisory lock内完成初始化；V1.4门禁增加隔离PostgreSQL测试，覆盖双并发启动、重复启动和未知后续版本拒绝。[聚焦日志](../../../evidence/audits/2026-10-09-v14-quant-migration-a01.log)及[SHA-256](../../../evidence/audits/2026-10-09-v14-quant-migration-a01.log.sha256)；加入该测试后的[V1.4完整代码套件](../../../evidence/audits/2026-10-09-v14-quant-migration-code-suite-a03.log)exit 0，附[SHA-256](../../../evidence/audits/2026-10-09-v14-quant-migration-code-suite-a03.log.sha256)。迁移纳管只在随机临时库完成，不表示活动数据库、降级流程、手工交付或人工验收通过。


2026-10-09 P4结算语义复核：Portfolio的Paper `recordFill` 将SELL净额立即计入账户现金，且BUY资源预留以账户现金作为可用余额；该服务没有未结算应收/结算日期状态。此实现不满足全局XMK-03“默认只使用已结算资金”，也不证明SELL→BUY中间路径安全。日线Quant的Fixture Session应收处理不能替代Paper Portfolio独立账本验收。故P4保持未完成；后续需先冻结双市场结算日历语义，再实现可幂等恢复的结算入账/释放及账本对账，覆盖结算前拒绝、结算后可用和批次中间路径。需求路由见[交叉索引](../../../evidence/audits/2026-10-09-v1-requirement-test-crosswalk.json)。

### 8.7 V1.4独立迁移CLI完整套件（2026-10-09）

`pnpm test:db:migrate:v1 -- --stage V1.4`在Historical Replay、Quant Research、Market Data、Platform API各自的临时PostgreSQL验证空库、应用、READY复查、幂等重复应用及未知版本拒绝，清理均核验；纳入该检查后的完整V1.4代码套件exit 0。[完整日志](../../../evidence/audits/2026-10-09-v14-migration-cli-code-suite-a01.log)及[SHA-256](../../../evidence/audits/2026-10-09-v14-migration-cli-code-suite-a01.log.sha256)，操作边界见[迁移操作说明](../../operations/v1-database-migrations.md)。这不证明活动库回退/恢复、人工验收或阶段关闭。


### 8.8 Platform 回测入口身份负向矩阵（2026-10-09）

`pnpm test:integration:v14-backtest`在隔离Platform API栈中先从控制器源码提取路由清单，再对场景读取、Run创建、TestRun读取、报告Artifact读取和取消五条入口逐一发送匿名请求及伪造owner请求。路由清单与控制器匹配；匿名均401（5/5），伪造owner均403（5/5）。随后完整V1.4隔离回归退出0：Web/API/CLI同Run核对、Playwright 5/5及随机容器/卷/网络精确清理通过。日志：[完整代码/E2E日志](../../../evidence/audits/2026-10-09-v14-platform-identity-code-suite-a01.log)，SHA-256 `d681658778a41a7fc347c6d515b931a18d6407f795b95dfd3dffc6992d41b080`。此为身份边界子项，不证明完整交易规则、结算、人工验收或Ubuntu；阶段保持`PARTIALLY_IMPLEMENTED`。

### 8.9 当前工作区完整代码套件复验（2026-10-09）

`pnpm verify:stage -- --stage V1.4 --suite code` exit 0。锁版Python基础镜像使用linux/arm64、禁网容器实际执行14/14 Worker测试；Stage套件还通过baseline/合同/Fixture/构建/lint/typecheck、全仓单测、Market Data隔离PostgreSQL集成28/28、服务身份HTTP烟测、服务迁移CLI、Quant与持久FakeBroker六个CN/US规则场景逐字段对照、Artifact发布fencing集成2/2。随机数据库/网络容器均由Harness报告删除并核验。完整日志及SHA见[当前套件日志](../../../evidence/audits/2026-10-09-v14-code-suite-current-a01.log)与[SHA-256](../../../evidence/audits/2026-10-09-v14-code-suite-current-a01.log.sha256)。这是工程回归证据；不覆盖OD-014待定结算语义、完整交易所规则、全量Qlib/Paper一致性、目标Ubuntu或当前范围人工验收，阶段仍`PARTIALLY_IMPLEMENTED`。

### 8.10 历史费率切换的持久订单逐笔对照（2026-10-09）

扩展隔离Trade Execution/PostgreSQL对照脚本：对CN_A 2023-08-28前旧费率版本、当日及之后新费率版本分别运行Quant回测和FakeBroker持久订单，各覆盖BUY/SELL。十笔总场景中的历史费率四笔逐项核对状态、数量、滑点价格、费税总额、成交Session和Fill Outbox；加上原固定新费率、部分买入、零成交拒绝和USD固定费用场景后，最终订单/Fill/Outbox计数为10/9/9，隔离数据库及网络清理核验通过。定向验证由完整V1.4代码套件再次覆盖，exit 0；原始日志见[当前套件a02](../../../evidence/audits/2026-10-09-v14-code-suite-current-a02.log)和[SHA-256](../../../evidence/audits/2026-10-09-v14-code-suite-current-a02.log.sha256)。这验证锁版合成费率切换，不证明真实券商费率、全部历史日期、完整市场规则、OD-014结算或阶段人工/Ubuntu验收。

### 8.11 当前工作区Web/API/CLI验收复验（2026-10-09）

`pnpm test:e2e -- --stage V1.4` exit 0。随机隔离项目`sq-v14-backtest-668a13697fcfa1b5d777`的五项Playwright全部通过：回测报告页面、合成停牌/限制价、历史费率、RAW公司行动和有界策略/持久报告比较。API创建Run及八个Web创建Run均以相同TestRun UUID执行CLI `--check-only`并通过；CLI normal/rejection/recovery和限制价/历史费率/公司行动场景也通过。总计17个Platform TestRun，16个Quant BacktestRun/Manifest结果Hash匹配；取消前拒绝派发、Platform在Quant调用前和Quant持久化后终止并重启恢复均通过。工作区代码版本`sha256:371d5182dc9d3fdcc4f368863e5a1823841583f24fb43e4a7bd5e6385bdb88de`。机器报告[JSON](../../../evidence/audits/2026-10-07-v14-durable-tasks-668a13697fcfa1b5d777.json)、[说明](../../../evidence/audits/2026-10-07-v14-durable-tasks-668a13697fcfa1b5d777.md)及[历史执行快照Hash清单](../../../evidence/audits/2026-10-07-v14-durable-tasks-668a13697fcfa1b5d777.sha256)，Playwright截图/Trace位于报告所列的`2026-10-09-v14-browser-captures-sq-v14-backtest-668a13697fcfa1b5d777/`。所有随机容器、卷、网络和镜像清理并核验。Run Bundle的人工结论保持`NOT_RUN`；本证据不关闭真实市场/完整结算规则、全量P4一致性、目标Ubuntu或当前范围用户验收。

### 8.12 Historical FakeBroker HTTP命令严格附加字段边界（2026-10-09）

Trade历史执行OpenAPI请求Schema将顶层命令、bar和reservation均声明为`additionalProperties: false`，此前HTTP控制器只解析JSON并摘取授权字段，未执行该边界。现在历史执行入口先限制请求体8 KiB，再要求顶层及嵌套对象键均属于Schema白名单且必填键齐全；额外的`environmentMode`/`brokerMode`不会被忽略后继续成交。真实隔离PostgreSQL HTTP烟测覆盖LIVE/FAKE、PAPER/REAL、LIVE/REAL三种字段注入，均在Governance校验前返回422，且没有为相同clientOrderId写入FakeBroker订单；合法BACKTEST请求仍通过治理并产生预期可审计`ZERO_VOLUME`结果。证据：[Trade HTTP+PG集成](../../../evidence/audits/2026-10-09-v13-historical-execution-strict-body-trade-integration-a02.log)、[V1.3完整代码套件](../../../evidence/audits/2026-10-09-v13-historical-execution-strict-body-code-suite-a01.log)、[V1.4完整代码套件](../../../evidence/audits/2026-10-09-v14-historical-execution-strict-body-compat-code-suite-a01.log)、[当前V1.4 Web/API/CLI E2E](../../../evidence/audits/2026-10-09-v14-historical-execution-strict-body-web-e2e-a01.log)。本条只关闭历史执行请求附加字段边界；完整历史规则、结算、路由接受矩阵及V1.4阶段验收仍未完成。

### 8.13 共享Platform API变更后的V1.4代码兼容复验（2026-10-09）

Run Incident改动后重跑`pnpm verify:stage -- --stage V1.4 --suite code`，exit 0。全仓检查、Quant/Replay锁定依赖与Python Worker、Market Data集成、服务身份边界、FakeBroker权威订单/Fill及隔离PostgreSQL迁移均通过；CN/US规则对照和报告Artifact发布fencing通过，临时数据库资源清理通过，活动服务`NOT_CONNECTED`。完整日志[兼容套件](../../../evidence/audits/2026-10-09-v14-run-incidents-compat-code-suite-a01.log)，SHA-256 `e67845ebe2a00e10a8d4427801f523c5251de9edb633457e31e569f15529bfd7`。

此代码兼容复验不覆盖V1.4浏览器E2E、OD-014结算语义、完整市场规则、Ubuntu实机或当前范围人工验收，V1.4保持`PARTIALLY_IMPLEMENTED`。

随后`pnpm test:e2e -- --stage V1.4`的Playwright 5/5通过；回测报告、限制价/停牌、历史费率、RAW公司行动及策略比较均成功，API与8个Web TestRun都以同UUID由CLI核对，随机容器/卷/网络精确清理。E2E日志[兼容Web套件](../../../evidence/audits/2026-10-09-v14-run-incidents-compat-web-e2e-a01.log)，SHA-256 `b0215cc65b033cf42e65835cb145084d1d6f76f07726c9ee8bcd7038a1d0ec16`；机器报告[JSON](../../../evidence/audits/2026-10-07-v14-durable-tasks-10c144e1003fec29bce5.json)。此自动回归不覆盖OD-014结算语义、完整市场规则、Ubuntu实机或当前范围人工验收。

### 8.14 共享Platform Run保存事务变更后的V1.4当前树复验（2026-10-09）

`pnpm test:e2e -- --stage V1.4`退出0，Chromium 5/5；八个浏览器Run均由同UUID CLI核对，另有CLI创建的正常/拒绝/恢复Run和受限策略边界断言。正式Web持久回测、报告比较及固定样本检查通过；随机项目`sq-v14-backtest-28f98b9c344859bddd38`容器/卷/网络清理通过。浏览器Run包括`ef7320f8-ff45-4022-80a1-3d706c79b664`、`d4444d12-c171-456c-ad89-d73ceba919cb`和`84adacb4-b8bb-4b2e-a1e7-a33964751116`；完整日志[见此](../../../evidence/audits/2026-10-09-v14-current-tree-shared-run-save-e2e-a01.log)，SHA-256 `9dfa2e46ecf0e18342620e88a9e156c69ba0e6a16ba23c978174f5b99677c302`；机器报告[JSON](../../../evidence/audits/2026-10-07-v14-durable-tasks-28f98b9c344859bddd38.json)。此项补共享Platform事务修改后的隔离Web/API/CLI兼容，不关闭OD-014结算规则、完整Quant/Paper逐规则账本对照、目标Ubuntu或当前范围人工验收。

### 8.15 V1.3 Mandate预算读回共享Platform变更后的V1.4代码兼容复验（2026-10-10）

`pnpm verify:stage -- --stage V1.4 --suite code`退出0。baseline、构建、类型检查、全仓测试、锁版Python Worker、Market Data/Replay/Quant隔离迁移和服务身份检查通过；V1.4 Quant/FakeBroker规则场景及回测报告Artifact发布fencing隔离PostgreSQL用例2/2通过，临时容器清理验证通过。完整日志[见此](../../../evidence/audits/2026-10-10-v14-after-v13-budget-readback-code-suite-a01.log)，SHA-256 `cec1f19eb22b69200af9504a103725bb07b22ab868f5f5754652cdbeafd75946`。该代码兼容结果不覆盖OD-014结算语义、完整Paper/Quant逐规则账本对照、Ubuntu或当前范围人工验收。

### 8.16 共享Platform/Web变更后的V1.4当前树浏览器复验（2026-10-10）

`pnpm test:e2e -- --stage V1.4`退出0，Chromium 5/5；正式回测报告、限制价/停牌、历史费率、RAW公司行动与有界策略比较通过。API及8个浏览器TestRun均由CLI以同UUID核对，另有rejection、recovery及规则限制场景；TestRun详情、Fixture SHA与随机项目清理结果见机器报告[JSON](../../../evidence/audits/2026-10-07-v14-durable-tasks-be34d20b55ee81a4d85c.json)。本轮浏览器Run包括API `e4903f6f-7991-47f0-a7f0-01347efc8c79`；固定Fixture SHA-256 `88a198cbf5e2cf8f3bf1351a31c5aba1b9d9c6ce2d28343fb05a1dc462569bef`。随机项目`sq-v14-backtest-be34d20b55ee81a4d85c`的容器/卷/网络清理通过。完整日志[见此](../../../evidence/audits/2026-10-10-v14-after-v13-budget-readback-web-e2e-a01.log)，SHA-256 `1340e92624c22892096a40b3c13aaaee829ae9ac7c86a7d8f7a6de682f2b7fe5`。该复验不关闭结算口径、完整规则一致性、Ubuntu或人工验收。

### 8.17 V1.4回测入口拒绝客户端交易模式注入（2026-10-10）

隔离集成首次发现`POST /api/v1/acceptance/v1/v1.4/runs`会忽略请求中的`environmentMode`/`brokerMode`并返回202。现已在Platform HTTP边界实施顶层字段白名单，仅接受`scenarioId`、`seed`、`policy`。修复后的真实隔离PostgreSQL/Platform/Quant/Web/CLI Harness验证`PAPER/FAKE`、`LIVE/FAKE`、`BACKTEST/REAL`、`LIVE/REAL`均返回422，Quant回测记录数不变；正常回测仍可运行。浏览器E2E 5/5，8个浏览器TestRun均经CLI按同一UUID核对；取消、Platform重启恢复和16组Quant Run/Manifest结果Hash配对通过，隔离资源清理通过。详见[HTTP+E2E记录](../../../evidence/audits/2026-10-10-v14-platform-mode-injection-http-e2e-a01.log)及[SHA-256](../../../evidence/audits/2026-10-10-v14-platform-mode-injection-http-e2e-a01.log.sha256)、[机器报告](../../../evidence/audits/2026-10-07-v14-durable-tasks-f009ad4044fd5c32239f.json)。

首轮失败保留为缺陷发现证据，不计为通过。修复后的`pnpm verify:stage -- --stage V1.4 --suite code`完整套件exit 0，覆盖全仓baseline/build/lint/typecheck/unit、隔离Trade/Portfolio与Market Data PG、服务身份HTTP、迁移CLI及V1.4规则/Artifact fencing检查；[套件日志](../../../evidence/audits/2026-10-10-v14-mode-boundary-code-suite-a01.log)，SHA-256见[sidecar](../../../evidence/audits/2026-10-10-v14-mode-boundary-code-suite-a01.log.sha256)。此原子边界不等于全V1模式路由矩阵完成，也不关闭OD-014结算、全规则一致性、Ubuntu或当前范围人工验收；当前状态仍`PARTIALLY_IMPLEMENTED`。

### 8.18 V1.4回测取消命令拒绝客户端状态/现金注入（2026-10-10）

`POST /api/v1/acceptance/v1/v1.4/runs/:testRunId/cancel`现只接受空请求体。隔离真实Platform/Quant/PostgreSQL测试注入`status`和`cash`返回422，并确认Run仍未设置`v14Task.cancelRequested`；之后空体取消正常进入CANCELLED，Quant报告数保持不变。完整`pnpm test:e2e -- --stage V1.4`退出0，含当前V1.4 code suite、8个浏览器Run同ID CLI核验、normal/rejection/recovery/取消、Quant重启恢复与随机资源清理。日志[见此](../../../evidence/audits/2026-10-10-v14-body-injection-code-e2e-a01.log)，SHA-256 `188c0891a300d21326c4a14e29319ba0de324978ad87fff624d27853adfb935f`。V1.4剩余结算、规则一致性、OD-014、Ubuntu和人工验收仍开放。

### 8.19 V1.4当前工作树模式拒绝与回测Web/API/CLI复验（2026-10-10）

使用`pnpm test:integration:v14-backtest`启动随机隔离Compose项目；Harness从日志给出本次Web地址（本轮为`http://127.0.0.1:59533/`，随机端口，下次运行以新日志为准），自动执行正常回测、API/Web页面、拒绝/恢复、同Run CLI断言和四种模式注入。请求模式为`PAPER/FAKE`、`LIVE/FAKE`、`BACKTEST/REAL`、`LIVE/REAL`，全部在Platform入口返回422；测试读取Quant `research_backtest_runs`计数前后相同，随后合法BACKTEST+FAKE流程成功。浏览器5/5，Web/API创建的Run均以同一UUID由CLI核对；日志机器报告为PASS，Fixture SHA-256 `88a198cbf5e2cf8f3bf1351a31c5aba1b9d9c6ce2d28343fb05a1dc462569bef`，代码身份`sha256:f8dd13b9685e2477cb41fdb87c49ce29b1245e4f90ae6b76892a8ad9ef11dbea`，随机项目`sq-v14-backtest-ac78096bc6ea38741a7e`的容器/卷/网络均确认删除。[完整日志](../../../evidence/audits/2026-10-10-v14-mode-boundary-e2e-a03.log)，[exit code](../../../evidence/audits/2026-10-10-v14-mode-boundary-e2e-a03.exit.txt)，[日志SHA-256](../../../evidence/audits/2026-10-10-v14-mode-boundary-e2e-a03.log.sha256)。本轮首次普通沙箱尝试因Docker socket权限失败，保留在[a02失败日志](../../../evidence/audits/2026-10-10-v14-mode-boundary-e2e-a02.log)；受控本机重跑a03通过。此项只补V1.4 Platform回测创建入口与固定回测矩阵，不关闭V1全量模式/身份路由矩阵、规则结算、OD-014、Ubuntu或人工验收。

### 8.20 V1.4 UNKNOWN原单读取按Replay namespace隔离（2026-10-10）

UNKNOWN恢复此前允许`historical-replay-worker`通过通用`/internal/v1/orders/{orderId}`按全局UUID读取订单，且没有把持久ReplayRun的namespace传入Trade查询。现新增仅Replay身份可用的`GET /internal/v1/historical-orders/{orderId}?namespace=...`；FakeBroker查询同时匹配订单UUID和namespace，错误namespace返回404；通用订单读取收窄为Platform身份。Replay恢复客户端从持久Run读取namespace并与原订单ID一同查询，仍不重发UNKNOWN原单。`trade-execution-historical.v1.json`及生成客户端同步更新。

验证：Replay Worker单测26/26、Trade Execution单测96/96、专用身份路由单测6/6；两服务typecheck/build、客户端生成`--check`、OpenAPI合同检查均通过。`pnpm --filter trade-execution-service test:integration`退出0，包含真实隔离PostgreSQL/HTTP身份Smoke（历史执行订单按正确namespace读取200、跨namespace读取404、Replay访问通用订单路由403）、Trade容器边界和P5-P7 Outbox恢复测试。新增对Replay `pause/resume/cancel/recover-unknown`四条bodyless命令注入伪造status/result/orderId的HTTP检查，全部422且持久Run仍为原`COMPLETED`状态及空结果；[V1.4全量代码套件a02](../../../evidence/audits/2026-10-10-v14-replay-namespace-code-suite-a02.log)退出0，包含上述HTTP smoke、代码/类型/单测、隔离PostgreSQL集成和migration ledger，所有随机容器/网络清理通过，活动服务`NOT_CONNECTED`。详见[namespace恢复隔离审计](../../../evidence/audits/2026-10-10-v14-replay-namespace-recovery-a01.md)。此为P3接受路径审计中的已关闭路由子项，不关闭全V1接受路径矩阵、OD-014结算规则、完整市场规则、目标Ubuntu或当前范围人工验收。

### 8.21 持久Fill Outbox载荷逐字段核对（2026-10-10）

验证范围：隔离PostgreSQL中的FakeBroker订单、Fill和Fill Outbox；固定CN/US输入由V1.4规则对照Harness生成。新增断言按clientOrderId把请求预期与每条持久Fill Outbox payload对应，逐字段核对accountId、namespace、security、externalFillId、quantity、price、fee、effectiveAt、side、currency，并确认九条payload与九条持久Fill一致。此验证覆盖持久Outbox映射，不读取Portfolio账本，也不证明Trade HTTP全链路或结算口径。

结果：第一次完整代码套件因测试错误假定订单表存在`side`字段而失败，原始失败保留于`evidence/audits/2026-10-10-v14-fill-outbox-payload-parity-code-suite-a01.log`。测试修正为按clientOrderId构建固定输入预期后，完整V1.4 code suite exit 0；日志为[本次成功套件](../../../evidence/audits/2026-10-10-v14-fill-outbox-payload-parity-code-suite-a02.log)，SHA-256记录见同名`.log.sha256`。九个CN/US场景、迁移隔离及迁移CLI均PASS，活动服务未连接，隔离资源清理完成。

需求追踪已将该原子证据映射到V1.4-S2-L15，保留需求OPEN；当前差异快照见[矩阵A03](../../../evidence/audits/2026-10-10-v1-current-gap-matrix-a03.json)，结构核验见[交叉检查a04](../../../evidence/audits/2026-10-10-v1-crosswalk-check-a04.log)。

结论：只关闭持久Fill Outbox payload字段保真这一原子子项。P4规则一致性仍待Portfolio现金/应收/持仓/可卖量及Paper链路对照、OD-014结算决定、完整适用规则与恢复矩阵；本阶段其他第2/7节交付、Ubuntu和当前范围人工验收继续OPEN。不得据此更新人工签署。


### 8.22 Quant/FakeBroker与独立Portfolio BUY账本对照（2026-10-10）

验证在同一受控隔离Harness内创建独立`trade_execution_test`与`portfolio_risk_test` PostgreSQL数据库；先将Quant固定输出与FakeBroker持久订单、Fill、Outbox逐笔比较，再将五个BUY场景的持久Fill投影到Portfolio自己的BACKTEST账户，逐项核对精确现金、证券持仓和账本条目数。五场景包括CN当前费率、CN两个历史费率窗口、CN部分成交及US合成固定费用BUY；九个Trade订单、九个Fill与九条Fill Outbox完整核对，五个BUY账本均PASS。完整`pnpm verify:stage -- --stage V1.4 --suite code` exit 0；日志SHA-256见[套件记录](../../../evidence/audits/2026-10-10-v14-portfolio-buy-ledger-parity-code-suite-a01.log.sha256)。初次普通沙箱尝试在Docker容器启动前因socket权限被拒，未创建资源；之后同命令在受控本机隔离环境通过，前次限制记录见[a00](../../../evidence/audits/2026-10-10-v14-portfolio-buy-ledger-parity-sandbox-denial-a00.log)。成功Harness确认活动服务未连接、随机容器/网络清理并验证。

边界：本项只证明固定BUY事实从Quant/FakeBroker持久Fill映射到独立Portfolio账本；它不证明Portfolio服务HTTP调用、reservation授权链、SELL应收/结算释放、OD-014语义或完整CN/US规则一致性。SELL→BUY测试链仍阻断，V1.4阶段与V1总体保持未完成。

### 8.23 Trade→Portfolio HTTP历史费率与Fill账本切片（2026-10-10）

在一次受控隔离Harness中启动真实Trade Execution和Portfolio Risk HTTP服务，分别连接随机、互相独立的PostgreSQL数据库。通过Portfolio HTTP创建模拟账户并预留资源，再经Trade历史执行HTTP提交固定CN/US BUY/SELL、CN历史费率窗口和部分成交场景；Trade持久化FakeBroker订单、Fill及Outbox，并向Portfolio真实HTTP投递。共断言10条订单、9条Fill/Outbox及9次测试授权校验；五个BUY按固定输出独立核对Portfolio现金、持仓和账本计数。完整`pnpm verify:stage -- --stage V1.4 --suite code`退出0；本Harness也独立退出0，活动服务`NOT_CONNECTED`，临时容器/网络清理通过。日志：[HTTP+PG场景](../../../evidence/audits/2026-10-10-v14-paper-http-parity-a02.log)、[完整V1.4代码套件](../../../evidence/audits/2026-10-10-v14-paper-http-parity-code-suite-a02.log)及各自SHA-256 sidecar。

明确限制：授权路由使用有界Governance测试桩，不证明实际Governance grant路径；Portfolio当前即时入账SELL proceeds，本Harness没有断言SELL应收/结算；费率税务、交易日历、全市场规则及Quant/Paper逐规则一致性仍不完整。OD-014未获用户决策，不能由测试推断结算语义。故本切片只增加Trade/Portfolio HTTP和固定场景证据，`V1.4-S2-L15`、V1.4与V1总体继续OPEN；不代表人工验收。


### 8.24 V1.4真实Governance授权链复验（2026-10-10）

在§8.23真实Trade/Portfolio HTTP链路上，移除Governance授权测试桩，新增独立`decision_governance_test` PostgreSQL并启动真实Decision Governance HTTP服务。每笔下单前由`historical-replay-worker`身份向Governance申请`BACKTEST/FAKE` Replay授权，Governance按完整命令计算Hash；Trade以自身服务身份在执行前调用真实校验路由。9笔有效订单均完成一笔授权发放、命令Hash绑定与一次消费，数据库最终保留当前namespace唯一`CONSUMED`授权；配合Trade/FakeBroker和Portfolio事实断言通过，10订单、9 Fill、9 Outbox、五个BUY账本对照保持一致。独立三数据库Harness exit 0，随机容器/网络清理通过；完整V1.4 code suite也exit 0。证据：[三服务HTTP+PG日志](../../../evidence/audits/2026-10-10-v14-paper-http-parity-a03.log)、[完整V1.4 code suite](../../../evidence/audits/2026-10-10-v14-paper-http-parity-code-suite-a04.log)及SHA sidecar。首次更新suite contract expectation失败的结果保留于[失败suite a03](../../../evidence/audits/2026-10-10-v14-paper-http-parity-code-suite-a03.log)。

这补足真实Governance→Trade授权路径，并不关闭P4父级：当前Portfolio仍按现有行为即时入账SELL proceeds，SELL应收/结算、冻结结算日历和OD-014语义未实现/验证；真实US费税、完整CN/US规则矩阵、所有拒绝/恢复组合及当前范围人工验收也未完成。


### 8.25 Quant日账本与独立Portfolio快照逐日精确对照（2026-10-10）

在§8.24三服务真实HTTP/PG Harness上，增加独立于Trade Fill的Quant日账本预期：对九次已投递的CN/US BUY、SELL、历史费率和部分Fill，按执行日读取Quant `cashLedger` 与 `positionAvailability`；Portfolio HTTP快照现金精确到分对照Quant已结算现金加未结算卖出净款，持仓数量逐股对照Quant `heldQuantity`。9/9逐日现金与持仓检查通过，另有五个BUY的Portfolio ledger entry数、Outbox account绑定及独立固定预期对账。完整`pnpm verify:stage -- --stage V1.4 --suite code` exit 0，最新日志[见此](../../../evidence/audits/2026-10-10-v14-paper-http-parity-code-suite-a05.log)，独立三数据库Harness报告[见此](../../../evidence/audits/2026-10-10-v14-paper-http-parity-a04.log)。

语义边界：Portfolio快照当前将SELL proceeds立即计入cash；本检查只证明其金额等于Quant已结算现金加未结算净款的合计，**没有**证明SELL款的可用/可取分类、应收记录或结算释放时点一致。结算日历、卖款可用口径和OD-014尚待确认；所以SELL→BUY规则一致性及P4父项继续OPEN。

### 8.26 V1.4 Governance拒绝与无副作用执行边界（2026-10-10）

在§8.25真实Decision Governance、Trade Execution、Portfolio Risk三服务隔离HTTP/PG Harness中增加拒绝路径：Trade身份不能签发Historical Replay授权（403，授权行数不变）；授权后使用篡改数量验证命令Hash被拒绝（403，授权仍为ACTIVE）；Trade收到无对应授权ID的历史执行命令时返回403且FakeBroker无对应订单。随后原始正确授权和命令成功，证明失败探针不会消费合法授权或阻断合法执行。以上断言在`services/trade-execution-service/scripts/test-v14-rule-parity-postgres.mjs`中执行，完整V1.4 code suite退出0，见[日志](../../../evidence/audits/2026-10-10-v14-paper-http-parity-code-suite-a06.log)、[exit code](../../../evidence/audits/2026-10-10-v14-paper-http-parity-code-suite-a06.exit.txt)及[SHA-256](../../../evidence/audits/2026-10-10-v14-paper-http-parity-code-suite-a06.log.sha256)。

拒绝路径只证明该固定Governance→Trade→FakeBroker切片的身份、命令绑定和订单副作用边界，不覆盖全部V1服务路由、Portfolio预留拒绝组合、故障恢复或用户接受。SELL可用性/应收/结算口径、OD-014、完整市场规则、V1阶段交付、Ubuntu及当前范围人工验收仍OPEN；不得据此签署。

### 8.27 V1.4 FakeBroker独立资产账本原子记账与重试（2026-10-10）

历史回放命令可显式携带初始独立账户现金；该值进入请求指纹并受Replay授权命令Hash绑定。存在Portfolio预留时，FakeBroker在订单事务中验证namespace/account/owner/TestRun/currency/初始现金绑定；Fill成功时在同一事务校验现金或可卖持仓，并更新独立FakeBroker现金、持仓及资产事件，与订单、Fill、订单事件和Outbox共同提交。相同命令重试返回原订单与Fill，不重复应用资产事件。既有PostgreSQL持久化和service-auth SELL测试现显式初始化固定开仓持仓。

真实Governance/Trade/Portfolio HTTP及三套隔离PostgreSQL对九个固定成交场景读取独立FakeBroker资产快照并以原命令重试；资产快照对账9/9、幂等重试9/9。定向Harness和完整`pnpm verify:stage -- --stage V1.4 --suite code`均PASS，详见后续§8.28的a13复验。此证据不证明Portfolio对SELL款可用性、应收分类或结算释放时点一致；OD-014、完整适用规则、其余阶段交付、Ubuntu及当前范围人工验收仍未完成。

### 8.28 V1.4 FakeBroker现金不足拒绝与授权恢复（2026-10-10）

在隔离的Governance/Trade/Portfolio真实HTTP及独立PostgreSQL场景中，Portfolio正常初始化2000.0000 CNY并成功预留BUY资金；另以命令Hash绑定的`initialAccountCash=0.0000`授权执行。Trade/FakeBroker返回422 `FAKEBROKER_INSUFFICIENT_ASSETS`，核验FakeBroker订单、Fill、Outbox、账户资产和资产事件全为0，证明事务回滚无部分账本副作用。随后使用原Portfolio reservation、校正后的2000.0000 CNY账户种子和新Governance授权重试，得到1订单、1 Fill、1 Outbox、1资产事件；原命令重放返回同一orderId且`replayed=true`。恢复检查位于`services/trade-execution-service/scripts/test-v14-rule-parity-postgres.mjs`，使用独立namespace避免与九个规则对照计数混淆。

三服务定向Harness PASS；完整`pnpm verify:stage -- --stage V1.4 --suite code` exit 0，结果及清理记录见[a13日志](../../../evidence/audits/2026-10-10-v14-paper-http-parity-code-suite-a13.log)、[exit code](../../../evidence/audits/2026-10-10-v14-paper-http-parity-code-suite-a13.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-10-v14-paper-http-parity-code-suite-a13.log.sha256)。该测试证明余额不足时FakeBroker自身原子拒绝和授权重试行为；同一工作树随后V1.4 Web/API/CLI E2E通过（Playwright 5/5、同Run CLI校验，见§7及阶段验收表）。该测试不覆盖Trade/FakeBroker现金不足路径，也不证明Portfolio SELL资金可用性、应收分类、结算日历或OD-014，故P4及V1仍OPEN。

### 8.29 公共Schema字段回归后的V1.4完整兼容复验（2026-10-10）

在V1.1核心公共Schema生成类型增加字段及required性回归后，受控本机执行`pnpm verify:stage -- --stage V1.4 --suite code`，exit 0。完整套件涵盖隔离Market Data集成/迁移，三套独立PostgreSQL上的真实Governance→Trade→Portfolio历史执行、FakeBroker/Portfolio独立账本，以及V1.4回测/报告发布边界检查；固定账本Harness中Portfolio现金仍只按已有语义核对Quant已结算现金与未结算净款总额，SELL应收/可用性与结算规则仍因OD-014未决而不作结论。隔离资源清理通过。普通沙箱loopback测试失败日志保留在a01首轮；受控复验[完整日志](../../../evidence/audits/2026-10-10-v14-post-core-schema-compat-code-suite-a01.log)，SHA-256 `cf4e9313624fece5cc96745c87dc892611e086e13fd110f5798ae11869e9b478`。本次兼容复验不改变P4、OD-014、Ubuntu或人工验收状态。


### 8.30 当前共享服务工作树变更后的V1.4完整代码兼容复验（2026-10-10）

在Platform、Decision Governance、Trade Execution、Portfolio Risk等V1.4依赖代码变更后，受控本机执行`pnpm verify:stage -- --stage V1.4 --suite code`，退出0。当前树完整套件复验构建/静态检查/单测、各服务隔离PostgreSQL迁移和Market Data集成；真实Governance/Trade/Portfolio HTTP及各自独立数据库的CN/US固定订单/Fill/资产/账本对照；Platform回测报告Artifact发布fencing。账本Harness记录9个Quant/Portfolio快照对照、9个FakeBroker资产对照及9次同命令幂等回放；现金不足固定拒绝与新授权恢复也通过。活动服务为`NOT_CONNECTED`，临时容器和网络均已验证移除。

完整输出：[V1.4当前树code suite](../../../evidence/audits/2026-10-10-v14-current-tree-code-suite-a01.log)，SHA-256 `c2f03a99fa118c749937568f2886b501e8da713097fbdfc6ad194f80eb0196c2`。本次结果仅为代码套件和其固定数据库/HTTP子场景，不包含Playwright Web E2E、自然市场观察、SELL可用资金/应收结算语义或OD-014决定。P3/P4、Ubuntu、当前范围人工验收与V1整体仍开放。

V1.4责任映射补充（2026-10-10）：A31中第2/7/8节20条当前要求的主责及协作边界已人工核对，详见[责任映射A02](../../../evidence/audits/2026-10-10-v1-v14-responsibility-a02.md)和[结构化明细](../../../evidence/audits/2026-10-10-v1-v14-responsibility-a02.json)。该映射不改变任务勾选、P4规则/结算状态或验收签署；Quant与Paper全规则逐笔一致性、完整恢复、Ubuntu及当前人验仍开放。

### 8.31 corporate-action冲突/无效输入拒绝测试（2026-10-10）

为V1.4-S2-L15补充固定Fixture规则边界测试：相同`actionId`但内容冲突必须fail-closed；100股按1:3拆分产生零碎股时拒绝；派息支付日期不在冻结交易Session内时拒绝。定向Quant测试18/18通过、服务typecheck通过；随后在受控本机权限下重跑完整`pnpm verify:stage -- --stage V1.4 --suite code`，exit 0，Quant全部单测101/101及Python Worker 14/14通过，隔离PostgreSQL/HTTP检查、报告发布fencing和临时资源清理通过。完整日志见[code suite](../../../evidence/audits/2026-10-10-v14-corporate-action-code-suite-a01.log)、[exit code](../../../evidence/audits/2026-10-10-v14-corporate-action-code-suite-a01.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-10-v14-corporate-action-code-suite-a01.log.sha256)；定向拒绝用例日志见[测试记录](../../../evidence/audits/2026-10-10-v14-corporate-action-rejection-tests-a01.log)。普通沙箱首次尝试因两项本机回环监听测试EPERM未完成，已保留该边界并以受控重跑作为最终验证。该增量只验证所列固定规则及当前树代码，不关闭完整公司行动规则、费用/结算对照、OD-014、P4或人工验收。

### 8.72 Platform→Quant日线回测客户端请求合同强化（2026-10-10）

在已有V1.4 Quant客户端路由与服务Bearer断言上，补齐完整请求合同：固定POST路由、Platform服务身份/Bearer与JSON content type、准确scenario/seed/冻结policy body、请求超时signal；422返回保留`QuantV14BacktestHttpError`状态码及响应body。定向Platform测试文件6/6、typecheck通过。

当前工作树完整`pnpm verify:stage -- --stage V1.4 --suite code`退出0，Platform 66文件/323项单测通过；隔离迁移、Governance/Trade/Portfolio账本Harness、报告fencing、全局基线66项通过，活动服务`NOT_CONNECTED`，临时容器/网络清理通过。完整日志[见此](../../../evidence/audits/2026-10-10-v14-platform-quant-client-contract-code-suite-a01.log)，exit 0，SHA-256 `dcb20a8af6c2b57d25a6eb920f1887869c59217d59cc0cbd1270c5a384107b49`。

本项只强化Platform→Quant客户端传输合同，不关闭V1.4完整费用/市场规则一致性、OD-014结算、目标Ubuntu或当前范围人工验收。


### 8.73 V1.4历史FakeBroker终态拒绝释放资源预留（2026-10-10）

发现V1.4 Historical FakeBroker执行在`REJECTED`/`EXPIRED`且没有Fill时只持久订单结果，不释放此前Trade已在Portfolio创建的Reservation，可能长期占用资金/持仓。本次仅当携带Reservation的FakeBroker订单进入无Fill终态拒绝/到期时，在保存订单的同一PostgreSQL事务写入`RESERVATION_RESOLVE` Outbox；EvidenceRef绑定持久Order ID和明确拒绝原因。HTTP处理器随即尝试投递该事件；Portfolio不可用时保留Outbox按既有重试/补偿流程处理，不伪造成交、不释放未知状态，也不改Fill或取消竞态语义。

真实隔离Governance/Trade/Portfolio HTTP+PostgreSQL代码套件验证两类终态：`ZERO_VOLUME`形成`REJECTED`，不具市价性的BUY LIMIT形成`EXPIRED/LIMIT_NOT_MARKETABLE`。两者均使用绑定命令Hash的Replay授权，FakeBroker订单事务各写恰好一条对应`REJECTED`/`EXPIRED` Reservation Resolution Outbox；Portfolio仅释放原Reservation，账户现金、Portfolio Ledger保持初始值，FakeBroker无Fill、无FILL_POST、无资产事件且现金不变；相同命令重放回读原订单/拒绝或过期结果，不新增订单或释放事件。完整V1.4 code suite exit 0，日志[见此](../../../evidence/audits/2026-10-10-v14-terminal-reservation-release-code-suite-a04.log)，exit/SHA见sidecar。该固定终态子项不关闭P4剩余交易所规则、OD-014 SELL结算、完整Paper/回测一致性、Ubuntu或人工验收。

2026-10-10当前工作树补充：完整V1.4 code suite a04 exit 0；真实三服务隔离PostgreSQL Harness分别验证ZERO_VOLUME→`REJECTED`与不可成交LIMIT→`EXPIRED`，两者均通过Governance→Trade→Portfolio HTTP释放Reservation、无Fill/账本/资产事件且同命令重放幂等。过程、断言及边界见§8.73及[当前测试计划](./90-test-plan.md)。V1.4整体仍PARTIALLY_IMPLEMENTED。


### 8.74 V1.4 Web运行中刷新恢复原TestRun（2026-10-10）

发现V1.4页面只把当前运行保存在React内存；刷新页面会丢失TestRun关联，虽然Platform后台继续执行，用户无法从正式页恢复查看。现在页面将最近的V1.4 `testRunId`保存在当前浏览器origin的`localStorage`键`stockquant:v14:lastTestRunId`。页面载入后按该ID读取既有Run并继续轮询，直到COMPLETED/FAILED/CANCELLED；创建新Run仍只有用户点击“运行回测”才发生。此变更不重放业务、不重复提交Quant任务。浏览器本地存储只用于恢复最近Run，不替代服务端owner授权。

隔离V1.4集成栈启用已有的`recovery`固定测试延迟，Playwright等待TestRun进入RUNNING后立即执行`page.reload()`；页面恢复同一UUID并待原Run完成，随后同UUID执行CLI `--check-only`。刷新恢复Run及精确证据见[刷新E2E日志](../../../evidence/audits/2026-10-10-v14-browser-refresh-recovery-e2e-a02.log)。随后新增同日卖出拒绝的独立浏览器路径，完整当前隔离矩阵更新见§8.75。

同一工作树Web TypeScript typecheck通过。此前E2E a01未包含新用例（标题筛选不匹配）并在Harness断言处失败，原日志保留；已修正阶段Playwright标题筛选、Run/Manifest期望计数并以a02验证。此切片只关闭V1.4页面刷新恢复；测试不代用户执行手工验收，V1.4阶段/完整规则、OD-014、Ubuntu与V1总门禁继续OPEN。

### 8.75 V1.4 Web拒绝场景及同Run独立核对（2026-10-10）

补齐浏览器侧拒绝路径：从正式V1.4页选择“拒绝：未来成交时间”并运行，页面显示`FUTURE_SIGNAL_SAME_DAY`与`T_PLUS_1_UNAVAILABLE`，报告`reportPublished=false`，三个对应后端断言可见；随后使用相同TestRun执行CLI `--check-only`。该用例验证验收页面确实把预期拒绝和零报告发布显示给操作者，不将HTTP/后端拒绝误作Web成功。

隔离Harness更新筛选器并将完整当前E2E扩至Playwright 7/7；10个浏览器创建的TestRun全部同Run CLI核对，18组Quant BacktestRun/Manifest/resultHash逐项匹配，19个Platform V1.4 TestRun，临时容器、卷、网络和镜像清理通过。拒绝TestRun为`0a99d67e-2d71-438a-a288-6d023e52e863`，隔离Compose项目为`sq-v14-backtest-d343174b691a93b5604c`，完整日志见[本次Web拒绝E2E](../../../evidence/audits/2026-10-10-v14-web-rejection-e2e-a01.log)、[exit](../../../evidence/audits/2026-10-10-v14-web-rejection-e2e-a01.exit.txt)与[SHA-256](../../../evidence/audits/2026-10-10-v14-web-rejection-e2e-a01.log.sha256)。该完整Web/API/CLI场景变更后又受控重跑V1.4 code suite并exit 0，含Market Data集成28/28、迁移账本、Governance→Trade→Portfolio隔离HTTP/PG对账及Artifact fencing；活动服务NOT_CONNECTED、隔离资源清理通过，详见[code suite日志](../../../evidence/audits/2026-10-10-v14-web-rejection-code-suite-a01.log)、[exit](../../../evidence/audits/2026-10-10-v14-web-rejection-code-suite-a01.exit.txt)和[SHA-256](../../../evidence/audits/2026-10-10-v14-web-rejection-code-suite-a01.log.sha256)。

这补齐浏览器拒绝场景并将第7节Web开发交付勾选为已验证；不证明SELL应收/结算口径、完整市场规则、OD-014、当前范围人工验收或V1整体通过。

### 8.76 Trade→Governance Historical Replay授权验证客户端合同（2026-10-10）

Trade Execution在接受Replay Worker历史下单命令后、调用FakeBroker之前，通过生成的`GeneratedReplayGovernanceClient.validateHistoricalReplayExecution`消费/幂等重验精确的BACKTEST/FAKE授权。本轮直接客户端测试现断言Trade专属Bearer/caller、固定POST路径、JSON Content-Type、授权与完整命令载荷序列化、AbortSignal及默认5秒超时。定向测试1/1通过；受控完整V1.4 code suite exit 0，Trade Execution 99/99、Replay Worker 27/27、Governance 43/43，真实隔离Governance/Trade/Portfolio HTTP+PG Harness与9执行日双账本对照通过，Artifact发布fencing集成2/2；活动服务未连接且随机资源清理通过。运行中没有改变授权成功/失败语义。

调用边及Historical Replay授权签发→Trade消费→FakeBroker执行关系见[矩阵A20](../../../evidence/audits/2026-10-10-v1-cross-service-route-matrix-a20.md)；拒绝副作用边界见[A06 V1.4补充](../../../evidence/audits/2026-10-10-v1-cross-service-route-matrix-a06.md#v14-governance授权与trade执行拒绝边界补充2026-10-10)。此处验证V1.4阶段要求的Trade历史执行服务合同；Platform正式V1.4控制器的调用路径与V2.3-only Replay Worker客户端区分见[范围校准A22](../../../evidence/audits/2026-10-10-v1-replay-client-stage-scope-a22.md)。完整套件[日志](../../../evidence/audits/2026-10-10-v14-trade-replay-governance-client-contract-code-suite-a01.log)、[退出码](../../../evidence/audits/2026-10-10-v14-trade-replay-governance-client-contract-code-suite-a01.exit.txt)及[SHA-256](../../../evidence/audits/2026-10-10-v14-trade-replay-governance-client-contract-code-suite-a01.log.sha256)。此项补齐一条调用边的客户端直接合同，不关闭P1/A04、OD-014/结算、全V1发布矩阵或人工验收。

### 8.77 冻结市场限制Fixture贯通Trade Paper拒绝路径（2026-10-10）

Trade历史Paper命令原先只携带日线开盘价与成交量，Quant已有的停牌/限制价场景无法经真实Governance授权和Paper执行路径复用。现将可选完整限制上下文（OHLC、交易状态、涨跌停价）加入Trade命令及Governance授权契约；任何限制字段出现时，输入必须提供完整上下文、有效OHLC范围和上下限关系。停牌、零成交量、买入封涨停、卖出封跌停分别返回明确REJECTED原因。完整限制字段也进入Trade FakeBroker请求指纹；Governance授权绑定完整bar，修改限制价后不可借用原授权/幂等订单。旧历史Replay请求保持原字段形态。

Trade领域测试12/12通过，覆盖冻结日期规则边界、无效不完整上下文和限制字段变化时的指纹变化；Trade typecheck通过。隔离三服务HTTP/PostgreSQL测试读取并SHA校验`fixtures/v1/v1.4/market_restrictions_synthetic.csv`（`45413145031d48c74f0592dbe450a68081f4e0e22e769e8d8b4ddf2ffd57e52a`），对其中停牌与锁涨停BUY逐例完成治理授权、Trade拒单、同命令重放及Portfolio预留释放；对锁跌停SELL完成治理授权、Trade拒单及同命令重放，持久订单1笔但无Fill、财务Outbox或FakeBroker资产事件；SELL场景没有持仓/Reservation，不验证Portfolio可卖量。两个BUY预留均释放，其他Quant/Portfolio及独立FakeBroker账本对照通过，隔离容器/网络清理通过。`pnpm contracts:check`通过；契约扩展后现有V1.4 Web/API/CLI隔离E2E再次通过（Playwright 7/7、10个浏览器Run同Run CLI核验、资源清理通过），此E2E只证明既有页面兼容，不声称浏览器执行了新Paper限制拒单。E2E日志[见此](../../../evidence/audits/2026-10-10-v14-market-restrictions-paper-web-e2e-a01.log)。完整V1.4 code suite a04 exit 0，日志[a04](../../../evidence/audits/2026-10-10-v14-market-restrictions-paper-code-suite-a04.log)，SHA-256 `ad53ca861a327cdc6087189505e25b07f656ce0a37772e21b99f9e15fcd19550`。

此前锁跌停SELL拒单未绑定持仓；现补独立冻结Fixture `fixtures/v1/v1.4/market_restrictions_sell_chain.csv`（Manifest `market-restrictions-sell-chain-manifest.json`，SHA-256 `dcbb0ee08607ad46ac287b3c9ce912c008fa7a29b2f0bd55d4f7f7547805f9c2`），不覆盖原Fixture。隔离三服务HTTP/PostgreSQL场景先以`2024-01-31`开放日BUY建立29股Portfolio/FakeBroker持仓，再在`2024-02-01`为29股建立T+1已可卖Reservation，执行锁跌停SELL。Governance授权、拒单及同命令重放通过；拒单后该Reservation `RELEASED`，Portfolio持仓29股、现金和ledgerEntryCount不变，独立FakeBroker现金/持仓和fill事件数亦不变。

完整`pnpm verify:stage -- --stage V1.4 --suite code` exit 0；[a05日志](../../../evidence/audits/2026-10-10-v14-sellable-position-locked-sell-code-suite-a05.log)、[exit](../../../evidence/audits/2026-10-10-v14-sellable-position-locked-sell-code-suite-a05.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-10-v14-sellable-position-locked-sell-code-suite-a05.log.sha256)。这关闭V1.4固定锁跌停SELL场景的真实持仓/可卖Reservation拒绝与释放子项；不证明完整交易所限制价规则、停牌日历、盘中排队成交、SELL应收/结算、Quant/Paper全规则一致性、阶段交付、Ubuntu或人工验收；OD-014仍OPEN。

> 当前V1收尾范围（2026-10-13）：所有者要求聚焦主要功能、减少非必要验证和停止扩散；当前执行以[V1主要功能完成计划](../../plans/2026-10-08-v1-completion-plan.md)及[范围决定](../../decisions/2026-10-13-v1-core-closeout-scope.md)为准。延期增强和广泛验证不阻塞本轮，旧任务/结果/签署保留为历史；核心正确性和人工验收不缩减。

> 当前范围决定（2026-10-13）：所有者已将Ubuntu实机部署/恢复/主机资源验收延期至后续Ubuntu部署验收，状态DEFERRED / NOT_RUN；它不再阻塞V1本轮开发及验收。Mac本地容器、目标架构烟测/缺口登记、其余业务/恢复和人工验收要求保留。旧记录中的Ubuntu缺口保留为历史事实，不代表当前V1阻塞。见[延期决定](../../decisions/2026-10-13-v1-ubuntu-deferral.md)。

# V1.4 日线历史回测与可核对报告

状态：PASS（2026-10-14，已批准的Mac本地V1主要功能范围；固定日线回测、费用/滑点/限制/结算、报告与刷新恢复、固定CN/US Quant/Paper账本对照已有实测证据，见§8.104、§8.108、§8.113–8.117；用户已确认精确候选整版验收通过）。全市场日历、客户费税和全规则/全事件Parity未验收；US费用为合成Fixture。版本入口：[README](./README.md)。

## 1. 前置与范围

V1.3通过；复用同一风控、账本与执行规则，避免另建交易规则副本。

本阶段所有订单、券商资产和成交均来自隔离模拟环境。真实业务数据库、Qlib或RD-Agent在声明“已验证”时必须真正执行；替身需独立标注。

## 2. 开发任务

2026-10-14当前范围收口：按[所有者决定](../../decisions/2026-10-13-v1-core-closeout-scope.md)核对本轮交付，以下既有广泛父项中的剩余扩展继续保留未勾选，不构成本轮必交。原状态与清单完整保存在[同步前快照](../../../evidence/audits/2026-10-14-v1-closeout-before-status-sync.json)；不把延期项写成PASS。

- [x] 当前主要功能范围已实现并实测：固定日线回测、费用/滑点/限制/结算、报告与刷新恢复、固定CN/US Quant/Paper账本对照。证据见§8.104、§8.108、§8.113–8.117及[五阶段主要路径汇总](../../../evidence/audits/2026-10-13-v1-current-core-e2e-a01.md)。全市场日历、客户费税和全规则/全事件Parity未验收；US费用为合成Fixture。

2026-10-10 P0责任复核：本节六项回测/交易规则要求已按Quant Backtest所有权设计人工核对主责与独立领域账本边界，见[责任映射A01](../../../evidence/audits/2026-10-10-v1-v14-responsibility-a01.md)及[JSON](../../../evidence/audits/2026-10-10-v1-v14-responsibility-a01.json)。Quant拥有BacktestRun/Fixture回放与模拟规则；Platform拥有TestRun投影；Trade/Portfolio拥有Paper订单和权威账本。该映射不关闭完整市场规则或OD-014结算口径。

- [x] TestRun先持久受理，再异步派发Quant；Web/CLI按同一TestRun ID轮询，页面刷新不触发重新计算。已在取消前、Quant执行前崩溃、Quant结果/Manifest提交后崩溃三种路径执行独立PostgreSQL验证，恢复保留原ID；Quant重复输入幂等返回原报告、变更输入409。该工程切片不代表本阶段其余规则或人工验收完成。详情见[持久任务审计](../../../evidence/audits/2026-10-07-v14-durable-tasks-3e249b385f39763ddd91.md)。
- [x] V1.4 Web刷新后恢复最近TestRun：隔离E2E等待原Run处于RUNNING后刷新页面，同一testRunId恢复并完成，CLI只读核验同Run通过，见§8.74及[a02日志](../../../evidence/audits/2026-10-10-v14-browser-refresh-recovery-e2e-a02.log)。该子项不关闭当前范围人工验收。
- [x] Platform→Quant V1.4日线回测生成客户端合同现在直接断言固定路由、Platform服务Bearer/身份、准确scenario/seed/policy载荷、超时信号和422状态/响应保留；定向测试及当前树完整V1.4 code suite通过，详见§8.72。仅关闭该传输合同子项。
- [x] L17补齐Quant V1.4内部回测写路由的直接HTTP模式注入拒绝：六种PAPER/BACKTEST/LIVE与FAKE/REAL组合均422，随机隔离PostgreSQL中的BacktestRun/Manifest保持0；详见§8.116。只关闭该路由原子子项。
- [x] V1.4回测取消命令拒绝客户端status/cash事实注入；422后`cancelRequested`不变，合法空体取消和完整回测/恢复仍通过，见§8.17。
- [x] 持久FakeBroker Fill Outbox载荷逐字段保留固定请求中的账户、namespace、证券、外部成交ID、数量、价格、费用、时间、方向和币种；九条持久载荷与九个持久Fill匹配，且完整V1.4 code suite exit 0，见§8.21及[日志](../../../evidence/audits/2026-10-10-v14-fill-outbox-payload-parity-code-suite-a02.log)。此项仅覆盖Outbox payload边界，不代表Portfolio账本、Trade HTTP全链路、结算或P4整体完成。
- [x] Quant→持久FakeBroker→独立Portfolio数据库的五个固定CN/US BUY账本投影（现金、持仓、账本条数）逐项一致；完整V1.4 code suite exit 0，见§8.22及[套件日志](../../../evidence/audits/2026-10-10-v14-portfolio-buy-ledger-parity-code-suite-a01.log)。此项仅完成BUY账本子集；SELL结算和Paper HTTP链路后由OD-014专用实现及固定场景覆盖（§8.86、§8.88–§8.89、§8.93），真实市场规则及P4父项仍未全部完成。
- [x] 历史FakeBroker独立现金/持仓/资产事件与订单、Fill、Outbox同事务提交；9个正常固定成交的同命令重试均幂等；另有现金不足事务零副作用拒绝及新授权恢复一次。三服务真实HTTP/隔离PostgreSQL和完整V1.4 code suite a13通过，见§8.27–§8.28及[a13日志](../../../evidence/audits/2026-10-10-v14-paper-http-parity-code-suite-a13.log)。OD-014固定Fixture的应收、结算及已结算购买力已由后续§8.86、§8.88–§8.89、§8.93证据覆盖；完整市场规则与P4父项仍OPEN。
- [x] 历史FakeBroker零成交终态（`REJECTED`/`EXPIRED`）在授权HTTP执行后通过事务Outbox释放Portfolio Reservation；零成交量拒绝有真实Governance→Trade→Portfolio HTTP/隔离PG验证、无Fill/账本/资产事件、同命令幂等重放通过，见§8.73。仅关闭拒绝/到期预留释放原子子项。
- [x] Quant卖出现金只在冻结结算Fixture明确映射的日期进入已结算现金；映射缺失时保留应收及错误码，回测窗口跨越未结算日时应收持续计入NAV。单测、完整V1.4 code suite和容器Web/API/CLI回归通过，见§8.108。此子项不关闭全市场结算规则与Qlib/Paper完整规则Parity。
- [x] OD-014日历未映射的有效SELL Fill仍持久化为Trade Outbox和Portfolio待结算应收，现金不提前释放、不推测结算日期；BUY仍只使用已结算现金。schema v3迁移、Trade仓储和真实Trade→Portfolio HTTP/隔离PostgreSQL恢复链路及重放幂等通过，详见§8.105、§8.107。仅关闭未知日历下的成交保留子项。
- [x] OD-014 schema/settlement contract变更后的V1.3 PAPER/FAKE Web/API/CLI 38项隔离浏览器回归通过；normal、双市场严格现金SELL、MANUAL/AUTO混合路径和恢复场景兼容，38个新TestRun导出保持`manualConclusion=NOT_RUN`。见V1.3 §8.109及本阶段§8.106。
- [x] Replay暂停、恢复、取消及UNKNOWN恢复命令拒绝客户端伪造业务事实；UNKNOWN订单详情按持久ReplayRun namespace读取，跨namespace 404、Replay访问通用订单路由403，四条命令注入均422且持久状态不变。六种客户端模式在三种提交入口和四种bodyless命令上的模式注入也均422、持久Run数量和状态不变，见§8.20、§8.102及[路由矩阵](../../../evidence/audits/2026-10-09-v1-cross-service-route-matrix-a05.md)。该勾选只关闭这些命令/读取路由切片，不表示全Replay API矩阵或V1.4通过。

- [x] 建立BacktestRun及固定Manifest：数据、股票池、策略/因子、规则、成本、依赖/镜像、种子、初始账户、区间与基准。
- [x] 实现按运行隔离的历史时钟与日线撮合；日终确认信号最早下一可交易时点执行，原价用于成交，复权研究与公司行动入账分离。
- [x] Trade历史FakeBroker HTTP入口执行canonical request schema严格字段边界，包含bar/reservation嵌套对象；隔离HTTP+PG证明三种非法LIVE/REAL组合在授权和订单持久化前被拒，合法BACKTEST仍运行，见[§8.12](#812-historical-fakebroker-http命令严格附加字段边界2026-10-09)。此项只完成请求合同原子边界，不代表完整V1.4回测范围完成。
- [ ] 完成费用、滑点、成交量约束、停牌/限制价、可卖量及结算处理；当前已实现固定费用/不利滑点、可配置A股佣金参数/最低佣金、沪深经手费与过户费、卖方印花税、成交量约束、T+1与单卖单次一Fixture Session结算，并有合成停牌/锁板场景。停牌和锁涨停买入现已在Trade Paper HTTP链路接收完整日线与限制价字段，进入Governance授权Hash与FakeBroker幂等指纹，并实测拒单和预留释放（§8.77）；跌停卖出已通过真实Governance→Trade Paper HTTP授权拒单及幂等重放；§8.77进一步以两日冻结Fixture先建立29股真实Portfolio/FakeBroker持仓，再创建后续日SELL Reservation，拒单重放后Reservation释放且持仓、现金和账本不变。该固定可卖持仓拒绝子项已验证；全市场可卖量规则与结算仍未完成。独立合成历史日期费率Fixture覆盖2023-08-28前后规则切换。每笔买卖结果记录请求/成交量、状态和适用原因；拒绝单与部分成交分别统计。完整券商费率、交易所结算日历、公司行动及交易规则一致性仍缺；日线无法确定的盘中顺序采用明确保守规则。
- [x] 单证券日线Fixture按交易Session记录持仓、T+1未可卖量和可卖量；成交日持仓纳入估值，下一条Fixture交易日才释放卖出可用量；同日卖出被拒绝，后续显式SELL按可卖持仓/成交参与率成交，扣费后计未结算款并在下一Fixture Session转为现金。后端断言、Web结果和同Run CLI核对均通过；Fixture结束时未结款仍作为应收项。
- [x] OD-014严格已结算现金的CN_A Paper T+1 SELL跨服务子项：Portfolio/FakeBroker独立记录PENDING应收，不提前增加cash；Run Clock结算及双账一致、同日拒绝零副作用、结算后BUY及Web/API/CLI同Run核验均通过，见V1.3 §8.80与本节§8.86。US固定Paper SELL联链现也通过，见§8.88；本项不等于Quant/Paper规则全量对照或阶段验收。
- [x] 提供策略收益、独立版本化合成基准收益/超额收益、回撤、换手、费用、成交率、拒绝/未成交数量和数据覆盖，并关联实际回测流水；固定样本与断言见§8.103。合成基准不代表指数/真实市场表现；完整市场范围、完整费用归因和Paper总账对照仍未完成。
- [ ] Qlib快速研究报告和交易链路回放分开标注执行模型；同一基准案例比对规则与费用，无差异才作为一致性证据。2026-10-07已扩展V1.4与Trade Execution固定规则对照：全成BUY/SELL数量、价格、费用、下一Session，以及参与率限制的部分BUY和零成交拒绝（`PARTICIPATION_LIMIT`/`ZERO_VOLUME`）均逐单对照。Quant单测20/20；隔离真实PostgreSQL/Web/API/Quant集成5/5，8个Web TestRun均同Run经CLI检查；其中部分买单以`INSUFFICIENT_CASH`准确拒绝不可负担部分，允许部分成交，回测独立计数。该5项Web/API/Quant早期集成不含Trade HTTP/Governance或Portfolio账本；后续已通过真实Governance/Trade/Portfolio HTTP和隔离PostgreSQL补充固定CN/US交易、当前/历史费率、55bps滑点、限制规则、已结算现金与待结算应收对照（§8.89、§8.104、§8.107–8.110、§8.113）。当前完整V1.4套件中9次独立账本核对及9次幂等资产重放通过。该证据仍不覆盖全部适用规则组合、完整Qlib/Paper逐事件对照、所有恢复组合、Ubuntu和当前范围人工验收，因此P4及本项保持OPEN。2026-10-09新增独立USD Fixture BUY/SELL对照：Quant结果与PostgreSQL持久FakeBroker的状态、数量、价格、固定合成费用、交易日和Fill Outbox逐项相等；该固定费仅用于USD Fixture，不声称美股真实费税规则已验证。2026-10-11核对SEC Section 31资料后确认其费率是SRO费用，不是所有客户适用的通用broker收费；不将SEC费率推算为客户费用或替代合成USD Fixture，详见[USD费用范围审计A01](../../../evidence/audits/2026-10-11-v14-us-fee-scope-review-a01.md)。首轮费用预期错误已保留并按1.00 USD持久值修正；完整V1.4代码门禁已在该变更后重跑并退出0，日志见[当前代码套件](../../../evidence/audits/2026-10-09-v14-code-suite-a08.log)。2026-10-11 Quant日回测和Trade历史执行已抽取至共享纯函数包`@stockquant/cn-a-fee-rules`，统一按冻结的当前/历史费率日程计算整数分费用；模块测试5/5，当前完整V1.4 code suite exit 0（§8.78及[a01日志](../../../evidence/audits/2026-10-11-v14-shared-cn-a-fee-rules-code-suite-a01.log)）。2026-10-12结果合同新增必填`evidence.executionModel`，分别标识日线次Session参与率回测、合成OHLC限制规则、RAW公司行动账本路径，并按scenarioId校验对应modelId；Qlib CPU研究探针仍作为独立组件，不与回测引擎混称。定向Quant测试、typecheck、`contracts:check`和完整V1.4 code suite均通过，见§8.110。A142进一步为US_EQUITY固定Fixture在Quant与Trade HTTP/Portfolio真实账本两侧启用55bps滑点，发现并修复Paper将固定1.00 USD合成费用误算为成交额比例费的Parity差异；定向测试和完整V1.4隔离code suite通过，见§8.115。当前证据覆盖有界CN/US样本，完整适用规则组合、同一基准全事件/持仓/现金/应收矩阵及全恢复矩阵仍未完成，故本项保持OPEN。详见[规则对照审计](../../../evidence/audits/2026-10-07-v14-trade-rule-parity.md)、[USD增量机器证据](../../../evidence/audits/2026-10-09-v14-us-fixture-parity-a08.json)和[隔离持久任务复验](../../../evidence/audits/2026-10-07-v14-durable-tasks-b11017bd3e3392b3a963.md)。

2026-10-07滑点取整增量：FakeBroker现在在方向性滑点后按0.01报价档向不利方向取整；Quant/Paper同输入55 bps的CN BUY/SELL价格、数量和Session对照通过。对照审计见[滑点报价档审计](../../../evidence/audits/2026-10-07-v14-slippage-tick-parity.md)。费用模型仍未对齐：非零滑点时Quant固定费与FakeBroker比例费用不同；全市场tick与规则支持也未验证，因此本项和阶段仍未完成。

2026-10-07费用对照后续：上段记录的是当时事实。新增同一个`CN_A_CASH_EQUITY_2023_08_28` Fixture费率计划，Quant和FakeBroker对BUY/SELL在0与55 bps下费用逐笔一致；实际隔离PostgreSQL还核对了部分BUY和零成交拒绝，验证费用与成交Outbox持久一致。FakeBroker请求指纹包含费率版本，并拒绝超出计划市场、币种及生效日期的输入。见[CN_A费用一致性审计](../../../evidence/audits/2026-10-07-v14-cn-a-fee-parity.md)与[SHA-256](../../../evidence/audits/2026-10-07-v14-cn-a-fee-parity.sha256)。这一项只证明冻结的CN_A费率Fixture，不证明US费用、完整历史费税、结算与Paper总账逐规则一致；第2节整体交付、P4和V1.4继续未完成。


2026-10-09新增完整代码回归：V1.4套件纳入Governance/Replay/Quant HTTP身份与路由scope smoke后exit 0，见[日志](../../../evidence/audits/2026-10-09-v14-service-auth-code-suite-a01.log)。本结果验证身份边界与现有代码，不关闭OD-014；双市场结算语义的开发者提案见[OD-014决策包](../../../evidence/audits/2026-10-09-v1-od014-settlement-decision-a01.md)，待所有者确认前SELL→BUY结算链仍阻断。

- [x] 当前树V1.4固定Web/API/CLI阶段入口七项浏览器场景完整复跑，CLI同Run核验和精确清理通过；§8.95记录结果。全市场/完整规则一致性和用户验收仍未完成。

- [x] 2026-10-13当前树回测E2E：浏览器7/7、10个Run同Run CLI核对；报告、拒绝、刷新恢复、限制/历史费率/公司行动固定场景通过，隔离清理通过；见[V1主功能当前树复验](../../../evidence/audits/2026-10-13-v1-current-core-e2e-a01.md)。本项不代替完整市场规则覆盖或用户验收。

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

当前交付清单按2026-10-13已批准的主要功能范围核实；PASS仅覆盖本轮范围。全市场日历、客户费税和全规则/全事件Parity未验收；US费用为合成Fixture。下方早期增量说明中的“未完成/待验收”是对应日期历史，当前结论以上方状态及本节2026-10-14确认记录为准。

以下勾选只记录本阶段交付进度，不能代替第2节逐项开发任务或版本验收结论。开发者凭实现/实测证据勾选开发项；“人工验收”仅在用户实际确认后勾选，不预填PASS。

- [x] 当前范围的契约、数据结构、冻结Fixture、场景及预期已核实；证据见§8.104、§8.108、§8.113–8.117，广泛增强仍延期。
- [x] 第2节当前主要功能范围完成，真实组件/Fixture边界明确；依据§8.104、§8.108、§8.113–8.117。未勾选的广泛父项按本轮范围拆分，延期部分仍未通过。
- [x] V1.4回测取消入口客户端事实保护及完整当前树code/Web/API/CLI回归完成，见§8.17；结算和规则残余不变。
- [x] V1.4回测Run创建与取消入口完整六种客户端模式拒绝矩阵，拒绝无Quant Run/取消副作用；完整隔离E2E与当前树code suite见§8.101。
- [x] Historical Replay Worker单条/多条同步/异步提交与pause/resume/cancel/UNKNOWN恢复入口拒绝六种客户端模式注入；隔离HTTP/PG和完整V1.4 code suite证据见§8.102。该项只覆盖固定Worker入口，Replay完整业务和版本验收仍开放。
- [x] Replay lifecycle/UNKNOWN恢复命令的body拒绝与历史订单namespace隔离已完成隔离HTTP/PG和当前V1.4 code suite复验；范围及证据见§8.20和[A05跨服务矩阵](../../../evidence/audits/2026-10-09-v1-cross-service-route-matrix-a05.md)。仅完成这些路由子项。
- [x] 正式Web功能页及验收中心的正常、拒绝和恢复浏览器场景已由隔离E2E逐项验证并按同一TestRun经CLI检查；具体范围见§8.74–§8.75。全市场规则、Paper结算与当前范围人工验收仍未完成。
- [x] V1.4正式页最近TestRun刷新恢复及同Run CLI检查完成；尚未关闭整阶段Web/业务人工验收，见§8.74。
- [x] 命令、实际URL、Fixture路径/Hash和配置说明已补齐；未实现的完整规则/结算和本轮人工验收限制已明确列出。
- [x] Platform API五条V1.4回测入口匿名/伪造owner身份矩阵与控制器路由清单匹配并在随机隔离栈实测（匿名401、伪造owner 403各5/5）；详见§8.8及[审计日志](../../../evidence/audits/2026-10-09-v14-platform-identity-code-suite-a01.log)。
- [x] 开发者按第8节执行隔离Web/API/CLI回归及交互栈启动、健康检查和精确清理；代码版本、退出码、断言、浏览器截图/Trace均已归档。人工验收仍独立待用户执行。
- [x] 固定输入重复、任务恢复、刷新后原Run恢复及适用Fixture观察边界验证完成；连续自然市场观察不适用于此离线Fixture切片，见§8.74。其他故障恢复和阶段观察条件仍按本计划保持OPEN。
- [x] 固定市场限制拒单切片：冻结停牌/涨停封板BUY及锁跌停SELL通过Governance授权和Trade Paper HTTP拒绝；新sell-chain Fixture另先实际建立29股Portfolio/FakeBroker持仓，再在后续交易日建立SELL Reservation，锁跌停拒单后仅释放该Reservation且Portfolio/FakeBroker现金、持仓和账本不变。完整V1.4 code suite a05 exit 0，详见§8.77及[a05日志](../../../evidence/audits/2026-10-10-v14-sellable-position-locked-sell-code-suite-a05.log)。完整市场规则/结算与人工验收仍OPEN。
- [x] 用户于2026-10-14在对话确认当前候选整版V1验收通过，覆盖本阶段本轮范围；候选SHA-256 `132535fbdf2bf1d50e4260e397424b3a47ef949dedcc62e58257c0a5697bd2d4`，阶段与代表Run关联见[验收表](./99-acceptance.md)。历史单Run人工结论不倒填。
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
- [x] OD-014 CN_A严格已结算现金Paper SELL子项已完成隔离Portfolio/Trade PostgreSQL验证及容器Web/API/CLI同Run端到端验证，见§8.86；固定US SELL同Run子项现见§8.88通过；Quant/Paper完整规则对照、Ubuntu和本人验收继续开放。
- [x] 当前工作区正式Web/API/CLI隔离矩阵已重跑：五项Playwright通过；API和八个浏览器创建Run均经同Run CLI check-only核对，覆盖normal、historical-fees、market-restrictions、corporate-actions及有界策略场景；17个Platform TestRun和16组Quant BacktestRun/Manifest结果Hash匹配，取消/崩溃恢复和随机资源精确清理通过。报告见[§8.11机器报告](../../../evidence/audits/2026-10-07-v14-durable-tasks-668a13697fcfa1b5d777.json)及[历史执行快照Hash清单](../../../evidence/audits/2026-10-07-v14-durable-tasks-668a13697fcfa1b5d777.sha256)。2026-10-10在FakeBroker独立资产原子记账及资金不足恢复改动后，再运行当前工作树`pnpm test:e2e -- --stage V1.4` exit 0，Playwright 5/5，API和八个Web创建Run由同Run CLI核验，随机容器/卷/网络清理通过；[日志](../../../evidence/audits/2026-10-10-v14-paper-http-parity-web-e2e-a01.log)、[SHA-256](../../../evidence/audits/2026-10-10-v14-paper-http-parity-web-e2e-a01.log.sha256)。该E2E是V1.4 Web/API/CLI回归，不覆盖新的Trade/FakeBroker拒绝路径，也不代替当前范围用户人工签署。
- [x] 当前树V1.4完整Web/API/CLI复跑包含浏览器7/7、10个浏览器Run与API创建Run的同Run CLI核验，取消/恢复与已发布报告Manifest Hash校验通过；详见§8.95。新增Run仍未人工签收。
- [x] 2026-10-12当前树V1.4完整代码套件`pnpm verify:stage -- --stage V1.4 --suite code`退出0；基线67/67、Python适配器69/69、Market Data集成28/28、报告fencing 3/3、9个Quant/Trade/Portfolio/Governance隔离账本会话对账及各服务迁移通过，隔离资源清理通过。原始日志、退出码与SHA-256见§8.96；此code suite不替代Web/E2E、全市场规则、Ubuntu或人工验收。
- [x] OD-014严格已结算现金获用户批准后，当前树完整V1.4 code suite复验exit 0；跨服务隔离账本对账仍通过，完整日志/退出码/SHA见§8.113。此项验证当前代码回归，不关闭适用市场规则全覆盖、Ubuntu或阶段人工验收。
- [x] OD-014批准后当前树V1.4 Web/API/CLI E2E复验通过，Chromium 7/7、10个浏览器Run由同Run CLI核验，API Run、拒绝/恢复场景和隔离资源清理通过；见§8.114，不改变人工验收状态。
- [x] 2026-10-12 Quant回测结算日期读取冻结日历，不再从下一根日线推导；未知映射现金保持严格已结算口径，未结算款跨后续Session保留在NAV。定向单测25/25、完整code suite及容器化Web/API/CLI 7/7和10个浏览器Run同Run CLI核验通过，见§8.108；V1.4父项及人验仍OPEN。
- [x] V1.4 Quant真实HTTP服务的六种回测模式注入组合均返回422，BacktestRun/Manifest无新增记录；隔离测试资源清理通过，见§8.116。L17全V1矩阵仍OPEN。

- [x] 2026-10-13当前树回测E2E：浏览器7/7、10个Run同Run CLI核对；报告、拒绝、刷新恢复、限制/历史费率/公司行动固定场景通过，隔离清理通过；见[V1主功能当前树复验](../../../evidence/audits/2026-10-13-v1-current-core-e2e-a01.md)。本项不代替完整市场规则覆盖或用户验收。

## 8. 阶段验收操作手册

### 8.1 当前可执行性与验收准备

手册状态：VERIFIED_EXECUTABLE（2026-10-14收口，限已实测的Mac本地主要功能操作；实际执行证据见§8.104、§8.108、§8.113–8.117，当前候选整版人工验收已由用户确认）。启动时使用当次输出的动态URL和精确项目名；历史随机URL不能复用。全市场日历、客户费税和全规则/全事件Parity未验收；US费用为合成Fixture。以前部分验证状态与原操作记录保留于[同步前快照](../../../evidence/audits/2026-10-14-v1-closeout-before-status-sync.json)及下方各次实测记录。

前置服务：只使用本命令自动创建的随机隔离Compose项目，包括V1.4 Quant Research、Platform API、Portfolio Risk、PostgreSQL和Web；不依赖活动服务。Docker daemon须可访问。当前执行环境为Node `v24.1.0`、pnpm `10.34.5`、Docker CLI `28.0.4`；仓库Node版本见根目录`.node-version`。

固定输入：常规场景使用`fixtures/v1/v1.4/backtest_daily.csv`（原始文件SHA-256 `88a198cbf5e2cf8f3bf1351a31c5aba1b9d9c6ce2d28343fb05a1dc462569bef`）及独立合成基准`backtest_benchmark.csv`（SHA-256 `be3735f7d9005b76ebf6cd0cc57b0f3229b1560f42fceff2b329505ecafb64ab`，Manifest `backtest_benchmark-manifest.json`，版本`v1.4-daily-backtest-benchmark-1`）；报告数据版本升至`v1.4-daily-backtest-2`并记录行情/基准复合输入Hash。合成单证券`600000.SH`，2024-01-02至2024-01-05。历史费率场景继续使用原冻结价格文件并配对相同基准Fixture，报告数据版本升至`v1.4-historical-fees-2`；合成日期2023-08-23至2023-08-28，不含真实历史价格。公司行动场景使用独立Manifest `fixtures/v1/v1.4/corporate-actions-manifest.json`、Fixture版本`v1.4-corporate-actions-1`及复合输入Hash `914f703cd19b7e3f305b59c3353cb8356f075c820c1806cdcee97f6b09f595dc`；五个合成RAW收盘价覆盖2024-01-02至2024-01-08，含2:1拆股、每股10分现金分红与重复事件投递。拆股/分红仅为账务引擎输入，不代表实际证券公司行动数据或完整税务规则。默认策略资金1,000,000分、目标100股、参与率100bps、滑点0bps、固定费500分；seed=`20260907`。

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

隔离集成首次发现`POST /api/v1/acceptance/v1/v1.4/runs`会忽略请求中的`environmentMode`/`brokerMode`并返回202。现已在Platform HTTP边界实施顶层字段白名单，仅接受`scenarioId`、`seed`、`policy`。原始四种模式验证及2026-10-12新增的六种完整组合验证见§8.101。

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

### 8.78 Quant与Trade共享CN_A整数分费用计算（2026-10-11）

发现Quant V1.4日线回测和Trade历史Paper执行各自维护CN_A佣金、过户费、卖方印花税公式，可能在后续修改中产生规则漂移。新增纯函数工作区包`packages/cn-a-fee-rules`，两条路径共用费率日程校验及整数分/BigInt向上取整计算；历史与当前费率日程、零数量、最低佣金、大额输入和无效配置均有定向测试。没有改变费率来源、费率值或OD-014结算语义；US合成固定费用仍独立。

模块测试5/5、Quant定向测试24/24、Trade定向测试12/12及两个服务typecheck通过。当前工作树受控完整`pnpm verify:stage -- --stage V1.4 --suite code` exit 0；日志含根基线66/66、容器化readiness探针PASS、隔离Market Data集成/迁移、三服务真实HTTP/PostgreSQL规则Harness及Quant/Paper日账本对照9/9、报告发布fencing 2/2。FakeBroker、Governance、Trade、Portfolio规则路径为固定合成CN_A/US Fixture；SELL应收/结算仍按OD-014留白。活动服务`NOT_CONNECTED`，各隔离容器和网络已验证清理。完整日志、退出码与SHA-256见[a01](../../../evidence/audits/2026-10-11-v14-shared-cn-a-fee-rules-code-suite-a01.log)、[exit](../../../evidence/audits/2026-10-11-v14-shared-cn-a-fee-rules-code-suite-a01.exit.txt)、[hash](../../../evidence/audits/2026-10-11-v14-shared-cn-a-fee-rules-code-suite-a01.log.sha256)及[审计记录](../../../evidence/audits/2026-10-11-v14-shared-cn-a-fee-rules-a01.md)。

此项消除当前两处CN_A计算实现的分叉，不宣称所有市场规则、日期费率或客户费率已验证，不关闭V1.4-S2-L18、P4、OD-014、V1阶段交付、Ubuntu或人工验收。

### 8.79 V1.4报告发布与取消的真实并发fencing（2026-10-11）

原报告发布fencing集成用例按顺序验证取消先锁与完成先锁。本轮增加真实PostgreSQL并发竞态：独立事务先持有指定TestRun行锁，同时发起报告完成和取消请求，并轮询`pg_stat_activity`确认两条请求都处于行锁等待后才释放阻塞锁。无论哪个请求获锁，断言最终只能是“COMPLETED且唯一PUBLISHED报告通过Hash校验、取消被拒”或“取消已请求且无报告、完成发布被拒、后续状态收敛到CANCELLED”；不允许出现取消与发布同时成功。

`pnpm verify:stage -- --stage V1.4 --suite code` exit 0；新增并发集成测试所在fencing文件3/3通过，容器化三服务HTTP/PG Paper/Quant日账本检查与所有阶段迁移/基础检查通过，隔离资源清理通过。完整日志[见此](../../../evidence/audits/2026-10-11-v14-artifact-concurrent-fencing-code-suite-a01.log)、[退出码](../../../evidence/audits/2026-10-11-v14-artifact-concurrent-fencing-code-suite-a01.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v14-artifact-concurrent-fencing-code-suite-a01.log.sha256)；fencing单测隔离PG日志[见此](../../../evidence/audits/2026-10-11-v14-artifact-concurrent-fencing-isolated-a01.log)。

这补齐同一Run的取消/完成单次真实行锁竞争证据；不是高并发压力、跨主机故障、活动数据库或Artifact卷恢复测试。OD-014结算、完整适用规则、活动存储、Ubuntu和当前范围人工验收继续OPEN。

### 8.80 共享CN_A费用实现后的当前树V1.4完整代码复验（2026-10-11）

本轮CN_A费率纯函数已提取到`packages/cn-a-fee-rules`，Quant日线回测与Trade历史Paper执行共用同一整数分费用函数。更改后执行V1.4完整代码套件：首次受限沙箱运行在通用seed:paper HTTP测试绑定loopback时EPERM，未进入阶段测试；受控本机loopback重跑`pnpm verify:stage -- --stage V1.4 --suite code`退出0，随机隔离数据库/容器/网络全部清理，活动服务未连接。CN当前/历史费率、BUY/SELL/部分BUY/零成交拒绝、非可交易限价过期、停牌/涨跌停拒绝、授权校验与FakeBroker/Portfolio账本核对通过；真实Decision Governance、Trade、Portfolio HTTP及独立PostgreSQL中FakeBroker资产对账9/9、幂等重放9/9，订单10、Fill 9。USD路径仍使用明确标记的固定合成Fixture费率。SELL应收分类、结算释放日与Portfolio可用现金对照仍未断言，受OD-014影响，P4/V1保持OPEN。

执行记录：[完整代码套件](../../../evidence/audits/2026-10-11-v14-shared-fee-current-tree-code-suite-a02.log)、[exit](../../../evidence/audits/2026-10-11-v14-shared-fee-current-tree-code-suite-a02.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v14-shared-fee-current-tree-code-suite-a02.log.sha256)。受限沙箱首轮失败已保留于工作日志，不作为业务测试失败或通过证据。

### 8.81 Quant当前树完整单测与锁版Python Worker验证（2026-10-11）

V1.4共享CN_A费用实现修改后，受控本机环境执行`pnpm --filter @stockquant/quant-research-service test`退出0：Quant TypeScript单测19文件/101项通过；仓库锁定的`python@sha256:e41613d42d4891e4930f79523f93f81bbc7632584ec65e36ab055f41a800b41e`在Linux ARM64隔离容器中以只读工作树、`--network none`执行Python Worker测试14/14。先前无Docker权限的沙箱尝试只因daemon不可访问而未启动Worker；受控重跑现已给出当前代码证据。该项不验证Qlib真实模型有效性、Ubuntu宿主、OD-014应收结算或V1.4人工验收。

完整服务日志：[测试日志](../../../evidence/audits/2026-10-11-v14-quant-full-tests-python-worker-a01.log)、[exit](../../../evidence/audits/2026-10-11-v14-quant-full-tests-python-worker-a01.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v14-quant-full-tests-python-worker-a01.log.sha256)。

### 8.82 V1.4 Platform acceptance OpenAPI路由覆盖（2026-10-11）

审查发现V1.4 Platform controller实际提供场景列表、创建TestRun、owner-scoped读取TestRun、读取已校验报告Artifact及协作取消共5个操作，但既有OpenAPI只描述后两种读取操作；报告响应也未引用完整的V1.4结果schema。扩展`platform-v14-backtest-report.v1.json`覆盖全部5条路由，补充固定场景/创建/取消响应schema并将Artifact内容指向完整结果合同；`check-openapi-contract.mjs`现在逐项验证认证、请求/响应状态，并将控制器声明路由与OpenAPI路径集合做精确比对。

`pnpm contracts:check` exit 0（312个JSON、209个schema、60个Fixture；30个生成器无漂移），OpenAPI报告显示V1.4 Platform 5 operations；漂移检查锁定执行策略数值范围、两段CN_A费率schedule最低费率、卖单必需日期字段、corporate-actions冻结策略及取消空body形状。更新文档后`pnpm docs:check`通过（9929链接、5份阶段文档无重复编号），Crosswalk结构检查PASS（147项需求、1878路径引用、731目标、227精确测试名、147当前锚点）。最终合同日志、exit和SHA-256见[验证a03](../../../evidence/audits/2026-10-11-v14-openapi-acceptance-route-contract-a03.log)、[exit](../../../evidence/audits/2026-10-11-v14-openapi-acceptance-route-contract-a03.exit.txt)、[hash](../../../evidence/audits/2026-10-11-v14-openapi-acceptance-route-contract-a03.log.sha256)。本项补足静态API合同和路由漂移防护，不等于新跑完整V1.4业务套件，也不关闭P1消费者发布/回退矩阵、OD-014结算、V1阶段/版本门禁或人工验收。

### 8.83 OD-014严格已结算现金口径获项目所有者批准（2026-10-11）

项目所有者于2026-10-11明确批准严格已结算现金口径，决定记录见[OD-014所有者决定](../../../evidence/audits/2026-10-11-v1-od014-owner-decision-a01.md)，原提案见[OD-014结算语义包](../../../evidence/audits/2026-10-09-v1-od014-settlement-decision-a01.md)。当前产品规则为：Paper SELL净额先记待结算应收；只有版本化市场Fixture明确列出的结算session开始时，才由注入的Run Clock转换为已结算现金；Fixture外/未知映射失败关闭；同账户同币种BUY预留仅使用已结算现金；重复Settlement ID不得重复记账。

本记录关闭的是结算购买力口径决策，不是工程任务。此段记录首轮批准后尚未联通的实现状态，随后已由§8.86、§8.88–§8.89和§8.93–§8.98覆盖版本化CN/US Fixture、Trade填单消息、独立账本对账及自动Web/API/CLI同Run验证。P4仍因更广泛市场规则、完整规则一致性、全域恢复和人工作业未完成而保持开放。

### 8.84 OD-014版本化双市场结算Fixture与Manifest校验（2026-10-11）

新增不可变Fixture `v1.4-paper-settlement-calendar-1`，文件为`fixtures/v1/v1.4-settlement-v1.0.0/settlement-calendar.json`，SHA-256 `573fbac61989a195c26ebe850308efbd6da8258aa276bcc337d039cd6a840cfd`。CN_A/CNY与US_EQUITY/USD分别列出合成session→settlement session；2024-01-05显式映射到2024-01-08，Fixture尾部没有结算日期。未知日历必须返回`SETTLEMENT_CALENDAR_UNAVAILABLE`，不按自然日推算。

共享JSON Schema与生成TypeScript类型已加入；`pnpm contracts:check` exit 0、`pnpm fixtures:check` exit 0。Fixture检查包括Manifest SHA、市场/币种隔离、日期顺序/唯一性、结算目标存在、显式周末跨度、未知日期失败关闭及尾部保持待结算。日志见[合同检查](../../../evidence/audits/2026-10-11-v14-settlement-calendar-contract-check-a01.log)和[Fixture检查](../../../evidence/audits/2026-10-11-v14-settlement-calendar-fixture-check-a01.log)。

此段记录2026-10-11初版Fixture状态，已由后续§8.86、§8.88–§8.89及§8.93更新：Portfolio应收/结算和已结算购买力门禁、Trade日历字段、双市场固定场景与Quant/Paper账本对照均有自动通过证据。完整市场日历/全量规则矩阵、P4父项和人工验收仍OPEN。

### 8.85 OD-014 Portfolio应收与结算服务实现（2026-10-11）

首轮代码增加Portfolio schema迁移v2、Paper SELL应收记录、快照应收状态、以调用方Run Clock释放到期应收的内部API，以及既有BUY预留仅按已结算现金计算的行为。结算校验读取冻结Fixture并核对Manifest SHA、市场/币种、市场本地交易日、日历版本和显式映射。SELL成交现金账本不再虚增可用现金；费用更正对待结算款调整应收，对已结算款调整现金。Portfolio容器带只读Fixture副本。

本节初始状态和未执行测试已由§8.86后续证据更新。当前实现已通过Portfolio隔离PostgreSQL、Trade完整集成及V1.3容器Web/API/CLI回归；人验、完整双市场SELL→BUY和版本门禁仍保持OPEN。

### 8.86 OD-014 Trade Outbox、双账本结算及V1.3 Paper验证（2026-10-11）

为不覆盖冻结版本，新增`v1.4-paper-settlement-calendar-1`的不可变实现日历Fixture版本2，SHA-256 `0f3503f120f5ea09b594a71c21e95ed3f3bb8fa2fd2e066a43ab91d7cc3bbca0`；其显式覆盖V1.3固定场景日期，并保留Fixture尾部应收。Trade在SELL Outbox持久化结算版本/日期，FakeBroker独立资产账和Portfolio均以未结应收记录卖款；Portfolio可用现金保持不变，只有注入的Run Clock到达明确结算时间后才能幂等释放。Trade和Portfolio schema v2迁移兼容既有v1数据，费用更正按当前结算状态调整应收或现金。V1.3 MANUAL/AUTO执行协调器在处理新订单前按Run Clock分别结算两账。Unknown session和Fixture缺口失败关闭。

证据：Contracts生成/漂移检查、Fixture检查通过；Portfolio单测12/12、typecheck通过，真实隔离PostgreSQL迁移/存储集成6/6通过。Trade单测104/104、typecheck通过；完整Trade integration包括真实隔离PostgreSQL、身份HTTP、Outbox响应丢失/并发claim/lease takeover/过期ack fencing及费用更正幂等，exit 0。完整`pnpm test:e2e -- --stage V1.3`在容器Linux ARM64运行，Playwright 27/27通过并由每个Run执行同Run CLI只读核对与Evidence导出，包含T+1当日拒绝零副作用、推进Session后CN SELL成功；该卖出账户与FakeBroker现金均保持`8995.0000 CNY`，`995.0000 CNY`列为结算日2026-09-30的PENDING receivable，账本差异为空。关键同Run TestRun为`27cb77ea-c08a-4049-95ff-51b73acabf8c`，Evidence Manifest SHA-256 `d71ce0bb406e15ad89850204a8bb8e5f8a9013bef648bcf277b1774c7a75e1bf`，见[Evidence Bundle](../../../evidence/local/V1.3/27cb77ea-c08a-4049-95ff-51b73acabf8c/manifest.sha256)。全部随机容器/卷/网络已精确清理；真实券商及外部数据调用0。

合同、Fixture、Portfolio/Trade类型与测试日志见[OD-014当前树验证](../../../evidence/audits/2026-10-11-v14-od014-trade-portfolio-static-a02.log)、[合同生成](../../../evidence/audits/2026-10-11-v14-od014-contract-generation-a02.log)、[合同检查](../../../evidence/audits/2026-10-11-v14-od014-contract-check-a02.log)、[Fixture检查](../../../evidence/audits/2026-10-11-v14-od014-fixture-check-a02.log)及[此前保存的Portfolio PostgreSQL实测记录](../../../evidence/audits/2026-10-11-v14-od014-portfolio-first-cut-a01.md)。本次CN固定T+1链路和两端账本现已验证；US固定结算日历/币种隔离在Fixture和Portfolio规则测试中覆盖，但本轮未声称US SELL同Run链已通过。Quant/Paper逐规则一致性、历史TestRun恢复、目标Ubuntu环境、完整P4及本轮用户本人验收仍未满足，故V1.4与V1保持OPEN。

### 8.87 US_EQUITY结算闭环支持探测（2026-10-11）

使用随机隔离V1.3栈运行Web/API/CLI回归：原有27项通过；新增US结算探测在首次会话推进被服务端403拒绝。源码检查确认`V13SessionAdvanceService`仅接受`CN_A`账户，且只读取CN_A交易日历，因此US_EQUITY尚不能推进Run Clock，也未能验证US同日T+1拒绝、SELL应收、结算及结算后BUY。随机容器、卷、网络和镜像已精确清理。失败日志见[探测日志](../../../evidence/audits/2026-10-11-v13-us-settlement-support-probe-a01.log)、[exit](../../../evidence/audits/2026-10-11-v13-us-settlement-support-probe-a01.exit.txt)和[SHA-256](../../../evidence/audits/2026-10-11-v13-us-settlement-support-probe-a01.log.sha256)。

这是待实现功能缺口，不是US场景通过证据。后续必须为US_EQUITY实现按美东Session解释的Run Clock推进、明确Fixture日历读取及双账本结算路由，再跑同Run Web/API/CLI闭环；不得改用CN日历或按自然日推算。OD-014整体、P4与V1验收保持OPEN。

### 8.88 OD-014 US_EQUITY Paper严格已结算现金子项（2026-10-11）

此前§8.87记录的是尚不支持会话推进时的失败探测。现固定US_EQUITY闭环已通过，完整实现和定向端到端结果见[V1.3 §8.81](./03-fake-broker-trading-loop.md#881-od-014-us_equity严格已结算现金paper-sell闭环2026-10-11)。该子项使用Manifest锁定的合成New York session Fixture，买入后于下一列出Session卖出，卖款在两账本保留为PENDING receivable，后续Fixture session才转成USD现金；同Run CLI核对通过。此证据关闭US固定Paper现金释放子项，但不代表交易所日历或全量费税、Quant/Paper全部规则逐项一致、完整P4/阶段人工验收通过。


### 8.89 OD-014严格已结算现金下的Quant/Paper历史费率对照（2026-10-11）

V1.4已批准的严格现金规则要求把已结算现金和卖出应收分开核对。上一轮完整套件发现，原Parity harness把Quant的`settledCashCents + unsettledSaleProceedsCents`误当作Portfolio `cash`预期，并且历史2023交易日期不在固定结算日历中。原失败保留在[首次loopback失败日志](../../../evidence/audits/2026-10-11-v14-us-settlement-code-suite-a03.log)与[定向缺日历失败日志](../../../evidence/audits/2026-10-11-v14-settled-cash-parity-target-a01.log)；前者的两个脚本测试仅因普通沙箱禁止监听127.0.0.1而失败，后者准确暴露了2023日历映射缺口。

遵循Fixture不可变原则，新增[`v1.4-paper-settlement-calendar-3`](../../../fixtures/v1/v1.4-settlement-v1.2.0/manifest.json)，保留v1/v2原文件，给两个市场增加有界2023历史Session。Trade与Portfolio当前运行日历指向v3；单位Fixture检查和`pnpm fixtures:check`通过。Parity harness现在分别校验Quant settled cash、Quant unsettled sale proceeds、Portfolio已结算现金/应收以及独立FakeBroker已结算现金/应收；买入只扣已结算现金，卖出款仅增加应收，不能立即购买。

定向隔离真实Governance/Trade/Portfolio HTTP与三库PostgreSQL对照退出0：9笔Paper执行均比对成交数/价格/费用/日期、Quant现金账本和持仓，Portfolio与FakeBroker已结算现金匹配Quant settled cash，双方PENDING应收逐项累计匹配Quant unsettled proceeds；CNY当前/历史费率以及USD合成费用场景保留，USD费税不作真实市场声明。FakeBroker幂等重放9/9，受限资金拒绝恢复与资源精确清理通过。[运行报告](../../../evidence/audits/2026-10-11-v14-settled-cash-parity-target-a03.log)、[退出码](../../../evidence/audits/2026-10-11-v14-settled-cash-parity-target-a03.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v14-settled-cash-parity-target-a03.log.sha256)。完整V1.4 code suite已退出0（[a04日志](../../../evidence/audits/2026-10-11-v14-us-settlement-code-suite-a04.log)、[exit](../../../evidence/audits/2026-10-11-v14-us-settlement-code-suite-a04.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v14-us-settlement-code-suite-a04.log.sha256)）；V1.3当前树Web/API/CLI E2E因切换Fixture版本重跑28/28，US结算TestRun与证据包见[运行日志](../../../evidence/audits/2026-10-11-v13-settlement-fixture-e2e-a01.log)及[结构化Manifest](../../../evidence/local/V1.3/f9d068a9-188c-4e8f-adf1-36e475ddfa28/manifest.sha256)。这些固定切片仍不关闭P4父项；真实交易所结算日历、全部规则和本人验收仍未关闭。

### 8.90 V1.4专用同Run Web/API/CLI与报告证据导出当前树复验（2026-10-11）

V1.4独立持久化TestRun和Quant报告Artifact使用版本化owner-scoped路由。三版本规则要求正式页/测试页调用相同业务API，并由同UUID CLI只读核验；不要求把V1.4 Run转换成通用StageRun投影。当前工作树`pnpm test:e2e -- --stage V1.4`在随机隔离Docker项目中exit 0：浏览器7/7通过、10个浏览器创建Run均同UUID CLI核对；结构化导出对同一个Run断言`manualConclusion=NOT_RUN`、恰有一个报告Artifact且报告字节Hash匹配Run ArtifactRef。沙箱Docker socket首轮失败保留，不作为测试结果。详细范围、路由理由、工作区Hash、资源清理和首轮失败见[语义范围复核A01](../../../evidence/audits/2026-10-11-v14-evidence-export-scope-review-a01.md)、[E2E成功日志a02](../../../evidence/audits/2026-10-11-v14-shared-evidence-scope-e2e-a02.log)、[退出码](../../../evidence/audits/2026-10-11-v14-shared-evidence-scope-e2e-a02.exit.txt)及[SHA-256](../../../evidence/audits/2026-10-11-v14-shared-evidence-scope-e2e-a02.log.sha256)。该证据关闭“V1.4必须调用通用StageRun证据路由”的误导性缺口，不关闭V1.4全规则、P1发布/回退、历史Run、Ubuntu或本人验收；人工结论保持`NOT_RUN`。

### 8.91 OD-014所有者批准后V1.4当前树完整代码门禁复验（2026-10-11）

项目所有者批准严格已结算现金口径后，当前工作树重新执行`pnpm verify:stage -- --stage V1.4 --suite code`，exit 0。完整门禁包含baseline、构建、lint、typecheck、全仓测试、Python适配器、合同与Fixture、服务身份HTTP/PG、迁移账本和V1.4规则对照；隔离三库真实Governance/Trade/Portfolio链核对Quant与Paper的已结算现金、待结算卖款、持仓、费用和Fill，9个历史/当前会话逐项对账，FakeBroker幂等重放9/9，成交10、Fill 9；报告并发取消fencing 3/3，随机容器/网络均清理，活动服务`NOT_CONNECTED`。

普通沙箱首轮因loopback监听EPERM停在基线，本地受控运行完整通过；不作为产品失败。完整日志、exit与SHA-256见[本次V1.4 code suite](../../../evidence/audits/2026-10-11-v14-od014-owner-approved-code-suite-a01.log)、[退出码](../../../evidence/audits/2026-10-11-v14-od014-owner-approved-code-suite-a01.exit.txt)和[日志哈希](../../../evidence/audits/2026-10-11-v14-od014-owner-approved-code-suite-a01.log.sha256)。此结果验证OD-014规则在固定合成Fixture上的代码与账本对照，不证明真实市场日历、完整全市场规则、全量恢复、目标Ubuntu或用户验收；V1.4/P4和V1继续OPEN。

### 8.92 Portfolio结算路由严格请求体合同复验（2026-10-11）

`POST /internal/v1/accounts/{accountId}/settlements`的OpenAPI请求体只允许`asOf`，处理器此前会静默忽略其他键。现在HTTP边界要求请求体为仅含字符串`asOf`的对象；真实隔离服务/PostgreSQL smoke用正确Trade服务Bearer提交`asOf`与`environmentMode=LIVE`，得到400，账户现金及ledgerVersion前后不变。Smoke TestRun `11000dbb-0999-4a60-9c79-b4b5de0ee635`，随机数据库/服务网络由Harness清理并核验；完整`pnpm verify:stage -- --stage V1.4 --suite code`退出0。完整日志、退出码和SHA-256见[code suite a05](../../../evidence/audits/2026-10-11-v14-us-settlement-code-suite-a05.log)、[exit](../../../evidence/audits/2026-10-11-v14-us-settlement-code-suite-a05.exit.txt)与[SHA-256](../../../evidence/audits/2026-10-11-v14-us-settlement-code-suite-a05.log.sha256)。Portfolio处理器源码SHA-256为`c659581db730829bc6d86e9438af4781366656aba3c6ead4d9412c4ad1220529`，HTTP smoke源码SHA-256为`a99b138a9f5cc3fc8d27bba91bfa1ecee58a77ddb144213d78ffda27b113b5d3`。

证据Manifest首次复核发现a05 sidecar使用了错误的相对路径；失败日志保留在[证据检查a01](../../../evidence/audits/2026-10-11-v14-settlement-body-evidence-check-a01-failed.log)。修正为仓库根相对路径后，文档链接审计及证据审计PASS（1762引用、290份Manifest、430项），见[证据检查a02](../../../evidence/audits/2026-10-11-v14-settlement-body-evidence-check-a02.log)。

验收表补入a05证据后，Crosswalk首次检查发现`V1-99-STAGE-V1.4`来源锚点文本过期；该失败保留于[A88](../../../evidence/audits/2026-10-11-v1-crosswalk-current-a88-failed.log)。现已更新精确锚点并保留P6开放状态，Crosswalk A89通过（147要求、1995路径、821目标、257精确测试、147锚点）；矩阵A73仅同步源文件Hash与A72继承关系。[A89](../../../evidence/audits/2026-10-11-v1-crosswalk-current-a89.log) · [A73](../../../evidence/audits/2026-10-11-v1-current-gap-matrix-a73.json)。

此项令结算API实现符合既有精确请求合同，不代表OD-014全部结算场景、完整市场规则/Quant-Paper一致性、Ubuntu、全跨服务发布矩阵或人工验收完成；V1.4仍`PARTIALLY_IMPLEMENTED`。

### 8.93 OD-014结算日历与当前树完整代码套件复验（2026-10-11）

重跑`pnpm verify:stage -- --stage V1.4 --suite code`，受控本机loopback权限下exit 0。Portfolio Risk单测12/12、Trade Execution单测105/105及隔离PostgreSQL目标校验5/5通过；新增/当前版本化CN_A与US_EQUITY日历Fixture三版均通过manifest SHA、身份、币种、Session顺序、显式结算映射和未知日期失败关闭校验。完整隔离套件中的真实Governance/Trade/Portfolio HTTP+PostgreSQL量化对照验证9个历史/当前会话：Portfolio账本、FakeBroker独立资产簿的已结算现金和待结算应收均与Quant逐项匹配；FakeBroker同命令幂等重放9/9，隔离数据库、容器、网络清理PASS，活动服务`NOT_CONNECTED`。完整日志、exit及SHA见[套件a06](../../../evidence/audits/2026-10-11-v14-od014-owner-approved-code-suite-a06.log)、[退出码](../../../evidence/audits/2026-10-11-v14-od014-owner-approved-code-suite-a06.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v14-od014-owner-approved-code-suite-a06.log.sha256)；Fixture独立验证报告见[日历检查](../../../evidence/audits/2026-10-11-v14-settlement-calendar-fixture-a01.log)。

本次只证明有界、合成、版本化Fixture覆盖的代码与账本子项；不证明真实交易所完整日历、美股真实费税、全故障恢复、Ubuntu或用户验收。V1.4/P4及V1仍未通过。

### 8.94 当前树V1.4 Web/API/CLI同Run浏览器复验（2026-10-11）

在当前代码版本`sha256:a4028e55ea5bdd5972100d5b2a9e278ea047a8e6f17090cc30ede1cc2c40d401`上运行`pnpm test:e2e -- --stage V1.4`，受控本机Docker权限下exit 0：隔离PostgreSQL/API/Web/Evidence栈启动并精确清理；浏览器7/7通过，覆盖正式报告、拒绝和刷新恢复、停牌/限制价、历史费用、公司行动和有界策略场景；10个Web创建TestRun均由同UUID CLI核验，CLI拒绝及恢复运行通过，报告Artifact与Manifest Hash核对。随机项目、容器、卷、网络均由Harness移除，活动服务保持`NOT_CONNECTED`。完整日志、退出码与SHA见[E2E a03](../../../evidence/audits/2026-10-11-v14-current-tree-web-cli-e2e-a03.log)、[exit](../../../evidence/audits/2026-10-11-v14-current-tree-web-cli-e2e-a03.log.exit.txt)和[SHA-256](../../../evidence/audits/2026-10-11-v14-current-tree-web-cli-e2e-a03.log.sha256)。

该复验补充当前树浏览器/同Run证据，不改变各TestRun人工结论`NOT_RUN`；也不替代真实市场观察、Ubuntu验收或V1.4/V1正式通过。

### 8.95 V1.4 当前树完整隔离Web/API/CLI阶段复跑（2026-10-12）

执行 `pnpm test:e2e -- --stage V1.4`，完整日志、exit与SHA见[阶段复跑日志](../../../evidence/audits/2026-10-12-v14-current-tree-stage-e2e-a01.log)、[退出码](../../../evidence/audits/2026-10-12-v14-current-tree-stage-e2e-a01.log.exit.txt)及[SHA-256](../../../evidence/audits/2026-10-12-v14-current-tree-stage-e2e-a01.log.sha256)。exit 0；容器化API/PostgreSQL/Web隔离栈通过，Chromium 7/7；normal、拒绝、刷新恢复、停牌/限价、历史费率、RAW公司行动和有界策略场景运行通过。API及10个Web创建Run经同UUID CLI `--check-only`核对，固定报告Artifact/Manifest hash一致；治理拒绝及recovery CLI检查通过。随机项目`sq-v14-backtest-a7bd9edb71ab152e938d`容器、卷、网络精确清理完成。

此为固定合成Fixture的自动Web/API/CLI验收。各Run人工结论仍NOT_RUN；真实完整市场日历/费用、Quant/Paper全规则一致性、Ubuntu实机、当前范围用户签收和V1.4阶段正式关闭仍开放。

### 8.96 V1.4 当前树完整代码套件复跑（2026-10-12）

`pnpm verify:stage -- --stage V1.4 --suite code`在受控本机回环/容器环境退出0。基线67/67、工作区构建/类型检查与服务单测、Python Market Data适配器69/69、Market Data隔离HTTP/PG集成28/28、阶段数据库迁移、报告发布fencing 3/3及9个固定CN/US会话Quant/Trade/FakeBroker/Portfolio已结算现金与待收账本对照通过；FakeBroker幂等资产重放9/9。linux/arm64容器边界检查PASS；隔离数据库/容器/网络清理通过，活动服务`NOT_CONNECTED`。完整日志、退出码与SHA-256见[code suite日志](../../../evidence/audits/2026-10-12-v14-current-tree-code-suite-a01.log)、[exit](../../../evidence/audits/2026-10-12-v14-current-tree-code-suite-a01.log.exit.txt)和[SHA-256](../../../evidence/audits/2026-10-12-v14-current-tree-code-suite-a01.log.sha256)。这只确认当前代码套件，不表示完整市场规则、Ubuntu实机或当前范围人工验收已通过。

### 8.97 Historical Replay→Portfolio实际V1客户端逐操作超时合同（2026-10-12）

当前V1 Replay Worker实际调用Portfolio的两个生成客户端方法为`initializeAccount`与`getAccountSnapshot`。既有直接测试已核对Replay身份、初始化载荷、owner header及编码路径，但未逐操作验证超时预算。本轮新增`uses the declared bounded timeout for both V1 Replay→Portfolio operations`，调用两个实际方法并断言各自创建5000ms `AbortSignal.timeout`；未改生产行为或合同。

验证：`pnpm --filter @stockquant/historical-replay-worker exec vitest run tests/unit/portfolio-account-client.spec.ts` 3/3通过；同服务`typecheck`退出0。[定向测试](../../../evidence/audits/2026-10-12-v1-replay-portfolio-timeouts-a01.log)、[typecheck](../../../evidence/audits/2026-10-12-v1-replay-portfolio-timeouts-typecheck-a01.log)、语义复核[A45](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a45.md)。测试源码SHA-256：`489160fd36e5e065db38c1635b9f53827b65c0f544e9bd64d718b8f6c6d3a08f`。

该证据与Platform、Trade客户端测试共同锁定V1三个Portfolio Account调用方的超时预算；它不关闭完整路由/身份/副作用矩阵、服务发布/回退、活动切换、配对恢复或人工作业，L14/P1与V1.4/V1验收保持OPEN。

### 8.98 V1.4当前树完整代码套件再次复验（2026-10-12）

对当前工作树再次执行`pnpm verify:stage -- --stage V1.4 --suite code`。普通沙箱运行因`seed:paper`基线测试需要监听`127.0.0.1`而EPERM退出1，原始失败保留于[受限运行a02](../../../evidence/audits/2026-10-12-v14-current-tree-code-suite-a02.log)；在获准的本机loopback执行环境重跑退出0，完整记录见[运行a03](../../../evidence/audits/2026-10-12-v14-current-tree-code-suite-a03.log)、[退出码](../../../evidence/audits/2026-10-12-v14-current-tree-code-suite-a03.log.exit.txt)与[SHA-256](../../../evidence/audits/2026-10-12-v14-current-tree-code-suite-a03.log.sha256)。

本次基线、构建、lint、typecheck、全仓单测、Python适配器69项、Market Data隔离集成28项、服务身份HTTP/PG、迁移、Trade/Portfolio/Governance隔离数据库的9个CN/US固定会话Quant账本对照、FakeBroker幂等重放9/9、报告发布fencing 3/3均通过；linux/arm64容器边界通过。隔离容器及网络已清理，活动服务`NOT_CONNECTED`。本次是自动代码证据；它不构成OD-014真实交易所日历或完整市场规则证据，也不替代全量恢复、Ubuntu实机、人工验收及V1.4/V1正式门禁。

### 8.99 V1.4取消接口拒绝客户端交易模式注入（2026-10-12）

隔离V1.4 Platform/Quant/PostgreSQL/Web Harness在恢复场景Run上验证六种模式组合均返回422，Run的`cancelRequested`仍为false；随后业务事实注入也拒绝，合法空请求体取消最终成功，取消前未创建Quant报告。六组合当前树完整E2E和精确清理见§8.101；历史四组合结构化报告见[A108](../../../evidence/audits/2026-10-12-v1-l17-cancel-mode-boundaries-a108.json)。

这只关闭V1.4 Platform取消接口的固定模式负测；Replay/Worker和其他服务边界、完整市场规则及阶段人工验收仍开放。

### 8.101 V1.4创建与取消入口六种客户端交易模式矩阵（2026-10-12）

将V1.4隔离Harness中回测Run创建与取消两个Platform入口的客户端模式注入扩展为完整六种`PAPER/BACKTEST/LIVE × FAKE/REAL`组合。所有创建请求均返回422，Quant `research_backtest_runs`前后计数相同；所有取消请求均返回422且同一恢复Run的`cancelRequested=false`。随后正常回测、拒绝/恢复场景、7项浏览器E2E、API及浏览器Run同Run CLI `--check-only`均通过；随机Compose容器、卷、网络已移除。完整日志、退出码与SHA-256：[E2E日志](../../../evidence/audits/2026-10-12-v14-l17-six-mode-e2e-a01.log)、[exit](../../../evidence/audits/2026-10-12-v14-l17-six-mode-e2e-a01.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v14-l17-six-mode-e2e-a01.log.sha256)。代码身份`sha256:aa07e99f0fa90fcc35b2ffe457fbd7174b8f5cfbc3c0064b09922c34e79d35e7`。

### 8.102 V1.4 Historical Replay Worker六种客户端模式注入拒绝矩阵（2026-10-12）

在真实隔离Historical Replay Worker HTTP服务及临时PostgreSQL中，对单条提交、同步多条提交、异步多条提交三个入口分别提交六种`environmentMode`/`brokerMode`组合，共18次模式注入均422；异步Run创建前校验拒绝，持久Run数量保持1→1，不派发新工作。对pause/resume/cancel/recover-unknown四个bodyless命令逐一提交同六种组合，共24次均422，既有Run保持COMPLETED且结果为空。此前对这四个命令的伪造业务事实拒绝仍通过。服务端按`BACKTEST/FAKE`派生执行模式，不接受请求体覆盖。

Replay Worker单元测试31/31通过；专用隔离HTTP/PG服务身份smoke及完整V1.4 code suite exit 0。临时PostgreSQL容器/网络精确清理，活动服务`NOT_CONNECTED`。[专用HTTP/PG日志](../../../evidence/audits/2026-10-12-v14-l17-replay-mode-matrix-http-a02.log)、[exit](../../../evidence/audits/2026-10-12-v14-l17-replay-mode-matrix-http-a02.log.exit.txt)、[SHA](../../../evidence/audits/2026-10-12-v14-l17-replay-mode-matrix-http-a02.log.sha256)、[单元测试](../../../evidence/audits/2026-10-12-v14-l17-replay-mode-matrix-unit-a01.log)、[完整code suite](../../../evidence/audits/2026-10-12-v14-l17-replay-mode-matrix-code-suite-a01.log)、[code suite exit](../../../evidence/audits/2026-10-12-v14-l17-replay-mode-matrix-code-suite-a01.log.exit.txt)、[code suite SHA](../../../evidence/audits/2026-10-12-v14-l17-replay-mode-matrix-code-suite-a01.log.sha256)。首轮HTTP/PG smoke的断言执行完成后在汇总报告作用域处失败，原始a01日志保留；修正报告作用域后的a02及完整suite通过。

该矩阵只验证固定Replay Worker提交与bodyless lifecycle/recovery入口的拒绝边界，不证明Replay完整成功交易链、所有V1 Worker路由或历史兼容、部署/恢复和人工验收；L17/P0及V1仍OPEN。

该证据仅关闭Historical Replay Worker固定提交与生命周期入口的模式矩阵原子切片；其他服务/Worker/页面写操作、完整规则结算、Ubuntu和人工验收仍开放，V1.4与V1不因此通过。

### 8.103 V1.4合成基准与超额收益报告

新增独立冻结输入`fixtures/v1/v1.4/backtest_benchmark-manifest.json`（`v1.4-daily-backtest-benchmark-1`），其CSV SHA-256为`be3735f7d9005b76ebf6cd0cc57b0f3229b1560f42fceff2b329505ecafb64ab`。它覆盖正常回测的2024-01-02至2024-01-05和历史费率回测的2023-08-23至2023-08-28；策略Fixture及其既有Manifest保持不变。Quant校验策略与基准session一一对应，复合输入Hash同时绑定两份CSV；报告使用`v1.4-daily-backtest-2`或`v1.4-historical-fees-2`。基准初末点计算整数基点收益，超额收益定义为策略累计收益减基准收益。固定正常场景断言合成基准收益150bp、策略收益0bp、超额收益-150bp；历史费率合成场景基准收益80bp。Web报告显示基准标识、基准收益与超额收益。

该数据是合成测试序列，不是指数或真实市场收益。已验证：Quant单元测试101/101、服务端类型检查、合同生成与`pnpm contracts:check`、Web类型检查和生产构建通过。`pnpm verify:stage -- --stage V1.4 --suite code`当前树受控运行退出0，日志见[code suite](../../../evidence/audits/2026-10-12-v14-benchmark-code-suite-a02.log)、[exit](../../../evidence/audits/2026-10-12-v14-benchmark-code-suite-a02.log.exit.txt)及[SHA-256](../../../evidence/audits/2026-10-12-v14-benchmark-code-suite-a02.log.sha256)；未提权的loopback EPERM失败诊断保留在[a01](../../../evidence/audits/2026-10-12-v14-benchmark-code-suite-a01.log)。`pnpm test:e2e -- --stage V1.4`受控隔离运行退出0，Chromium 7/7、10个浏览器Run同Run CLI核验、18个Quant TestRun/Manifest结果Hash匹配、随机Compose容器/卷/网络清理通过；机器报告为[PASS](../../../evidence/audits/2026-10-07-v14-durable-tasks-9a8cc62246a2443aef9c.json)，codeVersion `sha256:465cd8946c07a31ca96206b683d50cea6c5f719b76157bdad4de065c3a40518d`，复合Fixture SHA `a89d48a93bc72dd95ca85b7ddf29a08f5dd2092d8b618f2cd09ede3d6f198a2d`。正式V1门禁a02随后确认五阶段文档与证据审计PASS（2363引用/406份Manifest/544项），但版本仍INCOMPLETE/exit 2，`uncheckedVersionGate=true`。语义追踪矩阵A118只复核V1.4-S2-L17单行并保持PARTIAL，详见[复核报告](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a118.md)及[矩阵](../../../evidence/audits/2026-10-12-v1-current-gap-matrix-a118.json)。所有新Run仍`manualConclusion=NOT_RUN`，因此不据此关闭L17父项、完整费用归因、Paper逐账本全规则对照、Ubuntu或V1.4人工验收。

### 8.104 V1.4结算日期按市场本地时区跨UTC日界回归（2026-10-12）

OD-014已批准严格已结算现金口径，结算日必须由固定Manifest中的市场Session映射确定。本轮为Trade填充结算解析和Portfolio结算校验补充跨UTC午夜回归：CN_A的`2026-09-24T16:30:00Z`按上海时区归属`2026-09-25`并映射至`2026-09-28`；US_EQUITY的`2026-09-25T03:30:00Z`仍属纽约`2026-09-24`并映射至`2026-09-25`，到`04:30Z`才切换到纽约`2026-09-25`，映射至`2026-09-28`。两服务均从相同冻结Fixture版本读取并验证精确交易日/结算日。

验证日志：[Trade单测](../../../evidence/audits/v14-market-local-date-trade-unit-a01.log)、[Portfolio单测](../../../evidence/audits/v14-market-local-date-portfolio-unit-a01.log)、[Trade类型检查](../../../evidence/audits/v14-market-local-date-trade-typecheck-a01.log)、[Portfolio类型检查](../../../evidence/audits/v14-market-local-date-portfolio-typecheck-a01.log)均exit 0；受控完整`pnpm verify:stage -- --stage V1.4 --suite code`亦exit 0，三服务真实HTTP/隔离PostgreSQL规则对照、Quant/Paper已结算现金与应收对账9/9、幂等重放9/9及报告发布fencing 3/3通过，临时资源清理通过，活动服务`NOT_CONNECTED`。[完整套件](../../../evidence/audits/2026-10-12-v14-market-local-date-code-suite-a02.log)、[exit](../../../evidence/audits/2026-10-12-v14-market-local-date-code-suite-a02.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v14-market-local-date-code-suite-a02.log.sha256)。该回归只关闭跨UTC日界的市场本地日期解析子项；真实交易所完整日历/全量费税、完整Quant/Paper规则矩阵、其他恢复组合及当前范围人工验收仍未完成，V1.4-S2-L18/P4保持OPEN。

### 8.105 OD-014未映射结算日SELL成交保留为待结算应收（2026-10-12）

所有者已批准OD-014严格已结算现金口径。若有效FakeBroker SELL Fill的交易日没有冻结结算日历映射，Trade仍将Fill和Outbox持久化；Portfolio保存`settlementDate=null`及`SETTLEMENT_CALENDAR_UNAVAILABLE`待结算应收，不增加已结算现金，也不推测释放日期。应收保持PENDING且不会自动入账；只有有明确映射的结算日可释放现金。重复投递按Fill ID幂等，BUY资金门禁不把这笔应收计为可用现金。

Portfolio与Trade各自服务数据库新增schema migration v3；约束仅允许“已映射日期且无错误”或“空日期、日历不可用错误且PENDING”两种事实。Portfolio隔离PostgreSQL测试覆盖现金不变、应收快照、到期查询不释放、BUY不能花费应收及重放幂等；Trade真实FakeBroker仓储隔离PostgreSQL测试执行SELL并核对剩余持仓、`99.8001`应收、现金不变、Outbox精确结算载荷及相同命令重放，随后完整V1.4 code suite验证两服务迁移、跨服务账本、全仓检查和临时数据库/容器清理。受控最终复跑exit 0：[完整code suite日志](../../../evidence/audits/2026-10-12-v14-unknown-calendar-receivable-code-suite-a02.log)、[exit](../../../evidence/audits/2026-10-12-v14-unknown-calendar-receivable-code-suite-a02.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v14-unknown-calendar-receivable-code-suite-a02.log.sha256)。Portfolio定向测试`persists an unmapped SELL as a pending receivable without releasing cash`位于`services/portfolio-risk-service/tests/integration/resource-reservations.spec.ts`；Trade持久化场景位于`services/trade-execution-service/scripts/test-persistence.mjs`，运行时输出`FakeBroker unknown settlement calendar`。

这只证明未知日历时不丢失有效成交且不提前动用资金；不证明真实交易所日历、全部结算/费用组合、完整版本门禁或人工验收，P4及V1仍OPEN。

### 8.106 OD-014服务Schema变更后的V1.3 Web/API/CLI回归（2026-10-12）

在Portfolio/Trade schema v3及可空结算日合同更新后，重跑`pnpm test:e2e -- --stage V1.3`。隔离容器中Playwright 38/38通过，包含CN_A/US_EQUITY固定Paper交易、MANUAL/AUTO SELL/BUY严格已结算现金、恢复/重试与同Run CLI核验；所有新导出关联原TestRun并保留`manualConclusion=NOT_RUN`。随机Compose项目、PostgreSQL卷和网络均精确移除，外部数据源调用和真实券商调用均为0。

[回归日志](../../../evidence/audits/2026-10-12-v13-od014-settlement-regression-e2e-a01.log)、[exit](../../../evidence/audits/2026-10-12-v13-od014-settlement-regression-e2e-a01.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v13-od014-settlement-regression-e2e-a01.log.sha256)。这证明已映射固定场景的兼容性，不覆盖未知日历日期的Web创建场景，也不构成新增Run的人工作业签收或V1.3/V1验收。

### 8.107 OD-014未知结算日的Trade→Portfolio真实HTTP严格现金回归（2026-10-12）

在隔离PostgreSQL与Trade、Portfolio真实HTTP服务中，先为独立Paper账户建立持仓并创建SELL预留，再用冻结FakeBroker有效SELL Fill触发日历未映射路径。Trade将Fill、空结算日和`SETTLEMENT_CALENDAR_UNAVAILABLE`持久化后，经Outbox HTTP投递至Portfolio；Portfolio现金保持`10000.0000`，仅增加`99.8001`的PENDING应收。后续结算查询不释放该应收，使用该应收金额下BUY预留返回409；Trade Outbox为DELIVERED。完整P5-7隔离场景、Trade/Portfolio构建和V1.4 code suite通过，准确日志见[完整code suite a03](../../../evidence/audits/2026-10-12-v14-unknown-calendar-receivable-code-suite-a03.log)、[exit](../../../evidence/audits/2026-10-12-v14-unknown-calendar-receivable-code-suite-a03.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v14-unknown-calendar-receivable-code-suite-a03.log.sha256)；真实HTTP场景脚本为`services/trade-execution-service/scripts/p5-7-outbox-http-smoke.mjs`，隔离运行入口为`pnpm --filter @stockquant/trade-execution-service test:p5-7`。

该用例证明未知映射下有效成交经真实服务边界进入Portfolio且不提前释放资金；不证明全部市场日历/结算组合、Web未知日期场景、阶段人工验收或V1整体完成。

### 8.108 Quant回测按冻结结算Fixture处理已结算现金与未知日历应收（2026-10-12）

Quant日线回测此前把成交后的下一条日线当作结算日，未使用OD-014已批准的显式结算映射。现在Quant Fixture Adapter校验冻结`v1.4-paper-settlement-calendar-3`的Manifest身份、文件SHA、CN_A币种和有序映射，并将Fixture版本、日历版本和SHA写入每次回测证据。只有映射日期存在于回测窗口且到达时才释放卖出现金；映射到窗口外的未来日期仍为应收；交易日无映射时记录`SETTLEMENT_CALENDAR_UNAVAILABLE`、`settlementDate=null`，现金不动，应收在后续每个Session持续计入NAV。Quant容器镜像现携带日历JSON和Manifest。

定向`v14-daily-backtest.spec.ts`与Trade执行Parity单测25/25、Quant typecheck通过；完整V1.4 code suite exit 0。容器化`pnpm test:e2e -- --stage V1.4`最终7/7通过，API及10个浏览器Run由同Run CLI核验，Platform重启恢复原TestRun通过，隔离容器、卷、网络清理通过。[完整code suite](../../../evidence/audits/2026-10-12-v14-explicit-settlement-calendar-quant-parity-code-suite-a02.log)、[exit](../../../evidence/audits/2026-10-12-v14-explicit-settlement-calendar-quant-parity-code-suite-a02.log.exit.txt)、[SHA](../../../evidence/audits/2026-10-12-v14-explicit-settlement-calendar-quant-parity-code-suite-a02.log.sha256)；[Web/API/CLI E2E](../../../evidence/audits/2026-10-12-v14-explicit-settlement-calendar-web-e2e-a02.log)、[exit](../../../evidence/audits/2026-10-12-v14-explicit-settlement-calendar-web-e2e-a02.log.exit.txt)、[SHA](../../../evidence/audits/2026-10-12-v14-explicit-settlement-calendar-web-e2e-a02.log.sha256)。首次E2E [a01失败日志](../../../evidence/audits/2026-10-12-v14-explicit-settlement-calendar-web-e2e-a01.log)定位到Quant镜像未包含结算Fixture，修复镜像后a02验证通过并记录清理成功。

该项只关闭V1.4 Quant未知结算日和显式结算映射的一致性子项；真实交易所日历、全量费税/规则、完整Quant/Paper逐规则对照、Ubuntu和人工验收仍开放。

### 8.113 OD-014批准后的当前树完整V1.4 code suite复验（2026-10-12）

用户已批准严格已结算现金口径。当前工作区执行`pnpm verify:stage -- --stage V1.4 --suite code`，退出码0。基线、合同/Fixture、层依赖、服务构建及测试、隔离HTTP/PostgreSQL适配器和迁移检查均完成；Quant/Trade/Portfolio/Governance隔离交易会话报告9次账本对账、9次FakeBroker幂等资产重放及严格结算边界匹配，活动服务未连接，所有临时PostgreSQL容器与网络已清理核验。运行环境为macOS ARM64、Node v24.1.0，PostgreSQL测试镜像`sha256:9e9764474d0c70ceff17378a6eca55b00c98d2f4d564be06a8e82f2431b3caa2`。

原始日志：[完整code suite](../../../evidence/audits/2026-10-12-v14-full-code-suite-strict-cash-a01.log)，[退出码](../../../evidence/audits/2026-10-12-v14-full-code-suite-strict-cash-a01.log.exit.txt)，[SHA-256](../../../evidence/audits/2026-10-12-v14-full-code-suite-strict-cash-a01.log.sha256)。未提权首轮因沙箱禁止本机loopback监听，在`seed:paper`两项测试失败（65/67通过）；受控重跑允许loopback并完成整套测试。此code suite只证明当前树固定套件与场景通过，不代表完整市场规则、真实交易所日历、全部费税、全规则Qlib/Paper一致性、Ubuntu或人工验收已经通过；V1.4与V1仍未完成。

### 8.109 V1.4冻结限制Fixture的Quant/FakeBroker同输入对照（2026-10-12）

将冻结合成限制Fixture的停牌BUY、锁涨停BUY、锁跌停SELL及非锁定可交易BUY四个bar，分别交给Quant `evaluateV14RestrictionBar`和Trade FakeBroker `calculateHistoricalExecution`，逐项比较拒绝/可成交结论与原因；拒绝用例必须无Fill。测试绑定Fixture SHA-256 `45413145031d48c74f0592dbe450a68081f4e0e22e769e8d8b4ddf2ffd57e52a`。定向Parity文件共10项通过，Quant服务typecheck通过，日志见[限制规则Parity测试](../../../evidence/audits/2026-10-12-v14-restriction-quant-paper-parity-a01.log)、[exit](../../../evidence/audits/2026-10-12-v14-restriction-quant-paper-parity-a01.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v14-restriction-quant-paper-parity-a01.log.sha256)及[typecheck](../../../evidence/audits/2026-10-12-v14-restriction-quant-paper-parity-typecheck-a01.log)。

真实隔离集成脚本同样从该CSV构造Quant决策；停牌BUY、锁涨停BUY和锁跌停SELL经Governance授权与Trade Paper HTTP执行，数据库验证拒绝原因/无Fill/预留释放和幂等重放。完整V1.4 code suite受控复跑exit 0，输出明确列出四个Quant parity case，并核验随机服务数据库与网络清理：[code suite日志](../../../evidence/audits/2026-10-12-v14-http-quant-restriction-parity-code-a03.log)、[exit](../../../evidence/audits/2026-10-12-v14-http-quant-restriction-parity-code-a03.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v14-http-quant-restriction-parity-code-a03.log.sha256)。普通沙箱loopback权限失败保留在[a01诊断日志](../../../evidence/audits/2026-10-12-v14-http-quant-restriction-parity-code-a01.log)；受控a03完整复验通过。

该对照仅覆盖版本化合成输入下的固定状态；不证明交易所限价公式、盘中队列/撮合、真实市场交易日历或全量费用税务规则，也未把全部bar条件组合与真实Qlib信号贯穿至Paper账本。方法与范围记录见[审计说明](../../../evidence/audits/2026-10-12-v14-restriction-quant-paper-parity-a01.md)。因此V1.4-S2-L18/P4和人工验收继续OPEN。

### 8.110 V1.4回测报告显式区分执行模型（2026-10-12）

Quant回测结果合同要求`evidence.executionModel`，包含`component`与受限`modelId`。常规/历史费率/拒绝/恢复回测标记`DAILY_BAR_CLOSE_NEXT_SESSION_PARTICIPATION_V1`；合成停牌与限制价用例标记`SYNTHETIC_DAILY_OHLC_RESTRICTION_RULES_V1`；RAW拆股/分红账本用例标记`RAW_DAILY_BAR_CORPORATE_ACTION_LEDGER_V1`。三个标识均明确属于`QUANT_BACKTEST_ENGINE`，与Qlib Worker CPU研究模型分开。结果Schema进一步按`scenarioId`强制对应的模型ID，`scripts/v14-execution-model-contract.test.mjs`验证六个正确映射均接受，并拒绝全部跨场景错配。

验证：V1.4 Quant定向测试30/30、服务typecheck、`pnpm contracts:check`通过。完整`pnpm verify:stage -- --stage V1.4 --suite code`在最新Schema下受控退出0：合同错配测试2/2、Quant单测107/107、Market Data集成28/28、三服务HTTP/PG规则对照（含四个限制Parity场景）、阶段迁移及报告fencing 3/3通过；隔离资源清理成功。普通沙箱loopback EPERM诊断保留。最新日志、退出码及SHA：[完整套件a03](../../../evidence/audits/2026-10-12-v14-execution-model-code-suite-a03.log)、[exit](../../../evidence/audits/2026-10-12-v14-execution-model-code-suite-a03.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v14-execution-model-code-suite-a03.log.sha256)、[受限环境诊断](../../../evidence/audits/2026-10-12-v14-execution-model-code-suite-a01.log)。

此项只补足回测产物中执行模型的可辨识性。Qlib Worker实际研究输出与同一V1.4固定基准交易链路的端到端配对、全市场规则/费用和人工验收仍开放；V1.4-S2-L18/P4与V1不因此通过。

### 8.111 V1.4执行模型标识的正式页面及同Run验证（2026-10-12）

V1.4报告原先把`DAILY_BAR / BACKTEST / FAKE`运行模式显示在“执行模型”一栏，未呈现具体模型ID。本轮将页面拆分显示执行组件/模型与运行模式；normal路径页面断言`QUANT_BACKTEST_ENGINE / DAILY_BAR_CLOSE_NEXT_SESSION_PARTICIPATION_V1`，RAW公司行动页面断言`QUANT_BACKTEST_ENGINE / RAW_DAILY_BAR_CORPORATE_ACTION_LEDGER_V1`。

`pnpm --filter @stockquant/web typecheck`通过。当前容器化Web/API/Quant/Portfolio隔离E2E退出0，Playwright 7/7；API创建Run和10个浏览器创建Run均经相同TestRun ID的CLI `--check-only`核验，取消/恢复、限制/费率/公司行动场景通过，隔离PostgreSQL卷、容器和网络确认清理。最新codeVersion为`sha256:0e22e315a19543c5993d9252088410a875f4a44a11f4ae6322b53b11080fc8e1`。完整日志、退出码和Hash见[最新E2E日志a02](../../../evidence/audits/2026-10-12-v14-execution-model-web-e2e-a02.log)、[exit](../../../evidence/audits/2026-10-12-v14-execution-model-web-e2e-a02.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v14-execution-model-web-e2e-a02.log.sha256)；此前a01执行快照保留。

此E2E证明固定回测模型ID到达正式页面并可同Run复核；不证明Qlib研究模型与交易回放的完整业务Parity、真实市场规则、人工验收或阶段关闭。

### 8.112 OD-014严格现金当前树定向复核（2026-10-12）

在项目所有者批准严格已结算现金口径后，对当前树执行Portfolio `settlement-calendar`/`resource-reservations`单测5/5，Trade `portfolio-fill`/MANUAL Paper/AUTO Paper单测23/23，`pnpm contracts:check`和`pnpm fixtures:check`均退出0。检查覆盖SELL应收/未知日历失败关闭、BUY只能预留已结算现金、混合MANUAL/AUTO批次现金不足时不提交订单及合同/冻结双市场日历一致性。完整可复现命令、输出和退出码见[当前树检查日志](../../../evidence/audits/2026-10-12-v1-od014-strict-cash-current-checks-a01.log)、[exit](../../../evidence/audits/2026-10-12-v1-od014-strict-cash-current-checks-a01.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-od014-strict-cash-current-checks-a01.log.sha256)。

这是当前树定向自动回归，不重复声明完整V1.3/V1.4 E2E，也不关闭实际市场日历/费税、Quant/Paper全规则Parity、阶段收尾、Ubuntu/全域恢复或人工验收；V1.4/P4及V1仍OPEN。

### 8.114 OD-014批准后当前树V1.4 Web/API/CLI E2E复验（2026-10-12）

在OD-014严格已结算现金实现与完整code suite复验后，受控隔离执行`pnpm test:e2e -- --stage V1.4`退出0；Chromium 7/7通过，10个浏览器创建的TestRun均由CLI按同一UUID只读核验，另有API创建Run同Run CLI核验、CLI拒绝与恢复场景验证。冻结回测Fixture SHA-256为`a89d48a93bc72dd95ca85b7ddf29a08f5dd2092d8b618f2cd09ede3d6f198a2d`，隔离Compose容器、专用卷和网络清理并核实移除。[完整E2E日志](../../../evidence/audits/2026-10-12-v14-strict-cash-web-e2e-a01.log)、[退出码](../../../evidence/audits/2026-10-12-v14-strict-cash-web-e2e-a01.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v14-strict-cash-web-e2e-a01.log.sha256)。

此E2E证明当前固定Web/API/CLI回测工作流和同Run核验，不单独证明Paper已结算现金跨规则全覆盖，也不改变TestRun的人类结论`NOT_RUN`；完整市场规则、阶段人工验收、Ubuntu与V1版本门禁仍OPEN。


### 8.115 US_EQUITY固定合成费用与55bps滑点Quant/Paper真实服务对照（2026-10-12）

V1.4 US Fixture之前将Quant固定费用设为1.00 USD，而Trade FakeBroker在US未指定CN费率时按成交额比例计算；零滑点的$10×100股恰好也为1.00 USD，因而旧BUY/SELL场景未暴露差异。将US Quant/Paper对照扩展到55bps滑点后，首次隔离套件a02发现BUY现金为992.9940 USD：Paper按$1006成交额计算1.006 USD费用，与Quant的固定1.00 USD不一致。失败原始日志保留于[a02](../../../evidence/audits/2026-10-12-v14-us-slippage-parity-code-suite-a02.log)。

Trade Historical FakeBroker现对USD执行采用显式常量`US_EQUITY_SYNTHETIC_FIXTURE_FEE_CENTS=100`；该常量只代表合成Fixture费用，不声称真实市场/券商费用。Quant与Trade单测在AAPL BUY和SELL两侧逐项比较55bps后的成交数量、价格、费用和Session：Quant/Paper parity 12/12、Trade historical execution 12/12、Trade typecheck均exit 0；日志见[Quant/Paper定向测试](../../../evidence/audits/2026-10-12-v14-us-fixed-fee-parity-unit-a01.log)、[Trade单测](../../../evidence/audits/2026-10-12-v14-us-fixed-fee-trade-unit-a01.log)、[类型检查](../../../evidence/audits/2026-10-12-v14-us-fixed-fee-trade-typecheck-a01.log)。

完整`pnpm verify:stage -- --stage V1.4 --suite code`受控重跑a03退出0。Governance/Trade/Portfolio真实HTTP和隔离PostgreSQL回归中，9次Quant/Portfolio账本对照、9次FakeBroker独立账本核对与9次同命令幂等重放通过；US BUY/SELL现以55bps及固定合成费参与同一账本核验。所有随机数据库/容器/网络清理并核对，活动服务`NOT_CONNECTED`。[完整套件日志](../../../evidence/audits/2026-10-12-v14-us-slippage-parity-code-suite-a03.log)、[exit](../../../evidence/audits/2026-10-12-v14-us-slippage-parity-code-suite-a03.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v14-us-slippage-parity-code-suite-a03.log.sha256)。

该增量修复并验证一个固定US Fixture费用/滑点差异，不证明真实美股数据、真实交易费税、所有市场规则组合或完整Qlib/Paper parity；V1.4-S2-L18/P4和人工验收仍OPEN。

### 8.116 P0/L17 Quant V1.4日线回测服务端模式注入拒绝（2026-10-12）

为覆盖Platform外层之外的Quant内部写边界，扩展隔离`test:service-auth:http`，直接向Quant V1.4日线回测路由提交六种`environmentMode`/`brokerMode`组合。全部请求均由服务端字段白名单以422拒绝；随机PostgreSQL中`research_backtest_runs`与`research_backtest_manifests`前后均为0，确认拒绝未创建回测或Manifest。验证通过真实Quant HTTP进程和隔离PostgreSQL，底层退出码0；临时数据库、容器和网络已清理，活动服务`NOT_CONNECTED`。完整输出与SHA见[隔离HTTP/PG日志](../../../evidence/audits/2026-10-12-v1-l17-quant-backtest-mode-http-pg-a01.log)、[退出码](../../../evidence/audits/2026-10-12-v1-l17-quant-backtest-mode-http-pg-a01.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-l17-quant-backtest-mode-http-pg-a01.log.sha256)。

此项仅关闭Quant V1.4一个内部写路由的模式字段拒绝子项；不证明其他V1服务/Worker完整矩阵、Platform页面全部状态/余额写入面或正式发布/回退完成。V1.3-S2-L17/P3、V1.4阶段验收与V1版本门禁继续OPEN。

### 8.117 当前候选重新验收（2026-10-13）

重新运行`pnpm test:e2e -- --stage V1.4`，exit 0；隔离栈code/服务检查通过，浏览器7/7，10个Web Run均由同Run CLI核对。覆盖固定回测报告、拒绝、刷新恢复、市场限制、历史费用、公司行动幂等及有界策略比较；Fixture SHA-256为`a89d48a93bc72dd95ca85b7ddf29a08f5dd2092d8b618f2cd09ede3d6f198a2d`。normal Run `f65590ce-8ba4-48d4-8309-2ca0d4bcfdb0`；机器报告[JSON](../../../evidence/audits/2026-10-07-v14-durable-tasks-2eff88e14ac7f771a6e0.json)，隔离容器/卷/网络清理通过。模型盈利性、完整市场范围和Ubuntu不在本次结论中；用户确认单列于版本验收表。

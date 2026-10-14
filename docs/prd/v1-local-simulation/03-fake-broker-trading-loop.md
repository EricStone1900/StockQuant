> 当前V1收尾范围（2026-10-13）：所有者要求聚焦主要功能、减少非必要验证和停止扩散；当前执行以[V1主要功能完成计划](../../plans/2026-10-08-v1-completion-plan.md)及[范围决定](../../decisions/2026-10-13-v1-core-closeout-scope.md)为准。延期增强和广泛验证不阻塞本轮，旧任务/结果/签署保留为历史；核心正确性和人工验收不缩减。

> 当前范围决定（2026-10-13）：所有者已将Ubuntu实机部署/恢复/主机资源验收延期至后续Ubuntu部署验收，状态DEFERRED / NOT_RUN；它不再阻塞V1本轮开发及验收。Mac本地容器、目标架构烟测/缺口登记、其余业务/恢复和人工验收要求保留。旧记录中的Ubuntu缺口保留为历史事实，不代表当前V1阻塞。见[延期决定](../../decisions/2026-10-13-v1-ubuntu-deferral.md)。

# V1.3 治理、风控与模拟券商完整交易链路

状态：PASS（2026-10-14，已批准的Mac本地V1主要功能范围；固定CN/US MANUAL/AUTO授权、预算/预留、FakeBroker成交/撤单、严格现金结算、独立账本及UNKNOWN原单恢复已有实测证据，见§8.80–8.81、§8.87、§8.91、§8.113–8.118；用户已确认精确候选整版验收通过）。固定Fixture之外的全市场规则/故障穷举、活动发布回退和Ubuntu实机延期。版本入口：[README](./README.md)。

## 1. 前置与范围

V1.2通过，策略已产生版本化目标；V1.1账户/账本可用。

本阶段所有订单、券商资产和成交均来自隔离模拟环境。真实业务数据库、Qlib或RD-Agent在声明“已验证”时必须真正执行；替身需独立标注。

## 2. 开发任务

2026-10-14当前范围收口：按[所有者决定](../../decisions/2026-10-13-v1-core-closeout-scope.md)核对本轮交付，以下既有广泛父项中的剩余扩展继续保留未勾选，不构成本轮必交。原状态与清单完整保存在[同步前快照](../../../evidence/audits/2026-10-14-v1-closeout-before-status-sync.json)；不把延期项写成PASS。

- [x] 当前主要功能范围已实现并实测：固定CN/US MANUAL/AUTO授权、预算/预留、FakeBroker成交/撤单、严格现金结算、独立账本及UNKNOWN原单恢复。证据见§8.80–8.81、§8.87、§8.91、§8.113–8.118及[五阶段主要路径汇总](../../../evidence/audits/2026-10-13-v1-current-core-e2e-a01.md)。固定Fixture之外的全市场规则/故障穷举、活动发布回退和Ubuntu实机延期。

- [ ] 实现治理建议、MANUAL_APPROVAL与AUTO_POLICY、Mandate、短期执行授权、次数预算与资源预留；每条交易腿和中间资金路径都检查。CN_A/US_EQUITY固定MANUAL BUY/BUY、CN_A/US_EQUITY AUTO BUY/BUY、低现金/部分预留回滚和Trade重启恢复已有隔离E2E证据，见§8.57–§8.61；OD-014 CN_A T+1 SELL双账本结算和结算后再次BUY闭环已由隔离Web/API/CLI验证，见§8.80；固定US AAPL SELL→双账本严格已结算现金闭环现已通过，见§8.81；CN_A严格现金混合SELL/BUY的MANUAL成功、AUTO拒绝与同Run CLI核验见§8.87；全市场授权/规则矩阵和阶段完整范围仍未闭合，故父项保持未勾选。共享Trade执行费用变更后的V1.3完整代码兼容复验exit 0，见§8.114；父项状态不变。
- [x] 当前锁定V1.3 Fixture范围实现隔离FakeBroker订单/查询/撤单/成交/账户契约、稳定brokerOrderId和独立资产；完整矩阵及其同Run CLI核对通过，固定范围以外的市场/订单能力仍未声明。[矩阵日志](../../../evidence/audits/2026-10-08-p3-v13-refresh-fix-matrix-enabled.log)
  调用合同子项增量（2026-10-10）：Trade Outbox实际使用的Portfolio Fill费用更正客户端现有逐项method/path编码/Trade身份/Bearer/body断言，完整V1.3代码套件通过，见§8.69；全调用方/发布矩阵仍开放。
- [x] 当前锁定V1.3 Fixture范围的接受/全成/部分成交/拒绝/UNKNOWN、重复Fill幂等及序号乱序、撤单/更正Outbox固定故障路径均已由完整Web/API/CLI矩阵和隔离PostgreSQL持久化测试验证；[矩阵日志](../../../evidence/audits/2026-10-08-p3-v13-refresh-fix-matrix-enabled.log)、[完整代码套件](../../../evidence/audits/2026-10-08-p3-v13-final-code-suite-after-security-guard.log)。未建模的市场和故障边界继续开放。
- [x] FakeBroker确认DAY到期后事务化写入`EXPIRED`事件与Portfolio预留释放Outbox；部分成交Fill等待入账，UNKNOWN不按到期释放。隔离PostgreSQL及完整V1.3代码套件exit 0；见[到期释放审计](../../../evidence/audits/2026-10-09-v13-expiry-reservation-release-a01.md)和[套件日志](../../../evidence/audits/2026-10-09-v13-expiry-reservation-release-code-suite-a01.log)。这不覆盖错过窗口重评估或完整交易恢复。
- [x] 当前固定V1.3场景冻结为版本化双市场Fixture，含全成、拒单、接受响应丢失、重复/乱序回报、Session推进和精确预期；每次运行保存seed/TestRun ID。[Manifest与场景输入](../../../fixtures/v1/v1.3/manifest.json)、[完整21项隔离矩阵](../../../evidence/audits/2026-10-08-p3-v13-refresh-fix-matrix-enabled.log)。尚未覆盖的市场能力与故障竞态仍在下方记录。
- [x] V1.3-S2-L16固定US_EQUITY/AAPL 200股MANUAL乱序恢复子场景已冻结为Fixture v1.0.0，并通过seq2缓冲/10次重放、Trade重启、seq1因果排空、同Run CLI及双账本MATCH验证，完整记录见§8.91；24种子Fill/Fill/Cancel混合事件六排列及精确到达序列、PostgreSQL账本状态、幂等重放和冲突拒绝于§8.96通过；§8.97新增一个真实Web/API/CLI同Run的seq3取消先到缓冲、seq2 Fill后到恢复场景；§8.98新增seed 20261013/20261014两条独立浏览器Run，补充seq2先缓冲及两笔Fill后撤单两种到达顺序；§8.103/§8.104新增CN_A与US_EQUITY撤单拒绝后恢复/重试；§8.112验证拒绝seq3先到、缺失seq2 Fill随后排空及同单接受重试。仍有其他撤单/故障组合和市场边界待验证。
- [ ] 完成V1.1/V1.3交易写路径的服务端模式边界全量审计：Paper交易严格 PAPER + FAKE、LIVE/REAL fail-closed，页面不能直接改状态或余额；回测写路径须独立限定 BACKTEST + FAKE，不得把全平台误缩为仅PAPER。V1.3 Trade的13条受保护写路由现有六种客户端模式组合（PAPER/FAKE、LIVE/FAKE、PAPER/REAL、BACKTEST/FAKE、BACKTEST/REAL、LIVE/REAL）逐路由HTTP拒绝断言；隔离PostgreSQL确认无订单/成交/事件/outbox副作用，服务端派生BACKTEST/FAKE仍可进入历史执行（§8.105）。V1.1/API页面全链路无状态/余额旁路及发布/回退审计仍未完成，本父项保持未勾。
  [x] Decision Governance AUTO Mandate创建、激活、暂停以及Trade预算授权/结算HTTP写路由六种模式字段注入均422；Mandate/预算事实保持不变，随后合法状态转换仍成功，见§8.115。只关闭该服务端写边界子项。
  [x] Proposal审批/拒绝/修订及执行授权写路由六种模式注入均422且Proposal/授权事实不变；Historical Replay授权仅允许BACKTEST/FAKE，其余五种拒绝，合法授权签发/消费/轮换通过，见§8.116。
  Decision Governance service Bearer策略的21条已准入路由及各调用身份/方法拒绝组合现有操作级策略枚举测试，见§8.73；该单测不替代HTTP副作用、Paper/Backtest模式注入及其它服务写路由审计，父任务继续OPEN。
  V1.4 Quant内部日线回测写路由现通过直接HTTP/隔离PostgreSQL测试：六种Paper/Backtest/Live与Fake/Real注入均422，BacktestRun/Manifest保持0，详见V1.4 §8.116。该路由子项通过不关闭本父项。
  Trade Execution的13条V1受保护写路由现逐条覆盖错误服务身份、无身份/Bearer及正确服务名配错误Bearer，隔离HTTP/PG均403且FakeBroker业务事实为0，见§8.83/A25；合法请求响应、其他服务路由和发布回退矩阵仍开放。
- [x] Portfolio Risk对Platform API、Trade Execution、Historical Replay三种caller要求不同的强Bearer，避免伪造caller ID配合同一密钥跨身份；请求与ready配置校验、Compose必填及V1.1/V1.3代码套件验证见V1.1 §8.30。
- [x] Portfolio Risk七条准入路由对Platform、Trade、Replay与test-harness四caller进行28次隔离HTTP拒绝探测；错误Bearer 401、越权身份403，六类事实计数不变。策略单测与V1.1/V1.3完整代码套件通过，详见§8.76/A18。
- [x] Decision Governance启动时强制要求Platform API、Trade Execution、Historical Replay三份独立强Bearer；缺失Platform token的配置回归及服务单测见§8.74。此项不关闭完整服务身份/模式边界及发布审计。
- [x] Platform V1.3 Proposal创建HTTP入口拒绝`LIVE/FAKE`、`PAPER/REAL`、`LIVE/REAL`三种模式注入（422）；随后以同一idempotencyKey提交合法`PAPER/FAKE`得到201，账户现金/持仓/ledger版本与请求前一致，FakeBroker orders/fills为0。完整22项隔离Web/API/CLI矩阵包含该场景通过，完整V1.3代码套件通过；见第8.30节。此为单一Platform接受边界，不关闭全量服务/Worker/页面模式审计父项。
- [x] Platform Proposal和AUTO Mandate创建均仅接受声明的客户端字段；未知`clientApproved`字段返回422，匿名请求身份拒绝优先，随后合法创建成功。完整V1.3隔离E2E 22/22及code suite exit 0，分别见§8.53/§8.54。只关闭两个创建入口的字段白名单子项。
- [x] Platform→Decision Governance Proposal生成客户端的create/read/approve/reject/revise传输合同均有直接测试，见§8.70；Proposal业务流程父项和全调用发布矩阵仍开放。
- [x] Platform→Trade Execution V1.3生成客户端的9项实际操作（MANUAL/sequenced/AUTO、Fill report、cancel/result、order/assets read、fee correction）逐项合同测试通过；父级出站调用/发布矩阵仍开放。
- [x] Platform/Trade→Governance AUTO Mandate生成客户端操作合同覆盖创建、读取、预算读取、激活、暂停、订单授权及预算结算；身份/范围头、body、encoded paths和timeout均已验证，见§8.72。此项不代表完整V1调用矩阵完成。
- [x] Platform Proposal修订与审批也拒绝未声明字段；E2E确认Proposal状态、版本和内容Hash不变，随后合法流程继续通过，详见§8.55。只关闭这两条HTTP命令的字段白名单子项。
- [x] V1.3 Trade Execution manual、sequenced-manual、AUTO提案执行三条HTTP路由均拒绝附加`environmentMode=LIVE`/`brokerMode=REAL`（422），隔离PostgreSQL确认订单/成交/事件/outbox均为0；完整V1.3代码套件exit 0，见[套件日志](../../../evidence/audits/2026-10-09-v13-route-mode-injection-code-suite-a01.log)及[SHA-256](../../../evidence/audits/2026-10-09-v13-route-mode-injection-code-suite-a01.log.sha256)。这只关闭上述三条路由的注入测试，不代表全量模式边界审计完成。
- [x] Trade Execution 13个HTTP写路由均以错误服务身份请求并返回403；隔离PostgreSQL确认无订单/成交/事件/outbox副作用。包含V1.3三条提案执行模式注入断言；改后完整V1.3代码套件exit 0，见[套件日志](../../../evidence/audits/2026-10-09-v13-trade-route-scope-code-suite-a02.log)及[SHA-256](../../../evidence/audits/2026-10-09-v13-trade-route-scope-code-suite-a02.log.sha256)。Platform/Governance/Replay/Worker写路由、BACKTEST业务操作和UI篡改仍待核验。
- [x] Trade Outbox补偿HTTP入口拒绝非空body；隔离HTTP+PostgreSQL证明LIVE/REAL注入422且Outbox状态、尝试次数和错误事实不变，合法空body保留原重试行为。证据及V1.3/V1.5兼容E2E见第8.42节；该路由原子项通过不代表全写路径审计完成。
- [x] Governance Proposal 内部HTTP边界拒绝`environmentMode=LIVE`/`brokerMode=REAL`（422且不调用Proposal仓储）；完整V1.3 code suite的Governance API单测通过，日志见[最终代码套件](../../../evidence/audits/2026-10-08-p3-v13-final-code-suite-after-security-guard.log)。此勾选仅对应该治理接受边界；PAPER/FAKE全服务安全任务仍保持未勾。
- [x] Governance真实Proposal执行授权签发与验证HTTP/PostgreSQL路由均拒绝`LIVE/FAKE`、`PAPER/REAL`、`LIVE/REAL`额外模式字段（422）；验证尝试没有消费有效授权，最终合法并发验证仍为单次`CONSUMED`加幂等`REPLAYED`。完整V1.3代码套件exit 0，见第8.32节；仅关闭这两条Governance路由的模式注入子项，不关闭全服务模式审计或Trade→FakeBroker/Portfolio接受链。
- [x] Platform API账户初始化、AUTO Mandate创建及MANUAL、sequenced-MANUAL、AUTO三条执行入口明确拒绝客户端提供`environmentMode`/`brokerMode`；隔离Web/API场景对三种非法模式组合逐路由验证422，账户/Proposal/状态未意外创建、订单/Fill为0且账本不变。改后完整V1.3代码套件及Web/API/CLI 22/22通过，见第8.33节；仅关闭这些Platform入口子项，不关闭V1.1/V1.3全部模式/写路由父项。
- [x] Platform AUTO Mandate激活与暂停HTTP入口也拒绝客户端提供三种非法模式组合（每条均422）；合法激活/暂停可继续，拒绝前后状态保持PENDING/ACTIVE，账户账本不变且无FakeBroker订单/成交。隔离Web/API/CLI矩阵22/22通过，TestRun与请求级结果见§8.48；此子项不关闭V1.1/V1.3全路由模式边界父项。
- [x] Platform Proposal修订/审批与Session推进入口拒绝三种非法模式组合；拒绝后Proposal状态/版本/hash和Run Clock均不变。合法模式由服务端从已验证账户派生为`PAPER/FAKE`；完整Web/API/CLI E2E及code suite通过，见§8.49。此子项不关闭V1全路由模式边界父项。
- [x] V1.3 Platform账户、Proposal、Mandate及执行写入口拒绝客户端直接注入`status`、`cash`、`balance`、`positions`、`ledger`、`ledgerVersion`、`orders`、`fills`等服务端业务事实，非法字段在业务状态读取/写入前返回422；隔离E2E验证状态/账本不变和零FakeBroker副作用，见§8.50。该子项不关闭V1.1/V1.3全路由及Worker审计。
- [x] V1.3 L08部分成交撤单入口对请求体严格限定`cancelSequence`；Web/API E2E混入客户端status/cash/ledgerVersion返回422，拒绝后订单、Fill、FakeBroker现金及对账不变，后续合法撤单仍完成并由同Run CLI核对（见§8.52）。此增量不关闭完整P3路由/Worker矩阵。
- [x] Platform V1.3 Proposal创建HTTP入口仅接受定义的客户端字段；未知字段返回422，匿名请求仍先返回401，随后合法Proposal仍可创建。完整隔离Web/API/CLI回归见§8.53；只关闭Proposal创建入口的未知字段校验原子项。
- [x] Platform与Trade生成V1.3 AUTO Mandate客户端共7项操作有直接契约测试（Platform 5项、Trade 2项），覆盖路由/方法/载荷、ServiceBearer身份与范围、超时及非法版本本地拒绝；定向测试和完整V1.3 code suite exit 0，见§8.65。此项不替代下游HTTP/PG及全路由矩阵。
- [x] Governance历史回测授权端点逐项拒绝`LIVE/FAKE`、`PAPER/REAL`、`LIVE/REAL`模式注入；HTTP+隔离PostgreSQL返回422且授权记录数不变，合法`BACKTEST/FAKE`随后正常授权并单次消费。单测及完整V1.3 code suite通过，见§8.47。此原子项通过不代表V1.1/V1.3全路由模式矩阵完成。

2026-10-09 Portfolio真实HTTP模式回归：隔离PostgreSQL smoke从实际服务端点创建`PAPER/FAKE`与`BACKTEST/FAKE`账户并读回持久化模式；`LIVE/FAKE`、`PAPER/REAL`、`LIVE/REAL`均403且无账户副作用。完整结果见[HTTP smoke日志](../../../evidence/audits/2026-10-09-v11-backtest-account-http-a01.log)及[SHA-256](../../../evidence/audits/2026-10-09-v11-backtest-account-http-a01.log.sha256)。扩展smoke后的V1.1、V1.3完整代码套件均exit 0（[V1.1](../../../evidence/audits/2026-10-09-v11-mode-policy-code-suite-a04.log)、[V1.3](../../../evidence/audits/2026-10-09-v13-mode-policy-code-suite-a03.log)）；V1.1/V1.3全路由接受路径审计、Worker模式边界和Web状态/余额篡改检查仍待完成，本项继续未勾。

2026-10-09 V1.1/V1.3共享模式策略修复验证：Portfolio Risk `isSimulationModeAllowed`新增精确测试，合法`PAPER + FAKE`和`BACKTEST + FAKE`均允许；`LIVE`、`REAL`、`liveTradingEnabled=true`及缺失模式均拒绝。Portfolio单测6/6、typecheck通过，完整V1.1 code suite与完整V1.3 code suite均退出0（[V1.1日志](../../../evidence/audits/2026-10-09-v11-mode-policy-code-suite-a03.log)，[V1.1 SHA-256](../../../evidence/audits/2026-10-09-v11-mode-policy-code-suite-a03.log.sha256)，[V1.3日志](../../../evidence/audits/2026-10-09-v13-mode-policy-code-suite-a02.log)，[V1.3 SHA-256](../../../evidence/audits/2026-10-09-v13-mode-policy-code-suite-a02.log.sha256)）。代码套件不代替V1.1/V1.3全量HTTP/Worker模式路由和无副作用审计；全量任务继续未勾选。

2026-10-09服务端模式边界回归复验：Decision Governance、Trade Execution、Portfolio Risk当前单测依次通过41/41、90/90、5/5；Trade套件另含隔离PostgreSQL目标边界5/5。完整输出与SHA-256见[复验日志](../../../evidence/audits/2026-10-09-v13-server-mode-boundary-a01.log)及[Hash](../../../evidence/audits/2026-10-09-v13-server-mode-boundary-a01.log.sha256)。此证据复验现有单测，不替代逐HTTP/Worker入口、所有执行模式和页面不可直接写事实的完整矩阵；V1.1/V1.3全量模式审计继续未完成，故上项不勾选。

2026-10-09多腿预算与拒绝边界补测：Governance Mandate单测核实多腿逐项检查securityScope、累计每腿notional/fee，并分别拒绝单笔上限与累计预算超限；Trade AUTO和MANUAL编排在预算/Portfolio预留、执行授权与FakeBroker下单前拒绝多腿Proposal，固定手工订单构造器也拒绝多腿形状。证据见[机器摘要](../../../evidence/audits/2026-10-09-v13-per-leg-authorization-a07.json)。该实现仍仅执行锁定的单腿Fixture，不支持多腿Paper执行、SELL所得资金供后续BUY的中间净额/结算路径；故第2节首项维持未勾选，不能据此宣称多腿支持或关闭P3。

2026-10-08 服务端模式边界增量：Portfolio真实HTTP+PostgreSQL smoke现分别提交LIVE/FAKE、PAPER/REAL、LIVE/REAL，均返回403且账户数保持0；Trade V1.3手工执行HTTP端点拒绝附加`LIVE`/`REAL`模式字段（422、FakeBroker订单数0）；Governance Proposal API对同三种非法组合返回422且创建仓储总调用仍仅来自之前合法请求。完整V1.3 code suite exit 0，原始日志见[Paper/Fake服务端边界代码套件](../../../evidence/audits/2026-10-08-p3-paper-fake-server-boundary-code-suite.log)，SHA-256 `445546fc0ef4b94d0b6c2c30ad5f54a53d7ffe2be5b7ecd89cb40096c0698e68`。这组检查证明三个关键外部接受边界的拒绝与无副作用，不穷尽每个服务/路由，故上项仍未勾；历史回测的合法`BACKTEST + FAKE`授权也须与Paper范围分别审计。

2026-10-07当前工程增量：上述历史段落记录其生成时的能力边界。此后已新增PostgreSQL Proposal/审批/追加修订、基于会话actor的Platform API、执行前Portfolio当前资源重评、受限的CN/US固定Fixture订单链、FakeBroker独立资产/Fill Outbox、Web正式操作和同Run CLI读取。AUTO_POLICY新增Mandate整数分规则、PostgreSQL持久化/并发预算预留、Governance HTTP/OpenAPI、Platform受TestRun/owner约束的创建/精确版本激活/暂停代理，以及Trade→Portfolio→FakeBroker→Outbox执行路径和正式Web操作。当前隔离Web/API/CLI矩阵已扩展至21/21，覆盖CN/US正常链、Proposal修订/拒绝、AUTO正常/HOLD/预算上限/暂停/过期/证券范围拒绝、跨币种/现金不足拒绝、CN同日卖出拒绝、UNKNOWN固定故障恢复、Trade进程重启恢复、L09外部模拟订单差异、L10撤销会话、L07因果成交、缓冲成交与撤单待确认跨Trade重启恢复、L08部分成交/撤单/费用更正及投递失败恢复。PostgreSQL smoke覆盖Mandate过期且不产生预算记录。T+1证据使用Fixture开市日2026-09-28；持久Session推进和次日SELL闭环见[审计](../../../evidence/audits/2026-10-07-v13-tplus1-session-advance.md)。L10随机会话令牌摘要持久化，logout后立即撤销，Platform重启后旧Token仍401，见[会话失效审计](../../../evidence/audits/2026-10-07-v13-session-invalidation.md)。L08已覆盖撤单余量释放、费用更正幂等和一次性Portfolio投递失败后的持久Outbox重试，见[部分成交/撤单审计](../../../evidence/audits/2026-10-07-v13-l08-partial-fill-cancel.md)。L07固定撤单待确认重启时保留HELD预留、seq=3接受撤单后才释放余量，见[跨重启审计](../../../evidence/audits/2026-10-07-v13-l07-cancel-restart-recovery.md)。当前仍未完成的范围包括其他撤单竞态/故障边界、完整双市场规则覆盖、手册交接及本轮人工验收。L07缓冲事件跨Trade重启的单场景与全矩阵回归见[L07成交恢复审计](../../../evidence/audits/2026-10-07-v13-l07-restart-recovery.md)。自动Web/CLI矩阵的TestRun摘要保持WAITING/NOT_RUN；业务断言来自同Run只读检查，不能据此推定人工验收。第2节整体任务、第7节工程交付和新范围人工验收保持未完成。

实现边界核对（2026-10-06）：此前`V13TradingEngine`曾在Platform内构造账户、订单、Fill、风控拒绝和恢复结果，但没有调用Governance、Trade Execution、Portfolio或FakeBroker；该实现已纠正为`WAITING`/`NOT_RUN`，不再生成业务事实。第2节五项保持未勾选；既有历史人工签署保留，但本轮扩展后的签署仍NOT_RUN。隔离页面与持久TestRun表面E2E见[初次审计](../../../evidence/audits/2026-10-06-w1-v13-synthetic-web-e2e.md)及[边界修正审计](../../../evidence/audits/2026-10-06-w1-v13-waiting-boundary.md)。

V1.3当前WAITING API契约（2026-10-06）：固定场景/seed请求、202接受结果、owner-scoped读取和严格`NOT_RUN`证据形态已登记为独立Schema/OpenAPI；请求在Platform保存TestRun前执行边界校验。此契约冻结的是未执行状态，不是业务交易契约，也不满足本节真实服务工作流验收。见[契约纵切审计](../../../evidence/audits/2026-10-06-w1-v13-contract-boundary.md)。

V1.3人工审批域规则增量（2026-10-06）：治理服务新增纯领域`decideManualProposal`判定，对待审批状态、proposal版本与内容Hash、有效期、PAPER/FAKE模式、HOLD空腿及明确actor/reason执行fail-closed校验；时间由调用方传入，不读取系统时钟。治理服务完整单测7文件/31项、typecheck通过。当前函数只返回审批判定，不持久化Proposal/审批记录，不提供人工API，不执行风险复核、Mandate或短期执行授权，也不调用Trade Execution/FakeBroker；不得据此勾选第2节或声称V1.3人工审批流程验收完成。实现：[manual-proposal-decision.ts](../../../services/decision-governance-service/src/domain/manual-proposal-decision.ts)，测试：[manual-proposal-decision.spec.ts](../../../services/decision-governance-service/tests/unit/manual-proposal-decision.spec.ts)，[执行审计](../../../evidence/audits/2026-10-06-w1-v13-manual-approval-domain.md)，[历史执行快照Hash清单](../../../evidence/audits/2026-10-06-w1-v13-manual-approval-domain.sha256)。

2026-10-07治理持久化增量：Governance新增首版Proposal PostgreSQL仓储与迁移，内容Hash/同Run幂等键、不可变版本快照、owner范围读取、可信Platform服务身份发起的人工批准/拒绝记录；决策再次核对expectedVersion/contentHash/过期时间/PAPER+FAKE/HOLD空腿。Governance单测32/32、typecheck/build通过；隔离PostgreSQL smoke实测新增/相同载荷重放/改载荷冲突/owner隔离/旧版本冲突/批准持久回读均PASS，临时容器网络已删除并核验。当前还没有Web和Platform V1.3提案/决策代理、版本修订命令、审批后Portfolio风险与资源复核、执行授权、Trade/FakeBroker订单和成交链，因此第2/7节保持未完成，任何审批也不产生订单。实现及测试：[postgres-proposal-repository.ts](../../../services/decision-governance-service/src/adapters/postgres-proposal-repository.ts)、[proposal-repository.ts](../../../services/decision-governance-service/src/ports/proposal-repository.ts)、[proposal-postgres-smoke.mjs](../../../services/decision-governance-service/scripts/proposal-postgres-smoke.mjs)；[本轮增量审计](../../../evidence/audits/2026-10-07-v13-proposal-persistence.md)。

2026-10-07治理/组合Web子闭环增量：上段保留为第一代码切片快照；其后新增Proposal/决定合同及Governance OpenAPI/生成Platform客户端，接入会话绑定的V1.3账户和Proposal路由、浏览器批准/拒绝/旧版本冲突及刷新恢复、同Run/Proposal CLI核验；V1.3随机隔离Compose实际启动Platform/Portfolio/Governance/Trade/PG，normal/rejection/recovery三场景浏览器与CLI核验通过。详见[治理/组合Web子闭环审计](../../../evidence/audits/2026-10-07-v13-governance-web-loop.md)。尚未接风险复评、Mandate/预算、交易授权、FakeBroker订单/成交与账本，故第2/7节及历史人工签署范围保持未完成；Web批准仅记录治理决定。

2026-10-07持久Session推进及T+1 SELL增量：Platform新增TestRun范围的交易日历推进API和PostgreSQL事件日志，推进前检查账户与Run归属、CN_A/PAPER/FAKE、无待结订单/Fill/Outbox、无资源预留且独立FakeBroker资产与Portfolio完全匹配；使用锁版CN日历解析下一开市日，单调序号和幂等键保存Clock变更。Trade执行协调器允许已批准SELL经过T+1可卖量预留、Governance授权、FakeBroker资产账和Portfolio Fill Outbox。完整隔离V1.3 Web/API/CLI矩阵21/21通过；同日SELL零副作用拒绝，下一Session卖出100股后两账现金均为9990 CNY、持仓为0、差异为空；完整Code suite退出0。FakeBroker SELL原先按BUY变更独立现金/持仓并发出BUY Fill的缺陷已修复。详见[持久Session推进与T+1审计](../../../evidence/audits/2026-10-07-v13-tplus1-session-advance.md)。本轮新增Run人工验收仍NOT_RUN；全市场规则、手册及本阶段剩余交付不因此关闭。

2026-10-07 Platform提案协调应用服务切片：AUTO_POLICY命令、批准后的MANUAL命令、Proposal批准/拒绝及append-only修订的Owner/TestRun范围、稳定业务标识/版本Hash/reason与Run Clock协调已分拆到四个显式Ports应用服务，分别调用既有治理和交易客户端；服务不生成账本或FakeBroker事实。当前树V1.3 code suite exit 0（Platform 59文件/261项，Research Automation 218项，Quant Worker 14项），完整隔离Web/API/CLI矩阵21/21通过，含浏览器提案版本冲突、CN/US订单与同Run CLI。审计及代码快照见[治理协调应用服务审计](../../../evidence/audits/2026-10-07-v13-governance-coordination-after-revision.md)。这只覆盖上述四条入口；sequenced fill/cancel及部分业务事件协调仍位于HTTP控制器。第2/7节其余工程、全市场规则、第8节交接和新增范围用户签署继续开放。


2026-10-09新增完整代码回归：改后的V1.3完整套件纳入Governance/Replay/Quant服务身份与路由scope HTTP smoke，并再次通过（[日志](../../../evidence/audits/2026-10-09-v13-service-auth-code-suite-a01.log)）。有效Bearer权限越界在领域副作用前拒绝；这仅覆盖该smoke列明的路由，不能关闭所有服务和路由的模式边界父项、多腿执行、结算、完整规则/故障矩阵或当前人工验收。

2026-10-09 FakeBroker DAY到期释放增量：Trade `transition(EXPIRED)`现在在单一事务中写订单终态、事件及 owner/TestRun/account 绑定的预留释放Outbox；部分成交的Fill Outbox未确认前不释放，最后Fill确认时才创建释放事件。`UNKNOWN`不能被到期端点转换来释放资源，必须查询原单。兼容旧撤单证据引用。Trade单测91项、类型检查、隔离PostgreSQL持久化回归及改后的完整V1.3 code suite exit 0，详见[到期预留释放审计](../../../evidence/audits/2026-10-09-v13-expiry-reservation-release-a01.md)和[完整套件日志](../../../evidence/audits/2026-10-09-v13-expiry-reservation-release-code-suite-a01.log)。这是交易终态副作用切片；不代表错过窗口重评估、完整撤单/故障矩阵、P3父项或新增人工验收关闭。

- [x] 增量出站客户端合同：外部FakeBroker订单观察POST操作的请求体/身份/路径/超时和响应透传直接测试已通过，见§8.77；P3全接受路径仍开放。

- [x] 增量出站合同：Trade→Governance实际V1.3 Proposal读取/执行授权创建/授权校验三条操作已有逐字段直接测试，见§8.78；P3全接受路径和授权副作用矩阵父项仍开放。

- [x] 2026-10-13当前树核心Paper E2E 40/40：CN/US正常交易、严格现金、拒绝/撤单及UNKNOWN/重启恢复，独立账本MATCH，同Run CLI/export及隔离清理通过；见[V1主功能当前树复验](../../../evidence/audits/2026-10-13-v1-current-core-e2e-a01.md)。不代替用户验收。

## 3. 同步 Web 开发

正式页：V1.3已提供提案创建/修订/批准/拒绝、AUTO Mandate创建/人工激活/暂停、固定CN/US模拟执行、订单/成交与独立FakeBroker资产对账。可卖量展示、完整风险原因、完整故障时间线和L01-L10全部场景仍未齐备；验收中心需继续使用同一业务API并补齐失败/恢复场景，不得把当前部分页面描述为版本验收完成。

验收中心路径：`/acceptance/v1/v1.3`（目标路由）。场景参数提交到后端TestRun编排接口，后端调用业务API并汇集证据。浏览器不直接写领域数据，不自行判定成交。该阶段至少提供正常、拒绝/异常场景；适用时增加重试/恢复场景。

## 4. 人工验收步骤

1. 在合法Fixture中买100股、价10、测试费5，确认现金8995、持仓100股、成交与账本唯一关联。
2. 选择现金不足、A股当天不可卖、过期Mandate、第三批超限等场景，确认拒绝且无券商place副作用。
3. 启用AUTO_POLICY触发调仓，确认无需逐单批准；另测人工批准/拒绝/修改及旧版本冲突。
4. 触发接受响应丢失，确认进入UNKNOWN、保留占用，通过原clientOrderId查询恢复，无第二次place；重复10次Fill只入账一次。

每次保存testRunId、场景版本、代码/镜像、数据/规则版本、种子及注入事件序列、实际/预期、截图/Trace。判定依据必须是后端事实和独立检查，不能只看Toast成功提示。

## 5. 异常与替身边界

未确认撤单不释放在途风险；未知结果不能随机改为失败；模拟故障保持业务因果顺序，恶意非法回报另标协议测试。

## 6. 产物与验证

目标产物：decision-governance-service、trade-execution-service/Gateway、组合领域扩展、隔离FakeBroker、fixtures/broker-events、Web业务时间线。

自动验证：领域金额/状态机、真实DB并发占用和事务、真事件幂等、FakeBroker API契约、两市场人工/自动授权Web E2E。

需求/测试追踪：POR、GOV、EXE-01～08模拟部分、AUT-01～03、MEM-01、XMK基础；T22～31、T42～49；DV-03、VT03。

契约覆盖补充（2026-09-27）：已存在的历史回放 `POST /internal/v1/historical-orders/execute` 现有规范化命令/结果Schema、OpenAPI与兼容矩阵，生成TS/Python类型并由`pnpm contracts:check`校验；契约明确只允许`historical-replay-worker`身份及FakeBroker历史执行。Portfolio快照、Fill、预留/结算已有`portfolio-account.v1`契约。该增补弥补描述缺失，不代表服务新接线、Paper交易闭环或本阶段验收状态改变。

隔离 Web/API/CLI 同 Run 表面测试（2026-10-06）：最初在随机 Compose 项目/端口/数据库密码下运行 normal、rejection、recovery 三场景并通过了页面与同Run查询；随后审查确认该成功来自平台合成证据，已修正为明确`WAITING`/`NOT_RUN`，删除合成订单/成交/现金“事实”，CLI `--check-only`按未完成预期退出2，页面明确不会创建业务记录。当前`pnpm test:e2e:v13-isolated`只证明页面边界、持久化和CLI同Run读回，不能替代真实业务闭环。初始成功审计与修正后的验证记录分别保留，不覆盖历史日志。见[合成运行审计](../../../evidence/audits/2026-10-06-w1-v13-synthetic-web-e2e.md)、[初始浏览器日志](../../../evidence/audits/2026-10-06-w1-v13-synthetic-web-e2e.log)、[修正后边界验证审计](../../../evidence/audits/2026-10-06-w1-v13-waiting-boundary.md)、[修正后日志](../../../evidence/audits/2026-10-06-w1-v13-waiting-boundary.log)及[边界修正执行SHA-256清单（历史执行快照）](../../../evidence/audits/2026-10-06-w1-v13-waiting-boundary.sha256)。[契约纵切清单（历史执行快照）](../../../evidence/audits/2026-10-06-w1-v13-contract-boundary.sha256)是生成时的历史源码快照；生成合同变更后的当前V1.2共享输入Hash另见[2026-10-06 P2历史执行快照Hash清单](../../../evidence/audits/2026-10-06-v1-p2-current-source.sha256)；此清单仅覆盖当时V1.2修改，不更新V1.3旧执行快照；新增版本4的当前源码Hash见V1.2阶段文件。当前V1.3代码边界由[最新W1代码审计](../../../evidence/audits/2026-10-06-w1-v13-manual-approval-domain.md)及其[人工审批域历史执行快照Hash清单](../../../evidence/audits/2026-10-06-w1-v13-manual-approval-domain.sha256)覆盖。

退出条件：开发任务完成、Web真实可操作、全部适用检查PASS、人工签署、已知限制写入证据。填写[本版验收表](./99-acceptance.md)，未完成项不得勾选通过。

## 7. 阶段交付待办（完成后勾选）

当前交付清单按2026-10-13已批准的主要功能范围核实；PASS仅覆盖本轮范围。固定Fixture之外的全市场规则/故障穷举、活动发布回退和Ubuntu实机延期。下方早期增量说明中的“未完成/待验收”是对应日期历史，当前结论以上方状态及本节2026-10-14确认记录为准。

以下勾选只记录本阶段交付进度，不能代替第2节逐项开发任务或版本验收结论。开发者凭实现/实测证据勾选开发项；“人工验收”仅在用户实际确认后勾选，不预填PASS。

- [x] 当前V1.3契约、锁版Fixture、场景与精确预期已冻结并通过Schema/SHA校验；见[当前Fixture与交接审计](../../../evidence/audits/2026-10-08-p3-v13-fixture-and-handoff.md)。
- [x] OD-014 schema v3变更后的双市场PAPER/FAKE Web/API/CLI兼容回归38/38通过，详细范围、运行日志及人工验收限制见§8.109。
- [x] 增量命令契约：`seed:paper`与`verify:paper`已实现并通过当前V1.3完整code suite及22/22隔离E2E；边界与证据见§8.45。阶段其余工程交付和人工验收仍开放。
- [x] AUTO Mandate预算验收子项：Platform独立读回Governance预算终态，Web结果与刷新后页面均显示预算快照；完整V1.3 E2E 22/22及新增owner/TestRun预算路由身份矩阵27/27通过，证据见§8.46。V1.3阶段整体仍未完成。
- [x] Governance历史回测授权模式拒绝子项：三种LIVE/REAL注入返回422、PostgreSQL授权数不变，合法BACKTEST/FAKE保持可用；完整V1.3代码套件exit 0，见§8.47。全路由边界父任务仍未关闭。
- [x] Platform AUTO Mandate激活/暂停接口模式注入拒绝子项：六种请求均422、拒绝后状态不变、随后合法转换成功且账本/订单/Fill无副作用；完整V1.3 E2E 22/22通过，证据见§8.48。P3全路由审计父任务与当前范围人工验收仍开放。
- [x] Platform Proposal修订/审批与Session推进模式注入拒绝子项：9次请求均422、Proposal状态/版本/hash与Run Clock未变；合法Proposal请求由服务端派生PAPER/FAKE。完整V1.3 E2E 22/22和code suite exit 0，见§8.49。P3父任务及人工验收仍开放。
- [x] V1.3 Platform写入口服务端业务事实保护及零副作用证据完成，见§8.50；全V1接受路径审计和当前范围人工验收仍开放。
- [x] L08部分成交撤单客户端事实注入拒绝及完整Web/API/CLI回归通过，详见§8.52；P3全接受路径审计和当前人工验收仍开放。
- [x] Trade→Portfolio Fill费用更正生成客户端合同断言已加入；正式fee-correction route、路径编码、Trade身份/Bearer及确切载荷通过V1.3完整code suite验证，见§8.69。仅关闭此客户端调用子项。
- [x] Platform→Governance Proposal生成客户端create/read/approve/reject/revise操作合同与身份范围直测通过；V1.3完整code suite及证据见§8.70。此为单个出站调用边子项。
- [x] Platform→Trade的9项实际V1.3生成客户端操作合同逐项测试通过；完整套件和范围限制见§8.71。
- [x] Platform/Trade AUTO Mandate生成客户端操作合同测试通过；完整V1.3 suite证据与剩余边界见§8.72。
- [x] V1.3 Proposal创建未知字段拒绝、匿名401优先及合法请求回归通过；完整E2E 22/22和code suite exit 0，详见§8.53；P3全路由审计和人工验收仍开放。
- [x] V1.3 AUTO Mandate创建未知字段拒绝及PAPER/FAKE合法字段集回归通过；完整E2E 22/22和code suite exit 0，详见§8.54；P3全路由审计和人工验收仍开放。
- [x] Decision Governance AUTO Mandate服务端写路由六模式HTTP+PostgreSQL拒绝矩阵通过；创建/激活/暂停和预算授权/结算的零副作用及合法继续路径见§8.115。P3父任务仍OPEN。
- [x] Decision Governance Proposal与Historical Replay授权服务端六模式HTTP+PostgreSQL矩阵通过，见§8.116；仅关闭对应模式字段子项，不关闭其它V1服务与Web写路径。
- [x] V1.3 Proposal修订和审批未知字段拒绝、状态/版本/hash无副作用回归通过；完整E2E 22/22和code suite exit 0，详见§8.55；P3全路由审计和人工验收仍开放。
- [x] Platform Proposal修订/审批、AUTO Mandate创建/激活/暂停未知字段拒绝及合法状态转换回归通过；完整E2E 22/22和code suite exit 0，详见§8.56。P3全路由矩阵仍开放。
- [x] CN_A固定Fixture MANUAL BUY/BUY两腿批次子项通过完整V1.3 E2E 23/23和code suite；TestRun、订单/Fill、同Run CLI、浏览器刷新与资源清理证据见§8.57。仅关闭此固定BUY/BUY执行子项，不代表第2节治理/执行父项或V1.3阶段关闭。
- [x] US_EQUITY固定Fixture MANUAL BUY/BUY两腿子项通过完整V1.3 E2E 24/24；逐笔订单/Fill、USD现金、同Run CLI、刷新恢复及隔离资源清理见§8.57。仅关闭此固定市场子项，不代表全市场规则或阶段关闭。
- [x] 多腿Trade进程重启恢复子项：首腿提交后重启Trade，再以原批次clientOrderId重试，恢复两笔订单/Fill并核对MATCH；定向E2E与完整25/25 E2E证据见§8.58。仅关闭该固定恢复子项。
- [x] 多腿现金不足拒绝子项：现金耗尽后的MANUAL多腿跨服务提交返回409，订单404且Portfolio/对账事实未变、同Run CLI通过；定向E2E证据见§8.59。首腿已预留后次腿失败的释放路径仍只有Trade单测证据。
- [x] 固定CN_A AUTO_POLICY BUY/BUY：单个Mandate预算覆盖两腿，Governance消费一次CNY 2210.00，Portfolio逐腿预留，FakeBroker两子订单/Fill，期末现金7790.0000，刷新后Web及同Run CLI仍核对MATCH；完整V1.3 26/26 E2E与code suite exit 0，见§8.60。SELL和其他市场AUTO多腿仍开放。
- [x] 固定US_EQUITY AUTO_POLICY BUY/BUY：单个Mandate预算消费USD 450.10、Portfolio逐腿预留、FakeBroker两子订单/Fill，期末现金9549.9000及AAPL/MSFT持仓、刷新恢复与同Run只读CLI断言通过；完整E2E 27/27及code suite exit 0，见§8.61。SELL和更广市场规则仍开放。
- [x] 增量交付：V1.3 Trade受保护写路由及历史执行入口六种客户端模式注入HTTP/PG拒绝矩阵通过，完整code suite exit 0（§8.105）；此子项不关闭L17父项、全版本页面/Worker/发布回退审计或人工验收。
- [x] 增量交付：Platform固定写路径六种客户端模式注入矩阵覆盖20个操作、120次请求，另将提案拒绝动作与批准动作分开覆盖；完整V1.3 E2E 38/38、code suite exit 0，账本与FakeBroker无副作用（§8.106–§8.108）；不关闭L17父项或阶段/版本人工验收。
- [x] 第2节当前主要功能范围完成，真实组件/Fixture边界明确；依据§8.80–8.81、§8.87、§8.91、§8.113–8.118。未勾选的广泛父项按本轮范围拆分，延期部分仍未通过。
- [x] OD-014 CN_A固定Paper T+1 SELL与结算后再次BUY子项：Trade Outbox持久化Settlement、FakeBroker与Portfolio独立应收、Run Clock结算和同TestRun的Web/API/CLI核对通过，见V1.4 §8.86及本阶段§8.80。US SELL、P3父项和当前扩展范围人工验收仍未完成。
- [x] 正式V1.3 Web页及21项正常/拒绝/恢复矩阵完成当前固定范围验证；完整API/浏览器日志见[本轮矩阵](../../../evidence/audits/2026-10-08-p3-v13-refresh-fix-matrix-enabled.log)。
- [x] 当前V1.3完整E2E扩展至22项，新增Platform Proposal模式注入拒绝与同Run CLI只读核对；[完整日志](../../../evidence/audits/2026-10-09-v13-platform-mode-full-e2e-a01.log)。该交付子项通过，阶段模式边界父项及人工验收仍开放。
- [x] Platform/Trade生成V1.3 AUTO Mandate客户端契约测试纳入当前代码树，完整V1.3 code suite exit 0；证据见§8.65。阶段整体仍未关闭。
- [x] Trade Outbox补偿路由请求体边界修复后的V1.3完整22项Web/API/CLI/export E2E已通过，兼容改动后的V1.5四场景E2E也通过；见第8.42节。仅记录回归子项，不改变阶段父项或人工验收。
- [x] FakeBroker确认到期的预留释放事务与部分Fill等待屏障通过隔离PostgreSQL测试；V1.3完整代码套件exit 0，证据见[到期释放审计](../../../evidence/audits/2026-10-09-v13-expiry-reservation-release-a01.md)。阶段其他交付及手工验收仍开放。
- [x] Mac ARM64隔离入口、实际随机URL/API端口、Fixture路径/SHA、环境变量名、页面按钮、超时与精确清理说明已补齐并实测。目标Ubuntu命令/镜像与主机资源明细仍未验证，见[交互栈审计](../../../evidence/audits/2026-10-08-p3-v13-fixture-and-handoff.md)。
- [x] 开发者已执行第8节当前Mac隔离准备、完整矩阵、同Run只读CLI、证据导出及手动栈启动/探活/精确停止；保存代码门禁、矩阵和生命周期日志。自动化不代替新范围人工验收。
- [x] 当前锁版矩阵重复/恢复路径和适用快速测试均验证；其余市场/故障组合与真实观察范围明确列为未覆盖，不把Fixture加速场景冒充实盘观察。
- [x] V1.3 L16 US AAPL乱序成交/Trade重启增量的定向及完整Web/API/CLI矩阵33/33、完整代码套件exit 0；同Run CLI、现金、持仓、预留、FakeBroker对账与精确资源清理结果见§8.91及本次日志。
- [x] 当前树完整V1.3隔离Web/API/CLI矩阵复跑36/36通过（新增§8.98的两个独立seed场景），真实券商/外部数据调用0，随机项目的容器、卷、网络精确清理通过；见§8.98。测试Run人工结论仍NOT_RUN，L16更广故障组合和阶段签收仍开放。
- [x] L16固定撤单拒绝恢复：CN_A与US_EQUITY/AAPL分别在同一Run经Web/API注入seq=3 REJECTED，订单恢复PARTIALLY_FILLED、预留保持HELD，同Run CLI `--check-only`核对未完成事实；再次对同一订单撤单并以seq=4接受后，最终CANCELLED且预留RELEASED。定向E2E各1/1、完整V1.3 E2E 38/38、完整code suite exit 0；详见§8.103/§8.104。本子项不关闭L16/P3或阶段验收，Run人工结论仍NOT_RUN。
- [x] L16撤单前置拒绝与乱序恢复：无成交、以及仅收到但尚未应用的seq=2 Fill时，Web/API撤单请求均返回409，订单事实/现金/持仓不变且Reservation仍HELD；随后seq=1到达并按序排空，撤单请求/seq=3接受成功，CN_A双账本MATCH、同Run CLI核验通过。定向E2E与完整当前V1.3 Web/API/CLI矩阵40/40、完整code suite均exit 0；见§8.113。首轮六个不符合业务前置的事件排列尝试和六份NOT_RUN诊断包保留，不视作订单事件排序失败。
- [x] 共享Trade执行逻辑变更后的V1.3完整回归：`pnpm verify:stage -- --stage V1.3 --suite code`受控执行exit 0，包含Trade/Portfolio/Governance隔离PostgreSQL迁移、真实HTTP授权/模式/账本检查及应用测试；临时数据库/网络清理通过，见§8.114。此项为代码兼容复验，不关闭P3全业务规则矩阵、Ubuntu或人工验收。
- [x] V1.4 Quant内部回测写路由模式注入拒绝子项已由真实服务/隔离PostgreSQL验证，六种组合均422且Run/Manifest无新增；详见V1.4 §8.116。此项不关闭L17全V1服务/Worker/Web矩阵。
- [x] 用户于2026-10-14在对话确认当前候选整版V1验收通过，覆盖本阶段本轮范围；候选SHA-256 `132535fbdf2bf1d50e4260e397424b3a47ef949dedcc62e58257c0a5697bd2d4`，阶段与代表Run关联见[验收表](./99-acceptance.md)。历史单Run人工结论不倒填。
- [x] 操作说明、限制和自动证据已更新；[本版验收表](./99-acceptance.md)已同步。第8节于2026-10-09在Mac ARM64隔离范围实际执行后更新为VERIFIED_EXECUTABLE；目标Ubuntu验证仍独立NOT_RUN。

- [x] 共享Schema兼容变更后的V1.3当前树Web/API/CLI隔离回归：`pnpm test:e2e -- --stage V1.3`，Playwright 27/27；每个固定场景均检查同Run CLI及结构化导出，真实来源/券商调用0，隔离资源精确清理。证据见§8.67。此回归不关闭全市场规则、OD-014、Ubuntu或人工验收。

- [x] 增量交付：外部FakeBroker订单观察生成客户端合同及完整V1.3代码回归证据已入档（§8.77）；不代表阶段人工验收或P3父项关闭。

- [x] 增量交付：Trade→Governance三操作客户端合同、完整V1.3代码回归及操作记录已完成（§8.78）；不代表阶段人工验收或P3父项通过。

- [x] OD-014固定US_EQUITY Paper SELL严格现金闭环：合成纽约会话、Run Clock初始化/推进、US应收待结算现金隔离、双账本结算、同Run CLI与证据导出通过，见§8.81；日历为有界合成输入，不主张交易所准确性。

- [x] Trade Execution V1写路由身份凭据拒绝子项：13条路由逐项验证缺身份、错误Bearer及越权caller拒绝，FakeBroker零副作用，见§8.83；不代表P1/A04全服务调用、授权正向合同或发布/回退矩阵关闭。

- [x] 2026-10-13当前树核心Paper E2E 40/40：CN/US正常交易、严格现金、拒绝/撤单及UNKNOWN/重启恢复，独立账本MATCH，同Run CLI/export及隔离清理通过；见[V1主功能当前树复验](../../../evidence/audits/2026-10-13-v1-current-core-e2e-a01.md)。不代替用户验收。

## 8. 阶段验收操作手册

### 8.0 当前隔离验收命令（2026-10-09当前树已复跑）

在项目根目录执行：

```bash
pnpm verify:stage -- --stage V1.3 --suite code
pnpm test:e2e -- --stage V1.3
```

第一条是完整代码门禁，第二条以随机隔离Platform/Portfolio/Governance/Trade/PostgreSQL/Web运行全部固定场景；E2E Harness仅在隔离项目内启用测试声明的一次性故障注入，生产配置不启用。当前树最新复验为36项Web/API/CLI/export E2E与完整代码套件，包含US AAPL乱序成交重启及L16多seed撤单到达路径；[完整矩阵](../../../evidence/audits/2026-10-12-v13-us-ordered-fill-full-e2e-a01.log)、[完整代码套件](../../../evidence/audits/2026-10-12-v13-us-ordered-fill-code-suite-a01.log)。历史21项日志与[手册入口/会话/清理日志](../../../evidence/audits/2026-10-09-v13-interactive-stack-lifecycle-a01.log)；结构化摘要及Hash见[本轮证据报告](../../../evidence/audits/2026-10-09-v13-current-worktree-evidence-a01.json)和[SHA-256](../../../evidence/audits/2026-10-09-v13-current-worktree-evidence-a01.json.sha256)。此前无Docker权限和镜像下载unexpected EOF失败均保留，矩阵Harness清理随机项目资源后才重试。通过自动门禁不代表本轮用户验收通过。

Web 验收入口使用 `pnpm stack:up -- --stage V1.3` 当次输出的 `webUrl`（页面路径 `/acceptance/v1/v1.3`），API 使用同次输出的 `platformApiUrl`；端口每次随机生成，不复用历史端口。首个 Web 请求建立本地 `acceptance-owner-1` session cookie。不要用伪造用户请求头代替会话；只把当前浏览器会话Cookie用于下方同Run只读CLI/导出，禁止打印或保存Cookie值。

### 8.1 当前可执行性与验收准备

手册状态：VERIFIED_EXECUTABLE（2026-10-14收口，限已实测的Mac本地主要功能操作；实际执行证据见§8.80–8.81、§8.87、§8.91、§8.113–8.118，当前候选整版人工验收已由用户确认）。启动时使用当次输出的动态URL和精确项目名；历史随机URL不能复用。固定Fixture之外的全市场规则/故障穷举、活动发布回退和Ubuntu实机延期。以前部分验证状态与原操作记录保留于[同步前快照](../../../evidence/audits/2026-10-14-v1-closeout-before-status-sync.json)及下方各次实测记录。

前置服务：容器化Platform API/Web、Market Data、Portfolio Risk、Decision Governance、Trade Execution、隔离PostgreSQL及本阶段固定Fixture。E2E不连接真实行情来源或券商；V1.3该运行路径不依赖NATS。

固定输入：基础双市场Fixture `v1.3-trading-loop` v1.0.0及专用US有序成交Fixture `v1.3-us-ordered-fills` v1.0.0；常规CN样例为现金10000、零持仓、买100股、RAW价格10、测试费5；§8.91 AAPL场景为现金USD 10000、买200股、价格USD 25、每个增量Fill费用USD 0.0250；seed=20260907。

| 开发交付时必须填写 | 当前值 |
|---|---|
| 实测代码Commit或工作区Hash/验证日期 | 当前检出HEAD由 `git rev-parse HEAD` 读取；工作区随代码修改，自动E2E逐Run导出Manifest Hash。Fixture SHA-256 `24d7494e5f4562561a387d176a76eae9134c9f6065bddf7eb69467c29ccc1770`，验证日期2026-10-08 |
| 项目根目录、Node/pnpm/Python/uv及Docker版本 | `/Users/huangbosong/Documents/ChatGPT/StockQuant`；Node v24.1.0，pnpm 10.34.5，Docker CLI 28.0.4；V1.3 Trade/Platform运行于锁版Compose容器。Mac主机Darwin/ARM64；目标Ubuntu环境版本与资源尚未验证 |
| Web基础URL/身份登录或会话建立方式 | 手动栈启动成功后终端输出随机 `http://127.0.0.1:<V13_WEB_HOST_PORT>`；容器Web正式页为其后缀 `/acceptance/v1/v1.3`。首个Web请求建立`acceptance-owner-1`本地会话Cookie；12小时过期，logout写入PostgreSQL撤销记录。仅限随机隔离项目，不是活动部署或生产认证证明 |
| 本阶段Web路由 | `/acceptance/v1/v1.3`，主机只绑定`127.0.0.1`的随机端口；不固定8080 |
| 正式页面的真实入口/跳转链接 | 页面标题“V1.3 治理、风控与模拟券商交易链路”；场景区“创建隔离 V1.3 TestRun”，账户区“初始化本 Run 模拟账户（10000）”，提案区含“创建MANUAL固定Fixture调仓提案”“创建固定双市场200股因果成交Fixture提案”“创建AUTO_POLICY固定调仓建议”，命令区/结果卡展示Proposal、订单、成交、Outbox与独立FakeBroker对账；按钮名与Playwright正式页断言一致 |
| Fixture文件/数据版本/确切日期/Hash、规则与成本版本 | 基础：`fixtures/v1/v1.3/manifest.json`，`v1.3-trading-loop` 1.0.0，场景SHA-256 `24d7494e5f4562561a387d176a76eae9134c9f6065bddf7eb69467c29ccc1770`；US乱序恢复：`fixtures/v1/v1.3-us-ordered-fills-v1.0.0/manifest.json`，`v1.3-us-ordered-fills` 1.0.0，场景SHA-256 `7c6c81a3f7c1f7286a55f853285414a5e240e2ca2c54013e29aa87cb81bd38c0`（完整语义见§8.91）。CN_A/CNY：10000.0000初始现金、600000.SH、100股×10.0000、费用5.0000，预期8995.0000/100股；US_EQUITY/USD：10000.0000、AAPL、10股×25.0000、费用0.0500，预期9749.9500/10股。T+1日历版本`sse-cn-a-share-2026-1`，9/28至9/29 Fixture Session；seed 20260907。所有订单/时段为合成值 |
| 配置文件及必需环境变量名/非秘密测试值 | `pnpm stack:up -- --stage V1.3`自动生成随机项目、回环端口、PostgreSQL SCRAM凭据和服务token；仅`.codex/isolated-stacks/<project>.env`以0600存储，不复制或提交秘密。`STOCKQUANT_V13_TEST_FEE_CORRECTION_FAILURE_ENABLED=true`仅用于完整E2E里L08一次性Portfolio Outbox失败注入；人工交互不启用该变量 |
| 外部故障目标及可执行命令、恢复/隔离清理入口 | 不请求外部行情、券商或网络故障目标。固定错误在隔离服务内注入：原单查询暂时不可用、Trade容器重启、乱序/重复Fill、L08一次性Outbox投递失败；完整命令见8.4。使用终端输出的精确`pnpm stack:down -- --project <isolatedProject>`停止，等待`MANUAL_STACK_CLEANUP_VERIFIED` |
| 预期耗时、轮询超时、实际观察期/预算 | API/Web启动探测各最多120次×250ms（30秒）；当前完整E2E矩阵33项，最近实测Playwright用时约2.3分钟，冷Docker构建另计且受镜像下载影响；单个同Run业务查询客户端超时5秒。此为加速Fixture测试，无市场实际观察窗口、模型调用或费用预算 |

### 8.2 初始化与启动（Mac ARM64隔离交互入口已执行；Ubuntu发布环境待验证）

在上表填写的项目根目录运行；工具版本按锁文件/项目说明准备。首次开发由开发者生成锁文件和脚本，验收者不负责补建环境。环境变量按上表配置；保持FAKE券商与模拟账户，真实模型仅在本阶段明确要求且预算已配置的场景调用。

```bash
# 在项目根目录确认锁定工具版本
pwd
node --version # v24.1.0
pnpm --version # 10.34.5
docker --version # Docker CLI 28.0.4
pnpm install --frozen-lockfile
pnpm stack:up -- --stage V1.3
```

已验证：V1.3 的 `pnpm stack:up -- --stage V1.3` 启动隔离容器化Web/API/Trade/Portfolio/Governance/Market Data/PostgreSQL，输出随机loopback Web/API URL、精确项目名、FakeBroker/Paper/LIVE关闭状态，并在前台等待精确停止信号。Web已由Compose容器提供，不再并行启动`pnpm dev:web`，避免误连另一个Platform API。

```bash
# 在浏览器打开前台输出中的精确webUrl，路径为 /acceptance/v1/v1.3；不要复用历史示例端口。
# 服务凭据在忽略目录随机生成，权限0600；brokerMode=FAKE，environmentMode=PAPER，LIVE关闭。
# 另开终端，从前台输出复制精确isolatedProject并粘贴到提示中：
read -r isolated_project
pnpm stack:down -- --project "$isolated_project"
```

停止命令通过该项目私有stop marker请求Harness清理，最多等待120秒后才对同一个精确项目执行Compose清理。前台应输出 `MANUAL_STACK_CLEANUP_VERIFIED`，容器、卷、网络和项目镜像均为0；不使用通配项目名，不清理其它项目卷。Ubuntu部署仍须补齐实际镜像拉取/启动/迁移命令，不能仅用Mac容器验证代替发布验证。

初始化在验收中心“准备隔离运行”完成；CLI场景入口也负责同样的准备，两者调用同一业务API。准备后记录testRunId、accountId、namespace及Fixture/DataVersion；初始化业务本身是测试对象时不得预先完成被测动作。缺源/凭证/历史数据时显示缺项，不静默换成Fake并报真实场景通过。

### 8.3 Web逐步操作及预期结果

1. 打开8.1记录的Web URL。页标题须为“V1.3 治理、风控与模拟券商交易链路”；Fixture标签须显示`v1.3-trading-loop · 1.0.0`。每个新场景点“创建隔离 V1.3 TestRun”，URL的`runId`即本次testRunId。
2. 在“隔离账户与治理提案”选择市场，点“初始化本 Run 模拟账户（10000）”。记录TestRun/account UUID；新业务场景必须新建Run，重复、重启或恢复操作必须沿用原Run与clientOrderId。
3. 按下表操作正式页面现有按钮。所有结果从Proposal、Mandate、订单/成交、独立FakeBroker和Portfolio明细读取，不以Run总状态或单个提示代替核对。

| 场景ID（阶段内唯一） | 场景 | 点击顺序/输入 | 预期结果与核对点 |
|---|---|---|---|
| normal | MANUAL/AUTO正常提案与双市场订单 | CN：选择normal→初始化账户→“创建MANUAL固定Fixture调仓提案”→“人工批准”→“执行人工批准的固定Fixture提案”。另开新Run选择US_EQUITY并重复。AUTO另新Run：点“创建AUTO_POLICY固定调仓建议”→“创建本Run固定AUTO_POLICY Mandate”→“人工激活精确Mandate版本”→“按活动Mandate执行AUTO_POLICY建议”。 | CN为100股×CNY 10、费用5，余额8995/持仓100；US为10股×USD 25、费用0.05，余额9749.95/持仓10；两个独立FakeBroker与Portfolio结果均MATCH。AUTO精确Mandate范围生效；HOLD需显示无订单且不消费次数。 |
| rejection | 提案拒绝、版本冲突与执行拒绝 | 新Run选rejection，初始化账户、创建MANUAL提案后点“人工拒绝”；另新Run选recovery创建提案后点“追加提案修订版本”，再用旧版本提交批准；用正式拒绝矩阵验证现金不足、跨币种/证券、暂停/过期Mandate、同日SELL和超次数。 | MANUAL状态为REJECTED_MANUAL；旧Proposal版本返回409且新版本仍待审批；每种拒绝原因明确，订单/现金/预留/预算无非法副作用。完整子场景以8.4固定矩阵和同Run事实核验。 |
| recovery | UNKNOWN、进程恢复、乱序/重复Fill与撤单 | 浏览器正常页面使用“创建固定双市场200股因果成交Fixture提案”“执行人工批准的固定Fixture提案”“发送seq2（累计150，先到）”“将同一seq2重放10次”“发送seq1（成交40股或累计100股）”；另Run用“创建L08 100股部分成交撤单Fixture提案”，执行后点“seq1部分成交后请求撤单并应用seq2成功结果”和手续费更正。注入UNKNOWN/查询故障和Trade重启用8.4自动矩阵。 | 原clientOrderId只产生一个订单；seq2先到保持缓冲，seq1后按序归约；重放不重复入账；撤单确认前余量Reservation保持HELD，成功后只释放未成交量；最终FakeBroker与Portfolio独立MATCH。 |

4. 从运行详情打开关联正式页面，执行一次刷新/关闭再打开；核对长任务后台状态、历史证据和加载/失败/陈旧提示。
5. 每项记录实际结果、截图与业务ID。异常场景“预期拒绝”被正确验证时断言可PASS，但被测业务操作仍显示拒绝；若意外接受则断言FAIL。

### 8.4 命令行复验与相同运行核对（Mac ARM64隔离环境已实测）

在项目根目录执行以下命令。隔离Web矩阵调用正式业务API、为每个浏览器场景分别导出TestRun证据、以相同UUID运行CLI只读检查并验证资源清理；当前V1.3矩阵33项包含§8.91 US乱序/重启路径。代码套件检查构建、Lint、类型、单测、合同、Fixture及隔离服务集成。两者均须独立执行；浏览器矩阵不能由单测替代。

```bash
pnpm verify:stage -- --stage V1.3 --suite code
echo "code suite exit=$?" # 完整代码门禁应为0
pnpm test:e2e -- --stage V1.3
echo "browser matrix exit=$?" # 33 passed、status=PASS、realBrokerCalls=0、exactProjectResourcesRemoved=true
```

独立的`pnpm verify:stage -- --stage V1.3 --scenario normal|rejection|recovery --seed 20260907`只登记WAITING/NOT_RUN阶段Run，不执行交易，当前应返回2；业务工作流由Web/E2E正式路径执行。V1.3 Web矩阵的每个场景已从同Run CLI进行只读核对，整体阶段门禁仍可保持WAITING。`--check-only`仅查事实，不能下单/重放成交；注入事件和原业务ID必须留档。零用例或跳过必需用例不能返回成功。

再对Web中已运行的同一testRunId执行只读核对，避免仅创建新样本掩盖页面问题：

```bash
# 粘贴Web运行详情中的实际testRunId，再按回车；这是普通ID，不是凭证
read -r acceptance_run_id # 从Web URL的runId读取，不是凭证
read -r platform_api_url # 从stack:up输出的platformApiUrl读取
read -rs session_cookie # 从本地浏览器开发者工具Cookies复制sq_session=...；不要回显或写入仓库
export STOCKQUANT_PLATFORM_API_URL="$platform_api_url"
export STOCKQUANT_SESSION_COOKIE="$session_cookie"
export STOCKQUANT_EVIDENCE_SESSION_COOKIE="$session_cookie"
pnpm verify:stage -- --stage V1.3 --run "$acceptance_run_id" --check-only
# 预期退出2/WAITING：阶段聚合断言未签署，但输出应含同一runId和已有Proposal/订单事实。
pnpm evidence:export -- --stage V1.3 --run "$acceptance_run_id"
```

check-only仅查询此运行后端事实并追加检查证据，不创建新订单、不重放成交或发起模型调用；空ID/错误stage/越权run必须拒绝。导出只含脱敏数据，输出实际目录和Manifest Hash，不自动勾选人工验收。端到端正常/异常/恢复运行产生不同ID，导出时分别保存。

本阶段代码测试覆盖要求：领域金额/状态机、真实DB并发占用和事务、真事件幂等、FakeBroker API契约、两市场人工/自动授权Web E2E。 在交付时把映射到的实际Domain/DB/契约/服务内测试命令补入本节，注明执行目录、测试文件或套件、退出码和报告；verify:stage必须展示实际调用的测试清单，不能空壳返回0。Python服务使用自身锁定环境，不串用其他服务虚拟环境。

### 8.5 交叉核对、失败定位与恢复

交叉核对：proposal/batch/clientOrderId/fillId关联；独立FakeBroker资产、组合账本与Web资金/持仓相等，费用合计5。

先检查Web与CLI的testRunId、输入/策略/代码版本和模式是否一致，再按Trace查平台、领域、适配器与持久化证据。页面错误而CLI正确，记录Web失败；二者都错则保留领域断言失败。缺能力先查健康/迁移/数据与日志，不修改余额或订单状态使断言通过。

独立复跑创建新run；测试幂等/检查点/重启恢复则使用原run和原幂等键。故障发生后保留旧证据，修复后新增运行或检查记录；不得清空账本、随机更换seed直到通过。真实观察窗口、来源验证和实际模型调用与加速/录制测试分别记录。

### 8.6 验收记录与收尾

| 场景/检查 | Web实际结果与截图 | 命令/退出码/报告 | testRunId/业务ID | 结论 |
|---|---|---|---|---|
| 当前人工验收Web入口 | READY，页面已在Codex侧栏排队打开；`http://127.0.0.1:51872/acceptance/v1/v1.3`；PAPER/FAKE，LIVE写入关闭 | 启动：`pnpm stack:up -- --stage V1.3`；停止：`pnpm stack:down -- --project sq-v13-web-4134cd7ffc3ac7c032be`；[启动日志](../../../evidence/audits/2026-10-08-p3-v13-user-review-stack.log) | 随机隔离项目`sq-v13-web-4134cd7ffc3ac7c032be` | 等待本轮用户实际检查；NOT_RUN |
| normal | PASS（固定CN/US MANUAL与AUTO业务断言；刷新后订单、Fill、费用、现金和MATCH均恢复；21项截图/Trace已归档） | `pnpm test:e2e -- --stage V1.3`，21/21 | 当前Run与文件清单见[本轮机器证据](../../../evidence/audits/2026-10-09-v13-current-worktree-evidence-a01.json)；三基本Run：normal `9c61f86c-f899-463e-9358-e24b2a5ae776`、rejection `c5ac13a1-aa6f-4f3d-bf5f-52ab4beabdef`、recovery `87b6c96e-e45a-4423-a9f9-9279aa008d6e`；每项同Run CLI/export见[E2E日志](../../../evidence/audits/2026-10-09-v13-current-tree-e2e-a02.log)及`evidence/local/V1.3/<testRunId>/` | PASS（模拟范围） |
| rejection（含固定拒绝子场景） | PASS（版本冲突、现金不足、同日SELL、Mandate/市场范围等零副作用） | 同上；21项完整矩阵退出0 | 同一矩阵日志含业务ID、订单/账本断言和同Run核对 | PASS（固定Fixture范围；未覆盖完整交易所规则） |
| recovery（固定注入与重启） | PASS（UNKNOWN原单查询、Trade重启、乱序/重复Fill、撤单/更正Outbox重试、T+1） | 同上；21项完整矩阵退出0 | 同一矩阵日志记录实际注入顺序、原Run与业务身份；截图/Trace Hash清单已生成 | PASS（固定路径范围；锁版序列之外的故障边界未覆盖） |
| Web同run只读核对与证据导出 | PASS（21个浏览器Run均同Run CLI检查并导出结构化证据） | E2E内部实际运行`verify-stage --run RUN_ID --check-only`及`evidence-export --stage V1.3 --run RUN_ID` | 见[矩阵日志](../../../evidence/audits/2026-10-08-p3-v13-refresh-fix-matrix-enabled.log)；逐Run evidence路径/Hash在日志和`evidence/local/V1.3/` | PASS（每个固定TestRun） |
| 本阶段代码测试/实际观察适用项 | PASS（完整V1.3 code suite：构建、类型、文档/合同/Fixture、隔离PG与服务集成） | `pnpm verify:stage -- --stage V1.3 --suite code`，exit 0 | [2026-10-09当前树完整代码套件](../../../evidence/audits/2026-10-09-v13-current-tree-code-suite-a01.log)；固定模拟不构成实际市场观察 | PASS（代码）；真实市场观察NOT_RUN |
| 最新代码套件（含Trade全部写路由错误身份拒绝及三路由模式注入） | PASS | `pnpm verify:stage -- --stage V1.3 --suite code`，exit 0 | [日志](../../../evidence/audits/2026-10-09-v13-trade-route-scope-code-suite-a02.log)、[SHA-256](../../../evidence/audits/2026-10-09-v13-trade-route-scope-code-suite-a02.log.sha256) | PASS（代码）；完整P3路由审计仍OPEN |
| 2026-10-09当前树手册交互栈 | PASS：V1.3独立随机栈启动，Web与`/api/v1/session`均200；精确项目清理后STOPPED_AND_PURGED | [stack:up日志](../../../evidence/audits/2026-10-09-v13-interactive-stack-lifecycle-a01.log)、[stack:down日志](../../../evidence/audits/2026-10-09-v13-interactive-stack-down-a01.log) | 项目`sq-v13-web-f80938d5f5af5e665db3`；当前端口仅为历史运行值，不复用 | PASS（Mac ARM64隔离操作） |
| 用户人工验收 | 待用户确认 | 不由脚本代签 | 确认人/日期待填 | NOT_RUN |

### 8.7 当前工作树操作手册执行记录（2026-10-09）

`pnpm test:e2e -- --stage V1.3`在受控Docker权限下退出0，21/21浏览器用例通过；完整代码门禁`pnpm verify:stage -- --stage V1.3 --suite code`退出0。独立`pnpm stack:up -- --stage V1.3`输出Web `http://127.0.0.1:51322/acceptance/v1/v1.3`、Platform API `http://127.0.0.1:47587`、Trade Execution `http://127.0.0.1:26150`；Web和session探针均200。精确执行`pnpm stack:down -- --project sq-v13-web-f80938d5f5af5e665db3`后`STOPPED_AND_PURGED`。完整Run ID、命令、源Hash、端口、清理和首轮沙箱拒绝记录见[结构化报告](../../../evidence/audits/2026-10-09-v13-current-worktree-evidence-a01.json)。本轮21个Playwright截图/Trace位于`evidence/audits/2026-10-08-v13-browser-captures-sq-v13-web-a0c4aaa4c763bdfc819a/`；目录名含Harness历史固定日期前缀，文件mtime为2026-10-09，本轮42张截图/Trace逐文件Hash见[当前截图/Trace清单](../../../evidence/audits/2026-10-09-v13-current-browser-captures-a01.sha256)；此前工作树清单仍保留作历史记录。用户当前范围人工验收、目标Ubuntu和完整市场规则仍未完成；未新增签署。

记录不适用子项的范围依据，不能将必需项改为不适用绕过门禁。归档后在[本版验收表](./99-acceptance.md)填写证据链接和结论。清理只针对本轮已结束的隔离运行，默认保留证据；停止测试不能删除数据库卷或取消无关任务。

2026-10-07 L03持久化补验：隔离PostgreSQL Proposal smoke已覆盖新增Version2及不可变旧/新version快照和修订事件行；Version1旧Hash审批返回`VERSION_CONFLICT`。详见[订单闭环审计](../../../evidence/audits/2026-10-07-v13-governance-web-loop.md)。本地工程仍未完结，不能勾选开发任务或新范围人工验收。

2026-10-07运行手册历史记录：当时新增V1.3 AUTO跨owner/TestRun拒绝断言并通过10/10 E2E；Trade P5.7验证乱序撤单/Fill、重启归约、部分成交撤单和版本费用更正；该日期的手册和新范围验收尚未完成。2026-10-09当前状态见下方8.5记录。

2026-10-07 L10会话撤销及重启持久性历史记录：Platform本地会话持久撤销，旧Token重放401，隔离E2E 15/15通过；详见[会话撤销审计](../../../evidence/audits/2026-10-07-v13-session-invalidation.md)。当前手册状态以2026-10-09第8.1/8.5节为准。

### 8.22 2026-10-07 SCRAM交互栈与20/20矩阵复验（用户验收未执行）

V1.3交互栈由 `pnpm stack:up -- --stage V1.3`启动，实际验收页为 `http://127.0.0.1:50251/acceptance/v1/v1.3`；Platform `/live` 与Trade `/ready` 均健康。数据库主机认证为SCRAM-SHA-256，Harness生成随机数据库角色口令及服务Bearer token；私有env/state文件权限0600。使用`pnpm stack:down -- --project sq-v13-web-773629b8e36c2a5e16f3`后，精确项目容器、卷、网络、镜像及凭据状态文件均清理为0。完整E2E另以随机项目 `sq-v13-web-af5ff20faa2d6ca4c386`、显式一次性费用更正故障开关运行20/20通过，日志与失败首跑均见[SCRAM矩阵审计](../../../evidence/audits/2026-10-07-v13-scram-e2e-retry.md)。此历史证据只验证当时隔离工程与固定矩阵；没有创建人工签署。当前手册状态以2026-10-09第8.1/8.5节为准；当前范围人工验收仍NOT_RUN，目标Ubuntu、完整规则与其它未覆盖边界仍开放。

2026-10-07 L08费用更正失败恢复及当前矩阵回归：隔离Trade环境注入一次Portfolio fee-correction Outbox交付拒绝后，持久重试第2次成功，订单详情可读`DELIVERED/attempts=2`，Portfolio/FakeBroker对账MATCH。最新正式矩阵20/20通过，证据见[20/20矩阵审计](../../../evidence/audits/2026-10-07-v13-web-matrix-20-20.md)。这关闭该固定恢复子场景，不代表其它成交/撤单竞态或完整规则覆盖；该日期的运行手册完成状态见2026-10-09最新复核。


2026-10-07 P3 L08部分成交/撤单正式Web纵切：新增固定100股MANUAL CN Fixture，正式页面经会话作用域Platform路由创建seq=1 40股Fill，撤单前持久检查`CANCEL_REQUESTED`，再应用seq=2 ACCEPTED；FakeBroker将订单归约为CANCELLED，待成交Fill投递后通过Reservation Resolution Outbox释放未成交60股。费用revision=1从1.0000修正为6.0000且相同命令只记一次。真实隔离Platform/Portfolio/Governance/Trade/PostgreSQL/Web与同Run CLI矩阵通过：现金两侧均9594.0000 CNY、持仓40股、reservation RELEASED/capturedCashAmount 406.0000、对账MATCH；固定场景1/1 PASS，项目`sq-v13-web-1b0e53ad4a93a9cc4e5d`容器/卷/网络清理通过。修复了撤单结果HTTP路径未立即drain余量释放Outbox的缺陷；费用更正Outbox异步收敛后再独立对账。Run `ba3778b9-fcf2-4a67-9891-8ad49a38c80c`，业务证据与修复详见[部分成交撤单审计](../../../evidence/audits/2026-10-07-v13-l08-partial-fill-cancel.md)。L08其他错误恢复/竞态、P3其余矩阵、人工签署均仍待办；本增量不改变V1.3/P3验收状态。

### 8.23 持久Fixture Session推进与T+1 SELL复验

自动化隔离入口（仓库根目录执行；Docker需可用，项目、端口、口令和token由Harness随机生成）：

```bash
pnpm test:e2e -- --stage V1.3
```

此命令运行V1.3全部21项Web/API/CLI用例并自动清理精确隔离项目；成功输出`status=PASS`、`externalSourceCalls=0`、`realBrokerCalls=0`和`exactProjectResourcesRemoved=true`，Playwright应报告`21 passed`。L08用例依赖该一次性失败开关，否则它的“两次Outbox尝试”断言不适用。Run为自动建立的独立TestRun，结束前导出到`evidence/local/V1.3/<testRunId>/`。

L01/L05 T+1子场景固定输入：CN_A/CNY、PAPER/FAKE、Fixture账户初始现金10000 CNY、初始持仓0、首个Clock为2026-09-28 09:31 Asia/Shanghai、买100股×10 CNY、买入费5 CNY、版本化市场日历`sse-cn-a-share-2026-1`。同日SELL必须拒绝且不产生FakeBroker订单；经“按交易日历推进到下一Fixture Session”正式按钮后，Clock推进到2026-09-29 09:31，重复相同推进请求为幂等重放；随后SELL 100股×10、卖出费5，预期最终现金9990 CNY、持仓0、SELL资源预留CAPTURED、FakeBroker与Portfolio一致、差异为空。测试保存交易日历事件、订单/Fill和账户事实，并以相同TestRun调用CLI `--check-only`；只读核验不能执行或重放交易。

2026-10-07矩阵历史关键TestRun及结构化导出：[325a26ff-0f66-4ff2-8d4b-35944ae26f7d](../../../evidence/local/V1.3/325a26ff-0f66-4ff2-8d4b-35944ae26f7d/evidence.json)，SHA-256 `4ce29b59f8188e10df45fa8a2dd8eab3830080520e556644db53631854d3bce8`；对应报告见[Session推进与T+1审计](../../../evidence/audits/2026-10-07-v13-tplus1-session-advance.md)。当时尚未完成手册状态更新；当前状态见2026-10-09第8.5节。

2026-10-07 L08释放时点/费用更正重放加强复验：撤单请求持久变为`CANCEL_REQUESTED`后，正式Platform路由从Portfolio回读并断言Reservation仍`HELD`，再发送seq=2 ACCEPTED；归约并drain outbox后终态`CANCELLED`、Reservation `RELEASED`。同一partial Fill的revision-1更正重放返回HTTP 202/`replayed=true`且不重复记账。隔离Harness单场景1/1、同Run CLI通过，最新Run `4597d1cf-81bc-4553-8fc7-4bd7f2926efc`、ManifestHash `7ab4490bc81b66b2c795b2649854a6a58684869b4eb45221319845e729978f9a`；详见[加强后的L08审计](../../../evidence/audits/2026-10-07-v13-l08-partial-fill-cancel.md)。L08成功路径更完整，但竞态/更正失败恢复及P3其他未决项仍未完成。

2026-10-08 刷新恢复与证据回看历史记录：首次逐项截图发现V1.3刷新后未恢复已持久订单显示。页面现在以当前Run/Proposal重新查询MANUAL/AUTO原`clientOrderId`并重建订单、Fill、Outbox与独立对账视图；L01 normal和L04 AUTO均增加刷新后FILLED/金额/MATCH断言。修复后完整固定Web/API/CLI矩阵21/21、V1.3完整code suite exit 0；刷新修复轮的21张截图/Trace及历史清单保留为[历史执行快照](../../../evidence/audits/2026-10-08-v13-browser-captures-refresh-fix.sha256)，其原输出目录后被Harness复用，旧Hash现不再对应目录内容；应用服务提取后的本轮21张截图/Trace及当前Hash见[新快照清单](../../../evidence/audits/2026-10-08-v13-browser-captures-after-app-service.sha256)。验收日志/根Hash与修复前诊断记录见[Fixture与交接审计](../../../evidence/audits/2026-10-08-p3-v13-fixture-and-handoff.md)。固定Run人工验收结论仍NOT_RUN；锁版序列之外的订单故障边界、全市场规则与Ubuntu环境仍未完成。P3/V1保持未关闭。

L08增强后的完整V1.3矩阵回归：`pnpm test:e2e:v13-isolated`现18/18通过，含L01–L07、L09–L10及部分成交撤单/费用更正；所有场景各自的同Run CLI检查通过。随机隔离项目`sq-v13-web-26c45aee91d57f6f5097`资源清理核实，真实券商/外部数据调用0。最新L08 Run `552d9af8-ad6a-4af8-b594-abf4d1a19833`及ManifestHash `8a091502b3fdf44340071b6d684a368388bfee6078e27d7f3e1e7f8f92d0accf`。详见[L08与全矩阵审计](../../../evidence/audits/2026-10-07-v13-l08-partial-fill-cancel.md)。P3并未完成所有非固定故障、恢复、市场能力/交付与人工验收要求，阶段状态继续PARTIALLY_IMPLEMENTED。

2026-10-08 sequenced Fill应用服务提取：L07/L08正式Web端点的固定成交事件构造、Run/Proposal/权威FakeBroker订单范围校验、确定性事件身份/Run Clock及Trade写入协调已移入Platform Application的`V13SequencedFill`流程，通过StageRun、Governance、Trade和订单投影ports访问外部域；Controller保留会话身份解析和HTTP状态映射。新增4项应用服务单测，Platform全套单测265/265和typecheck通过；当前V1.3完整code suite受控运行exit 0，隔离Web/API/CLI矩阵21/21、同Run检查/export及精确资源清理通过。当前轮逐项截图/Trace及SHA清单见[应用服务复验快照](../../../evidence/audits/2026-10-08-v13-browser-captures-after-app-service.sha256)。默认权限首次运行的镜像可见性与Docker socket失败日志保留；受控重跑结果见[应用服务审计](../../../evidence/audits/2026-10-08-p3-v13-sequenced-fill-application-service.md)。L07/L08撤单协调仍待应用边界审查；固定测试和工程重构不代表市场规则、人工验收、Ubuntu或P3整体通过。

2026-10-08 L07/L08撤单应用边界完成：固定sequenced成交、撤单请求、接受结果、Portfolio HELD/RELEASED资源时序及最终投影检查均由`V13SequencedFill`应用流程通过ports协调；Controller仅做session identity、HTTP适配。新增7项应用服务单测，Platform全套60文件/268项、完整V1.3 code suite通过；专用失败注入配置下Web/API/CLI 21/21通过，外部来源/真实券商0，精确Harness清理通过。最新截图与Trace分配至独立本轮目录，避免旧Harness覆盖；[逐文件SHA清单](../../../evidence/audits/2026-10-08-v13-browser-captures-order-coordination.sha256)。审计及代码/E2E日志见[订单协调应用服务审计](../../../evidence/audits/2026-10-08-p3-v13-sequenced-fill-application-service.md)。复核时发现刷新修复轮的固定输出目录此前被Harness复用，原截图Hash失配；历史Hash清单已明确标作历史快照且不参与活动验证，旧字节未能恢复。之后Harness改用随机隔离项目的独立截图目录，本轮42个文件均有当前Hash。该修正不改变业务事实，但此证据保留问题已如实登记；P3市场规则、人工验收、Ubuntu及版本其余门禁继续开放。

### 8.24 多腿Mandate预算与执行范围（2026-10-09）

Mandate纯规则对多条Proposal legs逐一核对证券范围，并以整数分加总所有腿的notional和estimatedFee，再判断每笔与累计预算；隔离AUTO/MANUAL协调只接受固定单腿CN/US Fixture，多腿在任何预算或Portfolio资源副作用前返回422。定向Governance 6/6、Trade AUTO 8/8、MANUAL编排5/5、固定命令构造9/9及两服务typecheck通过，证据见[多腿预算/执行拒绝摘要](../../../evidence/audits/2026-10-09-v13-per-leg-authorization-a07.json)。这是当前一腿执行能力的拒绝边界证据，不覆盖多腿执行、资金路径净额或逐Leg子订单恢复；P3仍开放。

### 8.25 V1.3独立迁移CLI完整套件（2026-10-09）

`pnpm test:db:migrate:v1 -- --stage V1.3`在Trade Execution、Portfolio Risk、Decision Governance各自的临时PostgreSQL验证空库、应用、重复应用和未知迁移版本拒绝；CLI代码检查纳入后完整V1.3套件exit 0。[完整日志](../../../evidence/audits/2026-10-09-v13-migration-cli-code-suite-a03.log)及[SHA-256](../../../evidence/audits/2026-10-09-v13-migration-cli-code-suite-a03.log.sha256)，运行边界见[迁移操作说明](../../operations/v1-database-migrations.md)。不代表活动库迁移、完整配对恢复/回退或V1.3关闭。

### 8.26 Trade Execution写路由scope审计（2026-10-09）

13个Trade写入口错误服务身份均403，隔离PostgreSQL确认订单/Fill/事件/outbox零副作用；三个V1.3提案执行入口注入LIVE/REAL均422、零副作用。实际路由、允许服务身份和剩余未覆盖路径见[Trade写入路由矩阵](../../../evidence/audits/2026-10-09-v1-cross-service-route-matrix-a05.md#v13-trade-execution-写入口身份拒绝子矩阵2026-10-09)，完整套件见[日志](../../../evidence/audits/2026-10-09-v13-trade-route-scope-code-suite-a02.log)和[SHA-256](../../../evidence/audits/2026-10-09-v13-trade-route-scope-code-suite-a02.log.sha256)。该证据不等于完整V1交易入口审计或V1.3阶段关闭。

### 8.27 Platform API会话身份拒绝探针（2026-10-09）

随机隔离V1.3 Web E2E增加五个用户入口的匿名与伪造用户身份拒绝检查：匿名请求5/5返回401，`x-stockquant-user: unauthorized-owner`请求5/5返回403；完整Playwright 21/21通过，隔离Compose资源精确清理。路由、21个TestRun/Manifest映射和源码Hash见[机器报告](../../../evidence/audits/2026-10-09-v13-platform-identity-boundary-a01.json)及[A05调用矩阵](../../../evidence/audits/2026-10-09-v1-cross-service-route-matrix-a05.md#v13-platform-api-匿名与伪造用户身份拒绝子矩阵2026-10-09)。TestRun业务断言仍为`WAITING/NOT_RUN`；这仅验证列明的Platform身份边界，阶段仍`PARTIALLY_IMPLEMENTED`，本节未改变第2/7节人工与交付勾选。

### 8.28 V1.3全部Platform用户API身份矩阵（2026-10-09）

源码路由对照首次运行揭示控制器有25个操作而先前探针仅含23个；a02已更正为`PARTIAL_SUPERSEDED`，不作为完整覆盖证据。Harness现解析`app.module.ts`并要求控制器25个操作逐项、唯一匹配探针。修正后26条路由（25个控制器操作+账户详情）的匿名请求26/26返回401、伪造`x-stockquant-user`请求26/26返回403；完整隔离Web/API/CLI E2E 21/21通过，随机项目容器、网络、卷精确清理，外部来源/真实券商调用0。逐路由、21个TestRun/Manifest与源码Hash见[最终机器报告a03](../../../evidence/audits/2026-10-09-v13-platform-identity-boundary-a03.json)及[E2E日志](../../../evidence/audits/2026-10-09-v13-platform-route-inventory-e2e-a02.log)，A05矩阵见[审计记录](../../../evidence/audits/2026-10-09-v1-cross-service-route-matrix-a05.md#v13-platform全部用户api身份拒绝矩阵增补2026-10-09)。这21个Run业务断言继续为`WAITING/NOT_RUN`；本项仅证明V1.3 Platform用户API身份拒绝，未关闭其他版本路由或P3阶段。

### 8.29 当前树V1.3撤单/在途Fill/Trade重启矩阵复验（2026-10-09）

命令：`pnpm test:e2e -- --stage V1.3`。当前树隔离Web/API/CLI矩阵21/21通过，精确回收随机项目`sq-v13-web-0e845ea7dc36ed872def`的容器、卷、网络及项目镜像；外部数据源/真实券商调用均为0。重点L07 TestRun `0e2dbca1-ae62-4a4c-b00c-514b02f66698`先缓冲broker seq=2、应用seq=1，再持久化撤单请求并重启Trade Execution；预留在结果未决时保持`HELD`，重启后seq=2合法Fill入账、seq=3接受撤单，累计成交150、撤销余量50，预留最终`RELEASED`，独立对账`MATCH`。同Run CLI只读核验和结构化证据导出完成，证据包SHA-256 `4fd988405eacf3a2ab65c9167702d48f5236e4b120541d07349c05a36b21f43f`。结构化审计及源码Hash见[机器报告](../../../evidence/audits/2026-10-09-v13-current-tree-cancel-restart-e2e-a01.json)及[SHA-256](../../../evidence/audits/2026-10-09-v13-current-tree-cancel-restart-e2e-a01.json.sha256)。本结果重新验证V1.3共享FakeBroker撤单/在途Fill处理，不替代V1.5 AUTO TestRun内的撤销编排验收；P5专属项仍开放。

补充独立HTTP/PostgreSQL复验：`pnpm --filter @stockquant/trade-execution-service test:p5-7`在隔离PostgreSQL及真实Trade→Portfolio HTTP边界，先形成部分Fill，再并发提交重复撤单请求并接收序列化的Fill/撤单结果。覆盖撤单结果先到时缓存序号缺口、Trade重启后补齐前序Fill、同序号重放幂等、累计成交75/请求100、最终`CANCELLED`且预留只在两个Fill均入账后释放；现金、Fill数量和预留捕获金额独立读回吻合，外部订单不可变事实及身份拒绝也通过。完整运行日志：[a01](../../../evidence/audits/2026-10-09-v13-cancel-partial-fill-race-e2e-a01.log)，SHA-256 `fb6331813c0588d9af83c18b359650d43c4ad1010c4db73b8ace466767114635`。Harness确认活动服务未连接、临时容器/网络清理通过，brokerMode=FAKE。此固定时序补足共享V1.3撤单/部分Fill竞态证据，不代表V1.5自动调度中的完整撤单/取消编排、多故障Worker、结算或人工验收通过。

### 8.30 Platform Proposal模式注入拒绝及无交易副作用（2026-10-09）

在仓库根目录可复跑单一场景：

```bash
STOCKQUANT_V13_E2E_GREP='V1.3 Platform proposal route rejects LIVE and REAL mode injection' node scripts/test-v13-web-e2e-isolated.mjs
```

Harness启动随机隔离Compose项目并输出当次Web/API/Trade URL、PAPER/FAKE/LIVE状态；测试完成后精确删除容器、卷、网络和项目镜像。运行时地址由隔离Harness在每次启动时随机分配并打印，只在当次随机项目运行期间有效；以当次启动输出为准。浏览器打开`/acceptance/v1/v1.3`，选择“正常提案”，点击“创建隔离 V1.3 TestRun”和“初始化本 Run 模拟账户（10000）”。Playwright随后向同一Run的`POST /api/v1/acceptance/v1/v1.3/runs/{testRunId}/proposals`提交LIVE/FAKE、PAPER/REAL、LIVE/REAL三种篡改，均应返回422；同一幂等键随后提交合法PAPER/FAKE返回201。检查Portfolio运行前后现金/持仓/ledgerEntryCount/ledgerVersion相同、FakeBroker订单与Fill为0，再对同Run调用CLI `--check-only`；因尚无交易业务完成，WAITING/exit 2为预期。

固定输入来自`fixtures/v1/v1.3/trading-loop-scenarios.json`（SHA-256 `24d7494e5f4562561a387d176a76eae9134c9f6065bddf7eb69467c29ccc1770`），Manifest `fixtures/v1/v1.3/manifest.json`（SHA-256 `568617c916f3163d633ea627f759fc498f35f3d647df42467acd8e7c90417ba5`）。最新完整运行TestRun `9c8f49b0-913f-453b-a582-eaf5834bbae6`；完整22项Web/API/CLI/export矩阵日志见[SHA-256](../../../evidence/audits/2026-10-09-v13-platform-mode-full-e2e-a03.log.sha256)，代码套件日志见[SHA-256](../../../evidence/audits/2026-10-09-v13-platform-mode-code-suite-a03.log.sha256)。运行摘要实际读回初始/结束账本条目数均为1、账本版本不变，订单/Fill为0，三种模式拒绝为422、合法模式创建为201；同Run CLI check-only及隔离资源清理通过。此前日志中的`ledgerEntryCount: 0`是摘要硬编码，现已改为报告实际快照；更正后的日志取代此前不准确摘要。初次账本基线误假设为0的失败记录仍保留于[首轮日志](../../../evidence/audits/2026-10-09-v13-platform-mode-e2e-a01.log.sha256)。本项只覆盖Platform Proposal创建边界，不关闭V1.1/V1.3全路由、Worker、BACKTEST或UI其它直接写入路径的模式审计；新增范围人工验收仍NOT_RUN。

### 8.31 Governance Proposal授权服务身份边界（2026-10-09）

从仓库根目录执行完整阶段代码套件：

```bash
pnpm verify:stage -- --stage V1.3 --suite code
```

本轮exit 0；授权入口隔离HTTP+PostgreSQL覆盖`POST /internal/v1/proposals/{proposalId}/execution-authorizations`及`/validate`：Platform调用方403、错误Trade Bearer 403、合法Trade Bearer配畸形载荷422且授权表0行；随后创建并批准一个PAPER/FAKE Proposal，Trade获精确scope ACTIVE授权，篡改命令哈希403，两个并发准确验证为单次消费加幂等重放，数据库恰有一条`CONSUMED`且字段绑定正确。独立入口`pnpm test:service-auth:http`和完整V1.3 code suite均exit 0；锁定Python Worker测试14/14。详见[HTTP+PG日志](../../../evidence/audits/2026-10-09-v13-proposal-auth-http-pg-a03.log)及[完整代码套件日志](../../../evidence/audits/2026-10-09-v13-code-suite-a225.log)。

该集成验证Governance授权签发与一次性持久消费，但未从Trade Execution调用点贯通真实HTTP客户端、FakeBroker下单、Portfolio结算以及同Run Web/CLI断言；完整交易接受路径、当前范围人工验收和V1正式门禁仍未完成。

### 8.32 Governance执行授权签发/验证模式注入拒绝（2026-10-09）

从仓库根目录执行`pnpm verify:stage -- --stage V1.3 --suite code`。套件exit 0；隔离HTTP+PostgreSQL smoke在已批准Proposal上分别向`POST /internal/v1/proposals/{proposalId}/execution-authorizations`和`POST /internal/v1/proposals/{proposalId}/execution-authorizations/validate`注入`LIVE/FAKE`、`PAPER/REAL`、`LIVE/REAL`，六种尝试均422。验证前后有效授权保持`ACTIVE`；随后未篡改命令的两个并发验证结果为`CONSUMED`与`REPLAYED`，数据库最终只有一条正确绑定并已消费的授权。完整日志及Hash：[V1.3代码套件](../../../evidence/audits/2026-10-09-v13-governance-mode-injection-code-suite-a01.log)、[SHA-256](../../../evidence/audits/2026-10-09-v13-governance-mode-injection-code-suite-a01.log.sha256)。

这只证明Governance两条授权路由拒绝额外模式字段且不产生授权消费副作用；不证明Trade真实客户端调用、FakeBroker订单、Portfolio结算、完整V1模式矩阵或人工验收通过。

### 8.33 Platform AUTO Mandate/执行路由模式注入拒绝（2026-10-09）

隔离验证命令：`pnpm test:e2e -- --stage V1.3`，改后完整套件退出0、22/22；完整V1.3代码套件退出0。单独定向回归：`STOCKQUANT_V13_E2E_GREP='V1.3 Platform proposal route rejects LIVE and REAL mode injection without trading side effects' pnpm test:e2e:v13-isolated`，退出0且精确清理随机Compose资源。最新完整运行TestRun为`d938c4e8-0ef0-4b4f-abe9-a0c7a83ec4b6`，导出Manifest SHA-256 `64c0805fef6f0d86dcd168bb61a772fa087236b8fd40ff1510fdb83349c6af1d`；固定输入为`fixtures/v1/v1.3/manifest.json`及`trading-loop-scenarios.json`。逐路由向账户初始化、Proposal创建、AUTO Mandate创建、MANUAL、sequenced-MANUAL和AUTO执行共六个HTTP路径提交`LIVE/FAKE`、`PAPER/REAL`、`LIVE/REAL`，全18次返回422。AUTO Mandate读取404；合法Paper账户/Proposal仍按PAPER/FAKE初始化；前后Portfolio账本版本相同、账本条目1→1、订单/Fill均为0；同Run CLI只读核验和结构化导出通过。最新日志：[定向E2E](../../../evidence/audits/2026-10-09-v13-platform-mode-injection-e2e-a02.log)、[完整代码套件](../../../evidence/audits/2026-10-09-v13-platform-mode-strict-code-suite-a02.log)、[完整Web/API/CLI矩阵](../../../evidence/audits/2026-10-09-v13-platform-mode-strict-e2e-a02.log)，其SHA-256见各自旁文件。

这些测试证明列明的Platform入口不接受客户端改写交易模式，不证明全V1全部HTTP/Worker入口、真实交易所规则、完整结算、Ubuntu或当前范围人工验收通过。

### 8.34 Portfolio写入口拒绝客户端模式注入与Outbox时序（2026-10-09）

Portfolio内部`recordFill`、费用更正、资金/证券预留和预留结算四条写入口在完成ServiceBearer/route-scope认证后，若请求含`environmentMode`或`brokerMode`则返回422；账户模式只在初始化时确定。锁定隔离PostgreSQL HTTP smoke对四条路径各注入`LIVE/REAL`，均在副作用前拒绝：预留0条、Fill 0条、费用更正0条，结算预留仍为`HELD`；随后正常Paper Fill/费用更正/UNKNOWN保留/CANCELLED确认流程通过，Backtest初始化仍以`BACKTEST/FAKE`成功。改后完整V1.1 code suite退出0（[日志](../../../evidence/audits/2026-10-09-v11-portfolio-mode-injection-code-suite-a01.log)，SHA-256 `2d9724b30377cb71b1e26584732a1f49c4c98fbe675468468ee1a232530555b9271`），V1.3 code suite退出0（[日志](../../../evidence/audits/2026-10-09-v13-portfolio-mode-boundary-code-suite-a01.log)，SHA-256 `5e308de2b62994f5bc2ed72d06d1d1ed7dda6687ba7f144674dba70288fcb901`）。完整V1.3 Web/API/CLI矩阵22/22通过；L06验证首单响应丢失、第二次原单查询失败时后台Fill Outbox可能仍已正常入账，账户仅允许看到`HELD`（未入账）或`CAPTURED`且同时现金为8995 CNY、持仓100股，随后原`clientOrderId`恢复为FILLED且Reconciliation MATCH（[最终E2E日志](../../../evidence/audits/2026-10-09-v13-portfolio-mode-boundary-e2e-a02.log)，SHA-256 `8f1b82326e6392439b7a59782c817a2627e45200c18a51a07e48fd768651b3e7`）。首次全量E2E因将合法CAPTURED时序误判为仍应HELD而失败，失败保留于[a01日志](../../../evidence/audits/2026-10-09-v13-portfolio-mode-boundary-e2e-a01.log)；修正断言后a02通过。该项覆盖指定Portfolio写入口，不关闭P3所有Paper/Backtest服务入口和模式矩阵、结算规则或阶段人工验收。

### 8.35 Governance AUTO Mandate服务写入口模式注入拒绝（2026-10-09）

当前代码包含四类Governance AUTO Mandate写入口：创建、激活、订单预算授权、预算结算。本轮定向单测与真实隔离HTTP+PostgreSQL smoke分别向这些入口提交`LIVE/FAKE`、`PAPER/REAL`、`LIVE/REAL`字段；均在仓储副作用前返回422。数据库断言：模式注入创建后Mandate记录0条；合法创建后注入激活仍为`PENDING`；注入订单授权不增加预算预留；预算结算的注入请求被拒绝。随后的合法PAPER/FAKE Mandate创建与激活成功。验证命令`pnpm test:service-auth:http`退出0（[HTTP+PG日志](../../../evidence/audits/2026-10-09-v13-governance-auth-http-a05.log)，SHA sidecar随附），定向Governance单测6/6通过，结果由完整V1.3代码套件中的Node单测部分再次执行。早期完整套件在Python Worker镜像缺失处exit 2，见[失败日志](../../../evidence/audits/2026-10-09-v13-governance-mandate-boundary-code-a01.log)；它不是完整V1.3 code suite通过的证据。HTTP smoke首轮固定`validFrom`晚于激活时间而失败，记录于[a03/a04日志](../../../evidence/audits/2026-10-09-v13-governance-auth-http-a03.log)和[诊断日志](../../../evidence/audits/2026-10-09-v13-governance-auth-http-a04.log)；修正隔离输入时间后a05通过。

本子项只验证上述Governance路由拒绝客户端交易模式注入和零副作用，不关闭全V1 HTTP/Worker模式边界矩阵、Paper/Backtest端到端接受路径、完整结算规则或新增范围人工验收。

### 8.36 FakeBroker稳定对外订单标识回归（2026-10-09）

`FakeBroker`的持久订单主键通过当前接口的`orderId`字段返回，是V1.3固定场景中的brokerOrderId。隔离PostgreSQL持久化套件现在在首次执行、同`namespace/clientOrderId`并发重试、关闭并重开Trade连接后的重试三处比较该ID，要求同一订单始终返回完全相同的UUID；同时继续断言只有一条对应订单/Fill/event/outbox，变更相同幂等键的业务事实409且无副作用。命令`pnpm --filter @stockquant/trade-execution-service test:integration:persistence:isolated`退出0，机器报告显式记录三个ID相同：[a02日志](../../../evidence/audits/2026-10-09-v13-fakebroker-order-id-stability-a02.log)，SHA sidecar随附。

该子项证明固定FakeBroker订单ID稳定，不代表完整place/query/cancel/fills/account操作合同逐项完成或V1全版本账本复制边界关闭；后者仍在P3待核验。

### 8.37 FakeBroker by-clientId查询、取消与Fill恢复HTTP契约（2026-10-09）

Trade→Portfolio隔离HTTP/PostgreSQL故障烟测现在先经`GET /internal/v1/orders/by-client-id?namespace=…&clientOrderId=…`查询部分成交订单，断言返回FakeBroker稳定`order_id`、状态与已持久化Fill；停止并重启Trade服务后注入乱序的后续累计Fill和接受撤单，再经同一查询接口断言仍是原订单ID、终态`CANCELLED`且返回两条Fill。原始事件最终均经Fill Outbox进入Portfolio，独立订单/Fill/现金/预留事实断言通过。命令`pnpm --filter @stockquant/trade-execution-service test:p5-7`退出0，[HTTP+PG完整日志a02](../../../evidence/audits/2026-10-09-v13-fakebroker-contract-http-a02.log)，SHA sidecar随附。首次把V1.3独立资产GET断言加到旧版P5.7执行样例时因该样例未创建V1.3资产账本而404，失败保留于[a01](../../../evidence/audits/2026-10-09-v13-fakebroker-contract-http-a01.log)；之后保留订单查询范围，V1.3独立资产与Portfolio对账证据仍引用阶段既有固定AUTO/MANUAL E2E，不从该旧版样例外推。

这补齐固定路径的clientOrderId查询、取消/Fill HTTP恢复和稳定标识证据；完整FakeBroker所有API契约、独立账户GET路由的单独HTTP读取与全V1版本覆盖仍未验证，P3父项继续开放。

### 8.38 FakeBroker独立账户资产HTTP读取契约（2026-10-09）

在Trade服务身份HTTP+隔离PostgreSQL smoke中写入随机namespace/account的独立FakeBroker资产与持仓，然后通过`GET /internal/v1/v13/accounts/assets`读回。允许的Platform身份返回200，且ownerId、testRunId、CNY现金精度和证券数量与持久化事实逐字段一致；错误Replay身份403，另一个accountId及错误namespace均404，缺少namespace/accountId返回422。该断言使用测试隔离数据库直接建立已知账本输入，证明读取路由/身份/范围行为，不证明初始化到下单的完整业务生命周期。执行命令为`pnpm --filter @stockquant/trade-execution-service build`及`node scripts/run-isolated-postgres-command.mjs --url-env TRADE_EXECUTION_TEST_DATABASE_URL:trade_execution_test:trade_execution_test -- node scripts/service-auth-http-smoke.mjs`，定向HTTP+PG与改后的完整V1.3代码套件均通过：[HTTP+PG日志](../../../evidence/audits/2026-10-09-v13-independent-assets-http-a02.log)、[SHA-256](../../../evidence/audits/2026-10-09-v13-independent-assets-http-a02.log.sha256)、[完整代码套件日志](../../../evidence/audits/2026-10-09-v13-independent-assets-code-suite-a02.log)、[SHA-256](../../../evidence/audits/2026-10-09-v13-independent-assets-code-suite-a02.log.sha256)。

该原子项只补齐独立资产GET的服务身份、账户/namespace隔离、参数拒绝和已知账户读回；FakeBroker所有操作的完整请求/响应合同、跨服务账本归属和各版本覆盖仍OPEN。

### 8.39 Governance Proposal审批/修订拒绝模式注入（2026-10-09）

真实Governance HTTP+隔离PostgreSQL smoke在合法PAPER/FAKE Proposal仍处于`MANUAL_APPROVAL_PENDING`时，分别向Approve、Reject和Revise请求注入`LIVE/FAKE`、`PAPER/REAL`、`LIVE/REAL`。九次操作均在领域状态变更前返回422；独立数据库读回确认Proposal仍为版本1、待审批状态，且决策/修订记录均为0。随后未篡改的合法Approve成功，执行授权签发、验证和单次消费路径继续通过。命令`pnpm test:service-auth:http`退出0；改后完整V1.3代码套件也通过：[HTTP+PG日志](../../../evidence/audits/2026-10-09-v13-proposal-mode-decision-revision-http-a02.log)、[SHA-256](../../../evidence/audits/2026-10-09-v13-proposal-mode-decision-revision-http-a02.log.sha256)、[完整代码套件](../../../evidence/audits/2026-10-09-v13-governance-proposal-mode-boundary-code-suite-a02.log)、[SHA-256](../../../evidence/audits/2026-10-09-v13-governance-proposal-mode-boundary-code-suite-a02.log.sha256)。

此证据关闭Governance Proposal approve/reject/revise三类HTTP命令的模式篡改原子边界；不会外推到未逐项覆盖的服务、后台Worker、BACKTEST或全V1接受路径，L17父项继续OPEN。

### 8.40 AUTO Mandate暂停路由模式注入拒绝（2026-10-09）

扩展Governance隔离HTTP+PostgreSQL smoke，在随机隔离AUTO Mandate成功激活后，对`POST /internal/v1/auto-mandates/{mandateId}/pause`注入`LIVE/FAKE`、`PAPER/REAL`、`LIVE/REAL`。三次请求均422；数据库独立读回Mandate仍为`ACTIVE`，事件表仍只有既有CREATED/ACTIVATED两条。随后合法pause返回200并将状态改为`PAUSED`，证明拒绝字段未阻断合法控制路径。`pnpm test:service-auth:http`和改后完整V1.3代码套件均通过：[HTTP+PG日志](../../../evidence/audits/2026-10-09-v13-governance-auth-http-a06.log)、[SHA-256](../../../evidence/audits/2026-10-09-v13-governance-auth-http-a06.log.sha256)、[完整代码套件](../../../evidence/audits/2026-10-09-v13-auto-mandate-pause-mode-boundary-code-suite-a01.log)、[SHA-256](../../../evidence/audits/2026-10-09-v13-auto-mandate-pause-mode-boundary-code-suite-a01.log.sha256)。

此项仅覆盖AUTO Mandate pause HTTP命令的模式边界；完整V1服务/Worker接受路径矩阵、其他版本边界和P3父项继续OPEN。

### 8.41 Trade订单取消/到期/UNKNOWN路由拒绝模式载荷（2026-10-09）

V1.3 Trade服务身份HTTP+隔离PostgreSQL smoke现对一笔真实持久的部分成交FakeBroker订单，向`cancel`、`expire`、`unknown`和有效`cancel-result`请求体注入`LIVE/REAL`。四条请求均在订单转换前返回422；独立读回确认拒绝前后status、订单事件数、Fill数和Outbox数完全一致。随后不带请求体的合法cancel及不含额外字段的接受结果仍可完成，Fill Outbox/Portfolio结算断言通过。Trade服务现在明确拒绝这三条body-less转换路由上的任何非空请求体，避免未知模式字段被忽略后状态仍被改变。定向隔离HTTP+PG与完整V1.3代码套件通过：[HTTP+PG日志](../../../evidence/audits/2026-10-09-v13-trade-transition-mode-http-a01.log)、[SHA-256](../../../evidence/audits/2026-10-09-v13-trade-transition-mode-http-a01.log.sha256)、[完整套件](../../../evidence/audits/2026-10-09-v13-trade-transition-mode-code-suite-a01.log)、[SHA-256](../../../evidence/audits/2026-10-09-v13-trade-transition-mode-code-suite-a01.log.sha256)。由于Trade路由共享给V1.5，改后V1.5完整代码套件a02及隔离Web/API/CLI/export四场景E2E a01均通过，证明共享路由兼容；E2E清理了精确隔离资源，未调用真实券商/外部来源：[V1.5代码套件](../../../evidence/audits/2026-10-09-v15-trade-transition-mode-compat-code-suite-a02.log)、[SHA-256](../../../evidence/audits/2026-10-09-v15-trade-transition-mode-compat-code-suite-a02.log.sha256)、[Web/API/CLI E2E](../../../evidence/audits/2026-10-09-v15-trade-transition-mode-web-e2e-a01.log)、[SHA-256](../../../evidence/audits/2026-10-09-v15-trade-transition-mode-web-e2e-a01.log.sha256)。

此原子项只关闭Trade这四类订单转换路由的请求体/模式字段边界；Trade全部写路由、V1.5独立调度接受路径和L17全V1服务器/Worker矩阵继续OPEN。

### 8.42 Trade Outbox补偿路由拒绝请求体注入及跨阶段回归（2026-10-09）

`POST /internal/v1/outbox/{id}/compensate`现拒绝任何非空请求体，避免忽略LIVE/REAL注入后仍重新排队补偿事件。隔离HTTP+PostgreSQL smoke先形成FakeBroker成交及Outbox事实，将指定事件置为`COMPENSATION_REQUIRED`，注入LIVE/REAL后返回422且状态、尝试次数和错误事实不变；随后合法空请求仍返回202并进入原补偿路径。Trade完整集成套件及V1.3、V1.4、V1.5完整代码套件均退出0。共享Trade改动后的V1.5 Web/API/CLI/export四场景E2E通过，V1.3完整22项Web/API/CLI/export E2E通过；随机隔离资源精确清理，未调用真实券商或外部数据源。[HTTP+PG/集成日志](../../../evidence/audits/2026-10-09-v13-trade-outbox-compensation-body-http-a01.log)、[V1.3代码套件](../../../evidence/audits/2026-10-09-v13-trade-outbox-compensation-code-suite-a01.log)、[V1.4代码套件](../../../evidence/audits/2026-10-09-v14-trade-outbox-compensation-compat-code-suite-a01.log)、[V1.5代码套件](../../../evidence/audits/2026-10-09-v15-trade-outbox-compensation-compat-code-suite-a01.log)、[V1.5 E2E](../../../evidence/audits/2026-10-09-v15-trade-outbox-compensation-compat-web-e2e-a01.log)、[V1.3 E2E](../../../evidence/audits/2026-10-09-v13-trade-outbox-compensation-compat-web-e2e-a01.log)。

该原子项仅覆盖Outbox补偿入口的请求体边界及当前V1.3/V1.5兼容回归；Trade全部写路由、全服务/Worker接受路径矩阵、阶段父项与人工验收继续OPEN。

### 8.43 共享Platform API变更后的V1.3代码与Web/API/CLI兼容复验（2026-10-09）

Run Incident改动后重跑`pnpm verify:stage -- --stage V1.3 --suite code`，exit 0。锁版Python Worker 14/14、全仓质量检查、Trade/Governance/Portfolio服务测试、AUTO Mandate与Proposal身份/模式注入拒绝、FakeBroker持久恢复及各服务隔离迁移均通过；临时PostgreSQL清理通过，活动服务`NOT_CONNECTED`。完整代码日志[兼容套件](../../../evidence/audits/2026-10-09-v13-run-incidents-compat-code-suite-a01.log)，SHA-256 `6f86c13450ed356fde0995aea2ba2233ecb3ecf2720143d5ad5e936bd798ced7`。

随后`pnpm test:e2e -- --stage V1.3`的Playwright 22/22通过；同Run Web/API/CLI与Evidence Export、26条匿名401/伪造Owner403边界、CN/US FakeBroker、费用更正、T+1拒绝和Trade重启后原`clientOrderId`恢复通过；随机容器/卷/网络清理，外部来源/券商调用0。E2E日志[兼容Web套件](../../../evidence/audits/2026-10-09-v13-run-incidents-compat-web-e2e-a01.log)，SHA-256 `d7dc85ec96716c58de1fe603e47875e18d11b8dc67962ed1a4ae6a777d64cc2a`。

此结果仅是当前工作树代码与自动E2E回归，不关闭完整规则、OD-014、V1.3用户验收或Ubuntu，V1.3仍`PARTIALLY_IMPLEMENTED`。

### 8.62 共享Platform API变更后的V1.3代码兼容复验（2026-10-09）

Run Incident改动后重跑`pnpm verify:stage -- --stage V1.3 --suite code`，exit 0。锁版Python Worker 14/14、全仓质量检查、Trade/Governance/Portfolio服务测试、AUTO Mandate与Proposal身份/模式注入拒绝、FakeBroker持久恢复及各服务隔离迁移均通过；临时PostgreSQL清理通过，活动服务`NOT_CONNECTED`。完整日志[兼容套件](../../../evidence/audits/2026-10-09-v13-run-incidents-compat-code-suite-a01.log)，SHA-256 `6f86c13450ed356fde0995aea2ba2233ecb3ecf2720143d5ad5e936bd798ced7`。

此项确认共享Platform变化后的V1.3代码回归，不覆盖Web E2E、完整交易所规则、OD-014结算、人工验收或Ubuntu，V1.3保持`PARTIALLY_IMPLEMENTED`。

### 8.44 共享Platform Run保存事务变更后的V1.3当前树E2E复验（2026-10-09）

`pnpm test:e2e -- --stage V1.3`退出0，Playwright 22/22；隔离Web/API/CLI覆盖CN/US固定Fixture订单链、拒绝边界、Trade重启后原`clientOrderId`恢复。Web创建Run均执行同Run CLI只读检查并导出；独立对账MATCH，外部来源/真实券商调用0，随机项目`sq-v13-web-99c64544a127e2bd3eae`精确清理通过。恢复Run `9e874c2f-333d-44dd-b67a-4cc6c73b19d1`；完整日志[见此](../../../evidence/audits/2026-10-09-v13-current-tree-shared-run-save-e2e-a01.log)，SHA-256 `42f0ee31328dda70c8b655e7eed0e637e79680dbab5e25f04a60b0fcb40d6462`。本项验证共享Run保存事务修改后的当前隔离兼容，不关闭完整市场规则、结算决策、目标Ubuntu或新增范围人工验收。

### 8.45 `seed:paper` 与 `verify:paper` 命令契约（2026-10-10）

`seed:paper`仅初始化一个已由正式Web创建、当前用户拥有且仍为`WAITING`的V1.3 TestRun，不创建Run、不推进业务断言，也不提交订单或Fill。Web/API必须是本机loopback地址；通过当前浏览器会话Cookie鉴权，Cookie不得写入命令日志或证据。示例：

```bash
pnpm seed:paper -- --stage V1.3 --run <TestRun UUID>
```

脚本以该TestRun为边界幂等创建`CN_A/CNY`与`US_EQUITY/USD`两个`PAPER + FAKE`账户。首次返回`replayed:false`，再次运行返回`replayed:true`且账户ID不变；seed前后订单和Fill数量均应为0。V1.3当前没有FX账户或汇率Fixture，不能以seed扩展FX范围。非V1.3、非WAITING、已有业务断言、非loopback API及未授权Run必须拒绝。

`verify:paper`调用完整`pnpm test:e2e -- --stage V1.3`，覆盖固定正常/拒绝/恢复场景、Web/API/CLI同Run检查及隔离资源清理；它不连接真实行情源或券商。2026-10-10实际执行exit 0，Playwright 22/22；正常场景实际调用seed两次，账户稳定且seed订单/Fill为0。TestRun `5a0cc2bc-9280-4332-a177-ba7b11af66d8`，CN账户`6a39097e-9cd5-4ad5-b7d9-6dd432de6989`，US账户`7fa15a3f-57d7-4f4f-bfb6-4129d8b0d8ba`；完整日志[verify:paper V1.3](../../../evidence/audits/2026-10-10-verify-paper-v13-a01.log)，SHA-256 `02347834f314e6ef817f05579d3c4d3c08c1b5c914f3e21280796322f2fea251`。

这些自动检查验证命令和固定隔离路径，不构成人工签收，不关闭V1.3阶段父项或V1版本门禁；新增范围人工验收保持`NOT_RUN`。

### 8.46 AUTO Mandate预算终态独立读回（2026-10-10）

V1.3 AUTO执行成功后，Platform现在按请求的owner、TestRun、Mandate ID及精确版本调用Governance预算读取客户端，并将`mandateBudgetVerification`和原始快照附到执行结果。`VERIFIED`要求身份范围完全一致、预留金额归零、消费金额存在、释放金额归零且仅有一个已消费预留；下游读回故障返回`NOT_VERIFIED`而保留已提交订单响应，不能让客户端据此盲目重试。正式页面在交易提交后和浏览器刷新后均读回这份Governance事实；新增GET路由先校验owner/TestRun范围Mandate和版本，再读取预算。Platform身份矩阵覆盖27条路由：匿名401、伪造owner403。

完整命令`pnpm test:e2e:v13-isolated`退出0，Playwright 22/22，L04完整Web流程经账户/提案/激活/执行/刷新后仍显示`VERIFIED`、`reservedAmount=0.00`、`consumedAmount=1005.00`、`consumedCount=1`；同Run CLI、独立FakeBroker与Portfolio `MATCH`、跨owner 403/跨Run 404及精确容器/卷/网络清理通过。固定Run `00f726fb-a078-484a-964c-35d7103cd488`，证据Manifest SHA-256 `d8f5e8bd7034df1a30a836ba3dcb422d4ec0a9483780074d2717a1f909a0d275`。完整输出[见Web/API/CLI执行日志](../../../evidence/audits/2026-10-10-v13-mandate-budget-readback-web-e2e-a01.log)，日志SHA-256 `9dedcc1931c73a0ce88acf1e8c042a6fc39c1699b837ba8d6b2ce117bb9bba11`（[sidecar](../../../evidence/audits/2026-10-10-v13-mandate-budget-readback-web-e2e-a01.log.sha256)）。改动后完整`pnpm verify:stage -- --stage V1.3 --suite code`退出0，真实合同、层级、服务单测、隔离HTTP/PostgreSQL、FakeBroker恢复与迁移检查通过；完整日志[见此](../../../evidence/audits/2026-10-10-v13-mandate-budget-readback-code-suite-a02.log)，SHA-256 `649f3012af17f50c6026f49b4546d7f8a7689a9de74cd64fd2685700bd7fdd31`（[sidecar](../../../evidence/audits/2026-10-10-v13-mandate-budget-readback-code-suite-a02.log.sha256)）。

此项关闭V1.3 AUTO成功路径预算终态的独立验收读取子项；不能代替拒绝/UNKNOWN场景各自的预算账本断言，也不关闭V1.3其他阶段任务、P3父项、OD-014或当前范围人工验收。


### 8.47 Governance历史回测授权模式拒绝（2026-10-10）

补齐历史Replay授权入口的模式负向HTTP断言。Decision Governance单测`keeps Replay authorization restricted to BACKTEST/FAKE`现在检查PAPER/FAKE、LIVE/FAKE、PAPER/REAL、LIVE/REAL均返回422，且仓储grant未调用。真实服务HTTP+隔离PostgreSQL smoke对LIVE/FAKE、PAPER/REAL、LIVE/REAL逐项验证422；拒绝前后`execution_authorizations`记录数均为0。随后合法BACKTEST/FAKE授权通过，原有并发校验仍只有一次首次消费并留下CONSUMED终态。

`pnpm --filter @stockquant/decision-governance-service test` 8个测试文件/41项通过；`pnpm test:service-auth:http`退出0、隔离数据库容器与网络清理并验证；完整`pnpm verify:stage -- --stage V1.3 --suite code`退出0。完整套件各服务单测、合同与Fixture检查、Trade/Portfolio/Governance隔离迁移、Qlib/Market Data及HTTP身份边界均通过。日志[见此](../../../evidence/audits/2026-10-10-v13-historical-replay-mode-boundary-code-suite-a01.log)，SHA-256 `f32f35cb3f27d3183522002628e04bd3ca224bc68e75745de593152ee5eb5a0f`（[sidecar](../../../evidence/audits/2026-10-10-v13-historical-replay-mode-boundary-code-suite-a01.log.sha256)）。

此项只关闭Governance历史回测授权创建端点的三种错误模式注入；Replay Worker全部命令、Trade/Portfolio所有BACKTEST接受与拒绝路径、Web不可直接修改状态/余额及全量V1 route matrix仍须逐项复核，因此第2节完整模式审计父项保持未勾选。

### 8.48 Platform AUTO Mandate激活/暂停模式拒绝（2026-10-10）

Platform API的AUTO Mandate激活和暂停路由此前没有调用公共`rejectClientTradingMode`守卫；虽然额外字段未被转发到Governance，但入口仍接受客户端提供的`environmentMode`或`brokerMode`，不满足明确拒绝的API契约。两条路由现于身份/状态读取前执行相同服务端拒绝检查。隔离E2E在创建有效Mandate后分别注入`LIVE/FAKE`、`PAPER/REAL`、`LIVE/REAL`：激活和暂停共6次均返回422；激活拒绝后仍为PENDING、合法激活成功后暂停拒绝仍为ACTIVE，合法暂停后为PAUSED。账户现金、持仓、账本版本保持不变，FakeBroker订单和成交为0。

`pnpm test:e2e -- --stage V1.3`完整隔离Web/API/CLI套件22/22通过。模式边界场景TestRun为`51edf948-3229-46a4-9b92-6a639321caa3`，证据Manifest SHA-256为`5749c505fe9c8779aae33f604ab71ecde63fce68de70db1d18319a77a4cb0725`（[Manifest Hash文件](../../../evidence/local/V1.3/51edf948-3229-46a4-9b92-6a639321caa3/manifest.sha256)）；用例文件为`apps/web/tests/e2e/v11-acceptance.spec.ts`中的Platform模式边界测试。完整`pnpm verify:stage -- --stage V1.3 --suite code`退出0，日志SHA-256 `8d84833c3be862de2c22d8eaf86b7e735ab5389a1464a964fb17d82f6f7d3999`（[日志](../../../evidence/audits/2026-10-10-v13-platform-mandate-mode-boundary-code-suite-a01.log)、[SHA-256](../../../evidence/audits/2026-10-10-v13-platform-mandate-mode-boundary-code-suite-a01.log.sha256)）。该修复只关闭这两条Platform路由的拒绝模式注入子项，V1.1/V1.3全量服务/Worker/页面模式审计仍开放。

### 8.49 Platform Proposal修订/审批与Session推进模式拒绝（2026-10-10）

Platform API Proposal修订、审批和Session推进路由现在在读取或修改业务状态前拒绝客户端提供`environmentMode`/`brokerMode`。隔离E2E分别对三类组合`LIVE/FAKE`、`PAPER/REAL`、`LIVE/REAL`发起请求，共9次均返回422；拒绝后Proposal状态、版本和内容Hash不变，Run Clock也没有推进。

合法Proposal创建也按服务端模式来源修正：Web/API客户端不携带交易模式，Platform在验证owner/TestRun账户后固定向Governance传入`PAPER/FAKE`。完整`pnpm test:e2e -- --stage V1.3`通过22/22，TestRun `2644bb0b-c144-4347-9888-38533de607cf`，Evidence Manifest SHA-256 `b0473840da8308c94f14a1cabd4b22f546dc02959ba7d5f18da9dbceb3f1639b`。完整E2E日志SHA-256 `d333848f21bc590a7a0c15c99f81698e12cffdd47e7703c990e716bfa6b94cee`（[日志](../../../evidence/audits/2026-10-10-v13-proposal-mode-boundary-e2e-a02.log)、[SHA-256](../../../evidence/audits/2026-10-10-v13-proposal-mode-boundary-e2e-a02.log.sha256)）；改后完整V1.3 code suite退出0，日志SHA-256 `1155096eec4bb5052ddaea0f2e7d9e74e655b59619f6b0b7feb6145208d8c09a`（[日志](../../../evidence/audits/2026-10-10-v13-proposal-mode-boundary-code-a01.log)、[SHA-256](../../../evidence/audits/2026-10-10-v13-proposal-mode-boundary-code-a01.log.sha256)）。随机隔离容器/卷/网络精确清理，真实行情源/券商调用为0。

失败历史保留：首次完整回归的17项通过、5项因历史测试载荷仍显式提交`PAPER/FAKE`而收到422；按同一服务端模式来源约束修正夹具后，以上a02完整22/22通过。首轮日志SHA-256 `c83ed094247f328cfad42dd4ebfb1a1627dd1bd5ab8bf7ef9c9eaf9b0869eb4f`（[失败日志](../../../evidence/audits/2026-10-10-v13-proposal-mode-boundary-e2e-a01.log)、[SHA-256](../../../evidence/audits/2026-10-10-v13-proposal-mode-boundary-e2e-a01.log.sha256)）。

本子项校准了服务端模式来源并关闭三组入口的拒绝测试，不代表全量服务/Worker/页面模式边界完成；P3父项、V1.3阶段和当前范围人工验收继续开放。

### 8.50 Platform写入口拒绝客户端注入账户与交易事实（2026-10-10）

V1.3 Platform账户初始化、Proposal创建/修订/审批、AUTO Mandate创建/激活/暂停和MANUAL、sequenced-MANUAL、AUTO执行入口现拒绝客户端提交服务端所有的`status`、`cash`、`balance`、`positions`、`ledger`、`ledgerVersion`、`orders`或`fills`字段，返回422并在任何业务读取/写入前结束。该保护与原有客户端`environmentMode`/`brokerMode`拒绝并行。

隔离E2E在Proposal创建中逐项注入上述八类字段；账户初始化尝试覆盖cash/positions/ledgerVersion，Proposal修订尝试覆盖status/ledgerVersion，Session推进尝试覆盖status/cash。拒绝后同一TestRun核对Proposal状态/版本/hash、Run Clock和Portfolio账户现金/持仓/账本版本均保持不变，FakeBroker订单/Fill仍为0。完整`pnpm test:e2e -- --stage V1.3`退出0，Playwright 22/22，TestRun `a4e1f3b8-510d-4527-b6e2-356d9f4250c1`，Manifest SHA-256 `5c68036847e2115533a422280a006372556c9f372acb5719e8b9b2eb23986f47`；日志SHA-256 `7e8c5fc243c4ceca42b40e60d63b959678c2e0e757d58f63bdf905ff1f85658a`（[E2E日志](../../../evidence/audits/2026-10-10-v13-server-owned-facts-e2e-a02.log)）。随机隔离资源清理通过，真实行情源/券商调用0。

完整`pnpm verify:stage -- --stage V1.3 --suite code`退出0，日志SHA-256 `c8d48794270a84a91ffc50eb761aec68a63303c0cb7b773ab2811746a3fbc269`（[code suite日志](../../../evidence/audits/2026-10-10-v13-server-owned-facts-code-a01.log)）。此项只证明所列V1.3 Platform命令拒绝客户端直接写入业务事实；订单转换、服务内Worker、V1.1路由和完整回测写操作矩阵仍需核验，P3父项、阶段验收和当前范围人工验收保持OPEN/NOT_RUN。

### 8.51 Platform事实保护扩展至无载荷命令（2026-10-10）

补充保护四个原本不接收业务载荷、由服务端/Fixture生成事实的写入口：外部订单观察、sequenced Fill报告、sequenced撤单请求和撤单结果。现非空请求体均在身份/业务查询前返回422；空体仍按现有服务器事实处理。隔离E2E逐路由注入status/cash/positions/fills/ledgerVersion，随后继续运行原有外部观察、Fill、撤单、恢复和结算工作流。

定向隔离回归退出0，完整`pnpm test:e2e -- --stage V1.3`退出0（22/22），TestRun `8271379a-6c08-4fa1-9d66-045b2c4a87ca`，Evidence Manifest SHA-256 `75e42e80bb092eb0d019af282e72636fc105b0f7905b6b2b9d7d156efcbd3ab5`；定向回归日志[见此](../../../evidence/audits/2026-10-10-v13-body-injection-e2e-a01.log)，SHA-256 `565ae433ab518f7906b146a096ed7b8c7be08e362703dffacef8b2f8b1754a65`。完整代码套件`pnpm verify:stage -- --stage V1.3 --suite code`退出0，日志[见此](../../../evidence/audits/2026-10-10-v13-body-injection-code-a01.log)，SHA-256 `8a4b118c92bbe3ea13b7aeae721e627fe35be7333550ee98fdba136dd43015b7`。固定Fixture/FakeBroker运行、真实行情源/券商调用0，隔离资源清理通过。仍只覆盖V1.3列举的Platform入口；V1.1、Worker、Backtest以及全量Web状态篡改审计未关闭，P3父项和人工验收继续OPEN/NOT_RUN。


### 8.52 L08部分成交撤单拒绝客户端业务事实注入（2026-10-10）

在正式V1.3 L08 Web流程完成40/100股部分成交后，向`cancel-partial-fill`提交合法序号并混入`status=FILLED`、伪造现金及`ledgerVersion`。Platform返回422。随后独立读取显示订单仍为`PARTIALLY_FILLED`、Fill仍为40股、FakeBroker现金`9599.0000`、Portfolio/FakeBroker对账`MATCH`；继续从正式Web发起合法撤单，剩余60股被撤，随后费用更正和同Run CLI核验通过，最终现金`9594.0000`。TestRun `655b741e-3d45-4def-b7cf-9ff9792f1db2`。完整V1.3隔离Web/API/CLI/export矩阵22/22通过，外部数据源/真实券商调用0，随机项目资源清理通过；[E2E日志](../../../evidence/audits/2026-10-10-v13-l08-cancel-injection-e2e-a02.log)，SHA-256 `a75065b972ed36417b6ec44f95554fd26a711c315ffd4c3ea5e941630eb316d6`。V1.3代码套件exit 0；[日志](../../../evidence/audits/2026-10-10-v13-l08-cancel-injection-code-a02.log)，[SHA-256](../../../evidence/audits/2026-10-10-v13-l08-cancel-injection-code-a02.log.sha256)。

此项证明L08该入口的负向拒绝和业务事实不变，不关闭P3全V1接受路径/Worker审计、完整市场规则、Ubuntu或当前范围人工验收。

### 8.53 Platform Proposal创建拒绝未声明字段（2026-10-10）

Proposal创建入口现在将客户端载荷限定为`idempotencyKey`、`accountId`、`strategyVersion`、`approvalMode`、`market`、`currency`、`operation`、`expiresAt`和`legs`。先校验登录身份，再校验交易模式、服务端业务事实及字段白名单，避免未认证请求被业务校验结果覆盖。E2E向合法载荷追加`clientApproved: true`得到422，并确认之后的原始合法载荷仍能创建Proposal；原有匿名身份边界、PAPER/FAKE模式和账本副作用断言一并通过。

`pnpm test:e2e -- --stage V1.3`：22/22通过，isolated FakeBroker订单/成交和恢复矩阵通过，资源按项目名精确回收，外部数据源及真实券商调用为0。完整日志及退出码、SHA-256 sidecar见[本轮E2E证据](../../../evidence/audits/2026-10-10-v13-proposal-body-allowlist-e2e-a01.log)。这只验证Proposal创建的字段白名单，不关闭全量V1 HTTP/Worker接受路径矩阵，也不替代V1.3 code suite和版本级门禁。

### 8.54 Platform AUTO Mandate创建拒绝未声明字段（2026-10-10）

AUTO Mandate创建HTTP入口在登录身份通过后，仅接受`mandateId`、`accountId`、`strategyVersion`、`market`、`currency`、`securityScope`、`maxOrderAmount`、`maxTotalAmount`、`maxOrderCount`、`validFrom`、`expiresAt`和`reason`。测试在三种非法模式注入断言后追加`clientApproved: true`，确认422；读取Mandate仍404，之后原合法载荷创建继续成功。完整V1.3隔离Web/API/CLI E2E 22/22及完整code suite exit 0；E2E SHA-256 `ac7407c3f2465374bb3d18ed0abaa15a2f4b30cbc9df94b8aa6d30e8f2ed66ec`，code suite SHA-256 `bb98cf7ccd18bbfe9e7d587794c8cc758c7357bc83c652bf58fced5a3645b171`，日志与exit sidecar见[审计证据](../../../evidence/audits/2026-10-10-v13-create-mandate-body-allowlist-e2e-a01.log)和[code suite](../../../evidence/audits/2026-10-10-v13-create-mandate-body-allowlist-code-a01.log)。隔离资源精确清理，外部源/真实券商调用0。此项只覆盖Mandate创建字段白名单，不关闭Mandate其余转换和全量V1 HTTP/Worker矩阵。

### 8.55 Platform Proposal修订与审批拒绝未声明字段（2026-10-10）

Proposal修订只接受`expectedVersion`、`expectedContentHash`、`operation`、`expiresAt`、`legs`、`reason`；Proposal决定只接受`expectedVersion`、`expectedContentHash`、`reason`。两条写入口均先检查会话身份，再拒绝交易模式、服务端事实和未知字段。E2E分别注入`clientApproved: true`，均返回422；前后独立读取确认Proposal状态、版本、内容Hash不变。原有修订/审批模式负向用例和正常治理流程继续通过。

完整V1.3隔离Web/API/CLI矩阵22/22通过，FakeBroker恢复场景及项目资源清理通过，外部源/真实券商调用0。完整V1.3 code suite exit 0，包含lint/typecheck、各服务单测、隔离PostgreSQL持久化/HTTP smoke、合同/Fixture、Python adapter和迁移CLI。E2E SHA-256 `ab096472913987cf185f4b4b83b9b0b1cd7f7b87b1c057f6d70a20b57891a5b8`，code suite SHA-256 `ecc1e63adcd57b957400a0dab6f067341479b866e439c37f95c5735f61bdbe50`，详见[E2E日志](../../../evidence/audits/2026-10-10-v13-proposal-mutation-allowlist-e2e-a01.log)和[code suite日志](../../../evidence/audits/2026-10-10-v13-proposal-mutation-allowlist-code-a01.log)。此项只关闭Proposal修订/审批未知字段子项，不关闭P3全路由/Worker矩阵。


### 8.56 Platform AUTO Mandate激活与暂停拒绝未声明字段（2026-10-10）

AUTO Mandate激活仅接受`mandateVersion`、`contentHash`、`reason`；暂停仅接受`mandateVersion`、`reason`。身份校验后服务端拒绝`clientApproved: true`等未知字段，返回422。E2E确认拒绝后状态未变，合法激活和暂停仍成功。复验还发现Web暂停命令多传了仅激活需要的`contentHash`；已修正Web仅在激活时发送该字段。首次a01失败日志保留为历史，修正后完整隔离矩阵22/22通过。TestRun包括`1c947f1e-26f1-486d-8206-190c62b8d0b2`（Manifest SHA-256 `6f1248586a7d203f8eb15cc8ab0e5ffa163191b2f0ad79b53aff37dbc46f86e4`）、`7459cdb0-1945-4101-b331-cd1a9e406184`（Manifest `9f52258851bdf76d59eb6edb83c38323f7f0e55c33f65df0da325077fab938f1`）及`b3921b4e-1b5f-47a7-b3a2-490bfbe42cce`（Manifest `7141f0552389be53e4105b1d9979ef96207cce8bcd152aa35e25347649c59485`）。

E2E日志SHA-256 `11cb0823aa65a8618d933b7026a51131c02aad52efd141040cdbaff0b5e79083`，退出0；[E2E日志](../../../evidence/audits/2026-10-10-v13-mandate-transition-allowlist-e2e-a02.log)、[退出码](../../../evidence/audits/2026-10-10-v13-mandate-transition-allowlist-e2e-a02.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-10-v13-mandate-transition-allowlist-e2e-a02.log.sha256)。完整V1.3 code suite在允许回环测试监听后退出0，SHA-256 `f489d906bf343ef5d84bebcd21ae875b35cfd24c93fb385bf7ad15b38003a69d`；[code suite](../../../evidence/audits/2026-10-10-v13-mandate-transition-allowlist-code-a02.log)、[退出码](../../../evidence/audits/2026-10-10-v13-mandate-transition-allowlist-code-a02.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-10-v13-mandate-transition-allowlist-code-a02.log.sha256)。失败的a01 E2E及受沙箱限制的code a01均保留，不计为通过。隔离资源清理通过，真实外部行情源/券商调用0。

本项只证明Proposal和Mandate列举写入口的字段边界及当前固定矩阵；不关闭P3全服务/Worker路由审计、完整市场规则、Ubuntu目标验证或当前范围人工验收。

### 8.57 V1.3多腿执行固定输入及验证状态（2026-10-10）

原始合成输入1.0.0保留在[原Manifest](../../../fixtures/v1/v1.3-multileg/manifest.json)及[场景文件](../../../fixtures/v1/v1.3-multileg/trading-loop-scenarios.json)，不覆盖。为与V1.3 Web实际PAPER账户10000.0000初始现金一致，新增Fixture 1.0.1：[Manifest](../../../fixtures/v1/v1.3-multileg-v1.0.1/manifest.json)、[场景输入](../../../fixtures/v1/v1.3-multileg-v1.0.1/trading-loop-scenarios.json)。CN_A两笔BUY（`600000.SH`、`000001.SZ`，合计预留2210.0000、期末7790.0000）；US_EQUITY两笔BUY（AAPL、MSFT，合计预留450.1000、期末9549.9000）；另定义聚合现金不足拒绝和首腿响应丢失恢复。1.0.1数据SHA-256 `80669fc9c61742ac1c2d07b6a374ed45272f5a2a4edb23935e7d010aa4455e92`。

2026-10-10 V1.3隔离MANUAL CN_A与US_EQUITY BUY/BUY路径均已实现并执行：每笔先成功独立预留，再使用一次批次授权；FakeBroker保存两个稳定子clientOrderId及两笔Fill，Portfolio同Run CLI核对逐腿预留捕获和独立账本MATCH，Web刷新恢复相同两个订单。Fixture 1.0.1的CN定向Playwright 1/1通过，TestRun `93496dd5-eb25-48c1-9123-53ae06b2e2b6`；完整V1.3 E2E 23/23通过，CN新增场景TestRun `5c6c9cd0-853f-4623-a435-96630d50f105`。新增US场景后完整E2E 24/24通过，US TestRun `eb34b908-d568-4fa8-b73f-cbd4a48c4880`，期末USD现金9549.9000；[US增量完整E2E日志](../../../evidence/audits/2026-10-10-v13-multileg-us-manual-e2e-a01.log)，SHA-256见sidecar，exit 0。包含US用例后的完整V1.3 code suite exit 0，SHA-256 `3c555594d3221cff2d1823a6dc4fad51d43dd1ff634c5a7c247a77b6acad5627`，见[code suite日志](../../../evidence/audits/2026-10-10-v13-multileg-us-code-suite-a02.log)；之前23/23基线见[23/23 E2E日志](../../../evidence/audits/2026-10-10-v13-multileg-full-e2e-a01.log)、[code suite日志](../../../evidence/audits/2026-10-10-v13-multileg-manual-code-suite-a01.log)及[定向CN E2E日志](../../../evidence/audits/2026-10-10-v13-multileg-manual-e2e-a04.log)。Trade应用层另有聚合资金不足拒绝（释放先前预留且0授权/订单）及第一腿响应丢失后查询原订单、仅提交缺失腿的3项多腿专门单元断言。多腿Trade进程重启恢复已另在§8.58验证。后续§8.61补齐固定US AUTO BUY/BUY Web/API/CLI切片；本段所列E2E和代码套件为该次运行时的历史记录。SELL proceeds-to-BUY结算/中间资金路径继续等待OD-014决定，治理/执行父项和P3仍OPEN。


### 8.58 V1.3多腿Trade进程重启恢复（2026-10-10）

新增固定CN_A MANUAL BUY/BUY进程恢复场景：Trade提交并持久化首腿FakeBroker子订单后，在同一隔离Compose项目中重启Trade Execution；随后以相同批次clientOrderId重试。服务端查询已提交首腿并只补交缺失腿，最终Platform聚合与同Run CLI核对两笔订单、两笔Fill、`MATCH`及预期现金；浏览器恢复同一Run结果。定向Playwright 1/1通过，TestRun `39f1f636-eebc-41b7-9551-ce073392cadc`，证据日志SHA-256 `a2db00356242bcabb4bf988fa15c8fcdb7c3c0371bd6868b4e6676a4f037d1bc`；完整V1.3 Web/API/CLI/export E2E 25/25通过，TestRun `690641a2-d40d-4a5d-80e4-4df6657b97e1`，日志SHA-256 `8a53bc888aef9a1eff4dc9a821e4f15f2c5ad71c9b49125974b10f784849a61e`。完整V1.3 code suite exit 0，日志SHA-256 `8600a3132057cd7a93dc4f9a456f0764464283107c0f56500cc611e5fe4b70d3`。仅启用由测试专用标识、FAKE模式与禁用LIVE共同限制的延时故障钩子；真实行情源/券商调用0，精确隔离Compose资源已清理。此固定MANUAL恢复子项通过；真实跨服务低余额拒绝、AUTO多腿和更广故障矩阵仍开放，P3父项/阶段及人工验收保持未完成。


### 8.59 V1.3多腿低现金拒绝及零副作用（2026-10-10）

扩展L05同Run隔离E2E：先以8笔Paper成交将Portfolio现金降至`1960.0000 CNY`，再创建并批准CN_A两腿BUY批次。真实Platform→Trade→Portfolio链路拒绝该命令（HTTP 409/422）；两笔子订单均查询404，没有FakeBroker订单/Fill。第一腿预留`1005.0000`后第二腿预留失败，Portfolio保存首腿Reservation为`RELEASED`（captured为0），没有第二腿Reservation；现金、持仓、账本版本/条目和reconciliation事实与提交前一致。同Run CLI核对通过。随后第9笔正常订单成功，第10笔AUTO订单因现金不足被拒绝，原L05幂等拒绝断言仍通过；最终9笔成交、`955.0000 CNY`现金、9笔CAPTURED与1笔RELEASED Reservation。定向E2E 1/1 TestRun `f64b339c-8f60-4c7f-9027-72ebada6d66e`，日志SHA-256 `d2a500f004034541f3153271178a31705c194a244dbc39a728d384c3a0e45241`；包含该断言的完整V1.3隔离E2E 25/25，L05 TestRun `ea222a4d-71be-4b2e-a053-fca3b4df3acf`，日志SHA-256 `a45600b14d972414a05c800a1a23a8230675a04503747126455eae4f252513c6`；完整V1.3 code suite exit 0，SHA-256 `4152638b5e47f2d92f404b2348df5eeb1728d83200603e6bd986929887cc5ef5`。此固定MANUAL部分预留回滚子项通过；AUTO多腿、SELL结算/中间资金路径及更广授权仍未覆盖，V1.3父项保持OPEN。

### 8.60 V1.3 AUTO_POLICY固定两腿BUY批次（2026-10-10）

**固定输入：** 新冻结的[Fixture 1.0.2 Manifest](../../../fixtures/v1/v1.3-multileg-v1.0.2/manifest.json)与[场景](../../../fixtures/v1/v1.3-multileg-v1.0.2/trading-loop-scenarios.json)，场景`normal.CN_A`，初始现金CNY 10000.0000，买入`600000.SH` 100股×10.0000+5.0000及`000001.SZ` 100股×12.0000+5.0000；聚合授权/预留CNY 2210.0000，预期成交后现金7790.0000、两个持仓各100股。1.0.1保持原始MANUAL输入语义，不覆盖；1.0.2 Manifest中的场景文件SHA-256为`73e76d5168358fbc4e9b8f6d5c555387c30a0e91eeebff0dffa39d197739fb84`。

**执行方式：** 推荐自动执行完整固定阶段矩阵：`pnpm test:e2e -- --stage V1.3`，在仓库根目录运行，超时建议30分钟；Playwright隔离脚本构建并启动Linux ARM64容器、PostgreSQL、Web及必要服务，外部行情调用和真实券商调用必须为0，结束时精确清理本次随机Compose项目、网络和卷。只重跑此场景可设`STOCKQUANT_V13_E2E_GREP='V1.3 AUTO_POLICY reserves one aggregate Mandate budget'`后执行同一命令。手动Web顺序：打开测试日志中打印的隔离`webUrl`及`/acceptance/v1/v1.3` →“创建隔离 V1.3 TestRun”→“初始化本 Run 模拟账户（10000）”→`v13-create-auto-multileg-mandate`按钮→确认预算2210.00→“人工激活精确Mandate版本”→`v13-create-auto-multileg-proposal`按钮→“按活动Mandate执行AUTO_POLICY建议”。账户必须由本Run创建，模式固定PAPER/FAKE；测试使用的Fixture、服务镜像和端口由隔离脚本打印。需要命令行同Run核验时，用该场景输出的TestRun/Proposal ID和基批次`clientOrderId`执行`pnpm verify:stage -- --stage V1.3 --run <RUN_ID> --check-only`，不得省略`--check-only`。

**预期与实测：** Mandate预算读回`reservationCount=1`、`consumedCount=1`、`consumedAmount=2210.00`；稳定子ID为`<clientOrderId>:leg:01`和`:leg:02`，Portfolio逐腿Reservation对应1005.0000与1205.0000，两个子订单/Fill完成后独立FakeBroker reconciliation为MATCH。刷新页面后两腿订单和预算快照仍显示；同Run CLI再次核对现金、持仓、逐腿预留、FakeBroker资产和MATCH。实际完整V1.3 E2E 26/26通过，AUTO TestRun `cb6130f5-671c-4be3-bb6b-bae551e8a980`；隔离服务/数据库V1.3 code suite exit 0。完整E2E日志SHA-256 `ee9ace15c381b694e5663dcfd84f331c054c61a8e96fab8f07403058f8494a6e`（[日志](../../../evidence/audits/2026-10-10-v13-auto-multileg-full-e2e-a01.log)）；code suite日志SHA-256 `8d76fd5e1ef9ddd62d6648e231f0f85fa4fb8ed4123bcc253485ab8c3336d117`（[日志](../../../evidence/audits/2026-10-10-v13-auto-multileg-code-suite-a03.log)）。首次code suite在新增Fixture 1.0.2尚未登记Schema enum时按预期失败（log a01）；纳入1.0.2后上述a02通过。定向和全量运行均精确删除随机隔离容器、卷和网络，外部源/真实券商调用为0。

该项只关闭CN_A固定AUTO BUY/BUY子场景；US AUTO后来另见§8.61。它不证明多腿SELL proceeds-to-BUY、其他市场/策略的完整授权规则、长期观察或Ubuntu目标环境。V1.3-S2-L13父项、P3阶段和当前范围人工验收仍保持OPEN/NOT_RUN。

### 8.61 V1.3 AUTO_POLICY固定US_EQUITY两腿BUY批次（2026-10-10）

**固定输入：** 新冻结的[Fixture 1.0.3 Manifest](../../../fixtures/v1/v1.3-multileg-v1.0.3/manifest.json)与[场景](../../../fixtures/v1/v1.3-multileg-v1.0.3/trading-loop-scenarios.json)，基于`normal.US_EQUITY`：初始USD 10000.0000，AAPL 10股×25.0000+0.0500，MSFT 5股×40.0000+0.0500；合计Mandate预算/预留USD 450.1000，预期现金USD 9549.9000、持仓AAPL 10及MSFT 5。场景文件SHA-256 `e705f393a5d7f8c94915302e1250212e2dd45fd41d5c5795f519d7bd6b3c0115`。1.0.0–1.0.2保持不变。

**可执行方式：** 仓库根目录执行`STOCKQUANT_V13_E2E_GREP='V1.3 AUTO_POLICY executes the fixed US_EQUITY multi-leg BUY batch' pnpm test:e2e -- --stage V1.3`（定向运行超时建议10分钟）；完整回归为`pnpm test:e2e -- --stage V1.3`（超时30分钟）及`pnpm verify:stage -- --stage V1.3 --suite code`。Playwright启动随机隔离Linux ARM64容器、Web/API、PostgreSQL和必要服务，并打印实际`webUrl`及API/Trade端口。浏览器步骤：打开隔离`webUrl/acceptance/v1/v1.3`→创建Run→市场选`US_EQUITY`→初始化账户→`v13-create-auto-multileg-mandate`→激活精确版本→`v13-create-auto-multileg-proposal`→执行AUTO。实际定向URL曾为`http://127.0.0.1:55349/acceptance/v1/v1.3`，该随机栈已清理；复跑以新日志打印的URL为准。测试Run `aa48ef61-5540-4b22-bcdf-888249fab796`和完整矩阵Run `382dd284-62cc-4157-a53e-5711385e3b90`均为Web创建。测试helper对同一Run执行CLI `--check-only`，按契约因Run业务观察状态为`WAITING`而预期exit 2；它解析并断言两笔订单/Fill、批次授权绑定、MATCH、现金和逐腿预留。不得将此CLI exit 2写成业务或正式Run PASS。

**实测与边界：** 定向Playwright 1/1通过；完整V1.3隔离Web/API/CLI/export矩阵27/27通过，新增业务Run `382dd284-62cc-4157-a53e-5711385e3b90`，E2E日志exit 0且SHA-256 `6e7e4200f91b6776a04dfa84e7803f9ce583df5f7b9389f00e30df7c084e9ddf`；包含同输入和Web构建的完整V1.3 code suite exit 0，SHA-256 `d1c4fb360652e6fdb3f51160959d53c7ee98707ca455ace2918221a94a965e79`。定向日志见[1/1 E2E](../../../evidence/audits/2026-10-10-v13-auto-us-multileg-e2e-a01.log)；完整日志：[27/27 E2E](../../../evidence/audits/2026-10-10-v13-auto-us-multileg-full-e2e-a01.log)、[code suite](../../../evidence/audits/2026-10-10-v13-auto-us-multileg-code-suite-a01.log)。浏览器验证单个Mandate consumed USD 450.10、两稳定子clientOrderId/订单/Fill、每腿Portfolio Reservation、期末现金/持仓和MATCH；刷新后同一事实仍可读。随机隔离资源精确清理、外部行情与真实券商调用0。第一次E2E构建因Dockerfile仍只复制1.0.2而失败，修正复制路径后复跑通过；失败不算通过证据。

该项关闭固定US_EQUITY AUTO BUY/BUY子场景；不覆盖SELL proceeds-to-BUY、完整结算语义、所有授权/故障组合、用户人验或Ubuntu。V1.3-S2-L13和P3父项继续OPEN。

### 8.63 V1.3 Run创建与外部订单观察模式注入拒绝（2026-10-10）

用`STOCKQUANT_V13_E2E_GREP='V1.3 Platform proposal route rejects LIVE and REAL mode injection without trading side effects' pnpm test:e2e:v13-isolated`启动随机隔离Web/API/Trade/Portfolio/Governance/PostgreSQL。本轮有效TestRun为`5dcb856e-d742-4718-b0d0-bad240e9d220`。建立当前本地session后，在`POST /api/v1/acceptance/v1/v1.3/runs`对`LIVE/FAKE`、`PAPER/REAL`、`LIVE/REAL`三种注入均收到422；随后合法Web创建Run并由CLI按同一ID核验。在`POST /api/v1/acceptance/v1/v1.3/runs/{testRunId}/external-orders/observe`相同三种注入也均422；前后读取Run reconciliation完全相同。完整固定V1.3模式场景现累计39次模式注入拒绝；FakeBroker orders/fills为0，Portfolio ledgerEntryCount/ledgerVersion不变，真实数据源/券商调用0。Playwright定向1/1，随机容器/卷/网络/镜像精确清理。[a03通过日志](../../../evidence/audits/2026-10-10-v13-run-creation-mode-boundary-e2e-a03.log)，[exit code](../../../evidence/audits/2026-10-10-v13-run-creation-mode-boundary-e2e-a03.exit.txt)，[SHA-256](../../../evidence/audits/2026-10-10-v13-run-creation-mode-boundary-e2e-a03.log.sha256)。首次a02先遇到无本地session而401，未触及交易模式校验；该失败保留在[a02日志](../../../evidence/audits/2026-10-10-v13-run-creation-mode-boundary-e2e-a02.log)。此前只覆盖外部订单观察的[a01日志](../../../evidence/audits/2026-10-10-v13-external-order-mode-boundary-e2e-a01.log)保留。此记录只补两个Platform入口固定拒绝路径，不关闭全部服务/Worker模式路由矩阵、SELL结算、完整市场规则、阶段交付或用户验收。

### 8.64 V1.3人工批准等待与低现金拒绝回归（2026-10-10）

完整隔离E2E首次复验暴露L05低现金场景存在测试竞态：点击人工批准后立即POST执行，未经确认Proposal已进入`APPROVED_MANUAL`，偶发收到`V13_PROPOSAL_NOT_EXECUTABLE`而未触及Portfolio预留。Playwright现显式等待页面状态`APPROVED_MANUAL`，并要求低现金路径返回409及`INSUFFICIENT_AVAILABLE_CASH`，避免把未批准拒绝误记成风险校验通过。Platform对Trade 422响应现保留受控下游校验body，用户可以看到具体拒绝原因。

验证：定向Playwright 1/1通过，TestRun `647d94c8-9087-4541-bfb8-100b510f66fb`，Portfolio返回409/`INSUFFICIENT_AVAILABLE_CASH`，账户Reservation和账本保持不变、无子订单，CLI核对与随机隔离资源清理通过；见[诊断复验a03](../../../evidence/audits/2026-10-10-v13-multileg-cash-shortfall-diagnostic-a03.log)。完整V1.3隔离Web/API/CLI/export E2E 27/27通过，TestRun `58fcd1ca-fa9f-44d9-a5b3-2d3e0d00cb1f`，耗时1.9分钟，CN/US Fixture、拒绝及Trade重启路径均通过，随机容器/卷/网络/镜像清理完成；见[完整E2E a03](../../../evidence/audits/2026-10-10-v13-run-creation-mode-boundary-full-e2e-a03.log)。V1.3 code suite受控本机exit 0；66/66基线单测、隔离PostgreSQL服务迁移与身份/授权检查通过，见[code suite a02](../../../evidence/audits/2026-10-10-v13-approval-race-code-suite-a02.log)。对应日志SHA-256见各自`.sha256` sidecar。首次全套a02因批准状态竞态26/27失败；定向诊断a01在Platform隐藏下游错误原因且未触及预算校验；两份失败日志均保留。此修复稳定测试同步及拒绝可诊断性，不关闭P3父项的其他授权/结算/规则差异或用户验收。

### 8.65 V1.3 AUTO Mandate生成客户端契约（2026-10-10）

Platform客户端对Governance Mandate的create/read/readBudget/activate/pause五项操作、Trade客户端对authorizeOrder/settleReservation两项操作新增直接单测。断言覆盖HTTP method/path（含路径ID编码）、JSON请求形状、服务身份与Bearer、owner/actor范围；逐项核对默认5000ms与显式超时覆盖值，且无效预算版本在Platform客户端本地拒绝、不发请求。定向Platform 2/2、Trade 1/1通过，两个服务typecheck/build通过。完整`pnpm verify:stage -- --stage V1.3 --suite code` exit 0，基础契约版本日志见[完整代码套件a01](../../../evidence/audits/2026-10-10-v13-auto-client-contract-code-suite-a01.log)，此次超时断言复验见[完整代码套件a02](../../../evidence/audits/2026-10-10-v13-auto-client-timeout-contract-code-suite-a01.log)、[SHA-256](../../../evidence/audits/2026-10-10-v13-auto-client-timeout-contract-code-suite-a01.log.sha256)、[exit code](../../../evidence/audits/2026-10-10-v13-auto-client-timeout-contract-code-suite-a01.exit.txt)。隔离数据库迁移及服务身份HTTP/PostgreSQL检查通过并精确清理。该测试补足客户端边界契约，不证明所有下游接受路径、SELL结算或阶段验收通过；第2节治理执行父项和本轮人工验收仍开放。

### 8.66 公共Schema字段回归后的V1.3完整兼容复验（2026-10-10）

在V1.1核心公共Schema生成类型增加字段及required性回归后，受控本机执行`pnpm verify:stage -- --stage V1.3 --suite code`，exit 0。完整V1.3代码套件的基线、服务构建/测试、隔离PostgreSQL及Trade/Portfolio/Governance/Replay授权与模式边界验证均通过，随机数据库/网络资源清理完成；测试限定PAPER/BACKTEST与FakeBroker，无真实行情或券商连接。普通沙箱因本机回环测试监听受限，失败保留在a01首轮日志；受控复验完整日志[a01](../../../evidence/audits/2026-10-10-v13-post-core-schema-compat-code-suite-a01.log)，SHA-256 `403587636570d37134363bf314e9f9d51ccd080cb87b4f587563492328f51ff9`。这仅证明共享Schema变更后的V1.3当前树代码兼容，不关闭P3剩余规则、阶段交付或人工验收。


### 8.67 V1.3当前树Web/API/CLI完整固定场景复验（2026-10-10）

- 命令：`pnpm test:e2e -- --stage V1.3`；结果：exit 0，Playwright 27/27。
- 覆盖当前锁定Fixture下双市场正常交易、拒绝/恢复、AUTO与多腿、UNKNOWN原单恢复、Trade进程重启及T+1；Web/API执行后使用同一`testRunId`经CLI核对并导出结构化证据。
- 真实市场来源调用0、真实券商调用0；FakeBroker为项目内模拟实现。随机隔离Compose项目、PostgreSQL卷、网络和容器均由Harness精确清理。
- 原始日志：[当前树E2E](../../../evidence/audits/2026-10-10-v13-current-tree-web-api-cli-e2e-a01.log)，SHA-256 `bb186939cc96599279377bcec66da9e7c87b2505335d0808efbb46c0c0dfd1e9`。
- 此证据只确认本次固定场景兼容性；不代表完整市场规则/结算、OD-014、全域恢复、目标Ubuntu或当前范围人工验收通过。

V1.3责任映射补充（2026-10-10）：A31中第2/7/8节20条当前要求已按主责、协作及外部操作方完整核对，详见[责任映射A02](../../../evidence/audits/2026-10-10-v1-v13-responsibility-a02.md)和[结构化明细](../../../evidence/audits/2026-10-10-v1-v13-responsibility-a02.json)。本映射只厘清责任，不改变任何任务勾选、阶段状态或验收签署；完整市场/恢复边界、Ubuntu及本轮人工验收仍开放。

### 8.68 V1.3 FakeBroker固定范围契约覆盖复核（2026-10-10）

复核`V1.3-S2-L14`时发现a35派生矩阵的`remainingGap`把“全版本/完整跨域边界仍未覆盖”误写成“完整place/query/cancel/fills/account生命周期未覆盖”。已按当前源行和现存证据修订单行交叉矩阵[a36](../../../evidence/audits/2026-10-10-v1-current-gap-matrix-a36.json)：固定V1.3范围的MANUAL/AUTO订单、订单/成交查询、部分Fill/撤单、独立FakeBroker资产读回及同Run CLI核验均有实际隔离场景；完整V1.3 Web/API/CLI报告为27/27，含CN/US正常链、L08部分Fill/接受撤单/费用更正和持久查询。独立资产GET的身份/现金精度/持仓/owner/TestRun断言另由HTTP+PostgreSQL smoke覆盖。

证据：[完整E2E日志](../../../evidence/audits/2026-10-10-v13-run-creation-mode-boundary-full-e2e-a03.log)记录相关用例并以27/27结束；[独立资产HTTP+PG日志](../../../evidence/audits/2026-10-09-v13-independent-assets-http-a02.log)覆盖允许与拒绝身份/范围及准确读回。此复核只纠正`V1.3-S2-L14`的固定范围描述，不把跨版本完整审计、所有跨域账本边界、全部市场与故障组合或人工验收标为通过；V1.3阶段和V1整体仍未完成。


### 8.69 Trade→Portfolio费用更正生成客户端合同回归（2026-10-10）

`FillOutboxDelivery.deliverFeeCorrection`实际调用`GeneratedPortfolioAccountClient.correctAccountFillFee`。新增直接客户端单测，断言POST路径为`/internal/v1/accounts/{accountId}/fills/{externalFillId}/fee-corrections`、路径参数编码、Trade Execution服务身份与Bearer、JSON载荷字段及响应解析；定向Trade客户端文件4/4通过，Trade typecheck通过。

完整`pnpm verify:stage -- --stage V1.3 --suite code` exit 0；Trade Execution单测98/98，Platform单测308/308，隔离PostgreSQL迁移/身份验证及Harness精确清理通过。完整日志[见此](../../../evidence/audits/2026-10-10-v13-trade-fee-correction-client-code-suite-a01.log)，SHA-256 `52fd581b6657e47c4d6b45f89ee4bba7b5b27da35b378f9e79adbf69cd4cdd47`。更新crosswalk后的完整仓库`baseline:check`也exit 0（66/66脚本测试，147锚点无失配），见[基线日志](../../../evidence/audits/2026-10-10-v1-baseline-v13-fee-client-a01.log)及[SHA-256](../../../evidence/audits/2026-10-10-v1-baseline-v13-fee-client-a01.log.sha256)。此测试仅验证一个V1生产出站操作的客户端合同，不关闭其他服务调用方、全路由负向副作用、结算语义、活动发布、用户验收或V1门禁。

### 8.70 Platform→Decision Governance Proposal客户端操作合同回归（2026-10-10）

新增`services/platform-api-service/tests/unit/generated-v13-proposal-client.spec.ts`直接覆盖`GeneratedV13ProposalClient`的create/read/decide/revise四类操作：断言HTTP方法、固定路由、proposal ID路径编码、Platform服务身份/Bearer、owner/actor范围头、准确JSON载荷及AbortSignal；审批和拒绝分别检查其动作路由。定向测试4/4，Platform typecheck通过。

完整`pnpm verify:stage -- --stage V1.3 --suite code`退出0：Platform 65个测试文件/314项单测、Governance 41/41、Trade 98/98、Replay Worker 27/27，Web及其他服务单测、基线66项、隔离迁移与服务HTTP检查均通过。活动服务`NOT_CONNECTED`，临时数据库/网络已清理。日志[见此](../../../evidence/audits/2026-10-10-v13-platform-proposal-client-contract-code-suite-a01.log)，exit 0，SHA-256 `8841de539509450d9b8d1b254a5038db610d44de219308df838d374ba2c7d955`。

此记录只证明Platform出站生成客户端合同；不证明Decision Governance全部接受/拒绝副作用矩阵、回退/活动发布或用户验收，P1/A04和V1仍OPEN。

### 8.71 Platform→Trade Execution V1.3客户端逐操作合同回归（2026-10-10）

新增`services/platform-api-service/tests/unit/generated-v13-manual-trade-client.spec.ts`，直接核验Platform实际使用的九个Trade客户端操作：MANUAL提案、顺序MANUAL、AUTO执行；顺序成交报告；FakeBroker撤单及撤单结果；按namespace/clientOrderId查询订单；按namespace/accountId读取独立资产；Fill手续费更正。每项检查HTTP方法/路由、Platform服务身份与Bearer、必需body及字段；订单、Fill ID和query值的编码按实际传输核验。定向9/9、Platform typecheck通过。

完整`pnpm verify:stage -- --stage V1.3 --suite code` exit 0：Platform 66个测试文件/323项单测、Trade 98/98、Portfolio/Governance隔离迁移与HTTP检查通过，全局基线66/66。活动服务`NOT_CONNECTED`，隔离PostgreSQL容器/网络清理通过。日志[见此](../../../evidence/audits/2026-10-10-v13-platform-manual-trade-client-contract-code-suite-a01.log)，exit 0，SHA-256 `f2fe73363162739c83504a963a787eb9e158513e0f2913cabd03c988bd36b386`。

本证据关闭Platform→Trade这九个客户端方法的直接传输合同子项；不代表Trade服务完整授权/拒绝副作用、跨服务回退/活动发布、全阶段验收或P1/A04父项完成。

### 8.72 Platform/Trade→Governance AUTO Mandate客户端操作合同（2026-10-10）

在当前代码树已有生成客户端直接测试中，Platform覆盖AUTO Mandate创建、读取、预算读取、激活、暂停五项操作及非法版本在发HTTP请求前拒绝；逐项检查HTTP方法/路由、service identity/Bearer、owner/actor范围、精确body、路径编码和各自timeout。Trade覆盖Mandate订单授权与预算reservation结算两项操作，检查Trade service identity/Bearer、body、路径编码和timeout。定向Platform测试2/2、Trade测试1/1通过。

当前完整`pnpm verify:stage -- --stage V1.3 --suite code`退出0；Platform 66个测试文件/323项、Trade 19个文件/98项，隔离PostgreSQL迁移、HTTP smoke与仓库基线通过；活动服务`NOT_CONNECTED`，测试临时资源已清理。日志[见此](../../../evidence/audits/2026-10-10-v13-auto-mandate-client-contract-code-suite-a01.log)，exit 0，SHA-256 `5d348e95e2788a9f3cbd8db1968fab5c6e795950762be33d85f0718025b1a224`。

该证据覆盖Platform/Trade两条客户端边的七个AUTO Mandate操作传输合同，不代表Governance业务拒绝/无副作用全矩阵、完整多腿结算、活动发布/回退或P1/A04及V1完成。

### 8.73 Decision Governance完整准入路由身份策略枚举（2026-10-10）

增强`services/decision-governance-service/tests/unit/service-auth.spec.ts`并扩展隔离`pnpm test:service-auth:http`：21条实际准入路径逐项验证错误服务身份、错误HTTP方法和伪造Bearer均在业务处理前拒绝；POST探测携带畸形JSON，以确认身份校验早于JSON解析。总计83个HTTP拒绝探测，PostgreSQL中10张Proposal/授权/Mandate/预算/策略快照事实表的前后计数完全一致。

定向Governance测试7/7、服务typecheck及脚本语法检查通过。完整`pnpm verify:stage -- --stage V1.3 --suite code`退出0：Governance 8文件/42测试、Platform 66文件/324测试、Trade 98测试、全局基线、真实Governance/Replay/Quant HTTP smoke与隔离迁移通过；随机数据库和容器已清理。HTTP+PG结果与完整套件日志[见此](../../../evidence/audits/2026-10-10-v13-governance-route-scope-http-code-suite-a01.log)，exit 0，SHA-256见sidecar。

这只覆盖Governance准入身份/方法拒绝及拒绝无副作用；正确身份下的所有业务规则/模式注入、其它服务/Worker完整写路由、完整授权与结算仍待各自证据，阶段第2节全量边界任务继续未勾选。

### 8.74 Decision Governance Platform API身份配置fail-closed（2026-10-10）

Governance V1策略快照、Proposal、Paper授权、AUTO Mandate与预算接口均有Platform API专属路由，先前配置加载器却允许缺少Platform Bearer并让服务以不完整身份策略启动。现已要求Platform API、Trade Execution、Historical Replay三份独立且各至少32字符的token；缺失、弱或重复值均在启动时拒绝。Compose对三项配置增加必填插值约束，`.env.example`注明该要求；活动环境未做切换。

`service-auth.spec.ts`定向8/8通过、Governance typecheck通过；Compose合法配置exit 0、空Platform token配置exit 1，见[配置边界检查](../../../evidence/audits/2026-10-10-v13-governance-compose-token-gate-a01.md)。完整V1.3 code suite退出0，Platform 324项、Governance 43项、Trade 98项通过，隔离迁移与服务身份HTTP/PostgreSQL smoke通过并完成临时资源清理。完整调用矩阵增量见[A16](../../../evidence/audits/2026-10-10-v1-cross-service-route-matrix-a16.md)，套件见[日志](../../../evidence/audits/2026-10-10-v13-governance-platform-token-required-code-suite-a01.log)，exit与SHA见sidecar。该配置修正不表示活动服务已重启或部署，也不改变V1.3及V1整体未完成状态。

### 8.75 Portfolio Risk跨调用身份Bearer不可复用（2026-10-10）

Portfolio Risk当前强制Platform API、Trade Execution、Historical Replay token均至少32字符且两两不同；授权函数逐请求验证同一约束，配置不满足时返回`NOT_CONFIGURED`，ready探针同时不就绪。Compose要求三个token均有值。该身份边界与Decision Governance §8.74分开实现和验证。

Portfolio服务身份定向3/3、typecheck通过；V1.1/V1.3完整code suite均exit 0，详细组合与证据见[V1.1 §8.30](./01-environment-and-web-center.md#830-portfolio-risk调用身份密钥必须互异2026-10-10)。此项只关闭Portfolio调用凭据复用的配置子项，不表示活动部署、完整跨服务身份矩阵或V1验收完成。

### 8.76 Portfolio Risk全准入路由HTTP拒绝矩阵（2026-10-10）

V1.3完整代码套件中的隔离HTTP/PostgreSQL smoke覆盖Portfolio Risk七条准入路由与四类caller身份，共28次拒绝探测；错误Bearer为401、越权身份为403，六类Portfolio账本/业务事实表计数前后均为0。route/method策略单测与V1.1/V1.3代码套件均通过。证据与边界见[矩阵A18](../../../evidence/audits/2026-10-10-v1-cross-service-route-matrix-a18.md)。这只证明拒绝路径及副作用隔离，不代替合法业务调用和V1验收。

### 8.77 外部FakeBroker订单观察生成客户端合同回归（2026-10-10）

V1.3对账路径实际经Platform `GeneratedPlatformPaperExecutionClient`调用Trade Execution的外部FakeBroker订单观察入口。新增客户端直接合同测试，断言POST路径、命名空间/原始订单ID/证券/数量/UNKNOWN状态/证据引用/观察时刻请求体，及Platform服务身份、Bearer、JSON类型、AbortSignal和响应透传。Platform API单测327/327、typecheck通过；完整V1.3 code suite exit 0并完成隔离数据库迁移、HTTP/PG、Web/API/CLI和资源清理。详见[V1.1 §8.33](./01-environment-and-web-center.md#833-platformtrade-execution外部fakebroker订单观察客户端合同2026-10-10)和[日志](../../../evidence/audits/2026-10-10-v13-external-order-client-contract-code-suite-a02.log)。这是一个生成客户端操作合同子项，不关闭全路由安全边界、交易业务验收或P3父项。

### 8.78 Trade→Decision Governance V1.3授权客户端操作合同（2026-10-10）

Trade Execution在MANUAL与sequenced MANUAL执行前通过`GeneratedTradeV13GovernanceClient`读取owner范围Proposal、创建执行授权并验证授权绑定。新增三个逐操作合同测试：Proposal ID路径编码/owner头与读取响应；授权创建POST路径、完整类型化命令、Trade专属Bearer身份；验证POST路径及同一授权字段绑定。三项均检查JSON类型、5秒AbortSignal与响应状态/载荷。定向测试3/3、Trade typecheck通过；完整`pnpm verify:stage -- --stage V1.3 --suite code` exit 0，隔离迁移、HTTP/PG、Web/API/CLI及基线检查通过，临时资源清理完成。完整套件日志[见此](../../../evidence/audits/2026-10-10-v13-trade-governance-client-contract-code-suite-a01.log)，exit和SHA见sidecar。此项只关闭三条出站操作合同，不关闭完整身份/副作用、所有服务路由或P3父项。

### 8.79 V1.3共享StageRun证据投影与Fixture模式真实隔离验证（2026-10-11）

在V1.3浏览器E2E `afterEach` 中，对每个已持久化TestRun同时核验专用结构化导出和共享`GET /api/v1/acceptance/runs/{testRunId}/evidence`投影。27个场景均从真实隔离Platform API读取HTTP 200 `v2-stage-run-1`，验证相同TestRun UUID、owner `acceptance-owner-1`、`stageId=V1.3`、`PAPER/FIXTURE/FAKE`模式、导出断言与Run断言一致，并保留`manualConclusion=NOT_RUN`。

首次合同断言发现V1.3权威Run创建记录缺少`dataMode`，不是导出层默认值问题。`V13TradingEngine`现明确记录`dataMode=FIXTURE`，领域单测覆盖三类场景的`PAPER/FIXTURE/FAKE`。同时，Web容器Dockerfile补复制被运行时Schema校验直接导入的`packages/contracts/schemas/common`，使正式容器构建包含该共享合同输入。

定向Platform测试327/327、Platform typecheck、Web typecheck、Web单测6/6通过。完整隔离`pnpm test:e2e:v13-isolated`退出0：Playwright 27/27，共享StageRun投影断言逐Run通过；临时容器/卷/网络/镜像精确清理通过。成功日志[a04](../../../evidence/audits/2026-10-11-v13-shared-stage-evidence-isolated-a04.log)，exit与SHA见sidecar。首轮沙箱Docker权限失败[a01]、Web镜像漏复制schema构建失败[a02]、首次合同复验发现模式缺字段[a03]均保留。此项关闭V1.3共享StageRun固定模式投影的真实运行时子项，不代表完整市场/结算矩阵、P1/A04发布回退、历史Run、阶段人工验收或V1通过。

### 8.80 OD-014 CN_A结算后Paper BUY闭环（2026-10-11）

交易日推进现通过Platform→Trade的受限服务路由，按TestRun注入Clock幂等调用FakeBroker与Portfolio结算；若时钟先持久化而任一账本结算失败，重放原推进请求会先重新核对账户归属、双账本与未结订单，再安全续做结算。Trade路由只接受Platform service identity，严格校验scope和时钟。合同/OpenAPI生成器、Platform客户端和应用层边界测试同步更新。

定向单测：Platform全套68文件/330项（含双账本部分失败续做）通过且typecheck通过；Trade 20文件/104项通过且typecheck通过；Portfolio 4文件/12项通过且typecheck通过；合同和OpenAPI检查通过。隔离容器E2E通过：CN_A初始买入后同日卖出按T+1拒绝；次日卖出100股形成CNY 995.0000待结算，现金维持8995.0000；推进到2026-09-30后Portfolio与FakeBroker均结算为9990.0000、应收为SETTLED；其后固定Fixture再买入100股，双账本现金为8985.0000，持仓100股，差异为空，同Run CLI检查通过。TestRun `7a2beec3-d4ba-4905-a483-e56c33795ec9`，E2E证据Manifest SHA-256 `9a805ce0eb13b353f804e3143683d74189e499fdd2e3f55dad173b0d4118f8b0`；隔离Compose exit 0且容器/卷/网络/镜像精确清理。完整日志[见此](../../../evidence/audits/2026-10-11-v13-settlement-clock-buy-isolated-a01.log)，exit [见此](../../../evidence/audits/2026-10-11-v13-settlement-clock-buy-isolated-a01.exit.txt)，SHA-256 `87f8973095a0abeac640b8c68f1df94b768e93f6c939861d4800ae0bf7b6bc66`。完整`pnpm verify:stage -- --stage V1.3 --suite code`当前树复验exit 0；包含合同/Fixture/基线、服务层、隔离集成、服务身份HTTP+PG及Portfolio/Trade v2迁移矩阵，完整日志[见此](../../../evidence/audits/2026-10-11-v13-settlement-clock-buy-code-suite-a01.log)，exit [见此](../../../evidence/audits/2026-10-11-v13-settlement-clock-buy-code-suite-a01.exit.txt)，SHA-256 `283491b142ef594ae0b8eda41c13a98dc8fe410f10fea094389da1e7f40da7d2`。

定向重跑首次使用的grep正则含未转义加号，没有匹配测试；该次退出失败不计为PASS。首次全套运行确实执行目标用例，但后续BUY输入超出冻结Fixture数量而失败，修正为锁版100股后本条定向实测通过。该固定CN_A子项不代表US SELL、完整市场结算规则、人工签署或P3/V1父项完成。

### 8.81 OD-014 US_EQUITY严格已结算现金Paper SELL闭环（2026-10-11）

新增冻结的[US合成会话Fixture Manifest](../../../fixtures/v1/v1.3-us-synthetic-session-1/manifest.json)及[明确会话表](../../../fixtures/v1/v1.3-us-synthetic-session-1/session-calendar.json)，范围为2026-09-27至2026-10-02，时区`America/New_York`。Fixture明确为合成模拟输入、不是交易所日历；运行时按Manifest SHA-256读取，未知日期fail-closed。US账户初始化会把初始注入Clock归一到该Fixture首个已列交易会话，归一事件持久化到同一TestRun Session历史。Trade精确允许的手工SELL Fixture扩展为AAPL 10股USD；AUTO SELL、其它证券及非Fixture数量继续拒绝。

随机隔离Web/API/Trade/Portfolio/PostgreSQL栈定向Playwright 1/1通过，TestRun `5cb79e42-276c-48ee-9602-5fd6179fa1e0`。从初始`2026-09-28T01:31:00.000Z`归一至`2026-09-28T13:31:00.000Z`；固定AAPL买入后现金USD `9749.9500`，推进到下一合成Session后卖出10股，Portfolio/FakeBroker现金仍为`9749.9500`、USD `249.9500`列为PENDING；推进至`2026-09-30T13:31:00.000Z`后两账现金均为`9999.9000`且应收SETTLED，reconciliation无差异。同Run CLI只读检查通过并导出`manualConclusion=NOT_RUN`证据；真实行情与券商调用0，随机隔离容器、网络、卷精确清理通过。

完整日志见[E2E](../../../evidence/audits/2026-10-11-v13-us-settlement-e2e-a01.log)、[报告](../../../evidence/audits/2026-10-11-v13-us-settlement-e2e-a01.md)、[TestRun导出](../../../evidence/local/V1.3/5cb79e42-276c-48ee-9602-5fd6179fa1e0/manifest.sha256)。
切换V1.4 settlement calendar v3后重新执行完整V1.3 Web/API/CLI矩阵，Playwright 28/28通过；最新US SELL同Run为`f9d068a9-188c-4e8f-adf1-36e475ddfa28`，证据Manifest SHA-256 `aedcf2d0c711468cc88fba1dbcc29b00e71ef530ed0e8b4d2ce7cfdd051c0018`，现金仍按`9749.9500 USD`隔离待结算应收`249.9500 USD`，结算后双账本`9999.9000 USD`且MATCH；完整运行日志见[28/28 E2E](../../../evidence/audits/2026-10-11-v13-settlement-fixture-e2e-a01.log)。该更新保留旧TestRun作历史证据，不提升人工结论。定向Platform会话单测15/15、Trade固定Paper Fixture单测10/10，Platform/Trade/Web类型检查、Fixture与JSON Schema校验均通过；完整V1.3 code suite退出0，见[日志](../../../evidence/audits/2026-10-11-v13-us-settlement-code-suite-a01.log)。这关闭OD-014固定US Paper SELL现金结算子项；不表示真实美股日历/费税、V1.4 Quant/Paper全部规则对照、P3/P4阶段或V1完成。人验仍待用户实际确认。

### 8.82 OD-014结算调用边生成客户端合同复验（2026-10-11）

当前树生成客户端静态盘点发现两个新增生产调用尚无直接客户端合同测试：Platform→Trade `settleForSession`与Trade→Portfolio `settleAccountReceivables`。补齐测试，分别断言固定session clock/owner/TestRun载荷、精确内部路由、Platform或Trade专属Bearer身份、15秒/5秒AbortSignal，以及Portfolio拒绝状态和响应体保持不变。

定向测试：Platform生成Trade客户端10/10、Trade生成Portfolio客户端5/5；`pnpm contracts:check` exit 0。Portfolio隔离HTTP/PG集成6/6，8条路由×4种身份共32个拒绝/错误凭据探测后账户、账本、Fill及应收等事实不变；Trade隔离HTTP/PG smoke对错误Replay身份的结算路由返回403且FakeBroker应收仍为0。受控完整`pnpm verify:stage -- --stage V1.3 --suite code` exit 0，日志见[套件A03](../../../evidence/audits/2026-10-11-v13-settlement-client-contract-code-suite-a03.log)，exit [记录](../../../evidence/audits/2026-10-11-v13-settlement-client-contract-code-suite-a03.exit.txt)，SHA-256 [sidecar](../../../evidence/audits/2026-10-11-v13-settlement-client-contract-code-suite-a03.log.sha256)。生成客户端静态引用盘点现为20个客户端、73个生产调用方法、无缺少客户端测试引用，见[盘点A02](../../../evidence/audits/2026-10-11-v1-generated-client-test-inventory-a02.json)。直接调用边和服务端拒绝范围见[路由矩阵A24](../../../evidence/audits/2026-10-11-v1-cross-service-route-matrix-a24.md)。隔离容器已清理，活动服务未连接；本项不改变P1总体状态、OD-014整体阶段或人工验收状态。

2026-10-12当前树复验既有Trade→Portfolio结算客户端合同测试5/5通过；请求/身份语义无新缺口，未扩展 §8.82 的结论范围。[定向日志](../../../evidence/audits/2026-10-12-v1-trade-portfolio-settlement-client-contract-a01.log)、[exit](../../../evidence/audits/2026-10-12-v1-trade-portfolio-settlement-client-contract-a01.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-trade-portfolio-settlement-client-contract-a01.log.sha256)、[语义复核A32](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a32.md)。P1/A04完整操作/兼容/发布回退矩阵仍OPEN。

### 8.83 Trade Execution V1写路由缺身份/错误Bearer矩阵（2026-10-11）

Trade HTTP+PostgreSQL隔离smoke将13条V1受保护写路由逐条加入缺少服务身份/Bearer、正确caller名称搭配另一服务Bearer的探测；原有错误caller+其有效token探测继续保留。三类错误请求全部403，FakeBroker订单、Fill、事件、Outbox和SELL应收计数保持0。V1.3完整code suite exit 0、随机隔离服务和PostgreSQL资源清理通过；详细路由与限制见[矩阵A25](../../../evidence/audits/2026-10-11-v1-cross-service-route-matrix-a25.md)和[完整套件日志](../../../evidence/audits/2026-10-11-v13-trade-route-credential-matrix-code-suite-a04.log)、[退出码](../../../evidence/audits/2026-10-11-v13-trade-route-credential-matrix-code-suite-a04.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v13-trade-route-credential-matrix-code-suite-a04.log.sha256)。这是V1.3 Trade拒绝授权子矩阵；合法请求的完整逐路由响应、其它服务、发布/回滚及P1/A04父项继续OPEN。

### 8.84 V1.3 Trade全部受保护写路由模式注入拒绝复验（2026-10-11）

在§8.83的13条V1写路由身份矩阵上，补齐此前缺少的四条正确Platform身份HTTP探测：Paper settlement、FakeBroker external order、simulated fill report及fee correction。四条均使用满足其余字段形状的请求并额外注入`environmentMode=LIVE`与`brokerMode=REAL`；均在持久化/调用Portfolio前以422拒绝。隔离PostgreSQL前后对比FakeBroker external orders、SELL receivables、simulated reports、fee corrections、fills和outbox事实，无变化。连同已有的历史BACKTEST执行、MANUAL/序列/AUTO提案执行、取消/取消结果/过期/UNKNOWN转换和outbox compensation拒绝探测，13条V1 Trade写路由均有当前树模式注入断言。

受控完整`pnpm verify:stage -- --stage V1.3 --suite code` exit 0；Trade单测105/105，隔离数据库精确清理通过。完整日志[套件a05](../../../evidence/audits/2026-10-11-v13-mode-boundary-code-suite-a05.log)、[exit](../../../evidence/audits/2026-10-11-v13-mode-boundary-code-suite-a05.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v13-mode-boundary-code-suite-a05.log.sha256)。首轮测试查询费用更正表时误用了不存在的`order_id`列，保留在[失败a04](../../../evidence/audits/2026-10-11-v13-mode-boundary-code-suite-a04-failed.log)；修正为该表的`external_fill_id`关联后完整重跑通过。

这只关闭V1.3 Trade的模式注入拒绝原子项；V1.1服务路径、Platform页面状态/余额旁路、允许模式语义的全部正向组合、跨服务部署与回退仍需复核，父项与V1.3阶段均保持未完成。

### 8.85 Trade V1写路由服务身份策略全量单测（2026-10-12）

Trade Execution身份授权单测此前仅对13条V1受保护写路由抽样断言。本次改为逐路由表驱动：历史回放执行归Replay Worker，其余12条Paper/结算/FakeBroker运维写路由归Platform；每条均断言合法身份与专属Bearer通过、另一合法服务身份被拒、身份与Bearer错配被拒、匿名请求被拒。测试枚举与A25的13条V1写路由一致。

定向`service-auth.spec.ts` 7/7通过、Trade typecheck通过。完整`pnpm verify:stage -- --stage V1.3 --suite code` exit 0；Trade单测106/106，Platform 334、Governance 43、Portfolio 12、Replay 27、Quant 101、Market Data 84、Research Automation 218、Web 6均通过；服务身份HTTP+PG、三服务独立迁移CLI和隔离资源清理通过，活动服务`NOT_CONNECTED`。首次完整套件因V1.1两条Crosswalk源文本漂移而停在基线，失败日志保留；刷新精确来源锚点后完整复跑通过。通过日志[见此](../../../evidence/audits/2026-10-12-v13-trade-route-auth-scope-code-suite-a02.log)，exit [记录](../../../evidence/audits/2026-10-12-v13-trade-route-auth-scope-code-suite-a02.log.exit.txt)，SHA-256 [sidecar](../../../evidence/audits/2026-10-12-v13-trade-route-auth-scope-code-suite-a02.log.sha256)；首次失败日志[见此](../../../evidence/audits/2026-10-12-v13-trade-route-auth-scope-code-suite-a01.log)。

该测试收紧Trade服务身份策略的单测覆盖，不扩大V1权限；它不证明全部合法写操作的逐路由业务响应、其它服务完整身份矩阵、部署迁移/回滚或活动运行状态，P1/A04与V1验收继续OPEN。

### 8.86 OD-014严格已结算现金下MANUAL/AUTO多腿预留边界（2026-10-12）

落实所有者批准的OD-014口径：固定Fixture中的MANUAL与AUTO多腿即时批次可包含受限CN `600000.SH` / US `AAPL` SELL腿；Portfolio分别预留SELL证券数量与BUY现金，Trade在任何子单提交前先完成所有腿的资源预留。批次内SELL应收不能给BUY提供资金；BUY仍由Portfolio按已结算现金独立判定。任一腿预留失败时释放此前成功预留，MANUAL不授权、AUTO同时释放Mandate预算，且不提交FakeBroker订单。

Trade定向MANUAL/AUTO/固定命令测试29/29通过；完整Trade单测109/109、隔离PostgreSQL目标校验5/5、TypeScript构建通过。Portfolio完整隔离PostgreSQL集成6/6通过，其中资源预留集成验证SELL Fill形成PENDING应收后，结算前BUY仍按已结算现金拒绝，推进至明确结算时刻后才释放应收。V1.3完整code suite exit 0（含基线、构建、lint/typecheck、全仓单测、合同/Fixture与服务身份/迁移隔离验证）；临时容器/网络已清理、活动服务`NOT_CONNECTED`。Portfolio定向集成TestRun `09fc2906-7d69-474e-85ec-582ddc3db35f`。日志见[Trade单测](../../../evidence/audits/2026-10-12-v13-strict-settled-cash-multileg-trade-unit-a01.log)、[Portfolio隔离集成](../../../evidence/audits/2026-10-12-v13-strict-settled-cash-multileg-portfolio-integration-a01.log)及[完整V1.3 code suite](../../../evidence/audits/2026-10-12-v13-strict-settled-cash-multileg-code-suite-a01.log)。

该服务层和Portfolio现金规则随后扩展为混合腿Web/API/CLI同Run验收，执行记录见§8.87。


### 8.87 OD-014混合SELL/BUY多腿Web/API/CLI同Run验收（2026-10-12）

冻结的新输入为[`v1.3-multileg-v1.0.4`](../../../fixtures/v1/v1.3-multileg-v1.0.4/manifest.json)，场景定义[`trading-loop-scenarios.json`](../../../fixtures/v1/v1.3-multileg-v1.0.4/trading-loop-scenarios.json)，SHA-256 `f7e8ad101279626e31bae47667f5621f61108a1b2dd40096889b9e9daafae8dd`；Manifest SHA-256 `4caf68fa5f010846041a4af98cea7da19fbb465051bb13c94cb8e16cb47f99be`。旧1.0.3输入未改写。正式入口仍是`/acceptance/v1/v1.3`，容器化Web通过隔离V1.3栈运行，业务数据只使用CN_A/CNY固定Fixture和FakeBroker。

MANUAL成功场景：初始化CNY 10,000账户，用Web既有MANUAL按钮买入100股`600000.SH`（10.0000，费用5.0000），按Run Clock推进一个固定Session，然后点击“创建OD-014严格现金SELL+BUY MANUAL提案”、人工批准并执行。固定两腿分别卖出100股`600000.SH`（卖出净额995.0000，先列PENDING应收）和买入100股`000001.SZ`（含费占用1,205.0000已结算现金）。结果为已结算现金7,790.0000、应收995.0000仍PENDING、只持有100股`000001.SZ`，两腿预留CAPTURED且Portfolio/FakeBroker对账MATCH。用`pnpm verify:stage -- --stage V1.3 --run <同一testRunId> --check-only`核验同一Web TestRun；检查命令退出2表示V1.3子Run仍WAITING，这是预期，不是业务失败。

AUTO拒绝场景使用Fixture锁定的8笔种子BUY（每笔100股、1,005.0000），把已结算现金降到1,960.0000并持有800股`600000.SH`；推进Session，卖出100股形成995.0000 PENDING应收，再通过Web创建并人工激活严格现金Mandate、创建混合AUTO提案并执行。预计Trade返回409 `INSUFFICIENT_AVAILABLE_CASH`；零批次订单/成交，现金及应收不变，先取得的SELL和BUY Portfolio预留均RELEASED，Mandate预算显示reserved=0、consumed=0、releasedCount=1。对相同TestRun执行`pnpm verify:stage -- --stage V1.3 --run <同一testRunId> --proposal <proposalId> --check-only`，预期仍exit 2且输出WAITING/业务拒绝证据。

可重复执行的实际验收命令：`pnpm test:e2e:v13-isolated`；本次完整矩阵30/30通过，包含上述两个场景、每个Run的CLI/共享StageRun证据投影校验，并完成随机隔离容器、卷、网络、镜像精确清理。完整旧矩阵日志[30/30](../../../evidence/audits/2026-10-12-v13-od014-strict-multileg-web-e2e-a01.log)；最终v1.0.4 Schema字段校正后的定向复跑[2/2](../../../evidence/audits/2026-10-12-v13-od014-strict-multileg-web-e2e-a02.log)，Run分别为MANUAL `f80c0f25-93d3-4785-b7f5-022b75df6579`、AUTO拒绝 `dbbc69be-bc9d-4d32-a7b1-d96061a78027`，证据Manifest SHA分别为`8e7a05dbfc1795676224c67763085c4b90aeaa51841ba11c7758f785c80e375e`和`a7812291bb7bb7179c4a1ec8197ce26cfb406570d0e60a0fe53e9fc5e54e67bf`。最终完整`pnpm verify:stage -- --stage V1.3 --suite code`退出0，日志[见此](../../../evidence/audits/2026-10-12-v13-od014-strict-multileg-code-suite-a01.log)。Fixture检查`pnpm fixtures:check`、Web typecheck通过。Web成功Run结论字段仍为`manualConclusion=NOT_RUN`，自动PASS不代替所有者本轮人工验收。

本次证明固定CN_A严格现金下的MANUAL混合成交、AUTO资金不足拒绝/资源释放及同Run CLI只读检查；不覆盖其它SELL证券/数量、全交易所规则、P1发布回退、Ubuntu实机、其余V1阶段或当前范围人工验收。V1.3和V1门禁保持OPEN/INCOMPLETE。

### 8.88 V1.3-S2-L15当前树事件序列与重启恢复复验（2026-10-12）

当前树复跑`pnpm --filter @stockquant/trade-execution-service exec vitest run tests/unit/fake-broker-event-sequencer.spec.ts`：3/3通过，覆盖乱序Fill/Cancel缓冲与按序归约、缺口不推进、同指纹重放幂等、冲突/非法/过期序列拒绝。`pnpm --filter @stockquant/trade-execution-service test:p5-7`构建通过，隔离PostgreSQL Trade→Portfolio HTTP恢复PASS：Portfolio提交Fill后响应丢失，Trade重启后持久Outbox接管；Cancel序号缺口跨Trade重启保留，前置Fill到达后依序归约，FakeBroker终态CANCELLED、Portfolio两笔Fill/金额与预留释放对账通过。Run `e2056935-7de6-40a5-84a1-0625b1c89b0a`，namespace `p57-outbox-http/c47b855c-4766-4b69-b84f-554a89c892c1`。使用固定Postgres镜像digest、随机loopback端口和隔离网络，临时容器/网络清理验证通过，活动服务未连接。详细断言见[复核A01](../../../evidence/audits/2026-10-12-v13-l15-event-sequence-current-tree-a01.md)。

该复验限于事件序列器和一条Trade→Portfolio持久化故障路径；完整订单状态/路由、故障种子矩阵、V1.5 AUTO编排、Web同Run正式阶段矩阵、Ubuntu及人工验收仍未完成。V1.3-S2-L15及P3保持OPEN。

### 8.89 V1.3 US_EQUITY AUTO UNKNOWN响应丢失/原单查询恢复（2026-10-12）

新增固定US AAPL路径：隔离Web创建V1.3 Run、选择US_EQUITY、建立并激活Mandate、以AAPL 10股提案执行。FakeBroker实际提交后响应丢失，第一次请求503；原单查询被注入一次不可用，第二次仍503；第三次使用相同`clientOrderId`查询原单并恢复202，不重复下单。成交10股AAPL，价格USD 25.0000、费用USD 0.0500，现金USD 9,749.9500，Portfolio捕获USD 250.0500，FakeBroker/Portfolio MATCH；同Run CLI只读核验通过。Run `01d1d2ae-ad53-4260-86d7-bb096382070e`，证据Manifest Hash `d9dc42289d74cf5d973dae6d0277cad508d6dfb48b0f5a99116a43ae397feef1`。定向1/1和完整V1.3浏览器矩阵31/31、code suite exit 0均通过；审计报告、日志和Fixture导出见[A04](../../../evidence/audits/2026-10-12-v13-us-l06-unknown-recovery-a04.md)。首轮至第三轮断言修复失败保留在[A01](../../../evidence/audits/2026-10-12-v13-us-unknown-recovery-initial-failure-a01.md)、[A02](../../../evidence/audits/2026-10-12-v13-us-unknown-recovery-second-failure-a02.md)、[A03](../../../evidence/audits/2026-10-12-v13-us-unknown-recovery-third-failure-a03.md)。

该子项证明固定US响应丢失与原单查询中断恢复，不代表US Trade重启/乱序Fill、多seed或全部市场/故障矩阵完成。人工验收仍NOT_RUN，V1.3-S2-L16/P3/V1保持OPEN。

### 8.90 V1.3-S2-L16 US_EQUITY Trade重启后同单恢复（2026-10-12）

隔离V1.3 Web/API/CLI场景在US_EQUITY/AAPL AUTO订单由FakeBroker提交、HTTP响应丢失后，精确重启本随机项目的Trade Execution容器；服务恢复健康后，使用原`clientOrderId`查询并恢复，不重新提交。结果为10股AAPL、USD 25.0000成交价、USD 0.0500费用、USD 9,749.9500现金，USD 250.0500预留CAPTURED，Outbox DELIVERED、未决订单/Outbox为0、无差异且账本MATCH；同Run CLI校验通过。TestRun `07af67c7-ed53-48a0-af35-9c8aeaca3051`，Manifest SHA-256 `01f8c5293498d128200a0abbb547db9bf35787a2ddcc861d8a8a145d0f8145e6`。定向E2E 1/1和Web typecheck通过；成功日志[见此](../../../evidence/audits/2026-10-12-v13-us-trade-restart-e2e-a02.log)，退出码[见此](../../../evidence/audits/2026-10-12-v13-us-trade-restart-e2e-a02.exit.txt)，SHA-256 [sidecar](../../../evidence/audits/2026-10-12-v13-us-trade-restart-e2e-a02.log.sha256)。首次沙箱尝试被Docker socket权限阻止，失败记录保留在[a01](../../../evidence/audits/2026-10-12-v13-us-trade-restart-e2e-a01.log)。随机隔离栈资源清理通过。

该项关闭L16中的US固定Trade重启子场景；US乱序/重复Fill变体、多seed实际事件矩阵、完整路由/状态/市场规则、完整代码套件、人验及Ubuntu仍开放。L16/P3/V1不因此关闭；本Run `manualConclusion=NOT_RUN`。

§8.90增量完整复验：新增场景后的完整隔离Web/API/CLI矩阵32/32通过，完整V1.3 code suite exit 0；Crosswalk与文档检查PASS。详细日志：[完整矩阵](../../../evidence/audits/2026-10-12-v13-us-trade-restart-full-e2e-a01.log)、[完整代码套件](../../../evidence/audits/2026-10-12-v13-us-trade-restart-code-suite-a01.log)、[A37复核](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a38.md)。


### 8.91 V1.3 L16 US_EQUITY AAPL乱序成交重启恢复（2026-10-12）

新增不可变Fixture `v1.3-us-ordered-fills` v1.0.0，固定US_EQUITY/AAPL 200股MANUAL BUY，USD 25.0000、每个增量Fill费用USD 0.0250。实测顺序为seq=2累计150先到并缓冲、同一seq=2重放10次、重启隔离Trade Execution、seq=1累计100后到并因果应用seq=2。最终Fill为100+50股，订单PARTIALLY_FILLED，持仓150股，现金USD 6,249.9500、预留USD 5,000.0500，FakeBroker/Portfolio MATCH；同Run CLI只读核验通过。TestRun `9d763c49-23b3-45c1-baf6-da888a7033c0`（完整矩阵内）；专用Fixture SHA-256 `7c6c81a3f7c1f7286a55f853285414a5e240e2ca2c54013e29aa87cb81bd38c0`。完整33项E2E和V1.3 code suite通过，日志及退出码见[矩阵记录](../../../evidence/audits/2026-10-12-v13-us-ordered-fill-full-e2e-a01.log)与[代码套件](../../../evidence/audits/2026-10-12-v13-us-ordered-fill-code-suite-a01.log)。

此固定用例只关闭一条US乱序成交重启子路径；全量多seed故障矩阵、完整订单状态/路由组合、V1.5编排、Ubuntu和人验仍OPEN/NOT_RUN，V1.3与V1不因此验收完成。首次定向执行发现并保留两项诊断：既有US顺序限制与Trade adapter CN-only guard，修复后同一场景通过；首轮日志保留为失败历史。

**可复跑交接（项目根目录，Mac ARM64 Docker隔离栈）：**

- Fixture：`fixtures/v1/v1.3-us-ordered-fills-v1.0.0/manifest.json` 与 `aapl-out-of-order-restart.json`，版本1.0.0，场景文件SHA-256 `7c6c81a3f7c1f7286a55f853285414a5e240e2ca2c54013e29aa87cb81bd38c0`。初始现金USD 10,000.0000；AAPL BUY 200股、USD 25.0000、每个增量Fill费用USD 0.0250。
- 定向真实Web/API/CLI执行命令：

  ```bash
  STOCKQUANT_V13_E2E_GREP='US_EQUITY L07 applies a buffered out-of-order AAPL Fill after Trade Execution restarts' pnpm test:e2e -- --stage V1.3
  ```

  隔离Harness创建随机项目，注入`STOCKQUANT_V13_TEST_COMPOSE_PROJECT`和`STOCKQUANT_V13_TRADE_URL`；测试以80次×250ms（最多20秒）等待Trade `/ready`，Playwright场景超时60秒。Harness结束时必须输出`status=PASS`、`exactProjectResourcesRemoved=true`；Playwright须为1 passed。
- 页面步骤/控件：访问本次输出的`webUrl`下`/acceptance/v1/v1.3`；点击“创建隔离 V1.3 TestRun”，市场选择器“市场”选`US_EQUITY`，点“初始化本 Run 模拟账户（10000）”；点击`data-testid=v13-create-sequenced-proposal`，人工批准，点`v13-execute-sequenced-proposal`，点`v13-sequence-2-replay`再点`v13-sequence-2-replay-10`。测试随后只重启本次随机项目的Trade Execution，等待`/ready`，点击`v13-sequence-1`并以同一TestRun调用只读CLI `--check-only`。
- 预期：seq2累计150先缓冲，重复10次返回幂等重放；重启后seq1累计100到达并按序排空为Fill 100+50，订单`PARTIALLY_FILLED`，AAPL持仓150、现金USD 6,249.9500、预留USD 5,000.0500、独立对账`MATCH`，CLI exit 0。失败时保留首次日志/Playwright error context与Run证据，检查注入事件和隔离服务日志；不随机换seed掩盖失败。
- 完整验证命令：`pnpm verify:stage -- --stage V1.3 --suite code` 与 `pnpm test:e2e -- --stage V1.3`；本轮分别exit 0，完整矩阵33 passed。成功日志：[定向/完整矩阵](../../../evidence/audits/2026-10-12-v13-us-ordered-fill-full-e2e-a01.log)、[代码套件](../../../evidence/audits/2026-10-12-v13-us-ordered-fill-code-suite-a01.log)。


审计索引更新：本轮L16仅行语义复核见[A39](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a39.md)与[A85](../../../evidence/audits/2026-10-12-v1-current-gap-matrix-a85.json)；其它146条矩阵行沿用前版结论，仍需语义复核。

### 8.92 V1.3 当前树完整隔离Web/API/CLI矩阵复跑（2026-10-12）

当前树执行 `pnpm test:e2e -- --stage V1.3`，完整输出、退出码和SHA见[矩阵日志](../../../evidence/audits/2026-10-12-v13-current-tree-stage-e2e-a01.log)、[exit](../../../evidence/audits/2026-10-12-v13-current-tree-stage-e2e-a01.log.exit.txt)及[SHA-256](../../../evidence/audits/2026-10-12-v13-current-tree-stage-e2e-a01.log.sha256)。Chromium Playwright 33/33通过；每个测试用自己的隔离TestRun，经Web/API/CLI执行并校验事实；覆盖CN_A/US_EQUITY固定MANUAL/AUTO订单与成交、拒绝、取消/恢复、UNKNOWN与Trade重启、OD-014严格现金边界、US AAPL乱序Fill及结算账本。错误模式/身份请求按预期拒绝；真实券商调用0、外部来源调用0。随机项目`sq-v13-web-19c2ba04d94ef8b70a26`的Web/API及五个服务、PostgreSQL容器，卷和网络全部精确移除并核验。

本次证明当前树固定矩阵自动回归PASS，不证明全部市场/订单语义、完整故障多seed、Ubuntu或本人验收。TestRun的`manualConclusion`保留`NOT_RUN`；V1.3/L16/P3/V1正式状态不变。

### 8.93 Trade→Portfolio实际V1客户端逐操作超时合同（2026-10-12）

当前生产源码中Trade Execution实际调用Portfolio的五个生成客户端方法为`reserveAccountResources`、`recordAccountFill`、`correctAccountFillFee`、`settleAccountReceivables`和`resolveAccountReservation`。已有直接测试覆盖路由/身份/载荷/拒绝透传，但此前只有结算调用明确断言超时。本轮新增`uses the declared bounded timeout for every V1 Trade→Portfolio operation`，逐一调用上述五个方法，断言五次请求均创建5000ms `AbortSignal.timeout`。未改生产行为或API合同。

验证：`pnpm --filter @stockquant/trade-execution-service exec vitest run tests/unit/portfolio-account-client.spec.ts` 6/6通过；同服务`typecheck`退出0。[定向测试日志](../../../evidence/audits/2026-10-12-v1-trade-portfolio-timeouts-a01.log)、[typecheck日志](../../../evidence/audits/2026-10-12-v1-trade-portfolio-timeouts-typecheck-a01.log)、语义复核[A44](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a44.md)。测试源码SHA-256：`94d9e8b4deefeaa6c6c3bb74e214503038238a0ce0f8ff6a5bb501bdba8fa197`。

本测试只锁定五个Trade→Portfolio调用的统一超时预算，不证明其它身份/路由/副作用、迁移发布、活动切换/回退或配对恢复完整；V1.1-S2-L14/P1、V1.3阶段及V1版本验收继续OPEN。

### 8.94 V1.3 L16 PostgreSQL多种子成交事件到达序列（2026-10-12）

Trade持久化集成脚本新增24个固定种子（20260907–20260930），每个种子创建独立MANUAL SEQUENCED订单并向真实隔离PostgreSQL repository注入累计成交序号1/2/3。日志逐Run记录实际注入顺序与orderId；24次覆盖六种排列。每Run核对游标推进至3、无待处理Inbox、成交数量200、3条Fill/Outbox、独立FakeBroker现金7996.2500及200股持仓；重复三条报告均为幂等，已消费序号改费率以冲突拒绝且不增加事实。

验证命令`pnpm --filter @stockquant/trade-execution-service test:integration:persistence:isolated` exit 0，Trade持久化脚本SHA-256 `67e5c0ce74e3f25b97dca59383488697e68fbe096fb166525df6706a599dfde3`；PostgreSQL 16.9 Alpine镜像digest `sha256:9e9764474d0c70ceff17378a6eca55b00c98d2f4d564be06a8e82f2431b3caa2`，专属loopback容器清理完成、未连接活动服务。[完整日志](../../../evidence/audits/2026-10-12-v13-seeded-event-order-persistence-a01.log)，SHA-256 `4794104f2be978402e26594a6f8cf36ed94ddb72725cce45fb2b0bc53992c5c7`。

本增量只验证PostgreSQL持久化层的三类Fill事件到达排列及重放/冲突，不覆盖随机故障组合、Web/API/CLI同Run观察、取消与Fill混合序列、服务重启或目标Ubuntu。V1.3-S2-L16/P3及V1验收继续OPEN。

### 8.95 V1.3当前树多种子持久化与服务端模式边界完整代码套件（2026-10-12）

更新24-seed持久化测试后，受控重跑`pnpm verify:stage -- --stage V1.3 --suite code` exit 0。完整套件含通用baseline/合同/Fixture、V1.3 Trade PostgreSQL事件/Outbox恢复与24-seed六排列矩阵、Portfolio/Trade/Governance隔离HTTP+PG模式边界、服务身份、V1迁移及V24 readiness；本次隔离容器报告`activeServices=NOT_CONNECTED`并完成清理。首轮沙箱因127.0.0.1 loopback绑定EPERM失败已保留，受控重跑相同命令通过。[完整日志](../../../evidence/audits/2026-10-12-v13-seeded-event-order-code-suite-a01.log)，SHA-256 `6d2dc653b70a0bbc9001a4c88aea7e093755e419d3547ef77feda8479564a2d2`，exit 0。

此代码套件确认当前V1.3已映射范围自动通过，不关闭L16/P3全部故障/市场路径、L17全服务/Worker/页面写边界、V1.1活动切换回退、Ubuntu或人验。L17单项语义结论见[A47](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a47.md)及[A93派生矩阵](../../../evidence/audits/2026-10-12-v1-current-gap-matrix-a93.json)。

### 8.96 V1.3 L16 PostgreSQL多种子Fill/取消混合事件到达序列（2026-10-12）

在Trade Execution真实隔离PostgreSQL持久化集成中，新增24个固定种子`20261001–20261024`。每条独立MANUAL SEQUENCED订单在撤单请求后接收两份累计Fill（序号1/2，累计50/125股）和一个Accepted Cancel Result（序号3），由seed打乱实际事件到达；日志逐订单保存seed、orderId及`sequence/eventType`注入顺序，覆盖六种排列`123/132/213/231/312/321`。

每种排列均验证序列游标到3、Inbox无未应用事件、最终状态CANCELLED、两条Fill累计125股、Fill Outbox恰两条、独立FakeBroker余额`8747.5000`及持仓125股；Fill仍待投递时Reservation Resolve为0。三类事件精确重放均幂等，同序号不同撤单事实被拒且订单、Fill和Outbox数量不变。随机隔离PostgreSQL镜像digest为`sha256:9e9764474d0c70ceff17378a6eca55b00c98d2f4d564be06a8e82f2431b3caa2`，仅loopback端口，容器/网络清理验证通过，活动服务`NOT_CONNECTED`。

专项命令`pnpm --filter @stockquant/trade-execution-service test:integration:persistence:isolated`通过；完整`pnpm verify:stage -- --stage V1.3 --suite code`受控重跑exit 0（包含构建、lint、typecheck、全Stage代码/服务集成、迁移与合同）。保留普通沙箱loopback EPERM首轮失败，未把它计作通过。日志：[混合事件完整代码套件](../../../evidence/audits/2026-10-12-v13-mixed-event-current-code-suite-a01.log)、[exit](../../../evidence/audits/2026-10-12-v13-mixed-event-current-code-suite-a01.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v13-mixed-event-current-code-suite-a01.log.sha256)；[专项运行](../../../evidence/audits/2026-10-12-v13-seeded-mixed-event-persistence-a01.log)。

本增量关闭L16的PostgreSQL多种子混合事件序列子项；不等价于把24个种子逐一通过Web/API/CLI执行，也不覆盖不同取消结果、进程/主机/多服务同时故障、Ubuntu或人工验收。L16/P3及V1仍OPEN。语义边界见[A48](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a48.md)。

### 8.97 V1.3 L16 Web/API/CLI撤单结果先到的因果恢复（2026-10-12）

新建同Run CN_A/200股MANUAL Paper场景：先从Web执行seq=1累计100股Fill，随后经Platform API持久化撤单请求，预留仍为HELD；再经API提交seq=3 Accepted Cancel Result，响应明确为`buffered=true`、游标仍为1、订单保持`CANCEL_REQUESTED`；最后由Web提交缺失的seq=2累计150 Fill，Trade按因果顺序应用Fill与seq=3撤单，完成订单状态CANCELLED和预留释放。最终Fill为100+50股，FakeBroker余额8495.0000 CNY、持仓150股，独立对账MATCH；同一TestRun CLI `--check-only`核验订单、现金、预留状态通过。TestRun `7946950e-cc62-421a-a647-7125ff4344a2`，自动验收`manualConclusion=NOT_RUN`。

为支持该有效时序，Platform L07取消请求现在接受精确的首个100股部分Fill序列；L07取消结果收到时若Trade报告其仍在序号缺口中，则返回当前CANCEL_REQUESTED投影并保留预留，不误报取消已完成。unit新增覆盖首Fill后可请求撤单及seq3早到时继续pending；单测11/11，Web typecheck通过。`pnpm verify:stage -- --stage V1.3 --suite code`完整代码套件退出0，`pnpm test:e2e -- --stage V1.3`当前树完整浏览器矩阵34/34通过；首个普通沙箱loopback EPERM失败保留，受控隔离运行通过且随机容器/数据库卷/网络全部移除。日志见[定向Web/API/CLI E2E](../../../evidence/audits/2026-10-12-v13-l16-mixed-web-e2e-a01.log)、[此前34项E2E](../../../evidence/audits/2026-10-12-v13-l16-mixed-full-web-e2e-a01.log)、[完整代码套件](../../../evidence/audits/2026-10-12-v13-l16-mixed-full-code-suite-a01.log)。

此关闭L16一个混合事件同Run Web/API/CLI恢复子项，并与§8.96多种子PostgreSQL序列互补；不表示24个种子逐一有Web/API/CLI观察，也不覆盖所有拒绝/Worker/宿主故障。L16/P3、V1.3人工签收和整体V1仍OPEN。


### 8.98 V1.3 L16 多种子Web/API/CLI因果成交与撤单（2026-10-12）

新增两个相互独立的V1.3 Web TestRun，分别明确保存seed `20261013`、`20261014`，均通过正式页面启动账户、创建/批准MANUAL提案、由页面提交成交，并由API发出撤单请求/结果；最后同Run CLI `--check-only`检查。seed `20261013`先投递seq=2并确认缓冲，再投递seq=1使两个Fill按因果顺序应用，之后请求撤单并提交seq=3；seed `20261014`依次应用seq=1、seq=2后请求撤单并提交seq=3。两个Run均断言Fill为100+50股、最终CANCELLED、FakeBroker现金`8495.0000 CNY`、持仓150股、预留RELEASED且对账MATCH。Run分别为`54d3fa63-9958-4dee-95bd-7fb0c1481225`和`4227466c-08d0-48cf-b869-8750297de068`。

定向隔离Playwright 2/2通过；`pnpm verify:stage -- --stage V1.3 --suite code`受控exit 0；完整`pnpm test:e2e -- --stage V1.3`为36/36通过。完整矩阵的本轮项目为`sq-v13-web-78aa275819dbf8be51d8`，真实数据源/券商调用为0，随机容器、卷、网络精确清理通过。[定向日志](../../../evidence/audits/2026-10-12-v13-l16-multiseed-e2e-a02.log)、[完整36项日志](../../../evidence/audits/2026-10-12-v13-l16-multiseed-full-e2e-a01.log)、[完整代码套件](../../../evidence/audits/2026-10-12-v13-l16-multiseed-code-suite-a01.log)、[退出码](../../../evidence/audits/2026-10-12-v13-l16-multiseed-full-e2e-a01.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v13-l16-multiseed-full-e2e-a01.log.sha256)。首轮缺少Playwright API请求上下文的`sq_session`而收到401；修正为先由浏览器完成会话Cookie建立后，定向重跑通过。失败运行日志及Harness清理信息保留于[a01](../../../evidence/audits/2026-10-12-v13-l16-multiseed-e2e-a01.log)。

本增量将L16从一个同Run代表性案例扩展至三个不同seed和三个有效成交/撤单到达顺序；仍不证明24个数据库seed逐一经Web执行，也不覆盖全量拒绝/故障/市场矩阵、Ubuntu或人工验收。L16/P3及V1保持OPEN。

### 8.99 P0/L17跨版本取消与事件确认模式边界增量（2026-10-12）

A108将四种固定客户端模式载荷（PAPER/FAKE、LIVE/FAKE、BACKTEST/REAL、LIVE/REAL）补到V1.2 Qlib Run取消、V1.4回测Run取消、V1.5 Run Incident确认与V1.5 AUTO取消入口。所有拒绝为422，并分别核对Qlib取消意图、回测取消标记、Incident状态或既有AUTO取消事实不变；随后合法取消/确认路径仍然有效。V1.2四场景隔离Web/API/CLI E2E、V1.4完整隔离Harness、V1.5标准完整Harness及专用AUTO取消Harness均通过并精确清理随机容器/卷/网络，真实来源/券商调用0。机器语义/证据清单见[A108](../../../evidence/audits/2026-10-12-v1-l17-cancel-mode-boundaries-a108.json)。

这仅增加若干Platform端点的负向原子覆盖，不等于穷尽所有V1.1–V1.5服务/Worker路由，也不证明页面所有控件和浏览器状态写入面安全。活动发布/回退仍未授权，L17/P3/P0与V1整体保持OPEN；各Run人工结论未被改变。

### 8.100 P0/L17 Portfolio结算入口模式载荷拒绝（2026-10-12）

扩展Portfolio隔离HTTP+PostgreSQL smoke：对`/internal/v1/accounts/:accountId/settlements`逐一提交PAPER/FAKE、LIVE/FAKE、BACKTEST/REAL、LIVE/REAL载荷。该路由只接受精确的`asOf`字段，四次均以400拒绝；逐次读取现金、ledger version、ledger entries、sell settlements和reservations，所有事实保持不变。当前完整Portfolio集成执行6/6，8条路由×4身份授权矩阵32/32通过，临时PostgreSQL容器/网络精确清理，活动服务未连接。TestRun `d3c1d860-6031-4faf-a337-cc758f767e9d`。源码Hash、日志与命令见[A109机器报告](../../../evidence/audits/2026-10-12-v1-portfolio-settlement-mode-boundary-a109.json)和[完整日志](../../../evidence/audits/2026-10-12-v1-portfolio-settlement-mode-boundary-a109.log)。

这是Portfolio一个结算写路由的原子验证；不关闭L17/P0/P3，也不证明全部V1服务/Worker路由、页面控件/状态写入面、发布回退或人验。结算规则及OD-014严格已结算现金行为未更改。

### 8.101 P0/L17 Portfolio结算模式拒绝保持真实到期应收（2026-10-12）

在§8.100的结算请求矩阵上增加真实待结算业务事实：隔离HTTP流程先买入并卖出固定CN_A 100股，建立到期应收CNY 995.0000；在到期`asOf`时间分别提交四种模式载荷。四次请求均按精确`asOf`合同返回400，且逐次核对现金仍为8995.0000、ledger version/分录/预留不变、应收仍为PENDING。随后仅提交合法`{asOf}`请求，接口返回201，应收转为SETTLED，现金变为9990.0000。完整Portfolio集成6/6、八路由×四身份授权矩阵32/32通过，活动服务未连接，隔离数据库/网络已精确清理。首轮因误将合法POST的201状态断言为失败而退出；业务状态已正确结算，修正断言后的完整复跑通过，诊断见[首轮说明](../../../evidence/audits/2026-10-12-v1-portfolio-settlement-due-mode-boundary-a110-first-attempt.txt)。报告与完整执行输出见[A110](../../../evidence/audits/2026-10-12-v1-portfolio-settlement-due-mode-boundary-a110.json)及[成功日志](../../../evidence/audits/2026-10-12-v1-portfolio-settlement-due-mode-boundary-a110.log)。

此自动检查仅证明一个固定合成日历下的Portfolio结算入口；OD-014严格已结算现金规则未改变，L17/P0/P3/V1与人工验收仍OPEN。

### 8.102 A110后V1.3当前树完整代码套件复验（2026-10-12）

在§8.101 Portfolio实际到期应收HTTP边界测试后运行`pnpm verify:stage -- --stage V1.3 --suite code`，受控完整套件exit 0。完整输出包括baseline、合同/Fixture、服务分层、代码测试、隔离PostgreSQL和服务身份HTTP矩阵、数据库迁移验证；A110的结算模式矩阵被实际执行，四种注入均拒绝且待结算应收保持PENDING。所有随机测试容器/网络均报告精确清理，活动服务保持`NOT_CONNECTED`。日志、退出码和SHA-256见[当前树完整套件](../../../evidence/audits/2026-10-12-v13-a110-current-code-suite-a01.log)、[exit](../../../evidence/audits/2026-10-12-v13-a110-current-code-suite-a01.log.exit.txt)和[sidecar](../../../evidence/audits/2026-10-12-v13-a110-current-code-suite-a01.log.sha256)。首轮沙箱无法绑定127.0.0.1导致seed:paper两项EPERM、其余65/67通过；受控权限同命令复跑完整通过，首轮环境诊断保留于[此记录](../../../evidence/audits/2026-10-12-v13-a110-code-suite-sandbox-failure.txt)。

这复核的是V1.3当前代码套件，不代表V1.3阶段人验、全V1/P0语义穷尽、目标Ubuntu或正式V1验收完成。

### 8.103 P0/L16 撤单拒绝后同单恢复与重试（2026-10-12）

新增固定Web/API/CLI场景，使用一个隔离V1.3 TestRun和CN_A 600000.SH 200股MANUAL订单：按序提交100股与累计150股两笔Fill后请求撤单；FakeBroker在seq=3返回`REJECTED`。Trade恢复订单为`PARTIALLY_FILLED`，Portfolio预留仍为`HELD`、金额1505.0000 CNY，Fill序列与MATCH读回一致。CLI以同一TestRun和订单`--check-only`返回未完成exit 2，并识别PARTIALLY_FILLED/HELD。随后再次请求同一订单撤单，以seq=4 `ACCEPTED`完成取消，订单为`CANCELLED`，预留只在权威接受结果后转`RELEASED`。定向E2E 1/1；V1.3完整隔离Web/API/CLI 37/37，随机项目容器/卷/网络精确清理，真实数据源/券商调用0。TestRun `9c165b97-67ba-4f4a-8c48-574c51786846`，`manualConclusion=NOT_RUN`。完整日志与退出码见[完整隔离E2E](../../../evidence/audits/2026-10-12-v13-l16-cancel-rejection-full-e2e-a02.log)、[E2E exit](../../../evidence/audits/2026-10-12-v13-l16-cancel-rejection-full-e2e-a02.exit.txt)；单场景复验TestRun `dee22c19-6d0a-4556-a23b-aaee890832ed`。

可执行入口：`STOCKQUANT_V13_E2E_GREP='V1.3 L16 rejected cancel' pnpm test:e2e:v13-isolated`运行单场景；完整浏览器回归使用`pnpm test:e2e:v13-isolated`。脚本在随机项目中启动真实PostgreSQL、Platform/Trade/Portfolio服务和容器化Web，首页为`/acceptance/v1/v1.3`，固定输入由页面创建的CN_A MANUAL L07 Proposal及两笔seq=1/2成交构成；拒绝与接受通过`/api/v1/acceptance/v1/v1.3/runs/{testRunId}/proposals/{proposalId}/orders/{clientOrderId}/cancel-results/{sequence}`提交。浏览器E2E单项超时60秒。预期拒绝后读回PARTIALLY_FILLED/HELD，CLI check-only exit 2；重试接受后CANCELLED/RELEASED。脚本结束后随机容器、卷、网络精确移除；失败时保留日志并先诊断，不更换seed重试。

该场景关闭的是固定CN_A订单撤单拒绝/同单重试子项；不覆盖所有撤单拒绝原因、US拒绝变体、其它Worker/宿主故障、市场规则、Ubuntu或人工验收，L16/P3及V1仍OPEN。


### 8.104 P0/L16 US_EQUITY/AAPL 撤单拒绝后同单恢复与重试（2026-10-12）

在固定US_EQUITY/AAPL 200股MANUAL订单中，经Web创建同一V1.3 TestRun，按序提交100股和累计150股Fill后请求撤单；seq=3 `REJECTED`后订单恢复`PARTIALLY_FILLED`，Portfolio预留保持`HELD`、金额USD 3750.0500，现金USD 6249.9500、持仓150股，FakeBroker与Portfolio为`MATCH`。同Run CLI `--check-only`返回2并读回工作态/预留。再次对同订单请求撤单，seq=4 `ACCEPTED`后订单`CANCELLED`、预留`RELEASED`，现金和持仓不变且仍MATCH。TestRun `4e3368c9-555c-49ca-9b62-7b3dbe95435d`；定向隔离Web/API/CLI E2E 1/1通过，随机容器/卷/网络精确清理，真实来源/券商调用0。

可执行命令：`STOCKQUANT_V13_E2E_GREP='US_EQUITY L16 rejected cancel' pnpm test:e2e:v13-isolated`。运行入口`/acceptance/v1/v1.3`，固定输入为Fixture中的US_EQUITY/AAPL L07提案、两笔部分Fill、拒绝seq=3及接受seq=4；单项超时60秒。定向日志[US拒绝恢复E2E](../../../evidence/audits/2026-10-12-v13-l16-us-cancel-rejection-e2e-a01.log)，SHA-256 `494232cfd513976a74f74027fadb57389e8e01e355ee40e21542c730552806ed`。

新增应用层重放边界：订单已因seq=3拒绝恢复PARTIALLY_FILLED后，允许相同seq=3结果再次到达Trade，由持久事件指纹返回幂等重放；同序号改为ACCEPTED由Trade拒绝为409，之后seq=4真实接受仍可完成撤单。Platform单测14/14、构建、Web typecheck、contracts检查通过；定向隔离E2E 1/1，完整V1.3矩阵38/38，完整代码套件exit 0。保留首次整套37/38中的CN_A撤单409失败，原场景独立重现1/1通过，第二次完整38/38通过。日志：[定向E2E](../../../evidence/audits/2026-10-12-v13-l16-us-cancel-rejection-idempotency-e2e-a02.log)、[完整E2E](../../../evidence/audits/2026-10-12-v13-l16-us-cancel-rejection-idempotency-full-e2e-a02.log)、[完整代码套件](../../../evidence/audits/2026-10-12-v13-l16-us-cancel-rejection-idempotency-code-suite-a01.log)、[首轮失败矩阵](../../../evidence/audits/2026-10-12-v13-l16-us-cancel-rejection-idempotency-full-e2e-a01.log)、[CN单场景复现](../../../evidence/audits/2026-10-12-v13-l16-cn-cancel-rejection-retry-repro-a01.log)。


### 8.105 P0/L17 V1.3 Trade完整客户端模式注入矩阵（2026-10-12）

Trade Execution隔离HTTP/PostgreSQL smoke现对13条受保护写路由逐项注入六种组合：`PAPER/FAKE`、`LIVE/FAKE`、`PAPER/REAL`、`BACKTEST/FAKE`、`BACKTEST/REAL`、`LIVE/REAL`。Paper订单提案执行、结算、外部模拟单、模拟成交回报、费用更正、订单状态转换、撤单结果和Outbox补偿均拒绝客户端模式字段（HTTP 422）；拒绝前后订单、成交、事件及Outbox事实保持不变。历史执行入口也拒绝六种客户端注入，但由服务端确定的`BACKTEST/FAKE`路径仍可到达业务校验。

V1.3完整代码套件 `pnpm verify:stage -- --stage V1.3 --suite code` exit 0，隔离数据库/容器/网络清理通过；活动服务为`NOT_CONNECTED`。成功日志及退出码、SHA-256：[code suite](../../../evidence/audits/2026-10-12-v13-l17-trade-mode-matrix-code-a02.log)、[exit](../../../evidence/audits/2026-10-12-v13-l17-trade-mode-matrix-code-a02.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v13-l17-trade-mode-matrix-code-a02.log.sha256)。首次运行因Crosswalk精确测试名未同步而被检查器拦截，诊断保留：[a01](../../../evidence/audits/2026-10-12-v13-l17-trade-mode-matrix-code-a01.log)。

此项关闭V1.3 Trade固定路由的客户端模式注入原子子项。V1.1–V1.5全服务/Worker路由穷尽、页面状态/余额写入审计、活动发布与回退、阶段验收、Ubuntu验证和用户签收仍未完成；L17/P0及V1保持OPEN。

### 8.106 P0/L17 V1.3 Platform完整客户端模式注入矩阵（2026-10-12）

扩展现有Platform Proposal拒绝模式注入的隔离浏览器场景，将Run创建、账户初始化、Proposal创建、外部订单观察、Proposal修订/审批、Mandate创建/激活/暂停、三种Execution提交，以及sequenced Fill报告、撤单请求和撤单结果三个bodyless写入口，统一覆盖六种客户端模式组合：`PAPER/FAKE`、`LIVE/FAKE`、`PAPER/REAL`、`BACKTEST/FAKE`、`BACKTEST/REAL`、`LIVE/REAL`。16个写操作共96次请求均返回422；合法服务端`PAPER/FAKE`仍可创建。拒绝后无FakeBroker订单或成交，Portfolio账本分录数和版本不变。真实隔离Web/API/CLI场景通过，随机容器、卷和网络精确清理，真实来源/券商调用为0。

完整V1.3浏览器矩阵`pnpm test:e2e -- --stage V1.3`38/38通过，完整代码套件`pnpm verify:stage -- --stage V1.3 --suite code` exit 0。首轮完整回归37/38，失败为既有L16取消拒绝恢复场景的瞬时409；该场景独立隔离重跑1/1通过，随后完整矩阵38/38通过。失败和重跑均保留：[首轮E2E失败](../../../evidence/audits/2026-10-12-v13-l17-platform-six-mode-e2e-a02.log)、[L16定向复验](../../../evidence/audits/2026-10-12-v13-l16-cancel-rejected-targeted-a01.log)、[完整E2E通过](../../../evidence/audits/2026-10-12-v13-l17-platform-six-mode-e2e-a03.log)、[E2E退出码](../../../evidence/audits/2026-10-12-v13-l17-platform-six-mode-e2e-a03.log.exit.txt)、[E2E SHA-256](../../../evidence/audits/2026-10-12-v13-l17-platform-six-mode-e2e-a03.log.sha256)、[code suite](../../../evidence/audits/2026-10-12-v13-l17-platform-six-mode-code-suite-a03.log)、[code suite退出码](../../../evidence/audits/2026-10-12-v13-l17-platform-six-mode-code-suite-a03.log.exit.txt)、[code suite SHA-256](../../../evidence/audits/2026-10-12-v13-l17-platform-six-mode-code-suite-a03.log.sha256)。

该原子覆盖补足V1.3 Platform固定写路径模式注入矩阵的一部分，不证明全部V1版本服务/Worker写路由和页面状态写入面均已审计。L17/P0、V1.3阶段签收、目标Ubuntu/恢复和用户验收仍开放。

### 8.107 P0/L17 V1.3部分成交撤单与费用更正模式注入补齐（2026-10-12）

在§8.106现有隔离V1.3 Platform模式矩阵中，增加`cancel-partial-fill`部分成交后撤单和`fee-corrections`成交费用更正两条写路由，每条分别提交六种客户端`environmentMode`/`brokerMode`组合。12次请求均返回422；模式载荷在订单/Fill读取和变更前被拒绝。总矩阵增至18个写操作、108次请求。场景最终核对Portfolio现金、持仓、账本分录数和版本与基线相同，FakeBroker订单/成交均为0，外部对账未变化；新增隔离E2E 1/1、完整浏览器E2E 38/38与V1.3 code suite均exit 0。随机容器、卷和网络精确清理；新Run人工结论仍`NOT_RUN`。[定向日志](../../../evidence/audits/2026-10-12-v13-l17-mutation-mode-e2e-a01.log)、[完整E2E](../../../evidence/audits/2026-10-12-v13-l17-mutation-mode-full-e2e-a01.log)、[code suite](../../../evidence/audits/2026-10-12-v13-l17-mutation-mode-code-suite-a01.log)。

该项仅补齐两条固定Platform写路径，其他V1服务/Worker/Web写入、发布回退、Ubuntu、恢复范围及人工验收仍未闭合，L17/P0/V1继续OPEN。

### 8.108 P0/L17 V1.3提案拒绝决策模式注入补齐（2026-10-12）

同一隔离V1.3 Platform场景分别向提案`approve`和`reject`两个决策分支提交六种客户端交易模式组合；新增`reject`动作的6次注入均返回422，明确服务器固定交易模式校验发生在拒绝状态变更之前。总矩阵增至20个写操作、120次请求。提案状态/版本/内容Hash、Portfolio账本及FakeBroker事实均不变。定向E2E 1/1、完整V1.3 E2E 38/38及完整code suite exit 0，资源清理通过；当前Run人工结论仍`NOT_RUN`。[定向E2E](../../../evidence/audits/2026-10-12-v13-l17-mutation-mode-e2e-a02.log)、[完整E2E](../../../evidence/audits/2026-10-12-v13-l17-mutation-mode-full-e2e-a02.log)、[code suite](../../../evidence/audits/2026-10-12-v13-l17-mutation-mode-code-suite-a02.log)。

本原子项只补齐提案拒绝分支；跨版本其余服务/Worker/Web写入、发布回退、Ubuntu、配对恢复及人验仍未闭合，P0/L17/V1保持OPEN。

### 8.109 OD-014服务Schema变更后的V1.3 Web/API/CLI回归（2026-10-12）

Portfolio/Trade schema v3及可空结算日合同更新后，`pnpm test:e2e -- --stage V1.3`隔离运行通过：Playwright 38/38，覆盖CN_A/US_EQUITY Paper交易、MANUAL/AUTO严格已结算现金与混合SELL/BUY路径、恢复/重试及同Run CLI核验。随机Compose项目、PostgreSQL卷和网络精确移除；外部数据源与真实券商调用均为0。新Run证据已结构化导出，但`manualConclusion=NOT_RUN`。

[运行日志](../../../evidence/audits/2026-10-12-v13-od014-settlement-regression-e2e-a01.log)、[exit](../../../evidence/audits/2026-10-12-v13-od014-settlement-regression-e2e-a01.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v13-od014-settlement-regression-e2e-a01.log.sha256)。该兼容性回归不覆盖未知日历Web场景或完整版本验收。

### 8.110 V1.3-S2-L15当前树事件排序与持久恢复复核（2026-10-12）

当前树序列器定向单测3/3通过；隔离PostgreSQL HTTP恢复场景exit 0，验证Portfolio响应丢失后Trade重启/Outbox租约接管、旧写入fencing、Fill/Cancel乱序跨重启缓冲与排空、幂等入账和独立FakeBroker对账。未知日历SELL应收保持PENDING、现金不释放，BUY尝试409。随机容器/网络精确移除，活动服务未连接。Run `9a65bab0-8a5f-4730-a87e-d8b09cf4482e`的最终订单CANCELLED、累计75股、现金8230.4780 CNY、Reservation RELEASED。详细范围与日志、exit和SHA见[A121](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a121.md)。该固定恢复路径不关闭L15更广故障/订单状态覆盖、P3或阶段/版本人工验收。

### 8.111 V1.3-S2-L16多种子当前Schema回归复核（2026-10-12）

当前Schema的V1.3完整隔离Web/API/CLI回归38/38通过，重跑覆盖§8.96–§8.98所列24-seed PostgreSQL排列之外的三条固定Web/API/CLI因果顺序；当前Run均验证Fill/Cancel终态、账本MATCH、预留释放和同Run CLI。完整回归日志与边界分析见[A122](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a122.md)及[§8.109日志](../../../evidence/audits/2026-10-12-v13-od014-settlement-regression-e2e-a01.log)。24个数据库seed未逐个通过Web执行，更广故障矩阵、Ubuntu和本人验收仍未完成；L16/P3保持OPEN。

### 8.112 V1.3-S2-L16撤单拒绝先到时保留预留并同单恢复（2026-10-12）

新增CN_A固定因果路径：seq=1部分Fill入账后请求撤单，seq=3 `REJECTED`在缺失seq=2 Fill时先到，服务端将撤单结果缓冲并保持`CANCEL_REQUESTED`，Portfolio Reservation继续`HELD`；随后补交seq=2，序列器按序应用两笔Fill及拒绝结果，订单恢复`PARTIALLY_FILLED`，现金CNY 8495.0000、持仓150股，FakeBroker/Portfolio对账`MATCH`。同Run CLI `--check-only`核验中间未完成状态；对同一订单重试撤单并提交seq=4 `ACCEPTED`后订单变为`CANCELLED`且预留`RELEASED`，账本仍MATCH。

定向隔离E2E 1/1、V1.3完整Web/API/CLI矩阵39/39和完整code suite exit 0通过；随机项目容器、PostgreSQL卷和网络精确清理，外部来源及真实券商调用均为0。TestRun `71388ee9-fadb-4e7a-8526-e1b4f1e74323`，`manualConclusion=NOT_RUN`。首两次运行仅因测试对响应投影层级的预期不符而失败，日志保留为诊断；修正合同断言后定向测试通过。[a01](../../../evidence/audits/2026-10-12-v13-l16-early-rejected-cancel-e2e-a01.log)、[a02](../../../evidence/audits/2026-10-12-v13-l16-early-rejected-cancel-e2e-a02.log)、[定向通过a03](../../../evidence/audits/2026-10-12-v13-l16-early-rejected-cancel-e2e-a03.log)、[全量E2E](../../../evidence/audits/2026-10-12-v13-l16-early-rejected-cancel-full-e2e-a01.log)、[code suite](../../../evidence/audits/2026-10-12-v13-l16-early-rejected-cancel-code-suite-a01.log)。

此证据补充一个固定拒绝事件的因果恢复组合，不证明24个种子逐一Web运行、其它拒绝原因、Worker/主机组合故障或完整市场矩阵。L16/P3、阶段与V1验收仍开放。

### 8.113 V1.3-S2-L16 撤单前置拒绝无副作用与乱序恢复（2026-10-12）

新增固定CN_A Web/API/CLI路径。订单已被FakeBroker接受但尚无任何Fill时请求撤单，服务端返回409；核对订单仍为ACCEPTED、Fill为空、现金CNY 10000.0000、Reservation仍HELD。随后仅提交seq=2的累计Fill，事件因缺少seq=1而缓冲；撤单请求仍返回409，Reservation继续HELD。补交seq=1后，两笔Fill以100/50股按序入账，撤单请求及seq=3接受结果成功，最终订单CANCELLED、现金8495.0000、持仓150股、Reservation RELEASED，FakeBroker与Portfolio对账MATCH。前置拒绝的中间事实和最终业务事实均经同Run CLI `--check-only`核验。

定向隔离E2E 1/1、完整当前V1.3 Web/API/CLI矩阵40/40、完整V1.3 code suite exit 0；容器化Web构建通过，随机项目容器/卷/网络/镜像清理验证通过，真实数据源与券商调用0。正式回归TestRun `09d8b01c-72d5-4824-bd7b-c0e6be64e116`，人工结论`NOT_RUN`；同一目标的定向Run `e83b828f-c5a1-46a9-8b31-4c891a216809`也保持`NOT_RUN`。详细日志：[完整E2E](../../../evidence/audits/2026-10-12-v13-l16-cancel-precondition-full-e2e-a01.log)、[code suite](../../../evidence/audits/2026-10-12-v13-l16-cancel-precondition-code-suite-a01.log)、[定向TestRun证据](../../../evidence/local/V1.3/e83b828f-c5a1-46a9-8b31-4c891a216809/evidence.json)、[首次无效排列诊断](../../../evidence/audits/2026-10-12-v13-l16-invalid-event-order-diagnostic-a01.json)。

首次尝试把撤单请求置于任何已应用Fill之前，六种排列均在同一业务前置检查处HTTP 409终止，相关TestRun证据包均明确为`WAITING`/`NOT_RUN`；诊断结论为Harness排列违反L07撤单请求前置条件，不作为序列器六排列失败证据。修正后的测试专门验证该拒绝无副作用及有效乱序恢复。L16仍有其它撤单结果、市场/故障组合与全域恢复未覆盖，P3、阶段和V1验收维持OPEN。

### 8.114 V1.4共享Trade执行费用变更后的V1.3兼容回归（2026-10-12）

V1.4 US固定Fixture的费用/滑点修复触及共享Trade历史执行模块。为避免仅凭V1.4用例推断V1.3 Paper兼容性，受控执行完整命令`pnpm verify:stage -- --stage V1.3 --suite code`，exit 0。套件完成全仓类型/应用检查、V1.3相关Trade/Portfolio/Governance隔离PostgreSQL迁移与真实HTTP/授权/模式拒绝/持久化检查；服务报告`activeServices=NOT_CONNECTED`，临时容器和网络均已移除并验证。完整日志、exit和SHA见[V1.3 code suite](../../../evidence/audits/2026-10-12-v13-post-a142-code-suite-a01.log)、[exit](../../../evidence/audits/2026-10-12-v13-post-a142-code-suite-a01.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v13-post-a142-code-suite-a01.log.sha256)。

此项仅证明本次共享实现变更下V1.3代码/隔离集成回归通过；不证明真实券商、全规则覆盖、活动发布、Ubuntu或本轮人工验收。

### 8.115 P0/L17 Decision Governance AUTO Mandate写路由六模式HTTP+PostgreSQL矩阵（2026-10-12）

将Governance AUTO Mandate创建、激活、暂停，以及Trade对Mandate预算授权/结算的HTTP请求体模式注入从三种扩展为六种：`PAPER/FAKE`、`PAPER/REAL`、`BACKTEST/FAKE`、`BACKTEST/REAL`、`LIVE/FAKE`、`LIVE/REAL`。所有注入均422；拒绝后Mandate创建行数为0、激活保持PENDING、暂停保持ACTIVE且事件数不变、预算预留数不变。随后合法创建/激活/暂停仍成功。复用Governance/Replay/Quant完整隔离HTTP+PG smoke通过，随机容器/网络清理核验、活动服务`NOT_CONNECTED`。

日志：[Governance/Replay/Quant隔离HTTP+PG](../../../evidence/audits/2026-10-12-v1-l17-governance-six-mode-http-pg-a01.log)、[退出码](../../../evidence/audits/2026-10-12-v1-l17-governance-six-mode-http-pg-a01.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-l17-governance-six-mode-http-pg-a01.log.sha256)。此增量只关闭Mandate/预算上述服务端写路由模式字段子项；Proposal执行授权路由的剩余组合、其它服务/Worker/UI写路径、全量兼容和L17父项继续OPEN。

### 8.116 P0/L17 Decision Governance Proposal与历史回测授权六模式HTTP+PostgreSQL矩阵（2026-10-12）

Proposal审批/拒绝/修订、执行授权签发和验证五类写路由对六种客户端模式字段注入全部返回422；Proposal保持MANUAL_APPROVAL_PENDING、版本/hash不变且无Decision/Revision记录，授权保持ACTIVE且未被消费。历史回测授权入口只接受`BACKTEST/FAKE`：另五种组合422且授权行不变；合法组合创建唯一授权，按既有契约后续签发轮换authorizationId，原命令授权消费一次。Governance/Replay/Quant真实HTTP+随机隔离PostgreSQL smoke通过，容器和网络精确清理，活动服务`NOT_CONNECTED`。

隔离HTTP+PG日志：[a04](../../../evidence/audits/2026-10-12-v1-l17-governance-six-mode-http-pg-a04.log)、[exit](../../../evidence/audits/2026-10-12-v1-l17-governance-six-mode-http-pg-a04.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v1-l17-governance-six-mode-http-pg-a04.log.sha256)。修改后完整V1.3 `pnpm verify:stage -- --stage V1.3 --suite code`退出0，含服务测试、模式矩阵、隔离数据库迁移及Harness资源清理：[code suite](../../../evidence/audits/2026-10-12-v13-l17-governance-code-suite-a01.log)、[exit](../../../evidence/audits/2026-10-12-v13-l17-governance-code-suite-a01.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v13-l17-governance-code-suite-a01.log.sha256)。此证据只关闭上述Proposal/历史授权路由字段边界；其他调用者路径及L17父项继续OPEN。

### 8.117 当前候选重新验收（2026-10-13）

在获准的本机Docker执行范围重新运行`pnpm test:e2e -- --stage V1.3`，浏览器固定矩阵40/40通过；覆盖CN/US FakeBroker交易、拒绝、严格已结算现金、撤单/费用更正及Trade重启/乱序Fill恢复。业务级断言、CLI核对和隔离资源清理均通过，外部数据源/真实券商调用0。详细Run导出在`evidence/local/V1.3/`；浏览器捕获示例：[US乱序Fill重启恢复](../../../evidence/audits/2026-10-08-v13-browser-captures-sq-v13-web-e26e1fe971ebb28db2d7/V1-3-US-EQUITY-L07-applies-a-buffered-out-of-order-AAPL-Fill-after-Trade-Execution-restart-2fe70207542d7f04053c-322df941e30438e3245c.png)。复验汇总见[记录](../../../evidence/audits/2026-10-13-v1-acceptance-revalidation-a01.md)。

验收时同时发现TestRun投影问题：本次40个Platform StageRun导出仍为`WAITING`，对应两项StageRun断言也是`WAITING`；浏览器测试的独立业务断言通过并不能把这些Run视为COMPLETED。此生命周期/证据关联未被改写或签成PASS，V1.3正式自动验收及V1版本门禁保持OPEN；用户本次整版人工确认另见V1验收表。

### 8.118 V1.3正常手工成交写入可核对的StageRun结论（2026-10-14）

修正StageRun证据提取，使导出Envelope内的断言可与嵌套Run状态一起读取；新增显式`POST /api/v1/acceptance/v1/v1.3/runs/:testRunId/verify-normal`操作。此操作只在owner范围内核验已批准Proposal、FakeBroker原单/Fill、独立资产账与Portfolio账、精确100股及8995.0000 CNY现金、授权绑定和MATCH对账后，才把同一Run两项断言写为PASS并置COMPLETED；普通GET不产生状态变更。正式Web提供此操作，CLI对同一Run复核。

`pnpm test:e2e -- --stage V1.3`最终复验40/40通过；正常成交Run `973b73fc-0aef-4c60-abef-15c982322c46`导出状态COMPLETED、两项断言PASS、业务执行`MANUAL_FILL_VERIFIED`，Manifest SHA-256 `90c9b5e31a3cd7f606625954e000bcea8cfaddc55e1c9453221a1a4dbfc56322`。rejection/recovery及其他固定矩阵仍按实际结果保留WAITING/NOT_RUN，不据Web独立断言代改。V1.3定向Vitest 31/31及Platform/Web typecheck通过；首次自动完成尝试造成会话推进提前拒绝、脚本状态期望过时的失败均保留为诊断历史，修正后的完整E2E通过。外部来源和真实券商调用为0，隔离Docker资源精确清理通过。自动Run仍`manualConclusion=NOT_RUN`，整版新候选待用户验收。

# C5 本地工程 P1：候选与验收合同

范围 `C5_LOCAL_ENGINEERING_V1`；当前P1输入/合同已冻结，P2～P6未通过。现有六场景和目标Worker证据各自复用，不得拼接成新链通过。候选为已确认 `c5-daily-direction-v1`，源码 SHA-256 `2adb616611aaa26afb0d4206b2f4df0cd8f7e86c66a5b971d5ab55c4c75646c8`；`c5-local-risk-v1`、`c5-local-flat-fee-v1`，CN_A、600000.SH、CNY、隔离账户初始10000、单次100股、最大订单/敞口/日累计各2000、累计损失暂停200、每成交费用5。执行窗口09:31:00（含）至09:35:00（不含）、首个接受后的合格SNAPSHOT、最大60秒、100bps；每Run拥有独立owner/account/namespace、Clock、Governance测试Mandate和证据。账户无独立有效期，仅Mandate到期暂停。

新输入 [`v24-c5-local-engineering-1`](../../fixtures/v2/v2.4/c5-local-engineering-v1/manifest.json)：Manifest SHA-256 `0a0baf1eff9c758ae9a61b82aaa12fbf2959b9830c58fc3325f1059ce55dadfc`，input SHA-256 `96d1d2d21d4e07eab792dd5210b35f157b712743a9ddb2cb0101067ed89f90ea`，schema SHA-256 `d47cb98ccdfb100b68ad5ecb87996e25e58aacafdaa6992d2d425ece7f0a60d4`。全部合成FIXTURE，两个预热、五个评估会话：2024-01-04 BUY 100×10.2500、费用5，已结算现金8970；01-05 SELL 100×10.0000、费用5，应收995且现金仍8970；01-08结算后9965，后续HOLD，实际交易日历/市场事实不作结论。逐次数据与固定时刻见input，SNAPSHOT独立于DAILY_BAR。

固定版本化断言：`V2.4-C5-LOCAL-CHAIN-001` 同Run五会话策略/治理/执行/账本和独立对账；`V2.4-C5-LOCAL-SETTLEMENT-001` 上述现金、应收与结算；`V2.4-C5-LOCAL-REJECTION-001` 缺日线、未知/陈旧快照、Mandate到期/拒绝、窗口关闭零交易副作用；`V2.4-C5-LOCAL-RECOVERY-001` 响应丢失/Worker中断后先查原单、重用原身份、目标/订单/成交/账本/告警不重复；`V2.4-C5-LOCAL-WEB-CLI-001` Web/CLI同Run只读核对。另按主计划P3/P4验证日终差异OPEN→RESOLVED去重和30分钟本地实际计时器运行。故障事件实际顺序需在执行结果记录，不用seed代替。验收入口及结果合同需P2～P5实现；当前无本地整链专用可执行入口，状态 `NOT_IMPLEMENTED`，不得将既有`v24:paper-http-smoke`记作新链PASS。

校验：`pnpm fixtures:check`、`node scripts/validate-json.mjs packages/contracts fixtures`退出0；`pnpm --filter @stockquant/platform-api-service exec vitest run tests/unit/v24-local-engineering-fixture.spec.ts` 2/2通过，核验Hash/顺序、候选纯规则、窗口及独立十进制现金预期。单元计算不是实际FakeBroker/Portfolio执行。结果的工程状态、`humanAcceptance=NOT_RUN`、`actualObservation=DEFERRED/NOT_RUN`必须分别记录；原V2.4和V2版本门禁不由该本地结果改写。

P2启动复核：旧`v24_fixture_daily_targets`唯一约束为单Run一条，旧`clientOrderId`也只包含Run ID，无法表示一个Run多日买卖；因此新增本地范围隔离表并使用日期化订单身份，保留旧路径和历史证据。真实治理Mandate、持续后台任务/日线/采样/订单/日终链、Web与用户验收均尚未接入此新范围。

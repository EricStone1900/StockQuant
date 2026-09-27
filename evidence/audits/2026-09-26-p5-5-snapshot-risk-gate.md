# P5.5 确定性快照风险门（2026-09-26）

新增 `services/trade-execution-service/src/domain/v24-snapshot-risk.ts`，以显式传入的 `acceptedAt`、`evaluatedAt` 和报价时间执行纯函数判定，不读取系统时钟、不访问数据库、不写订单。判定包括支持市场、证券一致性、快照必须晚于信号接受、报价年龄上限、正且有限的价格、参考价最大偏离。价格偏离按 bps 计算并在 6 位小数处归一化，避免浮点表示误差让边界样例产生不稳定结果。

输出区分 `REJECTED`、`BLOCKED` 与 `PASS_RISK_CHECK`。偏离限值未设置时返回 `BLOCKED`；通过仅代表本次快照满足该风险检查，不授权策略、账户或下单，也不连接 FakeBroker。US市场仍被现行CN-only策略拒绝。策略版本、Mandate、费用/风控批准和OD-007参数未确认，因此没有配置真实值或启用该门。

验证：`pnpm --filter @stockquant/trade-execution-service test` 38/38通过；`pnpm --filter @stockquant/trade-execution-service build`通过；`pnpm docs:check` 检查661条本地链接、0失败；`git diff --check`通过。单测覆盖合格快照、超龄、接受前报价、证券不匹配、超偏离、未配置偏离、未支持市场及PASS不代表授权。

剩余：将策略/报价参数由批准来源版本化后，在隔离场景把该纯函数与Mandate readiness、资源预留和FakeBroker订单链组合；执行Web/CLI同run及恢复验收。当前仅为领域组件代码证据，P5.5、P5.6、Paper与人工验收继续未完成，活动服务未部署。

随后运行`pnpm verify:stage -- --stage V2.4 --suite code`，在本机隔离测试数据库可访问的环境退出0：合同76 JSON/41 schema/27 Fixture/30兼容规则、工作区构建/lint/typecheck、各服务/Web单测、Market Data PostgreSQL集成22/22及运维测试94/94通过。首次受限沙箱运行在Trade Execution专用PG集成依赖处因本机回环不可达退出2；获准的本机隔离环境重跑通过。该suite未改动活动观察数据，也未部署活动服务。

## 接入固定 Fixture 投影链（2026-09-26）

纯函数风险门已接入`calculateSnapshotFixtureExecution`：仅在PAPER+FAKE+FIXTURE、快照资格合格、资源/订单字段有效且风险检查PASS时返回`PROJECTED_ONLY`；风险参数缺失返回BLOCKED，市场/偏离等风险拒绝则不投影。投影额外记录报价年龄与偏离bps。Fixture采用CN-only测试配置；US固定Fixture投影仍可通过其独立的显式`US_EQUITY`配置，但生产执行策略仍由现有CN-only readiness拒绝US。没有调用FakeBroker或持久化订单。

旧冻结Fixture v1未改写；新增Fixture v2和独立Schema，固定合成参考价、1800秒新鲜度、20 bps限值及CN_A市场。其值仅供Fixture场景验证，不能视为项目所有者批准的生产策略。

改动后 接入后Trade Execution单测40/40、构建通过；另加未来报价及无时区时间拒绝边界。`pnpm contracts:generate`后合同生成检查验证41 schemas，`pnpm contracts:check`、`pnpm fixtures:check`、文档链接662/662及`git diff --check`通过。再次执行`pnpm verify:stage -- --stage V2.4 --suite code`退出0，含全仓构建/lint/typecheck、工作区单测、隔离服务集成和Market Data PostgreSQL 22/22、运维94/94。

限制：该函数仍只在固定Fixture helper内；正式行情→Mandate readiness→风险检查→资源预留→FakeBroker HTTP下单的Paper链尚未接线。没有新Paper TestRun、观察计数、生产部署或人工接受。

## 风险判定边界修正（2026-09-26）

独立复核发现评估时刻早于报价观测时刻可能产生负报价年龄。风险门现明确拒绝未来报价，并要求三个时刻均含显式UTC/偏移时区；新增两项回归断言。Trade Execution单测40/40、构建、V2.4完整code suite再次退出0，合同/Fixture与662条本地链接检查通过。

## 定点价格计算修正（2026-09-27）

后续审查发现即使将偏离bps输出舍入到6位，行情和参考价格仍先经`Number(...)`转换，阈值判定本身仍可能受到binary floating-point误差影响。现改为接受规范十进制字符串，以BigInt四位小数tick计算差值，并以未舍入的整数交叉乘积比较微bps限值；结果bps只作有限范围内的六位展示。价格格式超精度、指数形式、非正值或展示结果溢出均失败关闭。Fixture投影链传递原始十进制字符串，不再将价格转为number。

新增回归覆盖：10.0000对10.0001在零bps下拒绝；10.0100对10.0000在10bps边界通过；非规范精度/指数价格、超过策略精度和无法有限展示的极端偏离拒绝。Trade Execution单测42/42及typecheck通过。此修正仍只服务固定Fixture `PROJECTED_ONLY`，未接通生产行情、授权、资源预留或FakeBroker；Mandate和Paper人工验收仍未完成。

After the arithmetic correction, `pnpm verify:stage -- --stage V2.4 --suite code` exited 0 on 2026-09-27. The suite passed baseline docs/contracts/fixtures, workspace build/lint/typecheck, unit tests (285 across nine packages, including Trade Execution 42/42 and Qlib Worker Python boundary 3/3), isolated Trade Execution persistence and service-auth HTTP checks, P5.7 dual-database Fill/Outbox recovery smoke, Portfolio PostgreSQL integration (3/3) and Bearer HTTP smoke, Python Adapter (58/58), operations tests (94/94), and Market Data PostgreSQL integration (22/22). The first sandbox run stopped before the Worker HTTP tests because loopback bind was denied; the same command was rerun with local test access and passed. All database paths were dedicated test databases; no active Paper/observation service, production row, user signature, or observation counter was changed. This broad code suite still does not wire the V2.4 risk gate into a production order route or satisfy P5.5/Paper acceptance.

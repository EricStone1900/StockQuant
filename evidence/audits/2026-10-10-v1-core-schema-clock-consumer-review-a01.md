# V1 核心 TestRun / Clock 消费者复核 A01

日期：2026-10-10。范围限于 V1 公共 TestRun/ClockContext schema 的实际消费边界，以及业务时钟是否来自 Run。

## 共享 TestRun 与 V1.1 本地模型

`packages/contracts/schemas/common/test-run.schema.json` 要求 `testRunId/stageId/scenarioId/scenarioVersion/namespace/environmentMode/brokerMode/dataMode/clock/status/seed/createdAt`；`clock` 嵌套 `clock-context.schema.json`。TypeScript/Python及服务生成类型都公开这些类型，但当前搜索未发现 V1 服务把公共 `TestRun` 或 `ClockContext` 类型用于运行时验证。

V1.1 另有 `services/platform-api-service/src/domain/test-run.ts` 本地领域结构，字段为身份、场景、状态、seed、账户和创建/完成时间，另有本地 `error`；`PostgresTestRunRepository.toRun/fromStageRun` 只映射这些字段，Platform `GET /api/v1/acceptance/runs/:testRunId` 将本地对象直接返回并附加断言。它不符合公共 schema 的必需字段集合，也含公共schema禁止的 `error` 扩展。V1.1创建接口本身仅收`scenarioId/seed`，因此不能从客户端请求补齐缺失模式/时钟信息。

另发现旧交叉索引把V1.1-S2-L13当前锚点绑定到第2节第13行（Run创建拒绝客户端事实），但该需求实际位于第15行（公共Schema/消费者映射）；`currentSourceAnchorCandidate`的文本虽然精确匹配当前文件，却语义指向另一条需求。已纠正当前锚点行至15；此例说明结构性锚点检查不能代替逐行语义复核。

当前产品/交付材料同时要求公共TestRun具有模式、Clock与scope元数据，并把V1.1描述为平台持有TestRun元数据；现有实现则保留兼容的阶段专属DTO。尚无当前V1.1 OpenAPI schema明确这两者的适配关系。贸然改GET响应会影响现有Web/CLI/E2E消费者；是否新增公共schema投影且保留兼容字段，或明确保持内部DTO并只在跨服务边界使用公共schema，需要项目所有者作出接口兼容选择。该项保持OPEN，未修改运行时API。

## V1业务时钟使用

V1.3手动/AUTO执行、Proposal治理与修订从owner-scoped持久化TestRun读取`evidence.runClockNow`，校验后传入Trade/Governance命令`now`；会话推进要求请求`expectedClock`匹配当前持久时钟，并从Fixture日历算出下一Run时刻。V1.5 AUTO命令携带已持久化`runClockNow`；订单/Fill有效时间由该值推导。Portfolio SELL reservation接受业务`asOf`。V1.4历史回放使用已排序Fixture bar时间。对应代码见Platform `v13-manual-execution.ts`、`v13-auto-execution.ts`、`v13-proposal-decision.ts`、`v13-proposal-revision.ts`、`v13-session-advance.ts`、`v15-auto-trade.ts`，Portfolio `domain/account.ts` 与Replay coordinator。

当前单测明确覆盖V1.3手动执行“validates owner scope and forwards the TestRun clock to Trade”、Proposal决策“forwards exact version, reason, action and TestRun clock”、拒绝缺少持久注入时钟、会话推进“persists using the expected-clock fence”与独立FakeBroker对账；V1.5取消记录测试名为“records the request with the injected clock”。这些单测存在于Platform API的`v13-manual-execution.spec.ts`、`v13-proposal-decision.spec.ts`、`v13-session-advance.spec.ts`、`v15-auto-trade-cancellation.spec.ts`。

对七个V1相关服务的`src/domain`和`src/application`搜索`Date.now()`与无参`new Date()`，命中项为：Platform V1.2任务取消/恢复/完成时间、V1.4 Quant任务开始/恢复/完成时间、V2.4 `SystemClock`；Quant Research promotion创建时间（V3）；Market Data分钟缺口优先级默认时间、采集入库时间及采集轮询时间（V2+）。命中项属于操作时间、数据摄取/轮询元数据或其他版本能力；V1.2读取固定Fixture，V1.3/1.5交易时钟来自TestRun，V1.4使用历史bar时间。未发现V1策略/授权/订单/结算决定直接读取墙钟。此为源码与已有单测的范围性复核，不替代运行中的公共ClockContext DTO消费或各阶段完整验收。

## 结论

V1业务Run时钟沿现有stage流程传入的范围得到部分支持；公共`ClockContext`类型没有直接运行时消费者，V1.1公共TestRun DTO投影/兼容边界仍未决。V1.1-S2-L13继续PARTIAL，P0不因本审计关闭。

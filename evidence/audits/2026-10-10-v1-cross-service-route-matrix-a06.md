# V1 跨服务调用与发布矩阵（A06 增量快照）

日期：2026-10-09。范围：V1.1–V1.5 当前代码实际使用的调用边。此表用于完成 V1.1-S2-L14 的逐边审阅；`存在生成客户端`只证明调用契约形式，不能代替运行、权限、身份、迁移或交付验收。V2/V3-only 操作不列为 V1 必需项。所有交易路径仍限 FakeBroker。

## 调用边

| V1路径 | 实际调用方/客户端 | OpenAPI 与操作 | 身份与范围证据 | 迁移/发布与当前结论 |
|---|---|---|---|---|
| V1.1账户初始化/快照 | Platform API `ScenarioRunner` / `GeneratedPortfolioAccountClient` | `portfolio-account.v1.json`: `initializeAccount`, `getAccountSnapshot` | 下游`ServiceBearer`; Platform七个受保护业务入口匿名401/伪造用户403均7/7；每个入口由Harness与控制器声明对照 | V1.1完整隔离code/Web/API/CLI suite通过；身份子矩阵见[V1.1审计](./2026-10-09-v11-platform-identity-boundary-a01.md)。活动storage切换/回退未执行且NOT_AUTHORIZED。部分通过 |
| V1.2日线与研究Fixture | Platform API V1.2 acceptance / Market Data生成客户端 | `market-data-calendar.v1.json`: `getV12NormalFixturePreview`, `getV12FutureFixturePreview`, `getV12ResearchFixturePreview` | 三个Fixture preview均使用Platform caller的`ServiceBearer` | V1.2完整隔离 code/E2E通过；研究Fixture `GET /v1/fixtures/research-preview`有直接请求方法/路径/身份/无body/超时测试（[阶段§8.44](../../docs/prd/v1-local-simulation/02-small-data-and-qlib.md#844-platformmarket-data双市场研究fixture读取合同2026-10-10)；完整套件日志[见此](./2026-10-10-v12-market-research-preview-contract-code-suite-a01.log)）。Fixture不依赖真实市场日历。部分通过 |
| V1.3会话推进日历 | Platform API V1.3 `SessionAdvance` / `GeneratedV24MarketObservationClient` | `market-data-calendar.v1.json`: `getCnAShareCalendarSession` → `GET /v2/calendar/cn-a-share/{date}` | 此操作未声明OpenAPI ServiceBearer；生成客户端的该方法也不发送Bearer。Market Data的受保护路由白名单不含日历；架构明确日历供内网直读；`service-auth.spec.ts` 现以实际路径验证该边界 | 该调用实际服务于V1.3会话推进（`app.module.ts` 的 `readCalendarDay` 注入）；随机端口HTTP smoke验证TRADING/CLOSED/UNKNOWN、非法日期400共4例通过（[日志](./2026-10-09-v1-calendar-http-smoke-a01.log)，SHA-256 `a18ee673ae365acdcef89395fec64ef092daa70b1d17f3ef7502a544f2e874d2`）。返回日历覆盖有限，真实完整市场日历未验证。仅保留内网读取边界，不将该操作误报为Bearer保护。V2.4合同复用为schema来源，不把V2.4观察/报价能力纳入V1范围。 |
| V1.2策略拟合/预览/快照/Artifact | Platform API / Quant Research与Governance生成客户端 | `quant-qlib.v1.json`: `fitQlibFixtureModel`; `quant-v12-research-preview.v1.json`: `getV12QlibProbe`, `getV12RDagentProbe`, `getV12FactorPreview`; Governance V1.2 OpenAPI: `receiveV12StrategySnapshot`; Platform V1.2 OpenAPI: create/cancel run、read artifact | Quant与Governance内部操作使用专属`ServiceBearer`; Platform写路由用local session；快照只接收研究回执，不激活策略或产生订单 | 锁版Qlib、固定隔离探针及Platform→Governance策略快照客户端（生成/漂移检查、直接调用测试、完整V1.2 code suite）已验证；通用导入/全Artifact生产者生命周期、人工验收和Ubuntu仍未完成。部分通过；新增边详见[A21](./2026-10-10-v1-cross-service-route-matrix-a20.md)。 |
| V1.3人工提案/治理/执行 | Platform API / V13 Proposal、Mandate与Manual Trade clients | `decision-governance-v13-proposals.v1.json`: create/read/approve/reject/revise/authorize/validate; `decision-governance-v13-auto-mandates.v1.json`: create/read/activate/pause/authorize/settle; `trade-execution-v13-manual-paper.v1.json`: manual/sequenced/auto execute、order/assets/fill correction | 下游OpenAPI为`ServiceBearer`; Platform入口按local session/user身份；V1.3固定隔离Web/API/CLI矩阵21/21通过 | FakeBroker双市场固定链路及拒绝场景已验证；Governance授权签发/验证两路由的三种模式注入均422且验证尝试不消费ACTIVE授权（[完整V1.3代码套件](./2026-10-09-v13-governance-mode-injection-code-suite-a01.log)）。全服务模式矩阵、Trade真实客户端串联与发布部署仍待核验。部分通过 |
| V1.3执行入账/预留/结算 | Trade Execution / `GeneratedPortfolioAccountClient` | `portfolio-account.v1.json`: `reserveAccountResources`, `recordAccountFill`, `resolveAccountReservation` | Bearer caller应为Trade Execution；route scope与owner/run/account 由服务校验 | FakeBroker订单/Fill隔离测试通过；结算语义有OD-014/XMK-03开放缺口，SELL→BUY不得宣称通过。未关闭 |
| V1.4日线回测与历史FakeBroker服务验证 | 正式V1.4 API / `GeneratedQuantV14BacktestClient`；隔离服务验证中的Historical Replay Worker→Trade/Portfolio/Governance | Platform `V14AcceptanceController`仅调用`runV14DailyFixtureBacktest`并管理TestRun/报告；V1.4阶段隔离HTTP/PG用例另验证Replay Worker `GeneratedTradeExecutionClient`历史订单/UNKNOWN原单读取、`GeneratedPortfolioAccountClient`账户初始化/快照、Trade→Governance授权。 | Platform→Quant使用Platform服务身份；历史执行仅接受Replay Worker身份与BACKTEST/FAKE授权，并按Run namespace隔离 | 当前V1.4完整代码套件、Worker→Trade/Portfolio/Governance客户端与HTTP业务边界及独立迁移有隔离证据；不能据此推断正式V1.4 Web会创建/控制Replay Worker Run。活动存储切换/回退、完整规则/结算与人工接受未完成。部分通过 |
| V1.5后台任务/恢复 | Platform API / NATS Outbox、Temporal integration；Worker执行V1.3授权交易调用 | 当前派发为内部消息/Temporal Workflow，不是独立V1 OpenAPI客户端边；业务边复用V1.3 Governance/Trade/Portfolio契约 | Outbox绑定owner/TestRun；执行仍通过服务Bearer与FakeBroker；UNKNOWN必须原单查询 | NO_TRADE、双市场AUTO、拒绝与CN_A UNKNOWN固定E2E通过；多日/日终、撤销/在途Fill/错过窗口、全V1恢复、Ubuntu与人工验收未完成。部分通过 |

## 发布、迁移与分层

| 项目 | 已有当前证据 | 剩余缺口 |
|---|---|---|
| 客户端生成发布链 | `pnpm baseline:check`通过；29个生成器纳入生成和漂移检查，111条兼容消费者规则 | 需把每个表中V1 OpenAPI operation与具体调用方法逐项建立可执行对应关系；当前生成器注册不能证明全部生产调用都使用客户端 |
| 服务分层 | baseline扫描8个配置服务；本轮exit 0 | 不等于每个V1运行服务均有分层门禁；需从V1实际服务清单识别遗漏并增加门禁/测试 |
| 数据库迁移 | Platform、Portfolio、Governance、Trade、Replay、Quant及Market Data均有隔离schema baseline/迁移账本验证；Market Data验证旧版无ledger结构及业务行保留、双并发、幂等和未知版本拒绝；治理与Replay共享临时PG并发分别记账；V1.2/V1.3/V1.4完整代码套件适用项通过（V1.4最终日志：[a04](./2026-10-09-v14-market-data-migration-code-suite-a04.log)） | 独立迁移CLI`pnpm db:migrate:v1`及阶段隔离套件已实现；V1.1/V1.2/V1.3/V1.4/V1.5完整代码门禁均exit 0（[V1.1](./2026-10-09-v11-migration-cli-code-suite-a05.log)、[V1.2](./2026-10-09-v12-migration-cli-code-suite-a01.log)、[V1.3](./2026-10-09-v13-migration-cli-code-suite-a03.log)、[V1.4](./2026-10-09-v14-migration-cli-code-suite-a01.log)）。仍无通用Schema down migration；完整配对备份恢复、逐服务旧版回退及发布顺序核对开放，活动库未升级。隔离迁移不代表活动部署通过 |
| 活动切换 | Runbook、恢复副本复演及旧记录审计存在 | 活动Platform API存储切换需要负责人、维护窗口和明确回退批准；保持NOT_AUTHORIZED，不在本轮触碰 |
| Web/API/CLI发布 | 各阶段分别有隔离回归 | 五阶段当前手册、实际目标环境、完整版本候选发布包及用户验收未满足 |

## A05核验依据与状态

### 2026-10-09 逐客户端调用点增量（V1当前树）

对照生成客户端方法定义与非测试源代码调用点，确认下列V1边确实由生成客户端发起。该映射是A05初审的补充，尚未覆盖每个OpenAPI operation的消费者、全部身份负测、迁移/发布顺序，因此不关闭V1.1-S2-L14。

| V1调用边 | OpenAPI operation → 生成客户端方法 | 生产调用点 | 范围与证据结论 |
|---|---|---|---|
| Platform→Portfolio（V1.1/V1.3） | initializeAccount/getAccountSnapshot → `GeneratedPortfolioAccountClient.initializeAccount/getAccountSnapshot` | `platform-api-service/src/application/scenario-runner.ts`; `platform-api-service/src/bootstrap/app.module.ts` | V1账户初始化、账户查询；初始化实际由Platform调用，Trading/Replay独立使用同一服务的预留/入账方法 |
| Trade→Portfolio（V1.3） | reserveAccountResources/resolveAccountReservation/recordAccountFill → `GeneratedPortfolioAccountClient`同名方法 | `trade-execution-service/src/application/v13-manual-paper-execution.ts`; `trade-execution-service/src/bootstrap/main.ts` | PAPER+FAKE执行账户资源预留及结果结算；错误Trade身份拒绝见本审计Trade写入口矩阵 |
| Replay→Trade/Portfolio（V1.4） | executeHistoricalFakeOrder/readHistoricalFakeOrderById → `GeneratedTradeExecutionClient`同名方法；账户方法→`GeneratedPortfolioAccountClient`同名方法 | `historical-replay-worker/src/bootstrap/main.ts`及Replay coordinator注入端口 | 历史订单限定Replay caller；不将V2.3多标的操作计入V1需求 |
| Platform→Governance Proposal（V1.3） | create/read/decide/revise → `GeneratedV13ProposalClient.createProposal/readProposal/decideProposal/reviseProposal` | `platform-api-service/src/bootstrap/app.module.ts`（创建、读取、决策、修订）；`src/main.ts`（场景端口注入） | operation与应用方法名称不同，故按生成方法确认而非仅按OpenAPI operationId字面搜索 |
| Platform→Governance AUTO Mandate（V1.3） | create/read/readBudget/activate/pause → `GeneratedPlatformV13AutoMandateClient`同名方法 | `platform-api-service/src/application/v13-auto-execution.ts`及`src/bootstrap/app.module.ts` | 五项客户端操作直接契约单测覆盖路由、方法、载荷、Bearer/身份、owner/actor scope和超时；完整V1.3 code suite exit 0（[日志](./2026-10-10-v13-auto-client-contract-code-suite-a01.log)）。不等于每条服务端接受路径都完成验证 |
| Trade→Governance AUTO Mandate（V1.3） | authorizeOrder/settleReservation → `GeneratedTradeV13AutoMandateClient`同名方法 | `trade-execution-service/src/application/v13-manual-paper-execution.ts`与Trade bootstrap注入 | 两项直接客户端契约单测和完整套件通过；服务端HTTP/PG及授权预算断言另有独立证据，SELL结算语义仍受OD-014约束 |
| Platform→Replay Worker（V2.3；不计入V1） | `startHistoricalMultiBarReplay/readHistoricalReplayRun/controlHistoricalReplayRun` → `GeneratedHistoricalReplayClient` | `platform-api-service/src/bootstrap/app.module.ts` 的`V23AcceptanceController`，TestRun明确写入`stageId: "V2.3"` | 生产多Bar入口属于V2.3。`startHistoricalReplay`与`recoverHistoricalReplayUnknownOrder`在当前生产源码无调用点，仅有客户端/HTTP测试；均不作为V1生产消费者证据。V1.4的Replay Worker/Trade服务级隔离测试另按上一行记录，不等于V1.4 Platform控制器接线。 |
| Platform→Quant（V1.2/V1.4） | fitQlibFixtureModel → `GeneratedQuantQlibClient.fitQlibFixtureModel`; runV14DailyFixtureBacktest → V1.4 adapter/client | `platform-api-service/src/bootstrap/app.module.ts`; `src/adapters/v14-quant-backtest-adapter.ts` | 固定Qlib/日线Fixture调用边；不把V2/V3操作计为V1能力 |

本次映射仅以生成源与应用调用点为依据，不新造测试通过结论。V1.2 Artifact生命周期、Market Data日历/Fixture、V1.5 Outbox/Temporal与操作级调用及所有服务的完整负向矩阵仍需按每个V1 operation逐项核对；发布回退和用户验收仍是独立缺口。Platform→Historical Replay Worker生产调用属于V2.3，不能用其GeneratedHistoricalReplayClient测试证明V1消费者覆盖。证据审计、各阶段完整代码套件与总门禁维持其原有状态，不因该静态映射改变。

### 已确认的 V1 operationId → 客户端方法 → 调用点

下表只列源码交叉检索已经确认的操作；同一生成客户端中未列的其它 operation 不据此推断为V1实际能力。

| OpenAPI operationId | 生成客户端方法 | 当前V1调用点/边界 |
|---|---|---|
| `initializeAccount`, `getAccountSnapshot` | `GeneratedPortfolioAccountClient.initializeAccount`, `.getAccountSnapshot` | Platform `scenario-runner.ts`、`bootstrap/app.module.ts` 的账户准备/读取入口 |
| `reserveAccountResources`, `resolveAccountReservation`, `recordAccountFill` | Trade `GeneratedPortfolioAccountClient` 同名方法 | Trade `v13-manual-paper-execution.ts`；限定PAPER + FAKE及Run namespace。Replay没有这些方法的业务调用点 |
| `initializeAccount`, `getAccountSnapshot`（Replay消费者） | Replay `GeneratedPortfolioAccountClient.initializeAccount/getAccountSnapshot` | Replay `replay-coordinator.ts`，限定BACKTEST + FAKE及Run namespace |
| `getV12NormalFixturePreview`, `getV12FutureFixturePreview`, `getV12ResearchFixturePreview` | `GeneratedV21MarketDataClient` 同名方法 | Platform `V12Acceptance` 注入及`app.module.ts` V1.2数据预览控制器 |
| `getV12QlibProbe`, `getV12RDagentProbe`, `getV12FactorPreview` | `GeneratedQuantV12PreviewClient` 同名方法 | Platform `V12Acceptance`/V1.2控制器；RD-Agent项为固定代码探针，不宣称真实模型实验 |
| `getCnAShareCalendarSession` | `GeneratedV24MarketObservationClient.getCnAShareCalendarSession` | Platform `app.module.ts`的Fixture日历注入，V1.3会话推进只读边；复用V2.4合同schema不纳入V2.4观察功能 |
| `fitQlibFixtureModel` | `GeneratedQuantQlibClient.fitQlibFixtureModel` | Platform `V12Acceptance`/V1.2运行路径，调用锁版Qlib Fixture任务 |
| `createV13PaperProposal`, `readV13PaperProposal`, `approveV13PaperProposal`, `rejectV13PaperProposal`, `reviseV13PaperProposal` | `GeneratedV13ProposalClient.createProposal`, `.readProposal`, `.decideProposal`, `.reviseProposal` | Platform `app.module.ts` Proposal创建/读取/决定/修订入口；approve/reject共用决定方法，须分别以具体动作验证；执行授权创建/验证未在此客户端映射 |
| `executeV13ApprovedManualProposal`, `executeV13ApprovedManualSequencedProposal`, `executeV13AutoPolicyProposal` | `GeneratedPlatformV13ManualTradeClient.executeApprovedManualProposal`, `.executeSequencedManualProposal`, `.executeAutoPolicyProposal` | Platform `app.module.ts` MANUAL、sequenced MANUAL与AUTO命令端口；均由Trade服务继续做授权/模式校验 |
| `startHistoricalMultiBarReplay`, `readHistoricalReplayRun`, `controlHistoricalReplayRun` | `GeneratedHistoricalReplayClient.startHistoricalMultiBarReplay`, `.readHistoricalReplayRun`, `.controlHistoricalReplayRun` | Platform `app.module.ts` V1.4多bar运行/查询/暂停恢复取消入口；`startHistoricalReplay`与UNKNOWN恢复调用点仍需单独核清 |
| `executeHistoricalFakeOrder`, `readHistoricalFakeOrderById` | `GeneratedTradeExecutionClient.executeHistoricalFakeOrder`, `.readHistoricalFakeOrderById` | Replay `replay-coordinator.ts`实际订单/UNKNOWN原单查询；LIVE/REAL不属于此边 |
| `runV14DailyFixtureBacktest` | `GeneratedQuantV14BacktestClient.runV14DailyFixtureBacktest` | Platform `V14QuantBacktestAdapter`，注入V1.4日线Fixture回测 |
| `createV12QlibStrategyTestRun`, `cancelV12QlibStrategyTestRun`, `readV12QlibStrategyArtifact` | Platform V1.2 controller/Artifact repository路径（不是跨服务客户端） | `app.module.ts` V1.2 TestRun创建/取消/受控Artifact读取；该组是公开业务API，不应误列为下游服务调用 |
| `createV13AutoPolicyMandate`, `readV13AutoPolicyMandate`, `readV13AutoPolicyMandateBudget`, `activateV13AutoPolicyMandate`, `pauseV13AutoPolicyMandate` | Platform `GeneratedPlatformV13AutoMandateClient.create/read/readBudget/activate/pause` | `platform-api-service/src/bootstrap/app.module.ts` 的V1.3 Mandate API；创建/读取/切换及预算读回均绑定用户owner和TestRun，AUTO Activity通过注入端口独立读Governance预算 |
| `authorizeV13AutoPolicyOrder`, `settleV13AutoPolicyBudgetReservation` | Trade `GeneratedTradeV13AutoMandateClient.authorizeOrder/settleReservation` | `trade-execution-service/src/application/v13-manual-paper-execution.ts` 的`V13AutoPaperExecutionService`；Mandate预算预留、FakeBroker结果后的CONSUMED/RELEASED结算均在服务端执行。Trade不得调用Platform专属预算GET |
| `readV14BacktestTestRun`, `readV14BacktestReportArtifact` | 无跨服务生成客户端；Platform `V14AcceptanceController.get/report`读取owner-scoped StageRun并校验不可变报告payload | `platform-api-service/src/bootstrap/app.module.ts`；报告访问验证owner/TestRun归属及payload Hash，未发布/取消任务抑制报告Artifact |

上述映射的运行证据：V1.3预算GET隔离HTTP+PostgreSQL确认Platform正确owner/TestRun为200、Trade caller为403、错误owner为404，并精确读回RESERVED/CONSUMED/RELEASED；Mandate create/activate/pause、Trade authorize及settle错误模式载荷均422且拒绝前后持久Mandate/预算reservation未变，合法固定AUTO业务通过，详见[V1.3 code suite](./2026-10-10-v13-auto-multileg-code-suite-a02.log)与[完整E2E](./2026-10-10-v13-auto-multileg-full-e2e-a01.log)。V1.4报告API保持owner/TestRun/hash校验且取消/完成发布顺序由隔离PostgreSQL fencing 2/2验证，完整兼容套件再次通过，详见[V1.4 code suite](./2026-10-10-v14-replay-namespace-code-suite-a02.log)及[Artifact边界审计](./2026-10-09-v1-artifact-publication-boundary-a01.md)。这些证据关闭V1.3 Mandate与V1.4报告消费者的调用点映射子项，不代表全模式/故障/接受矩阵完成。V1.5后台调度仍是内部Outbox/NATS/Temporal边而非生成OpenAPI客户端，独立业务/故障恢复映射保持OPEN。`market-data-calendar.v1.json`中的V2采集/新闻/报价操作、`trade-execution-historical.v1.json`中的V2.4观察操作、`quant-research-qlib-worker.v1.json`中未确认由V1调用的内部Worker操作不自动归入V1必需范围。

### V1.1 Platform受保护API匿名/伪造用户拒绝子矩阵（2026-10-09）

隔离Harness将`app.module.ts`共享Platform控制器中七条需身份保护的业务操作与探针清单对照，实际HTTP逐条断言匿名401、伪造用户403；完整stage storage/代码/Web/API/CLI E2E退出0，人工验收仍NOT_RUN。精确路由和范围见[V1.1身份审计](./2026-10-09-v11-platform-identity-boundary-a01.md)，完整日志见[code suite](./2026-10-09-v11-platform-identity-code-suite-a01.log)。公开session建立、logout与静态capabilities接口明确不纳入此受保护路由矩阵。此切片关闭V1.1 Platform业务路由身份负测；全V1调用/发布矩阵、活动部署和整版验收仍OPEN。

### V1.3 Platform API 匿名与伪造用户身份拒绝子矩阵（2026-10-09）

在随机隔离Compose的完整V1.3 Web E2E中，建立有效测试会话后，对下列五个用户入口分别执行无Cookie匿名请求和带 `x-stockquant-user: unauthorized-owner` 的伪造用户请求。五个匿名请求均401，五个伪造用户请求均403；探针在Web可用性与业务场景运行前执行。21/21 Playwright检查通过，且Harness精确清理隔离资源。机器记录含各TestRun ID、Manifest和源码Hash：[身份边界报告](./2026-10-09-v13-platform-identity-boundary-a01.json)，SHA-256 `f5eee74bd270ee3d97a15340f83b9c0251e7dbf259c4a3b341d11c72f5e163dd`。

| 方法/路径 | 匿名 | 伪造用户身份 |
|---|---:|---:|
| `GET /api/v1/acceptance/v1/v1.3/scenarios` | 401 | 403 |
| `POST /api/v1/acceptance/v1/v1.3/runs` | 401 | 403 |
| `POST /api/v1/acceptance/v1/v1.3/runs/{runId}/accounts` | 401 | 403 |
| `POST /api/v1/acceptance/v1/v1.3/runs/{runId}/proposals` | 401 | 403 |
| `GET /api/v1/accounts/{accountId}` | 401 | 403 |

该证据只覆盖上述Platform路由的本地会话身份边界。21个平台TestRun仍为`WAITING`且业务断言为`NOT_RUN`；本次身份探针与固定交易E2E通过，不代表其余Platform端点、BACKTEST完整链路或P3/V1关闭。Trade 13个写入口的服务身份拒绝见本审计前述子矩阵。

### V1.3 Platform全部用户API身份拒绝矩阵增补（2026-10-09）

该轮实际覆盖24条路由，但后续源码解析发现V1.3控制器实际声明25个操作，因此a02报告已更正并标记为`PARTIAL_SUPERSEDED`：它覆盖23/25个控制器操作及账户读取，遗漏TestRun读取和Fill费用更正。其历史断言仍有效，但不能证明完整路由覆盖；更正后的[a02机器报告](./2026-10-09-v13-platform-identity-boundary-a02.json)保留了覆盖差异和Hash。

随后Harness加入从`app.module.ts`提取控制器HTTP方法/路径并逐个匹配身份探针的源代码对照断言；25个控制器操作须恰好各匹配一条探针。完整隔离E2E实际检查26条路由（含账户详情额外路由），匿名26/26返回401、伪造身份26/26返回403，21/21 Playwright通过，随机Compose项目资源精确清理：[最终机器报告a03](./2026-10-09-v13-platform-identity-boundary-a03.json)，[E2E原始日志](./2026-10-09-v13-platform-route-inventory-e2e-a02.log)。

所有21个阶段TestRun仍为平台`WAITING`且业务断言为`NOT_RUN`。最终矩阵关闭V1.3 Platform用户API的匿名/伪造身份拒绝子项；它不覆盖V1.1/V1.2/V1.4/V1.5 Platform操作、其他服务边界、BACKTEST业务接受路径或阶段整体验收。

- 代码入口：`services/platform-api-service/src/main.ts`、`src/application/scenario-runner.ts`、`src/contracts/generated-*client.ts`；`services/trade-execution-service/src/application/v13-manual-paper-execution.ts`、`src/contracts/generated-portfolio-account-client.ts`；`services/historical-replay-worker/src/bootstrap/main.ts`、`src/contracts/generated-portfolio-account-client.ts`、`src/contracts/generated-trade-execution-client.ts`。
- OpenAPI：`packages/contracts/openapi/` 中 `portfolio-account.v1.json`、`market-data-calendar.v1.json`、`quant-qlib.v1.json`、`quant-v12-research-preview.v1.json`、`decision-governance-v13-proposals.v1.json`、`decision-governance-v13-auto-mandates.v1.json`、`trade-execution-v13-manual-paper.v1.json`、`trade-execution-historical.v1.json`、`historical-replay-worker.v1.json`、`platform-v12-qlib-fixture.v1.json`。
- 验证：`pnpm baseline:check` exit 0（[日志](./2026-10-09-v11-contract-layer-baseline-a01.log)，SHA-256旁文件）；`pnpm verify:stage -- --stage V1.1 --suite code` exit 0（[日志](./2026-10-09-v11-code-suite-a04.log)）；Portfolio migration ledger与完整V1.3 code suite exit 0（[日志](./2026-10-09-v13-portfolio-migration-code-suite-a01.log)，[SHA-256](./2026-10-09-v13-portfolio-migration-code-suite-a01.log.sha256)）；Governance migration ledger双进程/HTTP验证exit 0（[日志](./2026-10-09-v1-governance-migration-http-a01.log)，[SHA-256](./2026-10-09-v1-governance-migration-http-a01.log.sha256)），改后完整V1.3回归exit 0（[日志](./2026-10-09-v13-governance-migration-code-suite-a02.log)，[SHA-256](./2026-10-09-v13-governance-migration-code-suite-a02.log.sha256)）；Trade migration ledger及最新完整V1.3回归均exit 0（[日志](./2026-10-09-v13-migration-ledgers-code-suite-a03.log)，[SHA-256](./2026-10-09-v13-migration-ledgers-code-suite-a03.log.sha256)）；最新V1门禁a84仍`INCOMPLETE`，详见[迁移CLI运行说明](../../docs/operations/v1-database-migrations.md)。
- 判定：这是基于源码和OpenAPI的首轮枚举，不是最终完整矩阵。Platform→Market Data某些分钟导入/upload与Project Delivery操作属于V2能力，除非V1入口实际依赖，否则不列V1必需；Artifact所有生产者/消费者还需依OD-013及V1边界逐项核对。L14继续OPEN，不勾选阶段项。

2026-10-09 P0/A01增量：V1.1-S2-L14迁移CLI范围已更新至V1.1～V1.5，并关联隔离PostgreSQL套件；A06仅追加本轮真实V1.4授权/执行HTTP拒绝断言；逐客户端完整身份/副作用和发布回退映射仍OPEN。另对145项机器交叉索引复核1033条来源/证据路径与88条测试名，均存在/字面命中；审计见[当前校验](./2026-10-09-v1-crosswalk-link-audit-a02.json)。该审计不证明测试行为。

## V1.3 Trade Execution 写入口身份拒绝子矩阵（2026-10-09）

隔离HTTP+PostgreSQL smoke逐一向下列写入口发送错误服务身份，请求在命令校验/领域访问前全部返回403；测试专属namespace的订单、Fill、事件和outbox计数保持0。允许/拒绝身份根据 `services/trade-execution-service/scripts/service-auth-http-smoke.mjs` 的固定路由表：

| POST 路由 | 合法调用服务 | 本次错误身份 | 结果 |
|---|---|---|---|
| `/internal/v1/historical-orders/execute` | `historical-replay-worker` | `platform-api-service` | 403 |
| `/internal/v1/v24/paper-orders/execute-snapshot` | `platform-api-service` | `historical-replay-worker` | 403 |
| `/internal/v1/v13/paper-orders/execute-manual-proposal` | `platform-api-service` | `historical-replay-worker` | 403 |
| `/internal/v1/v13/paper-orders/execute-manual-sequenced-proposal` | `platform-api-service` | `historical-replay-worker` | 403 |
| `/internal/v1/v13/paper-orders/execute-auto-proposal` | `platform-api-service` | `historical-replay-worker` | 403 |
| `/internal/v1/fake-broker/external-orders` | `platform-api-service` | `historical-replay-worker` | 403 |
| `/internal/v1/orders/{orderId}/cancel` | `platform-api-service` | `historical-replay-worker` | 403 |
| `/internal/v1/orders/{orderId}/cancel-result` | `platform-api-service` | `historical-replay-worker` | 403 |
| `/internal/v1/orders/{orderId}/expire` | `platform-api-service` | `historical-replay-worker` | 403 |
| `/internal/v1/orders/{orderId}/unknown` | `platform-api-service` | `historical-replay-worker` | 403 |
| `/internal/v1/orders/{orderId}/simulated-fill-reports` | `platform-api-service` | `historical-replay-worker` | 403 |
| `/internal/v1/orders/{orderId}/fills/{fillId}/fee-corrections` | `platform-api-service` | `historical-replay-worker` | 403 |
| `/internal/v1/outbox/{outboxId}/compensate` | `platform-api-service` | `historical-replay-worker` | 403 |

同一smoke另向manual、sequenced和AUTO三个提案执行路由注入`LIVE/REAL`，均422且无订单/Fill/事件/outbox事实。完整V1.3代码套件日志：[a02](./2026-10-09-v13-trade-route-scope-code-suite-a02.log)，SHA-256：[文件](./2026-10-09-v13-trade-route-scope-code-suite-a02.log.sha256)。该子矩阵仅关闭Trade服务的错误调用方和LIVE/REAL注入负向切片；Platform API入口、Governance授权入口、Replay Worker成功/拒绝边界、BACKTEST完整业务链和UI篡改仍未关闭。

## V1 Governance authorization / Replay Worker 服务身份与错误路径切片（2026-10-09）

V1.3当前工作树完整 code suite 中的 `pnpm test:service-auth:http` 对 Decision Governance、Historical Replay Worker 和 Quant Research 使用一次性随机PostgreSQL；本轮日志见[V1.3当前树完整套件](./2026-10-09-v13-current-tree-code-suite-a01.log)，原始测试位于[`scripts/service-auth-http-smokes.mjs`](../../scripts/service-auth-http-smokes.mjs)。以下只关闭列明的内部服务身份/拒绝行为，不等价于完整Replay成功业务流程、后台恢复矩阵或V1版本门禁。

2026-10-09追加Proposal授权HTTP+PG证据：负向覆盖Platform调用方403、错Trade Bearer 403、匹配身份畸形请求422且无授权行；成功路径通过平台创建/批准固定PAPER/FAKE Proposal、Trade申请绑定准确owner/TestRun/account/命令哈希的授权、拒绝篡改命令哈希、并发精准校验仅一次消费并安全重放，数据库最终一条绑定正确的`CONSUMED`授权。`pnpm test:service-auth:http` exit 0，[隔离日志](./2026-10-09-v13-proposal-auth-http-pg-a03.log)，SHA-256：[文件](./2026-10-09-v13-proposal-auth-http-pg-a03.log.sha256)。完整V1.3 code suite也在同一修改后exit 0：[日志](./2026-10-09-v13-code-suite-a225.log)，SHA-256：[文件](./2026-10-09-v13-code-suite-a225.log.sha256)。此为Governance grant/validate服务边界和持久化证据，仍未验证Trade将授权实际送至FakeBroker、Portfolio结算并由同Run Web/CLI接受。

| 服务/HTTP路由 | 允许身份与本轮断言 | 结果/副作用边界 |
|---|---|---|
| Decision Governance `POST /internal/v1/authorizations` | `historical-replay-worker` Bearer可申请；缺失Bearer、Trade Bearer伪装Replay、Trade caller+Trade Bearer均403；合法身份畸形JSON 422；BACKTEST+FAKE固定命令201/200授权成功 | 改命令后验证403；同一授权并发验证恰有一次首次消费、一次幂等重放，数据库最终`CONSUMED`；同namespace重新授权轮换ID，旧ID拒绝；过期授权403 |
| Decision Governance `POST /internal/v1/authorizations/validate` | `trade-execution-service` Bearer可验证；缺失/错caller/错token 403；合法身份畸形JSON 422 | 校验仅绑定原授权命令，改载荷不能消费；并发同命令重试安全；超期授权和旧namespace授权拒绝 |
| Decision Governance `GET /internal/v1/auto-mandates/{mandateId}/runs/{testRunId}/versions/{version}/budget` | `platform-api-service` 精确owner/TestRun可读；Trade caller 403，错误owner 404 | 独立读回RESERVED 100.00、CONSUMED 200.00、RELEASED 50.00；随机Mandate/TestRun，非活动账本，无跨owner泄漏 |
| Historical Replay Worker `GET /internal/v1/replays/{testRunId}` | `platform-api-service` +正确Bearer；缺失、Replay Bearer伪装Platform、未知服务caller分别403 | 授权读取不存在Run为404；隔离数据库插入Run后返回200，且不泄漏`requestHash` |
| Historical Replay Worker `POST /internal/v1/replays`、`/internal/v1/replays/multi`、`/internal/v1/replays/multi?async=true` | 上述三路由对runner-host和Platform caller+Replay Bearer各拒绝；Platform+正确Bearer访问畸形请求到422 | 拒绝发生在读取/更改replay状态前；畸形请求不创建Run |
| Historical Replay Worker `POST /internal/v1/replays/{testRunId}/pause|resume|cancel` | 两类错误服务身份均403；合法Platform访问精确不存在Run均404 | 不会为不存在Run创建状态 |
| Historical Replay Worker `POST /internal/v1/replays/{testRunId}/recover-unknown` | 错误服务身份403；合法Platform对无原单证据的不存在Run返回422 | fail closed，不创建Run、不盲目重放 |

完整测试报告显示Replay入口错误身份探测14次、授权畸形提交3次、missing-run lifecycle 3次和UNKNOWN恢复1次；Decision Governance同时验证并发单次消费及owner/TestRun隔离。此切片不覆盖Replay Worker完成一个有效历史Run，也不证明Platform/UI对所有路径均无法篡改；P3剩余接受路径矩阵继续OPEN。


## 2026-10-09 Platform业务入口身份负向子矩阵增量

| 阶段 | Platform API受保护入口 | 实测结果 | 关联完整隔离回归 | 当前边界 |
|---|---|---|---|---|
| V1.4 | 场景目录、创建回测Run、TestRun读取、报告Artifact读取、取消（5条） | 控制器路由清单匹配；匿名401 5/5、伪造owner 403 5/5 | V1.4 Harness完成，Playwright 5/5，Web Run同Run CLI与精确清理通过；[日志](./2026-10-09-v14-platform-identity-code-suite-a01.log) | 仅关闭这些Platform入口的身份拒绝切片 |

2026-10-10追加：V1.4创建回测Run端点另完成客户端模式字段负向测试。四种`environmentMode`/`brokerMode`组合（PAPER/FAKE、LIVE/FAKE、BACKTEST/REAL、LIVE/REAL）均422，拒绝前Quant Run数量不变；完整Web/API/CLI隔离Harness通过。该结果与身份矩阵是不同断言，仍只关闭创建端点的模式注入子项，不代表V1全量路由或P3父项关闭。详见[HTTP+E2E记录](./2026-10-10-v14-platform-mode-injection-http-e2e-a01.log)。
| V1.5 | 场景目录、创建Run、TestRun读取、取消（4条） | 控制器路由清单匹配；匿名401 4/4、伪造owner 403 4/4 | normal/AUTO/rejection/recovery、Web/CLI/export通过，随机资源精确清理；[日志](./2026-10-09-v15-platform-identity-e2e-a02.log)；[机器报告](./2026-10-09-v15-nats-temporal-dispatch-sq-v15-e2e-b9494057151e8fb7fb4f.json) | 不替代完整调度/恢复、结算、Ubuntu或人工验收 |

V1.5首次全场景执行的时间断言失败已保留；断言按应用固定Clock生成的`runClockNow + 1秒`精确修正，后续完整E2E退出0。

## V1.3 Platform交易模式注入拒绝子矩阵（2026-10-09）

在正式Platform API隔离栈中，账户初始化、Proposal创建、AUTO Mandate创建、MANUAL执行、sequenced-MANUAL执行和AUTO执行6条入口分别尝试`LIVE/FAKE`、`PAPER/REAL`、`LIVE/REAL`，共18次全部返回422。Mandate随后读取404；合法账户/Proposal仍固定为PAPER/FAKE，Portfolio账本条目1→1且版本不变，FakeBroker订单/Fill为0；同Run CLI只读检查和结构化导出完成。最新E2E TestRun `d938c4e8-0ef0-4b4f-abe9-a0c7a83ec4b6`，Manifest hash `64c0805fef6f0d86dcd168bb61a772fa087236b8fd40ff1510fdb83349c6af1d`。定向及完整套件证据：[定向HTTP/Web场景](./2026-10-09-v13-platform-mode-injection-e2e-a02.log)、[完整V1.3代码套件](./2026-10-09-v13-platform-mode-strict-code-suite-a02.log)、[完整Web/API/CLI E2E 22/22](./2026-10-09-v13-platform-mode-strict-e2e-a02.log)，各SHA-256见旁文件。

这覆盖上述5条Platform V1.3业务入口的请求模式字段边界，不替代Trade/Governance/Portfolio/Replay所有HTTP/Worker写入口矩阵、BACKTEST完整接受路径或P3整体关闭。

## Portfolio账户服务写入口模式字段拒绝增量（2026-10-09）

Trade→Portfolio的Fill写入、费用更正、资源预留、预留结算四条内部HTTP写入口现拒绝客户端额外提交的`environmentMode`/`brokerMode`（422）；拒绝发生在ServiceBearer/route scope校验后、领域副作用前。隔离PostgreSQL真实HTTP smoke证实预留/Fill/更正均0副作用，UNKNOWN保留既有`HELD`，随后的合法操作仍可正常完成；BACKTEST+FAKE账户初始化仍通过。证据及完整V1.1/V1.3代码门禁、V1.3 22/22 E2E见[V1.3 §8.34](../../docs/prd/v1-local-simulation/03-fake-broker-trading-loop.md#834-portfolio写入口拒绝客户端模式注入与outbox时序2026-10-09)。这是精确入口子矩阵，未覆盖所有Governance/Replay/Quant/Worker操作，不关闭P3全量矩阵。

## 2026-10-09 Governance AUTO Mandate写入口模式注入补证

真实隔离HTTP+PostgreSQL smoke新增AUTO Mandate create/activate/order authorization/budget settlement四类写入口的模式字段注入矩阵。`LIVE/FAKE`、`PAPER/REAL`、`LIVE/REAL`均422；拒绝后创建行数0、Mandate维持PENDING、预算reservation数不变；无模式字段的固定PAPER/FAKE创建与激活仍成功。记录于[阶段§8.35](../../docs/prd/v1-local-simulation/03-fake-broker-trading-loop.md#835-governance-auto-mandate服务写入口模式注入拒绝2026-10-09)与[隔离HTTP+PG日志](./2026-10-09-v13-governance-auth-http-a05.log)。这关闭列出的Governance路由原子负测切片；所有V1服务、Worker、BACKTEST及UI路径的完整接受边界矩阵仍OPEN。

## V1.2 Platform TestRun交易模式边界增量（2026-10-10）

`POST /api/v1/acceptance/v1/v1.2/runs`的OpenAPI已声明`additionalProperties:false`，当前Platform实现现也在HTTP运行时将请求限制为`scenarioId`、`seed`。隔离Harness实际发送PAPER/FAKE、LIVE/FAKE、BACKTEST/REAL、LIVE/REAL四组注入，全部422；PostgreSQL确认V1.2 `acceptance_stage_runs`计数不变，表明拒绝发生在持久化及Qlib派发之前。改后完整V1.2代码套件exit 0，11条Platform操作身份矩阵和四Run双市场Web/API/CLI恢复流程通过。逐项复核及源码断言见[机器审计](./2026-10-10-v1-crosswalk-v12-mode-a01.json)，完整测试日志见[code suite](./2026-10-10-v12-mode-boundary-code-suite-a01.log)及[E2E](./2026-10-10-v12-mode-injection-e2e-a01.log)。此为一个Platform Run创建入口原子子项；A05尚未逐项核实所有V1 OpenAPI operation消费者、后台Worker入口和完整正/负副作用路径，V1.2人工/Ubuntu验收及P3父项继续开放。

## V1.5 Platform TestRun交易模式边界增量（2026-10-10）

`POST /api/v1/acceptance/v1/v1.5/runs`现仅允许`scenarioId`、`seed`字段。隔离HTTP/PostgreSQL注入PAPER/FAKE、LIVE/FAKE、BACKTEST/REAL、LIVE/REAL，四次请求均422且`acceptance_stage_runs`中的V1.5 Run数不变，证明未创建Run或派发NATS/Temporal工作流。改后完整V1.5 code suite exit 0；单独隔离E2E中7条Platform路由身份探针、三项浏览器测试、normal/AUTO/rejection/recovery四场景Web/API/CLI同Run导出均通过，临时容器、卷、网络精确清理。逐项断言/源码审计见[机器报告](./2026-10-10-v1-crosswalk-v15-mode-a01.json)，[完整代码套件日志](./2026-10-10-v15-platform-mode-boundary-code-suite-a01.log)，[隔离E2E日志](./2026-10-10-v15-platform-mode-boundary-e2e-a01.log)。此为一个Platform入口原子项；其他V1服务/Worker路由矩阵、活动部署、历史导出、结算决定、Ubuntu和人工验收继续OPEN。

## 2026-10-10 V1.3 Platform Proposal/Mandate字段白名单增量

正式Platform隔离Web/API流程现对下列业务写入口验证未知字段拒绝与合法操作继续成功：

| Platform route | 服务端允许请求字段 | 实测额外字段 | 结果与后置读回 |
|---|---|---|---|
| `POST /api/v1/acceptance/v1/v1.3/runs/{testRunId}/proposals` | `idempotencyKey`, `accountId`, `strategyVersion`, `approvalMode`, `market`, `currency`, `operation`, `expiresAt`, `legs` | `clientApproved` | 未知字段422；匿名请求仍先401；同一Run随后合法请求创建成功 |
| `POST /api/v1/acceptance/v1/v1.3/runs/{testRunId}/proposals/{proposalId}/revisions/append` | `expectedVersion`, `expectedContentHash`, `operation`, `expiresAt`, `legs`, `reason` | `clientApproved` | 422；Proposal状态、版本、内容Hash保持不变 |
| `POST /api/v1/acceptance/v1/v1.3/runs/{testRunId}/proposals/{proposalId}/approve` | `expectedVersion`, `expectedContentHash`, `reason` | `clientApproved` | 422；Proposal状态、版本、内容Hash保持不变，合法治理流程继续通过 |
| `POST /api/v1/acceptance/v1/v1.3/runs/{testRunId}/auto-mandates` | `mandateId`, `accountId`, `strategyVersion`, `market`, `currency`, `securityScope`, `maxOrderAmount`, `maxTotalAmount`, `maxOrderCount`, `validFrom`, `expiresAt`, `reason` | `clientApproved` | 422且Mandate仍404；随后合法创建成功 |
| `POST /api/v1/acceptance/v1/v1.3/runs/{testRunId}/auto-mandates/{mandateId}/activate` | `mandateVersion`, `contentHash`, `reason` | `clientApproved` | 422且Mandate保持PENDING；随后合法激活成功 |
| `POST /api/v1/acceptance/v1/v1.3/runs/{testRunId}/auto-mandates/{mandateId}/pause` | `mandateVersion`, `reason` | `clientApproved` | 422且Mandate保持ACTIVE；随后合法暂停成功 |

回归中发现Web暂停命令曾多带仅激活需要的`contentHash`，已修正客户端并复跑完整隔离V1.3矩阵22/22。E2E日志SHA-256 `11cb0823aa65a8618d933b7026a51131c02aad52efd141040cdbaff0b5e79083`；完整V1.3 code suite exit 0、SHA-256 `f489d906bf343ef5d84bebcd21ae875b35cfd24c93fb385bf7ad15b38003a69d`。详见[阶段§8.56](../../docs/prd/v1-local-simulation/03-fake-broker-trading-loop.md#856-platform-auto-mandate激活与暂停拒绝未声明字段2026-10-10)、[E2E日志](./2026-10-10-v13-mandate-transition-allowlist-e2e-a02.log)和[完整code suite](./2026-10-10-v13-mandate-transition-allowlist-code-a02.log)。首次E2E发现Web暂停载荷不符合窄契约的失败日志保留为a01，不计通过。

该增量只证明六个Platform请求载荷边界及固定Web流程，不覆盖其余Platform业务操作、Trade/Governance/Portfolio/Replay/Worker完整写路由、BACKTEST完整成功路径、活动发布或P3整体关闭。A05的V1.1-S2-L14仍OPEN。

## V1.4 Replay Worker命令与Trade历史订单读取补充（2026-10-10）

本轮补入两个此前未在矩阵记录的边界：Replay Worker无body lifecycle/recovery命令拒绝客户端业务事实；UNKNOWN原单读取按持久ReplayRun namespace隔离。该矩阵补充只覆盖这些固定路由断言，不关闭V1.4全接受路径矩阵或P3父项。

| 调用边界 | 方法/路由 | 允许身份/输入 | 拒绝断言 | 证据 |
|---|---|---|---|---|
| Replay Worker lifecycle | `POST /internal/v1/replays/{id}/pause` | 已认证Platform调用方；空body | 带伪造`status/result/orderId`的body返回422，Run状态/结果未变 | `scripts/service-auth-http-smokes.mjs`；[V1.4 code suite a02](./2026-10-10-v14-replay-namespace-code-suite-a02.log) |
| Replay Worker lifecycle | `POST /internal/v1/replays/{id}/resume` | 已认证Platform调用方；空body | 同上 | 同上 |
| Replay Worker lifecycle | `POST /internal/v1/replays/{id}/cancel` | 已认证Platform调用方；空body | 同上 | 同上 |
| Replay Worker recovery | `POST /internal/v1/replays/{id}/recover-unknown` | 已认证Platform调用方；空body | 同上；伪造订单事实不能进入恢复命令 | 同上 |
| Trade historical order read | `GET /internal/v1/historical-orders/{orderId}?namespace={persistedRunNamespace}` | `historical-replay-worker`身份；订单ID与持久Run namespace双重匹配 | 错误namespace 404 | Trade隔离PostgreSQL/HTTP smoke；[namespace审计](./2026-10-10-v14-replay-namespace-recovery-a01.md) |
| Trade generic order read | `GET /internal/v1/orders/{orderId}` | Platform身份 | Replay身份403 | 同上 |

隔离HTTP/PG smoke及完整V1.4代码套件退出0；套件SHA-256见[sidecar](./2026-10-10-v14-replay-namespace-code-suite-a02.log.sha256)。普通sandbox曾因loopback EPERM失败，受控loopback重跑通过。所有数据库/网络均为随机隔离资源，运行后确认删除且活动服务未连接。此记录不代替全路由源码枚举、缺失路由负测或人工业务接受路径。

## A19：Quant Research → Qlib Worker V1客户端边界补录（2026-10-10）

调用点盘点还发现V1.2真实使用的Qlib Worker生成客户端边界先前未单独列明。`probeQlibWorker`与`fitQlibFixtureInWorker`的生产调用、专属Bearer、固定Qlib/代码探针和容器化same-TestRun证据见[A19](./2026-10-10-v1-cross-service-route-matrix-a19.md)。同一客户端的Fixture摘要train/validate操作归V2.3，不计入V1所需能力。该记录只补充一条静态调用映射及隔离回归，不改变P1/A04或V1验收状态。


## V1.4 Governance授权与Trade执行拒绝边界补充（2026-10-10）

基于真实Decision Governance、Trade Execution与Portfolio Risk HTTP服务及三个独立随机PostgreSQL数据库，`services/trade-execution-service/scripts/test-v14-rule-parity-postgres.mjs`现执行以下拒绝后无副作用断言；失败探针后再提交原始正确命令，验证拒绝不消费合法授权：

| 方法/路由 | 调用身份与场景 | 结果及副作用断言 |
|---|---|---|
| `POST /internal/v1/authorizations` | Trade身份尝试签发Historical Replay授权 | 403；namespace授权行数不变；随后Historical Replay身份可签发BACKTEST/FAKE授权 |
| `POST /internal/v1/authorizations/validate` | Trade身份使用改动requestedQuantity的命令哈希验证既有授权 | 403；授权状态保持ACTIVE；后续正确命令可继续 |
| `POST /internal/v1/historical-orders/execute` | Historical Replay身份提交不存在的authorizationId | 403；FakeBroker对应namespace/clientOrderId订单数为0；随后合法授权执行成功 |

完整V1.4 code suite exit 0：[日志](./2026-10-10-v14-paper-http-parity-code-suite-a06.log)，[exit code](./2026-10-10-v14-paper-http-parity-code-suite-a06.exit.txt)，[SHA-256](./2026-10-10-v14-paper-http-parity-code-suite-a06.log.sha256)。此增量仅证明固定授权/执行边界；不覆盖其它V1路由、完整Trade/Portfolio拒绝矩阵、SELL应收/结算/OD-014或P3父项。A06没有把V1.4-S2-L15或V1标为完成。

## A20：Trade→Governance Historical Replay授权验证映射（2026-10-10）

Trade执行V1.4历史订单前会调用Governance `validateHistoricalReplayExecution`，现已逐字段断言生成客户端的身份、载荷与超时，并由完整V1.4代码套件通过；Replay Worker的授权签发→Trade端消费→FakeBroker执行三边关系及证据见[A20矩阵](./2026-10-10-v1-cross-service-route-matrix-a20.md)。该映射仅关闭一个客户端合同子项，不关闭V1.1-S2-L14或P1/A04完整矩阵。

A21补录Platform→Governance `receiveV12StrategySnapshot`生成客户端、直接合同测试及完整V1.2代码套件证据，保留P1/A04 OPEN；详见[A21](./2026-10-10-v1-cross-service-route-matrix-a20.md#A21-platformgovernance-v12策略快照接收映射2026-10-10)。

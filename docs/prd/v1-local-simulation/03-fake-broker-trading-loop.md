# V1.3 治理、风控与模拟券商完整交易链路

状态：PARTIALLY_IMPLEMENTED（2026-09-09历史自动与用户人工验收PASS保留；2026-10-08新增冻结`v1.3-trading-loop` 1.0.0 Fixture、Web实际消费与Hash显示、完整V1.3 code suite exit 0、Web/API/CLI矩阵21/21通过及交互栈启动/精确关停复验；全市场规则、锁版场景以外的订单故障边界、目标Ubuntu交付及本轮人工验收仍未完成）。[当前Fixture与交接审计](../../../evidence/audits/2026-10-08-p3-v13-fixture-and-handoff.md)、[Session推进应用层复验](../../../evidence/audits/2026-10-07-v13-session-advance-application-e2e.md)、[报价档回归Run](../../../evidence/audits/2026-10-07-v13-tick-parity-e2e.md)。版本入口：[README](./README.md)。共同约束：[三版共同规则](../05-three-version-delivery.md)。

## 1. 前置与范围

V1.2通过，策略已产生版本化目标；V1.1账户/账本可用。

本阶段所有订单、券商资产和成交均来自隔离模拟环境。真实业务数据库、Qlib或RD-Agent在声明“已验证”时必须真正执行；替身需独立标注。

## 2. 开发任务

- [ ] 实现治理建议、MANUAL_APPROVAL与AUTO_POLICY、Mandate、短期执行授权、次数预算与资源预留；每条交易腿和中间资金路径都检查。
- [x] 当前锁定V1.3 Fixture范围实现隔离FakeBroker订单/查询/撤单/成交/账户契约、稳定brokerOrderId和独立资产；完整矩阵及其同Run CLI核对通过，固定范围以外的市场/订单能力仍未声明。[矩阵日志](../../../evidence/audits/2026-10-08-p3-v13-refresh-fix-matrix-enabled.log)
- [x] 当前锁定V1.3 Fixture范围的接受/全成/部分成交/拒绝/UNKNOWN、重复Fill幂等及序号乱序、撤单/更正Outbox固定故障路径均已由完整Web/API/CLI矩阵和隔离PostgreSQL持久化测试验证；[矩阵日志](../../../evidence/audits/2026-10-08-p3-v13-refresh-fix-matrix-enabled.log)、[完整代码套件](../../../evidence/audits/2026-10-08-p3-v13-final-code-suite-after-security-guard.log)。未建模的市场和故障边界继续开放。
- [x] 当前固定V1.3场景冻结为版本化双市场Fixture，含全成、拒单、接受响应丢失、重复/乱序回报、Session推进和精确预期；每次运行保存seed/TestRun ID。[Manifest与场景输入](../../../fixtures/v1/v1.3/manifest.json)、[完整21项隔离矩阵](../../../evidence/audits/2026-10-08-p3-v13-refresh-fix-matrix-enabled.log)。尚未覆盖的市场能力与故障竞态仍在下方记录。
- [ ] 完成V1.1/V1.3交易写路径的服务端模式边界全量审计：Paper交易严格 PAPER + FAKE、LIVE/REAL fail-closed，页面不能直接改状态或余额；回测写路径须独立限定 BACKTEST + FAKE，不得把全平台误缩为仅PAPER。
- [x] Governance Proposal 内部HTTP边界拒绝`environmentMode=LIVE`/`brokerMode=REAL`（422且不调用Proposal仓储）；完整V1.3 code suite的Governance API单测通过，日志见[最终代码套件](../../../evidence/audits/2026-10-08-p3-v13-final-code-suite-after-security-guard.log)。此勾选仅对应该治理接受边界；PAPER/FAKE全服务安全任务仍保持未勾。

2026-10-08 服务端模式边界增量：Portfolio真实HTTP+PostgreSQL smoke现分别提交LIVE/FAKE、PAPER/REAL、LIVE/REAL，均返回403且账户数保持0；Trade V1.3手工执行HTTP端点拒绝附加`LIVE`/`REAL`模式字段（422、FakeBroker订单数0）；Governance Proposal API对同三种非法组合返回422且创建仓储总调用仍仅来自之前合法请求。完整V1.3 code suite exit 0，原始日志见[Paper/Fake服务端边界代码套件](../../../evidence/audits/2026-10-08-p3-paper-fake-server-boundary-code-suite.log)，SHA-256 `445546fc0ef4b94d0b6c2c30ad5f54a53d7ffe2be5b7ecd89cb40096c0698e68`。这组检查证明三个关键外部接受边界的拒绝与无副作用，不穷尽每个服务/路由，故上项仍未勾；历史回测的合法`BACKTEST + FAKE`授权也须与Paper范围分别审计。

2026-10-07当前工程增量：上述历史段落记录其生成时的能力边界。此后已新增PostgreSQL Proposal/审批/追加修订、基于会话actor的Platform API、执行前Portfolio当前资源重评、受限的CN/US固定Fixture订单链、FakeBroker独立资产/Fill Outbox、Web正式操作和同Run CLI读取。AUTO_POLICY新增Mandate整数分规则、PostgreSQL持久化/并发预算预留、Governance HTTP/OpenAPI、Platform受TestRun/owner约束的创建/精确版本激活/暂停代理，以及Trade→Portfolio→FakeBroker→Outbox执行路径和正式Web操作。当前隔离Web/API/CLI矩阵已扩展至21/21，覆盖CN/US正常链、Proposal修订/拒绝、AUTO正常/HOLD/预算上限/暂停/过期/证券范围拒绝、跨币种/现金不足拒绝、CN同日卖出拒绝、UNKNOWN固定故障恢复、Trade进程重启恢复、L09外部模拟订单差异、L10撤销会话、L07因果成交、缓冲成交与撤单待确认跨Trade重启恢复、L08部分成交/撤单/费用更正及投递失败恢复。PostgreSQL smoke覆盖Mandate过期且不产生预算记录。T+1证据使用Fixture开市日2026-09-28；持久Session推进和次日SELL闭环见[审计](../../../evidence/audits/2026-10-07-v13-tplus1-session-advance.md)。L10随机会话令牌摘要持久化，logout后立即撤销，Platform重启后旧Token仍401，见[会话失效审计](../../../evidence/audits/2026-10-07-v13-session-invalidation.md)。L08已覆盖撤单余量释放、费用更正幂等和一次性Portfolio投递失败后的持久Outbox重试，见[部分成交/撤单审计](../../../evidence/audits/2026-10-07-v13-l08-partial-fill-cancel.md)。L07固定撤单待确认重启时保留HELD预留、seq=3接受撤单后才释放余量，见[跨重启审计](../../../evidence/audits/2026-10-07-v13-l07-cancel-restart-recovery.md)。当前仍未完成的范围包括其他撤单竞态/故障边界、完整双市场规则覆盖、手册交接及本轮人工验收。L07缓冲事件跨Trade重启的单场景与全矩阵回归见[L07成交恢复审计](../../../evidence/audits/2026-10-07-v13-l07-restart-recovery.md)。自动Web/CLI矩阵的TestRun摘要保持WAITING/NOT_RUN；业务断言来自同Run只读检查，不能据此推定人工验收。第2节整体任务、第7节工程交付和新范围人工验收保持未完成。

实现边界核对（2026-10-06）：此前`V13TradingEngine`曾在Platform内构造账户、订单、Fill、风控拒绝和恢复结果，但没有调用Governance、Trade Execution、Portfolio或FakeBroker；该实现已纠正为`WAITING`/`NOT_RUN`，不再生成业务事实。第2节五项保持未勾选；既有历史人工签署保留，但本轮扩展后的签署仍NOT_RUN。隔离页面与持久TestRun表面E2E见[初次审计](../../../evidence/audits/2026-10-06-w1-v13-synthetic-web-e2e.md)及[边界修正审计](../../../evidence/audits/2026-10-06-w1-v13-waiting-boundary.md)。

V1.3当前WAITING API契约（2026-10-06）：固定场景/seed请求、202接受结果、owner-scoped读取和严格`NOT_RUN`证据形态已登记为独立Schema/OpenAPI；请求在Platform保存TestRun前执行边界校验。此契约冻结的是未执行状态，不是业务交易契约，也不满足本节真实服务工作流验收。见[契约纵切审计](../../../evidence/audits/2026-10-06-w1-v13-contract-boundary.md)。

V1.3人工审批域规则增量（2026-10-06）：治理服务新增纯领域`decideManualProposal`判定，对待审批状态、proposal版本与内容Hash、有效期、PAPER/FAKE模式、HOLD空腿及明确actor/reason执行fail-closed校验；时间由调用方传入，不读取系统时钟。治理服务完整单测7文件/31项、typecheck通过。当前函数只返回审批判定，不持久化Proposal/审批记录，不提供人工API，不执行风险复核、Mandate或短期执行授权，也不调用Trade Execution/FakeBroker；不得据此勾选第2节或声称V1.3人工审批流程验收完成。实现：[manual-proposal-decision.ts](../../../services/decision-governance-service/src/domain/manual-proposal-decision.ts)，测试：[manual-proposal-decision.spec.ts](../../../services/decision-governance-service/tests/unit/manual-proposal-decision.spec.ts)，[执行审计](../../../evidence/audits/2026-10-06-w1-v13-manual-approval-domain.md)，[历史执行快照Hash清单](../../../evidence/audits/2026-10-06-w1-v13-manual-approval-domain.sha256)。

2026-10-07治理持久化增量：Governance新增首版Proposal PostgreSQL仓储与迁移，内容Hash/同Run幂等键、不可变版本快照、owner范围读取、可信Platform服务身份发起的人工批准/拒绝记录；决策再次核对expectedVersion/contentHash/过期时间/PAPER+FAKE/HOLD空腿。Governance单测32/32、typecheck/build通过；隔离PostgreSQL smoke实测新增/相同载荷重放/改载荷冲突/owner隔离/旧版本冲突/批准持久回读均PASS，临时容器网络已删除并核验。当前还没有Web和Platform V1.3提案/决策代理、版本修订命令、审批后Portfolio风险与资源复核、执行授权、Trade/FakeBroker订单和成交链，因此第2/7节保持未完成，任何审批也不产生订单。实现及测试：[postgres-proposal-repository.ts](../../../services/decision-governance-service/src/adapters/postgres-proposal-repository.ts)、[proposal-repository.ts](../../../services/decision-governance-service/src/ports/proposal-repository.ts)、[proposal-postgres-smoke.mjs](../../../services/decision-governance-service/scripts/proposal-postgres-smoke.mjs)；[本轮增量审计](../../../evidence/audits/2026-10-07-v13-proposal-persistence.md)。

2026-10-07治理/组合Web子闭环增量：上段保留为第一代码切片快照；其后新增Proposal/决定合同及Governance OpenAPI/生成Platform客户端，接入会话绑定的V1.3账户和Proposal路由、浏览器批准/拒绝/旧版本冲突及刷新恢复、同Run/Proposal CLI核验；V1.3随机隔离Compose实际启动Platform/Portfolio/Governance/Trade/PG，normal/rejection/recovery三场景浏览器与CLI核验通过。详见[治理/组合Web子闭环审计](../../../evidence/audits/2026-10-07-v13-governance-web-loop.md)。尚未接风险复评、Mandate/预算、交易授权、FakeBroker订单/成交与账本，故第2/7节及历史人工签署范围保持未完成；Web批准仅记录治理决定。

2026-10-07持久Session推进及T+1 SELL增量：Platform新增TestRun范围的交易日历推进API和PostgreSQL事件日志，推进前检查账户与Run归属、CN_A/PAPER/FAKE、无待结订单/Fill/Outbox、无资源预留且独立FakeBroker资产与Portfolio完全匹配；使用锁版CN日历解析下一开市日，单调序号和幂等键保存Clock变更。Trade执行协调器允许已批准SELL经过T+1可卖量预留、Governance授权、FakeBroker资产账和Portfolio Fill Outbox。完整隔离V1.3 Web/API/CLI矩阵21/21通过；同日SELL零副作用拒绝，下一Session卖出100股后两账现金均为9990 CNY、持仓为0、差异为空；完整Code suite退出0。FakeBroker SELL原先按BUY变更独立现金/持仓并发出BUY Fill的缺陷已修复。详见[持久Session推进与T+1审计](../../../evidence/audits/2026-10-07-v13-tplus1-session-advance.md)。本轮新增Run人工验收仍NOT_RUN；全市场规则、手册及本阶段剩余交付不因此关闭。

2026-10-07 Platform提案协调应用服务切片：AUTO_POLICY命令、批准后的MANUAL命令、Proposal批准/拒绝及append-only修订的Owner/TestRun范围、稳定业务标识/版本Hash/reason与Run Clock协调已分拆到四个显式Ports应用服务，分别调用既有治理和交易客户端；服务不生成账本或FakeBroker事实。当前树V1.3 code suite exit 0（Platform 59文件/261项，Research Automation 218项，Quant Worker 14项），完整隔离Web/API/CLI矩阵21/21通过，含浏览器提案版本冲突、CN/US订单与同Run CLI。审计及代码快照见[治理协调应用服务审计](../../../evidence/audits/2026-10-07-v13-governance-coordination-after-revision.md)。这只覆盖上述四条入口；sequenced fill/cancel及部分业务事件协调仍位于HTTP控制器。第2/7节其余工程、全市场规则、第8节交接和新增范围用户签署继续开放。

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

以下勾选只记录本阶段交付进度，不能代替第2节逐项开发任务或版本验收结论。开发者凭实现/实测证据勾选开发项；“人工验收”仅在用户实际确认后勾选，不预填PASS。

- [x] 当前V1.3契约、锁版Fixture、场景与精确预期已冻结并通过Schema/SHA校验；见[当前Fixture与交接审计](../../../evidence/audits/2026-10-08-p3-v13-fixture-and-handoff.md)。
- [ ] 第2节全部后端任务完成；当前固定业务链通过，但全市场规则、锁版Fixture以外的订单故障边界和目标Ubuntu交付仍未完成，真实依赖与替身边界已说明。
- [x] 正式V1.3 Web页及21项正常/拒绝/恢复矩阵完成当前固定范围验证；完整API/浏览器日志见[本轮矩阵](../../../evidence/audits/2026-10-08-p3-v13-refresh-fix-matrix-enabled.log)。
- [x] Mac ARM64隔离入口、实际随机URL/API端口、Fixture路径/SHA、环境变量名、页面按钮、超时与精确清理说明已补齐并实测。目标Ubuntu命令/镜像与主机资源明细仍未验证，见[交互栈审计](../../../evidence/audits/2026-10-08-p3-v13-fixture-and-handoff.md)。
- [x] 开发者已执行第8节当前Mac隔离准备、完整矩阵、同Run只读CLI、证据导出及手动栈启动/探活/精确停止；保存代码门禁、矩阵和生命周期日志。自动化不代替新范围人工验收。
- [x] 当前锁版矩阵重复/恢复路径和适用快速测试均验证；其余市场/故障组合与真实观察范围明确列为未覆盖，不把Fixture加速场景冒充实盘观察。
- [ ] 历史用户验收只覆盖2026-09-09旧范围；当前扩展范围人工验收为NOT_RUN，等待用户实际确认，不沿用旧签署代签。
- [x] 操作说明、限制和自动证据已更新；[本版验收表](./99-acceptance.md)已同步。当前第8节保持DRAFT_NOT_EXECUTABLE，直到目标Ubuntu交付细节补齐。

## 8. 阶段验收操作手册

### 8.0 当前隔离验收命令（2026-10-08已复跑）

在项目根目录执行：

```bash
pnpm verify:stage -- --stage V1.3 --suite code
STOCKQUANT_V13_TEST_FEE_CORRECTION_FAILURE_ENABLED=true pnpm test:e2e:v13-isolated
```

第一条是完整代码门禁，第二条以随机隔离Platform/Portfolio/Governance/Trade/PostgreSQL/Web运行全部固定场景；L08费用更正失败恢复断言要求显式故障开关。当前通过日志：[V1.3完整代码套件](../../../evidence/audits/2026-10-08-p3-v13-final-code-suite-after-security-guard.log)、[新Fixture绑定21项矩阵](../../../evidence/audits/2026-10-08-p3-v13-refresh-fix-matrix-enabled.log)。此前无Docker权限和镜像下载unexpected EOF失败均保留，矩阵Harness清理随机项目资源后才重试。通过自动门禁不代表本轮用户验收通过。

Web 验收入口：`http://127.0.0.1:8080/acceptance/v1/v1.3`。每次运行保存页面显示的 `testRunId`，再用 `curl -H 'x-stockquant-user: acceptance-owner-1' http://127.0.0.1:3000/api/v1/acceptance/v1/v1.3/runs/<testRunId>` 核对后端证据。

### 8.1 当前可执行性与验收准备

手册状态：DRAFT_NOT_EXECUTABLE（V1.3当前Mac ARM64隔离Web入口与固定矩阵操作已实测；真实Ubuntu/长期恢复、完整交易所规则和本轮人工验收仍未完成；自动运行与人工签署分开记录）。

前置服务：平台/Web、数据/量化、组合、治理、执行/Gateway、独立FakeBroker、真实DB/NATS及本阶段所需编排。

固定输入：合法交易时段Fixture；CN现金10000、零持仓、买100股、RAW价格10、测试费5，固定Mandate/规则；seed=20260907。

| 开发交付时必须填写 | 当前值 |
|---|---|
| 实测代码Commit或工作区Hash/验证日期 | 当前检出HEAD由 `git rev-parse HEAD` 读取；工作区随代码修改，自动E2E逐Run导出Manifest Hash。Fixture SHA-256 `24d7494e5f4562561a387d176a76eae9134c9f6065bddf7eb69467c29ccc1770`，验证日期2026-10-08 |
| 项目根目录、Node/pnpm/Python/uv及Docker版本 | `/Users/huangbosong/Documents/ChatGPT/StockQuant`；Node v24.1.0，pnpm 10.34.5，Docker CLI 28.0.4；V1.3 Trade/Platform运行于锁版Compose容器。Mac主机Darwin/ARM64；目标Ubuntu环境版本与资源尚未验证 |
| Web基础URL/身份登录或会话建立方式 | 手动栈启动成功后终端输出随机 `http://127.0.0.1:<V13_WEB_HOST_PORT>`；容器Web正式页为其后缀 `/acceptance/v1/v1.3`。首个Web请求建立`acceptance-owner-1`本地会话Cookie；12小时过期，logout写入PostgreSQL撤销记录。仅限随机隔离项目，不是活动部署或生产认证证明 |
| 本阶段Web路由 | `/acceptance/v1/v1.3`，主机只绑定`127.0.0.1`的随机端口；不固定8080 |
| 正式页面的真实入口/跳转链接 | 页面标题“V1.3 治理、风控与模拟券商交易链路”；场景区“创建隔离 V1.3 TestRun”，账户区“初始化本 Run 模拟账户（10000）”，提案区含“创建MANUAL固定Fixture调仓提案”“创建AUTO_POLICY固定调仓建议”，命令区/结果卡展示Proposal、订单、成交、Outbox与独立FakeBroker对账；按钮名与Playwright正式页断言一致 |
| Fixture文件/数据版本/确切日期/Hash、规则与成本版本 | `fixtures/v1/v1.3/manifest.json`，`v1.3-trading-loop` 1.0.0；场景文件 `fixtures/v1/v1.3/trading-loop-scenarios.json` SHA-256 `24d7494e5f4562561a387d176a76eae9134c9f6065bddf7eb69467c29ccc1770`。CN_A/CNY：10000.0000初始现金、600000.SH、100股×10.0000、费用5.0000，预期8995.0000/100股；US_EQUITY/USD：10000.0000、AAPL、10股×25.0000、费用0.0500，预期9749.9500/10股。T+1日历版本`sse-cn-a-share-2026-1`，9/28至9/29 Fixture Session；seed 20260907。所有订单/时段为合成值 |
| 配置文件及必需环境变量名/非秘密测试值 | `pnpm stack:up -- --stage V1.3`自动生成随机项目、回环端口、PostgreSQL SCRAM凭据和服务token；仅`.codex/isolated-stacks/<project>.env`以0600存储，不复制或提交秘密。`STOCKQUANT_V13_TEST_FEE_CORRECTION_FAILURE_ENABLED=true`仅用于完整E2E里L08一次性Portfolio Outbox失败注入；人工交互不启用该变量 |
| 外部故障目标及可执行命令、恢复/隔离清理入口 | 不请求外部行情、券商或网络故障目标。固定错误在隔离服务内注入：原单查询暂时不可用、Trade容器重启、乱序/重复Fill、L08一次性Outbox投递失败；完整命令见8.4。使用终端输出的精确`pnpm stack:down -- --project <isolatedProject>`停止，等待`MANUAL_STACK_CLEANUP_VERIFIED` |
| 预期耗时、轮询超时、实际观察期/预算 | API/Web启动探测各最多120次×250ms（30秒）；手动入口实际E2E矩阵21项，Playwright用时约1.5分钟，冷Docker构建另计且受镜像下载影响；单个同Run业务查询客户端超时5秒。此为加速Fixture测试，无市场实际观察窗口、模型调用或费用预算 |

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
| recovery | UNKNOWN、进程恢复、乱序/重复Fill与撤单 | 浏览器正常页面使用“创建200股因果成交Fixture提案”“执行人工批准的固定Fixture提案”“发送seq2（累计150，先到）”“将同一seq2重放10次”“发送seq1（成交40股或累计100股）”；另Run用“创建L08 100股部分成交撤单Fixture提案”，执行后点“seq1部分成交后请求撤单并应用seq2成功结果”和手续费更正。注入UNKNOWN/查询故障和Trade重启用8.4自动矩阵。 | 原clientOrderId只产生一个订单；seq2先到保持缓冲，seq1后按序归约；重放不重复入账；撤单确认前余量Reservation保持HELD，成功后只释放未成交量；最终FakeBroker与Portfolio独立MATCH。 |

4. 从运行详情打开关联正式页面，执行一次刷新/关闭再打开；核对长任务后台状态、历史证据和加载/失败/陈旧提示。
5. 每项记录实际结果、截图与业务ID。异常场景“预期拒绝”被正确验证时断言可PASS，但被测业务操作仍显示拒绝；若意外接受则断言FAIL。

### 8.4 命令行复验与相同运行核对（待实现）

在项目根目录执行以下命令。隔离Web矩阵调用正式业务API、为21项浏览器场景分别导出TestRun证据、以相同UUID运行CLI只读检查并验证资源清理；L08单次故障需要显式开关。代码套件检查构建、Lint、类型、单测、合同、Fixture及隔离服务集成。两者均须独立执行；浏览器矩阵不能由单测替代。

```bash
pnpm verify:stage -- --stage V1.3 --suite code
echo "code suite exit=$?" # 完整代码门禁应为0
STOCKQUANT_V13_TEST_FEE_CORRECTION_FAILURE_ENABLED=true pnpm test:e2e:v13-isolated
echo "browser matrix exit=$?" # 21 passed、status=PASS、realBrokerCalls=0、exactProjectResourcesRemoved=true
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
| normal | PASS（固定CN/US MANUAL与AUTO业务断言；刷新后订单、Fill、费用、现金和MATCH均恢复；21项截图/Trace已归档） | `STOCKQUANT_V13_TEST_FEE_CORRECTION_FAILURE_ENABLED=true pnpm test:e2e:v13-isolated`，21/21 | 每项分别建TestRun并导出；完整清单见[矩阵日志](../../../evidence/audits/2026-10-08-p3-v13-refresh-fix-matrix-enabled.log)及[当前应用服务复验截图/Trace SHA清单](../../../evidence/audits/2026-10-08-v13-browser-captures-after-app-service.sha256) | PASS（模拟范围） |
| rejection（含固定拒绝子场景） | PASS（版本冲突、现金不足、同日SELL、Mandate/市场范围等零副作用） | 同上；21项完整矩阵退出0 | 同一矩阵日志含业务ID、订单/账本断言和同Run核对 | PASS（固定Fixture范围；未覆盖完整交易所规则） |
| recovery（固定注入与重启） | PASS（UNKNOWN原单查询、Trade重启、乱序/重复Fill、撤单/更正Outbox重试、T+1） | 同上；21项完整矩阵退出0 | 同一矩阵日志记录实际注入顺序、原Run与业务身份；截图/Trace Hash清单已生成 | PASS（固定路径范围；锁版序列之外的故障边界未覆盖） |
| Web同run只读核对与证据导出 | PASS（21个浏览器Run均同Run CLI检查并导出结构化证据） | E2E内部实际运行`verify-stage --run RUN_ID --check-only`及`evidence-export --stage V1.3 --run RUN_ID` | 见[矩阵日志](../../../evidence/audits/2026-10-08-p3-v13-refresh-fix-matrix-enabled.log)；逐Run evidence路径/Hash在日志和`evidence/local/V1.3/` | PASS（每个固定TestRun） |
| 本阶段代码测试/实际观察适用项 | PASS（完整V1.3 code suite：构建、类型、文档/合同/Fixture、隔离PG与服务集成） | `pnpm verify:stage -- --stage V1.3 --suite code`，exit 0 | [最终代码套件日志](../../../evidence/audits/2026-10-08-p3-v13-final-code-suite-after-security-guard.log)；固定模拟不构成实际市场观察 | PASS（代码）；真实市场观察NOT_RUN |
| 用户人工验收 | 待用户确认 | 不由脚本代签 | 确认人/日期待填 | NOT_RUN |

记录不适用子项的范围依据，不能将必需项改为不适用绕过门禁。归档后在[本版验收表](./99-acceptance.md)填写证据链接和结论。清理只针对本轮已结束的隔离运行，默认保留证据；停止测试不能删除数据库卷或取消无关任务。

2026-10-07 L03持久化补验：隔离PostgreSQL Proposal smoke已覆盖新增Version2及不可变旧/新version快照和修订事件行；Version1旧Hash审批返回`VERSION_CONFLICT`。详见[订单闭环审计](../../../evidence/audits/2026-10-07-v13-governance-web-loop.md)。本地工程仍未完结，不能勾选开发任务或新范围人工验收。

2026-10-07运行手册进展：新增V1.3 AUTO正常成交后的无Cookie跨owner订单读取403、跨TestRun读取404隔离断言；当前隔离V1.3 E2E 10/10通过。Trade P5.7隔离PostgreSQL/HTTP复验覆盖乱序撤单与Fill、重启后按序归约、部分成交后撤单释放及版本费用更正。到期Mandate持久化拒绝也已复验。上述只补充工程证据；本节第2/7节仍未全部完成，8.1的实际安装/stack/登录/Fixture资源/超时与Ubuntu运行参数、全L01-L10完整交接和人工签署仍未核验，因此8.1继续DRAFT_NOT_EXECUTABLE，8.6记录继续NOT_RUN。

2026-10-07 L10会话撤销及重启持久性：Platform本地会话使用PostgreSQL持久令牌摘要，logout撤销后即使重启Platform API，旧Token重放仍返回401；正式隔离E2E 15/15通过，细节见[会话撤销审计](../../../evidence/audits/2026-10-07-v13-session-invalidation.md)。仅更新V1.3隔离环境事实；五阶段实际运行手册、活动部署、剩余场景及本轮用户确认均未完成，8.1仍DRAFT_NOT_EXECUTABLE，8.6仍NOT_RUN。

### 8.22 2026-10-07 SCRAM交互栈与20/20矩阵复验（用户验收未执行）

V1.3交互栈由 `pnpm stack:up -- --stage V1.3`启动，实际验收页为 `http://127.0.0.1:50251/acceptance/v1/v1.3`；Platform `/live` 与Trade `/ready` 均健康。数据库主机认证为SCRAM-SHA-256，Harness生成随机数据库角色口令及服务Bearer token；私有env/state文件权限0600。使用`pnpm stack:down -- --project sq-v13-web-773629b8e36c2a5e16f3`后，精确项目容器、卷、网络、镜像及凭据状态文件均清理为0。完整E2E另以随机项目 `sq-v13-web-af5ff20faa2d6ca4c386`、显式一次性费用更正故障开关运行20/20通过，日志与失败首跑均见[SCRAM矩阵审计](../../../evidence/audits/2026-10-07-v13-scram-e2e-retry.md)。此证据只验证隔离工程与固定矩阵；没有创建人工签署，当前用户验收为NOT_RUN。8.1继续DRAFT_NOT_EXECUTABLE，V1.3仍需完成其余边界与交接。

2026-10-07 L08费用更正失败恢复及当前矩阵回归：隔离Trade环境注入一次Portfolio fee-correction Outbox交付拒绝后，持久重试第2次成功，订单详情可读`DELIVERED/attempts=2`，Portfolio/FakeBroker对账MATCH。最新正式矩阵20/20通过，证据见[20/20矩阵审计](../../../evidence/audits/2026-10-07-v13-web-matrix-20-20.md)。这关闭该固定恢复子场景，不代表其它成交/撤单竞态、完整规则覆盖或运行手册完成；8.1仍DRAFT_NOT_EXECUTABLE，当前范围用户验收仍NOT_RUN。


2026-10-07 P3 L08部分成交/撤单正式Web纵切：新增固定100股MANUAL CN Fixture，正式页面经会话作用域Platform路由创建seq=1 40股Fill，撤单前持久检查`CANCEL_REQUESTED`，再应用seq=2 ACCEPTED；FakeBroker将订单归约为CANCELLED，待成交Fill投递后通过Reservation Resolution Outbox释放未成交60股。费用revision=1从1.0000修正为6.0000且相同命令只记一次。真实隔离Platform/Portfolio/Governance/Trade/PostgreSQL/Web与同Run CLI矩阵通过：现金两侧均9594.0000 CNY、持仓40股、reservation RELEASED/capturedCashAmount 406.0000、对账MATCH；固定场景1/1 PASS，项目`sq-v13-web-1b0e53ad4a93a9cc4e5d`容器/卷/网络清理通过。修复了撤单结果HTTP路径未立即drain余量释放Outbox的缺陷；费用更正Outbox异步收敛后再独立对账。Run `ba3778b9-fcf2-4a67-9891-8ad49a38c80c`，业务证据与修复详见[部分成交撤单审计](../../../evidence/audits/2026-10-07-v13-l08-partial-fill-cancel.md)。L08其他错误恢复/竞态、P3其余矩阵、人工签署均仍待办；本增量不改变V1.3/P3验收状态。

### 8.23 持久Fixture Session推进与T+1 SELL复验

自动化隔离入口（仓库根目录执行；Docker需可用，项目、端口、口令和token由Harness随机生成）：

```bash
STOCKQUANT_V13_TEST_FEE_CORRECTION_FAILURE_ENABLED=true pnpm test:e2e:v13-isolated
```

此命令运行V1.3全部21项Web/API/CLI用例并自动清理精确隔离项目；成功输出`status=PASS`、`externalSourceCalls=0`、`realBrokerCalls=0`和`exactProjectResourcesRemoved=true`，Playwright应报告`21 passed`。L08用例依赖该一次性失败开关，否则它的“两次Outbox尝试”断言不适用。Run为自动建立的独立TestRun，结束前导出到`evidence/local/V1.3/<testRunId>/`。

L01/L05 T+1子场景固定输入：CN_A/CNY、PAPER/FAKE、Fixture账户初始现金10000 CNY、初始持仓0、首个Clock为2026-09-28 09:31 Asia/Shanghai、买100股×10 CNY、买入费5 CNY、版本化市场日历`sse-cn-a-share-2026-1`。同日SELL必须拒绝且不产生FakeBroker订单；经“按交易日历推进到下一Fixture Session”正式按钮后，Clock推进到2026-09-29 09:31，重复相同推进请求为幂等重放；随后SELL 100股×10、卖出费5，预期最终现金9990 CNY、持仓0、SELL资源预留CAPTURED、FakeBroker与Portfolio一致、差异为空。测试保存交易日历事件、订单/Fill和账户事实，并以相同TestRun调用CLI `--check-only`；只读核验不能执行或重放交易。

最近完整矩阵关键TestRun及结构化导出：[325a26ff-0f66-4ff2-8d4b-35944ae26f7d](../../../evidence/local/V1.3/325a26ff-0f66-4ff2-8d4b-35944ae26f7d/evidence.json)，SHA-256 `4ce29b59f8188e10df45fa8a2dd8eab3830080520e556644db53631854d3bce8`；对应报告见[Session推进与T+1审计](../../../evidence/audits/2026-10-07-v13-tplus1-session-advance.md)。浏览器基础URL/端口在完整人工交接入口中仍由Harness运行时生成；本节自动命令已实测，不能据此将整份手册改为VERIFIED_EXECUTABLE。

2026-10-07 L08释放时点/费用更正重放加强复验：撤单请求持久变为`CANCEL_REQUESTED`后，正式Platform路由从Portfolio回读并断言Reservation仍`HELD`，再发送seq=2 ACCEPTED；归约并drain outbox后终态`CANCELLED`、Reservation `RELEASED`。同一partial Fill的revision-1更正重放返回HTTP 202/`replayed=true`且不重复记账。隔离Harness单场景1/1、同Run CLI通过，最新Run `4597d1cf-81bc-4553-8fc7-4bd7f2926efc`、ManifestHash `7ab4490bc81b66b2c795b2649854a6a58684869b4eb45221319845e729978f9a`；详见[加强后的L08审计](../../../evidence/audits/2026-10-07-v13-l08-partial-fill-cancel.md)。L08成功路径更完整，但竞态/更正失败恢复及P3其他未决项仍未完成。

2026-10-08 刷新恢复与证据回看：首次逐项截图发现V1.3刷新后未恢复已持久订单显示。页面现在以当前Run/Proposal重新查询MANUAL/AUTO原`clientOrderId`并重建订单、Fill、Outbox与独立对账视图；L01 normal和L04 AUTO均增加刷新后FILLED/金额/MATCH断言。修复后完整固定Web/API/CLI矩阵21/21、V1.3完整code suite exit 0；刷新修复轮的21张截图/Trace及历史清单保留为[历史执行快照](../../../evidence/audits/2026-10-08-v13-browser-captures-refresh-fix.sha256)，其原输出目录后被Harness复用，旧Hash现不再对应目录内容；应用服务提取后的本轮21张截图/Trace及当前Hash见[新快照清单](../../../evidence/audits/2026-10-08-v13-browser-captures-after-app-service.sha256)。验收日志/根Hash与修复前诊断记录见[Fixture与交接审计](../../../evidence/audits/2026-10-08-p3-v13-fixture-and-handoff.md)。固定Run人工验收结论仍NOT_RUN；锁版序列之外的订单故障边界、全市场规则与Ubuntu环境，8.1仍DRAFT_NOT_EXECUTABLE，P3/V1保持未关闭。

L08增强后的完整V1.3矩阵回归：`pnpm test:e2e:v13-isolated`现18/18通过，含L01–L07、L09–L10及部分成交撤单/费用更正；所有场景各自的同Run CLI检查通过。随机隔离项目`sq-v13-web-26c45aee91d57f6f5097`资源清理核实，真实券商/外部数据调用0。最新L08 Run `552d9af8-ad6a-4af8-b594-abf4d1a19833`及ManifestHash `8a091502b3fdf44340071b6d684a368388bfee6078e27d7f3e1e7f8f92d0accf`。详见[L08与全矩阵审计](../../../evidence/audits/2026-10-07-v13-l08-partial-fill-cancel.md)。P3并未完成所有非固定故障、恢复、市场能力/交付与人工验收要求，阶段状态继续PARTIALLY_IMPLEMENTED。

2026-10-08 sequenced Fill应用服务提取：L07/L08正式Web端点的固定成交事件构造、Run/Proposal/权威FakeBroker订单范围校验、确定性事件身份/Run Clock及Trade写入协调已移入Platform Application的`V13SequencedFill`流程，通过StageRun、Governance、Trade和订单投影ports访问外部域；Controller保留会话身份解析和HTTP状态映射。新增4项应用服务单测，Platform全套单测265/265和typecheck通过；当前V1.3完整code suite受控运行exit 0，隔离Web/API/CLI矩阵21/21、同Run检查/export及精确资源清理通过。当前轮逐项截图/Trace及SHA清单见[应用服务复验快照](../../../evidence/audits/2026-10-08-v13-browser-captures-after-app-service.sha256)。默认权限首次运行的镜像可见性与Docker socket失败日志保留；受控重跑结果见[应用服务审计](../../../evidence/audits/2026-10-08-p3-v13-sequenced-fill-application-service.md)。L07/L08撤单协调仍待应用边界审查；固定测试和工程重构不代表市场规则、人工验收、Ubuntu或P3整体通过。

2026-10-08 L07/L08撤单应用边界完成：固定sequenced成交、撤单请求、接受结果、Portfolio HELD/RELEASED资源时序及最终投影检查均由`V13SequencedFill`应用流程通过ports协调；Controller仅做session identity、HTTP适配。新增7项应用服务单测，Platform全套60文件/268项、完整V1.3 code suite通过；专用失败注入配置下Web/API/CLI 21/21通过，外部来源/真实券商0，精确Harness清理通过。最新截图与Trace分配至独立本轮目录，避免旧Harness覆盖；[逐文件SHA清单](../../../evidence/audits/2026-10-08-v13-browser-captures-order-coordination.sha256)。审计及代码/E2E日志见[订单协调应用服务审计](../../../evidence/audits/2026-10-08-p3-v13-sequenced-fill-application-service.md)。复核时发现刷新修复轮的固定输出目录此前被Harness复用，原截图Hash失配；历史Hash清单已明确标作历史快照且不参与活动验证，旧字节未能恢复。之后Harness改用随机隔离项目的独立截图目录，本轮42个文件均有当前Hash。该修正不改变业务事实，但此证据保留问题已如实登记；P3市场规则、人工验收、Ubuntu及版本其余门禁继续开放。

# V1跨服务结算调用边核验 A24

日期：2026-10-11。范围：仅核对OD-014严格已结算现金流程中的Platform→Trade和Trade→Portfolio两个写调用；不关闭P1全服务路由/发布矩阵。

| 调用边 | 合同/生产调用 | 身份与服务器边界 | 当前运行证据 | 状态与限制 |
|---|---|---|---|---|
| Platform→Trade `settleForSession` | `GeneratedPlatformV13ManualTradeClient` POST `/internal/v1/v13/accounts/settlements`，载荷绑定namespace/account/owner/TestRun/asOf，Platform Bearer，15秒超时；V1.3 session advance在持久化Run Clock后调用 | Trade `authorizeTradeExecutionRequest`仅允许Platform身份；拒绝检查在路由处理前执行。Trade服务HTTP/PG smoke以错误Replay身份请求，返回403，并在namespace范围核对FakeBroker订单、Fill、事件、Outbox及sell receivable均为0 | Platform生成客户端合同测试10/10；V1.3固定CN/US同Run Web/API/CLI结算闭环；Trade集成HTTP身份smoke在完整V1.3 code suite中通过 | 此处覆盖固定Fixture范围。没有开展真实券商/真实市场日历测试 |
| Trade→Portfolio `settleAccountReceivables` | `GeneratedPortfolioAccountClient` POST `/internal/v1/accounts/{accountId}/settlements`，Trade Bearer，asOf取注入Run Clock，5秒超时；Portfolio拒绝状态/响应体由客户端保留 | Portfolio `authorizePortfolioRequest`将settlements route限定给Trade；Portfolio HTTP/PG smoke现对该路由做错误身份/错误Bearer矩阵，并将`sell_settlements`纳入前后业务事实快照；纯规则单测同时断言错HTTP方法及调用者拒绝 | Trade生成Portfolio客户端合同测试5/5；Portfolio集成6/6；HTTP身份矩阵8条路由×4身份、32次探测通过，拒绝后accounts/ledger/positions/fills/receivables/corrections/reservations均无变化 | 该矩阵证明错误凭据拒绝无副作用；授权成功结算路径由V1.3隔离Paper纵切及Portfolio repository integration覆盖，非矩阵本身证明 |

V1.3当前完整代码套件`pnpm verify:stage -- --stage V1.3 --suite code`受控退出0；原始日志、退出码、SHA-256见[套件A03](2026-10-11-v13-settlement-client-contract-code-suite-a03.log)、[exit](2026-10-11-v13-settlement-client-contract-code-suite-a03.exit.txt)、[SHA](2026-10-11-v13-settlement-client-contract-code-suite-a03.log.sha256)。生成客户端静态引用盘点见[Inventory A02](2026-10-11-v1-generated-client-test-inventory-a02.json)及其SHA sidecar；20客户端、73个生产客户端方法、缺少同客户端方法测试引用0。静态引用检查只用于发现缺口，不能替代本表中的行为证据。

剩余P1：其他V1调用边的caller/route/合同/副作用/迁移/发布回退矩阵尚未完成；活动库恢复副本、生产发布顺序/回退和活动存储切换仍未验证。保持`V1.1-S2-L14` OPEN；本次不授权活动存储切换。

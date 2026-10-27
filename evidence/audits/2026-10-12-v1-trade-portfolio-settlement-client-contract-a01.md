# V1 P1 Trade→Portfolio结算客户端当前树复验 A01

日期：2026-10-12。范围：复验既有[V1.3 §8.82](../../docs/prd/v1-local-simulation/03-fake-broker-trading-loop.md#882-od-014结算调用边生成客户端合同复验2026-10-11)记录的单一出站操作，不新增需求或覆盖其他调用边。

## 调用映射

Trade `V13ManualPaperExecution` 在处理新命令前，调用 `GeneratedPortfolioAccountClient.settleAccountReceivables(accountId, { asOf: command.now })`；`command.now`来自持久化Run Clock。生成客户端请求 `POST /internal/v1/accounts/{encodedAccountId}/settlements`，发送Trade Execution服务身份、对应Bearer、仅含`asOf`的JSON和5秒超时。Portfolio HTTP处理器验证Trade专属身份及凭据，严格拒绝除`asOf`外的请求字段，然后调用AccountService/Repository；结算事务按传入时钟将到期应收转为已结算现金。客户端保留Portfolio的HTTP拒绝状态和响应体，调用方不得将拒绝伪装成成功。

## 直接验证

- `services/trade-execution-service/tests/unit/portfolio-account-client.spec.ts` 的“settles account receivables with the Trade identity and preserves Portfolio denials”精确断言请求路由、编码账户ID、身份/Bearer、Content-Type、请求体、AbortSignal超时，以及HTTP 409响应映射。当前树定向文件测试5/5通过，日志、exit和SHA见[运行记录](./2026-10-12-v1-trade-portfolio-settlement-client-contract-a01.log)、[退出码](./2026-10-12-v1-trade-portfolio-settlement-client-contract-a01.log.exit.txt)、[SHA-256](./2026-10-12-v1-trade-portfolio-settlement-client-contract-a01.log.sha256)。
- `services/portfolio-risk-service/tests/unit/service-auth.spec.ts`确认结算写路由只允许Trade Execution身份；[V1.4 §8.92](../../docs/prd/v1-local-simulation/04-daily-backtest.md#892-portfolio结算路由严格请求体合同复验2026-10-11)记录真实隔离服务/PostgreSQL对额外LIVE字段的400拒绝与账本零变化。
- [V1.3 §8.81](../../docs/prd/v1-local-simulation/03-fake-broker-trading-loop.md#881-od-014-us_equity严格已结算现金paper-sell闭环2026-10-11) / [§8.80固定结算闭环](../../docs/prd/v1-local-simulation/03-fake-broker-trading-loop.md#880-v13双市场od-014严格已结算现金-paper闭环2026-10-11)保存隔离Web/API/CLI与双账本证据：SELL先形成应收，Clock达到显式结算时间后Portfolio与FakeBroker幂等结算，再次BUY只用已结算现金。
- 当前源码 SHA-256：Trade生成客户端 `605d16a97d2aadf1add33cab5dbc52c7a6b58b09b60d1084ba021a833d73474e`；Trade调用服务 `ccb9b53231e7074a0d0ffde59d72ae304563023cf11c777674c098e2d34824ab`；Trade客户端测试 `5ceded9e6a1ce25d838adb0a3510236385e91cd0b81777e0fb20631d5d2a1d99`；Portfolio HTTP处理器 `c659581db730829bc6d86e9438af4781366656aba3c6ead4d9412c4ad1220529`；Portfolio身份策略 `276d0348d187325792a23498148fa50b20130ba0e4dbe0225d600fef83be0189`；Portfolio身份测试 `2b26b19b6ed705ef0b924ff6714b4d8124923ba61ec9e1d97e5d87437df0c6ce`。

## 结论与限制

本次在当前树重新执行既有客户端测试5/5通过，确认§8.82所记的请求合同仍与当前源码一致。这只是既有P1/A04窄范围证据刷新，不新增需求、不重复开设阶段记录，也不证明所有Platform/Trade/Replay/Quant/Market Data跨服务操作、全部成功响应和副作用、版本兼容、活动发布/回退或配对恢复均已验证。`V1.1-S2-L14`与P1保持OPEN。

# W1 Trade Execution → Decision Governance Paper 授权生成客户端

日期：2026-10-01（Asia/Shanghai）

Trade Execution 的 V2.4 Fixture Paper 执行路径此前直接 `fetch` Decision Governance 的 `POST /internal/v1/paper-authorizations/validate`。现新增生成客户端，契约来源为 `packages/contracts/openapi/decision-governance-paper-authorization.v1.json`；请求必须继续携带专属 Trade Execution Bearer、服务身份、原始 authorizationId/accountId/精确 Fixture command，并使用 5 秒请求超时。授权拒绝仍沿用现有拒单路径，FakeBroker 和 Portfolio 资源预留流程未改变。

新增测试覆盖 URL/token 校验、固定路径、方法、身份头、请求体和 timeout signal。Trade Execution typecheck 与 54/54 unit tests、生成器漂移及完整 `pnpm contracts:check` 通过。V1.1全代码回归需要在本次变更后重跑；此次没有访问活动服务、Provider、市场数据源或真实Broker。

此项只覆盖现有 NO_TRADE Fixture 授权校验客户端边界，不能视作活动 Paper 订单、数据采集或人工验收。

## 变更后完整回归

`pnpm verify:stage -- --stage V1.1 --suite code` 在加入生成客户端后受控重跑退出 0；覆盖baseline、全仓build/lint/unit、contracts/fixtures及隔离Web/API场景。此次执行使用本机回环是为了通过Qlib worker边界测试，未访问数据源或活动业务服务。计划仍要求活动API切换/回退窗口和新增人工验收，故V1.1状态不变。

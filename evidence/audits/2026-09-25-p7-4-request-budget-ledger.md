# P7.4 模型请求级预算账本

日期：2026-09-25（Asia/Shanghai）

## 已实现

在实验总额预留之外，新增模型调用级预算记录，以 `(stageId, experimentId, modelRunId)` 唯一标识每个请求，并将预算金额绑定到规范请求 SHA-256。状态为 `RESERVED → DISPATCHED → SETTLED`，发送后结果未知时进入 `UNKNOWN`；未发送请求可标为 `REJECTED` 并释放额度。已创建的 modelRunId 不能改请求指纹或预留额；DISPATCHED/UNKNOWN 记录不能再次进入DISPATCHED。UNKNOWN 仍以全额预留参加额度计算，只有明确结算后才按实际费用占额。

PostgreSQL 事务锁定实验总预算行来串行化同一实验的请求额度检查；同实验所有请求预留和已知支出合计不能超过已批准的实验预算。实验总额不能在存在 RESERVED/DISPATCHED/UNKNOWN 调用时结清，且最终汇总额不能低于已结算请求费用。失败的并发预留事务回滚，不留下无效请求行。

新增仅依赖注入的 `ModelGatewayCoordinator`：只有预检ready且新建预算记录后，才持久标记DISPATCHED并调用Provider port；已存在的modelRunId直接返回记录状态而不再次调用Provider；Provider抛错或用量无效时转UNKNOWN或继续保留DISPATCHED全额占额。固定假Provider单测验证调用顺序、已知费用结算、重复ID不重发、预检阻断和异常UNKNOWN。

## 验证

- 研究自动化服务单元测试：19个测试文件、85项测试通过，覆盖重复modelRun、异请求冲突、UNKNOWN占额、结算幂等/冲突、未发送释放、实验汇总不变量及注入假Provider的编排顺序；模拟数据库dispatch已提交但确认丢失时，Provider不会被调用且预算保留。
- `research_automation_test` PostgreSQL 集成：`tests/integration/pg-budget-ledger.spec.ts` 3/3通过；覆盖并发调用额度争用、未知调用结算和父预算门禁。测试使用随机stage/experiment ID；测试结束删除测试stage的预算行，外键级联删除模型调用记录。
- `pnpm --filter @stockquant/research-automation-service build`：通过。
- `git diff --check`：通过。

## 未完成/未启用

该coordinator尚未从服务HTTP、RD-Agent或Runner工作流调用，也没有生产Provider adapter，更没有绑定供应商报价版本或价格表。暂未验证Provider返回用量/账单对账、超时后供应商侧状态查询、有界重试策略、连接重定向拒绝、底层网络出口限制、Runner/Paper并行可用性或Web同run证据。没有调用任何Provider，没有消费真实预算；Gateway状态仍NOT_CONFIGURED，V3.1真实研究、P7.4与OD-009仍未关闭。

## Test-only service HTTP wiring (2026-09-25)

Added an authenticated `POST /v1/model-gateway/fixture-call` integration path that is registered only when both `NODE_ENV=test` and `STOCKQUANT_MODEL_GATEWAY_TEST_FIXTURE=true`. It accepts only a fixed scenario (`COMPLETED`, `TIMEOUT`, or `OVER_BUDGET`) and fixed response data; it does not accept a provider URL, credentials, prompt, arbitrary response, or arbitrary cost. The path calls the same `ModelGatewayCoordinator` with the actual `PgBudgetLedger`: request reservation commits before the injected Fixture provider; known 23-cent use settles; timeout and over-reservation remain UNKNOWN at the full reserved amount; repeating a modelRunId returns existing status without another provider call. In normal/non-test mode this route returns 404, and the real preflight remains BLOCKED/NOT_RUN. The platform service identity can read preflight and invoke the test-only route; Runner Host is denied.

`pnpm --filter @stockquant/research-automation-service model-gateway:fixture-http-smoke` exits 0 after creating and dropping a random temporary PostgreSQL database and temporary artifact directory. It checks blocked real-provider preflight, caller-scope refusal, fixed response and actual settlement, durable row contents, duplicate-call idempotency, timeout UNKNOWN hold, no retry of UNKNOWN, exhaustion refusal, and over-reservation UNKNOWN hold. The fixed provider made zero external calls. Research unit/type/build checks also pass. This connects the coordinator to the service's test path; it does not close production provider, provider invoice reconciliation, bounded retry, egress enforcement, production deployment, or real-model authorization gates.

`pnpm verify:stage -- --stage V3.1 --suite code` then exited 0: contracts 34 schemas/23 fixtures/23 compatibility rules; research lint, 85/85 unit, 10/10 isolated-PG integration; platform 40/40 unit; platform and Web typechecks. Full baseline passes with 575 links and 13 Fixture files.

## UNKNOWN reconciliation after ledger reconstruction (2026-09-26)

Extended the isolated PostgreSQL model-call budget test: after dispatch and marking the original request UNKNOWN, a newly constructed `PgBudgetLedger` re-requests the same `modelRunId` and fingerprint. PostgreSQL returns `created=false` with the same UNKNOWN reservation, so the caller cannot dispatch a second provider request; after an externally known 40-cent usage is supplied, settlement succeeds and repeating the same amount is idempotent. Changing the settled amount remains forbidden, and unresolved reservations continue to occupy budget. The full V3.1 code gate passed with research unit 95/95 and isolated-PG integration 14/14. This validates local durable recovery only; it does not verify provider-side request status, invoice data or production retries.

# W2/P-F05 FakeBroker partial-fill cancellation state regression

Date: 2026-10-02 (Asia/Shanghai)

## Behavior changed

`PostgresFakeBrokerRepository.cancel()` locks the exact FakeBroker order row and writes `CANCEL_REQUESTED`, the prior working status, and its order event in one transaction. A terminal order or an order whose cumulative fill already meets the request remains non-cancellable. Repeated and concurrent cancel requests while the broker outcome is unknown return the current `CANCEL_REQUESTED` state without adding another event or pretending the retry is an authoritative broker acknowledgement. The new `resolveCancellation()` transition models an authoritative FakeBroker outcome transactionally: acceptance closes the unfilled remainder (`CANCELLED`, or `FILLED` if cumulative quantity is complete); rejection restores the prior working state, adjusted to `PARTIALLY_FILLED`/`FILLED` when fills exist. Late duplicate results cannot overwrite the first result. Idempotent order replay after cancellation returns the current status together with the original persisted Fill.

The persistence scenario creates 100-share SELL orders whose fixed historical execution yields 50-share partial Fills. It races two cancellation requests, retries once, verifies exactly one request event and unchanged Fill/Outbox, then separately tests accepted and rejected outcomes, event persistence, late duplicate suppression, and reconnect/replay retaining the authoritative current status and exact original Fill. It runs in an ephemeral digest-pinned PostgreSQL container bound to loopback only.

## Verification

- `pnpm --filter @stockquant/trade-execution-service lint` — exit 0.
- `pnpm --filter @stockquant/trade-execution-service test` — exit 0; 13 files / 58 unit tests, plus 4 isolated-Postgres-target guard tests.
- `pnpm --filter @stockquant/trade-execution-service test:integration:persistence:isolated` — exit 0. Disposable PostgreSQL image ID `sha256:9e9764474d0c70ceff17378a6eca55b00c98d2f4d564be06a8e82f2431b3caa2`; container `sq-test-postgres-a8d00f83a8287ed7`; ephemeral 127.0.0.1 port only; `activeServices=NOT_CONNECTED`. The container was removed in `finally` and its exact name no longer inspected.
- `pnpm test:e2e -- --stage V2.4` — exit 0 on final run. Normal, rejection and recovery API TestRuns completed, three Browser TestRuns passed, CLI checked the same TestRuns with exit 0, dropped recovery response was confirmed, and report field `activeServicesTouched=false`. TestRun IDs: API normal `8d346243-ab1c-47f4-8912-dbc457580dd1`, rejection `7769c016-380a-4071-9b54-a277c608fdfe`, recovery `5567f520-aa4e-4ce2-a9ac-adca1c2a9ed7`; browser TestRuns `7695f7b1-0176-4044-9426-c164b35a0573`, `2b406cd4-45e8-4835-9e6b-0befa859d84b`, and `2d0fad1e-a5b6-4af2-8c82-dcaf10c5920f`. The exact run suffix was queried read-only in the dedicated test PostgreSQL afterward; zero databases remained for that suffix.
- `pnpm --filter @stockquant/trade-execution-service test:integration` — exit 2 because its legacy default `trade_execution_test` database was not available on 127.0.0.1:5433. The scoped disposable-Postgres test above replaces that missing environment for the changed persistence behavior; this failure remains recorded.

Two initial isolated-test attempts also remain recorded: the first harness invocation used the wrong working directory and did not start the persistence test; after that was fixed, a test exposed that the old toggle implementation manufactured `CANCELLED` on duplicate cancel and omitted the existing Fill on replay. The state machine was corrected to preserve `CANCEL_REQUESTED` until an authoritative outcome exists, and the final isolated test passed.

## Remaining P-F05 gaps

The accepted/rejected outcomes are deterministic FakeBroker simulations; no real broker is called. Platform-only HTTP records an authoritative outcome; the Trade order transaction durably records its state/event. A scoped `RESERVATION_RESOLVE` Outbox waits until any `FILL_POST` is delivered, then resolves the exact Portfolio reservation; failures are retryable and retain compensation state. Portfolio's independent PostgreSQL integration proves that after a partial BUY Fill captures `2010.0000`, resolving as `CANCELLED` preserves the captured amount, releases the unfilled hold, and allows reserving the account's remaining cash (`5980.0000`). The app unit tests prove delivery acknowledgement ordering and retry-on-Portfolio-failure. An actual incoming-Fill/cancel causal race with cross-service HTTP/PG fault injection, fee correction/reversal semantics, and a separately injected FakeBroker external order remain NOT_RUN. Real brokers remain forbidden by project scope. P-F05 and W2 stay IN_PROGRESS.

## 2026-10-02 full V2.4 code regression

After the cancellation outcome extension, `pnpm verify:stage -- --stage V2.4 --suite code` exited 0 in the controlled local environment. It ran baseline checks, whole-repository build/lint/typecheck/unit tests, Python worker loopback tests, dedicated persistence/Portfolio/Market Data PostgreSQL integration, service-auth checks, V2.4 cross-service normal/rejection/recovery, Chromium Web runs, same-Run CLI checks, and the read-only Linux ARM64 readiness container. API TestRuns: normal `6a4c4d08-9d34-46e1-a609-06e3931aff8b`, rejection `754f06b8-8ce7-41ff-b467-8414f7fd27a8`, recovery `3eaf8faf-6f18-4c99-9280-2d263006c236`; corresponding Web TestRuns `8096e395-2482-4443-a238-136ca1336e9e`, `aa8319be-975f-4330-bd72-84ed58ba9bca`, and `6fd954ab-c69d-433f-8f85-1dd050900d92` all exited 0. The integration report states `webApiCliSameRun=true`, `lostRecoveryResponseConfirmed=true`, and `activeServicesTouched=false`. Readiness image `sha256:0607f2333ab0e5499dba8795bf7b3fdffd6ec9e926ca1c018ca33f7b411008d9` ran `linux/arm64`, isolated network and ephemeral DB, and `activeServices=NOT_CONNECTED`. A separate isolated persistence run reported PASS using PostgreSQL image `sha256:9e9764474d0c70ceff17378a6eca55b00c98d2f4d564be06a8e82f2431b3caa2`, removed its exact container, and verified request/accept/reject/replay semantics. This is code evidence only; it does not close W2 or imply human acceptance, real-source authorization, continuous observation, or Ubuntu acceptance.

The Portfolio cancellation-release integration assertion passed separately with `pnpm --filter @stockquant/portfolio-risk-service test:integration` (3/3; TestRun `f75446cc-f8dc-4895-b273-cd8b9174455b`) and the service-auth HTTP smoke. Lint and all five Portfolio unit tests also passed. The ordinary sandbox run failed with loopback `EPERM`; the controlled local test-database rerun passed. The subsequent complete `pnpm verify:stage -- --stage V2.4 --suite code` exited 0 with this test included. Latest API TestRuns: normal `d0d8b9c8-4fc7-49be-8240-f8769d4503ff`, rejection `1d81560a-e868-4362-bd9a-0c3087d0a8c1`, recovery `a4120746-df55-4c09-b825-16c25da72041`; corresponding Web TestRuns exited 0 with same-Run CLI assertions. The output reported `activeServicesTouched=false` and ARM64 readiness PASS. This still does not prove the missing Trade→Portfolio cancellation-resolution orchestration.

No market-data source, external model Provider, real broker, Paper account, or active service was called or modified.
# 2026-10-02 补充：撤单结果跨服务编排

在先前撤单状态机基础上，本轮完成了Platform服务身份保护的HTTP撤单结果入口及Trade→Portfolio持久Reservation释放Outbox。取消结果严格校验；迟到回报不反转既有终态。接受撤单释放未成交占用时，若Fill Outbox尚未完成投递，则延迟创建释放事件，避免Portfolio先释放再收到Fill。Outbox有独立租约、ACK/失败重试和事件类型化补偿路径。

Portfolio集成测试证实：部分BUY捕获现金2010后，接受取消仅释放未成交预留，已捕获金额保留；账户剩余金额可再预留5980。Trade隔离PostgreSQL测试覆盖释放事件需等Fill交付、Claim/ACK后完成，以及断线重连。HTTP smoke覆盖历史回放身份拒绝403、非法载荷422、无待处理订单409和平台身份接受回报；释放不会早于未完成Fill Outbox。

最终阶段回归：`pnpm verify:stage -- --stage V2.4 --suite code`退出0。契约215 JSON/149 schema/36 Fixture；normal/rejection/recovery API TestRun分别`687f66a2-db86-4a28-b06b-7dc78846e666`、`d37fb6fa-a746-4b50-b97e-0deca95bb464`、`5a380d6b-c209-4cf6-a082-dd4e3523cd39`，对应Web Run `8cebb03f-fd05-4936-82b1-9cbe61ed4ae5`、`181229e3-437e-4505-a8de-ec0c815670a2`、`fa23c990-9be1-453a-8aea-d899e61531d3`全部exit 0且同Run CLI通过；Linux ARM64 readiness镜像digest `sha256:f58c80ea103a451e1b8b6d75edea38ed9bbc0fa1972fb766b3b254d4f565e777`通过，`activeServices=NOT_CONNECTED`。隔离PostgreSQL镜像`sha256:9e9764474d0c70ceff17378a6eca55b00c98d2f4d564be06a8e82f2431b3caa2`测试通过并清理。

限制：未覆盖可控FakeBroker成交回报与撤单结果真正并发交错的完整顺序矩阵；费用更正及可注入独立外部委托仍缺。阶段代码PASS不等于W2完成、真实数据授权、持续观察、Ubuntu实机或用户验收。

## 2026-10-02 补充：并发权威撤单结果

为验证仓储事务，而不通过测试SQL伪造订单状态，在隔离PostgreSQL集成脚本中为已有部分成交订单同时提交模拟ACCEPTED与REJECTED撤单结果。真实`resolveCancellation`路径竞争同一订单行锁；每次随机竞争只有一个结果成功提交，另一个观察到订单已离开`CANCEL_REQUESTED`并返回无匹配结果。数据库断言要求恰有一条权威撤单结果事件，最终状态与获胜结果一致；Fill仍待投递时不创建Reservation释放事件。

`pnpm --filter @stockquant/trade-execution-service test:integration:persistence:isolated`退出0，临时PostgreSQL镜像`sha256:9e9764474d0c70ceff17378a6eca55b00c98d2f4d564be06a8e82f2431b3caa2` loopback-only，容器` sq-test-postgres-5833b14b0dac0cf3`结束后已删除，活动服务`NOT_CONNECTED`。Trade 60单测及4个隔离目标防护测试通过。

该项只验证两个取消结果竞争同一订单的事务裁决，不验证Fill事件与取消结果按券商权威序号乱序到达。FakeBroker仍缺后续Fill事件/累计高水位/事件序号接口，因此成交-撤单交错矩阵、费用修订及独立外部委托继续NOT_RUN。

在增加“最终状态必须匹配唯一获胜结果”的断言后再次复跑相同隔离集成，退出0；容器`sq-test-postgres-a464bc09a9f5c995`也由runner删除，镜像Digest及活动服务边界不变。

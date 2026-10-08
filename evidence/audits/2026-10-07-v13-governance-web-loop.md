# V1.3 Governance / Portfolio Web 子闭环

## Portfolio CN T+1 sell reservation (2026-10-07)

Portfolio resource reservation now accepts an injected `asOf` timestamp for SELL commands, persisted as part of reservation identity so a changed clock cannot replay an earlier decision. For `CN_A`, it excludes BUY fills whose timestamp falls on the same `Asia/Shanghai` local date before calculating sellable quantity; US accounts retain same-day sell eligibility. `node scripts/run-isolated-postgres-command.mjs --url-env PORTFOLIO_RISK_TEST_DATABASE_URL:portfolio_risk:portfolio_risk_test -- pnpm --filter @stockquant/portfolio-risk-service test:integration` passed all 4 integration tests plus the HTTP service-auth smoke. Contract generation/check, Portfolio typecheck and `pnpm docs:check` also passed (4747 local links). After this change, `pnpm verify:stage -- --stage V1.3 --suite code` exited 0, including workspace build/typecheck/unit gates and the isolated Portfolio integration target.

Formal L05 same-day sell scenario subsequently exercised the Proposal→Trade→Portfolio boundary in the V1.3 isolated Web/API/CLI matrix: TestRun `fce8381a-5ba2-4b50-84db-97d93aaf8126` first completed a CN buy (100 × CNY 10, fee CNY 5), then created and approved a 100-share SELL proposal. Trade submitted the SELL resource request with the same injected Run Clock; Portfolio returned `T_PLUS_ONE_UNSETTLED_QUANTITY` before authorization or FakeBroker submission. Independent assertions found cash 8995.0000 CNY, position 100 shares, one Captured BUY reservation, and SELL order lookup 404; same-Run CLI returned the truthful stage WAITING/exit 2. The full isolated matrix passed 12/12 under project `sq-v13-web-151800225d18d68db3d4`, with exact containers, volume and network removed and external-source/real-broker calls at zero.

After adding this path, `pnpm --filter @stockquant/trade-execution-service test` passed 82 unit tests plus 5 isolated-Postgres-target guard tests. Full `pnpm verify:stage -- --stage V1.3 --suite code` exited 0, and final `pnpm docs:check` found 4748 local Markdown links with zero failures.

The V1.3 fixed SELL Fixture currently supports only this risk-rejection probe: if Portfolio accepts a sellable SELL reservation, Trade releases it with explicit REJECTED evidence and refuses before authorization/broker submission. The date comparison uses Shanghai local date rather than a versioned trading calendar; next-session sell execution, holidays, and full market-rule verification remain open. This advances but does not close L05/P3.

## Date correction: T+1 fixture uses an actual trading session (2026-10-07)

Review found the prior Portfolio test used 2026-09-25 → 2026-09-26 and called the latter the “next Shanghai trade date”; the frozen SSE calendar marks 2026-09-25 through 09-27 CLOSED. Corrected the integration sample to buy on 2026-09-24, reject a same-date sale, then permit reservation on 2026-09-28. The Market Data calendar unit test independently asserts 2026-09-25 CLOSED and 2026-09-28 TRADING. V1.3's deterministic TestRun Clock now uses 2026-09-28 09:31 Asia/Shanghai, a Fixture-confirmed open session, instead of the then-current 2026-10-07 holiday.

After correcting these dates, the Portfolio isolated PostgreSQL integration passed 4/4; calendar unit tests passed 3/3. The full V1.3 isolated browser/API/CLI matrix passed 12/12 under project `sq-v13-web-fd8d870e3109d5423148`; corrected same-day T+1 Run `baac1599-7704-4ad3-b24b-c0936d1be0dd` ended at 8995.0000 CNY/100 shares/one Captured reservation and sell order lookup 404. All exact test containers, volume and network were removed; external-source and real-broker calls were zero.

The T+1 adapter itself still compares Shanghai calendar dates and does not query the Market Data calendar. The deterministic V1.3 sample is anchored to the known `sse-cn-a-share-2026-1` dates, while arbitrary holiday/session authorization and next-session sell execution remain unimplemented.

## 后续进展：L05拒绝边界与现金耗尽（2026-10-07）

最新隔离 Web/API/CLI E2E `node scripts/test-v13-web-e2e-isolated.mjs`：11/11 PASS；项目 `sq-v13-web-854cb8fa430283f28473` 的容器、卷和网络均已删除，外部源/真实券商调用0。新增正式场景覆盖AUTO_POLICY跨币种（US/USD Proposal 对 CN/CNY Mandate，403）和证券范围不匹配（403），均无Portfolio预留、现金变化或FakeBroker订单；另以固定CN Fixture连续成交9笔1005.00 CNY订单，将现金从10000降至955，第10笔因Portfolio余额不足返回409，同一clientOrderId重放返回403，最终仍只有9笔Captured预留，拒绝订单查询404。Trade单测同时验证组合预留失败会释放Mandate预算 reservation。Run IDs：币种/范围 `9efcc264-3f7a-4db9-bf41-d8a63845cf6c`，现金耗尽 `76955552-4b03-4cea-98df-b962647d150a`。Web typecheck PASS。

边界：固定V1.3下单Fixture当前只支持BUY，因此没有验证T+1可卖量/卖出日内约束；本证据仅关闭币种、Mandate标的范围和资金不足的拒绝路径。L05整体仍待补T+1及其他场景和人工验收。此次完整11场景同时回归此前L06 UNKNOWN恢复、L04预算上限/暂停/到期等边界；code suite和整版V1验收状态不因此自动通过。

日期：2026-10-07。结果：受控隔离端到端检查 PASS；V1.3交易链与阶段验收仍 NOT_RUN。

## 实现

- 冻结 Proposal、单腿、决定命令/结果 JSON Schema、Governance OpenAPI 和生成 Platform client。Platform 以会话身份提供隔离 PAPER/FAKE 账户初始化、Proposal 提交/owner-scoped读取、approve/reject 路由；对 `accountId` 复核 owner、TestRun、namespace 和环境范围。
- Governance 只接受 Platform 服务身份写 Proposal/决定；Trade Execution、其他调用方无权创建/读取/决定。Proposal 绑定账户、Run、策略Fixture版本、内容Hash和幂等键；决策需要精确版本/hash与Run Clock。
- Web 可操作 CN_A/CNY 或 US_EQUITY/USD 的隔离空账户，创建固定手工Fixture提案并批准、拒绝或验证旧版本冲突；URL携带Run/account/proposal ID，刷新后服务端重新读取持久事实。CLI支持 `--run RUN_ID --proposal PROPOSAL_ID --check-only` 通过同一Platform API验证相同Proposal；Run整体仍WAITING时退出2，表示订单/成交闭环未完成。
- 新增 V1.3 独立Compose项目，实际启动Platform、Portfolio、Governance、Trade和临时PostgreSQL；不依赖活动容器/数据库。策略版本严格限定`fixture-manual-test-v1`，不绑定或激活V1.2 TopK活动策略。

## 验证

- `pnpm contracts:check`：PASS，含Schema校验、类型/客户端生成漂移、兼容矩阵、OpenAPI及生成器登记检查。
- `pnpm --filter @stockquant/platform-api-service typecheck`：PASS。
- `pnpm --filter @stockquant/decision-governance-service typecheck`：PASS；7 files / 33 tests PASS。
- `pnpm --filter @stockquant/web build`：PASS。
- `node scripts/test-v13-web-e2e-isolated.mjs`：exit 0。normal / rejection / recovery各通过；同一浏览器会话先建TestRun与CN隔离账户，再建Proposal；normal批准→`APPROVED_MANUAL`，rejection→`REJECTED_MANUAL`，recovery旧版本请求→409且记录仍待审批；刷新读取同ID及持久状态；CLI同Run/Proposal只读检查成功并准确返回stage WAITING/exit 2。Harness确认精确Compose项目的容器、卷、网络已删除。
- 隔离项目：`sq-v13-web-1b20c3b6727be47d9149`；TestRun IDs：`81fb46b8-b6ad-496a-be63-87bf9d512cb6`、`ad65c9e8-c1a3-465c-ae51-d38c6d72719d`、`11483ea3-b4c4-4cf1-87c2-3517d9d43054`。Temporary DB删除后不保留业务订单/账户事实；运行过程未调用外部来源、模型或真实券商，FakeBrokerOrders=0。

## 尚未证明

没有Proposal修订、人工审批后的风控重评、Mandate/自动授权、次数预算、资源预留、FakeBroker订单/成交/outbox→Portfolio入账、独立FakeBroker资产、UNKNOWN/重复Fill/乱序/撤单/费用更正、对账页面或整套P3业务矩阵。页面批准只记录治理决策，不授予下单授权。账户和决定是隔离工程事实，不是V1.3人工验收签署；阶段第2/7/8节、V1.3状态与P3均未完成。

## 后续进展：短时执行授权

Proposal持久化后新增了仅Trade Execution服务身份可签发/消费的短时执行授权，授权绑定Proposal版本/hash、owner、TestRun、account、clientOrderId和完整命令Hash，过期时间不超过Proposal过期时刻与5分钟。Platform身份不能调用该端点。消费只允许ACTIVE→CONSUMED；相同授权精确重放返回REPLAYED，命令Hash变化返回INVALID。

- Governance：typecheck与33项单测 PASS；Trade Execution typecheck、`pnpm contracts:check` PASS。
- 一次性 PostgreSQL smoke：首次授权、最多5分钟TTL、按clientOrderId相同载荷重放、仅一次消费、精确重放、错误命令Hash拒绝均 PASS；TestRun `94bea626-20f3-4889-a2f1-194325fd4758`，Proposal `78a68002-d4de-409d-a846-85bdbc640165`。随机PostgreSQL容器与网络已删除并核实。
- 实测发现并修复重复消费漏洞：消费UPDATE原先未约束`status='ACTIVE'`；修复后相同授权的第二次校验不会再次得到VALID。
- 此授权目前仍未接入订单执行器，不代表任何订单获准或FakeBroker已有订单。

## 后续进展：L01 CN正常订单子链

之后接入了独立V1.3 Trade命令：Trade按owner/run/account读取提案并只接受已批准、未过期、`fixture-manual-test-v1`单腿BUY；CN和US价格/费用/数量由代码冻结Fixture推导，Web不提交交易价格或费用。Trade先让Portfolio做账户范围和可用资源预留，再签发并消费Governance短时执行授权，然后在FakeBroker持久化订单、Fill、sequence=1的权威事件及Fill Outbox。Outbox交付同一Portfolio模拟账本并捕获已占用资金。Trade出现不确定重试时先按(namespace, clientOrderId)查询原单，不盲目再下单；Platform/CLI只读路径按proposal+TestRun校验订单事实。

- CN正向浏览器流程实际执行：Run `5dae79a2-8f6c-4299-844f-52c01f16a298`，同一Proposal/订单完成审批后买入100股 `600000.SH` × CNY 10.00，Fixture费用CNY 5.00；浏览器断言Fill为100股、Outbox已交付、Portfolio现金8995 CNY、持仓100股。
- 页面刷新后再点执行，命令沿用 `v13-{proposalId}`；服务返回原订单，不生成第二单。`verify-stage --check-only --stage V1.3 --run ... --proposal ... --client-order ...`读取相同订单和授权范围；仍按整阶段未完成返回WAITING/exit 2。拒绝/旧版本冲突两个场景不创建订单，均由浏览器与原Proposal CLI检查通过。
- `node scripts/test-v13-web-e2e-isolated.mjs` exit 0，隔离包含真实Platform、Portfolio、Governance、Trade服务和PostgreSQL。测试账户/数据库随一次性Compose资源删除；Harness确认精确容器、卷和网络都已清除。外部数据源/真实券商调用均为0。
- 2026-10-07最新复跑补齐L01 CN独立FakeBroker资产账：Trade单事务以Fixture初始10000 CNY建立自己的券商模拟现金，记录Fill资产事件、扣除1005 CNY、持仓+100；Platform从Trade独立读取券商资产，与Portfolio的现金8995 CNY和持仓100逐项比较，结果MATCH。对账同时读取原clientOrderId对应的Portfolio预留，确认capturedCashAmount=1005.0000、状态CAPTURED。只读CLI断言以上资产、预留、订单和Run/Proposal范围；Web刷新后同clientOrderId重复执行返回既有订单。
- 最新隔离E2E normal TestRun `fa02e057-c00c-4e66-ab72-c952829fa2b7`，容器项目 `sq-v13-web-545bcc5278243f697e6a`；normal/rejection/recovery均PASS，且脚本核验所有容器、卷、网络删除。现在L01 CN的正常路径和独立对账证据齐全；其他L01故障/拒绝变体及人类签署仍未完成。L02 US只完成固定命令构造单测，尚未走服务E2E。
- 之后抽出`V13ManualPaperExecutionService`应用协调器，HTTP入口只解析合同并映射错误；Trade 73项单测（应用顺序与未批准不预留/不下单）、typecheck通过。最新隔离Web/PostgreSQL E2E扩展为4场景并PASS：CN normal TestRun `23fd098a-0d5e-411a-bc63-8ac2a511ae2e`，US L02 TestRun `cd81f109-3f31-4e60-8186-8565fa65731e`，人工拒绝 `9cd63d97-94c1-4b42-8680-11ec2fbffab0`，旧版本恢复 `4334f149-6f58-4834-b547-bede42c6106b`；隔离项目`sq-v13-web-24301dfb5a5818ca7349`。L02断言US独立现金9749.9500 USD、AAPL持仓10、订单10×25.0000/费用0.0500、资源预留250.0500状态CAPTURED、与Portfolio对账MATCH、同Run CLI只读通过。四场景完成后精确容器/卷/网络清理验证通过，外部源和真实券商调用0。
- 回归：Trade 71项单测和类型检查、Platform 215项单测与类型检查、Web生产构建、合同检查及链接检查通过；本轮三场景隔离E2E最终通过。此前两次E2E失败（API参数路由冲突、CLI缺省参数误读）均已修复，最终结果以此成功复跑为准。

本次订单链源码快照 SHA-256：

```text
800b143910aaa689a2b0b3cc0d6445af9881487bf042a95e1b92f30ee816b28b  apps/web/src/main.tsx
69f2b27351cc363e49e035034f4b059b4cdf147d560b6a65da50bbc71e8b886e  apps/web/tests/e2e/v11-acceptance.spec.ts
1b6a49b629fcf852867a312ee3a3b201d8d9608aeee81dcb342fcfc89fc86794  infra/compose/docker-compose.v13-integration.yml
26bfb933aed2c02f22a22a91a6e4580f07cceb54c1914d5083fafb75cd2787eb  packages/contracts/openapi/trade-execution-v13-manual-paper.v1.json
2f3da979163a4e3166f52d1df740ce7c712ddf931a494921d795212fc07206ee  packages/contracts/schemas/common/v13-manual-paper-execution-command.schema.json
e554e1e1e5380d80e81f296b29ad47a122b6d34ac45613a0d2b43701166b3942  scripts/check-openapi-contract.mjs
0e41402c73766a2d0475cdb19841f7811126e352c2627a1a9ab99d9726f3cb39  scripts/generate-platform-v13-manual-trade-client.mjs
a6d6a6079a1ace4be4f6d4431a63ffc85bf829094f3660d829aa969fcf76c809  scripts/test-v13-web-e2e-isolated.mjs
376db7ab065cff7db4cfee329cf030fc30ae4e6bcebe1e679dd8910cd9fc5c80  scripts/verify-stage.mjs
baea83d320fbd47f29cf17c0b42cd1ab5cba890993b1943315b26a9069e030f5  services/platform-api-service/src/bootstrap/app.module.ts
c61f456ab8d7d0712ba53a73c844c2b7f64de9b8ca4a1a91da8b1885b166ba6d  services/platform-api-service/src/contracts/generated-v13-manual-trade-client.ts
2db060753c1226179a0d7e2c4e413bcf1c7e687992b97116f8e3e8e8a840c00c  services/trade-execution-service/src/adapters/postgres-fake-broker-repository.ts
6aaf0a52009469d6f38504aabab7b9c2d76fe2412a9bf114dd2cce2285243303  services/trade-execution-service/src/application/v13-manual-execution.ts
676fcf6ad5ad076720092590a9b0de708bf5296b88c265def88a5d6f63b6ea3e  services/trade-execution-service/src/bootstrap/main.ts
285f170bdccba3b7d8e87e46b5ca14424fac50dce49a8ce0f06345020b222b85  services/trade-execution-service/src/service-auth.ts
7c031aaab093ac7f21af67002af4d40c166b1f357b1d51fa15674dbbba225e45  services/trade-execution-service/tests/unit/v13-manual-execution.spec.ts
```

## 关键源码 SHA-256

```text
b5080262d6c0bbc6753d42a29b32fa52e09feaa33939377f074c599f0ac12119  apps/web/src/main.tsx
7d7ff746f8537cfb48e24bf347d6bc004a3a608a572527d1af5a63f56fe9a420  apps/web/tests/e2e/v11-acceptance.spec.ts
f6c0cefa84fd659e0fb6668e9faa023c7652c7cc082806a566ca59166770660c  infra/compose/docker-compose.v13-integration.yml
b35025343341c5b4bd75636331a6aa69b7ed35cca1ca319e6ff016b029d8d82d  packages/contracts/openapi/decision-governance-v13-proposals.v1.json
14257ab9e7cebd95eec97271877cda1ec8a001d9e2096835e490a64218fa7169  scripts/generate-v13-proposal-client.mjs
0ed981243600d12126c2e0d486f00a0a555309e7faef462c6bfdfe5e1b6750fc  scripts/test-v13-web-e2e-isolated.mjs
61a12274dd6b415f7352de9124acf086fb5c79c5c0a47947a8367d981765b2a9  scripts/verify-stage.mjs
c9238e70e8c749ea24863a4afcc38e6f0a73515c988e5171e53e89b3e1ced60b  services/platform-api-service/src/bootstrap/app.module.ts
01ab2fae72372af75a795dbe3cca1a6b5adfeb42e2345efddd87d771ddbbaa08  services/platform-api-service/src/application/v13-trading.ts
7d9d7358d20d914d10feb4203d5eb08e9b0cef24722fbf5cf0ac2cf1bb06cb24  services/decision-governance-service/src/adapters/postgres-proposal-repository.ts
323c6ae7881fc432eac8ae36f087a83419a9edb275399b6da6312b511c025bd4  services/decision-governance-service/src/application/governance-api.ts
b41174cf4f404d0f6cdc1f3d4c35078e4b178034783536f22aa57dd4ab4ca66b  services/decision-governance-service/src/application/service-auth.ts
3b860597e00a4b37dc846a001684a1b2ddd0e95d20f9e48757f5833a077c72bc  services/decision-governance-service/tests/unit/governance-api.spec.ts
1236801cfb148e83211d509ccad8419eabbff52b74dc1ec94795f4310391126e  services/decision-governance-service/scripts/proposal-postgres-smoke.mjs
```

## L03 Proposal 追加修订与旧版本冲突复验（2026-10-07）

Governance 新增 owner-scope 行锁修订事务：限定 `MANUAL_APPROVAL_PENDING`，校验可信 Platform owner/actor、expectedVersion、expectedContentHash、Run Clock 和有效期，更新当前版本时同时追加 `proposal_versions` 与 `proposal_revisions` 审计记录；账号与策略绑定保持不变。Platform 提供 `/revisions/append` 正式 API，Web 可追加修订，旧版本的审批请求不能覆盖新版本。

隔离运行 `node scripts/test-v13-web-e2e-isolated.mjs` exit 0，项目 `sq-v13-web-d6420472af6939a59208`，已确认容器、卷、网络精确清理。四个 Playwright 场景（CN normal、rejection、recovery、US normal）4/4 PASS；修订恢复 Run `505d0f3d-98ec-41a0-bf8b-4613257c2b4b`断言追加到版本2、Hash变化、状态回到`MANUAL_APPROVAL_PENDING`，拿版本1/旧Hash批准返回HTTP 409，后续读取仍为版本2待审批。正常场景各自订单/资产断言继续通过。修订接口无owner header拒绝由Governance单测覆盖。合同检查通过；Governance 33单测、类型检查、Platform类型检查、Web生产构建通过。外部行情/真实券商调用均为0。

L03仍未完成：审批后执行前的重新风控评估/风险版本绑定尚未实现，也尚无人工验收。因此P3退出条件、阶段复选框和验收状态保持未通过。该次实现涉及的源码快照Hash将在P3矩阵完成后统一刷新，避免把继续变化的工作树误记为最终Hash。

L03 执行侧复评补证：审批后提交订单时，Trade重新从Governance读取当前提案，并以该版精确数量/费用向Portfolio申请最新现金资源预留；资源不足返回冲突后不签发/消费执行授权、不调用FakeBroker。新增协调器单测覆盖此顺序与零place（Trade全量单测74/74通过）。结合上方版本修订E2E，L03工程路径具备提案修订、旧版本冲突、当前审批状态和执行前资源复评；仍缺正式阶段/用户验收，且复评仅覆盖本轮固定Fixture资源约束，不代表完整通用风控策略系统已通过。

L03 持久化验收增强：扩展`proposal-postgres-smoke.mjs`，随机隔离PostgreSQL再次实测修订Version 1→2、两个版本Hash保留、proposal_revisions包含prior/new版本、Hash、actor，且version 1旧Hash审批返回`VERSION_CONFLICT`；全部13个Proposal/执行授权场景PASS。Run `62dd0499-6493-4bcc-96c4-8e29c8874647`，修订Proposal `73de6224-da49-4990-9b7b-d927a08bd239`，v2 Hash `391b38231f715fe699461fc2ce2af92d7ff0e07fe1a4910979369330ba0f01ce`。使用postgres:16.9-alpine固定镜像Hash `sha256:9e9764474d0c70ceff17378a6eca55b00c98d2f4d564be06a8e82f2431b3caa2`、loopback随机端口；容器与网络清理并验证通过，未连接活动服务。

## L04 AUTO_POLICY 规则域起步（2026-10-07，未接入）

新增纯域`evaluateAutoMandate`：以Run/owner/account/strategy/市场/币种/证券、版本Hash、有效窗口、暂停状态、逐单额度、累计已接受或预留预算及最大订单数为输入；金额使用整数分避免浮点误差。HOLD必须为空腿且不新增额度/次数；超次数、超预算、过期、暂停、跨账户/Run/策略/币种或证券范围均返回明确拒绝原因。Governance 8文件/37项单测、类型检查通过。

这只是确定性规则起步，还没有Mandate持久化/版本激活、预算并发原子预留、Platform/Trade执行路由、AUTO_POLICY正式页和Web/CLI E2E；L04未完成，也不允许将该域单测描述为真实AUTO交易通过。后续应先补持久Mandate与预算预留，再接入仅FakeBroker的自动路径及暂停/第三笔/过期矩阵。

## 当前完整代码门禁复验

`pnpm verify:stage -- --stage V1.3 --suite code`在受控loopback测试权限下最终exit 0：baseline/contracts/fixtures/service layer与全仓build、lint、typecheck、unit均通过。新增切片所在服务结果为Decision Governance 8文件/37项、Trade Execution 17文件/74项、Platform API 50文件/215项；quant worker Python 14项，其他Workspace服务的测试也在门禁内通过。普通沙箱首次因Quant Worker临时`127.0.0.1`监听返回EPERM，未重试随机数据；在同一命令受控重跑通过。V1.3业务场景仍依赖本审计所列隔离E2E和PostgreSQL smoke；code suite PASS本身不关闭P3范围或V1阶段人工验收。

基线复验时发现2份V2旧运行清单所指共享Trade源码已被之后V1工作树修改，另1份旧清单所指V2文档因本轮标注调整发生Hash变化。保持旧清单字节不变，在对应V2验收引用中明确标注“历史执行快照”后，`node --test scripts/verify-version.test.mjs`4/4通过，V2 verifier恢复为其应有的exit 2/INCOMPLETE；历史V2用户签署和执行证据未改写。

### L04 AUTO Mandate 持久化、治理接口与Platform代理（自动交易链未完成）

新增AUTO Mandate PostgreSQL仓储与迁移：按Mandate ID+version保存内容Hash、owner/TestRun/account/strategy/market/currency/securityScope、逐单/累计金额上限、最大order数、有效窗口和状态；创建为PENDING，可信actor对精确版本/hash批准后激活，暂停记事件。每次order授权先锁该Mandate版本行，读取已占用预算和次数，调用纯域重新判定，再原子插入唯一clientOrderId预留；消费/确定性释放分别保留状态。增加同范围单ACTIVE唯一索引，限制跨服务并发创建。

进一步完成治理契约和接口：OpenAPI及生成客户端纳入`contracts:generate/check`；Governance只允许Platform创建/激活/暂停，只允许Trade逐单请求预算授权；Platform代理校验当前owner、V1.3 TestRun、PAPER/FAKE账户及注入Clock。创建请求固定mandateId，完全相同重放返回原记录，异内容冲突。合同检查通过（199个Schema、29个客户端生成器）；Governance 8文件38项单测、Platform/Governance类型检查和Governance构建通过。

最新隔离PostgreSQL smoke Run `0b25bd83-f8b2-41d4-83e3-747f8d690c8c` exit PASS，25个场景覆盖AUTO Mandate仓储与HTTP创建幂等/精确激活、三并发两预算获批及第三笔拒绝、同单重放/异命令拒绝、预算账目/暂停、Trade HTTP预算授权落库、Platform越权拒绝，以及Proposal版本、决定和执行授权路径。使用`postgres:16.9-alpine`、随机loopback端口的专用容器和网络，结束后删除且复核。此证据不代表AUTO交易通过：尚无正式Mandate Web页，Trade尚未把预算授权与FakeBroker订单、Portfolio资源占用及预算消费/释放连接成协调流程，也未验证UNKNOWN恢复及Web/同Run CLI矩阵；L04和P3保持未完成。

释放恢复专项复验：扩展仓储，使同一订单的确定性释放状态在重复授权时明确拒绝，而不重用旧预算授权。最新隔离PostgreSQL Run `5a35b015-0d03-4272-82d1-bd534a9ad6cf` exit PASS，26场景含“released AUTO reservation cannot authorize blind replay”；Governance typecheck/build通过，文档链接检查4738项、0失败。随机loopback专用PG容器及网络已清理并核实。该结果仍是授权仓储安全，不代表端到端未知订单恢复完成。

### L04 AUTO_POLICY FakeBroker纵向闭环与HOLD（2026-10-07，矩阵未完）

Trade新增`V13AutoPaperExecutionService`，以Governance持久Proposal/Mandate为授权事实，复核owner/TestRun/account/策略/市场/币种/固定Fixture腿，先锁定含费用预算，再预留Portfolio现金/持仓资源，才调用FakeBroker。确定性资源预留失败会释放Mandate预算；不确定FakeBroker结果保留两个预留并要求按原clientOrderId查询，禁止盲重发；成功时消费Mandate预算并入账Outbox。Platform只验证TestRun与PAPER/FAKE账户并代理执行，订单/资产真相仍归Trade/FakeBroker。Web刷新后回读Mandate/Proposal/账户；成功提交后另调订单查询接口，进行FakeBroker与Portfolio独立资产核对。

AUTO策略Proposal现被持久化为`AUTO_POLICY_PENDING`，市场/币种绑定账户，Governance授权时从数据库重读Proposal并校验全部范围/hash/腿；仅承认冻结CN 600000.SH 100股@10.00、fee 5.00及US AAPL 10股@25.00、fee 0.05固定场景。预算单笔/累计含费用。生成的Proposal/Mandate/Trade接口纳入契约漂移检查；`pnpm contracts:check`通过（282 JSON、201 Schema、44 Fixture，29生成器；9契约测试与2生成器注册测试通过），Web build及Governance/Trade/Platform typecheck通过。

最新`node scripts/test-v13-web-e2e-isolated.mjs` exit 0，临时项目`sq-v13-web-21823833fb59c4912f6a`，隔离Compose/Postgres、随机loopback Web，Playwright 6/6 PASS：CN MANUAL normal、rejection、revision/recovery、US独立USD、AUTO正常单（Mandate人工激活后100股成交、fee-inclusive 1005.0000 CNY预留/捕获、现金8995.0000 CNY、FakeBroker对账MATCH、刷新后同Run CLI复核）、AUTO HOLD（order NONE且账户现金保持10000，同Run CLI检查Proposal）。正常AUTO Run `29c91809-d9d1-492d-a7cb-4f4240e113e0`，HOLD Run `44319a23-342d-4db3-97d0-fccc64567303`。专用容器/卷/网络全部移除，脚本最终报告`exactProjectResourcesRemoved: true`及`externalSourceCalls: 0`、`realBrokerCalls: 0`。

追加第三单预算/次数超限的真实服务场景后，最近一次相同隔离脚本仍exit 0，项目`sq-v13-web-317c9687d71025be5f6f`，Playwright 7/7 PASS。第三个不同Proposal在前两单正常成交并占满两单/2010.00 CNYMandate后，执行返回409；权威FakeBroker原单查询为404，Portfolio现金保持`7990.0000`，无第三个订单。该Run `3d65ccea-5a2d-494b-85e9-7c82b35ac5f6`，Mandate `71bdd903-60e1-4a60-8a29-005120bcb9f8`。最终脚本报告`exactProjectResourcesRemoved: true`，专用容器/卷/网络清理已核实；外部源与真实券商调用均为0。

再补暂停后新Proposal服务端拒绝：UI人工暂停精确Mandate后，通过浏览器同源API创建新的AUTO Proposal并直接请求Trade执行；返回403，账户现金保持`10000.0000`且对应clientOrderId权威订单查询404。最终隔离项目`sq-v13-web-84e2bce19201107966e0`，Playwright 8/8 PASS，脚本报告所有随机容器/卷/网络已删除，真实行情/券商调用均为0。修正后的暂停场景按后端语义使用403（inactive Mandate），第三单次数上限仍为409。

最近`pnpm verify:stage -- --stage V1.3 --suite code`受控重跑exit 0；baseline/contracts/fixtures/service layers、全仓build/lint/typecheck/unit通过，Governance 39、Trade 80、Platform 215、Quant Worker Python 14及其它Workspace测试均通过。普通沙箱首次在Quant Worker随机loopback bind返回EPERM；同命令受控复跑完成。`pnpm docs:check`最近一次检查4740个本地链接无失败；Proposal结果合同将始终返回的`approvalMode`、`market`、`currency`字段改为必需并重新生成类型/客户端。该Code门禁与浏览器证据仍只覆盖当前这些V1.3范围，不能宣称P3全矩阵或版本通过。

L04和P3仍未完成：还需复跑当前代码对应的隔离PostgreSQL smoke；把暂停/到期/跨范围拒绝和FakeBroker UNKNOWN/原单恢复纳入HTTP/Web/独立后端计数证据；补迟到/重复/乱序Fill与费用更正等L07/L08，以及资金不足、当日卖出/币种等L05、外部差异L09、会话/越权/重放L10。代码门禁通过不等于这些场景或人工阶段验收通过。

## L06 AUTO_POLICY UNKNOWN 故障恢复（2026-10-07）

Trade应用协调器增加可选的故障序列端口；默认无故障。仅V1.3隔离集成Compose显式启用，且要求clientOrderId前缀`v13-fault-unknown-`：事件1在FakeBroker已持久提交后丢弃响应；事件2对原clientOrderId查询一次性返回503。两次失败期间Portfolio现金预留保持`HELD`，恢复逻辑只查询同一原单，不再次place；找到后消费Mandate预算、交付Fill Outbox并返回独立资产与Portfolio核对。重放已成功记录时先读取原单和Outbox，补交付后再生成最终读模型，避免账本落后于FakeBroker。

`node scripts/test-v13-web-e2e-isolated.mjs`最终PASS，Playwright 9/9；随机项目`sq-v13-web-ca1c93131842ec60cd5d`已确认容器、卷、网络全部清理，脚本报告`externalSourceCalls: 0`、`realBrokerCalls: 0`。L06 Run `6e9a38de-3dbf-44b3-82de-37280394bd46`，Mandate `b7cc1423-8615-4823-9832-38baff06fb7b`，Proposal `8a9769a4-e74f-45bf-990a-420959207507`，clientOrderId `v13-fault-unknown-8a9769a4-e74f-45bf-990a-420959207507`。实际HTTP序列503/503/202；唯一FakeBroker order `36003765-73dd-4430-8853-67aff05bd621`，唯一Fill `5e6bec02-8fc6-4f3f-bc6c-2b8a6d5a5b8a`（100股×10 CNY，fee 5）；Outbox DELIVERED、Mandate CONSUMED、Portfolio reservation CAPTURED 1005、现金8995、持仓100股；独立账本核对MATCH、无差异、0未决订单和0待交付Outbox。同Run CLI只读检查通过。

首次重跑的断言错误把Trade摘要计数误当成订单读取端的`status`；保留该失败证据后，将Trade摘要断言改为0未决/0待交付/空差异，订单读取端断言MATCH，最终9/9通过。全量`pnpm verify:stage -- --stage V1.3 --suite code`随后完成：docs/contracts/fixtures/layers、全仓build/lint/typecheck/unit均PASS，Trade 81、Platform 215、Governance及其他服务测试通过，Quant Worker Python 14通过。普通沙箱不能连接Docker daemon和Quant Worker loopback；在本机受控权限下执行隔离E2E及完整代码门禁。此证据覆盖固定的响应丢失+单次查询失败恢复，不证明服务/worker重启、任意消息乱序或所有L06子条件已完整通过。

L06这一固定恢复场景已取得工程证据，但P3仍未完成。AUTO到期/跨scope拒绝、L05资金与T+1/币种身份矩阵、L07重复/乱序、L08部分成交/撤单/费用更正、L09外部独立资产差异、L10权限与真正进程重启等仍未齐备；正式阶段验收和用户签字仍为NOT_RUN。

## L04 AUTO_POLICY 证券范围拒绝（2026-10-07）

新增正式 Web/API 隔离E2E：对CN PAPER/FAKE账户创建并人工激活仅含`000001.SZ`的Mandate，再为同一Run生成交易证券为`600000.SH`的AUTO_POLICY Proposal并提交执行。服务返回403；账户现金仍为`10000.0000`、Portfolio reservations为空、FakeBroker权威订单查询404；同Run `verify-stage --stage V1.3 --run <UUID> --proposal <UUID> --check-only`准确返回WAITING/exit 2且不创建副作用。Run `1e933aca-0854-4021-bc52-dbb18d461cab`，Mandate `549b0cc6-dd29-4da4-bd1c-f6f4bcbd9391`，Proposal `125c781b-f9fc-4f76-8f9b-3d82a4e9f7ee`。最终隔离项目`sq-v13-web-d3b9d0f4d25f9f10f2ac`，Playwright 10/10 PASS，随机容器/卷/网络清理已核实，外部源/真实券商调用0。新增拒绝场景后完整E2E整体通过；Mandate到期仍只有注入时钟域判断证据，当前V1.3 TestRun API没有安全的时钟推进操作，尚缺PostgreSQL/API层到期边界场景。旧测试首次将POST激活成功误判为200，实际HTTP 201；按真实Nest路由状态码修正后复验通过。

## L04 Mandate 到期与范围拒绝持久化补证（2026-10-07）

通过仓库的有界PostgreSQL包装器运行`node scripts/run-isolated-postgres-command.mjs --url-env GOVERNANCE_PROPOSAL_TEST_DATABASE_URL:governance_proposal_test:governance_proposal_test -- node services/decision-governance-service/scripts/proposal-postgres-smoke.mjs`，最终PASS。固定Mandate于10:00到期，仓储使用10:00的注入Run Clock授权时返回`REJECTED/MANDATE_EXPIRED`，数据库查询确认该Mandate的预算预留记录为0。Run `f9368f71-f780-4d3d-afcd-7f89bc94542e`、过期Mandate `7e0589b1-78cc-4b6d-be2d-c989efde84a4`。同一smoke复验此前的PostgreSQL持久化、并发预算、幂等、释放重放安全、HTTP身份授权等场景。固定postgres镜像sha256 `9e9764474d0c70ceff17378a6eca55b00c98d2f4d564be06a8e82f2431b3caa2`，仅127.0.0.1随机端口；活动服务未连接，临时容器/网络清理已确认。

正式Web/API矩阵新增Mandate证券范围测试并纳入同Run CLI check-only。最新`node scripts/test-v13-web-e2e-isolated.mjs` Playwright 10/10 PASS；Run `1e933aca-0854-4021-bc52-dbb18d461cab`，仅授权`000001.SZ`的Mandate拒绝`600000.SH` Proposal为403，现金10000、预留0、订单查询404、CLI保持WAITING/exit 2。Compose项目`sq-v13-web-d3b9d0f4d25f9f10f2ac`通过Docker独立查询确认无容器、卷、网络残留；外部源和真实券商调用为0。L04到期现有Postgres仓储证据和范围Web服务链证据已补强，但还缺经相同正式页面/Platform服务暴露Clock推进或同等完整链路的到期验收；L04其余预算/市场和全项目其他闭环仍未完成。

完成新增拒绝与到期证据后的全量`pnpm verify:stage -- --stage V1.3 --suite code`受控执行exit 0。普通沙箱同命令exit 1，失败详情为Quant Worker loopback监听EPERM（其他已执行项正常）；保留失败后，在本机受控loopback权限下同命令复跑exit 0。该门禁覆盖docs/contracts/fixtures/layers、全仓build/lint/typecheck/unit；本次Governance 39、Trade 81、Platform 215、Quant Worker Python 14及其它Workspace单测均通过。该代码门禁与上面的业务E2E/Postgres smoke分开记录，不单独代表P3完成。

## L07/L08 FakeBroker 顺序事件复验与 L10 订单读取隔离（2026-10-07）

`pnpm --filter @stockquant/trade-execution-service test:p5-7`在当前工作树PASS。专用隔离Postgres/HTTP故障套件Run `aae5d1b1-ddd7-4b28-961c-1176ba905246`验证Outbox第一次响应丢失、服务重启后仅一次有效领取并恢复部分订单；固定取消sequence=2先到、Trade重启、Fill sequence=1再到后依序归约到sequence 2，75股累计量转换为增量，缺口期间Reservation保持占用，Fill投递后取消确认再释放余量。费用修订1从1.0010更正至2.0010、重放幂等且原Fill fee不变；外部订单独立观察产生`EXTERNAL_ORDER_MISSING_LOCALLY`差异。镜像digest固定、随机loopback、有界独立网络，无活动服务连接；容器和网络清理复核通过。该服务级证据验证L07/L08/L09底层FakeBroker能力，不替代V1.3治理Mandate/页面同Run验收。

V1.3正常AUTO成交页面新增真正无Cookie的异用户读取及随机错误Run读取：异用户请求403、跨Run请求404；本Run原订单仍可读，CLI刷新复核通过。Run `d35b3fae-91af-472c-a50f-f9c93ce6e2a6`。最新`node scripts/test-v13-web-e2e-isolated.mjs` 10/10通过；项目`sq-v13-web-462d139fdc7c0f78ac65`容器、卷、网络均已清理，真实行情/券商调用0。第一次跨用户检查复用了带当前session cookie的页面请求，观察到原身份被正确保留；改为独立无Cookie上下文后，服务对未授权身份返回403，复验通过。

## L06 Trade Execution 进程重启后原单恢复（2026-10-07）

新增隔离V1.3固定故障场景：FakeBroker事务已提交订单、Fill、资产与Outbox后，Trade HTTP响应丢失；Platform/Portfolio保持原Run及资源预留，测试只重启随机Compose项目内的Trade Execution容器。容器ready后浏览器使用原`clientOrderId`重试，Trade从持久FakeBroker查询唯一原单并完成Mandate结算与Outbox投递，不执行第二次place。

Playwright V1.3 Web/API/同Run CLI套件13/13通过。Run `98d252d4-5f6d-49c8-84aa-8819b09b342a`，Proposal `cba584d4-5f57-41d7-bf3b-483ec8f325f4`，Mandate `a54286e3-9a63-4301-abc0-b783e5ae549a`，clientOrderId `v13-fault-restart-cba584d4-5f57-41d7-bf3b-483ec8f325f4`，FakeBroker唯一订单`ea68aecc-3b46-43c1-96f8-fb2c76aad415`和Fill `ac5f7e07-e8b2-4230-9d4b-d80d0ea17853`。最终FakeBroker现金8995 CNY/持仓100，Portfolio Reservation CAPTURED 1005 CNY，Mandate CONSUMED，Outbox DELIVERED，对账MATCH，无未决订单或Outbox；同Run CLI check-only仍诚实返回WAITING/exit 2且不产生副作用。

隔离Compose项目`sq-v13-web-55a525bc335d7881cd27`已删除并确认容器、卷、网络为空，真实行情与真实券商调用均为0。该运行覆盖Trade应用进程一次提交后重启；尚未覆盖Platform/Portfolio/Governance进程重启、双Worker竞争或任意消息乱序。此证据补强L06和L10的一条恢复子场景，不代表P3退出。

## V1.3正式E2E入口复验（2026-10-07）

使用计划约定的`pnpm test:e2e -- --stage V1.3`运行隔离V1.3 Harness，非直接调用底层Playwright命令。13/13浏览器测试通过，包含Trade进程重启恢复。重启场景Run `61119d03-e53f-439f-abb9-a6f3329559fb`，唯一订单`282f2682-88ac-4157-9e27-bb07b7f18e70`，唯一Fill `14f3811e-f8c9-462e-a14e-91273068c168`，收敛结果现金8995 CNY/持仓100、Reservation CAPTURED、Outbox DELIVERED、账本MATCH，同Run CLI exit 2/WAITING且只读。隔离项目`sq-v13-web-7e2ef7a59f5728d8e03e`及容器/卷/网络已由脚本清理核验；外部行情和真实券商调用均为0。

修复正式入口中的证据导出断言后，`pnpm test:e2e -- --stage V1.3`再次13/13通过；每个浏览器Run在隔离服务清理前调用`pnpm evidence:export`，证据目录成功生成。最新Trade重启Run `fdbbe5ce-4e1d-4ff2-ad56-73ba66aca521`：订单`937a4306-8ec0-4b7a-9aca-786296e91d4f`、Fill `5adbe3bf-3de3-4fcc-9a57-54c05711d9c1`，Portfolio现金8995 CNY/持仓100，Reservation CAPTURED、Mandate CONSUMED、Outbox DELIVERED、账本MATCH；TestRun证据包见[`evidence.json`](../local/V1.3/fdbbe5ce-4e1d-4ff2-ad56-73ba66aca521/evidence.json)。证据导出保留该TestRun原始`WAITING/NOT_RUN`声明，浏览器业务断言和CLI仍分别记录；不可把这份stage-run导出单独解读为阶段PASS。正式Harness随机项目`sq-v13-web-e5787d611cbe46164797`清理完成，容器/卷/网络无残留；外部行情及真实券商调用为0。执行源码快照见[历史执行快照SHA清单](./2026-10-07-v13-trade-restart-source.sha256)。

## V1.3容器化Web正式Harness复验（2026-10-07）

为满足隔离环境的容器化Web要求，V1.3 Compose增加使用既有`apps/web/Dockerfile`构建的Web服务，通过随机本机回环端口提供正式build产物；Harness不再从宿主机启动Vite。使用`pnpm test:e2e -- --stage V1.3`完整运行13/13通过，重启场景Run `40e61962-d62c-473a-aabc-ebc82439fe46`，订单`3064ae47-d0b6-4a0b-9a53-5c2a442200dd`、Fill `3fa44d8b-3da9-4881-bddd-3509fa060d0b`，独立对账MATCH；13个TestRun均在清理前成功导出。Compose项目`sq-v13-web-c63f423c52dd4f18109b`中的Web/API/Trade/Governance/Portfolio/Postgres、卷和网络已全部清理并确认，外部源/真实券商调用0。执行源码见[历史执行快照SHA清单](./2026-10-07-v13-containerized-web-source.sha256)。本次变更后`pnpm verify:stage -- --stage V1.3 --suite code`退出码0；Web typecheck和Harness入口5项测试通过。该隔离环境证据只覆盖V1.3，不能替代贯穿五阶段、目标架构或用户验收。

## L09 V1.3正式页面持久外部订单差异（2026-10-07）

V1.3 owner/TestRun-scoped Platform route通过已生成的Trade FakeBroker客户端记录固定外部模拟订单，并读取Trade独立对账摘要；页面在本地订单之外显示差异ID、状态、证券、数量与Fixture证据引用。刷新后重新从API恢复差异；相同记录命令重放返回`replayed=true`且仍只有一条差异。最新完整Web/API/CLI E2E Run `929eb1c9-7d1f-491e-adca-29d7e7437e00`：`externalOnlyOrderCount=1`、`order_count=0`、`fill_count=0`、`pending_outbox_count=0`；`EXTERNAL_ORDER_MISSING_LOCALLY`指向`v13-external-929eb1c9-7d1f-491e-adca-29d7e7437e00`及`fixture:929eb1c9-7d1f-491e-adca-29d7e7437e00:independent-external-order`。Portfolio现金仍为10000.0000 CNY、无持仓/预留；Web刷新保留同一差异，CLI对同Run WAITING/exit 2且不产生副作用。Run的导出保留平台`WAITING/NOT_RUN`声明见[`evidence.json`](../local/V1.3/929eb1c9-7d1f-491e-adca-29d7e7437e00/evidence.json)，它不替代独立浏览器/业务事实。含CN/US、拒绝、恢复和重启的正式`pnpm test:e2e -- --stage V1.3`在幂等重放断言加入后14/14通过；项目`sq-v13-web-dac5301d7efa4b70a246`及容器、卷、网络全部清理，外部行情/真实券商调用0。首轮用例因未创建CLI所需Proposal出现403依赖错误，首轮失败记录保留于Playwright结果；固定夹具加同Run待审批Proposal后复跑通过。Platform/Web类型检查、`pnpm contracts:check`、docs:check和diff检查通过。源码Hash见[历史执行快照SHA清单](./2026-10-07-v13-external-reconciliation-source.sha256)。这关闭L09外部订单差异与同命令幂等重放的固定隔离E2E子场景，不代表完整资金/持仓外部对账，也不关闭P3。

L09变更后完整`pnpm verify:stage -- --stage V1.3 --suite code`退出0。V1正式Verifier仍exit 2/INCOMPLETE，5阶段未决、7个历史TestRun缺少结构化导出；证据文件/当前Hash检查PASS且0失败。该版本门禁状态不因L09隔离子场景通过而改变。

## L07 Web/CLI因果成交闭环（2026-10-07）

新增只供V1.3固定CN Fixture使用的200股人工Proposal执行路径：Platform复核当前登录用户、V1.3 TestRun、已批准Proposal、Portfolio账户和Run Clock；Trade在FakeBroker建立`ACCEPTED`工作中订单，不预造Fill。正式Web依次提交累计150股seq2、对同一事件重放10次、再提交累计100股seq1。Trade按序缓冲并归约成seq1=100股、seq2=50股两个Fill，Portfolio Outbox同步交付。报告成交ID、成交价格/费用、有效时间和证据引用均由Platform按固定Fixture与Run生成，不采信浏览器的任意成交事实。

隔离Web/API/CLI E2E结果PASS：TestRun `932c0040-b735-42ce-acca-f7ea87683b0e`，Proposal `8fb35e5f-b202-4a50-8c8c-005fdfb6ddfc`，clientOrderId `v13-8fb35e5f-b202-4a50-8c8c-005fdfb6ddfc`。持久读回的Fill顺序/数量为`[[1,100],[2,50]]`；同一seq2十次重放无重复账务事件；FakeBroker与Portfolio现金`8495.0000 CNY`、持仓`600000.SH=150`一致，reconciliation=`MATCH`。剩余资源预留保持`HELD`，已捕获`1505.0000`，未结余量对应500.0000；同Run CLI `--check-only`核实部分成交、MATCH、现金和reservation，未初始化或执行新业务。Web/Platform/Trade容器镜像均从当前工作树构建；Harness最终核实随机隔离项目` sq-v13-web-ce0b248738d2a54af4e5`的容器、卷、网络已清理，行情源调用0、真实券商调用0。

独立底层隔离PostgreSQL持久化测试也PASS，Run `66cf7e35-4746-4bcc-b44b-73a7436c50b3`，明确断言seq2先到、相同报告重放10次、seq1触发因果补齐、持久Fill/outbox恰两条，FakeBroker现金`8495.0000`与持仓150。Trade 84项单测、Platform/Trade/Web typecheck、`pnpm contracts:check`与`pnpm docs:check`（4772个本地Markdown链接）通过。本证据关闭L07的固定序列正向路径，不代表完整L07重启/取消竞争故障矩阵、P3阶段、整版V1或人工验收通过。

本次L07实现与全矩阵复验相关源码快照SHA-256（以本条审计归档时工作树为准）：

```text
f203dc890edeb5a1cc37dfe01a1c736f969d68bebc240f01c1ab257ad7a1e2c9  apps/web/src/main.tsx
efb0eef4ef0f03c8f7887c9d882f418d952550ee312cc9fb2add883497442316  apps/web/tests/e2e/v11-acceptance.spec.ts
d59a6ae90d7dabced3f63ee702edcc7a923d40ce40a4bc4bc5315bdade344221  packages/contracts/openapi/trade-execution-v13-manual-paper.v1.json
67a0d53c71498bad54dc758cb8bf9624370dc59f81608b2075fed8d98fbac266  scripts/generate-platform-v13-manual-trade-client.mjs
6ffe4b130b0f0a66b98128389d8c056fd1fe8257335b0ae0eb2fc8a512e64b16  scripts/test-v13-web-e2e-isolated.mjs
96a4744f44404787561f4bea7a96ec4b2d9eb06373c899ba019906be9b7bb5b6  services/platform-api-service/src/bootstrap/app.module.ts
27132fc74f935ae5f07e6e1e5bef870709984eeefe3a66cb619de1857a0eb0b8  services/platform-api-service/src/contracts/generated-v13-manual-trade-client.ts
576ea8f1ffdc43439525650bba16fff3ff35b29b2dd06c8d401670972935672e  services/trade-execution-service/src/adapters/postgres-fake-broker-repository.ts
e79a1985fe20685aed1978587d31760a7905a28efb27c37b0a301e53c674a3cc  services/trade-execution-service/src/bootstrap/main.ts
6511da60d538d14d8a86973825946af9fc48b56cd1ee9f5464742f7173021840  services/trade-execution-service/src/service-auth.ts
```

追加完成后完整V1.3隔离Web/API/CLI回归17/17 PASS，包含L01 CN、L02 US、L03拒绝/旧版本、L04 Mandate/HOLD/预算拒绝、L05资金/规则拒绝、L06 UNKNOWN/Trade重启恢复、L07乱序Fill、L08费用更正、L09独立外部差异与L10会话撤销；最新L07 Run `c1eec76f-f3e3-4e2e-b41c-4eb6f6f8bded`，订单/提案`e2021633-c79d-43d2-ba35-b6ddc045b8f5`，同Run CLI `--check-only`通过。Harness随机Compose项目`sq-v13-web-bae432f9d16c70232d6b`已确认容器、卷、网络均删除；真实券商和外部行情调用均为0。该17项矩阵通过仍仅证明本轮固定模拟场景工程断言，不取代阶段文档未覆盖项、跨重启L07专用事件故障、人工验收或V1其他P包。

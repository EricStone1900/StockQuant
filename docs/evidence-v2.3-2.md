# V2.3-2 技术复核证据

验证日期：2026-09-11（Asia/Shanghai）。范围为 Fixture 驱动的确定性 `MINUTE_BAR` 回放切片、独立 `historical-replay-worker`、Qlib 训练/独立验证，以及 FakeBroker 执行服务到组合账本的最小闭环；不代表真实模型调用、LIVE 激活或全量容量验收。

- Fixture：`fixtures/v2/v2.3/replay_bars.csv`，版本 `v2.3-replay-bars-1`，SHA-256 由 `pnpm fixtures:check` 验证。
- 本轮场景：normal `345b55c6-3e93-4a2c-b512-8d0170b0e3ca`、rejection `c2d75a02-9e42-460e-b4c6-901a411029cc`、recovery `74a4ba97-8f5f-451a-82fa-183eee25fd2a`；均 `COMPLETED` 且断言全 PASS。
- 跨服务事实：normal 在 `trade-execution-service` 创建独立 FakeBroker 订单/成交，成交 `50 @ 10.2102`、费用 `0.5105`；`portfolio-risk-service` 写入唯一外部成交号、现金为 `9488.9795`、持仓数为 `1`、账本条目为 `2`。recovery 对同一客户订单重放返回 `replayed=true`，未重复扣款。
- Worker 恢复演练：重启 `historical-replay-worker` 后，以 recovery `f86f9e0b-8fa9-4097-944a-ab80943b6b42` 的同一 `testRunId` 再次提交，HTTP `200`、`replayedRun=true`、`ledgerEntryCount=2`；证明 Worker 运行记录在其独立数据库中恢复，未重发订单。
- 治理链路：normal `2ab20833-49b7-4372-bf4e-4e376bcad649` 与 recovery `0542f5ac-1305-4873-9401-399b88cdf0e4` 均通过短期 BACKTEST/FAKE 授权签发、执行前校验和单次消费；无授权订单探针返回 HTTP `403`，未写入订单或账本。
- 订单状态机容器验证：订单 `4dd9eb0f-6095-43c5-852f-36ee4b99d411` 经两次取消请求依次返回 `CANCEL_REQUESTED`、`CANCELLED`；订单 `bc426e5f-c014-4478-9f36-f4eadf88903c` 返回 `EXPIRED`；订单 `b11f25ef-55aa-49aa-b8d8-bf3c63e50a42` 返回 `UNKNOWN`，三者均可通过原订单查询接口读回并记录状态事件。
- 事务外盒容器验证：recovery 订单 `5fa2e93a-2504-4f7d-b2f0-d56d5c523d8f` 的 `FILL_POST` 事件与成交同事务写入，随后查询为 `DELIVERED`、`attempts=1`；恢复重放仍保持账本 `ledgerEntryCount=2`。随后 normal 订单 `2d380857-fc13-4ef8-b5bf-2f75d7425c87` 在启用后台扫描后仍自动完成 `DELIVERED` 投递。
- UNKNOWN 安全恢复验证：订单 `d37f8bc5-35e1-4d95-934f-688120605b96` 被注入 `UNKNOWN` 后，Worker 通过原订单查询确认状态仍未知，记录 `MANUAL_REVIEW_REQUIRED`，未盲目重发，组合账本仍保持 `ledgerEntryCount=2`。
- Saga 补偿状态机：外盒连续 3 次投递失败后进入 `COMPENSATION_REQUIRED`，订单进入 `LEDGER_PENDING`；受保护的补偿接口可在账本恢复后重新排队并以外部成交号幂等完成投递，成功后回到 `DELIVERED`。本轮已完成代码、类型和服务启动验证；真实账本故障注入演练待下一轮专门的故障脚本。
- Saga 故障注入演练：订单 `066898dc-fe4f-441b-9030-411e258a7bdf` 的外盒 `4b61fb7e-3f2d-43f4-a061-0c12f3288a8e` 在注入 3 次账本失败后为 `COMPENSATION_REQUIRED`/`LEDGER_PENDING`；清除故障并调用补偿接口后为 `DELIVERED`、`attempts=4`，最终账户现金 `9488.9795`、持仓 `1`、账本条目 `2`。
- 多 Bar Worker 验证：三根 Bar 的 `testRunId=3c3cd9e5-3d4e-4f31-a4c1-754355c0a9e5` 逐根推进到 `cursor=3`，产生 3 笔成交，最终现金 `7661.3297`、账本条目 `4`；重复提交同一运行键返回 `replayedRun=true`，账本条目仍为 `4`。
- 量化运行时接入验证：`testRunId=0bc6c9a5-594e-4bc9-b0f0-3a6aa4b3299a` 的多 Bar 回放调用 `quant-research-service`，返回 `status=COMPLETED`、`adapter=qlib`、`dataMode=FIXTURE`、`environmentMode=BACKTEST`、`modelCalls=NOT_RUN`，3 根 Bar/3 笔成交均被研究边界接收，Artifact SHA-256 为 `e6801008bb9ba222cfe0e70ae76bcff787e26fef999625273005ef6e894dc7a8`。
- Web/CLI 验收：CLI `verify:stage -- --stage V2.3 --scenario normal --seed 20260910` 的 `testRunId=33e7a848-6b7d-4b26-ab04-68cc0555aa9a` 断言全 PASS；`PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 pnpm test:e2e -- --stage V2.3` 通过 1/1，Web 页面已展示研究 Artifact 状态与哈希。
- 独立验证容器演练：Qlib Worker `/validate` 对正确哈希返回 `PASS` 且 `independent=true`；将哈希改为 `tampered` 返回 `FAIL`，证明验证器重新计算切分与哈希并能拒绝篡改产物。
- 持久化：重建 `platform-api-service` 后，对 normal run 执行 `pnpm verify:stage -- --stage V2.3 --run 62d779cc-7317-4653-863c-5b5c50dfd839 --check-only`，退出码 0。
- 导出：`pnpm evidence:export -- --stage V2.3 --run 62d779cc-7317-4653-863c-5b5c50dfd839`，Manifest SHA-256：`c4d1c27436896991f858fa4096b504546a36861928ce83c6047affbdb317f619`。
- 代码套件：`pnpm verify:stage -- --stage V2.3 --suite code`，退出码 0。
- 浏览器：`PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 pnpm test:e2e -- --stage V2.3`，1/1 通过。

已知限制：独立 `historical-replay-worker` 已持久运行多 Bar 粗粒度推进与检查点恢复，并接入确定性 Qlib 训练/独立验证边界。候选产物已支持精确版本登记、显式审批和 PostgreSQL 持久化，但 `activation=DISABLED_UNTIL_MANDATE`，未接入真实模型训练、策略完整研究运行时或任何 LIVE 激活。执行服务已提供取消、DAY 过期、UNKNOWN 标记、原订单查询、成交事务外盒、后台重试扫描及 `COMPENSATION_REQUIRED` 补偿入口；UNKNOWN 仍需人工复核。

### 候选产物登记与晋级前校验（2026-09-11）

- 用户确认版本：Qlib `0.9.6`，算法 `deterministic-sma`，Artifact Hash `e6586d4135eeeed375eb521b003c346a3f16b21da5f310cdd88ed67ee21e59b7`。
- 容器接口验证：`POST /v1/research/candidates` 携带 `x-stockquant-user=acceptance-owner-1` 返回 HTTP 201，状态 `CANDIDATE_APPROVED`，候选 ID `candidate-e6586d`，激活状态 `DISABLED_UNTIL_MANDATE`。
- 查询验证：`GET /v1/research/candidates/candidate-e6586d` 返回 HTTP 200，版本、算法、Hash 与审批人完全一致。
- 防错验证：Qlib `0.9.5` 返回 HTTP 422；缺少显式审批返回 HTTP 202 `PENDING_APPROVAL`。
- 持久化验证：使用候选 ID `candidate-persisted` 登记后重启 `quant-research-service`，再次查询返回 HTTP 200，记录仍存在且字段一致；数据存储于 `quant_research.research_candidates`。

### 人工验收复核（2026-09-11）

- 环境：Docker Compose，`BACKTEST` + `FAKE`，Fixture `v2.3-replay-bars-1`，seed `20260907`；未连接真实券商或 LIVE 账户。
- normal：`testRunId=6522c574-fc20-472b-8eba-1a0b59024d9c`，状态 `COMPLETED`，退出码 0；成交 50 股，价格 `10.2102`，费用 `0.5105`，现金 `9488.9795`，账本条目 2。
- rejection：`testRunId=3d361eb3-e1cd-4517-9de8-5eccb88776dc`，状态 `COMPLETED`，退出码 0；`FUTURE_DATA`、`ZERO_VOLUME`、`MISSING_BAR` 均拒绝且无 Fill。
- recovery：`testRunId=49b5dc51-1a1d-40ad-9100-d290c423f386`，状态 `COMPLETED`，退出码 0；检查点恢复结果与参考一致，无重复 Fill。
- 代码套件：`pnpm verify:stage -- --stage V2.3 --suite code`，退出码 0。
- Web E2E：`PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 pnpm test:e2e -- --stage V2.3`，1/1 通过，退出码 0。
- 同 Run 只读核对：normal `testRunId` 使用 `--check-only`，退出码 0；未创建新订单、成交或模型调用。
- 证据导出：目录 `evidence/local/V2.3/6522c574-fc20-472b-8eba-1a0b59024d9c`，Manifest SHA-256 `02293ca437201a36096a7e04631f5be837869a49f9bb9be490f4b64a9995002a`。
- 候选持久化：重启服务后 `candidate-persisted` 查询 HTTP 200，状态 `CANDIDATE_APPROVED`，激活仍为 `DISABLED_UNTIL_MANDATE`。
- 问题记录：首次复核发现量化研究验证项在单 Bar 输入下被错误标记为 FAIL，已修复为 `NOT_APPLICABLE`，重建容器后全场景复核通过；首次 Playwright 运行受 macOS 沙箱权限影响，授权重跑后通过。

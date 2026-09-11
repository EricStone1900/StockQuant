# V2.4 持续 Paper 技术复核证据

验证日期：2026-09-11（Asia/Shanghai）。范围为容器化平台 API、Web 验收页和确定性持续 Paper 场景；所有订单均为 `PAPER + FAKE`，未连接真实券商或 LIVE 账户。

- normal：`testRunId=a947f7d0-8b55-43ac-a522-e8007fa38ff1`，`COMPLETED`，退出码 0；使用新鲜 `SNAPSHOT`，无信号时 `HOLD`，日终对账 `PASS`。
- rejection：`testRunId=6d432a9e-4a64-4059-b902-e824be0e92f3`，`COMPLETED`，退出码 0；`STALE_SNAPSHOT` 和 `DUPLICATE_SCHEDULE` 均被拒绝，place 次数为 0。
- recovery：`testRunId=97383867-73a3-41da-897d-a59efa84b5dc`，`COMPLETED`，退出码 0；故障序列为 `SOURCE_DISCONNECTED → WINDOW_MISSED → ACCOUNT_RECONCILED → SOURCE_RECOVERED → RE_EVALUATED`，错过窗口未补旧单。
- 代码套件：`pnpm verify:stage -- --stage V2.4 --suite code`，退出码 0。
- Web E2E：`PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 pnpm test:e2e -- --stage V2.4`，1/1 通过，退出码 0。
- 同 Run 只读核对：normal 使用 `--check-only`，退出码 0；未创建新订单、成交或模型调用。
- 证据导出：目录 `evidence/local/V2.4/a947f7d0-8b55-43ac-a522-e8007fa38ff1`，Manifest SHA-256 `6a3e1db59f2d6e9b34e9f0e331295bb3ad4a9e5b27669895277d0bcae05d09c1`。
- 20 个实际交易日观察：`NOT_RUN`；当前仅完成确定性运行和单日故障/恢复演练，未用加速 Fixture 冒充观察期。
- 持久化复核：normal `testRunId=260a9677-5f0f-4ed0-94f2-00174f4e9f99` 在重启 `platform-api-service` 后仍返回 `V2.4/COMPLETED`，证明 TestRun 已写入共享验收数据库；运行证据包含 `PAPER`、`LIVE_SOURCE_SMOKE` 和 `FAKE` 标记。
- SystemClock 调度器：容器接口依次返回 `STOPPED → RUNNING → Tick → STOPPED`；启动时 `tickCount=1`，手动 Tick 后为 `2`，采样间隔 30 分钟、执行窗口 `09:31-09:35`，`mode=PAPER`、`brokerMode=FAKE`。

已知限制：持续调度目前是验收用确定性切片，真实交易日观察、长期来源许可/稳定性和全量容量仍待完成；`LIVE` 激活始终关闭。

## 2026-09-11 运行保障切片

- 新增 `v24_scheduler_state`、`v24_observation_days` 和追加式 `v24_observation_events` 持久化；平台启动时在 `STOCKQUANT_V24_AUTO_START=true` 下恢复并启动调度。
- Compose 关键服务启用 `restart=unless-stopped`；重建后 `platform-api-service`、`market-data-service`、`trade-execution-service` 和 `postgres` 均为 healthy。
- `node scripts/v24-preflight.mjs`：所有检查 PASS；调度状态 `RUNNING`、采样间隔 30 分钟、窗口 `09:31-09:35`、模式 `PAPER + FAKE`，真实 Tencent 快照探针返回 3 个 `LIVE_SOURCE` 标的。
- `market-data-service /ready` 现明确返回 `dataMode=MIXED`、`liveQuoteMode=LIVE_SOURCE`、`fixtureRoutesAvailable=true`，避免把验收 Fixture 路由误报为真实全链路。
- 平台重启恢复：重启前 `tickCount=2`，重启后 `tickCount=3`，观察记录仍可查询；恢复 Tick 不判定 30 分钟采样间隔，并追加保存事件。
- 本切片不实现交易日历、策略信号、模拟下单/成交和日终对账；这些字段保持 `NOT_IMPLEMENTED`，实际 20 个交易日观察仍为 `NOT_RUN`，不得据此宣称持续 Paper 业务已验收。

## 最终完整复核（2026-09-11）

在用户人工验收通过后重新执行完整验证，生成以下新证据：

- normal：`755cb415-0f1d-433a-aaa4-6378d5e7f1cf`，`COMPLETED`。
- rejection：`ac6e5e4a-cdfc-4a54-9731-4f3bce0e0f52`，`COMPLETED`。
- recovery：`8bb6606e-96c0-4ca4-8deb-9df40c0bbbb9`，`COMPLETED`。
- 调度器状态链路：`STOPPED → RUNNING → Tick → STOPPED`，启动自动 tick 后手动 tick，计数由 1 增至 2。
- 代码套件、Web E2E（1/1）、同 Run `--check-only`、证据导出及服务重启后的 TestRun 查询均通过；重启后 normal 仍为 `V2.4/COMPLETED`。
- 最新导出目录：`evidence/local/V2.4/755cb415-0f1d-433a-aaa4-6378d5e7f1cf`；Manifest SHA-256：`5e7bf52c19d4167846673ca581216337af3f03133a9cd1392ed1c55e140d0842`。
- 用户已确认人工验收通过（本会话，2026-09-11）；20 个实际交易日观察仍为 `NOT_RUN`，因此阶段总体仍为 `PARTIALLY_IMPLEMENTED`。
- 初次复核曾发现项目级门禁脚本缺失；本次已补齐并完成实际验证，历史缺口不再作为当前脚本状态。
- 本次已补齐项目级门禁脚本：`pnpm verify:version -- --version V2` 能正确汇总阶段并因 V2 未完成返回非零；`pnpm verify:compat -- --platform linux/amd64` 完成平台 API 镜像构建及容器 Node 探针，返回 `PASS`（`linux/x64`、Node `v24.1.0`）。

## 持续观察运行保障优化（2026-09-11）

- 市场数据服务新增 A 股交易日接口，日历版本为 `sse-cn-a-share-2026-1`；2026 年休市范围以[上交所公告〔2025〕45号](https://www.sse.com.cn/disclosure/announcement/general/c/c_20251222_10802507.shtml)为来源。日期超出该版本覆盖范围返回 `UNKNOWN`，不会按工作日猜测为交易日。
- 持续调度改为 A 股盘中固定 30 分钟槽位（09:30 至 11:30、13:00 至 15:00），执行窗口为独立的 09:31 事件，日终对账为独立的 15:10 事件；不再从容器启动时间滚动计时。
- 每一实际交易日会持久生成稳定的日级 `testRunId`；原始观察事件追加写入 `v24_observation_events`，日级汇总的合并不会删除旧事件。新增 `/api/v1/acceptance/v2/v2.4/observation-events` 供日终审计读取。
- 保守实时策略为 `v24-conservative-hold-v1`：新鲜来源进入执行窗口时产生 `HOLD`、`NONE` 模拟订单和 `NONE` 成交；15:10 对无订单日写入 `PASS` 对账。陈旧、断网、日历未知、恢复缺口均保留 `UNKNOWN` 或对应错误，且绝不补发错过窗口的订单。
- 复核：平台与市场数据容器重建后，`pnpm v24:preflight` 的平台、行情、调度、日历和真实行情探针均为 `PASS`；平台 API 与市场数据服务 TypeScript 类型检查通过，平台 API 单元测试 19/19 通过。
- 观察仍为 `NOT_RUN`，累计有效交易日仍从 0 开始；这次变更只提升真实时钟运行与留证能力，未用 Fixture、回放或人工补造替代 20 个实际交易日。

## 优化项修复复核（2026-09-11）

- Tencent 行情快照现在同时保存来源 `observedAt` 与服务 `ingestedAt`；数据年龄按来源时间计算。当前主机晚于收盘的恢复探针因此被正确标记为 `STALE`，不再把接收时间误当成新鲜数据。
- 定时槽位回调增加异常捕获和停止竞态保护；每个事件保存 `scheduledFor`、`scheduledDelaySeconds`、`previousSampleAt`，准点采样仅在计划偏差不超过 60 秒时记为 `true`。节假日仍由权威日历判定并留痕，不会抓取行情或补发订单。
- 日终事件通过 `trade-execution-service` 的只读 FakeBroker 对账接口独立核对未解决订单、成交和待投递 outbox；只有核对结果明确为零未解决项才写入 `PASS`，接口失败写入 `FAIL` 并保留错误。
- `v24_observation_day_finalizations` 以交易日为键追加保存日终最终记录；后续恢复事件不能覆盖 `observationCounted=true`。每日观察 TestRun 同步注册到 `acceptance_stage_runs`，日终独立对账成功后才转为 `COMPLETED`。
- 观察事件查询默认上限提升为 1000，并支持 `?limit=`（最大 5000），以覆盖 20 个交易日的盘中槽位、执行、日终和恢复事件；历史事件不删除。
- 重新构建并重启受影响容器后，`node scripts/v24-preflight.mjs` 全部 PASS；平台和市场数据类型检查通过，平台单元测试 19/19 通过。20 个真实交易日仍为 `NOT_RUN`。

# V2.4 持续 Paper 技术复核证据

> **2026-09-27 状态更正：**本文件后续记录的 COMPLETED/PASS 场景来自静态验收引擎，不代表执行过其声称的快照、Mandate、拒绝、恢复、FakeBroker 订单或对账路径。原运行ID、Manifest和用户在2026-09-11的签署作为历史留存，不删除；对当前Paper交易链的证明力为 `NOT_VALID_FOR_CURRENT_IMPLEMENTATION`。当前 API 已改为 `WAITING/NOT_RUN`。详见[无伪造Paper证据审计](../evidence/audits/2026-09-27-v24-no-fabricated-paper-evidence.md)。

验证日期：2026-09-11（Asia/Shanghai）。范围为容器化平台 API、Web 验收页和确定性持续 Paper 场景；所有订单均为 `PAPER + FAKE`，未连接真实券商或 LIVE 账户。

- normal：`testRunId=a947f7d0-8b55-43ac-a522-e8007fa38ff1`，`COMPLETED`，退出码 0；使用新鲜 `SNAPSHOT`，无信号时 `HOLD`，日终对账 `PASS`。
- rejection：`testRunId=6d432a9e-4a64-4059-b902-e824be0e92f3`，`COMPLETED`，退出码 0；`STALE_SNAPSHOT` 和 `DUPLICATE_SCHEDULE` 均被拒绝，place 次数为 0。
- recovery：`testRunId=97383867-73a3-41da-897d-a59efa84b5dc`，`COMPLETED`，退出码 0；故障序列为 `SOURCE_DISCONNECTED → WINDOW_MISSED → ACCOUNT_RECONCILED → SOURCE_RECOVERED → RE_EVALUATED`，错过窗口未补旧单。
- 代码套件：`pnpm verify:stage -- --stage V2.4 --suite code`，退出码 0。
- Web E2E：`PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 pnpm test:e2e -- --stage V2.4`，1/1 通过，退出码 0。
- 同 Run 只读核对：normal 使用 `--check-only`，退出码 0；未创建新订单、成交或模型调用。
- 证据导出：目录 `evidence/local/V2.4/a947f7d0-8b55-43ac-a522-e8007fa38ff1`，Manifest SHA-256 `6a3e1db59f2d6e9b34e9f0e331295bb3ad4a9e5b27669895277d0bcae05d09c1`。
- 20 个实际交易日观察：已开始；截至 2026-09-24 日终最终记录为 `8/20`（2026-09-15～2026-09-18、2026-09-21～2026-09-24），2026-09-14 因盘中超时错误不计数，未用加速 Fixture 冒充观察期。恢复检查事件不覆盖日终最终记录。
- 持久化复核：normal `testRunId=260a9677-5f0f-4ed0-94f2-00174f4e9f99` 在重启 `platform-api-service` 后仍返回 `V2.4/COMPLETED`，证明 TestRun 已写入共享验收数据库；运行证据包含 `PAPER`、`LIVE_SOURCE_SMOKE` 和 `FAKE` 标记。
- SystemClock 调度器：容器接口依次返回 `STOPPED → RUNNING → Tick → STOPPED`；启动时 `tickCount=1`，手动 Tick 后为 `2`，采样间隔 30 分钟、执行窗口 `09:31-09:35`，`mode=PAPER`、`brokerMode=FAKE`。

已知限制：持续调度目前是验收用确定性切片，真实交易日观察、长期来源许可/稳定性和全量容量仍待完成；`LIVE` 激活始终关闭。

## 2026-09-11 运行保障切片

- 新增 `v24_scheduler_state`、`v24_observation_days` 和追加式 `v24_observation_events` 持久化；平台启动时在 `STOCKQUANT_V24_AUTO_START=true` 下恢复并启动调度。
- Compose 关键服务启用 `restart=unless-stopped`；重建后 `platform-api-service`、`market-data-service`、`trade-execution-service` 和 `postgres` 均为 healthy。
- `node scripts/v24-preflight.mjs`：所有检查 PASS；调度状态 `RUNNING`、采样间隔 30 分钟、窗口 `09:31-09:35`、模式 `PAPER + FAKE`，真实 Tencent 快照探针返回 3 个 `LIVE_SOURCE` 标的。
- `market-data-service /ready` 现明确返回 `dataMode=MIXED`、`liveQuoteMode=LIVE_SOURCE`、`fixtureRoutesAvailable=true`，避免把验收 Fixture 路由误报为真实全链路。
- 平台重启恢复：重启前 `tickCount=2`，重启后 `tickCount=3`，观察记录仍可查询；恢复 Tick 不判定 30 分钟采样间隔，并追加保存事件。
- 本切片记录的是 2026-09-11 的确定性运行范围；当时交易日历、策略信号、模拟下单/成交和日终对账字段保持 `NOT_IMPLEMENTED`，实际 20 个交易日观察为 `NOT_RUN`。该历史记录不覆盖后续真实观察证据。

## 最终完整复核（2026-09-11）

在用户人工验收通过后重新执行完整验证，生成以下新证据：

- normal：`755cb415-0f1d-433a-aaa4-6378d5e7f1cf`，`COMPLETED`。
- rejection：`ac6e5e4a-cdfc-4a54-9731-4f3bce0e0f52`，`COMPLETED`。
- recovery：`8bb6606e-96c0-4ca4-8deb-9df40c0bbbb9`，`COMPLETED`。
- 调度器状态链路：`STOPPED → RUNNING → Tick → STOPPED`，启动自动 tick 后手动 tick，计数由 1 增至 2。
- 代码套件、Web E2E（1/1）、同 Run `--check-only`、证据导出及服务重启后的 TestRun 查询均通过；重启后 normal 仍为 `V2.4/COMPLETED`。
- 最新导出目录：`evidence/local/V2.4/755cb415-0f1d-433a-aaa4-6378d5e7f1cf`；Manifest SHA-256：`5e7bf52c19d4167846673ca581216337af3f03133a9cd1392ed1c55e140d0842`。
- 用户已确认人工验收通过（本会话，2026-09-11）；截至该次复核20个实际交易日观察仍为 `NOT_RUN`，因此阶段总体仍为 `PARTIALLY_IMPLEMENTED`。后续观察进度见文末最新记录。
- 初次复核曾发现项目级门禁脚本缺失；本次已补齐并完成实际验证，历史缺口不再作为当前脚本状态。
- 本次已补齐项目级门禁脚本：`pnpm verify:version -- --version V2` 能正确汇总阶段并因 V2 未完成返回非零；`pnpm verify:compat -- --platform linux/amd64` 完成平台 API 镜像构建及容器 Node 探针，返回 `PASS`（`linux/x64`、Node `v24.1.0`）。

## 持续观察运行保障优化（2026-09-11）

- 市场数据服务新增 A 股交易日接口，日历版本为 `sse-cn-a-share-2026-1`；2026 年休市范围以[上交所公告〔2025〕45号](https://www.sse.com.cn/disclosure/announcement/general/c/c_20251222_10802507.shtml)为来源。日期超出该版本覆盖范围返回 `UNKNOWN`，不会按工作日猜测为交易日。
- 持续调度改为 A 股盘中固定 30 分钟槽位（09:30 至 11:30、13:00 至 15:00），执行窗口为独立的 09:31 事件，日终对账为独立的 15:10 事件；不再从容器启动时间滚动计时。
- 每一实际交易日会持久生成稳定的日级 `testRunId`；原始观察事件追加写入 `v24_observation_events`，日级汇总的合并不会删除旧事件。新增 `/api/v1/acceptance/v2/v2.4/observation-events` 供日终审计读取。
- 保守实时策略为 `v24-conservative-hold-v1`：新鲜来源进入执行窗口时产生 `HOLD`、`NONE` 模拟订单和 `NONE` 成交；15:10 对无订单日写入 `PASS` 对账。陈旧、断网、日历未知、恢复缺口均保留 `UNKNOWN` 或对应错误，且绝不补发错过窗口的订单。
- 复核：平台与市场数据容器重建后，`pnpm v24:preflight` 的平台、行情、调度、日历和真实行情探针均为 `PASS`；平台 API 与市场数据服务 TypeScript 类型检查通过，平台 API 单元测试 19/19 通过。
- 观察已进入真实累计阶段；有效交易日仍须逐日独立通过日终门禁，未用 Fixture、回放或人工补造替代 20 个实际交易日。

## 三项运行阻碍修复复核（2026-09-14）

- 盘前/盘后预检现在允许记录上一交易日的陈旧快照，并仅在 A 股当前交易时段强制新鲜度；新增预检测试通过，主机 `pnpm v24:preflight` 在收盘后退出码为 0。
- 当天任一盘中事件存在错误时，日终不会计数；平台启动迁移已将 2026-09-14 的错误 TestRun `19bf69b7-599c-49da-a432-48db85108b89` 从 `COMPLETED/true` 纠正为 `FAILED/false`，原始超时事件保留。
- 唯一启用的 `dc08a-20260914-short-v1` 订阅已延长至 2026-10-19，覆盖至少 20 个实际交易日；当前 2026-09-14 覆盖为 144/144、缺口 0、非取消运行全部 `COMPLETED`、未发送 outbox 为 0（两个取消运行的历史 outbox 仍按审计规则保留）。
- 平台单元测试 23/23、预检测试 3/3 通过；服务和调度器保持 healthy/RUNNING。20 日验收仍须逐日实际完成，不能由本次修复提前签署。

## 优化项修复复核（2026-09-11）

- Tencent 行情快照现在同时保存来源 `observedAt` 与服务 `ingestedAt`；数据年龄按来源时间计算。当前主机晚于收盘的恢复探针因此被正确标记为 `STALE`，不再把接收时间误当成新鲜数据。
- 定时槽位回调增加异常捕获和停止竞态保护；每个事件保存 `scheduledFor`、`scheduledDelaySeconds`、`previousSampleAt`，准点采样仅在计划偏差不超过 60 秒时记为 `true`。节假日仍由权威日历判定并留痕，不会抓取行情或补发订单。
- 日终事件通过 `trade-execution-service` 的只读 FakeBroker 对账接口独立核对未解决订单、成交和待投递 outbox；只有核对结果明确为零未解决项才写入 `PASS`，接口失败写入 `FAIL` 并保留错误。
- `v24_observation_day_finalizations` 以交易日为键追加保存日终最终记录；后续恢复事件不能覆盖 `observationCounted=true`。每日观察 TestRun 同步注册到 `acceptance_stage_runs`，日终独立对账成功后才转为 `COMPLETED`。
- 观察事件查询默认上限提升为 1000，并支持 `?limit=`（最大 5000），以覆盖 20 个交易日的盘中槽位、执行、日终和恢复事件；历史事件不删除。
- 重新构建并重启受影响容器后，`node scripts/v24-preflight.mjs` 全部 PASS；平台和市场数据类型检查通过，平台单元测试 19/19 通过。当时20个真实交易日仍为 `NOT_RUN`，后续观察进度见最新日期段。

## 2026-09-14 观察质量修复

- 日终观察日只有在交易日、`END_OF_DAY`、独立对账 `PASS` 且没有未解决错误时才计数。日终最终记录可将先前的错误计数降为 `false`；启动迁移同步修正既有错误记录，避免恢复事件或历史错误伪造有效观察日。
- Tencent 报价改用 GB18030 解码，中文证券名称恢复正确；预检新增30分钟来源时间新鲜度门禁。收盘后探针虽仍标注 `LIVE_SOURCE`，但因实际 `observedAt` 陈旧而正确返回失败，不能再产生假阳性。
- 2026-09-14 观察日 `testRunId=19bf69b7-599c-49da-a432-48db85108b89` 保留日终超时错误并已更正为 `observationCounted=false`，因此不计入20个实际交易日。
- 平台 API 与市场数据服务 TypeScript typecheck、V2.4 单元测试、行情预检和 DC-08A 脚本单元测试均通过。真实观察门禁当前为 `8/20`。

## 2026-09-15 首个有效实际观察日

- 日级 `testRunId=b7baf9b2-4e0f-4d24-8f73-5eaed662a4d6`：`END_OF_DAY` 独立FakeBroker
  对账为`PASS`，无事件错误，`observationCounted=true`。
- 所有30分钟采样槽位及09:31执行窗口均取得3只证券的 `LIVE_SOURCE` Tencent行情；策略为
  `v24-conservative-hold-v1`，执行窗口记录`HOLD`、无模拟订单及无成交，符合PAPER+FAKE约束。
- 当前日终最终有效观察日为8/20（2026-09-15～2026-09-18、2026-09-21～2026-09-24）；2026-09-14仍因原始盘中超时错误保持不计数，恢复检查事件不能覆盖日终结论。

## 2026-10-03 恢复缺口窗口校正

- 恢复检查按已配置的20/30分钟采样槽识别漏采，不再使用固定31分钟阈值；午休跨段不误报，计划采样当前槽不算作之前错过的窗口，跨日交由启动恢复条件处理。
- Platform API单测180/180、类型检查通过；完整`pnpm verify:stage -- --stage V2.4 --suite code`受控隔离运行退出0，`activeServicesTouched=false`。首次普通沙箱运行因Qlib Worker绑定临时loopback端口EPERM退出非零，原始失败保留。
- 代码、测试及最终套件JSON的SHA-256见[增量清单](../evidence/audits/2026-10-03-w3-recovery-slot-gap.sha256)。未部署活动服务、未授权或请求行情，NO_TRADE及O2暂停状态不变。

## 2026-09-22 计数口径与运行复核补充

- 当前 `dc08a-20260917-20-v1` 订阅的证据汇总为连续稳定日4、恢复后完整日1、观察日5、剩余15；恢复日计入观察总数，连续稳定日和恢复日的分类仍分别保留。数据库 V2.4 日终总记录的8/20包含此前订阅的有效日期，两个数字不混用。

## 2026-09-24 运行进度补充

- 日终最终记录 `testRunId=552529b0-f0f6-4448-a177-2e9c2aa9dee7`，独立 FakeBroker 对账 `PASS`，新计数日为 `2026-09-24`。
- 当日 DC-08A 20只集合完成48/48运行、960/960根5分钟Bar，开放缺口和待投递 Outbox 均为0；来源正式路径保持 `sina,baostock`。
- V2.4 仍为 `WAITING`，尚余12个实际交易日；DC-08A 独立观察仍为 `WAITING`，尚余15个观察日。
- 修复 `dc08a-observation-summary-v2` 的剩余天数和通过条件，使其统一按 `observedDays`（连续稳定日+恢复后完整日）计算；回归测试4/4通过。
- `pnpm verify:stage -- --stage V2.4 --suite code` 退出0；`pnpm v24:preflight` 五项 PASS；`dc08a-health-v3` 实际报告 `HEALTHY`。当前运行仍为 `PAPER + FAKE`，BaoStock 盘中恢复切回和20日真实观察尚未完成。

## 2026-09-30 W3 来源与启动门禁更正

- 项目所有者确认 `NO_TRADE`，并确认目前没有为 V2.4 Paper 新用途授权行情来源。历史 `LIVE_SOURCE` 记录仅保留为其当时运行与来源用途的证据，不表示本次已批准的策略输入或当前活动部署状态。
- 新代码默认令 `STOCKQUANT_V24_QUOTE_SOURCE_USE_APPROVED=false`；关闭时，报价观察器不调用 Market Data quote endpoint，记录 `NOT_AUTHORIZED`/`NOT_CONNECTED` 且不计有效观察日。Compose 的 `STOCKQUANT_V24_AUTO_START` 与来源读取授权也都默认为 `false`。二者尚未部署到活动容器；既有活动服务未重启或变更。
- 默认关闭单元测试、Platform 构建、Compose 配置解析及 `pnpm verify:stage -- --stage V2.4 --suite code` 均通过，隔离 Smoke 报告 `activeServicesTouched=false`。本次证据与限制见[W3 source-gate validation](../evidence/audits/2026-09-30-w3-source-gate-validation.md)。
- 依据本次授权范围，新的真实行情采集、活动策略、订单和 O2 观察保持关闭/未开始；当前阶段只允许 NO_TRADE 只读页面及隔离 Fixture 工程。来源权限、活动部署和人工阶段验收仍未完成。


### 活动环境调度状态与历史记录资格

- 2026-09-30只读检查发现活动Platform旧容器仍以`STOCKQUANT_V24_AUTO_START=true`运行V2.4采样器。按项目所有者`NO_TRADE`且无来源授权的决定，通过调度Stop API停止后复查为`STOPPED`，tickCount=231且`nextSampleAt=null`；所有服务容器继续运行，未重启、部署、请求行情或触发订单。DC-08A独立采集器未改动。
- V2.4数据库保留10条旧`observationCounted=true`记录，但无逐证券报价证据（sourceAvailable/lastSnapshotAt/dataAgeSeconds均为空，且无sourceProbe）。它们不能满足新增的授权引用、数据版本、十个采样窗口及日终核验规则，因此UI显示为历史待补证，严格合格天数为0/20；未回写或删除旧记录。
- 工作区Compose已改为AUTO_START=false、来源批准=false、授权引用和数据版本为空，但没有部署到活动旧容器。其restart policy可能使旧自动启动行为在将来容器重启时恢复；W8备份、维护窗口和回滚预演前不重启或替换该容器。细节及命令结果见[W3运行采样停止审计](../evidence/audits/2026-09-30-w3-live-paper-stop.md)。

## 2026-10-01 当前来源授权边界复核

历史2026-09-11的`LIVE_SOURCE`预检与行情探针仅代表当时运行，不是当前来源授权。当前Market Data `/ready`仅在quote用途的开关、决定引用、数据版本及source ID白名单齐备时报告`LIVE_SOURCE`；否则为`NOT_AUTHORIZED`。用户当前决定为`NO_TRADE`且无来源授权。2026-10-01无授权认证HTTP smoke确认行情、新闻与来源Smoke均返回403，Provider请求数为0；没有请求外部数据或修改活动服务。来源门禁的实现与完整V2.4 code suite证据见[W3运行门禁审计](../evidence/audits/2026-10-01-w3-market-source-runtime-gate.md)。20日观察仍为8/20历史有效日且处于暂停状态，不能由代码套件或历史探针续计。

2026-10-03当前工作树完整V2.4 code suite及告警浏览器集成：完整阶段入口exit 0，真实浏览器读取/确认隔离Market Data告警后，PostgreSQL核实ACKNOWLEDGED及Cookie owner；行情/provider调用0，采集器关闭，五库导出并由Harness验证临时容器/网络清理，活动服务未触碰。详见[隔离全套审计](../evidence/audits/2026-10-03-v24-paper-smoke-ce6b0c6569f74286889aff48e622d63c.json)与[SHA-256](../evidence/audits/2026-10-03-v24-paper-smoke-ce6b0c6569f74286889aff48e622d63c.sha256)。

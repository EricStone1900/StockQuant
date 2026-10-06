# DC-08A 启用前准备记录

状态：`PAUSED_NO_SOURCE_AUTHORIZATION`（2026-09-30）。本记录保留此前启动与历史观察证据；当前正式订阅已停用，因为项目所有者确认暂无行情来源授权。不得将本文件较早的“已启用/观察中”描述解释为当前授权或当前采集状态。当前状态与恢复条件见[无来源授权暂停审计](../evidence/audits/2026-09-30-w3-no-source-pause.json)。

## 冻结输入

- 计划：`v2-data-collection-cn-5m-v1`
- 市场/频率：`CN_A_SHARE` / `MINUTE_BAR` / `5m`
- 证券集合版本：`baostock-minute-20x60-v1`
- 输入文件：[collection-plan-v1.json](../fixtures/v2/data-collection/collection-plan-v1.json)
- 输入 SHA-256：`045595a9923a826e0413e9ad3708dc9409effaeeb007e794634bc21faf4d26a9`
- 数量：20；服务格式映射为 `600000.SH,600004.SH,600006.SH,600007.SH,600008.SH,600009.SH,600010.SH,600011.SH,600012.SH,600015.SH,600016.SH,600017.SH,600018.SH,600019.SH,600020.SH,600021.SH,600022.SH,600023.SH,600025.SH,600026.SH`
- 主备策略：BaoStock → Sina；复权：RAW；时区：`Asia/Shanghai`
- 首批短期观察：`600000.SH`、`000001.SZ`、`600519.SH`，跨沪深，3 只。

## 启用前检查

1. 在实际交易时段前确认 `/ready` 返回 `collectionPersistence=POSTGRES`。
2. 确认 Compose 中 `STOCKQUANT_SCHEDULER_WORKER=1` 和 `STOCKQUANT_COLLECTION_EXECUTOR=1`，且只有一个活动调度实例。
3. 为短期观察创建唯一订阅修订，记录 subscriptionId、revision、calendarVersion 和 testRunId。
4. 先运行 3 只证券连续 2 个实际交易日；每天检查盘中窗口、日终补采、来源尝试、质量问题和未解释缺口。
5. 短期观察通过后，使用上面的 20 只集合运行至少 1 个实际交易日，再进入 DC-08B 累积。

## 当前未完成项

- DC-08A唯一正式订阅`dc08a-20260917-20-v1`此前曾运行并形成历史观察；2026-09-30在无来源授权决定下已停用（版本425→426）。当前有效历史归档为8/20，尚差12日；暂停期间不计新日。
- 20只集合尚未产生新的授权采集Artifact；历史归档不能替代暂停之后的新观察，也不能用于未获许可的研究用途。
- 短期三只证券2026-09-14、2026-09-15观察及20只集合早期历史记录均保留，不将其删改或冒充当前运行状态。
- 外部告警/异机灾备仍属于上线前生产就绪事项。

## 巡检与自动修复边界

已实现 `pnpm dc08a:supervise`。默认执行只读检查；`--repair` 仅在 `/ready` 不可达时执行一次
`docker compose -f infra/compose/docker-compose.yml up -d market-data-service`，随后最多等待 15 秒再次检查。
脚本默认不会自动修改代码、打开 `STOCKQUANT_COLLECTION_EXECUTOR`、重启数据库、删除队列或重试业务任务；
正式激活后的定时巡检才会通过显式环境变量保留已批准的启用配置。

退出码约定：`0=HEALTHY`（持久化为 Postgres 且执行器已启用）、`2=WAITING_CONFIGURATION`
（服务正常但执行器未显式启用或持久化未就绪）、`1=UNHEALTHY/REPAIR_FAILED`。

验证记录（2026-09-12，本机 Docker）：`pnpm dc08a:test-supervise` 4/4 PASS；
`node scripts/dc08a-supervise.mjs --check-only` 返回 `WAITING_CONFIGURATION`、退出码 2，
与当前安全默认值 `STOCKQUANT_COLLECTION_EXECUTOR=0` 一致。

## 定时启用保护

已实现 `pnpm dc08a:activate`。它先读取 `/ready` 和 Postgres 中的订阅，只允许“恰好一个
启用中的订阅，且 subscriptionId、日期窗口、calendarVersion 全部匹配 DC-08A 参数”时执行
Compose 重建，并显式设置 `STOCKQUANT_SCHEDULER_WORKER=1`、
`STOCKQUANT_COLLECTION_EXECUTOR=1` 和正式 `subscriptionId`。调度器与执行器必须同开或同关；
一开一关、缺少参数、存在多个启用订阅或匹配失败时返回退出码 2，不执行任何重建。

2026-09-12 已停用 18 条历史测试订阅，并创建唯一正式订阅
`dc08a-20260914-short-v1`（2026-09-14 至 2026-10-19，覆盖至少 20 个实际交易日）。使用 `--check-only` 验证返回
`READY_TO_ENABLE`、退出码 0；服务仍保持关闭。激活测试 6/6 PASS。

同日又完成了启用前队列隔离清理：停用 2 条仍处于启用状态的集成测试调度，
将其关联的 470 条 `QUEUED/WAITING_RETRY/PARTIAL/RUNNING` 运行记录标记为
`CANCELLED`（保留原始记录和证据），核验结果为仅 1 条启用调度、非 DC-08A
可运行记录为 0。正式执行器现在会按 `STOCKQUANT_COLLECTION_SUBSCRIPTION_ID`
限定可领取的运行，避免历史测试任务混入正式采集。

市场数据服务 `/ready` 现同时返回 `collectionSchedulerWorker` 和
`collectionExecutor`。激活脚本会拒绝两者不一致的状态，并把正式 `subscriptionId`
注入 Compose；在当前安全关闭状态下运行激活 `--check-only` 会返回
`READY_TO_ENABLE`、退出码 0，不会提前启动采集；实际定时激活才会执行重建并开启两者。

最终复核（2026-09-12）确认：启用调度为 `1/1`（唯一启用项为 DC-08A），运行记录为
`CANCELLED=482`、`COMPLETED=92`，无非正式 `QUEUED/WAITING_RETRY/PARTIAL/RUNNING`
记录；正式激活 `--check-only` 返回 `READY_TO_ENABLE`、退出码 0。

定时任务顺序已校准：首次激活从 2026-09-14 08:45 起每 5 分钟重试至 09:25；每次先执行一次受控
`pnpm dc08a:supervise -- --repair` 拉起未运行的 market-data-service，再执行激活保护检查。
只有 `/ready` 和唯一订阅校验通过后才会打开调度器/执行器。巡检从同日
09:00 起每 15 分钟运行；激活脚本对已启用状态幂等，不会重复重建容器，避免激活前自动修复
与正式启用发生竞态。

`pnpm dc08a:eod` 是唯一的日终编排入口，由独立的 15:20 自动化运行。它在交易日 15:15
前返回 `WAITING_END_OF_DAY`/退出码 2，不会登记缺口、归档或计入观察；非交易日返回 0。
交易日只有完整覆盖、无待发送 Outbox 和无开放缺口时才返回 0；其他完整性问题返回 2，
日历不可用或未知同样返回 `WAITING_DEPENDENCY`/退出码 2。相同交易日的并发日终调用用
本地互斥锁保护，避免重复归档与观察计数。

已补充 `pnpm data:coverage -- --subscription ID --from today --to today --security-ids LIST`
覆盖入口，按冻结日历、当前已闭合窗口、证券集合和逐 5 分钟窗口核对缺失、重复、意外 Bar、
运行状态和开放缺口，生成 `evidence/dc08a/coverage-*.json`；非交易日退出 0，交易日缺覆盖
或日历依赖未满足时退出 2。默认完成期限为 300 秒（120 秒发布延迟、两次 60 秒轮询和
60 秒有界拉取/持久化余量；可用 `DC08A_COVERAGE_GRACE_SECONDS` 显式调整）。窗口尚未
到期时提前到达的合法 Bar 不会被判为意外 Bar 或登记缺口；使用 `--record-gaps` 时才会按
订阅、日期和证券范围原子登记已超过完成期限的缺口，并自动关闭本次覆盖已恢复的旧 `OPEN`
缺口，报告 `gapReconciliation.opened/closed`。
执行器现在拒绝部分证券窗口并保留原任务进入重试，不发布不完整 Artifact。

已补充 `pnpm dc08a:active-subscription` 只读读取唯一启用订阅和当前证券集合；巡检与日终
任务均动态使用该结果，切换证券集合后不再引用旧短期参数。

已补充 `pnpm dc08a:promote-20 -- --check-only` 作为短期观察后的受保护切换入口：只有
两份短期日终报告均为 `PASS`、唯一启用订阅正确且目标集合恰为 20 只时才返回
`READY_TO_PROMOTE`。实际切换必须显式去掉 `--check-only`，会创建目标订阅、停用短期订阅、
启用目标订阅并以 20 只证券构建/重建服务；未达到条件不会修改数据库或容器。首次激活也会
构建最新 market-data-service 镜像后再重建，避免使用旧镜像。

## 自动观察证据

已实现 `pnpm dc08a:observe`。该只读脚本从 `/ready` 和 PostgreSQL 汇总订阅、运行状态、
Artifact 行数、未发送 Outbox 和开放缺口，并将带时间戳的
`evidence/dc08a/observation-*.json` 保存为 `dc08a-observation-v1` 记录。
2026-09-12 首份基线报告显示：唯一正式订阅已启用，服务健康但执行器仍关闭，运行数为 0，
状态为 `NOT_ACTIVE`；观察脚本测试 4/4 PASS。正式采集前的实时分钟时间语义校验发现
BaoStock/Sina 返回的时间为 5 分钟窗口结束时刻，已在适配器中统一转换为窗口开始/结束边界；
默认主源/备用源预算为单次 20 秒、最多 2 次、2 秒退避，外层适配器超时 180 秒。
覆盖报告会同时记录 `pendingOutbox`。当前本机范围没有配置外部完成事件消费者，因此该字段
作为必须处理的交付告警留证，但不把“本地完成事件尚未投递”伪装成分钟覆盖缺失；外部通知
上线前仍需配置真实目的地并单独验证发送/重试/确认。

2026-09-13 启用前复核：以 `pnpm stack:up -- --stage V2.5` 重建并启动默认安全配置，随后
`pnpm v24:preflight` 在宿主权限下 5/5 通过。`market-data-service` 与 PostgreSQL 就绪，
V2.4 为 `PAPER + FAKE`，采集调度器/执行器均保持 `DISABLED`；行情探针返回 3 只证券的
`LIVE_SOURCE`。发现数据库有两条历史 fixture 订阅误处于启用状态，已通过现有停用 API
停用 `schedule-1789219234281`、`schedule-1789219488982`，复核 `active-subscription`
唯一正式订阅为 `dc08a-20260914-short-v1`、证券数为 3；DC-08A `--check-only` 返回
`READY_TO_ENABLE`。本次未启动正式采集、未发布分钟 Artifact；真实缺口补采待交易日数据产生后执行。

## 2026-09-15 短期观察结果

短期订阅 `dc08a-20260914-short-v1` 已在2026-09-14、2026-09-15连续两个实际交易日运行。
两日最终覆盖均为3只证券×48窗口=144/144根5分钟Bar，48个非取消运行均为`COMPLETED`、
48个Artifact、0开放缺口、0非取消待投递Outbox；日终报告均为`PASS`。2026-09-14初始报告
在末窗发布完成前曾为`INCOMPLETE`，随后已依据最终持久化记录重新生成。完成数据源为Sina，
因此BaoStock主源盘中成功率仍待独立观察。`pnpm dc08a:promote-20 -- --check-only` 已返回
`READY_TO_PROMOTE`；实际切换保持安排在2026-09-17交易时段前，未将该检查替代20只实际
交易日或人工验收。

## 2026-09-15 定时任务权限复核

- 已在本机无人值守规则中增加 3 个最小精确入口：`pnpm dc08a:promote-20`、
  `pnpm dc08a:supervise`、`pnpm dc08a:active-subscription`；不授予通用 Docker、数据库或真实券商权限。
- 20 只切换任务的复核命令已统一为上述 `pnpm` 入口，保持 `failed_runs_only` 通知策略。
- `pnpm dc08a:test-promote-20`（3/3）、`pnpm dc08a:test-supervise`（4/4）、
  `pnpm dc08a:test-active-subscription`（2/2）通过。
- 本机授权执行复核：`dc08a:promote-20 --check-only=READY_TO_PROMOTE`、
  `dc08a:supervise --check-only=HEALTHY`；当前活动订阅仍为短期订阅、证券数为 3。
- 已新增项目级配置回归入口 `pnpm dc08a:verify-automation`，对当前 Mac 的心跳频率、旧任务暂停、
  20 只一次性切换及复核命令进行检查，结果 `PASS`。

2026-10-01 11:50Z只读运行复核：enabled schedules=0、open gaps=0、pending outbox=0、日历CLOSED、无nextExecutionAt；这是无数据源授权的暂停态，不计观察日。注意活动Market Data镜像仍是旧版，`/ready`返回`liveQuoteMode=LIVE_SOURCE`、executor ENABLED且不含来源授权字段；新门禁代码未部署。没有触发来源调用或容器变更。完整快照及边界见[O1/W3活动运行审计](../evidence/audits/2026-10-01-o1-active-runtime-after-source-gates.json)。

2026-10-02 10:41 Asia/Shanghai read-only follow-up: GET-only health probe found calendar CLOSED, scheduler tick recent but `nextExecutionAt=null`, no enabled subscription schedules, zero open gaps/outbox, and aggregate health UNHEALTHY because no next trigger is recorded. No quote/bar request or collection occurred. Recomputed archive remains 8/20 (7 complete + 1 recovered), 12 valid days remain; latest valid date 2026-09-30. Source authorization NONE and NO_TRADE remain active. See [health audit](../evidence/audits/2026-10-02-o1-readonly-health-no-source-1041.md), [JSON report](../evidence/audits/2026-10-02-o1-readonly-health-no-source-1041.json), [observation summary](../evidence/audits/2026-10-02-o1-current-observation-summary-no-source-1041.json) and [SHA-256](../evidence/audits/2026-10-02-o1-readonly-health-no-source-1041.sha256).

2026-10-03 00:52 Asia/Shanghai read-only follow-up: readiness, scheduler, source inventory, quality, and market calendar GETs completed; no quote/bar request, collection, activation, or configuration/database write occurred. The calendar was CLOSED; scheduler/executor reported ENABLED but `nextExecutionAt=null`, so aggregate health remained UNHEALTHY. Open gaps/outbox were 0. Local archived observation remained 8/20 (7 complete + 1 recovered), 12 remaining, latest valid date 2026-09-30; this refresh added no observation day. Source authorization remains NONE and NO_TRADE remains active. Source `enabled` flags are configuration state only. See [current health and observation audit](../evidence/audits/2026-10-03-o1-readonly-health-and-observation.md) and [JSON](../evidence/audits/2026-10-03-o1-readonly-health-and-observation.json).

## 2026-10-05 来源数据版本门禁补强

激活脚本现在与 Market Data 运行时使用相同的分钟来源配置必需项：显式用途授权开关、授权引用、数据版本及完整的source ID白名单。此前脚本只要求开关/引用/source ID白名单，未要求 `STOCKQUANT_COLLECTION_DATA_VERSION`，可能在运行时必定保持未授权的情况下仍通过激活前置并重建服务。新增缺失/空数据版本用例，验证脚本在读取运行态、读取订阅及执行Compose前阻断。激活脚本专项10/10、Market Data运行时授权专项4/4通过。此变更不代表已取得授权；当前NO_TRADE/授权NONE，未执行激活检查、运行时读取或服务操作。

## 2026-10-05 监督修复也受来源授权门禁约束

监督器的 `--repair` 路径只在 `/ready` 为UNHEALTHY时重建Market Data容器；此前它会显式把Scheduler/Executor开关设为1，但不会先核验来源授权。虽然Market Data运行时仍会独立拒绝无授权采集，这种修复动作可能让未授权配置看起来像被监督器激活。激活器和监督器现在共用同一配置解析/判定模块，要求用途授权开关、授权引用、数据版本和当前配置的全部source ID白名单完整；来源缺项时Repair返回`WAITING_CONFIGURATION`/exit 2，Compose调用0次。`--check-only`仍如实报告运行态，不因许可缺项掩盖基础设施故障。`pnpm dc08a:test-supervise` 6/6、`pnpm dc08a:test-collection-authorization` 3/3、`pnpm dc08a:test-activate` 10/10及Market Data运行时授权4/4均通过。代码测试不改变当前NO_TRADE/授权NONE状态，未调用监督器repair、Compose、Provider或活动数据库。

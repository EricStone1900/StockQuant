# DC-08A 启用前准备记录

状态：`READY_NOT_ENABLED`。本记录只证明启动输入已冻结和代码链路已验证，不代表已经完成实际交易日观察。

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

- 尚未在交易时段启用正式调度；盘中延迟、持续更新和恢复仍为 `NOT_RUN`。
- 20 只集合尚未产生新的真实采集 Artifact；历史 58 日样本不能替代连续 60 日观察。
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
`dc08a-20260914-short-v1`（2026-09-14 至 2026-09-16）。使用 `--check-only` 验证返回
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

定时任务顺序已校准：首次激活从 2026-09-14 08:45 起每 5 分钟重试至 09:25，巡检从同日
09:00 起每 15 分钟运行；激活脚本对已启用状态幂等，不会重复重建容器，避免激活前自动修复
与正式启用发生竞态。

已补充 `pnpm dc08a:eod-report` 日终质量门禁：15:20 运行，非交易日返回 0；交易日仅
`PASS` 返回 0，`INCOMPLETE/NOT_RUN` 返回 2，以便计划任务的 `failed_runs_only` 通知策略
能够提示覆盖缺口；日历不可用或未知时返回 `WAITING_DEPENDENCY`/退出码 2，实际 Bar 数量
必须与预期严格相等。该任务只生成/更新日终报告，不修改订阅、队列或 Artifact。

已补充 `pnpm data:coverage -- --subscription ID --from today --to today --security-ids LIST`
覆盖入口，按冻结日历、当前已闭合窗口、证券集合和逐 5 分钟窗口核对缺失、重复、意外 Bar、
运行状态和开放缺口，生成 `evidence/dc08a/coverage-*.json`；非交易日退出 0，交易日缺覆盖
或日历依赖未满足时退出 2。使用 `--record-gaps` 时会将发现的缺口幂等写入 GapRecord。
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

# V2.1 免费行情、新闻聚合与在线股票池

状态：**PASS（2026-10-21；C1/C2当前本地学习范围完成，项目所有者已人工验收）**。此结论绑定[本轮候选源码清单](../../../evidence/audits/2026-10-21-v21-c2-closeout/source-manifest.json)Hash `aa8ac2e88285d70b4f73976ed7977b000787ad0476d88dc8eb278f5399f15f32`与[人工验收记录](../../../evidence/audits/2026-10-21-v21-c2-closeout/human-acceptance.json)。本阶段已签范围和已知限制记录如下；V2整版状态单独评估。版本入口：[README](./README.md)，规则：[三版共同规则](../05-three-version-delivery.md)，当前证据：[C2收口审计](../../../evidence/audits/2026-10-21-v21-c2-closeout.md)。历史失败、旧签署及逐次开发记录完整保留在[收口前阶段快照](../../../evidence/audits/2026-10-21-v21-c2-closeout/stage-before.md)及其引用中。

## 1. 前置与范围

V1批准的Mac本地主要范围已完成。C1在线池工程证据复用；本包完成C2采样、质量、独立日线、新闻及Web/CLI验收链。所有账户、订单和成交只用FakeBroker；本包不创建订单、不调用模型。策略批准/执行器属OD-007/C5，连续交易日观察属后续V2.4/采集包，不从本包自动启动。

OD-008按项目所有者明确的个人、本地、非商业学习用途复核；至少一个行情源、两个新闻源和独立当前交易日日线已有有界实测。广义OD-008仍PARTIAL，未验证用途和来源保持UNVERIFIED；不承诺免费源长期稳定、分钟/历史覆盖或共享权利。[逐源边界](../../../evidence/audits/2026-10-21-od008-local-learning-review.md)不能由配置开关代替。

## 2. 开发任务

- [x] 来源能力与限制有记录；腾讯QUOTE、东方财富/财联社NEWS、东方财富当前日DAILY_BAR有本次小样本事实，其余来源不外推通过。
- [x] 实际1行情源+2新闻源：真实HTTP→生产Adapter/Worker→隔离PostgreSQL持久化；新闻保留稳定文章路径/URL、标题Hash、来源和revision，不保存正文。未解析到发布时间时保持UNKNOWN，不推断页面不存在发布时间。
- [x] 在线池按唯一证券≤100，持仓/在途优先，超限明确拒绝；owner/account/namespace/TestRun隔离。复用[C1证据](../../../evidence/audits/2026-10-17-v21-c1-watchlist.md)，不重复未受影响容量测试。
- [x] 默认30分钟、可选20分钟；独立快照注册、Monitor政策、收盘日线及策略/执行门禁。快照按已知交易日/午休/时点入持久队列，HTTP不等待Provider；注册与来源开关默认关闭。
- [x] 保存source/observedAt/ingestedAt/availableAt、age/freshness；Monitor持久化质量和异常。独立DAILY_BAR来源核对session、收盘、OHLCV、单位及覆盖，不从快照拼造日线/分钟。schema v19支持非Fixture日线任务。
- [x] 新闻发现→受限同源文章读取→持久修订，重放幂等、转载保留出处、确定性实体LINKED/AMBIGUOUS/UNMATCHED；故障不清除历史。真实文章当前未得到可验证发布时间，真实修订/实体准确率未作长期观察，不用作历史Alpha证据。
- [x] Worker租约、有界重试及五种实际进程故障收敛；最后一次领取后崩溃进入FAILED，已提交结果后崩溃恢复同结果且只发一次Outbox。保留失败记录。

## 3. 同步 Web 开发

正式功能与验收入口均为 `/acceptance/v2/v2.1`，从“开发验收中心→V2→V2.1”进入。展示来源/政策、在线池、任务与时间质量、日线、新闻修订和可读业务断言；原始JSON收在“查看原始核对数据”。页面调用Platform会话代理，同业务API，不由浏览器判定领域事实。

`normal/rejection/recovery/stale`使用场景版本`1.2.0-fixture`；实际容器Web→Platform→Market Data/Monitor→PostgreSQL通过，同Run CLI及导出通过。Fixture场景不伪装成实际来源，实源证据独立关联。

## 4. 人工验收步骤

1. 按第8节启动隔离栈，打开实际Web URL，依次点击“运行正常”“运行容量拒绝”“运行任务恢复”“运行陈旧拒绝”。
2. 正常7项PASS；拒绝3项PASS且在线池不被改写；恢复2项PASS且同任务幂等；陈旧7项PASS但质量必须UNAVAILABLE、新鲜覆盖0/2、两条QUOTE_STALE。
3. 查看第8.5节真实来源及故障恢复报告，确认真实/合成、未知发布时间和盘后陈旧边界。
4. 对页面同一testRunId只读核对/导出；审阅后由用户确认当前候选。自动PASS不代填人工签署。

## 5. 异常与替身边界

报价错误/缺源时间不返回伪造零价或READY。新闻验证页/错误页拒绝入库，来源熔断按实际sourceId阻止调用。Adapter超时5秒、响应限额、禁止重定向；新闻缓存为单进程30分钟，不能当作跨进程全局限额。人工熔断不是持久故障状态，重启后需重新配置；持久采样健康单独展示。

Linux容器实际运行于Mac arm64，Qlib既有镜像可为amd64仿真；本包没有启动研究作业。未知/超出2026版日历拒绝；本次无24小时或长期真实交易窗口观察，不替代V2.4/Ubuntu验收。来源权限/限流变化会导致失败；禁止绕过访问控制或无限重试。

## 6. 产物与验证

需求映射：DAT-07/08/10、NEW-01～03/05/06、MON-01/02/04；T07/15～17/28/38，DV-05、VT05。广泛需求行不因本包小样本自动PASS。

`pnpm verify:stage -- --stage V2.1 --suite code`退出0；完整命令、工作目录、测试文件输出见[日志](../../../evidence/audits/2026-10-21-v21-c2-closeout/code-complete.log)。真实PG迁移/幂等/恢复、契约、单元与各服务锁定环境检查均运行，不把空套件/跳过计PASS。浏览器及实源单独见8.5节。新业务源码、依赖、镜像、资源与证据SHA在[本轮源码清单](../../../evidence/audits/2026-10-21-v21-c2-closeout/source-manifest.json)及[审计索引](../../../evidence/audits/2026-10-21-v21-c2-closeout.md)。

退出条件：当前开发、手册、自动检查完成；当前范围用户验收后才签署阶段。V2其他阶段不随C2自动完成。

## 7. 阶段交付待办（完成后勾选）

- [x] 契约、数据结构、场景定义和预期结果已冻结。
- [x] 第2节当前本地学习范围后端任务完成，真实依赖与替身明确。
- [x] 正式Web及正常/拒绝/恢复/陈旧场景完成。
- [x] 第8节目录、URL获取、按钮、Fixture/Hash、配置、命令、预期与恢复步骤已补齐。
- [x] 开发者从启动到四场景、同Run核对/导出亲自执行，留存源码/镜像、退出码、截图和断言。
- [x] 重复/恢复与本包适用故障通过；长期观察、Sina实源等未覆盖项如实记录。
- [x] 用户已对当前候选和本轮新增范围完成人工验收；本对话确认日期及候选Hash见[签署记录](../../../evidence/audits/2026-10-21-v21-c2-closeout/human-acceptance.json)。
- [x] 操作说明、限制及[本版验收表](./99-acceptance.md)同步。

## 8. 阶段验收操作手册

### 8.1 可执行性与环境

手册状态：**VERIFIED_EXECUTABLE（2026-10-21；本地C1/C2当前范围已实测并由用户验收）**。

根目录 `/Users/huangbosong/Documents/ChatGPT/StockQuant`。Node v24.1.0、pnpm 10.34.5；Python服务各用自身锁定环境，Monitor使用自身`.venv`；Mac arm64、Docker Desktop Linux。实际镜像ID、目标架构、CPU/内存限制与采样用量见[容器记录](../../../evidence/audits/2026-10-21-v21-c2-closeout/containers.json)及[资源采样](../../../evidence/audits/2026-10-21-v21-c2-closeout/container-usage.txt)。无显式容器资源上限的项记录为0（Docker未限制），不声称有预算约束。

本次项目 `sq-v21-stack-fed767f1d971220028b5`，最终Web `http://127.0.0.1:49922/acceptance/v2/v2.1`、Platform `http://127.0.0.1:49351`、Market Data `http://127.0.0.1:49462`。端口为当次追溯值，重建会变化；复验采用启动输出的当前地址。打开页面由`/api/v1/session`建立`acceptance-owner-1`会话，Cookie仅本地使用，不保存到证据。

### 8.2 启动、配置与固定输入

在根目录执行：

```bash
pnpm stack:up -- --stage V2.1
```

保持该进程运行，复制输出动态Web/API地址和项目名。健康失败保存错误，不碰共享卷；构建/启动有界超时由脚本负责，未成功不能继续算PASS。全部外部来源、REAL执行和自动注册缺省关闭，本地Fixture验收无需填写来源授权。

| 输入 | 版本与SHA-256 |
|---|---|
| `fixtures/v2/v2.1-snapshot-sampling/snapshots.json` | `v2.1-snapshot-sampling-1`，`9898f0b7ed9bf275766df22e26e64109c7ef92c47a0da6e1bffe5194cbaabc6c` |
| `fixtures/v2/v2.1-snapshot-stale/snapshots.json` | `v2.1-snapshot-stale-1`，`00fb666501ac866dccb4a29eba85a701cac8ec5ceaa752e7a62bc1b9be4fa040` |
| `fixtures/v2/v2.1-news-revisions/news-revisions.json` | `v2.1-news-revisions-1`，`5feb697b6d517aeae2ff7de85b324c97b95d153a7cb60cf08cfb516748f7d05b` |
| `fixtures/v2/v2.1-daily-bar-completion/bars.json` | `v2.1-daily-bars-1`，`b98309c9be021c2117d9b3b53276b4ddb313de290413f6bfea5b7040361ae6c4` |

Manifest与数据同目录。快照/日线证券`600000.SH,000001.SZ`，Fixture session `2026-10-16`，快照09:50；normal可用延迟10分钟，stale31分钟。`sse-cn-a-share-2026-1`、seed `20260907`；本包无费用/成交变更。

### 8.3 Web操作、超时与恢复

按第4节运行四场景，记录testRunId与断言。页面异步轮询，Playwright单次全流程上限120秒；若一直非终态，查Platform任务和Market Data `/ready` Worker状态、对应scope与日志，保留失败。刷新读取原Run，不通过新建Run冒充恢复。

在“当前账户在线池”填当前Run证据中的accountId、namespace、testRunId，点击“读取已保存在线池”。持仓/在途由服务端读取，不填伪造持仓。默认无DAILY_BAR门禁时“提交当前交易日日线任务”返回403及`DAILY_BAR_SOURCE_AUTHORIZATION_REQUIRED`；自动快照总开关关闭时“启用当前运行快照调度”返回409；“停止当前运行快照调度”允许执行。均不调用Provider、不发单。

“读取当前运行最近采样任务”“读取当前运行行情质量”“读取当前运行最近日线任务”查询同scope；重复入队使用原任务身份。固定Fixture日线完成读取应2根，REAL完成另显数据模式、source/dataVersion且Fixture引用为空。

源开关只在有明确用途记录的独立环境开启：QUOTE与NEWS各自四项`STOCKQUANT_MARKET_<用途>_SOURCE_USE_AUTHORIZED/SOURCE_AUTHORIZATION_REF/DATA_VERSION/AUTHORIZED_SOURCE_IDS`；当前日线用独立`STOCKQUANT_MARKET_DAILY_*`且来源`eastmoney-daily`，绝不借QUOTE权限。`STOCKQUANT_SNAPSHOT_REAL_PROVIDER_ENABLED`、`STOCKQUANT_SNAPSHOT_SCHEDULER_ENABLED`、`STOCKQUANT_DAILY_REAL_PROVIDER_ENABLED`和`STOCKQUANT_DAILY_BAR_SOURCE_MODE=REAL`分别控制执行/调度，默认关闭。每日补齐还要求显式scope注册及独立收盘调度政策；已知当前交易日15:00后才入队。未设置活动配置不视为已运行。

### 8.4 命令与同Run只读核对

下面环境变量填启动输出地址；浏览器测试自己建立本地会话，并在子进程中传递Cookie、不打印凭证。此条已在真实容器运行，1个完整测试包含四场景，没有Mock或跳过：

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:49922 \
STOCKQUANT_V21_CLOSEOUT_API_URL=http://127.0.0.1:49351 \
pnpm --filter @stockquant/web exec playwright test tests/e2e/v21-c2-closeout.spec.ts --reporter=line
pnpm verify:stage -- --stage V2.1 --suite code
```

预期均exit 0，报告四个新Run、全PASS断言、刷新同Run、8次CLI核对/导出；stale业务质量为UNAVAILABLE而场景断言PASS。默认未给明确隔离URL的浏览器测试会SKIP，该SKIP不算本条验收通过。

单独复核已有Web Run，需在本地终端设置`STOCKQUANT_PLATFORM_API_URL`为该栈API、`STOCKQUANT_SESSION_COOKIE`和`STOCKQUANT_EVIDENCE_SESSION_COOKIE`为该浏览器本地会话`sq_session=...`（不写入Git/日志），再执行：

```bash
read -r acceptance_run_id
pnpm verify:stage -- --stage V2.1 --run "$acceptance_run_id" --check-only
pnpm evidence:export -- --stage V2.1 --run "$acceptance_run_id"
```

预期exit 0、导出`evidence/local/V2.1/<run>/evidence.json`及`manifest.sha256`。缺Cookie应exit 2，不补签；check-only不初始化、不采集、不重放、不调用模型，浏览器测试核对前后Run对象完全相等。

### 8.5 实源、故障与实际记录

| 验证 | 当前结果与证据 |
|---|---|
| 完整代码套件 | exit 0；[命令与输出](../../../evidence/audits/2026-10-21-v21-c2-closeout/code-complete.log) |
| 容器Web四场景、同Run CLI/导出 | [报告与截图](../../../evidence/local/V2.1/cd34da7a-9c0b-419a-bb38-63f266869dfb/web-closeout.json)：normal `aaf9d591-3a40-44a5-9a0f-5f6cf3000a64` 7/7；rejection `81d65be4-c610-4c85-9218-23f6129f89d0` 3/3；recovery `ff98e407-a887-417c-84f9-23657d1a7223` 2/2；stale `79e74f07-64cb-432a-9549-4d3599c36ac3` 7/7 |
| 真实服务/合成HTTP流水线 | [报告](../../../evidence/local/V2.1/c55600d7-fdad-4802-b632-1c4add175206/source-pipeline.json)，6项PASS、外部0，含真实Monitor Outbox与服务重启；仅测试进程固定2026-10-21收盘后时钟 |
| 实际来源→Worker→Monitor/PG | [报告](../../../evidence/local/V2.1/9d695430-01e6-4566-b932-7f9272d7bb0e/source-pipeline.json)，6项PASS、7次实际HTTP（1行情、2日线、4新闻）；盘后报价STALE/Monitor UNAVAILABLE；当前交易日独立REAL日线2根；重放/熔断缓存不新增请求 |
| 实际SIGKILL/故障序列 | [报告](../../../evidence/local/V2.1/6abc6d36-1f42-4709-88de-66ff9a06dd83/crash-recovery.json)，5种、30事件，保留故障计划、代码/Fixture SHA |
| 两源新闻修订与失败隔离 | [报告](../../../evidence/local/V2.1/65a0df01-1e77-4dc0-b673-3888f6b36e4d/news-collection.json)，合成HTTP/真实PG，通过；真实公开文章未观察到修订，不混用证明 |

故障、新闻及合成流水线已纳入上述code套件；需要定向复跑时从`scripts/code-suite-plan.mjs`使用同一隔离PG runner及其显式数据库映射，不向活动数据库注入故障。真实流水线仅在当前已知交易日15:00后、有界调用预算和逐用途记录满足时运行；不是普通代码检查的一部分：

```bash
node scripts/run-isolated-postgres-command.mjs \
  --url-env MARKET_DATA_DATABASE_URL:market_data_test:market_data_test \
  --url-env MARKET_MONITOR_DATABASE_URL:monitor_test:monitor_test -- \
  pnpm --filter @stockquant/market-data-service exec node scripts/c2-source-pipeline-smoke.mjs --live
```

测试持久化实际元数据、价格结果Hash及业务ID；临时库清理后不承诺重放原来源价格。当前未验证长期稳定/覆盖、真实新闻发布时间/修订质量、Sina实源、分钟历史、US实源、Ubuntu。后续对应阶段处理，不以小样本证明这些能力。

### 8.6 停止与签署

先保存导出和截图，再仅停止启动输出的本次隔离项目：

```bash
pnpm stack:down -- --project sq-v21-stack-fed767f1d971220028b5
```

预期`STOPPED_AND_PURGED`，精确项目容器、卷、网络、项目镜像及临时凭证清零；不得对共享栈执行prune/删卷。下次使用新项目名。环境回收事实见本轮审计，不将失效旧URL当作当前运行服务。

当前签署：**项目所有者人工验收PASS，2026-10-21**。确认绑定上方源码集合Hash及四个Web TestRun；证据报告原有`humanAcceptance=NOT_RUN`表示运行时尚未人工签署，保持不可变，由[独立签署记录](../../../evidence/audits/2026-10-21-v21-c2-closeout/human-acceptance.json)绑定本次用户确认。

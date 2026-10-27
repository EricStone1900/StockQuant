# V2.1 免费行情、新闻聚合与在线股票池

状态：PARTIALLY_IMPLEMENTED（2026-09-09历史用户验收范围保留；C1在线池工程及C2本地Fixture修订/采样任务恢复切片已有自动证据；个人本地学习范围已完成1个行情源与2个新闻源的小样本闭环，但长期免费源能力、新闻发布时间质量和当前范围人工验收未完成；未验证项保留UNVERIFIED；NO_TRADE）。版本入口：[README](../../../docs/prd/v2-data-and-replay/README.md)。共同约束：[三版共同规则](../../../docs/prd/05-three-version-delivery.md)。

## 1. 前置与范围

V1通过；数据/时间/质量契约可用。

本阶段所有订单、券商资产和成交均来自隔离模拟环境。真实业务数据库、Qlib或RD-Agent在声明“已验证”时必须真正执行；替身需独立标注。

## 2. 开发任务

2026-10-21增量：新闻获取补候选文章发现、同源路径校验、禁止跳转、响应大小/超时及每进程缓存；共用流程接入修订账本，合成HTTP与真实PostgreSQL验证两源修订/转载出处、单源失败及重连读回。生产采样Worker与仓储通过实际子进程SIGKILL的领取后、提交结果后/finish前，以及暂时失败后重启三项恢复测试。个人本地学习范围的隔离服务探针完成腾讯两证券行情、东方财富和财联社各一篇新闻的发现→读取→真实PostgreSQL元数据持久化，并核对API/数据库稳定路径、revision和规范化标题Hash一致；详情见[OD-008实测](../2026-10-21-od008-local-learning-review.md)及[最终报告](../../local/V2.1/442bab42-999c-451e-93ed-c2958ca9bcd8/local-learning-source-probe.json)。两新闻均无公开发布时间，未验证长期稳定/覆盖/限流或其他用途，OD-008仅PARTIAL。

C2剩余实现顺序、交付物和退出条件统一见[原V2计划§7.2.1](../../../docs/prd/v2-data-and-replay/00-version-plan.md#721-c2完整实现与收口计划2026-10-18)。先完成不依赖授权的本地工程和真实组件验收链，再补授权后的来源验证；不得只等待授权或以Fixture关闭本阶段。2026-10-18新增C2-A任务身份隔离、quote缺时钟/错误值质量保护、文章URL/稳定ID离线解析及Platform对来源拒绝状态透传；真实容器Web→Platform→Market Data→PostgreSQL Fixture业务链通过。C2-B已持久化五类独立策略、门禁和任务生命周期状态机（并发领取、重试、租约恢复已在隔离PG验证），HTTP仅入队，后台Worker现已校验冻结Fixture并持久化观测；OD-008未授权时REAL任务由Worker阻断且外部请求为0。Tencent Provider端口、授权后的Worker执行路径及REAL结果持久化已接线但运行开关默认关闭；来源清单现从持久任务与Worker运行记录派生quote来源状态、最近尝试/成功/失败时间及稳定错误码，且与手工熔断状态分开。真实来源能力未验证，Sina候选Provider只有固定响应验证。monitor/daily/strategy/order的输入、触发和门禁边界已冻结，隔离HTTP/重启烟测确认快照完成不会启用四类下游策略；Monitor自动消费者、独立service identity和质量结果持久化已有本地工程实现；收盘日线自动调度已有固定Fixture验证，策略/订单消费者仍未实现；C2-E Fixture normal/rejection/recovery已完成隔离Compose Web→真实服务→PostgreSQL、同TestRun CLI `--check-only`和证据导出，OD-008真实来源验证与人工验收仍未完成。详见[消费者交接审计](../2026-10-19-v21-c2-consumer-handoff.md)、[C2来源健康审计](../2026-10-19-v21-c2-source-health.md)、[容器闭环审计](../2026-10-18-v21-c2-container-followup.md)、[调度策略审计](../2026-10-18-v21-c2-schedule-policy.md)和[任务生命周期审计](../2026-10-18-v21-c2-task-lifecycle.md)。

2026-10-19 C2-C领域及持久化增量：Market Monitor纯函数按scope证券集合计算覆盖率/最大fresh年龄及缺失、陈旧、未知异常；DAILY_BAR完成门禁保持独立来源、收盘/availableAt、完整覆盖、OHLCV和REAL授权规则。Market Data schema v15持久结果、v16持久任务队列；幂等Fixture POST返回QUEUED，后台Worker以租约领取、校验冻结Fixture、有限重试并事务提交结果，scope隔离latest API由Platform和Web展示。隔离PG迁移测试覆盖租约过期接管/重试上限，真实HTTP服务重启证明任务结果可恢复；定向Web E2E只Mock Platform路由。Monitor持久/API与自动quote-available消费者随后完成（见[2026-10-20 Outbox审计](../2026-10-20-v21-c2-monitor-outbox-consumer.md)）；REAL日线来源和完整C2-C仍未完成。详见[质量与日线领域审计](../2026-10-19-v21-c2-quality-dailybar-domain.md)和[日线持久Worker审计](../2026-10-19-v21-c2-dailybar-persistence.md)。

2026-10-19 C2-C Monitor持久化增量：Market Monitor现有独立PostgreSQL数据库和迁移账本，评估API按完整scope+taskId幂等持久质量指标、确定性异常及不含价格的Market Data quoteRefs；输入冲突返回409，latest按scope隔离。Platform只接受当前scope下Market Data已完成采样任务并校验任务scope后调用；V2.1 Web可计算和查询质量结果。7项Monitor API/领域单测、隔离PostgreSQL迁移/重复提交/独立Repository重启读回/TestRun隔离1项、V2.1 Playwright E2E 1/1通过；Platform/Web typecheck和合同检查通过。此增量不启用自动Monitor调度、不调用策略/订单，也不验证REAL来源或完整C2-C验收。证据见[Monitor持久化审计](../2026-10-19-v21-c2-monitor-persistence.md)。

本地DAILY_BAR Fixture操作：在`/acceptance/v2/v2.1`先为同一账户/TestRun保存在线池`600000.SH,000001.SZ`，点击“运行固定日线Fixture”，页面先显示任务QUEUED，随后轮询显示COMPLETED及尝试次数，再点击“读取最近日线完成”查看两个结果。请求入口为`POST /api/v1/acceptance/v2/v2.1/daily-bars/fixture/complete`，只提交scope；任务读取入口为`GET /api/v1/acceptance/v2/v2.1/daily-bars/completions/latest`并携带同一scope。固定输入为`fixtures/v2/v2.1-daily-bar-completion/bars.json`、Manifest `fixtures/v2/v2.1-daily-bar-completion/manifest.json`、版本`v2.1-daily-bars-1`、SHA-256 `b98309c9be021c2117d9b3b53276b4ddb313de290413f6bfea5b7040361ae6c4`、交易日`2026-10-16`；重复提交返回同一task，另一个TestRun读回null。任务卡在非终态时查看`/ready.dailyBarCompletionWorker`和服务日志；重启后同scope latest仍须可读，过期CLAIMED任务在lease到期后由Worker接管。验证命令：`pnpm --filter @stockquant/market-data-service test:schema-migrations`及`pnpm --filter @stockquant/market-data-service sampling:http-restart-smoke`；正常输出包含`"dailyBars"`PASS字段且`externalRequests=0`，隔离容器和网络由脚本自动清理。该按钮触发固定Fixture任务，不代表真实来源接入或实际每日连续运行。隔离调度命令`pnpm --filter @stockquant/market-data-service sampling:http-restart-smoke`会以注入Clock执行一次收盘触发并重放；预期摘要`closeScheduler.closeTick.state=SCHEDULED`、`repeat.state=ALREADY_SCHEDULED`、`autoCompleted=COMPLETED`，容器与网络清理完成。新增“启用当前TestRun收盘后日线调度”会按scope登记，策略默认关闭；仅支持冻结Fixture日期2026-10-16的合成任务，Asia/Shanghai已知交易日15:00后自动入队，过期Fixture日期明确不生成数据。真实DAILY_BAR来源/每日运行能力仍未通过验收。

- [x] 建立免费来源能力报告：许可、认证、批量能力、限流、延迟、历史覆盖、时间字段、状态字段和实测错误；未验证来源标UNVERIFIED，不承诺免费数据完整性。矩阵汇总历史探针、本地代码限制与官方公开资料；所有当前未有授权/当前实测支持的来源均明确标记UNVERIFIED，详见[来源能力矩阵](../2026-10-03-v21-source-capability-matrix.md)及[机器结果](../2026-10-03-v21-source-capability-matrix.json)。该文档交付不等于任何Provider通过或授权。
- [x] 在个人本地学习边界内验证至少一个实际行情来源与两个新闻来源的Adapter：腾讯两证券行情及东方财富、财联社各一篇文章由真实服务/隔离PostgreSQL完成，稳定路径和修订元数据持久化已核对。新闻发布时间均未知，长期稳定性/限流/覆盖、实体关联和真实修订观察仍未验证，不能外推为通用来源能力；证据见[OD-008实测](../2026-10-21-od008-local-learning-review.md)。
- [x] 在线池去重≤100只，优先持仓与在途证券、再候选和关注；硬必需证券超过上限时阻塞并提示调整，不静默丢弃。支持批量则批量，否则受控分批，禁止先全市场抓取后假称≤100请求。C1工程证据与边界见[阶段记录](../2026-10-17-v21-c1-watchlist.md)。
- [ ] 默认交易时段30分钟采样，可配置20分钟；采样、监控评估、日频策略和执行窗口各自配置。收盘后补齐已完成日线，盘中快照不可冒充最终日线/分钟Bar。部分完成：采样配置20/30持久化；HTTP只入队，后台Worker执行并持久化Fixture观测的sourceId/dataMode、observedAt/ingestedAt/availableAt、age/freshness；过期不报READY，未知源时间保留UNKNOWN；普通tick由Worker记录授权阻断。来源清单现提供持久化的quote采样健康和稳定错误码，与手工熔断分列；Monitor质量投影现具备独立PostgreSQL持久化/API；Market Data schema v17 Outbox在采样终态事务中写入quote-available事件，专用租约Worker仅在独立Monitor策略启用时按market-data-service Bearer幂等交付；验收页可显式启停，默认关闭。隔离HTTP/PG重启烟测通过，C2-E现已有三种Fixture TestRun从容器Web到PostgreSQL、同TestRun CLI核对及导出的实测；此证据不覆盖完整正常/拒绝/恢复矩阵和真实来源验收。独立DAILY_BAR Fixture已实现，schema v18按显式scope在收盘后自动触发并防重复；日线HTTP只入队，v16后台Worker按租约领取、校验Manifest、有限重试并持久化结果，Web可查询任务和完成状态。Sina候选Provider仅有固定响应验证、来源能力和许可未验证；Tencent/Sina REAL运行仍受来源授权与默认关闭开关限制；见[Monitor Outbox消费者审计](../2026-10-20-v21-c2-monitor-outbox-consumer.md)、[C2来源健康审计](../2026-10-19-v21-c2-source-health.md)、[C2-B Provider审计](../2026-10-19-v21-c2-provider-port.md)及[2026-10-19日线Worker审计](../2026-10-19-v21-c2-dailybar-persistence.md)。
- [ ] 保存source/observedAt/publishedAt/ingestedAt/availableAt及适用的延迟；新闻先展示和确定性关联，不成为默认Alpha触发器。来源切换产生可追溯版本。

## 3. 同步 Web 开发

正式页：来源健康与能力、股票池、最近快照年龄、新闻列表/来源/修订。验收页：50/80/100/101容量、限流/超时、重复新闻与行情陈旧场景。

验收中心路径：`/acceptance/v2/v2.1`。场景参数提交到后端TestRun编排接口，后端调用业务API并汇集证据。浏览器不直接写领域数据，不自行判定成交。该阶段至少提供正常、拒绝/异常场景；适用时增加重试/恢复场景。

## 4. 人工验收步骤

1. 配置免费来源并采集小股票池，查看真实数据/时间/来源；模拟来源在页面明确区分。
2. 分别设置20与30分钟，查看实际请求日志、交易日/午休行为；确认不因采样而强制下单。
3. 提交重复新闻、修订、同名公司，核对去重与实体纠正；单源失败不抹掉旧来源证据。
4. 将池扩到101，核对上限及持仓优先；过期数据展示陈旧而非实时正常。

每次保存testRunId、场景版本、代码/镜像、数据/规则版本、种子及注入事件序列、实际/预期、截图/Trace。判定依据必须是后端事实和独立检查，不能只看Toast成功提示。

## 5. 异常与替身边界

免费来源失效可继续用明确Fixture验收逻辑，但不能代替真实来源通过；无历史公开时间的新闻不得用于证明历史策略有效。

## 6. 产物与验证

目标产物：providers Adapter、news-intelligence-service基本采集、market-monitor-service、来源能力表、股票池与新闻Web。

自动验证：Adapter契约与真实来源烟测、分批限流/缓存/去重、50/80/100容量和101拒绝、时间戳/陈旧/新闻注入浏览器测试。

需求/测试追踪：DAT-07/08/10、NEW-01～03/05/06、MON-01/02/04；T07/15～17/38；DV-05、VT05。

契约客户端实现增量（2026-10-01）：Platform的V2.1来源元数据、采样配置/更新、在线观察池/更新、固定新闻预览、source smoke、live quote、live news及Circuit fail/recover现通过`market-data-calendar.v1`中的ServiceBearer OpenAPI及生成客户端访问。外部请求类路由与状态写入仅用mock验证代理边界，没有实际调用Provider或活动服务，不证明来源许可、行情/新闻实效或阶段验收；证据见[实施审计](../2026-10-01-w1-v21-market-read-client.md)。

2026-10-02外部HTTP适配器边界增量：V2.1 Tencent行情预览、新闻读取与来源Smoke传输移入Market Data `PublicSourceHttpAdapter`，bootstrap的逐用途授权判断先于adapter调用。70项Market Data单测通过，新增3项对注入HTTP/Clock的隔离验证；未请求任何外部来源。此增量不验证来源许可/可用性，不勾选第2节真实行情来源或新闻来源条目，NO_TRADE及无线源授权继续有效。

退出条件：开发任务完成、Web真实可操作、全部适用检查PASS、人工签署、已知限制写入证据。填写[本版验收表](../../../docs/prd/v2-data-and-replay/99-acceptance.md)，未完成项不得勾选通过。

## 7. 阶段交付待办（完成后勾选）

以下勾选只记录本阶段交付进度，不能代替第2节逐项开发任务或版本验收结论。开发者凭实现/实测证据勾选开发项；“人工验收”仅在用户实际确认后勾选，不预填PASS。

- [ ] 契约、数据结构、场景定义和预期结果已冻结。
- [ ] 第2节后端任务完成，真实依赖与替身明确。
- [ ] 正式Web功能页及验收中心正常/异常场景完成。
- [ ] 命令、实际URL、Fixture路径/Hash和配置说明已补齐，待实现占位已消除或明确列为范围外。C2本地Fixture子步骤已有明确URL/Hash/命令；来源健康接口另见[C2来源健康审计](../2026-10-19-v21-c2-source-health.md)；真实来源和完整业务场景的缺项仍待授权/验证。
- [ ] 开发者按第8节从准备到导出亲自执行，保存代码版本、退出码、截图/Trace和断言证据。2026-10-18隔离栈启动/健康/精确清理及C2数据库/HTTP/Web定向步骤已有证据；C2-E Fixture normal/rejection/recovery子run及同Run CLI核对/导出已通过（见8.6）；完整V2.1场景矩阵、代码套件、真实来源和人工验收仍未完成。
- [ ] 重复/恢复及适用观察期验证完成，未覆盖项如实记录。
- [ ] 用户已通过Web及命令证据完成人工验收，记录确认时间/结论。
- [ ] 操作说明与限制已更新，[本版验收表](../../../docs/prd/v2-data-and-replay/99-acceptance.md)已同步。

## 8. 阶段验收操作手册

2026-10-14当前树有限切片：在线池更新现先去重，再按唯一证券数执行100只门限。原实现先按输入数组长度拒绝，会错误拒绝101条但只有100个唯一证券的合法请求；现在该请求返回100项且`count=100`，101个唯一证券仍返回`WATCHLIST_LIMIT`/422。新增`normalizeWatchlist`单元覆盖两种边界；`pnpm --filter @stockquant/market-data-service exec vitest run tests/unit/watchlist.spec.ts`（2/2）及该服务`typecheck`通过。此记录只证明容量计数修复，不关闭在线池整个交付项。

2026-10-17 C1排序规则增量：`prioritizeWatchlist`按持仓→在途订单→候选稳定排序并去重；必需证券超过100只阻塞，不截断；候选只占剩余容量并记录省略项。该排序函数现已接入Platform领域事实聚合、Market Data owner/account/TestRun持久化API及Web交互，工程完成情况和检查结果见下方C1记录。

2026-10-17 Trade只读事实接口增量：新增Platform专用Bearer路由`GET /internal/v1/accounts/{accountId}/in-flight-orders`，按accountId、namespace、ownerId、testRunId精确过滤，只返回security/status；拒绝/成交/取消/过期订单排除在在途集合外。OpenAPI及Platform生成客户端已同步；该接口现由Platform在线池更新流程调用。

同次限界核对确认：来源未经授权时外部调用仍被门禁拒绝；Tencent快照真实来源时间精度仍未知；实时新闻解析当前只取页面title，`publishedAt=null`、`symbols=[]`、`revision=1`，预览新闻为固定样例。这些实现与历史mock证据不构成第2节来源、新闻时间/实体修订或真实源验收。V2.1手册仍为`DRAFT_NOT_EXECUTABLE`，虽隔离启动/停止已实测，完整页面与人工场景步骤尚待核实。

2026-10-17 C1端到端工程切片完成：Platform以会话身份取得ownerId，读取并校验Portfolio账户快照（owner/account/namespace/TestRun及PAPER+FAKE），读取同范围Trade未完成订单并校验响应范围，浏览器只可提交候选证券。Market Data提供owner/account/TestRun scoped API及`market_data_watchlists` PostgreSQL配置；迁移v2兼容v1，写入按scope advisory lock串行化，namespace冲突拒绝且不覆盖旧值。Web新增当前账户池的提交/读取和排序、数量、省略项显示。

定向自动验证通过：Market Data在线池和鉴权8/8、Trade鉴权8/8；Market Data/Platform/Trade/Web四包typecheck通过；Web生产构建、`pnpm contracts:check`通过。隔离PostgreSQL `pnpm --filter @stockquant/market-data-service test:schema-migrations`通过并清理容器/网络，覆盖并发/重复迁移、旧数据保留、100只容量及候选省略、fresh repository restart恢复、owner/account/TestRun隔离、namespace冲突保留旧配置和101只必需证券阻断。固定输入为80只持仓+10只在途+15只候选，结果100只并列出5只省略；单元测试覆盖重复证券及101个唯一候选拒绝。Web本轮完成生产构建，未执行浏览器人工操作；第7节签署继续待用户实际确认。本条仅关闭C1工程实现，不表示V2.1阶段PASS。真实Provider、采样持久化、行情陈旧语义、新闻发布时间/实体/修订仍未完成或未验证。

2026-10-17 C2本地Fixture闭环增量：20/30分钟设置写入PostgreSQL schema v3；schema v5新增可恢复采样任务。固定Run Clock tick使用配置和版本化A股日历，任务按settingsVersion+UTC Instant幂等持久化。因OD-008授权NONE，合格tick只记录`BLOCKED_SOURCE_AUTHORIZATION`，不调用行情源；任务在Market Data进程重启后可读取。

2026-10-18 C2 Fixture采样增量：新增冻结输入[`v2.1-snapshot-sampling-1`](../../../fixtures/v2/v2.1-snapshot-sampling/manifest.json)，SHA-256 `9898f0b7ed9bf275766df22e26e64109c7ef92c47a0da6e1bffe5194cbaabc6c`。显式`POST /v2/sampling/tasks/tick-fixture`按Run Clock和当前配置/日历执行该合成输入；先校验Manifest和原始文件Hash，再持久化`COMPLETED_FIXTURE`、Fixture版本/Hash和两条观测。正式V2.1验收页可分别运行普通阻断tick和合成Fixture tick并查看结果。普通`/tick`路径没有变化，未授权仍返回`BLOCKED_SOURCE_AUTHORIZATION`，两个路径都不访问外网。schema v6增加任务结果字段，OpenAPI、生成客户端和Platform受保护路由已同步。隔离验证覆盖v1–v6迁移、重复Fixture tick幂等、独立Repository重启读取两条结果；HTTP服务进程停止/重启后仍恢复Fixture任务，quote/news仍403，`externalRequests=0`。Market Data单测21文件/94项、Market Data/Platform/Web typecheck、契约、Fixture和文档检查通过；V2.1 C2单项浏览器E2E 1/1通过，使用Mock API，不代表完整浏览器到PostgreSQL链路。接口状态现如实返回监控、日线策略和订单执行调度`NOT_CONFIGURED`。详见[2026-10-18 C2增量审计](../2026-10-18-v21-c2-fixture-sampling.md)。此工程子项为FIXTURE-only，不代表真实行情采集、数据质量/新鲜度或Provider授权已验证。

新闻修订Fixture `v2.1-news-revisions-1` SHA-256为`5feb697b6d517aeae2ff7de85b324c97b95d153a7cb60cf08cfb516748f7d05b`。Platform/Web现可执行导入并显示持久sourceItemId修订历史、发布时间、observed/ingested/available时间、实体状态及稳定ID验证状态；相同Fixture重放幂等。真实首页title Adapter没有稳定文章ID和文章链接，仍不接入修订账本，实时项继续标`UNVERIFIED_NO_STABLE_SOURCE_ID`。行情陈旧状态和新闻跨源去重/单源失败规则沿用此前C2实现。

验证：Market Data单元测试21文件/94项PASS；Market Data、Platform、Web typecheck PASS；`pnpm fixtures:check`、`pnpm contracts:check`、`pnpm docs:check`及`git diff --check`通过。隔离`test:schema-migrations`覆盖v1–v5、采样任务重复/重启、修订1→2/supersedes/重放和旧数据保留；`sampling:http-restart-smoke`覆盖20配置、25拒绝422、固定采样tick持久/重启、Fixture导入/重放、真实quote/news 403及externalRequests=0；隔离容器/网络均清理。V2.1浏览器E2E 2/2通过，其中本次C2用例Mock Platform响应，不宣称完整Web→Platform→PG浏览器集成。详情见[C2工程记录](../2026-10-17-v21-c2-observation.md)。

C2继续`IN_PROGRESS`：本地Fixture工程子项已有Mock浏览器、隔离PostgreSQL以及真实多容器HTTP业务证据；按同一账户作用域读回和重复tick幂等通过。2026-10-18真实栈发现并修复Platform将Market Data新闻授权403误映射为500的问题，修复后Web代理正确返回403及授权缺项。五类独立政策已落库，持久任务生命周期Worker已接入服务轮询；HTTP只入队，Worker已完成冻结Fixture校验和观测持久化，真实模式仍按OD-008门禁阻断且外部请求为0。Tencent Provider端口及REAL来源/时间/质量落库路径已实现并经Stub/PG验证，但运行开关关闭且未调用真实源；Sina Adapter和quote来源健康派生查询已接线。Monitor质量结果持久化/API及自动quote-available消费者已有独立实现；独立DAILY_BAR固定Fixture任务已由v16后台Worker异步校验/写入，但真实每日DAILY_BAR来源、策略/执行消费者未接线，实时来源文章格式仍需授权验证。OD-008仍为NONE，实际1个行情源+2个新闻源及许可/覆盖/留存能力保持NOT_RUN。本次C2-E另以容器化Web TestRun完成Fixture normal/rejection/recovery子场景、同Run CLI核对和导出（见8.6）；该结果不等于完整V2.1需求场景矩阵或真实来源验收。手册仍有未复跑步骤，当前范围人工验收未完成。详见[2026-10-18 C2容器闭环审计](../2026-10-18-v21-c2-container-followup.md)、[任务生命周期审计](../2026-10-18-v21-c2-task-lifecycle.md)、[2026-10-19日线Worker审计](../2026-10-19-v21-c2-dailybar-persistence.md)与[2026-10-19 C2-B Provider审计](../2026-10-19-v21-c2-provider-port.md)。不得以Fixture关闭真实源门禁。
### 8.1 当前可执行性与验收准备

手册状态：**DRAFT_NOT_EXECUTABLE（2026-10-20；C2-E Fixture三场景Web/同TestRun CLI/export已完成；Web刷新和关页重开恢复同Run已验证；20/30分钟配置Web保存/读取已验证。C2-E完整场景矩阵、真实来源路径、最终代码套件和当前范围用户验收仍未完成）**。2026-09-09的历史隔离验证和签署保留。`pnpm stack:up -- --stage V2.1`现路由到专用隔离脚本；脚本生成随机Compose项目、项目专属数据库卷、随机宿主端口和一次性凭证，禁用来源授权并移除Market Data容器对本机`.env.local`的注入。`pnpm stack:down -- --project <脚本输出的项目名>`仅停止该随机项目并清理其卷/镜像。2026-10-18实际隔离栈` sq-v21-stack-49532e849282d9296c7e`启动成功：容器Web路由返回200、Platform API `/live`和Market Data `/live`均返回200；按精确项目停止退出0，输出`STOPPED_AND_PURGED`并核验容器/项目卷/网络/项目镜像/临时凭证已清理。详见[隔离栈烟测记录](../2026-10-17-v21-isolated-stack-smoke.md)及[2026-10-18 C2增量审计](../2026-10-18-v21-c2-fixture-sampling.md)。本记录不改变V2.1业务门禁。

自动入口：`pnpm stack:up -- --stage V2.1`；成功后从JSON输出复制Web、Platform API、Market Data动态URL和隔离项目名。Web路径为`/acceptance/v2/v2.1`。来源授权强制关闭，`STOCKQUANT_SNAPSHOT_REAL_PROVIDER_ENABLED`保持未设置；真实来源Smoke必须预期为拒绝/未授权，不可用来证明来源能力。停止使用`pnpm stack:down -- --project <isolatedProject>`；该命令清理本次项目卷，执行前先导出所需证据。测试命令：场景`pnpm verify:stage -- --stage V2.1 --scenario normal|rejection|recovery --seed 20260907`；代码`pnpm verify:stage -- --stage V2.1 --suite code`；浏览器`pnpm test:e2e -- --stage V2.1`。

前置服务由隔离Compose配置启动；阶段仍缺已授权的实际行情源和两个实际新闻源，相关验收保持NOT_RUN。

固定输入：在线池50/80/100与101只测试名单，优先持仓/在途；20/30分钟配置；真实来源与注入样本分开。

| 开发交付时必须填写 | 当前值 |
|---|---|
| 实测代码Commit或工作区Hash/验证日期 | HEAD `45bce40bf1ae44785f70a6ffeedcaaed1acba61a`；该工作区有未提交改动，不能用HEAD代替当前工作区版本；Fixture各自按Manifest SHA校验；验证日期2026-10-19 |
| 项目根目录、Node/pnpm/Python/uv及Docker版本 | `/Users/huangbosong/Documents/ChatGPT/StockQuant`；Node v24.1.0、pnpm 10.34.5、主机Python 3.9.6、uv 0.12.7、Docker client/server 28.0.4、Compose 2.34.0-desktop.1；主机arm64，容器在Docker Desktop `desktop-linux`，容器镜像构建日志通过 |
| Web基础URL/身份登录或会话建立方式 | 动态loopback地址。2026-10-18本次实测为`http://127.0.0.1:63174/acceptance/v2/v2.1`（该临时端口已随栈停止失效）；打开Web后由`/api/v1/session`建立本地会话，默认用户`acceptance-owner-1`；不记录Cookie/凭证 |
| 本阶段Web路由 | `/acceptance/v2/v2.1`（本次动态URL返回HTTP 200） |
| 正式页面的真实入口/跳转链接 | `http://127.0.0.1:<webPort>/acceptance/v2/v2.1`；正式入口为“开发验收中心→V2→V2.1”；来源健康、采样配置、普通授权阻断tick、合成Fixture tick、新闻Fixture及账户在线池入口均在该页。C2单项Playwright已核实Fixture按钮/结果显示；真实多容器业务页面流程未作为PASS |
| Fixture文件/数据版本/确切日期/Hash、规则与成本版本 | 快照：`fixtures/v2/v2.1-snapshot-sampling/snapshots.json`，`v2.1-snapshot-sampling-1`，观测时间2026-10-16 09:50 Asia/Shanghai，SHA-256 `9898f0b7ed9bf275766df22e26e64109c7ef92c47a0da6e1bffe5194cbaabc6c`；新闻：`fixtures/v2/v2.1-news-revisions/news-revisions.json`，`v2.1-news-revisions-1`，SHA-256 `5feb697b6d517aeae2ff7de85b324c97b95d153a7cb60cf08cfb516748f7d05b`；日历`sse-cn-a-share-2026-1`。均为合成数据，无交易/成本结论 |
| 配置文件及必需环境变量名/非秘密测试值 | 入口`pnpm stack:up -- --stage V2.1`自动生成随机0600临时env和Compose override；`STOCKQUANT_MARKET_RESEARCH_SOURCE_USE_AUTHORIZED=false`、`STOCKQUANT_MARKET_QUOTE_SOURCE_USE_AUTHORIZED=false`、`STOCKQUANT_MARKET_NEWS_SOURCE_USE_AUTHORIZED=false`、`STOCKQUANT_COLLECTION_SOURCE_USE_AUTHORIZED=false`；Market Data不加载本机`.env.local`；broker模式FAKE、LIVE关闭。凭证仅随机生成，不输出/归档 |
| 外部故障目标及可执行命令、恢复/隔离清理入口 | 不模拟或探测外部Provider故障：OD-008授权NONE，调用必须被拒绝。合成重复/重启验证：`pnpm --filter @stockquant/market-data-service sampling:http-restart-smoke`；独立迁移验证：`pnpm --filter @stockquant/market-data-service test:schema-migrations`；结束栈使用命令输出的精确项目名执行`pnpm stack:down -- --project <isolatedProject>` |
| 预期耗时、轮询超时、实际观察期/预算 | 隔离服务就绪轮询上限30秒/每路由；HTTP烟测请求超时5秒；Playwright默认单测试30秒；`stack:down`清理/等待上限120秒。以上均非真实市场观察；实时来源/长周期观察保持NOT_RUN、外部调用预算0 |

### 8.2 初始化与启动

在上表填写的项目根目录运行；工具版本按锁文件/项目说明准备。首次开发由开发者生成锁文件和脚本，验收者不负责补建环境。环境变量按上表配置；保持FAKE券商与模拟账户，真实模型仅在本阶段明确要求且预算已配置的场景调用。

```bash
# 终端A：在项目根目录启动V2.1隔离栈；保留终端以便观察状态并接收停止信号
pwd
pnpm install --frozen-lockfile
pnpm stack:up -- --stage V2.1
```

预期：脚本报告隔离Compose配置通过，启动Platform API、Market Data、Market Monitor、PostgreSQL与Web并逐一检查健康URL，然后持续运行供验收。记录动态URL和`isolatedProject`。若构建、健康检查或依赖不可用则非零退出，并尝试只清理本次随机项目；不得删除其他项目卷重试。2026-10-20实际栈Web `http://127.0.0.1:64562/acceptance/v2/v2.1`、Platform API `http://127.0.0.1:64559`、Market Data `http://127.0.0.1:64335`均可用；这些随机端口仅供该次运行追溯。Web正常/容量拒绝/任务恢复与同run导出已在8.6记录。完整手册仍保持`DRAFT_NOT_EXECUTABLE`，因为全阶段真实源/代码套件与人工验收未完成。本机V2.1 Web由隔离Compose运行，不另启`pnpm dev:web`。Ubuntu部署另需目标系统证据，不能由此入口替代。

2026-10-18按上述入口实测：`pnpm stack:up -- --stage V2.1`退出0并输出`READY_FOR_MANUAL_ACCEPTANCE`，本次`isolatedProject=sq-v21-stack-49532e849282d9296c7e`，Web=`http://127.0.0.1:63174/acceptance/v2/v2.1`，Platform API=`http://127.0.0.1:63171`，Market Data=`http://127.0.0.1:63159`；三条URL均在脚本健康轮询中返回200。精确停止命令`pnpm stack:down -- --project sq-v21-stack-49532e849282d9296c7e`退出0，输出`STOPPED_AND_PURGED`；临时PostgreSQL卷、网络、容器、项目镜像及凭证文件均按脚本核验已删除。该实测证明隔离启动/就绪/停止步骤可执行，不表示人工验收或真实来源门禁通过。

初始化在验收中心“准备隔离运行”完成；CLI场景入口也负责同样的准备，两者调用同一业务API。准备后记录testRunId、accountId、namespace及Fixture/DataVersion；初始化业务本身是测试对象时不得预先完成被测动作。缺源/凭证/历史数据时显示缺项，不静默换成Fake并报真实场景通过。

### 8.3 Web逐步操作及预期结果

1. 登录上表实际Web地址，进入“开发验收中心→V2→V2.1”；检查页面版本、模拟模式、服务能力与固定输入。
2. 在`/acceptance/v2/v2.1`点击“运行正常”“运行容量拒绝”或“运行任务恢复”，记录页面显示的`testRunId`；三类场景使用独立运行，重放/恢复在原运行和业务幂等键内完成。每次页面刷新或关页后重开，确认原`testRunId`恢复。
3. 按下表执行。操作按钮为目标交互，交付时开发者必须换成实际页面名称/按钮及路由；预期必须从业务明细读取，不能只看“任务完成”。

| 场景ID（阶段内唯一） | 场景 | 点击顺序/输入 | 预期结果与核对点 |
|---|---|---|---|
| normal | 实际采集 | 选择已验证来源→导入50只在线池→设30分钟→启动采集；查看请求范围、快照年龄和新闻原文链接，再测20分钟配置。 | 实际请求可查且仅限池范围；来源、时间和延迟可见；新闻聚合不强制交易，最终日线与快照分开。 |
| rejection | 容量与新闻冲突 | 尝试101只池；在独立异常场景提交同一新闻转载、更正、同名实体及来源超时。 | 超限明确拒绝/阻塞且不漏掉持仓；转载去重、更正有链、歧义可纠正；源失败保留旧证据并标陈旧。 |
| recovery | 断源恢复 | 暂停一个测试来源后恢复，检查重试日志、去重和窗口；刷新页面重读历史请求。 | 有限重试、无重复发布；实际与Fixture标识不混用；不同来源时间不伪装同步。 |

本地C2固定输入操作（用于工程复核，不替代上表真实源场景）：页面按钮为“保存采样间隔”“运行固定采样时点”“运行合成快照Fixture采样”“导入固定新闻修订Fixture并查看历史”。先保存20分钟；普通固定时点为`2026-10-16T01:30:00.000Z`（北京时间09:30），REAL来源ID为`tencent-quote`，HTTP返回QUEUED，随后Worker预期记录`BLOCKED_SOURCE_AUTHORIZATION`，外部请求0。合成Fixture tick为`2026-10-16T01:50:00.000Z`（北京时间09:50），使用`sse-cn-a-share-2026-1`日历和`v2.1-snapshot-sampling-1`；HTTP先返回QUEUED，随后Worker校验并写入`COMPLETED_FIXTURE`、2条合成观测、数据SHA-256 `9898f0b7ed9bf275766df22e26e64109c7ef92c47a0da6e1bffe5194cbaabc6c`、外部请求0。重放同一来源/时点tick应显示已有任务（`created=false`），来源换为`sina-quote`则应形成独立任务；未登记来源应返回422。新闻Fixture为`fixtures/v2/v2.1-news-revisions/news-revisions.json`，Manifest `fixtures/v2/v2.1-news-revisions/manifest.json`，SHA-256 `5feb697b6d517aeae2ff7de85b324c97b95d153a7cb60cf08cfb516748f7d05b`；重放后相同记录不得增加修订，页面应看到notice-001修订1/2和分立时间字段。后台入口：`POST /api/v1/acceptance/v2/v2.1/sampling/tasks/tick`、`POST /api/v1/acceptance/v2/v2.1/sampling/tasks/tick-fixture`、`GET /api/v1/acceptance/v2/v2.1/sampling/tasks/latest`、`POST /api/v1/acceptance/v2/v2.1/news/fixture/ingest`、`GET /api/v1/acceptance/v2/v2.1/news/fixture/history`。隔离服务证据命令：`pnpm --filter @stockquant/market-data-service sampling:http-restart-smoke`和`pnpm --filter @stockquant/market-data-service test:schema-migrations`（均退出0并自动清理隔离PostgreSQL容器/网络）；本轮sourceId具体验证见[2026-10-19审计](../2026-10-19-v21-c2-source-id-validation.md)。C2浏览器命令`pnpm --filter @stockquant/web exec playwright test tests/e2e/v21-c2-observation.spec.ts`为1/1 PASS，使用Mock Platform响应，不代表真实浏览器到PostgreSQL集成。本地Fixture/sourceId子场景已验证，但完整V2.1操作手册、真实来源场景、同TestRun Web/CLI和当前范围人工验收仍未完成，手册保持`DRAFT_NOT_EXECUTABLE`。

#### C2-A 固定场景契约（冻结输入与预期）

以下Clock值均为UTC，交易时区固定为`Asia/Shanghai`，日历为`sse-cn-a-share-2026-1`；行情数据模式为模拟Fixture，场景不得生成订单或模型调用。采样任务身份包含市场、`dataMode`、明确的来源身份（REAL按`sourceId`区分，FIXTURE按Fixture版本区分并记录Hash）、快照政策`settingsVersion`、完整owner/account/namespace/TestRun scope及UTC `scheduledAt`。REAL请求要求来源登记中的`sourceId`（`tencent-quote`或`sina-quote`），任务键包含该来源ID。迁移前已有但无法溯源的REAL任务标记`legacy:unspecified`，不伪造来源。相同身份与相同输入重放返回既有任务且`created=false`；间隔、日历、窗口、证券集合、scope或已提交来源/Fixture指纹冲突时返回`SNAPSHOT_TASK_IDEMPOTENCY_CONFLICT`，不得覆盖旧任务。业务任务状态与Worker生命周期状态分层记录：业务状态为`QUEUED`、`COMPLETED_FIXTURE`、`BLOCKED_SOURCE_AUTHORIZATION`或`FAILED`；Worker状态为`QUEUED`、`CLAIMED`、`RETRY_WAIT`、`COMPLETED`、`BLOCKED_SOURCE_AUTHORIZATION`或`FAILED`。REAL模式在授权缺失时由Worker明确阻断，Provider外部请求数为0。

| 固定场景 | 固定输入 | 预期断言 | 当前证据边界 |
|---|---|---|---|
| `V21-C2-NORMAL-FIXTURE` | 隔离owner/account/namespace/TestRun；先设20分钟，Clock=`2026-10-16T01:50:00.000Z`（09:50）；日历`sse-cn-a-share-2026-1`；Fixture `v2.1-snapshot-sampling-1`及冻结SHA。再设30分钟，以`2026-10-16T02:00:00.000Z`（10:00）核对采样窗口。 | 20分钟Fixture经Worker完成，保存2条`FIXTURE`观测及来源、时间/新鲜度、策略版本和Fixture Hash；外部请求0、订单0。30分钟更新只产生新的快照政策版本，不改变其他四类策略。授权关闭时REAL任务阻断。新闻Fixture `notice-001`修订1→2并记录`supersedes`；相同内容重放不增加修订。 | 本次C2-E normal子run已在容器Web以同TestRun绑定snapshot、quality、DAILY_BAR及news Fixture并通过6/6断言；证据见8.6及C2-E审计。该run没有覆盖此行全部20/30分钟切换、新闻修订重放及策略版本比较，后者仍未作为同一完整业务场景验收。 |
| `V21-C2-REJECTION` | 20分钟设置下输入2026-10-16 10:00非采样tick、同日12:00午休、2026-10-17周六、2027-01-04未知日历，以及授权关闭下分别指定两个登记REAL来源的合格tick。幂等冲突子例沿用同一来源、模式、政策、scope和时点，仅改变证券集合。 | 前四项依次为`NOT_SAMPLING_TICK`、`CLOSED`、`CLOSED`、`UNKNOWN_CALENDAR`且不创建任务；两个REAL来源分别保留sourceId，均终态`BLOCKED_SOURCE_AUTHORIZATION`且外部请求0。相同任务键异载荷返回`SNAPSHOT_TASK_IDEMPOTENCY_CONFLICT`，原任务/观测不变。陈旧行情为`STALE`、源时间缺失为`UNKNOWN`，都不能是`READY`。 | C2-E rejection子run以101只必需证券触发稳定422并验证配置未被部分写入；Web断言2/2 PASS，同run CLI check-only退出0，见8.6。日历、sourceId未授权、幂等冲突等其他拒绝用例仍以既有定向测试/HTTP证据分别证明，未纳入该Web run。 |
| `V21-C2-RECOVERY` | 提交normal Fixture后重放相同tick；任务完成后重启Market Data并以原scope读取；并发Worker领取同一任务。失败子例用已记录的错误时点或损坏输入，不改写原任务。 | 重放不重复建任务或观测；同一任务最多一个有效租约持有者提交；重启保留策略版本、任务、Fixture指纹和观测；过期租约可接管，重试不超过任务`maxAttempts`后明确`FAILED`。失败记录保留，修复后以新任务身份运行。 | C2-E recovery子run重放同一DAILY_BAR请求三次，task ID稳定且完成结果可读，Web断言2/2 PASS；同run CLI check-only退出0并导出，见8.6。浏览器关闭重开、Market Data进程重启与故障租约接管由独立HTTP/PG测试覆盖，不声称由该Web run覆盖。 |

本矩阵冻结C2-A本地契约和固定预期，不表示所有场景已端到端执行。C2-E Fixture normal/rejection/recovery的Web→真实服务→PostgreSQL同Run CLI核对和导出已通过；完整操作手册、OD-008授权后的真实Provider场景及人工验收仍未完成。

4. 从运行详情打开关联正式页面，执行一次刷新/关闭再打开；核对长任务后台状态、历史证据和加载/失败/陈旧提示。
5. 每项记录实际结果、截图与业务ID。异常场景“预期拒绝”被正确验证时断言可PASS，但被测业务操作仍显示拒绝；若意外接受则断言FAIL。

### 8.4 命令行复验与相同运行核对（已实现）

在项目根目录执行以下已实现命令。stage/scenario必须匹配8.3定义；CLI与Web共用场景版本、Fixture和断言。每条命令执行后立即查看退出码，任何非零先保存错误再定位，不能继续假定本阶段通过。

```bash
pnpm verify:stage -- --stage V2.1 --scenario normal --seed 20260907
# 紧接上一命令执行；0表示全部场景断言通过
 echo $?
pnpm verify:stage -- --stage V2.1 --scenario rejection --seed 20260907
 echo $?
pnpm verify:stage -- --stage V2.1 --scenario recovery --seed 20260907
 echo $?
pnpm verify:stage -- --stage V2.1 --suite code
 echo $?
pnpm test:e2e -- --stage V2.1
 echo $?
```

预期：各场景输出testRunId、实际数据/模型/券商模式、断言expected/actual及证据位置；预期内拒绝场景验证成功退出0，意外副作用/缺脚本/缺必需依赖/未满观察条件非零。恢复场景需外部动作时输出已核实目标和步骤，停留WAITING；完成动作后复验原run，不伪称Web可重启宿主。浏览器测试必须实际运行本阶段用例，零用例/全跳过不能退出0。

再对Web中已运行的同一testRunId执行只读核对，避免仅创建新样本掩盖页面问题：

```bash
# 粘贴Web运行详情中的实际testRunId，再按回车；这是普通ID，不是凭证
read -r acceptance_run_id
pnpm verify:stage -- --stage V2.1 --run "$acceptance_run_id" --check-only
 echo $?
pnpm evidence:export -- --stage V2.1 --run "$acceptance_run_id"
 echo $?
```

check-only仅查询此运行后端事实并追加检查证据，不创建新订单、不重放成交或发起模型调用；空ID/错误stage/越权run必须拒绝。导出只含脱敏数据，输出实际目录和Manifest Hash，不自动勾选人工验收。端到端正常/异常/恢复运行产生不同ID，导出时分别保存。

本阶段代码测试覆盖要求：Adapter契约与真实来源烟测、分批限流/缓存/去重、50/80/100容量和101拒绝、时间戳/陈旧/新闻注入浏览器测试。 在交付时把映射到的实际Domain/DB/契约/服务内测试命令补入本节，注明执行目录、测试文件或套件、退出码和报告；verify:stage必须展示实际调用的测试清单，不能空壳返回0。Python服务使用自身锁定环境，不串用其他服务虚拟环境。

2026-10-20本地Web复跑记录：动态Web URL `http://127.0.0.1:51868/acceptance/v2/v2.1`，Platform API `http://127.0.0.1:51867`，Market Data `http://127.0.0.1:51859`；隔离Compose项目` sq-v21-stack-b2e9f57f4ec693be746a`，停止输出`STOPPED_AND_PURGED`。TestRun `8e56907c-379d-4e2a-9370-796f8a3d852d`刷新后恢复相同ID/COMPLETED/6项PASS，CLI退出0，Manifest SHA-256 `f447e44ae440fa8457f921eb01915224a3c82fd3c976bd284e31534f26aae7a2`。TestRun `45ec1df9-68cb-4ae6-83a6-62831ebee881`关页并在同一浏览器上下文重开后恢复相同ID/COMPLETED/6项PASS，CLI退出0，Manifest SHA-256 `269725799dd95605ddbff4f4b681d94a3e994210064f1971f173337c1765c26d`。Web“保存采样间隔”及“读取持久采样配置”将20分钟写入/读回为settingsVersion 10，将30分钟写入/读回为settingsVersion 11，均为POSTGRESQL持久配置。浏览器关闭/重开结果验证同一上下文中的页签关闭和重开，不代表操作系统/browser进程重启；刷新/重开结果不替代真实来源、完整拒绝矩阵或人工验收。证据索引见[C2剩余缺口核对](../2026-10-20-v21-c2-residual-gap-inventory.md)。

### 8.5 交叉核对、失败定位与恢复

交叉核对：Web池数量与实际请求股票集合、采样时间戳、源记录Hash及新闻去重/修订数量对照；真实时间等待不能用加速记录代替。

先检查Web与CLI的testRunId、输入/策略/代码版本和模式是否一致，再按Trace查平台、领域、适配器与持久化证据。页面错误而CLI正确，记录Web失败；二者都错则保留领域断言失败。缺能力先查健康/迁移/数据与日志，不修改余额或订单状态使断言通过。

独立复跑创建新run；测试幂等/检查点/重启恢复则使用原run和原幂等键。故障发生后保留旧证据，修复后新增运行或检查记录；不得清空账本、随机更换seed直到通过。真实观察窗口、来源验证和实际模型调用与加速/录制测试分别记录。

### 8.6 验收记录与收尾

| 场景/检查 | Web实际结果与截图 | 命令/退出码/报告 | testRunId/业务ID | 结论 |
|---|---|---|---|---|
| C2-E Fixture normal子run（不代表完整阶段normal） | Web页面返回COMPLETED，6/6断言PASS；未保存截图 | `STOCKQUANT_PLATFORM_API_URL=http://127.0.0.1:64559 pnpm verify:stage -- --stage V2.1 --run d59212c5-ce50-47c5-ad47-d9de8aba744b --check-only`退出0；证据导出完成 | `d59212c5-ce50-47c5-ad47-d9de8aba744b`；Manifest SHA-256 `cec57e59754216164ec34af0c817a36bbd3e6c43864423ee08bb73b9828b1809` | PASS（仅C2-E Fixture子场景） |
| C2-E Fixture rejection容量拒绝子run（不代表完整拒绝矩阵） | Web页面返回COMPLETED，2/2断言PASS；101只必需证券稳定422且配置无部分写入；未保存截图 | 同run CLI `--check-only`退出0；证据导出完成 | `e27e805a-7c13-4403-8529-f16b83b97918`；Manifest SHA-256 `7bde9f1cccc6d7d0200700b24bd07f25063f0f8de2d11e8f24f7b41b2e8462d6` | PASS（仅C2-E Fixture子场景） |
| C2-E Fixture recovery任务幂等子run（不代表完整恢复矩阵） | Web页面返回COMPLETED，2/2断言PASS；三次提交复用同一DAILY_BAR task；未保存截图 | 同run CLI `--check-only`退出0；证据导出完成 | `6453b02c-7132-48ee-b4fd-a5459c9f2da1`；Manifest SHA-256 `cbbe12003948a7f13f9d9cb807344fa6e1e2444965d23db5ae6169229153aa42` | PASS（仅C2-E Fixture子场景） |
| Web TestRun刷新恢复 | 页面刷新后恢复同一COMPLETED run及6/6断言；未保存截图 | CLI `--check-only`退出0；证据包已导出 | `8e56907c-379d-4e2a-9370-796f8a3d852d`；Manifest SHA-256 `f447e44ae440fa8457f921eb01915224a3c82fd3c976bd284e31534f26aae7a2` | PASS（页面刷新） |
| Web页签关闭/重开恢复 | 同一浏览器上下文关闭页面后重新打开，恢复同一COMPLETED run及6/6断言；未保存截图 | CLI `--check-only`退出0；证据包已导出 | `45ec1df9-68cb-4ae6-83a6-62831ebee881`；Manifest SHA-256 `269725799dd95605ddbff4f4b681d94a3e994210064f1971f173337c1765c26d` | PASS（页签恢复；未验证浏览器进程重启） |
| C2-E normal TestRun 20/30分钟策略边界 | Web创建run `78ae7e77-6923-4ab7-aa0f-2c865b78550a`，7/7断言PASS；同一09:50 Fixture tick在20分钟配置下入队并完成，在30分钟配置下为`NOT_SAMPLING_TICK`且无任务；外部请求0，未保存截图 | 同run CLI `--check-only`退出0。证据导出尝试退出2：缺`STOCKQUANT_EVIDENCE_SESSION_COOKIE`，因此没有生成Manifest | snapshot task `CN_A:snapshot:FIXTURE:fixture:v2.1-snapshot-sampling-1:4:bf2fdff402077035ad781f87f7a0a217d49e203ed12c7259ec96f81059bea5e0:2026-10-16T01:50:00.000Z`；首次用10:00匹配30分钟时点尝试失败，`SNAPSHOT_FIXTURE_INSTANT_MISMATCH`保留见缺口审计 | PASS（同Run采样间隔边界；非完整C2矩阵；证据导出受当前会话Cookie阻塞） |
| 20/30分钟采样配置Web往返 | Web分别保存后读取并显示20/30分钟 | POST/GET均200；POSTGRESQL；settingsVersion 10/11 | 配置设置是持久全局状态，未绑定单一TestRun | PASS（配置读写；非完整时钟场景矩阵） |
| Web同run只读核对与证据导出 | 三条Web TestRun分别由CLI读取并导出；隔离栈清理`STOPPED_AND_PURGED` | 三条`--check-only`均退出0；Manifest见上 | 见三条TestRun | PASS（仅上述Fixture子场景） |
| 本阶段代码测试/实际观察适用项 | 待执行 | 待执行 | 待执行 | NOT_RUN |
| C2本地采样/新闻Fixture、任务隔离、策略与任务状态机子项 | Playwright 1/1 Mock用例PASS；真实容器栈保存账户池、异步Fixture采样/读回/重复tick通过；未授权新闻403透传通过；Web页面策略列表展示和Worker执行状态可读 | 单元23文件/103项，schema迁移v1–v12、历史观测缺失溯源字段回填UNKNOWN、任务状态机隔离PG并发领取/租约恢复/有限重试、HTTP进程重启后Fixture执行恢复及失败输入诊断、contracts均PASS；真实栈Fixture externalRequests=0；策略默认disabled且版本独立；隔离资源已清理 | V1.3模拟账户/TestRun `8c3e3711-b809-4f80-a27b-bb6218418406`；采样task `CN_A:snapshot:FIXTURE:1:25429d14784e88766b1a847ebf1ae87532d543ab8d5753a90a2a133070bc1407:2026-10-16T01:50:00.000Z`；Fixture `v2.1-snapshot-sampling-1` SHA-256 `9898f0b7ed9bf275766df22e26e64109c7ef92c47a0da6e1bffe5194cbaabc6c`；策略见[审计](../2026-10-18-v21-c2-schedule-policy.md)，任务生命周期见[审计](../2026-10-18-v21-c2-task-lifecycle.md) | 快照Fixture解析/结果持久化已由后台Worker执行并在HTTP重启后恢复，展示来源/三类时间/age/freshness，过期/未知观测不标READY；Provider/监控/日线/策略/订单执行流程、C2完整同Run场景、真实源与阶段验收仍NOT_RUN |
| 用户人工验收 | 待用户确认 | 不由脚本代签 | 确认人/日期待填 | NOT_RUN |

记录不适用子项的范围依据，不能将必需项改为不适用绕过门禁。归档后在[本版验收表](../../../docs/prd/v2-data-and-replay/99-acceptance.md)填写证据链接和结论。清理只针对本轮已结束的隔离运行，默认保留证据；停止测试不能删除数据库卷或取消无关任务。

2026-10-01运行门禁补充：来源Smoke、实时行情/新闻和分钟采集必须有逐用途来源授权引用、数据版本及精确source ID白名单；未具备时不得发出Provider请求。当前`NO_TRADE`、暂无来源授权，故外部路径保持`NOT_AUTHORIZED`，此项实现不计为来源能力或数据观察通过。OD-008关闭和来源授权证据仍为V2.1后续前置条件。

门禁完整性补充（2026-10-01）：分钟采集的Node执行器和独立Python网络适配器均在外部请求前校验授权。适配器直调也无法绕过门禁；拒绝是不可重试的配置状态，不会触发故障切换或外部探测。

来源探针门禁补充（2026-10-01）：手工运维能力/稳定性探针同样受逐来源用途门禁保护；无授权时返回`BLOCKED`，不发送探测请求或写入诊断证据。来源许可待确认期间，本阶段这些真实来源能力项保持NOT_RUN。

历史行情用途补充（2026-10-01）：日线、分钟历史导入和PIT能力探针使用独立`HISTORICAL_RESEARCH`门禁；分钟数据落地还需独立分钟采集授权。无授权时不打开BaoStock session、不读源manifest驱动Provider调用、不写部分数据或Manifest，结论为BLOCKED/NOT_RUN。

外发HTTP adapter边界补充（2026-10-02）：V2.1 Tencent quote、来源Smoke和新闻页面请求移到`PublicSourceHttpAdapter`，逐用途授权检查仍先于网络调用。Market Data 70项单测、PostgreSQL 23项集成和完整V2.1 code suite均通过；全程没有外部来源请求。审计见[W3 Market Data adapter](../2026-10-02-w3-market-data-provider-adapter.md)及[SHA-256](../2026-10-02-w3-market-data-provider-adapter.sha256)。来源许可/数据版本及真实行情新闻实测保持NOT_RUN。

2026-10-03候选行情源许可桌面复核：财富趋势官网把国内行情授权指向交易所授权渠道；其“个人行情数据”仅明确个人版PC端盘后客户端日线包，没有给`easy-tdx`在线TCP协议/分钟采集、服务端使用或长期留存授权。BaoStock现行官方数据条款未能取得；PyPI客户端包BSD只覆盖软件包许可，不代表行情许可。没有任何新外部请求；当前`NO_TRADE`/source authorization `NONE`，BaoStock/TDX许可与能力仍`UNVERIFIED`。仅在取得书面数据授权并固化引用后才允许对应用途门禁开启。详见[W4来源权利复核](../2026-10-03-w4-data-source-rights-review.md)、[机器摘要](../2026-10-03-w4-data-source-rights-review.json)和[SHA-256](../2026-10-03-w4-data-source-rights-review.sha256)。

2026-10-03来源能力矩阵收敛：将Tencent、Sina、BaoStock、TDX/easy-tdx、Eastmoney News、CLS News逐一列出许可/授权、认证、批量、源限额与本地限额、历史样本/时延、时间及状态字段、失败证据；每行区分旧样本和源码行为，未验证项保留UNVERIFIED。未请求外部数据、不改变NO_TRADE/authorization NONE。矩阵见[审计说明](../2026-10-03-v21-source-capability-matrix.md)与[SHA-256](../2026-10-03-v21-source-capability-matrix.sha256)。


2026-10-20 C2-B收盘后调度增量：schema v18新增按完整TestRun scope启停的DAILY_BAR schedule与last-triggered session。调度器以Asia/Shanghai注入Clock每30秒检查，仅已知交易日15:00以后、scope显式启用、且当前日期等于Fixture sessionDate时才幂等入队；没有Fixture覆盖的日期返回NO_FIXTURE_FOR_SESSION，真实来源仍不调用。页面开关默认关闭；隔离PG v1–v18 HTTP/restart smoke、Market Data 126单测、三包类型检查、契约和Playwright 1/1通过。见[收盘调度审计](../2026-10-20-v21-c2-dailybar-close-scheduler.md)。

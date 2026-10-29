# 市场数据服务

服务：`market-data-service`。日期：2026-09-07。状态：设计草案；实现/运行/验收均NOT_RUN。技术基线：Python / FastAPI + 导入与采集Worker。

共同约束见[整体架构](../01-system-architecture.md)、[契约与数据](../02-contracts-and-data.md)、[部署](../03-deployment-and-operations.md)。本文是服务S0设计输入；逻辑表与扩展端口需在对应阶段冻结Schema/迁移，不表示已有实现。

## 1. 范围与交付

V1.2日线与Fixture；V2.1免费来源；V2.2分钟导入；V2.5扩容。

V1.2研究Fixture当前使用不可变`v1.2-market-data-5`。它显式携带每个市场的合成预期交易日列表；Quant/Platform窗口构造以该列表为时间轴，不能从剩余Bars反推日历。整市场某日无Bars时，该日及其受影响的lookback/next-session标签被排除，历史不足则在Qlib调用前失败关闭。该日历只用于固定合成样本，不能替代真实交易所日历或Market Data服务的生产Calendar事实。

唯一拥有：Security及历史标识、Calendar、MarketRuleSet来源证据、DataVersion、质量报告、行情/FX/公司行动/财务PIT修订与数据Artifact元数据。

边界：不持有账户账本，不发布交易建议，不执行撮合；未知数据不解释为确认停牌。

## 2. 内部分层

domain：证券、日历、Bar/PIT、质量与发布规则；application：导入预览、验证、发布、按版本查询；ports：Provider/Repository/Artifact/Clock；adapters：文件、免费来源、PostgreSQL、对象存储；bootstrap：API与Worker。

目标目录：`services/market-data-service/`，包含src、独立依赖锁、migrations、Dockerfile、README和分层tests。domain不依赖框架/SDK；application依赖ports，由bootstrap注入adapters。配置验证失败需明确依赖项。

## 3. 数据与一致性

逻辑持久化：securities/security_aliases、calendars/sessions、data_versions/artifact_refs、import_runs、quality_reports、corporate_action_revisions、rule_versions、historical_context_versions。`historical_context_versions`按类型/版本不可变保存股票池成员及各自上市/退市有效期、MarketRuleSet内容、公司行动覆盖/记录、规范内容SHA-256、整体有效期、来源引用和登记用户。分钟导入只保存引用；回放预检必须重新解析引用、核对内容Hash、导入时间范围、逐证券覆盖及精确历史研究用途门禁。登记用户的声明和来源引用不等于官方事实或许可证明。分钟行情按市场/频率/日期/证券分区Artifact，不默认逐Bar写关系表。

事务/幂等：历史标识按有效区间查询；导入幂等键绑定来源/载荷Hash/run；重复同内容返回原结果、冲突409；发布元数据与Outbox同事务。

C5本地Fixture快照选择采用范围绑定的不可变任务计划：所有计划任务和业务完成时刻必须在评估时刻前可确认，按观察时刻选首个合格结果；缺失或未完成等待，来源、范围、时间与结果冲突失败关闭。当前BUY/SELL两日的固定计划和业务完成凭据已接入采样Worker，通过受Platform服务身份保护的计划提交与只读选择接口访问；凭据可在任务完成后重试恢复，任务与凭据之间的间隙保持等待。现有采样任务的基础设施时间不能冒充历史业务完成时刻，此Fixture范围也不能推广成真实来源水位线。治理消费与整链仍待接入。

每服务独立数据库/User。涉及业务账户与运行的数据按market/account/environmentMode/runId或namespace隔离；命令身份来自可信上下文。不得跨库join获得未授权事实或跨库写入；通过API或事件投影合作。需要事件发布的业务状态与Outbox原子提交，消费者副作用与Inbox同事务。

## 4. 入站接口与出站依赖

| 端口/基线路由 | 契约行为 |
|---|---|
| POST /internal/v1/data-imports | 输入来源/字段映射/范围/幂等键，202返回runId；预览/取消为待冻结扩展。 |
| GET /api/v1/data-versions/{id} | 返回不可变Manifest、质量/覆盖/用途；按securityId/asOf查询禁止回退latest。 |
| GET /internal/v1/quotes | 读取适用时点、来源和用途的报价，不把研究快照声明为LIVE报价。 |

读取供应商/用户文件；向量化、监控、组合发布只读版本引用；公司行动由组合入账、执行调整订单。

路由标“待冻结”表示架构意图；已有基线路由引用[市场契约](../../docs/prd/03-market-rules-and-contracts.md)。所有扩展在S0生成OpenAPI/AsyncAPI与TS/Python Client，写命令具备Idempotency-Key、expectedVersion、reason/sourceRef和统一错误。

## 5. 事件与主要流程

事件：发布stock.market-data.data-version.published.v1及stock.market-data.corporate-action.published.v1；原始大文件不放事件。

1. 接受导入并存原始Hash/来源/用途，预览映射和单位。
2. 校验交易时段、缺失、重复、RAW/复权、availableAt及历史证券；写分区临时产物。
3. 完整产物校验后原子发布元数据/Outbox；失败保留上一可用版本但标时效。
4. 消费者用固定DataVersion查询；旧数据/修订链仍可重现。

## 6. 故障、权限与恢复

断源独立限流/退避；中断从导入游标续跑，发布前清单完整性必须验证；缺分钟不前填。

所有三版交易通道仅FakeBroker，服务身份只能获得需要的最小访问范围。历史业务时间通过run-scoped Clock，基础设施超时用单调时钟；重试必须区分幂等查询与不确定副作用。恢复需保留原业务ID/幂等键/版本和失败证据。

## 7. 部署与可观测性

Python / FastAPI + 导入与采集Worker组件按已启用能力部署；API和长计算/消费者可分进程，未启用的后续服务不需常驻。遵循Mac Linux ARM64小样本及真实Ubuntu目标架构验证，独立健康/版本/迁移/回滚说明。

提供/live、/ready或等价探针，记录服务依赖、版本和队列/任务年龄；日志贯通correlationId/testRunId及适用业务ID。来源新鲜度健康检查使用版本化交易日历，只在采集时段及收尾宽限期要求最近成功；其他时段仍检查熔断、调度和质量事实，未知日历按严格新鲜度检查。指标包含任务成功/拒绝/失败/耗时、重试与恢复进度，不能只靠HTTP200报业务健康。

分钟来源默认顺序为 `sina,baostock`：Sina 是当前已验证的盘中优先来源，BaoStock 用于盘后/历史读取及有界半开恢复探测。`tdx` 通过可选 easy-tdx extra 提供候选分钟能力，但尚未进入默认顺序；Ashare 只是新浪/腾讯接口封装，不视为独立来源。每次运行必须保留实际来源、尝试序列、服务器和熔断状态；只有真实交易时段成功切回并经过独立证据验证，才能调整该顺序或宣称任何候选源盘中能力通过。

## 8. Web与验证

2026-10-21 C2文章获取：HTTP adapter只从注册origin及文章路径发现候选，禁止重定向、限定字节/超时并按源缓存/合并请求；应用层`collectV21News`经端口聚合文章并逐源写入现有修订仓储，再生成跨源去重展示。源失败独立返回，不清除历史事实；GET live路由仍先检查来源授权。实际子进程故障验证使用生产SamplingTaskWorker/持久仓储与Fixture执行适配器，证明领取后及结果提交后崩溃可在租约过期后续接，Outbox身份不重复。详见[本轮审计](../../evidence/audits/2026-10-21-v21-c2-news-and-crash-recovery.md)。这些是本地工程结果，实源条款/能力及全部阶段验收待完成。

导入预览/错误行、日线和分钟浏览、质量/覆盖、来源与版本差异；VT04坏行/中断，VT05真实源/限流。

测试映射：T04～09、T40～44、T47；验证原价/复权分离、PIT、导入幂等、日历/单位和半成品不发布。

自动检查与人工验收分别记录；使用阶段文件第7节待办及第8节手册交付，必须包含正常/拒绝/恢复、实际命令/URL与证据。共同测试见[总体测试](../../docs/prd/90-test-plan.md)及[三版规则](../../docs/prd/05-three-version-delivery.md)。

## 9. S0冻结与变更检查

- [ ] 本服务实体/端口/所有权与上下游一致，API/事件Schema和错误码已生成。
- [ ] 逻辑表落为实际迁移，唯一约束、并发锁、事务与修订/保留政策已明确。
- [ ] 场景参数/Clock/资源限制/健康探针和运行权限已配置，未知配置保持UNSET。
- [ ] Web、代码测试、故障恢复和人工手册引用同一规则/场景版本。
- [ ] 变更同步PRD/契约/阶段计划/追踪/测试与验收，实测后更新架构证据，不提前勾选。

受限CSV工程补充（2026-09-25）：现有实现还包含独立于初始FastAPI设计的Node HTTP/PostgreSQL分钟Fixture与CSV切片。平台V2.2路径`POST /api/v1/acceptance/v2/v2.2/csv/preview`和`/csv/import`要求本地用户会话；调用市场数据服务的`POST /v2/minute/csv/preview`和`/csv/import`，内容上限700 KB、最多10,000行，限定CN_A/1m/RAW、Asia/Shanghai/BAR_START、SHARES/CNY，显式列映射。版本身份绑定原文哈希、规范映射、固定语义及来源/许可元数据；旧记录迁移为来源未知且`researchUseAllowed=false`。`OPERATOR_CONFIRMED`只是操作者声明，不构成系统法律审查。请求体传输层现按UTF-8字节实施1,000,000字节上限，并对超限返回413；具体证据见[P6 body-limit审计](../../evidence/audits/2026-09-25-p6-http-body-limit.md)。这个单请求小文件路径仍经JSON传递、上限700 KB；与之独立的分块上传路径支持断点续传并流式读取Finalize输入，但尚无有界批次落库/Parquet/日期分区；HTTP/PG重启验证另见[P6 CSV审计](../../evidence/audits/2026-09-25-p6-csv-minute-import.md)。

可续传上传Finalize补充（2026-09-25）：V2.2有owner-scoped 64 MiB/100,000行CSV上传协议，每块512 KiB持久化并可服务重启续传。Finalize逐块校验SHA并流入fatal UTF-8解码器、增量整文件SHA和有状态CSV解析器，不组装整文件Buffer或源行矩阵。接受Bar以最多1,000条批次写到事务临时表，完整Hash和质量检查通过后原子发布；失败回滚且释放FINALIZING。重复键索引和错误详情仍受100,000行上限约束保存在内存，临时表仍占数据库存储，因此不等同容量验收。Parquet、日期物理分区和更大规模资源界限实测仍缺。双进程重启HTTP烟测验证16,000行/848,055字节及精确落库行数通过；详见[P6流式Finalize审计](../../evidence/audits/2026-09-25-p6-streaming-csv-finalize.md)。

平台服务身份增量（2026-09-27）：Market Data 的Fixture导入、`/v2/minute/csv/{preview,import}`、CSV/Parquet分块上传与状态、持久导入详情和Bar分页读取路由要求`STOCKQUANT_SERVICE_TOKEN_PLATFORM_API`。Bearer Token确定身份，`x-stockquant-service-id`可省略、若提供必须匹配；重型导入路由在背压闸门前验证。平台API只在本地用户会话验证后转发，导入详情/页要求会话；隔离smoke验证匿名401、登录用户200和异主403。写上传路径另将owner范围传给Market Data。日历及容器级`/live`、`/ready`仍供内网/编排探针读取；采集运维详情读取已有独立Bearer门禁，见[P7.2采集读取身份审计](../../evidence/audits/2026-09-27-p7-2-market-data-collection-read-identity.md)。分钟导入边界见[分钟导入审计](../../evidence/audits/2026-09-27-p6-minute-import-boundary.md)。

V2.1调用身份补充（2026-09-27）：同一平台Bearer也保护共享Watchlist、来源目录、采样设置与其读写、实时行情预览、实时新闻、来源主动Smoke/熔断切换；Platform API相应代理先验证本地session。交易日历及容器级`/live`、`/ready`仍可内网直读；运维控制面使用各自控制凭据。采集订阅/运行/缺口和来源健康等详细读取现另有Bearer门禁，见[P7.2采集读取身份审计](../../evidence/audits/2026-09-27-p7-2-market-data-collection-read-identity.md)。认证loopback smoke、Platform controller identity单测及V2.1完整code suite通过；容量探针未运行（会主动请求外部实时行情并暂时修改共享Watchlist），活动Compose未部署，人工阶段验收未签收。

V2.1 Market Data Platform契约增量（2026-10-01）：来源目录、采样配置读写、Watchlist读写、静态新闻预览、来源Smoke、live quote/news及确定性Circuit fail/recover现由11个ServiceBearer OpenAPI操作和生成客户端代理，响应与写请求有独立Schema。来源目录只返回配置元数据，news preview是固定预览；Smoke及live quote/news可触发Provider请求，此次只用mock验证请求边界，没有触发Provider。写操作及Circuit改变服务状态，此次同样仅在mock客户端测试；活动Compose未部署。

采集控制身份补充（2026-09-27）：持久化的`POST /v2/minute/gaps`现要求`STOCKQUANT_COLLECTION_CONTROL_TOKEN`，避免任意内网调用者伪造/关闭订阅缺口；采集coverage工具只在显式`--record-gaps`时读取该控制令牌并写入。隔离HTTP smoke验证未授权401、正确控制令牌抵达数据库边界503；完整V2.1与V2.2 code suites、8项coverage规则单测通过。该令牌属于运维控制身份，和Platform API业务Bearer分离。

P7.2采集运维读取身份补齐（2026-09-27）：采集调度状态/计划、订阅列表/详情、运行状态、缺口、回填任务、来源健康等内部GET现要求平台API独立Bearer；DC-08A Platform代理同时核验本地session。宿主健康/激活/状态命令从环境或忽略的`.env.local`读取同一平台服务令牌，写操作仍另需控制令牌。临时随机端口HTTP smoke验证9类读取匿名401、Bearer到达路由、声明错身份401；日历和`/live`、`/ready`保持独立开放。Market Data 62项、Platform 54项及运维96项测试、build和隔离HTTP smoke通过。活动Compose未更新，以免中断持续采集；运行态部署及其余内部只读路由分类仍未完成。详见[P7.2采集读取身份审计](../../evidence/audits/2026-09-27-p7-2-market-data-collection-read-identity.md)。

V2.2读取/API计算边界补充（2026-09-27）：`GET /v2/minute/preview`固定Fixture、`POST /v2/minute/quality`和`/v2/minute/coverage`也要求同一平台Bearer，避免Fixture内容直出及匿名消耗解析/覆盖资源；V2.2 Platform scenarios/preview先校验本地Session，preview代理携带Bearer。扩展认证HTTP smoke与Platform Session代理单测通过；完整V2.2 code suite通过。活动容器未部署新源码。

V1.2 Fixture预览契约增量（2026-10-01）：冻结日线正常及未来数据预览由ServiceBearer OpenAPI操作`getV12NormalFixturePreview`、`getV12FutureFixturePreview`描述，响应共用`v12-fixture-preview-v1` schema。Platform预览路由和V1.2 TestRun读取均经生成Market Data客户端；此路径只读仓库固定Fixture，不触发外部来源。完整V1.2 code suite在受控loopback权限下通过，活动服务未部署。

DC-08A Platform只读预览契约增量（2026-10-01）：持久采集计划与订阅缺口读取由`getCollectionScheduleForPlatform`、`getMinuteGapsForPlatform`两个ServiceBearer OpenAPI operation及canonical response schemas约束，并通过生成Market Data client消费。Platform DC-08A页面仍只读；Health的`/ready`保持基础探针读取。未启用/停用订阅、未触发采集、未请求数据源或访问活动账本。单测和静态合同通过，活动服务未部署。

P6每日分区增量（2026-09-26）：受限CSV/Parquet的新发布版本写入按`bar_start` Asia/Shanghai自然日RANGE分区的`market_data_minute_import_bars_by_day`，小范围分页可通过半开起止时间触发PostgreSQL partition pruning。原`market_data_minute_import_rows`仍只读作历史兼容表，不在服务启动时自动迁移/删除；显式preview/apply CLI分批搬迁并保留旧表，操作范围由独立连接变量、目标库拒绝规则及`--apply`门槛限制。专用PG验证分区和EXPLAIN、旧数据过渡读取及CLI幂等回填通过。仍需数据库所有者安排旧数据迁移、容量/备份验证；本地未连接活动库。见[P6每日分区审计](../../evidence/audits/2026-09-26-p6-daily-partition-storage.md)。

2026-10-01跨服务契约增量：Market Data分钟CSV import/preview、不可变import详情与Bar分页，以及CSV/Parquet分块upload create/chunk/progress/action新增8个OpenAPI operation，要求Platform服务Bearer和owner范围；Platform API使用对应生成客户端。Create/chunk/progress复用canonical upload schemas，动作结果按异构对象处理。此为既有端点的契约发布，不改变CSV语义、存储或来源授权。Platform client单测/typecheck与OpenAPI漂移校验通过；隔离Platform+Market Data+PostgreSQL/Chromium联验已通过，含owner隔离与取消；没有活动服务部署。证据：[W1 Market Data分钟import客户端审计](../../evidence/audits/2026-10-01-w1-market-data-minute-import-client.md)。

2026-10-01 V2.2 Fixture/owner进度API客户端增量：固定分钟Fixture preview/import及uploaded-csv owner-scoped progress读由Platform生成客户端承载，422 Fixture拒绝仍作为业务结果返回。上传进度客户端迁移后完整V2.2 code suite退出0；隔离Platform/Market Data/PostgreSQL/Chromium验证匿名401、六行预览、正常PUBLISHED、重复幂等、坏Fixture零接收REJECTED、owner边界和同Run CLI只读检查。证据与清理范围见[Fixture客户端审计](../../evidence/audits/2026-10-01-w1-v22-minute-fixture-client.md)。未使用真实数据，活动容器未触碰。

Artifact task 持久状态切片（2026-10-06，历史快照）：`market_data_artifact_tasks`和Bearer创建/查询/取消路由当时只有状态记录；当时未执行Artifact写入或状态关联。历史验证见[状态持久化审计](../../evidence/audits/2026-10-06-w1-v12-artifact-task-persistence.md)。

Artifact task 原子发布与恢复（2026-10-06）：状态为`QUEUED/RUNNING/COMPLETED/FAILED/CANCELLED`。worker用数据库租约认领任务并递增fence；过期lease可被接管。`publishTask`对任务行加锁，Artifact BYTEA/SHA与COMPLETED状态在同一事务提交；同一task只允许字节完全相同的幂等发布，冲突内容拒绝。`cancelTask`与发布对同一行串行化，确保取消结果无Artifact，完成结果有完整Artifact；迟到旧worker被fence拒绝。当前只执行冻结Fixture `v1.2-market-data-1`，产物落在Market Data PostgreSQL，单元/PG并发和HTTP跨进程重启测试覆盖上述性质。详细设计和限制见[原子发布审计](../../evidence/audits/2026-10-06-w1-v12-artifact-task-atomic-publication.md)。

P6容量边界（2026-09-26）：每日分区存储层直接仓储流smoke已覆盖100,000行和合成的1,440,000行/60日/500证券档，分别实测2.467秒和39.224秒；高档数据库增量899,104,768 bytes、Node峰值RSS 213,264 KiB，随机本地PostgreSQL库结束后确认删除。结果不包括Parquet/CSV解析或HTTP上传，不证明容器峰值、并发、Ubuntu、保留清理或恢复。详见[P6容量证据](../../evidence/audits/2026-09-26-p6-minute-capacity-smokes.md)。

P6冻结归档导入（2026-09-26）：CSV/Parquet入口现按声明支持CN_A `1m`/`5m`频率、`BAR_START`/`BAR_END`语义。5m路径解析BaoStock紧凑上海时间和交易所前缀证券码，并按BAR_END将时间戳转换为start/end。真实本地HTTP smoke逐个导入冻结BaoStock 500文件×2880行：每文件SHA与只读Manifest匹配、总行数1,440,000、500导入版本、60日分区，随机测试数据库导入后删除。未知来源许可持续标UNCONFIRMED，不能用于研究。该验证直连Market Data小文件HTTP入口，尚无平台API/Web/TestRun联验、分块传输规模、并发、Ubuntu和恢复证据。详见[P6冻结归档导入审计](../../evidence/audits/2026-09-26-p6-baostock-archive-import.md)。

P6重型导入并发闸门（2026-09-26）：带PostgreSQL的Market Data实例对内存密集型CSV/Parquet预览、导入与Finalize使用固定session advisory lock；锁连接固定持有至HTTP响应排空，后续竞争实例快速返回429与`Retry-After: 1`。无法取得数据库协调锁时fail-closed返回503；无数据库的内存模式保留单进程闸门。双独立服务进程/随机PG烟测通过正常释放、忙拒绝和客户端断开释放。此验证覆盖共享PostgreSQL实例间互斥，不代表多主机断网/故障切换、DB池容量或生产Ubuntu负载；详情见[P6解析器及闸门审计](../../evidence/audits/2026-09-26-p6-minute-parser-memory.md)。

Docker Desktop ARM64复验（2026-09-26）：当前源码Market Data镜像`sha256:8009ad45542e67438d9cdbf19ba1d847b01d4b35d0875b1191a27cfd42a193c9`在两只独立Linux/arm64容器（每只2 GiB/2 CPU/128 PIDs）中复现上述锁竞争与释放，随机测试库建于现有PostgreSQL服务器，验证后删除。测试关闭容器采集调度与执行器；没有重启/修改活动Market Data容器。容器网络同接开发栈网络以访问PG，测试代码未向行情、模型或券商发出请求。该结果不等同Ubuntu原生运行、资源容量或生产压力验证。

2026-10-01 DC-06项目数据交付跨服务边界：Platform通过`market-data-project-delivery.v1`生成客户端调用项目分页与脱敏导出，使用`x-stockquant-project-id`和项目独立`x-stockquant-project-token`；服务端从可信配置解析该Token的项目/Scope，不接受调用方自报`x-stockquant-scopes`。缺Token返回401，已认证项目/Scope不匹配返回403。随机隔离项目的真实HTTP+PostgreSQL smoke验证分页/导出、SHA-256、脱敏及401/403并精确清理。生成契约和当前Dist构建在`pnpm test:integration:market-data`入口检查；未启用真实数据源或活动项目凭据。审计：[DC-06客户端与HTTP验证](../../evidence/audits/2026-10-01-w1-market-data-project-client.md)。


2026-10-01分层实现增量（未完成S0验收）：PostgreSQL collection/schedule/coverage/artifact/project-access/alert-outbox/minute-import/minute-upload实现及advisory single-flight现位于`src/adapters/`，repository/gate接口位于`src/ports/`，业务类型与错误位于`src/domain/`，服务器组合根位于`src/bootstrap/`。分层检查、类型检查、63项单测、23项隔离PG集成、分区回填smoke、V2.2完整code suite与baseline均通过。迁移记录见[审计](../../evidence/audits/2026-10-01-w1-market-data-layer-boundary-increment.md)；本文S0/人工验收仍继续保持未勾选。

外部来源调用运行时门禁（2026-10-01，2026-10-03补充）：quote、news、minute collection各自要求精确的`true`用途开关、授权引用、数据版本和允许的source ID。`/v2/quote/preview`、`/v2/news/live`及`/v2/sources/smoke`在请求Provider前先检查门禁；未授权返回403并记录`externalRequests: 0`。Scheduler与collection executor均只有在minute collection授权对全部配置source ID通过时才创建，避免未授权时产生不可执行的采集run；`/ready`显示`NOT_AUTHORIZED`，激活/晋级工具在请求服务或运行Compose之前返回配置等待。服务身份凭据并不授权外部来源。无来源授权配置下隔离HTTP smoke通过；未触碰活动服务，未请求外部来源；`NO_TRADE`仍有效。相关修复见[W3审计](../../evidence/audits/2026-10-03-w3-scheduler-authorization-gate.md)、[机器结果](../../evidence/audits/2026-10-03-w3-scheduler-authorization-gate.json)及[源码/执行SHA-256](../../evidence/audits/2026-10-03-w3-scheduler-authorization-gate.sha256)。

采集适配器边界复核增补（2026-10-01）：同一分钟来源用途校验现也位于`market-data-adapter` Python CLI，早于BaoStock/Sina/Eastmoney/TDX client construction，避免绕过Node执行器直达外部网络。无授权与未列入allowlist的测试通过；Python provider suite 33/33、完整V2.4 code suite重跑退出0。此前仅HTTP executor门禁的记录由此补足。

来源探针覆盖补充（2026-10-01）：授权门禁现覆盖四个独立脚本入口：Sina/BaoStock能力探针、BaoStock稳定性探针、TDX适配器能力探针和TDX lunch原始协议诊断。无授权时均先返回`BLOCKED`，不打开Provider会话、不发HTTP/TCP，也不创建边界证据文件。隔离回归67/67，最新完整V2.4 code suite与baseline通过；完整来源路径和限制见[W3审计](../../evidence/audits/2026-10-01-w3-market-source-runtime-gate.md)。

2026-10-02边界维护：V2.1 Tencent行情预览、新闻页面读取和来源Smoke的外发HTTP传输现封装于`adapters/PublicSourceHttpAdapter`，bootstrap保留逐用途来源授权门禁并只在授权后调用该adapter。通过注入fetch/clock的单测覆盖请求头、有限超时、来源错误STALE结果和稳定新闻ID；没有实际Provider请求。源许可仍未确认，相关真实来源能力和V2.1验收保持NOT_RUN。

2026-10-17 V2.1 C1在线池增量：Market Data拥有owner/account/TestRun范围的在线池快照，使用`market_data_watchlists` PostgreSQL表保存必需持仓、在途订单、候选、最终有序集合及省略候选。schema迁移v2兼容v1；更新以scope advisory lock序列化，namespace冲突拒绝且保留原配置。Platform在写入前负责从Portfolio/Trade读取并校验领域事实；Market Data只负责确定性排序、100只门限和持久化，不接受浏览器伪造的事实。隔离迁移、作用域与恢复证据见[2026-10-17 C1证据](../../evidence/audits/2026-10-17-v21-c1-watchlist.md)。该配置尚不构成真实来源授权或行情采集证据。

2026-10-18 V2.1 C2增量：`market_data_sampling_settings` schema v3持久化20/30分钟配置；schema v5保存任务、schema v6增加合成Fixture结果与观测。普通Run Clock tick按配置和版本化2026日历判断并以settingsVersion+UTC Instant幂等记录；授权NONE时状态为`BLOCKED_SOURCE_AUTHORIZATION`，不触发Provider。独立的`tick-fixture`端点核对Manifest/文件SHA后，将两条合成观测作为`COMPLETED_FIXTURE`持久化；PG/服务进程重启均可恢复。行情预览按配置标记age/freshness；监控、收盘日线、策略和执行的独立调度当前如实报告`NOT_CONFIGURED`。新闻标题聚合仍保留源状态、未知发布时间与实体歧义。schema v4稳定sourceItemId账本由冻结Fixture导入API写入，并可经Platform/Web读取历史；`v2.1-news-revisions-1`覆盖修订、时间语义和实体状态且重放幂等。实时首页title适配器无稳定sourceItemId和文章URL，仍不能写入修订账本，实时新闻标`UNVERIFIED_NO_STABLE_SOURCE_ID`。schema v1–v6迁移、HTTP重启、Fixture采样与C2 Web E2E均通过；D1真实源、实际采集、独立调度和人工验收仍未完成。证据：[C2 Fixture采样增量审计](../../evidence/audits/2026-10-18-v21-c2-fixture-sampling.md)。

告警事件生命周期与运维UI增量（2026-10-03）：PostgreSQL adapter以部分唯一索引保证每个`alertKey`最多一个`OPEN/ACKNOWLEDGED`事件；重复异常更新`last_seen_at`与载荷，`GET /v2/alerts`列出活动事件，`POST /v2/alerts/{incidentId}/acknowledge`记录首次确认人且幂等。采集完成回调关闭对应订阅/窗口事件，后续再次失败生成新事件；OPEN/RESOLVED通知事件与Incident状态在同一PostgreSQL事务提交并进入本地outbox。Platform通过登录会话代理读取/确认，Web `/paper`展示告警并提供显式确认。除Mock页面回归外，V2.4隔离HTTP/Chromium Harness现启动临时Market Data PostgreSQL/服务及Platform/Web，浏览器对真实Market Data incident执行读取/确认，并校验数据库持久状态和确认人来自登录Cookie；采集执行器/调度器关闭、行情请求0、活动服务未触碰，详见[W3告警浏览器集成审计](../../evidence/audits/2026-10-03-v24-paper-smoke-alert-integration-bd05a5f4f8464a03aeccc172bc3f1ead.json)及[SHA-256](../../evidence/audits/2026-10-03-w3-alert-browser-integration.sha256)。尚无通知dispatcher、真实外发或完整交易日终对账接线；来源授权为NONE时采集执行器继续关闭。本切片不代表W3完成。隔离生命周期行为见[W3告警生命周期审计](../../evidence/audits/2026-10-03-w3-alert-incident-lifecycle.md)。


2026-10-09 V1数据库迁移增量：Market Data八组PostgreSQL schema现由`market_data_schema_migrations`服务专属ledger统一登记，既有initializer在同一事务内执行并由transaction advisory lock串行化；拒绝未知较新版本。隔离PostgreSQL先以旧版无ledger方式建表并插入采集run，再执行并发baseline纳管，记录保留；双进程、重复启动、未知版本拒绝均通过。28项Market Data集成和Project Delivery HTTP/PG smoke通过，见[迁移测试](../../evidence/audits/2026-10-09-v12-market-data-migration-a03.log)及[完整集成](../../evidence/audits/2026-10-09-v12-market-data-migration-integration-a02.log)。没有活动库升级、降级脚本或部署前独立迁移CLI。

V2.1 C2-B Provider增量（2026-10-19）：新增应用层快照采样Provider端口和Tencent Adapter，Fixture继续由同一后台Worker执行；Worker对REAL任务在领取后按`sourceId`复核QUOTE授权，并要求独立`STOCKQUANT_SNAPSHOT_REAL_PROVIDER_ENABLED=true`才允许调用。结果批次需完整覆盖任务证券、不得重复/串源，价格必须为正数；源时间未知保留UNKNOWN，错误进入有界重试/失败记录。schema v14支持`COMPLETED_REAL`及带来源/时间/新鲜度的观测持久化，幂等提交拒绝换源冲突。当前运行开关未设置且OD-008为NONE；验证使用Stub与合成输入，未调用真实Provider，也未验证真实报价能力/许可。证据见[2026-10-19 C2-B采样Provider审计](../../evidence/audits/2026-10-19-v21-c2-provider-port.md)。

2026-10-19 V2.1 Sina快照候选增量：新增GB18030兼容解码、`hq_str_{exchange}{code}`字段解析和共享采样Provider实现，固定响应覆盖CN证券代码、正价格、严格北京时间时间戳、畸形/不完整结果；Worker仅在精确QUOTE来源授权及独立REAL运行开关均开启后派发。OD-008仍OPEN且授权NONE，两个开关均未启用；未访问Sina端点。该实现仅证明本地解析/端口行为，不证明端点可用性、响应稳定性、许可、限流或持久采集资格。见[V2.1 Sina候选审计](../../evidence/audits/2026-10-19-v21-c2-sina-adapter.md)。

2026-10-19 V2.1 C2-C增量：新增独立合成`DAILY_BAR` Fixture（`v2.1-daily-bars-1`）与收盘完成门禁；source与快照分离、source/data版本、收盘和availableAt顺序、完整覆盖、session、OHLCV均校验，REAL授权状态单独传入且未授权阻断。完成身份按scope/source/version/session/规范化内容生成稳定Hash。schema v15保存结果，v16新增`market_data_daily_bar_completion_jobs`持久队列；固定Fixture POST只入队并立即返回QUEUED，后台Worker领取任务后重新读取及校验冻结Manifest/内容，通过租约、到期接管、有限重试后在同一事务写结果并完成任务。latest GET返回任务和结果，Platform以已认证owner及Bearer身份代理，Web展示状态/尝试次数/结果。隔离PG与真实HTTP服务重启验证幂等、租约接管、延迟及上限重试、结果读回和owner/TestRun隔离，`externalRequests=0`。Monitor质量结果持久化/API消费、REAL日线来源及完整C2-C验收仍未完成。详见[质量与日线领域审计](../../evidence/audits/2026-10-19-v21-c2-quality-dailybar-domain.md)及[日线持久Worker审计](../../evidence/audits/2026-10-19-v21-c2-dailybar-persistence.md)。


## V2.1 scoped DAILY_BAR close scheduler

Market Data schema v18 stores opt-in close schedules keyed by market/owner/account/namespace/TestRun. The policy defaults disabled; Web registration requires an existing matching scoped online watchlist. A run-scoped Clock and the versioned Asia/Shanghai calendar gate scheduling to known trading sessions after 15:00. The scheduler enqueues the independent DAILY_BAR Fixture through the durable queue; task identity and last-triggered session make duplicate polls and restart retries idempotent. The currently frozen Fixture covers only 2026-10-16. Other dates return `NO_FIXTURE_FOR_SESSION`; this local slice does not fabricate bars or imply a real daily source. Strategy and order consumers remain separate, disabled and unimplemented.


## V2.1 C2 current completion boundary (2026-10-21)

Schema v19 adds durable snapshot registrations keyed by full scope/source and independent REAL daily-bar jobs with source_request_json. Fixture version/hash are nullable only for validated REAL source requests; the exclusive-input check prevents mixed provenance. Workers accept either a verified immutable Fixture or the registered current-session DAILY_BAR provider, preserving leases, bounded retries, scope and idempotency. A reclaimed final-attempt sampling job without a committed result becomes FAILED; one with a committed result may finish without another provider call.

Snapshot timer scheduling uses an injected Clock, 20/30-minute calendar decisions and explicitly registered scoped watchlists. Monitor evaluation consumes transactional quote-available Outbox facts under its own identity. Daily completion independently reads eastmoney-daily RAW daily klines for the current known session after close; integer lots are converted to shares, exact coverage/OHLCV/session/availability are validated, and no snapshot becomes a daily/minute bar. All REAL execution/timer switches default off. Strategy/order executors remain C5/OD-007.

News source inventory/circuit/adapter IDs consistently use eastmoney-news and cls-news. Registered same-origin article paths, verification-page rejection and per-source errors apply before revision persistence; process-local caching is not a global durable rate limiter. Unknown publication time stays null/UNKNOWN. Bounded actual-source evidence, deterministic HTTP replacements and actual process faults are separately labelled in the [C2 audit](../../evidence/audits/2026-10-21-v21-c2-closeout.md); engineering readiness does not sign human acceptance.

## V2.2 minute/daily aggregate comparison (2026-10-23)

2026-10-27 C5 input increment: `GET /v2/daily-bars/completions/sessions` is restricted to the Platform service identity and reads exactly two explicitly named sessions for one complete owner/account/namespace/TestRun scope, source, data version and mode, as of a supplied run clock. It returns null when either session is unavailable and rejects ambiguous available completions. It does not infer a calendar, activate a source or create a target; see [audit](../../evidence/audits/2026-10-27-v24-c5-daily-session-read.md).

Market Data exposes `POST /v2/minute/imports/{version}/daily-aggregate-check` behind the platform service identity. It reads one security and one Shanghai trading date from the immutable RAW minute version, with a 500-Bar bound, and calculates open/maximum high/minimum low/final close/volume sum/amount sum. The caller supplies all six daily reference values plus a source name and source reference; the response retains DataVersion and import SHA-256 and labels the reference as not independently verified. This endpoint compares values only. It does not determine whether the minute window is complete; callers must use the independent coverage report. Invalid date, wrong import frequency/adjustment, duplicate or out-of-scope bars and invalid OHLC values fail closed. A real isolated PostgreSQL + Platform + Market Data + Chromium smoke passed on synthetic input; this is software evidence, not source-fact validation.


## V2.2 MinuteBar applicability and limit references (2026-10-23)

The canonical `MinuteBar` contract carries `tradingStatus` and `tradingStatusReference`, plus a `limitPriceReference` object with status, upper/lower prices, MarketRuleSet version and source reference. Missing facts are represented as `UNKNOWN` with null values/references. `TRADING`/`SUSPENDED` requires a non-empty citation; `AVAILABLE` limit prices require both bounds, a rule-set version and a source citation; `NOT_APPLICABLE` also requires a citation. New CSV/Parquet/Fixture rows default to unknown. Legacy PostgreSQL JSONB rows are normalized when paged, without rewriting stored records. Quality validation enforces cited statuses and available bounds; absence of references does not imply a pass against real market limits.

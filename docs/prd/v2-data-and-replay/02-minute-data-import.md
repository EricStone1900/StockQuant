# V2.2 历史分钟数据导入与校验

状态：PASS（2026-10-24批准的本地学习范围）。

2026-10-24最新范围决定：项目所有者批准[C3本地学习范围收口](../../decisions/2026-10-24-v22-c3-local-learning-closeout-scope.md)。C3/V2.2为**PASS（仅批准的本地学习范围）**，包括本地分钟导入、查询、版本比较、质量报告、恢复和已执行的受限FakeBroker回放。完整历史事实补证延期，缺项保持UNKNOWN/null；C4真实研究输入条件另行核对。以下较早日期记录保留历史，不作为当前待办。

历史状态：PARTIALLY_IMPLEMENTED（2026-10-21追加不可变、用户登记的历史上下文版本目录；服务端核验SHA-256、导入整体有效期、逐证券历史覆盖和MarketRuleSet内容，V2.3导入回放入口在预检失败时于创建TestRun/Worker前硬阻断。缺少当前来源可用于`HISTORICAL_RESEARCH`的独立配置时仍阻断；尚未登记基于实际来源证据的版本或验证允许来源下的正向回放。2026-10-21已将无逐Bar事实的缺口标为UNKNOWN、有证据的交易时段缺Bar标为MISSING、明确停牌标为SUSPENDED，并复验CSV进程重启续传与Parquet PostgreSQL重启续传。项目所有者已于2026-10-23通过当前候选的本地合成/Fixture软件闭环人工验收；这不替代来源状态权威性、外部许可或正向历史研究回放门禁）。历史基线见[2026-10-21 C3复核](../../../evidence/audits/2026-10-21-v22-c3-closeout.md)，当前候选及签署见[统一复验审计](../../../evidence/audits/2026-10-23-v22-c3-current-candidate-combined.md)、[人工验收记录](../../../evidence/audits/2026-10-23-v22-c3-current-candidate-human-acceptance.json)，上下文/缺口增量见[历史上下文与回放门禁审计](../../../evidence/audits/2026-10-21-v22-c3-history-context-gate.md)及[缺口分类/恢复复验审计](../../../evidence/audits/2026-10-21-v22-c3-gap-recovery.md)。

2026-10-22前置复核（已由后续补证更新）：本地3证券×5交易日720根分钟Bar的文件Hash、行数和预期时段通过；15/15个证券日的分钟量额聚合与日线归档不一致，600000.SH在2024-01-04另有最高价差0.01元。当时没有额外上下文材料，跨频差异尚未复核。后续获批同Provider查询证实新旧分钟与日线分别精确相同，跨频差异可复现，现按来源限制保留而非待修复本地错误。当前上下文边界见[补证报告](../../../evidence/audits/2026-10-22-v22-historical-source-probe.md)与[样本期规则映射](../../../evidence/audits/2026-10-22-v22-historical-context-mapping.md)。

2026-10-22补证后更新：所有者已批准单次三证券/五日最多20次RPC，实际18次数据+2会话均成功，预算已用尽。新取回的15行日线和720行分钟OHLCV/金额与旧档精确相同，跨频差异可在当前Provider复现；不修写原数据或继续反复重取。已取得上市基本资料、RAW标识、日级交易/ST状态及分红/因子端点响应，但尚非全市场PIT、完整公司行动或逐分钟停牌事实。样本期常规5分钟窗口已按上交所2023规则部分映射，仅支持Bar覆盖分析；完整撮合规则、个股分钟停牌及全类型公司行动仍未证实。跨频差异按Provider可复现限制保留。历史上下文READY仅代表Hash/日期/证券覆盖等结构检查通过，来源事实为所有者声明、未被系统独立核验；Web标题与API assurance字段已明确该边界。HISTORICAL_RESEARCH仍关闭，真实正向回放及本候选人工验收仍NOT_RUN。具体报告、Hash和30日本地留存边界见[来源补证记录](../../../evidence/audits/2026-10-22-v22-historical-source-probe.md)。

2026-10-24更新：所有者批准[一次性受限本地用途决定](../../../evidence/audits/2026-10-24-v22-c3-historical-research-decision.json)后，复用该归档而未请求任何Provider。隔离 Web→Platform→Market Data→Historical Replay Worker→Portfolio/Trade/Governance/Quant→FakeBroker 链成功导入720根Bar，预检`READY`，回放600000.SH前120根Bar；TestRun `fb9d5de2-fb60-48fd-a9d2-7d73d0bd9417`为`COMPLETED`且导出Manifest为`f8039b802ac45e38d0e9f5dcece4ee250c8f0209a98991dabf80e22267f15c5d`。完整记录见[受限回放复核](../../../evidence/audits/2026-10-24-v22-c3-bounded-local-replay.md)。这只关闭一次性用途和正向回放门禁；逐Bar事实仍为部分/未知，阶段保持`PARTIALLY_IMPLEMENTED`。

2026-10-24历史事实整理：已将三证券上市日期、2023规则下的样本期常规交易时段、归档日级状态、5分钟Bar和分红端点响应逐项登记；它们仅支持证券有效期、覆盖和受限回放边界。逐Bar停复牌、限价适用与完整公司行动仍无权威点时记录，继续保持`UNKNOWN/null`，不从日线状态或存在Bar反推。详见[最小历史事实清单](../../../evidence/audits/2026-10-24-v22-c3-minimum-historical-fact-inventory.md)。

## 1. 前置与范围

V1数据Artifact可用，V2.1来源及用途标签规则已冻结。

本阶段所有订单、券商资产和成交均来自隔离模拟环境。真实业务数据库、Qlib或RD-Agent在声明“已验证”时必须真正执行；替身需独立标注。

## 2. 开发任务

2026-10-01架构维护增量：Market Data已将PostgreSQL访问与导入持久化放入`adapters/`、业务形状/错误放入`domain/`、用例依赖放入`ports/`，服务入口组装移至`bootstrap/`；分层规则纳入`baseline:check`。本增量为结构维护，不替代本阶段人工验收，也不改变以下业务交付状态。证据：[Market Data分层审计](../../../evidence/audits/2026-10-01-w1-market-data-layer-boundary-increment.md)。

- [x] 定义MinuteBar与生成合同：securityId/market/frequency/barStart/barEnd/availableAt、时区、RAW OHLCV/amount、单位、来源/版本、逐Bar适用状态及涨跌停价引用；CSV缺少事实时状态为`UNKNOWN`且引用/价格为空，`TRADING`/`SUSPENDED`必须有来源引用，限价`AVAILABLE`必须同时有上下限、MarketRuleSet版本和来源引用；旧JSONB记录读取时规范化为未知值，不补造事实。`barStart`/`barEnd`为规范时间区间，原始字段代表开端/结束记录在导入Manifest。合同和增量证据见[2026-10-23 C3审计](../../../evidence/audits/2026-10-23-v22-c3-checklist-review.md)。
- [x] 支持用户CSV/Parquet文件字段映射、导入预览、错误行、分区存储和断点续传/续导；同输入幂等，修订发布新版本。工程与自动证据见[2026-10-21 C3复核](../../../evidence/audits/2026-10-21-v22-c3-closeout.md)及[缺口分类/恢复复验](../../../evidence/audits/2026-10-21-v22-c3-gap-recovery.md)；不代表当前候选人工验收。
- [x] 检测重复冲突、OHLC及可引用涨跌停范围、量额单位、午休/非交易时段、缺分钟、日线参考聚合差异；数据缺失与停牌严格分开。限价或状态缺证时只报告未知，不假定价格边界或停牌事实。分钟/日线参考由操作者提供且未独立核验；详细边界见[清单复核](../../../evidence/audits/2026-10-23-v22-c3-checklist-review.md)。
- [x] 按证券/日期分区读取、流式处理，避免全部分钟数据装入内存；构建小样本与可重复坏数据包。自动证据范围及容量限制见[清单复核](../../../evidence/audits/2026-10-23-v22-c3-checklist-review.md)。
- [x] 历史股票池/上市退市/公司行动及MarketRuleSet有效期与分钟数据关联；缺少必要证据标限制用途或阻塞相应回放。此勾选仅代表结构门禁及受限/阻断行为，实际历史事实验证仍NOT_RUN；详见[历史上下文与回放门禁审计](../../../evidence/audits/2026-10-21-v22-c3-history-context-gate.md)和[清单复核](../../../evidence/audits/2026-10-23-v22-c3-checklist-review.md)。

2026-10-21历史上下文/回放门禁实现增量：Market Data新增不可变的`historical_context_versions`记录与平台认证登记入口，内容Hash由Platform计算；成员和公司行动覆盖按证券及各自有效区间登记，规则记录保存市场与交易时段。导入版本回放预检重新解析三类引用，核对Hash、整体覆盖范围、逐证券覆盖、发布状态和`researchUseAllowed`；另检查精确来源ID是否具备独立`HISTORICAL_RESEARCH`运行时授权。V2.3正式验收页提供版本登记与导入回放入口；仅对`600000.SH`最多120根Bar执行有界验证。隔离PostgreSQL验证有效记录可READY、冲突改写拒绝；真实Platform→Market Data→PostgreSQL→Web smoke验证缺少上下文/用途时返回422 `HISTORICAL_CONTEXT_BLOCKED`，未启动Worker。这个门禁不替代官方事实核对或来源许可；当前默认历史研究授权关闭，正向回放和实际来源记录未运行。详见[本次审计](../../../evidence/audits/2026-10-21-v22-c3-history-context-gate.md)。

2026-10-21缺口分类与恢复复验：分钟覆盖报告为每个预期Bar输出`PRESENT`、`UNKNOWN`、`MISSING`或`SUSPENDED`。没有逐Bar状态证据的空档只计入`unknownBars`，不伪报停牌也不生成补数任务；明确`TRADING`状态且带来源引用时才计`missingBars`并进入缺口表，明确`SUSPENDED`单独计数且不生成补数任务。Gap请求强制MISSING带证据引用并持久化该引用。离线`data-coverage`入口因只持有交易日历和Bar行，将所有空档按UNKNOWN处理，不自动创建MISSING记录。Market Data 29个单测文件/142项测试和离线覆盖12项测试通过。隔离真实HTTP/PG CSV smoke在服务进程重启后恢复分块、完成16,000行导入并检查错误解析回滚；Linux ARM64临时PostgreSQL容器重启 smoke 保留Parquet分块，最终续传并发布100,000行，第二次服务重启后仍返回同一版本。两个 smoke 均在测试脚本中加入仅针对`MINUTE_IMPORT_BUSY`的最多30次、每次1秒重试后通过；无外部行情请求。状态证据仅校验逐Bar时间范围、状态值和引用非空，不代表系统验证了引用来源的权威性，因此真实停牌事实验收仍需可信来源记录。详情见[缺口分类/恢复复验审计](../../../evidence/audits/2026-10-21-v22-c3-gap-recovery.md)。

## 3. 同步 Web 开发

正式页：分钟文件导入向导、列映射、错误行、覆盖表、指定日期/证券分钟查询、两个DataVersion的Bar级比较和分钟聚合/日线参考值对账已接入；查询和对账由登录Session保护的Platform代理访问Market Data。日线参考值由操作者录入，需提供来源名称/引用，系统不独立核验参考事实；聚合数值一致不代表分钟覆盖完整。Mock Web交互测试、隔离PostgreSQL真实Web→Platform→Market Data查询/聚合链及当前候选CSV/Parquet重启恢复均已验证；当前候选人工验收通过。验收页：单位错、重复、午休、缺失、未来Bar样本。

验收中心路径：`/acceptance/v2/v2.2`（目标路由）。场景参数提交到后端TestRun编排接口，后端调用业务API并汇集证据。浏览器不直接写领域数据，不自行判定成交。该阶段至少提供正常、拒绝/异常场景；适用时增加重试/恢复场景。

## 4. 人工验收步骤

1. 导入3～5只、5～10日小样本，确认分钟时间戳和成交量单位与原文件一致。
2. 重复导入确认不重复发布；导入修订确认旧版本可查询。
3. 依次运行错误样本，检查逐行错误和质量报告，没有自动前填可成交价。
4. 选择日期比较分钟聚合与日线，解释差异；重启中断导入后续跑，Hash可核验。

每次保存testRunId、场景版本、代码/镜像、数据/规则版本、种子及注入事件序列、实际/预期、截图/Trace。判定依据必须是后端事实和独立检查，不能只看Toast成功提示。

## 5. 异常与替身边界

分钟OHLCV不能推断真实买卖盘口、排队或Bar内路径；缺涨跌停/状态证据的运行不得伪称全规则仿真。

## 6. 产物与验证

目标产物：MinuteBar Schema与Client、分钟导入/查询Adapter、数据分区与索引、分钟Web、fixtures/minute-bars。

自动验证：字段单位/时间边界/质量规则、真实存储导入幂等与中断恢复、分钟查询分页及Web导入E2E。

需求/测试追踪：DAT-03～06/11/12、SYS-06；T04/06/07/37；DV-04、VT04。

退出条件：开发任务完成、Web真实可操作、全部适用检查PASS、人工签署、已知限制写入证据。填写[本版验收表](./99-acceptance.md)，未完成项不得勾选通过。

持久Fixture导入补充（2026-09-25）：市场数据服务的`normal`/`bad`分钟Fixture导入从进程内Map改为PostgreSQL持久导入记录与分钟行，新增并发SHA幂等、服务进程重启后查询、带cursor/pageSize和证券过滤的分页读取；平台API增加导入元数据及分钟页查询代理。35/35服务单测、18/18专用PG集成和临时真实服务HTTP重启烟测通过，记录已精确清理。这份记录反映固定Fixture迁移切片刚完成时的状态；同日后续实现增加了下方受限CSV小文件入口。两项后续工程验证均不改变2026-09-09人工签署事实，也不扩展签署范围。详见[P6持久分钟导入审计](../../../evidence/audits/2026-09-25-p6-persistent-minute-import.md)。

2026-10-23查询页增量：正式V2.2页增加指定DataVersion/证券/日期范围查询、覆盖状态表及两个导入版本的Bar级字段比较；Platform代理验证用户Session并使用服务身份，覆盖频率须匹配DataVersion元数据，Market Data质量规则生成1m/5m预期Bar网格。版本比较验证市场、频率、复权、时区和单位语义一致。V2.2页面浏览器Mock用例1/1、Platform代理单测5/5、Market Data单测143/143、服务typecheck、`contracts:check`与`docs:check`通过。此证据未跑真实Platform→Market Data→PostgreSQL查询链；逐Bar适用状态/涨跌停价引用、当前候选重启恢复复验和人工验收仍未完成。详见[C3清单与查询页增量复核](../../../evidence/audits/2026-10-23-v22-c3-checklist-review.md)。

受限CSV实现补充（2026-09-25）：V2.2页面`/acceptance/v2/v2.2`新增小文件CSV上传、列映射、预览/逐行错误和确认导入，API为`POST /api/v1/acceptance/v2/v2.2/csv/preview`与`/csv/import`。当前仅接收CN_A、1m、RAW，强制Asia/Shanghai、BAR_START、SHARES、CNY语义，上限700 KB/10,000行；导入复用PostgreSQL持久仓储，以原始内容SHA-256实现同内容幂等，页面/API要求本地用户会话。冻结的有效/无效合成输入在`fixtures/v2/v2.2-csv-smoke/`，`pnpm fixtures:check`核对Hash。市场数据服务40项单测与临时HTTP→专用`market_data_test` PostgreSQL→进程重启→分页读取/幂等烟测通过（有效两行SHA-256 `86a4fcbb29d97f27925753c132c8d95ee1971c5f1c7583da6be2278be1c747d8`；无效文件逐行拒绝并持久保存）；平台/API与Web构建、类型检查及隔离Mock Playwright页面流程通过。CSV上传请求Schema、OpenAPI和消费者兼容规则已登记。尚未支持Parquet、分块流式大文件、断点续传、按日期物理分区、完整Web→平台API→市场服务同run场景证据；第2节任务与第7节交付清单保持未完成，原2026-09-09人工签署未被改写。见[P6 CSV小文件导入审计](../../../evidence/audits/2026-09-25-p6-csv-minute-import.md)。

固定Fixture和上传进度生成客户端增量（2026-10-01）：V2.2预览、Fixture导入及uploaded-csv owner-scoped上传进度均由Market Data minute生成客户端访问；422 bad Fixture仍映射为拒绝业务记录。owner读取接线后的完整V2.2 code suite通过；隔离Platform→Market Data→PostgreSQL/Chromium验证匿名拒绝、冻结Fixture六行预览、正常导入、重复幂等、bad Fixture拒绝、上传TestRun业务断言及同ID CLI只读核验；随机数据库已清理。真实数据、其他阶段要求及用户人工验收仍依本阶段门禁评估；详见[本次增量审计](../../../evidence/audits/2026-10-01-w1-v22-minute-fixture-client.md)。

导入身份修复（2026-09-25）：持久导入唯一键现在包含原文SHA-256、规范列映射与冻结的市场/频率/复权/时区/时间戳/单位语义；同字节不同映射得到不同DataVersion，同解释重试仍幂等。`market_data_test`完成旧主键数据回填/迁移、19/19 PostgreSQL集成和临时真实HTTP服务重启读取；不同映射分别恢复正确证券，旧原文Hash继续作为数据来源校验值。Parquet、流式/续传、配额/取消、日期分区和完整浏览器链仍未完成。详见[导入身份审计](../../../evidence/audits/2026-09-25-p6-csv-import-identity.md)。

来源与许可追踪增量（2026-09-25）：CSV上传现在要求明确来源名称、可选引用、许可声明、操作者确认状态及取得时间，并把这些字段纳入导入身份和持久版本Manifest。操作者未确认时仍可保留原始导入记录，但`researchUseAllowed=false`；确认状态只是操作者声明，不代表系统验证了许可或替代人工审查。旧导入迁移为来源未知、研究使用关闭。市场数据服务构建/41项单测、专用PostgreSQL集成20/20、三种实际HTTP导入（不同映射及相同映射不同许可声明）幂等/重启回读烟测通过；确认许可返回allowed，未知许可返回blocked。Web单项Playwright 1/1、Web类型检查及合同/Fixture基线通过。2026-09-09原人工验收未改写；Finalize流式读取已补，Parquet、有界批次处理、日期分区及完整Web→平台→业务服务同TestRun闭环仍未完成。详见[P6导入身份审计](../../../evidence/audits/2026-09-25-p6-csv-import-identity.md)。

流式Finalize增量（2026-09-25）：最大64 MiB上传会话逐个查询512 KiB PostgreSQL块，送入增量SHA-256、fatal UTF-8解码和有状态CSV解析器，不组装整文件Buffer/string或输入行矩阵。接受Bar按最多1,000条批次写入事务临时表，整文件Hash和质量校验通过后原子发布；失败回滚并释放FINALIZING。重复键索引和错误详情仍受100,000行上限约束保存在内存。服务47项单测/类型检查/构建及随机专用PG双进程重启HTTP smoke（848,055字节/16,000行，落库行数精确匹配）通过。Parquet、日期物理分区和更大规模资源容量测试未完成；第2节与第7节未勾选，2026-09-09人工验收保持原样。见[P6流式Finalize审计](../../../evidence/audits/2026-09-25-p6-streaming-csv-finalize.md)。

2026-09-26 跨实例容量保护：PostgreSQL配置下，CSV/Parquet预览、导入和Finalize现在共用数据库session advisory lock，连接持有到HTTP响应排空；竞争请求返回429和`Retry-After: 1`，数据库协调不可用时fail-closed返回503。两套独立Market Data进程共用随机隔离PG的HTTP smoke验证忙拒绝、正常响应后的锁释放、客户端断开后的锁释放及下一请求获准；数据库和进程均清理。`market-data-service`构建与单测57/57通过。此项只证明共享PostgreSQL进程间的并发互斥，不证明跨主机网络分区/故障切换、容器/Ubuntu内存预算、生产负载或Paper连续性。来源及命令见[P6解析器及闸门审计](../../../evidence/audits/2026-09-26-p6-minute-parser-memory.md)。

Docker Desktop ARM64补充验证（2026-09-26）：以当前Market Data Dockerfile构建Linux/arm64镜像，在两只相互独立、各2 GiB RAM/2 CPU/128 PIDs的临时容器内，通过临时PG库复测并发拒绝和锁释放；活动服务容器未重启，精确测试库/容器已删除。此项仍非Ubuntu实机或正式行情采集压力验证。

10万行拒绝路径容器容量补充（2026-09-26）：同一Linux/arm64镜像在单只2 GiB RAM/2 CPU/128 PID限制容器中完成100,000重复键和100,000坏OHLC两种真实HTTP分块上传→Preview→Finalize场景；各自100,000条拒绝错误持久化、0 Bar发布、重复Finalization幂等；服务RSS峰值330,584/339,960 KiB，cgroup总峰值461,256 KiB。两次并发请求均验证429/Retry-After；各自随机PostgreSQL库精确删除，临时容器移除，活动服务不重启。宿主默认smoke亦通过。此证据覆盖固定拒绝输入在Docker Desktop ARM64的有限资源表现，不等于Ubuntu原生、生产共享PG余量、长期持续流量或多机故障验收；详细方法与报告见[P6解析器及闸门审计](../../../evidence/audits/2026-09-26-p6-minute-parser-memory.md)。

## 7. 阶段交付待办（完成后勾选）

以下勾选只记录本阶段交付进度，不能代替第2节逐项开发任务或版本验收结论。开发者凭实现/实测证据勾选开发项；“人工验收”仅在用户实际确认后勾选，不预填PASS。

- [x] 契约、数据结构、场景定义和预期结果已冻结（含历史上下文引用字段及缺项受限状态；版本内容仍待独立核验）。
- [x] 第2节后端任务完成，真实依赖与替身明确。软件合同、未知值默认、引用约束、质量检查、旧JSONB读取兼容均已实现；无来源证据的状态和限价仍保持UNKNOWN/null，不据此宣称历史事实通过。定向测试和隔离PG真实链证据见[2026-10-23 C3清单复核](../../../evidence/audits/2026-10-23-v22-c3-checklist-review.md)。
- [x] 正式Web功能页及验收中心正常/异常场景完成。当前候选真实Web TestRun把上传、指定证券/日期分钟查询、覆盖分类、两份独立同语义DataVersion比较及分钟/日线对账写入同一运行；normal/rejection/recovery自动场景也通过。该软件验证不核验操作者参考值或历史来源事实。
- [x] 命令、实际URL、Fixture路径/Hash和配置说明已补齐，待实现占位已消除或明确列为范围外；动态地址仅在隔离smoke进程存活期间有效，固定命令可复现同一验证。
- [x] 开发者按第8节自动流程从准备到同Run检查/证据导出已执行；TestRun、Manifest、命令及退出码见[当前候选复验审计](../../../evidence/audits/2026-10-23-v22-c3-current-candidate-combined.md)。
- [x] 当前候选CSV服务重启/FINALIZING恢复和Parquet PostgreSQL容器重启续传均已复验通过；恢复的固定输入、SHA、行数和清理结果见[当前候选复验审计](../../../evidence/audits/2026-10-23-v22-c3-current-candidate-combined.md)。项目所有者已完成人工验收；外部来源事实观察及许可仍未完成。
- [x] 用户已通过Web及命令证据完成人工验收，记录确认时间/结论。2026-10-23项目所有者确认当前候选验收通过，绑定TestRun `75300ba9-0807-48f5-80dc-a6cadce18b2c`及Evidence Manifest SHA-256 `b95d07c9b2123279990bbf70bc8541f29ff78e12f47cf2f28a96a5e75d10c827`；签署范围仅限V2.2合成/本地Fixture软件操作闭环，逐Bar权威事实、来源许可和正向历史研究回放不在本次通过范围内。结构化记录见[人工验收记录](../../../evidence/audits/2026-10-23-v22-c3-current-candidate-human-acceptance.json)。
- [x] 操作说明与限制已更新，[本版验收表](./99-acceptance.md)已同步。人工验收已签署；V2.2阶段仍因来源许可、逐Bar事实和正向历史研究回放门禁未通过而保持`PARTIALLY_IMPLEMENTED`。

当前候选状态更新（2026-10-23）：项目所有者已确认V2.2本地合成/Fixture软件闭环人工验收PASS，TestRun与Manifest绑定见[人工验收记录](../../../evidence/audits/2026-10-23-v22-c3-current-candidate-human-acceptance.json)。本文件较早日期的增量记录保留其当时状态；如其中写明当前候选人工验收/恢复尚未完成，以本次统一复验与签署记录为准。外部数据许可、逐Bar权威事实、完整覆盖及正向历史研究回放仍未完成，阶段整体保持PARTIALLY_IMPLEMENTED。

剩余项分类（2026-10-23）：当前候选的软件验收已关闭，不安排重复导入、Web验收或恢复测试。C3仅保留三个关闭门禁：OD-008逐源`HISTORICAL_RESEARCH`用途决定、最小样本的可引用逐Bar历史事实、以及在二者满足后执行的正向历史研究回放。覆盖160/240和操作者日线参考未独立核验是合成候选的已接受限制，不能视为软件缺陷或用于研究结论。详细放行条件见[C3剩余门禁清单](../../../evidence/audits/2026-10-23-v22-c3-residual-gate-inventory.md)。

## 8. 阶段验收操作手册

### 8.1 当前可执行性与验收准备

手册状态：VERIFIED_EXECUTABLE（2026-10-23当前候选的Web正常/拒绝/恢复、CSV/Parquet上传、合并查询/覆盖/版本比较/聚合、同Run CLI核对/证据导出和CSV服务/Parquet数据库重启恢复命令均实际执行通过）。动态地址每次运行生成，以日志为准；当前完整命令和结果见[当前候选复验审计](../../../evidence/audits/2026-10-23-v22-c3-current-candidate-combined.md)。项目所有者于2026-10-23确认当前候选人工验收通过，签署范围及限制见[人工验收记录](../../../evidence/audits/2026-10-23-v22-c3-current-candidate-human-acceptance.json)；该签署不验证外部历史行情事实或来源许可。

本轮新增Web入口：V2.3页面“登记权威历史上下文版本”可按来源登记股票池成员/生效与退出日期、MarketRuleSet交易时段、公司行动证券覆盖及整体有效期；“已导入分钟数据回放”仅接受V2.2 DataVersion。服务端计算内容Hash并在回放前复核引用。当前历史研究用途配置保持关闭，因此不能用现有BaoStock归档完成正向研究回放；门禁的失败路径已由隔离Web smoke实测。登记表的人工内容核对和正向成功路径仍NOT_RUN。

已验证入口：从仓库根目录运行`pnpm verify:stage -- --stage V2.2 --suite code`；它执行冻结代码/合同/Fixture/数据库检查，并调用`v22:upload-web-http-smoke`。该 smoke 由`run-isolated-postgres-command.mjs --admin-env STOCKQUANT_V22_UPLOAD_ADMIN_DATABASE_URL`提供一次性PostgreSQL容器、随机loopback端口、随机测试库和精确清理；不可把该命令改指共享或活动数据库。Chromium smoke 会输出当前随机 Web 路由、Platform API 与 Market Data 地址，页面路由为`/acceptance/v2/v2.2`。直接独立运行的历史入口要求本机专用测试PostgreSQL `127.0.0.1:5433/postgres`；完整 stage suite 使用前述一次性容器，不使用5433。

前置条件：仓库根目录、冻结依赖已安装、Playwright Chromium与Docker可用；服务以独立进程运行，FakeBroker，禁用LIVE写入；真实行情源、采集Scheduler和Executor均不启动。Chromium smoke 的本地测试身份为`acceptance-owner-1`，只通过隔离Platform进程的测试身份开关建立；不需要也不接受真实账户凭证。

固定输入：小型Parquet文件`fixtures/v2/v2.2-parquet-smoke-mapped/minute-upload.parquet`（SHA-256 `f494f73db4d972d2a8a569766fb8b291ca6dee0d91d514ade96172c548cf2bbb`），映射`instrument/bar_time/o/h/l/c/qty_shares/turnover_cny`；本地冻结归档目录`data/local/baostock-minute-500x60-2024-01-02-2024-04-02-v1/`的Manifest SHA-256为`59e677807518ff37a4571494b66738b71f86fe9da270468e4e7ef3719cee90e3`。验收 smoke 合并3个冻结证券的8,640行5m `BAR_END` CSV，当前代码套件运行时Hash为`ab9b0822e27a40155522e2936a516addb36d9f6d4a6e2e9f8e280c3376f950a2`。归档来源许可保持`UNCONFIRMED`，Run设置`researchUseAllowed=false`；不要将其用于研究/策略结论或伪称外部源已验证。

| 开发交付时必须填写 | 当前值 |
|---|---|
| Git基线/当前工作区证据 | HEAD及当前变更前后工作树均保留；2026-10-21本轮测试代码、合同与结果见[C3复核审计](../../../evidence/audits/2026-10-21-v22-c3-closeout.md)及[最终完整套件日志](../../../evidence/audits/2026-10-21-v22-c3-closeout/code-suite-final.log)。旧W4文件哈希只代表历史快照，不作为当前候选哈希。 |
| 项目根目录、Node/pnpm/Docker版本 | `/Users/huangbosong/Documents/ChatGPT/StockQuant`；Node `v24.1.0`；pnpm `10.34.5`；Docker CLI `28.0.4`；daemon版本本轮未采集。 |
| Web基础URL/身份登录方式 | 最近完整套件实际动态地址：`http://127.0.0.1:49180/acceptance/v2/v2.2`；Platform API `http://127.0.0.1:49179`、Market Data `http://127.0.0.1:49178`。这次 smoke 已退出，地址仅供日志追溯；复跑后以新日志地址为准。端口每次随机，仅进程存活期间有效；隔离测试会话`acceptance-owner-1`，不使用真实凭证。 |
| 本阶段Web路由 | `/acceptance/v2/v2.2`。 |
| 正式页面实际入口 | smoke实际URL加`/acceptance/v2/v2.2`；登录前先运行8.2命令，端口只在本次smoke进程运行期间有效。 |
| Fixture/日期/Hash/语义 | Parquet及冻结BaoStock本地归档、日期、映射、Hash、BAR_END/5m、SHARES/CNY和许可状态见8.1固定输入说明及相邻SHA Manifest。 |
| 配置/非秘密测试值 | 一次性PG连接变量由隔离包装脚本临时注入`STOCKQUANT_V22_UPLOAD_ADMIN_DATABASE_URL`，容器名标记`STOCKQUANT_ISOLATED_PG_CONTAINER`；Smoke生成独立随机服务Bearer，Market Data Scheduler/Executor关闭，Platform `LIVE_TRADING_ENABLED=false`、`BROKER_MODE=FAKE`、隔离测试身份开关开启。 |
| 故障/恢复及清理 | 自动恢复复验：`pnpm --filter @stockquant/market-data-service minute-upload:http-restart-smoke`验证CSV服务进程重启后续传，并在持久`FINALIZING`后重启、由正式Finalize接口重新领取并完成导入；`pnpm --filter @stockquant/market-data-service minute-parquet:container-db-restart-smoke`验证隔离PostgreSQL容器重启后续传。两项均PASS，输入/Run/版本及清理见[缺口分类/恢复复验审计](../../../evidence/audits/2026-10-21-v22-c3-gap-recovery.md)。V2.2 Chromium smoke另覆盖bad Fixture拒绝、异主403、CSV取消、同Run CLI `--check-only`及导出；随机数据库/容器/网络已清理，`activeServices=NOT_CONNECTED`。 |
| 耗时/超时/观察预算 | 完整V2.2 code suite于2026-10-21受控隔离环境执行通过，最终日志见C3复核目录；上传smoke含有界健康轮询和20～30秒上传等待。本轮不满足来源许可、真实历史数据观察或V2.4 20交易日观察。 |

2026-10-23当前候选本地执行证据：`pnpm verify:stage -- --stage V2.2 --suite code`最终退出0；其内置隔离Chromium smoke记录合并候选 TestRun `75300ba9-0807-48f5-80dc-a6cadce18b2c`，Manifest SHA-256 `b95d07c9b2123279990bbf70bc8541f29ff78e12f47cf2f28a96a5e75d10c827`，同Run `--check-only`退出0。该运行的五个断言全部PASS：上传、分钟查询、覆盖、两个独立DataVersion比较、分钟聚合。CSV 16,000行服务重启/FINALIZING恢复及Parquet 100,000行PostgreSQL容器重启续传均另行通过；命令和SHA见[当前候选复验审计](../../../evidence/audits/2026-10-23-v22-c3-current-candidate-combined.md)。

### 8.2 初始化与启动（已验证的隔离代码流程）

在项目根目录运行。不要先启动共享Compose Stack；V2.2上传smoke自建随机测试数据库、Market Data、Platform API、Vite与Chromium进程，并在结束时清理本次创建的精确资源。

```bash
# 从仓库根目录执行；包括代码质量检查和真实Chromium上传smoke。
# wrapper临时注入一次性PostgreSQL连接和容器身份。
pwd
pnpm verify:stage -- --stage V2.2 --suite code
```

预期：退出码0；日志包含一次性PG容器/随机loopback端口、Market Data与Platform就绪、实际V2.2 Web URL、Fixture/CSV/Parquet/归档断言、当前候选五项统一断言及TestRun Manifest，以及最终`activeServices=NOT_CONNECTED`和容器/网络清理确认。受限沙箱若在Qlib worker临时loopback监听处报EPERM，保留失败并在受控本机隔离测试环境重跑；不可改连活动数据库。此代码套件不启动在线来源、采集worker或Paper，也不验证Ubuntu发布。

### 8.3 Web逐步操作及预期结果

1. 执行8.2命令，从日志打开本次随机URL下的`/acceptance/v2/v2.2`；Smoke使用隔离测试owner `acceptance-owner-1`，不输入真实凭证。
2. 浏览器先点击“运行正常”并记下TestRun ID。上传选择“CSV 或 Parquet 文件”，填写映射/来源元数据后点击“上传并预览”及“确认并导入”；CSV完成后点击“将此CSV导入记入验收运行”，再从业务明细核对断言。
3. 下表区分本轮实测路径与尚未完成人工核验的项目；恢复路径已由独立的进程/数据库重启烟测复验，不将自动测试冒充用户操作。

| 场景ID（阶段内唯一） | 场景 | 点击顺序/输入 | 预期结果与核对点 |
|---|---|---|---|
| normal | 固定分钟Fixture | 点击“运行正常”；同轮检查匿名/已登录预览、normal导入、重复幂等与bad Fixture拒绝。 | 正常TestRun完成；Fixture为`v2.2-minute-bars-1`，重复导入幂等，bad Fixture为REJECTED且0 accepted。 |
| CSV/Parquet upload | 分块文件导入 | 上传CSV并完成映射、预览、Finalize；再映射`minute-upload.parquet`并Finalize；读取导入详情与Bar页。 | 本轮CSV 16,000合成行、Parquet 2行；匿名401、owner 200、foreign owner 403。来源许可按输入声明记录。 |
| archived uploaded-csv | 冻结归档与同Run检查 | 上传8.1列出的三证券/8,640行5m归档，声明`BAR_END`并保持许可未确认；Finalize后创建uploaded-csv TestRun。 | 日志Run `a1a6fd26-b3e2-4274-8943-60a99a39624d`断言PASS，CLI同Run `--check-only`退出0且TestRun计数不变；该随机数据库已清理，ID仅供日志核对，不是活动Run。 |
| current-candidate combined | 上传+查询+覆盖+版本比较+聚合 | 使用隔离 smoke 生成的16,000行合成CSV；Web完成Finalize后填入DataVersion、`600000.SH`、`2026-09-24`，上传同语义独立版本，填写六项合成日线参考值及`fixture://v22-upload-smoke/600000.SH/2026-09-24`引用，再点击“将此CSV导入记入验收运行”。 | 当前候选TestRun `75300ba9-0807-48f5-80dc-a6cadce18b2c`五项断言PASS，Manifest SHA-256 `b95d07c9b2123279990bbf70bc8541f29ff78e12f47cf2f28a96a5e75d10c827`，同Run CLI `--check-only`退出0。覆盖报告为`INCOMPLETE`：240根应有、160根有效、80根UNKNOWN；此数据状态不是覆盖完整PASS。运行和导出文件见[当前候选复验审计](../../../evidence/audits/2026-10-23-v22-c3-current-candidate-combined.md)。 |
| 2026-10-21 Web/CLI矩阵复验 | 隔离Chromium运行normal、rejection、recovery、CSV/Parquet及冻结归档；各Run同ID CLI核验并导出 | 四Run均COMPLETED且适用断言PASS；CSV 8,640行5m BAR_END、Parquet 2行；历史上下文有引用/缺引用状态分别正确；同Run CLI与导出退出0。详细ID、Manifest、动态URL见[C3复核审计](../../../evidence/audits/2026-10-21-v22-c3-closeout.md)及[Web日志](../../../evidence/audits/2026-10-21-v22-c3-closeout/web-smoke-final.log)。临时库/容器已清理。 |
| rejection | 许可/Owner拒绝 | 核对bad Fixture拒绝和异主Run/upload/import读取。 | bad Fixture不发布；异主403；未确认许可时`researchUseAllowed=false`。 |
| recovery | 中断后续传 | 自动复验命令：仓库根目录执行`pnpm --filter @stockquant/market-data-service minute-upload:http-restart-smoke`和`pnpm --filter @stockquant/market-data-service minute-parquet:container-db-restart-smoke`；后者仅创建loopback绑定的随机一次性PostgreSQL容器并精确清理。 | 本轮两项均PASS：CSV服务重启后续传16,000行，且`FINALIZING`状态跨重启后恢复发布；Parquet在PostgreSQL重启后续传并发布100,000行，随后服务重启仍读取同一版本。具体上传ID、SHA和环境见恢复复验审计。人工按实际数据执行上传和恢复仍待用户验收。 |

4. 从运行详情打开关联正式页面，执行一次刷新/关闭再打开；核对长任务后台状态、历史证据和加载/失败/陈旧提示。
5. 每项记录实际结果、截图与业务ID。异常场景“预期拒绝”被正确验证时断言可PASS，但被测业务操作仍显示拒绝；若意外接受则断言FAIL。

### 8.4 命令行复验与相同运行核对（已实现）

在项目根目录执行以下已实现命令。stage/scenario必须匹配8.3定义；CLI与Web共用场景版本、Fixture和断言。每条命令执行后立即查看退出码，任何非零先保存错误再定位，不能继续假定本阶段通过。

```bash
pnpm verify:stage -- --stage V2.2 --scenario normal --seed 20260907
# 紧接上一命令执行；0表示全部场景断言通过
 echo $?
pnpm verify:stage -- --stage V2.2 --scenario rejection --seed 20260907
 echo $?
pnpm verify:stage -- --stage V2.2 --scenario recovery --seed 20260907
 echo $?
# 对Web刚完成的、已PUBLISHED的大文件上传创建独立的同上传TestRun
read -r completed_upload_id
pnpm verify:stage -- --stage V2.2 --scenario uploaded-csv --upload-id "$completed_upload_id"
 echo $?
pnpm verify:stage -- --stage V2.2 --suite code
 echo $?
pnpm test:e2e -- --stage V2.2
 echo $?
```

预期：各场景输出testRunId、实际数据/模型/券商模式、断言expected/actual及证据位置；预期内拒绝场景验证成功退出0，意外副作用/缺脚本/缺必需依赖/未满观察条件非零。恢复场景需外部动作时输出已核实目标和步骤，停留WAITING；完成动作后复验原run，不伪称Web可重启宿主。`uploaded-csv`只接受当前owner已完成且PUBLISHED的分块上传；无效/异主uploadId不应产生PASS。浏览器测试必须实际运行本阶段用例，零用例/全跳过不能退出0。

再对Web中已运行的同一testRunId执行只读核对，避免仅创建新样本掩盖页面问题：

```bash
# 粘贴Web运行详情中的实际testRunId，再按回车；这是普通ID，不是凭证
read -r acceptance_run_id
pnpm verify:stage -- --stage V2.2 --run "$acceptance_run_id" --check-only
 echo $?
pnpm evidence:export -- --stage V2.2 --run "$acceptance_run_id"
 echo $?
```

check-only仅查询此运行后端事实并追加检查证据，不创建新订单、不重放成交或发起模型调用；空ID/错误stage/越权run必须拒绝。导出只含脱敏数据，输出实际目录和Manifest Hash，不自动勾选人工验收。端到端正常/异常/恢复运行产生不同ID，导出时分别保存。

本阶段代码测试覆盖要求：字段单位/时间边界/质量规则、真实存储导入幂等与中断恢复、分钟查询分页及Web导入E2E。 在交付时把映射到的实际Domain/DB/契约/服务内测试命令补入本节，注明执行目录、测试文件或套件、退出码和报告；verify:stage必须展示实际调用的测试清单，不能空壳返回0。Python服务使用自身锁定环境，不串用其他服务虚拟环境。

### 8.5 交叉核对、失败定位与恢复

交叉核对：源文件总行数、接受/拒绝计数、分区查询与分钟聚合日线差异；不得静默丢弃错误行。

先检查Web与CLI的testRunId、输入/策略/代码版本和模式是否一致，再按Trace查平台、领域、适配器与持久化证据。页面错误而CLI正确，记录Web失败；二者都错则保留领域断言失败。缺能力先查健康/迁移/数据与日志，不修改余额或订单状态使断言通过。

独立复跑创建新run；测试幂等/检查点/重启恢复则使用原run和原幂等键。故障发生后保留旧证据，修复后新增运行或检查记录；不得清空账本、随机更换seed直到通过。真实观察窗口、来源验证和实际模型调用与加速/录制测试分别记录。

### 8.6 验收记录与收尾

下表保留历史执行记录，并追加截至2026-10-23的当前候选证据。局部代码套件与阶段整体结论分开记录；隔离数据库已清理的TestRun ID只用于日志追溯，不能作为当前可查询的活动Run。旧版本人工签署保留为历史事实，不替代当前候选签署。

| 场景/检查 | Web实际结果与截图 | 命令/退出码/报告 | testRunId/业务ID | 结论 |
|---|---|---|---|---|
| normal Fixture路径 | Chromium实际点击“运行正常”；最新复跑未保存截图，TestRun在清理临时库时删除 | `node scripts/run-isolated-postgres-command.mjs --admin-env STOCKQUANT_V22_UPLOAD_ADMIN_DATABASE_URL -- pnpm --filter @stockquant/platform-api-service v22:upload-web-http-smoke`，exit 0；[完整日志](../../../evidence/audits/2026-10-06-w4-v22-upload-targeted-smoke.log) | `fdae6e5e-6d2c-4871-8bba-2d0b228a20d1`（临时、已删除） | smoke中PASS；阶段验收NOT_RUN |
| rejection（已覆盖子项） | bad Fixture拒绝、匿名401、异主403；未覆盖的拒绝场景不推断 | 同上，exit 0；日志含`badFixtureStatus=REJECTED`及owner边界状态 | bad Fixture和请求ID见日志；临时库已删除 | 已覆盖断言PASS；完整rejection场景NOT_RUN |
| recovery（中断后续传/进程恢复） | 本次未注入服务中断；无截图 | 当前定向smoke未执行恢复场景；历史审计见8.3 | 未产生本轮恢复Run | NOT_RUN |
| CSV/Parquet与归档同Run CLI核对 | Chromium真实上传；未保存截图 | 定向smoke exit 0；CLI `--check-only` exit 0；共8,640行冻结5m BAR_END归档、2行Parquet；许可UNCONFIRMED，研究用途关闭 | 归档Run `490be364-44ab-416f-9e38-bb8537369cf9`（临时、已删除）；upload IDs见日志 | 本次软件断言PASS；来源/许可验收NOT_RUN |
| 完整V2.2代码套件 | 套件包含真实隔离PG与Chromium上传链，最终日志无截图留存 | `pnpm verify:stage -- --stage V2.2 --suite code` exit 0，详见[C3最终完整套件日志](../../../evidence/audits/2026-10-21-v22-c3-closeout/code-suite-final.log)；较早失败日志保留于同目录 | 套件生成随机运行已清理，结构化导出保留于`evidence/local/V2.2/` | 自动代码套件PASS；V2.2阶段仍PARTIALLY_IMPLEMENTED |
| Web同run只读核对与结构化证据导出 | 4个本轮Web TestRun均用相同ID核验并导出；运行数据库按脚本清理，证据包保留 | 每个`--check-only`及`evidence:export` exit 0；TestRun和Manifest见C3复核审计 | normal `57ad6078-0b34-4c42-8822-8b46d3c22aaf`；rejection `90ae00dd-681a-4c03-b669-10ff68952ff2`；recovery `c7c1dadc-0d9a-416c-8a3e-6ef3f1092439`；uploaded-csv `bff65edc-ef9f-4eb6-9ad3-0644412628d6` | 自动同Run证据PASS；当前候选人工签署另见下行 |
| 实际来源观察/历史行情事实 | 本轮只使用本地合成CSV/Fixture；没有调用外部行情源。TestRun的`researchUseAllowed=true`仅适用于本地生成的合成样本 | 未获外部来源授权，不运行采集或真实来源探测；限制见[人工验收记录](../../../evidence/audits/2026-10-23-v22-c3-current-candidate-human-acceptance.json) | 不适用 | NOT_RUN；外部来源许可UNCONFIRMED，`HISTORICAL_RESEARCH`关闭，逐Bar状态/限价事实未获权威核验 |
| 用户人工验收（当前候选） | 项目所有者于2026-10-23明确确认人工验收通过；确认紧接当前候选复核与验收范围说明 | 绑定当前候选统一TestRun及自动化证据包；自动与人工结论分开记录 | TestRun `75300ba9-0807-48f5-80dc-a6cadce18b2c`；Manifest SHA-256 `b95d07c9b2123279990bbf70bc8541f29ff78e12f47cf2f28a96a5e75d10c827`；[结构化签署](../../../evidence/audits/2026-10-23-v22-c3-current-candidate-human-acceptance.json) | PASS，仅限本地合成/Fixture软件闭环；不包含外部行情事实、来源授权或正向历史研究回放 |

记录不适用子项的范围依据，不能将必需项改为不适用绕过门禁。归档后在[本版验收表](./99-acceptance.md)填写证据链接和结论。清理只针对本轮已结束的隔离运行，默认保留证据；停止测试不能删除数据库卷或取消无关任务。


可续传大文件与TestRun关联增量（2026-09-25）：登录用户可通过V2.2页面上传最大64 MiB/100,000行CSV，每块512 KiB，逐块和整文件SHA-256校验；PostgreSQL持久化上传会话/分块，支持刷新与服务重启后续传、owner隔离、配额、取消和幂等导入。独立HTTP重启烟测覆盖848,055字节、16,000行；真实Chromium→Vite→平台API→市场服务→双临时PG smoke经页面“将此CSV导入记入验收运行”创建`uploaded-csv` TestRun，绑定uploadId/importId/DataVersion/SHA/行数/许可用途，CLI对同run `--check-only`退出0且无写副作用，异主读取403。`pnpm verify:stage -- --stage V2.2 --suite code`退出0（合同73 JSON/41 schema/30兼容规则、运维94项、市场PG集成21项等）。Finalize现将Bar按最多1,000条批次暂存并原子发布；重复键索引与错误仍驻留内存。Parquet、日期物理分区和生产容量证据未完成，人工签署状态保持不变。详见[可续传分钟上传审计](../../../evidence/audits/2026-09-25-p6-resumable-minute-upload.md)及[流式Finalize审计](../../../evidence/audits/2026-09-25-p6-streaming-csv-finalize.md)。

Parquet增量（2026-09-26）：Web支持Parquet八个目标字段逐项映射任意唯一源列，并复用同一续传/预览/Finalize/TestRun/CLI核验流程，解析使用锁定PyArrow并按最多1,000行批流处理；64 MiB/100,000行上限与源文件SHA保留。2,436字节合成Fixture的真实浏览器→API→隔离PG发布、同run CLI只读核对、异主403、CSV 16,000行回归及容器构建/容器内解析均通过。日期物理分区、容量测试和完整阶段人工验收仍未完成；不得将本增量视为V2.2整体PASS或改写2026-09-09签署。新增非标准列名冻结Fixture并经真实浏览器→API→隔离PG验证映射持久化。详见[P6 Parquet导入审计](../../../evidence/audits/2026-09-26-p6-parquet-minute-import.md)。

每日物理分区增量（2026-09-26）：新发布的分钟Bar写入按Asia/Shanghai自然日RANGE分区的PostgreSQL表；分页API新增半开`fromBarStart`/`toBarStart`以触发日期裁剪。兼容旧未分区数据的安全回填使用独立连接变量和显式`--apply`，默认PREVIEW，最多10,000行逐批事务提交，重跑幂等并保留原表。专用PG测试验证两个日期分区及EXPLAIN裁剪、迁移中旧数据分页和CLI preview/apply/重跑。`pnpm verify:stage -- --stage V2.2 --suite code`退出0。后续仓储层容量smoke已用合成输入覆盖100,000行及500证券×60交易日×48条的1,440,000行档，实测完成发布、分页和日期裁剪；这不是冻结归档文件的CSV/Parquet→HTTP全链路容量验证。活动/正式库没有自动迁移；旧数据回填执行、生产/Ubuntu资源与并发边界、存储冗余/备份恢复和完整阶段人工验收仍待完成。原第2节与第7节总验收复选框及2026-09-09签署状态保持原样。详见[P6每日分区审计](../../../evidence/audits/2026-09-26-p6-daily-partition-storage.md)与[P6容量smoke](../../../evidence/audits/2026-09-26-p6-minute-capacity-smokes.md)。

5m源语义及冻结归档导入（2026-09-26）：V2.2 CSV/Parquet合同现显式支持`1m`/`5m`及`BAR_START`/`BAR_END`。解析器接受BaoStock `YYYYMMDDHHmmssSSS`紧凑上海时间和`sh.`/`sz.`代码；按声明把BAR_END退回频率时长生成barStart，5m栅格不对齐则拒绝。真实HTTP导入本地只读500×60 BaoStock归档，500/500文件SHA、行数与Manifest逐项匹配，共1,440,000条/500 PUBLISHED版本/60日分区；首条OHLCV与源CSV相同，测试库随机创建并删除。来源许可未验证，每份导入均标记`UNCONFIRMED`和`researchUseAllowed=false`。此烟测直连Market Data小文件HTTP入口，未经过平台API/Web/TestRun或owner隔离分块上传，不能视作V2.2整体验收。详见[冻结归档HTTP导入审计](../../../evidence/audits/2026-09-26-p6-baostock-archive-import.md)。

100,000行容量增量（2026-09-26）：隔离随机PostgreSQL数据库中实际通过`publishStream`逐批持久化100,000行，核对行数、分页和目标日期分区查询计划；macOS arm64/PostgreSQL 16.9导入原子提交2.494秒、40,096行/秒、峰值RSS 121,440 KiB、数据库大小增量64,897,024字节。测试数据库建后删除并确认。此为仓储层合成烟测，不覆盖完整文件解码、1.44M行历史规模、配额环境、Ubuntu或备份恢复，不能用于容量上线承诺。详见[P6 100k容量smoke](../../../evidence/audits/2026-09-26-p6-minute-capacity-smokes.md)。


分块预览与Finalize容量增量（2026-09-26）：重复与坏OHLC行不会进入Finalize Bar暂存批次；若任一质量错误存在，整次事务仍REJECTED并原子回滚。分块CSV/Parquet预览响应最多保留100条有效Bar样本，新增`barsTruncated`布尔值，其余总行数和逐行错误保持完整。100,000行限制下的真实隔离HTTP→PG压力smoke分别上传5.4MB重复/唯一坏OHLC数据：100,000条错误均持久保存，0条Bar发布，随机测试库验证删除；Market Data服务峰值RSS为480,064/479,328 KiB（Preview 359,536/368,400 KiB；Finalize 480,064/479,328 KiB），烟测上限768 MiB。该串行单请求macOS结果不代表多并发、容器或Ubuntu容量。53项单测、类型检查及浏览器→API→PG真实归档分块流程验证通过，仍须完成平台级并发资源限额、Linux/Ubuntu及备份恢复验证。见[解析器内存与HTTP容量审计](../../../evidence/audits/2026-09-26-p6-minute-parser-memory.md)。

服务身份加固（2026-09-27）：平台代理的Fixture导入、CSV预览/导入及CSV/Parquet分块上传、状态、预览、Finalize、取消、uploaded-csv状态、持久导入详情和Bar分页读取均先验证用户会话；转发到Market Data时附带`platform-api-service` Bearer与适用的owner范围。Market Data以Bearer Token识别服务；可选`x-stockquant-service-id`只能作为一致性检查，并在获取P6跨实例导入闸门前验证重型导入路由。真实Chromium→Vite→Platform API→Market Data→双随机PG Web smoke验证匿名导入读取401、用户详情/Bar页200、异主403，以及CSV/Parquet/5m归档上传、同run TestRun与CLI只读核对。缺失/伪造Bearer及错配身份拒绝，Bearer-only请求可通过服务身份。其他行情/日历读取仍允许内网直连；活动部署、密钥轮换和阶段人工验收仍待完成。详见[P7.2服务身份审计](../../../evidence/audits/2026-09-25-p7-2-service-identity.md)及[分钟导入边界审计](../../../evidence/audits/2026-09-27-p6-minute-import-boundary.md)。

2026-09-27 路由收口续记：Market Data采集订阅/运行/缺口/回填状态、来源健康GET与固定Fixture分钟预览，以及质量/覆盖计算POST现要求平台Bearer；V2.2 Platform scenarios/Fixture preview先校验用户Session，Fixture代理加服务身份。运维脚本分别读取Bearer与采集控制令牌。扩展HTTP smoke/Platform代理单测和完整V2.1、V2.2 code suites通过；V2.2 CSV浏览器测试3/3通过（Mock API，不算服务端阶段场景验收）。日历与容器`/live`、`/ready`仍可读；本轮服务源码未部署到活动采集实例，长期观察继续依托原运行实例。详见[P7.2采集读取身份审计](../../../evidence/audits/2026-09-27-p7-2-market-data-collection-read-identity.md)。


## 2026-10-01 当前工作树隔离复验

新增真实双服务HTTP/Chromium回归：CSV/Parquet上传生命周期、取消、导入详情与分页Bar读取经Platform ServiceBearer/owner代理进入Market Data和随机隔离PostgreSQL；三类上传Owner边界及同run CLI `--check-only`通过。数据为冻结归档且用途未确认，不影响真实数据与人工验收状态。证据见[V2.2跨服务回归](../../../evidence/audits/2026-10-01-w1-v22-minute-api-http-e2e.md)及其[机器报告](../../../evidence/audits/2026-10-01-w1-v22-minute-api-http-e2e.json)。

2026-10-06 V2.2代码套件补齐：完整`pnpm verify:stage -- --stage V2.2 --suite code`现包含上述实际Chromium上传Web/API smoke，套件通过；新增测试数据库由资源受限一次性PostgreSQL容器和随机端口提供，确认容器/网络/随机数据库已清理。执行覆盖normal Fixture预览/导入/幂等/bad拒绝、CSV分块与Parquet上传/Finalize、取消、owner隔离、导入分页读取及`uploaded-csv` TestRun的CLI同Run `--check-only`。8,640行本地冻结5m BAR_END输入只用于软件验证，许可保持UNCONFIRMED、研究使用关闭、外部来源调用0。普通沙箱loopback EPERM与受控重跑均保留；V2.2第2/7节整体任务、操作手册残余占位、历史TestRun证据、Ubuntu/生产容量及人工验收仍未完成。详情见[代码套件覆盖审计](../../../evidence/audits/2026-10-06-w4-v22-upload-code-suite.md)、[成功日志](../../../evidence/audits/2026-10-06-w4-v22-upload-complete-code-suite.log)、[沙箱失败日志](../../../evidence/audits/2026-10-06-w4-v22-upload-complete-code-suite-sandbox-failure.log)和[历史执行快照 SHA-256 Manifest](../../../evidence/audits/2026-10-06-w4-v22-upload-code-suite.sha256)。该Manifest保留当次V2.2运行输入哈希；后续文档变更由当前活动清单与本轮审计记录。


分钟Bar适用状态与限价引用（2026-10-23）：新增规范化MinuteBar schema与类型。新导入Bar显式保留`tradingStatus=UNKNOWN`、空来源引用及未知限价对象；只有附带来源引用的状态可标`TRADING`/`SUSPENDED`，可用上下限要求MarketRuleSet版本与来源引用。旧JSONB分页读取自动补齐未知字段。质量检查只在存在完整限价引用时检验上下限，并拒绝Bar与已引用停牌事实冲突。Market Data相关定向单测、类型/合同检查及隔离PostgreSQL真实Web smoke通过。此项没有引入历史交易状态或限价源。

分钟聚合与日线参考值对账（2026-10-23）：Market Data服务按上海交易日排序汇总RAW分钟Bar的开高低收、成交量和成交额，返回逐字段精确差异与问题清单；拒绝重复Bar、错误证券/日期/频率、非RAW、非法OHLC及非法数值。Platform代理限定单日最多500根，V2.2正式页展示操作者提供的参考值、来源引用和逐字段差值，并明确参考值未独立验证、Bar覆盖未在聚合操作中判定。定向单测（含日线参考OHLC约束）、Mock Web交互以及隔离PostgreSQL真实Web→Platform→Market Data→分钟表链均通过。真实链路由合成数据验证，不代表外部行情事实或人工验收；阶段人工验收仍NOT_RUN。对应真实链证据及DataVersion/SHA记录见[C3清单与增量复核](../../../evidence/audits/2026-10-23-v22-c3-checklist-review.md)。

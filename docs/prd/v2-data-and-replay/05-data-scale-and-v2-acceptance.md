# V2.5 历史数据扩容与 V2 验收

2026-10-29 最新范围决定：项目所有者批准[备用分钟源延期](../../decisions/2026-10-29-c6-backup-minute-source-deferral.md)。本轮C6按本地单源范围继续，第二分钟源及60个交易日覆盖标记`DEFERRED`，停止继续选源/探测，不再将缺少TDX路径/备用源账号作为本轮起步条件。现有BaoStock冻结归档仅按既有软件验证边界复用；C6本地单源工程切片已通过验收，完整V2.5/V2继续`PARTIALLY_IMPLEMENTED`，其他缺项保留。当前接续顺序见[主计划§7.2.3](./00-version-plan.md#723-c6单源范围接续2026-10-29)，下文旧日期记录与签署保留为历史。

2026-10-29独立复核补充：V2.5分钟导入查询纵切的同一Run已完成`--check-only`及脱敏证据导出，均退出0；Manifest SHA-256为`bd513afde6fbaa85edba7d7888581b5dc2be322c9cec647ee4c22dd8376dcdd3`，证据包见[导出JSON](../../../evidence/audits/2026-10-29-v25-minute-import-evidence-export-39a256a1/evidence.json)。此项仅补全C6本地单源工程范围的可追溯记录，V2.5/V2整版门禁不变。

2026-09-20 状态同步：Fixture 扩容场景已补分区查询、取消终态、配额边界和 Walk-forward/PIT 纯函数断言；V2.5 页面、normal/rejection/recovery、同 Run 核对、代码套件和 Web E2E 已由用户人工确认通过。分钟级全量、真实交易时段长期稳定性、备用分钟源和 V2.4 观察门禁仍未完成。

状态：PARTIALLY_IMPLEMENTED（20×60 小规模扩容切片、全量日线容量和 V2.5 整体人工验收已完成；分钟级全量、限频稳定性、备用分钟源和 V2.4 观察门禁仍待完成；Ubuntu 实机人工子项已确认通过）。版本入口：[README](./README.md)。共同约束：[三版共同规则](../05-three-version-delivery.md)。

2026-10-29 当前路由：C5本地工程范围已签收PASS；C6_LOCAL_SINGLE_SOURCE_ENGINEERING的队列、配额和查询接线已完成自动验证、所有者签收及独立复核；V2.5整版仍`PARTIALLY_IMPLEMENTED`。第二分钟源/60日覆盖为`DEFERRED`。既有100×60和500×60 BaoStock归档/隔离导入证据见[当前C6入口复核](../../../evidence/audits/2026-10-29-v25-c6-current-entry-review.md)。该数据源许可字段仍`UNCONFIRMED`且研究使用未获准；不得把这些证据扩大为全市场分钟容量、第二来源覆盖或长期稳定性结论。

当前工作区复核边界（2026-10-01）：现有 `V2.5` normal/rejection/recovery 后端场景由 `V25DataScaleEngine` 生成确定性合成内存样本；它们不是 BaoStock 20×60 归档上的生产导入/缓存/任务队列/数据库恢复。旧版引擎曾将多项 expected/actual 直接写为常量，相关TestRun保留作历史，但已被审计标记为不可作为行为证据。修正后的场景从Fixture操作结果动态计算，并明确生产队列、持久恢复、模型训练和真实PIT为`NOT_RUN`。新增复核见[W4动态Fixture场景审计](../../../evidence/audits/2026-10-01-w4-v25-dynamic-fixture-scenarios.md)及[Hash](../../../evidence/audits/2026-10-01-w4-v25-dynamic-fixture-scenarios.sha256)。

2026-10-01 数据库增量边界：另有隔离`market_data_test` PostgreSQL集成用例，将1200行合成样本经真实`publishStream`持久化至日分区，并核验幂等、分页、覆盖和DataVersion隔离；详见[审计](../../../evidence/audits/2026-10-01-w4-v25-postgres-synthetic-scale.md)及[SHA-256](../../../evidence/audits/2026-10-01-w4-v25-postgres-synthetic-scale.sha256)。这补充了数据库路径证据，但输入仍为合成样本，未验证真实源许可、生产CSV解析/队列/恢复、分钟容量、Qlib路由或PIT，因此不改变本阶段待完成门禁。

2026-10-01 CSV HTTP容量边界：实际上传链对重复、OHLC无效及有效输入各100,000行通过并发背压验证；错误行持久拒绝且零Bar，有效行完整写入并可幂等重试；详见[审计](../../../evidence/audits/2026-10-01-w4-v25-http-upload-error-capacity.md)及[SHA-256](../../../evidence/audits/2026-10-01-w4-v25-http-upload-error-capacity.sha256)。此Mac单服务切片不代表全市场容量、Ubuntu或生产长期队列恢复。

纯CSV解析器的100,000行重复/OHLC错误流式内存测试也通过；详见[审计](../../../evidence/audits/2026-10-01-w4-v25-csv-parser-capacity.md)和[SHA-256](../../../evidence/audits/2026-10-01-w4-v25-csv-parser-capacity.sha256)。此项不经过服务/数据库。

2026-10-01 有效数据容量边界：新增100,000行合成有效Parquet的实际单服务HTTP/PostgreSQL导入证据，含日分区、幂等、坏文件隔离和精确清理；见[审计](../../../evidence/audits/2026-10-01-w4-v25-parquet-valid-http-capacity.md)及[SHA-256](../../../evidence/audits/2026-10-01-w4-v25-parquet-valid-http-capacity.sha256)。仅验证Mac arm64单进程切片，未证明生产多服务容量、长序列/全市场表现、Ubuntu或来源许可。

2026-10-01 Linux/arm64容器边界：上述有效Parquet用例现也在Mac Docker Desktop的两个Linux/arm64服务实例及隔离PostgreSQL中通过，跨进程busy和幂等路径通过；见[审计](../../../evidence/audits/2026-10-01-w4-v25-parquet-linux-arm64-capacity.md)及[SHA-256](../../../evidence/audits/2026-10-01-w4-v25-parquet-linux-arm64-capacity.sha256)。该结果非Ubuntu x86_64最终验收或全市场分钟容量。

研究切分补充（2026-09-25）：已冻结`v2.5-research-split-v1`工程验证协议，按60个真实交易日设置20日预热、20日训练、10日验证、10日留出测试；脚本对本机归档Manifest与20个逐证券CSV的Hash、行数及48个日内窗口实测通过。研究指标容差冻结为绝对`1e-8`/相对`1e-7`，账本仍要求精确领域规则。该数据集存在幸存者偏差，佣金/税费政策仍UNSET；此协议不证明研究充分性、策略盈利或候选晋升，也不关闭本节模型训练、成本敏感度和PIT任务。详见[切分审计](../../../evidence/audits/2026-09-25-p6-research-split.md)。

## 1. 前置与范围

V2.2/2.3通过；V2.4连续观察可并行累计，完成V2必须具备其证据。

本阶段所有订单、券商资产和成交均来自隔离模拟环境。真实业务数据库、Qlib或RD-Agent在声明“已验证”时必须真正执行；替身需独立标注。

## 2. 开发任务

- [x] 本轮单源工程切片：复用导入/分区查询/版本隔离证据，补齐分钟上传持久排队、1,440,000 Bar发布额度、Web任务状态/排队取消及服务重启接续；真实隔离HTTP/PG配额429原子拒绝和Worker恢复通过，V2.2/V2.5定向Web E2E 5/5通过。排队可取消、运行中协作取消不支持；项目所有者已于2026-10-29确认当前候选验收，备用源及60日覆盖为DEFERRED。

2026-10-29接续复核及实现：已发布DataVersion只读详情/首屏查询和持久TestRun关联见[接线审计](../../../evidence/audits/2026-10-29-v25-minute-import-run-integration.md)；分钟上传持久完成队列、租约Worker、重启接续、owner隔离和排队取消，以及真实PG容量边界HTTP拒绝见[队列审计](../../../evidence/audits/2026-10-29-v25-minute-upload-queue.md)。当前浏览器测试用例5/5通过；所有者人工验收仍待确认。
- 备用分钟源接入及逐证券60交易日覆盖：`DEFERRED`（所有者2026-10-29批准，不计PASS，不阻塞上一项）；以下原任务中的备用源要求作为延期历史保留，其他未完成要求继续适用。

- [ ] 按版本数据阶梯扩容，Fixture 的10～20只约60交易日分钟切片及 BaoStock 真实 20 标的×60 个实际交易日 5 分钟切片已完成（57,600 行、20/20 SHA-256、逐日48窗口与真实归档回放通过）；BaoStock 已筛选出 5,219 个已上市 A 股，并完成 5/100/500/5219 标的 2019～2024 日线分档、Manifest、断点恢复、幂等和逐文件完整性验证。全量日线已归档并在隔离恢复副本校验 5,219/5,219 SHA-256；分钟级全量、长期限频稳定性和可覆盖60日的第二免费分钟源仍待验证，Ubuntu 人工子项已确认通过。
- [ ] 建立分区查询、增量导入、缓存键、任务排队/取消、并发与存储配额；扩容不改变小样本结果。
- [ ] 补基础模型的训练/验证/测试和Walk-forward、参数敏感度、成本/容量对比；测试集不参与调参，展示失败候选和覆盖不足。
- [x] 将在线监控100只上限与历史股票池独立配置；BaoStock 财务字段已实测含公告日但无修订链，行业分类无历史有效区间，相关财务/行业策略保持不激活；美股实际来源未接入保持范围标识。
- [x] Mac 已完成50/80/100数量与有效时间戳质量实测（50/50、80/80、100/100）；Ubuntu 实机人工验收已由用户确认通过；全量日线归档/隔离恢复已校验；分钟级全市场真实容量仍待真实环境/数据。

## 3. 同步 Web 开发

正式页：数据容量、导入队列、模型验证、报告比较和资源状态。验收页：扩容档位、固定小样本回归、容量结果、范围与限制。

验收中心路径：`/acceptance/v2/v2.5`。场景参数提交到后端TestRun编排接口，后端调用业务API并汇集证据。浏览器不直接写领域数据，不自行判定成交。当前已提供正常、拒绝和恢复场景。

## 4. 人工验收步骤

1. 依次导入两个规模档，运行同一小样本确认规范数值未变化，缓存不跨DataVersion复用。
2. 启动多个任务确认排队与取消；中途失败不发布半份结果。
3. 查看训练/验证/测试区间、模型输入和成本敏感度，确保未来数据检查有效。
4. 汇总来源覆盖、分钟回放、连续观察、Mac资源和Ubuntu烟测，签署各子项，不把美股Fixture标真实数据通过。

每次保存testRunId、场景版本、代码/镜像、数据/规则版本、种子及注入事件序列、实际/预期、截图/Trace。判定依据必须是后端事实和独立检查，不能只看Toast成功提示。

## 5. 异常与替身边界

全量规模和性能上限未实测不得标PASS；数据不足保留小规模可用版本，未覆盖档位NOT_RUN。

## 6. 产物与验证

目标产物：数据扩容/缓存/资源策略、模型验证报告、性能基线、V2验收证据与Ubuntu缺口清单。

自动验证：扩容前后小样本回归、缓存隔离、Walk-forward/PIT、资源预算/取消/恢复、V2全阶段Web回归。

需求/测试追踪：QNT-06/09/10、DAT、OPS-08；T08/09/12/37/38/44/45；DV-02/04/05、VT02/04/05。

退出条件：开发任务完成、Web真实可操作、全部适用检查PASS、人工签署、已知限制写入证据。填写[本版验收表](./99-acceptance.md)，未完成项不得勾选通过。

## 7. 阶段交付待办（完成后勾选）

当前C6增量：备用源延期决定已登记；本轮单源工程与自动验证已通过，项目所有者于2026-10-29确认候选验收并经独立复核。签收边界见增量审计；不从下述2026-09-20历史V2.5签署推定当前结论。

以下勾选只记录本阶段交付进度，不能代替第2节逐项开发任务或版本验收结论。开发者凭实现/实测证据勾选开发项；“人工验收”仅在用户实际确认后勾选，不预填PASS。

- [x] 契约、数据结构、场景定义和预期结果已冻结（V2.5 场景版本 1.0.0）。
- [x] 第2节已完成小规模扩容切片、全量多年日线归档/隔离恢复和 Mac 50/80/100 数量及时间戳质量实测，真实依赖与 Fixture 替身明确；分钟级全量多年真实容量仍未完成。
- [x] 正式Web功能页及验收中心正常/异常/恢复场景完成。
- [x] 命令、实际URL、Fixture/DataVersion、资源预算和证据目录已补齐；全量/Ubuntu缺口明确列出。
- [x] 开发者按第8节从准备到导出亲自执行，保存退出码和断言证据。
- [x] 重复/恢复验证、监控池档位和 Ubuntu 实机人工子项验证完成；分钟级全量、限频稳定性和 V2.4 观察门禁仍未完成。
- [x] 用户已通过Web及命令证据完成 V2.5 整体人工验收；Ubuntu 实机子项已于 2026-09-12 确认通过，整体确认时间为 2026-09-20。
- [x] 操作说明与限制已更新，[本版验收表](./99-acceptance.md)已同步；V2.5 仍因分钟级全量、真实长期稳定性、备用分钟源和 V2.4 观察门禁保持 PARTIALLY_IMPLEMENTED。
- [x] 2026-10-29单源工程增量：持久分钟上传队列、租约Worker重启恢复、排队取消、owner隔离及全局Bar额度已通过真实隔离HTTP/PG与定向Web验证；见[增量审计](../../../evidence/audits/2026-10-29-v25-minute-upload-queue.md)。
- [x] 2026-10-29单源候选人工验收：项目所有者确认通过，独立复核后记录`C6_LOCAL_SINGLE_SOURCE_ENGINEERING` PASS；签收限制见[候选审计](../../../evidence/audits/2026-10-29-v25-minute-upload-queue.md)。

## 8. 阶段验收操作手册

### 8.1 当前可执行性与验收准备

本轮单源范围不执行备用源下载/导入/探针，也不要求TDX文件路径；下列真实源采集与TDX命令仅保留为历史接口说明，不是本次执行指令。准备阶段使用已有冻结归档或明确合成Fixture；任何新增来源调用/研究用途需另行满足原门禁。下述历史`VERIFIED_EXECUTABLE`仅对应2026-09-11旧手册，本轮增量的命令和结果见2026-10-29手册补充及其审计。

#### 2026-10-29 单源增量候选手册（工程证据已执行，所有者已验收）

项目根目录：`/Users/huangbosong/Documents/ChatGPT/StockQuant`。页面：`http://127.0.0.1:8080/acceptance/v2/v2.5` 与 `http://127.0.0.1:8080/acceptance/v2/v2.2`。输入只限本地合成CSV/已有已发布DataVersion；本次机器验收使用16,000行合成CSV（848,055 bytes，SHA-256 `8a1aa25c16e677629955cefc9f691d5282de1782cfe1b97a7a8ee074b68368b8`），不使用Provider。不得把该样本描述为真实行情或真实市场性能数据。

机器执行命令：

```bash
pnpm --filter @stockquant/market-data-service minute-upload:http-restart-smoke
pnpm --filter @stockquant/web test:e2e tests/e2e/v22-csv-upload.spec.ts tests/e2e/v25-durable-minute-upload-queue.spec.ts
pnpm --filter @stockquant/market-data-service test
pnpm --filter @stockquant/platform-api-service test
pnpm contracts:check
pnpm docs:check
git diff --check
```

预期：HTTP/PG smoke 输出`status=PASS`、上传队列重启恢复、排队取消、错误owner任务读取404、解析失败无部分发布、已满1,440,000 Bar时导入HTTP返回429且导入记录数不增加；浏览器定向测试5/5通过。此次实际结果见[分钟上传队列审计](../../../evidence/audits/2026-10-29-v25-minute-upload-queue.md)。若排队任务变为`RUNNING`后才执行取消，当前合同返回冲突；只可对仍为`QUEUED`的任务验证取消。失败任务需由所有者显式重新提交Finalize；进程重启后等待租约回收，再由Worker接管。烟测数据库为随机名称并由脚本自动删除，禁止将连接串改指向共享库。

人工页面核对：启动本地V2栈后，在V2.2页通过CSV文件选择和上传完成一个大于700KB的本地合成输入，提交预览/导入并确认队列状态；随后在同一浏览器打开V2.5页，点击“读取持久导入队列状态”确认任务状态及尝试次数，并在任务保持`QUEUED`时验证“取消排队中的导入”。任务开始运行时不测试取消按钮。若无适合的本地测试文件，使用上述机器烟测证据，不下载真实行情文件。读已发布版本时输入DataVersion并点击“核验持久导入并创建TestRun”；页面应展示绑定结果。人工完成后只在[本版验收表](./99-acceptance.md)填写所有者实际确认，不修改历史2026-09-20签署。

手册状态：VERIFIED_EXECUTABLE。历史S2小规模切片实测日期为2026-09-11；本轮单源增量手册已按上文命令实跑并由所有者验收。V2.5原全量容量、长期稳定性、PIT、观察及整版门禁仍未完成。

2026-10-29 C6增量状态：真实分钟导入查询纵切的专用Web/API/隔离PG/同Run CLI烟测已通过，操作命令和范围见[接线审计](../../../evidence/audits/2026-10-29-v25-minute-import-run-integration.md)。本增量不把旧手册升级为整阶段可执行；完整C6手册仍需完成拒绝/取消/重启流程和本轮候选复核。

前置服务：V2数据/回放/模型Worker、队列/缓存/资源监控及目标架构烟测环境。

固定输入：冻结小样本和10～20只约60日扩容档；训练/验证/测试日期、资源预算、并发上限在运行前填写。

| 开发交付时必须填写 | 当前值 |
|---|---|
| 实测代码Commit或工作区Hash/验证日期 | 本次工作区验证，2026-09-11；提交后以 Git Commit 为准 |
| 项目根目录、Node/pnpm/Python/uv及Docker版本 | `/Users/huangbosong/Documents/ChatGPT/StockQuant`；Node 24.1.0；pnpm 10.34.5；Docker Compose 容器运行 |
| Web基础URL/身份登录或会话建立方式 | `http://127.0.0.1:8080`；本地验收身份 `acceptance-owner-1`；不记录密码/token |
| 本阶段Web路由 | `/acceptance/v2/v2.5`（目标） |
| 正式页面的真实入口/跳转链接 | `http://127.0.0.1:8080/acceptance/v2/v2.5` |
| 固定输入/数据版本/确切日期/Hash、规则与成本版本 | 历史归档为`v2.5-cn-minute-20x60-v1`（20证券×60交易日×57,600根5分钟Bar，Manifest见`docs/evidence-v2.5.md`）；当前Platform验收场景使用独立合成内存输入`v2.5-acceptance-synthetic-fixture-v2`（20×60=1,200行），不能把后者当作前者的导入/存储/市场容量证据；Mac监控池使用Tencent LIVE_SOURCE |
| 配置文件及必需环境变量名/非秘密测试值 | Compose 默认 V2.5 配置；`STOCKQUANT_BROKER_MODE=FAKE`、`STOCKQUANT_LIVE_TRADING_ENABLED=false` |
| 外部故障目标及可执行命令、恢复/隔离清理入口 | recovery 场景使用固定游标/取消断言；不操作共享卷，不删除业务数据库 |
| 预期耗时、轮询超时、实际观察期/预算 | 单场景 <60 秒；资源预算 1024 MB / 120 秒；V2.4 观察门禁独立累计 |

真实免费源分档导入命令：`uv run --with baostock python scripts/import-baostock-daily.py --sample-size 5 --start-date 2019-01-01 --end-date 2024-12-31 --output-dir /tmp/stockquant-baostock-daily-s5`；扩大到 100 时将 `--sample-size` 改为 `100`。输出目录包含按证券分区的 CSV 与 `manifest.json`，中断后使用相同参数和目录续跑；5/100/500/5,219 日线档均已完成。归档位于 `data/local/baostock-daily-2019-2024-v1`（Git 忽略）；恢复副本完整性见 `docs/evidence-v2.5.md`。真实分钟扩大命令为 `pnpm v25:import-baostock-minute-sample -- --sample-size 20 --timeout-seconds 30`；20×60 历史归档和两轮×三证券有界稳定性/恢复探针已通过，真实交易时段长期限频与恢复仍需独立观察。已提供本地通达信（TDX）文件时，可使用只读备用命令 `pnpm v25:import-tdx-minute-sample -- --tdx-dir /绝对路径/通达信数据根目录 --symbols sh600000,sz000001 --start-date 2024-01-02 --end-date 2024-03-29 --output-dir data/local/tdx-minute-5`；它读取既有 `fzline/*.lc5` 或 `.5`、输出带源端 SHA-256 的 Manifest，当前因未提供源文件仍为 `NOT_RUN`。

### 8.2 初始化与启动

在上表填写的项目根目录运行；工具版本按锁文件/项目说明准备。首次开发由开发者生成锁文件和脚本，验收者不负责补建环境。环境变量按上表配置；保持FAKE券商与模拟账户，真实模型仅在本阶段明确要求且预算已配置的场景调用。

```bash
# 终端A：先确认实际执行目录为项目根目录
pwd
pnpm install --frozen-lockfile
pnpm stack:up -- --stage V2.5

# 终端B：同一项目根目录，保持开发服务器运行
pnpm dev:web
```

预期：安装与stack入口退出0；stack输出本阶段服务、端口、健康/迁移及持久卷状态。依赖不可用应非零并说明原因；不能删除旧业务卷重试。Web服务器持续运行并输出基础URL，尚在运行不要求退出码0。若已使用容器化Web，则填写已验证入口并避免重复占用端口。Ubuntu部署必须补齐实际镜像拉取/启动/迁移命令，不能仅用dev:web代替发布验证。

本轮只读导入查询纵切有已验证的隔离运行入口（从仓库根目录）：

```bash
pnpm --filter @stockquant/platform-api-service v25:minute-import-run-smoke
```

命令先构建Market Data、Platform和Web，再经`run-isolated-postgres-command.mjs`创建受限临时PostgreSQL/网络，使用随机端口启动服务并运行Chromium。启动后输出本次Web/API/Market Data动态URL，手工页面路由为`/acceptance/v2/v2.5`。烟测输入是V2.2 `normal`合成Fixture（6条Bar）；Web按钮“核验持久导入并创建TestRun”只对已有DataVersion读元数据和首屏，保存同一TestRun后用CLI `--check-only`复核。预期两项断言PASS、异主读Run为403、CLI退出0，最后临时容器/网络/数据库清理并核验。无需Provider、研究用途授权、券商或活动卷；此纵切不验证队列、总存储额度、取消/重启或历史归档容量。

初始化在验收中心“准备隔离运行”完成；CLI场景入口也负责同样的准备，两者调用同一业务API。准备后记录testRunId、accountId、namespace及Fixture/DataVersion；初始化业务本身是测试对象时不得预先完成被测动作。缺源/凭证/历史数据时显示缺项，不静默换成Fake并报真实场景通过。

### 8.3 Web逐步操作及预期结果

1. 登录上表实际Web地址，进入“开发验收中心→V2→V2.5”；检查页面版本、模拟模式、服务能力与固定输入。
2. 每个场景点击“准备隔离运行”，核对参数后记下testRunId；正常/异常/恢复使用独立运行，场景内部的重复或恢复操作继续使用原运行及业务幂等键。
3. 按下表执行。操作按钮为目标交互，交付时开发者必须换成实际页面名称/按钮及路由；预期必须从业务明细读取，不能只看“任务完成”。

| 场景ID（阶段内唯一） | 场景 | 点击顺序/输入 | 预期结果与核对点 |
|---|---|---|---|
| normal | 扩容与模型验证 | 记录小样本基线→导入第二档→在扩容库重跑同一小样本；启动已冻结时间切分的模型验证。 | 规范结果不变；模型区间/预热/标签窗口明确；测试集不参与拟合调参，报告保留失败样本。 |
| rejection | 资源与缓存隔离 | 同时提交超并发任务→取消一个等待/运行任务；变更DataVersion重跑；执行预算超限样本。 | 按策略排队/取消；缓存不串版本，失败不发布半结果；超档明确未支持。 |
| recovery | 扩容任务恢复 | 中断增量导入/计算再恢复，运行目标架构烟测并核对V2观察门禁。 | 无重复导入/发布；记录耗时/峰值/是否模拟架构；未满观察或未测容量不可通过。 |

4. 从运行详情打开关联正式页面，执行一次刷新/关闭再打开；核对长任务后台状态、历史证据和加载/失败/陈旧提示。
5. 每项记录实际结果、截图与业务ID。异常场景“预期拒绝”被正确验证时断言可PASS，但被测业务操作仍显示拒绝；若意外接受则断言FAIL。

### 8.4 命令行复验与相同运行核对

在项目根目录执行以下目标命令。stage/scenario必须匹配8.3定义；CLI与Web共用场景版本、Fixture和断言。每条命令执行后立即查看退出码，任何非零先保存错误再定位，不能继续假定本阶段通过。

```bash
pnpm verify:stage -- --stage V2.5 --scenario normal --seed 20260907
# 紧接上一命令执行；0表示全部场景断言通过
 echo $?
pnpm verify:stage -- --stage V2.5 --scenario rejection --seed 20260907
 echo $?
pnpm verify:stage -- --stage V2.5 --scenario recovery --seed 20260907
 echo $?
pnpm verify:stage -- --stage V2.5 --suite code
 echo $?
pnpm test:e2e -- --stage V2.5
 echo $?
```

预期：各场景输出testRunId、实际数据/模型/券商模式、断言expected/actual及证据位置；预期内拒绝场景验证成功退出0，意外副作用/缺脚本/缺必需依赖/未满观察条件非零。恢复场景需外部动作时输出已核实目标和步骤，停留WAITING；完成动作后复验原run，不伪称Web可重启宿主。浏览器测试必须实际运行本阶段用例，零用例/全跳过不能退出0。

再对Web中已运行的同一testRunId执行只读核对，避免仅创建新样本掩盖页面问题：

```bash
# 粘贴Web运行详情中的实际testRunId，再按回车；这是普通ID，不是凭证
read -r acceptance_run_id
pnpm verify:stage -- --stage V2.5 --run "$acceptance_run_id" --check-only
 echo $?
pnpm evidence:export -- --run "$acceptance_run_id"
 echo $?
```

本次复核使用的实际Web TestRun为`39a256a1-0e6f-41d4-a852-1f7f4f649099`，同Run CLI与导出均通过。证据Manifest SHA-256：`bd513afde6fbaa85edba7d7888581b5dc2be322c9cec647ee4c22dd8376dcdd3`。运行仍标记观察门禁`V2.4_20_TRADING_DAYS_PENDING`、`researchUseAllowed=false`。

check-only仅查询此运行后端事实并追加检查证据，不创建新订单、不重放成交或发起模型调用；空ID/错误stage/越权run必须拒绝。导出只含脱敏数据，输出实际目录和Manifest Hash，不自动勾选人工验收。端到端正常/异常/恢复运行产生不同ID，导出时分别保存。

本阶段代码测试覆盖要求：扩容前后小样本回归、缓存隔离、Walk-forward/PIT、资源预算/取消/恢复、V2全阶段Web回归。 在交付时把映射到的实际Domain/DB/契约/服务内测试命令补入本节，注明执行目录、测试文件或套件、退出码和报告；verify:stage必须展示实际调用的测试清单，不能空壳返回0。Python服务使用自身锁定环境，不串用其他服务虚拟环境。

### 8.5 交叉核对、失败定位与恢复

交叉核对：小样本规范Hash/容差、缓存键、训练输入日期和性能实际/预算对照；Mac/Ubuntu结果单独记录。

先检查Web与CLI的testRunId、输入/策略/代码版本和模式是否一致，再按Trace查平台、领域、适配器与持久化证据。页面错误而CLI正确，记录Web失败；二者都错则保留领域断言失败。缺能力先查健康/迁移/数据与日志，不修改余额或订单状态使断言通过。

独立复跑创建新run；测试幂等/检查点/重启恢复则使用原run和原幂等键。故障发生后保留旧证据，修复后新增运行或检查记录；不得清空账本、随机更换seed直到通过。真实观察窗口、来源验证和实际模型调用与加速/录制测试分别记录。

### 8.6 验收记录与收尾

| 场景/检查 | Web实际结果与截图 | 命令/退出码/报告 | testRunId/业务ID | 结论 |
|---|---|---|---|---|
| normal | 后端场景通过；Web E2E 已通过 | `pnpm verify:stage -- --stage V2.5 --scenario normal --seed 20260907`，退出码 0 | `3bee90bc-2c75-4ebb-989e-07be04b80069` | PASS（自动） |
| rejection（含全部子场景） | 后端场景通过 | `pnpm verify:stage -- --stage V2.5 --scenario rejection --seed 20260907`，退出码 0 | `4f3de864-8604-4efb-8118-a54fffea3742` | PASS（自动） |
| recovery（含实际外部动作） | 后端场景通过 | `pnpm verify:stage -- --stage V2.5 --scenario recovery --seed 20260907`，退出码 0 | `0391745a-de9d-4e37-a0c9-0110e5052e9d` | PASS（自动） |
| Web同run只读核对与证据导出 | 同 Run 核对和导出通过 | `--check-only`、`pnpm evidence:export` 均退出码 0；Manifest `0603d5260a4c2007c3fd6b807e4934ccb8d53d8f2956852041b5b4e1fc28e885` | `3bee90bc-2c75-4ebb-989e-07be04b80069` | PASS |
| 本阶段代码测试/实际观察适用项 | 代码套件和 Web E2E 通过；全量容量与 V2.4 观察未完成 | `pnpm verify:stage -- --stage V2.5 --suite code`、`pnpm test:e2e -- --stage V2.5`，均退出码 0 | 见 `docs/evidence-v2.5.md` | PASS（代码）/ NOT_RUN（全量观察） |
| 用户人工验收 | 用户已确认页面、命令和证据导出 | 不由脚本代签 | 用户确认 / 2026-09-20 | PASS（实现范围） |

追加工程边界证据：分钟上传同一 owner 并发配额与取消释放的 PostgreSQL 集成检查见[W4并发配额审计](../../../evidence/audits/2026-09-30-w4-minute-upload-concurrency-quota.md)及[SHA-256](../../../evidence/audits/2026-09-30-w4-minute-upload-concurrency-quota.sha256)。这不改变本阶段分钟全量容量和观察门禁结论。

2026-10-01 当前工作区复验追加：V2.5 normal/rejection/recovery三场景分别6/6、3/3、3/3断言PASS；三个Run均通过相同ID只读核对及脱敏Manifest导出，且观察门禁仍显式WAITING。Run和Hash详见[本次W4验收审计](../../../evidence/audits/2026-10-01-w4-v25-current-worktree-scenarios.md)及[SHA-256](../../../evidence/audits/2026-10-01-w4-v25-current-worktree-scenarios.sha256)。这不覆盖历史来源、分钟全量容量或长期观察要求。

2026-10-02 V2.5当前工作区隔离完整code suite：`pnpm verify:stage -- --stage V2.5 --suite code`退出0。Trade/Portfolio/Market Data隔离数据库检查、69项Python Adapter、Ops和市场数据HTTP/PG集成均PASS；Linux/arm64 Parquet smoke对100,000行/500只/5个交易日完成HTTP导入、持久化、100页读取、40行过滤查询、幂等、跨实例锁和损坏文件取消，峰值RSS 197,636 KiB、零外部调用。由于readiness smoke原先将测试PostgreSQL限制在5433，首次运行在断言前保留失败；随后加入Docker Inspect证明随机端口绑定只读/tmpfs/资源受限容器的安全通路及4个验证测试，复跑通过并确认隔离容器/网络/镜像清理。详见[W4完整V2.5隔离套件审计](../../../evidence/audits/2026-10-02-w4-v25-isolated-capacity-code-suite.md)及[SHA-256](../../../evidence/audits/2026-10-02-w4-v25-isolated-capacity-code-suite.sha256)。此结果仍是Mac宿主Linux容器和合成输入，不代替全量市场数据、60日备用源、交易时段长期稳定性、真实PIT、Ubuntu实机或用户新范围签署。

2026-10-01 HTTP分页容量追加：Linux/arm64隔离V2.5完整代码套件PASS，并从同一100,000行Parquet版本经HTTP游标分页读取100页×1,000行，100,000个证券/Bar键全部唯一且数值有效；单证券单日筛选跨2页返回40行。详见[Parquet HTTP分页容量审计](../../../evidence/audits/2026-10-01-w4-v25-parquet-http-pagination.md)及[SHA-256](../../../evidence/audits/2026-10-01-w4-v25-parquet-http-pagination.sha256)。这是合成容量切片，阶段真实来源、Ubuntu x86_64、全市场分钟、长期稳定性、V2.4观察与人工验收仍未通过。

2026-10-01 Parquet单文件容量边界复验：PyArrow适配器的单文件最大行数为100,000；超出至1,440,000行时按合同返回422，不因此扩大输入上限。支持范围下双Linux/arm64实例HTTP→隔离PG上传/预览/发布、并发互斥、幂等、100页无重复完整读回、过滤分页和损坏文件取消均PASS；RSS峰值192,556 KiB，完整V2.5 code suite受控重跑退出0。细节见[W4边界审计](../../../evidence/audits/2026-10-01-w4-v25-parquet-capacity-limit.md)及[SHA-256](../../../evidence/audits/2026-10-01-w4-v25-parquet-capacity-limit.sha256)。1.44M仓储层和归档HTTP证据保持各自范围，不表示单个Parquet可一次导入；Ubuntu x86_64、真实源许可、全市场生产负载及长期观察依旧未验证。

同日有效性更正：上段最初引用的Run经代码复核发现其旧场景引擎硬编码并发、缓存、预算及恢复结果，保留为历史，不接受为实际行为证明；初轮动态Fixture Run也因计量边界调整而被替代。当前代码、Run及Hash统一见[最终代码场景审计](../../../evidence/audits/2026-10-01-w4-v25-final-code-scenarios.md)和[SHA-256](../../../evidence/audits/2026-10-01-w4-v25-final-code-scenarios.sha256)。新场景仍不替代生产队列、数据库恢复、真实Qlib/PIT、分钟全量容量、来源观察或当前范围人工验收。

记录不适用子项的范围依据，不能将必需项改为不适用绕过门禁。归档后在[本版验收表](./99-acceptance.md)填写证据链接和结论。清理只针对本轮已结束的隔离运行，默认保留证据；停止测试不能删除数据库卷或取消无关任务。

2026-10-03 W4 V2.5当前隔离代码套件复验：`pnpm verify:stage -- --stage V2.5 --suite code`最终明确退出0，Market Data 71、Research Automation 203、Platform API 166、Trade Execution 67、Quant Research 91、Historical Replay 25、Governance 22、Portfolio Risk 5项单测均通过；适用构建/契约/集成亦通过。Linux/arm64双实例Parquet HTTP/PG容量验证100,000行、100页唯一读回、40行过滤查询、互斥/幂等/取消，峰值RSS 193,640 KiB；输入标记`synthetic; UNCONFIRMED; researchUseAllowed=false`。无外部行情/模型/Broker调用，隔离资源已清理。首次输出缺少可读取的总退出码，完整重跑退出0的记录已保留。详见[W4审计](../../../evidence/audits/2026-10-03-w4-v25-after-scheduler-artifact-regression.md)、[JSON](../../../evidence/audits/2026-10-03-w4-v25-after-scheduler-artifact-regression.json)和[完整日志](../../../evidence/audits/2026-10-03-w4-v25-after-scheduler-artifact-regression.log)。原审计SHA-256文件是2026-10-03点时源码清单，当前`package.json`变化后该旧清单不再代表当前工作树；历史文件保留。该结果不改变V2.5真实市场/PIT/分钟全量、第二源/长期观察、Ubuntu或人工验收门槛。

2026-10-03 当前源码容量复验：完整V2.5 code suite运行至Linux/arm64 Parquet隔离容量门禁并通过。100,000行合成Parquet（500证券×200 Bar、5日）成功写入并唯一分页读回；损坏上传拒绝/取消、双服务并发busy、幂等均通过，峰值服务RSS 199,676 KiB、临时数据库72,561,123 bytes，Provider/model/Broker外呼0。此为Mac Docker Linux/arm64容量切片，不代替分钟全市场、真实交易时段长期观察、Ubuntu、备用源60日、PIT或V2.4观察。完整当前W4范围审计见[V2.3/V2.5回归](../../../evidence/audits/2026-10-03-w4-v23-v25-current-code-rerun.md)及[SHA-256](../../../evidence/audits/2026-10-03-w4-v23-v25-current-code-rerun.sha256)。

2026-10-06 当前工作树V2.5隔离代码/容量回归：完整`pnpm verify:stage -- --stage V2.5 --suite code`退出0；Market Data 71、Research 218、Platform 198、Trade 67、Quant 91、Replay 25、Governance 22、Portfolio Risk 5单测及适用契约/构建/集成通过。Linux/arm64双实例Parquet HTTP/PG隔离烟测使用标注`synthetic; UNCONFIRMED; researchUseAllowed=false`的100,000行Fixture（500证券×200 Bars、5日），100页唯一读回、过滤40行、幂等、互斥及损坏上传取消通过；峰值RSS 188,352 KiB，数据库72,610,275 bytes，外部/模型/Broker调用0。该Mac Docker合成切片不证明全市场分钟容量、来源许可、60日备用源、真实研究/PIT、Ubuntu、长期稳定性或V2.4观察，阶段仍PARTIALLY_IMPLEMENTED。详见[W4审计](../../../evidence/audits/2026-10-06-w4-v25-current-code-suite.md)、[完整套件日志](../../../evidence/audits/2026-10-06-w4-v25-current-code-suite.log)及[输入源码SHA（历史执行快照，绑定本次运行输入）](../../../evidence/audits/2026-10-06-w4-v25-current-code-suite.sources.sha256)。

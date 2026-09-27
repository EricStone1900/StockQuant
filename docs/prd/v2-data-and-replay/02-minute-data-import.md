# V2.2 历史分钟数据导入与校验

状态：PASS（用户人工验收及复验通过，2026-09-09）。版本入口：[README](./README.md)。共同约束：[三版共同规则](../05-three-version-delivery.md)。

## 1. 前置与范围

V1数据Artifact可用，V2.1来源及用途标签规则已冻结。

本阶段所有订单、券商资产和成交均来自隔离模拟环境。真实业务数据库、Qlib或RD-Agent在声明“已验证”时必须真正执行；替身需独立标注。

## 2. 开发任务

- [ ] 定义MinuteBar：securityId/market/frequency/barStart/barEnd/availableAt、时区、RAW OHLCV/amount、单位、来源/版本、适用状态及限制价引用；明确时间戳代表开端还是结束。
- [ ] 支持用户CSV/Parquet文件字段映射、导入预览、错误行、分区存储和断点续传/续导；同输入幂等，修订发布新版本。
- [ ] 检测重复冲突、价格范围、量额单位、午休/非交易时段、缺分钟、日线聚合差异；数据缺失与停牌严格分开。
- [ ] 按证券/日期分区读取、流式处理，避免全部分钟数据装入内存；构建小样本与可重复坏数据包。
- [ ] 历史股票池/上市退市/公司行动及MarketRuleSet有效期与分钟数据关联；缺少必要证据标限制用途或阻塞相应回放。

## 3. 同步 Web 开发

正式页：分钟文件导入向导、列映射、错误行、覆盖热图/表、指定日行情和版本比较。验收页：单位错、重复、午休、缺失、未来Bar样本。

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

受限CSV实现补充（2026-09-25）：V2.2页面`/acceptance/v2/v2.2`新增小文件CSV上传、列映射、预览/逐行错误和确认导入，API为`POST /api/v1/acceptance/v2/v2.2/csv/preview`与`/csv/import`。当前仅接收CN_A、1m、RAW，强制Asia/Shanghai、BAR_START、SHARES、CNY语义，上限700 KB/10,000行；导入复用PostgreSQL持久仓储，以原始内容SHA-256实现同内容幂等，页面/API要求本地用户会话。冻结的有效/无效合成输入在`fixtures/v2/v2.2-csv-smoke/`，`pnpm fixtures:check`核对Hash。市场数据服务40项单测与临时HTTP→专用`market_data_test` PostgreSQL→进程重启→分页读取/幂等烟测通过（有效两行SHA-256 `86a4fcbb29d97f27925753c132c8d95ee1971c5f1c7583da6be2278be1c747d8`；无效文件逐行拒绝并持久保存）；平台/API与Web构建、类型检查及隔离Mock Playwright页面流程通过。CSV上传请求Schema、OpenAPI和消费者兼容规则已登记。尚未支持Parquet、分块流式大文件、断点续传、按日期物理分区、完整Web→平台API→市场服务同run场景证据；第2节任务与第7节交付清单保持未完成，原2026-09-09人工签署未被改写。见[P6 CSV小文件导入审计](../../../evidence/audits/2026-09-25-p6-csv-minute-import.md)。

导入身份修复（2026-09-25）：持久导入唯一键现在包含原文SHA-256、规范列映射与冻结的市场/频率/复权/时区/时间戳/单位语义；同字节不同映射得到不同DataVersion，同解释重试仍幂等。`market_data_test`完成旧主键数据回填/迁移、19/19 PostgreSQL集成和临时真实HTTP服务重启读取；不同映射分别恢复正确证券，旧原文Hash继续作为数据来源校验值。Parquet、流式/续传、配额/取消、日期分区和完整浏览器链仍未完成。详见[导入身份审计](../../../evidence/audits/2026-09-25-p6-csv-import-identity.md)。

来源与许可追踪增量（2026-09-25）：CSV上传现在要求明确来源名称、可选引用、许可声明、操作者确认状态及取得时间，并把这些字段纳入导入身份和持久版本Manifest。操作者未确认时仍可保留原始导入记录，但`researchUseAllowed=false`；确认状态只是操作者声明，不代表系统验证了许可或替代人工审查。旧导入迁移为来源未知、研究使用关闭。市场数据服务构建/41项单测、专用PostgreSQL集成20/20、三种实际HTTP导入（不同映射及相同映射不同许可声明）幂等/重启回读烟测通过；确认许可返回allowed，未知许可返回blocked。Web单项Playwright 1/1、Web类型检查及合同/Fixture基线通过。2026-09-09原人工验收未改写；Finalize流式读取已补，Parquet、有界批次处理、日期分区及完整Web→平台→业务服务同TestRun闭环仍未完成。详见[P6导入身份审计](../../../evidence/audits/2026-09-25-p6-csv-import-identity.md)。

流式Finalize增量（2026-09-25）：最大64 MiB上传会话逐个查询512 KiB PostgreSQL块，送入增量SHA-256、fatal UTF-8解码和有状态CSV解析器，不组装整文件Buffer/string或输入行矩阵。接受Bar按最多1,000条批次写入事务临时表，整文件Hash和质量校验通过后原子发布；失败回滚并释放FINALIZING。重复键索引和错误详情仍受100,000行上限约束保存在内存。服务47项单测/类型检查/构建及随机专用PG双进程重启HTTP smoke（848,055字节/16,000行，落库行数精确匹配）通过。Parquet、日期物理分区和更大规模资源容量测试未完成；第2节与第7节未勾选，2026-09-09人工验收保持原样。见[P6流式Finalize审计](../../../evidence/audits/2026-09-25-p6-streaming-csv-finalize.md)。

2026-09-26 跨实例容量保护：PostgreSQL配置下，CSV/Parquet预览、导入和Finalize现在共用数据库session advisory lock，连接持有到HTTP响应排空；竞争请求返回429和`Retry-After: 1`，数据库协调不可用时fail-closed返回503。两套独立Market Data进程共用随机隔离PG的HTTP smoke验证忙拒绝、正常响应后的锁释放、客户端断开后的锁释放及下一请求获准；数据库和进程均清理。`market-data-service`构建与单测57/57通过。此项只证明共享PostgreSQL进程间的并发互斥，不证明跨主机网络分区/故障切换、容器/Ubuntu内存预算、生产负载或Paper连续性。来源及命令见[P6解析器及闸门审计](../../../evidence/audits/2026-09-26-p6-minute-parser-memory.md)。

Docker Desktop ARM64补充验证（2026-09-26）：以当前Market Data Dockerfile构建Linux/arm64镜像，在两只相互独立、各2 GiB RAM/2 CPU/128 PIDs的临时容器内，通过临时PG库复测并发拒绝和锁释放；活动服务容器未重启，精确测试库/容器已删除。此项仍非Ubuntu实机或正式行情采集压力验证。

10万行拒绝路径容器容量补充（2026-09-26）：同一Linux/arm64镜像在单只2 GiB RAM/2 CPU/128 PID限制容器中完成100,000重复键和100,000坏OHLC两种真实HTTP分块上传→Preview→Finalize场景；各自100,000条拒绝错误持久化、0 Bar发布、重复Finalization幂等；服务RSS峰值330,584/339,960 KiB，cgroup总峰值461,256 KiB。两次并发请求均验证429/Retry-After；各自随机PostgreSQL库精确删除，临时容器移除，活动服务不重启。宿主默认smoke亦通过。此证据覆盖固定拒绝输入在Docker Desktop ARM64的有限资源表现，不等于Ubuntu原生、生产共享PG余量、长期持续流量或多机故障验收；详细方法与报告见[P6解析器及闸门审计](../../../evidence/audits/2026-09-26-p6-minute-parser-memory.md)。

## 7. 阶段交付待办（完成后勾选）

以下勾选只记录本阶段交付进度，不能代替第2节逐项开发任务或版本验收结论。开发者凭实现/实测证据勾选开发项；“人工验收”仅在用户实际确认后勾选，不预填PASS。

- [ ] 契约、数据结构、场景定义和预期结果已冻结。
- [ ] 第2节后端任务完成，真实依赖与替身明确。
- [ ] 正式Web功能页及验收中心正常/异常场景完成。
- [ ] 命令、实际URL、Fixture路径/Hash和配置说明已补齐，待实现占位已消除或明确列为范围外。
- [ ] 开发者按第8节从准备到导出亲自执行，保存代码版本、退出码、截图/Trace和断言证据。
- [ ] 重复/恢复及适用观察期验证完成，未覆盖项如实记录。
- [ ] 用户已通过Web及命令证据完成人工验收，记录确认时间/结论。
- [ ] 操作说明与限制已更新，[本版验收表](./99-acceptance.md)已同步。

## 8. 阶段验收操作手册

### 8.1 当前可执行性与验收准备

手册状态：VERIFIED_EXECUTABLE（2026-09-09；Docker Compose、API、导入和 Web E2E 已实测）。

实测入口：`docker compose -f infra/compose/docker-compose.yml --profile web up -d`；Web `http://127.0.0.1:8080/acceptance/v2/v2.2`；预览 `GET http://127.0.0.1:3000/api/v1/acceptance/v2/v2.2/preview`；统一场景 `POST /api/v1/acceptance/v2/v2.2/runs`，参数 `normal|rejection|recovery`；代码 `pnpm build && pnpm test`；浏览器 `PLAYWRIGHT_BASE_URL=http://127.0.0.1:8080 pnpm --filter @stockquant/web test:e2e`。

前置服务：数据服务、真实存储/分区索引、导入Worker、Web列映射与质量页面。

固定输入：3～5只、5～10交易日CSV/Parquet样本；记录具体文件Hash、列映射、barStart/barEnd时区、量额单位及日线对照。

| 开发交付时必须填写 | 当前值 |
|---|---|
| 实测代码Commit或工作区Hash/验证日期 | 待实现后填写 |
| 项目根目录、Node/pnpm/Python/uv及Docker版本 | 待实现后填写 |
| Web基础URL/身份登录或会话建立方式 | 待实现后填写；不记录密码/token |
| 本阶段Web路由 | `/acceptance/v2/v2.2`（目标） |
| 正式页面的真实入口/跳转链接 | 待实现后填写，按8.3逐项核实 |
| Fixture文件/数据版本/确切日期/Hash、规则与成本版本 | 待实现后填写；不能只写“小样本” |
| 配置文件及必需环境变量名/非秘密测试值 | 待实现后填写；凭证只记录引用方式 |
| 外部故障目标及可执行命令、恢复/隔离清理入口 | 待实现后填写；不适用项注明理由 |
| 预期耗时、轮询超时、实际观察期/预算 | 待实现后填写，不用无限等待或假成功 |

### 8.2 初始化与启动（目标命令，待实现）

在上表填写的项目根目录运行；工具版本按锁文件/项目说明准备。首次开发由开发者生成锁文件和脚本，验收者不负责补建环境。环境变量按上表配置；保持FAKE券商与模拟账户，真实模型仅在本阶段明确要求且预算已配置的场景调用。

```bash
# 终端A：先确认实际执行目录为项目根目录
pwd
pnpm install --frozen-lockfile
pnpm stack:up -- --stage V2.2

# 终端B：同一项目根目录，保持开发服务器运行
pnpm dev:web
```

预期：安装与stack入口退出0；stack输出本阶段服务、端口、健康/迁移及持久卷状态。依赖不可用应非零并说明原因；不能删除旧业务卷重试。Web服务器持续运行并输出基础URL，尚在运行不要求退出码0。若已使用容器化Web，则填写已验证入口并避免重复占用端口。Ubuntu部署必须补齐实际镜像拉取/启动/迁移命令，不能仅用dev:web代替发布验证。

初始化在验收中心“准备隔离运行”完成；CLI场景入口也负责同样的准备，两者调用同一业务API。准备后记录testRunId、accountId、namespace及Fixture/DataVersion；初始化业务本身是测试对象时不得预先完成被测动作。缺源/凭证/历史数据时显示缺项，不静默换成Fake并报真实场景通过。

### 8.3 Web逐步操作及预期结果

1. 登录上表实际Web地址，进入“开发验收中心→V2→V2.2”；检查页面版本、模拟模式、服务能力与固定输入。
2. 每个场景点击“准备隔离运行”，核对参数后记下testRunId；正常/异常/恢复使用独立运行，场景内部的重复或恢复操作继续使用原运行及业务幂等键。
3. 按下表执行。操作按钮为目标交互，交付时开发者必须换成实际页面名称/按钮及路由；预期必须从业务明细读取，不能只看“任务完成”。

| 场景ID（阶段内唯一） | 场景 | 点击顺序/输入 | 预期结果与核对点 |
|---|---|---|---|
| normal | 分钟导入 | 选择文件真实频率(1m/5m)和时间戳语义(BAR_START/BAR_END)，上传固定小文件→映射字段/单位/时区→预览→确认导入→按股票日期查询分钟页。BaoStock 5m文件用紧凑`YYYYMMDDHHmmssSSS`源时间、`BAR_END`和证券列映射。 | 导入行数与源文件/错误行报告可核对；价格未复权，频率、barStart/barEnd、许可用途明确；数据版本可查。 |
| rejection | 坏行校验 | 分别上传单位错误、重复冲突、午休记录、缺分钟样本；查看错误行并尝试发布。 | 异常原因定位至字段/行；不填造可成交价；必要证据不足不发布合格回放数据。 |
| recovery | 导入恢复 | 重复导入相同文件；再在中途按限定步骤重启导入Worker，续跑后上传修订版。 | 同输入幂等、重启无重复行/版本；修订为新版本且旧版本可读。 |
| uploaded-csv | 已上传CSV TestRun | 大文件导入PUBLISHED后，点击“将此CSV导入记入验收运行”；记录的uploadId必须归属当前用户且状态为COMPLETED。 | 同一TestRun断言和证据绑定uploadId、importId、DataVersion、SHA-256、接收行数和许可用途标记；异主查询拒绝；CLI check-only读取相同TestRun且无写副作用。 |

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

| 场景/检查 | Web实际结果与截图 | 命令/退出码/报告 | testRunId/业务ID | 结论 |
|---|---|---|---|---|
| normal | 待执行 | 待执行 | 待执行 | NOT_RUN |
| rejection（含全部子场景） | 待执行 | 待执行 | 待执行 | NOT_RUN |
| recovery（含实际外部动作） | 待执行 | 待执行 | 待执行 | NOT_RUN |
| Web同run只读核对与证据导出 | 待执行 | 待执行 | 待执行 | NOT_RUN |
| 本阶段代码测试/实际观察适用项 | 待执行 | 待执行 | 待执行 | NOT_RUN |
| 用户人工验收 | 待用户确认 | 不由脚本代签 | 确认人/日期待填 | NOT_RUN |

记录不适用子项的范围依据，不能将必需项改为不适用绕过门禁。归档后在[本版验收表](./99-acceptance.md)填写证据链接和结论。清理只针对本轮已结束的隔离运行，默认保留证据；停止测试不能删除数据库卷或取消无关任务。


可续传大文件与TestRun关联增量（2026-09-25）：登录用户可通过V2.2页面上传最大64 MiB/100,000行CSV，每块512 KiB，逐块和整文件SHA-256校验；PostgreSQL持久化上传会话/分块，支持刷新与服务重启后续传、owner隔离、配额、取消和幂等导入。独立HTTP重启烟测覆盖848,055字节、16,000行；真实Chromium→Vite→平台API→市场服务→双临时PG smoke经页面“将此CSV导入记入验收运行”创建`uploaded-csv` TestRun，绑定uploadId/importId/DataVersion/SHA/行数/许可用途，CLI对同run `--check-only`退出0且无写副作用，异主读取403。`pnpm verify:stage -- --stage V2.2 --suite code`退出0（合同73 JSON/41 schema/30兼容规则、运维94项、市场PG集成21项等）。Finalize现将Bar按最多1,000条批次暂存并原子发布；重复键索引与错误仍驻留内存。Parquet、日期物理分区和生产容量证据未完成，人工签署状态保持不变。详见[可续传分钟上传审计](../../../evidence/audits/2026-09-25-p6-resumable-minute-upload.md)及[流式Finalize审计](../../../evidence/audits/2026-09-25-p6-streaming-csv-finalize.md)。

Parquet增量（2026-09-26）：Web支持Parquet八个目标字段逐项映射任意唯一源列，并复用同一续传/预览/Finalize/TestRun/CLI核验流程，解析使用锁定PyArrow并按最多1,000行批流处理；64 MiB/100,000行上限与源文件SHA保留。2,436字节合成Fixture的真实浏览器→API→隔离PG发布、同run CLI只读核对、异主403、CSV 16,000行回归及容器构建/容器内解析均通过。日期物理分区、容量测试和完整阶段人工验收仍未完成；不得将本增量视为V2.2整体PASS或改写2026-09-09签署。新增非标准列名冻结Fixture并经真实浏览器→API→隔离PG验证映射持久化。详见[P6 Parquet导入审计](../../../evidence/audits/2026-09-26-p6-parquet-minute-import.md)。

每日物理分区增量（2026-09-26）：新发布的分钟Bar写入按Asia/Shanghai自然日RANGE分区的PostgreSQL表；分页API新增半开`fromBarStart`/`toBarStart`以触发日期裁剪。兼容旧未分区数据的安全回填使用独立连接变量和显式`--apply`，默认PREVIEW，最多10,000行逐批事务提交，重跑幂等并保留原表。专用PG测试验证两个日期分区及EXPLAIN裁剪、迁移中旧数据分页和CLI preview/apply/重跑。`pnpm verify:stage -- --stage V2.2 --suite code`退出0。后续仓储层容量smoke已用合成输入覆盖100,000行及500证券×60交易日×48条的1,440,000行档，实测完成发布、分页和日期裁剪；这不是冻结归档文件的CSV/Parquet→HTTP全链路容量验证。活动/正式库没有自动迁移；旧数据回填执行、生产/Ubuntu资源与并发边界、存储冗余/备份恢复和完整阶段人工验收仍待完成。原第2节与第7节总验收复选框及2026-09-09签署状态保持原样。详见[P6每日分区审计](../../../evidence/audits/2026-09-26-p6-daily-partition-storage.md)与[P6容量smoke](../../../evidence/audits/2026-09-26-p6-minute-capacity-smokes.md)。

5m源语义及冻结归档导入（2026-09-26）：V2.2 CSV/Parquet合同现显式支持`1m`/`5m`及`BAR_START`/`BAR_END`。解析器接受BaoStock `YYYYMMDDHHmmssSSS`紧凑上海时间和`sh.`/`sz.`代码；按声明把BAR_END退回频率时长生成barStart，5m栅格不对齐则拒绝。真实HTTP导入本地只读500×60 BaoStock归档，500/500文件SHA、行数与Manifest逐项匹配，共1,440,000条/500 PUBLISHED版本/60日分区；首条OHLCV与源CSV相同，测试库随机创建并删除。来源许可未验证，每份导入均标记`UNCONFIRMED`和`researchUseAllowed=false`。此烟测直连Market Data小文件HTTP入口，未经过平台API/Web/TestRun或owner隔离分块上传，不能视作V2.2整体验收。详见[冻结归档HTTP导入审计](../../../evidence/audits/2026-09-26-p6-baostock-archive-import.md)。

100,000行容量增量（2026-09-26）：隔离随机PostgreSQL数据库中实际通过`publishStream`逐批持久化100,000行，核对行数、分页和目标日期分区查询计划；macOS arm64/PostgreSQL 16.9导入原子提交2.494秒、40,096行/秒、峰值RSS 121,440 KiB、数据库大小增量64,897,024字节。测试数据库建后删除并确认。此为仓储层合成烟测，不覆盖完整文件解码、1.44M行历史规模、配额环境、Ubuntu或备份恢复，不能用于容量上线承诺。详见[P6 100k容量smoke](../../../evidence/audits/2026-09-26-p6-minute-capacity-smokes.md)。


分块预览与Finalize容量增量（2026-09-26）：重复与坏OHLC行不会进入Finalize Bar暂存批次；若任一质量错误存在，整次事务仍REJECTED并原子回滚。分块CSV/Parquet预览响应最多保留100条有效Bar样本，新增`barsTruncated`布尔值，其余总行数和逐行错误保持完整。100,000行限制下的真实隔离HTTP→PG压力smoke分别上传5.4MB重复/唯一坏OHLC数据：100,000条错误均持久保存，0条Bar发布，随机测试库验证删除；Market Data服务峰值RSS为480,064/479,328 KiB（Preview 359,536/368,400 KiB；Finalize 480,064/479,328 KiB），烟测上限768 MiB。该串行单请求macOS结果不代表多并发、容器或Ubuntu容量。53项单测、类型检查及浏览器→API→PG真实归档分块流程验证通过，仍须完成平台级并发资源限额、Linux/Ubuntu及备份恢复验证。见[解析器内存与HTTP容量审计](../../../evidence/audits/2026-09-26-p6-minute-parser-memory.md)。

服务身份加固（2026-09-27）：平台代理的Fixture导入、CSV预览/导入及CSV/Parquet分块上传、状态、预览、Finalize、取消、uploaded-csv状态、持久导入详情和Bar分页读取均先验证用户会话；转发到Market Data时附带`platform-api-service` Bearer与适用的owner范围。Market Data以Bearer Token识别服务；可选`x-stockquant-service-id`只能作为一致性检查，并在获取P6跨实例导入闸门前验证重型导入路由。真实Chromium→Vite→Platform API→Market Data→双随机PG Web smoke验证匿名导入读取401、用户详情/Bar页200、异主403，以及CSV/Parquet/5m归档上传、同run TestRun与CLI只读核对。缺失/伪造Bearer及错配身份拒绝，Bearer-only请求可通过服务身份。其他行情/日历读取仍允许内网直连；活动部署、密钥轮换和阶段人工验收仍待完成。详见[P7.2服务身份审计](../../../evidence/audits/2026-09-25-p7-2-service-identity.md)及[分钟导入边界审计](../../../evidence/audits/2026-09-27-p6-minute-import-boundary.md)。

2026-09-27 路由收口续记：Market Data采集订阅/运行/缺口/回填状态、来源健康GET与固定Fixture分钟预览，以及质量/覆盖计算POST现要求平台Bearer；V2.2 Platform scenarios/Fixture preview先校验用户Session，Fixture代理加服务身份。运维脚本分别读取Bearer与采集控制令牌。扩展HTTP smoke/Platform代理单测和完整V2.1、V2.2 code suites通过；V2.2 CSV浏览器测试3/3通过（Mock API，不算服务端阶段场景验收）。日历与容器`/live`、`/ready`仍可读；本轮服务源码未部署到活动采集实例，长期观察继续依托原运行实例。详见[P7.2采集读取身份审计](../../../evidence/audits/2026-09-27-p7-2-market-data-collection-read-identity.md)。

# V1.4 日线历史回测与可核对报告

状态：PARTIALLY_IMPLEMENTED（2026-09-09历史自动与用户人工验收PASS保留；当前BUY/SELL单订单成本、参与率、现金约束、T+1可卖量和下一Fixture Session卖出款结算均有隔离验证，TestRun绑定精确workspace代码Hash；仅合成停牌/限制价拒绝场景已有隔离闭环，真实市场限制规则/费税完整性、Qlib规则对照仍未完成，第7节未验，第8节人工执行/导出仍待完成）。版本入口：[README](./README.md)。共同约束：[三版共同规则](../05-three-version-delivery.md)。

## 1. 前置与范围

V1.3通过；复用同一风控、账本与执行规则，避免另建交易规则副本。

本阶段所有订单、券商资产和成交均来自隔离模拟环境。真实业务数据库、Qlib或RD-Agent在声明“已验证”时必须真正执行；替身需独立标注。

## 2. 开发任务

- [x] 建立BacktestRun及固定Manifest：数据、股票池、策略/因子、规则、成本、依赖/镜像、种子、初始账户、区间与基准。
- [x] 实现按运行隔离的历史时钟与日线撮合；日终确认信号最早下一可交易时点执行，原价用于成交，复权研究与公司行动入账分离。
- [ ] 完成费用、滑点、成交量约束、停牌/限制价、可卖量及结算处理；当前已实现固定费用/不利滑点、可配置A股佣金参数/最低佣金、沪深经手费与过户费、卖方印花税、成交量约束、T+1与单卖单次一Fixture Session结算，并有合成停牌/锁板场景；另有独立合成历史日期费率Fixture覆盖2023-08-28前后规则切换。完整券商费率、交易所结算日历、公司行动及交易规则一致性仍缺；日线无法确定的盘中顺序采用明确保守规则。
- [x] 单证券日线Fixture按交易Session记录持仓、T+1未可卖量和可卖量；成交日持仓纳入估值，下一条Fixture交易日才释放卖出可用量；同日卖出被拒绝，后续显式SELL按可卖持仓/成交参与率成交，扣费后计未结算款并在下一Fixture Session转为现金。后端断言、Web结果和同Run CLI核对均通过；Fixture结束时未结款仍作为应收项。
- [x] 提供收益/基准、回撤、换手、费用归因、成交率、拒绝/未成交数量和数据覆盖；关联实际模拟流水。
- [ ] Qlib快速研究报告和交易链路回放分开标注执行模型；同一基准案例比对规则与费用，无差异才作为一致性证据。

## 3. 同步 Web 开发

正式页：回测配置、任务列表、净值、回撤、交易明细和运行比较。验收页：逐日推进小样本、未来信号/公司行动/拒绝场景及账本核对。

验收中心路径：`/acceptance/v1/v1.4`。场景参数提交到后端TestRun编排接口，后端调用业务API并汇集证据。浏览器不直接写领域数据，不自行判定成交。含正常、拒绝、恢复、合成市场限制及历史日期费率场景；历史费率场景使用单独的合成日期Fixture与固定卖出日，不能用于说明历史行情。

## 4. 人工验收步骤

1. 选择固定区间、资金、策略和成本模型启动，关闭并重开页面查看后台结果。
2. 抽查收盘信号不会在同日已结束价格成交；确认规则拒绝保留在报告。
3. 比较NO_TRADE与TopK，核对现金、持仓、市值、费用和净值；公司行动收入不重复。
4. 重跑固定输入，再取消另一任务，确认结果可复验且取消未覆盖完整报告。

每次保存testRunId、场景版本、代码/镜像、数据/规则版本、种子及注入事件序列、实际/预期、截图/Trace。判定依据必须是后端事实和独立检查，不能只看Toast成功提示。

## 5. 异常与替身边界

缺交易状态不能强行撮合；小样本报告必须提示不能证明泛化收益；资金金额精确比较，跨架构研究浮点按预先定义容差。

## 6. 产物与验证

目标产物：quant-research-service 回测Worker/Manifest、历史时钟和日线执行Adapter、回测Web、fixtures/backtest、运行报告。

自动验证：无未来泄漏、费用/结算/公司行动手算、相同输入复跑、日线与Paper规则一致性及回测浏览器E2E。

需求/测试追踪：QNT-08/09/10、POR-02/03、DAT-12、XMK-05/07；T06/08/09/11/12/29/45/47；DV-04、VT04。

2026-10-01工程证据增量：最初Platform API Fixture计算和隔离PostgreSQL/API/Web Chromium、Web TestRun同Run CLI核对见[回测真实性审计](../../../evidence/audits/2026-10-01-v14-fixture-backed-backtest.md)。2026-10-02按服务所有权迁移后，Platform使用Bearer保护的生成OpenAPI Client调用Quant Research；Quant读取并校验镜像内冻结Fixture，执行日线计算，并在自己的数据库原子持久化BacktestRun及SHA-256绑定Manifest，Platform只保存TestRun元数据/结果投影。所有权迁移阶段的审计见[Quant所有权迁移审计](../../../evidence/audits/2026-10-02-w1-v14-quant-ownership.md)；可配置Web早期验收见[早期隔离审计](../../../evidence/audits/2026-10-02-w1-v14-quant-configurable-web-d25f1e1e07be057ac502.md)。T+1可卖数量增量审计见[早期T+1审计](../../../evidence/audits/2026-10-02-w1-v14-quant-configurable-web-0f21cc9c8e2bfa3cfc18.md)，其源码清单是当时点快照；当前源码Hash以本节最新SELL/结算隔离审计的Manifest为准。正式V1.4 E2E仍使用隔离Harness；完整交易所规则、Qlib/Paper规则一致性、当前范围完整人工验收和Ubuntu仍未完成。

费率日期证据范围：上交所2023-08-18通知说明经手费率从0.00487%下调至0.00341%，自2023-08-28生效（[上交所公告](https://www.sse.com.cn/lawandrules/sselawsrules2025/repeal/rules/c/c_20230818_10776219.shtml)）；国家税务总局公告自同日起将证券交易印花税减半（[税务总局政策原文](https://fgk.chinatax.gov.cn/zcfgk/c102416/c5211343/content.html)）；中国结算2022年过户费率公告见[中国结算费率PDF](https://www.chinaclear.cn/zdjs/editor_file/20220701154723234.pdf)。本地旧费率参数模型含旧经手费/证券监管费底线、过户费与卖方印花税；Fixture只用合成价格核对计算和边界，不替代对所有历史期间、交易板块及账户佣金费率的核验。

可复验工程入口：在仓库根目录运行`pnpm test:integration:v14-backtest`。该脚本构建独立随机Compose项目及PostgreSQL卷，使用回环随机端口执行 normal API→CLI check-only、rejection、recovery和单个V1.4 Chromium正常场景；结束时删除并验证仅属于该项目的容器、卷、网络及镜像。它不执行完整第4节人工操作，也不执行真实数据、长观察或完整报告产品验收。

2026-10-02工程证据追加：隔离Harness现为每个TestRun注入同一`sha256:` workspace codeVersion，摘要覆盖V1.4 Schema/OpenAPI、冻结Fixture、Quant/Platform/Web相关源码、容器定义、集成Harness和锁文件；API normal、CLI rejection/recovery及三个Web创建TestRun均断言该摘要与运行证据完全一致。最新集成TestRun为API `ff200d81-e0fa-4ff4-804a-7b36417bc560`、CLI rejection `1617973b-c552-40e2-8042-5c8e0364fd05`、CLI recovery `a74dfc74-3baf-4d92-ae6f-8b4903ddd6a9`及Web `bc44ed31-69cd-4938-9e42-071e0a4cdd5e`、`32cdea5a-cc13-456f-b17f-87252773c16c`、`c62608f5-877e-46e1-8e5c-679c1ee7bd24`；六个TestRun所有断言PASS，六条Quant BacktestRun/Manifest结果Hash相符，临时项目资源已清理。报告/逐文件Manifest见[本次workspace Hash绑定审计](../../../evidence/audits/2026-10-02-w1-v14-quant-configurable-web-113281a0447f86dddb26.md)及相邻JSON/SHA-256。此改动补齐自动化工程证据的代码身份，不关闭限制规则、Qlib一致性、完整人工验收或Ubuntu门禁。

退出条件：开发任务完成、Web真实可操作、全部适用检查PASS、人工签署、已知限制写入证据。填写[本版验收表](./99-acceptance.md)，未完成项不得勾选通过。

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

手册状态：PARTIALLY_VERIFIED_EXECUTABLE（2026-10-02：隔离自动化命令及固定Fixture已实测；当前交互式用户验收与未实现规则仍NOT_RUN）。

前置服务：只使用本命令自动创建的随机隔离Compose项目，包括V1.4 Quant Research、Platform API、Portfolio Risk、PostgreSQL和Web；不依赖活动服务。Docker daemon须可访问。当前执行环境为Node `v24.1.0`、pnpm `10.34.5`、Docker CLI `28.0.4`；仓库Node版本见根目录`.node-version`。

固定输入：常规场景为`fixtures/v1/v1.4/backtest_daily.csv`，SHA-256 `88a198cbf5e2cf8f3bf1351a31c5aba1b9d9c6ce2d28343fb05a1dc462569bef`；版本`v1.4-daily-backtest-1`；合成单证券`600000.SH`，2024-01-02至2024-01-05。历史费率场景为`fixtures/v1/v1.4/backtest_historical_fees.csv`，SHA-256 `5a3d946c23d81097a29307b53813281be15b07f187b325b2b32c577a2d2e2573`；版本`v1.4-historical-fees-1`；合成日期2023-08-23至2023-08-28，不含真实历史价格。默认策略资金1,000,000分、目标100股、参与率100bps、滑点0bps、固定费500分；seed=`20260907`。Fixture不含公司行动。

| 开发交付时必须填写 | 当前值 |
|---|---|
| 实测代码Commit或工作区Hash/验证日期 | 工作区源码由可配置Web审计的SHA-256清单绑定；验证日期2026-10-02；动态隔离项目名及Run IDs写入审计JSON |
| 项目根目录、Node/pnpm/Python/uv及Docker版本 | 仓库根目录；Node `v24.1.0`、pnpm `10.34.5`、Docker CLI `28.0.4`；本场景不调用Python/uv |
| Web基础URL/身份登录或会话建立方式 | 隔离Harness在`127.0.0.1`绑定随机端口，启动日志提供URL；Playwright自动打开并经隔离Platform接受测试owner；Harness退出时服务和端口销毁，不是持久人工验收站点 |
| 本阶段Web路由 | `/acceptance/v1/v1.4`（已在隔离Harness实际请求并通过） |
| 正式页面的真实入口/跳转链接 | 在Web正式验收中心选择V1 → V1.4；隔离浏览器直接进入`/acceptance/v1/v1.4` |
| Fixture文件/数据版本/确切日期/Hash、规则与成本版本 | `fixtures/v1/v1.4/backtest_daily.csv`，2024-01-02至2024-01-05，SHA-256见本节上文；`v1.4-daily-backtest-1`；`FIXED_FEE_CENTS_PLUS_ADVERSE_SLIPPAGE_BPS_V2` |
| 配置文件及必需环境变量名/非秘密测试值 | Harness自动生成随机端口、Compose project与服务凭证；API地址通过`STOCKQUANT_PLATFORM_API_URL`传入，浏览器地址通过`PLAYWRIGHT_BASE_URL`传入。无需手工放置密钥，不在终端输出凭证 |
| 外部故障目标及可执行命令、恢复/隔离清理入口 | `pnpm test:e2e -- --stage V1.4`执行API normal/rejection/recovery、浏览器正常/参数比较、同Run CLI check-only及精确隔离资源清理；此切片尚无真实外部故障目标 |
| 预期耗时、轮询超时、实际观察期/预算 | 单次隔离E2E以本机容器构建为准；Harness健康等待上限30秒。外部数据、Paper及Provider预算均为0；自然市场观察不适用于本Fixture自动套件 |

### 8.2 初始化与启动（隔离自动化命令已实测；人工页面启动仍待补）

在仓库根目录运行以下隔离验证命令。它内部构建唯一随机Compose项目、临时数据库、服务与Web，结束后移除并核验本次项目的容器、卷、网络和镜像。不要另行对活动Stack执行初始化或迁移。

```bash
# 仓库根目录；先确认执行目录、锁定工具版本和Docker daemon可用
pwd
pnpm install --frozen-lockfile
pnpm test:e2e -- --stage V1.4
```

预期：命令退出0；报告包含API/browser TestRun IDs、八个Quant BacktestRun/Manifest配对Hash、Fixture Hash和临时资源清理结果。任一服务构建/健康、CLI核对、浏览器断言、Hash或清理失败时命令非零退出并保留审计报告。此命令启动的临时Web URL仅在运行期间可用；它支持自动验收，不满足本节要求的人工交互式启动/持久URL。

初始化在验收中心“准备隔离运行”完成；CLI场景入口也负责同样的准备，两者调用同一业务API。准备后记录testRunId、accountId、namespace及Fixture/DataVersion；初始化业务本身是测试对象时不得预先完成被测动作。缺源/凭证/历史数据时显示缺项，不静默换成Fake并报真实场景通过。

### 8.3 Web逐步操作及预期结果

1. 登录上表实际Web地址，进入“开发验收中心→V1→V1.4”；检查页面版本、模拟模式、服务能力与固定输入。
2. 每个场景点击“准备隔离运行”，核对参数后记下testRunId；正常/异常/恢复使用独立运行，场景内部的重复或恢复操作继续使用原运行及业务幂等键。
3. 按下表执行。操作按钮为目标交互，交付时开发者必须换成实际页面名称/按钮及路由；预期必须从业务明细读取，不能只看“任务完成”。

| 场景ID（阶段内唯一） | 场景 | 点击顺序/输入 | 预期结果与核对点 |
|---|---|---|---|
| normal | 日线回测 | 选择固定区间/初始现金/成本→运行NO_TRADE，再以相同输入运行TopK；打开净值、费用和交易明细对比。 | 每笔成交晚于信号可见时间；NO_TRADE无委托；费用/股息归因与账本可核对，报告标DAILY_BAR。 |
| rejection | 未来成交拒绝 | 运行“收盘信号同日成交”“状态未知”“重复公司行动”子场景，查看断言和流水。 | 拒绝回填成交与不可确认撮合；公司行动只记一次，不出现复权加股息双算。 |
| market-restrictions | 合成停牌与限制价 | 选择“合成：停牌与限制价（Fixture）”，运行后查看完整证据中的四条固定用例。 | 停牌、上限锁定BUY、下限锁定SELL均按预期拒绝，非锁定bar标为FILLABLE；标明`SYNTHETIC_FIXTURE_BOUNDARIES_ONLY`，不解释为真实交易所规则。 |
| recovery | 取消与复跑 | 复制正常输入新建运行，关闭页面再打开比较结果；另运行任务并取消。 | 后台独立执行，固定结果一致；取消不发布完整报告或覆盖成功结果。 |

4. 从运行详情打开关联正式页面，执行一次刷新/关闭再打开；核对长任务后台状态、历史证据和加载/失败/陈旧提示。
5. 每项记录实际结果、截图与业务ID。异常场景“预期拒绝”被正确验证时断言可PASS，但被测业务操作仍显示拒绝；若意外接受则断言FAIL。

### 8.4 命令行复验与相同运行核对（已验证）

在项目根目录执行以下目标命令。stage/scenario必须匹配8.3定义；CLI与Web共用场景版本、Fixture和断言。每条命令执行后立即查看退出码，任何非零先保存错误再定位，不能继续假定本阶段通过。

```bash
pnpm verify:stage -- --stage V1.4 --scenario normal --seed 20260907
# 紧接上一命令执行；0表示全部场景断言通过
 echo $?
pnpm verify:stage -- --stage V1.4 --scenario rejection --seed 20260907
 echo $?
pnpm verify:stage -- --stage V1.4 --scenario recovery --seed 20260907
 echo $?
pnpm verify:stage -- --stage V1.4 --scenario market-restrictions --seed 20260907
 echo $?
pnpm verify:stage -- --stage V1.4 --suite code
 echo $?
pnpm test:e2e -- --stage V1.4
 echo $?
```

预期：各场景输出testRunId、实际数据/模型/券商模式、断言expected/actual及证据位置；预期内拒绝场景验证成功退出0，意外副作用/缺脚本/缺必需依赖/未满观察条件非零。恢复场景需外部动作时输出已核实目标和步骤，停留WAITING；完成动作后复验原run，不伪称Web可重启宿主。浏览器测试必须实际运行本阶段用例，零用例/全跳过不能退出0。

再对Web中已运行的同一testRunId执行只读核对，避免仅创建新样本掩盖页面问题：

```bash
# 粘贴Web运行详情中的实际testRunId，再按回车；这是普通ID，不是凭证
read -r acceptance_run_id
pnpm verify:stage -- --stage V1.4 --run "$acceptance_run_id" --check-only
 echo $?
pnpm evidence:export -- --run "$acceptance_run_id"
 echo $?
```

check-only仅查询此运行后端事实并追加检查证据，不创建新订单、不重放成交或发起模型调用；空ID/错误stage/越权run必须拒绝。导出只含脱敏数据，输出实际目录和Manifest Hash，不自动勾选人工验收。端到端正常/异常/恢复运行产生不同ID，导出时分别保存。

本阶段代码测试覆盖要求：无未来泄漏、费用/结算/公司行动手算、相同输入复跑、日线与Paper规则一致性及回测浏览器E2E。 在交付时把映射到的实际Domain/DB/契约/服务内测试命令补入本节，注明执行目录、测试文件或套件、退出码和报告；verify:stage必须展示实际调用的测试清单，不能空壳返回0。Python服务使用自身锁定环境，不串用其他服务虚拟环境。

### 8.5 交叉核对、失败定位与恢复

交叉核对：净值=按冻结估值规则的现金与持仓权益，未结算项目不重复计；订单/费用/公司行动流水与报告逐项核对。

先检查Web与CLI的testRunId、输入/策略/代码版本和模式是否一致，再按Trace查平台、领域、适配器与持久化证据。页面错误而CLI正确，记录Web失败；二者都错则保留领域断言失败。缺能力先查健康/迁移/数据与日志，不修改余额或订单状态使断言通过。

独立复跑创建新run；测试幂等/检查点/重启恢复则使用原run和原幂等键。故障发生后保留旧证据，修复后新增运行或检查记录；不得清空账本、随机更换seed直到通过。真实观察窗口、来源验证和实际模型调用与加速/录制测试分别记录。

### 8.6 验收记录与收尾

| 场景/检查 | Web实际结果与截图 | 命令/退出码/报告 | testRunId/业务ID | 结论 |
|---|---|---|---|---|
| normal | Web 页面通过（截图由验收者留存） | CLI 退出码 0 | `78a5c084-abdb-4e50-b451-9787d85b0c1c` | PASS |
| rejection（含全部子场景） | Web 页面通过（截图由验收者留存） | CLI 退出码 0 | `82b1d78a-00f1-4f61-b069-29b94e7aab95` | PASS |
| recovery（含实际外部动作） | Web 页面通过（截图由验收者留存） | CLI 退出码 0 | `538be4e9-1ece-4c95-a8d3-c5c45e3947c4` | PASS |
| Web同run只读核对与证据导出 | Web/CLI 证据一致 | 三个 check-only 退出码 0 | 同上 | PASS |
| 本阶段代码测试/实际观察适用项 | Web E2E 4 tests passed | `verify:stage --suite code` 退出码 0 | Commit `026b9c2` | PASS |
| 用户人工验收 | 用户已确认 Web 与命令验收通过 | 不由脚本代签 | 2026-09-09 | PASS |

记录不适用子项的范围依据，不能将必需项改为不适用绕过门禁。归档后在[本版验收表](./99-acceptance.md)填写证据链接和结论。清理只针对本轮已结束的隔离运行，默认保留证据；停止测试不能删除数据库卷或取消无关任务。

2026-10-02 费用/成交预算切片：日线DAILY_BAR引擎使用显式`V14ExecutionPolicy`（整数分币、目标数量、成交量参与率bps、滑点bps、固定手续费）。BUY滑点按不利方向向上取整；成交量、目标数及扣除手续费后的可负担股数共同限制成交；零成交不收手续费，并报告拒绝数、未成交数量与成交率。成交价、现金、换手、NAV及收益/回撤bps使用整数分币/BigInt中间值；超出安全整数NAV时拒绝而不近似。冻结Fixture默认参数仍为100股、1%参与率、0bps滑点、500分固定手续费、1000000分初始资金。手算断言覆盖1021分成交价、102000分初始资金下成交99股/余款421分，以及低量/资金不足零成交。详情见[V1.4成本与资金约束审计](../../../evidence/audits/2026-10-02-w1-v14-cost-budget-fill-guard.md)。

2026-10-02 A股费税可配置切片：增加版本化`CN_A_CASH_EQUITY_2023_08_28`费用参数，佣金率和最低佣金明确由用户按券商账户配置；计算沪深交易经手费、按成交金额计提的过户费，以及仅卖出侧印花税，所有比例结果向上取整到分。默认固定费用回测不变。新增API/Web参数验证、成交分项展示、领域手算（买511分、卖562分）及Web创建Run后的CLI同Run校验，完整代码suite及隔离PostgreSQL/Web/CLI验收通过。费率依据：[上交所交易费用说明](https://www.sse.com.cn/services/tradingservice/charge/ssecharge/)、[深交所现行收费表](https://investor.szse.cn/marketServices/deal/payFees/index.html)、[税务机关证券交易印花税政策](https://shanxi.chinatax.gov.cn/web/detail/sx-11400-545-1780448)。该费表不是券商报价，也未涵盖所有税费、账户差异、完整历史费率、交易所日历和公司行动。详情见[费用模型隔离审计](../../../evidence/audits/2026-10-02-w1-v14-quant-configurable-web-eb9f94dfcd44198ba613.md)和[计数更正记录](../../../evidence/audits/2026-10-02-w1-v14-audit-count-correction.md)。因此V1.4成本/市场规则验收仍未完成。

2026-10-02 A股费表生效日期失败关闭与历史费率验证：现行档仅适用于2023-08-28起，历史档限制于2022-04-29至2023-08-27；前后切换使用独立合成Fixture，不声称价格为真实历史行情。官方费率依据见上方[日期/费率来源](#费率日期证据范围)。V1.4完整代码门禁退出0，隔离PostgreSQL/Web/CLI E2E退出0；11个Quant结果/Manifest配对、11个Platform TestRun、6个Web Run同Run CLI校验、浏览器4/4及临时资源清理均通过。机器结果见[隔离集成审计](../../../evidence/audits/2026-10-02-w1-v14-quant-configurable-web-38596c330e6b62e701d2.md)及[JSON](../../../evidence/audits/2026-10-02-w1-v14-quant-configurable-web-38596c330e6b62e701d2.json)。该E2E逐文件SHA清单保留为2026-10-02执行时的历史源码快照；后续V2.3路由更新改变了其中共用`app.module.ts`的当前Hash，因此不把旧清单当作当前源码Hash证据。当前工作区以V1.4/V2.3代码门禁和相应运行证据为准。自动PASS不等于完整费税、全市场规则、Qlib/Paper一致性、手册/用户验收或Ubuntu完成。

当前边界：回测计算已由Quant Research服务内的domain/application执行，Platform经生成客户端编排用户范围和TestRun；Quant自己的PostgreSQL原子持久化BacktestRun及Hash绑定Manifest，Platform同时保留用户验收TestRun投影。SELL/T+1/结算跨服务行为见[隔离验收](../../../evidence/audits/2026-10-02-w1-v14-quant-configurable-web-5309f6fec3be0e11fe90.md)（其源码Manifest为点时快照）；当前源码SHA-256清单见[卖出滑点输入门禁审计](../../../evidence/audits/2026-10-02-w1-v14-sell-slippage-input-guard.md)（对应SHA清单为历史点时快照）。单测另核对期末部分成交的50,250分未结算应收，见[边界审计](../../../evidence/audits/2026-10-02-w1-v14-final-session-sale-receivable.md)。单证券close/volume Fixture尚不能验证开盘区间/涨跌停、停牌、交易所结算日历、公司行动、方向/市场费税表或与Qlib/Paper逐规则一致。上述缺项、第2节整体任务、第7节和第8节人工交付均保持未完成；本增量不改变V1.4状态或历史签署。

可重跑聚焦命令：`pnpm --filter @stockquant/quant-research-service exec vitest run tests/unit/v14-daily-backtest.spec.ts tests/unit/v14-daily-backtest-service.spec.ts`和`pnpm --filter @stockquant/platform-api-service exec vitest run tests/unit/v14-backtest-adapter.spec.ts`；跨服务Web/CLI命令为`pnpm test:integration:v14-backtest`，完整隔离代码命令为`pnpm verify:stage -- --stage V1.4 --suite code`。代码门禁不启动活动API；集成命令使用随机隔离Compose资源。任何自动证据都不能替代用户对当前完整范围的人工签署。

2026-10-02 Quant所有权迁移后最终代码门禁：`pnpm verify:stage -- --stage V1.4 --suite code`退出0；其中baseline、contracts、service-layers、全仓build/lint/typecheck及测试全部通过，Quant Research为18个TS测试文件/82项与13项Python Worker测试，Platform API为45文件/158项。专用隔离Compose联测及正式`pnpm test:e2e -- --stage V1.4`退出0，新增合成停牌/限制价场景及同Run CLI核验；本轮最终审计共8个TestRun，Quant八个Run/Manifest的result hash精确匹配；非法策略字段返回422且不创建Run，随机容器、卷、网络和镜像已清理。期间一次无隔离的浏览器代理误连活动旧API，产生一个TestRun；原始响应已单独留档并明确排除验收，未删除该活动记录，后续验证均使用隔离Compose。隔离路径活动服务/行情/Provider/Paper/Broker调用为0。阶段业务范围仍部分完成，自动PASS不替代当前人工签署。

2026-10-02 T+1可卖量接入后回归（历史增量）：Quant按Fixture交易Session在买入成交当日输出held=100/sellable=0/unsettled=100，从下一Fixture交易日输出held=100/sellable=100/unsettled=0；当时报告记录见[T+1可卖量隔离审计](../../../evidence/audits/2026-10-02-w1-v14-quant-configurable-web-0f21cc9c8e2bfa3cfc18.md)，它的源码Manifest仅代表该时点。SELL成交/结算后续隔离审计与其源码SHA-256见[SELL/结算E2E](../../../evidence/audits/2026-10-02-w1-v14-quant-configurable-web-8a3f64eba4cbf65bbaaa.md)；上述8a3f64...源码清单作为其执行时点的历史快照保留，不再作为当前源码Hash。期末部分成交/未结应收边界见[单测审计](../../../evidence/audits/2026-10-02-w1-v14-final-session-sale-receivable.md)，其源码清单同样为该阶段点时快照。

2026-10-02 单证券与日期输入限制：引擎现在要求真实ISO日历日期，且拒绝跨证券bar序列，避免当前单仓位账本把多证券价格混算成错误NAV。无效`2024-02-30`与混合`600000.SH`/`AAPL.US`输入单测拒绝；完整V1.4代码门禁和隔离API/PG/Web/CLI E2E复验通过。报告见[单证券/日期门禁审计](../../../evidence/audits/2026-10-02-w1-v14-single-security-input-guard.md)（其Manifest保留为点时快照），相关六Run记录见[隔离E2E审计](../../../evidence/audits/2026-10-02-w1-v14-quant-configurable-web-5309f6fec3be0e11fe90.md)。此门禁明确拒绝不支持的多证券输入，不代表多证券回测已经实现。

2026-10-02 卖出滑点输入边界：配置卖单时，`slippageBasisPoints=10000`会把卖出成交价计算为零分；现在在构造回测引擎时直接拒绝该策略，并新增回归测试。聚焦V1.4测试11/11、Quant TypeScript检查通过，完整V1.4 code suite受控本机重跑exit 0；普通沙箱Python Worker因loopback EPERM失败已保留，受控本机13/13通过。详情及当前源码Hash见[卖出滑点输入门禁审计](../../../evidence/audits/2026-10-02-w1-v14-sell-slippage-input-guard.md)（对应SHA清单为历史点时快照）。该修复不改变V1.4/W1未完成状态。

2026-10-02 W4全仓代码回归：`pnpm verify:stage -- --stage V1.4 --suite code`在普通沙箱因Qlib Worker临时loopback socket EPERM首轮失败；受控本机同命令最终exit 0，完成baseline、build、typecheck、全仓unit tests（Quant TS 91/Python Worker 13；Research Automation 196；Platform 162；Market Data 70；Trade Execution 62；Replay 25；Governance 22；Portfolio 5；Web 1；Artifact store 4）。套件没有运行本阶段API/Web/CLI隔离E2E或真实Qlib fit，不生成业务TestRun。未接触活动服务、行情、Provider、Paper/Broker；阶段部分完成及未验收范围不变。详见[W4 V1.4全仓代码复核](../../../evidence/audits/2026-10-02-w4-v14-full-code-suite-refresh.md)及其SHA-256清单。

2026-10-02结构化证据Bundle增量：V1.4隔离Harness现在从哈希绑定的Run审计原样生成每个TestRun的`evidence.json`、`source-evidence.json`及SHA-256 Manifest，目录已存在时拒绝覆盖；Bundle sourceExport绑定审计文件Hash，`manualConclusion=NOT_RUN`。本轮六个run均通过V1阶段身份/内容Hash核验；最新审计见[六Run workspace/Bundle证据](../../../evidence/audits/2026-10-02-w1-v14-quant-configurable-web-3fc51ea6f6138d6b3251.md)、[JSON](../../../evidence/audits/2026-10-02-w1-v14-quant-configurable-web-3fc51ea6f6138d6b3251.json)（当时50项SHA-256 Manifest保留为历史点时快照）。旧TestRun缺失导出和人工验收未改变。

2026-10-02 合成市场限制域规则起步：新增独立冻结 Fixture `fixtures/v1/v1.4/market_restrictions_synthetic.csv`（Manifest `market-restrictions-manifest.json`，SHA-256 `45413145031d48c74f0592dbe450a68081f4e0e22e769e8d8b4ddf2ffd57e52a`）及Quant域辅助规则，固定覆盖停牌、买入上限锁定、卖出下限锁定和非锁定可交易bar；原close/volume Fixture不变。聚焦Vitest 13项、Quant TypeScript构建、`pnpm fixtures:check`（19文件）和`pnpm contracts:check`均通过。后续已将该用例接入版本化V1.4请求/结果Schema、Quant持久BacktestRun、Platform TestRun场景目录和正式Web选择器；集成脚本已加入浏览器创建Run的同TestRun CLI只读断言，隔离HTTP/PG/Web/CLI联测现已通过，细节见本节最新审计。该SIMULATION_ONLY合成用例不证明A股交易所限价公式、盘中成交顺序、真实行情或完整停牌/限制价处理；第2节整体任务仍保持未完成。无数据源、Paper、Broker或活动服务调用。


2026-10-02 V1.4合成停牌/限制价场景完整隔离纵切详见此前W1审计及当前费用模型审计；本场景明确为合成规则边界，不建模交易所限价公式/盘中队列/真实行情。V1.4第2节整体交付、完整费用税率、公司行动/Qlib规则一致性及人工验收仍未完成。

2026-10-02 W4正式隔离E2E补验（历史点时记录）：在全仓代码门禁后运行`pnpm test:e2e -- --stage V1.4`，随机Compose/PostgreSQL栈退出0；11个Quant BacktestRun/Manifest/resultHash配对、6个Web创建Run由CLI same-run核对、Playwright 4/4、临时容器/卷/网络/镜像清理。该次报告见[历史隔离E2E审计](../../../evidence/audits/2026-10-02-w1-v14-quant-configurable-web-07b36a2ebce39465ea5a.md)、[机器JSON](../../../evidence/audits/2026-10-02-w1-v14-quant-configurable-web-07b36a2ebce39465ea5a.json)；其SHA-256清单作为不可变历史点时记录保留在`evidence/audits/2026-10-02-w1-v14-quant-configurable-web-07b36a2ebce39465ea5a.sha256`，不作为当前工作树哈希。此增量补齐前一条代码回归明确未运行的API/Web/CLI隔离E2E；仍未执行真实Qlib fit，也未验证完整交易所规则、完整费税、公司行动、日历、Qlib/Paper规则一致性或人工/Ubuntu验收。当前完整工程状态仍PARTIALLY_IMPLEMENTED。

2026-10-02 W9哈希漂移修复后的当前V1.4复验：为绑定后续共享契约版本，重新运行`pnpm test:e2e -- --stage V1.4`，隔离栈退出0；11个Quant BacktestRun/Manifest/resultHash相符，六个浏览器创建的TestRun均由CLI同Run核验，Playwright 4/4，随机容器/卷/网络删除。当前workspace codeVersion为`sha256:249165d62f3a4179e3b6a456a9cb36d18b804c5ff3eb2f4837eedf0274f12fd7`。报告与机器JSON原件保留于`evidence/audits/2026-10-02-w1-v14-quant-configurable-web-29d7797558a9431213d2.md/.json`，其中的SHA清单为其执行时历史快照。历史运行及其点时Manifest保留在审计目录；本节“最新”只指新报告。它不完成完整交易所规则、公司行动、日历、Qlib/Paper规则一致性、Ubuntu或人工验收。

2026-10-02共享合同生成文件快照说明：后续V3.3 Runner Job合同新增可选`roundIndex`后，全仓合同生成检查通过且V1.4业务API/E2E未受影响；之前当前E2E审计中的生成类型SHA属于其执行时点。原文件与原SHA清单均保留，不覆盖历史；此前W7 Runner SHA Manifest作为历史执行快照保留于`evidence/audits/2026-10-02-w7-v33-runner-round-binding.sha256`；当前共享源码/合同Hash由[刷新说明](../../../evidence/audits/2026-10-03-w7-current-shared-contracts.md)、[机器结果](../../../evidence/audits/2026-10-03-w7-current-shared-contracts.json)及此前W9共享源码SHA点时快照（仅代表当时版本）绑定。此前的当前侧车清单保留为历史点时记录。此说明只更正跨版本共享生成文件的时间基准，不改变V1.4验收状态或其业务证据。

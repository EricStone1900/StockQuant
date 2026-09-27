# V1.1 环境、账户初始化与 Web 验收中心

状态：PARTIALLY_IMPLEMENTED（既有范围于2026-09-09有人工作业证据；截至2026-09-27复核，Money/Security、账户初始化/快照、Clock/TestRun等公共Schema及TS/Python生成类型已存在；CN/US账户详情和幂等初始化有工程证据；统一TestRun stage模式在隔离库、Web/CLI同run均通过。2026-09-27新增A股日历响应Schema、三种状态Fixture、兼容规则、OpenAPI和Market Data/Platform生成类型；真实日期校验、覆盖外UNKNOWN、3项日历单测及4类HTTP响应烟测通过；完整OpenAPI/客户端发布覆盖、通用Artifact完整交付、活动API切换/回退及新增范围验收仍未完成；不据此整体标记通过）。版本入口：[README](./README.md)。共同约束：[三版规则](../05-three-version-delivery.md)。

## 1. 前置与范围

无；先阅读上层产品、架构和契约，以及共同开发规则。

本阶段所有订单、券商资产和成交均来自隔离模拟环境。真实业务数据库、Qlib或RD-Agent在声明“已验证”时必须真正执行；替身需独立标注。

## 2. 开发任务

- [x] 冻结 Money/Security/Account initialization/account snapshot、Clock 和 TestRun 公共Schema并生成 TS/Python 类型；生成漂移及兼容检查已接入。证据：[P3.1生成入口](../../../evidence/audits/2026-09-24-p3-contract-generation.md)、[P3.7消费者与兼容矩阵](../../../evidence/audits/2026-09-25-p3-7-contract-consumer.md)。
- [ ] 补齐所有跨服务OpenAPI/生成客户端及发布流程；建立并验证服务迁移和分层依赖命令。进展：A股Calendar公共契约已新增并生成Market Data/Platform客户端投影，契约检查通过；其余跨服务边界及发布流程仍未完整。
- [x] Compose core 与真实 PostgreSQL 已用于账户持久化；组合服务 CN/US 模拟账户、现金/持仓及幂等初始化已有工程和运行证据。账户详情证据：[P3.4](../../../evidence/audits/2026-09-24-p3-4-account-detail.md)、[P3.5双市场账户](../../../evidence/audits/2026-09-25-p3-5-dual-market.md)。
- [ ] 完成通用Artifact存储与全链路引用/交付；现有 TestRun 证据元数据及 V3.1 专用 Artifact 能力不等于本阶段通用 Artifact 交付完成。
- [x] 平台 API owner 身份、健康/能力查询、验收运行与证据读取已有实现；V1.1 stage模式 normal/rejection/recovery 在隔离 PostgreSQL 和真实 Chromium Web 中完成同run CLI只读核对。证据：[V1.1统一存储代码与Web套件](../../../evidence/audits/2026-09-26-v11-stage-store-code-suite.md)。
- [ ] 将V1.1统一TestRun模式按维护窗口部署到活动API并验证回退；活动Compose仍为`legacy`，隔离套件不证明生产切换。
- [x] Qlib/RD-Agent镜像基线、Mac/Docker架构及资源边界有历史记录；amd64仿真与当前Qlib锁版运行探针有单独工程证据。原生Ubuntu兼容、资源压力及真实RD-Agent运行仍未验收。

## 3. 同步 Web 开发

正式页：系统健康、模拟账户。验收页：阶段列表、场景参数、开始运行、结果和证据详情；支持加载、空、失败、无权限与刷新恢复。

验收中心路径：`/acceptance/v1/v1.1`（已存在；normal/rejection/recovery在隔离stage存储模式下完成Web同run CLI核对）。场景参数提交到后端TestRun编排接口，后端调用业务API并汇集证据。浏览器不直接写领域数据，不自行判定成交。该阶段至少提供正常、拒绝/异常场景；适用时增加重试/恢复场景。

## 4. 人工验收步骤

1. 打开验收中心，确认所有阶段初始 NOT_RUN，缺数据库时依赖状态为阻塞。
2. 选固定期初资金10000的CN模拟账户，初始化后连续重复10次，再重启服务查询；期初流水仅一笔、余额仍10000。
3. 建立USD账户，核对原币独立；另建 testRunId 验证两个运行互不污染。
4. 保存自动检查结果、截图及人工结论；重开浏览器仍能查看。

每次保存testRunId、场景版本、代码/镜像、数据/规则版本、种子及注入事件序列、实际/预期、截图/Trace。判定依据必须是后端事实和独立检查，不能只看Toast成功提示。

## 5. 异常与替身边界

数据库不可用返回可诊断错误；异载荷复用初始化键返回409；非法账户范围返回403；不得用内存替身伪称持久化通过。

## 6. 产物与验证

目标产物：apps/web 验收中心骨架、platform-api-service、portfolio-risk-service 初始化切片、packages/contracts、infra/compose、fixtures/cn/us/fx、scripts/bootstrap 与阶段证据。

自动验证：真数据库初始化/重启/幂等集成测试、生成契约检查、浏览器初始化与证据持久化E2E。

需求/测试追踪：SYS-01～03、POR-01、XMK-01/04；T01～03、T35、T41、T43；新增 DV-01～03 / VT01～03。

退出条件：开发任务完成、Web真实可操作、全部适用检查PASS、人工签署、已知限制写入证据。填写[本版验收表](./99-acceptance.md)，未完成项不得勾选通过。

## 7. 阶段交付待办（完成后勾选）

以下勾选只记录本阶段交付进度，不能代替第2节逐项开发任务或版本验收结论。开发者凭实现/实测证据勾选开发项；“人工验收”仅在用户实际确认后勾选，不预填PASS。

2026-09-27增量：Calendar响应Schema/Fixture/兼容矩阵/OpenAPI及两个服务生成类型通过`pnpm contracts:check`；Market Data build、Platform API typecheck、Market Data 60项单测通过；`pnpm --filter @stockquant/market-data-service calendar:http-smoke`退出0，隔离无数据库服务对交易日/休市日/覆盖外日期分别返回200与预期枚举，无效日期返回400。此局部契约交付不代表本节整体完成。

- [ ] 契约、数据结构、场景定义和预期结果已冻结。
- [ ] 第2节后端任务完成，真实依赖与替身明确。
- [ ] 正式Web功能页及验收中心正常/异常场景完成。
- [ ] 命令、实际URL、Fixture路径/Hash和配置说明已补齐，待实现占位已消除或明确列为范围外。
- [x] 开发者按第8节从准备到导出亲自执行，保存代码版本、退出码、截图/Trace和断言证据。
- [x] 重复/恢复及适用观察期验证完成，未覆盖项如实记录。
- [x] 用户已通过Web及命令证据完成人工验收，记录确认时间/结论。
- [x] 操作说明与限制已更新，[本版验收表](./99-acceptance.md)已同步。

## 8. 阶段验收操作手册

### 8.1 当前可执行性与验收准备

手册状态：VERIFIED_EXECUTABLE（2026-09-08）。以下命令、路由、Fixture 与场景已在 Mac ARM64 本地执行；这只证明开发者验证可复现，用户人工验收仍为 NOT_RUN。

前置服务：平台API、Web、组合服务、真实PostgreSQL、Artifact存储。

固定输入：内置CN/US初始化Fixture；CN初始现金10000 CNY、持仓0，seed=20260907。

| 开发交付时必须填写 | 当前值 |
|---|---|
| 实测代码Commit或工作区Hash/验证日期 | `2c1d352`；2026-09-09 |
| 项目根目录、Node/pnpm/Python/uv及Docker版本 | `/Users/huangbosong/Documents/ChatGPT/StockQuant`；Node 24.1.0、pnpm 10.34.5、Python 3.9.6、uv 0.12.7、Docker 28.0.4、Compose 2.34.0-desktop.1；host `arm64` |
| Web基础URL/身份登录或会话建立方式 | 原生开发 Web `http://127.0.0.1:5173/acceptance/v1/v1.1`；容器化 Web `http://127.0.0.1:8080/acceptance/v1/v1.1`；首次加载由本地开发会话端点设置 HttpOnly `sq_session`，仅 `acceptance-owner-1`；CLI 使用仅本地测试身份头 |
| 本阶段Web路由 | `/acceptance/v1/v1.1`（目标） |
| 正式页面的真实入口/跳转链接 | `/` 与 `/acceptance/v1/v1.1`；平台 API `http://127.0.0.1:3000`；组合服务不发布到宿主 |
| Fixture文件/数据版本/确切日期/Hash、规则与成本版本 | `fixtures/v1/v1.1/accounts.json`；`v1.1-accounts-1`；SHA-256 `575d2cb5e674bacbf951d9ca485c7e5c8e49e9d15bbb4623a71fd0c08c3685f4`；FIXTURE/SIMULATION_ONLY；成本/策略不适用 |
| 配置文件及必需环境变量名/非秘密测试值 | `infra/compose/docker-compose.yml`；PAPER、FAKE、LIVE=false；`STOCKQUANT_DATABASE_URL`、`STOCKQUANT_PORTFOLIO_API_URL`、`STOCKQUANT_LOCAL_DEVELOPMENT_USER`、`STOCKQUANT_TEST_IDENTITY_HEADER_ENABLED`；无真实券商/模型凭据 |
| 外部故障目标及可执行命令、恢复/隔离清理入口 | recovery 仅运行 `docker compose -f infra/compose/docker-compose.yml restart portfolio-risk-service`，随后对原 testRunId 调用 continue-recovery；默认保留卷和证据，不执行清理 |
| 预期耗时、轮询超时、实际观察期/预算 | normal/rejection <1秒；recovery 含重启约11秒；CLI 最多轮询30秒；无真实观察期/模型预算 |

### 8.2 初始化与启动（目标命令，待实现）

在上表填写的项目根目录运行；工具版本按锁文件/项目说明准备。首次开发由开发者生成锁文件和脚本，验收者不负责补建环境。环境变量按上表配置；保持FAKE券商与模拟账户，真实模型仅在本阶段明确要求且预算已配置的场景调用。

```bash
# 终端A：先确认实际执行目录为项目根目录
pwd
pnpm install --frozen-lockfile
pnpm stack:up -- --stage V1.1

# 终端B：同一项目根目录，保持开发服务器运行
pnpm dev:web
```

预期：安装与stack入口退出0；stack输出本阶段服务、端口、健康/迁移及持久卷状态。依赖不可用应非零并说明原因；不能删除旧业务卷重试。Web服务器持续运行并输出基础URL，尚在运行不要求退出码0。若已使用容器化Web，则填写已验证入口并避免重复占用端口。Ubuntu部署必须补齐实际镜像拉取/启动/迁移命令，不能仅用dev:web代替发布验证。

初始化在验收中心“准备隔离运行”完成；CLI场景入口也负责同样的准备，两者调用同一业务API。准备后记录testRunId、accountId、namespace及Fixture/DataVersion；初始化业务本身是测试对象时不得预先完成被测动作。缺源/凭证/历史数据时显示缺项，不静默换成Fake并报真实场景通过。

### 8.3 Web逐步操作及预期结果

1. 登录上表实际Web地址，进入“开发验收中心→V1→V1.1”；检查页面版本、模拟模式、服务能力与固定输入。
2. 每个场景点击“准备隔离运行”，核对参数后记下testRunId；正常/异常/恢复使用独立运行，场景内部的重复或恢复操作继续使用原运行及业务幂等键。
3. 按下表执行。操作按钮为目标交互，交付时开发者必须换成实际页面名称/按钮及路由；预期必须从业务明细读取，不能只看“任务完成”。

| 场景ID（阶段内唯一） | 场景 | 点击顺序/输入 | 预期结果与核对点 |
|---|---|---|---|
| normal | 初始化幂等 | 选择CN初始化Fixture，点击“准备隔离运行”，再点击“初始化”；在同一运行中点击“重复提交10次”，从结果链接打开账户页。 | 期初现金10000、持仓0、期初流水1笔；重复请求返回相同业务结果。 |
| rejection | 初始化冲突 | 新建异常运行，先以同一初始化键提交现金10000，再通过场景按钮以现金20000重用该键；再测越权账户查询。 | 同键异载荷409且余额仍10000；越权403，无额外流水。 |
| recovery | 持久化恢复 | 保存运行ID，按已核实的限定重启步骤重启组合服务，刷新账户与运行详情；另建隔离运行。 | 旧账户及证据仍存在；新运行独立，期初不累加；实际重启证据可查。 |

4. 从运行详情打开关联正式页面，执行一次刷新/关闭再打开；核对长任务后台状态、历史证据和加载/失败/陈旧提示。
5. 每项记录实际结果、截图与业务ID。异常场景“预期拒绝”被正确验证时断言可PASS，但被测业务操作仍显示拒绝；若意外接受则断言FAIL。

### 8.4 命令行复验与相同运行核对（待实现）

在项目根目录执行以下目标命令。stage/scenario必须匹配8.3定义；CLI与Web共用场景版本、Fixture和断言。每条命令执行后立即查看退出码，任何非零先保存错误再定位，不能继续假定本阶段通过。

```bash
pnpm verify:stage -- --stage V1.1 --scenario normal --seed 20260907
# 紧接上一命令执行；0表示全部场景断言通过
 echo $?
pnpm verify:stage -- --stage V1.1 --scenario rejection --seed 20260907
 echo $?
pnpm verify:stage -- --stage V1.1 --scenario recovery --seed 20260907
 echo $?
pnpm verify:stage -- --stage V1.1 --suite code
 echo $?
pnpm test:e2e -- --stage V1.1
 echo $?
```

预期：各场景输出testRunId、实际数据/模型/券商模式、断言expected/actual及证据位置；预期内拒绝场景验证成功退出0，意外副作用/缺脚本/缺必需依赖/未满观察条件非零。恢复场景需外部动作时输出已核实目标和步骤，停留WAITING；完成动作后复验原run，不伪称Web可重启宿主。浏览器测试必须实际运行本阶段用例，零用例/全跳过不能退出0。

再对Web中已运行的同一testRunId执行只读核对，避免仅创建新样本掩盖页面问题：

```bash
# 粘贴Web运行详情中的实际testRunId，再按回车；这是普通ID，不是凭证
read -r acceptance_run_id
pnpm verify:stage -- --stage V1.1 --run "$acceptance_run_id" --check-only
 echo $?
pnpm evidence:export -- --run "$acceptance_run_id"
 echo $?
```

check-only仅查询此运行后端事实并追加检查证据，不创建新订单、不重放成交或发起模型调用；空ID/错误stage/越权run必须拒绝。导出只含脱敏数据，输出实际目录和Manifest Hash，不自动勾选人工验收。端到端正常/异常/恢复运行产生不同ID，导出时分别保存。

本阶段代码测试覆盖要求：真数据库初始化/重启/幂等集成测试、生成契约检查、浏览器初始化与证据持久化E2E。 在交付时把映射到的实际Domain/DB/契约/服务内测试命令补入本节，注明执行目录、测试文件或套件、退出码和报告；verify:stage必须展示实际调用的测试清单，不能空壳返回0。Python服务使用自身锁定环境，不串用其他服务虚拟环境。

### 8.7 统一存储模式隔离复验（2026-09-26）

此复验使用 `infra/compose/docker-compose.v11-integration.yml` 创建独立 PostgreSQL、Portfolio Risk 与 Platform API，API 明确设为 `STOCKQUANT_V11_RUN_STORAGE=stage`；不得把 recovery 步骤直接指向活动项目。完整构建、lint、全仓单测、契约及 normal/rejection/recovery 后端集成可通过以下自动清理入口重跑：

```bash
pnpm test:integration:v11-stage-storage
```

预期退出码为0，输出 `V1.1 code`、`storageMode=stage`、`recoveryRestartTargetVerified=true` 与 `exactContainersAndVolumesRemoved=true`。该命令构建一次性隔离栈，在运行套件前断言既有 recovery Compose 命令解析到同一个隔离 Portfolio 容器，结束时清除精确临时项目并检查容器、卷、网络均无遗留。2026-09-26 本地执行退出0；normal、rejection、recovery TestRun 分别为 `40f1d90b-8cf2-475e-b54c-ba548378d73e`、`e4bfb192-7d43-4b62-9bea-780fec36e1b3`、`baf944d2-312c-4843-8dd9-53d8290325f5`。

Web 同 run 的 stage-mode 正常场景已单独用真实 Chromium 复验：独立 Compose 项目名 `sq-v11-stage-web`，API `http://127.0.0.1:32801`，Vite `http://127.0.0.1:5174`。命令如下；执行前须确认这两个回环端口空闲。Playwright 测试从页面读取 TestRun ID，并调用 `scripts/verify-stage.mjs --stage V1.1 --run <同一ID> --check-only`，断言 CLI 返回同一ID及 `COMPLETED`。2026-09-26 执行1/1通过。

```bash
V11_HOST_PORT=32801 docker compose -p sq-v11-stage-web -f infra/compose/docker-compose.v11-integration.yml up -d
STOCKQUANT_PLATFORM_API_URL=http://127.0.0.1:32801 pnpm --filter @stockquant/web dev --port 5174 --strictPort
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5174 STOCKQUANT_PLATFORM_API_URL=http://127.0.0.1:32801 pnpm --filter @stockquant/web test:e2e --grep 'V1.1 normal scenario creates an isolated run'
# 停止 Vite 终端后执行精确清理
docker compose -p sq-v11-stage-web -f infra/compose/docker-compose.v11-integration.yml down --volumes --remove-orphans
```

随后将 Web rejection 与 recovery 场景纳入同一隔离入口。最终 `pnpm test:integration:v11-stage-storage` 全流程退出0，Playwright 3/3；每个页面运行均以相同 TestRun ID 执行 CLI `--check-only`。recovery 在重启前验证项目名及目标 Portfolio 容器 ID，重启后轮询容器健康检查为 `healthy` 才继续原 TestRun，并核对持久账户、账本及 namespace。早期一次重启后立即查询导致该 Web TestRun 为 `FAILED`；此失败保留在审计中，修正后的健康闸门复验通过。以上证据不部署活动 API，不修改人工签署、观察计数或阶段验收结论。详见[统一存储代码套件及Web同run审计](../../../evidence/audits/2026-09-26-v11-stage-store-code-suite.md)。

2026-09-27 当前工作树复验：同一 `pnpm test:integration:v11-stage-storage` 再次退出0，随机隔离项目 `sq-v11-stage-1ee379fe6834ab09b4f8` 的 stage-mode API 通过 normal/rejection/recovery Web/CLI同run检查，Chromium 3/3；recovery restart target 与隔离Portfolio container ID一致。隔离容器、卷、网络清理并检查无残留。此次不切换活动API；详情见[当前工作树复验审计](../../../evidence/audits/2026-09-27-v11-stage-storage-current-reverification.md)。

### 8.5 交叉核对、失败定位与恢复

交叉核对：账户页现金/持仓、期初流水数量与数据库只读检查结果一致；初始化键和testRunId关联。

先检查Web与CLI的testRunId、输入/策略/代码版本和模式是否一致，再按Trace查平台、领域、适配器与持久化证据。页面错误而CLI正确，记录Web失败；二者都错则保留领域断言失败。缺能力先查健康/迁移/数据与日志，不修改余额或订单状态使断言通过。

独立复跑创建新run；测试幂等/检查点/重启恢复则使用原run和原幂等键。故障发生后保留旧证据，修复后新增运行或检查记录；不得清空账本、随机更换seed直到通过。真实观察窗口、来源验证和实际模型调用与加速/录制测试分别记录。

### 8.6 验收记录与收尾

| 场景/检查 | Web实际结果与截图 | 命令/退出码/报告 | testRunId/业务ID | 结论 |
|---|---|---|---|---|
| normal | Playwright 通过；Web 创建与展示断言 | `pnpm test:integration`，退出0 | `d5add8bf-ae44-48a8-b726-b4be34ab4278` / `83e6d24e-69f4-400e-85cf-c7cb39e162d8` | PASS（自动+人工确认） |
| rejection（含全部子场景） | API/后端证据通过；Web人工确认通过 | `pnpm test:integration`，退出0 | `24276340-2e5a-4516-a7d0-20f92851754b` / `a5140049-0423-4c50-833f-0dcd250b2db5` | PASS（自动+人工确认） |
| recovery（含实际外部动作） | API/后端证据通过；Web重启后继续确认通过 | `pnpm test:integration`，退出0 | `bdb53484-19b4-4363-a130-eee94761df54` / `fe720260-6ece-428f-854c-5f51b8b70556` | PASS（自动+人工确认） |
| Web同run只读核对与证据导出 | 同一 normal run 已只读查询；导出脱敏 JSON | `pnpm verify:stage -- --stage V1.1 --run d5add8bf-ae44-48a8-b726-b4be34ab4278 --check-only`、`pnpm evidence:export -- --run d5add8bf-ae44-48a8-b726-b4be34ab4278`，退出0 | Manifest `fe6eb9e97d27f99f9ffaa8eae22beea9d13f8e53495ecb9207a927204509748b` | PASS（自动+人工确认） |
| 本阶段代码测试/实际观察适用项 | 单元、类型、构建、JSON/Hash、真实PG/重启、Playwright均通过；无实际市场观察 | `pnpm baseline:check`、`pnpm test`、`pnpm typecheck`、`pnpm build`、`pnpm test:e2e -- --stage V1.1`，均退出0 | 镜像：Postgres `9e976447…`，API `82366a5…`，组合 `cfba97fb…`，Web `31cfa0f…` | PASS（开发者自动验证） |
| 用户人工验收 | Web normal/rejection/recovery、刷新、重启恢复及 CLI 核对已完成 | 不由脚本代签 | 用户确认（本会话） / 2026-09-09 | PASS |

记录不适用子项的范围依据，不能将必需项改为不适用绕过门禁。归档后在[本版验收表](./99-acceptance.md)填写证据链接和结论。清理只针对本轮已结束的隔离运行，默认保留证据；停止测试不能删除数据库卷或取消无关任务。

### 范围与签署状态澄清（2026-09-27）

2026-09-09的用户签署只覆盖当时的本地账户初始化与验收中心；2026-09-25至26增加的双市场账户和统一TestRun stage存储切片具有自动/隔离Web证据，但没有新增用户签署，也未切换活动API（Compose仍为`legacy`）。第2节`[x]`仅标识已由对应工程证据覆盖的子项；第7节完整交付清单仍有未完成项，V1.1和V1整版状态不得据此扩大为通过。

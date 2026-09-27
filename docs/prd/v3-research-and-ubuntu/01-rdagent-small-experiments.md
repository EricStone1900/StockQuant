# V3.1 真实 RD-Agent 小样本实验闭环

状态：NOT_RUN；并行准备：`PREPARATION_READY_WITH_BLOCKERS`（[准备证据](../../evidence-v3.1-preparation.md)）。版本入口：[README](./README.md)。共同约束：[三版共同规则](../05-three-version-delivery.md)。

## 1. 前置与范围

V1环境探针缺口已处理；V2数据/回放小样本通过；实际模型Provider、凭证引用与预算可用。

本阶段所有订单、券商资产和成交均来自隔离模拟环境。真实业务数据库、Qlib或RD-Agent在声明“已验证”时必须真正执行；替身需独立标注。

## 2. 开发任务

- [ ] 在现有research-automation-service中封装固定commit的RD-Agent；真实调用模型、生成代码、运行Qlib实验并产出候选，不另建重复rd-agent-service领域。
- [ ] 分别构建控制器与实验镜像；开发挂载源码、运行时Linux内编译，发布安装固定构建产物；记录全部架构/依赖锁/镜像Digest及Qlib fork版本。
- [ ] 实验Runner独立工作区、只读行情、CPU/内存/时间/进程/输出限制；生成代码无Docker Socket/控制器凭证/模型密钥/生产Registry访问。
- [ ] 控制器通过受控Runner管理实验；开发若用宿主Socket只给可信控制器并限隔离开发环境，不能把Socket只读挂载当权限限制；正式部署采用独立研究执行环境。
- [x] V3.1准备链的平台API→研究服务调用使用独立Bearer身份与route scope；Runner Host claim/heartbeat/complete 已具备独立Bearer身份、PostgreSQL原子领取、过期接管和fencing；隔离PG并发/旧worker拒绝用例通过。Host客户端完成claim/心跳/租约绑定INPUT读取；严格JSON bundle parser/materializer生成隔离code/data输入；固定Linux/amd64 Runner smoke正常、超时、路径逃逸、OOM及宿主超时daemon清理通过。临时隔离HTTP+PG smoke已用真实冻结Docker镜像贯通claim→INPUT→heartbeat→执行→OUTPUT持久发布→complete，并完成一次Host SIGKILL、租约过期、fencing token 2接管和旧容器清理；输出Hash正确，旧fence发布被拒绝。研究服务85项单测、10项隔离PG集成通过。此项是固定代码Runner准备验证，不是真实RD-Agent实验。活动服务未部署新Runner路由；常驻运行、并发生产资源、原生Ubuntu、真实模型/费用和阶段人工验收仍未完成。见[P7.2](../../../evidence/audits/2026-09-25-p7-2-service-identity.md)与[P7.3](../../../evidence/audits/2026-09-25-p7-3-offline-runner-smoke.md)。
- [x] 平台新增按登录用户及精确V3.1 TestRun授权读取已发布输入Artifact；后端要求ArtifactRef列于当前run且与RunnerJob namespace一致，研究服务再次核对RunnerJob身份。隔离HTTP smoke：授权200、缺身份401、异主403、未关联404；平台40/40、研究85/85单测及10项隔离PG集成通过。Web准备页可读取并下载当前run的输入Artifact；隔离Playwright UI测试通过。未部署活动服务；正式研究工作台及真实会话/人工验收仍缺。见[P3.R Artifact审计](../../../evidence/audits/2026-09-25-p3-r-artifact-boundary.md)。
- [x] 固定模型Fixture生成的Qlib代码已接入测试专用V3.1页面/API：Experiment→Fixture请求级预算结算→输入Artifact→真实冻结离线Runner→输出Artifact与指标；页面按TestRun和当前owner刷新/读出结果，关闭并重新打开页面后从浏览器本地TestRun ID恢复。同一双临时数据库Chromium smoke通过，验证指标/Artifact SHA、23 cents结算、异主403及生产模式测试入口关闭/403；零外部模型调用。测试开关只在平台`NODE_ENV=test`且`STOCKQUANT_V31_FIXED_PIPELINE_TEST=true`、研究服务`NODE_ENV=test`且`STOCKQUANT_MODEL_GATEWAY_TEST_FIXTURE=true`时启用。此项是固定Fixture/代码验收，未完成真实RD-Agent/模型、其他故障矩阵或人工签署。见[P7.5审计](../../../evidence/audits/2026-09-25-p7-5-fixed-pipeline-smoke.md)。
- [ ] 保存提示词/模型请求与响应摘要、代码、实验输入、错误及预算；故障模拟可验证编排，真实RD-Agent闭环必须有实际模型与代码执行证据。

## 3. 同步 Web 开发

正式页：研究任务配置、预算、轮次、假设、生成代码、实验日志和指标。验收页：真实/回放模型标识、沙箱拒绝、OOM/超时和失败实验。

验收中心路径：`/acceptance/v3/v3.1`（目标路由）。场景参数提交到后端TestRun编排接口，后端调用业务API并汇集证据。浏览器不直接写领域数据，不自行判定成交。该阶段至少提供正常、拒绝/异常场景；适用时增加重试/恢复场景。

## 4. 人工验收步骤

1. 选择已冻结小数据、1～3轮和预算，运行至少一次真实模型→代码→Qlib评价，候选质量差也保留结果。
2. 关闭重开页面查看真实后台任务；检查控制器/实验镜像版本及数据引用。
3. 执行受控越权/超时测试，确认读取非授权文件/连接受限网络被拒绝且其他任务继续。
4. 模拟模型限流或预算耗尽，检查有限重试、明确停止与失败证据。

每次保存testRunId、场景版本、代码/镜像、数据/规则版本、种子及注入事件序列、实际/预期、截图/Trace。判定依据必须是后端事实和独立检查，不能只看Toast成功提示。

## 5. 异常与替身边界

没有凭证或预算时可以完成其他实现，但本阶段真实闭环NOT_RUN；不能用预制因子或录制响应冒充实时模型生成。小样本无有效候选不等于编排失败，评价指标需真实输出。

## 6. 产物与验证

目标产物：research-automation-service、受控Runner、RD-Agent/Qlib实验镜像、模型网关必要能力、研究Web与实验Artifact。

工程准备证据补充（2026-09-25）：P7.2平台服务身份、Runner租约/fencing及V3.1固定场景已按[执行记录](../../../evidence/audits/2026-09-25-p7-2-service-identity.md)实测；P7.3固定离线Runner镜像五项烟测和隔离HTTP→真实Docker→Artifact持久化闭环已运行，见[执行记录](../../../evidence/audits/2026-09-25-p7-3-offline-runner-smoke.md)。Host进程未部署常驻，控制器重启恢复、并发生产资源、原生Ubuntu、真实RD-Agent/模型、实际费用和人工验收仍未完成。

模型网关预检安全补充（2026-09-25）：配置检查现拒绝非HTTPS Provider URL、URL userinfo/query/fragment、通配符白名单，并将非标准端口纳入精确authority匹配；研究服务18个测试文件/78项单测和构建通过。此项没有发起网络请求，未测试客户端重定向、底层外连策略或实际费用，因此第2节真实调用任务与本阶段NOT_RUN状态不变。详见[P7.4预检审计](../../../evidence/audits/2026-09-25-p7-4-gateway-preflight-security.md)。

模型调用级预算准备（2026-09-25）：新增基于PostgreSQL的 `model_call_budgets`，绑定 `modelRunId`、请求指纹和每次请求预留额，覆盖RESERVED/DISPATCHED/UNKNOWN/SETTLED/REJECTED；UNKNOWN保持全额占用，同实验并发请求通过行锁服从实验限额，未解决请求阻止父实验预算结清。另有注入式调用coordinator：预检后预留→先持久DISPATCHED→Provider port→结算/UNKNOWN；固定假Provider验证一次调用与重复ID不重发，以及DISPATCHED已提交但确认丢失时绝不调用Provider。研究服务19个测试文件/85项单测、专用PG预算账本集成3/3、全部研究服务PG集成8/8及构建通过。Coordinator尚未接入服务HTTP/Runner工作流，无生产Provider/用量结算接口，也未发起真实网络/模型调用，不能作为P7.4完成证据。详见[请求预算账本审计](../../../evidence/audits/2026-09-25-p7-4-request-budget-ledger.md)。

自动验证：实际RD-Agent小实验、真实Runner权限/资源隔离、模型故障与预算、任务/Artifact持久化及研究Web E2E。

需求/测试追踪：RES-01～03、STR-06、AGT-03/07/08必要子集；T13/19/20；DV-07、VT07。

退出条件：开发任务完成、Web真实可操作、全部适用检查PASS、人工签署、已知限制写入证据。填写[本版验收表](./99-acceptance.md)，未完成项不得勾选通过。

## 7. 阶段交付待办（完成后勾选）

以下勾选只记录本阶段交付进度，不能代替第2节逐项开发任务或版本验收结论。开发者凭实现/实测证据勾选开发项；“人工验收”仅在用户实际确认后勾选，不预填PASS。

- [x] 契约、数据结构、场景定义和预期结果已冻结（V3.1 preparation manifest v1；真实模型输出仍未运行）。
- [x] 固定Fixture→固定Qlib代码→隔离Runner→输出Artifact/指标→预算结算已由真实V3.1 Chromium页面同TestRun验证；页面关页重开恢复，owner和生产模式边界已核对。记录见[P7.5审计](../../../evidence/audits/2026-09-25-p7-5-fixed-pipeline-smoke.md)。只代表固定Fixture工程切片，不关闭真实研究、其他故障矩阵或人工验收。
- [ ] 第2节后端任务完成，真实依赖与替身明确。
- [ ] 正式Web功能页及验收中心正常/异常场景完成。
- [ ] 命令、实际URL、Fixture路径/Hash和配置说明已补齐，待实现占位已消除或明确列为范围外。
- [ ] 开发者按第8节从准备到导出亲自执行，保存代码版本、退出码、截图/Trace和断言证据。
- [ ] 重复/恢复及适用观察期验证完成，未覆盖项如实记录。
- [ ] 用户已通过Web及命令证据完成人工验收，记录确认时间/结论。
- [ ] 操作说明与限制已更新，[本版验收表](./99-acceptance.md)已同步。

增量交付（2026-09-25）：固定Fixture全链路及正式验收页测试入口已由隔离Chromium/双临时PG/冻结Runner实测；页面关闭后重开能恢复同一TestRun，并读取结果Artifact。见[P7.5审计](../../../evidence/audits/2026-09-25-p7-5-fixed-pipeline-smoke.md)。第2节真实RD-Agent与Provider、生产部署、其他故障矩阵、完整阶段手册、用户人工验收均未完成，因此上方整体Web与交付复选框保持未勾选。

Runner故障恢复补充（2026-09-25）：隔离研究服务HTTP smoke覆盖Python exit 17失败、1秒执行超时、固定代码分配内存触发的128 MiB Runner OOM、本地`--network none`主动连接保留测试网段的拒绝，以及平台Bearer身份取消活动Runner。超时持久为`TIMED_OUT`；OOM持久为`FAILED`（Docker/shell退出码247）；网络拒绝持久为`FAILED`（退出码1）；取消持久为`CANCELLED`，旧Worker心跳/完成被fence，睡眠容器被移除。失败/取消均不发布OUTPUT Artifact，固定Fixture费用23 cents只结算一次，随机临时PG/Artifact目录清理通过，外部模型调用0。Runner OOM与网络拒绝分别和Market Data PG 21/21、P5.7订单丢响应重启恢复Smoke并发运行且均通过；另有Compose健康快照。样本仅证明固定本地故障与有限并行检查，不是生产连续性/容量证据。生产出口/DNS策略、真实模型与人工验收仍未完成。见[P7.5审计](../../../evidence/audits/2026-09-25-p7-5-fixed-pipeline-smoke.md)及[P7.3 OOM退出映射](../../../evidence/audits/2026-09-25-p7-3-offline-runner-smoke.md)。

增量准备页功能已完成一次隔离UI验证：正常准备场景返回的同一TestRun展示输入Artifact，点击“读取当前运行输入”调用owner/run范围API，并提供下载。该测试使用隔离Playwright响应验证页面路径；真实后端权限由[HTTP smoke](../../../evidence/audits/2026-09-25-p3-r-artifact-boundary.md)单独验证。它不代表完整研究Web、真实会话集成或V3.1人工验收通过。

## 8. 阶段验收操作手册

### 8.1 当前可执行性与验收准备

手册状态：VERIFIED_EXECUTABLE（2026-09-21，准备范围；真实 RD-Agent 闭环仍 NOT_RUN）。以下命令、路由和按钮已在本机 Docker Compose 中执行并保存证据；真实模型、Runner 和预算门禁仍按第5节标记为阻塞。

前置服务：research-automation-service、真实RD-Agent控制器、隔离Runner/Qlib镜像、实际模型Provider及核心Paper。

固定输入：冻结小数据、轮数1（再扩至3）、并发1；实际模型/凭证引用/预算由开发交付时填写，秘密不写文档。

| 开发交付时必须填写 | 当前值 |
|---|---|
| 实测代码Commit或工作区Hash/验证日期 | HEAD `5f17f97` + 工作区未提交变更；2026-09-21 |
| 项目根目录、Node/pnpm/Python/uv及Docker版本 | `/Users/huangbosong/Documents/ChatGPT/StockQuant`；Node v24.1.0、pnpm 10.34.5、Docker Server 28.0.4 |
| Web基础URL/身份登录或会话建立方式 | `http://127.0.0.1:8080`；本机验收身份由平台 `STOCKQUANT_LOCAL_DEVELOPMENT_USER=acceptance-owner-1` 注入，不记录凭证 |
| 本阶段Web路由 | `http://127.0.0.1:8080/acceptance/v3/v3.1` |
| 正式页面的真实入口/跳转链接 | `http://127.0.0.1:8080/acceptance/v3/v3.1`，开发验收中心 → V3 → V3.1；页面展示同一TestRun的Experiment、ArtifactRef、Runner Job、执行状态和阻塞条件；固定Pipeline仅在明确测试开关下展示，输出指标可读，页面关闭重开可恢复TestRun。Chromium→Vite→平台→研究服务→离线Runner隔离烟测通过；生产Runner/Gateway仍关闭，真实研究工作台未完成 |
| Fixture文件/数据版本/确切日期/Hash、规则与成本版本 | `fixtures/v3/v3.1/manifest.json`；SHA-256 `f6b318d6208db25c92350e1d2e3ed99d8d7ca1f207927c14e0982e73179b115b`；RESEARCH/FIXTURE/FAKE，轮数1，默认预算300 cents，单实验硬上限1000 cents |
| 配置文件及必需环境变量名/非秘密测试值 | `.env.local`、Compose；`STOCKQUANT_DATABASE_URL`、`STOCKQUANT_RESEARCH_AUTOMATION_URL`、`RESEARCH_AUTOMATION_DATABASE_URL`；Bearer Token为每调用方独立值，不记录秘密；Host默认`NOT_CONFIGURED`。真实模型Gateway仍未配置且没有模型调用 |
| 固定Pipeline本地隔离验收命令/配置 | `pnpm --filter @stockquant/platform-api-service v31:fixed-pipeline-web-http-smoke`；脚本自建随机平台/研究PostgreSQL数据库、临时Artifact目录和localhost端口，设置双重NODE_ENV=test Fixture开关，运行Chromium+Vite+Platform+Research+冻结Runner；预期JSON `status=PASS`、`browserToPlatformToResearchToRunner=true`、`externalModelCalls=0`、Runner=`COMPLETED`、预算23 cents/SETTLED，并核对输出SHA/指标、关页恢复、异主403、生产模式403；结束清理精确记录、临时目录和两个数据库。无真实Provider/券商访问 |
| 固定Runner故障/取消及隔离清理命令 | `pnpm --filter @stockquant/research-automation-service v31:fixed-pipeline-failure-http-smoke`、`v31:fixed-pipeline-timeout-http-smoke`、`v31:fixed-pipeline-oom-http-smoke`、`v31:fixed-pipeline-network-http-smoke`、`v31:fixed-pipeline-cancel-http-smoke`；各脚本使用随机PG库、临时Artifact目录和冻结离线镜像，最后清理本轮精确数据。取消预期`CANCELLED`、心跳fence、容器移除、零输出Artifact、23 cents费用结算；失败用例预期终态与审计各有断言。只证明本地隔离准备切片；不指向活动`research_automation`或共享卷，也不替代用户验收 |
| 外部场景入口 | LIVE拒绝由 `pnpm verify:stage -- --stage V3.1 --scenario rejection --seed 20260907` 验证；人工外部恢复步骤按此表保留TestRun/Artifact，不删除共享卷 |
| 预期耗时、轮询超时、实际观察期/预算 | `stack:up` 约数分钟；场景与 E2E < 30 秒；单轮默认预算300 cents、单实验硬上限1000 cents、阶段总预算3000 cents（实际模型未调用）；健康检查超时由 Compose 3 秒/20 次控制 |

### 8.2 初始化与启动（已验证准备范围）

在上表项目根目录运行；环境变量按上表配置，保持 FAKE 券商与模拟账户。真实模型未配置时，服务必须返回 `PENDING_PREREQUISITES`，不得伪称真实闭环通过。

```bash
# 终端A：先确认实际执行目录为项目根目录
pwd
pnpm install --frozen-lockfile
pnpm stack:up -- --stage V3.1

# 终端B：同一项目根目录，保持开发服务器运行
pnpm dev:web
```

实测：`pnpm stack:up -- --stage V3.1` 构建并启动 PostgreSQL、research-automation-service、platform-api-service 和 Web；本机入口为 `http://127.0.0.1:8080/acceptance/v3/v3.1`，研究服务 `http://127.0.0.1:3008/ready`，平台 API `http://127.0.0.1:3000/ready`。研究数据库首次运行需存在 `research_automation` 角色和数据库；不得删除既有卷重试。Ubuntu/RD-Agent 正式迁移仍未验证。

初始化由验收中心三个准备场景按钮或对应 CLI 入口完成，两者调用同一业务 API。准备后记录 testRunId、namespace 及 Fixture/DataVersion；初始化业务本身是测试对象时不得预先完成被测动作。缺源/凭证/历史数据时显示缺项，不静默换成 Fake 并报真实场景通过。

### 8.3 Web逐步操作及预期结果

1. 打开 `http://127.0.0.1:8080/acceptance/v3/v3.1`，进入“开发验收中心→V3→V3.1”；检查页面版本、模拟模式、服务能力与固定输入。
2. 分别点击三个准备场景按钮，核对后端证据并记下返回的testRunId；正常/异常/恢复使用独立运行，场景内部的重复或恢复操作继续使用原运行及业务幂等键。
3. 按下表执行。当前准备页按钮为“运行正常前置检查”“运行 LIVE 拒绝”“运行取消与幂等恢复”；预期必须从业务明细读取，不能只看“任务完成”。

| 场景ID（阶段内唯一） | 场景 | 点击顺序/输入 | 预期结果与核对点 |
|---|---|---|---|
| normal | 真实研究小实验 | 选择真实模型与预算→轮数1→启动→查看假设、生成代码、Qlib实验及评价；重开页面查询。 | 实际调用与代码执行证据齐备；候选差也保存真实结果，不以预制代码替代真实生成。 |
| rejection | 沙箱与预算 | 选择受控越权/超时/模型限流/预算耗尽子场景，查看Runner和模型错误。 | 实验不能访问Socket/秘密/授权外文件；有限重试、明确停止，核心Paper继续。 |
| recovery | 失败留痕与重试 | 中断单个实验后查看失败Artifact，在新运行中重试；检查旧日志保留及真实/录制标记。 | 不发布半候选、不抹掉失败；新模型结果允许不同；缺凭证或预算不执行真实实验并保持NOT_RUN。 |
| fixed-pipeline（仅测试环境） | 固定Fixture代码端到端及关页恢复 | 运行`pnpm --filter @stockquant/platform-api-service v31:fixed-pipeline-web-http-smoke`；脚本打开V3.1页面，预览后启动固定链，关闭页面并重开，刷新原TestRun直至完成，再读取输出指标。 | 本地Vite→平台→研究服务→固定Qlib代码Runner；零外部模型调用、23 cents/SETTLED、输出Artifact SHA/指标正确、异主403；生产模式预览不可用且POST 403。最后通过TestRun `11f42001-3663-4a22-9139-afc3a9f4e59b`。这是固定Fixture工程证据，不是实际RD-Agent验收。 |

4. 从运行详情打开关联正式页面，执行一次刷新/关闭再打开；核对长任务后台状态、历史证据和加载/失败/陈旧提示。
5. 每项记录实际结果、截图与业务ID。异常场景“预期拒绝”被正确验证时断言可PASS，但被测业务操作仍显示拒绝；若意外接受则断言FAIL。

### 8.4 命令行复验与相同运行核对（已验证准备范围）

在项目根目录执行以下命令。stage/scenario匹配8.3定义；CLI与Web共用场景版本、Fixture和断言。2026-09-21 实测三条命令均退出0。

```bash
pnpm verify:stage -- --stage V3.1 --scenario normal --seed 20260907
# 紧接上一命令执行；0表示全部场景断言通过
 echo $?
pnpm verify:stage -- --stage V3.1 --scenario rejection --seed 20260907
 echo $?
pnpm verify:stage -- --stage V3.1 --scenario recovery --seed 20260907
 echo $?
pnpm verify:stage -- --stage V3.1 --suite code
 echo $?
pnpm test:e2e -- --stage V3.1
 echo $?
```

预期：各场景输出testRunId、实际数据/模型/券商模式、断言expected/actual及证据位置；预期内拒绝场景验证成功退出0，意外副作用/缺脚本/缺必需依赖/未满观察条件非零。恢复场景需外部动作时输出已核实目标和步骤，停留WAITING；完成动作后复验原run，不伪称Web可重启宿主。浏览器测试必须实际运行本阶段用例，零用例/全跳过不能退出0。

再对Web中已运行的同一testRunId执行只读核对，避免仅创建新样本掩盖页面问题：

```bash
# 粘贴Web运行详情中的实际testRunId，再按回车；这是普通ID，不是凭证
read -r acceptance_run_id
pnpm verify:stage -- --stage V3.1 --run "$acceptance_run_id" --check-only
 echo $?
pnpm evidence:export -- --run "$acceptance_run_id"
 echo $?
```

check-only仅查询此运行后端事实并追加检查证据，不创建新订单、不重放成交或发起模型调用；空ID/错误stage/越权run必须拒绝。导出只含脱敏数据，输出实际目录和Manifest Hash，不自动勾选人工验收。端到端正常/异常/恢复运行产生不同ID，导出时分别保存。

历史场景/E2E证据保留原TestRun；当前 code suite 与 P7.2/P7.3最新证据见[执行记录](../../../evidence/audits/2026-09-25-p7-2-service-identity.md)。实际 RD-Agent、模型故障/费用与阶段人工验收仍为 NOT_RUN，不能由固定Runner Smoke替代。Python服务使用自身锁定环境，不串用其他服务虚拟环境。

P7.2/P7.3隔离HTTP+真实Docker Smoke（Mac ARM64 Docker Desktop上执行amd64镜像仿真；不触碰活动研究容器）命令如下。前置条件：专用PostgreSQL `research_automation_test` 可用，冻结镜像ID `sha256:8cd6db4ae88cab7a1fb485613a67fb15a4d4e08460c28deb81510c1fa1861dfb` 已在本机；服务只在临时localhost端口启动，Runner容器使用`--network none`和`--pull never`。不传模型凭证，不执行真实RD-Agent生成。

```bash
pnpm --filter @stockquant/research-automation-service build
pnpm --filter @stockquant/research-automation-service runner:host-http-smoke
```

实测退出0，TestRun `p7-2-http-86fec347-2463-4d42-b865-d44b944a3aab`；脚本启动实际独立`runner:host`进程并限定单个TestRun，SIGKILL后等待租约过期，再由第二个Host以fencing token 2接管并清理上一容器。检查点还包括Hash校验INPUT、PG中租约延长（heartbeat）、真实Docker执行、输出Artifact持久化与SHA-256一致、complete成功、旧租约发布HTTP 422拒绝。脚本清理Job/Artifact行、临时服务、Host进程、容器和目录；数据库复查`0 jobs / 0 refs`，且`docker ps -a --filter name=sqrunner-`为空。当前V3.1 code suite验证研究85/85单测、10/10隔离PG集成、平台40/40单测、Web/平台类型检查；契约检查63 JSON、34 schema、23 Fixture、23条兼容规则。这是固定输入/代码单次故障恢复烟测，不替代生产长时间运行、原生Ubuntu或真实研究实验。

2026-09-27 V3.1/V3.2 Research Automation跨服务契约增量：Platform消费的Research Automation Experiment创建/取消、预算读取/结算、Runner dispatch/read、Artifact publish/read及test-only Fixture模型调用均已有版本化Schema、OpenAPI和生成client；Promotion submit另由独立OpenAPI生成client。Experiment创建写入所属TestRun UUID；Research Automation在持久绑定与预算`RESERVED`不成立时拒绝Runner派发。客户端使用`STOCKQUANT_SERVICE_TOKEN_PLATFORM_API` Bearer；dispatch返回202只表示入队。真实浏览器Fixed Pipeline smoke完整通过：固定Fixture代码由显式隔离Runner Host执行，模型来源FIXTURE、外部模型调用0、预算23 cents结算、输出Hash及6 bars断言正确、异主403、生产模式禁用。完整V3.1 code suite及V3.3 queue/read suite均退出0；最新固定流程TestRun `0912efd2-23f4-4097-bee6-33fca459e2cd`。证据、失败定位及命令见[Runner dispatch契约审计](../../../evidence/audits/2026-09-27-p0-2-v31-runner-dispatch-contract.md)。这不是RD-Agent真实生成/拟合或阶段人工验收；真实RD-Agent、长时间观察、Ubuntu验收仍NOT_RUN。

### 8.5 交叉核对、失败定位与恢复

交叉核对：modelRunId、代码Hash、Runner镜像、Qlib版本、输入DataVersion和实际费用/估计费用与Web实验一致。

先检查Web与CLI的testRunId、输入/策略/代码版本和模式是否一致，再按Trace查平台、领域、适配器与持久化证据。页面错误而CLI正确，记录Web失败；二者都错则保留领域断言失败。缺能力先查健康/迁移/数据与日志，不修改余额或订单状态使断言通过。

独立复跑创建新run；测试幂等/检查点/重启恢复则使用原run和原幂等键。故障发生后保留旧证据，修复后新增运行或检查记录；不得清空账本、随机更换seed直到通过。真实观察窗口、来源验证和实际模型调用与加速/录制测试分别记录。

### 8.6 验收记录与收尾

| 场景/检查 | Web实际结果与截图 | 命令/退出码/报告 | testRunId/业务ID | 结论 |
|---|---|---|---|---|
| normal | 页面按钮与 CLI 断言 PASS | `pnpm verify:stage -- --stage V3.1 --scenario normal --seed 20260907`，退出0 | `290a08d0-93cc-4147-a072-a7e1f8bb8f8b` | PASS（准备范围） |
| rejection（含全部子场景） | LIVE 拒绝断言 PASS | `pnpm verify:stage -- --stage V3.1 --scenario rejection --seed 20260907`，退出0 | `fdb827dc-b426-48f5-981e-8825813caccf` | PASS（准备范围） |
| recovery（含实际外部动作） | 幂等重复与 CANCELLED PASS | `pnpm verify:stage -- --stage V3.1 --scenario recovery --seed 20260907`，退出0 | `057bc825-9bc5-4b5a-8df5-9e2361dea2b0` | PASS（准备范围） |
| Web同run只读核对与证据导出 | 同一 normal Run check-only PASS；未创建新实验 | `pnpm verify:stage -- --stage V3.1 --run 290a08d0-93cc-4147-a072-a7e1f8bb8f8b --check-only`，退出0 | 同上 | PASS（准备范围） |
| fixed-pipeline Web→API→Runner→Artifact及关页恢复 | Chromium重开后同TestRun显示COMPLETED；23 cents/SETTLED；读回指标6 bars/Qlib 0.9.6.99/return 0.12；跨owner 403、生产模式403 | `pnpm --filter @stockquant/platform-api-service v31:fixed-pipeline-web-http-smoke`，退出0 | TestRun `11f42001-3663-4a22-9139-afc3a9f4e59b`；Experiment `c8203e9b-03ae-45b6-9510-f8e3dfea24d3` | PASS（固定Fixture工程链；不是实际模型或阶段验收） |
| 本阶段代码测试/实际观察适用项 | code suite 与 Web E2E PASS；真实模型/Runner NOT_RUN | 上述 code suite、`pnpm test:e2e -- --stage V3.1` | 见准备证据 | NOT_RUN（真实闭环） |
| 用户人工验收 | 待用户确认 | 不由脚本代签 | 确认人/日期待填 | NOT_RUN |

记录不适用子项的范围依据，不能将必需项改为不适用绕过门禁。归档后在[本版验收表](./99-acceptance.md)填写证据链接和结论。清理只针对本轮已结束的隔离运行，默认保留证据；停止测试不能删除数据库卷或取消无关任务。

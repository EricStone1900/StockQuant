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
- [x] V3.1 ArtifactRef生命周期基础：Ref增加可选不可变`expiresAt`与`EXPIRED`终态；Research PostgreSQL旧约束/列幂等迁移、到期前拒绝、过期后终态不可复活；Platform TestRun投影保留EXPIRED，owner/run下载及文件store拒绝读取/重发，Artifact bytes不删除。完整V3.1 code suite、Research 177单测/25隔离PG集成、Platform 142单测/typecheck及contracts:check通过。此项只完成V3.1生命周期状态/访问基础，不含统一存储后端、retention policy/调度、物理清理、活动部署或真实V3.1业务/人工验收。见[W1审计](../../../evidence/audits/2026-10-01-w1-artifact-expiry-lifecycle.md)与[SHA-256](../../../evidence/audits/2026-10-01-w1-artifact-expiry-lifecycle.sha256)。
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

V3.1 Fixture→Runner正常链路及故障矩阵复验（2026-10-03）：固定代码正常执行并校验输出Artifact Hash/指标，23 cents预算结算；退出失败、超时、受限OOM、网络拒绝、取消五种隔离路径均达到预期终态、不发布输出Artifact且费用只结算一次。取消路径验证fencing并拒绝迟到发布。六个随机数据库/临时目录已清理，13个活动容器保持运行，外部调用0。仅为离线工程证据，不代表真实RD-Agent/Provider、业务或人工验收。详见[矩阵审计](../../../evidence/audits/2026-10-03-w5-v31-fixed-pipeline-matrix.md)、[机器结果](../../../evidence/audits/2026-10-03-w5-v31-fixed-pipeline-matrix.json)、[逐项日志](../../../evidence/audits/2026-10-03-w5-v31-fixed-pipeline-matrix.log)。

V3.1 离线代码套件当前源码复验（2026-10-03）：Research Automation 203/203单测、28/28隔离PostgreSQL集成，Platform API typecheck及169/169单测，Web typecheck通过；契约223 JSON/153 schema/39 Fixture零错误，25个生成客户端无漂移，66,100行队列容量工程探针通过。锁定RD-Agent/LiteLLM在Docker internal-only网络对固定Fixture完成Chat/Embedding及预算结算，外部Provider调用0、活动服务未触碰。此为离线工程回归，真实RD-Agent/Provider仍NOT_RUN；阶段状态和人工验收不变。见[本轮审计](../../../evidence/audits/2026-10-03-w5-v31-after-w8-suite.md)、[机器结果](../../../evidence/audits/2026-10-03-w5-v31-after-w8-suite.json)、[完整日志](../../../evidence/audits/2026-10-03-w5-v31-after-w8-suite.log)。

2026-10-03 Experiment业务时钟工程增量：`ExperimentService`现在注入Clock，Experiment创建/取消时间使用注入的业务时间；固定时钟单测精确断言时间戳，bootstrap注入SystemRunnerClock。无真实模型、行情、研究Job或活动服务调用；不代表本阶段研究/扩容工作流已运行，也不改变人工验收状态。见[W5/W7时钟注入审计](../../../evidence/audits/2026-10-03-w7-experiment-clock-injection.md)、[机器结果](../../../evidence/audits/2026-10-03-w7-experiment-clock-injection.json)和当时实现源码SHA清单（历史快照）。

- [x] 契约、数据结构、场景定义和预期结果已冻结（V3.1 preparation manifest v1；真实模型输出仍未运行）。
- [x] 固定Fixture→固定Qlib代码→隔离Runner→输出Artifact/指标→预算结算已由真实V3.1 Chromium页面同TestRun验证；页面关页重开恢复，owner和生产模式边界已核对。记录见[P7.5审计](../../../evidence/audits/2026-09-25-p7-5-fixed-pipeline-smoke.md)。只代表固定Fixture工程切片，不关闭真实研究、其他故障矩阵或人工验收。
- [x] Research Automation Artifact过期状态持久化/拒绝复活与owner-scoped导出门禁经隔离 PostgreSQL、HTTP smoke和V3.1完整code suite复验；证据见[生命周期审计](../../../evidence/audits/2026-10-01-w1-artifact-expiry-lifecycle.md)。仅为生命周期基础能力，不代表到期策略上线、内容删除、真实研究或阶段验收。
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

2026-10-02 Runner Host输出Artifact跨服务客户端补齐：盘点发现Host仍以手写`fetch`发布输出，现已把`POST /v1/artifacts/publish`纳入Runner Host OpenAPI和生成client，保留fencing、8 MiB、SHA-256及30秒上传期限。合同与Research lint/182单测通过；固定镜像完整V3.1 code suite退出0、外部Provider调用0。见[W1客户端审计](../../../evidence/audits/2026-10-02-w1-runner-host-artifact-client.md)及其[SHA-256](../../../evidence/audits/2026-10-02-w1-runner-host-artifact-client.sha256)。此为隔离工程验证；V3.1业务验收、真实模型调用、活动服务发布及人工签字仍未完成。

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

2026-09-30 code regression：`pnpm verify:stage -- --stage V3.1 --suite code` 退出0；Research Automation 150单测/19项隔离PG集成、Platform 87单测/typecheck及Artifact owner-scope smoke通过。该回归未启用Runner/Model Gateway、未调用Provider或结算费用，V3.1真实阶段仍NOT_RUN；详见[准备证据](../../evidence-v3.1-preparation.md)。

2026-09-30后续回归：Model Gateway preflight 改为精确核对已冻结的 Provider、模型、凭证引用、规范端点和两个 host authority 白名单；Research Automation 26个文件/152项测试及完整 V3.1 code suite 通过，Artifact owner-scope smoke=`5af7fcc7-f68d-46b3-bea7-457dc0e6543a`（`activeServicesTouched=false`）。这是应用配置预检，不是网络出口隔离；没有启动真实网关、Runner、Provider调用或费用结算，真实 V3.1 阶段保持 `NOT_RUN`。详见[准备证据](../../evidence-v3.1-preparation.md)。

2026-10-01 V3.1 Artifact离线导出增量：`pnpm evidence:export -- --stage V3.1 --run <existing-testrun-uuid>`按owner session导出TestRun及已发布的INPUT/OUTPUT Artifact附件，验证精确run namespace/ref与内容SHA-256，并生成含全附件的`manifest.sha256`；owner-scoped TestRun GET同时返回从研究专用记录投影的公共`artifactRefs`，Exporter要求两组引用完全匹配；拒绝错误哈希、非owner、未关联ref及覆盖已有目录。实际隔离Platform/Research/PostgreSQL/Artifact Store E2E PASS，另有合成HTTP攻击矩阵PASS；完整V3.1 code suite最近退出0（合同结构测试、Research 169/169单测、21/21 PG集成，Platform 112/112单测，LiteLLM内部Fixture chat/embedding且外部Provider调用0，Web typecheck）。最新隔离端到端记录见审计文件；此前固定输入/输出Hash及Manifest样本不替代该次新合同投影集成证据。此增量只证明固定合成Artifact持久化和导出，不是实际RD-Agent业务实验或人工验收；V3.1阶段验收仍`NOT_RUN`。见[Artifact导出审计](../../../evidence/audits/2026-10-01-w1-v31-artifact-evidence-export.md)及[SHA-256](../../../evidence/audits/2026-10-01-w1-v31-artifact-evidence-export.sha256)。

2026-10-01 V3.1离线回归复验：固定Research镜像`sha256:4cb517d99727cab1f5001f53dcc11aa0cf2d42ad5ce564e685d5dbc28796a730`下`pnpm verify:stage -- --stage V3.1 --suite code`退出0；Research 171单测/23项隔离PG集成、Platform 116单测、LiteLLM内部Fixture Chat与Embedding预算结算、Artifact owner-scope HTTP和Web typecheck通过。外部Provider调用0，活动服务未触及。首次普通沙箱运行的loopback `EPERM`和首次缺少镜像Digest前置均保留为环境记录；复跑使用了loopback与Docker访问。V3.1业务/人工验收仍NOT_RUN，Provider生产适配未接入运行时、账单对账及生产DNS/网络出口强制缺失。详见[W5离线回归审计](../../../evidence/audits/2026-10-01-w5-v31-offline-regression.md)及[SHA-256](../../../evidence/audits/2026-10-01-w5-v31-offline-regression.sha256)。

2026-10-01 Provider调用授权配置门禁：新增`STOCKQUANT_MODEL_PROVIDER_CALLS_AUTHORIZED`布尔环境项，默认`false`，非法值拒绝启动；model-gateway preflight显式报告授权缺项。打开该值仍不能越过Provider运行时接线、实际费用对账及可强制DNS/出口控制门禁。Research Automation 173单测和完整V3.1 code suite退出0；隔离LiteLLM Fixture外呼0，baseline合同/Fixture检查通过。见[W5授权门禁审计](../../../evidence/audits/2026-10-01-w5-provider-authorization-gate.md)及[SHA-256](../../../evidence/audits/2026-10-01-w5-provider-authorization-gate.sha256)。这仅为安全配置与离线Fixture证据，真实Provider调用、业务运行和人工验收仍NOT_RUN。

2026-10-02 RD-Agent LiteLLM Backend Fixture集成：在digest固定的RD-Agent v0.8.0/LiteLLM Linux/amd64容器中实际调用`LiteLLMAPIBackend`的chat/embedding方法，通过internal-only网络抵达Research Automation固定Fixture端点；临时PostgreSQL分别持久化两条ModelRun usage并结算Fixture预算，外部Provider调用0。Research Automation 191项单测、build/lint通过，失败尝试与隔离容器清理均留档。该增量证明固定Backend→Fixture→预算账本的接线测试，不是完整RD-Agent controller/研究实验，不是生产Provider/账单/出口验证；生产路径、完整W5业务、阶段验收和人工验收仍NOT_RUN，preflight继续BLOCKED。详见[W5 Backend集成审计](../../../evidence/audits/2026-10-02-w5-rdagent-litellm-fixture-backend.md)、[机器结果](../../../evidence/audits/2026-10-02-w5-rdagent-litellm-fixture-backend.json)及[SHA-256](../../../evidence/audits/2026-10-02-w5-rdagent-litellm-fixture-backend.sha256)。

2026-10-02 W5隔离完整code suite：V3.1代码门禁在新建一次性PostgreSQL容器退出0，Research 191单测/27隔离PG集成、66,100合成行只读分页探针、LiteLLM Backend内网Fixture chat/embedding结算、Platform 156单测、artifact owner-scope/export smoke及Web typecheck通过。没有活动数据库/服务、数据源、Provider或Paper调用。该代码门禁不等于RD-Agent业务实验；V3.1 acceptance及人工验收仍NOT_RUN，Provider授权保持关闭。详见[W5完整隔离套件审计](../../../evidence/audits/2026-10-02-w5-v31-isolated-code-suite.md)及[SHA-256](../../../evidence/audits/2026-10-02-w5-v31-isolated-code-suite.sha256)。

2026-09-30 Fixture计费链补充：在独立随机端口PostgreSQL上实测`model-gateway:fixture-http-smoke`通过，固定Fixture费用结算23 cents、幂等重放不重复派发、超时与超额回包保留UNKNOWN预算且不盲目重试、超预算拒绝；preflight仍BLOCKED、`externalCalls=0`。该结果补足本地持久层/HTTP Fixture集成证据，但不构成真实Provider或阶段验收。完整历史及失败尝试见[准备证据](../../evidence-v3.1-preparation.md)与[审计](../../../evidence/audits/2026-09-30-v31-model-gateway-fixture-smoke.md)。

2026-10-01 Docker上下文与完整代码回归：根`.dockerignore`排除根/嵌套`.env`、`.env.*`；独立临时Docker上下文以假哨兵验证`.env.local`不进入上下文且构建输出不含哨兵内容。当前Research Automation镜像构建成功；完整V3.1 code suite通过，研究服务169单测、21项隔离PostgreSQL集成、LiteLLM内部Fixture Chat/Embedding计费，Platform 112单测及Artifact owner-scope/Web typecheck通过，外部Provider调用0。完整记录见[W5 Docker上下文及V3.1回归审计](../../../evidence/audits/2026-10-01-w5-docker-context-v31-regression.md)与[SHA-256](../../../evidence/audits/2026-10-01-w5-docker-context-v31-regression.sha256)。本地真实模型/账单、Runner生产接线、Ubuntu与人工验收仍NOT_RUN。

2026-10-01 完整离线回归复验：固定镜像`sha256:4cb517d99727cab1f5001f53dcc11aa0cf2d42ad5ce564e685d5dbc28796a730`运行V3.1 code suite退出0；Research 173单测/23隔离PG集成、Platform 139单测、合同生成、队列只读探针、owner-scoped Artifact smoke及internal-only LiteLLM chat/embedding Fixture smoke通过。provider外呼0，V3.1业务/人工验收NOT_RUN。详见[W5完整离线回归](../../../evidence/audits/2026-10-01-w5-v31-literal-fixture-regression.md)及[SHA-256](../../../evidence/audits/2026-10-01-w5-v31-literal-fixture-regression.sha256)。


2026-10-01 共享Artifact孤儿巡检边界修复：统一内容卷上线后，Research只读孤儿巡检现严格限定V3.1 `{run}/{experiment}/{inputs|outputs}`旧布局及SHA-256分层文件；Platform/Qlib `qlib-fixture`与未知命名空间不列入隔离候选。隔离前再次核验owner namespace、Artifact ID、Hash层及文件状态。定向回归5/5、Research Automation完整单测32文件/180项和构建通过；详见[共享Artifact孤儿范围审计](../../../evidence/audits/2026-10-01-w1-artifact-reconcile-shared-volume-scope.md)。原SHA清单保留为历史版本；当前reconcile代码/测试Hash见[2026-10-03固定时间Manifest](../../../evidence/audits/2026-10-03-w5-artifact-reconcile-clock.sha256)。没有对活动卷运行巡检或隔离；共享生命周期批准、物理清理与活动部署仍未完成。

2026-10-03 Artifact隔离操作时间固定：check-only孤儿年龄判断与后续隔离清单共用命令开始时固定的时间戳；聚焦测试6/6，完整V3.1代码套件退出0（Research 202单测/27隔离PG集成、Platform 166单测，精确当前`linux/arm64`镜像digest；外部Provider调用0）。[本轮完整套件审计与日志](../../../evidence/audits/2026-10-03-w5-v31-artifact-clock-code-suite.md)，[机器报告](../../../evidence/audits/2026-10-03-w5-v31-artifact-clock-code-suite.json)，当前代码/测试Hash见[Manifest](../../../evidence/audits/2026-10-03-w5-artifact-reconcile-clock.sha256)。历史范围审计及原SHA保留，不作为当前代码哈希。未运行活动Artifact巡检/隔离；V3.1业务链、Artifact保留清理批准、Provider、Ubuntu、观察及人工验收仍待完成。

2026-10-02 SiliconFlow Embedding有界响应读取：Provider对无Content-Length响应改为流式累计，超过16 MiB立即取消响应流；Fixture验证在完整响应结束前停止读取并拒绝。成本/响应/provider聚焦测试3文件8项、Research Automation lint/build通过。官方Qwen3-Embedding-4B页面复核输入价为$0.02/百万tokens；没有调用推理端点或使用凭据。一次广泛单测仍因restricted-egress loopback `EPERM`有3项环境失败，已保留。此修复不构成Provider授权、生产出口/账单、RD-Agent业务或V3.1验收。见[有界响应审计](../../../evidence/audits/2026-10-02-w5-siliconflow-embedding-bounded-response.md)。
源码、测试及审计文件Hash清单`evidence/audits/2026-10-02-w5-siliconflow-embedding-bounded-response.sha256`已作为该次实现的点时快照保留。该清单同时绑定当时的总计划文件，计划后续更新不改写历史清单；当前V3 evidence门禁由当前版本文档中其余有效清单校验。

2026-10-02 本轮完整V3.1 code suite精确Digest复跑：在隔离网络/PostgreSQL与当前工作树镜像`sha256:523103f19fa5e492aea8559625e284129a9ee7387ed0423661b30983fc6b1260`上退出0，Research Automation 195单测/27 PG集成、Platform 162单测、内部LiteLLM Fixture双方法结算、66,100行只读容量探针、Artifact owner-scope与Web typecheck通过；Provider外呼0、活动服务未触碰。见[有界响应与整套回归审计](../../../evidence/audits/2026-10-02-w5-siliconflow-embedding-bounded-response.md)；其源码/回归Hash清单作为历史点时证据保留，不再由当前V3清单门禁复验。

2026-10-02 DeepSeek响应体内存上限：Chat Provider在无`Content-Length`时采用8 MiB有界流读取，超过上限立刻取消；非2xx响应也取消body且不读取/记录供应商错误内容。Fixture覆盖越限发生在流结束前，保留模型/usage/追踪ID/redirect/redaction现有断言。Research Automation 35文件196单测、lint、build通过；loopback代理测试经受控权限运行，无凭据读取、外部Provider调用或活动服务接触。此仅关闭Provider组件响应缓冲边界，生产egress、Provider运行时接线、真实账单、RD-Agent业务和人工验收仍未完成。见[W5 DeepSeek响应边界审计](../../../evidence/audits/2026-10-02-w5-deepseek-bounded-response.md)。

2026-10-02 DeepSeek响应限制与V3.1整套回归：修复Fixture HTTP smoke可能先启动服务、后创建随机数据库的竞态；新建DB后才启动服务。Research Automation当前工作树镜像`sha256:7e2fc670427c76abe5444cf16723cfa803cde03b0ebe05ec79795b9c681bdbaa`精确锁定后，完整`pnpm verify:stage -- --stage V3.1 --suite code`退出0；涵盖Research Automation 196单测、隔离PG、Fixture LiteLLM/RD-Agent调用、Platform、Artifact owner-scope与Web typecheck。外部Provider/行情/Paper/Broker调用0，活动服务未触碰，容器/网络清理；专用临时镜像按记录Digest移除。过程中首次揭示DB竞态及第二次未提供镜像Digest的失败均保留，最终以当前镜像Digest重跑通过。真实Provider/账单/egress、RD-Agent业务实验、Ubuntu及人工签署仍未完成。详情见[W5/V3.1完整代码套件审计](../../../evidence/audits/2026-10-02-w5-deepseek-v31-code-suite.md)及其SHA-256清单。

2026-10-03 W6共享契约更新后的V3.1兼容性回归：先因缺少当前Research Automation镜像Digest按门禁退出2，随后基于当前源码构建精确`linux/arm64`镜像`sha256:55f2b9a69d80954fc5f753f3d8ddaa2788af385369bcc47bea0e2d62121a365e`并重跑完整V3.1 code suite，exit 0。Research 203/203单测、28/28隔离PG，Platform 166/166；合同、Fixture Model Gateway、内部LiteLLM Chat/Embedding预算路径和Artifact owner-scope/evidence export通过，外部Provider调用0、活动服务未触碰。V3.1真实RD-Agent调用、真实Provider账单、阶段业务/人工验收及Ubuntu仍未完成。详情见[W5/V3.1回归审计](../../../evidence/audits/2026-10-03-w5-v31-after-w6-contract-suite.md)、[JSON](../../../evidence/audits/2026-10-03-w5-v31-after-w6-contract-suite.json)、[日志](../../../evidence/audits/2026-10-03-w5-v31-after-w6-contract-suite.log)、当时实现源码SHA清单（历史快照）及[审计SHA](../../../evidence/audits/2026-10-03-w5-v31-after-w6-contract-suite.sha256)。

2026-10-03 shared Artifact leaf-path hardening后当前V3.1 code suite复核：使用重建的linux/arm64 Research Automation镜像`sha256:5a6177721fb5623ac75dbfa5da317c509f3a47d9e1802a84d0198c06adaa51f2`，`pnpm verify:stage -- --stage V3.1 --suite code`退出0。Research Automation 203 unit/28 PostgreSQL integration、Platform 166 unit、Artifact owner-scope/export及内部LiteLLM Fixture Chat/Embedding通过，external Provider calls=0、activeServicesTouched=false，临时容器/网络清理。TestRun `7917fa80-4f30-43d3-b7b3-4a2613118439`属于Fixture工程回归；V3.1真实RD-Agent业务、Provider账单/egress、Ubuntu及用户人工验收仍未通过/运行。详见[W5审计](../../../evidence/audits/2026-10-03-w5-v31-after-artifact-leaf-hardening.md)、[机器结果](../../../evidence/audits/2026-10-03-w5-v31-after-artifact-leaf-hardening.json)、[完整日志](../../../evidence/audits/2026-10-03-w5-v31-after-artifact-leaf-hardening.log)和[SHA-256 Manifest](../../../evidence/audits/2026-10-03-w5-v31-after-artifact-leaf-hardening.sha256)。

2026-10-03 W5当前源码回归：V3.1完整code suite先因必需的Research镜像digest未显式固定而按设计返回2；随后从当前源码构建精确`linux/arm64`镜像`sha256:5a6177721fb5623ac75dbfa5da317c509f3a47d9e1802a84d0198c06adaa51f2`并重跑通过。内部LiteLLM Fixture Chat/Embedding预算SETTLED共46 cents，外部Provider调用0；隔离Artifact owner-scope TestRun `e8484d56-a15b-4ded-8da2-78c542cc78ec`精确字节验证PASS，活动服务未触碰；临时镜像标签已清理。此为固定Fixture工程门禁，真实RD-Agent任务/Provider、Ubuntu、业务人工验收未完成，V3.1仍NOT_RUN。详见[W5审计](../../../evidence/audits/2026-10-03-w5-v31-current-worktree-rerun.md)、[机器结果](../../../evidence/audits/2026-10-03-w5-v31-current-worktree-rerun.json)及[SHA-256](../../../evidence/audits/2026-10-03-w5-v31-current-worktree-rerun.sha256)。

2026-10-03 W5凭证只读预检：`node scripts/v31-model-credential-preflight.mjs`退出0；忽略的`.env.local`为私有权限且DeepSeek/SiliconFlow两个冻结凭证引用均存在、无重复。Provider调用授权仍为false，`liveCallsAuthorized=false`、`modelCalls=NOT_RUN`，没有读取/输出凭证值或网络请求。此结果只满足凭证引用存在性门槛，不授权真实模型调用、不证明外发边界/运行时/账单对账或V3.1验收。详见[W5预检审计](../../../evidence/audits/2026-10-03-w5-provider-credential-preflight.md)与[SHA-256](../../../evidence/audits/2026-10-03-w5-provider-credential-preflight.sha256)。

2026-10-05 W5官方账单端点边界复核：DeepSeek `GET /user/balance`公开合同只返回当前余额；SiliconFlow当前公开文档为请求响应usage/trace，官方公告说明旧`/user/info`停用、替代账户API待提供。余额快照和响应usage均不能确认不确定请求的实际扣款，真实Provider实验继续BLOCKED，UNKNOWN费用保持全额预留。只审阅官方公开文档，没有账户或模型调用。详见[接口边界审计](../../../evidence/audits/2026-10-05-w5-provider-billing-api-review.md)、[JSON](../../../evidence/audits/2026-10-05-w5-provider-billing-api-review.json)及[SHA-256](../../../evidence/audits/2026-10-05-w5-provider-billing-api-review.sha256)。

2026-10-06 当前工作树 V3.1 code regression：从当前源码构建并精确固定临时 Research Automation `linux/arm64` 镜像，`pnpm verify:stage -- --stage V3.1 --suite code` exit 0。Research 218单测/32项PG集成、Platform 198单测，Artifact owner-scope/evidence export与RD-Agent `LiteLLMAPIBackend`经internal-only Fixture完成chat/embedding、预算两行结算46 cents；外部Provider调用0，活动服务未触碰，临时容器/网络及唯一镜像标签清理。V3.1阶段仍NOT_RUN：本回归不是外部Provider/真实RD-Agent研究业务、账单对账、Ubuntu或人工验收。失败和镜像身份核验细节见[W5审计](../../../evidence/audits/2026-10-06-w5-v31-current-code-suite.md)、[完整日志](../../../evidence/audits/2026-10-06-w5-v31-current-code-suite.log)、[输入源码SHA-256（历史执行快照，绑定本次运行输入）](../../../evidence/audits/2026-10-06-w5-v31-current-code-suite.sources.sha256)及[证据SHA-256](../../../evidence/audits/2026-10-06-w5-v31-current-code-suite.sha256)。

# V1.2 小样本数据、真实 Qlib 与环境探针

状态：PARTIALLY_IMPLEMENTED（2026-09-09历史范围自动/人工签署保留；2026-10-06当前Fixture代码与Web/API/CLI验收手册已实测可执行；新增范围人工验收和W8 Ubuntu实机复核未完成）。版本入口：[README](./README.md)。

历史状态：PASS（2026-09-09既有范围自动验证与用户人工验收，签署记录见下方历史表；不扩展到2026-10-06新增范围）。当前Qlib使用固定`linux/amd64` worker仿真，RD-Agent为无模型调用的兼容探针。共同约束：[三版共同规则](../05-three-version-delivery.md)。

## 1. 前置与范围

V1.1通过；Clock、Artifact、账户和验收中心入口已存在。

本阶段所有订单、券商资产和成交均来自隔离模拟环境。真实业务数据库、Qlib或RD-Agent在声明“已验证”时必须真正执行；替身需独立标注。

## 2. 开发任务

- [x] 实现日线导入预览、原始行情、证券映射、数据版本及质量报告；坏数据不能标可用。复权分离与正式 Artifact 存储列为后续缺口。
- [x] 将固定版本 `pyqlib==0.9.6` 封装到独立 Qlib worker/quant adapter；完成 CPU 导入烟测和基础因子预览；模型训练与 NO_TRADE/TopK 完整策略留后续。
- [x] Artifact 异步任务将持久化状态、执行、取消与不可变产物发布关联；PostgreSQL事务原子提交Artifact字节与`COMPLETED`状态，取消/发布行锁竞态最多产生一个合法终态，租约接管通过fencing拒绝旧worker写入。边界为固定Fixture版本、单实例轮询工作器和数据库内BYTEA存储；大型产物/外部对象存储、Web任务界面及生产容量不在此切片内，阶段人工验收仍待执行。
- [x] 提供 CN 正常与未来数据样本，验证按 asOf 拒绝未来数据；US/缺失/退市样本列为后续缺口。
- [x] 提供隔离容器内固定代码 RD-Agent 兼容探针；无模型凭证时明确 `modelCalls=NOT_RUN`，不伪称真实实验完成。

## 3. 同步 Web 开发

正式页：数据导入、质量报告、证券/日线浏览、策略参数和因子排名。验收页：好/坏数据切换、真实Qlib任务证据、RD-Agent兼容矩阵与缺口。

验收中心路径：`/acceptance/v1/v1.2`。场景参数提交到后端TestRun编排接口，后端调用业务API并汇集证据。浏览器不直接写领域数据，不自行判定成交。当前页面提供normal、rejection与recovery-probe（仅Qlib探针）；Artifact任务取消/重启由独立隔离HTTP/PG smoke验证，Web没有任务进度面板。

## 4. 人工验收步骤

1. 导入正常样本，预览后发布，查看数据版本、覆盖、原始Hash和行情。
2. 选择固定因子计算并抽查手算值；相同版本重复运行，规范化结果一致。
3. 切换NO_TRADE和TopK，检查HOLD为空交易腿，候选展示原因及输入时间。
4. 运行未来可见拒绝样本并查看质量标记；运行Artifact任务隔离HTTP重启smoke，核对取消后无产物、排队任务重启后完成。

每次保存testRunId、场景版本、代码/镜像、数据/规则版本、种子及注入事件序列、实际/预期、截图/Trace。判定依据必须是后端事实和独立检查，不能只看Toast成功提示。

## 5. 异常与替身边界

Qlib编译或运行失败不得切换到假排名并报成功；RD-Agent探针和真实LLM实验分开标记。

## 6. 产物与验证

目标产物：market-data-service、quant-research-service 纵向切片、Qlib镜像/锁、数据与策略Web、fixtures/market-data、兼容矩阵。

自动验证：真实Qlib CPU烟测、PIT与手算因子测试、Artifact原子发布/取消集成、数据与策略浏览器E2E。

需求/测试追踪：DAT-01～06/11、QNT-01/02/04/07/10、STR-01/03/04；T04～10、T40～44；DV-02/07、VT02/07。

退出条件：开发任务完成、Web真实可操作、全部适用检查PASS、人工签署、已知限制写入证据。填写[本版验收表](./99-acceptance.md)，未完成项不得勾选通过。

## 7. 阶段交付待办（完成后勾选）

以下勾选只记录本阶段交付进度，不能代替第2节逐项开发任务或版本验收结论。开发者凭实现/实测证据勾选开发项；“人工验收”仅在用户实际确认后勾选，不预填PASS。

- [x] 契约、数据结构、场景定义和预期结果已冻结。
- [x] 第2节后端任务完成；Artifact task执行器、持久任务状态、原子Artifact字节发布、幂等取消、租约恢复/fencing均有隔离PostgreSQL/HTTP验证。
- [x] 正式Web功能页及验收中心正常/异常场景完成。
- [x] 当前隔离Fixture路径、动态实际Web URL、启动/停止命令、按钮、配置边界、超时、预期输出与失败恢复步骤已补齐，并按第8节实际启动页面、运行三场景浏览器/CLI同Run检查及精确清理。
- [x] 开发者已执行数据 normal/rejection、容器健康、Qlib 0.9.6 CPU 烟测及基础代码检查。
- [x] Artifact任务重复取消、取消/发布并发、进程重启后排队执行、运行worker租约接管和旧worker拒绝已由隔离测试验证。Qlib recovery-probe仍仅验证READY，不扩展为真实模型故障恢复；本阶段当前范围人工验收仍未签署。
- [ ] 当前新增范围用户验收未完成；2026-09-09历史签署保留在下方验收记录，不扩展为本轮签收。
- [x] 可执行操作说明与限制已更新并实测；第8.6分开记录历史签署与当前自动证据，本版当前人工验收和Ubuntu门禁仍未签署/运行。

## 8. 阶段验收操作手册

### 8.1 当前可执行性与验收准备

手册状态：VERIFIED_EXECUTABLE（2026-10-06，隔离FIXTURE/SIMULATION_ONLY手册范围）。已执行`pnpm v12:acceptance`启动独立随机Compose/临时PostgreSQL/Vite，实际地址示例为`http://127.0.0.1:58205/acceptance/v1/v1.2`；该栈已停止，下一次启动会打印新随机URL。Playwright三场景及CLI同Run、Artifact任务HTTP/PG重启smoke、Qlib真实组件CPU烟测均有当前工作树证据。此状态只表示操作步骤可复现，不表示用户签署、真实市场数据、Ubuntu或整版通过。

前置服务：Docker Desktop可用；脚本自行启动隔离Platform、Market Data、Quant、PostgreSQL、Qlib worker及Vite，不依赖V1.1活动栈。

固定输入：冻结的10～20只CN与3～5只US日线Fixture，记录确切起止日期/DataVersion及因子预热；seed=20260907。

| 开发交付时必须填写 | 当前值 |
|---|---|
| 实测代码Commit或工作区Hash/验证日期 | 当前未提交工作树；2026-10-06；完整输入Hash见本节最新审计Manifest |
| 项目根目录、Node/pnpm/Python/uv及Docker版本 | `/Users/huangbosong/Documents/ChatGPT/StockQuant`；Node 24.1.0、pnpm 10.34.5；Docker Linux/ARM64仿真环境 |
| Web基础URL/身份登录或会话建立方式 | 执行`pnpm v12:acceptance`后从`READY_FOR_MANUAL_ACCEPTANCE.webUrl`读取实际随机URL；示例`http://127.0.0.1:58205/acceptance/v1/v1.2`。仅绑定本机，Platform使用隔离开发身份`acceptance-owner-1` |
| 本阶段Web路由 | `/acceptance/v1/v1.2` |
| 正式页面的真实入口/跳转链接 | `/acceptance/v1/v1.2`；按钮：“预览正常 Fixture”“预览未来数据拒绝样本”“运行 Qlib CPU 探针”“预览基础因子排名”“运行 RD-Agent 兼容探针”；场景选择器“V1.2 验收场景”，按钮“运行 V1.2 场景” |
| Fixture文件/数据版本/确切日期/Hash、规则与成本版本 | `fixtures/v1/v1.2/cn_daily.csv` SHA-256 `2d799e0fc18dbb8d312c394ad61afbe009570bc4a5e9cec0b43231d669a66f78`；`cn_daily_bad_future.csv` SHA-256 `d59c69bca23366c562902c028e6aab87ba2782cef6c274ffd41d784b4df824aa`；版本`v1.2-market-data-1`；asOf `2024-12-31` |
| 配置文件及必需环境变量名/非秘密测试值 | `infra/compose/docker-compose.v12-integration.yml`；命令动态生成随机Project、宿主端口、服务Bearer和DB密码；来源授权变量均false、`STOCKQUANT_LIVE_TRADING_ENABLED=false`、`STOCKQUANT_BROKER_MODE=FAKE`，不读取或打印`.env.local` |
| 外部故障目标及可执行命令、恢复/隔离清理入口 | Artifact task只处理固定Fixture `v1.2-market-data-1`；恢复由PostgreSQL租约过期接管，fencing拒绝旧worker；原子发布在`market_data_task_artifacts`与任务状态同一事务中。`pnpm test:integration:market-data`须在受控隔离PG环境执行；HTTP进程重启用`node scripts/run-isolated-postgres-command.mjs --url-env MARKET_DATA_DATABASE_URL:market_data_test:market_data_test -- pnpm --filter @stockquant/market-data-service artifact-task:http-restart-smoke`；脚本会创建随机临时容器/网络并验证清理。取消：POST `/v1/artifacts/tasks/<taskId>/cancel`；查询：GET `/v1/artifacts/tasks/<taskId>`；产物：GET `/v1/artifacts/tasks/<taskId>/artifact`。 |
| 预期耗时、轮询超时、实际观察期/预算 | 数据预览 <1 秒；Qlib 探针 <2 秒；真实模型调用预算为 0，状态 NOT_RUN |

### 8.2 隔离初始化与启动

在上表项目根目录运行。该入口生成独立随机项目和临时测试凭证，LIVE交易、行情采集及所有来源授权均关闭；不要改用会连接默认活动服务的`.env.local`栈。

```bash
# 在终端A确认执行目录为项目根目录
pwd
pnpm install --frozen-lockfile
pnpm v12:acceptance
```

等待JSON状态`READY_FOR_MANUAL_ACCEPTANCE`；从`webUrl`字段打开本机页面。启动最多等待90秒API、30秒Web；Docker构建首次可能较慢。启动失败时脚本打印当前隔离栈最近日志并清理本项目。验收后在同一终端按Ctrl-C；脚本执行Compose down并核验容器、卷、网络及项目镜像均为0。当前实测本机访问返回HTTP 200。该命令只建立可交互Fixture环境，不证明Ubuntu部署。

初始化在验收中心“准备隔离运行”完成；CLI场景入口也负责同样的准备，两者调用同一业务API。准备后记录testRunId、accountId、namespace及Fixture/DataVersion；初始化业务本身是测试对象时不得预先完成被测动作。缺源/凭证/历史数据时显示缺项，不静默换成Fake并报真实场景通过。

### 8.3 Web逐步操作及预期结果

1. 打开终端启动日志中的`webUrl`，进入“开发验收中心→V1→V1.2”；页头应显示`FIXTURE / SIMULATION_ONLY`。当前本机隔离身份由Harness建立，无用户券商或行情账号。
2. 每个场景通过选择器“V1.2 验收场景”选择normal、rejection或recovery，再点击“运行 V1.2 场景”；记下页面显示的testRunId、状态、断言expected/actual和证据。三个场景各自创建独立TestRun。
3. 按下表执行；从页面证据明细核对结果，不能只看“任务完成”。

| 场景ID（阶段内唯一） | 场景 | 点击顺序/输入 | 预期结果与核对点 |
|---|---|---|---|
| normal | 固定日线与Qlib探针 | 点击“预览正常 Fixture”“运行 Qlib CPU 探针”“预览基础因子排名”；选择normal后运行。 | Fixture版本为`v1.2-market-data-1`；Qlib状态READY；TestRun `V1.2-DATA-NORMAL-001`通过；此场景是固定合成/Fixture输入，不代表真实市场模型有效性。 |
| rejection | PIT未来数据拒绝 | 点击“预览未来数据拒绝样本”；检查质量输出；选择rejection并运行。 | 输出`FUTURE_DATA`；TestRun `V1.2-DATA-PIT-001`通过且不发布未来数据。 |
| recovery-probe | Qlib/RD-Agent探针 | 点击“运行 RD-Agent 兼容探针”；选择recovery并运行。 | Qlib `READY`、探针`fixed-probe-ok`、TestRun `V1.2-QLIB-PROBE-001`通过；这是探针可用性检查，不注入真实故障，不代表故障恢复或真实LLM调用。 |

4. 在运行完成后刷新页面并重新打开该路由；从后端状态核对Run与断言仍可读取。Artifact任务取消/重启通过下文隔离HTTP smoke验证，当前Web页面没有独立任务进度面板。
5. 每项记录实际结果、截图与业务ID。异常场景“预期拒绝”被正确验证时断言可PASS，但被测业务操作仍显示拒绝；若意外接受则断言FAIL。

### 8.4 命令行复验与相同运行核对

在项目根目录执行以下目标命令。stage/scenario必须匹配8.3定义；CLI与Web共用场景版本、Fixture和断言。每条命令执行后立即查看退出码，任何非零先保存错误再定位，不能继续假定本阶段通过。

```bash
pnpm verify:stage -- --stage V1.2 --scenario normal --seed 20260907
# 紧接上一命令执行；0表示全部场景断言通过
 echo $?
pnpm verify:stage -- --stage V1.2 --scenario rejection --seed 20260907
 echo $?
pnpm verify:stage -- --stage V1.2 --scenario recovery --seed 20260907
 echo $?
pnpm verify:stage -- --stage V1.2 --suite code
 echo $?
pnpm test:e2e -- --stage V1.2
 echo $?
```

预期：各场景输出testRunId、实际数据/模型/券商模式、断言expected/actual及证据位置；预期内拒绝场景验证成功退出0，意外副作用/缺脚本/缺必需依赖/未满观察条件非零。恢复场景需外部动作时输出已核实目标和步骤，停留WAITING；完成动作后复验原run，不伪称Web可重启宿主。浏览器测试必须实际运行本阶段用例，零用例/全跳过不能退出0。

再对Web中已运行的同一testRunId执行只读核对，避免仅创建新样本掩盖页面问题：

```bash
# 在另一个项目根目录终端粘贴Web运行详情中的实际testRunId；它不是凭证
read -r acceptance_run_id
read -r platform_api_url  # 粘贴同次Harness READY JSON的platformApiUrl
pnpm verify:stage -- --stage V1.2 --run "$acceptance_run_id" --check-only
 echo $?
export STOCKQUANT_PLATFORM_API_URL="$platform_api_url"  # 使用启动JSON的platformApiUrl
export STOCKQUANT_EVIDENCE_SESSION_COOKIE='sq_session=acceptance-owner-1' # 仅用于隔离本地Harness
pnpm evidence:export -- --stage V1.2 --run "$acceptance_run_id"
 echo $?
```

check-only仅查询此运行后端事实并追加检查证据，不创建新订单、不重放成交或发起模型调用；空ID/错误stage/越权run必须拒绝。导出只含脱敏数据，输出实际目录和Manifest Hash，不自动勾选人工验收。端到端正常/异常/恢复运行产生不同ID，导出时分别保存。

本阶段代码测试覆盖要求：真实Qlib CPU烟测、PIT与手算因子测试、Artifact原子发布/取消集成、数据与策略浏览器E2E。 在交付时把映射到的实际Domain/DB/契约/服务内测试命令补入本节，注明执行目录、测试文件或套件、退出码和报告；verify:stage必须展示实际调用的测试清单，不能空壳返回0。Python服务使用自身锁定环境，不串用其他服务虚拟环境。

### 8.7 早期代码套件复验（2026-10-06，历史边界）

`pnpm verify:stage -- --stage V1.2 --suite code`在受控本机执行退出0；完整输出见[套件日志](../../../evidence/audits/2026-10-06-w1-v12-code-suite-with-qlib-controlled.log)。套件实际执行baseline、build、lint、typecheck、全仓unit、隔离PostgreSQL integration、服务身份HTTP smoke、合同、Python adapter、运维检查及本地Qlib组件烟测。Qlib smoke使用锁定Worker镜像，在Apple Silicon上仿真`linux/amd64`；Qlib 0.9.6/LightGBM 4.7.0真实运行`qlib.contrib.model.gbdt.LGBModel.fit/predict`，训练72行、验证24行、测试24行；预测24项，重复训练模型与预测SHA一致，非法时间切分返回422。机器结果、镜像及限制见[W1审计](../../../evidence/audits/2026-10-06-w1-v12-qlib-code-suite.md)与[SHA-256清单（历史执行快照，绑定该次完整代码套件输入）](../../../evidence/audits/2026-10-06-w1-v12-qlib-code-suite.sha256)。

普通沙箱运行在Qlib Worker测试的loopback绑定处因`EPERM`退出1，保留[失败日志](../../../evidence/audits/2026-10-06-w1-v12-code-suite-with-qlib.log)；同一完整套件在受控本机上下文重跑退出0。本节记录先于隔离Web/API/CLI Harness实现的状态；Web同Run和手册后续结果见8.8、8.9、8.11与8.12。上述代码套件通过不代表人工验收或Ubuntu版本门禁。

### 8.5 交叉核对、失败定位与恢复

交叉核对：数据版本、因子参数/公式、预期手算值及真实Qlib日志与Web排名对应；跨运行比较排除运行ID和日志时间。

先检查Web与CLI的testRunId、输入/策略/代码版本和模式是否一致，再按Trace查平台、领域、适配器与持久化证据。页面错误而CLI正确，记录Web失败；二者都错则保留领域断言失败。缺能力先查健康/迁移/数据与日志，不修改余额或订单状态使断言通过。

独立复跑创建新run；测试幂等/检查点/重启恢复则使用原run和原幂等键。故障发生后保留旧证据，修复后新增运行或检查记录；不得清空账本、随机更换seed直到通过。真实观察窗口、来源验证和实际模型调用与加速/录制测试分别记录。

### 8.6 历史验收记录与当前自动证据

下表仅保留2026-09-09既有范围的签署与运行事实，不适用于2026-10-06新增Artifact状态机、fencing和原子产物发布范围。

| 场景/检查 | Web实际结果与截图 | 命令/退出码/报告 | testRunId/业务ID | 结论 |
|---|---|---|---|---|
| normal | 数据服务正常 Fixture 预览通过；Web 页面已构建 | `pnpm verify:stage -- --stage V1.2 --scenario normal --seed 20260907`，退出0 | dataVersion `v1.2-market-data-1`；6 bars/2 securities | PASS（自动+人工确认） |
| rejection（未来数据） | 未来日期被质量报告拒绝 | `pnpm verify:stage -- --stage V1.2 --scenario rejection --seed 20260907`，退出0 | `FUTURE_DATA` / asOf `2024-12-31` | PASS（自动+人工确认） |
| recovery / Qlib 探针 | Qlib 0.9.6 CPU import smoke 与 RD-Agent 固定代码探针通过，模型调用保持 NOT_RUN | `curl http://127.0.0.1:3003/v1/qlib/probe`、`curl http://127.0.0.1:3003/v1/rdagent/probe` | `QLIB_SOURCE_COMMIT=qlib-0.9.6`；`linux/amd64` 仿真 | PASS（仿真探针） |
| Artifact 发布/取消 | 发布 Hash 与取消状态均可核对；取消不发布半成品 | POST `/v1/artifacts/normal/publish`、POST `/v1/artifacts/tasks/<taskId>/cancel` | task `artifact-task-1788953766848` | PASS（自动+人工确认） |
| Web同run平台 TestRun | 平台创建/查询 normal run，2 个断言 PASS | POST `/api/v1/acceptance/v1/v1.2/runs`、GET 同 run | `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4` | PASS（自动+人工确认） |
| 本阶段代码测试/实际观察适用项 | 类型、构建、单元、Fixture Hash、Qlib、Artifact、平台 API、Web E2E 通过；无真实市场观察 | `pnpm typecheck`、`pnpm build`、`pnpm test`、`pnpm baseline:check`、`pnpm test:e2e -- --stage V1.2`，均退出0 | Mac ARM64；Qlib worker 为 linux/amd64 仿真 | PASS（开发者自动验证） |
| 用户人工验收 | Web 数据、Qlib、RD-Agent 探针、平台 TestRun、Artifact 取消和 CLI 已确认 | 不由脚本代签 | 用户确认（本会话） / 2026-09-09 | PASS |

记录不适用子项的范围依据，不能将必需项改为不适用绕过门禁。归档后在[本版验收表](./99-acceptance.md)填写证据链接和结论。清理只针对本轮已结束的隔离运行，默认保留证据；停止测试不能删除数据库卷或取消无关任务。

| 当前范围检查 | 实际结果与证据 | 当前结论 |
|---|---|---|
| 三场景Web/API/CLI同Run | 自动化浏览器TestRun `967eab4b-6704-4599-9ecb-99032ffc58ff`、`7ac561df-3d83-4a0b-bcf0-21c06a93da22`、`4165ed6a-8fee-42e2-91c4-77cdec657c98`；Playwright后对相同UUID执行CLI `--check-only`；随机隔离DB已清理 | 自动PASS；未做人工签署 |
| Artifact取消/发布/恢复 | Postgres 28/28；Market Data unit 74/74；HTTP重启smoke取消无Artifact、队列在重启后执行并产出Fixture精确字节 | 自动PASS；固定Fixture范围 |
| 完整代码套件 | `pnpm verify:stage -- --stage V1.2 --suite code`，受控隔离环境退出0；baseline/合同/unit/PG/Qlib/Web/API/CLI均执行 | 自动PASS；不等同阶段PASS |
| V1.2结构化TestRun证据 | TestRun `890f3fab-e689-471b-8c45-97abd531d3d5`为COMPLETED，normal场景3/3断言PASS；CLI同Run `--check-only`退出0；隔离Harness API地址当时为`http://127.0.0.1:49408`；证据包及Manifest已存至`evidence/local/V1.2/890f3fab-e689-471b-8c45-97abd531d3d5/` | 自动PASS；`manualConclusion=NOT_RUN` |
| 人工浏览器确认 | 由`pnpm v12:acceptance`启动的随机栈可交互，页面HTTP 200；未收到本轮用户对新增范围的人工验收确认 | NOT_RUN |
| Ubuntu x86_64 | 本机仅macOS/AArch64 + Docker Linux/AArch64仿真 | BLOCKED / NOT_RUN |

当前运行证据、隔离边界和限制见[Artifact task原子发布审计](../../../evidence/audits/2026-10-06-w1-v12-artifact-task-atomic-publication.md)、[本手册与TestRun证据对齐审计](../../../evidence/audits/2026-10-06-w1-v12-acceptance-runbook.md)及[历史执行快照 SHA-256 清单](../../../evidence/audits/2026-10-06-w1-v12-acceptance-runbook.sha256)。

### 8.8 Web TestRun 与同Run CLI复核接线（2026-10-06）

V1.2页已接入持久化运行入口：选择场景后创建Platform TestRun、轮询并展示断言/证据；现有Playwright V1.2用例随后对同一UUID执行`verify:stage --stage V1.2 --run <id> --check-only`。`pnpm --filter @stockquant/web typecheck`和production build通过，详见[接线审计](../../../evidence/audits/2026-10-06-w1-v12-web-same-run-implementation.md)、[构建日志](../../../evidence/audits/2026-10-06-w1-v12-web-same-run-build.log)及[历史执行快照 SHA-256](../../../evidence/audits/2026-10-06-w1-v12-web-same-run-implementation.sha256)。

已新增专属隔离Compose Harness：每轮随机项目/端口/数据库密码/服务Bearer，包含Platform、Market Data、Quant、Qlib Worker、PostgreSQL与Vite/Chromium；采集与LIVE关闭。2026-10-06 Chromium真实请求分别通过隔离Platform TestRun API创建normal、rejection、recovery-probe三个TestRun：`7e7b0687-c73a-4717-8190-cdc8724c39a8`、`0ae8f719-0f2b-4941-9b6a-9a287c7373b6`、`cc5a3650-ab50-4dd6-bf37-2e2e358a911e`；三者均由CLI对同一Run执行`--check-only`通过，全部临时容器、卷、网络和镜像清理核验通过。机器结果与Manifest见[Web/API/CLI隔离E2E JSON](../../../evidence/audits/2026-10-06-w1-v12-isolated-web-e2e.json)、[历史执行快照SHA-256](../../../evidence/audits/2026-10-06-w1-v12-isolated-web-e2e.sha256)与[完整浏览器/清理日志](../../../evidence/audits/2026-10-06-w1-v12-isolated-web-e2e.log)。此为一次当前隔离回归，不替代全部版本要求或人工作为签署。选项`recovery`仅核验Qlib探针可用性，没有注入故障或证明恢复，因此页面已明确标出该限制。V1.2三场景完整当前代码套件已在2026-10-06受控复跑通过（退出0，含Qlib smoke及三场景E2E）；日志见[完整代码套件](../../../evidence/audits/2026-10-06-w1-v12-full-code-suite-three-scenarios.log)。此次normal/rejection/recovery-probe均为Fixture/探针场景；recovery-probe不注入故障、不验证Artifact取消或恢复。第2/7节、人工验收与阶段状态不变。


### 8.9 三场景当前代码回归（2026-10-06）

受控执行`pnpm verify:stage -- --stage V1.2 --suite code`退出0，完整日志见[套件日志](../../../evidence/audits/2026-10-06-w1-v12-full-code-suite-three-scenarios.log)。隔离Chromium分别运行normal、rejection、recovery-probe并创建独立Run：`7e7b0687-c73a-4717-8190-cdc8724c39a8`、`0ae8f719-0f2b-4941-9b6a-9a287c7373b6`、`cc5a3650-ab50-4dd6-bf37-2e2e358a911e`；CLI对三个相同Run分别以`--check-only`只读核验通过。V1.2专属随机Compose项目退出时容器、数据库卷、网络和镜像均已删除并再次核验。机器结果见[隔离E2E JSON](../../../evidence/audits/2026-10-06-w1-v12-isolated-web-e2e.json)及[历史执行快照SHA-256](../../../evidence/audits/2026-10-06-w1-v12-isolated-web-e2e.sha256)，本项审计见[三场景报告](../../../evidence/audits/2026-10-06-w1-v12-three-scenario-web-e2e.md)及[历史执行快照 SHA-256](../../../evidence/audits/2026-10-06-w1-v12-three-scenario-web-e2e.sha256)。该运行Manifest保留当时的V1.2文档哈希；后续文档更新由Artifact task审计的当前输入清单覆盖。recovery-probe的固定语义仅为Qlib探针READY；未注入故障，也未证明取消任务、Artifact原子发布或业务恢复。该工程回归不代表Qlib真实市场研究、Ubuntu、阶段新范围人工签收或V1版本门禁通过。

### 8.10 Artifact task 持久状态切片（2026-10-06，历史结果）

Artifact task真实HTTP/隔离PG重启smoke已接入V1.2代码套件：创建返回202、查询200，取消和重复取消均为`CANCELLED`；停止并重启Market Data进程后同一Task仍可读，匿名创建/取消401、缺失Task 404。专属数据库/容器/网络清理核验通过。纳入此smoke后的完整`pnpm verify:stage -- --stage V1.2 --suite code`受控退出0，Web/API/CLI同Run三场景为`6211c858-15e0-466f-a82b-e017b1d4a7a2`、`deb1cc85-8a26-437b-9cbd-91cbc5f96a7d`、`2c56e44d-9eed-4088-ae9d-29a09613e75d`，随机Compose清理通过。机器结果及Artifact task局限见[审计JSON](../../../evidence/audits/2026-10-06-w1-v12-artifact-task-persistence.json)。

Artifact task 的状态记录已改用 Market Data PostgreSQL 表；新增 Bearer 保护的创建、读取、取消合同，取消对已取消任务幂等，数据库不可用时接口返回503。`pnpm --filter @stockquant/market-data-service typecheck`、`build`、`contracts:check`、单元测试（18文件/71项）、服务身份 HTTP smoke（受控本机）及隔离 PostgreSQL 集成（25项）通过；隔离测试在新 Repository 实例读取同一状态并核验取消持久化，容器和网络清理通过。审计与机器输出见[Artifact task 审计](../../../evidence/audits/2026-10-06-w1-v12-artifact-task-persistence.md)、[结果 JSON](../../../evidence/audits/2026-10-06-w1-v12-artifact-task-persistence.json)和[历史执行快照 SHA-256](../../../evidence/audits/2026-10-06-w1-v12-artifact-task-persistence.sha256)。

该历史切片只证明数据库状态记录；其“无执行器/原子发布”限制已由下方增量覆盖，不删除本历史记录。

### 8.11 Artifact task 原子发布与恢复验证（2026-10-06）

状态机：`QUEUED → RUNNING → COMPLETED | FAILED | CANCELLED`。工作器只读取冻结Fixture `v1.2-market-data-1`，每次认领递增fence并持有数据库租约。Artifact原始字节、固定Fixture版本和SHA-256与`COMPLETED`状态在单一PostgreSQL事务提交；已有task Artifact若内容不同则拒绝覆盖。取消与发布锁同一task行串行化：先取消则无Artifact，先提交发布则任务保持COMPLETED。过期RUNNING租约可被新worker接管，旧fence不能写入。

隔离验证于2026-10-06：Market Data typecheck/build通过；单元19文件/74项通过；PostgreSQL集成28/28通过，包含原子字节与状态、取消/发布并发、租约接管/旧worker fencing和幂等取消；HTTP+临时PostgreSQL进程重启smoke通过，排队任务在重启后执行完成，取消任务无Artifact，产物字节与`fixtures/v1/v1.2/cn_daily.csv`逐字节一致、SHA-256一致。完整`pnpm verify:stage -- --stage V1.2 --suite code`退出0；Web/API/CLI同Run UUID为`967eab4b-6704-4599-9ecb-99032ffc58ff`、`7ac561df-3d83-4a0b-bcf0-21c06a93da22`、`4165ed6a-8fee-42e2-91c4-77cdec657c98`，临时Compose容器、卷、网络清理通过。完整阶段自动验证不构成本轮人工签署、Ubuntu验收或V1整体门禁通过。细节见[Artifact task原子发布审计](../../../evidence/audits/2026-10-06-w1-v12-artifact-task-atomic-publication.md)、[机器报告](../../../evidence/audits/2026-10-06-w1-v12-artifact-task-atomic-publication.json)和[历史执行快照 SHA-256 清单](../../../evidence/audits/2026-10-06-w1-v12-artifact-task-atomic-publication.sha256)。

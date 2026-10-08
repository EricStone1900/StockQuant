# V1.2 小样本数据、真实 Qlib 与环境探针

状态：PARTIALLY_IMPLEMENTED（2026-09-09历史范围自动/人工签署保留；2026-10-07双市场真实Qlib fit、策略Artifact、不可执行治理收件回执、Web/同Run CLI、运行取消和Platform重启恢复隔离工程验证通过；OD-007活动策略参数/确切版本决定、新增范围人工验收和Ubuntu实机复核仍未完成）。版本入口：[README](./README.md)。

历史状态：PASS（2026-09-09既有范围自动验证与用户人工验收，签署记录见下方历史表；不扩展到2026-10-06新增范围）。当前Qlib使用固定`linux/amd64` worker仿真，RD-Agent为无模型调用的兼容探针。共同约束：[三版共同规则](../05-three-version-delivery.md)。

## 1. 前置与范围

V1.1通过；Clock、Artifact、账户和验收中心入口已存在。

本阶段所有订单、券商资产和成交均来自隔离模拟环境。真实业务数据库、Qlib或RD-Agent在声明“已验证”时必须真正执行；替身需独立标注。

## 2. 开发任务

- [x] 实现日线导入预览、原始行情、证券映射、数据版本及质量报告；坏数据不能标可用。复权分离与正式 Artifact 存储列为后续缺口。
- [x] 将固定版本 `pyqlib==0.9.6` 封装到独立 Qlib worker/quant adapter；完成 CPU 导入、CN/US真实Fixture fit/predict、分市场TopK与NO_TRADE策略Artifact，并经合同向Governance提交两个策略快照；本轮Web/CLI隔离E2E可复现。模型独立有效性验证仍为NOT_RUN。
- [x] Artifact 异步任务将持久化状态、执行、取消与不可变产物发布关联；PostgreSQL事务原子提交Artifact字节与`COMPLETED`状态，取消/发布行锁竞态最多产生一个合法终态，租约接管通过fencing拒绝旧worker写入。另有独立Qlib TestRun任务状态，Web显示阶段/错误并支持安全点取消；Platform真实容器重启后按同一Run自动恢复并幂等发布Artifact。Artifact上传任务与Qlib策略Run是两种状态机；边界为固定Fixture、单实例轮询工作器和隔离容器，阶段人工验收仍待执行。
- [x] 提供双市场CN/US、缺失、退市、拆股及未来PIT Fixture；独立验证当前策略训练窗口的标签可用时间与边界purge。合成日历不代表真实交易日历。
- [x] 提供隔离容器内固定代码 RD-Agent 兼容探针；无模型凭证时明确 `modelCalls=NOT_RUN`，不伪称真实实验完成。
- [x] TopK与NO_TRADE精确Artifact策略通过服务Bearer/OpenAPI合同写入Governance独立收件箱；owner/TestRun/strategy幂等，冲突拒绝；短历史、未来数据和未知策略规则失败路径具有零写入/零Proposal/零执行授权断言。收件箱只证明收到研究输出，不激活策略或产生交易命令。

## 3. 同步 Web 开发

正式页：数据导入、质量报告、证券/日线浏览、策略参数和因子排名。验收页：好/坏数据切换、真实Qlib任务证据、RD-Agent兼容矩阵与缺口。

验收中心路径：`/acceptance/v1/v1.2`。场景参数提交到后端TestRun编排接口，后端调用业务API并汇集证据。浏览器不直接写领域数据，不自行判定成交。页面提供normal、rejection、recovery-probe、任务阶段/错误、同Run刷新恢复和运行中取消；固定Fixture运行发生Platform容器重启后，原TestRun自动续跑并可由Web/CLI读回。

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
- [x] 正式Web功能页及验收中心正常/异常场景完成；TestRun任务阶段、错误、运行中安全取消和刷新/Platform重启后的同Run恢复均已接线验证。
- [x] 当前隔离Fixture路径、动态实际Web URL、启动/停止命令、按钮、配置边界、超时、预期输出与失败恢复步骤已补齐，并按第8节实际启动页面、运行三场景浏览器/CLI同Run检查及精确清理。
- [x] 开发者已执行数据 normal/rejection、容器健康、Qlib 0.9.6 CPU 烟测及基础代码检查。
- [x] Web/API/同Run CLI隔离回归已验证真实Qlib双市场输出及Governance持久回执；PostgreSQL确认normal写入2条策略快照、未来数据拒绝Run写入0条快照、Proposal与执行授权均为0。
- [x] V1.2 Qlib策略Artifact在TestRun证据和owner-scoped读取响应中投影同一公共`artifact-ref.v1`（owner/TestRun/kind/namespace/hash/status/sourceRef）；OpenAPI、定向单测及隔离Web/API/CLI E2E通过，见[P1 ArtifactRef审计](../../../evidence/audits/2026-10-07-p1-v12-artifact-ref.md)。此项只关闭Qlib策略Artifact切片，不代表V1.3交易或V1.4报告Artifact已统一。
- [x] Artifact任务重复取消、取消/发布并发、进程重启后排队执行、运行worker租约接管和旧worker拒绝已由隔离测试验证；Qlib Run运行中取消和真实Platform容器重启恢复通过同Run Web/CLI E2E。Qlib recovery-probe仍仅验证READY，不扩展为Qlib数值故障恢复；本阶段当前范围人工验收仍未签署。
- [ ] 当前新增范围用户验收未完成；2026-09-09历史签署保留在下方验收记录，不扩展为本轮签收。
- [x] 可执行操作说明与限制已更新并实测；第8.6分开记录历史签署与当前自动证据，本版当前人工验收和Ubuntu门禁仍未签署/运行。

## 8. 阶段验收操作手册

### 8.1 当前可执行性与验收准备

手册状态：VERIFIED_EXECUTABLE（2026-10-06，隔离FIXTURE/SIMULATION_ONLY手册范围）。已执行`pnpm v12:acceptance`启动独立随机Compose/临时PostgreSQL/Vite，实际地址示例为`http://127.0.0.1:58205/acceptance/v1/v1.2`；该栈已停止，下一次启动会打印新随机URL。Playwright三场景及CLI同Run、Artifact任务HTTP/PG重启smoke、Qlib真实组件CPU烟测均有当前工作树证据。此状态只表示操作步骤可复现，不表示用户签署、真实市场数据、Ubuntu或整版通过。

前置服务：Docker Desktop可用；脚本自行启动隔离Platform、Market Data、Quant、PostgreSQL、Qlib worker及Vite，不依赖V1.1活动栈。

固定输入：当前V1.2研究路径使用冻结版本`v1.2-market-data-4`，10只CN_A、3只US_EQUITY、60个合成工作日、774条raw日线；合成工作日不代表交易所日历。`seed=20260907`。旧版`v1.2-market-data-1`仅2只CN证券、6条日线，仅供其历史Artifact task验证，不满足研究训练窗口。

| 开发交付时必须填写 | 当前值 |
|---|---|
| 实测代码Commit或工作区Hash/验证日期 | 当前未提交工作树；2026-10-06；完整输入Hash见本节最新审计Manifest |
| 项目根目录、Node/pnpm/Python/uv及Docker版本 | `/Users/huangbosong/Documents/ChatGPT/StockQuant`；Node 24.1.0、pnpm 10.34.5；Docker Linux/ARM64仿真环境 |
| Web基础URL/身份登录或会话建立方式 | 执行`pnpm v12:acceptance`后从`READY_FOR_MANUAL_ACCEPTANCE.webUrl`读取实际随机URL；示例`http://127.0.0.1:58205/acceptance/v1/v1.2`。仅绑定本机，Platform使用隔离开发身份`acceptance-owner-1` |
| 本阶段Web路由 | `/acceptance/v1/v1.2` |
| 正式页面的真实入口/跳转链接 | `/acceptance/v1/v1.2`；按钮：“预览正常 Fixture”“预览未来数据拒绝样本”“运行 Qlib CPU 探针”“读取双市场研究 Fixture”“检查策略输出状态”“运行 RD-Agent 兼容探针”；场景选择器“V1.2 验收场景”，按钮“运行 V1.2 场景” |
| Fixture文件/数据版本/确切日期/Hash、规则与成本版本 | `fixtures/v1/v1.2/cn_daily.csv` SHA-256 `2d799e0fc18dbb8d312c394ad61afbe009570bc4a5e9cec0b43231d669a66f78`；`cn_daily_bad_future.csv` SHA-256 `d59c69bca23366c562902c028e6aab87ba2782cef6c274ffd41d784b4df824aa`；版本`v1.2-market-data-1`；asOf `2024-12-31` |
| 配置文件及必需环境变量名/非秘密测试值 | `infra/compose/docker-compose.v12-integration.yml`；命令动态生成随机Project、宿主端口、服务Bearer和DB密码；来源授权变量均false、`STOCKQUANT_LIVE_TRADING_ENABLED=false`、`STOCKQUANT_BROKER_MODE=FAKE`，不读取或打印`.env.local` |
| 外部故障目标及可执行命令、恢复/隔离清理入口 | Artifact task只处理固定Fixture `v1.2-market-data-1`；恢复由PostgreSQL租约过期接管，fencing拒绝旧worker；原子发布在`market_data_task_artifacts`与任务状态同一事务中。`pnpm test:integration:market-data`须在受控隔离PG环境执行；HTTP进程重启用`node scripts/run-isolated-postgres-command.mjs --url-env MARKET_DATA_DATABASE_URL:market_data_test:market_data_test -- pnpm --filter @stockquant/market-data-service artifact-task:http-restart-smoke`；脚本会创建随机临时容器/网络并验证清理。取消：POST `/v1/artifacts/tasks/<taskId>/cancel`；查询：GET `/v1/artifacts/tasks/<taskId>`；产物：GET `/v1/artifacts/tasks/<taskId>/artifact`。 |
| 预期耗时、轮询超时、实际观察期/预算 | 数据预览 <1 秒；Qlib CPU fit通常小于150秒；固定Fixture不调用外部模型、来源或券商。策略任务级取消/恢复尚未接入，当前Run轮询最长150秒 |

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
| normal | 双市场Fixture、锁版Qlib与策略Artifact | 点击“读取双市场研究 Fixture”；选择normal后运行，并检查Run详情的`qlibFit`和Artifact链接。 | TestRun应`COMPLETED`；CN_A与US_EQUITY分别真实fit/predict；分市场TopK各有目标，NO_TRADE为空；Artifact hash、Schema及预测应完整。该结果为合成Fixture工程验证，不证明模型有效性。 |
| rejection | PIT未来数据拒绝 | 点击“预览未来数据拒绝样本”；检查质量输出；选择rejection并运行。 | 输出`FUTURE_DATA`；TestRun `V1.2-DATA-PIT-001`通过且不发布未来数据。 |
| recovery-probe | Qlib/RD-Agent探针 | 点击“运行 RD-Agent 兼容探针”；选择recovery并运行。 | Qlib `READY`、探针`fixed-probe-ok`、TestRun `V1.2-QLIB-PROBE-001`通过；这是探针可用性检查，不注入真实故障，不代表故障恢复或真实LLM调用。 |

4. 运行后页面地址带有`?runId=<testRunId>`；刷新或重新打开该完整地址，页面应从持久TestRun恢复状态与断言。Market Data Artifact任务的取消/重启通过隔离HTTP smoke验证；V1.2策略Run暂没有运行中取消按钮。
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

当前研究Fixture normal预期真实Qlib两个市场fit/predict并`COMPLETED`/exit 0，rejection通过未来PIT断言，recovery-probe只检查兼容探针READY、不执行故障恢复。各场景输出testRunId、实际数据/模型/券商模式、断言expected/actual及证据位置；意外副作用/缺脚本/缺必需依赖/未满观察条件非零。浏览器测试必须实际运行本阶段用例，零用例/全跳过不能退出0。

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


### 2026-10-06 V1.2 因子结果边界更正

复核发现原`/v1/factors/preview`返回固定写死的两条排名，TestRun只检查列表长度，无法证明策略值由冻结行情计算。本轮已去掉固定排名，响应改为`NOT_RUN`；V1.2 normal TestRun现保存`WAITING`及`NOT_RUN`断言，浏览器与同Run CLI保留该状态。此为防止静态结果冒充计算完成的边界修正。P2仍需冻结足量双市场Fixture、接通真实锁版Qlib因子/策略输出并完成独立数值校验。历史TestRun与签署均未改写。


### 8.13 2026-10-06 真实策略输出状态复验

首次完整代码套件在Market Data取消/发布竞争集成测试中暴露测试变量漏接，原始失败日志保留。修正测试后，`pnpm verify:stage -- --stage V1.2 --suite code`在隔离环境exit 0。Web/CLI同run normal/rejection/recovery ID分别为`a899ddf7-e7cb-4913-a10d-44f158870c61`、`2bebb8ce-f8d9-419e-ba93-eb341c2ebc6f`、`859a6aa5-c115-40d0-b174-7d278c029224`；normal因当前真实策略输出`NOT_RUN`而保持`WAITING`，拒绝和探针场景的自动检查通过。详见[因子边界及复验审计](../../../evidence/audits/2026-10-06-v1-p2-v12-static-factor-fail-closed.md)、[机器摘要](../../../evidence/audits/2026-10-06-v1-p2-v12-static-factor-fail-closed.json)和[历史执行快照Hash清单](../../../evidence/audits/2026-10-06-v1-p2-current-source.sha256)；版本4当前实现见[历史执行快照Hash清单v2](../../../evidence/audits/2026-10-06-v1-p2-current-source-v2.sha256)；更新后的当前输入见[历史执行快照Hash清单v4](../../../evidence/audits/2026-10-06-v1-p2-current-source-v4.sha256)；本轮API接线实现见[2026-10-06历史执行快照源码Hash清单v5](../../../evidence/audits/2026-10-06-v1-p2-current-source-v5.sha256)。本轮没有人工验收，也没有接入行情/模型外部服务。


### 2026-10-06 P2 双市场研究 Fixture

新增冻结版本`v1.2-market-data-4`：合成10只CN_A、3只US_EQUITY、60个合成工作日、774条raw日线，并覆盖缺失、退市、独立拆股事件和未来PIT探针。独立校验器验证20日特征/下一日收益标签及时间屏障，生成训练/验证/测试行180/142/138；`pnpm fixtures:check`通过。该版本尚未接入Market Data API或真实Qlib策略排名，normal仍WAITING。首个数据候选版本发现缺失样本生成错误后改标RETIRED并保留输入，没有覆盖；错误日志和修正版审计见[P2原始数据集审计（历史版本3）](../../../evidence/audits/2026-10-06-v1-p2-dual-market-fixture.md)、[版本4修正审计](../../../evidence/audits/2026-10-06-v1-p2-dual-market-fixture-v4.md)、[版本4机器报告](../../../evidence/audits/2026-10-06-v1-p2-dual-market-fixture-v4.json)、[版本2失败日志](../../../evidence/audits/2026-10-06-v1-p2-fixture-v2-validation-failure.log)和[版本3失败日志](../../../evidence/audits/2026-10-06-v1-p2-fixture-v3-schema-path-failure.log)。全部输入均为合成工作日，不代表交易所日历、真实行情或策略收益。


### 8.14 v1.2-market-data-4 完整代码门禁复验

`pnpm verify:stage -- --stage V1.2 --suite code`在修正版Fixture及退役清单schema路径修正后exit 0。normal/rejection/recovery TestRun ID为`e65d46aa-0232-4ede-b493-70d9aad8f108`、`510ae217-e059-40d4-b317-ce7aabd69c30`、`d8769ba8-05f0-4d22-b8e1-62ac109aab85`；normal仍按未接入Qlib策略输出正确保持WAITING，拒绝/探针场景自动核验通过。审计见[P2完整代码门禁报告](../../../evidence/audits/2026-10-06-v1-p2-dual-market-fixture-full-suite.md)、[机器结果](../../../evidence/audits/2026-10-06-v1-p2-dual-market-fixture-full-suite.json)和[完整日志](../../../evidence/audits/2026-10-06-v1-p2-v12-market-data-4-suite-pass.log)。


### 8.15 Market Data 双市场 Fixture API/Web预览

新增`GET /v1/fixtures/research-preview`，由Market Data校验v4日线字节Hash后，通过平台服务身份、生成OpenAPI客户端送至正式V1.2页面。Web仅摘要显示数据版本、证券数、行数及市场类型，不创建领域Run事实。完整`pnpm verify:stage -- --stage V1.2 --suite code` exit 0；浏览器创建的normal/rejection/recovery UUID为`43574514-e61d-46e0-aecd-469c6ffaffb7`、`e7924db9-ffdb-41dc-8a85-acc02aebb507`和`4093d5dc-431f-43d4-ab73-c614baf3dadb`，同Run CLI核查全部成功；正常TestRun仍因Qlib策略输出NOT_RUN保持WAITING。详见[Market Data Fixture API审计](../../../evidence/audits/2026-10-06-v1-p2-marketdata-research-fixture-api.md)、[机器结果](../../../evidence/audits/2026-10-06-v1-p2-marketdata-research-fixture-api.json)和[完整套件日志](../../../evidence/audits/2026-10-06-v1-p2-v12-research-api-suite.log)。

### 8.16 双市场真实Qlib策略Artifact隔离闭环（2026-10-06）

本节更新8.1当前研究路径和8.13～8.15历史快照中的状态描述；旧Run、旧摘要、失败及SHA记录均保留。固定命令为`STOCKQUANT_V12_MANUAL_ACCEPTANCE=0 node scripts/test-v12-e2e-isolated.mjs`，脚本用随机Compose项目、独立PostgreSQL与命名Artifact卷启动Market Data、Platform、Quant/Qlib和容器化Web，结束时移除该项目容器、卷、网络及镜像并核验资源为零。成功实测URL为`http://127.0.0.1:51474/acceptance/v1/v1.2`（下次端口随机变化）。

normal场景对`v1.2-market-data-4`分别按CN_A和US_EQUITY时间轴生成20日动量、成交量比与区间特征，以次日收盘价收益为标签；训练/验证/测试分界purge标签重叠日并按availableAt/asOf检查无前视。运行锁版`pyqlib 0.9.6`与`LightGBM 4.7.0`真实`LGBModel.fit/predict`，生成分市场TopK候选及显式空腿NO_TRADE，连同模型字节、输入/数据/策略Hash写入持久不可变Artifact。浏览器检查Artifact Schema、字节Hash、112条预测、非恒定预测及双市场覆盖；CLI用浏览器创建的同一TestRun以`--check-only`独立通过。随机隔离项目`sq-v12-e2e-cfed4f354f335e110e07`的TestRun UUID依次为normal `e0e6f0ca-f14b-489e-9103-e1d59d5e8237`、rejection `a78809c4-4a41-4ca7-8fee-0f7fdbe072f8`、recovery-probe `79b05810-972f-49aa-b274-6e54c9f06d63`；机器结果见[本轮E2E JSON](../../../evidence/audits/2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-cfed4f354f335e110e07.json)，输入与证据Hash见[历史执行快照SHA-256清单](../../../evidence/audits/2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-cfed4f354f335e110e07.sha256)，人工可读审计见[策略闭环报告](../../../evidence/audits/2026-10-06-v1-p2-qlib-strategy-loop.md)。该随机运行的数据库及Artifact卷按隔离清理设计删除；JSON记录已保留Artifact ID/Hash与断言。

这次回归关闭正常场景的策略计算与Artifact访问缺口，不代表模型效果、市场数据或交易日历真实性。Artifact task的持久/取消/恢复实现是独立Market Data切片，Qlib策略Run尚未进入该task状态机；页面目前通过TestRun运行并轮询，未提供专用取消/恢复控件。因此P2仍为PARTIAL，策略task fencing/取消/进程重启恢复和新范围用户签署未完成；Ubuntu及真实市场模型验证均NOT_RUN。

### 8.17 当前完整代码门禁重跑（2026-10-06）

本轮重新执行`pnpm verify:stage -- --stage V1.2 --suite code`：仓库基线、契约/Fixture、全仓lint/typecheck/unit、隔离服务集成、Market Data Artifact任务HTTP重启、锁版Qlib fit-smoke及V1.2容器化Web三场景 E2E均结束成功，整套命令退出0。随机隔离Compose项目`sq-v12-e2e-30996de0ca83e50cae1f`及当次normal/rejection/recovery TestRun ID见[本轮E2E JSON](../../../evidence/audits/2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-30996de0ca83e50cae1f.json)，输入清单见[历史执行快照SHA-256清单](../../../evidence/audits/2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-30996de0ca83e50cae1f.sha256)。Playwright 1/1通过，三者同Run CLI检查成功，隔离容器/卷/网络/镜像清理已核验。Qlib smoke日志存在Git未安装的MLflow源码追踪告警，但fit/predict请求成功且该告警不影响训练结果；正式环境源码追踪仍需配置。

### 8.18 策略原因与刷新恢复验证（2026-10-06）

策略Artifact合同现在要求TOPK/NO_TRADE均带非空策略原因，TopK每个目标也带选择原因；Playwright读取持久Artifact并断言这些字段。运行成功后页面把TestRun ID写入`?runId=`，刷新或重开相同URL会重新读取同一owner-scoped TestRun并继续显示状态/证据。单独重跑`STOCKQUANT_V12_MANUAL_ACCEPTANCE=0 node scripts/test-v12-e2e-isolated.mjs`通过，项目`sq-v12-e2e-20365e923bb39b9f1dcc`，TestRun ID：normal `0ead01d1-773e-49e0-a079-dd88cce3353b`、rejection `8427d206-d80d-48e5-ad76-a60404f834bf`、recovery-probe `1377bc2e-d1a8-4ceb-9aee-b369eb24f2f6`；刷新后normal仍为同一ID/COMPLETED，浏览器断言、同Run CLI和隔离清理通过。报告与当前源码/Fixture Hash见[刷新恢复 E2E JSON](../../../evidence/audits/2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-20365e923bb39b9f1dcc.json)和[历史执行快照SHA清单](../../../evidence/audits/2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-20365e923bb39b9f1dcc.sha256)。

### 8.19 Qlib TestRun 取消与真实 Platform 重启恢复（2026-10-06）

完成Qlib策略Run自己的持久任务状态、进度、取消与进程恢复：Web在运行中显示阶段和取消入口；取消意图写入PostgreSQL，在当前Qlib fit返回后的安全检查点终止并保证不发布部分Artifact；`PUBLISHING_ARTIFACT`开始后由行锁保护最终发布。Platform启动时扫描同一PostgreSQL内的RUNNING V1.2 TestRun，以PostgreSQL advisory lock防止双worker；恢复后保留Run身份/历史并从固定输入确定性重算。Artifact ID仍由内容SHA决定，但数据库唯一性改为`(test_run_id, artifact_id)`，因此不同TestRun可引用相同内容哈希，重复发布在Run内幂等；迁移兼容旧单列主键。

真实PostgreSQL集成3/3通过，覆盖advisory lock竞争/释放、运行状态恢复、取消与发布fencing、旧主键迁移和同一Artifact哈希跨TestRun存储。V1.2隔离浏览器E2E及整套`pnpm verify:stage -- --stage V1.2 --suite code`均exit 0。项目`sq-v12-e2e-c803feeff360de114c1a`内normal/rejection/recovery-probe TestRun分别为`1552ccec-1718-420a-9f75-bff99f6d684b`、`817d60a9-ab5d-49d3-a09d-044667fa6f21`、`14d326cd-0dfb-4f99-8f72-128f462f84e3`；取消Run `1835aad7-60fe-429b-bbb7-cbe5f17c6fc9`状态`CANCELLED`且无Artifact；Platform重启Run `416be702-913f-4f0b-a048-8a58d1e51297`在阶段`FITTING_US_EQUITY`重启后以`resumeCount=1`恢复、完成两个市场fit并发布Artifact `aaad642e185dc622d2fe79764f6527645c05709a4d41f536f6b6e7a2ba7e61e3`，Web刷新和同Run CLI均通过。所有隔离容器/卷/网络/镜像清理通过。整套日志、E2E机器结果和输入Hash见[V1.2完整门禁日志](../../../evidence/audits/2026-10-06-v12-code-suite-platform-restart.log)、[隔离E2E JSON](../../../evidence/audits/2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-c803feeff360de114c1a.json)、[历史执行快照源码及输入Hash清单](../../../evidence/audits/2026-10-06-v12-code-suite-platform-restart.sha256)。

此前两次重启恢复E2E失败记录保留：一次暴露同内容Artifact被全局主键拒绝；另一次是Harness把额外Restart Run计入三场景数量。两者已修复并由上面的PostgreSQL集成和全套E2E重验。当前工程闭环通过不构成新增范围用户签署，不授权将TopK激活为策略；OD-007决定、Ubuntu实机和模型有效性仍未完成。

### 8.20 V1.2策略输出至Governance收件箱（2026-10-07）

新增治理策略快照PostgreSQL收件箱与受控OpenAPI命令。Qlib TestRun在Artifact持久发布后，将TopK双市场目标和NO_TRADE空目标连同owner、同一TestRun、Artifact ID/SHA、Fixture/因子版本、asOf、策略Hash发送给Governance；相同快照重试幂等，冲突输入拒绝。Web normal Run断言两份回执均为`RECEIVED`；CLI对同一TestRun只读核验。隔离PostgreSQL直接计数为normal Run 2条快照、未来数据rejection Run 0条快照、normal Run 0条Proposal及0条执行授权；短历史在拟合前失败，未知策略ID返回422且收件箱repository不被调用。锁版Qlib双市场fit/predict、取消无Artifact、Platform进程重启恢复及随机资源清理均通过。最新TestRun normal/rejection/recovery-probe/重启Run：`9939b07c-4398-41ae-9a8b-70b768701358`、`58ff33f3-2920-4c14-8d9a-12686546afab`、`24aca7ca-9cbe-42ce-b39f-bf9e04c7ea5b`、`9f747c65-ace4-4b3a-9859-5606f08af095`；Artifact SHA-256 `aaad642e185dc622d2fe79764f6527645c05709a4d41f536f6b6e7a2ba7e61e3`。数据库断言、所有Run输出、清理标志见[机器E2E报告](../../../evidence/audits/2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-6a74bb3a2f5951a23db7.json)，完整输入Hash见[历史执行快照 SHA-256 Manifest](../../../evidence/audits/2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-6a74bb3a2f5951a23db7.sha256)。收件箱记录是不可执行的研究输出收据；它不代表策略审批、激活或收益验证。当前新增范围人工验收、OD-007活动策略精确版本决定和Ubuntu门禁仍未完成。

### 8.21 完整V1.2代码套件（2026-10-07）

`pnpm verify:stage -- --stage V1.2 --suite code`受控运行exit 0：Markdown链接、契约/Fixture、服务分层、全仓Build/Typecheck/Unit、隔离PostgreSQL/HTTP、Artifact task重启、Qlib 0.9.6 CPU fit smoke和容器化Web/CLI同Run场景均通过。当前这次运行内的V1.2 E2E normal/rejection/recovery-probe/Platform重启Run依次为`29a16b68-b6a9-48a4-8f32-05e469b993f4`、`3c9486dd-62d5-4c39-857e-8c4d119a555e`、`a06209ed-e935-4423-83f9-08cfd11c9f4f`、`a71a23fb-6068-4762-a542-6b1ddf0ccbf3`；Governance数据库断言`[2,0,0,0]`通过，取消Run没有发布Artifact，Platform重启后原Run以`resumeCount=1`完成，随机项目`sq-v12-e2e-1dd2d38c42f2392cb0b4`容器/卷/网络清理通过。完整机器Run与输入SHA-256历史执行快照见[隔离E2E报告](../../../evidence/audits/2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-1dd2d38c42f2392cb0b4.json)和[历史执行快照 SHA-256 Manifest](../../../evidence/audits/2026-10-06-w1-v12-qlib-loop-sq-v12-e2e-1dd2d38c42f2392cb0b4.sha256)；先前code suite完整输出保留在[代码套件日志](../../../evidence/audits/2026-10-07-v12-code-suite-current.log)。这只表示V1.2当前工程代码套件通过；阶段新增范围的用户签署、OD-007策略决定、历史TestRun导出与Ubuntu仍未完成。

### 8.22 隔离交互栈启动与精确关停（2026-10-07）

开发/人工走查需要保持容器栈时，在项目根目录执行`pnpm stack:up -- --stage V1.2`；等待输出`READY_FOR_MANUAL_ACCEPTANCE`，使用其实际随机Web URL与Platform API URL。该命令启动容器化Web、PostgreSQL、Market Data、Qlib worker、Quant Research、Governance和Platform API；固定为`brokerMode=FAKE`、`liveTradingEnabled=false`、数据源授权NONE。使用该命令输出的唯一`isolatedProject`执行`pnpm stack:down -- --project <isolatedProject>`；关停命令通知前台Harness仅清理该Compose项目，并核对容器、卷、网络和镜像。凭据和状态保存在忽略目录`.codex/isolated-stacks/`且文件权限0600。关闭环境不等于人工验收；本次没有创建TestRun，新增范围人工验收仍为NOT_RUN。该启动/关停切片的实际观察见[P1 V1.2隔离交互栈审计](../../../evidence/audits/2026-10-07-p1-v12-isolated-interactive-stack.md)及[历史执行快照源码/审计SHA-256清单](../../../evidence/audits/2026-10-07-p1-v12-isolated-interactive-stack.sha256)，按对应历史工作树生成，不与当前源码Hash比较。

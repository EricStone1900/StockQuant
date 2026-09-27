# V2.4 真实时钟下持续模拟交易

状态：PARTIALLY_IMPLEMENTED。版本入口：[README](./README.md)。共同约束：[三版共同规则](../05-three-version-delivery.md)。

2026-09-27 验收证据更正：旧的V2.4 normal/rejection/recovery引擎静态返回PASS，并伪称Mandate ACTIVE、对账PASS、陈旧拒绝和恢复完成；这些值没有来自真实订单/Fill/对账服务的证据。现三类API场景均持久化为`WAITING`/`NOT_RUN`，明确`dataMode=NOT_CONNECTED`、policy/Mandate `PREPARATION_ONLY`，空订单/成交和NOT_RUN对账；不再拼接报价预览。验收页按钮改为“检查前置”，并显示未接通状态；场景、配置、调度和观察API需要本地session。历史运行与签署不被篡改，也不覆盖此次研究/执行范围。20日计数不会因门禁检查增加。详见[无伪造Paper证据审计](../../../evidence/audits/2026-09-27-v24-no-fabricated-paper-evidence.md)。

## 1. 前置与范围

V2.1实际来源通过、V1.5调度恢复通过；历史分钟回放结果不等同实时成交证据。

本阶段所有订单、券商资产和成交均来自隔离模拟环境。真实业务数据库、Qlib或RD-Agent在声明“已验证”时必须真正执行；替身需独立标注。

## 2. 开发任务

- [x] 固定未接通业务链时的准备态契约：Web/API 持久化 owner-scoped WAITING TestRun，OpenAPI 与生成类型一致，并用实际 Chromium→Vite→Platform API→隔离PostgreSQL→CLI `--check-only`核对同一ID；不调用下游或生成交易证据。详见[TestRun OpenAPI及Web/API/CLI同run审计](../../../evidence/audits/2026-09-27-v24-run-openapi.md)。
- [ ] 连接实际采样行情与FakeBroker，按已版本化日频信号/执行窗口自动调仓；使用SystemClock，保留数据年龄与成交假设。
- [ ] 定义独立SNAPSHOT模型：下单后首个符合新鲜度/会话政策的快照才可作为模拟成交输入；不补造两次采样之间触价记录，无可靠量数据不伪称参与率已验证。
- [x] 冻结V2.4 Paper执行政策的准备边界：日频信号、A股快照窗口、下单后首个新鲜快照、PAPER/FAKE及风险预留前置；契约明确标记 `PREPARATION_ONLY`，策略、Mandate、偏离、风险/费用版本和美股政策缺项保持阻断（准备工作完成，不等于策略可执行）。
- [x] 增加Platform会话代理与Web就绪显示，并实测内部每服务独立Bearer、匿名拒绝和零账本副作用：CN_A显示BLOCKED、US_EQUITY显示REJECTED，风险/资源预留仍NOT_RUN、订单提交关闭；浏览器显示由固定响应桩验证，真实HTTP代理/Bearer由隔离API smoke独立验证；不构成Paper执行验收。详见[P5.5 readiness审计](../../../evidence/audits/2026-09-27-p5-5-paper-readiness.md)。
- [ ] 保存SimulationExecutionPolicy，不放宽未来LIVE的ExecutionPolicy；行情陈旧/未知状态/账户过期时暂停相应模拟交易并显示原因。
- [ ] 日终自动对账、告警去重、断网/睡眠恢复；错过窗口只重评，不集中补旧单。新闻默认展示，升级动作需独立批准的策略规则。
- [ ] 建立连续观察记录，建议A股20个实际交易日；观察期间可继续V2.5/V3独立工作，但观察门禁未满保持NOT_RUN，不用加速回放代替。

## 3. 同步 Web 开发

正式页：当前模式、采样/策略/执行下次时间、行情年龄、模拟订单/资产、日终对账和连续运行日历。验收页：断网、陈旧、重复调度、恢复。

验收中心路径：`/acceptance/v2/v2.4`（目标路由）。场景参数提交到后端TestRun编排接口，后端调用业务API并汇集证据。浏览器不直接写领域数据，不自行判定成交。该阶段至少提供正常、拒绝/异常场景；适用时增加重试/恢复场景。

## 4. 人工验收步骤

1. 启用模拟Mandate后关闭Web，等待交易窗口后查看后台行为，允许HOLD。
2. 确认采样时不会自动加一次调仓，快照成交报告显式SNAPSHOT且无分钟路径假记录。
3. 使来源超时/陈旧，查看拒绝与告警；恢复后先核对账户和窗口再运行。
4. 查看每日对账与观察覆盖，记录失败窗口、无信号日和停机日，不能删掉失败改善统计。

每次保存testRunId、场景版本、代码/镜像、数据/规则版本、种子及注入事件序列、实际/预期、截图/Trace。判定依据必须是后端事实和独立检查，不能只看Toast成功提示。

## 5. 异常与替身边界

Mac睡眠会形成真实采集断档；加速测试通过不能声称连续在线通过；本阶段没有真实券商账户，报告称Paper模拟。

## 6. 产物与验证

目标产物：SimulationExecutionPolicy、实际采样到FakeBroker链路、持续运行日志、Paper总览、20交易日观察报告。

实现复核补充（2026-09-25）：执行服务新增确定性 SNAPSHOT eligibility gate，要求订单先在明确执行窗口接受、只选择同市场/证券且下单后观察到的新鲜快照，并用注入 Clock 判断；过期/未来/格式错误输入失败关闭。该规则不生成订单或 Fill，也不替代 Mandate、账户/风险预留、偏离/费用政策及 FakeBroker 持久化；测试账户上的策略和授权仍是独立后续工作，正式策略保持 HOLD。

FakeBroker 持久化复核（2026-09-25）：隔离`trade_execution_test`中的并发同键、异载荷409、旧无指纹订单拒绝及重连重放均通过；同键只生成一笔订单/Fill/Event/Outbox。证据见[P5.6执行记录](../../../evidence/audits/2026-09-25-p5-6-fakebroker-persistence.md)。此记录仅证明FakeBroker仓储底座，不代表SNAPSHOT→Mandate/资源预留→FakeBroker的Paper交易链已接通，P5.5治理/资源预留仍缺。

资源预留底座（2026-09-25）：portfolio-risk-service新增账户级现金/证券预留持久化适配器，按账户事务锁串行化并绑定账户、owner、namespace、TestRun、clientOrderId及幂等键；HELD/UNKNOWN持续占用额度，UNKNOWN只能依据带证据的权威结果释放/捕获。隔离`portfolio_risk_test`验证并发现金和证券预留不会超额、重复请求幂等、同订单改键冲突、跨owner拒绝和UNKNOWN保留。契约/Fixture为`resource-reservation-*`。该适配器没有暴露HTTP路由或接入订单流程。2026-09-25补入调用方独立Bearer认证和route scope，平台API、执行服务、历史回放Worker分别使用独立token；临时HTTP烟测与V2.4代码套件通过，活动服务未部署。Mandate、risk evaluation、报价陈旧检查、卖出Fill账本语义及预留与Fill原子结算仍未完成，P5.5保持未完成。详见[资源预留记录](../../../evidence/audits/2026-09-25-p5-5-resource-reservations.md)及[Portfolio Bearer边界记录](../../../evidence/audits/2026-09-25-p5-5-portfolio-bearer.md)。

实现复核补充（2026-09-25，当时状态）：FakeBroker 持久执行为每个幂等键保存语义请求指纹，并序列化同键并发请求；重复键载荷不一致时返回409且不创建额外订单/成交。旧行没有指纹时失败关闭并要求先查询原订单。专用 PostgreSQL 集成场景已实现；首次尝试受沙箱本机网络限制未执行。随后同一隔离集成命令重跑通过，见下方2026-09-27更正；活动服务仍未部署。

FakeBroker集成证据状态更正（2026-09-27）：2026-09-25审计[P5.6执行记录](../../../evidence/audits/2026-09-25-p5-6-fakebroker-persistence.md)确认，针对本机测试数据库权限阻塞，在受控本机数据库访问下重跑隔离`trade_execution_test` PostgreSQL集成及临时HTTP身份smoke并通过。并发同键仅产生一组订单/Fill/Event/Outbox，异载荷与旧无指纹重放均失败关闭；不改变P5.5 Mandate/风险/资源预留、快照到下单接线、P5.7完整交易闭环或Paper人工验收仍未完成的状态，也不表示活动服务已部署。

实现复核补充（2026-09-25）：新增冻结的 `v24-snapshot-cn-paper-execution` Fixture 和纯领域投影：合格的首个快照价格、显式全量成交假设及 Fixture 费用组成 `PROJECTED_ONLY` 输出；报告 `liquidityParticipation=NOT_VERIFIED`。拒绝 REAL 数据、LIVE/非FAKE 模式及市场/证券错配。该投影不会写FakeBroker订单/Fill、Portfolio账本或活动账户，不满足执行链路验收；当前未部署。

执行政策准备（2026-09-25）：新增契约 [`v24-paper-execution-policy.schema.json`](../../../packages/contracts/schemas/common/v24-paper-execution-policy.schema.json) 与固定准备输入 [`v24-paper-execution-policy-v1.json`](../../../packages/contracts/fixtures/v24-paper-execution-policy-v1.json)。冻结日线信号 asOf、A股 `09:31–09:35`（Asia/Shanghai）执行窗口、`SNAPSHOT`、下单后首个同证券新鲜快照、30分钟数据年龄上限、PAPER/FAKE 约束，以及Mandate/风险评估/资源预留必需边界。当前策略状态为 `PREPARATION_ONLY`，不具备下单能力；精确策略版本、Mandate、最大报价偏离、风险政策版本、费用政策版本均为 `UNSET`，美股独立执行政策未定义。就绪检查对这些缺项保持BLOCKED；不因合同/检查器存在而把活动Paper切为可执行。

观察质量实现复核（2026-09-26）：日终计日现要求完整的十个冻结采样调度窗口（09:30、10:00、10:30、11:00、11:30、13:00、13:30、14:00、14:30、15:00），同一窗口重复事件不增加覆盖且会使当天不合格；采样延迟须在排程前后60秒内。Market Data快照明确回传请求证券集合；每个唯一采样窗口及09:31执行窗口均逐证券核对集合覆盖、唯一性、`LIVE_SOURCE`状态和相对注入观察时钟0～1800秒新鲜度。缺事件/窗口、报价缺失/重复/多余、过期/未来报价或来源不完整时，不计入新观察日。隔离PG与单测通过；本地改动尚未部署活动容器，既有正式Finalization及8/20历史观察未被批量重写，不能用本项实现证据替代自然交易日或人工验收。详见[观察质量审计](../../../evidence/audits/2026-09-26-v24-observation-quality.md)。
Mandate准备（2026-09-25）：新增 `v24-paper-mandate-v1` 准备契约与固定输入，明确授权必须绑定owner、账户、namespace、testRun、精确策略和证券范围，包含订单/总敞口/日换手限额、有效期及批准证据。当前所有字段均为UNSET/空值，readiness恒为BLOCKED；无授权创建或订单路径，美股拒绝。

服务身份复核（2026-09-25）：项目所有者确认每服务独立Bearer Token后，trade execution执行/撤单等路由绑定平台与回放身份，decision governance将授权申请和消费拆分为回放/执行身份，回放Worker入站由平台身份控制，quant research限制回放身份只调用multi-bar。trade execution在专用`trade_execution_test`运行真实HTTP鉴权smoke并通过；治理/回放/量化路由策略单测、构建及Compose静态配置通过，活动容器未更新。随后完整V2.4 code suite退出0；不改变当前Mandate BLOCKED和20日观察门禁。细节见[服务间Bearer边界审计](../../../evidence/audits/2026-09-25-p5-service-bearer-boundary.md)。

观察 TestRun 的日终完成只能从对应日期 namespace 的非终态更新；相同结果重试保持幂等。若质量复核发现已完成日存在错误，失效前的状态、断言和证据追加保存到 `acceptance_stage_run_revisions`，当前记录标记 `FAILED`，不得静默覆盖原结论。观察运行列表与修订记录均通过 owner-scoped API 提供，并可在 V2.4 验收页按观察运行查看旧结论、断言和证据。隔离 PostgreSQL、API 单元、Web 构建、API/Web 容器构建部署、服务端权限和容器化页面用例已验证；生产观察库当前没有可展示的修订记录，正式业务观察状态和人工验收状态不因此改变。

同一TestRun真实Web/API/隔离PostgreSQL/CLI核对补充（2026-09-25）：在`platform_api_test`生成随机观察运行与延迟质量错误，数据库迁移保留原结论后，V2.4页面通过真实API代理展示该修订；同一run由CLI `--check-only`只读核对，因修订后TestRun保留为FAILED而预期退出1。临时进程链与容器化Web/API链均已通过Playwright验证；后者使用独立Docker network、随机命名临时镜像和专用测试库。两者均精确清理临时记录，容器smoke已核实无遗留容器/网络/镜像，正式观察计数及自动任务不变。数据库直接格式化纯日期并有隔离PG精确日期断言。最新容器复验 TestRun `72dc7006-e8bd-4d26-bc6e-3252d1c0ee2f`，观察日期`2098-04-09`，修订数1，Web/API/数据库/同run CLI PASS；CLI因预期FAILED退出1。自然生成的正式修订记录仍等待实际事件，工程smoke不增加20日计数或人工验收。详见[P3.12修订历史审计](../../../evidence/audits/2026-09-25-p3-12-v24-observation-history.md)。

自动验证：调度/新鲜度/窗口规则、真实来源与FakeBroker集成、浏览器关闭、断网恢复、实际交易日观察。

需求/测试追踪：MON、OPS、EXE-03/06、AUT模拟子项；T16/17/24/30/38/48/50/53/54模拟子项；DV-05、VT05。

退出条件：开发任务完成、Web真实可操作、全部适用检查PASS、人工签署、已知限制写入证据。填写[本版验收表](./99-acceptance.md)，未完成项不得勾选通过。

## 7. 阶段交付待办（完成后勾选）

以下勾选只记录本阶段交付进度，不能代替第2节逐项开发任务或版本验收结论。开发者凭实现/实测证据勾选开发项；“人工验收”仅在用户实际确认后勾选，不预填PASS。

- [x] 契约、数据结构、场景定义和预期结果已冻结。
- [x] 当前未连接业务链的持久WAITING准备态接口、严格OpenAPI/Schema/生成类型及真实Web→API→隔离PostgreSQL→CLI同run检查已通过；此项不代表Paper交易验收。
- [ ] 第2节后端业务任务完成。SystemClock调度状态、采样Tick、部分Paper/Fake准备边界和行情探针有历史工程证据；SNAPSHOT→Mandate/risk/reservation→FakeBroker→Portfolio链未接通。
- [ ] 正式Web功能页及验收中心的当前Paper正常/拒绝/恢复业务场景完成；旧静态PASS不计作当前场景证据。
- [ ] 第8节操作手册具备可执行的当前输入、依赖与恢复说明；当前仍为`DRAFT_NOT_EXECUTABLE`。
- [ ] 开发者已按第8节对当前实现完整执行并保存业务证据；旧执行记录保留为历史，不证明已更正的执行链。
- [ ] 当前交易链重复/恢复验证和适用观察门禁完成。旧V2.4数据库`8/20`（2026-09-15～18、21～24）及DC-08A `5/20`计数保留作历史记录，不折抵尚未接通的新Paper链门禁。
- [ ] 用户已对当前Paper实现范围完成人工验收；2026-09-11原签署保留为历史，不代表对2026-09-27后更正范围的确认。
- [x] 操作说明与限制已更新，[本版验收表](./99-acceptance.md)已同步。

## 8. 阶段验收操作手册

### 8.1 当前可执行性与验收准备

手册状态：DRAFT_NOT_EXECUTABLE（旧操作步骤预设策略/Mandate和交易链已实现；2026-09-27源码复核已证实并撤销该代码层假设。当前验收场景仅登记前置检查，状态为WAITING/NOT_RUN。历史人工签署保留但不作为当前链路接受。）

前置服务：实际来源采集、SystemClock调度、FakeBroker/核心链路、日终对账和告警。

固定输入：≤100只实际在线池、固定日频策略与模拟Mandate、SNAPSHOT及已冻结新鲜度政策，实际交易日观察20日。

| 开发交付时必须填写 | 当前值 |
|---|---|
| 实测代码Commit或工作区Hash/验证日期 | 当前工作区复核，基线 `1f10ceb` + V2.4 实现，2026-09-11 |
| 项目根目录、Node/pnpm/Python/uv及Docker版本 | `/Users/huangbosong/Documents/ChatGPT/StockQuant`；Node `v24.1.0`；pnpm `10.34.5`；Docker Compose 容器化 |
| Web基础URL/身份登录或会话建立方式 | `http://127.0.0.1:8080`；本地验收身份 `acceptance-owner-1`；不记录密码/token |
| 本阶段Web路由 | `/acceptance/v2/v2.4`（目标） |
| 正式页面的真实入口/跳转链接 | `http://127.0.0.1:8080/acceptance/v2/v2.4` |
| Fixture文件/数据版本/确切日期/Hash、规则与成本版本 | 当前场景仅为接线门禁：`dataMode=NOT_CONNECTED`；policy/Mandate `PREPARATION_ONLY`。SNAPSHOT/市场价/成交费用未作为场景输入 |
| 配置文件及必需环境变量名/非秘密测试值 | `infra/compose/docker-compose.yml`；`STOCKQUANT_BROKER_MODE=FAKE`、`STOCKQUANT_LIVE_TRADING_ENABLED=false`。portfolio-risk内部调用还需在忽略的`.env.local`设置独立的`STOCKQUANT_SERVICE_TOKEN_PLATFORM_API`、`STOCKQUANT_SERVICE_TOKEN_TRADE_EXECUTION`、`STOCKQUANT_SERVICE_TOKEN_HISTORICAL_REPLAY`；不可将密钥提交到仓库。 |
| 外部故障目标及可执行命令、恢复/隔离清理入口 | recovery 场景固定注入来源断网/错过窗口；保留隔离运行和证据，不删除共享卷 |
| 预期耗时、轮询超时、实际观察期/预算 | 单场景 <60 秒；服务健康轮询 20×5 秒；实际观察期 20 个交易日（当前 `NOT_RUN`） |

### 8.2 初始化与启动（已验证命令）

在上表填写的项目根目录运行；工具版本按锁文件/项目说明准备。首次开发由开发者生成锁文件和脚本，验收者不负责补建环境。环境变量按上表配置；保持FAKE券商与模拟账户，真实模型仅在本阶段明确要求且预算已配置的场景调用。

```bash
# 终端A：先确认实际执行目录为项目根目录
pwd
pnpm install --frozen-lockfile
pnpm stack:up -- --stage V2.4

# 终端B：同一项目根目录，保持开发服务器运行
pnpm dev:web
```

预期：安装与stack入口退出0；stack输出本阶段服务、端口、健康/迁移及持久卷状态。依赖不可用应非零并说明原因；不能删除旧业务卷重试。Web服务器持续运行并输出基础URL，尚在运行不要求退出码0。若已使用容器化Web，则填写已验证入口并避免重复占用端口。Ubuntu部署必须补齐实际镜像拉取/启动/迁移命令，不能仅用dev:web代替发布验证。

初始化在验收中心“准备隔离运行”完成；CLI场景入口也负责同样的准备，两者调用同一业务API。准备后记录testRunId、accountId、namespace及Fixture/DataVersion；初始化业务本身是测试对象时不得预先完成被测动作。缺源/凭证/历史数据时显示缺项，不静默换成Fake并报真实场景通过。

### 8.3 Web逐步操作及预期结果

1. 登录上表实际Web地址，进入“开发验收中心→V2→V2.4”；检查页面版本、模拟模式、服务能力与固定输入。
2. 每个场景点击“准备隔离运行”，核对参数后记下testRunId；正常/异常/恢复使用独立运行，场景内部的重复或恢复操作继续使用原运行及业务幂等键。
3. 按下表执行。操作按钮为目标交互，交付时开发者必须换成实际页面名称/按钮及路由；预期必须从业务明细读取，不能只看“任务完成”。

| 场景ID（阶段内唯一） | 场景 | 点击顺序/输入 | 预期结果与核对点 |
|---|---|---|---|
| normal | Paper 执行链前置检查 | 选择“检查正常路径前置”，读取 TestRun 证据。 | 当前预期 `WAITING`；Mandate `PREPARATION_ONLY`，source/order/fill/reconciliation 均 `NOT_RUN`。不得启动真实观察或声称HOLD成交链通过。 |
| rejection | 拒绝链前置检查 | 选择“检查拒绝路径前置”。 | 当前预期 `WAITING`；尚未实际注入陈旧快照或重复事件，不能生成拒绝 PASS。 |
| recovery | 恢复链前置检查 | 选择“检查恢复路径前置”。 | 当前预期 `WAITING`；尚未制造断网/恢复并完成对账，不能生成恢复 PASS。 |

4. 从运行详情打开关联正式页面，执行一次刷新/关闭再打开；核对长任务后台状态、历史证据和加载/失败/陈旧提示。
5. 每项记录实际结果、截图与业务ID。异常场景“预期拒绝”被正确验证时断言可PASS，但被测业务操作仍显示拒绝；若意外接受则断言FAIL。

### 8.4 命令行复验与相同运行核对（已验证）

在项目根目录执行以下目标命令。stage/scenario必须匹配8.3定义；CLI与Web共用场景版本、Fixture和断言。每条命令执行后立即查看退出码，任何非零先保存错误再定位，不能继续假定本阶段通过。

```bash
pnpm verify:stage -- --stage V2.4 --scenario normal --seed 20260907
# 紧接上一命令执行；0表示全部场景断言通过
 echo $?
pnpm verify:stage -- --stage V2.4 --scenario rejection --seed 20260907
 echo $?
pnpm verify:stage -- --stage V2.4 --scenario recovery --seed 20260907
 echo $?
pnpm verify:stage -- --stage V2.4 --suite code
 echo $?
pnpm test:e2e -- --stage V2.4
 echo $?
```

此命令自建本机Vite、Platform API与Trade Execution临时进程，使用隔离`platform_api_test`和`trade_execution_test` PostgreSQL；无需连接活动API。浏览器创建的WAITING TestRun会由同一命令中的CLI `--check-only`复核。浏览器内Paper readiness卡片使用固定响应覆盖展示，Platform→Trade Execution真实HTTP/Bearer代理则由同一smoke的独立HTTP请求核对。

预期：各场景输出testRunId、实际数据/模型/券商模式、断言expected/actual及证据位置；预期内拒绝场景验证成功退出0，意外副作用/缺脚本/缺必需依赖/未满观察条件非零。恢复场景需外部动作时输出已核实目标和步骤，停留WAITING；完成动作后复验原run，不伪称Web可重启宿主。浏览器测试必须实际运行本阶段用例，零用例/全跳过不能退出0。

再对Web中已运行的同一testRunId执行只读核对，避免仅创建新样本掩盖页面问题：

```bash
# 粘贴Web运行详情中的实际testRunId，再按回车；这是普通ID，不是凭证
read -r acceptance_run_id
pnpm verify:stage -- --stage V2.4 --run "$acceptance_run_id" --check-only
 echo $?
pnpm evidence:export -- --run "$acceptance_run_id"
 echo $?
```

check-only仅查询此运行后端事实并追加检查证据，不创建新订单、不重放成交或发起模型调用；空ID/错误stage/越权run必须拒绝。导出只含脱敏数据，输出实际目录和Manifest Hash，不自动勾选人工验收。端到端正常/异常/恢复运行产生不同ID，导出时分别保存。

本阶段代码测试覆盖要求：调度/新鲜度/窗口规则、真实来源与FakeBroker集成、浏览器关闭、断网恢复、实际交易日观察。 在交付时把映射到的实际Domain/DB/契约/服务内测试命令补入本节，注明执行目录、测试文件或套件、退出码和报告；verify:stage必须展示实际调用的测试清单，不能空壳返回0。Python服务使用自身锁定环境，不串用其他服务虚拟环境。

调度接口复核：`GET /api/v1/acceptance/v2/v2.4/scheduler/status`、`POST /scheduler/start`、`POST /scheduler/tick`、`POST /scheduler/stop`；容器实测顺序 `STOPPED → RUNNING → Tick → STOPPED`，均保持 `PAPER + FAKE`。

### 8.5 交叉核对、失败定位与恢复

交叉核对：源observedAt/ingestedAt、信号/委托/快照/Fill时间、模拟资产及日终差异，与真实观察日历相互核对。

先检查Web与CLI的testRunId、输入/策略/代码版本和模式是否一致，再按Trace查平台、领域、适配器与持久化证据。页面错误而CLI正确，记录Web失败；二者都错则保留领域断言失败。缺能力先查健康/迁移/数据与日志，不修改余额或订单状态使断言通过。

独立复跑创建新run；测试幂等/检查点/重启恢复则使用原run和原幂等键。故障发生后保留旧证据，修复后新增运行或检查记录；不得清空账本、随机更换seed直到通过。真实观察窗口、来源验证和实际模型调用与加速/录制测试分别记录。

### 8.6 验收记录与收尾

| 场景/检查 | Web实际结果与截图 | 命令/退出码/报告 | testRunId/业务ID | 结论 |
|---|---|---|---|---|
| normal/rejection/recovery | 旧历史静态运行记录已保留，不能验证当前业务链；新 API 返回 WAITING | 当前门禁运行尚待真实API同run/CLI复验；旧命令与ID见上方历史记录 | 更正前历史ID保留于 `docs/evidence-v2.4.md` | 历史记录；当前范围 NOT_RUN |
| 当前代码套件 | 完整V2.4 code suite通过（契约、build/lint/typecheck、单测、PG/HTTP、Python Adapter与Ops） | `pnpm verify:stage -- --stage V2.4 --suite code`，本机授权环境退出0 | 761条Markdown链接；99 JSON/52 schema/34 fixture/7 OpenAPI组；Platform API 48单测、Qlib Worker 11单测 | PASS（代码） |
| Web页面回归 | 更新后NOT_CONNECTED/WAITING页面断言通过；使用本地Vite和模拟owner-scoped API响应 | `PLAYWRIGHT_BASE_URL=http://127.0.0.1:5173 pnpm --filter @stockquant/web exec playwright test tests/e2e/v11-acceptance.spec.ts -g 'V2.4 continuous paper page'`，1/1 | 仅页面回归，不是服务端业务验收 | PASS（UI回归）/ NOT_RUN（真实Web/API同run） |
| 用户人工验收 | 历史确认原样保留；当前修复范围未获新确认 | 不由脚本代签 | 原签署日期2026-09-11；此次新范围待确认 | NOT_RUN（当前范围） |

记录不适用子项的范围依据，不能将必需项改为不适用绕过门禁。归档后在[本版验收表](./99-acceptance.md)填写证据链接和结论。清理只针对本轮已结束的隔离运行，默认保留证据；停止测试不能删除数据库卷或取消无关任务。

P5.7当前工作树恢复复验（2026-09-27）：Trade Execution与Portfolio专用隔离PostgreSQL/HTTP重跑验证FakeBroker Outbox租约接管、旧fence迟到回调拒绝、服务重启后同一Fill幂等入账、UNKNOWN剩余资源保留及精确清理。TestRun与量化账本证据见[当前P5.7 HTTP恢复审计](../../../evidence/audits/2026-09-27-p5-7-current-http-recovery.md)。此测试不验证P5.5 Mandate/risk接线、正式策略授权、活动Paper连续性或人工验收。

P5治理拒绝零副作用补充（2026-09-27）：隔离HTTP/专用PG smoke证明，路由身份不符时不调用Governance；路由身份通过但Governance拒绝时，执行服务返回403且精确namespace中FakeBroker Order/Fill/Event/Outbox均为0。有效Governance stub路径只验证现有受治理历史FakeBroker边界。Trade Execution integration套件与42项单测通过。该结果不接通V2.4 SNAPSHOT/Mandate/risk/reservation业务链、不更改NOT_CONNECTED/WAITING或人工验收状态。详见[P5治理拒绝审计](../../../evidence/audits/2026-09-27-p5-governance-denial-no-side-effects.md)。

2026-09-27整版代码回归：`pnpm verify:stage -- --stage V2.4 --suite code`在隔离环境退出0；契约/Fixture及全仓静态检查、单测、Trade Execution与Portfolio HTTP/PG、Market Data PG 22项和导入HTTP smoke通过。治理拒绝零FakeBroker写入与P5.7恢复增量见[P5治理拒绝审计](../../../evidence/audits/2026-09-27-p5-governance-denial-no-side-effects.md)。此为代码级结果；当前Paper正常/拒绝/恢复业务run仍WAITING，Mandate策略未配置、观察和当前范围人工验收NOT_RUN。

V2.4真实Platform HTTP准备态 smoke（2026-09-27）：新增`v24:waiting-http-smoke`并纳入V2.4专属code suite。Platform API和真实Trade Execution进程分别连接隔离`platform_api_test`/`trade_execution_test`；会话认证后代理返回真实CN_A `BLOCKED`和US_EQUITY `REJECTED`，Platform Bearer透传，伪造Bearer 403，两个市场均明确risk/reservation `NOT_RUN`且下单关闭；FakeBroker Order/Fill/Event/Outbox均为0、无关下游请求0。normal/rejection/recovery持久TestRun均为`WAITING`；匿名创建401、异主创建/读取403；CLI `--check-only`对相同run回读WAITING/exit 2；Chromium与API/CLI同一运行检查通过，Web门禁面板仍用固定响应桩测试展示。随机运行记录精确清理，`activeServicesTouched=false`。`pnpm --filter @stockquant/platform-api-service v24:waiting-http-smoke`退出0。该smoke验证真实Platform→Trade Execution HTTP准备态代理，不证明Mandate、快照、FakeBroker业务交易链、20日观察或人工验收完成。首轮曾错误期望异主读取404，保留失败并已按实际403合同修正。

V2.4 TestRun接口合同（2026-09-27）：POST创建、GET按owner读取现有API已补严格JSON Schema、OpenAPI安全/状态码、兼容矩阵和Web生成类型。Web发送`scenarioId`/`seed`并类型化读取`WAITING`结果；完整V2.4 code suite在获准隔离环境退出0。异主403、匿名401、下游调用0；三类记录的精确Smoke及范围限制见[TestRun OpenAPI审计](../../../evidence/audits/2026-09-27-v24-run-openapi.md)。这仅核实准备态边界，不替代Paper业务链或Web/CLI同run验收。

2026-09-27同一运行CLI增补：V2.4隔离HTTP smoke现对每个已创建TestRun调用CLI `--run <UUID> --check-only`，回读相同UUID、状态`WAITING`并以退出码2保留未完成状态；不创建新运行、不触发下游服务。Web使用生成契约类型；页面测试仍是独立浏览器UI检查，本smoke不声称浏览器与CLI跨活动服务同run验收通过。详见[TestRun OpenAPI审计](../../../evidence/audits/2026-09-27-v24-run-openapi.md)。

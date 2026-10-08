# V2.4 真实时钟下持续模拟交易

状态：PARTIALLY_IMPLEMENTED。版本入口：[README](./README.md)。共同约束：[三版共同规则](../05-three-version-delivery.md)。

2026-09-27验收范围更新与2026-09-30 W1补充：旧静态PASS仍按[无伪造Paper证据审计](../../../evidence/audits/2026-09-27-v24-no-fabricated-paper-evidence.md)撤销。Fixture v2.0隔离链仅覆盖FIXTURE/PAPER/FAKE；Chromium正常/拒绝/恢复场景、CLI同Run、刷新、会话401错误/恢复、关闭重开及JSON下载均有记录。2026-10-02新增第四个独立外部订单差异场景，细节见当前[四场景Web/HTTP全栈审计](../../../evidence/audits/2026-10-02-v24-paper-smoke-912a971fa6374e339157f75bee08b5f6.json)与[Web TestRun报告](../../../evidence/audits/2026-10-02-v24-paper-web-e2e-bf8e8474-ce11-43c8-a9d4-ca2268c0c8a1.json)；外部差异的截图和API/Web TestRun均记录在内。隔离代理在API和Chromium recovery请求中确认响应丢失并按原clientOrderId恢复持久订单。活动Paper策略仍`PREPARATION_ONLY`，NO_TRADE/无来源授权、真实20日观察与当前范围人工验收未运行；历史运行与签署保留，不折抵新版验收。

2026-09-30 W3决策与只读页增量：项目所有者确认首个基线为`NO_TRADE`，并确认暂无线源授权；因此真实行情采集/策略读取/O2均未启用。新增正式状态概览`/paper`，仅读取Paper就绪、调度和日终观察汇总；页面明确显示来源未授权、数据年龄未读取、无活动账户/订单，并没有行情/启动/下单写入口。隔离Chromium断言没有写请求或行情请求。Platform 的 V2.4 观察器现由 `STOCKQUANT_V24_QUOTE_SOURCE_USE_APPROVED` 关闭报价读取（默认/Compose固定为`false`）；在没有来源授权时即使调度器触发，也记录`NOT_AUTHORIZED`/`NOT_CONNECTED`，不访问Tencent报价接口且不计有效观察日。该环境值不是合同许可或策略批准。此改动尚未部署到活动容器；页面/服务隔离测试不构成实时行情验证、活动策略、告警生命周期实现、20日观察或用户人工阶段验收；当前范围继续保持`PARTIALLY_IMPLEMENTED`。决策证据见[W3 Paper决定包](../../../evidence/audits/2026-09-30-w3-paper-decision-package.md)。

2026-09-30采样间隔一致性修复：`STOCKQUANT_V24_SAMPLING_INTERVAL_MINUTES` 默认30，仅接受20/30；停止状态下按配置更新，正在运行的调度沿用持久策略以保障恢复可复现。日质量检查从当日事件读取策略版本，要求全天一致、窗口完整且延迟在±60秒内。20分钟需14个窗口，30分钟需10个；旧事件仅在保留原30分钟标记时兼容。完整V2.4代码套件退出0；实现未部署到活动服务。当前无数据源授权，不会触发采集或增加观察天数，详见[策略实现与验证审计](../../../evidence/audits/2026-09-30-w3-sampling-interval-policy.md)。

2026-10-06调度恢复边界修复：恢复持久化`RUNNING`状态前拒绝非法采样间隔；定时器实际唤醒与排定时刻偏差超过60秒时改记`RECOVERY_CHECK`，不回放过期采样/执行/日终事件。假时钟/假定时器回归、Platform 202项单测及V2.4完整隔离代码套件通过；普通受限沙箱的loopback EPERM与受控重跑均留存。代码未部署，活动Paper/数据源/O2仍禁用。详见[W3调度修复审计](../../../evidence/audits/2026-10-06-w3-invalid-persisted-sampling-interval.md)、[成功完整套件日志](../../../evidence/audits/2026-10-06-w3-v24-code-suite.log)、[沙箱失败日志](../../../evidence/audits/2026-10-06-w3-v24-code-suite-sandbox-failure.log)及[历史执行快照 SHA-256](../../../evidence/audits/2026-10-06-w3-invalid-persisted-sampling-interval.sha256)。


## 1. 前置与范围

V2.1实际来源通过、V1.5调度恢复通过；历史分钟回放结果不等同实时成交证据。

本阶段所有订单、券商资产和成交均来自隔离模拟环境。真实业务数据库、Qlib或RD-Agent在声明“已验证”时必须真正执行；替身需独立标注。

## 2. 开发任务

2026-10-01工程维护记录：Trade Execution Fill Outbox交付已提取到application服务并以FakeBroker/Portfolio端口注入，HTTP组合根归入bootstrap。完整V2.4隔离代码套件exit 0；该工程回归不等于真实数据授权、活动Paper、人工验收或O2观察完成。证据：[Outbox应用边界审计](../../../evidence/audits/2026-10-01-w1-trade-execution-outbox-layer-increment.md)。

- [x] 固定未接通业务链时的准备态契约：Web/API 持久化 owner-scoped WAITING TestRun，OpenAPI 与生成类型一致，并用实际 Chromium→Vite→Platform API→隔离PostgreSQL→CLI `--check-only`核对同一ID；不调用下游或生成交易证据。详见[TestRun OpenAPI及Web/API/CLI同run审计](../../../evidence/audits/2026-09-27-v24-run-openapi.md)。
- [ ] 连接实际采样行情与FakeBroker，按已版本化日频信号/执行窗口自动调仓；使用SystemClock，保留数据年龄与成交假设。
- [ ] 定义独立SNAPSHOT模型：下单后首个符合新鲜度/会话政策的快照才可作为模拟成交输入；不补造两次采样之间触价记录，无可靠量数据不伪称参与率已验证。
- [x] 冻结V2.4 Paper执行政策的准备边界：日频信号、A股快照窗口、下单后首个新鲜快照、PAPER/FAKE及风险预留前置；契约明确标记 `PREPARATION_ONLY`，策略、Mandate、偏离、风险/费用版本和美股政策缺项保持阻断（准备工作完成，不等于策略可执行）。
- [x] 增加Platform会话代理与Web就绪显示，并实测内部每服务独立Bearer、匿名拒绝和零账本副作用：CN_A显示BLOCKED、US_EQUITY显示REJECTED，风险/资源预留仍NOT_RUN、订单提交关闭；浏览器显示由固定响应桩验证，真实HTTP代理/Bearer由隔离API smoke独立验证；不构成Paper执行验收。详见[P5.5 readiness审计](../../../evidence/audits/2026-09-27-p5-5-paper-readiness.md)。
- [x] 增加严格受限的Fixture v2.0治理授权及Paper快照执行接口，并在四个临时数据库/独立服务进程中验证正常、陈旧拒绝、真实丢弃接受响应后的原单恢复；金额、账本、资源预留、FakeBroker Fill/Outbox和CLI同run结果均核对。此项只覆盖隔离Fixture执行，不激活默认策略。详见[隔离Fixture Paper审计](../../../evidence/audits/2026-09-27-v24-isolated-fixture-paper.md)。
- [x] Web以可读摘要展示授权/风控、订单/成交、资金预留、现金/持仓、对账和Fixture限制；Chromium逐一运行normal/rejection/recovery，刷新/过期会话/关闭重开/原始JSON下载通过，每个Web TestRun均由CLI `--check-only`核对同ID，业务事实计数在CLI前后不变。实证及范围见[W1全栈审计](../../../evidence/audits/2026-09-30-v24-paper-smoke.json)和[Web步骤/业务结果](../../../evidence/audits/2026-09-30-v24-paper-web-e2e.json)。
- [x] 新增独立外部订单差异Fixture场景：沿Platform生成客户端注入FakeBroker独立订单，后端持久TestRun断言本地缺单差异，正式Web显示证据并由CLI同Run核验；TestRun `47a3acfd-bd1d-4c58-9bc5-42b916f228de`（API），`bf8e8474-ce11-43c8-a9d4-ca2268c0c8a1`（Web）。
- [x] 验证P-F05撤单确认与迟到/缺序号Fill的因果顺序，以及费用更正版本、重放幂等、持久投递屏障和原始Fill不可变；固定故障顺序在隔离PostgreSQL完整持久化测试中通过。[复验说明](../../../evidence/audits/2026-10-05-w2-trade-cancel-fill-race.md)
- [x] 持久化版本化SimulationExecutionPolicy，和未来LIVE策略分离；数据库约束只允许 `PREPARATION_ONLY/PAPER/FAKE/liveTradingEnabled=false`，同一版本不可改写，readiness仅从持久化策略只读加载。证据：[W3策略持久化审计](../../../evidence/audits/2026-10-02-w3-v24-simulation-policy-persistence.md)、[JSON](../../../evidence/audits/2026-10-02-w3-v24-simulation-policy-persistence.json)及[历史执行快照 SHA-256 Manifest](../../../evidence/audits/2026-10-02-w3-v24-simulation-policy-persistence.sha256)。后续共享Trade源码变更不回写该次执行清单。
- [ ] 行情陈旧/未知状态/账户过期时自动暂停相应模拟交易并显示原因；完整连续交易/日终告警生命周期仍未接通。
- [ ] 日终自动对账、告警去重、断网/睡眠恢复；错过窗口只重评，不集中补旧单。新闻默认展示，升级动作需独立批准的策略规则。
- [ ] 建立连续观察记录，建议A股20个实际交易日；观察期间可继续V2.5/V3独立工作，但观察门禁未满保持NOT_RUN，不用加速回放代替。

## 3. 同步 Web 开发

正式页：当前模式、采样/策略/执行下次时间、行情年龄、模拟订单/资产、日终对账和连续运行日历。验收页：断网、陈旧、重复调度、恢复。

验收中心路径：`/acceptance/v2/v2.4`。场景参数提交到后端TestRun编排接口，后端调用业务API并汇集证据。浏览器不直接写领域数据，不自行判定成交。包含正常、拒绝、恢复和独立外部订单差异Fixture场景；该差异场景使用隔离FakeBroker观察，不连接真实券商。

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

观察质量实现复核（2026-09-26，历史10窗政策）：日终计日按当时冻结窗口检查每个唯一采样时刻、±60秒延迟及逐证券集合覆盖、唯一性、`LIVE_SOURCE`状态和0～1800秒新鲜度。缺窗、重复、报价缺失/重复/多余、过期/未来报价或来源不完整时不计新观察日；既有正式Finalization不批量重写。当前20/30分钟版本策略见本文件顶部的2026-09-30增量记录。详见[观察质量审计](../../../evidence/audits/2026-09-26-v24-observation-quality.md)。
Mandate准备（2026-09-25）：新增 `v24-paper-mandate-v1` 准备契约与固定输入，明确授权必须绑定owner、账户、namespace、testRun、精确策略和证券范围，包含订单/总敞口/日换手限额、有效期及批准证据。当前所有字段均为UNSET/空值，readiness恒为BLOCKED；无授权创建或订单路径，美股拒绝。

服务身份复核（2026-09-25）：项目所有者确认每服务独立Bearer Token后，trade execution执行/撤单等路由绑定平台与回放身份，decision governance将授权申请和消费拆分为回放/执行身份，回放Worker入站由平台身份控制，quant research限制回放身份只调用multi-bar。trade execution在专用`trade_execution_test`运行真实HTTP鉴权smoke并通过；治理/回放/量化路由策略单测、构建及Compose静态配置通过，活动容器未更新。随后完整V2.4 code suite退出0；不改变当前Mandate BLOCKED和20日观察门禁。细节见[服务间Bearer边界审计](../../../evidence/audits/2026-09-25-p5-service-bearer-boundary.md)。

观察 TestRun 的日终完成只能从对应日期 namespace 的非终态更新；相同结果重试保持幂等。若质量复核发现已完成日存在错误，失效前的状态、断言和证据追加保存到 `acceptance_stage_run_revisions`，当前记录标记 `FAILED`，不得静默覆盖原结论。观察运行列表与修订记录均通过 owner-scoped API 提供，并可在 V2.4 验收页按观察运行查看旧结论、断言和证据。隔离 PostgreSQL、API 单元、Web 构建、API/Web 容器构建部署、服务端权限和容器化页面用例已验证；生产观察库当前没有可展示的修订记录，正式业务观察状态和人工验收状态不因此改变。

同一TestRun真实Web/API/隔离PostgreSQL/CLI核对补充（2026-09-25）：在`platform_api_test`生成随机观察运行与延迟质量错误，数据库迁移保留原结论后，V2.4页面通过真实API代理展示该修订；同一run由CLI `--check-only`只读核对，因修订后TestRun保留为FAILED而预期退出1。临时进程链与容器化Web/API链均已通过Playwright验证；后者使用独立Docker network、随机命名临时镜像和专用测试库。两者均精确清理临时记录，容器smoke已核实无遗留容器/网络/镜像，正式观察计数及自动任务不变。数据库直接格式化纯日期并有隔离PG精确日期断言。最新容器复验 TestRun `72dc7006-e8bd-4d26-bc6e-3252d1c0ee2f`，观察日期`2098-04-09`，修订数1，Web/API/数据库/同run CLI PASS；CLI因预期FAILED退出1。自然生成的正式修订记录仍等待实际事件，工程smoke不增加20日计数或人工验收。详见[P3.12修订历史审计](../../../evidence/audits/2026-09-25-p3-12-v24-observation-history.md)。

自动验证：调度/新鲜度/窗口规则、真实来源与FakeBroker集成、浏览器关闭、断网恢复、实际交易日观察。

需求/测试追踪：MON、OPS、EXE-03/06、AUT模拟子项；T16/17/24/30/38/48/50/53/54模拟子项；DV-05、VT05。

退出条件：开发任务完成、Web真实可操作、全部适用检查PASS、人工签署、已知限制写入证据。填写[本版验收表](./99-acceptance.md)，未完成项不得勾选通过。

## 7. 阶段交付待办（完成后勾选）

2026-10-03调度健康状态工程增量：源码将`nextPollAt`（后台下一次轮询）与`nextExecutionAt`（计划器下一采集窗口）分开输出，避免休市/无待采集窗口时把轮询时间空值误读成调度停止；隔离单测覆盖启停及两类时间独立性，Market Data服务全量单测71项、typecheck通过。此代码未部署到活动服务，不改变无来源授权、NO_TRADE或观察结论；`nextPollAt`不是采集授权，也不能计入观察。W0原始点保留为历史快照；最新工作树边界见计划记录的2026-10-03 W0报告。
2026-10-03 W3调度字段更新后的V2.4完整代码suite复验：受控loopback环境完整`pnpm verify:stage -- --stage V2.4 --suite code`退出0；Market Data 18文件/71单测、相关隔离PostgreSQL/HTTP、四个API和四个Web场景、同run CLI检查、linux/arm64 readiness通过。默认沙箱Qlib Worker loopback EPERM失败被保留；隔离PG快照在清理前导出，活动服务未触碰、行情/Provider调用0。此次仅为Fixture/PAPER/FAKE链回归，不代表活动行情或阶段人工验收。完整结果与TestRun IDs见[审计报告](../../../evidence/audits/2026-10-03-w3-scheduler-poll-and-v24-code-suite.md)和[机器结果](../../../evidence/audits/2026-10-03-w3-scheduler-poll-and-v24-code-suite.json)。当时源码SHA清单文件仍保留在`evidence/audits/2026-10-03-w3-scheduler-poll-and-v24-code-suite.sha256`供历史复核；由于本次后续修改了所列源文件，该清单属于旧源码快照，不再作为当前源码Hash门禁。

以下勾选只记录本阶段交付进度，不能代替第2节逐项开发任务或版本验收结论。开发者凭实现/实测证据勾选开发项；“人工验收”仅在用户实际确认后勾选，不预填PASS。

- [x] 契约、数据结构、场景定义和预期结果已冻结。
- [x] 当前未连接业务链的持久WAITING准备态接口、严格OpenAPI/Schema/生成类型及真实Web→API→隔离PostgreSQL→CLI同run检查已通过；另有隔离Fixture交易链正常场景同run实测，二者均不代表V2.4整体验收。
- [ ] 第2节全部后端业务任务完成。隔离Fixture一次性执行纵切已实测；实际采样、活动策略、持续自动调仓、SystemClock交易窗、日终自动对账/告警、来源故障管理与20日观察仍未完成。
- [x] 正式Web验收页normal/rejection/recovery三个隔离Fixture场景均经Chromium按钮运行；每个Web TestRun由CLI `--check-only`核对同一ID，刷新后从本地保存ID回读。只覆盖冻结Fixture链，不代表活动Paper验收。
- [x] 独立外部订单差异场景在正式Web上展示`EXTERNAL_ORDER_MISSING_LOCALLY`证据并通过Web TestRun同ID CLI只读复验；全套证据见[2026-10-02 Smoke](../../../evidence/audits/2026-10-02-v24-paper-smoke-912a971fa6374e339157f75bee08b5f6.json)。
- [x] 2026-10-05重新通过完整V2.4代码套件；API normal/rejection/recovery/external-reconciliation四场景、四个Web场景及同Run CLI核验通过，含P-F05持久化竞态/费用更正和隔离容器清理。[套件审计](../../../evidence/audits/2026-10-05-w2-v24-code-suite.md)、[机器摘要](../../../evidence/audits/2026-10-05-v24-paper-smoke-9cb5834e8c3e4b318a95e6791623f836.json)、[历史执行快照 Hash 清单](../../../evidence/audits/2026-10-05-w2-v24-code-suite.sha256)。后续共享Trade源码变更不回写该次执行清单。本项为自动隔离回归，不代表实时Paper、来源授权、观察或人工验收。
- [x] 2026-10-02完成NO_TRADE暂停原因纵切：执行窗口观察记录将`PAUSED`及原因写入持久化`evidence.executionGate`；非执行窗口的同日更新不覆盖该字段；未授权来源、陈旧/断连/未知来源、未确认交易日均有固定原因；`/paper`只读展示最近执行窗口暂停原因。无活动Paper账户时仍报告`NO_ACTIVE_PAPER_ACCOUNT_OR_APPROVED_MANDATE`，不冒充账户过期检测；没有来源授权时不发行情请求、不下单、不启用调度。Platform 166项单测、lint、Web typecheck/build、目标Chromium验收1/1及完整`pnpm verify:stage -- --stage V2.4 --suite code`均通过（最终隔离烟测报告[7e9678ab](../../../evidence/audits/2026-10-02-v24-paper-smoke-7e9678ab95964a26a97eb5915d929e31.json)）。该轮同时修正P5.7隔离PG探针：通过容器TCP查询确保连接官方镜像初始化结束后的正式PostgreSQL服务；P5.7与完整suite均通过并清理临时资源。真实PG合并断言和失败根因见[W3持久暂停门禁审计](../../../evidence/audits/2026-10-03-w3-persisted-execution-gate.md)。真实PostgreSQL执行门禁合并回归和完整suite最终复验详见[W3持久暂停门禁审计](../../../evidence/audits/2026-10-03-w3-persisted-execution-gate.md)；本轮W9门禁仍为INCOMPLETE且证据完整性通过，见[W9复核](../../../evidence/audits/2026-10-03-w9-version-gates-after-w3.md)。此项仅证明执行门禁记录/展示，不等于活动源授权、过期账户管理或W3业务链完成。
- [x] W0当前工作树快照覆盖上述变更、最终隔离suite报告与测试输出边界；历史点保留。最新报告见[计划中的W0引用](../../plans/2026-09-30-complete-delivery-plan.md)。本快照是点时边界，不代表W3阶段验收或O2开始。
- [x] W1隔离Fixture三场景操作手册步骤、输入、命令、超时、预期结果和临时数据库清理均经全量smoke实际执行；证据为[W1 Web E2E报告](../../../evidence/audits/2026-09-30-v24-paper-web-e2e.json)、[全栈烟测报告](../../../evidence/audits/2026-09-30-v24-paper-smoke.json)及三张场景截图。全阶段其它运行手册仍含真实部署/观察前置，不表示V2.4整体手册或阶段已验收。
- [x] 隔离 Fixture 正常/拒绝/响应丢失恢复API场景及CLI同run检查已有临时数据库证据；此项不替代Web验收、服务重启/重复Fill/Portfolio丢响应矩阵或连续观察。见[隔离Fixture Paper审计](../../../evidence/audits/2026-09-27-v24-isolated-fixture-paper.md)。
- [x] 已保存隔离Fixture正常/拒绝/恢复API证据及三条Web/API/CLI同run浏览器证据；CLI检查前后账本、持仓、预留、FakeBroker订单/Fill/Outbox数量一致。阶段其余业务/观察条件仍未完成，旧执行记录保留为历史。
- [x] 2026-10-01在本轮 Platform Governance授权创建与Portfolio账户初始化改接生成客户端、Trade Governance授权验证生成客户端后，重跑完整 `pnpm verify:stage -- --stage V2.4 --suite code`退出0；含全仓build/lint/typecheck/unit、服务Bearer与隔离PG、63项Market Data Adapter测试、Ops、HTTP/Chromium normal/rejection/recovery及Web TestRun同ID CLI `--check-only`。响应丢失恢复按原clientOrderId查单，报告确认随机四库已清理且`activeServicesTouched=false`。详见[本轮完整回归审计](../../../evidence/audits/2026-10-01-w1-v24-client-regression.md)及[SHA-256](../../../evidence/audits/2026-10-01-w1-v24-client-regression.sha256)。此为隔离Fixture工程验证，不改写来源未授权、NO_TRADE、20日观察、活动Paper及人工验收状态。
- [x] 2026-10-01补齐Platform→Trade Execution只读Paper readiness生成客户端后再次运行V2.4完整code suite，最终退出0；HTTP与容器ready合同、CN `BLOCKED` / US `REJECTED`、Paper三场景及CLI同run均通过。readiness只读且下单关闭，详见[客户端审计](../../../evidence/audits/2026-10-01-w1-platform-paper-readiness-client.md)。
- [x] 2026-10-01补齐Platform→Trade Execution执行提交及原订单查询生成客户端，完整V2.4 code suite再次退出0；API/Web normal、rejection、recovery与同run CLI检查通过，恢复真实丢弃首次接受响应并按原clientOrderId查回持久订单；linux/arm64 readiness PASS，四个临时库精确清理，`activeServicesTouched=false`。详见[执行客户端与本次完整回归审计](../../../evidence/audits/2026-10-01-w1-v24-client-regression.md)。
- [x] 同轮将缺失的FakeBroker namespace reconciliation summary补入Trade Execution OpenAPI并生成Platform客户端，V2.4三个Trade Execution调用均走契约客户端；contracts:check及完整V2.4 code suite通过，latest smoke及RUN IDs记录于[完整回归审计](../../../evidence/audits/2026-10-01-w1-v24-client-regression.md)。
- [x] 2026-10-01将V2.4观察器交易日历、受授权报价和Trade Execution对账读取收敛到生成客户端；quote仅在来源授权、引用与版本齐备后调用。加入QuotePreview Schema/OpenAPI与客户端漂移检查，完整V2.4 code suite通过。无实际行情请求、无订阅启动、不增加O1/O2日数。见[观察客户端审计](../../../evidence/audits/2026-10-01-w1-v24-observation-clients.md)。
- [ ] 当前交易链重复/恢复验证和适用观察门禁完成。旧V2.4数据库`8/20`（2026-09-15～18、21～24）及DC-08A `5/20`计数保留作历史记录，不折抵尚未接通的新Paper链门禁。
- [ ] 用户已对当前Paper实现范围完成人工验收；2026-09-11原签署保留为历史，不代表对2026-09-27后更正范围的确认。
- [x] 操作说明与限制已更新，[本版验收表](./99-acceptance.md)已同步。

## 8. 阶段验收操作手册

### 8.1 当前可执行性与验收准备

手册状态：W1隔离Fixture三场景范围`VERIFIED_EXECUTABLE`；V2.4完整阶段仍为`PARTIALLY_IMPLEMENTED`，正式Paper/实时观察/当前范围人工验收未完成。W1验证不证明OD-007活动策略、真实行情、故障矩阵或20个交易日门禁。

前置服务：实际来源采集、SystemClock调度、FakeBroker/核心链路、日终对账和告警。

固定输入：≤100只实际在线池、固定日频策略与模拟Mandate、SNAPSHOT及已冻结新鲜度政策，实际交易日观察20日。

| 开发交付时必须填写 | 当前值 |
|---|---|
| 实测代码Commit或工作区Hash/验证日期 | HEAD `3fdf2c9c693e1bc013601926865634a49a625ff4` + 未提交工作树；W1运行Hash见[W0基线](../../../evidence/audits/2026-09-30-w0-baseline.md)和[全栈报告](../../../evidence/audits/2026-09-30-v24-paper-smoke.json)，2026-09-30 |
| 项目根目录、Node/pnpm/Python/uv及Docker版本 | `/Users/huangbosong/Documents/ChatGPT/StockQuant`；Node `v24.1.0`；pnpm `10.34.5`；Docker Compose 容器化 |
| Web基础URL/身份登录或会话建立方式 | `http://127.0.0.1:8080`；本地验收身份 `acceptance-owner-1`；不记录密码/token |
| 本阶段Web路由 | `/acceptance/v2/v2.4`（目标） |
| 正式页面的真实入口/跳转链接 | `http://127.0.0.1:8080/acceptance/v2/v2.4` |
| Fixture文件/数据版本/确切日期/Hash、规则与成本版本 | 隔离交易输入 `fixtures/v2/v2.4/paper-execution-v2/v24-paper-execution-scenario-v2.json` v2.0.0；SHA-256 `713d6d152d7499c291a475194a0404c93cafa3a6faa6dbdff7ef87a477432821`；FIXTURE/PAPER/FAKE，100股×10元，费用5元；策略/政策/Mandate均为不可复用的测试版本，流动性参与率NOT_VERIFIED |
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

1. 登录上表Web地址，进入“开发验收中心→V2→V2.4”；检查页面版本、默认策略准备态和冻结隔离Fixture说明。
2. 完整默认命令启动真实临时服务/数据库并含Chromium/Web验收；正常Web TestRun与CLI同run已通过。`V24_PAPER_SMOKE_SKIP_WEB=true`仅用于后端诊断，不能作为Web验收结论。
3. 分别点击正常、拒绝、恢复和外部订单差异场景；查看业务摘要中的授权/风控、订单成交、资金预留、现金/持仓、对账和断言。每个Web TestRun均由CLI `--check-only`复核，并刷新页面确认同一TestRun恢复显示。

| 场景ID（阶段内唯一） | 场景 | 点击顺序/输入 | 预期结果与核对点 |
|---|---|---|---|
| normal | 隔离Fixture Paper正常执行 | Web点击“运行隔离Paper正常场景”；截图[normal](../../../evidence/audits/2026-09-30-v24-paper-web-normal.png)。 | 8项PASS：成交100股×10元、费5元，现金8995元、持仓100股、预留CAPTURED、Outbox DELIVERED、对账无挂起。 |
| rejection | 陈旧快照治理拒绝 | Web点击“运行隔离Paper拒绝场景”；截图[rejection](../../../evidence/audits/2026-09-30-v24-paper-web-rejection.png)。 | Governance以422拒绝；初始账目保留，订单/Fill/待投递Outbox为0；3项PASS。 |
| recovery | 接受响应丢失恢复 | Web点击“运行隔离Paper恢复场景”；截图[recovery](../../../evidence/audits/2026-09-30-v24-paper-web-recovery.png)。 | Web recovery分支按原订单身份回读持久化订单；同批API smoke由代理确认实际丢弃Trade Execution接受响应，账本/对账正确。二者均由CLI同run只读校验。 |
| external-reconciliation | 独立外部订单差异 | Web点击“运行外部订单差异场景”；固定输入由隔离FakeBroker观察生成，并记录在TestRun证据；截图[本轮场景](../../../evidence/audits/2026-10-02-v24-paper-web-external-reconciliation-bf8e8474-ce11-43c8-a9d4-ca2268c0c8a1.png)。 | 本地订单/Fill/账本仍为正常执行结果；独立外部事实产生1条`EXTERNAL_ORDER_MISSING_LOCALLY`，含外部ID与证据引用，Web明细可见；同Run CLI `--check-only`全部断言通过。 |

4. 从运行详情打开关联正式页面，执行一次刷新/关闭再打开；核对长任务后台状态、历史证据和加载/失败/陈旧提示。
5. 每项记录实际结果、截图与业务ID。异常场景“预期拒绝”被正确验证时断言可PASS，但被测业务操作仍显示拒绝；若意外接受则断言FAIL。

### 8.4 命令行复验与相同运行核对（已验证）

在项目根目录执行以下目标命令。stage/scenario必须匹配8.3定义；CLI与Web共用场景版本、Fixture和断言。每条命令执行后立即查看退出码，任何非零先保存错误再定位，不能继续假定本阶段通过。

```bash
# 已执行通过：真实隔离服务/临时数据库normal、rejection、response-loss recovery + CLI check-only。
# 该环境变量只跳过浏览器步骤；不能用作Web/API/CLI验收结论。
V24_PAPER_SMOKE_SKIP_WEB=true pnpm --filter @stockquant/platform-api-service v24:paper-http-smoke
echo $?

# 完整W1隔离Fixture交付命令（当前全链路复验通过）：
pnpm --filter @stockquant/platform-api-service v24:paper-http-smoke
# 退出0且摘要包含Web TestRun同run的CLI退出0。
# 另保存每场景业务摘要/步骤、截图；CLI前后业务计数需相等。

pnpm verify:stage -- --stage V2.4 --scenario normal --seed 20260907
# 紧接上一命令执行；0表示全部场景断言通过
 echo $?
pnpm verify:stage -- --stage V2.4 --scenario rejection --seed 20260907
 echo $?
pnpm verify:stage -- --stage V2.4 --scenario recovery --seed 20260907
 echo $?
pnpm verify:stage -- --stage V2.4 --scenario external-reconciliation --seed 20260907
 echo $?
pnpm verify:stage -- --stage V2.4 --suite code
 echo $?
pnpm test:e2e -- --stage V2.4
 echo $?
```

此命令自建本机Vite、Platform API及所需隔离服务/数据库；无需连接活动API。浏览器创建的COMPLETED TestRun会由同一命令中的CLI `--check-only`复核。浏览器内Paper readiness卡片使用固定响应覆盖展示，Platform→Trade Execution真实HTTP/Bearer链由隔离服务执行并核对。Smoke报告和截图使用日期加TestRun/随机run后缀写入`evidence/audits/`，避免覆盖历史文件；完整套件本轮退出0。

预期：各场景输出testRunId、实际数据/模型/券商模式、断言expected/actual及证据位置；预期内拒绝场景验证成功退出0，意外副作用/缺脚本/缺必需依赖/未满观察条件非零。恢复场景需外部动作时输出已核实目标和步骤，停留WAITING；完成动作后复验原run，不伪称Web可重启宿主。浏览器测试必须实际运行本阶段用例，零用例/全跳过不能退出0。

W1命令具体执行 Platform/Governance/Portfolio/Trade Execution 隔离进程、随机命名本地 PostgreSQL 数据库、容器化Web和Chromium；只删除本次创建的四个`sq_v24_paper_*`临时数据库、随机Web容器和对应镜像。全量命令须由本机`127.0.0.1:5433/postgres`测试管理员和本地Docker可用，并设置Playwright Chromium环境；运行超时由烟测脚本限制。结果写入`evidence/audits/2026-09-30-v24-paper-smoke.json`、`2026-09-30-v24-paper-web-e2e.json`与三张PNG；每份PostgreSQL业务快照仅在临时库删除前保存，数据库事实不会保留作生产历史。CLI只读前后数目不变证明列于smoke JSON。API与Chromium recovery均经隔离代理实际丢弃Trade Execution接受响应并查询原订单；浏览器报告记录注入顺序与恢复TestRun。

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

2026-10-01门禁状态：用户确认只读`NO_TRADE`基线且无市场来源授权。行情/新闻请求与分钟采集均由Market Data按用途授权配置 fail-closed；不能因服务Bearer、历史快照或Fixture验证推定可启动采集或Paper观察。新的20日观察须等待授权和显式观察基线重启；已有8/20是历史记录，不自动续计。

2026-10-02 P-F05部分Fill撤单实现复核：FakeBroker撤单请求在行锁事务中原子写入`CANCEL_REQUESTED`状态/事件，重复或并发请求不制造终态确认；隔离PostgreSQL回归验证原部分成交、Outbox与原clientOrderId重连重放均保留，V2.4正常/拒绝/恢复Browser TestRun与同Run CLI复验退出0。撤单权威接受/拒绝、实收Fill与撤单竞态、剩余reservation结算、费用修订以及模拟外部委托仍NOT_RUN，P-F05与V2.4保持未完成。见[W2审计](../../../evidence/audits/2026-10-02-w2-fakebroker-partial-cancel-idempotency.md)（对应SHA清单保留为该次运行的历史点时快照）。

2026-10-02 P-F05独立模拟外部委托对账正式Web纵切完成：Platform生成客户端写入独立FakeBroker外部订单事实，对本地订单/Fill/账本不作伪写；V2.4外部差异场景持久保存`externalOnlyOrderCount=1`与`EXTERNAL_ORDER_MISSING_LOCALLY`及证据引用。API TestRun `47a3acfd-bd1d-4c58-9bc5-42b916f228de`、Web TestRun `bf8e8474-ce11-43c8-a9d4-ca2268c0c8a1`均同Run CLI `--check-only`退出0；Chromium展示差异明细。完整四场景全套退出0、四库快照导出后清理、activeServicesTouched=false，报告见[本轮全栈审计](../../../evidence/audits/2026-10-02-v24-paper-smoke-912a971fa6374e339157f75bee08b5f6.json)和[Web审计](../../../evidence/audits/2026-10-02-v24-paper-web-e2e-bf8e8474-ce11-43c8-a9d4-ca2268c0c8a1.json)。这关闭P-F05独立模拟外部单/正式Web差异的工程与自动验收子项，不代表真实券商协议或人工业务签收；W2中其余范围、20日观察和V2.4用户验收仍待完成。


2026-10-02 P-F05费用更正跨服务闭环：Trade平台Bearer路由创建版本化FakeBroker费用修订并经耐久Outbox调用Portfolio；顺序屏障阻止前一版本未交付时继续修订，补偿按事件类型处理。Trade隔离PG覆盖revision连续、前值校验、相同请求幂等/异载荷冲突、领取和确认，原始Fill费用在当前费用更改后仍用于重连重放。扩展P5.7隔离双服务HTTP/PG场景PASS：TestRun `72cf8f97-7df5-4be4-a1f0-9b6981321213`，费用更正正常投递、重复请求幂等、Replay身份403；Portfolio现金8996.9990、FEE_CORRECTION总账3条、BUY捕获额1003.0010，原始费用1.0010保留、当前费用2.0010。Trade 62单测、typecheck、合同检查和专用临时PostgreSQL集成通过；活动服务未触碰。仅关闭费用更正数据链，P-F05的成交/撤单真实因果竞态及独立外部FakeBroker委托仍NOT_RUN；Paper及V2.4验收未完成。见[W2跨服务费用更正审计](../../../evidence/audits/2026-10-02-w2-fee-correction-outbox.md)（SHA清单作为该次执行的历史点时快照留存）。

2026-10-02 P-F05隔离测试入口复核（当时点状态，后续状态见下段）：活动`stockquant-v12-postgres-1`占用5433，因此Trade `test:p5-7`现拒绝共享Compose测试库，改用随机loopback端口、受限tmpfs PostgreSQL及仅本次专用的无masquerade网络；容器身份/网络/映射由Docker Inspect校验。跨服务Smoke TestRun `aa03498b-03b7-4d67-8fca-7ba5ee70e65d`通过，覆盖`CANCEL_REQUESTED`期间追加部分Fill、撤单接受及Fill Outbox全部交付后释放剩余reservation，也覆盖费用更正、外部订单差异、重启重试和租约fencing。Harness源码与执行边界见[W2隔离审计](../../../evidence/audits/2026-10-02-w2-isolated-p57-harness.md)。此处原始点时SHA清单及总计划历史链接保留；下一记录更新了完整套件与因果序号验证状态。

2026-10-02 P-F05因果序号及完整回归状态更新：上一段保留的是当时点时状态。现已修复共享入口，V2.4整套PostgreSQL测试均走受限临时loopback容器；启动器等待最终数据库稳定可执行SQL后再建测试库。ADR-0008序号协议现已接入Fill/撤单HTTP和持久仓储，缺号事件重启后仍缓冲，连续序号到齐后顺序归约。隔离持久化测试、P5.7跨服务HTTP/PG TestRun `d81e4df7-190a-4005-8ff1-a4e8ea479174`及完整V2.4 code suite均通过，API/Web/CLI四场景证据和限制见[事件顺序实现审计](../../../evidence/audits/2026-10-02-w2-fakebroker-event-ordering-implementation.md)及[最新V2.4报告](../../../evidence/audits/2026-10-02-v24-paper-smoke-67ce2137fd464458a5335a075d00dc6d.json)。仅证明FakeBroker模拟协议；仍不代表真实券商、数据授权、NO_TRADE解除、观察或人工验收。

2026-10-03 P-F05 ADR-0008因果序号实现复核：当前代码已将Fill与撤单权威结果统一纳入逐单序号inbox/cursor及事务归并；序号2撤单先到会在Trade重启后仍保持缓冲，序号1 Fill到达才按序归并至2，期间不改变订单/Reservation；重复回放幂等，冲突载荷拒绝，Fill投递屏障后才释放剩余资源。完整`pnpm verify:stage -- --stage V2.4 --suite code`退出0；隔离P5.7 TestRun `5b5cabfe-8965-4106-8980-109a71c1e112`报告缺口存活、累计75/增量25、终态CANCELLED及精确现金/预留。完整Suite/API/Web/CLI与限制见[W2事件顺序审计](../../../evidence/audits/2026-10-03-w2-fakebroker-event-sequence-full-v24-suite.md)及[机器报告](../../../evidence/audits/2026-10-03-w2-fakebroker-event-sequence-full-v24-suite.json)。此前“尚未实现事件顺序”的记录是历史状态，现由本记录更新。此处只验证FakeBroker合同；真实券商协议、NO_TRADE/来源授权、O1/O2、V2.4业务人工签署与Ubuntu仍未完成。


2026-10-03 V2.4当前工作树整版回归：完整`pnpm verify:stage -- --stage V2.4 --suite code`退出0；normal/rejection/recovery/external-reconciliation四个Paper Fixture API TestRun与四个Web TestRun均成功并完成同Run CLI核验，响应丢失恢复通过。各服务当前单测、隔离PG/HTTP和容器readiness通过。容器保持LIVE/下单关闭、FakeBroker记录0，活动服务未触碰；无真实券商或行情Provider调用。该复验不改变NO_TRADE/无来源授权、20日观察及人工验收未完成状态。见[W2审计](../../../evidence/audits/2026-10-03-w2-v24-current-worktree-rerun.md)、[机器报告](../../../evidence/audits/2026-10-03-w2-v24-current-worktree-rerun.json)、[原始日志](../../../evidence/audits/2026-10-03-w2-v24-current-worktree-rerun.log)。

2026-10-03告警实现增量（部分）：Market Data已有PostgreSQL告警Incident去重、确认、成功恢复关闭/再次异常新建，且API要求Platform独立Bearer。隔离PostgreSQL覆盖生命周期；开启/恢复仅进本地outbox，尚无实际通知发送或日终交易对账接线。该增量不关闭本节告警/连续Paper任务，阶段继续未完成。证据见[W3告警生命周期审计](../../../evidence/audits/2026-10-03-w3-alert-incident-lifecycle.md)。

2026-10-03告警UI/平台代理增量：V2.4 `/paper`现显示活动告警的严重级别、告警码、状态和发生时间；用户显式确认时Platform从登录Cookie绑定确认人，并经独立服务Bearer调用Market Data。除Mock页面回归外，V2.4隔离HTTP/Chromium Harness现启动临时Market Data PostgreSQL/服务与真实Platform API，浏览器读取并确认隔离库中的告警，随后核对确认状态和登录Cookie用户持久化一致；执行器/调度器关闭，行情请求0。该界面不会采集、调度或下单。通知仍只进本地outbox，真实通知尚未部署；完整日终对账、真实来源与持续观察仍未完成。审计：[隔离集成结果](../../../evidence/audits/2026-10-03-v24-paper-smoke-alert-integration-bd05a5f4f8464a03aeccc172bc3f1ead.json)、[SHA-256](../../../evidence/audits/2026-10-03-w3-alert-browser-integration.sha256)。

2026-10-03告警页面定向E2E复验：明确指定`tests/e2e/v24-paper-overview.spec.ts`并单worker执行，1/1通过，覆盖PREPARATION_ONLY/无行情写操作及显式确认告警；Mock模式保留为轻量UI回归。真实跨服务确认另由上述V2.4隔离Harness覆盖。初次包脚本参数错误导致Playwright意外发现全仓37项E2E，其中9项失败、27项通过、1项跳过；失败包含隔离V1.1/V1.2/V1.4/V2.3依赖与V2.4测试所需环境变量缺失。该错误命令不作为全套验收结果；需要隔离Harness时按各阶段`verify:stage`入口执行。

2026-10-03 V2.4完整当前工作树`verify:stage -- --stage V2.4 --suite code`退出0。包括全仓baseline、隔离FakeBroker P5.7 Outbox/恢复/费用修订/撤单竞态/外部委托对账、Market Data PostgreSQL 24/24、观察持久化、FakeBroker readiness及Paper normal/rejection/recovery/external-reconciliation API/Web/同Run CLI。此次同时执行真实告警UI浏览器集成：独立Market Data服务/第五测试库中预置Incident，Chromium通过Platform Bearer代理读取并确认，隔离DB复核确认人为同一登录Cookie用户，Incident=`0c962f50-0658-45b1-81c6-dde4232a3ef5`。行情请求0、采集/调度关闭，全部隔离库导出后清理，`activeServicesTouched=false`。详见[完整机器审计](../../../evidence/audits/2026-10-03-v24-paper-smoke-ce6b0c6569f74286889aff48e622d63c.json)及[SHA-256](../../../evidence/audits/2026-10-03-v24-paper-smoke-ce6b0c6569f74286889aff48e622d63c.sha256)。自动套件不代表真实行情授权、20日O2、活动部署或新增范围人工验收完成，V2.4继续未完成。

2026-10-03调度恢复缺口修正：恢复观察现在按实际20/30分钟计划槽检测上次采样之后的漏采窗口，正确跳过午休，计划触发本身不误判为已经错过；增加20分钟间隔、触发边界、午休和跨日单测，并验证未授权恢复会持久化“不回补”动作且不请求报价。Platform API单测180/180、类型检查通过，完整V2.4 code suite受控隔离运行退出0。修正只验证确定性Fixture/测试链，不启动活动调度器或行情源；活动镜像尚未部署，O2依然暂停，无法因本次代码回归增加观察日。见[W3历史执行快照SHA清单](../../../evidence/audits/2026-10-03-w3-recovery-slot-gap.sha256)及[完整套件机器报告](../../../evidence/audits/2026-10-03-v24-paper-smoke-7d00ac436e5a46458f26f27ef3833f52.json)。

2026-10-03调度器来源授权门禁补强：现场readiness曾出现Scheduler/Executor ENABLED而启用订阅为0；审查源码发现Scheduler创建条件未校验来源授权。现在Scheduler与Executor均须通过同一精确分钟源授权门禁；隔离V2.4 Harness故意将两worker开关置1且授权为false，实际readiness确认Source NOT_AUTHORIZED、Scheduler/Executor均DISABLED。完整V2.4 code suite通过，来源请求/Provider调用0，活动服务未连接，临时DB/网络/Web资源清理通过。未部署活动镜像、不增加O1/O2观察日；详见[W3调度授权审计](../../../evidence/audits/2026-10-03-w3-scheduler-authorization-gate.md)、[机器结果](../../../evidence/audits/2026-10-03-w3-scheduler-authorization-gate.json)及[源码/执行SHA-256](../../../evidence/audits/2026-10-03-w3-scheduler-authorization-gate.sha256)。

2026-10-05 W9/V2.4历史TestRun导出恢复：从2026-10-02隔离PostgreSQL快照恢复精确Platform记录`bf8e8474-ce11-43c8-a9d4-ca2268c0c8a1`，并与同Run Web E2E/CLI `--check-only`报告、四个服务快照及截图交叉核验。九条期望/实际断言保持PASS；没有run级人工验收记录，因此`humanAcceptance`仍为`NOT_RUN`。这是从已有证据恢复结构化导出，不是新运行或新签署。见[恢复审计](../../../evidence/audits/2026-10-05-w9-v24-run-recovery/README.md)、[证据包](../../../evidence/local/V2.4/bf8e8474-ce11-43c8-a9d4-ca2268c0c8a1/evidence.json)及[恢复历史执行快照文件清单](../../../evidence/audits/2026-10-05-w9-v24-run-recovery/files.sha256)。V2.4保持`PARTIALLY_IMPLEMENTED`；真实来源授权、20日观察、Ubuntu和当前范围用户验收仍未完成。

# V1 当前要求差异核对（P0）

日期：2026-10-08。用途：执行新V1计划P0的第一轮要求映射。来源为五阶段当前第2/7/8节及既有106项映射；不改变需求/人工签署，也不宣布版本完成。

## 判定约定

- `OPEN`：原映射明确未完成或待实现。安排至原工作包，须用当前实现与验收证据关闭。
- `RECHECK`：旧记录显示曾执行，但要求明确要求按当前环境复核，不能仅引用历史 PASS。
- `HISTORICAL`：旧台账曾勾选或记有工程证据；这是历史事实，不是本轮当前范围通过。
- 责任包沿用原P1～P6安排。独立工作包仅在不绕过正式阶段依赖时推进。

## 当前状态核对

2026-10-08重跑V1版本门禁为`INCOMPLETE`/exit 2；五阶段状态均PARTIALLY_IMPLEMENTED，阶段文档结构5/5 PASS，证据引用328、活动Manifest 15份/113条目/0路径或Hash失败；TestRun关联审计缺4个历史结构化导出。详细原始输出见[当前版本门禁](./2026-10-08-delivery-review/v1-completion-plan-gate.json)。这只证明结构和所链接证据文件/Hash可读，不证明对应业务完整、活动部署或人工验收。

对照现行阶段验收表，V1.1保留2026-09-09历史范围自动/用户确认；V1.2～V1.5也各有历史范围或工程子项证据，但五阶段均因本轮新增范围或整阶段条件未满足而未关闭。旧覆盖台账中40项明确未完成、10项待实现/未验证、28项要求当前环境复核、28项为历史勾选需复核范围；这些是旧台账分类计数，不等于当前测试通过数。逐项映射如下。

## A01逐项测试关联复核（2026-10-09）

机器索引[需求—测试证据路由表](./2026-10-09-v1-requirement-test-crosswalk.json)及[SHA-256](./2026-10-09-v1-requirement-test-crosswalk.json.sha256)现有145条唯一稳定ID：原始五阶段§2/7/8共106项，另列90/99的阶段测试契约、共用工作流、数值/证据不变量、版本发布门禁和证据字段38项，并新增全局产品要求XMK-03一项。每项链接到来源、责任包、测试计划、验收表和适用的阶段命令；全部声明的路径已核验存在。原链接审计验证55条精确测试名称引用逐条命中源码（48个具体断言）；本次V1.3父项拆分新增16条引用/8个唯一测试，合计71条引用（53个唯一断言），另有7个已定位的脚本执行入口，脚本入口不伪装成测试名，其余仅有阶段级/文档级路由或显式缺口；不把测试声明等同父要求PASS。原106条保留旧审计行号作为历史定位，源文档编辑后不能直接当现行行号。索引中106条历史来源行现均有当前定位：106条历史来源锚点及全局XMK-03已人工核对定位（含旧定位修正、范围变化和章节迁移）。XMK-03的来源锚点已核对，但其结算语义仍为开放需求。38条新增90/99路由也已逐项补全当前行号和原文；145条交叉索引记录均有当前精确来源锚点。详见[A01锚点与路由审计](./2026-10-09-v1-crosswalk-link-audit-a01.json)和[父项拆分审计](./2026-10-09-v1-crosswalk-parent-decomposition-a01.json)。

目前[V1测试计划](../../docs/prd/v1-local-simulation/90-test-plan.md)只按阶段列出测试主题，没有逐项T-ID/断言路径；全局T01～T55含R0/R1/R2/R3长期范围，不能直接冒充V1现有测试。接下来按责任包为OPEN及RECHECK项核对可执行测试文件、固定输入/断言和当前证据；只有源要求与断言语义一致才填入映射。无法关联的留`TEST_ID_GAP`并归入原责任包补测，历史人工签署、阶段级文档复核和当前人工确认维持各自状态。

这一轮完成了145条稳定编号/路由（含106条原始行、38条90/99增量和1条全局XMK-03产品要求），验证71条精确测试名称引用（53个唯一断言）和7个脚本执行入口，并将145条索引全部定位到当前原文锚点（106条历史行、全局XMK-03及38条90/99增量）。本次又将V1.3 FakeBroker四条父项拆为12个原子要求、关联16个精确测试引用（8个唯一断言）；其中固定Fixture子项有证据，4个Broker契约/完整故障矩阵/路由审计子项仍OPEN或PARTIAL，详见[拆分审计](./2026-10-09-v1-crosswalk-parent-decomposition-a01.json)。V1.1～V1.4仍以局部测试/阶段套件为主，其余父项拆分、语义符合性和V1.5父项缺口仍开放。历史4个Run处置也未关闭；A01仍进行中。

## A03 V1范围差异与安全边界（2026-10-09）

| 主题 | 当前来源与实际差异 | 处理建议/影响 | 未决时行为与去向 |
|---|---|---|---|
| Ubuntu | V1.5第2节要求Mac M1模拟闭环及目标Ubuntu架构烟测；V1计划指定目标为x86_64，ADR-0007本身适用V3研究/迁移，不能代替V1阶段的Ubuntu检查 | 保留V1阶段明确的Linux/Ubuntu测试，不扩成V3.4的全量迁移/5个实际交易日门禁；记录Docker仿真与实机分开 | 当前Ubuntu目标机烟测NOT_RUN，V1.5/A12仍开；不以Mac容器或amd64仿真代签 |
| 市场/订单规则 | 共同规则将本轮限制在双市场普通股及项目FakeBroker；V1.3/V1.4仍要求适用的价格精度、交易时段、费用/税、结算、停牌/涨跌幅、T+1、公司行动及独立账本事实 | 逐条依[市场合同](../../docs/prd/03-market-rules-and-contracts.md)和冻结Fixture验证适用规则，不采纳长期T01～T55中R1/R2/R3扩展作为本轮自动范围；未支持证券类型须与已规定必需规则分开 | 双市场基础闭环不能降级；没有冻结规则/Fixture/断言的具体组合归A07/A08开放项，不能标N/A绕过 |
| 已结算资金/中间路径（XMK-03） | [产品要求](../../docs/prd/00-product-requirements.md#615-xmk双市场结算与多币种)要求区分已结算现金、未结算应收应付、购买力和内部占用，默认只用已结算资金；V1总验收要求全Leg及中间路径。当前Portfolio `recordFill`立即把SELL净额计入`accounts.cash_amount`，而BUY预留以该字段扣除在途BUY预留，没有结算状态/SettlementDate字段，因此卖出所得可能马上支持后续BUY | A07/P3不可把“拒绝多腿”当作完成；A08/P4须先明确双市场Fixture结算日历、BUY可用资金与SELL应收路径，再实现Fill入账/结算释放/预算预留和独立对账，覆盖同批次与跨日正常、拒绝、恢复 | 当前只执行单腿样例，且多腿在预算/资源副作用前拒绝；此安全边界不解决有结算现金的多Leg执行。XMK-03按OPEN处理，未知来源市场结算时序不靠猜测 |
| Artifact保留与物理清理 | V1需要Artifact字节、引用、owner/run/hash校验和导出；OD-013仍未批准生成产物保留期/受保护类型/物理清理。已有内容存储和隔离清理工具不等于获准配置生产策略 | 继续只读盘点、隔离存储与Hash验证；单独准备OD-013选择及影响包，不把清理默认值混入V1工程 | 未确认不设置生成产物默认过期、不调度状态转换或删除；物理清理保持阻塞并回到OD-013 |
| 活动存储/策略 | V1.1第2节含活动API统一TestRun存储部署/回退；用户当前范围明确不授权active storage cutover及真实策略激活。OD-007活动策略参数/授权也仍未决 | 完成可审阅的迁移/备份/双写/回退包后再提出针对精确资源的授权；以冻结模拟Fixture继续验证FakeBroker交易，不调用真实券商/市场源 | 活动切换、真实源/策略启用保持未执行；不删改V1正式要求或把隔离PASS写成活动PASS。依赖项分别回到P1/A05和OD-007 |

本轮没有发现需要改写已接受ADR或降低V1门禁的依据；以上是边界澄清，不是上述活动操作的批准。需要决定的具体操作应在可审阅实施包准备好后再单独请求，不阻塞安全的隔离实现。

## 106项要求映射

| 阶段/源位置 | 要求摘要（截取自旧映射，完整要求见源文件） | 工作包 | 当前分类 |
|---|---|---|---|
| [V1.1 §2, 原行 13](../../docs/prd/v1-local-simulation/01-environment-and-web-center.md) | 冻结 Money/Security/Account initialization/account snapshot、Clock 和 TestRun 公共Schema并生成 TS/Python 类型；生成漂移及兼容检查已接入。证据：P3.1生成入口、P3.7消费者与兼容矩阵。 | P1 | HISTORICAL |
| [V1.1 §2, 原行 14](../../docs/prd/v1-local-simulation/01-environment-and-web-center.md) | 补齐所有跨服务OpenAPI/生成客户端及发布流程；建立并验证服务迁移和分层依赖命令。已映射生成器漂移、8个配置服务分层扫描、部分Platform/Trade→Portfolio调用与V1.1隔离迁移；route-by-route V1调用/身份/发布矩阵仍OPEN，活动切换另受授权约束。 | P1 | OPEN |
| [V1.1 §2, 原行 19](../../docs/prd/v1-local-simulation/01-environment-and-web-center.md) | Compose core 与真实 PostgreSQL 已用于账户持久化；组合服务 CN/US 模拟账户、现金/持仓及幂等初始化已有工程和运行证据。账户详情证据：P3.4、P3.5双市场账户。 | P1 | HISTORICAL |
| [V1.1 §2, 原行 20](../../docs/prd/v1-local-simulation/01-environment-and-web-center.md) | 完成通用Artifact存储与全链路引用/交付；进展：新增`common/artifact-ref.schema.json`并将TestRun `artifactRefs`改为强类型数组，TS/Python生成类型、兼容规则及精确结构测试均接入全局契约检查；V3.1 owner-scoped TestRun API将研究引用投影为公共`ArtifactRef`，Exporter核对绑定与内容Hash后导出。V3.1支… | P1 | OPEN |
| [V1.1 §2, 原行 26](../../docs/prd/v1-local-simulation/01-environment-and-web-center.md) | 平台 API owner 身份、健康/能力查询、验收运行与证据读取已有实现；V1.1 stage模式 normal/rejection/recovery 在隔离 PostgreSQL 和真实 Chromium Web 中完成同run CLI只读核对。证据：V1.1统一存储代码与Web套件。 | P1 | HISTORICAL |
| [V1.1 §2, 原行 27](../../docs/prd/v1-local-simulation/01-environment-and-web-center.md) | 将V1.1统一TestRun模式按维护窗口部署到活动API并验证回退；活动Compose仍为`legacy`，隔离套件不证明生产切换。当前活动库 49 legacy/44 unified；已在只读恢复副本补齐5条、验证幂等与双写。切换步骤、停止条件、回退和当前差额见存储切换Runbook与复演审计。活动迁移仍未执行。 | P1 | OPEN |
| [V1.1 §2, 原行 28](../../docs/prd/v1-local-simulation/01-environment-and-web-center.md) | Qlib/RD-Agent镜像基线、Mac/Docker架构及资源边界有历史记录；amd64仿真与当前Qlib锁版运行探针有单独工程证据。原生Ubuntu兼容、资源压力及真实RD-Agent运行仍未验收。 | P1 | HISTORICAL |
| [V1.1 §7, 原行 65](../../docs/prd/v1-local-simulation/01-environment-and-web-center.md) | 契约、数据结构、场景定义和预期结果已冻结。 | P1 | OPEN |
| [V1.1 §7, 原行 66](../../docs/prd/v1-local-simulation/01-environment-and-web-center.md) | 第2节后端任务完成，真实依赖与替身明确。 | P1 | OPEN |
| [V1.1 §7, 原行 67](../../docs/prd/v1-local-simulation/01-environment-and-web-center.md) | 正式Web功能页及验收中心正常/异常场景完成。 | P1 | OPEN |
| [V1.1 §7, 原行 68](../../docs/prd/v1-local-simulation/01-environment-and-web-center.md) | 命令、实际URL、Fixture路径/Hash和配置说明已补齐，待实现占位已消除或明确列为范围外。 | P1 | OPEN |
| [V1.1 §7, 原行 69](../../docs/prd/v1-local-simulation/01-environment-and-web-center.md) | 开发者按第8节从准备到导出亲自执行，保存代码版本、退出码、截图/Trace和断言证据。 | P1 | HISTORICAL |
| [V1.1 §7, 原行 70](../../docs/prd/v1-local-simulation/01-environment-and-web-center.md) | 重复/恢复及适用观察期验证完成，未覆盖项如实记录。 | P1 | HISTORICAL |
| [V1.1 §7, 原行 71](../../docs/prd/v1-local-simulation/01-environment-and-web-center.md) | 用户已通过Web及命令证据完成人工验收，记录确认时间/结论。 | P1 | HISTORICAL |
| [V1.1 §7, 原行 72](../../docs/prd/v1-local-simulation/01-environment-and-web-center.md) | 操作说明与限制已更新，本版验收表已同步。 | P1 | HISTORICAL |
| [V1.1 §8, 原行 76](../../docs/prd/v1-local-simulation/01-environment-and-web-center.md) | 8.1 当前可执行性与验收准备 | P1 | RECHECK |
| [V1.1 §8, 原行 96](../../docs/prd/v1-local-simulation/01-environment-and-web-center.md) | 8.2 初始化与启动（目标命令，待实现） | P1 | OPEN |
| [V1.1 §8, 原行 114](../../docs/prd/v1-local-simulation/01-environment-and-web-center.md) | 8.3 Web逐步操作及预期结果 | P1 | RECHECK |
| [V1.1 §8, 原行 129](../../docs/prd/v1-local-simulation/01-environment-and-web-center.md) | 8.4 命令行复验与相同运行核对（待实现） | P1 | OPEN |
| [V1.1 §8, 原行 164](../../docs/prd/v1-local-simulation/01-environment-and-web-center.md) | 8.7 统一存储模式隔离复验（2026-09-26） | P1 | RECHECK |
| [V1.1 §8, 原行 203](../../docs/prd/v1-local-simulation/01-environment-and-web-center.md) | 8.5 交叉核对、失败定位与恢复 | P1 | RECHECK |
| [V1.1 §8, 原行 211](../../docs/prd/v1-local-simulation/01-environment-and-web-center.md) | 8.6 验收记录与收尾 | P1 | RECHECK |
| [V1.1 §8, 原行 224](../../docs/prd/v1-local-simulation/01-environment-and-web-center.md) | 范围与签署状态澄清（2026-09-27） | P1 | OPEN |
| [V1.2 §2, 原行 15](../../docs/prd/v1-local-simulation/02-small-data-and-qlib.md) | 实现日线导入预览、原始行情、证券映射、数据版本及质量报告；坏数据不能标可用。复权分离与正式 Artifact 存储列为后续缺口。 | P2 | HISTORICAL |
| [V1.2 §2, 原行 16](../../docs/prd/v1-local-simulation/02-small-data-and-qlib.md) | 将固定版本 `pyqlib==0.9.6` 封装到独立 Qlib worker/quant adapter；完成 CPU 导入烟测和基础因子预览；模型训练与 NO_TRADE/TopK 完整策略留后续。 | P2 | HISTORICAL |
| [V1.2 §2, 原行 17](../../docs/prd/v1-local-simulation/02-small-data-and-qlib.md) | Artifact 异步任务将持久化状态、执行、取消与不可变产物发布关联；PostgreSQL事务原子提交Artifact字节与`COMPLETED`状态，取消/发布行锁竞态最多产生一个合法终态，租约接管通过fencing拒绝旧worker写入。边界为固定Fixture版本、单实例轮询工作器和数据库内BYTEA存储；大型产物/外部对象存储、Web任务界面及生产容量不在此切片内，阶段人工验收仍待执行。 | P2 | HISTORICAL |
| [V1.2 §2, 原行 18](../../docs/prd/v1-local-simulation/02-small-data-and-qlib.md) | 提供 CN 正常与未来数据样本，验证按 asOf 拒绝未来数据；US/缺失/退市样本列为后续缺口。 | P2 | HISTORICAL |
| [V1.2 §2, 原行 19](../../docs/prd/v1-local-simulation/02-small-data-and-qlib.md) | 提供隔离容器内固定代码 RD-Agent 兼容探针；无模型凭证时明确 `modelCalls=NOT_RUN`，不伪称真实实验完成。 | P2 | HISTORICAL |
| [V1.2 §7, 原行 54](../../docs/prd/v1-local-simulation/02-small-data-and-qlib.md) | 契约、数据结构、场景定义和预期结果已冻结。 | P2 | HISTORICAL |
| [V1.2 §7, 原行 55](../../docs/prd/v1-local-simulation/02-small-data-and-qlib.md) | 第2节后端任务完成；Artifact task执行器、持久任务状态、原子Artifact字节发布、幂等取消、租约恢复/fencing均有隔离PostgreSQL/HTTP验证。 | P2 | HISTORICAL |
| [V1.2 §7, 原行 56](../../docs/prd/v1-local-simulation/02-small-data-and-qlib.md) | 正式Web功能页及验收中心正常/异常场景完成。 | P2 | HISTORICAL |
| [V1.2 §7, 原行 57](../../docs/prd/v1-local-simulation/02-small-data-and-qlib.md) | 当前隔离Fixture路径、动态实际Web URL、启动/停止命令、按钮、配置边界、超时、预期输出与失败恢复步骤已补齐，并按第8节实际启动页面、运行三场景浏览器/CLI同Run检查及精确清理。 | P2 | HISTORICAL |
| [V1.2 §7, 原行 58](../../docs/prd/v1-local-simulation/02-small-data-and-qlib.md) | 开发者已执行数据 normal/rejection、容器健康、Qlib 0.9.6 CPU 烟测及基础代码检查。 | P2 | HISTORICAL |
| [V1.2 §7, 原行 59](../../docs/prd/v1-local-simulation/02-small-data-and-qlib.md) | Artifact任务重复取消、取消/发布并发、进程重启后排队执行、运行worker租约接管和旧worker拒绝已由隔离测试验证。Qlib recovery-probe仍仅验证READY，不扩展为真实模型故障恢复；本阶段当前范围人工验收仍未签署。 | P2 | HISTORICAL |
| [V1.2 §7, 原行 60](../../docs/prd/v1-local-simulation/02-small-data-and-qlib.md) | 当前新增范围用户验收未完成；2026-09-09历史签署保留在下方验收记录，不扩展为本轮签收。 | P2 | OPEN |
| [V1.2 §7, 原行 61](../../docs/prd/v1-local-simulation/02-small-data-and-qlib.md) | 可执行操作说明与限制已更新并实测；第8.6分开记录历史签署与当前自动证据，本版当前人工验收和Ubuntu门禁仍未签署/运行。 | P2 | HISTORICAL |
| [V1.2 §8, 原行 65](../../docs/prd/v1-local-simulation/02-small-data-and-qlib.md) | 8.1 当前可执行性与验收准备 | P2 | RECHECK |
| [V1.2 §8, 原行 85](../../docs/prd/v1-local-simulation/02-small-data-and-qlib.md) | 8.2 隔离初始化与启动 | P2 | RECHECK |
| [V1.2 §8, 原行 100](../../docs/prd/v1-local-simulation/02-small-data-and-qlib.md) | 8.3 Web逐步操作及预期结果 | P2 | RECHECK |
| [V1.2 §8, 原行 115](../../docs/prd/v1-local-simulation/02-small-data-and-qlib.md) | 8.4 命令行复验与相同运行核对 | P2 | RECHECK |
| [V1.2 §8, 原行 153](../../docs/prd/v1-local-simulation/02-small-data-and-qlib.md) | 8.7 早期代码套件复验（2026-10-06，历史边界） | P2 | RECHECK |
| [V1.2 §8, 原行 159](../../docs/prd/v1-local-simulation/02-small-data-and-qlib.md) | 8.5 交叉核对、失败定位与恢复 | P2 | RECHECK |
| [V1.2 §8, 原行 167](../../docs/prd/v1-local-simulation/02-small-data-and-qlib.md) | 8.6 历史验收记录与当前自动证据 | P2 | RECHECK |
| [V1.2 §8, 原行 194](../../docs/prd/v1-local-simulation/02-small-data-and-qlib.md) | 8.8 Web TestRun 与同Run CLI复核接线（2026-10-06） | P2 | RECHECK |
| [V1.2 §8, 原行 201](../../docs/prd/v1-local-simulation/02-small-data-and-qlib.md) | 8.9 三场景当前代码回归（2026-10-06） | P2 | RECHECK |
| [V1.2 §8, 原行 205](../../docs/prd/v1-local-simulation/02-small-data-and-qlib.md) | 8.10 Artifact task 持久状态切片（2026-10-06，历史结果） | P2 | RECHECK |
| [V1.2 §8, 原行 213](../../docs/prd/v1-local-simulation/02-small-data-and-qlib.md) | 8.11 Artifact task 原子发布与恢复验证（2026-10-06） | P2 | RECHECK |
| [V1.3 §2, 原行 13](../../docs/prd/v1-local-simulation/03-fake-broker-trading-loop.md) | 实现治理建议、MANUAL_APPROVAL与AUTO_POLICY、Mandate、短期执行授权、次数预算与资源预留；每条交易腿和中间资金路径都检查。 | P3 | OPEN |
| [V1.3 §2, 原行 14](../../docs/prd/v1-local-simulation/03-fake-broker-trading-loop.md) | 实现隔离 FakeBroker 交易证据和 place/query/cancel/fills/account 契约；brokerOrderId 稳定且不复制内部账本。 | P3 | OPEN |
| [V1.3 §2, 原行 15](../../docs/prd/v1-local-simulation/03-fake-broker-trading-loop.md) | 实现订单状态、全成、拒单、UNKNOWN、重复 Fill 幂等和固定故障事件序列。 | P3 | OPEN |
| [V1.3 §2, 原行 16](../../docs/prd/v1-local-simulation/03-fake-broker-trading-loop.md) | 固定场景覆盖全成、拒单、接受响应丢失、重复/乱序回报；seed/testRunId 均记录。 | P3 | OPEN |
| [V1.3 §2, 原行 17](../../docs/prd/v1-local-simulation/03-fake-broker-trading-loop.md) | 所有服务端接受路径仅允许 PAPER + FAKE，页面不能直接改状态或余额。 | P3 | OPEN |
| [V1.3 §7, 原行 62](../../docs/prd/v1-local-simulation/03-fake-broker-trading-loop.md) | 契约、数据结构、场景定义和预期结果已冻结。 | P3 | OPEN |
| [V1.3 §7, 原行 63](../../docs/prd/v1-local-simulation/03-fake-broker-trading-loop.md) | 第2节后端任务完成，真实依赖与替身明确。 | P3 | OPEN |
| [V1.3 §7, 原行 64](../../docs/prd/v1-local-simulation/03-fake-broker-trading-loop.md) | 正式Web功能页及验收中心正常/异常场景完成。 | P3 | OPEN |
| [V1.3 §7, 原行 65](../../docs/prd/v1-local-simulation/03-fake-broker-trading-loop.md) | 命令、实际URL、Fixture路径/Hash和配置说明已补齐，待实现占位已消除或明确列为范围外。 | P3 | OPEN |
| [V1.3 §7, 原行 66](../../docs/prd/v1-local-simulation/03-fake-broker-trading-loop.md) | 开发者按第8节从准备到导出亲自执行，保存代码版本、退出码、截图/Trace和断言证据。 | P3 | OPEN |
| [V1.3 §7, 原行 67](../../docs/prd/v1-local-simulation/03-fake-broker-trading-loop.md) | 重复/恢复及适用观察期验证完成，未覆盖项如实记录。 | P3 | OPEN |
| [V1.3 §7, 原行 68](../../docs/prd/v1-local-simulation/03-fake-broker-trading-loop.md) | 用户已通过Web及命令证据完成人工验收，记录确认时间/结论（2026-09-09，PASS）。 | P3 | HISTORICAL |
| [V1.3 §7, 原行 69](../../docs/prd/v1-local-simulation/03-fake-broker-trading-loop.md) | 操作说明与限制已更新，本版验收表已同步。 | P3 | OPEN |
| [V1.3 §8, 原行 73](../../docs/prd/v1-local-simulation/03-fake-broker-trading-loop.md) | 8.0 已验证命令 | P3 | RECHECK |
| [V1.3 §8, 原行 89](../../docs/prd/v1-local-simulation/03-fake-broker-trading-loop.md) | 8.1 当前可执行性与验收准备 | P3 | OPEN |
| [V1.3 §8, 原行 109](../../docs/prd/v1-local-simulation/03-fake-broker-trading-loop.md) | 8.2 初始化与启动（目标命令，待实现） | P3 | OPEN |
| [V1.3 §8, 原行 127](../../docs/prd/v1-local-simulation/03-fake-broker-trading-loop.md) | 8.3 Web逐步操作及预期结果 | P3 | RECHECK |
| [V1.3 §8, 原行 142](../../docs/prd/v1-local-simulation/03-fake-broker-trading-loop.md) | 8.4 命令行复验与相同运行核对（待实现） | P3 | OPEN |
| [V1.3 §8, 原行 177](../../docs/prd/v1-local-simulation/03-fake-broker-trading-loop.md) | 8.5 交叉核对、失败定位与恢复 | P3 | RECHECK |
| [V1.3 §8, 原行 185](../../docs/prd/v1-local-simulation/03-fake-broker-trading-loop.md) | 8.6 验收记录与收尾 | P3 | RECHECK |
| [V1.4 §2, 原行 13](../../docs/prd/v1-local-simulation/04-daily-backtest.md) | 建立BacktestRun及固定Manifest：数据、股票池、策略/因子、规则、成本、依赖/镜像、种子、初始账户、区间与基准。 | P4 | HISTORICAL |
| [V1.4 §2, 原行 14](../../docs/prd/v1-local-simulation/04-daily-backtest.md) | 实现按运行隔离的历史时钟与日线撮合；日终确认信号最早下一可交易时点执行，原价用于成交，复权研究与公司行动入账分离。 | P4 | HISTORICAL |
| [V1.4 §2, 原行 15](../../docs/prd/v1-local-simulation/04-daily-backtest.md) | 完成费用、滑点、成交量约束、停牌/限制价、可卖量及结算处理；当前已实现固定费用/不利滑点、可配置A股佣金参数/最低佣金、沪深经手费与过户费、卖方印花税、成交量约束、T+1与单卖单次一Fixture Session结算，并有合成停牌/锁板场景；另有独立合成历史日期费率Fixture覆盖2023-08-28前后规则切换。完整券商费率、交易所结算日历、公司行动及交易规则一致性仍缺；日线无法确定的盘中顺序采用明确保守规则。 | P4 | OPEN |
| [V1.4 §2, 原行 16](../../docs/prd/v1-local-simulation/04-daily-backtest.md) | 单证券日线Fixture按交易Session记录持仓、T+1未可卖量和可卖量；成交日持仓纳入估值，下一条Fixture交易日才释放卖出可用量；同日卖出被拒绝，后续显式SELL按可卖持仓/成交参与率成交，扣费后计未结算款并在下一Fixture Session转为现金。后端断言、Web结果和同Run CLI核对均通过；Fixture结束时未结款仍作为应收项。 | P4 | HISTORICAL |
| [V1.4 §2, 原行 17](../../docs/prd/v1-local-simulation/04-daily-backtest.md) | 提供收益/基准、回撤、换手、费用归因、成交率、拒绝/未成交数量和数据覆盖；关联实际模拟流水。 | P4 | HISTORICAL |
| [V1.4 §2, 原行 18](../../docs/prd/v1-local-simulation/04-daily-backtest.md) | Qlib快速研究报告和交易链路回放分开标注执行模型；同一基准案例比对规则与费用，无差异才作为一致性证据。 | P4 | OPEN |
| [V1.4 §7, 原行 61](../../docs/prd/v1-local-simulation/04-daily-backtest.md) | 契约、数据结构、场景定义和预期结果已冻结。 | P4 | OPEN |
| [V1.4 §7, 原行 62](../../docs/prd/v1-local-simulation/04-daily-backtest.md) | 第2节后端任务完成，真实依赖与替身明确。 | P4 | OPEN |
| [V1.4 §7, 原行 63](../../docs/prd/v1-local-simulation/04-daily-backtest.md) | 正式Web功能页及验收中心正常/异常场景完成。 | P4 | OPEN |
| [V1.4 §7, 原行 64](../../docs/prd/v1-local-simulation/04-daily-backtest.md) | 命令、实际URL、Fixture路径/Hash和配置说明已补齐，待实现占位已消除或明确列为范围外。 | P4 | OPEN |
| [V1.4 §7, 原行 65](../../docs/prd/v1-local-simulation/04-daily-backtest.md) | 开发者按第8节从准备到导出亲自执行，保存代码版本、退出码、截图/Trace和断言证据。 | P4 | OPEN |
| [V1.4 §7, 原行 66](../../docs/prd/v1-local-simulation/04-daily-backtest.md) | 重复/恢复及适用观察期验证完成，未覆盖项如实记录。 | P4 | OPEN |
| [V1.4 §7, 原行 67](../../docs/prd/v1-local-simulation/04-daily-backtest.md) | 用户已通过Web及命令证据完成人工验收，记录确认时间/结论。 | P4 | OPEN |
| [V1.4 §7, 原行 68](../../docs/prd/v1-local-simulation/04-daily-backtest.md) | 操作说明与限制已更新，本版验收表已同步。 | P4 | OPEN |
| [V1.4 §8, 原行 72](../../docs/prd/v1-local-simulation/04-daily-backtest.md) | 8.1 当前可执行性与验收准备 | P4 | RECHECK |
| [V1.4 §8, 原行 92](../../docs/prd/v1-local-simulation/04-daily-backtest.md) | 8.2 初始化与启动（隔离自动化命令已实测；人工页面启动仍待补） | P4 | OPEN |
| [V1.4 §8, 原行 107](../../docs/prd/v1-local-simulation/04-daily-backtest.md) | 8.3 Web逐步操作及预期结果 | P4 | RECHECK |
| [V1.4 §8, 原行 123](../../docs/prd/v1-local-simulation/04-daily-backtest.md) | 8.4 命令行复验与相同运行核对（已验证） | P4 | RECHECK |
| [V1.4 §8, 原行 160](../../docs/prd/v1-local-simulation/04-daily-backtest.md) | 8.5 交叉核对、失败定位与恢复 | P4 | RECHECK |
| [V1.4 §8, 原行 168](../../docs/prd/v1-local-simulation/04-daily-backtest.md) | 8.6 验收记录与收尾 | P4 | RECHECK |
| [V1.5 §2, 原行 17](../../docs/prd/v1-local-simulation/05-scheduling-and-recovery.md) | 实现市场日历调度与自动日终对账；工作流保存步骤/等待，领域数据库拥有业务事实；网页不承担调度。 | P5 | HISTORICAL |
| [V1.5 §2, 原行 18](../../docs/prd/v1-local-simulation/05-scheduling-and-recovery.md) | 增加暂停、恢复、事件重放、UNKNOWN查询、重启恢复、错过窗口处理；通过幂等和持久发送日志阻止重发。 | P5 | HISTORICAL |
| [V1.5 §2, 原行 19](../../docs/prd/v1-local-simulation/05-scheduling-and-recovery.md) | 把已创建页面的告警、能力阻塞、验收中心证据和比较功能贯通；支持从任一成交追溯完整链路。 | P5 | OPEN |
| [V1.5 §2, 原行 20](../../docs/prd/v1-local-simulation/05-scheduling-and-recovery.md) | 提供外部故障演练脚本和操作Runbook，覆盖Worker/总线重启、断网、睡眠恢复、双Worker竞争；Web仅记录操作提示和回收证据。 | P5 | OPEN |
| [V1.5 §2, 原行 21](../../docs/prd/v1-local-simulation/05-scheduling-and-recovery.md) | 隔离备份恢复；执行Mac M1完整模拟E2E及目标Ubuntu架构烟测，记录未覆盖环境，V1证据打包。 | P5 | OPEN |
| [V1.5 §7, 原行 56](../../docs/prd/v1-local-simulation/05-scheduling-and-recovery.md) | 契约、数据结构、场景定义和预期结果已冻结。 | P5 | OPEN |
| [V1.5 §7, 原行 57](../../docs/prd/v1-local-simulation/05-scheduling-and-recovery.md) | 第2节后端任务完成，真实依赖与替身明确。 | P5 | OPEN |
| [V1.5 §7, 原行 58](../../docs/prd/v1-local-simulation/05-scheduling-and-recovery.md) | 正式Web功能页及验收中心正常/异常场景完成。 | P5 | OPEN |
| [V1.5 §7, 原行 59](../../docs/prd/v1-local-simulation/05-scheduling-and-recovery.md) | 命令、实际URL、Fixture路径/Hash和配置说明已补齐，待实现占位已消除或明确列为范围外。 | P5 | OPEN |
| [V1.5 §7, 原行 60](../../docs/prd/v1-local-simulation/05-scheduling-and-recovery.md) | 开发者按第8节从准备到导出亲自执行，保存代码版本、退出码、截图/Trace和断言证据。 | P5 | OPEN |
| [V1.5 §7, 原行 61](../../docs/prd/v1-local-simulation/05-scheduling-and-recovery.md) | 重复/恢复及适用观察期验证完成，未覆盖项如实记录。 | P5 | OPEN |
| [V1.5 §7, 原行 62](../../docs/prd/v1-local-simulation/05-scheduling-and-recovery.md) | 用户已通过Web及命令证据完成人工验收，记录确认时间/结论（2026-09-09，PASS）。 | P5 | HISTORICAL |
| [V1.5 §7, 原行 63](../../docs/prd/v1-local-simulation/05-scheduling-and-recovery.md) | 操作说明与限制已更新，本版验收表已同步。 | P5 | OPEN |
| [V1.5 §8, 原行 67](../../docs/prd/v1-local-simulation/05-scheduling-and-recovery.md) | 8.1 当前可执行性与验收准备 | P5 | OPEN |
| [V1.5 §8, 原行 87](../../docs/prd/v1-local-simulation/05-scheduling-and-recovery.md) | 8.2 初始化与启动（目标命令，待实现） | P5 | OPEN |
| [V1.5 §8, 原行 105](../../docs/prd/v1-local-simulation/05-scheduling-and-recovery.md) | 8.3 Web逐步操作及预期结果 | P5 | RECHECK |
| [V1.5 §8, 原行 120](../../docs/prd/v1-local-simulation/05-scheduling-and-recovery.md) | 8.4 命令行复验与相同运行核对（待实现） | P5 | OPEN |
| [V1.5 §8, 原行 155](../../docs/prd/v1-local-simulation/05-scheduling-and-recovery.md) | 8.5 交叉核对、失败定位与恢复 | P5 | RECHECK |
| [V1.5 §8, 原行 163](../../docs/prd/v1-local-simulation/05-scheduling-and-recovery.md) | 8.6 验收记录与收尾 | P5 | RECHECK |

## 范围与依赖结论

1. **V1目标不包括真实券商。** 继续只用自有FakeBroker和隔离模拟账户；V2真实数据、分钟回放、持续Paper扩展及V3真实RD-Agent研究不属于本计划。V1自身规定的真实Qlib小样本和固定RD-Agent兼容探针继续保留。
2. **Ubuntu层级要准确解释。** 三版共同规则要求V1/V2尝试目标CPU架构烟测、记录模拟情况；V3.4要求真实Ubuntu迁移/恢复/全阶段回归。V1阶段/计划另有目标Ubuntu架构验证要求，因此本计划保留目标架构/环境交付核对；不能把V3最终Ubuntu发布/5日观察提前纳入V1，也不能将M1 amd64仿真记为真实Ubuntu。若实际V1阶段原文写明实机要求，P0需逐条登记，不自行改写。
3. **OD-013和活动存储切换阻塞特定动作。** Artifact物理删除/过期调度须等待所有者政策；活动TestRun存储切换须有配对备份/恢复副本、运行清单和具体维护执行材料。两者不阻塞隔离账户、交易、回测工程测试；活动切换和物理清理也不是仅由新增代码自动完成。
4. **OD-007只阻塞活动策略。** 隔离Fixture/MANUAL/AUTO交易路径仍需验证；未批准活动参数不应被擅自启用，也不应用来拖住所有隔离场景。
5. **历史证据缺口有4个精确Run。** V1.2 `5dc2a5a7-28f1-4c9f-a867-3a676994f5b4`；V1.5 `25fe0718-5a76-4477-a02b-5e954f621dde`、`48e32a09-4901-424f-8585-7b01ab9f83f7`、`113fea95-5fee-42ee-b702-f8423b8a173c`。本地/活动挂载来源查询曾未找到；需要新原始备份时才再查。新Run不能替换。
6. **已知固定切片不重复建设。** V1.3 21项隔离Web/API/CLI矩阵、MANUAL/AUTO刷新恢复、L07/L08应用协调提取及LIVE/REAL重点入口拒绝有现存审计；P3剩余是全路径与原需求的覆盖差异、适用规则/决定/交付。V1.5 NO_TRADE派发/恢复不能替代交易/日终业务流程。

## P0退出与下一步

P0当前核对产物已给出106条旧要求的状态分类、V1验收/门禁事实、明确的V1/V2/V3边界及决定阻塞归属。仍需以来源需求ID、当前测试ID/证据将开放路径细化到P1～P6；原106项描述过长且含历史行号，不在此重复复制第二份PRD。此后修改范围时更新原需求/追踪/验收，不在此批准删减。

下一工程工作：按P1对V1实际调用的合同/Artifact/发布路径补矩阵，并完成不涉及活动数据的隔离验证；并行形成OD-013具体政策草案供后续审阅，但在决定到达前不执行物理删除。然后复核P2并进入P3剩余业务路径。

2026-10-08开发续跑补充：五阶段代码套件及对应隔离Web/CLI验证已在同日执行；各命令、TestRun和边界见[V1开发运行记录](./2026-10-08-v1-development-run.md)。P0状态分类仍是旧106项映射的首轮归档，不把旧行勾选推导成当前PASS；逐条绑定当前测试ID/证据、补全缺实现/缺验证/缺决定/缺环境的退出条件仍待完成。V1正式Verifier依旧INCOMPLETE，未改人工结论。

## 2026-10-09追踪增量：V1.5 UNKNOWN原单恢复

更新[机器交叉索引](./2026-10-09-v1-requirement-test-crosswalk.json)：`V1.5-S2-L18`现关联隔离E2E脚本、dispatch场景单测及实际E2E报告。该证据只关闭“响应丢失后原单查询短暂不可用，再按原单恢复”的子路径；暂停/恢复、事件重放、撤销、在途Fill、错过窗口、交易消息重复投递和Worker业务恢复仍是开放项，Mandate预算未独立读取。交叉索引SHA-256已同步更新。此增量不改变阶段状态或人工验收状态。


2026-10-09 P0/A01增量：在补齐V1.1-S2-L14的迁移CLI映射后，对当前机器交叉索引逐项复核：145条要求的来源/阶段计划/验收/实现与证据路径共1030条均存在，88条精确测试名称引用均在对应源码中命中，缺失路径/测试名均为0。机器记录与交叉索引SHA见[本轮审计](./2026-10-09-v1-crosswalk-link-audit-a02.json)及[SHA-256](./2026-10-09-v1-crosswalk-link-audit-a02.json.sha256)。该检查只验证路径存在及测试名文本匹配，不证明测试行为、需求覆盖完整性或验收通过；A01/P0仍未关闭。

2026-10-09 P5恢复增量：执行已有Artifact卷只读归档/临时恢复烟测，33个文件共1945字节恢复后逐文件SHA一致，退出0，源卷只读且未重启服务。证据：[日志](./2026-10-09-v1-artifact-volume-backup-restore-a01.log)。此结果补充Artifact卷可归档/可读回的隔离证据，不证明活动写入暂停时点、数据库/Artifact配对一致性、完整V1恢复、Ubuntu或RPO/RTO。


## A05 V1.5错过窗口映射复核（2026-10-09）

P5双日AUTO Fixture的次日重评估已在真实隔离Web/API/CLI/export E2E、当前完整V1.5 code suite和V1.5单测中验证。需求—测试交叉表中的`V1.5-S2-L17/L18`已更新源锚点、精确测试名、当前E2E/code-suite证据及剩余缺口；本次逐条路径/测试名审计通过，见[交叉表复核A02](./2026-10-09-v15-missed-window-crosswalk-a02.json)及[SHA-256](./2026-10-09-v15-missed-window-crosswalk-a02.json.sha256)。这是映射和存在性核对，不关闭完整日历、多日调度、结算、撤销/在途Fill、业务Worker恢复或用户验收。旧106项台账与A01/A04审计保留为历史快照。


## A06/A07 全局交叉表源锚点与引用刷新（2026-10-09）

复核原145行交叉表发现阶段文档增补后有大量当前行号偏移；原A04只验证路径和测试名文字存在，未证明锚点行号仍准确。本轮逐行刷新145条当前来源锚点，并核对1,058条来源/计划/验收/证据路径和96条精确测试名引用。首轮A06发现全局XMK-03锚点检查路径指向阶段合同文件而非其产品需求来源，失败记录保留于[A06](./2026-10-09-v1-crosswalk-link-audit-a06.json)；修正`stageRequirementFile`后[A07全量复核PASS](./2026-10-09-v1-crosswalk-link-audit-a07.json)，无缺失路径、测试名或锚点。该审核只证明交叉索引定位完整，不证明96项测试语义充分或父项通过；P0/A01仍须完成原子要求/断言语义覆盖复核。

### 2026-10-09 A01追加：V1.3-S2-L17服务端模式边界精确映射

将本轮V1.1/V1.3完整代码套件、V1.3 22/22隔离Web/API/CLI结果和Portfolio四条写入口的零副作用拒绝证据加入[稳定需求交叉索引](./2026-10-09-v1-requirement-test-crosswalk.json)的`V1.3-S2-L17`。新增证据路径均存在、索引SHA sidecar匹配。状态仍为`PARTIAL_PLATFORM_GOVERNANCE_TRADE_PORTFOLIO_MODE_BOUNDARIES_COVERED_FULL_ACCEPTANCE_MATRIX_OPEN`：该行已覆盖若干关键HTTP入口，但尚未逐一验证所有V1服务/Worker写入口、BACKTEST业务操作和完整交易接受路径；不关闭父项。

### 2026-10-09 A01追加：V1.3-S2-L16固定交易场景精确测试映射

稳定索引`V1.3-S2-L16`现列出11条精确E2E测试名：AUTO正常/HOLD/预算拒绝、币种/范围/现金/T+1拒绝、FakeBroker响应丢失与原单查询失败、Trade进程重启、乱序Fill恢复、部分成交撤单；映射到当前22/22 Web/API/CLI E2E日志及代码门禁。交叉索引中该项所有证据路径存在且SHA sidecar匹配。此项仍是PARTIAL：测试是固定场景，不能覆盖所有市场/订单故障、结算语义、路由或用户验收；不把父要求改记PASS。

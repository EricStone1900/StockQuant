# 从零开发实施计划

版本2.0，2026-09-06。产品目标、架构与协议分别见[PRD](./00-product-requirements.md)、[架构设计](./02-system-architecture.md)、[双市场契约](./03-market-rules-and-contracts.md)。本文所有路径和命令均为新项目应创建的产物，不依赖预先存在的仓库。

## 1. 开发顺序

2026-09-07本轮执行覆盖：按[三版共同规则](./05-three-version-delivery.md)及[V1](./v1-local-simulation/README.md)、[V2](./v2-data-and-replay/README.md)、[V3](./v3-research-and-ubuntu/README.md)共14阶段推进；每阶段同步Web/验收中心。三版仅自有FakeBroker，D5真实账户/券商部分、D6实盘与D7未纳入增强延后。下文D0～D7为长期交付包来源，不是本轮顺序或必须全部执行清单。V1覆盖D0～D4方向，V2取D5数据/模拟并扩展分钟回放，V3取D7自动研究并完成Ubuntu迁移。

本轮新增命令契约与证据要求见共同规则第8节，真实命令需要在开发时实现。V1.1建立验收中心骨架，后续逐阶段增加场景，禁止将Web集中拖到最后。

先建立双市场模型和确定性Paper闭环，再接真实数据与券商，最后分别开放双市场自动实盘。策略增强和Agent可后置，不能让研究侧完整度拖延量化自动执行目标。A股/美股接入可按券商可用性先后进行，但从第一条数据契约就包含market/currency/timezone。

按R0→R1→R2交付主要目标，R3为可选增强。每个服务严格采用S0～S6生命周期，不能用大量Controller或替身测试替代持久化、事务和独立验收。跨服务联调仅使用已独立验收的真实依赖，开发期间可用明确Fake完成本服务规则测试。

## 2. 统一服务生命周期

| 生命周期 | 必须完成 | 退出条件 |
|---|---|---|
| S0 边界与契约 | 目标/非目标、事实所有权、入出站端口、状态/错误/时间/权限、Schema、数据库设计 | 无所有权冲突；接口包含market/mode/版本/幂等 |
| S1 独立骨架 | 配置验证、健康/版本/指标、日志、空迁移、Dockerfile、README | 独立构建、迁移、启动/停止；缺配置失败可诊断 |
| S2 最小纵向切片 | 单个真实用例→Domain→Repository→事务/幂等/Outbox | 真数据库集成，提交中途失败无部分写入 |
| S3 核心领域 | 金额、时间、股票池、规则/状态、版本与审计 | 成功、边界、拒绝用例及领域不变量通过 |
| S4 契约与事件 | 生成Client、Outbox/Inbox、乱序/迟到/重放及Saga恢复 | 重复投递不重复副作用，跨服务仅契约通信 |
| S5 强化 | 身份、隔离、超时、限流、熔断、资源、备份与可观测性 | 故障/越权/恢复/资源目标验证 |
| S6 独立发布 | 独立镜像/数据库迁移、契约、用例、回滚及证据 | 服务自己的90-test-plan/99-acceptance签署；可带Fake依赖但如实标注 |

S0～S6是服务生命周期。以下D编号是交付包，禁止继续发明S7/S8等阶段混淆生命周期。

## 3. 交付包

### D0：新项目基线

- 目标：创建空项目、文档入口和不可冲突的双市场语义；非目标：真实资金交易。
- 输入：本目录；本人待确认参数可以保留UNSET，不能填假真实值。
- 顺序：复制本目录→创建根README/AGENTS→建立所有权图→定义Money/Security/Calendar/Account/Proposal/Mandate→冻结状态与错误→建立Schema生成器及Fixture。
- 文件：`docs/product-rebuild/`、`packages/contracts/{schemas,openapi,asyncapi}/`、`fixtures/{cn,us,fx}/`、`docs/stages/D0/00-stage-design.md`、`90-test-plan.md`、`99-acceptance.md`。
- 契约：生成TS/Python类型，金额字符串、IANA时间、market/account/mode必需，交易日和结算日分开。
- 门禁：两市场身份不冲突，跨币种加法拒绝，契约生成可复现；本包无需其他目录文档可理解。

### D1：工程与安全初始化

- 目标：基础设施与核心服务独立骨架；非目标：全部增强服务启动。
- 输入：D0协议。数据库/消息/Artifact服务选定版本与锁文件。
- 顺序：工作区依赖→Compose基础设施→独立Database/User→配置/健康/错误规范→Web/BFF身份→虚拟账户与种子初始化→备份演练。
- 文件：根`package.json`/`pnpm-workspace.yaml`/锁文件；核心服务`Dockerfile`/`README.md`/`migrations/`；`infra/compose/`；`scripts/bootstrap/`；`packages/config/observability/testing/`。
- 幂等/安全：初始化键唯一；本地只监听loopback；远程TLS与会话验证；凭证引用不进仓库。
- 测试：T01～T05、T37、T40～T43的基础子集。
- 门禁：服务可独立启动，缺数据库显示阻塞；固定CN/US账户重启后资产不累加。

### D2：双市场数据与量化基础

- 目标：固定输入→历史股票池→基础价格因子→NO_TRADE/TopK→可追溯快照；非目标：高收益策略承诺。
- 输入：D1，CN/US日历/证券/公司行动/FX Fixture及Artifact协议。
- 顺序：不可变导入→质量/PIT→原价与复权分离→股票池→因子/变换→策略Registry→回测/成本→快照原子发布→只读Web。
- 文件：`services/market-data-service/`、`services/quant-research-service/`、对应迁移与API、`apps/web/`数据/策略页面、`fixtures/corporate-actions/`。
- 边界：量化只读market-data发布物；数据缺失不能伪造停牌；按市场产生不同日线截止。
- 测试：T04～T12、T40～T47的研究子集。
- 门禁：同输入规范Hash一致，任何未来/陈旧生产证据被拒绝，两个市场均可产生HOLD与调仓候选。

### D3：治理、账户、Paper与自动授权

- 目标：R0核心端到端；非目标：连接真实交易写入口。
- 输入：D2策略快照；Account/CashSettlement/Risk/Proposal/Mandate协议已冻结。
- 顺序：期初与Lot账本→硬风控/中间路径→建议状态→MANUAL与AUTO_POLICY→账户资源和批次占用→短期授权→执行批次事务→Paper→增量Fill/结算→对账→基础复盘。
- 文件：`services/{portfolio-risk-service,decision-governance-service,trade-execution-service}/`、各服务迁移/Repository/事件Relay、Web授权/订单/对账页面、`fixtures/broker-events/`。
- 安全：所有place必须可信授权；共享账户资源锁；同键异载荷409；模拟与LIVE隔离。
- 测试：T22～T31、T33、T43～T52，包含无逐笔审批的Paper场景。
- 门禁：两市场按正确规则撮合/结算；批准模式不同但共用硬风控；已接受未知不释放；PAPER+AUTO_POLICY完成全链路。

### D4：调度、恢复与控制台

- 目标：R0完整交付，可连续运行和恢复；非目标：把Fixture结果称真实市场通过。
- 输入：D3领域服务独立S6证据，真实PostgreSQL/NATS/Temporal。
- 顺序：日历定时/数据事件→工作流去重→人工等待/自动分支→事务事件→进程重启→过时作业→告警→全链路Web→备份恢复。
- 文件：`services/workflow-orchestration-service/`、`apps/web/`总览/控制/审计、`scripts/verify/`、`scripts/backup/`、`scripts/restore/`。
- 降级：未知订单保留查询路径；暂停新交易但继续入账；恢复不集中补下过期单。
- 测试：T24～T38、T40～T54适用基础子集。
- 门禁：真实进程PAPER E2E；页面关闭仍执行；夏令时/双市场日切/重启与重复事件全部正确。

### D5：真实来源、账户只读与Shadow

- 目标：R1；非目标：未完成验证就发真实订单。
- 输入：本人选定两市场数据与券商，授权/许可、历史覆盖、API能力和预算明确。
- 顺序：每市场数据Adapter→真实PIT/公司行动/日历核验→只读Broker同步→行情/费用口径→真实时钟Paper→Shadow→日终对账→策略及执行参数定版。
- 文件：数据`adapters/providers/`、执行`adapters/brokers/`和可选`infra/bridge/`、`tests/replay/`、市场/券商Runbook及能力报告。
- 安全：LIVE写开关关闭；演练用模拟账户；免费/延迟数据不充当有效执行报价。
- 测试：T06～T12、T29～T30、T38～T49、T53～T55的只读/模拟子集。
- 门禁：每市场独立数据质量与连续Shadow报告；建议至少20个当地交易日，不为制造信号强迫交易。声明哪些证券/规则尚不支持。

### D6：双市场自动实盘

- 目标：R2主要产品完成；非目标：自动扩大策略或资产范围。
- 输入：D5报告、本人已批准风险/资金/策略/Mandate、真实券商能力、常开主机、外部通知与恢复验证。
- 顺序：单一写Gateway与fencing→发送日志/DispatchPermit→place/query/cancel真实验证→每市场小范围准入→自动日终/结算→断线/暂停恢复→按市场扩大到批准范围。
- 文件：执行Gateway与Broker Adapter、可选Windows Bridge、`infra/`生产配置模板、`scripts/verify/`市场发布检查、实盘Runbook、证据报告。
- 安全：两个市场分别开关/账户隔离；检查暂停与发送竞态；UNKNOWN只查不重下；实际账户资金和券商细节不写入代码仓库。
- 测试：全部适用P0/P1/P2及T39～T55真实通道子集；多实例、夜间无人值守、券商外部订单、结算/公司行动必须验证。
- 门禁：A股与美股分别完成真实闭环并签署。允许一个市场先上线，但项目整体状态保持PARTIAL，不能宣称双市场完成。

### D7：可选研究与Agent增强

- 目标：R3；非目标：把模型变成交易权限持有方。
- 输入：核心闭环已稳定；本人明确Agent/研究范围和模型/算力预算。
- 顺序：新闻/市场状态按策略依赖接入→Agent Kernel/六角色→黄金评测→插件隔离→自动研究→Outcome Memory→经验草稿与批准。
- 文件：可选服务目录、Prompt版本、Sandbox镜像、SDK契约、`tests/security/`、研究/模型报告。
- 测试：T13～T21、T34及相关市场上下文/权限回放。
- 门禁：QUANT_ONLY可独立运行；启用Agent后证据/权限/时效可验证；研究不能自动激活生产策略。

## 4. 统一开发命令契约

新项目应创建以下入口；在实现这些脚本以前不得宣称命令可运行。

| 入口 | 约定 |
|---|---|
| pnpm install --frozen-lockfile | 安装Node锁定依赖；首次建仓先生成并提交锁文件 |
| pnpm lint / typecheck / test | 代码质量、类型、领域单元测试 |
| pnpm test:integration / test:contract / test:e2e | 真数据库、生成契约、浏览器和服务闭环；缺脚本应失败，不静默跳过 |
| uv sync --frozen | 各Python服务独立锁文件安装，禁止串用其他服务虚拟环境 |
| uv run ruff check . / uv run mypy src | Python质量/类型 |
| uv run pytest tests/unit、tests/integration、tests/contract、tests/e2e | 各服务创建对应目录/标记，区分Fake和真实依赖 |
| pnpm stack:up / stack:down | 启停基础/模拟/生产组；down不默认删除业务卷 |
| pnpm seed:paper | 固定CN/US/FX模拟输入幂等初始化 |
| pnpm verify:paper / verify:shadow | 双市场Paper真实服务闭环/真实时间Shadow |
| pnpm verify:release | 按market/account检查证据和配置，默认只读，不隐式发实盘单 |
| pnpm backup / restore:verify | 备份、隔离恢复验证；记录Hash/版本和结果 |

真实下单验证必须使用另一个明确命名、需要有效本人启用配置的入口，不能混在安装、健康检查、默认测试或数据初始化中。

## 5. 每阶段文档模板

每D阶段目录包含`00-stage-design.md`（目标/非目标、输入、依赖、所有权、边界、降级）、实施步骤文件（文件清单、Schema、顺序、幂等/安全/观测）、`90-test-plan.md`（分层及人工步骤/预期）、`99-acceptance.md`（证据与签署）。

所有阶段文档从本包派生，链接只指新项目内部已创建路径。范围变更同步更新设计、测试和验收。每个交付包聚焦完整纵向行为；工期在人力、主机和通道条件明确后估计，不能以服务数量直接推算完成率。

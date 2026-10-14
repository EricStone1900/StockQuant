> 当前V1收尾范围（2026-10-13）：所有者要求聚焦主要功能、减少非必要验证和停止扩散；当前执行以[V1主要功能完成计划](../../plans/2026-10-08-v1-completion-plan.md)及[范围决定](../../decisions/2026-10-13-v1-core-closeout-scope.md)为准。延期增强和广泛验证不阻塞本轮，旧任务/结果/签署保留为历史；核心正确性和人工验收不缩减。

> 当前范围决定（2026-10-13）：所有者已将Ubuntu实机部署/恢复/主机资源验收延期至后续Ubuntu部署验收，状态DEFERRED / NOT_RUN；它不再阻塞V1本轮开发及验收。Mac本地容器、目标架构烟测/缺口登记、其余业务/恢复和人工验收要求保留。旧记录中的Ubuntu缺口保留为历史事实，不代表当前V1阻塞。见[延期决定](../../decisions/2026-10-13-v1-ubuntu-deferral.md)。

# V1.1 环境、账户初始化与 Web 验收中心

状态：PASS（2026-10-14，已批准的Mac本地V1主要功能范围；本地容器Web、验收中心、双市场账户初始化、owner隔离和同Run CLI/export已有实测证据，见§8.68–8.69、§8.72–8.75；用户已确认精确候选整版验收通过）。全平台消费者/发布矩阵、活动旧栈存储切换、自动Artifact生命周期及Ubuntu实机按既定范围延期。版本入口：[README](./README.md)。

## 1. 前置与范围

无；先阅读上层产品、架构和契约，以及共同开发规则。

本阶段所有订单、券商资产和成交均来自隔离模拟环境。真实业务数据库、Qlib或RD-Agent在声明“已验证”时必须真正执行；替身需独立标注。

## 2. 开发任务

2026-10-14当前范围收口：按[所有者决定](../../decisions/2026-10-13-v1-core-closeout-scope.md)核对本轮交付，以下既有广泛父项中的剩余扩展继续保留未勾选，不构成本轮必交。原状态与清单完整保存在[同步前快照](../../../evidence/audits/2026-10-14-v1-closeout-before-status-sync.json)；不把延期项写成PASS。

- [x] 当前主要功能范围已实现并实测：本地容器Web、验收中心、双市场账户初始化、owner隔离和同Run CLI/export。证据见§8.68–8.69、§8.72–8.75及[五阶段主要路径汇总](../../../evidence/audits/2026-10-13-v1-current-core-e2e-a01.md)。全平台消费者/发布矩阵、活动旧栈存储切换、自动Artifact生命周期及Ubuntu实机按既定范围延期。

- [x] V1.1 Run创建只接受`scenarioId/seed`，美股账户初始化与恢复命令拒绝客户端业务载荷；伪造`status/cash/positions`返回422且既有Run状态不变，见§8.23。Paper Run创建、美股账户初始化与恢复继续均拒绝六种客户端模式组合，隔离PostgreSQL确认无额外Run/US账户且恢复Run状态不变，见§8.67。此子项不关闭V1.1存储切换、全阶段业务或人工验收。
- [x] V1.1恢复继续与Run启动使用数据库条件状态迁移领取`WAITING→RUNNING`/`QUEUED→RUNNING`，并发调用仅允许一个Worker领取；legacy与stage双写隔离PostgreSQL回归通过，见§8.50。本项只关闭当前V1.1 TestRun领取竞态，不代表跨进程故障恢复或活动存储切换完成。
- [x] V1.1恢复继续写路由已对六种客户端模式注入逐项拒绝（HTTP 422），同一恢复Run保持WAITING，随后合法恢复完成；详见§8.58和§8.67；这只关闭固定隔离Web/API拒绝子项，不代表活动切换或人工验收。
- [x] 当前树V1.1完整code suite退出0，随后Web/API/CLI E2E normal/rejection/recovery 3/3通过；每个Run均由同Run CLI核验并导出结构化Bundle，Portfolio隔离账本匹配。完整当前树复验见§8.68；三个新Run均保持`manualConclusion=NOT_RUN`，不替代人工验收。 共享实现A142变更后的完整代码兼容复验见§8.71，exit 0；本次code suite不新增浏览器或人工验收结论。

- [x] 冻结 Money/Security/Account initialization/account snapshot、Clock 和 TestRun 公共Schema并生成 TS/Python 类型；生成漂移及兼容检查已接入。公共TS/Python类型及8个服务生成副本的字段/required性回归见§8.15、§8.25；服务业务代码是否正确消费各合同仍按P0/P1矩阵逐项核对。2026-10-10 P0消费者映射见[A39矩阵](../../../evidence/audits/2026-10-10-v1-current-gap-matrix-a39.json)：Account/Money/Security实际消费者与Fixture验证已标明；ClockContext公共类型未被V1直接导入，但V1.3/V1.5业务命令携带持久化Run时钟，V1.1本地TestRun与公共schema兼容关系在A01时仍开放；A29按后续A46及§8.34–8.41复核，现已用独立投影Schema/OpenAPI和Web/CLI运行时校验消除该路由DTO歧义。共享ClockContext无V1直接类型消费、其他消费者/发布兼容仍开放，见[A29](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a29.md)和[A76矩阵](../../../evidence/audits/2026-10-12-v1-current-gap-matrix-a76.json)。2026-10-11为V1.1 owner-scoped查询建立独立`V11AcceptanceRun`投影契约并让Platform API使用生成类型；该项关闭本地响应与共享TestRun的映射歧义；异步创建202载荷按OpenAPI响应Schema、owner-scoped读取200载荷按V11AcceptanceRun Schema完成运行时校验见§8.35。不关闭其余业务消费者、完整路由/发布兼容矩阵。结论见[消费者边界复核A46](../../../evidence/audits/2026-10-11-v1-v11-acceptance-response-contract-a46.md)、§8.34及§8.35。证据：[P3.1生成入口](../../../evidence/audits/2026-09-24-p3-contract-generation.md)、[P3.7消费者与兼容矩阵](../../../evidence/audits/2026-09-25-p3-7-contract-consumer.md)。
- [ ] 补齐所有跨服务OpenAPI/生成客户端及发布流程；建立并验证服务迁移和分层依赖命令。进展：A股Calendar、Portfolio Account、Platform V1.1 ScenarioRunner、Trade Execution至Portfolio的Fill/预留/结算、Historical Replay至Portfolio账户初始化/快照及至Trade Execution历史下单、Governance至Quant Registry精确批准版本读取已改用生成客户端；2026-10-01为Platform→Market Data分钟CSV import及CSV/Parquet upload生命周期新增8个ServiceBearer/OpenAPI/typed client操作，Platform lint/typecheck/105项单测与V1.1 code suite通过。新增Platform→Decision Governance只读候选Mandate精确版本绑定检查生成客户端，复用同一Bearer/OpenAPI合同；Platform 116项单测、typecheck、contracts:check与docs:check通过。Trade Execution→Decision Governance现有V2.4 Paper授权校验及Platform→Decision Governance V2.4授权创建均已改用生成客户端，Platform V2.4 Fixture账户初始化/快照读取及Trade Execution readiness、执行提交、原单查询均使用生成客户端；V2.4完整code suite在这些变更后受控PASS，隔离HTTP/PG/Chromium/同Run CLI和arm64 readiness边界通过。另将Platform V1.1账户详情及美股账户初始化接入Portfolio Account客户端，V1.1完整code suite通过。DC-06项目数据分页/导出现改用ProjectToken身份的2操作生成客户端，无凭证401/跨项目403和真实隔离HTTP/PG smoke通过；Platform 139项单测/typecheck与Market Data集成通过，随后V1.1完整code suite受控退出0。Registry契约身份范围已与Quant运行门禁一致。Trade Execution与Historical Replay隔离集成、身份矩阵、V2.3/V2.4/V3.2完整code suite通过。2026-10-01新增`pnpm service:layers -- --service portfolio-risk-service`：Portfolio Risk补齐`ports/account-repository.ts`，AccountService改为依赖端口而非Postgres具体适配器；分层规则检查、3项规则测试及服务typecheck通过，V1.1 code suite受控exit 0。2026-10-01随后为Platform API新增stage-run、test-run和observation三个repository ports，应用层不再引用Postgres适配器；Postgres实现显式implements端口。layer检查器纳入Platform API并通过；服务typecheck及139项单测通过，V1.1完整code suite受控exit 0。worker目录参数也已纳入layer检查器命名规则。2026-10-01为Market Data收敛全部PostgreSQL adapter、领域策略和bootstrap组合根，并将分层门禁加入baseline；其V2.2完整code suite受控通过。Trade Execution Outbox已有独立应用服务和FakeBroker/Portfolio端口；Platform Qlib Artifact已有仓储端口。Research Automation现将V3.1 ArtifactRef规则放入domain、文件内容存储放入adapter，应用使用ArtifactContentStore/ArtifactRefRepository ports，Research分层检查及规则测试接入baseline；服务build、173单测、23隔离PG集成、V3.1完整code suite受控通过。2026-10-01新增Decision Governance五层拆分：应用服务依赖授权Repository/ApprovedRegistry端口，PostgreSQL与生成Quant Registry client分别位于adapter，HTTP组合根位于bootstrap，稳定src/main入口保留；layer scan已加入baseline，应用边界测试覆盖身份拒绝、BACKTEST/FAKE限界及授权首次消费/幂等重放。服务build及22项单测、五层扫描、完整V1.1 code suite与Governance/Replay/Quant隔离身份HTTP/PG smoke均通过；证据见[Decision Governance分层审计](../../../evidence/audits/2026-10-01-w1-decision-governance-layer-boundary.md)及[SHA-256](../../../evidence/audits/2026-10-01-w1-decision-governance-layer-boundary.sha256)。总体仍未覆盖其余服务分层、所有跨服务调用、迁移/发布自动化，且Artifact各Producer仍未统一。2026-10-10责任核对已人工映射本阶段第2/7/8节23条要求的服务主责、协作及外部操作类别，见[责任审计A01](../../../evidence/audits/2026-10-10-v1-v11-responsibility-a01.md)；仅清晰化责任，不关闭客户端发布矩阵、Artifact政策/活动切换、旧Run处置或用户验收。证据：[Research Artifact分层审计](../../../evidence/audits/2026-10-01-w1-research-artifact-layer-boundary.md)（[SHA-256](../../../evidence/audits/2026-10-01-w1-research-artifact-layer-boundary.sha256)）。 2026-10-12为V1实际调用依赖整理provider-before-caller发布顺序、逐库迁移与Worker启用/回退的独立门禁，见[服务发布顺序与回退准备Runbook](../../operations/v1-service-release-order.md)；该材料PREPARED/NOT_AUTHORIZED，不代表活动部署或回退已验证。 2026-10-12 P0语义复核[A95](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a95.md)确认客户端测试引用、身份探测和隔离迁移均为局部证据；完整路由/副作用/兼容矩阵及活动发布回退仍开放，不预勾选本任务。
  子项进展（2026-10-10）：Platform→Portfolio Account六项V1操作的传输合同见§8.27；Historical Replay→Portfolio账户初始化/快照读取客户端的身份、路径与请求体见§8.28；Platform→Historical Replay普通启动、读取、控制和UNKNOWN恢复操作见§8.29。其余调用方/负向副作用/发布回退核对仍开放，父任务保持未完成。 2026-10-10 P1增量：实际执行`pnpm contracts:check`，203个Schema的生成类型/8服务副本、兼容/OpenAPI检查及30个客户端生成器的生成/漂移注册均通过；注册测试2/2。该项只证明生成器已纳入检查，不关闭V1-only调用方/路由身份/发布和迁移完整矩阵，父任务仍OPEN，详见[A40](../../../evidence/audits/2026-10-10-v1-current-gap-matrix-a40.json)及[执行日志](../../../evidence/audits/2026-10-10-v1-contract-generator-drift-p1-a01.log)。
  [x] Portfolio Risk七条准入路由×四caller身份的28次隔离HTTP拒绝探测均为401/403，六类业务事实计数无变化；路线/方法单测、V1.1与V1.3完整code suite通过，详见§8.31/A18。
  [x] Portfolio `POST /internal/v1/accounts/initialize` 六种环境/券商组合已通过真实HTTP+隔离PostgreSQL矩阵；PAPER/FAKE与BACKTEST/FAKE成功并精确持久化，其余四种403，详见§8.72。只关闭账户初始化模式边界，不关闭全V1路由矩阵。
  [x] Portfolio预留、Fill、费用更正、预留解除四条账务写路由对六种客户端模式字段注入均返回422且无账务副作用，详见§8.73。只关闭该四路由矩阵。
  [x] Portfolio结算路由对六种模式字段注入均返回400，且待结算应收款与账户快照逐次不变；随后合法结算精确成功，详见§8.74。

前述跨服务调用与分层增量的逐项审计：[Platform Portfolio客户端](../../../evidence/audits/2026-09-30-v11-portfolio-account-client.md)、[Trade Execution Portfolio客户端](../../../evidence/audits/2026-09-30-v11-trade-portfolio-client.md)、[Replay Portfolio与Trade客户端](../../../evidence/audits/2026-09-30-v23-replay-portfolio-client.md)、[Quant Registry客户端与契约校正](../../../evidence/audits/2026-09-30-v32-quant-registry-governance-client.md)、[Market Data分钟import客户端](../../../evidence/audits/2026-10-01-w1-market-data-minute-import-client.md)、[候选Mandate绑定客户端审计](../../../evidence/audits/2026-10-01-w1-candidate-mandate-client.md)、[Paper授权客户端审计](../../../evidence/audits/2026-10-01-w1-paper-authorization-client.md)、[Platform Paper授权创建客户端审计](../../../evidence/audits/2026-10-01-w1-platform-paper-authorization-client.md)、[Platform账户初始化客户端审计](../../../evidence/audits/2026-10-01-w1-platform-paper-portfolio-client.md)、[V2.4变更后回归](../../../evidence/audits/2026-10-01-w1-v24-client-regression.md)、[Paper readiness客户端审计](../../../evidence/audits/2026-10-01-w1-platform-paper-readiness-client.md)、[V1.1 Platform账户调用审计](../../../evidence/audits/2026-10-01-w1-platform-v11-account-clients.md)、[DC-06项目交付客户端审计](../../../evidence/audits/2026-10-01-w1-market-data-project-client.md)、[Portfolio Risk分层依赖增量](../../../evidence/audits/2026-10-01-w1-portfolio-risk-layer-boundary.md)、[Platform API分层依赖增量](../../../evidence/audits/2026-10-01-w1-platform-api-layer-boundary.md)、[Market Data完整分层审计](../../../evidence/audits/2026-10-01-w1-market-data-layer-boundary-increment.md)。

- [x] V1.1七个受保护Platform API操作已逐路由验证匿名401和伪造用户403，并将控制器源码清单核对及探针纳入隔离stage Harness；完整V1.1代码和Web/API/CLI E2E退出0。见[身份边界审计](../../../evidence/audits/2026-10-09-v11-platform-identity-boundary-a01.md)。

2026-10-02隔离复验：`pnpm verify:stage -- --stage V1.1 --suite code`退出0；`pnpm test:integration:v11-stage-storage`退出0，stage存储模式下Chromium normal/rejection/recovery 3/3通过，三个Web TestRun均由同ID经CLI只读核对，恢复仅重启已核验的隔离Portfolio容器。随机项目、容器、卷、网络和镜像已清理。该复验不等于活动API切换/回退、用户生产会话或新增范围人工验收；阶段仍为PARTIALLY_IMPLEMENTED。详见[V1.1隔离存储复验](../../../evidence/audits/2026-10-02-w1-v11-stage-storage-rerun.md)及[SHA-256](../../../evidence/audits/2026-10-02-w1-v11-stage-storage-rerun.sha256)。
- [x] Compose core 与真实 PostgreSQL 已用于账户持久化；组合服务 CN/US 模拟账户、现金/持仓及幂等初始化已有工程和运行证据。当前树真实隔离PostgreSQL新增CN_A/CNY与US_EQUITY/USD分账、同键重放/冲突、跨owner读拒绝；Portfolio HTTP smoke验证LIVE初始化返回403且零副作用。详见[当前账户身份账本矩阵](../../../evidence/audits/2026-10-07-p1-account-identity-ledger-matrix.md)。既有账户详情证据：[P3.4](../../../evidence/audits/2026-09-24-p3-4-account-detail.md)、[P3.5双市场账户](../../../evidence/audits/2026-09-25-p3-5-dual-market.md)。 2026-10-12真实PostgreSQL还直接断言CN/US新账户快照`positionCount=0`且`account_positions`无行（§8.59；完整V1.1隔离栈/code suite/Web API CLI 3/3通过）。
- [x] Portfolio Risk要求Platform API、Trade Execution、Historical Replay三份强且互不相同的服务Bearer；请求授权与ready探针共用fail-closed检查，Compose也拒绝缺少任一caller token。定向单测及V1.1/V1.3完整代码套件通过，见§8.30。
- [ ] 完成通用Artifact存储与全链路引用/交付；进展：新增`common/artifact-ref.schema.json`并将TestRun `artifactRefs`改为强类型数组，TS/Python生成类型、兼容规则及精确结构测试均接入全局契约检查；V3.1 owner-scoped TestRun API将研究引用投影为公共`ArtifactRef`，Exporter核对绑定与内容Hash后导出。V3.1支持不可变`expiresAt`和EXPIRED终态；`FileArtifactStore.read`逐次验证SHA-256。2026-10-01新增`@stockquant/artifact-content-store`不可变内容内核，拒绝路径穿越、符号链接目录及Hash不符；Research Automation与Platform/Qlib共用同一`research-artifacts-v1`内容卷，Qlib新引用将内容字节移出JSONB，旧JSONB/旧文件路径继续可校验读取。随机隔离PostgreSQL + Qlib Worker + Platform/Web/CLI/evidence-export端到端验证通过；Research/Platform各自旧内容兼容、篡改拒绝与路径安全测试通过。2026-10-03共享字节读取/发布新增`O_NOFOLLOW`普通文件句柄检查，匹配Hash的Artifact地址符号链接现被拒绝；共享包5/5、Research构建及203单测、Platform构建及166单测通过，首轮沙箱回环监听失败保留并经受控重跑通过。2026-10-12共享内容发布改为同目录临时文件写完并fsync后原子链接；16路相同地址并发发布全部成功且只留单一完整地址文件，V1.1完整code suite exit 0，详见§8.64。2026-10-12共享内容发布/删除在数据文件与父目录项变更后均同步目录，完整V1.1套件复验退出0；Linux ARM64无网络容器中包测试6/6，见§8.65、§8.66及当前源码清单A03。此项补持久性边界，不改变Artifact保留政策、回收授权或活动卷状态。详见[叶子符号链接拒绝审计](../../../evidence/audits/2026-10-03-w1-artifact-leaf-symlink-rejection.md)及[历史源码快照SHA-256](../../../evidence/audits/2026-10-03-w1-artifact-leaf-symlink-rejection.sha256)。尚未完成共享过期/保留策略批准与调度、其他Artifact Producer盘点/迁移、过期字节物理清理、活动部署切换/回退及新增人工验收。见[本轮共享内容后端审计](../../../evidence/audits/2026-10-01-w1-common-artifact-content-store.md)与[SHA-256](../../../evidence/audits/2026-10-01-w1-common-artifact-content-store.sha256)；此前[V3.1 Artifact导出](../../../evidence/audits/2026-10-01-w1-v31-artifact-evidence-export.md)及[生命周期](../../../evidence/audits/2026-10-01-w1-artifact-expiry-lifecycle.md)保留为历史证据。

2026-10-02补充：共享内容存储物理删除现要求普通文件与地址Hash匹配；Research失败发布回滚仅删除新共享路径、不触碰只读legacy路径。删除完整性与回滚隔离分别见[审计1](../../../evidence/audits/2026-10-02-w1-artifact-removal-integrity.md)和[审计2](../../../evidence/audits/2026-10-02-w1-artifact-rollback-boundary.md)。上述是安全前置，Artifact保留政策审批、跨服务引用保护/调度、其他Producer迁移、活动切换/回退与新增人工验收仍未完成。


2026-10-02跨服务调用补充：Research Automation→Quant Research提交V3.2 PromotionRequest现使用`quant-promotions.v1`生成客户端并纳入`contracts:check/generate`；完整V3.2 code suite exit 0，但该结果仅代表隔离代码/数据库/readiness验证，V3.2业务验证与用户验收仍NOT_RUN。详见[客户端审计](../../../evidence/audits/2026-10-02-w1-quant-promotion-submit-client.md)及[SHA-256](../../../evidence/audits/2026-10-02-w1-quant-promotion-submit-client.sha256)。
- [x] 平台 API owner 身份、健康/能力查询、验收运行与证据读取已有实现；V1.1 stage模式 normal/rejection/recovery 在隔离 PostgreSQL 和真实 Chromium Web 中完成同run CLI只读核对。证据：[V1.1统一存储代码与Web套件](../../../evidence/audits/2026-09-26-v11-stage-store-code-suite.md)。
- [ ] 将V1.1统一TestRun模式按维护窗口部署到活动API并验证回退；活动Compose仍为`legacy`，隔离套件不证明生产切换。2026-10-09为V1.1代码门禁增加隔离PostgreSQL migration/dual-store/persistence集成回归，历史RUNNING/WAITING保留、重复迁移幂等、冲突回滚、部分双写回滚及owner HTTP隔离通过；最终`pnpm verify:stage -- --stage V1.1 --suite code`退出0，证据：[A04运行摘要](../../../evidence/audits/2026-10-09-v11-code-suite-a04.json)与[完整门禁日志](../../../evidence/audits/2026-10-09-v11-code-suite-a04.log)。活动迁移、备份恢复/回退、调用矩阵和本项整体验收仍未完成。当前活动库49 legacy/44 unified；已在只读恢复副本补齐5条、验证幂等与双写。2026-10-07新增随机隔离PostgreSQL持久化回归：legacy迁移/历史保留、幂等与冲突回滚、stage owner读取、双写和部分写失败原子回滚、HTTP owner 200/跨owner 403全部通过；不接触活动库。切换步骤、停止条件、回退和当前差额见[存储切换Runbook](../../../docs/operations/v11-test-run-storage-cutover.md)、[恢复副本复演审计](../../../evidence/audits/2026-10-01-w1-v11-current-snapshot-migration.md)及[当前隔离持久化复验](../../../evidence/audits/2026-10-07-v11-storage-persistence-rerun.md)。2026-10-11活动容器状态/挂载与仓库Compose漂移的最新只读复核见[§8.49](#849-活动-platformpostgresqlartifact-挂载只读复核2026-10-11)及[机器报告A04](../../../evidence/audits/2026-10-11-v1-active-runtime-preflight-a04.json)；本项仍NOT_READY/NOT_AUTHORIZED/NOT_DEPLOYED。
- [x] Qlib/RD-Agent镜像基线、Mac/Docker架构及资源边界有历史记录；amd64仿真与当前Qlib锁版运行探针有单独工程证据。原生Ubuntu兼容、资源压力及真实RD-Agent运行仍未验收。 2026-10-10新增当前工作区Platform API `linux/arm64`容器构建/Node 24.1.0探针PASS，宿主`darwin/arm64`、未仿真，详见[本次报告](../../../evidence/audits/2026-10-10-v11-linux-arm64-compat-a01.json)及[日志](../../../evidence/audits/2026-10-10-v11-linux-arm64-compat-a01.log)。该验证只覆盖Platform API镜像，Ubuntu/Qlib/RD-Agent及资源压力仍NOT_RUN。 2026-10-10当前工作区Platform API `linux/amd64`容器构建/Node 24.1.0探针PASS，宿主`darwin/arm64`、Docker Desktop仿真，详见[本次报告](../../../evidence/audits/2026-10-10-v11-linux-amd64-compat-a01.json)及[日志](../../../evidence/audits/2026-10-10-v11-linux-amd64-compat-a01.log)，SHA-256 `2776bfa6caefae9e1183f0a49320650fa9033e40c2c28c8b3e72d81cf580498c`。


2026-10-09 V1身份边界回归：Governance授权、Historical Replay Worker及Quant Research的HTTP身份/路由scope smoke已改为通过随机隔离PostgreSQL运行，并纳入V1.2、V1.3、V1.4代码套件。三个完整套件改后分别exit 0：[V1.2](../../../evidence/audits/2026-10-09-v12-service-auth-code-suite-a02.log)、[V1.3](../../../evidence/audits/2026-10-09-v13-service-auth-code-suite-a01.log)、[V1.4](../../../evidence/audits/2026-10-09-v14-service-auth-code-suite-a01.log)。单独HTTP smoke确认随机容器/网络清理。此项补强身份负测，不代表所有V1操作与OpenAPI逐项匹配或发布/回退通过；本节整体任务和第7节保持未关闭。

- [x] 增量客户端合同：Platform→Trade Execution外部FakeBroker订单观察操作已逐字段直测路由、载荷、服务身份/Bearer和超时；见§8.33。完整V1.3代码套件通过；此子项不关闭P1/A04全量调用/发布矩阵、活动切换或人工验收。
- [x] 增量拒绝响应合同：Platform→Trade的十个V1生成客户端操作在下游HTTP 409时均保留状态码与结构化错误体；定向测试12/12、Platform typecheck和V1.3完整code suite通过，见§8.70。只关闭该客户端边响应传递子项，V1.1-S2-L14完整调用/副作用/发布矩阵仍OPEN。

- [x] 2026-10-13当前树核心复验：V1.1 normal/rejection/recovery 3/3、账户与Portfolio账本MATCH、同Run CLI/export和隔离清理通过；见[V1主功能当前树复验](../../../evidence/audits/2026-10-13-v1-current-core-e2e-a01.md)。本轮自动验收仍需用户确认。

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

当前交付清单按2026-10-13已批准的主要功能范围核实；PASS仅覆盖本轮范围。全平台消费者/发布矩阵、活动旧栈存储切换、自动Artifact生命周期及Ubuntu实机按既定范围延期。下方早期增量说明中的“未完成/待验收”是对应日期历史，当前结论以上方状态及本节2026-10-14确认记录为准。

以下勾选只记录本阶段交付进度，不能代替第2节逐项开发任务或版本验收结论。开发者凭实现/实测证据勾选开发项；“人工验收”仅在用户实际确认后勾选，不预填PASS。

2026-09-27增量：Calendar响应Schema/Fixture/兼容矩阵/OpenAPI及两个服务生成类型通过`pnpm contracts:check`；Market Data build、Platform API typecheck、Market Data 60项单测通过；`pnpm --filter @stockquant/market-data-service calendar:http-smoke`退出0，隔离无数据库服务对交易日/休市日/覆盖外日期分别返回200与预期枚举，无效日期返回400。此局部契约交付不代表本节整体完成。

- [x] 契约、数据结构、场景定义和预期结果已冻结。核心公共Schema已执行`contracts:check`（含TS/Python字段测试及生成漂移检查），当前树V1.1 normal/rejection/recovery三场景E2E与同Run CLI/export均通过；每个Run有2项PASS断言。详见[当前E2E日志](../../../evidence/audits/2026-10-09-v11-core-contracts-current-e2e-a01.log)及[核心Schema套件日志](../../../evidence/audits/2026-10-09-v11-core-schema-parity-code-suite-a01.log)。本轮三个Run的人工结论均为`NOT_RUN`，本勾选只代表合同和可执行场景交付已冻结。
- [x] 第2节当前主要功能范围完成，真实组件/Fixture边界明确；依据§8.68–8.69、§8.72–8.75。未勾选的广泛父项按本轮范围拆分，延期部分仍未通过。
  A98语义复核确认第2节L14（完整跨服务/发布矩阵）、L20（引用权威与活动卷恢复）、L27（活动统一TestRun存储切换/回退）仍未关闭；code suite通过不等于这些交付项完成，故本项保持OPEN。见[A98复核](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a98.md)。
- [x] 正式Web功能页及验收中心正常/异常/恢复场景完成：当前树隔离Chromium 3/3、三个TestRun同Run CLI与结构化Bundle核验及截图SHA记录完成，见§8.68和[最新E2E日志](../../../evidence/audits/2026-10-12-v11-post-current-tree-web-e2e-a07.log)。三个Run的`manualConclusion`仍为`NOT_RUN`，不代表用户签收、活动部署或V1.1整体完成。
- [x] 第8节本地运行命令、动态Web URL、Fixture路径/Hash、配置、超时及恢复/停止说明已实测，见§8.68–8.69、§8.72–8.75；Ubuntu URL/主机配置按决定延期，不以本地地址代填。
- [x] 开发者按第8节从准备到导出亲自执行，保存代码版本、退出码、截图/Trace和断言证据。
- [x] 重复/恢复及适用观察期验证完成，未覆盖项如实记录。
- [x] 用户曾于2026-09-09确认当时的本地ARM64验收范围（见[验收表](./99-acceptance.md)）；此勾选仅记录该历史范围，当前新增范围仍NOT_RUN，不代表本轮或当前版本签署。
- [x] 操作说明与限制已更新，[本版验收表](./99-acceptance.md)已同步。
- [x] V1.1 Platform受保护的七个业务API端点均有匿名/伪造用户拒绝断言；完整隔离套件通过。此项不涉及明确公开的本地session获取、logout或静态capabilities接口。
- [x] 共享Trade Execution请求体边界变更后，V1.1完整代码套件复验通过，含Trade/Portfolio隔离HTTP+PostgreSQL、服务身份门禁与V1.1迁移CLI；[日志](../../../evidence/audits/2026-10-09-v11-trade-outbox-compensation-compat-code-suite-a01.log)。此兼容回归不证明V1.1活动存储切换、回退或整体阶段关闭。
- [x] V1.1 Platform Run/account命令拒绝客户端写入status/cash/positions，完整隔离Web/API/CLI与code suite通过，见§8.23；本阶段整体后端交付仍OPEN。
- [x] V1.1恢复继续入口的三种危险模式注入均拒绝且不推进Run；当前树隔离Chromium/Web/API/CLI E2E 3/3与V1.1完整code suite均exit 0，详见§8.58。新增Run人工结论仍NOT_RUN。
- [x] V1.1 Run创建、美股账户初始化、恢复继续三个接受入口逐项拒绝六种客户端模式组合；Run/账户/恢复状态经隔离PostgreSQL或Run读取断言无副作用，完整V1.1阶段入口exit 0、浏览器3/3，见§8.67。该子项不关闭跨版本服务/Worker/页面全量矩阵，新增Run人工结论NOT_RUN。
- [x] Portfolio账户初始化真实HTTP+PostgreSQL六模式矩阵通过，集成7/7、路由认证拒绝32/32，隔离资源清理核验通过，见§8.72。该子项不关闭其它V1服务/Worker/Web写路径及整体后端交付。
- [x] Portfolio预留、Fill、费用更正及预留解除四条账务写路由六模式注入均HTTP 422，24次拒绝后的PostgreSQL事实无变化，见§8.73；结算和其他路由/服务端写入口仍按L17清单继续核验。
- [x] Portfolio结算路由六模式注入均HTTP 400，拒绝未释放待结算款；其后合法请求精确结清，见§8.74。未因此关闭其余服务/Worker/Web写路径。
- [x] 当前树完整V1.1隔离阶段入口 `pnpm test:e2e -- --stage V1.1` exit 0；normal/rejection/recovery 3/3、同Run CLI/export及Portfolio账本核对通过，精确清理完成，详见§8.61和审计日志。新增Run人工结论仍NOT_RUN。
- [x] 核心公共Schema六类字段及required性回归覆盖TS/Python包输出和8个服务生成类型副本；V1.1完整代码套件通过，见§8.25。该项验证类型产物，不代表服务业务消费路径或全阶段交付已完成。
- [x] Platform→Portfolio Account生成客户端六项V1操作（initialize/get snapshot/reserve/resolve/fill/fee correction）均有直接HTTP method、路径编码、Platform身份/Bearer及请求体断言；完整V1.1 code suite复验通过，见§8.27。仅关闭该客户端传输合同子项；其余跨服务操作/发布矩阵仍开放。
- [x] 增量客户端拒绝响应传递：十个Platform→Trade V1操作均保留下游HTTP 409和结构化`IDEMPOTENCY_CONFLICT`错误体；定向测试12/12、Platform typecheck及V1.3完整code suite通过，详见§8.70及[A140](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a140.md)。这不是服务端全路由行为或发布验收。

2026-10-09补充：新增V1.1 code suite隔离迁移/统一存储回归已实测通过（[日志](../../../evidence/audits/2026-10-09-v11-code-suite-a04.log)）。这补充迁移数据库证据；未勾选活动部署、回退或整体后端交付项。

- [x] V1.1当前共享存储/Platform/认证工作树完整code suite复验通过，脚本66/66、隔离迁移/持久化和服务边界smoke通过，活动服务未连接、临时资源清理已确认；见§8.26及[完整日志](../../../evidence/audits/2026-10-10-v11-current-tree-code-suite-a01.log)，SHA-256 `5df1d49e48b8adf73bce5eee1d4df1060b954bdf6c5cc05884780de4f1583602`。仅为工程兼容回归，不表示活动切换、旧Run处置、Ubuntu或人验通过。

- [x] 增量交付：外部FakeBroker订单观察生成客户端合同测试、V1.3完整代码回归及本文操作记录已完成（§8.33）；不代表阶段或版本验收通过。
- [x] V1.1四个owner-scoped Run读取调用均在进入页面状态前运行canonical `V11AcceptanceRun` JSON Schema校验；合法/漂移单测、Web生产构建及normal/rejection/recovery真实隔离浏览器回归通过（§8.40）。其他服务/版本消费者和人工验收仍开放。
- [x] 浏览器收到HTTP 200但字段不符合V1.1 Run Schema时，在错误态显示运行时校验错误；Playwright注入额外字段并验证错误信息（§8.41）。该负测不代表后端发生了真实Schema回归。
- [x] 共享证据导出GET合同覆盖V1.1专用投影及存储StageRun投影，并强制两种形态均保留`manualConclusion=NOT_RUN`；实际Exporter的V1.2/V1.4专用路由也已核清（§8.47）。这只关闭共享导出路由声明子项，不代表五阶段实际导出或版本验收完成。
- [x] 隔离Stage存储真实API以同一V1.1 Run 导出证据，响应匹配阶段投影并保留`manualConclusion=NOT_RUN`；normal/rejection/recovery浏览器与CLI同Run回归、完整代码套件和精确资源清理通过（§8.48）。此项为自动证据，不代表用户签收。
- [x] 当前V1.1隔离Stage存储回归证明legacy与stage数据库对并发恢复请求均只授予一个`WAITING→RUNNING`领取者，normal/rejection/recovery浏览器流程、同Run CLI和精确资源清理通过，见§8.50；用户人工结论仍为NOT_RUN。
- [x] 当前树完整V1.1阶段入口/交付复跑由Chromium完成三个固定场景、CLI核对同一Run、读取结构化导出并检查隔离PostgreSQL领域账本；精确随机容器、卷、网络和镜像均移除，见§8.61。它不勾选人工验收，也不证明活动存储切换或Ubuntu交付。
- [x] 2026-10-12当前工作树共享服务变更后重新执行V1.1完整code suite与三场景Web/API/CLI E2E；normal/rejection/recovery同Run Bundle与CN初始现金/零持仓账本核对均通过，隔离服务/数据库资源精确清理，见§8.68。新增Run不构成人工签收。

- [x] A142共享实现变更后的完整V1.1 code suite受控执行exit 0；迁移/双存储/并发领取/HTTP持久化和隔离清理通过，见§8.71。此为代码兼容复验，不关闭活动存储切换、Ubuntu或人验。

- [x] 2026-10-13当前树核心复验：V1.1 normal/rejection/recovery 3/3、账户与Portfolio账本MATCH、同Run CLI/export和隔离清理通过；见[V1主功能当前树复验](../../../evidence/audits/2026-10-13-v1-current-core-e2e-a01.md)。本轮自动验收仍需用户确认。

- [x] 用户于2026-10-14在对话确认当前候选整版V1验收通过，覆盖本阶段本轮范围；候选SHA-256 `132535fbdf2bf1d50e4260e397424b3a47ef949dedcc62e58257c0a5697bd2d4`，代表Run及签署日期见[验收表](./99-acceptance.md)。历史单Run人工结论不倒填。

## 8. 阶段验收操作手册

### 8.1 当前可执行性与验收准备

手册状态：VERIFIED_EXECUTABLE（2026-10-14收口，限已实测的Mac本地主要功能操作；实际执行证据见§8.68–8.69、§8.72–8.75，当前候选整版人工验收已由用户确认）。启动时使用当次输出的动态URL和精确项目名；历史随机URL不能复用。全平台消费者/发布矩阵、活动旧栈存储切换、自动Artifact生命周期及Ubuntu实机按既定范围延期。以前部分验证状态与原操作记录保留于[同步前快照](../../../evidence/audits/2026-10-14-v1-closeout-before-status-sync.json)及下方各次实测记录。

前置服务：平台API、Web、组合服务、真实PostgreSQL、Artifact存储。

固定输入：内置CN/US初始化Fixture；CN初始现金10000 CNY、持仓0，seed=20260907。

| 开发交付时必须填写 | 当前值 |
|---|---|
| 实测代码Commit或工作区Hash/验证日期 | 当前工作树，2026-10-09；本轮关键源码Hash见第8.14节机器报告 |
| 项目根目录、Node/pnpm/Python/uv及Docker版本 | `/Users/huangbosong/Documents/ChatGPT/StockQuant`；Node 24.1.0、pnpm 10.34.5；本轮隔离容器构建使用`desktop-linux`、`linux/arm64`与锁版Node 24.1.0 Alpine镜像。Docker Desktop版本、Python/uv与本项无关，不作本次运行声明 |
| Web基础URL/身份登录或会话建立方式 | 每次运行`pnpm stack:up -- --stage V1.1`打印本次随机Web/API回环地址、isolatedProject和精确停止命令；2026-10-09实测Web `http://127.0.0.1:53152/acceptance/v1/v1.1`、API `http://127.0.0.1:53151`。GET `/api/v1/session`为HTTP 200并签发HttpOnly `sq_session`，身份`acceptance-owner-1`；会话值不写入日志。CLI/Evidence Export仅使用当前隔离会话 |
| 本阶段Web路由 | `/acceptance/v1/v1.1`（容器化Web本次实测） |
| 正式页面的真实入口/跳转链接 | `/` 与 `/acceptance/v1/v1.1`；平台 API `http://127.0.0.1:3000`；组合服务不发布到宿主 |
| Fixture文件/数据版本/确切日期/Hash、规则与成本版本 | `fixtures/v1/v1.1/accounts.json`；`v1.1-accounts-1`；SHA-256 `575d2cb5e674bacbf951d9ca485c7e5c8e49e9d15bbb4623a71fd0c08c3685f4`；FIXTURE/SIMULATION_ONLY；成本/策略不适用 |
| 配置文件及必需环境变量名/非秘密测试值 | 隔离Harness自动生成9个随机PG角色密码并写入`.codex/isolated-stacks/<project>.env`（0600、Git忽略）；PAPER、FAKE、LIVE=false，真实源/模型凭据未注入；`.env.local`不作为本次测试密码来源 |
| 外部故障目标及可执行命令、恢复/隔离清理入口 | 自动场景恢复用`pnpm test:e2e -- --stage V1.1`，Harness将项目名作为`COMPOSE_PROJECT_NAME`并比对精确Portfolio容器ID后重启；交互栈关闭必须使用本次输出的`pnpm stack:down -- --project <isolatedProject>`，缺少/无效项目ID时拒绝执行 |
| 预期耗时、轮询超时、实际观察期/预算 | Web/API最多等待30秒健康检查；E2E recovery含重启约15秒；运行中的交互栈无后台自动期限，由操作者明确执行精确stack:down；无真实观察期/模型预算 |

### 8.2 初始化、随机隔离启动与清理（已实测）

在上表填写的项目根目录运行；工具版本按锁文件/项目说明准备。当前V1.1隔离交互栈已实现并在本轮实测；不得改用默认主Compose项目验收。Harness生成仅供该随机栈使用的PG凭据；保持FAKE券商与模拟账户，不加载真实模型或行情凭据。

```bash
# 终端A：先确认实际执行目录为项目根目录；输出含随机Web/API URL、project ID和精确stop命令
pwd
pnpm stack:up -- --stage V1.1
```

预期：命令等待随机项目内PostgreSQL、Portfolio、Platform、容器化Web健康后退出0，并输出实际URL、`acceptance-owner-1`身份方式及`stack:down -- --project <ID>`清理命令。Web和API端口绑定`127.0.0.1`随机空闲端口；PG密码文件权限0600；不存在对固定`stockquant-v12` Compose项目的默认操作。Ubuntu部署仍需另补目标主机发布命令和实际证据。

终端A关闭交互环境时，复制本次`isolatedProject`值执行以下精确清理。此命令只接受`stack:up`登记的随机V1.1项目，移除该项目容器、命名PG卷、网络和随机凭据文件；不指定项目或提供其它项目时以退出码2拒绝。

```bash
read -r isolated_project
pnpm stack:down -- --project "$isolated_project"
```

初始化在验收中心“准备隔离运行”完成；CLI场景入口也负责同样的准备，两者调用同一业务API。准备后记录testRunId、accountId、namespace及Fixture/DataVersion；初始化业务本身是测试对象时不得预先完成被测动作。缺源/凭证/历史数据时显示缺项，不静默换成Fake并报真实场景通过。

### 8.3 Web逐步操作及预期结果（按钮经Chromium实测）

1. 登录上表实际Web地址，进入“开发验收中心→V1→V1.1”；检查页面版本、模拟模式、服务能力与固定输入。
2. 每个场景点击“准备隔离运行”，核对参数后记下testRunId；正常/异常/恢复使用独立运行，场景内部的重复或恢复操作继续使用原运行及业务幂等键。
3. 按下表执行实际页面操作。每个场景点击“准备隔离运行：<scenario>”；预期必须从业务明细读取，不能只看“任务完成”。

| 场景ID（阶段内唯一） | 场景 | 点击顺序/输入 | 预期结果与核对点 |
|---|---|---|---|
| normal | 初始化幂等 | 打开`/acceptance/v1/v1.1`，点击“准备隔离运行：normal”；等待TestRun状态`COMPLETED`。 | Web显示`V1.1-ACCOUNT-INIT-001`和`V1.1-ACCOUNT-IDEMPOTENCY-001`均PASS；期初CNY现金10000、持仓0、同键重放不重复建账。 |
| rejection | 初始化冲突/越权 | 点击“准备隔离运行：rejection”；等待状态`COMPLETED`。 | `V1.1-ACCOUNT-AUTHORIZATION-001`与`V1.1-ACCOUNT-CONFLICT-001`均PASS；越权被拒、幂等键异载荷不覆盖原账。 |
| recovery | 隔离服务重启恢复 | 点击“准备隔离运行：recovery”；由受控Harness只重启经项目ID和容器ID双重核验的隔离Portfolio容器，等待健康检查恢复。 | 原TestRun继续并`COMPLETED`；`V1.1-RECOVERY-001`与`V1.1-RUN-ISOLATION-001`均PASS；未操作活动容器/卷。 |

4. 长任务刷新/关闭再打开后的人工检查属于独立验收项；本轮自动E2E没有代替该检查，须由验收者完成并记录截图与业务ID。

当前工作树复核（2026-10-12）：在当前源文件版本下重新执行`pnpm test:e2e -- --stage V1.1`，normal/rejection/recovery 3/3通过；三个新Run分别为`8b250377-6207-4320-a0ac-6a4bd09db2a5`、`79616f50-aa8b-4ba7-a2dc-d20c1d814622`、`bbb31707-aaaf-423a-852b-c45247b72221`，均由同Run CLI `--check-only`与证据导出验证。截图哈希见[截图Manifest](../../../evidence/audits/2026-10-12-v11-browser-captures-sq-v11-stage-97d041d9772cb1bd89f8/manifest.json)，完整运行见[§8.68](./01-environment-and-web-center.md#868-当前树完整v11-code-suite与webapicli-e2e复验2026-10-12)及[当前日志](../../../evidence/audits/2026-10-12-v11-post-current-tree-web-e2e-a07.log)。此前BuildKit阻塞与旧E2E源Hash差异保留为历史，不再代表当前执行状态。刷新/关闭浏览器后的人工持续观察仍未由此自动化验证，当前范围人工验收保持`NOT_RUN`。
5. 每项记录实际结果、截图与业务ID。异常场景“预期拒绝”被正确验证时断言可PASS，但被测业务操作仍显示拒绝；若意外接受则断言FAIL。

### 8.4 命令行复验、相同运行核对与结构化导出（已实测）

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
pnpm evidence:export -- --stage V1.1 --run "$acceptance_run_id"
 echo $?
```

check-only仅查询此运行后端事实并追加检查证据，不创建新订单、不重放成交或发起模型调用；空ID/错误stage/越权run必须拒绝。导出只含脱敏数据，输出实际目录和Manifest Hash，不自动勾选人工验收。当前E2E会从Web测试上下文取得当前HttpOnly session cookie，仅在子进程内用于同Run读取/导出，不输出cookie值；手工运行export时，`STOCKQUANT_EVIDENCE_SESSION_COOKIE`必须来自当前已认证本地会话。端到端normal/rejection/recovery分别产生新TestRun并导出独立证据包。

本阶段代码测试覆盖要求：真数据库初始化/重启/幂等集成测试、生成契约检查、浏览器初始化与证据持久化E2E。 在交付时把映射到的实际Domain/DB/契约/服务内测试命令补入本节，注明执行目录、测试文件或套件、退出码和报告；verify:stage必须展示实际调用的测试清单，不能空壳返回0。Python服务使用自身锁定环境，不串用其他服务虚拟环境。

### 8.7 统一存储模式隔离复验（2026-09-26）

此复验使用 `infra/compose/docker-compose.v11-integration.yml` 创建独立 PostgreSQL、Portfolio Risk 与 Platform API，API 明确设为 `STOCKQUANT_V11_RUN_STORAGE=stage`；不得把 recovery 步骤直接指向活动项目。

**安全说明：下方`sq-v11-stage-web`固定项目名、32801/32802固定端口及无随机凭据的命令属于2026-09-26历史执行记录，禁止在当前环境照抄，也不得对该固定项目执行清理。当前重跑只使用`pnpm test:integration:v11-stage-storage`随机项目入口；该Harness为每次运行生成随机项目、凭据、端口并核验精确资源清理。当前源码复核见[A11](../../../evidence/audits/2026-10-11-v1-gap-matrix-semantic-review-a11.md)。完整构建、lint、全仓单测、契约及 normal/rejection/recovery 后端集成可通过以下自动清理入口重跑：

```bash
pnpm test:integration:v11-stage-storage
```

预期退出码为0，输出 `V1.1 code`、`storageMode=stage`、`recoveryRestartTargetVerified=true`、`exactContainersAndVolumesRemoved=true`、`exactImagesRemoved=true`。该入口为9个临时数据库角色生成独立随机密码，只传入随机项目的测试PostgreSQL；构建一次性隔离栈，在运行套件前断言既有 recovery Compose 命令解析到同一个隔离 Portfolio 容器，最后移除并核验精确临时项目的容器、卷、网络和两个应用镜像标签。不得用活动 `.env.local` 数据库密码填充隔离项目。

Web 同 run 的 stage-mode 正常场景已单独用真实 Chromium 复验：独立 Compose 项目名 `sq-v11-stage-web`，API `http://127.0.0.1:32801`，Vite `http://127.0.0.1:5174`。命令如下；执行前须确认这两个回环端口空闲。Playwright 测试从页面读取 TestRun ID，并调用 `scripts/verify-stage.mjs --stage V1.1 --run <同一ID> --check-only`，断言 CLI 返回同一ID及 `COMPLETED`。2026-09-26 执行1/1通过。

```bash
V11_HOST_PORT=32801 V11_WEB_HOST_PORT=32802 docker compose -p sq-v11-stage-web -f infra/compose/docker-compose.v11-integration.yml up -d
STOCKQUANT_PLATFORM_API_URL=http://127.0.0.1:32801 pnpm --filter @stockquant/web dev --port 5174 --strictPort
PLAYWRIGHT_BASE_URL=http://127.0.0.1:5174 STOCKQUANT_PLATFORM_API_URL=http://127.0.0.1:32801 pnpm --filter @stockquant/web test:e2e --grep 'V1.1 normal scenario creates an isolated run'
# 停止 Vite 终端后执行精确清理
V11_HOST_PORT=32801 V11_WEB_HOST_PORT=32802 docker compose -p sq-v11-stage-web -f infra/compose/docker-compose.v11-integration.yml down --volumes --remove-orphans
```

以上独立手动Web栈命令仅为早期正常场景复验记录；当前完整可重跑入口为`pnpm test:integration:v11-stage-storage`，它会自动提供随机数据库密码并完成全部三场景与精确清理。新手动启动时，Compose需要9个隔离PostgreSQL角色密码环境变量；不要从`.env.local`复制正式数据库密码。可先将下列随机值写入权限为0600的临时env文件，再对`up`和`down`均使用`--env-file`，最后删除该文件：

```bash
v11_env_file="$(mktemp)"
chmod 600 "$v11_env_file"
trap 'rm -f "$v11_env_file"' EXIT
node -e 'console.log(`STOCKQUANT_POSTGRES_SUPERUSER_PASSWORD=${require("node:crypto").randomBytes(32).toString("hex")}`); for (const n of ["PLATFORM_API","PORTFOLIO_RISK","TRADE_EXECUTION","TRADE_EXECUTION_TEST","HISTORICAL_REPLAY","DECISION_GOVERNANCE","QUANT_RESEARCH","RESEARCH_AUTOMATION","MARKET_DATA"]) console.log(`STOCKQUANT_DATABASE_PASSWORD_${n}=${require("node:crypto").randomBytes(32).toString("hex")}`)' > "$v11_env_file"
V11_HOST_PORT=32801 V11_WEB_HOST_PORT=32802 docker compose --env-file "$v11_env_file" -p sq-v11-stage-web -f infra/compose/docker-compose.v11-integration.yml up -d
# 执行上文 Vite/Playwright 命令
V11_HOST_PORT=32801 V11_WEB_HOST_PORT=32802 docker compose --env-file "$v11_env_file" -p sq-v11-stage-web -f infra/compose/docker-compose.v11-integration.yml down --volumes --remove-orphans
rm -f "$v11_env_file"
```

随后将 Web rejection 与 recovery 场景纳入同一隔离入口。最终 `pnpm test:integration:v11-stage-storage` 全流程退出0，Playwright 3/3；每个页面运行均以相同 TestRun ID 执行 CLI `--check-only`。recovery 在重启前验证项目名及目标 Portfolio 容器 ID，重启后轮询容器健康检查为 `healthy` 才继续原 TestRun，并核对持久账户、账本及 namespace。早期一次重启后立即查询导致该 Web TestRun 为 `FAILED`；此失败保留在审计中，修正后的健康闸门复验通过。以上证据不部署活动 API，不修改人工签署、观察计数或阶段验收结论。详见[统一存储代码套件及Web同run审计](../../../evidence/audits/2026-09-26-v11-stage-store-code-suite.md)。

2026-09-27 当前工作树复验：同一 `pnpm test:integration:v11-stage-storage` 再次退出0，随机隔离项目 `sq-v11-stage-1ee379fe6834ab09b4f8` 的 stage-mode API 通过 normal/rejection/recovery Web/CLI同run检查，Chromium 3/3；recovery restart target 与隔离Portfolio container ID一致。隔离容器、卷、网络清理并检查无残留。此次不切换活动API；详情见[当前工作树复验审计](../../../evidence/audits/2026-09-27-v11-stage-storage-current-reverification.md)。

2026-09-30 当前工作树复验与隔离初始化修复：首次运行发现该集成Compose挂载通用`postgres-init.sql`，却未给PostgreSQL传入9个隔离角色密码变量，导致临时PostgreSQL退出；该失败记录保留。测试入口现为每个角色生成随机密码，传给随机命名测试项目，并在finally精确删除/核验容器、卷、网络和两枚项目镜像标签。修复后两次完整运行均退出0；normal/rejection/recovery各自创建TestRun，浏览器与`--check-only`读回同一run，Chromium 3/3，recovery只重启核验过的隔离Portfolio容器。最终项目`sq-v11-stage-016bd4e4b840102e4092`资源清理检查通过。该证据仍只验证隔离stage模式，不切换活动API或证明回退部署；记录见[V1.1隔离存储修复审计](../../../evidence/audits/2026-09-30-v11-stage-storage-current-reverification.md)及[SHA-256清单](../../../evidence/audits/2026-09-30-v11-stage-storage-current-reverification.sha256)。

2026-10-11当前树复验：`pnpm test:e2e -- --stage V1.1`实际通过随机命名/随机凭据的stage-mode Harness，完整code suite与normal/rejection/recovery Playwright 3/3均exit 0。Harness输出`storageMode=stage`、`recoveryRestartTargetVerified=true`、精确容器/卷/网络/镜像清理为true；当前Harness源码SHA-256为`6856975ac2786b1e23bad562a7c87e1a1ea736b17b2a2a4ea0d8d0704f04f838`，运行日志见[同Run账本复验a01](../../../evidence/audits/2026-10-11-v11-same-run-db-crosscheck-e2e-a01.log)。这解除“当前Harness未复跑”的历史差异；固定旧项目命令仍禁止执行，活动存储切换/回退、Ubuntu及人工验收继续独立开放。

### 8.5 交叉核对、失败定位与恢复

#### 8.5.1 同Run核对步骤

1. 在Web运行详情记录`testRunId`、账户ID、namespace、Fixture/DataVersion、模式和页面断言。normal场景应见期初现金`10000 CNY`、持仓`0`及初始化幂等断言；rejection应见越权/冲突拒绝且原账户事实不变；recovery使用同一`testRunId`与原幂等键。
2. 从`stack:up`输出复制本次`isolatedProject`及Platform API URL；在浏览器开发者工具Application→Cookies中读取当前API origin的`HttpOnly sq_session`。在项目根目录使用非回显输入，不把cookie放进命令历史、日志、截图或`.env`：

```bash
read -r acceptance_run_id
read -r STOCKQUANT_PLATFORM_API_URL
read -r -s STOCKQUANT_SESSION_COOKIE
printf '\n'
STOCKQUANT_PLATFORM_API_URL="$STOCKQUANT_PLATFORM_API_URL" STOCKQUANT_SESSION_COOKIE="$STOCKQUANT_SESSION_COOKIE" pnpm verify:stage -- --stage V1.1 --run "$acceptance_run_id" --check-only
```

核对CLI返回的ID与Web完全相同，状态/断言/Fixture/模式与预期一致。非零退出或ID不一致时保留Web Trace、CLI stdout/stderr和退出码，不继续导出为PASS。
3. 仅在同Run检查通过后导出该ID；会话cookie仍只由进程环境传递，不输出或写入日志：

```bash
STOCKQUANT_PLATFORM_API_URL="$STOCKQUANT_PLATFORM_API_URL" STOCKQUANT_EVIDENCE_SESSION_COOKIE="$STOCKQUANT_SESSION_COOKIE" pnpm evidence:export -- --stage V1.1 --run "$acceptance_run_id"
```

核验导出`evidence.json`与Manifest逐文件SHA，并确认`manualConclusion=NOT_RUN`直到用户本人确认。
4. 使用`pnpm test:e2e -- --stage V1.1`运行随机隔离Harness；其normal/rejection/recovery浏览器用例在同一TestRun通过Web与CLI核对后，以只读查询将Platform `test_runs`行映射到Portfolio `accounts`、`ledger_entries`和`account_positions`，输出`[V1.1 same-run domain ledger cross-check]`。核验TestRun/owner/account ID一致、`CN_A/PAPER/FAKE`、`10000 CNY`唯一初始现金流水及零持仓；查询仅允许由Harness执行于本轮随机项目。不要在Web容器、活动数据库或未登记项目中手工运行SQL。该检查证明固定V1.1 Fixture的自动化账本映射，不替代本人验收或完整市场规则。

#### 8.5.2 故障定位与恢复约束

先比较Web和CLI的同一`testRunId`、Fixture/DataVersion、环境/券商模式、断言与证据Hash；按运行详情中的Trace ID定位Platform、领域、adapter和持久化错误。页面错误而CLI正确时保留为Web失败；二者都错则保留领域断言失败。缺能力先查`stack:up`输出的真实API `/live`、本次随机Compose项目日志和迁移/Fixture状态；不要使用固定历史项目名。

独立复跑normal/rejection需创建新run；测试幂等/检查点/重启恢复时继续使用原run和原幂等键。恢复只通过随机隔离Harness操作其双重核验的Portfolio容器；不得清空账本、修改余额/订单状态、复用其它项目名或随机更换seed直到通过。故障证据保留，修复后新运行单独记录；真实观察窗口、来源验证和真实模型调用与加速/录制测试分开标注。

### 8.6 验收记录与收尾

| 场景/检查 | Web实际结果与截图 | 命令/退出码/报告 | testRunId/业务ID | 结论 |
|---|---|---|---|---|
| normal | Playwright 通过；Web 创建与展示断言 | `pnpm test:integration`，退出0 | `d5add8bf-ae44-48a8-b726-b4be34ab4278` / `83e6d24e-69f4-400e-85cf-c7cb39e162d8` | PASS（自动+人工确认） |
| rejection（含全部子场景） | API/后端证据通过；Web人工确认通过 | `pnpm test:integration`，退出0 | `24276340-2e5a-4516-a7d0-20f92851754b` / `a5140049-0423-4c50-833f-0dcd250b2db5` | PASS（自动+人工确认） |
| recovery（含实际外部动作） | API/后端证据通过；Web重启后继续确认通过 | `pnpm test:integration`，退出0 | `bdb53484-19b4-4363-a130-eee94761df54` / `fe720260-6ece-428f-854c-5f51b8b70556` | PASS（自动+人工确认） |
| Web同run只读核对与证据导出 | 同一 normal run 已只读查询；导出脱敏 JSON | `pnpm verify:stage -- --stage V1.1 --run d5add8bf-ae44-48a8-b726-b4be34ab4278 --check-only`、`pnpm evidence:export -- --run d5add8bf-ae44-48a8-b726-b4be34ab4278`，退出0 | Manifest `fe6eb9e97d27f99f9ffaa8eae22beea9d13f8e53495ecb9207a927204509748b` | PASS（自动+人工确认） |
| 当前隔离代码套件与Web/CLI normal/rejection/recovery | V1.1 code suite通过；Chromium 3/3；三个浏览器Run同UUID CLI `--check-only`通过；随机资源清理通过 | `pnpm test:e2e -- --stage V1.1`，2026-10-07 exit 0 | TestRuns `fa2bf85a-fb29-4219-89d9-f535b6a3a874`、`774d4367-5a52-4ae2-b4ff-185a02b5cbed`、`acd9fedf-324b-44cf-b248-934613f36091`；详见[入口复验审计](../../../evidence/audits/2026-10-07-p1-v11-stage-entry-rerun.md) | PASS（开发者自动验证） |
| V1.1隔离交互栈与SCRAM PostgreSQL、容器化Web/API和会话 | SCRAM凭据的真实DB服务连接通过code/E2E；Web/API健康；`/api/v1/session` HTTP 200且发出`sq_session`；无项目ID的down返回2；此前SCRAM交互项目精确清理通过 | `pnpm stack:up -- --stage V1.1` exit 0；`pnpm test:integration:v11-stage-storage` exit 0；精确`stack:down` exit 0 | 当前Project `sq-v11-stack-6c7c96c2fd4cde3f6e88`；Web `http://127.0.0.1:59783/acceptance/v1/v1.1`；API `http://127.0.0.1:59782`；E2E项目`sq-v11-stage-1c0a5531fd326f3a8793` | 工程生命周期与验证PASS；当前栈保留供检查；人工验收NOT_RUN |
| 用户人工验收 | Web normal/rejection/recovery、刷新、重启恢复及 CLI 核对已完成 | 不由脚本代签 | 用户确认（本会话） / 2026-09-09 | PASS |

记录不适用子项的范围依据，不能将必需项改为不适用绕过门禁。归档后在[本版验收表](./99-acceptance.md)填写证据链接和结论。清理只针对本轮已结束的隔离运行，默认保留证据；停止测试不能删除数据库卷或取消无关任务。

### 范围与签署状态澄清（2026-09-27）

2026-09-09的用户签署只覆盖当时的本地账户初始化与验收中心；2026-09-25至26增加的双市场账户和统一TestRun stage存储切片具有自动/隔离Web证据，但没有新增用户签署，也未切换活动API（Compose仍为`legacy`）。第2节`[x]`仅标识已由对应工程证据覆盖的子项；第7节完整交付清单仍有未完成项，V1.1和V1整版状态不得据此扩大为通过。

2026-10-02 V1.1活动存储切换前置复验：当前Platform API仍为`STOCKQUANT_V11_RUN_STORAGE=legacy`。最新活动库只读快照复演49条legacy/44条shadow，精确补5、字段/接受历史差异0、幂等复跑0、owner读取和双写/parity通过；清理后活动库计数不变、临时库/dump均移除。迁移CLI现支持补齐合法partial shadow，而不是误拒当前44条影子行；recent nonterminal 24h=0，但保留的2条历史RUNNING与1条WAITING需维护负责人审阅。完整`pnpm verify:stage -- --stage V1.1 --suite code`退出0。Runbook要求的维护时段/回退负责人仍未确认，活动API没有切换或重启，新增用户验收未执行，V1.1仍PARTIALLY_IMPLEMENTED。详见[当前快照审计](../../../evidence/audits/2026-10-02-w1-v11-partial-shadow-rehearsal.md)、[机器结果](../../../evidence/audits/2026-10-02-w1-v11-partial-shadow-rehearsal.json)、[复演日志](../../../evidence/audits/2026-10-02-w1-v11-partial-shadow-rehearsal.log)。该复演的源码/测试Manifest仍保留在历史审计文件`2026-10-02-w1-v11-partial-shadow-rehearsal.sha256`中；源码随后加固后，该旧点时Manifest不作为当前文件Hash使用。最新迁移拒绝全部legacy非终态记录的代码/测试Hash见[2026-10-05加固审计](../../../evidence/audits/2026-10-05-w1-v11-stale-nonterminal-migration-guard.md)及[历史执行快照SHA-256清单](../../../evidence/audits/2026-10-05-w1-v11-stale-nonterminal-migration-guard.sha256)。

2026-10-02 V1.1旧非终态记录ID只读复核：对活动`platform_api`使用只读事务再次核验49条legacy/44条shadow，列出需操作负责人处置的2条历史RUNNING和1条WAITING的精确TestRun ID；Platform API与PostgreSQL均running/healthy，未更新记录或重启服务。处置决定、维护窗口、回退负责人仍待确认，以上ID/计数仅是点时结果，切换前需重新查询。详见[只读复核审计](../../../evidence/audits/2026-10-02-w1-v11-live-nonterminal-readonly-review.md)、[机器结果](../../../evidence/audits/2026-10-02-w1-v11-live-nonterminal-readonly-review.json)、[当前文档绑定说明](../../../evidence/audits/2026-10-03-w1-v11-live-nonterminal-current-linkage-after-artifact.md)及[当前SHA-256清单](../../../evidence/audits/2026-10-03-w1-v11-live-nonterminal-current-linkage-after-artifact.sha256)。原始2026-10-02 Manifest保留在审计目录作为历史快照。

2026-10-03 当前工作树V1.1 code suite复验：`pnpm verify:stage -- --stage V1.1 --suite code`最终受控本机重跑退出0；首轮受限沙箱因Qlib worker动态loopback初始化EPERM而失败，已完整保留日志。Baseline、build/lint/typecheck、全仓单测和契约/Fixture检查通过。该结果不代表V1.1全范围业务验收、跨服务API切换/回退或新增人工验收完成。详见[审计](../../../evidence/audits/2026-10-03-w1-v11-current-worktree-rerun.md)、[机器结果](../../../evidence/audits/2026-10-03-w1-v11-current-worktree-rerun.json)、[完整日志](../../../evidence/audits/2026-10-03-w1-v11-current-worktree-rerun.log)和[SHA-256](../../../evidence/audits/2026-10-03-w1-v11-current-worktree-rerun.sha256)。

2026-10-05 当前工作树复验：完整`pnpm verify:stage -- --stage V1.1 --suite code`及`pnpm test:integration:v11-stage-storage`退出0；stage-mode随机隔离栈中normal/rejection/recovery Chromium 3/3通过，各Web TestRun均由同ID CLI `--check-only`核验，恢复只重启已验证的隔离Portfolio容器。测试退出时随机项目的容器、卷、网络和镜像均已移除。本次没有部署或连接活动服务，也未改变用户验收状态。完整结果见[W1审计](../../../evidence/audits/2026-10-05-w1-v11-stage-storage.md)、[机器JSON](../../../evidence/audits/2026-10-05-w1-v11-stage-storage.json)与[SHA-256（历史执行快照，绑定V1.1回归输入）](../../../evidence/audits/2026-10-05-w1-v11-stage-storage.sha256)。

2026-10-07 正式阶段E2E入口修复与复验：`pnpm test:e2e -- --stage V1.1`现路由到隔离stage-storage Harness，不再裸起Web后缺少recovery所需项目身份。该正式命令完成V1.1 code suite与Chromium normal/rejection/recovery 3/3，三条TestRun分别经相同UUID CLI `--check-only`核验。随机项目`sq-v11-stage-ec7d1d5666183e86a70b`恢复只重启精确核验的Portfolio容器，并确认容器、卷、网络与镜像均已清理；三Run UUID及失败诊断见[入口复验审计](../../../evidence/audits/2026-10-07-p1-v11-stage-entry-rerun.md)。人工签署仍维持原范围，不扩展V1.1/P1总体结论。

2026-10-07当前树账户矩阵扩展：V1.1代码套件入口现调用完整注册清单；随机临时PostgreSQL集成增加CN_A/CNY和US_EQUITY/USD独立初始账本、相同幂等键重放、异载荷及异owner冲突。隔离HTTP smoke验证owner拒绝、LIVE初始化403且没有账户副作用；完整code/集成/Web恢复矩阵最终通过。详细日志及失败历史见[P1账户身份账本矩阵](../../../evidence/audits/2026-10-07-p1-account-identity-ledger-matrix.md)。该工程验证未变更用户签署范围，当前V1.1仍为PARTIALLY_IMPLEMENTED。

2026-10-05 V1.1活动库切换前状态复核：使用PostgreSQL只读事务再次查询既有三个非终态Run的精确ID；legacy与stage记录均还在，2条`RUNNING`和1条`WAITING`状态/创建时间不变。Platform API、PostgreSQL及原13个活动容器均保持运行，未修改数据库、迁移或重启服务。操作负责人仍需审阅并决定这三个历史Run的处理方式，因此活动API切换条件未满足。详见[非终态Run只读复核](../../../evidence/audits/2026-10-05-w1-v11-live-nonterminal-readonly-review.md)、[JSON](../../../evidence/audits/2026-10-05-w1-v11-live-nonterminal-readonly-review.json)、[SQL](../../../evidence/audits/2026-10-05-w1-v11-live-nonterminal-readonly.sql)和[SHA-256](../../../evidence/audits/2026-10-05-w1-v11-live-nonterminal-readonly-review.sha256)。

2026-10-05 V1.1迁移门禁加固：复核发现旧切换脚本只检查最近24小时非终态，可能放行年龄较大的RUNNING/WAITING记录，与本Runbook要求的负责人处置不一致。现在活动迁移入口统计并拒绝全部legacy `QUEUED`/`RUNNING`/`WAITING`行，直到人工处置后再重查；隔离单测覆盖三条陈旧非终态拒绝，不连接活动库。维护窗口、备份恢复、旧Run处置及切换/回退仍未执行。


### 2026-10-06 本轮隔离复验

隔离存储模式下再次执行 `pnpm test:integration:v11-stage-storage`，完整命令exit 0；normal/rejection/recovery 3个Chromium Web TestRun均由对应相同UUID经只读CLI核对，恢复只重启已核实的隔离Portfolio容器。临时Compose资源已精确清理。此结果是自动隔离切片证据，不扩展历史人工签署，也不证明活动API切换/回退或V1.1整体完成。详见[本轮证据](../../../evidence/audits/2026-10-06-p1-v11-stage-rerun.md)和[机器摘要](../../../evidence/audits/2026-10-06-p1-v11-stage-rerun.json)。


### 8.10 目标架构兼容探针（2026-10-09）

按V1环境要求运行`pnpm verify:compat -- --platform linux/arm64`和`pnpm verify:compat -- --platform linux/amd64`，两条命令均退出0。 2026-10-10在当前工作区对Platform API镜像重跑两种平台探针均exit 0：ARM64原生（报告[见此](../../../evidence/audits/2026-10-10-v11-linux-arm64-compat-a01.json)），AMD64为Docker Desktop仿真（报告[见此](../../../evidence/audits/2026-10-10-v11-linux-amd64-compat-a01.json)、[完整日志](../../../evidence/audits/2026-10-10-v11-linux-amd64-compat-a01.log)，SHA-256 `2776bfa6caefae9e1183f0a49320650fa9033e40c2c28c8b3e72d81cf580498c`）。 2026-10-10在当前工作区重跑ARM64容器探针exit 0，平台`linux/arm64`、Node `v24.1.0`、镜像ID `sha256:86ee7dedb2ba579a978e37aeed9aa54086019f7276db9bea8e51af6d606c2e22`，完整报告[JSON](../../../evidence/audits/2026-10-10-v11-linux-arm64-compat-a01.json)、日志[见此](../../../evidence/audits/2026-10-10-v11-linux-arm64-compat-a01.log)，log SHA-256 `428bcf22035a4cad94c270f68073087d80462fb007d4738b01f601af77dad5a8`。探针构建的是Platform API镜像并在容器内核验Node `v24.1.0`及架构：ARM64与macOS/AArch64宿主一致；AMD64为Docker Desktop仿真。报告：[机器汇总](../../../evidence/audits/2026-10-09-v1-compatibility-probes.json)、[ARM64日志](../../../evidence/audits/2026-10-09-v1-compat-arm64.log)、[AMD64日志](../../../evidence/audits/2026-10-09-v1-compat-amd64.log)。该结果不代表完整V1服务栈、Qlib/RD-Agent镜像、资源压力或真实Ubuntu主机已验证；这些仍未完成，本阶段及V1状态不变。

### 8.11 合同生成、分层与迁移基础复核（2026-10-09）

当前工作树执行`pnpm baseline:check`退出0：包含文档/合同/Fixture检查、29个客户端生成器漂移检查、111条合同消费者规则、8个配置服务的分层扫描及46项基础测试。最新复核日志：[baseline日志](../../../evidence/audits/2026-10-09-v11-contract-layer-baseline-a01.log)及[SHA-256](../../../evidence/audits/2026-10-09-v11-contract-layer-baseline-a01.log.sha256)。V1.1隔离PostgreSQL迁移/统一存储套件另见[当前迁移证据](../../../evidence/audits/2026-10-09-v11-persistence-migration-a04.json)与[完整代码门禁](../../../evidence/audits/2026-10-09-v11-code-suite-a04.log)。A05已按V1.1–V1.5源码/OpenAPI建立首轮调用边和迁移发布矩阵：[初审表](../../../evidence/audits/2026-10-09-v1-cross-service-route-matrix-a05.md)。该表标明生成客户端覆盖不等于运行/身份/迁移/发布通过，并列出Portfolio/Trade/Governance/Replay/Quant/Market Data各服务迁移发布尚待逐项核查；它仍是首轮枚举而非完整闭环。活动API切换/回退仍NOT_AUTHORIZED，故本节待办保持未勾选。


### 8.12 Portfolio共享模拟模式策略复验（2026-10-09）

Portfolio账户初始化使用的`isSimulationModeAllowed`此前只有`PAPER + FAKE`策略断言，没有直接覆盖合法`BACKTEST + FAKE`或缺失模式。现新增测试覆盖这两种合法组合及LIVE、REAL、启用LIVE标志和缺失字段拒绝。Portfolio单测6/6及typecheck通过；扩展后的隔离HTTP+PostgreSQL smoke实际创建并读回`PAPER/FAKE`与`BACKTEST/FAKE`账户，持久事实模式精确匹配；`LIVE/FAKE`、`PAPER/REAL`、`LIVE/REAL`均在写入前403，账户行数为0，随机容器/网络已清理。完整V1.1 code suite再次退出0，见[V1.1 smoke](../../../evidence/audits/2026-10-09-v11-backtest-account-http-a01.log)、[V1.1 code suite](../../../evidence/audits/2026-10-09-v11-mode-policy-code-suite-a04.log)及[Hash](../../../evidence/audits/2026-10-09-v11-mode-policy-code-suite-a04.log.sha256)。受影响的V1.3完整代码套件也退出0，见[V1.3 code suite](../../../evidence/audits/2026-10-09-v13-mode-policy-code-suite-a03.log)及[Hash](../../../evidence/audits/2026-10-09-v13-mode-policy-code-suite-a03.log.sha256)。此策略复验未完成V1.1跨服务逐操作模式/身份/发布矩阵、活动存储切换/回退或人工验收；第2/7节整体状态继续保持未关闭。

### 8.13 V1.1独立迁移CLI隔离验证（2026-10-09）

新增`pnpm db:migrate:v1`检查/应用入口及`pnpm test:db:migrate:v1 -- --stage V1.1`；V1.1所需Portfolio Risk、Platform API各自隔离PostgreSQL验证空库提示迁移、应用、READY复查、重复应用及未知版本拒绝，完整V1.1代码套件exit 0。详见[完整日志](../../../evidence/audits/2026-10-09-v11-migration-cli-code-suite-a05.log)及[SHA-256](../../../evidence/audits/2026-10-09-v11-migration-cli-code-suite-a05.log.sha256)和[迁移操作说明](../../operations/v1-database-migrations.md)。本结果不代表活动库迁移、配对恢复/旧版回退、人工验收或V1.1关闭。


### 8.14 当前工作树手册执行复核（2026-10-09）

交互栈手动入口实跑：`pnpm stack:up -- --stage V1.1` exit 0，随机项目`sq-v11-stack-53867a668e79209fcb2f`输出Web `http://127.0.0.1:53152/acceptance/v1/v1.1`、API `http://127.0.0.1:53151`；GET Web与`/api/v1/session`均200，建立`acceptance-owner-1`的HttpOnly `sq_session`。随后`pnpm stack:down -- --project sq-v11-stack-53867a668e79209fcb2f` exit 0，核对容器/卷/网络/项目镜像和凭据注册均清零。机器证据：[生命周期报告](../../../evidence/audits/2026-10-09-v11-interactive-stack-lifecycle-a02.json)，SHA-256 `17042a704b9ff78a35d3deeda7d1d3ac301a722ae7da65e478d339c7bc3f4991`。首次精确清理发现stack:down漏掉项目镜像删除；错误记录保留在[a01日志](../../../evidence/audits/2026-10-09-v11-current-stack-down-a01.log)，已修复并以新随机项目复跑通过，新增4个单测，详见[stack:down修复测试](../../../evidence/audits/2026-10-09-v11-stack-down-images-a01.log)。

同一轮另执行`pnpm test:e2e -- --stage V1.1` exit 0：完整V1.1代码套件PASS，Chromium normal/rejection/recovery 3/3。三个浏览器TestRun均经同UUID CLI `--check-only`与当前Web session结构化导出；每份`evidence.json`、Manifest逐项SHA和导出Hash核验通过，三份`manualConclusion`均为`NOT_RUN`。Run分别为normal `3c2d0c3a-b116-4919-ae7c-cf40e25a864c`、rejection `92cf8854-cd6f-4d36-baec-70e0cc300434`、recovery `bead2713-cc26-47e5-9d23-a96f8a008d0a`；证据包存于`evidence/local/V1.1/<testRunId>/`。完整摘要及源码Hash：[机器报告](../../../evidence/audits/2026-10-09-v11-current-worktree-e2e-a03.json)，[SHA-256](../../../evidence/audits/2026-10-09-v11-current-worktree-e2e-a03.json.sha256)；[运行日志](../../../evidence/audits/2026-10-09-v11-current-worktree-e2e-a03.log)，[SHA-256](../../../evidence/audits/2026-10-09-v11-current-worktree-e2e-a03.log.sha256)。真实行情/模型/券商调用为0。手册状态更新为`VERIFIED_EXECUTABLE`只表示命令、按钮、隔离恢复与导出流程可复跑；本轮Web人工确认、当前V1.1整体验收和活动存储切换/回退均未完成。

### 8.16 核心Schema和场景合同在当前树复验（2026-10-09）

运行`pnpm test:e2e -- --stage V1.1`，随机项目`sq-v11-stage-6a3dd6c88eba308f56ff`中完整V1.1代码套件退出0，Chromium normal/rejection/recovery 3/3通过；每个Run均完成同UUID CLI只读核对和结构化证据导出。TestRun：normal `2c2a7dd3-72d4-4eaa-a0ed-286fb946ca38`，rejection `a93a70fd-f2a4-4684-950a-052def2eb077`，recovery `55f0c68e-058c-4577-b4d7-dd67ece53a3b`；各自两项断言PASS，人工结论均为`NOT_RUN`。隔离项目容器、卷、网络和镜像已精确清理。[完整运行日志](../../../evidence/audits/2026-10-09-v11-core-contracts-current-e2e-a01.log)，SHA-256 `abb64c038f019049358a380cbb4c90f79bf254c4f1c36077721f4b97df1be7b0`。

### 8.17 V1.1 Platform受保护路由身份矩阵（2026-10-09）

`pnpm test:integration:v11-stage-storage`在隔离stage模式下逐项探测Platform受保护API：账户快照、美股账户初始化、V1.1场景发现与TestRun创建、TestRun读取、恢复继续和证据读取。Harness提取`app.module.ts`中共享Platform控制器路由，断言七项受保护路由清单与实际声明一致；匿名401和伪造用户403各7/7。改动后的完整V1.1代码门禁及Chromium normal/rejection/recovery 3/3均通过，同Run CLI/导出验证完成；隔离容器、卷、网络和镜像清理通过。[完整日志](../../../evidence/audits/2026-10-09-v11-platform-identity-code-suite-a01.log)、[SHA-256](../../../evidence/audits/2026-10-09-v11-platform-identity-code-suite-a01.log.sha256)、[身份边界审计](../../../evidence/audits/2026-10-09-v11-platform-identity-boundary-a01.md)。本项不覆盖公共session/capabilities、活动数据库切换/回退或用户验收；新增Run的人工结论仍NOT_RUN。

### 8.15 核心公共Schema的TS/Python字段回归（2026-10-09）

新增测试`TypeScript and Python expose every field in the shared V1 account, money, security, clock and TestRun contracts`，逐一对照Money、Security、AccountInitializationFixture、AccountSnapshot、ClockContext和TestRun的Schema字段及required语义，检查公共生成的TS/Python类型。该测试已接入`contracts:check`；`node --test scripts/generate-contract-types.test.mjs` 2/2、`pnpm contracts:check` 11/11并含202个Schema漂移检查、29个客户端生成器检查通过。随后`pnpm verify:stage -- --stage V1.1 --suite code` exit 0，结果：[完整日志](../../../evidence/audits/2026-10-09-v11-core-schema-parity-code-suite-a01.log)，SHA-256 `1422abc94c880e4ac5311bed8235bf1949dad13c8913e634181256c7e5afcc92`。该测试补足核心Schema双语言字段映射的具名回归，但不证明所有服务消费者均正确使用这些合同，也不关闭V1.1跨服务路由/发布矩阵或人工验收。

### 8.25 核心公共Schema服务类型副本字段回归（2026-10-10）

在§8.15的六类核心Schema字段/required性断言上，新增`every service TypeScript contract copy preserves the shared V1 core schema fields and requiredness`，逐一检查全部8个服务的`src/contracts/generated-types.ts`副本。`node --test scripts/generate-contract-types.test.mjs` 3/3、`pnpm contracts:check` 12/12通过；JSON检查覆盖207个Schema、类型生成器漂移检查覆盖203个Schema及服务输出，29个客户端生成器和112条兼容规则均通过。V1.1完整代码套件`pnpm verify:stage -- --stage V1.1 --suite code`受控回环复验exit 0：[日志](../../../evidence/audits/2026-10-10-v11-core-service-schema-code-suite-a02.log)，[退出码](../../../evidence/audits/2026-10-10-v11-core-service-schema-code-suite-a02.exit.txt)，SHA-256 `719006df439ebf23d8f38a209782869ed8f171a5f8a95376abb474cd602ddceb`。普通沙箱首轮仅因loopback `EPERM`失败，失败日志保留在[a01](../../../evidence/audits/2026-10-10-v11-core-service-schema-code-suite-a01.log)；a02通过后临时数据库/容器/网络已核验清理。该回归验证各服务生成类型副本，不证明业务模块实际消费选择正确或完整，也不关闭V1.1跨服务调用/发布矩阵、P1或人工验收。

### 8.24 V1.1入口拒绝客户端交易模式注入（2026-10-09）

V1.1美股账户初始化与TestRun创建使用服务端固定的`PAPER/FAKE`和V1.1场景配置；两条HTTP入口现在对客户端提交`environmentMode`或`brokerMode`明确返回422，不再静默忽略。现有正常Web流程仍成功。V1.1隔离代码/存储/Web套件`pnpm test:integration:v11-stage-storage`退出0；Platform容器由当前源码构建，normal/rejection/recovery Chromium 3/3，6次（3种模式×2条入口）均422，三条正常流程Run由同Run CLI `--check-only`核对，容器、卷、网络和镜像精确清理。TestRun：`c4fcc468-6a64-400e-8c08-b3282fd09460`、`a207c49e-2427-417e-bc26-01f5fc7d6962`、`50f0bf14-a0bf-4aba-b534-4cc20a78178a`；同Run导出位于各自`evidence/local/V1.1/<TestRun>`。这是开发者自动回归，不代表新增用户验收或V1.1全范围完成。首次对共享旧API容器的探测曾接受模式字段，判明未加载当前源码；正式结论以随后当前源码隔离栈测试为准。

### 8.18 共享Trade路由变更后的V1.1完整代码兼容复验（2026-10-09）

Trade Execution共享服务在V1.3/V1.4/V1.5增加严格请求体边界后，执行`pnpm verify:stage -- --stage V1.1 --suite code`完整复验，退出0。套件包含Trade服务构建及FakeBroker/Portfolio隔离PostgreSQL契约、服务身份探针、V1.1 Platform与Portfolio门禁、服务分层检查和V1.1迁移CLI隔离PostgreSQL检查；活动服务未连接，所有临时数据库/容器/网络均精确清理。[完整日志](../../../evidence/audits/2026-10-09-v11-trade-outbox-compensation-compat-code-suite-a01.log)、[SHA-256](../../../evidence/audits/2026-10-09-v11-trade-outbox-compensation-compat-code-suite-a01.log.sha256)。该结果只证明当前V1.1规定代码套件兼容，不验证活动TestRun存储切换/回退、全部业务Web场景或本轮人工验收。

### 8.19 共享Platform API变更后的V1.1 Web/API/CLI复验（2026-10-09）

重跑`pnpm test:e2e -- --stage V1.1`，代码门禁与隔离PostgreSQL专项通过；正式Web的normal、rejection、recovery 3/3通过，每个Run均执行同UUID CLI核对并导出Evidence Bundle。恢复场景仅重启已确认的隔离Portfolio容器；随机项目容器、卷、网络及镜像精确清理通过，活动服务`NOT_CONNECTED`。日志[当前复验](../../../evidence/audits/2026-10-09-v11-run-incidents-compat-web-e2e-a01.log)，SHA-256 `6f3bddebf44406736abfa95d9e11a488b58329e00a03ff96c1ee50522810e3be`。

本次属于隔离Web/API/CLI兼容验证；不处置活动数据库中的三条非终态Run，不执行存储切换/回退，也不新增用户验收签署。

### 8.21 V1.3 Mandate预算读回共享Platform变更后的V1.1代码兼容复验（2026-10-10）

`pnpm verify:stage -- --stage V1.1 --suite code`在授权的本机loopback环境退出0。全仓baseline、contracts/fixtures、构建、类型检查和单测通过；Portfolio/Trade隔离HTTP+PostgreSQL、服务身份、FakeBroker/outbox恢复、Market Data集成及V1.1数据库迁移检查均通过，隔离容器/网络清理确认。完整日志[见此](../../../evidence/audits/2026-10-10-v11-after-v13-budget-readback-code-suite-a02.log)，SHA-256 `3ddf6d960822a1f5c0a6769cd2569212b3a1fd08be3755cfb56cd9e94bccfc53`。首次受限沙箱执行因loopback `EPERM`失败并保留于[a01](../../../evidence/audits/2026-10-10-v11-after-v13-budget-readback-code-suite-a01.log)；受控授权重跑通过。该代码兼容套件不替代V1.1 Web场景、活动Run存储切换/回退或本轮人工验收。

### 8.22 共享Platform/Web变更后的V1.1当前树浏览器复验（2026-10-10）

`pnpm test:e2e -- --stage V1.1`退出0，正式Web normal/rejection/recovery 3/3通过；三个Run均由同UUID CLI只读核验并导出Evidence Bundle，Manifest Hash分别为`fd806d4ef323f6eaae8c1b367c3345b273c83df8c86613a0839f623666f77af0`、`cc7b330edef97a618909254e5b273cf983d69fd8e08de162af2f09206f42bd82`、`e5483311f426f4062caf6c3b00825cac55160e7361e59f598326372e6a27122c`。隔离恢复仅重启本次确认的Portfolio容器；Harness精确移除容器、卷、网络及镜像并验证无残留。TestRun：normal `6b80ffbc-2f79-4559-930f-d2ba04e7c7db`、rejection `c87208f4-a188-4d33-860f-f2a94e7b2f88`、recovery `b66da5af-4f33-4ea4-bb5d-58019986eae7`。完整日志[见此](../../../evidence/audits/2026-10-10-v11-after-v13-budget-readback-web-e2e-a01.log)，SHA-256 `d52b126fa676ccfe90fe5ffe72c32d4d327c1a9a951ba9a18e1fc770f60bc1dd`。此复验不处置活动数据库旧Run、不执行存储切换，也不新增用户签收。

### 8.20 Run事务保存变更后的当前树V1.1端到端兼容复验（2026-10-09）

`pnpm test:e2e -- --stage V1.1`在Mac ARM64随机隔离Compose项目执行，exit 0：完整V1.1 code suite通过，Chromium normal/rejection/recovery 3/3通过；每个Web TestRun均用相同UUID执行CLI `--check-only`并结构化导出。Run IDs：normal `e5e661b1-9655-4f9b-9869-9a4dda4b5ce4`（Manifest SHA-256 `33ae3ed2f911f2816d4ab8f5ad5a2c9f2b6ccc99fefd1da48575262b83efb849`）、rejection `839ec19a-40cf-463e-a42d-43d0131c23db`（`81b64d9da4a97d9bf3f99af99f8b7c95da5053edb6f5eb6d1867790292866d93`）、recovery `86799f53-11a2-41c8-a63f-cf0632da38f3`（`4a3236cc780ed6e5d724f8d78f66f476baf935af66e16583898a5aa28acf32d4`）。证据包位于`evidence/local/V1.1/<testRunId>/`；完整运行及精确清理日志[见此](../../../evidence/audits/2026-10-09-v11-current-tree-shared-run-save-e2e-a02.log)，SHA-256 `cbd9cbb27a92de0f907574e5dd4059ad75757830419f67874e0998db6fa0fae0`。一次沙箱权限拒绝Docker socket的首轮失败保留于[a01](../../../evidence/audits/2026-10-09-v11-current-tree-shared-run-save-e2e-a01.log)，在受控本机同命令复跑通过；最终随机项目容器、卷、网络及项目镜像精确移除。三条Run的人工结论仍`NOT_RUN`，该兼容复验不代表活动存储切换、当前范围人工验收或V1.1阶段关闭。

### 8.23 V1.1 Platform命令拒绝客户端写入业务事实（2026-10-10）

V1.1 Run创建入口拒绝`scenarioId/seed`之外字段；US账户初始化及recovery continuation为bodyless命令，现拒绝任何非空客户端请求体。E2E注入Run `status/cash`及账户`status/cash/positions`均返回422，Run状态仍为`COMPLETED`，正常V1.1账户初始化和同Run CLI核对不受影响。

`pnpm test:e2e -- --stage V1.1`完整阶段入口退出0：code suite通过，Chromium normal/rejection/recovery 3/3，隔离PostgreSQL迁移/持久化和身份矩阵通过；normal Run `d63c4ffc-d921-4d32-a74e-41a4139b709b` Manifest SHA-256 `54483d904d1a958dcde491ce5e18bba0cc2ef5bf92ffd2fff70c64766c7f0fd9`，rejection `1e8ba2d2-cff2-4467-8b9e-304f3d72e3a7` (`d8981c0d5a17879c6e6ce17f572130c730f70be688c37591c0d924d14411d8dd`)，recovery `a5d5c23d-bb6c-4ec4-b587-e35e842d5ff8` (`523e9912ed5db2c5a4ca99f3876ab0fe24c6c8496d277d28b5fb55764e7be194`)；完整日志[见此](../../../evidence/audits/2026-10-10-v11-client-facts-code-e2e-a01.log)，SHA-256 `7ab3675f8bca745102f19021463e03f583623095131e4760295c711ed92a7033`。Run Evidence Bundle分别存入`evidence/local/V1.1/<testRunId>/`。隔离随机容器、卷、网络和镜像已精确清理，未连接活动服务。此处只关闭三条Platform命令的客户端载荷保护子项，不代表活动存储切换/回退、V1.1其它交易路径或新增范围人工验收完成。


### 8.26 当前共享存储、Platform与服务边界变更后的V1.1完整代码兼容复验（2026-10-10）

在近期Platform API、共享存储/迁移、认证及跨阶段调用路径变更后，受控本机执行`pnpm verify:stage -- --stage V1.1 --suite code`，exit 0。完整代码套件涵盖基线文档/Crosswalk/合同/Fixture和脚本测试（脚本测试66/66）、账户与TestRun stage存储迁移/双写持久化、Platform服务身份及PAPER/FAKE模式拒绝、Portfolio/Trade相关回归与平台API隔离PostgreSQL smoke。所有临时数据库、容器和网络均由Harness确认清理；活动服务`NOT_CONNECTED`。

完整命令输出：[当前树V1.1 code suite](../../../evidence/audits/2026-10-10-v11-current-tree-code-suite-a01.log)，SHA-256 `5df1d49e48b8adf73bce5eee1d4df1060b954bdf6c5cc05884780de4f1583602`。这只证明规定代码套件及其隔离数据库/HTTP切片；不包含新增范围人工验收、旧RUNNING/WAITING记录处置、活动API切换/回退、真实Ubuntu或完整跨服务发布矩阵，故V1.1和V1仍未关闭。


### 8.27 Platform→Portfolio Account生成客户端逐操作合同回归（2026-10-10）

为P1/A04补齐Platform生产依赖的Portfolio Account生成客户端直接合同覆盖：测试逐项断言账户初始化、账户快照读取、资源预留、资源释放、Fill入账及Fill费用更正的HTTP方法、完整路径、URL路径参数编码、Platform服务身份/Bearer和写入载荷；账户快照读取额外核对owner header。定向文件3/3通过，Platform typecheck通过。

`pnpm verify:stage -- --stage V1.1 --suite code` exit 0；Platform单测308/308，脚本基线66/66，各服务隔离迁移/HTTP smoke清理通过。完整日志[见此](../../../evidence/audits/2026-10-10-v11-portfolio-client-contract-code-suite-a01.log)，SHA-256 `b7919516b618f3265652cd7f7abade01e717614d46e280de7a8a401da4912e7a`。普通沙箱loopback失败未作为测试结果，受控运行通过。此项不证明Portfolio所有调用方/全部写路由的负向副作用、活动发布/回退、人工验收或阶段/V1门禁通过。

### 8.30 Portfolio Risk调用身份密钥必须互异（2026-10-10）

Portfolio Risk此前在ready探针中只检查Platform API、Trade Execution、Historical Replay三个Bearer均存在且达到最小长度，未拒绝密钥复用。复用时攻击方可用同一Bearer配合伪造caller ID跨越路由身份选择。现在请求授权和`/ready`共用配置校验：三份密钥均至少32字符且两两不同；缺失、弱或复用均 fail-closed。Compose对三项加入必填插值。

定向`service-auth.spec.ts` 3/3通过（包含Platform↔Trade、Platform↔Replay复用与弱凭据）；Portfolio typecheck通过。V1.1完整code suite exit 0（Portfolio unit 7项、Platform 324项、隔离Portfolio/Platform数据库与HTTP smoke及迁移检查通过）；V1.3完整code suite亦exit 0（Portfolio 7项、Platform 324项、Trade 98项、Portfolio/Governance/Trade隔离迁移通过）。Compose有效配置exit 0、空Replay token exit 1，见[配置边界检查](../../../evidence/audits/2026-10-10-v11-portfolio-compose-token-gate-a01.md)。完整套件：[V1.1](../../../evidence/audits/2026-10-10-v11-portfolio-distinct-identities-code-suite-a01.log)（SHA-256 `956570bf3869ae251e8c6e973beab68aa03fc36270176995b216b1d8f2dc0b22`）、[V1.3](../../../evidence/audits/2026-10-10-v13-portfolio-distinct-identities-code-suite-a01.log)（SHA-256 `7d830f6948ab7b14234125bd77f53df0b474f07a964829602903d3104b8198b5`）。隔离资源已清理；活动服务未连接或变更。


### 8.28 Historical Replay→Portfolio账户客户端传输合同（2026-10-10）

补齐Historical Replay生产调用方的Portfolio Account客户端直接覆盖：账户初始化断言POST路由、完整类型化请求体、Replay Worker服务身份/Bearer；账户快照读取断言GET路由、编码后的账户ID、owner范围及AbortSignal。定向测试`pnpm --filter @stockquant/historical-replay-worker exec vitest run tests/unit/portfolio-account-client.spec.ts`通过2/2，服务typecheck通过。随后完整`pnpm verify:stage -- --stage V1.4 --suite code`退出0，Replay Worker 27/27、Trade Execution 98/98、Platform API 308/308，隔离HTTP/PostgreSQL和迁移检查通过；日志[见此](../../../evidence/audits/2026-10-10-v14-replay-portfolio-client-code-suite-a01.log)，SHA-256 `d671ca9a3c25b27c1714984d6ee307c495fc3e16a31d8adcb288b8eacd9a18fc`。此增量验证所列客户端请求合同，不关闭V1-only完整调用/发布矩阵、业务负向副作用、活动切换/回退、Ubuntu或当前范围人工验收；P1/A04与V1继续OPEN。


### 8.29 Platform→Historical Replay客户端操作合同（2026-10-10）

补齐Platform生产调用方对Replay Worker生成客户端的直接操作覆盖：单bar回放启动准确发送POST及类型化命令；run ID含斜杠时读取、pause、resume、cancel、UNKNOWN恢复均路径编码；五个无body命令不发送请求体并携带Platform服务身份/Bearer和AbortSignal。定向客户端测试4/4、Platform typecheck通过。完整`pnpm verify:stage -- --stage V1.4 --suite code`退出0，Platform API单测310/310；全局基线66/66，隔离Replay/Quant/Market Data/Platform迁移、Replay服务身份HTTP smoke及Governance/Trade/Portfolio三服务回测Harness通过，临时资源均确认清理。完整日志[见此](../../../evidence/audits/2026-10-10-v14-platform-replay-client-contract-code-suite-a01.log)，exit 0，SHA-256 `baaf8b49e4c854572cf79a843214d2f9cf7b5503c7caec9be92b687cadc3092c`。本增量仅证明列明的生成客户端传输合同与代码套件，不证明真实回放成功/恢复全矩阵、活动发布回退、OD-014、Ubuntu或人工验收；P1/A04与V1仍OPEN。

### 8.31 Portfolio Risk全准入路由Caller拒绝矩阵（2026-10-10）

隔离HTTP/PostgreSQL smoke对当前7条准入路由逐条使用Platform API、Trade Execution、Historical Replay和test-harness四类身份，共28次拒绝探测；错误Bearer返回401、越权Caller返回403。前后核对accounts、ledger_entries、account_positions、recorded_fills、fill_fee_corrections与resource_reservations六类事实计数，均保持0。路线/身份/方法策略单测覆盖该矩阵，V1.1与V1.3完整代码套件均退出0。详见[矩阵A18](../../../evidence/audits/2026-10-10-v1-cross-service-route-matrix-a18.md)及其引用的两份套件日志。该拒绝矩阵不替代合法业务流程验证、活动部署或V1人工验收。
### 8.32 Quant Research→Qlib Worker生成客户端V1调用边界（2026-10-10）

V1.2调用盘点补录了Quant Research经生成客户端调用隔离Qlib Worker的实际边：`probeQlibWorker`用于Qlib及RD-Agent固定代码探针，`fitQlibFixtureInWorker`用于锁版Fixture拟合；由`quant-research-service`专属Bearer身份保护，拟合超时上限120秒。定向客户端单测覆盖探针身份、拟合路由/请求体/Content-Type/超时及错误响应，完整V1.2代码套件exit 0，Qlib Worker Python单测14/14、Quant Research 101项、全仓脚本66/66；锁版Qlib容器及四场景Web/API/CLI同TestRun验证通过，容器、卷、网络清理已验证。E2E中一次页面代理`socket hang up`后套件仍完成全部场景并PASS，原始日志保留。

摘要Fixture train/validate操作虽在同一生成客户端内，但属于V2.3多bar摘要和Hash重算；其OpenAPI响应明确不宣称模型训练或独立模型验证，不计入V1能力。调用点及逐项边界见[矩阵A19](../../../evidence/audits/2026-10-10-v1-cross-service-route-matrix-a19.md)，完整V1.2代码套件见[运行日志](../../../evidence/audits/2026-10-10-v12-qlib-worker-client-inventory-code-suite-a01.log)、[退出码](../../../evidence/audits/2026-10-10-v12-qlib-worker-client-inventory-code-suite-a01.exit.txt)和[SHA-256](../../../evidence/audits/2026-10-10-v12-qlib-worker-client-inventory-code-suite-a01.log.sha256)。这关闭一条客户端边的盘点及隔离回归子项，不关闭V1.1-S2-L14、P1或V1阶段/版本验收。

### 8.33 Platform→Trade Execution外部FakeBroker订单观察客户端合同（2026-10-10）

补测`GeneratedPlatformPaperExecutionClient.recordSimulatedFakeBrokerExternalOrder`这一条实际用于V1.1/V1.3对账的写客户端：锁定POST路由、类型化订单观察载荷、`platform-api-service`身份与Bearer、JSON Content-Type、AbortSignal及成功响应透传。客户端单测新增后，Platform API完整单测67文件/327项及typecheck通过；随后完整V1.3 code suite exit 0，真实隔离迁移、HTTP/PG、Web/API/CLI及基线检查通过，临时资源清理完成。精确测试与完整套件日志见[套件记录](../../../evidence/audits/2026-10-10-v13-external-order-client-contract-code-suite-a02.log)、[退出码](../../../evidence/audits/2026-10-10-v13-external-order-client-contract-code-suite-a02.exit.txt)和[SHA-256](../../../evidence/audits/2026-10-10-v13-external-order-client-contract-code-suite-a02.log.sha256)。沙箱初跑的回环绑定`EPERM`完整失败记录保留在[a01](../../../evidence/audits/2026-10-10-v13-external-order-client-contract-code-suite-a01.log)；a02在受控隔离环境重跑通过。此项只关闭该客户端操作合同，不关闭V1调用/发布矩阵、活动切换或用户验收。

### 8.34 V1.1 owner-scoped TestRun响应契约（2026-10-11）

P0消费者映射发现，Platform V1.1内部持久化`TestRun`比共享跨服务`TestRun`窄，且`GET /api/v1/acceptance/runs/:testRunId`直接返回本地Run字段、`error`和断言。内部持久化记录与公开查询投影的用途不同；将两者强行合并并填入未记录的Clock/运行模式会产生错误事实。本次新增`common/v11-acceptance-run.schema.json`及`platform-v11-acceptance.v1.json`，明确Create/owner-scoped Read路由、响应形状、会话与状态边界；Platform Read handler返回值采用生成的`V11AcceptanceRun`类型。`check-openapi-contract.mjs`现对V1.1两个操作作显式检查。

`pnpm contracts:check`通过（209个Schema、60个Fixture、112条兼容规则、30个客户端生成器检查）；Platform API typecheck通过；`pnpm verify:stage -- --stage V1.1 --suite code`受控回环运行exit 0，66/66基线测试通过，Platform 67文件/327项单测通过，隔离迁移、HTTP/PG和其他代码套件检查通过，所有隔离容器/网络清理完成，活动服务未连接。完整日志：[代码套件](../../../evidence/audits/2026-10-11-v11-api-response-contract-code-suite-a02.log)、[合同检查](../../../evidence/audits/2026-10-11-v11-response-contract-check-a02.log)、[退出码](../../../evidence/audits/2026-10-11-v11-api-response-contract-code-suite-a02.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v11-api-response-contract-code-suite-a02.log.sha256)。机器可读消费者结论见[A46](../../../evidence/audits/2026-10-11-v1-v11-acceptance-response-contract-a46.md)。

此项只明确V1.1 Read API的兼容投影并验证代码套件，不是运行时逐响应Schema校验，不证明其他消费者或跨服务发布/回退完整，也不改变V1.1/V1状态或人工验收。


### 8.35 V1.1 owner-scoped TestRun运行时响应校验（2026-10-11）

在随机命名的隔离Docker项目中执行`pnpm test:integration:v11-stage-storage`，以正常场景和固定seed `20260907`创建TestRun。真实API创建响应为HTTP 202，随后以同一owner读取为HTTP 200；读取到的完整JSON通过AJV 2020及`ajv-formats`校验`common/v11-acceptance-run.schema.json`，并逐项核对testRunId、owner及stage。响应为`COMPLETED`、2条断言，testRunId为`3ce6f0d2-e926-4745-a358-9e57512b9ebe`。完整隔离运行日志见[成功记录A04](../../../evidence/audits/2026-10-11-v11-runtime-response-contract-isolated-a04.log)，其创建载荷通过OpenAPI 202响应Schema，读取载荷通过V11AcceptanceRun Schema；退出码与SHA旁证也在同目录。此前一次受控成功记录[A02](../../../evidence/audits/2026-10-11-v11-runtime-response-contract-isolated-a02.log)仅检查创建状态和字段，保留首轮错误owner的403失败[A01](../../../evidence/audits/2026-10-11-v11-runtime-response-contract-isolated-a01.log)及普通沙箱Docker权限失败[A03](../../../evidence/audits/2026-10-11-v11-runtime-response-contract-isolated-a03.log)。

同次Harness运行的V1.1代码套件、真实Chromium normal/rejection/recovery 3/3、同TestRun CLI只读校验均通过；随机项目容器、卷、网络和镜像已精确清理并验证。此结果证明本次真实owner读取响应匹配公开Schema及创建状态码合同；不替代人工作业验收，不关闭跨服务消费者/发布兼容矩阵、历史Run导出或V1阶段门禁。


### 8.37 V1.1 Web读取调用绑定生成响应类型（2026-10-11）

复核发现V1.1页面的恢复读取、轮询、创建后读取和恢复后读取四个`GET /api/v1/acceptance/runs/:testRunId`调用都使用手写宽松`TestRun`类型，未让TypeScript检查真实响应投影字段。现将V1.1页面状态和四个调用绑定到`packages/contracts/generated/types.ts`生成的`V11AcceptanceRun`；V3.1仍使用其独立的本地最小投影类型，没有把V1.1字段强加给其他版本。

验证：`pnpm --filter @stockquant/web typecheck`退出0；`pnpm --filter @stockquant/web test`为2个文件/4项通过；`pnpm --filter @stockquant/web build`退出0，Vite生产包构建成功。记录见[检查日志](../../../evidence/audits/2026-10-11-v11-web-response-consumer-check-a01.log)、[构建日志](../../../evidence/audits/2026-10-11-v11-web-response-consumer-build-a01.log)，Hash见对应`.sha256`旁证。V1.1真实API响应运行时Schema、Chromium normal/rejection/recovery和同Run CLI仍以[§8.36完整隔离栈记录](../../../evidence/audits/2026-10-11-v11-amd64-emulated-isolated-a05.log)为准。

此修正强化Web的编译期consumer合同；通用`api<T>`仍不在浏览器端执行JSON Schema校验。它不证明其他服务/版本的公共Schema消费者完整，不关闭发布/回退矩阵、活动存储切换、Ubuntu或人工验收，V1.1与V1保持未完成。

### 8.38 V1.1 CLI同Run只读响应契约校验（2026-10-11）

V1.1 `verify:stage -- --run <id> --check-only`及场景轮询现使用`ajv`/`ajv-formats`校验`common/v11-acceptance-run.schema.json`，确认真实API返回完整owner-scoped投影后才评估状态和断言。新增CLI回归覆盖合法响应退出0、契约漂移退出1；既有失败Run仍退出1、缺断言Run退出2。

定向`node --test scripts/verify-stage.test.mjs`四项通过，日志、退出码及SHA-256见[记录](../../../evidence/audits/2026-10-11-v11-cli-response-schema-test-a01.log)。结合[§8.35](#835-v11-owner-scoped-testrun运行时响应校验2026-10-11)的真实HTTP Schema校验、[§8.36](#836-v11全隔离栈linuxamd64仿真验收2026-10-11)同Web TestRun CLI核验，以及[§8.37](#837-v11-web读取调用绑定生成响应类型2026-10-11)的Web编译期绑定，可覆盖当前V1.1 Read消费者的响应形状；浏览器端canonical Schema运行时校验及HTTP 200畸形响应的UI错误态已在§8.40–8.41通过隔离Web/API/CLI验证；其他版本/服务消费者和发布回退矩阵仍开放。本项不替代用户验收或关闭V1.1/V1。


### 8.36 V1.1全隔离栈linux/amd64仿真验收（2026-10-11）

在Mac M1（Darwin ARM64）Docker Desktop上，以`DOCKER_DEFAULT_PLATFORM=linux/amd64`运行`pnpm test:integration:v11-stage-storage`，并将该Harness、V1.1代码套件内的一次性PostgreSQL helper及Trade Execution容器就绪检查统一固定为linux/amd64。V1.1专用PostgreSQL使用官方`postgres:16.9-alpine` amd64 manifest digest `sha256:b441677c946de564fe88ae4245ba80fe84a69485b22bf560e9c7c3710cd5e21d`，没有改写本机ARM64标签。代码套件退出0；真实API的创建202/读取200响应Schema及身份检查通过；Chromium normal/rejection/recovery为3/3；同TestRun CLI核验通过；Trade Execution amd64容器探针返回CN `BLOCKED`、US `REJECTED`，LIVE与订单提交关闭且订单/成交/事件/outbox计数为0。随机隔离容器、卷、网络、临时镜像均已精确删除并核验，活动服务未连接。

可复现实参及完整输出：[成功日志A05](../../../evidence/audits/2026-10-11-v11-amd64-emulated-isolated-a05.log)、[退出码](../../../evidence/audits/2026-10-11-v11-amd64-emulated-isolated-a05.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v11-amd64-emulated-isolated-a05.log.sha256)。执行前必须设置`V11_POSTGRES_IMAGE`与`STOCKQUANT_POSTGRES_IMAGE`为上述amd64 digest引用，并设置`STOCKQUANT_TRADE_EXECUTION_CONTAINER_PLATFORM=linux/amd64`，否则不同脚本的目标架构不一致。首次尝试及其架构错误保留在[a01–a04](../../../evidence/audits/2026-10-11-v11-amd64-emulated-isolated-a01.log)；定向持久化及Trade readiness检查也分别有独立输出。该结果仅证明Mac上的Linux/amd64仿真，不是原生amd64或Ubuntu主机、资源压力、Qlib/RD-Agent镜像或完整V1验收证据；V1.1状态、人工验收和V1门禁不因此关闭。

### 8.39 CLI运行时响应校验真实Web同Run集成复验（2026-10-11）

修改V1.1 CLI后，重新运行`pnpm test:integration:v11-stage-storage`（退出0）：V1.1完整code suite通过，Chromium normal/rejection/recovery 3/3通过；每个浏览器创建的Run均由同TestRun CLI check-only读取，实际响应经过`V11AcceptanceRun` JSON Schema校验，再完成原有断言检查及证据导出。三个Run共6条业务断言通过，manifest均与导出JSON匹配。机器摘要含Run UUID、场景、断言、manifest与源码Hash：[隔离E2E报告](../../../evidence/audits/2026-10-11-v11-cli-response-schema-isolated-e2e-a01.json)及[SHA-256](../../../evidence/audits/2026-10-11-v11-cli-response-schema-isolated-e2e-a01.json.sha256)。

运行于Mac ARM64上的Linux/amd64仿真栈，仅重启经过校验的隔离Portfolio容器；活动服务未连接，随机项目的容器、卷、网络和镜像已精确清理。三个新Run的`manualConclusion`均为`NOT_RUN`，因此这是开发者自动化而非人验；不替代原生Ubuntu或关闭V1.1/V1剩余门槛。


### 8.40 V1.1 Web读取响应浏览器端运行时Schema校验（2026-10-11）

`apps/web/src/v11-acceptance-run-contract.ts`使用canonical `V11AcceptanceRun` JSON Schema、AJV 2020及format插件解析Web读取响应；V1.1的恢复加载、轮询、创建后读取和恢复后读取均先取`unknown`，校验通过才允许赋入页面状态，形状不符时显示既有错误态。测试拒绝错误stage、额外属性和无效UUID。依赖锁定在Web workspace。

验证通过：`pnpm --filter @stockquant/web test`（3 files/6 tests）、`pnpm --filter @stockquant/web typecheck`、`pnpm --filter @stockquant/web build`及完整`pnpm test:integration:v11-stage-storage`（exit 0；V1.1 code suite、Chromium normal/rejection/recovery 3/3、同Run CLI check-only和export全部通过）。隔离报告记录三个Run UUID/断言/Manifest哈希、源码哈希和清理：[机器报告](../../../evidence/audits/2026-10-11-v11-web-runtime-response-schema-e2e-a01.json)、[SHA-256](../../../evidence/audits/2026-10-11-v11-web-runtime-response-schema-e2e-a01.json.sha256)。环境为Mac ARM64上的Linux/amd64仿真；精确隔离容器、卷、网络和镜像清理完成，活动服务`NOT_CONNECTED`。

浏览器E2E覆盖真实合法响应；错误响应拒绝由Web解析器单测验证；四个读取调用共享该校验器，但本次没有分别触发所有条件分支。三个Run人工结论均`NOT_RUN`。本项关闭浏览器消费端运行时Schema校验这一子项，不关闭其余业务消费者/发布回滚兼容、V1.1阶段或版本验收。


### 8.41 V1.1浏览器处理HTTP 200畸形Run响应（2026-10-11）

在V1.1 normal 浏览器流程完成Run并通过同Run CLI核对/证据导出后，Playwright拦截恢复读取，将真实完成响应附加未声明字段并仍返回HTTP 200。页面显示`Invalid V1.1 acceptance run response`及AJV额外字段错误；这证明Web不会把HTTP成功误当作合同成功，并能进入现有错误提示。随后该浏览器测试正常通过。

复验命令`pnpm test:integration:v11-stage-storage`退出0，完整V1.1 code suite通过，Chromium normal/rejection/recovery 3/3通过；正常/拒绝/恢复三个TestRun的导出Manifest与`evidence.json`匹配，人工结论均`NOT_RUN`。报告：[机器报告](../../../evidence/audits/2026-10-11-v11-web-runtime-response-schema-e2e-a02.json)、[SHA-256](../../../evidence/audits/2026-10-11-v11-web-runtime-response-schema-e2e-a02.json.sha256)。Mac ARM64上的Linux/amd64仿真；恢复只重启精确确认的隔离Portfolio容器；容器、卷、网络和临时镜像精确清理，活动服务`NOT_CONNECTED`。

Playwright拦截模拟的是客户端收到畸形载荷，不证明服务端曾产生畸形响应；后端合法响应由§8.35/§8.39/§8.40验证。此子项不替代V1.1阶段或V1版本人工验收。

### 8.42 V1 跨版本合同生成与漂移门禁复验（2026-10-11）

在当前工作树运行`pnpm contracts:check`。该命令校验`packages/contracts`与Fixtures JSON、TS/Python生成类型及8个服务类型副本、30个客户端生成/漂移器、112条兼容矩阵规则、受注册的OpenAPI合同，并执行生成器注册测试。预期所有检查完成且退出码0；失败时保留日志并按实际失败定位，不以生成器注册成功替代调用点/运行行为证据。

本次通过：312个JSON文件、209个Schema、60个Fixture；类型生成检查204个Schema；30个生成器全部注册且当前生成物无漂移；兼容矩阵112条规则；OpenAPI合同全部通过；注册测试2/2。完整输出、退出码和SHA-256见[当前树合同检查A01](../../../evidence/audits/2026-10-11-v1-contracts-check-p1-a01.log)、对应`.exit.txt`和`.log.sha256`。

此项只确认当前合同与生成器门禁可复现；不证明V1实际调用方全覆盖、身份/副作用正确、迁移回退/发布顺序可用，也不关闭V1.1-S2-L14、P1父项或版本验收。

### 8.43 V1生成客户端生产方法测试引用静态盘点（2026-10-11）

为继续核对V1.1-S2-L14，按A06/A23列出的20个生成客户端文件扫描其实际生产源码调用方法，并检查同一服务中引用该生成客户端类的测试是否也出现相应方法调用。结果为71个生产方法引用、0个缺少同客户端方法级测试引用候选。可复现脚本与逐客户端SHA、调用点、测试路径见[机器报告](../../../evidence/audits/2026-10-11-v1-generated-client-test-inventory-a01.json)和[脚本](../../../evidence/audits/2026-10-11-v1-generated-client-test-inventory-a01.mjs)；总结见[审计A01](../../../evidence/audits/2026-10-11-v1-generated-client-test-inventory-a01.md)。

该脚本仅作词法筛查，方法名在测试中出现不能证明断言充分或运行时行为正确；并不检查OpenAPI schema和操作一一映射、身份/授权/领域副作用、迁移、发布顺序或回滚。共享生成客户端包含V2/V3操作时仍以A06/A23界定版本范围。故这只排除所选生产方法明显没有同类直接测试引用的情况，不关闭V1.1-S2-L14、P1或阶段/版本验收；本节第2/7节复选框与人验状态不变。

### 8.44 V1.1响应合同与当前代码套件复验（2026-10-11）

在当前工作树执行`pnpm verify:stage -- --stage V1.1 --suite code`，受控本机回环运行退出0。全局基线66/66、合同/生成器与Fixture检查、全workspace build/lint/typecheck/unit、V1.1适用服务HTTP/PostgreSQL与migration CLI隔离回归均通过；活动服务未连接，随机隔离数据库/容器/网络清理通过。完整日志、退出码和SHA-256：[a03日志](../../../evidence/audits/2026-10-11-v11-response-contract-code-suite-a03.log)、[exit](../../../evidence/audits/2026-10-11-v11-response-contract-code-suite-a03.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v11-response-contract-code-suite-a03.log.sha256)。

此代码套件复验不表示Web/API三场景的本轮人工签收，也不关闭其余V1消费者、发布/迁移回退矩阵、活动存储切换或V1.1/V1正式验收。

### 8.45 V1.1创建Run OpenAPI路径与响应校验对齐（2026-10-11）

逐项对照`V11AcceptanceController`和Web创建调用后发现，OpenAPI曾把创建操作误写为`POST /api/v1/acceptance/runs`，实际路由是`POST /api/v1/acceptance/v1/v1.1/runs`；owner-scoped读取实际为`GET /api/v1/acceptance/runs/{testRunId}`。已修正文档路径，并扩展`check-openapi-contract.mjs`锁定真实创建路径、local-session保护以及202响应的严格对象字段：`accepted=true`、UUID `testRunId`和限定状态枚举。运行`pnpm contracts:check`通过（312 JSON、209 Schema、60 Fixture、204生成Schema、30生成器、112兼容规则及OpenAPI检查）；Platform API typecheck、Web 6/6单测、`docs:check`（9490链接/0失败）和`git diff --check`通过。

这是合同/门禁纠错，未改变运行时路由或业务行为；此前真实Web/API隔离三场景与同Run证据仍见§8.36/§8.39–8.41。此项不关闭其他跨服务调用/身份/副作用/发布回退矩阵、人工验收或V1门禁。

### 8.46 V1.1固定场景与恢复继续OpenAPI覆盖（2026-10-11）

继续逐项比对V1.1 Web和`PlatformController`，将缺失的`GET /api/v1/acceptance/v1/v1.1/scenarios`及`POST /api/v1/acceptance/runs/{testRunId}/continue-recovery`加入`platform-v11-acceptance.v1.json`。场景目录Schema限定`normal`/`rejection`/`recovery`、版本`1.0.0`及非空标题/预期文本；恢复操作要求owner session、UUID Run路径和空对象请求，202响应只接受`accepted=true`与原`testRunId`。`check-openapi-contract.mjs`现逐项锁定两操作ID、真实路径、安全要求、参数、必要错误状态和响应结构。

`pnpm contracts:check`、Platform API typecheck、Web单测6/6、文档链接检查和diff检查通过，完整日志与退出码见[验证a02](../../../evidence/audits/2026-10-11-v11-acceptance-route-contract-a02.log)、[exit](../../../evidence/audits/2026-10-11-v11-acceptance-route-contract-a02.exit.txt)和[SHA-256](../../../evidence/audits/2026-10-11-v11-acceptance-route-contract-a02.log.sha256)。V1.1三场景隔离E2E/恢复行为既有证据见§8.36、§8.39–8.41；本项补齐合同声明与漂移防护，不替代本轮用户验收或所有V1跨服务/发布回退审查。

### 8.47 V1共享证据导出双投影OpenAPI合同（2026-10-11）

核对`evidence-export-core.mjs`与Platform API后，将共享`GET /api/v1/acceptance/runs/{testRunId}/evidence`加入OpenAPI。合同明确owner-session与UUID身份边界，并用`oneOf`区分V1.1专用导出Envelope和持久化StageRun投影；两种结构都必须包含mode、run、assertions和`manualConclusion: NOT_RUN`，避免导出接口把人工作业结论伪装成自动通过。实际Exporter使用该共享路由的阶段为V1.1、V1.3、V1.5；V1.2与V1.4使用各自版本的Run路由，虽然共享API本身也可读取这些StageRun。`check-openapi-contract.mjs`现验证两投影版本标记、V1阶段枚举、关键字段、认证和404/401状态。

`pnpm contracts:check`通过，V1.1 acceptance OpenAPI当前3个操作均经过显式漂移校验；`git diff --check`通过。证据日志见[合同检查](../../../evidence/audits/2026-10-11-v1-evidence-export-contract-a01.log)、[退出码](../../../evidence/audits/2026-10-11-v1-evidence-export-contract-a01.exit.txt)和[SHA-256](../../../evidence/audits/2026-10-11-v1-evidence-export-contract-a01.log.sha256)。本项仅补齐运行时已存在的共享导出API合同，不证明V1.3/V1.5共享分支、V1.2/V1.4专用Run导出、历史Run可恢复或验收条件满足。

### 8.48 V1.1共享证据导出真实隔离API回归（2026-10-11）

修复隔离集成脚本读取创建Run OpenAPI响应Schema时使用旧路径的问题，并扩展隔离Stage存储API运行：创建同一V1.1 Run后读取owner-scoped证据，断言HTTP 200、`evidenceVersion=v1.1-1`、相同TestRun UUID/owner/stage、固定`PAPER/FIXTURE/FAKE`模式、assertions数组及`manualConclusion=NOT_RUN`。完整命令`pnpm test:integration:v11-stage-storage`退出0；该命令内V1.1完整code suite退出0、Chromium normal/rejection/recovery 3/3，迁移/PostgreSQL与相关服务隔离回归通过；随机隔离容器、卷、网络及镜像清理核验通过。真实Run `eaf7baec-5966-456a-b55c-955d7a06e8ee`状态`COMPLETED`、2条断言，证据版本`v1.1-1`。完整输出、exit及SHA-256见[隔离验证日志](../../../evidence/audits/2026-10-11-v11-evidence-export-isolated-a01.log)、[exit](../../../evidence/audits/2026-10-11-v11-evidence-export-isolated-a01.exit.txt)和[SHA-256](../../../evidence/audits/2026-10-11-v11-evidence-export-isolated-a01.log.sha256)。

此项证明V1.1当前Stage存储实现和隔离部署的真实导出响应满足已声明投影，并且不会代签人工结论；本次V1.1运行未覆盖共享API的StageRun分支（Exporter在V1.2/V1.4走专用Run路由，在V1.3/V1.5使用共享路由）。其他阶段消费者/发布回退与历史Run恢复、当前范围人工验收、正式版本门禁仍分别开放。

### 8.50 V1.1 TestRun并发恢复领取fencing（2026-10-11）

V1.1 `ScenarioRunner.start`与`continueRecovery`此前先读取状态再无条件写入`RUNNING`；重复触发可能让两个请求都通过状态检查并同时执行同一Run。现增加Repository条件状态迁移：仅一个请求可将`QUEUED→RUNNING`或`WAITING→RUNNING`，输掉竞争的调用直接返回；stage模式在同一PostgreSQL事务中对legacy `test_runs`和`acceptance_stage_runs`双写，若两侧状态不一致则回滚。

隔离持久化脚本对legacy与stage两种存储分别同时发出两个`WAITING→RUNNING`请求，均观察到且仅一个成功，随后核对状态及stage parity。完整命令`pnpm test:integration:v11-stage-storage`退出0：V1.1 code suite退出0、Platform 67个测试文件327项通过、Chromium normal/rejection/recovery 3/3及同Run CLI/export通过；随机项目`sq-v11-stage-c9c46d85b316aa838f5b`的容器、卷、网络、镜像精确清理。原始输出、退出码与SHA-256见[隔离回归日志](../../../evidence/audits/2026-10-11-v11-concurrent-recovery-claim-a01.log)、[exit](../../../evidence/audits/2026-10-11-v11-concurrent-recovery-claim-a01.exit.txt)及[SHA-256](../../../evidence/audits/2026-10-11-v11-concurrent-recovery-claim-a01.log.sha256)；Platform类型检查通过。

另新增应用层并发断言`lets only one concurrent continuation read and finalize a waiting run`：两个并发继续请求只产生一个成功领取、一次Portfolio快照读取、一次断言写入和一个COMPLETED终态。新增测试后完整`pnpm verify:stage -- --stage V1.1 --suite code`再次退出0，Platform 68个测试文件328项通过，见[当前code suite日志](../../../evidence/audits/2026-10-11-v11-concurrent-recovery-claim-code-suite-a02.log)、[exit](../../../evidence/audits/2026-10-11-v11-concurrent-recovery-claim-code-suite-a02.exit.txt)及[SHA-256](../../../evidence/audits/2026-10-11-v11-concurrent-recovery-claim-code-suite-a02.log.sha256)。

该fencing只覆盖V1.1 TestRun启动/恢复的并发领取，不证明跨主机恢复、活动API切换、历史Run恢复或当前范围人工验收；V1.1及V1版本状态继续OPEN/NOT_RUN。

### 8.49 活动 Platform/PostgreSQL/Artifact 挂载只读复核（2026-10-11）

对Runbook指定的活动容器执行只读检查：Platform API、PostgreSQL和Research Automation均running/healthy。Platform API实际为`STOCKQUANT_V11_RUN_STORAGE=legacy`、无容器挂载且未设置`STOCKQUANT_ARTIFACT_CONTENT_ROOT`；PostgreSQL数据卷为`stockquant-v12_postgres-v11`，Research Automation将Artifact目录挂在`stockquant-v12_research-artifacts-v1`。仓库Compose则同时为Platform API和Research Automation声明该Artifact卷，证实活动Platform实例与当前Compose的挂载配置漂移。只读容器检查[机器报告A04](../../../evidence/audits/2026-10-11-v1-active-runtime-preflight-a04.json)，SHA-256见[sidecar](../../../evidence/audits/2026-10-11-v1-active-runtime-preflight-a04.json.sha256)，运行限制与结论见[存储切换Runbook](../../../docs/operations/v11-test-run-storage-cutover.md#2026-10-11-活动运行时只读复核-a04)。

此检查没有读取Artifact字节、数据库内容或TestRun正文，没有备份/恢复、切换、重启、挂载变更或Run处置。由于目标实例、实际Artifact文件与数据库引用、旧非终态Run责任人处置、维护窗口和回退批准仍未确认，活动存储项继续NOT_READY/NOT_AUTHORIZED/NOT_DEPLOYED；不因容器健康或隔离测试而放行。

### 8.51 V1.1 CN/US模拟账户账本当前树PostgreSQL复验（2026-10-11）

当前树在隔离`portfolio_risk_test` PostgreSQL数据库复跑账户持久化集成文件：

```bash
PORTFOLIO_RISK_TEST_DATABASE_URL=postgresql://portfolio_risk@127.0.0.1:5433/portfolio_risk_test pnpm --filter @stockquant/portfolio-risk-service exec vitest run tests/integration/resource-reservations.spec.ts
```

退出码0；单文件6/6通过。`persists separate CN and US cash ledgers with original currencies and conflict-safe initialization replay`同时创建独立CN_A/CNY与US_EQUITY/USD账户，核对原币余额与独立账本，验证同载荷重放返回原账户、不同载荷/owner复用幂等键被拒绝、跨owner快照不可见，并逐项检查两本账的数据库流水币种/笔数/金额。测试为每次运行生成随机TestRun/账户，finally按精确账户ID删除流水与账户；本次没有初始化Fixture或提交订单。日志与SHA分别见[执行记录](../../../evidence/audits/2026-10-11-v11-dual-market-account-ledger-integration-a01.log)、[退出码](../../../evidence/audits/2026-10-11-v11-dual-market-account-ledger-integration-a01.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v11-dual-market-account-ledger-integration-a01.log.sha256)。该复验只证明这一账户初始化/账本原币/幂等/owner隔离切片，不替代账户Web人工验收、全后端交付、Ubuntu或V1.1/版本门禁。

当前树再次通过受控隔离PostgreSQL harness复跑同一集成文件，6/6通过；容器与网络由脚本精确删除并核验。复跑日志/exit/Hash见[a02](../../../evidence/audits/2026-10-11-v11-dual-market-account-ledger-integration-a02.log)、[exit](../../../evidence/audits/2026-10-11-v11-dual-market-account-ledger-integration-a02.exit.txt)及[SHA-256](../../../evidence/audits/2026-10-11-v11-dual-market-account-ledger-integration-a02.log.sha256)。Platform账户详情定向单测3/3通过，覆盖US初始化请求的市场、原币现金和TestRun namespace派生及owner-scope拒绝，见[unit日志](../../../evidence/audits/2026-10-11-v11-account-details-unit-a01.log)与[SHA-256](../../../evidence/audits/2026-10-11-v11-account-details-unit-a01.log.sha256)。以上是当前树代码/DB边界证据，不创建验收TestRun，也不改变阶段backend PARTIALLY_IMPLEMENTED或新增范围人工验收NOT_RUN。


### 8.52 当前V1.1手册启动复验受BuildKit frontend阻塞（2026-10-11）

按§8.1执行`pnpm stack:up -- --stage V1.1`，随机项目`sq-v11-stack-5bbc133167690245d540`生成状态并开始容器构建，但Docker BuildKit停留在解析`docker/dockerfile:1.7` frontend元数据阶段约3分钟；Web/API未达到可访问状态。本次命令由执行者中止，exit 130；因此未验证本轮动态URL、Web页面及session，不标记本轮runbook PASS。完整构建输出与退出码见[启动日志](../../../evidence/audits/2026-10-11-v11-interactive-stack-up-manual-rerun-a01.log)、[退出码](../../../evidence/audits/2026-10-11-v11-interactive-stack-up-manual-rerun-a01.exit.txt)。随后对该精确随机项目执行§8.1给出的`pnpm stack:down -- --project sq-v11-stack-5bbc133167690245d540`，exit 0，`STOPPED_AND_PURGED`；详细结果见[清理记录](../../../evidence/audits/2026-10-11-v11-interactive-stack-down-manual-rerun-a01.md)。历史§8.14成功证据保留，但当前Docker frontend可用后仍须重新运行启动、URL/session核对及清理。


替代构建器复验（2026-10-11）：Docker宿主为`linux/aarch64`，`default`及`desktop-linux`均可用。默认builder与desktop context不匹配时会立即拒绝；显式同时使用`DOCKER_CONTEXT=default BUILDX_BUILDER=default`后仍停在相同frontend元数据阶段。第二个随机项目已精确清理。当前启动步骤仍不能判为PASS；日志/退出码/清理细节见[A09](../../../evidence/audits/2026-10-11-v1-gap-matrix-semantic-review-a09.md)。

### 8.53 V1.1 当前工作树完整隔离Web/API/CLI复验（2026-10-11）

重新执行`pnpm test:e2e -- --stage V1.1`，当前 Docker daemon/builder 成功解析锁定的`docker/dockerfile:1.7` frontend并构建隔离栈；完整V1.1 code suite exit 0，脚本66/66，Platform 68文件/328项、Portfolio 6项集成、Market Data 28项集成及Trade/服务身份/迁移/合同检查通过。Chromium normal/rejection/recovery 3/3通过，三个Web TestRun分别为`18645fbb-f72b-496b-904b-b2736d7d14cb`、`b57fe505-81ae-45b3-beb3-0cc2848b7374`及`baa4cae7-2239-49f2-a356-c3cac4f4c40b`；每个Run由同UUID CLI `--check-only`核验并导出Evidence Bundle。执行时E2E源码SHA-256为`e970faeae7fb234b7c5310a9e5ab33a54bb2f4d7e888dc58c2abd6f0c7e0ca7f`。随机Compose项目的容器、卷、网络和镜像精确清理并验证；活动服务未连接，三条Run的人工结论仍为`NOT_RUN`。原始输出、exit和Hash见[完整日志](../../../evidence/audits/2026-10-11-v11-current-tree-web-e2e-a01.log)、[退出码](../../../evidence/audits/2026-10-11-v11-current-tree-web-e2e-a01.exit.txt)及[SHA-256](../../../evidence/audits/2026-10-11-v11-current-tree-web-e2e-a01.log.sha256)。该结果解决BuildKit frontend在本次受控执行中的启动阻塞，并核实当前Web源；不证明Ubuntu主机手册、活动存储切换/回退或人工验收完成。

### 8.54 当前V1.1交互栈动态URL/session与精确清理（2026-10-11）

按本阶段§8.1实际执行`pnpm stack:up -- --stage V1.1`，本机linux/arm64 Docker Desktop成功构建并启动随机项目`sq-v11-stack-57c17c2dfc2780620ed7`；Web `http://127.0.0.1:55450/acceptance/v1/v1.1`与API `http://127.0.0.1:55449`均实测可用。Web返回200；API `/api/v1/session`返回200、用户`acceptance-owner-1`和`LOCAL_DEVELOPMENT`模式，并设置HttpOnly `sq_session`；会话值没有记录。随后使用本次输出的精确项目ID执行`pnpm stack:down -- --project sq-v11-stack-57c17c2dfc2780620ed7`，返回`STOPPED_AND_PURGED`，随机容器、PG卷、网络、镜像及凭据文件均清除。启动/清理原始日志与sidecar见[完整复验报告](../../../evidence/audits/2026-10-11-v11-interactive-stack-current-a01.md)。

此结果更新§8.52当时的BuildKit阻塞状态：当前本机隔离启动、动态URL/session与清理步骤已复验；Ubuntu主机交付字段、活动API存储切换与回退、旧非终态Run处置和本轮人验继续未关闭。三条Web E2E Run的`manualConclusion`仍是`NOT_RUN`。

### 8.55 V1.1当前树完整代码套件受控回归（2026-10-11）

执行`pnpm verify:stage -- --stage V1.1 --suite code`。沙箱首轮因`127.0.0.1`监听权限被拒而有两项基线测试失败；保留该失败结果后，在受控本机回环权限下重跑相同命令，最终exit 0。受影响的`seed:paper`测试均通过，覆盖只初始化V1两个市场、不经订单/Fill路由，以及非回环目标、缺失Session、错误stage和已启动Run的失败关闭。完整基线、合同/Fixture、服务构建与类型检查、V1.1适用服务HTTP/PostgreSQL和迁移CLI隔离回归均通过；临时数据库/容器/网络报告清理完成，活动服务为`NOT_CONNECTED`。

原始复跑日志、退出码和SHA-256见[完整代码套件a01](../../../evidence/audits/2026-10-11-v11-current-code-suite-a01.log)、[exit](../../../evidence/audits/2026-10-11-v11-current-code-suite-a01.exit.txt)和[SHA-256](../../../evidence/audits/2026-10-11-v11-current-code-suite-a01.log.sha256)。这只证明当前代码套件自动检查通过；不替代当前范围人工签收、活动存储切换/回退、真实Ubuntu或V1.1/V1正式验收。

### 8.56 V1.1当前树Web/API/CLI三场景及证据导出复验（2026-10-11）

执行`pnpm test:e2e -- --stage V1.1`，当前树完整代码套件与Chromium normal/rejection/recovery通过，Playwright 3/3。三个Web TestRun由同UUID CLI `--check-only`校验并各自导出Evidence Bundle：normal `857edda5-c809-4b62-a416-9a648dc6669c`、rejection `73e71224-bf7f-4894-9e87-d19a65125954`、recovery `d8db66a6-540b-4efa-8b35-db42b777fd35`。对应Manifest SHA-256依次为`21ca11233292089db6e3730de82c431ab06f7ae93e1e86de4bdb6baa8cd97112`、`bba7a1b34c61233cbdde8d65654a0900b0e948a082596b2ff57ab3030fe43d36`、`1c2f00ab39e734f9f4f22bd0fc548bf070fa58cc277c9d3ce2cc295e66b64dd7`。恢复场景仅重启经核验的隔离Portfolio容器；最后容器、卷、网络和镜像精确移除并验证，活动服务`NOT_CONNECTED`。

完整命令输出、退出码和日志SHA见[当前树E2E a02](../../../evidence/audits/2026-10-11-v11-current-tree-web-e2e-a02.log)、[exit](../../../evidence/audits/2026-10-11-v11-current-tree-web-e2e-a02.exit.txt)和[SHA-256](../../../evidence/audits/2026-10-11-v11-current-tree-web-e2e-a02.log.sha256)；三份结构化导出位于`evidence/local/V1.1/<testRunId>/`。三个Run的自动化断言通过不等于人工签收，其`manualConclusion`仍为`NOT_RUN`；活动存储切换/回退、Ubuntu及完整阶段验收仍OPEN。

### 8.57 同一Web TestRun到Portfolio账本的隔离只读核对（2026-10-11）

在V1.1 Playwright normal、rejection、recovery三条用例中，Web Run先由相同UUID执行CLI `--check-only`并导出Evidence Bundle，再读取Platform `test_runs`与Portfolio `accounts`、`ledger_entries`、`account_positions`。三条均确认TestRun、owner和account ID一致；账户为`CN_A/PAPER/FAKE`、余额`10000.0000 CNY`、仅一条`INITIAL_CASH=10000 CNY`流水且无持仓。Recovery在核验数据库前仍只重启已验证的隔离Portfolio容器。

查询通过Docker Compose `exec`只读`SELECT`，并强制随机项目名匹配`^sq-v11-stage-[a-f0-9]{20}$`；不是操作活动数据库的手动SQL入口。完整代码套件、三场景E2E均exit 0（Playwright 3/3），随机容器/卷/网络/镜像精确清理通过。日志、exit与SHA见[E2E a01](../../../evidence/audits/2026-10-11-v11-same-run-db-crosscheck-e2e-a01.log)、[退出码](../../../evidence/audits/2026-10-11-v11-same-run-db-crosscheck-e2e-a01.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-11-v11-same-run-db-crosscheck-e2e-a01.log.sha256)。该自动化映射关闭固定Fixture的同Run DB核对缺口；不代表市场规则完整、活动存储切换、Ubuntu或本人验收完成，三条Run的人工结论仍为`NOT_RUN`。

### 8.58 V1.1恢复继续路由模式注入拒绝与无副作用验证（2026-10-12）

在既有V1.1恢复场景创建的同一`WAITING` TestRun上，分别向`POST /api/v1/acceptance/runs/{testRunId}/continue-recovery`注入`LIVE/FAKE`、`PAPER/REAL`和`LIVE/REAL`，三次均返回HTTP 422；每次随后GET原Run仍为`WAITING`。接着仅重启经隔离Compose项目核验的Portfolio Risk容器，按正常恢复操作继续同一Run并完成；同Run CLI `--check-only`及Evidence Bundle导出完成，Portfolio只读账本MATCH（10000.0000 CNY、单条INITIAL_CASH、无持仓）。normal/rejection/recovery三个Run分别为`c6d3c152-45db-4ca7-8312-1a2637d66b90`、`9d276c96-d7a5-4439-a637-0a97b92d7d71`、`a6de0151-c181-4c2a-a767-04d7024ced79`；Manifest SHA-256分别为`ac02e1ffa178eeb2b5189a61613fcf6f9d1706801212161f296293af0a6f3e07`、`3a6af8fd363fbc8f38a7bccf415ea3493ab2e400b106592cd5757fd76df36129`、`0b3380df06128715d09ffd77a6cff95a9f73257845a8446f417bc87615953106`。完整`pnpm test:e2e -- --stage V1.1`与`pnpm verify:stage -- --stage V1.1 --suite code`均受控退出0，Playwright 3/3，隔离容器/卷/网络/镜像精确清理通过；活动服务未连接。E2E日志[日志](../../../evidence/audits/2026-10-12-v11-recovery-mode-boundary-e2e-a01.log)，SHA-256见[sidecar](../../../evidence/audits/2026-10-12-v11-recovery-mode-boundary-e2e-a01.log.sha256)；完整代码套件日志[日志](../../../evidence/audits/2026-10-12-v11-recovery-mode-boundary-code-suite-a01.log)，SHA-256见[sidecar](../../../evidence/audits/2026-10-12-v11-recovery-mode-boundary-code-suite-a01.log.sha256)。三个Run的`manualConclusion`仍`NOT_RUN`，该固定隔离测试不关闭V1.1其他跨服务模式边界、活动存储切换/回退、Ubuntu或阶段人工验收。

### 8.59 V1.1 双市场账户初始化零持仓 PostgreSQL 断言（2026-10-12）

补强 `services/portfolio-risk-service/tests/integration/resource-reservations.spec.ts` 中双市场账户初始化集成测试：对 CN_A/CNY 与 US_EQUITY/USD 的真实隔离 PostgreSQL 账户，同时断言返回快照 `positionCount=0`，并直接查询 `account_positions` 确认两个新账户没有持仓行。原有断言继续验证不同账户ID、原币初始现金、每本账一条且金额正确的 INITIAL_CASH、同载荷幂等重放、不同现金或owner复用键拒绝，以及跨owner快照不可见。

`pnpm test:integration:v11-stage-storage` 在随机Compose项目中运行完整V1.1 code suite及normal/rejection/recovery浏览器回归，退出0；Portfolio integration 6/6、Portfolio单测12/12、Playwright 3/3通过。三个Web Run经同UUID CLI与Evidence Bundle校验，Portfolio持仓查询均为0；脚本确认只重启隔离Portfolio容器，并移除且核验该随机项目容器、卷、网络和镜像。活动服务`NOT_CONNECTED`。完整输出、退出码及SHA见[运行日志a02](../../../evidence/audits/2026-10-12-v11-dual-market-initial-position-e2e-a02.log)、[退出码](../../../evidence/audits/2026-10-12-v11-dual-market-initial-position-e2e-a02.log.exit.txt)及[SHA-256](../../../evidence/audits/2026-10-12-v11-dual-market-initial-position-e2e-a02.log.sha256)；此前沙箱拒绝Docker daemon的首轮尝试保留于[a01](../../../evidence/audits/2026-10-12-v11-dual-market-initial-position-e2e-a01.log)。本证据关闭双市场初始现金/零持仓/幂等账户初始化的隔离工程子项，不代表V1.1阶段、人工作业、Ubuntu或V1验收通过。


### 8.60 V1 Artifact生产者/引用者当前源码边界复核（2026-10-12）

静态核对当前V1 Artifact边界：V1.2 Qlib新字节存入与V3.1 Research共用的`research-artifacts-v1`目录，但各自引用元数据由不同服务持有；V1.4报告/Manifest由Quant PostgreSQL持有并由Platform TestRun投影引用；V1.2 Market Data Fixture Dataset是Market Data关系型表，不是共享文件对象。TestRun导出是来源证据副本，订单、Fill、账本、授权与工作流事实仍由各业务域持有。

当前源码Hash、生产/消费/删除入口区分和覆盖边界见[Artifact生产者盘点A02](../../../evidence/audits/2026-10-12-v1-artifact-producer-inventory-a02.md)；人工语义结论见[A31](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a31.md)。内容store的`remove`是受SHA/路径保护的原语；Research失败发布回滚仅在确认无持久引用时移除暂存字节，引用读取失败即保留；V3.1 age-gated核对会隔离有限Research候选，不是V1全局过期/删除调度器。OD-013仍OPEN，未批准默认expiresAt、过期调度或物理清理。

本次仅审阅工作树源码与既有测试，没有连接活动服务、扫描活动卷/数据库或执行清理。共享目录的跨owner引用权威、统一保留政策、活动切换/配对恢复和并发回收证明仍缺，故`V1.1-S2-L20`保持OPEN/PARTIAL。

### 8.61 V1.1 当前树完整隔离阶段入口复跑（2026-10-12）

执行 `pnpm test:e2e -- --stage V1.1`，完整输出见[阶段日志](../../../evidence/audits/2026-10-12-v11-current-tree-stage-e2e-a01.log)、[退出码](../../../evidence/audits/2026-10-12-v11-current-tree-stage-e2e-a01.log.exit.txt)及[SHA-256](../../../evidence/audits/2026-10-12-v11-current-tree-stage-e2e-a01.log.sha256)。退出码0；包含V1.1完整code suite（脚本67/67、Platform 68文件336项、Governance 43项、Trade 110项、Quant 101项、Market Data集成28项、Portfolio集成6项、Python适配器69项）、代码质量/类型/合同/Fixture检查及Chromium normal/rejection/recovery 3/3。

三个新Run分别为 `2e0b5366-1d1e-463a-917d-291db599c4b2`、`734cd8d0-d601-45c3-af29-40498d6cf0f1`、`4f149406-7dbf-4884-89b9-bf203fc7524d`；每个均以同Run CLI检查并导出结构化证据，直接只读核对同一TestRun对应的Portfolio账本为CNY 10,000.0000、单条初始现金流水、零持仓、MATCH。恢复场景只重启经隔离Harness核验的Portfolio容器。随机项目 `sq-v11-stage-c66144deb623c77fffdd` 的容器、卷、网络和镜像均按精确名称移除并核实。

本条只记录当前树自动回归结果；三个Run的 `manualConclusion` 保持 `NOT_RUN`，不勾选用户验收。它不证明活动API存储切换、活动数据配对恢复、Ubuntu实机或V1.1正式阶段签收已完成。

### 8.62 Platform→Trade V1.3客户端逐操作超时合同（2026-10-12）

`GeneratedPlatformV13ManualTradeClient`的10个V1 Trade操作已有路由/身份/载荷或查询直接测试；本次补充逐操作超时预算断言，写操作固定15秒，两个只读查询固定5秒。新增用例`uses the declared bounded timeout for every V1 Trade operation`依次调用全部10个方法并锁定超时向量；定向客户端测试11/11、Platform typecheck exit 0。[测试日志](../../../evidence/audits/2026-10-12-v13-platform-trade-client-timeouts-a01.log)、[exit](../../../evidence/audits/2026-10-12-v13-platform-trade-client-timeouts-a01.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v13-platform-trade-client-timeouts-a01.log.sha256)、[typecheck日志](../../../evidence/audits/2026-10-12-v13-platform-trade-client-timeouts-typecheck-a01.log)。语义复核[A42](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a42.md)及[A88矩阵](../../../evidence/audits/2026-10-12-v1-current-gap-matrix-a88.json)仅刷新V1.1-S2-L14这一条证据边。

此测试锁定client transport timeout配置，不验证所有服务的调用图/部署兼容或发布/回退；L14、P1及V1仍OPEN。活动切换未授权，当前范围人工验收仍NOT_RUN。

### 8.63 Platform→Portfolio账户客户端逐操作超时合同（2026-10-12）

V1 Platform→Portfolio生成客户端的六个操作此前已有路径、caller身份、请求载荷/owner header及错误透传断言，但未逐操作锁定统一5秒超时。本轮新增`uses the declared bounded timeout for every V1 account operation`，实际调用`initializeAccount`、`getAccountSnapshot`、`reserveAccountResources`、`recordAccountFill`、`correctAccountFillFee`和`resolveAccountReservation`，断言6个请求各自创建5000ms `AbortSignal.timeout`。未改生产行为或合同。

验证：`pnpm --filter @stockquant/platform-api-service exec vitest run tests/unit/portfolio-account-client.spec.ts` 4/4通过；同服务`typecheck`退出0。原始日志：[定向客户端测试](../../../evidence/audits/2026-10-12-v1-platform-portfolio-account-timeouts-a01.log)、[typecheck](../../../evidence/audits/2026-10-12-v1-platform-portfolio-account-timeouts-typecheck-a01.log)；语义复核[A43](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a43.md)。测试源码SHA-256：`7fbdca5adc9c79c0f4888e9f4b474132584b4035213a5c774e206dfdbaaa5720`。

本证据只关闭Platform→Portfolio六个方法的超时预算断言；不关闭V1调用方/路由/副作用完整矩阵、发布兼容、迁移、活动切换/回退、配对恢复或用户验收。V1.1-S2-L14、P1及V1版本门禁继续OPEN。

### 8.64 共享 Artifact 内容并发发布原子性（2026-10-12）

代码复核发现同一不可变地址的并发发布会竞争创建最终文件；直接写最终路径可能让读取方观察到尚未写完的内容，且重复发布可能把正常的`EEXIST`当失败。现改为在目标目录内创建独占临时文件，写入并`fsync`后通过硬链接原子创建内容地址；竞争者遇到已存在地址时只接受Hash相同的普通文件。临时路径在成功/失败后清除；原有Hash、路径穿越及符号链接拒绝保持。

验证：16个独立store实例并发发布相同地址，全部成功；每个实例读取到完整相同字节，目录仅含唯一目标文件。`pnpm --filter @stockquant/artifact-content-store test` 6/6、Research Artifact单测6/6与`lint`退出0、Platform Qlib单测2/2通过；`pnpm verify:stage -- --stage V1.1 --suite code`受控本机loopback复验exit 0，包含共享包测试及完整基线。首次受限沙箱套件结果保留为a01（回环监听EPERM和既有V2门禁预期状态断言）；受控复验a02通过，随机PostgreSQL容器/网络清理通过。日志：[完整套件](../../../evidence/audits/2026-10-12-v11-artifact-atomic-publish-code-suite-a02.log)、[exit](../../../evidence/audits/2026-10-12-v11-artifact-atomic-publish-code-suite-a02.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v11-artifact-atomic-publish-code-suite-a02.log.sha256)。

本证据关闭相同内容并发可见性/幂等发布子项；不授权到期调度、物理清理或活动内容卷操作。跨生产者引用权威、OD-013政策、活动部署配对恢复及全链路Artifact验收仍OPEN。


### 8.65 共享Artifact内容发布与移除的目录项持久性（2026-10-12）

并发发布已采用同目录临时文件和原子硬链接，但仅对临时数据文件执行`fsync`不足以证明最终目录项已持久化。本轮在内容地址发布成功（含相同内容竞争者校验）后同步父目录；移除经Hash/文件身份核验并unlink后也同步父目录；临时文件清理后再次同步目录。任一目录同步失败时调用失败关闭，不能报告成功。未增加过期调度或任何清理行为。

共享包测试6/6通过，包含16个独立store并发写同一地址、读回完整内容、路径/符号链接拒绝及Hash保护移除。改动后`pnpm verify:stage -- --stage V1.1 --suite code`受控loopback运行退出0；Platform 68文件/338项、Research Automation 38文件/218项单测及完整基础/迁移/隔离检查均通过。日志见[完整套件a02](../../../evidence/audits/2026-10-12-v11-artifact-directory-fsync-code-suite-a02.log)、[exit](../../../evidence/audits/2026-10-12-v11-artifact-directory-fsync-code-suite-a02.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v11-artifact-directory-fsync-code-suite-a02.log.sha256)。另以缓存镜像`sha256:a909cdd91e23825346b4c716ed057ad2e66e8ee58dc9417a3e8ea39bf3c6d936`在`linux/arm64`、禁网、只读源码挂载容器运行包测试，6/6通过；[环境与日志](../../../evidence/audits/2026-10-12-artifact-content-store-linux-arm64-a02.log)、[exit](../../../evidence/audits/2026-10-12-artifact-content-store-linux-arm64-a02.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-artifact-content-store-linux-arm64-a02.log.sha256)。该为容器化目标架构证据，不是Ubuntu宿主/活动卷恢复证据。活动Artifact卷未挂载/操作，临时资源清理且活动服务`NOT_CONNECTED`。

这只关闭共享不可变内容地址在本地文件系统上的目录项持久性切片；跨Producer/owner引用权威、OD-013保留期限、过期调度和物理清理、活动迁移/配对恢复及全V1交付仍未完成，V1.1-S2-L20/P1继续OPEN。

### 8.66 V1 Artifact当前源码哈希与共享内容包测试复核（2026-10-12）

复核V1.1-S2-L20相关共享目录、Platform/Qlib、Platform TestRun、Quant/V1.4报告和Research引用入口。发现A02中部分源码哈希随A96等后续修改已过期，现刷新当前源码SHA并直接运行`node --test packages/artifact-content-store/index.test.mjs`，6/6通过。该测试覆盖不可变内容发布/读Hash、16路同址竞争、路径与符号链接防护、精确内容移除保护；测试日志和SHA见[当前测试](../../../evidence/audits/2026-10-12-artifact-content-store-current-a01.log)，源码边界与当前Hash见[A03](../../../evidence/audits/2026-10-12-v1-artifact-producer-inventory-a03.md)。

本次只更新静态源码/包测试证据，没有连接活动服务或挂载卷。代码存在EXPIRED状态、显式expiresAt字段和受保护remove原语，不表示启用默认期限/定时转换/物理回收。跨Producer/TestRun引用权威、OD-013、活动切换/回退及配对恢复仍缺；V1.1-S2-L20和P1继续OPEN。


### 8.67 P0/L17 V1.1 Paper入口客户端模式注入矩阵（2026-10-12）

把V1.1 Run创建、US账户初始化和恢复继续三个HTTP接受入口扩展为六种客户端组合：`PAPER/FAKE`、`LIVE/FAKE`、`PAPER/REAL`、`BACKTEST/FAKE`、`BACKTEST/REAL`、`LIVE/REAL`。三入口均由服务器派生业务模式，客户端自行提供任一组合都返回422。normal Run测试同时校验受拒请求后隔离PostgreSQL中该Run仅有原CN_A账户（1条）、US_EQUITY账户为0；恢复Run每次拒绝后仍WAITING，随后合法恢复完成。未触碰活动服务。

验证命令：`pnpm test:e2e -- --stage V1.1`，exit 0，包含V1.1完整代码门禁和Chromium 3/3，随机Compose项目、容器、卷、网络、镜像精确清理。normal/rejection/recovery Run分别为`471d4ec3-f6dc-41b2-8aaf-9e91d63f8c02`、`4c168a55-4140-4106-8054-0c4c2dacbd0f`、`1b857489-47f3-41bb-8727-0e513ccca08c`；均完成同Run CLI/export。自动Run人工结论保持`NOT_RUN`。日志：[阶段入口与完整代码套件](../../../evidence/audits/2026-10-12-v11-l17-client-mode-matrix-b03.log)、[exit](../../../evidence/audits/2026-10-12-v11-l17-client-mode-matrix-b03.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v11-l17-client-mode-matrix-b03.log.sha256)。首轮受限Docker socket诊断保留：[a01](../../../evidence/audits/2026-10-12-v11-l17-client-mode-matrix-b01.log)。

本项只关闭V1.1三个Paper接受入口的模式注入原子子项；全V1服务/Worker路由、页面状态/余额写入、发布/回退、Ubuntu和阶段/人工验收仍开放。P0/L17与V1保持OPEN。

### 8.68 当前树完整V1.1 code suite与Web/API/CLI E2E复验（2026-10-12）

在近期共享Platform、Portfolio、Trade与Web改动后，执行完整V1.1 code suite退出0；随后`pnpm test:e2e -- --stage V1.1`退出0，Chromium normal/rejection/recovery 3/3。最新运行环境macOS ARM64、Node 24.1.0、Playwright隔离项目`sq-v11-stage-97d041d9772cb1bd89f8`；场景路由`/acceptance/v1/v1.1`，账户Fixture `fixtures/v1/v1.1/accounts.json`，版本`v1.1-accounts-1`，SHA-256 `575d2cb5e674bacbf951d9ca485c7e5c8e49e9d15bbb4623a71fd0c08c3685f4`。最新Run分别为normal `8b250377-6207-4320-a0ac-6a4bd09db2a5`、rejection `79616f50-aa8b-4ba7-a2dc-d20c1d814622`、recovery `bbb31707-aaaf-423a-852b-c45247b72221`；均由同Run CLI `--check-only`核验、结构化Evidence Bundle导出、Portfolio账本确认现金10000.0000 CNY且持仓0，所有Run人工结论仍`NOT_RUN`。三张截图与SHA清单见[截图Manifest](../../../evidence/audits/2026-10-12-v11-browser-captures-sq-v11-stage-97d041d9772cb1bd89f8/manifest.json)。

完整记录：[V1.1 code suite日志](../../../evidence/audits/2026-10-12-v11-post-current-tree-code-suite-a01.log)、[exit](../../../evidence/audits/2026-10-12-v11-post-current-tree-code-suite-a01.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v11-post-current-tree-code-suite-a01.log.sha256)；[最新Web/API/CLI E2E日志](../../../evidence/audits/2026-10-12-v11-post-current-tree-web-e2e-a07.log)、[exit](../../../evidence/audits/2026-10-12-v11-post-current-tree-web-e2e-a07.exit)、[SHA-256](../../../evidence/audits/2026-10-12-v11-post-current-tree-web-e2e-a07.log.sha256)。所有本次隔离测试容器、PostgreSQL卷和网络由Harness精确清理。自动结果不验证活动存储切换/回退、真实Ubuntu或人工验收。

### 8.69 V1.1交互式stack运行手册当前树复验（2026-10-12）

直接执行`pnpm stack:up -- --stage V1.1`成功，隔离项目`sq-v11-stack-bf03f441ed3137a69204`，Web `http://127.0.0.1:51135/acceptance/v1/v1.1`、Platform API `http://127.0.0.1:51134`；从获准loopback环境请求Web页面和`/api/v1/session`均HTTP 200。随后按实际输出执行`pnpm stack:down -- --project sq-v11-stack-bf03f441ed3137a69204`，结果`STOPPED_AND_PURGED`，移除了本项目容器、PostgreSQL卷、网络、镜像及凭据，未触及活动Compose目标。日志：[stack up](../../../evidence/audits/2026-10-12-v11-interactive-stack-up-current-a02.log)、[HTTP探针](../../../evidence/audits/2026-10-12-v11-interactive-stack-http-probe-current-a02.log)、[stack down](../../../evidence/audits/2026-10-12-v11-interactive-stack-down-current-a02.log)；单行语义复核见[A138](../../../evidence/audits/2026-10-12-v1-gap-matrix-semantic-review-a138.md)。据此§8.1为`VERIFIED_EXECUTABLE`；Ubuntu参数和当前范围人工验收仍未验证。

### 8.70 Platform→Trade V1操作拒绝响应传递（2026-10-12）

为避免下游拒绝被客户端误判为成功或丢失冲突原因，对`GeneratedPlatformV13ManualTradeClient`全部十个V1操作增加统一回归：执行手动/顺序/AUTO订单、记录Fill、请求/确认撤单、按原单查询、读取独立FakeBroker资产、结算以及费用更正。固定下游响应`HTTP 409`及`IDEMPOTENCY_CONFLICT`响应体须逐方法原样返回应用层。定向日志为12/12通过，Platform API typecheck及V1.3完整code suite均退出0；完整套件含认证HTTP/PostgreSQL和迁移检查，隔离数据库及网络清理通过：[完整套件日志](../../../evidence/audits/2026-10-12-v13-post-a140-code-suite-a02.log)、[退出码](../../../evidence/audits/2026-10-12-v13-post-a140-code-suite-a02.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v13-post-a140-code-suite-a02.log.sha256)。定向证据：[测试日志](../../../evidence/audits/2026-10-12-v13-platform-trade-rejection-propagation-a01.log)、[退出码](../../../evidence/audits/2026-10-12-v13-platform-trade-rejection-propagation-a01.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v13-platform-trade-rejection-propagation-a01.log.sha256)、[typecheck日志](../../../evidence/audits/2026-10-12-v13-platform-trade-rejection-propagation-typecheck-a01.log)。

该切片证明生成客户端保留下游HTTP拒绝状态和结构化响应；不代替Trade服务端每一路由的合法/拒绝/领域副作用测试，不证明其他V1调用边、迁移发布顺序、活动部署/回退、配对恢复或人工验收。A140只增补L14此调用边，V1.1-S2-L14、P1与阶段后端交付仍OPEN。

### 8.71 A142共享实现变更后的V1.1完整代码兼容复验（2026-10-12）

受控执行`pnpm verify:stage -- --stage V1.1 --suite code`退出0。包含当前基线、全仓测试/构建/类型/合同/Fixture、Trade/Portfolio隔离HTTP与PostgreSQL，以及Platform/Portfolio独立迁移和Platform持久化、legacy/stage双存储并发领取、Run/Evidence owner隔离等检查。隔离资源移除并核验，`activeServices=NOT_CONNECTED`。日志、底层退出码与SHA见[完整code suite](../../../evidence/audits/2026-10-12-v11-post-a142-code-suite-a01.log)、[exit](../../../evidence/audits/2026-10-12-v11-post-a142-code-suite-a01.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v11-post-a142-code-suite-a01.log.sha256)。

该次只记录代码/隔离集成兼容性，浏览器证据复用§8.68中的实际执行范围，不称本次重新运行浏览器。活动迁移/旧Run处置/回退、Ubuntu和人工验收仍未通过。

### 8.72 P0/L17 Portfolio账户初始化服务端六模式HTTP+PostgreSQL矩阵（2026-10-12）

将Portfolio `POST /internal/v1/accounts/initialize` 的完整模式组合直接纳入真实HTTP进程和随机隔离PostgreSQL烟测：`PAPER/FAKE`、`PAPER/REAL`、`BACKTEST/FAKE`、`BACKTEST/REAL`、`LIVE/FAKE`、`LIVE/REAL`。仅前两种模拟环境配FAKE返回成功，并逐账户核对持久化的environment/broker标签；另外四种均返回403，最终矩阵专属账户数为2。复用完整Portfolio集成套件验证通过：集成测试7/7；8条路由×4个服务身份认证拒绝矩阵32/32，拒绝前后账户、流水、持仓、Fill、结算、更正和预留计数不变；隔离容器/网络已由Harness删除并核验，活动服务`NOT_CONNECTED`。

日志：[Portfolio集成与HTTP/PG矩阵](../../../evidence/audits/2026-10-12-v11-l17-portfolio-initialize-mode-matrix-a01.log)、[退出码](../../../evidence/audits/2026-10-12-v11-l17-portfolio-initialize-mode-matrix-a01.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v11-l17-portfolio-initialize-mode-matrix-a01.log.sha256)。该项只关闭Portfolio账户初始化模式矩阵子项；全V1路由/Worker/Web写入审计、发布回退、Ubuntu、阶段验收及用户签收继续OPEN，L17不因此关闭。

### 8.73 P0/L17 Portfolio账务写路由六模式注入与零副作用矩阵（2026-10-12）

将Portfolio预留、Fill、Fill费用更正和预留解除四条服务端HTTP写路由各自扩展为六种`PAPER/BACKTEST/LIVE × FAKE/REAL`模式字段注入。24次请求均在严格请求体边界返回422；每次拒绝后PostgreSQL预留/Fill/费用更正计数保持0，UNKNOWN预留解除期间状态一直为`HELD`。此前合法请求、幂等重放、真实费用更正及最终权威取消释放继续通过。完整Portfolio集成7/7；认证矩阵32/32；隔离容器、网络清理并核验，活动服务`NOT_CONNECTED`。

日志：[四条Portfolio写路由模式矩阵](../../../evidence/audits/2026-10-12-v11-l17-portfolio-mutation-modes-a01.log)、[退出码](../../../evidence/audits/2026-10-12-v11-l17-portfolio-mutation-modes-a01.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v11-l17-portfolio-mutation-modes-a01.log.sha256)。此证据仅覆盖列出的Portfolio路由和六种字段组合，不关闭结算、其余V1服务/Worker/Web写路径或L17父项。

### 8.74 P0/L17 Portfolio结算写路由六模式注入与应收款保护（2026-10-12）

结算HTTP路由现在对六种客户端`environmentMode/brokerMode`组合逐项检查；由于请求合同只接受`asOf`，每次均以400拒绝，且PostgreSQL中的现金、ledger version、账本条目、待结算应收款与预留快照保持完全相同。随后同一隔离账户合法结算请求仅结清到期Fill，应收款状态变为SETTLED，现金精确变为9990.0000。Portfolio完整集成7/7、认证矩阵32/32及其它写路由拒绝/恢复断言一并通过；隔离数据库、容器和网络均清理核验。

日志：[Portfolio结算六模式HTTP+PG矩阵](../../../evidence/audits/2026-10-12-v11-l17-portfolio-settlement-modes-a01.log)、[退出码](../../../evidence/audits/2026-10-12-v11-l17-portfolio-settlement-modes-a01.log.exit.txt)、[SHA-256](../../../evidence/audits/2026-10-12-v11-l17-portfolio-settlement-modes-a01.log.sha256)。仅关闭该结算请求模式字段拒绝子项；全部调用契约、其他服务/Worker/Web写路径及P0/L17父项继续OPEN。

### 8.75 当前候选重新验收（2026-10-13）

在获准的本机Docker执行范围重新运行`pnpm test:e2e -- --stage V1.1`，包括V1.1 code suite及隔离PostgreSQL/容器检查，exit 0；浏览器normal/rejection/recovery 3/3。TestRun分别为normal `c3e746ad-713d-4369-b58a-115d0b2046a2`、rejection `210eaabd-06ef-4f6b-b4ff-fca4b21d86cb`、recovery `d8aad52d-a633-4ca7-8f43-312a29e4a85e`；同Run CLI/export与Portfolio CNY 10000.0000、零持仓、MATCH核对通过。隔离容器、卷、网络、镜像精确清理。用户整体验收确认见[复验记录](../../../evidence/audits/2026-10-13-v1-acceptance-revalidation-a01.md)；本记录不改写各Run原`manualConclusion`。

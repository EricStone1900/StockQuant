# V1.1 环境、账户初始化与 Web 验收中心

状态：PARTIALLY_IMPLEMENTED（既有范围于2026-09-09有人工作业证据；公共Schema、CN/US账户初始化、stage存储隔离及其他新增能力保留各自证据。2026-10-07正式`stack:up`/`stack:down`已验证V1.1一次性隔离项目、随机loopback端口、自动生成私密PG凭据、容器化Web/API/PostgreSQL、local session cookie及精确项目清理；其他阶段的交互隔离栈、全生命周期Artifact、活动API切换/回退及新增范围人工验收仍未完成；不据此整体标记通过）。版本入口：[README](./README.md)。共同约束：[三版规则](../05-three-version-delivery.md)。

## 1. 前置与范围

无；先阅读上层产品、架构和契约，以及共同开发规则。

本阶段所有订单、券商资产和成交均来自隔离模拟环境。真实业务数据库、Qlib或RD-Agent在声明“已验证”时必须真正执行；替身需独立标注。

## 2. 开发任务

- [x] V1.1 Run创建只接受`scenarioId/seed`，美股账户初始化与恢复命令拒绝客户端业务载荷；伪造`status/cash/positions`返回422且既有Run状态不变，见§8.23。此子项不关闭V1.1存储切换、全阶段业务或人工验收。

- [x] 冻结 Money/Security/Account initialization/account snapshot、Clock 和 TestRun 公共Schema并生成 TS/Python 类型；生成漂移及兼容检查已接入。公共TS/Python类型及8个服务生成副本的字段/required性回归见§8.15、§8.25；服务业务代码是否正确消费各合同仍按P0/P1矩阵逐项核对。 2026-10-10 P0消费者映射见[A39矩阵](../../../evidence/audits/2026-10-10-v1-current-gap-matrix-a39.json)：Account/Money/Security实际消费者与Fixture验证已标明；ClockContext公共类型未被V1直接导入，但V1.3/V1.5业务命令携带持久化Run时钟，V1.1本地TestRun与公共schema兼容关系仍开放，详见[消费者/时钟复核](../../../evidence/audits/2026-10-10-v1-core-schema-clock-consumer-review-a01.md)。证据：[P3.1生成入口](../../../evidence/audits/2026-09-24-p3-contract-generation.md)、[P3.7消费者与兼容矩阵](../../../evidence/audits/2026-09-25-p3-7-contract-consumer.md)。
- [ ] 补齐所有跨服务OpenAPI/生成客户端及发布流程；建立并验证服务迁移和分层依赖命令。进展：A股Calendar、Portfolio Account、Platform V1.1 ScenarioRunner、Trade Execution至Portfolio的Fill/预留/结算、Historical Replay至Portfolio账户初始化/快照及至Trade Execution历史下单、Governance至Quant Registry精确批准版本读取已改用生成客户端；2026-10-01为Platform→Market Data分钟CSV import及CSV/Parquet upload生命周期新增8个ServiceBearer/OpenAPI/typed client操作，Platform lint/typecheck/105项单测与V1.1 code suite通过。新增Platform→Decision Governance只读候选Mandate精确版本绑定检查生成客户端，复用同一Bearer/OpenAPI合同；Platform 116项单测、typecheck、contracts:check与docs:check通过。Trade Execution→Decision Governance现有V2.4 Paper授权校验及Platform→Decision Governance V2.4授权创建均已改用生成客户端，Platform V2.4 Fixture账户初始化/快照读取及Trade Execution readiness、执行提交、原单查询均使用生成客户端；V2.4完整code suite在这些变更后受控PASS，隔离HTTP/PG/Chromium/同Run CLI和arm64 readiness边界通过。另将Platform V1.1账户详情及美股账户初始化接入Portfolio Account客户端，V1.1完整code suite通过。DC-06项目数据分页/导出现改用ProjectToken身份的2操作生成客户端，无凭证401/跨项目403和真实隔离HTTP/PG smoke通过；Platform 139项单测/typecheck与Market Data集成通过，随后V1.1完整code suite受控退出0。Registry契约身份范围已与Quant运行门禁一致。Trade Execution与Historical Replay隔离集成、身份矩阵、V2.3/V2.4/V3.2完整code suite通过。2026-10-01新增`pnpm service:layers -- --service portfolio-risk-service`：Portfolio Risk补齐`ports/account-repository.ts`，AccountService改为依赖端口而非Postgres具体适配器；分层规则检查、3项规则测试及服务typecheck通过，V1.1 code suite受控exit 0。2026-10-01随后为Platform API新增stage-run、test-run和observation三个repository ports，应用层不再引用Postgres适配器；Postgres实现显式implements端口。layer检查器纳入Platform API并通过；服务typecheck及139项单测通过，V1.1完整code suite受控exit 0。worker目录参数也已纳入layer检查器命名规则。2026-10-01为Market Data收敛全部PostgreSQL adapter、领域策略和bootstrap组合根，并将分层门禁加入baseline；其V2.2完整code suite受控通过。Trade Execution Outbox已有独立应用服务和FakeBroker/Portfolio端口；Platform Qlib Artifact已有仓储端口。Research Automation现将V3.1 ArtifactRef规则放入domain、文件内容存储放入adapter，应用使用ArtifactContentStore/ArtifactRefRepository ports，Research分层检查及规则测试接入baseline；服务build、173单测、23隔离PG集成、V3.1完整code suite受控通过。2026-10-01新增Decision Governance五层拆分：应用服务依赖授权Repository/ApprovedRegistry端口，PostgreSQL与生成Quant Registry client分别位于adapter，HTTP组合根位于bootstrap，稳定src/main入口保留；layer scan已加入baseline，应用边界测试覆盖身份拒绝、BACKTEST/FAKE限界及授权首次消费/幂等重放。服务build及22项单测、五层扫描、完整V1.1 code suite与Governance/Replay/Quant隔离身份HTTP/PG smoke均通过；证据见[Decision Governance分层审计](../../../evidence/audits/2026-10-01-w1-decision-governance-layer-boundary.md)及[SHA-256](../../../evidence/audits/2026-10-01-w1-decision-governance-layer-boundary.sha256)。总体仍未覆盖其余服务分层、所有跨服务调用、迁移/发布自动化，且Artifact各Producer仍未统一。2026-10-10责任核对已人工映射本阶段第2/7/8节23条要求的服务主责、协作及外部操作类别，见[责任审计A01](../../../evidence/audits/2026-10-10-v1-v11-responsibility-a01.md)；仅清晰化责任，不关闭客户端发布矩阵、Artifact政策/活动切换、旧Run处置或用户验收。证据：[Research Artifact分层审计](../../../evidence/audits/2026-10-01-w1-research-artifact-layer-boundary.md)（[SHA-256](../../../evidence/audits/2026-10-01-w1-research-artifact-layer-boundary.sha256)）。
  子项进展（2026-10-10）：Platform→Portfolio Account六项V1操作的传输合同见§8.27；Historical Replay→Portfolio账户初始化/快照读取客户端的身份、路径与请求体见§8.28；Platform→Historical Replay普通启动、读取、控制和UNKNOWN恢复操作见§8.29。其余调用方/负向副作用/发布回退核对仍开放，父任务保持未完成。 2026-10-10 P1增量：实际执行`pnpm contracts:check`，203个Schema的生成类型/8服务副本、兼容/OpenAPI检查及30个客户端生成器的生成/漂移注册均通过；注册测试2/2。该项只证明生成器已纳入检查，不关闭V1-only调用方/路由身份/发布和迁移完整矩阵，父任务仍OPEN，详见[A40](../../../evidence/audits/2026-10-10-v1-current-gap-matrix-a40.json)及[执行日志](../../../evidence/audits/2026-10-10-v1-contract-generator-drift-p1-a01.log)。
  [x] Portfolio Risk七条准入路由×四caller身份的28次隔离HTTP拒绝探测均为401/403，六类业务事实计数无变化；路线/方法单测、V1.1与V1.3完整code suite通过，详见§8.31/A18。

前述跨服务调用与分层增量的逐项审计：[Platform Portfolio客户端](../../../evidence/audits/2026-09-30-v11-portfolio-account-client.md)、[Trade Execution Portfolio客户端](../../../evidence/audits/2026-09-30-v11-trade-portfolio-client.md)、[Replay Portfolio与Trade客户端](../../../evidence/audits/2026-09-30-v23-replay-portfolio-client.md)、[Quant Registry客户端与契约校正](../../../evidence/audits/2026-09-30-v32-quant-registry-governance-client.md)、[Market Data分钟import客户端](../../../evidence/audits/2026-10-01-w1-market-data-minute-import-client.md)、[候选Mandate绑定客户端审计](../../../evidence/audits/2026-10-01-w1-candidate-mandate-client.md)、[Paper授权客户端审计](../../../evidence/audits/2026-10-01-w1-paper-authorization-client.md)、[Platform Paper授权创建客户端审计](../../../evidence/audits/2026-10-01-w1-platform-paper-authorization-client.md)、[Platform账户初始化客户端审计](../../../evidence/audits/2026-10-01-w1-platform-paper-portfolio-client.md)、[V2.4变更后回归](../../../evidence/audits/2026-10-01-w1-v24-client-regression.md)、[Paper readiness客户端审计](../../../evidence/audits/2026-10-01-w1-platform-paper-readiness-client.md)、[V1.1 Platform账户调用审计](../../../evidence/audits/2026-10-01-w1-platform-v11-account-clients.md)、[DC-06项目交付客户端审计](../../../evidence/audits/2026-10-01-w1-market-data-project-client.md)、[Portfolio Risk分层依赖增量](../../../evidence/audits/2026-10-01-w1-portfolio-risk-layer-boundary.md)、[Platform API分层依赖增量](../../../evidence/audits/2026-10-01-w1-platform-api-layer-boundary.md)、[Market Data完整分层审计](../../../evidence/audits/2026-10-01-w1-market-data-layer-boundary-increment.md)。

- [x] V1.1七个受保护Platform API操作已逐路由验证匿名401和伪造用户403，并将控制器源码清单核对及探针纳入隔离stage Harness；完整V1.1代码和Web/API/CLI E2E退出0。见[身份边界审计](../../../evidence/audits/2026-10-09-v11-platform-identity-boundary-a01.md)。

2026-10-02隔离复验：`pnpm verify:stage -- --stage V1.1 --suite code`退出0；`pnpm test:integration:v11-stage-storage`退出0，stage存储模式下Chromium normal/rejection/recovery 3/3通过，三个Web TestRun均由同ID经CLI只读核对，恢复仅重启已核验的隔离Portfolio容器。随机项目、容器、卷、网络和镜像已清理。该复验不等于活动API切换/回退、用户生产会话或新增范围人工验收；阶段仍为PARTIALLY_IMPLEMENTED。详见[V1.1隔离存储复验](../../../evidence/audits/2026-10-02-w1-v11-stage-storage-rerun.md)及[SHA-256](../../../evidence/audits/2026-10-02-w1-v11-stage-storage-rerun.sha256)。
- [x] Compose core 与真实 PostgreSQL 已用于账户持久化；组合服务 CN/US 模拟账户、现金/持仓及幂等初始化已有工程和运行证据。当前树真实隔离PostgreSQL新增CN_A/CNY与US_EQUITY/USD分账、同键重放/冲突、跨owner读拒绝；Portfolio HTTP smoke验证LIVE初始化返回403且零副作用。详见[当前账户身份账本矩阵](../../../evidence/audits/2026-10-07-p1-account-identity-ledger-matrix.md)。既有账户详情证据：[P3.4](../../../evidence/audits/2026-09-24-p3-4-account-detail.md)、[P3.5双市场账户](../../../evidence/audits/2026-09-25-p3-5-dual-market.md)。
- [x] Portfolio Risk要求Platform API、Trade Execution、Historical Replay三份强且互不相同的服务Bearer；请求授权与ready探针共用fail-closed检查，Compose也拒绝缺少任一caller token。定向单测及V1.1/V1.3完整代码套件通过，见§8.30。
- [ ] 完成通用Artifact存储与全链路引用/交付；进展：新增`common/artifact-ref.schema.json`并将TestRun `artifactRefs`改为强类型数组，TS/Python生成类型、兼容规则及精确结构测试均接入全局契约检查；V3.1 owner-scoped TestRun API将研究引用投影为公共`ArtifactRef`，Exporter核对绑定与内容Hash后导出。V3.1支持不可变`expiresAt`和EXPIRED终态；`FileArtifactStore.read`逐次验证SHA-256。2026-10-01新增`@stockquant/artifact-content-store`不可变内容内核，拒绝路径穿越、符号链接目录及Hash不符；Research Automation与Platform/Qlib共用同一`research-artifacts-v1`内容卷，Qlib新引用将内容字节移出JSONB，旧JSONB/旧文件路径继续可校验读取。随机隔离PostgreSQL + Qlib Worker + Platform/Web/CLI/evidence-export端到端验证通过；Research/Platform各自旧内容兼容、篡改拒绝与路径安全测试通过。2026-10-03共享字节读取/发布新增`O_NOFOLLOW`普通文件句柄检查，匹配Hash的Artifact地址符号链接现被拒绝；共享包5/5、Research构建及203单测、Platform构建及166单测通过，首轮沙箱回环监听失败保留并经受控重跑通过。详见[叶子符号链接拒绝审计](../../../evidence/audits/2026-10-03-w1-artifact-leaf-symlink-rejection.md)及[SHA-256](../../../evidence/audits/2026-10-03-w1-artifact-leaf-symlink-rejection.sha256)。尚未完成共享过期/保留策略批准与调度、其他Artifact Producer盘点/迁移、过期字节物理清理、活动部署切换/回退及新增人工验收。见[本轮共享内容后端审计](../../../evidence/audits/2026-10-01-w1-common-artifact-content-store.md)与[SHA-256](../../../evidence/audits/2026-10-01-w1-common-artifact-content-store.sha256)；此前[V3.1 Artifact导出](../../../evidence/audits/2026-10-01-w1-v31-artifact-evidence-export.md)及[生命周期](../../../evidence/audits/2026-10-01-w1-artifact-expiry-lifecycle.md)保留为历史证据。

2026-10-02补充：共享内容存储物理删除现要求普通文件与地址Hash匹配；Research失败发布回滚仅删除新共享路径、不触碰只读legacy路径。删除完整性与回滚隔离分别见[审计1](../../../evidence/audits/2026-10-02-w1-artifact-removal-integrity.md)和[审计2](../../../evidence/audits/2026-10-02-w1-artifact-rollback-boundary.md)。上述是安全前置，Artifact保留政策审批、跨服务引用保护/调度、其他Producer迁移、活动切换/回退与新增人工验收仍未完成。


2026-10-02跨服务调用补充：Research Automation→Quant Research提交V3.2 PromotionRequest现使用`quant-promotions.v1`生成客户端并纳入`contracts:check/generate`；完整V3.2 code suite exit 0，但该结果仅代表隔离代码/数据库/readiness验证，V3.2业务验证与用户验收仍NOT_RUN。详见[客户端审计](../../../evidence/audits/2026-10-02-w1-quant-promotion-submit-client.md)及[SHA-256](../../../evidence/audits/2026-10-02-w1-quant-promotion-submit-client.sha256)。
- [x] 平台 API owner 身份、健康/能力查询、验收运行与证据读取已有实现；V1.1 stage模式 normal/rejection/recovery 在隔离 PostgreSQL 和真实 Chromium Web 中完成同run CLI只读核对。证据：[V1.1统一存储代码与Web套件](../../../evidence/audits/2026-09-26-v11-stage-store-code-suite.md)。
- [ ] 将V1.1统一TestRun模式按维护窗口部署到活动API并验证回退；活动Compose仍为`legacy`，隔离套件不证明生产切换。2026-10-09为V1.1代码门禁增加隔离PostgreSQL migration/dual-store/persistence集成回归，历史RUNNING/WAITING保留、重复迁移幂等、冲突回滚、部分双写回滚及owner HTTP隔离通过；最终`pnpm verify:stage -- --stage V1.1 --suite code`退出0，证据：[A04运行摘要](../../../evidence/audits/2026-10-09-v11-code-suite-a04.json)与[完整门禁日志](../../../evidence/audits/2026-10-09-v11-code-suite-a04.log)。活动迁移、备份恢复/回退、调用矩阵和本项整体验收仍未完成。当前活动库49 legacy/44 unified；已在只读恢复副本补齐5条、验证幂等与双写。2026-10-07新增随机隔离PostgreSQL持久化回归：legacy迁移/历史保留、幂等与冲突回滚、stage owner读取、双写和部分写失败原子回滚、HTTP owner 200/跨owner 403全部通过；不接触活动库。切换步骤、停止条件、回退和当前差额见[存储切换Runbook](../../../docs/operations/v11-test-run-storage-cutover.md)、[恢复副本复演审计](../../../evidence/audits/2026-10-01-w1-v11-current-snapshot-migration.md)及[当前隔离持久化复验](../../../evidence/audits/2026-10-07-v11-storage-persistence-rerun.md)。活动迁移仍为NOT_AUTHORIZED/NOT_DEPLOYED。
- [x] Qlib/RD-Agent镜像基线、Mac/Docker架构及资源边界有历史记录；amd64仿真与当前Qlib锁版运行探针有单独工程证据。原生Ubuntu兼容、资源压力及真实RD-Agent运行仍未验收。 2026-10-10新增当前工作区Platform API `linux/arm64`容器构建/Node 24.1.0探针PASS，宿主`darwin/arm64`、未仿真，详见[本次报告](../../../evidence/audits/2026-10-10-v11-linux-arm64-compat-a01.json)及[日志](../../../evidence/audits/2026-10-10-v11-linux-arm64-compat-a01.log)。该验证只覆盖Platform API镜像，Ubuntu/Qlib/RD-Agent及资源压力仍NOT_RUN。 2026-10-10当前工作区Platform API `linux/amd64`容器构建/Node 24.1.0探针PASS，宿主`darwin/arm64`、Docker Desktop仿真，详见[本次报告](../../../evidence/audits/2026-10-10-v11-linux-amd64-compat-a01.json)及[日志](../../../evidence/audits/2026-10-10-v11-linux-amd64-compat-a01.log)，SHA-256 `2776bfa6caefae9e1183f0a49320650fa9033e40c2c28c8b3e72d81cf580498c`。


2026-10-09 V1身份边界回归：Governance授权、Historical Replay Worker及Quant Research的HTTP身份/路由scope smoke已改为通过随机隔离PostgreSQL运行，并纳入V1.2、V1.3、V1.4代码套件。三个完整套件改后分别exit 0：[V1.2](../../../evidence/audits/2026-10-09-v12-service-auth-code-suite-a02.log)、[V1.3](../../../evidence/audits/2026-10-09-v13-service-auth-code-suite-a01.log)、[V1.4](../../../evidence/audits/2026-10-09-v14-service-auth-code-suite-a01.log)。单独HTTP smoke确认随机容器/网络清理。此项补强身份负测，不代表所有V1操作与OpenAPI逐项匹配或发布/回退通过；本节整体任务和第7节保持未关闭。

- [x] 增量客户端合同：Platform→Trade Execution外部FakeBroker订单观察操作已逐字段直测路由、载荷、服务身份/Bearer和超时；见§8.33。完整V1.3代码套件通过；此子项不关闭P1/A04全量调用/发布矩阵、活动切换或人工验收。

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

- [x] 契约、数据结构、场景定义和预期结果已冻结。核心公共Schema已执行`contracts:check`（含TS/Python字段测试及生成漂移检查），当前树V1.1 normal/rejection/recovery三场景E2E与同Run CLI/export均通过；每个Run有2项PASS断言。详见[当前E2E日志](../../../evidence/audits/2026-10-09-v11-core-contracts-current-e2e-a01.log)及[核心Schema套件日志](../../../evidence/audits/2026-10-09-v11-core-schema-parity-code-suite-a01.log)。本轮三个Run的人工结论均为`NOT_RUN`，本勾选只代表合同和可执行场景交付已冻结。
- [ ] 第2节后端任务完成，真实依赖与替身明确。
- [ ] 正式Web功能页及验收中心正常/异常场景完成。
- [ ] 命令、实际URL、Fixture路径/Hash和配置说明已补齐，待实现占位已消除或明确列为范围外。
- [x] 开发者按第8节从准备到导出亲自执行，保存代码版本、退出码、截图/Trace和断言证据。
- [x] 重复/恢复及适用观察期验证完成，未覆盖项如实记录。
- [x] 用户曾于2026-09-09确认当时的本地ARM64验收范围（见[验收表](./99-acceptance.md)）；此勾选仅记录该历史范围，当前新增范围仍NOT_RUN，不代表本轮或当前版本签署。
- [x] 操作说明与限制已更新，[本版验收表](./99-acceptance.md)已同步。
- [x] V1.1 Platform受保护的七个业务API端点均有匿名/伪造用户拒绝断言；完整隔离套件通过。此项不涉及明确公开的本地session获取、logout或静态capabilities接口。
- [x] 共享Trade Execution请求体边界变更后，V1.1完整代码套件复验通过，含Trade/Portfolio隔离HTTP+PostgreSQL、服务身份门禁与V1.1迁移CLI；[日志](../../../evidence/audits/2026-10-09-v11-trade-outbox-compensation-compat-code-suite-a01.log)。此兼容回归不证明V1.1活动存储切换、回退或整体阶段关闭。
- [x] V1.1 Platform Run/account命令拒绝客户端写入status/cash/positions，完整隔离Web/API/CLI与code suite通过，见§8.23；本阶段整体后端交付仍OPEN。
- [x] 核心公共Schema六类字段及required性回归覆盖TS/Python包输出和8个服务生成类型副本；V1.1完整代码套件通过，见§8.25。该项验证类型产物，不代表服务业务消费路径或全阶段交付已完成。
- [x] Platform→Portfolio Account生成客户端六项V1操作（initialize/get snapshot/reserve/resolve/fill/fee correction）均有直接HTTP method、路径编码、Platform身份/Bearer及请求体断言；完整V1.1 code suite复验通过，见§8.27。仅关闭该客户端传输合同子项；其余跨服务操作/发布矩阵仍开放。

2026-10-09补充：新增V1.1 code suite隔离迁移/统一存储回归已实测通过（[日志](../../../evidence/audits/2026-10-09-v11-code-suite-a04.log)）。这补充迁移数据库证据；未勾选活动部署、回退或整体后端交付项。

- [x] V1.1当前共享存储/Platform/认证工作树完整code suite复验通过，脚本66/66、隔离迁移/持久化和服务边界smoke通过，活动服务未连接、临时资源清理已确认；见§8.26及[完整日志](../../../evidence/audits/2026-10-10-v11-current-tree-code-suite-a01.log)，SHA-256 `5df1d49e48b8adf73bce5eee1d4df1060b954bdf6c5cc05884780de4f1583602`。仅为工程兼容回归，不表示活动切换、旧Run处置、Ubuntu或人验通过。

- [x] 增量交付：外部FakeBroker订单观察生成客户端合同测试、V1.3完整代码回归及本文操作记录已完成（§8.33）；不代表阶段或版本验收通过。

## 8. 阶段验收操作手册

### 8.1 当前可执行性与验收准备

手册状态：VERIFIED_EXECUTABLE（2026-10-09当前工作树已执行随机隔离交互栈启动/会话/Web/精确关闭，以及容器化Web normal/rejection/recovery、同Run CLI检查和结构化导出；最新逐Run证据见第8.14节。此状态只表示工程步骤可重复执行，不表示用户人工验收通过；新增范围人工验收仍NOT_RUN）。

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

此复验使用 `infra/compose/docker-compose.v11-integration.yml` 创建独立 PostgreSQL、Portfolio Risk 与 Platform API，API 明确设为 `STOCKQUANT_V11_RUN_STORAGE=stage`；不得把 recovery 步骤直接指向活动项目。完整构建、lint、全仓单测、契约及 normal/rejection/recovery 后端集成可通过以下自动清理入口重跑：

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

在§8.15的六类核心Schema字段/required性断言上，新增`every service TypeScript contract copy preserves the shared V1 core schema fields and requiredness`，逐一检查全部8个服务的`src/contracts/generated-types.ts`副本。`node --test scripts/generate-contract-types.test.mjs` 3/3、`pnpm contracts:check` 12/12通过；JSON检查覆盖207个Schema、类型生成器漂移检查覆盖203个Schema及服务输出，29个客户端生成器和111条兼容规则均通过。V1.1完整代码套件`pnpm verify:stage -- --stage V1.1 --suite code`受控回环复验exit 0：[日志](../../../evidence/audits/2026-10-10-v11-core-service-schema-code-suite-a02.log)，[退出码](../../../evidence/audits/2026-10-10-v11-core-service-schema-code-suite-a02.exit.txt)，SHA-256 `719006df439ebf23d8f38a209782869ed8f171a5f8a95376abb474cd602ddceb`。普通沙箱首轮仅因loopback `EPERM`失败，失败日志保留在[a01](../../../evidence/audits/2026-10-10-v11-core-service-schema-code-suite-a01.log)；a02通过后临时数据库/容器/网络已核验清理。该回归验证各服务生成类型副本，不证明业务模块实际消费选择正确或完整，也不关闭V1.1跨服务调用/发布矩阵、P1或人工验收。

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

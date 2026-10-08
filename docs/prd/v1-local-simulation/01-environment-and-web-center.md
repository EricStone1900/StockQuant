# V1.1 环境、账户初始化与 Web 验收中心

状态：PARTIALLY_IMPLEMENTED（既有范围于2026-09-09有人工作业证据；公共Schema、CN/US账户初始化、stage存储隔离及其他新增能力保留各自证据。2026-10-07正式`stack:up`/`stack:down`已验证V1.1一次性隔离项目、随机loopback端口、自动生成私密PG凭据、容器化Web/API/PostgreSQL、local session cookie及精确项目清理；其他阶段的交互隔离栈、全生命周期Artifact、活动API切换/回退及新增范围人工验收仍未完成；不据此整体标记通过）。版本入口：[README](./README.md)。共同约束：[三版规则](../05-three-version-delivery.md)。

## 1. 前置与范围

无；先阅读上层产品、架构和契约，以及共同开发规则。

本阶段所有订单、券商资产和成交均来自隔离模拟环境。真实业务数据库、Qlib或RD-Agent在声明“已验证”时必须真正执行；替身需独立标注。

## 2. 开发任务

- [x] 冻结 Money/Security/Account initialization/account snapshot、Clock 和 TestRun 公共Schema并生成 TS/Python 类型；生成漂移及兼容检查已接入。证据：[P3.1生成入口](../../../evidence/audits/2026-09-24-p3-contract-generation.md)、[P3.7消费者与兼容矩阵](../../../evidence/audits/2026-09-25-p3-7-contract-consumer.md)。
- [ ] 补齐所有跨服务OpenAPI/生成客户端及发布流程；建立并验证服务迁移和分层依赖命令。进展：A股Calendar、Portfolio Account、Platform V1.1 ScenarioRunner、Trade Execution至Portfolio的Fill/预留/结算、Historical Replay至Portfolio账户初始化/快照及至Trade Execution历史下单、Governance至Quant Registry精确批准版本读取已改用生成客户端；2026-10-01为Platform→Market Data分钟CSV import及CSV/Parquet upload生命周期新增8个ServiceBearer/OpenAPI/typed client操作，Platform lint/typecheck/105项单测与V1.1 code suite通过。新增Platform→Decision Governance只读候选Mandate精确版本绑定检查生成客户端，复用同一Bearer/OpenAPI合同；Platform 116项单测、typecheck、contracts:check与docs:check通过。Trade Execution→Decision Governance现有V2.4 Paper授权校验及Platform→Decision Governance V2.4授权创建均已改用生成客户端，Platform V2.4 Fixture账户初始化/快照读取及Trade Execution readiness、执行提交、原单查询均使用生成客户端；V2.4完整code suite在这些变更后受控PASS，隔离HTTP/PG/Chromium/同Run CLI和arm64 readiness边界通过。另将Platform V1.1账户详情及美股账户初始化接入Portfolio Account客户端，V1.1完整code suite通过。DC-06项目数据分页/导出现改用ProjectToken身份的2操作生成客户端，无凭证401/跨项目403和真实隔离HTTP/PG smoke通过；Platform 139项单测/typecheck与Market Data集成通过，随后V1.1完整code suite受控退出0。Registry契约身份范围已与Quant运行门禁一致。Trade Execution与Historical Replay隔离集成、身份矩阵、V2.3/V2.4/V3.2完整code suite通过。2026-10-01新增`pnpm service:layers -- --service portfolio-risk-service`：Portfolio Risk补齐`ports/account-repository.ts`，AccountService改为依赖端口而非Postgres具体适配器；分层规则检查、3项规则测试及服务typecheck通过，V1.1 code suite受控exit 0。2026-10-01随后为Platform API新增stage-run、test-run和observation三个repository ports，应用层不再引用Postgres适配器；Postgres实现显式implements端口。layer检查器纳入Platform API并通过；服务typecheck及139项单测通过，V1.1完整code suite受控exit 0。worker目录参数也已纳入layer检查器命名规则。2026-10-01为Market Data收敛全部PostgreSQL adapter、领域策略和bootstrap组合根，并将分层门禁加入baseline；其V2.2完整code suite受控通过。Trade Execution Outbox已有独立应用服务和FakeBroker/Portfolio端口；Platform Qlib Artifact已有仓储端口。Research Automation现将V3.1 ArtifactRef规则放入domain、文件内容存储放入adapter，应用使用ArtifactContentStore/ArtifactRefRepository ports，Research分层检查及规则测试接入baseline；服务build、173单测、23隔离PG集成、V3.1完整code suite受控通过。2026-10-01新增Decision Governance五层拆分：应用服务依赖授权Repository/ApprovedRegistry端口，PostgreSQL与生成Quant Registry client分别位于adapter，HTTP组合根位于bootstrap，稳定src/main入口保留；layer scan已加入baseline，应用边界测试覆盖身份拒绝、BACKTEST/FAKE限界及授权首次消费/幂等重放。服务build及22项单测、五层扫描、完整V1.1 code suite与Governance/Replay/Quant隔离身份HTTP/PG smoke均通过；证据见[Decision Governance分层审计](../../../evidence/audits/2026-10-01-w1-decision-governance-layer-boundary.md)及[SHA-256](../../../evidence/audits/2026-10-01-w1-decision-governance-layer-boundary.sha256)。总体仍未覆盖其余服务分层、所有跨服务调用、迁移/发布自动化，且Artifact各Producer仍未统一。证据：[Research Artifact分层审计](../../../evidence/audits/2026-10-01-w1-research-artifact-layer-boundary.md)（[SHA-256](../../../evidence/audits/2026-10-01-w1-research-artifact-layer-boundary.sha256)）。

前述跨服务调用与分层增量的逐项审计：[Platform Portfolio客户端](../../../evidence/audits/2026-09-30-v11-portfolio-account-client.md)、[Trade Execution Portfolio客户端](../../../evidence/audits/2026-09-30-v11-trade-portfolio-client.md)、[Replay Portfolio与Trade客户端](../../../evidence/audits/2026-09-30-v23-replay-portfolio-client.md)、[Quant Registry客户端与契约校正](../../../evidence/audits/2026-09-30-v32-quant-registry-governance-client.md)、[Market Data分钟import客户端](../../../evidence/audits/2026-10-01-w1-market-data-minute-import-client.md)、[候选Mandate绑定客户端审计](../../../evidence/audits/2026-10-01-w1-candidate-mandate-client.md)、[Paper授权客户端审计](../../../evidence/audits/2026-10-01-w1-paper-authorization-client.md)、[Platform Paper授权创建客户端审计](../../../evidence/audits/2026-10-01-w1-platform-paper-authorization-client.md)、[Platform账户初始化客户端审计](../../../evidence/audits/2026-10-01-w1-platform-paper-portfolio-client.md)、[V2.4变更后回归](../../../evidence/audits/2026-10-01-w1-v24-client-regression.md)、[Paper readiness客户端审计](../../../evidence/audits/2026-10-01-w1-platform-paper-readiness-client.md)、[V1.1 Platform账户调用审计](../../../evidence/audits/2026-10-01-w1-platform-v11-account-clients.md)、[DC-06项目交付客户端审计](../../../evidence/audits/2026-10-01-w1-market-data-project-client.md)、[Portfolio Risk分层依赖增量](../../../evidence/audits/2026-10-01-w1-portfolio-risk-layer-boundary.md)、[Platform API分层依赖增量](../../../evidence/audits/2026-10-01-w1-platform-api-layer-boundary.md)、[Market Data完整分层审计](../../../evidence/audits/2026-10-01-w1-market-data-layer-boundary-increment.md)。

2026-10-02隔离复验：`pnpm verify:stage -- --stage V1.1 --suite code`退出0；`pnpm test:integration:v11-stage-storage`退出0，stage存储模式下Chromium normal/rejection/recovery 3/3通过，三个Web TestRun均由同ID经CLI只读核对，恢复仅重启已核验的隔离Portfolio容器。随机项目、容器、卷、网络和镜像已清理。该复验不等于活动API切换/回退、用户生产会话或新增范围人工验收；阶段仍为PARTIALLY_IMPLEMENTED。详见[V1.1隔离存储复验](../../../evidence/audits/2026-10-02-w1-v11-stage-storage-rerun.md)及[SHA-256](../../../evidence/audits/2026-10-02-w1-v11-stage-storage-rerun.sha256)。
- [x] Compose core 与真实 PostgreSQL 已用于账户持久化；组合服务 CN/US 模拟账户、现金/持仓及幂等初始化已有工程和运行证据。当前树真实隔离PostgreSQL新增CN_A/CNY与US_EQUITY/USD分账、同键重放/冲突、跨owner读拒绝；Portfolio HTTP smoke验证LIVE初始化返回403且零副作用。详见[当前账户身份账本矩阵](../../../evidence/audits/2026-10-07-p1-account-identity-ledger-matrix.md)。既有账户详情证据：[P3.4](../../../evidence/audits/2026-09-24-p3-4-account-detail.md)、[P3.5双市场账户](../../../evidence/audits/2026-09-25-p3-5-dual-market.md)。
- [ ] 完成通用Artifact存储与全链路引用/交付；进展：新增`common/artifact-ref.schema.json`并将TestRun `artifactRefs`改为强类型数组，TS/Python生成类型、兼容规则及精确结构测试均接入全局契约检查；V3.1 owner-scoped TestRun API将研究引用投影为公共`ArtifactRef`，Exporter核对绑定与内容Hash后导出。V3.1支持不可变`expiresAt`和EXPIRED终态；`FileArtifactStore.read`逐次验证SHA-256。2026-10-01新增`@stockquant/artifact-content-store`不可变内容内核，拒绝路径穿越、符号链接目录及Hash不符；Research Automation与Platform/Qlib共用同一`research-artifacts-v1`内容卷，Qlib新引用将内容字节移出JSONB，旧JSONB/旧文件路径继续可校验读取。随机隔离PostgreSQL + Qlib Worker + Platform/Web/CLI/evidence-export端到端验证通过；Research/Platform各自旧内容兼容、篡改拒绝与路径安全测试通过。2026-10-03共享字节读取/发布新增`O_NOFOLLOW`普通文件句柄检查，匹配Hash的Artifact地址符号链接现被拒绝；共享包5/5、Research构建及203单测、Platform构建及166单测通过，首轮沙箱回环监听失败保留并经受控重跑通过。详见[叶子符号链接拒绝审计](../../../evidence/audits/2026-10-03-w1-artifact-leaf-symlink-rejection.md)及[SHA-256](../../../evidence/audits/2026-10-03-w1-artifact-leaf-symlink-rejection.sha256)。尚未完成共享过期/保留策略批准与调度、其他Artifact Producer盘点/迁移、过期字节物理清理、活动部署切换/回退及新增人工验收。见[本轮共享内容后端审计](../../../evidence/audits/2026-10-01-w1-common-artifact-content-store.md)与[SHA-256](../../../evidence/audits/2026-10-01-w1-common-artifact-content-store.sha256)；此前[V3.1 Artifact导出](../../../evidence/audits/2026-10-01-w1-v31-artifact-evidence-export.md)及[生命周期](../../../evidence/audits/2026-10-01-w1-artifact-expiry-lifecycle.md)保留为历史证据。

2026-10-02补充：共享内容存储物理删除现要求普通文件与地址Hash匹配；Research失败发布回滚仅删除新共享路径、不触碰只读legacy路径。删除完整性与回滚隔离分别见[审计1](../../../evidence/audits/2026-10-02-w1-artifact-removal-integrity.md)和[审计2](../../../evidence/audits/2026-10-02-w1-artifact-rollback-boundary.md)。上述是安全前置，Artifact保留政策审批、跨服务引用保护/调度、其他Producer迁移、活动切换/回退与新增人工验收仍未完成。


2026-10-02跨服务调用补充：Research Automation→Quant Research提交V3.2 PromotionRequest现使用`quant-promotions.v1`生成客户端并纳入`contracts:check/generate`；完整V3.2 code suite exit 0，但该结果仅代表隔离代码/数据库/readiness验证，V3.2业务验证与用户验收仍NOT_RUN。详见[客户端审计](../../../evidence/audits/2026-10-02-w1-quant-promotion-submit-client.md)及[SHA-256](../../../evidence/audits/2026-10-02-w1-quant-promotion-submit-client.sha256)。
- [x] 平台 API owner 身份、健康/能力查询、验收运行与证据读取已有实现；V1.1 stage模式 normal/rejection/recovery 在隔离 PostgreSQL 和真实 Chromium Web 中完成同run CLI只读核对。证据：[V1.1统一存储代码与Web套件](../../../evidence/audits/2026-09-26-v11-stage-store-code-suite.md)。
- [ ] 将V1.1统一TestRun模式按维护窗口部署到活动API并验证回退；活动Compose仍为`legacy`，隔离套件不证明生产切换。当前活动库49 legacy/44 unified；已在只读恢复副本补齐5条、验证幂等与双写。2026-10-07新增随机隔离PostgreSQL持久化回归：legacy迁移/历史保留、幂等与冲突回滚、stage owner读取、双写和部分写失败原子回滚、HTTP owner 200/跨owner 403全部通过；不接触活动库。切换步骤、停止条件、回退和当前差额见[存储切换Runbook](../../../docs/operations/v11-test-run-storage-cutover.md)、[恢复副本复演审计](../../../evidence/audits/2026-10-01-w1-v11-current-snapshot-migration.md)及[当前隔离持久化复验](../../../evidence/audits/2026-10-07-v11-storage-persistence-rerun.md)。活动迁移仍为NOT_AUTHORIZED/NOT_DEPLOYED。
- [x] Qlib/RD-Agent镜像基线、Mac/Docker架构及资源边界有历史记录；amd64仿真与当前Qlib锁版运行探针有单独工程证据。原生Ubuntu兼容、资源压力及真实RD-Agent运行仍未验收。

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

- [ ] 契约、数据结构、场景定义和预期结果已冻结。
- [ ] 第2节后端任务完成，真实依赖与替身明确。
- [ ] 正式Web功能页及验收中心正常/异常场景完成。
- [ ] 命令、实际URL、Fixture路径/Hash和配置说明已补齐，待实现占位已消除或明确列为范围外。
- [x] 开发者按第8节从准备到导出亲自执行，保存代码版本、退出码、截图/Trace和断言证据。
- [x] 重复/恢复及适用观察期验证完成，未覆盖项如实记录。
- [x] 用户已通过Web及命令证据完成人工验收，记录确认时间/结论。
- [x] 操作说明与限制已更新，[本版验收表](./99-acceptance.md)已同步。

## 8. 阶段验收操作手册

### 8.1 当前可执行性与验收准备

手册状态：DRAFT_NOT_EXECUTABLE（V1.1隔离交互启动/清理已执行验证；第8.3～8.6全部手工步骤、完整场景与交付记录尚未逐项实测，历史第8节记录只适用于各自执行时点）。

前置服务：平台API、Web、组合服务、真实PostgreSQL、Artifact存储。

固定输入：内置CN/US初始化Fixture；CN初始现金10000 CNY、持仓0，seed=20260907。

| 开发交付时必须填写 | 当前值 |
|---|---|
| 实测代码Commit或工作区Hash/验证日期 | `2c1d352`；2026-09-09 |
| 项目根目录、Node/pnpm/Python/uv及Docker版本 | `/Users/huangbosong/Documents/ChatGPT/StockQuant`；Node 24.1.0、pnpm 10.34.5、Python 3.9.6、uv 0.12.7；本轮容器运行平台为Docker Desktop `desktop-linux`（版本以`docker version`现场输出为准）；host `arm64` |
| Web基础URL/身份登录或会话建立方式 | `pnpm stack:up -- --stage V1.1`随机分配回环端口；当前Web `http://127.0.0.1:59783/acceptance/v1/v1.1`，API `http://127.0.0.1:59782`。同配置SCRAM栈Platform `/api/v1/session`实测HTTP 200并签发`sq_session`；身份为`acceptance-owner-1`。CLI使用隔离栈对应测试身份 |
| 本阶段Web路由 | `/acceptance/v1/v1.1`（容器化Web本次实测） |
| 正式页面的真实入口/跳转链接 | `/` 与 `/acceptance/v1/v1.1`；平台 API `http://127.0.0.1:3000`；组合服务不发布到宿主 |
| Fixture文件/数据版本/确切日期/Hash、规则与成本版本 | `fixtures/v1/v1.1/accounts.json`；`v1.1-accounts-1`；SHA-256 `575d2cb5e674bacbf951d9ca485c7e5c8e49e9d15bbb4623a71fd0c08c3685f4`；FIXTURE/SIMULATION_ONLY；成本/策略不适用 |
| 配置文件及必需环境变量名/非秘密测试值 | 隔离Harness自动生成9个随机PG角色密码并写入`.codex/isolated-stacks/<project>.env`（0600、Git忽略）；PAPER、FAKE、LIVE=false，真实源/模型凭据未注入；`.env.local`不作为本次测试密码来源 |
| 外部故障目标及可执行命令、恢复/隔离清理入口 | 自动场景恢复用`pnpm test:e2e -- --stage V1.1`，Harness将项目名作为`COMPOSE_PROJECT_NAME`并比对精确Portfolio容器ID后重启；交互栈关闭必须使用本次输出的`pnpm stack:down -- --project <isolatedProject>`，缺少/无效项目ID时拒绝执行 |
| 预期耗时、轮询超时、实际观察期/预算 | Web/API最多等待30秒健康检查；E2E recovery含重启约15秒；运行中的交互栈无后台自动期限，由操作者明确执行精确stack:down；无真实观察期/模型预算 |

### 8.2 初始化与启动（目标命令，待实现）

在上表填写的项目根目录运行；工具版本按锁文件/项目说明准备。当前仅V1.1交互栈已实现；V1.2～V1.5尚未配置隔离交互栈时，命令会安全拒绝，不得改用默认主Compose项目验收。Harness生成仅供该随机栈使用的PG凭据；保持FAKE券商与模拟账户，不加载真实模型或行情凭据。

```bash
# 终端A：先确认实际执行目录为项目根目录；输出含随机Web/API URL、project ID和精确stop命令
pwd
pnpm stack:up -- --stage V1.1
```

预期：命令等待随机项目内PostgreSQL、Portfolio、Platform、容器化Web健康后退出0，并输出实际URL、`acceptance-owner-1`身份方式及`stack:down -- --project <ID>`清理命令。Web和API端口绑定`127.0.0.1`随机空闲端口；PG密码文件权限0600；不存在对固定`stockquant-v12` Compose项目的默认操作。Ubuntu部署仍需另补目标主机发布命令和实际证据。

终端A关闭交互环境时，复制本次`isolatedProject`值执行以下精确清理。此命令只接受`stack:up`登记的随机V1.1项目，移除该项目容器、命名PG卷、网络和随机凭据文件；不指定项目或提供其它项目时以退出码2拒绝。

```bash
pnpm stack:down -- --project sq-v11-stack-6c7c96c2fd4cde3f6e88
```

初始化在验收中心“准备隔离运行”完成；CLI场景入口也负责同样的准备，两者调用同一业务API。准备后记录testRunId、accountId、namespace及Fixture/DataVersion；初始化业务本身是测试对象时不得预先完成被测动作。缺源/凭证/历史数据时显示缺项，不静默换成Fake并报真实场景通过。

### 8.3 Web逐步操作及预期结果

1. 登录上表实际Web地址，进入“开发验收中心→V1→V1.1”；检查页面版本、模拟模式、服务能力与固定输入。
2. 每个场景点击“准备隔离运行”，核对参数后记下testRunId；正常/异常/恢复使用独立运行，场景内部的重复或恢复操作继续使用原运行及业务幂等键。
3. 按下表执行。操作按钮为目标交互，交付时开发者必须换成实际页面名称/按钮及路由；预期必须从业务明细读取，不能只看“任务完成”。

| 场景ID（阶段内唯一） | 场景 | 点击顺序/输入 | 预期结果与核对点 |
|---|---|---|---|
| normal | 初始化幂等 | 选择CN初始化Fixture，点击“准备隔离运行”，再点击“初始化”；在同一运行中点击“重复提交10次”，从结果链接打开账户页。 | 期初现金10000、持仓0、期初流水1笔；重复请求返回相同业务结果。 |
| rejection | 初始化冲突 | 新建异常运行，先以同一初始化键提交现金10000，再通过场景按钮以现金20000重用该键；再测越权账户查询。 | 同键异载荷409且余额仍10000；越权403，无额外流水。 |
| recovery | 持久化恢复 | 保存运行ID，按已核实的限定重启步骤重启组合服务，刷新账户与运行详情；另建隔离运行。 | 旧账户及证据仍存在；新运行独立，期初不累加；实际重启证据可查。 |

4. 从运行详情打开关联正式页面，执行一次刷新/关闭再打开；核对长任务后台状态、历史证据和加载/失败/陈旧提示。
5. 每项记录实际结果、截图与业务ID。异常场景“预期拒绝”被正确验证时断言可PASS，但被测业务操作仍显示拒绝；若意外接受则断言FAIL。

### 8.4 命令行复验与相同运行核对（待实现）

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
pnpm evidence:export -- --run "$acceptance_run_id"
 echo $?
```

check-only仅查询此运行后端事实并追加检查证据，不创建新订单、不重放成交或发起模型调用；空ID/错误stage/越权run必须拒绝。导出只含脱敏数据，输出实际目录和Manifest Hash，不自动勾选人工验收。端到端正常/异常/恢复运行产生不同ID，导出时分别保存。

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

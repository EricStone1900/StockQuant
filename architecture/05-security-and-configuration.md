# 安全边界与配置架构

日期：2026-09-08。状态：设计/NOT_RUN。范围为本轮 V1～V3 模拟系统；长期真实券商和 LIVE 需要独立威胁评估与上线授权。

## 1. 信任边界

| 区域 | 信任级别 | 可访问 | 明确禁止 |
|---|---|---|---|
| 浏览器 | 不可信客户端 | 平台 API、本人获授权的模拟范围 | DB、消息总线、Docker Socket、服务秘密 |
| 平台/领域 API | 可信业务进程 | 自有 DB/User、版本化内部 API | 跨库写、共享管理员账号、绕过领域命令 |
| 后台 Worker | 限定服务身份 | 指定队列、服务 API、run 前缀 | 用户签署、扩大 Mandate、任意其他 run |
| RD-Agent 控制器 | 高权限受控组件 | 模型网关、Runner 调度、研究 Artifact | 交易授权、直接下单、策略自动激活 |
| 生成代码 Runner | 不可信执行区 | 只读固定输入、专属输出、必要的受限网络 | Docker Socket、密钥、业务 DB、其他 run、交易 API |
| FakeBroker | 独立模拟边界 | 自有订单/成交/资产库、限定故障端口 | 真实券商 SDK/凭据、直接写平台账本 |

## 2. 身份与授权

本地仍需要真实用户会话和服务身份，不以“只有本人使用”代替授权。Platform 本地开发会话由 PostgreSQL `platform_local_sessions` 管理：Cookie 携带256位随机令牌，数据库只保存其SHA-256；12小时后过期，logout立即写入`revoked_at`，每个带会话Cookie的API请求都查询有效期/撤销状态。浏览器Cookie为HttpOnly、SameSite=Lax，刷新可重新建立本地单用户开发会话。仅显式启用隔离测试配置时才兼容测试身份头/旧测试身份；它不能用于正式入口。用户操作绑定ownerId，服务调用绑定serviceId和允许的route/scope。

所有读写同时检查 environmentMode、accountId、market、testRunId/namespace。内部网络不是可信身份。人工验收记录必须来自真实用户会话，脚本不能代签。写命令的 actor 从认证上下文生成，不能接受请求体自报身份。

## 3. 交易失败关闭

- 配置 Schema 只允许本轮启用 `BACKTEST/PAPER` 和 `brokerMode=FAKE`；`LIVE` 或非 Fake Broker 在进程启动及每个写边界同时拒绝。
- 仓库、默认镜像和测试配置不包含真实券商 SDK、账号字段或通道插件。
- 健康、身份、账户、价格、规则、授权任一不可核验时拒绝新动作，但继续处理合法已确认模拟 Fill 和权威查询。
- UNKNOWN 只查询原模拟订单，不盲目重发或仅凭超时释放资源。

## 4. 配置与秘密

配置优先级为：版本化非秘密默认值 → 环境专用非秘密配置 → 运行时环境变量/秘密引用。环境变量名称在 `.env.example` 公开，真实秘密不得写入 Git、镜像层、日志、证据或 Web 响应。

| 配置组 | V1.1 基线 | 所有者/记录 |
|---|---|---|
| 运行模式 | PAPER + FAKE；LIVE=false | 平台启动校验和证据 Manifest |
| 网络 | 本地入口 loopback；内部端口不公开 | Compose 与版本页 |
| 数据库 | 每域独立 DB/User；管理员只用于受控初始化 | 秘密引用和迁移记录 |
| Artifact | 每服务/每 run 前缀；Hash 后发布 | ArtifactRef 与访问策略 |
| 计算 | Worker 并发 1；CPU/内存/时限待实测冻结 | 环境证据 |
| Provider | V1 无真实行情/模型/券商凭据 | 能力接口显示 UNSET/disabled |

V3.1真实模型Provider外呼另由`STOCKQUANT_MODEL_PROVIDER_CALLS_AUTHORIZED`显式授权，默认`false`；`MODEL_GATEWAY_MODE=LIVE`或凭证存在本身不构成调用授权。即使配置为`true`，运行时Provider接线、实际账单对账与可强制DNS/网络出口边界仍须分别通过证据门禁，preflight不能据配置自行解除这些阻断。

Compose 新建 PostgreSQL 数据目录时必须使用 `scram-sha-256` 主机认证和独立管理员密码；每个应用登录角色通过单独的 `STOCKQUANT_DATABASE_PASSWORD_<ROLE>` 环境变量设密，服务 DSN 只注入自身角色密码。密码仅可放在忽略的 `.env.local`，建议用 `openssl rand -hex 32` 分别生成，避免 URL 保留字符。`.env.example` 中故意留空，未配置时新数据库初始化必须失败。`POSTGRES_INITDB_ARGS=--auth-host=scram-sha-256` 用来确保 initdb 生成的 loopback 规则也是 SCRAM；只设置 `POSTGRES_HOST_AUTH_METHOD` 会在某些初始化配置中保留更早命中的 loopback `trust` 规则。

PostgreSQL 初始化 SQL 只在空数据目录首次执行。既有卷不会因 Compose 环境变量变更而改写 `pg_hba.conf` 或现存角色密码；切换现有卷前必须先有配对备份、准确卷/镜像识别、写入方暂停、逐角色设密、验证 SCRAM 规则及客户端连通、失败回退方案和实际恢复证据。不得以重建或删除卷代替迁移。测试 Compose 的 loopback `trust` 仅限无共享卷的隔离集成网络，不得用于运行栈。当前本地数据卷迁移程序见[PostgreSQL SCRAM迁移Runbook](../docs/operations/postgres-scram-migration.md)，该Runbook仍未执行。

V2.4 的活动行情读取还受 `STOCKQUANT_V24_QUOTE_SOURCE_USE_APPROVED` 保护，缺省 `false`。即使设为 `true`，也必须同时提供 `STOCKQUANT_V24_QUOTE_SOURCE_AUTHORIZATION_REF` 与 `STOCKQUANT_V24_QUOTE_DATA_VERSION`；缺一项时请求仍失败关闭。引用值应指向项目所有者确认的具体来源/用途授权记录及冻结数据版本。关闭时 Paper 观察器不请求报价端点，记录 `NOT_AUTHORIZED`/`NOT_CONNECTED`，不生成可执行信号，也不计入有效观察日。这些环境值是部署门禁，不替代来源合同或用户对精确策略的批准。

`STOCKQUANT_V24_AUTO_START` 缺省 `false`；来源、策略、账户及运行批准齐备前，持续Paper调度器保持停止。手动或自动启动调度器均不能绕过报价来源使用门禁。

端口、镜像、数据库名和限制完成实测前保持[未决](../docs/decisions/open-decisions.md)，不能从本表推断已经部署。

## 5. TestRun 与清理

TestRun 创建时分配不可复用的 namespace，并限制账户、数据库记录、缓存、事件 subject/consumer 和 Artifact 前缀。Web 与 CLI 通过同一业务 API 初始化；check-only 只有读权限，不能触发数据准备、模型或订单。

故障端口仅在 test profile 可用，并同时要求测试服务身份、目标 run、固定场景版本和幂等键。实际故障顺序写入证据。清理命令必须列出确切、非活动目标；活动运行、UNKNOWN 状态、共享卷和历史证据拒绝删除。

## 6. 网络和容器

数据库、NATS、Temporal、对象存储管理端口不直接暴露公网。开发期确需暴露到宿主的端口只绑定 `127.0.0.1` 并记录原因。生产入口使用 TLS；V1.1 本地明文只能位于 loopback。

Web 后端和 Runner 不挂载 Docker Socket。可信控制器若未来需要宿主容器权限，应部署为独立管理边界；只读 Socket 挂载不构成限制。镜像使用非 root 用户、只读根文件系统和最小 capabilities 的可行性在各服务阶段验证。

## 7. 日志、证据与留存

日志记录 correlationId/testRunId、服务、版本和非敏感业务 ID；账户外部标识、token、cookie、连接串和 Provider 内容按字段脱敏。证据导出使用允许清单并生成 Manifest Hash，用户签署与旧失败追加保存。

留存、备份位置和 RPO/RTO 在 OD-011 冻结。未冻结前不自动删除账本、授权、订单、成交或人工验收证据。

## 8. V1.1 安全验收输入

- 匿名写入返回 401；合法用户跨 owner/run/account 查询返回 403。
- 同幂等键异载荷返回 409且不产生第二笔期初流水。
- `LIVE`、非 `FAKE` broker、真实券商字段和管理端口公开配置均使启动或命令失败。
- 随机隔离V1.3已验证有效会话读200、logout后旧令牌401、Platform API重启后旧令牌重放仍401；12小时过期按数据库时间在每次请求边界判断。贯穿五阶段的会话体验、活动环境部署和用户验收仍待。
- Web、平台 API 和 Runner 容器检查无 Docker Socket 与多余秘密。

这些是待实现测试输入，当前全部 `NOT_RUN`。


## P7.2 实现补充（2026-09-25）

V3.1研究API的服务间调用采用每个调用方独立Bearer Token；由忽略的本机`.env.local`注入，生产环境需用Secret管理器提供同名配置。研究API从Token本身确定调用方身份，以恒定时间比较配置的独立Token并执行route/scope白名单；可选`x-stockquant-service-id`只做一致性校验，不能选择授权身份，重复Token配置会在启动时失败。平台API与Runner Host各有专用凭据；Runner claim/heartbeat/complete实施原子租约和fencing，隔离PG并发/接管测试通过。平台API仅可读取RunnerJob元数据、按精确owner/run读取Artifact，并可取消指定RunnerJob；取消使租约失效，Host下一次心跳即中止执行，固定容器取消Smoke核实容器移除和无输出发布。Runner Host只可claim/heartbeat/input/complete与Artifact发布，不能调用取消路由。Runner Host客户端、租约绑定的INPUT读取与OUTPUT发布、`runner:host`实际循环入口已实现；Mac ARM64/Linux AMD64仿真下的临时HTTP/PG→Docker smoke验证正常任务、崩溃接管和取消。活动Artifact卷只读复制恢复与23个已发布引用Hash核验通过。Artifact孤儿巡检默认只读；只有暂停发布者与Runner Host后显式启用隔离，才会把超过最小保留期的无引用文件移至同文件系统外置隔离目录，并生成SHA-256清单，不自动删除。portfolio-risk-service也新增调用方独立Bearer校验及route scope，平台/执行/回放客户端配置了匹配身份；隔离HTTP拒绝与owner检查通过，Compose静态配置通过，但该代码尚未部署到活动Portfolio容器。新Runner路由、Host循环及平台Artifact端点均尚未部署到活动容器；周期备份/保留、完整Paper授权与跨五阶段的浏览器会话验收仍待完成，因此OD-004为PARTIAL；细节见[P7.2审计](../evidence/audits/2026-09-25-p7-2-service-identity.md)和[P3.R Artifact审计](../evidence/audits/2026-09-25-p3-r-artifact-boundary.md)。

P7.2补充（2026-09-27）：Market Data Fixture/CSV/Parquet分钟导入、分块上传、持久导入详情和Bar分页路由均要求平台API服务Bearer；在跨实例背压锁之前执行导入身份验证。Token决定身份，`x-stockquant-service-id`可省略，若提供则只作一致性核对。平台代理先做用户会话与适用的owner校验，再添加服务身份；真实隔离Chromium→Vite→Platform API→Market Data→双PG smoke验证匿名导入读取401、用户读详情/分页200、异主403及CSV/Parquet/5m归档同run路径。当前活动Compose未部署此版本，密钥轮换、部署和阶段人工验收仍未完成。

2026-09-27 路由边界补充：V2.1共享Watchlist、来源目录、采样设置与其读写、实时行情/新闻、来源主动Smoke/熔断变更均要求平台API独立Bearer；V2.1 Platform API对应路由先校验本地用户会话，再代理并附加平台Bearer。服务认证HTTP smoke确认匿名来源/采样/新闻/Watchlist/实时行情/熔断请求均401，Bearer Watchlist读写及熔断恢复通过；Platform API单测确认匿名/越权用户在转发前被拒，登录用户转发带Bearer。交易日历与容器级`/live`、`/ready`探针仍内网直读，运维写控制使用专用控制凭据；这不是对公网暴露的授权。P7.2采集运维细节GET现另要求平台Bearer。完整验证及尚未部署/轮换/人工验收事实见[基础服务身份审计](../evidence/audits/2026-09-25-p7-2-service-identity.md)和[采集读取身份审计](../evidence/audits/2026-09-27-p7-2-market-data-collection-read-identity.md)。

数据采集控制补充（2026-09-27）：`POST /v2/minute/gaps`会改写持久缺口状态，现在要求独立配置的`STOCKQUANT_COLLECTION_CONTROL_TOKEN`，与调度、建采集任务及回填控制共用；`data-coverage --record-gaps`从环境或忽略文件取令牌，不记录秘密。loopback smoke确认无令牌401、有令牌时到达预期的无数据库503；纯报告/check-only不要求控制令牌。

采集运维读取身份补充（2026-09-27）：采集调度/计划、订阅、运行、缺口、回填状态和分钟来源健康GET要求`STOCKQUANT_SERVICE_TOKEN_PLATFORM_API`；声明身份可省略但若提供必须匹配Bearer。DC-08A页面先校验本地Session再转发。宿主工具使用公共的Market Data身份头构造器，平台Bearer与写控制Token分别配置。`/live`、`/ready`供容器探针，CN A交易日历保持公开；活动部署尚未切换到新源码。详见[P7.2采集读取身份审计](../evidence/audits/2026-09-27-p7-2-market-data-collection-read-identity.md)。

V2.2内部读取/计算身份补充（2026-09-27）：固定分钟Fixture预览、质量检查和覆盖计算要求平台Bearer；对应V2.2页面入口先验证本地Session，再以服务身份代理。匿名计算在解析请求前被拒。上述改动经认证HTTP smoke、Platform控制器单测及完整V2.2 code suite验证，活动Compose仍待维护窗口部署。详见[P7.2采集读取身份审计](../evidence/audits/2026-09-27-p7-2-market-data-collection-read-identity.md)。

身份策略确认及V1.2边界补齐（2026-09-27）：用户选择每服务独立Bearer Token。V1.2固定日线Fixture现在也要求平台Bearer；Platform API两个Fixture预览先校验本地Session，后台V1.2 TestRun访问Fixture时携带平台Bearer。隔离HTTP smoke及V1.2服务单测通过，活动Compose仍未部署；其他非采集只读路由继续按具体服务逐项核查。

容器运行身份与只写路径复核（2026-09-30）：W8候选Compose镜像矩阵中，Market Data、Quant Research与Qlib Worker曾以root默认用户构建。本次将Node服务切换到镜像自带的`node` UID 1000、Qlib Worker切换为UID 10001；Market Data的`/var/lib/stockquant`明确由node用户持有。Compose对这三项启用只读根文件系统、drop ALL capabilities及`no-new-privileges`，Market Data与Qlib Worker仅为`/tmp`提供tmpfs。10个linux/amd64应用镜像均在Mac M1仿真环境通过隔离边界检查；Qlib 0.9.6/LGBM Fixture训练与预测在非root、无网络、只读根和临时盘条件下通过。现有Market Data named volume必须在维护/备份窗口确认迁移后的UID/GID可写；本次只验证了空白隔离卷初始化，未修改活动卷。此结果不等价于Ubuntu实机或发布环境验证。
 固定RD-Agent Runner镜像在2026-09-30另通过6个固定容器隔离场景（无网络/只读根/只读输入/独立输出/超时与清理），该Mac AMD64仿真结果不是Ubuntu或真实模型Provider验收。

## 9. 外部市场来源用途门禁

行情预览、新闻读取、来源Smoke和分钟采集分别要求显式的运行时用途门禁。每类配置必须同时提供`*_SOURCE_USE_AUTHORIZED=true`、授权/决定引用、数据版本及精确允许的source ID；缺任一项时，在任何Provider HTTP请求之前拒绝。服务Bearer只认证调用方，不能代替来源许可或用途批准。门禁变量本身亦不构成法律授权，必须引用经项目所有者确认的逐来源决定。当前确认状态为`NO_TRADE`且没有来源授权，故这些配置保持关闭；隔离HTTP证明各外部路径被拒且Provider请求数为零。分钟采集调度与执行器也要求MINUTE_COLLECTION用途已授权，未经授权的运行不能通过就绪门禁或由监督器自动修复启动。

2026-10-01采集适配器增补：Market Data的Python分钟适配器CLI也会被直接调用，因此在构造任一网络Provider客户端之前复核分钟采集用途授权和全部来源ID。这样即使绕过TypeScript CollectionExecutor，未授权请求仍在最靠近网络边界处fail-closed。

2026-10-01独立来源探针补充：所有可直连真实分钟来源的维护/能力探针（Sina、BaoStock、TDX）在启动SDK/网络请求前也必须经过同一授权判断。无授权探针以`BLOCKED`退出，不生成来源健康PASS，也不写诊断数据。

历史数据用途独立记为`HISTORICAL_RESEARCH`，与`MINUTE_COLLECTION`分离；日线/PIT能力或导入仅获历史研究授权，分钟历史来源运行同时需要历史研究和采集两个用途的独立确认。可直连外部来源的历史导入器及能力探针在Provider会话打开和输出写入前检查以上配置。

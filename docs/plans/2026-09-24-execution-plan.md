# StockQuant 当前阶段执行计划

制定日期：2026-09-24（Asia/Shanghai）。计划基线：`132f3a6055b7a2cf124dd489ca71d0983c64698d`。
状态：**IN_PROGRESS**。P0、P1、P2已执行；P2的Schema生成物、持久TestRun、身份和正式账户能力仍属于P3，不改变既有人工签署。

依据：[2026-09-24项目审查](../../evidence/audits/2026-09-24-project-review.md)、[三版共同规则](../prd/05-three-version-delivery.md)、[V1计划](../prd/v1-local-simulation/00-version-plan.md)、[V2计划](../prd/v2-data-and-replay/00-version-plan.md)、[V3计划](../prd/v3-research-and-ubuntu/00-version-plan.md)、[共享采集计划](../prd/v2-data-and-replay/06-shared-data-collection-plan.md)和[采集测试矩阵](../prd/v2-data-and-replay/07-data-collection-tests.md)。

## 1. 最终目标与当前事实

本计划完成顺序：先保护运行中的观察和修复验收误判，再收口共享数据采集的短期交付与V1基础欠项，同时完成V2.4真实模拟业务链；随后收口V2.5和V2整版门禁，再完成V3.1～V3.4。等待真实交易日时推进独立工程工作。

2026-09-24基线：V2.4 `WAITING 8/20`；DC-08A归档长期观察 `WAITING 5/20`（稳定4、恢复后完整1）；V2.5的20只×60交易日历史BaoStock分钟归档已有57,600根及完整性/回放证据；V3.1真实模型/Runner闭环 `NOT_RUN`。三个版本的 `verify:version` 均为 `INCOMPLETE`。这些数字是基线，后续以运行时与可重读证据为准，不写死为新的验收结果。

## 0. 已执行进度

| 工作包 | 状态 | 实际结果 | 证据 |
|---|---|---|---|
| P0 基线 | DONE | `v24:preflight`、`dc08a:supervise -- --check-only`、`dc08a:verify-automation` 均退出0；Paper 8/20、20只订阅、执行器启用 | [P0/P1记录](../../evidence/audits/2026-09-24-p0-baseline.md) |
| P1 测试库隔离 | DONE | 新建`market_data_test`；17/17 PostgreSQL集成测试通过；正式库连接保护退出2；正式订阅和观察计数未改变 | [P0/P1记录](../../evidence/audits/2026-09-24-p0-baseline.md) |
| P2 验收退出码/版本门禁 | DONE | 空断言返回2，FAILED返回1；版本脚本检查总结和未勾门禁；JSON Schema 2020-12/格式/Fixture实例校验通过；测试套件82/82通过 | [P2记录](../../evidence/audits/2026-09-24-p2-acceptance.md) |
| P3.1 契约生成入口 | PARTIAL DONE | 增加锁定生成器，生成 TS/Python 类型并执行漂移检查；生成物语法验证通过。OpenAPI、兼容检查、业务客户端接入仍未完成 | 本文件及 `packages/contracts/generated/` |
| P3.2 V1.2持久TestRun | PARTIAL DONE | V1.2运行记录改由`acceptance_stage_runs`持久化，查询受owner范围保护；真实隔离数据库重连读取和越权查询保护通过；V2.1/V2.2及历史迁移另行登记 | [P3.2记录](../../evidence/audits/2026-09-24-p3-2-persistence.md) |
| P3.3 V1.3～V1.5持久TestRun | DONE | 三个控制器均改用共享持久化服务，场景目录/创建/查询统一校验owner；隔离数据库重连读取和越权保护全部通过 | [P3.3记录](../../evidence/audits/2026-09-24-p3-3-persistence.md) |
| P3.4 身份/账户详情垂直切片 | PARTIAL DONE | owner-scoped 账户详情 API、V1.1 Web 展示、容器重建和同一 TestRun 刷新/重启读取均通过；用户人工签署仍待完成 | [P3.4记录](../../evidence/audits/2026-09-24-p3-4-account-detail.md) |
| P3.5 双市场模拟账户 | DONE（工程验收） | 同一 V1.1 TestRun 绑定 CN_A/10000 CNY 与 US_EQUITY/10000 USD；US 幂等重放、账户详情、Web 点击和刷新持久化均通过；人工签署仍为 NOT_RUN | [P3.5记录](../../evidence/audits/2026-09-25-p3-5-dual-market.md) |
| P3.6 V2.1/V2.2 TestRun 持久化 | DONE（工程验收） | 移除进程内运行 Map，创建/查询改写 `acceptance_stage_runs`；真实 API 重启后同 runId 读取和跨 owner 403 均通过；Web/人工验收仍待完成 | [P3.6记录](../../evidence/audits/2026-09-25-p3-6-v21-v22-persistence.md) |
| P3.7 契约消费者与兼容矩阵 | DONE（工程验收） | Portfolio 已消费生成的 Money/Security 类型；Schema 生成器限定输入并增加稳定字段/枚举兼容检查；OpenAPI/其他客户端仍待完成 | [P3.7记录](../../evidence/audits/2026-09-25-p3-7-contract-consumer.md) |
| P3.8 V2.1/V2.2 Web 同 run 验收 | DONE（工程验收） | Web 运行 ID 写入 localStorage，刷新后恢复原运行；V2.1/V2.2 浏览器结果均由 CLI check-only 退出 0 复核；人工签署仍待完成 | [P3.8记录](../../evidence/audits/2026-09-25-p3-8-v21-v22-web-persistence.md) |
| P3.9 Portfolio 账户 OpenAPI 边界 | DONE（工程验收） | 新增初始化命令/账户快照 Schema、OpenAPI 清单和 Platform/Portfolio 生成类型消费者；真实 US 幂等回归通过；完整发布框架和其他边界仍待完成 | [P3.9记录](../../evidence/audits/2026-09-25-p3-9-openapi-account-boundary.md) |
| P3.10 TestRun 写入完整性 | DONE（隔离库工程验证） | 通用持久仓库对同 ID 的身份变化、终态证据改写及 namespace 冲突返回 409；重试保留时间戳，重连后原记录仍可读取。V2.4 观察专用直接 SQL 尚未纳入此保护 | [P3.10记录](../../evidence/audits/2026-09-25-p3-10-stage-run-integrity.md) |
| P3.11 V2.4 观察运行修订保护 | DONE（隔离库工程验证；尚未部署） | 观察失效迁移先追加旧状态/断言/证据；日终完成仅允许更新对应日期的非终态运行，相同结果重试幂等、冲突终态改写返回 409 | [P3.11记录](../../evidence/audits/2026-09-25-p3-11-v24-observation-integrity.md) |
| P3.12 V2.4 修订历史 API/Web | DONE（工程验收已部署） | 新增 owner-scoped 观察列表/修订 API、OpenAPI/JSON Schema、生成类型和 Web 历史展示；隔离 PostgreSQL owner 隔离及幂等测试、API 37项单测、contracts、浏览器用例及 API/Web 容器镜像构建/部署通过。真实 API owner 查询返回 200、跨 owner 返回 403，观察仍为 8/20 WAITING | [P3.12记录](../../evidence/audits/2026-09-25-p3-12-v24-observation-history.md) |
| P5.1 V2.4 SNAPSHOT eligibility gate | DONE（domain 单测） | 按注入 Clock 选择订单接受后首个同证券/市场、窗口内且新鲜的快照；过期/错误报价拒绝、不回填。15 项执行服务单测、类型检查通过；不创建订单/Fill，未接入 Mandate、风控、账户预留或 FakeBroker | [P5.1记录](../../evidence/audits/2026-09-25-p5-1-snapshot-eligibility.md) |
| P5.2 FakeBroker 幂等载荷完整性 | DONE（隔离DB工程验证；未部署） | 以请求指纹绑定 clientOrderId，同键并发串行，异载荷/旧行无指纹返回409；专用 `trade_execution_test` 验证同键并发仅一单/Fill/event/outbox、数量/价格异载荷409零副作用、连接重开重放相同结果；测试结束后唯一namespace精确清理。16项单测、typecheck/build、隔离PostgreSQL集成、contracts/docs检查通过；正式库未连接 | [P5.2记录](../../evidence/audits/2026-09-25-p5-2-fakebroker-idempotency.md) |
| P5.3 V2.4 快照 Fixture 执行投影 | DONE（domain / Fixture验证；未持久化、未部署） | 新增冻结 CN `PAPER+FAKE` 固定样本；首次合格快照给出明确标记的 PROJECTED_ONLY 结果，固定全量成交假设、Fixture费用、SNAPSHOT价格，不声称流动性/参与率已验证；真实数据、LIVE/非FAKE和证券/市场错配失败关闭。执行服务 22 项单测、契约/Fixture Hash及文档检查通过。未写FakeBroker订单、Fill或组合账本 | [P5.3记录](../../evidence/audits/2026-09-25-p5-3-snapshot-fixture-projection.md) |
| V2.4 code suite | PASS | 构建、lint、typecheck、TS/Web测试、Python适配器55项、运维82项、市场数据集成17项均通过 | 当次 `pnpm verify:stage -- --stage V2.4 --suite code` 输出 |

完成定义有四层：代码/场景检查、目标运行环境实测、实际市场观察、用户人工验收。任何一层未满，不把整阶段或整版标为PASS。全程仅用自有FakeBroker和模拟账户；真实券商及LIVE配置保持服务端拒绝。市场数据来源、Fixture、录制响应和真实模型证据分别标注。

## 2. 顺序和依赖

| 顺序 | 工作包 | 可开始条件 | 退出条件 | 并行关系 |
|---|---|---|---|---|
| P0 | 保护观察与冻结基线 | 当前即可 | 正式订阅/调度/观察计数可重读，测试与生产数据边界写明 | 每个工作包前复核 |
| P1 | 隔离数据库集成测试 | P0 | 集成测试无法写正式观察库或全局租约 | 后续代码套件的前置 |
| P2 | 修复验收和版本门禁 | P1；纯脚本反例可先做 | 空断言、错误退出码、伪版本PASS等反例全部被拒 | 可与P3独立开发 |
| P3 | V1基础能力收口 | P1 | 生成契约、身份/早期TestRun/正式账户与证据完成对应验收 | 可与P4并行开发，验收分别记录 |
| P4 | DC-00/04/05/08A短期交付 | P0；真实盘中部分依赖交易日 | DC-T19/T25及短期门槛有实际证据、模块人工验收 | 现有观察不中断；历史60日另列 |
| P5 | V2.4完整Paper业务切片 | P1/P2/P3适用前置，已有V2.3范围证据 | 已批准模拟策略的信号→治理→风控→FakeBroker→账本可重读；HOLD路径继续有效 | 开发与P4观察并行；正式策略启用独立门禁 |
| P6 | V2.5与V1/V2整版收口 | P2～P5适用项通过；实际观察到期 | 必需阶段、容量/来源/观察、Web/CLI及人工证据齐备 | 不阻止P7的无模型准备 |
| P7 | V3.1可信研究执行闭环 | P1/P2、Runner/Gateway/预算/出站前置 | 真实模型生成代码、受限Runner运行Qlib、Artifact与费用记录通过人工验收 | 无模型准备可提前；真实调用不得越过前置 |
| P8 | V3.2～V3.4 | V3.1通过，版本依赖逐项满足 | 独立复算/精确版本人工晋升、研究扩容、真实Ubuntu迁移与观察通过 | 顺序推进，不预签署 |

P3/P5中涉及正式持续Paper策略的开发，可先在隔离Fixture与独立模拟账户测试；正式策略版本、账户、市场、风控限额和授权窗口未确认前保持HOLD。P7真实模型调用在完整配置、预算和用户针对确切实验的确认后执行。

为安排工程容量，可先预留P0半日、P1一至两日、P2两至四日、P3四至七日、P4工程收口两至四日、P5五至八日、P6工程收口三至五日、P7五至十日。以上是开发排期估算，不是验收日期承诺；实际交易日、外部来源能力、真实模型运行和Ubuntu环境是独立日历依赖。每个工作包首日复核范围和实际耗时，再调整后续估算。

## 3. 工作包详细实施

### P0 保护现有观察与记录基线

1. 从仓库根目录运行 `git status --short`，保留已有未提交文件；记录当前commit、Compose镜像摘要、锁文件Hash和主机/容器架构。
2. 只读执行 `pnpm v24:preflight`、`pnpm dc08a:supervise -- --check-only`、`pnpm dc08a:verify-automation`。读取 `http://127.0.0.1:3000/api/v1/acceptance/v2/v2.4/observation-summary` 和 `evidence/dc08a/observation-summary.json`；确认唯一活动订阅 `dc08a-20260917-20-v1`、正式20只证券、调度/执行器状态及下一运行时间。不要用场景重新初始化正式观察。
3. 记录P0快照到新的 `evidence/audits/` 文件：时间、commit、容器镜像、订阅ID、观察计数、开放缺口、待投递Outbox、只读命令与退出码。不覆盖原始日终报告。

退出判定：能从数据库/API和归档同时解释两个观察计数、异常日和历史失败。若不一致，先定位而不重置、补写或改计数。直接在正式采集库运行数据库集成测试属于P1完成前禁止的路径。

### P1 隔离数据库集成测试

实现范围：`scripts/test-market-data-integration.mjs`、市场数据集成测试配置和 `services/market-data-service/tests/integration/collection-run-postgres.spec.ts`。当前入口默认连 `market_data`；测试会更改全局 `market_data_collection_scheduler_lease` 和活动订阅，因此需要专属测试数据库或独立Compose测试栈。测试连接串必须显式提供，并在运行前验证目标不是正式库；未提供或目标相同返回2。测试内部再使用唯一运行前缀和精确清理，不能只靠后缀隔离全局租约。

验证：

```bash
pnpm test:ops
pnpm test:integration:market-data
pnpm v24:preflight
pnpm dc08a:supervise -- --check-only
```

第二条只在明确配置隔离数据库后运行。用只读前后快照比较正式订阅ID、20只集合、调度租约/水位、开放缺口和两个观察计数；全部不变。补负例：未配置测试库、指向正式库均拒绝且没有写入。记录测试数据库名称与清理的精确资源，不输出凭证。

### P2 修复验收脚本与证据门禁

实现范围：`scripts/verify-stage.mjs`、`scripts/verify-version.mjs`、`scripts/validate-json.mjs`、场景能力清单和相关单测。先写并运行能够复现现状的反例，然后修复：

- `COMPLETED + assertions:[]` 必须返回非成功；缺少任何必需断言也非成功。
- 真实断言FAIL返回1；缺前置、观察未满、受理后未完成返回2；底层检查的原退出码进入证据。
- `--run RUN_ID --check-only`核验stage、owner、scenarioVersion和所有必需领域事实；运行前后订单、Fill、模型调用及数据初始化次数不增加。
- `verify:version`读取机器可核验的阶段能力、必要场景/代码/E2E/同run/导出、运行环境、观察与人工结论；仅有表格PASS、总结NOT_RUN或门禁空白必须返回2。历史FAIL保留。
- `contracts:check`在JSON语法外增加Schema 2020-12有效/无效样本及兼容检查。TS/Python生成入口可并入P3，不在P2声称生成已经完成。

验证：`pnpm test:ops`、`pnpm contracts:check`、`pnpm test:contract`、`pnpm verify:version -- --version V1`/`V2`/`V3`。当前阶段未齐时三个版本退出2属于预期；另用隔离Fixture证明完整PASS与故意缺证据的2。对真实Web产生的一个隔离testRunId执行 `pnpm verify:stage -- --stage V2.4 --run RUN_ID --check-only` 并比较前后业务事实。P2 已完成这些脚本和 JSON Schema 校验；TS/Python生成入口、持久TestRun、身份与账户能力转入P3，不把P2结果扩展成版本PASS。每次改动更新适用阶段第8节命令和断言版本，不改变历史签署。

### P3 收口V1基础能力

依据[V1.1任务](../prd/v1-local-simulation/01-environment-and-web-center.md)、[ADR-0002](../decisions/ADR-0002-contract-first-boundary.md)和[安全配置架构](../../architecture/05-security-and-configuration.md)，逐个纵向切片实施：

1. 从规范Schema生成TypeScript/Python值对象与客户端，验证金额Decimal字符串、时区、Market/Mode、Clock、TestRun及坏样本。当前已完成锁定的 `pnpm contracts:generate` 入口、TS/Python值对象生成和 `contracts:check` 漂移检查；生成物不可手改。下一步仍需把生成类型接入跨服务客户端并补兼容矩阵，未据此勾选V1.1完成。
2. 为早期V1.2～V2.2及适用的V1.3～V1.5内存TestRun迁至持久仓库；重启后同runId及历史断言可查。当前已完成V1.2～V1.5及V2.1/V2.2：创建、完成、断言和证据均写入`acceptance_stage_runs`，查询要求本地owner；历史迁移和其他非当前切片运行仍未完成。迁移保留历史运行ID和旧失败，不伪造过去不存在的证据。
3. 统一本地用户会话、服务身份、scope和owner/run/account检查；匿名、越权和LIVE/非Fake写入有明确拒绝。当前已完成 V1.1～V1.5 验收入口和账户详情 API 的 owner 传递、服务身份及越权拒绝；研究宿主回调鉴权需在P7正式接线前完成。
4. 完成正式账户详情、双市场独立金额/持仓和证据详情页。当前已完成正式容器中的 V1.1 Web 同run刷新、CN/US 独立账户初始化、幂等重放和 USD/CNY 证据展示；工程验收完成，人工验收仍保持 `NOT_RUN`。

验证：隔离数据库中的初始化/幂等/恢复集成测试；`pnpm verify:stage -- --stage V1.1 --suite code`及normal/rejection/recovery；`pnpm test:e2e -- --stage V1.1`；Web同run只读核对与证据导出。按阶段文档修订开发勾选和手册；已有用户签署继续作为历史，新增或改变范围的人工验收待用户实际执行。

### P4 共享数据采集短期交付与长期观察

**短期交付（DC-08A/DC-T25）**：对照[采集计划2.1](../prd/v2-data-and-replay/06-shared-data-collection-plan.md)逐项核对3只跨沪深证券连续2个实际交易日、扩大至20只后至少1个实际交易日、盘中和日终质量、受控故障/恢复、正式订阅唯一性、Web/CLI证据与用户人工验收。已有归档日可以逐日重验；不因日期已过自动计入，也不重新创建订阅或运行。DC-00/04要求的来源字段、单位、延迟、许可、限频和主备/半开恢复按DC-T19补实测。

**长期观察**：`dc08a-observation-summary`的20日稳定观察和V2.4的20个实际交易日各自累计。20只历史60日Bar覆盖与“实际连续运行60日”“第二来源独立覆盖60日”分开报告。短期交付符合计划2.1时可申请模块人工验收；长期5/20仍为WAITING，不阻塞计划明确允许的独立主线开发。若要把20日新增为短期硬门槛，先在计划和验收中记录需求变更及依据。

**逐交易日操作**：已有守卫和心跳自动任务，默认检查它们生成的晨间、盘中和日终报告、退出码及日期目录；不再手动重复运行或另建定时器。`pnpm dc08a:morning`可能修复服务并启用订阅，`pnpm dc08a:monitor`会做来源恢复探测和Outbox投递，`pnpm dc08a:eod`会记录缺口、形成最终观察并更新报告。只有确认自动任务没有触发、核实当天目标与恢复步骤后，才按[采集进度与操作记录](../prd/v2-data-and-replay/08-data-collection-progress.md)受控调用相应入口。`pnpm dc08a:daily-report`、`pnpm dc08a:health-report`和`pnpm dc08a:observation-summary`会写当前报告文件；重算前保留原文件和Hash，并明确新旧报告版本。非交易日保存NOT_RUN，不虚增计数。盘中来源失败保留原始事件，在隔离故障场景验证切换和恢复。

TDX继续只读候选。修复自动任务TCP权限后，要求由调度器在至少两个实际交易日用正式20只名单生成上午/收盘原始证据；校验Bar窗口、字段、单位、缺口、延迟和许可。手动复测960行不能代替自动任务证据，也不触发正式来源切换。证明60日独立历史覆盖前不宣称完整备用源。来源切换若需要，先冻结适配器版本、回滚目标和人工审阅的可核对变更。

退出判定：DC-T19/T25的实际证据、Web/CLI同run和模块人工签署满足计划2.1；DC-08B和Paper长期观察仍独立登记WAITING。更新`08-data-collection-progress.md`、V2阶段任务和`99-acceptance.md`，保留失败历史。

### P5 完成V2.4的模拟业务切片

当前观察代码为HOLD-only。先以隔离账户和固定Fixture接上已批准策略版本的日频信号、运行Clock、行情新鲜度、治理授权、风控占用、FakeBroker原订单/成交查询、账本及日终对账；拒绝陈旧/缺源/授权过期/UNKNOWN盲重发。正式20日观察不被测试单污染。

测试设计：正常样本在规则允许时产生一笔可手算模拟订单与对应账本，HOLD样本零订单；拒绝样本验证无越权副作用；恢复样本模拟接受响应丢失、重复回报、重启后原订单查询和原run幂等。对逐证券数据年龄、10个唯一预期采样窗口、执行窗口质量和迟到/重复事件做独立断言。成本、数量与资金按已冻结精度比较；前后端共用业务API。

验证：隔离域单元/DB/契约测试，`pnpm verify:stage -- --stage V2.4 --suite code`，normal/rejection/recovery，`pnpm test:e2e -- --stage V2.4`，同run check-only及导出。P1完成后才运行可能连接数据库的整套代码检查。已有HOLD观察8/20按原规则保留；升级观察规则写新版本和前后对照，不直接覆写历史日期。正式模拟策略启用必须引用确切策略/Mandate、账户、市场、限额、窗口及用户已有授权；缺项保持HOLD/WAITING。

### P6 V2.5、V1/V2整版门禁

逐项完成[V2.5任务](../prd/v2-data-and-replay/05-data-scale-and-v2-acceptance.md)：分区/分页、取消与资源配额，冻结训练/验证/测试和Walk-forward，扩容前后小样本回归，PIT有效期/修订链，长期来源及第二源能力。已有20×60分钟归档、真实回放和5,219只多年日线证据按原数据版本重读，不重新采集以抹平历史失败。

如果免费来源确实不提供带修订链的PIT或第二独立60日分钟能力，记录不满足的具体字段/接口/许可及替代方案；必需能力仍NOT_RUN，不能用Fixture或混合来源标PASS。美股真实数据保持NOT_RUN，Fixture回归继续。

按`pnpm verify:stage -- --stage V2.5 --suite code`、三个场景、`pnpm test:e2e -- --stage V2.5`、同run核对、证据导出及容量/恢复手册执行。随后分别运行`pnpm verify:version -- --version V1`和`V2`；任何未满观察或未签署门禁返回2。对实际用户已签署的阶段保留签署，仅新范围申请新的验收记录。

### P7 V3.1真实研究闭环

复用现有Experiment、预算账本、RunnerJob、ArtifactRef、受控启动计划和宿主适配器。先实现可信宿主任务领取、租约/重启接管、回写鉴权、Artifact原子发布和错误留痕；控制器、Model Gateway与受限Runner分离，Runner无Docker Socket、控制器密钥和业务DB。网络层只允许确切Provider目标，不能只靠应用配置字符串。

在无模型阶段验证越权/路径、网络、超时、OOM、输出上限、重复/取消和UNKNOWN费用预留。执行`pnpm verify:stage -- --stage V3.1 --suite code`、`pnpm v31:runner-smoke`、V3.1 Web E2E，并在目标Ubuntu架构记录镜像/资源/锁文件。运行时`/ready`必须显示Runner、Gateway、凭证引用、ALLOWLIST和预算前置齐备。凭证值不写入证据。

真实实验只在确切Provider、模型、1～3轮输入、默认单轮300 cents、单实验上限1000 cents、阶段总上限3000 cents以及费用风险经过项目所有者审阅后启动。保存真实请求/响应摘要、生成代码、Qlib计算、数据版本、成本reserve/settle、Runner限制和失败Artifact；无生成代码实际执行不得将V3.1标PASS。人工验收按[V3.1阶段文件](../prd/v3-research-and-ubuntu/01-rdagent-small-experiments.md)单独执行。

### P8 后续研究与Ubuntu交付

V3.2：用与搜索隔离的数据独立复算，冻结容差与候选精确版本；人工批准只允许指定版本进入模拟Mandate，研究服务不可自行激活。V3.3：单并发起步，扩预算/并发、恢复/取消/重放并验证核心Paper仍可用。V3.4：在真实Ubuntu目标主机从锁文件构建镜像，备份/恢复数据库及Artifact，跑全阶段Web/CLI回归和至少5个实际A股交易日观察，保存主机架构、资源、镜像摘要、命令退出码和人工签署。Mac上的amd64模拟只保留为兼容烟测。

## 4. 每个工作包的交付模板

开始时记录工作区状态、当前commit、关联需求/测试ID、适用阶段第2节/第7节/第8节。交付时提交：确切改动文件与契约版本、Fixture/DataVersion及SHA-256、测试命令/工作目录/退出码、测试文件与报告、Web URL和操作步骤、同runId/backend业务ID、实际与预期、环境架构/镜像/依赖锁、限制、回滚方法。自动PASS、目标环境PASS、观察WAITING和人工结论分别列出。失败记录追加，不覆盖。

固定退出码：0＝全部适用自动断言PASS；1＝执行或断言失败；2＝前置或观察未完成。长任务仅返回ID时退出2并给出原run的只读查询命令。`--check-only`不初始化、不重放、不下单、不调用模型。用户人工勾选与签署仅在其实际确认后更新。

计划更新规则：每完成或改变一个工作包，同步对应阶段的第2节、第7节、第8节、`90-test-plan.md`、`99-acceptance.md`、`01-feature-traceability.md`及关联架构/ADR。没有证据的任务保留未勾；不能因文档或空套件通过提高业务状态。建议每次只实施一个可复核的纵向切片，优先顺序P0→P1→P2；P4的正式观察按市场日持续运行。

# V3.2 独立复算、人工批准与模拟策略晋升

状态：NOT_RUN。版本入口：[README](./README.md)。共同约束：[三版共同规则](../05-three-version-delivery.md)。

## 1. 前置与范围

V3.1通过；V2回测/模型验证和V1策略Registry/治理已可用。

本阶段所有订单、券商资产和成交均来自隔离模拟环境。真实业务数据库、Qlib或RD-Agent在声明“已验证”时必须真正执行；替身需独立标注。

## 2. 开发任务

- [ ] 定义PromotionRequest，引用候选代码Hash、数据、实验、预算和指标；研究身份只有提交权限，量化服务持有Registry。
- [ ] 量化服务在受控独立环境复算，运行PIT/样本外/成本/规则/容量检查，代码隔离规则与研究实验一致；保留失败和拒绝原因。
- [ ] Web展示源实验与复算报告，人工批准精确版本后才可ACTIVE；策略/参数改变必须新版本并使旧授权不匹配。
- [ ] 候选晋升只授予模拟用途；激活后仍逐次风控、授权和模拟执行，不自动扩大股票池、交易预算或资金。
- [ ] 添加固定可通过/必拒绝候选Fixture用于确定性测试，与真实RD-Agent候选分开标来源，不保证自动研究必然产出可晋升策略。

V3.2当前工作树code/readiness套件复验（2026-10-03）：完整code suite退出0；Quant 91 TS+14 Python单测、Governance 22、Research Automation 203、Platform 169单测/6集成、Web 1测试/build/typecheck通过；合成独立复算70个决策。内部linux/amd64临时PostgreSQL重启后保留READINESS_ONLY TestRun `0823b385-811b-4b34-8e22-c39dac56e36b`，owner/匿名/跨owner结果200/401/403，状态仍WAITING/业务NOT_RUN；活动Registry/Paper/Provider/行情均未触碰。该回归只属准备态与合成Fixture工程证据，V3.1尚未验收、无真实候选、未批准/激活。详见[本轮W6审计](../../../evidence/audits/2026-10-03-w6-v32-after-w5-runner-matrix.md)、[机器报告](../../../evidence/audits/2026-10-03-w6-v32-after-w5-runner-matrix.json)、[完整日志](../../../evidence/audits/2026-10-03-w6-v32-after-w5-runner-matrix.log)。

2026-09-30 准备态TestRun基础：新增owner-scoped `READINESS_ONLY`元数据创建及同ID读取API、契约Schema/OpenAPI、CLI创建/`--check-only`核对和正式页入口。normal/rejection/recovery只记录`WAITING`及`NOT_RUN`，不会运行候选、提交Registry或触发Paper。当前工作树完整V3.2 code suite通过，Platform专用PostgreSQL/HTTP集成3/3（持久化、实际Nest路由、身份和owner/阶段隔离）；测试中的精确已接受V3.1门禁只将前置标为`VERIFIED`，V3.2仍WAITING/NOT_RUN。准备态Web E2E 5/5为Mock API测试。该基础只改善缺前置时的记录与复查，不关闭上述任何业务需求；细节见[W6准备态TestRun审计](../../../evidence/audits/2026-09-30-w6-readiness-testrun.md)。

## 3. 同步 Web 开发

正式页：候选对比、独立复算、批准/拒绝/激活/暂停、关联模拟报告。验收页：未批准调用、旧版本、越权Registry与复算不一致。

验收中心路径：`/acceptance/v3/v3.2`（目标路由）。场景参数提交到后端TestRun编排接口，后端调用业务API并汇集证据。浏览器不直接写领域数据，不自行判定成交。该阶段至少提供正常、拒绝/异常场景；适用时增加重试/恢复场景。

## 4. 人工验收步骤

1. 提交候选，复算完成前不可激活；查看数据与代码一致性及未见窗口使用情况。
2. 使用明确标记的可通过Fixture验证批准后进入模拟交易链路，核对新的策略版本/Mandate。
3. 提交未来数据/超成本/复算不一致候选，确认拒绝；真实实验失败候选也可查。
4. 修改参数或暂停策略后重试旧批准，确认无法授权新交易。

每次保存testRunId、场景版本、代码/镜像、数据/规则版本、种子及注入事件序列、实际/预期、截图/Trace。判定依据必须是后端事实和独立检查，不能只看Toast成功提示。

## 5. 异常与替身边界

人工批准不能越过硬风控或修复缺失证据；样本外反复用于搜索需标受污染并调整验证方案。

## 6. 产物与验证

目标产物：PromotionRequest契约、独立复算Worker、Registry晋升规则、Web候选审核和模拟关联报告。

自动验证：研究身份越权、独立复算/批准状态机、版本失效、候选到Paper全链路E2E，真实候选与Fixture来源区分。

需求/测试追踪：RES-04、QNT-05/06/09、STR-03/08、GOV、AUT-01/03；T10/12/14/26/49；DV-07、VT07。

退出条件：开发任务完成、Web真实可操作、全部适用检查PASS、人工签署、已知限制写入证据。填写[本版验收表](./99-acceptance.md)，未完成项不得勾选通过。

## 7. 阶段交付待办（完成后勾选）

以下勾选只记录本阶段交付进度，不能代替第2节逐项开发任务或版本验收结论。开发者凭实现/实测证据勾选开发项；“人工验收”仅在用户实际确认后勾选，不预填PASS。

- [x] 契约、数据结构、场景定义和预期结果已冻结。
- [ ] 第2节后端任务完成，真实依赖与替身明确。
- [ ] 正式Web功能页及验收中心正常/异常场景完成。
- [ ] 命令、实际URL、Fixture路径/Hash和配置说明已补齐，待实现占位已消除或明确列为范围外。
- [ ] 开发者按第8节从准备到导出亲自执行，保存代码版本、退出码、截图/Trace和断言证据。
- [ ] 重复/恢复及适用观察期验证完成，未覆盖项如实记录。
- [ ] 用户已通过Web及命令证据完成人工验收，记录确认时间/结论。
- [ ] 操作说明与限制已更新，[本版验收表](./99-acceptance.md)已同步。

2026-09-27 实现增量：研究侧新增 `buildPromotionRequest` 纯应用构造器，要求已完成的 Runner Job 与确切 `testRunId`/`experimentId` 匹配；候选、生成代码和指标必须按验证计划声明的精确路径，从该Job记录的已发布OUTPUT引用中解析；校验Job ID、fencing sourceRef和路径派生artifactId；预算必须已结算且已消费金额不超过预留；请求不包含批准或Registry状态字段。Manifest与Validation Plan sidecar已有严格Schema/Fixture/兼容规则；Runner输入包会在两者同时存在时解析它们，绑定当前Job身份，校验计划引用的Manifest原始字节Hash、数据输入文件字节清单，以及三个输出角色到Runner路径派生artifactId的映射。缺任一sidecar、哈希不匹配、路径重复/不安全均拒绝。构造器与Runner bundle相关研究服务测试115/115，build和完整V3.2 code suite通过，详见[PromotionRequest producer准备审计](../../../evidence/audits/2026-09-27-v3-2-promotion-producer-preparation.md)。仍未从持久化实验/账本/Artifact仓储读取证据，未自动调用构造器或量化提交HTTP API；sidecar和候选结果已通过输入哈希及Runner输出引用建立确定性绑定，但尚未形成持久化PromotionRequest工作流，也未执行独立复算、Web/CLI业务验收。V3.1前置和人工验收未完成，本节任务保持未勾选，阶段与业务验收保持NOT_RUN。

2026-09-27 独立验证报告存储增量：新增独立Worker Bearer身份专用报告提交路由及只读平台查询路由。服务核验五项证据的内容Hash与状态、精确PromotionRequest/TestRun/sourceMode绑定，并在PostgreSQL事务中不可变保存；同内容重放幂等、不同内容冲突，提交者和研究服务不能读取，且不改变PromotionRequest状态、不触碰Registry。Quant 37项TS/6项Python测试及随机隔离PostgreSQL/HTTP smoke、完整V3.2 code suite通过，见[验证报告持久化审计](../../../evidence/audits/2026-09-27-v32-validation-report-persistence.md)。当前报告仍由固定合成Fixture reference evaluator提供；候选代码未执行，Qlib worker未提交报告，实际Qlib独立复算、Web/CLI业务TestRun、V3.1前置和人工审批仍NOT_RUN，Registry未写入。此基础设施增量不改变第2节任务勾选与阶段验收状态。

2026-09-27 报告契约校准：所有检查状态（PASS/FAIL/NOT_RUN）都要求对应说明内容的SHA-256，确保同一报告既通过JSON Schema，也能进入不可变提交接口。未运行项仍记录为NOT_RUN，哈希只保证说明未被更改，不代表检查执行。基线和完整V3.2 code suite通过，详见[报告证据契约校准审计](../../../evidence/audits/2026-09-27-v32-report-evidence-contract-alignment.md)。

2026-09-27 冻结合成复算输入门禁：`v32:fixture-recompute`现在在任何检查或报告生成前校验V3.2 Fixture manifest的fixtureId/version/stage/status/dataMode/usageEligibility、三个且仅三个文件名/manifest路径及其原始字节SHA-256；定向回归覆盖候选文件篡改、错误用途资格和额外文件。8项量化定向单测通过，独立Python与TypeScript参考实现交叉复算70项决策并逐笔对比，交易一致、收益差在冻结1e-6容差内。完整`pnpm verify:stage -- --stage V3.2 --suite code`退出0，基线780条Markdown链接、100 JSON/53 Schema/34 Fixture、40兼容规则；量化39 TS+11 Python、研究自动化135、平台56、Web 1项单测及build/typecheck通过。该门禁只验证显式冻结的合成Fixture，不执行候选代码、不持久化PromotionRequest/报告、不提交Quant、不写Registry、不声称盈利；V3.1前置、业务Web/CLI验收及人工签署仍NOT_RUN。详见[冻结输入哈希门禁审计](../../../evidence/audits/2026-09-27-v32-fixture-manifest-gate.md)。

2026-09-27 复算隔离边界纠正：复查发现此前`v32:fixture-recompute`实际使用宿主`python3`，与旧审计声称的容器执行不一致。现正式入口解析并固定Qlib Worker镜像ID `sha256:4135861adbf3617ae1b2e578caf7d2eb3f3835e0f5f42cf257b7a0d7b6991094`，强制`linux/amd64`、`--pull never`、无网络、只读根和Fixture/脚本挂载、非root UID、无额外capability、no-new-privileges及256 MiB/1 CPU/64 PID限制；没有宿主回退。Mac宿主为ARM64，因此属于AMD64仿真，不是Ubuntu实机验证。完整V3.2 code suite重跑退出0；新报告SHA-256 `0c319afed9e970497673aa006bfabb144112f53d074cc6e33916bc7bf4eda33c`。本地修正仅恢复证据/实现一致性；容器中仍是Python标准库参考复算，不调用Qlib或执行候选代码。真实候选、持久业务run、V3.1前置和人工验收继续NOT_RUN，见[隔离边界纠正审计](../../../evidence/audits/2026-09-27-v32-fixture-reference-recomputation.md)。

## 8. 阶段验收操作手册

### 8.1 当前可执行性与验收准备

手册状态：DRAFT_NOT_EXECUTABLE（仅代码/Fixture链路具备可复执行令；正式normal/rejection/recovery业务流程、同run CLI核验和证据导出尚未实现）。以下信息区分已验证的工程检查与不得运行的业务流程。不能把Mock Web E2E、Disposable Registry记录或Fixture代码PASS当成正式V3.2接受。

本机已验证工具：项目根目录 `/Users/huangbosong/Documents/ChatGPT/StockQuant`；Node `v24.1.0`、pnpm `10.34.5`、Docker CLI `28.0.4`；当前开发宿主Mac ARM64，候选及参考评估容器均为锁定Linux/ARM64镜像。Docker daemon访问需要本机权限。只读Web页路由为 `/acceptance/v3/v3.2`，本地E2E管理Vite `http://127.0.0.1:5173`；E2E拦截API，不能代表已连接业务后端。

V3.2冻结输入目录：`fixtures/v3/v3.2-independent-validation-v1/`，Manifest标记 `FROZEN`、`FIXTURE`、`RESEARCH_ONLY`、合成来源。文件与SHA-256：`daily-bars.csv` `cbc78bb841441d249cc145048ec5ebf83771c599f68bf31274b792daaee6e77c`；`candidate.json` `ab09b5e966c0e5c179dc423a56250e08354cc20795ba12761cfab8b98ea707d4`；`validation-design.json` `0fda5244f287a206ca797a09fc18b5622b8b57e1852834861f407630d0187736`。冻结候选源码SHA-256为`9392a720f5e7576f7047b93c212b0d3776e3621a2379e1878a25e93cfb6303ff`；它只用于白名单合成验证，不是RD-Agent或用户候选。

独立Worker配置名为 `STOCKQUANT_QUANT_RESEARCH_URL`、`STOCKQUANT_SERVICE_TOKEN_QUANT_VALIDATION_WORKER`，可选镜像覆写 `STOCKQUANT_V32_VALIDATION_IMAGE_ID`；凭证仅通过本机安全环境配置，不写入手册或容器。随机PostgreSQL集成烟测使用 `QUANT_PROMOTION_SMOKE_ADMIN_DATABASE_URL`，仅允许专用本机 `127.0.0.1:5433/postgres` 管理入口，并创建/删除随机命名临时数据库。Worker读请求超时10秒、候选容器60秒、参考评估容器120秒、报告提交10秒；容器使用`--rm`，测试脚本在正常退出时删除随机数据库。

正式服务虽然有已实现的读/提交/精确决定及只读Mandate绑定路由，但当前V3.2没有完整TestRun业务编排；权威V3.1接受、非Fixture候选Artifact执行、Paper消费精确版本指纹及证据导出均未齐备。`stack:up`当前不支持V3.2；不要为此阶段运行会重建共享服务的Compose命令，以免重启仍在承担观察任务的Market Data服务。

| 开发交付时必须填写 | 当前值 |
|---|---|
| 实测代码Commit或工作区Hash/验证日期 | 当前工作区未提交；V3.2 code suite及专用Platform PostgreSQL集成检查于2026-09-30通过；需在最终交付时记录整体代码快照Hash |
| 项目根目录、Node/pnpm/Python/uv及Docker版本 | `/Users/huangbosong/Documents/ChatGPT/StockQuant`；Node 24.1.0、pnpm 10.34.5、Docker CLI 28.0.4、Mac ARM64 |
| Web基础URL/身份登录或会话建立方式 | 本地E2E用 `http://127.0.0.1:5173`；本次Playwright为Mock API，不建立业务会话 |
| 本阶段Web路由 | `/acceptance/v3/v3.2`（PromotionRequest审阅页及owner-scoped WAITING准备态TestRun已实现；正式业务编排NOT_RUN） |
| 正式页面的真实入口/跳转链接 | 页面路由存在；准备态运行会显示TestRun UUID并可同页读取；业务TestRun执行/详情与正式Evidence Bundle未实现 |
| Fixture文件/数据版本/确切日期/Hash、规则与成本版本 | `v3.2-independent-validation-1`；精确文件与SHA见本节上文及`manifest.json`；规则/成本见`validation-design.json` |
| 配置文件及必需环境变量名/非秘密测试值 | Worker配置名见上文；值UNSET/不记录凭证。集成随机DB默认管理员端点固定为本机5433 |
| 外部故障目标及可执行命令、恢复/隔离清理入口 | 固定候选/评估容器禁网；集成脚本随机DB于正常退出清理；正式故障注入未实现，不得指向活动Paper/观察服务 |
| 预期耗时、轮询超时、实际观察期/预算 | 当前代码套件数分钟；候选容器60秒、参考评估120秒；真实观察与预算不适用本Fixture代码检查且保持NOT_RUN |

### 8.2 已验证的开发检查入口

本阶段支持隔离代码/集成检查、Mock API页面回归，以及owner-scoped持久化的`READINESS_ONLY` TestRun元数据。准备态运行只保存WAITING/NOT_RUN门禁并可回读同一ID；它不启动共享业务Compose栈、不提交候选、不写Registry/Mandate，也不执行正式V3.2业务TestRun。

```bash
cd /Users/huangbosong/Documents/ChatGPT/StockQuant
pnpm verify:stage -- --stage V3.2 --suite code
pnpm test:e2e -- --stage V3.2
```

2026-09-30实测：`pnpm verify:stage -- --stage V3.2 --suite code`退出0，含独立合成候选/参考容器、随机Quant临时库和专用`platform_api_test` PostgreSQL（3个集成测试通过）；现额外包含`pnpm verify:w8:v32-readiness`。该runtime smoke构建当前Platform `linux/amd64`镜像，在随机`--internal`网络中连接摘要固定的PostgreSQL 16.9；数据库仅tmpfs、Platform根只读/no-new-privileges/drop ALL capabilities。断言：`/live`=200、缺少Portfolio/Execution/Replay时`/ready`=503；POST TestRun=202且WAITING/READINESS_ONLY/NOT_RUN；owner GET=200、匿名=401、跨owner=403；Platform重启后同ID仍可从PG读取。预期20秒内服务live/PG就绪，Docker构建命令超时240秒。烟测随机容器/网络/镜像在`finally`中无条件按唯一UUID名称清理；中断后可只读核查`docker ps -a --filter name=sq-v32`、`docker network ls --filter name=sq-v32`和`docker image ls --filter reference='stockquant-v32-readiness-smoke:*'`，仅移除能匹配本次随机标签的已退出烟测资源。最终完整代码套件内Smoke TestRun `3cfea7c5-1da0-4b7c-98c0-f8f3f642e401`；独立复跑证据见[W6准备态TestRun审计](../../../evidence/audits/2026-09-30-w6-readiness-testrun.md)。`pnpm test:e2e -- --stage V3.2`退出0，5项Chromium用例均通过Mock API。Research Automation promotion smoke使用随机隔离数据库并正常退出清理。所有这些都是工程/Fixture/Mock覆盖，正式V3.2业务断言仍NOT_RUN。不得用业务库替代专用测试数据库；若中断，只核实本次随机命名临时资源并按脚本清理，禁止删除共享数据库/卷。

三个场景现创建持久化准备态TestRun，输出`WAITING`、有效`testRunId`和退出2；这表示缺失前置被明确记录，不是业务场景验收通过。当前`pnpm stack:up -- --stage V3.2`不受支持；不可用V3.1启动命令替代，因为它会重建共享Market Data服务。

### 8.3 当前Web支持边界

正式页面路由为 `/acceptance/v3/v3.2`。它可创建并回读owner-scoped `READINESS_ONLY` TestRun，读取已存在的PromotionRequest及不可变报告，并在精确版本已批准时请求只读Governance→Quant指纹绑定检查；它不会运行用户候选、写Mandate或激活候选。页面E2E是Mock API覆盖，不是后端用户验收。

当前可重放页面命令及检查范围：

```bash
pnpm test:e2e -- --stage V3.2
```

测试文件为 `apps/web/tests/e2e/v32-promotion-readonly.spec.ts`，覆盖准备态TestRun同ID创建/读取、只读证据显示、V3.1提交前置提示、精确版本决定控件和只读Mandate绑定请求，共5项Chromium用例。API被测试拦截器替代；真实服务跨owner、业务任务关闭/恢复和Artifact证据仍需正式编排后验证。不可把Mock页面检查当作业务通过证明。

### 8.4 当前代码与门禁命令

以下命令中，normal/rejection/recovery创建并读取同一owner-scoped准备态TestRun，均返回WAITING/退出2；退出2表示业务断言未运行，不能记为业务PASS。code suite和E2E退出0只代表对应工程检查通过。

```bash
pnpm verify:stage -- --stage V3.2 --scenario normal --seed 20260907
# 预期：status=WAITING、有持久化 testRunId、businessValidation=NOT_RUN，exit 2
pnpm verify:stage -- --stage V3.2 --scenario rejection --seed 20260907
# 预期同上；独立的准备态 TestRun
pnpm verify:stage -- --stage V3.2 --scenario recovery --seed 20260907
# 预期同上；不触发候选重放或 Registry 写入
# 使用Web返回的确切UUID，只读核对同一运行
pnpm verify:stage -- --stage V3.2 --run <testRunId> --check-only
# 预期：同一个WAITING运行，exit 2
pnpm verify:stage -- --stage V3.2 --suite code
# 其中含真实HTTP/PG smoke；也可单独运行：
pnpm verify:w8:v32-readiness
# 预期：exit 0；完整代码/隔离集成套件
pnpm test:e2e -- --stage V3.2
# 预期：exit 0；4项Mock API Chromium页面测试
```

normal/rejection/recovery在当前代码均写入owner-scoped `v3.2-readiness-v1`记录，随后读取该ID；状态为`WAITING`、`businessValidation=NOT_RUN`并退出2。可提供`STOCKQUANT_SESSION_COOKIE`和`STOCKQUANT_PLATFORM_API_URL`。check-only只读取同一V3.2准备态记录。阻塞项仍包括权威V3.1接受、非Fixture候选隔离执行及绑定Artifact复算、正式独立报告工作流、Governance/Paper消费精确指纹及业务导出。准备态元数据不是正式业务运行。

V3.2的`--run ... --check-only`与准备态Web→CLI同run只读核对现已实现。`--run <testRunId>`现可导出已有owner-scoped `READINESS_ONLY` TestRun，产物显式保留`WAITING`、`businessValidation=NOT_RUN`和`humanAcceptance=NOT_RUN`；`--promotion-request`仍单独导出PromotionRequest准备态快照。两种导出均需本地session cookie、核对精确对象绑定并拒绝覆盖已有目录。该准备态TestRun导出不等于正式V3.2业务运行Evidence Bundle，不能把准备态TestRun或合成ID冒充正式验收。正式候选业务运行、Web→CLI业务断言仍未实现。

准备态快照命令：

```bash
pnpm evidence:export -- --stage V3.2 --promotion-request <existing-promotion-request-uuid>
pnpm evidence:export -- --stage V3.2 --run <existing-readiness-test-run-uuid>
```

需通过`STOCKQUANT_EVIDENCE_SESSION_COOKIE`提供当前owner会话，并可用`STOCKQUANT_PLATFORM_API_URL`指定Platform API（默认`http://127.0.0.1:3000`）。`--promotion-request`请求owner-scoped PromotionRequest详情API并检查请求/源V3.1 TestRun绑定；`--run`请求owner-scoped V3.2 TestRun API并只接受精确匹配的`READINESS_ONLY`/`WAITING`记录。无会话、非owner或绑定/状态错误时不写文件。PromotionRequest写至`evidence/local/V3.2/<promotionRequestId>/`；TestRun写至`evidence/local/V3.2/<testRunId>/`；两者均含`evidence.json`和覆盖确切JSON字节的`manifest.sha256`，目标已存在则拒绝覆盖。准备态TestRun导出明确保留`businessValidation=NOT_RUN`和`humanAcceptance=NOT_RUN`。独立验证包括7项CLI单测、7项owner-scoped HTTP/文件系统smoke、`pnpm test:ops`154/154及V3.2完整代码套件PASS；没有使用实际用户session导出。故第8节仍DRAFT_NOT_EXECUTABLE；该功能不是正式业务Evidence Bundle。正式交付仍需V3.2业务TestRun、同run CLI业务断言及与Web业务事实绑定的完整证据包，并验证版本失效和Paper精确指纹消费。详见[W6 readiness TestRun导出审计](../../../evidence/audits/2026-09-30-w6-readiness-run-export.md)及[Hash](../../../evidence/audits/2026-09-30-w6-readiness-run-export.sha256)。

### 8.5 交叉核对、失败定位与恢复

交叉核对：源实验和独立复算DataVersion/代码Hash、批准者/版本、策略部署/Mandate和模拟订单引用对应。

先检查Web与CLI的testRunId、输入/策略/代码版本和模式是否一致，再按Trace查平台、领域、适配器与持久化证据。页面错误而CLI正确，记录Web失败；二者都错则保留领域断言失败。缺能力先查健康/迁移/数据与日志，不修改余额或订单状态使断言通过。

独立复跑创建新run；测试幂等/检查点/重启恢复则使用原run和原幂等键。故障发生后保留旧证据，修复后新增运行或检查记录；不得清空账本、随机更换seed直到通过。真实观察窗口、来源验证和实际模型调用与加速/录制测试分别记录。

### 8.6 验收记录与收尾

| 场景/检查 | Web实际结果与截图 | 命令/退出码/报告 | testRunId/业务ID | 结论 |
|---|---|---|---|---|
| normal | 待执行 | 待执行 | 待执行 | NOT_RUN |
| rejection（含全部子场景） | 待执行 | 待执行 | 待执行 | NOT_RUN |
| recovery（含实际外部动作） | 待执行 | 待执行 | 待执行 | NOT_RUN |
| Web同run只读核对与证据导出 | 待执行 | 待执行 | 待执行 | NOT_RUN |
| 本阶段代码测试/实际观察适用项 | 待执行 | 待执行 | 待执行 | NOT_RUN |
| 用户人工验收 | 待用户确认 | 不由脚本代签 | 确认人/日期待填 | NOT_RUN |

记录不适用子项的范围依据，不能将必需项改为不适用绕过门禁。归档后在[本版验收表](./99-acceptance.md)填写证据链接和结论。清理只针对本轮已结束的隔离运行，默认保留证据；停止测试不能删除数据库卷或取消无关任务。

## 2026-09-25 contract preparation evidence

The request and deterministic candidate-validation fixture shapes have been added and contract-validated; see [V3.2 contract audit](../../../evidence/audits/2026-09-25-v3-2-contract-preparation.md). The preparation fixtures distinguish `ELIGIBLE_FOR_REVIEW` from a `FUTURE_DATA_LEAKAGE` rejection, and both explicitly use `sourceMode=FIXTURE`. The quant service has a persistent PromotionRequest intake with submission-only research Bearer identity, platform-only read scope, immutable idempotency, and a database state constrained to `AWAITING_INDEPENDENT_VALIDATION`; see [intake audit](../../../evidence/audits/2026-09-25-v3-2-promotion-intake.md). The research-side producer, independent recomputation, Registry transitions, candidate comparison Web flow and actual V3.2 approval remain unimplemented. `normal`, `rejection`, and `recovery` return WAITING/exit 2 until the V3.1 prerequisite and complete V3.2 workflow exist. `pnpm test:e2e -- --stage V3.2` remains unsupported/exit 2 because the V3.2 Web workflow is absent. See [V3.2 entrypoint audit](../../../evidence/audits/2026-09-25-v3-2-preparation-entrypoint.md). V3.1 is still NOT_RUN, so V3.2 execution and acceptance remain NOT_RUN.

## 2026-09-25 PromotionRequest intake implementation

The quant service now accepts the canonical PromotionRequest at `POST /v1/promotions`, stores an immutable request snapshot with a canonical content fingerprint and unique idempotency key, and exposes a platform-only read at `GET /v1/promotions/{promotionRequestId}`. Research automation uses its own optional 32-character-minimum Bearer credential, scoped only to submission; the platform identity is read-only for PromotionRequests. Database constraints and response schema permit only `AWAITING_INDEPENDENT_VALIDATION`; approval and activation are not expressible through this API. `pnpm contracts:check`, quant unit tests (20), and isolated PostgreSQL/HTTP integration tests passed, including concurrent identical submissions (one create and one replay), changed content conflict, invalid budget rejection and caller-scope checks. This is intake persistence only: the research-side producer, independent recomputation, quant Registry, Web/TestRun scenarios and V3.1 prerequisite remain incomplete. Business scenarios and human acceptance remain NOT_RUN.

2026-09-26 hardening: PromotionRequest reads now validate a single UUID path segment before querying PostgreSQL; malformed IDs return 422 and nested paths return 404 without affecting service health or stored requests. Quant tests 21/21, build, and isolated PostgreSQL/HTTP integration pass; see [PromotionRequest intake audit](../../../evidence/audits/2026-09-25-v3-2-promotion-intake.md). This does not implement independent recomputation or change V3.2 `NOT_RUN` status.

2026-09-26 validation-gate slice: added a typed validation report contract and a fail-closed summary function requiring exactly one evidence-bearing result for PIT, out-of-sample, cost, rules, and capacity. Any failed gate is rejected; any missing execution remains incomplete; only five passes become eligible for human review. Every report remains explicitly non-mutating (`registryMutation=NOT_PERFORMED`). Quant unit tests 25/25 and build passed; see [validation gate audit](../../../evidence/audits/2026-09-26-v3-2-validation-gate.md). This is not a recomputation engine: no source artifact or frozen datasets are loaded, no Qlib recomputation is invoked, and no real validation evidence is produced. The report builder is not wired to a service route or persistent workflow. V3.1 prerequisite, V3.2 scenarios, Web flow, and acceptance remain `NOT_RUN`.

2026-09-27 V3.1 predecessor gate slice: Platform now stores an immutable, owner-bound human acceptance record for one exact V3.1 TestRun and exposes a Research Automation-only read API. Eligibility fails closed unless the run is completed normal scenario, all assertions and required real-model/Runner assertion IDs pass, the environment is RESEARCH + FAKE, evidence records a LIVE model response hash/cost, and a completed Runner has a published output hash. The service reader requires the independent `STOCKQUANT_SERVICE_TOKEN_RESEARCH_AUTOMATION` Bearer plus matching service ID. An isolated PostgreSQL/HTTP smoke verifies anonymous 401, wrong token 403, pre-acceptance `NOT_RUN`, exact user-session acceptance, idempotent replay and immutable-content conflict; synthetic smoke data is cleaned and is not human acceptance. The existing Fixture V3.1 run remains ineligible and the real prerequisite remains `NOT_RUN`; Research Automation does not yet consume this gate to wire or submit a V3.2 PromotionRequest. See [V3.1 persisted acceptance gate audit](../../../evidence/audits/2026-09-27-v31-persisted-acceptance-gate.md).

2026-09-27 follow-up: Research Automation now exposes a platform-authenticated `/v1/promotions/submit` coordinator, and Platform exposes an owner-session route at `/api/v1/acceptance/v3/v3.2/runs/{testRunId}/promotion-submission`. It derives the experiment ID from the owner's persisted normal V3.1 run and requires explicit submission confirmation. Research Automation prepares the immutable request, reads the exact V3.1 gate using its own Bearer identity, and opens the durable submit journal and calls Quant only after both stage PASS and human ACCEPTED match that TestRun. Random-database HTTP smokes verified the Platform proxy returns WAITING without changing acceptance when preparation evidence is absent, and the Research Automation coordinator makes zero Quant calls for a NOT_RUN gate; a synthetic ACCEPTED gate permits one Quant mock request and a journaled replay does not call Quant again. Full V3.2 code suite exited 0 before the last Platform proxy change; the final V3.1 code suite and baseline are rerun after it. This is synthetic integration evidence only: no user's acceptance, production model, or real Quant Registry mutation occurred, and V3.1/V3.2 business and human acceptance remain NOT_RUN. See [V3.2 guarded submit audit](../../../evidence/audits/2026-09-27-v32-guarded-submit.md).

2026-09-27 regression recheck after correcting the Qlib worker's Fixture-only labels: `pnpm verify:stage -- --stage V3.2 --suite code` exited 0. Quant contract/fixture checks, four waiting-gate tests, quant 25 TypeScript + 3 worker HTTP tests, candidate/PromotionRequest isolated PostgreSQL smokes, research automation 95 tests/build, and Web type/unit checks passed. The stage result continues to say business validation `NOT_RUN`, Registry mutation `NOT_PERFORMED`, human acceptance `NOT_RUN`; this does not replace the missing V3.1 prerequisite or implement candidate recomputation.

2026-09-27 research-side constructor preparation: added strict sidecar schemas for a V3.2 data manifest and validation plan, generated TS/Python projections, and fixtures. The pure constructor hashes exact UTF-8 bytes, binds both documents to the same TestRun/experiment, checks the plan's reference to the manifest, and derives candidate source from the plan. Runner input-bundle parsing now extracts the paired sidecars, binds them to the current job, and recomputes the dataset inventory hash from exact bundled file bytes. Producer and bundle focused tests passed 30/30; the complete code suite passed: 88 JSON/46 schemas/33 contract fixtures/33 compatibility rules; Quant 25 TypeScript + 3 Python Worker tests and two isolated PG/HTTP smokes; Research Automation 115 tests/build; Web typecheck and 1 test. Stage business validation and human acceptance remain `NOT_RUN`, and Registry mutation remains `NOT_PERFORMED`. This still does not load persisted owner-bound records, automatically call the producer or submit to Quant, persist PromotionRequest workflow evidence, recompute a candidate, or provide Web/CLI business acceptance. V3.1 prerequisite and human acceptance remain `NOT_RUN`.

2026-09-27 persistent-evidence assembly increment: `V32PromotionRequestPreparer` reads the experiment, Runner Job, settled budget and immutable ArtifactRefs through injected repositories, resolves and hash-checks the content-addressed Runner input bundle, validates its sidecars, and binds the three output roles to published Runner refs. PromotionRequest UUID and idempotency key derive deterministically from the Runner Job so retries produce the identical payload. Missing prerequisites/evidence return `WAITING`; complete evidence returns `READY_FOR_GATE_CHECK`, which is not V3.1 acceptance and does not submit to Quant. Seven focused tests cover stable retries, missing job/input/sidecars, unsettled budget, content drift and output-role relabeling. Platform-only `POST /v1/promotions/prepare` now reads the persistent evidence and returns `WAITING` or `READY_FOR_GATE_CHECK`; it does not submit to Quant. A random-database HTTP smoke completed the experiment→settled budget→input bundle→fenced Runner outputs→stable preparation replay flow; Runner Host access is rejected. The complete V3.2 code suite passed with Research Automation 122/122 and build; contracts, Quant 25 TypeScript + 3 Python, isolated PG/HTTP smokes, Web typecheck/unit all passed. Business validation/human acceptance remain `NOT_RUN`; Registry mutation remains `NOT_PERFORMED`. Quant submission, independent recomputation, Web/CLI acceptance and human signature remain unimplemented.

2026-09-27 validation-report runtime hardening: Quant's report builder now validates untrusted runtime status values and requires each `PASS` to carry a syntactically valid SHA-256; malformed non-null hashes are rejected for every status. Quant unit tests 26/26, Worker boundary tests 3/3, and build passed. This aligns the builder with the JSON Schema but remains report validation only: no candidate/dataset loading, independent recomputation, persisted report, approval, or Registry mutation occurred. See [V3.2 validation report runtime audit](../../../evidence/audits/2026-09-27-v32-validation-report-runtime-validation.md). V3.2 validation and human acceptance remain `NOT_RUN`.

2026-09-27 frozen recomputation-input increment: added immutable `v3.2-independent-validation-1` with 180 synthetic weekday sessions per security for two CN securities, a fixed SMA-cross candidate, disjoint 108/36/36 train/validation/test session windows, and frozen PIT, cost, rules and capacity semantics. Manifest provenance marks synthetic/research-only; the generator refuses to overwrite an existing version. `pnpm fixtures:check` now runs both manifest SHA verification and exact deterministic-source comparison. The fixture is only input readiness: no Qlib or independent candidate execution/report was performed, so backend validation, V3.2 business scenarios and human acceptance remain `NOT_RUN`. See [frozen input audit](../../../evidence/audits/2026-09-27-v32-frozen-recompute-input.md).

2026-09-27 follow-up: Quant Research adds a deterministic reference calculation for that fixed fixture, recomputing the allowlisted SMA candidate on test sessions and deriving PIT, out-of-sample, cost, rules and retrospective capacity evidence. The exact V3.2 code suite now executes `pnpm --filter @stockquant/quant-research-service v32:fixture-recompute`; its 5/5 fixture checks pass, alongside six Quant unit files/31 tests and three Worker boundary tests. The resulting `ELIGIBLE_FOR_REVIEW` report uses static contract-Fixture IDs, is not persisted, and stays `sourceMode=FIXTURE`. This does not execute Qlib or candidate-provided code, establish a controlled separate Runner environment, recompute a persisted real candidate, or create a V3.2 business TestRun. Overall business validation and human acceptance remain `NOT_RUN`; Registry mutation remains `NOT_PERFORMED`. See [reference recomputation audit](../../../evidence/audits/2026-09-27-v32-fixture-reference-recomputation.md).

Actual local reference-recomputation operation: from repository root run `pnpm --filter @stockquant/quant-research-service v32:fixture-recompute`. Expected output includes a PromotionRequest identity marked `STATIC_CONTRACT_FIXTURE_IDS_NOT_PERSISTED`, five evidence hashes, `sourceMode=FIXTURE`, `persistence=NOT_PERFORMED`, and no approval or Registry mutation. This is a code/Fixture check only; formal `/acceptance/v3/v3.2`, same-run CLI, Web workflow, persisted report and actual user acceptance remain unavailable.

2026-09-27 read-only UI increment: `/acceptance/v3/v3.2` now accepts an existing PromotionRequest UUID and displays its immutable source, run/experiment IDs, evidence hashes and any persisted validation report through a session-protected Platform proxy. Missing report is displayed as `NOT_RUN`; Registry is explicitly `NOT_PERFORMED`. Quant exposes a Platform-Bearer-only detail read, with JSON Schema/OpenAPI/compatibility coverage. Targeted UI test passed 1/1; Web/Platform/Quant builds and baseline checks passed. This is evidence browsing only: it creates no V3.2 TestRun, does not independently recompute a candidate, and has no approve/promote controls. The stage Web/scenario checkboxes and runnable handoff remain unchecked; stage status stays `NOT_RUN` pending its actual prerequisite and end-to-end workflow.

2026-09-27 input validation and independent implementation hardening: the TypeScript evaluator rejects non-positive OHLC prices/volume and invalid participation limits. A separate Python standard-library implementation independently parses and recomputes all frozen test decisions, trades, fees and returns; the standard fixture command requires the complete trade sequence to match and metrics to agree within the frozen tolerance. The same Python script ran against a read-only fixture mount in the cached Linux/AMD64 Qlib worker image. It does not invoke Qlib or execute candidate code, so `qlibExecution` remains `NOT_RUN`. Quant tests pass 33/33; Python tests pass 6/6 and the complete V3.2 code suite passes. See the [implementation audit](../../../evidence/audits/2026-09-27-v32-fixture-reference-recomputation.md). This remains synthetic cross-runtime evidence, not persisted candidate validation, business acceptance, or human approval.

2026-09-27 guarded submit workflow completion: Platform now persists the user's V3.1 exact-run acceptance, exposes an owner-scoped gate reader, and provides an explicit owner-session V3.2 submission action; Research Automation consumes the same gate under its separate Bearer identity before creating a durable Quant submit attempt. The V3.1 Web UI exposes acceptance only when the exact-run gate returns PASS and NOT_RUN; the V3.2 Web UI submits the currently selected/saved TestRun and displays WAITING or submission status. Final V3.1 and V3.2 code suites passed; six focused Playwright page tests passed using intercepted synthetic APIs. Full details and HTTP evidence: [V3.1 persisted gate audit](../../../evidence/audits/2026-09-27-v31-persisted-acceptance-gate.md) and [V3.2 guarded submit audit](../../../evidence/audits/2026-09-27-v32-guarded-submit.md). Current V3.1 real-model and completed-Runner evidence remains unavailable; no human acceptance was written, no Quant Registry mutation occurred, and business validation/acceptance remain `NOT_RUN`.

2026-09-27 exact-version approval increment: the Quant service now stores an immutable APPROVE/REJECT decision tied to the exact persisted PromotionRequest and report SHA-256. APPROVE requires all five report checks to be PASS and creates a Quant Registry version fingerprint over the immutable request/report and candidate/code/data/metrics/plan hashes. Detail reads now derive `AWAITING_REVIEW`, `VALIDATION_INCOMPLETE`, `REJECTED`, or `CANDIDATE_APPROVED` from persisted report/decision facts without rewriting the immutable intake row. The owner-session Platform route verifies ownership of the normal V3.1 source run and its persisted exact-run acceptance before forwarding the actor and exact report fingerprint; the Web page shows explicit approve/reject actions only after a report is present. Identical retries are idempotent; changed decision or stale fingerprint conflicts. Registry candidates remain `DISABLED_UNTIL_MANDATE`; changing any request/report input creates a different version fingerprint and does not carry approval forward. Contract/OpenAPI/compatibility/type generation, Quant random-PG/HTTP smoke, Platform owner/session tests and three mocked Playwright page tests pass. The smoke's accepted report and actor are synthetic and created only in its random disposable database. Downstream Mandate matching, real independent candidate execution, V3.2 TestRun/evidence export, real V3.1 prerequisite and human/business acceptance remain incomplete; no active Registry or Mandate was changed.

2026-09-27 downstream Registry lookup increment: Quant adds Platform-Bearer-only `GET /v1/registry/versions/{versionFingerprint}`. It returns the exact approved version's candidate Artifact identity and candidate/code/data/metrics/validation-plan hashes, approver, and immutable `DISABLED_UNTIL_MANDATE` state; unknown versions return 404 and no write/activation operation exists. Versioned schema/OpenAPI/compatibility/types and auth-scope tests are aligned. Quant 45 TypeScript + 12 Worker tests, build, random disposable PostgreSQL/HTTP exact-approval→fingerprint-lookup smoke (including unknown 404 and Research Automation 403), contract checks (115 JSON/65 schemas/34 Fixtures/52 compatibility rules/7 promotion operations), and `git diff --check` pass. The full `pnpm verify:stage -- --stage V3.2 --suite code` also passes on the approved local loopback environment, including Research Automation 138 tests/build/guarded-submit smoke, Platform 62 tests/build, and Web typecheck/build/unit. This only supplies a read interface needed by downstream Mandate binding: Paper/Governance does not yet consume it, and no active Registry/Mandate or real candidate was touched. Business validation and human acceptance remain `NOT_RUN`; see [Registry lookup audit](../../../evidence/audits/2026-09-27-v32-registry-lookup.md).

2026-09-27 Governance-to-Quant Mandate binding increment: Governance now queries the exact Registry fingerprint directly with its own read-only Bearer identity. The owner-session Platform route first requires the owner match and persisted acceptance of that exact normal V3.1 TestRun, then proxies the strict PAPER/FAKE Mandate binding request. Governance requires Registry status `CANDIDATE_APPROVED`, disabled activation state, exact version fingerprint and exact candidate Artifact ID/namespace/SHA; mismatch/unknown version are rejected and Quant outage is WAITING. Real two-service Governance→Quant HTTP plus random isolated PG smoke proves match, Artifact mismatch, unknown version and wrong-caller rejection. The V3.2 Web page now exposes the read-only check only for an approved exact version and labels account validation/Mandate persistence as `NOT_PERFORMED`; the stage-specific `pnpm test:e2e -- --stage V3.2` entry passes 4 mocked API Chromium flows. Platform owner/gate tests, Governance/Quant tests/builds, full V3.2 code suite, 118-JSON/67-schema/54-rule contracts, and Compose config are recorded in [the exact binding audit](../../../evidence/audits/2026-09-27-v32-governance-mandate-binding.md). This endpoint only makes a candidate ready for separate Mandate review; it persists no Mandate, issues no execution authorization and activates nothing. Real V3.1, candidate business validation and human acceptance remain `NOT_RUN`.

2026-09-27 persisted Fixture report improvement: Quant's isolated PG/HTTP integration now constructs the persisted PromotionRequest from the frozen synthetic candidate and data manifest, runs the fixed reference evaluator, builds the five-check report using dynamic request/run IDs and all source hashes, and verifies stored report/evidence read back exactly. The integration then exercises exact approval, downstream Governance→Quant lookup and Mandate binding. The full V3.2 code suite passes. This is actual deterministic Fixture recomputation, not user candidate execution, Qlib, real-market validation, or profitability evidence; formal V3.2 business scenarios and human acceptance remain `NOT_RUN`. Details: [Governance and exact binding audit](../../../evidence/audits/2026-09-27-v32-governance-mandate-binding.md).

2026-09-27 独立Fixture Worker及受限评估容器增量：一次性Worker控制进程以自己的Bearer身份读取不可变PromotionRequest；固定image ID的Linux/ARM64容器以禁网、只读根与输入、非root、无capabilities及明确CPU/内存/PID限制运行参考评估，Worker token仅留在控制进程。Quant隔离PG/HTTP smoke断言容器镜像和隔离参数，46项TS与12项Python测试及完整V3.2 code suite通过。Worker只接受合成Fixture，受限容器运行的是可信固定评估实现，未运行候选源代码或Qlib；真实候选复算、真实V3.1前置、V3.2业务Web/CLI验收和人工签署仍NOT_RUN。详见[独立Worker进程审计](../../../evidence/audits/2026-09-27-v32-independent-worker-process.md)。

2026-09-27 E2E启动修正：`pnpm test:e2e -- --stage V3.2`现由Playwright自动启动或复用本地Vite，避免默认连接未启动的8080容器预览；显式`PLAYWRIGHT_BASE_URL`仍可指向容器。四项V3.2 Chromium mock API测试无预启动Web服务通过。normal/rejection/recovery入口仍按缺失V3.1与真实业务链的要求退出2/WAITING；Mock E2E不构成真实Web业务验收，故第7节及第8节人工交付状态不变。

2026-09-27 candidate Artifact delivery: Research Automation now serves the submitted request's exact candidate bytes only to the dedicated `quant-validation-worker` Bearer identity, and only after the authoritative V3.1 gate and successful Quant submission are persisted. The Worker fetches and validates the ArtifactRef and byte hash and mounts the downloaded bytes read-only into its isolated Linux/ARM64 candidate and reference-evaluator containers. Random PostgreSQL/HTTP delivery smoke, Quant dual-container validation integration, full V3.2 code suite and contract baseline pass; details: [Worker Artifact delivery audit](../../../evidence/audits/2026-09-27-v32-worker-artifact-fetch.md). The current candidate contract deliberately remains allowlisted to the frozen synthetic SMA bytes, so this does not yet validate arbitrary RD-Agent/user candidates, Qlib, market data, or profitability. V3.1 actual user acceptance, formal V3.2 TestRun/export, business validation and human acceptance remain `NOT_RUN`; Registry and Mandate were not changed.

2026-09-27 preparation evidence export: `pnpm evidence:export -- --stage V3.2 --promotion-request <PromotionRequest UUID>` now saves the owner-scoped persisted PromotionRequest/report/decision snapshot to `evidence/local/V3.2/<id>/`, with a SHA-256 manifest. It requires `STOCKQUANT_EVIDENCE_SESSION_COOKIE` and calls the existing session-checked V3.2 detail route; it checks the returned PromotionRequest and source TestRun binding, exact `registryMutation=NOT_PERFORMED` and `activation=DISABLED_UNTIL_MANDATE`, and refuses to overwrite an existing export. Existing TestRun exports also now require an explicit local session cookie instead of sending a hard-coded user identity header. Five pure CLI unit tests and a four-case owner-scoped HTTP/filesystem smoke are included in the V3.2 code suite. This is a preparation snapshot, not a formal V3.2 TestRun or its evidence export acceptance; the business/human result remains `NOT_RUN`. No actual owner promotion was exported during implementation. See [evidence export audit](../../../evidence/audits/2026-09-27-v32-evidence-export.md).

2026-10-01 Quant Research domain organization increment: pure candidate-registration, request/report validation, promotion decision/fingerprint and deterministic V3.2 fixture recomputation rules were moved into `services/quant-research-service/src/domain/`; compatibility entrypoints preserve existing imports. Quant build, 52 TypeScript unit tests, 13 Python worker tests, and isolated candidate/PromotionRequest/V3.2 validation integration passed. This source-organization change neither performs a V3.2 business TestRun nor changes its NOT_RUN acceptance, approval, Registry or activation status. Quant application/ports/adapters/bootstrap extraction remains open. See [Quant Research architecture](../../../architecture/services/quant-research-service.md).

2026-10-01 Quant candidate registration layering follow-up: candidate registration now passes through `CandidateRegistrationService` -> `CandidateRegistrationRepository` -> `PostgresCandidateRegistrationRepository`; `bootstrap/main.ts` routes the HTTP request and `src/main.ts` remains the entrypoint. Build/lint, 54 TS unit tests, isolated candidate/Promotion integration and service-auth HTTP smoke pass. The remaining PromotionRequest/report/decision flows still contain SQL in bootstrap; Qlib calls lack a typed application port. Quant's full five-layer migration remains open and is not counted as stage or W1 completion. See [Quant layer migration audit](../../../evidence/audits/2026-10-01-w1-quant-domain-extraction.md).

2026-10-02 Quant Qlib application boundary follow-up: probe, Fixture fit, summary train and validate now pass through `QlibResearchService` and the typed `QlibWorkerPort`/generated-client adapter; the bootstrap composes the adapter and HTTP routes use the application service. Build/lint and 57 TS unit tests pass; isolated service-auth HTTP smoke passes, and the locked Qlib Fixture linux/amd64 container smoke reproduces model/prediction hashes and rejects overlapping temporal splits. This verifies the Qlib Fixture component path only. PromotionRequest/report/decision SQL and DDL remain in bootstrap, so Quant layering, V3.2 business acceptance and human acceptance remain incomplete. See [Quant layer migration audit](../../../evidence/audits/2026-10-01-w1-quant-domain-extraction.md).

2026-10-02 Quant schema ownership follow-up: the five Quant-owned `CREATE TABLE IF NOT EXISTS` statements moved verbatim to adapter-side `initializeQuantResearchSchema`; bootstrap invokes the initializer. Quant build and 57 unit tests plus the isolated service-auth/PostgreSQL smoke pass. This preserves current schema behavior and is not a migration framework. PromotionRequest/report/decision queries remain in bootstrap; stage business status is unchanged. See [Quant layer migration audit](../../../evidence/audits/2026-10-01-w1-quant-domain-extraction.md).

2026-10-02 Quant PromotionRequest application/persistence slice: POST submission and plain ID read now use `PromotionRequestService` -> `PromotionRequestRepository` -> `PostgresPromotionRequestRepository`. Quant has 60 passing TypeScript unit tests and the complete V3.2 code suite exits 0, including isolated PostgreSQL concurrency/idempotency and validation/decision integrations. This does not execute the formal stage business workflow: the suite retains `businessValidation=NOT_RUN`, `humanAcceptance=NOT_RUN`, no active Registry mutation, and no external market/provider call. Validation-report/decision/detail/Registry SQL remains to be extracted. See [PromotionRequest layering audit](../../../evidence/audits/2026-10-02-w1-quant-promotion-request-layer.md).

2026-10-02 Quant validation-report application/persistence slice: validation-input read, immutable report submission/replay and report read now cross `ValidationReportService` and `ValidationReportRepository`; PostgreSQL row locking, request binding and transaction lifecycle moved to the adapter. Quant 62 TypeScript tests, 13 Python Worker tests and full V3.2 code suite pass. Decision/Registry/detail SQL remains; the suite explicitly keeps business and human acceptance `NOT_RUN`. See [validation-report layering audit](../../../evidence/audits/2026-10-02-w1-quant-validation-report-layer.md).

2026-10-02 Quant read-side layering: exact Registry version and aggregated PromotionRequest lifecycle detail now use `PromotionReadService` and PostgreSQL repository adapter. The full V3.2 code suite passes with zero active Registry changes; only decision persistence still uses PostgreSQL directly in Quant bootstrap. Business validation and human acceptance remain `NOT_RUN`. See [Promotion read audit](../../../evidence/audits/2026-10-02-w1-quant-promotion-read-layer.md).

2026-10-02 Quant five-layer boundary: decision write/approval now uses the application service and transaction port; PostgreSQL locks, decision persistence and exact disabled Registry row are atomic in the adapter. Quant bootstrap contains no PostgreSQL calls. The baseline scanner includes Quant, checks all five layers and rejects direct database calls in bootstrap; the negative regression test and scanner pass. Quant has 67 passing TS tests and 13 Python Worker tests; full V3.2 code suite exits 0. This closes Quant architectural layering only; formal V3.2 business validation and human acceptance remain `NOT_RUN`. See [Quant five-layer audit](../../../evidence/audits/2026-10-02-w1-quant-five-layer-boundary.md).

2026-10-02 W6/W9 current regression: the prior note that decision persistence remained in bootstrap was superseded by the five-layer extraction above. Full `pnpm verify:stage -- --stage V3.2 --suite code` was rerun and passed after a date-sensitive V2.3 artifact expiry integration test was made runtime-relative. Its container readiness TestRun remains `WAITING/READINESS_ONLY`, business validation and human acceptance remain `NOT_RUN`, and active Registry, Paper, market data and model/provider calls remain untouched. See [current Quant layering and V3.2 regression audit](../../../evidence/audits/2026-10-02-w6-quant-layering-v32-regression.md).

2026-10-03 Promotion preparation route regression: the platform-authenticated `/v1/promotions/prepare` route now validates its actual `{testRunId, experimentId}` UUID contract instead of incorrectly requiring a Runner Job schema. Research lint/build and 203/203 unit tests passed; the isolated V3.2 HTTP preparation/submission smoke passed, including extra-field and invalid-UUID rejection. This is integration engineering evidence only; formal V3.2 business validation and human acceptance remain `NOT_RUN`. See [W6 route-fix audit](../../../evidence/audits/2026-10-03-w6-promotion-prepare-route-fix.md), [machine report](../../../evidence/audits/2026-10-03-w6-promotion-prepare-route-fix.json), the source-hash list kept in the audit directory at that time, and [audit hashes](../../../evidence/audits/2026-10-03-w6-promotion-prepare-route-fix.sha256).

2026-10-03 Promotion preparation contract freeze: documented `POST /v1/promotions/prepare` in Research Automation OpenAPI with Platform Bearer identity, strict existing two-UUID command, typed `WAITING`/`READY_FOR_GATE_CHECK` response, and explicit 200/202/401/403/422/503 responses. Added a strict result JSON Schema, compatibility-matrix rule, executable schema assertions, and generated TS/Python contract types. `pnpm contracts:check` passed (153 schemas, 107 compatibility rules, 3 Research Promotion operations); Research Automation lint and 203/203 unit tests passed. This freezes the preparation endpoint contract only; it does not complete formal V3.2 business validation or human acceptance. See [W6 route-fix audit](../../../evidence/audits/2026-10-03-w6-promotion-prepare-route-fix.md), [machine report](../../../evidence/audits/2026-10-03-w6-promotion-prepare-route-fix.json), the source-hash list kept in the audit directory at that time, and [audit hashes](../../../evidence/audits/2026-10-03-w6-promotion-prepare-route-fix.sha256).

2026-10-03 Promotion preparation contract freeze后的完整回归：完整`pnpm verify:stage -- --stage V3.2 --suite code`退出0；contracts检查153 schemas/107规则，Research 203单测，Platform 166单测/5 PG集成，Promotion HTTP/PG smoke，Linux/amd64容器中的WAITING TestRun重启读取，Web typecheck/build/test均通过；另`pnpm test:e2e -- --stage V3.2` Chromium 5/5通过。TestRun `2faaad96-25f1-47ae-811b-051a9dc23df8`仍`WAITING/READINESS_ONLY/NOT_RUN`，活动服务未触碰，Paper调用0，活动Registry未变更。完整输出及限界见[W6契约回归审计](../../../evidence/audits/2026-10-03-w6-promotion-prepare-route-fix.md)、[机器结果](../../../evidence/audits/2026-10-03-w6-promotion-prepare-route-fix.json)、[套件日志](../../../evidence/audits/2026-10-03-w6-promotion-prepare-contract-suite.log)和[SHA-256](../../../evidence/audits/2026-10-03-w6-promotion-prepare-route-fix.sha256)。以上为工程/Fixture验证，不替代正式V3.2业务运行或人工验收。

2026-10-03 W6/V3.2当前code suite复验：完整套件PASS；隔离TestRun `b5b03f66-6c6b-437e-982a-200d83f06f71`在Platform重启后仍为同一`WAITING`记录，READINESS_ONLY/NOT_RUN，owner/匿名/跨owner为200/401/403；活动Registry/Paper/Provider/行情调用0。合成准备态不能替代已验收V3.1、真实候选复算或精确人工批准；V3.2继续NOT_RUN。见[W6审计](../../../evidence/audits/2026-10-03-w6-v32-current-suite-refresh.md)、[机器结果](../../../evidence/audits/2026-10-03-w6-v32-current-suite-refresh.json)及[SHA-256](../../../evidence/audits/2026-10-03-w6-v32-current-suite-refresh.sha256)。

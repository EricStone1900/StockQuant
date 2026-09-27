# P7.5 固定 Experiment→Runner→Artifact 全链路烟测

日期：2026-09-25（Asia/Shanghai）

## 范围与结果

新增显式 test-only HTTP smoke：隔离研究服务在随机PostgreSQL临时库启动后，创建V3.1 Experiment；固定模型响应（`v3.1-model-response-fixed-v1`）提供确定性Qlib代码；代码封装为Runner输入Artifact，经平台Artifact API发布并提交Runner Job；独立Runner Host以冻结镜像digest、网络DENY执行；生成的输出Artifact经API读取后逐字节SHA-256校验并解析研究指标；最后将Fixture模型费用结算到Experiment预算。

结果：PASS。TestRun `p7-5-6d339581-d539-4d38-9c8f-80d645f42a08`，Experiment `a660c3f1-63ca-4abd-8dd5-cbe771391735`，Runner Job状态`COMPLETED`。模型提供方为`FIXTURE`，外部模型调用数为0。Runner使用`sha256:8cd6db4ae88cab7a1fb485613a67fb15a4d4e08460c28deb81510c1fa1861dfb`；产出Artifact `output-049cfbc5c4196f5c14230c1a2c1ad87e-4de9e83ae7f378e5`，SHA-256 `4de9e83ae7f378e53240aceae825fe961c3a97ebb3aeaef3b7a12ce4ef1aaedf`。产出指标包含Fixture `v3.1-research-small-sample-1`、6根bar、Qlib `0.9.6.99`和固定return `0.12`。预算状态为`SETTLED`，实际Fixture用量23 cents。

测试脚本`services/research-automation-service/scripts/v31-fixed-pipeline-http-smoke.mjs`随机创建临时数据库和临时Artifact/Runner目录；退出前删除本次Experiment、Runner Job、预算和ArtifactRef精确记录，确认行数为0，再强制删除该随机数据库及临时目录。Runner网络为DENY，代码只读固定Fixture输入；没有真实模型凭证、Provider URL或券商访问。脚本输出中的动态ID/hash对应本次通过运行。

平台Bearer身份新增预算GET和POST settle两条精确路由授权，并增加身份单测；预算settle只能由已配置的平台服务身份调用。

## 验证命令

- `pnpm --dir services/research-automation-service model-gateway:fixture-http-smoke`：PASS；真实模型预检保持BLOCKED，固定provider外部调用0。
- `pnpm --dir services/research-automation-service v31:fixed-pipeline-http-smoke`：PASS；离线Runner容器完成、Artifact与费用状态校验通过。
- `pnpm verify:stage -- --stage V3.1 --suite code`：PASS；研究服务19文件/85单测及PostgreSQL 10/10，平台12文件/40单测，Web/平台类型检查通过；合同检查63 JSON、34 schemas、23 fixtures、23兼容规则通过。
- `pnpm docs:check`：580条本地Markdown链接通过（在V3.1阶段文档同步后重跑）；`git diff --check`：通过。
- 两项命令均在本机隔离验证端点执行。Test-only Gateway路径由`NODE_ENV=test`和`STOCKQUANT_MODEL_GATEWAY_TEST_FIXTURE=true`共同启用；生产模式不注册此Fixture路径。

## 平台同 TestRun 接线（2026-09-25）

V3.1验收平台新增`fixed-pipeline`场景，但只在`NODE_ENV=test`且`STOCKQUANT_V31_FIXED_PIPELINE_TEST=true`时出现在能力预览和场景列表。此路径创建100 cents固定测试Experiment、发起仅接收固定场景的模型Fixture调用、将固定Qlib代码打包为同TestRun输入Artifact、提交网络DENY Runner Job，并将已知23 cents模型Fixture费用结算到父Experiment。TestRun先保持`WAITING`；owner刷新时，平台读取最新Runner与预算状态并在终态保留证据。页面从同一TestRun读取输出Artifact并展示固定指标。生产模式即使错误设置测试环境变量，开关仍关闭。

新增`services/platform-api-service/scripts/v31-fixed-pipeline-web-http-smoke.mjs`，命令`pnpm --filter @stockquant/platform-api-service v31:fixed-pipeline-web-http-smoke`通过。实际TestRun `07640891-2407-4766-a2f0-f42dfb14ec20`，Experiment `66978095-8449-4d95-ae9e-0f0f96f1983c`，Runner Job `07640891-2407-4766-a2f0-f42dfb14ec20:66978095-8449-4d95-ae9e-0f0f96f1983c`。冻结Runner返回相同输出Artifact和SHA；平台按TestRun/owner读回Qlib版本`0.9.6.99`、6根bar和return `0.12`；相同用户成功，其他owner得到403；生产模式预览`fixedPipelineAvailable=false`，发起该场景得403。外部模型调用为0。脚本随机创建并清理平台与研究双临时PostgreSQL数据库、临时Artifact/Runner目录和精确测试记录。

V3.1浏览器合同测试`pnpm exec playwright test tests/e2e/v31-acceptance.spec.ts`在本地Vite下3/3通过；该用例含Mock API的固定Fixture展示合同。另有后续真实浏览器同TestRun验证，见下方补充。

## 尚未通过的验收

后续补充：已完成真实浏览器同TestRun验证，纠正前文“尚未浏览器直连”的状态。通过`pnpm --filter @stockquant/platform-api-service v31:fixed-pipeline-web-http-smoke`启动临时双数据库、Vite、平台、研究服务和Runner Host，Chromium从V3.1页面触发并刷新同一TestRun，读取输出metrics Artifact。TestRun `84848332-75c5-4053-9330-ba93328825ad`、Experiment `af05db16-e7b1-4fd6-8b5a-96b940b8b11a`完成，Runner `COMPLETED`，费用23 cents/`SETTLED`，Artifact SHA-256 `4de9e83ae7f378e53240aceae825fe961c3a97ebb3aeaef3b7a12ce4ef1aaedf`；跨owner 403，生产模式测试场景403，外部模型调用0。临时库和记录已按精确ID清理。

2026-09-27回归：同一命令在当前工作树再次退出0。TestRun `b1205560-6ca0-4d6c-b3d5-d292dae4a8dd`、Experiment `d1059910-dc4d-44e6-9327-fe199b6d134a`、Runner Job `b1205560-6ca0-4d6c-b3d5-d292dae4a8dd:d1059910-dc4d-44e6-9327-fe199b6d134a`均完成；浏览器恢复同一owner-scoped TestRun，读取Artifact SHA-256 `4de9e83ae7f378e53240aceae825fe961c3a97ebb3aeaef3b7a12ce4ef1aaedf`及固定6根bar/Qlib 0.9.6.99/return 0.12。23 cents已结算，无外部模型调用；跨owner 403，production fixed-pipeline preview为false且POST为403。运行结束退出0，随机临时数据库、精确测试记录及临时目录按脚本清理。此仅为Fixture开发路径回归，不是RD-Agent真实调用、V3.1正式/人工接受或Ubuntu验收。

随后将同一烟测扩展到关页恢复：V3.1页面把当前TestRun ID保存在该浏览器的`localStorage`。真实Chromium启动固定流水线后关闭页面，在同一浏览器上下文新开页面，恢复相同TestRun，再启动Runner Host并从页面轮询完成、读取输出。最后通过的TestRun `11f42001-3663-4a22-9139-afc3a9f4e59b`、Experiment `c8203e9b-03ae-45b6-9510-f8e3dfea24d3`，状态`COMPLETED`，23 cents/`SETTLED`；Qlib指标、Artifact SHA、跨owner 403和生产模式403均PASS。烟测清理双临时库、TestRun、Experiment、预算、Runner Job、ArtifactRefs和临时文件。

这只是固定代码与固定指标的工程贯通，不证明RD-Agent生成质量、真实模型、候选策略有效性或收益。固定流水线本地浏览器同run及关页恢复已通过；P7.5其余失败/超时/Runner恢复矩阵和用户接受尚未验证。真实Provider、费用账单对账、生产网络出口策略及Ubuntu原生运行仍是独立门禁。OD-009没有被本次Fixture运行授权或关闭。

## 固定 Runner 网络拒绝场景（2026-09-25）

新增命令 `pnpm --filter @stockquant/research-automation-service v31:fixed-pipeline-network-http-smoke`：以固定模型Fixture准备尝试连接保留测试网段 `192.0.2.1:443` 的Runner输入，Runner Job网络策略为 `DENY`、allowlist为空。隔离HTTP/PG smoke通过：TestRun `p7-5-ca03b4b1-77fb-4173-8cee-e982376f451c`、Experiment `ec40297b-d1e8-4928-bc28-22948b6cc8d7`，Runner持久状态`FAILED`、退出码1，无输出Artifact，终态前容器已移除；23 cents Fixture费用只结算一次，外部模型调用0。随机数据库、精确记录和临时目录由脚本清理。

此项证明冻结Runner在本地Docker `--network none`路径拒绝该连接，不验证生产出口代理、DNS/域名白名单、云网络策略或真实Provider外发策略。后续Market Data集成、P5.7订单恢复均为顺序执行；没有验证研究Runner故障期间并发Paper可用性或资源容量。

## 有界OOM期间并行核心服务检查（2026-09-25）

预先构建Runner Host后，并发启动128 MiB OOM smoke、`pnpm test:integration:market-data`及`node scripts/p5-7-outbox-http-smoke.mjs`（trade-execution服务目录）。三项均退出0。OOM TestRun `p7-5-6068a3b9-4626-47c1-9950-76db9ad0b806` 持久`FAILED`/247、无OUTPUT Artifact、容器移除、23 cents结算，外部模型调用0；Market Data PostgreSQL集成21/21通过；FakeBroker→Portfolio丢响应/重启/Outbox恢复通过，单Fill、2条账本行、现金`8997.9990`及UNKNOWN预留保持预期。

这是一次固定小样本的并发故障检查，覆盖单个研究OOM与两项本地隔离检查，不是服务压力、生产Paper连续性、采集调度时序或容量测试；P8.B及其统一故障恢复验收仍未关闭。

同一并发组合以网络拒绝场景再运行一次，三项仍均退出0。网络拒绝TestRun `p7-5-2dfbe703-2e84-44d5-a7ae-0a1d85b83e0b` 记录`FAILED`/exit 1、无OUTPUT、容器已清理及23 cents结算；Market Data集成21/21、FakeBroker→Portfolio恢复与精确账本断言通过。范围仍限于本地无网络Runner和单次固定回归场景。

## Runner Job 持久取消与活动容器终止（2026-09-25）

新增平台服务身份专属的 `POST /v1/runner/jobs/{jobId}/cancel`。PostgreSQL 状态机现在可将`QUEUED`或`RUNNING`原子置为`CANCELLED`、写`completed_at`、清租约且不伪造执行结果/Artifact；重复取消幂等，取消后旧Worker心跳与完成回写被拒绝。Runner Host下一次心跳发现租约丢失即中止Docker命令，容器Executor负责强制移除容器。Runner Host身份不能调用取消路由；已取消Job不可重试，保留本次尝试历史。

`pnpm --filter @stockquant/research-automation-service v31:fixed-pipeline-cancel-http-smoke` 使用固定Fixture、实际冻结容器内60秒睡眠程序及随机隔离PostgreSQL验证取消。最新TestRun `p7-5-6f6198e5-47a7-4529-9e5a-fa0c7478b457`：平台取消响应后Job持久`CANCELLED`，活动容器移除；随后模拟旧Worker以原fencing token迟到发布，HTTP返回409且文件系统无文件、PG无ArtifactRef；本轮输出Artifact为0，费用23 cents只结算一次，外部模型调用0。研究服务90/90单测、13/13专用PG集成、TypeScript lint/build通过。脚本在`finally`精确清理隔离Experiment、Job、预算和Artifact记录及临时资源。

此证据覆盖单一Runner的正常取消路径和取消/完成fencing。随后针对取消与输出发布的竞态补充了PG行锁事务验证（见下节）；这仍不是长时间压力或生产Host部署验收。

## Artifact 发布与取消的事务排序（2026-09-26）

Runner Host输出发布现由PostgreSQL事务锁定对应Runner Job行，事务内核验当前未过期租约、写入PUBLISHED ArtifactRef并将引用追加到Job记录；本地Artifact字节写入在事务期间完成，DB失败时清理未引用的临时文件。取消更新同一Job行，因此与发布有明确线性顺序：若取消先提交，发布事务不能取得活动租约且不会执行文件/引用持久化；若发布先持有锁，取消等待发布提交，并在CANCELLED Job记录中保留已发布Artifact引用，完成回写仍被拒绝。

`pg-v31-preparation`新增竞态及尝试保留断言：取消先发生后，发布回调未执行；发布先持有行锁时，取消等待且Job保留已发布引用；fence token 1已发布Artifact后由token 2接管并完成时，两次尝试的ArtifactRef均保留。完成状态不会覆盖此前fence的产物引用。专用PG集成13/13、研究服务单测90/90和TypeScript检查通过。新的真实冻结镜像正常HTTP smoke TestRun `p7-5-28a88d37-c59e-4f32-8710-b1e4e7e754b7`通过输出Artifact/Hash/指标回读；取消HTTP smoke TestRun `p7-5-6f6198e5-47a7-4529-9e5a-fa0c7478b457`另核实旧fence迟到发布返回409、无文件/引用。两者模型Fixture费用均为23 cents，外部模型调用0。

文件系统与数据库无法组成单一原生事务：若进程在DB事务提交后崩溃，可能短暂保留未被Job引用的PUBLISHED ArtifactRef/文件；它不会绕过Job行锁在取消后发布。本次验证不覆盖崩溃点清理/孤儿回收调度、生产长时压力或真实研究业务。

## Deterministic Runner-failure path (2026-09-25)

Added `pnpm --filter @stockquant/research-automation-service v31:fixed-pipeline-failure-http-smoke`. It uses the same random isolated PostgreSQL database, service process, Runner Host, frozen offline image, and deterministic model Fixture as the normal smoke, but stages fixed Python code that exits 17. TestRun `p7-5-9dfe731e-d578-4276-bd80-6865b1bc32ba` passed: RunnerJob persisted `FAILED` with exit code 17, zero output ArtifactRefs were published, and the known model Fixture charge settled exactly once at 23 cents; external calls remained zero. The script removes its exact rows and temporary resources in `finally`.

After this change, `pnpm verify:stage -- --stage V3.1 --suite code` exited 0: research-automation type/lint check, 88/88 unit tests, 10/10 PostgreSQL integration tests, platform API typecheck and 40/40 unit tests, Web typecheck, and contracts all passed. This adds one deterministic execution-failure case only; timeout, OOM, network-failure and full user acceptance remain separate gates.

The default success mode was rerun after adding the branch: `pnpm --filter @stockquant/research-automation-service v31:fixed-pipeline-http-smoke` exited 0 with TestRun `p7-5-562190e3-2714-4624-b30a-b6dd66cc2806`, Runner `COMPLETED`, verified output Artifact/metrics, and 23-cent Fixture settlement. Both modes report zero external model calls.

## Deterministic Runner-timeout path (2026-09-25)

Added `pnpm --filter @stockquant/research-automation-service v31:fixed-pipeline-timeout-http-smoke`. With the same random isolated PostgreSQL database, service, frozen offline image, and fixed model Fixture, the submitted Python code sleeps past a one-second Runner timeout. TestRun `p7-5-6b6150d0-f6d7-495f-8231-d8a2268a5550` passed: the durable job is `TIMED_OUT`, no OUTPUT Artifact is published, Docker inspection confirms the fenced container was removed before the terminal assertion, and the known 23-cent Fixture cost settles once. External model calls remain zero. The timeout result does not preserve diagnostic text from the terminated child, so assertions use the durable terminal state, output refs, and daemon container inventory instead.

This adds an end-to-end timeout case beside the existing deterministic exit-17 failure case. OOM, network failure, production-model behavior, and user acceptance remain unverified.

After adding the timeout mode, `pnpm verify:stage -- --stage V3.1 --suite code` exited 0: contracts 73 JSON/41 schemas/24 fixtures/30 compatibility rules, research automation 88/88 unit tests and 10/10 PostgreSQL integration tests, platform API 40/40 unit tests, and Web/platform type checks passed. The code suite does not change the V3.1 stage acceptance or authorize real model use.

## Bounded Runner OOM and post-fault availability (2026-09-25)

Added `pnpm --filter @stockquant/research-automation-service v31:fixed-pipeline-oom-http-smoke`. It runs the known unbounded allocator in a single no-network container limited to 128 MiB, using a random isolated PostgreSQL database and the fixed model Fixture. TestRun `p7-5-391de820-fb2f-4f25-85cb-71c3c2b06603` passed: the Runner job persisted `FAILED` with shell exit 247 (the same frozen-image OOM path is independently mapped to subprocess SIGKILL/-9 in the P7.3 smoke), no output Artifact was published, Docker inspection confirmed removal, and the 23-cent Fixture charge settled exactly once. External model calls remained zero.

Immediately after the OOM scenario, the isolated Market Data PostgreSQL integration passed 21/21 and the P5.7 FakeBroker→Portfolio HTTP recovery smoke passed: response loss, execution-service restart, durable Outbox retry, one Portfolio Fill, PARTIALLY_FILLED recovery, exact cash/fee ledger, and UNKNOWN reservation hold. A read-only Compose snapshot afterward reported Market Data, Trade Execution, Portfolio Risk, Research Automation, and all other running services healthy. These are post-fault checks, not concurrent order execution during OOM and not production-capacity evidence. Network-failure injection and full P8.B recovery acceptance remain open.

## Retry attempt persistence after Runner recovery (2026-09-26)

Extended the dedicated PostgreSQL fenced-output integration case through an explicit retry job. After fence token 1 expires, fence token 2 completes the original attempt with both output references preserved. `RunnerJobCoordinator.retry()` then creates exactly one `:retry-2` row, keeps `retryOf` pointing to the original job, survives duplicate retry submission idempotently, and remains queryable after completion alongside the original record and its artifacts. Integration tests passed 14/14. This verifies local attempt-row and Artifact history persistence; it does not close whole-service crash-point testing, automated retry policy, production workload recovery, or human P8.B acceptance.

## SIGKILL at the filesystem/PostgreSQL crash window (2026-09-26)

Added `pnpm --filter @stockquant/research-automation-service artifact:crash-recovery-smoke`, restricted in code to the dedicated `research_automation_test` database. A child Node process acquires a unique test job's fenced row lock, writes the output bytes under a random temporary Artifact volume, and receives SIGKILL before inserting the ArtifactRef. TestRun `crash-b92cfa3d81474fde8aea765b1a9bae48` passed: the parent observed child signal `SIGKILL`, no ArtifactRef, unchanged RUNNING job with empty references, and the read-only reconciler found the orphan at 59 bytes with SHA-256 `9a9df8244ac5a7962b11bc5a00eecf65f3140b4563e74ab6f61f08ea3fda8509`. The test row and temporary volume were cleaned in `finally`; external model calls and orders were zero. This is direct process-kill evidence for the filesystem-write/PG-commit gap. It does not test power loss, Docker daemon/host failure, active volumes, cross-volume backup restoration or production recovery policy.

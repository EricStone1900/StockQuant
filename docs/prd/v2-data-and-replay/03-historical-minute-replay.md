# V2.3 日频决策、分钟撮合与历史事件回放

2026-10-05 W4本地BaoStock数据归档核验：只读校验Git忽略的`data/local/baostock-daily-2019-2024-v1`，5,219/5,219文件、6,260,343行、逐文件SHA与行数全部匹配，CSV结构/证券代码/日期顺序和2019–2024范围通过。归档manifest没有数据license、授权引用或授权用途；当前源授权为NONE，故该数据尚不满足V2.3真实市场研究输入前置，没有送入Qlib。BaoStock Python客户端包BSD许可不证明其市场数据授权。工具、测试、机器结果及Hash见[W4归档完整性审计](../../../evidence/audits/2026-10-05-w4-baostock-archive-integrity.md)、[JSON](../../../evidence/audits/2026-10-05-w4-baostock-archive-integrity.json)、[测试日志](../../../evidence/audits/2026-10-05-w4-baostock-archive-audit-tests.log)、[SHA-256](../../../evidence/audits/2026-10-05-w4-baostock-archive-integrity.sha256)。该项仅验证归档完整性，不关闭真实数据/PIT、独立模型验证或人工验收。

2026-09-19 技术复核：平台回放切片已补齐确定性 `nextAvailableBar`、多窗口参与率部分成交及逐窗口 `LEDGER_COMMITTED` 屏障；对应单元测试已通过。跨服务真实来源与人工验收已按本页收口范围完成复核。

状态：PARTIALLY_IMPLEMENTED（历史回放/模拟撮合的2026-09-19人工确认保留；V2.3合成Fixture研究链路现已通过实际Qlib fit、owner-scoped持久TestRun、Web/CLI同Run和脱敏导出自动验收。新能力仍无授权真实市场输入/PIT，模型独立验证为`NOT_RUN`；Qlib Artifact字节已写入Platform与Research Automation共用的内容卷，Platform PostgreSQL保存owner/TestRun引用元数据并提供owner-scoped读取。真实市场数据/PIT及独立模型验证仍未完成，新增研究范围需用户验收）。版本入口：[README](./README.md)。共同约束：[三版规则](../05-three-version-delivery.md)。详见[Qlib训练就绪审计](../../../evidence/audits/2026-09-26-qlib-training-readiness.md)和[边界更正审计](../../../evidence/audits/2026-09-27-v23-qlib-boundary-correction.md)。

2026-10-21导入分钟回放门禁增量：新增`POST /api/v1/acceptance/v2/v2.3/runs/from-minute-import`及正式Web入口。入口在创建TestRun/Worker前调用Market Data回放就绪检查；只接受已发布V2.2版本，并要求三类不可变上下文在Hash、导入时间区间及证券范围上均有效，操作者声明研究用途和精确来源ID的`HISTORICAL_RESEARCH`配置均通过。缺项通过隔离Platform→Market Data→PostgreSQL→Chromium smoke得到422，Worker未触发。允许来源下的正向回放尚未执行；此切片只处理600000.SH最多120根Bar，研究摘要标记为USER_ARCHIVE，不能替代Qlib训练或独立模型验证。历史来源许可/用途仍按[OD-008](../../decisions/open-decisions.md)保持关闭，详见[C3历史上下文门禁审计](../../../evidence/audits/2026-10-21-v22-c3-history-context-gate.md)。

2026-09-27 工程进展：新增受限 `POST /v1/research/qlib/fit-fixture` 及 Worker 实际 Qlib 0.9.6 `LGBModel.fit/predict` 路由，使用 1 MiB 上限、固定 FIXTURE 模式与独立服务 Bearer；真实隔离 HTTP/PG 代理测试及无网络 amd64 Qlib 容器冒烟通过。当前只在确定性合成内存数据上证明模型调用和重复运行哈希一致，`modelValidation=NOT_RUN`、候选代码未执行、无市场数据来源/PIT证明、无持久业务 TestRun。V2.3 阶段状态仍为 `PARTIALLY_IMPLEMENTED`，必须按本阶段 Web/CLI/真实数据和人工验收门槛重新验证研究能力；历史回放人工记录不覆盖此新增研究子范围。详见[Qlib Fixture Fit endpoint 审计](../../../evidence/audits/2026-09-27-v23-qlib-fit-endpoint.md)。

2026-09-27 契约补齐切片：Historical Replay Worker 的单Bar/多Bar同步及异步提交、运行读取、暂停/继续/取消和UNKNOWN恢复入口新增JSON Schema、OpenAPI及兼容矩阵规则；运行时命令解析校验拒绝额外字段、无效UUID、非法场景/时间戳/价格精度及负成交量。Platform消费端HTTP client现由OpenAPI生成，已替换回放提交与状态/生命周期手写请求，并由`contracts:check`校验漂移；契约检查（89 Schema、75兼容规则、16 OpenAPI组）、Platform build/76单测、Worker build/17单测和完整V2.3 code suite均通过。跨所有者负向集成覆盖与其余契约盘点仍待完成；此次不代表新增Web/CLI端到端验收，V2.3研究子能力及人工验收状态不变。详见[Historical Replay契约审计](../../../evidence/audits/2026-09-27-p0-2-historical-replay-contract.md)。

2026-09-30 生成客户端增量：Historical Replay Worker的Portfolio账户初始化/快照改用`portfolio-account.v1`客户端，历史FakeBroker下单改用`trade-execution-historical.v1`客户端；响应类型捕获并修复因果屏障读取顶层订单状态的缺陷。worker构建及7文件20项单测通过，完整`pnpm verify:stage -- --stage V2.3 --suite code`退出0。证据：[Replay跨服务客户端审计](../../../evidence/audits/2026-09-30-v23-replay-portfolio-client.md)。该回归的Qlib输入仍是合成Fixture，不变更真实数据/PIT/人工阶段验收结论。

2026-09-30 W4锁版Qlib容器复验：专用`qlib:fit-smoke`在受控Docker Desktop执行，Qlib 0.9.6/LightGBM 4.7.0于120行合成Fixture上重复`LGBModel.fit/predict`，产出24个有限预测且模型/预测Hash一致；重叠切分返回422，临时`linux/amd64`镜像已清理。此为运行时工程准备，不是市场数据/PIT、独立模型验证、持久TestRun、Artifact、Ubuntu实机或阶段人工验收。详见[W4 Qlib Fixture烟测](../../../evidence/audits/2026-09-30-w4-qlib-fixture-smoke.md)。

2026-09-30 W4因果切分增量：Qlib Fixture Fit请求可提供逐行决策、特征可用与标签可用时间。Worker检查显式时区、决策时间严格递增、特征在决策时可用，且训练/验证标签在下一段首个决策前严格可用；同一时间戳因事件顺序不明而拒绝。缺时间元数据返回`temporalValidation=NOT_RUN`，Qlib模型验证仍`NOT_RUN`。请求/结果Schema与生成类型为加法变更；完整V2.3代码套件退出0，Qlib容器实测门禁PASS。此逻辑仅在显式FIXTURE输入路径验证，并未证明真实市场日历、PIT、股票池历史、存储Artifact或人工验收。详见[W4时间泄漏门禁审计](../../../evidence/audits/2026-09-30-w4-qlib-temporal-leakage-guard.md)及[Hash](../../../evidence/audits/2026-09-30-w4-qlib-temporal-leakage-guard.sha256)。

2026-10-01 W4 Qlib Fixture TestRun工程切片：Platform新增owner-scoped研究TestRun入口，写入持久阶段运行记录后，经生成的`quant-qlib.v1`客户端调用实际Qlib Fixture Fit，并由现有同Run读取API展示结果；Web验收页新增运行按钮。确定性120行合成样本的断言明确限定为24个有限预测、时间因果检查PASS、模型独立验证`NOT_RUN`、候选未执行、Artifact`NOT_IMPLEMENTED`及不作盈利声明。完整V2.3 code suite退出0；隔离Chromium→Platform→Quant Research→Qlib 0.9.6/LightGBM 4.7.0→PostgreSQL HTTP链通过，TestRun `e3c05763-aa11-4a6a-bf43-a63e525098a1` 的owner读取、foreign owner拒绝、Web展示、CLI同Run `--check-only`和脱敏证据导出均通过，前后数据库记录一致。证据Manifest SHA-256：`72c5e36ad9dbd4f593c22a003ab4198216f9d162a572878129765194ec996e54`；[同Run脱敏证据快照](../../../evidence/local/V2.3/e3c05763-aa11-4a6a-bf43-a63e525098a1/evidence.json)及[Hash Manifest](../../../evidence/local/V2.3/e3c05763-aa11-4a6a-bf43-a63e525098a1/manifest.sha256)；随机数据库、容器和进程已清理。此为工程自动验收，不是用户签署；来源授权、真实PIT及独立模型验证仍缺失，故V2.3状态继续`PARTIALLY_IMPLEMENTED`。详见[W4 Qlib Fixture TestRun审计](../../../evidence/audits/2026-10-01-w4-v23-qlib-fixture-testrun.md)。

2026-10-02 W4 Qlib 输入冻结：V2.3 Qlib Fixture TestRun 不再依靠代码即时生成训练样本，改为读取独立版本化的 `v2.3-qlib-fit-input-1`（120行合成数据，Manifest 文件 SHA-256 `1f99de3fb13b2cd0359a36bc2f202d2ed8359ea93d6b269a8845bc7b7e58c22e`），每次运行前校验字节Hash与维数/切分。平台162项单测、构建、Fixture校验和完整V2.3 code suite均退出0；隔离 Web→Platform→Quant→Qlib/PG、Chromium、同Run CLI只读及证据导出通过，Run `9cf9195d-2ed4-440b-bc2c-83403134fd4f`。详见[冻结输入审计](../../../evidence/audits/2026-10-02-w4-v23-frozen-qlib-fixture.md)。它是合成SIMULATION_ONLY输入，不构成真实市场数据、PIT、独立模型验证或人工签收；V2.3仍`PARTIALLY_IMPLEMENTED`。

2026-10-02 Qlib TestRun源码身份补验：Run evidence现记录精确工作区 `codeVersion=sha256:14a0ab307beac4a0ff0cadac7a78c463ca18d1b3fbc5ffe10529128fb7958a2c`（161个源码/测试/锁/合同/Fixture输入），并由隔离Harness断言；全V2.3 code suite及新Run `b5a6db53-e78d-4bf8-8151-d10fbf421e12`退出0，导出Manifest SHA-256 `ecc056fb3726e21999e21f607ae5b11c4aec3977b698b399854579eb467f7cfc`。上条无codeVersion的历史Run保留且不替代新证据。来源授权、真实数据/PIT、模型独立验证与人工签收仍未完成。详见[更新审计](../../../evidence/audits/2026-10-02-w4-v23-frozen-qlib-fixture.md)。

2026-10-02 W4 Qlib完整合成链复验：固定V2.3 `qlib-fixture` Web场景经Platform、Quant Research和linux/amd64 Qlib Worker执行，生成24条有限预测、Artifact SHA-256 `24864d22e4016e1419382e380aec504f02607004262696c92b76451cc1dbb6a8`；owner读取200、异主403，同TestRun CLI `--check-only`退出0且无写入，脱敏导出有TestRun和Artifact两个Manifest条目。TestRun `41b4e5b2-e865-4a5a-8cc2-acd11b2aedbe`，导出Manifest SHA-256 `d1bf43e322162055f4bc71f75b12f0ecc493322647716507849d074ef9402cea`。临时数据库/网络/镜像/内容目录均清理；数据为合成FIXTURE、外部来源0、FakeBroker、Mac ARM上的amd64仿真。独立模型验证、真实市场/PIT和人工新范围验收仍未完成。详见[本次W4 Qlib完整链审计](../../../evidence/audits/2026-10-02-w4-v23-qlib-fixture-rerun.md)。

2026-10-24 C4范围决定前的输入/缺口复核：V2.3继续`PARTIALLY_IMPLEMENTED`。现有锁版Qlib证据仅为`SIMULATION_ONLY`合成Fixture fit/predict；C3归档用途限一次FakeBroker回放，不适用于Qlib训练；大型BaoStock日线归档仅通过文件完整性核验，授权元数据及PIT质量不足。真实研究输入不满足；逐项证据见[C4输入/缺口审计](../../../evidence/audits/2026-10-24-v23-c4-input-gap-review.md)。该范围决定前快照由下方C4 Fixture验收记录更新。

2026-10-24 C4范围与验收更新：所有者选择并人工验收通过Fixture限定本地学习范围。锁版Qlib容器使用Manifest绑定的冻结合成输入，Artifact Hash校验及重新加载模型后的24条独立预测复算通过，详见[范围决定](../../decisions/2026-10-24-v23-c4-fixture-learning-scope.md)、[自动验收记录](../../../evidence/audits/2026-10-24-v23-c4-fixture-validation.md)和[人工签署](../../../evidence/audits/2026-10-24-v23-c4-fixture-human-acceptance.json)。该复算只证明推理可复现，API/TestRun的`modelValidation`仍为`NOT_RUN`；真实市场/PIT保持`NOT_RUN`，V2.3整体仍`PARTIALLY_IMPLEMENTED`。

## 1. 前置与范围

V2.2与V1.4通过；历史Clock、状态机、账本领域规则可复用。

本阶段所有订单、券商资产和成交均来自隔离模拟环境。真实业务数据库、Qlib或RD-Agent在声明“已验证”时必须真正执行；替身需独立标注。

## 2. 开发任务

- [x] 在量化服务计算Worker中建立完整HistoricalReplayRunner，编排服务只管理启动/取消/检查点。Worker 已提供多 Bar 决策→授权→执行→Fill→账本提交闭环、运行查询、暂停、恢复、取消和逐 Bar 取消屏障。
- [x] 历史执行Adapter归交易执行域；已接入交易执行服务、治理授权、FakeBroker 和组合账本，并支持显式参与率、买卖方向滑点、限价 DAY 不可成交过期、下一可用 Bar、多窗口部分成交及非法规则拒绝；3 Bar 跨服务验收已完成，长时容量仍由 V2.5 单独评估。
- [x] 已定义同时间事件排序、决策与成交可见边界和虚拟时钟推进屏障；每个 Bar 均等待当步订单、Fill 和账本提交完成，禁止以 sleep 猜测完成。
- [x] 已支持限价 DAY、下一可用 Bar、窗口成交、滑点、参与率、部分成交、过期和撤单；费用随历史有效规则，未知路径采用版本化保守模型。
- [x] 成交量作为模拟容量假设，不作为订单提交前可见信息；整 Bar OHLCV/amount 依赖 Bar 结束后的完整信息，窗口 VWAP 仅作为事后执行模型。
- [x] V2.3 TestRun、断言和证据已持久化；`historical-replay-worker` 在独立数据库保存游标/时钟/种子/待处理订单，并在进程重启后按同一运行键返回已持久结果；多 Bar 端点已逐 Bar 推进并验证检查点幂等恢复。独立 FakeBroker 服务按客户订单幂等持久订单/成交并写入隔离 BACKTEST 组合账本；治理授权、费用、取消、DAY 过期、UNKNOWN 标记、原订单查询、成交事务外盒、后台重试扫描、UNKNOWN 安全恢复及 `COMPENSATION_REQUIRED` Saga 状态机已实现，并完成真实账本故障注入与补偿演练。
- [x] Qlib Worker 提供仅接收显式 FIXTURE 的实际 `LGBModel.fit/predict` 工程入口，平台代理路由只允许平台服务身份；Worker 的 `/probe`、`/train`、`/validate`、`/qlib/fit-fixture` 全部要求独立 quant-research-service Bearer 和匹配身份。冻结Fixture容器重复训练确定性、Artifact Hash、重新加载模型后的24条测试预测独立复算（`rtol=0, atol=1e-12`）及坏切分拒绝已验证。该证据只证明合成数据上的工程路径和已保存模型推理可复现，不等于独立算法/模型质量验证、市场数据或阶段人工验收。详见[C4 Fixture验收记录](../../../evidence/audits/2026-10-24-v23-c4-fixture-validation.md)。

## 3. 同步 Web 开发

正式页：回放配置、日期进度、暂停/继续/取消、订单与Bar对照、日线/分钟报告比较。当前 V2.3 验收页已通过平台 API 代理提供 Worker 状态查询、暂停、恢复、取消按钮；验收页：逐步推进、事件顺序、成交容量与检查点恢复。

验收中心路径：`/acceptance/v2/v2.3`（目标路由）。场景参数提交到后端TestRun编排接口，后端调用业务API并汇集证据。浏览器不直接写领域数据，不自行判定成交。该阶段至少提供正常、拒绝/异常场景；适用时增加重试/恢复场景。

## 4. 人工验收步骤

1. 固定日线策略分别运行DAILY_BAR与MINUTE_BAR，保持初始账户/区间/成本一致并比较差异原因。
2. 检查收盘后信号次日才可执行；Bar结束前不可见完整Bar，现金在确认Fill后才变化。
3. 运行零量、缺Bar、限制价、部分成交、撤单等场景，订单结果与保守假设一致。
4. 同seed复跑；检查点处中断重启，对比不中断运行，规范业务事件/净值一致。

每次保存testRunId、场景版本、代码/镜像、数据/规则版本、种子及注入事件序列、实际/预期、截图/Trace。判定依据必须是后端事实和独立检查，不能只看Toast成功提示。

## 5. 异常与替身边界

无法获知涨停队列位置时不得保证触价即成交；原始日志时间/运行ID不参与业务结果相等比较；LLM不进入逐Bar循环。

## 6. 产物与验证

目标产物：ReplayManifest、HistoricalReplayRunner、历史执行Adapter、时钟/事件屏障/检查点、回放Web与比较报告。

自动验证：同Bar未来泄漏、订单因果顺序/参与率、领域规则一致性、检查点恢复、两次运行隔离及分钟回放Web E2E。

需求/测试追踪：QNT-08～10、EXE-03、POR、OPS恢复；T06/11/28～32；DV-04/06、VT04/06。

退出条件：开发任务完成、Web真实可操作、全部适用检查PASS、人工签署、已知限制写入证据。填写[本版验收表](./99-acceptance.md)，未完成项不得勾选通过。

## 7. 阶段交付待办（完成后勾选）

以下勾选只记录本阶段交付进度，不能代替第2节逐项开发任务或版本验收结论。开发者凭实现/实测证据勾选开发项；“人工验收”仅在用户实际确认后勾选，不预填PASS。

- [x] 契约、数据结构、场景定义和预期结果已冻结。
- [x] 第2节后端任务全部完成；独立 Worker、跨服务执行/账本闭环、事件序号/账本版本一致性和检查点重启恢复已验证。
- [x] 正式Web功能页及验收中心正常/异常场景完成。
- [x] 命令、实际URL、Fixture路径/Hash和配置说明已补齐，待实现占位已消除或明确列为范围外。
- [x] 开发者按第8节从准备到导出亲自执行，保存代码版本、退出码、截图/Trace和断言证据。
- [x] 重复/恢复及适用观察期验证完成，未覆盖项如实记录。
- [x] 历史人工验收记录已保留（2026-09-09）；用户已于 2026-09-19 对本页定义的完整跨域技术收口范围人工确认通过。
- [x] 操作说明与限制已更新，[本版验收表](./99-acceptance.md)已同步。
- [x] C4批准的Fixture本地学习范围已完成自动验收和项目所有者人工验收（2026-10-24）；签署仅覆盖该Fixture子范围，见[人工验收记录](../../../evidence/audits/2026-10-24-v23-c4-fixture-human-acceptance.json)。

2026-09-15 V2.3 生命周期切片：historical-replay-worker 新增受服务身份保护的运行查询、暂停、恢复、取消接口；多 Bar 推进在每个 Bar 前读取持久状态，暂停时不推进虚拟游标，取消时保留检查点并以 `CANCELLED` 终态收口。新增生命周期状态机单测（5/5），全仓 V2.3 code 套件通过；完整跨服务 Runner、历史执行模型和 Web 实际操作仍保持未完成。

2026-09-15 历史执行规则切片：交易执行域支持显式参与率、买卖方向滑点、限价 DAY 不可成交时的 `EXPIRED/LIMIT_NOT_MARKETABLE`，并拒绝非法参与率、滑点和订单规则；新增 3 个单元场景，交易执行服务单测 8/8、全仓 V2.3 code 套件通过。多窗口下一可用 Bar 编排、真实跨服务 E2E 和 Web 操作验收仍未完成。

2026-09-15 Web E2E 复验：启动 `pnpm dev:web` 后执行 `pnpm test:e2e -- --stage V2.3`，Playwright 场景“V2.3 replay page shows deterministic matching and recovery evidence”通过 1/1（退出码 0）。本次仅覆盖现有验收页和 Fixture API 断言，不能替代真实跨服务历史回放验收。

2026-09-15 Worker 生命周期实测：Docker 重建 Worker 后，8 Bar 任务暂停查询为 `PAUSED`，恢复后从持久检查点完成到 cursor=8；另一 20 Bar 任务取消后以 `replay was cancelled` 收口，未继续推进。生命周期 API 的跨服务实测通过。

2026-09-15 并发隔离实测：Docker Worker 同时运行 5 个隔离的 4 Bar 任务，5/5 完成到 cursor=4、每个任务 4 笔执行且账户 ID 独立。该结果覆盖小规模并发切片；长时容量压力和 Web 按钮驱动的实际暂停/恢复仍待补充。

2026-09-15 并发压力边界：初始 10×12 Bar 压力切片使组合服务连接/请求耗尽并全部 `fetch failed`；Worker 增加默认并发上限 2 后，4×4 Bar 排队回归 4/4 完成，组合服务保持 ready。长时容量上限仍需在 V2.5 专项验证。

2026-09-27 Qlib Worker身份收口：按用户确认的每服务独立Bearer，将身份门禁扩展至Worker全部HTTP操作（`/probe`、`/train`、`/validate`、`/qlib/fit-fixture`）；量化服务所有Worker调用和`/ready`探针携带专属token/service-id，Compose健康检查同步。服务单测39 TS+12 Python、随机隔离PG/HTTP集成、锁版Qlib 0.9.6 `LGBModel.fit/predict`容器冒烟均通过；完整`pnpm verify:stage -- --stage V2.3 --suite code`退出0。此次只证明合成FIXTURE工程路径和身份边界；未部署活动容器，生产密钥仍需由未跟踪配置提供，V2.3研究业务验证、原生Ubuntu与当前用户验收仍待完成。详见[Qlib Worker身份审计](../../../evidence/audits/2026-09-27-v23-qlib-worker-auth.md)。

2026-09-30 W3/W4隔离复验：完整`pnpm verify:stage -- --stage V2.3 --suite code`在受控本机回环环境退出0；合同/Fixture检查、全仓构建/lint/typecheck/test、Portfolio/Trade/Market Data隔离PG/HTTP集成、Python Adapter 61项及Ops脚本测试通过；Qlib Worker实际`LGBModel.fit/predict`Fixture容器复跑生成相同模型与预测Hash并拒绝重叠切分。同期修正授权HTTP Smoke：同一命令的并发消费允许一次首次消费和一次带`replayed=true`的安全幂等重试，数据库授权最终为`CONSUMED`。这些仍是Fixture/隔离工程证据；没有真实来源授权、市场数据Qlib TestRun、独立模型验证或当前范围人工验收。

## 8. 阶段验收操作手册

### 8.0 C4 Fixture本地学习子范围

项目根目录执行：

```bash
pnpm --filter @stockquant/quant-research-service qlib:fit-smoke
```

需要Docker Desktop；脚本在无网络、限额的临时`linux/amd64`容器执行，并删除临时镜像。固定输入为`fixtures/v2/v2.3/qlib-fit/qlib-fit-input.json`，预期Manifest SHA-256为`1f99de3fb13b2cd0359a36bc2f202d2ed8359ea93d6b269a8845bc7b7e58c22e`。成功输出`status=PASS`、Qlib 0.9.6、24条测试预测、Artifact哈希、独立重算PASS及相同预测Hash；重叠切分应HTTP 422。详细结果与边界见[C4验收记录](../../../evidence/audits/2026-10-24-v23-c4-fixture-validation.md)及[用户人工签署](../../../evidence/audits/2026-10-24-v23-c4-fixture-human-acceptance.json)。人工签署已完成，只覆盖此Fixture范围；此项不更新API的`modelValidation`，真实研究用途保持`NOT_RUN`。

### 8.1 当前可执行性与验收准备

手册状态：VERIFIED_EXECUTABLE（自动检查已实现；用户人工验收已于 2026-09-19 确认通过）。

前置服务：V2.2数据、量化ReplayRunner、历史执行Adapter、组合/治理/执行、运行Clock与检查点存储。

固定输入：同一策略/日线信号、固定5～10日分钟样本、初始资金10000、限价DAY/参与率/成本模型，seed=20260907。

| 开发交付时必须填写 | 当前值 |
|---|---|
| 实测代码Commit或工作区Hash/验证日期 | `1a461092b6afe8a9060be07d31e4b772fae2b664` 基线 + 本次复核修复，2026-09-11 |
| 项目根目录、Node/pnpm/Python/uv及Docker版本 | `/Users/huangbosong/Documents/ChatGPT/StockQuant`；Node `v24.1.0`；pnpm `10.34.5`；Docker `28.0.4`；Compose `v2.34.0-desktop.1` |
| Web基础URL/身份登录或会话建立方式 | `http://127.0.0.1:8080`；本地验收身份 `acceptance-owner-1`；不记录密码/token |
| 本阶段Web路由 | `/acceptance/v2/v2.3`（目标） |
| 正式页面的真实入口/跳转链接 | `http://127.0.0.1:8080/acceptance/v2/v2.3` |
| Fixture文件/数据版本/确切日期/Hash、规则与成本版本 | `fixtures/v2/v2.3/replay_bars.csv`；`v2.3-replay-bars-1`；SHA-256 `778daf9e202b3522472a1ebe3d6a1f1e70c27ddde769df585a31ca9d5310dbf4`；参与率10%、滑点10bps |
| 配置文件及必需环境变量名/非秘密测试值 | `infra/compose/docker-compose.yml`；`STOCKQUANT_BROKER_MODE=FAKE`、`STOCKQUANT_LIVE_TRADING_ENABLED=false`、`STOCKQUANT_LOCAL_DEVELOPMENT_USER=acceptance-owner-1`；无真实凭证 |
| 外部故障目标及可执行命令、恢复/隔离清理入口 | recovery 使用 `historical-replay-worker` 检查点/重启；旧运行和数据库卷保留，不删除共享卷 |
| 预期耗时、轮询超时、实际观察期/预算 | 单场景通常 <60 秒；服务健康轮询 20×5 秒；本阶段无真实模型调用和观察期预算 |

### 8.2 初始化与启动（已验证命令）

在上表填写的项目根目录运行；工具版本按锁文件/项目说明准备。首次开发由开发者生成锁文件和脚本，验收者不负责补建环境。环境变量按上表配置；保持FAKE券商与模拟账户，真实模型仅在本阶段明确要求且预算已配置的场景调用。

```bash
# 终端A：先确认实际执行目录为项目根目录
pwd
pnpm install --frozen-lockfile
pnpm stack:up -- --stage V2.3

# 终端B：同一项目根目录，保持开发服务器运行
pnpm dev:web
```

预期：安装与stack入口退出0；stack输出本阶段服务、端口、健康/迁移及持久卷状态。依赖不可用应非零并说明原因；不能删除旧业务卷重试。Web服务器持续运行并输出基础URL，尚在运行不要求退出码0。若已使用容器化Web，则填写已验证入口并避免重复占用端口。Ubuntu部署必须补齐实际镜像拉取/启动/迁移命令，不能仅用dev:web代替发布验证。

初始化在验收中心“准备隔离运行”完成；CLI场景入口也负责同样的准备，两者调用同一业务API。准备后记录testRunId、accountId、namespace及Fixture/DataVersion；初始化业务本身是测试对象时不得预先完成被测动作。缺源/凭证/历史数据时显示缺项，不静默换成Fake并报真实场景通过。

### 8.3 Web逐步操作及预期结果

1. 登录上表实际Web地址，进入“开发验收中心→V2→V2.3”；检查页面版本、模拟模式、服务能力与固定输入。
2. 每个场景点击“准备隔离运行”，核对参数后记下testRunId；正常/异常/恢复使用独立运行，场景内部的重复或恢复操作继续使用原运行及业务幂等键。
3. 按下表执行。操作按钮为目标交互，交付时开发者必须换成实际页面名称/按钮及路由；预期必须从业务明细读取，不能只看“任务完成”。

| 场景ID（阶段内唯一） | 场景 | 点击顺序/输入 | 预期结果与核对点 |
|---|---|---|---|
| normal | 分钟事件回放 | 选MINUTE_BAR→确认固定输入→启动→暂停并逐步推进一个交易时刻→查看订单/Bar/账本；与DAILY_BAR对比。 | 完整Bar结束前不可见；成交/量约束按已标假设；本步入账完成再推进；报告解释模型差异。 |
| rejection | 不可成交与未来信息 | 运行零量、缺Bar、限制价、窗口VWAP提前引用子场景。 | 不强迫触价即成交、不使用未来量价；缺失明确拒绝/未成交，原因可追溯。 |
| recovery | 检查点一致性 | 保存检查点并中断Worker→按同run恢复；与不中断参考运行对比，再同时启动不同历史日期的运行。 | 规范事件/净值一致，无重复Fill；两运行虚拟时间、账户和缓存不串扰。 |

4. 从运行详情打开关联正式页面，执行一次刷新/关闭再打开；核对长任务后台状态、历史证据和加载/失败/陈旧提示。
5. 每项记录实际结果、截图与业务ID。异常场景“预期拒绝”被正确验证时断言可PASS，但被测业务操作仍显示拒绝；若意外接受则断言FAIL。

### 8.4 命令行复验与相同运行核对（已实现）

在项目根目录执行以下已实现命令。stage/scenario必须匹配8.3定义；CLI与Web共用场景版本、Fixture和断言。每条命令执行后立即查看退出码，任何非零先保存错误再定位，不能继续假定本阶段通过。

```bash
pnpm verify:stage -- --stage V2.3 --scenario normal --seed 20260907
# 紧接上一命令执行；0表示全部场景断言通过
 echo $?
pnpm verify:stage -- --stage V2.3 --scenario rejection --seed 20260907
 echo $?
pnpm verify:stage -- --stage V2.3 --scenario recovery --seed 20260907
 echo $?
pnpm verify:stage -- --stage V2.3 --suite code
 echo $?
pnpm test:e2e -- --stage V2.3
 echo $?
```

预期：各场景输出testRunId、实际数据/模型/券商模式、断言expected/actual及证据位置；预期内拒绝场景验证成功退出0，意外副作用/缺脚本/缺必需依赖/未满观察条件非零。恢复场景需外部动作时输出已核实目标和步骤，停留WAITING；完成动作后复验原run，不伪称Web可重启宿主。浏览器测试必须实际运行本阶段用例，零用例/全跳过不能退出0。

再对Web中已运行的同一testRunId执行只读核对，避免仅创建新样本掩盖页面问题：

```bash
# 粘贴Web运行详情中的实际testRunId，再按回车；这是普通ID，不是凭证
read -r acceptance_run_id
pnpm verify:stage -- --stage V2.3 --run "$acceptance_run_id" --check-only
 echo $?
pnpm evidence:export -- --stage V2.3 --run "$acceptance_run_id"
 echo $?
```

check-only仅查询此运行后端事实并追加检查证据，不创建新订单、不重放成交或发起模型调用；空ID/错误stage/越权run必须拒绝。导出只含脱敏数据，输出实际目录和Manifest Hash，不自动勾选人工验收。端到端正常/异常/恢复运行产生不同ID，导出时分别保存。

本阶段代码测试覆盖要求：同Bar未来泄漏、订单因果顺序/参与率、领域规则一致性、检查点恢复、两次运行隔离及分钟回放Web E2E。 在交付时把映射到的实际Domain/DB/契约/服务内测试命令补入本节，注明执行目录、测试文件或套件、退出码和报告；verify:stage必须展示实际调用的测试清单，不能空壳返回0。Python服务使用自身锁定环境，不串用其他服务虚拟环境。

2026-09-19 V2.3 完整闭环：平台回放引擎与 Worker 均强制检查 `FILL→LEDGER_COMMITTED` 屏障；Worker 每个 Bar 持久化事件序号、账本版本、虚拟时间和游标，并在重启时校验累计执行/事件日志一致后从最后已提交屏障继续。Web 生命周期按钮通过平台代理调用真实暂停/恢复/取消接口；新增完成态转换拒绝的浏览器断言。
2026-09-19 V2.3 收口复验：正式平台验收已切换至 3 Bar 跨服务回放，`testRunId=4db177da-6f2f-46c1-adb5-8e75f7a33309`，3/3 Fill、3/3 `LEDGER_COMMITTED`，checkpoint `cursor=3,eventSequence=15,ledgerVersion=4`；长任务 Web E2E 实测暂停为 `PAUSED`、恢复后 `COMPLETED`。证据导出目录 `evidence/local/V2.3/4db177da-6f2f-46c1-adb5-8e75f7a33309`，Manifest Hash `54aba03f4885e63bcf4e154350e82acda01fd886b6644d66644be341bd778036`。

2026-09-19 V2.3 人工验收复核：按执行顺序重新完成 normal `ca0678f9-7c24-4f99-ad58-59054dfac2f9`、rejection `79f5af32-9ede-492d-94b2-3a554394a06f`、recovery `5a98fffc-50f4-4fb7-a90c-3a44ce9542b0`；三场景均 `COMPLETED` 且断言全 PASS，recovery 对比无重复 Fill。Web E2E 2/2 通过；完整 code suite、同 run `--check-only` 和证据导出均退出 0。normal 证据目录 `evidence/local/V2.3/ca0678f9-7c24-4f99-ad58-59054dfac2f9`，Manifest Hash `f8329e91ea592a90cf8db8cc5b0228883383425262fa7b7eb0e6cf8ff61c772e`。用户已人工确认本收口范围通过。

2026-09-27 研究边界复核：检查版本库提交`bfc7732`中的量化Worker源码以及只读活动Qlib容器后确认，`/train`从未调用Qlib模型API，而是计算open均值；`/validate`以相同统计重复计算摘要Hash。旧`/probe`只导入`qlib`，活动容器缺`libgomp.so.1`导致真实LightGBM模型类导入失败。修正后的接口把该研究结果明示为`adapter=fixture-summary`、`modelTraining=NOT_RUN`，哈希一致性仅标为Fixture summary复算；V2.3回放仍可独立完成模拟撮合，但阶段整体回到`PARTIALLY_IMPLEMENTED`，直到真实Qlib训练/独立验证完成。此前历史用户签署记录保留，不把旧自动断言继续表述成Qlib证据。Worker边界HTTP测试3/3、完整`pnpm verify:stage -- --stage V2.3 --suite code`退出0；历史normal/rejection/recovery Web验收记录保留，但研究子能力Web/CLI重验尚未执行。证据：[V2.3 Qlib边界更正审计](../../../evidence/audits/2026-09-27-v23-qlib-boundary-correction.md)。活动容器未更新。

2026-09-27 后续验证：`verify:stage --stage V2.3 --suite code`现额外执行`pnpm --filter @stockquant/quant-research-service qlib:fit-smoke`，其它V2阶段不运行该重型镜像构建。完整V2.3 code suite退出0，包含全仓构建/lint/typecheck/unit、服务集成与PostgreSQL、Market Data 22项集成及Qlib容器冒烟。真实Qlib 0.9.6 `LGBModel.fit/predict`在120行确定性合成数据上使用72/24/24拆分，24个有限预测；相同输入重复拟合得到一致模型/预测SHA-256。运行于Mac Apple Silicon上的Linux/amd64仿真容器，脚本清理临时镜像。该结果只证明锁定容器内Qlib训练API可运行；不是市场数据或生产`/train`证据，独立模型验证仍`NOT_RUN`，阶段保持`PARTIALLY_IMPLEMENTED`。详见边界更正审计。

### 8.5 交叉核对、失败定位与恢复

交叉核对：游标/虚拟时间/事件序号、订单/Fill/账本版本及净值与不中断参考对照；检查点恢复不是新建运行重头再算。

先检查Web与CLI的testRunId、输入/策略/代码版本和模式是否一致，再按Trace查平台、领域、适配器与持久化证据。页面错误而CLI正确，记录Web失败；二者都错则保留领域断言失败。缺能力先查健康/迁移/数据与日志，不修改余额或订单状态使断言通过。

独立复跑创建新run；测试幂等/检查点/重启恢复则使用原run和原幂等键。故障发生后保留旧证据，修复后新增运行或检查记录；不得清空账本、随机更换seed直到通过。真实观察窗口、来源验证和实际模型调用与加速/录制测试分别记录。

### 8.6 验收记录与收尾

| 场景/检查 | Web实际结果与截图 | 命令/退出码/报告 | testRunId/业务ID | 结论 |
|---|---|---|---|---|
| normal | Web 页面与 API 复验通过 | `pnpm verify:stage -- --stage V2.3 --scenario normal --seed 20260907`，退出码 0 | `ca0678f9-7c24-4f99-ad58-59054dfac2f9` | PASS |
| rejection（含全部子场景） | Web 页面与 API 复验通过 | `pnpm verify:stage -- --stage V2.3 --scenario rejection --seed 20260907`，退出码 0；FUTURE_DATA/ZERO_VOLUME/MISSING_BAR，无 Fill | `79f5af32-9ede-492d-94b2-3a554394a06f` | PASS |
| recovery（含实际外部动作） | Web 页面与 API 复验通过 | `pnpm verify:stage -- --stage V2.3 --scenario recovery --seed 20260907`，退出码 0；检查点恢复无重复 Fill | `5a98fffc-50f4-4fb7-a90c-3a44ce9542b0` | PASS |
| Web同run只读核对与证据导出 | Web E2E 2/2 通过；V2.3 同run GET 通过 | `--check-only` 与 `pnpm evidence:export`，均退出码 0；Manifest `f8329e91ea592a90cf8db8cc5b0228883383425262fa7b7eb0e6cf8ff61c772e` | `ca0678f9-7c24-4f99-ad58-59054dfac2f9`；`evidence/local/V2.3/ca0678f9-7c24-4f99-ad58-59054dfac2f9` | PASS |
| 本阶段代码测试/实际观察适用项 | 构建、类型、单元、契约、Fixture、运维和 market-data 集成检查通过；本轮完整 code suite 重新通过，DC-08A 运行态未改变 | `pnpm verify:stage -- --stage V2.3 --suite code`，退出码 0；`pnpm dc08a:supervise -- --check-only`历史只读记录，退出码 0 | 代码与身份增量见[Qlib Worker身份审计](../../../evidence/audits/2026-09-27-v23-qlib-worker-auth.md)；既有运行态订阅 `dc08a-20260917-20-v1` | PASS |
| 用户人工验收 | 用户明确确认本页收口范围通过；完整复核一致 | 不由脚本代签 | 本会话确认 / 2026-09-19 | PASS |

记录不适用子项的范围依据，不能将必需项改为不适用绕过门禁。归档后在[本版验收表](./99-acceptance.md)填写证据链接和结论。清理只针对本轮已结束的隔离运行，默认保留证据；停止测试不能删除数据库卷或取消无关任务。


2026-10-01 W4 Qlib Artifact 持久化增量：Worker现返回有界模型文件（base64）及测试集预测向量/canonical JSON；Platform校验模型SHA-256、预测SHA-256/数量/有限值后，将规范化产物写入独立不可变`qlib_fixture_artifacts` PostgreSQL表，并把ArtifactRef绑定同一owner/TestRun。新增owner-scoped GET与Web下载链接。隔离HTTP/Chromium全链验证成功，TestRun `8eeabdd5-45e7-44cb-9223-fb4a0069ca9d`，Artifact SHA-256 `24864d22e4016e1419382e380aec504f02607004262696c92b76451cc1dbb6a8`；持久读取HTTP 200、foreign owner 403，CLI check-only及证据导出前后Artifact数据库字节/JSON不变，随机PG/容器/镜像均清理。此Artifact只包含合成Fixture模型与预测，不是授权市场数据、独立模型验证、Qlib完整追踪库或盈利证据；新增能力仍需真实输入与人工验收。完整记录见[Qlib Artifact持久化审计](../../../evidence/audits/2026-10-01-w4-v23-qlib-artifact-persistence.md)。

2026-10-01 W1 公共ArtifactRef接入：V2.3 owner-scoped TestRun GET将持久Qlib模型/预测引用投影为`artifact-ref.v1`（TestRun、owner、namespace、mediaType、PUBLISHED及SHA-256）；离线Exporter逐项核对其与Qlib专用ArtifactRef后才读取并写入双条目Manifest。`pnpm verify:stage -- --stage V2.3 --suite code`全套退出0；最新隔离TestRun `b76c1252-e585-4be9-9c8e-6e96f6e197e4`导出Manifest Hash `9c29acac92584991277707a35c4f594b5b885f9c20b7d2cdad2031d467e50835`，包含TestRun JSON与Qlib Artifact。FakeBroker/FIXTURE，用户签署和独立验证仍NOT_RUN。公共schema及V3.1/V2.3投影的详细记录见[W1 ArtifactRef审计](../../../evidence/audits/2026-10-01-w1-v31-artifact-evidence-export.md)及[Hash](../../../evidence/audits/2026-10-01-w1-v31-artifact-evidence-export.sha256)。


最新 W4 验收证据引用：最新TestRun `bf32f747-0339-40f6-bb53-37a4401fa1bf` 的脱敏导出位于[证据JSON](../../../evidence/local/V2.3/bf32f747-0339-40f6-bb53-37a4401fa1bf/evidence.json)，包含[模型与预测Artifact](../../../evidence/local/V2.3/bf32f747-0339-40f6-bb53-37a4401fa1bf/qlib-fixture-artifact.json)；两文件的[SHA-256 Manifest](../../../evidence/local/V2.3/bf32f747-0339-40f6-bb53-37a4401fa1bf/manifest.sha256)自身哈希为`c9edc81524861023f954fe337d4d526894bf5653c705a3ad10014e6709b7d406`。本地导出目录按仓库忽略规则排除，但由版本证据校验器直接验证该目录相对路径与Manifest载荷。

2026-10-01 W4研究数据Manifest授权门禁：当前13份仓库Fixture Manifest均为`FIXTURE/SYNTHETIC`，`evidence/`未发现本地冻结真实行情文件。Fixture Manifest现要求`RECORDED/REAL`来源必须记录仓库内授权证据路径`authorizationRef`及其`authorizationSha256`、明确的`RESEARCH`/`SIMULATION`授权用途和采集时间；禁止合成数据声明为生产适用。7项授权边界回归随`contracts:check`自动执行，当前合同与Fixture检查通过。此Schema检查不授予来源授权；用户未授权市场源，W4真实Qlib/PIT仍NOT_RUN。详情见[W4数据授权门禁审计](../../../evidence/audits/2026-10-01-w4-fixture-authorization-gate.md)及[SHA-256](../../../evidence/audits/2026-10-01-w4-fixture-authorization-gate.sha256)。

V2.3 Artifact persistence boundary update (2026-10-01): the Qlib Fixture Artifact repository is now typed behind a Platform application port, with the existing PostgreSQL implementation injected by bootstrap. The full isolated V2.3 code suite verified persisted owner-scoped Artifact read and export. This does not implement the shared Artifact lifecycle or real-market research; see [W1 port audit](../../../evidence/audits/2026-10-01-w1-platform-qlib-artifact-port.md).

2026-10-01 W1 Qlib Artifact lifecycle increment: Platform PostgreSQL now stores PUBLISHED/RETAINED/EXPIRED plus optional immutable `expires_at`; legacy Artifacts remain PUBLISHED with no assumed deadline. The owner/TestRun projection reads persisted status, and EXPIRED content cannot be downloaded or republished. Dedicated PostgreSQL integration passed for migration, retention, early-expiry rejection, elapsed expiry, audit projection, and no revival. No expiry is assigned by default because a retention policy is not approved. This lifecycle is Qlib-specific and does not yet replace all per-service Artifact storage. See [lifecycle audit](../../../evidence/audits/2026-10-01-w1-v23-qlib-artifact-lifecycle.md) and [SHA-256](../../../evidence/audits/2026-10-01-w1-v23-qlib-artifact-lifecycle.sha256).

2026-10-01 W1 shared content backend increment: newly produced Qlib model/prediction bytes are written to the common immutable filesystem content layer on `research-artifacts-v1`; PostgreSQL keeps the Qlib-specific owner/TestRun reference and lifecycle record, not duplicate content bytes. Existing JSONB Artifact rows and Research legacy file paths remain read-compatible and SHA-256 checked. Source Compose mounts the same named volume into Platform API and Research Automation. Isolated Qlib Worker → Platform/PostgreSQL/content-store → Web/CLI/export end-to-end smoke passed without touching active services. This does not yet unify metadata lifecycle/retention scheduling or prove simultaneous deployed multi-producer operation. See [W1 shared content audit](../../../evidence/audits/2026-10-01-w1-common-artifact-content-store.md) and [SHA-256](../../../evidence/audits/2026-10-01-w1-common-artifact-content-store.sha256).

2026-10-01 W1 legacy Qlib JSONB backfill: bounded dry-run/apply migration now validates artifact/hash identity, writes and reads back isolated shared content before compare-and-set clearing PostgreSQL payload, and can safely rerun. Dedicated `platform_api_test` integration passed dry-run, JSONB clearing, continued owner-scoped retrieval, and idempotent rerun; full V2.3 code suite and TestRun export passed. This proves only isolated Fixture-backed migration behavior; production migration, active volume/API cutover, independent market-data research validation, and new user acceptance remain open. See [backfill audit](../../../evidence/audits/2026-10-01-w1-qlib-legacy-jsonb-backfill.md). Its SHA-256 manifest is retained as a point-in-time historical record; current V2 evidence is checked against the newer stage-specific manifests.

2026-10-01 Historical Replay Worker分层收口：回放协调用例现位于application，经Repository与Portfolio/Trade/Governance/Quant ports注入；PostgreSQL DDL、状态、锁、检查点与结果SQL封装在adapter；平台HTTP、身份配置、服务监听与生成客户端装配位于bootstrap，`src/main.ts`保留稳定启动入口。Worker build、9文件/24单测、层扫描及完整V2.3 code suite通过，服务身份HTTP smoke亦通过，并以隔离PostgreSQL验证持久化运行读取不泄露requestHash。该重构不改变订单/组合所有权或恢复语义；未执行V2.3真实阶段场景/人工确认，阶段继续PARTIALLY_IMPLEMENTED。详见[Historical Replay分层审计](../../../evidence/audits/2026-10-01-w1-historical-replay-layer-boundary.md)。

2026-10-02 W4缺少时间元数据状态保护：新增Qlib Fixture输入回归，确认完全省略逐样本decision/feature/label可用时间时，Fixture fit可执行但独立时间因果验证明确返回`NOT_RUN`；若显式提供空数组则按缺少逐行记录拒绝。锁定Market Data项目Python环境的标准库测试6/6通过；pytest入口在该锁定环境不可用，失败保留并改由unittest执行。此测试只保护合成Fixture的状态语义，不证明真实PIT/可用时间。详见[时间元数据回归审计](../../../evidence/audits/2026-10-02-w4-qlib-temporal-metadata-not-run.md)及[SHA-256](../../../evidence/audits/2026-10-02-w4-qlib-temporal-metadata-not-run.sha256)。

2026-10-03 W4 V2.3 codeVersion覆盖共享Artifact内核：复核发现旧Qlib TestRun工作区指纹遗漏`packages/artifact-content-store/index.mjs`及其测试；现已将两者纳入163文件workspaceInputs，并以最新完整`pnpm verify:stage -- --stage V2.3 --suite code`退出0复验。Run `0e71363c-4b35-4098-a5ea-432982a3df92`记录codeVersion `sha256:798a1cad0ff0f1548b813b0ef85ca94d6ead45a443695f6a5c31523ff9c9f4ed`，独立复算完全一致；Qlib 0.9.6/LightGBM 4.7.0产生24个有限预测，时间因果PASS，共享持久Artifact owner读200/异主403、同Run CLI check-only 0且无写入、双条目导出通过。FIXTURE/FakeBroker、独立验证NOT_RUN、候选未执行、外部来源0；Linux/amd64在Apple Silicon仿真。此前未含Artifact实现Hash的历史TestRun保留，不作为当前代码身份覆盖证据。审计：[W4审计说明](../../../evidence/audits/2026-10-03-w4-v23-artifact-codeversion-binding.md)、[JSON](../../../evidence/audits/2026-10-03-w4-v23-artifact-codeversion-binding.json)、[完整suite日志](../../../evidence/audits/2026-10-03-w4-v23-artifact-codeversion-binding.log)、163项源码Manifest为该次TestRun的历史点时清单（`evidence/audits/2026-10-03-w4-v23-artifact-codeversion-binding.sources.sha256`；源码后续有变更，不作为当前哈希门禁）、[历史源码快照SHA-256](../../../evidence/audits/2026-10-03-w4-v23-artifact-codeversion-binding.sha256)。真实市场/PIT、独立模型验证、新范围人工签署、Ubuntu和O1/O2仍未通过。

2026-10-03 W7共享Platform状态迁移后的V2.3当前指纹复验：完整`pnpm verify:stage -- --stage V2.3 --suite code`退出0，新TestRun `8e2dd579-f780-4db1-b867-94b082457579`绑定165项源码，`codeVersion=sha256:0971be7a5e6f5b1594447789d273785e3be275b66d6286ca63d84b07e9ff6ee4`经独立重算一致。Qlib Fixture 24项预测、Artifact owner 200/异主403、同Run CLI check-only与两项Evidence导出PASS；独立验证NOT_RUN、Provider/市场/Paper调用0。完整证据见[W4审计](../../../evidence/audits/2026-10-03-w4-v23-stage-state-history.md)、[机器报告](../../../evidence/audits/2026-10-03-w4-v23-stage-state-history.json)、[完整命令日志](../../../evidence/audits/2026-10-03-w4-v23-stage-state-history.log)、165项源码Manifest（该运行的历史输入清单；后续共享状态代码更新后不再作为当前源码Hash门禁）、[TestRun](../../../evidence/local/V2.3/8e2dd579-f780-4db1-b867-94b082457579/evidence.json)及[审计SHA](../../../evidence/audits/2026-10-03-w4-v23-stage-state-history.sha256)。此Fixture运行不改变V2.3阶段状态或人工验收。


2026-10-03 W4 V2.3 在V3.3完成证据门禁后的当前源码复验：完整`pnpm verify:stage -- --stage V2.3 --suite code`退出0，最新TestRun `692619fb-dc30-4507-9e26-09a70611aa84`绑定165项输入，`codeVersion=sha256:1130fa83f4161c44daf74042a3791074f0c2e71057ab092eb8fd51bfe0ba5869`独立复算一致。Qlib Fixture 24个有限预测、时间因果PASS、Artifact owner/异主200/403、同Run CLI check-only 0且无写入、两条Evidence导出PASS。完整日志和新当前源码Manifest见[W4审计](../../../evidence/audits/2026-10-03-w4-v23-after-completion-evidence-gate.md)、[机器报告](../../../evidence/audits/2026-10-03-w4-v23-after-completion-evidence-gate.json)、[日志](../../../evidence/audits/2026-10-03-w4-v23-after-completion-evidence-gate.log)、该次165项源码清单作为历史Hash边界保留（后续Platform代码变化后不再作为当前源码门禁）、[SHA-256](../../../evidence/audits/2026-10-03-w4-v23-after-completion-evidence-gate.sha256)。本次仍为FIXTURE；独立验证、真实市场/PIT、Paper、Ubuntu及人工验收未完成。


2026-10-03 W4 V2.3在V3.3保存入口绕过保护后的当前源码复验：完整`pnpm verify:stage -- --stage V2.3 --suite code`退出0，TestRun `af9bcd6d-2e47-4f78-8851-40098accf24c`绑定165项输入，codeVersion `sha256:759a552c7c8b7ab555afa9d113ab135036e4c8ac18f2d6ccb49e43d56d47a2a2`独立复算一致。Qlib Fixture 24预测、时间验证、Artifact owner/异主权限200/403、CLI check-only及导出PASS；真实市场/PIT、独立验证、Paper、Ubuntu和人工验收仍NOT_RUN。见[W4审计](../../../evidence/audits/2026-10-03-w4-v23-after-v33-save-path-guard.md)、[机器报告](../../../evidence/audits/2026-10-03-w4-v23-after-v33-save-path-guard.json)、[完整日志](../../../evidence/audits/2026-10-03-w4-v23-after-v33-save-path-guard.log)及[审计SHA](../../../evidence/audits/2026-10-03-w4-v23-after-v33-save-path-guard.sha256)。该次源码清单保留为当时点证据，不作为当前源码指纹。

2026-10-03 当前源码复验：V2.3完整code suite下新TestRun `12424631-19bd-4bdf-b5f4-6dfd948d751c`以锁版Qlib 0.9.6 / LightGBM 4.7.0完成120行合成Fixture训练与24个测试预测，时间因果、Artifact共享持久化/owner隔离及CLI check-only通过；独立验证`NOT_RUN`、真实数据/PIT未接入。详见[V2.3/V2.5回归审计](../../../evidence/audits/2026-10-03-w4-v23-v25-current-code-rerun.md)、[TestRun](../../../evidence/local/V2.3/12424631-19bd-4bdf-b5f4-6dfd948d751c/evidence.json)和[Manifest](../../../evidence/local/V2.3/12424631-19bd-4bdf-b5f4-6dfd948d751c/manifest.sha256)。不改变新增研究子能力待人工验收及PARTIALLY_IMPLEMENTED状态。

2026-10-03 W4 Qlib Fixture current-code verification: the pinned Linux/amd64 worker container (emulated on Apple Silicon, network disabled) ran Qlib 0.9.6 `LGBModel.fit/predict` against 120 synthetic rows (72/24/24 temporal split). Repeated model/prediction hashes matched; model SHA-256 `08d29ca3ccefc37e887928d5a4512a9f63d53edef6cc91b4289e1731ec675695`, prediction SHA-256 `09d1563ed1102a87f6e71672e9b1238ce844094aa336cb33efeea6ac995bdbe3`. A separate isolated Web→Platform→Quant Worker→PostgreSQL/content-store run created TestRun `2674d870-f73d-456b-9630-4209e0dce45f`; Qlib artifact read was 200, foreign artifact/owner access 403, same-run CLI check-only passed, and evidence export manifest SHA-256 was `76a60f7d0736dd022057d6c8c8cff7a945fbff9970f63496f219ec35fd75a3e1`. Temporary containers, image, databases, network and content directory were removed. This verifies the isolated synthetic Fixture path only: authorized market data, independent validation, profitability, active deployment, and human acceptance remain NOT_RUN; stage remains PARTIALLY_IMPLEMENTED.

2026-10-03 W4 current V2.3 code-suite rerun: controlled isolated `pnpm verify:stage -- --stage V2.3 --suite code` exited 0 after the default sandbox run retained its Qlib loopback `EPERM` failure. The real locked Qlib 0.9.6/LightGBM 4.7.0 worker ran 120-row synthetic data (72/24/24 temporal split), produced 24 finite predictions, passed temporal validation, persisted an owner-scoped artifact, and matched repeated model/prediction hashes. TestRun `5595be61-15b5-4bf9-8b1a-0c3985db98d7` has one passing `V2.3-QLIB-FIXTURE-001` assertion, 168 source inputs, codeVersion `sha256:d3149212349520afc315a479abf79ea742177e5ba1b258ae1049927c0550b15e`, same-run CLI check-only exit 0, evidence export manifest `af4f02fd18cef224a32f3fc75faba98cd6f9bbda30e2b0f3aec037fe2b5f948b`; manifest verification passed and all temporary containers/images/databases/network/content directories were removed. Evidence: [TestRun](../../../evidence/local/V2.3/5595be61-15b5-4bf9-8b1a-0c3985db98d7/evidence.json), [manifest](../../../evidence/local/V2.3/5595be61-15b5-4bf9-8b1a-0c3985db98d7/manifest.sha256), [verification note](../../../evidence/audits/2026-10-03-w4-v23-current-fixture-rerun.md). This remains synthetic Fixture/emulated Linux amd64 evidence: real licensed market data, production research/PIT, independent model validation, actual Ubuntu, and new-scope human acceptance remain NOT_RUN; stage remains PARTIALLY_IMPLEMENTED.

增量审计完整性校验：[W4当前复验SHA-256](../../../evidence/audits/2026-10-03-w4-v23-current-fixture-rerun.sha256)覆盖本审计说明、结构化TestRun和Run Manifest。

2026-10-06 当前工作树 V2.3 code suite：`pnpm verify:stage -- --stage V2.3 --suite code`退出0；锁版Qlib 0.9.6/LightGBM 4.7.0在Linux/amd64 Apple Silicon仿真Worker中用120行合成Fixture训练并产生24个有限预测，时间切分与重复Hash一致。TestRun `da12c960-92fe-4a04-8678-4167a92ecfb6`绑定170项工作区输入，codeVersion `sha256:bef5d16a14e896cf592de7b49e43eb79bf68afd2dd1e2e52840aa4af37f8d095`；Artifact owner读200/跨owner403，同Run CLI `--check-only`退出0，导出Manifest Hash `11e532e5140c7c5578794e942dde22721a9109154386d85ad9f49e21d094fcfc`并通过核验。临时数据库、网络、容器、Qlib镜像与内容目录已清理，外部行情/Broker调用0。此Fixture结果的独立模型验证仍NOT_RUN，不授权本机BaoStock归档、不证明真实PIT或盈利，也不关闭Ubuntu/观察/人工验收。完整记录见[W4审计](../../../evidence/audits/2026-10-06-w4-v23-current-code-suite.md)、[全套日志](../../../evidence/audits/2026-10-06-w4-v23-current-code-suite.log)、[TestRun](../../../evidence/local/V2.3/da12c960-92fe-4a04-8678-4167a92ecfb6/evidence.json)及[Run Manifest](../../../evidence/local/V2.3/da12c960-92fe-4a04-8678-4167a92ecfb6/manifest.sha256)。阶段保持PARTIALLY_IMPLEMENTED。

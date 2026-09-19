# V2.3 日频决策、分钟撮合与历史事件回放

2026-09-19 技术复核：平台回放切片已补齐确定性 `nextAvailableBar`、多窗口参与率部分成交及逐窗口 `LEDGER_COMMITTED` 屏障；对应单元测试已通过。跨服务真实来源与人工验收仍按下表保持独立状态。

状态：PARTIALLY_IMPLEMENTED。版本入口：[README](./README.md)。共同约束：[三版共同规则](../05-three-version-delivery.md)。

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
- [x] 历史人工验收记录已保留（2026-09-09）；本次技术复核后，完整 V2.3 阶段结论仍为 PARTIALLY_IMPLEMENTED，不能以该记录代替未完成的跨域验收。
- [x] 操作说明与限制已更新，[本版验收表](./99-acceptance.md)已同步。

2026-09-15 V2.3 生命周期切片：historical-replay-worker 新增受服务身份保护的运行查询、暂停、恢复、取消接口；多 Bar 推进在每个 Bar 前读取持久状态，暂停时不推进虚拟游标，取消时保留检查点并以 `CANCELLED` 终态收口。新增生命周期状态机单测（5/5），全仓 V2.3 code 套件通过；完整跨服务 Runner、历史执行模型和 Web 实际操作仍保持未完成。

2026-09-15 历史执行规则切片：交易执行域支持显式参与率、买卖方向滑点、限价 DAY 不可成交时的 `EXPIRED/LIMIT_NOT_MARKETABLE`，并拒绝非法参与率、滑点和订单规则；新增 3 个单元场景，交易执行服务单测 8/8、全仓 V2.3 code 套件通过。多窗口下一可用 Bar 编排、真实跨服务 E2E 和 Web 操作验收仍未完成。

2026-09-15 Web E2E 复验：启动 `pnpm dev:web` 后执行 `pnpm test:e2e -- --stage V2.3`，Playwright 场景“V2.3 replay page shows deterministic matching and recovery evidence”通过 1/1（退出码 0）。本次仅覆盖现有验收页和 Fixture API 断言，不能替代真实跨服务历史回放验收。

2026-09-15 Worker 生命周期实测：Docker 重建 Worker 后，8 Bar 任务暂停查询为 `PAUSED`，恢复后从持久检查点完成到 cursor=8；另一 20 Bar 任务取消后以 `replay was cancelled` 收口，未继续推进。生命周期 API 的跨服务实测通过。

2026-09-15 并发隔离实测：Docker Worker 同时运行 5 个隔离的 4 Bar 任务，5/5 完成到 cursor=4、每个任务 4 笔执行且账户 ID 独立。该结果覆盖小规模并发切片；长时容量压力和 Web 按钮驱动的实际暂停/恢复仍待补充。

2026-09-15 并发压力边界：初始 10×12 Bar 压力切片使组合服务连接/请求耗尽并全部 `fetch failed`；Worker 增加默认并发上限 2 后，4×4 Bar 排队回归 4/4 完成，组合服务保持 ready。长时容量上限仍需在 V2.5 专项验证。

## 8. 阶段验收操作手册

### 8.1 当前可执行性与验收准备

手册状态：VERIFIED_EXECUTABLE（自动检查已实现；人工验收待用户确认）。

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

### 8.5 交叉核对、失败定位与恢复

交叉核对：游标/虚拟时间/事件序号、订单/Fill/账本版本及净值与不中断参考对照；检查点恢复不是新建运行重头再算。

先检查Web与CLI的testRunId、输入/策略/代码版本和模式是否一致，再按Trace查平台、领域、适配器与持久化证据。页面错误而CLI正确，记录Web失败；二者都错则保留领域断言失败。缺能力先查健康/迁移/数据与日志，不修改余额或订单状态使断言通过。

独立复跑创建新run；测试幂等/检查点/重启恢复则使用原run和原幂等键。故障发生后保留旧证据，修复后新增运行或检查记录；不得清空账本、随机更换seed直到通过。真实观察窗口、来源验证和实际模型调用与加速/录制测试分别记录。

### 8.6 验收记录与收尾

| 场景/检查 | Web实际结果与截图 | 命令/退出码/报告 | testRunId/业务ID | 结论 |
|---|---|---|---|---|
| normal | Web 页面与 API 复验通过 | `pnpm verify:stage -- --stage V2.3 --scenario normal --seed 20260907`，退出码 0 | `6522c574-fc20-472b-8eba-1a0b59024d9c` | PASS |
| rejection（含全部子场景） | Web 页面与 API 复验通过 | `pnpm verify:stage -- --stage V2.3 --scenario rejection --seed 20260907`，退出码 0；FUTURE_DATA/ZERO_VOLUME/MISSING_BAR，无 Fill | `3d361eb3-e1cd-4517-9de8-5eccb88776dc` | PASS |
| recovery（含实际外部动作） | Web 页面与 API 复验通过 | `pnpm verify:stage -- --stage V2.3 --scenario recovery --seed 20260907`，退出码 0；检查点恢复无重复 Fill | `49b5dc51-1a1d-40ad-9100-d290c423f386` | PASS |
| Web同run只读核对与证据导出 | Web E2E 1/1 通过；V2.3 同run GET 通过 | `--check-only` 与 `pnpm evidence:export`，均退出码 0；Manifest `02293ca437201a36096a7e04631f5be837869a49f9bb9be490f4b64a9995002a` | `6522c574-fc20-472b-8eba-1a0b59024d9c`；`evidence/local/V2.3/6522c574-fc20-472b-8eba-1a0b59024d9c` | PASS |
| 本阶段代码测试/实际观察适用项 | 构建、单元测试、Compose 健康检查通过 | `pnpm build`、`pnpm test`，均退出码 0 | 见 `docs/evidence-v2.3.md` | PASS |
| 用户人工验收 | 用户明确确认通过；2026-09-11 完整复核一致 | 不由脚本代签 | 本会话确认 / 2026-09-11 | PASS |

记录不适用子项的范围依据，不能将必需项改为不适用绕过门禁。归档后在[本版验收表](./99-acceptance.md)填写证据链接和结论。清理只针对本轮已结束的隔离运行，默认保留证据；停止测试不能删除数据库卷或取消无关任务。

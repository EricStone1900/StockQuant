# V1.2 小样本数据、真实 Qlib 与环境探针

状态：IN_PROGRESS（数据纵切片已实现；Qlib/RD-Agent 核心验证仍 NOT_RUN）。版本入口：[README](./README.md)。共同约束：[三版共同规则](../05-three-version-delivery.md)。

## 1. 前置与范围

V1.1通过；Clock、Artifact、账户和验收中心入口已存在。

本阶段所有订单、券商资产和成交均来自隔离模拟环境。真实业务数据库、Qlib或RD-Agent在声明“已验证”时必须真正执行；替身需独立标注。

## 2. 开发任务

- [x] 实现日线导入预览、原始行情、证券映射、数据版本及质量报告；坏数据不能标可用。复权分离与正式 Artifact 存储列为后续缺口。
- [ ] 将固定commit的Qlib封装到 quant-research-service Adapter；完成基础因子、变换、NO_TRADE和低换手TopK；Domain 不依赖Qlib。
- [ ] 异步任务保存进度、失败和取消，模型/因子/数据/依赖版本可追溯；因子预热不足应拒绝或按既定缺失规则处理。
- [x] 提供 CN 正常与未来数据样本，验证按 asOf 拒绝未来数据；US/缺失/退市样本列为后续缺口。
- [ ] 提前构建并运行RD-Agent导入、Docker执行和一个固定代码实验探针；无模型配置时模型调用项保持NOT_RUN，不阻断V1核心，但必须登记V3前置缺口。

## 3. 同步 Web 开发

正式页：数据导入、质量报告、证券/日线浏览、策略参数和因子排名。验收页：好/坏数据切换、真实Qlib任务证据、RD-Agent兼容矩阵与缺口。

验收中心路径：`/acceptance/v1/v1.2`（目标路由）。场景参数提交到后端TestRun编排接口，后端调用业务API并汇集证据。浏览器不直接写领域数据，不自行判定成交。该阶段至少提供正常、拒绝/异常场景；适用时增加重试/恢复场景。

## 4. 人工验收步骤

1. 导入正常样本，预览后发布，查看数据版本、覆盖、原始Hash和行情。
2. 选择固定因子计算并抽查手算值；相同版本重复运行，规范化结果一致。
3. 切换NO_TRADE和TopK，检查HOLD为空交易腿，候选展示原因及输入时间。
4. 运行缺失、未来可见和短历史样本；查看明确拒绝/质量标记；取消任务后不发布半份结果。

每次保存testRunId、场景版本、代码/镜像、数据/规则版本、种子及注入事件序列、实际/预期、截图/Trace。判定依据必须是后端事实和独立检查，不能只看Toast成功提示。

## 5. 异常与替身边界

Qlib编译或运行失败不得切换到假排名并报成功；RD-Agent探针和真实LLM实验分开标记。

## 6. 产物与验证

目标产物：market-data-service、quant-research-service 纵向切片、Qlib镜像/锁、数据与策略Web、fixtures/market-data、兼容矩阵。

自动验证：真实Qlib CPU烟测、PIT与手算因子测试、Artifact原子发布/取消集成、数据与策略浏览器E2E。

需求/测试追踪：DAT-01～06/11、QNT-01/02/04/07/10、STR-01/03/04；T04～10、T40～44；DV-02/07、VT02/07。

退出条件：开发任务完成、Web真实可操作、全部适用检查PASS、人工签署、已知限制写入证据。填写[本版验收表](./99-acceptance.md)，未完成项不得勾选通过。

## 7. 阶段交付待办（完成后勾选）

以下勾选只记录本阶段交付进度，不能代替第2节逐项开发任务或版本验收结论。开发者凭实现/实测证据勾选开发项；“人工验收”仅在用户实际确认后勾选，不预填PASS。

- [ ] 契约、数据结构、场景定义和预期结果已冻结。
- [ ] 第2节后端任务完成，真实依赖与替身明确。
- [ ] 正式Web功能页及验收中心正常/异常场景完成。
- [x] 命令、实际URL、Fixture路径/Hash和配置说明已补齐，未实现项已明确列为范围外。
- [x] 开发者已执行数据 normal/rejection、容器健康及基础代码检查；Qlib 探针如实记录为 NOT_RUN。
- [ ] 重复/恢复及适用观察期验证完成，未覆盖项如实记录。
- [ ] 用户已通过Web及命令证据完成人工验收，记录确认时间/结论。
- [ ] 操作说明与限制已更新，[本版验收表](./99-acceptance.md)已同步。

## 8. 阶段验收操作手册

### 8.1 当前可执行性与验收准备

手册状态：VERIFIED_EXECUTABLE（2026-09-09，数据纵切片）；Qlib/RD-Agent 核心项仍 NOT_RUN。以下命令和路由已在 Mac ARM64 Docker 中实测。

前置服务：V1.1服务、数据服务、量化Worker、真实Qlib Linux镜像；RD-Agent探针按需启动。

固定输入：冻结的10～20只CN与3～5只US日线Fixture，记录确切起止日期/DataVersion及因子预热；seed=20260907。

| 开发交付时必须填写 | 当前值 |
|---|---|
| 实测代码Commit或工作区Hash/验证日期 | 工作区（V1.2 未提交）；2026-09-09 |
| 项目根目录、Node/pnpm/Python/uv及Docker版本 | `/Users/huangbosong/Documents/ChatGPT/StockQuant`；Node 24.1.0、pnpm 10.34.5、Docker Desktop ARM64 |
| Web基础URL/身份登录或会话建立方式 | 原生 Web `http://127.0.0.1:5173/acceptance/v1/v1.2`；数据服务 `3002`；量化服务 `3003` |
| 本阶段Web路由 | `/acceptance/v1/v1.2`（目标） |
| 正式页面的真实入口/跳转链接 | `/acceptance/v1/v1.2`；“预览正常 Fixture”“预览未来数据拒绝样本”“运行 Qlib CPU 探针”“预览基础因子排名” |
| Fixture文件/数据版本/确切日期/Hash、规则与成本版本 | `fixtures/v1/v1.2/cn_daily.csv`（`2d799e0f…`）、`cn_daily_bad_future.csv`（`d59c69bc…`）；版本 `v1.2-market-data-1`；asOf `2024-12-31` |
| 配置文件及必需环境变量名/非秘密测试值 | `infra/compose/docker-compose.yml`；`STOCKQUANT_MARKET_DATA_URL=http://127.0.0.1:3002`、`STOCKQUANT_QUANT_RESEARCH_URL=http://127.0.0.1:3003`；`QLIB_SOURCE_COMMIT=UNSET` |
| 外部故障目标及可执行命令、恢复/隔离清理入口 | 数据任务取消/Artifact 原子发布尚未实现；不执行清理，保留 Fixture 和容器日志 |
| 预期耗时、轮询超时、实际观察期/预算 | 数据预览 <1 秒；Qlib 探针 <2 秒；真实模型调用预算为 0，状态 NOT_RUN |

### 8.2 初始化与启动（目标命令，待实现）

在上表填写的项目根目录运行；工具版本按锁文件/项目说明准备。首次开发由开发者生成锁文件和脚本，验收者不负责补建环境。环境变量按上表配置；保持FAKE券商与模拟账户，真实模型仅在本阶段明确要求且预算已配置的场景调用。

```bash
# 终端A：先确认实际执行目录为项目根目录
pwd
pnpm install --frozen-lockfile
pnpm stack:up -- --stage V1.2

# 终端B：同一项目根目录，保持开发服务器运行
pnpm dev:web
```

预期：安装与stack入口退出0；stack输出本阶段服务、端口、健康/迁移及持久卷状态。依赖不可用应非零并说明原因；不能删除旧业务卷重试。Web服务器持续运行并输出基础URL，尚在运行不要求退出码0。若已使用容器化Web，则填写已验证入口并避免重复占用端口。Ubuntu部署必须补齐实际镜像拉取/启动/迁移命令，不能仅用dev:web代替发布验证。

初始化在验收中心“准备隔离运行”完成；CLI场景入口也负责同样的准备，两者调用同一业务API。准备后记录testRunId、accountId、namespace及Fixture/DataVersion；初始化业务本身是测试对象时不得预先完成被测动作。缺源/凭证/历史数据时显示缺项，不静默换成Fake并报真实场景通过。

### 8.3 Web逐步操作及预期结果

1. 登录上表实际Web地址，进入“开发验收中心→V1→V1.2”；检查页面版本、模拟模式、服务能力与固定输入。
2. 每个场景点击“准备隔离运行”，核对参数后记下testRunId；正常/异常/恢复使用独立运行，场景内部的重复或恢复操作继续使用原运行及业务幂等键。
3. 按下表执行。操作按钮为目标交互，交付时开发者必须换成实际页面名称/按钮及路由；预期必须从业务明细读取，不能只看“任务完成”。

| 场景ID（阶段内唯一） | 场景 | 点击顺序/输入 | 预期结果与核对点 |
|---|---|---|---|
| normal | 真实因子计算 | 在数据页选择正常Fixture→预览→发布；从策略页选择冻结基础因子→运行，打开手算样本对比。 | 数据版本/Hash可查；有真实Qlib进程证据，因子与手算一致；NO_TRADE无交易腿。 |
| rejection | 数据拒绝 | 在异常场景依次选“未来可见”“缺失价格”“预热不足”，预览并尝试计算；查看质量详情。 | 按规则拒绝或明确限制用途；不前填价格，不显示伪造排名，不发布可用半份结果。 |
| recovery | 重跑与取消 | 同参数新建运行比较规范结果；另开任务点击“取消”并刷新；最后运行RD-Agent环境探针。 | 固定因子结果一致；取消不覆盖已发布结果；探针与真实LLM调用分别标状态，缺凭证不伪称LLM通过。 |

4. 从运行详情打开关联正式页面，执行一次刷新/关闭再打开；核对长任务后台状态、历史证据和加载/失败/陈旧提示。
5. 每项记录实际结果、截图与业务ID。异常场景“预期拒绝”被正确验证时断言可PASS，但被测业务操作仍显示拒绝；若意外接受则断言FAIL。

### 8.4 命令行复验与相同运行核对（待实现）

在项目根目录执行以下目标命令。stage/scenario必须匹配8.3定义；CLI与Web共用场景版本、Fixture和断言。每条命令执行后立即查看退出码，任何非零先保存错误再定位，不能继续假定本阶段通过。

```bash
pnpm verify:stage -- --stage V1.2 --scenario normal --seed 20260907
# 紧接上一命令执行；0表示全部场景断言通过
 echo $?
pnpm verify:stage -- --stage V1.2 --scenario rejection --seed 20260907
 echo $?
pnpm verify:stage -- --stage V1.2 --scenario recovery --seed 20260907
 echo $?
pnpm verify:stage -- --stage V1.2 --suite code
 echo $?
pnpm test:e2e -- --stage V1.2
 echo $?
```

预期：各场景输出testRunId、实际数据/模型/券商模式、断言expected/actual及证据位置；预期内拒绝场景验证成功退出0，意外副作用/缺脚本/缺必需依赖/未满观察条件非零。恢复场景需外部动作时输出已核实目标和步骤，停留WAITING；完成动作后复验原run，不伪称Web可重启宿主。浏览器测试必须实际运行本阶段用例，零用例/全跳过不能退出0。

再对Web中已运行的同一testRunId执行只读核对，避免仅创建新样本掩盖页面问题：

```bash
# 粘贴Web运行详情中的实际testRunId，再按回车；这是普通ID，不是凭证
read -r acceptance_run_id
pnpm verify:stage -- --stage V1.2 --run "$acceptance_run_id" --check-only
 echo $?
pnpm evidence:export -- --run "$acceptance_run_id"
 echo $?
```

check-only仅查询此运行后端事实并追加检查证据，不创建新订单、不重放成交或发起模型调用；空ID/错误stage/越权run必须拒绝。导出只含脱敏数据，输出实际目录和Manifest Hash，不自动勾选人工验收。端到端正常/异常/恢复运行产生不同ID，导出时分别保存。

本阶段代码测试覆盖要求：真实Qlib CPU烟测、PIT与手算因子测试、Artifact原子发布/取消集成、数据与策略浏览器E2E。 在交付时把映射到的实际Domain/DB/契约/服务内测试命令补入本节，注明执行目录、测试文件或套件、退出码和报告；verify:stage必须展示实际调用的测试清单，不能空壳返回0。Python服务使用自身锁定环境，不串用其他服务虚拟环境。

### 8.5 交叉核对、失败定位与恢复

交叉核对：数据版本、因子参数/公式、预期手算值及真实Qlib日志与Web排名对应；跨运行比较排除运行ID和日志时间。

先检查Web与CLI的testRunId、输入/策略/代码版本和模式是否一致，再按Trace查平台、领域、适配器与持久化证据。页面错误而CLI正确，记录Web失败；二者都错则保留领域断言失败。缺能力先查健康/迁移/数据与日志，不修改余额或订单状态使断言通过。

独立复跑创建新run；测试幂等/检查点/重启恢复则使用原run和原幂等键。故障发生后保留旧证据，修复后新增运行或检查记录；不得清空账本、随机更换seed直到通过。真实观察窗口、来源验证和实际模型调用与加速/录制测试分别记录。

### 8.6 验收记录与收尾

| 场景/检查 | Web实际结果与截图 | 命令/退出码/报告 | testRunId/业务ID | 结论 |
|---|---|---|---|---|
| normal | 数据服务正常 Fixture 预览通过；Web 页面已构建 | `pnpm verify:stage -- --stage V1.2 --scenario normal --seed 20260907`，退出0 | dataVersion `v1.2-market-data-1`；6 bars/2 securities | PASS（数据纵切片） |
| rejection（未来数据） | 未来日期被质量报告拒绝 | `pnpm verify:stage -- --stage V1.2 --scenario rejection --seed 20260907`，退出0 | `FUTURE_DATA` / asOf `2024-12-31` | PASS（数据纵切片） |
| recovery / Qlib 探针 | 探针容器可运行，但 Qlib 未安装 | `curl http://127.0.0.1:3003/v1/qlib/probe`；返回 `NOT_RUN` | `QLIB_SOURCE_COMMIT=UNSET` | NOT_RUN（不伪称通过） |
| Web同run只读核对与证据导出 | V1.2 TestRun 编排尚未接入平台 API | 未实现 | 待填写 | NOT_RUN |
| 本阶段代码测试/实际观察适用项 | 类型、构建、单元、Fixture Hash 通过；真实 Qlib 未执行 | `pnpm typecheck`、`pnpm build`、`pnpm test`、`pnpm baseline:check`，均退出0 | ARM64 Docker；无真实市场观察 | PARTIAL |
| 用户人工验收 | 待用户确认 | 不由脚本代签 | 确认人/日期待填 | NOT_RUN |

记录不适用子项的范围依据，不能将必需项改为不适用绕过门禁。归档后在[本版验收表](./99-acceptance.md)填写证据链接和结论。清理只针对本轮已结束的隔离运行，默认保留证据；停止测试不能删除数据库卷或取消无关任务。

# V1.3 治理、风控与模拟券商完整交易链路

状态：PASS（自动验证与用户人工验收均完成，2026-09-09）。版本入口：[README](./README.md)。共同约束：[三版共同规则](../05-three-version-delivery.md)。

## 1. 前置与范围

V1.2通过，策略已产生版本化目标；V1.1账户/账本可用。

本阶段所有订单、券商资产和成交均来自隔离模拟环境。真实业务数据库、Qlib或RD-Agent在声明“已验证”时必须真正执行；替身需独立标注。

## 2. 开发任务

- [x] 实现治理建议、MANUAL_APPROVAL与AUTO_POLICY、Mandate、短期执行授权、次数预算与资源预留；每条交易腿和中间资金路径都检查。
- [x] 实现隔离 FakeBroker 交易证据和 place/query/cancel/fills/account 契约；brokerOrderId 稳定且不复制内部账本。
- [x] 实现订单状态、全成、拒单、UNKNOWN、重复 Fill 幂等和固定故障事件序列。
- [x] 固定场景覆盖全成、拒单、接受响应丢失、重复/乱序回报；seed/testRunId 均记录。
- [x] 所有服务端接受路径仅允许 PAPER + FAKE，页面不能直接改状态或余额。

## 3. 同步 Web 开发

正式页：建议详情、风险原因、授权范围、订单/成交、现金/可卖量、对账案例。验收页：场景选择、故障参数、完整业务时间线和逐项不变量检查。

验收中心路径：`/acceptance/v1/v1.3`（目标路由）。场景参数提交到后端TestRun编排接口，后端调用业务API并汇集证据。浏览器不直接写领域数据，不自行判定成交。该阶段至少提供正常、拒绝/异常场景；适用时增加重试/恢复场景。

## 4. 人工验收步骤

1. 在合法Fixture中买100股、价10、测试费5，确认现金8995、持仓100股、成交与账本唯一关联。
2. 选择现金不足、A股当天不可卖、过期Mandate、第三批超限等场景，确认拒绝且无券商place副作用。
3. 启用AUTO_POLICY触发调仓，确认无需逐单批准；另测人工批准/拒绝/修改及旧版本冲突。
4. 触发接受响应丢失，确认进入UNKNOWN、保留占用，通过原clientOrderId查询恢复，无第二次place；重复10次Fill只入账一次。

每次保存testRunId、场景版本、代码/镜像、数据/规则版本、种子及注入事件序列、实际/预期、截图/Trace。判定依据必须是后端事实和独立检查，不能只看Toast成功提示。

## 5. 异常与替身边界

未确认撤单不释放在途风险；未知结果不能随机改为失败；模拟故障保持业务因果顺序，恶意非法回报另标协议测试。

## 6. 产物与验证

目标产物：decision-governance-service、trade-execution-service/Gateway、组合领域扩展、隔离FakeBroker、fixtures/broker-events、Web业务时间线。

自动验证：领域金额/状态机、真实DB并发占用和事务、真事件幂等、FakeBroker API契约、两市场人工/自动授权Web E2E。

需求/测试追踪：POR、GOV、EXE-01～08模拟部分、AUT-01～03、MEM-01、XMK基础；T22～31、T42～49；DV-03、VT03。

退出条件：开发任务完成、Web真实可操作、全部适用检查PASS、人工签署、已知限制写入证据。填写[本版验收表](./99-acceptance.md)，未完成项不得勾选通过。

## 7. 阶段交付待办（完成后勾选）

以下勾选只记录本阶段交付进度，不能代替第2节逐项开发任务或版本验收结论。开发者凭实现/实测证据勾选开发项；“人工验收”仅在用户实际确认后勾选，不预填PASS。

- [ ] 契约、数据结构、场景定义和预期结果已冻结。
- [ ] 第2节后端任务完成，真实依赖与替身明确。
- [ ] 正式Web功能页及验收中心正常/异常场景完成。
- [ ] 命令、实际URL、Fixture路径/Hash和配置说明已补齐，待实现占位已消除或明确列为范围外。
- [ ] 开发者按第8节从准备到导出亲自执行，保存代码版本、退出码、截图/Trace和断言证据。
- [ ] 重复/恢复及适用观察期验证完成，未覆盖项如实记录。
- [x] 用户已通过Web及命令证据完成人工验收，记录确认时间/结论（2026-09-09，PASS）。
- [ ] 操作说明与限制已更新，[本版验收表](./99-acceptance.md)已同步。

## 8. 阶段验收操作手册

### 8.0 已验证命令

在项目根目录执行：

```bash
COREPACK_HOME="$PWD/.corepack" pnpm verify:stage -- --stage V1.3 --suite code
COREPACK_HOME="$PWD/.corepack" pnpm verify:stage -- --stage V1.3 --scenario normal --seed 20260907
COREPACK_HOME="$PWD/.corepack" pnpm verify:stage -- --stage V1.3 --scenario rejection --seed 20260907
COREPACK_HOME="$PWD/.corepack" pnpm verify:stage -- --stage V1.3 --scenario recovery --seed 20260907
```

Web 验收入口：`http://127.0.0.1:8080/acceptance/v1/v1.3`。每次运行保存页面显示的 `testRunId`，再用 `curl -H 'x-stockquant-user: acceptance-owner-1' http://127.0.0.1:3000/api/v1/acceptance/v1/v1.3/runs/<testRunId>` 核对后端证据。

### 8.1 当前可执行性与验收准备

手册状态：VERIFIED_EXECUTABLE（自动验证已具备；人工签署仍 NOT_RUN）。

前置服务：平台/Web、数据/量化、组合、治理、执行/Gateway、独立FakeBroker、真实DB/NATS及本阶段所需编排。

固定输入：合法交易时段Fixture；CN现金10000、零持仓、买100股、RAW价格10、测试费5，固定Mandate/规则；seed=20260907。

| 开发交付时必须填写 | 当前值 |
|---|---|
| 实测代码Commit或工作区Hash/验证日期 | 运行 `git rev-parse HEAD` 后填写；自动验证日期 2026-09-09 |
| 项目根目录、Node/pnpm/Python/uv及Docker版本 | 待实现后填写 |
| Web基础URL/身份登录或会话建立方式 | 待实现后填写；不记录密码/token |
| 本阶段Web路由 | `http://127.0.0.1:8080/acceptance/v1/v1.3` |
| 正式页面的真实入口/跳转链接 | `http://127.0.0.1:8080/acceptance/v1/v1.3` |
| Fixture文件/数据版本/确切日期/Hash、规则与成本版本 | 待实现后填写；不能只写“小样本” |
| 配置文件及必需环境变量名/非秘密测试值 | 待实现后填写；凭证只记录引用方式 |
| 外部故障目标及可执行命令、恢复/隔离清理入口 | 待实现后填写；不适用项注明理由 |
| 预期耗时、轮询超时、实际观察期/预算 | 待实现后填写，不用无限等待或假成功 |

### 8.2 初始化与启动（目标命令，待实现）

在上表填写的项目根目录运行；工具版本按锁文件/项目说明准备。首次开发由开发者生成锁文件和脚本，验收者不负责补建环境。环境变量按上表配置；保持FAKE券商与模拟账户，真实模型仅在本阶段明确要求且预算已配置的场景调用。

```bash
# 终端A：先确认实际执行目录为项目根目录
pwd
pnpm install --frozen-lockfile
pnpm stack:up -- --stage V1.3

# 终端B：同一项目根目录，保持开发服务器运行
pnpm dev:web
```

预期：安装与stack入口退出0；stack输出本阶段服务、端口、健康/迁移及持久卷状态。依赖不可用应非零并说明原因；不能删除旧业务卷重试。Web服务器持续运行并输出基础URL，尚在运行不要求退出码0。若已使用容器化Web，则填写已验证入口并避免重复占用端口。Ubuntu部署必须补齐实际镜像拉取/启动/迁移命令，不能仅用dev:web代替发布验证。

初始化在验收中心“准备隔离运行”完成；CLI场景入口也负责同样的准备，两者调用同一业务API。准备后记录testRunId、accountId、namespace及Fixture/DataVersion；初始化业务本身是测试对象时不得预先完成被测动作。缺源/凭证/历史数据时显示缺项，不静默换成Fake并报真实场景通过。

### 8.3 Web逐步操作及预期结果

1. 登录上表实际Web地址，进入“开发验收中心→V1→V1.3”；检查页面版本、模拟模式、服务能力与固定输入。
2. 每个场景点击“准备隔离运行”，核对参数后记下testRunId；正常/异常/恢复使用独立运行，场景内部的重复或恢复操作继续使用原运行及业务幂等键。
3. 按下表执行。操作按钮为目标交互，交付时开发者必须换成实际页面名称/按钮及路由；预期必须从业务明细读取，不能只看“任务完成”。

| 场景ID（阶段内唯一） | 场景 | 点击顺序/输入 | 预期结果与核对点 |
|---|---|---|---|
| normal | 买入完整闭环 | 选择上述Fixture→准备运行→进入建议页→确认风险→激活模拟Mandate→触发调仓；打开订单、成交和账户页。 | AUTO_POLICY无需逐笔批准；买100股仅一次成交，现金8995、持仓100股、费用5；未结算/可卖量按Fixture规则展示。 |
| rejection | 风控与授权拒绝 | 各自新建异常子运行，依次选择“现金不足”“当天不可卖”“Mandate过期”“第三批超限”，点击提交。 | 规则原因明确；对应拒绝腿没有FakeBroker place；现金/预算/占用符合拒绝阶段，无越权放行。 |
| recovery | UNKNOWN与重复Fill | 选“接受响应丢失”→提交→确认UNKNOWN和占用→解除查询故障→查询恢复；点击“重放同一Fill10次”。 | 保持原clientOrderId，place次数1；最终现金8995、持仓100、业务Fill/入账仅一次，不能靠新增订单恢复。 |

4. 从运行详情打开关联正式页面，执行一次刷新/关闭再打开；核对长任务后台状态、历史证据和加载/失败/陈旧提示。
5. 每项记录实际结果、截图与业务ID。异常场景“预期拒绝”被正确验证时断言可PASS，但被测业务操作仍显示拒绝；若意外接受则断言FAIL。

### 8.4 命令行复验与相同运行核对（待实现）

在项目根目录执行以下目标命令。stage/scenario必须匹配8.3定义；CLI与Web共用场景版本、Fixture和断言。每条命令执行后立即查看退出码，任何非零先保存错误再定位，不能继续假定本阶段通过。

```bash
pnpm verify:stage -- --stage V1.3 --scenario normal --seed 20260907
# 紧接上一命令执行；0表示全部场景断言通过
 echo $?
pnpm verify:stage -- --stage V1.3 --scenario rejection --seed 20260907
 echo $?
pnpm verify:stage -- --stage V1.3 --scenario recovery --seed 20260907
 echo $?
pnpm verify:stage -- --stage V1.3 --suite code
 echo $?
pnpm test:e2e -- --stage V1.3
 echo $?
```

预期：各场景输出testRunId、实际数据/模型/券商模式、断言expected/actual及证据位置；预期内拒绝场景验证成功退出0，意外副作用/缺脚本/缺必需依赖/未满观察条件非零。恢复场景需外部动作时输出已核实目标和步骤，停留WAITING；完成动作后复验原run，不伪称Web可重启宿主。浏览器测试必须实际运行本阶段用例，零用例/全跳过不能退出0。

再对Web中已运行的同一testRunId执行只读核对，避免仅创建新样本掩盖页面问题：

```bash
# 粘贴Web运行详情中的实际testRunId，再按回车；这是普通ID，不是凭证
read -r acceptance_run_id
pnpm verify:stage -- --stage V1.3 --run "$acceptance_run_id" --check-only
 echo $?
pnpm evidence:export -- --run "$acceptance_run_id"
 echo $?
```

check-only仅查询此运行后端事实并追加检查证据，不创建新订单、不重放成交或发起模型调用；空ID/错误stage/越权run必须拒绝。导出只含脱敏数据，输出实际目录和Manifest Hash，不自动勾选人工验收。端到端正常/异常/恢复运行产生不同ID，导出时分别保存。

本阶段代码测试覆盖要求：领域金额/状态机、真实DB并发占用和事务、真事件幂等、FakeBroker API契约、两市场人工/自动授权Web E2E。 在交付时把映射到的实际Domain/DB/契约/服务内测试命令补入本节，注明执行目录、测试文件或套件、退出码和报告；verify:stage必须展示实际调用的测试清单，不能空壳返回0。Python服务使用自身锁定环境，不串用其他服务虚拟环境。

### 8.5 交叉核对、失败定位与恢复

交叉核对：proposal/batch/clientOrderId/fillId关联；独立FakeBroker资产、组合账本与Web资金/持仓相等，费用合计5。

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

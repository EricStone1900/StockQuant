# V3.1 真实 RD-Agent 小样本实验闭环

状态：NOT_RUN；并行准备：`PREPARATION_READY_WITH_BLOCKERS`（[准备证据](../../evidence-v3.1-preparation.md)）。版本入口：[README](./README.md)。共同约束：[三版共同规则](../05-three-version-delivery.md)。

## 1. 前置与范围

V1环境探针缺口已处理；V2数据/回放小样本通过；实际模型Provider、凭证引用与预算可用。

本阶段所有订单、券商资产和成交均来自隔离模拟环境。真实业务数据库、Qlib或RD-Agent在声明“已验证”时必须真正执行；替身需独立标注。

## 2. 开发任务

- [ ] 在现有research-automation-service中封装固定commit的RD-Agent；真实调用模型、生成代码、运行Qlib实验并产出候选，不另建重复rd-agent-service领域。
- [ ] 分别构建控制器与实验镜像；开发挂载源码、运行时Linux内编译，发布安装固定构建产物；记录全部架构/依赖锁/镜像Digest及Qlib fork版本。
- [ ] 实验Runner独立工作区、只读行情、CPU/内存/时间/进程/输出限制；生成代码无Docker Socket/控制器凭证/模型密钥/生产Registry访问。
- [ ] 控制器通过受控Runner管理实验；开发若用宿主Socket只给可信控制器并限隔离开发环境，不能把Socket只读挂载当权限限制；正式部署采用独立研究执行环境。
- [ ] 保存提示词/模型请求与响应摘要、代码、实验输入、错误及预算；故障模拟可验证编排，真实RD-Agent闭环必须有实际模型与代码执行证据。

## 3. 同步 Web 开发

正式页：研究任务配置、预算、轮次、假设、生成代码、实验日志和指标。验收页：真实/回放模型标识、沙箱拒绝、OOM/超时和失败实验。

验收中心路径：`/acceptance/v3/v3.1`（目标路由）。场景参数提交到后端TestRun编排接口，后端调用业务API并汇集证据。浏览器不直接写领域数据，不自行判定成交。该阶段至少提供正常、拒绝/异常场景；适用时增加重试/恢复场景。

## 4. 人工验收步骤

1. 选择已冻结小数据、1～3轮和预算，运行至少一次真实模型→代码→Qlib评价，候选质量差也保留结果。
2. 关闭重开页面查看真实后台任务；检查控制器/实验镜像版本及数据引用。
3. 执行受控越权/超时测试，确认读取非授权文件/连接受限网络被拒绝且其他任务继续。
4. 模拟模型限流或预算耗尽，检查有限重试、明确停止与失败证据。

每次保存testRunId、场景版本、代码/镜像、数据/规则版本、种子及注入事件序列、实际/预期、截图/Trace。判定依据必须是后端事实和独立检查，不能只看Toast成功提示。

## 5. 异常与替身边界

没有凭证或预算时可以完成其他实现，但本阶段真实闭环NOT_RUN；不能用预制因子或录制响应冒充实时模型生成。小样本无有效候选不等于编排失败，评价指标需真实输出。

## 6. 产物与验证

目标产物：research-automation-service、受控Runner、RD-Agent/Qlib实验镜像、模型网关必要能力、研究Web与实验Artifact。

自动验证：实际RD-Agent小实验、真实Runner权限/资源隔离、模型故障与预算、任务/Artifact持久化及研究Web E2E。

需求/测试追踪：RES-01～03、STR-06、AGT-03/07/08必要子集；T13/19/20；DV-07、VT07。

退出条件：开发任务完成、Web真实可操作、全部适用检查PASS、人工签署、已知限制写入证据。填写[本版验收表](./99-acceptance.md)，未完成项不得勾选通过。

## 7. 阶段交付待办（完成后勾选）

以下勾选只记录本阶段交付进度，不能代替第2节逐项开发任务或版本验收结论。开发者凭实现/实测证据勾选开发项；“人工验收”仅在用户实际确认后勾选，不预填PASS。

- [x] 契约、数据结构、场景定义和预期结果已冻结（V3.1 preparation manifest v1；真实模型输出仍未运行）。
- [ ] 第2节后端任务完成，真实依赖与替身明确。
- [ ] 正式Web功能页及验收中心正常/异常场景完成。
- [ ] 命令、实际URL、Fixture路径/Hash和配置说明已补齐，待实现占位已消除或明确列为范围外。
- [ ] 开发者按第8节从准备到导出亲自执行，保存代码版本、退出码、截图/Trace和断言证据。
- [ ] 重复/恢复及适用观察期验证完成，未覆盖项如实记录。
- [ ] 用户已通过Web及命令证据完成人工验收，记录确认时间/结论。
- [ ] 操作说明与限制已更新，[本版验收表](./99-acceptance.md)已同步。

## 8. 阶段验收操作手册

### 8.1 当前可执行性与验收准备

手册状态：VERIFIED_EXECUTABLE（2026-09-21，准备范围；真实 RD-Agent 闭环仍 NOT_RUN）。以下命令、路由和按钮已在本机 Docker Compose 中执行并保存证据；真实模型、Runner 和预算门禁仍按第5节标记为阻塞。

前置服务：research-automation-service、真实RD-Agent控制器、隔离Runner/Qlib镜像、实际模型Provider及核心Paper。

固定输入：冻结小数据、轮数1（再扩至3）、并发1；实际模型/凭证引用/预算由开发交付时填写，秘密不写文档。

| 开发交付时必须填写 | 当前值 |
|---|---|
| 实测代码Commit或工作区Hash/验证日期 | HEAD `5f17f97` + 工作区未提交变更；2026-09-21 |
| 项目根目录、Node/pnpm/Python/uv及Docker版本 | `/Users/huangbosong/Documents/ChatGPT/StockQuant`；Node v24.1.0、pnpm 10.34.5、Docker Server 28.0.4 |
| Web基础URL/身份登录或会话建立方式 | `http://127.0.0.1:8080`；本机验收身份由平台 `STOCKQUANT_LOCAL_DEVELOPMENT_USER=acceptance-owner-1` 注入，不记录凭证 |
| 本阶段Web路由 | `http://127.0.0.1:8080/acceptance/v3/v3.1` |
| 正式页面的真实入口/跳转链接 | 开发验收中心 → V3 → V3.1；当前为准备页，不宣称正式研究页面完成 |
| Fixture文件/数据版本/确切日期/Hash、规则与成本版本 | `fixtures/v3/v3.1/manifest.json`；SHA-256 `f6b318d6208db25c92350e1d2e3ed99d8d7ca1f207927c14e0982e73179b115b`；RESEARCH/FIXTURE/FAKE，轮数1，预算100 cents |
| 配置文件及必需环境变量名/非秘密测试值 | `.env.local`、Compose；`STOCKQUANT_DATABASE_URL`、`STOCKQUANT_RESEARCH_AUTOMATION_URL`、`RESEARCH_AUTOMATION_DATABASE_URL`；真实模型凭证保持 UNSET |
| 外部故障目标及可执行命令、恢复/隔离清理入口 | LIVE 拒绝由 `pnpm verify:stage -- --stage V3.1 --scenario rejection --seed 20260907` 验证；研究数据库使用独立 `research_automation`；保留 TestRun/Artifact，不删除共享卷 |
| 预期耗时、轮询超时、实际观察期/预算 | `stack:up` 约数分钟；场景与 E2E < 30 秒；单实验预算100 cents（实际模型未调用）；健康检查超时由 Compose 3 秒/20 次控制 |

### 8.2 初始化与启动（已验证准备范围）

在上表项目根目录运行；环境变量按上表配置，保持 FAKE 券商与模拟账户。真实模型未配置时，服务必须返回 `PENDING_PREREQUISITES`，不得伪称真实闭环通过。

```bash
# 终端A：先确认实际执行目录为项目根目录
pwd
pnpm install --frozen-lockfile
pnpm stack:up -- --stage V3.1

# 终端B：同一项目根目录，保持开发服务器运行
pnpm dev:web
```

实测：`pnpm stack:up -- --stage V3.1` 构建并启动 PostgreSQL、research-automation-service、platform-api-service 和 Web；本机入口为 `http://127.0.0.1:8080/acceptance/v3/v3.1`，研究服务 `http://127.0.0.1:3008/ready`，平台 API `http://127.0.0.1:3000/ready`。研究数据库首次运行需存在 `research_automation` 角色和数据库；不得删除既有卷重试。Ubuntu/RD-Agent 正式迁移仍未验证。

初始化由验收中心三个准备场景按钮或对应 CLI 入口完成，两者调用同一业务 API。准备后记录 testRunId、namespace 及 Fixture/DataVersion；初始化业务本身是测试对象时不得预先完成被测动作。缺源/凭证/历史数据时显示缺项，不静默换成 Fake 并报真实场景通过。

### 8.3 Web逐步操作及预期结果

1. 打开 `http://127.0.0.1:8080/acceptance/v3/v3.1`，进入“开发验收中心→V3→V3.1”；检查页面版本、模拟模式、服务能力与固定输入。
2. 分别点击三个准备场景按钮，核对后端证据并记下返回的testRunId；正常/异常/恢复使用独立运行，场景内部的重复或恢复操作继续使用原运行及业务幂等键。
3. 按下表执行。当前准备页按钮为“运行正常前置检查”“运行 LIVE 拒绝”“运行取消与幂等恢复”；预期必须从业务明细读取，不能只看“任务完成”。

| 场景ID（阶段内唯一） | 场景 | 点击顺序/输入 | 预期结果与核对点 |
|---|---|---|---|
| normal | 真实研究小实验 | 选择真实模型与预算→轮数1→启动→查看假设、生成代码、Qlib实验及评价；重开页面查询。 | 实际调用与代码执行证据齐备；候选差也保存真实结果，不以预制代码替代真实生成。 |
| rejection | 沙箱与预算 | 选择受控越权/超时/模型限流/预算耗尽子场景，查看Runner和模型错误。 | 实验不能访问Socket/秘密/授权外文件；有限重试、明确停止，核心Paper继续。 |
| recovery | 失败留痕与重试 | 中断单个实验后查看失败Artifact，在新运行中重试；检查旧日志保留及真实/录制标记。 | 不发布半候选、不抹掉失败；新模型结果允许不同；缺凭证或预算不执行真实实验并保持NOT_RUN。 |

4. 从运行详情打开关联正式页面，执行一次刷新/关闭再打开；核对长任务后台状态、历史证据和加载/失败/陈旧提示。
5. 每项记录实际结果、截图与业务ID。异常场景“预期拒绝”被正确验证时断言可PASS，但被测业务操作仍显示拒绝；若意外接受则断言FAIL。

### 8.4 命令行复验与相同运行核对（已验证准备范围）

在项目根目录执行以下命令。stage/scenario匹配8.3定义；CLI与Web共用场景版本、Fixture和断言。2026-09-21 实测三条命令均退出0。

```bash
pnpm verify:stage -- --stage V3.1 --scenario normal --seed 20260907
# 紧接上一命令执行；0表示全部场景断言通过
 echo $?
pnpm verify:stage -- --stage V3.1 --scenario rejection --seed 20260907
 echo $?
pnpm verify:stage -- --stage V3.1 --scenario recovery --seed 20260907
 echo $?
pnpm verify:stage -- --stage V3.1 --suite code
 echo $?
pnpm test:e2e -- --stage V3.1
 echo $?
```

预期：各场景输出testRunId、实际数据/模型/券商模式、断言expected/actual及证据位置；预期内拒绝场景验证成功退出0，意外副作用/缺脚本/缺必需依赖/未满观察条件非零。恢复场景需外部动作时输出已核实目标和步骤，停留WAITING；完成动作后复验原run，不伪称Web可重启宿主。浏览器测试必须实际运行本阶段用例，零用例/全跳过不能退出0。

再对Web中已运行的同一testRunId执行只读核对，避免仅创建新样本掩盖页面问题：

```bash
# 粘贴Web运行详情中的实际testRunId，再按回车；这是普通ID，不是凭证
read -r acceptance_run_id
pnpm verify:stage -- --stage V3.1 --run "$acceptance_run_id" --check-only
 echo $?
pnpm evidence:export -- --run "$acceptance_run_id"
 echo $?
```

check-only仅查询此运行后端事实并追加检查证据，不创建新订单、不重放成交或发起模型调用；空ID/错误stage/越权run必须拒绝。导出只含脱敏数据，输出实际目录和Manifest Hash，不自动勾选人工验收。端到端正常/异常/恢复运行产生不同ID，导出时分别保存。

本阶段代码测试实测清单：`pnpm verify:stage -- --stage V3.1 --suite code`（contracts 21/21、research 单元5/5、PostgreSQL 集成1/1、platform API 单元27/27、Web typecheck，退出0）；`pnpm test:e2e -- --stage V3.1`（Playwright 1/1，退出0）。实际 RD-Agent、Runner 权限/资源隔离、模型故障与预算仍为 NOT_RUN，不能由本准备套件替代。Python服务使用自身锁定环境，不串用其他服务虚拟环境。

### 8.5 交叉核对、失败定位与恢复

交叉核对：modelRunId、代码Hash、Runner镜像、Qlib版本、输入DataVersion和实际费用/估计费用与Web实验一致。

先检查Web与CLI的testRunId、输入/策略/代码版本和模式是否一致，再按Trace查平台、领域、适配器与持久化证据。页面错误而CLI正确，记录Web失败；二者都错则保留领域断言失败。缺能力先查健康/迁移/数据与日志，不修改余额或订单状态使断言通过。

独立复跑创建新run；测试幂等/检查点/重启恢复则使用原run和原幂等键。故障发生后保留旧证据，修复后新增运行或检查记录；不得清空账本、随机更换seed直到通过。真实观察窗口、来源验证和实际模型调用与加速/录制测试分别记录。

### 8.6 验收记录与收尾

| 场景/检查 | Web实际结果与截图 | 命令/退出码/报告 | testRunId/业务ID | 结论 |
|---|---|---|---|---|
| normal | 页面按钮与 CLI 断言 PASS | `pnpm verify:stage -- --stage V3.1 --scenario normal --seed 20260907`，退出0 | `290a08d0-93cc-4147-a072-a7e1f8bb8f8b` | PASS（准备范围） |
| rejection（含全部子场景） | LIVE 拒绝断言 PASS | `pnpm verify:stage -- --stage V3.1 --scenario rejection --seed 20260907`，退出0 | `fdb827dc-b426-48f5-981e-8825813caccf` | PASS（准备范围） |
| recovery（含实际外部动作） | 幂等重复与 CANCELLED PASS | `pnpm verify:stage -- --stage V3.1 --scenario recovery --seed 20260907`，退出0 | `057bc825-9bc5-4b5a-8df5-9e2361dea2b0` | PASS（准备范围） |
| Web同run只读核对与证据导出 | 同一 normal Run check-only PASS；未创建新实验 | `pnpm verify:stage -- --stage V3.1 --run 290a08d0-93cc-4147-a072-a7e1f8bb8f8b --check-only`，退出0 | 同上 | PASS（准备范围） |
| 本阶段代码测试/实际观察适用项 | code suite 与 Web E2E PASS；真实模型/Runner NOT_RUN | 上述 code suite、`pnpm test:e2e -- --stage V3.1` | 见准备证据 | NOT_RUN（真实闭环） |
| 用户人工验收 | 待用户确认 | 不由脚本代签 | 确认人/日期待填 | NOT_RUN |

记录不适用子项的范围依据，不能将必需项改为不适用绕过门禁。归档后在[本版验收表](./99-acceptance.md)填写证据链接和结论。清理只针对本轮已结束的隔离运行，默认保留证据；停止测试不能删除数据库卷或取消无关任务。

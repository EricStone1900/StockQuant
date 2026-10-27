# StockQuant

个人使用的 A 股/美股低频量化研究、历史回测与模拟交易平台。**V1 已批准的 Mac 本地主要功能范围开发与验收完成**；下面是日常使用和原手册的简洁入口。

> 安全边界：本轮 V1～V3 只允许项目自有 FakeBroker、模拟账户、模拟订单和模拟成交。服务端必须拒绝 LIVE 写入、真实券商配置以及券商托管的 Paper API。当前仓库不具备真实下单能力。

## 当前状态

- 2026-10-14：V1 五阶段主要功能、用户验收和正式版本门禁均为 `PASS`（门禁 exit 0），仅覆盖已批准的 Mac 本地范围；[验收表](./docs/prd/v1-local-simulation/99-acceptance.md)记录范围和历史。
- 发布基线标签 `v1.0.0` 指向 `c26c5c4`，文档补充提交为 `45bce40`。已验收源码/配置/Fixture SHA-256 为 `132535fbdf2bf1d50e4260e397424b3a47ef949dedcc62e58257c0a5697bd2d4`。
- V2/V3 已有成果保留；下一轮已整理为[V2逐阶段接续安排](./docs/prd/v2-data-and-replay/00-version-plan.md)，从V2.1本地逻辑与Web缺口开始，当前待启动。V1 后续处理实际使用发现的缺陷。
- 开始工作先看[当前进度与下一步](./docs/progress.md)，再看[文档地图](./docs/README.md)与[唯一当前执行计划](./docs/plans/2026-10-08-v1-completion-plan.md)。
- 版本结论、工程通过、手册可执行和人工签署分别记录；历史PASS不覆盖新增范围。

## 阅读顺序

1. [仓库开发规则](./AGENTS.md)
2. [PRD 入口](./docs/prd/README.md)
3. [三版本共同交付规则](./docs/prd/05-three-version-delivery.md)
4. [架构设计索引](./architecture/README.md)
5. [技术决策记录](./docs/decisions/README.md)
6. 当前版本计划、阶段任务、测试计划和人工验收文档

## 目标目录

```text
apps/web/                         Web 与长期保留的 /acceptance
services/                        按领域拆分的 API 与 Worker
packages/contracts/              Schema 源文件及生成的 TS/Python 契约
infra/compose/                   Mac M1 与本地阶段验证环境
fixtures/                        冻结的确定性输入、Manifest 和预期结果
tests/                           跨服务契约、集成和 E2E 测试
architecture/                    整体、服务、组件与安全设计
docs/prd/                        产品、版本、阶段、测试和验收要求
docs/decisions/                  ADR 与未决事项登记
```

目录存在只表示已经预留边界，不表示对应能力已经实现。

## 启动与主要页面

前置：Mac 本地 Docker Desktop 已运行，Node.js `24.1.0`、pnpm `10.34.5`（见 `.node-version` 和 `package.json`），对应阶段锁定镜像可用。所有命令在仓库根目录执行；缺镜像或依赖时按对应阶段第 8 节处理。Qlib Worker 使用锁定的 `linux/amd64` 仿真环境。

```bash
cd /Users/huangbosong/Documents/ChatGPT/StockQuant
pnpm install --frozen-lockfile  # 首次安装依赖
pnpm stack:up -- --stage V1.3   # 模拟交易；其他功能按下表替换阶段
```

打开本次输出的 `webUrl`，同时保留 `isolatedProject`、`platformApiUrl` 和 `stopCommand`。端口动态分配，旧证据中的 URL 不可复用；V1.2–V1.5 启动终端须保持运行。容器 Web 已包含在启动命令中，日常体验无需另跑 `pnpm dev:web`。

| 要使用的功能 | 启动阶段 | 同一 Web 地址下的路径 | 操作手册 |
|---|---|---|---|
| 账户、双市场初始化与验收中心 | `V1.1` | `/acceptance/v1/v1.1` | [V1.1 手册](./docs/prd/v1-local-simulation/01-environment-and-web-center.md) |
| 冻结小数据、真实 Qlib 训练/预测、研究产物 | `V1.2` | `/acceptance/v1/v1.2` | [V1.2 手册](./docs/prd/v1-local-simulation/02-small-data-and-qlib.md) |
| MANUAL/AUTO、模拟订单/成交、结算与对账 | `V1.3` | `/acceptance/v1/v1.3` | [V1.3 手册](./docs/prd/v1-local-simulation/03-fake-broker-trading-loop.md) |
| 日线回测及固定规则账本报告 | `V1.4` | `/acceptance/v1/v1.4` | [V1.4 手册](./docs/prd/v1-local-simulation/04-daily-backtest.md) |
| 后台 AUTO、日终对账、运行历史与恢复 | `V1.5` | `/acceptance/v1/v1.5` | [V1.5 手册](./docs/prd/v1-local-simulation/05-scheduling-and-recovery.md) |

当前按阶段启动独立隔离环境；切换阶段使用对应启动命令及新输出的 URL。前端存在某条路由不代表当前阶段后端已包含它的全部依赖。`/paper` 属于 V2.4 概览，未作为本轮 V1 主入口。

例如体验交易时，在 V1.3 页面创建隔离 Run，按页面完成建议、审批或授权、执行与账本查询；体验后台时启动 V1.5，在“调度场景”选择“双市场 Fixture 自动交易”，点击“准备 V1.5 场景”，保存 `testRunId`，按原 Run 查看结果。固定输入、按钮、预期金额/数量和恢复步骤以各手册第 8 节为准。

## 停止与保存运行记录

关闭或刷新浏览器后，后台任务仍在运行；重新打开原页面并使用原 `testRunId` 查看。需要保存记录时，在停止前按对应手册的“命令行复验与相同运行核对”设置本次 API 地址和本地会话 Cookie，再导出同一 Run（阶段号须与 Run 一致）：

```bash
pnpm evidence:export -- --stage V1.3 --run "$acceptance_run_id"
```

Cookie 输入与环境变量步骤复用阶段手册，不写入 Git；导出文件是验收证据，不是可恢复的业务数据库备份。

结束本次体验时，在另一个终端执行启动输出中的精确 `stopCommand`，形式为：

```bash
read -r project_id  # 粘贴本次 isolatedProject
pnpm stack:down -- --project "$project_id"
```

**该命令会删除本次隔离项目的容器、数据卷、网络、专属镜像和凭据文件，并非保留数据的暂停。** V1.2–V1.5 对启动终端按 Ctrl+C 也会触发隔离资源清理；需要保留的证据应提前导出。以上环境用于本地 Fixture 体验和验收。

## 备份与恢复入口

V1.5 已实测的本地业务配对恢复复用[第 8.58 节记录](./docs/prd/v1-local-simulation/05-scheduling-and-recovery.md)和第 8.23 节步骤。需要主动复做隔离恢复演练时执行下列现有入口，日常使用无需重复运行：

```bash
STOCKQUANT_V15_E2E_BACKUP_RESTORE=true pnpm test:e2e -- --stage V1.5
```

该脚本创建随机隔离环境，执行 AUTO 业务后封存 PostgreSQL、NATS JetStream、Temporal 和 Artifact 四卷，恢复到新隔离卷，核对原 Run、4 笔订单/Fill、预算与账本 MATCH，以及重复派发无重复业务事实；报告记录归档 Hash，结束后清理源/恢复项目。Artifact 只验证合成内容探针，真实 Qlib 模型跨卷恢复仍未验收。此演练不是活动旧栈的数据备份入口。

活动旧栈或需长期保留的数据，按[服务发布与回退手册](./docs/operations/v1-service-release-order.md)、[数据库迁移手册](./docs/operations/v1-database-migrations.md)和[存储切换手册](./docs/operations/v11-test-run-storage-cutover.md)准备配对备份及隔离恢复；现有 `pnpm backup:create` 仅负责其明确支持的集群数据库/Artifact 流程，不能代替 NATS/Temporal 四卷同点恢复。活动切换仍是单独安排的维护操作。

## 已知限制

- 本次完成范围是 Mac 本地、冻结小数据、双市场 Fixture/FakeBroker；真实行情、新闻和活动策略启用延期，研究结果需要所有者另行批准后才能启用。
- Ubuntu 实机、全市场日历/客户费税、长期实时时钟/睡眠唤醒、容量优化及宿主/异地灾备、生产 RPO/RTO 延期；小样本结果不证明收益或容量。
- 历史失败和缺失 Run 保留原状态；范围及完整限制见[当前进度](./docs/progress.md)与[V1 验收表](./docs/prd/v1-local-simulation/99-acceptance.md)。本页整理已有操作入口，没有新增验收结论。

## 开发原则

- 一次只交付当前阶段所需的纵向切片，不提前启动全部 12 个服务。
- 契约和固定场景先行，后端、正式 Web、验收中心和自动检查同步完成。
- Web 与 CLI 使用相同版本化场景，并分别从业务事实作独立断言。
- 业务时间通过 run-scoped Clock 注入；基础设施超时使用真实单调时钟。
- Fixture、录制响应、免费真实来源、Qlib 和 RD-Agent 的实际执行证据必须明确区分。
- 自动检查通过不能代替用户人工验收，历史失败和证据不得覆盖。

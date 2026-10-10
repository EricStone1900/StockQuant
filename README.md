# StockQuant

个人使用的 A 股/美股低频量化研究、历史回测与模拟交易平台。项目采用文档先行、按阶段纵向交付的方式开发；当前主线为 **V1 小数据本地模拟闭环收尾**。

> 安全边界：本轮 V1～V3 只允许项目自有 FakeBroker、模拟账户、模拟订单和模拟成交。服务端必须拒绝 LIVE 写入、真实券商配置以及券商托管的 Paper API。当前仓库不具备真实下单能力。

## 当前状态

- 2026-10-08实际重跑版本门禁：V1、V2、V3均为 `INCOMPLETE`；未正式关闭阶段分别为5、5、4。
- V1已有Qlib、双市场FakeBroker、Web/CLI、回测和NO_TRADE编排的工程切片；规则一致性、后台交易/日终、完整恢复及当前范围验收仍有缺口。
- 当前只推进V1及必要共享前置，V2/V3已有代码、历史签署与证据保留；不从旧计划自动扩展任务。
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

## 本地环境

Mac M1 日常开发优先使用 Linux ARM64 容器；Web 可以在 macOS 原生热更新，但阶段验收必须覆盖实际容器后端和一次容器化 Web 构建/运行。Qlib 与 RD-Agent 使用分离环境，精确源码 commit、Python 和数值依赖必须在对应阶段真实验证后锁定。macOS 虚拟环境或编译产物不得复制到 Ubuntu。

当前探测到的主机工具仅作为环境事实，不构成项目版本锁。项目锁文件、镜像版本和启动命令完成并实测前，请以阶段文档中的 `DRAFT_NOT_EXECUTABLE` 为准。

## 已有命令入口与验收范围

根 package.json 与锁文件已存在，以下脚本入口已建立；各阶段支持范围和实测前置以第8节手册为准。缺少前置、空测试或只返回任务 ID 都不得视为成功。

```bash
pnpm install --frozen-lockfile
pnpm stack:up -- --stage V1.1
pnpm dev:web
pnpm verify:stage -- --stage V1.1 --scenario normal --seed 20260907
pnpm verify:stage -- --stage V1.1 --suite code
pnpm test:e2e -- --stage V1.1
```

精确可执行目录、URL、Fixture Hash、退出码、恢复步骤与已知缺口见[V1.1 操作手册](./docs/prd/v1-local-simulation/01-environment-and-web-center.md)。

## 开发原则

- 一次只交付当前阶段所需的纵向切片，不提前启动全部 12 个服务。
- 契约和固定场景先行，后端、正式 Web、验收中心和自动检查同步完成。
- Web 与 CLI 使用相同版本化场景，并分别从业务事实作独立断言。
- 业务时间通过 run-scoped Clock 注入；基础设施超时使用真实单调时钟。
- Fixture、录制响应、免费真实来源、Qlib 和 RD-Agent 的实际执行证据必须明确区分。
- 自动检查通过不能代替用户人工验收，历史失败和证据不得覆盖。

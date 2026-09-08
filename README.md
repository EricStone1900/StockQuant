# StockQuant

个人使用的 A 股/美股低频量化研究、历史回测与模拟交易平台。项目采用文档先行、按阶段纵向交付的方式开发；当前从 **V1.1 环境、账户初始化与 Web 验收中心** 开始。

> 安全边界：本轮 V1～V3 只允许项目自有 FakeBroker、模拟账户、模拟订单和模拟成交。服务端必须拒绝 LIVE 写入、真实券商配置以及券商托管的 Paper API。当前仓库不具备真实下单能力。

## 当前状态

- 产品、三版本交付计划和总体/服务架构已经建立。
- 开发启动基线已经建立；业务服务、数据库迁移和 Web 页面尚未完成。
- 所有业务测试和人工验收保持 `NOT_RUN`，不能因存在设计或脚手架而视为通过。
- 当前阶段：[V1.1 环境、账户初始化与 Web 验收中心](./docs/prd/v1-local-simulation/01-environment-and-web-center.md)。

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

## 计划中的命令契约

以下命令由 V1.1 起逐步实现。缺少脚本、空测试或只返回任务 ID 都不得视为成功。

```bash
pnpm install --frozen-lockfile
pnpm stack:up -- --stage V1.1
pnpm dev:web
pnpm verify:stage -- --stage V1.1 --scenario normal --seed 20260907
pnpm verify:stage -- --stage V1.1 --suite code
pnpm test:e2e -- --stage V1.1
```

精确可执行目录、URL、Fixture Hash、退出码和恢复步骤会在阶段实现并验证后写回[V1.1 操作手册](./docs/prd/v1-local-simulation/01-environment-and-web-center.md)。

## 开发原则

- 一次只交付当前阶段所需的纵向切片，不提前启动全部 12 个服务。
- 契约和固定场景先行，后端、正式 Web、验收中心和自动检查同步完成。
- Web 与 CLI 使用相同版本化场景，并分别从业务事实作独立断言。
- 业务时间通过 run-scoped Clock 注入；基础设施超时使用真实单调时钟。
- Fixture、录制响应、免费真实来源、Qlib 和 RD-Agent 的实际执行证据必须明确区分。
- 自动检查通过不能代替用户人工验收，历史失败和证据不得覆盖。

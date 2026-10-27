# 技术决策记录

本目录记录会影响多个服务、契约、数据兼容或部署方式的决策。产品范围以[PRD](../prd/README.md)为准，架构边界以[架构索引](../../architecture/README.md)为准；ADR 不能自行扩大本轮范围。

## 使用规则

- 编号按 `ADR-XXXX` 递增，状态使用 `Proposed / Accepted / Superseded / Rejected`。
- 每份 ADR 记录背景、决策、影响、验证方式和替代方案。
- 已接受决策需要改变时新增 ADR，并把旧 ADR 标为 `Superseded`，不覆盖历史理由。
- 依赖版本、镜像 Digest、端口或硬件预算只有经过对应阶段实际验证后才能标记已冻结。
- 尚不能决定的事项进入[未决事项登记](./open-decisions.md)，必须有最迟阶段和未决时的安全行为。

## 当前 ADR

| ADR | 决策 | 状态 |
|---|---|---|
| [ADR-0001](./ADR-0001-monorepo-and-runtime-isolation.md) | Monorepo 与运行时隔离 | Accepted |
| [ADR-0002](./ADR-0002-contract-first-boundary.md) | Schema-first 跨服务契约 | Accepted |
| [ADR-0003](./ADR-0003-mac-arm64-ubuntu-compatibility.md) | Mac ARM64 与 Ubuntu 兼容策略 | Accepted |
| [ADR-0004](./ADR-0004-local-security-and-test-isolation.md) | 本地安全与测试隔离 | Accepted |
| [ADR-0007](./ADR-0007-v3-cpu-target-architecture.md) | V3 本机开发与 Ubuntu CPU 目标架构 | Accepted |
| [ADR-0008](./ADR-0008-fakebroker-authoritative-event-ordering.md) | FakeBroker 权威订单事件序号与乱序缓冲 | Accepted |

## 决策与阶段验收的关系

ADR 表示设计选择，不表示代码、容器或业务场景已经通过。实现必须更新当前阶段任务、契约、测试和证据；用户人工验收仍需独立签署。

## 当前交付范围决定

- [2026-10-13 V1 Ubuntu实机验收延期](./2026-10-13-v1-ubuntu-deferral.md)：所有者批准延期，不作为V1完成前置；Ubuntu验证仍NOT_RUN。

- [2026-10-13 V1主要功能收尾范围](./2026-10-13-v1-core-closeout-scope.md)：聚焦主要闭环、延期非必要增强、减少重复验证；不自动标记开发或验收完成。

- [2026-10-24 C3本地学习范围收口](./2026-10-24-v22-c3-local-learning-closeout-scope.md)：所有者批准本地软件及受限回放范围PASS，完整历史事实补证延期，C4真实研究独立把关。

- [2026-10-24 C5 Paper启用决定包](../../evidence/audits/2026-10-24-od007-c5-activation-decision-package.md)：列出连续Paper精确参数和剩余接线；候选A已确认用于实现/隔离验证，正式启用未执行。

- [2026-10-24 C5候选A参数确认](./2026-10-24-c5-candidate-a-parameters.md)：所有者批准具体参数用于实现和隔离验证；正式常驻启用仍待完整候选验收后执行。

- [2026-10-26 C5账户有效期规则](./2026-10-26-c5-account-validity.md)：所有者确认账户无独立有效期，执行授权有效期由绑定Mandate控制。

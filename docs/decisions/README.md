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

## 决策与阶段验收的关系

ADR 表示设计选择，不表示代码、容器或业务场景已经通过。实现必须更新当前阶段任务、契约、测试和证据；用户人工验收仍需独立签署。

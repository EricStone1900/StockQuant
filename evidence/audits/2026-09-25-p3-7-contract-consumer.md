# P3.7 契约生成物接入与兼容矩阵

日期：2026-09-25（Asia/Shanghai）。

## 改动

- 契约生成器只收集 `*.schema.json`，不会把兼容矩阵或其他 JSON 当作 Schema。
- 同一生成源新增 Portfolio 服务本地 TypeScript 投影，服务域模型使用生成的 `Money` 和 `Security.market` 类型；运行时仍只依赖服务自身构建产物。
- 新增 `packages/contracts/compatibility-matrix.json` 和 `scripts/check-contract-compat.mjs`，检查稳定字段、稳定枚举值以及 TS/Python 生成类型，已接入 `pnpm contracts:check`。

## 验证

- `pnpm contracts:check`：25 个 JSON、14 个 Schema、8 个 Fixture 实例通过；13 个生成类型和 3 条兼容规则通过。
- `pnpm --filter @stockquant/portfolio-risk-service typecheck`：退出 0。
- Portfolio 单测：1 个测试文件、2/2 通过。
- `pnpm build`、`pnpm typecheck`：全仓通过。
- `pnpm test:ops`：82/82 通过；`pnpm docs:check`：472/472；`git diff --check`：通过。

## 状态与边界

P3.7 已完成生成物漂移、兼容矩阵和一个真实跨服务类型消费者的工程接入。OpenAPI、其他业务客户端和正式发布流程仍未实现；因此契约工作包整体仍为 PARTIAL，不能据此宣称版本完成。

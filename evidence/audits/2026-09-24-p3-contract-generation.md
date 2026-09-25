# P3.1 契约生成入口

日期：2026-09-24（Asia/Shanghai）。

## 改动

- 新增 `scripts/generate-contract-types.mjs`，以 `packages/contracts/**/*.schema.json` 为唯一输入。
- 新增 `pnpm contracts:generate`；`pnpm contracts:check` 现在同时执行 Schema/Fixture 校验和生成物漂移检查。
- 生成 `packages/contracts/generated/types.ts` 与 `packages/contracts/generated/types.py`，文件头标记为 generated，不直接手改。
- 更新 `packages/contracts/README.md`，明确生成入口、当前覆盖边界和未完成的 OpenAPI/兼容流程。

## 验证

- `pnpm contracts:generate`：退出0，13个 Schema 生成两份类型文件。
- `pnpm contracts:check`：退出0，24个 JSON、14个 Schema、8个 Fixture 实例通过，生成物无漂移。
- `PYTHONPYCACHEPREFIX=/tmp/stockquant-pycache python3 -m py_compile packages/contracts/generated/types.py`：退出0。
- `pnpm --filter @stockquant/platform-api-service exec tsc --ignoreConfig --noEmit --target ES2022 --module ESNext --moduleResolution Bundler ../../packages/contracts/generated/types.ts`：退出0。
- 生成入口接入后重跑 `pnpm verify:stage -- --stage V2.4 --suite code`：退出0；完整构建、lint、typecheck、TS/Web 测试、Python 55项、运维82项和隔离 PostgreSQL 17项均通过。

## 未完成与边界

生成器当前覆盖公共值对象/消息的类型骨架；尚未生成 OpenAPI、运行时解码器、跨版本兼容矩阵或把全部服务客户端切换到生成类型。P3 仍为 PARTIAL，V1/V2/V3 的人工验收状态不变。

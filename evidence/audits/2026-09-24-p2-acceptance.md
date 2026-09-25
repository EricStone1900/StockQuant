# P2 验收与契约门禁验证

日期：2026-09-24（Asia/Shanghai）。基线：`132f3a6055b7a2cf124dd489ca71d0983c64698d`。

## 已完成改动

- `scripts/verify-stage.mjs` 统一要求 `COMPLETED`、至少一条断言且所有断言为 `PASS` 才返回0；失败返回1，前置/观察未完成返回2。
- `--run RUN_ID --check-only` 对 V1.2、V1.3、V1.4、V1.5、V2.x、V3.1 读取并核验原始 TestRun，不初始化、下单、重放或调用模型。
- `scripts/verify-version.mjs` 增加版本总结未完成和版本门禁未勾选检查；当前 V1/V2/V3 仍返回 `INCOMPLETE`/退出2。
- `scripts/validate-json.mjs` 增加 JSON Schema 2020-12、UUID/date-time 格式、跨文件 `$ref` 和 Fixture `$schema` 实例校验。
- 修正六个 Fixture manifest 的相对 schema 路径；未改动 Fixture 数据内容，哈希保持有效。
- 根工作区增加锁定的 `ajv@8.20.0`、`ajv-formats@3.0.1` 开发依赖。

## 反例与自动化证据

- `pnpm test:ops`：82/82 通过；其中新增反例覆盖“完成但无断言返回2”和“失败运行返回1”。
- `pnpm contracts:check`：退出0，24个 JSON、14个 schema、8个 Fixture 实例通过，0 failures。
- `pnpm test:contract`：退出0，契约与10个 Fixture 文件哈希检查通过。
- `pnpm verify:version -- --version V1/V2/V3`：均保持 `INCOMPLETE`，未把未完成版本误报为 PASS。
- 隔离 TestRun `755cb415-0f1d-433a-aaa4-6378d5e7f1cf` 的 V2.4 `--check-only`：退出0，3条断言全部 PASS；业务状态保持 Paper `WAITING` 8/20。

## 完整代码门禁

命令：`pnpm verify:stage -- --stage V2.4 --suite code`（使用 P1 的 `market_data_test`，需要本机端口权限）。

- 退出0。
- 文档链接 466/0；契约 24/14/8/0；Fixture 哈希10/0。
- 9个工作区构建、lint、typecheck 和 TypeScript/Web 测试通过。
- Python 适配器 55/55；运维测试 82/82；PostgreSQL 集成测试17/17。
- 首次沙箱运行因 `127.0.0.1:5433` 连接权限得到 EPERM，未形成业务失败；在允许访问已运行隔离数据库后重跑通过。

## 当前边界

P2 已完成脚本退出码、版本门禁和 JSON Schema 语义校验。Schema 生成器/TS-Python 生成物、持久 TestRun、统一身份和正式账户详情仍属于 P3，不能据此把 V1/V2/V3 版本或人工验收改为 PASS。

# V1.1 TestRun响应消费者映射 A46

日期：2026-10-11

## 核对范围

逐项比较公共 `common/test-run.schema.json`、Platform API 的 V1.1 本地持久化类型、`GET /api/v1/acceptance/runs/:testRunId` 现有 Web 调用点，并检查 V1.1 owner scope 和状态/断言的实际字段来源。用户界面通过该 GET 读取 Run，并按 `testRunId`读取、刷新以及恢复同一记录。

## 发现和处理

- 公共 `TestRun` 是跨服务记录契约，要求 `environmentMode`、`brokerMode`、`dataMode` 和 `clock`。
- V1.1 的本地 `TestRun` 是 Platform 持久化类型，具备 `ownerId`、`error`、账户与生命周期字段；查询接口还附带 `assertions`。V1.1当前持久化事实没有完整保存公共模式与Clock字段，因此把本地数据强制转换为共享 `TestRun` 会补造元数据。
- 该读接口现在拥有独立 `V11AcceptanceRun` response schema 和 `platform-v11-acceptance.v1` OpenAPI 声明；Platform handler返回值采用生成类型，OpenAPI checker检查创建/读取操作、owner-scoped Read以及响应schema引用。

## 验证与边界

`pnpm contracts:check`、Platform API typecheck通过；V1.1完整代码套件受控回环运行退出0，验证生成类型漂移、所有权读接口集成、Platform全量单测和隔离数据库/HTTP回归。完整日志、退出码与SHA见[本次套件记录](./2026-10-11-v11-api-response-contract-code-suite-a02.log)、[exit](./2026-10-11-v11-api-response-contract-code-suite-a02.exit.txt)及[SHA-256](./2026-10-11-v11-api-response-contract-code-suite-a02.log.sha256)。

这是编译时返回类型和契约结构检查，不是每个HTTP响应的运行时JSON Schema验证；不证明所有其他公共类型消费者、跨服务完整发布/回滚矩阵、活动存储切换或人工验收。V1.1-S2-L13 / P1仍未关闭。


Compatibility matrix now pins the required response properties and stable V1.1 stage/scenario/status enums for this projection. `pnpm contracts:check` reports 112 consumer rules.

The crosswalk row now includes the compatibility-matrix source. Updated crosswalk SHA-256: `46f0a170864b92a0288265114cebf557fe12ec81425218437f8675db46903c6a`.

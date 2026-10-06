# V3.2 Quant Registry → Decision Governance 生成客户端增量

日期：2026-09-30。范围：已批准策略版本的下游Mandate审核准备读取，不触发激活或真实交易。

检查发现 `quant-promotions.v1` 对 `/v1/registry/versions/{versionFingerprint}` 仅声明`platform-api-service`身份，但 Quant Research 服务实际身份门禁及 Decision Governance调用已允许`decision-governance-service`。这会使契约与真实安全边界不一致。现将此操作的调用身份精确声明为 Platform API 或 Decision Governance 两者；其他Promotion读取操作仍限Platform。OpenAPI检查强制精确身份集合与顺序，防止扩权漂移。

新增由该OpenAPI生成的 Decision Governance Quant Registry客户端，校验HTTP(S)端点、独立Bearer和小写SHA-256 fingerprint，明确发送`decision-governance-service`身份。候选Mandate readiness中的Registry读取改用生成客户端。网络错误继续转换为WAITING；上游HTTP 404/状态和响应体仍传给领域判断。精确版本及候选Artifact匹配只给出审核准备结论，`mandatePersistence=NOT_PERFORMED`，不会激活策略。

验证结果：

| 命令/检查 | 结果 | 证据 |
|---|---|---|
| `pnpm contracts:generate` | PASS | 113 schemas；新增Decision Governance生成类型副本及Quant Registry一操作客户端 |
| `pnpm contracts:check` | PASS，退出0 | JSON/OpenAPI/生成漂移/96消费者兼容规则全通过；精确身份允许列表检查通过 |
| Governance build | PASS，退出0 | TypeScript编译 |
| `pnpm --filter @stockquant/decision-governance-service test` | PASS，退出0 | 5文件19单测，含生成客户端身份、路径、状态和拒绝无效输入 |
| `pnpm verify:stage -- --stage V3.2 --suite code` | PASS，受控loopback权限下退出0 | Platform与Governance身份读取精确fingerprint，Research Automation身份403；真实Governance→Quant Registry Mandate readiness匹配通过，版本/Artifact不匹配与未知版本拒绝；独立复算、隔离PostgreSQL/HTTP、全仓build/lint/typecheck/unit、容器和Web校验通过 |

普通沙箱首次V3.2套件因HTTP smoke不能监听127.0.0.1而退出1，保留失败；受控权限重跑通过。隔离套件未触碰活动服务或市场源，`activeRegistryMutation=NOT_PERFORMED`，`humanAcceptance=NOT_RUN`。这只是跨服务契约和读取准备边界的修复，不构成真实候选研究、用户批准消费、V3.2阶段验收或V1.1整体完成。详见套件输出：真实Registry身份/读取及Mandate binding断言；完整增量覆盖以本审计中的固定代码和命令为准。

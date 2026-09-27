# 跨服务契约

状态：S0_SOURCE / GENERATED / COMPATIBILITY_CHECKED。规范见[ADR-0002](../../docs/decisions/ADR-0002-contract-first-boundary.md)和[市场契约](../../docs/prd/03-market-rules-and-contracts.md)。

`schemas/` 是公共值对象与消息的规范源。`pnpm contracts:generate` 从这些 Schema 生成 `generated/types.ts`、`generated/types.py`，以及 Portfolio、Platform、Quant、Research Automation、Historical Replay Worker 和 Market Data 服务使用的本地 TypeScript 投影；`pnpm contracts:check` 会验证 JSON Schema、Fixture 实例、生成物漂移和 `compatibility-matrix.json` 中登记的稳定字段/枚举。OpenAPI 清单覆盖 Portfolio 账户（含预留与Fill）、Trade Execution历史FakeBroker执行与V2.4只读就绪、Historical Replay Worker同步/异步提交及运行生命周期、Research Automation Runner Host租约生命周期与Platform V3.1/V3.2/V3.3所消费的Experiment、预算、Artifact、Runner、Fixture模型、Promotion及队列API、V2.4观察/修订、量化候选/晋升、分钟 CSV 和 A 股日历 API。其他Research Automation运维/内部路径仍需逐项盘点；完整发布流程及其他跨服务业务边界仍未实现，因此阶段任务不能勾选全部完成。

规则：

- 金额使用 Decimal 字符串，不使用 JSON number。
- 所有时间戳必须是含偏移的 ISO-8601；业务 Clock 必须显式携带。
- SecurityId 是稳定 UUID，ticker 只作带有效期的别名。
- environmentMode、brokerMode、dataMode、executionModel 分开。
- `LIVE` 保留为长期枚举值，但 V1～V3 的运行时配置和写命令必须拒绝。
- 修改 Schema 后必须重新生成类型并执行兼容检查；A 股日历响应现在由 Market Data 和 Platform 共用生成类型，并有 `market-data-calendar.v1` OpenAPI 清单。历史FakeBroker执行命令/结果已生成到共享TS/Python类型，OpenAPI限定`historical-replay-worker`及独立Bearer；历史回放Worker入口命令使用生成类型并由运行时解析器校验，OpenAPI覆盖单Bar/多Bar同步/异步提交、运行读取/控制与UNKNOWN恢复，Platform消费端HTTP client从OpenAPI生成。Runner Host HTTP wrapper 使用生成Schema类型，OpenAPI限定其Bearer身份并覆盖claim/input/heartbeat/complete及fencing字段，生命周期client从OpenAPI生成。Platform对Research Automation的V3.1 Experiment创建/取消、Runner dispatch/read/cancel、Artifact publish/read、Fixture模型调用和预算读写由13操作生成client消费；V3.2 guarded Promotion submit由另一个单操作生成client消费；V3.3队列/游标/预算读取也由同一client覆盖。客户端使用每服务独立Bearer，创建请求写入所属TestRun，派发要求持久TestRun绑定及RESERVED预算，V3.3读取仍先执行用户/Run所有权门禁。Runner cancel目前只有契约与client，尚无产品调用方或接受的恢复流程。其他服务间客户端仍需后续切片。

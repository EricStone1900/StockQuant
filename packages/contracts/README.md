# 跨服务契约

状态：S0_SOURCE / GENERATED / COMPATIBILITY_CHECKED。规范见[ADR-0002](../../docs/decisions/ADR-0002-contract-first-boundary.md)和[市场契约](../../docs/prd/03-market-rules-and-contracts.md)。

V3.3 per-TestRun预算上限由仅限Platform service bearer的Research Automation操作在Experiment创建前绑定，复用相同上限幂等，冲突或超出现有服务硬上限时拒绝。请求和响应使用版本化Schema并由Platform生成客户端消费。

`schemas/` 是公共值对象与消息的规范源。`pnpm contracts:generate` 从这些 Schema 生成 `generated/types.ts`、`generated/types.py`，以及 Portfolio、Platform、Quant、Research Automation、Historical Replay Worker 和 Market Data 服务使用的本地 TypeScript 投影；`pnpm contracts:check` 会验证 JSON Schema、Fixture 实例、生成物漂移和 `compatibility-matrix.json` 中登记的稳定字段/枚举。OpenAPI 清单覆盖 Portfolio 账户（含预留与Fill）、Trade Execution历史FakeBroker执行、V2.4隔离Paper快照执行/按clientOrderId恢复与只读就绪，Decision Governance V2.4隔离授权/撤销及Replay BACKTEST/FAKE授权、Historical Replay Worker同步/异步提交及运行生命周期、Replay至Quant的Fixture多Bar摘要、Research Automation Runner Host租约生命周期与Platform V1.2固定Fixture、Qlib/RD-Agent探针/因子预览及V3.1/V3.2/V3.3所消费的Experiment、预算、Artifact、Runner、Fixture模型、Promotion及队列API、V2.4观察/修订、量化候选/晋升、分钟 CSV/Parquet导入与上传、A股日历，以及V2.1 Market Data来源/采样/Watchlist/新闻/行情和熔断操作。V1.2 Quant preview及V2.1 Market Data使用独立生成客户端；V2.2分钟客户端另覆盖冻结Fixture预览/导入。Runner Host的claim/input/heartbeat/complete和OUTPUT Artifact发布共5个OpenAPI生成操作，Research→Quant Promotion submit也使用独立生成客户端。Platform对V2.4市场观察、治理授权、执行就绪和Paper执行的业务HTTP调用使用生成客户端；剩余直接`/ready`请求仅用于服务健康探测。其他Research Automation运维/内部路径仍需逐项盘点；客户端/Schema变更的生产发布、活动服务切换及回退流程尚未完成，因此阶段任务不能勾选全部完成。

V1.3 `/api/v1/acceptance/v1/v1.3` 的固定场景、WAITING请求/响应及 owner-scoped 查询现有 `v13-acceptance.v1` OpenAPI 与生成类型。该契约严格表达当前尚未执行治理/交易业务的边界；真实服务工作流接入时需通过新的兼容版本扩展，不能把 WAITING Schema 当作阶段完成证据。

规则：

- 金额使用 Decimal 字符串，不使用 JSON number。
- 所有时间戳必须是含偏移的 ISO-8601；业务 Clock 必须显式携带。
- SecurityId 是稳定 UUID，ticker 只作带有效期的别名。
- environmentMode、brokerMode、dataMode、executionModel 分开。
- `LIVE` 保留为长期枚举值，但 V1～V3 的运行时配置和写命令必须拒绝。
- 修改 Schema 后必须重新生成类型并执行兼容检查；A 股日历响应现在由 Market Data 和 Platform 共用生成类型，并有 `market-data-calendar.v1` OpenAPI 清单。历史FakeBroker执行命令/结果已生成到共享TS/Python类型，OpenAPI限定`historical-replay-worker`及独立Bearer；Replay Worker向Governance申请精确BACKTEST/FAKE授权、向Quant提交Fixture多Bar摘要也已迁为版本化OpenAPI和生成客户端；回放Worker入口命令使用生成类型并由运行时解析器校验，OpenAPI覆盖单Bar/多Bar同步/异步提交、运行读取/控制与UNKNOWN恢复，Platform消费端HTTP client从OpenAPI生成。Runner Host HTTP wrapper 使用生成Schema类型，OpenAPI限定其Bearer身份并覆盖claim/input/heartbeat/complete及fencing字段，生命周期client从OpenAPI生成。Platform对Research Automation的V3.1 Experiment创建/取消、Runner dispatch/read/cancel、Artifact publish/read、Fixture模型调用和预算读写由13操作生成client消费；V3.2 guarded Promotion submit由另一个单操作生成client消费；V3.3队列/游标/预算读取也由同一client覆盖。客户端使用每服务独立Bearer，创建请求写入所属TestRun，派发要求持久TestRun绑定及RESERVED预算，V3.3读取仍先执行用户/Run所有权门禁。Runner cancel目前只有契约与client，尚无产品调用方或接受的恢复流程。Platform对V2.4市场观察、治理授权、执行就绪、Paper执行均有生成客户端；V2.4隔离Paper边界有Fixture授权、快照执行与恢复的OpenAPI/兼容规则。V2.4 Web/API/CLI normal/rejection/recovery目前均有同Run隔离Fixture证据；正式Paper业务链和人工验收仍待完成。直接`/ready`探测保留为健康检查，不作为跨服务业务调用。其他服务间客户端及发布/回退流程仍需后续收敛。


Quant Research → Qlib Worker 的 `/probe`、`/qlib/fit-fixture`、`/train` 与 `/validate` 现有独立 `quant-research-qlib-worker.v1` OpenAPI 和生成客户端，调用使用 `quant-research-service` 专属Bearer；契约检查验证身份、路径与请求/响应Schema。Summary train/validate明确只是Fixture摘要与哈希复算，不是模型训练或独立模型验证。

2026-10-03 V2.4 告警接口：`market-data-calendar.v1`现包含Bearer保护的活动Incident读取与确认操作，响应/请求Schema均生成到共享TS/Python类型，Platform使用生成客户端代理当前会话身份。Web告警操作不触发行情、调度或交易。

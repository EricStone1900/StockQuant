# 跨服务契约、存储与时间设计

状态：设计/NOT_RUN。规范来源：[市场契约](../docs/prd/03-market-rules-and-contracts.md)和[三版规则](../docs/prd/05-three-version-delivery.md)。扩展实体/路由先冻结Schema再生成Client，不将设计表名当已完成迁移。

## 1. 身份与模式

SecurityId稳定，ticker/venue/market/currency分开，历史代码按有效期查询。Portfolio初版绑定单账户/市场，多策略共享账户级资源账。

environmentMode为BACKTEST/PAPER/SHADOW/LIVE，本轮拒绝LIVE。dataMode/modelMode/brokerMode/executionModel独立；FIXTURE、FAKE、录制响应和SNAPSHOT不是环境枚举。testRunId/namespace贯穿缓存、事件、订单、账本与Artifact，隔离是服务端规则。

## 2. HTTP与事件

写命令有Idempotency-Key/Correlation-Id、expectedVersion、reason/sourceRef；actor来自可信上下文。同键同载荷返回原结果，异载荷409。读请求也校验账户/run范围，内部API不豁免身份。

错误含code/message/category/retryable/correlationId/details；HTTP语义沿用原契约。订单发送不确定返回acceptanceStatus=UNKNOWN，不因retryable=true自动再place。202仅受理，必须查询结果及断言。

Event Envelope含eventId/subject/schemaVersion/producer/occurredAt/availableAt/correlationId/aggregateId/aggregateVersion/payload；账户事件带account/market/environmentMode/run范围。沿用市场契约第8节subject，新增新闻/研究/测试事件在S0冻结。大对象只传Artifact引用。

业务+幂等+Outbox同事务，消费者Inbox+副作用同事务后ACK。至少一次投递经去重收敛，版本缺口回查/缓冲。死信/重放保留事件身份，重建投影不重新发交易。

## 3. 数据库与Artifact

各域独立DB/User/迁移，禁止跨库写和共享业务ORM。NATS、Temporal、Redis不能代替账本/授权/发送日志；缓存可重建，键含数据/规则/策略版本和运行范围。

ArtifactRef含uri/sha256/schemaVersion/mediaType/byteSize/accessScope。先完成文件与Hash检查，再事务发布元数据/latest/事件；失败不发布半份。对象存储权限按服务/前缀约束，临时孤立产物按明确保留策略清理。

MinuteBar分区和索引按频率/日期/证券等选择，V2实测冻结。行情矩阵、代码、模型、报告不塞入关系表大行或消息/工作流历史。

## 4. 时间与数值

UTC持久化，交易/结算日按IANA市场日历。occurredAt/publishedAt/ingestedAt/availableAt分别记录，availableAt≤decisionAsOf。日期公告无精确时间按保守政策，源公开与系统已采集回放模式分别命名。

Clock按run隔离：SystemClock真实时钟Paper、SimulationClock历史回放、FixedClock单测。授权/预算日切/会话/结算/绩效用同一业务时间，网络超时用真实单调时间。

Money为Decimal字符串+币种，数量/费用舍入版本化；CNY净值不替代USD购买力，结算不等于可卖资格。研究浮点容差预定义，规范结果Hash与原始文件Hash分开，真实LLM重新生成不承诺相同。

## 5. 事务与恢复边界

| 场景 | 本地事务 | 跨域收敛 |
|---|---|---|
| 初始化 | 组合期初/幂等 | 平台仅持TestRun引用 |
| 授权 | 治理预算/批准/授权 | 组合资源、执行接受用Saga/查询 |
| 批次接受 | 执行Batch/全部Intent/幂等/Outbox | 接受事件迟到时治理仍保留占位 |
| Fill | 执行归一化/Outbox；组合Inbox/入账各自提交 | 重投去重、差异对账 |
| 检查点 | 各域业务本地提交 | 屏障收集确认版本/游标后持久化 |
| 人工验收 | 平台追加AcceptanceRecord | 引用证据，不改变交易事实 |

平台投影带asOf/版本/质量；关键写回到权威域，部分依赖失败明确返回，不以零现金/空订单掩盖失联。

## 6. Schema与迁移门禁

S0明确字段/枚举/状态机/索引/唯一约束/错误，生成TS/Python Schema/Client并做契约检查。破坏性变更使用新版本和兼容迁移；先验证消费者再切换。修订/冲正保留原证据，不覆盖历史账本。

备份恢复/回滚需兼容已写数据，不自动释放UNKNOWN资源或重复初始化。所有业务验证当前NOT_RUN。

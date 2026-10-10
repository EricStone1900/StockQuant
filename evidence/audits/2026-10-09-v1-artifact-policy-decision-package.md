# V1 Artifact 保留与物理清理决策包（OD-013）

日期：2026-10-09（Asia/Shanghai）。状态：供项目所有者决策；当前不授权配置默认过期、调度状态变更或删除字节。

## 范围与已知事实

本决策只覆盖V1为Artifact引用/交付所依赖的保留、保护和物理清理边界，不扩展到真实来源或研究功能。

- 当前内容寻址卷同时服务V3.1 Research Automation Runner和V1.2 Platform/Qlib；这两个版本的引用元数据分属各自服务，不能把整个卷都视为V1数据。V1.2旧Artifact还可能在Platform JSONB中。
- TestRun/Evidence Export持有引用或用户选定的导出包，不拥有Research/Qlib原始字节。Market Data按项目/数据版本保存关系型数据集，当前不应擅自迁入共享文件后端。
- Research/Platform已有PUBLISHED、RETAINED、EXPIRED生命周期字段/状态及到期访问限制；没有统一调度器或获准的物理过期清理。物理清理必须能检查所有producer引用、导出引用、用户保护/审计约束，并隔离并发发布。
- ADR-0006接受的是备份副本30个自然日和12个月末保留，不是生成Artifact的期限，不能直接复用。
- 现有生产器要求写入方和Artifact发布方按精确数据库/卷身份停止后才能产生配对备份；不适用于在线Artifact回收器。

## V1范围内的实际产物与保护边界（源代码核对）

| V1阶段/数据 | 字节与权威元数据 | 生命周期/读取约束 | OD-013处理边界 |
|---|---|---|---|
| V1.2 Qlib策略模型/预测Artifact | 新模型与预测规范化字节进入共享内容目录；`qlib_fixture_artifacts`由Platform API保存TestRun、owner、媒体类型、SHA、状态和可选到期字段。旧记录仍可能在JSONB保有payload | TestRun与owner复合范围；PUBLISHED/RETAINED读取；读取时重算内容Hash；取消/发布由Run行锁fence | 是V1动态字节Artifact。检查候选时须同时覆盖metadata DB、当前/旧payload存储、Run/export引用及正在发布/读取的任务；当前不调度过期或删除 |
| V1.4 Quant回测结果与报告Manifest | Quant Research在`v14_backtest_runs`/Manifest关系表中保存报告JSON及结果/Manifest Hash；Platform把完整报告payload和公共ArtifactRef投影到V1.4 TestRun evidence JSONB | Quant以原BacktestRun ID幂等保存；Platform只为COMPLETED且断言全PASS的同TestRun投影`BACKTEST_REPORT`；读取须经owner/TestRun scope和结果Hash验证；取消/FAILED不投影 | 是数据库持久报告和引用，不是共享目录对象；必须共同恢复Quant Run、Manifest与Platform TestRun关联 |
| V1.1/V1.3/V1.5 TestRun、订单/Fill/账本/工作流 | Run metadata由Platform存储；订单/Fill/资产/账本、Mandate/授权、NATS/Temporal状态由各领域服务持有；这些业务事实可被报告/导出引用，但不是可删Artifact bytes | 业务ID、owner/Run隔离，服务各自幂等和恢复；关闭或导出Run不授权删除领域事实 | 归为受保护业务证据/权威账本引用；独立Artifact过期不能触发订单、Fill、账本、授权或工作流删除 |
| 冻结V1 Fixtures与本地Evidence Export | Fixtures在版本控制中以manifest/hash冻结；导出由调用者显式选目录并包含Run/evidence/manifest/hash | Fixture变更必须新建版本；导出目录不由Artifact服务管理，历史验收签名/失败记录需保留 | Fixture、签名/验收、失败/恢复执行记录建议列为保护类别供所有者确认；不得纳入自动清理 |

本表是源代码/架构边界盘点，不是数据库全量清点或删除候选证明。尚未找到V1.3/V1.5独立通用字节Artifact生产者；它们的业务事件、Run evidence和Temporal/NATS事件仍属于应保护的运行事实。V1.4回测报告写入Quant DB再投影Platform evidence，不应误报为Research共享文件卷对象。V1.2 shared content metadata存在新/旧两种字节表示，必须共同纳入恢复与引用审计。

依据：[OD-013](../../docs/decisions/open-decisions.md)、[生产者/所有者盘点](./2026-10-02-w1-artifact-producer-inventory.md)、[2026-10-10当前源码复核](./2026-10-10-v1-artifact-producer-inventory-a01.md)、[V1.1共享Artifact现状](../../docs/prd/v1-local-simulation/01-environment-and-web-center.md)、[ADR-0006](../../docs/decisions/ADR-0006-backup-retention-rpo-rto.md)、[配对备份审计](./2026-09-25-p3-backup-retention.md)。A01按当前调用/持久化点更新V1.2、V1.4、Market Data与V3.1共享卷边界，不构成运行时数据清点或删除批准。

## 需要所有者给出的精确选择

| 决策维度 | 可选回答 | 未答前行为 |
|---|---|---|
| 临时研究产物的最长保留期限 | 指定日历天数/时间基准；或明确不自动到期 | 不配置默认`expiresAt`，不调度到期状态 |
| 必须长期保护的类别 | 指定按Artifact类型/关联业务ID的保护类别；说明保护期或“永久” | 仅保留现有显式引用；不推断用户/验收/交易证据可删除 |
| 用户显式保留/Legal hold | 是否需要及其授权来源、解除人、审计要求 | 无保护解除能力，不执行物理清理 |
| 物理字节清理授权 | 是否允许；只能在共享引用权威可核验、无活动读取/发布、精确内容Hash确认时执行 | 无物理删除，不把EXPIRED状态当作已删除 |
| 保留/清理观察 | dry-run频率、输出审查人与失败处置 | 仅人工只读盘点；无后台定时任务 |

这些选项不含预填期限或默认保护类别，避免把工程建议误当成所有者决定。回答应按Artifact类别逐项明确；对未列类别继续fail-closed。

## 技术放行条件（决策通过后仍须完成）

1. 建立可复核的跨Research/Platform/TestRun引用查询或等效一致性协议；必须覆盖新旧存储和旧路径，不允许仅凭单一服务的数据库判断“无引用”。
2. 以固定隔离Fixture覆盖仍被另一服务引用、用户保留、活动发布/读取、Hash不符、符号链接、竞争发布、重试和备份/恢复后的行为。出现任一不确定事实时只能保留内容。
3. 生命周期状态更新与字节回收分开；先dry-run输出候选、原因、完整引用检查和Hash，经过人审后按精确候选清理。保存不可覆盖审计证据；失败不得扩大到目录递归删除。
4. 完成目标数据库/内容卷的配对备份恢复，检查原ArtifactRef、业务Run、全部字节Hash和继续读取；记录与OD-011/ADR-0006相符的恢复实测边界。
5. 更新ADR/OD-013、Artifact合同、服务设计、V1.1第2/7/8节及验收记录。只有策略测试和明确授权通过后才讨论活动部署；本包不请求也不执行活动清理。

## 当前结论

OD-013维持OPEN。V1 Artifact统一引用/读取和内容完整性已有工程证据；保留政策、全引用权威、状态调度、活动部署和物理清理仍未通过。该决定阻塞V1.1的Artifact生命周期/清理验收，不阻止安全的Fixture和只读导出工作。

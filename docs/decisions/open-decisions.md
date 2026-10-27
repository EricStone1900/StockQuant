# 未决事项登记

状态：ACTIVE，更新日期：2026-10-26。未决不等于可以任意默认；到达最迟阶段仍未确认时，按“安全行为”阻塞对应能力并保留 `NOT_RUN`。

OD-008本轮补充：项目所有者已确认本项目仅供个人本地学习使用。对该受限范围，不再把逐源供应商书面授权设为所有实测的普遍前置条件；改为逐源记录当前公开条款、精确端点、请求预算、字段/保留期和不共享边界，并在出现明确禁止、登录/付费墙或访问限制时停止。详见[2026-10-21个人本地学习适用性复核](../../evidence/audits/2026-10-21-od008-local-learning-review.md)。新闻候选文章发现/修订持久化与Worker故障恢复已有本地验证，不能替代来源实际能力。腾讯行情与两新闻文章、独立eastmoney-daily当前日日线已在有界一次性环境实测，实际Worker→Monitor/PG闭环通过；OD-008总体PARTIAL，见[C2收口审计](../../evidence/audits/2026-10-21-v21-c2-closeout.md)。未启用活动常驻采集、未外发询证消息。

| ID | 决策 | 负责人 | 最迟阶段 | 未决时的安全行为 | 状态 |
|---|---|---|---|---|---|
| OD-001 | Node、pnpm、TypeScript、Web/服务框架精确版本 | 开发者 | V1.1 开始实现前 | Node 24.1.0、pnpm 10.34.5、依赖锁和容器构建已验证 | ACCEPTED（`package.json`、`pnpm-lock.yaml`、Build 证据） |
| OD-002 | V1.1 Python 版本及 uv 工具版本 | 开发者 | V1.1 Python 服务建立前 | Python 3.9.6、uv 0.12.7 已记录；Python 适配器独立 `uv.lock` 已验证，正式服务矩阵仍需补齐 | PARTIAL |
| OD-003 | PostgreSQL、Artifact 实现、容器镜像、端口和卷名 | 开发者 | V1.1 Compose 建立前 | Compose、PostgreSQL、服务端口/卷和 `stack:up` 已实现并有容器证据；研究 Artifact 已有受限文件发布/读取、SHA-256校验、PostgreSQL引用索引和具名持久卷。配对备份Manifest、生产器与默认dry-run保留清理器（每日30日、月末12个月）已有实现；生产器要求逐次确认写入方/发布方已暂停，在隔离PostgreSQL/Artifact卷完成恢复及全部引用Hash核验后才提交清单。隔离生产器 smoke 已通过；但周期调度、异地介质、活动PG/Artifact一致性备份恢复、RPO/RTO实测仍未完成，OD-003保持PARTIAL。详见[P3.R保留审计](../../evidence/audits/2026-09-25-p3-backup-retention.md) | PARTIAL |
| OD-004 | 本地用户会话与服务身份的具体实现 | 项目所有者、开发者 | V1.1 API 实现前 | 项目所有者已确认每服务独立Bearer Token；research、portfolio、trade execution、decision governance、historical replay、quant research调用链及Market Data分钟CSV/Parquet上传边界均按服务Bearer和适用route scope实现并有隔离HTTP验证。Platform本地用户会话现使用PostgreSQL持久随机Token摘要、12小时过期与logout撤销；V1.3隔离Web/API/CLI验证注销后、Platform重启后旧Token均401。活动服务部署、服务密钥轮换/监控、贯穿五阶段的会话/上传验收仍待 | PARTIAL |
| OD-005 | V1.1 CN/US 初始化 Fixture ID、预期账本和保留策略 | 开发者 | V1.1 场景冻结前 | Fixture Manifest、Hash、初始化证据和双市场场景已冻结 | ACCEPTED（Fixture Manifest 与 V1.1 验收证据） |
| OD-006 | Qlib source commit、Python/数值栈和 ARM64 镜像 | 开发者 | V1.2 实现前 | Qlib 0.9.6 与 amd64 仿真已验证；原生 ARM64 构建和完整数值栈仍待确认 | PARTIAL |
| OD-007 | 策略持有期、再平衡、基准和组合数量（PRD Q05） | 项目所有者 | V1.2 策略验证前 | 2026-09-30批准NO_TRADE；2026-10-24进一步确认[C5候选A参数](./2026-10-24-c5-candidate-a-parameters.md)用于实现及隔离验证：固定600000.SH、100股日频方向目标、10,000 CNY模拟现金及精确风险/费用/期限。参数不再等待重复批准；活动账户/权威Mandate、持续风险和常驻运行链尚未完成，仍保持PREPARATION_ONLY。低换手TopK与真实研究保持独立。完整参数和边界见[C5决定包](../../evidence/audits/2026-10-24-od007-c5-activation-decision-package.md)；旧[W3包](../../evidence/audits/2026-09-30-w3-paper-decision-package.md)与[V1边界](../../evidence/audits/2026-10-09-v1-fixture-vs-active-strategy-a01.md)保留历史 | PARTIAL（候选A参数已确认；活动绑定/接线和正式启用未完成） |
| OD-008 | A股 V2 免费行情/新闻来源、用途适用性、限流和留存 | 项目所有者、开发者 | V2.1 来源实现前 | 个人本地、非商业学习/FakeBroker-Paper范围已由所有者确认。QUOTE/NEWS的有界实测不再一律等待供应商书面授权：每源先记录公开条款、精确端点、低频预算、仅保存字段/期限和不共享边界；出现明确禁止、认证/付费墙或限流时停止。2026-10-21隔离实测完成1个腾讯行情源（2证券）及东方财富、财联社各1篇文章的“发现→读取→修订持久化”闭环，见[个人本地学习复核](../../evidence/audits/2026-10-21-od008-local-learning-review.md)和[最终报告](../../evidence/local/V2.1/442bab42-999c-451e-93ed-c2958ca9bcd8/local-learning-source-probe.json)。两新闻本次未解析到可验证发布时间，保留UNKNOWN；未证明长期稳定、覆盖、修订、限流或历史研究能力。分钟/历史研究、批量留存、对外共享、策略与实盘不在本决定内，默认保持关闭 | PARTIAL（受限用途、当前路径兼容和元数据持久化已验证；长期能力和其他用途未关闭） |
| OD-009 | RD-Agent source commit、模型 Provider、预算和外发限制 | 项目所有者、开发者 | V3.1 实验前 | 不调用真实模型、不声称 RD-Agent 闭环 | PARTIAL（source commit、Provider/模型、预算已冻结；本机研究容器凭据引用已注入且仅预检；隔离Runner、外发白名单和兼容性仍待完成） |
| OD-010 | 目标 Ubuntu CPU/资源/网络与部署位置 | 项目所有者 | V3.4 兼容计划冻结前 | 目标架构已确认见 ADR-0007；具体主机、资源、网络和实际部署证据未完成前保持 NOT_RUN；[2026-10-13所有者决定](./2026-10-13-v1-ubuntu-deferral.md)将实机项延期至后续Ubuntu部署验收，不阻塞V1完成 | PARTIAL（Ubuntu x86_64 CPU 目标已确认，主机规格/网络/部署位置待实测） |
| OD-011 | 备份位置、保留期、RPO/RTO（PRD Q11） | 项目所有者、开发者 | V3.4 发布前 | 未完成隔离恢复演练则阻塞发布 | ACCEPTED（ADR-0006；部署环境仍需实测） |
| OD-012 | 首个市场优先顺序与阶段排期（PRD Q12） | 项目所有者 | V1.2 排期前 | V1.1 仍保持双市场基础契约 | OPEN |
| OD-013 | 生成/研究Artifact保留期限、受保护类别及物理清理授权 | 项目所有者、开发者 | W1跨服务Artifact清理启用前 | 未确认前不设置生成Artifact expiresAt默认值、不调度过期转换或物理删除；保留显式状态、只读/导出和经批准的备份清理流程 | OPEN（待确认临时研究产物期限与验收证据/已注册候选保护规则；Producer盘点见[审计](../../evidence/audits/2026-10-02-w1-artifact-producer-inventory.md)，决策维度与技术放行条件见[V1决策包](../../evidence/audits/2026-10-09-v1-artifact-policy-decision-package.md)） |
| OD-014 | V1 FakeBroker双市场Paper现金结算日历与结算释放口径（含结算日历版本、交易日映射、SELL净额入应收、到期释放时钟及未知日历行为） | 开发者实现；V1验收确认由项目所有者完成 | V1.4/P4结算实现与验收 | 采用版本化双市场结算Fixture；SELL净额先入应收，只有Fixture列明的结算session开始时才转已结算现金；未知日期失败关闭；BUY只用已结算现金；重复结算幂等 | DECIDED（项目所有者已批准严格已结算现金口径；版本化CN/US固定Fixture、应收/结算实现、跨服务账本对照及自动Web/API/CLI场景已有通过证据，见[所有者决定记录](../../evidence/audits/2026-10-11-v1-od014-owner-decision-a01.md)及[V1.4阶段记录](../prd/v1-local-simulation/04-daily-backtest.md)。真实市场全日历/全量费税、完整Quant/Paper规则矩阵、V1.4当前范围人工验收仍OPEN） |
| OD-015 | V2.4/C5模拟账户是否设置独立有效期 | 项目所有者 | C5候选暂停语义收口前 | 不增加账户级到期字段；交易授权按绑定Mandate的`validFrom`/`expiresAt`失败关闭，其他门禁独立执行 | DECIDED：所有者2026-10-26确认账户无独立有效期，见[决定记录](./2026-10-26-c5-account-validity.md) |

完成决策时应链接 ADR、锁文件、配置或用户确认记录，并同步受影响的 PRD、架构、阶段任务和测试。

2026-10-01运行时执行：OD-008仍为OPEN，项目所有者确认`NO_TRADE`且暂无线源授权。因此Market Data quote/news/minute collection须分别满足用途开关、授权引用、数据版本及精确source ID白名单，否则Provider调用前返回403、采集executor不创建，运维激活/晋级在服务请求前阻断。配置门禁只执行已确认决定，不是授权本身；来源用途、条款、限流、覆盖与留存仍须逐源决定和能力验证。详见[W3来源运行门禁审计](../../evidence/audits/2026-10-01-w3-market-source-runtime-gate.md)。

2026-10-01来源门禁范围补充：除行情、新闻与分钟采集外，BaoStock日线/PIT历史研究另需独立的`HISTORICAL_RESEARCH`授权引用、数据版本和来源ID白名单；分钟历史导入同时要求分钟采集及历史研究两个用途均获确认。实现默认关闭，不能代替逐来源许可决定。OD-008仍OPEN。


2026-10-03 官方来源条款复核：只读查阅新浪财经公开用户协议及BaoStock官方站点，未调用行情接口。新浪可见协议（2020-09-23生效版本）限制未经书面许可的访问/复制/机器人采集，并将许可描述为个人、不可转让、非商业；该协议页面不能单独确定所有Sina行情端点条款。BaoStock官网显示API知识库、更新/覆盖说明和平台访问规则，但本次公开材料不足以确认本项目自动采集、历史研究及长期存储权利；这不等于断言不存在单独授权。故OD-008继续OPEN、授权NONE、DC-08A保持停用。逐条边界与恢复材料见[OD-008官方条款复核](../../evidence/audits/2026-10-03-od008-official-source-terms-review.md)。

2026-10-05 W5 Provider usage/费用对账边界复核：DeepSeek官方说明以单次API响应的`usage`为本次token计量依据；SiliconFlow Chat Completions也返回单次响应`usage`。这支持记录请求级token证据及按冻结价格表估算成本，但不构成账户账单/发票级对账，也无法解决请求超时、响应丢失后的实际扣费查询。因此不得将Provider响应usage视为账单reconciliation；生产真实调用仍须在无歧义的账户对账来源及受控外发/授权门禁验证前保持BLOCKED，未知调用继续保留UNKNOWN预算。官方参考：[DeepSeek Token Usage](https://api-docs.deepseek.com/quick_start/token_usage/)、[SiliconFlow Chat Completions](https://docs.siliconflow.cn/docs/api/chat-completions-post)。本次只查阅公开文档，未调用Provider或访问账户。

2026-10-05 W5账户账单API复核补充：DeepSeek另有官方认证`GET /user/balance`，仅给出当前余额/币种及赠送与充值余额；这可以作为余额快照，不提供逐请求扣费关联。SiliconFlow官方2026-08-11公告称`/user/info`于8月14日停用，账户替代API后续提供；截至当前官方更新日志仍未给出其API合同。复核边界限于公开官方文档，不排除私有/账户专属能力；但当前没有可据以设计、部署请求级账单reconciliation的公开合同，W5真实Provider门禁仍BLOCKED。详见[官方文档审计](../../evidence/audits/2026-10-05-w5-provider-billing-api-review.md)、[JSON](../../evidence/audits/2026-10-05-w5-provider-billing-api-review.json)及[SHA-256](../../evidence/audits/2026-10-05-w5-provider-billing-api-review.sha256)。没有访问账户或调用Provider。

2026-10-22 OD-008/C3复核：所有者确认没有额外历史上下文文件/官方链接。本地3证券×5日既有归档发现15/15个证券日分钟量额与日线不一致，1项最高价不一致；正向回放暂BLOCKED。现有QUOTE/NEWS/当日日线决定没有自动扩展为历史研究。已准备个人本地、单次、3证券/5日、最多18数据调用+2会话RPC的BaoStock补证方案（TCP public-api.baostock.com:10030，锁版0.9.3）；状态PROPOSED_NOT_APPROVED，未请求Provider、未修改运行开关/旧归档、未签人工验收。具体操作/预算/字段/30日本地留存及停止条件见[输入复核与方案](../../evidence/audits/2026-10-22-v22-historical-input-review.md)。

2026-10-22 OD-008/C3单次决定落实：项目所有者在会话明确确认“批准这次有界补证”，批准绑定此前方案Hash，见[精确批准记录](../../evidence/audits/2026-10-22-v22-historical-source-probe/source-use-approval.json)。实际18次数据+2会话RPC全部成功，共21,269字节/19.199秒；3证券/5日，数据保留在新的本地忽略目录至2026-11-21，不共享。预算已耗尽，未重试、未改常驻配置或启用模型/策略；这不是普遍历史研究/正向回放授权。新旧样本字段完全一致，跨频差异为当前Provider可复现限制；资料/RAW/日级状态/分红因子已补，完整历史上下文仍未关闭。见[实测和剩余项](../../evidence/audits/2026-10-22-v22-historical-source-probe.md)。先前PROPOSED记录保留为批准前历史。

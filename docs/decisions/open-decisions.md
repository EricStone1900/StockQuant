# 未决事项登记

状态：ACTIVE，更新日期：2026-10-05。未决不等于可以任意默认；到达最迟阶段仍未确认时，按“安全行为”阻塞对应能力并保留 `NOT_RUN`。

| ID | 决策 | 负责人 | 最迟阶段 | 未决时的安全行为 | 状态 |
|---|---|---|---|---|---|
| OD-001 | Node、pnpm、TypeScript、Web/服务框架精确版本 | 开发者 | V1.1 开始实现前 | Node 24.1.0、pnpm 10.34.5、依赖锁和容器构建已验证 | ACCEPTED（`package.json`、`pnpm-lock.yaml`、Build 证据） |
| OD-002 | V1.1 Python 版本及 uv 工具版本 | 开发者 | V1.1 Python 服务建立前 | Python 3.9.6、uv 0.12.7 已记录；Python 适配器独立 `uv.lock` 已验证，正式服务矩阵仍需补齐 | PARTIAL |
| OD-003 | PostgreSQL、Artifact 实现、容器镜像、端口和卷名 | 开发者 | V1.1 Compose 建立前 | Compose、PostgreSQL、服务端口/卷和 `stack:up` 已实现并有容器证据；研究 Artifact 已有受限文件发布/读取、SHA-256校验、PostgreSQL引用索引和具名持久卷。配对备份Manifest、生产器与默认dry-run保留清理器（每日30日、月末12个月）已有实现；生产器要求逐次确认写入方/发布方已暂停，在隔离PostgreSQL/Artifact卷完成恢复及全部引用Hash核验后才提交清单。隔离生产器 smoke 已通过；但周期调度、异地介质、活动PG/Artifact一致性备份恢复、RPO/RTO实测仍未完成，OD-003保持PARTIAL。详见[P3.R保留审计](../../evidence/audits/2026-09-25-p3-backup-retention.md) | PARTIAL |
| OD-004 | 本地用户会话与服务身份的具体实现 | 项目所有者、开发者 | V1.1 API 实现前 | 项目所有者已确认每服务独立Bearer Token；research、portfolio、trade execution、decision governance、historical replay、quant research调用链及Market Data分钟CSV/Parquet上传边界均已按服务Bearer和适用route scope实现并有隔离HTTP验证；Portfolio/Trade及V2.4代码套件通过，Compose含对应秘密引用。活动服务部署、密钥轮换/监控、完整浏览器用户会话与上传验收仍待完成 | PARTIAL |
| OD-005 | V1.1 CN/US 初始化 Fixture ID、预期账本和保留策略 | 开发者 | V1.1 场景冻结前 | Fixture Manifest、Hash、初始化证据和双市场场景已冻结 | ACCEPTED（Fixture Manifest 与 V1.1 验收证据） |
| OD-006 | Qlib source commit、Python/数值栈和 ARM64 镜像 | 开发者 | V1.2 实现前 | Qlib 0.9.6 与 amd64 仿真已验证；原生 ARM64 构建和完整数值栈仍待确认 | PARTIAL |
| OD-007 | 策略持有期、再平衡、基准和组合数量（PRD Q05） | 项目所有者 | V1.2 策略验证前 | 2026-09-30 项目所有者仅批准 NO_TRADE 只读观察基线；无来源授权、无活动账户/Mandate/订单。低换手TopK的精确持有期、再平衡、基准/组合、资金/风险/费用、市场/证券范围与来源用途仍需另行精确决定；未确认前维持 PREPARATION_ONLY，不激活交易策略。决定包：[W3 Paper决定包](../../evidence/audits/2026-09-30-w3-paper-decision-package.md) | OPEN（只读NO_TRADE基线已确认；活动策略参数/授权未决） |
| OD-008 | A股 V2 免费行情/新闻来源、许可、限流和留存 | 项目所有者、开发者 | V2.1 来源实现前 | 仓库已有真实行情/新闻适配器及部分来源探针/历史运行证据；来源许可/服务条款、允许用途、限流/覆盖能力与留存责任尚未逐来源审阅确认。2026-10-03复核东方财富2025协议的行情复制/提供/衍生品限制；新浪官方协议可见版本生效日为2020-09-23，限制未经书面许可的复制及机器人/蜘蛛采集；通达信官方TdxAiData后台模式需数据服务Key且官方指引称付费订阅，存在分钟长区间积分成本；BaoStock和仓库所用腾讯端点仍缺足以确认本项目自动化研究/留存用途的官方许可。细节见[W3官方条款补充核验](../../evidence/audits/2026-10-03-w3-source-terms-update.md)。BaoStock官方主页目前展示API知识库、访问规则入口及支持邮箱，但主页内容未确认本项目自动化/研究/模拟用途；项目所有者可使用[书面询证草稿](../../evidence/audits/2026-10-05-w4-baostock-rights-followup.md)向官方取得适用条款及范围，未发出任何消息。默认验收仍用明确Fixture；未确认逐来源、逐用途权利前，不启用真实采集/策略，也不宣称来源完整、稳定或可用于历史研究 | OPEN（来源条款已有官方页面证据；本项目用途/限流/覆盖/留存授权和能力验证未关闭） |
| OD-009 | RD-Agent source commit、模型 Provider、预算和外发限制 | 项目所有者、开发者 | V3.1 实验前 | 不调用真实模型、不声称 RD-Agent 闭环 | PARTIAL（source commit、Provider/模型、预算已冻结；本机研究容器凭据引用已注入且仅预检；隔离Runner、外发白名单和兼容性仍待完成） |
| OD-010 | 目标 Ubuntu CPU/资源/网络与部署位置 | 项目所有者 | V3.4 兼容计划冻结前 | 目标架构已确认见 ADR-0007；具体主机、资源、网络和实际部署证据未完成前保持 NOT_RUN | PARTIAL（Ubuntu x86_64 CPU 目标已确认，主机规格/网络/部署位置待实测） |
| OD-011 | 备份位置、保留期、RPO/RTO（PRD Q11） | 项目所有者、开发者 | V3.4 发布前 | 未完成隔离恢复演练则阻塞发布 | ACCEPTED（ADR-0006；部署环境仍需实测） |
| OD-012 | 首个市场优先顺序与阶段排期（PRD Q12） | 项目所有者 | V1.2 排期前 | V1.1 仍保持双市场基础契约 | OPEN |
| OD-013 | 生成/研究Artifact保留期限、受保护类别及物理清理授权 | 项目所有者、开发者 | W1跨服务Artifact清理启用前 | 未确认前不设置生成Artifact expiresAt默认值、不调度过期转换或物理删除；保留显式状态、只读/导出和经批准的备份清理流程 | OPEN（待确认临时研究产物期限与验收证据/已注册候选保护规则；Producer盘点见[审计](../../evidence/audits/2026-10-02-w1-artifact-producer-inventory.md)） |

完成决策时应链接 ADR、锁文件、配置或用户确认记录，并同步受影响的 PRD、架构、阶段任务和测试。

2026-10-01运行时执行：OD-008仍为OPEN，项目所有者确认`NO_TRADE`且暂无线源授权。因此Market Data quote/news/minute collection须分别满足用途开关、授权引用、数据版本及精确source ID白名单，否则Provider调用前返回403、采集executor不创建，运维激活/晋级在服务请求前阻断。配置门禁只执行已确认决定，不是授权本身；来源用途、条款、限流、覆盖与留存仍须逐源决定和能力验证。详见[W3来源运行门禁审计](../../evidence/audits/2026-10-01-w3-market-source-runtime-gate.md)。

2026-10-01来源门禁范围补充：除行情、新闻与分钟采集外，BaoStock日线/PIT历史研究另需独立的`HISTORICAL_RESEARCH`授权引用、数据版本和来源ID白名单；分钟历史导入同时要求分钟采集及历史研究两个用途均获确认。实现默认关闭，不能代替逐来源许可决定。OD-008仍OPEN。


2026-10-03 官方来源条款复核：只读查阅新浪财经公开用户协议及BaoStock官方站点，未调用行情接口。新浪可见协议（2020-09-23生效版本）限制未经书面许可的访问/复制/机器人采集，并将许可描述为个人、不可转让、非商业；该协议页面不能单独确定所有Sina行情端点条款。BaoStock官网显示API知识库、更新/覆盖说明和平台访问规则，但本次公开材料不足以确认本项目自动采集、历史研究及长期存储权利；这不等于断言不存在单独授权。故OD-008继续OPEN、授权NONE、DC-08A保持停用。逐条边界与恢复材料见[OD-008官方条款复核](../../evidence/audits/2026-10-03-od008-official-source-terms-review.md)。

2026-10-05 W5 Provider usage/费用对账边界复核：DeepSeek官方说明以单次API响应的`usage`为本次token计量依据；SiliconFlow Chat Completions也返回单次响应`usage`。这支持记录请求级token证据及按冻结价格表估算成本，但不构成账户账单/发票级对账，也无法解决请求超时、响应丢失后的实际扣费查询。因此不得将Provider响应usage视为账单reconciliation；生产真实调用仍须在无歧义的账户对账来源及受控外发/授权门禁验证前保持BLOCKED，未知调用继续保留UNKNOWN预算。官方参考：[DeepSeek Token Usage](https://api-docs.deepseek.com/quick_start/token_usage/)、[SiliconFlow Chat Completions](https://docs.siliconflow.cn/docs/api/chat-completions-post)。本次只查阅公开文档，未调用Provider或访问账户。

2026-10-05 W5账户账单API复核补充：DeepSeek另有官方认证`GET /user/balance`，仅给出当前余额/币种及赠送与充值余额；这可以作为余额快照，不提供逐请求扣费关联。SiliconFlow官方2026-08-11公告称`/user/info`于8月14日停用，账户替代API后续提供；截至当前官方更新日志仍未给出其API合同。复核边界限于公开官方文档，不排除私有/账户专属能力；但当前没有可据以设计、部署请求级账单reconciliation的公开合同，W5真实Provider门禁仍BLOCKED。详见[官方文档审计](../../evidence/audits/2026-10-05-w5-provider-billing-api-review.md)、[JSON](../../evidence/audits/2026-10-05-w5-provider-billing-api-review.json)及[SHA-256](../../evidence/audits/2026-10-05-w5-provider-billing-api-review.sha256)。没有访问账户或调用Provider。

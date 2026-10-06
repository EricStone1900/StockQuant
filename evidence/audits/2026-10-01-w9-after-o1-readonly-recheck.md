# W9/O1 当前状态及全版本门禁复核

日期：2026-10-01（Asia/Shanghai）

无来源授权下只读复核：自动化安全配置校验PASS，采集相关自动化均PAUSED；本机只读API报告启用订阅0、nextExecutionAt为空、市场CLOSED、open gaps/outbox为0。观察汇总8/20（7个完整日、1个恢复日、余12个有效日），没有新增观察日。Provider凭据引用预检只报告变量名存在及0600权限；`STOCKQUANT_MODEL_PROVIDER_CALLS_AUTHORIZED=false`，真实模型调用NOT_RUN。详细状态见[O1审计](2026-10-01-o1-readonly-no-source-status-0954z.md)。

`pnpm baseline:check`退出0：本地Markdown链接1730条无失败，合同/Fixture与生成类型/client漂移检查PASS，211 JSON/146 schemas/36 Fixtures无错误。V1/V2/V3版本门禁各自INCOMPLETE/exit 2，当前未决阶段仍为V1.1、V2.3–V2.5和V3.1–V3.4；Acceptance ID缺失和意外均0。证据引用核验全PASS：V1 28 references/2 manifests/3 entries，V2 131/17/18，V3 113/19/19；缺失及Hash失败均0。

本复核不改变版本/人工验收状态，不启动外部数据或模型调用。全计划仍受来源授权、模型调用及费用/出口门禁、Ubuntu主机与交易日观察、活动集群维护批准等条件约束。

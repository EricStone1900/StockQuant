# W5 真实模型凭证只读预检

2026-10-03 13:09（Asia/Shanghai）执行 `node scripts/v31-model-credential-preflight.mjs`，退出码0，结果为`READY_FOR_NEXT_GATE`：本机忽略文件存在且权限私有；冻结的DeepSeek/SiliconFlow凭证引用均存在，无重复；真实Provider调用授权为false，故`liveCallsAuthorized=false`、`modelCalls=NOT_RUN`、外部请求0。命令只检查变量存在性/文件权限，不读取或输出凭证值。

该预检只满足凭证引用准备条件，不授权调用、不证明RD-Agent运行时/出口策略/账单对账或Ubuntu兼容，也不改变OD-009仍OPEN、V3.1仍NOT_RUN的状态。

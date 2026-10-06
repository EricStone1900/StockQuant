# O1/O2 只读观察及授权边界复核

时间：2026-10-01 10:02Z（18:02 Asia/Shanghai）。仅重算本地归档汇总并读取启用订阅数/自动化状态/模型调用配置；没有HTTP数据源请求、采集、数据库业务写入、Paper下单或模型外呼。

`pnpm dc08a:observation-summary`返回`WAITING`/exit 2：7个完整日、1个恢复日，共8/20，有效日还差12；最新完整记录为9月30日，48/48项完成、0 open gaps、0 pending outbox。本地原始汇总SHA-256为`7a91e45f4c888e5e4b6a7d3a910d11af0830db90cfd2a2a94df456765e9b87b6`。`pnpm dc08a:active-subscription -- --field enabled-count`返回0。自动化检查PASS：只读heartbeat `a-20`为ACTIVE，DC-08A、TDX及legacy采集任务均PAUSED。模型凭据预检报告两个本地引用可用且文件权限私有，但`providerCallsAuthorized=false`、`modelCalls=NOT_RUN`、`liveCallsAuthorized=false`。

本次没有新增观察日。有效观察要求经授权的真实来源按计划持续运行；不得把本地归档重算或休市计日。O1/O2继续WAITING，来源授权和NO_TRADE约束不变。

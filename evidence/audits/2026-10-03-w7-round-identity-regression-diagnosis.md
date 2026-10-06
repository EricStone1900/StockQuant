# W7 Runner 轮次身份首轮回归失败记录（2026-10-03）

在启用显式`roundIndex`的轮次Job ID后，首轮`pnpm verify:stage -- --stage V3.3 --suite code`在`v33:runner-host-rounds-recovery-http-smoke`失败。研究服务已完成`<testRunId>:<experimentId>:round-1` Job，但Host smoke仍以旧`<testRunId>:<experimentId>`查询，因而未观察到预期RUNNING lease/container，最终报错`first Host did not start its Runner container`。这是测试身份构造未同步，不是随机波动；检查结果定位唯一旧格式轮询/清理键。保留此记录。修复脚本显式查询`round-1`后再做完整套件验证；无活动服务/数据库迁移/Provider/Paper调用。

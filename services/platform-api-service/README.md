# platform-api-service

状态：已实现多个V1～V3阶段API/持久化与验收编排切片；不能据此推断所有阶段验收、活动部署或浏览器用户会话已通过。设计见[服务架构](../../architecture/services/platform-api-service.md)。

平台API负责本地开发身份、能力/健康、各阶段TestRun、证据索引和人工结论元数据；服务不得拥有或直写组合账本。真实用户会话和人工签署仍受阶段验收门禁约束。

V1.1历史TestRun的`test_runs`记录已加法迁移到`acceptance_stage_runs`，源行与历史接受记录仍保留。`STOCKQUANT_V11_RUN_STORAGE`支持`legacy`（默认，当前部署行为）与`stage`。stage模式启动前会验证两表的全部V1.1投影完全一致；不一致时服务启动失败。启用后读统一阶段表，创建/状态/断言在同一数据库事务写两表，供回滚期间继续读取旧版。切换前需停止全部旧版写进程，确认活动数据库影子数据完整；只允许单一兼容版本写入，不能在混合旧版与stage模式实例时滚动切换。活动Compose配置默认legacy，本地实现/隔离HTTP证据见[历史TestRun迁移审计](../../evidence/audits/2026-09-25-p3-history-inventory.md)。此代码路径尚未在活动服务启用，也不改变人工验收状态。

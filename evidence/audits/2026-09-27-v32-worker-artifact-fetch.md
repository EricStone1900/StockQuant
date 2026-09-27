# V3.2 候选 Artifact 授权读取边界（2026-09-27）

## 结果

Research Automation 新增内部只读 `GET /v1/promotions/{promotionRequestId}/candidate-artifact`。调用方须以独立 `quant-validation-worker` Bearer 身份认证。读取前，服务要求该 ID 在持久提交 journal 中为 `SUBMITTED` 且 Quant 状态为 `AWAITING_INDEPENDENT_VALIDATION`，并核验 journal 中不可变请求指纹；只从请求绑定的 namespace/artifactId 查找已发布 OUTPUT ArtifactRef，校验 TestRun/experiment 输出命名空间、Runner fencing sourceRef、候选 SHA 与实际内容 SHA。大小上限 8 MiB。未提交返回 404；不匹配或内容漂移失败关闭。Platform 和 Runner 身份没有该路由权限。

Quant 一次性 V3.2 Worker 已接入 Research Automation URL，使用相同专属 Bearer 获取候选字节，验证 PromotionRequest、ArtifactRef 和内容 Hash，再将下载的精确候选 Artifact 作为只读文件挂载到固定 Linux ARM64 候选沙箱和独立评估容器。当前执行器仍只接受与冻结合成 SMA Fixture 完全一致的候选内容；不支持 RD-Agent/用户候选或真实市场数据。

## 验证

- Research Automation 构建通过；单元测试 139/139。
- `pnpm --dir services/research-automation-service v32:promotion-prepare-http-smoke`：随机隔离 PostgreSQL/loopback HTTP PASS。门禁未通过时读取 404；合成门禁接受并成功提交后，Platform/Runner 为 403，专属 Worker 为 200；返回 Artifact 哈希与提交请求一致；journal 重启和幂等边界通过。
- Quant 构建和 TS 单测 48/48 通过。
- `pnpm --dir services/quant-research-service test:integration`：候选登记与随机 PG/HTTP 独立验证 smoke 通过；Worker 实际从模拟 Research Automation 接口取候选字节，在隔离候选执行器运行70个决策，并由独立评估容器完成五项合成检查。沙箱仍为无网络、只读挂载、UID 65532、256 MiB、1 CPU、64 PID。
- `pnpm baseline:check`：814 Markdown 链接、120 JSON、69 Schema、34 Fixture、56兼容规则及 11 组 OpenAPI 检查通过；Research Automation OpenAPI 当前 2 个操作均纳入静态检查；合同类型已生成。
- 完整 `pnpm verify:stage -- --stage V3.2 --suite code` 退出 0：量化 48 TS + 12 Python 单测、量化双组隔离 PG/HTTP integration、研究自动化 139 单测与提交/读取 smoke、平台 64 单测及 Web typecheck/build/test 均通过。

## 边界

隔离 smoke 使用合成 V3.1 gate 响应验证门禁行为，不构成人工验收；没有对活动服务配置新 Token 或部署 Compose。此次完成的是受限 Artifact 交付链，不是 RD-Agent/任意用户候选执行闭环。V3.1 用户接受、非 Fixture 候选语义/沙箱、正式 V3.2 TestRun/证据导出、真实市场与 Qlib 验证、Paper 精确版本消费和人工签收仍未通过；Registry/Mandate/活动服务未变更。

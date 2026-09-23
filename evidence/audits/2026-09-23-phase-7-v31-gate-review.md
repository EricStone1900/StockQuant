# 阶段七：V3.1 真实研究闭环门禁复核

日期：2026-09-23（Asia/Shanghai）  
结论：准备与隔离边界复验通过；真实模型→生成代码→Qlib 闭环仍 `NOT_RUN`，不得启用或记为通过。

## 当前运行配置（只读）

- research-automation-service `/ready` HTTP 200：`environmentMode=RESEARCH`、`brokerMode=FAKE`、`budgetPersistence=POSTGRES`；Runner 与 Model Gateway 均 `NOT_CONFIGURED`，`outboundPolicy=DENY`，preflight 为 `BLOCKED`、`modelCalls=NOT_RUN`。
- preflight 缺少：isolated Runner、Model Gateway `LIVE` 模式、`ALLOWLIST` 外发策略，以及 `api.deepseek.com` / `api.siliconflow.cn` 两个精确目标。凭证值未读取或输出；`.env.local` 权限为 `0600`，两个预定凭证项均非空，运行时 preflight 未将凭证引用列为缺项。
- Compose 服务列表中没有独立 `runner` 或 `model-gateway` 服务。当前 API 仅提供验证/编排准备接口；没有可信宿主执行器完成分发、硬超时、输出配额、费用预留/结算接线。
- 安全预算配置读取为 USD：每轮默认 300 cents（$3），单实验上限 1000 cents（$10），V3.1 阶段上限 3000 cents（$30），告警 80%、并发 1。该值是已记录的预算门槛；没有发生模型请求或费用。

## 本次重验

- `pnpm verify:stage -- --stage V3.1 --suite code` 退出 0：JSON/Fixture 合同 24 项、research 单元 21/21、PostgreSQL 集成 3/3、platform API 单元 28/28，research/platform/Web 类型检查通过。PostgreSQL 集成使用随机隔离 stageId 并精确清理；初次在受限沙箱内运行时本机 5433 连接被拒，获准只读/集成测试连接后重跑全部通过。
- `pnpm v31:runner-smoke` 退出 0，固定 `stockquant-v31-runner:rd-agent-v0.8.0-qlib-3e72593`：normal exit 0；timeout 和 path-rejection 均 exit 2（预期拒绝）；OOM 场景 exit 247（预期资源终止）。既有 smoke 使用 `network none`，没有模型密钥，也未执行 Provider 调用。
- 已有 smoke 配置还验证 `linux/amd64`、只读根文件系统、非 root、删除全部 capabilities、无 Docker Socket、CPU/内存/PID 限制和输入/输出隔离。它在 Mac Docker Desktop 的架构模拟上运行，不替代原生 Ubuntu 证据。

## 阻塞与正确状态

1. **真实闭环**：目前没有 RD-Agent Controller→Gateway→受控 Runner→Artifact 的实际调用链。必须先实现可信执行/硬资源边界并接上费用 reserve/settle，再运行模型任务。
2. **外发**：默认 DENY 正确保持。当前 Compose 还没有可证明只允许上述两个 Provider 主机的网络出口边界；应用配置里的字符串 allowlist 本身不足以证明底层网络不能绕行。
3. **成本**：预算账本单测与 PostgreSQL 测试通过，但模型调用尚未经它预留、结算和对账；因此 $30 是草案中冻结的门槛，不是已验证的实际费用封顶。
4. **OD-009**：该记录仍为 DRAFT/PARTIAL；虽然 Provider、模型和预算数值已写为确认，真实凭证使用、网络外发及 Runner 兼容性仍需接受完整门禁。阶段及版本验收保持 `NOT_RUN`，不更改用户人工签署。

下一安全动作是先补齐并复验受控 Runner 执行器、底层 Provider 出站限制和模型调用预算接线；之后再由项目所有者审阅具体 Provider 目标、预算和费用风险，执行首次真实调用。当前并未发起任何 Provider 网络请求。

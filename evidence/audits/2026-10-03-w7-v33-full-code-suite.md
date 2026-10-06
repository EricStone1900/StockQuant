# W7 / V3.3 完整代码套件复验（2026-10-03）

命令：`pnpm verify:stage -- --stage V3.3 --suite code`，受控本机 loopback 测试环境，退出码 0。完整 stdout/stderr 见同目录 `2026-10-03-w7-v33-full-code-suite.log`。首轮受限沙箱因测试服务器 `listen EPERM 127.0.0.1` 失败（Research 197/202通过）；保留该失败，不作为最终结果。回环环境完整重跑通过。

验证覆盖 baseline/合同/分层、Research 36文件202单测及4文件27项PG集成、实验与轮次预算绑定HTTP拒绝/接纳矩阵、预算摘要及 UNKNOWN 预留/总TestRun和轮次上限、合成66,100 Experiments深分页容量探针、双轮次Runner容器 SIGKILL/租约接管/fencing/资源采样/Artifact Hash与陈旧发布拒绝、Platform 46文件166单测及4文件5项集成、Web TypeScript及V3.3 3项 Playwright E2E。

容量探针为隔离热缓存PostgreSQL微基准：50,000行深页 offset P95 842.889ms、cursor P95 21.655ms；cursor计划读取约100行。它不证明生产负载。Runner为Mac arm64宿主上的Linux容器Fixture小样（1,000行、两轮、500m CPU/512MiB/32 PIDs），Host SIGKILL后过期租约以fencing token 2接管；峰值RSS 35,578,184 bytes，采样CPU峰值34.74%，Runner管理盘51,303 bytes，发布Artifact内容211 bytes。不是Ubuntu/真实RD-Agent/真实数据验证。

结果严格限定为代码套件：`readinessTestRunCreation=PERSISTED_WAITING_ONLY`、`businessWorkflow=NOT_IMPLEMENTED`、`dispatch=ISOLATED_FIXTURE_RUNNER_SMOKE_ONLY`、`paperContinuity=NOT_CHECKED`、`businessValidation=NOT_RUN`、`humanAcceptance=NOT_RUN`。真实Paper并行观测未执行，尊重NO_TRADE；数据源未授权，未发起Provider调用。本证据不关闭W7，不改变V3.3阶段或人工验收状态。

# W8 / V3.4 本地代码门禁复验

时间：2026-10-01 22:41 UTC（2026-10-02 Asia/Shanghai）  
工作区 HEAD：`3fdf2c9c693e1bc013601926865634a49a625ff4`  
命令：`pnpm verify:stage -- --stage V3.4 --suite code`

## 结果

首次在默认沙箱执行退出 1。合同、基线、构建、lint、typecheck通过；全仓单测运行到Quant Research Python worker时，`tests/test_qlib_worker.py`初始化随机`127.0.0.1`端口绑定遇到`PermissionError: [Errno 1] Operation not permitted`。这是测试环境回环绑定限制，发生在本地测试初始化；未访问任何数据源、Provider、Paper服务或券商。

随后在受控本机环境以相同命令重跑，退出 0。基线检查通过：本地Markdown链接2267条无失败、JSON 211份、Schema 146份、Fixture 36份；合同生成/兼容性、服务分层检查及版本门禁测试通过。全仓build、lint、typecheck通过；单测通过，包括Quant Research Python worker 13项、Research Automation 34文件/191项、Platform API 45文件/156项；其余workspace单测亦通过。V3.4准备入口4项测试全部通过。

最终机器结果：

```json
{
  "stageId": "V3.4",
  "suite": "code",
  "status": "PASS",
  "scope": "local-repository-build-lint-typecheck-tests-and-contract-baseline",
  "v34BusinessWorkflow": "NOT_IMPLEMENTED",
  "ubuntuValidation": "NOT_RUN",
  "fullStageE2E": "NOT_IMPLEMENTED",
  "paperObservation": "NOT_RUN",
  "humanAcceptance": "NOT_RUN"
}
```

本次只证明当前工作树的本地代码/合同基线；没有部署、重启或请求活动服务，没有触发市场数据采集、模型Provider调用或Paper订单。它不证明Ubuntu主机、迁移/备份恢复、正式V3.4业务工作流、五个实际交易日观察或用户验收。V3.4及W8正式发布门禁保持未完成。

`git diff --check`通过。完整命令的首次环境失败与受控重跑成功均保留；审计SHA-256见同名`.sha256`文件。

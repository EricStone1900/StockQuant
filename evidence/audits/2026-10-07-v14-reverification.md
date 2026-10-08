# V1.4 当前工作区复验

日期：2026-10-07（Asia/Shanghai）

## 执行结果

- `pnpm verify:stage -- --stage V1.4 --suite code`：在允许Qlib Worker测试绑定随机`127.0.0.1`端口的受控本机权限下退出0。普通沙箱首轮因`PermissionError: [Errno 1] Operation not permitted`失败，原始失败保留。合同/生成器漂移、Fixture、服务分层、全仓build/lint/typecheck/unit均通过；主要计数为Quant Worker Python 14、Quant TypeScript 91、Market Data 74、Trade 85、Platform 216、Governance 40、Research Automation 218、Historical Replay 25、Portfolio 5、Web 1及Artifact Content Store 5。
- `pnpm test:e2e -- --stage V1.4`：在受控Docker daemon权限下退出0。普通沙箱首轮因Docker socket `operation not permitted`失败，保留日志。随机Compose项目`sq-v14-backtest-28218813000ec6215f40`启动真实PostgreSQL、Quant、Portfolio、Platform和容器化Web，完整回测任务持久化并由浏览器与同Run只读CLI核验。
- Playwright 4/4通过：正式回测报告、合成停牌/限制价、历史费率切换、用户策略参数与持久运行比较。6个浏览器创建TestRun和1个API TestRun均由同UUID的CLI `--check-only`核验；另有CLI rejection/recovery运行。
- PostgreSQL中11个BacktestRun、11个Manifest及结果Hash一一相符。常规日线Fixture SHA-256为`88a198cbf5e2cf8f3bf1351a31c5aba1b9d9c6ce2d28343fb05a1dc462569bef`，限制场景Fixture SHA-256为`45413145031d48c74f0592dbe450a68081f4e0e22e769e8d8b4ddf2ffd57e52a`。workspace codeVersion为`sha256:e57db3ec917a178448a7c024eaf22e48bd3360b1aa6c1fc3a127c1ac82eca6d7`。
- Harness停止后移除并核验本次Compose容器、卷和网络。实际E2E的完整结构化运行及断言见[机器审计JSON](./2026-10-02-w1-v14-quant-configurable-web-28218813000ec6215f40.json)。

## 边界与后续

该复验支持V1.4固定合成输入的工程可运行性。它不证明公司行动调整、完整市场日历/费税、Qlib与Paper逐规则一致性，也没有覆盖回测取消/进程重启的完整故障矩阵。公司行动Fixture仍明确缺失；下一项P4工程工作应冻结含拆股或现金分红的独立新Fixture版本，完成现金/数量/NAV手算与幂等重复应用验证，再接入持久BacktestRun、正式Web和同Run CLI。阶段状态保持`PARTIALLY_IMPLEMENTED`，人工验收保持`NOT_RUN`。

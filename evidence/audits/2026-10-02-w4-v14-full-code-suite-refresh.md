# W4 V1.4 全仓代码套件复核

日期：2026-10-02。

在当前工作树运行 `pnpm verify:stage -- --stage V1.4 --suite code`。普通沙箱首轮在 Quant Qlib Worker 单测创建临时 `127.0.0.1` 监听socket时返回 `EPERM`，没有进入该测试断言；保留此失败。相同命令在受控本机测试权限下最终直接退出0。

该Stage code分支实际执行 `pnpm baseline:check`、全仓build、typecheck和unit tests。基线中Markdown链接2657项、222 JSON/152 Schema/39 Fixture无失败、合同生成和8服务分层扫描通过。测试报告：Quant Research 18个Vitest文件/91项与Python Worker 13项；Research Automation 35文件/196项；Platform API 46文件/162项；Market Data 17文件/70项；Trade Execution 13文件/62项；Historical Replay 9文件/25项；Decision Governance 6文件/22项；Portfolio Risk 3文件/5项；Web 1文件/1项；Artifact Content Store 4项。全仓build与typecheck亦通过。受控完整日志暂存于本机 `/private/tmp/stockquant-v14-code-suite-final.log`。

边界：本次没有启动V1.4 API/Web/CLI隔离纵切、没有产生TestRun、没有运行真实Qlib或增加市场样本，也未访问活动服务/行情/Provider/Paper/Broker。该回归不能证明市场规则覆盖、公司行动、全历史费表、Qlib与Paper规则一致性、人工验收或Ubuntu；V1.4仍`PARTIALLY_IMPLEMENTED`，V1/V2/V3总门禁不因此升级。

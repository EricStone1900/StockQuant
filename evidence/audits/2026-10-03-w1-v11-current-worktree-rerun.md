# W1/V1.1 当前工作树代码套件复验

日期：2026-10-03
命令：`pnpm verify:stage -- --stage V1.1 --suite code`
最终结果：PASS，受控本机复跑退出码0。

普通沙箱首轮完整日志已在同名`.log`中留存，Qlib worker 的动态loopback bind因`EPERM`在环境初始化时报错。使用受控本机权限对相同命令复跑后通过。构建、lint、typecheck、baseline/合同/Fixture检查及全仓单测通过；V1.1专用场景和活动API切换/人工验收没有被此代码套件代替。

服务单测：Governance 22、Web 1、Replay 25、Portfolio Risk 5、Trade Execution 67、Quant Research 91、Market Data 71、Research Automation 203、Platform API 169；Artifact Content Store 5，Qlib worker Python 14。无真实行情、Provider或券商调用；未切换或重启活动服务。详细命令输出在同名`.log`，重要入口源码Hash及原始首轮失败日志摘要见`.sources.sha256`。

结论范围仅为V1.1当前工作树工程代码验证；跨服务正式API部署/回退、V1.1全范围业务验收及新增范围人工签署仍待完成。

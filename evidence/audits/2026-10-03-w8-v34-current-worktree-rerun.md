# W8/V3.4 当前工作树代码门禁复验

日期：2026-10-03
命令：`pnpm verify:stage -- --stage V3.4 --suite code`
结果：PASS，退出码0。

本轮执行仓库 baseline、build、lint、typecheck 和全仓单测，并运行V3.4准备入口专测（4/4）及Ubuntu主机预检规则专测（4/4）。涉及的服务单测摘要：治理22、Web 1、Replay 25、组合风控5、交易执行67、量化91、市场数据71、研究自动化203、平台API 169；Artifact Content Store 5项、Qlib worker Python 14项亦通过。完整原始输出见同名`.log`。

该结果只证明当前Mac工作树的本地代码门禁通过。机器输出明确Ubuntu host validation/ubuntu validation为`NOT_RUN`，V3.4业务工作流与完整阶段E2E为`NOT_IMPLEMENTED`，Paper观察和人工验收为`NOT_RUN`。本轮没有部署、重启或修改既有服务，也没有调用行情源、Provider或真实券商；不得据此将V3.4/W8标记验收完成。

执行源码身份见同名`.sources.sha256`；该清单固定门禁入口、专项测试、Ubuntu预检实现和V3.3状态迁移依赖文件。日志单独保留。

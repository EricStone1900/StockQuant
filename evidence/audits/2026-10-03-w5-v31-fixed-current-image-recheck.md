# W5 V3.1 固定当前源码镜像复验

时间：2026-10-03。首轮普通沙箱运行因测试服务不能绑定`127.0.0.1`以`EPERM`退出1；获得受控本机loopback权限后，首次完整套件因缺`STOCKQUANT_RESEARCH_IMAGE_ID`正确退出2。两次结果均保留。随后从当前工作树构建独立本地镜像`stockquant-v31-research-offline-recheck-20261003`，平台`linux/arm64`，ID `sha256:87c871463186c677c2449d74b48da9be942c219075bfb0d7c35ecf12b35403d2`；未启动活动服务、未访问Provider/行情源。

固定镜像ID重跑`pnpm verify:stage -- --stage V3.1 --suite code`，退出0。覆盖合同与Fixture、Research Automation 37文件207/207单测、5文件29/29 PostgreSQL集成、V3.3队列探针、V3.1内部LiteLLM Fixture HTTP smoke、Platform 47文件169/169单测、Artifact owner-scope smoke和Web typecheck。内部隔离Docker网络实际启动锁定RD-Agent/LiteLLM客户端与临时tmpfs PostgreSQL：Chat/Embedding响应与账本证据匹配，2条Fixture预算均SETTLED，请求合计120 cents、结算46 cents，`externalProviderCalls=0`。Artifact owner-scope Run `1a4a5b01-0ca5-436b-93cc-4ac018309def`通过，精确字节Manifest、正确owner 200、匿名401、跨owner 403；`activeServicesTouched=false`。

测试后只读Docker检查：活动容器13个，与最近准确W0运行时基线的完整ID/名称/镜像一致；无`sq-litellm-*`测试容器或网络遗留。真实RD-Agent Provider dispatch、真实供应商费用/发票对账、受强制网络出口环境的Provider调用、V3.1正式业务TestRun和人工验收仍未完成。本复验不改变V3.1阶段`NOT_RUN`。

该报告随附SHA-256 Manifest固定测试源码和当次镜像ID。测试依赖的本机回环权限与Docker daemon访问均限定为隔离本地工程验证。

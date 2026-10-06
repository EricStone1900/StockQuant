# W5 V3.1 当前工作树代码套件复验

时间：2026-10-03。首次`pnpm verify:stage -- --stage V3.1 --suite code`按脚本约束因未提供`STOCKQUANT_RESEARCH_IMAGE_ID`退出2；保留该门禁结果。随后依据当前Research Automation源码构建`linux/arm64`镜像`stockquant-v31-research-openai-fixture:codex-20261003-w5-current-run`，digest为`sha256:5a6177721fb5623ac75dbfa5da317c509f3a47d9e1802a84d0198c06adaa51f2`，以该精确镜像引用和digest重跑完整套件，退出0。套件覆盖合同、Research/Platform代码与数据库测试、只读预算/队列容量、固定Fixture Gateway和内部LiteLLM Chat/Embedding smoke、Artifact owner-scope导出及Web typecheck。

最终内部LiteLLM验证产生确定性Fixture Chat与Embedding结果，预算两项均SETTLED，总请求120 cents、实际结算46 cents；`externalProviderCalls=0`。Artifact owner-scope HTTP TestRun `e8484d56-a15b-4ded-8da2-78c542cc78ec`验证输入/输出精确字节与Manifest，正确owner 200、匿名401、异主403、未列入Artifact 404；`activeServicesTouched=false`。用户验收提交只生成合成`WAITING`，未改变权威用户Gate。套件临时Research/PostgreSQL/Runner资源完成后，仅移除本轮创建的确切镜像标签。

结果仅证明固定Fixture与当前工程组件；没有真实RD-Agent模型任务、真实Provider或费用、Paper/订单、Ubuntu实机和人工验收。V3.1阶段仍`NOT_RUN`，准备门禁未关闭。

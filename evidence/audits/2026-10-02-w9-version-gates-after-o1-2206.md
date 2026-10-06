# W9 三版门禁复核（O1 22:09 只读刷新后）

日期：2026-10-02（Asia/Shanghai）。复核范围是版本文档/证据引用与业务总门禁，不把只读运行态或代码套件PASS转换成阶段PASS。

`pnpm baseline:check`退出0，包含文档、合同/兼容、Fixture、服务分层及26项阶段文档/版本/证据门禁测试。最终`pnpm docs:check`检查2736个本地链接且0失败。V1/V2/V3 `verify:version:evidence`均PASS；最终计数为V1 82引用/10 Manifest/43条目、V2 204/33/61、V3 184/39/69，缺失与SHA失败均0。V1/V2/V3 `verify:version`均按未完成事实返回INCOMPLETE/exit 2；未决阶段数为5/5/4，其中V3.1–V3.4均NOT_RUN。

O1本次只读健康聚合为UNHEALTHY（Market Data calendar=CLOSED、无nextExecutionAt、最近scheduler tick新鲜、enabled schedules=0）；归档观察仍8/20、余12个有效日、最新2026-09-30。本次不增加观察日。NO_TRADE、来源授权NONE保持；外部行情/Provider/Paper/Broker请求均为0。

结论：证据链结构健康，但版本/业务验收未完成。V1历史E2E的共享生成类型SHA按执行时点保留；当前合同与共享生成文件Hash由W7 Runner轮次绑定Manifest覆盖。历史文件未被改写。W9仍须逐阶段补足业务、观察、Ubuntu和人工签署。

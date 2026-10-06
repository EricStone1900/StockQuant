# W9 门禁复核：W2/P-F05取消结果模拟后

日期：2026-10-02（Asia/Shanghai）。本报告为当前完整代码/证据快照，不替代产品验收、真实时钟观察、活动部署或人工签署。

最新`pnpm verify:stage -- --stage V2.4 --suite code`退出0，包含新增Portfolio部分BUY Fill捕获后`CANCELLED`释放剩余Reservation集成场景。`pnpm baseline:check`退出0，文档、契约、Fixture、服务分层与门禁解析测试通过。三版证据引用与SHA-256清单门禁退出0：V1为74条引用、9份manifest、19项哈希；V2为175/28/47；V3为176/38/45。缺失证据和Hash失败均为0。

V2.4本轮API TestRuns为normal `d0d8b9c8-4fc7-49be-8240-f8769d4503ff`、rejection `1d81560a-e868-4362-bd9a-0c3087d0a8c1`、recovery `a4120746-df55-4c09-b825-16c25da72041`；Web/CLI同Run均PASS。三版业务门禁仍保持`INCOMPLETE`/exit 2：V1五阶段未全完成、V2五阶段未全完成、V3四阶段未全完成，invalid PASS claims均为0。该状态符合当前工程事实。`NO_TRADE`、尚无行情源授权、20日真实运行观察未完成、Ubuntu实机验收及待用户确认均不因Fixture/代码通过而改变。V2.4隔离套件声明活动服务未触碰；不执行Paper或真实行情采集。

机器结果见[JSON](2026-10-02-w9-after-w2-pf05-cancel-results.json)及[SHA-256清单](2026-10-02-w9-after-w2-pf05-cancel-results.sha256)。

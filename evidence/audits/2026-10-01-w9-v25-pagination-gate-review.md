# W9 当前版本门禁复核：V2.5 Parquet HTTP 分页容量

日期：2026-10-01（Asia/Shanghai）

V2.5完整代码套件`pnpm verify:stage -- --stage V2.5 --suite code`退出0，包含Linux/arm64隔离100,000行Parquet写入、HTTP分页读回及筛选查询。新增分页审计已由版本证据检查器验证。

`pnpm baseline:check`通过：Markdown本地链接1,520条、JSON 176份、Schema 115份、Fixture 36份、OpenAPI与生成客户端/兼容矩阵全部通过。V1/V2/V3证据引用检查分别通过：17引用/1 Manifest、115引用/13 Manifests、98引用/13 Manifests；缺失证据与Hash错误均为0。

版本门禁仍为V1/V2/V3 `INCOMPLETE`，各命令按定义退出2；未决阶段仍为V1.1、V2.3–V2.5、V3.1–V3.4。V2.5的新增容量结果是未授权合成数据的Linux/arm64切片，不改变NO_TRADE/无来源授权，不满足Ubuntu x86_64、全市场分钟容量、PIT、长期观察、真实来源或人工验收。O1仍为8/20（7完整日+1恢复日），当前无可授权来源，未启动采集。

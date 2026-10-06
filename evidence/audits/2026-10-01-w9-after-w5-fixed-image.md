# W9 V3.1 固定镜像回归后的全版本门禁

日期：2026-10-01（Asia/Shanghai）。

`pnpm baseline:check`退出0：本次文档链接最终复查1753条、失败0；合同数据211 JSON/146 Schema/36 Fixture，145 schema生成类型、100项兼容规则及OpenAPI/client漂移检查通过；Fixture哈希19项无误。

`pnpm verify:version:evidence`：V1 PASS（28引用/2 Manifest/3条目），V2 PASS（131/17/18），V3 PASS（116/20/20）；均无缺失或哈希失败。

`pnpm verify:version`：V1、V2、V3均按当前阶段事实返回`INCOMPLETE`/exit 2；未完成范围分别为V1.1、V2.3–V2.5、V3.1–V3.4。Acceptance ID缺失/意外均为0。V3.1固定镜像完整离线代码回归通过，但真实RD-Agent/Provider闭环、账单核验、生产出口/DNS边界和人工验收仍未完成。W4单Parquet容量上限100,000行。O1有效交易日观察8/20，未授权数据源订阅0。

持续适用：`NO_TRADE`；数据源无授权；`STOCKQUANT_MODEL_PROVIDER_CALLS_AUTHORIZED=false`；此次只运行离线Fixture，无真实Provider、市场数据或Broker请求，也没有签署用户验收。三版门禁INCOMPLETE是当前正确结果。

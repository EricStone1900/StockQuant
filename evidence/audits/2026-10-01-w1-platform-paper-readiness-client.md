# W1 Platform → Trade Execution V2.4 Paper readiness 生成客户端

日期：2026-10-01（Asia/Shanghai）

Platform 面向用户的只读 `paper-readiness` 页面原先直接请求 Trade Execution。现基于 `trade-execution-v24-readiness.v1.json` 新增漂移可检验的Platform生成客户端，固定GET操作、Platform Bearer/service身份、CN_A/US_EQUITY market参数及5秒timeout。客户端运行时拒绝未支持市场；HTTP状态/响应体原样交给既有业务层映射。该接口不评估订单、不预留资金、不提交执行。

Platform 35个测试文件/120项单测、typecheck及`pnpm contracts:check`通过。生成器同时校验OpenAPI operationId、调用身份、ServiceBearer、market必填和canonical响应schema。

当前最新完整V2.4 code suite需要在该客户端接线后再跑；当前无来源授权、NO_TRADE、活动服务未触及。

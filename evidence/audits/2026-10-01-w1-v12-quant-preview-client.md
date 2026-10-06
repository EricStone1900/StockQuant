# W1 V1.2 Quant Research 预览客户端审计

- 日期：2026-10-01
- 范围：V1.2 Platform Qlib probe、固定因子预览、RD-Agent 隔离边界 probe三个只读读取路径。
- 契约：新增`quant-v12-research-preview.v1` OpenAPI三操作，各要求Platform API ServiceBearer与固定调用身份，并引用canonical response schemas；生成客户端漂移校验并进入合同生成/检查入口。
- 接线：V1.2正式预览路由与异步TestRun均改用`GeneratedQuantV12PreviewClient`；V1.2 acceptance application通过reader端口消费Qlib状态和因子排名，不再自行组装Quant URL、Bearer和fetch请求。
- 验证：client生成器`--check`通过；Platform typecheck通过；Platform unit suite 136/136通过；`pnpm validate-json`通过（196 JSON、134 schemas、36 fixtures）；完整`pnpm verify:stage -- --stage V1.2 --suite code`受控退出0，包含合同/Fixture hash/build/typecheck/全仓unit及13项Qlib worker测试。
- 安全边界：本轮没有调用Quant真实Probe/模型/Provider或活动服务；只运行测试套件的本地边界单测。没有改动历史人工签署或来源许可状态。
- 结论：这三个V1.2 Platform→Quant Research只读操作已契约化并由生成客户端消费；不表示真实Qlib工作流、V1.2人工验收或版本以外门禁被重新签署。

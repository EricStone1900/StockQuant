# W5 SiliconFlow Embedding 响应校验

日期：2026-09-30。验证命令：`pnpm verify:stage -- --stage V3.1 --suite code`；退出码：`0`。

## API 契约基线

OD-009 冻结的 Embedding 模型为`Qwen/Qwen3-Embedding-4B`，输出维度1024。SiliconFlow 官方[Embeddings API](https://api-docs.siliconflow.cn/docs/api/embeddings-post)说明使用`POST /v1/embeddings`，响应包含模型、向量data、usage（prompt/completion/total token）及追踪ID；Qwen3-Embedding-4B允许的dimensions包含1024。

新增本地纯校验函数`validateSiliconFlowEmbeddingResponse`：检查响应类型、精确模型ID、请求输入数量、按序索引、每个向量维数/有限数值、usage非负整数及token总数一致。测试以小维度固定Fixture覆盖，生产配置中的1024维由同一参数校验，无真实Provider调用。

## 验证结果与边界

- V3.1完整代码套件退出0；Research Automation lint通过、28个单测文件/159项通过，4个隔离PG集成文件/19项通过；Platform typecheck及26个单测文件/94项通过；Web typecheck通过。
- Artifact owner-scope HTTP smoke通过，`testRunId=fc8688c3-39aa-4dcd-ab35-137c30faafc2`，`activeServicesTouched=false`，使用合成验收数据。
- DeepSeek费用算法3项定向用例仍通过；SiliconFlow响应校验2项定向用例通过。
- OD-009尚没有已核准并冻结的该Embedding模型费率/账单对账规则，本次未添加价格常量，也未把embedding费用记为零。供应商请求、实际费用与财务账单核对均未运行；强制网络出口、真实Runner及V3.1阶段验收仍缺失。


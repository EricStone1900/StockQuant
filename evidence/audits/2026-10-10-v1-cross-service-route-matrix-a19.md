# V1 跨服务调用矩阵 A19：Quant Research → Qlib Worker

日期：2026-10-10。该增量补记V1.1-S2-L14调用盘点中遗漏的Quant Research出站生成客户端边界。

| OpenAPI operationId | 生成客户端方法 | V1生产调用点 | 身份/语义及当前证据 |
|---|---|---|---|
| `probeQlibWorker` | `GeneratedQlibWorkerClient.probe` | `quant-research-service/src/adapters/generated-qlib-worker-adapter.ts`；由Platform V1.2 Qlib/RD-Agent固定探针和Qlib任务就绪检查间接调用 | `quant-research-service`专属Bearer及caller header；Worker只读`/probe`不执行模型。客户端单测断言专属身份；真实锁版Worker容器`/probe`返回READY，固定Python代码探针value=42，且`dockerSocketMounted=false`。 |
| `fitQlibFixtureInWorker` | `GeneratedQlibWorkerClient.fitFixture` | `quant-research-service/src/adapters/generated-qlib-worker-adapter.ts`，由Platform V1.2 Qlib Fixture任务间接调用 | 使用同一专属身份；适配器将拟合超时限为120000ms。定向代码套件执行锁版Qlib 0.9.6 Linux容器拟合，随后V1.2隔离E2E对CN/US独立时间轴拟合、Test段预测和Artifact发布作same-TestRun核对；正常、拒绝、取消及服务重启恢复流程均通过。 |

同一OpenAPI客户端另含`trainQlibFixtureSummary`（`trainSummary`）与`recomputeQlibFixtureSummary`（`validateSummary`），由Platform的V2.3 `POST /v1/research/multi-bar`等路径使用；这两项是确定性Fixture摘要/Hash重算，不是Qlib模型训练或独立模型验证，不计作V1完成能力。V1.2的V1.4日线回测则使用独立`GeneratedQuantV14BacktestClient`，不把它归入Qlib Worker边界。

生产组装依据：`services/quant-research-service/src/bootstrap/main.ts`；端口适配依据：`src/adapters/generated-qlib-worker-adapter.ts`、`src/contracts/generated-qlib-worker-client.ts`；直接客户端断言：`tests/unit/qlib-worker-client.spec.ts`（probe身份、fit路由/body/Content-Type/超时与错误响应、摘要路由/身份、缺失Bearer拒绝）。完整验证由[当前V1.2代码套件](./2026-10-10-v12-qlib-worker-client-inventory-code-suite-a01.log)提供，退出码见[sidecar](./2026-10-10-v12-qlib-worker-client-inventory-code-suite-a01.exit.txt)，SHA-256见[校验文件](./2026-10-10-v12-qlib-worker-client-inventory-code-suite-a01.log.sha256)。

该补充关闭的是Qlib Worker这一条V1生成客户端边界的静态映射与当前隔离回归；不证明Quant全部运行路径、V1其他服务调用边、活动发布、Ubuntu实机或V1整体验收完成。其余A04清单仍逐项开放。

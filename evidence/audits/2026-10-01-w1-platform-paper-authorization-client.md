# W1 Platform → Decision Governance Paper 授权创建生成客户端

日期：2026-10-01（Asia/Shanghai）

Platform 的 V2.4 隔离 Fixture normal/rejection 流程创建 Governance 授权时，原先直接拼接跨服务 URL 并调用 `fetch`。此操作已迁移到基于 `decision-governance-paper-authorization.v1.json` 生成的 Platform 客户端。客户端校验 HTTP(S) base URL 和独立 Platform Bearer，固定 `platform-api-service`身份、授权创建 POST、5 秒 timeout，并按 canonical request/result schema携带并解析数据。HTTP状态原样交给业务层，stale-snapshot拒绝断言及授权创建失败处理保持不变。

新增客户端测试检查服务身份、URL、请求体、响应422保留、AbortSignal和无效URL/token拒绝；V2.4相关场景测试因新增客户端要求有效容器Bearer，测试夹具已明确提供随机固定测试值。

验证：Platform 全量 34 个测试文件、118/118 单测通过；Platform typecheck通过；contracts:check通过（177 JSON、116 schema、36 Fixture、兼容矩阵和全部生成器漂移检查）；变更后完整 `pnpm verify:stage -- --stage V1.1 --suite code` 受控退出0，含baseline、全仓build/lint/unit与隔离stage场景。

运行范围仅为隔离NO_TRADE Fixture/FakeBroker测试，没有接触活动服务、市场源、外部Provider或真实Broker。V1.1 code suite不代表活动API发布/回退、通用Artifact所有消费者、用户新增范围验收或W1整体关闭。

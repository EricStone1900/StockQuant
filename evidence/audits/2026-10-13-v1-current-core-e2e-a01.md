# V1主要功能当前树E2E核对（2026-10-13）

按新收尾计划只核对五个阶段的固定主流程，各用随机隔离资源；本次未重跑全仓code suite。

| 阶段 | 命令结果 | 主功能证据 | 资源与人工状态 |
|---|---|---|---|
| V1.1 | `pnpm test:e2e -- --stage V1.1` PASS | normal/rejection/recovery 3/3；账户CNY 10000.0000、Portfolio MATCH；同Run CLI/export；共享依赖及迁移/HTTP检查通过 | 项目容器/卷/网络/镜像清理通过；自动Run不代替人工签收 |
| V1.2 | `pnpm test:e2e -- --stage V1.2` PASS | 锁版Qlib 0.9.6双市场112项预测；TOPK/NO_TRADE快照持久送达Governance；Platform重启恢复；四Run同Run CLI/export | 隔离PG/Artifact卷/网络清理通过；模型有效性与人工验收NOT_RUN。详细Run、Hash及边界见[§8.70记录](2026-10-13-v12-current-core-e2e-a01.md) |
| V1.3 | `pnpm test:e2e -- --stage V1.3` PASS，Playwright 40/40 | CN/US FakeBroker交易、拒绝、严格结算现金、撤单、UNKNOWN原单查询、Trade重启及乱序Fill恢复；账本MATCH、同Run CLI/export | 隔离容器/卷/网络清理通过；本轮自动Run不代替人工签收；执行产生的浏览器截图在`2026-10-08-v13-browser-captures-sq-v13-web-c21401930bc8b2b4ba64/` |
| V1.4 | `pnpm test:e2e -- --stage V1.4` PASS，浏览器7/7、10个Run同Run CLI检查 | 日线报告、拒绝、刷新恢复、停牌/限制价、历史费率、公司行动幂等及持久Run比较；Fixture SHA-256 `a89d48a93bc72dd95ca85b7ddf29a08f5dd2092d8b618f2cd09ede3d6f198a2d` | 隔离容器/卷/网络清理通过；机器报告[JSON](2026-10-07-v14-durable-tasks-d1f594f42bb1b396d58a.json)，codeVersion `sha256:7a8a92c5e091b6edb6d883a8753620c550d8bc41dc9983914b9ae4ba60943f22`，人工验收NOT_RUN |
| V1.5 | `pnpm test:e2e -- --stage V1.5` PASS，浏览器4/4 | normal、AUTO、rejection、recovery；AUTO四笔Fill追溯，四Run同Run CLI/export；报告见[机器JSON](2026-10-13-v15-nats-temporal-dispatch-sq-v15-e2e-7a86df3dcd7b56648bef.json) | 隔离清理通过；人工验收NOT_RUN |

另以`STOCKQUANT_V15_E2E_BACKUP_RESTORE=true pnpm test:e2e -- --stage V1.5`完成V1本地核心配对恢复专项：同一隔离点恢复PostgreSQL（含真实AUTO领域业务事实）、JetStream、Temporal和Artifact持久卷；恢复后原AUTO Run仍为`AUTO_TRADE_EXECUTED`，4订单/4 Fill、CN/US组合账本保持MATCH且业务状态未改变，重新核对原Run。机器报告：[JSON](2026-10-13-v15-paired-backup-restore-sq-v15-e2e-e946ae2d2ce051439c03.json)，SHA-256 `9262b3b4751f68945264921b3de64e076ca944159c4f62b7a96d75132411a2f2`。Artifact卷的内容寻址字节/引用是固定合成探针，不是Qlib真实产物；故只证明卷恢复/hash读取机制，不宣称实际Qlib Artifact跨域配对恢复。全隔离资源清理通过。

所有这些自动结果均不签署用户验收。没有调用真实行情源、真实券商或LIVE。

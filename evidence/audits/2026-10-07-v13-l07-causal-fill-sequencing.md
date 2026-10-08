# V1.3 L07 FakeBroker 因果成交序列持久化补证（2026-10-07）

本次补充 Trade Execution 的真实 PostgreSQL 隔离集成脚本，检验持久事件归约器对成交事件的乱序缓冲与幂等重放。随机命令使用独立订单、200股请求和100股FakeBroker基础成交事实；sequence=2 的累计150股报告先到，随后完全相同请求重放10次。十次重放均返回 `replayed=true`、`buffered=true`，未插入成交或成交 Outbox。sequence=1 累计100股报告到达后，序列游标一次前进到2，seq=1确认已记载的100股基线、增量为0；seq=2因果应用新增50股。最终FakeBroker成交事实合计150股、两条成交记录/两条成交Outbox（含基础成交）、无未应用Inbox事件。按成交价格和费用计算的成交现金合计为1530.0190 CNY。应用后再重放seq=1与seq=2，事实数量和Outbox数量均不变。

证据命令：`pnpm --filter @stockquant/trade-execution-service test:integration:persistence:isolated`，exit 0。独立账本可选性修复后再次复验通过。实际数据库镜像ID `sha256:9e9764474d0c70ceff17378a6eca55b00c98d2f4d564be06a8e82f2431b3caa2`，随机PostgreSQL容器仅绑定127.0.0.1，限制为1 CPU/512MiB/只读根文件系统/临时数据卷；测试结束后容器由脚本删除。最新合成命令中的run ID `3dccb4b0-2654-4b5c-95b1-733b299d5185`、订单 `66ceb02d-c095-48e8-9dc5-10ebdc18a034`。服务未连接。

此证据只覆盖Trade仓储/真实PostgreSQL中的事件Inbox、成交事实和Outbox顺序/重放。它没有经过登录用户、Platform TestRun和Proposal授权的正式浏览器入口；Fill Outbox仍为待投递状态，因此没有验证Portfolio/FakeBroker独立资产现金与持仓最终一致，也没有取得CLI对同一浏览器TestRun的核验。故仅为L07底层持久化子项通过，不关闭L07、P3或V1.3阶段验收。此前独立隔离测试的失败运行已保留；最终完整持久化脚本通过。

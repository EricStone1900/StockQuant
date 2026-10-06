# W2/P-F05：撤单期间的 FakeBroker 累计成交回报

日期：2026-10-02。结果：累计回报→增量Fill及撤单顺序边界已验证；独立外部委托/人工验收不在本证据覆盖范围。

Trade Execution新增固定FakeBroker模拟报告接口 `POST /internal/v1/orders/{orderId}/simulated-fill-reports`，只允许Platform API独立Bearer。共享契约要求externalFillId、严格递增broker sequence、累计数量、价格、费用、生效时间及证据引用。数据库原始报告按订单序号和externalFillId唯一保存指纹；系统将累计成交水位变化转为增量Fill并独立写入Outbox。相同报告重试幂等；同ID异载荷、序号倒退、累计量倒退、超过订单量和终态订单新报告均拒绝；累计量不变时只持久化报告，不制造Fill或账务事件。

订单行锁把报告接收与撤单权威接受结果序列化。隔离PostgreSQL对照验证两种顺序：报告先于撤单确认时，50→75累计水位产生25股增量、75股总Fill后撤销未成交余量；撤单确认先提交时，后到报告被终态保护拒绝且数据库无新增Fill/Outbox。Reservation解决Outbox在全部相关Fill事件投递后才可领取；Portfolio根据两条真实增量写账，只释放未成交余量。

`pnpm --filter @stockquant/trade-execution-service test:integration:persistence:isolated`通过，使用digest固定临时loopback PostgreSQL并清理；脚本覆盖累计回退、超量、零增量、重复报告和双顺序。扩展双服务`pnpm --filter @stockquant/trade-execution-service test:p5-7`实际启动Trade与Portfolio HTTP服务、连接独立服务数据库，TestRun=`f86a080a-e379-490f-9a95-30863e0130a3`：初始Fill 50股，撤单请求期间累计回报75股，生成25股增量；Portfolio共入账两笔Fill合计75股，Trade订单为CANCELLED，两个Fill事件与reservation-release事件DELIVERED，现金`8230.9685`，ledgerEntryCount 5，reservation状态RELEASED且captured cash `766.0305`。同报告重试返回幂等结果，历史回放身份调用该写接口403。Trade typecheck、62单测、4个集成目标保护测试、合同/Schema/OpenAPI/兼容矩阵生成检查通过。

本测试明示的线性化语义是以数据库事务先后顺序处理固定FakeBroker报告和撤单确认。没有真实券商或外部端点；没有覆盖撤单已被对端确认但成交早已发生、报告延迟越过确认的外部因果序号协议，也没有实现独立外部委托输入/对账。不能据此关闭P-F05/W2或当前V2.4人工接受。活动服务未连接；随机测试账户和数据库记录由Smoke按TestRun范围精确清理。

本增量全文件SHA-256：[Manifest](2026-10-02-w2-fakebroker-fill-cancel-race.sha256)。


最终阶段回归：修复新Schema/Trade实现后历史W2哈希清单与工作树同步，再运行 `pnpm verify:stage -- --stage V2.4 --suite code`，完整退出0。回归日志中的P5.7双服务 smoke TestRun=`1d17df03-32af-4604-ad29-dc69e32f3c2d`，含响应丢失恢复、费用更正与撤单中增量Fill；V2.4 API normal/rejection/recovery TestRuns=`a32c3fbd-72d1-4c8a-b6ac-de6765d05262`、`3d0e53a1-00bf-4c91-b176-870b9125522a`、`76cc71a0-320b-4130-9d40-6a1f290e0a35`，Web同Run分别`c0c06d2b-5e0e-4106-aec1-6353bbac6567`、`d9960f8c-6ccb-4c7d-a727-11c0bbeb20b9`、`7ae068af-9ccf-40b7-942c-779252f65651`均exit 0，API同Run CLI核对及Chromium通过，恢复注入PASS、临时数据库已清理、`activeServicesTouched=false`。Linux ARM64 readiness镜像`sha256:ce3099253598b1e413ad5de21762c166d389a9d7b83b09d24f1d474a4c83d11e` PASS，LIVE/订单写入关闭且FakeBroker行数为0。

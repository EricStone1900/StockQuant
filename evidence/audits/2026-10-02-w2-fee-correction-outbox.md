# W2：FakeBroker 费用更正持久 Outbox 与 Portfolio 跨服务闭环

日期：2026-10-02。结果：费用更正跨服务数据链 PASS；P-F05/W2 整体仍 IN_PROGRESS。

Trade Execution新增平台API Bearer限定端点 `POST /internal/v1/orders/{orderId}/fills/{externalFillId}/fee-corrections`。接口要求连续revision、previousFee、correctedFee、生效时间和证据引用；校验订单/Fill归属、原始FILL_POST已入账、前值匹配和既有更正已交付后，在事务内更新FakeBroker当前费用、写入修订历史、订单事件及`FEE_CORRECTION` Outbox。相同载荷/版本重放幂等，载荷冲突与跳版拒绝；未完成的先前更正构成顺序屏障。Outbox具备领取租约、fencing token、成功ACK、失败重试及三次失败进入补偿状态。

`fake_broker_fills.original_fee`固定原始成交事实；Trade重连重放使用该原值，Portfolio也保存原始费用与当前费用分离。共享Schema、OpenAPI及兼容矩阵包含Portfolio接收契约与Trade生产者边界。补偿分发器按`FEE_CORRECTION`事件调用生成Portfolio客户端。

验证结果：

- `pnpm --filter @stockquant/trade-execution-service typecheck`：PASS。
- `pnpm --filter @stockquant/trade-execution-service test`：62单测、4个隔离PG目标安全测试PASS。
- `pnpm contracts:check`：JSON/Schema/Fixture验证、所有客户端生成器漂移、104条兼容规则及OpenAPI检查PASS。
- `pnpm --filter @stockquant/trade-execution-service test:integration:persistence:isolated`：PASS。专用PostgreSQL镜像`sha256:9e9764474d0c70ceff17378a6eca55b00c98d2f4d564be06a8e82f2431b3caa2`，loopback动态端口，仅隔离数据库，容器已清理；覆盖revision 1→2、重放幂等、冲突、投递顺序屏障、claim/ACK与原始Fill保持。
- `pnpm --filter @stockquant/trade-execution-service test:p5-7`：PASS。双服务临时HTTP+专用Trade/Portfolio测试库。TestRun=`72cf8f97-7df5-4be4-a1f0-9b6981321213`。Portfolio更正事件实际投递且Outbox DELIVERED；同命令重放返回同event，historical-replay身份403；账本现金`8996.9990`、`FEE_CORRECTION`后账本3条、BUY捕获金额`1003.0010`；Portfolio原始费用`1.0010`，更正费用`2.0010`。随机账户和订单数据由Smoke精确清理。

没有请求数据源、Paper或Broker动作；本测试FakeBroker模式，不连接活动服务。此结果不覆盖成交与撤单权威回报的全部因果竞态，也不实现独立外部模拟委托；Web/CLI对本项单独场景的验收及用户签署未做，因此不得关闭P-F05或V2.4/W2。

逐文件SHA-256：[Manifest](2026-10-02-w2-fee-correction-outbox.sha256)。

追加全阶段代码套件复验：受控 `pnpm verify:stage -- --stage V2.4 --suite code` 明确退出0。V2.4 API normal/rejection/recovery Runs 为`4d27009b-4e4f-4b2d-9717-631ee83cc599`、`45c03dbe-1f6e-4443-b99f-6e8beef033e3`、`1a53e0cb-bde0-48da-971f-af0ca718ff6f`；对应Chromium Web Runs `145e9b58-38a0-4f58-b39e-cfd2b4290373`、`0ea8b885-4ad2-4b25-b269-dd96b13de528`、`d01e35d5-454f-4d4a-b844-6617cd15de72`全部exit 0，API Run经同Run CLI核验；包含响应丢失恢复，临时数据库清理，`activeServicesTouched=false`。容器Linux ARM64 readiness PASS，Trade镜像`sha256:dcad75d265cf951ee6d142fa00b02dcd5c82d3d7d5a327017060c5c6c431124a`，Paper订单写入关闭且FakeBroker行数0。完整套件还执行本次费用更正双服务Smoke TestRun `c1ff7274-bc20-4626-8926-b274b46da333`。默认沙箱首跑在Qlib Worker loopback bind返回EPERM；相同完整命令在受控本机环境退出0，该限制和恢复结果均保留。

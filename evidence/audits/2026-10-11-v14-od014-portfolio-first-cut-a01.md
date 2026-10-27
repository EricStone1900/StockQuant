# V1.4 OD-014 Portfolio 首轮实现记录

日期：2026-10-11  
结论：实现进行中；本记录只覆盖静态代码切片，不代表Paper链或P4通过。

本轮实现Portfolio schema v2、Paper SELL应收和快照投影、Run Clock驱动的到期结算端点、结算现金账本事件、已结算BUY预留门禁，以及基于冻结Fixture和Manifest SHA的日期/市场/币种/交易时区校验。SELL应收的费用更正按状态更新应收或已结算现金。同步更新Reserved Fill与Account Snapshot Schema、Portfolio Account OpenAPI、生成客户端、Portfolio容器Fixture文件及清理测试。

检查结果：

- `pnpm contracts:check`：PASS，日志见[合同检查](./2026-10-11-v14-od014-portfolio-contract-check-a01.log)。
- Portfolio、Trade Execution、Platform API TypeScript typecheck：PASS；Portfolio单测4文件/11项PASS，详见[静态检查日志](./2026-10-11-v14-od014-portfolio-static-check-a01.log)。
- [客户端生成记录](./2026-10-11-v14-od014-portfolio-contract-generation-a01.log)。
- Portfolio PostgreSQL integration：NOT_RUN，本轮没有配置/启动受控隔离PostgreSQL；新增的迁移v2、SELL应收、2024-01-08释放、BUY预留门禁与重复释放用例尚无执行证据。
- Trade FakeBroker Fill Outbox尚未从冻结日历生成并传递结算对象；目前冻结Fixture未覆盖V1.3固定的2026 Paper日期。因此尚未完成Trade→Portfolio、US、Web/API/CLI同TestRun和Quant/Paper账本对照。

所有结算只对`PAPER`生效；BACKTEST维持原有立即记账语义。用户批准严格结算政策已记录于[OD-014决定](./2026-10-11-v1-od014-owner-decision-a01.md)。当前V1门禁仍INCOMPLETE；不得据本切片关闭P4、阶段或版本验收。

日志SHA-256见[校验文件](./2026-10-11-v14-od014-portfolio-first-cut-a01.sha256)。

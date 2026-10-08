# V1.3 L08 单成交手续费更正 Web 纵切（2026-10-07）

本轮把 FakeBroker 已有版本化费用更正操作接入 V1.3 正式 Platform/Web 路径，并验证同一 TestRun 的持久事实。Platform 先验证登录用户、V1.3 TestRun、该 Run 的 Proposal、FakeBroker 原订单授权元数据和精确 externalFillId；浏览器只能提交 revision 与前后费用，Run Clock 和 `evidenceRef` 由 Platform 生成。Trade仍是权威写入者，数据库行锁及版本/前值/完整命令比较负责并发和精确重放。

端到端发现并修复两项账本读取缺陷：FakeBroker订单读取原先始终返回成交时的 `original_fee`，因此费用更正后对账仍报旧费用；其独立现金账本也没有在更正时同步费用差额。现在订单事实返回当前 `fee`，而原始费用历史仍保存在 `original_fee`；FakeBroker成交费更新与独立资产现金差额在同一PostgreSQL事务提交。Trade→Portfolio Outbox按版本投递更正。另移除Platform在调用Trade前对“当前费用等于previousFee”的拦截，使完全相同的旧revision请求可到达权威幂等记录；不同命令仍由Trade拒绝。

正式Web固定场景：CN_A账户初始现金10000.0000，成交100股×10.0000，费用从5.0000更正为6.0000。更正前现金8995.0000；更正后Portfolio和FakeBroker独立资产现金均为8994.0000，持仓均为100股；Captured Reservation为1006.0000。精确提交同一revision-1命令只产生一次更正，Trade返回 `replayed=true`，同Run CLI `--check-only`读到FILLED、MATCH、8994.0000现金和1006.0000 Captured金额；页面刷新后结果仍存在。Run Clock为`2026-09-28T09:31:00+08:00`。TestRun `b4dd5393-a673-4e8f-8f36-c5c042d51c55`平台导出Manifest SHA-256为`da1ec67618fd6588cfde727530d14f8e1fbe924fae98be743200f52ffe16fab2`。

最终验证：

- `pnpm test:e2e -- --stage V1.3`：exit 0，16/16通过，含本L08测试、L09外部订单差异、L10注销后Platform重启旧会话仍401及L06 Trade重启恢复。随机Compose项目`sq-v13-web-b8110274053eeb22f6a1`的容器、卷、网络均已删除；外部源与真实券商调用均为0。
- `pnpm contracts:check`：exit 0，282个JSON文件/201个Schema/44个Fixture通过验证，客户端生成无漂移，29个生成器注册完整。
- Platform、Trade Execution、Web TypeScript typecheck及`git diff --check`：exit 0。

这仅覆盖L08的单个完整成交、revision-1更正、精确重放、跨服务账本投递和同Run只读核对。未覆盖部分Fill逐事件更正、撤单与更正竞态、更正Outbox失败后恢复、真实券商、真实Paper部署和用户人工验收；不代表L07/L08、V1.3阶段或V1版本关闭。此前失败的执行记录保留在Playwright `test-results`/历史终端证据中；最终全套16/16结果作为本次通过证据。

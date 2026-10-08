# V1.3 L08 部分成交、撤单与费用更正正式闭环

日期：2026-10-07（Asia/Shanghai）

本记录仅覆盖 L08 固定 CN_A / PAPER / FAKE Web 场景：100 股 `600000.SH` 买单，先以 FakeBroker seq=1 成交40股，再按序号2接受撤单，释放60股余量，最后把该Fill手续费从1.0000更正为6.0000。它不代表P3其余L01–L10或V1版本验收完成。

随机隔离Compose项目 `sq-v13-web-1b0e53ad4a93a9cc4e5d` 上，Platform、Portfolio、Governance、Trade Execution、PostgreSQL及容器化Web真实启动。Playwright正式页面按用户动作创建隔离Run/Proposal、人工批准、提交100股working order、记录40股seq=1 Fill、查询到`CANCEL_REQUESTED`、应用seq=2接受撤单，随后提交费用更正。独立事实为：订单`CANCELLED`；FakeBroker与Portfolio持仓各40股；费用更正revision=1且相同更正幂等重放；最终两边现金均为9594.0000 CNY；Reservation为`RELEASED`、capturedCashAmount为406.0000（成交本金400+更正后费用6）；对账`MATCH`。同一`testRunId=ba3778b9-fcf2-4a67-9891-8ad49a38c80c`的CLI `--check-only`返回预期WAITING/exit 2，并核对同一订单、现金、释放预留及资产匹配；只读前后没有副作用。外部行情和真实券商调用均为0。

浏览器测试：`V1.3 L08 applies a partial fill, accepted cancellation and fee correction through Web and same-Run CLI`，1/1 PASS；最终隔离Harness exit 0，容器/卷/网络清理检查通过。关联的Stage TestRun证据导出位于`evidence/local/V1.3/ba3778b9-fcf2-4a67-9891-8ad49a38c80c/evidence.json`，SHA-256 `7ad299576b630d6187ac83537a3281d1e84a8ed021d70941e04735acda5dbf12`。该Stage Run本身诚实保持WAITING；业务PASS来自上面实际执行的Playwright断言与同Run CLI检查，不由平台的Stage Run摘要伪造。

复验时暴露并修复Trade撤单结果HTTP处理器未drain reservation-resolution Outbox的问题。第一次持久化归约已产生释放事件，但若无后续轮询，Portfolio预留会继续HELD；现在序号事件成功归约后立即drain pending Outbox。费用更正Outbox仍异步交付，因此E2E等待Portfolio余额收敛后再做独立对账。真实路径曾显示现金9599对9594的差异，修复后固定场景全链路MATCH。

运行入口：`STOCKQUANT_V13_E2E_GREP='V1.3 L08 applies a partial fill' pnpm test:e2e:v13-isolated`。Harness项目/端口/密码随机化，并在退出时验证容器、卷、网络已删除。

## 增强复验

追加复验进一步把释放时点和更正重放放进同一个真实场景：Platform在持久`CANCEL_REQUESTED`后读Portfolio快照，明确断言Reservation仍为`HELD`，然后才发送seq=2；响应包含该中间态和最终`RELEASED`。E2E对手续费revision-1精确重放再次调用正式Web API，按本Platform端点合同返回HTTP 202且`replayed=true`，Portfolio余额仍只扣一次。另一次初跑曾误将此接口的幂等重放期望写成200；错误在Playwright断言（非服务业务），依据该Platform路由固定202的现有合同改为202后复验通过。

最新完整复验Run `4597d1cf-81bc-4553-8fc7-4bd7f2926efc`，Proposal `f1745ebe-18ba-4809-8912-ce110afa5ffc`，FakeBroker现金9594.0000 CNY、Fill40股、取消余量60股、更正后费用6.0000；CLI `--check-only`核对同一订单及释放预留通过。Stage Run导出ManifestHash `7ab4490bc81b66b2c795b2649854a6a58684869b4eb45221319845e729978f9a`，其平台业务摘要继续保持WAITING/NOT_RUN，业务断言以Playwright和CLI实际结果为准。隔离项目`sq-v13-web-34498d7abe8c3b94d23c`退出0，Harness核实容器/卷/网络均清理。

## L08变更后的完整回归

完整`pnpm test:e2e:v13-isolated`使用随机项目`sq-v13-web-26c45aee91d57f6f5097`运行18/18 Playwright场景全部通过：既有L01–L07、L09–L10与新增L08均通过Web/API/CLI断言。该Harness退出0，容器、卷及网络准确清理；外部行情和真实券商调用为0。增强后的L08 Run `552d9af8-ad6a-4af8-b594-abf4d1a19833`，Stage导出ManifestHash `8a091502b3fdf44340071b6d684a368388bfee6078e27d7f3e1e7f8f92d0accf`；费用更正6.0000 CNY后FakeBroker/Portfolio现金9594.0000、40股，对账MATCH，撤销余量Reservation RELEASED/capturedCashAmount 406.0000。该矩阵仍限于冻结软件Fixture，不替代未覆盖的P3非固定故障和V1其余P阶段。

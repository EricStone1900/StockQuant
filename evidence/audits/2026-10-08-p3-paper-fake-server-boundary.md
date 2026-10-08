# V1.3 服务端 Paper/Fake 模式边界复验

日期：2026-10-08  
范围：Portfolio account initialization、Trade V1.3 manual execution、Governance Proposal create 三个服务端HTTP接受边界。此审计只记录可复现的模拟模式拒绝检查，不代表全服务路由清单已全部审查，也不代表正式V1.3验收通过。

## 结果

- Portfolio 隔离HTTP/PostgreSQL smoke 对 `LIVE + FAKE`、`PAPER + REAL`、`LIVE + REAL` 分别返回403；拒绝后账户数为0。合法 `PAPER + FAKE` 随后仍可创建账户。
- Trade V1.3 `execute-manual-proposal` 收到合法作用域字段外附加的 `environmentMode=LIVE`、`brokerMode=REAL` 时返回422；FakeBroker订单数为0。该API没有允许调用方选择broker/environment的字段，服务端执行服务使用FakeBroker。
- Governance Proposal API 对上述三种非法模式组合均返回422；Proposal仓储`create`仅被之前合法请求调用一次。
- 完整V1.3 code suite退出码0，日志中Portfolio和Trade真实HTTP/PostgreSQL smoke、治理单测均通过。代码套件包含Platform 60文件/268项、Trade 18文件/87项、Portfolio 3文件/5项、Governance 8文件/40项及其他版本基线检查。
- 代码套件的完整原始输出：[日志](./2026-10-08-p3-paper-fake-server-boundary-code-suite.log)，SHA-256 `445546fc0ef4b94d0b6c2c30ad5f54a53d7ffe2be5b7ecd89cb40096c0698e68`。
- 同轮V1.3隔离Web/API/CLI矩阵21/21通过，每个Run的同Run CLI check-only及结构化导出通过；随机项目`sq-v13-web-69c210a55c7d7abf45e5`的容器、卷、网络均已清理；外部来源和真实券商调用为0。42份逐场景PNG/Trace见[Hash清单](./2026-10-08-v13-browser-captures-paper-fake-boundary.sha256)，清单SHA-256 `53239d6e0d365f6d3915d9b3ef99faec547bacfc9969340ac56e1e2b92861aa6`。失败的普通沙箱尝试因Docker socket EPERM退出1，随后受控访问复验通过。该矩阵只做固定Fixture范围验证。

## 尚未证明

全量“所有服务端接受路径”的逐路由清单仍未完成；回测路径按 `BACKTEST + FAKE` 工作、Paper路径按 `PAPER + FAKE` 工作，需要按Stage逐项核对，不能把全平台策略粗略压成只接受PAPER。此复验未声明LIVE交易能力；也不取代市场规则、Ubuntu部署和人工验收。

阶段待办保持未勾选，待以完整路由矩阵及对应行为证据结项。

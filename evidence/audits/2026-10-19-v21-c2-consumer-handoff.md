# V2.1 C2-B 独立消费者交接边界审计

日期：2026-10-19（Asia/Shanghai）  
范围：冻结monitor/daily/strategy/order消费边界，并验证快照完成不隐式启用下游策略。  
结论：**交接边界已记录并有隔离HTTP/PG烟测证据；消费者执行器仍未实现，C2-B与C2整体保持IN_PROGRESS。**

## 已确认的边界

- Market Data是原始报价事实的唯一所有者。当前可读入口为Platform转发的`GET /v2/sampling/tasks/latest`，必须按owner/account/namespace/TestRun scope读取。
- Monitor只消费终态快照任务的观测引用和来源、数据模式、观察/入库/可用时间、年龄、新鲜度与状态。陈旧或未知观测不能当READY；Monitor自身负责覆盖/年龄质量与确定性异常，不调用模型或下单。
- 日线完成必须由独立DAILY_BAR来源、完成标志、版本和`availableAt`驱动；快照不可合成日线或分钟线。
- 策略只由已完成日线触发并受OD-007门禁；订单只在独立C5执行窗口及C5批准后运行。快照和日线结果均不能绕过门禁。
- monitorEvaluation、dailyBarCompletion、strategyEvaluation和orderExecution四类policy在快照完成后都保持`enabled=false`、`executor=NOT_IMPLEMENTED`。专用服务身份、跨服务事件/Outbox投递、Monitor独立存储/API和持久化质量结果仍需在相应消费者实现前冻结S0并验证。

## 验证

- `pnpm --filter @stockquant/market-data-service sampling:http-restart-smoke`：PASS。隔离PostgreSQL v1–v14迁移、Fixture Worker完成、服务重启恢复、完整scope观测读回、过期数据保持STALE、未授权REAL任务阻断、下游四策略禁用检查均通过；`externalRequests=0`。临时PostgreSQL容器和网络已移除并核实。
- 命令内`pnpm build`（TypeScript build）：PASS。
- `pnpm docs:check`：PASS，13,996个本地Markdown链接，0失败。
- `git diff --check`：PASS。

## 未完成

当前Market Data接口是读取最近快照任务的业务查询，不是已部署的跨服务消息契约或服务身份授权。尚无Market Monitor服务消费者、独立DAILY_BAR完成Worker、策略评估器、订单窗口执行器、各自的持久运行/恢复结果或正式Web业务行为。真实来源许可/能力也未验证；此审计未进行真实源请求。后续按C2-C建立Monitor质量评估和独立日线完成Fixture链；策略/订单仍只保留禁用门禁，不在本阶段启用。

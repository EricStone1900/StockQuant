# P3.11 V2.4 观察运行修订保护

日期：2026-09-25（Asia/Shanghai）。工作区基线：`c40c49c828a3ed16de50852a03898ea351cacab2`。状态：DONE（隔离库工程验证）；没有部署到当前持续观察容器，没有改动正式运行数据或人工结论。

## 问题与改动

V2.4 专用观察适配器绕过通用 TestRun 仓库：日终代码可覆盖任意现有状态；应用启动时检测到已完成观察日存在质量错误，会直接把 `COMPLETED` 改成 `FAILED` 并删除最终化投影，原 TestRun 的断言/证据没有单独留档。

- 新增 `acceptance_stage_run_revisions`。失效迁移在同一 SQL 语句内先保存旧 TestRun 的状态、断言、证据和时间，再将当前状态标为 `FAILED`。后续启动不会重复追加，因为失效行已不再是 `COMPLETED`。
- 日终完成只更新匹配 V2.4 observation、日期 namespace 和非终态运行。已完成的相同结果可幂等重试；内容冲突、缺失运行或其他终态均返回 409。
- 新集成脚本使用隔离测试库、随机日期及运行 ID，结束时按确切 ID/日期清理。

## 验证

- Platform API typecheck：退出 0。
- Platform API 单测：35/35 通过。
- `pnpm test:integration:platform`：退出 0。既有 TestRun 完整性场景通过；V2.4 场景验证旧记录只归档一次、当前运行改为 `FAILED`，原 `COMPLETED` 状态/断言/证据可读；相同日终结果重试成功，改变结果被 409 拒绝。
- `pnpm docs:check`：477 个本地 Markdown 链接通过；`git diff --check` 通过。

## 边界

这是源代码和隔离 PostgreSQL 验证，不是当前运行容器的部署证据。恢复 revision 的 Web/API 查询、历史数据库迁移实测、V2.4 全套 code/E2E 与20个实际交易日观察仍须各自验证；阶段和版本人工验收没有因此变化。

## 后续部署范围校准（2026-09-27）

P3.11上述“没有部署”准确描述本审计执行时点。随后P3.12审计记录从含本段修订保护的工作树构建并部署Platform API与Web镜像，活动revision读取路由返回200；正式观察库当时没有revision记录。故代码/路由部署边界可由[P3.12审计](./2026-09-25-p3-12-v24-observation-history.md)证明，但活动数据失效迁移、revision产生与冲突日终保护仍没有自然业务事件验证；20日观察与人工验收未改变。

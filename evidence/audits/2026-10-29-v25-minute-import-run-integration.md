# V2.5持久分钟导入查询与TestRun衔接

日期：2026-10-29。范围：仅验证已有分钟导入的只读详情/首屏查询，并将结果绑定到owner-scoped V2.5 TestRun；不导入外部市场数据，不执行模型/策略/FakeBroker，不扩大原数据容量声明。

## 实现

- V2.5页面增加DataVersion输入和“核验持久导入并创建TestRun”操作，链接到既有V2.2分钟导入入口。
- Platform使用既有`GeneratedMarketDataMinuteClient`读取Market Data `GET /v2/minute/imports/{version}`与`GET /v2/minute/imports/{version}/bars?cursor=0&pageSize=100`。只接受身份格式有效且状态为`PUBLISHED`的导入版本；Not Found/错误状态不生成Run。
- 新V2.5 `minute-import-query` TestRun持久保存导入ID、DataVersion、源SHA-256、频率/RAW语义、来源许可声明、研究用途标记及首屏查询摘要。读回条数上限100；不把此操作描述为导入任务排队、总存储配额、研究可用性或生产负载证明。
- 原合成normal/rejection/recovery保留，页面明确它们仍只覆盖内存Fixture场景。

## 验证

定向浏览器页到V2.5路由测试：1/1 PASS。平台单测`tests/unit/v25-minute-import-run.spec.ts`：2/2 PASS，覆盖真实生成客户端路径、持久TestRun投影和缺失导入不写Run。Platform与Web typecheck通过；Market Data、Platform构建及Web生产构建通过。

真实隔离集成命令（最终复验退出0）：

```bash
pnpm --filter @stockquant/platform-api-service v25:minute-import-run-smoke
```

烟测在仓库隔离PostgreSQL包装器中创建随机数据库，启动真实Market Data、Platform及Chromium Web。最终复验Vite URL为`http://127.0.0.1:54248/acceptance/v2/v2.5`、Platform API为`http://127.0.0.1:54247`、Market Data为`http://127.0.0.1:54246`。先经V2.2 API把6行固定正常Fixture写入临时Market Data PostgreSQL，再在V2.5正式页提交其DataVersion；V2.5 TestRun `fe1a5666-55e2-4f8a-a5bf-c22901d538a9`含两项PASS断言，正确绑定DataVersion `v2.2-import-a1f0428bf02f`、Import ID `minute-import-a1f0428bf02f834e84d3b398`和SHA，读回6条持久Bar。直接PostgreSQL查询确认Market Data的6行及Platform `acceptance_stage_runs`中唯一同Run记录；HTTP owner读回一致，异主读取403；`verify:stage -- --stage V2.5 --run fe1a5666-55e2-4f8a-a5bf-c22901d538a9 --check-only`退出0。外部Provider请求0。

首轮烟测因测试脚本将服务目录误作仓库根目录，启动前失败；修正根路径后同一隔离烟测通过。包装器报告PASS并已移除、核对随机容器及网络；脚本删除本次平台TestRun并删除两测试数据库。第二轮完整命令最终退出0。该6行Fixture只验证纵切连接，不是归档容量复验、真实行情接入或C6总验收。

## 未完成

V2.5页面目前查询既有已发布版本，不从该页新建CSV/Parquet上传。持久Collection队列与分钟上传暂存配额仍需按实际职责分别核实；上传取消/服务重启既有证据可复用，但不能推定V2.5接线通过。仍需拒绝/重启相关纵切证据、CLI证据导出与实际操作手册；当前候选人工验收`NOT_RUN`。第二分钟源及60日覆盖`DEFERRED`；全市场分钟、长期源稳定性、PIT研究与V2.4实际观察继续按原门禁未完成。


## 后续状态更新（2026-10-29）

本报告“未完成”一节记录的是分钟上传队列接入前的点时状态，其中“候选人工验收NOT_RUN”不再代表当前状态。后续分钟上传持久队列、租约过期接管、总Bar额度与Web取消/恢复已在[队列审计](./2026-10-29-v25-minute-upload-queue.md)中完成验证；项目所有者确认并通过独立复核，`C6_LOCAL_SINGLE_SOURCE_ENGINEERING`仅本地单源工程范围PASS。V2.5/V2整版、全市场分钟、长期稳定性、PIT及V2.4实际观察仍未通过。

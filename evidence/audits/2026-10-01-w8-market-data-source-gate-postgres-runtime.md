# W8 Market Data 来源门禁 PostgreSQL 联合运行态烟测

日期：2026-10-01。状态：PASS（本地候选镜像、隔离测试环境）。

## 被测内容

- Market Data候选镜像：`stockquant-market-data:source-gates-20261001`
- 镜像ID：`sha256:d8d368a1ca020e1bb0edd3eb5984214a2bb929ccd81ab0188189a555f24e8043`，平台`linux/arm64`
- PostgreSQL：仓库Compose锁定镜像`postgres:16.9-alpine@sha256:7c688148e5e156d0e86df7ba8ae5a05a2386aaec1e2ad8e6d11bdf10504b1fb7`，本地镜像ID `sha256:9e9764474d0c70ceff17378a6eca55b00c98d2f4d564be06a8e82f2431b3caa2`
- 命令：`pnpm market-data:source-gates:container-smoke`

脚本创建随机命名的Docker `--internal` 网络、临时PostgreSQL数据库（数据目录仅tmpfs）及只读候选服务容器。使用临时数据库密码和测试用服务Bearer。采集调度worker显式开启；quote/news/minute collection/historical research来源用途授权全部显式关闭，授权引用、版本与白名单为空。烟测没有发布端口、没有加入活动Compose网络，且Docker网络`Internal=true`。

## 结果

退出码0，JSON状态`PASS`：

- 服务 readiness：`collectionPersistence=POSTGRES`、`collectionSchedulerWorker=ENABLED`、`collectionExecutor=DISABLED`、`liveQuoteMode=NOT_AUTHORIZED`、`collectionSourceAuthorization=NOT_AUTHORIZED`。
- quote、news、sourceSmoke均返回403 `SOURCE_NOT_AUTHORIZED`；sourceSmoke `externalRequests=0`。
- Python采集适配器返回`SOURCE_NOT_AUTHORIZED`，在创建Provider/请求前拒绝。
- smoke报告`activeServices=NOT_CONNECTED`。
- 随机PostgreSQL容器及internal网络在finally精确清理，脚本查询Docker状态确认资源为零；独立后验筛查无`sq-source-gate-`残留容器/网络。

这次补充了先前无数据库烟测的限制：当前结果证明在PostgreSQL和持久调度worker均实际启用时，来源未授权仍会阻止采集Executor创建。它仍是隔离候选验证，不证明活动部署。

## 未完成项

活动Market Data旧镜像在2026-10-01 12:00Z只读检查中仍报告scheduler/executor `ENABLED`，但启用订阅数为0、`nextExecutionAt=null`且本次无任务提交。候选门禁尚未部署。没有修改活动服务、容器、数据库、调度订阅、数据卷或真实来源。维护负责人/窗口、活动备份和恢复、镜像替换/回退尚未执行；不得据此增加O1/O2观察天数或更改人工/版本验收。

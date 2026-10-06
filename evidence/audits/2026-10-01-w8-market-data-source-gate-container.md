# W8 Market Data 来源门禁候选容器烟测

日期：2026-10-01

## 范围与输入

对包含W3/W4来源用途门禁的Market Data服务构建Linux/ARM64本地候选镜像，并在与活动服务隔离、无外网的Docker容器中验证运行态。镜像：`stockquant-market-data:source-gates-20261001`；digest：`sha256:d8d368a1ca020e1bb0edd3eb5984214a2bb929ccd81ab0188189a555f24e8043`。

复验命令：`pnpm market-data:source-gates:container-smoke`。容器使用`--network none`、只读根文件系统和临时`/tmp`，未连接活动服务、数据库或外部来源。

## 结果

退出码0，脚本结果`PASS`：

- `/ready`报告`liveQuoteMode=NOT_AUTHORIZED`、`collectionSourceAuthorization=NOT_AUTHORIZED`。
- quote、news、sourceSmoke路由均返回403；sourceSmoke的`externalRequests=0`。
- Python适配器在Provider创建/请求前返回`SOURCE_NOT_AUTHORIZED`。
- `activeServices=NOT_CONNECTED`。
- Collection executor在本烟测为`DISABLED`，因为容器没有数据库持久化依赖；该结果不单独证明有数据库时执行器门禁。独立单元测试验证启用请求缺少完整来源授权时`shouldEnableCollectionExecutor`返回false。

## 边界与后续

这只是候选镜像的隔离工程验证，未部署到活动服务。2026-10-01 O1活动运行态审计仍显示旧活动镜像缺少新授权字段并报告`LIVE_SOURCE`/executor enabled。根据保留活动服务和NO_TRADE/无线源授权约束，本次没有部署、重启或调用来源。活动镜像的维护窗口、替换/回退和部署后运行态复验仍未完成；来源许可、O1/O2有效观察以及阶段/版本人工验收也未完成。

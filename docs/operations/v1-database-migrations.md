# V1 服务数据库迁移

状态：迁移入口已实现并通过隔离 PostgreSQL 验证；活动数据库迁移、完整配对备份恢复和逐服务旧版回退尚未执行或验收。本文件不授权操作活动数据库。

运行时服务依赖顺序与数据库逐库迁移顺序是不同门禁；V1各阶段提供者API、调用方、Web与后台消费的准备顺序见[服务发布顺序与回退准备](./v1-service-release-order.md)。

## 适用范围

入口 `pnpm db:migrate:v1` 对一个服务数据库执行检查或应用。支持 `portfolio-risk`、`platform-api`、`decision-governance`、`trade-execution`、`historical-replay`、`quant-research`、`market-data`。每次调用只使用 `STOCKQUANT_DATABASE_URL` 指向的所选服务数据库，并核对数据库名与服务角色。检查模式为默认行为，不修改Schema；`--apply` 才执行该服务现有迁移函数。

## 预检和应用

先构建V1服务代码，并在维护窗口前停止会向目标库写入的服务。操作凭据应由受控Secret注入当前Shell环境，不得写入命令历史、日志或仓库。

```sh
pnpm build
pnpm db:migrate:v1 -- --service portfolio-risk
pnpm db:migrate:v1 -- --service portfolio-risk --apply
pnpm db:migrate:v1 -- --service portfolio-risk
```

对其他服务将`--service`替换为对应ID。首次检查在空目标上返回`MIGRATION_REQUIRED`/exit 2；应用成功和重复应用均返回`READY`/exit 0。输出包含数据库名、角色、服务器地址、迁移版本和必要关系名，不包含DSN或密码。禁止以管理员角色连接；服务账户必须与被选服务匹配。

这条入口复用各服务现有迁移实现，不提供跨数据库原子事务。按服务依次执行；部分失败时保留输出和数据库状态，仅对失败服务重新检查/应用。不要删除数据库、表或迁移账本来重试。

## 回退

V1当前没有通用Schema down migration。代码发布回退前，先判断本次Schema是否向后兼容，并保留本次迁移前的逐服务数据库备份。若旧版代码不能读取新Schema，必须将对应数据库备份恢复到**新的隔离数据库**，完成表/行/业务ID/Hash核对后再切换旧版配置；保留原数据库和原备份作为证据。恢复前需另行准备并验证每个服务的恢复命令、角色/权限、Artifact与数据库配对关系及回切步骤。

目前已验证Platform API TestRun专用迁移的恢复演练，尚未验证本Runbook所列全部V1服务的一致备份/恢复及回退。因此任何活动迁移、活动配置切换或回退仍需精确维护窗口、目标清单、操作者责任和单独批准；隔离迁移测试不构成操作授权。

## 隔离验证

使用`pnpm test:db:migrate:v1 --stage V1.1|V1.2|V1.3|V1.4|V1.5`为阶段涉及的每个服务启动独立临时PostgreSQL，依次检查空库、应用、检查和重复应用；完成后核对容器/网络清理。2026-10-09 V1.5四个服务（Platform API、Decision Governance、Trade Execution、Portfolio Risk）逐库隔离验证通过，临时容器/网络精确清理；[运行日志](../../evidence/audits/2026-10-09-v15-migration-cli-suite-a01.log)，SHA-256 `fb3a54451d3f9d84f2977e33fb23a88d52c9a500a7ff58f7d5417be383203db0`。V1.1～V1.4原有证据见交叉索引及各阶段记录。该测试证明迁移入口和现有迁移函数的隔离行为，不证明活动备份恢复、旧版兼容性、Ubuntu部署或用户验收。

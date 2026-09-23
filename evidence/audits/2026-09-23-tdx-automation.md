# TDX 候选源定时观察与容器准备（2026-09-23）

## 定时任务

新增两个只读候选源观察任务，均使用 StockQuant 本地项目：

- `stockquant-tdx`：工作日 11:35，执行 `pnpm v24:preflight`，交易日才运行20只证券的
  `pnpm v25:probe-tdx`，输出 `evidence/dc08a/dc-t19/<日期>/tdx-shadow-am.json`。
- `stockquant-tdx-2`：工作日 15:20，执行相同的交易日判断和只读探针，输出
  `tdx-shadow-pm.json`。

两个任务只记录 TDX 候选源的服务器、延迟、行数、Hash 和错误，不创建采集运行、不写业务
数据库、不发布 Artifact、不修改 `STOCKQUANT_COLLECTION_SOURCES`，也不会启用 LIVE 或真实券商。
任务均为 `ACTIVE`，失败才通知。

仓库校验入口 `pnpm dc08a:verify-automation` 已扩展为同时检查两个 TDX 任务的状态、时间和
探针命令，当前返回 `PASS`；`pnpm test:ops` 80/80 通过。

## 容器依赖

`market-data-service` Dockerfile 新增 `STOCKQUANT_INSTALL_TDX` 构建参数，默认值为 `0`。
默认镜像继续只安装现有哈希锁定依赖，正式来源顺序保持 `sina,baostock`。将该参数设为 `1`
并重建镜像时，才会安装 easy-tdx 固定 Git commit
`4820b4a0496899ece0b8ca4d7f4d66a5159da7f8` 及其运行时依赖；这一步不会自动启用 TDX 来源。
对应的 `requirements-tdx-runtime.lock` 只包含经过哈希锁定的 PyPI 运行时依赖，VCS 包使用
固定 commit 安装。

2026-09-23 已使用 `STOCKQUANT_INSTALL_TDX=1 docker compose -f infra/compose/docker-compose.yml
build market-data-service` 完成可选镜像构建，Docker 构建返回 0；构建出的
`stockquant-v12-market-data-service` 镜像执行 `import easy_tdx` 通过。该镜像仅证明可选依赖
安装路径有效，未替换当前运行容器，也不改变默认构建参数为 `0` 的行为。

## 当前限制

自动任务已具备交易时段和收盘后的 TDX 观测入口，但尚未产生新的实际交易日 TDX 证据。两天
连续观察、20只窗口完整性、限频/断线恢复和正式来源切换仍需根据任务输出单独验收。

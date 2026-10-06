# W9 三版状态一致性复核

复核时间：2026-09-30 08:34Z（Asia/Shanghai）。只读运行仓库的 `verify:version`：

| 命令 | 退出码 | 当前输出 | 主要未决项 |
|---|---:|---|---|
| `pnpm verify:version -- --version V1` | 2 | INCOMPLETE | V1.1仍为PARTIALLY_IMPLEMENTED，统一TestRun活动API切换/回退、新增范围验收未完成 |
| `pnpm verify:version -- --version V2` | 2 | INCOMPLETE | V2.3研究路由/数据/独立验证、V2.4新Paper链/观察、V2.5分钟容量/长期观察未完成 |
| `pnpm verify:version -- --version V3` | 2 | INCOMPLETE | V3.1–V3.4当前均NOT_RUN；已有准备态与Fixture测试未记作真实闭环 |

三次输出均未发现阶段ID和版本验收表之间的遗漏或多余条目；退出码2与计划状态相符。该脚本仅解析 `00-version-plan.md` 与 `99-acceptance.md` 的文字状态及检查项，不能证明原始TestRun、Manifest、生产数据、观察或人工签署有效；不能据此关闭W9。原始命令结果保留在本次执行记录中，未改写任何阶段结论或勾选。

本次工作树内容清单：[W9版本门禁源码快照](./2026-09-30-w9-version-gate-content-manifest.sha256)，覆盖4448个Git已跟踪及未忽略未跟踪文件，SHA-256为`c9c333534a1cb13ea41aa39c2f4cd5652fc825ce5ba32ff9aa60c4c890cf9d1f`；排除本清单与本审计文件，不包含忽略文件或秘密配置。

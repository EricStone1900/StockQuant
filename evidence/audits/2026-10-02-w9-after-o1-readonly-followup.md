# W9 三版本门禁刷新：O1无来源授权只读复核后

2026-10-02在将DC-08A只读复核加入V2.1/V2.5数据进度记录后，重新执行V1/V2/V3版本门禁。三版整体仍`INCOMPLETE`，各阶段文档结构和本地证据引用/Manifest审计均PASS；无invalid PASS、缺失验收或意外验收行。

| 版本 | 文档 | 引用/Manifest/条目 | TestRun门禁 | 未决阶段 |
|---|---|---:|---|---|
| V1 | PASS | PASS，48/8/9 | INCOMPLETE，17个历史TestRun导出缺失 | V1.1–V1.5 |
| V2 | PASS | PASS，156/25/41 | INCOMPLETE，9个ID中6个关联未解决 | V2.1–V2.5 |
| V3 | PASS | PASS，162/35/38 | NOT_RUN，尚无正式业务TestRun | V3.1–V3.4 |

这些门禁只验证文件引用与TestRun关联规则，不代替业务正确性、真实来源授权、交易日观察、Ubuntu运行或用户签署。机器计数见[JSON快照](./2026-10-02-w9-after-o1-readonly-followup.json)。

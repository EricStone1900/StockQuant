# W9 三版本门禁刷新：V2.5完整隔离代码套件后

2026-10-02在更新V2.5隔离代码与100k Parquet容量证据后，重新执行V1/V2/V3门禁。三版仍为`INCOMPLETE`；阶段文档和证据引用/Manifest审计全部PASS，无invalid PASS、缺失或意外验收行。

| 版本 | 文档 | 引用/Manifest/条目 | TestRun门禁 | 未决阶段 |
|---|---|---:|---|---|
| V1 | PASS | PASS，48/8/9 | INCOMPLETE，17个历史TestRun关联未解决 | V1.1–V1.5 |
| V2 | PASS | PASS，166/27/50 | INCOMPLETE，10个关联中6个未解决 | V2.1–V2.5 |
| V3 | PASS | PASS，168/37/42 | NOT_RUN，尚无正式业务TestRun | V3.1–V3.4 |

V2.5新增记录仅为合成输入的本机隔离代码/容量验证；没有来源授权、Paper观察、真实PIT、Ubuntu主机或人工签署增量。W9门禁本身只核对文档、引用/哈希与已登记TestRun导出一致性，不代替业务验收。详见[机器结果](./2026-10-02-w9-after-v25-capacity-suite.json)。

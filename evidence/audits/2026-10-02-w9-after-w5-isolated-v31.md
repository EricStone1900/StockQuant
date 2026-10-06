# W9 三版本门禁刷新：W5/V3.1隔离完整代码套件后

2026-10-02在记录V3.1隔离PostgreSQL完整code suite与RD-Agent LiteLLM内部Fixture后，重新执行V1/V2/V3门禁。三版仍为`INCOMPLETE`；阶段文档审计及本地证据引用/Manifest核验均PASS，无invalid PASS、缺失验收或意外验收行。

| 版本 | 文档 | 引用/Manifest/条目 | TestRun门禁 | 未决阶段 |
|---|---|---:|---|---|
| V1 | PASS | PASS，48/8/9 | INCOMPLETE，17个历史TestRun关联未解决 | V1.1–V1.5 |
| V2 | PASS | PASS，156/25/41 | INCOMPLETE，9个ID中6个关联未解决 | V2.1–V2.5 |
| V3 | PASS | PASS，168/37/42 | NOT_RUN，尚无正式业务TestRun | V3.1–V3.4 |

门禁结果只验证阶段文档结构、证据链接/哈希和TestRun关联规则。V3.1代码门禁退出0不改变V3.1业务实验或人工接受状态。历史TestRun原始导出、市场源授权、真实RD-Agent运行、Provider及账单、观察门禁、Ubuntu实机和用户签署均仍按各阶段记录待办。机器结果见[JSON快照](./2026-10-02-w9-after-w5-isolated-v31.json)。

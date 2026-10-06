# W9 三版正式门禁复核

时间：2026-10-03 08:56 Asia/Shanghai。当前W4/V2.3、V2.5复验材料及V2 Acceptance证据链接更新后，运行`pnpm baseline:check`与三个版本门禁。

## 结果

- `baseline:check`退出0：Markdown本地链接3,366/0失败；JSON 223、Schema 153、Fixture 39检查通过；架构层检查通过；基线测试26/26通过。
- V1、V2、V3正式门禁均返回`INCOMPLETE`/exit 2，表示仍有必需业务、部署、观察或人工验收项未完成。V1/V2/V3未决阶段分别为5/5、5/5、4/4；三版阶段文档审计及证据引用/Manifest审计均PASS，Acceptance缺失/意外ID为0/0，重复Stage/Acceptance行0，invalid PASS 0。
- 证据引用/Manifest/条目数：V1 90/12/51，V2 255/42/267，V3 270/55/145。V1另有3个历史TestRun缺结构化导出。

W4新增Fixture与容量工程证据没有改变NO_TRADE、无市场来源授权、真实数据/PIT、20日Paper观察或Ubuntu实机条件。本门禁只核验目录内证据映射和阶段文件完整性，不证明业务正确、来源许可、Paper运行、长期观察、Ubuntu实机或用户人工签署；版本状态保持未完成。

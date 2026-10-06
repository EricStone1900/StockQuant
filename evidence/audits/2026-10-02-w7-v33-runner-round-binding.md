# W7 V3.3 Runner Job 轮次身份绑定增量

执行日期：2026-10-02（Asia/Shanghai）

目标：让持久化 Runner Job 明确绑定预算分配使用的 Experiment 轮次，并确保拒绝路径、重试和存储保留该身份。

实现：Runner Job 合同增加可选 `roundIndex`（1–3）；HTTP 派发针对多轮 Experiment 要求显式轮次，并核验轮次属于该 Experiment。单轮旧请求缺省为 round 1 以保持兼容。非整数或越界在契约/绑定层拒绝。Job JSONB原样持久化该字段；重试复制原Job身份。

验证结果：

- `pnpm verify:stage -- --stage V3.3 --suite code`：退出0。完整baseline和合同检查通过（151 schemas、合同兼容与25生成器）；Research Automation lint、36文件201单测、4文件27 PostgreSQL集成通过；Platform typecheck、46文件162单测、4文件5 PostgreSQL集成通过；预算容量探针、Web typecheck、Playwright 3/3通过。
- 隔离实验派发HTTP smoke：rounds=3多轮Experiment未给roundIndex返回422，roundIndex=4返回422，roundIndex=2返回202并以roundIndex=2入队；TestRun `48328bd8-93d5-4eea-8a0b-2380f5cffde5`，Experiment `949e09ac-53ad-45f7-908f-9fce69497c4e`。执行NOT_STARTED，外部调用0，内存隔离服务。
- 专用 `research_automation_test` PostgreSQL集成通过27/27；增加断言验证 roundIndex JSONB往返。单测验证失败Job的重试保留roundIndex=2及幂等身份。
- V3.3 Runner Host恢复smoke首次因旧fixture未发送新必需字段而返回422；保留该失败。补roundIndex=1后重跑通过：TestRun `e66e474e-c0b6-440e-a8b4-3fa83818f57f`，Experiment `54999df9-14c8-42f8-bc3b-102e35be9877`，租约超时接管/fencing/Artifact哈希断言通过，外部Provider/Paper调用0。
- 普通沙箱下Provider egress代理单测受loopback bind EPERM阻断（5项）；在受控本机loopback环境重跑全套后201/201通过。此失败未计作PASS。

边界：V3.3整体代码suite是隔离Fixture和准备态验证，不是正式研究业务流程验收。既有Runner Host smoke的Experiment声明为双轮，但其单个固定Fixture Job绑定round 1并生成两份确定性计算输出；这不证明正式的逐轮派发、逐轮额度核算/结算或检查点续跑。正式工作流、真实RD-Agent/Provider与发票核对、Paper连续性、Ubuntu和人工签署均未完成。外部模型/行情/Paper请求数为0；阶段和版本Acceptance状态不变。

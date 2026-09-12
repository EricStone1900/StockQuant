# 功能、责任与测试追踪矩阵

版本2.0，2026-09-06。全新项目目标需求；不引用目录外材料。详见[PRD](./00-product-requirements.md)、[架构](./02-system-architecture.md)、[契约](./03-market-rules-and-contracts.md)、[实施计划](./04-development-plan.md)、[测试](./90-test-plan.md)和[验收](./99-acceptance.md)。

共124条编号需求、16个功能域；所有实现/验收均为NOT_RUN。每条业务行为、失败处理与最小验收写在PRD第6章，本表连接开发责任与测试。

## 1. 优先级与适用范围

本轮V1～V3按[三版共同规则](./05-three-version-delivery.md)交付；下表原124条仍为长期目标，原R1真实账户、R2实盘和未纳入R3增强不在本轮，不可因模拟子项通过而整行标完成。新增需求如下，全部NOT_RUN；原共124条计数不包含本表7条增量需求。

| 新需求ID | 行为及验收 | 责任域 | 本轮阶段 | 测试 | 状态 |
|---|---|---|---|---|---|
| DV-01 | 每阶段正式Web+验收中心；正常/异常可操作，关闭页面任务继续，独立断言与人工签署保存 | Web/平台/各领域 | V1.1起每阶段、V3.4回归 | VT01、T35/36 | NOT_RUN |
| DV-02 | Mac容器小数据真实组件，锁定依赖/架构，目标Ubuntu实际部署与数据恢复，不能用模拟架构替代最终证据 | 各服务/基础设施 | V1.1/1.2/1.5、V2.5、V3.4 | VT02、T09/37/38 | NOT_RUN |
| DV-03 | 全程FakeBroker，独立券商状态，固定与有seed故障可回放，订单因果/幂等及后端禁LIVE验证 | 执行/组合/测试平台 | V1.3/1.5、各版回归 | VT03、T02/27～31 | NOT_RUN |
| DV-04 | 用户分钟数据导入、明确Bar时间/量额/PIT、日频决策分钟执行、报告精度/假设、复用规则 | 数据/量化/执行/组合 | V1.4预留、V2.2/2.3/2.5 | VT04、T04/06/11 | NOT_RUN |
| DV-05 | 免费来源实测，≤100在线池，20～30分钟快照/日线/执行分离，新闻去重和来源追踪、连续Paper | 数据/监控/新闻/工作流 | V2.1/2.4/2.5 | VT05、T15～17/38 | NOT_RUN |
| DV-06 | 按run虚拟Clock、同刻事件顺序/屏障、检查点恢复无重复成交，分钟数据不逐Bar写工作流历史 | 量化/执行/组合/工作流 | V1预留、V2.3、V3.4 | VT06、T28/32 | NOT_RUN |
| DV-07 | 实际RD-Agent小实验/沙箱/预算，候选独立复算及人工晋升至模拟，固定代码复算与模型生成分开验收 | 自动研究/量化/平台 | V1.2探针、V3.1～3.4 | VT07、T12～14/20 | NOT_RUN |

具体开发任务与人工步骤见三个版本文件夹；新增需求的完整行为定义见共同规则第2～9节及对应阶段。原MON-02/T16在本轮按DV-05/VT05的20或30分钟采样配置测试，10分钟旧默认不作为本轮强制门禁。

DV-01追加验收细化：每阶段第7节交付待办及第8节可执行手册必须齐备，涵盖Web正常/拒绝/恢复、命令代码检查、同run只读断言与证据导出；开发者实测和用户人工签署分开。具体参数/退出码见共同规则第10节，复用VT01而不新增重复需求ID。

P0→R0基础，P1→R1真实数据/日常能力，P2→R2双市场自动实盘，P3→R3增强。核心自动交易必需P0/P1/P2；新闻、市场状态等按StrategyDeployment.requiredEvidencePolicy决定是否是某策略必需，数据/风控/账户/执行/对账不可设为可选。启用的可选功能仍需通过全部适用门禁。

## 2. 逐项追踪

| 需求ID | 功能 | 优先级/目标版 | 责任域 | 测试套件 | 实现/验收 |
|---|---|---|---|---|---|
| SYS-01 | 启动预检 | P0/R0 | 平台/各领域初始化 | T01,T03 | NOT_RUN |
| SYS-02 | 模拟初始化 | P0/R0 | 平台/各领域初始化 | T01 | NOT_RUN |
| SYS-03 | 模式隔离 | P0/R0 | 平台/各领域初始化 | T02,T48 | NOT_RUN |
| SYS-04 | 配置中心 | P0/R0 | 平台/各领域初始化 | T10,T22 | NOT_RUN |
| SYS-05 | 暂停与恢复 | P0/R0 | 平台/各领域初始化 | T31,T32 | NOT_RUN |
| SYS-06 | 导入导出 | P1/R1 | 平台/各领域初始化 | T37 | NOT_RUN |
| DAT-01 | 证券主数据 | P0/R0 | 市场数据 | T05 | NOT_RUN |
| DAT-02 | 双市场交易日历 | P0/R0 | 市场数据 | T05,T40,T42 | NOT_RUN |
| DAT-03 | 数据版本 | P0/R0 | 市场数据 | T04 | NOT_RUN |
| DAT-04 | 标准行情 | P0/R0 | 市场数据 | T07,T11 | NOT_RUN |
| DAT-05 | 质量报告 | P0/R0 | 市场数据 | T04,T07 | NOT_RUN |
| DAT-06 | 缺失与状态解释 | P0/R0 | 市场数据 | T07 | NOT_RUN |
| DAT-07 | 双市场真实数据导入 | P1/R1 | 市场数据 | T04,T44 | NOT_RUN |
| DAT-08 | 状态增强与对账 | P1/R1 | 市场数据 | T07,T50 | NOT_RUN |
| DAT-09 | 财务PIT | P1/R1 | 市场数据 | T06 | NOT_RUN |
| DAT-10 | 供应商与漂移 | P1/R1 | 市场数据 | T07,T50 | NOT_RUN |
| DAT-11 | 版本化查询 | P0/R0 | 市场数据 | T06,T09 | NOT_RUN |
| DAT-12 | 公司行动 | P1/R1 | 市场数据 | T47 | NOT_RUN |
| QNT-01 | 历史股票池 | P0/R0 | 量化研究 | T08 | NOT_RUN |
| QNT-02 | 价格因子 | P0/R0 | 量化研究 | T08 | NOT_RUN |
| QNT-03 | 价值/质量因子 | P1/R1 | 量化研究 | T08 | NOT_RUN |
| QNT-04 | 因子变换 | P0/R0 | 量化研究 | T08 | NOT_RUN |
| QNT-05 | Registry | P0/R0 | 量化研究 | T10,T14 | NOT_RUN |
| QNT-06 | 模型训练 | P1/R1 | 量化研究 | T12 | NOT_RUN |
| QNT-07 | 分析快照 | P0/R0 | 量化研究 | T09 | NOT_RUN |
| QNT-08 | 基础回测 | P0/R0 | 量化研究 | T11 | NOT_RUN |
| QNT-09 | 评价与比较 | P1/R1 | 量化研究 | T12 | NOT_RUN |
| QNT-10 | 任务与Artifact | P0/R0 | 量化研究 | T09 | NOT_RUN |
| STR-01 | 基准策略 | P0/R0 | 量化策略 | T10 | NOT_RUN |
| STR-02 | 扩展内置策略 | P1/R1 | 量化策略 | T10,T18 | NOT_RUN |
| STR-03 | 策略版本 | P0/R0 | 量化策略 | T10 | NOT_RUN |
| STR-04 | 策略快照 | P0/R0 | 量化策略 | T09,T10 | NOT_RUN |
| STR-05 | Plugin SDK | P3/R3 | 量化策略 | T13,T14 | NOT_RUN |
| STR-06 | 隔离与供应链 | P3/R3 | 量化策略 | T13 | NOT_RUN |
| STR-07 | 确定性合并 | P3/R3 | 量化策略 | T14 | NOT_RUN |
| STR-08 | 策略准入/暂停 | P1/R1 | 量化策略 | T10,T14 | NOT_RUN |
| RES-01 | 研究假设 | P3/R3 | 自动研究 | T13,T14 | NOT_RUN |
| RES-02 | Sandbox实验 | P3/R3 | 自动研究 | T13 | NOT_RUN |
| RES-03 | 可复现实验 | P3/R3 | 自动研究 | T12,T13 | NOT_RUN |
| RES-04 | 候选晋升 | P3/R3 | 自动研究 | T14 | NOT_RUN |
| NEW-01 | 多源采集 | P1/R1 | 新闻情报 | T15 | NOT_RUN |
| NEW-02 | 清洗与聚类 | P1/R1 | 新闻情报 | T15 | NOT_RUN |
| NEW-03 | 实体关联 | P1/R1 | 新闻情报 | T15 | NOT_RUN |
| NEW-04 | 事件分析 | P1/R1 | 新闻情报 | T15,T19 | NOT_RUN |
| NEW-05 | 重要事件与重处理 | P1/R1 | 新闻情报 | T15 | NOT_RUN |
| NEW-06 | 许可与不可信内容 | P1/R1 | 新闻情报 | T15 | NOT_RUN |
| MON-01 | 分层Watchlist | P1/R1 | 市场监控 | T16 | NOT_RUN |
| MON-02 | 市场分层监控 | P1/R1 | 市场监控 | T16 | NOT_RUN |
| MON-03 | 确定性异常 | P1/R1 | 市场监控 | T16 | NOT_RUN |
| MON-04 | 质量与容量 | P1/R1 | 市场监控 | T17,T38 | NOT_RUN |
| MON-05 | 升级与动作 | P1/R1 | 市场监控 | T16,T24 | NOT_RUN |
| MON-06 | 在线漂移与高频监控扩展 | P3/R3 | 市场监控 | T17 | NOT_RUN |
| REG-01 | 状态特征 | P1/R1 | 市场状态 | T18 | NOT_RUN |
| REG-02 | 状态识别 | P1/R1 | 市场状态 | T18 | NOT_RUN |
| REG-03 | 迟滞与转换 | P1/R1 | 市场状态 | T18 | NOT_RUN |
| REG-04 | 快照与回放 | P1/R1 | 市场状态 | T18 | NOT_RUN |
| REG-05 | 定义研究 | P3/R3 | 市场状态 | T12,T18 | NOT_RUN |
| AGT-01 | 通用Kernel | P3/R3 | Agent运行 | T19 | NOT_RUN |
| AGT-02 | 六种分析角色 | P3/R3 | Agent运行 | T19,T21 | NOT_RUN |
| AGT-03 | 模型网关 | P3/R3 | Agent运行 | T20 | NOT_RUN |
| AGT-04 | 当前上下文 | P3/R3 | Agent运行 | T19 | NOT_RUN |
| AGT-05 | 主建议输出 | P3/R3 | Agent运行 | T19,T21 | NOT_RUN |
| AGT-06 | 独立风险复核 | P3/R3 | Agent运行 | T21 | NOT_RUN |
| AGT-07 | Prompt与评测 | P3/R3 | Agent运行 | T19,T20 | NOT_RUN |
| AGT-08 | 审计与降级 | P3/R3 | Agent运行 | T19,T20 | NOT_RUN |
| POR-01 | 双市场账户初始化 | P0/R0 | 组合风险 | T01,T42,T43 | NOT_RUN |
| POR-02 | 不可变流水 | P0/R0 | 组合风险 | T28,T29 | NOT_RUN |
| POR-03 | 估值与收益 | P0/R0 | 组合风险 | T11,T29 | NOT_RUN |
| POR-04 | 暴露与风险分析 | P1/R1 | 组合风险 | T23 | NOT_RUN |
| POR-05 | 风险策略版本 | P0/R0 | 组合风险 | T23,T24 | NOT_RUN |
| POR-06 | 组合预交易风控 | P0/R0 | 组合风险 | T23 | NOT_RUN |
| POR-07 | 现金与证券占用 | P0/R0 | 组合风险 | T25,T43 | NOT_RUN |
| POR-08 | 成交后风险 | P0/R0 | 组合风险 | T28,T29 | NOT_RUN |
| POR-09 | 出入金/公司行动 | P1/R1 | 组合风险 | T29,T33 | NOT_RUN |
| GOV-01 | 触发门控 | P0/R0 | 决策治理 | T24,T32 | NOT_RUN |
| GOV-02 | 建议版本 | P0/R0 | 决策治理 | T21,T22 | NOT_RUN |
| GOV-03 | 人工操作 | P0/R0 | 决策治理 | T22,T48 | NOT_RUN |
| GOV-04 | 低频批次预算 | P0/R0 | 决策治理 | T24,T40 | NOT_RUN |
| GOV-05 | 执行授权 | P0/R0 | 决策治理 | T26,T49 | NOT_RUN |
| GOV-06 | 时效与失效传播 | P0/R0 | 决策治理 | T22,T26 | NOT_RUN |
| GOV-07 | 决策时间线 | P0/R0 | 决策治理 | T28,T33 | NOT_RUN |
| GOV-08 | 分析与执行分离 | P1/R1 | 决策治理 | T24,T36 | NOT_RUN |
| EXE-01 | 批次原子接受 | P0/R0 | 交易执行 | T27 | NOT_RUN |
| EXE-02 | 订单生命周期 | P0/R0 | 交易执行 | T27,T28 | NOT_RUN |
| EXE-03 | Paper撮合 | P0/R0 | 交易执行 | T30 | NOT_RUN |
| EXE-04 | 人工执行回填 | P1/R1 | 交易执行 | T29 | NOT_RUN |
| EXE-05 | 成交规范化 | P0/R0 | 交易执行 | T28 | NOT_RUN |
| EXE-06 | 对账与纠错 | P0/R0 | 交易执行 | T29 | NOT_RUN |
| EXE-07 | 执行暂停 | P0/R0 | 交易执行 | T31 | NOT_RUN |
| EXE-08 | Shadow比较 | P1/R1 | 交易执行 | T30 | NOT_RUN |
| EXE-09 | 双市场券商适配 | P2/R2 | 交易执行 | T39,T55 | NOT_RUN |
| EXE-10 | 自动实盘投产 | P2/R2 | 交易执行 | T39,T48,T51,T53,T54 | NOT_RUN |
| MEM-01 | 基础交易复盘 | P0/R0 | 量化Outcome/治理经验 | T33 | NOT_RUN |
| MEM-02 | 结果窗口 | P1/R1 | 量化Outcome/治理经验 | T33 | NOT_RUN |
| MEM-03 | Decision Memory | P3/R3 | 量化Outcome/治理经验 | T34 | NOT_RUN |
| MEM-04 | 学习Agent | P3/R3 | 量化Outcome/治理经验 | T34 | NOT_RUN |
| MEM-05 | 经验治理 | P3/R3 | 量化Outcome/治理经验 | T34 | NOT_RUN |
| MEM-06 | 纠错与遗忘 | P3/R3 | 量化Outcome/治理经验 | T34 | NOT_RUN |
| OPS-01 | 工作流调度 | P0/R0 | 工作流/平台/各领域 | T32,T40,T53 | NOT_RUN |
| OPS-02 | 异步任务隔离 | P1/R1 | 工作流/平台/各领域 | T32,T53 | NOT_RUN |
| OPS-03 | Outbox/Inbox | P0/R0 | 工作流/平台/各领域 | T32 | NOT_RUN |
| OPS-04 | 告警中心 | P0/R0 | 工作流/平台/各领域 | T36 | NOT_RUN |
| OPS-05 | 可观测性 | P0/R0 | 工作流/平台/各领域 | T36 | NOT_RUN |
| OPS-06 | 备份恢复 | P0/R0 | 工作流/平台/各领域 | T37 | NOT_RUN |
| OPS-07 | 审计与导出 | P0/R0 | 工作流/平台/各领域 | T03,T37 | NOT_RUN |
| OPS-08 | 发布与资源 | P1/R1 | 工作流/平台/各领域 | T37,T38,T53 | NOT_RUN |
| XMK-01 | 市场身份 | P0/R0 | 数据/组合/执行协作 | T41 | NOT_RUN |
| XMK-02 | 时区与交易会话 | P0/R0 | 数据/组合/执行协作 | T40 | NOT_RUN |
| XMK-03 | 结算与购买力 | P0/R0 | 数据/组合/执行协作 | T42,T43 | NOT_RUN |
| XMK-04 | 分币种账本 | P0/R0 | 数据/组合/执行协作 | T43 | NOT_RUN |
| XMK-05 | 汇率与归因 | P1/R1 | 数据/组合/执行协作 | T45 | NOT_RUN |
| XMK-06 | 跨市场计划 | P0/R0 | 数据/组合/执行协作 | T46 | NOT_RUN |
| XMK-07 | 公司行动与税费 | P1/R1 | 数据/组合/执行协作 | T47 | NOT_RUN |
| XMK-08 | 通道能力与准入 | P2/R2 | 数据/组合/执行协作 | T39,T55 | NOT_RUN |
| AUT-01 | 自动授权配置 | P0/R0 | 治理/执行/工作流 | T49 | NOT_RUN |
| AUT-02 | 无逐笔审批 | P0/R0 | 治理/执行/工作流 | T48 | NOT_RUN |
| AUT-03 | 每次执行授权 | P0/R0 | 治理/执行/工作流 | T26,T49 | NOT_RUN |
| AUT-04 | 发送前最后校验 | P2/R2 | 治理/执行/工作流 | T50,T52 | NOT_RUN |
| AUT-05 | 常开健康与熔断 | P2/R2 | 治理/执行/工作流 | T53 | NOT_RUN |
| AUT-06 | 多实例防双发 | P2/R2 | 治理/执行/工作流 | T51 | NOT_RUN |
| AUT-07 | 自动日终作业 | P2/R2 | 治理/执行/工作流 | T54 | NOT_RUN |
| AUT-08 | 分市场启停与应急 | P2/R2 | 治理/执行/工作流 | T31,T52,T54 | NOT_RUN |
| AUT-09 | 策略持续资格 | P2/R2 | 治理/执行/工作流 | T49,T54 | NOT_RUN |
| AUT-10 | 独立自动交易验收 | P2/R2 | 治理/执行/工作流 | T39,T48,T55 | NOT_RUN |

## 3. 跨功能门禁

| 需求章节 | 联合测试 |
|---|---|
| PRD第3章：自动与人工/决策模式 | T02、T22、T48～T49 |
| PRD第7章：完整页面、状态、时间与原币展示 | T35～T36、T40、T43、T48 |
| PRD第8章：正确性、范围、执行不变量 | T23～T31、T40～T55 |
| 架构：单一写入口、持久化、恢复、Bridge | T27～T32、T37、T51～T55 |
| 双市场契约：PIT、币种、结算、公司行动 | T04～T12、T40～T47 |
| PRD第9章：性能、通知与常开部署 | T38、T53～T54 |

## 4. 交付包映射

| 交付包 | 功能族 | 产物门禁 |
|---|---|---|
| D0/D1 | SYS、DAT/XMK基础、OPS、契约 | 双市场模型与独立骨架 |
| D2 | DAT、QNT、STR、XMK | 量化/回测/数据快照 |
| D3 | POR、GOV、EXE、AUT基础、MEM-01 | 自动授权Paper与对账 |
| D4 | OPS、Web、SYS、XMK | R0真实进程双市场闭环 |
| D5 | DAT/POR/EXE/XMK的真实Adapter、P1适用情报 | R1真实时间模拟与Shadow |
| D6 | AUT、EXE/XMK真实通道、全部核心P0/P1 | R2双市场自动实盘 |
| D7 | AGT、RES、MEM/STR增强 | R3按需验收 |

每个编号是目标需求，不以任务存在、代码存在或测试套件部分通过作为完成。修改需求时同步PRD、契约、测试及验收；不保留不可执行的外部项目依赖。
# 共享数据采集扩展追踪（2026-09-12，计划）

新增需求DC-R01～DC-R08、工作包DC-00～DC-08（08细分A/B）和测试DC-T01～DC-T25见[共享数据采集计划](./v2-data-and-replay/06-shared-data-collection-plan.md)。DC-T25验证DC-R02/03/05/06/08的短期真实运行交付。用例输入/步骤/预期见[测试手册](./v2-data-and-replay/07-data-collection-tests.md)，实际状态见[进度记录](./v2-data-and-replay/08-data-collection-progress.md)。本扩展尚未实现，不改变上述历史需求或验收结论。

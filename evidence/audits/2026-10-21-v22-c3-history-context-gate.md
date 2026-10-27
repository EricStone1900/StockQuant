# V2.2 / C3 历史上下文目录与回放门禁增量

日期：2026-10-21。结论：**历史上下文解析目录与回放前硬阻断已自动验证；不代表真实历史数据已获授权，也不代表V2.2通过。**

Market Data持久化不可变历史上下文版本，类型包括`SECURITY_UNIVERSE`、`MARKET_RULE_SET`和`CORPORATE_ACTIONS`。目录为规范化JSON计算SHA-256，拒绝版本改写；回放预检重新解析被引用版本，核验内容Hash、整体日期范围、逐证券历史有效区间、市场、交易时段与公司行动清单。Platform以当前用户身份登记上下文并记录attestation；这只记录操作者声明，不证明官方事实或许可。

新增导入版本回放预检会检查导入发布状态、数据行数、历史引用解析和`researchUseAllowed`。Market Data还按精确来源ID单独检查`HISTORICAL_RESEARCH`授权配置；默认关闭。Platform在创建TestRun和Worker之前先行预检，受限验证只允许`600000.SH`且最多120根Bar。允许用途条件未满足时返回422 `HISTORICAL_CONTEXT_BLOCKED`，不创建Run、不启动Worker。现有V2.3固定Fixture回放入口不变。

验证证据：Market Data 29个测试文件/139项测试及build通过；Platform API build、Web typecheck、`pnpm contracts:check`通过。隔离PostgreSQL集成测试注册三类上下文、发布合成导入并验证就绪，之后尝试改写上下文版本会冲突。真实Chromium→Vite→Platform→Market Data→隔离PostgreSQL smoke完成上下文登记，断言服务端Hash和attestation；对未登记必要上下文/未确认研究用途的数据发起回放，收到422且未启动Worker。Smoke TestRun：`dfb91678-2ca2-48ba-8b41-48bd84c755de`、`834dc16b-261f-46ef-aad6-9ae9dd4c8af9`、`3f9dcac1-0672-4ee2-bcbd-bbad2890e297`、`e45d8d72-c0ea-46d0-a218-ee58d8036b8e`；其Manifest SHA分别为`37deba5ae5b68d28c7da90c06666a394c7522660d4655dcb90d00ed099988f32`、`a0d7a1ed6de98a197cda43cea1dc46161e8a2c5faaad451f209373e91ba06373`、`9fb51ac5238cf256c9724fc7c0e4a2120bc37c65c2ad3fba34c879d397c47a57`、`e068aee7a74bceebf5fea5ec2f4f5c71583300fa917b80e2f4bfd3d56ed6fdb3`。登记测试版本`v22-smoke-universe-e2eff87d728146cc843cc3fb13f0c8e1`，Hash `845b468c3e0d2a9f58eeb36624a7d29fd7fc91b2966ce58a70d6d210a68a3bc8`，attestation `acceptance-owner-1`。缺失引用与`RESEARCH_USE_NOT_CONFIRMED`都出现在阻断原因中。模式为FAKE，零真实来源请求，隔离数据库/进程已清理。

完整V2.2阶段套件基线、Fixture输入、各阶段TestRun及历史未完成项见[C3基线审计](./2026-10-21-v22-c3-closeout.md)。候选文件SHA清单见[candidate-files.sha256](./2026-10-21-v22-c3-history-context-gate/candidate-files.sha256)，只代表列出的C3相关文件。

限制：没有配置可用于`HISTORICAL_RESEARCH`的已决定来源，因此本轮不能验证授权允许时的正向回放，也没有基于实际来源证据登记真实股票池、公司行动和市场规则。用户登记的版本需要人工核对其内容真实性；授权配置不能因项目为本地学习而自动放开。V2.2新范围人工验收和操作手册实测仍未完成。

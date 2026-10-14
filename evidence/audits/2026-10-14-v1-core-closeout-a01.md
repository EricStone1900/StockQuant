# V1主要功能收尾与当前候选复验（2026-10-14）

## 当前候选指纹

当前代码/配置/Fixture候选SHA-256：`132535fbdf2bf1d50e4260e397424b3a47ef949dedcc62e58257c0a5697bd2d4`。指纹按排序后的相对路径、NUL、文件字节、NUL计算，覆盖`apps/`、`services/`、`packages/`、`infra/`、`fixtures/`、`scripts/`、`tests/`及根依赖/运行配置文件`.dockerignore`、`.editorconfig`、`.node-version`、`.env.example`、`AGENTS.md`、`package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`、`tsconfig.base.json`；排除构建输出、依赖缓存、文档、证据、Git元数据及`.env.local`。共1287个文件、9,703,190字节。文档和证据改动不改变该候选指纹。

用户于2026-10-13确认通过的历史候选指纹为`e45e9232f323539181fd4fc4e00f9c165a08ec9ec32426b9e6884c4d2d8b58b4`。用户于2026-10-14在本对话明确确认当前候选整版V1验收通过，签署绑定本记录首段列明的SHA-256 `132535fbdf2bf1d50e4260e397424b3a47ef949dedcc62e58257c0a5697bd2d4`。此为整版人工验收记录；系统导出的单个TestRun人工结论仍保持`NOT_RUN`，不因整版确认而改写。

## 本轮修正与验证

| 阶段 | 修正/验证 | 当前证据 |
|---|---|---|
| V1.3 | TestRun证据Envelope中嵌套Run状态和顶层断言共同解析；增加显式Web核验操作，只有在真实批准Proposal、FakeBroker/Portfolio账本、数量金额及MATCH对账满足后才保存当前Run为COMPLETED/两项PASS。GET保持只读。 | `pnpm test:e2e -- --stage V1.3`退出0，40/40；正常成交Run `973b73fc-0aef-4c60-abef-15c982322c46`为COMPLETED、2项PASS、`MANUAL_FILL_VERIFIED`，Manifest SHA-256 `90c9b5e31a3cd7f606625954e000bcea8cfaddc55e1c9453221a1a4dbfc56322`。定向Vitest 31/31；Web和Platform API typecheck通过。详见[V1.3阶段§8.118](../../docs/prd/v1-local-simulation/03-fake-broker-trading-loop.md#8118-v13正常手工成交写入可核对的stagerun结论2026-10-14)。 |
| V1.5 | AUTO、暂停授权拒绝、恢复工作流完成后写入COMPLETED；NO_TRADE观察Run仍WAITING。CLI同Run按Run真实状态返回对应退出码；四个Bundle保留在`evidence/local/V1.5/`。 | 保留导出选项下`pnpm test:e2e -- --stage V1.5`退出0，浏览器4/4；normal 120次Fixture观察，AUTO 4笔Fill，rejection/recovery通过。四个TestRun及Manifest在[V1.5阶段§8.60](../../docs/prd/v1-local-simulation/05-scheduling-and-recovery.md#860-v15完成态与当前testrun-bundle复验2026-10-14)列出。容器、卷、网络精确清理通过；真实来源/券商调用为0。 |
| 文档与追踪 | `pnpm docs:check`通过：13,949个Markdown链接/0失败，5个阶段编号/0重复。`pnpm crosswalk:check`通过：147/147需求、326个精确测试名、0丢失路径/过期锚点。 | 正式门禁证据审计通过：2,691引用、465份Manifest、603项。 |

V1.3首次E2E发现自动在只读路径完成Run会破坏后续Session推进，已撤销该行为并改为显式业务核验；随后发现E2E在刷新后仍按WAITING断言及V1.5 CLI辅助断言固定退出码2，均已同步到实际Run生命周期并重跑完整受影响套件。失败尝试留存为诊断记录，不计PASS。

## 本轮收口前门禁结论（历史）

`pnpm verify:version -- --version V1`退出2，版本状态仍`INCOMPLETE`。阶段文档审计PASS，证据关联审计PASS（2,670引用、464份Manifest、601项），Crosswalk PASS。六个历史Run的旧结构化导出仍按决定记为MISSING，没有摘要重建；它们已从当前候选Run关联中移出，当前门禁关联的Run均有Bundle。五阶段状态和版本核对清单尚未全部满足。用户已对该指纹完成整版人工确认，但这不豁免正式技术门禁。详细机读结果见[正式门禁日志](./2026-10-14-v1-core-closeout-gate-a01.log)、[exit code](./2026-10-14-v1-core-closeout-gate-a01.log.exit.txt)和[SHA-256](./2026-10-14-v1-core-closeout-gate-a01.log.sha256)。

Ubuntu实机按延期决定不阻塞本轮。真实Qlib Artifact同点跨卷恢复仍为已知限制；V1.5验证了真实业务PostgreSQL/NATS/Temporal/FakeBroker/Portfolio数据以及合成Artifact卷探针。


## 当前范围交付与版本清单有限收口（2026-10-14）

本次只同步文档与验收关联，未改业务代码、Fixture、Verifier或历史证据Bundle。重新计算候选指纹仍为本记录首段的1287文件、9,703,190字节及SHA-256，符合用户已确认的精确候选。此前阶段表把延期要求和历史NOT_RUN混入当前必交状态；本次按已有范围决定和真实证据核对，不将广泛原始要求整体宣称通过。

| 核对项 | 已有实测证据与本次结论 |
|---|---|
| 五阶段§7交付与§8可执行手册 | 五阶段启动/停止、Web/API/CLI、Fixture Hash/参数、超时及恢复步骤已有隔离执行记录；V1.1 §8.68–8.69、V1.2 §8.62–8.63/8.70、V1.3 §8.118、V1.4 §8.113–8.117、V1.5 §8.55–8.60。当前§7按本轮范围核实，§2广泛父项仍未勾选，延期部分没有PASS。 |
| 正常/拒绝/恢复及代码检查 | [五阶段主要路径汇总](./2026-10-13-v1-current-core-e2e-a01.md)与本记录前文受影响套件结果；V1.3显式核验和V1.5完成态改动已重跑其完整E2E，未受影响阶段和代码证据复用。 |
| 真实业务API与后台存活 | 同一汇总中的容器Web→领域API、刷新/重启原Run恢复和真实NATS/Temporal；V1.5 §8.43/§8.58覆盖进程崩溃与实际AUTO业务配对恢复。 |
| 独立账本/PIT/owner/模拟安全 | V1.3 §8.80–8.81/8.87/8.91/8.105–8.118，V1.4 §8.104/8.108/8.113–8.116和V1.1 §8.67–8.74；独立FakeBroker/Portfolio MATCH、严格现金、固定PIT、LIVE/REAL拒绝与无副作用均复用原测试。 |
| 数据/组件/架构与限制 | 明确真实Qlib/PostgreSQL/NATS/Temporal与FIXTURE/FAKE/合成成本；Qlib为锁定linux/amd64仿真Worker，不能称Ubuntu实机。V1.1 §8.36全隔离amd64仿真与本地ARM64容器证据保留；资源/小样本边界见原手册与运行报告，不声称容量/收益能力。 |
| 备份恢复/交付材料 | [实际AUTO业务本地恢复](./2026-10-13-v15-paired-backup-restore-sq-v15-e2e-e946ae2d2ce051439c03.json)保留原Run、4订单/4 Fill及双市场MATCH；Artifact卷只用合成探针。真实Qlib Artifact跨卷恢复、Ubuntu及异地灾备继续未验收。 |
| 当前候选人工签署与证据 | 用户2026-10-14整版确认覆盖当前主要功能范围，阶段签署关联代表Run；不声称用户逐个重新操作历史UUID，也不倒填单Run人工结论。[完成态代表Run严格核验](./2026-10-14-v1-closeout-selected-runs.json)：5阶段14个Run，完成态/全PASS断言/逐项Manifest均通过。 |

本次选择完成态代表Run是为了与阶段完成证据契约相符，不把整个场景矩阵缩成14个Run。正常/拒绝/恢复/取消/故障场景的实际覆盖仍由原完整E2E报告证明。V1.3的恢复与拒绝业务探针没有完成态Bundle，不伪造；V1.5正常NO_TRADE观察Run继续WAITING，取消Run继续CANCELLED。完整旧验收行、未勾选版本清单和旧签署已保存于[同步前完整文档快照](./2026-10-14-v1-closeout-before-status-sync.json)及其[Hash](./2026-10-14-v1-closeout-before-status-sync.json.sha256)，原失败/历史六个MISSING均保留。

同步后第一次门禁[a02](./2026-10-14-v1-core-closeout-gate-a02.log)退出1：阶段文档、签署、14个Run与清单核验通过；唯一失败为本次编辑追踪表Hash sidecar时漏写文件路径，属于清单格式错误。已按既有Verifier格式修正为SHA-256加仓库相对路径，不修改Verifier；失败日志作为诊断保留。最终结果见[a03](./2026-10-14-v1-core-closeout-gate-a03.log)、[退出码](./2026-10-14-v1-core-closeout-gate-a03.log.exit.txt)及[Hash](./2026-10-14-v1-core-closeout-gate-a03.log.sha256)。


## 最终结论（2026-10-14）

正式命令`pnpm verify:version -- --version V1`最终PASS/exit 0：五阶段均为当前范围PASS，未关闭阶段/验收及无效PASS声明为0，版本十项清单已核实，五阶段文档审计PASS，14个完成态代表Run严格审计PASS，证据引用/Manifest审计PASS。当前批准范围的V1开发与正式验收完成。原始自动检查及用户确认分别记录，没有新增业务功能或接入真实来源/券商；延期项目没有标成通过。此前a01为人工确认后未收口的历史exit 2，a02为Hash清单格式错误的诊断exit 1，均保留；a03是最新正式结果。

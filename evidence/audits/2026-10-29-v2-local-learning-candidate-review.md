# V2本地学习版候选准备与核对

日期：2026-10-29。范围：`V2_LOCAL_LEARNING_V1`。当前状态：`IN_PROGRESS`，候选尚未冻结、未取得整版人工签收。

## 已有范围与必要检查

- C1/C2、C3、C4、C5和C6在各自已批准本地范围内已有人工作结和对应证据；引用与限制以[范围决定](../../docs/decisions/2026-10-29-v2-local-learning-version-scope.md)和原阶段表为准。
- 文档、契约、Fixture检查退出0；Market Data、Platform、Governance、Portfolio、Trade、Web共6包typecheck退出0；`node --test scripts/evidence-export.test.mjs scripts/verify-stage.test.mjs scripts/verify-version.test.mjs` 25/25通过；C6源码清单逐项Hash核对通过。V2.3/C4及V2.4/C5最新隔离同Run复验证据见[C7审计](./2026-10-29-v2-c7-closeout-baseline.md)。这些结果按各自范围使用，不能推出原V2完整版通过。
- [使用与备份恢复入口](../../docs/prd/v2-data-and-replay/06-local-learning-handoff.md)复用现有已实测阶段手册及隔离备份恢复记录；实际用户数据、V2全服务同点及异地恢复没有新演练。

## 候选和待完成项

基础提交为`1b691f5607a11c41cbcf377f52b9e5586c3957b9`。共享工作区包含跨服务改动、未跟踪源码及大量历史截图/Trace；不删除任何已有文件。按所有者的既有选择，准备代码、文档、Fixture和必要小型证据，不选择大量截图、Trace或本地数据；候选清单和指纹以本记录同目录的候选Manifest为准。`AGENTS.md`与自动刷新的`evidence/dc08a/health-report.json`是已有工作区修改，暂不归入本次候选，保留原样。

`evidence/local/`按Git忽略规则保存在本机；现有版本验收表及结构化TestRun检查引用其中的文件。相关记录未必随普通Git检出可重读；本轮必须核对精确所需证据、许可/分享边界和可移植性。部分历史文档还引用被忽略的`.log`。未完成便携性核对前不声称干净检出通过、候选冻结或版本PASS。

原完整V2 `verify:version`仍`INCOMPLETE`，V2.3/2.4/2.5原门禁与真实研究、20日观察、全市场分钟容量、长期稳定性等未完成或延期。范围决定不自动替代精确候选人工验收；不能推定用户已签收尚未形成的候选。

## 干净检出可移植性核对

将当前HEAD以`git archive`导出到一次性临时目录，仅覆盖候选清单所列文件，在该目录执行文档检查和原V2版本验证（未使用本机`evidence/local/`）：`node scripts/check-markdown-links.mjs`退出1，检查10,500个有效链接、缺失3,136个目标；`node scripts/verify-version.mjs --version V2`退出1，`evidenceAudit=FAIL`、`testRunEvidenceAudit=INCOMPLETE`，10个所引用Run缺少本地结构化关联，证据审计有62项失败。缺失包含长期历史文档引用的被忽略日志、历史未跟踪截图与本地证据；结果不能与本机工作区链接检查PASS混淆。临时目录已删除。

为便于携带已验收的C1/C2当前Fixture证据，已原样复制四份`dataMode=FIXTURE`结构化导出及其原Manifest至[小型证据目录](./2026-10-29-v2-local-c1c2-exports/aaf9d591-3a40-44a5-9a0f-5f6cf3000a64/evidence.json)；每份原始SHA-256核对通过。rejection导出不含`externalRequests`字段，不据此宣称该字段为0。同一目录不改变原Run或人工签收；原V2验证脚本仍读取原路径，因此这一步本身没有修复干净检出门禁。

C3候选Run标记`RECORDED`，包含历史分钟数据样本；依照C3既定本地用途及分享边界，未把该原始导出复制到候选。其[本地范围签收和证据Hash](./2026-10-24-v22-c3-local-learning-closeout.json)保留用于复核，但不能替代原始证据可读取性。C4合成证据、C5/C6小型导出包分别保留于各自审计目录。后续应明确哪些历史引用应由本地证据包恢复、哪些只作为历史外部证据，并在不扩大数据分享的前提下验证精确候选。现有证据足以报告局部本地验收，但尚不能报告干净检出可复验或形成已通过的整版候选。

对比干净HEAD本身，历史基线已有3,133处链接缺失。初版候选新增的4处引用已逐项处理：V2.3当前Fixture和C5已签收Fixture原样导出复制到小型审计目录，保持原始Manifest与SHA，文档改指向相同字节的可携带副本；C1/C2证据链接指向具体文件。历史缺失没有因此视作已修复。候选文件逐项路径与SHA见[候选Manifest](./2026-10-29-v2-local-learning-candidate-manifest.json)，Manifest为提案，非冻结签名。

复核修正后，以相同HEAD和提案文件再做一次干净检出：基线与候选均有3,133处历史链接缺失，候选新增缺失0；本机工作区文档检查仍通过。文件缺失在现有HEAD即已存在，不能表述为候选在干净环境通过文档检查。候选暂列322个文件约7.1 MB（另附Manifest自身），不含大截图/Trace、本地历史数据和被忽略日志；对所列文件进行私钥、常见API key、GitHub token及JWT Bearer高置信特征扫描无命中，这不替代完整隐私与许可审查。

因此当前可复核的是本地范围、各项验证和拟提交文件清单；历史证据的远端可重读性仍未解决。除非明确决定如何提供这些本地证据，不能将远端检出视为完整验收归档。未对未解决事项或整版候选预填PASS。

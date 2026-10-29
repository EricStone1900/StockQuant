# V2本地学习版最小证据复核

日期：2026-10-29；范围：`V2_LOCAL_LEARNING_V1`；开发里程碑提交：`ed5d9964fbe3e4b93ec44385a68f09e62b955300`。本次验证证据可读取、原始Manifest哈希及已记录的局部签收，不代替当前整版候选的人工验收。

| 工作包 | 证据及结果 | 签收与限制 |
|---|---|---|
| C1/C2 | 四个V2.1 Fixture Run；7、3、2、7项断言均PASS，原始Manifest核对通过 | [2026-10-21局部签收](./2026-10-21-v21-c2-closeout/human-acceptance.json)绑定这四个Run；公开来源能力只按原有受限实测报告 |
| C3 | 本机Run `75300ba9-0807-48f5-80dc-a6cadce18b2c`：5/5断言、原始Manifest核对通过 | [2026-10-23软件签收](./2026-10-23-v22-c3-current-candidate-human-acceptance.json)及[2026-10-24范围决定记录](./2026-10-24-v22-c3-local-learning-closeout.json)；完整导出保留本地、历史事实UNKNOWN |
| C4 | 当前合成Fixture Run `3e0536e2-b156-41ad-b6ed-3ca7482ab7f6`：1/1断言及Artifact字节/Manifest核对通过 | [2026-10-24人工签收](./2026-10-24-v23-c4-fixture-human-acceptance.json)绑定当时Fixture训练/复算证据；新Run为后续自动复验，不冒充新签收。`modelValidation=NOT_RUN` |
| C5 | 已签收Run `06e40938-b6aa-4116-adb6-ab6d8a0eba2c`：6/6断言、原始Manifest核对通过 | [C5局部签收](./2026-10-29-c5-local-p6-candidate-review.md)；20日观察继续延期 |
| C6 | 后续自动复核Run `39a256a1-0e6f-41d4-a852-1f7f4f649099`：2/2断言、原始Manifest核对通过 | [C6局部签收与单源限制](./2026-10-29-v25-minute-upload-queue.md)；该新Run是自动复验，不构成新的用户签署 |

## 独立核验

在仓库根目录执行：

```bash
shasum -a 256 -c evidence/audits/2026-10-29-v2-local-minimum-portable.sha256
shasum -a 256 -c evidence/audits/2026-10-29-v2-local-minimum-local.sha256
```

第一项覆盖24个可随Git保存的合成Fixture导出、签收与范围记录；第二项覆盖2个C3本地文件，须在保有`evidence/local/`的原机运行。两项在本机均退出0。8个Run的场景ID、断言数、路径与SHA见[结构化索引](./2026-10-29-v2-local-minimum-evidence.json)。校验文件完整性不等同重新执行业务场景，现有用户签收仅覆盖各自原范围。

此前[候选准备记录](./2026-10-29-v2-local-learning-candidate-review.md)把C3 `RECORDED`导出概括为包含“历史分钟数据样本”，措辞不准确：[C3候选签收记录](./2026-10-23-v22-c3-current-candidate-human-acceptance.json)明确该候选使用本地生成的合成CSV。`RECORDED`标识本身不能证明是真实市场数据。本次保守地继续将完整导出留在本地；不扩大其分享或研究用途。

原V2完整版仍`INCOMPLETE`；历史证据链接在干净检出中仍有缺失。当前整版候选的人工签收保持`NOT_RUN`，不得用上述局部签收自动推定。C4与C6的后续新Run也没有新增人工签收。

2026-10-29便携性附加验证：从开发里程碑提交`ed5d9964`生成全新临时检出，加入本次可携带SHA清单，执行第一条命令退出0，24/24文件通过；C3完整导出按预期不在该检出。本机执行第二条命令时C3两个文件均通过。逐文件核对里程碑提交中的322个候选文件与原提案Manifest，322/322 SHA-256匹配。此验证只覆盖上表最小证据集合，完整历史文档的3,133处缺失仍保留为远端限制。

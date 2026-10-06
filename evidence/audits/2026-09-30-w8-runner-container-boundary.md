# W8 Runner、Web与研究容器边界复验

日期：2026-09-30。范围：核验W8 AMD64隔离镜像中的Web/Research Automation容器没有Docker socket或非空凭据环境变量，并使用当前完整依赖Runner镜像执行固定离线隔离场景。

## 发现与修复

第一次`pnpm v31:runner-smoke`使用烟测脚本默认指向旧镜像`stockquant-v31-runner:rd-agent-v0.8.0-qlib-3e72593`，因缺少LiteLLM失败。将默认引用纠正到有348项哈希锁且此前审计的`...-full-deps`版本后，发现本机该tag的Runner源文件旧于工作树，隔离子进程缺少`LITELLM_LOCAL_MODEL_COST_MAP=True`，导致LiteLLM尝试远程读取价格表；`--network none`阻断该请求，Smoke返回FAILED。两个失败均保留在当前执行记录中，没有将其记作PASS。

核查当前锁定`runner.py`已正确向隔离子进程设置该离线变量。按当前工作树重建精确`linux/amd64`镜像，ID为`sha256:eb9030b8107c79c3554dabc68322814b81c04564bb0a1e5a9841bd603a67ccf1`；烟测脚本的默认镜像标签及digest现与重建镜像一致，失败诊断会保留固定用例输出和stderr。

## 复验

- `STOCKQUANT_RUNNER_IMAGE_REF=stockquant-v31-runner:rd-agent-v0.8.0-qlib-3e72593-full-deps STOCKQUANT_RUNNER_IMAGE_ID=sha256:eb9030b8107c79c3554dabc68322814b81c04564bb0a1e5a9841bd603a67ccf1 pnpm v31:runner-smoke`：PASS，6/6场景。包括依赖导入/离线设置/无Docker Socket/密钥剥离、normal输出、超时、路径拒绝、128MiB OOM、只读根/只读输入/隔离输出，以及宿主超时清理。
- `STOCKQUANT_W8_IMAGE_PREFIX=stockquant-w8-20260930-refresh- pnpm verify:w8:container-boundary`：PASS，10/10固定AMD64应用镜像。Web与Research Automation实际容器均报告`dockerSocketAbsent=true`、`nonemptySecretEnvironmentAbsent=true`；其他容器报告非root/只读根/无网络约束；Market Data持久卷写入单独验证。
- `STOCKQUANT_RESEARCH_IMAGE_ID=sha256:fd25ae7b39afe2a89ed89c7618da73e93724f70af5db34e533c82aacbe84a73f pnpm verify:stage -- --stage V3.1 --suite code`：exit 0。固定Research Automation镜像上的Fixture/LiteLLM内部烟测、Research 31文件169项单测/4文件20项集成、Platform 27文件96项单测、Artifact owner-scope HTTP smoke、Web typecheck及契约检查均通过；烟测的Provider外呼数为0，TestRun标注为合成Fixture。

所有容器均为本地固定镜像，网络隔离；没有行情、Provider或真实业务调用。目标为Mac M1上的linux/amd64仿真，不是Ubuntu实机验收。该结果不覆盖OD-004 Bearer密钥轮换/监控、Runner常驻控制器、真实RD-Agent/费用、活动集群备份恢复或W8最终门禁。

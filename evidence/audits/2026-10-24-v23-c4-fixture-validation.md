# C4 / V2.3 Fixture限定研究验收记录

日期：2026-10-24。范围：项目所有者批准的本地 Fixture 学习范围。数据仅为 `v2.3-qlib-fit-input-1` 合成输入；用途标记 `SIMULATION_ONLY`。没有调用行情/新闻Provider，没有使用C3 BaoStock归档训练，没有启用候选策略或FakeBroker订单。

## 决定与范围

所有者选择C4范围A：在版本化合成Fixture上验证锁版Qlib训练/预测、Artifact追溯、独立复算和限制报告。真实市场研究、PIT、收益有效性、RD-Agent、候选策略执行、真实券商及Ubuntu实机均不在本次范围，继续为`NOT_RUN`或未启用。该范围决定仅针对V2.3本地学习，不替代阶段人工验收。

## 自动验收

命令：`pnpm --filter @stockquant/quant-research-service qlib:fit-smoke`。退出码：0。Docker临时镜像：`sha256:ee3bb0163013948a5360513391f9468c63f2a4d55494f09f68b385d6b53994f0`，`linux/amd64`，在Apple Silicon宿主仿真；容器`--network none`，2 GiB内存、1 CPU、只读根文件系统、临时/tmp。镜像在结束时删除。

| 断言 | 结果 |
|---|---|
| 冻结Fixture文件Hash | PASS — `1f99de3fb13b2cd0359a36bc2f202d2ed8359ea93d6b269a8845bc7b7e58c22e` |
| Qlib / LightGBM | PASS — 0.9.6 / 4.7.0；实际执行`LGBModel.fit/predict` |
| 时间切分与因果元数据 | PASS — 72/24/24；24个测试预测均有限 |
| 重复训练确定性 | PASS — 重复运行模型与预测Hash相同 |
| Artifact完整性 | PASS — 模型Artifact SHA-256 `08d29ca3ccefc37e887928d5a4512a9f63d53edef6cc91b4289e1731ec675695` |
| 独立复算 | PASS — 新建`lightgbm.Booster`直接加载序列化Artifact，独立计算冻结测试特征的24项预测；与Worker预测逐项比较`rtol=0, atol=1e-12`且规范JSON SHA-256相同（`09d1563ed1102a87f6e71672e9b1238ce844094aa336cb33efeea6ac995bdbe3`） |
| 错误重叠切分拒绝 | PASS — HTTP 422 |
| 候选执行/收益声明 | 未执行 / 不作声明 |

本次独立复算证明已保存模型在锁定LightGBM版本上的推理可复现；不是独立算法实现、统计有效性/过拟合检查、市场样本外验证或盈利证明。Qlib返回字段`modelValidation`仍为`NOT_RUN`，不得据本记录将其改为PASS。

## Artifact追溯依据与状态

既有隔离Web→Platform→Quant→Qlib/PostgreSQL TestRun已经验证owner-scoped持久Run、Artifact及同Run CLI `--check-only`/脱敏导出；参见[TestRun `41b4e5b2-e865-4a5a-8cc2-acd11b2aedbe`](../local/V2.3/41b4e5b2-e865-4a5a-8cc2-acd11b2aedbe/evidence.json)及[2026-10-02复验记录](2026-10-02-w4-v23-qlib-fixture-rerun.md)。这些历史证据只覆盖其源码指纹所绑定时点；本次新复算不伪装成新的持久Web TestRun。该追溯链作为既有Artifact工程能力证据复用。

**C4 Fixture本地学习范围：自动验收与用户人工验收均PASS（2026-10-24）。V2.3阶段：PARTIALLY_IMPLEMENTED。** 人工签署见[签署记录](2026-10-24-v23-c4-fixture-human-acceptance.json)；真实市场数据/PIT仍`NOT_RUN`。

## 限制与复现

复现：在项目根目录运行上述命令。需要本机Docker Desktop；默认沙箱不能连接Docker socket，受控本机Docker执行成功。Qlib/MLflow输出包含缺失可选模型及Git可执行文件的非阻断提示；核心断言通过。临时镜像和容器均已清理。

本记录引用的工作区执行输入和精确结果见同目录对应代码改动；冻结输入Manifest保持不变。

# V2.3 Qlib研究边界更正（2026-09-27）

## 发现

对版本库提交`bfc7732`（2026-09-11）的源码复核发现，量化Worker `/train`直接对输入`open`字段求均值，却返回`status=COMPLETED`和`adapter=qlib`；`/validate`在相同Worker内重复摘要计算并返回`independent=true`。`/v1/research/multi-bar`据此断言“Qlib adapter accepted”及“independent hash recomputation”通过。历史回放执行/账本结果可独立验证，但这些字段不能证明真实Qlib训练、独立模型复算或PIT/OOS验证。

活动Qlib容器只读检查确认`qlib==0.9.6`可导入；从`qlib.contrib.model.gbdt`导入`LGBModel`失败，原因是镜像缺`libgomp.so.1`。因此活动`/probe`当时的READY也只证明顶层包导入。

## 本轮更正

- Worker `/train`现返回`FIXTURE_ONLY`、`adapter=fixture-summary`、`modelTraining=NOT_RUN`；产物名称为`open-price-mean-summary`，不附会Qlib版本。
- `/validate`只报告`HASH_MATCH`/`HASH_MISMATCH`及`FIXTURE_SUMMARY_HASH_RECOMPUTATION`；`independentModelValidation=NOT_RUN`。
- 量化服务聚合结果及平台完整性断言同步改为Fixture摘要语义。回放订单/成交/账本完成状态与研究模型训练状态明确分开。
- 探针现在要求导入Qlib LightGBM模型类；Dockerfile固定Python基础镜像digest并安装`libgomp1=14.2.0-19`。
- 新增Worker标准库HTTP测试3项并并入量化服务`test`命令，覆盖Fixture-only标记、哈希复算不冒称独立模型验证、缺少Qlib时探针NOT_RUN。

## 验证

- 量化Worker HTTP测试3/3；量化TS单测25/25；量化构建、平台API类型检查和平台单测47/47通过。
- `pnpm verify:stage -- --stage V2.3 --suite code`最终退出0：全工作区build/lint/typecheck、应用单测、FakeBroker/Portfolio隔离PG与HTTP恢复烟测、Market Data隔离PG集成22/22、Python Adapter 58项、运维脚本94/94，以及量化Worker 3项HTTP测试均通过；契约79 JSON/43 schemas/28 fixtures/30兼容规则和15个Fixture Hash通过。阶段状态从PASS纠正为PARTIALLY_IMPLEMENTED后，版本门禁单测初次因硬编码预期未解决阶段数2而失败；已改为要求V2.3出现在未解决阶段清单，再次完整套件通过。此code suite不等于V2.3正常/拒绝/恢复Web场景重新验收。
- 修正后全版本门禁如预期：`pnpm verify:version -- --version V2`和`--version V3`均退出2/`INCOMPLETE`；V2未解决列表包含V2.3、V2.4、V2.5，V3保留四阶段未运行。它们没有因V2.3代码套件变绿而误报整版通过。
- 用基于既有本地Qlib amd64镜像的一次性临时容器补装libgomp后，在ARM Mac amd64仿真下验证Qlib 0.9.6 `LGBModel`类可导入，Worker新`/probe`返回`qlib-model-import-ok`；直接LightGBM 4.7.0 CPU两轮训练/预测通过。该直接LightGBM smoke没有调用Qlib的`LGBModel.fit`，也没有验证Qlib Dataset、Qlib训练工作流、候选PIT/OOS、成本/规则/容量或独立复算。
- 从固定Python基础镜像重新构建时，系统依赖安装成功，但配置的Python索引未提供`pyqlib==0.9.6`，故完整Dockerfile重建仍未验证。临时容器、派生镜像和Dockerfile已清理。活动服务容器未重启/更新；活动镜像仍缺libgomp。

## 阶段与后续

V2.3历史回放模拟链的2026-09-19用户签署记录保留；该签署不能作为当前Qlib训练证据。V2.3当前技术状态调整为`PARTIALLY_IMPLEMENTED`，V2总体继续`PARTIALLY_IMPLEMENTED`。后续需锁定可复现依赖来源，完成真实Qlib训练接口、真实Qlib模型适配数据集、隔离的独立评估及固定输入的正常/拒绝/恢复验证；候选人工晋升仍属V3.2独立门禁。V1.2历史范围仅含Qlib CPU导入/基础因子探针，是否受该模型后端问题影响需按其独立验收步骤重新确认；本审计不改写原用户签署时间或内容。

## 2026-09-27 V2.3 code suite 集成的 Qlib 拟合冒烟

阶段代码计划现仅对V2.3调用`pnpm --filter @stockquant/quant-research-service qlib:fit-smoke`；其它V2阶段仍沿用轻量共享code suite。新增命令计划回归验证该范围。完整`pnpm verify:stage -- --stage V2.3 --suite code`退出0，Qlib smoke以隔离linux/amd64容器真实构造Qlib 0.9.6 Dataset并执行`LGBModel.fit`及test预测：120行确定性合成数据分成72/24/24，24个预测有限；模型SHA-256 `08d29ca3ccefc37e887928d5a4512a9f63d53edef6cc91b4289e1731ec675695`、预测SHA-256 `09d1563ed1102a87f6e71672e9b1238ce844094aa336cb33efeea6ac995bdbe3`，重复拟合一致；无效重叠切分返回422。容器资源限制为2GiB/1 CPU/PID 128、网络隔离、只读root、临时SQLite；Mac Apple Silicon通过linux/amd64仿真运行。临时容器与镜像已清理。

此修复补上code suite未执行真实训练组件的缺口，但不改变生产`/train`的Fixture摘要语义，不代表市场数据、研究Worker生产路径、PIT/OOS或独立模型复算。`modelValidation=NOT_RUN`，V2.3继续`PARTIALLY_IMPLEMENTED`，研究Web/CLI新证据与人工验收待做。构建环境未安装git，Qlib recorder未捕获源码diff/status；此次执行哈希完整，但缺少Qlib自身工作树元数据。

## 2026-09-27 后续工程冒烟：Qlib Dataset 与 LGBModel.fit

在一次性 amd64 仿真容器内补齐 `libgomp`，用 120 行确定性合成数据构造包含 feature/label MultiIndex 列及 train/validation/test 三段的内存 Qlib `Dataset`，实际调用 `qlib.contrib.model.gbdt.LGBModel.fit`（Qlib 0.9.6、LightGBM 4.7.0、CPU、3 boosting rounds、1 thread），再调用 `predict(segment="test")`。72/24/24 行拆分成功，24 个测试预测均为有限值，预测字节 SHA-256 为 `6ff12ff0409ec6c24cfbc0178373fd74457753b4f66f11b9450e713906eb7f68`。Qlib 工作流使用一次性 SQLite tracking DB；首次尝试的文件型 MLflow tracking 被当前 MLflow 拒绝后已改用 SQLite。临时容器、派生镜像及脚本均已移除。

该次运行只证明安装于既有本地镜像中的 Qlib API 与一个人工内存 Dataset 可以完成训练/预测；输入不是市场数据，也不是冻结项目 Fixture，未测试 Worker 生产路由、特征泄漏/复权/PIT、真实独立复算、模型登记或策略有效性。现有回放 Fixture 仍不足以做合格训练拆分。故 `/train` 与 `/validate` 保持 Fixture-only / NOT_RUN 边界，V2.3及V3.2业务验证状态不变；固定基础镜像上的完整干净构建仍因配置索引无法获取 `pyqlib==0.9.6` 而未通过。

## 2026-09-27 官方索引干净构建与 Worker 运行验证

为定位前述镜像构建阻塞，在与生产 Dockerfile 相同的 Python 3.11 amd64 固定基础镜像上进行隔离实验：默认配置的包索引无法提供 `pyqlib==0.9.6`；临时指定官方 PyPI 后，干净安装成功。PyPI 的 0.9.6 发布文件列有 CPython 3.11 manylinux x86_64 wheel，wheel SHA-256 为 `d409260ddf8f4e41359bc5db100b371c0daa432868f7afa71d559353351b79d0`；Microsoft Qlib 发布页将 v0.9.6 对应到完整 commit `5a84aaf1dc402232646ad2836dea33ff15886552`。[PyPI 发布文件](https://pypi.org/project/pyqlib/0.9.6/)；[Qlib v0.9.6 commit](https://github.com/microsoft/qlib/commit/5a84aaf1dc402232646ad2836dea33ff15886552)。

Worker Dockerfile现默认显式使用 `https://pypi.org/simple`，同时允许构建时用 `STOCKQUANT_PYTHON_INDEX_URL`指定企业镜像；新增 CPython 3.11/linux-amd64 188项精确版本清单 `qlib-worker-requirements.lock`，并将 `QLIB_SOURCE_COMMIT`从版本文字改为上述完整SHA，Compose元数据同步。清单精确钉住版本，但除记录Qlib主wheel SHA外，尚未使用pip `--require-hashes`约束每个依赖包的制品哈希，因此仍需补制品级哈希锁定。

最终锁文件版镜像从固定Python基础digest全新构建退出0，`pip check`报告无损坏依赖。临时 amd64 镜像ID为 `sha256:7829b5db3a905392a60f09e81465dd05fa78e78c893fbb0bb1dfc140fa754a52`，大小 `1,392,191,422` bytes；pip安装步骤耗时265.9秒。镜像中真实Worker `/probe`返回 `READY`、Qlib 0.9.6、`qlib.contrib.model.gbdt.LGBModel`、LightGBM 4.7.0。使用同一锁定环境及120行确定性合成内存Dataset再次执行 `LGBModel.fit`和`predict(test)`，72/24/24行切分通过，24个测试预测有限。主机为Apple Silicon，容器以linux/amd64仿真运行。测试容器、两张临时镜像、测试Dockerfile与脚本已清除；活动V12 Qlib容器未更新，复核时仍healthy。

该证据解决了干净构建的包源缺失并固定了依赖版本，仍不等于活动服务已升级、原生Ubuntu验收或市场数据研究通过。镜像体积和构建耗时偏大；可选依赖裁剪、完整制品Hash锁定、V2.3研究Worker输入/输出与独立模型复算、冻结数据用途许可仍在计划中。生产 `/train`/`/validate`继续明确`NOT_RUN`，V2.3维持`PARTIALLY_IMPLEMENTED`。

## 2026-09-27 制品哈希锁与锁文件版 Qlib 拟合冒烟

后续已为 `qlib-worker-requirements.lock` 的全部188个精确版本补入PyPI发布制品SHA-256（共3033个哈希），并新增 `qlib-worker-build-tools.lock` 固定 setuptools 79.0.1、wheel 0.46.3及哈希。Dockerfile以 `--require-hashes` 安装运行依赖，并使用 `--no-build-isolation --no-deps`；构建工具单独采用 `--require-hashes --only-binary=:all:`，随后执行 `pip check`。`gym==0.26.2`仅提供源码包，故主锁未强制binary-only；其源码制品仍受哈希校验且在固定构建工具环境中构建。依赖版本与前一锁一致（仅规范化一个等价包名）。

临时锁文件版镜像成功完成项目 `qlib:fit-smoke`：Qlib 0.9.6 `LGBModel.fit`及test预测通过，72/24/24合成样本切分，24个有限预测，确定性复跑哈希一致；`pip check`通过，命令退出0。临时镜像在脚本结束时清理。镜像 `sha256:e7436d6146212dc2855ae39992be2ec05023574ebb7909aa11bbbc7046e53c67`，Apple Silicon主机上以linux/amd64仿真运行。

该证据关闭“每个锁定依赖未校验制品哈希”这一工程缺口，未升级活动容器，也未验证原生Ubuntu、真实市场数据、候选策略或独立模型复算。V2.3 `/train`与`/validate`仍为Fixture-only/NOT_RUN；阶段与用户验收状态不变。pip的哈希检查及binary/source安装限制说明见[Secure installs](https://pip.pypa.io/en/latest/topics/secure-installs/)与[Repeatable installs](https://pip.pypa.io/en/stable/topics/repeatable-installs/)。

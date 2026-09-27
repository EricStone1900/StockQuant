# Qlib训练后端可用性复核（2026-09-26）

只读检查发现当前活动 Qlib worker 的 `/probe` 只执行 `import qlib`，因此返回 READY 并不代表模型训练后端可加载。对同一现存容器的只读实测：Qlib 0.9.6 可导入；导入 `qlib.contrib.model.gbdt.LGBModel` 时因缺少 `libgomp.so.1` 失败。现有 `/train` 源码未调用 Qlib API，而是直接计算原始 `open` 的均值，并将结果标为 `deterministic-sma`；`/validate` 则在同一Worker内重复该统计后比较哈希。现有 `/v1/research/multi-bar` 仍将此结果标为 `adapter=qlib` 和训练完成。这不能证明真实Qlib建模或V3.2独立复算。

本轮代码调整：Qlib探针现在要求真实导入 Qlib LightGBM 模型类并报告后端/版本；Worker镜像固定Python基础镜像digest并显式安装锁定版本的`libgomp1`。

验证：全新基础镜像构建成功安装`libgomp1=14.2.0-19`，但配置的Python索引没有提供`pyqlib==0.9.6`，所以从锁定基础镜像完整重建仍未成功。为单独验证修复，基于已有本地Qlib amd64镜像运行一次性隔离容器、安装该系统库并生成临时smoke镜像（digest `sha256:a67b870caec087d1083bfa7cce4f6395ae65044a328f2211bb45eb7511b2f992`）；在Apple Silicon上以amd64仿真确认Qlib 0.9.6 `LGBModel`导入通过、LightGBM 4.7.0 CPU两轮训练和预测通过，并挂载本轮Worker源码只读运行`/probe`，返回`qlib-model-import-ok`。smoke容器、镜像和临时Dockerfile均清理。活动服务/容器未修改或重启。

未完成项：依赖完整锁文件及可复现安装来源；真实Qlib Dataset/训练和独立重算实现；删除`multi-bar`中的假Qlib成功声明；冻结数据上的隔离验证。此复核是缺陷定位和依赖准备，不改变V1.2历史人工签署，也不使V3.2或研究业务验收通过。后续须优先纠正V2.3研究结果标记，再实现真实受控建模。

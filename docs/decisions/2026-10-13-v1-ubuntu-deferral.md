# V1 Ubuntu实机验收延期决定

日期：2026-10-13（Asia/Shanghai）。状态：ACCEPTED；执行结果：DEFERRED / NOT_RUN。

项目所有者在当前会话要求：“ubuntu 实机影不影响V1的完成？可不可以先标记以后再说，先把V1开发完毕”。据此，Ubuntu实机部署、恢复及目标主机资源验证从V1本轮开发与验收的必需条件移出，延期到后续Ubuntu部署验收；归入既有V3.4交付范围，不启动V3开发。

V1以Mac M1上的本地模拟平台为本轮交付环境，仍要求真实容器后端、容器化Web、锁定Qlib组件与适用本地正常/拒绝/恢复场景、同Run CLI/export及人工验收。按三版共同规则保留目标架构烟测及缺口登记；仿真证据必须标注架构和emulated，不称Ubuntu实机通过。

本决定只延期Ubuntu实机项。全V1业务交接、交易正确性、Quant/Paper规则对照、必需本地后台恢复、历史Run证据处置、Artifact政策及当前范围人工签收仍按现有要求执行。未验证的Ubuntu项保持DEFERRED / NOT_RUN，不勾选PASS，不因本决定将阶段或V1标记完成。

历史日志、签署、需求来源和证据不改写。旧记录中的“Ubuntu未完成”仍是历史事实，自本决定起不再作为V1完成阻塞。后续Ubuntu部署须使用精确候选版本，在真实目标主机执行部署、恢复、业务/E2E及资源验证，取得对应验收后才能声称Ubuntu交付完成。

同步入口：[当前进度](../progress.md)、[V1完成计划](../plans/2026-10-08-v1-completion-plan.md)、[V1版本计划](../prd/v1-local-simulation/00-version-plan.md)、[三版共同规则](../prd/05-three-version-delivery.md)。

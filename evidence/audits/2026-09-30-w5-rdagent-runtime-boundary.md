# W5 RD-Agent runtime and model boundary inspection

日期：2026-09-30。只读检查已构建的Runner镜像`sha256:98fb5215ea3a02e453875c885f47545c0c9b2a97a7b75f3d6bda4438be2d507c`（linux/amd64）。使用`docker run --platform linux/amd64 --network none --read-only --cap-drop ALL --security-opt no-new-privileges --user 10001:10001`检查RD-Agent v0.8.0安装源码；没有挂载工作区/Socket/凭证，没有启动实验，不访问网络。

实际`rdagent.oai.backend.litellm.LiteLLMAPIBackend`会调用LiteLLM的`completion()`与`embedding()`，默认`chat_stream=true`、`log_llm_chat_content=true`、`max_retry=10`，配置通过`LITELLM_`前缀环境项加载；源码还会记录prompt/assistant文本、局部`completion_cost`以及按本地token counter重新估算的成本。此实现与本地新增的非流式DeepSeek传输适配器不兼容，亦不可让无网络的受限Runner直接承载Provider凭证。

由当前已核实边界可得：W5需在受信任控制器/网关进程中承载RD-Agent的模型调用，并让生成代码Runner保持无网络、无秘密；需要显式覆盖关闭聊天内容日志/缓存/自动重试，并让所有调用具备单次预留与usage证据。以Runner直接执行RD-Agent、仅注入凭证或把现有HTTP客户端当作已完成集成都不满足该条件。接下来应先实现并用隔离Fixture验证LiteLLM兼容的内部网关/控制器接口；在网关账单对账、可执行出口隔离和OD-009认可门槛满足前，保持生产preflight BLOCKED、真实调用NOT_RUN。

证据边界：这是固定镜像、network-none环境下的安装源码检查；不证明Ubuntu实机兼容，不执行RD-Agent实验，不验证真实网络策略/账单/Provider，也不改变OD-009与人工验收状态。

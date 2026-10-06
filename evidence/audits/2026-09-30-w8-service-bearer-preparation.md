# W8 服务 Bearer 本地准备

日期：2026-09-30。范围：为候选部署准备本地独立服务身份Bearer，不读取/输出凭据值，不修改活动服务。

新增`pnpm verify:w8:service-bearers`和`pnpm prepare:w8:service-bearers`。脚本只接受常规`.env.local`文件且拒绝符号链接或权限宽于0600；校验8个服务身份配置存在、格式长度至少32、值互异；报告只列环境变量名和状态。`--prepare`只生成缺失值、不覆盖已有值，并通过0600同目录临时文件替换；运行状态明确报告`appliedToActiveServices=false`。

首次只读预检显示Platform API、Trade Execution、Historical Replay、Runner Host已有独立配置；Decision Governance、Research Automation、Quant Validation Worker、Quant Research Service缺失。`pnpm test:w8:service-bearers` 3/3通过，覆盖shell assignment解析、缺失值填充/唯一性/幂等不覆盖、重复身份拒绝及文件权限保护。随后执行`pnpm prepare:w8:service-bearers`及`pnpm verify:w8:service-bearers`均PASS：8个身份全部CONFIGURED，无重复/格式错误，`.env.local`仍为0600，输出不含秘密值。

此为本机候选配置准备，不等于OD-004活动Bearer配置、轮换、监控、调用会话核验或Ubuntu Secret Store验证。未读取运行中容器秘密、未向活动容器/数据库写配置、未重启服务、未建立新研究/交易会话；当前活动Platform不健康及旧Bearer状态保持不变。正式应用前仍须在批准维护窗口核对接收者/验证者映射和回退，并对精确候选镜像执行认证健康与错Token拒绝验证。

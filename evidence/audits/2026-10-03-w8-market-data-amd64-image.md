# W8 Market Data linux/amd64 当前源码镜像预构建

2026-10-03。命令`docker buildx build --platform linux/amd64 --load --tag stockquant-market-data:w3-scheduler-auth-20261003 --file services/market-data-service/Dockerfile .`成功；BuildKit builder为`desktop-linux`。本机Mac ARM64执行linux/amd64仿真构建，不能替代Ubuntu x86_64实机验证。

镜像平台`linux/amd64`，Image ID `sha256:bafa9c440b902c3e3f3f380c0770a117145a84630480a8a8e801d0eac562a242`，大小1,016,254,348 bytes。构建使用锁定Node 24.1.0 Bookworm与Python 3.11 slim Bookworm基础镜像，验证pyarrow 18.1.0并执行Market Data TypeScript build；`STOCKQUANT_INSTALL_TDX=0`，不包含TDX可选依赖。构建上下文1.47 MB，`.dockerignore`排除.env及`.env.local`。

此仅为当前代码的目标架构镜像准备：镜像未启动、未推送、未部署到活动服务；未连接数据库、市场数据源或Paper；本地Market Data服务/Ubuntu目标均未改变。镜像可作为后续获批Ubuntu迁移审阅输入，但不构成迁移/恢复/性能/5日观察证据。源文件逐项Hash见[sources Manifest](2026-10-03-w8-market-data-amd64-image.sources.sha256)。

# W5/V3.1 Docker上下文密钥排除与完整代码回归

日期：2026-10-01（Asia/Shanghai）

此前V3.1完整代码套件未能用当前Research Automation镜像复跑：仓库忽略`.env.local`但根`.dockerignore`未排除该文件，宽上下文构建存在泄露风险。现为根/嵌套Docker忽略规则增加`.env`与`.env.*`排除，并添加静态回归断言。另在独立临时目录中复制实际`.dockerignore`、创建内容为假哨兵的`.env.local`，让Docker尝试`COPY .env.local`；实际构建因文件不在构建上下文而失败，构建输出未包含哨兵内容。没有读取或复制本机凭证。

在当前源码上执行`docker build -f services/research-automation-service/Dockerfile .`，Docker只传输1.47 MB构建上下文；build阶段构建成功，Research Automation镜像内31个单测文件169/169通过。最终镜像ID为`sha256:4cb517d99727cab1f5001f53dcc11aa0cf2d42ad5ce564e685d5dbc28796a730`。用精确ID运行`STOCKQUANT_RESEARCH_IMAGE_ID=sha256:4cb517d99727cab1f5001f53dcc11aa0cf2d42ad5ce564e685d5dbc28796a730 pnpm verify:stage -- --stage V3.1 --suite code`，完整套件退出0：合同检查通过；Research lint、31个测试文件169/169、4个PostgreSQL集成文件21/21、V3.3队列容量只读探针、HTTP Fixture网关、内部LiteLLM Chat/Embedding、Platform typecheck与31个测试文件112/112、Artifact owner-scope HTTP Smoke及Web typecheck均通过。

内部LiteLLM固定响应只走`internal-only` Docker网络，模型调用结算行`SETTLED,SETTLED|120|120|46|2`，外部Provider调用0；Runner镜像精确ID为`sha256:eb9030b8107c79c3554dabc68322814b81c04564bb0a1e5a9841bd603a67ccf1`。临时Research/PG容器与网络在退出后只读核查为空；owner-scope烟测报告`activeServicesTouched=false`。Docker构建按锁定依赖从npm Registry下载pnpm/包，这是构建依赖流量，不是Provider、行情或券商调用。

本证据只证明受控本机Docker下的离线/Fixture代码回归和密钥上下文排除，不代表真实RD-Agent研究、真实模型调用、供应商账单核对、Ubuntu实机或V3.1人工验收。V3.1仍为`NOT_RUN`，NO_TRADE及无数据源授权保持不变。

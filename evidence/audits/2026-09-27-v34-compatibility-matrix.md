# V3.4 local container compatibility matrix and verifier fix (2026-09-27)

## Verifier defect found and fixed

The previous `verify:compat` set `DOCKER_DEFAULT_PLATFORM` for the entire Compose project. That conflicted with Compose's pinned `qlib-worker: platform: linux/amd64` when the requested probe was `linux/arm64`, even though the command only builds/runs Platform API. The arm64 invocation therefore failed during the unrelated Platform API build preflight.

The verifier now validates the complete Compose file with any inherited `DOCKER_DEFAULT_PLATFORM` removed, then uses `docker buildx build --platform <requested>` to build only the Platform API image and `docker run --rm --platform <requested>` for a Node v24 runtime/architecture assertion. Image tags are isolated by target architecture. The production Compose architecture pin for Qlib remains unchanged.

## Verification

- `node --check scripts/verify-compat.mjs`: PASS.
- `pnpm verify:compat -- --platform linux/arm64`: PASS; probe reports Linux/arm64, Node v24.1.0; host process `darwin/arm64`, architecture emulation flag `false`. Image `stockquant-compat-platform-api:linux-arm64`, ID `sha256:7b675043b9160fff4ea8bdc5320964eb75d9de80cafa1d96a7d0ad7205d25aa1`.
- `pnpm verify:compat -- --platform linux/amd64`: PASS; probe reports Linux/x64, Node v24.1.0; host process `darwin/arm64`, architecture emulation flag `true`. Image `stockquant-compat-platform-api:linux-amd64`, ID `sha256:6945353373502815145bef1394865900011bacdbc04d878070c0e36e20df7c90`.
- Cross-environment regression: with outer `DOCKER_DEFAULT_PLATFORM=linux/amd64`, explicit arm64 still passed; with outer `DOCKER_DEFAULT_PLATFORM=linux/arm64`, explicit amd64 still passed. Compose config remains valid in each case.
- After runs, `docker ps` showed only the pre-existing V12 services; no probe container remained. The active Platform API container remains running on image `sha256:2d3b6d1c18fd2b190adbad5491ca00e8c09fdc0a87f682f5e96857ef3ad05709`; neither compatibility image replaced it.
- `pnpm baseline:check` passed after documentation updates; current verification also records `pnpm verify:version -- --version V3` as correctly INCOMPLETE/exit 2 with V3.1–V3.4 `NOT_RUN`.

## Limits

ADR-0007 and OD-010 already set the formal Ubuntu CPU target to x86_64/linux/amd64 (provisional); the amd64 result here is emulated on the Apple Silicon host. The arm64 result is exploratory local Docker evidence, not a native Ubuntu host test. Ubuntu release, actual host CPU/memory/disk/network, deployment path, migrations, volume restore, complete stack regression and five-day Paper observation remain unverified. No live service was rebuilt/restarted and no observation period was credited.

## Independent rerun (2026-09-27)

After the user's confirmation that service identity uses one independent Bearer token per service, repository/contract/Fixture baseline passed again (822 Markdown links; 120 JSON files, 69 schemas, 34 Fixtures; 56 compatibility rules; 11 OpenAPI groups). `git diff --check` passed. Both explicit compatibility targets were rerun: linux/arm64 passed natively on the Mac ARM64 Docker host and linux/amd64 passed with emulation; each probe reported Node v24.1.0 and the expected architecture. The sandboxed attempt was blocked at Docker socket access before building; the authorized local rerun completed. These checks do not change the P7.2 authentication choice already implemented and do not satisfy the Ubuntu or active-service deployment gates.

## Complete local image build matrix (2026-09-27)

The initial Compose build exposed `tsc: not found` in the Research Automation image: its service package did not declare TypeScript, although its build script invokes it. The service now pins TypeScript 7.0.2 and Vitest 5.0.0. Its Dockerfile uses a build stage to install locked development dependencies, compile the service and run its 139 unit tests; the final stage installs production dependencies only, copies `dist`, and runs as the `node` user. The lockfile was updated offline from the local package cache.

`pnpm --filter @stockquant/research-automation-service build` passed and its host unit suite passed (24 files/139 tests). The isolated `linux/amd64` Docker build passed too, including the same compile and 139-test suite. A final full `DOCKER_DEFAULT_PLATFORM=linux/amd64 docker compose --profile web --env-file .env.local -f infra/compose/docker-compose.yml build --progress plain` exited 0. All ten project-built images report `linux/amd64`:

| Image | SHA-256 image ID |
|---|---|
| `stockquant-v12-portfolio-risk-service` | `92b1e41a63460d1980a2e1c556596575834321c1e3aad6c5cdafacfa01faa8f9` |
| `stockquant-v12-platform-api-service` | `803047f6cf3451eb3abd3c377b646f1132e1b117afeb84d4bc0254122482dca3` |
| `stockquant-v12-trade-execution-service` | `d92dd9e60493fbabda75c1a9d35315fbf67c19ed309876ebf4e090bd896f8751` |
| `stockquant-v12-decision-governance-service` | `796e88a27319d8275fd571c94ee1db0ba9e9e04de9a14c2eb61932ec32212d52` |
| `stockquant-v12-historical-replay-worker` | `ec8093592fcb413f876ce15f6b41563eb37e6e98a3a08c31a5faf9480b3f7bf5` |
| `stockquant-v12-market-data-service` | `e18e7956c1838ab7def0e7c185cc70ae76ecdf652fdf6d04a4d155dedecb9687` |
| `stockquant-v12-quant-research-service` | `abcfd24551248d13c7dd52a66fdc1019863744aa07ed6430abe6ca0a8cdeaa58` |
| `stockquant-v12-research-automation-service` | `f0cfa2db2d532d03209ec1c32b93bfa347f074a2e4cbf8f44eba46ffd264f00d` |
| `stockquant-v12-qlib-worker` | `1b1c218834602aa7c038f198914648473afbe56519173e10062df5f57223fd69` |
| `stockquant-v12-web` | `ccfc23874167d88766eb3391e804676d6a6438aa1d93fb0d8784646eb1a53969` |

A no-network, read-only-root runtime probe on the final Research Automation image reported Linux/x64 and Node v24.1.0; `pg` resolved, while TypeScript and Vitest were absent from the production image. Docker `ps` showed the existing stack remained running; no service was started, stopped, or redeployed by these build commands. This remains Mac Docker evidence (AMD64 emulation), not a real Ubuntu host, full-stack runtime, migration/restore, Paper observation, or human-acceptance result. Image tags now reference these new local builds, while already-running containers retain their current image IDs until an explicit deployment.

After recording this matrix in the execution plan, `pnpm baseline:check` passed with 823 Markdown links, 120 JSON files, 69 schemas, 34 Fixtures, 56 compatibility rules, and 11 OpenAPI groups; `git diff --check` also passed.

## Current-source Research Automation image revalidation (2026-09-27)

Built the current source with `docker buildx build --platform linux/amd64 --load -t stockquant-v34-research-automation:codex-preflight-20260927 -f services/research-automation-service/Dockerfile .`. The frozen pnpm lock resolved without drift, TypeScript compilation passed and the image build ran all 25 unit files / 144 tests successfully. The separate final-stage image ID is `sha256:98512b277f2862fae3a358371a658bcc4d2e337b6d5c57361a9caea869b009b0`, platform `linux/amd64`.

Ran the image with `--network none --read-only --cap-drop ALL --security-opt no-new-privileges --pids-limit 64`; it reported Linux/x64, Node v24.1.0, production `pg` resolvable and TypeScript/Vitest absent. The one-off container exited and no container for the preflight tag remained. Read-only Compose inspection afterward showed active PostgreSQL, Research Automation, and Platform API healthy and running with no restart. This is an isolated Mac Docker AMD64 emulation build/runtime probe; it does not prove native Ubuntu, complete-stack deployment, DB/volume migration or recovery, V3.4 workflow, Paper observation, or human acceptance.

## Current-source containerized Web build and isolated run (2026-09-27)

Built the current Web source with `docker buildx build --platform linux/amd64 --load -t stockquant-v34-web:codex-preflight-20260927 -f apps/web/Dockerfile .`. The frozen pnpm lock resolved without drift and `pnpm --filter @stockquant/web build` passed; image ID `sha256:f2cea05a1387bb16906cffa6538d97e5798234b47a5b7ca850bcbeff930f147c`, `linux/amd64`.

Started the image in a one-off container with `--network none --read-only --cap-drop ALL --security-opt no-new-privileges --pids-limit 64` and the `node` user. The deep route `/acceptance/v3/v3.3`, its built JavaScript, and CSS each returned HTTP 200 from the running container. The check made no API calls. The temporary container was removed and no matching container remained. PostgreSQL, Research Automation and Platform API stayed healthy/running; Web stayed running and was not restarted. This verifies the Web image's isolated static server and SPA route fallback, not browser-to-API behavior, full-stack runtime, or Ubuntu deployment.

## Repeatable internal-network Web/API proxy smoke (2026-09-27)

Added `pnpm v34:web-container-smoke` (`scripts/v34-web-container-smoke.mjs`) to exercise the current Web image over an isolated Docker `--internal` network. It builds for `linux/amd64`, runs the Web container with a read-only root filesystem and a tmpfs only for Vite's transient config bundle, then probes `/acceptance/v3/v3.3`, the emitted JS and CSS, and `/api/v1/session` proxied to a tiny fixed mock Platform API. The probe reports its marker `V34_CONTAINER_WEB_PROXY_SMOKE`; it has no route to external or active project services. The Web `package.json` is included in the final image so Vite loads its ESM config without a config-loader warning.

Result: PASS; deep route, JS, CSS and API proxy all returned HTTP 200; Vite config warnings 0; runtime user `node`; Linux/amd64 image ID `sha256:e58e6e2cf05baf60d8b41d14b5bd2ea09c0dd7aeda4e9c2bd847091b920e4f50`. Script cleanup removes the temporary containers, internal network and unique image. The first attempt exposed the missing tmpfs for Vite's runtime config file and was interrupted; the exact temporary containers/networks were then removed, and the corrected rerun passed. This verifies the container's Web-to-mock-API proxy path only: it does not prove real Platform API integration, browser acceptance, full-stack operation, Ubuntu deployment, or human acceptance.

After this change, `pnpm verify:stage -- --stage V3.4 --suite code` passed in full: baseline (840 Markdown links, 126 JSON, 74 schemas, 34 Fixtures, 61 compatibility rules, 12 OpenAPI groups), workspace build/lint/typecheck/unit suite, Qlib Worker Python tests (12), Research Automation (25 files/144 tests), Platform API (21 files/74 tests), Market Data (15 files/62 tests), Trade Execution (7 files/42 tests), Portfolio/Risk (2 files/4 tests), historical replay (4 files/10 tests), governance (3 files/9 tests), Web (1 test) and V3.4 command-contract tests (4/4). The first sandboxed suite attempt stopped at the Qlib Worker random loopback bind with `EPERM`; the same full command passed in the authorized local test environment. Final result explicitly scopes this to local code preflight: V3.4 workflow/full-stage E2E not implemented, Ubuntu validation, Paper observation and human acceptance remain `NOT_RUN`.

## Linux ARM64 Web 当前源码容器验证（2026-09-27）

将原 Web 容器 smoke 扩展为显式 `STOCKQUANT_WEB_CONTAINER_PLATFORM=linux/amd64|linux/arm64` 参数，默认仍为 AMD64，并新增 `pnpm v34:web-container-smoke:arm64`。从当前工作树通过 frozen lockfile 构建 Linux/ARM64 Web 镜像，构建阶段 `pnpm --filter @stockquant/web build`通过；本机 Docker Engine 报告`linux/aarch64`。隔离容器以非root `node`用户、只读根文件系统、无额外capability、no-new-privileges、有限PID运行于internal-only网络。实际 smoke：`/acceptance/v3/v3.3`、JS、CSS和代理到固定Mock Platform `/api/v1/session`均HTTP 200，配置警告0，外连禁用、活动服务未连接。镜像SHA-256 `e0f2013ef842bafc29f2059094f465c442120893c3df438931596efd914c6125`；脚本自动删除临时容器、网络及镜像。此为Mac宿主上的Linux ARM64容器验证，不是Ubuntu发行版/主机发布验证或V3.4验收。

## 双架构 Web smoke 命令回归（2026-09-27）

原默认入口`pnpm v34:web-container-smoke`在脚本参数化后再次通过，构建并检查`linux/amd64`镜像SHA `b68231964f8fe382e250611ec129cd9ba6ccd4aee9893492a67dacf402eef5bd`；ARM64专用入口亦通过，SHA `e0f2013ef842bafc29f2059094f465c442120893c3df438931596efd914c6125`。两者各自深层路由/JS/CSS/mock API代理均200，internal-only网络，临时资源已清理。Docker Engine为Linux/aarch64，因此AMD64为仿真，ARM64为本机目标架构容器；两者均非真实Ubuntu发布验收。

## 当前源码 Research Automation Linux ARM64 容器身份与预算 smoke（2026-09-27）

新增`pnpm v34:research-container-smoke`和`pnpm v34:research-container-smoke:arm64`（`scripts/v34-research-container-smoke.mjs`）。ARM64当前源码镜像SHA `bd4225a4d178c7e0a54068e4e99d64851f1129117834add93b7a26632b7c43d4`；默认AMD64回归镜像SHA `07bf9ba6768ae73765e362d2cd2182faff705cac082d20dd388ace7e59ab6c55`。两种架构的镜像构建均通过冻结依赖安装、TypeScript build以及26个单测文件/150项测试。本机Docker Engine为Linux/aarch64（ARM64本机运行，AMD64仿真）。运行容器采用internal-only网络、read-only root、tmpfs临时目录、drop-all-capabilities、no-new-privileges及PID上限；探针容器同样无外网，所有临时容器、网络和镜像由脚本清理。

HTTP结果PASS：`/ready`报告RESEARCH/FAKE、Runner与Model Gateway `NOT_CONFIGURED`、outbound `DENY`、budget persistence `MEMORY`、`PENDING_PREREQUISITES`；匿名实验请求401；Runner Host Bearer不能创建实验（403）或派发任务（403），拒绝派发后TestRun队列仍为0。Platform API Bearer创建同一UUID TestRun的实验后得到`PENDING_PREREQUISITES`及`RESERVED`预算（25 USD cents），有效准备请求只进入`QUEUED`、`execution=NOT_STARTED`，无Runner或模型执行。首次未提升权限的尝试在Docker socket处被拒；授权的本机隔离容器复跑通过。这是Mac上的Linux ARM64容器证据，不证明Ubuntu主机、PostgreSQL持久队列、完整业务编排、Runner执行或真实模型调用，也不改变V3.4业务/人工验收的NOT_RUN状态。

之后运行默认`pnpm v34:research-container-smoke`亦通过，`linux/amd64`镜像SHA `07bf9ba6768ae73765e362d2cd2182faff705cac082d20dd388ace7e59ab6c55`，同样26文件/150测试及全部HTTP断言通过。再运行完整`pnpm verify:stage -- --stage V3.4 --suite code`，在可绑定loopback的授权隔离测试环境退出0：baseline 866 Markdown链接、126 JSON、74 Schema、34 Fixture、61兼容规则、12 OpenAPI组，全仓build/lint/typecheck/unit和V3.4合同测试4/4通过。首次普通沙箱重跑在Qlib Worker随机loopback绑定处EPERM，保留该失败证据；原命令获准后通过。机器结果scope仍限本机代码预检，正式V3.4业务工作流和全阶段E2E未实现，Ubuntu验证、Paper观察和人工验收未运行。

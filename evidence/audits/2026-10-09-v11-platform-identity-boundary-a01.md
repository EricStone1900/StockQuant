# V1.1 Platform API身份边界审计 A01

日期：2026-10-09。范围：V1.1依赖的Platform API账户、场景、TestRun、恢复和证据读取/写入入口。

V1.1 Platform控制器已有`identity(cookie, testHeader)`校验。本次将校验落实为隔离HTTP行为证据：Harness在启动独立stage存储栈后，从控制器源码提取声明并确认七个受保护操作均在探针清单中；每个操作分别使用匿名请求与测试开关允许的伪造用户Header探测。7/7匿名请求返回401，7/7伪造用户请求返回403。拒绝响应在数据库业务访问之前发生；栈仅使用模拟账户和FakeBroker。

探测路由：

| 方法 | 路由 | 匿名 | 伪造用户 |
|---|---|---:|---:|
| GET | `/api/v1/accounts/:accountId` | 401 | 403 |
| POST | `/api/v1/acceptance/runs/:testRunId/accounts/us` | 401 | 403 |
| GET | `/api/v1/acceptance/v1/v1.1/scenarios` | 401 | 403 |
| POST | `/api/v1/acceptance/v1/v1.1/runs` | 401 | 403 |
| GET | `/api/v1/acceptance/runs/:testRunId` | 401 | 403 |
| POST | `/api/v1/acceptance/runs/:testRunId/continue-recovery` | 401 | 403 |
| GET | `/api/v1/acceptance/runs/:testRunId/evidence` | 401 | 403 |

完整`pnpm test:integration:v11-stage-storage`退出0：V1.1 code suite通过，Chromium normal/rejection/recovery三场景3/3通过，同Run CLI只读核验与三份结构化证据导出完成。隔离项目容器、卷、网络及专属镜像清理已核验。[完整日志](./2026-10-09-v11-platform-identity-code-suite-a01.log)，SHA-256 `158c9ae26888c10c578e8a695651f90470b068480d53d5d41a38765c19ac58b7`。新增Run ID：`56d064df-3e8b-43ac-8be1-45d05ac3a688`、`7c769c7e-d407-493b-a183-6e596511b40d`、`ed7bca91-af16-4dc9-877b-28f0eb469fa8`；人工结论均为`NOT_RUN`。

该结果关闭V1.1 Platform用户身份负向探测子项。它不代表活动存储切换/回退、生产身份提供方、V1.1人工验收或V1版本门禁通过。

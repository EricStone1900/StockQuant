# V1.3 L10 持久用户会话撤销（2026-10-07）

Platform 本地单用户开发会话现在由`platform_local_sessions`持久化。服务为每次会话签发256位随机Token，PostgreSQL仅存SHA-256摘要、owner、创建/到期/撤销时间；Token有效期12小时。所有带`sq_session` Cookie的请求都先经Platform入口校验撤销及过期状态，logout写入`revoked_at`并清除HttpOnly Cookie。数据库不可用时身份检查失败关闭为503。显式隔离测试身份兼容配置只用于测试，不改变正常会话签发路径。

正式`pnpm test:e2e -- --stage V1.3`隔离容器栈矩阵15/15通过，项目`sq-v13-web-e2a13b15514a17ad756a`及容器、卷、网络清理已核实。L10 Run `15735b58-1282-47ad-91ad-026cdd367aa7`导出[`evidence.json`](../local/V1.3/15735b58-1282-47ad-91ad-026cdd367aa7/evidence.json)，其中StageRun继续如实为`WAITING/NOT_RUN`。测试顺序为有效会话读同Run 200、logout 204、重启随机项目中的Platform API、服务恢复后用原Token直接重放同一Run返回401、浏览器无Cookie请求返回401。该次TestRun没有创建交易或改变账本。

这证明注销状态持久跨Platform进程重启，且token不会以明文落库。12小时到期使用数据库时间由每次请求查询强制；在本E2E中没有等待12小时或直接改写时间来伪造过期结果。仍需覆盖跨V1五阶段的会话工作流和人工验收；OD-004保持PARTIAL，L10/P3其他权限与重复/后台恢复项继续开放。

验证：Platform API typecheck、Web typecheck、Platform 215项单测通过；官方V1.3隔离Web/API/CLI E2E 15/15通过。此前普通沙箱的完整code suite首跑因Quant Worker随机loopback bind得到`EPERM`；受控loopback权限下相同V1.3 code suite通过，含Python Worker 14项测试。首轮失败保留，没有跳过测试。

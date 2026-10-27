# V1.3-S2-L15 事件顺序与恢复当前树复核 A01

日期：2026-10-12。需求：V1.3-S2-L15，订单状态、重复/乱序FakeBroker事件、幂等与固定故障序列。

## 执行结果

- `pnpm --filter @stockquant/trade-execution-service exec vitest run tests/unit/fake-broker-event-sequencer.spec.ts`：1个文件、3/3测试通过。覆盖乱序取消缓冲至前置Fill、序列缺口不推进、同事件重放幂等、冲突事实/非法/过期序列拒绝。
- `pnpm --filter @stockquant/trade-execution-service test:p5-7`：构建Trade与Portfolio成功；隔离PostgreSQL HTTP恢复场景PASS。测试先提交Portfolio Fill并模拟响应丢失，随后重启Trade/重试Outbox；确认租约接管、旧Ack/failure fencing、UNKNOWN预留、FakeBroker提交后的Partial Fill/Cancel顺序缓冲跨Trade重启保留、序列补齐后原单终态CANCELLED、账本精确入账及重复事件不重复入账。命令最终exit 0，Harness确认随机PostgreSQL容器和网络已移除，活动服务未连接。
- 隔离运行TestRun ID：`e2056935-7de6-40a5-84a1-0625b1c89b0a`；namespace：`p57-outbox-http/c47b855c-4766-4b69-b84f-554a89c892c1`；order ID：`27941082-203a-41cd-bebe-1c71688e5c01`；Portfolio Account ID：`95ae1511-4c1c-4262-8e61-9452691d3790`。Fill/cancel最终报告数量75、现金`8230.4780`、Reservation `RELEASED`，Portfolio Fill行数2，FakeBroker与Portfolio报告匹配。临时PostgreSQL镜像为已锁定`sha256:9e9764474d0c70ceff17378a6eca55b00c98d2f4d564be06a8e82f2431b3caa2`。

## 语义边界

这次当前树复验确认固定的事件序列器语义及一条隔离Trade→Portfolio持久化故障路径。它不证明所有订单状态/所有授权路由、多故障组合或随机seed矩阵完整，也不替代V1.5 AUTO编排、全市场规则、正式Web同Run阶段矩阵、人工验收或Ubuntu验证。因此V1.3-S2-L15继续`OPEN`，P3与V1仍开放。首轮沙箱Docker套接字访问被系统权限拒绝，随后在受控本机通过同一隔离Harness完整复跑；拒绝没有触及Docker资源。

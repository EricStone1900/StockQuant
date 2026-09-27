# P6 可续传分钟 CSV 上传审计

日期：2026-09-25（Asia/Shanghai）  
状态：工程实现与自动化验证通过；不构成阶段人工验收。

## 已实现

- V2.2 登录页面对大于旧 JSON 请求上限的 CSV 使用 512 KiB 分块上传，最大 64 MiB、100,000 行；每个文件及分块均校验 SHA-256。
- 上传会话、分块、拥有者、状态、进度及导入结果写入 PostgreSQL。刷新/重启后可查询已保存分块并仅续传缺失块；owner 隔离、同块幂等、冲突拒绝、两个活动上传/128 MiB预留配额、取消释放配额均有覆盖。
- 完整内容通过 SHA 校验后预览并最终导入现有分钟持久仓储，源/许可/映射语义沿用现有Manifest。完成后删除分块内容，只保留完成记录与结果。
- 小文件兼容原有预览/导入流程。匿名调用仍由平台会话认证拒绝；市场数据服务上传路由使用平台注入的用户身份头。

## 验证证据

- `pnpm --filter @stockquant/market-data-service minute-upload:http-restart-smoke`：PASS。独立 PostgreSQL 与两个独立服务进程；上传 848,055 字节、16,000 行 CSV（SHA-256 `8a1aa25c16e677629955cefc9f691d5282de1782cfe1b97a7a8ee074b68368b8`），首块后重启并恢复；缺块预览、错误拥有者、配额超限及完成后取消被拒；重复块幂等；取消释放配额；完成后再次重启仍读到完成结果。记录版本 `v2.2-import-c0afe5480e43`。临时数据库已按随机名称精确删除。
- `pnpm --filter @stockquant/web exec playwright test tests/e2e/v22-csv-upload.spec.ts`：2/2 PASS，小文件预览/发布与大文件上传中断、页面刷新、只重传缺块。
- `pnpm --filter @stockquant/platform-api-service v22:upload-web-http-smoke`：PASS。真实Chromium经Vite→平台API→市场数据服务，用TestRun `a1cda551-481a-4b9b-a1fd-195dc163d4a1` 验证 normal，再以页面按钮为上传创建独立`uploaded-csv` TestRun `73bda7cf-9f55-4401-863c-dc0fc74261c5`，断言`V2.2-CSV-UPLOAD-001=PASS`，绑定uploadId、importId、DataVersion、SHA-256、16,000行和许可用途标记。上传ID `c8148792-e861-499a-8435-948dc1bcd43b`，SHA-256 `08033829c37803a619c9d0e8a501a3dae858fafaf7e69dc42b7cfc6b7665b049`；页面结果与隔离PostgreSQL导入行一致。CLI执行同一TestRun `--check-only`退出0，执行前后TestRun行数相等；异主TestRun与上传读取均403。运行模式FAKE，测试后删除两套随机隔离数据库。
- `pnpm verify:stage -- --stage V2.2 --suite code`：退出码0。包含全仓Build、lint/typecheck、单元测试、合同/Fixture校验、Python适配器（55项）、运维脚本（94项，其中新增缺失/非法uploadId CLI拒绝测试）、市场数据PostgreSQL集成（21项）及其他已配置集成检查。
- `pnpm contracts:check`：PASS；73 JSON、41 schemas、24 fixtures、30兼容规则；V2.2 OpenAPI 为10个操作，包含TestRun创建/读取。

## 限制与未验收项

最终CSV解析仍将最多64 MiB内容装入服务进程内存，不属于端到端流式解析；暂不提供Parquet、日期物理分区、对象存储/生命周期管理。`uploaded-csv`场景绑定已经发布的分块CSV及其owner、导入ID、DataVersion、SHA和行数，Web与CLI check-only同run已验证；原normal/rejection/recovery固定Fixture场景仍保持独立。64 MiB仅是受限本机路径的工程上限，不证明生产并发或容量。

自动测试不更改 `docs/prd/v2-data-and-replay/02-minute-data-import.md` 中既有人工签署；V2.2/V2.5阶段验收继续按其记录状态处理。

# ADR-0005 共享数据采集边界与来源能力状态

状态：Proposed；日期：2026-09-12。关联：[共享数据采集计划](../prd/v2-data-and-replay/06-shared-data-collection-plan.md)。

## 背景

StockQuant 需要先集中交付一个可供多个项目使用的每日分钟数据采集模块。仓库当前市场数据服务入口是 TypeScript，现有 BaoStock/TDX 分钟脚本是独立 Python 命令。历史分钟读取能力不能直接推出盘中持续更新能力，主备切换也必须保留来源和质量证据。

## 决策

1. `market-data-service` 继续拥有证券、交易日历、数据质量、DataVersion、Artifact 和采集任务事实；不新增重复的数据领域服务。
2. 定时采集 Worker 与 API 解耦。Worker 可以由服务独立进程/容器运行，Python 来源适配器拥有独立锁定环境；它通过版本化契约向 TypeScript 服务提交任务结果，不把临时 Python 环境或供应商 SDK 放进 TypeScript domain。
3. BaoStock 与新浪的能力分别记录。只有字段、单位、时间戳、质量、来源许可及实时可用性均满足订阅要求，适配器才可将结果发布为可消费版本。历史 PASS 不代表盘中 PASS，也不代表60日覆盖 PASS。
4. 采集任务按订阅和窗口幂等，使用持久状态、检查点、租约和 fencing token。原始响应与规范 Artifact 先校验后发布；API/Web 不直写数据文件或数据库。
5. 先实现 A 股5分钟和固定20只证券；其他项目通过授权 API/导出复用不可变 DataVersion，不能直连数据库或改变 StockQuant 在线监控100只上限。

## 影响与替代方案

该边界保留现有 TS 服务并允许 Python 适配器渐进迁移，减少一次性重写；代价是需要生成跨语言契约和独立依赖锁。把全部采集逻辑塞进现有 `main.ts` 会继续依赖内存状态，无法满足进程重启和多项目共享，因此不采用。单独新建微服务会重复数据所有权，本阶段不采用。

## 验证

- `packages/contracts/schemas/market-data/collection-subscription.schema.json`
- `packages/contracts/schemas/market-data/collection-run.schema.json`
- `packages/contracts/schemas/market-data/provider-capability.schema.json`
- `fixtures/v2/data-collection/collection-plan-v1.json`
- DC-00探针：`pnpm v25:probe-minute-sources -- --codes sh.600000,sz.000001,sh.600519 --start-date 2024-01-02 --end-date 2024-01-10 --timeout-seconds 15`
- DC-00实测证据：[dc00来源能力记录](../evidence-data-collection-dc00.md)

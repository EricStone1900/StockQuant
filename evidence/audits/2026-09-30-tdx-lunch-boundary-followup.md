# 2026-09-30 TDX 午休边界只读复核

状态：当日晚间历史窗口复核 PASS；原上午与收盘定时观察仍为 PARTIAL。TDX 保持候选来源，O1b 的两个实际交易日定时路径门禁尚未满足。

## 事实与时间线（Asia/Shanghai）

| 时间 | 查询与服务器 | 结果 |
|---|---|---|
| 11:46:26 | 上午诊断，`121.37.207.165` | 20只各收到24行，但每只缺11:30、多13:00；探针PARTIAL、adapterExitCode 0。诊断列表还显示同次响应中9月29日有11:30和13:05。 |
| 15:23:37 | 收盘定时探针，`121.37.207.165` | 20只各收到48行，其中47行落在预期时间网格；每只缺11:30、多13:00。外层退出码2、adapterExitCode 0、stderr空。 |
| 18:28:06 | 固定服务器、固定20只、单次160根/证券的协议记录诊断 | 20/20返回；解压响应体Hash、边界原始36字节记录、协议ymd/time_num、OHLCV/成交额和当日48个时间标签已保留。20只均有11:30，午后首根为13:05；没有13:00。 |
| 18:30:00 | 正式`v25:probe-tdx`固定20只/当天/完整会话只读复核，`121.37.207.165` | PASS，960/960根；每只48根，missing/duplicates/unexpected/invalid均空。外层退出码0、adapterExitCode 0、stderr空。 |

普通沙箱的首次协议诊断因 `TdxConnectionError` / `EPERM` 退出2，错误原样保留；同一固定服务器和证券集的受控网络复测成功。原上午和收盘文件未覆盖，SHA-256分别为 `8f26724f9107fc7dde45d415da8a765f551247bf38d4fb8d9ef1b3b8942ab489` 与 `d1d316ee5a31d8fcf0b361010eafba46b3a6124530f0f266bba79e066bce4b98`。

## 边界对照与结论

协议记录中的 `time_num` 对应11:25为41100、11:30为41400、13:05为47100。18:28解压响应中20只均为正常时间网格，正式适配器随后也得到相同的完整性结论。对存量Sina采集的11:30行作只读对照：20只都有Sina行；TDX与Sina的OHLC按分价取整后16只一致，成交量10只完全一致，两者同时一致8只。例：`600000.SH`的11:30两源OHLC均为9.44/9.45/9.43/9.44、成交量均为1,482,200；Sina成交额13,992,326.4507，TDX协议浮点数13,992,327。其他证券存在源间量价差异，不能把Sina行当作所有证券的精确TDX真值。

同一服务器在不同时刻返回的9月30日时间标签不同，且原收盘适配器保留上游标签；这支持上游响应随时间修订的判断。原上午/收盘归档只留有时间摘要，没有当时的原始36字节记录和量价，因此无法证明早先的13:00记录是否就是11:30。当前没有证据支持将13:00硬改为11:30或全体时间偏移5分钟。现有完整性校验正确阻止早先两次PARTIAL被当作成功；本次无需修改正式归一化规则。

## 证据与验证

- 普通沙箱失败：[`tdx-boundary-raw-diagnostic.json`](../dc08a/dc-t19/2026-09-30/tdx-boundary-raw-diagnostic.json)，SHA-256 `626228cfe5f605cd51b48e7585fc2bef4bee43e29297e8cdd81e315862fbc20a`。
- 受控只读协议诊断：[`tdx-boundary-raw-diagnostic-controlled.json`](../dc08a/dc-t19/2026-09-30/tdx-boundary-raw-diagnostic-controlled.json)，SHA-256 `bd80244a8d749fe7e9bab7fa97814b13e848a0f7543bbc77ee7c6f9e9df297e4`。只保留午休邻近记录的原始字节与整份响应Hash，不保留完整响应体。
- 正式只读探针复核：[`tdx-shadow-pm-boundary-recheck.json`](../dc08a/dc-t19/2026-09-30/tdx-shadow-pm-boundary-recheck.json)，SHA-256 `91bcc47f3be12c810e72d52db26b961b96e0df63c399868b8fa6b50d1cd3ed1a`，结果Hash `917b0a12be91100ac2520d76285b40f8e30c6030663686ae8a4c6ddfe29d599f`。
- 定向测试：`services/market-data-adapter/.venv/bin/python -m pytest services/market-data-adapter/tests/test_tdx_boundary_diagnostic.py services/market-data-adapter/tests/test_probe_tdx_script.py services/market-data-adapter/tests/test_providers.py -q`，39项PASS。新测试用合成协议字节证明诊断器原样保留13:00及其成交量。

本次未创建采集运行、未写业务数据库、未发布Artifact、未修改正式来源配置。后续需由新的实际交易日自动任务验证上午/收盘窗口，保留PARTIAL与后续PASS的独立时间线；来源许可与O1b两日门禁仍按原计划审查。

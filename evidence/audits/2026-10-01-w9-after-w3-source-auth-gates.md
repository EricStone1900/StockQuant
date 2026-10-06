# W9 门禁与证据引用复核（W3 来源门禁后）

日期：2026-10-01（Asia/Shanghai）。本复核只运行只读版本与证据门禁，不修改阶段签署或业务状态。

- `pnpm verify:version:evidence -- --version V1`：PASS；34条引用、3个Manifest、4个Manifest载荷项，missing/failures均0。
- `pnpm verify:version:evidence -- --version V2`：PASS；138条引用、19个Manifest、20个载荷项，missing/failures均0。
- `pnpm verify:version:evidence -- --version V3`：PASS；122条引用、22个Manifest、23个载荷项，missing/failures均0。
- `pnpm verify:version -- --version V1/V2/V3`分别退出2并返回INCOMPLETE；Acceptance缺失/意外ID均0。V1.1仍PARTIALLY_IMPLEMENTED；V2.3/V2.4/V2.5仍PARTIALLY_IMPLEMENTED；V3.1–V3.4仍NOT_RUN。

此状态与用户确认的`NO_TRADE`、无来源授权一致；OD-008及O1/O2观察仍未关闭。引用完整性PASS只证明本地引用和列出的Manifest载荷可解析，不证明运行、来源许可、部署、观察或人工验收。

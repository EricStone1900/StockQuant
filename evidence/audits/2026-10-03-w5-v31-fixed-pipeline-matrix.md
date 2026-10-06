# W5 V3.1 fixed Fixture pipeline and Runner failure matrix — 2026-10-03

The deterministic offline pipeline and all five failure/recovery modes passed against pinned Runner image `sha256:8cd6db4ae88cab7a1fb485613a67fb15a4d4e08460c28deb81510c1fa1861dfb`. The normal run completed the fixture-generated code, verified output Artifact hash/metrics, and settled the fixed 23-cent budget. Failure exit, timeout, bounded OOM, outbound-network denial, and cancellation each reached the expected terminal state, published no output Artifact, and settled the known Fixture cost exactly once. Cancellation also fenced the worker and refused late output publication.

Every run used a unique disposable database and temporary artifact directory; read-only post-check found no `stockquant_pipeline_*` database or matching temporary container, and the 13 pre-existing StockQuant containers remained running. `activeServicesTouched=false`; external model/provider, market-data, Paper and Broker calls were zero.

This is offline engineering evidence only. It does not constitute real RD-Agent/Provider execution, business acceptance, user acceptance, Ubuntu validation, or permission to enable data/model calls.

- Case output: [2026-10-03-w5-v31-fixed-pipeline-matrix.log](./2026-10-03-w5-v31-fixed-pipeline-matrix.log), SHA-256 `ca27e2db52d6dcf887efbaddfc86938946e209723554163d64a7a381d3631ba9`.
- Machine report: [2026-10-03-w5-v31-fixed-pipeline-matrix.json](./2026-10-03-w5-v31-fixed-pipeline-matrix.json).
- Source hash manifest: [2026-10-03-w5-v31-fixed-pipeline-matrix.sources.sha256](./2026-10-03-w5-v31-fixed-pipeline-matrix.sources.sha256).

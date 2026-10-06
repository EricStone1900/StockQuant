# W5 V3.1 offline code-suite rerun — 2026-10-03

The current-worktree V3.1 code suite exited 0. Research Automation passed 203/203 unit tests and 28/28 isolated PostgreSQL integration tests; Platform API passed typecheck and 169/169 unit tests; Web typecheck passed. Contract validation checked 223 JSON files, 153 schemas and 39 fixtures with zero failures; all 25 registered generated clients passed drift checking. The 66,100-row queue-capacity engineering probe passed.

The pinned RD-Agent/LiteLLM runtime completed chat and embedding calls against a deterministic Fixture over a Docker `--internal` network. Both budget rows settled with the expected usage. No external Provider, market-data, Paper or Broker calls occurred, and active services were untouched. The isolated artifact-owner scope smoke passed with TestRun `6e01d000-38e9-431d-b2c7-e6e586e1d3af`.

This closes an offline engineering regression only. It does not close W5 real Provider/RD-Agent execution, business or human acceptance, Ubuntu, authorized data observation, or downstream W6/W7 business gates. The model preflight and overall V3.1 stage remain blocked/NOT_RUN under the confirmed no-source/no-provider authorization.

- Full console output: [2026-10-03-w5-v31-after-w8-suite.log](./2026-10-03-w5-v31-after-w8-suite.log), SHA-256 `6483e654823636a4156db8fd06340ecc97dbf1c85f2dff4768fcdd2e99e5b948`.
- Machine report: [2026-10-03-w5-v31-after-w8-suite.json](./2026-10-03-w5-v31-after-w8-suite.json).
- Input file hashes: [2026-10-03-w5-v31-after-w8-suite.sources.sha256](./2026-10-03-w5-v31-after-w8-suite.sources.sha256).

# W5 restricted Provider fetch transport

Date: 2026-10-02 (Asia/Shanghai)

Research Automation now has a fetch-compatible transport for the two frozen HTTPS Provider endpoints. It requires an internal HTTP proxy URL and a distinct proxy token, accepts only the exact DeepSeek chat and SiliconFlow embedding endpoints with POST, opens authenticated CONNECT to the exact provider hostname on port 443, and completes TLS with hostname verification. The transport rejects unsupported URL/method, redirect-following mode, malformed proxy configuration, and missing/short proxy credentials. It buffers responses up to 16 MiB and propagates request cancellation. The Provider adapters continue to require an explicitly injected transport; they have no global-fetch fallback.

The local integration test starts a loopback fake proxy and verifies the precise authenticated CONNECT authority; the fake proxy returns 407, so no TLS connection or public endpoint is attempted. An unsupported URL is rejected before a proxy connection. No Provider credential or external DNS/socket was used.

Validation: Research Automation unit tests PASS (36 files / 200 tests), TypeScript build PASS, and `pnpm docs:check` PASS (2,720 local Markdown links). Loopback tests required the same controlled local-bind permission used by the existing proxy tests.

Limits: this transport is not yet instantiated by the Research Automation runtime; current gateway preflight remains BLOCKED and `modelCalls=NOT_RUN`. Invoice-grade usage/cost reconciliation and deployed DNS/network egress enforcement remain absent. This does not authorize calls, prove RD-Agent completion, or close W5/V3.1.

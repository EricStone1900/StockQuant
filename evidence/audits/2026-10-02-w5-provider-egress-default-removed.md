# W5 Provider transport fail-closed adjustment

Date: 2026-10-02 (Asia/Shanghai)

The DeepSeek and SiliconFlow production transport adapters no longer default to Node's global `fetch`. Construction now requires an explicitly supplied transport and rejects a missing transport, so accidental instantiation cannot silently make an unrestricted direct connection. Provider requests remain fixed-host, non-redirecting. Unit coverage verifies the missing-transport case for both adapters.

Validation: the two provider adapter test files passed (10 tests); Research Automation TypeScript lint/typecheck passed. The broad package test command first encountered three `listen EPERM` failures in `restricted-egress-proxy.spec.ts` under the sandbox. The same package suite then passed in a controlled rerun allowing local loopback binds: 35 files and 198 tests. No network/provider call was made. This adjustment does not provide or verify a proxy-backed transport, does not connect the adapters to the RD-Agent runtime, does not establish invoice reconciliation or enforced deployment egress, and does not authorize Provider calls. W5 and V3.1 remain incomplete.

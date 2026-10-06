# W5 restricted Provider egress proxy primitives

Date: 2026-10-02 (Asia/Shanghai)

## Change

Research Automation now contains an optional CONNECT proxy entry point intended for the future isolated Provider egress path. It accepts only exact approved Provider hostnames on port 443, requires proxy authentication, resolves IPv4 once, rejects the request if any returned address is special-use/non-public, and opens the tunnel to the checked IP rather than resolving again. The connector receives neither the original hostname as a new lookup nor arbitrary caller-supplied ports. The proxy emits no target, credentials, request body, or response body to logs. IPv6-only Provider DNS is intentionally unsupported by this first implementation and fails closed.

The runtime entry point is `pnpm --filter @stockquant/research-automation-service egress:proxy`, with the allowlist and token supplied by environment. It is not enabled by Compose and no Provider adapter uses it yet.

## Verification

- `pnpm --filter @stockquant/research-automation-service build`: PASS.
- `pnpm --filter @stockquant/research-automation-service lint`: PASS.
- `pnpm --filter @stockquant/research-automation-service test`: PASS, 34 files / 189 tests.
- Five focused proxy tests cover exact hostname/port matching, reserved IP rejection, unauthenticated and unapproved requests, DNS-to-IP pinning through a local echo tunnel, and mixed public/private DNS answer rejection. Tests used fake DNS answers and loopback only; no public endpoint was contacted.
- Read-only runtime inspection found the active Compose network `stockquant-v12_internal` has `Internal=false` and driver `bridge`. The active Research Automation container reports `STOCKQUANT_MODEL_GATEWAY_MODE=NOT_CONFIGURED`; the explicit provider authorization variable is absent, so application configuration defaults it to false. No service was restarted or modified.

## Limits

This is a tested proxy component, not enforced egress isolation. Research Automation still has a direct route on the current Compose bridge until the service is moved to an internal-only backplane and provider calls are wired through the proxy. Provider adapters are not connected to runtime, invoice-grade reconciliation is absent, and no Provider/model call was made. W5/V3.1 remains incomplete and the model gateway remains disabled.

## Compose topology follow-up (2026-10-02)

The working-tree Compose file now defines `research-backplane` as `internal: true`. Research Automation joins only this backplane; Platform API, Quant Research, and PostgreSQL join both the existing `internal` network and research backplane. The optional `research-egress-proxy` service is behind the `research-egress` profile and joins the backplane plus a separate externally routed `research-egress` network. This topology gives Research Automation no direct external route when this Compose configuration is deployed, while the proxy can reach it from its second network.

- `docker compose -f infra/compose/docker-compose.yml config --quiet`: PASS.
- Same command with `--profile research-egress`: PASS.
- Temporary isolated Docker network canary: direct path from an internal-only client to an egress-only target was blocked; dual-network proxy path reached the local canary. No public endpoint was contacted. Temporary containers and networks were removed; post-check found none with the experiment project label.
- No active project was restarted or changed. The running stack still uses its prior bridge topology. Compose topology is source-level only until this Compose configuration is deployed and runtime-checked.

Provider clients still do not use the proxy, so provider operation is not yet available through this path. Authentication/cost reconciliation and model authorization remain incomplete. No provider call was made; NO_TRADE and no market-source authorization remain in force.

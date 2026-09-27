# Platform API service token configuration audit

## Change

Platform API calls to Research Automation now use the canonical Platform API identity, `STOCKQUANT_SERVICE_TOKEN_PLATFORM_API`. The duplicate `STOCKQUANT_RESEARCH_AUTOMATION_TOKEN` configuration was removed from Compose and the example environment, and the V3.1 HTTP smoke now configures only the canonical token. The matching `x-stockquant-service-id` remains consistency metadata; authentication is enforced by the Bearer token.

The reverse direction remains separate: Research Automation authenticates to Platform API with `STOCKQUANT_SERVICE_TOKEN_RESEARCH_AUTOMATION`. This is the independently provisioned identity of the calling service, not a duplicate of the Platform API token.

## Verification

- `pnpm --filter @stockquant/platform-api-service test`: PASS, 20 files / 65 tests. The new `platform-service-identity.spec.ts` constructs the actual `PlatformContainer`, gives the obsolete alias a conflicting value, and verifies that the outbound Authorization header uses only the canonical Platform API token.
- `pnpm --filter @stockquant/platform-api-service v31:artifact-owner-scope-http-smoke`: PASS. TestRun `590643bc-795a-4ba9-8ff0-216a5f53b41e`; authorized read 200, missing identity 401, foreign owner 403, unlisted artifact 404, anonymous gate 401, wrong token 403, synthetic acceptance and identical replay succeeded, changed-note replay returned 409. The script reported `activeServicesTouched: false`.
- Initial sandboxed attempt could not open loopback PostgreSQL (`EPERM`); the approved local rerun completed the same smoke successfully.
- `pnpm baseline:check`: PASS (823 Markdown links, 120 JSON files, 69 schemas, 34 Fixtures, 56 compatibility rules, 11 OpenAPI groups); `git diff --check`: PASS.

## Limits

No active service was restarted or redeployed, and no active secret was rotated. Deployment, secret rotation, and resulting live-service verification remain pending; this configuration cleanup does not close OD-004 or change business acceptance status.

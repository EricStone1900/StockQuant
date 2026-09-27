# V3.4 local preflight command entry

## Change

- `pnpm verify:stage -- --stage V3.4 --scenario normal|rejection|recovery` now reads the three version gates via `verify:version` and emits a structured prerequisite report. With current source evidence it reports all three versions `INCOMPLETE`, Ubuntu target `NOT_VERIFIED`, V3.4 workflow `NOT_IMPLEMENTED`, Paper observation and human acceptance `NOT_RUN`; exits 2, creates no TestRun and performs no network calls.
- `pnpm verify:stage -- --stage V3.4 --suite code` runs repository baseline, build, lint, typecheck, workspace unit tests and dedicated CLI contract tests. A successful local code preflight is explicitly distinct from V3.4 acceptance, full-stage E2E, Ubuntu validation and Paper observation.
- `--run ... --check-only` and Web/E2E V3.4 flows remain unsupported until a business TestRun API and page exist; the CLI says so instead of implying a runnable end-to-end flow.

## Verification

- Scenario CLI contract tests: 4/4 passed. It forces an unreachable Platform URL and proves the readiness result needs no HTTP request; invalid scenario exits 2.
- Local preflight commands passed: `pnpm baseline:check` (836 Markdown links, 125 JSON files, 73 schemas, 34 fixtures, 60 compatibility rules, 12 OpenAPI groups), `pnpm build`, `pnpm lint`, `pnpm typecheck`, and `pnpm test` (workspace service/Web unit suites; Qlib Worker Python 12 tests included).
- The first `pnpm test` attempt was blocked when the sandbox denied Qlib Worker's loopback bind (`EPERM`); the same complete local suite passed in the approved isolated local environment.
- The version prerequisites remain INCOMPLETE; no Ubuntu host, production deployment, business TestRun, external model call, observation day or human sign-off is claimed.

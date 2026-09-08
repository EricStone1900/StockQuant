# Repository Guidelines

## Project Structure & Module Organization

StockQuant is a personal A-share/US-stock quantitative trading platform. The initial repository baseline is documentation-first; inspect the actual files, scripts, lockfiles and Git status before assuming implementation exists or is missing. Update repository guidance when scaffolding changes this baseline. Preserve unrelated user changes and untracked files.

Start with [the PRD entry](docs/prd/README.md) and [the three-version delivery rules](docs/prd/05-three-version-delivery.md), then read the product requirements, architecture and market contracts. Before cross-service or environment changes, also read [the ADR index](docs/decisions/README.md), [the open-decision register](docs/decisions/open-decisions.md) and [the security/configuration design](architecture/05-security-and-configuration.md). Read the current version's `00-version-plan.md`, assigned stage file, `90-test-plan.md` and `99-acceptance.md` before implementation. Keep requirements, contracts, ADRs, `01-feature-traceability.md`, tests and acceptance records aligned when requirements change.

The monorepo baseline places the console in `apps/web/`, domain services in `services/`, canonical schemas and generated contracts in `packages/contracts/`, infrastructure in `infra/`, shared tests in `tests/`, and deterministic inputs in `fixtures/`. Organize services into `domain/application/ports/adapters/bootstrap`; keep framework and broker SDK dependencies outside domain code. Do not scaffold all services at once: create only the current vertical slice and record missing capabilities honestly.

## Current Delivery Scope

- [V1](docs/prd/v1-local-simulation/README.md): five stages for small-data Qlib, a dual-market Fixture trading loop, Web acceptance, daily backtesting and recovery.
- [V2](docs/prd/v2-data-and-replay/README.md): five stages for free data/news, historical minute imports/replay, continuous Paper and data scaling.
- [V3](docs/prd/v3-research-and-ubuntu/README.md): four stages for real RD-Agent experiments, independent validation/manual promotion, research scaling and Ubuntu delivery.

For this development round, the three-version rules and stage documents govern sequencing, scope, sampling and acceptance; the original architecture and correctness rules remain applicable. Original D0–D7/R0–R3 describe the long-term roadmap, not automatic authorization to implement LIVE trading or all optional enhancements.

All three versions use the project's own FakeBroker, simulated accounts, orders and fills. Do not connect to real brokers, including read-only or broker-hosted paper APIs. Reject LIVE writes and real-broker configuration server-side. A-share real data is the primary path; preserve the US Fixture loop and explicitly record unverified US real-data capabilities.

Work within the assigned stage and its necessary prerequisites. Independent follow-on work may proceed when in scope, but never mark an unaccepted prerequisite as passed. If the requested stage is genuinely ambiguous, resolve it from existing plans and evidence before requesting clarification.

## Stage Workflow and Web Acceptance

Develop each stage as a vertical slice: contracts and fixed scenarios, backend behavior, formal Web pages, acceptance-center scenarios, automated checks, then user acceptance. Deliver Web alongside the backend; do not defer it to the end of a version.

- Retain `/acceptance` as the shared stage/scenario/history entry. Formal pages and test pages call the same business APIs; the platform owns TestRun metadata, not domain ledgers or order facts.
- Cover normal, rejection and applicable repeat/recovery paths with concrete inputs, expected results and backend evidence. Long-running jobs survive closing or refreshing the browser.
- Web and CLI share versioned scenarios and independent assertions. Check the same Web `testRunId` through the CLI; `--check-only` must not initialize data, place orders, replay fills or call models.
- Update stage section 2 development checkboxes and section 7 delivery checkboxes as evidence becomes available. Do not pre-check tasks or infer completion from code existence.
- Before handoff, replace section 8's execution placeholders with verified directories, URLs, buttons, configuration names, Fixture paths/versions/hashes, actual test commands, expected outputs, timeouts and recovery steps. Execute the instructions and record evidence before changing `DRAFT_NOT_EXECUTABLE` to `VERIFIED_EXECUTABLE`.
- Runnable instructions, automated PASS and human acceptance are separate facts. Only mark the human checkbox or sign-off after the user's actual confirmation; never auto-sign it. Pending acceptance remains NOT_RUN even when implementation is ready.
- Hand off the actual Web URL, commands, fixed inputs, expected outcomes, evidence references and known limitations. Update the version's acceptance table; retain earlier failures and signatures as history.

## Architecture, Data and Experiment Constraints

Read [the architecture index](architecture/README.md), the shared architecture documents and the relevant `architecture/services/<service>.md` before changing a service. `architecture/` contains the overall design, all 12 service designs and Web/FakeBroker component designs. Keep it aligned with PRD contracts and stage scope; proposed tables/routes are S0 inputs, not proof of implementation. Preserve the standalone `docs/prd/` package and its internal links.

Inject a run-scoped Clock into business logic; do not read wall-clock time directly for strategy, authorization, orders or settlement. Infrastructure timeouts use a real monotonic clock. Historical replay uses deterministic event ordering, completion barriers and checkpoints; do not create a Temporal activity for every minute bar.

Reuse deterministic risk, authorization, execution and ledger rules across backtesting and Paper. Keep Qlib in the quant adapter and RD-Agent in the existing research-automation service with isolated execution. Candidate promotion requires independent recomputation and the user's approval of the exact version; research cannot activate strategies itself.

Start with frozen small datasets sufficient for lookback and training/validation/test windows. Clearly label Fixtures, recorded responses and real components; when claiming Qlib/RD-Agent/DB/NATS/Temporal validation, run that component. Small-data success does not prove full-scale capacity or strategy profitability.

Follow [the Fixture specification](fixtures/README.md). Every evidence-bearing dataset needs a versioned manifest, provenance/license, SHA-256, exact semantics and expected assertions. Changing a frozen input creates a new fixture version rather than overwriting evidence.

Online monitoring is limited to 100 unique securities, prioritizing holdings and in-flight orders. Default snapshot collection is every 30 minutes, configurable to 20; collection, daily-bar completion, strategy evaluation and execution windows are separate. Verify free-source capabilities before adoption, retain provenance/timestamps/revisions, and never fabricate minute OHLCV from sparse snapshots. Historical research universes remain independent of today's online watchlist. Keep SNAPSHOT, DAILY_BAR and MINUTE_BAR results distinct.

FakeBroker maintains independent persistent orders, fills and assets for reconciliation. Provide fixed failure scenarios plus seeded faults with the actual injected event sequence recorded. UNKNOWN requires querying the original order; never blindly resend or release resources solely on a timeout. Isolate each run's accounts, caches, events and artifacts.

## Mac M1 and Ubuntu Development

Prefer Linux ARM64 containers on Mac M1 after checking dependency support; use small samples and one compute worker initially. Record CPU/memory/disk limits and actual usage. Web hot reload may run natively, but stage validation must cover real container backends and a containerized Web build/run.

Pin Qlib/RD-Agent source commits, dependencies and image versions. Build native extensions inside the target Linux environment; never copy a macOS virtual environment or compiled libraries into Ubuntu. Separate controller and experiment environments when dependencies differ. Test the target Ubuntu architecture during development, record emulation explicitly, and require actual Ubuntu evidence for final migration acceptance.

Generated-code runners and the Web backend must not receive Docker sockets or controller secrets. Use the controlled research execution boundary described in the delivery rules. Persist and explicitly back up/restore databases and artifacts; shipping an image does not migrate volumes. Real model calls require configured credentials and a recorded budget; recorded responses cannot replace the real RD-Agent acceptance run.

## Build, Test, and Development Commands

Inspect existing scripts and locks first. Implement missing command contracts from `docs/prd/04-development-plan.md` and sections 8/10 of `docs/prd/05-three-version-delivery.md` before claiming these entry points work:

- `pnpm install --frozen-lockfile`: install locked Node dependencies once a lockfile exists.
- `pnpm lint`, `pnpm typecheck`, `pnpm test`: run quality, type, and unit checks.
- `pnpm test:integration`, `pnpm test:contract`, `pnpm test:e2e`: verify persistence, contracts, and complete workflows.
- `pnpm stack:up`, `pnpm seed:paper`, `pnpm verify:paper`: start infrastructure, initialize fixtures, and verify Paper execution.
- Within each Python service, use `uv sync --frozen`, `uv run ruff check .`, `uv run mypy src`, and `uv run pytest tests/unit` once configured.

Stage entry points must implement the documented parameters: `pnpm stack:up -- --stage V1.1`, `pnpm dev:web`, `pnpm verify:stage -- --stage V1.1 --scenario normal --seed 20260907` (also `rejection`/`recovery`), `--suite code`, `--run RUN_ID --check-only`, `pnpm test:e2e -- --stage V1.1`, `pnpm verify:version`, `pnpm verify:compat` and `pnpm evidence:export`. Replace the stage ID as appropriate; the delivery rules define the complete invocation contract.

Scenario/code/browser checks return 0 only when all required checks pass, 1 on failure, and 2 when prerequisites or required observation remain incomplete; preserve underlying exit codes. Empty suites, skipped required tests, missing scripts and merely receiving a job ID never count as success. The code suite must call real lint/type/domain/DB/contract checks and disclose commands, working directories, test files and reports. Use each Python service's own locked environment.

## Coding Style & Naming Conventions

Preserve numbered Markdown filenames and relative links. Inspect existing formatter configuration; when scaffolding without one, use two-space TypeScript indentation and four-space Python indentation, and include tool configuration in the change. Use kebab-case service directories matching the architecture. Generate TypeScript/Python contracts from schemas; keep database ownership within each domain service.

## Testing Guidelines

Use configured test frameworks; establish and document any missing framework or coverage policy during scaffolding. Pytest is the Python baseline. Use descriptive behavior-based test names. Cover both markets, rejection paths, idempotency, and recovery. Distinguish unit, fake-integration, real end-to-end, and release evidence. Record `NOT_RUN`, `PASS`, or `FAIL`; missing scripts never constitute a pass.

Verify money, quantities, rounding and uniqueness exactly; freeze tolerances for research floating-point comparisons before testing. Save the code/workspace hash, image and dependency versions, scenario/data/rule versions, seed/fault sequence, environment/architecture, testRunId/business IDs, commands/exit codes, assertions, screenshots and traces. Documentation checks do not change business acceptance status. Real-time observation and actual Ubuntu runs cannot be replaced by accelerated Fixtures or emulation.

## Commit & Pull Request Guidelines

Inspect actual history rather than assuming an empty repository. Use concise imperative messages, optionally scoped, such as `docs: clarify Paper acceptance criteria`. PRs should describe the behavior changed, link the version/stage and requirement/test IDs, report executed checks and omissions, and include screenshots for UI changes. Include updated tasks and acceptance evidence without claiming the user's sign-off prematurely.

## Security & Configuration

Keep credentials and real account details out of Git. Leave unconfirmed settings `UNSET` and LIVE writes disabled. Default tests and initialization must never place real orders.

Resetting a test creates a new isolated run by default. Cleanup must name exact, inactive test resources and preserve evidence; never delete shared volumes or reset ledgers to make tests pass. Infrastructure failure tests use bounded scripts or documented manual steps, not arbitrary Web shell/SQL access. Preserve and diagnose failures rather than retrying random seeds until green.

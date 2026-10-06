# W7 V3.3 two-round Fixture Runner dispatch

Date: 2026-10-06

## Implemented slice

The owner-scoped Platform dispatch route accepts only an explicitly confirmed normal/recovery TestRun that has the exact frozen, reserved, two-round Fixture Experiment. It makes one deterministic local Fixture Gateway request per round using stable TestRun-bound model run IDs, verifies the 23-cent settled response, publishes a content-addressed Runner input Artifact, and submits round-indexed Runner Jobs with fixed resources and `networkPolicy=DENY`. Platform persists each round's IDs, input hash, and cost into the same StageRun history so a retry can resume from a completed round. Missing or malformed `STOCKQUANT_V33_FIXTURE_RUNNER_IMAGE_DIGEST` fails closed.

Web and CLI expose separate explicit confirmations for Experiment reservation and dispatch. Readiness-only cancellation remains unavailable after reservation or dispatch. The CLI remains exit 2 because the TestRun is RUNNING and required acceptance assertions are still NOT_RUN.

## Verification

- `pnpm verify:stage -- --stage V3.3 --suite code`: exit 0. The run includes baseline/contracts, Research Automation 217 unit tests and 30 PostgreSQL integration tests, queue/budget HTTP smokes, 66,100-row isolated pagination probe, isolated two-round Runner Host recovery, CLI same-TestRun test, Platform 192 unit tests and 8 PostgreSQL integration tests, and Web E2E 3/3.
- Focused Platform dispatch test: normal flow records both round IDs, fixed image digest, 23-cent Fixture settlements, zero external model calls, and idempotent replay without duplicate requests.
- Web E2E exercises the explicit reservation and dispatch controls against mocked business endpoints. It proves the page submits and reads the same TestRun; it is not cross-service runtime evidence.
- `pnpm --filter @stockquant/platform-api-service typecheck`, `pnpm --filter @stockquant/web typecheck`, both service builds, `pnpm contracts:check`, and `git diff --check` passed.
- `pnpm baseline:check` passed. V3 evidence integrity is PASS with no missing evidence or hash failures; five older execution SHA manifests are explicitly labeled historical and retained without comparing those point-in-time source hashes to today's worktree. The formal V3 version gate remains INCOMPLETE/exit 2 with all four V3 stages NOT_RUN, as required by the real acceptance/sign-off gates.
- No external model Provider, market data, Paper, or Broker calls were made. No active service or shared business ledger was touched.

## Limits and next work

The Platform dispatch controller's real HTTP/PostgreSQL composition with Research Automation was not exercised as one integrated request. The route only enqueues Runner Jobs; it does not poll them, reconcile outputs, publish final round/workflow results, settle the Experiment aggregate, or complete the TestRun. Recovery fault orchestration, rejection-with-existing-commitments, independently recomputed assertions/export, measured Paper coexistence, Ubuntu acceptance, and human acceptance remain open. The Web test mocks the dispatch API, and the standalone Runner Host smoke is separate evidence. V3.3 remains `NOT_RUN`; O1/O2 remains NO_TRADE without source authorization.

The first full-suite pass attempt failed because existing E2E assertions expected stale status labels (`PERSISTED_WAITING_ONLY` and `NOT_IMPLEMENTED`) after the UI correctly began exposing partial dispatch progress. The labels were updated; the final full suite passed. An initial sandbox attempt also failed to bind loopback with `EPERM`; the successful final suite ran with controlled local loopback access. See the separate failure note.

To preserve those historical execution records without falsely rebinding their hashes to later code, the version evidence verifier now treats only SHA links explicitly labeled `历史执行快照` / `历史源码快照` (or `historical execution snapshot`) as retained history: it verifies the linked manifest file exists, but does not compare its old source entries with the current checkout. Active/current SHA manifests are still fully checked. Dedicated tests cover both behaviors.

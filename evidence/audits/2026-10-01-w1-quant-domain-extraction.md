# W1 Quant Research layer migration increments

Date: 2026-10-02. Scope: pure-rule extraction, candidate-registration application/port/adapter, Qlib worker application/port/adapter, and PostgreSQL schema ownership extraction.

Pure candidate-registration, canonical JSON, independent validation report, PromotionRequest parsing/fingerprinting, validation submission parsing/fingerprinting, promotion decision rules and deterministic V3.2 fixture recomputation modules live under `services/quant-research-service/src/domain/`. Root re-export files remain for compatibility; runtime routes import domain modules directly.

Candidate registration now runs through `CandidateRegistrationService` in application, with `CandidateRegistrationRepository` port and `PostgresCandidateRegistrationRepository` adapter. The HTTP endpoint delegates to the service; SQL create/read queries and row mapping no longer live in the route. `src/bootstrap/main.ts` owns current HTTP/config composition and `src/main.ts` remains the stable process entrypoint.

Qlib worker calls now cross `QlibWorkerPort`; `GeneratedQlibWorkerAdapter` translates generated-client HTTP failures to the port error, while `QlibResearchService` owns probe/fit/train/validate behavior and its NOT_RUN/HTTP error projection. The bootstrap composes this service and all Qlib routes use it. Three deterministic unit tests cover missing identity, preserved worker rejection and fit timeout.

All five Quant-owned `CREATE TABLE IF NOT EXISTS` statements now live in adapter-side `initializeQuantResearchSchema`; bootstrap calls this one adapter initializer, with table definitions and constraints unchanged. This is an ownership cleanup, not a versioned migration framework or a data/schema change.

Validation: Quant build/lint; 11 TS unit files/57 tests; isolated candidate and PromotionRequest/V3.2 HTTP+PostgreSQL integration from the candidate slice; and service-auth HTTP smoke (isolated temporary PostgreSQL, 14 unauthorized route probes, governance one-shot authorization checks) PASS. Locked Qlib Fixture container smoke PASS on linux/amd64 emulated on Apple Silicon, including repeat-fit identical prediction/model hashes and 422 invalid temporal split. The Qlib smoke performed no market/provider calls or candidate execution. Python Worker tests remain 13/13 PASS from the preceding domain-only increment.

Remaining: PromotionRequest/report/decision flows still contain direct PostgreSQL queries in bootstrap. No whole-service layer PASS is claimed and the Quant service has not yet been added to the baseline layer scanner. No endpoint contract, approval, activation, data-source authorization or trading state changed. No external model Provider, market source, live trading or active service was used.

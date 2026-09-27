# GENERATED FILE. DO NOT EDIT. Source: packages/contracts/**/*.schema.json

from typing import Literal, NotRequired, Required, TypedDict

HistoricalReplayAccepted = TypedDict("HistoricalReplayAccepted", {
  "accepted": Required[Literal[True]],
  "testRunId": Required[str],
  "status": Required[Literal['RUNNING']],
})

HistoricalReplayBar = TypedDict("HistoricalReplayBar", {
  "timestamp": Required[str],
  "open": Required[str],
  "volume": Required[int],
})

HistoricalReplayCommand = TypedDict("HistoricalReplayCommand", {
  "testRunId": Required[str],
  "namespace": Required[str],
  "ownerId": Required[str],
  "scenarioId": Required[Literal['normal', 'recovery']],
  "seed": Required[int],
  "bar": Required[HistoricalReplayBar],
})

HistoricalReplayMultiCommand = TypedDict("HistoricalReplayMultiCommand", {
  "testRunId": Required[str],
  "namespace": Required[str],
  "ownerId": Required[str],
  "scenarioId": Required[Literal['normal', 'recovery']],
  "seed": Required[int],
  "bars": Required[list[HistoricalReplayBar]],
})

HistoricalReplayRun = TypedDict("HistoricalReplayRun", {
  "testRunId": Required[str],
  "namespace": Required[str],
  "ownerId": Required[str],
  "scenarioId": Required[Literal['normal', 'recovery']],
  "status": Required[Literal['RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED']],
  "checkpoint": Required[dict[str, object]],
  "result": Required[dict[str, object] | None],
  "createdAt": Required[str],
  "completedAt": Required[str | None],
})

QlibFitFixtureRequest = TypedDict("QlibFitFixtureRequest", {
  "schemaVersion": Required[Literal['qlib-fit-fixture-v1']],
  "sourceMode": Required[Literal['FIXTURE']],
  "featureRows": Required[list[list[float]]],
  "labels": Required[list[float]],
  "splits": Required[dict[str, object]],
})

QlibFitFixtureResult = TypedDict("QlibFitFixtureResult", {
  "schemaVersion": Required[Literal['qlib-fit-fixture-result-v1']],
  "status": Required[Literal['COMPLETED']],
  "sourceMode": Required[Literal['FIXTURE']],
  "modelTraining": Required[Literal['PASS']],
  "modelValidation": Required[Literal['NOT_RUN']],
  "candidateSourceExecution": Required[Literal['NOT_PERFORMED']],
  "qlibVersion": Required[str],
  "lightgbmVersion": Required[str],
  "model": Required[Literal['qlib.contrib.model.gbdt.LGBModel']],
  "segments": Required[dict[str, object]],
  "testPredictionCount": Required[int],
  "testPredictionsFinite": Required[Literal[True]],
  "testPredictionsSha256": Required[str],
  "modelSha256": Required[str],
  "evaluationMetrics": Required[dict[str, object]],
  "tracking": Required[Literal['temporary SQLite under /tmp; removed with the worker container']],
  "profitabilityClaim": Required[Literal['NOT_MADE']],
})

V31ArtifactPublishCommand = TypedDict("V31ArtifactPublishCommand", {
  "ref": Required[V31ResearchArtifactRef],
  "contentBase64": Required[str],
  "jobId": NotRequired[str],
  "workerId": NotRequired[str],
  "fencingToken": NotRequired[int],
})

V31ArtifactPublishResult = TypedDict("V31ArtifactPublishResult", {
  "status": Required[Literal['PUBLISHED']],
  "persisted": Required[bool],
  "ref": Required[V31ResearchArtifactRef],
})

V31ArtifactReadCommand = TypedDict("V31ArtifactReadCommand", {
  "namespace": Required[str],
  "artifactId": Required[str],
})

V31ResearchArtifactRef = TypedDict("V31ResearchArtifactRef", {
  "schemaVersion": Required[Literal['v3.1-artifact-ref-v1']],
  "artifactId": Required[str],
  "kind": Required[Literal['INPUT', 'GENERATED_CODE', 'RUN_LOG', 'METRICS', 'ERROR', 'CANDIDATE', 'OUTPUT']],
  "namespace": Required[str],
  "sha256": Required[str],
  "status": Required[Literal['PENDING', 'PUBLISHED', 'FAILED', 'RETAINED']],
  "sourceRef": Required[str],
})

V31ExperimentBudgetResult = TypedDict("V31ExperimentBudgetResult", {
  "experimentId": Required[str],
  "requestedCents": Required[int],
  "reservedCents": Required[int],
  "spentCents": Required[int],
  "status": Required[Literal['RESERVED', 'SETTLED', 'UNKNOWN', 'REJECTED']],
})

V31ExperimentBudgetSettleCommand = TypedDict("V31ExperimentBudgetSettleCommand", {
  "spentCents": Required[object],
})

V31ExperimentCancellationResult = TypedDict("V31ExperimentCancellationResult", {
  "testRunId": NotRequired[str],
  "experimentId": Required[str],
  "fixtureId": Required[str],
  "modelProfile": Required[str],
  "rounds": Required[int],
  "budgetCurrency": Required[Literal['USD']],
  "budgetCents": Required[int],
  "environmentMode": Required[Literal['RESEARCH']],
  "brokerMode": Required[Literal['FAKE']],
  "idempotencyKey": Required[str],
  "status": Required[Literal['CANCELLED']],
  "reason": Required[str],
  "createdAt": Required[str],
  "cancelledAt": Required[str],
})

V31ExperimentResult = TypedDict("V31ExperimentResult", {
  "testRunId": NotRequired[str],
  "experimentId": Required[str],
  "fixtureId": Required[str],
  "modelProfile": Required[str],
  "rounds": Required[int],
  "budgetCurrency": Required[Literal['USD']],
  "budgetCents": Required[int],
  "environmentMode": Required[Literal['RESEARCH']],
  "brokerMode": Required[Literal['FAKE']],
  "idempotencyKey": Required[str],
  "status": Required[Literal['PENDING_PREREQUISITES', 'CANCELLED']],
  "reason": Required[str],
  "createdAt": Required[str],
  "cancelledAt": Required[str | None],
  "budget": Required[dict[str, object]],
})

V31ExperimentRequest = TypedDict("V31ExperimentRequest", {
  "testRunId": NotRequired[str],
  "fixtureId": Required[str],
  "modelProfile": Required[str],
  "rounds": Required[int],
  "budgetCurrency": Required[Literal['USD']],
  "budgetCents": Required[int],
  "environmentMode": Required[Literal['RESEARCH']],
  "brokerMode": Required[Literal['FAKE']],
  "idempotencyKey": Required[str],
})

ExactV31HumanAcceptanceCommand = TypedDict("ExactV31HumanAcceptanceCommand", {
  "confirmation": Required[Literal['ACCEPT_EXACT_V31_RUN']],
  "note": Required[str],
})

V31ModelGatewayFixtureCommand = TypedDict("V31ModelGatewayFixtureCommand", {
  "experimentId": Required[str],
  "modelRunId": Required[str],
  "requestedCents": Required[int],
  "scenario": Required[Literal['COMPLETED', 'TIMEOUT', 'OVER_BUDGET']],
})

V31ModelGatewayFixtureResult = TypedDict("V31ModelGatewayFixtureResult", {
  "providerMode": Required[Literal['FIXTURE']],
  "modelCalls": Required[Literal['NO_EXTERNAL_CALL']],
  "status": Required[Literal['BLOCKED', 'ALREADY_EXISTS', 'UNKNOWN', 'COMPLETED']],
  "modelRunId": Required[str],
  "reason": NotRequired[str],
  "budgetStatus": NotRequired[Literal['RESERVED', 'DISPATCHED', 'UNKNOWN', 'SETTLED', 'REJECTED']],
  "actualCostCents": NotRequired[int],
  "response": NotRequired[dict[str, object]],
})

V31ExactRunPromotionGate = TypedDict("V31ExactRunPromotionGate", {
  "schemaVersion": Required[Literal['v3.1-promotion-gate-v1']],
  "testRunId": Required[str],
  "stageStatus": Required[Literal['PASS', 'NOT_RUN']],
  "humanAcceptance": Required[Literal['ACCEPTED', 'NOT_RUN']],
  "evidenceSha256": Required[str],
  "acceptedBy": NotRequired[str],
  "acceptedAt": NotRequired[str],
  "note": NotRequired[str],
})

V31ResearchRuntimeConfiguration = TypedDict("V31ResearchRuntimeConfiguration", {
  "schemaVersion": Required[Literal['v3.1-research-runtime-v1']],
  "environmentMode": Required[Literal['RESEARCH']],
  "brokerMode": Required[Literal['FAKE']],
  "runner": Required[dict[str, object]],
  "modelGateway": Required[dict[str, object]],
  "execution": Required[dict[str, object]],
  "security": Required[dict[str, object]],
  "artifacts": Required[dict[str, object]],
})

V31RunnerClaimCommand = TypedDict("V31RunnerClaimCommand", {
  "workerId": Required[str],
  "testRunId": NotRequired[str],
})

V31RunnerCompleteCommand = TypedDict("V31RunnerCompleteCommand", {
  "workerId": Required[str],
  "fencingToken": Required[int],
  "execution": Required[V31RunnerExecution],
  "artifacts": NotRequired[list[V31ResearchArtifactRef]],
})

V31RunnerExecution = TypedDict("V31RunnerExecution", {
  "status": Required[Literal['COMPLETED', 'FAILED', 'TIMED_OUT', 'OUTPUT_LIMIT', 'SPAWN_FAILED']],
  "exitCode": Required[int | None],
  "signal": Required[Literal['SIGABRT', 'SIGALRM', 'SIGBUS', 'SIGCHLD', 'SIGCONT', 'SIGFPE', 'SIGHUP', 'SIGILL', 'SIGINT', 'SIGIO', 'SIGIOT', 'SIGKILL', 'SIGPIPE', 'SIGPOLL', 'SIGPROF', 'SIGPWR', 'SIGQUIT', 'SIGSEGV', 'SIGSTKFLT', 'SIGSTOP', 'SIGSYS', 'SIGTERM', 'SIGTRAP', 'SIGTSTP', 'SIGTTIN', 'SIGTTOU', 'SIGURG', 'SIGUSR1', 'SIGUSR2', 'SIGVTALRM', 'SIGWINCH', 'SIGXCPU', 'SIGXFSZ', null]],
  "stdout": Required[str],
  "stderr": Required[str],
  "durationMs": Required[int],
})

V31RunnerInputBundle = TypedDict("V31RunnerInputBundle", {
  "schemaVersion": Required[Literal['v3.1-runner-input-bundle-v1']],
  "script": Required[str],
  "files": Required[list[dict[str, object]]],
})

V31RunnerInputRequest = TypedDict("V31RunnerInputRequest", {
  "workerId": Required[str],
  "fencingToken": Required[int],
})

V31RunnerInputResponse = TypedDict("V31RunnerInputResponse", {
  "ref": Required[V31ResearchArtifactRef],
  "contentBase64": Required[str],
})

V31RunnerJobDispatchResult = TypedDict("V31RunnerJobDispatchResult", {
  "jobId": Required[str],
  "job": Required[V31RunnerJob],
  "status": Required[Literal['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'TIMED_OUT', 'OUTPUT_LIMIT', 'SPAWN_FAILED', 'CANCELLED']],
  "submittedAt": Required[str],
  "startedAt": Required[str | None],
  "completedAt": Required[str | None],
  "execution": Required[object],
  "artifacts": Required[list[V31ResearchArtifactRef]],
  "attempt": Required[int],
  "retryOf": Required[str | None],
  "lease": Required[object],
  "prerequisiteStatus": Required[Literal['PENDING_PREREQUISITES', 'CONFIGURED']],
})

V31RunnerJobRecord = TypedDict("V31RunnerJobRecord", {
  "jobId": Required[str],
  "job": Required[V31RunnerJob],
  "status": Required[Literal['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'TIMED_OUT', 'OUTPUT_LIMIT', 'SPAWN_FAILED', 'CANCELLED']],
  "submittedAt": Required[str],
  "startedAt": Required[str | None],
  "completedAt": Required[str | None],
  "execution": Required[object],
  "artifacts": Required[list[V31ResearchArtifactRef]],
  "attempt": Required[int],
  "retryOf": Required[str | None],
  "lease": Required[object],
  "claimStatus": NotRequired[Literal['LEASED']],
})

V31RunnerJob = TypedDict("V31RunnerJob", {
  "schemaVersion": Required[Literal['v3.1-runner-job-v1']],
  "testRunId": Required[str],
  "experimentId": Required[str],
  "imageDigest": Required[str],
  "inputArtifact": Required[str],
  "outputNamespace": Required[str],
  "resources": Required[dict[str, object]],
  "networkPolicy": Required[dict[str, object]],
})

V31RunnerLease = TypedDict("V31RunnerLease", {
  "workerId": Required[str],
  "fencingToken": Required[int],
  "expiresAt": Required[str],
})

V32CandidateArtifactResult = TypedDict("V32CandidateArtifactResult", {
  "schemaVersion": Required[Literal['v3.2-candidate-artifact-result-v1']],
  "promotionRequestId": Required[str],
  "ref": Required[V31ResearchArtifactRef],
  "contentBase64": Required[str],
})

V32CandidateMandateBindingCommand = TypedDict("V32CandidateMandateBindingCommand", {
  "schemaVersion": Required[Literal['v3.2-candidate-mandate-binding-command-v1']],
  "mandateId": Required[str],
  "testRunId": Required[str],
  "ownerId": Required[str],
  "accountId": Required[str],
  "market": Required[Literal['CN_A']],
  "environmentMode": Required[Literal['PAPER']],
  "brokerMode": Required[Literal['FAKE']],
  "strategyVersion": Required[str],
  "candidateArtifact": Required[dict[str, object]],
})

V32CandidateMandateBindingResult = TypedDict("V32CandidateMandateBindingResult", {
  "schemaVersion": Required[Literal['v3.2-candidate-mandate-binding-result-v1']],
  "status": Required[Literal['EXACT_VERSION_MATCH_READY_FOR_MANDATE_REVIEW', 'WAITING', 'REJECTED']],
  "reason": Required[Literal['APPROVED_REGISTRY_VERSION_NOT_FOUND', 'REGISTRY_LOOKUP_UNAVAILABLE', 'APPROVED_VERSION_AND_CANDIDATE_ARTIFACT_MATCH', 'REGISTRY_VERSION_OR_CANDIDATE_ARTIFACT_MISMATCH']],
  "mandateId": Required[str],
  "testRunId": NotRequired[str],
  "ownerId": NotRequired[str],
  "accountId": NotRequired[str],
  "market": NotRequired[Literal['CN_A']],
  "environmentMode": NotRequired[Literal['PAPER']],
  "brokerMode": NotRequired[Literal['FAKE']],
  "versionFingerprint": NotRequired[str],
  "registryStatus": NotRequired[Literal['CANDIDATE_APPROVED']],
  "activation": NotRequired[Literal['DISABLED_UNTIL_MANDATE']],
  "promotionRequestId": NotRequired[str],
  "accountValidation": NotRequired[Literal['NOT_PERFORMED']],
  "mandatePersistence": NotRequired[Literal['NOT_PERFORMED']],
})

V32PromotionDataManifest = TypedDict("V32PromotionDataManifest", {
  "schemaVersion": Required[Literal['v3.2-data-manifest-v1']],
  "testRunId": Required[str],
  "experimentId": Required[str],
  "dataMode": Required[Literal['FIXTURE', 'RECORDED', 'REAL']],
  "dataVersion": Required[str],
  "dataContentSha256": Required[str],
})

V32IndependentValidationEvidenceBundle = TypedDict("V32IndependentValidationEvidenceBundle", {
  "PIT": Required[V32IndependentValidationEvidence],
  "OUT_OF_SAMPLE": Required[V32IndependentValidationEvidence],
  "COST": Required[V32IndependentValidationEvidence],
  "RULES": Required[V32IndependentValidationEvidence],
  "CAPACITY": Required[V32IndependentValidationEvidence],
})

V32IndependentValidationEvidence = TypedDict("V32IndependentValidationEvidence", {
  "evidenceSha256": Required[str],
  "details": Required[dict[str, object]],
})

V32IndependentValidationInput = TypedDict("V32IndependentValidationInput", {
  "schemaVersion": Required[Literal['v3.2-independent-validation-input-v1']],
  "promotionRequestId": Required[str],
  "requestFingerprint": Required[str],
  "request": Required[V32PromotionRequest],
})

V32IndependentValidationReport = TypedDict("V32IndependentValidationReport", {
  "schemaVersion": Required[Literal['v3.2-independent-validation-report-v1']],
  "promotionRequestId": Required[str],
  "testRunId": Required[str],
  "sourceMode": Required[Literal['FIXTURE', 'REAL_CANDIDATE']],
  "disposition": Required[Literal['ELIGIBLE_FOR_REVIEW', 'REJECTED', 'INCOMPLETE']],
  "reason": Required[Literal['ALL_REQUIRED_CHECKS_PASSED', 'REQUIRED_CHECK_FAILED', 'REQUIRED_CHECK_NOT_RUN']],
  "checks": Required[list[dict[str, object]]],
  "registryMutation": Required[Literal['NOT_PERFORMED']],
})

V32IndependentValidationResult = TypedDict("V32IndependentValidationResult", {
  "schemaVersion": Required[Literal['v3.2-independent-validation-result-v1']],
  "promotionRequestId": Required[str],
  "reportFingerprint": Required[str],
  "report": Required[V32IndependentValidationReport],
  "evidence": Required[V32IndependentValidationEvidenceBundle],
  "createdAt": Required[str],
  "idempotent": Required[bool],
})

V32IndependentValidationSubmission = TypedDict("V32IndependentValidationSubmission", {
  "schemaVersion": Required[Literal['v3.2-independent-validation-submission-v1']],
  "report": Required[V32IndependentValidationReport],
  "evidence": Required[V32IndependentValidationEvidenceBundle],
})

V32PlatformPromotionEvidence = TypedDict("V32PlatformPromotionEvidence", {
  "request": Required[V32PromotionRequestDetail],
  "validationReport": Required[object],
  "registryMutation": Required[Literal['NOT_PERFORMED', 'CANDIDATE_APPROVED', 'NOT_REGISTERED']],
  "activation": Required[Literal['DISABLED_UNTIL_MANDATE']],
  "testRunId": Required[str],
})

V32PromotionDecisionCommand = TypedDict("V32PromotionDecisionCommand", {
  "schemaVersion": Required[Literal['v3.2-promotion-decision-command-v1']],
  "decision": Required[Literal['APPROVE', 'REJECT']],
  "confirmation": Required[Literal['REVIEW_EXACT_PROMOTION_VERSION']],
  "reportFingerprint": Required[str],
  "actorId": Required[str],
})

V32PromotionDecisionResult = TypedDict("V32PromotionDecisionResult", {
  "schemaVersion": Required[Literal['v3.2-promotion-decision-result-v1']],
  "promotionRequestId": Required[str],
  "decision": Required[Literal['APPROVE', 'REJECT']],
  "reportFingerprint": Required[str],
  "versionFingerprint": Required[str],
  "actorId": Required[str],
  "registryStatus": Required[Literal['CANDIDATE_APPROVED', 'NOT_REGISTERED']],
  "activation": Required[Literal['DISABLED_UNTIL_MANDATE']],
  "createdAt": Required[str],
  "idempotent": Required[bool],
})

V32PromotionRegistryVersion = TypedDict("V32PromotionRegistryVersion", {
  "schemaVersion": Required[Literal['v3.2-promotion-registry-version-v1']],
  "promotionRequestId": Required[str],
  "versionFingerprint": Required[str],
  "candidateArtifact": Required[dict[str, object]],
  "codeSha256": Required[str],
  "dataManifestSha256": Required[str],
  "metricsManifestSha256": Required[str],
  "validationPlanSha256": Required[str],
  "approvedBy": Required[str],
  "status": Required[Literal['CANDIDATE_APPROVED']],
  "activation": Required[Literal['DISABLED_UNTIL_MANDATE']],
})

V32PromotionRequestDetail = TypedDict("V32PromotionRequestDetail", {
  "schemaVersion": Required[Literal['v3.2-promotion-request-detail-v1']],
  "promotionRequestId": Required[str],
  "request": Required[V32PromotionRequest],
  "status": Required[Literal['AWAITING_INDEPENDENT_VALIDATION', 'AWAITING_REVIEW', 'VALIDATION_INCOMPLETE', 'REJECTED', 'CANDIDATE_APPROVED']],
  "createdAt": Required[str],
  "decision": Required[object],
})

V32PromotionRequestResult = TypedDict("V32PromotionRequestResult", {
  "schemaVersion": Required[Literal['v3.2-promotion-request-result-v1']],
  "promotionRequestId": Required[str],
  "testRunId": Required[str],
  "status": Required[Literal['AWAITING_INDEPENDENT_VALIDATION']],
  "createdAt": Required[str],
  "idempotent": Required[bool],
})

V32PromotionRequest = TypedDict("V32PromotionRequest", {
  "schemaVersion": Required[Literal['v3.2-promotion-request-v1']],
  "promotionRequestId": Required[str],
  "testRunId": Required[str],
  "experimentId": Required[str],
  "candidateSource": Required[Literal['RD_AGENT', 'FIXTURE']],
  "candidateArtifact": Required[dict[str, object]],
  "codeSha256": Required[str],
  "dataManifestSha256": Required[str],
  "metricsManifestSha256": Required[str],
  "validationPlanSha256": Required[str],
  "budget": Required[dict[str, object]],
  "idempotencyKey": Required[str],
})

V32PromotionScenarioFixture = TypedDict("V32PromotionScenarioFixture", {
  "schemaVersion": Required[Literal['v3.2-promotion-scenario-v1']],
  "scenarioId": Required[Literal['eligible-fixture', 'future-data-rejected-fixture']],
  "sourceMode": Required[Literal['FIXTURE']],
  "request": Required[V32PromotionRequest],
  "independentValidationExpectation": Required[dict[str, object]],
})

V32PromotionRequestSubmissionCommand = TypedDict("V32PromotionRequestSubmissionCommand", {
  "testRunId": Required[str],
  "experimentId": Required[str],
})

V32PromotionRequestSubmissionResult = TypedDict("V32PromotionRequestSubmissionResult", {
  "status": Required[Literal['WAITING', 'SUBMITTED', 'SUBMISSION_UNKNOWN']],
  "testRunId": NotRequired[str],
  "blockers": NotRequired[list[str]],
  "quantResult": NotRequired[object],
  "promotionRequestId": NotRequired[str],
  "quantStatus": NotRequired[Literal['AWAITING_INDEPENDENT_VALIDATION']],
  "idempotent": NotRequired[bool],
  "idempotencyKey": NotRequired[str],
  "reason": NotRequired[str],
})

V32UserPromotionDecisionCommand = TypedDict("V32UserPromotionDecisionCommand", {
  "decision": Required[Literal['APPROVE', 'REJECT']],
  "confirmation": Required[Literal['REVIEW_EXACT_PROMOTION_VERSION']],
})

V32UserPromotionDecisionResult = TypedDict("V32UserPromotionDecisionResult", {
  "schemaVersion": Required[Literal['v3.2-user-promotion-decision-result-v1']],
  "testRunId": Required[str],
  "decision": Required[V32PromotionDecisionResult],
})

V32OwnerScopedSubmitConfirmation = TypedDict("V32OwnerScopedSubmitConfirmation", {
  "confirmation": Required[Literal['SUBMIT_V32_PROMOTION_REQUEST']],
})

V32OwnerScopedPromotionRequestSubmitResult = TypedDict("V32OwnerScopedPromotionRequestSubmitResult", {
  "status": Required[Literal['WAITING', 'SUBMITTED', 'SUBMISSION_UNKNOWN']],
  "testRunId": Required[str],
  "ownerId": Required[str],
  "humanAcceptance": Required[Literal['NOT_CHANGED']],
  "promotionRequestId": NotRequired[str],
  "blockers": NotRequired[list[str]],
  "reason": NotRequired[str],
})

V32PromotionValidationPlan = TypedDict("V32PromotionValidationPlan", {
  "schemaVersion": Required[Literal['v3.2-validation-plan-v1']],
  "testRunId": Required[str],
  "experimentId": Required[str],
  "candidateSource": Required[Literal['RD_AGENT', 'FIXTURE']],
  "dataManifestSha256": Required[str],
  "candidateOutputPath": Required[str],
  "generatedCodeOutputPath": Required[str],
  "metricsOutputPath": Required[str],
})

V33ReadinessRun = TypedDict("V33ReadinessRun", {
  "accepted": NotRequired[bool],
  "testRunId": Required[str],
  "stageId": Required[Literal['V3.3']],
  "scenarioId": Required[Literal['normal', 'rejection', 'recovery']],
  "scenarioVersion": Required[Literal['v3.3-readiness-v1']],
  "status": Required[Literal['WAITING']],
  "seed": Required[int],
  "assertions": Required[list[dict[str, object]]],
  "evidence": Required[dict[str, object]],
  "createdAt": NotRequired[str],
  "completedAt": NotRequired[str | None],
})

V33ReadinessRunRequest = TypedDict("V33ReadinessRunRequest", {
  "scenarioId": Required[Literal['normal', 'rejection', 'recovery']],
  "seed": NotRequired[int],
  "sourceV31TestRunId": NotRequired[str],
  "promotionRequestId": NotRequired[str],
})

V33RunnerBudget = TypedDict("V33RunnerBudget", {
  "schemaVersion": Required[Literal['v3.3-runner-budget-v1']],
  "testRunId": Required[str],
  "offset": Required[int],
  "limit": Required[int],
  "hasMore": Required[bool],
  "rows": Required[list[dict[str, object]]],
  "coverage": Required[dict[str, object]],
  "note": Required[str],
})

V33RunnerCursorQueue = TypedDict("V33RunnerCursorQueue", {
  "schemaVersion": Required[Literal['v3.3-runner-cursor-queue-v1']],
  "testRunId": Required[str],
  "afterCursor": Required[str | None],
  "limit": Required[int],
  "hasMore": Required[bool],
  "nextAfterCursor": Required[str | None],
  "jobs": Required[list[dict[str, object]]],
})

V33RunnerQueue = TypedDict("V33RunnerQueue", {
  "schemaVersion": Required[Literal['v3.3-runner-queue-v1']],
  "testRunId": Required[str],
  "offset": Required[int],
  "limit": Required[int],
  "hasMore": Required[bool],
  "jobs": Required[list[dict[str, object]]],
})

InitializeAccountCommand = TypedDict("InitializeAccountCommand", {
  "fixtureAccountRef": Required[str],
  "ownerId": Required[str],
  "market": Required[Literal['CN_A', 'US_EQUITY']],
  "environmentMode": Required[Literal['PAPER', 'BACKTEST']],
  "brokerMode": Required[Literal['FAKE']],
  "initialCash": Required[Money],
  "namespace": Required[str],
  "testRunId": Required[str],
  "idempotencyKey": Required[str],
})

AccountInitializationFixture = TypedDict("AccountInitializationFixture", {
  "$schema": NotRequired[str],
  "fixtureVersion": Required[str],
  "dataMode": Required[Literal['FIXTURE']],
  "simulationOnly": Required[Literal[True]],
  "accounts": Required[list[dict[str, object]]],
})

AccountSnapshot = TypedDict("AccountSnapshot", {
  "accountId": Required[str],
  "namespace": Required[str],
  "testRunId": Required[str],
  "ownerId": Required[str],
  "fixtureAccountRef": Required[str],
  "market": Required[Literal['CN_A', 'US_EQUITY']],
  "environmentMode": Required[Literal['PAPER', 'BACKTEST']],
  "brokerMode": Required[Literal['FAKE']],
  "cash": Required[Money],
  "positionCount": Required[int],
  "ledgerEntryCount": Required[int],
  "ledgerVersion": Required[int],
})

ClockContext = TypedDict("ClockContext", {
  "clockMode": Required[Literal['SYSTEM', 'SIMULATION', 'FIXED']],
  "asOf": Required[str],
  "runId": NotRequired[str | None],
  "calendarVersion": NotRequired[str | None],
})

ErrorResponse = TypedDict("ErrorResponse", {
  "code": Required[str],
  "message": Required[str],
  "category": Required[Literal['AUTHENTICATION', 'AUTHORIZATION', 'VALIDATION', 'CONFLICT', 'DEPENDENCY', 'INTERNAL']],
  "retryable": Required[bool],
  "correlationId": Required[str],
  "details": NotRequired[dict[str, object]],
  "acceptanceStatus": NotRequired[Literal['KNOWN', 'UNKNOWN']],
})

HistoricalFakeExecutionCommand = TypedDict("HistoricalFakeExecutionCommand", {
  "authorizationId": Required[str],
  "namespace": Required[str],
  "accountId": Required[str],
  "clientOrderId": Required[str],
  "security": Required[str],
  "requestedQuantity": Required[int],
  "bar": Required[dict[str, object]],
  "side": NotRequired[Literal['BUY', 'SELL']],
  "orderType": NotRequired[Literal['MARKET', 'LIMIT']],
  "timeInForce": NotRequired[Literal['DAY']],
  "limitPrice": NotRequired[str],
  "participationRate": NotRequired[float],
  "slippageBps": NotRequired[float],
  "currency": NotRequired[str],
  "reservation": NotRequired[dict[str, object]],
})

HistoricalFakeExecutionResult = TypedDict("HistoricalFakeExecutionResult", {
  "result": Required[dict[str, object]],
  "replayed": Required[bool],
})

Money = TypedDict("Money", {
  "amount": Required[str],
  "currency": Required[str],
})

PairedBackupManifest = TypedDict("PairedBackupManifest", {
  "format": Required[Literal['stockquant.paired-backup.v1']],
  "backupId": Required[str],
  "createdAt": Required[str],
  "retentionClass": Required[Literal['DAILY', 'MONTH_END']],
  "database": Required[str],
  "artifactVolume": Required[str],
  "restoreValidation": Required[dict[str, object]],
  "files": Required[list[dict[str, object]]],
})

QuantCandidateRegistrationCommand = TypedDict("QuantCandidateRegistrationCommand", {
  "candidateId": NotRequired[str],
  "qlibVersion": Required[Literal['0.9.6']],
  "algorithm": Required[Literal['deterministic-sma']],
  "artifactHash": Required[str],
  "approvedBy": NotRequired[str],
})

QuantCandidateRegistrationResult = TypedDict("QuantCandidateRegistrationResult", {
  "candidateId": Required[str],
  "qlibVersion": Required[Literal['0.9.6']],
  "algorithm": Required[Literal['deterministic-sma']],
  "artifactHash": Required[str],
  "approvedBy": Required[str],
  "status": Required[Literal['CANDIDATE_APPROVED']],
  "activation": Required[Literal['DISABLED_UNTIL_MANDATE']],
  "createdAt": Required[str],
  "idempotent": Required[bool],
})

ReservedFillCommand = TypedDict("ReservedFillCommand", {
  "namespace": Required[str],
  "externalFillId": Required[str],
  "security": Required[str],
  "quantity": Required[int],
  "price": Required[str],
  "fee": Required[str],
  "currency": Required[str],
  "effectiveAt": Required[str],
  "side": NotRequired[Literal['BUY', 'SELL']],
  "reservation": NotRequired[dict[str, object]],
})

ResourceReservationCommand = TypedDict("ResourceReservationCommand", {
  "accountId": Required[str],
  "namespace": Required[str],
  "testRunId": Required[str],
  "ownerId": Required[str],
  "idempotencyKey": Required[str],
  "clientOrderId": Required[str],
  "side": Required[Literal['BUY', 'SELL']],
  "currency": Required[str],
  "cashAmount": Required[object],
  "security": Required[object],
  "quantity": Required[object],
})

ResourceReservationResolution = TypedDict("ResourceReservationResolution", {
  "outcome": Required[Literal['FILLED', 'CANCELLED', 'REJECTED', 'EXPIRED', 'UNKNOWN']],
  "evidenceRef": Required[str],
})

ResourceReservation = TypedDict("ResourceReservation", {
  "reservationId": Required[str],
  "accountId": Required[str],
  "namespace": Required[str],
  "testRunId": Required[str],
  "ownerId": Required[str],
  "idempotencyKey": Required[str],
  "clientOrderId": Required[str],
  "side": Required[Literal['BUY', 'SELL']],
  "currency": Required[str],
  "cashAmount": Required[object],
  "security": Required[object],
  "quantity": Required[object],
  "capturedCashAmount": Required[str],
  "capturedQuantity": Required[int],
  "status": Required[Literal['HELD', 'UNKNOWN', 'CAPTURED', 'RELEASED']],
  "evidenceRef": Required[object],
})

Security = TypedDict("Security", {
  "securityId": Required[str],
  "market": Required[Literal['CN_A', 'US_EQUITY']],
  "listingVenue": Required[str],
  "instrumentType": Required[Literal['COMMON_STOCK']],
  "quoteCurrency": Required[str],
  "tickerAliases": Required[list[dict[str, object]]],
})

TestRun = TypedDict("TestRun", {
  "testRunId": Required[str],
  "stageId": Required[str],
  "scenarioId": Required[str],
  "scenarioVersion": Required[str],
  "namespace": Required[str],
  "ownerId": NotRequired[str],
  "accountId": NotRequired[str | None],
  "market": NotRequired[Literal['CN_A', 'US_EQUITY', 'MULTI']],
  "environmentMode": Required[Literal['BACKTEST', 'PAPER', 'SHADOW']],
  "brokerMode": Required[Literal['FAKE']],
  "dataMode": Required[Literal['FIXTURE', 'RECORDED', 'REAL']],
  "executionModel": NotRequired[Literal['NONE', 'DAILY_BAR', 'MINUTE_BAR', 'SNAPSHOT']],
  "clock": Required[ClockContext],
  "status": Required[Literal['QUEUED', 'RUNNING', 'WAITING', 'CANCELLING', 'COMPLETED', 'FAILED', 'CANCELLED']],
  "seed": Required[int],
  "faultPlan": NotRequired[list[dict[str, object]]],
  "actualFaultSequence": NotRequired[list[dict[str, object]]],
  "createdAt": Required[str],
  "completedAt": NotRequired[str | None],
  "artifactRefs": NotRequired[list[dict[str, object]]],
})

V24ObservationRevisionList = TypedDict("V24ObservationRevisionList", {
  "testRunId": Required[str],
  "revisions": Required[list[V24ObservationRevision]],
})

V24ObservationRevision = TypedDict("V24ObservationRevision", {
  "revisionId": Required[str],
  "testRunId": Required[str],
  "stageId": Required[Literal['V2.4']],
  "priorStatus": Required[Literal['COMPLETED']],
  "priorAssertions": Required[list[dict[str, object]]],
  "priorEvidence": Required[dict[str, object]],
  "priorCreatedAt": Required[str],
  "priorCompletedAt": Required[str | None],
  "reason": Required[Literal['OBSERVATION_EVENT_ERRORS']],
  "recordedAt": Required[str],
})

V24PaperExecutionPolicy = TypedDict("V24PaperExecutionPolicy", {
  "schemaVersion": Required[Literal['v24-paper-execution-policy-v1']],
  "policyId": Required[Literal['v24-snapshot-paper-policy']],
  "policyVersion": Required[Literal['1.0.0']],
  "status": Required[Literal['PREPARATION_ONLY']],
  "environmentMode": Required[Literal['PAPER']],
  "brokerMode": Required[Literal['FAKE']],
  "liveTradingEnabled": Required[Literal[False]],
  "supportedMarkets": Required[Literal[['CN_A']]],
  "signal": Required[dict[str, object]],
  "execution": Required[dict[str, object]],
  "quoteRules": Required[dict[str, object]],
  "approval": Required[dict[str, object]],
  "risk": Required[dict[str, object]],
  "configurationGaps": Required[list[Literal['STRATEGY_VERSION', 'MANDATE_VERSION', 'MAX_DEVIATION_BPS', 'RISK_POLICY_VERSION', 'FEE_POLICY_VERSION', 'US_MARKET_POLICY']]],
})

V24PaperMandate = TypedDict("V24PaperMandate", {
  "schemaVersion": Required[Literal['v24-paper-mandate-v1']],
  "mandateId": Required[Literal['UNSET']],
  "mandateVersion": Required[Literal['UNSET']],
  "status": Required[Literal['PREPARATION_ONLY']],
  "ownerId": Required[Literal['UNSET']],
  "accountId": Required[Literal['UNSET']],
  "namespace": Required[Literal['UNSET']],
  "testRunId": Required[Literal['UNSET']],
  "market": Required[Literal['CN_A']],
  "strategyVersion": Required[Literal['UNSET']],
  "securityScope": Required[Literal[[]]],
  "limits": Required[dict[str, object]],
  "validity": Required[dict[str, object]],
  "approvalEvidenceRef": Required[Literal['UNSET']],
  "configurationGaps": Required[list[Literal['MANDATE_ID', 'MANDATE_VERSION', 'OWNER', 'ACCOUNT', 'NAMESPACE', 'TESTRUN', 'STRATEGY_VERSION', 'SECURITY_SCOPE', 'LIMITS', 'VALIDITY', 'APPROVAL_EVIDENCE']]],
})

V24PaperReadiness = TypedDict("V24PaperReadiness", {
  "schemaVersion": Required[Literal['v24-paper-execution-readiness-v1']],
  "market": Required[Literal['CN_A', 'US_EQUITY']],
  "environmentMode": Required[Literal['PAPER']],
  "brokerMode": Required[Literal['FAKE']],
  "liveTradingEnabled": Required[Literal[False]],
  "status": Required[Literal['BLOCKED', 'REJECTED']],
  "policyReadiness": Required[object],
  "mandateReadiness": Required[object],
  "riskEvaluation": Required[dict[str, object]],
  "resourceReservation": Required[dict[str, object]],
  "orderSubmissionEnabled": Required[Literal[False]],
})

V24PaperStageRunAccepted = TypedDict("V24PaperStageRunAccepted", {
  "accepted": Required[Literal[True]],
  "testRunId": Required[str],
  "status": Required[Literal['WAITING']],
})

V24PaperStageRunRequest = TypedDict("V24PaperStageRunRequest", {
  "scenarioId": Required[Literal['normal', 'rejection', 'recovery']],
  "seed": Required[int],
})

V24PaperStageRunResult = TypedDict("V24PaperStageRunResult", {
  "testRunId": Required[str],
  "stageId": Required[Literal['V2.4']],
  "scenarioId": Required[Literal['normal', 'rejection', 'recovery']],
  "scenarioVersion": Required[str],
  "ownerId": Required[str],
  "namespace": Required[str],
  "status": Required[Literal['WAITING']],
  "seed": Required[int],
  "assertions": Required[list[dict[str, object]]],
  "evidence": Required[dict[str, object]],
  "createdAt": Required[str],
  "completedAt": Required[object],
})

V24SnapshotFixtureExecutionV2 = TypedDict("V24SnapshotFixtureExecutionV2", {
  "$schema": NotRequired[str],
  "fixtureId": Required[Literal['v24-snapshot-cn-paper-execution']],
  "fixtureVersion": Required[Literal['2.0.0']],
  "dataMode": Required[Literal['FIXTURE']],
  "environmentMode": Required[Literal['PAPER']],
  "brokerMode": Required[Literal['FAKE']],
  "liveTradingEnabled": Required[Literal[False]],
  "market": Required[Literal['CN_A', 'US_EQUITY']],
  "currency": Required[Literal['CNY', 'USD']],
  "clockNow": Required[str],
  "order": Required[dict[str, object]],
  "snapshot": Required[dict[str, object]],
  "fixtureFee": Required[str],
  "expected": Required[dict[str, object]],
  "risk": Required[dict[str, object]],
})

V24SnapshotFixtureExecution = TypedDict("V24SnapshotFixtureExecution", {
  "$schema": NotRequired[str],
  "fixtureId": Required[Literal['v24-snapshot-cn-paper-execution']],
  "fixtureVersion": Required[Literal['1.0.0']],
  "dataMode": Required[Literal['FIXTURE']],
  "environmentMode": Required[Literal['PAPER']],
  "brokerMode": Required[Literal['FAKE']],
  "liveTradingEnabled": Required[Literal[False]],
  "market": Required[Literal['CN_A', 'US_EQUITY']],
  "currency": Required[Literal['CNY', 'USD']],
  "clockNow": Required[str],
  "order": Required[dict[str, object]],
  "snapshot": Required[dict[str, object]],
  "fixtureFee": Required[str],
  "expected": Required[dict[str, object]],
})

CnAShareCalendarSession = TypedDict("CnAShareCalendarSession", {
  "date": Required[str],
  "status": Required[Literal['TRADING', 'CLOSED', 'UNKNOWN']],
  "calendarVersion": Required[str],
  "source": NotRequired[str],
  "reason": NotRequired[str],
  "sessions": NotRequired[list[dict[str, object]]],
})

CollectionRun = TypedDict("CollectionRun", {
  "runId": Required[str],
  "subscriptionId": Required[str],
  "subscriptionVersion": Required[int],
  "windowStart": Required[str],
  "windowEnd": Required[str],
  "jobKind": Required[Literal['INTRADAY_WINDOW', 'CLOSE_RECONCILIATION', 'BACKFILL', 'GAP_REPAIR']],
  "status": Required[Literal['QUEUED', 'RUNNING', 'WAITING_RETRY', 'WAITING_DEPENDENCY', 'PARTIAL', 'COMPLETED', 'FAILED', 'PAUSED', 'CANCELLED']],
  "idempotencyKey": Required[str],
  "checkpoint": NotRequired[dict[str, object] | None],
  "sourceAttempts": NotRequired[list[dict[str, object]]],
})

CollectionSubscription = TypedDict("CollectionSubscription", {
  "subscriptionId": Required[str],
  "projectId": Required[str],
  "market": Required[Literal['CN_A_SHARE', 'US_EQUITY']],
  "securityUniverseVersion": Required[str],
  "frequency": Required[Literal['5m', '1d']],
  "barType": Required[Literal['MINUTE_BAR', 'DAILY_BAR']],
  "sourcePolicy": Required[list[str]],
  "calendarVersion": Required[str],
  "timeZone": Required[str],
  "enabled": Required[bool],
  "version": Required[int],
  "quota": NotRequired[dict[str, object]],
})

MinuteCsvImportRequest = TypedDict("MinuteCsvImportRequest", {
  "content": Required[str],
  "mapping": Required[dict[str, object]],
  "provenance": Required[dict[str, object]],
  "market": Required[Literal['CN_A']],
  "frequency": Required[Literal['1m', '5m']],
  "adjustment": Required[Literal['RAW']],
  "timezone": Required[Literal['Asia/Shanghai']],
  "timestampSemantics": Required[Literal['BAR_START', 'BAR_END']],
  "volumeUnit": Required[Literal['SHARES']],
  "amountUnit": Required[Literal['CNY']],
})

MinuteCsvUploadChunkRequest = TypedDict("MinuteCsvUploadChunkRequest", {
  "contentBase64": Required[str],
  "sha256": Required[str],
})

MinuteCsvUploadCreateRequest = TypedDict("MinuteCsvUploadCreateRequest", {
  "uploadId": Required[str],
  "expectedSha256": Required[str],
  "expectedBytes": Required[int],
  "metadata": Required[dict[str, object]],
})

MinuteCsvUploadProgress = TypedDict("MinuteCsvUploadProgress", {
  "uploadId": Required[str],
  "status": Required[Literal['OPEN', 'FINALIZING', 'COMPLETED', 'CANCELLED']],
  "expectedBytes": Required[int],
  "receivedBytes": Required[int],
  "expectedChunks": Required[int],
  "receivedChunks": Required[list[int]],
  "result": Required[dict[str, object] | None],
  "idempotent": NotRequired[bool],
})

MinuteImportRecord = TypedDict("MinuteImportRecord", {
  "importId": Required[str],
  "version": Required[str],
  "status": Required[Literal['PUBLISHED', 'REJECTED']],
  "accepted": Required[int],
  "errors": Required[list[dict[str, object]]],
  "sha256": Required[str],
  "manifest": Required[dict[str, object]],
  "idempotent": Required[bool],
})

ProviderCapability = TypedDict("ProviderCapability", {
  "sourceId": Required[str],
  "market": Required[Literal['CN_A_SHARE', 'US_EQUITY']],
  "frequency": Required[Literal['5m', '1d']],
  "historicalStatus": Required[Literal['PASS', 'PARTIAL', 'FAIL', 'NOT_RUN']],
  "liveStatus": Required[Literal['PASS', 'PARTIAL', 'FAIL', 'NOT_RUN', 'BLOCKED_CAPABILITY']],
  "fields": Required[list[str]],
  "checkedAt": Required[str],
  "notes": NotRequired[list[str]],
})

V22StageRunRequest = TypedDict("V22StageRunRequest", {
  "scenarioId": NotRequired[Literal['normal', 'rejection', 'recovery', 'uploaded-csv']],
  "seed": NotRequired[int],
  "uploadId": NotRequired[str],
  "fileFormat": NotRequired[Literal['CSV', 'PARQUET']],
})

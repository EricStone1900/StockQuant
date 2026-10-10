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
  "temporalMetadata": NotRequired[list[dict[str, object]]],
  "splits": Required[dict[str, object]],
})

QlibFitFixtureResult = TypedDict("QlibFitFixtureResult", {
  "schemaVersion": Required[Literal['qlib-fit-fixture-result-v1']],
  "status": Required[Literal['COMPLETED']],
  "sourceMode": Required[Literal['FIXTURE']],
  "modelTraining": Required[Literal['PASS']],
  "modelValidation": Required[Literal['NOT_RUN']],
  "temporalValidation": NotRequired[Literal['PASS', 'NOT_RUN']],
  "candidateSourceExecution": Required[Literal['NOT_PERFORMED']],
  "qlibVersion": Required[str],
  "lightgbmVersion": Required[str],
  "model": Required[Literal['qlib.contrib.model.gbdt.LGBModel']],
  "segments": Required[dict[str, object]],
  "testPredictionCount": Required[int],
  "testPredictionsFinite": Required[Literal[True]],
  "testPredictionsSha256": Required[str],
  "modelSha256": Required[str],
  "modelArtifactBase64": Required[str],
  "testPredictionsCanonicalJson": Required[str],
  "testPredictions": Required[list[float]],
  "evaluationMetrics": Required[dict[str, object]],
  "tracking": Required[Literal['temporary SQLite under /tmp; removed with the worker container']],
  "profitabilityClaim": Required[Literal['NOT_MADE']],
})

V14DailyBacktestFixtureRequest = TypedDict("V14DailyBacktestFixtureRequest", {
  "scenarioId": Required[Literal['normal', 'rejection', 'recovery', 'market-restrictions', 'historical-fees', 'corporate-actions']],
  "testRunId": NotRequired[str],
  "seed": Required[int],
  "policy": Required[dict[str, object]],
})

V14DailyBacktestFixtureResult = TypedDict("V14DailyBacktestFixtureResult", {
  "testRunId": Required[str],
  "stageId": Required[Literal['V1.4']],
  "scenarioId": Required[Literal['normal', 'rejection', 'recovery', 'market-restrictions', 'historical-fees', 'corporate-actions']],
  "seed": Required[int],
  "status": Required[Literal['COMPLETED', 'FAILED']],
  "assertions": Required[list[dict[str, object]]],
  "evidence": Required[dict[str, object]],
  "durableReport": Required[dict[str, object]],
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
  "status": Required[Literal['PENDING', 'PUBLISHED', 'FAILED', 'RETAINED', 'EXPIRED']],
  "sourceRef": Required[str],
  "expiresAt": NotRequired[str | None],
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
  "roundIndex": NotRequired[int],
  "scenario": Required[Literal['COMPLETED', 'TIMEOUT', 'OVER_BUDGET']],
  "runnerScenario": NotRequired[Literal['NORMAL', 'CHECKPOINT_RECOVERY']],
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

V31ModelGatewayOpenAIChatCommand = TypedDict("V31ModelGatewayOpenAIChatCommand", {
  "model": Required[Literal['stockquant-fixture']],
  "messages": Required[list[dict[str, object]]],
  "stream": NotRequired[Literal[False]],
})

V31ModelGatewayOpenAIChatResult = TypedDict("V31ModelGatewayOpenAIChatResult", {
  "id": Required[str],
  "object": Required[Literal['chat.completion']],
  "created": Required[int],
  "model": Required[Literal['stockquant-fixture']],
  "choices": Required[list[dict[str, object]]],
  "usage": Required[dict[str, object]],
})

V31ModelGatewayOpenAIEmbeddingCommand = TypedDict("V31ModelGatewayOpenAIEmbeddingCommand", {
  "model": Required[Literal['stockquant-fixture']],
  "input": Required[object],
  "encoding_format": NotRequired[Literal['float', 'base64', null]],
  "dimensions": NotRequired[Literal[3]],
})

V31ModelGatewayOpenAIEmbeddingResult = TypedDict("V31ModelGatewayOpenAIEmbeddingResult", {
  "object": Required[Literal['list']],
  "model": Required[Literal['stockquant-fixture']],
  "data": Required[list[dict[str, object]]],
  "usage": Required[dict[str, object]],
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
  "roundIndex": NotRequired[int],
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

V32PromotionRequestPreparationResult = TypedDict("V32PromotionRequestPreparationResult", {
  "status": Required[Literal['WAITING', 'READY_FOR_GATE_CHECK']],
  "blockers": Required[list[str]],
  "promotionRequest": Required[object],
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

V33ExperimentLedgerSettlementCommand = TypedDict("V33ExperimentLedgerSettlementCommand", {
  "testRunId": Required[str],
  "expectedRounds": Required[int],
})

V33ExperimentLedgerSettlementResult = TypedDict("V33ExperimentLedgerSettlementResult", {
  "experimentId": Required[str],
  "testRunId": Required[str],
  "requestedCents": Required[int],
  "reservedCents": Required[int],
  "spentCents": Required[int],
  "status": Required[Literal['SETTLED']],
  "modelCallCount": Required[int],
  "rounds": Required[list[dict[str, object]]],
})

V33ReadinessCancelCommand = TypedDict("V33ReadinessCancelCommand", {
  "confirmation": Required[Literal['CANCEL_V33_READINESS_RUN']],
})

V33ReadinessCancelResult = TypedDict("V33ReadinessCancelResult", {
  "testRunId": Required[str],
  "stageId": Required[Literal['V3.3']],
  "status": Required[Literal['CANCELLED']],
  "idempotent": Required[bool],
  "evidence": Required[dict[str, object]],
})

V33ReadinessRun = TypedDict("V33ReadinessRun", {
  "accepted": NotRequired[bool],
  "testRunId": Required[str],
  "stageId": Required[Literal['V3.3']],
  "scenarioId": Required[Literal['normal', 'rejection', 'recovery']],
  "scenarioVersion": Required[Literal['v3.3-readiness-v1']],
  "status": Required[Literal['WAITING', 'QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']],
  "seed": Required[int],
  "assertions": Required[list[dict[str, object]]],
  "evidence": Required[dict[str, object]],
  "createdAt": NotRequired[str],
  "completedAt": NotRequired[str | None],
})

V33RejectionVerifyCommand = TypedDict("V33RejectionVerifyCommand", {
  "schemaVersion": Required[Literal['v3.3-rejection-verify-command-v1']],
  "confirmation": Required[Literal['VERIFY_V33_BUDGET_REJECTION']],
})

V33RejectionVerifyResult = TypedDict("V33RejectionVerifyResult", {
  "schemaVersion": Required[Literal['v3.3-rejection-verify-result-v1']],
  "testRunId": Required[str],
  "status": Required[Literal['RUNNING']],
  "idempotent": Required[bool],
  "assertion": Required[dict[str, object]],
  "evidence": Required[dict[str, object]],
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

V33RunnerCheckpointCommand = TypedDict("V33RunnerCheckpointCommand", {
  "workerId": Required[str],
  "fencingToken": Required[int],
  "schemaVersion": Required[Literal['v3.3-research-checkpoint-v1']],
  "testRunId": Required[str],
  "roundIndex": Required[int],
  "sequence": Required[int],
  "state": Required[dict[str, object]],
})

V33RunnerCheckpointHistory = TypedDict("V33RunnerCheckpointHistory", {
  "schemaVersion": Required[Literal['v3.3-runner-checkpoint-history-v1']],
  "testRunId": Required[str],
  "experimentId": Required[str],
  "roundIndex": Required[int],
  "checkpoints": Required[list[dict[str, object]]],
})

V33RunnerCheckpointReadResult = TypedDict("V33RunnerCheckpointReadResult", {
  "status": Required[Literal['FOUND', 'EMPTY']],
  "checkpoint": Required[dict[str, object] | None],
})

V33RunnerCheckpointResult = TypedDict("V33RunnerCheckpointResult", {
  "status": Required[Literal['PERSISTED']],
  "checkpoint": Required[dict[str, object]],
  "stateSha256": Required[str],
  "sequence": Required[int],
  "existing": Required[bool],
  "createdAt": Required[str],
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

V33ScenarioFixtureRunnerDispatchCommand = TypedDict("V33ScenarioFixtureRunnerDispatchCommand", {
  "schemaVersion": Required[Literal['v3.3-scenario-dispatch-command-v1']],
  "confirmation": Required[Literal['DISPATCH_V33_FIXTURE_RUNNER']],
})

V33ScenarioFixtureRunnerDispatchResult = TypedDict("V33ScenarioFixtureRunnerDispatchResult", {
  "schemaVersion": Required[Literal['v3.3-scenario-dispatch-result-v1']],
  "testRunId": Required[str],
  "status": Required[Literal['RUNNING']],
  "workflowStep": Required[Literal['RUNNER_JOBS_QUEUED']],
  "idempotent": Required[bool],
  "runnerJobsCreated": Required[Literal[2]],
  "runnerJobIds": Required[list[str]],
  "rounds": Required[list[dict[str, object]]],
  "externalModelCalls": Required[Literal[0]],
})

V33ScenarioExperimentCommand = TypedDict("V33ScenarioExperimentCommand", {
  "schemaVersion": Required[Literal['v3.3-scenario-experiment-command-v1']],
  "confirmation": Required[Literal['CREATE_V33_FIXTURE_EXPERIMENT']],
})

V33ScenarioExperimentResult = TypedDict("V33ScenarioExperimentResult", {
  "schemaVersion": Required[Literal['v3.3-scenario-experiment-result-v1']],
  "testRunId": Required[str],
  "status": Required[Literal['WAITING']],
  "idempotent": Required[bool],
  "experiment": Required[V31ExperimentResult],
})

V33ScenarioReconcileCommand = TypedDict("V33ScenarioReconcileCommand", {
  "schemaVersion": Required[Literal['v3.3-scenario-reconcile-command-v1']],
  "confirmation": Required[Literal['RECONCILE_V33_FIXTURE_RESULTS']],
})

V33ScenarioReconcileResult = TypedDict("V33ScenarioReconcileResult", {
  "schemaVersion": Required[Literal['v3.3-scenario-reconcile-result-v1']],
  "testRunId": Required[str],
  "status": Required[Literal['RUNNING']],
  "workflowStep": Required[Literal['EXPERIMENT_SETTLED_AND_RESULTS_RECONCILED']],
  "completedRounds": Required[Literal[2]],
  "rounds": Required[list[dict[str, object]]],
  "experimentSettlement": Required[Literal['VERIFIED_FIXTURE_LEDGER']],
  "settlement": Required[dict[str, object]],
  "businessValidation": Required[Literal['NOT_RUN']],
  "humanAcceptance": Required[Literal['NOT_RUN']],
})

V33TestRunBudgetLimitCommand = TypedDict("V33TestRunBudgetLimitCommand", {
  "schemaVersion": Required[Literal['v3.3-test-run-budget-limit-command-v1']],
  "testRunId": Required[str],
  "budgetCents": Required[int],
})

V33TestRunBudgetLimitResult = TypedDict("V33TestRunBudgetLimitResult", {
  "schemaVersion": Required[Literal['v3.3-test-run-budget-limit-v1']],
  "testRunId": Required[str],
  "budgetCents": Required[int],
  "status": Required[Literal['CONFIGURED']],
})

V33TestRunExperimentBudgetSummary = TypedDict("V33TestRunExperimentBudgetSummary", {
  "schemaVersion": Required[Literal['v3.3-test-run-budget-summary-v1']],
  "testRunId": Required[str],
  "offset": Required[int],
  "limit": Required[int],
  "afterCursor": Required[str | None],
  "nextAfterCursor": Required[str | None],
  "hasMore": Required[bool],
  "rows": Required[list[dict[str, object]]],
  "totals": Required[object],
  "accountingScope": Required[Literal['unique experiments bound to this TestRun; model-call attempts are counted once; no provider invoice reconciliation']],
  "stageBudgetControl": Required[Literal['NOT_IMPLEMENTED', 'TEST_RUN_CAP_ENFORCED_ROUND_CAP_NOT_IMPLEMENTED', 'TEST_RUN_AND_ROUND_CAP_ENFORCED']],
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
  "positions": NotRequired[list[dict[str, object]]],
  "reservations": NotRequired[list[dict[str, object]]],
})

ArtifactRef = TypedDict("ArtifactRef", {
  "schemaVersion": Required[Literal['artifact-ref.v1']],
  "artifactId": Required[str],
  "testRunId": Required[str],
  "ownerId": Required[str],
  "kind": Required[str],
  "namespace": Required[str],
  "mediaType": NotRequired[str],
  "byteLength": NotRequired[int],
  "sha256": Required[str],
  "status": Required[Literal['PENDING', 'PUBLISHED', 'FAILED', 'RETAINED', 'EXPIRED']],
  "sourceRef": Required[str],
  "createdAt": NotRequired[str],
  "expiresAt": NotRequired[str | None],
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

FillFeeCorrectionCommand = TypedDict("FillFeeCorrectionCommand", {
  "revision": Required[int],
  "previousFee": Required[str],
  "correctedFee": Required[str],
  "effectiveAt": Required[str],
  "evidenceRef": Required[str],
})

HistoricalFakeExecutionCommand = TypedDict("HistoricalFakeExecutionCommand", {
  "authorizationId": Required[str],
  "namespace": Required[str],
  "accountId": Required[str],
  "clientOrderId": Required[str],
  "security": Required[str],
  "requestedQuantity": Required[int],
  "initialAccountCash": NotRequired[str],
  "bar": Required[dict[str, object]],
  "side": NotRequired[Literal['BUY', 'SELL']],
  "orderType": NotRequired[Literal['MARKET', 'LIMIT']],
  "timeInForce": NotRequired[Literal['DAY']],
  "limitPrice": NotRequired[str],
  "participationRate": NotRequired[float],
  "slippageBps": NotRequired[float],
  "currency": NotRequired[str],
  "marketFeeSchedule": NotRequired[dict[str, object]],
  "reservation": NotRequired[dict[str, object]],
})

HistoricalFakeExecutionResult = TypedDict("HistoricalFakeExecutionResult", {
  "result": Required[dict[str, object]],
  "replayed": Required[bool],
})

HistoricalFakeOrderState = TypedDict("HistoricalFakeOrderState", {
  "order_id": Required[str],
  "status": Required[str],
  "rejection_reason": NotRequired[str | None],
})

Money = TypedDict("Money", {
  "amount": Required[str],
  "currency": Required[str],
})

PairedBackupManifest = TypedDict("PairedBackupManifest", {
  "format": NotRequired[Literal['stockquant.paired-backup.v1', 'stockquant.paired-backup.cluster.v2']],
  "backupId": NotRequired[str],
  "createdAt": NotRequired[str],
  "retentionClass": NotRequired[Literal['DAILY', 'MONTH_END']],
  "database": NotRequired[str],
  "databaseInventory": NotRequired[dict[str, object]],
  "artifactVolume": NotRequired[str],
  "restoreValidation": NotRequired[dict[str, object]],
  "files": NotRequired[list[object]],
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

ReplayExecutionAuthorizationCommand = TypedDict("ReplayExecutionAuthorizationCommand", {
  "namespace": Required[str],
  "accountId": Required[str],
  "environmentMode": Required[Literal['BACKTEST']],
  "brokerMode": Required[Literal['FAKE']],
  "command": Required[dict[str, object]],
})

ReplayExecutionAuthorizationResult = TypedDict("ReplayExecutionAuthorizationResult", {
  "authorizationId": Required[str],
})

ReplayExecutionAuthorizationValidation = TypedDict("ReplayExecutionAuthorizationValidation", {
  "authorizationId": Required[str],
  "accountId": Required[str],
  "command": Required[dict[str, object]],
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
  "asOf": NotRequired[str],
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
  "artifactRefs": NotRequired[list[ArtifactRef]],
})

V12StrategySnapshotCommand = TypedDict("V12StrategySnapshotCommand", {
  "ownerId": Required[str],
  "testRunId": Required[str],
  "artifactId": Required[str],
  "artifactSha256": Required[str],
  "fixtureVersion": Required[Literal['v1.2-market-data-4', 'v1.2-market-data-5']],
  "dataVersion": Required[Literal['v1.2-market-data-4', 'v1.2-market-data-5']],
  "factorVersion": Required[Literal['v1.2-momentum-volume-1']],
  "strategyId": Required[Literal['v1.2-qlib-topk-1', 'v1.2-no-trade-1']],
  "strategyHash": Required[str],
  "mode": Required[Literal['TOPK', 'NO_TRADE']],
  "asOf": Required[str],
  "targets": Required[list[V12StrategyTarget]],
})

V12StrategyTarget = TypedDict("V12StrategyTarget", {
  "ticker": Required[str],
  "market": Required[Literal['CN_A', 'US_EQUITY']],
  "currency": Required[Literal['CNY', 'USD']],
  "reason": Required[str],
})

V13AutoMandateCommand = TypedDict("V13AutoMandateCommand", {
  "mandateId": Required[str],
  "mandateVersion": Required[Literal[1]],
  "testRunId": Required[str],
  "accountId": Required[str],
  "strategyVersion": Required[str],
  "market": Required[Literal['CN_A', 'US_EQUITY']],
  "currency": Required[Literal['CNY', 'USD']],
  "securityScope": Required[list[str]],
  "maxOrderAmount": Required[str],
  "maxTotalAmount": Required[str],
  "maxOrderCount": Required[int],
  "validFrom": Required[str],
  "expiresAt": Required[str],
  "reason": Required[str],
  "now": Required[str],
})

V13AutoMandateOrderCommand = TypedDict("V13AutoMandateOrderCommand", {
  "mandateVersion": Required[int],
  "ownerId": Required[str],
  "clientOrderId": Required[str],
  "commandHash": Required[str],
  "proposal": Required[V13AutoMandateProposal],
  "now": Required[str],
})

V13AutoMandateProposal = TypedDict("V13AutoMandateProposal", {
  "proposalId": Required[str],
  "proposalVersion": Required[int],
  "contentHash": Required[str],
  "ownerId": Required[str],
  "testRunId": Required[str],
  "accountId": Required[str],
  "strategyVersion": Required[str],
  "operation": Required[Literal['HOLD', 'REBALANCE']],
  "market": Required[Literal['CN_A', 'US_EQUITY']],
  "currency": Required[Literal['CNY', 'USD']],
  "legs": Required[list[dict[str, object]]],
})

V13AutoMandateSettlementCommand = TypedDict("V13AutoMandateSettlementCommand", {
  "outcome": Required[Literal['CONSUMED', 'RELEASED']],
  "now": Required[str],
})

V13AutoMandateTransitionCommand = TypedDict("V13AutoMandateTransitionCommand", {
  "mandateVersion": Required[int],
  "testRunId": Required[str],
  "contentHash": NotRequired[str],
  "reason": Required[str],
  "now": Required[str],
})

V13AutoPaperExecutionCommand = TypedDict("V13AutoPaperExecutionCommand", {
  "proposalId": Required[str],
  "mandateId": Required[str],
  "mandateVersion": Required[int],
  "ownerId": Required[str],
  "testRunId": Required[str],
  "accountId": Required[str],
  "namespace": Required[str],
  "clientOrderId": Required[str],
  "now": Required[str],
  "executionMode": NotRequired[Literal['IMMEDIATE', 'SEQUENCED']],
})

V13ExecutionAuthorizationCommand = TypedDict("V13ExecutionAuthorizationCommand", {
  "proposalVersion": Required[int],
  "contentHash": Required[str],
  "ownerId": Required[str],
  "testRunId": Required[str],
  "accountId": Required[str],
  "clientOrderId": Required[str],
  "commandHash": Required[str],
  "now": Required[str],
})

V13ExecutionAuthorizationResult = TypedDict("V13ExecutionAuthorizationResult", {
  "authorizationId": Required[str],
  "proposalId": Required[str],
  "proposalVersion": Required[int],
  "contentHash": Required[str],
  "ownerId": Required[str],
  "testRunId": Required[str],
  "accountId": Required[str],
  "clientOrderId": Required[str],
  "commandHash": Required[str],
  "expiresAt": Required[str],
  "status": Required[Literal['ACTIVE']],
  "replayed": NotRequired[bool],
})

V13ExecutionAuthorizationValidation = TypedDict("V13ExecutionAuthorizationValidation", {
  "authorizationId": Required[str],
  "proposalVersion": Required[int],
  "contentHash": Required[str],
  "ownerId": Required[str],
  "testRunId": Required[str],
  "accountId": Required[str],
  "clientOrderId": Required[str],
  "commandHash": Required[str],
  "now": Required[str],
})

V13ManualPaperExecutionCommand = TypedDict("V13ManualPaperExecutionCommand", {
  "proposalId": Required[str],
  "ownerId": Required[str],
  "testRunId": Required[str],
  "accountId": Required[str],
  "namespace": Required[str],
  "clientOrderId": Required[str],
  "now": Required[str],
})

V13PaperStageRunAccepted = TypedDict("V13PaperStageRunAccepted", {
  "accepted": Required[Literal[True]],
  "testRunId": Required[str],
  "status": Required[Literal['WAITING']],
})

V13PaperStageRunRequest = TypedDict("V13PaperStageRunRequest", {
  "scenarioId": Required[Literal['normal', 'rejection', 'recovery']],
  "seed": Required[int],
})

V13PaperStageRunResult = TypedDict("V13PaperStageRunResult", {
  "testRunId": Required[str],
  "stageId": Required[Literal['V1.3']],
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

V13ProposalCommand = TypedDict("V13ProposalCommand", {
  "ownerId": Required[str],
  "testRunId": Required[str],
  "idempotencyKey": Required[str],
  "accountId": Required[str],
  "strategyVersion": Required[str],
  "approvalMode": NotRequired[Literal['MANUAL_APPROVAL', 'AUTO_POLICY']],
  "market": NotRequired[Literal['CN_A', 'US_EQUITY']],
  "currency": NotRequired[Literal['CNY', 'USD']],
  "operation": Required[Literal['HOLD', 'REBALANCE']],
  "environmentMode": Required[Literal['PAPER']],
  "brokerMode": Required[Literal['FAKE']],
  "expiresAt": Required[str],
  "legs": Required[list[V13ProposalLeg]],
})

V13ProposalDecisionCommand = TypedDict("V13ProposalDecisionCommand", {
  "expectedVersion": Required[int],
  "expectedContentHash": Required[str],
  "reason": Required[str],
  "now": Required[str],
})

V13ProposalDecisionResult = TypedDict("V13ProposalDecisionResult", {

})

V13ProposalLeg = TypedDict("V13ProposalLeg", {
  "legId": Required[str],
  "securityId": Required[str],
  "side": Required[Literal['BUY', 'SELL']],
  "quantity": Required[int],
})

V13ProposalResult = TypedDict("V13ProposalResult", {
  "proposalId": Required[str],
  "proposalVersion": Required[int],
  "contentHash": Required[str],
  "status": Required[Literal['MANUAL_APPROVAL_PENDING', 'AUTO_POLICY_PENDING', 'APPROVED_MANUAL', 'REJECTED_MANUAL', 'STALE']],
  "approvalMode": Required[Literal['MANUAL_APPROVAL', 'AUTO_POLICY']],
  "market": Required[Literal['CN_A', 'US_EQUITY']],
  "currency": Required[Literal['CNY', 'USD']],
  "operation": Required[Literal['HOLD', 'REBALANCE']],
  "environmentMode": Required[Literal['PAPER']],
  "brokerMode": Required[Literal['FAKE']],
  "expiresAt": Required[str],
  "legs": Required[list[V13ProposalLeg]],
  "ownerId": Required[str],
  "testRunId": Required[str],
  "accountId": Required[str],
  "strategyVersion": Required[str],
  "replayed": NotRequired[bool],
})

V13ProposalRevisionCommand = TypedDict("V13ProposalRevisionCommand", {
  "expectedVersion": Required[int],
  "expectedContentHash": Required[str],
  "operation": Required[Literal['HOLD', 'REBALANCE']],
  "expiresAt": Required[str],
  "legs": Required[list[V13ProposalLeg]],
  "reason": Required[str],
  "now": Required[str],
})

V15RunIncident = TypedDict("V15RunIncident", {
  "incidentId": Required[str],
  "testRunId": Required[str],
  "alertKey": Required[str],
  "code": Required[str],
  "severity": Required[Literal['BLOCKER', 'ERROR']],
  "title": Required[str],
  "detail": Required[dict[str, object]],
  "state": Required[Literal['OPEN', 'ACKNOWLEDGED', 'RESOLVED']],
  "firstSeenAt": Required[str],
  "lastSeenAt": Required[str],
  "acknowledgedBy": Required[str | None],
  "acknowledgedAt": Required[str | None],
  "resolvedAt": Required[str | None],
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

V24PaperAuthorizationCommand = TypedDict("V24PaperAuthorizationCommand", {
  "grant": Required[V24PaperExecutionGrant],
})

V24PaperAuthorizationResult = TypedDict("V24PaperAuthorizationResult", {
  "authorizationId": Required[str],
  "status": Required[Literal['ACTIVE', 'CONSUMED']],
  "expiresAt": Required[str],
  "scope": Required[dict[str, object]],
})

V24PaperAuthorizationRevokeCommand = TypedDict("V24PaperAuthorizationRevokeCommand", {
  "authorizationId": Required[str],
  "namespace": Required[str],
  "accountId": Required[str],
  "reason": Required[str],
})

V24PaperAuthorizationRevokeResult = TypedDict("V24PaperAuthorizationRevokeResult", {
  "authorizationId": Required[str],
  "status": Required[Literal['REVOKED']],
  "replayed": Required[bool],
  "revokedAt": Required[str],
})

V24PaperAuthorizationValidation = TypedDict("V24PaperAuthorizationValidation", {
  "authorizationId": Required[str],
  "accountId": Required[str],
  "command": Required[V24PaperExecutionGrant],
})

V24PaperExecutionCommand = TypedDict("V24PaperExecutionCommand", {
  "authorizationId": Required[str],
  "grant": Required[V24PaperExecutionGrant],
})

V24PaperExecutionGrant = TypedDict("V24PaperExecutionGrant", {
  "scenarioId": Required[Literal['v24-isolated-snapshot-paper-normal']],
  "scenarioVersion": Required[Literal['2.0.0']],
  "testRunId": Required[str],
  "ownerId": Required[str],
  "namespace": Required[str],
  "accountId": Required[str],
  "clockNow": Required[str],
  "dataMode": Required[Literal['FIXTURE']],
  "environmentMode": Required[Literal['PAPER']],
  "brokerMode": Required[Literal['FAKE']],
  "liveTradingEnabled": Required[Literal[False]],
  "market": Required[Literal['CN_A']],
  "currency": Required[Literal['CNY']],
  "policy": Required[dict[str, object]],
  "mandate": Required[dict[str, object]],
  "signal": Required[dict[str, object]],
  "order": Required[dict[str, object]],
  "snapshot": Required[dict[str, object]],
  "fee": Required[str],
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

V24PaperExecutionResult = TypedDict("V24PaperExecutionResult", {
  "schemaVersion": Required[Literal['v24-paper-execution-result-v2']],
  "replayed": Required[bool],
  "authorization": Required[dict[str, object]],
  "riskEvaluation": Required[dict[str, object]],
  "resourceReservation": Required[ResourceReservation],
  "eligibility": Required[dict[str, object]],
  "order": Required[dict[str, object]],
  "fill": Required[object],
  "outbox": Required[dict[str, object]],
  "reconciliation": Required[dict[str, object]],
})

V24PaperExecutionScenario = TypedDict("V24PaperExecutionScenario", {
  "$schema": NotRequired[str],
  "scenarioId": Required[Literal['v24-isolated-snapshot-paper-normal']],
  "scenarioVersion": Required[Literal['2.0.0']],
  "dataMode": Required[Literal['FIXTURE']],
  "environmentMode": Required[Literal['PAPER']],
  "brokerMode": Required[Literal['FAKE']],
  "liveTradingEnabled": Required[Literal[False]],
  "market": Required[Literal['CN_A']],
  "currency": Required[Literal['CNY']],
  "account": Required[dict[str, object]],
  "policy": Required[dict[str, object]],
  "mandate": Required[dict[str, object]],
  "signal": Required[dict[str, object]],
  "order": Required[dict[str, object]],
  "snapshot": Required[dict[str, object]],
  "risk": Required[dict[str, object]],
  "fee": Required[str],
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
  "scenarioId": Required[Literal['normal', 'rejection', 'recovery', 'external-reconciliation']],
  "seed": Required[int],
})

V24PaperStageRunResult = TypedDict("V24PaperStageRunResult", {
  "testRunId": Required[str],
  "stageId": Required[Literal['V2.4']],
  "scenarioId": Required[Literal['normal', 'rejection', 'recovery', 'external-reconciliation']],
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

V33NormalVerifyCommand = TypedDict("V33NormalVerifyCommand", {
  "schemaVersion": Required[Literal['v3.3-normal-verify-command-v1']],
  "confirmation": Required[Literal['VERIFY_V33_NORMAL_RESULTS']],
})

V33NormalVerifyResult = TypedDict("V33NormalVerifyResult", {
  "schemaVersion": Required[Literal['v3.3-normal-verify-result-v1']],
  "testRunId": Required[str],
  "status": Required[Literal['RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']],
  "idempotent": Required[bool],
  "assertion": Required[dict[str, object]],
  "evidence": Required[dict[str, object]],
})

V33RecoveryVerifyCommand = TypedDict("V33RecoveryVerifyCommand", {
  "schemaVersion": Required[Literal['v3.3-recovery-verify-command-v1']],
  "confirmation": Required[Literal['VERIFY_V33_CHECKPOINT_RECOVERY']],
})

V33RecoveryVerifyResult = TypedDict("V33RecoveryVerifyResult", {
  "schemaVersion": Required[Literal['v3.3-recovery-verify-result-v1']],
  "testRunId": Required[str],
  "status": Required[Literal['RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'WAITING']],
  "idempotent": Required[bool],
  "assertion": Required[dict[str, object] | None],
  "evidence": Required[dict[str, object] | None],
})

V32ReadinessRunRequest = TypedDict("V32ReadinessRunRequest", {
  "scenarioId": Required[Literal['normal', 'rejection', 'recovery']],
  "seed": NotRequired[int],
  "sourceV31TestRunId": NotRequired[str],
})

V32ReadinessRunResult = TypedDict("V32ReadinessRunResult", {
  "accepted": NotRequired[Literal[True]],
  "testRunId": Required[str],
  "stageId": Required[Literal['V3.2']],
  "scenarioId": Required[Literal['normal', 'rejection', 'recovery']],
  "scenarioVersion": Required[Literal['v3.2-readiness-v1']],
  "status": Required[Literal['WAITING']],
  "seed": Required[int],
  "assertions": Required[list[object]],
  "evidence": Required[dict[str, object]],
})

MarketDataAlertAcknowledgeRequest = TypedDict("MarketDataAlertAcknowledgeRequest", {
  "actorId": Required[str],
})

MarketDataAlertIncidents = TypedDict("MarketDataAlertIncidents", {
  "incidents": Required[list[MarketDataAlertIncidentV1]],
})

PublishedMarketDataArtifactTaskContent = TypedDict("PublishedMarketDataArtifactTaskContent", {
  "taskId": Required[str],
  "artifactId": Required[str],
  "fixtureVersion": Required[Literal['v1.2-market-data-1']],
  "sha256": Required[str],
  "contentBase64": Required[str],
  "createdAt": Required[str],
})

MarketDataArtifactTask = TypedDict("MarketDataArtifactTask", {
  "taskId": Required[str],
  "artifactId": Required[str],
  "fixtureVersion": Required[str],
  "status": Required[Literal['QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']],
  "sha256": Required[str | None],
  "error": Required[str | None],
  "fence": Required[int],
  "createdAt": Required[str],
  "updatedAt": Required[str],
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

CollectionScheduleView = TypedDict("CollectionScheduleView", {
  "subscriptionId": Required[str],
  "subscriptionVersion": Required[int],
  "fromDate": Required[str],
  "toDate": Required[str],
  "calendarVersion": Required[str],
  "enabled": Required[bool],
  "version": Required[int],
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

MarketDataLiveNewsPreview = TypedDict("MarketDataLiveNewsPreview", {
  "observedAt": Required[str],
  "items": Required[list[dict[str, object]]],
  "sourceCount": Required[int],
  "deduplicated": Required[bool],
  "status": Required[Literal['PASS', 'PARTIAL']],
})

LiveQuotePreview = TypedDict("LiveQuotePreview", {
  "sourceId": Required[Literal['tencent-quote']],
  "requestedSymbols": Required[list[str]],
  "securities": Required[list[dict[str, object]]],
  "count": Required[int],
  "ingestedAt": Required[str],
  "status": NotRequired[Literal['STALE']],
  "error": NotRequired[str],
})

MarketDataAlertIncidentV1 = TypedDict("MarketDataAlertIncidentV1", {
  "incidentId": Required[str],
  "alertKey": Required[str],
  "code": Required[str],
  "severity": Required[Literal['INFO', 'WARNING', 'CRITICAL']],
  "payload": Required[dict[str, object]],
  "state": Required[Literal['OPEN', 'ACKNOWLEDGED', 'RESOLVED']],
  "firstSeenAt": Required[str],
  "lastSeenAt": Required[str],
  "acknowledgedBy": Required[str | None],
  "acknowledgedAt": Required[str | None],
  "resolvedAt": Required[str | None],
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

MinuteFixtureImportRequest = TypedDict("MinuteFixtureImportRequest", {
  "fixture": NotRequired[Literal['normal', 'bad']],
})

MinuteFixturePreview = TypedDict("MinuteFixturePreview", {
  "fixtureVersion": Required[str],
  "rows": Required[int],
  "securities": Required[int],
  "quality": Required[list[dict[str, object]]],
  "bars": Required[list[dict[str, object]]],
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

MinuteOpenGaps = TypedDict("MinuteOpenGaps", {
  "subscriptionId": Required[str],
  "open": Required[list[dict[str, object]]],
})

MarketDataNewsPreview = TypedDict("MarketDataNewsPreview", {
  "items": Required[list[dict[str, object]]],
  "deduplicated": Required[bool],
  "sourceStatus": Required[str],
})

ProjectDataExportRequest = TypedDict("ProjectDataExportRequest", {
  "projectId": Required[str],
  "dataVersion": Required[str],
  "items": Required[list[object]],
})

ProjectDataExport = TypedDict("ProjectDataExport", {
  "projectId": Required[str],
  "dataVersion": Required[str],
  "rowCount": Required[int],
  "sha256": Required[str],
  "items": Required[list[object]],
})

ProjectDataPageRequest = TypedDict("ProjectDataPageRequest", {
  "projectId": Required[str],
  "dataVersion": Required[str],
  "items": Required[list[object]],
  "cursor": NotRequired[int],
  "pageSize": NotRequired[int],
})

ProjectDataPage = TypedDict("ProjectDataPage", {
  "dataVersion": Required[str],
  "items": Required[list[object]],
  "nextCursor": Required[str | None],
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

MarketDataSamplingConfig = TypedDict("MarketDataSamplingConfig", {
  "intervalMinutes": Required[Literal[20, 30]],
  "allowed": Required[list[Literal[20, 30]]],
  "tradingWindows": Required[list[dict[str, object]]],
  "lunchBreak": Required[list[str]],
  "placeOrders": Required[Literal[False]],
})

MarketDataSamplingUpdate = TypedDict("MarketDataSamplingUpdate", {
  "intervalMinutes": Required[Literal[20, 30]],
})

MarketDataSourceCircuitState = TypedDict("MarketDataSourceCircuitState", {
  "sourceId": Required[str],
  "circuit": Required[Literal['OPEN', 'HEALTHY']],
  "failures": Required[int],
})

MarketDataSourceInventory = TypedDict("MarketDataSourceInventory", {
  "sources": Required[list[dict[str, object]]],
  "checkedAt": Required[str],
  "note": NotRequired[str],
})

MarketDataSourceSmoke = TypedDict("MarketDataSourceSmoke", {
  "checkedAt": Required[str],
  "checks": Required[list[dict[str, object]]],
  "status": Required[Literal['PASS', 'PARTIAL']],
})

V12FixturePreview = TypedDict("V12FixturePreview", {
  "fixtureVersion": Required[Literal['v1.2-market-data-1']],
  "dataMode": Required[Literal['FIXTURE']],
  "barCount": NotRequired[int],
  "securityCount": NotRequired[int],
  "quality": Required[dict[str, object]],
  "bars": Required[list[dict[str, object]]],
})

V12ResearchFixturePreview = TypedDict("V12ResearchFixturePreview", {
  "fixtureVersion": Required[Literal['v1.2-market-data-4', 'v1.2-market-data-5']],
  "dataMode": Required[Literal['FIXTURE']],
  "dailyBarsSha256": Required[str],
  "securities": Required[list[dict[str, object]]],
  "marketSessions": Required[list[dict[str, object]]],
  "bars": Required[list[dict[str, object]]],
})

V22StageRunRequest = TypedDict("V22StageRunRequest", {
  "scenarioId": NotRequired[Literal['normal', 'rejection', 'recovery', 'uploaded-csv']],
  "seed": NotRequired[int],
  "uploadId": NotRequired[str],
  "fileFormat": NotRequired[Literal['CSV', 'PARQUET']],
})

MarketDataWatchlistUpdate = TypedDict("MarketDataWatchlistUpdate", {
  "securities": Required[list[str]],
})

MarketDataWatchlist = TypedDict("MarketDataWatchlist", {
  "securities": Required[list[str]],
  "count": Required[int],
  "max": Required[Literal[100]],
  "priority": NotRequired[str],
})

MultiBarResearchCommand = TypedDict("MultiBarResearchCommand", {
  "runId": NotRequired[str],
  "bars": Required[list[dict[str, object]]],
  "executions": NotRequired[list[object]],
})

MultiBarResearchResult = TypedDict("MultiBarResearchResult", {
  "status": Required[str],
  "adapter": Required[str],
  "dataMode": Required[str],
  "barCount": Required[int],
  "artifactHash": Required[str],
  "assertions": Required[list[object]],
})

QlibSummaryTrainRequest = TypedDict("QlibSummaryTrainRequest", {
  "bars": Required[list[dict[str, object]]],
})

QlibSummaryValidateRequest = TypedDict("QlibSummaryValidateRequest", {
  "bars": Required[list[dict[str, object]]],
  "artifactHash": Required[str],
})

V12FactorPreview = TypedDict("V12FactorPreview", {
  "status": Required[Literal['COMPLETED', 'NOT_RUN']],
  "reason": NotRequired[str],
  "factorVersion": Required[Literal['v1.2-sma-factor-1']],
  "dataVersion": Required[Literal['v1.2-market-data-1']],
  "asOf": Required[str],
  "qlibStatus": Required[str],
  "noTrade": Required[bool],
  "lookbackBars": Required[int],
  "ranking": Required[list[dict[str, object]]],
})

V12QlibProbePreview = TypedDict("V12QlibProbePreview", {
  "adapter": Required[Literal['qlib']],
  "sourceCommit": NotRequired[str],
  "dependencyImage": NotRequired[str],
  "probe": Required[dict[str, object]],
  "executionModel": NotRequired[str],
  "modelCalls": NotRequired[str],
})

V12QlibStrategyArtifact = TypedDict("V12QlibStrategyArtifact", {
  "schemaVersion": Required[Literal['v1.2-qlib-strategy-artifact-v1']],
  "fixtureVersion": Required[Literal['v1.2-market-data-4', 'v1.2-market-data-5']],
  "dailyBarsSha256": Required[str],
  "inputSha256": Required[str],
  "factorVersion": Required[Literal['v1.2-momentum-volume-1']],
  "dataVersion": Required[Literal['v1.2-market-data-4', 'v1.2-market-data-5']],
  "asOf": Required[str],
  "qlibModels": Required[list[dict[str, object]]],
  "predictions": Required[list[dict[str, object]]],
  "strategies": Required[list[dict[str, object]]],
})

V12RDagentProbePreview = TypedDict("V12RDagentProbePreview", {
  "adapter": Required[Literal['rdagent']],
  "executionBoundary": Required[str],
  "dockerSocketMounted": Required[bool],
  "codeProbe": Required[dict[str, object]],
  "modelCalls": Required[str],
  "reason": NotRequired[str],
})

FakeBrokerCancellationResult = TypedDict("FakeBrokerCancellationResult", {
  "outcome": Required[Literal['ACCEPTED', 'REJECTED']],
  "reason": Required[str],
  "sequence": Required[int],
})

FakeBrokerSimulatedExternalOrder = TypedDict("FakeBrokerSimulatedExternalOrder", {
  "namespace": Required[str],
  "externalOrderId": Required[str],
  "clientOrderId": NotRequired[str],
  "security": Required[str],
  "requestedQuantity": Required[int],
  "status": Required[Literal['NEW', 'PARTIALLY_FILLED', 'FILLED', 'CANCELLED', 'REJECTED', 'UNKNOWN']],
  "evidenceRef": Required[str],
  "observedAt": Required[str],
})

FakeBrokerSimulatedFillReport = TypedDict("FakeBrokerSimulatedFillReport", {
  "externalFillId": Required[str],
  "sequence": Required[int],
  "cumulativeQuantity": Required[int],
  "price": Required[str],
  "fee": Required[str],
  "effectiveAt": Required[str],
  "evidenceRef": Required[str],
})

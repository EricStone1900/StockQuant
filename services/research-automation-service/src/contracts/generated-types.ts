// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/**/*.schema.json

export type HistoricalReplayAccepted = {
  "accepted": true;
  "testRunId": string;
  "status": 'RUNNING';
}

export type HistoricalReplayBar = {
  "timestamp": string;
  "open": string;
  "volume": number;
}

export type HistoricalReplayCommand = {
  "testRunId": string;
  "namespace": string;
  "ownerId": string;
  "scenarioId": 'normal' | 'recovery';
  "seed": number;
  "bar": HistoricalReplayBar;
}

export type HistoricalReplayMultiCommand = {
  "testRunId": string;
  "namespace": string;
  "ownerId": string;
  "scenarioId": 'normal' | 'recovery';
  "seed": number;
  "bars": Array<HistoricalReplayBar>;
}

export type HistoricalReplayRun = {
  "testRunId": string;
  "namespace": string;
  "ownerId": string;
  "scenarioId": 'normal' | 'recovery';
  "status": 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  "checkpoint": Record<string, unknown>;
  "result": Record<string, unknown> | null;
  "createdAt": string;
  "completedAt": string | null;
}

export type QlibFitFixtureRequest = {
  "schemaVersion": 'qlib-fit-fixture-v1';
  "sourceMode": 'FIXTURE';
  "featureRows": Array<Array<number>>;
  "labels": Array<number>;
  "splits": {
  "train": Array<unknown>;
  "valid": Array<unknown>;
  "test": Array<unknown>;
};
}

export type QlibFitFixtureResult = {
  "schemaVersion": 'qlib-fit-fixture-result-v1';
  "status": 'COMPLETED';
  "sourceMode": 'FIXTURE';
  "modelTraining": 'PASS';
  "modelValidation": 'NOT_RUN';
  "candidateSourceExecution": 'NOT_PERFORMED';
  "qlibVersion": string;
  "lightgbmVersion": string;
  "model": 'qlib.contrib.model.gbdt.LGBModel';
  "segments": {
  "train": {
  "start": number;
  "end": number;
  "rows": number;
};
  "valid": {
  "start": number;
  "end": number;
  "rows": number;
};
  "test": {
  "start": number;
  "end": number;
  "rows": number;
};
};
  "testPredictionCount": number;
  "testPredictionsFinite": true;
  "testPredictionsSha256": string;
  "modelSha256": string;
  "evaluationMetrics": Record<string, unknown>;
  "tracking": 'temporary SQLite under /tmp; removed with the worker container';
  "profitabilityClaim": 'NOT_MADE';
}

export type V31ArtifactPublishCommand = {
  "ref": V31ResearchArtifactRef;
  "contentBase64": string;
  "jobId"?: string;
  "workerId"?: string;
  "fencingToken"?: number;
}

export type V31ArtifactPublishResult = {
  "status": 'PUBLISHED';
  "persisted": boolean;
  "ref": V31ResearchArtifactRef;
}

export type V31ArtifactReadCommand = {
  "namespace": string;
  "artifactId": string;
}

export type V31ResearchArtifactRef = {
  "schemaVersion": 'v3.1-artifact-ref-v1';
  "artifactId": string;
  "kind": 'INPUT' | 'GENERATED_CODE' | 'RUN_LOG' | 'METRICS' | 'ERROR' | 'CANDIDATE' | 'OUTPUT';
  "namespace": string;
  "sha256": string;
  "status": 'PENDING' | 'PUBLISHED' | 'FAILED' | 'RETAINED';
  "sourceRef": string;
}

export type V31ExperimentBudgetResult = {
  "experimentId": string;
  "requestedCents": number;
  "reservedCents": number;
  "spentCents": number;
  "status": 'RESERVED' | 'SETTLED' | 'UNKNOWN' | 'REJECTED';
}

export type V31ExperimentBudgetSettleCommand = {
  "spentCents": number | 'UNKNOWN';
}

export type V31ExperimentCancellationResult = {
  "testRunId"?: string;
  "experimentId": string;
  "fixtureId": string;
  "modelProfile": string;
  "rounds": number;
  "budgetCurrency": 'USD';
  "budgetCents": number;
  "environmentMode": 'RESEARCH';
  "brokerMode": 'FAKE';
  "idempotencyKey": string;
  "status": 'CANCELLED';
  "reason": string;
  "createdAt": string;
  "cancelledAt": string;
}

export type V31ExperimentResult = {
  "testRunId"?: string;
  "experimentId": string;
  "fixtureId": string;
  "modelProfile": string;
  "rounds": number;
  "budgetCurrency": 'USD';
  "budgetCents": number;
  "environmentMode": 'RESEARCH';
  "brokerMode": 'FAKE';
  "idempotencyKey": string;
  "status": 'PENDING_PREREQUISITES' | 'CANCELLED';
  "reason": string;
  "createdAt": string;
  "cancelledAt": string | null;
  "budget": {
  "experimentId": string;
  "requestedCents": number;
  "reservedCents": number;
  "spentCents": number;
  "status": 'RESERVED' | 'SETTLED' | 'UNKNOWN' | 'REJECTED';
};
}

export type V31ExperimentRequest = {
  "testRunId"?: string;
  "fixtureId": string;
  "modelProfile": string;
  "rounds": number;
  "budgetCurrency": 'USD';
  "budgetCents": number;
  "environmentMode": 'RESEARCH';
  "brokerMode": 'FAKE';
  "idempotencyKey": string;
}

export type ExactV31HumanAcceptanceCommand = {
  "confirmation": 'ACCEPT_EXACT_V31_RUN';
  "note": string;
}

export type V31ModelGatewayFixtureCommand = {
  "experimentId": string;
  "modelRunId": string;
  "requestedCents": number;
  "scenario": 'COMPLETED' | 'TIMEOUT' | 'OVER_BUDGET';
}

export type V31ModelGatewayFixtureResult = {
  "providerMode": 'FIXTURE';
  "modelCalls": 'NO_EXTERNAL_CALL';
  "status": 'BLOCKED' | 'ALREADY_EXISTS' | 'UNKNOWN' | 'COMPLETED';
  "modelRunId": string;
  "reason"?: string;
  "budgetStatus"?: 'RESERVED' | 'DISPATCHED' | 'UNKNOWN' | 'SETTLED' | 'REJECTED';
  "actualCostCents"?: number;
  "response"?: Record<string, unknown>;
}

export type V31ExactRunPromotionGate = {
  "schemaVersion": 'v3.1-promotion-gate-v1';
  "testRunId": string;
  "stageStatus": 'PASS' | 'NOT_RUN';
  "humanAcceptance": 'ACCEPTED' | 'NOT_RUN';
  "evidenceSha256": string;
  "acceptedBy"?: string;
  "acceptedAt"?: string;
  "note"?: string;
}

export type V31ResearchRuntimeConfiguration = {
  "schemaVersion": 'v3.1-research-runtime-v1';
  "environmentMode": 'RESEARCH';
  "brokerMode": 'FAKE';
  "runner": {
  "mode": 'NOT_CONFIGURED' | 'ISOLATED';
  "imageDigest": string | null;
};
  "modelGateway": {
  "mode": 'NOT_CONFIGURED' | 'LIVE';
  "provider": string | null;
  "model": string | null;
  "baseUrl": string | null;
  "credentialRef": string | null;
  "embedding": {
  "provider": string | null;
  "model": string | null;
  "dimensions": 1024;
  "baseUrl": string | null;
  "credentialRef": string | null;
};
};
  "execution": {
  "budgetCurrency": 'USD';
  "defaultRounds": number;
  "maxRounds": 3;
  "defaultBudgetCents": number;
  "maxExperimentBudgetCents": 1000;
  "stageBudgetCents": 3000;
  "budgetWarningPercent": number;
  "workerConcurrency": 1;
};
  "security": {
  "outboundPolicy": 'DENY' | 'ALLOWLIST';
  "outboundAllowlist": Array<string>;
  "dockerSocket": 'DENY';
  "brokerWrites": 'FAKE_ONLY';
};
  "artifacts": {
  "hashAlgorithm": 'SHA-256';
  "namespacePattern": 'research/{testRunId}/{experimentId}';
  "retainFailed": true;
};
}

export type V31RunnerClaimCommand = {
  "workerId": string;
  "testRunId"?: string;
}

export type V31RunnerCompleteCommand = {
  "workerId": string;
  "fencingToken": number;
  "execution": V31RunnerExecution;
  "artifacts"?: Array<V31ResearchArtifactRef>;
}

export type V31RunnerExecution = {
  "status": 'COMPLETED' | 'FAILED' | 'TIMED_OUT' | 'OUTPUT_LIMIT' | 'SPAWN_FAILED';
  "exitCode": number | null;
  "signal": 'SIGABRT' | 'SIGALRM' | 'SIGBUS' | 'SIGCHLD' | 'SIGCONT' | 'SIGFPE' | 'SIGHUP' | 'SIGILL' | 'SIGINT' | 'SIGIO' | 'SIGIOT' | 'SIGKILL' | 'SIGPIPE' | 'SIGPOLL' | 'SIGPROF' | 'SIGPWR' | 'SIGQUIT' | 'SIGSEGV' | 'SIGSTKFLT' | 'SIGSTOP' | 'SIGSYS' | 'SIGTERM' | 'SIGTRAP' | 'SIGTSTP' | 'SIGTTIN' | 'SIGTTOU' | 'SIGURG' | 'SIGUSR1' | 'SIGUSR2' | 'SIGVTALRM' | 'SIGWINCH' | 'SIGXCPU' | 'SIGXFSZ' | null;
  "stdout": string;
  "stderr": string;
  "durationMs": number;
}

export type V31RunnerInputBundle = {
  "schemaVersion": 'v3.1-runner-input-bundle-v1';
  "script": string;
  "files": Array<{
  "path": string;
  "contentBase64": string;
}>;
}

export type V31RunnerInputRequest = {
  "workerId": string;
  "fencingToken": number;
}

export type V31RunnerInputResponse = {
  "ref": V31ResearchArtifactRef;
  "contentBase64": string;
}

export type V31RunnerJobDispatchResult = {
  "jobId": string;
  "job": V31RunnerJob;
  "status": 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TIMED_OUT' | 'OUTPUT_LIMIT' | 'SPAWN_FAILED' | 'CANCELLED';
  "submittedAt": string;
  "startedAt": string | null;
  "completedAt": string | null;
  "execution": 'NOT_STARTED' | V31RunnerExecution | null;
  "artifacts": Array<V31ResearchArtifactRef>;
  "attempt": number;
  "retryOf": string | null;
  "lease": V31RunnerLease | null;
  "prerequisiteStatus": 'PENDING_PREREQUISITES' | 'CONFIGURED';
}

export type V31RunnerJobRecord = {
  "jobId": string;
  "job": V31RunnerJob;
  "status": 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TIMED_OUT' | 'OUTPUT_LIMIT' | 'SPAWN_FAILED' | 'CANCELLED';
  "submittedAt": string;
  "startedAt": string | null;
  "completedAt": string | null;
  "execution": V31RunnerExecution | null;
  "artifacts": Array<V31ResearchArtifactRef>;
  "attempt": number;
  "retryOf": string | null;
  "lease": V31RunnerLease | null;
  "claimStatus"?: 'LEASED';
}

export type V31RunnerJob = {
  "schemaVersion": 'v3.1-runner-job-v1';
  "testRunId": string;
  "experimentId": string;
  "imageDigest": string;
  "inputArtifact": string;
  "outputNamespace": string;
  "resources": {
  "cpuMilli": number;
  "memoryMiB": number;
  "timeoutSeconds": number;
  "pidsLimit": number;
};
  "networkPolicy": {
  "mode": 'DENY' | 'ALLOWLIST';
  "allowlist": Array<string>;
};
}

export type V31RunnerLease = {
  "workerId": string;
  "fencingToken": number;
  "expiresAt": string;
}

export type V32CandidateArtifactResult = {
  "schemaVersion": 'v3.2-candidate-artifact-result-v1';
  "promotionRequestId": string;
  "ref": V31ResearchArtifactRef;
  "contentBase64": string;
}

export type V32CandidateMandateBindingCommand = {
  "schemaVersion": 'v3.2-candidate-mandate-binding-command-v1';
  "mandateId": string;
  "testRunId": string;
  "ownerId": string;
  "accountId": string;
  "market": 'CN_A';
  "environmentMode": 'PAPER';
  "brokerMode": 'FAKE';
  "strategyVersion": string;
  "candidateArtifact": {
  "artifactId": string;
  "namespace": string;
  "sha256": string;
};
}

export type V32CandidateMandateBindingResult = unknown & unknown & unknown

export type V32PromotionDataManifest = {
  "schemaVersion": 'v3.2-data-manifest-v1';
  "testRunId": string;
  "experimentId": string;
  "dataMode": 'FIXTURE' | 'RECORDED' | 'REAL';
  "dataVersion": string;
  "dataContentSha256": string;
}

export type V32IndependentValidationEvidenceBundle = {
  "PIT": V32IndependentValidationEvidence;
  "OUT_OF_SAMPLE": V32IndependentValidationEvidence;
  "COST": V32IndependentValidationEvidence;
  "RULES": V32IndependentValidationEvidence;
  "CAPACITY": V32IndependentValidationEvidence;
}

export type V32IndependentValidationEvidence = {
  "evidenceSha256": string;
  "details": Record<string, unknown>;
}

export type V32IndependentValidationInput = {
  "schemaVersion": 'v3.2-independent-validation-input-v1';
  "promotionRequestId": string;
  "requestFingerprint": string;
  "request": V32PromotionRequest;
}

export type V32IndependentValidationReport = {
  "schemaVersion": 'v3.2-independent-validation-report-v1';
  "promotionRequestId": string;
  "testRunId": string;
  "sourceMode": 'FIXTURE' | 'REAL_CANDIDATE';
  "disposition": 'ELIGIBLE_FOR_REVIEW' | 'REJECTED' | 'INCOMPLETE';
  "reason": 'ALL_REQUIRED_CHECKS_PASSED' | 'REQUIRED_CHECK_FAILED' | 'REQUIRED_CHECK_NOT_RUN';
  "checks": Array<{
  "checkId": 'PIT' | 'OUT_OF_SAMPLE' | 'COST' | 'RULES' | 'CAPACITY';
  "status": 'PASS' | 'FAIL' | 'NOT_RUN';
  "evidenceSha256": string;
}>;
  "registryMutation": 'NOT_PERFORMED';
}

export type V32IndependentValidationResult = {
  "schemaVersion": 'v3.2-independent-validation-result-v1';
  "promotionRequestId": string;
  "reportFingerprint": string;
  "report": V32IndependentValidationReport;
  "evidence": V32IndependentValidationEvidenceBundle;
  "createdAt": string;
  "idempotent": boolean;
}

export type V32IndependentValidationSubmission = {
  "schemaVersion": 'v3.2-independent-validation-submission-v1';
  "report": V32IndependentValidationReport;
  "evidence": V32IndependentValidationEvidenceBundle;
}

export type V32PlatformPromotionEvidence = {
  "request": V32PromotionRequestDetail;
  "validationReport": null | V32IndependentValidationResult;
  "registryMutation": 'NOT_PERFORMED' | 'CANDIDATE_APPROVED' | 'NOT_REGISTERED';
  "activation": 'DISABLED_UNTIL_MANDATE';
  "testRunId": string;
}

export type V32PromotionDecisionCommand = {
  "schemaVersion": 'v3.2-promotion-decision-command-v1';
  "decision": 'APPROVE' | 'REJECT';
  "confirmation": 'REVIEW_EXACT_PROMOTION_VERSION';
  "reportFingerprint": string;
  "actorId": string;
}

export type V32PromotionDecisionResult = {
  "schemaVersion": 'v3.2-promotion-decision-result-v1';
  "promotionRequestId": string;
  "decision": 'APPROVE' | 'REJECT';
  "reportFingerprint": string;
  "versionFingerprint": string;
  "actorId": string;
  "registryStatus": 'CANDIDATE_APPROVED' | 'NOT_REGISTERED';
  "activation": 'DISABLED_UNTIL_MANDATE';
  "createdAt": string;
  "idempotent": boolean;
}

export type V32PromotionRegistryVersion = {
  "schemaVersion": 'v3.2-promotion-registry-version-v1';
  "promotionRequestId": string;
  "versionFingerprint": string;
  "candidateArtifact": {
  "artifactId": string;
  "namespace": string;
  "sha256": string;
};
  "codeSha256": string;
  "dataManifestSha256": string;
  "metricsManifestSha256": string;
  "validationPlanSha256": string;
  "approvedBy": string;
  "status": 'CANDIDATE_APPROVED';
  "activation": 'DISABLED_UNTIL_MANDATE';
}

export type V32PromotionRequestDetail = {
  "schemaVersion": 'v3.2-promotion-request-detail-v1';
  "promotionRequestId": string;
  "request": V32PromotionRequest;
  "status": 'AWAITING_INDEPENDENT_VALIDATION' | 'AWAITING_REVIEW' | 'VALIDATION_INCOMPLETE' | 'REJECTED' | 'CANDIDATE_APPROVED';
  "createdAt": string;
  "decision": null | {
  "decision": 'APPROVE' | 'REJECT';
  "reportFingerprint": string;
  "versionFingerprint": string;
  "actorId": string;
  "registryStatus": 'CANDIDATE_APPROVED' | 'NOT_REGISTERED';
  "activation": 'DISABLED_UNTIL_MANDATE';
};
}

export type V32PromotionRequestResult = {
  "schemaVersion": 'v3.2-promotion-request-result-v1';
  "promotionRequestId": string;
  "testRunId": string;
  "status": 'AWAITING_INDEPENDENT_VALIDATION';
  "createdAt": string;
  "idempotent": boolean;
}

export type V32PromotionRequest = {
  "schemaVersion": 'v3.2-promotion-request-v1';
  "promotionRequestId": string;
  "testRunId": string;
  "experimentId": string;
  "candidateSource": 'RD_AGENT' | 'FIXTURE';
  "candidateArtifact": {
  "artifactId": string;
  "namespace": string;
  "sha256": string;
};
  "codeSha256": string;
  "dataManifestSha256": string;
  "metricsManifestSha256": string;
  "validationPlanSha256": string;
  "budget": {
  "allocationId": string;
  "currency": 'USD';
  "reservedMinor": number;
  "consumedMinor": number;
};
  "idempotencyKey": string;
}

export type V32PromotionScenarioFixture = unknown & unknown

export type V32PromotionRequestSubmissionCommand = {
  "testRunId": string;
  "experimentId": string;
}

export type V32PromotionRequestSubmissionResult = {
  "status": 'WAITING' | 'SUBMITTED' | 'SUBMISSION_UNKNOWN';
  "testRunId"?: string;
  "blockers"?: Array<string>;
  "quantResult"?: null;
  "promotionRequestId"?: string;
  "quantStatus"?: 'AWAITING_INDEPENDENT_VALIDATION';
  "idempotent"?: boolean;
  "idempotencyKey"?: string;
  "reason"?: string;
}

export type V32UserPromotionDecisionCommand = {
  "decision": 'APPROVE' | 'REJECT';
  "confirmation": 'REVIEW_EXACT_PROMOTION_VERSION';
}

export type V32UserPromotionDecisionResult = {
  "schemaVersion": 'v3.2-user-promotion-decision-result-v1';
  "testRunId": string;
  "decision": V32PromotionDecisionResult;
}

export type V32OwnerScopedSubmitConfirmation = {
  "confirmation": 'SUBMIT_V32_PROMOTION_REQUEST';
}

export type V32OwnerScopedPromotionRequestSubmitResult = {
  "status": 'WAITING' | 'SUBMITTED' | 'SUBMISSION_UNKNOWN';
  "testRunId": string;
  "ownerId": string;
  "humanAcceptance": 'NOT_CHANGED';
  "promotionRequestId"?: string;
  "blockers"?: Array<string>;
  "reason"?: string;
}

export type V32PromotionValidationPlan = {
  "schemaVersion": 'v3.2-validation-plan-v1';
  "testRunId": string;
  "experimentId": string;
  "candidateSource": 'RD_AGENT' | 'FIXTURE';
  "dataManifestSha256": string;
  "candidateOutputPath": string;
  "generatedCodeOutputPath": string;
  "metricsOutputPath": string;
}

export type V33ReadinessRun = {
  "accepted"?: boolean;
  "testRunId": string;
  "stageId": 'V3.3';
  "scenarioId": 'normal' | 'rejection' | 'recovery';
  "scenarioVersion": 'v3.3-readiness-v1';
  "status": 'WAITING';
  "seed": number;
  "assertions": Array<{
  "id": string;
  "status": 'NOT_RUN';
  "reason"?: string;
}>;
  "evidence": {
  "readiness": 'WAITING';
  "blockers": Array<{
  "id": string;
  "status": 'VERIFIED' | 'NOT_VERIFIED' | 'NOT_PROVIDED' | 'NOT_IMPLEMENTED';
  "reason": string;
}>;
  "runnerDispatch": 'NOT_PERFORMED';
  "runnerJobsCreated": 0;
  "externalModelCalls": 0;
  "paperContinuity": 'NOT_CHECKED';
};
  "createdAt"?: string;
  "completedAt"?: string | null;
}

export type V33ReadinessRunRequest = {
  "scenarioId": 'normal' | 'rejection' | 'recovery';
  "seed"?: number;
  "sourceV31TestRunId"?: string;
  "promotionRequestId"?: string;
}

export type V33RunnerBudget = {
  "schemaVersion": 'v3.3-runner-budget-v1';
  "testRunId": string;
  "offset": number;
  "limit": number;
  "hasMore": boolean;
  "rows": Array<{
  "jobId": string;
  "experimentId": string;
  "requestedCents"?: number;
  "reservedCents"?: number;
  "settledCents"?: number;
  "unknownReservedCents"?: number;
  "status": 'RESERVED' | 'SETTLED' | 'UNKNOWN' | 'REJECTED' | 'NOT_FOUND';
  "source": 'POSTGRES_LEDGER' | 'IN_MEMORY_LEDGER' | 'LEDGER';
}>;
  "coverage": {
  "jobsOnPage": number;
  "experimentsOnPage": number;
  "budgetsFound": number;
  "budgetsMissing": number;
};
  "note": string;
}

export type V33RunnerCursorQueue = {
  "schemaVersion": 'v3.3-runner-cursor-queue-v1';
  "testRunId": string;
  "afterCursor": string | null;
  "limit": number;
  "hasMore": boolean;
  "nextAfterCursor": string | null;
  "jobs": Array<{
  "jobId": string;
  "job": V31RunnerJob;
  "status": 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TIMED_OUT' | 'OUTPUT_LIMIT' | 'SPAWN_FAILED' | 'CANCELLED';
  "submittedAt": string;
  "startedAt": string | null;
  "completedAt": string | null;
  "execution": Record<string, unknown> | null;
  "artifacts": Array<V31ResearchArtifactRef>;
  "attempt": number;
  "retryOf": string | null;
  "lease": null | {
  "workerId": string;
  "fencingToken": number;
  "expiresAt": string;
};
}>;
}

export type V33RunnerQueue = {
  "schemaVersion": 'v3.3-runner-queue-v1';
  "testRunId": string;
  "offset": number;
  "limit": number;
  "hasMore": boolean;
  "jobs": Array<{
  "jobId": string;
  "job": V31RunnerJob;
  "status": 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'TIMED_OUT' | 'OUTPUT_LIMIT' | 'SPAWN_FAILED' | 'CANCELLED';
  "submittedAt": string;
  "startedAt": string | null;
  "completedAt": string | null;
  "execution": Record<string, unknown> | null;
  "artifacts": Array<V31ResearchArtifactRef>;
  "attempt": number;
  "retryOf": string | null;
  "lease": null | {
  "workerId": string;
  "fencingToken": number;
  "expiresAt": string;
};
}>;
}

export type InitializeAccountCommand = {
  "fixtureAccountRef": string;
  "ownerId": string;
  "market": 'CN_A' | 'US_EQUITY';
  "environmentMode": 'PAPER' | 'BACKTEST';
  "brokerMode": 'FAKE';
  "initialCash": Money;
  "namespace": string;
  "testRunId": string;
  "idempotencyKey": string;
}

export type AccountInitializationFixture = {
  "$schema"?: string;
  "fixtureVersion": string;
  "dataMode": 'FIXTURE';
  "simulationOnly": true;
  "accounts": Array<{
  "fixtureAccountRef": string;
  "ownerRef": string;
  "market": 'CN_A' | 'US_EQUITY';
  "baseCurrency": string;
  "environmentMode": 'PAPER';
  "brokerMode": 'FAKE';
  "initialCash": Money;
  "initialPositions": Array<unknown>;
  "expected": {
  "initializationLedgerEntries": 1;
  "cashAfterInitialization": Money;
  "positionsAfterInitialization": 0;
};
}>;
}

export type AccountSnapshot = {
  "accountId": string;
  "namespace": string;
  "testRunId": string;
  "ownerId": string;
  "fixtureAccountRef": string;
  "market": 'CN_A' | 'US_EQUITY';
  "environmentMode": 'PAPER' | 'BACKTEST';
  "brokerMode": 'FAKE';
  "cash": Money;
  "positionCount": number;
  "ledgerEntryCount": number;
  "ledgerVersion": number;
}

export type ClockContext = unknown

export type ErrorResponse = {
  "code": string;
  "message": string;
  "category": 'AUTHENTICATION' | 'AUTHORIZATION' | 'VALIDATION' | 'CONFLICT' | 'DEPENDENCY' | 'INTERNAL';
  "retryable": boolean;
  "correlationId": string;
  "details"?: Record<string, unknown>;
  "acceptanceStatus"?: 'KNOWN' | 'UNKNOWN';
}

export type HistoricalFakeExecutionCommand = {
  "authorizationId": string;
  "namespace": string;
  "accountId": string;
  "clientOrderId": string;
  "security": string;
  "requestedQuantity": number;
  "bar": {
  "timestamp": string;
  "open": string;
  "volume": number;
};
  "side"?: 'BUY' | 'SELL';
  "orderType"?: 'MARKET' | 'LIMIT';
  "timeInForce"?: 'DAY';
  "limitPrice"?: string;
  "participationRate"?: number;
  "slippageBps"?: number;
  "currency"?: string;
  "reservation"?: {
  "reservationId": string;
  "ownerId": string;
  "testRunId": string;
  "clientOrderId": string;
};
}

export type HistoricalFakeExecutionResult = {
  "result": {
  "orderId": string;
  "status": 'FILLED' | 'PARTIALLY_FILLED' | 'REJECTED' | 'CANCEL_REQUESTED' | 'CANCELLED' | 'EXPIRED' | 'UNKNOWN';
  "brokerMode": 'FAKE';
  "rejectionReason"?: 'ZERO_VOLUME' | 'INVALID_BAR' | 'LIMIT_NOT_MARKETABLE' | 'INVALID_RULE';
  "fill"?: {
  "externalFillId": string;
  "quantity": number;
  "price": string;
  "fee": string;
  "effectiveAt": string;
};
};
  "replayed": boolean;
}

export type Money = {
  "amount": string;
  "currency": string;
}

export type PairedBackupManifest = {
  "format": 'stockquant.paired-backup.v1';
  "backupId": string;
  "createdAt": string;
  "retentionClass": 'DAILY' | 'MONTH_END';
  "database": string;
  "artifactVolume": string;
  "restoreValidation": {
  "status": 'PASS';
  "checkedAt": string;
  "publishedArtifactRefs": number;
  "method": 'PG_RESTORE_AND_ARTIFACT_SHA256';
};
  "files": Array<{
  "path": string;
  "bytes": number;
  "sha256": string;
}>;
}

export type QuantCandidateRegistrationCommand = {
  "candidateId"?: string;
  "qlibVersion": '0.9.6';
  "algorithm": 'deterministic-sma';
  "artifactHash": string;
  "approvedBy"?: string;
}

export type QuantCandidateRegistrationResult = {
  "candidateId": string;
  "qlibVersion": '0.9.6';
  "algorithm": 'deterministic-sma';
  "artifactHash": string;
  "approvedBy": string;
  "status": 'CANDIDATE_APPROVED';
  "activation": 'DISABLED_UNTIL_MANDATE';
  "createdAt": string;
  "idempotent": boolean;
}

export type ReservedFillCommand = {
  "namespace": string;
  "externalFillId": string;
  "security": string;
  "quantity": number;
  "price": string;
  "fee": string;
  "currency": string;
  "effectiveAt": string;
  "side"?: 'BUY' | 'SELL';
  "reservation"?: {
  "reservationId": string;
  "ownerId": string;
  "testRunId": string;
  "clientOrderId": string;
};
}

export type ResourceReservationCommand = {
  "side"?: 'BUY';
  "cashAmount"?: string;
  "security"?: null;
  "quantity"?: null;
} | {
  "side"?: 'SELL';
  "cashAmount"?: null;
  "security"?: string;
  "quantity"?: number;
}

export type ResourceReservationResolution = {
  "outcome": 'FILLED' | 'CANCELLED' | 'REJECTED' | 'EXPIRED' | 'UNKNOWN';
  "evidenceRef": string;
}

export type ResourceReservation = {
  "reservationId": string;
  "accountId": string;
  "namespace": string;
  "testRunId": string;
  "ownerId": string;
  "idempotencyKey": string;
  "clientOrderId": string;
  "side": 'BUY' | 'SELL';
  "currency": string;
  "cashAmount": string | null;
  "security": string | null;
  "quantity": number | null;
  "capturedCashAmount": string;
  "capturedQuantity": number;
  "status": 'HELD' | 'UNKNOWN' | 'CAPTURED' | 'RELEASED';
  "evidenceRef": string | null;
}

export type Security = {
  "securityId": string;
  "market": 'CN_A' | 'US_EQUITY';
  "listingVenue": string;
  "instrumentType": 'COMMON_STOCK';
  "quoteCurrency": string;
  "tickerAliases": Array<{
  "ticker": string;
  "effectiveFrom": string;
  "effectiveTo"?: string | null;
}>;
}

export type TestRun = {
  "testRunId": string;
  "stageId": string;
  "scenarioId": string;
  "scenarioVersion": string;
  "namespace": string;
  "ownerId"?: string;
  "accountId"?: string | null;
  "market"?: 'CN_A' | 'US_EQUITY' | 'MULTI';
  "environmentMode": 'BACKTEST' | 'PAPER' | 'SHADOW';
  "brokerMode": 'FAKE';
  "dataMode": 'FIXTURE' | 'RECORDED' | 'REAL';
  "executionModel"?: 'NONE' | 'DAILY_BAR' | 'MINUTE_BAR' | 'SNAPSHOT';
  "clock": ClockContext;
  "status": 'QUEUED' | 'RUNNING' | 'WAITING' | 'CANCELLING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  "seed": number;
  "faultPlan"?: Array<Record<string, unknown>>;
  "actualFaultSequence"?: Array<Record<string, unknown>>;
  "createdAt": string;
  "completedAt"?: string | null;
  "artifactRefs"?: Array<Record<string, unknown>>;
}

export type V24ObservationRevisionList = {
  "testRunId": string;
  "revisions": Array<V24ObservationRevision>;
}

export type V24ObservationRevision = {
  "revisionId": string;
  "testRunId": string;
  "stageId": 'V2.4';
  "priorStatus": 'COMPLETED';
  "priorAssertions": Array<Record<string, unknown>>;
  "priorEvidence": Record<string, unknown>;
  "priorCreatedAt": string;
  "priorCompletedAt": string | null;
  "reason": 'OBSERVATION_EVENT_ERRORS';
  "recordedAt": string;
}

export type V24PaperExecutionPolicy = {
  "schemaVersion": 'v24-paper-execution-policy-v1';
  "policyId": 'v24-snapshot-paper-policy';
  "policyVersion": '1.0.0';
  "status": 'PREPARATION_ONLY';
  "environmentMode": 'PAPER';
  "brokerMode": 'FAKE';
  "liveTradingEnabled": false;
  "supportedMarkets": ['CN_A'];
  "signal": {
  "frequency": 'DAILY_BAR';
  "asOfRequired": true;
  "strategyVersion": 'UNSET';
};
  "execution": {
  "model": 'SNAPSHOT';
  "windowTimeZone": 'Asia/Shanghai';
  "windowStart": '09:31';
  "windowEndExclusive": '09:35';
  "requiresMandate": true;
  "mandateVersion": 'UNSET';
};
  "quoteRules": {
  "priceBasis": 'FIRST_QUALIFYING_SNAPSHOT';
  "mustBeObservedAfterAcceptance": true;
  "freshnessLimitSeconds": 1800;
  "maxDeviationBps": number | null;
};
  "approval": {
  "riskPolicyVersion": 'UNSET';
  "feePolicyVersion": 'UNSET';
};
  "risk": {
  "requiresPassingEvaluation": true;
  "requiresResourceReservation": true;
};
  "configurationGaps": Array<'STRATEGY_VERSION' | 'MANDATE_VERSION' | 'MAX_DEVIATION_BPS' | 'RISK_POLICY_VERSION' | 'FEE_POLICY_VERSION' | 'US_MARKET_POLICY'>;
}

export type V24PaperMandate = {
  "schemaVersion": 'v24-paper-mandate-v1';
  "mandateId": 'UNSET';
  "mandateVersion": 'UNSET';
  "status": 'PREPARATION_ONLY';
  "ownerId": 'UNSET';
  "accountId": 'UNSET';
  "namespace": 'UNSET';
  "testRunId": 'UNSET';
  "market": 'CN_A';
  "strategyVersion": 'UNSET';
  "securityScope": [];
  "limits": {
  "maxOrderNotional": null;
  "maxGrossExposure": null;
  "maxDailyTurnover": null;
};
  "validity": {
  "validFrom": null;
  "validUntil": null;
};
  "approvalEvidenceRef": 'UNSET';
  "configurationGaps": Array<'MANDATE_ID' | 'MANDATE_VERSION' | 'OWNER' | 'ACCOUNT' | 'NAMESPACE' | 'TESTRUN' | 'STRATEGY_VERSION' | 'SECURITY_SCOPE' | 'LIMITS' | 'VALIDITY' | 'APPROVAL_EVIDENCE'>;
}

export type V24PaperReadiness = {
  "schemaVersion": 'v24-paper-execution-readiness-v1';
  "market": 'CN_A' | 'US_EQUITY';
  "environmentMode": 'PAPER';
  "brokerMode": 'FAKE';
  "liveTradingEnabled": false;
  "status": 'BLOCKED' | 'REJECTED';
  "policyReadiness": {
  "status": 'BLOCKED';
  "reason": 'POLICY_PREPARATION_ONLY';
  "configurationGaps": Array<string>;
} | {
  "status": 'REJECTED';
  "reason": 'LIVE_OR_NON_FAKE_MODE' | 'UNSUPPORTED_MARKET';
};
  "mandateReadiness": {
  "status": 'BLOCKED';
  "reason": 'MANDATE_PREPARATION_ONLY';
  "configurationGaps": Array<string>;
} | {
  "status": 'REJECTED';
  "reason": 'UNSUPPORTED_MARKET';
};
  "riskEvaluation": {
  "status": 'NOT_RUN';
  "reason": 'NO_REQUEST_SCOPED_ORDER_AND_SNAPSHOT';
};
  "resourceReservation": {
  "status": 'NOT_RUN';
  "reason": 'MANDATE_OR_ACCOUNT_UNSET';
};
  "orderSubmissionEnabled": false;
}

export type V24PaperStageRunAccepted = {
  "accepted": true;
  "testRunId": string;
  "status": 'WAITING';
}

export type V24PaperStageRunRequest = {
  "scenarioId": 'normal' | 'rejection' | 'recovery';
  "seed": number;
}

export type V24PaperStageRunResult = {
  "testRunId": string;
  "stageId": 'V2.4';
  "scenarioId": 'normal' | 'rejection' | 'recovery';
  "scenarioVersion": string;
  "ownerId": string;
  "namespace": string;
  "status": 'WAITING';
  "seed": number;
  "assertions": Array<{
  "assertionId": string;
  "status": 'WAITING';
  "expected": unknown;
  "actual": unknown;
}>;
  "evidence": {
  "testRunId": string;
  "stageId": 'V2.4';
  "scenarioId": 'normal' | 'rejection' | 'recovery';
  "scenarioVersion": string;
  "seed": number;
  "status": 'WAITING';
  "environmentMode": 'PAPER';
  "dataMode": 'NOT_CONNECTED';
  "brokerMode": 'FAKE';
  "executionPolicy": 'PREPARATION_ONLY';
  "executionGate": {
  "status": 'BLOCKED';
  "reason": string;
  "liveTradingEnabled": false;
};
  "mandate": {
  "schemaVersion": 'v24-paper-mandate-v1';
  "status": 'PREPARATION_ONLY';
  "mandateId": 'UNSET';
  "strategyVersion": 'UNSET';
  "approvalEvidenceRef": 'UNSET';
};
  "source": {
  "status": 'NOT_RUN';
  "sourceId": null;
  "observedAt": null;
};
  "orders": Array<unknown>;
  "fills": Array<unknown>;
  "reconciliation": {
  "status": 'NOT_RUN';
  "differences": Array<unknown>;
};
  "observationDays": 0;
  "assertions": Array<{
  "assertionId": string;
  "status": 'WAITING';
  "expected": unknown;
  "actual": unknown;
}>;
};
  "createdAt": string;
  "completedAt": null;
}

export type V24SnapshotFixtureExecutionV2 = unknown & unknown

export type V24SnapshotFixtureExecution = unknown & unknown

export type CnAShareCalendarSession = {
  "date": string;
  "status": 'TRADING' | 'CLOSED' | 'UNKNOWN';
  "calendarVersion": string;
  "source"?: string;
  "reason"?: string;
  "sessions"?: Array<{
  "start": string;
  "end": string;
}>;
}

export type CollectionRun = {
  "runId": string;
  "subscriptionId": string;
  "subscriptionVersion": number;
  "windowStart": string;
  "windowEnd": string;
  "jobKind": 'INTRADAY_WINDOW' | 'CLOSE_RECONCILIATION' | 'BACKFILL' | 'GAP_REPAIR';
  "status": 'QUEUED' | 'RUNNING' | 'WAITING_RETRY' | 'WAITING_DEPENDENCY' | 'PARTIAL' | 'COMPLETED' | 'FAILED' | 'PAUSED' | 'CANCELLED';
  "idempotencyKey": string;
  "checkpoint"?: Record<string, unknown> | null;
  "sourceAttempts"?: Array<Record<string, unknown>>;
}

export type CollectionSubscription = {
  "subscriptionId": string;
  "projectId": string;
  "market": 'CN_A_SHARE' | 'US_EQUITY';
  "securityUniverseVersion": string;
  "frequency": '5m' | '1d';
  "barType": 'MINUTE_BAR' | 'DAILY_BAR';
  "sourcePolicy": Array<string>;
  "calendarVersion": string;
  "timeZone": string;
  "enabled": boolean;
  "version": number;
  "quota"?: {
  "maxSecurities"?: number;
  "maxRequestsPerMinute"?: number;
};
}

export type MinuteCsvImportRequest = {
  "content": string;
  "mapping": {
  "securityId": string;
  "timestamp": string;
  "open": string;
  "high": string;
  "low": string;
  "close": string;
  "volume": string;
  "amount": string;
};
  "provenance": {
  "sourceName": string;
  "sourceReference": string | null;
  "licenseStatement": string;
  "licenseVerification": 'OPERATOR_CONFIRMED' | 'UNCONFIRMED';
  "acquiredAt": string;
};
  "market": 'CN_A';
  "frequency": '1m' | '5m';
  "adjustment": 'RAW';
  "timezone": 'Asia/Shanghai';
  "timestampSemantics": 'BAR_START' | 'BAR_END';
  "volumeUnit": 'SHARES';
  "amountUnit": 'CNY';
}

export type MinuteCsvUploadChunkRequest = {
  "contentBase64": string;
  "sha256": string;
}

export type MinuteCsvUploadCreateRequest = {
  "uploadId": string;
  "expectedSha256": string;
  "expectedBytes": number;
  "metadata": {
  "fileFormat"?: 'CSV' | 'PARQUET';
  "mapping": Record<string, unknown>;
  "provenance": {
  "sourceName": string;
  "sourceReference": string | null;
  "licenseStatement": string;
  "licenseVerification": 'OPERATOR_CONFIRMED' | 'UNCONFIRMED';
  "acquiredAt": string;
};
  "market": 'CN_A';
  "frequency": '1m' | '5m';
  "adjustment": 'RAW';
  "timezone": 'Asia/Shanghai';
  "timestampSemantics": 'BAR_START' | 'BAR_END';
  "volumeUnit": 'SHARES';
  "amountUnit": 'CNY';
};
}

export type MinuteCsvUploadProgress = {
  "uploadId": string;
  "status": 'OPEN' | 'FINALIZING' | 'COMPLETED' | 'CANCELLED';
  "expectedBytes": number;
  "receivedBytes": number;
  "expectedChunks": number;
  "receivedChunks": Array<number>;
  "result": Record<string, unknown> | null;
  "idempotent"?: boolean;
}

export type MinuteImportRecord = {
  "importId": string;
  "version": string;
  "status": 'PUBLISHED' | 'REJECTED';
  "accepted": number;
  "errors": Array<Record<string, unknown>>;
  "sha256": string;
  "manifest": {
  "mapping": Record<string, unknown>;
  "semantics": Record<string, unknown>;
  "provenance": null | {
  "sourceName": string;
  "sourceReference": string | null;
  "licenseStatement": string;
  "licenseVerification": 'OPERATOR_CONFIRMED' | 'UNCONFIRMED';
  "acquiredAt": string;
};
  "researchUseAllowed": boolean;
};
  "idempotent": boolean;
}

export type ProviderCapability = {
  "sourceId": string;
  "market": 'CN_A_SHARE' | 'US_EQUITY';
  "frequency": '5m' | '1d';
  "historicalStatus": 'PASS' | 'PARTIAL' | 'FAIL' | 'NOT_RUN';
  "liveStatus": 'PASS' | 'PARTIAL' | 'FAIL' | 'NOT_RUN' | 'BLOCKED_CAPABILITY';
  "fields": Array<string>;
  "checkedAt": string;
  "notes"?: Array<string>;
}

export type V22StageRunRequest = unknown

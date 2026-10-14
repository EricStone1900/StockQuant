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
  "temporalMetadata"?: Array<{
  "decisionAt": string;
  "featureAvailableAt": string;
  "labelAvailableAt": string;
}>;
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
  "temporalValidation"?: 'PASS' | 'NOT_RUN';
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
  "modelArtifactBase64": string;
  "testPredictionsCanonicalJson": string;
  "testPredictions": Array<number>;
  "evaluationMetrics": Record<string, unknown>;
  "tracking": 'temporary SQLite under /tmp; removed with the worker container';
  "profitabilityClaim": 'NOT_MADE';
}

export type V14DailyBacktestFixtureRequest = {
  "scenarioId": 'normal' | 'rejection' | 'recovery' | 'market-restrictions' | 'historical-fees' | 'corporate-actions';
  "testRunId"?: string;
  "seed": number;
  "policy": {
  "initialCashCents": number;
  "targetQuantity": number;
  "participationRateBasisPoints": number;
  "slippageBasisPoints": number;
  "fixedFeeCents": number;
  "marketFeeSchedule"?: {
  "scheduleId": 'CN_A_CASH_EQUITY_2022_04_29_TO_2023_08_27' | 'CN_A_CASH_EQUITY_2023_08_28';
  "commissionRatePartsPerBillion": number;
  "minimumCommissionCents": number;
} & unknown;
  "sellOrder"?: {
  "signalDate": string;
  "executionDate": string;
  "quantity": number;
};
};
}

export type V14DailyBacktestFixtureResult = {
  "testRunId": string;
  "stageId": 'V1.4';
  "scenarioId": 'normal' | 'rejection' | 'recovery' | 'market-restrictions' | 'historical-fees' | 'corporate-actions';
  "seed": number;
  "status": 'COMPLETED' | 'FAILED';
  "assertions": Array<{
  "assertionId": string;
  "status": 'PASS' | 'FAIL';
  "expected": unknown;
  "actual": unknown;
}>;
  "evidence": {
  "executionModel": {
  "component": 'QUANT_BACKTEST_ENGINE';
  "modelId": 'DAILY_BAR_CLOSE_NEXT_SESSION_PARTICIPATION_V1' | 'SYNTHETIC_DAILY_OHLC_RESTRICTION_RULES_V1' | 'RAW_DAILY_BAR_CORPORATE_ACTION_LEDGER_V1';
};
  "benchmark"?: {
  "benchmarkId": string;
  "initialClose": number;
  "finalClose": number;
  "returnBasisPoints": number;
  "excessReturnBasisPoints": number;
};
  "orderOutcomes"?: Array<{
  "side": 'BUY' | 'SELL';
  "signalDate": string;
  "executionDate": string;
  "requestedQuantity": number;
  "filledQuantity": number;
  "status": 'FILLED' | 'PARTIALLY_FILLED' | 'REJECTED';
  "reason"?: 'ZERO_VOLUME' | 'INSUFFICIENT_CASH' | 'PARTICIPATION_LIMIT' | 'T_PLUS_1_UNAVAILABLE' | 'NO_SELLABLE_POSITION';
}>;
  "metrics"?: {
  "rejectedOrders"?: number;
  "partiallyFilledOrders"?: number;
  "unfilledQuantity"?: number;
};
};
  "durableReport": {
  "resultSha256": string;
  "manifestSha256": string;
};
} & unknown & unknown & unknown

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
  "status": 'PENDING' | 'PUBLISHED' | 'FAILED' | 'RETAINED' | 'EXPIRED';
  "sourceRef": string;
  "expiresAt"?: string | null;
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
  "roundIndex"?: number;
  "scenario": 'COMPLETED' | 'TIMEOUT' | 'OVER_BUDGET';
  "runnerScenario"?: 'NORMAL' | 'CHECKPOINT_RECOVERY';
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

export type V31ModelGatewayOpenAIChatCommand = {
  "model": 'stockquant-fixture';
  "messages": Array<{
  "role": 'system' | 'user' | 'assistant' | 'tool';
  "content": string | Array<unknown>;
}>;
  "stream"?: false;
}

export type V31ModelGatewayOpenAIChatResult = {
  "id": string;
  "object": 'chat.completion';
  "created": number;
  "model": 'stockquant-fixture';
  "choices": Array<{
  "index": 0;
  "message": {
  "role": 'assistant';
  "content": string;
};
  "finish_reason": 'stop';
}>;
  "usage": {
  "prompt_tokens": number;
  "completion_tokens": number;
  "total_tokens": number;
};
}

export type V31ModelGatewayOpenAIEmbeddingCommand = {
  "model": 'stockquant-fixture';
  "input": string | Array<string>;
  "encoding_format"?: 'float' | 'base64' | null;
  "dimensions"?: 3;
}

export type V31ModelGatewayOpenAIEmbeddingResult = {
  "object": 'list';
  "model": 'stockquant-fixture';
  "data": Array<{
  "object": 'embedding';
  "index": number;
  "embedding": [0.125,-0.25,0.5] | string;
}>;
  "usage": {
  "prompt_tokens": number;
  "total_tokens": number;
};
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
  "roundIndex"?: number;
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

export type V32CandidateMandateBindingResult = {
  "schemaVersion": 'v3.2-candidate-mandate-binding-result-v1';
  "status": 'EXACT_VERSION_MATCH_READY_FOR_MANDATE_REVIEW' | 'WAITING' | 'REJECTED';
  "reason": 'APPROVED_REGISTRY_VERSION_NOT_FOUND' | 'REGISTRY_LOOKUP_UNAVAILABLE' | 'APPROVED_VERSION_AND_CANDIDATE_ARTIFACT_MATCH' | 'REGISTRY_VERSION_OR_CANDIDATE_ARTIFACT_MISMATCH';
  "mandateId": string;
  "testRunId"?: string;
  "ownerId"?: string;
  "accountId"?: string;
  "market"?: 'CN_A';
  "environmentMode"?: 'PAPER';
  "brokerMode"?: 'FAKE';
  "versionFingerprint"?: string;
  "registryStatus"?: 'CANDIDATE_APPROVED';
  "activation"?: 'DISABLED_UNTIL_MANDATE';
  "promotionRequestId"?: string;
  "accountValidation"?: 'NOT_PERFORMED';
  "mandatePersistence"?: 'NOT_PERFORMED';
} & unknown & unknown & unknown

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

export type V32PromotionRequestPreparationResult = {
  "status": 'WAITING' | 'READY_FOR_GATE_CHECK';
  "blockers": Array<string>;
  "promotionRequest": null | V32PromotionRequest;
} & unknown & unknown

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

export type V32PromotionScenarioFixture = {
  "schemaVersion": 'v3.2-promotion-scenario-v1';
  "scenarioId": 'eligible-fixture' | 'future-data-rejected-fixture';
  "sourceMode": 'FIXTURE';
  "request": V32PromotionRequest;
  "independentValidationExpectation": {
  "disposition": 'ELIGIBLE_FOR_REVIEW' | 'REJECTED';
  "reason": 'WITHIN_FROZEN_RULES' | 'FUTURE_DATA_LEAKAGE';
};
} & unknown & unknown

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

export type V33ExperimentLedgerSettlementCommand = {
  "testRunId": string;
  "expectedRounds": number;
}

export type V33ExperimentLedgerSettlementResult = {
  "experimentId": string;
  "testRunId": string;
  "requestedCents": number;
  "reservedCents": number;
  "spentCents": number;
  "status": 'SETTLED';
  "modelCallCount": number;
  "rounds": Array<{
  "roundIndex": number;
  "settledCents": number;
}>;
}

export type V33ReadinessCancelCommand = {
  "confirmation": 'CANCEL_V33_READINESS_RUN';
}

export type V33ReadinessCancelResult = {
  "testRunId": string;
  "stageId": 'V3.3';
  "status": 'CANCELLED';
  "idempotent": boolean;
  "evidence": {
  "readiness": 'CANCELLED';
  "runnerDispatch": 'NOT_PERFORMED';
  "runnerJobsCreated": 0;
  "externalModelCalls": 0;
  "cancellation": {
  "scope": 'READINESS_ONLY';
  "cancelledAt": string;
  "runnerJobsCancelled": 0;
};
};
}

export type V33ReadinessRun = {
  "accepted"?: boolean;
  "testRunId": string;
  "stageId": 'V3.3';
  "scenarioId": 'normal' | 'rejection' | 'recovery';
  "scenarioVersion": 'v3.3-readiness-v1';
  "status": 'WAITING' | 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  "seed": number;
  "assertions": Array<{
  "id": string;
  "status": 'NOT_RUN' | 'PENDING' | 'PASS' | 'FAIL';
  "reason"?: string;
}>;
  "evidence": {
  "readiness": 'WAITING' | 'CANCELLED';
  "blockers": Array<{
  "id": string;
  "status": 'VERIFIED' | 'NOT_VERIFIED' | 'NOT_PROVIDED' | 'NOT_IMPLEMENTED';
  "reason": string;
}>;
  "runnerDispatch": 'NOT_PERFORMED';
  "runnerJobsCreated": 0;
  "externalModelCalls": 0;
  "paperContinuity": 'NOT_CHECKED';
  "paperContinuityPreflight"?: {
  "schemaVersion": 'v3.3-paper-continuity-preflight-v1';
  "capturedAt": string;
  "status": 'NOT_VERIFIED';
  "preflightStatus": 'READY_FOR_CONCURRENT_TEST' | 'BLOCKED';
  "scheduler": {
  "status": string;
  "mode": string;
  "brokerMode": string;
  "samplingIntervalMinutes": number;
  "lastSampleAt": string | null;
  "nextSampleAt": string | null;
  "tickCount": number;
  "fresh": boolean;
  "nextSampleScheduled": boolean;
};
  "observation": null | {
  "status": 'PASS' | 'WAITING';
  "targetDays": number;
  "countedDays": number;
  "recordedCountedDays": number;
  "unverifiedCountedDays": number;
  "remainingDays": number;
  "latestDate": string | null;
};
  "blockers": Array<'PAPER_SCHEDULER_NOT_FRESH_AND_SCHEDULED' | 'O2_OBSERVATION_NOT_QUALIFIED_20_OF_20'>;
  "acceptanceRequirement": string;
};
};
  "createdAt"?: string;
  "completedAt"?: string | null;
}

export type V33RejectionVerifyCommand = {
  "schemaVersion": 'v3.3-rejection-verify-command-v1';
  "confirmation": 'VERIFY_V33_BUDGET_REJECTION';
}

export type V33RejectionVerifyResult = {
  "schemaVersion": 'v3.3-rejection-verify-result-v1';
  "testRunId": string;
  "status": 'RUNNING';
  "idempotent": boolean;
  "assertion": Record<string, unknown>;
  "evidence": Record<string, unknown>;
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

export type V33RunnerCheckpointHistory = {
  "schemaVersion": 'v3.3-runner-checkpoint-history-v1';
  "testRunId": string;
  "experimentId": string;
  "roundIndex": number;
  "checkpoints": Array<{
  "schemaVersion": 'v3.3-research-checkpoint-v1';
  "testRunId": string;
  "experimentId": string;
  "roundIndex": number;
  "sequence": number;
  "state": Record<string, unknown>;
  "stateSha256": string;
  "createdAt": string;
}>;
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

export type V33ScenarioFixtureRunnerDispatchCommand = {
  "schemaVersion": 'v3.3-scenario-dispatch-command-v1';
  "confirmation": 'DISPATCH_V33_FIXTURE_RUNNER';
}

export type V33ScenarioFixtureRunnerDispatchResult = {
  "schemaVersion": 'v3.3-scenario-dispatch-result-v1';
  "testRunId": string;
  "status": 'RUNNING';
  "workflowStep": 'RUNNER_JOBS_QUEUED';
  "idempotent": boolean;
  "runnerJobsCreated": 2;
  "runnerJobIds": Array<string>;
  "rounds": Array<Record<string, unknown>>;
  "externalModelCalls": 0;
}

export type V33ScenarioExperimentCommand = {
  "schemaVersion": 'v3.3-scenario-experiment-command-v1';
  "confirmation": 'CREATE_V33_FIXTURE_EXPERIMENT';
}

export type V33ScenarioExperimentResult = {
  "schemaVersion": 'v3.3-scenario-experiment-result-v1';
  "testRunId": string;
  "status": 'WAITING';
  "idempotent": boolean;
  "experiment": V31ExperimentResult;
}

export type V33ScenarioReconcileCommand = {
  "schemaVersion": 'v3.3-scenario-reconcile-command-v1';
  "confirmation": 'RECONCILE_V33_FIXTURE_RESULTS';
}

export type V33ScenarioReconcileResult = {
  "schemaVersion": 'v3.3-scenario-reconcile-result-v1';
  "testRunId": string;
  "status": 'RUNNING';
  "workflowStep": 'EXPERIMENT_SETTLED_AND_RESULTS_RECONCILED';
  "completedRounds": 2;
  "rounds": Array<Record<string, unknown>>;
  "experimentSettlement": 'VERIFIED_FIXTURE_LEDGER';
  "settlement": {
  "experimentId": string;
  "requestedCents": 80;
  "settledCents": 46;
  "modelCallCount": 2;
  "rounds": Array<{
  "roundIndex": 1 | 2;
  "allocatedCents": 40;
  "settledCents": 23;
}>;
};
  "businessValidation": 'NOT_RUN';
  "humanAcceptance": 'NOT_RUN';
}

export type V33TestRunBudgetLimitCommand = {
  "schemaVersion": 'v3.3-test-run-budget-limit-command-v1';
  "testRunId": string;
  "budgetCents": number;
}

export type V33TestRunBudgetLimitResult = {
  "schemaVersion": 'v3.3-test-run-budget-limit-v1';
  "testRunId": string;
  "budgetCents": number;
  "status": 'CONFIGURED';
}

export type V33TestRunExperimentBudgetSummary = {
  "schemaVersion": 'v3.3-test-run-budget-summary-v1';
  "testRunId": string;
  "offset": number;
  "limit": number;
  "afterCursor": string | null;
  "nextAfterCursor": string | null;
  "hasMore": boolean;
  "rows": Array<{
  "experimentId": string;
  "rounds": number;
  "requestedCents": number;
  "reservedCents": number;
  "roundBudget": Array<{
  "roundIndex": number;
  "allocatedCents": number;
  "usedCents": number;
  "unknownReservedCents": number;
}>;
  "status": 'RESERVED' | 'SETTLED' | 'UNKNOWN' | 'REJECTED';
  "settledCents": number;
  "unknownReservedCents": number;
  "modelCallCount": number;
}>;
  "totals": null | {
  "experiments": number;
  "requestedCents": number;
  "reservedCents": number;
  "settledCents": number;
  "unknownReservedCents": number;
  "modelCallCount": number;
};
  "accountingScope": 'unique experiments bound to this TestRun; model-call attempts are counted once; no provider invoice reconciliation';
  "stageBudgetControl": 'NOT_IMPLEMENTED' | 'TEST_RUN_CAP_ENFORCED_ROUND_CAP_NOT_IMPLEMENTED' | 'TEST_RUN_AND_ROUND_CAP_ENFORCED';
} & unknown & unknown

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
  "unsettledReceivables": Array<{
  "fillId": string;
  "amount": string;
  "currency": string;
  "tradeDate": string;
  "settlementDate": string | null;
  "calendarVersion": string;
  "settlementErrorCode": 'SETTLEMENT_CALENDAR_UNAVAILABLE' | null;
  "status": 'PENDING' | 'SETTLED';
}>;
  "positionCount": number;
  "ledgerEntryCount": number;
  "ledgerVersion": number;
  "positions"?: Array<{
  "security": string;
  "quantity": number;
}>;
  "reservations"?: Array<{
  "reservationId": string;
  "clientOrderId": string;
  "side": 'BUY' | 'SELL';
  "cashAmount": string | null;
  "capturedCashAmount": string;
  "capturedQuantity": number;
  "status": 'HELD' | 'UNKNOWN' | 'CAPTURED' | 'RELEASED';
  "evidenceRef": string | null;
}>;
}

export type ArtifactRef = {
  "schemaVersion": 'artifact-ref.v1';
  "artifactId": string;
  "testRunId": string;
  "ownerId": string;
  "kind": string;
  "namespace": string;
  "mediaType"?: string;
  "byteLength"?: number;
  "sha256": string;
  "status": 'PENDING' | 'PUBLISHED' | 'FAILED' | 'RETAINED' | 'EXPIRED';
  "sourceRef": string;
  "createdAt"?: string;
  "expiresAt"?: string | null;
}

export type ClockContext = {
  "clockMode": 'SYSTEM' | 'SIMULATION' | 'FIXED';
  "asOf": string;
  "runId"?: string | null;
  "calendarVersion"?: string | null;
} & unknown

export type ErrorResponse = {
  "code": string;
  "message": string;
  "category": 'AUTHENTICATION' | 'AUTHORIZATION' | 'VALIDATION' | 'CONFLICT' | 'DEPENDENCY' | 'INTERNAL';
  "retryable": boolean;
  "correlationId": string;
  "details"?: Record<string, unknown>;
  "acceptanceStatus"?: 'KNOWN' | 'UNKNOWN';
}

export type FillFeeCorrectionCommand = {
  "revision": number;
  "previousFee": string;
  "correctedFee": string;
  "effectiveAt": string;
  "evidenceRef": string;
}

export type HistoricalFakeExecutionCommand = {
  "authorizationId": string;
  "namespace": string;
  "accountId": string;
  "clientOrderId": string;
  "security": string;
  "requestedQuantity": number;
  "initialAccountCash"?: string;
  "bar": {
  "timestamp": string;
  "open": string;
  "volume": number;
  "high"?: string;
  "low"?: string;
  "close"?: string;
  "tradingStatus"?: 'TRADED' | 'SUSPENDED';
  "upperLimit"?: string;
  "lowerLimit"?: string;
};
  "side"?: 'BUY' | 'SELL';
  "orderType"?: 'MARKET' | 'LIMIT';
  "timeInForce"?: 'DAY';
  "limitPrice"?: string;
  "participationRate"?: number;
  "slippageBps"?: number;
  "currency"?: string;
  "marketFeeSchedule"?: {
  "scheduleId": 'CN_A_CASH_EQUITY_2022_04_29_TO_2023_08_27' | 'CN_A_CASH_EQUITY_2023_08_28';
  "commissionRatePartsPerBillion": number;
  "minimumCommissionCents": number;
};
  "reservation"?: {
  "reservationId": string;
  "ownerId": string;
  "testRunId": string;
  "clientOrderId": string;
};
} & unknown

export type HistoricalFakeExecutionResult = {
  "result": {
  "orderId": string;
  "status": 'FILLED' | 'PARTIALLY_FILLED' | 'REJECTED' | 'CANCEL_REQUESTED' | 'CANCELLED' | 'EXPIRED' | 'UNKNOWN';
  "brokerMode": 'FAKE';
  "rejectionReason"?: 'ZERO_VOLUME' | 'INVALID_BAR' | 'LIMIT_NOT_MARKETABLE' | 'INVALID_RULE' | 'SUSPENDED' | 'LOCKED_AT_UPPER_LIMIT' | 'LOCKED_AT_LOWER_LIMIT';
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

export type HistoricalFakeOrderState = {
  "order_id": string;
  "status": string;
  "rejection_reason"?: string | null;
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
} | {
  "format": 'stockquant.paired-backup.cluster.v2';
  "backupId": string;
  "createdAt": string;
  "retentionClass": 'DAILY' | 'MONTH_END';
  "databaseInventory": {
  "databases": Array<string>;
  "roles": Array<{
  "name": string;
  "superuser": boolean;
  "inherit": boolean;
  "createRole": boolean;
  "createDb": boolean;
  "login": boolean;
  "replication": boolean;
  "bypassRls": boolean;
  "connlimit": number;
  "validUntil": string | null;
}>;
};
  "artifactVolume": string;
  "restoreValidation": {
  "status": 'PASS';
  "checkedAt": string;
  "publishedArtifactRefs": number;
  "restoredDatabases": Array<string>;
  "restoredRoles": Array<{
  "name": string;
  "superuser": boolean;
  "inherit": boolean;
  "createRole": boolean;
  "createDb": boolean;
  "login": boolean;
  "replication": boolean;
  "bypassRls": boolean;
  "connlimit": number;
  "validUntil": string | null;
}>;
  "method": 'ISOLATED_CLUSTER_RESTORE_AND_ARTIFACT_SHA256';
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

export type ReplayExecutionAuthorizationCommand = {
  "namespace": string;
  "accountId": string;
  "environmentMode": 'BACKTEST';
  "brokerMode": 'FAKE';
  "command": {
  "namespace": string;
  "accountId": string;
  "clientOrderId": string;
  "security": string;
  "requestedQuantity": number;
  "initialAccountCash"?: string;
  "bar": {
  "timestamp": string;
  "open": string;
  "volume": number;
  "high"?: string;
  "low"?: string;
  "close"?: string;
  "tradingStatus"?: 'TRADED' | 'SUSPENDED';
  "upperLimit"?: string;
  "lowerLimit"?: string;
};
};
}

export type ReplayExecutionAuthorizationResult = {
  "authorizationId": string;
}

export type ReplayExecutionAuthorizationValidation = {
  "authorizationId": string;
  "accountId": string;
  "command": {
  "namespace": string;
  "accountId": string;
  "clientOrderId": string;
  "security": string;
  "requestedQuantity": number;
  "initialAccountCash"?: string;
  "bar": {
  "timestamp": string;
  "open": string;
  "volume": number;
};
};
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
  "settlement"?: {
  "tradeDate": string;
  "settlementDate": string | null;
  "calendarVersion": string;
  "settlementErrorCode": 'SETTLEMENT_CALENDAR_UNAVAILABLE' | null;
};
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
  "artifactRefs"?: Array<ArtifactRef>;
}

export type V11AcceptanceRun = {
  "testRunId": string;
  "stageId": 'V1.1';
  "scenarioId": 'normal' | 'rejection' | 'recovery';
  "scenarioVersion": '1.0.0';
  "namespace": string;
  "ownerId": string;
  "status": 'QUEUED' | 'RUNNING' | 'WAITING' | 'COMPLETED' | 'FAILED';
  "seed": number;
  "accountId": string | null;
  "createdAt": string;
  "completedAt": string | null;
  "error": string | null;
  "assertions": Array<{
  "assertionId": string;
  "status": 'PASS' | 'FAIL' | 'WAITING';
  "expected": unknown;
  "actual": unknown;
  "evidence": Record<string, unknown>;
}>;
}

export type V12StrategySnapshotCommand = {
  "ownerId": string;
  "testRunId": string;
  "artifactId": string;
  "artifactSha256": string;
  "fixtureVersion": 'v1.2-market-data-4' | 'v1.2-market-data-5';
  "dataVersion": 'v1.2-market-data-4' | 'v1.2-market-data-5';
  "factorVersion": 'v1.2-momentum-volume-1';
  "strategyId": 'v1.2-qlib-topk-1' | 'v1.2-no-trade-1';
  "strategyHash": string;
  "mode": 'TOPK' | 'NO_TRADE';
  "asOf": string;
  "targets": Array<V12StrategyTarget>;
}

export type V12StrategyTarget = {
  "ticker": string;
  "market": 'CN_A' | 'US_EQUITY';
  "currency": 'CNY' | 'USD';
  "reason": string;
}

export type V13AutoMandateCommand = {
  "mandateId": string;
  "mandateVersion": 1;
  "testRunId": string;
  "accountId": string;
  "strategyVersion": string;
  "market": 'CN_A' | 'US_EQUITY';
  "currency": 'CNY' | 'USD';
  "securityScope": Array<string>;
  "maxOrderAmount": string;
  "maxTotalAmount": string;
  "maxOrderCount": number;
  "validFrom": string;
  "expiresAt": string;
  "reason": string;
  "now": string;
}

export type V13AutoMandateOrderCommand = {
  "mandateVersion": number;
  "ownerId": string;
  "clientOrderId": string;
  "commandHash": string;
  "proposal": V13AutoMandateProposal;
  "now": string;
}

export type V13AutoMandateProposal = {
  "proposalId": string;
  "proposalVersion": number;
  "contentHash": string;
  "ownerId": string;
  "testRunId": string;
  "accountId": string;
  "strategyVersion": string;
  "operation": 'HOLD' | 'REBALANCE';
  "market": 'CN_A' | 'US_EQUITY';
  "currency": 'CNY' | 'USD';
  "legs": Array<{
  "securityId": string;
  "side": 'BUY' | 'SELL';
  "quantity": number;
  "limitPrice": string;
  "estimatedFee": string;
}>;
}

export type V13AutoMandateSettlementCommand = {
  "outcome": 'CONSUMED' | 'RELEASED';
  "now": string;
}

export type V13AutoMandateTransitionCommand = {
  "mandateVersion": number;
  "testRunId": string;
  "contentHash"?: string;
  "reason": string;
  "now": string;
}

export type V13AutoPaperExecutionCommand = {
  "proposalId": string;
  "mandateId": string;
  "mandateVersion": number;
  "ownerId": string;
  "testRunId": string;
  "accountId": string;
  "namespace": string;
  "clientOrderId": string;
  "now": string;
  "executionMode"?: 'IMMEDIATE' | 'SEQUENCED';
}

export type V13ExecutionAuthorizationCommand = {
  "proposalVersion": number;
  "contentHash": string;
  "ownerId": string;
  "testRunId": string;
  "accountId": string;
  "clientOrderId": string;
  "commandHash": string;
  "now": string;
}

export type V13ExecutionAuthorizationResult = {
  "authorizationId": string;
  "proposalId": string;
  "proposalVersion": number;
  "contentHash": string;
  "ownerId": string;
  "testRunId": string;
  "accountId": string;
  "clientOrderId": string;
  "commandHash": string;
  "expiresAt": string;
  "status": 'ACTIVE';
  "replayed"?: boolean;
}

export type V13ExecutionAuthorizationValidation = {
  "authorizationId": string;
  "proposalVersion": number;
  "contentHash": string;
  "ownerId": string;
  "testRunId": string;
  "accountId": string;
  "clientOrderId": string;
  "commandHash": string;
  "now": string;
}

export type V13ManualPaperExecutionCommand = {
  "proposalId": string;
  "ownerId": string;
  "testRunId": string;
  "accountId": string;
  "namespace": string;
  "clientOrderId": string;
  "now": string;
}

export type V13PaperStageRunAccepted = {
  "accepted": true;
  "testRunId": string;
  "status": 'WAITING';
}

export type V13PaperStageRunRequest = {
  "scenarioId": 'normal' | 'rejection' | 'recovery';
  "seed": number;
}

export type V13PaperStageRunResult = {
  "testRunId": string;
  "stageId": 'V1.3';
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
  "actual": 'NOT_RUN';
}>;
  "evidence": {
  "evidenceScope": 'PLATFORM_WAITING_DECLARATION';
  "businessExecution": 'NOT_RUN';
  "requiredBusinessServices": ['decision-governance-service','trade-execution-service','portfolio-risk-service','FakeBroker'];
  "businessServicesCalled": Array<unknown>;
  "scenarioExpectation": string;
  "environmentMode": 'PAPER';
  "brokerMode": 'FAKE';
  "liveTradingEnabled": false;
  "seed": number;
  "orderFacts": 'NOT_CREATED';
  "fillFacts": 'NOT_CREATED';
  "portfolioLedgerFacts": 'NOT_CREATED';
};
  "createdAt": string;
  "completedAt": null;
}

export type V13ProposalCommand = {
  "ownerId": string;
  "testRunId": string;
  "idempotencyKey": string;
  "accountId": string;
  "strategyVersion": string;
  "approvalMode"?: 'MANUAL_APPROVAL' | 'AUTO_POLICY';
  "market"?: 'CN_A' | 'US_EQUITY';
  "currency"?: 'CNY' | 'USD';
  "operation": 'HOLD' | 'REBALANCE';
  "environmentMode": 'PAPER';
  "brokerMode": 'FAKE';
  "expiresAt": string;
  "legs": Array<V13ProposalLeg>;
} & unknown & unknown

export type V13ProposalDecisionCommand = {
  "expectedVersion": number;
  "expectedContentHash": string;
  "reason": string;
  "now": string;
}

export type V13ProposalDecisionResult = {
  "status": 'APPROVED_MANUAL';
  "proposalId": string;
  "proposalVersion": number;
  "contentHash": string;
  "decidedBy": string;
  "reason": string;
} | {
  "status": 'REJECTED_MANUAL';
  "proposalId": string;
  "proposalVersion": number;
  "contentHash": string;
  "decidedBy": string;
  "reason": string;
}

export type V13ProposalLeg = {
  "legId": string;
  "securityId": string;
  "side": 'BUY' | 'SELL';
  "quantity": number;
}

export type V13ProposalResult = {
  "proposalId": string;
  "proposalVersion": number;
  "contentHash": string;
  "status": 'MANUAL_APPROVAL_PENDING' | 'AUTO_POLICY_PENDING' | 'APPROVED_MANUAL' | 'REJECTED_MANUAL' | 'STALE';
  "approvalMode": 'MANUAL_APPROVAL' | 'AUTO_POLICY';
  "market": 'CN_A' | 'US_EQUITY';
  "currency": 'CNY' | 'USD';
  "operation": 'HOLD' | 'REBALANCE';
  "environmentMode": 'PAPER';
  "brokerMode": 'FAKE';
  "expiresAt": string;
  "legs": Array<V13ProposalLeg>;
  "ownerId": string;
  "testRunId": string;
  "accountId": string;
  "strategyVersion": string;
  "replayed"?: boolean;
}

export type V13ProposalRevisionCommand = {
  "expectedVersion": number;
  "expectedContentHash": string;
  "operation": 'HOLD' | 'REBALANCE';
  "expiresAt": string;
  "legs": Array<V13ProposalLeg>;
  "reason": string;
  "now": string;
}

export type V14PaperSettlementCalendarFixture = {
  "$schema": 'https://stockquant.local/schemas/common/v14-paper-settlement-calendar.schema.json';
  "schemaVersion": 'v1.4-paper-settlement-calendar-v1' | 'v1.4-paper-settlement-calendar-v2';
  "fixtureId": 'v1.4-paper-settlement-calendar';
  "fixtureVersion": 'v1.4-paper-settlement-calendar-1' | 'v1.4-paper-settlement-calendar-2';
  "calendarVersion": string;
  "dataMode": 'FIXTURE';
  "usageEligibility": 'SIMULATION_ONLY';
  "markets": {
  "CN_A": {
  "currency": 'CNY';
  "sessions": Array<{
  "sessionDate": string;
  "settlementDate": string | null;
}>;
};
  "US_EQUITY": {
  "currency": 'USD';
  "sessions": Array<{
  "sessionDate": string;
  "settlementDate": string | null;
}>;
};
};
  "unsupportedDateBehavior": 'SETTLEMENT_CALENDAR_UNAVAILABLE; keep receivable pending; do not infer weekends, holidays, next sessions, or settlement from elapsed hours';
}

export type V15RunIncident = {
  "incidentId": string;
  "testRunId": string;
  "alertKey": string;
  "code": string;
  "severity": 'BLOCKER' | 'ERROR';
  "title": string;
  "detail": Record<string, unknown>;
  "state": 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
  "firstSeenAt": string;
  "lastSeenAt": string;
  "acknowledgedBy": string | null;
  "acknowledgedAt": string | null;
  "resolvedAt": string | null;
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

export type V24PaperAuthorizationCommand = {
  "grant": V24PaperExecutionGrant;
}

export type V24PaperAuthorizationResult = {
  "authorizationId": string;
  "status": 'ACTIVE' | 'CONSUMED';
  "expiresAt": string;
  "scope": {
  "testRunId": string;
  "ownerId": string;
  "accountId": string;
  "namespace": string;
  "strategyVersion": string;
  "policyVersion": string;
  "mandateVersion": string;
};
}

export type V24PaperAuthorizationRevokeCommand = {
  "authorizationId": string;
  "namespace": string;
  "accountId": string;
  "reason": string;
}

export type V24PaperAuthorizationRevokeResult = {
  "authorizationId": string;
  "status": 'REVOKED';
  "replayed": boolean;
  "revokedAt": string;
}

export type V24PaperAuthorizationValidation = {
  "authorizationId": string;
  "accountId": string;
  "command": V24PaperExecutionGrant;
}

export type V24PaperExecutionCommand = {
  "authorizationId": string;
  "grant": V24PaperExecutionGrant;
}

export type V24PaperExecutionGrant = {
  "scenarioId": 'v24-isolated-snapshot-paper-normal';
  "scenarioVersion": '2.0.0';
  "testRunId": string;
  "ownerId": string;
  "namespace": string;
  "accountId": string;
  "clockNow": string;
  "dataMode": 'FIXTURE';
  "environmentMode": 'PAPER';
  "brokerMode": 'FAKE';
  "liveTradingEnabled": false;
  "market": 'CN_A';
  "currency": 'CNY';
  "policy": {
  "policyId": 'v24-isolated-fixture-paper-policy';
  "policyVersion": '2.0.0';
  "riskPolicyVersion": 'fixture-risk-v1';
  "feePolicyVersion": 'fixture-fee-v1';
  "maxDeviationBps": number;
  "freshnessLimitSeconds": number;
  "executionWindowStart": string;
  "executionWindowEnd": string;
};
  "mandate": {
  "mandateId": 'v24-isolated-fixture-paper-mandate';
  "mandateVersion": '2.0.0';
  "strategyVersion": string;
  "securityScope": Array<string>;
  "maxOrderNotional": string;
  "maxGrossExposure": string;
  "maxDailyTurnover": string;
  "approvalEvidenceRef": 'fixture-approval:v24-isolated-paper-v2';
};
  "signal": {
  "signalId": string;
  "asOf": string;
  "action": 'BUY';
  "quantity": number;
  "referencePrice": string;
};
  "order": {
  "clientOrderId": string;
  "security": string;
  "acceptedAt": string;
  "requestedQuantity": number;
};
  "snapshot": {
  "snapshotId": string;
  "security": string;
  "market": 'CN_A';
  "sourceMode": 'FIXTURE';
  "status": 'READY';
  "observedAt": string;
  "ingestedAt": string;
  "price": string;
};
  "fee": string;
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

export type V24PaperExecutionResult = {
  "schemaVersion": 'v24-paper-execution-result-v2';
  "replayed": boolean;
  "authorization": {
  "status": 'AUTHORIZED';
  "testRunId": string;
  "ownerId": string;
  "mandateId": string;
  "mandateVersion": string;
  "strategyVersion": string;
};
  "riskEvaluation": {
  "status": 'PASS_RISK_CHECK';
  "quoteAgeSeconds": number;
  "deviationBps": number;
};
  "resourceReservation": ResourceReservation;
  "eligibility": {
  "status": 'ELIGIBLE';
  "snapshotId": string;
  "executionModel": 'SNAPSHOT';
  "policyVersion": string;
  "dataMode": 'FIXTURE';
  "liquidityParticipation": 'NOT_VERIFIED';
};
  "order": {
  "order_id": string;
  "status": string;
  "clientOrderId": string;
};
  "fill": {
  "externalFillId": string;
  "quantity": number;
  "price": string;
  "fee": string;
  "effectiveAt": string;
} | null;
  "outbox": {
  "event_id": string;
  "event_type": string;
  "status": 'PENDING' | 'DELIVERING' | 'DELIVERED' | 'COMPENSATION_REQUIRED';
  "attempts": number;
  "delivered_at"?: string | null;
};
  "reconciliation": {
  "namespace": string;
  "brokerMode": 'FAKE';
  "order_count": number;
  "unresolved_order_count": number;
  "fill_count": number;
  "pending_outbox_count": number;
};
}

export type V24PaperExecutionScenario = {
  "$schema"?: string;
  "scenarioId": 'v24-isolated-snapshot-paper-normal';
  "scenarioVersion": '2.0.0';
  "dataMode": 'FIXTURE';
  "environmentMode": 'PAPER';
  "brokerMode": 'FAKE';
  "liveTradingEnabled": false;
  "market": 'CN_A';
  "currency": 'CNY';
  "account": {
  "fixtureAccountRef": string;
  "initialCash": string;
};
  "policy": {
  "policyId": 'v24-isolated-fixture-paper-policy';
  "policyVersion": '2.0.0';
  "riskPolicyVersion": 'fixture-risk-v1';
  "feePolicyVersion": 'fixture-fee-v1';
  "maxDeviationBps": number;
  "freshnessLimitSeconds": number;
  "executionWindowStart": string;
  "executionWindowEnd": string;
};
  "mandate": {
  "mandateId": 'v24-isolated-fixture-paper-mandate';
  "mandateVersion": '2.0.0';
  "strategyVersion": string;
  "securityScope": Array<string>;
  "maxOrderNotional": string;
  "maxGrossExposure": string;
  "maxDailyTurnover": string;
  "approvalEvidenceRef": string;
};
  "signal": {
  "signalId": string;
  "asOf": string;
  "action": 'BUY';
  "quantity": number;
  "referencePrice": string;
};
  "order": {
  "security": string;
  "acceptedAt": string;
  "requestedQuantity": number;
  "clientOrderIdPrefix": string;
};
  "snapshot": {
  "snapshotId": string;
  "security": string;
  "market": 'CN_A';
  "sourceMode": 'FIXTURE';
  "status": 'READY';
  "observedAt": string;
  "ingestedAt": string;
  "price": string;
};
  "risk": {
  "supportedMarkets": ['CN_A'];
};
  "fee": string;
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
  "scenarioId": 'normal' | 'rejection' | 'recovery' | 'external-reconciliation';
  "seed": number;
}

export type V24PaperStageRunResult = {
  "testRunId": string;
  "stageId": 'V2.4';
  "scenarioId": 'normal' | 'rejection' | 'recovery' | 'external-reconciliation';
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
  "scenarioId": 'normal' | 'rejection' | 'recovery' | 'external-reconciliation';
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

export type V24SnapshotFixtureExecutionV2 = {
  "$schema"?: string;
  "fixtureId": 'v24-snapshot-cn-paper-execution';
  "fixtureVersion": '2.0.0';
  "dataMode": 'FIXTURE';
  "environmentMode": 'PAPER';
  "brokerMode": 'FAKE';
  "liveTradingEnabled": false;
  "market": 'CN_A' | 'US_EQUITY';
  "currency": 'CNY' | 'USD';
  "clockNow": string;
  "order": {
  "security": string;
  "acceptedAt": string;
  "executionWindowStart": string;
  "executionWindowEnd": string;
  "requestedQuantity": number;
};
  "snapshot": {
  "snapshotId": string;
  "security": string;
  "market": 'CN_A' | 'US_EQUITY';
  "sourceMode": 'FIXTURE';
  "status": 'READY';
  "observedAt": string;
  "ingestedAt": string;
  "price": string;
};
  "fixtureFee": string;
  "expected": {
  "projectedQuantity": number;
  "projectedPrice": string;
  "projectedFee": string;
  "executionModel": 'SNAPSHOT';
  "liquidityParticipation": 'NOT_VERIFIED';
};
  "risk": {
  "referencePrice": string;
  "freshnessLimitSeconds": number;
  "maxDeviationBps": number;
  "supportedMarkets": Array<'CN_A' | 'US_EQUITY'>;
};
} & unknown & unknown

export type V24SnapshotFixtureExecution = {
  "$schema"?: string;
  "fixtureId": 'v24-snapshot-cn-paper-execution';
  "fixtureVersion": '1.0.0';
  "dataMode": 'FIXTURE';
  "environmentMode": 'PAPER';
  "brokerMode": 'FAKE';
  "liveTradingEnabled": false;
  "market": 'CN_A' | 'US_EQUITY';
  "currency": 'CNY' | 'USD';
  "clockNow": string;
  "order": {
  "security": string;
  "acceptedAt": string;
  "executionWindowStart": string;
  "executionWindowEnd": string;
  "requestedQuantity": number;
};
  "snapshot": {
  "snapshotId": string;
  "security": string;
  "market": 'CN_A' | 'US_EQUITY';
  "sourceMode": 'FIXTURE';
  "status": 'READY';
  "observedAt": string;
  "ingestedAt": string;
  "price": string;
};
  "fixtureFee": string;
  "expected": {
  "projectedQuantity": number;
  "projectedPrice": string;
  "projectedFee": string;
  "executionModel": 'SNAPSHOT';
  "liquidityParticipation": 'NOT_VERIFIED';
};
} & unknown & unknown

export type V33NormalVerifyCommand = {
  "schemaVersion": 'v3.3-normal-verify-command-v1';
  "confirmation": 'VERIFY_V33_NORMAL_RESULTS';
}

export type V33NormalVerifyResult = {
  "schemaVersion": 'v3.3-normal-verify-result-v1';
  "testRunId": string;
  "status": 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  "idempotent": boolean;
  "assertion": {
  "id": 'V3.3_NORMAL_RESULTS_001';
  "status": 'PASS' | 'FAIL';
};
  "evidence": Record<string, unknown>;
}

export type V33RecoveryVerifyCommand = {
  "schemaVersion": 'v3.3-recovery-verify-command-v1';
  "confirmation": 'VERIFY_V33_CHECKPOINT_RECOVERY';
}

export type V33RecoveryVerifyResult = {
  "schemaVersion": 'v3.3-recovery-verify-result-v1';
  "testRunId": string;
  "status": 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'WAITING';
  "idempotent": boolean;
  "assertion": Record<string, unknown> | null;
  "evidence": Record<string, unknown> | null;
}

export type V32ReadinessRunRequest = {
  "scenarioId": 'normal' | 'rejection' | 'recovery';
  "seed"?: number;
  "sourceV31TestRunId"?: string;
}

export type V32ReadinessRunResult = {
  "accepted"?: true;
  "testRunId": string;
  "stageId": 'V3.2';
  "scenarioId": 'normal' | 'rejection' | 'recovery';
  "scenarioVersion": 'v3.2-readiness-v1';
  "status": 'WAITING';
  "seed": number;
  "assertions": Array<unknown>;
  "evidence": Record<string, unknown>;
}

export type MarketDataAlertAcknowledgeRequest = {
  "actorId": string;
}

export type MarketDataAlertIncidents = {
  "incidents": Array<MarketDataAlertIncidentV1>;
}

export type PublishedMarketDataArtifactTaskContent = {
  "taskId": string;
  "artifactId": string;
  "fixtureVersion": 'v1.2-market-data-1';
  "sha256": string;
  "contentBase64": string;
  "createdAt": string;
}

export type MarketDataArtifactTask = {
  "taskId": string;
  "artifactId": string;
  "fixtureVersion": string;
  "status": 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  "sha256": string | null;
  "error": string | null;
  "fence": number;
  "createdAt": string;
  "updatedAt": string;
}

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

export type CollectionScheduleView = {
  "subscriptionId": string;
  "subscriptionVersion": number;
  "fromDate": string;
  "toDate": string;
  "calendarVersion": string;
  "enabled": boolean;
  "version": number;
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

export type MarketDataLiveNewsPreview = {
  "observedAt": string;
  "items": Array<{
  "newsId": string;
  "sourceId": string;
  "title": string;
  "publishedAt": string | null;
  "observedAt": string;
  "ingestedAt": string;
  "availableAt": string;
  "revision": number;
  "symbols": Array<string>;
}>;
  "sourceCount": number;
  "deduplicated": boolean;
  "status": 'PASS' | 'PARTIAL';
}

export type LiveQuotePreview = {
  "sourceId": 'tencent-quote';
  "requestedSymbols": Array<string>;
  "securities": Array<{
  "symbol": string;
  "price": number;
  "name": string | null;
  "observedAt": string | null;
  "ingestedAt": string;
  "status": 'LIVE_SOURCE' | 'MISSING_TIMESTAMP' | 'MALFORMED' | 'SOURCE_ERROR';
}>;
  "count": number;
  "ingestedAt": string;
  "status"?: 'STALE';
  "error"?: string;
}

export type MarketDataAlertIncidentV1 = {
  "incidentId": string;
  "alertKey": string;
  "code": string;
  "severity": 'INFO' | 'WARNING' | 'CRITICAL';
  "payload": Record<string, unknown>;
  "state": 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED';
  "firstSeenAt": string;
  "lastSeenAt": string;
  "acknowledgedBy": string | null;
  "acknowledgedAt": string | null;
  "resolvedAt": string | null;
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

export type MinuteFixtureImportRequest = {
  "fixture"?: 'normal' | 'bad';
}

export type MinuteFixturePreview = {
  "fixtureVersion": string;
  "rows": number;
  "securities": number;
  "quality": Array<{
  "code": string;
  "row": number;
}>;
  "bars": Array<{
  "securityId": string;
  "market": string;
  "frequency": string;
  "barStart": string;
  "barEnd": string;
  "availableAt": string;
  "open": number;
  "high": number;
  "low": number;
  "close": number;
  "volume": number;
  "amount": number;
  "adjustment": string;
}>;
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

export type MinuteOpenGaps = {
  "subscriptionId": string;
  "open": Array<Record<string, unknown>>;
}

export type MarketDataNewsPreview = {
  "items": Array<{
  "newsId": string;
  "sourceId": string;
  "title": string;
  "publishedAt": string;
  "revision": number;
  "symbols": Array<string>;
}>;
  "deduplicated": boolean;
  "sourceStatus": string;
}

export type ProjectDataExportRequest = {
  "projectId": string;
  "dataVersion": string;
  "items": Array<unknown>;
}

export type ProjectDataExport = {
  "projectId": string;
  "dataVersion": string;
  "rowCount": number;
  "sha256": string;
  "items": Array<unknown>;
}

export type ProjectDataPageRequest = {
  "projectId": string;
  "dataVersion": string;
  "items": Array<unknown>;
  "cursor"?: number;
  "pageSize"?: number;
}

export type ProjectDataPage = {
  "dataVersion": string;
  "items": Array<unknown>;
  "nextCursor": string | null;
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

export type MarketDataSamplingConfig = {
  "intervalMinutes": 20 | 30;
  "allowed": Array<20 | 30>;
  "tradingWindows": Array<{
  "name": string;
  "start": string;
  "end": string;
}>;
  "lunchBreak": Array<string>;
  "placeOrders": false;
}

export type MarketDataSamplingUpdate = {
  "intervalMinutes": 20 | 30;
}

export type MarketDataSourceCircuitState = {
  "sourceId": string;
  "circuit": 'OPEN' | 'HEALTHY';
  "failures": number;
}

export type MarketDataSourceInventory = {
  "sources": Array<{
  "sourceId": string;
  "kind": 'QUOTE' | 'NEWS';
  "url"?: string;
  "status": string;
  "license"?: string;
  "circuit": string;
}>;
  "checkedAt": string;
  "note"?: string;
}

export type MarketDataSourceSmoke = {
  "checkedAt": string;
  "checks": Array<{
  "sourceId": string;
  "status": 'PASS' | 'FAIL';
  "httpStatus"?: number;
  "bytes"?: number;
  "error"?: string;
}>;
  "status": 'PASS' | 'PARTIAL';
}

export type V12FixturePreview = {
  "fixtureVersion": 'v1.2-market-data-1';
  "dataMode": 'FIXTURE';
  "barCount"?: number;
  "securityCount"?: number;
  "quality": {
  "status": 'READY' | 'REJECTED';
  "errors": Array<{
  "code": string;
  "ticker"?: string;
  "date"?: string;
}>;
};
  "bars": Array<{
  "securityId": string;
  "ticker": string;
  "date": string;
  "open": number;
  "high": number;
  "low": number;
  "close": number;
  "volume": number;
  "adjustment": 'raw';
}>;
}

export type V12ResearchFixturePreview = {
  "fixtureVersion": 'v1.2-market-data-4' | 'v1.2-market-data-5';
  "dataMode": 'FIXTURE';
  "dailyBarsSha256": string;
  "securities": Array<{
  "securityId": string;
  "ticker": string;
  "market": 'CN_A' | 'US_EQUITY';
  "currency": 'CNY' | 'USD';
  "timezone": string;
  "listedAt": string;
  "delistedAt": string | null;
}>;
  "marketSessions": Array<{
  "market": 'CN_A' | 'US_EQUITY';
  "sessionDate": string;
}>;
  "bars": Array<{
  "securityId": string;
  "ticker": string;
  "market": 'CN_A' | 'US_EQUITY';
  "currency": 'CNY' | 'USD';
  "timezone": string;
  "date": string;
  "availableAt": string;
  "open": string;
  "high": string;
  "low": string;
  "close": string;
  "volume": number;
  "adjustment": 'raw';
}>;
}

export type V22StageRunRequest = {
  "scenarioId"?: 'normal' | 'rejection' | 'recovery' | 'uploaded-csv';
  "seed"?: number;
  "uploadId"?: string;
  "fileFormat"?: 'CSV' | 'PARQUET';
} & unknown

export type MarketDataWatchlistUpdate = {
  "securities": Array<string>;
}

export type MarketDataWatchlist = {
  "securities": Array<string>;
  "count": number;
  "max": 100;
  "priority"?: string;
}

export type MultiBarResearchCommand = {
  "runId"?: string;
  "bars": Array<{
  "timestamp": string;
  "open": string;
  "volume": number;
}>;
  "executions"?: Array<unknown>;
}

export type MultiBarResearchResult = {
  "status": string;
  "adapter": string;
  "dataMode": string;
  "barCount": number;
  "artifactHash": string;
  "assertions": Array<unknown>;
}

export type QlibSummaryTrainRequest = {
  "bars": Array<{
  "timestamp"?: string;
  "open": string;
  "volume"?: number;
}>;
}

export type QlibSummaryValidateRequest = {
  "bars": Array<{
  "timestamp"?: string;
  "open": string;
  "volume"?: number;
}>;
  "artifactHash": string;
}

export type V12FactorPreview = {
  "status": 'COMPLETED' | 'NOT_RUN';
  "reason"?: string;
  "factorVersion": 'v1.2-sma-factor-1';
  "dataVersion": 'v1.2-market-data-1';
  "asOf": string;
  "qlibStatus": string;
  "noTrade": boolean;
  "lookbackBars": number;
  "ranking": Array<{
  "ticker": string;
  "factor": string;
  "signal": string;
}>;
}

export type V12QlibProbePreview = {
  "adapter": 'qlib';
  "sourceCommit"?: string;
  "dependencyImage"?: string;
  "probe": {
  "status": string;
};
  "executionModel"?: string;
  "modelCalls"?: string;
}

export type V12QlibStrategyArtifact = {
  "schemaVersion": 'v1.2-qlib-strategy-artifact-v1';
  "fixtureVersion": 'v1.2-market-data-4' | 'v1.2-market-data-5';
  "dailyBarsSha256": string;
  "inputSha256": string;
  "factorVersion": 'v1.2-momentum-volume-1';
  "dataVersion": 'v1.2-market-data-4' | 'v1.2-market-data-5';
  "asOf": string;
  "qlibModels": Array<{
  "market": 'CN_A' | 'US_EQUITY';
  "version": string;
  "lightgbmVersion": string;
  "model": 'qlib.contrib.model.gbdt.LGBModel';
  "modelSha256": string;
  "modelArtifactBase64": string;
  "testPredictionsSha256": string;
}>;
  "predictions": Array<{
  "ticker": string;
  "market": 'CN_A' | 'US_EQUITY';
  "currency": 'CNY' | 'USD';
  "date": string;
  "momentum20": number;
  "volumeRatio20": number;
  "rangeRatio": number;
  "label": number;
  "prediction": number;
}>;
  "strategies": Array<{
  "strategyId": 'v1.2-qlib-topk-1' | 'v1.2-no-trade-1';
  "strategyHash": string;
  "mode": 'TOPK' | 'NO_TRADE';
  "asOf": string;
  "reason": string;
  "targets": Array<{
  "ticker": string;
  "market": 'CN_A' | 'US_EQUITY';
  "currency": 'CNY' | 'USD';
  "reason": string;
}>;
}>;
}

export type V12RDagentProbePreview = {
  "adapter": 'rdagent';
  "executionBoundary": string;
  "dockerSocketMounted": boolean;
  "codeProbe": {
  "status": string;
};
  "modelCalls": string;
  "reason"?: string;
}

export type FakeBrokerCancellationResult = {
  "outcome": 'ACCEPTED' | 'REJECTED';
  "reason": string;
  "sequence": number;
}

export type FakeBrokerSimulatedExternalOrder = {
  "namespace": string;
  "externalOrderId": string;
  "clientOrderId"?: string;
  "security": string;
  "requestedQuantity": number;
  "status": 'NEW' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELLED' | 'REJECTED' | 'UNKNOWN';
  "evidenceRef": string;
  "observedAt": string;
}

export type FakeBrokerSimulatedFillReport = {
  "externalFillId": string;
  "sequence": number;
  "cumulativeQuantity": number;
  "price": string;
  "fee": string;
  "effectiveAt": string;
  "evidenceRef": string;
}

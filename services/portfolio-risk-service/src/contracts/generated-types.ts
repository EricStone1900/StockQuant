// GENERATED FILE. DO NOT EDIT. Source: packages/contracts/**/*.schema.json

export type V31ResearchArtifactRef = {
  "schemaVersion": 'v3.1-artifact-ref-v1';
  "artifactId": string;
  "kind": 'INPUT' | 'GENERATED_CODE' | 'RUN_LOG' | 'METRICS' | 'ERROR' | 'CANDIDATE';
  "namespace": string;
  "sha256": string;
  "status": 'PENDING' | 'PUBLISHED' | 'FAILED' | 'RETAINED';
  "sourceRef": string;
}

export type V31ExperimentRequest = {
  "fixtureId": string;
  "modelProfile": string;
  "rounds": number;
  "budgetCurrency": 'USD';
  "budgetCents": number;
  "environmentMode": 'RESEARCH';
  "brokerMode": 'FAKE';
  "idempotencyKey": string;
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

export type ClockContext = {
  "clockMode": 'SYSTEM' | 'SIMULATION' | 'FIXED';
  "asOf": string;
  "runId"?: string | null;
  "calendarVersion"?: string | null;
}

export type ErrorResponse = {
  "code": string;
  "message": string;
  "category": 'AUTHENTICATION' | 'AUTHORIZATION' | 'VALIDATION' | 'CONFLICT' | 'DEPENDENCY' | 'INTERNAL';
  "retryable": boolean;
  "correlationId": string;
  "details"?: Record<string, unknown>;
  "acceptanceStatus"?: 'KNOWN' | 'UNKNOWN';
}

export type Money = {
  "amount": string;
  "currency": string;
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

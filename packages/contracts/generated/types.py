# GENERATED FILE. DO NOT EDIT. Source: packages/contracts/**/*.schema.json

from typing import Literal, NotRequired, Required, TypedDict

V31ResearchArtifactRef = TypedDict("V31ResearchArtifactRef", {
  "schemaVersion": Required[Literal['v3.1-artifact-ref-v1']],
  "artifactId": Required[str],
  "kind": Required[Literal['INPUT', 'GENERATED_CODE', 'RUN_LOG', 'METRICS', 'ERROR', 'CANDIDATE']],
  "namespace": Required[str],
  "sha256": Required[str],
  "status": Required[Literal['PENDING', 'PUBLISHED', 'FAILED', 'RETAINED']],
  "sourceRef": Required[str],
})

V31ExperimentRequest = TypedDict("V31ExperimentRequest", {
  "fixtureId": Required[str],
  "modelProfile": Required[str],
  "rounds": Required[int],
  "budgetCurrency": Required[Literal['USD']],
  "budgetCents": Required[int],
  "environmentMode": Required[Literal['RESEARCH']],
  "brokerMode": Required[Literal['FAKE']],
  "idempotencyKey": Required[str],
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

Money = TypedDict("Money", {
  "amount": Required[str],
  "currency": Required[str],
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

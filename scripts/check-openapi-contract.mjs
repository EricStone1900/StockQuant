import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const path = resolve(root, "packages/contracts/openapi/portfolio-account.v1.json");
const document = JSON.parse(await readFile(path, "utf8"));
if (document.openapi !== "3.1.0") throw new Error("portfolio account OpenAPI document must use 3.1.0");
const initialize = document.paths?.["/internal/v1/accounts/initialize"]?.post;
const recordFill = document.paths?.["/internal/v1/accounts/{accountId}/fills"]?.post;
const correctFillFee = document.paths?.["/internal/v1/accounts/{accountId}/fills/{externalFillId}/fee-corrections"]?.post;
const snapshot = document.paths?.["/internal/v1/accounts/{accountId}/snapshot"]?.get;
const sellable = document.paths?.["/internal/v1/accounts/{accountId}/sellable"]?.get;
if (sellable?.operationId !== "getAccountSellable" || !["namespace", "testRunId", "security", "asOf"].every((name) => sellable.parameters?.some((item) => item.name === name && item.in === "query" && item.required))) throw new Error("getAccountSellable scope or clock contract is missing");
const reserve = document.paths?.["/internal/v1/accounts/{accountId}/reservations"]?.post;
const resolveReservation = document.paths?.["/internal/v1/accounts/{accountId}/reservations/{reservationId}/resolve"]?.post;
if (initialize?.operationId !== "initializeAccount") throw new Error("initializeAccount operation is missing");
if (recordFill?.operationId !== "recordAccountFill") throw new Error("recordAccountFill operation is missing");
if (correctFillFee?.operationId !== "correctAccountFillFee") throw new Error("correctAccountFillFee operation is missing");
if (snapshot?.operationId !== "getAccountSnapshot") throw new Error("getAccountSnapshot operation is missing");
if (reserve?.operationId !== "reserveAccountResources") throw new Error("reserveAccountResources operation is missing");
if (resolveReservation?.operationId !== "resolveAccountReservation") throw new Error("resolveAccountReservation operation is missing");
if (document.components?.securitySchemes?.ServiceBearer?.scheme !== "bearer" || !document.security?.some((item) => item.ServiceBearer)) throw new Error("portfolio service Bearer security is missing");
const refs = JSON.stringify(document);
for (const ref of ["account-initialization-command.schema.json", "account-snapshot.schema.json"]) {
  if (!refs.includes(`https://stockquant.local/schemas/common/${ref}`)) throw new Error(`OpenAPI reference missing: ${ref}`);
}
for (const status of ["200", "403", "409"]) if (!initialize.responses?.[status]) throw new Error(`initializeAccount response ${status} is missing`);
for (const status of ["200", "403", "404"]) if (!snapshot.responses?.[status]) throw new Error(`getAccountSnapshot response ${status} is missing`);
for (const status of ["200", "201", "400", "403", "404", "409"]) if (!recordFill.responses?.[status]) throw new Error(`recordAccountFill response ${status} is missing`);
if (!correctFillFee.requestBody?.required || !JSON.stringify(correctFillFee).includes("fill-fee-correction-command.schema.json")) throw new Error("correctAccountFillFee request contract is incomplete");
for (const status of ["200", "400", "403", "404", "409"]) if (!correctFillFee.responses?.[status]) throw new Error(`correctAccountFillFee response ${status} is missing`);
for (const status of ["201", "400", "403", "409"]) if (!reserve.responses?.[status]) throw new Error(`reserveAccountResources response ${status} is missing`);
for (const status of ["200", "400", "403", "404", "409"]) if (!resolveReservation.responses?.[status]) throw new Error(`resolveAccountReservation response ${status} is missing`);
for (const [name, operation] of [["recordAccountFill", recordFill], ["reserveAccountResources", reserve], ["resolveAccountReservation", resolveReservation]]) {
  if (!operation.requestBody?.required || !operation.parameters?.some((parameter) => parameter.name === "accountId" && parameter.in === "path" && parameter.required)) throw new Error(`${name} request body or account path scope is missing`);
}

const minuteCsvPath = resolve(root, "packages/contracts/openapi/v22-minute-csv.v1.json");
const minuteCsvDocument = JSON.parse(await readFile(minuteCsvPath, "utf8"));
if (minuteCsvDocument.openapi !== "3.1.0" || !minuteCsvDocument.security?.some((item) => item.localSession)) throw new Error("V2.2 minute CSV OpenAPI version or local-session security is missing");
for (const [path, operationId] of [["/api/v1/acceptance/v2/v2.2/csv/preview", "previewV22MinuteCsvImport"], ["/api/v1/acceptance/v2/v2.2/csv/import", "publishV22MinuteCsvImport"]]) {
  const operation = minuteCsvDocument.paths?.[path]?.post;
  if (operation?.operationId !== operationId || !operation.requestBody?.required || !JSON.stringify(operation).includes("minute-csv-import-request-v1.schema.json")) throw new Error(`V2.2 minute CSV operation contract is incomplete: ${path}`);
  for (const status of ["200", "401", "403", "413", "422"]) if (!operation.responses?.[status]) throw new Error(`${operationId} response ${status} is missing`);
}
const v22RunCreate = minuteCsvDocument.paths?.["/api/v1/acceptance/v2/v2.2/runs"]?.post;
if (v22RunCreate?.operationId !== "createV22StageRun" || !v22RunCreate.requestBody?.required || !JSON.stringify(v22RunCreate).includes("v22-stage-run-request-v1.schema.json")) throw new Error("V2.2 stage run request contract is missing");
if (minuteCsvDocument.paths?.["/api/v1/acceptance/v2/v2.2/runs/{testRunId}"]?.get?.operationId !== "getV22StageRun") throw new Error("V2.2 owner-scoped TestRun read contract is missing");
const resumableUploadOperations = [
  ["/api/v1/acceptance/v2/v2.2/csv/uploads", "post", "createV22ResumableMinuteCsvUpload", "minute-csv-upload-create-v1.schema.json", ["200", "401", "409", "429"]],
  ["/api/v1/acceptance/v2/v2.2/csv/uploads/{uploadId}/chunks/{index}", "put", "putV22ResumableMinuteCsvChunk", "minute-csv-upload-chunk-v1.schema.json", ["200", "401", "409", "413", "429"]],
  ["/api/v1/acceptance/v2/v2.2/csv/uploads/{uploadId}", "get", "getV22ResumableMinuteCsvUploadProgress", "minute-csv-upload-progress-v1.schema.json", ["200", "401", "404"]],
  ["/api/v1/acceptance/v2/v2.2/csv/uploads/{uploadId}/preview", "post", "previewV22ResumableMinuteCsvUpload", null, ["200", "401", "409", "422"]],
  ["/api/v1/acceptance/v2/v2.2/csv/uploads/{uploadId}/finalize", "post", "finalizeV22ResumableMinuteCsvUpload", null, ["200", "401", "409", "422"]],
  ["/api/v1/acceptance/v2/v2.2/csv/uploads/{uploadId}/cancel", "post", "cancelV22ResumableMinuteCsvUpload", null, ["200", "401", "404", "409"]],
];
for (const [path, method, operationId, schemaRef, statuses] of resumableUploadOperations) {
  const operation = minuteCsvDocument.paths?.[path]?.[method];
  if (operation?.operationId !== operationId) throw new Error(`V2.2 resumable upload operation is missing: ${operationId}`);
  if (["put", "get", "previewV22ResumableMinuteCsvUpload", "finalizeV22ResumableMinuteCsvUpload", "cancelV22ResumableMinuteCsvUpload"].includes(method === "post" ? operationId : method) && !operation.parameters?.some((parameter) => parameter.name === "uploadId" && parameter.in === "path" && parameter.required)) throw new Error(`${operationId} upload ownership path parameter is missing`);
  if (schemaRef && !JSON.stringify(operation).includes(schemaRef)) throw new Error(`${operationId} schema reference is missing`);
  for (const status of statuses) if (!operation.responses?.[status]) throw new Error(`${operationId} response ${status} is missing`);
}

const observationPath = resolve(root, "packages/contracts/openapi/v24-observation.v1.json");
const observationDocument = JSON.parse(await readFile(observationPath, "utf8"));
if (observationDocument.openapi !== "3.1.0") throw new Error("V2.4 observation OpenAPI document must use 3.1.0");
const createV24Run = observationDocument.paths?.["/api/v1/acceptance/v2/v2.4/runs"]?.post;
const readV24Run = observationDocument.paths?.["/api/v1/acceptance/v2/v2.4/runs/{testRunId}"]?.get;
const readV24PaperReadiness = observationDocument.paths?.["/api/v1/acceptance/v2/v2.4/paper-readiness"]?.get;
const recoverV24PaperRun = observationDocument.paths?.["/api/v1/acceptance/v2/v2.4/runs/{testRunId}/recover"]?.post;
const historyV24PaperRun = observationDocument.paths?.["/api/v1/acceptance/v2/v2.4/runs/{testRunId}/history"]?.get;
if (readV24PaperReadiness?.operationId !== "readV24PaperExecutionReadiness" || !readV24PaperReadiness.security?.some((item) => item.localSession) || !readV24PaperReadiness.parameters?.some((parameter) => parameter.name === "market" && parameter.in === "query" && parameter.required) || !JSON.stringify(readV24PaperReadiness).includes("v24-paper-readiness.schema.json")) throw new Error("V2.4 owner-session Paper readiness proxy contract is incomplete");
for (const status of ["200", "401", "403", "422", "503"]) if (!readV24PaperReadiness.responses?.[status]) throw new Error(`readV24PaperExecutionReadiness response ${status} is missing`);
if (createV24Run?.operationId !== "createV24PaperStageRun" || !createV24Run.requestBody?.required || !createV24Run.security?.some((item) => item.localSession) || !JSON.stringify(createV24Run).includes("v24-paper-stage-run-request.schema.json") || !JSON.stringify(createV24Run).includes("v24-paper-stage-run-accepted.schema.json")) throw new Error("V2.4 owner-scoped run create contract is incomplete");
for (const status of ["202", "400", "401", "403"]) if (!createV24Run.responses?.[status]) throw new Error(`createV24PaperStageRun response ${status} is missing`);
if (readV24Run?.operationId !== "readOwnedV24PaperStageRun" || !readV24Run.security?.some((item) => item.localSession) || !readV24Run.parameters?.some((parameter) => parameter.name === "testRunId" && parameter.in === "path" && parameter.required) || !JSON.stringify(readV24Run).includes("v24-paper-stage-run-result.schema.json")) throw new Error("V2.4 owner-scoped run read contract is incomplete");
for (const status of ["200", "401", "403", "404"]) if (!readV24Run.responses?.[status]) throw new Error(`readOwnedV24PaperStageRun response ${status} is missing`);
const v13AcceptancePath = resolve(root, "packages/contracts/openapi/v13-acceptance.v1.json");
const v11AcceptancePath = resolve(root, "packages/contracts/openapi/platform-v11-acceptance.v1.json");
const v11AcceptanceDocument = JSON.parse(await readFile(v11AcceptancePath, "utf8"));
if (v11AcceptanceDocument.openapi !== "3.1.0" || !v11AcceptanceDocument.security?.some((item) => item.localSession)) throw new Error("V1.1 acceptance OpenAPI version or local-session security is missing");
const listV11Scenarios = v11AcceptanceDocument.paths?.["/api/v1/acceptance/v1/v1.1/scenarios"]?.get;
const createV11Run = v11AcceptanceDocument.paths?.["/api/v1/acceptance/v1/v1.1/runs"]?.post;
const readV11Run = v11AcceptanceDocument.paths?.["/api/v1/acceptance/runs/{testRunId}"]?.get;
const continueV11Recovery = v11AcceptanceDocument.paths?.["/api/v1/acceptance/runs/{testRunId}/continue-recovery"]?.post;
const exportV1Evidence = v11AcceptanceDocument.paths?.["/api/v1/acceptance/runs/{testRunId}/evidence"]?.get;
const v11ScenarioSchema = listV11Scenarios?.responses?.["200"]?.content?.["application/json"]?.schema;
if (listV11Scenarios?.operationId !== "listV11AcceptanceScenarios" || !listV11Scenarios.security?.some((item) => item.localSession) || v11ScenarioSchema?.type !== "array" || !["scenarioId", "version", "title", "expected"].every((name) => v11ScenarioSchema.items?.required?.includes(name)) || !["normal", "rejection", "recovery"].every((scenario) => v11ScenarioSchema.items?.properties?.scenarioId?.enum?.includes(scenario))) throw new Error("V1.1 fixed scenario-list contract is incomplete");
if (!listV11Scenarios.responses?.["401"]) throw new Error("listV11AcceptanceScenarios response 401 is missing");
const createV11Response = createV11Run?.responses?.["202"]?.content?.["application/json"]?.schema;
if (createV11Run?.operationId !== "createV11AcceptanceRun" || !createV11Run.requestBody?.required || !createV11Run.security?.some((item) => item.localSession)) throw new Error("V1.1 acceptance run creation contract is incomplete");
if (createV11Response?.type !== "object" || createV11Response.additionalProperties !== false || !["accepted", "testRunId", "status"].every((name) => createV11Response.required?.includes(name)) || createV11Response.properties?.accepted?.const !== true || createV11Response.properties?.testRunId?.format !== "uuid" || !["QUEUED", "RUNNING", "WAITING", "COMPLETED", "FAILED"].every((status) => createV11Response.properties?.status?.enum?.includes(status))) throw new Error("V1.1 acceptance run 202 response schema is incomplete");
for (const status of ["202", "400", "401", "403", "422"]) if (!createV11Run.responses?.[status]) throw new Error(`createV11AcceptanceRun response ${status} is missing`);
if (createV11Run.responses?.["201"]) throw new Error("createV11AcceptanceRun must document asynchronous acceptance as HTTP 202, not 201");
if (readV11Run?.operationId !== "readOwnedV11AcceptanceRun" || !readV11Run.security?.some((item) => item.localSession) || !readV11Run.parameters?.some((parameter) => parameter.name === "testRunId" && parameter.in === "path" && parameter.required) || !JSON.stringify(readV11Run).includes("v11-acceptance-run.schema.json")) throw new Error("V1.1 owner-scoped run read contract is incomplete");
for (const status of ["200", "401", "404"]) if (!readV11Run.responses?.[status]) throw new Error(`readOwnedV11AcceptanceRun response ${status} is missing`);
const exportV1EvidenceSchema = exportV1Evidence?.responses?.["200"]?.content?.["application/json"]?.schema;
const v11EvidenceSchema = v11AcceptanceDocument.components?.schemas?.V11EvidenceExport;
const stageEvidenceSchema = v11AcceptanceDocument.components?.schemas?.V1StageRunEvidenceExport;
if (exportV1Evidence?.operationId !== "exportOwnedV1AcceptanceEvidence" || !exportV1Evidence.security?.some((item) => item.localSession) || !exportV1Evidence.parameters?.some((parameter) => parameter.name === "testRunId" && parameter.in === "path" && parameter.required && parameter.schema?.format === "uuid") || !["V1.1, V1.3 and V1.5", "V1.2 and V1.4", "Human acceptance remains NOT_RUN"].every((phrase) => exportV1Evidence.description?.includes(phrase)) || exportV1EvidenceSchema?.oneOf?.length !== 2 || !exportV1EvidenceSchema.oneOf.some((item) => item.$ref === "#/components/schemas/V11EvidenceExport") || !exportV1EvidenceSchema.oneOf.some((item) => item.$ref === "#/components/schemas/V1StageRunEvidenceExport")) throw new Error("Shared owner-scoped V1 evidence export contract or exporter route scope is incomplete");
if (v11EvidenceSchema?.properties?.evidenceVersion?.const !== "v1.1-1" || stageEvidenceSchema?.properties?.evidenceVersion?.const !== "v2-stage-run-1" || ![v11EvidenceSchema, stageEvidenceSchema].every((schema) => schema?.properties?.manualConclusion?.const === "NOT_RUN" && ["mode", "run", "assertions", "manualConclusion"].every((name) => schema.required?.includes(name))) || !stageEvidenceSchema.properties.run.properties.stageId.enum.includes("V1.5")) throw new Error("Shared V1 evidence export projections or pending-human-acceptance constraint are incomplete");
for (const status of ["200", "401", "404"]) if (!exportV1Evidence.responses?.[status]) throw new Error(`exportOwnedV1AcceptanceEvidence response ${status} is missing`);
const continueV11Response = continueV11Recovery?.responses?.["202"]?.content?.["application/json"]?.schema;
if (continueV11Recovery?.operationId !== "continueOwnedV11AcceptanceRecovery" || !continueV11Recovery.security?.some((item) => item.localSession) || !continueV11Recovery.parameters?.some((parameter) => parameter.name === "testRunId" && parameter.in === "path" && parameter.required) || continueV11Recovery.requestBody?.content?.["application/json"]?.schema?.additionalProperties !== false || continueV11Response?.properties?.accepted?.const !== true || continueV11Response?.properties?.testRunId?.format !== "uuid" || !["400", "401", "404"].every((status) => continueV11Recovery.responses?.[status])) throw new Error("V1.1 owner-scoped recovery continuation contract is incomplete");
const v13AcceptanceDocument = JSON.parse(await readFile(v13AcceptancePath, "utf8"));
if (v13AcceptanceDocument.openapi !== "3.1.0") throw new Error("V1.3 acceptance OpenAPI document must use 3.1.0");
const listV13Scenarios = v13AcceptanceDocument.paths?.["/api/v1/acceptance/v1/v1.3/scenarios"]?.get;
const createV13Run = v13AcceptanceDocument.paths?.["/api/v1/acceptance/v1/v1.3/runs"]?.post;
const readV13Run = v13AcceptanceDocument.paths?.["/api/v1/acceptance/v1/v1.3/runs/{testRunId}"]?.get;
const requestV13Cancel = v13AcceptanceDocument.paths?.["/api/v1/acceptance/v1/v1.3/runs/{testRunId}/proposals/{proposalId}/orders/{clientOrderId}/cancel-request"]?.post;
const resolveV13Cancel = v13AcceptanceDocument.paths?.["/api/v1/acceptance/v1/v1.3/runs/{testRunId}/proposals/{proposalId}/orders/{clientOrderId}/cancel-results/{sequence}"]?.post;
const observeV13ExternalOrder = v13AcceptanceDocument.paths?.["/api/v1/acceptance/v1/v1.3/runs/{testRunId}/external-orders/observe"]?.post;
const readV13Reconciliation = v13AcceptanceDocument.paths?.["/api/v1/acceptance/v1/v1.3/runs/{testRunId}/reconciliation"]?.get;
if (listV13Scenarios?.operationId !== "listV13PaperAcceptanceScenarios" || !listV13Scenarios.security?.some((item) => item.localSession)) throw new Error("V1.3 fixed-scenario read contract is incomplete");
for (const status of ["200", "401", "403"]) if (!listV13Scenarios.responses?.[status]) throw new Error(`listV13PaperAcceptanceScenarios response ${status} is missing`);
if (createV13Run?.operationId !== "createV13PaperAcceptanceRun" || !createV13Run.requestBody?.required || !createV13Run.security?.some((item) => item.localSession) || !JSON.stringify(createV13Run).includes("v13-paper-stage-run-request.schema.json") || !JSON.stringify(createV13Run).includes("v13-paper-stage-run-accepted.schema.json") || !JSON.stringify(createV13Run).includes("no order, Fill or ledger facts")) throw new Error("V1.3 owner-scoped fail-closed run creation contract is incomplete");
for (const status of ["202", "400", "401", "403", "422"]) if (!createV13Run.responses?.[status]) throw new Error(`createV13PaperAcceptanceRun response ${status} is missing`);
if (readV13Run?.operationId !== "readOwnedV13PaperAcceptanceRun" || !readV13Run.security?.some((item) => item.localSession) || !readV13Run.parameters?.some((parameter) => parameter.name === "testRunId" && parameter.in === "path" && parameter.required) || !JSON.stringify(readV13Run).includes("v13-paper-stage-run-result.schema.json")) throw new Error("V1.3 owner-scoped run read contract is incomplete");
for (const status of ["200", "401", "403", "404"]) if (!readV13Run.responses?.[status]) throw new Error(`readOwnedV13PaperAcceptanceRun response ${status} is missing`);
if (requestV13Cancel?.operationId !== "requestOwnedV13SequencedPaperOrderCancel" || !requestV13Cancel.security?.some((item) => item.localSession) || !["testRunId", "proposalId", "clientOrderId"].every((name) => requestV13Cancel.parameters?.some((parameter) => parameter.name === name && parameter.in === "path" && parameter.required)) || !JSON.stringify(requestV13Cancel.responses?.["202"]).includes('"CANCEL_REQUESTED"') || !JSON.stringify(requestV13Cancel.responses?.["202"]).includes('"HELD"')) throw new Error("V1.3 owner-scoped L07 cancellation request contract must retain its reservation");
for (const status of ["202", "401", "403", "404", "409", "503"]) if (!requestV13Cancel.responses?.[status]) throw new Error(`requestOwnedV13SequencedPaperOrderCancel response ${status} is missing`);
if (resolveV13Cancel?.operationId !== "resolveOwnedV13SequencedPaperOrderCancel" || !resolveV13Cancel.security?.some((item) => item.localSession) || !["testRunId", "proposalId", "clientOrderId", "sequence"].every((name) => resolveV13Cancel.parameters?.some((parameter) => parameter.name === name && parameter.in === "path" && parameter.required)) || JSON.stringify(resolveV13Cancel.parameters.find((parameter) => parameter.name === "sequence")?.schema?.enum) !== JSON.stringify(["3", "4"]) || !JSON.stringify(resolveV13Cancel.requestBody?.content?.["application/json"]?.schema).includes('"ACCEPTED","REJECTED"') || !JSON.stringify(resolveV13Cancel.responses?.["200"]).includes('"PARTIALLY_FILLED"') || !JSON.stringify(resolveV13Cancel.responses?.["200"]).includes('"CANCELLED"')) throw new Error("V1.3 owner-scoped L07 rejected/accepted cancel-result contract is incomplete");
for (const status of ["200", "401", "403", "404", "409", "503"]) if (!resolveV13Cancel.responses?.[status]) throw new Error(`resolveOwnedV13SequencedPaperOrderCancel response ${status} is missing`);
if (observeV13ExternalOrder?.operationId !== "recordV13IndependentFakeBrokerOrderObservation" || !observeV13ExternalOrder.security?.some((item) => item.localSession)) throw new Error("V1.3 independent FakeBroker order observation contract is incomplete");
for (const status of ["201", "401", "403", "404", "503"]) if (!observeV13ExternalOrder.responses?.[status]) throw new Error(`recordV13IndependentFakeBrokerOrderObservation response ${status} is missing`);
if (readV13Reconciliation?.operationId !== "readOwnedV13FakeBrokerReconciliation" || !readV13Reconciliation.security?.some((item) => item.localSession)) throw new Error("V1.3 owner-scoped independent FakeBroker reconciliation contract is incomplete");
for (const status of ["200", "401", "403", "404", "503"]) if (!readV13Reconciliation.responses?.[status]) throw new Error(`readOwnedV13FakeBrokerReconciliation response ${status} is missing`);
const v13OperationCount = Object.values(v13AcceptanceDocument.paths).reduce((count, pathItem) => count + Object.keys(pathItem).filter((method) => ["get", "post", "put", "patch", "delete"].includes(method)).length, 0);
if (recoverV24PaperRun?.operationId !== "recoverOwnedV24PaperRecoveryRun" || !recoverV24PaperRun.security?.some((item) => item.localSession) || !recoverV24PaperRun.parameters?.some((parameter) => parameter.name === "testRunId" && parameter.in === "path" && parameter.required) || !JSON.stringify(recoverV24PaperRun).includes('"UNKNOWN"')) throw new Error("owner-scoped V2.4 query-first recovery contract is incomplete");
for (const status of ["202", "401", "403", "404", "409", "503"]) if (!recoverV24PaperRun.responses?.[status]) throw new Error(`recoverOwnedV24PaperRecoveryRun response ${status} is missing`);
if (historyV24PaperRun?.operationId !== "listOwnedV24PaperRecoveryHistory" || !historyV24PaperRun.security?.some((item) => item.localSession) || !JSON.stringify(historyV24PaperRun).includes("revisions")) throw new Error("owner-scoped V2.4 recovery history contract is incomplete");
for (const status of ["200", "401", "403", "404"]) if (!historyV24PaperRun.responses?.[status]) throw new Error(`listOwnedV24PaperRecoveryHistory response ${status} is missing`);
const revisions = observationDocument.paths?.["/api/v1/acceptance/v2/v2.4/runs/{testRunId}/revisions"]?.get;
if (revisions?.operationId !== "listV24ObservationRunRevisions") throw new Error("listV24ObservationRunRevisions operation is missing");
if (!JSON.stringify(revisions).includes("v24-observation-run-revision-list.schema.json")) throw new Error("V2.4 revision response schema reference is missing");
for (const status of ["200", "401", "403", "404"]) if (!revisions.responses?.[status]) throw new Error(`listV24ObservationRunRevisions response ${status} is missing`);
const v24OperationCount = Object.values(observationDocument.paths).reduce((count, pathItem) => count + Object.keys(pathItem).filter((method) => ["get", "post", "put", "patch", "delete"].includes(method)).length, 0);

const quantCandidatePath = resolve(root, "packages/contracts/openapi/quant-candidate.v1.json");
const quantCandidateDocument = JSON.parse(await readFile(quantCandidatePath, "utf8"));
if (quantCandidateDocument.openapi !== "3.1.0" || quantCandidateDocument.components?.securitySchemes?.ServiceBearer?.scheme !== "bearer" || !quantCandidateDocument.security?.some((item) => item.ServiceBearer)) throw new Error("quant candidate OpenAPI version or service Bearer security is missing");
const candidateRegistration = quantCandidateDocument.paths?.["/v1/research/candidates"]?.post;
if (candidateRegistration?.operationId !== "registerQuantResearchCandidate" || !candidateRegistration.requestBody?.required) throw new Error("quant candidate registration operation is missing");
if (!JSON.stringify(candidateRegistration).includes("quant-candidate-registration-command.schema.json") || !JSON.stringify(candidateRegistration).includes("quant-candidate-registration-result.schema.json")) throw new Error("quant candidate registration schemas are not referenced");
for (const status of ["200", "201", "202", "403", "409", "422"]) if (!candidateRegistration.responses?.[status]) throw new Error(`quant candidate registration response ${status} is missing`);

const quantPromotionsPath = resolve(root, "packages/contracts/openapi/quant-promotions.v1.json");
const quantPromotionsDocument = JSON.parse(await readFile(quantPromotionsPath, "utf8"));
if (quantPromotionsDocument.openapi !== "3.1.0" || quantPromotionsDocument.components?.securitySchemes?.ServiceBearer?.scheme !== "bearer") throw new Error("quant PromotionRequest OpenAPI version or service Bearer security is missing");
const submitPromotion = quantPromotionsDocument.paths?.["/v1/promotions"]?.post;
const getPromotion = quantPromotionsDocument.paths?.["/v1/promotions/{promotionRequestId}"]?.get;
const getPromotionDetail = quantPromotionsDocument.paths?.["/v1/promotions/{promotionRequestId}/detail"]?.get;
const getValidationInput = quantPromotionsDocument.paths?.["/v1/promotions/{promotionRequestId}/validation-input"]?.get;
const decidePromotion = quantPromotionsDocument.paths?.["/v1/promotions/{promotionRequestId}/decision"]?.post;
const getApprovedRegistryVersion = quantPromotionsDocument.paths?.["/v1/registry/versions/{versionFingerprint}"]?.get;
if (submitPromotion?.operationId !== "submitPromotionRequest" || !submitPromotion.requestBody?.required || !JSON.stringify(submitPromotion).includes("v3.2-promotion-request.schema.json") || !JSON.stringify(submitPromotion).includes("v3.2-promotion-request-result.schema.json")) throw new Error("quant PromotionRequest submission contract is incomplete");
if (getPromotion?.operationId !== "getPromotionRequest" || !getPromotion.parameters?.some((parameter) => parameter.name === "promotionRequestId" && parameter.in === "path" && parameter.required)) throw new Error("quant PromotionRequest read contract is incomplete");
for (const status of ["200", "201", "403", "409", "413", "422"]) if (!submitPromotion.responses?.[status]) throw new Error(`submitPromotionRequest response ${status} is missing`);
for (const status of ["200", "403", "404"]) if (!getPromotion.responses?.[status]) throw new Error(`getPromotionRequest response ${status} is missing`);
if (getPromotionDetail?.operationId !== "getPromotionRequestDetail" || !JSON.stringify(getPromotionDetail).includes("v3.2-promotion-request-detail.schema.json")) throw new Error("quant PromotionRequest detail read contract is incomplete");
if (getValidationInput?.operationId !== "getIndependentValidationInput" || !JSON.stringify(getValidationInput).includes("v3.2-independent-validation-input.schema.json") || !JSON.stringify(getValidationInput).includes("quant-validation-worker")) throw new Error("independent validation input contract is incomplete");
for (const status of ["200", "403", "404", "422"]) if (!getValidationInput.responses?.[status]) throw new Error(`getIndependentValidationInput response ${status} is missing`);
for (const status of ["200", "403", "404", "422"]) if (!getPromotionDetail.responses?.[status]) throw new Error(`getPromotionRequestDetail response ${status} is missing`);
if (decidePromotion?.operationId !== "recordExactPromotionVersionDecision" || !decidePromotion.requestBody?.required || !JSON.stringify(decidePromotion).includes("v3.2-promotion-decision-command.schema.json") || !JSON.stringify(decidePromotion).includes("v3.2-promotion-decision-result.schema.json")) throw new Error("exact PromotionRequest decision operation contract is incomplete");
for (const status of ["200", "201", "403", "404", "409", "413", "422"]) if (!decidePromotion.responses?.[status]) throw new Error(`recordExactPromotionVersionDecision response ${status} is missing`);
if (getApprovedRegistryVersion?.operationId !== "getApprovedPromotionRegistryVersion" || !JSON.stringify(getApprovedRegistryVersion).includes("v3.2-promotion-registry-version.schema.json")) throw new Error("exact approved Registry version lookup contract is incomplete");
const registryCallerSchema = getApprovedRegistryVersion.parameters?.find((parameter) => parameter.name === "x-stockquant-service-id")?.schema;
if (JSON.stringify(registryCallerSchema?.enum) !== JSON.stringify(["platform-api-service", "decision-governance-service"])) throw new Error("approved Registry version lookup must authorize only Platform API and Decision Governance service identities");
for (const status of ["200", "403", "404"]) if (!getApprovedRegistryVersion.responses?.[status]) throw new Error(`getApprovedPromotionRegistryVersion response ${status} is missing`);
const quantQlibPath = resolve(root, "packages/contracts/openapi/quant-qlib.v1.json");
const quantQlibDocument = JSON.parse(await readFile(quantQlibPath, "utf8"));
const qlibFit = quantQlibDocument.paths?.["/v1/research/qlib/fit-fixture"]?.post;
if (quantQlibDocument.openapi !== "3.1.0" || quantQlibDocument.components?.securitySchemes?.ServiceBearer?.scheme !== "bearer" || !quantQlibDocument.security?.some((item) => item.ServiceBearer)) throw new Error("Qlib fixture-fit OpenAPI version or ServiceBearer security is missing");
const quantV12Preview = JSON.parse(await readFile(resolve(root, "packages/contracts/openapi/quant-v12-research-preview.v1.json"), "utf8"));
for (const [path, operationId, schema] of [["/v1/qlib/probe", "getV12QlibProbe", "v12-qlib-probe-preview.schema.json"], ["/v1/rdagent/probe", "getV12RDagentProbe", "v12-rdagent-probe-preview.schema.json"], ["/v1/factors/preview", "getV12FactorPreview", "v12-factor-preview.schema.json"]]) {
  const operation = quantV12Preview.paths?.[path]?.get;
  if (quantV12Preview.openapi !== "3.1.0" || operation?.operationId !== operationId || !operation.security?.some((entry) => entry.ServiceBearer) || operation.parameters?.find((item) => item.name === "x-stockquant-service-id")?.schema?.const !== "platform-api-service" || !JSON.stringify(operation.responses?.["200"]).includes(schema) || !operation.responses?.["401"]) throw new Error(`V1.2 Quant preview contract is incomplete: ${operationId}`);
}
const quantV14Backtest = JSON.parse(await readFile(resolve(root, "packages/contracts/openapi/quant-v14-daily-backtest.v1.json"), "utf8"));
const runV14Backtest = quantV14Backtest.paths?.["/v1/research/backtests/daily-fixture"]?.post;
if (quantV14Backtest.openapi !== "3.1.0" || runV14Backtest?.operationId !== "runV14DailyFixtureBacktest" || !runV14Backtest.security?.some((item) => item.ServiceBearer) || runV14Backtest.parameters?.find((item) => item.name === "x-stockquant-service-id")?.schema?.const !== "platform-api-service" || !runV14Backtest.requestBody?.required || !JSON.stringify(runV14Backtest.requestBody).includes("V14DailyBacktestRequest") || !JSON.stringify(runV14Backtest.responses?.["200"]).includes("V14DailyBacktestResult") || !JSON.stringify(quantV14Backtest.components?.schemas?.V14DailyBacktestRequest).includes("v14-daily-backtest-request.schema.json") || !JSON.stringify(quantV14Backtest.components?.schemas?.V14DailyBacktestResult).includes("v14-daily-backtest-result.schema.json")) throw new Error("V1.4 Quant daily-backtest operation contract is incomplete");
for (const status of ["200", "403", "413", "422", "503"]) if (!runV14Backtest.responses?.[status]) throw new Error(`runV14DailyFixtureBacktest response ${status} is missing`);
if (qlibFit?.operationId !== "fitQlibFixtureModel" || !qlibFit.requestBody?.required || !JSON.stringify(qlibFit).includes("qlib-fit-fixture-request.schema.json") || !JSON.stringify(qlibFit).includes("qlib-fit-fixture-result.schema.json")) throw new Error("Qlib fixture-fit operation contract is incomplete");
for (const status of ["200", "403", "413", "422", "503"]) if (!qlibFit.responses?.[status]) throw new Error(`fitQlibFixtureModel response ${status} is missing`);
const platformV23QlibPath = resolve(root, "packages/contracts/openapi/platform-v23-qlib-fixture.v1.json");
const platformV23QlibDocument = JSON.parse(await readFile(platformV23QlibPath, "utf8"));
const createV23QlibRun = platformV23QlibDocument.paths?.["/api/v1/acceptance/v2/v2.3/research/qlib-fixture/runs"]?.post;
const readV23QlibArtifact = platformV23QlibDocument.paths?.["/api/v1/acceptance/v2/v2.3/runs/{testRunId}/artifacts/{artifactId}"]?.get;
if (platformV23QlibDocument.openapi !== "3.1.0" || createV23QlibRun?.operationId !== "createV23QlibFixtureTestRun" || !createV23QlibRun.security?.some((item) => item.localSession) || !createV23QlibRun.requestBody?.required) throw new Error("V2.3 owner-scoped Qlib Fixture TestRun contract is incomplete");
for (const status of ["201", "401", "403"]) if (!createV23QlibRun.responses?.[status]) throw new Error(`createV23QlibFixtureTestRun response ${status} is missing`);
if (!JSON.stringify(createV23QlibRun.responses?.["201"]).includes("testRunId") || !JSON.stringify(createV23QlibRun.responses?.["201"]).includes("COMPLETED") || !JSON.stringify(createV23QlibRun.responses?.["201"]).includes("FAILED")) throw new Error("V2.3 Qlib Fixture TestRun response must identify its persisted result");
if (readV23QlibArtifact?.operationId !== "readV23QlibFixtureArtifact" || !readV23QlibArtifact.security?.some((item) => item.localSession) || !readV23QlibArtifact.parameters?.some((parameter) => parameter.name === "testRunId" && parameter.required) || !readV23QlibArtifact.parameters?.some((parameter) => parameter.name === "artifactId" && parameter.required)) throw new Error("V2.3 Qlib Fixture Artifact owner-scoped read contract is incomplete");
for (const status of ["200", "404"]) if (!readV23QlibArtifact.responses?.[status]) throw new Error(`readV23QlibFixtureArtifact response ${status} is missing`);
const platformV12QlibDocument = JSON.parse(await readFile(resolve(root, "packages/contracts/openapi/platform-v12-qlib-fixture.v1.json"), "utf8"));
const createV12QlibRun = platformV12QlibDocument.paths?.["/api/v1/acceptance/v1/v1.2/runs"]?.post;
const cancelV12QlibRun = platformV12QlibDocument.paths?.["/api/v1/acceptance/v1/v1.2/runs/{testRunId}/cancel"]?.post;
const readV12QlibArtifact = platformV12QlibDocument.paths?.["/api/v1/acceptance/v1/v1.2/runs/{testRunId}/artifacts/{artifactId}"]?.get;
if (platformV12QlibDocument.openapi !== "3.1.0" || createV12QlibRun?.operationId !== "createV12QlibStrategyTestRun" || !createV12QlibRun.security?.some((item) => item.localSession) || !createV12QlibRun.requestBody?.required) throw new Error("V1.2 owner-scoped Qlib strategy TestRun contract is incomplete");
for (const status of ["202", "401", "403"]) if (!createV12QlibRun.responses?.[status]) throw new Error(`createV12QlibStrategyTestRun response ${status} is missing`);
if (cancelV12QlibRun?.operationId !== "cancelV12QlibStrategyTestRun" || !cancelV12QlibRun.security?.some((item) => item.localSession) || !cancelV12QlibRun.parameters?.some((item) => item.name === "testRunId" && item.required)) throw new Error("V1.2 owner-scoped cooperative cancellation contract is incomplete");
for (const status of ["202", "401", "403", "404", "409"]) if (!cancelV12QlibRun.responses?.[status]) throw new Error(`cancelV12QlibStrategyTestRun response ${status} is missing`);
if (readV12QlibArtifact?.operationId !== "readV12QlibStrategyArtifact" || !readV12QlibArtifact.security?.some((item) => item.localSession) || !readV12QlibArtifact.parameters?.some((item) => item.name === "testRunId" && item.required) || !readV12QlibArtifact.parameters?.some((item) => item.name === "artifactId" && item.required) || !JSON.stringify(readV12QlibArtifact.responses?.["200"]).includes("v12-qlib-strategy-artifact-v1.schema.json")) throw new Error("V1.2 owner-scoped immutable Qlib strategy Artifact read contract is incomplete");
for (const status of ["200", "401", "404"]) if (!readV12QlibArtifact.responses?.[status]) throw new Error(`readV12QlibStrategyArtifact response ${status} is missing`);
const platformV14ReportDocument = JSON.parse(await readFile(resolve(root, "packages/contracts/openapi/platform-v14-backtest-report.v1.json"), "utf8"));
const platformV14Scenarios = platformV14ReportDocument.paths?.["/api/v1/acceptance/v1/v1.4/scenarios"]?.get;
const createV14Run = platformV14ReportDocument.paths?.["/api/v1/acceptance/v1/v1.4/runs"]?.post;
const readV14Run = platformV14ReportDocument.paths?.["/api/v1/acceptance/v1/v1.4/runs/{testRunId}"]?.get;
const readV14Report = platformV14ReportDocument.paths?.["/api/v1/acceptance/v1/v1.4/runs/{testRunId}/artifacts/{artifactId}"]?.get;
const cancelV14Run = platformV14ReportDocument.paths?.["/api/v1/acceptance/v1/v1.4/runs/{testRunId}/cancel"]?.post;
if (platformV14ReportDocument.openapi !== "3.1.0" || platformV14Scenarios?.operationId !== "listV14BacktestScenarios" || !platformV14Scenarios.security?.some((item) => item.localSession) || !JSON.stringify(platformV14Scenarios.responses?.["200"]).includes("V14Scenario")) throw new Error("V1.4 scenario-list contract is incomplete");
if (createV14Run?.operationId !== "createV14BacktestTestRun" || !createV14Run.security?.some((item) => item.localSession) || !createV14Run.requestBody?.required || !JSON.stringify(createV14Run.requestBody).includes("V14RunRequest") || !JSON.stringify(platformV14ReportDocument.components?.schemas?.V14ExecutionPolicy).includes("marketFeeSchedule") || !JSON.stringify(platformV14ReportDocument.components?.schemas?.V14ExecutionPolicy).includes("sellOrder")) throw new Error("V1.4 owner-scoped TestRun creation/policy contract is incomplete");
const v14Schemas = platformV14ReportDocument.components?.schemas ?? {};
const v14Policy = v14Schemas.V14ExecutionPolicy;
const v14FeeSchedules = v14Schemas.V14MarketFeeSchedule?.oneOf ?? [];
const v14SellOrder = v14Policy?.properties?.sellOrder;
if (v14Policy?.properties?.initialCashCents?.minimum !== 1 || v14Policy?.properties?.initialCashCents?.maximum !== Number.MAX_SAFE_INTEGER || v14Policy?.properties?.participationRateBasisPoints?.minimum !== 1 || v14Policy?.properties?.participationRateBasisPoints?.maximum !== 10_000 || v14Policy?.additionalProperties !== false) throw new Error("V1.4 execution policy numeric bounds or closed field set drifted");
if (v14FeeSchedules.length !== 2 || v14FeeSchedules[0]?.properties?.scheduleId?.const !== "CN_A_CASH_EQUITY_2022_04_29_TO_2023_08_27" || v14FeeSchedules[0]?.properties?.commissionRatePartsPerBillion?.minimum !== 68_700 || v14FeeSchedules[1]?.properties?.scheduleId?.const !== "CN_A_CASH_EQUITY_2023_08_28" || v14FeeSchedules[1]?.properties?.commissionRatePartsPerBillion?.minimum !== 54_100) throw new Error("V1.4 CN_A fee schedule boundaries drifted");
if (!v14SellOrder?.required?.includes("signalDate") || !v14SellOrder?.required?.includes("executionDate") || !v14SellOrder?.required?.includes("quantity") || v14SellOrder?.properties?.signalDate?.format !== "date" || v14SellOrder?.properties?.executionDate?.format !== "date") throw new Error("V1.4 sellOrder schema must preserve the required dated order fields");
const v14RequestSchema = v14Schemas.V14RunRequest;
if (!JSON.stringify(v14RequestSchema?.allOf ?? []).includes('"corporate-actions"') || !JSON.stringify(v14RequestSchema?.allOf ?? []).includes('"policy"')) throw new Error("V1.4 corporate-actions frozen policy rule is missing");
for (const status of ["202", "401", "403", "422"]) if (!createV14Run.responses?.[status]) throw new Error(`createV14BacktestTestRun response ${status} is missing`);
if (readV14Run?.operationId !== "readV14BacktestTestRun" || !readV14Run.security?.some((item) => item.localSession) || !JSON.stringify(readV14Run.responses?.["200"]).includes("#/components/schemas/ArtifactRef") || !JSON.stringify(platformV14ReportDocument.components?.schemas?.ArtifactRef).includes("artifact-ref.schema.json")) throw new Error("V1.4 owner-scoped TestRun ArtifactRef contract is incomplete");
if (readV14Report?.operationId !== "readV14BacktestReportArtifact" || !readV14Report.security?.some((item) => item.localSession) || !readV14Report.parameters?.some((item) => item.name === "testRunId" && item.required) || !readV14Report.parameters?.some((item) => item.name === "artifactId" && item.required) || !JSON.stringify(readV14Report.responses?.["200"]).includes("#/components/schemas/ArtifactRef")) throw new Error("V1.4 owner-scoped report Artifact export contract is incomplete");
if (cancelV14Run?.operationId !== "cancelV14BacktestTestRun" || !cancelV14Run.security?.some((item) => item.localSession) || !cancelV14Run.parameters?.some((item) => item.name === "testRunId" && item.required) || cancelV14Run.requestBody?.required === true || cancelV14Run.requestBody?.content?.["application/json"]?.schema?.maxProperties !== 0) throw new Error("V1.4 owner-scoped cancellation contract must permit only an omitted or empty request body");
for (const status of ["202", "401", "404", "409", "422"]) if (!cancelV14Run.responses?.[status]) throw new Error(`cancelV14BacktestTestRun response ${status} is missing`);
for (const operation of [platformV14Scenarios, readV14Run, readV14Report]) for (const status of ["200", "401", ...(operation === readV14Run || operation === readV14Report ? ["404"] : [])]) if (!operation.responses?.[status]) throw new Error(`${operation.operationId} response ${status} is missing`);
const platformV14ControllerSource = await readFile(resolve(root, "services/platform-api-service/src/bootstrap/app.module.ts"), "utf8");
const v14Controller = platformV14ControllerSource.split('@Controller("api/v1/acceptance/v1/v1.4")')[1]?.split('@Controller("api/v1/acceptance/v1/v1.5")')[0] ?? "";
const controllerRoutes = [...v14Controller.matchAll(/@(Get|Post)\("([^"]+)"\)/g)].map((match) => `${match[1].toLowerCase()} /${match[2].replace(/:([^/]+)/g, "{$1}")}`).sort();
const contractRoutes = Object.entries(platformV14ReportDocument.paths ?? {}).flatMap(([path, methods]) => Object.keys(methods).map((method) => `${method} ${path.replace("/api/v1/acceptance/v1/v1.4", "")}`)).sort();
if (JSON.stringify(controllerRoutes) !== JSON.stringify(contractRoutes)) throw new Error(`V1.4 Platform route inventory differs from OpenAPI: controller=${controllerRoutes.join(",")} contract=${contractRoutes.join(",")}`);
const governanceCandidateMandatePath = resolve(root, "packages/contracts/openapi/decision-governance-candidate-mandate.v1.json");
const governanceCandidateMandateDocument = JSON.parse(await readFile(governanceCandidateMandatePath, "utf8"));
const candidateMandateReadiness = governanceCandidateMandateDocument.paths?.["/internal/v1/candidate-mandates/readiness"]?.post;
if (governanceCandidateMandateDocument.openapi !== "3.1.0" || governanceCandidateMandateDocument.components?.securitySchemes?.ServiceBearer?.scheme !== "bearer" || candidateMandateReadiness?.operationId !== "assessApprovedCandidateMandateBinding" || !JSON.stringify(candidateMandateReadiness).includes("v3.2-candidate-mandate-binding-command.schema.json") || !JSON.stringify(candidateMandateReadiness).includes("v3.2-candidate-mandate-binding-result.schema.json")) throw new Error("Governance exact candidate binding operation is incomplete");
for (const status of ["200", "403", "413", "422", "503"]) if (!candidateMandateReadiness.responses?.[status]) throw new Error(`assessApprovedCandidateMandateBinding response ${status} is missing`);
const calendarPath = resolve(root, "packages/contracts/openapi/market-data-calendar.v1.json");
const calendarDocument = JSON.parse(await readFile(calendarPath, "utf8"));
if (calendarDocument.openapi !== "3.1.0") throw new Error("Market Data calendar OpenAPI version must be 3.1.0");
const calendarSession = calendarDocument.paths?.["/v2/calendar/cn-a-share/{date}"]?.get;
if (calendarSession?.operationId !== "getCnAShareCalendarSession" || !calendarSession.parameters?.some((parameter) => parameter.name === "date" && parameter.in === "path" && parameter.required)) throw new Error("CN A-share calendar operation or date path parameter is missing");
if (!JSON.stringify(calendarSession).includes("cn-a-share-calendar-session.schema.json") || !calendarSession.responses?.["200"] || !calendarSession.responses?.["400"] || !calendarSession.responses?.["404"]) throw new Error("CN A-share calendar response contract is incomplete");
for (const [path, operationId] of [["/v1/fixtures/normal/preview", "getV12NormalFixturePreview"], ["/v1/fixtures/bad-future/preview", "getV12FutureFixturePreview"]]) {
  const operation = calendarDocument.paths?.[path]?.get;
  if (operation?.operationId !== operationId || !operation.security?.some((entry) => entry.ServiceBearer) || operation.parameters?.find((parameter) => parameter.name === "x-stockquant-service-id")?.schema?.const !== "platform-api-service" || !JSON.stringify(operation.responses?.["200"]).includes("v12-fixture-preview-v1.schema.json") || !operation.responses?.["401"]) throw new Error(`V1.2 fixture operation contract is incomplete: ${operationId}`);
}
const v12ResearchFixture = calendarDocument.paths?.["/v1/fixtures/research-preview"]?.get;
if (v12ResearchFixture?.operationId !== "getV12ResearchFixturePreview" || !v12ResearchFixture.security?.some((item) => item.ServiceBearer) || v12ResearchFixture.parameters?.find((parameter) => parameter.name === "x-stockquant-service-id")?.schema?.const !== "platform-api-service" || !JSON.stringify(v12ResearchFixture.responses?.["200"]).includes("v12-research-fixture-preview-v1.schema.json") || !v12ResearchFixture.responses?.["401"]) throw new Error("V1.2 dual-market research Fixture operation contract is incomplete");
for (const [path, operationId, schema] of [["/v2/collection-schedules/{subscriptionId}", "getCollectionScheduleForPlatform", "collection-schedule-view-v1.schema.json"], ["/v2/minute/gaps/{subscriptionId}", "getMinuteGapsForPlatform", "minute-open-gaps-v1.schema.json"]]) {
  const operation = calendarDocument.paths?.[path]?.get;
  if (operation?.operationId !== operationId || !operation.security?.some((entry) => entry.ServiceBearer) || !operation.parameters?.some((parameter) => parameter.name === "subscriptionId" && parameter.in === "path" && parameter.required) || operation.parameters?.find((parameter) => parameter.name === "x-stockquant-service-id")?.schema?.const !== "platform-api-service" || !JSON.stringify(operation.responses?.["200"]).includes(schema) || !operation.responses?.["401"]) throw new Error(`Collection preview contract is incomplete: ${operationId}`);
}
const alertList = calendarDocument.paths?.["/v2/alerts"]?.get;
const alertAcknowledge = calendarDocument.paths?.["/v2/alerts/{incidentId}/acknowledge"]?.post;
if (alertList?.operationId !== "getMarketDataAlertIncidents" || !alertList.security?.some((item) => item.ServiceBearer) || alertList.parameters?.find((parameter) => parameter.name === "x-stockquant-service-id")?.schema?.const !== "platform-api-service" || !JSON.stringify(alertList.responses?.["200"]).includes("alert-incidents-v1.schema.json") || !alertList.responses?.["401"]) throw new Error("Market Data alert list contract is incomplete");
if (alertAcknowledge?.operationId !== "acknowledgeMarketDataAlertIncident" || !alertAcknowledge.security?.some((item) => item.ServiceBearer) || !alertAcknowledge.requestBody?.required || !JSON.stringify(alertAcknowledge.requestBody).includes("alert-acknowledge-request-v1.schema.json") || !JSON.stringify(alertAcknowledge.responses?.["200"]).includes("market-data-alert-incident-v1.schema.json") || !alertAcknowledge.responses?.["401"] || !alertAcknowledge.responses?.["404"]) throw new Error("Market Data alert acknowledgement contract is incomplete");
const v22OperationCount = Object.values(minuteCsvDocument.paths).reduce((count, pathItem) => count + Object.keys(pathItem).filter((method) => ["get", "post", "put", "patch", "delete"].includes(method)).length, 0);
const platformV23QlibOperationCount = Object.values(platformV23QlibDocument.paths).reduce((count, pathItem) => count + Object.keys(pathItem).filter((method) => ["get", "post", "put", "patch", "delete"].includes(method)).length, 0);
const quantPromotionOperationCount = Object.values(quantPromotionsDocument.paths).reduce((count, pathItem) => count + Object.keys(pathItem).filter((method) => ["get", "post", "put", "patch", "delete"].includes(method)).length, 0);
const v31AcceptancePath = resolve(root, "packages/contracts/openapi/v31-acceptance-gate.v1.json");
const v31AcceptanceDocument = JSON.parse(await readFile(v31AcceptancePath, "utf8"));
const readOwnedV31Gate = v31AcceptanceDocument.paths?.["/api/v1/acceptance/v3/v3.1/runs/{testRunId}/promotion-gate"]?.get;
const acceptV31 = v31AcceptanceDocument.paths?.["/api/v1/acceptance/v3/v3.1/runs/{testRunId}/acceptance"]?.post;
const readV31Gate = v31AcceptanceDocument.paths?.["/internal/v1/acceptance/v3/v3.1/gate/{testRunId}"]?.get;
if (v31AcceptanceDocument.openapi !== "3.1.0" || v31AcceptanceDocument.components?.securitySchemes?.ServiceBearer?.scheme !== "bearer") throw new Error("V3.1 acceptance/gate OpenAPI security is missing");
if (readOwnedV31Gate?.operationId !== "readOwnedV31PromotionGate" || !readOwnedV31Gate.security?.some((item) => item.localSession) || !JSON.stringify(readOwnedV31Gate).includes("v3.1-promotion-gate.schema.json")) throw new Error("owner-scoped V3.1 gate read operation is incomplete");
for (const status of ["200", "401", "403", "404", "422"]) if (!readOwnedV31Gate.responses?.[status]) throw new Error(`readOwnedV31PromotionGate response ${status} is missing`);
if (acceptV31?.operationId !== "acceptExactV31Run" || !acceptV31.security?.some((item) => item.localSession) || !JSON.stringify(acceptV31).includes("v3.1-human-acceptance.schema.json")) throw new Error("V3.1 exact-run acceptance operation is incomplete");
for (const status of ["201", "401", "403", "404", "409", "422"]) if (!acceptV31.responses?.[status]) throw new Error(`acceptExactV31Run response ${status} is missing`);
if (readV31Gate?.operationId !== "readV31PromotionGate" || !readV31Gate.security?.some((item) => item.ServiceBearer) || !readV31Gate.parameters?.some((parameter) => parameter.name === "x-stockquant-service-id" && parameter.required) || !JSON.stringify(readV31Gate).includes("v3.1-promotion-gate.schema.json")) throw new Error("V3.1 promotion gate operation is incomplete");
for (const status of ["200", "401", "403", "404", "422"]) if (!readV31Gate.responses?.[status]) throw new Error(`readV31PromotionGate response ${status} is missing`);
const v33QueuePath = resolve(root, "packages/contracts/openapi/platform-v33-research-queue.v1.json");
const v33QueueDocument = JSON.parse(await readFile(v33QueuePath, "utf8"));
const v33QueueOperationCount = Object.values(v33QueueDocument.paths).reduce((count, pathItem) => count + Object.keys(pathItem).filter((method) => ["get", "post", "put", "patch", "delete"].includes(method)).length, 0);
const createV31Experiment = v33QueueDocument.paths?.["/v1/experiments"]?.post;
const configureV33BudgetLimit = v33QueueDocument.paths?.["/v1/runner/budgets/test-run/limit"]?.post;
const v33ResearchQueue = v33QueueDocument.paths?.["/v1/runner/jobs"]?.get;
const settleV33ExperimentFromModelCalls = v33QueueDocument.paths?.["/v1/experiments/{experimentId}/budget/settle-from-model-calls"]?.post;
const v31RunnerDispatch = v33QueueDocument.paths?.["/v1/runner/jobs"]?.post;
const v33PlatformQueue = v33QueueDocument.paths?.["/api/v1/acceptance/v3/v3.3/runs/{testRunId}/research/queue"]?.get;
const v33PlatformReconcile = v33QueueDocument.paths?.["/api/v1/acceptance/v3/v3.3/runs/{testRunId}/reconcile"]?.post;
const v33PlatformRejection = v33QueueDocument.paths?.["/api/v1/acceptance/v3/v3.3/runs/{testRunId}/verify-rejection"]?.post;
if (v33QueueDocument.openapi !== "3.1.0" || v33QueueDocument.components?.securitySchemes?.ServiceBearer?.scheme !== "bearer" || v33ResearchQueue?.operationId !== "listRunnerJobsForTestRun" || !v33ResearchQueue.security?.some((item) => item.ServiceBearer) || !JSON.stringify(v33ResearchQueue).includes("v3.3-runner-queue.schema.json") || !v33ResearchQueue.parameters?.some((parameter) => parameter.name === "testRunId" && parameter.required)) throw new Error("V3.3 Research Automation queue contract is incomplete");
if (settleV33ExperimentFromModelCalls?.operationId !== "settleV31ExperimentBudgetFromModelCalls" || !settleV33ExperimentFromModelCalls.security?.some((item) => item.ServiceBearer) || !settleV33ExperimentFromModelCalls.requestBody?.required || !JSON.stringify(settleV33ExperimentFromModelCalls).includes("v3.3-experiment-ledger-settlement-command.schema.json") || !JSON.stringify(settleV33ExperimentFromModelCalls).includes("v3.3-experiment-ledger-settlement-result.schema.json")) throw new Error("V3.3 ledger-derived Experiment settlement contract is incomplete");
for (const status of ["200", "401", "403", "409", "422", "503"]) if (!settleV33ExperimentFromModelCalls.responses?.[status]) throw new Error(`settleV31ExperimentBudgetFromModelCalls response ${status} is missing`);
if (createV31Experiment?.operationId !== "createV31Experiment" || !createV31Experiment.security?.some((item) => item.ServiceBearer) || !createV31Experiment.requestBody?.required || !JSON.stringify(createV31Experiment).includes("v3.1-experiment.schema.json") || !JSON.stringify(createV31Experiment).includes("v3.1-experiment-result.schema.json")) throw new Error("V3.1 Experiment creation contract is incomplete");
if (configureV33BudgetLimit?.operationId !== "configureV33TestRunBudgetLimit" || !configureV33BudgetLimit.security?.some((item) => item.ServiceBearer) || !configureV33BudgetLimit.requestBody?.required || !configureV33BudgetLimit.parameters?.some((parameter) => parameter.name === "x-stockquant-service-id" && parameter.schema?.const === "platform-api-service") || !JSON.stringify(configureV33BudgetLimit).includes("v3.3-test-run-budget-limit-command.schema.json") || !JSON.stringify(configureV33BudgetLimit).includes("v3.3-test-run-budget-limit-result.schema.json")) throw new Error("V3.3 per-TestRun budget cap operation contract is incomplete");
for (const status of ["200", "401", "403", "409", "422", "503"]) if (!configureV33BudgetLimit.responses?.[status]) throw new Error(`configureV33TestRunBudgetLimit response ${status} is missing`);
for (const status of ["200", "202", "401", "403", "409", "422", "503"]) if (!createV31Experiment.responses?.[status]) throw new Error(`createV31Experiment response ${status} is missing`);
for (const status of ["200", "401", "403", "422"]) if (!v33ResearchQueue.responses?.[status]) throw new Error(`listRunnerJobsForTestRun response ${status} is missing`);
if (v31RunnerDispatch?.operationId !== "submitV31RunnerJob" || !v31RunnerDispatch.security?.some((item) => item.ServiceBearer) || !v31RunnerDispatch.requestBody?.required || !JSON.stringify(v31RunnerDispatch).includes("v3.1-runner-job.schema.json") || !JSON.stringify(v31RunnerDispatch).includes("v3.1-runner-job-dispatch-result.schema.json")) throw new Error("V3.1 Runner dispatch contract is incomplete");
for (const status of ["202", "401", "403", "404", "409", "422", "503"]) if (!v31RunnerDispatch.responses?.[status]) throw new Error(`submitV31RunnerJob response ${status} is missing`);
const v31ResearchAutomationOperations = [
  ["/v1/runner/jobs/{jobId}", "post", "cancelV31RunnerJob", null, "v3.1-runner-job-dispatch-result.schema.json"],
  ["/v1/experiments", "post", "createV31Experiment", "v3.1-experiment.schema.json", "v3.1-experiment-result.schema.json"],
  ["/v1/experiments/{experimentId}/budget", "get", "readV31ExperimentBudget", null, "v3.1-experiment-budget-result.schema.json"],
  ["/v1/experiments/{experimentId}/budget/settle", "post", "settleV31ExperimentBudget", "v3.1-experiment-budget-settle-command.schema.json", "v3.1-experiment-budget-result.schema.json"],
  ["/v1/experiments/{experimentId}/cancel", "post", "cancelV31Experiment", null, "v3.1-experiment-cancellation-result.schema.json"],
  ["/v1/runner/jobs", "post", "submitV31RunnerJob", "v3.1-runner-job.schema.json", "v3.1-runner-job-dispatch-result.schema.json"],
  ["/v1/runner/jobs/{jobId}", "get", "readV31RunnerJob", null, "v3.1-runner-job-record.schema.json"],
  ["/v1/artifacts/publish", "post", "publishV31Artifact", "v3.1-artifact-publish-command.schema.json", "v3.1-artifact-publish-result.schema.json"],
  ["/v1/artifacts/read", "post", "readV31Artifact", "v3.1-artifact-read-command.schema.json", "v3.1-runner-input-response.schema.json"],
  ["/v1/model-gateway/fixture-call", "post", "callV31ModelGatewayFixture", "v3.1-model-gateway-fixture-command.schema.json", "v3.1-model-gateway-fixture-result.schema.json"],
  ["/v1/model-gateway/fixture/openai/v1/chat/completions", "post", "callV31ModelGatewayOpenAIChatFixture", "v3.1-model-gateway-openai-chat-command.schema.json", "v3.1-model-gateway-openai-chat-result.schema.json"],
  ["/v1/model-gateway/fixture/openai/v1/embeddings", "post", "callV31ModelGatewayOpenAIEmbeddingFixture", "v3.1-model-gateway-openai-embedding-command.schema.json", "v3.1-model-gateway-openai-embedding-result.schema.json"],
];
for (const [path, method, operationId, requestSchema, responseSchema] of v31ResearchAutomationOperations) {
  const operation = v33QueueDocument.paths?.[path]?.[method];
  if (operation?.operationId !== operationId || !operation.security?.some((item) => item.ServiceBearer) || (requestSchema && !JSON.stringify(operation.requestBody).includes(requestSchema)) || !JSON.stringify(operation.responses).includes(responseSchema)) throw new Error(`Research Automation V3.1 operation contract is incomplete: ${operationId}`);
}
if (v33PlatformQueue?.operationId !== "readOwnedV33ResearchQueue" || !v33PlatformQueue.security?.some((item) => item.LocalSession) || !JSON.stringify(v33PlatformQueue).includes("v3.3-runner-queue.schema.json")) throw new Error("V3.3 owner-scoped Platform queue contract is incomplete");
for (const status of ["200", "401", "403", "404", "422", "503"]) if (!v33PlatformQueue.responses?.[status]) throw new Error(`readOwnedV33ResearchQueue response ${status} is missing`);
if (v33PlatformReconcile?.operationId !== "reconcileOwnedV33FixtureRunnerScenario" || !v33PlatformReconcile.security?.some((item) => item.LocalSession) || !v33PlatformReconcile.requestBody?.required || !JSON.stringify(v33PlatformReconcile).includes("v3.3-scenario-reconcile-command.schema.json") || !JSON.stringify(v33PlatformReconcile).includes("v3.3-scenario-reconcile-result.schema.json")) throw new Error("V3.3 owner-scoped Runner result reconciliation contract is incomplete");
for (const status of ["201", "401", "404", "409", "422", "503"]) if (!v33PlatformReconcile.responses?.[status]) throw new Error(`reconcileOwnedV33FixtureRunnerScenario response ${status} is missing`);
if (v33PlatformRejection?.operationId !== "verifyOwnedV33BudgetRejection" || !v33PlatformRejection.security?.some((item) => item.LocalSession) || !v33PlatformRejection.requestBody?.required || !JSON.stringify(v33PlatformRejection).includes("v3.3-rejection-verify-command.schema.json") || !JSON.stringify(v33PlatformRejection).includes("v3.3-rejection-verify-result.schema.json")) throw new Error("V3.3 owner-scoped budget rejection assertion contract is incomplete");
for (const status of ["201", "401", "404", "409", "422", "503"]) if (!v33PlatformRejection.responses?.[status]) throw new Error(`verifyOwnedV33BudgetRejection response ${status} is missing`);
const researchPromotionPath = resolve(root, "packages/contracts/openapi/research-automation-promotions.v1.json");
const researchPromotionDocument = JSON.parse(await readFile(researchPromotionPath, "utf8"));
const preparePromotion = researchPromotionDocument.paths?.["/v1/promotions/prepare"]?.post;
const submitAfterGate = researchPromotionDocument.paths?.["/v1/promotions/submit"]?.post;
const readSubmittedCandidate = researchPromotionDocument.paths?.["/v1/promotions/{promotionRequestId}/candidate-artifact"]?.get;
if (researchPromotionDocument.openapi !== "3.1.0" || preparePromotion?.operationId !== "preparePromotionRequestEvidence" || !preparePromotion.security?.some((item) => item.ServiceBearer) || !preparePromotion.parameters?.some((parameter) => parameter.name === "x-stockquant-service-id" && parameter.schema?.const === "platform-api-service") || !JSON.stringify(preparePromotion.requestBody).includes("v3.2-promotion-submit-command.schema.json") || !JSON.stringify(preparePromotion.responses).includes("v3.2-promotion-prepare-result.schema.json")) throw new Error("Research Automation platform-only V3.2 preparation contract is incomplete");
for (const status of ["200", "202", "401", "403", "422", "503"]) if (!preparePromotion.responses?.[status]) throw new Error(`preparePromotionRequestEvidence response ${status} is missing`);
if (researchPromotionDocument.openapi !== "3.1.0" || researchPromotionDocument.components?.securitySchemes?.ServiceBearer?.scheme !== "bearer" || submitAfterGate?.operationId !== "submitPromotionAfterV31Acceptance" || !submitAfterGate.security?.some((item) => item.ServiceBearer) || !JSON.stringify(submitAfterGate).includes("v3.2-promotion-submit-command.schema.json") || !JSON.stringify(submitAfterGate).includes("v3.2-promotion-submit-result.schema.json")) throw new Error("Research Automation guarded V3.2 submit operation is incomplete");
for (const status of ["200", "201", "202", "401", "403", "422", "503"]) if (!submitAfterGate.responses?.[status]) throw new Error(`submitPromotionAfterV31Acceptance response ${status} is missing`);
if (readSubmittedCandidate?.operationId !== "readSubmittedCandidateArtifactForIndependentValidation" || !readSubmittedCandidate.security?.some((item) => item.ServiceBearer) || !readSubmittedCandidate.parameters?.some((parameter) => parameter.name === "x-stockquant-service-id" && parameter.schema?.const === "quant-validation-worker") || !JSON.stringify(readSubmittedCandidate).includes("v3.2-candidate-artifact-result.schema.json")) throw new Error("Worker-scoped submitted candidate Artifact operation is incomplete");
for (const status of ["200", "401", "403", "404", "409", "413", "503"]) if (!readSubmittedCandidate.responses?.[status]) throw new Error(`readSubmittedCandidateArtifactForIndependentValidation response ${status} is missing`);
const platformV32SubmitPath = resolve(root, "packages/contracts/openapi/platform-v32-promotion-submit.v1.json");
const platformV32SubmitDocument = JSON.parse(await readFile(platformV32SubmitPath, "utf8"));
const platformV32ReadinessCreate = platformV32SubmitDocument.paths?.["/api/v1/acceptance/v3/v3.2/runs"]?.post;
const platformV32ReadinessRead = platformV32SubmitDocument.paths?.["/api/v1/acceptance/v3/v3.2/runs/{testRunId}"]?.get;
const platformV32Submit = platformV32SubmitDocument.paths?.["/api/v1/acceptance/v3/v3.2/runs/{testRunId}/promotion-submission"]?.post;
const platformV32Decision = platformV32SubmitDocument.paths?.["/api/v1/acceptance/v3/v3.2/promotions/{promotionRequestId}/decision"]?.post;
const platformV32Evidence = platformV32SubmitDocument.paths?.["/api/v1/acceptance/v3/v3.2/promotions/{promotionRequestId}"]?.get;
const platformV32MandateBinding = platformV32SubmitDocument.paths?.["/api/v1/acceptance/v3/v3.2/candidate-mandate-binding"]?.post;
if (platformV32ReadinessCreate?.operationId !== "createV32ReadinessTestRun" || !platformV32ReadinessCreate.security?.some((item) => item.localSession) || !JSON.stringify(platformV32ReadinessCreate).includes("v32-readiness-run-request.schema.json") || !JSON.stringify(platformV32ReadinessCreate).includes("v32-readiness-run-result.schema.json")) throw new Error("Platform V3.2 readiness TestRun creation contract is incomplete");
for (const status of ["202", "401", "403", "404", "422"]) if (!platformV32ReadinessCreate.responses?.[status]) throw new Error(`createV32ReadinessTestRun response ${status} is missing`);
if (platformV32ReadinessRead?.operationId !== "readV32ReadinessTestRun" || !platformV32ReadinessRead.security?.some((item) => item.localSession) || !JSON.stringify(platformV32ReadinessRead).includes("v32-readiness-run-result.schema.json")) throw new Error("Platform V3.2 readiness TestRun read contract is incomplete");
for (const status of ["200", "401", "403", "404", "422"]) if (!platformV32ReadinessRead.responses?.[status]) throw new Error(`readV32ReadinessTestRun response ${status} is missing`);
if (platformV32SubmitDocument.openapi !== "3.1.0" || platformV32Submit?.operationId !== "submitV32PromotionForOwnedV31Run" || !platformV32Submit.security?.some((item) => item.localSession) || !JSON.stringify(platformV32Submit).includes("v3.2-user-promotion-submit-command.schema.json") || !JSON.stringify(platformV32Submit).includes("v3.2-user-promotion-submit-result.schema.json")) throw new Error("Platform owner-scoped V3.2 submit operation is incomplete");
for (const status of ["202", "401", "403", "404", "409", "422", "503"]) if (!platformV32Submit.responses?.[status]) throw new Error(`submitV32PromotionForOwnedV31Run response ${status} is missing`);
if (platformV32Decision?.operationId !== "decideOwnedPromotionVersion" || !platformV32Decision.security?.some((item) => item.localSession) || !JSON.stringify(platformV32Decision).includes("v3.2-user-promotion-decision-command.schema.json") || !JSON.stringify(platformV32Decision).includes("v3.2-user-promotion-decision-result.schema.json")) throw new Error("owner-scoped V3.2 exact-version decision operation is incomplete");
for (const status of ["200", "401", "403", "404", "409", "422", "503"]) if (!platformV32Decision.responses?.[status]) throw new Error(`decideOwnedPromotionVersion response ${status} is missing`);
if (platformV32Evidence?.operationId !== "readOwnedPromotionEvidence" || !platformV32Evidence.security?.some((item) => item.localSession) || !JSON.stringify(platformV32Evidence).includes("v3.2-platform-promotion-evidence.schema.json")) throw new Error("owner-scoped V3.2 promotion evidence read is incomplete");
for (const status of ["200", "401", "403", "404", "409", "503"]) if (!platformV32Evidence.responses?.[status]) throw new Error(`readOwnedPromotionEvidence response ${status} is missing`);
if (platformV32MandateBinding?.operationId !== "assessOwnedCandidateMandateBinding" || !platformV32MandateBinding.security?.some((item) => item.localSession) || !JSON.stringify(platformV32MandateBinding).includes("v3.2-candidate-mandate-binding-command.schema.json") || !JSON.stringify(platformV32MandateBinding).includes("v3.2-candidate-mandate-binding-result.schema.json")) throw new Error("owner-scoped candidate Mandate binding operation is incomplete");
for (const status of ["200", "401", "403", "404", "409", "422", "503"]) if (!platformV32MandateBinding.responses?.[status]) throw new Error(`assessOwnedCandidateMandateBinding response ${status} is missing`);
const tradeV24ReadinessPath = resolve(root, "packages/contracts/openapi/trade-execution-v24-readiness.v1.json");
const tradeV24ReadinessDocument = JSON.parse(await readFile(tradeV24ReadinessPath, "utf8"));
const v24PaperReadiness = tradeV24ReadinessDocument.paths?.["/internal/v1/v24/paper-readiness"]?.get;
const fakeBrokerCancelResult = tradeV24ReadinessDocument.paths?.["/internal/v1/orders/{orderId}/cancel-result"]?.post;
const fakeBrokerFeeCorrection = tradeV24ReadinessDocument.paths?.["/internal/v1/orders/{orderId}/fills/{externalFillId}/fee-corrections"]?.post;
const fakeBrokerSimulatedFillReport = tradeV24ReadinessDocument.paths?.["/internal/v1/orders/{orderId}/simulated-fill-reports"]?.post;
if (tradeV24ReadinessDocument.openapi !== "3.1.0" || tradeV24ReadinessDocument.components?.securitySchemes?.ServiceBearer?.scheme !== "bearer" || !tradeV24ReadinessDocument.security?.some((item) => item.ServiceBearer)) throw new Error("Trade Execution V2.4 readiness OpenAPI security is missing");
if (v24PaperReadiness?.operationId !== "getV24PaperExecutionReadiness" || !v24PaperReadiness.security?.some((item) => item.ServiceBearer) || !v24PaperReadiness.parameters?.some((parameter) => parameter.name === "x-stockquant-service-id" && parameter.in === "header" && parameter.required) || !v24PaperReadiness.parameters?.some((parameter) => parameter.name === "market" && parameter.in === "query" && parameter.required) || !JSON.stringify(v24PaperReadiness).includes("v24-paper-readiness.schema.json")) throw new Error("Trade Execution V2.4 readiness operation is incomplete");
for (const status of ["200", "400", "403", "503"]) if (!v24PaperReadiness.responses?.[status]) throw new Error(`getV24PaperExecutionReadiness response ${status} is missing`);
if (fakeBrokerCancelResult?.operationId !== "recordFakeBrokerCancellationResult" || !fakeBrokerCancelResult.security?.some((item) => item.ServiceBearer) || fakeBrokerCancelResult.parameters?.find((parameter) => parameter.name === "x-stockquant-service-id")?.schema?.const !== "platform-api-service" || fakeBrokerCancelResult.parameters?.find((parameter) => parameter.name === "orderId")?.in !== "path" || !fakeBrokerCancelResult.requestBody?.required || !JSON.stringify(fakeBrokerCancelResult).includes("fake-broker-cancellation-result.schema.json")) throw new Error("FakeBroker cancellation result contract is incomplete");
for (const status of ["200", "403", "409", "413", "422"]) if (!fakeBrokerCancelResult.responses?.[status]) throw new Error(`recordFakeBrokerCancellationResult response ${status} is missing`);
if (fakeBrokerFeeCorrection?.operationId !== "recordFakeBrokerFillFeeCorrection" || !fakeBrokerFeeCorrection.security?.some((item) => item.ServiceBearer) || fakeBrokerFeeCorrection.parameters?.find((parameter) => parameter.name === "x-stockquant-service-id")?.schema?.const !== "platform-api-service" || !fakeBrokerFeeCorrection.parameters?.some((parameter) => parameter.name === "externalFillId" && parameter.in === "path") || !fakeBrokerFeeCorrection.requestBody?.required || !JSON.stringify(fakeBrokerFeeCorrection).includes("fill-fee-correction-command.schema.json")) throw new Error("FakeBroker fee correction contract is incomplete");
for (const status of ["200", "202", "403", "404", "409", "413", "422"]) if (!fakeBrokerFeeCorrection.responses?.[status]) throw new Error(`recordFakeBrokerFillFeeCorrection response ${status} is missing`);
if (fakeBrokerSimulatedFillReport?.operationId !== "recordFakeBrokerSimulatedFillReport" || !fakeBrokerSimulatedFillReport.security?.some((item) => item.ServiceBearer) || fakeBrokerSimulatedFillReport.parameters?.find((parameter) => parameter.name === "x-stockquant-service-id")?.schema?.const !== "platform-api-service" || !fakeBrokerSimulatedFillReport.requestBody?.required || !JSON.stringify(fakeBrokerSimulatedFillReport).includes("fake-broker-simulated-fill-report.schema.json")) throw new Error("FakeBroker simulated fill report contract is incomplete");
for (const status of ["200", "202", "403", "404", "409", "413", "422"]) if (!fakeBrokerSimulatedFillReport.responses?.[status]) throw new Error(`recordFakeBrokerSimulatedFillReport response ${status} is missing`);
const tradeHistoricalPath = resolve(root, "packages/contracts/openapi/trade-execution-historical.v1.json");
const tradeHistoricalDocument = JSON.parse(await readFile(tradeHistoricalPath, "utf8"));
const executeHistorical = tradeHistoricalDocument.paths?.["/internal/v1/historical-orders/execute"]?.post;
if (tradeHistoricalDocument.openapi !== "3.1.0" || tradeHistoricalDocument.components?.securitySchemes?.ServiceBearer?.scheme !== "bearer" || !tradeHistoricalDocument.security?.some((item) => item.ServiceBearer)) throw new Error("Trade Execution historical FakeBroker OpenAPI security is missing");
if (executeHistorical?.operationId !== "executeHistoricalFakeOrder" || !executeHistorical.security?.some((item) => item.ServiceBearer) || !executeHistorical.parameters?.some((parameter) => parameter.name === "x-stockquant-service-id" && parameter.schema?.const === "historical-replay-worker") || !executeHistorical.requestBody?.required || !JSON.stringify(executeHistorical).includes("historical-fake-execution-command.schema.json") || !JSON.stringify(executeHistorical).includes("historical-fake-execution-result.schema.json")) throw new Error("Historical FakeBroker execution contract is incomplete");
for (const status of ["200", "403", "409", "422"]) if (!executeHistorical.responses?.[status]) throw new Error(`executeHistoricalFakeOrder response ${status} is missing`);
const v24PaperExecute = tradeHistoricalDocument.paths?.["/internal/v1/v24/paper-orders/execute-snapshot"]?.post;
const v24PaperRecover = tradeHistoricalDocument.paths?.["/internal/v1/orders/by-client-id"]?.get;
for (const [operation, operationId, schema, statuses] of [
  [v24PaperExecute, "executeV24FixtureSnapshotOrder", "v24-paper-execution-command.schema.json", ["200", "201", "202", "403", "409", "422", "503"]],
  [v24PaperRecover, "readV24FakeOrderByClientIdentity", null, ["200", "403", "404", "422", "503"]],
]) {
  if (operation?.operationId !== operationId || !operation.security?.some((item) => item.ServiceBearer) || !operation.parameters?.some((parameter) => parameter.name === "x-stockquant-service-id" && parameter.schema?.const === "platform-api-service")) throw new Error(`Trade Execution V2.4 operation identity or caller scope is incomplete: ${operationId}`);
  if (schema && (!operation.requestBody?.required || !JSON.stringify(operation).includes(schema) || !JSON.stringify(operation).includes("v24-paper-execution-result.schema.json"))) throw new Error(`${operationId} request/response schemas are incomplete`);
  if (operationId === "readV24FakeOrderByClientIdentity" && !["namespace", "clientOrderId"].every((name) => operation.parameters?.some((parameter) => parameter.name === name && parameter.in === "query" && parameter.required))) throw new Error("V2.4 order recovery must be scoped by namespace and clientOrderId");
  for (const status of statuses) if (!operation.responses?.[status]) throw new Error(`${operationId} response ${status} is missing`);
}
const v24GovernancePath = resolve(root, "packages/contracts/openapi/decision-governance-paper-authorization.v1.json");
const v24GovernanceDocument = JSON.parse(await readFile(v24GovernancePath, "utf8"));
for (const [path, operationId, serviceId, schema, statuses] of [
  ["/internal/v1/paper-authorizations", "authorizeV24PaperFixtureRun", "platform-api-service", "v24-paper-authorization-command.schema.json", ["200", "401", "403", "409", "413", "422", "503"]],
  ["/internal/v1/paper-authorizations/revoke", "revokeV24PaperFixtureAuthorization", "platform-api-service", "v24-paper-authorization-revoke-command.schema.json", ["200", "403", "404", "409", "422", "503"]],
  ["/internal/v1/paper-authorizations/validate", "validateV24PaperFixtureRun", "trade-execution-service", "v24-paper-authorization-validation.schema.json", ["200", "401", "403", "422", "503"]],
]) {
  const operation = v24GovernanceDocument.paths?.[path]?.post;
  if (operation?.operationId !== operationId || !operation.security?.some((item) => item.ServiceBearer) || !operation.requestBody?.required || !JSON.stringify(operation).includes(schema) || !operation.parameters?.some((parameter) => parameter.name === "x-stockquant-service-id" && parameter.schema?.const === serviceId)) throw new Error(`Decision Governance V2.4 operation contract is incomplete: ${operationId}`);
  for (const status of statuses) if (!operation.responses?.[status]) throw new Error(`${operationId} response ${status} is missing`);
}
const v13GovernanceDocument = JSON.parse(await readFile(resolve(root, "packages/contracts/openapi/decision-governance-v13-proposals.v1.json"), "utf8"));
const v12GovernanceDocument = JSON.parse(await readFile(resolve(root, "packages/contracts/openapi/decision-governance-v12-strategy-snapshots.v1.json"), "utf8"));
const v12StrategySnapshot = v12GovernanceDocument.paths?.["/internal/v1/v12/strategy-snapshots"]?.post;
if (v12StrategySnapshot?.operationId !== "receiveV12StrategySnapshot" || !v12StrategySnapshot.security?.some((item) => item.ServiceBearer) || !v12StrategySnapshot.requestBody?.required || !JSON.stringify(v12StrategySnapshot).includes("v12-strategy-snapshot-command.schema.json") || !v12StrategySnapshot.parameters?.some((item) => item.name === "x-stockquant-service-id" && item.schema?.const === "platform-api-service")) throw new Error("Decision Governance V1.2 Strategy Snapshot contract is incomplete");
for (const status of ["200", "201", "403", "409", "413", "422"]) if (!v12StrategySnapshot.responses?.[status]) throw new Error(`receiveV12StrategySnapshot response ${status} is missing`);
for (const [path, operationId, schema, decision] of [
  ["/internal/v1/proposals", "createV13PaperProposal", "v13-proposal-command.schema.json", false],
  ["/internal/v1/proposals/{proposalId}/approve", "approveV13PaperProposal", "v13-proposal-decision-command.schema.json", true],
  ["/internal/v1/proposals/{proposalId}/reject", "rejectV13PaperProposal", "v13-proposal-decision-command.schema.json", true],
  ["/internal/v1/proposals/{proposalId}/revise", "reviseV13PaperProposal", "v13-proposal-revision-command.schema.json", true],
]) {
  const operation = v13GovernanceDocument.paths?.[path]?.post;
  if (operation?.operationId !== operationId || !operation.security?.some((item) => item.ServiceBearer) || !operation.requestBody?.required || !JSON.stringify(operation).includes(schema) || !operation.parameters?.some((item) => item.name === "x-stockquant-service-id" && item.schema?.const === "platform-api-service")) throw new Error(`Decision Governance V1.3 operation contract is incomplete: ${operationId}`);
  if (decision && !operation.parameters?.some((item) => item.name === "x-stockquant-actor-id" && item.required)) throw new Error(`${operationId} must carry the authenticated Platform actor`);
  if (operationId === "reviseV13PaperProposal" && !operation.parameters?.some((item) => item.name === "x-stockquant-owner-id" && item.required)) throw new Error(`${operationId} must carry the authenticated Platform owner scope`);
}
const proposalRead = v13GovernanceDocument.paths?.["/internal/v1/proposals/{proposalId}"]?.get;
if (proposalRead?.operationId !== "readV13PaperProposal" || !proposalRead.security?.some((item) => item.ServiceBearer) || !proposalRead.parameters?.some((item) => item.name === "x-stockquant-owner-id" && item.required) || !JSON.stringify(proposalRead.responses?.["200"]).includes("v13-proposal-result.schema.json")) throw new Error("Decision Governance V1.3 proposal read must be owner-scoped");
const v13AutoMandateDocument = JSON.parse(await readFile(resolve(root, "packages/contracts/openapi/decision-governance-v13-auto-mandates.v1.json"), "utf8"));
for (const [path, operationId, schema, caller] of [
  ["/internal/v1/auto-mandates", "createV13AutoPolicyMandate", "v13-auto-mandate-command.schema.json", "platform-api-service"],
  ["/internal/v1/auto-mandates/{mandateId}/activate", "activateV13AutoPolicyMandate", "v13-auto-mandate-transition-command.schema.json", "platform-api-service"],
  ["/internal/v1/auto-mandates/{mandateId}/pause", "pauseV13AutoPolicyMandate", "v13-auto-mandate-transition-command.schema.json", "platform-api-service"],
  ["/internal/v1/auto-mandates/{mandateId}/orders/authorize", "authorizeV13AutoPolicyOrder", "v13-auto-mandate-order-command.schema.json", "trade-execution-service"],
]) {
  const operation = v13AutoMandateDocument.paths?.[path]?.post;
  if (operation?.operationId !== operationId || !operation.security?.some((item) => item.ServiceBearer) || !operation.requestBody?.required || !JSON.stringify(operation.requestBody).includes(schema) || !operation.parameters?.some((item) => item.name === "x-stockquant-service-id" && item.required && item.schema?.const === caller)) throw new Error(`Decision Governance V1.3 AUTO Mandate contract is incomplete: ${operationId}`);
  if (caller === "platform-api-service" && (!operation.parameters?.some((item) => item.name === "x-stockquant-owner-id" && item.required) || !operation.parameters?.some((item) => item.name === "x-stockquant-actor-id" && item.required))) throw new Error(`${operationId} must carry authenticated owner and actor headers`);
}
for (const [path, operationId, requestSchema] of [
  ["/internal/v1/proposals/{proposalId}/execution-authorizations", "authorizeV13ApprovedProposalExecution", "v13-execution-authorization-command.schema.json"],
  ["/internal/v1/proposals/{proposalId}/execution-authorizations/validate", "validateV13ApprovedProposalExecution", "v13-execution-authorization-validation.schema.json"],
]) {
  const operation = v13GovernanceDocument.paths?.[path]?.post;
  if (operation?.operationId !== operationId || !operation.security?.some((item) => item.ServiceBearer) || !operation.parameters?.some((item) => item.name === "x-stockquant-service-id" && item.schema?.const === "trade-execution-service") || !operation.requestBody?.required || !JSON.stringify(operation).includes(requestSchema)) throw new Error(`Decision Governance V1.3 execution authorization contract is incomplete: ${operationId}`);
}
const tradeV13ManualDocument = JSON.parse(await readFile(resolve(root, "packages/contracts/openapi/trade-execution-v13-manual-paper.v1.json"), "utf8"));
const v13ManualExecution = tradeV13ManualDocument.paths?.["/internal/v1/v13/paper-orders/execute-manual-proposal"]?.post;
if (v13ManualExecution?.operationId !== "executeV13ApprovedManualProposal" || !v13ManualExecution.security?.some((item) => item.ServiceBearer) || !v13ManualExecution.requestBody?.required || !JSON.stringify(v13ManualExecution).includes("v13-manual-paper-execution-command.schema.json") || !v13ManualExecution.parameters?.some((item) => item.name === "x-stockquant-service-id" && item.schema?.const === "platform-api-service")) throw new Error("Trade Execution V1.3 manual Paper execution contract is incomplete");
const v13OriginalOrderRead = tradeV13ManualDocument.paths?.["/internal/v1/orders/by-client-id"]?.get;
if (v13OriginalOrderRead?.operationId !== "readV13FakeBrokerOrderByClientId" || !v13OriginalOrderRead.security?.some((item) => item.ServiceBearer) || !v13OriginalOrderRead.parameters?.some((item) => item.name === "clientOrderId" && item.required) || !v13OriginalOrderRead.parameters?.some((item) => item.name === "namespace" && item.required) || !v13OriginalOrderRead.parameters?.some((item) => item.name === "x-stockquant-service-id" && item.schema?.const === "platform-api-service")) throw new Error("Trade Execution V1.3 original-order read contract is incomplete");
const v13IndependentAssets = tradeV13ManualDocument.paths?.["/internal/v1/v13/accounts/assets"]?.get;
if (v13IndependentAssets?.operationId !== "readV13IndependentFakeBrokerAssets" || !v13IndependentAssets.security?.some((item) => item.ServiceBearer) || !v13IndependentAssets.parameters?.some((item) => item.name === "accountId" && item.required) || !v13IndependentAssets.parameters?.some((item) => item.name === "namespace" && item.required) || !v13IndependentAssets.parameters?.some((item) => item.name === "x-stockquant-service-id" && item.schema?.const === "platform-api-service")) throw new Error("Trade Execution V1.3 independent asset read contract is incomplete");
const runnerHostPath = resolve(root, "packages/contracts/openapi/research-automation-runner-host.v1.json");
const runnerHostDocument = JSON.parse(await readFile(runnerHostPath, "utf8"));
const runnerHostOperations = [
  ["/v1/artifacts/publish", "post", "publishRunnerOutputArtifact", "v3.1-artifact-publish-command.schema.json", ["201", "401", "403", "409", "413", "422", "503"]],
  ["/v1/runner/jobs/claim", "post", "claimRunnerJob", "v3.1-runner-claim-command.schema.json", ["200", "401", "403", "422", "503"]],
  ["/v1/runner/jobs/{jobId}/input", "post", "readLeasedRunnerInput", "v3.1-runner-input-request.schema.json", ["200", "401", "403", "409", "422", "503"]],
  ["/v1/runner/jobs/{jobId}/heartbeat", "post", "renewRunnerJobLease", "v3.1-runner-input-request.schema.json", ["200", "401", "403", "409", "422", "503"]],
  ["/v1/runner/jobs/{jobId}/complete", "post", "completeLeasedRunnerJob", "v3.1-runner-complete-command.schema.json", ["200", "401", "403", "404", "409", "422", "503"]],
];
if (runnerHostDocument.openapi !== "3.1.0" || runnerHostDocument.components?.securitySchemes?.ServiceBearer?.scheme !== "bearer") throw new Error("Runner Host OpenAPI security is missing");
for (const [path, method, operationId, schemaRef, statuses] of runnerHostOperations) {
  const operation = runnerHostDocument.paths?.[path]?.[method];
  if (operation?.operationId !== operationId || !operation.security?.some((item) => item.ServiceBearer) || !operation.requestBody?.required || !JSON.stringify(operation).includes(schemaRef)) throw new Error(`Runner Host lifecycle contract is incomplete: ${operationId}`);
  if (path.includes("{jobId}") && !operation.parameters?.some((parameter) => parameter.name === "jobId" && parameter.in === "path" && parameter.required)) throw new Error(`${operationId} job path scope is missing`);
  if (!operation.parameters?.some((parameter) => parameter.name === "x-stockquant-service-id" && parameter.schema?.const === "runner-host")) throw new Error(`${operationId} Runner Host caller scope is missing`);
  for (const status of statuses) if (!operation.responses?.[status]) throw new Error(`${operationId} response ${status} is missing`);
}
if (!JSON.stringify(runnerHostDocument.paths["/v1/runner/jobs/claim"].post.responses["200"]).includes("NO_WORK") || !JSON.stringify(runnerHostDocument.paths["/v1/runner/jobs/claim"].post.responses["200"]).includes("LEASED")) throw new Error("claimRunnerJob must describe both leased and empty outcomes");
for (const ref of ["v3.1-runner-input-request.schema.json", "v3.1-runner-complete-command.schema.json"]) {
  const schema = JSON.parse(await readFile(resolve(root, "packages/contracts/research", ref), "utf8"));
  if (!schema.required?.includes("fencingToken")) throw new Error(`Runner Host fencing token is not required by ${ref}`);
}
const historicalReplayPath = resolve(root, "packages/contracts/openapi/historical-replay-worker.v1.json");
const historicalReplayDocument = JSON.parse(await readFile(historicalReplayPath, "utf8"));
const replayOperations = [
  ["/internal/v1/replays", "post", "startHistoricalReplay", "historical-replay-command.schema.json", ["200", "403", "409", "422"]],
  ["/internal/v1/replays/multi", "post", "startHistoricalMultiBarReplay", "historical-replay-multi-command.schema.json", ["200", "202", "403", "409", "422"]],
  ["/internal/v1/replays/{testRunId}", "get", "readHistoricalReplayRun", "historical-replay-run.schema.json", ["200", "403", "404", "422"]],
  ["/internal/v1/replays/{testRunId}/{action}", "post", "controlHistoricalReplayRun", "historical-replay-run.schema.json", ["200", "403", "404", "409", "422"]],
  ["/internal/v1/replays/{testRunId}/recover-unknown", "post", "recoverHistoricalReplayUnknownOrder", null, ["200", "403", "422"]],
];
if (historicalReplayDocument.openapi !== "3.1.0" || historicalReplayDocument.components?.securitySchemes?.ServiceBearer?.scheme !== "bearer") throw new Error("Historical Replay Worker OpenAPI security is missing");
for (const [path, method, operationId, schemaRef, statuses] of replayOperations) {
  const operation = historicalReplayDocument.paths?.[path]?.[method];
  if (operation?.operationId !== operationId || !operation.security?.some((item) => item.ServiceBearer) || !operation.parameters?.some((parameter) => parameter.name === "x-stockquant-service-id" && parameter.required && parameter.schema?.const === "platform-api-service")) throw new Error(`Historical Replay Worker operation or caller scope is incomplete: ${operationId}`);
  if (schemaRef && !JSON.stringify(operation).includes(schemaRef)) throw new Error(`${operationId} request/response schema is missing`);
  if (["startHistoricalReplay", "startHistoricalMultiBarReplay"].includes(operationId) && !operation.requestBody?.required) throw new Error(`${operationId} request body is missing`);
  if (path.includes("{testRunId}") && !operation.parameters?.some((parameter) => parameter.name === "testRunId" && parameter.in === "path" && parameter.required)) throw new Error(`${operationId} TestRun path scope is missing`);
  for (const status of statuses) if (!operation.responses?.[status]) throw new Error(`${operationId} response ${status} is missing`);
}
if (!historicalReplayDocument.paths["/internal/v1/replays/multi"].post.parameters?.some((parameter) => parameter.name === "async" && parameter.in === "query")) throw new Error("Historical multi-bar replay async mode contract is missing");
const marketDataMinutePath = resolve(root, "packages/contracts/openapi/market-data-minute-import.v1.json");
const marketDataMinuteDocument = JSON.parse(await readFile(marketDataMinutePath, "utf8"));
const marketDataMinuteCsvImport = marketDataMinuteDocument.paths?.["/v2/minute/csv/import"]?.post;
const marketDataUploadOps = [marketDataMinuteDocument.paths?.["/v2/minute/{format}/uploads"]?.post, marketDataMinuteDocument.paths?.["/v2/minute/{format}/uploads/{uploadId}/chunks/{index}"]?.put, marketDataMinuteDocument.paths?.["/v2/minute/{format}/uploads/{uploadId}"]?.get, marketDataMinuteDocument.paths?.["/v2/minute/{format}/uploads/{uploadId}/{action}"]?.post];
const marketDataReadOps = [marketDataMinuteDocument.paths?.["/v2/minute/csv/preview"]?.post, marketDataMinuteDocument.paths?.["/v2/minute/imports/{version}"]?.get, marketDataMinuteDocument.paths?.["/v2/minute/imports/{version}/bars"]?.get];
const marketDataArtifactTaskOps = [marketDataMinuteDocument.paths?.["/v1/artifacts/tasks"]?.post, marketDataMinuteDocument.paths?.["/v1/artifacts/tasks/{taskId}"]?.get, marketDataMinuteDocument.paths?.["/v1/artifacts/tasks/{taskId}/cancel"]?.post];
const marketDataTaskArtifactRead = marketDataMinuteDocument.paths?.["/v1/artifacts/tasks/{taskId}/artifact"]?.get;
const hasMarketServiceIdentity = (operation) => operation?.security?.some((item) => item.ServiceBearer) && operation.parameters?.find((parameter) => parameter.name === "x-stockquant-service-id")?.schema?.const === "platform-api-service";
if (marketDataMinuteDocument.openapi !== "3.1.0" || marketDataMinuteDocument.components?.securitySchemes?.ServiceBearer?.scheme !== "bearer" || marketDataMinuteDocument.servers?.[0]?.url?.includes("market-data-service") !== true || marketDataMinuteCsvImport?.operationId !== "importMarketDataMinuteCsv" || !hasMarketServiceIdentity(marketDataMinuteCsvImport) || !JSON.stringify(marketDataMinuteCsvImport.requestBody).includes("minute-csv-import-request-v1.schema.json") || !JSON.stringify(marketDataMinuteCsvImport.responses?.["201"]).includes("minute-import-record-v1.schema.json") || marketDataUploadOps.some((operation) => !hasMarketServiceIdentity(operation) || operation.parameters?.find((parameter) => parameter.name === "x-stockquant-owner-id")?.required !== true) || marketDataReadOps.some((operation) => !hasMarketServiceIdentity(operation)) || marketDataArtifactTaskOps.some((operation) => !hasMarketServiceIdentity(operation) || !JSON.stringify(operation.responses).includes("artifact-task.schema.json"))) throw new Error("Market Data minute import/upload/artifact task contract is incomplete");
if (marketDataMinuteDocument.openapi !== "3.1.0" || marketDataMinuteDocument.components?.securitySchemes?.ServiceBearer?.scheme !== "bearer" || marketDataMinuteDocument.servers?.[0]?.url?.includes("market-data-service") !== true || marketDataMinuteCsvImport?.operationId !== "importMarketDataMinuteCsv" || !hasMarketServiceIdentity(marketDataMinuteCsvImport) || !JSON.stringify(marketDataMinuteCsvImport.requestBody).includes("minute-csv-import-request-v1.schema.json") || !JSON.stringify(marketDataMinuteCsvImport.responses?.["201"]).includes("minute-import-record-v1.schema.json") || marketDataUploadOps.some((operation) => !hasMarketServiceIdentity(operation) || operation.parameters?.find((parameter) => parameter.name === "x-stockquant-owner-id")?.required !== true) || marketDataReadOps.some((operation) => !hasMarketServiceIdentity(operation)) || marketDataArtifactTaskOps.some((operation) => !hasMarketServiceIdentity(operation) || !JSON.stringify(operation.responses).includes("artifact-task.schema.json")) || marketDataTaskArtifactRead?.operationId !== "readPublishedArtifactTaskContent" || !hasMarketServiceIdentity(marketDataTaskArtifactRead) || !JSON.stringify(marketDataTaskArtifactRead.responses?.["200"]).includes("artifact-task-content.schema.json")) throw new Error("Market Data minute import/upload/artifact task contract is incomplete");
for (const [operation, status] of [[marketDataArtifactTaskOps[0], "202"], [marketDataArtifactTaskOps[1], "200"], [marketDataArtifactTaskOps[2], "200"]]) if (!operation.responses?.[status]) throw new Error(`Market Data artifact task response ${status} is missing`);
for (const status of ["200", "201", "401", "409", "422", "503"]) if (!marketDataMinuteCsvImport.responses?.[status]) throw new Error(`importMarketDataMinuteCsv response ${status} is missing`);
const c5LocalPriceContract = JSON.parse(await readFile(resolve(root, "packages/contracts/openapi/v24-local-price-facts.v1.json"), "utf8"));
const c5PriceRead = c5LocalPriceContract.paths?.["/internal/v1/c5-local/price-facts"]?.get;
const c5PriceAuthorize = c5LocalPriceContract.paths?.["/internal/v1/c5-local/orders/authorize"]?.post;
if (c5LocalPriceContract.openapi !== "3.1.0" || c5LocalPriceContract.components?.securitySchemes?.ServiceBearer?.scheme !== "bearer" || c5PriceRead?.operationId !== "getV24LocalPriceFacts" || c5PriceRead.parameters?.find((item) => item.name === "x-stockquant-service-id")?.schema?.const !== "decision-governance-service" || c5PriceAuthorize?.operationId !== "authorizeV24LocalOrderFromPersistedPriceFacts" || c5PriceAuthorize.parameters?.find((item) => item.name === "x-stockquant-service-id")?.schema?.const !== "platform-api-service" || !c5PriceAuthorize.requestBody?.required || !JSON.stringify(c5PriceAuthorize.requestBody).includes("v24-local-price-authorization-request-v1.schema.json")) throw new Error("C5 local price evidence/authorization OpenAPI contract is incomplete");
for (const status of ["200", "403", "409", "422", "503"]) if (!c5PriceAuthorize.responses?.[status]) throw new Error(`C5 local price authorization response ${status} is missing`);
console.log(`OpenAPI contracts checked: portfolio-account.v1 (8 operations), platform-v11-acceptance.v1 (3 operations), v13-acceptance.v1 (${v13OperationCount} operations), v24-observation.v1 (${v24OperationCount} operations), C5-local-price-facts.v1 (2 operations), v22-minute-csv.v1 (${v22OperationCount} operations), quant-candidate.v1 (1 operation), quant-promotions.v1 (${quantPromotionOperationCount} operations), quant-qlib.v1 (1 operation), quant-v12-research-preview.v1 (3 operations), quant-v14-daily-backtest.v1 (1 operation), platform-v12-qlib-fixture.v1 (3 operations), platform-v14-backtest-report.v1 (5 operations), platform-v23-qlib-fixture.v1 (2 operations), trade-execution-v24-readiness.v1 (3 operations), trade-execution-historical.v1 (3 operations), decision-governance-paper-authorization.v1 (3 operations), research-automation-runner-host.v1 (${runnerHostOperations.length + 4} operations), historical-replay-worker.v1 (5 operations), decision-governance-candidate-mandate.v1 (1 operation), market-data-calendar.v1 (18 operations), market-data-minute-import.v1 (11 operations), v31-acceptance-gate.v1 (3 operations), research-automation-promotions.v1 (3 operations), platform-v32-promotion-submit.v1 (6 operations), platform-v33-research-queue.v1 (${v33QueueOperationCount} operations)`);

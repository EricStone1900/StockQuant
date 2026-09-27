import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const path = resolve(root, "packages/contracts/openapi/portfolio-account.v1.json");
const document = JSON.parse(await readFile(path, "utf8"));
if (document.openapi !== "3.1.0") throw new Error("portfolio account OpenAPI document must use 3.1.0");
const initialize = document.paths?.["/internal/v1/accounts/initialize"]?.post;
const recordFill = document.paths?.["/internal/v1/accounts/{accountId}/fills"]?.post;
const snapshot = document.paths?.["/internal/v1/accounts/{accountId}/snapshot"]?.get;
const reserve = document.paths?.["/internal/v1/accounts/{accountId}/reservations"]?.post;
const resolveReservation = document.paths?.["/internal/v1/accounts/{accountId}/reservations/{reservationId}/resolve"]?.post;
if (initialize?.operationId !== "initializeAccount") throw new Error("initializeAccount operation is missing");
if (recordFill?.operationId !== "recordAccountFill") throw new Error("recordAccountFill operation is missing");
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
if (readV24PaperReadiness?.operationId !== "readV24PaperExecutionReadiness" || !readV24PaperReadiness.security?.some((item) => item.localSession) || !readV24PaperReadiness.parameters?.some((parameter) => parameter.name === "market" && parameter.in === "query" && parameter.required) || !JSON.stringify(readV24PaperReadiness).includes("v24-paper-readiness.schema.json")) throw new Error("V2.4 owner-session Paper readiness proxy contract is incomplete");
for (const status of ["200", "401", "403", "422", "503"]) if (!readV24PaperReadiness.responses?.[status]) throw new Error(`readV24PaperExecutionReadiness response ${status} is missing`);
if (createV24Run?.operationId !== "createV24PaperStageRun" || !createV24Run.requestBody?.required || !createV24Run.security?.some((item) => item.localSession) || !JSON.stringify(createV24Run).includes("v24-paper-stage-run-request.schema.json") || !JSON.stringify(createV24Run).includes("v24-paper-stage-run-accepted.schema.json")) throw new Error("V2.4 owner-scoped run create contract is incomplete");
for (const status of ["202", "400", "401", "403"]) if (!createV24Run.responses?.[status]) throw new Error(`createV24PaperStageRun response ${status} is missing`);
if (readV24Run?.operationId !== "readOwnedV24PaperStageRun" || !readV24Run.security?.some((item) => item.localSession) || !readV24Run.parameters?.some((parameter) => parameter.name === "testRunId" && parameter.in === "path" && parameter.required) || !JSON.stringify(readV24Run).includes("v24-paper-stage-run-result.schema.json")) throw new Error("V2.4 owner-scoped run read contract is incomplete");
for (const status of ["200", "401", "403", "404"]) if (!readV24Run.responses?.[status]) throw new Error(`readOwnedV24PaperStageRun response ${status} is missing`);
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
for (const status of ["200", "403", "404"]) if (!getApprovedRegistryVersion.responses?.[status]) throw new Error(`getApprovedPromotionRegistryVersion response ${status} is missing`);
const quantQlibPath = resolve(root, "packages/contracts/openapi/quant-qlib.v1.json");
const quantQlibDocument = JSON.parse(await readFile(quantQlibPath, "utf8"));
const qlibFit = quantQlibDocument.paths?.["/v1/research/qlib/fit-fixture"]?.post;
if (quantQlibDocument.openapi !== "3.1.0" || quantQlibDocument.components?.securitySchemes?.ServiceBearer?.scheme !== "bearer" || !quantQlibDocument.security?.some((item) => item.ServiceBearer)) throw new Error("Qlib fixture-fit OpenAPI version or ServiceBearer security is missing");
if (qlibFit?.operationId !== "fitQlibFixtureModel" || !qlibFit.requestBody?.required || !JSON.stringify(qlibFit).includes("qlib-fit-fixture-request.schema.json") || !JSON.stringify(qlibFit).includes("qlib-fit-fixture-result.schema.json")) throw new Error("Qlib fixture-fit operation contract is incomplete");
for (const status of ["200", "403", "413", "422", "503"]) if (!qlibFit.responses?.[status]) throw new Error(`fitQlibFixtureModel response ${status} is missing`);
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
const v22OperationCount = Object.values(minuteCsvDocument.paths).reduce((count, pathItem) => count + Object.keys(pathItem).filter((method) => ["get", "post", "put", "patch", "delete"].includes(method)).length, 0);
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
const v33ResearchQueue = v33QueueDocument.paths?.["/v1/runner/jobs"]?.get;
const v31RunnerDispatch = v33QueueDocument.paths?.["/v1/runner/jobs"]?.post;
const v33PlatformQueue = v33QueueDocument.paths?.["/api/v1/acceptance/v3/v3.3/runs/{testRunId}/research/queue"]?.get;
if (v33QueueDocument.openapi !== "3.1.0" || v33QueueDocument.components?.securitySchemes?.ServiceBearer?.scheme !== "bearer" || v33ResearchQueue?.operationId !== "listRunnerJobsForTestRun" || !v33ResearchQueue.security?.some((item) => item.ServiceBearer) || !JSON.stringify(v33ResearchQueue).includes("v3.3-runner-queue.schema.json") || !v33ResearchQueue.parameters?.some((parameter) => parameter.name === "testRunId" && parameter.required)) throw new Error("V3.3 Research Automation queue contract is incomplete");
if (createV31Experiment?.operationId !== "createV31Experiment" || !createV31Experiment.security?.some((item) => item.ServiceBearer) || !createV31Experiment.requestBody?.required || !JSON.stringify(createV31Experiment).includes("v3.1-experiment.schema.json") || !JSON.stringify(createV31Experiment).includes("v3.1-experiment-result.schema.json")) throw new Error("V3.1 Experiment creation contract is incomplete");
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
];
for (const [path, method, operationId, requestSchema, responseSchema] of v31ResearchAutomationOperations) {
  const operation = v33QueueDocument.paths?.[path]?.[method];
  if (operation?.operationId !== operationId || !operation.security?.some((item) => item.ServiceBearer) || (requestSchema && !JSON.stringify(operation.requestBody).includes(requestSchema)) || !JSON.stringify(operation.responses).includes(responseSchema)) throw new Error(`Research Automation V3.1 operation contract is incomplete: ${operationId}`);
}
if (v33PlatformQueue?.operationId !== "readOwnedV33ResearchQueue" || !v33PlatformQueue.security?.some((item) => item.LocalSession) || !JSON.stringify(v33PlatformQueue).includes("v3.3-runner-queue.schema.json")) throw new Error("V3.3 owner-scoped Platform queue contract is incomplete");
for (const status of ["200", "401", "403", "404", "422", "503"]) if (!v33PlatformQueue.responses?.[status]) throw new Error(`readOwnedV33ResearchQueue response ${status} is missing`);
const researchPromotionPath = resolve(root, "packages/contracts/openapi/research-automation-promotions.v1.json");
const researchPromotionDocument = JSON.parse(await readFile(researchPromotionPath, "utf8"));
const submitAfterGate = researchPromotionDocument.paths?.["/v1/promotions/submit"]?.post;
const readSubmittedCandidate = researchPromotionDocument.paths?.["/v1/promotions/{promotionRequestId}/candidate-artifact"]?.get;
if (researchPromotionDocument.openapi !== "3.1.0" || researchPromotionDocument.components?.securitySchemes?.ServiceBearer?.scheme !== "bearer" || submitAfterGate?.operationId !== "submitPromotionAfterV31Acceptance" || !submitAfterGate.security?.some((item) => item.ServiceBearer) || !JSON.stringify(submitAfterGate).includes("v3.2-promotion-submit-command.schema.json") || !JSON.stringify(submitAfterGate).includes("v3.2-promotion-submit-result.schema.json")) throw new Error("Research Automation guarded V3.2 submit operation is incomplete");
for (const status of ["200", "201", "202", "401", "403", "422", "503"]) if (!submitAfterGate.responses?.[status]) throw new Error(`submitPromotionAfterV31Acceptance response ${status} is missing`);
if (readSubmittedCandidate?.operationId !== "readSubmittedCandidateArtifactForIndependentValidation" || !readSubmittedCandidate.security?.some((item) => item.ServiceBearer) || !readSubmittedCandidate.parameters?.some((parameter) => parameter.name === "x-stockquant-service-id" && parameter.schema?.const === "quant-validation-worker") || !JSON.stringify(readSubmittedCandidate).includes("v3.2-candidate-artifact-result.schema.json")) throw new Error("Worker-scoped submitted candidate Artifact operation is incomplete");
for (const status of ["200", "401", "403", "404", "409", "413", "503"]) if (!readSubmittedCandidate.responses?.[status]) throw new Error(`readSubmittedCandidateArtifactForIndependentValidation response ${status} is missing`);
const platformV32SubmitPath = resolve(root, "packages/contracts/openapi/platform-v32-promotion-submit.v1.json");
const platformV32SubmitDocument = JSON.parse(await readFile(platformV32SubmitPath, "utf8"));
const platformV32Submit = platformV32SubmitDocument.paths?.["/api/v1/acceptance/v3/v3.2/runs/{testRunId}/promotion-submission"]?.post;
const platformV32Decision = platformV32SubmitDocument.paths?.["/api/v1/acceptance/v3/v3.2/promotions/{promotionRequestId}/decision"]?.post;
const platformV32Evidence = platformV32SubmitDocument.paths?.["/api/v1/acceptance/v3/v3.2/promotions/{promotionRequestId}"]?.get;
const platformV32MandateBinding = platformV32SubmitDocument.paths?.["/api/v1/acceptance/v3/v3.2/candidate-mandate-binding"]?.post;
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
if (tradeV24ReadinessDocument.openapi !== "3.1.0" || tradeV24ReadinessDocument.components?.securitySchemes?.ServiceBearer?.scheme !== "bearer" || !tradeV24ReadinessDocument.security?.some((item) => item.ServiceBearer)) throw new Error("Trade Execution V2.4 readiness OpenAPI security is missing");
if (v24PaperReadiness?.operationId !== "getV24PaperExecutionReadiness" || !v24PaperReadiness.security?.some((item) => item.ServiceBearer) || !v24PaperReadiness.parameters?.some((parameter) => parameter.name === "x-stockquant-service-id" && parameter.in === "header" && parameter.required) || !v24PaperReadiness.parameters?.some((parameter) => parameter.name === "market" && parameter.in === "query" && parameter.required) || !JSON.stringify(v24PaperReadiness).includes("v24-paper-readiness.schema.json")) throw new Error("Trade Execution V2.4 readiness operation is incomplete");
for (const status of ["200", "400", "403", "503"]) if (!v24PaperReadiness.responses?.[status]) throw new Error(`getV24PaperExecutionReadiness response ${status} is missing`);
const tradeHistoricalPath = resolve(root, "packages/contracts/openapi/trade-execution-historical.v1.json");
const tradeHistoricalDocument = JSON.parse(await readFile(tradeHistoricalPath, "utf8"));
const executeHistorical = tradeHistoricalDocument.paths?.["/internal/v1/historical-orders/execute"]?.post;
if (tradeHistoricalDocument.openapi !== "3.1.0" || tradeHistoricalDocument.components?.securitySchemes?.ServiceBearer?.scheme !== "bearer" || !tradeHistoricalDocument.security?.some((item) => item.ServiceBearer)) throw new Error("Trade Execution historical FakeBroker OpenAPI security is missing");
if (executeHistorical?.operationId !== "executeHistoricalFakeOrder" || !executeHistorical.security?.some((item) => item.ServiceBearer) || !executeHistorical.parameters?.some((parameter) => parameter.name === "x-stockquant-service-id" && parameter.schema?.const === "historical-replay-worker") || !executeHistorical.requestBody?.required || !JSON.stringify(executeHistorical).includes("historical-fake-execution-command.schema.json") || !JSON.stringify(executeHistorical).includes("historical-fake-execution-result.schema.json")) throw new Error("Historical FakeBroker execution contract is incomplete");
for (const status of ["200", "403", "409", "422"]) if (!executeHistorical.responses?.[status]) throw new Error(`executeHistoricalFakeOrder response ${status} is missing`);
const runnerHostPath = resolve(root, "packages/contracts/openapi/research-automation-runner-host.v1.json");
const runnerHostDocument = JSON.parse(await readFile(runnerHostPath, "utf8"));
const runnerHostOperations = [
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
console.log(`OpenAPI contracts checked: portfolio-account.v1 (5 operations), v24-observation.v1 (${v24OperationCount} operations), v22-minute-csv.v1 (${v22OperationCount} operations), quant-candidate.v1 (1 operation), quant-promotions.v1 (${quantPromotionOperationCount} operations), quant-qlib.v1 (1 operation), trade-execution-v24-readiness.v1 (1 operation), trade-execution-historical.v1 (1 operation), research-automation-runner-host.v1 (4 operations), historical-replay-worker.v1 (5 operations), decision-governance-candidate-mandate.v1 (1 operation), market-data-calendar.v1 (1 operation), v31-acceptance-gate.v1 (3 operations), research-automation-promotions.v1 (2 operations), platform-v32-promotion-submit.v1 (4 operations), platform-v33-research-queue.v1 (${v33QueueOperationCount} operations)`);

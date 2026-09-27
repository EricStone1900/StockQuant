import { createHash } from "node:crypto";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/u;

export function parseEvidenceExportArgs(args) {
  const value = (name) => {
    const index = args.indexOf(name);
    if (index < 0) return undefined;
    if (!args[index + 1] || args[index + 1].startsWith("--")) throw new Error(`${name} requires a value`);
    return args[index + 1];
  };
  const stage = value("--stage") ?? "V1.1";
  if (!/^[A-Z][0-9](?:\.[0-9])?$/u.test(stage)) throw new Error("--stage must be a versioned stage identifier such as V2.2 or V3.2");
  const runId = value("--run");
  const promotionRequestId = value("--promotion-request");
  if (args.includes("--run") && args.includes("--promotion-request")) throw new Error("choose exactly one of --run or --promotion-request");
  if (stage === "V3.2") {
    if (runId || !promotionRequestId || !UUID.test(promotionRequestId)) throw new Error("V3.2 export requires --promotion-request with a UUID; it does not export a V3.2 TestRun");
    return { stage, promotionRequestId };
  }
  if (promotionRequestId) throw new Error("--promotion-request is only supported for V3.2");
  if (!runId || !SAFE_ID.test(runId) || runId === "." || runId === "..") throw new Error("--run requires a safe run identifier");
  return { stage, runId };
}

export function evidenceRequest({ stage, runId, promotionRequestId, baseUrl, sessionCookie }) {
  if (typeof sessionCookie !== "string" || !/(?:^|;\s*)sq_session=[^;\s]+/u.test(sessionCookie) || /[\r\n]/u.test(sessionCookie)) throw new Error("STOCKQUANT_EVIDENCE_SESSION_COOKIE must contain the current local session cookie");
  if (stage === "V3.2") {
    if (!promotionRequestId || !UUID.test(promotionRequestId)) throw new Error("V3.2 export requires a PromotionRequest UUID");
    return {
      url: `${baseUrl}/api/v1/acceptance/v3/v3.2/promotions/${encodeURIComponent(promotionRequestId)}`,
      headers: { cookie: sessionCookie },
      outputDirectory: `evidence/local/V3.2/${promotionRequestId}`,
    };
  }
  const v2RunRoutes = {
    "V2.1": "/api/v1/acceptance/v2/v2.1/runs",
    "V2.2": "/api/v1/acceptance/v2/v2.2/runs",
    "V2.3": "/api/v1/acceptance/v2/v2.3/runs",
    "V2.4": "/api/v1/acceptance/v2/v2.4/runs",
    "V2.5": "/api/v1/acceptance/v2/v2.5/runs",
  };
  if (stage.startsWith("V2.") && !v2RunRoutes[stage]) throw new Error(`${stage} has no implemented evidence export endpoint`);
  const path = v2RunRoutes[stage] ? `${v2RunRoutes[stage]}/${encodeURIComponent(runId)}` : `/api/v1/acceptance/runs/${encodeURIComponent(runId)}/evidence`;
  const outputDirectory = v2RunRoutes[stage] ? `evidence/local/${stage}/${runId}` : `evidence/local/${runId}`;
  return { url: `${baseUrl}${path}`, headers: { cookie: sessionCookie }, outputDirectory };
}

export function buildEvidenceBundle({ stage, runId, promotionRequestId, responseBody }) {
  if (stage !== "V3.2") return responseBody;
  const request = responseBody?.request;
  const requestId = request?.request?.promotionRequestId ?? request?.promotionRequestId;
  const requestTestRunId = request?.request?.testRunId ?? request?.testRunId;
  const sourceTestRunId = responseBody?.testRunId;
  if (requestId !== promotionRequestId || !UUID.test(String(sourceTestRunId)) || sourceTestRunId !== requestTestRunId) {
    throw new Error("V3.2 detail response is not bound to the requested PromotionRequest and source TestRun");
  }
  if (!Object.hasOwn(responseBody, "validationReport") || responseBody.registryMutation !== "NOT_PERFORMED" || responseBody.activation !== "DISABLED_UNTIL_MANDATE") {
    throw new Error("V3.2 detail response is missing report or Registry boundary facts");
  }
  return {
    evidenceVersion: "acceptance-export-v3-2-preparation-1",
    stageId: "V3.2",
    promotionRequestId,
    sourceTestRunId,
    businessValidation: "NOT_RUN",
    humanAcceptance: "NOT_RUN",
    exportedAt: new Date().toISOString(),
    evidence: responseBody,
  };
}

export function serializeEvidence(bundle) {
  const serialized = `${JSON.stringify(bundle, null, 2)}\n`;
  const manifestHash = createHash("sha256").update(serialized).digest("hex");
  return { serialized, manifest: `${manifestHash}  evidence.json\n`, manifestHash };
}

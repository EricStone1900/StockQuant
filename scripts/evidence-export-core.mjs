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
    if (promotionRequestId) {
      if (!UUID.test(promotionRequestId)) throw new Error("V3.2 --promotion-request requires a UUID");
      return { stage, promotionRequestId };
    }
    if (!runId || !UUID.test(runId)) throw new Error("V3.2 export requires --run with a TestRun UUID or --promotion-request with a UUID");
    return { stage, runId };
  }
  if (stage === "V3.3") {
    if (!runId || !UUID.test(runId)) throw new Error("V3.3 export requires --run with a TestRun UUID");
    return { stage, runId };
  }
  if (promotionRequestId) throw new Error("--promotion-request is only supported for V3.2");
  if (!runId || !SAFE_ID.test(runId) || runId === "." || runId === "..") throw new Error("--run requires a safe run identifier");
  return { stage, runId };
}

export function evidenceRequest({ stage, runId, promotionRequestId, baseUrl, sessionCookie }) {
  if (typeof sessionCookie !== "string" || !/(?:^|;\s*)sq_session=[^;\s]+/u.test(sessionCookie) || /[\r\n]/u.test(sessionCookie)) throw new Error("STOCKQUANT_EVIDENCE_SESSION_COOKIE must contain the current local session cookie");
  if (stage === "V3.2") {
    if (runId && UUID.test(runId)) return {
      url: `${baseUrl}/api/v1/acceptance/v3/v3.2/runs/${encodeURIComponent(runId)}`,
      headers: { cookie: sessionCookie },
      outputDirectory: `evidence/local/V3.2/${runId}`,
    };
    if (!promotionRequestId || !UUID.test(promotionRequestId)) throw new Error("V3.2 export requires a PromotionRequest UUID");
    return {
      url: `${baseUrl}/api/v1/acceptance/v3/v3.2/promotions/${encodeURIComponent(promotionRequestId)}`,
      headers: { cookie: sessionCookie },
      outputDirectory: `evidence/local/V3.2/${promotionRequestId}`,
    };
  }
  if (stage === "V3.3") return {
    url: `${baseUrl}/api/v1/acceptance/v3/v3.3/runs/${encodeURIComponent(runId)}`,
    headers: { cookie: sessionCookie },
    outputDirectory: `evidence/local/V3.3/${runId}`,
  };
  const v2RunRoutes = {
    "V2.1": "/api/v1/acceptance/v2/v2.1/runs",
    "V2.2": "/api/v1/acceptance/v2/v2.2/runs",
    "V2.3": "/api/v1/acceptance/v2/v2.3/runs",
    "V2.4": "/api/v1/acceptance/v2/v2.4/runs",
    "V2.5": "/api/v1/acceptance/v2/v2.5/runs",
  };
  const v31RunRoute = stage === "V3.1" ? "/api/v1/acceptance/v3/v3.1/runs" : null;
  if (v31RunRoute) return {
    url: `${baseUrl}${v31RunRoute}/${encodeURIComponent(runId)}`,
    headers: { cookie: sessionCookie },
    outputDirectory: `evidence/local/V3.1/${runId}`,
  };
  if (stage.startsWith("V2.") && !v2RunRoutes[stage]) throw new Error(`${stage} has no implemented evidence export endpoint`);
  const path = v2RunRoutes[stage] ? `${v2RunRoutes[stage]}/${encodeURIComponent(runId)}` : `/api/v1/acceptance/runs/${encodeURIComponent(runId)}/evidence`;
  const outputDirectory = v2RunRoutes[stage] || stage.startsWith("V1.") ? `evidence/local/${stage}/${runId}` : `evidence/local/${runId}`;
  return { url: `${baseUrl}${path}`, headers: { cookie: sessionCookie }, outputDirectory };
}

export function buildEvidenceBundle({ stage, runId, promotionRequestId, responseBody }) {
  if (stage.startsWith("V1.")) {
    const run = responseBody?.run ?? responseBody;
    if (run?.stageId !== stage || run?.testRunId !== runId) throw new Error("V1 TestRun response is not bound to the requested stage and run");
    return {
      ...responseBody,
      stageId: stage,
      testRunId: runId,
      manualConclusion: responseBody?.manualConclusion ?? "NOT_RUN",
    };
  }
  if (stage === "V3.1") {
    if (!UUID.test(runId ?? "") || responseBody?.testRunId !== runId || responseBody?.stageId !== "V3.1") throw new Error("V3.1 response is not bound to the requested TestRun");
    return responseBody;
  }
  if (stage === "V2.3") {
    if (!UUID.test(runId ?? "") || responseBody?.testRunId !== runId || responseBody?.stageId !== "V2.3") throw new Error("V2.3 response is not bound to the requested TestRun");
    const ref = responseBody?.evidence?.crossService?.research?.artifactRef;
    if (ref) {
      const common = responseBody?.artifactRefs?.find((item) => item?.artifactId === ref.artifactId);
      if (!common || common.schemaVersion !== "artifact-ref.v1" || common.testRunId !== runId || common.ownerId !== responseBody.ownerId
        || common.kind !== "MODEL_PREDICTIONS" || common.namespace !== `research/${runId}/qlib-fixture` || common.mediaType !== ref.mediaType
        || common.sha256 !== ref.sha256 || common.status !== "PUBLISHED" || common.sourceRef !== `platform-api-service:v2.3:${runId}`) throw new Error("V2.3 TestRun common ArtifactRef does not match its Qlib artifact reference");
    }
    return responseBody;
  }
  if (stage === "V3.2" && runId) {
    if (!UUID.test(runId) || responseBody?.testRunId !== runId || responseBody?.stageId !== "V3.2") throw new Error("V3.2 TestRun response is not bound to the requested run");
    const readinessOnly = responseBody?.evidence?.sourceMode === "READINESS_ONLY";
    if (!readinessOnly || responseBody?.status !== "WAITING" || responseBody?.evidence?.businessValidation !== "NOT_RUN" || responseBody?.evidence?.humanAcceptance !== "NOT_RUN") {
      throw new Error("V3.2 TestRun export currently accepts only persisted READINESS_ONLY records with business validation and human acceptance NOT_RUN");
    }
    return {
      evidenceVersion: "acceptance-export-v3-2-readiness-test-run-1",
      stageId: "V3.2",
      testRunId: runId,
      scenarioId: responseBody.scenarioId,
      scenarioVersion: responseBody.scenarioVersion,
      status: "WAITING",
      businessValidation: "NOT_RUN",
      humanAcceptance: "NOT_RUN",
      exportedAt: new Date().toISOString(),
      evidence: responseBody,
    };
  }
  if (stage === "V3.3") {
    const scenario = responseBody?.scenarioId;
    const workflow = { normal: "NORMAL_ASSERTION_VERIFIED", recovery: "RECOVERY_ASSERTION_VERIFIED", rejection: "REJECTION_ASSERTION_VERIFIED" }[scenario];
    const assertionId = { normal: "V3.3_NORMAL_RESULTS_001", recovery: "V3.3_CHECKPOINT_RECOVERY_001", rejection: "V3.3_REJECTION_NO_SIDE_EFFECTS" }[scenario];
    if (!UUID.test(runId ?? "") || responseBody?.testRunId !== runId || responseBody?.stageId !== "V3.3") throw new Error("V3.3 response is not bound to the requested TestRun");
    if (!workflow || responseBody.status !== "RUNNING" || responseBody.evidence?.workflowStep !== workflow || responseBody.evidence?.businessValidation !== "PASS" || responseBody.evidence?.humanAcceptance !== "NOT_RUN" || !responseBody.assertions?.some((assertion) => assertion.id === assertionId && assertion.status === "PASS")) throw new Error("V3.3 export requires a same-TestRun passing scenario assertion and explicit NOT_RUN human acceptance");
    return { evidenceVersion: "acceptance-export-v3-3-business-testrun-1", stageId: "V3.3", testRunId: runId, scenarioId: scenario, status: responseBody.status, businessValidation: "PASS", humanAcceptance: "NOT_RUN", artifacts: [], run: responseBody };
  }
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

export function v33ArtifactRefs(bundle) {
  if (bundle?.stageId !== "V3.3" || !UUID.test(bundle?.testRunId ?? "") || !bundle.run || bundle.run.testRunId !== bundle.testRunId) throw new Error("V3.3 ArtifactRefs require a bound TestRun export");
  if (bundle.scenarioId === "rejection") return [];
  if (!["normal", "recovery"].includes(bundle.scenarioId)) throw new Error("V3.3 export scenario is invalid");
  const rounds = bundle.run.evidence?.completedRounds;
  if (!Array.isArray(rounds) || rounds.length !== 2) throw new Error("V3.3 normal/recovery export requires both completed round outputs");
  const refs = [];
  for (const round of rounds) {
    const row = round?.artifacts?.length === 1 ? round.artifacts[0] : null;
    if (![1, 2].includes(round.roundIndex) || !row || row.kind !== "OUTPUT" || row.status !== "PUBLISHED" || typeof row.artifactId !== "string" || row.artifactId.length < 1 || row.artifactId.length > 256 || !/^[a-f0-9]{64}$/u.test(row.sha256 ?? "") || row.namespace !== `research/${bundle.testRunId}/${bundle.run.evidence.experiment?.experimentId}/outputs`) throw new Error("V3.3 output ArtifactRef is malformed or not bound to this TestRun");
    refs.push({ roundIndex: round.roundIndex, artifactId: row.artifactId, namespace: row.namespace, sha256: row.sha256, status: row.status });
  }
  if (new Set(refs.map((ref) => ref.roundIndex)).size !== 2) throw new Error("V3.3 export needs one output per round");
  return refs;
}

export function decodeV33Artifact(bundle, ref, responseBody) {
  const returned = responseBody?.ref;
  if (!v33ArtifactRefs(bundle).some((item) => item.roundIndex === ref.roundIndex && item.artifactId === ref.artifactId && item.namespace === ref.namespace && item.sha256 === ref.sha256)
    || !returned || returned.artifactId !== ref.artifactId || returned.namespace !== ref.namespace || returned.sha256 !== ref.sha256 || returned.status !== "PUBLISHED"
    || typeof responseBody.contentBase64 !== "string" || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(responseBody.contentBase64)) throw new Error("V3.3 Artifact response identity or encoding does not match the same TestRun");
  const bytes = Buffer.from(responseBody.contentBase64, "base64");
  if (bytes.toString("base64") !== responseBody.contentBase64 || createHash("sha256").update(bytes).digest("hex") !== ref.sha256) throw new Error("V3.3 Artifact bytes do not match the persisted TestRun ArtifactRef");
  return bytes;
}

export function v31ArtifactRefs(bundle) {
  if (bundle?.stageId !== "V3.1" || !UUID.test(bundle?.testRunId ?? "")) throw new Error("V3.1 ArtifactRefs require a bound TestRun");
  const orchestration = bundle?.evidence?.orchestration;
  const runner = orchestration?.runnerJob;
  const submittedJob = runner?.job;
  if (!runner || !submittedJob || submittedJob.testRunId !== bundle.testRunId || typeof submittedJob.experimentId !== "string" || submittedJob.outputNamespace !== `research/${bundle.testRunId}/${submittedJob.experimentId}/outputs`) return [];
  const refs = [];
  const input = orchestration.inputRef;
  if (input) refs.push(input);
  if (Array.isArray(runner.artifacts)) refs.push(...runner.artifacts);
  const unique = new Map();
  for (const ref of refs) {
    if (ref?.schemaVersion !== "v3.1-artifact-ref-v1" || !/^[a-f0-9]{64}$/u.test(ref.artifactId ?? "") || ref.sha256 !== ref.artifactId || !["INPUT", "OUTPUT"].includes(ref.kind) || ref.status !== "PUBLISHED" || typeof ref.sourceRef !== "string") throw new Error("V3.1 ArtifactRef is malformed or not published");
    const expectedNamespace = ref.kind === "INPUT" ? `research/${bundle.testRunId}/${submittedJob.experimentId}/inputs` : submittedJob.outputNamespace;
    if (ref.namespace !== expectedNamespace) throw new Error("V3.1 ArtifactRef namespace is not bound to this TestRun");
    const existing = unique.get(ref.artifactId);
    if (existing && JSON.stringify(existing) !== JSON.stringify(ref)) throw new Error("V3.1 ArtifactRef identity is conflicting");
    unique.set(ref.artifactId, ref);
  }
  const legacyRefs = [...unique.values()];
  if (!Array.isArray(bundle.artifactRefs) || bundle.artifactRefs.length !== legacyRefs.length) throw new Error("V3.1 TestRun is missing its shared ArtifactRef projection");
  for (const ref of legacyRefs) {
    const common = bundle.artifactRefs.find((item) => item?.artifactId === ref.artifactId && item?.namespace === ref.namespace);
    if (!common || common.schemaVersion !== "artifact-ref.v1" || common.testRunId !== bundle.testRunId || common.ownerId !== bundle.ownerId
      || common.kind !== ref.kind || common.sha256 !== ref.sha256 || common.status !== ref.status || common.sourceRef !== ref.sourceRef) throw new Error("V3.1 TestRun common ArtifactRef does not match its research reference");
  }
  return legacyRefs;
}

export function v31ArtifactPath(bundle, ref, baseUrl) {
  if (!v31ArtifactRefs(bundle).some((item) => ["schemaVersion", "artifactId", "kind", "namespace", "sha256", "status", "sourceRef"].every((key) => item[key] === ref?.[key]))) throw new Error("V3.1 ArtifactRef is not associated with this TestRun");
  return `${baseUrl}/api/v1/acceptance/v3/v3.1/runs/${encodeURIComponent(bundle.testRunId)}/artifacts/${encodeURIComponent(ref.artifactId)}`;
}

export function decodeV31Artifact(ref, responseBody) {
  const returned = responseBody?.ref;
  if (!returned || ["schemaVersion", "artifactId", "kind", "namespace", "sha256", "status", "sourceRef"].some((key) => returned[key] !== ref[key]) || typeof responseBody.contentBase64 !== "string" || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(responseBody.contentBase64)) throw new Error("V3.1 Artifact response identity or encoding does not match its TestRun ArtifactRef");
  const bytes = Buffer.from(responseBody.contentBase64, "base64");
  if (createHash("sha256").update(bytes).digest("hex") !== ref.sha256) throw new Error("V3.1 Artifact content hash does not match the persisted TestRun ArtifactRef");
  return bytes;
}

export function qlibArtifactPath(bundle, baseUrl) {
  const ref = bundle?.evidence?.crossService?.research?.artifactRef;
  if (!ref) return null;
  if (!UUID.test(bundle.testRunId ?? "") || !/^[a-f0-9]{64}$/u.test(ref.artifactId ?? "") || ref.sha256 !== ref.artifactId) throw new Error("V2.3 Qlib ArtifactRef is malformed");
  const expected = `/api/v1/acceptance/v2/v2.3/runs/${bundle.testRunId}/artifacts/${ref.artifactId}`;
  if (ref.url !== expected) throw new Error("V2.3 Qlib ArtifactRef URL does not match its TestRun and content address");
  const common = bundle.artifactRefs?.find((item) => item?.artifactId === ref.artifactId);
  if (!common || common.schemaVersion !== "artifact-ref.v1" || common.testRunId !== bundle.testRunId || common.ownerId !== bundle.ownerId
    || common.kind !== "MODEL_PREDICTIONS" || common.namespace !== `research/${bundle.testRunId}/qlib-fixture` || common.mediaType !== ref.mediaType
    || common.sha256 !== ref.sha256 || common.status !== "PUBLISHED" || common.sourceRef !== `platform-api-service:v2.3:${bundle.testRunId}`) throw new Error("V2.3 Qlib reference is not bound to its canonical TestRun ArtifactRef");
  return `${baseUrl}${expected}`;
}

export function serializeEvidence(bundle, attachments = []) {
  const serialized = `${JSON.stringify(bundle, null, 2)}\n`;
  const entries = [{ filename: "evidence.json", bytes: Buffer.from(serialized) }, ...attachments];
  if (entries.some(({ filename }) => !/^[a-zA-Z0-9._-]{1,128}$/u.test(filename) || filename === "." || filename === "..") || new Set(entries.map(({ filename }) => filename)).size !== entries.length) throw new Error("evidence attachment filename is unsafe or duplicated");
  const manifest = entries.map(({ filename, bytes }) => `${createHash("sha256").update(bytes).digest("hex")}  ${filename}\n`).join("");
  const manifestHash = attachments.length === 0 ? createHash("sha256").update(serialized).digest("hex") : createHash("sha256").update(manifest).digest("hex");
  return { serialized, manifest, manifestHash, attachments: entries.slice(1) };
}

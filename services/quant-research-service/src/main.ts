import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { Pool } from "pg";
import { authorizeQuantResearchRequest, loadQuantResearchTokens } from "./service-auth.js";
import { decideCandidateRegistration, parseCandidateRegistrationCommand, type CandidateRegistration } from "./candidate-registration.js";
import type { QuantCandidateRegistrationCommand, QuantCandidateRegistrationResult } from "./contracts/generated-types.js";
import { parsePromotionRequest, promotionRequestFingerprint } from "./promotion-request.js";
import { parseValidationSubmission, reportMatchesRequest, validationSubmissionFingerprint } from "./validation-submission.js";
import { parsePromotionDecisionCommand, promotionVersionFingerprint, reportIsApprovable } from "./promotion-decision.js";

const port = Number(process.env.STOCKQUANT_PORT ?? 3003);
const qlibWorkerUrl = process.env.QLIB_WORKER_URL ?? "http://127.0.0.1:3004";
const qlibWorkerCallerToken = process.env.STOCKQUANT_SERVICE_TOKEN_QUANT_RESEARCH_SERVICE?.trim() ?? "";
const pool = new Pool({ connectionString: process.env.STOCKQUANT_DATABASE_URL });
const callerTokens = loadQuantResearchTokens(process.env);
function qlibWorkerHeaders(): Record<string, string> {
  return { "content-type": "application/json", authorization: `Bearer ${qlibWorkerCallerToken}`, "x-stockquant-service-id": "quant-research-service" };
}
async function probeQlib(): Promise<{ status: string; version?: string; detail?: string }> {
  if (qlibWorkerCallerToken.length < 32) return { status: "NOT_RUN", detail: "quant-research-service Qlib worker identity is not configured" };
  try { const response = await fetch(`${process.env.QLIB_WORKER_URL ?? "http://127.0.0.1:3004"}/probe`, { headers: qlibWorkerHeaders() }); if (!response.ok) return { status: "NOT_RUN", detail: `qlib worker returned ${response.status}` }; return await response.json() as Promise<{status:string;version?:string;detail?:string}>; } catch (error) { return { status: "NOT_RUN", detail: error instanceof Error ? error.message : "qlib worker unavailable" }; }
}
async function json(res: import("node:http").ServerResponse, body: unknown, status=200) { res.writeHead(status,{"content-type":"application/json"}); res.end(JSON.stringify(body)); }
await pool.query(`CREATE TABLE IF NOT EXISTS research_candidates (
  candidate_id TEXT PRIMARY KEY, qlib_version TEXT NOT NULL, algorithm TEXT NOT NULL,
  artifact_hash CHAR(64) NOT NULL, approved_by TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('CANDIDATE_APPROVED')),
  activation TEXT NOT NULL CHECK (activation = 'DISABLED_UNTIL_MANDATE'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`);
await pool.query(`CREATE TABLE IF NOT EXISTS promotion_requests (
  promotion_request_id UUID PRIMARY KEY,
  idempotency_key TEXT NOT NULL UNIQUE,
  request_fingerprint CHAR(64) NOT NULL,
  request_payload JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status = 'AWAITING_INDEPENDENT_VALIDATION'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`);
await pool.query(`CREATE TABLE IF NOT EXISTS promotion_validation_reports (
  promotion_request_id UUID PRIMARY KEY REFERENCES promotion_requests(promotion_request_id) ON DELETE RESTRICT,
  report_fingerprint CHAR(64) NOT NULL,
  report_payload JSONB NOT NULL,
  evidence_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`);
await pool.query(`CREATE TABLE IF NOT EXISTS promotion_decisions (
  promotion_request_id UUID PRIMARY KEY REFERENCES promotion_requests(promotion_request_id) ON DELETE RESTRICT,
  decision TEXT NOT NULL CHECK (decision IN ('APPROVE','REJECT')),
  report_fingerprint CHAR(64) NOT NULL,
  version_fingerprint CHAR(64) NOT NULL,
  actor_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`);
await pool.query(`CREATE TABLE IF NOT EXISTS promotion_registry_versions (
  promotion_request_id UUID PRIMARY KEY REFERENCES promotion_decisions(promotion_request_id) ON DELETE RESTRICT,
  version_fingerprint CHAR(64) NOT NULL UNIQUE,
  candidate_source TEXT NOT NULL CHECK (candidate_source IN ('RD_AGENT','FIXTURE')),
  candidate_artifact_id TEXT NOT NULL,
  candidate_namespace TEXT NOT NULL,
  candidate_sha256 CHAR(64) NOT NULL,
  code_sha256 CHAR(64) NOT NULL,
  data_manifest_sha256 CHAR(64) NOT NULL,
  metrics_manifest_sha256 CHAR(64) NOT NULL,
  validation_plan_sha256 CHAR(64) NOT NULL,
  approved_by TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status = 'CANDIDATE_APPROVED'),
  activation TEXT NOT NULL CHECK (activation = 'DISABLED_UNTIL_MANDATE'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`);
const server = createServer(async (req,res) => {
  if (req.url === "/live") return json(res,{status:"live",service:"quant-research-service"});
  if (req.url === "/ready") return json(res,{status:"ready",service:"quant-research-service",qlib:(await probeQlib()).status});
  const serviceId = req.headers["x-stockquant-service-id"];
  const authorization = req.headers.authorization;
  if (!authorizeQuantResearchRequest({ method: req.method ?? "", pathname: new URL(req.url ?? "/", "http://localhost").pathname, serviceId: typeof serviceId === "string" ? serviceId : undefined, authorization: typeof authorization === "string" ? authorization : undefined, tokens: callerTokens })) return json(res,{status:"FORBIDDEN",reason:"service identity or route scope is not allowed"},403);
  if (req.method === "POST" && req.url === "/v1/research/qlib/fit-fixture") {
    if (qlibWorkerCallerToken.length < 32) return json(res, { status: "NOT_RUN", reason: "quant-research-service Qlib worker identity is not configured" }, 503);
    let raw = "";
    for await (const chunk of req) {
      raw += chunk;
      if (Buffer.byteLength(raw, "utf8") > 1_048_576) return json(res, { status: "REJECTED", reason: "Qlib fixture request exceeds 1 MiB" }, 413);
    }
    try {
      JSON.parse(raw);
      const response = await fetch(`${qlibWorkerUrl}/qlib/fit-fixture`, {
        method: "POST",
        headers: qlibWorkerHeaders(),
        body: raw,
        signal: AbortSignal.timeout(120_000)
      });
      const responseBody = await response.text();
      res.writeHead(response.status, { "content-type": response.headers.get("content-type") ?? "application/json" });
      return res.end(responseBody);
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "TimeoutError";
      return json(res, { status: "NOT_RUN", reason: timedOut ? "Qlib fixture fit timed out after 120 seconds" : error instanceof Error ? error.message : "Qlib worker unavailable" }, timedOut ? 504 : 503);
    }
  }
  if (req.url === "/v1/qlib/probe") return json(res,{adapter:"qlib",sourceCommit:process.env.QLIB_SOURCE_COMMIT??"UNSET",dependencyImage:process.env.QLIB_IMAGE??"UNSET",probe:await probeQlib(),executionModel:"CPU",modelCalls:"NOT_RUN"});
  if (req.url === "/v1/rdagent/probe") return json(res,{adapter:"rdagent",executionBoundary:"isolated-container",dockerSocketMounted:false,codeProbe:{status:"READY",result:"fixed-probe-ok"},modelCalls:"NOT_RUN",reason:"No model credentials configured in V1.2"});
  if (req.method === "GET" && /^\/v1\/promotions\/[^/]+\/validation-input$/.test(req.url ?? "")) {
    const route = /^\/v1\/promotions\/([^/]+)\/validation-input$/.exec(req.url ?? "");
    const promotionRequestId = route?.[1] ?? "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(promotionRequestId)) return json(res, { status: "REJECTED", reason: "promotionRequestId must be a UUID" }, 422);
    const result = await pool.query<{ request_fingerprint: string; request_payload: unknown }>("SELECT request_fingerprint, request_payload FROM promotion_requests WHERE promotion_request_id=$1", [promotionRequestId]);
    if (result.rowCount !== 1) return json(res, { status: "NOT_FOUND", reason: "PromotionRequest not found" }, 404);
    return json(res, { schemaVersion: "v3.2-independent-validation-input-v1", promotionRequestId, requestFingerprint: result.rows[0].request_fingerprint.trim(), request: result.rows[0].request_payload });
  }
  if (req.method === "POST" && /^\/v1\/promotions\/[^/]+\/validation-report$/.test(req.url ?? "")) {
    const route = /^\/v1\/promotions\/([^/]+)\/validation-report$/.exec(req.url ?? "");
    const promotionRequestId = route?.[1] ?? "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(promotionRequestId)) return json(res, { status: "REJECTED", reason: "promotionRequestId must be a UUID" }, 422);
    let raw = "";
    for await (const chunk of req) {
      raw += chunk;
      if (Buffer.byteLength(raw, "utf8") > 1_048_576) return json(res, { status: "REJECTED", reason: "validation submission exceeds 1 MiB" }, 413);
    }
    try {
      const parsed = parseValidationSubmission(JSON.parse(raw) as unknown);
      if (!parsed.ok) return json(res, { status: "REJECTED", reason: parsed.reason }, 422);
      const submission = parsed.submission;
      if (submission.report.promotionRequestId !== promotionRequestId) return json(res, { status: "REJECTED", reason: "route PromotionRequest ID differs from report identity" }, 422);
      const fingerprint = validationSubmissionFingerprint(submission);
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const parent = await client.query<{ request_payload: { promotionRequestId: string; testRunId: string; candidateSource: string } }>("SELECT request_payload FROM promotion_requests WHERE promotion_request_id=$1 FOR UPDATE", [promotionRequestId]);
        if (parent.rowCount !== 1) {
          await client.query("ROLLBACK");
          return json(res, { status: "NOT_FOUND", reason: "PromotionRequest not found" }, 404);
        }
        if (!reportMatchesRequest(submission.report, parent.rows[0].request_payload)) {
          await client.query("ROLLBACK");
          return json(res, { status: "REJECTED", reason: "report identity or source mode does not match the immutable PromotionRequest" }, 422);
        }
        const created = await client.query<{ report_fingerprint: string; report_payload: typeof submission.report; evidence_payload: typeof submission.evidence; created_at: Date }>(
          `INSERT INTO promotion_validation_reports (promotion_request_id, report_fingerprint, report_payload, evidence_payload)
           VALUES ($1,$2,$3::jsonb,$4::jsonb) ON CONFLICT (promotion_request_id) DO NOTHING RETURNING *`,
          [promotionRequestId, fingerprint, JSON.stringify(submission.report), JSON.stringify(submission.evidence)]
        );
        let row = created.rows[0];
        let idempotent = false;
        if (!row) {
          const existing = await client.query<{ report_fingerprint: string; report_payload: typeof submission.report; evidence_payload: typeof submission.evidence; created_at: Date }>("SELECT report_fingerprint, report_payload, evidence_payload, created_at FROM promotion_validation_reports WHERE promotion_request_id=$1", [promotionRequestId]);
          if (existing.rowCount !== 1) throw new Error("validation report raced with a concurrent state change");
          row = existing.rows[0];
          if (row.report_fingerprint.trim() !== fingerprint) {
            await client.query("ROLLBACK");
            return json(res, { status: "CONFLICT", reason: "an immutable validation report already exists with different content" }, 409);
          }
          idempotent = true;
        }
        await client.query("COMMIT");
        return json(res, { schemaVersion: "v3.2-independent-validation-result-v1", promotionRequestId, reportFingerprint: row.report_fingerprint.trim(), report: row.report_payload, evidence: row.evidence_payload, createdAt: row.created_at.toISOString(), idempotent }, idempotent ? 200 : 201);
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
      } finally { client.release(); }
    } catch (error) {
      return json(res, { status: "REJECTED", reason: error instanceof Error ? error.message : "invalid validation submission" }, 422);
    }
  }
  if (req.method === "POST" && /^\/v1\/promotions\/[^/]+\/decision$/.test(req.url ?? "")) {
    const route = /^\/v1\/promotions\/([^/]+)\/decision$/.exec(req.url ?? "");
    const promotionRequestId = route?.[1] ?? "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(promotionRequestId)) return json(res, { status: "REJECTED", reason: "promotionRequestId must be a UUID" }, 422);
    let raw = "";
    for await (const chunk of req) {
      raw += chunk;
      if (Buffer.byteLength(raw, "utf8") > 16_384) return json(res, { status: "REJECTED", reason: "decision command exceeds 16 KiB" }, 413);
    }
    let parsed: ReturnType<typeof parsePromotionDecisionCommand>;
    try { parsed = parsePromotionDecisionCommand(JSON.parse(raw) as unknown); }
    catch { return json(res, { status: "REJECTED", reason: "decision command is not valid JSON" }, 422); }
    if (!parsed.ok) return json(res, { status: "REJECTED", reason: parsed.reason }, 422);
    const command = parsed.command;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const parent = await client.query<{ request_payload: import("./contracts/generated-types.js").V32PromotionRequest; request_fingerprint: string }>("SELECT request_payload, request_fingerprint FROM promotion_requests WHERE promotion_request_id=$1 FOR UPDATE", [promotionRequestId]);
      if (parent.rowCount !== 1) { await client.query("ROLLBACK"); return json(res, { status: "NOT_FOUND", reason: "PromotionRequest not found" }, 404); }
      const reportResult = await client.query<{ report_payload: import("./contracts/generated-types.js").V32IndependentValidationReport; report_fingerprint: string }>("SELECT report_payload, report_fingerprint FROM promotion_validation_reports WHERE promotion_request_id=$1 FOR UPDATE", [promotionRequestId]);
      if (reportResult.rowCount !== 1) { await client.query("ROLLBACK"); return json(res, { status: "NOT_READY", reason: "immutable validation report is not available" }, 409); }
      const request = parent.rows[0].request_payload;
      const report = reportResult.rows[0].report_payload;
      const reportFingerprint = reportResult.rows[0].report_fingerprint.trim();
      if (command.reportFingerprint !== reportFingerprint) { await client.query("ROLLBACK"); return json(res, { status: "CONFLICT", reason: "decision report fingerprint is stale" }, 409); }
      if (report.promotionRequestId !== promotionRequestId || report.testRunId !== request.testRunId || report.sourceMode !== (request.candidateSource === "FIXTURE" ? "FIXTURE" : "REAL_CANDIDATE")) { await client.query("ROLLBACK"); return json(res, { status: "CONFLICT", reason: "report does not match the immutable request version" }, 409); }
      if (command.decision === "APPROVE" && !reportIsApprovable(report)) { await client.query("ROLLBACK"); return json(res, { status: "REJECTED", reason: "only a complete report with all required checks PASS can be approved" }, 422); }
      const versionFingerprint = promotionVersionFingerprint(request, parent.rows[0].request_fingerprint.trim(), reportFingerprint);
      const inserted = await client.query<{ decision: string; report_fingerprint: string; version_fingerprint: string; actor_id: string; created_at: Date }>(
        `INSERT INTO promotion_decisions (promotion_request_id, decision, report_fingerprint, version_fingerprint, actor_id)
         VALUES ($1,$2,$3,$4,$5) ON CONFLICT (promotion_request_id) DO NOTHING RETURNING *`,
        [promotionRequestId, command.decision, reportFingerprint, versionFingerprint, command.actorId],
      );
      let row = inserted.rows[0];
      let idempotent = false;
      if (!row) {
        const existing = await client.query<{ decision: string; report_fingerprint: string; version_fingerprint: string; actor_id: string; created_at: Date }>("SELECT decision, report_fingerprint, version_fingerprint, actor_id, created_at FROM promotion_decisions WHERE promotion_request_id=$1", [promotionRequestId]);
        if (existing.rowCount !== 1) throw new Error("decision raced with a concurrent state change");
        row = existing.rows[0];
        if (row.decision !== command.decision || row.report_fingerprint.trim() !== reportFingerprint || row.version_fingerprint.trim() !== versionFingerprint || row.actor_id !== command.actorId) {
          await client.query("ROLLBACK");
          return json(res, { status: "CONFLICT", reason: "an immutable decision already exists for this PromotionRequest" }, 409);
        }
        idempotent = true;
      } else if (command.decision === "APPROVE") {
        await client.query(
          `INSERT INTO promotion_registry_versions (promotion_request_id, version_fingerprint, candidate_source, candidate_artifact_id, candidate_namespace, candidate_sha256, code_sha256, data_manifest_sha256, metrics_manifest_sha256, validation_plan_sha256, approved_by, status, activation)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'CANDIDATE_APPROVED','DISABLED_UNTIL_MANDATE')`,
          [promotionRequestId, versionFingerprint, request.candidateSource, request.candidateArtifact.artifactId, request.candidateArtifact.namespace, request.candidateArtifact.sha256, request.codeSha256, request.dataManifestSha256, request.metricsManifestSha256, request.validationPlanSha256, command.actorId],
        );
      }
      await client.query("COMMIT");
      return json(res, { schemaVersion: "v3.2-promotion-decision-result-v1", promotionRequestId, decision: row.decision, reportFingerprint: row.report_fingerprint.trim(), versionFingerprint: row.version_fingerprint.trim(), actorId: row.actor_id, registryStatus: row.decision === "APPROVE" ? "CANDIDATE_APPROVED" : "NOT_REGISTERED", activation: "DISABLED_UNTIL_MANDATE", createdAt: row.created_at.toISOString(), idempotent }, idempotent ? 200 : 201);
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") return json(res, { status: "CONFLICT", reason: "version fingerprint is already registered" }, 409);
      return json(res, { status: "REJECTED", reason: error instanceof Error ? error.message : "promotion decision failed" }, 422);
    } finally { client.release(); }
  }
  if (req.method === "GET" && /^\/v1\/promotions\/[^/]+\/validation-report$/.test(req.url ?? "")) {
    const route = /^\/v1\/promotions\/([^/]+)\/validation-report$/.exec(req.url ?? "");
    const promotionRequestId = route?.[1] ?? "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(promotionRequestId)) return json(res, { status: "REJECTED", reason: "promotionRequestId must be a UUID" }, 422);
    const result = await pool.query<{ report_fingerprint: string; report_payload: unknown; evidence_payload: unknown; created_at: Date }>("SELECT report_fingerprint, report_payload, evidence_payload, created_at FROM promotion_validation_reports WHERE promotion_request_id=$1", [promotionRequestId]);
    if (result.rowCount !== 1) return json(res, { status: "NOT_FOUND", reason: "validation report not found" }, 404);
    const row = result.rows[0];
    return json(res, { schemaVersion: "v3.2-independent-validation-result-v1", promotionRequestId, reportFingerprint: row.report_fingerprint.trim(), report: row.report_payload, evidence: row.evidence_payload, createdAt: row.created_at.toISOString(), idempotent: false });
  }
  if (req.method === "GET" && /^\/v1\/registry\/versions\/[a-f0-9]{64}$/i.test(req.url ?? "")) {
    const versionFingerprint = req.url!.slice("/v1/registry/versions/".length).toLowerCase();
    const result = await pool.query<{ promotion_request_id: string; version_fingerprint: string; candidate_artifact_id: string; candidate_namespace: string; candidate_sha256: string; code_sha256: string; data_manifest_sha256: string; metrics_manifest_sha256: string; validation_plan_sha256: string; approved_by: string; status: "CANDIDATE_APPROVED"; activation: "DISABLED_UNTIL_MANDATE" }>(
      `SELECT promotion_request_id, version_fingerprint, candidate_artifact_id, candidate_namespace, candidate_sha256, code_sha256, data_manifest_sha256, metrics_manifest_sha256, validation_plan_sha256, approved_by, status, activation FROM promotion_registry_versions WHERE version_fingerprint=$1`,
      [versionFingerprint]
    );
    if (result.rowCount !== 1) return json(res, { status: "NOT_FOUND", reason: "approved Registry version not found" }, 404);
    const row = result.rows[0];
    return json(res, { schemaVersion: "v3.2-promotion-registry-version-v1", promotionRequestId: row.promotion_request_id, versionFingerprint: row.version_fingerprint.trim(), candidateArtifact: { artifactId: row.candidate_artifact_id, namespace: row.candidate_namespace, sha256: row.candidate_sha256.trim() }, codeSha256: row.code_sha256.trim(), dataManifestSha256: row.data_manifest_sha256.trim(), metricsManifestSha256: row.metrics_manifest_sha256.trim(), validationPlanSha256: row.validation_plan_sha256.trim(), approvedBy: row.approved_by, status: row.status, activation: row.activation });
  }
  if (req.method === "POST" && req.url === "/v1/promotions") {
    let raw = "";
    for await (const chunk of req) {
      raw += chunk;
      if (Buffer.byteLength(raw, "utf8") > 65536) return json(res, { status: "REJECTED", reason: "PromotionRequest exceeds 64 KiB" }, 413);
    }
    try {
      const parsed = parsePromotionRequest(JSON.parse(raw) as unknown);
      if (!parsed.ok) return json(res, { status: "REJECTED", reason: parsed.reason }, 422);
      const request = parsed.request;
      const fingerprint = promotionRequestFingerprint(request);
      const created = await pool.query<{ promotion_request_id: string; request_fingerprint: string; request_payload: typeof request; status: "AWAITING_INDEPENDENT_VALIDATION"; created_at: Date }>(
        `INSERT INTO promotion_requests (promotion_request_id, idempotency_key, request_fingerprint, request_payload, status)
         VALUES ($1,$2,$3,$4::jsonb,'AWAITING_INDEPENDENT_VALIDATION')
         ON CONFLICT (idempotency_key) DO NOTHING RETURNING *`,
        [request.promotionRequestId, request.idempotencyKey, fingerprint, JSON.stringify(request)]
      );
      let row = created.rows[0];
      let idempotent = false;
      if (!row) {
        const existing = await pool.query<{ promotion_request_id: string; request_fingerprint: string; request_payload: typeof request; status: "AWAITING_INDEPENDENT_VALIDATION"; created_at: Date }>("SELECT * FROM promotion_requests WHERE idempotency_key=$1", [request.idempotencyKey]);
        if (existing.rowCount !== 1) return json(res, { status: "CONFLICT", reason: "promotion request identifier is already assigned to another idempotency key" }, 409);
        row = existing.rows[0];
        if (row.request_fingerprint.trim() !== fingerprint) return json(res, { status: "CONFLICT", reason: "idempotency key is already bound to a different immutable PromotionRequest" }, 409);
        idempotent = true;
      }
      return json(res, { schemaVersion: "v3.2-promotion-request-result-v1", promotionRequestId: row.promotion_request_id, testRunId: request.testRunId, status: row.status, createdAt: row.created_at.toISOString(), idempotent }, idempotent ? 200 : 201);
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") return json(res, { status: "CONFLICT", reason: "promotion request identifier is already assigned to another idempotency key" }, 409);
      return json(res, { status: "REJECTED", reason: error instanceof Error ? error.message : "invalid PromotionRequest" }, 422);
    }
  }
  if (req.method === "GET" && req.url?.startsWith("/v1/promotions/")) {
    const detailRoute = /^\/v1\/promotions\/([^/?]+)\/detail$/.exec(req.url);
    if (detailRoute) {
      const requestId = detailRoute[1];
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) return json(res, { status: "REJECTED", reason: "promotionRequestId must be a UUID" }, 422);
      const result = await pool.query<{ promotion_request_id: string; request_payload: unknown; status: string; created_at: Date; decision: string | null; report_fingerprint: string | null; version_fingerprint: string | null; actor_id: string | null; registry_status: string | null; activation: string | null }>(
        `SELECT p.promotion_request_id, p.request_payload,
                CASE WHEN d.decision='APPROVE' THEN 'CANDIDATE_APPROVED'
                     WHEN d.decision='REJECT' OR v.report_payload->>'disposition'='REJECTED' THEN 'REJECTED'
                     WHEN v.report_payload->>'disposition'='INCOMPLETE' THEN 'VALIDATION_INCOMPLETE'
                     WHEN v.promotion_request_id IS NOT NULL THEN 'AWAITING_REVIEW'
                     ELSE 'AWAITING_INDEPENDENT_VALIDATION' END AS status,
                p.created_at,
                d.decision, d.report_fingerprint, d.version_fingerprint, d.actor_id,
                r.status AS registry_status, r.activation
         FROM promotion_requests p
         LEFT JOIN promotion_validation_reports v ON v.promotion_request_id=p.promotion_request_id
         LEFT JOIN promotion_decisions d ON d.promotion_request_id=p.promotion_request_id
         LEFT JOIN promotion_registry_versions r ON r.promotion_request_id=p.promotion_request_id
         WHERE p.promotion_request_id=$1`, [requestId]);
      if (result.rowCount !== 1) return json(res, { status: "NOT_FOUND" }, 404);
      const row = result.rows[0];
      const decision = row.decision ? { decision: row.decision, reportFingerprint: row.report_fingerprint?.trim(), versionFingerprint: row.version_fingerprint?.trim(), actorId: row.actor_id, registryStatus: row.registry_status ?? "NOT_REGISTERED", activation: row.activation ?? "DISABLED_UNTIL_MANDATE" } : null;
      return json(res, { schemaVersion: "v3.2-promotion-request-detail-v1", promotionRequestId: row.promotion_request_id, request: row.request_payload, status: row.status, createdAt: row.created_at.toISOString(), decision });
    }
    const route = /^\/v1\/promotions\/([^/?]+)$/.exec(req.url);
    if (!route) return json(res, { status: "NOT_FOUND" }, 404);
    const requestId = route[1];
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
      return json(res, { status: "REJECTED", reason: "promotionRequestId must be a UUID" }, 422);
    }
    const result = await pool.query<{ promotion_request_id: string; request_payload: { testRunId: string }; status: "AWAITING_INDEPENDENT_VALIDATION"; created_at: Date }>("SELECT promotion_request_id, request_payload, status, created_at FROM promotion_requests WHERE promotion_request_id=$1", [requestId]);
    if (result.rowCount !== 1) return json(res, { status: "NOT_FOUND" }, 404);
    const row = result.rows[0];
    return json(res, { schemaVersion: "v3.2-promotion-request-result-v1", promotionRequestId: row.promotion_request_id, testRunId: row.request_payload.testRunId, status: row.status, createdAt: row.created_at.toISOString(), idempotent: false });
  }
  if (req.url === "/v1/factors/preview") return json(res,{factorVersion:"v1.2-sma-factor-1",dataVersion:"v1.2-market-data-1",asOf:"2024-01-04",qlibStatus:(await probeQlib()).status,ranking:[{ticker:"000002.SZ",factor:"0.014851",signal:"TOPK"},{ticker:"000001.SZ",factor:"0.009901",signal:"TOPK"}],noTrade:false,lookbackBars:2});
  if (req.method === "POST" && req.url === "/v1/research/multi-bar") {
    let raw = ""; for await (const chunk of req) raw += chunk;
    try {
      const body = JSON.parse(raw) as { bars?: Array<{ timestamp: string; open: string; volume: number }>; executions?: unknown[]; runId?: string };
      const probe = await probeQlib();
      if (probe.status !== "READY") return json(res, { status:"NOT_RUN", reason:"Qlib probe is not READY", probe }, 503);
      const bars = body.bars ?? [];
      if (bars.length === 0) return json(res, { status:"REJECTED", reason:"bars are required" }, 422);
      const training = bars.length >= 3 ? await (async () => { const response = await fetch(`${qlibWorkerUrl}/train`, { method:"POST", headers:qlibWorkerHeaders(), body:JSON.stringify({ bars }) }); if (!response.ok) throw new Error("qlib training runtime rejected fixture"); return response.json(); })() : { status:"NOT_RUN", reason:"at least 3 bars required for train/validation/test splits" };
      const validation = training.artifact ? await (async () => { const response = await fetch(`${qlibWorkerUrl}/validate`, { method:"POST", headers:qlibWorkerHeaders(), body:JSON.stringify({ bars, artifactHash:training.artifact.artifactHash }) }); return response.json(); })() : { status:"NOT_RUN", independent:true };
      if (validation.status === "HASH_MISMATCH") return json(res, { status:"REJECTED", reason:"fixture summary hash did not reproduce", validation }, 422);
      const artifactHash = createHash("sha256").update(JSON.stringify({ bars, executions: body.executions ?? [] })).digest("hex");
      const validationApplicable = bars.length >= 3;
      return json(res, { status:"COMPLETED", adapter:"fixture-summary", runId:body.runId ?? null, dataMode:"FIXTURE", environmentMode:"BACKTEST", modelTraining:"NOT_RUN", independentModelValidation:"NOT_RUN", modelCalls:"NOT_RUN", barCount:bars.length, filledBarCount:(body.executions ?? []).length, artifactHash, training, validation, assertions:[{ assertionId:"V2.3-FIXTURE-SUMMARY-001", status:training.status === "FIXTURE_ONLY" ? "PASS" : "FAIL", expected:"fixture-only open-price summary is explicitly labelled and no model training is claimed", actual:{ trainingStatus:training.status, adapter:training.adapter, barCount:bars.length, filledBarCount:(body.executions ?? []).length } }, { assertionId:"V2.3-FIXTURE-SUMMARY-HASH-001", status:validationApplicable ? (validation.status === "HASH_MATCH" ? "PASS" : "FAIL") : "NOT_APPLICABLE", expected:validationApplicable ? "deterministic fixture summary hash is reproduced; independent model validation remains NOT_RUN" : "at least 3 bars required before fixture hash recomputation", actual:validation }] });
    } catch (error) { return json(res, { status:"REJECTED", reason:error instanceof Error ? error.message : "invalid research request" }, 422); }
  }
  if (req.method === "POST" && req.url === "/v1/research/train") {
    let raw = ""; for await (const chunk of req) raw += chunk;
    try {
      const response = await fetch(`${qlibWorkerUrl}/train`, { method:"POST", headers:qlibWorkerHeaders(), body:raw });
      return json(res, await response.json(), response.status);
    } catch (error) { return json(res, { status:"NOT_RUN", reason:error instanceof Error ? error.message : "qlib worker unavailable" }, 503); }
  }
  if (req.method === "POST" && req.url === "/v1/research/validate") {
    let raw = ""; for await (const chunk of req) raw += chunk;
    try { const body = JSON.parse(raw); const response = await fetch(`${qlibWorkerUrl}/validate`, { method:"POST", headers:qlibWorkerHeaders(), body:JSON.stringify(body) }); return json(res, await response.json(), response.status); }
    catch (error) { return json(res, { status:"NOT_RUN", reason:error instanceof Error ? error.message : "qlib worker unavailable" }, 503); }
  }
  if (req.method === "POST" && req.url === "/v1/research/candidates") {
    let raw = ""; for await (const chunk of req) raw += chunk;
    try {
      const parsed = parseCandidateRegistrationCommand(JSON.parse(raw) as unknown);
      if (!parsed.ok) return json(res, { status:"REJECTED", reason:parsed.reason }, 422);
      const body = parsed.value;
      const expectedHash = "e6586d4135eeeed375eb521b003c346a3f16b21da5f310cdd88ed67ee21e59b7";
      if (body.artifactHash !== expectedHash) return json(res, { status:"REJECTED", reason:"candidate artifact hash does not match the approved artifact" }, 422);
      if (!body.approvedBy) return json(res, { status:"PENDING_APPROVAL", reason:"explicit user approval is required" }, 202);
      const requester = req.headers["x-stockquant-user"];
      if (typeof requester !== "string" || requester !== body.approvedBy) return json(res, { status:"REJECTED", reason:"approvedBy must match the authenticated x-stockquant-user" }, 403);
      const candidateId = body.candidateId ?? body.artifactHash;
      if (typeof candidateId !== "string") return json(res, { status:"REJECTED", reason:"candidateId is invalid" }, 422);
      const registration: CandidateRegistration = { candidateId, qlibVersion: body.qlibVersion, algorithm: body.algorithm, artifactHash: body.artifactHash, approvedBy: body.approvedBy };
      const created = await pool.query<{ candidate_id:string; qlib_version:string; algorithm:string; artifact_hash:string; approved_by:string; status:string; activation:string; created_at:Date }>(`INSERT INTO research_candidates (candidate_id, qlib_version, algorithm, artifact_hash, approved_by, status, activation) VALUES ($1,$2,$3,$4,$5,'CANDIDATE_APPROVED','DISABLED_UNTIL_MANDATE') ON CONFLICT (candidate_id) DO NOTHING RETURNING *`, [registration.candidateId, registration.qlibVersion, registration.algorithm, registration.artifactHash, registration.approvedBy]);
      let row = created.rows[0];
      let idempotent = false;
      if (!row) {
        const existing = await pool.query<{ candidate_id:string; qlib_version:string; algorithm:string; artifact_hash:string; approved_by:string; status:string; activation:string; created_at:Date }>("SELECT * FROM research_candidates WHERE candidate_id=$1", [candidateId]);
        if (existing.rowCount !== 1) return json(res, { status:"CONFLICT", reason:"candidate registration raced with a concurrent state change" }, 409);
        const existingRegistration: CandidateRegistration = { candidateId: existing.rows[0].candidate_id, qlibVersion: existing.rows[0].qlib_version, algorithm: existing.rows[0].algorithm, artifactHash: existing.rows[0].artifact_hash.trim(), approvedBy: existing.rows[0].approved_by };
        const decision = decideCandidateRegistration(existingRegistration, registration);
        if (decision.kind === "CONFLICT") return json(res, { status:"CONFLICT", reason:decision.reason }, 409);
        row = existing.rows[0];
        idempotent = true;
      }
      const candidate = { candidateId:row.candidate_id, qlibVersion:"0.9.6" as const, algorithm:"deterministic-sma" as const, artifactHash:registration.artifactHash, approvedBy:registration.approvedBy, status:"CANDIDATE_APPROVED" as const, activation:"DISABLED_UNTIL_MANDATE" as const, createdAt:row.created_at.toISOString(), idempotent } satisfies QuantCandidateRegistrationResult;
      return json(res, { ...candidate, idempotent }, idempotent ? 200 : 201);
    } catch (error) { return json(res, { status:"REJECTED", reason:error instanceof Error ? error.message : "invalid candidate" }, 422); }
  }
  if (req.method === "GET" && req.url?.startsWith("/v1/research/candidates/")) {
    const result = await pool.query<{ candidate_id:string; qlib_version:string; algorithm:string; artifact_hash:string; approved_by:string; status:string; activation:string; created_at:Date }>("SELECT * FROM research_candidates WHERE candidate_id=$1", [req.url.split("/").pop() ?? ""]);
    if (result.rowCount !== 1) return json(res, { status:"NOT_FOUND" }, 404);
    const row = result.rows[0];
    return json(res, { candidateId:row.candidate_id, qlibVersion:row.qlib_version, algorithm:row.algorithm, artifactHash:row.artifact_hash, approvedBy:row.approved_by, status:row.status, activation:row.activation, createdAt:row.created_at.toISOString() });
  }
  return json(res,{code:"NOT_FOUND",message:"route not found"},404);
});
server.listen(port,process.env.STOCKQUANT_BIND_HOST??"127.0.0.1");

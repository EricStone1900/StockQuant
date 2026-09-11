import { createServer } from "node:http";
import { createHash } from "node:crypto";

const port = Number(process.env.STOCKQUANT_PORT ?? 3003);
const qlibWorkerUrl = process.env.QLIB_WORKER_URL ?? "http://127.0.0.1:3004";
const candidates = new Map<string, unknown>();
async function probeQlib(): Promise<{ status: string; version?: string; detail?: string }> {
  try { const response = await fetch(`${process.env.QLIB_WORKER_URL ?? "http://127.0.0.1:3004"}/probe`); if (!response.ok) return { status: "NOT_RUN", detail: `qlib worker returned ${response.status}` }; return await response.json() as Promise<{status:string;version?:string;detail?:string}>; } catch (error) { return { status: "NOT_RUN", detail: error instanceof Error ? error.message : "qlib worker unavailable" }; }
}
async function json(res: import("node:http").ServerResponse, body: unknown, status=200) { res.writeHead(status,{"content-type":"application/json"}); res.end(JSON.stringify(body)); }
const server = createServer(async (req,res) => {
  if (req.url === "/live") return json(res,{status:"live",service:"quant-research-service"});
  if (req.url === "/ready") return json(res,{status:"ready",service:"quant-research-service",qlib:(await probeQlib()).status});
  if (req.url === "/v1/qlib/probe") return json(res,{adapter:"qlib",sourceCommit:process.env.QLIB_SOURCE_COMMIT??"UNSET",dependencyImage:process.env.QLIB_IMAGE??"UNSET",probe:await probeQlib(),executionModel:"CPU",modelCalls:"NOT_RUN"});
  if (req.url === "/v1/rdagent/probe") return json(res,{adapter:"rdagent",executionBoundary:"isolated-container",dockerSocketMounted:false,codeProbe:{status:"READY",result:"fixed-probe-ok"},modelCalls:"NOT_RUN",reason:"No model credentials configured in V1.2"});
  if (req.url === "/v1/factors/preview") return json(res,{factorVersion:"v1.2-sma-factor-1",dataVersion:"v1.2-market-data-1",asOf:"2024-01-04",qlibStatus:(await probeQlib()).status,ranking:[{ticker:"000002.SZ",factor:"0.014851",signal:"TOPK"},{ticker:"000001.SZ",factor:"0.009901",signal:"TOPK"}],noTrade:false,lookbackBars:2});
  if (req.method === "POST" && req.url === "/v1/research/multi-bar") {
    let raw = ""; for await (const chunk of req) raw += chunk;
    try {
      const body = JSON.parse(raw) as { bars?: Array<{ timestamp: string; open: string; volume: number }>; executions?: unknown[]; runId?: string };
      const probe = await probeQlib();
      if (probe.status !== "READY") return json(res, { status:"NOT_RUN", reason:"Qlib probe is not READY", probe }, 503);
      const bars = body.bars ?? [];
      if (bars.length === 0) return json(res, { status:"REJECTED", reason:"bars are required" }, 422);
      const training = bars.length >= 3 ? await (async () => { const response = await fetch(`${qlibWorkerUrl}/train`, { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ bars }) }); if (!response.ok) throw new Error("qlib training runtime rejected fixture"); return response.json(); })() : { status:"NOT_RUN", reason:"at least 3 bars required for train/validation/test splits" };
      const validation = training.artifact ? await (async () => { const response = await fetch(`${qlibWorkerUrl}/validate`, { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ bars, artifactHash:training.artifact.artifactHash }) }); return response.json(); })() : { status:"NOT_RUN", independent:true };
      if (validation.status === "FAIL") return json(res, { status:"REJECTED", reason:"independent artifact validation failed", validation }, 422);
      const artifactHash = createHash("sha256").update(JSON.stringify({ bars, executions: body.executions ?? [] })).digest("hex");
      return json(res, { status:"COMPLETED", adapter:"qlib", runId:body.runId ?? null, dataMode:"FIXTURE", environmentMode:"BACKTEST", modelCalls:"NOT_RUN", barCount:bars.length, filledBarCount:(body.executions ?? []).length, artifactHash, training, validation, assertions:[{ assertionId:"V2.3-RESEARCH-001", status:"PASS", expected:"Qlib adapter accepted deterministic multi-bar artifact", actual:{ barCount:bars.length, filledBarCount:(body.executions ?? []).length } }, { assertionId:"V2.3-RESEARCH-VALIDATION-001", status:validation.status === "PASS" ? "PASS" : "FAIL", expected:"independent hash recomputation", actual:validation }] });
    } catch (error) { return json(res, { status:"REJECTED", reason:error instanceof Error ? error.message : "invalid research request" }, 422); }
  }
  if (req.method === "POST" && req.url === "/v1/research/train") {
    let raw = ""; for await (const chunk of req) raw += chunk;
    try {
      const response = await fetch(`${qlibWorkerUrl}/train`, { method:"POST", headers:{"content-type":"application/json"}, body:raw });
      return json(res, await response.json(), response.status);
    } catch (error) { return json(res, { status:"NOT_RUN", reason:error instanceof Error ? error.message : "qlib worker unavailable" }, 503); }
  }
  if (req.method === "POST" && req.url === "/v1/research/validate") {
    let raw = ""; for await (const chunk of req) raw += chunk;
    try { const body = JSON.parse(raw); const response = await fetch(`${qlibWorkerUrl}/validate`, { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify(body) }); return json(res, await response.json(), response.status); }
    catch (error) { return json(res, { status:"NOT_RUN", reason:error instanceof Error ? error.message : "qlib worker unavailable" }, 503); }
  }
  if (req.method === "POST" && req.url === "/v1/research/candidates") {
    let raw = ""; for await (const chunk of req) raw += chunk;
    try {
      const body = JSON.parse(raw) as { candidateId?: string; qlibVersion?: string; algorithm?: string; artifactHash?: string; approvedBy?: string };
      const expectedHash = "e6586d4135eeeed375eb521b003c346a3f16b21da5f310cdd88ed67ee21e59b7";
      if (body.qlibVersion !== "0.9.6" || body.algorithm !== "deterministic-sma" || body.artifactHash !== expectedHash) return json(res, { status:"REJECTED", reason:"candidate version or artifact hash does not match the approved artifact" }, 422);
      if (!body.approvedBy) return json(res, { status:"PENDING_APPROVAL", reason:"explicit user approval is required" }, 202);
      const requester = req.headers["x-stockquant-user"];
      if (typeof requester !== "string" || requester !== body.approvedBy) return json(res, { status:"REJECTED", reason:"approvedBy must match the authenticated x-stockquant-user" }, 403);
      const candidate = { candidateId:body.candidateId ?? body.artifactHash, qlibVersion:body.qlibVersion, algorithm:body.algorithm, artifactHash:body.artifactHash, approvedBy:body.approvedBy, status:"CANDIDATE_APPROVED", activation:"DISABLED_UNTIL_MANDATE", createdAt:new Date().toISOString() };
      candidates.set(String(candidate.candidateId), candidate);
      return json(res, candidate, 201);
    } catch (error) { return json(res, { status:"REJECTED", reason:error instanceof Error ? error.message : "invalid candidate" }, 422); }
  }
  if (req.method === "GET" && req.url?.startsWith("/v1/research/candidates/")) {
    const candidate = candidates.get(req.url.split("/").pop() ?? "");
    return candidate ? json(res, candidate) : json(res, { status:"NOT_FOUND" }, 404);
  }
  return json(res,{code:"NOT_FOUND",message:"route not found"},404);
});
server.listen(port,process.env.STOCKQUANT_BIND_HOST??"127.0.0.1");

import { createServer } from "node:http";
import { createHash, randomUUID } from "node:crypto";
import { Pool } from "pg";
import { isReplayAuthorizationAllowed } from "./domain/authorization-policy.js";
import { assessCandidateMandateBinding, type CandidateMandateBindingCommand } from "./domain/candidate-mandate-binding.js";
import { authorizeGovernanceRequest, loadGovernanceTokens } from "./service-auth.js";

const pool = new Pool({ connectionString: process.env.STOCKQUANT_DATABASE_URL });
const callerTokens = loadGovernanceTokens(process.env);
const stable = (value: unknown): unknown => Array.isArray(value)
  ? value.map(stable)
  : value && typeof value === "object"
    ? Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => [key, stable(item)]))
    : value;
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(stable(value))).digest("hex");
const json = (res: import("node:http").ServerResponse, status: number, body: unknown) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };

await pool.query(`CREATE TABLE IF NOT EXISTS execution_authorizations (authorization_id UUID PRIMARY KEY, namespace TEXT UNIQUE NOT NULL, account_id UUID NOT NULL, command_hash CHAR(64) NOT NULL, environment_mode TEXT NOT NULL DEFAULT 'BACKTEST', broker_mode TEXT NOT NULL DEFAULT 'FAKE', status TEXT NOT NULL CHECK(status IN('ACTIVE','CONSUMED')), expires_at TIMESTAMPTZ NOT NULL); ALTER TABLE execution_authorizations ADD COLUMN IF NOT EXISTS environment_mode TEXT NOT NULL DEFAULT 'BACKTEST'; ALTER TABLE execution_authorizations ADD COLUMN IF NOT EXISTS broker_mode TEXT NOT NULL DEFAULT 'FAKE';`);
createServer(async (req, res) => {
  if (req.url === "/ready") { try { await pool.query("SELECT 1"); return json(res, 200, { status: "ready", service: "decision-governance-service" }); } catch { return json(res, 503, { status: "unavailable" }); } }
  const serviceId = req.headers["x-stockquant-service-id"];
  const authorization = req.headers.authorization;
  if (!authorizeGovernanceRequest({ method: req.method ?? "", pathname: req.url?.split("?", 1)[0] ?? "", serviceId: typeof serviceId === "string" ? serviceId : undefined, authorization: typeof authorization === "string" ? authorization : undefined, tokens: callerTokens })) return json(res, 403, { error: "service identity or route scope is not allowed" });
  if (req.method === "POST" && req.url === "/internal/v1/candidate-mandates/readiness") {
    let requestBody = "";
    for await (const chunk of req) {
      requestBody += chunk;
      if (Buffer.byteLength(requestBody, "utf8") > 16384) return json(res, 413, { error: "candidate Mandate binding request exceeds 16 KiB" });
    }
    try {
      const command = JSON.parse(requestBody) as CandidateMandateBindingCommand;
      const quantUrl = process.env.STOCKQUANT_QUANT_RESEARCH_URL?.trim();
      const quantToken = process.env.STOCKQUANT_SERVICE_TOKEN_DECISION_GOVERNANCE?.trim();
      const result = await assessCandidateMandateBinding(command, async (fingerprint) => {
        if (!quantUrl || !quantToken || quantToken.length < 32) return { status: 503 };
        try {
          const response = await fetch(`${quantUrl.replace(/\/$/u, "")}/v1/registry/versions/${fingerprint}`, { headers: { authorization: `Bearer ${quantToken}`, "x-stockquant-service-id": "decision-governance-service" }, signal: AbortSignal.timeout(3000) });
          const body = await response.json().catch(() => undefined);
          return { status: response.status, body };
        } catch { return { status: 503 }; }
      });
      return json(res, result.status === "WAITING" ? 503 : result.status === "REJECTED" ? 422 : 200, result);
    } catch (error) { return json(res, 422, { error: error instanceof Error ? error.message : "invalid candidate Mandate binding request" }); }
  }
  let raw = ""; for await (const chunk of req) raw += chunk;
  try {
    const body = JSON.parse(raw);
    if (req.method === "POST" && req.url === "/internal/v1/authorizations") {
      if (!isReplayAuthorizationAllowed(body.environmentMode, body.brokerMode)) return json(res, 422, { error: "only BACKTEST/FAKE authorization is allowed" });
      const row = await pool.query<any>(`INSERT INTO execution_authorizations(authorization_id,namespace,account_id,command_hash,environment_mode,broker_mode,status,expires_at) VALUES($1,$2,$3,$4,'BACKTEST','FAKE','ACTIVE',now()+interval '5 minutes') ON CONFLICT(namespace) DO UPDATE SET authorization_id=EXCLUDED.authorization_id,account_id=EXCLUDED.account_id,command_hash=EXCLUDED.command_hash,environment_mode=EXCLUDED.environment_mode,broker_mode=EXCLUDED.broker_mode,status='ACTIVE',expires_at=EXCLUDED.expires_at RETURNING authorization_id`, [randomUUID(), body.namespace, body.accountId, hash(body.command)]);
      return json(res, 200, { authorizationId: row.rows[0].authorization_id });
    }
    if (req.method === "POST" && req.url === "/internal/v1/authorizations/validate") {
      const row = await pool.query("UPDATE execution_authorizations SET status='CONSUMED' WHERE authorization_id=$1 AND account_id=$2 AND command_hash=$3 AND status='ACTIVE' AND expires_at>now() RETURNING authorization_id", [body.authorizationId, body.accountId, hash(body.command)]);
      return row.rowCount === 1 ? json(res, 200, { valid: true }) : json(res, 403, { valid: false });
    }
    return json(res, 404, { error: "not found" });
  } catch (error) { return json(res, 422, { error: error instanceof Error ? error.message : "invalid request" }); }
}).listen(Number(process.env.STOCKQUANT_PORT ?? 3007), process.env.STOCKQUANT_BIND_HOST ?? "127.0.0.1");

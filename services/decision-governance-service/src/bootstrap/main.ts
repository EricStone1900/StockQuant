import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { Pool } from "pg";
import { GovernanceApi } from "../application/governance-api.js";
import { loadGovernanceTokens } from "../application/service-auth.js";
import { PostgresExecutionAuthorizationRepository } from "../adapters/postgres-execution-authorization-repository.js";
import { QuantApprovedRegistryAdapter } from "../adapters/quant-approved-registry-client.js";
import type { ApprovedRegistryClient } from "../ports/approved-registry-client.js";
import type { ExecutionAuthorizationRepository } from "../ports/execution-authorization-repository.js";
import type { GovernanceTokens } from "../application/service-auth.js";
import { PostgresProposalRepository } from "../adapters/postgres-proposal-repository.js";
import { PostgresAutoMandateRepository } from "../adapters/postgres-auto-mandate-repository.js";
import { PostgresStrategySnapshotRepository } from "../adapters/postgres-strategy-snapshot-repository.js";
import { migrateDecisionGovernanceSchema } from "../adapters/postgres-schema-migrations.js";

type JsonServerResponse = ServerResponse<IncomingMessage>;
const json = (response: JsonServerResponse, status: number, body: unknown) => { response.writeHead(status, { "content-type": "application/json" }); response.end(JSON.stringify(body)); };
const unavailableRegistry: ApprovedRegistryClient = { async getApprovedPromotionRegistryVersion() { return { status: 503 }; } };

export function createGovernanceServer(input: { repository: ExecutionAuthorizationRepository; proposals?: PostgresProposalRepository; mandates?: PostgresAutoMandateRepository; strategySnapshots?: PostgresStrategySnapshotRepository; tokens: GovernanceTokens; registry?: ApprovedRegistryClient }) {
  const api = new GovernanceApi(input.repository, input.tokens, input.registry ?? unavailableRegistry, input.proposals, input.mandates, input.strategySnapshots);
  return createServer(async (request, response) => {
    const pathname = (request.url ?? "").split("?", 1)[0];
    if (request.method === "GET" && pathname === "/ready") {
      return api.ready()
        .then((ready) => json(response, ready ? 200 : 503, ready ? { status: "ready", service: "decision-governance-service" } : { status: "unavailable" }));
    }
    const serviceId = request.headers["x-stockquant-service-id"];
    const authorization = request.headers.authorization;
    const actorHeader = request.headers["x-stockquant-actor-id"];
    const ownerHeader = request.headers["x-stockquant-owner-id"];
    const apiRequest = { method: request.method ?? "", pathname, serviceId: typeof serviceId === "string" ? serviceId : undefined, authorization: typeof authorization === "string" ? authorization : undefined, actorId: typeof actorHeader === "string" ? actorHeader : undefined, ownerId: typeof ownerHeader === "string" ? ownerHeader : undefined };
    if (!api.authorized(apiRequest)) return json(response, 403, { error: "service identity or route scope is not allowed" });
    let rawBody = "";
    for await (const chunk of request) {
      rawBody += chunk;
      if (pathname === "/internal/v1/candidate-mandates/readiness" && Buffer.byteLength(rawBody, "utf8") > 16384) {
        return json(response, 413, { error: "candidate Mandate binding request exceeds 16 KiB" });
      }
    }
    const result = await api.handle({
      ...apiRequest,
      rawBody,
    });
    return json(response, result.status, result.body);
  });
}

export async function startGovernanceService(env: NodeJS.ProcessEnv = process.env) {
  const pool = new Pool({ connectionString: env.STOCKQUANT_DATABASE_URL });
  pool.on("error", (error: Error & { code?: string }) => {
    console.warn(`STOCKQUANT_GOVERNANCE_DATABASE_IDLE_CLIENT_ERROR name=${error.name} code=${error.code ?? "none"}`);
  });
  try {
    await migrateDecisionGovernanceSchema(pool);
    const registryUrl = env.STOCKQUANT_QUANT_RESEARCH_URL?.trim();
    const registryToken = env.STOCKQUANT_SERVICE_TOKEN_DECISION_GOVERNANCE?.trim();
    const registry = registryUrl && registryToken && registryToken.length >= 32
      ? new QuantApprovedRegistryAdapter(registryUrl, registryToken)
      : unavailableRegistry;
    const server = createGovernanceServer({ repository: new PostgresExecutionAuthorizationRepository(pool), proposals: new PostgresProposalRepository(pool), mandates: new PostgresAutoMandateRepository(pool), strategySnapshots: new PostgresStrategySnapshotRepository(pool), tokens: loadGovernanceTokens(env), registry });
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(Number(env.STOCKQUANT_PORT ?? 3007), env.STOCKQUANT_BIND_HOST ?? "127.0.0.1", resolve);
    });
    return { server, pool };
  } catch (error) {
    await pool.end();
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try { await startGovernanceService(); }
  catch (error) { console.error(error); process.exitCode = 1; }
}

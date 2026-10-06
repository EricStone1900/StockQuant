import { createServer } from "node:http";
import { Pool } from "pg";
import { checkpointForBars } from "../domain/checkpoint.js";
import { PostgresReplayRunRepository } from "../adapters/postgres-replay-run-repository.js";
import { createReplayCoordinator, ReplayCancelled, ReplayConflict, requestHash } from "../application/replay-coordinator.js";
import { isReplayWorkerPlatformRequest, loadReplayWorkerTokens } from "../service-auth.js";
import { isReplayTestRunId, parseHistoricalReplayCommand, parseHistoricalReplayMultiCommand } from "../domain/commands.js";
import { GeneratedPortfolioAccountClient } from "../contracts/generated-portfolio-account-client.js";
import { GeneratedTradeExecutionClient } from "../contracts/generated-trade-execution-client.js";
import { GeneratedReplayDependenciesClient } from "../contracts/generated-replay-dependencies-client.js";

const pool = new Pool({ connectionString: process.env.STOCKQUANT_DATABASE_URL });
const runs = new PostgresReplayRunRepository(pool);
const port = Number(process.env.STOCKQUANT_PORT ?? 3006);
const executionUrl = process.env.STOCKQUANT_TRADE_EXECUTION_URL ?? "http://127.0.0.1:3005";
const portfolioUrl = process.env.STOCKQUANT_PORTFOLIO_API_URL ?? "http://127.0.0.1:3001";
const replayTokens = loadReplayWorkerTokens(process.env);
const portfolioToken = replayTokens.self;
const portfolioClient = new GeneratedPortfolioAccountClient(portfolioUrl, "historical-replay-worker", portfolioToken);
const tradeExecutionClient = new GeneratedTradeExecutionClient(executionUrl, portfolioToken);
const governanceUrl = process.env.STOCKQUANT_GOVERNANCE_URL ?? "http://127.0.0.1:3007";
const quantResearchUrl = process.env.STOCKQUANT_QUANT_RESEARCH_URL ?? "http://127.0.0.1:3003";
const replayDependencies = new GeneratedReplayDependenciesClient(governanceUrl, quantResearchUrl, portfolioToken);
const isPlatformRequest = (headers: import("node:http").IncomingHttpHeaders) => isReplayWorkerPlatformRequest({ serviceId: typeof headers["x-stockquant-service-id"] === "string" ? headers["x-stockquant-service-id"] : undefined, authorization: typeof headers.authorization === "string" ? headers.authorization : undefined, tokens: replayTokens });
const maxReplayConcurrency = Math.max(1, Number(process.env.STOCKQUANT_REPLAY_MAX_CONCURRENCY ?? 2));
let activeReplays = 0;
const replayWaiters: Array<() => void> = [];
async function withReplaySlot<T>(operation: () => Promise<T>): Promise<T> {
  if (activeReplays >= maxReplayConcurrency) await new Promise<void>((resolve) => replayWaiters.push(resolve));
  activeReplays += 1;
  try { return await operation(); } finally { activeReplays -= 1; replayWaiters.shift()?.(); }
}
const json = (res: import("node:http").ServerResponse, status: number, body: unknown) => { res.writeHead(status,{"content-type":"application/json"}); res.end(JSON.stringify(body)); };
await runs.initialize();
const coordinator = createReplayCoordinator({ runs, portfolioClient, tradeExecutionClient, replayDependencies });
const { start, startMulti, getRun, recoverUnknown, transition, withRunLock } = coordinator;

createServer(async(req,res)=>{
  if(req.method==="GET"&&req.url==="/live")return json(res,200,{status:"live",service:"historical-replay-worker"});
  if(req.method==="GET"&&req.url==="/ready"){try{if(portfolioToken.length<32)return json(res,503,{status:"unavailable",reason:"portfolio bearer credential is not configured"});await runs.ready();return json(res,200,{status:"ready",service:"historical-replay-worker"});}catch{return json(res,503,{status:"unavailable"});}}
  const recoveryMatch = req.url?.match(/^\/internal\/v1\/replays\/([^/]+)\/recover-unknown$/);
  if (req.method === "POST" && recoveryMatch) {
    if (!isPlatformRequest(req.headers)) return json(res, 403, { error: "service identity is not allowed" });
    if (!isReplayTestRunId(recoveryMatch[1])) return json(res, 422, { error: "testRunId must be a UUID" });
    try { return json(res, 200, await recoverUnknown(recoveryMatch[1])); } catch (error) { return json(res, 422, { error: error instanceof Error ? error.message : "invalid recovery" }); }
  }
  const runMatch = req.url?.match(/^\/internal\/v1\/replays\/([^/]+)$/);
  if (runMatch && req.method === "GET") {
    if (!isPlatformRequest(req.headers)) return json(res, 403, { error: "service identity is not allowed" });
    if (!isReplayTestRunId(runMatch[1])) return json(res, 422, { error: "testRunId must be a UUID" });
    const run = await getRun(runMatch[1]); return run ? json(res, 200, run) : json(res, 404, { error: "replay run was not found" });
  }
  const actionMatch = req.url?.match(/^\/internal\/v1\/replays\/([^/]+)\/(pause|resume|cancel)$/);
  if (actionMatch && req.method === "POST") {
    if (!isPlatformRequest(req.headers)) return json(res, 403, { error: "service identity is not allowed" });
    if (!isReplayTestRunId(actionMatch[1])) return json(res, 422, { error: "testRunId must be a UUID" });
    try {
      const run = await getRun(actionMatch[1]);
      if (!run) return json(res, 404, { error: "replay run was not found" });
      const target = actionMatch[2] === "pause" ? "PAUSED" : actionMatch[2] === "resume" ? "RUNNING" : "CANCELLED";
      await transition(actionMatch[1], target);
      return json(res, 200, await getRun(actionMatch[1]));
    } catch (error) { return json(res, 409, { error: error instanceof Error ? error.message : "invalid replay transition" }); }
  }
  if (req.method === "POST" && (req.url === "/internal/v1/replays/multi" || req.url === "/internal/v1/replays/multi?async=true")) {
    if(!isPlatformRequest(req.headers))return json(res,403,{error:"service identity is not allowed"});
    let body="";for await(const chunk of req)body+=chunk;try{const command=parseHistoricalReplayMultiCommand(JSON.parse(body));
      if (req.url.endsWith("?async=true")) {
        const hash = requestHash(command);
        await runs.insert({ testRunId: command.testRunId, namespace: command.namespace, ownerId: command.ownerId, scenarioId: command.scenarioId, requestHash: hash, checkpoint: checkpointForBars(command.bars, command.seed) }, true);
        void withReplaySlot(() => withRunLock(command.testRunId, () => startMulti(command))).catch(() => undefined);
        return json(res,202,{accepted:true,testRunId:command.testRunId,status:"RUNNING"});
      }
      return json(res,200,await withReplaySlot(() => withRunLock(command.testRunId, () => startMulti(command))));
    }catch(error){return json(res,error instanceof ReplayConflict ? 409 : 422,{error:error instanceof Error?error.message:"invalid multi-bar replay"});}
  }
  if(req.method!=="POST"||req.url!=="/internal/v1/replays")return json(res,404,{error:"not found"});
  if(!isPlatformRequest(req.headers))return json(res,403,{error:"service identity is not allowed"});
  let body="";for await(const chunk of req)body+=chunk;try{const command=parseHistoricalReplayCommand(JSON.parse(body));return json(res,200,await withRunLock(command.testRunId, () => start(command)));}catch(error){return json(res,error instanceof ReplayCancelled || error instanceof ReplayConflict ? 409 : 422,{error:error instanceof Error?error.message:"invalid replay"});}
}).listen(port,process.env.STOCKQUANT_BIND_HOST??"127.0.0.1");

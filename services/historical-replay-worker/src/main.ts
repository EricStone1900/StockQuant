import { createServer } from "node:http";
import { Pool } from "pg";
import { checkpointForBars, checkpointForExecution } from "./domain/checkpoint.js";

type Command = { testRunId: string; namespace: string; ownerId: string; scenarioId: "normal" | "recovery"; seed: number; bar: { timestamp: string; open: string; volume: number } };
type MultiCommand = Omit<Command, "bar"> & { bars: Array<{ timestamp: string; open: string; volume: number }> };
const pool = new Pool({ connectionString: process.env.STOCKQUANT_DATABASE_URL });
const port = Number(process.env.STOCKQUANT_PORT ?? 3006);
const executionUrl = process.env.STOCKQUANT_TRADE_EXECUTION_URL ?? "http://127.0.0.1:3005";
const portfolioUrl = process.env.STOCKQUANT_PORTFOLIO_API_URL ?? "http://127.0.0.1:3001";
const governanceUrl = process.env.STOCKQUANT_GOVERNANCE_URL ?? "http://127.0.0.1:3007";
const quantResearchUrl = process.env.STOCKQUANT_QUANT_RESEARCH_URL ?? "http://127.0.0.1:3003";
const allowedService = process.env.STOCKQUANT_ALLOWED_SERVICE_ID ?? "platform-api-service";
const json = (res: import("node:http").ServerResponse, status: number, body: unknown) => { res.writeHead(status,{"content-type":"application/json"}); res.end(JSON.stringify(body)); };
await pool.query(`CREATE TABLE IF NOT EXISTS replay_worker_runs (
  test_run_id UUID PRIMARY KEY, namespace TEXT NOT NULL UNIQUE, owner_id TEXT NOT NULL, scenario_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('RUNNING','COMPLETED','FAILED')), checkpoint JSONB NOT NULL, result JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), completed_at TIMESTAMPTZ
)`);

async function start(command: Command) {
  const found = await pool.query<any>("SELECT * FROM replay_worker_runs WHERE test_run_id=$1", [command.testRunId]);
  if (found.rowCount === 1 && found.rows[0].status === "COMPLETED") return { ...found.rows[0].result, replayedRun: true };
  await pool.query(`INSERT INTO replay_worker_runs (test_run_id,namespace,owner_id,scenario_id,status,checkpoint) VALUES ($1,$2,$3,$4,'RUNNING',$5::jsonb)
    ON CONFLICT (test_run_id) DO UPDATE SET status='RUNNING', checkpoint=EXCLUDED.checkpoint`, [command.testRunId,command.namespace,command.ownerId,command.scenarioId,JSON.stringify(checkpointForExecution(command.bar.timestamp, command.seed))]);
  try {
    const initialized = await fetch(`${portfolioUrl}/internal/v1/accounts/initialize`,{method:"POST",headers:{"content-type":"application/json","x-stockquant-service-id":"historical-replay-worker"},body:JSON.stringify({fixtureAccountRef:"v2.3-replay-cash-1",ownerId:command.ownerId,market:"CN_A",environmentMode:"BACKTEST",brokerMode:"FAKE",initialCash:{amount:"10000.0000",currency:"CNY"},namespace:command.namespace,testRunId:command.testRunId,idempotencyKey:`initialize-${command.testRunId}`})});
    if (!initialized.ok) throw new Error(`portfolio initialization failed: ${initialized.status}`);
    const account = await initialized.json() as {snapshot:{accountId:string}};
    const executionCommand = { namespace:command.namespace, accountId:account.snapshot.accountId, clientOrderId:"v2.3-order-1", security:"600000.SH", requestedQuantity:100, bar:command.bar };
    const execute = async () => { const authorizationResponse = await fetch(`${governanceUrl}/internal/v1/authorizations`, { method:"POST", headers:{"content-type":"application/json","x-stockquant-service-id":"historical-replay-worker"}, body:JSON.stringify({ namespace:command.namespace, accountId:account.snapshot.accountId, environmentMode:"BACKTEST", brokerMode:"FAKE", command:executionCommand }) }); if (!authorizationResponse.ok) throw new Error(`governance authorization failed: ${authorizationResponse.status}`); const authorization = await authorizationResponse.json() as { authorizationId:string }; return fetch(`${executionUrl}/internal/v1/historical-orders/execute`,{method:"POST",headers:{"content-type":"application/json","x-stockquant-service-id":"platform-api-service"},body:JSON.stringify({...executionCommand, authorizationId:authorization.authorizationId})}); };
    const first = await execute(); if (!first.ok) throw new Error(`execution failed: ${first.status}`);
    const execution = await first.json() as any;
    const recovery = command.scenarioId === "recovery" ? await execute().then(async r => { if (!r.ok) throw new Error(`recovery execution failed: ${r.status}`); return r.json(); }) : null;
    const snapshotResponse = await fetch(`${portfolioUrl}/internal/v1/accounts/${account.snapshot.accountId}/snapshot`,{headers:{"x-stockquant-service-id":"platform-api-service","x-stockquant-owner-id":command.ownerId}});
    if (!snapshotResponse.ok) throw new Error(`portfolio snapshot failed: ${snapshotResponse.status}`);
    const snapshot = await snapshotResponse.json();
    const researchResponse = await fetch(`${quantResearchUrl}/v1/research/multi-bar`, { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ runId:command.testRunId, bars:[command.bar], executions:[execution] }) });
    if (!researchResponse.ok) throw new Error(`quant research runtime failed: ${researchResponse.status}`);
    const result={accountId:account.snapshot.accountId,execution,executionCommand,recovery,snapshot,research:await researchResponse.json(),replayedRun:false};
    await pool.query("UPDATE replay_worker_runs SET status='COMPLETED', result=$2::jsonb, completed_at=now() WHERE test_run_id=$1",[command.testRunId,JSON.stringify(result)]);
    return result;
  } catch(error) { await pool.query("UPDATE replay_worker_runs SET status='FAILED', completed_at=now() WHERE test_run_id=$1",[command.testRunId]); throw error; }
}
async function startMulti(command: MultiCommand) {
  const found = await pool.query<any>("SELECT * FROM replay_worker_runs WHERE test_run_id=$1", [command.testRunId]);
  if (found.rowCount === 1 && found.rows[0].status === "COMPLETED") return { ...found.rows[0].result, replayedRun: true };
  let checkpoint = checkpointForBars(command.bars, command.seed);
  await pool.query(`INSERT INTO replay_worker_runs (test_run_id,namespace,owner_id,scenario_id,status,checkpoint) VALUES ($1,$2,$3,$4,'RUNNING',$5::jsonb) ON CONFLICT (test_run_id) DO UPDATE SET status='RUNNING',checkpoint=EXCLUDED.checkpoint`, [command.testRunId, command.namespace, command.ownerId, command.scenarioId, JSON.stringify(checkpoint)]);
  try {
    const initialized = await fetch(`${portfolioUrl}/internal/v1/accounts/initialize`, { method:"POST", headers:{"content-type":"application/json","x-stockquant-service-id":"historical-replay-worker"}, body:JSON.stringify({fixtureAccountRef:"v2.3-replay-cash-1",ownerId:command.ownerId,market:"CN_A",environmentMode:"BACKTEST",brokerMode:"FAKE",initialCash:{amount:"10000.0000",currency:"CNY"},namespace:command.namespace,testRunId:command.testRunId,idempotencyKey:`initialize-${command.testRunId}`}) });
    if (!initialized.ok) throw new Error(`portfolio initialization failed: ${initialized.status}`);
    const account = await initialized.json() as { snapshot:{accountId:string} };
    const executions: any[] = [];
    for (let index = checkpoint.cursor; index < command.bars.length; index += 1) {
      const bar = command.bars[index];
      const executionCommand = { namespace:command.namespace, accountId:account.snapshot.accountId, clientOrderId:`v2.3-order-${index + 1}`, security:"600000.SH", requestedQuantity:100, bar };
      const authorizationResponse = await fetch(`${governanceUrl}/internal/v1/authorizations`, { method:"POST", headers:{"content-type":"application/json","x-stockquant-service-id":"historical-replay-worker"}, body:JSON.stringify({namespace:command.namespace,accountId:account.snapshot.accountId,environmentMode:"BACKTEST",brokerMode:"FAKE",command:executionCommand}) });
      if (!authorizationResponse.ok) throw new Error(`governance authorization failed: ${authorizationResponse.status}`);
      const authorization = await authorizationResponse.json() as { authorizationId:string };
      const response = await fetch(`${executionUrl}/internal/v1/historical-orders/execute`, { method:"POST", headers:{"content-type":"application/json","x-stockquant-service-id":"platform-api-service"}, body:JSON.stringify({...executionCommand,authorizationId:authorization.authorizationId}) });
      if (!response.ok) throw new Error(`execution failed: ${response.status} ${await response.text()}`);
      executions.push(await response.json());
      checkpoint = checkpointForBars(command.bars, command.seed, index + 1, executions.map((_, completed) => `v2.3-order-${completed + 1}`));
      await pool.query("UPDATE replay_worker_runs SET checkpoint=$2::jsonb WHERE test_run_id=$1", [command.testRunId, JSON.stringify(checkpoint)]);
    }
    const snapshotResponse = await fetch(`${portfolioUrl}/internal/v1/accounts/${account.snapshot.accountId}/snapshot`, { headers:{"x-stockquant-service-id":"platform-api-service","x-stockquant-owner-id":command.ownerId} });
    if (!snapshotResponse.ok) throw new Error(`portfolio snapshot failed: ${snapshotResponse.status}`);
    const researchResponse = await fetch(`${quantResearchUrl}/v1/research/multi-bar`, { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ runId:command.testRunId, bars:command.bars, executions }) });
    if (!researchResponse.ok) throw new Error(`quant research runtime failed: ${researchResponse.status}`);
    const result = { accountId:account.snapshot.accountId, executions, checkpoint, snapshot:await snapshotResponse.json(), research:await researchResponse.json(), replayedRun:false };
    await pool.query("UPDATE replay_worker_runs SET status='COMPLETED',result=$2::jsonb,completed_at=now() WHERE test_run_id=$1", [command.testRunId, JSON.stringify(result)]);
    return result;
  } catch (error) { await pool.query("UPDATE replay_worker_runs SET status='FAILED',completed_at=now() WHERE test_run_id=$1", [command.testRunId]); throw error; }
}
async function recoverUnknown(testRunId: string) {
  const found = await pool.query<any>("SELECT result FROM replay_worker_runs WHERE test_run_id=$1", [testRunId]);
  if (found.rowCount !== 1 || !found.rows[0].result) throw new Error("replay result is not available");
  const current = found.rows[0].result as any;
  const orderId = current.execution?.result?.orderId;
  if (!orderId) throw new Error("replay result has no original order");
  const queried = await fetch(`${executionUrl}/internal/v1/orders/${orderId}`, { headers: { "x-stockquant-service-id": "platform-api-service" } });
  if (!queried.ok) throw new Error(`original order query failed: ${queried.status}`);
  const order = await queried.json() as { status: string };
  if (order.status !== "UNKNOWN") return { ...current, unknownRecovery: { observedStatus: order.status, action: "NO_RETRY_REQUIRED" } };
  const result = { ...current, unknownRecovery: { observedStatus: order.status, action: "MANUAL_REVIEW_REQUIRED", reason: "original order remains UNKNOWN; no resend was attempted" } };
  await pool.query("UPDATE replay_worker_runs SET result=$2::jsonb, status='COMPLETED', completed_at=now() WHERE test_run_id=$1", [testRunId, JSON.stringify(result)]);
  return result;
}
createServer(async(req,res)=>{
  if(req.method==="GET"&&req.url==="/live")return json(res,200,{status:"live",service:"historical-replay-worker"});
  if(req.method==="GET"&&req.url==="/ready"){try{await pool.query("SELECT 1");return json(res,200,{status:"ready",service:"historical-replay-worker"});}catch{return json(res,503,{status:"unavailable"});}}
  const recoveryMatch = req.url?.match(/^\/internal\/v1\/replays\/([^/]+)\/recover-unknown$/);
  if (req.method === "POST" && recoveryMatch) { try { return json(res, 200, await recoverUnknown(recoveryMatch[1])); } catch (error) { return json(res, 422, { error: error instanceof Error ? error.message : "invalid recovery" }); } }
  if (req.method === "POST" && req.url === "/internal/v1/replays/multi") {
    if(req.headers["x-stockquant-service-id"]!==allowedService)return json(res,403,{error:"service identity is not allowed"});
    let body="";for await(const chunk of req)body+=chunk;try{return json(res,200,await startMulti(JSON.parse(body) as MultiCommand));}catch(error){return json(res,422,{error:error instanceof Error?error.message:"invalid multi-bar replay"});}
  }
  if(req.method!=="POST"||req.url!=="/internal/v1/replays")return json(res,404,{error:"not found"});
  if(req.headers["x-stockquant-service-id"]!==allowedService)return json(res,403,{error:"service identity is not allowed"});
  let body="";for await(const chunk of req)body+=chunk;try{return json(res,200,await start(JSON.parse(body) as Command));}catch(error){return json(res,422,{error:error instanceof Error?error.message:"invalid replay"});}
}).listen(port,process.env.STOCKQUANT_BIND_HOST??"127.0.0.1");

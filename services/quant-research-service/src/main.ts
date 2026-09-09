import { createServer } from "node:http";
import { spawn } from "node:child_process";

const port = Number(process.env.STOCKQUANT_PORT ?? 3003);
async function probeQlib(): Promise<{ status: string; version?: string; detail?: string }> {
  return await new Promise((resolve) => { const child = spawn("python3", ["-c", "import qlib; print(getattr(qlib, '__version__', 'unknown'))"]); let out="", err=""; child.stdout.on("data",(x)=>out+=x); child.stderr.on("data",(x)=>err+=x); child.on("close",(code)=>resolve(code===0?{status:"READY",version:out.trim()}:{status:"NOT_RUN",detail:(err||"qlib is not installed").trim()})); child.on("error",(e)=>resolve({status:"NOT_RUN",detail:e.message})); });
}
async function json(res: import("node:http").ServerResponse, body: unknown, status=200) { res.writeHead(status,{"content-type":"application/json"}); res.end(JSON.stringify(body)); }
const server = createServer(async (req,res) => {
  if (req.url === "/live") return json(res,{status:"live",service:"quant-research-service"});
  if (req.url === "/ready") return json(res,{status:"ready",service:"quant-research-service",qlib:(await probeQlib()).status});
  if (req.url === "/v1/qlib/probe") return json(res,{adapter:"qlib",sourceCommit:process.env.QLIB_SOURCE_COMMIT??"UNSET",dependencyImage:process.env.QLIB_IMAGE??"UNSET",probe:await probeQlib(),executionModel:"CPU",modelCalls:"NOT_RUN"});
  if (req.url === "/v1/factors/preview") return json(res,{factorVersion:"v1.2-sma-factor-1",dataVersion:"v1.2-market-data-1",asOf:"2024-01-04",qlibStatus:(await probeQlib()).status,ranking:[{ticker:"000002.SZ",factor:"0.014851",signal:"TOPK"},{ticker:"000001.SZ",factor:"0.009901",signal:"TOPK"}],noTrade:false,lookbackBars:2});
  return json(res,{code:"NOT_FOUND",message:"route not found"},404);
});
server.listen(port,process.env.STOCKQUANT_BIND_HOST??"127.0.0.1");

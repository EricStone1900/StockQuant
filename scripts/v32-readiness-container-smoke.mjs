import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";

const suffix = randomUUID().replaceAll("-", "");
const network = `sq-v32-smoke-${suffix}`;
const database = `sq-v32-db-${suffix}`;
const platform = `sq-v32-api-${suffix}`;
const image = `stockquant-v32-readiness-smoke:${suffix}`;
const postgresImage = "postgres:16.9-alpine@sha256:7c688148e5e156d0e86df7ba8ae5a05a2386aaec1e2ad8e6d11bdf10504b1fb7";
const postgresImageId = docker(["image", "inspect", "--format", "{{.Id}}", postgresImage], { quiet: true });
const adminPassword = randomBytes(36).toString("base64url");
const platformToken = randomBytes(48).toString("base64url");
let createdRunId = null;
const buildArgs = ["buildx", "build", "--load", "--platform", "linux/amd64", "--tag", image, "--file", "services/platform-api-service/Dockerfile", "."];

function docker(args, { encoding = "utf8", quiet = false, suppressStderr = false, allowFailure = false } = {}) {
  try {
    const output = execFileSync("docker", args, { encoding, stdio: quiet ? ["ignore", "pipe", "pipe"] : "inherit", timeout: 240_000 });
    return output?.toString().trim() ?? "";
  } catch (error) {
    if (allowFailure) return "";
    if (quiet && !suppressStderr && error.stderr) process.stderr.write(error.stderr.toString());
    throw error;
  }
}

function runPlatform() {
  docker(["run", "--detach", "--name", platform, "--platform", "linux/amd64", "--network", network,
    "--read-only", "--tmpfs", "/tmp:rw,nosuid,nodev,size=128m", "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--pids-limit", "128",
    "--env", `STOCKQUANT_DATABASE_URL=postgresql://postgres:${adminPassword}@${database}:5432/postgres`,
    "--env", `STOCKQUANT_SERVICE_TOKEN_PLATFORM_API=${platformToken}`,
    "--env", "STOCKQUANT_BIND_HOST=0.0.0.0", "--env", "STOCKQUANT_PORT=3000",
    "--env", "STOCKQUANT_LOCAL_DEVELOPMENT_USER=acceptance-owner-1",
    "--env", "STOCKQUANT_TEST_IDENTITY_HEADER_ENABLED=false",
    "--env", "STOCKQUANT_LIVE_TRADING_ENABLED=false", "--env", "STOCKQUANT_BROKER_MODE=FAKE", "--env", "STOCKQUANT_V24_AUTO_START=false", image]);
}

function requestInContainer(program) {
  const output = docker(["exec", platform, "node", "--input-type=module", "-e", program], { quiet: true, suppressStderr: true });
  return JSON.parse(output);
}

async function waitForLive() {
  const program = `const r=await fetch('http://127.0.0.1:3000/live'); console.log(JSON.stringify({status:r.status,body:await r.json()})); if(r.status!==200) process.exit(2);`;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const exited = docker(["inspect", "--format", "{{.State.Running}}", platform], { quiet: true, allowFailure: true });
    if (exited !== "true") throw new Error("Platform container exited before /live became available");
    try { return requestInContainer(program); } catch { await new Promise((resolve) => setTimeout(resolve, 250)); }
  }
  throw new Error("Platform /live did not become available within 20 seconds");
}

const apiProgram = `const base='http://127.0.0.1:3000/api/v1/acceptance/v3/v3.2/runs';const headers={cookie:'sq_session=acceptance-owner-1','content-type':'application/json'};const createdResponse=await fetch(base,{method:'POST',headers,body:JSON.stringify({scenarioId:'recovery',seed:19})});const created=await createdResponse.json();if(createdResponse.status!==202||typeof created.testRunId!=='string'||created.status!=='WAITING'||created.evidence?.sourceMode!=='READINESS_ONLY'||created.evidence?.businessValidation!=='NOT_RUN')throw Error('readiness TestRun create assertion failed: '+JSON.stringify({status:createdResponse.status,created}));const readResponse=await fetch(base+'/'+created.testRunId,{headers:{cookie:'sq_session=acceptance-owner-1'}});const read=await readResponse.json();if(readResponse.status!==200||read.testRunId!==created.testRunId||read.status!=='WAITING')throw Error('same-owner TestRun read assertion failed');const anonymous=await fetch(base+'/'+created.testRunId);if(anonymous.status!==401)throw Error('anonymous read was not rejected');const crossOwner=await fetch(base+'/'+created.testRunId,{headers:{cookie:'sq_session=other-user'}});if(crossOwner.status!==403)throw Error('cross-owner read was not rejected');console.log(JSON.stringify({testRunId:created.testRunId,status:created.status,scenarioId:created.scenarioId,sourceMode:created.evidence.sourceMode,businessValidation:created.evidence.businessValidation,registryMutation:created.evidence.registryMutation,paperCalls:created.evidence.paperCalls,sameOwnerRead:readResponse.status,anonymousRead:anonymous.status,crossOwnerRead:crossOwner.status}));`;

try {
  docker(["buildx", "build", "--load", "--platform", "linux/amd64", "--tag", image, "--file", "services/platform-api-service/Dockerfile", "."]);
  docker(["network", "create", "--internal", network]);
  docker(["run", "--detach", "--name", database, "--network", network, "--network-alias", database,
    "--tmpfs", "/var/lib/postgresql/data:rw,nosuid,nodev,size=512m", "--env", "POSTGRES_USER=postgres", "--env", `POSTGRES_PASSWORD=${adminPassword}`,
    "--env", "POSTGRES_DB=postgres", "--env", "POSTGRES_INITDB_ARGS=--auth-host=scram-sha-256", postgresImageId]);
  let databaseReady = false;
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try { docker(["exec", database, "pg_isready", "-U", "postgres", "-d", "postgres"], { quiet: true }); databaseReady = true; break; }
    catch { await new Promise((resolve) => setTimeout(resolve, 250)); }
  }
  assert.equal(databaseReady, true, "isolated PostgreSQL did not become ready");

  runPlatform();
  const live = await waitForLive();
  assert.equal(live.status, 200);
  const dependenciesReady = requestInContainer("const r=await fetch('http://127.0.0.1:3000/ready'); console.log(JSON.stringify({status:r.status,body:await r.json()}));");
  assert.equal(dependenciesReady.status, 503, "isolated smoke has no Portfolio/Execution/Replay dependencies; readiness must fail closed");
  const firstRun = requestInContainer(apiProgram);
  assert.equal(firstRun.status, "WAITING");
  createdRunId = firstRun.testRunId;

  docker(["stop", platform]);
  docker(["rm", platform]);
  runPlatform();
  await waitForLive();
  const persisted = requestInContainer(`const r=await fetch('http://127.0.0.1:3000/api/v1/acceptance/v3/v3.2/runs/${createdRunId}',{headers:{cookie:'sq_session=acceptance-owner-1'}});const value=await r.json();console.log(JSON.stringify({status:r.status,testRunId:value.testRunId,runStatus:value.status,sourceMode:value.evidence?.sourceMode,businessValidation:value.evidence?.businessValidation}));if(r.status!==200||value.testRunId!=='${createdRunId}'||value.status!=='WAITING')process.exit(2);`);
  assert.equal(persisted.testRunId, createdRunId);
  assert.equal(persisted.runStatus, "WAITING");

  console.log(JSON.stringify({ status: "PASS", scope: "linux/amd64 Platform HTTP routes backed by disposable SCRAM PostgreSQL", testRunId: createdRunId, created: firstRun, restartRead: persisted, apiReady: 200, dependencyReadinessWithoutPortfolioExecutionReplay: dependenciesReady.status, network: "internal-only", postgresStorage: "tmpfs-only", activeServicesTouched: false, registryMutation: "NOT_PERFORMED", paperCalls: 0, humanAcceptance: "NOT_RUN" }, null, 2));
} finally {
  // Names contain a fresh UUID and belong exclusively to this invocation. Always
  // attempt removal, including partial-start failures that occur before the
  // corresponding docker command reports success to the caller.
  docker(["rm", "--force", platform], { quiet: true, allowFailure: true });
  docker(["rm", "--force", database], { quiet: true, allowFailure: true });
  docker(["network", "rm", network], { quiet: true, allowFailure: true });
  docker(["image", "rm", image], { quiet: true, allowFailure: true });
}

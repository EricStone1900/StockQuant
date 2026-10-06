import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";

const image = process.env.STOCKQUANT_RESEARCH_IMAGE_REF ?? "stockquant-v31-research-openai-fixture:local";
const expectedImageId = process.env.STOCKQUANT_RESEARCH_IMAGE_ID;
const clientImage = process.env.STOCKQUANT_RUNNER_IMAGE_REF ?? "stockquant-v31-runner:rd-agent-v0.8.0-qlib-3e72593-offline-3";
const expectedClientImageId = process.env.STOCKQUANT_RUNNER_IMAGE_ID ?? "sha256:eb9030b8107c79c3554dabc68322814b81c04564bb0a1e5a9841bd603a67ccf1";
if (!expectedImageId?.startsWith("sha256:")) {
  console.error("V3.1 LiteLLM internal smoke prerequisite missing: STOCKQUANT_RESEARCH_IMAGE_ID must pin the exact locally built Research Automation image");
  process.exit(2);
}
const network = `sq-litellm-${randomUUID().replaceAll("-", "").slice(0, 16)}`;
const postgres = `${network}-postgres`;
const research = `${network}-research`;
const token = randomBytes(48).toString("base64url");
const password = randomBytes(32).toString("hex");
const serviceImage = process.env.STOCKQUANT_POSTGRES_IMAGE ?? "postgres:16.9-alpine";
const runtime = { PATH: process.env.PATH ?? "/usr/bin:/bin", HOME: "/tmp" };
const root = process.cwd();

function docker(args, { timeout = 120_000 } = {}) {
  const result = spawnSync("docker", args, { cwd: root, encoding: "utf8", timeout, env: runtime, maxBuffer: 1024 * 1024 });
  if (result.error || result.status !== 0) {
    const diagnostic = String(result.stderr ?? "").replaceAll(token, "[redacted]").replaceAll(password, "[redacted]").slice(-1800);
    throw new Error(`isolated model-gateway Docker step failed (${result.status ?? "no exit status"}): ${diagnostic}`);
  }
  return result.stdout.trim();
}

const python = String.raw`import json, os, time, urllib.request, uuid
import rdagent.oai.backend.litellm as rdagent_litellm
from rdagent.oai.backend.litellm import LiteLLMAPIBackend, LITELLM_SETTINGS
from rdagent.oai.llm_conf import LLM_SETTINGS
base="http://research:3008"
token=${JSON.stringify(token)}
def request(path, body=None, headers=None):
    data=None if body is None else json.dumps(body).encode()
    req=urllib.request.Request(base+path,data=data,headers={"Authorization":"Bearer "+token,"x-stockquant-service-id":"platform-api-service","Content-Type":"application/json",**(headers or {})},method="GET" if body is None else "POST")
    with urllib.request.urlopen(req,timeout=2) as res: return res.status,json.loads(res.read())
for attempt in range(60):
    try:
        status,ready=request("/ready")
        if status==200: break
    except Exception:
        time.sleep(0.25)
else: raise RuntimeError("isolated Research Automation service did not become ready")
experiment_id=str(uuid.uuid4())
status,experiment=request("/v1/experiments",{"fixtureId":"v3.1-research-small-sample-1","modelProfile":"UNSET","rounds":1,"budgetCurrency":"USD","budgetCents":100,"environmentMode":"RESEARCH","brokerMode":"FAKE","idempotencyKey":"litellm-"+str(uuid.uuid4())})
if status!=202: raise AssertionError("fixture experiment was not created")
experiment_id=experiment["experiment"]["experimentId"] if "experiment" in experiment else experiment["experimentId"]
assert os.environ.get("LITELLM_LOCAL_MODEL_COST_MAP", "").lower()=="true"
assert not LLM_SETTINGS.log_llm_chat_content and LLM_SETTINGS.max_retry==1 and not LLM_SETTINGS.chat_stream
assert not LLM_SETTINGS.use_chat_cache and not LLM_SETTINGS.use_embedding_cache
assert not LLM_SETTINGS.dump_chat_cache and not LLM_SETTINGS.dump_embedding_cache
assert not LITELLM_SETTINGS.log_llm_chat_content and LITELLM_SETTINGS.max_retry==1 and not LITELLM_SETTINGS.chat_stream
assert not LITELLM_SETTINGS.use_chat_cache and not LITELLM_SETTINGS.use_embedding_cache
assert not LITELLM_SETTINGS.dump_chat_cache and not LITELLM_SETTINGS.dump_embedding_cache

chat_run_id="rdagent-chat-"+str(uuid.uuid4())
embedding_run_id="rdagent-embedding-"+str(uuid.uuid4())
original_completion=rdagent_litellm.completion
original_embedding=rdagent_litellm.embedding
def budget_headers(run_id): return {"x-stockquant-service-id":"platform-api-service","x-stockquant-experiment-id":experiment_id,"x-stockquant-model-run-id":run_id,"x-stockquant-reserved-cents":"60"}
def fixture_completion(*args,**kwargs):
    kwargs.update(model="openai/stockquant-fixture",api_base=base+"/v1/model-gateway/fixture/openai/v1",api_key=token,extra_headers=budget_headers(chat_run_id),max_retries=0,stream=False)
    return original_completion(*args,**kwargs)
def fixture_embedding(*args,**kwargs):
    kwargs.update(model="openai/stockquant-fixture",api_base=base+"/v1/model-gateway/fixture/openai/v1",api_key=token,extra_headers=budget_headers(embedding_run_id),max_retries=0)
    return original_embedding(*args,**kwargs)
rdagent_litellm.completion=fixture_completion
rdagent_litellm.embedding=fixture_embedding
backend=LiteLLMAPIBackend(use_chat_cache=False,dump_chat_cache=False,use_embedding_cache=False,dump_embedding_cache=False)
chat_content=backend.build_messages_and_create_chat_completion("fixed fixture prompt")
embedding=backend.create_embedding(["fixture alpha","fixture beta"])
if not isinstance(embedding,list) or len(embedding)!=2 or embedding[0]!=[0.125,-0.25,0.5]: raise AssertionError("RD-Agent embedding backend did not return the fixed fixture vectors")
chat_result={"experimentId":experiment_id,"modelRunId":chat_run_id,"content":chat_content}
embedding_result={"count":len(embedding),"embedding":embedding[0],"modelRunId":embedding_run_id}
result={"chat":chat_result,"embedding":embedding_result,"experimentId":experiment_id,"modelRunIds":[chat_run_id,embedding_run_id],"backend":"rdagent.oai.backend.litellm.LiteLLMAPIBackend"}
print(json.dumps(result,sort_keys=True))`;

let networkCreated = false;
let postgresCreated = false;
let researchCreated = false;
try {
  const serviceImageId = docker(["image", "inspect", image, "--format", "{{.Id}}"]);
  assert.equal(serviceImageId, expectedImageId, "Research Automation image digest mismatch");
  assert.equal(docker(["image", "inspect", clientImage, "--format", "{{.Id}}"]), expectedClientImageId, "pinned LiteLLM runtime image digest mismatch");

  docker(["network", "create", "--internal", "--label", "com.stockquant.purpose=v31-litellm-fixture-smoke", network]);
  networkCreated = true;
  const networkInfo = JSON.parse(docker(["network", "inspect", network]))[0];
  assert.equal(networkInfo.Internal, true, "test network must have external routing disabled");

  docker(["run", "--detach", "--name", postgres, "--pull", "never", "--network", network, "--network-alias", "postgres",
    "--read-only", "--tmpfs", "/var/lib/postgresql/data:rw,nosuid,nodev,size=512m", "--tmpfs", "/run/postgresql:rw,nosuid,nodev,size=64m",
    "--pids-limit", "128", "--memory", "1g", "--cpus", "1", "--env", `POSTGRES_PASSWORD=${password}`,
    "--env", "POSTGRES_HOST_AUTH_METHOD=scram-sha-256", "--env", "POSTGRES_INITDB_ARGS=--auth-host=scram-sha-256", serviceImage]);
  postgresCreated = true;
  let pgReady = false;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { docker(["exec", postgres, "pg_isready", "-U", "postgres"], { timeout: 5000 }); pgReady = true; break; }
    catch { await new Promise(resolve => setTimeout(resolve, 250)); }
  }
  assert.equal(pgReady, true, "temporary PostgreSQL did not become ready");

  docker(["run", "--detach", "--name", research, "--pull", "never", "--network", network, "--network-alias", "research",
    "--read-only", "--tmpfs", "/tmp:rw,noexec,nosuid,size=64m", "--cap-drop", "ALL", "--security-opt", "no-new-privileges",
    "--pids-limit", "128", "--memory", "1g", "--cpus", "1", "--env", "NODE_ENV=test", "--env", "STOCKQUANT_BIND_HOST=0.0.0.0",
    "--env", "STOCKQUANT_PORT=3008", "--env", `STOCKQUANT_DATABASE_URL=postgresql://postgres:${password}@postgres:5432/postgres`,
    "--env", "STOCKQUANT_ENVIRONMENT_MODE=RESEARCH", "--env", "STOCKQUANT_BROKER_MODE=FAKE", "--env", "STOCKQUANT_LIVE_TRADING_ENABLED=false",
    "--env", "STOCKQUANT_RUNNER_MODE=NOT_CONFIGURED", "--env", "STOCKQUANT_MODEL_GATEWAY_MODE=NOT_CONFIGURED",
    "--env", "STOCKQUANT_MODEL_GATEWAY_TEST_FIXTURE=true", "--env", "STOCKQUANT_RESEARCH_OUTBOUND_POLICY=DENY",
    "--env", `STOCKQUANT_SERVICE_TOKEN_PLATFORM_API=${token}`, "--env", "STOCKQUANT_RESEARCH_ARTIFACT_ROOT=/tmp/artifacts", image]);
  researchCreated = true;

  const client = docker(["run", "--rm", "--pull", "never", "--platform", "linux/amd64", "--network", network,
    "--read-only", "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--pids-limit", "128", "--memory", "2g", "--cpus", "2",
    "--user", "10001:10001", "--workdir", "/tmp", "--tmpfs", "/tmp:rw,noexec,nosuid,size=64m",
    "--env", "LITELLM_LOCAL_MODEL_COST_MAP=True", "--env", "LOG_LLM_CHAT_CONTENT=false", "--env", "MAX_RETRY=1",
    "--env", "USE_CHAT_CACHE=false", "--env", "USE_EMBEDDING_CACHE=false", "--env", "DUMP_CHAT_CACHE=false", "--env", "DUMP_EMBEDDING_CACHE=false", "--env", "CHAT_STREAM=false",
    "--env", "LITELLM_LOG_LLM_CHAT_CONTENT=false", "--env", "LITELLM_MAX_RETRY=1", "--env", "LITELLM_USE_CHAT_CACHE=false", "--env", "LITELLM_USE_EMBEDDING_CACHE=false",
    "--env", "LITELLM_DUMP_CHAT_CACHE=false", "--env", "LITELLM_DUMP_EMBEDDING_CACHE=false", "--env", "LITELLM_CHAT_STREAM=false",
    "--entrypoint", "python", clientImage, "-c", python]);
  const result = JSON.parse(client.split(/\r?\n/u).at(-1));
  assert.equal(result.backend, "rdagent.oai.backend.litellm.LiteLLMAPIBackend");
  assert.equal(result.chat.content, "deterministic fixture response");
  assert.equal(result.embedding.count, 2);
  assert.deepEqual(result.embedding.embedding, [0.125, -0.25, 0.5]);
  const row = docker(["exec", postgres, "psql", "-U", "postgres", "-d", "postgres", "-At", "-F", "|", "-c",
    `SELECT string_agg(status,',' ORDER BY model_run_id)||'|'||SUM(requested_cents)||'|'||SUM(reserved_cents)||'|'||SUM(spent_cents)||'|'||COUNT(*)||'|'||string_agg(provider_evidence->>'inputTokens',',' ORDER BY model_run_id)||'|'||string_agg(provider_evidence->>'outputTokens',',' ORDER BY model_run_id) FROM research_model_call_budgets WHERE experiment_id='${result.experimentId}'`]);
  assert.equal(row, "SETTLED,SETTLED|120|120|46|2|12,8|8,0", "RD-Agent chat/embedding usage and Fixture settlement must persist in distinct budget rows");
  console.log(JSON.stringify({ status: "PASS", externalProviderCalls: 0, network: "internal-only", client: "pinned RD-Agent/LiteLLM dependency image", imageId: serviceImageId, ...result, budgetRows: row }));
} finally {
  if (researchCreated) spawnSync("docker", ["rm", "--force", research], { encoding: "utf8", timeout: 10_000, env: runtime });
  if (postgresCreated) spawnSync("docker", ["rm", "--force", postgres], { encoding: "utf8", timeout: 10_000, env: runtime });
  if (networkCreated) spawnSync("docker", ["network", "rm", network], { encoding: "utf8", timeout: 10_000, env: runtime });
}

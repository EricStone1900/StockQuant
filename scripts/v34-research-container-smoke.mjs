import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";

const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
const tag = `stockquant-v34-research:smoke-${suffix}`;
const network = `stockquant-v34-research-${suffix}`;
const serviceName = `${network}-api`;
const probeName = `${network}-probe`;
const nodeImage = "node:24.1.0-alpine";
const platform = process.env.STOCKQUANT_RESEARCH_CONTAINER_PLATFORM ?? "linux/amd64";
if (platform !== "linux/amd64" && platform !== "linux/arm64") throw new Error("STOCKQUANT_RESEARCH_CONTAINER_PLATFORM must be linux/amd64 or linux/arm64");
const platformToken = `platform-${randomUUID()}-${randomUUID()}`;
const runnerToken = `runner-${randomUUID()}-${randomUUID()}`;
const testRunId = randomUUID();
let imageBuilt = false;
let networkCreated = false;
const containers = [];

function docker(args, { quiet = false } = {}) {
  const result = spawnSync("docker", args, { cwd: process.cwd(), encoding: "utf8", timeout: 240_000, maxBuffer: 8 * 1024 * 1024, stdio: quiet ? ["pipe", "pipe", "pipe"] : "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`docker ${args[0]} failed (${result.status ?? "no exit status"})${quiet ? `: ${result.stderr?.trim()}` : "; see Docker output above"}`);
  return result.stdout?.trim() ?? "";
}

const probe = String.raw`
const base = "http://research-automation:3008";
const platformToken = process.env.PROBE_PLATFORM_TOKEN;
const runnerToken = process.env.PROBE_RUNNER_TOKEN;
const testRunId = process.env.PROBE_TEST_RUN_ID;
async function request(path, { token, service, body } = {}) {
  const response = await fetch(base + path, { method: body ? "POST" : "GET", headers: { ...(token ? { authorization: "Bearer " + token } : {}), ...(service ? { "x-stockquant-service-id": service } : {}), ...(body ? { "content-type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { status: response.status, body: await response.json() };
}
let ready;
for (let i = 0; i < 40; i++) { try { ready = await request("/ready"); if (ready.status === 200) break; } catch {} await new Promise(r => setTimeout(r, 250)); }
if (ready?.status !== 200) throw new Error("research service did not become ready");
const config = ready.body;
if (config.environmentMode !== "RESEARCH" || config.brokerMode !== "FAKE" || config.runner !== "NOT_CONFIGURED" || config.modelGateway !== "NOT_CONFIGURED" || config.outboundPolicy !== "DENY" || config.budgetPersistence !== "MEMORY" || config.prerequisiteStatus !== "PENDING_PREREQUISITES") throw new Error("unsafe or unexpected research service configuration: " + JSON.stringify(config));
const unauthenticated = await request("/v1/experiments", { body: {} });
if (unauthenticated.status !== 401) throw new Error("missing credentials were not denied: " + JSON.stringify(unauthenticated));
const wrongToken = await request("/v1/experiments", { token: runnerToken, service: "runner-host", body: {} });
if (wrongToken.status !== 403) throw new Error("Runner identity was not denied experiment creation: " + JSON.stringify(wrongToken));
const experimentResponse = await request("/v1/experiments", { token: platformToken, service: "platform-api-service", body: { testRunId, fixtureId: "v3.4-research-arm64-container-smoke", modelProfile: "UNSET", rounds: 1, budgetCurrency: "USD", budgetCents: 25, environmentMode: "RESEARCH", brokerMode: "FAKE", idempotencyKey: "v34-container-" + testRunId } });
if (experimentResponse.status !== 202 || experimentResponse.body.status !== "PENDING_PREREQUISITES" || experimentResponse.body.testRunId !== testRunId || experimentResponse.body.budget?.status !== "RESERVED") throw new Error("experiment/TestRun budget reservation did not match: " + JSON.stringify(experimentResponse));
const experiment = experimentResponse.body;
const namespace = "research/" + testRunId + "/" + experiment.experimentId;
const job = { schemaVersion: "v3.1-runner-job-v1", testRunId, experimentId: experiment.experimentId, imageDigest: "sha256:" + "b".repeat(64), inputArtifact: namespace + "/inputs/" + "a".repeat(64), outputNamespace: namespace + "/outputs", resources: { cpuMilli: 500, memoryMiB: 512, timeoutSeconds: 30, pidsLimit: 32 }, networkPolicy: { mode: "DENY", allowlist: [] } };
const deniedDispatch = await request("/v1/runner/jobs", { token: runnerToken, service: "runner-host", body: job });
if (deniedDispatch.status !== 403) throw new Error("Runner Host was able to dispatch a job: " + JSON.stringify(deniedDispatch));
const queueResponse = await request("/v1/runner/jobs?testRunId=" + testRunId + "&offset=0&limit=10", { token: platformToken, service: "platform-api-service" });
if (queueResponse.status !== 200 || queueResponse.body.jobs?.length !== 0) throw new Error("unauthorized dispatch changed the queue: " + JSON.stringify(queueResponse));
const dispatch = await request("/v1/runner/jobs", { token: platformToken, service: "platform-api-service", body: job });
if (dispatch.status !== 202 || dispatch.body.status !== "QUEUED" || dispatch.body.execution !== "NOT_STARTED" || dispatch.body.prerequisiteStatus !== "PENDING_PREREQUISITES") throw new Error("authorized preparation did not remain queued and unexecuted: " + JSON.stringify(dispatch));
const finalQueue = await request("/v1/runner/jobs?testRunId=" + testRunId + "&offset=0&limit=10", { token: platformToken, service: "platform-api-service" });
if (finalQueue.status !== 200 || finalQueue.body.jobs?.length !== 1) throw new Error("expected a single queued job: " + JSON.stringify(finalQueue));
console.log(JSON.stringify({ status: "PASS", testRunId, environmentMode: config.environmentMode, brokerMode: config.brokerMode, budgetPersistence: config.budgetPersistence, experimentStatus: experiment.status, budgetStatus: experiment.budget.status, missingCredentials: unauthenticated.status, runnerCannotCreateExperiment: wrongToken.status, runnerCannotDispatch: deniedDispatch.status, queueAfterDeniedDispatch: 0, platformPreparation: dispatch.body.status, execution: dispatch.body.execution, prerequisiteStatus: dispatch.body.prerequisiteStatus, runner: config.runner, modelGateway: config.modelGateway, outboundPolicy: config.outboundPolicy, network: "INTERNAL_ONLY" }));
`;

try {
  docker(["buildx", "build", "--platform", platform, "--load", "--tag", tag, "--file", "services/research-automation-service/Dockerfile", "."]);
  imageBuilt = true;
  const inspect = docker(["image", "inspect", tag, "--format", "{{.Id}} {{.Os}}/{{.Architecture}}"], { quiet: true });
  if (!new RegExp(`^sha256:[a-f0-9]{64} ${platform.replaceAll("/", "\\/")}$`, "u").test(inspect)) throw new Error(`research image platform mismatch: ${inspect}`);
  docker(["network", "create", "--internal", network], { quiet: true });
  networkCreated = true;
  docker(["run", "--detach", "--name", serviceName, "--network", network, "--network-alias", "research-automation", "--read-only", "--tmpfs", "/tmp:size=16m,mode=1777", "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--pids-limit", "64", "--env", "STOCKQUANT_BIND_HOST=0.0.0.0", "--env", "STOCKQUANT_ENVIRONMENT_MODE=RESEARCH", "--env", "STOCKQUANT_BROKER_MODE=FAKE", "--env", "STOCKQUANT_LIVE_TRADING_ENABLED=false", "--env", "STOCKQUANT_RUNNER_MODE=NOT_CONFIGURED", "--env", "STOCKQUANT_MODEL_GATEWAY_MODE=NOT_CONFIGURED", "--env", "STOCKQUANT_RESEARCH_OUTBOUND_POLICY=DENY", "--env", `STOCKQUANT_SERVICE_TOKEN_PLATFORM_API=${platformToken}`, "--env", `STOCKQUANT_SERVICE_TOKEN_RUNNER_HOST=${runnerToken}`, tag], { quiet: true });
  containers.push(serviceName);
  docker(["run", "--rm", "--network", network, "--read-only", "--tmpfs", "/tmp:size=8m,mode=1777", "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--pids-limit", "32", "--env", `PROBE_PLATFORM_TOKEN=${platformToken}`, "--env", `PROBE_RUNNER_TOKEN=${runnerToken}`, "--env", `PROBE_TEST_RUN_ID=${testRunId}`, "--entrypoint", "node", nodeImage, "--input-type=module", "-e", probe]);
} finally {
  for (const container of containers) spawnSync("docker", ["rm", "--force", container], { stdio: "ignore", timeout: 15_000 });
  if (networkCreated) spawnSync("docker", ["network", "rm", network], { stdio: "ignore", timeout: 15_000 });
  if (imageBuilt) spawnSync("docker", ["image", "rm", "--force", tag], { stdio: "ignore", timeout: 15_000 });
}

import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";

const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
const tag = `stockquant-v34-web:smoke-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${suffix}`;
const network = `stockquant-v34-web-smoke-${suffix}`;
const apiName = `${network}-api`;
const webName = `${network}-web`;
const runnerName = `${network}-probe`;
const nodeImage = "node:24.1.0-alpine";
const targetPlatform = process.env.STOCKQUANT_WEB_CONTAINER_PLATFORM ?? "linux/amd64";
if (targetPlatform !== "linux/amd64" && targetPlatform !== "linux/arm64") throw new Error("STOCKQUANT_WEB_CONTAINER_PLATFORM must be linux/amd64 or linux/arm64");
const networkContainers = [];
let imageBuilt = false;

function docker(args, { quiet = false, input } = {}) {
  const result = spawnSync("docker", args, {
    cwd: process.cwd(),
    encoding: "utf8",
    input,
    timeout: 180_000,
    maxBuffer: 8 * 1024 * 1024,
    stdio: quiet ? ["pipe", "pipe", "pipe"] : "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = quiet ? result.stderr?.trim() : "see Docker output above";
    throw new Error(`docker ${args[0]} failed (${result.status ?? "no exit status"}): ${detail}`);
  }
  return result.stdout?.trim() ?? "";
}

const apiProgram = `const http=require("node:http");http.createServer((req,res)=>{res.setHeader("content-type","application/json");if(req.url!=="/api/v1/session"){res.statusCode=404;res.end(JSON.stringify({error:"unexpected mock route"}));return}res.end(JSON.stringify({marker:"V34_CONTAINER_WEB_PROXY_SMOKE",ownerId:"isolated-smoke-owner"}))}).listen(3000,"0.0.0.0")`;
const probeProgram = String.raw`
const http = await import("node:http");
function get(path) {
  return new Promise((resolve, reject) => {
    const request = http.request({ hostname: "web", port: 8080, path, method: "GET", headers: { Host: "localhost:8080" } }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks).toString("utf8") }));
    });
    request.setTimeout(3000, () => request.destroy(new Error("request timeout")));
    request.on("error", reject);
    request.end();
  });
}
let page;
let lastError;
for (let attempt = 0; attempt < 20; attempt += 1) {
  try {
    page = await get("/acceptance/v3/v3.3");
    if (page.status === 200) break;
  } catch (error) { lastError = error.message; }
  await new Promise((resolve) => setTimeout(resolve, 200));
}
if (page?.status !== 200) throw new Error("container Web deep route did not become ready (status=" + (page?.status ?? "none") + ", error=" + (lastError ?? "none") + ", body=" + (page?.body.slice(0, 160) ?? "none") + ")");
const html = page.body;
const jsPath = html.match(/src="([^"]+\.js)"/)?.[1];
const cssPath = html.match(/href="([^"]+\.css)"/)?.[1];
if (!jsPath || !cssPath) throw new Error("built Web entry is missing JS/CSS assets");
const [js, css] = await Promise.all([get(jsPath), get(cssPath)]);
if (js.status !== 200 || css.status !== 200) throw new Error("container Web static asset failed");
const api = await get("/api/v1/session");
const payload = JSON.parse(api.body);
if (api.status !== 200 || payload.marker !== "V34_CONTAINER_WEB_PROXY_SMOKE") throw new Error("container Web API proxy did not reach the isolated mock Platform API");
console.log(JSON.stringify({ status: "PASS", deepRoute: page.status, javascript: js.status, stylesheet: css.status, apiProxy: api.status, apiMarker: payload.marker, externalNetwork: "DISABLED", activeServices: "NOT_CONNECTED" }));
`;

try {
  docker(["buildx", "build", "--platform", targetPlatform, "--load", "--tag", tag, "--file", "apps/web/Dockerfile", "."]);
  imageBuilt = true;
  const imageId = docker(["image", "inspect", tag, "--format", "{{.Id}} {{.Os}}/{{.Architecture}}"], { quiet: true });
  if (!new RegExp(`^sha256:[a-f0-9]{64} ${targetPlatform.replaceAll("/", "\\/")}$`, "u").test(imageId)) throw new Error(`Web probe image has unexpected platform: ${imageId}`);

  docker(["network", "create", "--internal", network], { quiet: true });
  docker(["run", "--detach", "--name", apiName, "--network", network, "--network-alias", "platform-api", "--read-only", "--tmpfs", "/tmp:size=8m", "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--pids-limit", "32", "--entrypoint", "node", nodeImage, "-e", apiProgram], { quiet: true });
  networkContainers.push(apiName);
  docker(["run", "--detach", "--name", webName, "--network", network, "--network-alias", "web", "--read-only", "--tmpfs", "/tmp:size=16m", "--tmpfs", "/workspace/apps/web/node_modules/.vite-temp:size=8m,mode=1777", "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--pids-limit", "64", "--env", "STOCKQUANT_PLATFORM_API_URL=http://platform-api:3000", tag], { quiet: true });
  networkContainers.push(webName);
  const webEvidence = JSON.parse(docker(["run", "--rm", "--name", runnerName, "--network", network, "--read-only", "--tmpfs", "/tmp:size=8m", "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--pids-limit", "32", "--entrypoint", "node", nodeImage, "--input-type=module", "-e", probeProgram], { quiet: true }));
  const webLogs = spawnSync("docker", ["logs", webName], { encoding: "utf8", timeout: 15_000 });
  if (webLogs.status !== 0) throw new Error(`could not collect Web runtime logs: ${webLogs.stderr?.trim() ?? "unknown error"}`);
  const logs = `${webLogs.stdout ?? ""}\n${webLogs.stderr ?? ""}`;
  if (logs.includes("unsupported by configLoader")) throw new Error("Vite loaded the runtime config with the unsupported CommonJS loader");

  console.log(JSON.stringify({ image: tag, imageId, targetPlatform, dockerNetwork: "internal-only", runtimeIdentity: "node", viteConfigWarnings: 0, ...webEvidence }));
} catch (error) {
  for (const name of networkContainers) {
    const logs = spawnSync("docker", ["logs", name], { encoding: "utf8", timeout: 15_000 });
    if (logs.stdout?.trim() || logs.stderr?.trim()) console.error(`diagnostic logs (${name}):\n${logs.stdout ?? ""}${logs.stderr ?? ""}`);
  }
  throw error;
} finally {
  for (const name of [...networkContainers, runnerName]) spawnSync("docker", ["rm", "--force", name], { stdio: "ignore", timeout: 15_000 });
  spawnSync("docker", ["network", "rm", network], { stdio: "ignore", timeout: 15_000 });
  if (imageBuilt) spawnSync("docker", ["image", "rm", "--force", tag], { stdio: "ignore", timeout: 15_000 });
}

import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const prefix = process.env.STOCKQUANT_W8_IMAGE_PREFIX ?? "stockquant-w8-20260930-";
if (!/^[a-z0-9][a-z0-9_.-]*-$/u.test(prefix)) throw new Error("STOCKQUANT_W8_IMAGE_PREFIX must be a lowercase image-name prefix ending in a hyphen");
const nodeImages = [
  ["platform-api-service", "services/platform-api-service/dist/main.js"],
  ["market-data-service", "services/market-data-service/dist/main.js"],
  ["portfolio-risk-service", "services/portfolio-risk-service/dist/main.js"],
  ["trade-execution-service", "services/trade-execution-service/dist/main.js"],
  ["decision-governance-service", "services/decision-governance-service/dist/main.js"],
  ["historical-replay-worker", "services/historical-replay-worker/dist/main.js"],
  ["quant-research-service", "services/quant-research-service/dist/main.js"],
  ["research-automation-service", "services/research-automation-service/dist/bootstrap/main.js"],
  ["web", "apps/web/dist/index.html"],
];

function run(args, encoding = "utf8") {
  return execFileSync("docker", args, { encoding, stdio: ["ignore", "pipe", "pipe"], timeout: 120_000 }).trim();
}

function inspect(name) {
  const image = `${prefix}${name}:latest`;
  const [metadata] = JSON.parse(run(["image", "inspect", image]));
  if (metadata.Os !== "linux" || metadata.Architecture !== "amd64") throw new Error(`${name} platform is ${metadata.Os}/${metadata.Architecture}`);
  if (!metadata.Config.User) throw new Error(`${name} has no configured non-root user`);
  return { image, metadata };
}

const results = [];
for (const [name, bundlePath] of nodeImages) {
  const { image, metadata } = inspect(name);
  const assertSensitiveBoundary = ["web", "research-automation-service"].includes(name)
    ? 'if(fs.existsSync("/var/run/docker.sock"))throw Error("Docker socket is present");const secretNames=Object.keys(process.env).filter(k=>/(TOKEN|SECRET|PASSWORD|API_KEY|PRIVATE_KEY|CREDENTIAL)/iu.test(k)&&process.env[k]);if(secretNames.length)throw Error("controller or provider secret environment is present")'
    : "";
  const sensitiveBoundaryResult = ["web", "research-automation-service"].includes(name)
    ? ",dockerSocketAbsent:true,nonemptySecretEnvironmentAbsent:true"
    : "";
  const script = `const fs=require("node:fs");if(process.getuid()===0)throw Error("root user");if(!fs.existsSync("/workspace/${bundlePath}"))throw Error("missing image bundle");${assertSensitiveBoundary};fs.writeFileSync("/tmp/w8-check","ok");try{fs.writeFileSync("/workspace/.w8-check","bad");throw Error("root filesystem writable")}catch(e){if(e.message==="root filesystem writable")throw e}console.log(JSON.stringify({uid:process.getuid(),bundle:"${bundlePath}",readOnlyRoot:true,network:"none"${sensitiveBoundaryResult}}))`;
  const output = run(["run", "--rm", "--platform", "linux/amd64", "--network", "none", "--read-only", "--tmpfs", "/tmp:rw,nosuid,nodev,size=256m", "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--pids-limit", "64", "--entrypoint", "node", image, "-e", script]);
  results.push({ service: name, imageId: metadata.Id, user: metadata.Config.User, result: JSON.parse(output) });
}

const qlib = inspect("qlib-worker");
const qlibOutput = run(["run", "--rm", "--platform", "linux/amd64", "--network", "none", "--read-only", "--tmpfs", "/tmp:rw,nosuid,nodev,size=512m", "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--pids-limit", "64", "--entrypoint", "python", qlib.image, "-c", "import json,os,pathlib,qlib,lightgbm; assert os.getuid()!=0; pathlib.Path('/tmp/w8-check').write_text('ok');\ntry: pathlib.Path('/opt/qlib/.w8-check').write_text('bad'); raise RuntimeError('root filesystem writable')\nexcept OSError: pass\nprint(json.dumps({'uid':os.getuid(),'qlib':qlib.__version__,'lightgbm':lightgbm.__version__,'readOnlyRoot':True,'network':'none'}))"]);
results.push({ service: "qlib-worker", imageId: qlib.metadata.Id, user: qlib.metadata.Config.User, result: JSON.parse(qlibOutput) });

const market = inspect("market-data-service");
const volume = `stockquant-w8-volume-${randomUUID()}`;
try {
  run(["volume", "create", volume]);
  const script = "const fs=require('node:fs');if(process.getuid()===0)throw Error('root user');fs.writeFileSync('/var/lib/stockquant/.w8-check','ok');if(fs.readFileSync('/var/lib/stockquant/.w8-check','utf8')!=='ok')throw Error('volume is not writable');try{fs.writeFileSync('/workspace/.w8-check','bad');throw Error('root filesystem writable')}catch(e){if(e.message==='root filesystem writable')throw e}console.log(JSON.stringify({uid:process.getuid(),persistentVolumeWritable:true,rootFilesystemReadOnly:true,network:'none'}))";
  const output = run(["run", "--rm", "--platform", "linux/amd64", "--network", "none", "--read-only", "--tmpfs", "/tmp:rw,noexec,nosuid,size=256m", "--mount", `type=volume,src=${volume},dst=/var/lib/stockquant`, "--cap-drop", "ALL", "--security-opt", "no-new-privileges", "--pids-limit", "64", "--entrypoint", "node", market.image, "-e", script]);
  results.find((entry) => entry.service === "market-data-service").result = JSON.parse(output);
} finally {
  run(["volume", "rm", "-f", volume]);
}

console.log(JSON.stringify({ status: "PASS", target: "linux/amd64 (Mac M1 emulation)", checks: results.length, results }, null, 2));

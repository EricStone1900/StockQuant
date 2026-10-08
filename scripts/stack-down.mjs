import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const args = process.argv.slice(2);
const projectIndex = args.indexOf("--project");
const project = projectIndex >= 0 ? args[projectIndex + 1] : undefined;
if (!project || !/^(?:sq-v11-stack-[a-f0-9]{20}|sq-v12-e2e-[a-f0-9]{20}|sq-v13-web-[a-f0-9]{20}|sq-v14-stack-[a-f0-9]{20}|sq-v15-stack-[a-f0-9]{20})$/u.test(project)) {
  console.error("usage: pnpm stack:down -- --project <isolated project printed by stack:up>");
  process.exit(2);
}
const stateDirectory = path.resolve(".codex/isolated-stacks");
const stateFile = path.join(stateDirectory, `${project}.json`);
let state;
try { state = JSON.parse(readFileSync(stateFile, "utf8")); } catch {
  console.error(`No registered isolated stack state exists for ${project}; refusing to run Docker Compose down.`);
  process.exit(2);
}
const expectedCompose = { "V1.1": "infra/compose/docker-compose.v11-integration.yml", "V1.2": "infra/compose/docker-compose.v12-integration.yml", "V1.3": "infra/compose/docker-compose.v13-integration.yml", "V1.4": "infra/compose/docker-compose.v14-integration.yml", "V1.5": "infra/compose/docker-compose.v15-integration.yml" }[state.stage];
if (state.project !== project || !["V1.1", "V1.2", "V1.3", "V1.4", "V1.5"].includes(state.stage) || state.composeFile !== expectedCompose || state.envFile !== path.join(stateDirectory, `${project}.env`)) {
  console.error(`Isolated stack state does not match ${project}; refusing cleanup.`);
  process.exit(2);
}
const compose = (composeArgs, stdio = "inherit") => spawnSync("docker", ["compose", "-p", project, "--env-file", state.envFile, "-f", state.composeFile, ...composeArgs], { encoding: "utf8", stdio });
if (["V1.2", "V1.3", "V1.4", "V1.5"].includes(state.stage) && state.interactive) {
  const stopFile = path.join(stateDirectory, `${project}.stop`);
  writeFileSync(stopFile, "stop\n", { mode: 0o600, flag: "w" });
  const deadline = Date.now() + 120_000;
  while (existsSync(stateFile) && Date.now() < deadline) await delay(250);
  if (existsSync(stateFile)) {
    console.error(`${state.stage} interactive stack did not finish isolated cleanup within 120 seconds; performing exact-project Compose cleanup.`);
    const result = compose(["--profile", "interactive", "down", "--volumes", "--remove-orphans"]);
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
} else {
  const result = compose([...(state.interactive || state.stage === "V1.1" ? ["--profile", "interactive"] : []), "down", "--volumes", "--remove-orphans"]);
  if (result.status !== 0) process.exit(result.status ?? 1);
}
for (const [kind, inspectArgs] of [
  ["containers", ["ps", "-aq", "--filter", `label=com.docker.compose.project=${project}`]],
  ["volumes", ["volume", "ls", "-q", "--filter", `label=com.docker.compose.project=${project}`]],
  ["networks", ["network", "ls", "-q", "--filter", `label=com.docker.compose.project=${project}`]],
]) {
  const check = spawnSync("docker", inspectArgs, { encoding: "utf8" });
  if (check.status !== 0 || check.stdout.trim()) {
    console.error(`Could not verify isolated ${kind} cleanup for ${project}: ${check.stderr ?? check.stdout}`);
    process.exit(1);
  }
}
rmSync(state.envFile, { force: true });
rmSync(stateFile, { force: true });
rmSync(path.join(stateDirectory, `${project}.stop`), { force: true });
const imageCheck = spawnSync("docker", ["images", "-q", "--filter", `reference=${project}-*`], { encoding: "utf8" });
if (imageCheck.status !== 0 || imageCheck.stdout.trim()) { console.error(`Project-owned image cleanup incomplete for ${project}.`); process.exit(1); }
console.log(JSON.stringify({ status: "STOPPED_AND_PURGED", isolatedProject: project, resourcesRemoved: ["containers", "project-scoped PostgreSQL volume", "project network", "project images", "credentials file"], activeComposeTargeted: false }));

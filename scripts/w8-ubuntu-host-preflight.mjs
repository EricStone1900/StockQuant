import { readFile } from "node:fs/promises";
import { cpus, totalmem, platform, release, arch } from "node:os";
import { statfs } from "node:fs/promises";
import { spawnSync } from "node:child_process";

function parseOsRelease(contents) {
  const values = {};
  for (const line of contents.split(/\r?\n/u)) {
    const match = /^(ID|VERSION_ID|PRETTY_NAME)=(.*)$/u.exec(line);
    if (!match) continue;
    const raw = match[2];
    values[match[1]] = raw.startsWith('"') && raw.endsWith('"') ? raw.slice(1, -1) : raw;
  }
  return values;
}

export function assessUbuntuHost({ system, machine, distroId, distroVersion, cpuCount, memoryBytes, diskAvailableBytes, docker }) {
  const targetHost = system === "linux" && machine === "x86_64" && distroId === "ubuntu";
  const dockerMatchesTarget = docker?.status === "AVAILABLE" && docker?.osType === "linux"
    && docker?.architecture === machine && String(docker?.operatingSystem ?? "").toLowerCase().includes("ubuntu");
  return {
    schemaVersion: "stockquant-w8-ubuntu-host-preflight-v1",
    status: targetHost && dockerMatchesTarget ? "INVENTORY_ONLY" : "BLOCKED",
    target: { operatingSystem: system, distribution: distroId ?? null, distributionVersion: distroVersion ?? null, architecture: machine },
    resources: { logicalCpuCount: cpuCount, memoryBytes, diskAvailableBytes },
    containerRuntime: docker,
    checks: {
      targetIsUbuntuX86_64: targetHost ? "PASS" : "FAIL",
      linuxContainerRuntimeMatchesTarget: dockerMatchesTarget ? "PASS" : "FAIL",
      approvedResourceThresholds: "NOT_DEFINED",
      targetHostAuthorized: "NOT_CONFIRMED",
      deploymentOrMigrationPerformed: false,
      externalNetworkUsed: false,
      credentialsRead: false,
    },
    limitations: [
      "INVENTORY_ONLY does not mean release-ready; resource thresholds, network/storage, host authorization and maintenance approvals require separate review.",
      "This command is read-only and does not inspect credentials, contact a registry, modify services, or run a migration.",
    ],
  };
}

export function isLocalDockerEndpoint(contextEndpoint, dockerHost = "") {
  return contextEndpoint.startsWith("unix://") && (!dockerHost || dockerHost.startsWith("unix://"));
}

function dockerInventory() {
  const context = spawnSync("docker", ["context", "inspect", "--format", "{{(index .Endpoints \"docker\").Host}}"], { encoding: "utf8", timeout: 3000 });
  if (context.error || context.status !== 0 || context.stderr?.trim() || !isLocalDockerEndpoint(context.stdout.trim(), process.env.DOCKER_HOST ?? "")) return { status: "UNAVAILABLE", reason: "local Unix-socket Docker context unavailable or remote endpoint refused" };
  const command = spawnSync("docker", ["info", "--format", "{{.OSType}}|{{.Architecture}}|{{.OperatingSystem}}|{{.ServerVersion}}|{{.CgroupVersion}}|{{.Driver}}|{{.NCPU}}|{{.MemTotal}}"], { encoding: "utf8", timeout: 5000 });
  if (command.error || command.status !== 0 || command.stderr?.trim()) return { status: "UNAVAILABLE" };
  const [osType, architecture, operatingSystem, serverVersion, cgroupVersion, storageDriver, cpuCount, memoryBytes] = command.stdout.trim().split("|");
  if (!osType || !architecture || !operatingSystem || !serverVersion || !Number.isSafeInteger(Number(cpuCount)) || Number(cpuCount) < 1 || !Number.isSafeInteger(Number(memoryBytes)) || Number(memoryBytes) < 1) return { status: "UNAVAILABLE" };
  return { status: "AVAILABLE", osType, architecture, operatingSystem, serverVersion, cgroupVersion, storageDriver, cpuCount: Number(cpuCount), memoryBytes: Number(memoryBytes) };
}

export async function collectUbuntuHostInventory(projectPath = process.cwd()) {
  let osRelease = {};
  try { osRelease = parseOsRelease(await readFile("/etc/os-release", "utf8")); } catch { /* non-Linux host */ }
  const filesystem = await statfs(projectPath);
  return assessUbuntuHost({
    system: platform(), machine: ({ x64: "x86_64", arm64: "aarch64" }[arch()] ?? arch()),
    distroId: osRelease.ID, distroVersion: osRelease.VERSION_ID,
    cpuCount: cpus().length, memoryBytes: totalmem(),
    diskAvailableBytes: Number(filesystem.bavail) * Number(filesystem.bsize),
    docker: dockerInventory(),
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const report = await collectUbuntuHostInventory();
    console.log(JSON.stringify(report, null, 2));
    if (report.status === "BLOCKED") process.exitCode = 2;
  } catch (error) {
    console.error(JSON.stringify({ status: "FAILED", error: String(error) }));
    process.exitCode = 1;
  }
}

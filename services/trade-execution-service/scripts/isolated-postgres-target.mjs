import { spawnSync } from "node:child_process";

const CONTAINER_NAME = /^sq-test-postgres-[a-f0-9]{16}$/u;

function dockerInspect(name) {
  const result = spawnSync("docker", ["inspect", name], { encoding: "utf8", timeout: 5000, maxBuffer: 1024 * 1024 });
  if (result.error || result.status !== 0) return null;
  try { return JSON.parse(result.stdout)[0] ?? null; } catch { return null; }
}

export function isIsolatedPostgresTarget(databaseUrl, containerName, inspectContainer = dockerInspect, expected = { username: "trade_execution_test", database: "trade_execution_test" }) {
  let url;
  try { url = new URL(databaseUrl); } catch { return false; }
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") return false;
  if (url.hostname !== "127.0.0.1" || url.username !== expected.username || url.pathname !== `/${expected.database}` || !url.port || url.port === "5433") return false;
  if (!CONTAINER_NAME.test(containerName ?? "")) return false;

  const container = inspectContainer(containerName);
  if (!container || container.Name !== `/${containerName}` || container.State?.Running !== true) return false;
  if (!container.Config?.Image?.startsWith("sha256:") || container.Image !== container.Config.Image) return false;
  const host = container.HostConfig ?? {};
  if (host.ReadonlyRootfs !== true || !(host.Tmpfs && Object.hasOwn(host.Tmpfs, "/var/lib/postgresql/data"))) return false;
  if (!(host.Memory > 0) || !(host.PidsLimit > 0)) return false;
  const bindings = container.NetworkSettings?.Ports?.["5432/tcp"];
  return Array.isArray(bindings) && bindings.length === 1
    && bindings[0].HostIp === "127.0.0.1"
    && bindings[0].HostPort === url.port;
}

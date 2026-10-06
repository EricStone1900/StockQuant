import { createRestrictedEgressProxy } from "./adapters/restricted-egress-proxy.js";

const token = process.env.STOCKQUANT_RESEARCH_EGRESS_PROXY_TOKEN ?? "";
const allowedHosts = (process.env.STOCKQUANT_RESEARCH_EGRESS_ALLOWED_HOSTS ?? "").split(",").map((host) => host.trim()).filter(Boolean);
const port = Number(process.env.STOCKQUANT_RESEARCH_EGRESS_PROXY_PORT ?? 3128);
if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error("egress proxy port is invalid");

const server = createRestrictedEgressProxy({ token, allowedHosts, port });
server.on("listening", () => process.stdout.write(`restricted Provider egress proxy listening on ${port}\n`));
server.on("error", () => {
  process.stderr.write("restricted Provider egress proxy failed to start\n");
  process.exitCode = 1;
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => server.close(() => { process.exitCode = 0; }));
}

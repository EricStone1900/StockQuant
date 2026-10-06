import { timingSafeEqual } from "node:crypto";
import { lookup } from "node:dns/promises";
import { connect as tcpConnect, type Socket } from "node:net";
import { createServer, type Server } from "node:http";
import { isIPv4 } from "node:net";

const PROVIDER_HOSTS = new Set(["api.deepseek.com", "api.siliconflow.cn"]);

export type RestrictedEgressProxyOptions = {
  token: string;
  allowedHosts: string[];
  port?: number;
  host?: string;
  resolve?: (host: string) => Promise<Array<{ address: string; family: number }>>;
  connect?: (address: string, port: number) => Socket;
};

/** Accept only globally routable IPv4 addresses; fail closed for all special-use ranges. */
export function isPublicEgressIPv4(address: string): boolean {
  if (!isIPv4(address)) return false;
  const octets = address.split(".").map(Number);
  const [a, b, c] = octets;
  if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 192 && (b === 168 || (b === 0 && c === 0) || (b === 0 && c === 2) || (b === 88 && c === 99))) return false;
  if (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) return false;
  if (a === 203 && b === 0 && c === 113) return false;
  return true;
}

export function parseProviderConnectAuthority(authority: string, allowedHosts: ReadonlySet<string>): string | null {
  const match = /^([a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?):443$/iu.exec(authority);
  if (!match) return null;
  const host = match[1].toLowerCase();
  if (host.includes("..") || host.endsWith(".") || !allowedHosts.has(host)) return null;
  return host;
}

function hasValidProxyCredential(header: string | string[] | undefined, token: string): boolean {
  if (typeof header !== "string" || !header.startsWith("Basic ")) return false;
  let decoded: string;
  try { decoded = Buffer.from(header.slice(6), "base64").toString("utf8"); }
  catch { return false; }
  const separator = decoded.indexOf(":");
  if (separator < 0 || decoded.slice(0, separator) !== "stockquant") return false;
  const presented = Buffer.from(decoded.slice(separator + 1));
  const expected = Buffer.from(token);
  return presented.length === expected.length && timingSafeEqual(presented, expected);
}

/**
 * Minimal CONNECT-only egress proxy. Host and port are allowlisted before DNS;
 * DNS is resolved once and the TCP socket is pinned to a checked public IPv4.
 * Deploy only on a separate egress-capable network while callers remain on an
 * internal-only network, so callers cannot bypass this proxy.
 */
export function createRestrictedEgressProxy(options: RestrictedEgressProxyOptions): Server {
  if (options.token.length < 32 || /[\r\n\0]/u.test(options.token)) throw new Error("egress proxy token must be at least 32 safe characters");
  if (!Array.isArray(options.allowedHosts) || options.allowedHosts.length < 1
    || new Set(options.allowedHosts).size !== options.allowedHosts.length
    || options.allowedHosts.some((host) => !PROVIDER_HOSTS.has(host))) throw new Error("egress proxy hosts must be an exact subset of approved Provider hosts");
  const allow = new Set(options.allowedHosts);
  const port = options.port ?? 3128;
  const resolve = options.resolve ?? (async (host) => (await lookup(host, { all: true, family: 4, verbatim: true })));
  const connect = options.connect ?? ((address, targetPort) => tcpConnect({ host: address, port: targetPort }));

  const server = createServer((_request, response) => {
    response.writeHead(405, { connection: "close" });
    response.end();
  });
  server.on("connect", (request, client) => {
    const host = request.method === "CONNECT" && request.url
      ? parseProviderConnectAuthority(request.url, allow) : null;
    if (!host || !hasValidProxyCredential(request.headers["proxy-authorization"], options.token)) {
      client.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      return;
    }
    void resolve(host).then((answers) => {
      if (answers.length === 0 || answers.some((answer) => answer.family !== 4 || !isPublicEgressIPv4(answer.address))) throw new Error("provider DNS returned a non-public address");
      const upstream = connect(answers[0].address, 443);
      upstream.once("connect", () => {
        client.write("HTTP/1.1 200 Connection Established\r\n\r\n");
        client.pipe(upstream);
        upstream.pipe(client);
      });
      upstream.once("error", () => client.destroy());
      client.once("error", () => upstream.destroy());
      client.once("close", () => upstream.destroy());
    }).catch(() => {
      if (!client.destroyed) client.end("HTTP/1.1 502 Bad Gateway\r\nConnection: close\r\n\r\n");
    });
  });
  return server.listen(port, options.host ?? "0.0.0.0");
}

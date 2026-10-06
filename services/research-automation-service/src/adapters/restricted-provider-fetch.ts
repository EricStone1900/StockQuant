import { request as httpRequest, type ClientRequest } from "node:http";
import { Agent, request as httpsRequest } from "node:https";
import { connect as tlsConnect, type TLSSocket } from "node:tls";
import type { Duplex } from "node:stream";

const ENDPOINTS = new Set([
  "https://api.deepseek.com/chat/completions",
  "https://api.siliconflow.cn/v1/embeddings",
]);
const MAX_RESPONSE_BYTES = 16 * 1024 * 1024;

export type RestrictedProviderFetchOptions = {
  proxyUrl: string;
  proxyToken: string;
};

function parseProxyUrl(value: string): URL {
  let url: URL;
  try { url = new URL(value); }
  catch { throw new Error("restricted Provider proxy URL is invalid"); }
  if (url.protocol !== "http:" || !["research-egress-proxy", "127.0.0.1", "localhost"].includes(url.hostname)
    || !url.port || url.pathname !== "/" || url.search || url.hash || url.username || url.password) {
    throw new Error("restricted Provider proxy URL must use the configured internal proxy authority");
  }
  return url;
}

function createTunnelAgent(proxyUrl: URL, token: string, signal?: AbortSignal): Agent {
  const agent = new Agent({ keepAlive: false, maxSockets: 1 });
  agent.createConnection = (options, callback) => {
    const host = String(options.hostname ?? options.host ?? "").toLowerCase();
    const port = Number(options.port ?? 443);
    if (!ENDPOINTS.has(`https://${host}${host === "api.deepseek.com" ? "/chat/completions" : "/v1/embeddings"}`) || port !== 443) {
      queueMicrotask(() => callback?.(new Error("Provider egress target is not allowlisted"), null as unknown as Duplex));
      return null;
    }
    if (signal?.aborted) {
      queueMicrotask(() => callback?.(signal.reason instanceof Error ? signal.reason : new Error("Provider request aborted"), null as unknown as Duplex));
      return null;
    }

    const connectRequest: ClientRequest = httpRequest({
      hostname: proxyUrl.hostname,
      port: Number(proxyUrl.port),
      method: "CONNECT",
      path: `${host}:443`,
      headers: { host: `${host}:443`, "proxy-authorization": `Basic ${Buffer.from(`stockquant:${token}`).toString("base64")}` },
      signal,
    });
    connectRequest.once("connect", (response, socket) => {
      if (response.statusCode !== 200) {
        socket.destroy();
        callback?.(new Error("restricted Provider proxy rejected CONNECT"), null as unknown as Duplex);
        return;
      }
      const tlsSocket: TLSSocket = tlsConnect({ socket, servername: host, rejectUnauthorized: true });
      tlsSocket.once("secureConnect", () => callback?.(null, tlsSocket));
      tlsSocket.once("error", (error) => callback?.(error, null as unknown as Duplex));
    });
    connectRequest.once("error", (error) => callback?.(error, null as unknown as Duplex));
    connectRequest.end();
    return null;
  };
  return agent;
}

/** A fetch-compatible transport that can reach the two frozen Providers only through authenticated CONNECT. */
export function createRestrictedProviderFetch(options: RestrictedProviderFetchOptions): typeof fetch {
  const proxyUrl = parseProxyUrl(options.proxyUrl);
  if (options.proxyToken.length < 32 || /[\r\n\0]/u.test(options.proxyToken)) throw new Error("restricted Provider proxy token is missing or invalid");

  return async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const request = input instanceof Request ? input : new Request(input, init);
    const url = request.url;
    const method = request.method;
    if (!ENDPOINTS.has(url) || method !== "POST") throw new Error("Provider request is outside the restricted egress allowlist");
    if (request.redirect !== "error") throw new Error("Provider redirects must be rejected");
    if (request.bodyUsed) throw new Error("Provider request body is already consumed");
    const body = await request.text();
    const target = new URL(url);
    const agent = createTunnelAgent(proxyUrl, options.proxyToken, request.signal);
    try {
      return await new Promise<Response>((resolve, reject) => {
        const outgoing = httpsRequest({
          protocol: "https:", hostname: target.hostname, port: 443, path: `${target.pathname}${target.search}`,
          method, headers: Object.fromEntries(request.headers.entries()), agent,
          signal: request.signal,
        }, (response) => {
          const chunks: Buffer[] = [];
          let bytes = 0;
          response.on("data", (chunk: Buffer) => {
            bytes += chunk.byteLength;
            if (bytes > MAX_RESPONSE_BYTES) {
              outgoing.destroy(new Error("Provider response exceeds the size limit"));
              return;
            }
            chunks.push(chunk);
          });
          response.once("error", reject);
          response.once("end", () => {
            const headers = new Headers();
            for (const [name, value] of Object.entries(response.headers)) {
              if (typeof value === "string") headers.set(name, value);
              else if (Array.isArray(value)) headers.set(name, value.join(", "));
            }
            resolve(new Response(Buffer.concat(chunks), { status: response.statusCode ?? 502, headers }));
          });
        });
        outgoing.once("error", reject);
        outgoing.end(body);
      });
    } finally {
      agent.destroy();
    }
  };
}

import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createRestrictedProviderFetch } from "../../src/adapters/restricted-provider-fetch.js";

const servers: ReturnType<typeof createServer>[] = [];
const token = "fixture-egress-token-0123456789abcdef";

async function startProxy(onConnect: (authority: string, authorization: string | undefined, socket: import("node:net").Socket) => void): Promise<string> {
  const server = createServer();
  server.on("connect", (request, socket) => onConnect(request.url ?? "", request.headers["proxy-authorization"], socket));
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  servers.push(server);
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

describe("restricted Provider fetch transport", () => {
  it("sends only an authenticated allowlisted CONNECT through the proxy", async () => {
    let observed: { authority: string; authorization?: string } | undefined;
    const proxyUrl = await startProxy((authority, authorization, socket) => {
      observed = { authority, authorization };
      socket.end("HTTP/1.1 407 Proxy Authentication Required\r\nConnection: close\r\n\r\n");
    });
    const fetch = createRestrictedProviderFetch({ proxyUrl, proxyToken: token });
    await expect(fetch("https://api.deepseek.com/chat/completions", {
      method: "POST", redirect: "error", headers: { authorization: "Bearer fixture-provider-key" }, body: "{}",
    })).rejects.toThrow("restricted Provider proxy rejected CONNECT");
    expect(observed).toEqual({
      authority: "api.deepseek.com:443",
      authorization: `Basic ${Buffer.from(`stockquant:${token}`).toString("base64")}`,
    });
  });

  it("rejects unsupported endpoints and incomplete proxy configuration before connecting", async () => {
    expect(() => createRestrictedProviderFetch({ proxyUrl: "https://research-egress-proxy:3128", proxyToken: token })).toThrow("internal proxy authority");
    expect(() => createRestrictedProviderFetch({ proxyUrl: "http://research-egress-proxy:3128", proxyToken: "short" })).toThrow("token is missing or invalid");
    const proxyUrl = await startProxy((_authority, _authorization, socket) => socket.destroy());
    const fetch = createRestrictedProviderFetch({ proxyUrl, proxyToken: token });
    await expect(fetch("https://example.com/", { method: "POST", redirect: "error", body: "{}" })).rejects.toThrow("outside the restricted egress allowlist");
  });
});

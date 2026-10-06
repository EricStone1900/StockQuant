import { connect as tcpConnect, createServer as createNetServer, type Server as NetServer } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createRestrictedEgressProxy, isPublicEgressIPv4, parseProviderConnectAuthority } from "../../src/adapters/restricted-egress-proxy.js";

const token = "fixture-egress-token-that-is-at-least-32-characters";
const allowed = ["api.deepseek.com", "api.siliconflow.cn"];
const servers: Array<{ close: () => Promise<void> }> = [];

async function listen(server: NetServer | ReturnType<typeof createRestrictedEgressProxy>): Promise<number> {
  servers.push({ close: () => !server.listening ? Promise.resolve() : new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())) });
  await new Promise<void>((resolve, reject) => server.once("listening", resolve).once("error", reject));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("expected a TCP listener");
  return address.port;
}

afterEach(async () => { await Promise.all(servers.splice(0).map((server) => server.close())); });

describe("restricted Provider egress proxy", () => {
  it("accepts only the exact approved HTTPS CONNECT authorities", () => {
    const hosts = new Set(allowed);
    expect(parseProviderConnectAuthority("api.deepseek.com:443", hosts)).toBe("api.deepseek.com");
    expect(parseProviderConnectAuthority("API.SILICONFLOW.CN:443", hosts)).toBe("api.siliconflow.cn");
    for (const authority of ["api.deepseek.com:80", "api.deepseek.com.evil.test:443", "api.deepseek.com.:443", "api.deepseek.com:444", "127.0.0.1:443", "user@api.deepseek.com:443"]) {
      expect(parseProviderConnectAuthority(authority, hosts)).toBeNull();
    }
  });

  it("rejects special-use IPv4 destinations before opening a socket", () => {
    for (const address of ["0.0.0.0", "10.1.2.3", "100.64.0.1", "127.0.0.1", "169.254.1.2", "172.16.0.1", "192.0.2.1", "192.168.1.1", "198.18.0.1", "198.51.100.5", "203.0.113.8", "224.0.0.1", "255.255.255.255", "::1", "not-an-ip"]) {
      expect(isPublicEgressIPv4(address), address).toBe(false);
    }
    for (const address of ["1.1.1.1", "8.8.8.8", "203.1.2.3"]) expect(isPublicEgressIPv4(address), address).toBe(true);
  });

  it("requires proxy credentials and does not resolve unapproved targets", async () => {
    let resolved = 0;
    const proxy = createRestrictedEgressProxy({ token, allowedHosts: allowed, host: "127.0.0.1", port: 0, resolve: async () => { resolved++; return [{ address: "8.8.8.8", family: 4 }]; } });
    const port = await listen(proxy);
    const issue = (authority: string) => new Promise<string>((resolve, reject) => {
      const client = tcpConnect({ host: "127.0.0.1", port });
      let text = "";
      client.on("connect", () => client.write(`CONNECT ${authority} HTTP/1.1\r\nHost: ${authority}\r\n\r\n`));
      client.on("data", (chunk) => { text += chunk.toString(); });
      client.on("end", () => resolve(text));
      client.on("error", reject);
    });
    expect(await issue("api.deepseek.com:443")).toContain("403 Forbidden");
    expect(await issue("api.deepseek.com.evil.test:443")).toContain("403 Forbidden");
    expect(resolved).toBe(0);
  });

  it("pins an authorized CONNECT tunnel to the checked DNS address", async () => {
    const echo = createNetServer((socket) => socket.pipe(socket));
    echo.listen(0, "127.0.0.1");
    const echoPort = await listen(echo);
    const connectedAddresses: string[] = [];
    const proxy = createRestrictedEgressProxy({
      token,
      allowedHosts: ["api.deepseek.com"],
      host: "127.0.0.1",
      port: 0,
      resolve: async () => [{ address: "8.8.8.8", family: 4 }],
      connect: (address) => { connectedAddresses.push(address); return tcpConnect({ host: "127.0.0.1", port: echoPort }); },
    });
    const port = await listen(proxy);
    const credential = Buffer.from(`stockquant:${token}`).toString("base64");
    const received = await new Promise<string>((resolve, reject) => {
      const client = tcpConnect({ host: "127.0.0.1", port });
      let data = "";
      let sentPayload = false;
      client.on("connect", () => client.write(`CONNECT api.deepseek.com:443 HTTP/1.1\r\nHost: api.deepseek.com:443\r\nProxy-Authorization: Basic ${credential}\r\n\r\n`));
      client.on("data", (chunk) => {
        data += chunk.toString();
        if (!sentPayload && data.includes("\r\n\r\n")) { sentPayload = true; client.write("tunnel-probe"); }
        if (data.includes("tunnel-probe")) { client.destroy(); resolve(data); }
      });
      client.on("error", reject);
      setTimeout(() => { client.destroy(); reject(new Error("proxy tunnel timed out")); }, 2000).unref();
    });
    expect(received).toContain("200 Connection Established");
    expect(connectedAddresses).toEqual(["8.8.8.8"]);
  });

  it("rejects DNS answers containing private or mixed public/private addresses", async () => {
    const proxy = createRestrictedEgressProxy({ token, allowedHosts: ["api.deepseek.com"], host: "127.0.0.1", port: 0, resolve: async () => [
      { address: "8.8.8.8", family: 4 }, { address: "169.254.169.254", family: 4 },
    ], connect: () => { throw new Error("must not connect when any DNS answer is special-use"); } });
    const port = await listen(proxy);
    const credential = Buffer.from(`stockquant:${token}`).toString("base64");
    const reply = await new Promise<string>((resolve, reject) => {
      const client = tcpConnect({ host: "127.0.0.1", port });
      let text = "";
      client.on("connect", () => client.write(`CONNECT api.deepseek.com:443 HTTP/1.1\r\nHost: api.deepseek.com:443\r\nProxy-Authorization: Basic ${credential}\r\n\r\n`));
      client.on("data", (chunk) => { text += chunk.toString(); });
      client.on("end", () => resolve(text));
      client.on("error", reject);
    });
    expect(reply).toContain("502 Bad Gateway");
  });
});

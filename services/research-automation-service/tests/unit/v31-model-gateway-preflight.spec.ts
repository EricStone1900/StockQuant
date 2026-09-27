import { describe, expect, it } from "vitest";
import { evaluateModelGatewayPreflight } from "../../src/application/v31-model-gateway-preflight.js";

const input = {
  runnerMode: "ISOLATED" as const,
  modelGatewayMode: "LIVE" as const,
  outboundPolicy: "ALLOWLIST" as const,
  outboundAllowlist: ["api.deepseek.com", "api.siliconflow.cn"],
  chatBaseUrl: "https://api.deepseek.com",
  embeddingBaseUrl: "https://api.siliconflow.cn/v1",
  chatCredentialRef: "DEEPSEEK_API_KEY",
  embeddingCredentialRef: "SILICONFLOW_API_KEY",
};

describe("V3.1 model gateway preflight", () => {
  it("keeps the default unconfigured environment blocked without model calls", () => {
    const result = evaluateModelGatewayPreflight({ ...input, runnerMode: "NOT_CONFIGURED", modelGatewayMode: "NOT_CONFIGURED", outboundPolicy: "DENY", outboundAllowlist: [] }, {});
    expect(result.status).toBe("BLOCKED");
    expect(result.modelCalls).toBe("NOT_RUN");
    expect(result.missing).toEqual(expect.arrayContaining(["isolated runner", "model gateway LIVE mode", "credential DEEPSEEK_API_KEY", "outbound ALLOWLIST policy"]));
  });

  it("reports ready only when both credential refs and exact provider hosts are present", () => {
    const result = evaluateModelGatewayPreflight(input, { DEEPSEEK_API_KEY: "redacted", SILICONFLOW_API_KEY: "redacted" });
    expect(result).toEqual({ status: "READY", modelCalls: "NOT_RUN", missing: [], allowedHosts: ["api.deepseek.com", "api.siliconflow.cn"] });
    expect(JSON.stringify(result)).not.toContain("redacted");
  });

  it("does not accept a similarly named or unrelated host", () => {
    const result = evaluateModelGatewayPreflight({ ...input, outboundAllowlist: ["deepseek.com", "api.siliconflow.cn"] }, { DEEPSEEK_API_KEY: "x", SILICONFLOW_API_KEY: "y" });
    expect(result.status).toBe("BLOCKED");
    expect(result.missing).toContain("outbound authority api.deepseek.com");
  });

  it("requires HTTPS endpoints without embedded credentials or query parameters", () => {
    const credentials = { DEEPSEEK_API_KEY: "x", SILICONFLOW_API_KEY: "y" };
    for (const chatBaseUrl of ["http://api.deepseek.com", "https://user:password@api.deepseek.com", "https://api.deepseek.com?key=secret"]) {
      const result = evaluateModelGatewayPreflight({ ...input, chatBaseUrl }, credentials);
      expect(result.status).toBe("BLOCKED");
      expect(result.missing).toContain("secure HTTPS endpoint for chat");
      expect(JSON.stringify(result)).not.toContain("secret");
    }
  });

  it("matches nonstandard ports exactly and rejects wildcard allowlist entries", () => {
    const credentials = { DEEPSEEK_API_KEY: "x", SILICONFLOW_API_KEY: "y" };
    const portMismatch = evaluateModelGatewayPreflight({ ...input, chatBaseUrl: "https://api.deepseek.com:8443/v1" }, credentials);
    expect(portMismatch.status).toBe("BLOCKED");
    expect(portMismatch.missing).toContain("outbound authority api.deepseek.com:8443");
    const wildcard = evaluateModelGatewayPreflight({ ...input, outboundAllowlist: ["*.deepseek.com", "api.siliconflow.cn"] }, credentials);
    expect(wildcard.status).toBe("BLOCKED");
    expect(wildcard.missing).toContain("valid exact-host outbound allowlist");
    expect(wildcard.allowedHosts).toEqual(["api.siliconflow.cn"]);
  });
});

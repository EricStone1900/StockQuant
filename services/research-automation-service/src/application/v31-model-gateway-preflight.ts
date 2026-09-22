export type ModelGatewayPreflightInput = {
  runnerMode: "NOT_CONFIGURED" | "ISOLATED";
  modelGatewayMode: "NOT_CONFIGURED" | "LIVE";
  outboundPolicy: "DENY" | "ALLOWLIST";
  outboundAllowlist: string[];
  chatBaseUrl: string;
  embeddingBaseUrl: string;
  chatCredentialRef: string;
  embeddingCredentialRef: string;
};

export type ModelGatewayPreflightResult = {
  status: "READY" | "BLOCKED";
  modelCalls: "NOT_RUN";
  missing: string[];
  allowedHosts: string[];
};

const hostOf = (baseUrl: string): string => {
  try {
    return new URL(baseUrl).hostname;
  } catch {
    return "<invalid-url>";
  }
};

export function evaluateModelGatewayPreflight(
  input: ModelGatewayPreflightInput,
  credentials: Record<string, string | undefined>,
): ModelGatewayPreflightResult {
  const missing: string[] = [];
  if (input.runnerMode !== "ISOLATED") missing.push("isolated runner");
  if (input.modelGatewayMode !== "LIVE") missing.push("model gateway LIVE mode");
  for (const ref of [input.chatCredentialRef, input.embeddingCredentialRef]) {
    if (!credentials[ref]?.trim()) missing.push(`credential ${ref}`);
  }
  if (input.outboundPolicy !== "ALLOWLIST") missing.push("outbound ALLOWLIST policy");
  const requiredHosts = [hostOf(input.chatBaseUrl), hostOf(input.embeddingBaseUrl)];
  for (const host of requiredHosts) {
    if (host === "<invalid-url>" || !input.outboundAllowlist.includes(host)) missing.push(`outbound host ${host}`);
  }
  return {
    status: missing.length === 0 ? "READY" : "BLOCKED",
    modelCalls: "NOT_RUN",
    missing,
    allowedHosts: [...input.outboundAllowlist],
  };
}

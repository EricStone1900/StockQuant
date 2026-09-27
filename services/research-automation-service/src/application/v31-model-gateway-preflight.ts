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

const secureAuthorityOf = (baseUrl: string): string | null => {
  try {
    const url = new URL(baseUrl);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) return null;
    return url.host.toLowerCase();
  } catch {
    return null;
  }
};

const normalizeAllowlistEntry = (entry: string): string | null => {
  try {
    const url = new URL(`https://${entry}`);
    if (url.pathname !== "/" || url.search || url.hash || url.username || url.password || url.hostname.includes("*") || entry.includes("/") || entry.includes("@")) return null;
    return url.host.toLowerCase();
  } catch {
    return null;
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
  const allowedAuthorities = input.outboundAllowlist.map(normalizeAllowlistEntry);
  if (allowedAuthorities.some((authority) => authority === null)) missing.push("valid exact-host outbound allowlist");
  for (const [label, baseUrl] of [["chat", input.chatBaseUrl], ["embedding", input.embeddingBaseUrl]] as const) {
    const authority = secureAuthorityOf(baseUrl);
    if (!authority) missing.push(`secure HTTPS endpoint for ${label}`);
    else if (!allowedAuthorities.includes(authority)) missing.push(`outbound authority ${authority}`);
  }
  return {
    status: missing.length === 0 ? "READY" : "BLOCKED",
    modelCalls: "NOT_RUN",
    missing,
    allowedHosts: allowedAuthorities.filter((authority): authority is string => authority !== null),
  };
}

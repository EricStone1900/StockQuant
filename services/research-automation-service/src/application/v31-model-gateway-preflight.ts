export type ModelGatewayPreflightInput = {
  runnerMode: "NOT_CONFIGURED" | "ISOLATED";
  modelGatewayMode: "NOT_CONFIGURED" | "LIVE";
  providerCallsAuthorized: boolean;
  outboundPolicy: "DENY" | "ALLOWLIST";
  outboundAllowlist: string[];
  chatProvider: string;
  chatModel: string;
  chatBaseUrl: string;
  embeddingBaseUrl: string;
  embeddingProvider: string;
  embeddingModel: string;
  embeddingDimensions: number;
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

const approvedTargets = {
  chat: {
    provider: "deepseek",
    model: "deepseek/deepseek-flash",
    baseUrl: "https://api.deepseek.com/",
    credentialRef: "DEEPSEEK_API_KEY",
  },
  embedding: {
    provider: "siliconflow",
    model: "litellm_proxy/Qwen/Qwen3-Embedding-4B",
    baseUrl: "https://api.siliconflow.cn/v1",
    dimensions: 1024,
    credentialRef: "SILICONFLOW_API_KEY",
  },
} as const;

const canonicalSecureUrl = (value: string): string | null => {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) return null;
    return url.href;
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
  if (input.providerCallsAuthorized !== true) missing.push("explicit Provider-call authorization");
  if (input.chatProvider !== approvedTargets.chat.provider
    || input.chatModel !== approvedTargets.chat.model
    || input.chatCredentialRef !== approvedTargets.chat.credentialRef) missing.push("approved DeepSeek chat provider/model/credential mapping");
  if (input.embeddingProvider !== approvedTargets.embedding.provider
    || input.embeddingModel !== approvedTargets.embedding.model
    || input.embeddingDimensions !== approvedTargets.embedding.dimensions
    || input.embeddingCredentialRef !== approvedTargets.embedding.credentialRef) missing.push("approved SiliconFlow embedding provider/model/credential mapping");
  for (const ref of [input.chatCredentialRef, input.embeddingCredentialRef]) {
    if (!credentials[ref]?.trim()) missing.push(`credential ${ref}`);
  }
  if (input.outboundPolicy !== "ALLOWLIST") missing.push("outbound ALLOWLIST policy");
  const allowedAuthorities = input.outboundAllowlist.map(normalizeAllowlistEntry);
  if (allowedAuthorities.some((authority) => authority === null)) missing.push("valid exact-host outbound allowlist");
  const validAuthorities = allowedAuthorities.filter((authority): authority is string => authority !== null);
  const expectedAuthorities = ["api.deepseek.com", "api.siliconflow.cn"];
  if (new Set(validAuthorities).size !== validAuthorities.length
    || validAuthorities.length !== expectedAuthorities.length
    || expectedAuthorities.some((authority) => !validAuthorities.includes(authority))) {
    missing.push("outbound allowlist must match only the approved provider hosts");
  }
  for (const [label, baseUrl, approvedUrl] of [
    ["chat", input.chatBaseUrl, approvedTargets.chat.baseUrl],
    ["embedding", input.embeddingBaseUrl, approvedTargets.embedding.baseUrl],
  ] as const) {
    const authority = secureAuthorityOf(baseUrl);
    if (!authority) missing.push(`secure HTTPS endpoint for ${label}`);
    else if (!allowedAuthorities.includes(authority)) missing.push(`outbound authority ${authority}`);
    if (canonicalSecureUrl(baseUrl) !== approvedUrl) missing.push(`approved exact ${label} provider endpoint`);
  }
  // Configuration alone cannot make live calls safe: the production Provider
  // transport, invoice-grade cost reconciliation, and enforceable network/DNS
  // egress boundary are intentionally absent until their own evidence exists.
  missing.push("complete chat and embedding Provider adapters wired to runtime", "actual Provider cost reconciliation", "enforced network/DNS egress allowlist");
  return {
    status: missing.length === 0 ? "READY" : "BLOCKED",
    modelCalls: "NOT_RUN",
    missing,
    allowedHosts: allowedAuthorities.filter((authority): authority is string => authority !== null),
  };
}

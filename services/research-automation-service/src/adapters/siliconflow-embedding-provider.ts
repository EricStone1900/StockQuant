import { randomUUID } from "node:crypto";
import { calculateSiliconFlowEmbeddingCost } from "../application/v31-siliconflow-cost.js";
import { validateSiliconFlowEmbeddingResponse } from "../application/v31-siliconflow-embedding-response.js";
import type { ProviderCallEvidence } from "../application/v31-runtime-guards.js";

const ENDPOINT = "https://api.siliconflow.cn/v1/embeddings";
const MODEL = "Qwen/Qwen3-Embedding-4B";
const MAX_RESPONSE_BYTES = 16 * 1024 * 1024;

async function readResponseBodyWithinLimit(response: Response, maxBytes: number): Promise<Uint8Array> {
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel("response size limit exceeded");
        throw new Error("SiliconFlow response exceeds the size limit");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export type SiliconFlowEmbeddingReply = {
  embeddings: number[][];
  costCents: number;
  evidence: ProviderCallEvidence;
};

/** Fixed-host, non-streaming embedding transport. The provider response is never logged or persisted here. */
export class SiliconFlowEmbeddingProvider {
  constructor(
    private readonly apiKey: string,
    private readonly fetchImpl: typeof fetch,
    private readonly timeoutMs = 60_000,
    private readonly dimensions = 1024,
  ) {
    if (!apiKey.trim() || /[\r\n]/.test(apiKey)) throw new Error("SiliconFlow credential is missing or invalid");
    if (typeof fetchImpl !== "function") throw new Error("SiliconFlow restricted egress transport is required");
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 180_000) throw new Error("SiliconFlow timeout is outside the supported range");
    if (dimensions !== 1024) throw new Error("V3.1 SiliconFlow embedding dimensions must be 1024");
  }

  async embed(inputs: string[]): Promise<SiliconFlowEmbeddingReply> {
    if (!Array.isArray(inputs) || inputs.length < 1 || inputs.length > 128
      || inputs.some((input) => typeof input !== "string" || input.trim().length === 0)) throw new Error("SiliconFlow embedding inputs are invalid");
    const requestId = randomUUID();
    const body = JSON.stringify({ model: MODEL, input: inputs, dimensions: this.dimensions, encoding_format: "float" });
    if (new TextEncoder().encode(body).byteLength > 1024 * 1024) throw new Error("SiliconFlow request exceeds the size limit");
    const response = await this.fetchImpl(ENDPOINT, {
      method: "POST", redirect: "error",
      headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json", accept: "application/json", "X-Trace-Id": requestId },
      body, signal: AbortSignal.timeout(this.timeoutMs),
    });
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_RESPONSE_BYTES) throw new Error("SiliconFlow response exceeds the size limit");
    if (!response.ok) throw new Error(`SiliconFlow request failed with HTTP ${response.status}`);
    const responseBytes = await readResponseBodyWithinLimit(response, MAX_RESPONSE_BYTES);
    let decoded: unknown;
    try { decoded = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(responseBytes)); }
    catch { throw new Error("SiliconFlow returned invalid JSON"); }
    const validated = validateSiliconFlowEmbeddingResponse(decoded, { model: MODEL, dimensions: this.dimensions, inputCount: inputs.length });
    const cost = calculateSiliconFlowEmbeddingCost(validated.usage);
    const responseTraceId = response.headers.get("x-siliconcloud-trace-id")?.trim();
    const traceId = responseTraceId && responseTraceId.length <= 256 && !/[\r\n\0]/.test(responseTraceId) ? responseTraceId : requestId;
    return {
      embeddings: validated.data.map((item) => item.embedding),
      costCents: cost.reservationCents,
      evidence: {
        provider: "siliconflow", model: MODEL, requestId: traceId,
        inputTokens: cost.promptTokens, outputTokens: validated.usage.completion_tokens,
        tariffVersion: cost.tariffVersion, costBasis: "ESTIMATE", invoiceReconciliation: "NOT_PERFORMED",
      },
    };
  }
}

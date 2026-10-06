import type { ModelProviderAdapter, ModelGatewayReply } from "../application/v31-model-gateway.js";
import { calculateDeepSeekFlashCost, type DeepSeekPricingWindow } from "../application/v31-deepseek-cost.js";

const ENDPOINT = "https://api.deepseek.com/chat/completions";
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;

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
        throw new Error("DeepSeek response exceeds the size limit");
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

/** Production transport for the frozen DeepSeek model. It never follows redirects or logs request/response bodies. */
export class DeepSeekChatProvider implements ModelProviderAdapter {
  constructor(
    private readonly apiKey: string,
    private readonly pricingWindow: DeepSeekPricingWindow,
    private readonly fetchImpl: typeof fetch,
    private readonly timeoutMs = 60_000,
  ) {
    if (!apiKey.trim() || /[\r\n]/.test(apiKey)) throw new Error("DeepSeek credential is missing or invalid");
    if (typeof fetchImpl !== "function") throw new Error("DeepSeek restricted egress transport is required");
    if (pricingWindow !== "PEAK" && pricingWindow !== "OFF_PEAK") throw new Error("DeepSeek pricing window must be explicit");
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 180_000) throw new Error("DeepSeek timeout is outside the supported range");
  }

  async complete(payload: unknown): Promise<ModelGatewayReply> {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("DeepSeek request payload is invalid");
    const request = payload as Record<string, unknown>;
    if (!Array.isArray(request.messages) || request.messages.length < 1 || request.messages.length > 256
      || request.messages.some((message) => !message || typeof message !== "object" || Array.isArray(message))) throw new Error("DeepSeek chat messages are invalid");
    const body = JSON.stringify({ ...request, model: "deepseek-flash", stream: false });
    if (new TextEncoder().encode(body).byteLength > MAX_RESPONSE_BYTES) throw new Error("DeepSeek request exceeds the size limit");

    const response = await this.fetchImpl(ENDPOINT, {
      method: "POST",
      redirect: "error",
      headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json", accept: "application/json" },
      body,
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_RESPONSE_BYTES) throw new Error("DeepSeek response exceeds the size limit");
    if (!response.ok) {
      await response.body?.cancel("provider returned non-success status").catch(() => undefined);
      throw new Error(`DeepSeek request failed with HTTP ${response.status}`);
    }
    const responseBytes = await readResponseBodyWithinLimit(response, MAX_RESPONSE_BYTES);

    let decoded: unknown;
    try { decoded = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(responseBytes)); }
    catch { throw new Error("DeepSeek returned invalid JSON"); }
    if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) throw new Error("DeepSeek response shape is invalid");
    const record = decoded as Record<string, unknown>;
    if (record.object !== "chat.completion" || record.model !== "deepseek-flash" || !Array.isArray(record.choices) || record.choices.length !== 1) throw new Error("DeepSeek response model or choices are invalid");
    const choice = record.choices[0] as Record<string, unknown>;
    const message = choice?.message as Record<string, unknown> | undefined;
    if (choice?.index !== 0 || !message || message.role !== "assistant" || typeof message.content !== "string") throw new Error("DeepSeek assistant response is invalid");
    const usage = record.usage as Record<string, unknown> | undefined;
    const details = usage?.prompt_tokens_details as Record<string, unknown> | undefined;
    const cost = calculateDeepSeekFlashCost({
      prompt_tokens: usage?.prompt_tokens as number,
      completion_tokens: usage?.completion_tokens as number,
      total_tokens: usage?.total_tokens as number,
      prompt_cache_hit_tokens: usage?.prompt_cache_hit_tokens as number,
      prompt_cache_miss_tokens: usage?.prompt_cache_miss_tokens as number,
    }, this.pricingWindow);
    if (details && details.cached_tokens !== cost.usage.prompt_cache_hit_tokens) throw new Error("DeepSeek cached-token usage is inconsistent");
    if (typeof record.id !== "string" || !record.id || record.id.length > 256 || /[\r\n\0]/.test(record.id)) throw new Error("DeepSeek request trace ID is missing or invalid");

    return {
      response: { content: message.content, finishReason: choice.finish_reason ?? null },
      costCents: cost.reservationCents,
      evidence: {
        provider: "deepseek", model: "deepseek-flash", requestId: record.id,
        inputTokens: cost.usage.prompt_tokens, outputTokens: cost.usage.completion_tokens,
        tariffVersion: cost.tariffVersion, costBasis: "ESTIMATE", invoiceReconciliation: "NOT_PERFORMED",
      },
    };
  }
}

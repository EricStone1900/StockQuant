export type SiliconFlowEmbeddingUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

export type SiliconFlowEmbedding = { index: number; embedding: number[] };
export type SiliconFlowEmbeddingResponse = {
  model: string;
  data: SiliconFlowEmbedding[];
  usage: SiliconFlowEmbeddingUsage;
};

const nonNegativeSafeInteger = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;

export function validateSiliconFlowEmbeddingResponse(
  value: unknown,
  expected: { model: string; dimensions: number; inputCount: number },
): SiliconFlowEmbeddingResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("SiliconFlow embedding response must be an object");
  const response = value as Record<string, unknown>;
  if (response.object !== "list" || response.model !== expected.model) throw new Error("SiliconFlow embedding model or response object is unexpected");
  if (!Number.isSafeInteger(expected.dimensions) || expected.dimensions <= 0 || !Number.isSafeInteger(expected.inputCount) || expected.inputCount <= 0) throw new Error("SiliconFlow expected dimensions and input count must be positive safe integers");
  if (!Array.isArray(response.data) || response.data.length !== expected.inputCount) throw new Error("SiliconFlow embedding count does not match the request");

  const data = response.data.map((item, position): SiliconFlowEmbedding => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("SiliconFlow embedding item is invalid");
    const record = item as Record<string, unknown>;
    if (record.object !== "embedding" || record.index !== position || !Array.isArray(record.embedding) || record.embedding.length !== expected.dimensions
      || record.embedding.some((component) => typeof component !== "number" || !Number.isFinite(component))) throw new Error("SiliconFlow embedding index, dimension, or values are invalid");
    return { index: position, embedding: record.embedding as number[] };
  });

  if (!response.usage || typeof response.usage !== "object" || Array.isArray(response.usage)) throw new Error("SiliconFlow embedding usage is missing");
  const usage = response.usage as Record<string, unknown>;
  if (!nonNegativeSafeInteger(usage.prompt_tokens) || !nonNegativeSafeInteger(usage.completion_tokens) || !nonNegativeSafeInteger(usage.total_tokens)
    || usage.total_tokens !== usage.prompt_tokens + usage.completion_tokens || usage.total_tokens === 0) throw new Error("SiliconFlow embedding usage is incomplete or inconsistent");

  return {
    model: expected.model,
    data,
    usage: { prompt_tokens: usage.prompt_tokens, completion_tokens: usage.completion_tokens, total_tokens: usage.total_tokens },
  };
}

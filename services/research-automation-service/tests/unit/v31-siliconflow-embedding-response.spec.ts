import { describe, expect, it } from "vitest";
import { validateSiliconFlowEmbeddingResponse } from "../../src/application/v31-siliconflow-embedding-response.js";

const expected = { model: "Qwen/Qwen3-Embedding-4B", dimensions: 3, inputCount: 2 };
const response = {
  object: "list",
  model: expected.model,
  data: [
    { object: "embedding", index: 0, embedding: [0.1, 0.2, 0.3] },
    { object: "embedding", index: 1, embedding: [-0.1, 0.4, 0.5] },
  ],
  usage: { prompt_tokens: 16, completion_tokens: 0, total_tokens: 16 },
};

describe("SiliconFlow embedding response validation", () => {
  it("retains only validated model, ordered configured-dimension vectors, and consistent usage", () => {
    expect(validateSiliconFlowEmbeddingResponse(response, expected)).toEqual({
      model: expected.model,
      data: response.data.map(({ index, embedding }) => ({ index, embedding })),
      usage: response.usage,
    });
  });

  it("rejects model substitution, vector count/index/dimension errors and malformed usage", () => {
    expect(() => validateSiliconFlowEmbeddingResponse({ ...response, model: "other-model" }, expected)).toThrow("unexpected");
    expect(() => validateSiliconFlowEmbeddingResponse({ ...response, data: response.data.slice(0, 1) }, expected)).toThrow("count");
    expect(() => validateSiliconFlowEmbeddingResponse({ ...response, data: [{ ...response.data[0], index: 1 }, response.data[1]] }, expected)).toThrow("index");
    expect(() => validateSiliconFlowEmbeddingResponse({ ...response, data: [{ ...response.data[0], embedding: [0.1, Number.NaN, 0.3] }, response.data[1]] }, expected)).toThrow("dimension");
    expect(() => validateSiliconFlowEmbeddingResponse({ ...response, usage: { ...response.usage, total_tokens: 15 } }, expected)).toThrow("usage");
    expect(() => validateSiliconFlowEmbeddingResponse({ ...response, usage: { ...response.usage, total_tokens: 0, prompt_tokens: 0 } }, expected)).toThrow("usage");
  });
});

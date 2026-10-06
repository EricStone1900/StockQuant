import { describe, expect, it, vi } from "vitest";
import { SiliconFlowEmbeddingProvider } from "../../src/adapters/siliconflow-embedding-provider.js";

const makeBody = (count = 2) => ({
  object: "list", model: "Qwen/Qwen3-Embedding-4B",
  data: Array.from({ length: count }, (_, index) => ({ object: "embedding", index, embedding: Array.from({ length: 1024 }, () => 0.125 + index) })),
  usage: { prompt_tokens: 4, completion_tokens: 0, total_tokens: 4 },
});

describe("SiliconFlow embedding provider transport", () => {
  it("fails closed when no restricted egress transport is supplied", () => {
    expect(() => new SiliconFlowEmbeddingProvider("fixture-key", undefined as unknown as typeof fetch)).toThrow("restricted egress transport is required");
  });

  it("uses fixed model and endpoint, preserves trace/usage, validates vectors, and reports estimate-only cost", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(makeBody()), { status: 200, headers: { "content-type": "application/json", "x-siliconcloud-trace-id": "trace-fixture-42" } }));
    const provider = new SiliconFlowEmbeddingProvider("fixture-secret", fetchMock);
    const reply = await provider.embed(["fixture one", "fixture two"]);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.siliconflow.cn/v1/embeddings");
    expect(init?.redirect).toBe("error");
    expect(init?.headers).toMatchObject({ authorization: "Bearer fixture-secret", "X-Trace-Id": expect.any(String) });
    expect(JSON.parse(String(init?.body))).toEqual({ model: "Qwen/Qwen3-Embedding-4B", input: ["fixture one", "fixture two"], dimensions: 1024, encoding_format: "float" });
    expect(reply.embeddings).toHaveLength(2);
    expect(reply.embeddings[0]).toHaveLength(1024);
    expect(reply).toMatchObject({ costCents: 1, evidence: { provider: "siliconflow", requestId: "trace-fixture-42", inputTokens: 4, outputTokens: 0, costBasis: "ESTIMATE", invoiceReconciliation: "NOT_PERFORMED" } });
    expect(JSON.stringify(reply)).not.toContain("fixture-secret");
  });

  it("rejects invalid inputs before transport and redacts provider error bodies", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response("sensitive vendor payload", { status: 429 }));
    const provider = new SiliconFlowEmbeddingProvider("fixture-secret", fetchMock);
    await expect(provider.embed(["  "])).rejects.toThrow("inputs are invalid");
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(provider.embed(["valid text"])).rejects.toThrow("HTTP 429");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("rejects malformed vectors, usage, model identity and redirect responses", async () => {
    const create = (body: unknown) => new SiliconFlowEmbeddingProvider("fixture-secret", async () => new Response(JSON.stringify(body), { status: 200 }));
    await expect(create(makeBody(1)).embed(["a", "b"])).rejects.toThrow("count");
    await expect(create({ ...makeBody(), model: "unexpected" }).embed(["a", "b"])).rejects.toThrow("unexpected");
    await expect(create({ ...makeBody(), usage: { prompt_tokens: 4, completion_tokens: 0, total_tokens: 9 } }).embed(["a", "b"])).rejects.toThrow("usage");
    const redirect = new SiliconFlowEmbeddingProvider("fixture-secret", async () => new Response(null, { status: 302 }));
    await expect(redirect.embed(["a"])).rejects.toThrow("HTTP 302");
  });

  it("cancels an oversized streamed response before buffering the complete body", async () => {
    let chunksSent = 0;
    let streamCancelled = false;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        chunksSent += 1;
        controller.enqueue(new Uint8Array(6 * 1024 * 1024));
        if (chunksSent === 4) controller.close();
      },
      cancel() { streamCancelled = true; },
    }, { highWaterMark: 0 });
    const provider = new SiliconFlowEmbeddingProvider("fixture-secret", async () => new Response(body, { status: 200 }));

    await expect(provider.embed(["fixture text"])).rejects.toThrow("response exceeds the size limit");
    expect(chunksSent).toBeLessThan(4);
    expect(streamCancelled).toBe(true);
  });
});

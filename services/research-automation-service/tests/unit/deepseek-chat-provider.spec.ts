import { describe, expect, it, vi } from "vitest";
import { DeepSeekChatProvider } from "../../src/adapters/deepseek-chat-provider.js";

const providerBody = {
  id: "chatcmpl-fixture-001", object: "chat.completion", model: "deepseek-flash",
  choices: [{ index: 0, finish_reason: "stop", message: { role: "assistant", content: "fixed fixture output" } }],
  usage: { prompt_tokens: 100, completion_tokens: 10, total_tokens: 110, prompt_cache_hit_tokens: 25, prompt_cache_miss_tokens: 75, prompt_tokens_details: { cached_tokens: 25 } },
};

describe("DeepSeek chat provider transport", () => {
  it("fails closed when no restricted egress transport is supplied", () => {
    expect(() => new DeepSeekChatProvider("fixture-key", "OFF_PEAK", undefined as unknown as typeof fetch)).toThrow("restricted egress transport is required");
  });

  it("uses the frozen endpoint/model, records only trace and usage evidence, and estimates cost", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(providerBody), { status: 200, headers: { "content-type": "application/json" } }));
    const provider = new DeepSeekChatProvider("test-secret-not-logged", "OFF_PEAK", fetchMock);
    const reply = await provider.complete({ messages: [{ role: "user", content: "fixture only" }], model: "untrusted-override", stream: true });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.deepseek.com/chat/completions");
    expect(init?.redirect).toBe("error");
    expect(init?.headers).toMatchObject({ authorization: "Bearer test-secret-not-logged" });
    expect(JSON.parse(String(init?.body))).toMatchObject({ model: "deepseek-flash", stream: false });
    expect(reply).toMatchObject({
      costCents: 1,
      response: { content: "fixed fixture output", finishReason: "stop" },
      evidence: { provider: "deepseek", model: "deepseek-flash", requestId: "chatcmpl-fixture-001", inputTokens: 100, outputTokens: 10, costBasis: "ESTIMATE", invoiceReconciliation: "NOT_PERFORMED" },
    });
    expect(JSON.stringify(reply)).not.toContain("test-secret-not-logged");
  });

  it("rejects invalid payloads before transport and never exposes provider error bodies", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response("sensitive vendor body", { status: 500 }));
    const provider = new DeepSeekChatProvider("fixture-key", "PEAK", fetchMock);
    await expect(provider.complete({ messages: [] })).rejects.toThrow("messages are invalid");
    expect(fetchMock).not.toHaveBeenCalled();
    await expect(provider.complete({ messages: [{ role: "user", content: "x" }] })).rejects.toThrow("HTTP 500");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects inconsistent usage, wrong model, invalid trace IDs, and redirect responses", async () => {
    const make = (body: unknown) => new DeepSeekChatProvider("fixture-key", "OFF_PEAK", async () => new Response(JSON.stringify(body), { status: 200 }));
    await expect(make({ ...providerBody, usage: { ...providerBody.usage, total_tokens: 1 } }).complete({ messages: [{ role: "user", content: "x" }] })).rejects.toThrow("inconsistent");
    await expect(make({ ...providerBody, model: "other-model" }).complete({ messages: [{ role: "user", content: "x" }] })).rejects.toThrow("response model");
    await expect(make({ ...providerBody, id: "bad\ntrace" }).complete({ messages: [{ role: "user", content: "x" }] })).rejects.toThrow("trace ID");
    const redirect = new DeepSeekChatProvider("fixture-key", "OFF_PEAK", async () => new Response(null, { status: 302 }));
    await expect(redirect.complete({ messages: [{ role: "user", content: "x" }] })).rejects.toThrow("HTTP 302");
  });

  it("cancels an oversized streamed response before buffering the complete body", async () => {
    let chunksSent = 0;
    let streamCancelled = false;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        chunksSent += 1;
        controller.enqueue(new Uint8Array(3 * 1024 * 1024));
        if (chunksSent === 4) controller.close();
      },
      cancel() { streamCancelled = true; },
    }, { highWaterMark: 0 });
    const provider = new DeepSeekChatProvider("fixture-key", "OFF_PEAK", async () => new Response(body, { status: 200 }));

    await expect(provider.complete({ messages: [{ role: "user", content: "x" }] })).rejects.toThrow("response exceeds the size limit");
    expect(chunksSent).toBeLessThan(4);
    expect(streamCancelled).toBe(true);
  });
});

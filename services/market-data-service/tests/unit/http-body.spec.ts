import { PassThrough } from "node:stream";
import { describe, expect, it } from "vitest";
import { HttpBodyTooLargeError, readHttpBody } from "../../src/http-body.js";

describe("bounded HTTP body reader", () => {
  it("accepts a UTF-8 body whose encoded byte size equals the limit", async () => {
    const request = new PassThrough();
    const result = readHttpBody(request, 4);
    request.end("你a");
    await expect(result).resolves.toBe("你a");
  });

  it("counts UTF-8 bytes rather than Unicode characters and rejects over-limit input as 413", async () => {
    const request = new PassThrough();
    const result = readHttpBody(request, 3);
    request.end("你a");
    await expect(result).rejects.toMatchObject<HttpBodyTooLargeError>({ statusCode: 413, maxBytes: 3 });
  });

  it("does not retain an oversized body while draining the request", async () => {
    const request = new PassThrough();
    const result = readHttpBody(request, 2);
    request.write(Buffer.from("abc"));
    request.end(Buffer.from("discarded"));
    await expect(result).rejects.toBeInstanceOf(HttpBodyTooLargeError);
  });
});

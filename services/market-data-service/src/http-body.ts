import type { IncomingMessage } from "node:http";

export class HttpBodyTooLargeError extends Error {
  readonly statusCode = 413;
  constructor(readonly maxBytes: number) {
    super(`request body exceeds ${maxBytes} bytes`);
    this.name = "HttpBodyTooLargeError";
  }
}

/** Read a bounded UTF-8 request body, measuring wire bytes rather than JS characters. */
export function readHttpBody(request: IncomingMessage, maxBytes = 1_000_000): Promise<string> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 0) return Promise.reject(new Error("request body limit must be a non-negative safe integer"));
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalBytes = 0;
    let tooLarge = false;
    request.on("data", (chunk: Buffer | string) => {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      totalBytes += bytes.byteLength;
      if (totalBytes > maxBytes) {
        tooLarge = true;
        chunks.length = 0;
      } else if (!tooLarge) {
        chunks.push(bytes);
      }
    });
    request.once("end", () => {
      if (tooLarge) reject(new HttpBodyTooLargeError(maxBytes));
      else resolve(Buffer.concat(chunks).toString("utf8"));
    });
    request.once("error", reject);
    request.once("aborted", () => reject(new Error("request body was aborted")));
  });
}

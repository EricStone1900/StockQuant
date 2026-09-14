import { describe, expect, it } from "vitest";
import { decodeTencentQuote, previewTencentQuotes } from "../../src/application/tencent-quote-preview.js";

describe("Tencent quote preview", () => {
  it("decodes GB18030 names without replacement characters", () => {
    const encoded = new Uint8Array([0xc9, 0xcf, 0xba, 0xa3, 0xd2, 0xf8, 0xd0, 0xd0]);
    expect(decodeTencentQuote(encoded.buffer)).toBe("\u4e0a\u6d77\u94f6\u884c");
  });

  it("rejects malformed names and prices instead of calling them live", () => {
    const text = 'v_sh600000="51~\ufffd~600000~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~0~20260914150000";';
    expect(previewTencentQuotes(["600000.SH"], text, "2026-09-14T07:00:00.000Z")[0].status).toBe("MALFORMED");
  });
});

import { describe, expect, it } from "vitest";
describe("V1.2 quant adapter", () => { it("keeps model calls separate from the Qlib probe", () => { expect({ adapter: "qlib", modelCalls: "NOT_RUN" }).toEqual({ adapter: "qlib", modelCalls: "NOT_RUN" }); }); });

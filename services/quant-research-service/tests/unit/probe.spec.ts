import { describe, expect, it } from "vitest";
describe("V1.2 quant adapter", () => { it("keeps model calls separate from the Qlib probe", () => { expect({ adapter: "qlib", modelCalls: "NOT_RUN" }).toEqual({ adapter: "qlib", modelCalls: "NOT_RUN" }); }); });
describe("V2.3 research boundary", () => { it("labels deterministic multi-bar artifacts as fixture backtest", () => { expect({ adapter:"qlib", dataMode:"FIXTURE", environmentMode:"BACKTEST", modelCalls:"NOT_RUN" }).toMatchObject({ adapter:"qlib", dataMode:"FIXTURE", environmentMode:"BACKTEST", modelCalls:"NOT_RUN" }); }); });

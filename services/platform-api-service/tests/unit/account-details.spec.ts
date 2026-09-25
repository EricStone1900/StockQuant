import { afterEach, describe, expect, it, vi } from "vitest";
import { PlatformController } from "../../src/bootstrap/app.module.js";

describe("account detail owner boundary", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("forwards the authenticated owner to portfolio and returns evidence", async () => {
    const snapshot = { accountId: "account-1", market: "CN_A", cash: { amount: "10000.0000", currency: "CNY" }, positionCount: 0, ledgerEntryCount: 1, ledgerVersion: 1, environmentMode: "PAPER", brokerMode: "FAKE" };
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      expect((init.headers as Record<string, string>)["x-stockquant-owner-id"]).toBe("acceptance-owner-1");
      return new Response(JSON.stringify(snapshot), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const controller = new PlatformController({ portfolioApiUrl: "http://portfolio" } as any);
    await expect(controller.account("sq_session=acceptance-owner-1", undefined, "account-1")).resolves.toMatchObject({
      evidenceVersion: "v1-account-detail-1",
      account: snapshot
    });
  });

  it("rejects a portfolio owner-scope denial", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: "account is outside owner scope" }), { status: 403 })));
    const controller = new PlatformController({ portfolioApiUrl: "http://portfolio" } as any);
    await expect(controller.account("sq_session=acceptance-owner-1", undefined, "account-2")).rejects.toThrow("account is outside owner scope");
  });

  it("initializes a US account under the same owner and TestRun namespace", async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body));
      expect(body.market).toBe("US_EQUITY");
      expect(body.initialCash).toEqual({ amount: "10000.00", currency: "USD" });
      expect(body.namespace).toBe("v1-1-normal-run-1-us-equity");
      return new Response(JSON.stringify({ replayed: false, snapshot: { accountId: "us-account-1", market: "US_EQUITY", cash: { amount: "10000.0000", currency: "USD" }, positionCount: 0, ledgerEntryCount: 1 } }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    const controller = new PlatformController({
      portfolioApiUrl: "http://portfolio",
      repository: { find: vi.fn(async () => ({ testRunId: "run-1", stageId: "V1.1", namespace: "v1-1-normal-run-1" })) }
    } as any);
    await expect(controller.initializeUsAccount("sq_session=acceptance-owner-1", undefined, "run-1")).resolves.toMatchObject({
      evidenceVersion: "v1-dual-account-1",
      account: { accountId: "us-account-1", market: "US_EQUITY" }
    });
  });
});

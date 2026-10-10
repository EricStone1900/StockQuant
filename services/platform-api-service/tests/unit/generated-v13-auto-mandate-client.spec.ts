import { afterEach, describe, expect, it, vi } from "vitest";
import { GeneratedPlatformV13AutoMandateClient } from "../../src/contracts/generated-v13-auto-mandate-client.js";
import type * as Contracts from "../../src/contracts/generated-types.js";

const token = "p".repeat(40);
const mandateId = "mandate/id";
const testRunId = "run id";
const ownerId = "owner-1";
const actorId = "actor-1";
const command: Contracts.V13AutoMandateCommand = {
  mandateId,
  mandateVersion: 1,
  testRunId,
  accountId: "account-1",
  strategyVersion: "fixture-auto-policy-test-v1",
  market: "CN_A",
  currency: "CNY",
  securityScope: ["600000.SH"],
  maxOrderAmount: "1000.00",
  maxTotalAmount: "2000.00",
  maxOrderCount: 2,
  validFrom: "2026-09-25T01:00:00.000Z",
  expiresAt: "2026-09-25T07:00:00.000Z",
  reason: "approved fixture test",
  now: "2026-09-25T01:00:00.000Z",
};
const transition: Contracts.V13AutoMandateTransitionCommand = {
  mandateVersion: 1,
  testRunId,
  contentHash: "a".repeat(64),
  reason: "approve exact mandate version",
  now: "2026-09-25T01:01:00.000Z",
};

describe("GeneratedPlatformV13AutoMandateClient", () => {
  afterEach(() => vi.restoreAllMocks());

  it("maps all Platform Mandate operations to their V1 contract and owner/actor scope", async () => {
    const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
    const request = vi.fn<typeof fetch>().mockImplementation(async () => Response.json({ accepted: true }, { status: 200 }));
    const client = new GeneratedPlatformV13AutoMandateClient("http://governance.test/", token, request);

    await client.create(command, ownerId, actorId);
    await client.read(mandateId, testRunId, ownerId);
    await client.readBudget(mandateId, testRunId, 3, ownerId, 1250);
    await client.activate(mandateId, transition, ownerId, actorId);
    await client.pause(mandateId, transition, ownerId, actorId);

    const expected = [
      ["POST", "http://governance.test/internal/v1/auto-mandates", ownerId, actorId, command],
      ["GET", "http://governance.test/internal/v1/auto-mandates/mandate%2Fid/runs/run%20id", ownerId, undefined, undefined],
      ["GET", "http://governance.test/internal/v1/auto-mandates/mandate%2Fid/runs/run%20id/versions/3/budget", ownerId, undefined, undefined],
      ["POST", "http://governance.test/internal/v1/auto-mandates/mandate%2Fid/activate", ownerId, actorId, transition],
      ["POST", "http://governance.test/internal/v1/auto-mandates/mandate%2Fid/pause", ownerId, actorId, transition],
    ] as const;

    expect(request).toHaveBeenCalledTimes(expected.length);
    expect(timeoutSpy.mock.calls.map(([timeoutMs]) => timeoutMs)).toEqual([5000, 5000, 1250, 5000, 5000]);
    for (const [index, [method, url, expectedOwner, expectedActor, body]] of expected.entries()) {
      const [input, init] = request.mock.calls[index]!;
      const headers = new Headers(init?.headers);
      expect(String(input)).toBe(url);
      expect(init?.method).toBe(method);
      expect(headers.get("x-stockquant-service-id")).toBe("platform-api-service");
      expect(headers.get("authorization")).toBe(`Bearer ${token}`);
      expect(headers.get("x-stockquant-owner-id")).toBe(expectedOwner);
      expect(headers.get("x-stockquant-actor-id")).toBe(expectedActor ?? null);
      if (body === undefined) expect(init?.body).toBeUndefined();
      else {
        expect(headers.get("content-type")).toBe("application/json");
        expect(JSON.parse(String(init?.body))).toEqual(body);
      }
      expect(init?.signal).toBeInstanceOf(AbortSignal);
    }
  });

  it("rejects invalid mandate versions before making a budget request", async () => {
    const request = vi.fn<typeof fetch>();
    const client = new GeneratedPlatformV13AutoMandateClient("http://governance.test", token, request);
    await expect(client.readBudget(mandateId, testRunId, 0, ownerId)).rejects.toThrow("positive integer");
    await expect(client.readBudget(mandateId, testRunId, 1.5, ownerId)).rejects.toThrow("positive integer");
    expect(request).not.toHaveBeenCalled();
  });
});

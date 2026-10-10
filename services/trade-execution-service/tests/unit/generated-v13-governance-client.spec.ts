import { afterEach, describe, expect, it, vi } from "vitest";
import { GeneratedTradeV13GovernanceClient } from "../../src/contracts/generated-v13-governance-client.js";
import type * as Contracts from "../../src/contracts/generated-types.js";

const token = "t".repeat(40);
const proposalId = "proposal/id";
const authorization: Contracts.V13ExecutionAuthorizationCommand = {
  proposalVersion: 3,
  contentHash: "a".repeat(64),
  ownerId: "owner-1",
  testRunId: "run-1",
  accountId: "account-1",
  clientOrderId: "order-1",
  commandHash: "b".repeat(64),
  now: "2026-10-10T09:30:00.000Z",
};
const validation: Contracts.V13ExecutionAuthorizationValidation = {
  authorizationId: "authorization-1",
  ...authorization,
};

describe("GeneratedTradeV13GovernanceClient", () => {
  afterEach(() => vi.restoreAllMocks());

  it("reads the owner-scoped proposal and preserves the Governance response", async () => {
    const response = Response.json({ ownerId: "owner-1", testRunId: "run-1" }, { status: 200 });
    const request = vi.fn<typeof fetch>().mockResolvedValue(response);
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const client = new GeneratedTradeV13GovernanceClient("http://governance.test/", token, request);

    await expect(client.readProposal(proposalId, "owner-1")).resolves.toMatchObject({ status: 200, body: { ownerId: "owner-1", testRunId: "run-1" } });
    expect(request).toHaveBeenCalledTimes(1);
    expect(String(request.mock.calls[0]![0])).toBe("http://governance.test/internal/v1/proposals/proposal%2Fid");
    const init = request.mock.calls[0]![1];
    const headers = new Headers(init?.headers);
    expect(init?.method).toBe("GET");
    expect(init?.body).toBeUndefined();
    expect(headers.get("x-stockquant-service-id")).toBe("trade-execution-service");
    expect(headers.get("authorization")).toBe(`Bearer ${token}`);
    expect(headers.get("x-stockquant-owner-id")).toBe("owner-1");
    expect(timeout).toHaveBeenCalledWith(5000);
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("creates the execution authorization with the exact command and scoped Trade identity", async () => {
    const response = Response.json({ authorizationId: "authorization-1", status: "ACTIVE" }, { status: 201 });
    const request = vi.fn<typeof fetch>().mockResolvedValue(response);
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const client = new GeneratedTradeV13GovernanceClient("http://governance.test", token, request);

    await expect(client.authorizeExecution(proposalId, authorization)).resolves.toMatchObject({ status: 201, body: { authorizationId: "authorization-1", status: "ACTIVE" } });
    expect(String(request.mock.calls[0]![0])).toBe("http://governance.test/internal/v1/proposals/proposal%2Fid/execution-authorizations");
    const init = request.mock.calls[0]![1];
    const headers = new Headers(init?.headers);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual(authorization);
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("x-stockquant-service-id")).toBe("trade-execution-service");
    expect(headers.get("authorization")).toBe(`Bearer ${token}`);
    expect(timeout).toHaveBeenCalledWith(5000);
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("validates the same authorization binding at the exact route", async () => {
    const response = Response.json({ valid: true, authorizationId: "authorization-1" }, { status: 200 });
    const request = vi.fn<typeof fetch>().mockResolvedValue(response);
    const timeout = vi.spyOn(AbortSignal, "timeout");
    const client = new GeneratedTradeV13GovernanceClient("http://governance.test", token, request);

    await expect(client.validateExecution(proposalId, validation)).resolves.toMatchObject({ status: 200, body: { valid: true, authorizationId: "authorization-1" } });
    expect(String(request.mock.calls[0]![0])).toBe("http://governance.test/internal/v1/proposals/proposal%2Fid/execution-authorizations/validate");
    const init = request.mock.calls[0]![1];
    const headers = new Headers(init?.headers);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual(validation);
    expect(headers.get("content-type")).toBe("application/json");
    expect(headers.get("x-stockquant-service-id")).toBe("trade-execution-service");
    expect(headers.get("authorization")).toBe(`Bearer ${token}`);
    expect(timeout).toHaveBeenCalledWith(5000);
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });
});

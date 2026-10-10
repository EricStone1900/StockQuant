import { describe, expect, it, vi } from "vitest";
import { GeneratedV13ProposalClient } from "../../src/contracts/generated-v13-proposal-client.js";
import type * as Contracts from "../../src/contracts/generated-types.js";

const token = "platform-service-token-abcdefghijklmnopqrstuvwxyz";
const proposalId = "proposal/with slash";
const client = (request: typeof fetch) => new GeneratedV13ProposalClient("http://governance.local/", token, request);

describe("Generated V1.3 Proposal client", () => {
  it("creates a proposal with the Platform service identity and typed payload", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ status: 201 }), { status: 201 }));
    const body: Contracts.V13ProposalCommand = {
      ownerId: "owner-a", testRunId: "run-a", idempotencyKey: "proposal-create-1", accountId: "account-a", strategyVersion: "fixture-v1",
      approvalMode: "MANUAL_APPROVAL", market: "CN_A", currency: "CNY", operation: "REBALANCE", environmentMode: "PAPER", brokerMode: "FAKE",
      expiresAt: "2026-10-10T12:00:00Z", legs: [{ legId: "leg-1", securityId: "600000.SH", side: "BUY", quantity: 10 }],
    };

    await client(request).createProposal(body);

    expect(request).toHaveBeenCalledWith("http://governance.local/internal/v1/proposals", expect.objectContaining({
      method: "POST", headers: expect.objectContaining({ "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${token}` }),
      body: JSON.stringify(body), signal: expect.any(AbortSignal),
    }));
  });

  it("reads a proposal using the encoded ID and owner scope without a body", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ status: "MANUAL_APPROVAL_PENDING" }), { status: 200 }));

    await client(request).readProposal(proposalId, "owner-a");

    expect(request).toHaveBeenCalledWith("http://governance.local/internal/v1/proposals/proposal%2Fwith%20slash", expect.objectContaining({
      method: "GET", headers: expect.objectContaining({ "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${token}`, "x-stockquant-owner-id": "owner-a" }), signal: expect.any(AbortSignal),
    }));
    expect(request.mock.calls[0]?.[1]).not.toHaveProperty("body");
  });

  it("uses separate approve and reject routes with actor identity and exact decision body", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ status: 200 }), { status: 200 }));
    const body: Contracts.V13ProposalDecisionCommand = { expectedVersion: 3, expectedContentHash: "a".repeat(64), reason: "fixed decision", now: "2026-10-10T09:00:00Z" };
    const api = client(request);

    await api.decideProposal(proposalId, "approve", "actor-a", body);
    await api.decideProposal(proposalId, "reject", "actor-a", body);

    expect(request.mock.calls.map(([url]) => url)).toEqual([
      "http://governance.local/internal/v1/proposals/proposal%2Fwith%20slash/approve",
      "http://governance.local/internal/v1/proposals/proposal%2Fwith%20slash/reject",
    ]);
    for (const [, init] of request.mock.calls) {
      expect(init).toMatchObject({ method: "POST", headers: expect.objectContaining({ "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${token}`, "x-stockquant-actor-id": "actor-a" }), body: JSON.stringify(body), signal: expect.any(AbortSignal) });
    }
  });

  it("revises a proposal with encoded ID, owner and actor scope", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ proposalVersion: 4 }), { status: 200 }));
    const body: Contracts.V13ProposalRevisionCommand = { expectedVersion: 3, expectedContentHash: "b".repeat(64), operation: "HOLD", expiresAt: "2026-10-10T12:00:00Z", legs: [], reason: "fixed revision", now: "2026-10-10T09:00:00Z" };

    await client(request).reviseProposal(proposalId, "owner-a", "actor-a", body);

    expect(request).toHaveBeenCalledWith("http://governance.local/internal/v1/proposals/proposal%2Fwith%20slash/revise", expect.objectContaining({
      method: "POST", headers: expect.objectContaining({ "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${token}`, "x-stockquant-owner-id": "owner-a", "x-stockquant-actor-id": "actor-a" }),
      body: JSON.stringify(body), signal: expect.any(AbortSignal),
    }));
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { GeneratedPlatformV12StrategySnapshotClient } from "../../src/contracts/generated-v12-strategy-snapshot-client.js";
import type { V12StrategySnapshotCommand } from "../../src/contracts/generated-types.js";

describe("generated Platform V1.2 strategy snapshot client", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sends the typed snapshot command to Governance with service identity and bounded timeout", async () => {
    const command = {
      ownerId: "acceptance-owner-1",
      testRunId: "033359f0-5db8-4469-96d1-8e708b46446e",
      artifactId: "a".repeat(64),
      artifactSha256: "b".repeat(64),
      fixtureVersion: "v1.2-market-data-5",
      dataVersion: "v1.2-market-data-5",
      factorVersion: "v1.2-momentum-volume-1",
      strategyId: "v1.2-no-trade-1",
      strategyHash: "c".repeat(64),
      mode: "NO_TRADE",
      asOf: "2024-03-22",
      targets: []
    } satisfies V12StrategySnapshotCommand;
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(new AbortController().signal);
    const request = vi.fn(async () => new Response(JSON.stringify({ snapshotId: "snap-1", status: "RECEIVED", replayed: false }), { status: 201 }));
    const client = new GeneratedPlatformV12StrategySnapshotClient("http://governance/", "a".repeat(32), request as typeof fetch);

    await expect(client.receiveStrategySnapshot(command)).resolves.toMatchObject({ status: 201, body: { snapshotId: "snap-1" } });

    expect(request.mock.calls.map(([input, init]) => [String(input), init?.method, init?.headers, init?.body, init?.signal])).toEqual([
      ["http://governance/internal/v1/v12/strategy-snapshots", "POST", { "content-type": "application/json", "x-stockquant-service-id": "platform-api-service", authorization: `Bearer ${"a".repeat(32)}` }, JSON.stringify(command), expect.any(AbortSignal)]
    ]);
    expect(timeout.mock.calls).toEqual([[5000]]);
  });

  it("rejects invalid Governance URL and missing Platform token", () => {
    expect(() => new GeneratedPlatformV12StrategySnapshotClient("governance", "a".repeat(32))).toThrow("Decision Governance base URL must be HTTP(S)");
    expect(() => new GeneratedPlatformV12StrategySnapshotClient("http://governance", "short")).toThrow("Platform service bearer token is not configured");
  });
});

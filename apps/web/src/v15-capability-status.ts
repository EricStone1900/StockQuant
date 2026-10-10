export type V15CapabilityEvidence = {
  workflow?: unknown;
  nats?: unknown;
  temporal?: unknown;
  businessExecution?: unknown;
};

export type V15CapabilityRow = { capability: string; status: string; blocked: boolean };

function statusValue(value: unknown): string {
  return typeof value === "string" && value.length > 0 ? value : "NOT_REPORTED";
}

function isBlocked(status: string): boolean {
  return status === "NOT_CONNECTED" || status === "UNAVAILABLE" || /(?:^|_)(?:FAILED|ERROR|UNAVAILABLE)$/u.test(status);
}

export function getV15CapabilityRows(evidence: V15CapabilityEvidence): V15CapabilityRow[] {
  const values = [
    ["Durable workflow dispatch", evidence.workflow],
    ["NATS delivery", evidence.nats],
    ["Temporal worker", evidence.temporal],
    ["Domain execution", evidence.businessExecution],
  ] as const;
  return values.map(([capability, value]) => {
    const status = statusValue(value);
    return { capability, status, blocked: isBlocked(status) };
  });
}

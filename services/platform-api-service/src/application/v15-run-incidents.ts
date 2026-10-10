export type V15RunIncidentCandidate = {
  alertKey: string;
  code: string;
  severity: "BLOCKER" | "ERROR";
  title: string;
  detail: Record<string, unknown>;
};

const capabilityLabels = {
  workflow: "Durable workflow dispatch",
  nats: "NATS delivery",
  temporal: "Temporal worker",
  businessExecution: "Domain execution",
} as const;

function isExplicitBlocker(value: unknown): value is string {
  return typeof value === "string" && (
    value === "NOT_CONNECTED" || value === "UNAVAILABLE" || /(?:^|_)(?:FAILED|ERROR|UNAVAILABLE)$/u.test(value)
  );
}

/** Build run-scoped operational incidents only from persisted failure/block evidence. */
export function deriveV15RunIncidentCandidates(
  evidence: Record<string, unknown>,
  assertions: unknown[],
): V15RunIncidentCandidate[] {
  const incidents: V15RunIncidentCandidate[] = [];
  for (const [key, title] of Object.entries(capabilityLabels)) {
    const status = evidence[key];
    if (!isExplicitBlocker(status)) continue;
    incidents.push({
      alertKey: `capability:${key}`,
      code: `V15_${key.replace(/[A-Z]/gu, (letter) => `_${letter}`).toUpperCase()}_BLOCKED`,
      severity: "BLOCKER",
      title: `${title} is blocked`,
      detail: { capability: key, status },
    });
  }
  for (const item of assertions) {
    if (typeof item !== "object" || item === null) continue;
    const assertion = item as Record<string, unknown>;
    if (assertion.status !== "FAIL" || typeof assertion.assertionId !== "string" || !assertion.assertionId) continue;
    incidents.push({
      alertKey: `assertion:${assertion.assertionId}`,
      code: "V15_ASSERTION_FAILED",
      severity: "ERROR",
      title: `Run assertion ${assertion.assertionId} failed`,
      detail: { assertionId: assertion.assertionId, expected: assertion.expected ?? null, actual: assertion.actual ?? null },
    });
  }
  return incidents.sort((left, right) => left.alertKey.localeCompare(right.alertKey));
}

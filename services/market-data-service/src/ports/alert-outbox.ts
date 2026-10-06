export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";
export type AlertEvent = { alertId: string; alertKey: string; code: string; severity: AlertSeverity; payload: Record<string, unknown>; attempts: number; sentAt: string | null };
export type AlertIncidentState = "OPEN" | "ACKNOWLEDGED" | "RESOLVED";
export type AlertIncident = {
  incidentId: string;
  alertKey: string;
  code: string;
  severity: AlertSeverity;
  payload: Record<string, unknown>;
  state: AlertIncidentState;
  firstSeenAt: string;
  lastSeenAt: string;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
};

export interface AlertOutboxPort {
  migrate(): Promise<void>;
  raiseIncident(alertKey: string, code: string, severity: AlertSeverity, payload: Record<string, unknown>): Promise<{ incident: AlertIncident; created: boolean }>;
  activeIncidents(): Promise<AlertIncident[]>;
  acknowledgeIncident(incidentId: string, actorId: string): Promise<AlertIncident | null>;
  resolveIncident(alertKey: string): Promise<AlertIncident | null>;
  enqueue(alertKey: string, code: string, severity: AlertSeverity, payload: Record<string, unknown>): Promise<{ alertId: string; created: boolean }>;
  pending(limit?: number): Promise<AlertEvent[]>;
  markFailed(alertId: string, error: string): Promise<void>;
  markSent(alertId: string): Promise<void>;
}

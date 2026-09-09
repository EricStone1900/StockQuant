import { proxyActivities } from "@temporalio/workflow";

const activities = proxyActivities<{ normalizeEvent: (eventId: string) => Promise<string> }>({
  startToCloseTimeout: "10 seconds",
  retry: { maximumAttempts: 3 }
});

export async function v15EventWorkflow(eventId: string): Promise<string> {
  return activities.normalizeEvent(eventId);
}

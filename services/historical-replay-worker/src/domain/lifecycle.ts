export type ReplayStatus = "RUNNING" | "PAUSED" | "COMPLETED" | "FAILED" | "CANCELLED";

const transitions: Record<ReplayStatus, readonly ReplayStatus[]> = {
  RUNNING: ["PAUSED", "COMPLETED", "FAILED", "CANCELLED"],
  PAUSED: ["RUNNING", "CANCELLED", "FAILED"],
  COMPLETED: [],
  FAILED: ["RUNNING"],
  CANCELLED: [],
};

export function canTransition(from: ReplayStatus, to: ReplayStatus): boolean {
  return transitions[from].includes(to);
}

export function assertTransition(from: ReplayStatus, to: ReplayStatus): void {
  if (!canTransition(from, to)) throw new Error(`invalid replay status transition: ${from} -> ${to}`);
}


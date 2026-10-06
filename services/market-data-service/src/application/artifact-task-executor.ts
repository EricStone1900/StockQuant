import { createHash } from "node:crypto";
import type { ArtifactDeliveryPort, ArtifactTaskRecord } from "../ports/artifact-delivery.js";

export type ArtifactTaskExecutorPort = Pick<ArtifactDeliveryPort, "claimTask" | "publishTask" | "failTask">;

/** Executes immutable Fixture publication; DB fencing linearizes publish against cancel. */
export class ArtifactTaskExecutor {
  private timer: ReturnType<typeof setInterval> | null = null;
  private ticking = false;

  constructor(
    private readonly repository: ArtifactTaskExecutorPort,
    private readonly loadFixture: (fixtureVersion: string) => Promise<Uint8Array>,
    private readonly workerId: string,
    private readonly leaseMs = 30_000,
  ) {}

  async tick(): Promise<ArtifactTaskRecord | null> {
    if (this.ticking) return null;
    this.ticking = true;
    try {
      const task = await this.repository.claimTask(this.workerId, this.leaseMs);
      if (!task) return null;
      try {
        const bytes = await this.loadFixture(task.fixtureVersion);
        const sha256 = createHash("sha256").update(bytes).digest("hex");
        return await this.repository.publishTask(task.taskId, task.fence, bytes, sha256);
      } catch (error) {
        await this.repository.failTask(task.taskId, task.fence, error instanceof Error ? error.message : String(error));
        return { ...task, status: "FAILED", error: error instanceof Error ? error.message : String(error) };
      }
    } finally {
      this.ticking = false;
    }
  }

  start(intervalMs = 250): void {
    if (this.timer) return;
    const run = () => { void this.tick().catch(() => undefined); };
    run();
    this.timer = setInterval(run, intervalMs);
    this.timer.unref?.();
  }

  stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }
}

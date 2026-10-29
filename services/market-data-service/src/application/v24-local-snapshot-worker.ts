import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { SnapshotSamplingTask } from "../adapters/postgres-snapshot-sampling-repository.js";
import type { PostgresSnapshotSamplingRepository } from "../adapters/postgres-snapshot-sampling-repository.js";
import type { PostgresV24LocalSnapshotBarrierRepository } from "../adapters/postgres-v24-local-snapshot-barrier-repository.js";
import type { LocalSnapshotScope } from "./v24-local-snapshot-barrier.js";
import { parseV21SnapshotSamplingFixture } from "./v21-snapshot-sampling-fixture.js";

const fixtures: Record<string, { date: string; directory: string; sha: string }> = {
  "v24-c5-local-snapshot-20240104-1": { date: "2024-01-04", directory: "fixtures/v2/v2.4/c5-local-snapshot-20240104", sha: "e0f6ac31675e0386a485d95077d50f871cd01c3e61fc5b28b9cc183e497f410e" },
  "v24-c5-local-snapshot-20240105-1": { date: "2024-01-05", directory: "fixtures/v2/v2.4/c5-local-snapshot-20240105", sha: "18cd1ab7256dcf0f0a3b429e1d71f2f4506ed9022ecf615f17dbd39eb57b7007" },
};
export const isV24LocalSnapshotFixture = (version: string | null): boolean => version !== null && Object.hasOwn(fixtures, version);

/** Execute only a previously frozen scoped plan; replay completes a missing receipt without resampling. */
export class V24LocalSnapshotWorker {
  constructor(private readonly sampling: PostgresSnapshotSamplingRepository, private readonly barrier: PostgresV24LocalSnapshotBarrierRepository, private readonly root: string) {}
  async execute(task: SnapshotSamplingTask): Promise<void> {
    const fixture = task.fixtureVersion ? fixtures[task.fixtureVersion] : undefined;
    if (!fixture || !task.scope.accountId || !task.scope.namespace || !task.scope.testRunId) throw new Error("C5_LOCAL_SNAPSHOT_TASK_SCOPE_INVALID");
    const scope = task.scope as LocalSnapshotScope;
    const plan = await this.barrier.readPlan(scope, fixture.date);
    if (!plan || plan.tasks.length !== 1 || plan.tasks[0]?.taskId !== task.taskId) throw new Error("C5_LOCAL_SNAPSHOT_PLAN_MISSING_OR_MISMATCHED");
    if (task.status === "QUEUED") {
      const expectedPath = `${fixture.directory}/snapshots.json`;
      const manifest = JSON.parse(await readFile(resolve(this.root, fixture.directory, "manifest.json"), "utf8")) as { status?: string; dataMode?: string; fixtureVersion?: string; files?: Array<{ path: string; sha256: string }> };
      if (manifest.status !== "FROZEN" || manifest.dataMode !== "FIXTURE" || manifest.fixtureVersion !== task.fixtureVersion || manifest.files?.length !== 1 || manifest.files[0]?.path !== expectedPath || manifest.files[0].sha256 !== fixture.sha) throw new Error("C5_LOCAL_SNAPSHOT_MANIFEST_INVALID");
      const availableAt = new Date(Date.parse(task.scheduledAt) + 1000).toISOString();
      const parsed = parseV21SnapshotSamplingFixture({ bytes: await readFile(resolve(this.root, expectedPath)), manifestVersion: manifest.fixtureVersion, manifestSha256: fixture.sha, scheduledAt: task.scheduledAt, calendarVersion: task.calendarVersion, securityIds: task.securityIds, ingestedAt: availableAt, availableAt, maxAgeMinutes: task.intervalMinutes });
      await this.sampling.completeFixture(task.taskId, parsed.fixtureVersion, parsed.fixtureSha256, parsed.observations);
    } else if (task.status !== "COMPLETED_FIXTURE") throw new Error("C5_LOCAL_SNAPSHOT_TASK_NOT_EXECUTABLE");
    await this.barrier.recordCompletion(scope, fixture.date);
  }
}

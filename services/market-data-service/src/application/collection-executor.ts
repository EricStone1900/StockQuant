import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { validateBars, type QualityBar } from "./minute-quality.js";
import type { CollectionRun, CollectionRunRepository } from "./collection-run-repository.js";

export type CollectedMinuteBar = QualityBar & {
  availableAt: string | null;
  adjustment: string;
  sourceId: string;
};
export type CollectionAdapterResult = { sourceId: string; bars: CollectedMinuteBar[]; attempts: unknown[] };
export type CollectionAdapter = { collect(input: { securityIds: string[]; startDate: string; endDate: string }): Promise<CollectionAdapterResult> };
type ExecutionRepository = Pick<CollectionRunRepository, "runnableRunIds" | "claim" | "checkpoint" | "publishRows" | "releaseToRetry">;

export class PythonMinuteCollectionAdapter implements CollectionAdapter {
  constructor(
    private readonly command = process.env.STOCKQUANT_COLLECTION_PYTHON ?? "python3",
    private readonly timeoutMs = Number(process.env.STOCKQUANT_COLLECTION_TIMEOUT_MS ?? 180_000),
    private readonly requestOptions = {
      timeoutSeconds: Number(process.env.STOCKQUANT_COLLECTION_SOURCE_TIMEOUT_SECONDS ?? 20),
      maxAttempts: Number(process.env.STOCKQUANT_COLLECTION_SOURCE_MAX_ATTEMPTS ?? 2),
      backoffSeconds: Number(process.env.STOCKQUANT_COLLECTION_SOURCE_BACKOFF_SECONDS ?? 2),
    },
  ) {}

  async collect(input: { securityIds: string[]; startDate: string; endDate: string }): Promise<CollectionAdapterResult> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.command, ["-m", "market_data_adapter.cli"], {
        env: { ...process.env, PYTHONUNBUFFERED: "1" }, stdio: ["pipe", "pipe", "pipe"],
      });
      let stdout = "";
      let stderr = "";
      const timer = setTimeout(() => child.kill("SIGTERM"), this.timeoutMs);
      child.stdout.on("data", (chunk: Buffer) => { stdout += chunk.toString("utf8"); });
      child.stderr.on("data", (chunk: Buffer) => { stderr += chunk.toString("utf8"); });
      child.once("error", (error) => { clearTimeout(timer); reject(error); });
      child.once("close", (code) => {
        clearTimeout(timer);
        try {
          const result = JSON.parse(stdout) as { status?: string; sourceId?: string; bars?: CollectedMinuteBar[]; attempts?: unknown[]; code?: string; message?: string };
          if (code !== 0 || result.status !== "COMPLETED" || !result.sourceId || !Array.isArray(result.bars)) throw new Error(`adapter ${result.code ?? code ?? "FAILED"}: ${result.message ?? stderr}`);
          resolve({ sourceId: result.sourceId, bars: result.bars, attempts: result.attempts ?? [] });
        } catch (error) { reject(error); }
      });
      child.stdin.end(JSON.stringify({ ...input, ...this.requestOptions }));
    });
  }
}

/** Claims persisted work; a source failure leaves it durable and retryable. */
export class PersistentCollectionExecutor {
  private timer: ReturnType<typeof setInterval> | null = null;
  constructor(private readonly runs: ExecutionRepository, private readonly adapter: CollectionAdapter, private readonly config: { securityIds: string[]; projectId: string; dataVersion: string; subscriptionId?: string; retrySeconds?: number; leaseSeconds?: number }) {}

  async tick(limit = 5): Promise<{ attempted: number; completed: number; waitingRetry: number }> {
    let completed = 0;
    let waitingRetry = 0;
    const ids = await this.runs.runnableRunIds(limit, this.config.subscriptionId);
    for (const runId of ids) {
      const run = await this.runs.claim(runId, this.config.leaseSeconds ?? 180);
      if (!run) continue;
      try {
        const result = await this.adapter.collect({ securityIds: this.config.securityIds, startDate: localDate(run.windowStart), endDate: localDate(run.windowEnd) });
        const normalized = result.bars.map(normalizeBar).filter((bar) => withinWindow(bar, run));
        if (!normalized.length) throw new Error("EMPTY_WINDOW_RESULT");
        const issues = validateBars(normalized);
        if (issues.length) throw new Error(`QUALITY_REJECTED:${JSON.stringify(issues.slice(0, 5))}`);
        const rows = normalized.map((bar) => ({ ...bar, ingestedAt: new Date().toISOString(), sourceAttempts: result.attempts }));
        const sha256 = createHash("sha256").update(JSON.stringify(rows)).digest("hex");
        const artifactId = `minute-5m-${sha256.slice(0, 24)}`;
        await this.runs.checkpoint(run.runId, run.fencingToken, { sourceId: result.sourceId, rowCount: rows.length, sha256, attempts: result.attempts });
        await this.runs.publishRows({ runId: run.runId, fencingToken: run.fencingToken, artifactId, sha256, projectId: this.config.projectId, dataVersion: this.config.dataVersion, rows });
        completed += 1;
      } catch (error) {
        await this.runs.releaseToRetry(run.runId, run.fencingToken, this.config.retrySeconds ?? 300);
        waitingRetry += 1;
      }
    }
    return { attempted: ids.length, completed, waitingRetry };
  }

  start(intervalMs = 60_000): void {
    if (this.timer) return;
    this.timer = setInterval(() => { void this.tick(); }, intervalMs);
    void this.tick();
  }

  stop(): void { if (this.timer) clearInterval(this.timer); this.timer = null; }
}

function localDate(instant: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(instant));
}

function normalizeBar(value: CollectedMinuteBar): CollectedMinuteBar {
  const numeric = (field: "open" | "high" | "low" | "close" | "volume" | "amount"): number | null => {
    const raw = value[field];
    return raw === null ? null : Number(raw);
  };
  return {
    ...value,
    open: numeric("open") ?? Number.NaN,
    high: numeric("high") ?? Number.NaN,
    low: numeric("low") ?? Number.NaN,
    close: numeric("close") ?? Number.NaN,
    volume: numeric("volume") ?? Number.NaN,
    amount: numeric("amount"),
  };
}

function withinWindow(bar: CollectedMinuteBar, run: Pick<CollectionRun, "windowStart" | "windowEnd">): boolean {
  const start = new Date(bar.barStart).getTime();
  const end = new Date(bar.barEnd).getTime();
  return Number.isFinite(start) && Number.isFinite(end) && start >= new Date(run.windowStart).getTime() && end <= new Date(run.windowEnd).getTime();
}

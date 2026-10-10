import { randomUUID } from "node:crypto";
import { ConflictException, NotFoundException, UnprocessableEntityException } from "@nestjs/common";
import { Pool, type PoolClient } from "pg";
import { isDeepStrictEqual } from "node:util";
import { evaluateV31PromotionGate } from "../application/v31-acceptance-gate.js";
import type { NewStageRun, StageRunRepository, StageRunSummary, StoredStageRun, V14BacktestRunRepository, V15RunIncident, V33WorkflowStatus } from "../ports/stage-run-repository.js";
import { deriveV15RunIncidentCandidates } from "../application/v15-run-incidents.js";
import { assertV33CompletionEvidence, isV33WorkflowTerminal, isV33WorkflowTransitionAllowed } from "../application/v33-run-state.js";
export type { StoredStageRun } from "../ports/stage-run-repository.js";

export class PostgresStageRunRepository implements StageRunRepository, V14BacktestRunRepository {
  constructor(private readonly pool: Pool) {}

  async migrate(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      // Several stage repositories share these tables and may initialize concurrently.
      // Serialize first creation so PostgreSQL cannot race on its implicit row types.
      await client.query("SELECT pg_advisory_xact_lock(735401, 1)");
      await client.query(`
      CREATE TABLE IF NOT EXISTS acceptance_stage_runs (
        test_run_id UUID PRIMARY KEY, stage_id TEXT NOT NULL, scenario_id TEXT NOT NULL,
        scenario_version TEXT NOT NULL, owner_id TEXT NOT NULL, namespace TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL CHECK (status IN ('QUEUED','RUNNING','WAITING','COMPLETED','FAILED','CANCELLED')),
        seed INTEGER NOT NULL, assertions JSONB NOT NULL, evidence JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(), completed_at TIMESTAMPTZ NULL
      );
      CREATE INDEX IF NOT EXISTS acceptance_stage_runs_owner_idx ON acceptance_stage_runs(owner_id, test_run_id);
      CREATE INDEX IF NOT EXISTS acceptance_stage_runs_v15_owner_created_idx ON acceptance_stage_runs(stage_id, owner_id, created_at DESC, test_run_id DESC);
      CREATE TABLE IF NOT EXISTS acceptance_stage_run_history (
        revision_id BIGSERIAL PRIMARY KEY, test_run_id UUID NOT NULL REFERENCES acceptance_stage_runs(test_run_id) ON DELETE RESTRICT,
        owner_id TEXT NOT NULL, stage_id TEXT NOT NULL, scenario_id TEXT NOT NULL, status TEXT NOT NULL,
        assertions JSONB NOT NULL, evidence JSONB NOT NULL, recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS acceptance_stage_run_history_owner_idx ON acceptance_stage_run_history(test_run_id, owner_id, revision_id);
      CREATE TABLE IF NOT EXISTS v15_workflow_dispatch_outbox (
        event_id UUID PRIMARY KEY REFERENCES acceptance_stage_runs(test_run_id) ON DELETE RESTRICT,
        owner_id TEXT NOT NULL, payload JSONB NOT NULL, published_at TIMESTAMPTZ NULL,
        lease_until TIMESTAMPTZ NULL, attempts INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS v15_workflow_dispatch_pending_idx ON v15_workflow_dispatch_outbox(created_at) WHERE published_at IS NULL;
      CREATE TABLE IF NOT EXISTS v15_run_incidents (
        incident_id UUID PRIMARY KEY, test_run_id UUID NOT NULL REFERENCES acceptance_stage_runs(test_run_id) ON DELETE RESTRICT,
        owner_id TEXT NOT NULL, alert_key TEXT NOT NULL, code TEXT NOT NULL,
        severity TEXT NOT NULL CHECK (severity IN ('BLOCKER','ERROR')), title TEXT NOT NULL, detail JSONB NOT NULL,
        state TEXT NOT NULL CHECK (state IN ('OPEN','ACKNOWLEDGED','RESOLVED')),
        first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(), last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        acknowledged_by TEXT NULL, acknowledged_at TIMESTAMPTZ NULL, resolved_at TIMESTAMPTZ NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS v15_run_incidents_active_key_idx ON v15_run_incidents(test_run_id,alert_key) WHERE resolved_at IS NULL;
      CREATE INDEX IF NOT EXISTS v15_run_incidents_owner_idx ON v15_run_incidents(test_run_id,owner_id,first_seen_at);
      CREATE TABLE IF NOT EXISTS v13_session_clock_events (
        test_run_id UUID NOT NULL REFERENCES acceptance_stage_runs(test_run_id) ON DELETE RESTRICT,
        owner_id TEXT NOT NULL, sequence INTEGER NOT NULL CHECK (sequence > 0),
        from_clock TIMESTAMPTZ NOT NULL, to_clock TIMESTAMPTZ NOT NULL,
        calendar_version TEXT NOT NULL, idempotency_key TEXT NOT NULL,
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (test_run_id, sequence), UNIQUE(test_run_id, idempotency_key),
        CHECK (to_clock > from_clock)
      );
      CREATE TABLE IF NOT EXISTS v31_acceptance_records (
        test_run_id UUID PRIMARY KEY REFERENCES acceptance_stage_runs(test_run_id) ON DELETE RESTRICT,
        owner_id TEXT NOT NULL, accepted_by TEXT NOT NULL, note TEXT NOT NULL,
        evidence_sha256 CHAR(64) NOT NULL CHECK (evidence_sha256 ~ '^[a-f0-9]{64}$'),
        accepted_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      `);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async enqueueV15NoTrade(run: NewStageRun, payload: Record<string, unknown>): Promise<void> {
    if (run.stageId !== "V1.5" || !["normal", "auto-trade", "rejection", "recovery"].includes(run.scenarioId) || run.status !== "WAITING" || payload.testRunId !== run.testRunId || payload.ownerId !== run.ownerId || payload.scenarioId !== run.scenarioId) {
      throw new ConflictException("only an owner-scoped V1.5 normal, AUTO, rejection or recovery Fixture WAITING run can be dispatched");
    }
    const namespace = run.namespace ?? `v1-5-${run.scenarioId}-${run.testRunId}`;
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(`INSERT INTO acceptance_stage_runs(test_run_id,stage_id,scenario_id,scenario_version,owner_id,namespace,status,seed,assertions,evidence)
        VALUES($1,'V1.5',$2,$3,$4,$5,'WAITING',$6,$7::jsonb,$8::jsonb)`, [run.testRunId, run.scenarioId, run.scenarioVersion, run.ownerId, namespace, run.seed, JSON.stringify(run.assertions), JSON.stringify(run.evidence)]);
      await client.query(`INSERT INTO v15_workflow_dispatch_outbox(event_id,owner_id,payload) VALUES($1,$2,$3::jsonb)`, [run.testRunId, run.ownerId, JSON.stringify(payload)]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      if ((error as { code?: string }).code === "23505") throw new ConflictException("V1.5 TestRun or dispatch identity is already in use");
      throw error;
    } finally { client.release(); }
  }

  async claimV15Dispatches(limit: number): Promise<Array<{ eventId: string; payload: Record<string, unknown> }>> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(`WITH selected AS (
        SELECT event_id FROM v15_workflow_dispatch_outbox WHERE published_at IS NULL AND (lease_until IS NULL OR lease_until < now())
        ORDER BY created_at,event_id FOR UPDATE SKIP LOCKED LIMIT $1
      ) UPDATE v15_workflow_dispatch_outbox o SET lease_until=now()+interval '30 seconds', attempts=attempts+1
        FROM selected s WHERE o.event_id=s.event_id RETURNING o.event_id,o.payload`, [Math.max(1, Math.min(100, Math.floor(limit)))]);
      await client.query("COMMIT");
      return result.rows.map((row) => ({ eventId: String(row.event_id), payload: row.payload as Record<string, unknown> }));
    } catch (error) { await client.query("ROLLBACK"); throw error; }
    finally { client.release(); }
  }

  async markV15DispatchPublished(eventId: string): Promise<void> {
    await this.pool.query("UPDATE v15_workflow_dispatch_outbox SET published_at=COALESCE(published_at,now()),lease_until=NULL WHERE event_id=$1", [eventId]);
  }

  async save(run: NewStageRun): Promise<StoredStageRun> {
    if (run.stageId === "V3.3" && run.status !== "WAITING") {
      throw new ConflictException("V3.3 TestRuns must use transitionV33Workflow for every state change");
    }
    const namespace = run.namespace ?? `${run.stageId.toLowerCase().replace(".", "-")}-${run.scenarioId}-${run.testRunId}`;
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(`
        INSERT INTO acceptance_stage_runs (test_run_id, stage_id, scenario_id, scenario_version, owner_id, namespace, status, seed, assertions, evidence, completed_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,CASE WHEN $7 IN ('COMPLETED','FAILED','CANCELLED') THEN now() END)
        ON CONFLICT (test_run_id) DO UPDATE SET
          status=EXCLUDED.status,
          assertions=EXCLUDED.assertions,
          evidence=EXCLUDED.evidence,
          completed_at=CASE WHEN acceptance_stage_runs.completed_at IS NULL AND EXCLUDED.status IN ('COMPLETED','FAILED','CANCELLED')
            THEN now() ELSE acceptance_stage_runs.completed_at END
        WHERE acceptance_stage_runs.stage_id=EXCLUDED.stage_id
          AND acceptance_stage_runs.scenario_id=EXCLUDED.scenario_id
          AND acceptance_stage_runs.scenario_version=EXCLUDED.scenario_version
          AND acceptance_stage_runs.owner_id=EXCLUDED.owner_id
          AND acceptance_stage_runs.namespace=EXCLUDED.namespace
          AND acceptance_stage_runs.seed=EXCLUDED.seed
          AND (NOT $11::boolean OR (acceptance_stage_runs.status=EXCLUDED.status
            AND acceptance_stage_runs.assertions=EXCLUDED.assertions
            AND acceptance_stage_runs.evidence=EXCLUDED.evidence))
          AND (acceptance_stage_runs.status NOT IN ('COMPLETED','FAILED','CANCELLED')
            OR (acceptance_stage_runs.status=EXCLUDED.status
              AND acceptance_stage_runs.assertions=EXCLUDED.assertions
              AND acceptance_stage_runs.evidence=EXCLUDED.evidence))
        RETURNING *`, [run.testRunId, run.stageId, run.scenarioId, run.scenarioVersion, run.ownerId, namespace, run.status, run.seed, JSON.stringify(run.assertions), JSON.stringify(run.evidence), run.stageId === "V3.3"]);
      if (result.rowCount !== 1) throw new ConflictException("stage run identity or terminal evidence conflicts with the stored run");
      const stored = this.row(result.rows[0]);
      if (stored.stageId === "V1.5") await this.syncV15RunIncidents(client, stored.testRunId, stored.ownerId, stored.evidence, stored.assertions);
      await client.query("COMMIT");
      return stored;
    } catch (error) {
      await client.query("ROLLBACK");
      if ((error as { code?: string }).code === "23505") throw new ConflictException("stage run ID or namespace is already in use");
      throw error;
    } finally {
      client.release();
    }
  }

  async find(testRunId: string, ownerId: string): Promise<StoredStageRun | null> {
    const result = await this.pool.query("SELECT * FROM acceptance_stage_runs WHERE test_run_id=$1 AND owner_id=$2", [testRunId, ownerId]);
    return result.rowCount === 1 ? this.row(result.rows[0]) : null;
  }

  async listV15Runs(ownerId: string, limit: number): Promise<StageRunSummary[]> {
    if (!ownerId || !Number.isSafeInteger(limit) || limit < 1 || limit > 50) throw new UnprocessableEntityException("V1.5 run history limit must be an integer from 1 to 50");
    const result = await this.pool.query(
      `SELECT test_run_id, stage_id, scenario_id, scenario_version, status, seed, created_at, completed_at
       FROM acceptance_stage_runs WHERE stage_id='V1.5' AND owner_id=$1
       ORDER BY created_at DESC, test_run_id DESC LIMIT $2`,
      [ownerId, limit]
    );
    return result.rows.map((row) => ({
      testRunId: row.test_run_id,
      stageId: row.stage_id,
      scenarioId: row.scenario_id,
      scenarioVersion: row.scenario_version,
      status: row.status,
      seed: row.seed,
      createdAt: new Date(row.created_at).toISOString(),
      completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null
    }));
  }

  async projectV15RunIncidents(testRunId: string, ownerId: string): Promise<V15RunIncident[]> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const run = await client.query<{ evidence: Record<string, unknown>; assertions: unknown[] }>(
        "SELECT evidence,assertions FROM acceptance_stage_runs WHERE test_run_id=$1 AND owner_id=$2 AND stage_id='V1.5' FOR UPDATE",
        [testRunId, ownerId],
      );
      if (run.rowCount !== 1) throw new NotFoundException("V1.5 run was not found in user scope");
      const rows = await this.syncV15RunIncidents(client, testRunId, ownerId, run.rows[0].evidence, run.rows[0].assertions);
      await client.query("COMMIT");
      return rows;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }

  private async syncV15RunIncidents(
    client: PoolClient,
    testRunId: string,
    ownerId: string,
    evidence: Record<string, unknown>,
    assertions: unknown[],
  ): Promise<V15RunIncident[]> {
    const candidates = deriveV15RunIncidentCandidates(evidence, assertions);
    const activeKeys = candidates.map((item) => item.alertKey);
    await client.query(
      `UPDATE v15_run_incidents SET state='RESOLVED',resolved_at=now(),last_seen_at=now()
       WHERE test_run_id=$1 AND owner_id=$2 AND resolved_at IS NULL AND NOT(alert_key=ANY($3::text[]))`,
      [testRunId, ownerId, activeKeys],
    );
    for (const incident of candidates) {
      await client.query(
        `INSERT INTO v15_run_incidents(incident_id,test_run_id,owner_id,alert_key,code,severity,title,detail,state)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,'OPEN')
         ON CONFLICT(test_run_id,alert_key) WHERE resolved_at IS NULL DO UPDATE SET
           code=EXCLUDED.code,severity=EXCLUDED.severity,title=EXCLUDED.title,detail=EXCLUDED.detail,last_seen_at=now()`,
        [randomUUID(), testRunId, ownerId, incident.alertKey, incident.code, incident.severity, incident.title, JSON.stringify(incident.detail)],
      );
    }
    const rows = await client.query(`SELECT incident_id,test_run_id,alert_key,code,severity,title,detail,state,
        first_seen_at,last_seen_at,acknowledged_by,acknowledged_at,resolved_at
      FROM v15_run_incidents WHERE test_run_id=$1 AND owner_id=$2 ORDER BY first_seen_at,incident_id`, [testRunId, ownerId]);
    return rows.rows.map((row) => this.toV15RunIncident(row));
  }

  async acknowledgeV15RunIncident(testRunId: string, ownerId: string, incidentId: string, actorId: string): Promise<V15RunIncident> {
    const result = await this.pool.query(`UPDATE v15_run_incidents SET state='ACKNOWLEDGED',
        acknowledged_by=COALESCE(acknowledged_by,$4),acknowledged_at=COALESCE(acknowledged_at,now())
      WHERE incident_id=$1 AND test_run_id=$2 AND owner_id=$3 AND resolved_at IS NULL
        AND state IN ('OPEN','ACKNOWLEDGED')
      RETURNING incident_id,test_run_id,alert_key,code,severity,title,detail,state,first_seen_at,last_seen_at,acknowledged_by,acknowledged_at,resolved_at`,
    [incidentId, testRunId, ownerId, actorId]);
    if (result.rowCount !== 1) throw new NotFoundException("active V1.5 incident was not found in user scope");
    return this.toV15RunIncident(result.rows[0]);
  }

  private toV15RunIncident(row: Record<string, any>): V15RunIncident {
    return {
      incidentId: String(row.incident_id), testRunId: String(row.test_run_id), alertKey: String(row.alert_key),
      code: String(row.code), severity: row.severity, title: String(row.title), detail: row.detail,
      state: row.state, firstSeenAt: new Date(row.first_seen_at).toISOString(), lastSeenAt: new Date(row.last_seen_at).toISOString(),
      acknowledgedBy: row.acknowledged_by === null ? null : String(row.acknowledged_by),
      acknowledgedAt: row.acknowledged_at === null ? null : new Date(row.acknowledged_at).toISOString(),
      resolvedAt: row.resolved_at === null ? null : new Date(row.resolved_at).toISOString(),
    };
  }

  async requestV15AutoTradeCancellation(testRunId: string, ownerId: string, requestedAt: string): Promise<StoredStageRun> {
    if (!Number.isFinite(Date.parse(requestedAt))) throw new UnprocessableEntityException("valid cancellation request timestamp is required");
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const selected = await client.query("SELECT * FROM acceptance_stage_runs WHERE test_run_id=$1 AND owner_id=$2 AND stage_id='V1.5' AND scenario_id='auto-trade' FOR UPDATE", [testRunId, ownerId]);
      if (selected.rowCount !== 1) throw new NotFoundException("active V1.5 AUTO TestRun was not found in user scope");
      const current = this.row(selected.rows[0]);
      const prior = current.evidence.autoTradeCancellation;
      if (typeof prior === "object" && prior !== null && "requestedAt" in prior && typeof prior.requestedAt === "string") {
        await client.query("COMMIT");
        return current;
      }
      if (current.status !== "WAITING" || current.evidence.temporal === "COMPLETED" || current.evidence.workflow === "NOT_CONNECTED" || current.evidence.businessExecution === "AUTO_TRADE_EXECUTED") {
        throw new ConflictException("V1.5 AUTO TestRun is no longer cancellable");
      }
      const cancellation = { status: "REQUESTED", requestedAt };
      const updated = await client.query(
        `UPDATE acceptance_stage_runs SET evidence=jsonb_set(evidence, '{autoTradeCancellation}', $3::jsonb, true)
         WHERE test_run_id=$1 AND owner_id=$2 RETURNING *`,
        [testRunId, ownerId, JSON.stringify(cancellation)]
      );
      await client.query(
        `INSERT INTO acceptance_stage_run_history (test_run_id,owner_id,stage_id,scenario_id,status,assertions,evidence)
         SELECT test_run_id,owner_id,stage_id,scenario_id,status,assertions,evidence FROM acceptance_stage_runs WHERE test_run_id=$1 AND owner_id=$2`,
        [testRunId, ownerId]
      );
      await client.query("COMMIT");
      if (updated.rowCount !== 1) throw new ConflictException("V1.5 AUTO cancellation request was not persisted");
      return this.row(updated.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async advanceV13Session(input: { testRunId: string; ownerId: string; expectedClock: string; nextClock: string; calendarVersion: string }): Promise<{ run: StoredStageRun; event: import("../ports/stage-run-repository.js").V13SessionAdvance; replayed: boolean }> {
    const client = await this.pool.connect();
    const idempotencyKey = `next-session:${input.expectedClock}`;
    try {
      await client.query("BEGIN");
      const selected = await client.query("SELECT * FROM acceptance_stage_runs WHERE test_run_id=$1 AND owner_id=$2 AND stage_id='V1.3' FOR UPDATE", [input.testRunId, input.ownerId]);
      if (selected.rowCount !== 1) throw new NotFoundException("V1.3 TestRun was not found in user scope");
      const previous = this.row(selected.rows[0]);
      const replay = await client.query(`SELECT sequence,from_clock,to_clock,calendar_version,idempotency_key,recorded_at
        FROM v13_session_clock_events WHERE test_run_id=$1 AND owner_id=$2 AND idempotency_key=$3`, [input.testRunId, input.ownerId, idempotencyKey]);
      if (replay.rowCount === 1) {
        const event = this.v13ClockEvent(replay.rows[0]);
        if (Date.parse(event.fromClock) !== Date.parse(input.expectedClock) || Date.parse(event.toClock) !== Date.parse(input.nextClock) || event.calendarVersion !== input.calendarVersion) throw new ConflictException("V1.3 session advance idempotency key conflicts with existing evidence");
        await client.query("COMMIT");
        return { run: previous, event, replayed: true };
      }
      if (previous.status !== "WAITING") throw new ConflictException("only a WAITING V1.3 TestRun can advance its Fixture clock");
      const currentClock = previous.evidence.runClockNow;
      if (typeof currentClock !== "string" || currentClock !== input.expectedClock) throw new ConflictException("V1.3 Fixture clock changed before the requested session advance");
      if (!/^sse-cn-a-share-2026-1$/u.test(input.calendarVersion)) throw new ConflictException("V1.3 Fixture session calendar version is unsupported");
      const next = Date.parse(input.nextClock);
      const current = Date.parse(input.expectedClock);
      if (!Number.isFinite(next) || !Number.isFinite(current) || next <= current) throw new ConflictException("V1.3 Fixture clock must advance monotonically");
      const sequenceResult = await client.query("SELECT COALESCE(max(sequence),0)::int+1 AS sequence FROM v13_session_clock_events WHERE test_run_id=$1", [input.testRunId]);
      const sequence = Number(sequenceResult.rows[0].sequence);
      const inserted = await client.query(`INSERT INTO v13_session_clock_events(test_run_id,owner_id,sequence,from_clock,to_clock,calendar_version,idempotency_key)
        VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING sequence,from_clock,to_clock,calendar_version,idempotency_key,recorded_at`, [input.testRunId, input.ownerId, sequence, input.expectedClock, input.nextClock, input.calendarVersion, idempotencyKey]);
      await client.query(`INSERT INTO acceptance_stage_run_history(test_run_id,owner_id,stage_id,scenario_id,status,assertions,evidence)
        VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)`, [input.testRunId, input.ownerId, previous.stageId, previous.scenarioId, previous.status, JSON.stringify(previous.assertions), JSON.stringify(previous.evidence)]);
      const evidence = { ...previous.evidence, runClockNow: input.nextClock, calendarVersion: input.calendarVersion, sessionAdvanceSequence: sequence };
      const updated = await client.query("UPDATE acceptance_stage_runs SET evidence=$3::jsonb WHERE test_run_id=$1 AND owner_id=$2 RETURNING *", [input.testRunId, input.ownerId, JSON.stringify(evidence)]);
      await client.query("COMMIT");
      return { run: this.row(updated.rows[0]), event: this.v13ClockEvent(inserted.rows[0]), replayed: false };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }

  async listV13SessionAdvances(testRunId: string, ownerId: string): Promise<import("../ports/stage-run-repository.js").V13SessionAdvance[]> {
    const result = await this.pool.query(`SELECT sequence,from_clock,to_clock,calendar_version,idempotency_key,recorded_at
      FROM v13_session_clock_events WHERE test_run_id=$1 AND owner_id=$2 ORDER BY sequence`, [testRunId, ownerId]);
    return result.rows.map((row) => this.v13ClockEvent(row));
  }

  async listRunnableV14Runs(): Promise<StoredStageRun[]> {
    const result = await this.pool.query("SELECT * FROM acceptance_stage_runs WHERE stage_id='V1.4' AND status='RUNNING' ORDER BY created_at,test_run_id");
    return result.rows.map((row) => this.row(row));
  }

  async withV14RunLock<T>(testRunId: string, work: () => Promise<T>): Promise<T | undefined> {
    const client = await this.pool.connect();
    let locked = false;
    try {
      const result = await client.query("SELECT pg_try_advisory_lock(hashtextextended('stockquant:v1.4:' || $1::text, 0)) AS locked", [testRunId]);
      locked = result.rows[0]?.locked === true;
      if (!locked) return undefined;
      return await work();
    } finally {
      if (locked) await client.query("SELECT pg_advisory_unlock(hashtextextended('stockquant:v1.4:' || $1::text, 0))", [testRunId]).catch(() => undefined);
      client.release();
    }
  }

  async updateV14Progress(testRunId: string, ownerId: string, progress: Record<string, unknown>): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const selected = await client.query("SELECT * FROM acceptance_stage_runs WHERE test_run_id=$1 AND owner_id=$2 AND stage_id='V1.4' FOR UPDATE", [testRunId, ownerId]);
      if (selected.rowCount !== 1) throw new NotFoundException("V1.4 TestRun was not found in user scope");
      const previous = this.row(selected.rows[0]);
      const task = previous.evidence.v14Task as Record<string, unknown> | undefined;
      if (previous.status !== "RUNNING" || task?.cancelRequested === true) {
        await client.query("COMMIT");
        return false;
      }
      const evidence = { ...previous.evidence, v14Task: { ...(task ?? {}), ...progress, updatedAt: new Date().toISOString() } };
      await client.query(`INSERT INTO acceptance_stage_run_history(test_run_id,owner_id,stage_id,scenario_id,status,assertions,evidence)
        VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)`, [testRunId, ownerId, previous.stageId, previous.scenarioId, previous.status, JSON.stringify(previous.assertions), JSON.stringify(previous.evidence)]);
      await client.query("UPDATE acceptance_stage_runs SET evidence=$3::jsonb WHERE test_run_id=$1 AND owner_id=$2", [testRunId, ownerId, JSON.stringify(evidence)]);
      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }

  async requestV14Cancellation(testRunId: string, ownerId: string): Promise<StoredStageRun> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const selected = await client.query("SELECT * FROM acceptance_stage_runs WHERE test_run_id=$1 AND owner_id=$2 AND stage_id='V1.4' FOR UPDATE", [testRunId, ownerId]);
      if (selected.rowCount !== 1) throw new NotFoundException("V1.4 TestRun was not found in user scope");
      const previous = this.row(selected.rows[0]);
      if (previous.status !== "RUNNING") throw new ConflictException("V1.4 TestRun is no longer cancellable");
      const task = previous.evidence.v14Task as Record<string, unknown> | undefined;
      if (task?.cancelRequested === true) {
        await client.query("COMMIT");
        return previous;
      }
      const evidence = { ...previous.evidence, v14Task: { ...(task ?? {}), cancelRequested: true, cancelRequestedAt: new Date().toISOString() } };
      await client.query(`INSERT INTO acceptance_stage_run_history(test_run_id,owner_id,stage_id,scenario_id,status,assertions,evidence)
        VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)`, [testRunId, ownerId, previous.stageId, previous.scenarioId, previous.status, JSON.stringify(previous.assertions), JSON.stringify(previous.evidence)]);
      const updated = await client.query("UPDATE acceptance_stage_runs SET evidence=$3::jsonb WHERE test_run_id=$1 AND owner_id=$2 RETURNING *", [testRunId, ownerId, JSON.stringify(evidence)]);
      await client.query("COMMIT");
      return this.row(updated.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }

  async finishV14Run(testRunId: string, ownerId: string, status: "COMPLETED" | "FAILED" | "CANCELLED", assertions: unknown[], evidence: Record<string, unknown>): Promise<StoredStageRun> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const selected = await client.query("SELECT * FROM acceptance_stage_runs WHERE test_run_id=$1 AND owner_id=$2 AND stage_id='V1.4' FOR UPDATE", [testRunId, ownerId]);
      if (selected.rowCount !== 1) throw new NotFoundException("V1.4 TestRun was not found in user scope");
      const previous = this.row(selected.rows[0]);
      if (previous.status !== "RUNNING") {
        if (previous.status === status && isDeepStrictEqual(previous.assertions, assertions) && isDeepStrictEqual(previous.evidence, evidence)) {
          await client.query("COMMIT");
          return previous;
        }
        throw new ConflictException("V1.4 TestRun is no longer running");
      }
      const task = previous.evidence.v14Task as Record<string, unknown> | undefined;
      if (status === "COMPLETED" && task?.cancelRequested === true) throw new ConflictException("cancelled V1.4 TestRun cannot be completed");
      await client.query(`INSERT INTO acceptance_stage_run_history(test_run_id,owner_id,stage_id,scenario_id,status,assertions,evidence)
        VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)`, [testRunId, ownerId, previous.stageId, previous.scenarioId, previous.status, JSON.stringify(previous.assertions), JSON.stringify(previous.evidence)]);
      const updated = await client.query("UPDATE acceptance_stage_runs SET status=$3,assertions=$4::jsonb,evidence=$5::jsonb,completed_at=now() WHERE test_run_id=$1 AND owner_id=$2 RETURNING *", [testRunId, ownerId, status, JSON.stringify(assertions), JSON.stringify(evidence)]);
      await client.query("COMMIT");
      return this.row(updated.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }

  async listRunnableV12Runs(): Promise<StoredStageRun[]> {
    const result = await this.pool.query("SELECT * FROM acceptance_stage_runs WHERE stage_id='V1.2' AND status='RUNNING' ORDER BY created_at,test_run_id");
    return result.rows.map((row) => this.row(row));
  }

  async withV12RunLock<T>(testRunId: string, work: () => Promise<T>): Promise<T | undefined> {
    const client = await this.pool.connect();
    let locked = false;
    try {
      const result = await client.query("SELECT pg_try_advisory_lock(hashtextextended('stockquant:v1.2:' || $1::text, 0)) AS locked", [testRunId]);
      locked = result.rows[0]?.locked === true;
      if (!locked) return undefined;
      return await work();
    } finally {
      if (locked) await client.query("SELECT pg_advisory_unlock(hashtextextended('stockquant:v1.2:' || $1::text, 0))", [testRunId]).catch(() => undefined);
      client.release();
    }
  }

  async updateV12Progress(testRunId: string, ownerId: string, progress: Record<string, unknown>): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const selected = await client.query("SELECT * FROM acceptance_stage_runs WHERE test_run_id=$1 AND owner_id=$2 AND stage_id='V1.2' FOR UPDATE", [testRunId, ownerId]);
      if (selected.rowCount !== 1) throw new NotFoundException("V1.2 TestRun was not found in user scope");
      const previous = this.row(selected.rows[0]);
      const task = previous.evidence.qlibTask as Record<string, unknown> | undefined;
      if (previous.status !== "RUNNING" || task?.cancelRequested === true) {
        await client.query("COMMIT");
        return false;
      }
      const evidence = { ...previous.evidence, qlibTask: { ...(task ?? {}), ...progress, updatedAt: new Date().toISOString() } };
      await client.query(`INSERT INTO acceptance_stage_run_history(test_run_id,owner_id,stage_id,scenario_id,status,assertions,evidence)
        VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)`, [testRunId, ownerId, previous.stageId, previous.scenarioId, previous.status, JSON.stringify(previous.assertions), JSON.stringify(previous.evidence)]);
      await client.query("UPDATE acceptance_stage_runs SET evidence=$3::jsonb WHERE test_run_id=$1 AND owner_id=$2", [testRunId, ownerId, JSON.stringify(evidence)]);
      await client.query("COMMIT");
      return true;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }

  async requestV12Cancellation(testRunId: string, ownerId: string): Promise<StoredStageRun> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const selected = await client.query("SELECT * FROM acceptance_stage_runs WHERE test_run_id=$1 AND owner_id=$2 AND stage_id='V1.2' FOR UPDATE", [testRunId, ownerId]);
      if (selected.rowCount !== 1) throw new NotFoundException("V1.2 TestRun was not found in user scope");
      const previous = this.row(selected.rows[0]);
      if (["COMPLETED", "FAILED", "CANCELLED", "WAITING"].includes(previous.status)) throw new ConflictException("V1.2 TestRun is already terminal");
      const task = previous.evidence.qlibTask as Record<string, unknown> | undefined;
      if (task?.phase === "PUBLISHING_ARTIFACT") throw new ConflictException("V1.2 Artifact publication is in its fenced finalization section and cannot be cancelled");
      if (task?.cancelRequested === true) {
        await client.query("COMMIT");
        return previous;
      }
      const evidence = { ...previous.evidence, qlibTask: { ...(task ?? {}), cancelRequested: true, cancelRequestedAt: new Date().toISOString() } };
      await client.query(`INSERT INTO acceptance_stage_run_history(test_run_id,owner_id,stage_id,scenario_id,status,assertions,evidence)
        VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)`, [testRunId, ownerId, previous.stageId, previous.scenarioId, previous.status, JSON.stringify(previous.assertions), JSON.stringify(previous.evidence)]);
      const updated = await client.query("UPDATE acceptance_stage_runs SET evidence=$3::jsonb WHERE test_run_id=$1 AND owner_id=$2 RETURNING *", [testRunId, ownerId, JSON.stringify(evidence)]);
      await client.query("COMMIT");
      return this.row(updated.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }

  async finishV12Run(testRunId: string, ownerId: string, status: "WAITING" | "COMPLETED" | "FAILED" | "CANCELLED", assertions: unknown[], evidence: Record<string, unknown>): Promise<StoredStageRun> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const selected = await client.query("SELECT * FROM acceptance_stage_runs WHERE test_run_id=$1 AND owner_id=$2 AND stage_id='V1.2' FOR UPDATE", [testRunId, ownerId]);
      if (selected.rowCount !== 1) throw new NotFoundException("V1.2 TestRun was not found in user scope");
      const previous = this.row(selected.rows[0]);
      if (previous.status !== "RUNNING") {
        if (previous.status === status && isDeepStrictEqual(previous.assertions, assertions) && isDeepStrictEqual(previous.evidence, evidence)) {
          await client.query("COMMIT");
          return previous;
        }
        throw new ConflictException("V1.2 TestRun is no longer running");
      }
      const existingTask = previous.evidence.qlibTask as Record<string, unknown> | undefined;
      if (status === "COMPLETED" && existingTask?.cancelRequested === true) throw new ConflictException("cancelled V1.2 TestRun cannot be completed");
      await client.query(`INSERT INTO acceptance_stage_run_history(test_run_id,owner_id,stage_id,scenario_id,status,assertions,evidence)
        VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)`, [testRunId, ownerId, previous.stageId, previous.scenarioId, previous.status, JSON.stringify(previous.assertions), JSON.stringify(previous.evidence)]);
      const updated = await client.query("UPDATE acceptance_stage_runs SET status=$3,assertions=$4::jsonb,evidence=$5::jsonb,completed_at=CASE WHEN $3 IN ('COMPLETED','FAILED','CANCELLED') THEN now() ELSE NULL END WHERE test_run_id=$1 AND owner_id=$2 RETURNING *", [testRunId, ownerId, status, JSON.stringify(assertions), JSON.stringify(evidence)]);
      await client.query("COMMIT");
      return this.row(updated.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }

  async transitionV33Workflow(input: {
    testRunId: string;
    ownerId: string;
    expectedStatus: V33WorkflowStatus;
    status: V33WorkflowStatus;
    assertions: unknown[];
    evidence: Record<string, unknown>;
  }): Promise<StoredStageRun> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query("SELECT * FROM acceptance_stage_runs WHERE test_run_id=$1 AND owner_id=$2 FOR UPDATE", [input.testRunId, input.ownerId]);
      if (result.rowCount !== 1 || result.rows[0].stage_id !== "V3.3") throw new NotFoundException("V3.3 TestRun was not found in user scope");
      const previous = this.row(result.rows[0]);
      const assertions = JSON.stringify(input.assertions);
      const evidence = JSON.stringify(input.evidence);
      if (previous.status === input.status
        && isDeepStrictEqual(previous.assertions, input.assertions)
        && isDeepStrictEqual(previous.evidence, input.evidence)) {
        await client.query("COMMIT");
        return previous;
      }
      if (previous.status !== input.expectedStatus) throw new ConflictException("V3.3 TestRun status changed before the requested transition");
      if (!isV33WorkflowTransitionAllowed(input.expectedStatus, input.status)) throw new ConflictException("V3.3 TestRun status transition is not allowed");
      if (input.status === "COMPLETED") {
        try { assertV33CompletionEvidence(input.assertions, input.evidence); }
        catch (error) { throw new ConflictException(error instanceof Error ? error.message : "V3.3 completion evidence is incomplete"); }
      }
      await client.query(`INSERT INTO acceptance_stage_run_history(test_run_id,owner_id,stage_id,scenario_id,status,assertions,evidence)
        VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)`, [input.testRunId, input.ownerId, previous.stageId, previous.scenarioId, previous.status, JSON.stringify(previous.assertions), JSON.stringify(previous.evidence)]);
      const updated = await client.query(`UPDATE acceptance_stage_runs SET status=$3,assertions=$4::jsonb,evidence=$5::jsonb,
        completed_at=CASE WHEN $6::boolean THEN COALESCE(completed_at,now()) ELSE NULL END
        WHERE test_run_id=$1 AND owner_id=$2 RETURNING *`, [input.testRunId, input.ownerId, input.status, assertions, evidence, isV33WorkflowTerminal(input.status)]);
      await client.query("COMMIT");
      return this.row(updated.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async reviseFailedV24Run(testRunId: string, ownerId: string, status: "FAILED" | "COMPLETED", assertions: unknown[], evidence: Record<string, unknown>): Promise<StoredStageRun> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const current = await client.query("SELECT * FROM acceptance_stage_runs WHERE test_run_id=$1 AND owner_id=$2 FOR UPDATE", [testRunId, ownerId]);
      if (current.rowCount !== 1) throw new NotFoundException("V2.4 TestRun was not found in user scope");
      const previous = current.rows[0];
      if (previous.stage_id !== "V2.4" || previous.scenario_id !== "recovery" || previous.status !== "FAILED") throw new ConflictException("only a failed V2.4 recovery TestRun can be resumed");
      await client.query(`INSERT INTO acceptance_stage_run_history(test_run_id,owner_id,stage_id,scenario_id,status,assertions,evidence)
        VALUES($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)`, [testRunId, ownerId, previous.stage_id, previous.scenario_id, previous.status, JSON.stringify(previous.assertions), JSON.stringify(previous.evidence)]);
      const updated = await client.query(`UPDATE acceptance_stage_runs SET status=$3,assertions=$4::jsonb,evidence=$5::jsonb,completed_at=now()
        WHERE test_run_id=$1 AND owner_id=$2 RETURNING *`, [testRunId, ownerId, status, JSON.stringify(assertions), JSON.stringify(evidence)]);
      await client.query("COMMIT");
      return this.row(updated.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }

  async listRunHistory(testRunId: string, ownerId: string): Promise<Array<Record<string, unknown>>> {
    const result = await this.pool.query(`SELECT revision_id,status,assertions,evidence,recorded_at FROM acceptance_stage_run_history WHERE test_run_id=$1 AND owner_id=$2 ORDER BY revision_id`, [testRunId, ownerId]);
    return result.rows.map((row) => ({ revisionId: row.revision_id, status: row.status, assertions: row.assertions, evidence: row.evidence, recordedAt: row.recorded_at.toISOString() }));
  }

  async getV31PromotionGate(testRunId: string): Promise<Record<string, unknown> | null> {
    const result = await this.pool.query(`
      SELECT r.*, a.owner_id AS accepted_owner_id, a.accepted_by, a.note AS acceptance_note,
        a.evidence_sha256 AS accepted_evidence_sha256, a.accepted_at
      FROM acceptance_stage_runs r LEFT JOIN v31_acceptance_records a USING (test_run_id)
      WHERE r.test_run_id=$1 AND r.stage_id='V3.1'`, [testRunId]);
    if (result.rowCount !== 1) return null;
    const row = result.rows[0];
    const run = this.row(row);
    const gate = evaluateV31PromotionGate(run);
    const accepted = gate.stageStatus === "PASS" && row.accepted_owner_id === run.ownerId
      && row.accepted_by === run.ownerId && row.accepted_evidence_sha256?.trim() === gate.evidenceSha256;
    return {
      schemaVersion: "v3.1-promotion-gate-v1", testRunId, stageStatus: gate.stageStatus,
      humanAcceptance: accepted ? "ACCEPTED" : "NOT_RUN", evidenceSha256: gate.evidenceSha256,
      ...(accepted ? { acceptedBy: row.accepted_by, acceptedAt: row.accepted_at.toISOString(), note: row.acceptance_note } : {}),
    };
  }

  async acceptV31Run(testRunId: string, ownerId: string, note: string): Promise<{ acceptedAt: string; evidenceSha256: string }> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query("SELECT * FROM acceptance_stage_runs WHERE test_run_id=$1 AND stage_id='V3.1' AND owner_id=$2 FOR UPDATE", [testRunId, ownerId]);
      if (result.rowCount !== 1) throw new NotFoundException("V3.1 run was not found in user scope");
      const run = this.row(result.rows[0]);
      const gate = evaluateV31PromotionGate(run);
      if (gate.stageStatus !== "PASS") throw new ConflictException("V3.1 run does not meet the exact-run acceptance gate");
      const inserted = await client.query(`INSERT INTO v31_acceptance_records(test_run_id,owner_id,accepted_by,note,evidence_sha256)
        VALUES($1,$2,$2,$3,$4) ON CONFLICT(test_run_id) DO NOTHING RETURNING accepted_at`, [testRunId, ownerId, note, gate.evidenceSha256]);
      if (inserted.rowCount === 1) {
        await client.query("COMMIT");
        return { acceptedAt: inserted.rows[0].accepted_at.toISOString(), evidenceSha256: gate.evidenceSha256 };
      }
      const existing = await client.query("SELECT owner_id,accepted_by,note,evidence_sha256,accepted_at FROM v31_acceptance_records WHERE test_run_id=$1", [testRunId]);
      const row = existing.rows[0];
      if (row.owner_id !== ownerId || row.accepted_by !== ownerId || row.note !== note || row.evidence_sha256.trim() !== gate.evidenceSha256) throw new ConflictException("V3.1 acceptance record already exists with different content");
      await client.query("COMMIT");
      return { acceptedAt: row.accepted_at.toISOString(), evidenceSha256: gate.evidenceSha256 };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally { client.release(); }
  }

  newId() { return randomUUID(); }
  private v13ClockEvent(row: Record<string, any>): import("../ports/stage-run-repository.js").V13SessionAdvance { return { sequence: row.sequence, fromClock: row.from_clock.toISOString(), toClock: row.to_clock.toISOString(), calendarVersion: row.calendar_version, idempotencyKey: row.idempotency_key, recordedAt: row.recorded_at.toISOString() }; }
  private row(row: Record<string, any>): StoredStageRun { return { testRunId: row.test_run_id, stageId: row.stage_id, scenarioId: row.scenario_id, scenarioVersion: row.scenario_version, ownerId: row.owner_id, namespace: row.namespace, status: row.status, seed: row.seed, assertions: row.assertions, evidence: row.evidence, createdAt: row.created_at.toISOString(), completedAt: row.completed_at?.toISOString() ?? null }; }
}

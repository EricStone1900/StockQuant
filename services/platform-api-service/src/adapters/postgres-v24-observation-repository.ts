import { Pool } from "pg";
import { randomUUID } from "node:crypto";

export type PersistedSchedulerState = {
  status: "STOPPED" | "RUNNING";
  samplingIntervalMinutes: number;
  executionWindow: string;
  lastSampleAt: string | null;
  nextSampleAt: string | null;
  tickCount: number;
  mode: "PAPER";
  brokerMode: "FAKE";
};

export type ObservationRecord = {
  observationDate: string;
  sourceAvailable: boolean | null;
  lastSnapshotAt: string | null;
  dataAgeSeconds: number | null;
  samplingEvery30Minutes: boolean | null;
  enteredExecutionWindow: boolean | null;
  signalStatus: "UNKNOWN" | "HOLD" | "SIGNAL" | "NOT_IMPLEMENTED";
  simulatedOrderStatus: "UNKNOWN" | "NONE" | "CREATED" | "NOT_IMPLEMENTED";
  fillStatus: "UNKNOWN" | "NONE" | "FILLED" | "NOT_IMPLEMENTED";
  reconciliationStatus: "UNKNOWN" | "PASS" | "FAIL" | "NOT_IMPLEMENTED";
  outageStatus: "NONE" | "DISCONNECTED" | "SLEEP" | "STALE" | "UNKNOWN";
  testRunId: string | null;
  errors: string[];
  recoveryActions: string[];
  evidence: Record<string, unknown>;
};

export class PostgresV24ObservationRepository {
  constructor(private readonly pool: Pool) {}

  async migrate(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS v24_scheduler_state (
        id SMALLINT PRIMARY KEY CHECK (id = 1),
        status TEXT NOT NULL CHECK (status IN ('STOPPED','RUNNING')),
        sampling_interval_minutes INTEGER NOT NULL CHECK (sampling_interval_minutes IN (20,30)),
        execution_window TEXT NOT NULL,
        last_sample_at TIMESTAMPTZ NULL,
        next_sample_at TIMESTAMPTZ NULL,
        tick_count BIGINT NOT NULL DEFAULT 0,
        mode TEXT NOT NULL CHECK (mode = 'PAPER'),
        broker_mode TEXT NOT NULL CHECK (broker_mode = 'FAKE'),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS v24_observation_days (
        observation_date DATE PRIMARY KEY,
        source_available BOOLEAN NULL,
        last_snapshot_at TIMESTAMPTZ NULL,
        data_age_seconds INTEGER NULL,
        sampling_every_30_minutes BOOLEAN NULL,
        entered_execution_window BOOLEAN NULL,
        signal_status TEXT NOT NULL,
        simulated_order_status TEXT NOT NULL,
        fill_status TEXT NOT NULL,
        reconciliation_status TEXT NOT NULL,
        outage_status TEXT NOT NULL,
        test_run_id UUID NULL,
        errors JSONB NOT NULL DEFAULT '[]'::jsonb,
        recovery_actions JSONB NOT NULL DEFAULT '[]'::jsonb,
        evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS v24_observation_events (
        event_id UUID PRIMARY KEY,
        observation_date DATE NOT NULL,
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        record JSONB NOT NULL
      );
      CREATE INDEX IF NOT EXISTS v24_observation_events_date_idx ON v24_observation_events(observation_date, recorded_at);
      CREATE TABLE IF NOT EXISTS v24_daily_test_runs (
        observation_date DATE PRIMARY KEY,
        test_run_id UUID NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS v24_observation_day_finalizations (
        observation_date DATE PRIMARY KEY,
        finalized_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        final_observation_counted BOOLEAN NOT NULL,
        final_record JSONB NOT NULL,
        source_event_id UUID NOT NULL
      );
    `);
  }

  async loadSchedulerState(): Promise<PersistedSchedulerState | null> {
    const result = await this.pool.query("SELECT * FROM v24_scheduler_state WHERE id=1");
    if (result.rowCount !== 1) return null;
    const row = result.rows[0];
    return {
      status: row.status,
      samplingIntervalMinutes: Number(row.sampling_interval_minutes),
      executionWindow: row.execution_window,
      lastSampleAt: row.last_sample_at?.toISOString() ?? null,
      nextSampleAt: row.next_sample_at?.toISOString() ?? null,
      tickCount: Number(row.tick_count),
      mode: row.mode,
      brokerMode: row.broker_mode
    };
  }

  async saveSchedulerState(state: PersistedSchedulerState): Promise<void> {
    await this.pool.query(`
      INSERT INTO v24_scheduler_state
        (id,status,sampling_interval_minutes,execution_window,last_sample_at,next_sample_at,tick_count,mode,broker_mode,updated_at)
      VALUES (1,$1,$2,$3,$4,$5,$6,$7,$8,now())
      ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status,
        sampling_interval_minutes=EXCLUDED.sampling_interval_minutes,
        execution_window=EXCLUDED.execution_window,
        last_sample_at=EXCLUDED.last_sample_at,
        next_sample_at=EXCLUDED.next_sample_at,
        tick_count=EXCLUDED.tick_count,
        mode=EXCLUDED.mode,
        broker_mode=EXCLUDED.broker_mode,
        updated_at=now()
    `, [state.status, state.samplingIntervalMinutes, state.executionWindow, state.lastSampleAt, state.nextSampleAt, state.tickCount, state.mode, state.brokerMode]);
  }

  async upsertObservation(record: ObservationRecord): Promise<void> {
    const eventId = randomUUID();
    await this.pool.query("INSERT INTO v24_observation_events (event_id, observation_date, recorded_at, record) VALUES ($1, $2, now(), $3::jsonb)", [eventId, record.observationDate, JSON.stringify(record)]);
    if (record.evidence.observationCounted === true) {
      await this.pool.query("INSERT INTO v24_observation_day_finalizations (observation_date, final_observation_counted, final_record, source_event_id) VALUES ($1,true,$2::jsonb,$3) ON CONFLICT (observation_date) DO NOTHING", [record.observationDate, JSON.stringify(record), eventId]);
    }
    await this.pool.query(`
      INSERT INTO v24_observation_days
        (observation_date,source_available,last_snapshot_at,data_age_seconds,sampling_every_30_minutes,entered_execution_window,signal_status,simulated_order_status,fill_status,reconciliation_status,outage_status,test_run_id,errors,recovery_actions,evidence,updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::jsonb,$15::jsonb,now())
      ON CONFLICT (observation_date) DO UPDATE SET
        source_available=COALESCE(EXCLUDED.source_available,v24_observation_days.source_available),last_snapshot_at=COALESCE(EXCLUDED.last_snapshot_at,v24_observation_days.last_snapshot_at),data_age_seconds=COALESCE(EXCLUDED.data_age_seconds,v24_observation_days.data_age_seconds),
        sampling_every_30_minutes=COALESCE(EXCLUDED.sampling_every_30_minutes,v24_observation_days.sampling_every_30_minutes),entered_execution_window=COALESCE(v24_observation_days.entered_execution_window,false) OR COALESCE(EXCLUDED.entered_execution_window,false),
        signal_status=CASE WHEN EXCLUDED.signal_status='UNKNOWN' AND v24_observation_days.signal_status<>'NOT_IMPLEMENTED' THEN v24_observation_days.signal_status ELSE EXCLUDED.signal_status END,simulated_order_status=CASE WHEN EXCLUDED.simulated_order_status='UNKNOWN' AND v24_observation_days.simulated_order_status<>'NOT_IMPLEMENTED' THEN v24_observation_days.simulated_order_status ELSE EXCLUDED.simulated_order_status END,fill_status=CASE WHEN EXCLUDED.fill_status='UNKNOWN' AND v24_observation_days.fill_status<>'NOT_IMPLEMENTED' THEN v24_observation_days.fill_status ELSE EXCLUDED.fill_status END,
        reconciliation_status=CASE WHEN EXCLUDED.reconciliation_status='UNKNOWN' AND v24_observation_days.reconciliation_status<>'NOT_IMPLEMENTED' THEN v24_observation_days.reconciliation_status ELSE EXCLUDED.reconciliation_status END,outage_status=CASE WHEN EXCLUDED.outage_status='UNKNOWN' AND v24_observation_days.outage_status<>'NOT_IMPLEMENTED' THEN v24_observation_days.outage_status ELSE EXCLUDED.outage_status END,test_run_id=COALESCE(EXCLUDED.test_run_id,v24_observation_days.test_run_id),
        errors=v24_observation_days.errors || EXCLUDED.errors,recovery_actions=v24_observation_days.recovery_actions || EXCLUDED.recovery_actions,
        evidence=CASE WHEN v24_observation_days.evidence->>'observationCounted'='true' AND EXCLUDED.evidence->>'observationCounted'='false' THEN v24_observation_days.evidence || (EXCLUDED.evidence - 'observationCounted') ELSE v24_observation_days.evidence || EXCLUDED.evidence END,updated_at=now()
    `, [record.observationDate, record.sourceAvailable, record.lastSnapshotAt, record.dataAgeSeconds, record.samplingEvery30Minutes, record.enteredExecutionWindow, record.signalStatus, record.simulatedOrderStatus, record.fillStatus, record.reconciliationStatus, record.outageStatus, record.testRunId, JSON.stringify(record.errors), JSON.stringify(record.recoveryActions), JSON.stringify(record.evidence)]);
  }

  async ensureDailyTestRun(observationDate: string): Promise<string> {
    const id = randomUUID();
    const result = await this.pool.query<{ test_run_id: string }>(`
      INSERT INTO v24_daily_test_runs (observation_date, test_run_id)
      VALUES ($1,$2)
      ON CONFLICT (observation_date) DO UPDATE SET observation_date=EXCLUDED.observation_date
      RETURNING test_run_id
    `, [observationDate, id]);
    const testRunId = result.rows[0].test_run_id;
    await this.pool.query(`INSERT INTO acceptance_stage_runs (test_run_id,stage_id,scenario_id,scenario_version,owner_id,namespace,status,seed,assertions,evidence)
      VALUES ($1,'V2.4','observation','1.0.0',$2,$3,'RUNNING',0,'[]'::jsonb,$4::jsonb)
      ON CONFLICT (test_run_id) DO NOTHING`, [testRunId, process.env.STOCKQUANT_LOCAL_DEVELOPMENT_USER ?? "acceptance-owner-1", `v24-observation-${observationDate}`, JSON.stringify({ observationDate, noBackfill: true })]);
    return testRunId;
  }

  async completeDailyTestRun(observationDate: string, testRunId: string, evidence: Record<string, unknown>): Promise<void> {
    await this.pool.query(`UPDATE acceptance_stage_runs SET status='COMPLETED', assertions=$2::jsonb, evidence=evidence || $3::jsonb, completed_at=now() WHERE test_run_id=$1 AND stage_id='V2.4'`, [testRunId, JSON.stringify([{ assertionId: "V2.4-OBSERVATION-DAY", status: "PASS", expected: "independent EOD reconciliation", actual: evidence }]), JSON.stringify(evidence)]);
  }

  async listObservations(limit = 30): Promise<ObservationRecord[]> {
    const result = await this.pool.query("SELECT * FROM v24_observation_days ORDER BY observation_date DESC LIMIT $1", [limit]);
    return result.rows.map((row) => ({
      observationDate: row.observation_date.toISOString().slice(0, 10), sourceAvailable: row.source_available,
      lastSnapshotAt: row.last_snapshot_at?.toISOString() ?? null, dataAgeSeconds: row.data_age_seconds,
      samplingEvery30Minutes: row.sampling_every_30_minutes, enteredExecutionWindow: row.entered_execution_window,
      signalStatus: row.signal_status, simulatedOrderStatus: row.simulated_order_status, fillStatus: row.fill_status,
      reconciliationStatus: row.reconciliation_status, outageStatus: row.outage_status, testRunId: row.test_run_id,
      errors: row.errors, recoveryActions: row.recovery_actions, evidence: row.evidence
    }));
  }

  async listEvents(limit = 1000): Promise<Array<{ recordedAt: string; record: ObservationRecord }>> {
    const result = await this.pool.query("SELECT recorded_at, record FROM v24_observation_events ORDER BY recorded_at DESC LIMIT $1", [limit]);
    return result.rows.map((row) => ({ recordedAt: row.recorded_at.toISOString(), record: row.record as ObservationRecord }));
  }
}

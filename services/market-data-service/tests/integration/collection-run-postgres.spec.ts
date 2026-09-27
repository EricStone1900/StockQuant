import { Pool } from "pg";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CollectionRunConflict, CollectionRunRepository } from "../../src/application/collection-run-repository.js";
import { CollectionScheduleRepository } from "../../src/application/collection-schedule-repository.js";
import { CollectionScheduler } from "../../src/application/collection-scheduler.js";
import { PersistentCollectionSchedulerWorker } from "../../src/application/persistent-collection-scheduler.js";
import { BackfillConflict, CoverageRepository } from "../../src/application/coverage-repository.js";
import { ProjectAccessRepository, ProjectAuthenticationError, ProjectQuotaRepositoryError } from "../../src/application/project-access-repository.js";
import { ArtifactDeliveryRepository } from "../../src/application/artifact-delivery-repository.js";
import { DataVersionConflict, ProjectAccessDenied } from "../../src/application/project-delivery.js";
import { AlertOutboxRepository } from "../../src/application/alert-outbox-repository.js";
import { MinuteImportRepository } from "../../src/application/minute-import-repository.js";
import { MINUTE_UPLOAD_CHUNK_BYTES, MinuteUploadConflict, MinuteUploadQuotaExceeded, MinuteUploadRepository, type MinuteUploadMetadata } from "../../src/application/minute-upload-repository.js";

const connectionString = process.env.MARKET_DATA_DATABASE_URL;
const describeIfDatabase = connectionString ? describe : describe.skip;

describeIfDatabase("CollectionRunRepository PostgreSQL integration", () => {
  const pool = new Pool({ connectionString });
  const repository = new CollectionRunRepository(pool);
  const schedules = new CollectionScheduleRepository(pool);
  const coverage = new CoverageRepository(pool);
  const projects = new ProjectAccessRepository(pool);
  const artifacts = new ArtifactDeliveryRepository(pool);
  const alerts = new AlertOutboxRepository(pool);
  const minuteImports = new MinuteImportRepository(pool);
  const minuteUploads = new MinuteUploadRepository(pool);
  const suffix = Date.now().toString();
  const minuteImportHashes: string[] = [];
  const minuteUploadIds: string[] = [];

  beforeAll(async () => {
    await repository.migrate();
    await schedules.migrate();
    await coverage.migrate();
    await projects.migrate();
    await artifacts.migrate();
    await alerts.migrate();
    await minuteImports.migrate();
    await minuteUploads.migrate();
  });

  afterAll(async () => {
    if (minuteUploadIds.length) await pool.query("DELETE FROM market_data_minute_uploads WHERE upload_id=ANY($1::uuid[])", [minuteUploadIds]);
    if (minuteImportHashes.length) await pool.query("DELETE FROM market_data_minute_imports WHERE source_sha256=ANY($1::text[])", [minuteImportHashes]);
    await pool.query("UPDATE market_data_collection_schedules SET enabled=false WHERE subscription_id LIKE $1", [`%${suffix}`]);
    await pool.end();
  });

  it("claims, checkpoints, publishes and rejects stale fencing tokens", async () => {
    const request = { subscriptionId: `integration-${suffix}`, subscriptionVersion: 1, windowStart: "2026-09-11T05:35:00.000Z", windowEnd: "2026-09-11T05:40:00.000Z", jobKind: "INTRADAY_WINDOW" as const, idempotencyKey: `integration-${suffix}`, requestHash: "c".repeat(64) };
    const created = await repository.create(request);
    const duplicate = await repository.create(request);
    expect(duplicate.created).toBe(false);
    const claimed = await repository.claim(created.run.runId, 30);
    expect(claimed?.status).toBe("RUNNING");
    await expect(repository.checkpoint(created.run.runId, 0, { cursor: 1 })).rejects.toBeInstanceOf(CollectionRunConflict);
    await repository.checkpoint(created.run.runId, claimed!.fencingToken, { cursor: 1 });
    const published = await repository.publish(created.run.runId, claimed!.fencingToken, `artifact-${suffix}`);
    expect(published.status).toBe("COMPLETED");
    expect(published.publishedArtifactId).toBe(`artifact-${suffix}`);
    const events = (await repository.pendingEvents(10_000)).filter((event) => event.runId === created.run.runId);
    expect(events).toHaveLength(1);
    await repository.markEventSent(events[0].eventId);
    expect((await repository.pendingEvents(10_000)).some((event) => event.runId === created.run.runId)).toBe(false);
  });

  it("lets a new worker take over an expired lease and fences the old worker", async () => {
    const request = { subscriptionId: `takeover-${suffix}`, subscriptionVersion: 1, windowStart: "2026-09-11T05:40:00.000Z", windowEnd: "2026-09-11T05:45:00.000Z", jobKind: "INTRADAY_WINDOW" as const, idempotencyKey: `takeover-${suffix}`, requestHash: "e".repeat(64) };
    const created = await repository.create(request);
    const firstWorker = await repository.claim(created.run.runId, 30);
    expect(firstWorker?.fencingToken).toBe(1);
    await pool.query("UPDATE market_data_collection_runs SET lease_until=now() - interval '1 second' WHERE run_id=$1", [created.run.runId]);
    const secondWorker = await repository.claim(created.run.runId, 30);
    expect(secondWorker?.fencingToken).toBe(2);
    await expect(repository.checkpoint(created.run.runId, firstWorker!.fencingToken, { cursor: "old-worker" })).rejects.toBeInstanceOf(CollectionRunConflict);
    await repository.checkpoint(created.run.runId, secondWorker!.fencingToken, { cursor: "new-worker" });
  });

  it("resumes only the requested version and keeps completed runs idempotent", async () => {
    const request = { subscriptionId: `resume-${suffix}`, subscriptionVersion: 1, windowStart: "2026-09-11T06:00:00.000Z", windowEnd: "2026-09-11T06:05:00.000Z", jobKind: "INTRADAY_WINDOW" as const, idempotencyKey: `resume-${suffix}`, requestHash: "r".repeat(64) };
    const created = await repository.create(request);
    await pool.query("UPDATE market_data_collection_runs SET status='PAUSED' WHERE run_id=$1", [created.run.runId]);
    await expect(repository.resume(created.run.runId, created.run.version + 1)).rejects.toBeInstanceOf(CollectionRunConflict);
    const resumed = await repository.resume(created.run.runId, created.run.version);
    expect(resumed.status).toBe("QUEUED");
    await expect(repository.resume(created.run.runId, resumed.version)).rejects.toBeInstanceOf(CollectionRunConflict);
    const claimed = await repository.claim(created.run.runId, 30);
    await repository.publish(created.run.runId, claimed!.fencingToken, `resume-artifact-${suffix}`);
    await expect(repository.resume(created.run.runId, (await repository.find(created.run.runId))!.version)).rejects.toBeInstanceOf(CollectionRunConflict);
  });

  it("does not confirm a task when the database is unavailable", async () => {
    const unavailable = new Pool({ connectionString: "postgresql://market_data@127.0.0.1:59999/market_data", connectionTimeoutMillis: 200 });
    const unavailableRepository = new CollectionRunRepository(unavailable);
    await expect(unavailableRepository.migrate()).rejects.toBeTruthy();
    await unavailable.end();
  });

  it("keeps the completion event pending when delivery is unavailable, then allows retry", async () => {
    const request = { subscriptionId: `outbox-${suffix}`, subscriptionVersion: 1, windowStart: "2026-09-11T05:45:00.000Z", windowEnd: "2026-09-11T05:50:00.000Z", jobKind: "INTRADAY_WINDOW" as const, idempotencyKey: `outbox-${suffix}`, requestHash: "f".repeat(64) };
    const created = await repository.create(request);
    const claimed = await repository.claim(created.run.runId, 30);
    await repository.publish(created.run.runId, claimed!.fencingToken, `artifact-${suffix}-outbox`);
    const pending = await repository.pendingEvents(10_000);
    expect(pending.some((event) => event.runId === created.run.runId)).toBe(true);
    // Simulate a broker outage: the dispatcher does not mark the event sent.
    expect((await repository.pendingEvents(10_000)).some((event) => event.runId === created.run.runId)).toBe(true);
    const event = pending.find((item) => item.runId === created.run.runId)!;
    await repository.markEventSent(event.eventId);
    expect((await repository.pendingEvents(10_000)).some((item) => item.runId === created.run.runId)).toBe(false);
  });

  it("recovers after a real worker process is terminated and fences its lease", async () => {
    const request = { subscriptionId: `crash-${suffix}`, subscriptionVersion: 1, windowStart: "2026-09-11T05:50:00.000Z", windowEnd: "2026-09-11T05:55:00.000Z", jobKind: "INTRADAY_WINDOW" as const, idempotencyKey: `crash-${suffix}`, requestHash: "1".repeat(64) };
    const created = await repository.create(request);
    const script = `const {Client}=require('pg'); const c=new Client({connectionString:process.env.MARKET_DATA_DATABASE_URL}); (async()=>{await c.connect(); await c.query("UPDATE market_data_collection_runs SET status='RUNNING',fencing_token=fencing_token+1,lease_until=now()+interval '30 seconds',version=version+1 WHERE run_id=$1",[process.env.RUN_ID]); process.stdout.write('CLAIMED\\n'); setInterval(()=>{},1000)})().catch(e=>{console.error(e);process.exit(1)})`;
    const worker = spawn(process.execPath, ["-e", script], { env: { ...process.env, MARKET_DATA_DATABASE_URL: connectionString, RUN_ID: created.run.runId } });
    await new Promise<void>((resolveReady, reject) => {
      const timer = setTimeout(() => reject(new Error("worker did not claim before timeout")), 5000);
      worker.stdout.on("data", (chunk: Buffer) => { if (chunk.toString().includes("CLAIMED")) { clearTimeout(timer); resolveReady(); } });
      worker.once("error", reject);
    });
    worker.kill("SIGKILL");
    await once(worker, "close");
    await pool.query("UPDATE market_data_collection_runs SET lease_until=now() - interval '1 second' WHERE run_id=$1", [created.run.runId]);
    const takeover = await repository.claim(created.run.runId, 30);
    expect(takeover?.fencingToken).toBe(2);
    await expect(repository.checkpoint(created.run.runId, 1, { cursor: "crashed-worker" })).rejects.toBeInstanceOf(CollectionRunConflict);
    await repository.checkpoint(created.run.runId, takeover!.fencingToken, { cursor: "recovered-worker" });
  });

  it("validates a Fixture and publishes its content-addressed Artifact atomically", async () => {
    const fixturePath = resolve(process.cwd(), "../../fixtures/v2/v2.2/minute_bars.csv");
    const fixture = await readFile(fixturePath);
    const lines = fixture.toString("utf8").trim().split(/\r?\n/);
    const rowCount = Math.max(0, lines.length - 1);
    expect(lines[0]).toContain("securityId");
    expect(rowCount).toBeGreaterThan(0);
    const sha256 = createHash("sha256").update(fixture).digest("hex");
    const request = { subscriptionId: `fixture-${suffix}`, subscriptionVersion: 1, windowStart: "2026-09-11T05:55:00.000Z", windowEnd: "2026-09-11T06:00:00.000Z", jobKind: "INTRADAY_WINDOW" as const, idempotencyKey: `fixture-${suffix}`, requestHash: sha256 };
    const created = await repository.create(request);
    const claimed = await repository.claim(created.run.runId, 30);
    const artifactId = `fixture-v2.2-${sha256.slice(0, 16)}`;
    const published = await repository.publish(created.run.runId, claimed!.fencingToken, artifactId, { sha256, rowCount });
    expect(published.status).toBe("COMPLETED");
    expect(await repository.findArtifact(artifactId)).toEqual({ artifactId, runId: created.run.runId, sha256, rowCount });
    const event = (await repository.pendingEvents(10_000)).find((item) => item.runId === created.run.runId)!;
    expect(event.payload).toMatchObject({ runId: created.run.runId, artifactId, sha256, rowCount });
  });

  it("durably imports versioned minute rows with concurrent hash idempotency and keyset pagination", async () => {
    const sourceSha256 = createHash("sha256").update(`minute-import-${suffix}`).digest("hex");
    minuteImportHashes.push(sourceSha256);
    const bars = [
      { securityId: "600000.SH", market: "CN_A", frequency: "5m", barStart: "2026-09-11T09:30:00+08:00", barEnd: "2026-09-11T09:35:00+08:00", availableAt: "2026-09-11T09:35:01+08:00", open: 10, high: 10.2, low: 9.9, close: 10.1, volume: 100, amount: 1000, adjustment: "raw" },
      { securityId: "600000.SH", market: "CN_A", frequency: "5m", barStart: "2026-09-11T09:35:00+08:00", barEnd: "2026-09-11T09:40:00+08:00", availableAt: "2026-09-11T09:40:01+08:00", open: 10.1, high: 10.3, low: 10, close: 10.2, volume: 120, amount: 1200, adjustment: "raw" },
    ];
    const request = { sourceSha256, status: "PUBLISHED" as const, accepted: bars.length, errors: [], bars };
    const concurrent = await Promise.all([minuteImports.publish(request), minuteImports.publish(request)]);
    expect(concurrent.filter((result) => !result.idempotent)).toHaveLength(1);
    expect(concurrent.map((result) => result.record.version).every((version) => version === `v2.2-import-${sourceSha256.slice(0, 12)}`)).toBe(true);
    const version = concurrent[0].record.version;
    const firstPage = await minuteImports.page(version, 0, 1);
    expect(firstPage).toEqual({ version, items: [bars[0]], nextCursor: "1" });
    await expect(minuteImports.page(version,0,10,undefined,bars[0].barStart,bars[1].barStart)).resolves.toMatchObject({ items: [bars[0]], nextCursor: null });
    await expect(pool.query<{ relkind: string }>("SELECT relkind FROM pg_class WHERE oid='market_data_minute_import_bars_by_day'::regclass")).resolves.toMatchObject({ rows: [{ relkind: "p" }] });
    await expect(pool.query<{ exists: boolean }>("SELECT to_regclass('market_data_minute_import_bars_20260911') IS NOT NULL AS exists")).resolves.toMatchObject({ rows: [{ exists: true }] });
    const secondPage = await new MinuteImportRepository(pool).page(version, Number(firstPage.nextCursor), 1);
    expect(secondPage).toEqual({ version, items: [bars[1]], nextCursor: null });
    expect(await minuteImports.page(version, 0, 10, "000001.SZ")).toEqual({ version, items: [], nextCursor: null });
    await expect(new MinuteImportRepository(pool).find(version)).resolves.toMatchObject({ status: "PUBLISHED", accepted: 2, sha256: sourceSha256 });
    await expect(minuteImports.page(version, -1, 1)).rejects.toThrow("non-negative integer");
    await expect(minuteImports.page(version, 0, 1001)).rejects.toThrow("between 1 and 1000");
  });

  it("reads legacy rows during additive migration and backfills them into daily partitions idempotently", async () => {
    const sourceSha256 = createHash("sha256").update(`legacy-partition-${suffix}`).digest("hex");
    const importKeySha256 = createHash("sha256").update(`legacy-partition-key-${suffix}`).digest("hex");
    const version = `legacy-partition-${suffix}`;
    minuteImportHashes.push(sourceSha256);
    const bar = { securityId: "600000.SH", market: "CN_A", frequency: "1m", barStart: "2026-09-11T09:30:00+08:00", barEnd: "2026-09-11T09:31:00+08:00", availableAt: "2026-09-11T09:31:00+08:00", open: 10, high: 10.2, low: 9.9, close: 10.1, volume: 100, amount: 1000, adjustment: "RAW" };
    await pool.query(`INSERT INTO market_data_minute_imports(import_key_sha256,source_sha256,import_id,version,status,accepted,errors,import_manifest)
      VALUES($1,$2,$3,$4,'PUBLISHED',2,'[]'::jsonb,'{"mapping":{},"semantics":{},"provenance":null,"researchUseAllowed":false}'::jsonb)`, [importKeySha256,sourceSha256,`legacy-partition-${suffix}`,version]);
    await pool.query("INSERT INTO market_data_minute_import_rows(version,row_number,security_id,bar_start,bar) VALUES($1,1,$2,$3,$4::jsonb)", [version,bar.securityId,bar.barStart,JSON.stringify(bar)]);
    const nextBar = { ...bar, barStart: "2026-09-12T09:30:00+08:00", barEnd: "2026-09-12T09:31:00+08:00", availableAt: "2026-09-12T09:31:00+08:00" };
    await pool.query("INSERT INTO market_data_minute_import_rows(version,row_number,security_id,bar_start,bar) VALUES($1,2,$2,$3,$4::jsonb)", [version,nextBar.securityId,nextBar.barStart,JSON.stringify(nextBar)]);
    await expect(minuteImports.page(version,0,10)).resolves.toMatchObject({ items: [bar,nextBar], nextCursor: null });
    await expect(minuteImports.page(version,0,10,undefined,"2026-09-11T09:30:00+08:00","2026-09-12T00:00:00+08:00")).resolves.toMatchObject({ items: [bar], nextCursor: null });
    await expect(minuteImports.backfillLegacyPartitions(1)).resolves.toBe(2);
    await expect(minuteImports.backfillLegacyPartitions(1)).resolves.toBe(0);
    await expect(minuteImports.page(version,0,10)).resolves.toMatchObject({ items: [bar,nextBar], nextCursor: null });
    await expect(minuteImports.page(version,0,10,undefined,"2026-09-11T09:30:00+08:00","2026-09-12T00:00:00+08:00")).resolves.toMatchObject({ items: [bar], nextCursor: null });
    await expect(pool.query<{ count: number }>("SELECT count(*)::int AS count FROM market_data_minute_import_bars_by_day WHERE version=$1",[version])).resolves.toMatchObject({ rows: [{ count: 2 }] });
    const plan = await pool.query<{ "QUERY PLAN": string }>(`EXPLAIN (COSTS OFF) SELECT row_number FROM market_data_minute_import_bars_by_day WHERE version='${version}' AND bar_start >= TIMESTAMPTZ '2026-09-11 09:30:00+08' AND bar_start < TIMESTAMPTZ '2026-09-12 00:00:00+08'`);
    const planText = plan.rows.map(row => row["QUERY PLAN"]).join("\n");
    expect(planText).toContain("market_data_minute_import_bars_20260911");
    expect(planText).not.toContain("market_data_minute_import_bars_20260912");
  });

  it("resumes immutable upload chunks after repository recreation and enforces owner quota and cancellation", async () => {
    const repository = new MinuteUploadRepository(pool);
    const ownerId = `csv-upload-owner-${suffix}`;
    const metadata: MinuteUploadMetadata = {
      mapping: { securityId: "code", timestamp: "time", open: "open", high: "high", low: "low", close: "close", volume: "volume", amount: "amount" },
      provenance: { sourceName: "integration fixture", sourceReference: null, licenseStatement: "test-only", licenseVerification: "UNCONFIRMED", acquiredAt: "2026-09-25T00:00:00.000Z" },
      market: "CN_A", frequency: "1m", adjustment: "RAW", timezone: "Asia/Shanghai", timestampSemantics: "BAR_START", volumeUnit: "SHARES", amountUnit: "CNY",
    };
    const content = Buffer.alloc(MINUTE_UPLOAD_CHUNK_BYTES + 3, 97);
    const uploadId = randomUUID(); minuteUploadIds.push(uploadId);
    const created = await repository.create({ uploadId, ownerId, expectedSha256: createHash("sha256").update(content).digest("hex"), expectedBytes: content.length, metadata });
    expect(created.progress).toMatchObject({ status: "OPEN", receivedBytes: 0, expectedChunks: 2, receivedChunks: [] });
    const firstChunk = content.subarray(0, MINUTE_UPLOAD_CHUNK_BYTES);
    const lastChunk = content.subarray(MINUTE_UPLOAD_CHUNK_BYTES);
    const firstSha = createHash("sha256").update(firstChunk).digest("hex");
    const lastSha = createHash("sha256").update(lastChunk).digest("hex");
    await expect(repository.putChunk({ ownerId, uploadId, index: 1, content: lastChunk, sha256: lastSha })).resolves.toMatchObject({ progress: { receivedChunks: [1] }, idempotent: false });
    await expect(repository.putChunk({ ownerId, uploadId, index: 1, content: lastChunk, sha256: lastSha })).resolves.toMatchObject({ idempotent: true });
    await expect(repository.putChunk({ ownerId: "another-owner", uploadId, index: 0, content: firstChunk, sha256: firstSha })).rejects.toBeInstanceOf(MinuteUploadConflict);
    await expect(repository.putChunk({ ownerId, uploadId, index: 0, content: firstChunk, sha256: "0".repeat(64) })).rejects.toBeInstanceOf(MinuteUploadConflict);
    await expect(new MinuteUploadRepository(pool).progress(ownerId, uploadId)).resolves.toMatchObject({ receivedBytes: lastChunk.length, receivedChunks: [1] });
    await repository.putChunk({ ownerId, uploadId, index: 0, content: firstChunk, sha256: firstSha });
    const resumedRepository = new MinuteUploadRepository(pool);
    const finalization = await resumedRepository.beginFinalization(ownerId, uploadId);
    const restoredChunks: Buffer[] = [];
    for await (const chunk of resumedRepository.readFinalizationChunks(ownerId, uploadId, finalization.expectedChunks)) restoredChunks.push(chunk);
    const restoredContent = Buffer.concat(restoredChunks);
    expect(restoredContent).toEqual(content);
    expect(createHash("sha256").update(restoredContent).digest("hex")).toBe(finalization.expectedSha256);
    await expect(repository.cancel(ownerId, uploadId)).rejects.toBeInstanceOf(MinuteUploadConflict);
    await repository.complete(ownerId, uploadId, { importId: "resumable-import-test", version: "resumable-v1", status: "PUBLISHED" });
    await expect(new MinuteUploadRepository(pool).progress(ownerId, uploadId)).resolves.toMatchObject({ status: "COMPLETED", receivedBytes: content.length, receivedChunks: [0, 1], result: { version: "resumable-v1" } });
    await expect(pool.query("SELECT count(*)::int AS count FROM market_data_minute_upload_chunks WHERE upload_id=$1", [uploadId])).resolves.toMatchObject({ rows: [{ count: 0 }] });

    const quotaOwner = `${ownerId}-quota`;
    const openA = randomUUID(); const openB = randomUUID(); const rejected = randomUUID();
    minuteUploadIds.push(openA, openB, rejected);
    const oneByteHash = createHash("sha256").update("x").digest("hex");
    await repository.create({ uploadId: openA, ownerId: quotaOwner, expectedSha256: oneByteHash, expectedBytes: 1, metadata });
    await repository.create({ uploadId: openB, ownerId: quotaOwner, expectedSha256: oneByteHash, expectedBytes: 1, metadata });
    await expect(repository.create({ uploadId: rejected, ownerId: quotaOwner, expectedSha256: oneByteHash, expectedBytes: 1, metadata })).rejects.toBeInstanceOf(MinuteUploadQuotaExceeded);
    await expect(repository.cancel(quotaOwner, openA)).resolves.toMatchObject({ status: "CANCELLED", receivedBytes: 0 });
    await expect(repository.cancel(quotaOwner, openA)).resolves.toMatchObject({ status: "CANCELLED" });
    await expect(repository.create({ uploadId: rejected, ownerId: quotaOwner, expectedSha256: oneByteHash, expectedBytes: 1, metadata })).resolves.toMatchObject({ progress: { status: "OPEN" } });
  });

  it("keeps same CSV bytes distinct when its explicit field mapping changes", async () => {
    const sourceSha256 = createHash("sha256").update(`same-csv-different-map-${suffix}`).digest("hex");
    const firstImportKey = createHash("sha256").update(`map-a-${suffix}`).digest("hex");
    const secondImportKey = createHash("sha256").update(`map-b-${suffix}`).digest("hex");
    minuteImportHashes.push(sourceSha256);
    const bar = { securityId: "600000.SH", market: "CN_A", frequency: "1m", barStart: "2026-09-11T01:30:00.000Z", barEnd: "2026-09-11T01:31:00.000Z", availableAt: "2026-09-11T01:31:00.000Z", open: 10, high: 10, low: 10, close: 10, volume: 100, amount: 1000, adjustment: "RAW" };
    const manifest = { mapping: { securityId: "code", timestamp: "time" }, semantics: { market: "CN_A", frequency: "1m", timezone: "Asia/Shanghai" }, provenance: { sourceName: "integration test source", sourceReference: null, licenseStatement: "synthetic test fixture", licenseVerification: "OPERATOR_CONFIRMED" as const, acquiredAt: "2026-09-11T00:00:00.000Z" }, researchUseAllowed: true };
    const first = await minuteImports.publish({ sourceSha256, importKeySha256: firstImportKey, manifest, status: "PUBLISHED", accepted: 1, errors: [], bars: [bar] });
    const replay = await minuteImports.publish({ sourceSha256, importKeySha256: firstImportKey, status: "PUBLISHED", accepted: 1, errors: [], bars: [bar] });
    const second = await minuteImports.publish({ sourceSha256, importKeySha256: secondImportKey, status: "PUBLISHED", accepted: 1, errors: [], bars: [{ ...bar, securityId: "000001.SZ" }] });
    expect(first.idempotent).toBe(false);
    expect(replay.idempotent).toBe(true);
    expect(second.idempotent).toBe(false);
    expect(second.record.sha256).toBe(sourceSha256);
    expect(first.record.manifest).toEqual(manifest);
    expect((await minuteImports.find(first.record.version))?.manifest).toEqual(manifest);
    expect(second.record.version).not.toBe(first.record.version);
    await expect(minuteImports.page(first.record.version, 0, 10)).resolves.toMatchObject({ items: [{ securityId: "600000.SH" }] });
    await expect(minuteImports.page(second.record.version, 0, 10)).resolves.toMatchObject({ items: [{ securityId: "000001.SZ" }] });
  });

  it("backfills legacy CSV manifests with unknown provenance and blocks research use", async () => {
    const sourceSha256 = createHash("sha256").update(`legacy-import-manifest-${suffix}`).digest("hex");
    const importKeySha256 = createHash("sha256").update(`legacy-import-key-${suffix}`).digest("hex");
    const version = `legacy-manifest-${suffix}`;
    minuteImportHashes.push(sourceSha256);
    await pool.query(`INSERT INTO market_data_minute_imports(import_key_sha256,source_sha256,import_id,version,status,accepted,errors,import_manifest)
      VALUES($1,$2,$3,$4,'REJECTED',0,'[]'::jsonb,'{"mapping":{},"semantics":{}}'::jsonb)`, [importKeySha256, sourceSha256, `legacy-${suffix}`, version]);
    await minuteImports.migrate();
    await expect(minuteImports.find(version)).resolves.toMatchObject({ manifest: { provenance: null, researchUseAllowed: false } });
  });

  it("publishes normalized rows with Artifact metadata in one database transaction", async () => {
    const projectId = `executor-project-${suffix}`;
    await projects.register(projectId, `executor-token-${suffix}`, ["DATA_READ"], 1, 20);
    const request = { subscriptionId: `executor-${suffix}`, subscriptionVersion: 1, windowStart: "2026-09-11T01:30:00.000Z", windowEnd: "2026-09-11T01:35:00.000Z", jobKind: "INTRADAY_WINDOW" as const, idempotencyKey: `executor-${suffix}`, requestHash: "d".repeat(64) };
    const created = await repository.create(request);
    const claimed = await repository.claim(created.run.runId, 30);
    const rows = [{ securityId: "600000.SH", barStart: "2026-09-11T09:30:00+08:00", close: 10, sourceId: "baostock", testRun: suffix }];
    const sha256 = createHash("sha256").update(JSON.stringify(rows)).digest("hex");
    const artifactId = `executor-${sha256.slice(0, 16)}`;
    const published = await repository.publishRows({ runId: created.run.runId, fencingToken: claimed!.fencingToken, artifactId, sha256, projectId, dataVersion: "cn-5m-raw-v1", rows });
    expect(published.status).toBe("COMPLETED");
    expect(await repository.findArtifact(artifactId)).toEqual({ artifactId, runId: created.run.runId, sha256, rowCount: 1 });
    expect(await artifacts.page(projectId, artifactId, "cn-5m-raw-v1", 0, 10)).toEqual({ dataVersion: "cn-5m-raw-v1", items: rows, nextCursor: null });
  });

  it("persists schedule configuration, enforces a single scheduler lease and resumes from its watermark", async () => {
    const subscriptionId = `schedule-${suffix}`;
    const created = await schedules.upsert({ subscriptionId, subscriptionVersion: 1, fromDate: "2026-09-11", toDate: "2026-09-11", calendarVersion: "fixture-cn-1" });
    expect(created.enabled).toBe(false);
    const enabled = await schedules.setEnabled(subscriptionId, true);
    expect((await schedules.find(subscriptionId))?.enabled).toBe(true);
    await pool.query("UPDATE market_data_collection_scheduler_lease SET lease_until=now() - interval '1 second' WHERE lease_id=1");
    const firstLease = await schedules.acquireLease(`worker-a-${suffix}`, 60);
    expect(firstLease?.fencingToken).toBeGreaterThan(0);
    expect(await schedules.acquireLease(`worker-b-${suffix}`, 60)).toBeNull();

    const planner = new CollectionScheduler({ session: (date) => ({ date, status: "TRADING" as const, calendarVersion: "fixture-cn-1", sessions: [{ start: "09:30", end: "09:40" }, { start: "13:00", end: "13:10" }] }) }, { now: () => new Date("2026-09-11T06:00:00.000Z") }, 5, 120);
    const worker = new PersistentCollectionSchedulerWorker(schedules, repository, planner, `worker-a-${suffix}`);
    const firstTick = await worker.tick();
    expect(firstTick.leaseAcquired).toBe(true);
    expect(firstTick.schedules).toBeGreaterThanOrEqual(1);
    expect(firstTick.submitted).toBeGreaterThanOrEqual(4);
    const after = await schedules.find(subscriptionId);
    expect(after?.watermarkEnd).toBe("2026-09-11T05:10:00.000Z");

    const resumed = new PersistentCollectionSchedulerWorker(schedules, repository, planner, `worker-a-${suffix}`);
    const secondTick = await resumed.tick();
    expect(secondTick.submitted).toBe(0);
    expect((await schedules.find(subscriptionId))?.version).toBe(after?.version);
    expect(enabled.version).toBeLessThan(after!.version);
    await schedules.setEnabled(subscriptionId, false);
  });

  it("switches enabled subscriptions atomically", async () => {
    const current = (await schedules.enabled())[0];
    const sourceId = current?.subscriptionId ?? `switch-source-${suffix}`;
    const targetId = `switch-target-${suffix}`;
    if (!current) {
      await schedules.upsert({ subscriptionId: sourceId, subscriptionVersion: 1, fromDate: "2026-09-11", toDate: "2026-09-11", calendarVersion: "fixture-cn-1" });
      await schedules.setEnabled(sourceId, true);
    }
    await schedules.upsert({ subscriptionId: targetId, subscriptionVersion: 1, fromDate: "2026-09-11", toDate: "2026-09-11", calendarVersion: "fixture-cn-1" });
    const switched = await schedules.switchEnabled(sourceId, targetId);
    expect(switched.source.enabled).toBe(false);
    expect(switched.target.enabled).toBe(true);
    expect((await schedules.find(sourceId))?.enabled).toBe(false);
    expect((await schedules.find(targetId))?.enabled).toBe(true);
    await schedules.switchEnabled(targetId, sourceId);
  });

  it("persists gaps and makes backfill requests idempotent", async () => {
    const subscriptionId = `coverage-${suffix}`;
    const gaps = [{ gapId: `gap-${suffix}`, securityId: "600000.SH", barStart: "2026-09-11T01:35:00.000Z", barEnd: "2026-09-11T01:40:00.000Z", reason: "MISSING" as const, priority: "P1" as const }];
    expect(await coverage.upsertGaps(subscriptionId, gaps)).toBe(1);
    expect((await coverage.open(subscriptionId))).toHaveLength(1);
    expect(await coverage.upsertGaps(subscriptionId, gaps)).toBe(1);
    expect((await coverage.open(subscriptionId))).toHaveLength(1);
    await coverage.close(gaps[0].gapId);
    expect(await coverage.open(subscriptionId)).toHaveLength(0);
    const first = await coverage.createBackfill(subscriptionId, "2026-09-11", "2026-09-11", `backfill-${suffix}`);
    const second = await coverage.createBackfill(subscriptionId, "2026-09-11", "2026-09-11", `backfill-${suffix}`);
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.task.taskId).toBe(first.task.taskId);
    await expect(coverage.createBackfill(subscriptionId, "2026-09-10", "2026-09-11", `backfill-${suffix}`)).rejects.toBeInstanceOf(BackfillConflict);
  });

  it("summarizes expanded backfill runs by task prefix", async () => {
    const taskId = (await coverage.createBackfill(`summary-${suffix}`, "2026-09-11", "2026-09-11", `summary-${suffix}`)).task.taskId;
    for (const [startTime, endTime] of [["01:30", "01:35"], ["01:35", "01:40"]] as const) {
      const start = `2026-09-11T${startTime}:00.000Z`;
      const end = `2026-09-11T${endTime}:00.000Z`;
      await repository.create({ subscriptionId: `summary-${suffix}`, subscriptionVersion: 1, windowStart: start, windowEnd: end, jobKind: "BACKFILL", idempotencyKey: `${taskId}|${start}|${end}|BACKFILL`, requestHash: "a".repeat(64) });
    }
    expect(await repository.summarizeBackfill(taskId)).toEqual({ total: 2, completed: 0, failed: 0, active: 2 });
    const runs = await pool.query<{ run_id: string }>("SELECT run_id FROM market_data_collection_runs WHERE idempotency_key LIKE $1 ORDER BY idempotency_key", [`${taskId}|%`]);
    for (const row of runs.rows) {
      const claimed = await repository.claim(row.run_id, 30);
      await repository.publish(row.run_id, claimed!.fencingToken, `summary-artifact-${row.run_id}`);
    }
    expect(await repository.summarizeBackfill(taskId)).toEqual({ total: 2, completed: 2, failed: 0, active: 0 });
  });

  it("keeps a backfill task queued when its expansion is incomplete", async () => {
    const task = await coverage.createBackfill(`queued-${suffix}`, "2026-09-11", "2026-09-11", `queued-${suffix}`);
    expect(task.task.status).toBe("QUEUED");
    expect(await repository.summarizeBackfill(task.task.taskId)).toEqual({ total: 0, completed: 0, failed: 0, active: 0 });
  });

  it("closes resolved gaps during scoped reconciliation", async () => {
    const subscriptionId = `coverage-reconcile-${suffix}`;
    const gap = { gapId: `gap-reconcile-${suffix}`, securityId: "600000.SH", barStart: "2026-09-11T01:35:00.000Z", barEnd: "2026-09-11T01:40:00.000Z", reason: "MISSING" as const, priority: "P1" as const };
    await coverage.reconcileGaps(subscriptionId, "2026-09-11", "2026-09-11", [gap.securityId], [gap]);
    expect(await coverage.open(subscriptionId)).toHaveLength(1);
    const result = await coverage.reconcileGaps(subscriptionId, "2026-09-11", "2026-09-11", [gap.securityId], []);
    expect(result.closed).toBe(1);
    expect(await coverage.open(subscriptionId)).toHaveLength(0);
  });

  it("authenticates persisted projects and enforces the persisted run quota", async () => {
    const projectId = `project-${suffix}`;
    const registered = await projects.register(projectId, `token-${suffix}`, ["DATA_READ", "DATA_EXPORT"], 1, 20);
    expect(registered.projectId).toBe(projectId);
    expect((await projects.authenticate(projectId, `token-${suffix}`)).scopes).toContain("DATA_EXPORT");
    await expect(projects.authenticate(projectId, "wrong-token")).rejects.toBeInstanceOf(ProjectAuthenticationError);
    await projects.reserveRun(projectId);
    await expect(projects.reserveRun(projectId)).rejects.toBeInstanceOf(ProjectQuotaRepositoryError);
    await projects.releaseRun(projectId);
    await expect(projects.reserveRun(projectId)).resolves.toBeTruthy();
    await projects.recordQueueMetric(projectId, "admitted");
    await projects.recordQueueMetric(projectId, "rejected");
    expect(await projects.queueMetrics(projectId)).toMatchObject({ projectId, admitted: 1, rejected: 1 });
  });

  it("persists project-scoped artifact rows and resumes immutable pagination", async () => {
    const projectId = `artifact-project-${suffix}`;
    const otherProjectId = `artifact-other-${suffix}`;
    await projects.register(projectId, `artifact-token-${suffix}`, ["DATA_READ", "DATA_WRITE"], 1, 20);
    await projects.register(otherProjectId, `artifact-other-token-${suffix}`, ["DATA_READ"], 1, 20);
    const request = { subscriptionId: `artifact-page-${suffix}`, subscriptionVersion: 1, windowStart: "2026-09-11T06:00:00.000Z", windowEnd: "2026-09-11T06:05:00.000Z", jobKind: "INTRADAY_WINDOW" as const, idempotencyKey: `artifact-page-${suffix}`, requestHash: "a".repeat(64) };
    const created = await repository.create(request);
    const claimed = await repository.claim(created.run.runId, 30);
    const artifactId = `artifact-page-${suffix}`;
    await repository.publish(created.run.runId, claimed!.fencingToken, artifactId, { sha256: "b".repeat(64), rowCount: 3 });
    expect(await artifacts.publishRows(projectId, artifactId, "data-v1", [{ row: 1 }, { row: 2 }, { row: 3 }])).toBe(3);
    expect(await artifacts.page(projectId, artifactId, "data-v1", 0, 2)).toEqual({ dataVersion: "data-v1", items: [{ row: 1 }, { row: 2 }], nextCursor: "2" });
    expect(await artifacts.page(projectId, artifactId, "data-v1", 2, 2)).toEqual({ dataVersion: "data-v1", items: [{ row: 3 }], nextCursor: null });
    await expect(artifacts.page(otherProjectId, artifactId, "data-v1", 0, 2)).rejects.toBeInstanceOf(ProjectAccessDenied);
    await expect(artifacts.page(projectId, artifactId, "data-old", 0, 2)).rejects.toBeInstanceOf(DataVersionConflict);
    expect(await artifacts.publishRows(projectId, artifactId, "data-v1", [{ row: 1 }, { row: 2 }, { row: 3 }])).toBe(3);
  });

  it("deduplicates alert events and retains failed delivery for retry", async () => {
    const key = `alert-${suffix}`;
    const first = await alerts.enqueue(key, "SOURCE_UNAVAILABLE", "CRITICAL", { sourceId: "baostock", runId: suffix });
    const duplicate = await alerts.enqueue(key, "SOURCE_UNAVAILABLE", "CRITICAL", { sourceId: "baostock", runId: suffix });
    expect(first.created).toBe(true);
    expect(duplicate).toEqual({ alertId: first.alertId, created: false });
    expect(await alerts.pending()).toHaveLength(1);
    await alerts.markFailed(first.alertId, "notification endpoint unavailable");
    expect((await alerts.pending()).find((item) => item.alertId === first.alertId)).toBeUndefined();
    await pool.query("UPDATE market_data_alert_outbox SET next_attempt_at=now() WHERE alert_id=$1", [first.alertId]);
    expect((await alerts.pending()).find((item) => item.alertId === first.alertId)?.attempts).toBe(1);
    await alerts.markSent(first.alertId);
    expect((await alerts.pending()).find((item) => item.alertId === first.alertId)).toBeUndefined();
  });
});

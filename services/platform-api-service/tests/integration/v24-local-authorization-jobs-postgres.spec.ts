import { randomUUID } from "node:crypto";
import { afterAll,beforeAll,describe,expect,it } from "vitest";
import { Pool } from "pg";
import { PostgresStageRunRepository } from "../../src/adapters/postgres-stage-run-repository.js";
import { PostgresV24LocalAuthorizationJobs } from "../../src/adapters/postgres-v24-local-authorization-jobs.js";

const url=process.env.PLATFORM_API_TEST_DATABASE_URL;
if(!url||!/^sq-test-postgres-[a-f0-9]+$/u.test(process.env.STOCKQUANT_ISOLATED_PG_CONTAINER??"")) throw new Error("Disposable PostgreSQL wrapper is required");
const pool=new Pool({connectionString:url}); const jobs=new PostgresV24LocalAuthorizationJobs(pool);
beforeAll(async()=>{await new PostgresStageRunRepository(pool).migrate();await jobs.migrate();}); afterAll(async()=>pool.end());
describe("isolated C5 authorization job queue",()=>{
 it("deduplicates immutable per-session work and recovers an expired lease without concurrent claims",async()=>{
  const testRunId=randomUUID(),ownerId=`c5-job-${testRunId}`,accountId=randomUUID(),namespace=`v24-paper-v2-${testRunId}`;
  await pool.query("INSERT INTO acceptance_stage_runs(test_run_id,stage_id,scenario_id,scenario_version,owner_id,namespace,status,seed,assertions,evidence) VALUES($1,'V2.4','c5-local-engineering','1.0.0',$2,$3,'RUNNING',1,'[]',$4::jsonb)",[testRunId,ownerId,namespace,JSON.stringify({accountId})]);
  const validInput={ownerId,accountId,namespace,testRunId,sessionDate:"2024-01-04",mandateId:randomUUID(),mandateVersion:1,evaluatedAt:"2024-01-04T09:31:00+08:00",mandateContentHash:"a".repeat(64)};
  const queued=await Promise.all([jobs.enqueue(validInput),jobs.enqueue(validInput)]);
  expect(queued.filter(x=>x.created)).toHaveLength(1);expect(queued[0].job.jobId).toBe(queued[1].job.jobId);
  await expect(jobs.enqueue({...validInput,mandateVersion:2})).rejects.toThrow("INPUT_CONFLICT");
  const claims=await Promise.all([jobs.claim("worker-a",new Date("2024-01-04T01:30:00Z"),30000),jobs.claim("worker-b",new Date("2024-01-04T01:30:00Z"),30000)]);
  expect(claims.filter(Boolean)).toHaveLength(1);const first=claims.find(Boolean)!;
  expect(await jobs.claim("worker-c",new Date("2024-01-04T01:30:29Z"),30000)).toBeNull();
  const recovered=await jobs.claim("worker-c",new Date("2024-01-04T01:30:31Z"),30000);
  expect(recovered).toMatchObject({jobId:first.jobId,state:"CLAIMED",attempt:2,leaseOwner:"worker-c"});
  await expect(jobs.complete(first,"worker-a",new Date("2024-01-04T01:30:32Z"),{status:"AUTHORIZED"})).rejects.toThrow("LEASE_INVALID");
  await jobs.complete(recovered!,"worker-c",new Date("2024-01-04T01:30:32Z"),{status:"AUTHORIZED"});
  expect(await jobs.claim("worker-d",new Date("2024-01-04T01:31:00Z"),30000)).toBeNull();
  const persisted=await pool.query("SELECT state,result FROM v24_local_authorization_jobs WHERE job_id=$1",[first.jobId]);
  expect(persisted.rows[0]).toMatchObject({state:"COMPLETED",result:{status:"AUTHORIZED"}});
 });
});

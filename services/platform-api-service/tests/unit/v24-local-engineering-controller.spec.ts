import { describe,expect,it,vi } from "vitest";
import { V24LocalEngineeringController } from "../../src/bootstrap/app.module.js";
import { V24_DAILY_DIRECTION_SHA256 } from "../../src/application/v24-daily-target.js";

const runId="11111111-1111-4111-8111-111111111111",accountId="22222222-2222-4222-8222-222222222222",mandateId="33333333-3333-4333-8333-333333333333",ownerId="acceptance-owner-1",namespace=`v24-paper-v2-${runId}`;
const run={testRunId:runId,stageId:"V2.4",scenarioId:"c5-local-engineering",scenarioVersion:"1.0.0",ownerId,namespace,status:"WAITING",seed:20260907,assertions:[],evidence:{accountId}};
function setup(mandateStatus="ACTIVE") {
  const jobs={enqueue:vi.fn(async(input:unknown)=>({job:{jobId:"job",input,state:"QUEUED"},created:true})),find:vi.fn(async()=>null)};
  const container={stageRuns:{find:vi.fn(async()=>run)},v24LocalAuthorizationJobs:jobs,governanceUrl:"http://governance.invalid",portfolioToken:"x".repeat(40)};
  const controller=new V24LocalEngineeringController(container as never);
  const mandateBody={mandateId,mandateVersion:1,contentHash:"a".repeat(64),status:mandateStatus,ownerId,testRunId:runId,accountId,strategyVersion:V24_DAILY_DIRECTION_SHA256,market:"CN_A",currency:"CNY",securityScope:["600000.SH"],validFrom:"2024-01-04T09:30:00+08:00",expiresAt:"2024-01-04T15:20:00+08:00"};
  (controller as any).autoMandateClient=()=>({read:vi.fn(async()=>({status:200,body:mandateBody}))});
  return {controller,jobs};
}
const sessionCookie="sq_session=acceptance-owner-1";

describe("C5 local Run enqueue API",()=>{
  it("derives the frozen evaluation clock and exact run scope after reading the persisted active Mandate",async()=>{
    const {controller,jobs}=setup();
    const result=await controller.enqueueSession(sessionCookie,undefined,runId,"2024-01-04",{mandateId});
    expect(result).toMatchObject({testRunId:runId,sessionDate:"2024-01-04",created:true});
    expect(jobs.enqueue).toHaveBeenCalledWith({ownerId,accountId,namespace,testRunId:runId,sessionDate:"2024-01-04",mandateId,mandateVersion:1,evaluatedAt:"2024-01-04T09:31:50+08:00",mandateContentHash:"a".repeat(64)});
  });
  it("rejects an inactive Mandate without creating a durable job",async()=>{
    const {controller,jobs}=setup("PAUSED");
    await expect(controller.enqueueSession(sessionCookie,undefined,runId,"2024-01-04",{mandateId})).rejects.toThrow("exact ACTIVE session-scoped C5 Mandate");
    expect(jobs.enqueue).not.toHaveBeenCalled();
  });
});

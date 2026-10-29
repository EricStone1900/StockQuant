import { describe, expect, it, vi } from "vitest";
import { V24LocalAuthorizationWorker } from "../../src/application/v24-local-authorization-worker.js";

const now = new Date("2024-01-04T01:31:50.000Z");
const job = { jobId: "job", input: {ownerId:"owner",accountId:"22222222-2222-4222-8222-222222222222",namespace:"v24-paper-v2-11111111-1111-4111-8111-111111111111",testRunId:"11111111-1111-4111-8111-111111111111",mandateId:"33333333-3333-4333-8333-333333333333",mandateVersion:1,evaluatedAt:"2024-01-04T09:31:50+08:00"} as never, state: "CLAIMED" as const, attempt: 1, leaseOwner: "worker", leaseUntil: "2024-01-04T01:32:20.000Z", result: null };

describe("C5 local authorization worker", () => {
  it("completes claimed work by invoking the authorization coordinator once", async () => {
    const jobs = { claim: vi.fn(async () => job), complete: vi.fn(async () => {}), retry: vi.fn(async () => {}), enqueue: vi.fn() };
    const evaluate = vi.fn(async () => ({ status: "AUTHORIZED", target: {targetId:"t",clientOrderId:"o"}, intent: {}, authorization: { reservationId: "r",commandHash:"h",proposal:{},priceEvidence:{} } }));
    const execution={settleC5LocalPaperSession:vi.fn(async()=>new Response(JSON.stringify({status:"SETTLED"}),{status:200})),executeC5LocalPaperOrder:vi.fn(async()=>new Response(JSON.stringify({status:"FILLED"}),{status:201}))};
    const worker = new V24LocalAuthorizationWorker(jobs as never, { evaluate } as never, { now: () => now }, "worker",execution);
    await expect(worker.tick()).resolves.toBe("COMPLETED");
    expect(evaluate).toHaveBeenCalledWith(job.input);
    expect(execution.settleC5LocalPaperSession).toHaveBeenCalledWith(expect.objectContaining({ownerId:"owner",accountId:job.input.accountId,asOf:job.input.evaluatedAt}));
    expect(execution.executeC5LocalPaperOrder).toHaveBeenCalledWith(expect.objectContaining({ownerId:"owner",targetId:"t",clientOrderId:"o",reservationId:"r"}));
    expect(jobs.complete).toHaveBeenCalledWith(job, "worker", now, expect.objectContaining({ status: "AUTHORIZED" }));
    expect(jobs.retry).not.toHaveBeenCalled();
  });
  it("persists a retry when authorization fails so lease recovery can safely repeat the idempotent operation", async () => {
    const jobs = { claim: vi.fn(async () => job), complete: vi.fn(async () => {}), retry: vi.fn(async () => {}), enqueue: vi.fn() };
    const evaluate = vi.fn(async () => { throw new Error("GOVERNANCE_UNAVAILABLE"); });
    const execution={settleC5LocalPaperSession:vi.fn(async()=>new Response("{}",{status:200})),executeC5LocalPaperOrder:vi.fn()};
    const worker = new V24LocalAuthorizationWorker(jobs as never, { evaluate } as never, { now: () => now }, "worker",execution as never);
    await expect(worker.tick()).resolves.toBe("RETRY");
    expect(jobs.retry).toHaveBeenCalledWith(job, "worker", now, "C5_LOCAL_WORKER_COORDINATION:GOVERNANCE_UNAVAILABLE", 5000);
    expect(jobs.complete).not.toHaveBeenCalled();
  });
  it("retries the same durable authorization job when Trade Execution has not accepted it",async()=>{
    const jobs={claim:vi.fn(async()=>job),complete:vi.fn(async()=>{}),retry:vi.fn(async()=>{}),enqueue:vi.fn()};
    const evaluate=vi.fn(async()=>({status:"AUTHORIZED",target:{targetId:"t",clientOrderId:"o"},intent:{},authorization:{reservationId:"r"}}));
    const execution={settleC5LocalPaperSession:vi.fn(async()=>new Response(JSON.stringify({status:"SETTLED"}),{status:200})),executeC5LocalPaperOrder:vi.fn(async()=>new Response(JSON.stringify({error:"unavailable"}),{status:503}))};
    const worker=new V24LocalAuthorizationWorker(jobs as never,{evaluate} as never,{now:()=>now},"worker",execution);
    await expect(worker.tick()).resolves.toBe("RETRY");
    expect(jobs.complete).not.toHaveBeenCalled(); expect(jobs.retry).toHaveBeenCalledWith(job,"worker",now,'C5_LOCAL_WORKER_TRADE_EXECUTION:C5_LOCAL_TRADE_EXECUTION_HTTP_503:{"error":"unavailable"}',5000);
  });
  it("does not evaluate or execute before the same-session settlement barrier succeeds",async()=>{
    const jobs={claim:vi.fn(async()=>job),complete:vi.fn(async()=>{}),retry:vi.fn(async()=>{}),enqueue:vi.fn()};
    const evaluate=vi.fn(async()=>({status:"HOLD"}));
    const execution={settleC5LocalPaperSession:vi.fn(async()=>new Response(JSON.stringify({error:"scope"}),{status:403})),executeC5LocalPaperOrder:vi.fn()};
    const worker=new V24LocalAuthorizationWorker(jobs as never,{evaluate} as never,{now:()=>now},"worker",execution as never);
    await expect(worker.tick()).resolves.toBe("RETRY");
    expect(evaluate).not.toHaveBeenCalled(); expect(jobs.complete).not.toHaveBeenCalled(); expect(jobs.retry).toHaveBeenCalledWith(job,"worker",now,"C5_LOCAL_WORKER_SETTLEMENT:C5_LOCAL_SETTLEMENT_HTTP_403",5000);
  });
});

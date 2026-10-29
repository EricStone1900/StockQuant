import type { V24LocalAuthorizationJobRepository } from "../ports/v24-local-authorization-jobs.js";
import type { V24LocalPriceAuthorizationCoordinator } from "./v24-local-price-authorization-coordinator.js";

export interface C5LocalExecutionPort { settleC5LocalPaperSession(command:Record<string,unknown>):Promise<Response>; executeC5LocalPaperOrder(authorization:Record<string,unknown>):Promise<Response>; }

/** Durable, default-off Worker. Retries recover persisted target/intent facts before rechecking dynamic portfolio inputs. */
export class V24LocalAuthorizationWorker {
  private timer: ReturnType<typeof setInterval> | null = null;
  private ticking = false;
  constructor(private readonly jobs: V24LocalAuthorizationJobRepository, private readonly coordinator: Pick<V24LocalPriceAuthorizationCoordinator,"evaluate" | "recover">, private readonly clock: { now(): Date }, private readonly workerId: string, private readonly execution?: C5LocalExecutionPort) {}
  async tick(): Promise<"IDLE"|"BUSY"|"COMPLETED"|"RETRY"> {
    if (this.ticking) return "BUSY"; this.ticking = true;
    try {
      const job = await this.jobs.claim(this.workerId,this.clock.now(),30000); if (!job) return "IDLE";
      let phase = "SETTLEMENT";
      try {
        const input=job.input as Record<string,any>;
        if(!this.execution) throw new Error("C5_LOCAL_TRADE_EXECUTION_CLIENT_REQUIRED");
        const settlementResponse=await this.execution.settleC5LocalPaperSession({ownerId:input.ownerId,accountId:input.accountId,namespace:input.namespace,testRunId:input.testRunId,asOf:input.evaluatedAt});
        const settlement=await settlementResponse.json().catch(()=>undefined) as Record<string,unknown>|undefined;
        if(settlementResponse.status!==200) throw new Error(`C5_LOCAL_SETTLEMENT_HTTP_${settlementResponse.status}`);
        const ambiguousPriorExecution = job.attempt > 1 && /fetch failed|socket|ECONNRESET|terminated|connection reset/iu.test(job.lastError ?? "");
        phase = ambiguousPriorExecution ? "RECOVERY_AUTHORIZATION" : "COORDINATION";
        const result = await (ambiguousPriorExecution ? this.coordinator.recover(job.input) : this.coordinator.evaluate(job.input)) as Record<string,any>;
        result.settlement=settlement;
        if(result.status==="AUTHORIZED"){
          phase = "TRADE_EXECUTION";
          const authorization=result.authorization as Record<string,any>;
          const response=await this.execution.executeC5LocalPaperOrder({mandateId:input.mandateId,mandateVersion:input.mandateVersion,ownerId:input.ownerId,accountId:input.accountId,namespace:input.namespace,testRunId:input.testRunId,targetId:result.target?.targetId,clientOrderId:result.target?.clientOrderId,evaluatedAt:input.evaluatedAt,commandHash:authorization?.commandHash,reservationId:authorization?.reservationId,proposal:authorization?.proposal,priceEvidence:authorization?.priceEvidence});
          const execution=await response.json().catch(()=>undefined) as Record<string,unknown>|undefined;
          if(response.status!==200&&response.status!==201) throw new Error(`C5_LOCAL_TRADE_EXECUTION_HTTP_${response.status}:${JSON.stringify(execution ?? {})}`);
          result.execution=execution;
        }
        phase = "JOB_COMPLETION";
        await this.jobs.complete(job,this.workerId,this.clock.now(),result as unknown as Record<string,unknown>);
        return "COMPLETED";
      } catch (error) {
        await this.jobs.retry(job,this.workerId,this.clock.now(),`C5_LOCAL_WORKER_${phase}:${error instanceof Error?error.message:"C5_LOCAL_AUTHORIZATION_UNKNOWN_ERROR"}`,5000);
        return "RETRY";
      }
    } finally { this.ticking = false; }
  }
  start(intervalMs=1000): void {
    if (this.timer) return;
    if (!Number.isInteger(intervalMs)||intervalMs<100||intervalMs>60000) throw new Error("C5_LOCAL_AUTHORIZATION_WORKER_INTERVAL_INVALID");
    this.timer=setInterval(()=>{void this.tick().catch((error)=>console.error("C5 local authorization Worker failed",error));},intervalMs); this.timer.unref?.(); void this.tick().catch((error)=>console.error("C5 local authorization Worker failed",error));
  }
  stop(): void { if(this.timer) clearInterval(this.timer); this.timer=null; }
}

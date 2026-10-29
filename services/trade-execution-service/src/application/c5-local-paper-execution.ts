import type { SnapshotPaperExecutionCommand, HistoricalExecutionResult } from "../domain/historical-execution.js";
import type { GeneratedPortfolioAccountClient } from "../contracts/generated-portfolio-account-client.js";
import type { GeneratedTradeV13AutoMandateClient } from "../contracts/generated-v13-auto-mandate-client.js";
import type { FillOutboxDelivery } from "./fill-outbox-delivery.js";

type Proposal = { proposalId:string; proposalVersion:number; contentHash:string; ownerId:string; testRunId:string; accountId:string; strategyVersion:string; operation:"HOLD"|"REBALANCE"; market:"CN_A"; currency:"CNY"; legs:Array<{securityId:string;side:"BUY"|"SELL";quantity:number;limitPrice:string;estimatedFee:string}> };
type Authorization = { mandateId:string; mandateVersion:number; ownerId:string; accountId:string; namespace:string; testRunId:string; targetId:string; clientOrderId:string; evaluatedAt:string; commandHash:string; reservationId:string; proposal:Proposal; priceEvidence:{targetId:string;clientOrderId:string;snapshotId:string;side:"BUY"|"SELL";quantity:number;price:string;fee:string;budgetAmount:string;quoteAgeSeconds:number;deviationBps:number;observedAt:string} };
export type C5LocalExecutionCommand = { authorization:Authorization };
type Broker = {
  executeSnapshotPaper(command:SnapshotPaperExecutionCommand):Promise<{result:HistoricalExecutionResult;replayed:boolean}>;
  findByNamespaceClientOrderId(namespace:string,clientOrderId:string):Promise<{order_id:string;status:string;client_order_id?:string;external_fill_id?:string|null;fill_quantity?:number|string|null;fill_price?:string|null;fill_fee?:string|null;effective_at?:Date|string|null;outbox_status?:string|null;payload?:Record<string,any>|null}|null>;
  pendingFill(orderId:string):Promise<{event_id:string}|null>;
  outboxStatus(orderId:string):Promise<{status:string}|null>;
  independentAssetSnapshot(namespace:string,accountId:string):Promise<{owner_id:string;test_run_id:string;namespace:string}|null>;
  settlePaperReceivables(namespace:string,accountId:string,asOf:string):Promise<{settledFillIds:string[]}>;
};

export class C5LocalPaperExecutionError extends Error {
  constructor(readonly statusCode:number,message:string,readonly detail?:unknown){super(message);this.name="C5LocalPaperExecutionError";}
}

const sameMoney = (left: unknown, right: unknown) => {
  const parse = (value: unknown) => typeof value === "string" || typeof value === "number" ? Number(value) : Number.NaN;
  const a=parse(left),b=parse(right); return Number.isFinite(a)&&Number.isFinite(b)&&Math.round(a*10000)===Math.round(b*10000);
};

/** Executes only a same-scope Governance reservation using the persisted Fixture snapshot and FakeBroker. */
export class C5LocalPaperExecutionService {
  constructor(private readonly broker:Broker,private readonly portfolio:GeneratedPortfolioAccountClient,private readonly mandates:GeneratedTradeV13AutoMandateClient,private readonly outbox:FillOutboxDelivery){}

  async settleSession(input:{ownerId:string;accountId:string;namespace:string;testRunId:string;asOf:string}){
    if(!input.ownerId||!input.accountId||input.namespace!==`v24-paper-v2-${input.testRunId}`||!Number.isFinite(Date.parse(input.asOf))) throw new C5LocalPaperExecutionError(422,"C5_LOCAL_SETTLEMENT_SCOPE_INVALID");
    const assets=await this.broker.independentAssetSnapshot(input.namespace,input.accountId);
    if(!assets)return {status:"NO_PRIOR_FAKEBROKER_ASSETS",settledFillIds:[]};
    if(assets.owner_id!==input.ownerId||assets.test_run_id!==input.testRunId||assets.namespace!==input.namespace) throw new C5LocalPaperExecutionError(403,"C5_LOCAL_SETTLEMENT_ACCOUNT_SCOPE_MISMATCH");
    const broker=await this.broker.settlePaperReceivables(input.namespace,input.accountId,input.asOf);
    const portfolio=await this.portfolio.settleAccountReceivables(input.accountId,{asOf:input.asOf});
    return {status:"SETTLED",settledFillIds:broker.settledFillIds,portfolioSettledFillIds:portfolio.settledFillIds};
  }

  async execute(command:C5LocalExecutionCommand){
    const auth=command?.authorization;
    if(!auth||!auth.ownerId||!auth.accountId||!auth.testRunId||auth.namespace!==`v24-paper-v2-${auth.testRunId}`||!auth.targetId||!auth.clientOrderId||!auth.mandateId||!Number.isSafeInteger(auth.mandateVersion)||!auth.reservationId||!Number.isFinite(Date.parse(auth.evaluatedAt))||!/^\d{4}-\d{2}-\d{2}T/u.test(auth.evaluatedAt)||! /^[a-f0-9]{64}$/u.test(auth.commandHash)) throw new C5LocalPaperExecutionError(422,"C5_LOCAL_EXECUTION_SCOPE_INVALID");
    const proposal=auth.proposal,evidence=auth.priceEvidence;
    if(!proposal||proposal.operation!=="REBALANCE"||proposal.ownerId!==auth.ownerId||proposal.testRunId!==auth.testRunId||proposal.accountId!==auth.accountId||proposal.market!=="CN_A"||proposal.currency!=="CNY"||proposal.strategyVersion!=="2adb616611aaa26afb0d4206b2f4df0cd8f7e86c66a5b971d5ab55c4c75646c8"||proposal.legs?.length!==1) throw new C5LocalPaperExecutionError(422,"C5_LOCAL_PROPOSAL_SCOPE_INVALID");
    const leg=proposal.legs[0];
    if(!evidence||evidence.targetId!==auth.targetId||evidence.clientOrderId!==auth.clientOrderId||evidence.side!==leg.side||evidence.quantity!==leg.quantity||leg.securityId!=="600000.SH"||leg.quantity!==100||leg.limitPrice!==evidence.price||leg.estimatedFee!==evidence.fee||evidence.fee!=="5.00"||!evidence.snapshotId||!Number.isSafeInteger(evidence.quoteAgeSeconds)||evidence.quoteAgeSeconds<0||!Number.isSafeInteger(evidence.deviationBps)||evidence.deviationBps<0) throw new C5LocalPaperExecutionError(422,"C5_LOCAL_PRICE_EVIDENCE_MISMATCH");

    const verified=await this.mandates.verifyC5LocalReservation({reservationId:auth.reservationId,mandateId:auth.mandateId,mandateVersion:auth.mandateVersion,ownerId:auth.ownerId,accountId:auth.accountId,namespace:auth.namespace,testRunId:auth.testRunId,clientOrderId:auth.clientOrderId,commandHash:auth.commandHash,proposalId:proposal.proposalId,proposalVersion:proposal.proposalVersion,proposalHash:proposal.contentHash,amount:evidence.budgetAmount});
    const verifiedBody=verified.body as {status?:string;reservationId?:string;amount?:string}|undefined;
    if(verified.status!==200||verifiedBody?.status!=="VERIFIED"||verifiedBody.reservationId!==auth.reservationId||verifiedBody.amount!==evidence.budgetAmount) throw new C5LocalPaperExecutionError(409,"C5_LOCAL_GOVERNANCE_RESERVATION_MISMATCH",verified.body);

    // Resolve an ambiguous prior attempt before touching Portfolio reservations again.
    // A committed Fill may already have captured the reservation even when the HTTP
    // response was lost; retrying reserve first would incorrectly fail with 409.
    const prior=await this.broker.findByNamespaceClientOrderId(auth.namespace,auth.clientOrderId);
    if(prior){
      const savedPayload=prior.payload as Record<string,any>|null|undefined;
      const savedReservation=savedPayload?.reservation as Record<string,any>|undefined;
      const savedSide=savedPayload?.side;
      if(prior.client_order_id!==auth.clientOrderId||savedPayload?.accountId!==auth.accountId||savedPayload?.testRunId!==auth.testRunId||savedPayload?.ownerId!==auth.ownerId||savedPayload?.namespace!==auth.namespace||savedPayload?.security!==leg.securityId||savedPayload?.snapshotId!==evidence.snapshotId||savedPayload?.price!==evidence.price||savedPayload?.fee!==evidence.fee||Number(savedPayload?.quantity)!==leg.quantity||savedSide!==leg.side||savedPayload?.mandateId!==auth.mandateId||String(savedPayload?.mandateVersion)!==String(auth.mandateVersion)||savedPayload?.strategyVersion!==proposal.strategyVersion||typeof savedReservation?.reservationId!=="string"||!savedReservation.reservationId||savedReservation.clientOrderId!==auth.clientOrderId||savedReservation.ownerId!==auth.ownerId||savedReservation.testRunId!==auth.testRunId) throw new C5LocalPaperExecutionError(409,"C5_LOCAL_EXISTING_ORDER_FACTS_MISMATCH",prior);
      if(prior.status!=="FILLED"||!prior.external_fill_id||Number(prior.fill_quantity)!==leg.quantity||!sameMoney(prior.fill_price,evidence.price)||!sameMoney(prior.fill_fee,evidence.fee)) throw new C5LocalPaperExecutionError(503,"C5_LOCAL_ORDER_OUTCOME_AMBIGUOUS_RETRY_SAME_ID",prior);
      const account=await this.portfolio.getAccountSnapshot(auth.accountId,auth.ownerId);
      const persistedReservation=account.reservations?.find((item:any)=>item.reservationId===savedReservation.reservationId);
      if(account.testRunId!==auth.testRunId||account.namespace!==auth.namespace||persistedReservation?.clientOrderId!==auth.clientOrderId||persistedReservation.status!=="CAPTURED") throw new C5LocalPaperExecutionError(503,"C5_LOCAL_ORIGINAL_PORTFOLIO_RESERVATION_NOT_CONFIRMED",{accountScope:{testRunId:account.testRunId,namespace:account.namespace},persistedReservation});
      const pendingPrior=await this.broker.pendingFill(prior.order_id);
      if(pendingPrior) await this.outbox.deliver(pendingPrior.event_id);
      const priorOutbox=await this.broker.outboxStatus(prior.order_id);
      if(priorOutbox?.status!=="DELIVERED") throw new C5LocalPaperExecutionError(503,"C5_LOCAL_FILL_OUTBOX_DELIVERY_PENDING",{orderId:prior.order_id,status:priorOutbox?.status??"MISSING"});
      const consumed=await this.mandates.settleReservation(auth.reservationId,{outcome:"CONSUMED",now:auth.evaluatedAt});
      if(consumed.status!==200) throw new C5LocalPaperExecutionError(503,"C5_LOCAL_GOVERNANCE_CONSUMPTION_PENDING",consumed.body);
      const existingResult:HistoricalExecutionResult={orderId:prior.order_id,status:"FILLED",brokerMode:"FAKE",fill:{externalFillId:prior.external_fill_id,quantity:Number(prior.fill_quantity),price:String(prior.fill_price),fee:String(prior.fill_fee),effectiveAt:prior.effective_at instanceof Date?prior.effective_at.toISOString():String(prior.effective_at)}};
      return {status:"FILLED",replayed:true,authorizationId:auth.reservationId,resourceReservationId:savedReservation.reservationId,order:existingResult,outbox:priorOutbox,mandateReservationStatus:"CONSUMED",fillLedgerStatus:"DELIVERED",recoveredOriginalOrder:true};
    }

    const sell=leg.side==="SELL";
    let accountReservation:{reservation:{reservationId:string}};
    try {
      accountReservation=await this.portfolio.reserveAccountResources(auth.accountId,{namespace:auth.namespace,testRunId:auth.testRunId,ownerId:auth.ownerId,idempotencyKey:`${auth.clientOrderId}-c5-local-resource`,clientOrderId:auth.clientOrderId,side:leg.side,currency:"CNY",cashAmount:sell?null:evidence.budgetAmount,security:sell?leg.securityId:null,quantity:sell?leg.quantity:null,...(sell?{asOf:auth.evaluatedAt}:{})});
    } catch(error) {
      const released=await this.mandates.settleReservation(auth.reservationId,{outcome:"RELEASED",now:auth.evaluatedAt}).catch(()=>undefined);
      throw new C5LocalPaperExecutionError(error instanceof Error&&"status" in error&&Number((error as {status:unknown}).status)===409?409:503,released?.status===200?"C5_LOCAL_PORTFOLIO_RESERVATION_FAILED_AND_GOVERNANCE_RELEASED":"C5_LOCAL_PORTFOLIO_RESERVATION_FAILED_GOVERNANCE_RELEASE_PENDING",error);
    }

    const execution:SnapshotPaperExecutionCommand={namespace:auth.namespace,accountId:auth.accountId,clientOrderId:auth.clientOrderId,security:leg.securityId,requestedQuantity:leg.quantity,initialAccountCash:"10000.0000",price:evidence.price,fee:evidence.fee,effectiveAt:evidence.observedAt,currency:"CNY",snapshotId:evidence.snapshotId,policyVersion:"c5-local-paper-v1",fixtureVersion:"2.0.0",quoteAgeSeconds:evidence.quoteAgeSeconds,deviationBps:evidence.deviationBps,testRunId:auth.testRunId,ownerId:auth.ownerId,mandateId:auth.mandateId,mandateVersion:String(auth.mandateVersion),strategyVersion:proposal.strategyVersion,side:leg.side,reservation:{reservationId:accountReservation.reservation.reservationId,ownerId:auth.ownerId,testRunId:auth.testRunId,clientOrderId:auth.clientOrderId}};
    let executed:{result:HistoricalExecutionResult;replayed:boolean};
    try { executed=await this.broker.executeSnapshotPaper(execution); }
    catch(error) {
      const existing=await this.broker.findByNamespaceClientOrderId(auth.namespace,auth.clientOrderId).catch(()=>null);
      if(!existing){
        await this.portfolio.resolveAccountReservation(auth.accountId,accountReservation.reservation.reservationId,{namespace:auth.namespace,testRunId:auth.testRunId,ownerId:auth.ownerId,outcome:"REJECTED",evidenceRef:`c5-local-execution-rejected:${auth.clientOrderId}`}).catch(()=>undefined);
        await this.mandates.settleReservation(auth.reservationId,{outcome:"RELEASED",now:auth.evaluatedAt}).catch(()=>undefined);
      }
      throw new C5LocalPaperExecutionError(existing?503:409,existing?"C5_LOCAL_ORDER_OUTCOME_AMBIGUOUS_RETRY_SAME_ID":"C5_LOCAL_FAKEBROKER_EXECUTION_REJECTED",error);
    }
    if(executed.result.status!=="FILLED"||!executed.result.fill) throw new C5LocalPaperExecutionError(409,"C5_LOCAL_FAKEBROKER_ORDER_NOT_FILLED",executed.result);
    const pending=await this.broker.pendingFill(executed.result.orderId);
    if(pending) await this.outbox.deliver(pending.event_id);
    const outboxStatus=await this.broker.outboxStatus(executed.result.orderId);
    if(outboxStatus?.status!=="DELIVERED") throw new C5LocalPaperExecutionError(503,"C5_LOCAL_FILL_OUTBOX_DELIVERY_PENDING",{orderId:executed.result.orderId,eventId:pending?.event_id??null,status:outboxStatus?.status??"MISSING"});
    const settled=await this.mandates.settleReservation(auth.reservationId,{outcome:"CONSUMED",now:auth.evaluatedAt});
    if(settled.status!==200) throw new C5LocalPaperExecutionError(503,"C5_LOCAL_GOVERNANCE_CONSUMPTION_PENDING",settled.body);
    return {status:"FILLED",replayed:executed.replayed,authorizationId:auth.reservationId,resourceReservationId:accountReservation.reservation.reservationId,order:executed.result,outbox:outboxStatus,mandateReservationStatus:"CONSUMED",fillLedgerStatus:"DELIVERED"};
  }
}

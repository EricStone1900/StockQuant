import {describe,expect,it,vi} from "vitest";
import {C5LocalPaperExecutionService,type C5LocalExecutionCommand} from "../../src/application/c5-local-paper-execution.js";

const auth={mandateId:"33333333-3333-4333-8333-333333333333",mandateVersion:1,ownerId:"owner",accountId:"22222222-2222-4222-8222-222222222222",namespace:"v24-paper-v2-11111111-1111-4111-8111-111111111111",testRunId:"11111111-1111-4111-8111-111111111111",targetId:"target",clientOrderId:"c5-order-20240104",evaluatedAt:"2024-01-04T09:31:50+08:00",commandHash:"a".repeat(64),reservationId:"44444444-4444-4444-8444-444444444444",proposal:{proposalId:"55555555-5555-4555-8555-555555555555",proposalVersion:1,contentHash:"b".repeat(64),ownerId:"owner",testRunId:"11111111-1111-4111-8111-111111111111",accountId:"22222222-2222-4222-8222-222222222222",strategyVersion:"2adb616611aaa26afb0d4206b2f4df0cd8f7e86c66a5b971d5ab55c4c75646c8",operation:"REBALANCE" as const,market:"CN_A" as const,currency:"CNY" as const,legs:[{securityId:"600000.SH",side:"BUY" as const,quantity:100,limitPrice:"10.25",estimatedFee:"5.00"}]},priceEvidence:{targetId:"target",clientOrderId:"c5-order-20240104",snapshotId:"snapshot",side:"BUY" as const,quantity:100,price:"10.25",fee:"5.00",budgetAmount:"1030.00",quoteAgeSeconds:15,deviationBps:0,observedAt:"2024-01-04T09:31:35+08:00"}};
const command={authorization:auth} as C5LocalExecutionCommand;
function harness(){
  const broker={executeSnapshotPaper:vi.fn(async()=>({result:{orderId:"order",status:"FILLED",brokerMode:"FAKE" as const,fill:{externalFillId:"fill",quantity:100,price:"10.25",fee:"5.00",effectiveAt:auth.priceEvidence.observedAt}},replayed:false})),findByNamespaceClientOrderId:vi.fn(async()=>null),pendingFill:vi.fn(async()=>({event_id:"event"})),outboxStatus:vi.fn(async()=>({status:"DELIVERED"})),independentAssetSnapshot:vi.fn(async()=>({owner_id:auth.ownerId,test_run_id:auth.testRunId,namespace:auth.namespace})),settlePaperReceivables:vi.fn(async()=>({settledFillIds:["fill"]}))};
  const portfolio={reserveAccountResources:vi.fn(async()=>({reservation:{reservationId:"resource"},replayed:false})),getAccountSnapshot:vi.fn(async()=>({testRunId:auth.testRunId,namespace:auth.namespace,reservations:[{reservationId:"resource",clientOrderId:auth.clientOrderId,status:"CAPTURED"}]})),resolveAccountReservation:vi.fn(async()=>({reservationId:"resource"})),settleAccountReceivables:vi.fn(async()=>({settledFillIds:["fill"]}))};
  const mandates={verifyC5LocalReservation:vi.fn(async()=>({status:200,body:{status:"VERIFIED",amount:"1030.00",reservationId:auth.reservationId}})),settleReservation:vi.fn(async()=>({status:200,body:{status:"CONSUMED"}}))};
  const outbox={deliver:vi.fn(async()=>true)};
  return {service:new C5LocalPaperExecutionService(broker as never,portfolio as never,mandates as never,outbox as never),broker,portfolio,mandates,outbox};
}
describe("C5 local FakeBroker execution",()=>{
  it("verifies the same Governance reservation, reserves resources, persists the fill and posts the ledger",async()=>{
    const h=harness(); const result=await h.service.execute(command);
    expect(result).toMatchObject({status:"FILLED",authorizationId:auth.reservationId,resourceReservationId:"resource",mandateReservationStatus:"CONSUMED",fillLedgerStatus:"DELIVERED"});
    expect(h.portfolio.reserveAccountResources).toHaveBeenCalledWith(auth.accountId,expect.objectContaining({side:"BUY",cashAmount:"1030.00",clientOrderId:auth.clientOrderId}));
    expect(h.broker.executeSnapshotPaper).toHaveBeenCalledWith(expect.objectContaining({price:"10.25",effectiveAt:auth.priceEvidence.observedAt,snapshotId:"snapshot",side:"BUY"}));
    expect(h.outbox.deliver).toHaveBeenCalledWith("event");
    expect(h.mandates.settleReservation).toHaveBeenCalledWith(auth.reservationId,{outcome:"CONSUMED",now:auth.evaluatedAt});
  });
  it("fails closed when the persisted Governance reservation differs",async()=>{
    const h=harness(); h.mandates.verifyC5LocalReservation.mockResolvedValue({status:200,body:{status:"VERIFIED",amount:"1030.00",reservationId:"wrong"}} as never);
    await expect(h.service.execute(command)).rejects.toThrow("C5_LOCAL_GOVERNANCE_RESERVATION_MISMATCH");
    expect(h.portfolio.reserveAccountResources).not.toHaveBeenCalled(); expect(h.broker.executeSnapshotPaper).not.toHaveBeenCalled();
  });
  it("queries and confirms the original committed order before replaying a lost response",async()=>{
    const h=harness();
    h.broker.findByNamespaceClientOrderId.mockResolvedValue({order_id:"original-order",status:"FILLED",client_order_id:auth.clientOrderId,external_fill_id:"original-fill",fill_quantity:100,fill_price:"10.25",fill_fee:"5.00",effective_at:new Date(auth.priceEvidence.observedAt),payload:{accountId:auth.accountId,namespace:auth.namespace,testRunId:auth.testRunId,ownerId:auth.ownerId,security:"600000.SH",quantity:100,price:"10.25",fee:"5.00",side:"BUY",snapshotId:"snapshot",mandateId:auth.mandateId,mandateVersion:"1",strategyVersion:auth.proposal.strategyVersion,reservation:{reservationId:"resource",ownerId:auth.ownerId,testRunId:auth.testRunId,clientOrderId:auth.clientOrderId}}} as never);
    const result=await h.service.execute(command);
    expect(result).toMatchObject({status:"FILLED",replayed:true,recoveredOriginalOrder:true,resourceReservationId:"resource",order:{orderId:"original-order",fill:{externalFillId:"original-fill"}}});
    expect(h.portfolio.getAccountSnapshot).toHaveBeenCalledWith(auth.accountId,auth.ownerId);
    expect(h.portfolio.reserveAccountResources).not.toHaveBeenCalled();
    expect(h.broker.executeSnapshotPaper).not.toHaveBeenCalled();
    expect(h.outbox.deliver).toHaveBeenCalledWith("event");
  });
  it("reserves sellable quantity and carries SELL through the same durable execution path",async()=>{
    const h=harness(); const sellCommand={authorization:{...auth,proposal:{...auth.proposal,legs:[{...auth.proposal.legs[0],side:"SELL" as const}]},priceEvidence:{...auth.priceEvidence,side:"SELL" as const}}} as C5LocalExecutionCommand;
    await h.service.execute(sellCommand);
    expect(h.portfolio.reserveAccountResources).toHaveBeenCalledWith(auth.accountId,expect.objectContaining({side:"SELL",cashAmount:null,security:"600000.SH",quantity:100,asOf:auth.evaluatedAt}));
  });
  it("settles both FakeBroker and Portfolio receivables only after verifying exact run ownership",async()=>{
    const h=harness();
    const result=await h.service.settleSession({ownerId:auth.ownerId,accountId:auth.accountId,namespace:auth.namespace,testRunId:auth.testRunId,asOf:auth.evaluatedAt});
    expect(result).toMatchObject({status:"SETTLED",settledFillIds:["fill"],portfolioSettledFillIds:["fill"]});
    expect(h.broker.settlePaperReceivables).toHaveBeenCalledWith(auth.namespace,auth.accountId,auth.evaluatedAt);
    expect(h.portfolio.settleAccountReceivables).toHaveBeenCalledWith(auth.accountId,{asOf:auth.evaluatedAt});
  });
  it("fails closed on foreign FakeBroker assets before any settlement write",async()=>{
    const h=harness(); h.broker.independentAssetSnapshot.mockResolvedValue({owner_id:"foreign",test_run_id:auth.testRunId,namespace:auth.namespace} as never);
    await expect(h.service.settleSession({ownerId:auth.ownerId,accountId:auth.accountId,namespace:auth.namespace,testRunId:auth.testRunId,asOf:auth.evaluatedAt})).rejects.toThrow("C5_LOCAL_SETTLEMENT_ACCOUNT_SCOPE_MISMATCH");
    expect(h.broker.settlePaperReceivables).not.toHaveBeenCalled(); expect(h.portfolio.settleAccountReceivables).not.toHaveBeenCalled();
  });
});

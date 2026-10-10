import { checkpointForBars, checkpointForExecution } from "../domain/checkpoint.js";
import type { ReplayStatus } from "../domain/lifecycle.js";
import { assertCausalBarrier, eventsForExecution } from "../domain/events.js";
import type { HistoricalReplayCommand, HistoricalReplayMultiCommand } from "../contracts/generated-types.js";
import type { ReplayPortfolioClient, ReplayTradeExecutionClient, ReplayGovernanceAndResearchClient } from "../ports/replay-downstream-clients.js";
import type { ReplayRunRepository } from "../ports/replay-run-repository.js";
import { createHash } from "node:crypto";

export class ReplayConflict extends Error { constructor(message: string) { super(message); this.name = "ReplayConflict"; } }
export class ReplayCancelled extends Error { constructor() { super("replay was cancelled"); } }
type Command = HistoricalReplayCommand;
type MultiCommand = HistoricalReplayMultiCommand;
export function requestHash(command: Command | MultiCommand): string {
  const payload = "bar" in command ? { testRunId: command.testRunId, namespace: command.namespace, ownerId: command.ownerId, scenarioId: command.scenarioId, seed: command.seed, bar: command.bar } : { testRunId: command.testRunId, namespace: command.namespace, ownerId: command.ownerId, scenarioId: command.scenarioId, seed: command.seed, bars: command.bars };
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

export function createReplayCoordinator(deps: { runs: ReplayRunRepository; portfolioClient: ReplayPortfolioClient; tradeExecutionClient: ReplayTradeExecutionClient; replayDependencies: ReplayGovernanceAndResearchClient }) {
  const { runs, portfolioClient, tradeExecutionClient, replayDependencies } = deps;
async function transition(testRunId: string, to: ReplayStatus): Promise<void> { await runs.setStatus(testRunId, to); }
async function throwIfCancelled(testRunId: string): Promise<void> {
  const current = await runs.find(testRunId);
  if (current?.status === "CANCELLED") throw new ReplayCancelled();
}
async function waitUntilRunnable(testRunId: string): Promise<void> {
  for (;;) {
    const current = await runs.find(testRunId);
    if (!current) throw new Error("replay run was not found");
    if (current.status === "CANCELLED") throw new ReplayCancelled();
    if (current.status !== "PAUSED") return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

async function start(command: Command) {
  const hash = requestHash(command);
  const found = await runs.find(command.testRunId);
  if (found !== null && found.requestHash && found.requestHash.trim() !== hash) throw new ReplayConflict("replay request hash conflicts with the persisted run");
  if (found !== null && found.status === "COMPLETED") return { ...found.result, replayedRun: true };
  if (found === null) await runs.insert({ testRunId: command.testRunId, namespace: command.namespace, ownerId: command.ownerId, scenarioId: command.scenarioId, requestHash: hash, checkpoint: checkpointForExecution(command.bar.timestamp, command.seed) });
  else await runs.markRunning(command.testRunId, hash);
  try {
    const account = await portfolioClient.initializeAccount({fixtureAccountRef:"v2.3-replay-cash-1",ownerId:command.ownerId,market:"CN_A",environmentMode:"BACKTEST",brokerMode:"FAKE",initialCash:{amount:"10000.0000",currency:"CNY"},namespace:command.namespace,testRunId:command.testRunId,idempotencyKey:`initialize-${command.testRunId}`});
    const executionCommand = { namespace:command.namespace, accountId:account.snapshot.accountId, clientOrderId:"v2.3-order-1", security:"600000.SH", requestedQuantity:100, bar:command.bar };
    const execute = async () => { const authorization = await replayDependencies.authorizeHistoricalReplayExecution({ namespace:command.namespace, accountId:account.snapshot.accountId, environmentMode:"BACKTEST", brokerMode:"FAKE", command:executionCommand }); return tradeExecutionClient.executeHistoricalFakeOrder({...executionCommand, authorizationId:authorization.authorizationId}); };
    const execution = await execute();
    const recovery = command.scenarioId === "recovery" ? await execute() : null;
    const snapshot = await portfolioClient.getAccountSnapshot(account.snapshot.accountId, command.ownerId);
    const research = await replayDependencies.summarizeHistoricalReplayBars({ runId:command.testRunId, bars:[command.bar], executions:[execution] });
    const result={accountId:account.snapshot.accountId,execution,executionCommand,recovery,snapshot,research,replayedRun:false};
    await runs.complete(command.testRunId, result);
    return result;
  } catch(error) { await runs.fail(command.testRunId); throw error; }
}
async function startMulti(command: MultiCommand) {
  const hash = requestHash(command);
  const found = await runs.find(command.testRunId);
  if (found !== null && found.requestHash && found.requestHash.trim() !== hash) throw new ReplayConflict("replay request hash conflicts with the persisted run");
  if (found !== null && found.status === "COMPLETED") return { ...found.result, replayedRun: true };
  let checkpoint = checkpointForBars(command.bars, command.seed);
  if (found !== null && found.checkpoint) checkpoint = found.checkpoint;
  if (found !== null && checkpoint.cursor > 0 && !Array.isArray(found.result?.executions)) throw new ReplayConflict("persisted checkpoint has no cumulative execution evidence");
  if (checkpoint.totalBars !== command.bars.length || checkpoint.eventSequence !== checkpoint.cursor * 5 || checkpoint.ledgerVersion !== 1 + checkpoint.cursor) throw new ReplayConflict("persisted checkpoint barrier metadata is inconsistent");
  if (found !== null && found.result) {
    const prior = found.result as { executions?: unknown[]; eventLog?: unknown[][] };
    if ((prior.executions?.length ?? 0) !== checkpoint.cursor || (prior.eventLog?.length ?? 0) !== checkpoint.cursor) throw new ReplayConflict("persisted checkpoint does not match cumulative event evidence");
  }
  if (found === null) await runs.insert({ testRunId: command.testRunId, namespace: command.namespace, ownerId: command.ownerId, scenarioId: command.scenarioId, requestHash: hash, checkpoint: checkpoint });
  else await runs.markRunning(command.testRunId, hash);
  try {
    const account = await portfolioClient.initializeAccount({fixtureAccountRef:"v2.3-replay-cash-1",ownerId:command.ownerId,market:"CN_A",environmentMode:"BACKTEST",brokerMode:"FAKE",initialCash:{amount:"10000.0000",currency:"CNY"},namespace:command.namespace,testRunId:command.testRunId,idempotencyKey:`initialize-${command.testRunId}`});
    const executions: any[] = Array.isArray(found?.result?.executions) ? found.result.executions : [];
    const eventLog: string[][] = Array.isArray(found?.result?.eventLog) ? found.result.eventLog : [];
    for (let index = checkpoint.cursor; index < command.bars.length; index += 1) {
      await waitUntilRunnable(command.testRunId);
      const bar = command.bars[index];
      const executionCommand = { namespace:command.namespace, accountId:account.snapshot.accountId, clientOrderId:`v2.3-order-${index + 1}`, security:"600000.SH", requestedQuantity:100, bar };
      const authorization = await replayDependencies.authorizeHistoricalReplayExecution({namespace:command.namespace,accountId:account.snapshot.accountId,environmentMode:"BACKTEST",brokerMode:"FAKE",command:executionCommand});
      const execution = await tradeExecutionClient.executeHistoricalFakeOrder({...executionCommand,authorizationId:authorization.authorizationId});
      executions.push(execution);
      const events = eventsForExecution(execution.result.status);
      assertCausalBarrier(events);
      eventLog.push(events);
      const committedSnapshot = await portfolioClient.getAccountSnapshot(account.snapshot.accountId, command.ownerId);
      const expectedLedgerVersion = 1 + index + 1;
      if (committedSnapshot.ledgerVersion !== expectedLedgerVersion) throw new Error(`portfolio ledger barrier mismatch: expected ${expectedLedgerVersion}, got ${committedSnapshot.ledgerVersion}`);
      checkpoint = checkpointForBars(command.bars, command.seed, index + 1, executions.map((_, completed) => `v2.3-order-${completed + 1}`), (index + 1) * 5, committedSnapshot.ledgerVersion);
      await runs.saveCheckpoint(command.testRunId, checkpoint, { executions, eventLog, ledgerVersion: committedSnapshot.ledgerVersion });
    }
    const snapshot = await portfolioClient.getAccountSnapshot(account.snapshot.accountId, command.ownerId);
    const research = await replayDependencies.summarizeHistoricalReplayBars({ runId:command.testRunId, bars:command.bars, executions });
    if (snapshot.ledgerVersion !== checkpoint.ledgerVersion) throw new Error(`final ledger version mismatch: expected ${checkpoint.ledgerVersion}, got ${snapshot.ledgerVersion}`);
    const result = { accountId:account.snapshot.accountId, executions, eventLog, checkpoint, ledgerVersion:snapshot.ledgerVersion, snapshot, research, replayedRun:false };
    await runs.complete(command.testRunId, result);
    return result;
  } catch (error) {
    if (error instanceof ReplayCancelled) throw error;
    await runs.fail(command.testRunId); throw error;
  }
}

async function getRun(testRunId: string) {
  const run = await runs.find(testRunId);
  if (!run) return null;
  const { requestHash: _requestHash, ...publicRun } = run;
  return publicRun;
}
async function recoverUnknown(testRunId: string) {
  const found = await runs.find(testRunId);
  if (!found?.result) throw new Error("replay result is not available");
  if (!found.namespace) throw new Error("replay run namespace is not available");
  const current = found.result as any;
  const orderId = current.execution?.result?.orderId;
  if (!orderId) throw new Error("replay result has no original order");
  const order = await tradeExecutionClient.readHistoricalFakeOrderById(orderId, found.namespace);
  if (order.status !== "UNKNOWN") return { ...current, unknownRecovery: { observedStatus: order.status, action: "NO_RETRY_REQUIRED" } };
  const result = { ...current, unknownRecovery: { observedStatus: order.status, action: "MANUAL_REVIEW_REQUIRED", reason: "original order remains UNKNOWN; no resend was attempted" } };
  await runs.saveResult(testRunId, result);
  return result;
}
  return { start, startMulti, getRun, recoverUnknown, transition, withRunLock: runs.withRunLock.bind(runs) };
}

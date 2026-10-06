import type { V24ExecutionPolicy } from "../domain/v24-execution-policy.js";

/** Immutable storage contract for simulation-only policy snapshots. */
export interface SimulationExecutionPolicyRepository {
  migrate(): Promise<void>;
  savePreparationPolicy(policy: V24ExecutionPolicy): Promise<void>;
  load(policyId: string, policyVersion: string): Promise<V24ExecutionPolicy | null>;
}

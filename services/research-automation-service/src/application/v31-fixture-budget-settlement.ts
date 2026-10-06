export function fixtureBudgetSettlementEnabled(env: NodeJS.ProcessEnv): boolean {
  return env.NODE_ENV === "test" && env.STOCKQUANT_MODEL_GATEWAY_TEST_FIXTURE === "true";
}

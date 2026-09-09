export const V11_SCENARIO_IDS = ["normal", "rejection", "recovery"] as const;

export function isV11ScenarioId(value: string): value is (typeof V11_SCENARIO_IDS)[number] {
  return V11_SCENARIO_IDS.includes(value as (typeof V11_SCENARIO_IDS)[number]);
}

/** Configuration prerequisite only; authoritative Governance approval remains required. */
export function isV24PaperApprovalConfigured(env: Record<string, string | undefined>, now: Date): boolean {
  const references = ["MANDATE_REF", "STRATEGY_VERSION", "ACCOUNT_REF", "RISK_POLICY_VERSION", "COST_POLICY_VERSION"];
  const until = env.STOCKQUANT_V24_PAPER_EFFECTIVE_UNTIL ?? "";
  return env.STOCKQUANT_V24_CONTINUOUS_PAPER_APPROVED === "true"
    && references.every((key) => Boolean(env[`STOCKQUANT_V24_PAPER_${key}`]?.trim()))
    && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/u.test(until)
    && Number.isFinite(Date.parse(until)) && Date.parse(until) > now.getTime();
}

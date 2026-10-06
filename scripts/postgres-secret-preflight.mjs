export const postgresSecretKeys = [
  "STOCKQUANT_POSTGRES_SUPERUSER_PASSWORD",
  "STOCKQUANT_DATABASE_PASSWORD_PLATFORM_API",
  "STOCKQUANT_DATABASE_PASSWORD_PORTFOLIO_RISK",
  "STOCKQUANT_DATABASE_PASSWORD_TRADE_EXECUTION",
  "STOCKQUANT_DATABASE_PASSWORD_TRADE_EXECUTION_TEST",
  "STOCKQUANT_DATABASE_PASSWORD_HISTORICAL_REPLAY",
  "STOCKQUANT_DATABASE_PASSWORD_DECISION_GOVERNANCE",
  "STOCKQUANT_DATABASE_PASSWORD_QUANT_RESEARCH",
  "STOCKQUANT_DATABASE_PASSWORD_RESEARCH_AUTOMATION",
  "STOCKQUANT_DATABASE_PASSWORD_MARKET_DATA",
];

export function privateFileMode(mode) {
  return (mode & 0o077) === 0;
}

export function postgresSecretProblems(envText) {
  const values = new Map();
  for (const line of envText.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    const [, key, raw] = match;
    const wrapped = raw.trim().match(/^(["'])(.*)\1$/);
    values.set(key, wrapped ? wrapped[2] : raw.trim());
  }

  const issues = [];
  const seenValues = new Map();
  for (const key of postgresSecretKeys) {
    const value = values.get(key);
    if (!value || !/^[a-f0-9]{64}$/.test(value)) {
      issues.push(key);
      continue;
    }
    const previous = seenValues.get(value);
    if (previous) issues.push(`${key} (must differ from ${previous})`);
    else seenValues.set(value, key);
  }
  return issues;
}

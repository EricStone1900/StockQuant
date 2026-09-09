export function isV11TradingModeAllowed(environmentMode: string | undefined, brokerMode: string | undefined, liveTradingEnabled: string | undefined): boolean {
  return environmentMode === "PAPER" && brokerMode === "FAKE" && liveTradingEnabled === "false";
}

export function canonicalInitialCash(amount: string): string {
  if (!/^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,4})?$/u.test(amount)) throw new Error("amount must be a non-negative decimal string with up to four decimal places");
  const [whole, fraction = ""] = amount.split(".");
  return `${whole}.${fraction.padEnd(4, "0")}`;
}

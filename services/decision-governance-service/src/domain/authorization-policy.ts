export function isReplayAuthorizationAllowed(environmentMode: string, brokerMode: string): boolean {
  return environmentMode === "BACKTEST" && brokerMode === "FAKE";
}

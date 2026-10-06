export function assertNoLegacyNonterminalRows(count: number): void {
  if (!Number.isSafeInteger(count) || count < 0) throw new Error("nonterminal row count must be a non-negative safe integer");
  if (count > 0) throw new Error("legacy nonterminal runs require operator disposition; refusing migration");
}

export function expectedLegacyShadowInsertCount(input: { sourceRows: number; shadowRows: number }): number {
  const { sourceRows, shadowRows } = input;
  if (![sourceRows, shadowRows].every((value) => Number.isSafeInteger(value) && value >= 0)) {
    throw new Error("legacy migration preflight counts must be non-negative safe integers");
  }
  if (shadowRows > sourceRows) throw new Error("V1.1 shadow row count exceeds the legacy source; refusing migration");
  return sourceRows - shadowRows;
}

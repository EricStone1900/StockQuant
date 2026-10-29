import { timingSafeEqual } from "node:crypto";
/** Separate, narrowly scoped inbound identity; unset or shared credentials fail closed. */
export function authorizeV24LocalEvidenceReader(input: { serviceId?: string; authorization?: string; governanceToken: string; platformToken: string }): boolean {
  if (input.serviceId !== "decision-governance-service" || input.governanceToken.length < 32 || input.governanceToken === input.platformToken) return false;
  const bearer = /^Bearer ([A-Za-z0-9_-]{32,})$/u.exec(input.authorization ?? "");
  if (!bearer) return false;
  const supplied = Buffer.from(bearer[1]); const expected = Buffer.from(input.governanceToken);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
